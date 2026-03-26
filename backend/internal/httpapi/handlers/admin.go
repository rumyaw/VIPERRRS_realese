package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"tramplin/internal/auth"
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

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page := 1
	limit := 50
	if p := r.URL.Query().Get("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 200 {
			limit = v
		}
	}
	offset := (page - 1) * limit
	roleFilter := r.URL.Query().Get("role")
	search := r.URL.Query().Get("q")

	args := []any{}
	where := "WHERE 1=1"
	argIdx := 1
	if roleFilter != "" {
		where += fmt.Sprintf(" AND u.role::text = $%d", argIdx)
		args = append(args, roleFilter)
		argIdx++
	}
	if search != "" {
		where += fmt.Sprintf(" AND (lower(u.display_name) LIKE '%%' || lower($%d) || '%%' OR lower(u.email) LIKE '%%' || lower($%d) || '%%')", argIdx, argIdx)
		args = append(args, search)
		argIdx++
	}

	var total int
	countQ := fmt.Sprintf("SELECT COUNT(*) FROM users u %s", where)
	if err := h.Pool.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		http.Error(w, `{"error":"count failed"}`, 500)
		return
	}

	q := fmt.Sprintf(`SELECT u.id, u.email, u.display_name, u.role::text, u.created_at FROM users u %s ORDER BY u.created_at DESC LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := h.Pool.Query(ctx, q, args...)
	if err != nil {
		http.Error(w, `{"error":"query failed"}`, 500)
		return
	}
	defer rows.Close()

	users := make([]map[string]any, 0)
	for rows.Next() {
		var id, email, name, role string
		var createdAt time.Time
		if err := rows.Scan(&id, &email, &name, &role, &createdAt); err != nil {
			continue
		}
		users = append(users, map[string]any{
			"id": id, "email": email, "displayName": name, "role": role,
			"createdAt": createdAt.Format(time.RFC3339),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"items": users, "total": total, "page": page, "limit": limit})
}

func (h *AdminHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := chi.URLParam(r, "userId")

	var id, email, name, role string
	var createdAt time.Time
	err := h.Pool.QueryRow(ctx, `SELECT id, email, display_name, role::text, created_at FROM users WHERE id = $1`, uid).Scan(&id, &email, &name, &role, &createdAt)
	if err != nil {
		http.Error(w, `{"error":"user not found"}`, 404)
		return
	}

	result := map[string]any{"id": id, "email": email, "displayName": name, "role": role, "createdAt": createdAt.Format(time.RFC3339)}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *AdminHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	uid := chi.URLParam(r, "userId")
	var body struct {
		DisplayName *string `json:"displayName"`
		Email       *string `json:"email"`
		Role        *string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid json"}`, 400)
		return
	}

	if body.DisplayName != nil {
		h.Pool.Exec(r.Context(), `UPDATE users SET display_name = $2, updated_at = now() WHERE id = $1`, uid, *body.DisplayName)
	}
	if body.Email != nil {
		h.Pool.Exec(r.Context(), `UPDATE users SET email = $2, updated_at = now() WHERE id = $1`, uid, *body.Email)
	}
	if body.Role != nil {
		h.Pool.Exec(r.Context(), `UPDATE users SET role = $2::user_role, updated_at = now() WHERE id = $1`, uid, *body.Role)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}

