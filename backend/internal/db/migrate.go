package db

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Migrate применяет SQL-миграции по порядку имён файлов (0001_, 0002_, …).
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
`)
	if err != nil {
		return fmt.Errorf("ensure schema_migrations: %w", err)
	}

	names := migrationNames()
	for _, name := range names {
		var done bool
		err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename = $1)`, name).Scan(&done)
		if err != nil {
			return fmt.Errorf("check migration %s: %w", name, err)
		}
		if done {
			log.Printf("Migration %s already applied, skipping", name)
			continue
		}

		sql, ok := migrations[name]
		if !ok {
			return fmt.Errorf("migration %s not found", name)
		}

		log.Printf("Applying migration: %s (size: %d bytes)", name, len(sql))
		if _, err := pool.Exec(ctx, sql); err != nil {
			return fmt.Errorf("apply migration %s: %w", name, err)
		}

		if _, err := pool.Exec(ctx, `INSERT INTO schema_migrations (filename) VALUES ($1)`, name); err != nil {
			return fmt.Errorf("record migration %s: %w", name, err)
		}
		log.Printf("Migration %s applied successfully", name)
	}
	return nil
}
