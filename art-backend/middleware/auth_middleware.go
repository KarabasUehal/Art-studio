package middleware

import (
	"art/models"
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/rs/zerolog/log"
)

var JwtKey = []byte(os.Getenv("JWT_SECRET"))

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {

		// Взятие токена из cookie
		tokenString, err := c.Cookie("auth_token")
		if err != nil {
			log.Error().Err(err).Msg("Error to get token")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		// Парсинг JWT
		token, err := jwt.ParseWithClaims(
			tokenString,
			&models.Claims{},
			func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					log.Error().Msg("Unexpected signing method")
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return JwtKey, nil
			},
		)

		if err != nil || !token.Valid {
			log.Error().Err(err).Msg("Token is not allow")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(*models.Claims)
		if !ok {
			log.Error().Msg("Invalid claims")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid claims"})
			c.Abort()
			return
		}

		c.Set("phone_number", claims.PhoneNumber)
		c.Set("claims", claims)
		c.Set("role", claims.Role)

		c.Next()
	}
}

func OwnerOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString("role")
		if role != "owner" {
			log.Error().Msg("Access denied: owner only")
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied: owner only"})
			c.Abort()
			return
		}
		c.Next()
	}
}
