package db

// migrations содержит SQL миграции встроенные как строки
// (embed.FS имеет проблемы на Windows с путями содержащими кириллицу)
var migrations = map[string]string{
	"0001_init.sql": `CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('applicant', 'employer', 'admin', 'curator');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE opportunity_type AS ENUM ('internship', 'vacancy_junior', 'vacancy_senior', 'mentorship', 'event');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE work_format AS ENUM ('office', 'hybrid', 'remote');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE employment_type AS ENUM ('full', 'part', 'project');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected', 'reserve');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE job_search_status AS ENUM ('active_search', 'considering', 'not_looking');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  role user_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS applicant_profiles (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  university text NOT NULL DEFAULT '',
  course_or_year text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  repo_links text[] NOT NULL DEFAULT '{}',
  avatar_url text,
  job_search_status job_search_status NOT NULL DEFAULT 'active_search',
  resume jsonb NOT NULL DEFAULT '{}',
  privacy jsonb NOT NULL DEFAULT '{"hideApplicationsFromPeers": false, "openProfileToNetwork": true}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employer_profiles (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  company_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  industry text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  socials text NOT NULL DEFAULT '',
  inn text NOT NULL DEFAULT '',
  verified boolean NOT NULL DEFAULT false,
  logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title text NOT NULL,
  short_description text NOT NULL DEFAULT '',
  full_description text NOT NULL DEFAULT '',
  company_name text NOT NULL,
  type opportunity_type NOT NULL,
  work_format work_format NOT NULL,
  location_label text NOT NULL DEFAULT '',
  lon double precision,
  lat double precision,
  published_at date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  event_at timestamptz,
  salary_min integer,
  salary_max integer,
  currency text NOT NULL DEFAULT 'RUB',
  contacts jsonb NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  level text NOT NULL DEFAULT 'junior',
  employment employment_type NOT NULL DEFAULT 'full',
  media_url text,
  moderation_status text NOT NULL DEFAULT 'approved',
  view_count bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_author ON opportunities (author_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_published ON opportunities (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_tags ON opportunities USING GIN (tags);

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities (id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'pending',
  resume_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT applications_unique UNIQUE (opportunity_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications (applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_opportunity ON applications (opportunity_id);

CREATE TABLE IF NOT EXISTS geocode_cache (
  query_hash text PRIMARY KEY,
  query text NOT NULL,
  lon double precision NOT NULL,
  lat double precision NOT NULL,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

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
`,
	"0002_seed.sql": `-- ============================================================
-- Users
-- ============================================================
-- All passwords: password123
-- bcrypt cost 10: $2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6

-- Admin / Curator
INSERT INTO users (id, email, password_hash, display_name, role)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'admin@tramplin.ru',
  '$2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6',
  'Администратор',
  'admin'
) ON CONFLICT DO NOTHING;

-- Employer: ТехКорп
INSERT INTO users (id, email, password_hash, display_name, role)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  'hr@techcorp.ru',
  '$2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6',
  'HR ТехКорп',
  'employer'
) ON CONFLICT DO NOTHING;

-- Employer: ГринСтарт
INSERT INTO users (id, email, password_hash, display_name, role)
VALUES (
  '00000000-0000-4000-8000-000000000003',
  'hr@greenstart.ru',
  '$2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6',
  'HR ГринСтарт',
  'employer'
) ON CONFLICT DO NOTHING;

-- Applicant: Иван Петров
INSERT INTO users (id, email, password_hash, display_name, role)
VALUES (
  '00000000-0000-4000-8000-000000000010',
  'ivan@mail.ru',
  '$2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6',
  'Иван Петров',
  'applicant'
) ON CONFLICT DO NOTHING;

-- Applicant: Мария Сидорова
INSERT INTO users (id, email, password_hash, display_name, role)
VALUES (
  '00000000-0000-4000-8000-000000000011',
  'maria@mail.ru',
  '$2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6',
  'Мария Сидорова',
  'applicant'
) ON CONFLICT DO NOTHING;

-- Applicant: Александр Козлов
INSERT INTO users (id, email, password_hash, display_name, role)
VALUES (
  '00000000-0000-4000-8000-000000000012',
  'alex@mail.ru',
  '$2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6',
  'Александр Козлов',
  'applicant'
) ON CONFLICT DO NOTHING;

-- Applicant: Елена Волкова
INSERT INTO users (id, email, password_hash, display_name, role)
VALUES (
  '00000000-0000-4000-8000-000000000013',
  'elena@mail.ru',
  '$2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6',
  'Елена Волкова',
  'applicant'
) ON CONFLICT DO NOTHING;

-- ============================================================
-- Employer profiles
-- ============================================================

INSERT INTO employer_profiles (user_id, company_name, description, industry, website, inn, verified)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  'ТехКорп',
  'Разработка корпоративных IT-решений и облачных сервисов.',
  'IT / Разработка ПО',
  'https://techcorp.ru',
  '7707123456',
  true
) ON CONFLICT (user_id) DO UPDATE SET
  company_name  = EXCLUDED.company_name,
  description   = EXCLUDED.description,
  industry      = EXCLUDED.industry,
  website       = EXCLUDED.website,
  inn           = EXCLUDED.inn,
  verified      = EXCLUDED.verified;

INSERT INTO employer_profiles (user_id, company_name, description, industry, website, inn, verified)
VALUES (
  '00000000-0000-4000-8000-000000000003',
  'ГринСтарт',
  'Экологический стартап: аналитика углеродного следа и зелёные технологии.',
  'GreenTech / Экология',
  'https://greenstart.ru',
  '7812654321',
  true
) ON CONFLICT (user_id) DO UPDATE SET
  company_name  = EXCLUDED.company_name,
  description   = EXCLUDED.description,
  industry      = EXCLUDED.industry,
  website       = EXCLUDED.website,
  inn           = EXCLUDED.inn,
  verified      = EXCLUDED.verified;

-- ============================================================
-- Applicant profiles
-- ============================================================

INSERT INTO applicant_profiles (user_id, full_name, university, course_or_year, bio, skills, job_search_status)
VALUES (
  '00000000-0000-4000-8000-000000000010',
  'Иван Петров',
  'МГТУ им. Баумана',
  '4 курс',
  'Студент 4 курса МГТУ, интересуюсь backend-разработкой и DevOps.',
  ARRAY['Go','Python','Docker','Linux','PostgreSQL']::text[],
  'active_search'
) ON CONFLICT (user_id) DO UPDATE SET
  full_name         = EXCLUDED.full_name,
  university        = EXCLUDED.university,
  course_or_year    = EXCLUDED.course_or_year,
  bio               = EXCLUDED.bio,
  skills            = EXCLUDED.skills,
  job_search_status = EXCLUDED.job_search_status;

INSERT INTO applicant_profiles (user_id, full_name, university, course_or_year, bio, skills, job_search_status)
VALUES (
  '00000000-0000-4000-8000-000000000011',
  'Мария Сидорова',
  'НИУ ВШЭ',
  'Выпускница 2025',
  'Выпускница ВШЭ, специализация — цифровой маркетинг и аналитика.',
  ARRAY['Marketing','Analytics','SEO','Google Ads','Excel']::text[],
  'active_search'
) ON CONFLICT (user_id) DO UPDATE SET
  full_name         = EXCLUDED.full_name,
  university        = EXCLUDED.university,
  course_or_year    = EXCLUDED.course_or_year,
  bio               = EXCLUDED.bio,
  skills            = EXCLUDED.skills,
  job_search_status = EXCLUDED.job_search_status;

INSERT INTO applicant_profiles (user_id, full_name, university, course_or_year, bio, skills, job_search_status)
VALUES (
  '00000000-0000-4000-8000-000000000012',
  'Александр Козлов',
  'ИТМО',
  'Выпускник 2024',
  'Backend-разработчик с 2-летним опытом, работал в продуктовых командах.',
  ARRAY['Java','Spring','PostgreSQL','Kafka','Kubernetes']::text[],
  'active_search'
) ON CONFLICT (user_id) DO UPDATE SET
  full_name         = EXCLUDED.full_name,
  university        = EXCLUDED.university,
  course_or_year    = EXCLUDED.course_or_year,
  bio               = EXCLUDED.bio,
  skills            = EXCLUDED.skills,
  job_search_status = EXCLUDED.job_search_status;

INSERT INTO applicant_profiles (user_id, full_name, university, course_or_year, bio, skills, job_search_status)
VALUES (
  '00000000-0000-4000-8000-000000000013',
  'Елена Волкова',
  'СПбГУ',
  '3 курс',
  'UX/UI дизайнер, увлекаюсь проектированием интерфейсов и дизайн-системами.',
  ARRAY['Figma','CSS','React','Adobe XD','User Research']::text[],
  'not_looking'
) ON CONFLICT (user_id) DO UPDATE SET
  full_name         = EXCLUDED.full_name,
  university        = EXCLUDED.university,
  course_or_year    = EXCLUDED.course_or_year,
  bio               = EXCLUDED.bio,
  skills            = EXCLUDED.skills,
  job_search_status = EXCLUDED.job_search_status;

-- ============================================================
-- Opportunities
-- ============================================================

-- 1. Backend Developer — ТехКорп, Москва
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, media_url, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'Backend Developer (Go)',
  'Разработка микросервисов на Go, REST API, PostgreSQL.',
  'Присоединяйтесь к backend-команде ТехКорп. Задачи: проектирование REST API, оптимизация запросов к PostgreSQL, написание интеграционных тестов, участие в код-ревью.',
  'ТехКорп',
  'vacancy_junior',
  'office',
  'Москва, Тверская ул.',
  37.6173, 55.7558,
  '2026-03-01', '2026-06-30',
  120000, 180000, 'RUB',
  '{"email":"hr@techcorp.ru","telegram":"@techcorp_jobs"}'::jsonb,
  ARRAY['Go','PostgreSQL','REST','Docker']::text[],
  'junior', 'full',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 2. Frontend Developer — ТехКорп, Москва
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000002',
  'Frontend Developer (React)',
  'Разработка SPA на React/TypeScript, работа с дизайн-системой.',
  'Вы будете развивать клиентскую часть продуктов ТехКорп: адаптивная вёрстка, интеграция с API, оптимизация производительности, покрытие unit-тестами.',
  'ТехКорп',
  'vacancy_junior',
  'hybrid',
  'Москва, Пресненская наб.',
  37.5877, 55.7336,
  '2026-02-15', '2026-06-15',
  110000, 170000, 'RUB',
  '{"email":"hr@techcorp.ru","telegram":"@techcorp_jobs"}'::jsonb,
  ARRAY['React','TypeScript','Next.js','CSS']::text[],
  'junior', 'full',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 3. DevOps Engineer — ТехКорп, Казань
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000002',
  'DevOps Engineer',
  'CI/CD, Kubernetes, мониторинг, облачная инфраструктура.',
  'Настройка и поддержка CI/CD пайплайнов на GitLab CI, управление Kubernetes-кластерами, внедрение мониторинга (Prometheus + Grafana), автоматизация инфраструктуры через Terraform.',
  'ТехКорп',
  'vacancy_senior',
  'office',
  'Казань, ул. Баумана',
  49.1089, 55.7887,
  '2026-03-10', '2026-07-10',
  180000, 260000, 'RUB',
  '{"email":"hr@techcorp.ru"}'::jsonb,
  ARRAY['Kubernetes','Docker','CI/CD','Terraform','Linux']::text[],
  'senior', 'full',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 4. Marketing Manager — ГринСтарт, СПб
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000003',
  'Marketing Manager',
  'Стратегия продвижения, контент-маркетинг, аналитика кампаний.',
  'Разработка маркетинговой стратегии ГринСтарт: ведение соцсетей, настройка таргетированной рекламы, анализ конверсий, подготовка PR-материалов о зелёных технологиях.',
  'ГринСтарт',
  'vacancy_junior',
  'office',
  'Санкт-Петербург, Невский пр.',
  30.3158, 59.9343,
  '2026-02-20', '2026-05-31',
  90000, 140000, 'RUB',
  '{"email":"hr@greenstart.ru","telegram":"@greenstart_team"}'::jsonb,
  ARRAY['Marketing','SEO','Google Ads','Analytics','SMM']::text[],
  'junior', 'full',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 5. Data Analyst — ТехКорп, Новосибирск
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, media_url, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000002',
  'Data Analyst (стажировка)',
  'Анализ продуктовых метрик, SQL, Python, дашборды.',
  'Стажировка в аналитическом отделе ТехКорп: построение дашбордов в Metabase, написание SQL-запросов, подготовка аналитических отчётов для продуктовой команды.',
  'ТехКорп',
  'internship',
  'hybrid',
  'Новосибирск, Академгородок',
  82.9346, 55.0084,
  '2026-03-15', '2026-08-15',
  50000, 80000, 'RUB',
  '{"email":"hr@techcorp.ru"}'::jsonb,
  ARRAY['SQL','Python','Pandas','Metabase','Data Analysis']::text[],
  'intern', 'full',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 6. UX Designer — ГринСтарт, СПб
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000006',
  '00000000-0000-4000-8000-000000000003',
  'UX/UI Designer',
  'Проектирование интерфейсов, прототипирование, пользовательские исследования.',
  'Дизайн мобильного и веб-приложения ГринСтарт: создание wireframes, интерактивных прототипов в Figma, проведение UX-тестов, поддержка дизайн-системы.',
  'ГринСтарт',
  'vacancy_junior',
  'office',
  'Санкт-Петербург, Васильевский остров',
  30.3609, 59.9311,
  '2026-03-05', '2026-06-30',
  100000, 150000, 'RUB',
  '{"email":"hr@greenstart.ru"}'::jsonb,
  ARRAY['Figma','UX Research','Prototyping','Design Systems','CSS']::text[],
  'junior', 'full',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 7. Project Manager — ГринСтарт, Екатеринбург
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000007',
  '00000000-0000-4000-8000-000000000003',
  'Project Manager',
  'Управление IT-проектами, Agile, координация распределённой команды.',
  'Управление проектами в сфере GreenTech: планирование спринтов, координация разработки и дизайна, коммуникация с заказчиками, контроль сроков и бюджета.',
  'ГринСтарт',
  'vacancy_senior',
  'hybrid',
  'Екатеринбург, ул. Ленина',
  60.6122, 56.8389,
  '2026-03-12', '2026-07-12',
  150000, 220000, 'RUB',
  '{"email":"hr@greenstart.ru","telegram":"@greenstart_team"}'::jsonb,
  ARRAY['Agile','Scrum','Jira','Project Management','Leadership']::text[],
  'senior', 'full',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 8. Intern Developer — ТехКорп, Москва
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, media_url, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000008',
  '00000000-0000-4000-8000-000000000002',
  'Стажёр-разработчик (Go + PostgreSQL)',
  'Бэкенд-стажировка: микросервисы, SQL, код-ревью.',
  'Вы присоединитесь к backend-команде ТехКорп и будете участвовать в разработке REST API, писать миграции БД, покрывать код тестами и проходить код-ревью.',
  'ТехКорп',
  'internship',
  'hybrid',
  'Москва, Пресненская наб.',
  37.6529, 55.7696,
  '2026-03-20', '2026-09-01',
  60000, 90000, 'RUB',
  '{"email":"hr@techcorp.ru","telegram":"@techcorp_jobs"}'::jsonb,
  ARRAY['Go','PostgreSQL','Docker','REST','Git']::text[],
  'intern', 'full',
  'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 9. Content Manager — ГринСтарт, удалённо
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000009',
  '00000000-0000-4000-8000-000000000003',
  'Content Manager',
  'Создание контента о зелёных технологиях, ведение блога и соцсетей.',
  'Написание статей и постов о GreenTech-продуктах, подготовка email-рассылок, работа с SEO-оптимизацией текстов, взаимодействие с дизайнерами для оформления материалов.',
  'ГринСтарт',
  'vacancy_junior',
  'remote',
  'Удалённо (Россия)',
  37.6173, 55.7558,
  '2026-03-18', '2026-06-18',
  70000, 110000, 'RUB',
  '{"email":"hr@greenstart.ru"}'::jsonb,
  ARRAY['Copywriting','SEO','SMM','Tilda','Content Strategy']::text[],
  'junior', 'part',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 10. QA Engineer — ТехКорп, Москва
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000002',
  'QA Engineer',
  'Ручное и автоматизированное тестирование веб-приложений.',
  'Написание тест-кейсов, автоматизация regression-тестов на Python + Selenium, интеграция тестов в CI, работа с баг-трекером, участие в планировании спринтов.',
  'ТехКорп',
  'vacancy_junior',
  'office',
  'Москва, Ленинградский пр.',
  37.5296, 55.7485,
  '2026-03-22', '2026-07-22',
  100000, 160000, 'RUB',
  '{"email":"hr@techcorp.ru"}'::jsonb,
  ARRAY['QA','Selenium','Python','Jira','Postman']::text[],
  'junior', 'full',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 11. Mobile Developer — ТехКорп, Нижний Новгород
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000002',
  'Mobile Developer (React Native)',
  'Разработка кроссплатформенных мобильных приложений.',
  'Участие в разработке мобильного приложения ТехКорп на React Native: создание UI-компонентов, интеграция с REST API, настройка push-уведомлений, публикация в App Store и Google Play.',
  'ТехКорп',
  'vacancy_junior',
  'hybrid',
  'Нижний Новгород, ул. Большая Покровская',
  43.9361, 56.2965,
  '2026-03-05', '2026-07-05',
  100000, 160000, 'RUB',
  '{"email":"hr@techcorp.ru","telegram":"@techcorp_jobs"}'::jsonb,
  ARRAY['React Native','TypeScript','Redux','REST','Git']::text[],
  'junior', 'full',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 12. Эко-аналитик (стажировка) — ГринСтарт, Самара
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000003',
  'Эко-аналитик (стажировка)',
  'Анализ углеродного следа, подготовка ESG-отчётов.',
  'Стажировка в аналитическом отделе ГринСтарт: сбор данных о выбросах CO₂, расчёт углеродного следа клиентов, визуализация метрик устойчивого развития, подготовка ESG-отчётности.',
  'ГринСтарт',
  'internship',
  'office',
  'Самара, ул. Куйбышева',
  50.1500, 53.1959,
  '2026-03-08', '2026-08-08',
  40000, 65000, 'RUB',
  '{"email":"hr@greenstart.ru"}'::jsonb,
  ARRAY['Excel','Python','ESG','Data Analysis','Sustainability']::text[],
  'intern', 'full',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 13. Senior Java Developer — ТехКорп, Ростов-на-Дону (удалённо)
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000013',
  '00000000-0000-4000-8000-000000000002',
  'Senior Java Developer',
  'Проектирование высоконагруженных систем на Java/Spring.',
  'Разработка и сопровождение микросервисной архитектуры ТехКорп: проектирование API, работа с Kafka и RabbitMQ, оптимизация производительности, менторинг junior-разработчиков.',
  'ТехКорп',
  'vacancy_senior',
  'remote',
  'Ростов-на-Дону (удалённо)',
  39.7015, 47.2357,
  '2026-02-25', '2026-06-25',
  250000, 350000, 'RUB',
  '{"email":"hr@techcorp.ru","telegram":"@techcorp_jobs"}'::jsonb,
  ARRAY['Java','Spring Boot','Kafka','Microservices','PostgreSQL']::text[],
  'senior', 'full',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 14. Наставник по Go — ТехКорп, Краснодар
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000014',
  '00000000-0000-4000-8000-000000000002',
  'Наставник по Go-разработке',
  'Менторская программа для начинающих Go-разработчиков.',
  'Программа наставничества ТехКорп: индивидуальные встречи с ментором, разбор реальных задач, код-ревью pet-проектов, помощь с подготовкой к собеседованиям в крупные IT-компании.',
  'ТехКорп',
  'mentorship',
  'hybrid',
  'Краснодар, ул. Красная',
  38.9760, 45.0355,
  '2026-03-14', '2026-09-14',
  0, 0, 'RUB',
  '{"email":"hr@techcorp.ru","telegram":"@techcorp_mentors"}'::jsonb,
  ARRAY['Go','Mentorship','Backend','Algorithms','Career']::text[],
  'intern', 'part',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 15. GreenTech Meetup — ГринСтарт, Воронеж
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000015',
  '00000000-0000-4000-8000-000000000003',
  'GreenTech Meetup Воронеж',
  'Митап для специалистов в области экотехнологий и устойчивого развития.',
  'Открытый митап ГринСтарт в Воронеже: доклады о зелёных технологиях, нетворкинг с экспертами отрасли, воркшоп по расчёту углеродного следа, розыгрыш стажировок. Вход свободный.',
  'ГринСтарт',
  'event',
  'office',
  'Воронеж, пр. Революции',
  39.1843, 51.6720,
  '2026-03-20', '2026-04-20',
  0, 0, 'RUB',
  '{"email":"hr@greenstart.ru","telegram":"@greenstart_events"}'::jsonb,
  ARRAY['GreenTech','Networking','ESG','Sustainability','Event']::text[],
  'intern', 'project',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 16. Системный администратор — ТехКорп, Владивосток
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000016',
  '00000000-0000-4000-8000-000000000002',
  'Системный администратор',
  'Администрирование серверной инфраструктуры и сетевого оборудования.',
  'Поддержка серверов и сетевой инфраструктуры офиса ТехКорп во Владивостоке: настройка Linux-серверов, управление Active Directory, мониторинг Zabbix, резервное копирование, информационная безопасность.',
  'ТехКорп',
  'vacancy_junior',
  'office',
  'Владивосток, ул. Светланская',
  131.8735, 43.1056,
  '2026-03-11', '2026-07-11',
  90000, 140000, 'RUB',
  '{"email":"hr@techcorp.ru"}'::jsonb,
  ARRAY['Linux','Networking','Zabbix','Active Directory','Bash']::text[],
  'junior', 'full',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- 17. ML Engineer (стажировка) — ГринСтарт, Калининград (удалённо)
INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, moderation_status
) VALUES (
  '10000000-0000-4000-8000-000000000017',
  '00000000-0000-4000-8000-000000000003',
  'ML Engineer (стажировка)',
  'Разработка ML-моделей для прогнозирования экологических показателей.',
  'Стажировка в data-команде ГринСтарт: обучение моделей прогнозирования качества воздуха, работа с временными рядами, эксперименты в MLflow, деплой моделей в продакшен через FastAPI.',
  'ГринСтарт',
  'internship',
  'remote',
  'Калининград (удалённо)',
  20.5070, 54.7104,
  '2026-03-16', '2026-09-16',
  55000, 85000, 'RUB',
  '{"email":"hr@greenstart.ru","telegram":"@greenstart_team"}'::jsonb,
  ARRAY['Python','PyTorch','MLflow','FastAPI','Data Science']::text[],
  'intern', 'full',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Applications
-- ============================================================

-- Иван → Backend Developer (pending)
INSERT INTO applications (opportunity_id, applicant_id, status, resume_snapshot)
VALUES (
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000010',
  'pending',
  'Иван Петров, 4 курс МГТУ. Навыки: Go, Python, Docker.'
) ON CONFLICT (opportunity_id, applicant_id) DO NOTHING;

-- Иван → Стажёр-разработчик (accepted)
INSERT INTO applications (opportunity_id, applicant_id, status, resume_snapshot)
VALUES (
  '10000000-0000-4000-8000-000000000008',
  '00000000-0000-4000-8000-000000000010',
  'accepted',
  'Иван Петров, 4 курс МГТУ. Навыки: Go, Python, Docker.'
) ON CONFLICT (opportunity_id, applicant_id) DO NOTHING;

-- Мария → Marketing Manager (pending)
INSERT INTO applications (opportunity_id, applicant_id, status, resume_snapshot)
VALUES (
  '10000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000011',
  'pending',
  'Мария Сидорова, выпускница ВШЭ. Навыки: Marketing, Analytics, SEO.'
) ON CONFLICT (opportunity_id, applicant_id) DO NOTHING;

-- Александр → Backend Developer (rejected)
INSERT INTO applications (opportunity_id, applicant_id, status, resume_snapshot)
VALUES (
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000012',
  'rejected',
  'Александр Козлов, ИТМО. Навыки: Java, Spring, PostgreSQL.'
) ON CONFLICT (opportunity_id, applicant_id) DO NOTHING;

-- Елена → UX Designer (pending)
INSERT INTO applications (opportunity_id, applicant_id, status, resume_snapshot)
VALUES (
  '10000000-0000-4000-8000-000000000006',
  '00000000-0000-4000-8000-000000000013',
  'pending',
  'Елена Волкова, 3 курс СПбГУ. Навыки: Figma, CSS, React.'
) ON CONFLICT (opportunity_id, applicant_id) DO NOTHING;

-- Александр → DevOps Engineer (pending)
INSERT INTO applications (opportunity_id, applicant_id, status, resume_snapshot)
VALUES (
  '10000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000012',
  'pending',
  'Александр Козлов, ИТМО. Навыки: Java, Spring, PostgreSQL, Kubernetes.'
) ON CONFLICT (opportunity_id, applicant_id) DO NOTHING;

-- ============================================================
-- Applicant contacts (networking)
-- ============================================================

-- Иван ↔ Мария
INSERT INTO applicant_contacts (user_id, peer_id) VALUES
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000011'),
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000010')
ON CONFLICT DO NOTHING;

-- Иван ↔ Александр
INSERT INTO applicant_contacts (user_id, peer_id) VALUES
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000012'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000010')
ON CONFLICT DO NOTHING;

-- Мария ↔ Елена
INSERT INTO applicant_contacts (user_id, peer_id) VALUES
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000013'),
  ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000011')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Recommendations
-- ============================================================

-- Иван рекомендует Александру вакансию Backend Developer
INSERT INTO recommendations (from_user_id, to_user_id, opportunity_id, message)
VALUES (
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000012',
  '10000000-0000-4000-8000-000000000001',
  'Алекс, посмотри эту вакансию — подходит под твой стек!'
);

-- Мария рекомендует Елене вакансию UX Designer
INSERT INTO recommendations (from_user_id, to_user_id, opportunity_id, message)
VALUES (
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000013',
  '10000000-0000-4000-8000-000000000006',
  'Лена, тебе будет интересна эта позиция дизайнера в ГринСтарт.'
);

-- Александр рекомендует Ивану стажировку DevOps
INSERT INTO recommendations (from_user_id, to_user_id, opportunity_id, message)
VALUES (
  '00000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000003',
  'Ваня, ты же DevOps увлекаешься — вот классная позиция в Казани!'
);

-- Елена рекомендует Марии Content Manager
INSERT INTO recommendations (from_user_id, to_user_id, opportunity_id, message)
VALUES (
  '00000000-0000-4000-8000-000000000013',
  '00000000-0000-4000-8000-000000000011',
  '10000000-0000-4000-8000-000000000009',
  'Маша, посмотри вакансию контент-менеджера — идеально для тебя!'
);
`,
	"0003_add_curator_role.sql": `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'curator';

INSERT INTO users (id, email, password_hash, display_name, role)
VALUES (
  '00000000-0000-4000-8000-000000000004',
  'curator@tramplin.ru',
  '$2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6',
  'Куратор платформы',
  'curator'
)
ON CONFLICT DO NOTHING;
`,
	"0004_contacts_recommendations.sql": `CREATE TABLE IF NOT EXISTS applicant_contacts (
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
`,

	"0005_reseed.sql": `DELETE FROM recommendations;
DELETE FROM applicant_contacts;
DELETE FROM applications;
DELETE FROM opportunities;
DELETE FROM applicant_profiles;
DELETE FROM employer_profiles;
DELETE FROM users;

INSERT INTO users (id, email, password_hash, display_name, role) VALUES
('00000000-0000-4000-8000-000000000004','curator@tramplin.ru','$2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6','Куратор платформы','curator'),
('00000000-0000-4000-8000-000000000002','hr@techcorp.ru','$2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6','HR ТехКорп','employer'),
('00000000-0000-4000-8000-000000000003','hr@greenstart.ru','$2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6','HR ГринСтарт','employer'),
('00000000-0000-4000-8000-000000000010','ivan@mail.ru','$2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6','Иван Петров','applicant'),
('00000000-0000-4000-8000-000000000011','maria@mail.ru','$2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6','Мария Сидорова','applicant'),
('00000000-0000-4000-8000-000000000012','alex@mail.ru','$2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6','Александр Козлов','applicant'),
('00000000-0000-4000-8000-000000000013','elena@mail.ru','$2a$10$07Mj3rVkJ0mpGhatL2OyBOwsmD7SAHaIlu8khchBxKxiFfGl2A4B6','Елена Волкова','applicant');

INSERT INTO employer_profiles (user_id, company_name, description, industry, website, inn, verified) VALUES
('00000000-0000-4000-8000-000000000002','ТехКорп','Разработка корпоративных IT-решений и облачных сервисов.','IT / Разработка ПО','https://techcorp.ru','7707123456',true),
('00000000-0000-4000-8000-000000000003','ГринСтарт','Экологический стартап: аналитика углеродного следа и зелёные технологии.','GreenTech / Экология','https://greenstart.ru','7812654321',true);

INSERT INTO applicant_profiles (user_id, full_name, university, course_or_year, bio, skills, job_search_status) VALUES
('00000000-0000-4000-8000-000000000010','Иван Петров','МГТУ им. Баумана','4 курс','Студент 4 курса МГТУ, интересуюсь backend-разработкой и DevOps.',ARRAY['Go','Python','Docker','Linux','PostgreSQL']::text[],'active_search'),
('00000000-0000-4000-8000-000000000011','Мария Сидорова','НИУ ВШЭ','Выпускница 2025','Выпускница ВШЭ, специализация — цифровой маркетинг и аналитика.',ARRAY['Marketing','Analytics','SEO','Google Ads','Excel']::text[],'active_search'),
('00000000-0000-4000-8000-000000000012','Александр Козлов','ИТМО','Выпускник 2024','Backend-разработчик с 2-летним опытом, работал в продуктовых командах.',ARRAY['Java','Spring','PostgreSQL','Kafka','Kubernetes']::text[],'active_search'),
('00000000-0000-4000-8000-000000000013','Елена Волкова','СПбГУ','3 курс','UX/UI дизайнер, увлекаюсь проектированием интерфейсов и дизайн-системами.',ARRAY['Figma','CSS','React','Adobe XD','User Research']::text[],'not_looking');

INSERT INTO opportunities (
  id, author_id, title, short_description, full_description, company_name,
  type, work_format, location_label, lon, lat,
  published_at, valid_until, salary_min, salary_max, currency,
  contacts, tags, level, employment, media_url, moderation_status
) VALUES
('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','Backend Developer (Go)','Разработка микросервисов на Go, REST API, PostgreSQL.','Присоединяйтесь к backend-команде ТехКорп.','ТехКорп','vacancy_junior','office','Москва, Тверская ул.',37.6173,55.7558,'2026-03-01','2026-06-30',120000,180000,'RUB','{"email":"hr@techcorp.ru","telegram":"@techcorp_jobs"}'::jsonb,ARRAY['Go','PostgreSQL','REST','Docker']::text[],'junior','full','https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80','approved'),
('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Frontend Developer (React)','Разработка SPA на React/TypeScript.','Развитие клиентской части продуктов ТехКорп.','ТехКорп','vacancy_junior','hybrid','Москва, Пресненская наб.',37.5877,55.7336,'2026-02-15','2026-06-15',110000,170000,'RUB','{"email":"hr@techcorp.ru"}'::jsonb,ARRAY['React','TypeScript','Next.js','CSS']::text[],'junior','full',NULL,'approved'),
('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','DevOps Engineer','CI/CD, Kubernetes, мониторинг.','Настройка CI/CD пайплайнов, управление Kubernetes-кластерами.','ТехКорп','vacancy_senior','office','Казань, ул. Баумана',49.1089,55.7887,'2026-03-10','2026-07-10',180000,260000,'RUB','{"email":"hr@techcorp.ru"}'::jsonb,ARRAY['Kubernetes','Docker','CI/CD','Terraform','Linux']::text[],'senior','full',NULL,'approved'),
('10000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000003','Marketing Manager','Стратегия продвижения, контент-маркетинг.','Разработка маркетинговой стратегии ГринСтарт.','ГринСтарт','vacancy_junior','office','Санкт-Петербург, Невский пр.',30.3158,59.9343,'2026-02-20','2026-05-31',90000,140000,'RUB','{"email":"hr@greenstart.ru"}'::jsonb,ARRAY['Marketing','SEO','Google Ads','Analytics','SMM']::text[],'junior','full',NULL,'approved'),
('10000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000002','Data Analyst (стажировка)','Анализ продуктовых метрик, SQL, Python.','Стажировка в аналитическом отделе ТехКорп.','ТехКорп','internship','hybrid','Новосибирск, Академгородок',82.9346,55.0084,'2026-03-15','2026-08-15',50000,80000,'RUB','{"email":"hr@techcorp.ru"}'::jsonb,ARRAY['SQL','Python','Pandas','Metabase']::text[],'intern','full','https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80','approved'),
('10000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000003','UX/UI Designer','Проектирование интерфейсов, прототипирование.','Дизайн приложения ГринСтарт.','ГринСтарт','vacancy_junior','office','Санкт-Петербург, Васильевский остров',30.3609,59.9311,'2026-03-05','2026-06-30',100000,150000,'RUB','{"email":"hr@greenstart.ru"}'::jsonb,ARRAY['Figma','UX Research','Prototyping','CSS']::text[],'junior','full',NULL,'approved'),
('10000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000003','Project Manager','Управление IT-проектами, Agile.','Управление проектами в сфере GreenTech.','ГринСтарт','vacancy_senior','hybrid','Екатеринбург, ул. Ленина',60.6122,56.8389,'2026-03-12','2026-07-12',150000,220000,'RUB','{"email":"hr@greenstart.ru"}'::jsonb,ARRAY['Agile','Scrum','Jira','Project Management']::text[],'senior','full',NULL,'approved'),
('10000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000002','Стажёр-разработчик (Go + PostgreSQL)','Бэкенд-стажировка: микросервисы, SQL.','Участие в разработке REST API ТехКорп.','ТехКорп','internship','hybrid','Москва, Пресненская наб.',37.6529,55.7696,'2026-03-20','2026-09-01',60000,90000,'RUB','{"email":"hr@techcorp.ru"}'::jsonb,ARRAY['Go','PostgreSQL','Docker','REST','Git']::text[],'intern','full','https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80','approved'),
('10000000-0000-4000-8000-000000000009','00000000-0000-4000-8000-000000000003','Content Manager','Создание контента о зелёных технологиях.','Написание статей и постов о GreenTech-продуктах.','ГринСтарт','vacancy_junior','remote','Удалённо (Россия)',37.6173,55.7558,'2026-03-18','2026-06-18',70000,110000,'RUB','{"email":"hr@greenstart.ru"}'::jsonb,ARRAY['Copywriting','SEO','SMM','Tilda']::text[],'junior','part',NULL,'approved'),
('10000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','QA Engineer','Ручное и автоматизированное тестирование.','Написание тест-кейсов, автоматизация тестов.','ТехКорп','vacancy_junior','office','Москва, Ленинградский пр.',37.5296,55.7485,'2026-03-22','2026-07-22',100000,160000,'RUB','{"email":"hr@techcorp.ru"}'::jsonb,ARRAY['QA','Selenium','Python','Jira','Postman']::text[],'junior','full',NULL,'approved'),
('10000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000002','Mobile Developer (React Native)','Разработка кроссплатформенных мобильных приложений.','Разработка мобильного приложения ТехКорп.','ТехКорп','vacancy_junior','hybrid','Нижний Новгород, ул. Большая Покровская',43.9361,56.2965,'2026-03-05','2026-07-05',100000,160000,'RUB','{"email":"hr@techcorp.ru"}'::jsonb,ARRAY['React Native','TypeScript','Redux','REST']::text[],'junior','full',NULL,'approved'),
('10000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000003','Эко-аналитик (стажировка)','Анализ углеродного следа, ESG-отчёты.','Стажировка в аналитическом отделе ГринСтарт.','ГринСтарт','internship','office','Самара, ул. Куйбышева',50.1500,53.1959,'2026-03-08','2026-08-08',40000,65000,'RUB','{"email":"hr@greenstart.ru"}'::jsonb,ARRAY['Excel','Python','ESG','Data Analysis']::text[],'intern','full',NULL,'approved'),
('10000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000002','Senior Java Developer','Проектирование высоконагруженных систем.','Разработка микросервисной архитектуры ТехКорп.','ТехКорп','vacancy_senior','remote','Ростов-на-Дону (удалённо)',39.7015,47.2357,'2026-02-25','2026-06-25',250000,350000,'RUB','{"email":"hr@techcorp.ru"}'::jsonb,ARRAY['Java','Spring Boot','Kafka','Microservices']::text[],'senior','full',NULL,'approved'),
('10000000-0000-4000-8000-000000000014','00000000-0000-4000-8000-000000000002','Наставник по Go-разработке','Менторская программа для Go-разработчиков.','Программа наставничества ТехКорп.','ТехКорп','mentorship','hybrid','Краснодар, ул. Красная',38.9760,45.0355,'2026-03-14','2026-09-14',0,0,'RUB','{"email":"hr@techcorp.ru"}'::jsonb,ARRAY['Go','Mentorship','Backend','Algorithms']::text[],'intern','part',NULL,'approved'),
('10000000-0000-4000-8000-000000000015','00000000-0000-4000-8000-000000000003','GreenTech Meetup Воронеж','Митап по экотехнологиям.','Открытый митап ГринСтарт в Воронеже.','ГринСтарт','event','office','Воронеж, пр. Революции',39.1843,51.6720,'2026-03-20','2026-04-20',0,0,'RUB','{"email":"hr@greenstart.ru"}'::jsonb,ARRAY['GreenTech','Networking','ESG','Event']::text[],'intern','project',NULL,'approved'),
('10000000-0000-4000-8000-000000000016','00000000-0000-4000-8000-000000000002','Системный администратор','Администрирование серверной инфраструктуры.','Поддержка серверов ТехКорп во Владивостоке.','ТехКорп','vacancy_junior','office','Владивосток, ул. Светланская',131.8735,43.1056,'2026-03-11','2026-07-11',90000,140000,'RUB','{"email":"hr@techcorp.ru"}'::jsonb,ARRAY['Linux','Networking','Zabbix','Bash']::text[],'junior','full',NULL,'approved'),
('10000000-0000-4000-8000-000000000017','00000000-0000-4000-8000-000000000003','ML Engineer (стажировка)','ML-модели для экологических показателей.','Стажировка в data-команде ГринСтарт.','ГринСтарт','internship','remote','Калининград (удалённо)',20.5070,54.7104,'2026-03-16','2026-09-16',55000,85000,'RUB','{"email":"hr@greenstart.ru"}'::jsonb,ARRAY['Python','PyTorch','MLflow','FastAPI']::text[],'intern','full',NULL,'approved'),
('10000000-0000-4000-8000-000000000018','00000000-0000-4000-8000-000000000003','Хакатон GreenHack 2026','Хакатон по разработке экотехнологий. 48 часов, призовой фонд, менторы из индустрии.','Приглашаем студентов и молодых специалистов на хакатон GreenHack 2026!','ГринСтарт','event','office','Москва, Цифровой деловой центр',37.5350,55.7498,'2026-03-25','2026-05-15',0,0,'RUB','{"email":"events@greenstart.ru","telegram":"@greenstart_events"}'::jsonb,ARRAY['Hackathon','GreenTech','Innovation','Teamwork']::text[],'intern','project',NULL,'approved'),
('10000000-0000-4000-8000-000000000019','00000000-0000-4000-8000-000000000002','День открытых дверей ТехКорп','Знакомство с компанией, экскурсия по офису, Q&A с разработчиками.','Приходите познакомиться с командой ТехКорп!','ТехКорп','event','office','Москва, Пресненская наб.',37.5877,55.7336,'2026-03-20','2026-04-30',0,0,'RUB','{"email":"hr@techcorp.ru","telegram":"@techcorp_events"}'::jsonb,ARRAY['OpenDay','Networking','Career','IT']::text[],'intern','project',NULL,'approved'),
('10000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000003','Лекция: Карьера в GreenTech','Открытая лекция о карьерных возможностях в сфере зелёных технологий.','Спикеры из ГринСтарт расскажут о трендах GreenTech.','ГринСтарт','event','office','Санкт-Петербург, Невский пр.',30.3158,59.9343,'2026-03-18','2026-04-18',0,0,'RUB','{"email":"hr@greenstart.ru"}'::jsonb,ARRAY['Lecture','GreenTech','Career','Networking']::text[],'intern','project',NULL,'approved'),
('10000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000003','Менторская программа по UX-дизайну','Индивидуальное наставничество от UX-лида ГринСтарт.','Программа длится 3 месяца: еженедельные 1-on-1 встречи, разбор портфолио.','ГринСтарт','mentorship','remote','Удалённо (Россия)',37.6173,55.7558,'2026-03-22','2026-09-22',0,0,'RUB','{"email":"hr@greenstart.ru","telegram":"@greenstart_mentors"}'::jsonb,ARRAY['UX','Mentorship','Design','Figma','Career']::text[],'intern','part',NULL,'approved'),
('10000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000002','Наставник по Data Science','Менторская программа для начинающих дата-сайентистов от экспертов ТехКорп.','Программа наставничества ТехКорп: индивидуальные встречи с ментором.','ТехКорп','mentorship','hybrid','Москва, Пресненская наб.',37.5877,55.7336,'2026-03-15','2026-09-15',0,0,'RUB','{"email":"hr@techcorp.ru","telegram":"@techcorp_mentors"}'::jsonb,ARRAY['Data Science','Python','ML','Mentorship','Career']::text[],'intern','part',NULL,'approved');

INSERT INTO applications (opportunity_id, applicant_id, status, resume_snapshot) VALUES
('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000010','pending','Иван Петров, 4 курс МГТУ. Навыки: Go, Python, Docker.'),
('10000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000010','accepted','Иван Петров, 4 курс МГТУ. Навыки: Go, Python, Docker.'),
('10000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000011','pending','Мария Сидорова, выпускница ВШЭ. Навыки: Marketing, Analytics, SEO.'),
('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000012','rejected','Александр Козлов, ИТМО. Навыки: Java, Spring, PostgreSQL.'),
('10000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000013','pending','Елена Волкова, 3 курс СПбГУ. Навыки: Figma, CSS, React.'),
('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000012','pending','Александр Козлов, ИТМО. Навыки: Java, Spring, PostgreSQL, Kubernetes.');

INSERT INTO applicant_contacts (user_id, peer_id) VALUES
('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000011'),
('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000010'),
('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000012'),
('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000010'),
('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000013'),
('00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000011');

INSERT INTO recommendations (from_user_id, to_user_id, opportunity_id, message) VALUES
('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','Алекс, посмотри эту вакансию — подходит под твой стек!'),
('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000006','Лена, тебе будет интересна эта позиция дизайнера в ГринСтарт.'),
('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000003','Ваня, ты же DevOps увлекаешься — вот классная позиция в Казани!'),
('00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000009','Маша, посмотри вакансию контент-менеджера — идеально для тебя!');
`,

	"0006_contacts_v2.sql": `CREATE TABLE IF NOT EXISTS contact_requests (
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

ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS viewed boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS favorites (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunities (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites (user_id);
`,

	"0007_opportunity_view_count.sql": `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS view_count bigint NOT NULL DEFAULT 0;
`,

	"0008_recommendations_unique_triple.sql": `DELETE FROM recommendations r
WHERE r.id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY from_user_id, to_user_id, opportunity_id
             ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM recommendations
  ) x
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recommendations_from_to_opp
ON recommendations (from_user_id, to_user_id, opportunity_id);
`,
}

// migrationNames возвращает отсортированный список имен миграций
func migrationNames() []string {
	names := make([]string, 0, len(migrations))
	for name := range migrations {
		names = append(names, name)
	}
	// Сортировка по имени файла (0001_, 0002_, ...)
	for i := 0; i < len(names); i++ {
		for j := i + 1; j < len(names); j++ {
			if names[j] < names[i] {
				names[i], names[j] = names[j], names[i]
			}
		}
	}
	return names
}
