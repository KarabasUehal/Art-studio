package models

import (
	"time"

	"gorm.io/gorm"
)

type Subscription struct {
	gorm.Model
	UserID uint `json:"user_id" gorm:"not null;index"`

	StartDate   time.Time `json:"start_date" gorm:"not null"`
	EndDate     time.Time `json:"end_date" gorm:"not null"`
	VisitsTotal int       `json:"visits_total" gorm:"not null"`
	VisitsUsed  int       `json:"visits_used" gorm:"not null;default:0"`
	IsActive    bool      `json:"is_active" gorm:"not null;default:true"`
}

type SubscriptionType struct {
	gorm.Model
	ID           uint   `json:"id" gorm:"primaryKey"`
	Name         string `json:"name" gorm:"not null"`
	Price        uint   `json:"user_id" gorm:"not null"`
	VisitsCount  int    `json:"visits_count" gorm:"not null;default:0"`
	DurationDays int    `json:"duration_days" gorm:"not null"`
}
