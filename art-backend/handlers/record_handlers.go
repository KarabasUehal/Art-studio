package handlers

import (
	"art/database"
	"art/models"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func MakeRecord() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.RecordRequest
		db := database.GetGormDB()

		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		phone_number, ok := c.Get("phone_number")
		if !ok {
			log.Error().Msg("Value of phone number does not exist")
		}

		log.Info().Any("phone_number", phone_number).Msg("Got phone number")

		if err := c.ShouldBindJSON(&req); err != nil {
			log.Error().Err(err).Msg("Error to bind json")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data: " + err.Error()})
			return
		}

		log.Info().Any("request", req).Msg("Got request for record")

		// Рассчитываем общую сумму
		var totalPrice uint
		recordItems := make(models.RecordDetails, 0, len(req.Items))
		for _, item := range req.Items {
			var activity models.Activity
			tx := db.Begin()
			if err := tx.First(&activity, item.ActivityID).Error; err != nil {
				tx.Rollback()
				if err == gorm.ErrRecordNotFound {
					log.Error().Err(err).Msg("Activity not found")
					c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Activity with ID %d not found", item.ActivityID)})
					return
				}
				log.Error().Err(err).Msg("Error of database")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
				return
			}
			tx.Commit()

			var slot models.ActivitySlot
			if err := db.First(&slot, item.SlotID).Error; err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Слот не найден"})
				return
			}
			if slot.Booked >= slot.Capacity {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Места закончились"})
				return
			}
			if slot.StartTime.IsZero() {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Дата занятия обязательна и должна быть в будущем"})
				return
			}
			if slot.StartTime.Before(time.Now()) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Дата занятия должна быть в будущем"})
				return
			}

			slot.Booked += int(item.NumberOfKids)
			tx2 := db.Begin()
			if err := tx2.Save(&slot).Error; err != nil {
				tx2.Rollback()
				log.Error().Err(err).Msg("Error saving activity slots")
				c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Failed to save slot: %v", slot)})
				return
			}
			tx2.Commit()

			totalPrice += activity.Price * item.NumberOfKids
			recordItems = append(recordItems, models.RecordDetail{
				ActivityID:   item.ActivityID,
				ActivityName: activity.Name,
				NumberOfKids: item.NumberOfKids,
				Kids:         item.Kids,
				Date:         slot.StartTime,
				SlotID:       item.SlotID,
			})
		}

		var user models.User
		if err := db.Where("phone_number = ?", phone_number).Find(&user).Error; err != nil {
			log.Error().Err(err).Msg("Error to find user by phone number")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
			return
		}

		phoneNumber, ok := phone_number.(string)
		if !ok {
			log.Error().Msg("Failed to bring phone_number to string")
		}
		// Создаем заказ
		record := models.Record{
			UserID:      user.ID,
			PhoneNumber: phoneNumber,
			ParentName:  user.Name,
			TotalPrice:  totalPrice,
			Details:     recordItems,
		}

		// Логируем заказ перед сохранением
		log.Info().Any("record", record).Msg("Creating record")

		tx := db.Begin()
		if err := tx.Create(&record).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msg("Database error")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error to create record: " + err.Error()})
			return
		}
		tx.Commit()

		// Очищаем кэш
		pattern := []string{"/records*", "/client/records*" + phoneNumber}
		for _, pattern := range pattern {
			cursor := uint64(0)
			for {
				keys, nextCursor, err := redisClient.Scan(c, cursor, pattern, 100).Result()
				if err != nil {
					log.Error().Err(err).Msg("Failed to scan records cache keys")
					break
				}
				if len(keys) > 0 {
					if err := redisClient.Del(c, keys...).Err(); err != nil {
						log.Error().Err(err).Msg("Failed to delete records cache keys")
					} else {
						log.Info().Str("pattern", pattern).Int("keys_deleted", len(keys)).Msg("Cache keys deleted")
					}
				}
				cursor = nextCursor
				if cursor == 0 {
					break
				}
			}
		}
		c.JSON(http.StatusCreated, gin.H{
			"record_id":    record.ID,
			"created_at":   record.CreatedAt.Format(time.RFC3339),
			"Details":      record.Details,
			"total_price":  record.TotalPrice,
			"phone_number": record.PhoneNumber,
			"parent_name":  record.ParentName,
		})
	}
}

