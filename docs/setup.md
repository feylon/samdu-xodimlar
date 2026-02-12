# O'rnatish va ishga tushirish

## Talablar

| Vosita | Versiya | Izoh |
|---|---|---|
| Docker Engine + Compose v2 | 24+ | Docker bilan ishga tushirish uchun yetarli |
| Node.js | 22+ (`engines.node >= 22`) | Dockersiz lokal ishlab chiqish uchun |
| npm | 10+ | Node 22 bilan birga keladi |
| PostgreSQL | 16 | Dockersiz rejimda alohida o'rnatiladi yoki faqat DB konteynerlari ishlatiladi |
| MongoDB | 7 | `mongosh` healthcheck uchun kerak (Docker image ichida bor) |
| openssl | istalgan | JWT maxfiy kalitlarini generatsiya qilish uchun |

## Env o'zgaruvchilar

### Root `.env.example` (docker compose uchun)

| O'zgaruvchi | Standart | Qayerda ishlatiladi |
|---|---|---|
| `TZ` | `Asia/Tashkent` | postgres, backend, file-service konteynerlari; backend `APP_TIMEZONE` |
| `POSTGRES_USER` | `hrms` | postgres va backend |
| `POSTGRES_PASSWORD` | `hrms_secret` | postgres va backend |
| `POSTGRES_DB` | `hrms` | postgres va backend |
| `POSTGRES_PORT` | `5432` | hostga ochiladigan port |
| `MONGO_DB` | `hrms` | backend `MONGO_URI=mongodb://mongo:27017/${MONGO_DB}` |
| `MONGO_FILES_DB` | `hrms_files` | file-service `MONGO_URI` |
| `MONGO_PORT` | `27017` | hostga ochiladigan port |
| `JWT_ACCESS_SECRET` | (majburiy) | backend va file-service, umumiy bo'lishi shart |
| `JWT_ACCESS_TTL` | `900` | access token muddati, soniya |
| `JWT_REFRESH_SECRET` | (majburiy) | faqat backend |
| `JWT_REFRESH_TTL` | `2592000` | refresh token va sessiya muddati, soniya (30 kun) |
| `BACKEND_PORT` | `3000` | hostga ochiladigan port |
| `FILE_SERVICE_PORT` | `3001` | hostga ochiladigan port |
| `FRONTEND_PORT` | `3002` | hostga ochiladigan port |
| `CORS_ORIGINS` | `http://localhost:3002` | backend va file-service, vergul bilan ro'yxat |
| `PUBLIC_API_BASE` | `http://localhost:3000/api` | frontend `NUXT_PUBLIC_API_BASE` |
| `PUBLIC_WS_BASE` | `http://localhost:3000` | frontend `NUXT_PUBLIC_WS_BASE` (Socket.IO `/ws` namespace) |
| `FILE_SERVICE_PUBLIC_URL` | `http://localhost:3001` | backend `FILE_SERVICE_PUBLIC_URL` (logoUrl), file-service `PUBLIC_BASE_URL`, frontend `NUXT_PUBLIC_FILE_BASE` |
| `STORAGE_DRIVER` | `local` | file-service: `local` yoki `s3` |
| `MAX_FILE_SIZE_MB` | `10` | file-service yuklash limiti |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE` | bo'sh / `false` | `STORAGE_DRIVER=s3` bo'lsa `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` majburiy |
| `REPORT_REMINDER_HOUR` | `17` | seeder birinchi ishga tushganda `organization_settings.reportDeadlineHour` ning boshlang'ich qiymati; keyin SUPERADMIN uni tashkilot sozlamalaridan o'zgartiradi, cron shu sozlamadan foydalanadi |
| `SEED_SUPERADMIN_LOGIN` | `superadmin01` | seed |
| `SEED_SUPERADMIN_PASSWORD` | `superadmin01` | seed |

### `backend/.env.example` (backend ni alohida ishga tushirish uchun)

`NODE_ENV`, `PORT` (3000), `TZ`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_TTL`, `CORS_ORIGINS`, `FILE_SERVICE_URL` (konfiguratsiyaga o'qiladi, hozircha ishlatilmaydi), `FILE_SERVICE_PUBLIC_URL`, `REPORT_REMINDER_HOUR`, `SEED_SUPERADMIN_LOGIN`, `SEED_SUPERADMIN_PASSWORD`.

`backend/src/config/configuration.ts` da `JWT_ACCESS_SECRET` va `JWT_REFRESH_SECRET` bo'sh bo'lsa `Missing required environment variable` xatosi bilan ilova ishga tushmaydi. Qolgan o'zgaruvchilarda standart qiymat bor.

### `file-service/.env.example`

`PORT` (3001), `MONGO_URI` (`mongodb://localhost:27017/hrms_files`), `JWT_ACCESS_SECRET` (majburiy), `CORS_ORIGINS`, `STORAGE_DRIVER`, `LOCAL_STORAGE_PATH` (`/data/uploads`), `PUBLIC_BASE_URL`, `MAX_FILE_SIZE_MB`, `S3_*`.

Lokal ishlab chiqishda `LOCAL_STORAGE_PATH` ni yozish huquqi bor papkaga o'zgartiring, masalan `./uploads`.

### `frontend/.env.example`

| O'zgaruvchi | Standart | Izoh |
|---|---|---|
| `NITRO_PORT` | `3002` | Nitro server porti (production) |
| `NITRO_HOST` | `0.0.0.0` | Nitro host |
| `NUXT_PUBLIC_API_BASE` | `http://localhost:3000/api` | `runtimeConfig.public.apiBase` |
| `NUXT_PUBLIC_WS_BASE` | `http://localhost:3000` | `runtimeConfig.public.wsBase` |
| `NUXT_PUBLIC_FILE_BASE` | `http://localhost:3001` | `runtimeConfig.public.fileBase` |

Nuxt `NUXT_PUBLIC_*` o'zgaruvchilarni `runtimeConfig.public.*` ga avtomatik bog'laydi; `.output` build dan keyin ham env orqali o'zgartirish mumkin (SPA bo'lsa ham qiymatlar sahifa yuklanishida Nitro tomonidan beriladi).

