package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"tramplin/internal/domain"
)

type OpportunityRepository struct {
	pool *pgxpool.Pool
}

type EmployerApplication struct {
	ID             uuid.UUID
	OpportunityID  uuid.UUID
	Opportunity    string
	ApplicantID    uuid.UUID
	ApplicantName  string
	ApplicantEmail string
	Status         string
	ResumeSnapshot *string
	CreatedAt      time.Time
}

func NewOpportunityRepository(pool *pgxpool.Pool) *OpportunityRepository {
	return &OpportunityRepository{pool: pool}
}

func (r *OpportunityRepository) List(ctx context.Context, limit, offset int) ([]domain.Opportunity, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	const q = `
SELECT id, author_id, title, short_description, full_description, company_name,
       type::text, work_format::text, location_label, lon, lat,
       published_at, valid_until, event_at, salary_min, salary_max, currency,
       contacts, tags, level, employment::text, media_url, created_at, updated_at
FROM opportunities
WHERE moderation_status = 'approved'
ORDER BY published_at DESC NULLS LAST, created_at DESC
LIMIT $1 OFFSET $2`
	rows, err := r.pool.Query(ctx, q, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list opportunities: %w", err)
	}
	defer rows.Close()
	return scanOpportunities(rows)
}

func (r *OpportunityRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Opportunity, error) {
	const q = `
SELECT id, author_id, title, short_description, full_description, company_name,
       type::text, work_format::text, location_label, lon, lat,
       published_at, valid_until, event_at, salary_min, salary_max, currency,
       contacts, tags, level, employment::text, media_url, created_at, updated_at
FROM opportunities
WHERE id = $1 AND moderation_status = 'approved'`
	row := r.pool.QueryRow(ctx, q, id)
	return scanOpportunityByID(row)
}

func scanOpportunities(rows pgx.Rows) ([]domain.Opportunity, error) {
	var out []domain.Opportunity
	for rows.Next() {
		o, err := scanOneOpportunity(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *o)
	}
	return out, rows.Err()
}

func scanOneOpportunity(row pgx.Row) (*domain.Opportunity, error) {
	var o domain.Opportunity
	var contacts map[string]any
	err := row.Scan(
		&o.ID, &o.AuthorID, &o.Title, &o.ShortDescription, &o.FullDescription, &o.CompanyName,
		&o.Type, &o.WorkFormat, &o.LocationLabel, &o.Lon, &o.Lat,
		&o.PublishedAt, &o.ValidUntil, &o.EventAt, &o.SalaryMin, &o.SalaryMax, &o.Currency,
		&contacts, &o.Tags, &o.Level, &o.Employment, &o.MediaURL, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	o.Contacts = contacts
	return &o, nil
}

func scanOpportunityByID(row pgx.Row) (*domain.Opportunity, error) {
	o, err := scanOneOpportunity(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return o, nil
}

func (r *OpportunityRepository) ListByAuthor(ctx context.Context, authorID uuid.UUID, limit, offset int) ([]domain.Opportunity, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	const q = `
SELECT id, author_id, title, short_description, full_description, company_name,
       type::text, work_format::text, location_label, lon, lat,
       published_at, valid_until, event_at, salary_min, salary_max, currency,
       contacts, tags, level, employment::text, media_url, created_at, updated_at
FROM opportunities
WHERE author_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3`
	rows, err := r.pool.Query(ctx, q, authorID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanOpportunities(rows)
}

func (r *OpportunityRepository) CreateByEmployer(
	ctx context.Context,
	authorID uuid.UUID,
	title, shortDescription, fullDescription, companyName, typ, workFormat, locationLabel string,
	contacts map[string]any,
	tags []string,
	level, employment string,
	lon, lat *float64,
	mediaURL *string,
	salaryMin, salaryMax *int,
	currency string,
) (*domain.Opportunity, error) {
	contactsJSON, err := json.Marshal(contacts)
	if err != nil {
		return nil, err
	}
	const q = `
INSERT INTO opportunities (
  author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat, contacts, tags, level, employment,
  media_url, salary_min, salary_max, currency, moderation_status
) VALUES (
  $1, $2, $3, $4, $5,
  $6::opportunity_type, $7::work_format, $8, $9, $10, $11::jsonb, $12::text[], $13, $14::employment_type,
  $15, $16, $17, $18, 'approved'
)
RETURNING id, author_id, title, short_description, full_description, company_name,
          type::text, work_format::text, location_label, lon, lat,
          published_at, valid_until, event_at, salary_min, salary_max, currency,
          contacts, tags, level, employment::text, media_url, created_at, updated_at`
	row := r.pool.QueryRow(
		ctx,
		q,
		authorID, title, shortDescription, fullDescription, companyName,
		typ, workFormat, locationLabel, lon, lat, string(contactsJSON), tags, level, employment,
		mediaURL, salaryMin, salaryMax, currency,
	)
	return scanOpportunityByID(row)
}

func (r *OpportunityRepository) CreateApplication(ctx context.Context, opportunityID, applicantID uuid.UUID, resumeSnapshot string) error {
	const q = `
INSERT INTO applications (opportunity_id, applicant_id, resume_snapshot)
VALUES ($1, $2, $3)
ON CONFLICT (opportunity_id, applicant_id) DO NOTHING`
	_, err := r.pool.Exec(ctx, q, opportunityID, applicantID, resumeSnapshot)
	return err
}

func (r *OpportunityRepository) ListApplicantApplications(ctx context.Context, applicantID uuid.UUID) ([]map[string]any, error) {
	const q = `
SELECT a.id, a.opportunity_id, a.status::text, a.resume_snapshot, a.created_at,
       o.title, o.company_name
FROM applications a
JOIN opportunities o ON o.id = a.opportunity_id
WHERE a.applicant_id = $1
ORDER BY a.created_at DESC`
	rows, err := r.pool.Query(ctx, q, applicantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]map[string]any, 0)
	for rows.Next() {
		var id, oppID uuid.UUID
		var status, title, company string
		var snapshot *string
		var createdAt time.Time
		if err := rows.Scan(&id, &oppID, &status, &snapshot, &createdAt, &title, &company); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"id":             id.String(),
			"opportunityId":  oppID.String(),
			"status":         status,
			"resumeSnapshot": snapshot,
			"createdAt":      createdAt.Format(time.RFC3339),
			"opportunity": map[string]any{
				"id":          oppID.String(),
				"title":       title,
				"companyName": company,
			},
		})
	}
	return out, rows.Err()
}