func GetMyRecords() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.GetGormDB()

		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		pageStr := c.DefaultQuery("page", "1")
		page, err := strconv.Atoi(pageStr)
		if err != nil || page < 1 {
			log.Warn().Str("page", pageStr).Msg("Invalid page parameter")
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page"})
			return
		}

		sizeStr := c.DefaultQuery("size", "10")
		size, err := strconv.Atoi(sizeStr)
		if err != nil || size < 1 || size > 100 { // Добавьте лимит на размер, если нужно
			log.Warn().Str("size", sizeStr).Msg("Invalid size parameter")
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid size"})
			return
		}

		phone_number, ok := c.Get("phone_number")
		if !ok {
			log.Error().Msg("Value of phone number does not exist")
		}

		log.Info().Any("phone_number", phone_number).Msg("Got phone number")

		cacheKey := c.Request.URL.String() + phone_number.(string)
		cached, err := redisClient.Get(c, cacheKey).Result()
		if err == nil {
			var resp map[string]interface{}
			if jsonErr := json.Unmarshal([]byte(cached), &resp); jsonErr != nil {
				log.Error().Err(jsonErr).Msg("Failed to unmarshal cached response")
			} else {
				log.Info().Msg("Cache hit for my records")
				c.JSON(http.StatusOK, resp)
				return
			}
		} else if err != redis.Nil {
			log.Error().Err(err).Msg("Failed to hit cache")
		}

		var user models.User
		if err := db.Where("phone_number = ?", phone_number).Find(&user).Error; err != nil {
			log.Error().Err(err).Msg("Error to find user by phone number")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
			return
		}

		var totalCount int64
		if err := db.Model(&models.Record{}).Where("phone_number = ?", phone_number).Count(&totalCount).Error; err != nil {
			log.Error().Err(err).Msg("Failed to count recordsfor user")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count records"})
			return
		}

		// Выборка заказов с пагинацией
		var records []models.Record
		if err := db.Limit(size).Offset((page-1)*size).Where("phone_number = ?", phone_number).Find(&records).Error; err != nil {
			log.Error().Err(err).Msg("Failed to find order by phone number")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch records"})
			return
		}

		// Преобразование формата времени
		response := make([]models.RecordResponse, len(records))
		for i, rec := range records {
			response[i] = models.ToRecordResponse(rec)
		}

		// Вычисление общего количества страниц
		totalPages := (int(totalCount) + size - 1) / size

		// Формирование ответа
		resp := gin.H{
			"records":      response,
			"total_count":  totalCount,
			"total_pages":  totalPages,
			"current_page": page,
			"page_size":    size,
		}

		// Кэшируем весь ответ
		jsonResp, err := json.Marshal(resp)
		if err == nil {
			redisClient.Set(c, cacheKey, jsonResp, time.Hour)
		} else {
			log.Error().Err(err).Msg("Failed to serialize response for cache")
		}

		log.Info().
			Int("page", page).
			Int("size", size).
			Int64("total_count", totalCount).
			Msg("Fetched my recordslist")

		c.JSON(http.StatusOK, resp)
	}
}

func GetAllRecords() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.GetGormDB()
		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		pageStr := c.DefaultQuery("page", "1")
		page, err := strconv.Atoi(pageStr)
		if err != nil || page < 1 {
			log.Warn().Str("page", pageStr).Msg("Invalid page parameter")
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page"})
			return
		}

		sizeStr := c.DefaultQuery("size", "10")
		size, err := strconv.Atoi(sizeStr)
		if err != nil || size < 1 || size > 100 { // Добавьте лимит на размер, если нужно
			log.Warn().Str("size", sizeStr).Msg("Invalid size parameter")
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid size"})
			return
		}

		cacheKey := c.Request.URL.String()
		cached, err := redisClient.Get(c, cacheKey).Result()
		if err == nil {
			var resp map[string]interface{}
			if jsonErr := json.Unmarshal([]byte(cached), &resp); jsonErr != nil {
				log.Error().Err(jsonErr).Msg("Failed to unmarshal cached response")
			} else {
				log.Info().Msg("Cache hit for all records")
				c.JSON(http.StatusOK, resp)
				return
			}
		} else if err != redis.Nil {
			log.Error().Err(err).Msg("Failed to hit cache")
		}

		// Подсчёт общего количества заказов
		var totalCount int64
		if err := db.Model(&models.Record{}).Count(&totalCount).Error; err != nil {
			log.Error().Err(err).Msg("Failed to count records")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count records"})
			return
		}

		// Выборка заказов с пагинацией
		var records []models.Record
		if err := db.Limit(size).Offset((page - 1) * size).Find(&records).Error; err != nil {
			log.Error().Err(err).Msg("Failed to get records list")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find records"})
			return
		}

		// Преобразование формата времени
		response := make([]models.RecordResponse, len(records))
		for i, rec := range records {
			response[i] = models.ToRecordResponse(rec)
		}

		// Вычисление общего количества страниц
		totalPages := (int(totalCount) + size - 1) / size

		// Формирование ответа
		resp := gin.H{
			"records":      response,
			"total_count":  totalCount,
			"total_pages":  totalPages,
			"current_page": page,
			"page_size":    size,
		}

		// Кэшируем весь ответ
		jsonResp, err := json.Marshal(resp)
		if err == nil {
			redisClient.Set(c, cacheKey, jsonResp, time.Hour)
		} else {
			log.Error().Err(err).Msg("Failed to serialize response for cache")
		}

		// Логирование успешного запроса
		log.Info().
			Int("page", page).
			Int("size", size).
			Int64("total_count", totalCount).
			Msg("Fetched records list")

		c.JSON(http.StatusOK, resp)
	}
}

