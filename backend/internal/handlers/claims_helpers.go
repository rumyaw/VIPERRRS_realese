package handlers

import (
	"context"
	"database/sql"
	"errors"
	"net/http"

	"trumplin/internal/auth"
	"trumplin/internal/db"
)

func getClaims(r *http.Request) (auth.UserClaims, bool) {
	return auth.UserClaimsFromContext(r.Context())
}

func ptrStr(s string) *string {
	return &s
}

func employerCompanyID(ctx context.Context, database *db.Database, employerUserID string) (string, error) {
	var companyID string
	if err := database.DB.QueryRowContext(ctx,
		`SELECT id FROM companies WHERE owner_user_id=?`,
		employerUserID,
	).Scan(&companyID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", err
		}
		return "", err
	}
	return companyID, nil
}

