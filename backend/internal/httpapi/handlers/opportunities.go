package handlers

import (
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
	respond.JSON(w, http.StatusOK, opportunityDTO(o))
}

func opportunityDTO(o *domain.Opportunity) map[string]any {
	m := map[string]any{
		"id":               o.ID.String(),
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
		m["coords"] = []float64{*o.Lon, *o.Lat}
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
	return m
}
