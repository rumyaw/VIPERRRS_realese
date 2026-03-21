package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"trumplin/internal/auth"
	"trumplin/internal/config"
	"trumplin/internal/db"
)

type registerRequest struct {
	Email       string  `json:"email"`
	Password    string  `json:"password"`
	Role        string  `json:"role"` // EMPLOYER | APPLICANT | ADMIN | CURATOR
	DisplayName string  `json:"displayName"`
	CompanyName *string `json:"companyName"`
	FullName    *string `json:"fullName"`
}

func Register(cfg *config.Config, database *db.Database, jwtSecret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var req registerRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad_request", http.StatusBadRequest)
			return
		}

		role, err := normalizeRole(req.Role)
		if err != nil {
			http.Error(w, "invalid_role", http.StatusBadRequest)
			return
		}
		if req.Email == "" || req.Password == "" || req.DisplayName == "" {
			http.Error(w, "missing_fields", http.StatusBadRequest)
			return
		}
		if role != "EMPLOYER" && role != "APPLICANT" {
			http.Error(w, "role_not_allowed", http.StatusBadRequest)
			return
		}

		pwHash, err := auth.HashPassword(req.Password)
		if err != nil {
			http.Error(w, "password_hash_error", http.StatusInternalServerError)
			return
		}

		var userID string
		tx, err := database.DB.BeginTx(ctx, nil)
		if err != nil {
			http.Error(w, "db_error", http.StatusInternalServerError)
			return
		}
		defer func() { _ = tx.Rollback() }()

		if err := tx.QueryRowContext(ctx,
			`INSERT INTO users (email, password_hash, role, status, display_name)
			 VALUES (?,?,?,'ACTIVE',?)
			 RETURNING id`,
			req.Email, pwHash, role, req.DisplayName,
		).Scan(&userID); err != nil {
			http.Error(w, "email_taken_or_db_error", http.StatusBadRequest)
			return
		}

		// Create role-specific profile.
		if role == "EMPLOYER" {
			if req.CompanyName == nil || strings.TrimSpace(*req.CompanyName) == "" {
				http.Error(w, "companyName_required", http.StatusBadRequest)
				return
			}
			if _, err := tx.ExecContext(ctx,
				`INSERT INTO companies (owner_user_id, name, description)
				 VALUES (?,?,?)`,
				userID, *req.CompanyName, "",
			); err != nil {
				http.Error(w, "company_create_failed", http.StatusInternalServerError)
				return
			}
		} else {
			if req.FullName == nil || strings.TrimSpace(*req.FullName) == "" {
				// Fallback to displayName.
				defaultFull := req.DisplayName
				req.FullName = &defaultFull
			}
			if _, err := tx.ExecContext(ctx,
				`INSERT INTO applicants_profiles (user_id, full_name, university, course, resume, portfolio)
				 VALUES (?,?,'', '', '', '{}')`,
				userID, *req.FullName,
			); err != nil {
				http.Error(w, "profile_create_failed", http.StatusInternalServerError)
				return
			}
			_, _ = tx.ExecContext(ctx, `INSERT INTO applicant_privacy (user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING`, userID)
		}

		if err := tx.Commit(); err != nil {
			http.Error(w, "tx_commit_failed", http.StatusInternalServerError)
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
		_, err = database.DB.ExecContext(ctx,
			`INSERT INTO refresh_tokens (token_hash, user_id, expires_at) VALUES (?,?,?)`,
			refreshHash, userID, time.Now().Add(refreshTTL),
		)
		if err != nil {
			http.Error(w, "refresh_store_failed", http.StatusInternalServerError)
			return
		}

		setCookie(w, "access_token", accessToken, time.Duration(cfg.Auth.AccessTokenTTLSeconds)*time.Second, true, cfg.Auth.CookieSecure)
		setCookie(w, "refresh_token", refreshToken, refreshTTL, true, cfg.Auth.CookieSecure)

		WriteJSON(w, http.StatusCreated, map[string]any{
			"ok":   true,
			"user": map[string]any{"id": userID, "role": role},
		})
	}
}

func normalizeRole(in string) (string, error) {
	switch strings.ToUpper(strings.TrimSpace(in)) {
	case "EMPLOYER", "EMPLOYER_USER", "EMPLOYER_ROLE":
		return "EMPLOYER", nil
	case "APPLICANT", "APPLICANT_USER", "APPLICANT_ROLE":
		return "APPLICANT", nil
	case "ADMIN":
		return "ADMIN", nil
	case "CURATOR":
		return "CURATOR", nil
	default:
		return "", errors.New("unknown_role")
	}
}
