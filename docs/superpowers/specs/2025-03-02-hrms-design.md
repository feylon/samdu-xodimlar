# Xodimlar HRMS — Dizayn spetsifikatsiyasi

## Maqsad

Tashkilot xodimlarini boshqarish tizimi (HRMS): onboarding, bo'limlar va ish yuklamasi,
davomat, vazifalar va KPI, kunlik hisobotlar, oylik ish haqi, e'lonlar va so'rovnomalar,
xavfsizlik (sessiyalar, login tarixi, audit). To'rt rol: SUPERADMIN, HR, DEPARTMENT_HEAD, EMPLOYEE.

## Qabul qilingan qarorlar

| Mavzu | Qaror |
|---|---|
| Backend | NestJS 11, TypeScript 5, TypeORM 0.3 (PostgreSQL 16), Mongoose 8 (MongoDB 7) |
| Frontend | Nuxt 3.21 (SPA rejimi), Vue 3, Pinia, TailwindCSS, @nuxtjs/i18n (uz, ru), Chart.js |
| Fayl xizmati | Alohida NestJS mikroservis `file-service`, lokal disk yoki S3 drayveri, metadata MongoDB |
| Autentifikatsiya | JWT access (15 daqiqa) + refresh (30 kun), Argon2id, sessiyalar MongoDB da |
| Migratsiyalar | `backend/src/database/migrations`, `synchronize=false`, konteyner ishga tushganda avtomatik `runMigrations` |
| Seeder | `backend/src/database/seed.ts` — tashkilot sozlamalari va `superadmin01 / superadmin01` |
| Vaqt zonasi | Asia/Tashkent, "bugun" shu zona bo'yicha hisoblanadi |
| Eksport | Backend `POST /api/export/excel` va `/api/export/pdf`; sarlavhada avtomatik yaratilgan vaqt |
| Mobil API | `/api/mobile/*` alohida Swagger tegi "Mobile App Operations" |
| Kod uslubi | Manba kodida izohlar yo'q; nomlash orqali o'z-o'zini hujjatlovchi kod |

## Komponentlar

### backend (port 3000)
Modullar: `config`, `database`, `common` (guards, decorators, interceptors, filters),
`auth`, `sessions`, `users`, `organization`, `departments`, `calendar`, `attendance`,
`tasks`, `kpi`, `daily-reports`, `payroll`, `announcements`, `polls`, `notifications`
(REST + Socket.IO), `audit`, `dashboard`, `export`, `mobile`.

PostgreSQL jadvallari: users, organization_settings, departments, department_assignments,
employee_status_history, calendar_days, attendance_records, tasks, point_transactions,
monthly_kpi_summaries, payroll_records, announcements.

MongoDB kolleksiyalari: sessions, login_history, audit_logs, daily_reports, polls, notifications.

### file-service (port 3001)
`POST /files/upload` (multipart, kategoriya: PHOTO, PASSPORT, LOGO, DOCUMENT),
`GET /files/:id`, `GET /files/:id/content`, `DELETE /files/:id`, `GET /health`.
JWT backend bilan umumiy maxfiy kalit orqali tekshiriladi. PHOTO va LOGO ochiq,
PASSPORT va DOCUMENT faqat egasi, HR yoki SUPERADMIN uchun.

### frontend (port 3002)
Rolga mos dashboardlar, xodimlar, bo'limlar, davomat, vazifalar, hisobotlar, KPI,
ish haqi, kalendar, e'lonlar, so'rovnomalar, bildirishnomalar, xavfsizlik (sessiyalar),
audit (superadmin), tashkilot sozlamalari (superadmin), profil.
Standart `DataTable` komponenti: saralash, ko'p mezonli filtr, Excel/PDF eksport tugmalari.

## Asosiy biznes qoidalar

- Bir xodimning faol yuklamalar yig'indisi 100% dan oshmaydi (25/50/75/100 qadam 25).
- Davomat faqat joriy sana uchun kiritiladi; o'tgan sana server tomonidan rad etiladi.
- Ballar oy bo'yicha hisoblanadi; har oyning 1-kuni cron o'tgan oyni `monthly_kpi_summaries` ga yozadi.
- Ish haqi: `baza * yuklama * davomat_nisbati + (ballar * ball_qiymati)`;
  bo'lim boshlig'i uchun qo'shimcha jamoa samaradorligi bonusi. `PAID` holatidagi yozuv o'zgarmas.
- Kunlik hisobot yuborilmagan bo'lsa, belgilangan soatda in-app bildirishnoma yuboriladi.
- Yangi login har safar xavfsizlik bildirishnomasini (REST + Socket.IO) hosil qiladi.
- SUPERADMIN oddiy xodim yaratmaydi; HR yaratadi. HR ma'lumotini faqat SUPERADMIN tahrirlaydi.
- Foydalanuvchi faqat o'z parolini o'zgartira oladi.
