package main

import (
	"art/database"
	"art/handlers"
	"art/middleware"
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

var JwtK = []byte(os.Getenv("JWT_SECRET"))

func main() {

	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr}) // Настройка глобального логгера на стандартный поток ошибок

	log.Info().Msgf("JWT_SECRET length: %d", len(JwtK))

	if err := database.InitDB(); err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize PostgreSQL")
	}

	if err := database.InitRedis(); err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize Redis")
	}

	redisClient, err := database.GetRedis() // Получение клиента Redis
	if err != nil {
		log.Fatal().Err(err).Msg("Redis not initialized")
	}

	router := gin.Default()

	rest_port := os.Getenv("REST_PORT")

	httpServer := &http.Server{
		Addr:         ":" + rest_port,
		Handler:      router,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost",
			"http://localhost:3000",
			"http://localhost:8080",
			"http://127.0.0.1:3000",
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	router.Use(gin.Logger())
	router.Use(middleware.Recovery())

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	router.GET("/health", func(c *gin.Context) {
		c.String(200, "OK")
	})

	router.POST("/login", handlers.Login)
	router.POST("/register", handlers.Register)
	router.POST("/logout", handlers.Logout)

	router.GET("/me", middleware.AuthMiddleware(), handlers.GetCurrentUser)

	router.GET("/activities/:id", handlers.GetActivityByID())
	router.GET("/activities", handlers.GetActivities())

	router.GET("/activity/:activity_id/slots", handlers.GetActivitySlots())

	router.GET("/subscriptions/types", handlers.GetAllSubTypes())
	router.GET("/subscriptions/types/:id", handlers.GetSubTypeByID())

	// Защищённые роуты с JWT
	api := router.Group("/")
	api.Use(middleware.AuthMiddleware())

	api.GET("/admin/users", middleware.OwnerOnly(), handlers.GetAllUsers())

	api.POST("/activities", middleware.OwnerOnly(), handlers.AddActivity())
	api.PUT("/activities/:id", middleware.OwnerOnly(), handlers.UpdateActivity())
	api.DELETE("/activities/:id", middleware.OwnerOnly(), handlers.DeleteActivity())

	api.GET("/records/:id", handlers.GetRecordByID())
	api.GET("/records", handlers.GetAllRecords())
	api.DELETE("/records/:id", middleware.OwnerOnly(), handlers.DeleteRecordByID())

	api.POST("/subscriptions/types", middleware.OwnerOnly(), handlers.AddSubType())
	api.PUT("/subscriptions/types/:id", middleware.OwnerOnly(), handlers.UpdateSubType())
	api.DELETE("/subscriptions/types/:id", middleware.OwnerOnly(), handlers.DeleteSubType())

	api.GET("/subscriptions/:id", handlers.GetSubscriptionByID())
	api.GET("/subscriptions", handlers.GetAllSubscriptions())
	api.POST("/subscriptions", middleware.OwnerOnly(), handlers.AddSubscription())
	api.PUT("/subscriptions/:id", middleware.OwnerOnly(), handlers.UpdateSubscription())
	api.DELETE("/subscriptions/:id", middleware.OwnerOnly(), handlers.DeleteSubscription())
	api.PATCH("/subscriptions/:id/extend", middleware.OwnerOnly(), handlers.ExtendSubscription())

	api.GET("/templates/by-activity/:act_id", handlers.GetTemplatesByActID())
	api.GET("/templates/:id", handlers.GetTemplateByID())
	api.GET("/templates", handlers.GetAllTemplates())
	api.POST("/templates/by-activity/:act_id", middleware.OwnerOnly(), handlers.AddTemplate())

	api.PUT("/templates/:id", middleware.OwnerOnly(), handlers.UpdateTemplate())
	api.DELETE("/templates/:id", middleware.OwnerOnly(), handlers.DeleteTemplate())

	api.POST("/schedule/extend", middleware.OwnerOnly(), handlers.ExtendSchedule()) // Для продления расписания на неделю

	api.GET("/activity/:activity_id/slots/:slot_id", handlers.GetSlotByID())
	api.POST("/activity/:activity_id/slots", middleware.OwnerOnly(), handlers.AddSlot())
	api.PUT("/activity/:activity_id/slots/:slot_id", middleware.OwnerOnly(), handlers.UpdateSlot())
	api.DELETE("/activity/:activity_id/slots/:slot_id", middleware.OwnerOnly(), handlers.DeleteSlot())

	api.POST("/admin/register", middleware.OwnerOnly(), handlers.RegisterByOwner)

	api.GET("/client/records", handlers.GetMyRecords())
	api.POST("/record", handlers.MakeRecord())

	api.GET("/client/kids/:id", handlers.GetKidByID())
	api.GET("/client/kids", handlers.GetMyKids())
	api.GET("/admin/kids", handlers.GetAllKids())
	api.POST("/client/kids", handlers.AddKid())
	api.PUT("/client/kids/:id", handlers.UpdateKid())
	api.DELETE("/client/kids/:id", handlers.DeleteKid())

	go func() { // Запуск HTTP-сервера в горутине с использованием corsMiddleware для CORS
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Failed to serve REST")
		}
		log.Info().Msgf("REST server running on :%s", rest_port)
	}()

	// Graceful shutdown
	sigChan := make(chan os.Signal, 1) // Создание канала для получения сигналов двух видов сигналов - от os и от Docker
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan
	log.Info().Msg("Received shutdown signal. Initiating graceful shutdown...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second) // Graceful shutdown HTTP-сервера
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("Failed to shutdown HTTP server gracefully")
	} else {
		log.Info().Msg("HTTP server stopped")
	}

	if err := redisClient.Close(); err != nil { // Закрытие соединения с Redis
		log.Error().Err(err).Msg("Failed to close Redis connection")
	} else {
		log.Info().Msg("Redis connection closed")
	}

	if err := database.ClosePostgreSQL(); err != nil { // Закрытие соединения с базой данных
		log.Error().Err(err).Msg("Failed to close database connection")
	} else {
		log.Info().Msg("Database connection closed")
	}

	log.Info().Msg("Server shutdown complete")
}
