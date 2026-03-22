INSERT INTO users (id, email, password_hash, display_name, role)
SELECT
  '00000000-0000-4000-8000-000000000002',
  'demo-employer@tramplin.example',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Демо работодатель',
  'employer'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = '00000000-0000-4000-8000-000000000002');

INSERT INTO employer_profiles (user_id, company_name, description, industry, website, verified)
SELECT
  '00000000-0000-4000-8000-000000000002',
  'КодИнсайт',
  'Цифровые экосистемы для образования и бизнеса (демо-данные).',
  'IT / EdTech',
  'https://codeinsight.example',
  true
WHERE EXISTS (SELECT 1 FROM users WHERE id = '00000000-0000-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM employer_profiles WHERE user_id = '00000000-0000-4000-8000-000000000002');

INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, media_url, moderation_status
)
SELECT
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'Стажировка Go + PostgreSQL',
  'Бэкенд-команда продукта «Трамплин». Микросервисы, SQL, code review.',
  'Вы присоединитесь к команде платформы карьеры: REST/JSON API, миграции БД, тесты, CI.',
  'КодИнсайт',
  'internship',
  'hybrid',
  'Москва, Пресненская наб.',
  37.5392,
  55.7494,
  '2026-03-01',
  '2026-06-01',
  60000,
  90000,
  'RUB',
  '{"email": "talent@codeinsight.example", "website": "https://codeinsight.example", "telegram": "@codeinsight_hr"}'::jsonb,
  ARRAY['Go','PostgreSQL','Docker','REST']::text[],
  'intern',
  'full',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
  'approved'
WHERE NOT EXISTS (SELECT 1 FROM opportunities WHERE id = '10000000-0000-4000-8000-000000000001');

INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, moderation_status
)
SELECT
  '10000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000002',
  'Junior Frontend (Next.js)',
  'SSR, дизайн-система, доступность. Продуктовая команда.',
  'Разработка клиентской части карьерных сервисов.',
  'НебоТех',
  'vacancy_junior',
  'remote',
  'Санкт-Петербург (компания)',
  30.3141,
  59.9386,
  '2026-02-20',
  '2026-05-01',
  120000,
  180000,
  'RUB',
  '{"email": "jobs@nebosky.example"}'::jsonb,
  ARRAY['Next.js','TypeScript','React','a11y']::text[],
  'junior',
  'full',
  'approved'
WHERE NOT EXISTS (SELECT 1 FROM opportunities WHERE id = '10000000-0000-4000-8000-000000000002');
