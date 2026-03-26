package repository

import (
	"context"
	"encoding/json"
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

type PendingCompany struct {
	UserID      uuid.UUID
	Email       string
	DisplayName string
	CompanyName string
	Industry    string
	Website     string
	INN         string
	Verified    bool
}

type ApplicantProfileDTO struct {
	FullName        string
	University      string
	CourseOrYear    string
	Skills          []string
	Bio             string
	RepoLinks       []string
	AvatarURL       *string
	JobSearchStatus string
	Resume          map[string]any
	Privacy         map[string]any
}

type EmployerProfileDTO struct {
	CompanyName string
	Description string
	Industry    string
	Website     string
	Socials     string
	INN         string
	Verified    bool
	LogoURL     *string
}

type ApplicantContact struct {
	PeerID    uuid.UUID
	Email     string
	Name      string
	Connected string
}

type RecommendationInboxItem struct {
	ID               uuid.UUID
	FromUserID       uuid.UUID
	FromName         string
	OpportunityID    uuid.UUID
	Message          string
	CreatedAt        string
	OpportunityTitle string
	CompanyName      string
	LocationLabel    string
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

func (r *UserRepository) GetPool() *pgxpool.Pool {
	return r.pool
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

func (r *UserRepository) UpdateApplicantPrivacy(ctx context.Context, userID uuid.UUID, hideApplications, openProfile bool) error {
	raw := map[string]bool{
		"hideApplicationsFromPeers": hideApplications,
		"openProfileToNetwork":      openProfile,
	}
	b, err := json.Marshal(raw)
	if err != nil {
		return err
	}
	const q = `UPDATE applicant_profiles SET privacy = $2::jsonb, updated_at = now() WHERE user_id = $1`
	res, err := r.pool.Exec(ctx, q, userID, string(b))
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("applicant profile not found")
	}
	return nil
}

func (r *UserRepository) ListPendingCompanies(ctx context.Context) ([]PendingCompany, error) {
	const q = `
SELECT u.id, u.email, u.display_name, ep.company_name, ep.industry, ep.website, ep.inn, ep.verified
FROM employer_profiles ep
JOIN users u ON u.id = ep.user_id
WHERE ep.verified = false
ORDER BY u.created_at DESC`
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]PendingCompany, 0)
	for rows.Next() {
		var c PendingCompany
		if err := rows.Scan(&c.UserID, &c.Email, &c.DisplayName, &c.CompanyName, &c.Industry, &c.Website, &c.INN, &c.Verified); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *UserRepository) SetCompanyVerification(ctx context.Context, userID uuid.UUID, verified bool) error {
	const q = `UPDATE employer_profiles SET verified = $2, updated_at = now() WHERE user_id = $1`
	res, err := r.pool.Exec(ctx, q, userID, verified)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("company not found")
	}
	return nil
}