func GetRecordByID() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var order models.Record
		db := database.GetGormDB()

		id, err := strconv.Atoi(ctx.Param("id"))
		if err != nil {
			log.Error().Err(err).Msg("Failed to initialize id")
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of product"})
			return
		}

		if err := db.First(&order, id).Error; err != nil {
			log.Error().Err(err).Msg("Failed to get order by ID")
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"error": "Error to find orders",
			})
			return
		}

		ctx.JSON(http.StatusOK, order)
	}
}

func DeleteRecordByID() gin.HandlerFunc {
	return func(c *gin.Context) {
		var record models.Record
		db := database.GetGormDB()
		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			log.Error().Err(err).Msg("Failed to parse ID")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		log.Info().Int("id", id).Msg("Attempting to delete record")

		if err := db.First(&record, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				log.Warn().Int("id", id).Msg("Record not found")
				c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
				return
			}
			log.Error().Err(err).Msg("Failed to get record by ID")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error to find record"})
			return
		}

		tx := db.Begin()

		for _, detail := range record.Details {
			var slot models.ActivitySlot

			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&slot, detail.SlotID).Error; err != nil {
				tx.Rollback()
				log.Error().Err(err).Uint("slot_id", detail.SlotID).Msg("Slot not found on record delete")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "slot not found"})
				return
			}

			if detail.NumberOfKids > uint(slot.Booked) {
				slot.Booked = 0
			} else {
				slot.Booked -= int(detail.NumberOfKids)
			}

			if err := tx.Save(&slot).Error; err != nil {
				tx.Rollback()
				log.Error().Err(err).Msg("Failed to restore slot places")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to restore places"})
				return
			}

			if err := tx.Delete(&record, id).Error; err != nil {
				tx.Rollback()
				log.Error().Err(err).Int("id", id).Msg("Failed to delete record")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete record"})
				return
			}
		}

		if err := tx.Commit().Error; err != nil {
			log.Error().Err(err).Msg("Commit failed for delete")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
			return
		}

		log.Info().Int("id", id).Str("phone", record.PhoneNumber).Msg("Record deleted successfully")

		activityIDs := map[uint]bool{}
		for _, d := range record.Details {
			activityIDs[d.ActivityID] = true
		}

		patterns := []string{"/records*", "/client/records*" + record.PhoneNumber}
		for actID := range activityIDs {
			patterns = append(patterns, fmt.Sprintf("/activity/%d/slots*", actID))
		}

		for _, pattern := range patterns {
			cursor := uint64(0)
			for {
				keys, nextCursor, err := redisClient.Scan(c, cursor, pattern, 100).Result()
				if err != nil {
					log.Error().Err(err).Msg("Failed to scan records cache keys")
					break
				}
				if len(keys) > 0 {
					if err := redisClient.Del(c, keys...).Err(); err != nil {
						log.Error().Err(err).Msg("Failed to delete records cache keys")
					} else {
						log.Info().Str("pattern", pattern).Int("keys_deleted", len(keys)).Msg("Cache keys deleted")
					}
				}
				cursor = nextCursor
				if cursor == 0 {
					break
				}
			}
		}

		c.Status(http.StatusNoContent)
	}
}
