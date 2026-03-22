package httpapi

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"tramplin/internal/config"
	h "tramplin/internal/httpapi/handlers"
	mw "tramplin/internal/httpapi/middleware"
	"tramplin/internal/service"
)

func NewRouter(cfg config.Config, authSvc *service.AuthService, oppSvc *service.OpportunityService) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(mw.CORS(cfg.CORSOrigins))

	authH := &h.Auth{Svc: authSvc}
	oppH := &h.Opportunities{Svc: oppSvc}

	r.Get("/health", h.HealthOK)
	r.Get("/api/v1/health", h.HealthOK)

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/auth/register", authH.Register)
		r.Post("/auth/login", authH.Login)
		r.Get("/opportunities", oppH.List)
		r.Get("/opportunities/{id}", oppH.Get)

		r.Group(func(r chi.Router) {
			r.Use(mw.BearerJWT(cfg.JWTSecret))
			r.Get("/auth/me", authH.Me)
		})
	})

	return r
}
