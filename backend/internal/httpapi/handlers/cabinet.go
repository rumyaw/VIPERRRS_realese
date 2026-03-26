package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"tramplin/internal/httpapi/middleware"
	"tramplin/internal/httpapi/respond"
	"tramplin/internal/repository"
)

type Cabinet struct {
	Users *repository.UserRepository
	Opps  *repository.OpportunityRepository
}

func (h *Cabinet) ApplicantApplications(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || uid == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	items, err := h.Opps.ListApplicantApplications(r.Context(), userID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to list applications")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"items": items})
}

type createApplicationBody struct {
	OpportunityID  string `json:"opportunityId"`
	ResumeSnapshot string `json:"resumeSnapshot"`
}

func (h *Cabinet) ApplicantCreateApplication(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || uid == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	var body createApplicationBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	oppID, err := uuid.Parse(body.OpportunityID)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid opportunity id")
		return
	}
	if err := h.Opps.CreateApplication(r.Context(), oppID, userID, body.ResumeSnapshot); err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to create application")
		return
	}
	respond.JSON(w, http.StatusCreated, map[string]any{"ok": true})
}

type privacyBody struct {
	HideApplicationsFromPeers bool `json:"hideApplicationsFromPeers"`
	OpenProfileToNetwork      bool `json:"openProfileToNetwork"`
}

type applicantProfileBody struct {
	FullName        string         `json:"fullName"`
	University      string         `json:"university"`
	CourseOrYear    string         `json:"courseOrYear"`
	Skills          []string       `json:"skills"`
	Bio             string         `json:"bio"`
	RepoLinks       []string       `json:"repoLinks"`
	AvatarDataURL   *string        `json:"avatarDataUrl"`
	JobSearchStatus string         `json:"jobSearchStatus"`
	Resume          map[string]any `json:"resume"`
}

func (h *Cabinet) ApplicantProfile(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || uid == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	var body applicantProfileBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	if body.JobSearchStatus == "" {
		body.JobSearchStatus = "active_search"
	}
	if body.Resume == nil {
		body.Resume = map[string]any{}
	}
	if err := h.Users.UpdateApplicantProfile(
		r.Context(),
		userID,
		body.FullName,
		body.University,
		body.CourseOrYear,
		body.Bio,
		body.Skills,
		body.RepoLinks,
		body.AvatarDataURL,
		body.JobSearchStatus,
		body.Resume,
	); err != nil {
		respond.Error(w, http.StatusBadRequest, "failed to update profile")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Cabinet) ApplicantPrivacy(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || uid == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	var body privacyBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := h.Users.UpdateApplicantPrivacy(r.Context(), userID, body.HideApplicationsFromPeers, body.OpenProfileToNetwork); err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to update privacy")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Cabinet) ApplicantContacts(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || uid == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	items, err := h.Users.ListContacts(r.Context(), userID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to list contacts")
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, it := range items {
		out = append(out, map[string]any{
			"peerId": it.PeerID.String(),
			"email":  it.Email,
			"name":   it.Name,
			"since":  it.Connected,
		})
	}
	respond.JSON(w, http.StatusOK, map[string]any{"items": out})
}

type addContactBody struct {
	PeerEmail string `json:"peerEmail"`
}

func (h *Cabinet) ApplicantAddContact(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || uid == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	var body addContactBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	if body.PeerEmail == "" {
		respond.Error(w, http.StatusBadRequest, "peerEmail is required")
		return
	}
	if err := h.Users.AddContactByEmail(r.Context(), userID, body.PeerEmail); err != nil {
		respond.Error(w, http.StatusBadRequest, "failed to add contact")
		return
	}
	respond.JSON(w, http.StatusCreated, map[string]any{"ok": true})
}

type recommendationBody struct {
	ToUserID      string `json:"toUserId"`
	OpportunityID string `json:"opportunityId"`
	Message       string `json:"message"`
}

func (h *Cabinet) ApplicantRecommend(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || uid == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	fromUserID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	var body recommendationBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	toUserID, err := uuid.Parse(body.ToUserID)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid toUserId")
		return
	}
	oppID, err := uuid.Parse(body.OpportunityID)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid opportunityId")
		return
	}
	if err := h.Users.CreateRecommendation(r.Context(), fromUserID, toUserID, oppID, body.Message); err != nil {
		respond.Error(w, http.StatusBadRequest, "failed to create recommendation")
		return
	}
	respond.JSON(w, http.StatusCreated, map[string]any{"ok": true})
}

func (h *Cabinet) ApplicantRecommendationsInbox(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || uid == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	items, err := h.Users.RecommendationInbox(r.Context(), userID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to list recommendations")
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, it := range items {
		out = append(out, map[string]any{
			"id":               it.ID.String(),
			"fromUserId":       it.FromUserID.String(),
			"fromName":         it.FromName,
			"opportunityId":    it.OpportunityID.String(),
			"message":          it.Message,
			"createdAt":        it.CreatedAt,
			"opportunityTitle": it.OpportunityTitle,
			"companyName":      it.CompanyName,
			"locationLabel":    it.LocationLabel,
		})
	}
	respond.JSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *Cabinet) EmployerOpportunities(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || uid == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	items, err := h.Opps.ListByAuthor(r.Context(), userID, 100, 0)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to list opportunities")
		return
	}
	out := make([]map[string]any, 0, len(items))
	for i := range items {
		out = append(out, opportunityDTO(&items[i]))
	}
	respond.JSON(w, http.StatusOK, map[string]any{"items": out})
}

