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
	PeerID       uuid.UUID
	Email        string
	Name         string
	Connected    string
	Skills       []string
	AvatarURL    *string
	Bio          string
	JobSearch    string
}

type ContactRequest struct {
	ID         uuid.UUID
	FromUserID uuid.UUID
	FromName   string
	FromEmail  string
	Skills     []string
	AvatarURL  *string
	Bio        string
	Status     string
	CreatedAt  string
}

type PublicProfile struct {
	UserID          uuid.UUID
	Email           string
	DisplayName     string
	FullName        string
	University      string
	CourseOrYear    string
	Bio             string
	Skills          []string
	AvatarURL       *string
	JobSearchStatus string
	Resume          map[string]any
	Privacy         map[string]any
	RepoLinks       []string
	Applications    []PublicApplication
	Contacts        []PublicContact
}

type PublicApplication struct {
	OpportunityID    uuid.UUID
	OpportunityTitle string
	CompanyName      string
	Status           string
	CreatedAt        string
}

type PublicContact struct {
	PeerID uuid.UUID
	Name   string
}

type SearchApplicantResult struct {
	UserID    uuid.UUID
	Email     string
	Name      string
	Skills    []string
	AvatarURL *string
	Bio       string
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
	Viewed           bool
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

func (r *UserRepository) UpdateEmployerProfile(ctx context.Context, userID uuid.UUID, companyName, description, industry, website, socials, inn string, logoDataUrl *string) error {
	if logoDataUrl != nil {
		const q = `
UPDATE employer_profiles
SET company_name = $2, description = $3, industry = $4, website = $5, socials = $6, inn = $7, logo_url = $8, updated_at = now()
WHERE user_id = $1`
		res, err := r.pool.Exec(ctx, q, userID, companyName, description, industry, website, socials, inn, *logoDataUrl)
		if err != nil {
			return err
		}
		if res.RowsAffected() == 0 {
			return fmt.Errorf("employer profile not found")
		}
		return nil
	}
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
       COALESCE(o.title, ''), COALESCE(o.company_name, ''), COALESCE(o.location_label, ''),
       r.viewed
FROM recommendations r
JOIN users u ON u.id = r.from_user_id
LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
LEFT JOIN opportunities o ON o.id = r.opportunity_id
WHERE r.to_user_id = $1
ORDER BY r.viewed ASC, r.created_at DESC`
	rows, err := r.pool.Query(ctx, q, toUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]RecommendationInboxItem, 0)
	for rows.Next() {
		var it RecommendationInboxItem
		if err := rows.Scan(&it.ID, &it.FromUserID, &it.FromName, &it.OpportunityID, &it.Message, &it.CreatedAt, &it.OpportunityTitle, &it.CompanyName, &it.LocationLabel, &it.Viewed); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

func (r *UserRepository) MarkRecommendationViewed(ctx context.Context, userID, recID uuid.UUID) error {
	const q = `UPDATE recommendations SET viewed = true WHERE id = $1 AND to_user_id = $2`
	res, err := r.pool.Exec(ctx, q, recID, userID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("recommendation not found")
	}
	return nil
}

// --- Contact Requests ---

func (r *UserRepository) SendContactRequest(ctx context.Context, fromUserID, toUserID uuid.UUID) error {
	if fromUserID == toUserID {
		return fmt.Errorf("cannot send request to yourself")
	}
	var exists bool
	r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM applicant_contacts WHERE user_id=$1 AND peer_id=$2)`, fromUserID, toUserID).Scan(&exists)
	if exists {
		return fmt.Errorf("already in contacts")
	}
	const q = `
INSERT INTO contact_requests (from_user_id, to_user_id, status)
VALUES ($1, $2, 'pending')
ON CONFLICT (from_user_id, to_user_id) DO UPDATE SET status = 'pending', updated_at = now()
WHERE contact_requests.status = 'rejected'`
	_, err := r.pool.Exec(ctx, q, fromUserID, toUserID)
	return err
}

