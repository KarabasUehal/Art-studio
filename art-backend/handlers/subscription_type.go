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

func GetAllSubTypes() gin.HandlerFunc {
	return func(c *gin.Context) {
		var sub_types []models.SubscriptionType
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

		cacheKey := fmt.Sprintf("/subscriptions/types:page=%d:size=%d", page, size)

		var resp gin.H

		if redisClient != nil {
			if cached, err := redisClient.Get(c, cacheKey).Result(); err == nil {
				if json.Unmarshal([]byte(cached), &resp) == nil {
					c.JSON(http.StatusOK, resp)
					return
				}
			}
		}

		query := db.Model(&models.SubscriptionType{})

		var totalCount int64
		if err := query.Count(&totalCount).Error; err != nil {
			log.Error().Err(err).Msg("Failed to count subscriptions_types")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count subscriptions_types"})
			return
		}

		if err := query.Order("id").
			Limit(size).
			Offset(offset).
			Preload("Activity").
			Find(&sub_types).Error; err != nil {

			log.Error().Err(err).Msg("Error finding subscriptions_types")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load subscriptions_types"})
			return
		}

		totalPages := (int(totalCount) + size - 1) / size

		resp = gin.H{
			"subscription_types": sub_types,
			"total_count":        totalCount,
			"total_pages":        totalPages,
			"current_page":       page,
			"page_size":          size,
		}

		if redisClient != nil {
			if respBytes, err := json.Marshal(resp); err == nil {
				redisClient.Set(c, cacheKey, respBytes, 30*time.Minute)
			}
		}

		c.JSON(http.StatusOK, resp)
	}
}

func GetSubTypeByID() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.GetGormDB()
		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		var sub_type models.SubscriptionType
		cacheKey := c.Request.URL.String()

		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			log.Error().Err(err).Msg("Failed to get id")
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of subscriptions_type"})
			return
		}

		if redisClient != nil {
			cached, err := redisClient.Get(c, cacheKey).Result()
			if err == nil {
				if json.Unmarshal([]byte(cached), &sub_type) == nil {
					log.Info().Str("cacheKey", cacheKey).Msg("Cache hit for subscriptions_type id")
					c.JSON(http.StatusOK, sub_type)
					return
				}
				log.Error().Err(err).Msg("Failed to unmarshal cached subscriptions_type")
			} else if err != redis.Nil {
				log.Error().Err(err).Msg("Redis error for subscriptions_type id")
			}
		} else {
			log.Info().Str("cacheKey", cacheKey).Msg("Redis client is nil, skipping cache for subscriptions_type id")
		}

		if err := db.First(&sub_type, id).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding subscriptions_type by id: %d", id)
			c.JSON(http.StatusBadRequest, gin.H{
				"Error": "Failed to get id",
			})
			return
		}

		c.JSON(http.StatusOK, &sub_type)
	}
}

func AddSubType() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.GetGormDB()
		var req models.SubscriptionType

		if err := c.ShouldBindJSON(&req); err != nil {
			log.Error().Err(err).Msg("Failed to bind json")
			c.JSON(http.StatusBadRequest, gin.H{
				"Invalid subscriptions_type input": err.Error()})
			return
		}

		if req.DurationDays <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end duration days, got zero"})
			return
		}

		if req.ActivityID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Activity ID is required"})
			return
		}
		var act models.Activity
		if err := db.First(&act, req.ActivityID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid activity ID"})
			return
		}

		sub_type := models.SubscriptionType{
			Name:         req.Name,
			ActivityID:   req.ActivityID,
			Activity:     req.Activity,
			Price:        req.Price,
			VisitsCount:  req.VisitsCount,
			DurationDays: req.DurationDays,
			IsActive:     req.IsActive,
		}

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		if res := tx.Create(&sub_type); res.Error != nil {
			tx.Rollback()
			log.Error().Err(res.Error).Msg("Error to create subscriptions_type")
			c.JSON(http.StatusBadRequest, gin.H{
				"Failed to create subscriptions_type": res.Error})
			return
		}
		tx.Commit()

		db.Preload("Activity").First(&sub_type, sub_type.ID)

		utils.InvalidateCache(c, "/subscriptions/types*", "/subscriptions/types:*")

		c.JSON(http.StatusCreated, sub_type)
	}
}

func UpdateSubType() gin.HandlerFunc {
	return func(c *gin.Context) {
		var sub_type models.SubscriptionType
		var updated_sub_type models.SubscriptionType
		db := database.GetGormDB()

		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			log.Error().Err(err).Msg("Failed to get id")
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of subscriptions_type"})
			return
		}

		if err := c.ShouldBindJSON(&updated_sub_type); err != nil {
			log.Error().Err(err).Msg("Failed to bind json")
			c.JSON(http.StatusBadRequest, gin.H{
				"Invalid of input data": err.Error()})
			return
		}

		if err := db.First(&sub_type, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Subscription type not found"})
			} else {
				log.Error().Err(err).Msg("Error finding subscription")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find subscription type"})
			}
			return
		}

		sub_type.Name = updated_sub_type.Name
		sub_type.ActivityID = updated_sub_type.ActivityID
		sub_type.Activity = updated_sub_type.Activity
		sub_type.Price = updated_sub_type.Price
		sub_type.VisitsCount = updated_sub_type.VisitsCount
		sub_type.DurationDays = updated_sub_type.DurationDays
		sub_type.IsActive = updated_sub_type.IsActive

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		if err := tx.Save(sub_type).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msg("Failed to save subscriptions_type")
			c.JSON(http.StatusInternalServerError, gin.H{
				"Error to save subscriptions_type": err,
			})
			return
		}
		tx.Commit()

		db.Preload("Activity").First(&sub_type, sub_type.ID)

		utils.InvalidateCache(c, "/subscriptions/types*", fmt.Sprintf("/subscriptions/types/%v", id))

		c.JSON(http.StatusOK, sub_type)
	}
}

func DeleteSubType() gin.HandlerFunc {
	return func(c *gin.Context) {
		var sub_type models.SubscriptionType
		db := database.GetGormDB()

		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		idStr := c.Param("id")
		if idStr == "" || idStr == "undefined" || idStr == "null" {
			log.Warn().Str("id", idStr).Msg("Invalid ID in delete request")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		id, err := strconv.Atoi(idStr)
		if err != nil {
			log.Error().Err(err).Msg("Failed to get id")
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of subscriptions_type"})
			return
		}

		if err := db.First(&sub_type, id).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding subscriptions_type by id: %d", id)
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of subscriptions_type"})
			return
		}

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		if err := db.Delete(&sub_type, id).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msgf("Error to delete subscriptions_type by id: %d", id)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to delete subscriptions_type"})
			return
		}

		if err := tx.Commit().Error; err != nil {
			log.Error().Err(err).Msg("Commit failed for delete sub type")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
			return
		}

		if redisClient != nil {
			utils.InvalidateCache(c, "/subscriptions/types*", fmt.Sprintf("/subscriptions/types/%v", id))
		}

		c.Status(http.StatusNoContent)
	}
}
