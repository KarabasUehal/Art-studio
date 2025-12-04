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
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
)

func GetAllTemplates() gin.HandlerFunc {
	return func(c *gin.Context) {
		var templates []models.ScheduleTemplate
		db := database.GetGormDB()
		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		cacheKey := c.Request.URL.String()

		var resp gin.H

		if redisClient != nil {
			if cached, err := redisClient.Get(c, cacheKey).Result(); err == nil {
				if json.Unmarshal([]byte(cached), &resp) == nil {
					c.JSON(http.StatusOK, resp)
					return
				}
			}
		}

		query := db.Model(&models.ScheduleTemplate{})

		var totalCount int64
		if err := query.Count(&totalCount).Error; err != nil {
			log.Error().Err(err).Msg("Failed to count templates")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count templates"})
			return
		}

		if err := query.Order("id ASC, day_of_week ASC, start_time ASC").
			Find(&templates).Error; err != nil {
			log.Error().Err(err).Msg("Error finding templates")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find templates"})
			return
		}

		if redisClient != nil {
			if respBytes, err := json.Marshal(templates); err == nil {
				redisClient.Set(c, cacheKey, respBytes, 30*time.Minute)
			}
		}

		c.JSON(http.StatusOK, templates)
	}
}

func GetTemplatesByActID() gin.HandlerFunc {
	return func(c *gin.Context) {
		var templates []models.ScheduleTemplate
		db := database.GetGormDB()
		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		cacheKey := c.Request.URL.String()

		act_id, err := strconv.Atoi(c.Param("act_id"))
		if err != nil {
			log.Error().Err(err).Msg("Failed to get id")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id of template"})
			return
		}

		if redisClient != nil {
			cached, err := redisClient.Get(c, cacheKey).Result()
			if err == nil {
				if json.Unmarshal([]byte(cached), &templates) == nil {
					log.Info().Str("cacheKey", cacheKey).Msg("Cache hit for template id")
					c.JSON(http.StatusOK, templates)
					return
				}
				log.Error().Err(err).Msg("Failed to unmarshal cached template")
			} else if err != redis.Nil {
				log.Error().Err(err).Msg("Redis error for template id")
			}
		}

		var act models.Activity
		if err := db.Select("id").First(&act, act_id).Error; err != nil {
			log.Error().Err(err).Msgf("Activity not found for id: %d", act_id)
			c.JSON(http.StatusNotFound, gin.H{"error": "Activity not found"})
			return
		}

		if err := db.Where("activity_id = ?", act_id).
			Order("day_of_week ASC, start_time ASC").
			Find(&templates).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding templates for activity_id: %d", act_id)
			c.JSON(http.StatusNotFound, gin.H{"error": "Templates not found for this activity"})
			return
		}

		c.JSON(http.StatusOK, templates)
	}
}

func GetTemplateByID() gin.HandlerFunc {
	return func(c *gin.Context) {
		var template models.ScheduleTemplate
		db := database.GetGormDB()
		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		cacheKey := c.Request.URL.String()
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			log.Error().Err(err).Msg("Failed to get id")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id of template"})
			return
		}

		if redisClient != nil {
			cached, err := redisClient.Get(c, cacheKey).Result()
			if err == nil {
				if json.Unmarshal([]byte(cached), &template) == nil {
					c.JSON(http.StatusOK, template)
					return
				}
			}
		}

		if err := db.First(&template, id).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding template by id: %d", id)
			c.JSON(http.StatusNotFound, gin.H{"error": "Failed to get id"})
			return
		}

		c.JSON(http.StatusOK, template)
	}
}

