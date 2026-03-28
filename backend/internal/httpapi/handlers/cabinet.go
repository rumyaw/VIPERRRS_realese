package handlers

import (
	"encoding/json"
	"net/http"
	"time"

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
	BlockRecommendations      bool `json:"blockRecommendations"`
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
	if err := h.Users.UpdateApplicantPrivacyV2(r.Context(), userID, body.HideApplicationsFromPeers, body.OpenProfileToNetwork, body.BlockRecommendations); err != nil {
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
	items, err := h.Users.ListContactsV2(r.Context(), userID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to list contacts")
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, it := range items {
		m := map[string]any{
			"peerId":    it.PeerID.String(),
			"email":     it.Email,
			"name":      it.Name,
			"since":     it.Connected,
			"skills":    it.Skills,
			"bio":       it.Bio,
			"jobSearch": it.JobSearch,
		}
		if it.AvatarURL != nil {
			m["avatarUrl"] = *it.AvatarURL
		}
		out = append(out, m)
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
	if err := h.Users.CreateRecommendationChecked(r.Context(), fromUserID, toUserID, oppID, body.Message); err != nil {
		respond.Error(w, http.StatusBadRequest, err.Error())
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
			"viewed":           it.Viewed,
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
	ValidUntil       *string        `json:"validUntil,omitempty"`
	EventStart       *string        `json:"eventStart,omitempty"`
	EventEnd         *string        `json:"eventEnd,omitempty"`
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
	verified, vErr := h.Users.IsEmployerVerified(r.Context(), userID)
	if vErr != nil || !verified {
		respond.Error(w, http.StatusForbidden, "аккаунт не верифицирован")
		return
	}
	var body createOpportunityBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	parseDate := func(s *string) (*time.Time, error) {
		if s == nil || *s == "" {
			return nil, nil
		}
		t, err := time.Parse("2006-01-02", *s)
		if err != nil {
			return nil, err
		}
		return &t, nil
	}
	var validUntil *time.Time
	var eventAt *time.Time
	if body.Type == "event" {
		es, err := parseDate(body.EventStart)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid eventStart")
			return
		}
		ee, err := parseDate(body.EventEnd)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid eventEnd")
			return
		}
		eventAt = es
		validUntil = ee
	} else {
		v, err := parseDate(body.ValidUntil)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid validUntil")
			return
		}
		validUntil = v
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
		validUntil,
		eventAt,
	)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "failed to create opportunity")
		return
	}
	respond.JSON(w, http.StatusCreated, opportunityDTO(opp))
}

func (h *Cabinet) EmployerGetOpportunity(w http.ResponseWriter, r *http.Request) {
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
	idStr := chi.URLParam(r, "opportunityId")
	oppID, err := uuid.Parse(idStr)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	o, err := h.Opps.GetByIDForAuthor(r.Context(), oppID, userID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to load opportunity")
		return
	}
	if o == nil {
		respond.Error(w, http.StatusNotFound, "not found")
		return
	}
	respond.JSON(w, http.StatusOK, opportunityDTO(o))
}

func (h *Cabinet) EmployerDeleteOpportunity(w http.ResponseWriter, r *http.Request) {
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
	idStr := chi.URLParam(r, "opportunityId")
	oppID, err := uuid.Parse(idStr)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.Opps.DeleteByAuthor(r.Context(), oppID, userID); err != nil {
		respond.Error(w, http.StatusBadRequest, "failed to delete")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"ok": true})
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
	CompanyName string  `json:"companyName"`
	Description string  `json:"description"`
	Industry    string  `json:"industry"`
	Website     string  `json:"website"`
	Socials     string  `json:"socials"`
	INN         string  `json:"inn"`
	LogoDataUrl *string `json:"logoDataUrl,omitempty"`
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
	if err := h.Users.UpdateEmployerProfile(r.Context(), userID, body.CompanyName, body.Description, body.Industry, body.Website, body.Socials, body.INN, body.LogoDataUrl); err != nil {
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

func (h *Cabinet) CuratorGetOpportunity(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "opportunityId")
	oppID, err := uuid.Parse(idStr)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	o, err := h.Opps.GetByIDUnrestricted(r.Context(), oppID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to load opportunity")
		return
	}
	if o == nil {
		respond.Error(w, http.StatusNotFound, "not found")
		return
	}
	respond.JSON(w, http.StatusOK, opportunityDTO(o))
}

