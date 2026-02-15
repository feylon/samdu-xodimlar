# Docker va Docker Compose

Manba: `docker-compose.yml` (root). Barcha qiymatlar `.env` dan `${VAR:-default}` ko'rinishida o'qiladi.

## Xizmatlar

| Xizmat         | Konteyner           | Image / build                                                                | Portlar (host:konteyner)          | Volume                                   | Healthcheck                                                                        | depends_on                                |
| -------------- | ------------------- | ---------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------- |
| `postgres`     | `hrms-postgres`     | `postgres:16-alpine`                                                         | `${POSTGRES_PORT:-5432}:5432`     | `postgres_data:/var/lib/postgresql/data` | `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB`, 5 s / 20 urinish                   | -                                         |
| `mongo`        | `hrms-mongo`        | `mongo:7`, `mongod --quiet --logpath /dev/null`                              | `${MONGO_PORT:-27017}:27017`      | `mongo_data:/data/db`                    | `mongosh --quiet --eval "db.adminCommand('ping').ok"`, 5 s / 20 urinish            | -                                         |
| `backend`      | `hrms-backend`      | `./backend` (Dockerfile, node:22-alpine, multi-stage, `npm run start:prod`)  | `${BACKEND_PORT:-3000}:3000`      | -                                        | `wget -qO- http://127.0.0.1:3000/api/health`, 10 s / 12 urinish, start_period 30 s | postgres (healthy), mongo (healthy)       |
| `file-service` | `hrms-file-service` | `./file-service` (node:22-alpine, `USER node`, `node dist/main.js`)          | `${FILE_SERVICE_PORT:-3001}:3001` | `file_uploads:/data/uploads`             | `wget -qO- http://127.0.0.1:3001/health`, 10 s / 12 urinish, start_period 20 s     | mongo (healthy)                           |
| `frontend`     | `hrms-frontend`     | `./frontend` (node:22-alpine, `nuxt build`, `node .output/server/index.mjs`) | `${FRONTEND_PORT:-3002}:3002`     | -                                        | yo'q                                                                               | backend (healthy), file-service (healthy) |

Tarmoq: `hrms` (bridge). Volume'lar: `postgres_data`, `mongo_data`, `file_uploads`. Barcha xizmatlarda `restart: unless-stopped`.

Backend konteyneri ichidagi env (compose tomonidan beriladi): `NODE_ENV=production`, `PORT=3000`, `POSTGRES_HOST=postgres`, `MONGO_URI=mongodb://mongo:27017/${MONGO_DB}`, `FILE_SERVICE_URL=http://file-service:3001`, `CORS_ORIGINS`, `JWT_*`, `SEED_*`, `REPORT_REMINDER_HOUR`, `TZ`.

File-service konteyneri: `LOCAL_STORAGE_PATH=/data/uploads` (compose da qattiq yozilgan), `PUBLIC_BASE_URL=${FILE_SERVICE_PUBLIC_URL}`, `MONGO_URI=mongodb://mongo:27017/${MONGO_FILES_DB}`, `S3_*`, `MAX_FILE_SIZE_MB`.

Frontend konteyneri: `NITRO_PORT=3002`, `NITRO_HOST=0.0.0.0`, `NUXT_PUBLIC_API_BASE=${PUBLIC_API_BASE}`, `NUXT_PUBLIC_WS_BASE=${PUBLIC_WS_BASE}`, `NUXT_PUBLIC_FILE_BASE=${FILE_SERVICE_PUBLIC_URL}`.

## Ishga tushish ketma-ketligi

```text
postgres ──healthy──┐
                    ├──► backend ──healthy──┐
mongo ─────healthy──┤                       ├──► frontend
                    └──► file-service ──────┘
```

`backend` CMD: `npm run start:prod` = `run-migrations.js` -> `seed.js` -> `main.js`. Migratsiya yoki seed xato bersa, jarayon `exit 1` bilan tugaydi va `restart: unless-stopped` sababli konteyner qayta-qayta ishga tushadi; `docker compose logs backend` da `Migration failed:` yoki `Seed failed:` ko'rinadi.

