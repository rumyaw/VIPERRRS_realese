import argparse
import random
import sqlite3
import uuid
from datetime import datetime, timedelta


SKILLS_POOL = [
    "Go",
    "Python",
    "Java",
    "TypeScript",
    "React",
    "Next.js",
    "PostgreSQL",
    "SQLite",
    "Docker",
    "Kubernetes",
    "Redis",
    "Yandex Maps",
    "SQL",
    "GraphQL",
    "REST",
]

TITLES = [
    "Junior Backend Developer",
    "Intern Frontend Engineer",
    "Mentor Program: Fullstack",
    "Career Event: Tech Meetup",
    "Go Developer (Intern)",
    "React Developer (Junior)",
    "Data Analyst Intern",
    "QA Engineer (Junior)",
    "DevOps Intern",
    "Backend Engineer (Junior+)",
]

COMPANIES = [
    "Vector Labs",
    "Skyline Tech",
    "Nova IT",
    "Blue Orbit",
    "GridLine",
    "TalentCode",
    "IT Planet Partners",
]

CITY_POINTS = {
    "Москва": (55.7558, 37.6173),
    "Санкт-Петербург": (59.9343, 30.3351),
    "Казань": (55.7961, 49.1064),
    "Новосибирск": (55.0084, 82.9357),
    "Екатеринбург": (56.8389, 60.6057),
    "Минск": (53.9045, 27.5615),
    "Алматы": (43.2389, 76.8897),
    "Астана": (51.1694, 71.4491),
    "Ташкент": (41.2995, 69.2401),
    "Бишкек": (42.8746, 74.5698),
    "Ереван": (40.1792, 44.4991),
    "Баку": (40.4093, 49.8671),
    "Душанбе": (38.5598, 68.7870),
    "Ашхабад": (37.9601, 58.3261),
    "Кишинев": (47.0105, 28.8638),
}


def uid() -> str:
    return uuid.uuid4().hex


def jitter(base_lat: float, base_lng: float, scale: float = 0.09):
    return (
        base_lat + random.uniform(-scale, scale),
        base_lng + random.uniform(-scale, scale),
    )


def ensure_base_data(conn: sqlite3.Connection):
    cur = conn.cursor()

    # Create one verified employer with company.
    employer_user_id = uid()
    company_id = uid()

    cur.execute(
        """
        INSERT OR IGNORE INTO users (id, email, password_hash, role, status, display_name)
        VALUES (?, ?, ?, 'EMPLOYER', 'ACTIVE', ?)
        """,
        (employer_user_id, "seed_employer@trumplin.local", "seed_hash_placeholder", "Seed Employer"),
    )

    row = cur.execute(
        "SELECT id FROM users WHERE email = ?",
        ("seed_employer@trumplin.local",),
    ).fetchone()
    employer_user_id = row[0]

    cur.execute(
        """
        INSERT OR IGNORE INTO companies (id, owner_user_id, name, description, verification_status)
        VALUES (?, ?, ?, ?, 'APPROVED')
        """,
        (company_id, employer_user_id, "Seed Company", "Auto-seeded company for local demo"),
    )
    row = cur.execute(
        "SELECT id FROM companies WHERE owner_user_id = ?",
        (employer_user_id,),
    ).fetchone()
    company_id = row[0]

    # Ensure tags exist.
    tag_ids = {}
    for s in SKILLS_POOL:
        cur.execute("INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)", (uid(), s))
        tag_ids[s] = cur.execute("SELECT id FROM tags WHERE name = ?", (s,)).fetchone()[0]

    conn.commit()
    return company_id, tag_ids


def seed_opportunities(conn: sqlite3.Connection, count: int):
    company_id, tag_ids = ensure_base_data(conn)
    cur = conn.cursor()

    now = datetime.utcnow()
    types = ["VACANCY", "INTERNSHIP", "MENTOR_PROGRAM", "CAREER_EVENT"]
    formats = ["REMOTE", "HYBRID", "OFFICE"]

    inserted = 0
    for i in range(count):
        city = random.choice(list(CITY_POINTS.keys()))
        base_lat, base_lng = CITY_POINTS[city]
        lat, lng = jitter(base_lat, base_lng)

        opp_id = uid()
        title = f"{random.choice(TITLES)} #{i + 1}"
        opp_type = random.choice(types)
        work_format = random.choice(formats)
        salary_min = random.choice([60000, 80000, 100000, 120000, 0])
        salary_max = salary_min + random.choice([20000, 40000, 70000]) if salary_min > 0 else 0

        starts = now + timedelta(days=random.randint(1, 30))
        ends = starts + timedelta(days=random.randint(10, 90))

        cur.execute(
            """
            INSERT OR REPLACE INTO opportunities (
                id,
                employer_company_id,
                curator_user_id,
                title,
                description,
                organizer_name,
                type,
                work_format,
                location_type,
                address_text,
                city_text,
                lat,
                lng,
                salary_min,
                salary_max,
                starts_at,
                ends_at,
                status,
                created_at,
                updated_at
            ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'CITY', NULL, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            (
                opp_id,
                company_id,
                title,
                f"Auto-generated seeded opportunity in {city}",
                random.choice(COMPANIES),
                opp_type,
                work_format,
                city,
                lat,
                lng,
                salary_min if salary_min > 0 else None,
                salary_max if salary_max > 0 else None,
                starts.isoformat(),
                ends.isoformat(),
            ),
        )

        chosen_skills = random.sample(SKILLS_POOL, k=random.randint(3, 6))
        for sk in chosen_skills:
            cur.execute(
                "INSERT OR IGNORE INTO opportunity_tags (opportunity_id, tag_id) VALUES (?, ?)",
                (opp_id, tag_ids[sk]),
            )

        inserted += 1

    conn.commit()
    return inserted


def main():
    parser = argparse.ArgumentParser(description="Seed SQLite database for Trumplin")
    parser.add_argument("--db", default="backend/trumplin.db", help="Path to sqlite db file")
    parser.add_argument("--count", type=int, default=50, help="How many opportunities to create")
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        inserted = seed_opportunities(conn, args.count)
        print(f"Seed completed. Inserted opportunities: {inserted}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

