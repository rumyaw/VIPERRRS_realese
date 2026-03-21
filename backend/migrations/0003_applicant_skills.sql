-- +goose Up
ALTER TABLE applicants_profiles ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}';

-- +goose Down
ALTER TABLE applicants_profiles DROP COLUMN IF EXISTS skills;
