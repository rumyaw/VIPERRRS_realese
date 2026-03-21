package auth

import (
	"context"
	"database/sql"
	"os"
)

func EnsureDemoData(ctx context.Context, db *sql.DB) error {
	var approvedCount int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM opportunities WHERE status='APPROVED'`).Scan(&approvedCount); err != nil {
		return err
	}
	if approvedCount > 0 {
		return nil
	}

	// Create demo employer.
	demoEmployerEmail := getenvDefault("TRUMPLIN_DEMO_EMPLOYER_EMAIL", "demo_employer@trumplin.local")
	demoEmployerPassword := getenvDefault("TRUMPLIN_DEMO_EMPLOYER_PASSWORD", "demo1234")

	var employerID string
	if err := db.QueryRowContext(ctx, `SELECT id FROM users WHERE email=?`, demoEmployerEmail).Scan(&employerID); err != nil {
		pwHash, err := HashPassword(demoEmployerPassword)
		if err != nil {
			return err
		}
		if err := db.QueryRowContext(ctx,
			`INSERT INTO users (email, password_hash, role, status, display_name)
			 VALUES (?,?,'EMPLOYER','ACTIVE','Demo Employer')
			 RETURNING id`,
			demoEmployerEmail, pwHash,
		).Scan(&employerID); err != nil {
			return err
		}
	}

	// Create demo company.
	demoCompanyName := getenvDefault("TRUMPLIN_DEMO_COMPANY_NAME", "IT Planet Demo LLC")
	var companyID string
	if err := db.QueryRowContext(ctx,
		`SELECT id FROM companies WHERE owner_user_id=?`,
		employerID,
	).Scan(&companyID); err != nil {
		if err := db.QueryRowContext(ctx,
			`INSERT INTO companies (owner_user_id, name, description, verification_status)
			 VALUES (?,?,'', 'APPROVED')
			 RETURNING id`,
			employerID, demoCompanyName,
		).Scan(&companyID); err != nil {
			return err
		}
	} else {
		_, _ = db.ExecContext(ctx, `UPDATE companies SET verification_status='APPROVED' WHERE id=?`, companyID)
	}

	// Seed tags.
	tagNames := []string{"Go", "PostgreSQL", "React", "SQL", "Docker", "Yandex"}
	tagIDs := make(map[string]string, len(tagNames))

	for _, name := range tagNames {
		// Insert tag if missing.
		_, _ = db.ExecContext(ctx, `INSERT INTO tags (name) VALUES (?) ON CONFLICT (name) DO NOTHING`, name)

		var tagID string
		if err := db.QueryRowContext(ctx, `SELECT id FROM tags WHERE name=?`, name).Scan(&tagID); err != nil {
			return err
		}
		tagIDs[name] = tagID
	}

	// Seed opportunities (CIS spread).
	opps := []struct {
		title      string
		typ        string
		cityText   string
		lat, lng   float64
		salaryMin  int
		salaryMax  int
		skillNames []string
	}{
		{
			title:      "Go Backend Engineer (Junior+)",
			typ:        "VACANCY",
			cityText:   "Москва",
			lat:         55.7558,
			lng:         37.6173,
			salaryMin:  120000,
			salaryMax:  200000,
			skillNames: []string{"Go", "PostgreSQL", "SQL", "Docker"},
		},
		{
			title:      "Стажировка React + TypeScript",
			typ:        "INTERNSHIP",
			cityText:   "Минск",
			lat:         53.9045,
			lng:         27.5615,
			salaryMin:  80000,
			salaryMax:  120000,
			skillNames: []string{"React", "SQL", "Docker"},
		},
		{
			title:      "Data Engineer Internship",
			typ:        "INTERNSHIP",
			cityText:   "Алматы",
			lat:         43.2389,
			lng:         76.8897,
			salaryMin:  70000,
			salaryMax:  110000,
			skillNames: []string{"Python", "SQL", "Go"},
		},
		{
			title:      "Career Event: Dev Community",
			typ:        "CAREER_EVENT",
			cityText:   "Ташкент",
			lat:         41.2995,
			lng:         69.2401,
			salaryMin:  0,
			salaryMax:  0,
			skillNames: []string{"Yandex", "Docker"},
		},
		{
			title:      "Mentor Program: Backend",
			typ:        "MENTOR_PROGRAM",
			cityText:   "Баку",
			lat:         40.4093,
			lng:         49.8671,
			salaryMin:  0,
			salaryMax:  0,
			skillNames: []string{"Go", "PostgreSQL", "SQL"},
		},
		{
			title:      "Go API Developer",
			typ:        "VACANCY",
			cityText:   "Астана",
			lat:         51.1694,
			lng:         71.4491,
			salaryMin:  130000,
			salaryMax:  210000,
			skillNames: []string{"Go", "Docker", "SQL"},
		},
		{
			title:      "Стажировка QA Automation",
			typ:        "INTERNSHIP",
			cityText:   "Бишкек",
			lat:         42.8746,
			lng:         74.5698,
			salaryMin:  60000,
			salaryMax:  95000,
			skillNames: []string{"Python", "SQL"},
		},
		{
			title:      "Mentor Program: Data + Maps",
			typ:        "MENTOR_PROGRAM",
			cityText:   "Ереван",
			lat:         40.1792,
			lng:         44.4991,
			salaryMin:  0,
			salaryMax:  0,
			skillNames: []string{"Go", "Yandex", "PostgreSQL"},
		},
		{
			title:      "Стажировка React + TypeScript",
			typ:        "INTERNSHIP",
			cityText:   "Кишинев",
			lat:         47.0105,
			lng:         28.8638,
			salaryMin:  80000,
			salaryMax:  120000,
			skillNames: []string{"React", "SQL", "Docker"},
		},
		{
			title:      "Career Event: Junior Hiring Day",
			typ:        "CAREER_EVENT",
			cityText:   "Душанбе",
			lat:         38.5598,
			lng:         68.7870,
			salaryMin:  0,
			salaryMax:  0,
			skillNames: []string{"Yandex", "Docker"},
		},
	}

	for _, op := range opps {
		var oppID string
		if err := db.QueryRowContext(ctx,
			`INSERT INTO opportunities (
				employer_company_id, curator_user_id,
				title, description, organizer_name,
				type, work_format,
				location_type, city_text, lat, lng,
				salary_min, salary_max,
				status
			) VALUES (
				?, NULL,
				?, 'Demo description', ?,
				?, 'REMOTE',
				'CITY', ?, ?, ?,
				?, ?,
				'APPROVED'
			) RETURNING id`,
			companyID,
			op.title,
			op.title,
			op.typ,
			op.cityText,
			op.lat, op.lng,
			op.salaryMin, op.salaryMax,
		).Scan(&oppID); err != nil {
			return err
		}

		for _, skill := range op.skillNames {
			if tagID := tagIDs[skill]; tagID != "" {
				if _, err := db.ExecContext(ctx,
					`INSERT INTO opportunity_tags (opportunity_id, tag_id)
					 VALUES (?,?) ON CONFLICT DO NOTHING`,
					oppID, tagID,
				); err != nil {
					return err
				}
			}
		}
	}

	return nil
}

func getenvDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

