package database

import (
	"art/models"
	"fmt"
	"os"

	"github.com/rs/zerolog/log"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Функция для вставки начальных данных о штормах
func ActivityInsertData(db *gorm.DB) error {
	if db == nil {
		return fmt.Errorf("db is nil")
	}

	var count_activities int64
	var err error

	err = GORMDB.Model(&models.Activity{}).Count(&count_activities).Error // Проверка количества записей о штормах в БД
	if err != nil {
		log.Error().Err(err).Str("component", "postgres").Msg("[error] Failed to count activity table")
		return fmt.Errorf("failed to count activity table: %w", err)
	}

	if count_activities == 0 { // Если в БД нет записей, добавляются данные по ураганам

		log.Info().Msg("No data in activity table, starting to insert")

		insertData := `
            INSERT INTO activities (name, description, price, available_slots, duration, availability, is_regular, images)
            VALUES 
    ('Ліпка', 
	  'Майстер-клас з ліплення, на якому дитина ознайомиться з простим та повітряним пластеліном, та виготовить свої фігурки',
	  300, 15, 60, true, true, 
	  '{"main_image_url": "https://i.postimg.cc/5y0Qyvng/Lipka.jpg", "caption": "Ліпимо з пластиліну", "photo": []}'::jsonb),
    ('Живопис 5+', 
      'Майстер-клас з живопису, де дитина навчиться поводитися з гуашшю, акрилом та аквареллю', 
      300, 15, 90, true, true,
      '{"main_image_url": "https://i.postimg.cc/x8CN8Htv/Jivopis5.jpg", "caption": "Освоюємо живопис", "photo": []}'::jsonb),
    ('Живопис + Розвиток', 
      'Майстер-клас з живопису відразом з розвитком дитини', 
      350, 15, 50, true, true,
      '{"main_image_url": "https://i.postimg.cc/T1w51mCq/Jivopis_Rozvitok.jpg", "caption": "Живопис + Розвиток", "photo": []}'::jsonb),
    ('Fashion ілюстрація', 
	  'Майстер клас з модної ілюстрації', 
	  300, 10, 75, true, true,
	  '{"main_image_url": "https://i.postimg.cc/fL50M5jX/Fashion_illustration.jpg", "caption": "Живопис + Розвиток", "photo": []}'::jsonb),
    ('В''язання', 
	  'Майстер-клас з в''язання, де дитина навчиться поводитися з пряжею', 
	  300, 10, 60, true, true,
	  '{"main_image_url": "https://i.postimg.cc/TwcnpTxz/Vyazanie.jpg", "caption": "Живопис + Розвиток", "photo": []}'::jsonb),
    ('Акторська майстерність', 
	  'Майстер-клас з акторської майстерності, на якому дитина вивчиться грати ролі та вживатись у персонажів', 
	  300, 8, 55, true, true,
	  '{"main_image_url": "https://i.postimg.cc/W3SJsS6D/Actor.jpg", "caption": "Живопис + Розвиток", "photo": []}'::jsonb),
    ('STEM', 
	  'Навчання дитини природним і точним наукам', 
	  400, 20, 60, true, true,
	  '{"main_image_url": "https://i.postimg.cc/0jQKjmc4/STEM.jpg", "caption": "Живопис + Розвиток", "photo": []}'::jsonb),
    ('Англійська мова', 
	  'Навчання дитини англійською мовою, практика англійської', 
	  300, 12, 60, true, true,
	  '{"main_image_url": "https://i.postimg.cc/Y98mt8fN/English.jpg", "caption": "Живопис + Розвиток", "photo": []}'::jsonb),
    ('Шахи', 
	  'Навчання дитини грі в шахи та стратегічному мисленню', 
	  300, 12, 60, true, true,
	  '{"main_image_url": "https://i.postimg.cc/1XtVX6JJ/Shahi.jpg", "caption": "Живопис + Розвиток", "photo": []}'::jsonb),
    ('Вiльнi ранки', 
	  'За дитиною доглядатимуть весь ранок і не дадуть скучити', 
	  500, 15, 240, true, true,
	  '{"main_image_url": "https://i.postimg.cc/bNFjfjLS/Freemorning.jpg", "caption": "Вiльнi ранки", "photo": []}'::jsonb)
        ON CONFLICT (name) DO NOTHING;
        `
		_, err = DB.Exec(insertData)
		if err != nil {
			log.Error().Err(err).Str("component", "postgres").Msg("Error to insert data into activity")
			return fmt.Errorf("failed to insert into activity: %w", err)
		}

		log.Info().Msg("Activity data successfully inserted")
	}

	var count_slots int64
	err = GORMDB.Model(&models.ActivitySlot{}).Count(&count_slots).Error // Проверка количества записей об изображениях в БД
	if err != nil {
		log.Error().Err(err).Str("component", "postgres").Msg("Failed to count activity slots")
		return fmt.Errorf("failed to count activity_slots: %w", err)
	}

	if count_slots == 0 {

		log.Info().Msg("No data in activity_slots table, starting to insert")

		insertSlots := `
		INSERT INTO activity_slots (activity_id, start_time, end_time, capacity, booked) VALUES
		(1, '2025-11-29 17:00:00', '2025-11-29 18:00:00', 15, 0),
		(1, '2025-11-30 17:00:00', '2025-11-29 18:00:00', 15, 0),
		(2, '2025-11-29 16:00:00', '2025-11-29 17:00:00', 15, 0),
		(2, '2025-11-30 16:00:00', '2025-11-29 17:00:00', 15, 0),
		(3, '2025-11-29 18:00:00', '2025-11-29 19:00:00', 15, 0),
		(4, '2025-11-30 17:30:00', '2025-11-29 18:30:00', 10, 0),
		(5, '2025-11-29 15:00:00', '2025-11-29 16:00:00', 10, 0)
		ON CONFLICT (activity_id, start_time) WHERE deleted_at IS NULL DO NOTHING;
	`
		_, err = DB.Exec(insertSlots)
		if err != nil {
			log.Error().Err(err).Str("component", "postgres").Msg("Error to insert data into activity_slots")
			return fmt.Errorf("failed to insert data into activity_slots: %w", err)
		}
	}

	log.Info().Msg("Activity slots successfully inserted")

	if err := SeedUsers(); err != nil {
		log.Fatal().Err(err).Msg("Failed to insert users")
		return fmt.Errorf("failed to insert data into users: %w", err)
	}
	return nil
}

func SeedUsers() error {
	var count int64

	if err := GORMDB.Model(&models.User{}).Count(&count).Error; err != nil {
		log.Error().Err(err).Str("component", "postgres").Msg("Failed to count users")
		return fmt.Errorf("failed to count users: %w", err)
	}

	if count == 0 {
		log.Info().Msg("No users found, inserting default owners")

		pass1 := os.Getenv("PASSWORD1")
		pass2 := os.Getenv("PASSWORD2")

		if pass1 == "" || pass2 == "" {
			log.Error().Msg("Password env is not set")
			return fmt.Errorf("password is not set in env")
		}

		// Хэшируем пароли
		hash1, _ := bcrypt.GenerateFromPassword([]byte(pass1), 14)
		hash2, _ := bcrypt.GenerateFromPassword([]byte(pass2), 14)

		users := []models.User{
			{
				Username:    "Marina",
				Password:    string(hash1),
				PhoneNumber: "+380962551728",
				Role:        "owner",
				Name:        "Marina",
				Surname:     "Didushko",
			},
			{
				Username:    "Irina",
				Password:    string(hash2),
				PhoneNumber: "+380972551728",
				Role:        "owner",
				Name:        "Irina",
				Surname:     "Boblo",
			},
		}

		if err := GORMDB.Create(&users).Error; err != nil {
			log.Error().Err(err).Str("component", "postgres").Msg("Error inserting default users")
			return fmt.Errorf("failed to insert default users: %w", err)
		}

		log.Info().Msg("✅ Default users successfully inserted")
	}

	return nil
}