func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	uid := chi.URLParam(r, "userId")
	_, err := h.Pool.Exec(r.Context(), `DELETE FROM users WHERE id = $1`, uid)
	if err != nil {
		http.Error(w, `{"error":"delete failed"}`, 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}

func (h *AdminHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email       string `json:"email"`
		DisplayName string `json:"displayName"`
		Password    string `json:"password"`
		Role        string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid json"}`, 400)
		return
	}
	if body.Email == "" || body.Password == "" || body.Role == "" {
		http.Error(w, `{"error":"email, password, role required"}`, 400)
		return
	}

	hash, err := auth.HashPassword(body.Password)
	if err != nil {
		http.Error(w, `{"error":"hash failed"}`, 500)
		return
	}

	var id string
	err = h.Pool.QueryRow(r.Context(),
		`INSERT INTO users (email, password_hash, display_name, role) VALUES ($1, $2, $3, $4::user_role) RETURNING id`,
		body.Email, hash, body.DisplayName, body.Role,
	).Scan(&id)
	if err != nil {
		http.Error(w, `{"error":"create failed: `+err.Error()+`"}`, 400)
		return
	}

	if body.Role == "applicant" {
		h.Pool.Exec(r.Context(), `INSERT INTO applicant_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, id)
	} else if body.Role == "employer" {
		h.Pool.Exec(r.Context(), `INSERT INTO employer_profiles (user_id, company_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`, id, body.DisplayName)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(201)
	json.NewEncoder(w).Encode(map[string]any{"id": id})
}

func (h *AdminHandler) ListAllOpportunities(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page := 1
	limit := 20
	if p := r.URL.Query().Get("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 200 {
			limit = v
		}
	}
	offset := (page - 1) * limit
	statusFilter := r.URL.Query().Get("status")

	args := []any{}
	where := ""
	argIdx := 1
	if statusFilter != "" {
		where = fmt.Sprintf("WHERE moderation_status = $%d", argIdx)
		args = append(args, statusFilter)
		argIdx++
	}

	var total int
	if err := h.Pool.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM opportunities %s", where), args...).Scan(&total); err != nil {
		http.Error(w, `{"error":"count failed"}`, 500)
		return
	}

	q := fmt.Sprintf(`SELECT id, title, company_name, type::text, moderation_status, created_at FROM opportunities %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := h.Pool.Query(ctx, q, args...)
	if err != nil {
		http.Error(w, `{"error":"query failed"}`, 500)
		return
	}
	defer rows.Close()

	items := make([]map[string]any, 0)
	for rows.Next() {
		var id, title, company, typ, status string
		var createdAt time.Time
		if err := rows.Scan(&id, &title, &company, &typ, &status, &createdAt); err != nil {
			continue
		}
		items = append(items, map[string]any{
			"id": id, "title": title, "companyName": company, "type": typ,
			"moderationStatus": status, "createdAt": createdAt.Format(time.RFC3339),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"items": items, "total": total, "page": page, "limit": limit})
}

func (h *AdminHandler) DeleteOpportunity(w http.ResponseWriter, r *http.Request) {
	oppId := chi.URLParam(r, "opportunityId")
	_, err := h.Pool.Exec(r.Context(), `DELETE FROM opportunities WHERE id = $1`, oppId)
	if err != nil {
		http.Error(w, `{"error":"delete failed"}`, 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}

func (h *AdminHandler) ExportStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	stats := &AdminStats{}
	h.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&stats.TotalUsers)
	h.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM opportunities").Scan(&stats.TotalOpportunities)
	h.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM applications").Scan(&stats.TotalApplications)
	h.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM employer_profiles WHERE verified = false").Scan(&stats.PendingVerifications)
	h.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM opportunities WHERE moderation_status != 'approved'").Scan(&stats.PendingModeration)

	format := r.URL.Query().Get("format")
	if format == "csv" {
		w.Header().Set("Content-Type", "text/csv")
		w.Header().Set("Content-Disposition", "attachment; filename=tramplin_stats.csv")
		w.Write([]byte("Metric,Value\n"))
		w.Write([]byte(fmt.Sprintf("Total Users,%d\n", stats.TotalUsers)))
		w.Write([]byte(fmt.Sprintf("Total Opportunities,%d\n", stats.TotalOpportunities)))
		w.Write([]byte(fmt.Sprintf("Total Applications,%d\n", stats.TotalApplications)))
		w.Write([]byte(fmt.Sprintf("Pending Verifications,%d\n", stats.PendingVerifications)))
		w.Write([]byte(fmt.Sprintf("Pending Moderation,%d\n", stats.PendingModeration)))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=tramplin_stats.json")
	json.NewEncoder(w).Encode(stats)
}