type moderationBody struct {
	Status string `json:"status"`
}

// --- Contact Requests ---

func (h *Cabinet) ApplicantSendContactRequest(w http.ResponseWriter, r *http.Request) {
	uid, _ := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	var body struct {
		ToUserID string `json:"toUserId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	toUserID, err := uuid.Parse(body.ToUserID)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid toUserId")
		return
	}
	if err := h.Users.SendContactRequest(r.Context(), userID, toUserID); err != nil {
		respond.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	respond.JSON(w, http.StatusCreated, map[string]any{"ok": true})
}

func (h *Cabinet) ApplicantContactRequests(w http.ResponseWriter, r *http.Request) {
	uid, _ := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	items, err := h.Users.ListIncomingContactRequests(r.Context(), userID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to list requests")
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, it := range items {
		m := map[string]any{
			"id":        it.ID.String(),
			"fromUserId": it.FromUserID.String(),
			"fromName":  it.FromName,
			"fromEmail": it.FromEmail,
			"skills":    it.Skills,
			"bio":       it.Bio,
			"status":    it.Status,
			"createdAt": it.CreatedAt,
		}
		if it.AvatarURL != nil {
			m["avatarUrl"] = *it.AvatarURL
		}
		out = append(out, m)
	}
	respond.JSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *Cabinet) ApplicantAcceptContactRequest(w http.ResponseWriter, r *http.Request) {
	uid, _ := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	requestID, err := uuid.Parse(chi.URLParam(r, "requestId"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request id")
		return
	}
	if err := h.Users.AcceptContactRequest(r.Context(), userID, requestID); err != nil {
		respond.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Cabinet) ApplicantRejectContactRequest(w http.ResponseWriter, r *http.Request) {
	uid, _ := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	requestID, err := uuid.Parse(chi.URLParam(r, "requestId"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request id")
		return
	}
	if err := h.Users.RejectContactRequest(r.Context(), userID, requestID); err != nil {
		respond.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

// --- Search ---

func (h *Cabinet) ApplicantSearch(w http.ResponseWriter, r *http.Request) {
	uid, _ := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	q := r.URL.Query().Get("q")
	if q == "" {
		respond.JSON(w, http.StatusOK, map[string]any{"items": []any{}})
		return
	}
	items, err := h.Users.SearchApplicants(r.Context(), q, userID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to search")
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, it := range items {
		isContact, _ := h.Users.IsContact(r.Context(), userID, it.UserID)
		hasPending, _ := h.Users.HasPendingRequest(r.Context(), userID, it.UserID)
		m := map[string]any{
			"userId":     it.UserID.String(),
			"email":      it.Email,
			"name":       it.Name,
			"skills":     it.Skills,
			"bio":        it.Bio,
			"isContact":  isContact,
			"hasPending": hasPending,
		}
		if it.AvatarURL != nil {
			m["avatarUrl"] = *it.AvatarURL
		}
		out = append(out, m)
	}
	respond.JSON(w, http.StatusOK, map[string]any{"items": out})
}

// --- Public Profile ---

func (h *Cabinet) ApplicantPublicProfile(w http.ResponseWriter, r *http.Request) {
	uid, _ := r.Context().Value(middleware.UserIDKey).(string)
	viewerID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	targetID, err := uuid.Parse(chi.URLParam(r, "userId"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid target user id")
		return
	}
	profile, err := h.Users.GetPublicProfile(r.Context(), targetID, viewerID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to load profile")
		return
	}
	if profile == nil {
		respond.Error(w, http.StatusNotFound, "user not found")
		return
	}

	openProfile, _ := profile.Privacy["openProfileToNetwork"].(bool)
	isContact, _ := h.Users.IsContact(r.Context(), viewerID, targetID)
	hasPending, _ := h.Users.HasPendingRequest(r.Context(), viewerID, targetID)

	result := map[string]any{
		"userId":          profile.UserID.String(),
		"email":           profile.Email,
		"displayName":     profile.DisplayName,
		"fullName":        profile.FullName,
		"bio":             profile.Bio,
		"skills":          profile.Skills,
		"jobSearchStatus": profile.JobSearchStatus,
		"isContact":       isContact,
		"hasPending":      hasPending,
		"openProfile":     openProfile,
	}
	if profile.AvatarURL != nil {
		result["avatarUrl"] = *profile.AvatarURL
	}

	if openProfile {
		result["university"] = profile.University
		result["courseOrYear"] = profile.CourseOrYear
		result["repoLinks"] = profile.RepoLinks
		result["resume"] = profile.Resume
		result["contacts"] = func() []map[string]any {
			out := make([]map[string]any, 0, len(profile.Contacts))
			for _, c := range profile.Contacts {
				out = append(out, map[string]any{"peerId": c.PeerID.String(), "name": c.Name})
			}
			return out
		}()
		if profile.Applications != nil {
			apps := make([]map[string]any, 0, len(profile.Applications))
			for _, a := range profile.Applications {
				apps = append(apps, map[string]any{
					"opportunityId":    a.OpportunityID.String(),
					"opportunityTitle": a.OpportunityTitle,
					"companyName":      a.CompanyName,
					"status":           a.Status,
					"createdAt":        a.CreatedAt,
				})
			}
			result["applications"] = apps
		}
	}

	respond.JSON(w, http.StatusOK, result)
}

// --- Mark recommendation viewed ---

func (h *Cabinet) ApplicantMarkRecommendationViewed(w http.ResponseWriter, r *http.Request) {
	uid, _ := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	recID, err := uuid.Parse(chi.URLParam(r, "recommendationId"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid recommendation id")
		return
	}
	if err := h.Users.MarkRecommendationViewed(r.Context(), userID, recID); err != nil {
		respond.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

// --- Favorites ---

func (h *Cabinet) ApplicantAddFavorite(w http.ResponseWriter, r *http.Request) {
	uid, _ := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	var body struct {
		OpportunityID string `json:"opportunityId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	oppID, err := uuid.Parse(body.OpportunityID)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid opportunity id")
		return
	}
	if err := h.Users.AddFavorite(r.Context(), userID, oppID); err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to add favorite")
		return
	}
	respond.JSON(w, http.StatusCreated, map[string]any{"ok": true})
}

