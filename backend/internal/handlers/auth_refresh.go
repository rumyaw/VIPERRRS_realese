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

func Refresh(cfg *config.Config, database *db.Database, jwtSecret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		refreshCookie, err := r.Cookie("refresh_token")
		if err != nil || refreshCookie == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		refreshHash := auth.HashRefreshToken(refreshCookie.Value)

		var userID string
		var expiresAt time.Time
		var revokedAt *time.Time
		if err := database.DB.QueryRowContext(ctx,
			`SELECT user_id, expires_at, revoked_at
			 FROM refresh_tokens
			 WHERE token_hash=?`,
			refreshHash,
		).Scan(&userID, &expiresAt, &revokedAt); err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		if revokedAt != nil || time.Now().After(expiresAt) {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var role string
		if err := database.DB.QueryRowContext(ctx, `SELECT role FROM users WHERE id=?`, userID).Scan(&role); err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		newRefreshToken, err := auth.NewRefreshToken()
		if err != nil {
			http.Error(w, "refresh_token_error", http.StatusInternalServerError)
			return
		}
		newRefreshHash := auth.HashRefreshToken(newRefreshToken)
		refreshTTL := 30 * 24 * time.Hour

		accessToken, err := auth.NewAccessToken(jwtSecret, userID, role, cfg.Auth.AccessTokenTTLSeconds)
		if err != nil {
			http.Error(w, "token_error", http.StatusInternalServerError)
			return
		}

		tx, err := database.DB.BeginTx(ctx, nil)
		if err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}
		defer func() { _ = tx.Rollback() }()

		// Rotate: revoke old refresh token, insert new one.
		if _, err := tx.ExecContext(ctx, `DELETE FROM refresh_tokens WHERE token_hash=?`, refreshHash); err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}

		if _, err := tx.ExecContext(ctx,
			`INSERT INTO refresh_tokens (token_hash, user_id, expires_at)
			 VALUES (?,?,?)`,
			newRefreshHash, userID, time.Now().Add(refreshTTL),
		); err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}

		if err := tx.Commit(); err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}

		setCookie(w, "access_token", accessToken, time.Duration(cfg.Auth.AccessTokenTTLSeconds)*time.Second, true, cfg.Auth.CookieSecure)
		setCookie(w, "refresh_token", newRefreshToken, refreshTTL, true, cfg.Auth.CookieSecure)

		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok":   true,
			"user": map[string]any{"id": userID, "role": role},
		})
	}
}

