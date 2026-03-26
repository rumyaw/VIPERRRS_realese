package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"tramplin/internal/auth"
	"tramplin/internal/domain"
	"tramplin/internal/repository"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailTaken         = errors.New("email already registered")
	ErrInvalidRole        = errors.New("invalid role for registration")
)

type AuthService struct {
	users *repository.UserRepository
	jwt   string
}

func NewAuthService(users *repository.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{users: users, jwt: jwtSecret}
}

func (s *AuthService) Register(ctx context.Context, in domain.RegisterInput) (*domain.User, string, error) {
	in.Email = strings.TrimSpace(strings.ToLower(in.Email))
	in.DisplayName = strings.TrimSpace(in.DisplayName)
	if in.Email == "" || len(in.Password) < 8 {
		return nil, "", fmt.Errorf("validation: email and password (min 8)")
	}
	if in.Role != domain.RoleApplicant && in.Role != domain.RoleEmployer {
		return nil, "", ErrInvalidRole
	}
	taken, err := s.users.EmailExists(ctx, in.Email)
	if err != nil {
		return nil, "", err
	}
	if taken {
		return nil, "", ErrEmailTaken
	}
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		return nil, "", err
	}
	u := &domain.User{
		Email:        in.Email,
		PasswordHash: hash,
		DisplayName:  in.DisplayName,
		Role:         in.Role,
	}
	if err := s.users.Create(ctx, u); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, "", ErrEmailTaken
		}
		return nil, "", err
	}
	if in.Role == domain.RoleApplicant {
		if err := s.users.CreateApplicantProfile(ctx, u.ID); err != nil {
			return nil, "", err
		}
	} else {
		if err := s.users.CreateEmployerProfile(ctx, u.ID); err != nil {
			return nil, "", err
		}
	}
	token, err := auth.SignAccessToken(s.jwt, u.ID, u.Email, u.Role)
	if err != nil {
		return nil, "", err
	}
	u.PasswordHash = ""
	return u, token, nil
}

func (s *AuthService) IssueRefreshToken(u *domain.User) (string, error) {
	return auth.SignRefreshToken(s.jwt, u.ID, u.Email, u.Role)
}

func (s *AuthService) JWTSecret() string {
	return s.jwt
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*domain.User, string, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	u, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		return nil, "", err
	}
	if u == nil || !auth.CheckPassword(u.PasswordHash, password) {
		return nil, "", ErrInvalidCredentials
	}
	token, err := auth.SignAccessToken(s.jwt, u.ID, u.Email, u.Role)
	if err != nil {
		return nil, "", err
	}
	u.PasswordHash = ""
	return u, token, nil
}

func (s *AuthService) Me(ctx context.Context, userID string) (*domain.User, error) {
	id, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}
	u, err := s.users.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, fmt.Errorf("user not found")
	}
	u.PasswordHash = ""
	return u, nil
}