func (r *UserRepository) GetApplicantProfile(ctx context.Context, userID uuid.UUID) (*ApplicantProfileDTO, error) {
	const q = `
SELECT full_name, university, course_or_year, skills, bio, repo_links, avatar_url,
       job_search_status::text, resume, privacy
FROM applicant_profiles
WHERE user_id = $1`
	var p ApplicantProfileDTO
	var resume, privacy map[string]any
	if err := r.pool.QueryRow(ctx, q, userID).Scan(
		&p.FullName, &p.University, &p.CourseOrYear, &p.Skills, &p.Bio, &p.RepoLinks, &p.AvatarURL,
		&p.JobSearchStatus, &resume, &privacy,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	p.Resume = resume
	p.Privacy = privacy
	return &p, nil
}

func (r *UserRepository) GetEmployerProfile(ctx context.Context, userID uuid.UUID) (*EmployerProfileDTO, error) {
	const q = `
SELECT company_name, description, industry, website, socials, inn, verified, logo_url
FROM employer_profiles
WHERE user_id = $1`
	var p EmployerProfileDTO
	if err := r.pool.QueryRow(ctx, q, userID).Scan(
		&p.CompanyName, &p.Description, &p.Industry, &p.Website, &p.Socials, &p.INN, &p.Verified, &p.LogoURL,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

func (r *UserRepository) UpdateApplicantProfile(
	ctx context.Context,
	userID uuid.UUID,
	fullName, university, courseOrYear, bio string,
	skills, repoLinks []string,
	avatarURL *string,
	jobSearchStatus string,
	resume map[string]any,
) error {
	resumeJSON, err := json.Marshal(resume)
	if err != nil {
		return err
	}
	const q = `
UPDATE applicant_profiles
SET full_name = $2,
    university = $3,
    course_or_year = $4,
    bio = $5,
    skills = $6::text[],
    repo_links = $7::text[],
    avatar_url = $8,
    job_search_status = $9::job_search_status,
    resume = $10::jsonb,
    updated_at = now()
WHERE user_id = $1`
	res, err := r.pool.Exec(ctx, q, userID, fullName, university, courseOrYear, bio, skills, repoLinks, avatarURL, jobSearchStatus, string(resumeJSON))
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("applicant profile not found")
	}
	return nil
}

func (r *UserRepository) UpdateEmployerProfile(ctx context.Context, userID uuid.UUID, companyName, description, industry, website, socials, inn string) error {
	const q = `
UPDATE employer_profiles
SET company_name = $2, description = $3, industry = $4, website = $5, socials = $6, inn = $7, updated_at = now()
WHERE user_id = $1`
	res, err := r.pool.Exec(ctx, q, userID, companyName, description, industry, website, socials, inn)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("employer profile not found")
	}
	return nil
}

func (r *UserRepository) AddContactByEmail(ctx context.Context, userID uuid.UUID, peerEmail string) error {
	const findQ = `SELECT id FROM users WHERE lower(email) = lower($1) AND role = 'applicant'`
	var peerID uuid.UUID
	if err := r.pool.QueryRow(ctx, findQ, peerEmail).Scan(&peerID); err != nil {
		return err
	}
	if peerID == userID {
		return fmt.Errorf("cannot add yourself")
	}
	const q = `
INSERT INTO applicant_contacts (user_id, peer_id)
VALUES ($1, $2), ($2, $1)
ON CONFLICT DO NOTHING`
	_, err := r.pool.Exec(ctx, q, userID, peerID)
	return err
}

func (r *UserRepository) ListContacts(ctx context.Context, userID uuid.UUID) ([]ApplicantContact, error) {
	const q = `
SELECT c.peer_id, u.email, COALESCE(ap.full_name, u.display_name), c.created_at::text
FROM applicant_contacts c
JOIN users u ON u.id = c.peer_id
LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
WHERE c.user_id = $1
ORDER BY c.created_at DESC`
	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]ApplicantContact, 0)
	for rows.Next() {
		var c ApplicantContact
		if err := rows.Scan(&c.PeerID, &c.Email, &c.Name, &c.Connected); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *UserRepository) CreateRecommendation(ctx context.Context, fromUserID, toUserID, opportunityID uuid.UUID, message string) error {
	const q = `
INSERT INTO recommendations (from_user_id, to_user_id, opportunity_id, message)
VALUES ($1, $2, $3, $4)`
	_, err := r.pool.Exec(ctx, q, fromUserID, toUserID, opportunityID, message)
	return err
}

func (r *UserRepository) RecommendationInbox(ctx context.Context, toUserID uuid.UUID) ([]RecommendationInboxItem, error) {
	const q = `
SELECT r.id, r.from_user_id, COALESCE(ap.full_name, u.display_name) AS from_name,
       r.opportunity_id, r.message, r.created_at::text,
       COALESCE(o.title, ''), COALESCE(o.company_name, ''), COALESCE(o.location_label, '')
FROM recommendations r
JOIN users u ON u.id = r.from_user_id
LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
LEFT JOIN opportunities o ON o.id = r.opportunity_id
WHERE r.to_user_id = $1
ORDER BY r.created_at DESC`
	rows, err := r.pool.Query(ctx, q, toUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]RecommendationInboxItem, 0)
	for rows.Next() {
		var it RecommendationInboxItem
		if err := rows.Scan(&it.ID, &it.FromUserID, &it.FromName, &it.OpportunityID, &it.Message, &it.CreatedAt, &it.OpportunityTitle, &it.CompanyName, &it.LocationLabel); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}
