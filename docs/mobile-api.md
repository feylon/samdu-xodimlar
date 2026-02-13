# Mobil ilova uchun API qo'llanmasi

Barcha mobil endpointlar `/api/mobile/*` yo'lida va Swagger da "Mobile App Operations" tegi ostida (`http://<host>:3000/api/docs`). Ular web endpointlar bilan bir xil servislardan foydalanadi, shuning uchun `/api/employees`, `/api/tasks`, `/api/attendance` va boshqa domen endpointlari mobil ilovadan ham xuddi shu access token bilan chaqiriladi ([api.md](api.md)). Mobil bo'lim faqat autentifikatsiya, sessiya, profil, dashboard va bildirishnomalar uchun alohida yo'llar beradi.

Asosiy URL: `NUXT_PUBLIC_API_BASE` ga mos, masalan `https://hrms.example.uz/api`. Socket.IO: `https://hrms.example.uz` + namespace `/ws`.

## Endpointlar

| Metod | Yo'l | Auth | Tavsif |
|---|---|---|---|
| POST | `/mobile/auth/login` | yo'q (10/min IP) | Login + qurilma ro'yxati (`deviceName`, `platform`, `pushToken`) |
| POST | `/mobile/auth/refresh` | yo'q | Refresh token rotation |
| POST | `/mobile/auth/logout` | Bearer | Joriy sessiyani yakunlash |
| POST | `/mobile/auth/change-password` | Bearer | Parolni almashtirish (boshqa sessiyalar yopiladi) |
| GET | `/mobile/me` | Bearer | Profil + faol yuklamalar + `sessionId` |
| GET | `/mobile/sessions` | Bearer | Barcha faol sessiyalar (web va mobil), `isCurrent` bilan |
| DELETE | `/mobile/sessions/:sessionId` | Bearer | Bitta sessiyani yakunlash |
| DELETE | `/mobile/sessions/others` | Bearer | Joriydan tashqari hammasini yakunlash |
| GET | `/mobile/login-history?page=&limit=` | Bearer | O'z login tarixi |
| GET | `/mobile/dashboard` | Bearer | Rolga mos dashboard (web `GET /dashboard` bilan bir xil payload) |
| GET | `/mobile/notifications?unreadOnly=&page=&limit=` | Bearer | Bildirishnomalar lentasi |

Bildirishnomani o'qilgan deb belgilash umumiy endpointlar orqali: `PATCH /api/notifications/:id/read`, `POST /api/notifications/read-all`, `GET /api/notifications/unread-count`.

## Login

```http
POST /api/mobile/auth/login
Content-Type: application/json

{
  "login": "j.ergashev",
  "password": "Parol-12345",
  "deviceName": "Samsung Galaxy S24",
  "platform": "android",
  "pushToken": "fcm:dGhpcyBpcyBhIHRlc3Q..."
}
```

Cheklovlar: `login` 3-64, `password` 6-128, `deviceName` <= 120, `platform` <= 32, `pushToken` <= 512 belgi. Uchta qurilma maydoni ixtiyoriy, lekin `deviceName` va `platform` ni yuboring - foydalanuvchi sessiyalar ro'yxatida qurilmasini taniy olishi uchun (`User-Agent` dan aniqlangan `device`/`os` mobil HTTP klientlarda ko'pincha `unknown` bo'ladi).

