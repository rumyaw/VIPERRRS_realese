-- +goose Up
CREATE TABLE IF NOT EXISTS applicant_recommendations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_user_id, to_user_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_applicant_recommendations_to_user
ON applicant_recommendations(to_user_id);

-- +goose Down
DROP TABLE IF EXISTS applicant_recommendations;

