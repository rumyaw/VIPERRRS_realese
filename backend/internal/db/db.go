package db

import (
	"context"
	"database/sql"
	"time"
	_ "modernc.org/sqlite"
)

type Database struct {
	DB *sql.DB
}

func New(ctx context.Context, dsn string) (*Database, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}

	// Basic connection health check.
	ctxPing, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctxPing); err != nil {
		db.Close()
		return nil, err
	}

	return &Database{DB: db}, nil
}

func (d *Database) Close() {
	if d == nil || d.DB == nil {
		return
	}
	_ = d.DB.Close()
}

