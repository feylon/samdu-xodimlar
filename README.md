# Xodimlar HRMS

Tashkilot xodimlarini boshqarish tizimi (Human Resource Management System). Monorepo uchta xizmatdan iborat: NestJS backend API, alohida fayl xizmati (file-service) va Nuxt 3 SPA frontend. Ma'lumotlar PostgreSQL (asosiy biznes jadvallar) va MongoDB (sessiyalar, audit, bildirishnomalar, hisobotlar, so'rovnomalar, fayl metadata) da saqlanadi.

## Nimalarni qamrab oladi

- Rollar: `SUPERADMIN`, `HR`, `DEPARTMENT_HEAD`, `EMPLOYEE`
- Xodimlarni onboarding qilish, holatlar (ACTIVE, FROZEN, VACATION, SICK_LEAVE, TERMINATED, BLOCKED) va holat tarixi
- Bo'limlar, bo'lim boshliqlari, ish yuklamasi (25/50/75/100 %, jami 100 % dan oshmaydi)
- Davomat (faqat joriy kun, Asia/Tashkent), ishlab chiqarish kalendari (bayram va dam olish kunlari)
- Vazifalar (REGULAR / BONUS), tasdiqlash va KPI ballari
- Kunlik hisobotlar, baholash (1-5) va ball, eslatma cron
- Oylik ish haqi hisob-kitobi (davomat, ballar, jamoa bonusi), `CALCULATED -> PAID`
- E'lonlar, so'rovnomalar, real vaqt bildirishnomalar (Socket.IO)
- Xavfsizlik: JWT access + refresh (rotation), sessiyalar, login tarixi, yangi kirish haqida ogohlantirish, audit log
- Excel/PDF eksport, mobil ilova uchun alohida `/api/mobile/*` endpointlar
- Fayllar: foto, pasport, logo, hujjatlar (lokal disk yoki S3)

## Texnologiyalar

| Qatlam | Stack |
|---|---|
| Backend | NestJS 11, TypeScript 5, TypeORM 0.3 (PostgreSQL 16), Mongoose 8 (MongoDB 7), Passport JWT, Socket.IO 4, @nestjs/schedule, @nestjs/throttler, helmet, argon2, exceljs, pdfmake |
| File-service | NestJS 11, Mongoose 8, multer (memory storage), @aws-sdk/client-s3 |
| Frontend | Nuxt 3 (SPA, `ssr: false`), Vue 3, Pinia, TailwindCSS, @nuxtjs/i18n (uz, ru), Chart.js, socket.io-client, dayjs |
| Infratuzilma | Docker Compose, node:22-alpine, postgres:16-alpine, mongo:7 |

## Repozitoriy tuzilishi

```text
Xodimlar/
├── docker-compose.yml          # 5 ta xizmat: postgres, mongo, backend, file-service, frontend
├── .env.example                # compose uchun barcha o'zgaruvchilar
├── backend/                    # NestJS API (port 3000, prefiks /api, Swagger /api/docs)
│   ├── Dockerfile
│   ├── .env.example
│   └── src/
│       ├── main.ts             # helmet, CORS, ValidationPipe, Swagger
│       ├── app.module.ts       # global guard/interceptor/filter, modullar
│       ├── config/configuration.ts
│       ├── common/             # decorators, guards, enums, error-codes, utils, filters
│       ├── database/           # data-source.ts, entities.ts, seed.ts, run-migrations.ts, migrations/
│       └── modules/            # auth, sessions, users, departments, calendar, attendance,
│                               # tasks, kpi, daily-reports, payroll, announcements, polls,
│                               # notifications, audit, organization, dashboard, export, mobile, health
├── file-service/               # Fayl mikroservisi (port 3001, Swagger /docs)
│   ├── Dockerfile
│   ├── .env.example
│   └── src/                    # auth (JWT), files (controller, service, storage drivers), health
├── frontend/                   # Nuxt 3 SPA (port 3002)
│   ├── Dockerfile
│   ├── .env.example
│   ├── nuxt.config.ts
│   ├── pages/ components/ stores/ composables/ middleware/ plugins/ layouts/ i18n/ utils/ types/
│   └── tailwind.config.ts
└── docs/                       # Operatsion hujjatlar (shu papka)
```

