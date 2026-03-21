package handlers

import (
	"context"
	"encoding/json"
	"database/sql"
	"net/http"
	"strings"
	"time"

	"trumplin/internal/config"
	"trumplin/internal/db"
	"trumplin/internal/geocode"
)

type EmployerOpportunityCreateRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Organizer   string   `json:"organizerName"`

	Type        string `json:"type"`        // VACANCY|INTERNSHIP|MENTOR_PROGRAM|CAREER_EVENT
	WorkFormat  string `json:"workFormat"`  // OFFICE|HYBRID|REMOTE
	LocationType string `json:"locationType"` // OFFICE_ADDRESS|CITY

	AddressText *string `json:"addressText"`
	CityText    *string `json:"cityText"`

	SalaryMin  *int `json:"salaryMin"`
	SalaryMax  *int `json:"salaryMax"`

	StartsAt *time.Time `json:"startsAt"`
	EndsAt   *time.Time `json:"endsAt"`

	Skills []string `json:"skills"`
}

func EmployerOpportunitiesCreate(cfg *config.Config, database *db.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		claims, ok := getClaims(r)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		if r.Body == nil {
			http.Error(w, "bad_request", http.StatusBadRequest)
			return
		}

		var req EmployerOpportunityCreateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad_request", http.StatusBadRequest)
			return
		}

		if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Description) == "" || strings.TrimSpace(req.Type) == "" {
			http.Error(w, "missing_fields", http.StatusBadRequest)
			return
		}
		if len(req.Skills) == 0 {
			http.Error(w, "skills_required", http.StatusBadRequest)
			return
		}

		companyID, err := employerCompanyID(ctx, database, claims.UserID)
		if err != nil {
			http.Error(w, "company_not_found", http.StatusForbidden)
			return
		}

		var verificationStatus string
		if err := database.DB.QueryRowContext(ctx,
			`SELECT verification_status FROM companies WHERE id=?`,
			companyID,
		).Scan(&verificationStatus); err != nil {
			http.Error(w, "company_not_found", http.StatusForbidden)
			return
		}
		if verificationStatus != "APPROVED" {
			http.Error(w, "company_not_verified", http.StatusForbidden)
			return
		}

		locType := strings.TrimSpace(strings.ToUpper(req.LocationType))
		var addressText *string
		var cityText *string

		switch locType {
		case "OFFICE_ADDRESS":
			if req.AddressText == nil || strings.TrimSpace(*req.AddressText) == "" {
				http.Error(w, "addressText_required", http.StatusBadRequest)
				return
			}
			addressText = ptrStr(strings.TrimSpace(*req.AddressText))
		case "CITY":
			if req.CityText == nil || strings.TrimSpace(*req.CityText) == "" {
				http.Error(w, "cityText_required", http.StatusBadRequest)
				return
			}
			cityText = ptrStr(strings.TrimSpace(*req.CityText))
		default:
			http.Error(w, "invalid_locationType", http.StatusBadRequest)
			return
		}

		geo := geocode.New(cfg, database)
		var lat, lng float64
		if locType == "OFFICE_ADDRESS" {
			lat, lng, err = geo.Geocode(ctx, *addressText)
			if err != nil {
				http.Error(w, "geocode_failed", http.StatusBadRequest)
				return
			}
		} else {
			lat, lng, err = geo.Geocode(ctx, *cityText)
			if err != nil {
				http.Error(w, "geocode_failed", http.StatusBadRequest)
				return
			}
		}

		status := "PENDING"
		workFormat := strings.TrimSpace(strings.ToUpper(req.WorkFormat))
		typ := strings.TrimSpace(strings.ToUpper(req.Type))

		switch typ {
		case "VACANCY", "INTERNSHIP", "MENTOR_PROGRAM", "CAREER_EVENT":
		default:
			http.Error(w, "invalid_type", http.StatusBadRequest)
			return
		}

		switch workFormat {
		case "OFFICE", "HYBRID", "REMOTE":
		default:
			http.Error(w, "invalid_workFormat", http.StatusBadRequest)
			return
		}

		var salaryMin, salaryMax any = nil, nil
		if req.SalaryMin != nil {
			salaryMin = *req.SalaryMin
		}
		if req.SalaryMax != nil {
			salaryMax = *req.SalaryMax
		}

		var opportunityID string
		tx, err := database.DB.BeginTx(ctx, nil)
		if err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}
		defer func() { _ = tx.Rollback() }()

		if err := tx.QueryRowContext(ctx,
			`INSERT INTO opportunities (
				employer_company_id, curator_user_id,
				title, description, organizer_name,
				type, work_format,
				location_type, address_text, city_text,
				lat, lng,
				salary_min, salary_max,
				starts_at, ends_at,
				status
			) VALUES (
				?, NULL,
				?, ?, ?,
				?, ?,
				?, ?, ?,
				?, ?,
				?, ?,
				?, ?,
				?
			) RETURNING id`,
			companyID,
			req.Title, req.Description, req.Organizer,
			typ, workFormat,
			locType, addressText, cityText,
			lat, lng,
			salaryMin, salaryMax,
			req.StartsAt, req.EndsAt,
			status,
		).Scan(&opportunityID); err != nil {
			http.Error(w, "opportunity_create_failed", http.StatusBadRequest)
			return
		}

		// Upsert skills/tags.
		for _, skill := range req.Skills {
			skill = strings.TrimSpace(skill)
			if skill == "" {
				continue
			}
			var tagID string
			if err := tx.QueryRowContext(ctx,
				`INSERT INTO tags (name) VALUES (?)
				 ON CONFLICT (name) DO NOTHING
				 RETURNING id`,
				skill,
			).Scan(&tagID); err != nil {
				// RETURNING may not happen on conflict, fallback to select.
				if err2 := tx.QueryRowContext(ctx, `SELECT id FROM tags WHERE name=?`, skill).Scan(&tagID); err2 != nil {
					http.Error(w, "tag_create_failed", http.StatusInternalServerError)
					return
				}
			}

			_, err := tx.ExecContext(ctx,
				`INSERT INTO opportunity_tags (opportunity_id, tag_id)
				 VALUES (?,?)
				 ON CONFLICT DO NOTHING`,
				opportunityID, tagID,
			)
			if err != nil {
				http.Error(w, "tags_link_failed", http.StatusInternalServerError)
				return
			}
		}

		if err := tx.Commit(); err != nil {
			http.Error(w, "tx_commit_failed", http.StatusInternalServerError)
			return
		}

		WriteJSON(w, http.StatusCreated, map[string]any{
			"ok":              true,
			"opportunityId":  opportunityID,
			"moderationStatus": status,
		})
	}
}

