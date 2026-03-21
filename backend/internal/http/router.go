package http

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"trumplin/internal/auth"
	"trumplin/internal/config"
	"trumplin/internal/db"
	"trumplin/internal/handlers"
)

type RouterConfig struct {
	Cfg        *config.Config
	Database   *db.Database
	JWTSecret  string
}

func NewRouter(cfg RouterConfig) http.Handler {
	r := chi.NewRouter()

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.Cfg.HTTP.CorsOrigin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"X-CSRF-Token"},
		AllowCredentials: true,
		MaxAge:           int((30 * time.Minute).Seconds()),
	}))

	r.Get("/api/health", handlers.Health)

	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", handlers.Register(cfg.Cfg, cfg.Database, cfg.JWTSecret))
		r.Post("/login", handlers.Login(cfg.Cfg, cfg.Database, cfg.JWTSecret))
		r.Post("/logout", handlers.Logout(cfg.Cfg, cfg.Database))
		// Refresh rotates refresh token and issues a new access token.
		r.Post("/refresh", handlers.Refresh(cfg.Cfg, cfg.Database, cfg.JWTSecret))
	})

	r.With(auth.AuthMiddleware(cfg.JWTSecret)).Get("/api/me", handlers.Me(cfg.Cfg, cfg.Database))

	r.With(auth.AuthMiddleware(cfg.JWTSecret)).Route("/api/employer", func(r chi.Router) {
		r.With(auth.RequireRoles("EMPLOYER")).Get("/opportunities", handlers.EmployerOpportunitiesList(cfg.Cfg, cfg.Database))
		r.With(auth.RequireRoles("EMPLOYER")).Post("/opportunities", handlers.EmployerOpportunitiesCreate(cfg.Cfg, cfg.Database))
		r.With(auth.RequireRoles("EMPLOYER")).Get("/applications", handlers.EmployerApplicationsList(cfg.Cfg, cfg.Database))
		r.With(auth.RequireRoles("EMPLOYER")).Patch("/applications/{applicationId}", handlers.EmployerApplicationStatusUpdate(cfg.Cfg, cfg.Database))
	})

	r.With(auth.AuthMiddleware(cfg.JWTSecret)).Route("/api/applicant", func(r chi.Router) {
		r.With(auth.RequireRoles("APPLICANT")).Patch("/profile", handlers.ApplicantProfileUpdate(cfg.Cfg, cfg.Database))
		r.With(auth.RequireRoles("APPLICANT")).Patch("/privacy", handlers.ApplicantPrivacyUpdate(cfg.Cfg, cfg.Database))
		r.With(auth.RequireRoles("APPLICANT")).Get("/applications", handlers.ApplicantApplicationsList(cfg.Cfg, cfg.Database))
		r.With(auth.RequireRoles("APPLICANT")).Post("/applications", handlers.ApplicantApplicationCreate(cfg.Cfg, cfg.Database))
		r.With(auth.RequireRoles("APPLICANT")).Get("/contacts", handlers.ApplicantContactsList(cfg.Cfg, cfg.Database))
		r.With(auth.RequireRoles("APPLICANT")).Post("/contacts", handlers.ApplicantContactsCreate(cfg.Cfg, cfg.Database))
		r.With(auth.RequireRoles("APPLICANT")).Post("/recommendations", handlers.ApplicantRecommendationCreate(cfg.Cfg, cfg.Database))
		r.With(auth.RequireRoles("APPLICANT")).Get("/recommendations/inbox", handlers.ApplicantRecommendationInbox(cfg.Cfg, cfg.Database))
	})

	r.With(auth.AuthMiddleware(cfg.JWTSecret)).Route("/api/curator", func(r chi.Router) {
		r.With(auth.RequireRoles("ADMIN", "CURATOR")).Get("/companies/pending", handlers.CuratorCompaniesPendingList(cfg.Cfg, cfg.Database))
		r.With(auth.RequireRoles("ADMIN", "CURATOR")).Patch("/companies/{companyId}/verification", handlers.CuratorCompanyVerification(cfg.Cfg, cfg.Database))
		r.With(auth.RequireRoles("ADMIN", "CURATOR")).Get("/opportunities/pending", handlers.CuratorOpportunitiesPendingList(cfg.Cfg, cfg.Database))
		r.With(auth.RequireRoles("ADMIN", "CURATOR")).Patch("/opportunities/{opportunityId}/status", handlers.CuratorOpportunityStatusUpdate(cfg.Cfg, cfg.Database))
	})

	r.Route("/api/public", func(r chi.Router) {
		r.Get("/opportunities", handlers.PublicOpportunities(cfg.Database))
	})

	// Simple 404 JSON for API consumers.
	r.NotFound(func(w http.ResponseWriter, req *http.Request) {
		handlers.WriteJSON(w, http.StatusNotFound, map[string]any{
			"error": "not_found",
		})
	})

	return r
}