## Lifecycle buyruqlari

```bash
# Hammasini build qilib ishga tushirish
docker compose up -d --build

# Holat va healthcheck
docker compose ps

# Loglar (hammasi / bitta xizmat / oxirgi 200 qator)
docker compose logs -f
docker compose logs -f backend
docker compose logs --tail=200 file-service

# Bitta xizmatni qayta build qilib qayta ishga tushirish
docker compose up -d --build backend
docker compose up -d --build frontend

# Faqat qayta ishga tushirish (build siz)
docker compose restart backend

# To'xtatish (volume'lar saqlanadi)
docker compose down

# To'xtatish va volume'larni O'CHIRISH (barcha ma'lumot yo'qoladi)
docker compose down -v

# Faqat bazalarni ko'tarish (lokal ishlab chiqish)
docker compose up -d postgres mongo
```

## Bazalarga kirish

```bash
# PostgreSQL psql
docker compose exec postgres psql -U hrms -d hrms
#   \dt                       -- jadvallar
#   SELECT * FROM typeorm_migrations ORDER BY id;
#   SELECT login, role, status FROM users;

# MongoDB mongosh
docker compose exec mongo mongosh hrms
#   show collections
#   db.sessions.countDocuments({ revokedAt: null })
#   db.audit_logs.find().sort({ createdAt: -1 }).limit(5)
docker compose exec mongo mongosh hrms_files --eval 'db.files.countDocuments({ isDeleted: false })'
```

Konteyner ichida migratsiya yoki seed ni qo'lda bajarish:

```bash
docker compose exec backend node dist/database/run-migrations.js
docker compose exec backend node dist/database/seed.js
```

## Backup va restore

### PostgreSQL (mantiqiy dump, tavsiya etiladi)

```bash
# Backup
docker compose exec -T postgres pg_dump -U hrms -d hrms -Fc > hrms_$(date +%F).dump

# Restore (bo'sh bazaga)
docker compose exec -T postgres pg_restore -U hrms -d hrms --clean --if-exists < hrms_2025-10-07.dump
```

### MongoDB

```bash
# Backup (ikkala baza)
docker compose exec -T mongo mongodump --archive --gzip --db hrms > mongo_hrms_$(date +%F).archive.gz
docker compose exec -T mongo mongodump --archive --gzip --db hrms_files > mongo_files_$(date +%F).archive.gz

# Restore
docker compose exec -T mongo mongorestore --archive --gzip --drop < mongo_hrms_2025-10-07.archive.gz
```

### Volume'larni to'liq nusxalash (`docker run --rm -v ... tar`)

Xizmatlarni to'xtatib bajaring, aks holda baza fayllari nomuvofiq bo'lishi mumkin. Volume nomlari compose loyiha nomi bilan prefikslanadi (`docker volume ls | grep hrms` yoki `xodimlar_postgres_data` kabi).

```bash
docker compose stop

PROJECT=$(basename "$PWD" | tr '[:upper:]' '[:lower:]')
for v in postgres_data mongo_data file_uploads; do
  docker run --rm \
    -v "${PROJECT}_${v}":/source:ro \
    -v "$PWD/backups":/backup \
    alpine tar czf "/backup/${v}_$(date +%F).tar.gz" -C /source .
done

docker compose start
```

Restore:

```bash
docker compose stop
docker run --rm \
  -v "${PROJECT}_file_uploads":/target \
  -v "$PWD/backups":/backup:ro \
  alpine sh -c "rm -rf /target/* && tar xzf /backup/file_uploads_2025-10-07.tar.gz -C /target"
docker compose start
```

`file_uploads` faqat `STORAGE_DRIVER=local` bo'lganda ma'noga ega; S3 rejimida fayllar bucket da, backup S3 vositalari bilan qilinadi. Fayl metadata (`hrms_files.files`) va haqiqiy fayllar bir vaqtda backup qilinishi kerak, aks holda `FILE_CONTENT_NOT_FOUND` xatolari chiqadi.