func (r *UserRepository) ListIncomingContactRequests(ctx context.Context, userID uuid.UUID) ([]ContactRequest, error) {
	const q = `
SELECT cr.id, cr.from_user_id, COALESCE(ap.full_name, u.display_name), u.email,
       COALESCE(ap.skills, '{}'), ap.avatar_url, COALESCE(ap.bio, ''), cr.status, cr.created_at::text
FROM contact_requests cr
JOIN users u ON u.id = cr.from_user_id
LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
WHERE cr.to_user_id = $1 AND cr.status = 'pending'
ORDER BY cr.created_at DESC`
	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]ContactRequest, 0)
	for rows.Next() {
		var cr ContactRequest
		if err := rows.Scan(&cr.ID, &cr.FromUserID, &cr.FromName, &cr.FromEmail, &cr.Skills, &cr.AvatarURL, &cr.Bio, &cr.Status, &cr.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, cr)
	}
	return out, rows.Err()
}

func (r *UserRepository) AcceptContactRequest(ctx context.Context, userID, requestID uuid.UUID) error {
	var fromUserID uuid.UUID
	err := r.pool.QueryRow(ctx,
		`UPDATE contact_requests SET status='accepted', updated_at=now() WHERE id=$1 AND to_user_id=$2 AND status='pending' RETURNING from_user_id`,
		requestID, userID).Scan(&fromUserID)
	if err != nil {
		return fmt.Errorf("request not found or already processed")
	}
	const q = `
INSERT INTO applicant_contacts (user_id, peer_id)
VALUES ($1, $2), ($2, $1)
ON CONFLICT DO NOTHING`
	_, err = r.pool.Exec(ctx, q, userID, fromUserID)
	return err
}

func (r *UserRepository) RejectContactRequest(ctx context.Context, userID, requestID uuid.UUID) error {
	const q = `UPDATE contact_requests SET status='rejected', updated_at=now() WHERE id=$1 AND to_user_id=$2 AND status='pending'`
	res, err := r.pool.Exec(ctx, q, requestID, userID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("request not found or already processed")
	}
	return nil
}

// --- Search Applicants ---