type createOpportunityBody struct {
	Title            string         `json:"title"`
	ShortDescription string         `json:"shortDescription"`
	FullDescription  string         `json:"fullDescription"`
	CompanyName      string         `json:"companyName"`
	Type             string         `json:"type"`
	WorkFormat       string         `json:"workFormat"`
	LocationLabel    string         `json:"locationLabel"`
	Lat              *float64       `json:"lat,omitempty"`
	Lng              *float64       `json:"lng,omitempty"`
	Contacts         map[string]any `json:"contacts"`
	Tags             []string       `json:"tags"`
	Level            string         `json:"level"`
	Employment       string         `json:"employment"`
	MediaURL         *string        `json:"mediaUrl,omitempty"`
	SalaryMin        *int           `json:"salaryMin,omitempty"`
	SalaryMax        *int           `json:"salaryMax,omitempty"`
	Currency         string         `json:"currency,omitempty"`
}

func (h *Cabinet) EmployerCreateOpportunity(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || uid == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	var body createOpportunityBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	opp, err := h.Opps.CreateByEmployer(
		r.Context(),
		userID,
		body.Title,
		body.ShortDescription,
		body.FullDescription,
		body.CompanyName,
		body.Type,
		body.WorkFormat,
		body.LocationLabel,
		body.Contacts,
		body.Tags,
		body.Level,
		body.Employment,
		body.Lng,
		body.Lat,
		body.MediaURL,
		body.SalaryMin,
		body.SalaryMax,
		body.Currency,
	)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "failed to create opportunity")
		return
	}
	respond.JSON(w, http.StatusCreated, opportunityDTO(opp))
}

func (h *Cabinet) EmployerApplications(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || uid == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	items, err := h.Opps.ListEmployerApplications(r.Context(), userID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to list applications")
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, it := range items {
		out = append(out, map[string]any{
			"id":            it.ID.String(),
			"opportunityId": it.OpportunityID.String(),
			"opportunity":   it.Opportunity,
			"status":        it.Status,
			"resumeSnapshot": it.ResumeSnapshot,
			"createdAt":     it.CreatedAt,
			"applicant": map[string]any{
				"id":          it.ApplicantID.String(),
				"displayName": it.ApplicantName,
				"email":       it.ApplicantEmail,
			},
		})
	}
	respond.JSON(w, http.StatusOK, map[string]any{"items": out})
}

type updateStatusBody struct {
	Status string `json:"status"`
}

func (h *Cabinet) EmployerUpdateApplicationStatus(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || uid == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	applicationID, err := uuid.Parse(chi.URLParam(r, "applicationId"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid application id")
		return
	}
	var body updateStatusBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := h.Opps.UpdateEmployerApplicationStatus(r.Context(), userID, applicationID, body.Status); err != nil {
		respond.Error(w, http.StatusBadRequest, "failed to update status")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

type employerProfileBody struct {
	CompanyName string `json:"companyName"`
	Description string `json:"description"`
	Industry    string `json:"industry"`
	Website     string `json:"website"`
	Socials     string `json:"socials"`
	INN         string `json:"inn"`
}

func (h *Cabinet) EmployerProfile(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || uid == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	var body employerProfileBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := h.Users.UpdateEmployerProfile(r.Context(), userID, body.CompanyName, body.Description, body.Industry, body.Website, body.Socials, body.INN); err != nil {
		respond.Error(w, http.StatusBadRequest, "failed to update profile")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Cabinet) CuratorPendingCompanies(w http.ResponseWriter, r *http.Request) {
	items, err := h.Users.ListPendingCompanies(r.Context())
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to list companies")
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, it := range items {
		out = append(out, map[string]any{
			"userId":      it.UserID.String(),
			"email":       it.Email,
			"displayName": it.DisplayName,
			"companyName": it.CompanyName,
			"industry":    it.Industry,
			"website":     it.Website,
			"inn":         it.INN,
			"verified":    it.Verified,
		})
	}
	respond.JSON(w, http.StatusOK, map[string]any{"items": out})
}

type verificationBody struct {
	Verified bool `json:"verified"`
}

func (h *Cabinet) CuratorCompanyVerification(w http.ResponseWriter, r *http.Request) {
	companyID, err := uuid.Parse(chi.URLParam(r, "companyId"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid company id")
		return
	}
	var body verificationBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := h.Users.SetCompanyVerification(r.Context(), companyID, body.Verified); err != nil {
		respond.Error(w, http.StatusBadRequest, "failed to update verification")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Cabinet) CuratorPendingOpportunities(w http.ResponseWriter, r *http.Request) {
	items, err := h.Opps.ListPendingOpportunities(r.Context())
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to list opportunities")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"items": items})
}

type moderationBody struct {
	Status string `json:"status"`
}

func (h *Cabinet) CuratorOpportunityStatus(w http.ResponseWriter, r *http.Request) {
	opportunityID, err := uuid.Parse(chi.URLParam(r, "opportunityId"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid opportunity id")
		return
	}
	var body moderationBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	if body.Status == "" {
		respond.Error(w, http.StatusBadRequest, "status is required")
		return
	}
	if err := h.Opps.SetOpportunityModerationStatus(r.Context(), opportunityID, body.Status); err != nil {
		respond.Error(w, http.StatusBadRequest, "failed to update status")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"ok": true})
}
