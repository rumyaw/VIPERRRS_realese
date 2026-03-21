package handlers

import (
	"context"
	"net/http"
	"strings"

	"trumplin/internal/db"
)

type OpportunityMarkerDTO struct {
	ID        string   `json:"id"`
	Title     string   `json:"title"`
	Description string `json:"description"`
	Company   string   `json:"company"`
	Type      string   `json:"type"`
	WorkFormat string  `json:"workFormat"`
	LocationType string `json:"locationType"`
	AddressText *string `json:"addressText,omitempty"`
	CityText *string    `json:"cityText,omitempty"`
	Skills    []string `json:"skills"`
	SalaryMin int      `json:"salaryMin,omitempty"`
	SalaryMax int      `json:"salaryMax,omitempty"`
	Lat       float64  `json:"lat"`
	Lng       float64  `json:"lng"`
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
			o.id,
			o.title,
			o.description,
			c.name,
			o.type,
			o.work_format,
			o.location_type,
			COALESCE(o.address_text,''),
			COALESCE(o.city_text,''),
			COALESCE(GROUP_CONCAT(t.name, ','), '') AS skills,
			COALESCE(o.salary_min, 0) AS salary_min,
			COALESCE(o.salary_max, 0) AS salary_max,
			o.lat,
			o.lng
		FROM opportunities o
		JOIN companies c ON c.id = o.employer_company_id
		LEFT JOIN opportunity_tags ot ON ot.opportunity_id = o.id
		LEFT JOIN tags t ON t.id = ot.tag_id
		WHERE
			o.status = 'APPROVED'
			AND o.lat IS NOT NULL AND o.lng IS NOT NULL
			AND (
				? = '' OR (
					o.location_type = 'CITY'
					AND lower(COALESCE(o.city_text,'')) = lower(?)
				)
			)
		GROUP BY o.id, o.title, o.description, c.name, o.type, o.work_format, o.location_type, o.address_text, o.city_text, o.salary_min, o.salary_max, o.lat, o.lng
		ORDER BY o.created_at DESC
		LIMIT 200
	`

	rows, err := database.DB.QueryContext(ctx, query, city, city)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []OpportunityMarkerDTO
	for rows.Next() {
		var dto OpportunityMarkerDTO
		var skillsCSV string
		var addressText, cityText string
		if err := rows.Scan(
			&dto.ID,
			&dto.Title,
			&dto.Description,
			&dto.Company,
			&dto.Type,
			&dto.WorkFormat,
			&dto.LocationType,
			&addressText,
			&cityText,
			&skillsCSV,
			&dto.SalaryMin,
			&dto.SalaryMax,
			&dto.Lat,
			&dto.Lng,
		); err != nil {
			return nil, err
		}
		dto.Skills = parseSkillsCSV(skillsCSV)
		if strings.TrimSpace(addressText) != "" {
			val := addressText
			dto.AddressText = &val
		}
		if strings.TrimSpace(cityText) != "" {
			val := cityText
			dto.CityText = &val
		}
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

