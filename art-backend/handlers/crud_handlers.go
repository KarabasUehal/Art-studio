package handlers

import (
	"art/database"
	"art/models"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
)

func GetActivities() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.GetGormDB()

		pageStr := c.DefaultQuery("page", "1")
		page, err := strconv.Atoi(pageStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page"})
			return
		}

		sizeStr := c.DefaultQuery("size", "9")
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

		filter := strings.ToLower(c.Query("filter"))

		redisClient, _ := database.GetRedis()
		cacheKey := fmt.Sprintf("activities:page=%d:size=%d:filter=%s", page, size, filter)

		var resp gin.H

		if redisClient != nil {
			if cached, err := redisClient.Get(c, cacheKey).Result(); err == nil {
				if json.Unmarshal([]byte(cached), &resp) == nil {
					c.JSON(http.StatusOK, resp)
					return
				}
			}
		}

		query := db.Model(&models.Activity{})

		// Применяем фильтр только если он валидный и не "all"
		switch filter {
		case "regular":
			query = query.Where("is_regular = ?", true)
		case "one-time", "onetime":
			query = query.Where("is_regular IS NULL OR is_regular = ?", false)
		}

		var totalCount int64
		if err := query.Count(&totalCount).Error; err != nil {
			log.Error().Err(err).Msg("Failed to count activities")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count activities"})
			return
		}

		var acts []models.Activity
		if err := query.Order("id").
			Limit(size).
			Offset(offset).
			Find(&acts).Error; err != nil {

			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load activities"})
			return
		}

		totalPages := (int(totalCount) + size - 1) / size

		resp = gin.H{
			"activity":     acts,
			"total_count":  totalCount,
			"total_pages":  totalPages,
			"current_page": page,
			"page_size":    size,
		}

		if redisClient != nil {
			if respBytes, err := json.Marshal(resp); err == nil {
				redisClient.Set(c, cacheKey, respBytes, 30*time.Minute)
			}
		}

		c.JSON(http.StatusOK, resp)
	}
}

func GetActivityByID() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.GetGormDB()
		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		var act models.Activity
		cacheKey := c.Request.URL.String()

		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			log.Error().Err(err).Msg("Failed to get id")
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of activity"})
			return
		}

		if redisClient != nil {
			cached, err := redisClient.Get(c, cacheKey).Result()
			if err == nil {
				if json.Unmarshal([]byte(cached), &act) == nil {
					log.Info().Str("cacheKey", cacheKey).Msg("Cache hit for activity id")
					c.JSON(http.StatusOK, act)
					return
				}
				log.Error().Err(err).Msg("Failed to unmarshal cached activity")
			} else if err != redis.Nil {
				log.Error().Err(err).Msg("Redis error for activity id")
			}
		} else {
			log.Info().Str("cacheKey", cacheKey).Msg("Redis client is nil, skipping cache for activity id")
		}

		if err := db.First(&act, id).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding activity by id: %d", id)
			c.JSON(http.StatusBadRequest, gin.H{
				"Error": "Failed to get id",
			})
			return
		}

		c.JSON(http.StatusOK, &act)
	}
}

