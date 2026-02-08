package database

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/rs/zerolog/log"
	postgres_gorm "gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var GORMDB *gorm.DB
var DB *sql.DB

func InitDB() error {
	user := os.Getenv("DB_USER") // Получение переменных окружения
	password := os.Getenv("DB_PASSWORD")
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	dbname := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable TimeZone=UTC", // Строка подключения
		host, port, user, password, dbname)

	var err error
	GORMDB, err = gorm.Open(postgres_gorm.New(postgres_gorm.Config{
		DSN: dsn,
	}), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
		Logger:                                   logger.Default.LogMode(logger.Info), // Настройка логов
	})
	if err != nil {
		log.Error().Err(err).Str("component", "postgres").Msg("Failed to connect to postgres")
		return fmt.Errorf("failed to connect to postgres: %w", err)
	}

	DB, err = GORMDB.DB()
	if err != nil {
		log.Error().Err(err).Str("component", "postgres").Msg("Error getting postgres db from gorm db")
		return fmt.Errorf("failed to get postgres db from gorm db: %w", err)
	}
	DB.SetMaxIdleConns(10) // Настройка pool'a
	DB.SetMaxOpenConns(100)

	if err = DB.Ping(); err != nil {
		log.Error().Err(err).Str("component", "postgres").Msg("postgres ping failed") // Проверка соединения
		return fmt.Errorf("failed to ping postgres: %w", err)
	}

	log.Info().Str("component", "postgres").Msg("Successfully connected to postgres")

	sourceInstance, err := iofs.New(migrationsFS, "migrations") // Source instance для embedded (iofs)
	if err != nil {
		log.Error().Err(err).Str("component", "postgres").Msg("Error creating iofs source")
		return fmt.Errorf("failed to create iofs source: %w", err)
	}
	defer sourceInstance.Close()

	dbInstance, err := postgres.WithInstance(DB, &postgres.Config{
		DatabaseName: dbname,
		SchemaName:   "public",
	}) // Database instance для postgres
	if err != nil {
		log.Error().Err(err).Str("component", "postgres").Msg("Error creating postgres instance")
		return fmt.Errorf("failed to create postgres instance: %w", err)
	}

	m, err := migrate.NewWithInstance(
		"iofs", // source driver name
		sourceInstance,
		"postgres", // db driver name
		dbInstance,
	)
	if err != nil {
		log.Error().Err(err).Str("component", "postgres").Msg("Error initializing migrate")
		return fmt.Errorf("failed to init migrate: %w", err)
	}

	entries, err := migrationsFS.ReadDir("migrations") // Проверка загрузки миграций
	if err != nil {
		log.Error().Err(err).Str("component", "postgres").Msg("Cannot read migrations dir")
		return fmt.Errorf("cannot read migrations dir: %w", err)
	}
	log.Info().Str("component", "postgres").Int("files_count", len(entries)).Msg("Migrations files loaded")

	for _, entry := range entries {
		log.Info().Str("component", "postgres").Str("file", entry.Name()).Msg("Found migration file")
	}

	if err = m.Up(); err != nil && err != migrate.ErrNoChange { // Загрузка миграций с суффиксом "up"
		log.Error().Err(err).Str("component", "postgres").Msg("Error migrating up")
		return fmt.Errorf("failed to migrate up: %w", err)
	}
	if err == migrate.ErrNoChange {
		log.Info().Str("component", "postgres").Msg("No migrations to apply (DB up-to-date)")
	} else {
		log.Info().Str("component", "postgres").Msg("Migrations applied successfully")
	}

	version, dirty, err := m.Version() // Проверка версии миграций
	switch err {
	case nil:
		log.Info().Str("component", "postgres").Msgf("Current migration version: %d, dirty: %t", version, dirty)
	case migrate.ErrNoChange:
		log.Info().Str("component", "postgres").Msg("No migration version (fresh DB)")
	default:
		log.Warn().Str("component", "postgres").Err(err).Msg("Could not get migration version")
	}

	if err := ActivityInsertData(GORMDB); err != nil {
		log.Error().Err(err).Msg("Error inserting data")
		return fmt.Errorf("failed to insert data %w", err)
	}
	log.Info().Str("component", "postgres").Msg("Database initialized and seeded")

	return nil
}

func GetGormDB() *gorm.DB {
	return GORMDB
}

// Получение глобальной переменной DB
func GetDB() (*sql.DB, error) {
	if DB != nil {
		return DB, nil
	}
	return nil, fmt.Errorf("db is nil")
}

// Закрытие соединения с базой данных
func ClosePostgreSQL() error {
	if DB == nil { // Проверка, существует ли соединение с БД
		log.Info().Msg("No database connection to close")
		return nil
	}

	if err := DB.Close(); err != nil { // Закрытие соединения с БД
		log.Error().Err(err).Msg("Failed to close database connection")
		return fmt.Errorf("failed to close database connection: %w", err)
	}

	log.Info().Msg("Database connection closed")
	DB = nil // Очистка глобальных переменных после закрытия
	GORMDB = nil
	return nil
}
