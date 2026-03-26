-- Система заявок в контакты
CREATE TABLE IF NOT EXISTS contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_user_id <> to_user_id),
  CONSTRAINT contact_requests_unique UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_to ON contact_requests (to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_from ON contact_requests (from_user_id);

-- Поле viewed для рекомендаций (архив)
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS viewed boolean NOT NULL DEFAULT false;

-- Серверные избранные
CREATE TABLE IF NOT EXISTS favorites (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunities (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites (user_id);
