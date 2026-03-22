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

type OpportunityRepository struct {
	pool *pgxpool.Pool
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
