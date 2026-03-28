package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"tramplin/internal/domain"
	"tramplin/internal/httpapi/respond"
	"tramplin/internal/service"
)

type Opportunities struct {
	Svc *service.OpportunityService
}

func (h *Opportunities) List(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	list, err := h.Svc.List(r.Context(), limit, offset)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "failed to list opportunities")
		return
	}
	out := make([]map[string]any, 0, len(list))
	for i := range list {
		out = append(out, opportunityDTO(&list[i]))
	}
	respond.JSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *Opportunities) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	o, err := h.Svc.GetByID(r.Context(), id)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if o == nil {
		respond.Error(w, http.StatusNotFound, "not found")
		return
	}
	go h.Svc.RecordOpportunityView(context.Background(), id)
	respond.JSON(w, http.StatusOK, opportunityDTO(o))
}

func opportunityDTO(o *domain.Opportunity) map[string]any {
	m := map[string]any{
		"id":               o.ID.String(),
		"authorId":         o.AuthorID.String(),
		"title":            o.Title,
		"shortDescription": o.ShortDescription,
		"fullDescription":  o.FullDescription,
		"companyName":      o.CompanyName,
		"type":             o.Type,
		"workFormat":       o.WorkFormat,
		"locationLabel":    o.LocationLabel,
		"tags":             o.Tags,
		"level":            o.Level,
		"employment":       o.Employment,
		"currency":         o.Currency,
		"contacts":         o.Contacts,
	}
	if o.Lon != nil && o.Lat != nil {
		m["coords"] = []float64{*o.Lat, *o.Lon}
	}
	if o.SalaryMin != nil {
		m["salaryMin"] = *o.SalaryMin
	}
	if o.SalaryMax != nil {
		m["salaryMax"] = *o.SalaryMax
	}
	if o.MediaURL != nil {
		m["mediaUrl"] = *o.MediaURL
	}
	if !o.PublishedAt.IsZero() {
		m["publishedAt"] = o.PublishedAt.Format("2006-01-02")
	}
	if o.ValidUntil != nil {
		m["validUntil"] = o.ValidUntil.Format("2006-01-02")
	}
	if o.EventAt != nil {
		m["eventDate"] = o.EventAt.Format(time.RFC3339)
	}
	m["viewCount"] = o.ViewCount
	if o.ModerationStatus != "" {
		m["moderationStatus"] = o.ModerationStatus
	}
	return m
}

// JSON черновика правки (совпадает с repository.pendingRevisionRecord).
type pendingRevDTO struct {
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
	Currency         string         `json:"currency"`
	ValidUntil       *string        `json:"validUntil,omitempty"`
	EventStart       *string        `json:"eventStart,omitempty"`
	EventEnd         *string        `json:"eventEnd,omitempty"`
}

func opportunityMergedForDisplay(o *domain.Opportunity) *domain.Opportunity {
	if o == nil {
		return nil
	}
	if o.RevisionModerationStatus == nil || *o.RevisionModerationStatus != "pending" || len(o.PendingRevision) == 0 {
		return o
	}
	var p pendingRevDTO
	if err := json.Unmarshal(o.PendingRevision, &p); err != nil {
		return o
	}
	out := *o
	if p.Title != "" {
		out.Title = p.Title
	}
	if p.ShortDescription != "" {
		out.ShortDescription = p.ShortDescription
	}
	if p.FullDescription != "" {
		out.FullDescription = p.FullDescription
	}
	if p.CompanyName != "" {
		out.CompanyName = p.CompanyName
	}
	if p.Type != "" {
		out.Type = p.Type
	}
	if p.WorkFormat != "" {
		out.WorkFormat = p.WorkFormat
	}
	if p.LocationLabel != "" {
		out.LocationLabel = p.LocationLabel
	}
	out.Lon = p.Lng
	out.Lat = p.Lat
	if p.Contacts != nil {
		out.Contacts = p.Contacts
	}
	if len(p.Tags) > 0 {
		out.Tags = p.Tags
	}
	if p.Level != "" {
		out.Level = p.Level
	}
	if p.Employment != "" {
		out.Employment = p.Employment
	}
	out.MediaURL = p.MediaURL
	out.SalaryMin = p.SalaryMin
	out.SalaryMax = p.SalaryMax
	if p.Currency != "" {
		out.Currency = p.Currency
	}
	if p.Type == "event" {
		out.ValidUntil = nil
		out.EventAt = nil
		if p.EventStart != nil && *p.EventStart != "" {
			if t, err := time.Parse("2006-01-02", *p.EventStart); err == nil {
				out.EventAt = &t
			}
		}
		if p.EventEnd != nil && *p.EventEnd != "" {
			if t, err := time.Parse("2006-01-02", *p.EventEnd); err == nil {
				out.ValidUntil = &t
			}
		}
	} else {
		out.EventAt = nil
		if p.ValidUntil != nil && *p.ValidUntil != "" {
			if t, err := time.Parse("2006-01-02", *p.ValidUntil); err == nil {
				out.ValidUntil = &t
			}
		}
	}
	return &out
}

func employerOpportunityDTO(o *domain.Opportunity) map[string]any {
	m := opportunityDTO(opportunityMergedForDisplay(o))
	// Явно отдаём поле работодателю (в т.ч. null), чтобы фронт всегда мог показать «Правка на модерации».
	if o.RevisionModerationStatus != nil && *o.RevisionModerationStatus != "" {
		m["revisionModerationStatus"] = *o.RevisionModerationStatus
	} else {
		m["revisionModerationStatus"] = nil
	}
	return m
}

func curatorOpportunityDTO(o *domain.Opportunity) map[string]any {
	return opportunityDTO(opportunityMergedForDisplay(o))
}
