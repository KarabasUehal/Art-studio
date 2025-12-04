package handlers

import (
	"art/database"
	"art/models"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func GetActivitySlots() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.GetGormDB()

		activityID, err := strconv.Atoi(c.Param("activity_id"))
		if err != nil {
			log.Error().Err(err).Msg("Error fetching activity_id")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid activity ID"})
			return
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

		id, err := strconv.Atoi(c.Param("slot_id"))
		if err != nil {
			log.Error().Err(err).Msg("Invalid slot id")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to fetch slot id"})
			return
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

		type SlotInput struct {
			StartTimeStr string `json:"start_time" binding:"required"`
			Capacity     int    `json:"capacity" binding:"required,min=1"`
		}
		var input SlotInput
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

		c.JSON(http.StatusOK, gin.H{"slot": slot})
	}
}

func DeleteSlot() gin.HandlerFunc {
	return func(c *gin.Context) {
		var slot models.ActivitySlot
		db := database.GetGormDB()

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

		if err := db.Unscoped().Delete(&slot).Error; err != nil {
			log.Error().Err(err).Msgf("Error deleting slot id: %d", id)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete slot"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}