func (h *Cabinet) ApplicantRemoveFavorite(w http.ResponseWriter, r *http.Request) {
	uid, _ := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	oppID, err := uuid.Parse(chi.URLParam(r, "opportunityId"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid opportunity id")
		return
	}
	if err := h.Users.RemoveFavorite(r.Context(), userID, oppID); err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to remove favorite")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Cabinet) ApplicantFavorites(w http.ResponseWriter, r *http.Request) {
	uid, _ := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	ids, err := h.Users.ListFavoriteIDs(r.Context(), userID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to list favorites")
		return
	}
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		out = append(out, id.String())
	}
	respond.JSON(w, http.StatusOK, map[string]any{"items": out})
}

// --- Recommendable contacts ---

func (h *Cabinet) ApplicantRecommendableContacts(w http.ResponseWriter, r *http.Request) {
	uid, _ := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	items, err := h.Users.ListRecommendableContacts(r.Context(), userID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to list contacts")
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, it := range items {
		m := map[string]any{
			"peerId":    it.PeerID.String(),
			"name":      it.Name,
			"skills":    it.Skills,
			"bio":       it.Bio,
			"jobSearch": it.JobSearch,
		}
		if it.AvatarURL != nil {
			m["avatarUrl"] = *it.AvatarURL
		}
		out = append(out, m)
	}
	respond.JSON(w, http.StatusOK, map[string]any{"items": out})
}

// --- Remove contact ---

func (h *Cabinet) ApplicantRemoveContact(w http.ResponseWriter, r *http.Request) {
	uid, _ := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := uuid.Parse(uid)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	peerID, err := uuid.Parse(chi.URLParam(r, "peerId"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid peer id")
		return
	}
	if err := h.Users.RemoveContact(r.Context(), userID, peerID); err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to remove contact")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Cabinet) EmployerPublicProfile(w http.ResponseWriter, r *http.Request) {
	uidStr := chi.URLParam(r, "userId")
	uid, err := uuid.Parse(uidStr)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	p, err := h.Users.GetPublicEmployerProfile(r.Context(), uid)
	if err != nil {
		respond.Error(w, http.StatusNotFound, "employer not found")
		return
	}
	result := map[string]any{
		"userId":      p.UserID,
		"companyName": p.CompanyName,
		"description": p.Description,
		"industry":    p.Industry,
		"website":     p.Website,
		"inn":         p.INN,
		"verified":    p.Verified,
	}
	if p.LogoURL != nil {
		result["logoUrl"] = *p.LogoURL
	}
	respond.JSON(w, http.StatusOK, result)
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