func AddTemplate() gin.HandlerFunc {
	return func(c *gin.Context) {
		var input models.SlotInput
		db := database.GetGormDB()
		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			log.Error().Err(err).Msg("Error binding json")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		activityID, err := strconv.Atoi(c.Param("act_id"))
		if err != nil {
			log.Error().Err(err).Msg("Failed to get activity_id")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid activity_id of template"})
			return
		}

		if input.DayOfWeek < 1 || input.DayOfWeek > 5 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "day_of_week must be 1-5 (Mon-Fri)"})
			return
		}
		if input.Capacity < 1 {
			input.Capacity = 10
		}

		var act models.Activity
		if err := db.First(&act, activityID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Activity not found"})
			return
		}
		if !act.IsRegular {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Only regular activities can have templates"})
			return
		}

		template := models.ScheduleTemplate{
			ActivityID: uint(activityID),
			DayOfWeek:  input.DayOfWeek,
			StartTime:  input.StartTime,
			Capacity:   input.Capacity,
		}

		tx := db.Begin()
		if err := tx.Create(&template).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msg("Error creating templates")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create templates"})
			return
		}

		if err := tx.Commit().Error; err != nil {
			log.Error().Err(err).Msg("Commit failed for create")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
			return
		}

		if redisClient != nil {
			pattern := []string{"templates*"}
			for _, pattern := range pattern {
				cursor := uint64(0)
				for {
					keys, nextCursor, err := redisClient.Scan(c, cursor, pattern, 1000).Result()
					if err != nil {
						log.Error().Err(err).Msg("Failed to scan templates cache keys")
						break
					}
					if len(keys) > 0 {
						if err := redisClient.Del(c, keys...).Err(); err != nil {
							log.Error().Err(err).Msg("Failed to delete templates cache keys")
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

		c.JSON(http.StatusCreated, template)
	}
}

func UpdateTemplate() gin.HandlerFunc {
	return func(c *gin.Context) {
		var input models.SlotInput
		var template models.ScheduleTemplate
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
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id of template"})
			return
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			log.Error().Err(err).Msg("Error binding json")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		tx := db.Begin()
		if err := tx.First(&template, id).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msg("Error finding template")
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to find template",
			})
			return
		}

		template.DayOfWeek = input.DayOfWeek
		template.Capacity = input.Capacity

		if input.StartTime != "" {
			if _, err := utils.ParseTemplateTime(input.StartTime); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_time"})
				return
			}
			template.StartTime = input.StartTime
		}

		if err := tx.Save(&template).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msg("Failed to save template")
			c.JSON(http.StatusInternalServerError, gin.H{
				"Error to save template": err,
			})
		}

		if err := tx.Commit().Error; err != nil {
			log.Error().Err(err).Msg("Commit failed for save")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
			return
		}

		if redisClient != nil {
			pattern := []string{"templates*", fmt.Sprintf("/tеmplate/%v", id)}
			for _, pattern := range pattern {
				cursor := uint64(0)
				for {
					keys, nextCursor, err := redisClient.Scan(c, cursor, pattern, 100).Result()
					if err != nil {
						log.Error().Err(err).Msg("Failed to scan template cache keys")
						break
					}
					if len(keys) > 0 {
						if err := redisClient.Del(c, keys...).Err(); err != nil {
							log.Error().Err(err).Msg("Failed to delete template cache keys")
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

		c.JSON(http.StatusOK, template)
	}
}

func DeleteTemplate() gin.HandlerFunc {
	return func(c *gin.Context) {
		var template models.ScheduleTemplate

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
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id of template"})
			return
		}

		tx := db.Begin()
		if res := tx.First(&template, id); res == nil {
			tx.Rollback()
			log.Error().Msg("Error finding template")
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Failed to find template",
			})
			return
		}
		if err := tx.Unscoped().Delete(&template, id).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msgf("Error to delete template by id: %d", id)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete template"})
			return
		}

		if err := tx.Commit().Error; err != nil {
			log.Error().Err(err).Msg("Commit failed for delete")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
			return
		}

		if redisClient != nil {
			pattern := []string{"templates*", fmt.Sprintf("/template/%v", id)}
			for _, pattern := range pattern {
				cursor := uint64(0)
				for {
					keys, nextCursor, err := redisClient.Scan(c, cursor, pattern, 100).Result()
					if err != nil {
						log.Error().Err(err).Msg("Failed to scan templates cache keys")
						break
					}
					if len(keys) > 0 {
						if err := redisClient.Del(c, keys...).Err(); err != nil {
							log.Error().Err(err).Msg("Failed to delete templates cache keys")
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

func ExtendSchedule() gin.HandlerFunc {
	return func(c *gin.Context) {
		weeksStr := c.DefaultQuery("weeks", "1")
		weeks, err := strconv.Atoi(weeksStr)
		if err != nil {
			log.Error().Err(err).Msg("Failed to get weeks")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid value of weeks"})
			return
		}

		if weeks < 1 || weeks > 4 {
			weeks = 1
		}

		if err := GenerateRegularSlots(weeks); err != nil {
			log.Error().Err(err).Msg("Error extending schedule")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to extend schedule"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Schedule extended"})
	}
}

func GenerateRegularSlots(weeks int) error {
	db := database.GetGormDB()
	var activities []models.Activity
	if err := db.Where("is_regular = ?", true).Find(&activities).Error; err != nil {
		log.Error().Err(err).Msg("Error finding activities")
		return err
	}

	now := time.Now().UTC()
	startDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, 0, 1)
	endDate := startDate.AddDate(0, 0, 7*weeks)

	for _, act := range activities {
		var templates []models.ScheduleTemplate
		if err := db.Where("activity_id = ?", act.ID).Find(&templates).Error; err != nil {
			log.Error().Err(err).Msg("Error finding templates")
			return err
		}

		for current := startDate; current.Before(endDate); current = current.AddDate(0, 0, 1) {
			if current.Weekday() == time.Saturday || current.Weekday() == time.Sunday {
				continue // Пропускаем выходные
			}

			jsDay := int(current.Weekday())
			if jsDay == 0 {
				jsDay = 7
			}

			for _, tmpl := range templates {

				if tmpl.DayOfWeek != jsDay {
					continue
				}

				startParts := strings.Split(tmpl.StartTime, ":")
				hour, _ := strconv.Atoi(startParts[0])
				minute, _ := strconv.Atoi(startParts[1])

				slotStart := time.Date(current.Year(), current.Month(), current.Day(),
					hour, minute, 0, 0, time.UTC)

				var existing models.ActivitySlot // Проверяем, существует ли слот (чтобы не дублировать)
				if err := db.Where("activity_id = ? AND start_time >= ? AND start_time < ?",
					act.ID, slotStart, slotStart.Add(time.Minute)).First(&existing).Error; err == nil {
					continue
				} else if !errors.Is(err, gorm.ErrRecordNotFound) {
					return err
				}

				slot := models.ActivitySlot{
					ActivityID: act.ID,
					StartTime:  slotStart.UTC(),
					EndTime:    slotStart.Add(time.Duration(act.Duration) * time.Minute).UTC(),
					Capacity:   tmpl.Capacity,
					Booked:     0,
					TemplateID: &tmpl.ID,
				}
				if err := db.Create(&slot).Error; err != nil {
					return err
				}
				log.Info().Msgf("Generated slots for activity %d: %s", act.ID, act.Name)
			}
		}
	}
	return nil
}
