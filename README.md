<div align="center">

<img src="frontend/public/images/logo.png" alt="Трамплин — логотип проекта" width="200" />

# Трамплин

**Карьерная экосистема для студентов, выпускников и работодателей**

[![Next.js](https://img.shields.io/badge/Next.js-15.1-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Go](https://img.shields.io/badge/Go-1.26-00ADD8?style=flat-square&logo=go)](https://go.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)

</div>

---

## Содержание

- [О проекте](#о-проекте)
- [Запуск проекта](#запуск-проекта)
- [Тестовые пользователи](#тестовые-пользователи)
- [Grafana](#grafana)
- [Переменные окружения](#переменные-окружения)
- [Docker Compose: команды](#docker-compose-команды)
- [Возможности платформы](#возможности-платформы)
- [Архитектура](#архитектура)
- [Первый запуск и сброс данных](#первый-запуск-и-сброс-данных)
- [Точки входа и порты](#точки-входа-и-порты)
- [Структура репозитория](#структура-репозитория)
- [Роли и маршруты UI](#роли-и-маршруты-ui)
- [API](#api)
- [Аутентификация](#аутентификация)
- [Справочник переменных окружения](#справочник-переменных-окружения)
- [Полезные команды](#полезные-команды)
- [Технологический стек и версии](#технологический-стек-и-версии)
- [Команда и контакты](#команда-и-контакты)

---

## О проекте

**Трамплин** — веб-платформа для поиска стажировок, вакансий, менторских программ и карьерных мероприятий: интерактивная карта на **Яндекс.Картах**, личные кабинеты для соискателей, работодателей и кураторов, модерация контента и аналитика (в т.ч. **Grafana** по данным PostgreSQL).

Стек: **Next.js 15.1** и **React 19** (фронтенд), **Go 1.26** (API), **PostgreSQL 18**, обратный прокси **Nginx**, мониторинг **Prometheus 3.10**, **cAdvisor 0.55.1**, **Grafana** (образ `grafana/grafana:latest` в Compose). Сборка фронтенда в Docker — **Node.js 24**; бэкенд собирается образом **golang:1.26.1-alpine3.23**, рантайм — **Alpine 3.23**.

Репозиторий релиза: **VIPERRRS_realese**.

---

## Запуск проекта

Нужны [Docker Desktop](https://www.docker.com/products/docker-desktop/) или Docker Engine с Compose.

```bash
git clone <URL> VIPERRRS_realese
cd VIPERRRS_realese
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose up --build
```

Сайт: **[http://localhost](http://localhost)**. Дополнительные команды Compose — в разделе [Docker Compose: команды](#docker-compose-команды). Описание переменных — в [Переменные окружения](#переменные-окружения).

---

## Тестовые пользователи

Пароль для всех учётных записей из seed: **`password123`**

| Роль | Отображаемое имя | Email | Комментарий |
|------|------------------|-------|-------------|
| **Куратор** | Куратор платформы | `curator@tramplin.ru` | Админ-панель, модерация, доступ к `/grafana/` через Nginx |
| **Работодатель** | HR ТехКорп | `hr@techcorp.ru` | Компания **ТехКорп**, профиль верифицирован в seed |
| **Работодатель** | HR ГринСтарт | `hr@greenstart.ru` | Компания **ГринСтарт**, профиль верифицирован в seed |
| **Соискатель** | Иван Петров | `ivan@mail.ru` | Демо-данные в seed |
| **Соискатель** | Мария Сидорова | `maria@mail.ru` | Демо-данные в seed |
| **Соискатель** | Александр Козлов | `alex@mail.ru` | Демо-данные в seed |
| **Соискатель** | Елена Волкова | `elena@mail.ru` | Демо-данные в seed |

Источник: `backend/internal/db/init-scripts/02-seed.sql`.

---

## Grafana

### Вход через сайт

1. Войдите на **[http://localhost](http://localhost)** под учётной записью **куратора** (см. [тестовые пользователи](#тестовые-пользователи)).
2. Откройте **[http://localhost/grafana/](http://localhost/grafana/)** (со слешем в конце).

Nginx вызывает `GET /api/v1/internal/nginx-grafana-auth`: допускается только роль **`curator`** с валидным JWT в cookie **`access_token`** или в заголовке **`Authorization: Bearer …`**. При отказе — редирект на `/login?next=/grafana/`. Email передаётся в Grafana как **`X-WEBAUTH-USER`** (auth proxy); форма входа Grafana отключена.

### PostgreSQL в Grafana (один раз после первого входа)

Источник **PostgreSQL** задан в `grafana/provisioning/datasources/datasources.yml` (хост `postgres:5432`, БД и пользователь `tramplin`). После первого входа куратора:

1. **Connections** → **Data sources** (в новых версиях UI: **Data connections** / **Connect data**).
2. Откройте **PostgreSQL**.
3. Нажмите **Save & test** и дождитесь успеха.

### Дашборд

**Dashboards** → **«Трамплин — Обзор платформы»** (`grafana/provisioning/dashboards/tramplin.json`). Панели строятся по данным PostgreSQL: пользователи, карточки, отклики, модерация, срезы по ролям и типам и т.д.

### Метрики контейнеров

**Drilldown** → **Metrics** — источник **Prometheus** (в т.ч. **cAdvisor**).

### Прямой доступ к UI Grafana (отладка)

**[http://localhost:3001](http://localhost:3001)** — логин / пароль: **`admin`** / **`tramplin`** (`GF_SECURITY_ADMIN_*` в `docker-compose.yml`). Обходит проверку роли куратора на сайте.

**Продакшен:** свой `JWT_SECRET` (≥ 32 символов), **Secure** у cookie при HTTPS, ограничение публикации портов Prometheus, cAdvisor и прямого Grafana, актуальные `CORS_ORIGINS`.

---

## Переменные окружения

### Backend — `backend/.env`

```bash
cp backend/.env.example backend/.env
```

| Переменная | Назначение |
|------------|------------|
| `HTTP_ADDR` | `:8080` |
| `DATABASE_URL` | Строка PostgreSQL (в Compose внутри сети: `postgres://tramplin:tramplin@postgres:5432/tramplin?sslmode=disable`) |
| `JWT_SECRET` | Не короче **32** символов |
| `CORS_ORIGINS` | Origins через запятую |

Переопределения с префиксом `TRUMPLIN_*`: `backend/internal/config/config.go`.

### Frontend — `frontend/.env.local`

```bash
cp frontend/.env.example frontend/.env.local
```

| Переменная | Назначение |
|------------|------------|
| `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` | Ключ [JavaScript API 2.1 Яндекс.Карт](https://developer.tech.yandex.ru/) |
| `NEXT_PUBLIC_API_BASE_URL` | В Docker-сборке задаётся в `docker-compose.yml` как `/api/v1` |
| `NEXT_PUBLIC_GRAFANA_URL` | Опционально: ссылка на Grafana в админке |

Для контейнеров значения по умолчанию заданы в **`docker-compose.yml`** (секция `frontend`: `build.args` и `environment`; `backend`: `environment`). Смена ключа карт или секрета — правка compose и `docker compose up --build`.

---

## Docker Compose: команды

Выполняются из корня репозитория **VIPERRRS_realese** (рядом с `docker-compose.yml`).

**С логами в терминале:**

```bash
docker compose up --build
```

**В фоне:**

```bash
docker compose up --build -d
```

**Логи после фонового запуска:**

```bash
docker compose logs -f
docker compose logs -f backend
docker compose logs --tail=100 nginx
```

**Пересборка без кэша:**

```bash
docker compose build --no-cache
docker compose up
```

**Остановка (данные volume сохраняются):**

```bash
docker compose down
```

**Остановка и удаление volume (сброс БД и Grafana):**

```bash
docker compose down -v
```

---

## Возможности платформы

| Аудитория | Возможности |
|-----------|-------------|
| **Гость** | Лента и карта возможностей, фильтры, просмотр карточки, регистрация и вход |
| **Соискатель** | Профиль и резюме, отклики, избранное, контакты, рекомендации, приватность |
| **Работодатель** | Профиль компании, карточки после верификации, модерация, отклики, статистика |
| **Куратор** | Верификация компаний, модерация карточек, пользователи и роли, экспорт метрик, админка, Grafana |

**Типы карточек:** стажировка, вакансия Junior, вакансия Middle+, менторская программа, карьерное мероприятие. **Форматы работы:** офис, гибрид, удалённо.

---

## Архитектура

Фронтенд и API для браузера идут через **Nginx (порт 80)**. Префикс `/api/v1` — на Go-бэкенд; `/grafana/` — на Grafana после проверки JWT куратора.

```mermaid
flowchart TB
  subgraph client [Браузер]
    U[Пользователь]
  end
  subgraph edge [Порт 80]
    N[Nginx]
  end
  subgraph app [Приложение]
    F[Next.js]
    B[Go API]
  end
  subgraph data [Данные]
    PG[(PostgreSQL)]
  end
  subgraph observability [Наблюдаемость]
    G[Grafana]
    P[Prometheus]
    C[cAdvisor]
  end
  U --> N
  N -->|"/"| F
  N -->|"/api/"| B
  N -->|"/grafana/" auth_request| B
  N -->|JWT OK| G
  B --> PG
  G --> PG
  G --> P
  P --> C
```

**Prometheus** собирает метрики **cAdvisor**. В Grafana — дашборд **«Трамплин — Обзор платформы»** (PostgreSQL). Порты **9090**, **8089**, **3001** — для отладки.

---

## Первый запуск и сброс данных

При пустом volume PostgreSQL выполняются `backend/internal/db/init-scripts/` (`01-schema.sql`, `02-seed.sql`), затем backend применяет миграции из `backend/internal/db/migrations/`.

**Полный сброс:**

```bash
docker compose down -v
docker compose up --build
```

Volume: `tramplin_pg18_data`, `tramplin_grafana_data` (префикс в Docker см. `docker volume ls`).

**Несовместимый том PostgreSQL (другая мажорная версия):**

```bash
docker compose down
docker volume rm <имя_тома_postgres>
docker compose up --build
```

---

## Точки входа и порты

| Назначение | URL / хост | Комментарий |
|------------|------------|-------------|
| **Сайт** | [http://localhost](http://localhost) | Nginx |
| API health у backend | `http://backend:8080/health` | Из сети Compose; порт 8080 на хост не проброшен |
| PostgreSQL | `localhost:5432` | `tramplin` / `tramplin` / `tramplin` |
| Prometheus | [http://localhost:9090](http://localhost:9090) | v3.10 |
| cAdvisor | [http://localhost:8089](http://localhost:8089) | v0.55.1 |
| Grafana | [http://localhost:3001](http://localhost:3001) | `admin` / `tramplin` — только отладка |

---

## Структура репозитория

```text
├── backend/
│   ├── cmd/api/
│   ├── internal/ (auth, config, db, domain, httpapi, repository, service)
│   ├── Dockerfile
│   └── go.mod
├── frontend/
│   ├── src/ (app, components, lib, …)
│   ├── public/
│   └── Dockerfile
├── docs/readme/
├── grafana/provisioning/
├── nginx/nginx.conf
├── prometheus/prometheus.yml
├── docker-compose.yml
└── README.md
```

---

## Роли и маршруты UI

| Роль | Разделы |
|------|---------|
| **Соискатель** | `/`, `/applicant/*`, `/dashboard` |
| **Работодатель** | `/employer/opportunities`, `/employer/applications`, `/employer/stats`, `/employer/company` |
| **Куратор** | `/admin/*`, ссылка на `/grafana/` |

Публичные профили: `/applicant/profile/[userId]`, `/employer/profile/[userId]`.

---

## API

Префикс: **`/api/v1`**.

**Публичные:** `GET /opportunities`, `GET /opportunities/{id}`, публичные профили соискателя и работодателя.

**Аутентификация:** `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`, `GET /auth/me`.

**Остальные маршруты** — в `backend/internal/httpapi/router.go`.

**Nginx → backend:** `GET /internal/nginx-grafana-auth` — `204` и email при успехе.

---

## Аутентификация

- **httpOnly** cookie: `access_token`, `refresh_token`, путь `/`.
- Заголовок **`Authorization: Bearer <access_token>`** поддерживается.
- Тема UI: класс **`.dark`** на `<html>` и модификаторы Tailwind `dark:`.

---

## Справочник переменных окружения

| Файл | Переменные |
|------|------------|
| `backend/.env` | `HTTP_ADDR`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` |
| `frontend/.env.local` | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_YANDEX_MAPS_API_KEY`, `NEXT_PUBLIC_GRAFANA_URL` |

Шаблоны: **`backend/.env.example`**, **`frontend/.env.example`**.

---

## Полезные команды

```bash
docker compose down
docker compose build
```

---

## Технологический стек и версии

| Компонент | Версия / образ |
|-----------|----------------|
| **Next.js** | ^15.1.0 (`package.json`) |
| **React** | ^19.0.0 |
| **TypeScript** | ^5 |
| **Tailwind CSS** | ^4.0.0 |
| **Framer Motion** | ^11.15.0 |
| **Chart.js** / **react-chartjs-2** | ^4.5.1 / ^5.3.1 |
| **Node.js** (Dockerfile фронта) | 24-alpine |
| **Go** (`go.mod`, builder-образ) | 1.26.1 |
| **chi** | v5.2.5 |
| **pgx** | v5.9.1 |
| **golang-jwt** | v5.3.1 |
| **PostgreSQL** | образ `postgres:18-alpine` |
| **Prometheus** | `prom/prometheus:v3.10.0` |
| **cAdvisor** | `gcr.io/cadvisor/cadvisor:v0.55.1` |
| **Grafana** | `grafana/grafana:latest` |
| **Nginx** | `nginx:alpine` |
| **Backend runtime** | `alpine:3.23` |

---

## Команда и контакты

<div align="center">

<img src="docs/readme/logo_team.png" alt="VIPERRRS" width="220" />

### Команда **VIPERRRS**

*Международная олимпиада «IT-Планета 2026» · Прикладное программирование if…else*

</div>

<br />

| № | Участник |
|---|----------|
| 1 | **Уразаев** Руслан Галимьянович |
| 2 | **Кузнецов** Вячеслав Георгиевич |
| 3 | **Адигамов** Ильнур Вилюрович |

Если возникнут вопросы по проекту, запуску или развёртыванию, напишите в **Issues** этого репозитория или свяжитесь с командой **VIPERRRS** через каналы, указанные в материалах олимпиады.

---

<div align="center">

**Трамплин** · команда **VIPERRRS** · **IT-Планета 2026**

</div>
