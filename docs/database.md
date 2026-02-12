# Ma'lumotlar bazasi

Ikki baza: PostgreSQL (`hrms`, TypeORM, migratsiyalar) va MongoDB (`hrms` backend uchun, `hrms_files` file-service uchun, Mongoose). Barcha vaqt belgilari PostgreSQL da `timestamptz`, sanalar `date` (ISO `YYYY-MM-DD` satr sifatida ishlanadi). "Bugun" `Asia/Tashkent` bo'yicha hisoblanadi.

## PostgreSQL

Entity ro'yxati: `backend/src/database/entities.ts`. Migratsiya: `backend/src/database/migrations/1741600000000-InitialSchema.ts`. Migratsiya jurnali jadvali: `typeorm_migrations`. Barcha PK lar `uuid` (`uuid_generate_v4()`), `organization_settings` dan tashqari.

### Bog'lanishlar

```text
users 1───* department_assignments *───1 departments
users 1───* employee_status_history
users 1───* attendance_records *───1 departments
users 1───* tasks (assigneeId) *───1 departments
users 1───* point_transactions
users 1───* monthly_kpi_summaries
users 1───* payroll_records
departments 0..1───1 users (headUserId, ON DELETE SET NULL)
departments 1───* announcements (departmentId nullable = tashkilot miqyosi)
calendar_days, organization_settings  - mustaqil
```

FK larning deyarli hammasi `ON DELETE CASCADE` (foydalanuvchi o'chirilsa uning yozuvlari ham o'chadi). Tizimda foydalanuvchini o'chirish endpointi yo'q; holat `TERMINATED` ga o'tkaziladi.

### `users`

| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `login` | varchar(64) | unique indeks; tekshiruv `LOWER(login)` bo'yicha |
| `passwordHash` | varchar(255) | argon2id; `select: false`, javoblarda hech qachon qaytmaydi |
| `role` | enum `users_role_enum` | `SUPERADMIN`, `HR`, `DEPARTMENT_HEAD`, `EMPLOYEE`; standart `EMPLOYEE` |
| `fullName` | varchar(200) | |
| `pinfl` | varchar(14) null | JSHSHIR, 14 raqam; partial unique indeks `WHERE pinfl IS NOT NULL` |
| `phone` | varchar(32) null | |
| `email` | varchar(200) null | |
| `position` | varchar(200) null | |
| `baseSalary` | numeric(14,2) | standart 0 |
| `photoFileId` | varchar(64) null | file-service PHOTO id |
| `passportFileIds` | jsonb | string massivi, standart `[]`, maksimum 10 |
| `status` | enum `users_status_enum` | `ACTIVE`, `FROZEN`, `VACATION`, `SICK_LEAVE`, `TERMINATED`, `BLOCKED`; standart `ACTIVE` |
| `hireDate` | date null | |
| `terminatedAt` | date null | TERMINATED ga o'tganda to'ldiriladi, ACTIVE ga qaytganda null |
| `birthDate` | date null | |
| `address` | text null | |
| `mustChangePassword` | boolean | HR va xodim yaratilganda `true`; faqat belgi, backend buni majburlamaydi |
| `lastLoginAt` | timestamptz null | har muvaffaqiyatli loginda |
| `createdAt`, `updatedAt` | timestamptz | |

### `employee_status_history`

| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK users CASCADE, indeks | |
| `fromStatus`, `toStatus` | enum (EmployeeStatus) | transferda ikkalasi bir xil |
| `reason` | text null | |
| `medicalReason` | text null | SICK_LEAVE uchun majburiy |
| `startDate`, `endDate` | date null | |
| `changedBy` | uuid | aktor |
| `createdAt` | timestamptz | |

### `organization_settings`

Bitta qator, `id = 1` (smallint PK). Seed yoki `OrganizationService.get()` birinchi murojaatda yaratadi.

