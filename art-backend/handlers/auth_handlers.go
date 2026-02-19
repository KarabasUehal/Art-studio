package handlers

import (
	"art/database"
	"art/middleware"
	"art/models"
	"context"
	"regexp"

	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/rs/zerolog/log"
	"golang.org/x/crypto/bcrypt"
)

var (
	latinRegex    = regexp.MustCompile(`^[a-zA-Z0-9]+$`) // Для валидации
	cyrillicRegex = regexp.MustCompile(`^[а-яА-ЯёЁіІїЇєЄґҐ\s-]+$`)
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
	user.Surname = strings.TrimSpace(input.Surname)

	if strings.ContainsAny(user.Username, "<>\"';&") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input of username"})
		return
	}

	if len(user.Username) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username too short"})
		return
	}

	if !latinRegex.MatchString(user.Username) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username must be latin only"})
		return
	}

	if len(user.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password too short"})
		return
	}

	if !latinRegex.MatchString(user.Password) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be latin only"})
		return
	}

	if user.Name != "" && !cyrillicRegex.MatchString(user.Name) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name must be cyrillic"})
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
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		log.Error().Err(err).Msg("Failed to create user")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания пользователя"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		log.Error().Err(err).Msg("Commit failed for registeration")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}

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

	secure := false                  // true для продакшена
	sameSite := http.SameSiteLaxMode // http.SameSiteNoneMode для продакшена

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "auth_token",
		Value:    tokenString,
		Path:     "/",
		Domain:   "", // текущий домен
		MaxAge:   3600 * 24,
		Secure:   secure,
		HttpOnly: true,
		SameSite: sameSite,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Registered successfuly"})

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

	if len(input.Username) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username too short"})
		return
	}

	if len(input.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password too short"})
		return
	}

	if !latinRegex.MatchString(input.Username) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username must be latin"})
		return
	}

	if !latinRegex.MatchString(input.Password) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be latin"})
		return
	}

	if input.Name != "" && !cyrillicRegex.MatchString(input.Name) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name must be cyrillic"})
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
		Surname:     input.Surname,
	}

	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		log.Error().Err(err).Msg("Failed to create user")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error to create user"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		log.Error().Err(err).Msg("Commit failed for register by owner")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}

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
		Surname:     user.Surname,
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

	secure := false                  // true для продакшена
	sameSite := http.SameSiteLaxMode // http.SameSiteNoneMode для продакшена

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "auth_token",
		Value:    tokenString,
		Path:     "/",
		Domain:   "", // текущий домен
		MaxAge:   3600 * 24,
		Secure:   secure, // ОБЯЗАТЕЛЬНО при SameSite=None
		HttpOnly: true,
		SameSite: sameSite,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Успешный вход"})
}

func Logout(c *gin.Context) {
	secure := false
	sameSite := http.SameSiteLaxMode
	//secure, sameSite := cookieConfig()

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "auth_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Вы вышли"})
}

func GetCurrentUser(c *gin.Context) {
	// Предполагаем, что у тебя есть middleware, который парсит JWT из куки
	claims, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Не авторизован"})
		return
	}

	userClaims := claims.(*models.Claims)

	c.JSON(http.StatusOK, gin.H{
		"username":     userClaims.Username,
		"role":         userClaims.Role,
		"phone_number": userClaims.PhoneNumber,
		"name":         userClaims.Name,
		"surname":      userClaims.Surname,
	})
}

/* Для определния среды : разработка или прод. Оставил на всякий
func cookieConfig() (bool, http.SameSite) {
	if os.Getenv("ENV") == "tunnel" || os.Getenv("ENV") == "prod" {
		return true, http.SameSiteNoneMode
	}
	return false, http.SameSiteLaxMode
}
*/