## Docker bilan (tavsiya etiladi)

```bash
cp .env.example .env
sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$(openssl rand -hex 32)|" .env
sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$(openssl rand -hex 32)|" .env

docker compose up -d --build
docker compose logs -f backend
```

Backend logida ketma-ket quyidagilar ko'rinadi:

```text
Applied migration InitialSchema1741600000000     (yoki: Database schema is up to date)
Seeded organization settings                     (yoki hech narsa, mavjud bo'lsa)
Seeded superadmin account superadmin01           (yoki: Superadmin account already exists)
Backend listening on port 3000, Swagger at /api/docs
```

Tekshirish:

```bash
curl -s http://localhost:3000/api/health
# {"status":"ok","service":"backend","postgres":"up","mongo":"up","timestamp":"..."}
curl -s http://localhost:3001/health
# {"status":"ok","service":"file-service","storage":"local","timestamp":"..."}
```

Keyin http://localhost:3002 da `superadmin01 / superadmin01` bilan kiring.

## Dockersiz lokal ishlab chiqish

Eng qulay yo'l: faqat bazalarni Docker da ko'tarib, xizmatlarni hostda ishga tushirish.

```bash
docker compose up -d postgres mongo
```

### Backend

```bash
cd backend
npm ci
cp .env.example .env
```

`.env` ni lokal rejimga moslang:

```dotenv
NODE_ENV=development
POSTGRES_HOST=localhost
MONGO_URI=mongodb://localhost:27017/hrms
JWT_ACCESS_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
CORS_ORIGINS=http://localhost:3002
FILE_SERVICE_PUBLIC_URL=http://localhost:3001
```

Ishga tushirish:

```bash
npm run migration:run      # sxemani yaratadi (typeorm-ts-node-commonjs -d src/database/data-source.ts)
npm run seed               # organization_settings + superadmin
npm run start:dev          # nest start --watch, port 3000
```

Boshqa skriptlar (`backend/package.json`):

| Skript | Buyruq | Vazifa |
|---|---|---|
| `build` | `nest build` | `dist/` ga kompilyatsiya |
| `start` | `node dist/main.js` | Faqat API (migratsiya va seed siz) |
| `start:prod` | `node dist/database/run-migrations.js && node dist/database/seed.js && node dist/main.js` | Konteyner CMD |
| `lint` | `eslint "src/**/*.ts"` | Lint |
| `typeorm` | `typeorm-ts-node-commonjs -d src/database/data-source.ts` | TypeORM CLI asosi |
| `migration:generate` | `npm run typeorm -- migration:generate` | Entity va baza farqidan migration yaratish |
| `migration:run` | `npm run typeorm -- migration:run` | Qo'llanmagan migratsiyalarni bajarish |
| `migration:revert` | `npm run typeorm -- migration:revert` | Oxirgi migratsiyani qaytarish |
| `seed` | `ts-node -r tsconfig-paths/register src/database/seed.ts` | Idempotent seed |

