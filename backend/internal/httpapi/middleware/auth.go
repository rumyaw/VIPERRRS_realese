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

func BearerJWT(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			if h == "" || !strings.HasPrefix(strings.ToLower(h), "bearer ") {
				respond.Error(w, http.StatusUnauthorized, "missing bearer token")
				return
			}
			raw := strings.TrimSpace(h[7:])
			claims, err := auth.ParseToken(secret, raw)
			if err != nil {
				respond.Error(w, http.StatusUnauthorized, "invalid token")
				return
			}
			uid, err := auth.SubjectUserID(claims)
			if err != nil {
				respond.Error(w, http.StatusUnauthorized, "invalid token")
				return
			}
			ctx := context.WithValue(r.Context(), UserIDKey, uid.String())
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
