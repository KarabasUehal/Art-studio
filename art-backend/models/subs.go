package models

import (
	"time"

	"gorm.io/gorm"
)

type Subscription struct {
	gorm.Model
	UserID  uint     `json:"user_id" gorm:"not null;index"`
	User    User     `json:"-" gorm:"foreignKey:UserID"`
	SubKids []SubKid `json:"sub_kids" gorm:"many2many:subscription_kids;"`

	SubscriptionTypeID uint             `json:"subscription_type_id" gorm:"not null"`
	SubscriptionType   SubscriptionType `json:"subscription_type" gorm:"foreignKey:SubscriptionTypeID"`

	StartDate time.Time `json:"start_date" gorm:"not null"`
	EndDate   time.Time `json:"end_date" gorm:"not null"`

	VisitsTotal int `json:"visits_total" gorm:"not null"`
	VisitsUsed  int `json:"visits_used" gorm:"not null;default:0"`

	PricePaid uint `json:"price_paid" gorm:"not null"`
	IsActive  bool `json:"is_active" gorm:"default:true"`
}

type SubscriptionType struct {
	gorm.Model
	Name         string   `json:"name" gorm:"type:varchar(100);unique;not null"`
	ActivityID   uint     `json:"activity_id" gorm:"not null;index"`
	Activity     Activity `json:"activity" gorm:"foreignKey:ActivityID"`
	Price        uint     `json:"price" gorm:"not null"`
	VisitsCount  int      `json:"visits_count" gorm:"not null"`
	DurationDays int      `json:"duration_days" gorm:"not null"`
	IsActive     bool     `json:"is_active" gorm:"default:true"`
}

type SubKid struct {
	gorm.Model
	Name   string `json:"name" gorm:"not null"`
	Age    int    `json:"age" gorm:"not null"`
	Gender string `json:"gender" gorm:"not null"`

	Subscriptions []Subscription `json:"-" gorm:"many2many:subscription_kids;"`
}
