package models

import "time"

type ScheduleTemplate struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	ActivityID uint       `json:"activity_id" gorm:"not null;uniqueIndex:uniq_template"`
	DayOfWeek  int        `json:"day_of_week" gorm:"not null;uniqueIndex:uniq_template"`
	StartTime  string     `json:"start_time" gorm:"type:VARCHAR(5);not null;uniqueIndex:uniq_template"`
	Capacity   int        `json:"capacity" gorm:"not null;default:10"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	DeletedAt  *time.Time `gorm:"index"`
}
