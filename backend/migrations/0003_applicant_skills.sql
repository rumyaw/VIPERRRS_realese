-- +goose Up
ALTER TABLE applicants_profiles ADD COLUMN skills TEXT NOT NULL DEFAULT '';

-- +goose Down
-- SQLite does not support DROP COLUMN in older versions.
-- Leaving column in place for down migration compatibility.
