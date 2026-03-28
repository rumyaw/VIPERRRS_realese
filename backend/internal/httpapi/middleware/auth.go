package middleware

import (
	"context"
	"net/http"
	"strings"

	"tramplin/internal/auth"
	"tramplin/internal/httpapi/respond"
)

type ctxKey string

const UserIDKey ctxKey = "userID"
const UserRoleKey ctxKey = "userRole"
const UserEmailKey ctxKey = "userEmail"

func BearerJWT(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw := ""
			h := r.Header.Get("Authorization")
			if h != "" && strings.HasPrefix(strings.ToLower(h), "bearer ") {
				raw = strings.TrimSpace(h[7:])
			} else if c, err := r.Cookie("access_token"); err == nil {
				raw = strings.TrimSpace(c.Value)
			}
			if raw == "" {
				respond.Error(w, http.StatusUnauthorized, "missing auth token")
				return
			}
			claims, err := auth.ParseToken(secret, raw)
			if err != nil {
				respond.Error(w, http.StatusUnauthorized, "invalid token")
				return
			}
			if claims.Type != "access" {
				respond.Error(w, http.StatusUnauthorized, "invalid token type")
				return
			}
			uid, err := auth.SubjectUserID(claims)
			if err != nil {
				respond.Error(w, http.StatusUnauthorized, "invalid token")
				return
			}
			ctx := context.WithValue(r.Context(), UserIDKey, uid.String())
			ctx = context.WithValue(ctx, UserRoleKey, string(claims.Role))
			ctx = context.WithValue(ctx, UserEmailKey, claims.Email)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRoles(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		allowed[strings.TrimSpace(role)] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role, _ := r.Context().Value(UserRoleKey).(string)
			if role == "" {
				respond.Error(w, http.StatusForbidden, "forbidden")
				return
			}
			if _, ok := allowed[role]; !ok {
				respond.Error(w, http.StatusForbidden, "forbidden")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
