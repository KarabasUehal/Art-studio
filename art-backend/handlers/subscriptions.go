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
)

func GetAllSubscriptions() gin.HandlerFunc {
	return func(c *gin.Context) {
		var subs []models.Subscription
		db := database.GetGormDB()

		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		pageStr := c.DefaultQuery("page", "1")
		page, err := strconv.Atoi(pageStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page"})
			return
		}

		sizeStr := c.DefaultQuery("size", "100")
		size, err := strconv.Atoi(sizeStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid size"})
			return
		}

		if page < 1 {
			page = 1
		}
		if size < 1 || size > 100 {
			size = 9
		}

		offset := (page - 1) * size

		cacheKey := fmt.Sprintf("subscriptions:all:page=%d:size=%d", page, size)

		var resp gin.H

		if redisClient != nil {
			if cached, err := redisClient.Get(c, cacheKey).Result(); err == nil {
				if json.Unmarshal([]byte(cached), &resp) == nil {
					c.JSON(http.StatusOK, resp)
					return
				}
			}
		}

		query := db.Model(&models.Subscription{})

		var totalCount int64
		if err := query.Count(&totalCount).Error; err != nil {
			log.Error().Err(err).Msg("Failed to count subscriptions")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count subscriptions"})
			return
		}

		if err := query.Order("id").
			Limit(size).
			Offset(offset).
			Preload("User").
			Preload("SubKids").
			Preload("SubscriptionType").
			Preload("SubscriptionType.Activity").
			Find(&subs).Error; err != nil {

			log.Error().Err(err).Msg("Error finding subscriptions")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load subscriptions"})
			return
		}

		totalPages := (int(totalCount) + size - 1) / size

		resp = gin.H{
			"subscriptions": subs,
			"total_count":   totalCount,
			"total_pages":   totalPages,
			"current_page":  page,
			"page_size":     size,
		}

		if redisClient != nil {
			if respBytes, err := json.Marshal(resp); err == nil {
				redisClient.Set(c, cacheKey, respBytes, 30*time.Minute)
			}
		}

		c.JSON(http.StatusOK, resp)
	}
}

func GetSubscriptionByID() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.GetGormDB()
		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		var sub models.Subscription
		cacheKey := c.Request.URL.String()

		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			log.Error().Err(err).Msg("Failed to get id")
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of subscription"})
			return
		}

		if redisClient != nil {
			cached, err := redisClient.Get(c, cacheKey).Result()
			if err == nil {
				if json.Unmarshal([]byte(cached), &sub) == nil {
					log.Info().Str("cacheKey", cacheKey).Msg("Cache hit for subscription id")
					c.JSON(http.StatusOK, sub)
					return
				}
				log.Error().Err(err).Msg("Failed to unmarshal cached subscription")
			} else if err != redis.Nil {
				log.Error().Err(err).Msg("Redis error for subscription id")
			}
		} else {
			log.Info().Str("cacheKey", cacheKey).Msg("Redis client is nil, skipping cache for subscription id")
		}

		if err := db.First(&sub, id).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding subscription by id: %d", id)
			c.JSON(http.StatusBadRequest, gin.H{
				"Error": "Failed to get id",
			})
			return
		}

		c.JSON(http.StatusOK, &sub)
	}
}

func AddSubscription() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.GetGormDB()
		var req models.Subscription

		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			log.Error().Err(err).Msg("Failed to bind json")
			c.JSON(http.StatusBadRequest, gin.H{
				"Invalid subscription input": err.Error()})
			return
		}

		var sub_type models.SubscriptionType
		if err := db.First(&sub_type, req.SubscriptionTypeID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Тип абонемента не знайдено"})
			} else {
				log.Error().Err(err).Msg("Database error while finding subscription type")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Помилка сервера"})
			}
			return
		}

		startDate := req.StartDate.UTC()
		endDate := startDate.AddDate(0, 0, sub_type.DurationDays)

		if endDate.Before(req.StartDate) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end date, must be after start date"})
			return
		}

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		var createdKids []models.SubKid
		for _, kid := range req.SubKids {
			if kid.Name == "" {
				tx.Rollback()
				log.Error().Err(err).Msg("Invalid kid name input")
				c.JSON(400, gin.H{"error": "У дитини повинно бути ім'я"})
				return
			}

			if err := db.Create(&kid).Error; err != nil {
				log.Error().Err(err).Msg("Failed to create sub kid")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Не вдалося створити запис дитини"})
				return
			}
			createdKids = append(createdKids, kid)
		}

		sub := models.Subscription{
			UserID:             req.UserID,
			User:               req.User,
			SubscriptionTypeID: req.SubscriptionTypeID,
			SubscriptionType:   req.SubscriptionType,
			StartDate:          startDate,
			EndDate:            endDate,
			VisitsTotal:        sub_type.VisitsCount,
			VisitsUsed:         0,
			PricePaid:          req.PricePaid,
		}

		if res := tx.Create(&sub); res.Error != nil {
			tx.Rollback()
			log.Error().Err(res.Error).Msg("Error to create subscription")
			c.JSON(http.StatusBadRequest, gin.H{
				"Failed to create subscription": res.Error})
			return
		}

		if err := tx.Model(&sub).Association("SubKids").Append(createdKids); err != nil {
			tx.Rollback()
			log.Error().Err(err).Msg("Error to create subscription")
			c.JSON(http.StatusBadRequest, gin.H{
				"Failed to create subscription": err})
			return
		}

		tx.Commit()

		db.Preload("SubKids").First(&sub, sub.ID)

		if redisClient != nil {
			utils.InvalidateCache(c, "/subscriptions*", "subscriptions:all:*")
		}

		c.JSON(http.StatusCreated, sub)
	}
}

