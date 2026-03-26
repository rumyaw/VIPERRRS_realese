# Трамплин — карьерная экосистема

Веб-платформа для студентов, выпускников и работодателей. Поиск стажировок, вакансий, менторства и мероприятий на интерактивной карте России.

**Стек:** Next.js 15 · Go (chi) · PostgreSQL 16 · Docker Compose · Яндекс Карты

---

## Быстрый старт (Docker)

> Требуется: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) или Docker + Docker Compose (Linux).

```bash
# 1. Клонируйте репозиторий и перейдите в папку проекта
cd IT_Planet2026_VIPERRRS-main

# 2. Запустите всё одной командой
docker compose up --build
```

Дождитесь строк в логах:

```
tramplin-backend   | tramplin-api listening on :8080
tramplin-frontend  | ✓ Ready in ...ms
```

Откройте в браузере:

| Сервис | URL |
|--------|-----|
| Сайт (фронтенд) | http://localhost:3000 |
| API (бэкенд) | http://localhost:8080/health |

### Что происходит при запуске

1. **PostgreSQL** стартует. При **первом** запуске (когда volume пуст) выполняет скрипты из `backend/internal/db/init-scripts/`:
   - `01-schema.sql` — создаёт таблицы, индексы, типы данных
   - `02-seed.sql` — заполняет базу данными (пользователи, вакансии, отклики, рекомендации)
2. **Backend** (Go) подключается к PostgreSQL и прогоняет миграции из `backend/internal/db/migrations/` (0001–0005). Миграция **0005_reseed.sql** гарантированно заполняет БД актуальными данными, даже если volume уже существовал.
3. **Frontend** (Next.js) стартует и обращается к backend по `http://localhost:8080/api/v1`

> **Важно:** Данные загружаются автоматически при каждом запуске backend-а. Если миграция `0005_reseed.sql` ещё не была применена, она выполнится и заполнит/обновит все таблицы.

### Пересоздание базы данных с нуля

Если нужно полностью сбросить базу:

```bash
# Остановить контейнеры и удалить volume с данными
docker compose down -v

# Запустить заново — БД создастся с нуля
docker compose up --build
```

### Обновление данных без сброса volume

При обычном `docker compose up --build` бэкенд автоматически применит все новые миграции. Миграция `0005_reseed.sql` очистит и перезальёт seed-данные, если она ещё не была применена.

---

## Тестовые аккаунты

Все пароли: **`password123`**

| Роль | Имя | Email |
|------|-----|-------|
| Куратор платформы | Администратор | `admin@tramplin.ru` |
| Куратор платформы | Куратор | `curator@tramplin.ru` |
| Работодатель (ТехКорп) | HR ТехКорп | `hr@techcorp.ru` |
| Работодатель (ГринСтарт) | HR ГринСтарт | `hr@greenstart.ru` |
| Соискатель | Иван Петров | `ivan@mail.ru` |
| Соискатель | Мария Сидорова | `maria@mail.ru` |
| Соискатель | Александр Козлов | `alex@mail.ru` |
| Соискатель | Елена Волкова | `elena@mail.ru` |

---

## Запуск без Docker (разработка)

### 1. PostgreSQL

Установите PostgreSQL 16 и создайте базу:

```sql
CREATE USER tramplin WITH PASSWORD 'tramplin';
CREATE DATABASE tramplin OWNER tramplin;
```

Примените схему и данные:

```bash
psql -U tramplin -d tramplin -f backend/internal/db/init-scripts/01-schema.sql
psql -U tramplin -d tramplin -f backend/internal/db/init-scripts/02-seed.sql
```

### 2. Backend

```bash
cd backend

# Создайте .env (или используйте существующий)
# DATABASE_URL=postgres://tramplin:tramplin@localhost:5432/tramplin?sslmode=disable
# HTTP_ADDR=:8080
# JWT_SECRET=change-me-in-production-min-32-chars-long
# CORS_ORIGINS=http://localhost:3000

go run ./cmd/api
```

Проверка: http://localhost:8080/health

### 3. Frontend

```bash
cd frontend

npm install

# Создайте .env.local (или используйте существующий)
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
# NEXT_PUBLIC_YANDEX_MAPS_API_KEY=f0e8de45-f741-497b-bf91-92d52a17b41c

npm run dev
```

Откройте: http://localhost:3000

---

## Структура проекта

```
├── backend/
│   ├── cmd/api/              # Точка входа Go-сервера
│   ├── internal/
│   │   ├── config/           # Конфигурация из переменных окружения
│   │   ├── db/               # Миграции и init-scripts
│   │   │   ├── migrations/   # SQL-миграции (применяются Go-кодом)
│   │   │   └── init-scripts/ # SQL для Docker PostgreSQL (при первом запуске)
│   │   ├── domain/           # Доменные модели (User, Opportunity и др.)
│   │   ├── httpapi/          # HTTP-маршруты, middleware, handlers
│   │   ├── repository/       # Работа с PostgreSQL
│   │   └── service/          # Бизнес-логика (auth, opportunities)
│   ├── Dockerfile
│   ├── go.mod / go.sum
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router (страницы)
│   │   ├── components/       # UI-компоненты
│   │   ├── contexts/         # React Context (auth)
│   │   ├── hooks/            # Хуки (useToast, useFavorites)
│   │   └── lib/              # API-клиент, типы, утилиты
│   ├── public/fonts/         # Шрифт CHETTY.ttf
│   ├── Dockerfile
│   └── .env.local
├── docker-compose.yml
└── README.md
```

