package handlers

import (
	"context"
	"net/http"
	"strings"

	"trumplin/internal/db"
)

type OpportunityMarkerDTO struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Company     string   `json:"company"`
	Type        string   `json:"type"`
	Skills      []string `json:"skills"`
	SalaryMin   int      `json:"salaryMin,omitempty"`
	SalaryMax   int      `json:"salaryMax,omitempty"`
	Lat         float64  `json:"lat"`
	Lng         float64  `json:"lng"`
	WorkFormat  string   `json:"workFormat,omitempty"`
}

type PublicOpportunitiesResponse struct {
	Items []OpportunityMarkerDTO `json:"items"`
	Meta  map[string]any         `json:"meta,omitempty"`
}

func PublicOpportunities(database *db.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		city := strings.TrimSpace(r.URL.Query().Get("city"))

		// Small, safe MVP query: only approved opportunities with known coordinates.
		// In later iterations we will expand filters (skills, salary, work_format, dates).
		var items []OpportunityMarkerDTO

		respItems, err := queryPublicOpportunities(r.Context(), database, city)
		if err == nil {
			items = respItems
		}

		WriteJSON(w, http.StatusOK, PublicOpportunitiesResponse{
			Items: items,
			Meta: map[string]any{
				"city": city,
			},
		})
	}
}

func queryPublicOpportunities(ctx context.Context, database *db.Database, city string) ([]OpportunityMarkerDTO, error) {
	query := `
		SELECT
			o.id::text,
			o.title,
			c.name,
			o.type,
			COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::text[]) AS skills,
			COALESCE(o.salary_min, 0) AS salary_min,
			COALESCE(o.salary_max, 0) AS salary_max,
			o.lat::double precision,
			o.lng::double precision,
			o.work_format
		FROM opportunities o
		JOIN companies c ON c.id = o.employer_company_id
		LEFT JOIN opportunity_tags ot ON ot.opportunity_id = o.id
		LEFT JOIN tags t ON t.id = ot.tag_id
		WHERE
			o.status = 'APPROVED'
			AND o.lat IS NOT NULL AND o.lng IS NOT NULL
			AND (
				$1 = '' OR (
					o.location_type = 'CITY'
					AND lower(COALESCE(o.city_text,'')) = lower($1)
				)
			)
		GROUP BY o.id, o.title, c.name, o.type, o.salary_min, o.salary_max, o.lat, o.lng, o.work_format
		ORDER BY o.created_at DESC
		LIMIT 200
	`

	rows, err := database.DB.Query(ctx, query, city)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []OpportunityMarkerDTO
	for rows.Next() {
		var dto OpportunityMarkerDTO
		var skills []string
		if err := rows.Scan(
			&dto.ID,
			&dto.Title,
			&dto.Company,
			&dto.Type,
			&skills,
			&dto.SalaryMin,
			&dto.SalaryMax,
			&dto.Lat,
			&dto.Lng,
			&dto.WorkFormat,
		); err != nil {
			return nil, err
		}
		dto.Skills = skills
		// If salaries were null in DB, we stored 0. Convert 0->omit by UI convention.
		if dto.SalaryMin == 0 {
			dto.SalaryMin = 0
		}
		if dto.SalaryMax == 0 {
			dto.SalaryMax = 0
		}
		out = append(out, dto)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