## Tez boshlash (Docker)

Talablar: Docker Engine 24+ va Docker Compose v2.

```bash
cp .env.example .env

# JWT maxfiy kalitlarini generatsiya qiling va .env ichiga yozing
openssl rand -hex 32   # JWT_ACCESS_SECRET uchun
openssl rand -hex 32   # JWT_REFRESH_SECRET uchun

docker compose up -d --build
docker compose ps
```

Birinchi ishga tushishda `hrms-backend` konteyneri avtomatik tarzda migratsiyalarni qo'llaydi (`node dist/database/run-migrations.js`), seed bajaradi (`node dist/database/seed.js`) va keyin API ni ishga tushiradi (`node dist/main.js`).

Manzillar:

| Xizmat | URL |
|---|---|
| Frontend | http://localhost:3002 |
| Backend API | http://localhost:3000/api |
| Backend Swagger | http://localhost:3000/api/docs (JSON: `/api/docs-json`) |
| Backend health | http://localhost:3000/api/health |
| File-service Swagger | http://localhost:3001/docs |
| File-service health | http://localhost:3001/health |
| PostgreSQL | localhost:5432 (`hrms` / `hrms_secret` / db `hrms`) |
| MongoDB | localhost:27017 (db `hrms` va `hrms_files`) |

## Standart hisob

Seeder quyidagi superadmin hisobini yaratadi (agar mavjud bo'lmasa):

| Login | Parol | Rol |
|---|---|---|
| `superadmin01` | `superadmin01` | SUPERADMIN |

Login va parolni `SEED_SUPERADMIN_LOGIN` / `SEED_SUPERADMIN_PASSWORD` orqali o'zgartirish mumkin. Ishlab chiqarish (production) muhitida birinchi kirishdan so'ng parolni darhol almashtiring (`/profile` sahifasi yoki `POST /api/auth/change-password`).

Birinchi qadamlar: SUPERADMIN `Sozlamalar -> Foydalanuvchilar` (`/settings/users`) orqali HR hisobini yaratadi, HR bo'limlar va xodimlarni kiritadi, bo'lim boshlig'ini tayinlaydi. To'liq ketma-ketlik: [docs/operations.md](docs/operations.md).

## Hujjatlar

| Fayl | Mazmun |
|---|---|
| [docs/README.md](docs/README.md) | Hujjatlar indeksi |
| [docs/architecture.md](docs/architecture.md) | Arxitektura, modullar, ma'lumot oqimlari, cron jadvali |
| [docs/setup.md](docs/setup.md) | Lokal ishga tushirish (Docker bilan va Dockersiz), migratsiya, seed, api.md ni yangilash |
| [docs/docker.md](docs/docker.md) | Compose xizmatlari, lifecycle buyruqlari, backup/restore, production |
| [docs/database.md](docs/database.md) | PostgreSQL jadvallari va MongoDB kolleksiyalari |
| [docs/migrations.md](docs/migrations.md) | Sxema o'zgarishi va migratsiya ish tartibi |
| [docs/roles.md](docs/roles.md) | Ruxsatlar matritsasi va biznes qoidalar, xato kodlari |
| [docs/security.md](docs/security.md) | Autentifikatsiya, sessiyalar, rate limit, audit, fayl ruxsatlari, hardening |
| [docs/operations.md](docs/operations.md) | Operator qo'llanmasi: onboarding, oylik ish haqi, kalendar, backup |
| [docs/frontend.md](docs/frontend.md) | Nuxt ilovasi tuzilishi, store'lar, i18n, eksport, socket |
| [docs/mobile-api.md](docs/mobile-api.md) | Mobil dasturchilar uchun API qo'llanma |
| [docs/api.md](docs/api.md) | Swagger (`/api/docs-json`) dan avtomatik yaratilgan endpointlar ro'yxati |

## Litsenziya

UNLICENSED (ichki foydalanish uchun).
