# Xavfsizlik

## Autentifikatsiya oqimi

```text
1. POST /api/auth/login  (yoki /api/mobile/auth/login)           @Public, Throttle 10/min
   -> argon2id tekshiruvi -> sessiya (MongoDB) -> access + refresh JWT
2. Har so'rov: Authorization: Bearer <accessToken>
   -> JwtStrategy: imzo (JWT_ACCESS_SECRET), exp, type==='access'
   -> sessions.findOne({sessionId: sid, revokedAt: null, expiresAt > now})   bo'lmasa 401 AUTH_SESSION_REVOKED
   -> users.status TERMINATED/BLOCKED bo'lmasa                               aks holda 401 AUTH_ACCOUNT_INACTIVE
   -> sessions.lastActiveAt = now
3. Access muddati tugaganda: POST /api/auth/refresh {refreshToken}          @Public, @SkipAudit
   -> imzo (JWT_REFRESH_SECRET), type==='refresh'
   -> sessiya faol va sha256(refreshToken) === sessions.refreshTokenHash
   -> yangi access + yangi refresh; hash va expiresAt yangilanadi (rotation)
4. POST /api/auth/logout -> sessions.revokedAt = now, reason LOGOUT
```

### Token muddatlari

| Token   | Env               | Standart             | Payload                                                                             |
| ------- | ----------------- | -------------------- | ----------------------------------------------------------------------------------- |
| Access  | `JWT_ACCESS_TTL`  | 900 s (15 daqiqa)    | `{ sub: userId, role, sid: sessionId, type: 'access' }`, HS256, `JWT_ACCESS_SECRET` |
| Refresh | `JWT_REFRESH_TTL` | 2 592 000 s (30 kun) | `{ sub: userId, sid: sessionId, type: 'refresh' }`, HS256, `JWT_REFRESH_SECRET`     |

Login javobida `accessExpiresIn` va `refreshExpiresIn` (soniya) qaytadi. Sessiya `expiresAt` har refresh da `now + JWT_REFRESH_TTL` ga uzaytiriladi (sliding session). MongoDB TTL indeksi (`expiresAt`, `expireAfterSeconds: 0`) muddati o'tgan sessiya hujjatlarini o'chiradi.

### Refresh token qayta ishlatilishi

Refresh token bir martalik. Agar `sid` bo'yicha faol sessiya topilsa, lekin hash mos kelmasa (eski token qayta yuborilgan), sessiya `REFRESH_TOKEN_REUSE` sababi bilan darhol bekor qilinadi va `401 AUTH_REFRESH_INVALID` qaytadi. Shu sessiyadagi joriy access token ham keyingi so'rovda `AUTH_SESSION_REVOKED` oladi. Klient tokenlarni tozalab login sahifasiga qaytishi kerak.

## Sessiya modeli

Bitta login = bitta `sessions` hujjati (`sessionId` uuid). Saqlanadi: `client` (WEB/MOBILE), `ip` (`X-Forwarded-For` birinchi qiymati, `trust proxy` yoqilgan), `userAgent`, `device`, `browser`, `os` (ua-parser-js), mobil uchun `deviceName`, `platform`, `pushToken`, `lastActiveAt`, `expiresAt`, `revokedAt`, `revokedReason`.

Sessiyalar qachon bekor qilinadi:

| Hodisa                                                           | Qamrov                   | `revokedReason`                        | Socket event                    |
| ---------------------------------------------------------------- | ------------------------ | -------------------------------------- | ------------------------------- |
| Logout                                                           | joriy sessiya            | `LOGOUT`                               | -                               |
| Refresh token qayta ishlatilishi                                 | shu sessiya              | `REFRESH_TOKEN_REUSE`                  | -                               |
| Foydalanuvchi parolini o'zgartirdi                               | joriydan tashqari barcha | `PASSWORD_CHANGED`                     | `session.terminated` har biriga |
| Foydalanuvchi bitta sessiyani yakunladi                          | tanlangan                | `TERMINATED_BY_USER`                   | `session.terminated`            |
| Foydalanuvchi "boshqalarini yakunlash"                           | joriydan tashqari barcha | `TERMINATED_BY_USER`                   | `session.terminated`            |
| SUPERADMIN login/parolni tikladi (`terminateSessions !== false`) | barcha                   | `CREDENTIALS_RESET_BY_ADMIN`           | `session.terminated`            |
| Holat `TERMINATED` yoki `BLOCKED`                                | barcha                   | `STATUS_TERMINATED` / `STATUS_BLOCKED` | `session.terminated`            |

