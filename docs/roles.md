# Rollar, ruxsatlar va biznes qoidalar

Rollar (`UserRole`): `SUPERADMIN`, `HR`, `DEPARTMENT_HEAD`, `EMPLOYEE`. Ruxsat ikki qatlamda tekshiriladi:

1. `RolesGuard` - endpointdagi `@Roles(...)` dekoratori. Mos kelmasa `403 ACCESS_FORBIDDEN_ROLE`.
2. Scope (ko'rinish doirasi) - `DepartmentScopeService` va servislar ichida. Mos kelmasa `403 ACCESS_FORBIDDEN_SCOPE`.

Scope qoidalari (`department-scope.service.ts`):

- SUPERADMIN va HR: barcha bo'limlar va barcha foydalanuvchilar.
- DEPARTMENT_HEAD: `departments.headUserId = o'zi` bo'lgan faol bo'limlar ("boshqaradigan bo'limlar") va ularning faol a'zolari; qo'shimcha o'zi a'zo bo'lgan bo'limlarni ko'radi.
- EMPLOYEE: faqat o'zi a'zo bo'lgan bo'limlar (faol yuklamalar) va o'z ma'lumotlari.
- `assertCanViewUser`: o'zini har kim ko'ra oladi; boshqasini SUPERADMIN/HR yoki uni boshqaradigan boshliq.
- `primaryDepartmentId`: eng yuqori `rate` li (teng bo'lsa eng eski) faol yuklama bo'limi.

## Ruxsatlar matritsasi

Belgilar: `+` to'liq, `S` scope ichida (o'z bo'limi / o'zi), `-` yo'q. Endpoint manzillari `/api` prefiksisiz.

### Foydalanuvchilar va xodimlar

| Funksiya | SUPERADMIN | HR | DEPARTMENT_HEAD | EMPLOYEE |
|---|---|---|---|---|
| HR hisobi yaratish (`POST users/hr`) | + | - | - | - |
| Barcha foydalanuvchilar ro'yxati, lookup (`GET users`, `GET users/lookup`) | + | - | - | - |
| Istalgan foydalanuvchini tahrirlash, shu jumladan HR (`PATCH users/:id`) | + | - | - | - |
| Login/parolni tiklash (`PATCH users/:id/credentials`) | + | - | - | - |
| Xodim yaratish (`POST employees`) | - | + | - | - |
| Xodimlar ro'yxati (`GET employees`) | + | + | S (boshqaradigan bo'limlar) | - |
| Xodim kartasi, holat tarixi (`GET employees/:id`, `/status-history`) | + | + | S | - (o'zi: `GET auth/me`) |
| Xodim ma'lumotini tahrirlash (`PATCH employees/:id`) | + | + (HR va SUPERADMIN hisoblaridan tashqari) | - | - |
| Holatni o'zgartirish (`PATCH employees/:id/status`) | + | + (xodimlar uchun) | - | - |
| Yuklamalarni belgilash (`PUT employees/:id/assignments`) | + | + | - | - |
| Transfer (`POST employees/:id/transfer`) | + | + | - | - |
| O'z parolini o'zgartirish (`POST auth/change-password`) | + | + | + | + |
| O'z sessiyalari va login tarixi (`GET auth/sessions`, `DELETE auth/sessions/*`, `GET auth/login-history`) | + | + | + | + |

### Bo'limlar

| Funksiya | SUPERADMIN | HR | DEPARTMENT_HEAD | EMPLOYEE |
|---|---|---|---|---|
| Ro'yxat (`GET departments`) | + | + | S (boshqaradigan + a'zo) | S (a'zo) |
| Bo'lim va a'zolari (`GET departments/:id`) | + | + | S | S |
| Yaratish, tahrirlash (`POST`, `PATCH departments/:id`) | + | + | - | - |
| Boshliq tayinlash/olib tashlash (`PUT departments/:id/head`) | + | + | - | - |

### Kalendar va davomat

| Funksiya | SUPERADMIN | HR | DEPARTMENT_HEAD | EMPLOYEE |
|---|---|---|---|---|
| Oy kalendarini ko'rish (`GET calendar`) | + | + | + | + |
| Kun turini belgilash (`PUT calendar/days`, `POST calendar/days/bulk`, `DELETE calendar/days/:date`) | + | + | - | - |
| Davomat belgilash (`POST attendance`, `POST attendance/bulk`) | - | - | S (o'z bo'limi a'zolari, faqat bugun) | - |
| Davomat ro'yxati (`GET attendance`) | + | + | S (boshqaradigan bo'limlar) | S (o'zi) |
| Bugungi varaq (`GET attendance/today/:departmentId`) | + | + | S | S (a'zo bo'lgan bo'lim) |
| O'z oylik xulosasi (`GET attendance/me`) | + | + | + | + |
| Xodim oylik xulosasi (`GET attendance/users/:userId/summary`) | + | + | S | - |

### Vazifalar va KPI

| Funksiya | SUPERADMIN | HR | DEPARTMENT_HEAD | EMPLOYEE |
|---|---|---|---|---|
| Vazifalar ro'yxati (`GET tasks`) | + | + | S (o'z vazifalari + boshqaradigan bo'limlar) | S (o'z vazifalari) |
| Vazifa tafsiloti (`GET tasks/:id`) | + | + | S (bo'limni ko'ra olsa) | S (ijrochi yoki shu bo'lim a'zosi) |
| Vazifa yaratish, tahrirlash, o'chirish (`POST`, `PATCH`, `DELETE tasks/:id`) | - | - | S (o'z bo'limi) | - |
| Holatni topshirish (`PATCH tasks/:id/status`) | - | - | S (agar o'zi ijrochi) | S (faqat ijrochi) |
| Tasdiqlash / rad etish (`POST tasks/:id/verify`) | - | - | S | - |
| O'z KPI (`GET kpi/me`) | + | + | + | + |
| Leaderboard (`GET kpi/leaderboard`) | + (hamma) | + (hamma) | S (boshqaradigan a'zolar) | S (o'z bo'limlari a'zolari) |
| Bo'lim KPI (`GET kpi/departments/:id`) | + | + | S | S (a'zo) |
| Xodim KPI (`GET kpi/users/:userId`) | + | + | S | - |
| Ballni qo'lda tuzatish (`POST kpi/adjust`) | - | + | S | - |
| Oylik snapshot ni majburlash (`POST kpi/snapshot`) | + | + | - | - |

### Kunlik hisobotlar

| Funksiya | SUPERADMIN | HR | DEPARTMENT_HEAD | EMPLOYEE |
|---|---|---|---|---|
| Hisobot yuborish (`POST reports/daily`) | - (faol yuklama yo'q) | - (faol yuklama yo'q) | + (yuklamasi bo'lsa) | + |
| O'z hisobotlari (`GET reports/daily/today`, `/me`) | + | + | + | + |
| Hisobotlar ro'yxati (`GET reports/daily`) | + | + | S (boshqaradigan bo'limlar) | S (o'zi) |
| Hisobot tafsiloti (`GET reports/daily/:id`) | + | + | S | S (o'zi yoki o'z bo'limi) |
| Yubormaganlar (`GET reports/daily/missing`) | + (`departmentId` bilan) | + (`departmentId` bilan) | S | - |
| Baholash (`POST reports/daily/:id/rate`) | - | - | S | - |

### Ish haqi

| Funksiya | SUPERADMIN | HR | DEPARTMENT_HEAD | EMPLOYEE |
|---|---|---|---|---|
| Hisoblash (`POST payroll/calculate`) | - | + | - | - |
| PAID ga o'tkazish (`PATCH payroll/:id/status`) | - | + | - | - |
| Ro'yxat (`GET payroll`) | + | + | S (boshqaradigan a'zolar + o'zi) | S (o'zi) |
| O'z tarixi (`GET payroll/me`) | + | + | + | + |
| Yozuv tafsiloti (`GET payroll/:id`) | + | + | S | S (o'zi) |

### E'lonlar, so'rovnomalar, bildirishnomalar

| Funksiya | SUPERADMIN | HR | DEPARTMENT_HEAD | EMPLOYEE |
|---|---|---|---|---|
| E'lonlar ro'yxati (`GET announcements`) | + | + | S (umumiy + ko'rinadigan bo'limlar) | S |
| E'lon yaratish (`POST announcements`) | + (umumiy yoki bo'lim) | + | S (faqat o'z bo'limi; `departmentId` siz -> FORBIDDEN_SCOPE) | - |
| E'lon tahrirlash/o'chirish | + | + | S (o'zi yaratgan yoki o'z bo'limi) | - |
| So'rovnomalar ro'yxati, ovoz berish (`GET polls`, `POST polls/:id/vote`) | + | + | S | S |
| So'rovnoma yaratish (`POST polls`) | + | + | S (faqat o'z bo'limi) | - |
| So'rovnomani yopish/o'chirish | + | + | S (o'zi yaratgan yoki o'z bo'limi) | - |
| Natijalarni ko'rish | + | + | + (barcha ko'rinadigan so'rovnomalar) | yopilgandan keyin yoki ovoz bergandan keyin (faqat sonlar) |
| Bildirishnomalar (`GET notifications`, `unread-count`, `PATCH :id/read`, `POST read-all`) | + | + | + | + (faqat o'ziniki) |

### Tashkilot, audit, eksport, dashboard

| Funksiya | SUPERADMIN | HR | DEPARTMENT_HEAD | EMPLOYEE |
|---|---|---|---|---|
| Ommaviy brending (`GET organization/public`) | public | public | public | public |
| To'liq sozlamalar (`GET organization`) | + | + | + | + |
| Sozlamalarni o'zgartirish (`PATCH organization`) | + | - | - | - |
| Audit loglari, login tarixi, sessiyalar (`GET audit/logs`, `audit/login-history`, `audit/sessions`) | + | - | - | - |
| Excel/PDF eksport (`POST export/excel`, `export/pdf`) | + | + | + | + (o'zi ko'ra oladigan ma'lumot bilan) |
| Dashboard (`GET dashboard`) | + (tashkilot + xavfsizlik) | + (tashkilot + hisobotlar + top-5) | S (jamoa) | S (o'zi) |
| Mobil endpointlar (`/mobile/*`) | + | + | + | + |

### File-service

| Funksiya | SUPERADMIN | HR | DEPARTMENT_HEAD | EMPLOYEE |
|---|---|---|---|---|
| LOGO yuklash | + | - | - | - |
| PHOTO, PASSPORT yuklash | + | + | - | - |
| DOCUMENT yuklash | + | + | + | + |
| PHOTO, LOGO ko'rish | public | public | public | public |
| PASSPORT, DOCUMENT ko'rish | + | + | S (egasi `ownerUserId` yoki yuklagan) | S (egasi yoki yuklagan) |
| Fayllar ro'yxati, o'chirish (`GET files`, `DELETE files/:id`) | + | + | - | - |

## Rol o'tishlari

- HR ni faqat SUPERADMIN yaratadi (`POST /api/users/hr`); `mustChangePassword = true`.
- Xodimni faqat HR yaratadi (`POST /api/employees`), rol doim `EMPLOYEE`. SUPERADMIN uchun bu endpoint yo'q.
- `PUT /api/departments/:id/head` da `EMPLOYEE` roli avtomatik `DEPARTMENT_HEAD` ga ko'tariladi. Agar boshliq bo'limga a'zo bo'lmasa va bo'sh yuklamasi >= 25 % bo'lsa, qoldiq (25 ga karrali) bilan avtomatik yuklama yaratiladi.
- Avvalgi boshliq boshqa hech qanday faol bo'limni boshqarmasa, roli `EMPLOYEE` ga qaytariladi.
- HR va SUPERADMIN ma'lumotini faqat SUPERADMIN tahrirlaydi (`USER_HR_EDIT_ONLY_SUPERADMIN`).

## Biznes qoidalar va xato kodlari

Xato javobi: `{ statusCode, message: <kod>, details?, path, timestamp }`. Validatsiya xatosi: `400 VALIDATION_FAILED`, `details` massivida class-validator xabarlari. Baza unique/FK buzilishi: `409 DATABASE_CONSTRAINT_VIOLATION`.

### Hisoblar va holatlar

| Qoida | Xato kodi | HTTP |
|---|---|---|
| Login band (registrdan qat'i nazar) | `USER_LOGIN_TAKEN` | 409 |
| PINFL band | `USER_PINFL_TAKEN` | 409 |
| Login: 3-64 belgi, `[a-zA-Z0-9._-]`; parol: 8-128 belgi (yaratish/tiklash), yangi parol 8-128 | `VALIDATION_FAILED` | 400 |
| HR xodim bo'lmagan (HR/SUPERADMIN) hisobni tahrirlashga/holatini o'zgartirishga urinadi | `USER_HR_EDIT_ONLY_SUPERADMIN` | 403 |
| Holat o'zgarishi: yangi holat joriy bilan bir xil | `STATUS_INVALID_TRANSITION` | 400 |
| `TERMINATED` dan faqat `ACTIVE` ga qaytish mumkin | `STATUS_INVALID_TRANSITION` | 400 |
| `SICK_LEAVE` uchun `medicalReason` majburiy | `VALIDATION_FAILED` | 400 |
| `TERMINATED`: barcha faol yuklamalar yopiladi (`isActive=false`, `endDate=bugun`), `terminatedAt` to'ldiriladi, barcha sessiyalar bekor qilinadi | - | - |
| `BLOCKED`: barcha sessiyalar bekor qilinadi; login va refresh `AUTH_ACCOUNT_INACTIVE` | `AUTH_ACCOUNT_INACTIVE` | 401 |
| Boshqa holatlar (FROZEN, VACATION, SICK_LEAVE): kirish mumkin, `STATUS_CHANGED` bildirishnoma | - | - |

### Yuklamalar (department_assignments)

| Qoida | Xato kodi | HTTP |
|---|---|---|
| Ruxsat etilgan rate: 25, 50, 75, 100 | `VALIDATION_FAILED` | 400 |
| Faol yuklamalar yig'indisi <= 100 (yaratish, `PUT assignments`, transfer) | `ASSIGNMENT_RATE_EXCEEDS_100` | 400 |
| Bitta so'rovda bir bo'lim ikki marta | `VALIDATION_FAILED` | 400 |
| `PUT assignments` da maksimum 4 ta element | `VALIDATION_FAILED` | 400 |
| Bo'lim mavjud emas yoki nofaol | `DEPARTMENT_NOT_FOUND` | 404 |
| Transferda manba yuklama topilmadi | `ASSIGNMENT_NOT_FOUND` | 404 |
| Transfer: manba yopiladi, maqsad bo'limda mavjud yuklama bo'lsa rate qo'shiladi (`existing + rate`), status tarixiga yozuv | - | - |
| Bo'lim kodi band | `DEPARTMENT_CODE_TAKEN` | 409 |

### Davomat

| Qoida | Xato kodi | HTTP |
|---|---|---|
| `date` bugundan (Asia/Tashkent) oldin | `ATTENDANCE_PAST_DATE_FORBIDDEN` | 400 |
| `date` bugundan keyin | `ATTENDANCE_FUTURE_DATE_FORBIDDEN` | 400 |
| `date` berilmasa bugun olinadi | - | - |
| Belgilovchi bo'limni boshqarmaydi | `ACCESS_FORBIDDEN_SCOPE` | 403 |
| Xodim shu bo'limga faol a'zo emas | `ACCESS_FORBIDDEN_SCOPE` | 403 |
| Bir kunda bitta yozuv (`UNIQUE userId,date`); qayta belgilash yangilaydi | - | - |
| `PRESENT`, `LATE`, `REMOTE` = kelgan; `ABSENT`, `EXCUSED` = kelmagan | - | - |
| Oylik `attendanceRatio` (xulosa) = kelgan kunlar / o'tgan ish kunlari; payroll da esa / oydagi barcha ish kunlari | - | - |

### Kalendar

| Qoida | Xato kodi | HTTP |
|---|---|---|
| Standart: Du-Ju `WORKING`, Sha-Ya `WEEKEND` | - | - |
| `calendar_days` yozuvi standartni bekor qiladi (`HOLIDAY`, `NON_WORKING`, `WORKING`, `WEEKEND`) | - | - |
| Noto'g'ri sana | `CALENDAR_INVALID_DATE` | 400 |
| Bulk: maksimum 366 kun | `VALIDATION_FAILED` | 400 |

### Vazifalar

```text
ASSIGNED ──► IN_PROGRESS ──► COMPLETED ─────────► VERIFIED (ball)
    │             │     └──► PARTIALLY_COMPLETED ─► VERIFIED (ball) yoki REJECTED
    └─────────────┴──► COMPLETED / PARTIALLY_COMPLETED (to'g'ridan-to'g'ri ham mumkin)
REJECTED ──► IN_PROGRESS ──► ... (qayta ishlash)
```

| Qoida | Xato kodi | HTTP |
|---|---|---|
| Ijrochi faqat `IN_PROGRESS`, `COMPLETED`, `PARTIALLY_COMPLETED` holatlarini qo'ya oladi | `VALIDATION_FAILED` | 400 |
| `IN_PROGRESS` faqat `ASSIGNED`, `IN_PROGRESS`, `REJECTED` dan | `TASK_INVALID_TRANSITION` | 400 |
| Ijrochi bo'lmagan foydalanuvchi holat topshiradi | `ACCESS_FORBIDDEN_SCOPE` | 403 |
| `VERIFIED` vazifani tahrirlash, o'chirish, qayta topshirish, qayta tasdiqlash | `TASK_ALREADY_VERIFIED` | 400 |
| Tasdiqlash faqat `COMPLETED` yoki `PARTIALLY_COMPLETED` dan | `TASK_INVALID_TRANSITION` | 400 |
| Ijrochi bo'limga a'zo emas | `ACCESS_FORBIDDEN_SCOPE` | 403 |
| Ball: `COMPLETED` -> `maxPoints`, `PARTIALLY_COMPLETED` -> `floor(maxPoints / 2)`; boshliq `points` bilan o'zgartira oladi, lekin `maxPoints` dan oshmaydi | - | - |
| `points > 0` bo'lsa `point_transactions` yozuvi: `REGULAR` -> `TASK`, `BONUS` -> `BONUS_TASK`; oy = tasdiqlangan oy | - | - |
| `REJECTED`: ball berilmaydi, ijrochiga `TASK_VERIFIED` bildirishnoma ("qaytarildi") | - | - |
| Vazifa topilmadi | `TASK_NOT_FOUND` | 404 |

### Kunlik hisobotlar

| Qoida | Xato kodi | HTTP |
|---|---|---|
| Sana doim bugun; kuniga bitta hisobot (upsert), baholanmaguncha qayta yuborish mumkin | - | - |
| Baholangan hisobotni qayta yuborish | `REPORT_ALREADY_RATED` | 400 |
| Faol yuklamasi (asosiy bo'limi) yo'q foydalanuvchi yuboradi | `ACCESS_FORBIDDEN_SCOPE` | 403 |
| `content` 10-10000 belgi | `VALIDATION_FAILED` | 400 |
| Baho 1-5; ball = `round(rating / 5 x reportMaxPoints)` (standart `reportMaxPoints = 5`) | - | - |
| Qayta baholash | `REPORT_ALREADY_RATED` | 400 |
| Ball oyi = hisobot sanasining oyi (kechikib baholansa ham) | - | - |
| Eslatma: har soat `0 * * * *`; soat = `reportDeadlineHour`, bugun ish kuni, xodim `ACTIVE` va asosiy bo'limi bor, hisobot yo'q -> `REPORT_MISSING` | - | - |
| Hisobot topilmadi | `REPORT_NOT_FOUND` | 404 |

### KPI

| Qoida | Xato kodi | HTTP |
|---|---|---|
| Ballar `point_transactions.year/month` bo'yicha oylik; joriy oy noldan boshlanadi | - | - |
| Qo'lda tuzatish: -100..+100, sabab 3-500 belgi; `departmentId` = asosiy bo'lim | `VALIDATION_FAILED` | 400 |
| Tuzatuvchi xodimni boshqarmaydi (HR hamma uchun) | `ACCESS_FORBIDDEN_SCOPE` | 403 |
| Snapshot `0 5 0 1 * *`: o'tgan oy bo'yicha `monthly_kpi_summaries` (upsert) | - | - |

### Ish haqi

| Qoida | Xato kodi | HTTP |
|---|---|---|
| Hisoblash faqat `EMPLOYEE` va `DEPARTMENT_HEAD` rollari, `TERMINATED`/`BLOCKED` bo'lmaganlar, faol yuklamasi borlar uchun | - | - |
| `PAID` yozuv qayta hisoblashda o'tkazib yuboriladi (`skippedPaid`) | - | - |
| `PAID` yozuvni o'zgartirish | `PAYROLL_IMMUTABLE_PAID` | 400 |
| Status faqat `CALCULATED -> PAID` | `PAYROLL_INVALID_TRANSITION` | 400 |
| Yozuv topilmadi | `PAYROLL_NOT_FOUND` | 404 |
| Xodim boshqa xodim yozuvini so'raydi | `ACCESS_FORBIDDEN_SCOPE` | 403 |

Formula (`payroll.service.ts`, barcha summalar 2 xonagacha yaxlitlanadi):

```text
totalRate          = min(100, Σ faol yuklama rate) / 100
baseAmount         = baseSalary x totalRate
attendanceRatio    = min(1, presentDays / workingDays)            (workingDays = oydagi WORKING kunlar)
attendanceAmount   = baseAmount x attendanceRatio
pointsAmount       = (task + bonusTask + dailyReport + manual ballar) x pointValue

Bo'lim boshlig'i bo'lsa (departments.headUserId = userId, o'zi jamoadan chiqariladi):
  taskRatio            = jamoa VERIFIED vazifalar / jamoa barcha vazifalar (shu oyda yaratilgan)
  teamAttendance       = o'rtacha(min(1, a'zo presentDays / workingDays))
  teamPerformanceRatio = 0.6 x taskRatio + 0.4 x teamAttendance
  teamBonusAmount      = baseAmount x (headTeamBonusRate / 100) x teamPerformanceRatio
  teamPointsAmount     = Σ jamoa ballari x pointValue x (headPointShareRate / 100)

bonusAmount        = pointsAmount + teamBonusAmount + teamPointsAmount
deductionAmount    = 0
totalAmount        = attendanceAmount + bonusAmount
```

Standart koeffitsientlar (`organization_settings`): `pointValue = 10000`, `headTeamBonusRate = 20`, `headPointShareRate = 10`, `currency = UZS`.

### E'lonlar va so'rovnomalar

| Qoida | Xato kodi | HTTP |
|---|---|---|
| DEPARTMENT_HEAD `departmentId` siz (tashkilot miqyosida) yaratadi | `ACCESS_FORBIDDEN_SCOPE` | 403 |
| Bo'lim e'loni: bo'lim a'zolariga (muallifdan tashqari) `ANNOUNCEMENT` bildirishnoma; umumiy e'lon: barcha foydalanuvchilarga | - | - |
| Bo'lim so'rovnomasi: a'zolarga `POLL_CREATED`; umumiy so'rovnomada bildirishnoma yuborilmaydi | - | - |
| Yopilgan (`closedAt` yoki `closesAt < now`) so'rovnomaga ovoz | `POLL_CLOSED` | 400 |
| Mavjud bo'lmagan variant | `POLL_INVALID_OPTION` | 400 |
| Ikkinchi ovoz | `POLL_ALREADY_VOTED` | 400 |
| Variantlar 2-20, har biri 1-200 belgi | `VALIDATION_FAILED` | 400 |
| Topilmadi | `ANNOUNCEMENT_NOT_FOUND`, `POLL_NOT_FOUND` | 404 |

### Autentifikatsiya

| Qoida | Xato kodi | HTTP |
|---|---|---|
| Login yoki parol noto'g'ri | `AUTH_INVALID_CREDENTIALS` | 401 |
| Holat `TERMINATED` yoki `BLOCKED` | `AUTH_ACCOUNT_INACTIVE` | 401 |
| Sessiya bekor qilingan / muddati o'tgan / token turi noto'g'ri | `AUTH_SESSION_REVOKED` | 401 |
| Refresh token imzosi/muddati noto'g'ri yoki qayta ishlatilgan (sessiya bekor qilinadi) | `AUTH_REFRESH_INVALID` | 401 |
| Joriy parol noto'g'ri (parol almashtirishda) | `AUTH_PASSWORD_MISMATCH` | 400 |
| Login: 10 so'rov / 60 s (IP), umumiy 300 / 60 s | `ThrottlerException: Too Many Requests` | 429 |
| Sessiya topilmadi (boshqa sessiyani yakunlashda) | `SESSION_NOT_FOUND` | 404 |
| Bildirishnoma topilmadi | `NOTIFICATION_NOT_FOUND` | 404 |
| Foydalanuvchi topilmadi | `USER_NOT_FOUND` | 404 |

`ErrorCodes` da `USER_SUPERADMIN_CANNOT_CREATE_EMPLOYEE` ham e'lon qilingan, lekin hozirgi kodda ishlatilmaydi (SUPERADMIN uchun xodim yaratish endpointi umuman yo'q, `RolesGuard` `ACCESS_FORBIDDEN_ROLE` qaytaradi).
