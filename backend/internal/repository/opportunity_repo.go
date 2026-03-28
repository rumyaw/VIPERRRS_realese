package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"tramplin/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
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
       contacts, tags, level, employment::text, media_url, moderation_status, view_count, created_at, updated_at,
       pending_revision, revision_moderation_status
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
       contacts, tags, level, employment::text, media_url, moderation_status, view_count, created_at, updated_at,
       pending_revision, revision_moderation_status
FROM opportunities
WHERE id = $1 AND moderation_status = 'approved'`
	row := r.pool.QueryRow(ctx, q, id)
	return scanOpportunityByID(row)
}

func (r *OpportunityRepository) GetByIDUnrestricted(ctx context.Context, id uuid.UUID) (*domain.Opportunity, error) {
	const q = `
SELECT id, author_id, title, short_description, full_description, company_name,
       type::text, work_format::text, location_label, lon, lat,
       published_at, valid_until, event_at, salary_min, salary_max, currency,
       contacts, tags, level, employment::text, media_url, moderation_status, view_count, created_at, updated_at,
       pending_revision, revision_moderation_status
FROM opportunities
WHERE id = $1`
	row := r.pool.QueryRow(ctx, q, id)
	return scanOpportunityByID(row)
}

// GetByIDForAuthor возвращает карточку только если она принадлежит работодателю (любой статус модерации).
func (r *OpportunityRepository) GetByIDForAuthor(ctx context.Context, id, authorID uuid.UUID) (*domain.Opportunity, error) {
	const q = `
SELECT id, author_id, title, short_description, full_description, company_name,
       type::text, work_format::text, location_label, lon, lat,
       published_at, valid_until, event_at, salary_min, salary_max, currency,
       contacts, tags, level, employment::text, media_url, moderation_status, view_count, created_at, updated_at,
       pending_revision, revision_moderation_status
FROM opportunities
WHERE id = $1 AND author_id = $2`
	row := r.pool.QueryRow(ctx, q, id, authorID)
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
	var pendingRevision []byte
	var revisionMod *string
	err := row.Scan(
		&o.ID, &o.AuthorID, &o.Title, &o.ShortDescription, &o.FullDescription, &o.CompanyName,
		&o.Type, &o.WorkFormat, &o.LocationLabel, &o.Lon, &o.Lat,
		&o.PublishedAt, &o.ValidUntil, &o.EventAt, &o.SalaryMin, &o.SalaryMax, &o.Currency,
		&contacts, &o.Tags, &o.Level, &o.Employment, &o.MediaURL, &o.ModerationStatus, &o.ViewCount, &o.CreatedAt, &o.UpdatedAt,
		&pendingRevision, &revisionMod,
	)
	if err != nil {
		return nil, err
	}
	o.Contacts = contacts
	if len(pendingRevision) > 0 {
		o.PendingRevision = append([]byte(nil), pendingRevision...)
	}
	if revisionMod != nil {
		rs := *revisionMod
		o.RevisionModerationStatus = &rs
	}
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
       contacts, tags, level, employment::text, media_url, moderation_status, view_count, created_at, updated_at,
       pending_revision, revision_moderation_status
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

// ListApprovedByAuthor — опубликованные карточки работодателя (публичный профиль).
func (r *OpportunityRepository) ListApprovedByAuthor(ctx context.Context, authorID uuid.UUID, limit int) ([]domain.Opportunity, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	const q = `
SELECT id, author_id, title, short_description, full_description, company_name,
       type::text, work_format::text, location_label, lon, lat,
       published_at, valid_until, event_at, salary_min, salary_max, currency,
       contacts, tags, level, employment::text, media_url, moderation_status, view_count, created_at, updated_at,
       pending_revision, revision_moderation_status
