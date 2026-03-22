package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"tramplin/internal/domain"
	"tramplin/internal/httpapi/middleware"
	"tramplin/internal/httpapi/respond"
	"tramplin/internal/service"
)

type Auth struct {
	Svc *service.AuthService
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
	u, token, err := h.Svc.Register(r.Context(), in)
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
	respond.JSON(w, http.StatusCreated, map[string]any{"user": userDTO(u), "accessToken": token})
}

func (h *Auth) Login(w http.ResponseWriter, r *http.Request) {
	var body loginBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	u, token, err := h.Svc.Login(r.Context(), body.Email, body.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			respond.Error(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		respond.Error(w, http.StatusInternalServerError, "login failed")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"user": userDTO(u), "accessToken": token})
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
	respond.JSON(w, http.StatusOK, map[string]any{"user": userDTO(u)})
}

func userDTO(u *domain.User) map[string]any {
	return map[string]any{
		"id":          u.ID.String(),
		"email":       u.Email,
		"displayName": u.DisplayName,
		"role":        u.Role,
	}
}
