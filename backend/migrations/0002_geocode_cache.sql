-- +goose Up
CREATE TABLE IF NOT EXISTS address_geocode_cache (
    norm_query TEXT PRIMARY KEY,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_success_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- +goose Down
DROP TABLE IF EXISTS address_geocode_cache;

