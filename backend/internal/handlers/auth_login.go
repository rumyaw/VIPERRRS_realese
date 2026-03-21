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

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Login(cfg *config.Config, database *db.Database, jwtSecret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var req loginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad_request", http.StatusBadRequest)
			return
		}
		if req.Email == "" || req.Password == "" {
			http.Error(w, "missing_fields", http.StatusBadRequest)
			return
		}

		var userID string
		var role string
		var status string
		var passwordHash string
		if err := database.DB.QueryRowContext(ctx,
			`SELECT id, role, status, password_hash FROM users WHERE email=?`,
			req.Email,
		).Scan(&userID, &role, &status, &passwordHash); err != nil {
			http.Error(w, "invalid_credentials", http.StatusUnauthorized)
			return
		}

		if status != "ACTIVE" {
			http.Error(w, "account_not_active", http.StatusForbidden)
			return
		}

		ok, err := auth.VerifyPassword(req.Password, passwordHash)
		if err != nil || !ok {
			http.Error(w, "invalid_credentials", http.StatusUnauthorized)
			return
		}

		accessToken, err := auth.NewAccessToken(jwtSecret, userID, role, cfg.Auth.AccessTokenTTLSeconds)
		if err != nil {
			http.Error(w, "token_error", http.StatusInternalServerError)
			return
		}

		refreshToken, err := auth.NewRefreshToken()
		if err != nil {
			http.Error(w, "token_error", http.StatusInternalServerError)
			return
		}
		refreshHash := auth.HashRefreshToken(refreshToken)
		refreshTTL := 30 * 24 * time.Hour

		if _, err := database.DB.ExecContext(ctx,
			`INSERT INTO refresh_tokens (token_hash, user_id, expires_at) VALUES (?,?,?)`,
			refreshHash, userID, time.Now().Add(refreshTTL),
		); err != nil {
			http.Error(w, "refresh_store_failed", http.StatusInternalServerError)
			return
		}

		setCookie(w, "access_token", accessToken, time.Duration(cfg.Auth.AccessTokenTTLSeconds)*time.Second, true, cfg.Auth.CookieSecure)
		setCookie(w, "refresh_token", refreshToken, refreshTTL, true, cfg.Auth.CookieSecure)

		WriteJSON(w, http.StatusOK, map[string]any{
			"ok":   true,
			"user": map[string]any{"id": userID, "role": role},
		})
	}
}