func (r *UserRepository) SearchApplicants(ctx context.Context, query string, currentUserID uuid.UUID) ([]SearchApplicantResult, error) {
	const q = `
SELECT u.id, u.email, COALESCE(ap.full_name, u.display_name),
       COALESCE(ap.skills, '{}'), ap.avatar_url, COALESCE(ap.bio, '')
FROM users u
LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
WHERE u.role = 'applicant'
  AND u.id <> $2
  AND (lower(COALESCE(ap.full_name, u.display_name)) LIKE '%' || lower($1) || '%'
       OR lower(u.email) LIKE '%' || lower($1) || '%')
ORDER BY COALESCE(ap.full_name, u.display_name)
LIMIT 20`
	rows, err := r.pool.Query(ctx, q, query, currentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]SearchApplicantResult, 0)
	for rows.Next() {
		var s SearchApplicantResult
		if err := rows.Scan(&s.UserID, &s.Email, &s.Name, &s.Skills, &s.AvatarURL, &s.Bio); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// --- Public Profile ---

func (r *UserRepository) GetPublicProfile(ctx context.Context, targetUserID, viewerUserID uuid.UUID) (*PublicProfile, error) {
	var p PublicProfile
	var resume, privacy map[string]any
	const q = `
SELECT u.id, u.email, u.display_name,
       COALESCE(ap.full_name, ''), COALESCE(ap.university, ''), COALESCE(ap.course_or_year, ''),
       COALESCE(ap.bio, ''), COALESCE(ap.skills, '{}'), ap.avatar_url,
       COALESCE(ap.job_search_status::text, 'active_search'),
       COALESCE(ap.resume, '{}'), COALESCE(ap.privacy, '{}'), COALESCE(ap.repo_links, '{}')
FROM users u
LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
WHERE u.id = $1 AND u.role = 'applicant'`
	if err := r.pool.QueryRow(ctx, q, targetUserID).Scan(
		&p.UserID, &p.Email, &p.DisplayName,
		&p.FullName, &p.University, &p.CourseOrYear,
		&p.Bio, &p.Skills, &p.AvatarURL,
		&p.JobSearchStatus, &resume, &privacy, &p.RepoLinks,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	p.Resume = resume
	p.Privacy = privacy

	openProfile, _ := privacy["openProfileToNetwork"].(bool)
	hideApps, _ := privacy["hideApplicationsFromPeers"].(bool)

	if openProfile && !hideApps {
		apps, _ := r.listPublicApplications(ctx, targetUserID)
		p.Applications = apps
	}

	if openProfile {
		contacts, _ := r.listPublicContacts(ctx, targetUserID)
		p.Contacts = contacts
	}

	return &p, nil
}

func (r *UserRepository) listPublicApplications(ctx context.Context, userID uuid.UUID) ([]PublicApplication, error) {
	const q = `
SELECT a.opportunity_id, COALESCE(o.title, ''), COALESCE(o.company_name, ''), a.status::text, a.created_at::text
FROM applications a
LEFT JOIN opportunities o ON o.id = a.opportunity_id
WHERE a.applicant_id = $1
ORDER BY a.created_at DESC`
	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]PublicApplication, 0)
	for rows.Next() {
		var a PublicApplication
		if err := rows.Scan(&a.OpportunityID, &a.OpportunityTitle, &a.CompanyName, &a.Status, &a.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *UserRepository) listPublicContacts(ctx context.Context, userID uuid.UUID) ([]PublicContact, error) {
	const q = `
SELECT c.peer_id, COALESCE(ap.full_name, u.display_name)
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
	out := make([]PublicContact, 0)
	for rows.Next() {
		var c PublicContact
		if err := rows.Scan(&c.PeerID, &c.Name); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// --- Favorites ---

func (r *UserRepository) AddFavorite(ctx context.Context, userID, opportunityID uuid.UUID) error {
	const q = `INSERT INTO favorites (user_id, opportunity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`
	_, err := r.pool.Exec(ctx, q, userID, opportunityID)
	return err
}

func (r *UserRepository) RemoveFavorite(ctx context.Context, userID, opportunityID uuid.UUID) error {
	const q = `DELETE FROM favorites WHERE user_id = $1 AND opportunity_id = $2`
	_, err := r.pool.Exec(ctx, q, userID, opportunityID)
	return err
}

func (r *UserRepository) ListFavoriteIDs(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	const q = `SELECT opportunity_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC`
	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]uuid.UUID, 0)
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

// --- Privacy update (v2 with blockRecommendations) ---

func (r *UserRepository) UpdateApplicantPrivacyV2(ctx context.Context, userID uuid.UUID, hideApplications, openProfile, blockRecommendations bool) error {
	raw := map[string]bool{
		"hideApplicationsFromPeers": hideApplications,
		"openProfileToNetwork":      openProfile,
		"blockRecommendations":      blockRecommendations,
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

// --- Create recommendation with checks ---

func (r *UserRepository) CreateRecommendationChecked(ctx context.Context, fromUserID, toUserID, opportunityID uuid.UUID, message string) error {
	var privacy map[string]any
	var jobSearch string
	err := r.pool.QueryRow(ctx,
		`SELECT COALESCE(ap.privacy, '{}'), COALESCE(ap.job_search_status::text, 'active_search')
		 FROM applicant_profiles ap WHERE ap.user_id = $1`, toUserID).Scan(&privacy, &jobSearch)
	if err != nil {
		return fmt.Errorf("target user profile not found")
	}

	if jobSearch == "not_looking" {
		return fmt.Errorf("пользователь не ищет работу")
	}
	if blocked, ok := privacy["blockRecommendations"].(bool); ok && blocked {
		return fmt.Errorf("пользователь запретил рекомендации")
	}

	const q = `
INSERT INTO recommendations (from_user_id, to_user_id, opportunity_id, message)
VALUES ($1, $2, $3, $4)`
	_, err = r.pool.Exec(ctx, q, fromUserID, toUserID, opportunityID, message)
	return err
}

// --- Contacts list v2 (with skills, avatar, bio) ---

func (r *UserRepository) ListContactsV2(ctx context.Context, userID uuid.UUID) ([]ApplicantContact, error) {
	const q = `
SELECT c.peer_id, u.email, COALESCE(ap.full_name, u.display_name), c.created_at::text,
       COALESCE(ap.skills, '{}'), ap.avatar_url, COALESCE(ap.bio, ''), COALESCE(ap.job_search_status::text, 'active_search')
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
		if err := rows.Scan(&c.PeerID, &c.Email, &c.Name, &c.Connected, &c.Skills, &c.AvatarURL, &c.Bio, &c.JobSearch); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// --- Recommendable contacts (for sharing menu) ---

func (r *UserRepository) ListRecommendableContacts(ctx context.Context, userID uuid.UUID) ([]ApplicantContact, error) {
	const q = `
SELECT c.peer_id, u.email, COALESCE(ap.full_name, u.display_name), c.created_at::text,
       COALESCE(ap.skills, '{}'), ap.avatar_url, COALESCE(ap.bio, ''), COALESCE(ap.job_search_status::text, 'active_search')
FROM applicant_contacts c
JOIN users u ON u.id = c.peer_id
LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
WHERE c.user_id = $1
  AND COALESCE(ap.job_search_status::text, 'active_search') <> 'not_looking'
  AND NOT COALESCE((ap.privacy->>'blockRecommendations')::boolean, false)
ORDER BY COALESCE(ap.full_name, u.display_name)`
	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]ApplicantContact, 0)
	for rows.Next() {
		var c ApplicantContact
		if err := rows.Scan(&c.PeerID, &c.Email, &c.Name, &c.Connected, &c.Skills, &c.AvatarURL, &c.Bio, &c.JobSearch); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// --- Contact relationship check ---

func (r *UserRepository) IsContact(ctx context.Context, userID, peerID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM applicant_contacts WHERE user_id=$1 AND peer_id=$2)`, userID, peerID).Scan(&exists)
	return exists, err
}

func (r *UserRepository) HasPendingRequest(ctx context.Context, fromUserID, toUserID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM contact_requests WHERE from_user_id=$1 AND to_user_id=$2 AND status='pending')`, fromUserID, toUserID).Scan(&exists)
	return exists, err
}

func (r *UserRepository) RemoveContact(ctx context.Context, userID, peerID uuid.UUID) error {
	const q = `DELETE FROM applicant_contacts WHERE (user_id=$1 AND peer_id=$2) OR (user_id=$2 AND peer_id=$1)`
	_, err := r.pool.Exec(ctx, q, userID, peerID)
	return err
}

type PublicEmployerProfile struct {
	UserID      string
	CompanyName string
	Description string
	Industry    string
	Website     string
	Verified    bool
	LogoURL     *string
}

func (r *UserRepository) IsEmployerVerified(ctx context.Context, userID uuid.UUID) (bool, error) {
	var verified bool
	err := r.pool.QueryRow(ctx, `SELECT verified FROM employer_profiles WHERE user_id = $1`, userID).Scan(&verified)
	if err != nil {
		return false, err
	}
	return verified, nil
}

func (r *UserRepository) GetPublicEmployerProfile(ctx context.Context, userID uuid.UUID) (*PublicEmployerProfile, error) {
	const q = `
SELECT ep.user_id, ep.company_name, ep.description, ep.industry, ep.website, ep.verified, ep.logo_url
FROM employer_profiles ep
WHERE ep.user_id = $1`
	var p PublicEmployerProfile
	var uid uuid.UUID
	err := r.pool.QueryRow(ctx, q, userID).Scan(&uid, &p.CompanyName, &p.Description, &p.Industry, &p.Website, &p.Verified, &p.LogoURL)
	if err != nil {
		return nil, err
	}
	p.UserID = uid.String()
	return &p, nil
}
