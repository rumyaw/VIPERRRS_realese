-- +goose Up
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN','CURATOR','EMPLOYER','APPLICANT')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','BLOCKED')),
    display_name TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    owner_user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    website_url TEXT,
    social_links TEXT NOT NULL DEFAULT '[]',
    verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING','APPROVED','REJECTED')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_verifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    curator_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('APPROVED','REJECTED')),
    comment TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applicants_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    university TEXT,
    graduation_year INT,
    course TEXT,
    resume TEXT,
    portfolio TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    employer_company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    curator_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

    title TEXT NOT NULL,
    description TEXT NOT NULL,
    organizer_name TEXT,

    type TEXT NOT NULL CHECK (type IN ('INTERNSHIP','VACANCY','MENTOR_PROGRAM','CAREER_EVENT')),
    work_format TEXT NOT NULL CHECK (work_format IN ('OFFICE','HYBRID','REMOTE')),

    location_type TEXT NOT NULL CHECK (location_type IN ('OFFICE_ADDRESS','CITY')),
    address_text TEXT,
    city_text TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,

    salary_min INT,
    salary_max INT,

    starts_at TEXT,
    ends_at TEXT,

    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('DRAFT','PENDING','APPROVED','REJECTED','SCHEDULED','CLOSED')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS opportunity_tags (
    opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (opportunity_id, tag_id)
);

CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    applicant_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','DECLINED','RESERVED')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(opportunity_id, applicant_user_id)
);

CREATE TABLE IF NOT EXISTS network_contacts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    requester_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_user_id, target_user_id)
);

CREATE TABLE IF NOT EXISTS applicant_privacy (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    hide_applications BOOLEAN NOT NULL DEFAULT false,
    hide_resume BOOLEAN NOT NULL DEFAULT true,
    allow_network_profiles BOOLEAN NOT NULL DEFAULT true
);

-- +goose Down
DROP TABLE IF EXISTS applicant_privacy;
DROP TABLE IF EXISTS network_contacts;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS opportunity_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS opportunities;
DROP TABLE IF EXISTS applicants_profiles;
DROP TABLE IF EXISTS company_verifications;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;

