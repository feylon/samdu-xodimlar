# Arxitektura

## Xizmatlar diagrammasi

```text
                         ┌──────────────────────────────┐
   Brauzer / Mobil ────► │  frontend (Nuxt 3 SPA)       │  :3002   hrms-frontend
                         │  NUXT_PUBLIC_API_BASE        │
                         │  NUXT_PUBLIC_WS_BASE         │
                         │  NUXT_PUBLIC_FILE_BASE       │
                         └───────┬──────────────┬───────┘
                 REST /api + Socket.IO /ws      │ multipart upload, <img src=.../files/:id/content>
                                 │              │
                                 ▼              ▼
   ┌─────────────────────────────────┐   ┌──────────────────────────────┐
   │  backend (NestJS)         :3000 │   │  file-service (NestJS) :3001 │
   │  hrms-backend                   │   │  hrms-file-service           │
   │  prefiks /api, Swagger /api/docs│   │  Swagger /docs               │
   │  guards: Throttler→JWT→Roles    │   │  guards: JWT→Roles           │
   │  interceptor: Audit             │   │  JWT_ACCESS_SECRET umumiy    │
   │  cron: KPI snapshot, eslatma    │   │  STORAGE_DRIVER local | s3   │
   └──────┬───────────────┬──────────┘   └──────────┬──────────┬────────┘
          │ TypeORM       │ Mongoose                │ Mongoose │ fs / S3
          ▼               ▼                         ▼          ▼
   ┌──────────────┐  ┌──────────────────┐   ┌──────────────┐  ┌──────────────┐
   │ PostgreSQL 16│  │ MongoDB 7        │   │ MongoDB 7    │  │ file_uploads │
   │ db: hrms     │  │ db: hrms         │   │ db: hrms_files│ │ volume yoki  │
   │ hrms-postgres│  │ hrms-mongo       │   │ (files)      │  │ S3 bucket    │
   └──────────────┘  └──────────────────┘   └──────────────┘  └──────────────┘
```

Barcha konteynerlar `hrms` nomli bridge tarmoqda. Backend file-service ni to'g'ridan-to'g'ri chaqirmaydi: u faqat fayl identifikatorlarini (`photoFileId`, `passportFileIds`, `logoFileId`, `attachmentFileIds`) saqlaydi va `FILE_SERVICE_PUBLIC_URL` asosida `logoUrl` ni hosil qiladi. Fayl yuklash va ko'rsatish brauzerdan to'g'ridan-to'g'ri file-service ga boradi. Ikkala xizmat bitta `JWT_ACCESS_SECRET` bilan access tokenni tekshiradi.

## Backend modullari

Manba: `backend/src/app.module.ts`. Global provayderlar: `ThrottlerGuard`, `JwtAuthGuard`, `RolesGuard` (APP_GUARD, shu tartibda), `AuditInterceptor` (APP_INTERCEPTOR), `HttpExceptionFilter` (APP_FILTER).

