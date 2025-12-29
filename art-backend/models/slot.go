package models

import (
	"time"

	"gorm.io/gorm"
)

type ActivitySlot struct {
	gorm.Model
	ActivityID uint      `json:"activity_id" gorm:"index;not null"`
	StartTime  time.Time `json:"start_time" gorm:"not null"`
	EndTime    time.Time `json:"end_time"`
	Capacity   int       `json:"capacity" gorm:"not null"`
	Booked     int       `json:"booked" gorm:"not null;default:0"`
	TemplateID *uint     `json:"template_id" gorm:"index"`
	Source     string    `json:"source" gorm:"type:varchar(20);not null;default:'template'"`
}

type SlotInputGenerate struct {
	DayOfWeek int    `json:"day_of_week" binding:"required"`
	StartTime string `json:"start_time" binding:"required"`
	Capacity  int    `json:"capacity"`
}

type SlotInput struct {
	StartTimeStr string `json:"start_time" binding:"required"`
	Capacity     int    `json:"capacity" binding:"required,min=1"`
}