## Production bo'yicha eslatmalar

### Reverse proxy va HTTPS

Konteyner portlarini to'g'ridan-to'g'ri internetga ochmang. Nginx / Caddy / Traefik orqali:

| Tashqi yo'l                                | Ichki manzil        | Izoh                                                                                     |
| ------------------------------------------ | ------------------- | ---------------------------------------------------------------------------------------- |
| `https://hrms.example.uz/`                 | `frontend:3002`     | SPA                                                                                      |
| `https://hrms.example.uz/api/`             | `backend:3000`      | REST; `/api/docs` ni production da proxy orqali yopish mumkin                            |
| `https://hrms.example.uz/ws/`              | `backend:3000`      | Socket.IO: `Upgrade`/`Connection` headerlari va `proxy_read_timeout` ni uzaytirish kerak |
| `https://files.example.uz/` yoki `/files/` | `file-service:3001` | `client_max_body_size` >= `MAX_FILE_SIZE_MB`                                             |

Backend va file-service `app.set('trust proxy', true)` qilgan, shuning uchun `X-Forwarded-For` dagi birinchi IP sessiya va audit yozuvlariga tushadi. Proxy ushbu headerni to'g'ri yuborishi va tashqaridan kelgan `X-Forwarded-For` ni qayta yozishi shart.

### Ommaviy URL larni o'zgartirish

`.env` da bir vaqtda o'zgartiring va frontend/backend/file-service ni qayta build qiling:

```dotenv
CORS_ORIGINS=https://hrms.example.uz
PUBLIC_API_BASE=https://hrms.example.uz/api
PUBLIC_WS_BASE=https://hrms.example.uz
FILE_SERVICE_PUBLIC_URL=https://files.example.uz
```

`FILE_SERVICE_PUBLIC_URL` uch joyda ishlatiladi: backend `logoUrl` ni shu asosda yasaydi, file-service `url` maydonini (`${PUBLIC_BASE_URL}/files/<id>/content`) shu asosda qaytaradi, frontend rasmlarni shu manzildan yuklaydi.

### Maxfiy ma'lumotlar

- `JWT_ACCESS_SECRET` va `JWT_REFRESH_SECRET`: kamida 32 bayt tasodifiy (`openssl rand -hex 32`), bir-biridan farqli. Access secret o'zgarsa, barcha foydalanuvchilar qayta kiradi (refresh ham ishlamaydi, chunki `sessions` dagi hash eski tokenlarga tegishli bo'lsa ham access berilmaydi).
- `POSTGRES_PASSWORD` ni almashtiring; `SEED_SUPERADMIN_PASSWORD` ni kuchli qiymatga o'zgartiring yoki birinchi kirishdan keyin parolni yangilang.
- Bazalar portlarini (`5432`, `27017`) hostga ochmaslik uchun compose faylidagi `ports` bo'limini olib tashlang yoki `127.0.0.1:5432:5432` qiling.

### S3 drayveri

```dotenv
STORAGE_DRIVER=s3
S3_ENDPOINT=https://s3.example.com      # AWS bo'lsa bo'sh qoldiring
S3_REGION=us-east-1
S3_BUCKET=hrms-files
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_FORCE_PATH_STYLE=true                # MinIO va ko'p S3-mos xizmatlar uchun
```

Kalit formati: `<category>/<fileId>.<ext>` (masalan `photo/3f2a....jpg`). Mavjud lokal fayllarni S3 ga ko'chirishda metadata `storageDriver` maydoni `local` bo'lib qoladi; bu faqat ma'lumot uchun, o'qish joriy drayver orqali amalga oshiriladi, shuning uchun fayllar bir xil kalit bilan bucket ga ko'chirilsa ishlaydi.

### Resurslar va loglar