func UpdateSubscription() gin.HandlerFunc {
	return func(c *gin.Context) {
		var sub models.Subscription
		var updated_sub models.Subscription
		db := database.GetGormDB()

		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			log.Error().Err(err).Msg("Failed to get id")
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of subscription"})
			return
		}

		if err := c.ShouldBindJSON(&updated_sub); err != nil {
			log.Error().Err(err).Msg("Failed to bind json")
			c.JSON(http.StatusBadRequest, gin.H{
				"Invalid of input data": err.Error()})
			return
		}

		if err := db.First(&sub, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
			} else {
				log.Error().Err(err).Msg("Error finding subscription")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find subscription"})
			}
			return
		}

		sub.UserID = updated_sub.User.ID
		sub.User = updated_sub.User
		sub.SubscriptionTypeID = updated_sub.SubscriptionType.ID
		sub.SubscriptionType = updated_sub.SubscriptionType
		sub.StartDate = updated_sub.StartDate
		sub.EndDate = updated_sub.EndDate
		sub.VisitsTotal = updated_sub.VisitsTotal
		sub.VisitsUsed = updated_sub.VisitsUsed
		sub.PricePaid = updated_sub.PricePaid

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		if err := tx.Save(sub).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msg("Failed to save subscription")
			c.JSON(http.StatusInternalServerError, gin.H{
				"Error to save subscription": err,
			})
			return
		}
		tx.Commit()

		if redisClient != nil {
			utils.InvalidateCache(c, "/subscriptions*", "subscriptions:all:*", fmt.Sprintf("/subscriptions/%v", id))
		}

		c.JSON(http.StatusOK, sub)
	}
}

func DeleteSubscription() gin.HandlerFunc {
	return func(c *gin.Context) {
		var sub models.Subscription
		db := database.GetGormDB()

		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			log.Error().Err(err).Msg("Failed to get id")
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of subscription"})
			return
		}

		if err := db.First(&sub, id).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding subscription by id: %d", id)
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of subscription"})
			return
		}

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		var records []models.Record
		if err := tx.Where("subscription_id = ?", sub.ID).Find(&records).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				tx.Rollback()
				log.Error().Err(err).Msgf("Error finding records by subscription id: %d", sub.ID)
				c.JSON(http.StatusInternalServerError, gin.H{"error:": "Failed to find records"})
				return
			}
			log.Warn().
				Msg("records missing, deleting record without restoring places")
		} else {
			for _, record := range records {
				var slot models.ActivitySlot
				if err := tx.First(&slot, record.SlotID).Error; err != nil {
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
					if err := tx.Delete(&record).Error; err != nil {
						tx.Rollback()
						log.Error().Err(err).Msgf("Error deliting record by id: %d", record.ID)
						c.JSON(http.StatusInternalServerError, gin.H{"error:": "Failed to delete record"})
						return
					}

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
			}
		}

		if err := tx.Delete(&sub, id).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msgf("Error to delete subscription by id: %d", id)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to delete subscription"})
			return
		}

		if err := tx.Commit().Error; err != nil {
			log.Error().Err(err).Msg("Commit failed for delete subscription")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
			return
		}

		if redisClient != nil {
			utils.InvalidateCache(c,
				"/subscriptions*",
				"subscriptions:all:*",
				fmt.Sprintf("/subscriptions/%v", id),
				"activity_slots*",
				"/records*",
				"records:all:*",
				"/client/records*",
				"client:records:*",
				"schedule*",
			)
		}

		c.Status(http.StatusNoContent)
	}
}

func ExtendSubscription() gin.HandlerFunc {
	return func(c *gin.Context) {
		var sub models.Subscription
		db := database.GetGormDB()

		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			log.Error().Err(err).Msg("Failed to get id")
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of subscription"})
			return
		}

		if err := db.First(&sub, id).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding subscription by id: %d", id)
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of subscription"})
			return
		}

		var sub_type models.SubscriptionType
		if err := db.First(&sub_type, sub.SubscriptionTypeID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Тип абонемента не знайдено"})
			} else {
				log.Error().Err(err).Msg("Database error while finding subscription type")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Помилка сервера"})
			}
			return
		}

		subEnd := sub.EndDate.AddDate(0, 0, sub_type.DurationDays)
		sub.EndDate = subEnd

		tx := db.Begin()
		if err := tx.Save(&sub).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msgf("Error to save extended subscription by id: %d", id)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to save extended subscription"})
			return
		}
		tx.Commit()

		if redisClient != nil {
			utils.InvalidateCache(c, "/subscriptions*", "subscriptions:all:*", fmt.Sprintf("/subscriptions/%v", id))
		}

		c.JSON(http.StatusOK, sub)
	}
}