FROM opportunities
WHERE author_id = $1 AND moderation_status = 'approved'
ORDER BY published_at DESC NULLS LAST, created_at DESC
LIMIT $2`
	rows, err := r.pool.Query(ctx, q, authorID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanOpportunities(rows)
}

// pendingRevisionRecord — сериализуется в pending_revision (правка опубликованной карточки).
type pendingRevisionRecord struct {
	Title            string         `json:"title"`
	ShortDescription string         `json:"shortDescription"`
	FullDescription  string         `json:"fullDescription"`
	CompanyName      string         `json:"companyName"`
	Type             string         `json:"type"`
	WorkFormat       string         `json:"workFormat"`
	LocationLabel    string         `json:"locationLabel"`
	Lat              *float64       `json:"lat,omitempty"`
	Lng              *float64       `json:"lng,omitempty"`
	Contacts         map[string]any `json:"contacts"`
	Tags             []string       `json:"tags"`
	Level            string         `json:"level"`
	Employment       string         `json:"employment"`
	MediaURL         *string        `json:"mediaUrl,omitempty"`
	SalaryMin        *int           `json:"salaryMin,omitempty"`
	SalaryMax        *int           `json:"salaryMax,omitempty"`
	Currency         string         `json:"currency"`
	ValidUntil       *string        `json:"validUntil,omitempty"`
	EventStart       *string        `json:"eventStart,omitempty"`
	EventEnd         *string        `json:"eventEnd,omitempty"`
}

func optionalDateStr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format("2006-01-02")
	return &s
}

func (r *OpportunityRepository) UpdateByEmployer(
	ctx context.Context,
	opportunityID, authorID uuid.UUID,
	title, shortDescription, fullDescription, companyName, typ, workFormat, locationLabel string,
	contacts map[string]any,
	tags []string,
	level, employment string,
	lon, lat *float64,
	mediaURL *string,
	salaryMin, salaryMax *int,
	currency string,
	validUntil, eventAt *time.Time,
	isEvent bool,
) (*domain.Opportunity, error) {
	contactsJSON, err := json.Marshal(contacts)
	if err != nil {
		return nil, err
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var modStatus string
	err = tx.QueryRow(ctx, `
SELECT moderation_status FROM opportunities WHERE id = $1 AND author_id = $2 FOR UPDATE`,
		opportunityID, authorID).Scan(&modStatus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	rec := pendingRevisionRecord{
		Title: title, ShortDescription: shortDescription, FullDescription: fullDescription,
		CompanyName: companyName, Type: typ, WorkFormat: workFormat, LocationLabel: locationLabel,
		Lat: lat, Lng: lon, Contacts: contacts, Tags: tags, Level: level, Employment: employment,
		MediaURL: mediaURL, SalaryMin: salaryMin, SalaryMax: salaryMax, Currency: currency,
	}
	if isEvent {
		rec.ValidUntil = nil
		rec.EventStart = optionalDateStr(eventAt)
		rec.EventEnd = optionalDateStr(validUntil)
	} else {
		rec.ValidUntil = optionalDateStr(validUntil)
		rec.EventStart = nil
		rec.EventEnd = nil
	}
	pendingJSON, err := json.Marshal(rec)
	if err != nil {
		return nil, err
	}

	const ret = `RETURNING id, author_id, title, short_description, full_description, company_name,
          type::text, work_format::text, location_label, lon, lat,
          published_at, valid_until, event_at, salary_min, salary_max, currency,
          contacts, tags, level, employment::text, media_url, moderation_status, view_count, created_at, updated_at,
          pending_revision, revision_moderation_status`

	if modStatus == "approved" {
		rev := "pending"
		row := tx.QueryRow(ctx, `
UPDATE opportunities SET
  pending_revision = $3::jsonb,
  revision_moderation_status = $4,
  updated_at = now()
WHERE id = $1 AND author_id = $2
`+ret, opportunityID, authorID, pendingJSON, rev)
		o, err := scanOpportunityByID(row)
		if err != nil {
			return nil, err
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return o, nil
	}

	row := tx.QueryRow(ctx, `
UPDATE opportunities SET
  title = $3, short_description = $4, full_description = $5, company_name = $6,
  type = $7::opportunity_type, work_format = $8::work_format, location_label = $9,
  lon = $10, lat = $11, contacts = $12::jsonb, tags = $13::text[], level = $14, employment = $15::employment_type,
  media_url = $16, salary_min = $17, salary_max = $18, currency = $19,
  valid_until = $20, event_at = $21,
  moderation_status = 'pending',
  pending_revision = NULL,
  revision_moderation_status = NULL,
  updated_at = now()
