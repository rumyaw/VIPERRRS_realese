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

type ApplicantContactsCreateRequest struct {
	TargetUserID string `json:"targetUserId"`
	Email        string `json:"email"`
}

func ApplicantContactsCreate(cfg *config.Config, database *db.Database) http.HandlerFunc {
	_ = cfg
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		claims, ok := getClaims(r)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req ApplicantContactsCreateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad_request", http.StatusBadRequest)
			return
		}

		targetID := strings.TrimSpace(req.TargetUserID)
		
		// If email is provided, look up user by email
		if targetID == "" && req.Email != "" {
			email := strings.TrimSpace(req.Email)
			if email == "" {
				http.Error(w, "email_required", http.StatusBadRequest)
				return
			}
			var foundID string
			if err := database.DB.QueryRow(ctx, `
				SELECT id FROM users WHERE email=$1 AND role='APPLICANT'
			`, email).Scan(&foundID); err != nil {
				http.Error(w, "user_not_found", http.StatusNotFound)
				return
			}
			targetID = foundID
		}

		if targetID == "" {
			http.Error(w, "targetUserId_or_email_required", http.StatusBadRequest)
			return
		}
		if targetID == claims.UserID {
			http.Error(w, "self_contact_not_allowed", http.StatusBadRequest)
			return
		}

		// Target should allow network profiles and must be an applicant.
		var allow bool
		if err := database.DB.QueryRow(ctx, `
			SELECT COALESCE(p.allow_network_profiles,false)
			FROM users u
			LEFT JOIN applicant_privacy p ON p.user_id=u.id
			WHERE u.id=$1 AND u.role='APPLICANT'
		`, targetID).Scan(&allow); err != nil || !allow {
			http.Error(w, "target_not_available", http.StatusForbidden)
			return
		}

		if _, err := database.DB.Exec(ctx, `
			INSERT INTO network_contacts (requester_user_id, target_user_id)
			VALUES ($1,$2)
			ON CONFLICT (requester_user_id, target_user_id) DO NOTHING
		`, claims.UserID, targetID); err != nil {
			http.Error(w, "contact_create_failed", http.StatusInternalServerError)
			return
		}

		WriteJSON(w, http.StatusCreated, map[string]any{"ok": true})
	}
}

func ApplicantContactsList(cfg *config.Config, database *db.Database) http.HandlerFunc {
	_ = cfg
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		claims, ok := getClaims(r)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		rows, err := database.DB.Query(ctx, `
			SELECT
				nc.target_user_id::text,
				COALESCE(ap.full_name, u.display_name, '') AS full_name,
				nc.created_at
			FROM network_contacts nc
			JOIN users u ON u.id=nc.target_user_id
			LEFT JOIN applicants_profiles ap ON ap.user_id=nc.target_user_id
			JOIN applicant_privacy p ON p.user_id=nc.target_user_id
			WHERE nc.requester_user_id=$1 AND p.allow_network_profiles=true
			ORDER BY nc.created_at DESC
		`, claims.UserID)
		if err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type item struct {
			TargetUserID string    `json:"targetUserId"`
			FullName      string    `json:"fullName"`
			CreatedAt     time.Time `json:"createdAt"`
		}

		var out []item
		for rows.Next() {
			var it item
			if err := rows.Scan(&it.TargetUserID, &it.FullName, &it.CreatedAt); err != nil {
				continue
			}
			out = append(out, it)
		}

		WriteJSON(w, http.StatusOK, map[string]any{"items": out})
	}
}