| Ustun | Tur | Standart | Izoh |
|---|---|---|---|
| `name` | varchar(200) | `Xodimlar HRMS` | eksport sarlavhasi, login ekrani |
| `description` | text null | | |
| `logoFileId` | varchar(64) null | | LOGO kategoriyali fayl |
| `primaryColor` | varchar(16) | `#1d4ed8` | frontend `--brand` |
| `currency` | varchar(8) | `UZS` | payroll yozuviga nusxalanadi |
| `pointValue` | numeric(14,2) | `10000` | 1 KPI ball = pul miqdori |
| `headTeamBonusRate` | numeric(5,2) | `20` | bo'lim boshlig'i jamoa bonusi, % |
| `headPointShareRate` | numeric(5,2) | `10` | jamoa ballaridan boshliq ulushi, % |
| `reportDeadlineHour` | smallint | `17` | eslatma cron soati (0-23) |
| `reportMaxPoints` | smallint | `5` | 5/5 baholangan hisobot uchun ball |
| `timezone` | varchar(64) | `Asia/Tashkent` | faqat ma'lumot (public API da qaytadi) |
| `createdAt`, `updatedAt` | timestamptz | | |

### `departments`

| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `name` | varchar(200) | |
| `code` | varchar(32) | unique; `^[A-Z0-9_-]+$`, 2-32 belgi |
| `description` | text null | |
| `headUserId` | uuid null FK users SET NULL | bo'lim boshlig'i |
| `isActive` | boolean | standart true; nofaol bo'lim yuklama berishda `DEPARTMENT_NOT_FOUND` |
| `createdAt`, `updatedAt` | timestamptz | |

### `department_assignments`

| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK users CASCADE, indeks | |
| `departmentId` | uuid FK departments CASCADE, indeks | |
| `rate` | smallint | 25, 50, 75 yoki 100; faol yozuvlar yig'indisi <= 100 (ilova darajasida) |
| `isActive` | boolean | standart true; o'chirilganda `false` + `endDate` |
| `startDate` | date | |
| `endDate` | date null | |
| `assignedBy` | uuid | aktor |
| `createdAt`, `updatedAt` | timestamptz | |

Kompozit indeks `(userId, departmentId, isActive)`. Bir foydalanuvchida bir bo'lim uchun bir vaqtda bitta faol yozuv bo'lishi ilova mantiqida ta'minlanadi (unique cheklov yo'q).

### `calendar_days`

| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `date` | date | unique |
| `type` | enum `calendar_days_type_enum` | `WORKING`, `WEEKEND`, `HOLIDAY`, `NON_WORKING` |
| `title` | varchar(200) null | masalan "Navro'z" |
| `createdBy` | uuid | |
| `createdAt`, `updatedAt` | timestamptz | |

Yozuv bo'lmasa standart qoida: dushanba-juma `WORKING`, shanba-yakshanba `WEEKEND`. Faqat `WORKING` turi ish kuni hisoblanadi.

### `attendance_records`

| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK users CASCADE, indeks | |
| `departmentId` | uuid FK departments CASCADE, indeks | |
| `date` | date, indeks | faqat bugun |
| `status` | enum `attendance_records_status_enum` | `PRESENT`, `LATE`, `ABSENT`, `EXCUSED`, `REMOTE` |
| `checkIn`, `checkOut` | time null | `HH:mm` |
| `note` | text null | |
| `markedBy` | uuid | bo'lim boshlig'i |
| `createdAt`, `updatedAt` | timestamptz | |

Unique `(userId, date)`: bir kunda bitta yozuv, qayta belgilash mavjud yozuvni yangilaydi. `PRESENT`, `LATE`, `REMOTE` "kelgan" deb hisoblanadi (`COUNTED_AS_PRESENT`).

### `tasks`

| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `title` | varchar(255) | |
| `description` | text null | |
| `assigneeId` | uuid FK users CASCADE, indeks | |
| `departmentId` | uuid FK departments CASCADE, indeks | |
| `createdBy` | uuid | bo'lim boshlig'i |
| `type` | enum `tasks_type_enum` | `REGULAR`, `BONUS` |
| `priority` | enum `tasks_priority_enum` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `status` | enum `tasks_status_enum`, indeks | `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `PARTIALLY_COMPLETED`, `VERIFIED`, `REJECTED` |
| `dueDate` | date null | |
| `maxPoints` | smallint | standart 10, 1-100 |
| `awardedPoints` | smallint null | VERIFIED da |
| `employeeComment`, `reviewComment` | text null | |
| `submittedAt` | timestamptz null | COMPLETED/PARTIALLY_COMPLETED ga o'tganda |
| `verifiedBy` | uuid null | |
| `verifiedAt` | timestamptz null | VERIFIED yoki REJECTED da |
| `attachmentFileIds` | jsonb | standart `[]`, maksimum 10 |
| `createdAt`, `updatedAt` | timestamptz | |

### `point_transactions`

| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK users CASCADE, indeks | |
| `departmentId` | uuid null | asosiy bo'lim yoki vazifa bo'limi |
| `points` | smallint | manfiy bo'lishi mumkin (MANUAL) |
| `source` | enum `point_transactions_source_enum` | `TASK`, `BONUS_TASK`, `DAILY_REPORT`, `MANUAL` |
| `referenceId` | varchar(64) null | task id yoki hisobot `_id` |
| `reason` | text null | |
| `year`, `month` | smallint | ball tegishli oy; indeks `(userId, year, month)` |
| `createdBy` | uuid | |
| `createdAt` | timestamptz | |

### `monthly_kpi_summaries`

Unique `(userId, year, month)`. Cron yoki `POST /api/kpi/snapshot` yozadi.

| Ustun | Tur |
|---|---|
| `id` | uuid PK |
| `userId` | uuid, indeks |
| `year`, `month` | smallint |
| `totalPoints`, `taskPoints`, `bonusPoints`, `reportPoints`, `manualPoints` | integer, standart 0 |
| `tasksAssigned`, `tasksVerified`, `reportsSubmitted` | integer, standart 0 |
| `averageReportRating`, `attendanceRatio` | numeric(5,2), standart 0 |
| `createdAt` | timestamptz |

### `payroll_records`

Unique `(userId, year, month)`.

| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK users CASCADE, indeks | |
| `year`, `month` | smallint | |
| `baseAmount` | numeric(14,2) | `baseSalary x totalRate` |
| `attendanceAmount` | numeric(14,2) | `baseAmount x attendanceRatio` |
| `bonusAmount` | numeric(14,2) | `pointsAmount + teamBonusAmount + teamPointsAmount` |
| `deductionAmount` | numeric(14,2) | hozircha doim `0.00` |
| `totalAmount` | numeric(14,2) | `attendanceAmount + bonusAmount` |
| `currency` | varchar(8) | sozlamadan nusxa |
| `status` | enum `payroll_records_status_enum`, indeks | `CALCULATED`, `PAID` |
| `breakdown` | jsonb | `PayrollBreakdown`: baseSalary, totalRate, workingDays, presentDays, attendanceRatio, attendanceAmount, taskPoints, bonusPoints, reportPoints, manualPoints, pointValue, pointsAmount, teamPerformanceRatio, teamBonusAmount, teamPointsAmount, isDepartmentHead, departments[] |
| `note` | text null | PAID da izoh |
| `calculatedBy`, `calculatedAt` | uuid, timestamptz | |
| `paidBy`, `paidAt` | uuid null, timestamptz null | |
| `createdAt`, `updatedAt` | timestamptz | |

### `announcements`

| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `title` | varchar(255) | |
| `body` | text | 3-20000 belgi |
| `departmentId` | uuid null FK departments CASCADE, indeks | null = tashkilot miqyosi |
| `createdBy` | uuid | |
| `isPinned` | boolean | standart false, ro'yxatda birinchi |
| `expiresAt` | timestamptz null | o'tganlar `includeExpired=true` siz ko'rinmaydi |
| `createdAt`, `updatedAt` | timestamptz | |

### `typeorm_migrations`

TypeORM xizmat jadvali: `id`, `timestamp`, `name`. Qo'lda o'zgartirilmaydi.

## MongoDB `hrms` (backend)

Indekslar Mongoose sxemalaridan ilova ishga tushganda yaratiladi (`autoIndex`). Barcha `userId` lar PostgreSQL `users.id` ga mos satr.

### `sessions`

| Maydon | Tur | Izoh |
|---|---|---|
| `userId` | string, indeks | |
| `sessionId` | string, unique | uuid v4; JWT `sid` |
| `refreshTokenHash` | string | sha256(refreshToken), rotation da yangilanadi |
| `client` | `WEB` / `MOBILE` | |
| `ip`, `userAgent`, `device`, `browser`, `os` | string | ua-parser-js dan |
| `deviceName`, `platform`, `pushToken` | string null | faqat mobil login |
| `expiresAt` | Date | `now + JWT_REFRESH_TTL`; refresh da uzaytiriladi |
| `lastActiveAt` | Date | har autentifikatsiyalangan so'rovda |
| `revokedAt` | Date null | |
| `revokedReason` | string null | `LOGOUT`, `REFRESH_TOKEN_REUSE`, `PASSWORD_CHANGED`, `TERMINATED_BY_USER`, `CREDENTIALS_RESET_BY_ADMIN`, `STATUS_TERMINATED`, `STATUS_BLOCKED` |
| `createdAt`, `updatedAt` | Date | timestamps |

Indekslar: `{userId:1, revokedAt:1}`, `{expiresAt:1}` TTL (`expireAfterSeconds: 0`) - muddati o'tgan sessiyalar Mongo tomonidan avtomatik o'chiriladi.

### `login_history`

| Maydon | Tur | Izoh |
|---|---|---|
| `userId` | string null, indeks | noto'g'ri login bo'lsa null |
| `login` | string, indeks | kiritilgan login |
| `success` | boolean | |
| `failureReason` | string null | `AUTH_INVALID_CREDENTIALS`, `AUTH_ACCOUNT_INACTIVE` |
| `client` | `WEB` / `MOBILE` | |
| `ip`, `userAgent`, `device`, `browser`, `os` | string | |
| `sessionId` | string null | muvaffaqiyatli bo'lsa |
| `createdAt` | Date | indeks `-1` |

### `audit_logs`

| Maydon | Tur | Izoh |
|---|---|---|
| `actorId` | string null, indeks | |
| `actorLogin` | string null | public login so'rovida body dan olinadi |
| `actorRole` | string null | |
| `action` | string, indeks | `Controller.handler`, masalan `Tasks.verify`, `Employees.changeStatus` |
| `method` | string | POST, PUT, PATCH, DELETE |
| `path` | string | `originalUrl` |
| `entity` | string null, indeks | controller nomi `Controller` suffiksisiz |
| `entityId` | string null, indeks | `params.id ?? userId ?? departmentId ?? sessionId` |
| `statusCode` | number | |
| `durationMs` | number | |
| `ip`, `userAgent` | string | |
| `payload` | object null | sanitizatsiya qilingan body (`password`, `newPassword`, `currentPassword`, `confirmPassword`, `refreshToken`, `accessToken`, `passwordHash` -> `[REDACTED]`, satrlar 500 belgi, massivlar 50 element, chuqurlik 4) |
| `query` | object null | |
| `errorMessage` | string null | |
| `createdAt` | Date | |

Indekslar: `{createdAt:-1}`, `{actorId:1, createdAt:-1}`.

### `daily_reports`

| Maydon | Tur | Izoh |
|---|---|---|
| `userId` | string, indeks | |
| `userFullName` | string | denormalizatsiya |
| `departmentId` | string, indeks | yuborish vaqtidagi asosiy bo'lim (eng yuqori rate) |
| `date` | string `YYYY-MM-DD`, indeks | |
| `content` | string | 10-10000 belgi |
| `completedTaskIds` | string[] | <= 50 |
| `attachmentFileIds` | string[] | <= 10 |
| `rating` | number null | 1-5 |
| `ratingComment`, `ratedBy` | string null | |
| `ratedAt` | Date null | |
| `pointsAwarded` | number | standart 0 |
| `submittedAt` | Date null | |
| `createdAt`, `updatedAt` | Date | |

Indekslar: `{userId:1, date:1}` unique (kuniga bitta hisobot), `{departmentId:1, date:-1}`.

### `polls`

| Maydon | Tur | Izoh |
|---|---|---|
| `title` | string | |
| `description` | string null | |
| `options` | `[{index, label}]` | 2-20 variant |
| `departmentId` | string null, indeks | null = tashkilot miqyosi |
| `createdBy`, `createdByName` | string | |
| `isAnonymous` | boolean | true bo'lsa `voters` qaytarilmaydi |
| `closesAt` | Date null | avtomatik yopilish vaqti |
| `closedAt` | Date null | qo'lda yopilgan |
| `votes` | `[{userId, optionIndex, votedAt}]` | bir foydalanuvchi bir ovoz |
| `createdAt`, `updatedAt` | Date | |

Indeks: `{departmentId:1, createdAt:-1}`.

### `notifications`

| Maydon | Tur | Izoh |
|---|---|---|
| `userId` | string, indeks | |
| `type` | enum NotificationType | `SECURITY_NEW_LOGIN`, `SECURITY_PASSWORD_CHANGED`, `SECURITY_SESSION_TERMINATED`, `TASK_ASSIGNED`, `TASK_STATUS_CHANGED`, `TASK_VERIFIED`, `REPORT_MISSING`, `REPORT_RATED`, `PAYROLL_STATUS`, `ANNOUNCEMENT`, `POLL_CREATED`, `STATUS_CHANGED`, `ATTENDANCE_MARKED`, `KPI_ADJUSTED` |
| `title`, `body` | string | o'zbek tilida matn |
| `data` | object | kontekst: `taskId`, `payrollId`, `reportId`, `announcementId`, `pollId`, `sessionId` va boshqalar |
| `readAt` | Date null | |
| `createdAt` | Date | |

Indeks: `{userId:1, readAt:1, createdAt:-1}`.

## MongoDB `hrms_files` (file-service)

### `files`

| Maydon | Tur | Izoh |
|---|---|---|
| `fileId` | string, unique | uuid v4; URL va backend dagi `*FileId` maydonlarida ishlatiladi |
| `originalName` | string | sanitizatsiya qilingan, <= 255 |
| `mimeType` | string | |
| `size` | number | bayt |
| `category` | `PHOTO` / `PASSPORT` / `LOGO` / `DOCUMENT` | |
| `storageDriver` | `local` / `s3` | yuklangan paytdagi drayver |
| `storageKey` | string | `<category>/<fileId>.<ext>` |
| `uploadedBy`, `uploadedByRole` | string | |
| `ownerUserId` | string null | fayl tegishli xodim |
| `checksum` | string | sha256 |
| `isDeleted` | boolean | soft delete |
| `deletedAt` | Date null | |
| `createdAt`, `updatedAt` | Date | |

Indekslar: `{category:1, ownerUserId:1, isDeleted:1, createdAt:-1}`, `{uploadedBy:1, isDeleted:1}`.

## Migratsiya ish tartibi qoidalari

1. `synchronize: false` - TypeORM hech qachon sxemani avtomatik o'zgartirmaydi. Har bir entity o'zgarishi `backend/src/database/migrations/<timestamp>-<Name>.ts` fayli bilan birga keladi.
2. Migratsiyalar konteyner ishga tushganda `run-migrations.js` orqali, har biri alohida tranzaksiyada (`transaction: 'each'`) qo'llanadi.
3. Qo'llangan migratsiya fayli tahrirlanmaydi; tuzatish yangi migratsiya bilan qilinadi.
4. MongoDB sxemalari uchun migratsiya yo'q: maydon qo'shish Mongoose `default` orqali hal qilinadi, indeks o'zgarishi ilova ishga tushganda qo'llanadi. Indeksni o'chirish qo'lda (`db.collection.dropIndex`) bajariladi.
5. Batafsil: [migrations.md](migrations.md).
