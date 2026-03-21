package auth

import (
	"context"
	"database/sql"
)

// EnsureAdmin creates an initial ADMIN user for curator access if env vars are provided.
func EnsureAdmin(ctx context.Context, db *sql.DB, adminEmail string, adminPassword string) error {
	if adminEmail == "" || adminPassword == "" {
		return nil
	}

	var exists bool
	if err := db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE email=?)`, adminEmail).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return nil
	}

	pwHash, err := HashPassword(adminPassword)
	if err != nil {
		return err
	}

	_, err = db.ExecContext(ctx,
		`INSERT INTO users (email, password_hash, role, status, display_name)
		 VALUES (?,?,'ADMIN','ACTIVE','Администратор')`,
		adminEmail, pwHash,
	)
	return err
}

