package models

import "time"

type ScheduleTemplate struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	ActivityID uint       `json:"activity_id" gorm:"index"`
	DayOfWeek  int        `json:"day_of_week" gorm:"not null"`
	StartTime  string     `json:"start_time" gorm:"type:VARCHAR(5);not null"`
	Capacity   int        `json:"capacity" gorm:"not null;default:10"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	DeletedAt  *time.Time `gorm:"index"`
}
