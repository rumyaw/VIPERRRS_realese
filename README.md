<div align="center">

<img src="frontend/public/images/logo.png" alt="Трамплин — логотип проекта" width="200" />

# Трамплин

**Карьерная экосистема для студентов, выпускников и работодателей**

Поиск стажировок, вакансий, менторских программ и карьерных мероприятий — с интерактивной картой (**Яндекс.Карты**), личными кабинетами по ролям, модерацией контента и аналитикой для кураторов.

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Go](https://img.shields.io/badge/Go-1.23-00ADD8?style=flat-square&logo=go)](https://go.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Nginx](https://img.shields.io/badge/Nginx-reverse_proxy-009639?style=flat-square&logo=nginx&logoColor=white)](https://nginx.org/)

</div>

---

## Содержание

- [Запуск проекта](#запуск-проекта)
- [Переменные окружения (.env и .env.local)](#переменные-окружения-env-и-envlocal)
- [Docker Compose: команды](#docker-compose-команды)
- [Возможности платформы](#возможности-платформы)
- [Архитектура](#архитектура)
- [Первый запуск и сброс данных](#первый-запуск-и-сброс-данных)
- [Точки входа и порты](#точки-входа-и-порты)
- [Grafana: вход, PostgreSQL, дашборд](#grafana-вход-postgresql-дашборд)
- [Тестовые учётные записи](#тестовые-учётные-записи)
- [Локальная разработка без Docker](#локальная-разработка-без-docker)
- [Структура репозитория](#структура-репозитория)
- [Роли и маршруты UI](#роли-и-маршруты-ui)
- [API](#api)
- [Аутентификация](#аутентификация)
- [Справочник переменных окружения](#справочник-переменных-окружения)
- [Полезные команды](#полезные-команды)
- [Технологический стек](#технологический-стек)
- [Команда](#команда)

---

## Запуск проекта

**Требование:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS) или Docker Engine с плагином Compose (Linux).

1. Клонируйте репозиторий и перейдите в каталог проекта.
2. (Рекомендуется для локальной разработки вне Docker) создайте файлы окружения по разделу [Переменные окружения](#переменные-окружения-env-и-envlocal). Для запуска **только** через Docker Compose достаточно значений из `docker-compose.yml`; отдельные `backend/.env` и `frontend/.env.local` контейнерам не подключаются.
3. Выполните сборку и запуск стека — см. [Docker Compose: команды](#docker-compose-команды).
4. Откройте в браузере **[http://localhost](http://localhost)** (Nginx, порт 80).

**Признак готовности:** в логах контейнера `backend` сообщение о прослушивании `:8080` и успешный healthcheck; у `frontend` — строка `Ready` (production-режим Next.js).

---

## Переменные окружения (.env и .env.local)

### Backend — файл `backend/.env`

Создайте файл на основе примера:

```bash
cp backend/.env.example backend/.env
```

Заполните переменные:

| Переменная | Значение для локального API (БД из Docker Compose на хосте) |
|------------|-------------------------------------------------------------|
| `HTTP_ADDR` | `:8080` |
| `DATABASE_URL` | `postgres://tramplin:tramplin@localhost:5432/tramplin?sslmode=disable` |
| `JWT_SECRET` | Строка **не короче 32 символов** (в `docker-compose.yml` для демо задан свой пример). |
| `CORS_ORIGINS` | Список origin через запятую, например `http://localhost:3000` для dev-фронта. |

Альтернативные имена переменных с префиксом `TRUMPLIN_*` описаны в `backend/internal/config/config.go`.

### Frontend — файл `frontend/.env.local`

Создайте файл на основе примера:

```bash
cp frontend/.env.example frontend/.env.local
```

Заполните переменные:

| Переменная | Назначение |
|------------|------------|
| `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` | Ключ JavaScript API 2.1 из [кабинета Яндекс.Карт](https://developer.tech.yandex.ru/). Без ключа карта на сайте не инициализируется. |
| `NEXT_PUBLIC_API_BASE_URL` | Базовый URL API. При `npm run dev`: `http://localhost:8080/api/v1`. В Docker-сборке задаётся как `/api/v1` (запросы идут через тот же origin, Nginx проксирует на backend). |
| `NEXT_PUBLIC_GRAFANA_URL` | Опционально: URL Grafana для ссылок в админке (например `/grafana/` при работе за Nginx). |

В **Docker Compose** ключ карты и `NEXT_PUBLIC_API_BASE_URL` заданы в `docker-compose.yml` (секция `frontend`: `build.args` и `environment`). Чтобы сменить ключ в контейнерной сборке, отредактируйте эти поля и выполните `docker compose up --build` снова.

---

## Docker Compose: команды

Рабочий каталог — корень репозитория (рядом с `docker-compose.yml`).

### Запуск с выводом логов в терминал (foreground)

Логи всех сервисов идут в текущую консоль; остановка — `Ctrl+C`.

```bash
docker compose up --build
```

Пересборка без кэша (при подозрении на устаревший слой образа):

```bash
docker compose build --no-cache
docker compose up
```

### Запуск в фоне (без потока логов в терминале)

Контейнеры работают в detached-режиме; приглашение shell возвращается сразу.

```bash
docker compose up --build -d
```

### Просмотр логов при фоновом запуске

Все сервисы, поток в реальном времени:

```bash
docker compose logs -f
```

Один сервис (пример — backend):

```bash
docker compose logs -f backend
```

Последние N строк без «хвоста»:

```bash
docker compose logs --tail=100 nginx
```

### Остановка

Остановить контейнеры, **сохранив** данные в volume (PostgreSQL, Grafana):

```bash
docker compose down
```

Остановить и **удалить** именованные volume (полный сброс БД и данных Grafana):

```bash
docker compose down -v
```

---

## Возможности платформы

| Аудитория | Возможности |
|-----------|-------------|
| **Гость** | Лента и карта возможностей, фильтры (поиск, тег/стек, формат работы, город, тип карточки), просмотр карточки, регистрация и вход |
| **Соискатель** | Профиль и резюме, отклики с снимком резюме, избранное (локально + синхронизация на сервере), контакты и заявки, рекомендации вакансий контактам, настройки приватности профиля |
| **Работодатель** | Профиль компании и логотип, создание карточек после верификации, модерация публикаций, просмотр и смена статусов откликов, статистика по откликам |
| **Куратор** | Верификация компаний, очередь модерации карточек, CRUD пользователей и смена ролей, список всех карточек, экспорт метрик (CSV/JSON), админ-дашборд, Grafana (обзор по БД) |

**Типы карточек:** стажировка, вакансия Junior, вакансия Middle+, менторская программа, карьерное мероприятие. **Форматы работы:** офис, гибрид, удалённо.

---

## Архитектура

В режиме **Docker Compose** фронтенд и API для браузера отдаются через **Nginx (порт 80)**. Статика и страницы Next.js — с того же origin; префикс `/api/v1` проксируется на Go-бэкенд; `/grafana/` — на Grafana после проверки JWT куратора.

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

- **Prometheus** собирает метрики **cAdvisor** (контейнеры). В Grafana загружается провиженный дашборд **«Трамплин — Обзор платформы»** (источник данных — PostgreSQL).
- Порты **9090** (Prometheus), **8089** (cAdvisor), **3001** (Grafana) проброшены для отладки; в продакшене доступ к ним ограничивают файрволом или убирают публикацию.

---

## Первый запуск и сброс данных

При **пустом** volume PostgreSQL контейнер выполняет скрипты из `backend/internal/db/init-scripts/` (`01-schema.sql`, `02-seed.sql`). Затем backend подключается к БД и применяет миграции из `backend/internal/db/migrations/` в порядке версий.

Frontend в образе собирается с `NEXT_PUBLIC_API_BASE_URL=/api/v1`. Nginx маршрутизирует `/`, `/api/`, `/grafana/`, `/prometheus/`. Grafana получает провиженные источники данных (PostgreSQL, Prometheus) и дашборд из `grafana/provisioning/`.

### Полный сброс данных

```bash
docker compose down -v
docker compose up --build
```

Удаляются именованные volume `tramplin_pg18_data` и `tramplin_grafana_data` (префикс в Docker Desktop обычно совпадает с именем каталога проекта — проверка: `docker volume ls`).

### Смена мажорной версии PostgreSQL или битый том

Образ PostgreSQL **18** несовместим с данными от другой мажорной версии. После обновления образа при ошибках инициализации остановите стек, удалите volume с данными Postgres и поднимите compose снова:

```bash
docker compose down
docker volume rm <имя_тома_postgres>
docker compose up --build
```

Имя тома возьмите из `docker volume ls` (фрагмент имени: `tramplin_pg18_data`).

---

## Точки входа и порты

| Назначение | URL / хост | Комментарий |
|------------|------------|-------------|
| **Основной вход** | [http://localhost](http://localhost) | Nginx: фронт, API, Grafana по правилам доступа |
| API health (напрямую к backend) | `http://localhost:8080/health` | Порт 8080 снаружи не проброшен в compose; проверка изнутри сети compose или при ручной публикации порта |
| Frontend без compose | [http://localhost:3000](http://localhost:3000) | `npm run dev` |
| PostgreSQL | `localhost:5432` | Пользователь, БД, пароль: `tramplin` / `tramplin` / `tramplin` |
| Prometheus | [http://localhost:9090](http://localhost:9090) | Без отдельной авторизации в текущем compose |
| cAdvisor | [http://localhost:8089](http://localhost:8089) | Метрики контейнеров |
| Grafana напрямую | [http://localhost:3001](http://localhost:3001) | Логин Grafana UI: `admin` / `tramplin` (см. `docker-compose.yml`). Обходит Nginx и проверку роли куратора — только для отладки |

---

## Grafana: вход, PostgreSQL, дашборд

### Вход через сайт (основной сценарий)

1. Войдите на **[http://localhost](http://localhost)** под учётной записью **куратора** (см. [тестовые аккаунты](#тестовые-учётные-записи)).
2. Откройте **[http://localhost/grafana/](http://localhost/grafana/)** (со слешем в конце пути).

Nginx вызывает `GET /api/v1/internal/nginx-grafana-auth`: допускается только роль **`curator`** с валидным JWT в cookie **`access_token`** или в заголовке **`Authorization: Bearer …`**. При отказе выполняется редирект на `/login?next=/grafana/`. Email пользователя передаётся в Grafana заголовком **`X-WEBAUTH-USER`** (auth proxy); форма входа Grafana отключена в пользу доверенного прокси.

### Подключение PostgreSQL и проверка (один раз после первого открытия Grafana)

Источник **PostgreSQL** уже описан в `grafana/provisioning/datasources/datasources.yml` (хост `postgres:5432`, БД `tramplin`, пользователь `tramplin`). После первого входа куратора в Grafana выполните сохранение источника в UI — это записывает настройки в базу Grafana и подтверждает соединение:

1. Меню слева: **Connections** → **Data sources** (в разных версиях интерфейса пункт может называться **Data connections** / **Connect data**).
2. Откройте источник **PostgreSQL**.
3. Нажмите **Save & test**. Дождитесь статуса успешной проверки.

### Открытие дашборда по платформе

1. Меню слева: **Dashboards**.
2. Откройте дашборд **«Трамплин — Обзор платформы»** (файл `grafana/provisioning/dashboards/tramplin.json`).

На дашборде отображаются панели по данным PostgreSQL: число пользователей, карточек, откликов, модерация, регистрации и отклики за 30 дней, разрезы по ролям и типам карточек и др.

### Метрики контейнеров (Prometheus)

В Grafana выберите раздел **Drilldown** → **Metrics** (в актуальных сборках Grafana) для просмотра метрик из источника **Prometheus** (в т.ч. cAdvisor).

### Аварийный вход в UI Grafana по порту 3001

**URL:** [http://localhost:3001](http://localhost:3001). **Логин / пароль:** `admin` / `tramplin` (переменные `GF_SECURITY_ADMIN_*` в `docker-compose.yml`). Используйте только в отладке: этот обход не проверяет роль куратора на сайте.

**Продакшен:** задайте свой `JWT_SECRET` (≥ 32 символов), включите флаг **Secure** у cookie при HTTPS, не публикуйте наружу порты Prometheus, cAdvisor и прямой Grafana без необходимости, настройте реальные значения `CORS_ORIGINS`.

---

## Тестовые учётные записи

Пароль для всех записей из seed: **`password123`**

| Роль | Отображаемое имя | Email | Комментарий |
|------|------------------|-------|-------------|
| **Куратор** | Куратор платформы | `curator@tramplin.ru` | Админ-панель, модерация, доступ к `/grafana/` через Nginx |
| **Работодатель** | HR ТехКорп | `hr@techcorp.ru` | Компания **ТехКорп**, профиль верифицирован в seed |
| **Работодатель** | HR ГринСтарт | `hr@greenstart.ru` | Компания **ГринСтарт**, профиль верифицирован в seed |
| **Соискатель** | Иван Петров | `ivan@mail.ru` | Профиль и данные для демо в seed |
| **Соискатель** | Мария Сидорова | `maria@mail.ru` | Профиль и данные для демо в seed |
| **Соискатель** | Александр Козлов | `alex@mail.ru` | Профиль и данные для демо в seed |
| **Соискатель** | Елена Волкова | `elena@mail.ru` | Профиль и данные для демо в seed |

Источник данных: `backend/internal/db/init-scripts/02-seed.sql`.

---

## Локальная разработка без Docker

### 1. PostgreSQL 18

```sql
CREATE USER tramplin WITH PASSWORD 'tramplin';
CREATE DATABASE tramplin OWNER tramplin;
```

```bash
psql -U tramplin -d tramplin -f backend/internal/db/init-scripts/01-schema.sql
psql -U tramplin -d tramplin -f backend/internal/db/init-scripts/02-seed.sql
```

Далее примените файлы из `backend/internal/db/migrations/` по возрастанию номера в имени файла (как при деплое) либо используйте тот же сценарий, что и в Docker (единый backend при старте накатывает миграции).

### 2. Backend

```bash
cd backend
cp .env.example .env
# отредактируйте .env при необходимости
go run ./cmd/api
```

Проверка: [http://localhost:8080/health](http://localhost:8080/health)

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# укажите NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1 и NEXT_PUBLIC_YANDEX_MAPS_API_KEY
npm run dev
```

Сайт: [http://localhost:3000](http://localhost:3000).

---

## Структура репозитория

```text
├── backend/
│   ├── cmd/api/                    # Точка входа HTTP API
│   ├── internal/
│   │   ├── auth/                   # JWT
│   │   ├── config/
│   │   ├── db/
│   │   │   ├── init-scripts/       # Первичная схема и seed для Docker
│   │   │   └── migrations/         # Версионированные миграции
│   │   ├── domain/
│   │   ├── httpapi/                # router.go, middleware, handlers
│   │   ├── repository/
│   │   └── service/
│   ├── Dockerfile
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router (страницы)
│   │   ├── components/             # UI, карты, кабинеты
│   │   ├── contexts/
│   │   ├── hooks/
│   │   └── lib/                    # api.ts, типы, утилиты
│   ├── public/
│   └── Dockerfile
├── docs/
│   └── readme/                     # Логотип команды VIPERRRS
├── grafana/
│   └── provisioning/
│       ├── dashboards/             # dashboard.yml, tramplin.json
│       └── datasources/            # PostgreSQL + Prometheus
├── nginx/
│   └── nginx.conf                  # Прокси, auth_request для Grafana
├── prometheus/
│   └── prometheus.yml              # scrape cAdvisor
├── docker-compose.yml
└── README.md
```

---

## Роли и маршруты UI

| Роль | Ключевые разделы |
|------|------------------|
| **Соискатель** | `/` — лента/карта; `/applicant/applications` — отклики; `/applicant/contacts` — контакты и рекомендации; `/dashboard` — кабинет |
| **Работодатель** | `/employer/opportunities`, `/employer/opportunities/new`, `/employer/applications`, `/employer/stats`, `/employer/company` |
| **Куратор** | `/admin/dashboard`, `/admin/users`, `/admin/opportunities`; ссылка **Grafana** ведёт на `/grafana/` |

Публичные профили: `/applicant/profile/[userId]`, `/employer/profile/[userId]` (с учётом настроек приватности).

---

## API

Базовый префикс: **`/api/v1`**.

### Публичные

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/opportunities` | Список возможностей |
| GET | `/opportunities/{id}` | Детали |
| GET | `/applicant/profile/{userId}` | Публичный профиль соискателя |
| GET | `/employer/public-profile/{userId}` | Публичный профиль работодателя |

### Аутентификация

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/auth/register` | Регистрация |
| POST | `/auth/login` | Вход (httpOnly cookie) |
| POST | `/auth/logout` | Выход |
| POST | `/auth/refresh` | Обновление access token |
| GET | `/auth/me` | Текущий пользователь |

### Защищённые маршруты

Маршруты соискателя, работодателя и куратора требуют JWT и соответствующей роли. Полный список — в **`backend/internal/httpapi/router.go`**.

### Служебное (куратор, для Nginx)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/internal/nginx-grafana-auth` | Ответ `204` и заголовок с email при успехе; иначе `401`/`403` |

---

## Аутентификация

- **Access** и **refresh** токены выдаются при логине и обновлении сессии; хранятся в **httpOnly** cookie (`access_token`, `refresh_token`), путь `/`.
- API принимает заголовок **`Authorization: Bearer <access_token>`**.
- Тема интерфейса (светлая/тёмная) задаётся классом **`.dark`** на `<html>`; модификаторы Tailwind `dark:` синхронизированы с этим.

---

## Справочник переменных окружения

### Backend (`backend/.env`)

| Переменная | Описание |
|------------|----------|
| `HTTP_ADDR` | Адрес прослушивания (по умолчанию `:8080`) |
| `DATABASE_URL` | Строка подключения PostgreSQL |
| `JWT_SECRET` | Секрет HMAC для JWT (**не короче 32 символов**) |
| `CORS_ORIGINS` | Список origin через запятую |

### Frontend (`frontend/.env.local`)

| Переменная | Описание |
|------------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | Базовый URL API |
| `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` | Ключ JavaScript API 2.1 Яндекс.Карт |
| `NEXT_PUBLIC_GRAFANA_URL` | Опционально: ссылка на Grafana в админке |

Примеры — в **`backend/.env.example`** и **`frontend/.env.example`**.

---

## Полезные команды

```bash
# Остановка без удаления volume
docker compose down

# Сборка образов
docker compose build

# Линт и production-сборка фронтенда
cd frontend && npm run lint && npm run build

# Сборка бинарника backend
cd backend && go build -o bin/api ./cmd/api
```

---

## Технологический стек

| Слой | Технологии |
|------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, Framer Motion |
| Backend | Go 1.23, chi, pgx, golang-jwt, bcrypt |
| База данных | PostgreSQL 18 |
| Карты | Яндекс Карты API 2.1 |
| Контейнеризация | Docker, Docker Compose |
| Reverse proxy | Nginx (auth_request, WebSocket для Grafana) |
| Мониторинг | Prometheus, cAdvisor, Grafana |
| Графики в ЛК | Chart.js, react-chartjs-2 |
| Иконки | Hugeicons, Lucide |

---

## Команда

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

---

<div align="center">

**Трамплин** · команда **VIPERRRS** · **IT-Планета 2026**

</div>
