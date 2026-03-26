ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'curator';

INSERT INTO users (id, email, password_hash, display_name, role)
VALUES (
  '00000000-0000-4000-8000-000000000004',
  'curator@tramplin.ru',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'Куратор платформы',
  'curator'
)
ON CONFLICT DO NOTHING;
