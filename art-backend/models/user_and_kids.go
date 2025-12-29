package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	ID          uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	Username    string    `json:"username" gorm:"type:varchar(50);unique;not null;size:50"`
	Password    string    `json:"-" gorm:"type:varchar(255);not null"`
	PhoneNumber string    `json:"phone_number" gorm:"type:varchar(15);unique;not null;size:15"`
	Role        string    `json:"role" gorm:"type:varchar(20);not null;default:'client';size:20"`
	Name        string    `json:"name" gorm:"type:varchar(100);size:100"`
	UserKids    []UserKid `json:"user_kids" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE;"`
}

type UserKid struct {
	gorm.Model
	Name   string `json:"name" gorm:"type:varchar(100);size:100"`
	Age    int    `json:"age" gorm:"not null"`
	Gender string `json:"gender" gorm:"type:varchar(20);not null"`

	ParentName string `json:"parent_name" gorm:"type:varchar(100);size:100"`
	UserID     uint   `json:"user_id"  gorm:"not null;index"`
}
