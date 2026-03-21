package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"trumplin/internal/auth"
	"trumplin/internal/config"
	"trumplin/internal/db"
)

func Logout(_ *config.Config, database *db.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		refreshCookie, err := r.Cookie("refresh_token")
		if err == nil && refreshCookie != nil {
			refreshHash := auth.HashRefreshToken(refreshCookie.Value)
			_, _ = database.DB.ExecContext(ctx, `DELETE FROM refresh_tokens WHERE token_hash=?`, refreshHash)
		}

		clearCookie(w, "access_token")
		clearCookie(w, "refresh_token")

		// Ignore errors to avoid leaking.
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true})
	}
}

