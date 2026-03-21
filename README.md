# Трамплин - Карьерная платформа

Платформа для взаимодействия студентов, выпускников, работодателей и карьерных центров вузов в сфере IT.

## Стек технологий

### Backend
- Go 1.25+
- Chi (HTTP router)
- PostgreSQL 16
- JWT Authentication
- Argon2 password hashing

### Frontend
- Next.js 16
- React 19
- Tailwind CSS 4
- TypeScript

## Запуск через Docker Compose

```bash
# Сборка и запуск всех сервисов
docker-compose up --build

# Или в фоновом режиме
docker-compose up -d --build
```

После запуска:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **PostgreSQL**: localhost:5432

## Тестовые аккаунты

После первого запуска автоматически создаются:

### Администратор (куратор)
- Email: `admin@example.com`
- Пароль: `change_me_admin_password`

### Демо работодатель
- Email: `demo_employer@trumplin.local`
- Пароль: `demo1234`

## Роли пользователей

1. **Соискатель (APPLICANT)** - студенты и выпускники
2. **Работодатель (EMPLOYER)** - компании с верификацией
3. **Куратор (CURATOR)** - модераторы платформы
4. **Администратор (ADMIN)** - полный доступ

## Функционал

### Публичный доступ
- Просмотр вакансий на карте и в ленте
- Фильтрация по городу, навыкам, формату работы
- Добавление в избранное (сохраняется в браузере)

### Соискатель
- Регистрация и авторизация
- Профиль с ФИО, вузом, резюме
- Отклик на вакансии
- История откликов и статусы
- Настройки приватности
- Профессиональные контакты (нетворкинг)

### Работодатель
- Регистрация компании (требует верификацию куратором)
- Создание вакансий, стажировок, мероприятий
- Управление созданными возможностями
- Просмотр и управление откликами соискателей

### Куратор/Администратор
- Модерация компаний (верификация)
- Модерация контента (вакансии, мероприятия)
- Управление статусами пользователей

## Конфигурация

### Переменные окружения (.env)

```env
# Backend
TRUMPLIN_JWT_SECRET=your-secret-key
TRUMPLIN_DATABASE_DSN=postgres://user:pass@host:5432/db
TRUMPLIN_HTTP_PORT=8080
TRUMPLIN_CORS_ORIGIN=http://localhost:3000
TRUMPLIN_ACCESS_TOKEN_TTL_SECONDS=900
TRUMPLIN_COOKIE_SECURE=0
TRUMPLIN_ADMIN_EMAIL=admin@example.com
TRUMPLIN_ADMIN_PASSWORD=your-password

# Yandex Maps
YANDEX_GEOCODER_KEY=your-geocoder-key
YANDEX_JAVASCRIPT_API_KEY=your-js-api-key
```

## Разработка

### Backend
```bash
cd backend
go mod download
go run ./cmd/server
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/logout` - Выход
- `POST /api/auth/refresh` - Обновление токена
- `GET /api/me` - Текущий пользователь

### Публичные
- `GET /api/public/opportunities` - Список возможностей

### Работодатель
- `GET /api/employer/opportunities` - Мои возможности
- `POST /api/employer/opportunities` - Создать возможность
- `GET /api/employer/applications` - Отклики
- `PATCH /api/employer/applications/{id}` - Изменить статус отклика

### Соискатель
- `PATCH /api/applicant/profile` - Обновить профиль
- `PATCH /api/applicant/privacy` - Настройки приватности
- `GET /api/applicant/applications` - Мои отклики
- `POST /api/applicant/applications` - Откликнуться
- `GET /api/applicant/contacts` - Контакты
- `POST /api/applicant/contacts` - Добавить контакт

### Куратор
- `GET /api/curator/companies/pending` - Компании на верификацию
- `PATCH /api/curator/companies/{id}/verification` - Верификация компании
- `GET /api/curator/opportunities/pending` - Контент на модерацию
- `PATCH /api/curator/opportunities/{id}/status` - Модерация контента

## Структура проекта

```
├── backend/
│   ├── cmd/server/        # Точка входа
│   ├── internal/
│   │   ├── auth/          # Аутентификация
│   │   ├── config/        # Конфигурация
│   │   ├── db/            # База данных
│   │   ├── geocode/       # Геокодирование
│   │   ├── handlers/      # HTTP обработчики
│   │   ├── http/          # Роутер
│   │   └── httputilx/     # Утилиты
│   └── migrations/        # Миграции БД
├── frontend/
│   ├── src/
│   │   ├── app/           # Страницы Next.js
│   │   ├── components/    # Компоненты
│   │   └── lib/           # Утилиты и типы
│   └── public/            # Статические файлы
├── docker-compose.yml
└── README.md
```
