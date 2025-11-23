package handlers

import (
	"art/database"
	"art/middleware"
	"art/models"
	"context"

	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/rs/zerolog/log"
	"golang.org/x/crypto/bcrypt"
)

// Это для регистрации обычных пользователей
func Register(c *gin.Context) {
	var user models.User
	var input models.RegisterClient
	db := database.GetGormDB()
	if err := c.ShouldBindJSON(&input); err != nil {
		log.Error().Err(err).Msg("Failed to bind json")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Info().Msgf("Register input: username=%s, password_len=%d, phone=%s", user.Username, len(user.Password), user.PhoneNumber)

	user.Username = strings.TrimSpace(input.Username)
	user.Password = strings.TrimSpace(input.Password)
	user.PhoneNumber = strings.TrimSpace(input.PhoneNumber)
	user.Name = strings.TrimSpace(input.Name)

	if strings.ContainsAny(user.Username, "<>\"';&") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input of username"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), 14) // Хешируем пароль
	if err != nil {
		log.Error().Err(err).Msg("Failed to hash password")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error of hashing password"})
		return
	}

	log.Info().Msgf("Register: username=%s, password_len=%v, hashed_len=%v", user.Username, user.Password, hashedPassword)

	user.Password = string(hashedPassword) // Устанавливаем для пароля пользователя хешированное значение
	user.Role = "client"                   // По умолчанию регистрируется аккаунт только на правах клиента
	tx := db.Begin()
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		log.Error().Err(err).Msg("Failed to create user")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания пользователя"})
		return
	}
	tx.Commit()

	log.Info().Str("user_username", user.Username).Msg("Create user")

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &models.Claims{
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime), // Валидируем токен на 24 часа
		},
		Role:        user.Role,
		PhoneNumber: user.PhoneNumber,
		Name:        user.Name,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(middleware.JwtKey)
	if err != nil {
		log.Error().Err(err).Msg("Failed to sign token")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to sign token"})
	}

	c.JSON(http.StatusOK, gin.H{"message": "User registered", "token": tokenString})
}

// Регистрация пользователя владельцем (с выбором роли)
func RegisterByOwner(c *gin.Context) {
	var input models.RegisterOwner

	db := database.GetGormDB()

	if err := c.ShouldBindJSON(&input); err != nil {
		log.Error().Err(err).Msg("Failed to bind json")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input.Username = strings.TrimSpace(input.Username)
	input.Password = strings.TrimSpace(input.Password)
	input.PhoneNumber = strings.TrimSpace(input.PhoneNumber)

	if strings.ContainsAny(input.Username, "<>\"';&") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid signs in username"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), 14)
	if err != nil {
		log.Error().Err(err).Msg("Failed to hash password")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error of hashing password"})
		return
	}

	user := models.User{
		Username:    input.Username,
		Password:    string(hashedPassword),
		Role:        input.Role,
		PhoneNumber: input.PhoneNumber,
		Name:        input.Name,
	}

	tx := db.Begin()
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		log.Error().Err(err).Msg("Failed to create user")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error to create user"})
		return
	}
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "User registered by owner"})
}

func Login(c *gin.Context) {
	var user models.User
	var input models.Login

	db := database.GetGormDB()
	redisClient, err := database.GetRedis()
	if err != nil {
		log.Error().Err(err).Msg("Error getting redis")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get redis"})
		return
	}
	ctx := context.Background()

	if err := c.ShouldBindJSON(&input); err != nil {
		log.Error().Err(err).Msg("Failed to bind json")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	attemptsKey := "login_attempts:" + input.Username
	attempts, err := redisClient.Get(ctx, attemptsKey).Int()
	if err != nil {
		log.Error().Err(err).Msg("Failed to count entering attempts")
	}

	if attempts >= 5 {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "Слишком много попыток входа"})
		return
	}

	redisClient.Incr(ctx, attemptsKey)
	redisClient.Expire(ctx, attemptsKey, time.Hour)

	input.Username = strings.TrimSpace(input.Username) // Удаляем пробелы
	if strings.ContainsAny(input.Username, "<>\"';&") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимые символы в имени пользователя"})
		return
	}

	if err := db.Where("username = ?", input.Username).First(&user).Error; err != nil {
		log.Error().Err(err).Msg("Error to find user")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	log.Info().Msgf("Login attempt: username=%s, password_len=%v, db_hash_len=%v", input.Username, input.Password, user.Password)

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		log.Error().Err(err).Msg("Invalid credentials")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &models.Claims{
		Username: input.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
		Role:        user.Role,
		PhoneNumber: user.PhoneNumber,
		Name:        user.Name,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(middleware.JwtKey)
	if err != nil {
		log.Error().Err(err).Msg("Invalid token")
		log.Printf("Invalid token for IP %s: %v", c.ClientIP(), err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Wrong token"})
		c.Abort()
		return
	}

	redisClient.Del(ctx, attemptsKey)
	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}
