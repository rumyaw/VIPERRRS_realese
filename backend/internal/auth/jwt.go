package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"tramplin/internal/domain"
)

type Claims struct {
	Email string          `json:"email"`
	Role  domain.UserRole `json:"role"`
	Type  string          `json:"type"`
	jwt.RegisteredClaims
}

func SignAccessToken(secret string, userID uuid.UUID, email string, role domain.UserRole) (string, error) {
	if len(secret) < 32 {
		return "", fmt.Errorf("jwt secret too short")
	}
	now := time.Now()
	claims := Claims{
		Email: email,
		Role:  role,
		Type:  "access",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(20 * time.Minute)),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(secret))
}

func SignRefreshToken(secret string, userID uuid.UUID, email string, role domain.UserRole) (string, error) {
	if len(secret) < 32 {
		return "", fmt.Errorf("jwt secret too short")
	}
	now := time.Now()
	claims := Claims{
		Email: email,
		Role:  role,
		Type:  "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(14 * 24 * time.Hour)),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(secret))
}

func ParseToken(secret, token string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	c, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return c, nil
}

func SubjectUserID(c *Claims) (uuid.UUID, error) {
	sub, err := c.GetSubject()
	if err != nil || sub == "" {
		return uuid.Nil, fmt.Errorf("no subject in token")
	}
	return uuid.Parse(sub)
}
