CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