func EmployerOpportunitiesList(cfg *config.Config, database *db.Database) http.HandlerFunc {
	_ = cfg
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		claims, ok := getClaims(r)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		companyID, err := employerCompanyID(ctx, database, claims.UserID)
		if err != nil {
			http.Error(w, "company_not_found", http.StatusForbidden)
			return
		}

		type EmployerOpportunityDTO struct {
			ID           string    `json:"id"`
			Title        string    `json:"title"`
			Company      string    `json:"company"`
			Type         string    `json:"type"`
			Status       string    `json:"status"`
			WorkFormat   string    `json:"workFormat"`
			LocationType string    `json:"locationType"`
			AddressText  *string   `json:"addressText"`
			CityText     *string   `json:"cityText"`
			Lat          float64   `json:"lat"`
			Lng          float64   `json:"lng"`
			SalaryMin    *int      `json:"salaryMin,omitempty"`
			SalaryMax    *int      `json:"salaryMax,omitempty"`
			Skills       []string  `json:"skills"`
		}

		// Query.
		rows, err := database.DB.QueryContext(ctx, `
			SELECT
				o.id,
				o.title,
				c.name AS company,
				o.type,
				o.status,
				o.work_format,
				o.location_type,
				o.address_text,
				o.city_text,
				COALESCE(o.lat,0), COALESCE(o.lng,0),
				o.salary_min, o.salary_max,
				COALESCE(GROUP_CONCAT(t.name, ','), '') as skills
			FROM opportunities o
			JOIN companies c ON c.id=o.employer_company_id
			LEFT JOIN opportunity_tags ot ON ot.opportunity_id=o.id
			LEFT JOIN tags t ON t.id=ot.tag_id
			WHERE o.employer_company_id=?
			GROUP BY o.id, c.name
			ORDER BY o.created_at DESC
		`, companyID)
		if err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var out []EmployerOpportunityDTO
		for rows.Next() {
			var it EmployerOpportunityDTO
			var salaryMin sql.NullInt32
			var salaryMax sql.NullInt32
			var addressText sql.NullString
			var cityText sql.NullString

			var lat, lng float64
			var skillsCSV string
			if err := rows.Scan(
				&it.ID,
				&it.Title,
				&it.Company,
				&it.Type,
				&it.Status,
				&it.WorkFormat,
				&it.LocationType,
				&addressText, &cityText,
				&lat, &lng,
				&salaryMin, &salaryMax,
				&skillsCSV,
			); err != nil {
				// simplify: if scan fails, just return empty list
				continue
			}

			if addressText.Valid {
				val := addressText.String
				it.AddressText = &val
			} else {
				it.AddressText = nil
			}
			if cityText.Valid {
				val := cityText.String
				it.CityText = &val
			} else {
				it.CityText = nil
			}
			it.Lat = lat
			it.Lng = lng
			it.Skills = parseSkillsCSV(skillsCSV)
			if salaryMin.Valid {
				val := int(salaryMin.Int32)
				it.SalaryMin = &val
			} else {
				it.SalaryMin = nil
			}
			if salaryMax.Valid {
				val := int(salaryMax.Int32)
				it.SalaryMax = &val
			} else {
				it.SalaryMax = nil
			}
			out = append(out, it)
		}

		WriteJSON(w, http.StatusOK, map[string]any{"items": out})
	}
}

