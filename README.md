<div align="center">

# Трамплин

**Карьерная экосистема для студентов, выпускников и работодателей**

Поиск стажировок, вакансий, менторских программ и карьерных мероприятий — с интерактивной картой и личными кабинетами.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Go](https://img.shields.io/badge/Go-1.23-00ADD8?style=flat-square&logo=go)](https://go.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://docs.docker.com/compose/)

</div>

---

## Содержание

- [О проекте](#о-проекте)
- [Команда разработки](#команда-разработки)
- [Возможности](#возможности)
- [Быстрый старт (Docker)](#быстрый-старт-docker)
- [Сервисы после запуска](#сервисы-после-запуска)
- [Тестовые аккаунты](#тестовые-аккаунты)
- [Запуск без Docker](#запуск-без-docker-разработка)
- [Структура репозитория](#структура-репозитория)
- [Роли и навигация](#роли-пользователей)
- [API](#api-эндпоинты)
- [Переменные окружения](#переменные-окружения)
- [Технологии](#технологии)

---

## О проекте

**Трамплин** — веб-платформа, объединяющая соискателей и компании: публикация и модерация карточек возможностей, отклики с резюме, профессиональная сеть и рекомендации вакансий между контактами, верификация работодателей и панель куратора с аналитикой.

Карточки поддерживают типы: стажировка, вакансия (Junior / Middle+), менторская программа, мероприятие. Геолокация отображается на **Яндекс.Картах** (светлая/тёмная тема в зависимости от настроек приложения).

---

## Команда разработки

Проект выполнен командой **VIPERRRS**.

| Участник | Роль в команде |
|----------|----------------|
| **Уразаев Р. Г.** | Разработка |
| **Кузнецов В. Г.** | Разработка |
| **Адигамов И. В.** | Разработка |

---

## Возможности

| Аудитория | Что доступно |
|-----------|----------------|
| **Гость** | Лента и карта возможностей, фильтры по городу, типу и формату работы |
| **Соискатель** | Профиль и резюме, отклики, избранное, контакты и заявки, рекомендации от друзей, настройки приватности |
| **Работодатель** | Профиль компании и логотип, карточки (после верификации — с модерацией), отклики и статусы, статистика |
| **Куратор** | Верификация компаний, модерация карточек, пользователи (CRUD, роли), все карточки с пагинацией, экспорт статистики, **Grafana** с дашбордом по БД |

---

## Быстрый старт (Docker)

Требуется установленный **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Windows / macOS) или Docker + Compose (Linux).

```bash
# Перейдите в корень репозитория
cd VIPERRRS_delaem

# Соберите и запустите все сервисы
docker compose up --build
```

В логах дождитесь готовности сервисов, например:

```text
tramplin-backend   | tramplin-api listening on :8080
tramplin-frontend  | ✓ Ready in …ms
```

### Что происходит при первом запуске

1. **PostgreSQL** — при пустом volume выполняются скрипты из `backend/internal/db/init-scripts/` (`01-schema.sql`, `02-seed.sql`).
2. **Backend** — подключается к БД и применяет миграции из `backend/internal/db/migrations/`. Миграция **0005_reseed.sql** при необходимости актуализирует seed-данные.
3. **Frontend** — обращается к API по адресу из `NEXT_PUBLIC_API_BASE_URL`.
4. **Grafana** — поднимается с провижингом датасорса PostgreSQL и готовым дашбордом (см. каталог `grafana/provisioning/`).

### Сброс базы данных

```bash
docker compose down -v
docker compose up --build
```

---

## Сервисы после запуска

| Сервис | URL | Примечание |
|--------|-----|------------|
| Веб-приложение | [http://localhost:3000](http://localhost:3000) | Next.js |
| API | [http://localhost:8080/health](http://localhost:8080/health) | Проверка живости |
| Grafana | [http://localhost:3001](http://localhost:3001) | Логин: `admin`, пароль: `tramplin` (см. `docker-compose.yml`) |
| PostgreSQL | `localhost:5432` | Пользователь / БД: `tramplin` |

---

## Тестовые аккаунты

Пароль для всех учётных записей из seed: **`password123`**

| Роль | Описание | Email |
|------|----------|-------|
| Куратор платформы | Полный доступ к админ-функциям | `curator@tramplin.ru` |
| Работодатель | ТехКорп | `hr@techcorp.ru` |
| Работодатель | ГринСтарт | `hr@greenstart.ru` |
| Соискатель | Иван Петров | `ivan@mail.ru` |
| Соискатель | Мария Сидорова | `maria@mail.ru` |
| Соискатель | Александр Козлов | `alex@mail.ru` |
| Соискатель | Елена Волкова | `elena@mail.ru` |

---

## Запуск без Docker (разработка)

### 1. PostgreSQL 16

```sql
CREATE USER tramplin WITH PASSWORD 'tramplin';
CREATE DATABASE tramplin OWNER tramplin;
```

```bash
psql -U tramplin -d tramplin -f backend/internal/db/init-scripts/01-schema.sql
psql -U tramplin -d tramplin -f backend/internal/db/init-scripts/02-seed.sql
```

### 2. Backend

```bash
cd backend
# Скопируйте backend/.env.example в .env и при необходимости поправьте значения
go run ./cmd/api
```

Проверка: [http://localhost:8080/health](http://localhost:8080/health)

### 3. Frontend

```bash
cd frontend
npm install
# Скопируйте frontend/.env.example в .env.local
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

---

## Структура репозитория

```text
├── backend/
│   ├── cmd/api/                 # Точка входа API
│   ├── internal/
│   │   ├── config/
│   │   ├── db/                  # migrations/, init-scripts/
│   │   ├── domain/
│   │   ├── httpapi/             # router, middleware, handlers
│   │   ├── repository/
│   │   └── service/
│   ├── Dockerfile
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── app/                 # App Router
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   └── lib/
│   ├── public/
│   └── Dockerfile
├── grafana/
│   └── provisioning/          # Датасорсы и дашборды Grafana
├── docker-compose.yml
└── README.md
```

---

## Роли пользователей

| Роль | Возможности |
|------|-------------|
| **Гость** | Просмотр карты и ленты; регистрация для откликов и кабинета |
| **Соискатель** | Профиль, резюме, отклики, избранное, контакты, рекомендации, приватность |
| **Работодатель** | Компания, карточки (после верификации, с модерацией), отклики, статистика |
| **Куратор** | Верификация компаний, модерация карточек, пользователи, экспорт, Grafana |

### Навигация по разделам

**Соискатель:** главная `/`, отклики `/applicant/applications`, контакты `/applicant/contacts` (в т.ч. рекомендации), кабинет `/dashboard`.

**Работодатель:** главная `/`, карточки `/employer/opportunities`, создание `/employer/opportunities/new`, отклики `/employer/applications`, статистика `/employer/stats`, компания `/employer/company`.

**Куратор:** главная `/`, дашборд `/admin/dashboard`, пользователи `/admin/users`, карточки `/admin/opportunities`, ссылка на Grafana с дашборда.

---

## API-эндпоинты

Базовый префикс: **`/api/v1`**.

### Публичные

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/opportunities` | Список возможностей |
| GET | `/opportunities/{id}` | Детали возможности |

### Авторизация

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/auth/register` | Регистрация |
| POST | `/auth/login` | Вход |
| POST | `/auth/logout` | Выход |
| POST | `/auth/refresh` | Обновление токена |
| GET | `/auth/me` | Текущий пользователь |

### Соискатель (фрагмент)

| Метод | Путь | Описание |
|-------|------|----------|
| GET/POST | `/applicant/applications` | Список откликов / создать отклик |
| PATCH | `/applicant/profile` | Профиль и резюме |
| PATCH | `/applicant/privacy` | Приватность |
| GET | `/applicant/contacts` | Контакты |
| GET | `/applicant/favorites` | Избранное на сервере |

Полный набор методов см. в `backend/internal/httpapi/router.go`.

### Работодатель (фрагмент)

| Метод | Путь | Описание |
|-------|------|----------|
| GET/POST | `/employer/opportunities` | Список / создать карточку |
| GET | `/employer/applications` | Отклики |
| PATCH | `/employer/applications/{id}` | Статус отклика |
| PATCH | `/employer/profile` | Профиль компании (в т.ч. логотип) |

### Куратор и админ-статистика

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/curator/companies/pending` | Компании на верификации |
| PATCH | `/curator/companies/{id}/verification` | Верификация |
| GET | `/curator/opportunities/pending` | Карточки на модерации |
| PATCH | `/curator/opportunities/{id}/status` | Статус модерации |
| GET | `/admin/stats` | Сводная статистика |
| GET | `/admin/timeline` | Таймлайн активности |
| GET | `/admin/export?format=csv\|json` | Экспорт метрик |
| GET/POST/PATCH/DELETE | `/admin/users` … | Управление пользователями |
| GET/DELETE | `/admin/opportunities` … | Список и удаление карточек |

---

## Переменные окружения

### Backend (`backend/.env`)

| Переменная | Описание |
|------------|----------|
| `HTTP_ADDR` | Адрес прослушивания (например `:8080`) |
| `DATABASE_URL` | Строка подключения PostgreSQL |
| `JWT_SECRET` | Секрет для подписи JWT |
| `CORS_ORIGINS` | Разрешённые origin для CORS |

### Frontend (`frontend/.env.local`)

| Переменная | Описание |
|------------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | URL API (например `http://localhost:8080/api/v1`) |
| `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` | Ключ JavaScript API Яндекс.Карт |

Примеры значений — в `backend/.env.example` и `frontend/.env.example`.

---

## Технологии

| Слой | Стек |
|------|------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Go 1.23, chi, pgx, JWT |
| БД | PostgreSQL 16 |
| Карты | Яндекс Карты API 2.1 |
| Контейнеры | Docker, Docker Compose |
| Графики (ЛК) | Chart.js, react-chartjs-2 |
| Аналитика (опционально) | Grafana + PostgreSQL |
| UI | Hugeicons, Lucide, Framer Motion |

---

<div align="center">

**Трамплин** · команда **VIPERRRS**

</div>