Foydalanuvchi o'z sessiyalarini `GET /api/auth/sessions` (mobil: `/api/mobile/sessions`) orqali ko'radi, `isCurrent` belgisi bilan. SUPERADMIN hammasini `GET /api/audit/sessions?userId=&client=` orqali ko'radi (bekor qilish endpointi SUPERADMIN uchun yo'q; `PATCH /api/users/:id/credentials` barcha sessiyalarni bekor qiladi).

## Login tarixi

Har bir urinish `login_history` ga yoziladi: `login`, `success`, `failureReason` (`AUTH_INVALID_CREDENTIALS`, `AUTH_ACCOUNT_INACTIVE`), `client`, `ip`, qurilma ma'lumotlari, muvaffaqiyatli bo'lsa `sessionId` va `userId`. Login mavjud bo'lmasa `userId = null`, lekin kiritilgan `login` saqlanadi (brute-force tahlili uchun).

- O'zi: `GET /api/auth/login-history?page=&limit=`
- SUPERADMIN: `GET /api/audit/login-history?userId=&login=&success=false`
- SUPERADMIN dashboard: oxirgi 24 soatdagi muvaffaqiyatli va muvaffaqiyatsiz loginlar soni, faol sessiyalar.

## Xavfsizlik ogohlantirishlari

Har bir muvaffaqiyatli loginda (web va mobil):

1. Socket.IO `security.alert` -> `user:<id>` xonasiga: `{ kind: 'NEW_LOGIN', sessionId, client, ip, device, browser, os, at }`.
2. `notifications` ga `SECURITY_NEW_LOGIN` yozuvi (sarlavha "Yangi kirish aniqlandi", matnda qurilma, OS, brauzer, IP, vaqt) va `notification` / `notification.unread` eventlari.

