CREATE TABLE IF NOT EXISTS applicant_contacts (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  peer_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, peer_id),
  CHECK (user_id <> peer_id)
);

CREATE INDEX IF NOT EXISTS idx_applicant_contacts_user ON applicant_contacts (user_id);
CREATE INDEX IF NOT EXISTS idx_applicant_contacts_peer ON applicant_contacts (peer_id);

CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunities (id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_user_id <> to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_to_user ON recommendations (to_user_id, created_at DESC);
