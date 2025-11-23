package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type RecordDetail struct {
	gorm.Model
	ActivityID   uint      `json:"activity_id"`
	ActivityName string    `json:"activity_name"`
	NumberOfKids uint      `json:"number_of_kids"`
	Kids         []Kid     `json:"kids"`
	Date         time.Time `json:"date"`
	SlotID       uint      `json:"slot_id"`
}

type Record struct {
	gorm.Model
	UserID      uint          `json:"user_id" gorm:"not null;index"`
	Details     RecordDetails `json:"items" gorm:"type:jsonb;not null"`
	PhoneNumber string        `json:"phone_number" gorm:"type:varchar(15);not null"`
	ParentName  string        `json:"parent_name" gorm:"type:text"`
	TotalPrice  uint          `json:"total_price" gorm:"type:real;not null"`
}

type RecordDetails []RecordDetail

type Kid struct {
	Name   string `json:"name"`
	Age    int    `json:"age"`
	Gender string `json:"gender"`
}

type RecordRequest struct {
	Items []struct {
		ActivityID   uint  `json:"activity_id" binding:"required"`
		NumberOfKids uint  `json:"number_of_kids" binding:"required,gte=1"`
		Kids         []Kid `json:"kids" binding:"required,dive"`
		SlotID       uint  `json:"slot_id" binding:"required"`
	} `json:"items" binding:"required,dive"`
}

type RecordResponse struct {
	ID          uint          `json:"id"`
	CreatedAt   time.Time     `json:"created_at"`
	Details     RecordDetails `json:"items"`
	PhoneNumber string        `json:"phone_number"`
	ParentName  string        `json:"parent_name"`
	TotalPrice  uint          `json:"total_price"`
}

func ToRecordResponse(record Record) RecordResponse {

	return RecordResponse{
		ID:          record.ID,
		CreatedAt:   record.CreatedAt,
		Details:     record.Details,
		TotalPrice:  record.TotalPrice,
		PhoneNumber: record.PhoneNumber,
		ParentName:  record.ParentName,
	}
}

// Реализация driver.Valuer (для записи)
func (r RecordDetails) Value() (driver.Value, error) {
	return json.Marshal(r)
}

// Реализация sql.Scanner (для чтения)
func (r *RecordDetails) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("failed to scan RecordDetails: %v", value)
	}
	return json.Unmarshal(bytes, r)
}