Boshqa xavfsizlik bildirishnomalari: `SECURITY_PASSWORD_CHANGED` (parol o'zgartirilganda, yakunlangan sessiyalar soni bilan), `SECURITY_SESSION_TERMINATED` (foydalanuvchi bitta sessiyani yakunlaganda).

Foydalanuvchi notanish qurilmadan kirishni ko'rsa: `Xavfsizlik` sahifasida o'sha sessiyani yakunlaydi va parolini o'zgartiradi (bu qolgan barcha sessiyalarni ham yopadi).

## Parol qoidalari

| Qoida                                                                                                                                | Qayerda                         |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| Hash: Argon2id, `memoryCost 19456`, `timeCost 2`, `parallelism 1`                                                                    | `common/utils/password.util.ts` |
| Yangi parol 8-128 belgi (xodim/HR yaratish, admin tiklash, o'z parolini almashtirish)                                                | DTO lar                         |
| Login paytida parol 6-128 belgi (eski, qisqa parollarni kiritishga ruxsat, lekin yaratishda emas)                                    | `LoginDto`                      |
| Joriy parol tekshiriladi, keyin yangisi o'rnatiladi                                                                                  | `AuthService.changePassword`    |
| `passwordHash` javoblarda hech qachon qaytmaydi (`select: false`)                                                                    | `User` entity                   |
| `mustChangePassword` HR va xodim yaratilganda va admin tiklashda (standart) `true`; o'z parolini almashtirganda `false`              | `UsersService`                  |
| Hech kim boshqaning parolini bilmaydi: SUPERADMIN yangi parol o'rnatadi (`PATCH /api/users/:id/credentials`), eski parolni ko'rmaydi | -                               |

`mustChangePassword` backend tomonida majburlanmaydi (guard yo'q); bu frontend uchun belgi - login javobidagi `user.mustChangePassword` `true` bo'lsa, frontend foydalanuvchini parol almashtirish oynasiga yo'naltiradi. Murakkablik qoidasi (katta harf, raqam) yo'q; kerak bo'lsa DTO ga `@Matches` qo'shish kerak.

## RBAC guard'lar

Tartib (`app.module.ts`): `ThrottlerGuard` -> `JwtAuthGuard` -> `RolesGuard`.

- `@Public()` - JWT talab qilinmaydi: `auth/login`, `auth/refresh`, `mobile/auth/login`, `mobile/auth/refresh`, `organization/public`, `health`.
- `@Roles(...)` - controller yoki handler darajasida; `UsersController` va `AuditController` butunlay `SUPERADMIN`.
- Scope tekshiruvi servislarda (`DepartmentScopeService`), batafsil [roles.md](roles.md).
- `ValidationPipe({ whitelist: true })` - DTO da e'lon qilinmagan maydonlar jimgina olib tashlanadi (mass-assignment himoyasi). `forbidUnknownValues: false`.

File-service da o'z guard'lari: `JwtAuthGuard` (faqat imzo va payload tekshiruvi, sessiya tekshirilmaydi) va `RolesGuard` (`INSUFFICIENT_ROLE`).

## Rate limiting

`ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }])` - har IP uchun 300 so'rov / 60 s, barcha endpointlarga (`ThrottlerGuard` global). Login endpointlari (`POST /api/auth/login`, `POST /api/mobile/auth/login`) `@Throttle({ default: { limit: 10, ttl: 60000 } })` - 10 urinish / 60 s. Limit oshsa `429` va `ThrottlerException: Too Many Requests`. Hisob reverse proxy orqasida `X-Forwarded-For` ga tayanadi (`trust proxy`), shuning uchun proxy headerni to'g'ri uzatishi shart. Hisoblagich jarayon xotirasida - bir nechta backend replikasida har biri alohida sanaydi.

## Helmet va CORS

|             | Backend                                                                            | File-service                                                                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| helmet      | `helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })` (CSP standart) | `crossOriginResourcePolicy: cross-origin`, qattiq CSP (`defaultSrc 'self'`, `imgSrc 'self' data: blob:`, `frameAncestors 'none'`), `x-powered-by` o'chirilgan                  |
| CORS        | `origin: CORS_ORIGINS` (vergul bilan ro'yxat), `credentials: true`                 | `origin: CORS_ORIGINS`, `methods GET, POST, DELETE, OPTIONS`, `allowedHeaders Authorization, Content-Type`, `exposedHeaders Content-Disposition, Content-Length`, `maxAge 600` |
| trust proxy | yoqilgan                                                                           | yoqilgan                                                                                                                                                                       |

Socket.IO gateway (`/ws`) CORS ro'yxatini HTTP bilan bir xil `CORS_ORIGINS` o'zgaruvchisidan oladi. Ulanishda JWT imzosi tekshiriladi va sessiya MongoDB da faol ekani (`revokedAt` bo'sh, muddati o'tmagan) tasdiqlanadi; bekor qilingan sessiya tokeni bilan ulanish darhol uziladi.

## Audit

`AuditInterceptor` (global) har `POST`, `PUT`, `PATCH`, `DELETE` so'rovni `audit_logs` ga yozadi, `@SkipAudit()` bo'lganlardan tashqari: `auth/refresh`, `mobile/auth/refresh`, `export/excel`, `export/pdf`, `notifications/:id/read`, `notifications/read-all`. `GET` so'rovlar yozilmaydi.

Yoziladigan maydonlar: `actorId`, `actorLogin` (public login da body dan), `actorRole`, `action` (`Controller.handler`, masalan `Auth.login`, `Employees.changeStatus`, `Payroll.updateStatus`), `method`, `path`, `entity` (controller nomi), `entityId` (`:id`, `:userId`, `:departmentId` yoki `:sessionId` parametri), `statusCode`, `durationMs`, `ip`, `userAgent`, `payload` (sanitizatsiya: `password`, `newPassword`, `currentPassword`, `confirmPassword`, `refreshToken`, `accessToken`, `passwordHash` -> `[REDACTED]`; satrlar 500 belgida kesiladi, massivlar 50 elementgacha, chuqurlik 4), `query`, `errorMessage` (xato bo'lsa).

Guard dan o'tmagan so'rovlar (401/403 guard darajasida) interceptor ga yetib kelmaydi, shuning uchun audit ga tushmaydi; login urinishlari esa `login_history` da.

SUPERADMIN uchun:

```text
GET /api/audit/logs?userId=<uuid>&action=Tasks.verify&entity=Employees&entityId=&method=PATCH&from=2025-10-01&to=2025-10-31&onlyErrors=true&page=1&limit=50
GET /api/audit/login-history?userId=&login=&success=false
GET /api/audit/sessions?userId=&client=MOBILE
```

## Fayl ruxsatlari (file-service)

| Kategoriya | Yuklash        | O'qish (`GET /files/:id`, `/files/:id/content`) | Cache-Control           |
| ---------- | -------------- | ----------------------------------------------- | ----------------------- |
| `PHOTO`    | SUPERADMIN, HR | ochiq (tokensiz)                                | `public, max-age=86400` |
| `LOGO`     | SUPERADMIN     | ochiq                                           | `public, max-age=86400` |
| `PASSPORT` | SUPERADMIN, HR | SUPERADMIN, HR, `ownerUserId` egasi, yuklagan   | `private, no-store`     |
| `DOCUMENT` | barcha rollar  | SUPERADMIN, HR, `ownerUserId` egasi, yuklagan   | `private, no-store`     |

- Token `Authorization: Bearer` yoki `?token=<accessToken>` query orqali (brauzer `<img>`/`<a>` teglari uchun). Query dagi token proxy/brauzer loglarida qolishi mumkin - access token qisqa muddatli (15 daqiqa) bo'lgani uchun xavf cheklangan, lekin faqat kerak bo'lganda ishlating.
- MIME ro'yxati: PHOTO `image/jpeg, image/png, image/webp`; LOGO + `image/svg+xml`; PASSPORT raster + `application/pdf`; DOCUMENT raster + PDF + DOCX + XLSX + `text/plain`. Mos kelmasa `400 FILE_TYPE_NOT_ALLOWED`.
- Hajm: `MAX_FILE_SIZE_MB` (standart 10) -> `400 FILE_TOO_LARGE`; bo'sh fayl -> `FILE_EMPTY`; fayl yo'q -> `FILE_REQUIRED`; rol mos emas -> `403 CATEGORY_NOT_ALLOWED_FOR_ROLE`; tokensiz maxfiy fayl -> `401 MISSING_TOKEN`; begona fayl -> `403 FILE_ACCESS_DENIED`.
- Fayl nomi sanitizatsiya qilinadi (yo'l belgilarisiz, 255 belgi), `Content-Disposition: inline`, `X-Content-Type-Options: nosniff`.
- Lokal drayver path traversal dan himoyalangan (`..`, absolyut yo'l -> `INVALID_STORAGE_KEY`).
- O'chirish soft delete (`isDeleted`) + saqlashdan olib tashlash; faqat HR va SUPERADMIN.
- File-service sessiya bekor qilinganini bilmaydi: bekor qilingan sessiyaning access tokeni muddati tugagunicha (<= 15 daqiqa) fayl olishda ishlaydi.

## Hardening ro'yxati (production)

- [ ] `JWT_ACCESS_SECRET` va `JWT_REFRESH_SECRET` - har biri `openssl rand -hex 32`, bir-biridan farqli, `.env` git da emas (`.gitignore` da `.env` bor).
- [ ] `SEED_SUPERADMIN_PASSWORD` ni o'zgartiring yoki birinchi kirishdan keyin parolni almashtiring; `SEED_SUPERADMIN_LOGIN` ni standartdan farqli qiling.
- [ ] `POSTGRES_PASSWORD` ni almashtiring; PostgreSQL va MongoDB portlarini hostga ochmang yoki `127.0.0.1:` ga bog'lang. MongoDB autentifikatsiyasiz ishlaydi (`MONGO_URI` da foydalanuvchi yo'q) - tashqi tarmoqqa chiqmasligi shart.
- [ ] HTTPS faqat reverse proxy orqali; `CORS_ORIGINS` da faqat haqiqiy frontend domeni.
- [ ] `/api/docs` va `/docs` (Swagger) ni production da proxy orqali yoping yoki IP bilan cheklang.
- [ ] Reverse proxy `X-Forwarded-For` ni to'g'ri qo'ysin (tashqaridan kelganini qayta yozsin), aks holda rate limit va audit IP si noto'g'ri.
- [ ] `/ws` uchun reverse proxy darajasida qo'shimcha origin cheklovi (ixtiyoriy, gateway `CORS_ORIGINS` ni o'zi tekshiradi).
- [ ] `JWT_ACCESS_TTL` ni 900 dan oshirmang; `JWT_REFRESH_TTL` ni tashkilot siyosatiga moslang (masalan 7 kun = 604800).
- [ ] Faol bo'lmagan xodimlarni `TERMINATED`/`BLOCKED` ga o'tkazing - bu sessiyalarni darhol yopadi.
- [ ] `GET /api/audit/login-history?success=false` ni muntazam ko'rib chiqing; bir login ga ko'p muvaffaqiyatsiz urinish bo'lsa, hisobni `BLOCKED` qiling.
- [ ] Backup: `pg_dump`, `mongodump`, `file_uploads` ([docker.md](docker.md)); backup fayllarini shifrlangan joyda saqlang (pasport nusxalari bor).
- [ ] S3 ishlatilsa bucket ommaviy bo'lmasin - fayllar faqat file-service orqali beriladi.
- [ ] Konteyner loglarini markazlashtiring; `audit_logs` va `login_history` o'sadi - saqlash muddati (retention) siyosatini belgilang (masalan `db.audit_logs.deleteMany({createdAt: {$lt: ...}})` yoki TTL indeks).
- [ ] Node image larni (`node:22-alpine`) va bog'liqliklarni muntazam yangilang (`npm audit`).
