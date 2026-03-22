package domain

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleApplicant UserRole = "applicant"
	RoleEmployer  UserRole = "employer"
	RoleAdmin     UserRole = "admin"
)

type User struct {
	ID           uuid.UUID
	Email        string
	DisplayName  string
	Role         UserRole
	PasswordHash string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type RegisterInput struct {
	Email       string
	Password    string
	DisplayName string
	Role        UserRole
}
