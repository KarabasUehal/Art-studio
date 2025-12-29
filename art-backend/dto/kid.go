package dto

import "art/models"

type KidRequest struct {
	Name   string `json:"name" binding:"required"`
	Age    int    `json:"age" binding:"required,min=3"`
	Gender string `json:"gender" binding:"required,oneof=male female"`
}

type KidResponse struct {
	ID     uint   `json:"id"`
	Name   string `json:"name"`
	Age    int    `json:"age"`
	Gender string `json:"gender"`
}

func KidToResponse(k models.UserKid) KidResponse {
	return KidResponse{
		ID:     k.ID,
		Name:   k.Name,
		Age:    k.Age,
		Gender: k.Gender,
	}
}
