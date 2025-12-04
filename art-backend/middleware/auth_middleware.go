package middleware

import (
	"art/models"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/rs/zerolog/log"
)

var JwtKey = []byte(os.Getenv("JWT_SECRET"))

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization token abscent"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if len(tokenString) > 1000 { // Ограничиваем, чтобы не проверять слишком длинные токены
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Too long token"})
			c.Abort()
			return
		}

		token, err := jwt.ParseWithClaims(tokenString, &models.Claims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				log.Error().Msg("Unexpected signing method")
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return JwtKey, nil
		})

		if err != nil || !token.Valid {
			log.Error().Err(err).Msg("Token is not allow")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Wrong token"})
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
		c.Set("role", claims.Role)
		c.Set("name", claims.Name)
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