- Konteyner loglari stdout ga yoziladi; `docker compose logs` yoki Docker log driver (json-file rotation, loki) orqali yig'ing.
- MongoDB `--logpath /dev/null` bilan ishlaydi (Mongo o'z logini yozmaydi); diagnostika uchun compose dagi `command` ni vaqtincha olib tashlang.
- Bir nechta backend replikasi ishlatilsa, cron ishlar har bir replikada bajariladi ([architecture.md](architecture.md), "Cron ishlar").

## Muammolarni bartaraf etish

| Belgi                                                                              | Sabab                                                                                              | Yechim                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Bind for 0.0.0.0:3000 failed: port is already allocated`                          | Port band                                                                                          | `.env` da `BACKEND_PORT` (yoki boshqa `*_PORT`) ni o'zgartiring, `PUBLIC_*` va `CORS_ORIGINS` ni moslang                                                                                                                                                        |
| `hrms-backend` `unhealthy`, `frontend` ishga tushmaydi                             | Backend `/api/health` javob bermaydi                                                               | `docker compose logs backend`; `Missing required environment variable JWT_ACCESS_SECRET` bo'lsa `.env` ni to'ldiring; `postgres: down` bo'lsa Postgres loglarini tekshiring                                                                                     |
| `Migration failed: ...` va konteyner qayta-qayta restart                           | Baza sxemasi migratsiya bilan mos emas (qo'lda o'zgartirilgan jadval, yarim bajarilgan migratsiya) | `psql` da `typeorm_migrations` ni ko'ring; har migratsiya o'z tranzaksiyasida (`transaction: 'each'`), shuning uchun yarim holat bo'lmaydi; xato bergan SQL ni tuzatib yangi migratsiya yozing, qo'llangan faylni tahrirlamang ([migrations.md](migrations.md)) |
| `Seed failed: duplicate key value violates unique constraint "IDX_...users login"` | `SEED_SUPERADMIN_LOGIN` boshqa harf registrida mavjud                                              | Seed `findOne({login})` aniq moslikni qidiradi, baza indeksi esa case-sensitive; login qiymatini mavjud yozuv bilan bir xil yozing                                                                                                                              |
| Frontend ochiladi, lekin `Network Error` / CORS                                    | `CORS_ORIGINS` da brauzer origin yo'q yoki `PUBLIC_API_BASE` noto'g'ri                             | `.env` ni to'g'rilab `docker compose up -d --build backend file-service frontend`                                                                                                                                                                               |
| Rasmlar ko'rinmaydi, `401 MISSING_TOKEN`                                           | PASSPORT/DOCUMENT kategoriyasiga tokensiz murojaat                                                 | `<img src="...?token=<accessToken>">` yoki `Authorization` header ([security.md](security.md))                                                                                                                                                                  |
| `FILE_CONTENT_NOT_FOUND`                                                           | Metadata bor, fayl diskda yo'q (volume o'chirilgan yoki restore qilinmagan)                        | `file_uploads` ni restore qiling yoki `DELETE /files/:id` bilan metadata ni o'chiring                                                                                                                                                                           |
| `429 Too Many Requests`                                                            | ThrottlerGuard: 300/min umumiy, 10/min login (IP bo'yicha)                                         | Reverse proxy `X-Forwarded-For` ni to'g'ri uzatayotganini tekshiring, aks holda barcha foydalanuvchilar bitta IP sifatida hisoblanadi                                                                                                                           |
| Vaqt/sana bir kun oldinga yoki orqaga suriladi                                     | `TZ` noto'g'ri                                                                                     | `.env` da `TZ=Asia/Tashkent`; backend ni qayta ishga tushiring (APP_TIMEZONE ilova yuklanganda o'qiladi)                                                                                                                                                        |
| `mongosh: not found` healthcheck da                                                | `mongo` image versiyasi eski                                                                       | `mongo:7` dan foydalaning (mongosh image ichida)                                                                                                                                                                                                                |
