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

func GetActivitySlots() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.GetGormDB()
		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		activityID, err := strconv.Atoi(c.Param("activity_id"))
		if err != nil {
			log.Error().Err(err).Msg("Error fetching activity_id")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid activity ID"})
			return
		}

		cacheKey := c.Request.URL.String()
		cached, err := redisClient.Get(c, cacheKey).Result()
		if err == nil {
			var resp map[string]interface{}
			if jsonErr := json.Unmarshal([]byte(cached), &resp); jsonErr != nil {
				log.Error().Err(jsonErr).Msg("Failed to unmarshal cached response")
			} else {
				log.Info().Msg("Cache hit for all slots")
				c.JSON(http.StatusOK, resp)
				return
			}
		} else if err != redis.Nil {
			log.Error().Err(err).Msg("Failed to hit cache for all slots")
		}

		var slots []models.ActivitySlot
		if err := db.
			Where("activity_id = ? AND start_time > ? AND booked < capacity", activityID, time.Now()).
			Order("start_time ASC").
			Find(&slots).Error; err != nil {
			log.Error().Err(err).Msg("Error fetching slots")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch slots"})
			return
		}

		c.JSON(http.StatusOK, slots)
	}
}

func GetSlotByID() gin.HandlerFunc {
	return func(c *gin.Context) {
		var slot models.ActivitySlot
		db := database.GetGormDB()
		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		id, err := strconv.Atoi(c.Param("slot_id"))
		if err != nil {
			log.Error().Err(err).Msg("Invalid slot id")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to fetch slot id"})
			return
		}

		cacheKey := c.Request.URL.String()
		cached, err := redisClient.Get(c, cacheKey).Result()
		if err == nil {
			var resp map[string]interface{}
			if jsonErr := json.Unmarshal([]byte(cached), &resp); jsonErr != nil {
				log.Error().Err(jsonErr).Msg("Failed to unmarshal cached response")
			} else {
				log.Info().Msgf("Cache hit for slot: %d", id)
				c.JSON(http.StatusOK, resp)
				return
			}
		} else if err != redis.Nil {
			log.Error().Err(err).Msgf("Failed to hit cache for slot: %d", id)
		}

		if err := db.First(&slot, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				log.Error().Err(err).Msgf("Error finding slot by id: %d, slot is not exists", id)
				c.JSON(http.StatusNotFound, gin.H{"error": "Slot not found"})
				return
			}
			log.Error().Err(err).Msgf("Error finding slot by id: %d", id)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to fetch slot"})
			return
		}

		c.JSON(http.StatusOK, &slot)
	}
}

func AddSlot() gin.HandlerFunc {
	return func(c *gin.Context) {
		var slot models.ActivitySlot
		var act models.Activity
		db := database.GetGormDB()

		activityID, err := strconv.Atoi(c.Param("activity_id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid activity ID"})
			return
		}

		var input models.SlotInput
		if err := c.ShouldBindJSON(&input); err != nil {
			log.Error().Err(err).Msg("Error binding json")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to bind json"})
			return
		}

		if err := db.First(&act, activityID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				log.Error().Err(err).Msgf("Error finding activity by id: %d, activity does not exist", activityID)
				c.JSON(http.StatusNotFound, gin.H{"error": "Activity not found"})
				return
			}
			log.Error().Err(err).Msgf("Error finding activity by id: %d", activityID)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to fetch activity"})
			return
		}

		parsedTime, err := time.Parse("2006-01-02T15:04:05", input.StartTimeStr)
		if err != nil {
			log.Error().Err(err).Msg("Error parsing time")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse time"})
			return
		}
		slot.StartTime = parsedTime.UTC()
		slot.EndTime = slot.StartTime.Add(time.Duration(act.Duration) * time.Minute)

		slot.ActivityID = uint(activityID)
		slot.Capacity = input.Capacity
		slot.Booked = 0
		slot.Source = "manual"

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()
		if res := tx.Create(&slot); res.Error != nil {
			tx.Rollback()
			log.Error().Err(res.Error).Msg("Error creating slot")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to create slot"})
			return
		}
		if err := tx.Commit().Error; err != nil {
			log.Error().Err(err).Msg("Commit failed while creating slot")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
			return
		}

		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		if redisClient != nil {
			utils.InvalidateCache(c, fmt.Sprintf("/activity/%d/slots*", slot.ActivityID))
		}

		c.JSON(http.StatusCreated, gin.H{"slot": slot})
	}
}