WHERE id = $1 AND author_id = $2
`+ret,
		opportunityID, authorID,
		title, shortDescription, fullDescription, companyName,
		typ, workFormat, locationLabel, lon, lat, string(contactsJSON), tags, level, employment,
		mediaURL, salaryMin, salaryMax, currency,
		validUntil, eventAt,
	)
	o, err := scanOpportunityByID(row)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return o, nil
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
	validUntil, eventAt *time.Time,
) (*domain.Opportunity, error) {
	contactsJSON, err := json.Marshal(contacts)
	if err != nil {
		return nil, err
	}
	const q = `
INSERT INTO opportunities (
  author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat, contacts, tags, level, employment,
  media_url, salary_min, salary_max, currency, moderation_status, valid_until, event_at
) VALUES (
  $1, $2, $3, $4, $5,
  $6::opportunity_type, $7::work_format, $8, $9, $10, $11::jsonb, $12::text[], $13, $14::employment_type,
  $15, $16, $17, $18, 'pending', $19, $20
)
RETURNING id, author_id, title, short_description, full_description, company_name,
          type::text, work_format::text, location_label, lon, lat,
          published_at, valid_until, event_at, salary_min, salary_max, currency,
          contacts, tags, level, employment::text, media_url, moderation_status, view_count, created_at, updated_at,
          pending_revision, revision_moderation_status`
	row := r.pool.QueryRow(
		ctx,
		q,
		authorID, title, shortDescription, fullDescription, companyName,
		typ, workFormat, locationLabel, lon, lat, string(contactsJSON), tags, level, employment,
		mediaURL, salaryMin, salaryMax, currency,
		validUntil, eventAt,
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

// DeleteByAuthor удаляет карточку только если она принадлежит работодателю.
func (r *OpportunityRepository) DeleteByAuthor(ctx context.Context, opportunityID, authorID uuid.UUID) error {
	const q = `DELETE FROM opportunities WHERE id = $1 AND author_id = $2`
	res, err := r.pool.Exec(ctx, q, opportunityID, authorID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("opportunity not found")
	}
	return nil
}

func (r *OpportunityRepository) ListPendingOpportunities(ctx context.Context) ([]map[string]any, error) {
	const q = `
SELECT o.id,
       CASE WHEN o.revision_moderation_status = 'pending' AND o.pending_revision IS NOT NULL
            THEN COALESCE(NULLIF(TRIM(o.pending_revision->>'title'), ''), o.title)
            ELSE o.title END,
       CASE WHEN o.revision_moderation_status = 'pending' AND o.pending_revision IS NOT NULL
            THEN COALESCE(NULLIF(TRIM(o.pending_revision->>'companyName'), ''), o.company_name)
            ELSE o.company_name END,
       CASE WHEN o.revision_moderation_status = 'pending' AND o.pending_revision IS NOT NULL
            THEN COALESCE(NULLIF(TRIM(o.pending_revision->>'type'), ''), o.type::text)
            ELSE o.type::text END,
       CASE WHEN o.revision_moderation_status = 'pending' AND o.pending_revision IS NOT NULL
            THEN COALESCE(NULLIF(TRIM(o.pending_revision->>'workFormat'), ''), o.work_format::text)
            ELSE o.work_format::text END,
       o.created_at,
       u.id, u.email, u.display_name
FROM opportunities o
JOIN users u ON u.id = o.author_id
WHERE o.moderation_status = 'pending'
   OR (o.revision_moderation_status = 'pending' AND o.pending_revision IS NOT NULL)
