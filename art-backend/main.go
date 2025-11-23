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
)

func main() {

	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr}) // Настройка глобального логгера на стандартный поток ошибок

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
		AllowOrigins:     []string{"http://localhost:8080", "http://localhost"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	router.POST("/register", handlers.Register)
	router.POST("/login", handlers.Login)

	router.GET("/activities", handlers.GetActivities())
	router.GET("/activities/:id", handlers.GetActivityByID())

	router.GET("/activity/:activity_id/slots", handlers.GetActivitySlots())

	// Защищённые роуты с JWT
	api := router.Group("/")
	api.Use(middleware.AuthMiddleware())

	api.POST("/activities", handlers.AddActivity())
	api.PUT("/activities/:id", handlers.UpdateActivity())
	api.DELETE("/activities/:id", handlers.DeleteActivity())

	api.GET("/records", handlers.GetAllRecords())
	api.GET("/records/:id", handlers.GetRecordByID())
	api.DELETE("/records/:id", handlers.DeleteRecordByID())

	api.GET("/activity/:activity_id/slots/:slot_id", handlers.GetSlotByID())
	api.POST("/activity/:activity_id/slots", handlers.AddSlot())
	api.PUT("/activity/:activity_id/slots/:slot_id", handlers.UpdateSlot())
	api.DELETE("/activity/:activity_id/slots/:slot_id", handlers.DeleteSlot())

	api.POST("/admin/register", middleware.OwnerOnly(), handlers.RegisterByOwner)

	api.GET("/client/records", handlers.GetMyRecords())
	api.POST("/record", handlers.MakeRecord())

	go func() { // Запуск HTTP-сервера в горутине с использованием corsMiddleware для CORS и gwMux для маршрутизации REST-запросов
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
