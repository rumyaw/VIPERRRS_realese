package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type AdminHandler struct {
	Pool *pgxpool.Pool
}

type AdminStats struct {
	TotalUsers       int `json:"totalUsers"`
	TotalOpportunities int `json:"totalOpportunities"`
	TotalApplications  int `json:"totalApplications"`
	PendingVerifications int `json:"pendingVerifications"`
	PendingModeration   int `json:"pendingModeration"`
}

type TimelinePoint struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type AdminTimeline struct {
	UserRegistrations []TimelinePoint `json:"userRegistrations"`
	Applications      []TimelinePoint `json:"applications"`
	Opportunities     []TimelinePoint `json:"opportunities"`
}

func (h *AdminHandler) Stats(w http.ResponseWriter, r *http.Request) {
	stats := &AdminStats{}

	ctx := r.Context()

	err := h.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&stats.TotalUsers)
	if err != nil {
		http.Error(w, `{"error":"failed to count users"}`, http.StatusInternalServerError)
		return
	}

	err = h.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM opportunities").Scan(&stats.TotalOpportunities)
	if err != nil {
		http.Error(w, `{"error":"failed to count opportunities"}`, http.StatusInternalServerError)
		return
	}

	err = h.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM applications").Scan(&stats.TotalApplications)
	if err != nil {
		http.Error(w, `{"error":"failed to count applications"}`, http.StatusInternalServerError)
		return
	}

	err = h.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM employer_profiles WHERE verified = false").Scan(&stats.PendingVerifications)
	if err != nil {
		http.Error(w, `{"error":"failed to count pending verifications"}`, http.StatusInternalServerError)
		return
	}

	err = h.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM opportunities WHERE moderation_status != 'approved'").Scan(&stats.PendingModeration)
	if err != nil {
		http.Error(w, `{"error":"failed to count pending moderation"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (h *AdminHandler) Timeline(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	startDate := time.Now().AddDate(0, -1, 0).Format("2006-01-02")

	// User registrations by day
	userRows, err := h.Pool.Query(ctx, `
		SELECT DATE(created_at)::text, COUNT(*) 
		FROM users 
		WHERE created_at >= $1 
		GROUP BY DATE(created_at) 
		ORDER BY DATE(created_at)`, startDate)
	if err != nil {
		http.Error(w, `{"error":"failed to get user timeline"}`, http.StatusInternalServerError)
		return
	}
	defer userRows.Close()

	var userRegs []TimelinePoint
	for userRows.Next() {
		var point TimelinePoint
		if err := userRows.Scan(&point.Date, &point.Count); err != nil {
			continue
		}
		userRegs = append(userRegs, point)
	}

	// Applications by day
	appRows, err := h.Pool.Query(ctx, `
		SELECT DATE(created_at)::text, COUNT(*) 
		FROM applications 
		WHERE created_at >= $1 
		GROUP BY DATE(created_at) 
		ORDER BY DATE(created_at)`, startDate)
	if err != nil {
		http.Error(w, `{"error":"failed to get applications timeline"}`, http.StatusInternalServerError)
		return
	}
	defer appRows.Close()

	var apps []TimelinePoint
	for appRows.Next() {
		var point TimelinePoint
		if err := appRows.Scan(&point.Date, &point.Count); err != nil {
			continue
		}
		apps = append(apps, point)
	}

	// Opportunities by day
	oppRows, err := h.Pool.Query(ctx, `
		SELECT DATE(created_at)::text, COUNT(*) 
		FROM opportunities 
		WHERE created_at >= $1 
		GROUP BY DATE(created_at) 
		ORDER BY DATE(created_at)`, startDate)
	if err != nil {
		http.Error(w, `{"error":"failed to get opportunities timeline"}`, http.StatusInternalServerError)
		return
	}
	defer oppRows.Close()

	var opps []TimelinePoint
	for oppRows.Next() {
		var point TimelinePoint
		if err := oppRows.Scan(&point.Date, &point.Count); err != nil {
			continue
		}
		opps = append(opps, point)
	}

	timeline := &AdminTimeline{
		UserRegistrations: userRegs,
		Applications:      apps,
		Opportunities:     opps,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(timeline)
}
