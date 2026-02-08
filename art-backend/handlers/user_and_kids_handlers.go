package handlers

import (
	"art/database"
	"art/dto"
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

func GetAllUsers() gin.HandlerFunc {
	return func(c *gin.Context) {
		var users []models.User
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

		cacheKey := fmt.Sprintf("users:page=%d:size=%d", page, size)

		var resp gin.H

		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		if redisClient != nil {
			if cached, err := redisClient.Get(c, cacheKey).Result(); err == nil {
				if json.Unmarshal([]byte(cached), &resp) == nil {
					c.JSON(http.StatusOK, resp)
					return
				}
			}
		}

		query := db.Model(&models.User{}).Preload("UserKids")

		var totalCount int64
		if err := query.Count(&totalCount).Error; err != nil {
			log.Error().Err(err).Msg("Failed to count users")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count users"})
			return
		}

		if err := query.Order("id").
			Limit(size).
			Offset(offset).
			Find(&users).Error; err != nil {

			log.Error().Err(err).Msg("Error finding users")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load users"})
			return
		}

		totalPages := (int(totalCount) + size - 1) / size

		resp = gin.H{
			"users":        users,
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

func GetAllKids() gin.HandlerFunc {
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

		cacheKey := fmt.Sprintf("kids:page=%d:size=%d", page, size)

		var resp gin.H

		if redisClient != nil {
			if cached, err := redisClient.Get(c, cacheKey).Result(); err == nil {
				if json.Unmarshal([]byte(cached), &resp) == nil {
					c.JSON(http.StatusOK, resp)
					return
				}
			}
		}

		query := db.Model(&models.UserKid{})

		var totalCount int64
		if err := query.Count(&totalCount).Error; err != nil {
			log.Error().Err(err).Msg("Failed to count kids")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count kids"})
			return
		}

		var kids []models.UserKid
		if err := query.Order("id").
			Limit(size).
			Offset(offset).
			Find(&kids).Error; err != nil {

			log.Error().Err(err).Msg("Error finding kids")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load kids"})
			return
		}

		totalPages := (int(totalCount) + size - 1) / size

		resp = gin.H{
			"user_kids":    kids,
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

func GetMyKids() gin.HandlerFunc {
	return func(c *gin.Context) {
		var kids []models.UserKid
		var user models.User

		db := database.GetGormDB()
		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		phoneNumber, _ := c.Get("phone_number")
		cacheKey := fmt.Sprintf("kids:list:user:%v", phoneNumber)

		resp := gin.H{"user_kids": []models.UserKid{}}

		if redisClient != nil {
			if cached, err := redisClient.Get(c, cacheKey).Result(); err == nil {
				if json.Unmarshal([]byte(cached), &resp) == nil {
					c.JSON(http.StatusOK, resp)
					return
				}
			}
		}

		// Получаем номер телефона из параметров
		phone_number, ok := c.Get("phone_number")
		if !ok {
			log.Error().Msg("Value of phone number does not exist")
		}

		log.Info().Any("phone_number", phone_number).Msg("Got phone number")

		// Ищем пользователя по номеру телефона
		if err := db.Where("phone_number = ?", phone_number).First(&user).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding user with phone number: %v", phone_number)
			c.JSON(http.StatusNotFound, gin.H{
				"Error": "User not found",
			})
			return
		}

		if err := db.Where("user_id = ?", user.ID).Find(&kids).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding kids by user id: %v", user.ID)
			c.JSON(http.StatusNotFound, gin.H{
				"Error": "Kids not found",
			})
			return
		}

		resp = gin.H{"user_kids": kids}

		if redisClient != nil {
			if respBytes, err := json.Marshal(resp); err == nil {
				redisClient.Set(c, cacheKey, respBytes, 30*time.Minute)
			}
		}

		c.JSON(http.StatusOK, resp)
	}
}

func GetKidByID() gin.HandlerFunc {
	return func(c *gin.Context) {
		var kid models.UserKid
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

		phoneNumber, ok := c.Get("phone_number")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		var user models.User
		if err := db.Where("phone_number = ?", phoneNumber).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		cacheKey := fmt.Sprintf("kid:%d:user:%d", id, user.ID)

		if redisClient != nil {
			cached, err := redisClient.Get(c, cacheKey).Result()
			if err == nil {
				if json.Unmarshal([]byte(cached), &kid) == nil {
					log.Info().Str("cacheKey", cacheKey).Msg("Cache hit for kid id")
					c.JSON(http.StatusOK, kid)
					return
				}
				log.Warn().Msg("Cached kid found but failed to unmarshal")
			} else if err != redis.Nil {
				log.Error().Err(err).Msg("Redis error for kid id")
			}
		} else {
			log.Info().Str("cacheKey", cacheKey).Msg("Redis client is nil, skipping cache for kid id")
		}

		if err := db.Where("id = ? AND user_id = ?", id, user.ID).First(&kid).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding kid by id: %d", id)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Kid not found",
			})
			return
		}

		if redisClient != nil {
			if respBytes, err := json.Marshal(kid); err == nil {
				redisClient.Set(c, cacheKey, respBytes, 30*time.Minute)
			}
		}

		c.JSON(http.StatusOK, &kid)
	}
}

func AddKid() gin.HandlerFunc {
	return func(c *gin.Context) {

		defer func() {
			if r := recover(); r != nil {
				log.Error().Interface("panic", r).Msg("Panic recovered in AddKid")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутрішня помилка сервера"})
			}
		}()

		var user models.User
		db := database.GetGormDB()
		redisClient, err := database.GetRedis()
		if err != nil {
			log.Error().Err(err).Msg("Error getting redis")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
			return
		}

		// Получаем номер телефона из параметров
		phone_number, ok := c.Get("phone_number")
		if !ok {
			log.Error().Msg("Value of phone number does not exist")
			c.JSON(http.StatusBadRequest, gin.H{
				"Error": "Phone number not found",
			})
			return
		}

		log.Info().Any("phone_number", phone_number).Msg("Got phone number")

		// Ищем пользователя по номеру телефона
		if err := db.Preload("UserKids").Where("phone_number = ?", phone_number).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Користувача не знайдено"})
			} else {
				log.Error().Err(err).Msg("Помилка завантаження користувача")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Помилка сервера"})
			}
			return
		}

		var reqKid models.UserKid
		if err := c.ShouldBindJSON(&reqKid); err != nil {
			log.Error().Err(err).Msg("Error binding json")
			c.JSON(http.StatusInternalServerError, gin.H{
				"Error": "Failed to bind json",
			})
			return
		}

		if reqKid.Name == "" || reqKid.Age < 3 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ім'я та вік обов'язкові"})
			return
		}

		// Проверка дубля (по уникальному индексу из миграции)
		var count int64
		if err := db.Model(&models.UserKid{}).
			Where("user_id = ? AND name = ? AND age = ?", user.ID, reqKid.Name, reqKid.Age).
			Count(&count).Error; err != nil {
			log.Error().Err(err).Msg("Помилка перевірки дубля")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Помилка сервера"})
			return
		}

		if count > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "Дитина з таким ім'ям та віком вже існує"})
			return
		}

		newKid := models.UserKid{
			Name:          reqKid.Name,
			Age:           reqKid.Age,
			Gender:        reqKid.Gender,
			UserID:        user.ID,
			ParentName:    user.Name,
			ParentSurname: user.Surname,
		}

		tx := db.Begin()
		if err := tx.Create(&newKid).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msg("Failed to create kid")
			c.JSON(http.StatusInternalServerError, gin.H{
				"Error to create kid": err,
			})
			return
		}
		tx.Commit()

		if redisClient != nil {
			utils.InvalidateCache(c, fmt.Sprintf("kids:list:user:%v", phone_number), "kids:*")
		}

		c.JSON(http.StatusOK, gin.H{
			"Message": "Kid added successfully",
			"Kid":     newKid,
		})
	}
}

