package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"trumplin/internal/config"
	"trumplin/internal/db"
)

type ApplicantApplicationCreateRequest struct {
	OpportunityID string `json:"opportunityId"`
}

func ApplicantApplicationCreate(cfg *config.Config, database *db.Database) http.HandlerFunc {
	_ = cfg
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		claims, ok := getClaims(r)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req ApplicantApplicationCreateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad_request", http.StatusBadRequest)
			return
		}

		oppID := strings.TrimSpace(req.OpportunityID)
		if oppID == "" {
			http.Error(w, "opportunityId_required", http.StatusBadRequest)
			return
		}

		// Validate opportunity is public/active.
		var oppStatus string
		if err := database.DB.QueryRowContext(ctx, `
			SELECT status FROM opportunities WHERE id=?
		`, oppID).Scan(&oppStatus); err != nil {
			http.Error(w, "opportunity_not_found", http.StatusNotFound)
			return
		}
		switch oppStatus {
		case "APPROVED", "SCHEDULED":
		default:
			http.Error(w, "opportunity_not_available", http.StatusForbidden)
			return
		}

		// Insert or return existing.
		var applicationID string
		err := database.DB.QueryRowContext(ctx, `
			INSERT INTO applications (opportunity_id, applicant_user_id, status)
			VALUES (?, ?, 'PENDING')
			ON CONFLICT (opportunity_id, applicant_user_id)
			DO UPDATE SET updated_at=CURRENT_TIMESTAMP
			RETURNING id
		`, oppID, claims.UserID).Scan(&applicationID)
		if err != nil {
			http.Error(w, "application_create_failed", http.StatusInternalServerError)
			return
		}

		WriteJSON(w, http.StatusCreated, map[string]any{
			"ok":             true,
			"applicationId": applicationID,
		})
	}
}

func ApplicantApplicationsList(cfg *config.Config, database *db.Database) http.HandlerFunc {
	_ = cfg
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		claims, ok := getClaims(r)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		rows, err := database.DB.QueryContext(ctx, `
			SELECT
				a.id,
				o.id,
				o.title,
				o.type,
				c.name AS company,
				a.status,
				a.created_at,
				o.work_format,
				o.location_type,
				o.address_text,
				o.city_text,
				COALESCE(o.lat,0) AS lat,
				COALESCE(o.lng,0) AS lng,
				o.salary_min,
				o.salary_max,
				COALESCE(GROUP_CONCAT(t.name, ','), '') as skills
			FROM applications a
			JOIN opportunities o ON o.id=a.opportunity_id
			JOIN companies c ON c.id=o.employer_company_id
			LEFT JOIN opportunity_tags ot ON ot.opportunity_id=o.id
			LEFT JOIN tags t ON t.id=ot.tag_id
			WHERE a.applicant_user_id=?
			GROUP BY
				a.id, o.id, c.name,
				a.status, a.created_at,
				o.title, o.type,
				o.work_format, o.location_type,
				o.address_text, o.city_text,
				o.lat, o.lng,
				o.salary_min, o.salary_max
			ORDER BY a.created_at DESC
		`, claims.UserID)
		if err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type item struct {
			ID            string     `json:"id"`
			OpportunityID string    `json:"opportunityId"`
			Title         string    `json:"title"`
			Type          string    `json:"type"`
			Company       string    `json:"company"`
			Status        string    `json:"status"`
			CreatedAt     time.Time `json:"createdAt"`
			WorkFormat    string    `json:"workFormat"`
			LocationType  string    `json:"locationType"`
			AddressText   *string   `json:"addressText"`
			CityText      *string   `json:"cityText"`
			Lat           float64   `json:"lat"`
			Lng           float64   `json:"lng"`
			SalaryMin     *int      `json:"salaryMin,omitempty"`
			SalaryMax     *int      `json:"salaryMax,omitempty"`
			Skills        []string  `json:"skills"`
		}

		var out []item
		for rows.Next() {
			var it item
			var address sql.NullString
			var city sql.NullString
			var lat, lng float64
			var salaryMin sql.NullInt32
			var salaryMax sql.NullInt32
			var skillsCSV string
			if err := rows.Scan(
				&it.ID,
				&it.OpportunityID,
				&it.Title,
				&it.Type,
				&it.Company,
				&it.Status,
				&it.CreatedAt,
				&it.WorkFormat,
				&it.LocationType,
				&address,
				&city,
				&lat,
				&lng,
				&salaryMin,
				&salaryMax,
				&skillsCSV,
			); err != nil {
				continue
			}
			if address.Valid {
				val := address.String
				it.AddressText = &val
			}
			if city.Valid {
				val := city.String
				it.CityText = &val
			}
			it.Lat = lat
			it.Lng = lng
			it.Skills = parseSkillsCSV(skillsCSV)
			if salaryMin.Valid {
				val := int(salaryMin.Int32)
				it.SalaryMin = &val
			}
			if salaryMax.Valid {
				val := int(salaryMax.Int32)
				it.SalaryMax = &val
			}
			out = append(out, it)
		}

		WriteJSON(w, http.StatusOK, map[string]any{"items": out})
	}
}

