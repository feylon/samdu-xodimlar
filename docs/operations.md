# Operator qo'llanmasi

Bu hujjat tizimni kundalik boshqaradigan odamlar (SUPERADMIN, HR, texnik administrator) uchun. Endpointlar `/api` prefiksisiz yozilgan; frontend sahifalari `/...` ko'rinishida. Barcha vaqtlar Asia/Tashkent.

## 1. Birinchi ishga tushirishdan keyin

1. http://localhost:3002 (yoki production domeni) -> `superadmin01 / superadmin01` (yoki `.env` dagi `SEED_*`).
2. `/profile` -> parolni o'zgartiring (`POST auth/change-password`). Bu boshqa barcha sessiyalarni yopadi.
3. `/settings/organization` (`PATCH organization`, faqat SUPERADMIN):
   - `name`, `description`, `primaryColor` (`#rrggbb`), `currency` (standart `UZS`);
   - logo: file-service ga `LOGO` kategoriyasida yuklang (faqat SUPERADMIN), qaytgan `id` ni `logoFileId` ga yozing;
   - `pointValue` (1 ball = so'm), `headTeamBonusRate` (%), `headPointShareRate` (%), `reportDeadlineHour` (0-23), `reportMaxPoints`.
4. Kalendar: joriy yil bayramlarini kiriting (3-bo'lim).
5. HR hisobini yarating (2-bo'lim).

## 2. Onboarding (rollar bo'yicha)

### 2.1 SUPERADMIN: HR yaratish

`/settings/users` -> "HR yaratish" (`POST users/hr`):

```json
{ "login": "hr.manager", "password": "Kuchli-parol-123", "fullName": "Karimova Nilufar", "phone": "+998901234567", "email": "hr@example.uz", "position": "HR menejer" }
```

Yaratilgan hisobda `mustChangePassword = true`; loginni va vaqtinchalik parolni HR ga xavfsiz kanal orqali bering. HR birinchi kirishda parolni almashtiradi.

### 2.2 HR: bo'limlar

`/departments` -> "Yangi bo'lim" (`POST departments`): `name`, `code` (`DEV`, `SALES` - katta harf, raqam, `_`, `-`), `description`, ixtiyoriy `headUserId`.

### 2.3 HR: xodimlar

`/employees` -> "Yangi xodim" (`POST employees`):

```json
{
  "login": "j.ergashev",
  "password": "Vaqtinchalik-parol-1",
  "fullName": "Ergashev Jamshid",
  "pinfl": "31234567890123",
  "phone": "+998901112233",
  "position": "Backend dasturchi",
  "baseSalary": 8000000,
  "hireDate": "2025-10-01",
  "assignments": [{ "departmentId": "<DEV id>", "rate": 100 }]
}
```

- Foto va pasport: avval file-service ga yuklang (`POST /files/upload`, `category=PHOTO|PASSPORT`, `ownerUserId=<xodim id>` - xodim yaratilgandan keyin `PATCH employees/:id` bilan `photoFileId` / `passportFileIds` ni yozing). PHOTO ochiq, PASSPORT faqat egasi/HR/SUPERADMIN ko'radi.
- Yuklamalar: 25/50/75/100, jami <= 100. Yarim stavka ikki bo'limda: `[{DEV, 50}, {QA, 50}]`.
- Xodim roli doim `EMPLOYEE`; `mustChangePassword = true`.

### 2.4 HR: bo'lim boshlig'ini tayinlash

`/departments/<id>` -> "Boshliq" (`PUT departments/:id/head { "userId": "<xodim id>" }`):

- xodim roli avtomatik `DEPARTMENT_HEAD` bo'ladi;
- bo'limga a'zo bo'lmasa va bo'sh stavkasi >= 25 % bo'lsa, qoldiq stavka bilan yuklama yaratiladi (masalan 100 % bo'sh bo'lsa 100 %, 40 % bo'sh bo'lsa 25 %);
- `{ "userId": null }` boshliqni olib tashlaydi; agar u boshqa bo'limni boshqarmasa, roli `EMPLOYEE` ga qaytadi.

Bitta odam bir nechta bo'limga boshliq bo'lishi mumkin (har biriga alohida `PUT`).

### 2.5 DEPARTMENT_HEAD: kundalik ish

| Vaqt | Harakat | Endpoint |
|---|---|---|
| Ish kuni boshida | `/attendance` -> bo'lim varag'i, har a'zo uchun `PRESENT`/`LATE`/`ABSENT`/`EXCUSED`/`REMOTE` | `GET attendance/today/:departmentId`, `POST attendance` yoki `POST attendance/bulk` |
| Kun davomida | Vazifa berish (`REGULAR` yoki `BONUS`, `maxPoints`, `dueDate`, `priority`) | `POST tasks` |
| Topshirilgan vazifalar | Tekshirish: `VERIFIED` (+ball) yoki `REJECTED` (izoh bilan) | `POST tasks/:id/verify` |
| Kun oxirida / ertasiga | Kunlik hisobotlarni baholash 1-5 | `GET reports/daily?unratedOnly=true`, `POST reports/daily/:id/rate` |
| Kerak bo'lganda | Qo'lda ball (+/-), bo'lim e'loni, so'rovnoma | `POST kpi/adjust`, `POST announcements`, `POST polls` |

Davomat faqat bugungi kun uchun kiritiladi. Kechagi davomat kiritilmagan bo'lsa, buni to'g'rilash yo'li yo'q (`ATTENDANCE_PAST_DATE_FORBIDDEN`); payroll da o'sha kun "kelmagan" hisoblanadi. Boshliqlar har kuni belgilashni unutmasligi kerak - HR `GET attendance?departmentId=&from=&to=` bilan bo'shliqlarni kuzatadi.

### 2.6 EMPLOYEE

- `/` dashboard: ballar, davomat, vazifalar, bugungi hisobot holati, oxirgi ish haqi.
- `/tasks`: `IN_PROGRESS` -> `COMPLETED` yoki `PARTIALLY_COMPLETED`, izoh va biriktirma (`DOCUMENT` fayl).
- `/reports`: kun oxiri hisoboti (`content` >= 10 belgi, `completedTaskIds`, `attachmentFileIds`). Baholanmaguncha qayta yuborish mumkin.
- `/security`: sessiyalar, login tarixi, parol.

## 3. Kalendar va bayramlar

`/calendar` (HR, SUPERADMIN). Standart: Du-Ju ish kuni, Sha-Ya dam. Faqat farqlar kiritiladi:

```json
POST calendar/days/bulk
{ "days": [
  { "date": "2025-01-01", "type": "HOLIDAY", "title": "Yangi yil" },
  { "date": "2025-03-08", "type": "HOLIDAY", "title": "Xotin-qizlar kuni" },
  { "date": "2025-03-21", "type": "HOLIDAY", "title": "Navro'z" },
  { "date": "2025-03-14", "type": "WORKING", "title": "Ko'chirilgan ish kuni" },
  { "date": "2025-03-23", "type": "NON_WORKING", "title": "Ko'chirilgan dam olish" }
] }
```

- `HOLIDAY`, `NON_WORKING`, `WEEKEND` - ish kuni emas; `WORKING` - shanba/yakshanbani ish kuni qilish uchun.
- `DELETE calendar/days/2025-03-14` override ni olib tashlaydi (standart qoidaga qaytadi).
- Ish kunlari soni payroll (`workingDays`), davomat xulosasi va hisobot eslatmasi (`isWorkingDay`) ga ta'sir qiladi. Yil boshida yoki hukumat qarori chiqishi bilan kiriting - payroll hisoblangandan keyin kalendar o'zgarsa, `CALCULATED` yozuvlarni qayta hisoblash kerak.

## 4. Oylik ish haqi sikli (HR)

Oy tugagach, masalan noyabrning 1-3 kunlarida oktyabr uchun:

1. **Tekshirish**
   - `GET attendance?from=2025-10-01&to=2025-10-31&status=ABSENT` - shubhali yo'qliklar.
   - `GET reports/daily?from=...&to=...&unratedOnly=true` - baholanmagan hisobotlar (baholanmagan hisobot ball bermaydi). Boshliqlarga eslatma yuboring.
   - `GET tasks?status=COMPLETED` va `PARTIALLY_COMPLETED` - tasdiqlanmagan vazifalar (ball faqat `VERIFIED` da).
   - Kalendar: oktyabr bayramlari kiritilganmi (`GET calendar?year=2025&month=10`).
   - Yangi xodimlar `hireDate`, ketganlar `TERMINATED` (ular hisobga kirmaydi).
2. **KPI snapshot** - 1-kun 00:05 da avtomatik. Kech kiritilgan ball/baho bo'lsa qo'lda yangilash: `POST kpi/snapshot?year=2025&month=10` (upsert, xavfsiz).
3. **Hisoblash**: `/payroll` -> "Hisoblash" (`POST payroll/calculate`):

```json
{ "year": 2025, "month": 10 }
```

   Ixtiyoriy `departmentId` yoki `userIds` bilan qismlarga bo'lib. Javob: `{ calculated, skippedPaid, records[] }`. Har xodimga `PAYROLL_STATUS` bildirishnomasi ketadi ("Ish haqi hisoblandi").
4. **Ko'rib chiqish**: `GET payroll?year=2025&month=10` - `breakdown` dagi `presentDays/workingDays`, `taskPoints`, `reportPoints`, `teamPerformanceRatio` ni tekshiring. Xato bo'lsa manbani to'g'rilang (davomat faqat bugun uchun, shuning uchun o'tgan oy yo'qligi `kpi/adjust` orqali ball bilan kompensatsiya qilinishi mumkin) va qayta `calculate` - `CALCULATED` yozuvlar qayta yoziladi, `PAID` lar o'tkazib yuboriladi.
5. **To'lov**: har yozuv uchun `PATCH payroll/:id/status { "status": "PAID", "note": "To'lov varaqasi 123" }`. Xodimga "Ish haqi to'landi" bildirishnomasi. `PAID` yozuv o'zgarmas (`PAYROLL_IMMUTABLE_PAID`); xato bo'lsa keyingi oyda `kpi/adjust` yoki alohida hujjat bilan to'g'rilanadi.
6. **Eksport**: `/payroll` jadvalidan Excel/PDF (6-bo'lim) - buxgalteriya uchun.

Formula va koeffitsientlar: [roles.md](roles.md) "Ish haqi". Koeffitsientlar (`pointValue`, `headTeamBonusRate`, `headPointShareRate`) hisoblash paytidagi qiymat bilan olinadi va `breakdown` ga yoziladi.

## 5. KPI oy almashinuvi

- Ballar `point_transactions.year/month` ga bog'liq: vazifa tasdiqlangan oy, hisobot sanasining oyi, qo'lda tuzatish - joriy oy.
- 1-kun 00:05 cron o'tgan oyni `monthly_kpi_summaries` ga yozadi; `GET kpi/me` dagi `history` oxirgi 12 oyni ko'rsatadi.
- Joriy oy leaderboard i noldan boshlanadi - bu normal.
- Oy boshida o'tgan oyga tegishli tuzatish kerak bo'lsa: `POST kpi/adjust` faqat joriy oyga yozadi (year/month ni tanlash yo'q). O'tgan oy ballini payroll gacha tuzatish uchun: payroll hisoblashdan oldin tuzatishni joriy oyga yozib, izohda ko'rsating, yoki hisobotni kech baholang (hisobot balli o'z sanasining oyiga tushadi).

## 6. Hisobot eslatmalari

- `organization_settings.reportDeadlineHour` (standart 17) - shu soatda (`HH:00`) cron ish kunida hisobot yubormagan `ACTIVE` xodimlarga (faol yuklamasi borlarga) `REPORT_MISSING` bildirishnomasi yuboradi.
- O'zgartirish: `PATCH organization { "reportDeadlineHour": 18 }` - keyingi soatdan kuchga kiradi, qayta ishga tushirish shart emas.
- `.env` dagi `REPORT_REMINDER_HOUR` faqat birinchi seed paytida boshlang'ich qiymat sifatida ishlatiladi; keyinchalik soat tashkilot sozlamalari (`reportDeadlineHour`) orqali boshqariladi.
- Bugun kim yubormagan: `GET reports/daily/missing?departmentId=<id>` (boshliq `departmentId` siz o'z bo'limlarini oladi).

## 7. Bloklangan va ishdan ketgan xodimlar

`/employees/<id>` -> "Holat" (`PATCH employees/:id/status`):

| Holat | Qachon | Natija |
|---|---|---|
| `FROZEN` | Vaqtincha to'xtatish | Kirish mumkin, `STATUS_CHANGED` bildirishnoma |
| `VACATION` | Ta'til (`startDate`, `endDate`) | Kirish mumkin; davomat belgilansa payroll ga ta'sir qiladi (ta'til kunlarini `EXCUSED` deb belgilash kelmagan hisoblanadi) |
| `SICK_LEAVE` | Kasallik, `medicalReason` majburiy | Kirish mumkin |
| `BLOCKED` | Xavfsizlik hodisasi, shubhali faollik | Barcha sessiyalar darhol bekor, login `AUTH_ACCOUNT_INACTIVE`; payroll dan chiqariladi; yuklamalar saqlanadi |
| `TERMINATED` | Ishdan bo'shatish (`startDate` = oxirgi kun, `reason`) | Sessiyalar bekor, barcha yuklamalar yopiladi, `terminatedAt`; `TERMINATED` dan faqat `ACTIVE` ga qaytish mumkin |

Qayta tiklash: `{ "status": "ACTIVE" }`. `TERMINATED` dan qaytganda yuklamalar avtomatik tiklanmaydi - `PUT employees/:id/assignments` bilan qayta bering. Bo'lim boshlig'i ketganda avval `PUT departments/:id/head` bilan yangi boshliq tayinlang (aks holda bo'lim boshliqsiz qoladi, davomat va vazifalar kiritilmaydi).

Tarix: `GET employees/:id/status-history`.

## 8. Login va parolni tiklash

- **Xodim parolini unutdi**: SUPERADMIN `/settings/users` -> foydalanuvchini qidirish (`GET users/lookup?query=<login|F.I.Sh.|PINFL|id>`) -> "Hisob ma'lumotlari" (`PATCH users/:id/credentials`):

```json
{ "password": "Yangi-vaqtinchalik-1", "mustChangePassword": true, "terminateSessions": true }
```

  Barcha sessiyalar `CREDENTIALS_RESET_BY_ADMIN` bilan yopiladi, javobda `terminatedSessions`. Loginni ham o'zgartirish mumkin (`"login": "yangi.login"`).
- **HR yo'q yoki parolini unutdi**: faqat SUPERADMIN tiklaydi (HR o'zini yoki boshqa HR ni tiklay olmaydi).
- **SUPERADMIN parolini unutdi**: boshqa SUPERADMIN yo'q bo'lsa, bazada hashni almashtirish kerak. Yangi hash olish uchun backend konteynerida:

```bash
docker compose exec backend node -e "
require('argon2').hash('YangiParol123', { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 }).then(console.log)"
docker compose exec postgres psql -U hrms -d hrms -c "UPDATE users SET \"passwordHash\" = '<hash>' WHERE login = 'superadmin01';"
docker compose exec mongo mongosh hrms --eval 'db.sessions.updateMany({ revokedAt: null }, { $set: { revokedAt: new Date(), revokedReason: "MANUAL_RESET" } })'
```

  (`type: 2` = argon2id.) Seed ni qayta ishga tushirish yordam bermaydi - mavjud hisobni o'zgartirmaydi.
- **Shubhali kirish**: foydalanuvchi `/security` da sessiyani yakunlaydi va parolini o'zgartiradi; SUPERADMIN `GET audit/sessions?userId=` bilan ko'radi va zarur bo'lsa `BLOCKED` qiladi.

## 9. Audit loglarini o'qish

`/audit` (SUPERADMIN):

| Savol | So'rov |
|---|---|
| Xodim X nima qilgan | `GET audit/logs?userId=<id>&from=2025-10-01&to=2025-10-07` |
| Kim payroll ni PAID qildi | `GET audit/logs?action=Payroll.updateStatus` |
| Xodim Y ning holatini kim o'zgartirdi | `GET audit/logs?entity=Employees&entityId=<Y id>&method=PATCH` |
| Xatolar | `GET audit/logs?onlyErrors=true` |
| Muvaffaqiyatsiz loginlar | `GET audit/login-history?success=false` |
| Hozir kim tizimda | `GET audit/sessions` (`client=MOBILE` filtri bilan) |

`payload` da parollar `[REDACTED]`. `GET` so'rovlar va eksportlar audit ga tushmaydi.

## 10. Eksport (Excel / PDF)

Har bir jadvalda (xodimlar, davomat, vazifalar, KPI, ish haqi, audit) "Excel" va "PDF" tugmalari. Frontend joriy filtrlangan ko'rinishni `POST export/excel` yoki `POST export/pdf` ga yuboradi:

```json
{
  "title": "Ish haqi 2025-10",
  "subtitle": "Bo'lim: DEV",
  "columns": [
    { "key": "fullName", "label": "F.I.Sh." },
    { "key": "totalAmount", "label": "Jami", "type": "number" },
    { "key": "status", "label": "Holat" },
    { "key": "paidAt", "label": "To'langan", "type": "datetime" }
  ],
  "rows": [ { "fullName": "Ergashev J.", "totalAmount": 8120000, "status": "PAID", "paidAt": "2025-11-05T09:12:00Z" } ],
  "locale": "uz",
  "orientation": "landscape"
}
```

- Excel: 1-qator `<Tashkilot> - <title>`, 2-qator `Yaratilgan vaqt: <DD.MM.YYYY HH:mm:ss> · Yaratuvchi: <F.I.Sh.> · Qatorlar soni: N · <subtitle>`, 4-qator sarlavha (muzlatilgan, autofilter), footer da sahifa raqami.
- PDF: A4, sarlavhada tashkilot nomi va vaqt, fon watermark da vaqt, footer da yaratuvchi va `Sahifa X / Y`; Roboto shrifti kirill va lotinni qo'llaydi (`locale: ru` da yorliqlar ruscha).
- Limitlar: 40 ustun, 10 000 qator. Fayl nomi `<title>_<DD-MM-YYYY-HH-mm-ss>.xlsx|pdf`.
- `type`: `number`, `boolean` (Ha/Yo'q), `date` (`DD.MM.YYYY`), `datetime`, standart `string`.

## 11. Backup

Kundalik: `pg_dump` (PostgreSQL), `mongodump` (`hrms`, `hrms_files`), `file_uploads` volume (yoki S3). Buyruqlar: [docker.md](docker.md) "Backup va restore". Payroll `PAID` qilishdan oldin va migratsiya deploy qilishdan oldin qo'shimcha backup oling.

## 12. Loglar va monitoring

```bash
docker compose ps                              # health holati
docker compose logs -f --tail=200 backend      # Nest loglari: Bootstrap, Cron (KpiService, DailyReportsService), xatolar
docker compose logs -f file-service
curl -s localhost:3000/api/health              # {"status":"ok","postgres":"up","mongo":"up"}
curl -s localhost:3001/health                  # {"status":"ok","storage":"local"}
```

Kuzatish kerak bo'lgan log satrlari:

| Satr | Ma'nosi |
|---|---|
| `Monthly KPI snapshot for YYYY-M created for N users` | Oylik snapshot bajarildi |
| `Report reminders sent to N employees for YYYY-MM-DD` | Eslatma yuborildi |
| `Migration failed:` / `Seed failed:` | Konteyner ishga tushmaydi, [docker.md](docker.md) "Muammolar" |
| `HttpExceptionFilter ... QueryFailedError` (warn) | Baza cheklovi buzildi (409) |
| `Failed to remove <key> from storage` (file-service warn) | Fayl diskdan o'chmagan, metadata soft-deleted |

SUPERADMIN dashboard (`GET dashboard`) `security` blokida: faol sessiyalar, 24 soatdagi loginlar, muvaffaqiyatsiz loginlar, 24 soatdagi audit yozuvlari, eng ko'p o'zgartirilgan entity lar.
