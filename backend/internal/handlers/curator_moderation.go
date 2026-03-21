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

func CuratorCompaniesPendingList(cfg *config.Config, database *db.Database) http.HandlerFunc {
	_ = cfg
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		// claims check is done by middleware.
		rows, err := database.DB.QueryContext(ctx, `
			SELECT
				c.id,
				c.owner_user_id,
				c.name,
				c.description,
				c.verification_status,
				c.created_at
			FROM companies c
			WHERE c.verification_status='PENDING'
			ORDER BY c.created_at DESC
			LIMIT 200
		`)
		if err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type item struct {
			ID                 string    `json:"id"`
			OwnerUserID        string    `json:"ownerUserId"`
			Name               string    `json:"name"`
			Description        *string   `json:"description"`
			VerificationStatus string   `json:"verificationStatus"`
			CreatedAt          time.Time `json:"createdAt"`
		}

		var out []item
		for rows.Next() {
			var it item
			var desc sql.NullString
			if err := rows.Scan(&it.ID, &it.OwnerUserID, &it.Name, &desc, &it.VerificationStatus, &it.CreatedAt); err != nil {
				continue
			}
			if desc.Valid {
				val := desc.String
				it.Description = &val
			}
			out = append(out, it)
		}

		WriteJSON(w, http.StatusOK, map[string]any{"items": out})
	}
}

type CuratorCompanyVerificationRequest struct {
	Status  string `json:"status"` // APPROVED|REJECTED
	Comment string `json:"comment"`
}

func CuratorCompanyVerification(cfg *config.Config, database *db.Database) http.HandlerFunc {
	_ = cfg
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		claims, ok := getClaims(r)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		companyId := strings.TrimSpace(r.PathValue("companyId"))
		if companyId == "" {
			http.Error(w, "companyId_required", http.StatusBadRequest)
			return
		}

		var req CuratorCompanyVerificationRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad_request", http.StatusBadRequest)
			return
		}
		status := strings.ToUpper(strings.TrimSpace(req.Status))
		if status != "APPROVED" && status != "REJECTED" {
			http.Error(w, "invalid_status", http.StatusBadRequest)
			return
		}

		comment := strings.TrimSpace(req.Comment)

		tx, err := database.DB.BeginTx(ctx, nil)
		if err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}
		defer func() { _ = tx.Rollback() }()

		if _, err := tx.ExecContext(ctx, `
			UPDATE companies SET verification_status=?, updated_at=CURRENT_TIMESTAMP
			WHERE id=?
		`, status, companyId); err != nil {
			http.Error(w, "company_update_failed", http.StatusBadRequest)
			return
		}

		if _, err := tx.ExecContext(ctx, `
			INSERT INTO company_verifications (company_id, curator_user_id, status, comment)
			VALUES (?,?,?,?)
		`, companyId, claims.UserID, status, comment); err != nil {
			http.Error(w, "company_verification_failed", http.StatusInternalServerError)
			return
		}

		if err := tx.Commit(); err != nil {
			http.Error(w, "tx_commit_failed", http.StatusInternalServerError)
			return
		}

		WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
	}
}

func CuratorOpportunitiesPendingList(cfg *config.Config, database *db.Database) http.HandlerFunc {
	_ = cfg
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		rows, err := database.DB.QueryContext(ctx, `
			SELECT
				o.id,
				o.title,
				o.type,
				o.work_format,
				o.location_type,
				o.status,
				c.name AS company,
				o.created_at
			FROM opportunities o
			JOIN companies c ON c.id=o.employer_company_id
			WHERE o.status='PENDING'
			ORDER BY o.created_at DESC
			LIMIT 200
		`)
		if err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type item struct {
			ID            string    `json:"id"`
			Title         string    `json:"title"`
			Type          string    `json:"type"`
			WorkFormat    string    `json:"workFormat"`
			LocationType  string    `json:"locationType"`
			Status        string    `json:"status"`
			Company       string    `json:"company"`
			CreatedAt     time.Time `json:"createdAt"`
		}

		var out []item
		for rows.Next() {
			var it item
			if err := rows.Scan(&it.ID, &it.Title, &it.Type, &it.WorkFormat, &it.LocationType, &it.Status, &it.Company, &it.CreatedAt); err != nil {
				continue
			}
			out = append(out, it)
		}

		WriteJSON(w, http.StatusOK, map[string]any{"items": out})
	}
}

type CuratorOpportunityStatusUpdateRequest struct {
	Status string `json:"status"` // APPROVED|REJECTED|SCHEDULED|CLOSED
}

func CuratorOpportunityStatusUpdate(cfg *config.Config, database *db.Database) http.HandlerFunc {
	_ = cfg
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		claims, ok := getClaims(r)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		opportunityId := strings.TrimSpace(r.PathValue("opportunityId"))
		if opportunityId == "" {
			http.Error(w, "opportunityId_required", http.StatusBadRequest)
			return
		}

		var req CuratorOpportunityStatusUpdateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad_request", http.StatusBadRequest)
			return
		}
		status := strings.ToUpper(strings.TrimSpace(req.Status))
		switch status {
		case "APPROVED", "REJECTED", "SCHEDULED", "CLOSED":
		default:
			http.Error(w, "invalid_status", http.StatusBadRequest)
			return
		}

		res, err := database.DB.ExecContext(ctx, `
			UPDATE opportunities
			SET status=?,
				updated_at=CURRENT_TIMESTAMP,
				curator_user_id=?
			WHERE id=?
		`, status, claims.UserID, opportunityId)
		if err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}
		affected, _ := res.RowsAffected()
		if affected == 0 {
			http.Error(w, "not_found", http.StatusNotFound)
			return
		}

		WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
	}
}