func AddActivity() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.GetGormDB()
		var req models.Activity

		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			log.Error().Err(err).Msg("Failed to bind json")
			c.JSON(http.StatusBadRequest, gin.H{
				"Invalid activity input": err.Error()})
			return
		}

		if req.Duration <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Duration must be greater than 0"})
			return
		}

		var act_image models.ActivityImage

		act_image.MainImageURL = req.Images.MainImageURL
		act_image.Photo = req.Images.Photo
		act_image.Caption = req.Images.Caption

		activity := models.Activity{
			Name:         req.Name,
			Description:  req.Description,
			Images:       act_image,
			Price:        req.Price,
			Duration:     req.Duration,
			Availability: req.Availability,
			IsRegular:    req.IsRegular,
		}

		if act_image.Photo == nil {
			act_image.Photo = make([]string, 0)
		}

		tx := db.Begin()
		if res := tx.Create(&activity); res.Error != nil {
			tx.Rollback()
			log.Error().Err(res.Error).Msg("Error to create activity")
			c.JSON(http.StatusBadRequest, gin.H{
				"Failed to create activity": res.Error})
			return
		}
		tx.Commit()

		if redisClient != nil {
			pattern := []string{"activities*"}
			for _, pattern := range pattern {
				cursor := uint64(0)
				for {
					keys, nextCursor, err := redisClient.Scan(c, cursor, pattern, 1000).Result()
					if err != nil {
						log.Error().Err(err).Msg("Failed to scan activities cache keys")
						break
					}
					if len(keys) > 0 {
						if err := redisClient.Del(c, keys...).Err(); err != nil {
							log.Error().Err(err).Msg("Failed to delete activities cache keys")
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
			log.Info().Msgf("Cache deleted for %v", pattern)
		}

		c.JSON(http.StatusCreated, activity)
	}
}

func UpdateActivity() gin.HandlerFunc {
	return func(c *gin.Context) {
		var act models.Activity
		var updated_act models.Activity

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
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of activity"})
			return
		}

		if err := c.ShouldBindJSON(&updated_act); err != nil {
			log.Error().Err(err).Msg("Failed to bind json")
			c.JSON(http.StatusBadRequest, gin.H{
				"Invalid of input data": err.Error()})
			return
		}

		res := db.First(&act, id)
		if res == nil {
			tx := db.Begin()
			err := tx.Create(&updated_act).Error
			if err != nil {
				tx.Rollback()
				log.Error().Err(err).Msg("Failed to create activity")
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Error to create updated activity",
				})
				return
			}
			tx.Commit()
			c.JSON(http.StatusCreated, updated_act)
			return
		}

		act.Name = updated_act.Name
		act.Description = updated_act.Description
		act.Images = updated_act.Images
		act.Price = updated_act.Price
		act.Duration = updated_act.Duration
		act.Availability = updated_act.Availability
		act.IsRegular = updated_act.IsRegular

		tx := db.Begin()
		if err := tx.Save(act).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msg("Failed to save activity")
			c.JSON(http.StatusInternalServerError, gin.H{
				"Error to save activity": err,
			})
		}
		tx.Commit()

		if redisClient != nil {
			pattern := []string{"activities*", fmt.Sprintf("/activity/%v", id)}
			for _, pattern := range pattern {
				cursor := uint64(0)
				for {
					keys, nextCursor, err := redisClient.Scan(c, cursor, pattern, 100).Result()
					if err != nil {
						log.Error().Err(err).Msg("Failed to scan activities cache keys")
						break
					}
					if len(keys) > 0 {
						if err := redisClient.Del(c, keys...).Err(); err != nil {
							log.Error().Err(err).Msg("Failed to delete activities cache keys")
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

		c.JSON(http.StatusOK, updated_act)
	}
}

func DeleteActivity() gin.HandlerFunc {
	return func(c *gin.Context) {
		var act models.Activity
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
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of activity"})
			return
		}

		if err := db.First(&act, id).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding avtivity by id: %d", id)
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of activity"})
			return
		}

		tx := db.Begin()
		if err := db.Unscoped().Delete(&act, id).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msgf("Error to delete avtivity by id: %d", id)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to delete activity"})
			return
		}
		tx.Commit()

		if redisClient != nil {
			pattern := []string{"activities*", fmt.Sprintf("/activity/%v", id)}
			for _, pattern := range pattern {
				cursor := uint64(0)
				for {
					keys, nextCursor, err := redisClient.Scan(c, cursor, pattern, 100).Result()
					if err != nil {
						log.Error().Err(err).Msg("Failed to scan activities cache keys")
						break
					}
					if len(keys) > 0 {
						if err := redisClient.Del(c, keys...).Err(); err != nil {
							log.Error().Err(err).Msg("Failed to delete activities cache keys")
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
