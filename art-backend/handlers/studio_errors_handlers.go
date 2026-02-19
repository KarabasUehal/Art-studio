package handlers

import (
	"art/database"
	"art/models"
	"art/utils"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

func GetAllErrors() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.GetGormDB()

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

		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		cacheKey := fmt.Sprintf("admin/errors:page=%d:size=%d", page, size)

		var resp gin.H

		if redisClient != nil {
			if cached, err := redisClient.Get(c, cacheKey).Result(); err == nil {
				if json.Unmarshal([]byte(cached), &resp) == nil {
					c.JSON(http.StatusOK, resp)
					return
				}
			}
		}

		query := db.Model(&models.StudioError{})

		// Применяем фильтр только если он валидный и не "all"

		var totalCount int64
		if err := query.Count(&totalCount).Error; err != nil {
			log.Error().Err(err).Msg("Failed to count activities")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count activities"})
			return
		}

		var st_errors []models.StudioError
		if err := query.Order("id").
			Limit(size).
			Offset(offset).
			Find(&st_errors).Error; err != nil {

			log.Error().Err(err).Msg("Error finding activities")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load activities"})
			return
		}

		totalPages := (int(totalCount) + size - 1) / size

		resp = gin.H{
			"st_errors":    st_errors,
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

func DeleteError() gin.HandlerFunc {
	return func(c *gin.Context) {
		var st_error models.StudioError
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
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of kid"})
			return
		}

		query := db.Where("id = ?", id)

		if err := query.First(&st_error, id).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding kid by id: %d", id)
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of kid"})
			return
		}

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		if err := tx.Delete(&st_error, id).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msgf("Error to delete kid by id: %d", id)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to delete kid"})
			return
		}

		if err := tx.Commit().Error; err != nil {
			log.Error().Err(err).Msg("Commit failed for delete kid")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
			return
		}

		if redisClient != nil {
			utils.InvalidateCache(
				c,
				fmt.Sprintf("admin/errors:%d", id),
				"admin/errors*",
			)
		}

		c.Status(http.StatusNoContent)

	}
}
