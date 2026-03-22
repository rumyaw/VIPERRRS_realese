package db

import (
	"context"
	"embed"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

// Migrate применяет SQL-миграции по порядку имён файлов (0001_, 0002_, …).
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	entries, err := migrationFiles.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("read migrations: %w", err)
	}
	_, err = pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
`)
	if err != nil {
		return fmt.Errorf("ensure schema_migrations: %w", err)
	}

	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		var done bool
		err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename = $1)`, e.Name()).Scan(&done)
		if err != nil {
			return fmt.Errorf("check migration %s: %w", e.Name(), err)
		}
		if done {
			continue
		}
		body, err := migrationFiles.ReadFile("migrations/" + e.Name())
		if err != nil {
			return fmt.Errorf("read migration %s: %w", e.Name(), err)
		}
		if err := execStatements(ctx, pool, string(body)); err != nil {
			return fmt.Errorf("apply migration %s: %w", e.Name(), err)
		}
		if _, err := pool.Exec(ctx, `INSERT INTO schema_migrations (filename) VALUES ($1)`, e.Name()); err != nil {
			return fmt.Errorf("record migration %s: %w", e.Name(), err)
		}
	}
	return nil
}

func execStatements(ctx context.Context, pool *pgxpool.Pool, sql string) error {
	stmts := splitSQL(sql)
	for _, s := range stmts {
		s = strings.TrimSpace(s)
		if s == "" || strings.HasPrefix(s, "--") {
			continue
		}
		if _, err := pool.Exec(ctx, s); err != nil {
			return fmt.Errorf("exec: %w\n---\n%s\n---", err, s)
		}
	}
	return nil
}

// splitSQL делит по `;` на верхнем уровне (без учёта строк и $$ — для наших DDL достаточно).
func splitSQL(sql string) []string {
	var out []string
	var b strings.Builder
	inDollar := false
	for i := 0; i < len(sql); i++ {
		c := sql[i]
		if i+1 < len(sql) && c == '$' && sql[i+1] == '$' {
			inDollar = !inDollar
			b.WriteByte(c)
			b.WriteByte(sql[i+1])
			i++
			continue
		}
		if !inDollar && c == ';' {
			out = append(out, b.String())
			b.Reset()
			continue
		}
		b.WriteByte(c)
	}
	if b.Len() > 0 {
		out = append(out, b.String())
	}
	return out
}
