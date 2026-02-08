package handlers

import (
	"art/database"
	"art/models"
	"art/utils"
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
		var recordDetail models.RecordDetail
		var activity models.Activity
		if err := db.First(&activity, req.ActivityID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				log.Error().Err(err).Msg("Activity not found")
				c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Activity with ID %d not found", req.ActivityID)})
				return
			}
			log.Error().Err(err).Msg("Error of database")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
			return
		}

		var slot models.ActivitySlot
		if err := db.First(&slot, req.SlotID).Error; err != nil {
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

		slot.Booked += int(req.NumberOfKids)

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		if err := tx.Save(&slot).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msg("Error saving activity slots")
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Failed to save slot: %v", slot)})
			return
		}

		totalPrice += activity.Price * req.NumberOfKids
		recordDetail = models.RecordDetail{
			ActivityID:   req.ActivityID,
			ActivityName: activity.Name,
			NumberOfKids: req.NumberOfKids,
			Kids:         req.Kids,
			Date:         slot.StartTime.UTC(),
		}

		var user models.User
		if err := tx.Where("phone_number = ?", phone_number).Find(&user).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msg("Error to find user by phone number")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
			return
		}

		phoneNumber, ok := phone_number.(string)
		if !ok {
			log.Error().Msg("Failed to bring phone_number to string")
		}

		var record models.Record // Создаем заказ

		record.UserID = user.ID
		record.PhoneNumber = phoneNumber
		record.ParentName = user.Name + " " + user.Surname
		record.TotalPrice = totalPrice
		record.Details = recordDetail
		record.SlotID = req.SlotID
		record.CreatedAt = time.Now().UTC()

		log.Info().Any("record", record).Msg("Creating record") // Логируем заказ перед сохранением

		for _, kid := range req.Kids {
			var existingRecord models.Record
			if err := tx.Where("slot_id = ? AND details->'kids'->0->>'name' = ? AND details->'kids'->0->>'age' = ? AND details->'kids'->0->>'gender' = ?",
				req.SlotID,
				kid.Name,
				strconv.Itoa(kid.Age),
				kid.Gender,
			).First(&existingRecord).Error; err == nil {
				tx.Rollback() // Дубль найден
				log.Warn().Msgf("Find duplicate of record for kid: %s", kid.Name)
				c.JSON(http.StatusConflict, gin.H{
					"error":    "Record for this kid on this slot already exist",
					"kid_name": kid.Name,
				})
				return
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				// Другая ошибка БД
				tx.Rollback()
				log.Error().Err(err).Msg("Ошибка проверки дубля записи")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сервера при проверке дубля"})
				return
			}
		}

		if err := tx.Create(&record).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msg("Database error")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error to create record: " + err.Error()})
			return
		}
		tx.Commit()

		// Очиcтка кэша
		if redisClient != nil {
			utils.InvalidateCache(c, "/records", "records:all:*", fmt.Sprintf("client:records:%s:*", phoneNumber))
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

		sizeStr := c.DefaultQuery("size", "9")
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

		phoneStr := phone_number.(string)
		cacheKey := fmt.Sprintf("client:records:%s:page:%d:size:%d", phoneStr, page, size)

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
		if err := db.
			Limit(size).
			Offset((page-1)*size).
			Where("phone_number = ?", phone_number).
			Find(&records).Error; err != nil {
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

		sizeStr := c.DefaultQuery("size", "9")
		size, err := strconv.Atoi(sizeStr)
		if err != nil || size < 1 || size > 100 {
			log.Warn().Str("size", sizeStr).Msg("Invalid size parameter")
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid size"})
			return
		}

		cacheKey := fmt.Sprintf("records:all:page:%d:size:%d", page, size)

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
			log.Error().Err(err).Msg("Failed to hit cache for all records")
		}

		dateFilter := c.Query("date")

		query := db.Model(&models.Record{})

		if dateFilter != "" {
			// Фильтр по полю Details->date (jsonb)
			// PostgreSQL позволяет обращаться к jsonb-полям через ->
			query = query.Where("details->>'date' LIKE ?", dateFilter+"%")
		}

		// Подсчёт общего количества заказов
		var totalCount int64
		if err := query.Count(&totalCount).Error; err != nil {
			log.Error().Err(err).Msg("Failed to count records")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count records"})
			return
		}

		// Выборка заказов с пагинацией
		var records []models.Record
		if err := query.
			Order("created_at DESC").
			Offset((page - 1) * size).
			Limit(size).
			Find(&records).Error; err != nil {
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

		var slot models.ActivitySlot

		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&slot, record.SlotID).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				tx.Rollback()
				log.Error().Err(err).Uint("slot_id", record.SlotID).Msg("Error finding slot")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "slot lookup failed"})
				return
			}
			log.Warn().
				Uint("slot_id", record.SlotID).
				Msg("slot missing, deleting record without restoring places")
		} else {
			if record.Details.NumberOfKids > uint(slot.Booked) {
				slot.Booked = 0
			} else {
				slot.Booked -= int(record.Details.NumberOfKids)
			}

			if err := tx.Save(&slot).Error; err != nil {
				tx.Rollback()
				log.Error().Err(err).Msg("Failed to restore slot places")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to restore places"})
				return
			}
		}

		var subType models.SubscriptionType
		if err := tx.Where("activity_id = ?", slot.ActivityID).First(&subType).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				tx.Rollback()
				log.Error().Err(err).Msg("Error finding subscription type")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find subscription type"})
				return
			}
			log.Warn().
				Uint("activity_id", slot.ActivityID).
				Msg("sub type missing, deleting record without restoring sub visits")
		}

		var subscription models.Subscription
		if err := tx.Joins("JOIN subscription_kids sk ON sk.subscription_id = subscriptions.id").
			Joins("JOIN sub_kids kids ON kids.id = sk.sub_kid_id").
			Where("kids.id = ?", record.SubKidID).
			Preload("SubKids").First(&subscription).First(&subscription).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				tx.Rollback()
				log.Error().Err(err).Msg("Error finding subscription")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find subscription"})
				return
			}
			log.Warn().
				Uint("subscription", subscription.ID).
				Msg("subscription missing, deleting record without restoring sub visits")
		} else {

			if subscription.VisitsUsed > 0 {
				subscription.VisitsUsed -= 1
			} else {
				log.Warn().Uint("subscription_id", subscription.ID).Msg("VisitsUsed already 0, skipping decrement")
			}

			if err := tx.Save(&subscription).Error; err != nil {
				tx.Rollback()
				log.Error().Err(err).Msg("Failed to restore subscription visits")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to restore subscription visits"})
				return
			}
		}

		if err := tx.Delete(&record, id).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Int("id", id).Msg("Failed to delete record")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete record"})
			return
		}

		if err := tx.Commit().Error; err != nil {
			log.Error().Err(err).Msg("Commit failed for delete record")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
			return
		}

		log.Info().Int("id", id).Str("phone", record.PhoneNumber).Msg("Record deleted successfully")

		if redisClient != nil {
			patterns := []string{
				fmt.Sprintf("client:records:%s:*", record.PhoneNumber),
				fmt.Sprintf("/activity/%d/slots*", record.Details.ActivityID),
				"/subscriptions*",
				"subscriptions:all:*",
				"/records",
				"records:all:*",
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
		}

		c.Status(http.StatusNoContent)
	}
}