func UpdateKid() gin.HandlerFunc {
	return func(c *gin.Context) {
		var reqKid dto.KidRequest
		var kid models.UserKid
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

		phoneNumber, ok := c.Get("phone_number")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		var user models.User
		if err := db.Where("phone_number = ?", phoneNumber).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		if err := c.ShouldBindJSON(&reqKid); err != nil {
			log.Error().Err(err).Msg("Failed to bind json")
			c.JSON(http.StatusBadRequest, gin.H{
				"Invalid of input data": err.Error()})
			return
		}

		if err := db.Where("id = ? AND user_id = ?", id, user.ID).First(&kid).Error; err != nil {
			log.Error().Err(err).Msgf("Error finding kid by id: %d", id)
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid id of kid"})
			return
		}

		kid.Name = reqKid.Name
		kid.Age = reqKid.Age
		kid.Gender = reqKid.Gender

		tx := db.Begin()
		if err := tx.Save(&kid).Error; err != nil {
			tx.Rollback()
			log.Error().Err(err).Msg("Failed to save kid")
			c.JSON(http.StatusInternalServerError, gin.H{
				"Error to save kid": err,
			})
		}
		tx.Commit()

		if redisClient != nil {
			utils.InvalidateCache(
				c,
				fmt.Sprintf("kid:%d:user:%d", id, user.ID),
				fmt.Sprintf("kids:list:user:%v", phoneNumber),
				"kids:*",
			)
		}

		c.JSON(http.StatusOK, dto.KidToResponse(kid))
	}
}

func DeleteKid() gin.HandlerFunc {
	return func(c *gin.Context) {
		var kid models.UserKid
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

		phoneNumber, ok := c.Get("phone_number")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		var user models.User
		if err := db.Where("phone_number = ?", phoneNumber).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		query := db.Where("id = ?", id)

		if user.Role != "owner" {
			query = query.Where("user_id = ?", user.ID)
		}

		if err := query.First(&kid, id).Error; err != nil {
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

		if err := tx.Delete(&kid, id).Error; err != nil {
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
				fmt.Sprintf("kid:%d:user:%d", id, user.ID),
				"kids:list:user:"+fmt.Sprint(user.ID),
				"kids:*",
			)
		}

		c.Status(http.StatusNoContent)

	}
}
