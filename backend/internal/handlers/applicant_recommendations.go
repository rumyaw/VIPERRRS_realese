package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"trumplin/internal/config"
	"trumplin/internal/db"
)

type ApplicantRecommendationCreateRequest struct {
	TargetUserID  string `json:"targetUserId"`
	OpportunityID string `json:"opportunityId"`
	Message       string `json:"message"`
}

func ApplicantRecommendationCreate(cfg *config.Config, database *db.Database) http.HandlerFunc {
	_ = cfg
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		claims, ok := getClaims(r)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req ApplicantRecommendationCreateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad_request", http.StatusBadRequest)
			return
		}

		targetID := strings.TrimSpace(req.TargetUserID)
		opportunityID := strings.TrimSpace(req.OpportunityID)
		message := strings.TrimSpace(req.Message)

		if targetID == "" || opportunityID == "" {
			http.Error(w, "targetUserId_and_opportunityId_required", http.StatusBadRequest)
			return
		}
		if targetID == claims.UserID {
			http.Error(w, "cannot_recommend_to_self", http.StatusBadRequest)
			return
		}

		// Check target is in requester's contacts.
		var exists bool
		if err := database.DB.QueryRowContext(ctx, `
			SELECT EXISTS(
				SELECT 1 FROM network_contacts
				WHERE requester_user_id = ? AND target_user_id = ?
			)
		`, claims.UserID, targetID).Scan(&exists); err != nil || !exists {
			http.Error(w, "target_not_in_contacts", http.StatusForbidden)
			return
		}

		// Check opportunity is available (APPROVED or SCHEDULED).
		var status string
		if err := database.DB.QueryRowContext(ctx, `SELECT status FROM opportunities WHERE id = ?`, opportunityID).Scan(&status); err != nil {
			http.Error(w, "opportunity_not_found", http.StatusNotFound)
			return
		}
		if status != "APPROVED" && status != "SCHEDULED" {
			http.Error(w, "opportunity_not_available", http.StatusForbidden)
			return
		}

		_, err := database.DB.ExecContext(ctx, `
			INSERT INTO applicant_recommendations (from_user_id, to_user_id, opportunity_id, message)
			VALUES (?, ?, ?, ?)
			ON CONFLICT (from_user_id, to_user_id, opportunity_id) DO UPDATE SET
				message = excluded.message
		`, claims.UserID, targetID, opportunityID, message)
		if err != nil {
			http.Error(w, "recommendation_create_failed", http.StatusInternalServerError)
			return
		}

		WriteJSON(w, http.StatusCreated, map[string]any{"ok": true})
	}
}

func ApplicantRecommendationInbox(cfg *config.Config, database *db.Database) http.HandlerFunc {
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
				ar.id,
				ar.from_user_id,
				COALESCE(ap.full_name, u.display_name, '') AS from_name,
				ar.opportunity_id,
				o.title,
				c.name AS company,
				o.work_format,
				o.location_type,
				o.address_text,
				o.city_text,
				COALESCE(o.lat, 0),
				COALESCE(o.lng, 0),
				COALESCE(o.salary_min, 0),
				COALESCE(o.salary_max, 0),
				COALESCE(GROUP_CONCAT(t.name, ','), '') AS skills,
				COALESCE(ar.message, ''),
				ar.created_at
			FROM applicant_recommendations ar
			JOIN users u ON u.id = ar.from_user_id
			LEFT JOIN applicants_profiles ap ON ap.user_id = ar.from_user_id
			JOIN opportunities o ON o.id = ar.opportunity_id
			JOIN companies c ON c.id = o.employer_company_id
			LEFT JOIN opportunity_tags ot ON ot.opportunity_id = o.id
			LEFT JOIN tags t ON t.id = ot.tag_id
			WHERE ar.to_user_id = ?
			GROUP BY
				ar.id, ar.from_user_id, from_name,
				ar.opportunity_id, o.title, c.name,
				o.work_format, o.location_type, o.address_text, o.city_text,
				o.lat, o.lng, o.salary_min, o.salary_max,
				ar.message, ar.created_at
			ORDER BY ar.created_at DESC
		`, claims.UserID)
		if err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type item struct {
			ID            string   `json:"id"`
			FromUserID    string   `json:"fromUserId"`
			FromName      string   `json:"fromName"`
			OpportunityID string   `json:"opportunityId"`
			Title         string   `json:"title"`
			Company       string   `json:"company"`
			WorkFormat    string   `json:"workFormat"`
			LocationType  string   `json:"locationType"`
			AddressText   *string  `json:"addressText,omitempty"`
			CityText      *string  `json:"cityText,omitempty"`
			Lat           float64  `json:"lat"`
			Lng           float64  `json:"lng"`
			SalaryMin     int      `json:"salaryMin,omitempty"`
			SalaryMax     int      `json:"salaryMax,omitempty"`
			Skills        []string `json:"skills"`
			Message       string   `json:"message,omitempty"`
			CreatedAt     string   `json:"createdAt"`
		}

		var out []item
		for rows.Next() {
			var it item
			var address, city string
			var skillsCSV string
			if err := rows.Scan(
				&it.ID,
				&it.FromUserID,
				&it.FromName,
				&it.OpportunityID,
				&it.Title,
				&it.Company,
				&it.WorkFormat,
				&it.LocationType,
				&address,
				&city,
				&it.Lat,
				&it.Lng,
				&it.SalaryMin,
				&it.SalaryMax,
				&skillsCSV,
				&it.Message,
				&it.CreatedAt,
			); err != nil {
				continue
			}
			if address != "" {
				it.AddressText = &address
			}
			if city != "" {
				it.CityText = &city
			}
			it.Skills = parseSkillsCSV(skillsCSV)
			out = append(out, it)
		}

		WriteJSON(w, http.StatusOK, map[string]any{"items": out})
	}
}

