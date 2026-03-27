package httpapi

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"tramplin/internal/config"
	h "tramplin/internal/httpapi/handlers"
	mw "tramplin/internal/httpapi/middleware"
	"tramplin/internal/repository"
	"tramplin/internal/service"
)

func NewRouter(
	cfg config.Config,
	authSvc *service.AuthService,
	oppSvc *service.OpportunityService,
	userRepo *repository.UserRepository,
	oppRepo *repository.OpportunityRepository,
) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(mw.CORS(cfg.CORSOrigins))

	authH := &h.Auth{Svc: authSvc, Users: userRepo}
	oppH := &h.Opportunities{Svc: oppSvc}
	cabinetH := &h.Cabinet{Users: userRepo, Opps: oppRepo}
	adminH := &h.AdminHandler{Pool: userRepo.GetPool()}

	r.Get("/health", h.HealthOK)
	r.Get("/api/health", h.HealthOK)
	r.Get("/api/v1/health", h.HealthOK)

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/auth/register", authH.Register)
		r.Post("/auth/login", authH.Login)
		r.Post("/auth/refresh", authH.Refresh)
		r.Post("/auth/logout", authH.Logout)
		r.Get("/opportunities", oppH.List)
		r.Get("/opportunities/{id}", oppH.Get)

		r.Group(func(r chi.Router) {
			r.Use(mw.BearerJWT(cfg.JWTSecret))
			r.Get("/auth/me", authH.Me)
		})

		r.Group(func(r chi.Router) {
			r.Use(mw.BearerJWT(cfg.JWTSecret))
			r.With(mw.RequireRoles("applicant")).Get("/applicant/applications", cabinetH.ApplicantApplications)
			r.With(mw.RequireRoles("applicant")).Post("/applicant/applications", cabinetH.ApplicantCreateApplication)
			r.With(mw.RequireRoles("applicant")).Patch("/applicant/profile", cabinetH.ApplicantProfile)
			r.With(mw.RequireRoles("applicant")).Patch("/applicant/privacy", cabinetH.ApplicantPrivacy)
			r.With(mw.RequireRoles("applicant")).Get("/applicant/contacts", cabinetH.ApplicantContacts)
			r.With(mw.RequireRoles("applicant")).Post("/applicant/contacts", cabinetH.ApplicantAddContact)
			r.With(mw.RequireRoles("applicant")).Delete("/applicant/contacts/{peerId}", cabinetH.ApplicantRemoveContact)
			r.With(mw.RequireRoles("applicant")).Post("/applicant/recommendations", cabinetH.ApplicantRecommend)
			r.With(mw.RequireRoles("applicant")).Get("/applicant/recommendations/inbox", cabinetH.ApplicantRecommendationsInbox)
			r.With(mw.RequireRoles("applicant")).Patch("/applicant/recommendations/{recommendationId}/viewed", cabinetH.ApplicantMarkRecommendationViewed)
			r.With(mw.RequireRoles("applicant")).Post("/applicant/contact-requests", cabinetH.ApplicantSendContactRequest)
			r.With(mw.RequireRoles("applicant")).Get("/applicant/contact-requests", cabinetH.ApplicantContactRequests)
			r.With(mw.RequireRoles("applicant")).Patch("/applicant/contact-requests/{requestId}/accept", cabinetH.ApplicantAcceptContactRequest)
			r.With(mw.RequireRoles("applicant")).Patch("/applicant/contact-requests/{requestId}/reject", cabinetH.ApplicantRejectContactRequest)
			r.With(mw.RequireRoles("applicant")).Get("/applicant/search", cabinetH.ApplicantSearch)
			r.With(mw.RequireRoles("applicant")).Get("/applicant/favorites", cabinetH.ApplicantFavorites)
			r.With(mw.RequireRoles("applicant")).Post("/applicant/favorites", cabinetH.ApplicantAddFavorite)
			r.With(mw.RequireRoles("applicant")).Delete("/applicant/favorites/{opportunityId}", cabinetH.ApplicantRemoveFavorite)
			r.With(mw.RequireRoles("applicant")).Get("/applicant/recommendable-contacts", cabinetH.ApplicantRecommendableContacts)
			r.Get("/applicant/profile/{userId}", cabinetH.ApplicantPublicProfile)
			r.Get("/employer/public-profile/{userId}", cabinetH.EmployerPublicProfile)

			r.With(mw.RequireRoles("employer")).Get("/employer/opportunities", cabinetH.EmployerOpportunities)
			r.With(mw.RequireRoles("employer")).Get("/employer/opportunities/{opportunityId}", cabinetH.EmployerGetOpportunity)
			r.With(mw.RequireRoles("employer")).Post("/employer/opportunities", cabinetH.EmployerCreateOpportunity)
			r.With(mw.RequireRoles("employer")).Get("/employer/applications", cabinetH.EmployerApplications)
			r.With(mw.RequireRoles("employer")).Patch("/employer/applications/{applicationId}", cabinetH.EmployerUpdateApplicationStatus)
			r.With(mw.RequireRoles("employer")).Patch("/employer/profile", cabinetH.EmployerProfile)

			r.With(mw.RequireRoles("curator")).Get("/curator/companies/pending", cabinetH.CuratorPendingCompanies)
			r.With(mw.RequireRoles("curator")).Patch("/curator/companies/{companyId}/verification", cabinetH.CuratorCompanyVerification)
			r.With(mw.RequireRoles("curator")).Get("/curator/opportunities/pending", cabinetH.CuratorPendingOpportunities)
			r.With(mw.RequireRoles("curator")).Get("/curator/opportunities/{opportunityId}", cabinetH.CuratorGetOpportunity)
			r.With(mw.RequireRoles("curator")).Patch("/curator/opportunities/{opportunityId}/status", cabinetH.CuratorOpportunityStatus)

			r.With(mw.RequireRoles("curator")).Get("/admin/stats", adminH.Stats)
			r.With(mw.RequireRoles("curator")).Get("/admin/timeline", adminH.Timeline)
			r.With(mw.RequireRoles("curator")).Get("/admin/users", adminH.ListUsers)
			r.With(mw.RequireRoles("curator")).Get("/admin/users/{userId}", adminH.GetUser)
			r.With(mw.RequireRoles("curator")).Patch("/admin/users/{userId}", adminH.UpdateUser)
			r.With(mw.RequireRoles("curator")).Delete("/admin/users/{userId}", adminH.DeleteUser)
			r.With(mw.RequireRoles("curator")).Post("/admin/users", adminH.CreateUser)
			r.With(mw.RequireRoles("curator")).Get("/admin/opportunities", adminH.ListAllOpportunities)
			r.With(mw.RequireRoles("curator")).Delete("/admin/opportunities/{opportunityId}", adminH.DeleteOpportunity)
			r.With(mw.RequireRoles("curator")).Get("/admin/export", adminH.ExportStats)
		})
	})

	return r
}