func (r *OpportunityRepository) ListEmployerApplications(ctx context.Context, employerID uuid.UUID) ([]EmployerApplication, error) {
	const q = `
SELECT a.id, a.opportunity_id, o.title, a.applicant_id, u.display_name, u.email,
       a.status::text, a.resume_snapshot, a.created_at
FROM applications a
JOIN opportunities o ON o.id = a.opportunity_id
JOIN users u ON u.id = a.applicant_id
WHERE o.author_id = $1
ORDER BY a.created_at DESC`
	rows, err := r.pool.Query(ctx, q, employerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]EmployerApplication, 0)
	for rows.Next() {
		var a EmployerApplication
		if err := rows.Scan(&a.ID, &a.OpportunityID, &a.Opportunity, &a.ApplicantID, &a.ApplicantName, &a.ApplicantEmail, &a.Status, &a.ResumeSnapshot, &a.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *OpportunityRepository) UpdateEmployerApplicationStatus(
	ctx context.Context,
	employerID, applicationID uuid.UUID,
	status string,
) error {
	const q = `
UPDATE applications a
SET status = $3::application_status, updated_at = now()
FROM opportunities o
WHERE a.id = $2
  AND o.id = a.opportunity_id
  AND o.author_id = $1`
	res, err := r.pool.Exec(ctx, q, employerID, applicationID, status)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("application not found")
	}
	return nil
}

func (r *OpportunityRepository) ListPendingOpportunities(ctx context.Context) ([]map[string]any, error) {
	const q = `
SELECT o.id, o.title, o.company_name, o.type::text, o.work_format::text, o.created_at,
       u.id, u.email, u.display_name
FROM opportunities o
JOIN users u ON u.id = o.author_id
WHERE o.moderation_status = 'pending'
ORDER BY o.created_at DESC`
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]map[string]any, 0)
	for rows.Next() {
		var oppID, authorID uuid.UUID
		var title, companyName, typ, workFormat, email, displayName string
		var createdAt time.Time
		if err := rows.Scan(&oppID, &title, &companyName, &typ, &workFormat, &createdAt, &authorID, &email, &displayName); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"id":         oppID.String(),
			"title":      title,
			"companyName": companyName,
			"type":       typ,
			"workFormat": workFormat,
			"createdAt":  createdAt.Format(time.RFC3339),
			"author": map[string]any{
				"id":          authorID.String(),
				"email":       email,
				"displayName": displayName,
			},
		})
	}
	return out, rows.Err()
}

func (r *OpportunityRepository) SetOpportunityModerationStatus(ctx context.Context, opportunityID uuid.UUID, status string) error {
	const q = `UPDATE opportunities SET moderation_status = $2, updated_at = now() WHERE id = $1`
	res, err := r.pool.Exec(ctx, q, opportunityID, status)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("opportunity not found")
	}
	return nil
}