Javob `200`:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "accessExpiresIn": 900,
  "refreshExpiresIn": 2592000,
  "sessionId": "5f1c0a1e-7b0f-4a5e-9c3d-2f8e6b1a9d10",
  "user": {
    "id": "a3f0...",
    "login": "j.ergashev",
    "role": "EMPLOYEE",
    "fullName": "Ergashev Jamshid",
    "pinfl": "31234567890123",
    "phone": "+998901112233",
    "email": null,
    "position": "Backend dasturchi",
    "baseSalary": 8000000,
    "photoFileId": "9b2c...",
    "passportFileIds": [],
    "status": "ACTIVE",
    "hireDate": "2025-10-01",
    "terminatedAt": null,
    "birthDate": null,
    "address": null,
    "mustChangePassword": true,
    "lastLoginAt": "2025-10-07T04:12:30.000Z",
    "createdAt": "2025-10-01T03:00:00.000Z",
    "updatedAt": "2025-10-07T04:12:30.000Z"
  }
}
```

- `user.mustChangePassword === true` bo'lsa, ilova parol almashtirish ekranini ko'rsatishi kerak (backend majburlamaydi).
- Har login yangi sessiya yaratadi va foydalanuvchining barcha qurilmalariga `security.alert` + `SECURITY_NEW_LOGIN` bildirishnomasi yuboriladi (shu jumladan hozir kirgan qurilmaga ham).
- Tokenlarni xavfsiz saqlang (Android Keystore / iOS Keychain). Refresh token bir martalik.

## Token yangilash (rotation)

Access token 15 daqiqa (`accessExpiresIn`). `401` olishdan oldin yoki `exp` ga 1-2 daqiqa qolganda yangilang:

```http
POST /api/mobile/auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJhbGciOiJIUzI1NiIs..." }
```

Javob login bilan bir xil shaklda (`accessToken`, `refreshToken`, `accessExpiresIn`, `refreshExpiresIn`, `sessionId`, `user`). **Eski refresh token darhol yaroqsiz bo'ladi** - yangisini saqlang. Bir vaqtda ikki parallel refresh yubormang: ikkinchisi eski token bilan kelib, `REFRESH_TOKEN_REUSE` deb hisoblanadi va **butun sessiya bekor qilinadi**. Refresh ni mutex/queue bilan bitta joydan bajaring.

Refresh `401 AUTH_REFRESH_INVALID` yoki `401 AUTH_ACCOUNT_INACTIVE` qaytarsa - tokenlarni o'chiring va login ekraniga qayting.

## Autentifikatsiyalangan so'rov

```http
GET /api/mobile/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

```json
{
  "id": "a3f0...", "login": "j.ergashev", "role": "EMPLOYEE", "fullName": "Ergashev Jamshid",
  "...": "PublicUser maydonlari",
  "assignments": [
    { "id": "c1...", "departmentId": "d9...", "departmentName": "Dasturlash", "departmentCode": "DEV", "rate": 100, "startDate": "2025-10-01", "isHead": false }
  ],
  "sessionId": "5f1c0a1e-7b0f-4a5e-9c3d-2f8e6b1a9d10"
}
```

Har so'rovda server sessiyani MongoDB da tekshiradi (bekor qilingan bo'lsa `401 AUTH_SESSION_REVOKED`) va `lastActiveAt` ni yangilaydi.

## Sessiyalarni boshqarish

```http
GET /api/mobile/sessions
```

```json
[
  {
    "id": "5f1c0a1e-...", "userId": "a3f0...", "client": "MOBILE",
    "ip": "84.54.x.x", "userAgent": "okhttp/4.12.0", "device": "desktop", "browser": "unknown", "os": "unknown",
    "deviceName": "Samsung Galaxy S24", "platform": "android",
    "createdAt": "2025-10-07T04:12:30.000Z", "lastActiveAt": "2026-10-07T05:01:10.000Z", "expiresAt": "2026-11-06T05:01:10.000Z",
    "isCurrent": true
  },
  {
    "id": "0d7e...", "client": "WEB", "device": "desktop", "browser": "Chrome 130.0", "os": "Windows 10",
    "deviceName": null, "platform": null, "isCurrent": false, "...": "..."
  }
]
```

- `DELETE /api/mobile/sessions/0d7e...` -> `{ "success": true, "sessionId": "0d7e..." }`; o'sha qurilmaga `session.terminated {reason: 'TERMINATED_BY_USER'}` ketadi, foydalanuvchiga `SECURITY_SESSION_TERMINATED` bildirishnoma. Boshqa foydalanuvchining sessiyasi -> `404 SESSION_NOT_FOUND`.
- `DELETE /api/mobile/sessions/others` -> `{ "success": true, "terminatedSessions": 2 }`.
- `POST /api/mobile/auth/logout` -> `{ "success": true }`; keyin lokal tokenlarni o'chiring.

## Parolni almashtirish

```http
POST /api/mobile/auth/change-password
Authorization: Bearer ...

{ "currentPassword": "Parol-12345", "newPassword": "Yangi-parol-2026" }
```

`newPassword` 8-128 belgi. Javob `{ "success": true, "terminatedSessions": 1 }`. Joriy sessiya saqlanadi, qolganlari yopiladi; `mustChangePassword` `false` bo'ladi. Joriy parol noto'g'ri -> `400 AUTH_PASSWORD_MISMATCH`.

