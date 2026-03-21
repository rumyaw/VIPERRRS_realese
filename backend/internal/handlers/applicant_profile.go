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

type ApplicantProfileUpdateRequest struct {
	FullName   *string  `json:"fullName"`
	University *string  `json:"university"`
	Course     *string  `json:"course"`
	Resume     *string  `json:"resume"`
	Portfolio  *any     `json:"portfolio"`
	Skills     []string `json:"skills"`
}

func ApplicantProfileUpdate(cfg *config.Config, database *db.Database) http.HandlerFunc {
	_ = cfg
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		claims, ok := getClaims(r)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req ApplicantProfileUpdateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad_request", http.StatusBadRequest)
			return
		}

		if req.FullName == nil || strings.TrimSpace(*req.FullName) == "" {
			http.Error(w, "fullName_required", http.StatusBadRequest)
			return
		}

		portfolioArg := any(nil)
		if req.Portfolio != nil {
			b, err := json.Marshal(req.Portfolio)
			if err != nil {
				http.Error(w, "portfolio_parse_failed", http.StatusBadRequest)
				return
			}
			portfolioArg = b
		}

		_, err := database.DB.Exec(ctx, `
			INSERT INTO applicants_profiles (user_id, full_name, university, course, resume, portfolio, skills)
			VALUES (
				$1,
				$2, $3, $4, $5,
				$6::jsonb,
				$7
			)
			ON CONFLICT (user_id) DO UPDATE SET
				full_name=COALESCE(EXCLUDED.full_name, applicants_profiles.full_name),
				university=COALESCE(EXCLUDED.university, applicants_profiles.university),
				course=COALESCE(EXCLUDED.course, applicants_profiles.course),
				resume=COALESCE(EXCLUDED.resume, applicants_profiles.resume),
				portfolio=COALESCE(EXCLUDED.portfolio, applicants_profiles.portfolio),
				skills=COALESCE(EXCLUDED.skills, applicants_profiles.skills)
		`,
			claims.UserID,
			*req.FullName,
			req.University,
			req.Course,
			req.Resume,
			portfolioArg,
			req.Skills,
		)
		if err != nil {
			http.Error(w, "profile_update_failed", http.StatusInternalServerError)
			return
		}

		WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
	}
}

type ApplicantPrivacyUpdateRequest struct {
	HideApplications      *bool `json:"hideApplications"`
	HideResume            *bool `json:"hideResume"`
	AllowNetworkProfiles  *bool `json:"allowNetworkProfiles"`
}

func ApplicantPrivacyUpdate(cfg *config.Config, database *db.Database) http.HandlerFunc {
	_ = cfg
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		claims, ok := getClaims(r)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req ApplicantPrivacyUpdateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad_request", http.StatusBadRequest)
			return
		}

		_, err := database.DB.Exec(ctx, `
			INSERT INTO applicant_privacy (user_id, hide_applications, hide_resume, allow_network_profiles)
			VALUES (
				$1,
				COALESCE($2,false),
				COALESCE($3,true),
				COALESCE($4,true)
			)
			ON CONFLICT (user_id) DO UPDATE SET
				hide_applications=EXCLUDED.hide_applications,
				hide_resume=EXCLUDED.hide_resume,
				allow_network_profiles=EXCLUDED.allow_network_profiles
		`,
			claims.UserID,
			req.HideApplications,
			req.HideResume,
			req.AllowNetworkProfiles,
		)
		if err != nil {
			http.Error(w, "privacy_update_failed", http.StatusInternalServerError)
			return
		}

		WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
	}
}