---

## Роли пользователей

| Роль | Возможности |
|------|-------------|
| **Гость** | Просмотр карты и ленты вакансий. Для взаимодействия нужна регистрация. |
| **Соискатель** | Заполнение профиля и резюме, отклики на вакансии, рекомендации контактам, нетворкинг. |
| **Работодатель** | Управление профилем компании, создание карточек возможностей (с адресом на карте и изображением), просмотр откликов, статистика. |
| **Куратор платформы** | Верификация компаний, модерация карточек возможностей, панель управления со статистикой. |

---

## Навигация по сайту

### Соискатель (студент / выпускник)
- **Главная** `/` — карта и лента возможностей
- **Мои отклики** `/applicant/applications` — статусы откликов
- **Рекомендации** `/applicant/recommendations` — входящие рекомендации от контактов
- **Контакты** `/applicant/contacts` — профессиональная сеть
- **Кабинет** `/dashboard` — профиль, резюме, настройки приватности

### Работодатель
- **Главная** `/` — карта и лента
- **Мои карточки** `/employer/opportunities` — управление вакансиями
- **Создать карточку** `/employer/opportunities/new` — новая вакансия/стажировка
- **Отклики** `/employer/applications` — отклики соискателей
- **Статистика** `/employer/stats` — графики по откликам
- **Компания** `/employer/company` — профиль компании

### Куратор платформы
- **Главная** `/`
- **Панель управления** `/admin/dashboard` — статистика, модерация компаний и карточек

---

## API-эндпоинты

### Публичные
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/opportunities` | Список возможностей |
| GET | `/api/v1/opportunities/{id}` | Детали возможности |

### Авторизация
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/v1/auth/register` | Регистрация |
| POST | `/api/v1/auth/login` | Вход |
| POST | `/api/v1/auth/logout` | Выход |
| POST | `/api/v1/auth/refresh` | Обновление токена |
| GET | `/api/v1/auth/me` | Текущий пользователь |

### Соискатель
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/applicant/applications` | Мои отклики |
| POST | `/api/v1/applicant/applications` | Откликнуться |
| PATCH | `/api/v1/applicant/profile` | Обновить профиль / резюме |
| PATCH | `/api/v1/applicant/privacy` | Настройки приватности |
| GET | `/api/v1/applicant/contacts` | Список контактов |
| POST | `/api/v1/applicant/contacts` | Добавить контакт |
| POST | `/api/v1/applicant/recommendations` | Отправить рекомендацию |
| GET | `/api/v1/applicant/recommendations/inbox` | Входящие рекомендации |

### Работодатель
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/employer/opportunities` | Мои карточки |
| POST | `/api/v1/employer/opportunities` | Создать карточку |
| GET | `/api/v1/employer/applications` | Отклики на карточки |
| PATCH | `/api/v1/employer/applications/{id}` | Изменить статус отклика |
| PATCH | `/api/v1/employer/profile` | Обновить профиль компании |

### Куратор
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/curator/companies/pending` | Компании на верификации |
| PATCH | `/api/v1/curator/companies/{id}/verification` | Верифицировать / отклонить |
| GET | `/api/v1/curator/opportunities/pending` | Карточки на модерации |
| PATCH | `/api/v1/curator/opportunities/{id}/status` | Одобрить / отклонить |
| GET | `/api/v1/admin/stats` | Статистика платформы |
| GET | `/api/v1/admin/timeline` | Таймлайн активности |

---

## Переменные окружения

### Backend (`backend/.env`)
| Переменная | Значение по умолчанию | Описание |
|------------|----------------------|----------|
| `HTTP_ADDR` | `:8080` | Адрес сервера |
| `DATABASE_URL` | `postgres://tramplin:tramplin@localhost:5432/tramplin?sslmode=disable` | Подключение к PostgreSQL |
| `JWT_SECRET` | `change-me-in-production-min-32-chars-long` | Секрет JWT-токенов |
| `CORS_ORIGINS` | `http://localhost:3000` | Разрешённые Origins |

### Frontend (`frontend/.env.local`)
| Переменная | Значение по умолчанию | Описание |
|------------|----------------------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080/api/v1` | URL API бэкенда |
| `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` | `f0e8de45-f741-497b-bf91-92d52a17b41c` | Ключ Яндекс Карт |

---

## Технологии

| Компонент | Технология |
|-----------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Go 1.23, chi/v5, pgx/v5, JWT |
| База данных | PostgreSQL 16 |
| Карты | Яндекс Карты JavaScript API 2.1 |
| Контейнеризация | Docker, Docker Compose |
| Графики | Chart.js, react-chartjs-2 |
| Иконки | Hugeicons, Lucide React |
| Анимации | Framer Motion |