TypeORM CLI `data-source.ts` orqali `loadConfiguration()` ni chaqiradi, shuning uchun `.env` dagi `JWT_*` o'zgaruvchilar migratsiya buyruqlari uchun ham kerak (aks holda `Missing required environment variable JWT_ACCESS_SECRET`). `.env` ni yuklash uchun `nest start` avtomatik `@nestjs/config` orqali o'qiydi; CLI uchun esa shellda eksport qiling yoki `set -a; source .env; set +a` dan foydalaning.

### File-service

```bash
cd file-service
npm ci
cp .env.example .env
```

```dotenv
PORT=3001
MONGO_URI=mongodb://localhost:27017/hrms_files
JWT_ACCESS_SECRET=<backend bilan bir xil qiymat>
CORS_ORIGINS=http://localhost:3002
STORAGE_DRIVER=local
LOCAL_STORAGE_PATH=./uploads
PUBLIC_BASE_URL=http://localhost:3001
MAX_FILE_SIZE_MB=10
```

```bash
mkdir -p uploads
npm run start:dev          # port 3001, Swagger http://localhost:3001/docs
```

`JWT_ACCESS_SECRET` backend bilan bir xil bo'lmasa, barcha himoyalangan fayl so'rovlari `401 INVALID_TOKEN` qaytaradi.

### Frontend

```bash
cd frontend
npm ci                     # postinstall: nuxt prepare
cp .env.example .env
npm run dev                # nuxt dev --port 3002
```

`npm run build` -> `.output/`, `npm run start` -> `node .output/server/index.mjs` (port `NITRO_PORT`).

## Migratsiya va seed

- Konteynerda: avtomatik, `start:prod` ichida. Qo'lda qayta chaqirish:

```bash
docker compose exec backend node dist/database/run-migrations.js
docker compose exec backend node dist/database/seed.js
```

- Lokal: `npm run migration:run`, `npm run seed`.
- Yangi migratsiya yaratish, nomlash va qoidalar: [migrations.md](migrations.md).

Seed idempotent: `organization_settings` (id=1) va `SEED_SUPERADMIN_LOGIN` bo'yicha foydalanuvchi mavjud bo'lsa, qayta yaratmaydi va parolni o'zgartirmaydi. Agar superadmin parolini unutgan bo'lsangiz, seed yordam bermaydi: [operations.md](operations.md) dagi "Parolni tiklash" bo'limiga qarang.

## `docs/api.md` ni qayta yaratish

`docs/api.md` qo'lda yozilmaydi. U backend Swagger hujjatidan (`GET /api/docs-json`, OpenAPI 3 JSON) generatsiya qilinadi: har bir teg bo'limga, har bir operatsiya `Metod | Yo'l | Rollar | Tavsif` qatoriga aylantiriladi; "Rollar" ustuni `@Roles()` dekoratoridan, `public` esa `@Public()` dan olinadi.

Ishchi backend bo'lganda:

```bash
curl -s http://localhost:3000/api/docs-json -o /tmp/openapi.json
```

So'ngra generatsiya skripti bilan (repozitoriyda qanday skript ishlatilgan bo'lsa) `docs/api.md` yangilanadi. Skript bo'lmasa, quyidagi minimal yondashuv bir xil formatni beradi: JSON dagi `paths` bo'yicha yurib, `tags[0]` ga guruhlang, `summary` ni tavsif sifatida yozing. Endpoint qo'shilgan har bir PR da `api.md` yangilanishi kerak.

## Portlar band bo'lsa

`.env` da `BACKEND_PORT`, `FILE_SERVICE_PORT`, `FRONTEND_PORT`, `POSTGRES_PORT`, `MONGO_PORT` ni o'zgartiring. Frontend porti o'zgarsa, `CORS_ORIGINS` ni ham yangilang; backend yoki file-service porti o'zgarsa, `PUBLIC_API_BASE`, `PUBLIC_WS_BASE`, `FILE_SERVICE_PUBLIC_URL` ni yangilang va `docker compose up -d --build frontend backend file-service` bilan qayta ishga tushiring.