| Modul           | Saqlash                                                  | Mas'uliyat                                                                                                                                                                                                                    |
| --------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config`        | -                                                        | `loadConfiguration()`: env o'zgaruvchilarni o'qiydi, `JWT_ACCESS_SECRET` va `JWT_REFRESH_SECRET` bo'lmasa xato bilan to'xtaydi                                                                                                |
| `database`      | PostgreSQL                                               | `data-source.ts` (TypeORM DataSource, `synchronize: false`, `migrationsTableName: typeorm_migrations`), `entities.ts`, `run-migrations.ts`, `seed.ts`, `migrations/`                                                          |
| `common`        | -                                                        | Decorators (`@Public`, `@Roles`, `@CurrentUser`, `@RequestMetadata`, `@SkipAudit`), guards, enums, `ErrorCodes`, utils (sana Asia/Tashkent, argon2, sha256, payload sanitizatsiya, user-agent parsing), `HttpExceptionFilter` |
| `auth`          | -                                                        | Web login/refresh/logout/me/change-password, o'z sessiyalari va login tarixi; `JwtStrategy` har so'rovda sessiyani MongoDB da tekshiradi                                                                                      |
| `sessions`      | MongoDB `sessions`, `login_history`                      | Sessiya yaratish, refresh token hash rotation, bekor qilish, login urinishlarini yozish                                                                                                                                       |
| `users`         | PostgreSQL `users`, `employee_status_history`            | `UsersController` (`/users`, faqat SUPERADMIN: HR yaratish, istalgan foydalanuvchini tahrirlash, login/parolni tiklash) va `EmployeesController` (`/employees`, HR onboarding, holat, yuklamalar, transfer)                   |
| `departments`   | PostgreSQL `departments`, `department_assignments`       | Bo'limlar, boshliq tayinlash (rolni avtomatik ko'tarish/tushirish), `DepartmentScopeService` - rol va bo'lim bo'yicha ko'rinish doirasini hisoblash                                                                           |
| `calendar`      | PostgreSQL `calendar_days`                               | Standart Du-Ju ish kuni, Sha-Ya dam olish; `calendar_days` dagi yozuvlar override                                                                                                                                             |
| `attendance`    | PostgreSQL `attendance_records`                          | Faqat bugungi davomat, bo'lim boshlig'i belgilaydi, oylik xulosa                                                                                                                                                              |
| `tasks`         | PostgreSQL `tasks`                                       | Vazifa hayot sikli, tasdiqlashda `KpiService.award`                                                                                                                                                                           |
| `kpi`           | PostgreSQL `point_transactions`, `monthly_kpi_summaries` | Ball tranzaksiyalari, leaderboard, qo'lda tuzatish, oylik snapshot cron                                                                                                                                                       |
| `daily-reports` | MongoDB `daily_reports`                                  | Kunlik hisobot (kuniga bitta), baholash -> ball, eslatma cron                                                                                                                                                                 |
| `payroll`       | PostgreSQL `payroll_records`                             | Oylik hisob-kitob, `CALCULATED -> PAID`, breakdown JSON                                                                                                                                                                       |
| `announcements` | PostgreSQL `announcements`                               | Bo'lim yoki tashkilot miqyosidagi e'lonlar, bildirishnoma tarqatish                                                                                                                                                           |
| `polls`         | MongoDB `polls`                                          | So'rovnomalar, ovoz berish, natijalarni ko'rish qoidalari                                                                                                                                                                     |
| `notifications` | MongoDB `notifications`                                  | `@Global()` modul: REST ro'yxat/o'qilgan deb belgilash + Socket.IO gateway (`/ws`)                                                                                                                                            |
| `audit`         | MongoDB `audit_logs`                                     | `@Global()` modul: `AuditInterceptor` va SUPERADMIN uchun `/audit/*`                                                                                                                                                          |
| `organization`  | PostgreSQL `organization_settings`                       | Brending, valyuta, ball qiymati, bo'lim boshlig'i koeffitsientlari, hisobot deadline soati                                                                                                                                    |
| `dashboard`     | -                                                        | Rolga mos statistika (`GET /api/dashboard`)                                                                                                                                                                                   |
| `export`        | -                                                        | `POST /api/export/excel` va `/pdf` (exceljs, pdfmake)                                                                                                                                                                         |
| `mobile`        | -                                                        | `/api/mobile/*` - `AuthService`, `DashboardService`, `NotificationsService` ni qayta ishlatadi, Swagger tegi "Mobile App Operations"                                                                                          |
| `health`        | -                                                        | `GET /api/health` - PostgreSQL `SELECT 1` va Mongo `readyState`                                                                                                                                                               |

## Ma'lumot oqimlari

### Login (web yoki mobil)

```text
Client ──POST /api/auth/login {login,password}──► AuthController (@Public, Throttle 10/min)
  1. UsersService.findByLoginWithPassword (login case-insensitive)
  2. argon2.verify; xato bo'lsa login_history (success=false, AUTH_INVALID_CREDENTIALS) -> 401
  3. status TERMINATED yoki BLOCKED -> login_history (AUTH_ACCOUNT_INACTIVE) -> 401
  4. SessionsService.create -> sessions hujjati (sessionId=uuid, refreshTokenHash, ip, device, os, browser,
     mobil bo'lsa deviceName/platform/pushToken, expiresAt = now + JWT_REFRESH_TTL)
  5. access token {sub, role, sid, type:'access'} (JWT_ACCESS_TTL, standart 900 s)
     refresh token {sub, sid, type:'refresh'} (JWT_REFRESH_TTL, standart 2592000 s); hash sessiyaga yoziladi
  6. login_history (success=true), users.lastLoginAt = now
  7. Socket.IO `security.alert` {kind:'NEW_LOGIN', ip, device, ...} + notifications (SECURITY_NEW_LOGIN)
  ◄── 200 {accessToken, refreshToken, accessExpiresIn, refreshExpiresIn, sessionId, user}
```

Har bir keyingi so'rovda `JwtStrategy.validate`: `type === 'access'`, sessiya `revokedAt == null && expiresAt > now`, foydalanuvchi holati ruxsat etilgan; `sessions.lastActiveAt` yangilanadi.

### Vazifa -> KPI -> ish haqi

```text
DEPARTMENT_HEAD  POST /api/tasks            -> tasks (status ASSIGNED, maxPoints standart 10)  -> TASK_ASSIGNED bildirishnoma
EMPLOYEE         PATCH /api/tasks/:id/status {IN_PROGRESS | COMPLETED | PARTIALLY_COMPLETED}   -> TASK_STATUS_CHANGED (boshliqqa)
DEPARTMENT_HEAD  POST /api/tasks/:id/verify {verdict: VERIFIED, points?}
                   -> tasks.status = VERIFIED, awardedPoints
                   -> point_transactions (source TASK yoki BONUS_TASK, year/month = joriy oy)
                   -> TASK_VERIFIED bildirishnoma
EMPLOYEE         POST /api/reports/daily  ->  DEPARTMENT_HEAD POST /api/reports/daily/:id/rate {rating 1-5}
                   -> point_transactions (source DAILY_REPORT, year/month = hisobot sanasi oyi)
HR               POST /api/kpi/adjust  -> point_transactions (source MANUAL, +/- 100 gacha)
Cron 1-kun 00:05 -> monthly_kpi_summaries (o'tgan oy bo'yicha xulosa)
HR               POST /api/payroll/calculate {year, month}
                   -> davomat (attendance_records), ballar (point_transactions year/month), kalendar ish kunlari,
                      organization_settings koeffitsientlari -> payroll_records (CALCULATED) -> PAYROLL_STATUS bildirishnoma
HR               PATCH /api/payroll/:id/status {status: PAID} -> PAID (o'zgarmas) -> PAYROLL_STATUS bildirishnoma
```

### Bildirishnoma / Socket.IO

```text
Istalgan xizmat ──► NotificationsService.notify({userId, type, title, body, data})
   1. notifications kolleksiyasiga yoziladi
   2. gateway.emitToUser(userId, 'notification', {...})
   3. gateway.emitToUser(userId, 'notification.unread', {count})
Client ──► io(`${WS_BASE}/ws`, { auth: { token: accessToken } })
   handleConnection: JWT tekshiriladi, socket `user:<id>` va `session:<sid>` xonalariga qo'shiladi
Eventlar: notification, notification.unread, security.alert (userga), session.terminated (sessiyaga)
```

Sessiya bekor qilinganda (`logout`, parol o'zgarishi, admin tomonidan tiklash, TERMINATED/BLOCKED holati, foydalanuvchining o'zi boshqa qurilmani yakunlashi) tegishli `session:<sid>` xonasiga `session.terminated {reason}` yuboriladi; frontend shu eventda tokenlarni tozalab login sahifasiga qaytaradi.

## PostgreSQL va MongoDB bo'linishi

| PostgreSQL (TypeORM)                                                                                                                                                                                                 | MongoDB (Mongoose)                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tranzaksion, relyatsion, pul va hisobga olinadigan ma'lumot: foydalanuvchilar, bo'limlar, yuklamalar, davomat, vazifalar, ball tranzaksiyalari, oylik xulosalar, ish haqi, e'lonlar, kalendar, tashkilot sozlamalari | Yuqori yozish hajmi va o'zgaruvchan sxema: sessiyalar (TTL indeks), login tarixi, audit loglari (ixtiyoriy payload), kunlik hisobotlar (matn + biriktirmalar), so'rovnomalar (ichki `votes` massivi), bildirishnomalar (ixtiyoriy `data`), fayl metadata (alohida `hrms_files` bazasi) |
| Sxema migratsiyalar orqali versiyalanadi, FK va unique cheklovlar bazada                                                                                                                                             | Sxema kodda (Mongoose), indekslar ilova ishga tushganda yaratiladi                                                                                                                                                                                                                     |
| Hisob-kitoblar (payroll, KPI) SQL agregatsiya bilan                                                                                                                                                                  | Audit va sessiyalar asosiy bazaga yuk bermaydi, vaqt bo'yicha o'sadi                                                                                                                                                                                                                   |

Ikki baza orasida tranzaksiya yo'q. Masalan, hisobot baholanganda hisobot Mongo da saqlanadi, keyin ball PostgreSQL ga yoziladi; ikkinchi qadam muvaffaqiyatsiz bo'lsa hisobot "baholangan" bo'lib qoladi. Bu holatlarni audit log orqali tekshirish mumkin.

## Mikroservis chegaralari

- **backend** - barcha biznes mantiq, autentifikatsiya manbai (token chiqaradi), sessiyalar.
- **file-service** - faqat fayl saqlash va berish. Tokenni o'zi tekshiradi (imzo, `type === 'access'`, rol), lekin sessiyani MongoDB da tekshirmaydi (stateless). Metadata alohida `hrms_files` bazasida. Backend bilan hech qanday HTTP aloqasi yo'q.
- **frontend** - faqat statik SPA (Nitro node-server faqat fayllarni beradi), biznes mantiq yo'q.

## Cron ishlar

Ikkalasi `@nestjs/schedule` orqali, `timeZone: APP_TIMEZONE` (`TZ`, standart `Asia/Tashkent`). Bir nechta backend instansiya ishlatilsa, cron har birida bajariladi; snapshot idempotent (`findOne` + `save`), eslatma esa ikki marta yuborilishi mumkin.

| Cron ifodasi                               | Qayerda                                    | Nima qiladi                                                                                                                                                                                                                                                                    |
| ------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `0 5 0 1 * *` (har oyning 1-kuni 00:05:00) | `KpiService.snapshotPreviousMonth`         | O'tgan oy uchun barcha EMPLOYEE va DEPARTMENT_HEAD lar bo'yicha `monthly_kpi_summaries` yozuvini yaratadi/yangilaydi: ballar manbalar bo'yicha, vazifalar soni, davomat nisbati. Joriy oy ballari `point_transactions.year/month` filtri sababli o'z-o'zidan noldan boshlanadi |
| `0 * * * *` (har soat boshida)             | `DailyReportsService.remindMissingReports` | Joriy soat `organization_settings.reportDeadlineHour` ga teng bo'lsa va bugun ish kuni bo'lsa, hisobot yubormagan ACTIVE xodimlarga (faol yuklamasi borlarga) `REPORT_MISSING` bildirishnomasi                                                                                 |

Snapshotni qo'lda ham chaqirish mumkin: `POST /api/kpi/snapshot?year=2025&month=9` (SUPERADMIN, HR).

## So'rov hayot sikli (backend)

```text
HTTP so'rov
 ├─ helmet, CORS (CORS_ORIGINS), trust proxy
 ├─ ThrottlerGuard   300 so'rov/60 s (IP bo'yicha), login endpointlarida 10/60 s
 ├─ JwtAuthGuard     @Public bo'lmasa Bearer token + sessiya tekshiruvi
 ├─ RolesGuard       @Roles(...) mos kelmasa 403 ACCESS_FORBIDDEN_ROLE
 ├─ ValidationPipe   whitelist (noma'lum maydonlar olib tashlanadi), transform
 ├─ AuditInterceptor POST/PUT/PATCH/DELETE (SkipAudit bo'lmasa) -> audit_logs
 ├─ Controller -> Service (scope tekshiruvi DepartmentScopeService orqali)
 └─ HttpExceptionFilter  {statusCode, message, details?, path, timestamp}
```
