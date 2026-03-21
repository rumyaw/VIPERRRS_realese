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

func EmployerApplicationsList(cfg *config.Config, database *db.Database) http.HandlerFunc {
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

		rows, err := database.DB.QueryContext(ctx, `
			SELECT
				a.id,
				o.id,
				o.title,
				a.applicant_user_id,
				COALESCE(ap.full_name, u.display_name, '') AS full_name,
				a.status,
				a.created_at
			FROM applications a
			JOIN opportunities o ON o.id=a.opportunity_id
			JOIN users u ON u.id=a.applicant_user_id
			LEFT JOIN applicants_profiles ap ON ap.user_id=a.applicant_user_id
			WHERE o.employer_company_id=?
			ORDER BY a.created_at DESC
		`, companyID)
		if err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type item struct {
			ID             string    `json:"id"`
			OpportunityID string    `json:"opportunityId"`
			OpportunityTitle string `json:"opportunityTitle"`
			ApplicantID    string    `json:"applicantId"`
			ApplicantName  string    `json:"applicantName"`
			Status         string    `json:"status"`
			CreatedAt      time.Time `json:"createdAt"`
		}

		var out []item
		for rows.Next() {
			var it item
			if err := rows.Scan(&it.ID, &it.OpportunityID, &it.OpportunityTitle, &it.ApplicantID, &it.ApplicantName, &it.Status, &it.CreatedAt); err != nil {
				continue
			}
			out = append(out, it)
		}

		WriteJSON(w, http.StatusOK, map[string]any{"items": out})
	}
}

type EmployerApplicationStatusUpdateRequest struct {
	Status string `json:"status"` // ACCEPTED|DECLINED|RESERVED
}

func EmployerApplicationStatusUpdate(cfg *config.Config, database *db.Database) http.HandlerFunc {
	_ = cfg
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		claims, ok := getClaims(r)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		applicationId := strings.TrimSpace(r.PathValue("applicationId"))
		if applicationId == "" {
			http.Error(w, "missing_applicationId", http.StatusBadRequest)
			return
		}

		var req EmployerApplicationStatusUpdateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad_request", http.StatusBadRequest)
			return
		}
		status := strings.ToUpper(strings.TrimSpace(req.Status))
		switch status {
		case "ACCEPTED", "DECLINED", "RESERVED":
		default:
			http.Error(w, "invalid_status", http.StatusBadRequest)
			return
		}

		companyID, err := employerCompanyID(ctx, database, claims.UserID)
		if err != nil {
			http.Error(w, "company_not_found", http.StatusForbidden)
			return
		}

		res, err := database.DB.ExecContext(ctx, `
			UPDATE applications a
			SET status=?, updated_at=CURRENT_TIMESTAMP
			FROM opportunities o
			WHERE a.id=?
				AND o.id=a.opportunity_id
				AND o.employer_company_id=?
			`, status, applicationId, companyID)
		if err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}

		n, _ := res.RowsAffected()
		if n == 0 {
			http.Error(w, "not_found_or_forbidden", http.StatusNotFound)
			return
		}

		WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
	}
}

