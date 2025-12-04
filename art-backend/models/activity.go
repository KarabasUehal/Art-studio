package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

type Activity struct {
	ID             uint           `json:"id" gorm:"primaryKey"`
	Name           string         `json:"name" gorm:"not null;unique;size:100"`
	Description    string         `json:"description" gorm:"not null;type:text"`
	Images         ActivityImage  `json:"images" gorm:"foreignKey:ActivityID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Price          uint           `json:"price" gorm:"type:integer;not null"`
	Duration       uint           `json:"duration" gorm:"type:integer;not null"`
	AvailableSlots int            `json:"available_slots" gorm:"not null"`
	Slots          []ActivitySlot `json:"slots" gorm:"foreignKey:ActivityID;constraint:OnDelete:CASCADE;"`
	Availability   bool           `json:"availability" gorm:"not null;default:true"`
	IsRegular      bool           `json:"is_regular" gorm:"column:is_regular;not null;default:false"`

	CreatedAt time.Time  `json:"-"`
	UpdatedAt time.Time  `json:"-"`
	DeletedAt *time.Time `json:"-" gorm:"index"`
}

type ActivityImage struct {
	ID           uint     `json:"id" gorm:"primaryKey;autoIncrement"`
	MainImageURL string   `json:"main_image_url" gorm:"not null;size:1000"`
	Photo        []string `json:"photo" gorm:"type:json"`
	Caption      string   `json:"caption" gorm:"size:255"`
	ActivityID   uint     `json:"-" gorm:"index"`

	CreatedAt time.Time  `json:"-"`
	UpdatedAt time.Time  `json:"-"`
	DeletedAt *time.Time `json:"-" gorm:"index"`
}

func (a ActivityImage) Value() (driver.Value, error) {
	return json.Marshal(a)
}

// Реализация sql.Scanner (для чтения)
func (a *ActivityImage) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("failed to scan an ActivityImage: %v", value)
	}
	return json.Unmarshal(bytes, a)
}
