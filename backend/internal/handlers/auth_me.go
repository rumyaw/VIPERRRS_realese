package handlers

import (
	"context"
	"net/http"
	"time"

	"trumplin/internal/auth"
	"trumplin/internal/config"
	"trumplin/internal/db"
)

func Me(_ *config.Config, database *db.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		claims, ok := auth.UserClaimsFromContext(r.Context())
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var email, role, displayName, status string
		if err := database.DB.QueryRowContext(ctx,
			`SELECT email, role, display_name, status FROM users WHERE id=?`,
			claims.UserID,
		).Scan(&email, &role, &displayName, &status); err != nil {
			http.Error(w, "not_found", http.StatusNotFound)
			return
		}

		resp := map[string]any{
			"id":           claims.UserID,
			"email":        email,
			"role":         role,
			"displayName":  displayName,
			"status":       status,
		}

		// Enrich for employer.
		if role == "EMPLOYER" {
			var verificationStatus string
			_ = database.DB.QueryRowContext(ctx,
				`SELECT verification_status FROM companies WHERE owner_user_id=?`,
				claims.UserID,
			).Scan(&verificationStatus)
			resp["company"] = map[string]any{
				"verificationStatus": verificationStatus,
			}
		}

		WriteJSON(w, http.StatusOK, resp)
	}
}