func UpdateSlot() gin.HandlerFunc {
	return func(c *gin.Context) {
		var slot models.ActivitySlot
		var input_slot models.ActivitySlot
		db := database.GetGormDB()

		id, err := strconv.Atoi(c.Param("slot_id"))
		if err != nil {
			log.Error().Err(err).Msg("Invalid slot id")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to fetch slot id"})
			return
		}

		if err := c.ShouldBindJSON(&input_slot); err != nil {
			log.Error().Err(err).Msg("Error binding json")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to bind json"})
			return
		}

		if err := db.First(&slot, id).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding slot by id: %d", id)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to fetch slot"})
			return
		}

		activityID, _ := strconv.Atoi(c.Param("activity_id"))
		if slot.ActivityID != uint(activityID) {
			log.Error().Msgf("Slot does not belong to this activity. ID: %d", activityID)
			c.JSON(http.StatusForbidden, gin.H{"error": "Slot does not belong to this activity"})
			return
		}

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()
		if res := tx.Model(&slot).Clauses(clause.Returning{}).Updates(map[string]interface{}{
			"start_time": input_slot.StartTime,
			"capacity":   input_slot.Capacity, // Разрешается перезаписывать только некоторые блоки
		}); res.Error != nil {
			tx.Rollback()
			log.Error().Err(res.Error).Msg("Error updating slot")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to update slot"})
			return
		}
		if err := tx.Commit().Error; err != nil {
			log.Error().Err(err).Msg("Commit failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
			return
		}

		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		if redisClient != nil {
			utils.InvalidateCache(c, fmt.Sprintf("/activity/%d/slots*", slot.ActivityID))
		}

		c.JSON(http.StatusOK, gin.H{"slot": slot})
	}
}

func DeleteSlot() gin.HandlerFunc {
	return func(c *gin.Context) {
		var slot models.ActivitySlot
		var users []models.User // Для инвалидации кэша по отдельным пользователям в дальнейшем
		db := database.GetGormDB()
		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		id, err := strconv.Atoi(c.Param("slot_id"))
		if err != nil {
			log.Error().Err(err).Msg("Invalid slot id")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to fetch slot id"})
			return
		}

		if err := db.First(&slot, id).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding slot by id: %d", id)
			c.JSON(http.StatusNotFound, gin.H{"error": "Failed to fetch slot"})
			return
		}

		tx := db.Begin()
		var records []models.Record
		if err := tx.Where("slot_id = ?", slot.ID).Find(&records).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				log.Warn().
					Msgf("records missing by slot_id %d, deleting record without restoring sub visits", slot.ID)
			} else {
				tx.Rollback()
				log.Error().Err(err).Msgf("Error finding records by slot id: %d", slot.ID)
				c.JSON(http.StatusNotFound, gin.H{"error": "Failed to find slot records"})
				return
			}
		} else {
			for _, record := range records {
				var subType models.SubscriptionType
				if err := tx.Where("activity_id = ?", record.Details.ActivityID).First(&subType).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						log.Warn().
							Msg("sub_type missing, deleting record without restoring sub visits")
					} else {
						log.Error().Err(err).Msgf("Error finding subscription by record user id: %d", record.UserID)
						c.JSON(http.StatusNotFound, gin.H{"error": "Failed to find record subscription"})
						return
					}
				}

				var subscription models.Subscription
				if err := tx.Joins("JOIN subscription_kids sk ON sk.subscription_id = subscriptions.id").
					Joins("JOIN sub_kids kids ON kids.id = sk.sub_kid_id").
					Where("kids.id = ?", record.SubKidID).
					Preload("SubKids").First(&subscription).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						log.Warn().
							Msg("subscription missing, deleting record without restoring sub visits")
					} else {
						log.Error().Err(err).Msgf("Error finding subscription by record user id: %d", record.UserID)
						c.JSON(http.StatusNotFound, gin.H{"error": "Failed to find record subscription"})
						return
					}
				} else {

					if subscription.VisitsUsed > 0 {
						subscription.VisitsUsed -= 1
					}

					if err := tx.Save(&subscription).Error; err != nil {
						tx.Rollback()
						log.Error().Err(err).Msgf("Error saving subscription id: %d", subscription.ID)
						c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save subscription"})
						return
					}
				}

				if err := tx.Delete(&record).Error; err != nil {
					tx.Rollback()
					log.Error().Err(err).Msgf("Error deleting record id: %d", record.ID)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete record"})
					return
				}

				var user models.User
				if err := db.First(&user, record.UserID).Error; err != nil {
					tx.Rollback()
					log.Error().Err(err).Msgf("Error finding user id: %d", subscription.UserID)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error while deleting slot"})
					return
				}

				users = append(users, user)
			}
		}

		if err := tx.Delete(&slot).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msgf("Error deleting slot id: %d", id)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete slot"})
			return
		}

		if err := tx.Commit().Error; err != nil {
			log.Error().Err(err).Msg("Commit failed for delete slot")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
			return
		}

		if redisClient != nil {
			patterns := []string{fmt.Sprintf("/activity/%d/slots*", slot.ActivityID)}
			for _, user := range users {
				patterns = append(patterns, "/client/records*",
					fmt.Sprintf("client:records:%s:*", user.PhoneNumber),
					"records:all:*", "/records*", "subscriptions:all:*", "/subscriptions*")
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

		c.JSON(http.StatusNoContent, gin.H{"message": "Slot and related records deleted successfully"})
	}
}
