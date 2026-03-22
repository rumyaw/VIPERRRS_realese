package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"tramplin/internal/domain"
)

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

func (r *UserRepository) Create(ctx context.Context, u *domain.User) error {
	const q = `
INSERT INTO users (email, password_hash, display_name, role)
VALUES (lower($1), $2, $3, $4)
RETURNING id, created_at, updated_at`
	return r.pool.QueryRow(ctx, q, u.Email, u.PasswordHash, u.DisplayName, u.Role).Scan(
		&u.ID, &u.CreatedAt, &u.UpdatedAt,
	)
}

func (r *UserRepository) CreateApplicantProfile(ctx context.Context, userID uuid.UUID) error {
	const q = `
INSERT INTO applicant_profiles (user_id) VALUES ($1)
ON CONFLICT (user_id) DO NOTHING`
	_, err := r.pool.Exec(ctx, q, userID)
	return err
}

func (r *UserRepository) CreateEmployerProfile(ctx context.Context, userID uuid.UUID) error {
	const q = `
INSERT INTO employer_profiles (user_id) VALUES ($1)
ON CONFLICT (user_id) DO NOTHING`
	_, err := r.pool.Exec(ctx, q, userID)
	return err
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	const q = `
SELECT id, email, password_hash, display_name, role, created_at, updated_at
FROM users WHERE lower(email) = lower($1)`
	var u domain.User
	err := r.pool.QueryRow(ctx, q, email).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.DisplayName, &u.Role, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return &u, nil
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	const q = `
SELECT id, email, password_hash, display_name, role, created_at, updated_at
FROM users WHERE id = $1`
	var u domain.User
	err := r.pool.QueryRow(ctx, q, id).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.DisplayName, &u.Role, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return &u, nil
}

func (r *UserRepository) EmailExists(ctx context.Context, email string) (bool, error) {
	const q = `SELECT EXISTS(SELECT 1 FROM users WHERE lower(email) = lower($1))`
	var ok bool
	err := r.pool.QueryRow(ctx, q, email).Scan(&ok)
	return ok, err
}
