# Трамплин — карьерная платформа (IT Planet)

Полноценный web-проект по ТЗ конкурса `if...else`:
- карта + лента возможностей,
- роли (`APPLICANT`, `EMPLOYER`, `CURATOR`, `ADMIN`),
- регистрация/авторизация, сессии в `httpOnly` cookies,
- модерация компаний и возможностей,
- нетворкинг и приватность,
- адаптивный UI (включая мобильное меню),
- светлая/темная тема и фоновые эффекты.

## Технологии
- **Frontend:** Next.js (App Router, TypeScript, Tailwind)
- **Backend:** Go (chi, goose)
- **Database:** SQLite
- **Map:** Yandex JS API + Yandex HTTP Geocoder
- **Container:** Docker Compose

## API ключ (используется в проекте)
- `f0e8de45-f741-497b-bf91-92d52a17b41c`

Он уже подставлен в `.env.example` и `docker-compose.yml` как default.
При необходимости замените на свой.

---

## Структура
- `frontend/` — Next.js приложение
- `backend/` — Go API + миграции SQLite
- `scripts/seed_sqlite.py` — скрипт заполнения базы (50 записей)
- `docker-compose.yml` — запуск всего локально через Docker

---

## Переменные окружения
Скопируйте `.env.example` в `.env` (по желанию) и измените значения.

Ключевые:
- `TRUMPLIN_DATABASE_DSN`  
  пример: `file:trumplin.db?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)`
- `TRUMPLIN_HTTP_PORT=8080`
- `TRUMPLIN_CORS_ORIGIN=http://localhost:3000`
- `TRUMPLIN_JWT_SECRET=...` (для dev есть дефолт, но лучше задать явно)
- `TRUMPLIN_ADMIN_EMAIL=admin@example.com`
- `TRUMPLIN_ADMIN_PASSWORD=change_me_admin_password`
- `YANDEX_GEOCODER_KEY=...`
- `YANDEX_JAVASCRIPT_API_KEY=...`

---

## Запуск через Docker (рекомендуется)
1. Убедитесь, что Docker Desktop запущен.
2. В корне проекта:
   ```bash
   docker compose up --build
   ```
3. Откройте:
   - Frontend: `http://localhost:3000`
   - Backend health: `http://localhost:8080/api/health`

SQLite-файл в Docker хранится в volume `trumplin_sqlite_data`.

---

## Запуск вручную (без Docker)

### 1) Backend
```powershell
cd backend/cmd/server
go run main.go
```

По умолчанию база будет создана рядом с процессом как SQLite файл
(если не переопределен `TRUMPLIN_DATABASE_DSN`).

Проверка:
- `http://localhost:8080/api/health`

### 2) Frontend
```powershell
cd frontend
npm install
npm run dev
```

`npm run dev` запускается через `next dev --webpack`, чтобы избежать краша Turbopack на путях с кириллицей.

Опционально добавьте `frontend/.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_YANDEX_API_KEY=f0e8de45-f741-497b-bf91-92d52a17b41c
```

Открыть:
- `http://localhost:3000`

---

## Первичное наполнение БД (50 записей)
После первого старта backend выполните:

```bash
python scripts/seed_sqlite.py --db backend/trumplin.db --count 50
```

Что делает скрипт:
- создает/обновляет базового работодателя и компанию,
- добавляет теги,
- добавляет **50 возможностей** со статусом `APPROVED`,
- у каждой записи есть **геометка** (`lat/lng`) и skills.
- география распределяется по городам СНГ (Россия, Беларусь, Казахстан, Узбекистан, Кыргызстан, Армения, Азербайджан, Таджикистан, Туркменистан, Молдова).

---

## Как работать в системе

### Главная (`/`)
- карта + список,
- карточка по hover на маркере и закрепление по клику,
- фильтры (MVP),
- избранное в `localStorage` (маркеры избранного выделяются отдельно).

### Регистрация/логин
- `/register` — выбор роли (`APPLICANT` / `EMPLOYER`)
- `/login`

### Кабинеты
- `/dashboard` меняется по роли:
  - **EMPLOYER**: список своих возможностей + форма создания
  - **APPLICANT**: отклики, контакты, приватность
  - **CURATOR/ADMIN**: модерация компаний и возможностей

---

## Основные API endpoint'ы

### Public
- `GET /api/public/opportunities?city=...`

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/me`

### Employer
- `GET /api/employer/opportunities`
- `POST /api/employer/opportunities`
- `GET /api/employer/applications`
- `PATCH /api/employer/applications/{applicationId}`

### Applicant
- `GET /api/applicant/applications`
- `POST /api/applicant/applications`
- `PATCH /api/applicant/profile`
- `PATCH /api/applicant/privacy`
- `GET /api/applicant/contacts`
- `POST /api/applicant/contacts`
- `POST /api/applicant/recommendations`
- `GET /api/applicant/recommendations/inbox`

### Curator/Admin
- `GET /api/curator/companies/pending`
- `PATCH /api/curator/companies/{companyId}/verification`
- `GET /api/curator/opportunities/pending`
- `PATCH /api/curator/opportunities/{opportunityId}/status`

---

## Дизайн и UX (что уже учтено)
- динамический navbar по авторизации,
- переключатель темы с иконкой,
- мобильный burger-menu,
- фоновый слой с мягкими частицами ("звездное небо"),
- увеличенная карта на главной, визуально стилизованный контейнер.
- popup карточка вакансии: формат работы, тип локации, адрес/город, описание, навыки.

---

## Безопасность
- `httpOnly` cookie для access/refresh токенов,
- refresh rotation,
- `argon2id` хеширование паролей,
- RBAC-проверки только на backend.


