package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"tramplin/internal/auth"
	"tramplin/internal/domain"
	"tramplin/internal/httpapi/middleware"
	"tramplin/internal/httpapi/respond"
	"tramplin/internal/repository"
	"tramplin/internal/service"
)

type Auth struct {
	Svc   *service.AuthService
	Users *repository.UserRepository
}

type registerBody struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
}

type loginBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Auth) Register(w http.ResponseWriter, r *http.Request) {
	var body registerBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	role := domain.UserRole(body.Role)
	in := domain.RegisterInput{
		Email:       body.Email,
		Password:    body.Password,
		DisplayName: body.DisplayName,
		Role:        role,
	}
	u, accessToken, err := h.Svc.Register(r.Context(), in)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrEmailTaken):
			respond.Error(w, http.StatusConflict, "email already registered")
		case errors.Is(err, service.ErrInvalidRole):
			respond.Error(w, http.StatusBadRequest, "role must be applicant or employer")
		default:
			respond.Error(w, http.StatusBadRequest, err.Error())
		}
		return
	}
	refreshToken, err := h.Svc.IssueRefreshToken(u)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "token generation failed")
		return
	}
	setAuthCookies(w, accessToken, refreshToken)
	respond.JSON(w, http.StatusCreated, map[string]any{"user": h.userDTO(r.Context(), u)})
}

func (h *Auth) Login(w http.ResponseWriter, r *http.Request) {
	var body loginBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	u, accessToken, err := h.Svc.Login(r.Context(), body.Email, body.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			respond.Error(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		respond.Error(w, http.StatusInternalServerError, "login failed")
		return
	}
	refreshToken, err := h.Svc.IssueRefreshToken(u)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "token generation failed")
		return
	}
	setAuthCookies(w, accessToken, refreshToken)
	respond.JSON(w, http.StatusOK, map[string]any{"user": h.userDTO(r.Context(), u)})
}

func (h *Auth) Refresh(w http.ResponseWriter, r *http.Request) {
	refreshCookie, err := r.Cookie("refresh_token")
	if err != nil || refreshCookie.Value == "" {
		respond.Error(w, http.StatusUnauthorized, "missing refresh token")
		return
	}
	claims, err := auth.ParseToken(h.Svc.JWTSecret(), refreshCookie.Value)
	if err != nil || claims.Type != "refresh" {
		respond.Error(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}
	u, err := h.Svc.Me(r.Context(), claims.Subject)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "user not found")
		return
	}
	accessToken, err := auth.SignAccessToken(h.Svc.JWTSecret(), u.ID, u.Email, u.Role)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "token generation failed")
		return
	}
	newRefreshToken, err := h.Svc.IssueRefreshToken(u)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "token generation failed")
		return
	}
	setAuthCookies(w, accessToken, newRefreshToken)
	respond.JSON(w, http.StatusOK, map[string]any{"user": h.userDTO(r.Context(), u)})
}

func (h *Auth) Logout(w http.ResponseWriter, _ *http.Request) {
	clearAuthCookies(w)
	respond.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

// NginxGrafanaAuth — для nginx auth_request: только куратор с валидным JWT (cookie access_token или Bearer).
// Заголовок X-Webauth-User передаётся в Grafana (auth proxy).
func (h *Auth) NginxGrafanaAuth(w http.ResponseWriter, r *http.Request) {
	email, _ := r.Context().Value(middleware.UserEmailKey).(string)
	if email == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	w.Header().Set("X-Webauth-User", email)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Auth) Me(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || uid == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	u, err := h.Svc.Me(r.Context(), uid)
	if err != nil {
		respond.Error(w, http.StatusNotFound, "user not found")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"user": h.userDTO(r.Context(), u)})
}

func (h *Auth) userDTO(ctx context.Context, u *domain.User) map[string]any {
	out := map[string]any{
		"id":          u.ID.String(),
		"email":       u.Email,
		"displayName": u.DisplayName,
		"role":        u.Role,
	}
	if h.Users == nil {
		return out
	}
	if u.Role == domain.RoleApplicant {
		if p, err := h.Users.GetApplicantProfile(ctx, u.ID); err == nil && p != nil {
			out["applicant"] = map[string]any{
				"fullName":        p.FullName,
				"university":      p.University,
				"courseOrYear":    p.CourseOrYear,
				"skills":          p.Skills,
				"bio":             p.Bio,
				"repoLinks":       p.RepoLinks,
				"avatarDataUrl":   p.AvatarURL,
				"jobSearchStatus": p.JobSearchStatus,
				"resume":          p.Resume,
				"privacy":         p.Privacy,
			}
		}
	}
	if u.Role == domain.RoleEmployer {
		if p, err := h.Users.GetEmployerProfile(ctx, u.ID); err == nil && p != nil {
			out["employer"] = map[string]any{
				"companyName": p.CompanyName,
				"description": p.Description,
				"industry":    p.Industry,
				"website":     p.Website,
				"socials":     p.Socials,
				"inn":         p.INN,
				"verified":    p.Verified,
				"logoDataUrl": p.LogoURL,
			}
		}
	}
	return out
}

func setAuthCookies(w http.ResponseWriter, accessToken, refreshToken string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(20 * time.Minute),
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(14 * 24 * time.Hour),
	})
}

func clearAuthCookies(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}