ORDER BY o.updated_at DESC`
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
			"id":          oppID.String(),
			"title":       title,
			"companyName": companyName,
			"type":        typ,
			"workFormat":  workFormat,
			"createdAt":   createdAt.Format(time.RFC3339),
			"author": map[string]any{
				"id":          authorID.String(),
				"email":       email,
				"displayName": displayName,
			},
		})
	}
	return out, rows.Err()
}

func applyPendingRevisionFromJSON(ctx context.Context, tx pgx.Tx, id uuid.UUID, raw []byte) error {
	var p pendingRevisionRecord
	if err := json.Unmarshal(raw, &p); err != nil {
		return fmt.Errorf("invalid pending_revision: %w", err)
	}
	var vu, ea *time.Time
	if p.Type == "event" {
		if p.EventStart != nil && *p.EventStart != "" {
			t, err := time.Parse("2006-01-02", *p.EventStart)
			if err == nil {
				ea = &t
			}
		}
		if p.EventEnd != nil && *p.EventEnd != "" {
			t, err := time.Parse("2006-01-02", *p.EventEnd)
			if err == nil {
				vu = &t
			}
		}
	} else {
		if p.ValidUntil != nil && *p.ValidUntil != "" {
			t, err := time.Parse("2006-01-02", *p.ValidUntil)
			if err == nil {
				vu = &t
			}
		}
	}
	cj, err := json.Marshal(p.Contacts)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
UPDATE opportunities SET
  title = $2, short_description = $3, full_description = $4, company_name = $5,
  type = $6::opportunity_type, work_format = $7::work_format, location_label = $8,
  lon = $9, lat = $10, contacts = $11::jsonb, tags = $12::text[], level = $13, employment = $14::employment_type,
  media_url = $15, salary_min = $16, salary_max = $17, currency = $18,
  valid_until = $19, event_at = $20,
  pending_revision = NULL,
  revision_moderation_status = NULL,
  moderation_status = 'approved',
  published_at = COALESCE(published_at, CURRENT_DATE),
  updated_at = now()
WHERE id = $1`,
		id,
		p.Title, p.ShortDescription, p.FullDescription, p.CompanyName,
		p.Type, p.WorkFormat, p.LocationLabel, p.Lng, p.Lat, string(cj), p.Tags, p.Level, p.Employment,
		p.MediaURL, p.SalaryMin, p.SalaryMax, p.Currency,
		vu, ea,
	)
	return err
}

func (r *OpportunityRepository) SetOpportunityModerationStatus(ctx context.Context, opportunityID uuid.UUID, status string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var modStatus string
	var revStatus *string
	var pending []byte
	err = tx.QueryRow(ctx, `
SELECT moderation_status, revision_moderation_status, pending_revision
FROM opportunities WHERE id = $1 FOR UPDATE`, opportunityID).Scan(&modStatus, &revStatus, &pending)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("opportunity not found")
		}
		return err
	}

	revPending := revStatus != nil && *revStatus == "pending" && len(pending) > 0

	switch status {
	case "approved":
		if revPending {
			if err := applyPendingRevisionFromJSON(ctx, tx, opportunityID, pending); err != nil {
				return err
			}
		} else if modStatus == "pending" {
			_, err = tx.Exec(ctx, `
UPDATE opportunities SET moderation_status = 'approved',
  published_at = COALESCE(published_at, CURRENT_DATE), updated_at = now()
WHERE id = $1`, opportunityID)
			if err != nil {
				return err
			}
		} else {
			return fmt.Errorf("opportunity not in pending state")
		}
	case "rejected":
		if revPending {
			_, err = tx.Exec(ctx, `
UPDATE opportunities SET pending_revision = NULL, revision_moderation_status = 'rejected', updated_at = now()
WHERE id = $1`, opportunityID)
		} else {
			_, err = tx.Exec(ctx, `
UPDATE opportunities SET moderation_status = 'rejected', updated_at = now() WHERE id = $1`, opportunityID)
		}
		if err != nil {
			return err
		}
	default:
		return fmt.Errorf("invalid moderation status")
	}

	return tx.Commit(ctx)
}

func (r *OpportunityRepository) IncrementViewCount(ctx context.Context, id uuid.UUID) error {
	const q = `UPDATE opportunities SET view_count = view_count + 1, updated_at = now()
WHERE id = $1 AND moderation_status = 'approved'`
	_, err := r.pool.Exec(ctx, q, id)
	return err
}