## Push token

`pushToken` loginda qabul qilinadi va **sessiya hujjatida** saqlanadi (`sessions.pushToken`). Hozirgi backend push xabar yuborish integratsiyasiga ega emas (FCM/APNs chaqiruvi yo'q) - maydon kelajakdagi integratsiya uchun saqlanadi. Real vaqt bildirishnomalar faqat Socket.IO orqali keladi; ilova fon rejimida bo'lsa, `GET /api/mobile/notifications?unreadOnly=true` bilan polling qiling yoki ilova ochilganda sinxronlang.

Push token yangilansa (FCM rotation), yangi qiymatni yuborishning yagona yo'li qayta login qilish - alohida endpoint yo'q.

## Dashboard

`GET /api/mobile/dashboard` roliga qarab turli shakl qaytaradi; `role` maydoniga qarab render qiling.

EMPLOYEE uchun:

```json
{
  "role": "EMPLOYEE",
  "period": { "year": 2026, "month": 10 },
  "points": { "total": 23, "task": 15, "bonusTask": 5, "dailyReport": 3, "manual": 0 },
  "pointsHistory": [ { "year": 2026, "month": 9, "totalPoints": 41, "tasksVerified": 6, "attendanceRatio": "0.95", "...": "..." } ],
  "attendance": { "workingDays": 23, "elapsedWorkingDays": 5, "presentDays": 5, "ratio": 1, "counts": { "PRESENT": 4, "LATE": 1, "ABSENT": 0, "EXCUSED": 0, "REMOTE": 0 } },
  "tasks": { "byStatus": { "ASSIGNED": 2, "IN_PROGRESS": 1, "VERIFIED": 4 }, "overdue": 1 },
  "reportToday": { "submitted": false },
  "unreadNotifications": 3,
  "latestPayroll": { "year": 2026, "month": 9, "totalAmount": 8120000, "currency": "UZS", "status": "PAID", "breakdown": { "...": "..." } },
  "activePolls": 1
}
```

DEPARTMENT_HEAD: `departments`, `team.members`, `attendanceToday`, `attendanceSeries`, `tasks.pendingReviewItems`, `reports.missingItems`, `leaderboard`, `activePolls`. HR/SUPERADMIN: tashkilot miqyosidagi statistika (`employees.byStatus`, `payroll`, `payrollTrend`, SUPERADMIN da `security`).

## Bildirishnomalar

```http
GET /api/mobile/notifications?unreadOnly=true&page=1&limit=20
```

```json
{
  "items": [
    {
      "id": "67...", "userId": "a3f0...", "type": "TASK_ASSIGNED",
      "title": "Yangi vazifa", "body": "API hujjatini yangilash · muddat 2026-10-10",
      "data": { "taskId": "b4...", "type": "REGULAR", "priority": "HIGH" },
      "readAt": null, "createdAt": "2025-10-07T05:30:00.000Z"
    }
  ],
  "total": 3, "page": 1, "limit": 20
}
```

`type` qiymatlari va `data` kalitlari: [database.md](database.md) "notifications". Ekranga yo'naltirish: `data.taskId` -> vazifa, `data.payrollId` -> ish haqi, `data.reportId` -> hisobot, `data.announcementId`, `data.pollId`, `data.sessionId` -> xavfsizlik.

## Socket.IO

```js
import { io } from 'socket.io-client';

const socket = io(`${WS_BASE}/ws`, {
  auth: { token: accessToken },        // yoki query: { token }, yoki extraHeaders Authorization
  transports: ['websocket'],
});

socket.on('notification', (n) => { /* {id, type, title, body, data, readAt, createdAt} */ });
socket.on('notification.unread', ({ count }) => { /* badge */ });
socket.on('security.alert', (a) => { /* {kind:'NEW_LOGIN', sessionId, client, ip, device, browser, os, at} */ });
socket.on('session.terminated', ({ reason }) => { /* tokenlarni o'chirib login ekraniga */ });
```

- Token noto'g'ri yoki yo'q bo'lsa server ulanishni darhol uzadi (`disconnect`).
- Gateway tokenning faqat imzosi va muddatini tekshiradi; access token yangilanganda socket ni qayta ulash shart emas, lekin muddati tugagan token bilan qayta ulanish (reconnect) rad etiladi - reconnect dan oldin `auth.token` ni yangilang.
- `session.terminated` faqat shu sessiya xonasiga (`session:<sid>`) keladi; `security.alert` va `notification` foydalanuvchining barcha qurilmalariga.

## Xatolarni qayta ishlash

Barcha xatolar bitta formatda:

```json
{ "statusCode": 401, "message": "AUTH_SESSION_REVOKED", "details": null, "path": "/api/mobile/me", "timestamp": "2025-10-07T05:40:00.000Z" }
```

Validatsiya xatosida `message: "VALIDATION_FAILED"` va `details: ["login must be longer than or equal to 3 characters", ...]`.

| HTTP | `message` | Ilova harakati |
|---|---|---|
| 401 | `AUTH_INVALID_CREDENTIALS` | Login ekranida "login yoki parol noto'g'ri" |
| 401 | `AUTH_ACCOUNT_INACTIVE` | Hisob bloklangan/ishdan bo'shatilgan; tokenlarni o'chirish |
| 401 | `AUTH_SESSION_REVOKED` | Sessiya yopilgan (boshqa qurilmadan, admin, parol o'zgarishi); refresh urinmang, login ekraniga |
| 401 | `AUTH_REFRESH_INVALID` | Refresh yaroqsiz yoki qayta ishlatilgan; login ekraniga |
| 401 | `Unauthorized` (passport, token muddati tugagan yoki imzo noto'g'ri) | Refresh qiling, keyin so'rovni takrorlang |
| 400 | `AUTH_PASSWORD_MISMATCH` | Joriy parol noto'g'ri |
| 400 | `VALIDATION_FAILED` | `details` ni formaga chiqaring |
| 403 | `ACCESS_FORBIDDEN_ROLE` / `ACCESS_FORBIDDEN_SCOPE` | Funksiya bu rol/bo'lim uchun yo'q; UI da yashiring |
| 404 | `*_NOT_FOUND` | Ob'ekt yo'q |
| 429 | `ThrottlerException: Too Many Requests` | Login: 10/min, umumiy: 300/min; kutib qayta urinish |
| 409 | `DATABASE_CONSTRAINT_VIOLATION` | Takroriy yozuv |

Tavsiya etilgan interceptor mantiqi:

```text
so'rov -> 401 va message ∈ {AUTH_SESSION_REVOKED, AUTH_ACCOUNT_INACTIVE} -> logout
       -> 401 (boshqa) va refresh hali urinilmagan -> refresh (mutex) -> takror
       -> refresh 401 -> logout
```

## Fayllar (foto, biriktirmalar)

File-service alohida xostda (`NUXT_PUBLIC_FILE_BASE`, masalan `https://files.example.uz`):

- Foto: `GET {FILE_BASE}/files/{photoFileId}/content` - tokensiz, 24 soat keshlanadi.
- Hujjat/pasport: `GET {FILE_BASE}/files/{id}/content` + `Authorization: Bearer` yoki `?token=<accessToken>`.
- Yuklash (DOCUMENT - barcha rollar): `POST {FILE_BASE}/files/upload`, `multipart/form-data`, maydonlar `file`, `category=DOCUMENT`, ixtiyoriy `ownerUserId`. Javob `{ id, originalName, mimeType, size, category, ownerUserId, url, createdAt }`; `id` ni `attachmentFileIds` ga qo'ying.
- Limit `MAX_FILE_SIZE_MB` (standart 10 MB). Xatolar: `FILE_TOO_LARGE`, `FILE_TYPE_NOT_ALLOWED`, `CATEGORY_NOT_ALLOWED_FOR_ROLE`, `MISSING_TOKEN`, `INVALID_TOKEN`, `FILE_ACCESS_DENIED`, `FILE_NOT_FOUND`.

## Sana va vaqt

Server `Asia/Tashkent` da ishlaydi. Sanalar `YYYY-MM-DD` satr (davomat, hisobot, kalendar), vaqt belgilari ISO 8601 UTC (`...Z`). Davomat faqat server bo'yicha "bugun" uchun qabul qilinadi - qurilma soati noto'g'ri bo'lsa `ATTENDANCE_PAST_DATE_FORBIDDEN` / `ATTENDANCE_FUTURE_DATE_FORBIDDEN` keladi; `date` ni yubormang, server o'zi bugunni oladi.
