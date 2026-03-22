CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('applicant', 'employer', 'admin');
CREATE TYPE opportunity_type AS ENUM ('internship', 'vacancy_junior', 'vacancy_senior', 'mentorship', 'event');
CREATE TYPE work_format AS ENUM ('office', 'hybrid', 'remote');
CREATE TYPE employment_type AS ENUM ('full', 'part', 'project');
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected', 'reserve');
CREATE TYPE job_search_status AS ENUM ('active_search', 'considering', 'not_looking');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  role user_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_lower UNIQUE (lower(email))
);

CREATE INDEX idx_users_role ON users (role);

CREATE TABLE applicant_profiles (
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

CREATE TABLE employer_profiles (
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

CREATE TABLE opportunities (
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

CREATE INDEX idx_opportunities_author ON opportunities (author_id);
CREATE INDEX idx_opportunities_published ON opportunities (published_at DESC);
CREATE INDEX idx_opportunities_tags ON opportunities USING GIN (tags);

CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities (id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'pending',
  resume_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT applications_unique UNIQUE (opportunity_id, applicant_id)
);

CREATE INDEX idx_applications_applicant ON applications (applicant_id);
CREATE INDEX idx_applications_opportunity ON applications (opportunity_id);

CREATE TABLE geocode_cache (
  query_hash text PRIMARY KEY,
  query text NOT NULL,
  lon double precision NOT NULL,
  lat double precision NOT NULL,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
