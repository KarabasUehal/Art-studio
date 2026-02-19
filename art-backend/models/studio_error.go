package models

import "gorm.io/gorm"

type StudioError struct {
	gorm.Model
	ID             uint   `json:"id" gorm:"primaryKey;autoIncrement"`
	SubscriptionId uint   `json:"subscription_id" gorm:"index; not null"`
	SlotId         uint   `json:"slot_id" gorm:"index; not null"`
	Info           string `json:"info" gorm:"type:varchar(1000);not null"`
}
