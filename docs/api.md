# API endpointlari

Backend Swagger UI: `http://localhost:3000/api/docs` (JSON: `/api/docs-json`). File-service Swagger UI: `http://localhost:3001/docs`.

Barcha backend endpointlari `/api` prefiksi bilan boshlanadi. Autentifikatsiya: `Authorization: Bearer <accessToken>`. Xato javobi: `{ statusCode, message, details?, path, timestamp }` — `message` maydoni xato kodi (masalan `AUTH_INVALID_CREDENTIALS`).

Rollar: SUPERADMIN, HR, DEPARTMENT_HEAD, EMPLOYEE. Quyidagi jadvallarda "Rollar" ustuni bo'sh bo'lsa, endpoint barcha autentifikatsiya qilingan foydalanuvchilar uchun ochiq (scope backend tomonida cheklanadi).


## Auth (Web)

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `POST` | `/api/auth/change-password` |  | Change own password |
| `POST` | `/api/auth/login` | public | Web client login |
| `GET` | `/api/auth/login-history` |  | My login history |
| `POST` | `/api/auth/logout` |  | Terminate current session |
| `GET` | `/api/auth/me` |  | Current user profile |
| `POST` | `/api/auth/refresh` | public | Rotate refresh token and issue new access token |
| `GET` | `/api/auth/sessions` |  | List my active sessions |
| `DELETE` | `/api/auth/sessions/others` |  | Terminate all my other sessions |
| `DELETE` | `/api/auth/sessions/{sessionId}` |  | Terminate one of my sessions |

## Mobile App Operations

Mobil ilova uchun ajratilgan endpointlar. Sessiyalarni boshqarish (ro'yxat, bitta sessiyani yoki boshqa barcha sessiyalarni yakunlash) faqat shu bo'limda mobil klient uchun taqdim etilgan.

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `POST` | `/api/mobile/auth/change-password` |  | Change own password from mobile |
| `POST` | `/api/mobile/auth/login` | public | Mobile login with device registration |
| `POST` | `/api/mobile/auth/logout` |  | Terminate the current mobile session |
| `POST` | `/api/mobile/auth/refresh` | public | Mobile token refresh with rotation |
| `GET` | `/api/mobile/dashboard` |  | Compact role-aware dashboard payload for mobile |
| `GET` | `/api/mobile/login-history` |  | Login history of the mobile user |
| `GET` | `/api/mobile/me` |  | Profile of the mobile user |
| `GET` | `/api/mobile/notifications` |  | Notifications feed for mobile |
| `GET` | `/api/mobile/sessions` |  | Active sessions of the mobile user across devices |
| `DELETE` | `/api/mobile/sessions/others` |  | Terminate every session except the current one |
| `DELETE` | `/api/mobile/sessions/{sessionId}` |  | Terminate a specific session by id |

## Users (Superadmin)

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `GET` | `/api/users` | SUPERADMIN | List all system users with filters |
| `POST` | `/api/users/hr` | SUPERADMIN | Provision an HR department account |
| `GET` | `/api/users/lookup` | SUPERADMIN | Lookup a user by ID, login, full name or PINFL |
| `GET` | `/api/users/{id}` | SUPERADMIN | Get a user with assignments and status history |
| `PATCH` | `/api/users/{id}` | SUPERADMIN | Edit personal data of any user including HR accounts |
| `PATCH` | `/api/users/{id}/credentials` | SUPERADMIN | Reset login and/or password of any user |

## Employees (HR)

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `GET` | `/api/employees` | HR, SUPERADMIN, DEPARTMENT_HEAD | List employees; department heads only see their own departments |
| `POST` | `/api/employees` | HR | Onboard a new employee |
| `GET` | `/api/employees/{id}` | HR, SUPERADMIN, DEPARTMENT_HEAD | Employee details with assignments and status history |
| `PATCH` | `/api/employees/{id}` | HR, SUPERADMIN | Update employee personal data |
| `PUT` | `/api/employees/{id}/assignments` | HR, SUPERADMIN | Replace department assignments; total active rate must not exceed 100% |
| `PATCH` | `/api/employees/{id}/status` | HR, SUPERADMIN | Freeze, send on vacation, register sick leave, terminate, block or re-activate |
| `GET` | `/api/employees/{id}/status-history` | HR, SUPERADMIN, DEPARTMENT_HEAD | Status lifecycle history of an employee |
| `POST` | `/api/employees/{id}/transfer` | HR, SUPERADMIN | Transfer employee between departments |

## Departments

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `GET` | `/api/departments` |  | List departments visible to the current user |
| `POST` | `/api/departments` | HR, SUPERADMIN | Create a department |
| `GET` | `/api/departments/{id}` |  | Department with members |
| `PATCH` | `/api/departments/{id}` | HR, SUPERADMIN | Update a department |
| `PUT` | `/api/departments/{id}/head` | HR, SUPERADMIN | Assign or remove the department head |

## Attendance

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `GET` | `/api/attendance` |  | Attendance records within the caller scope |
| `POST` | `/api/attendance` | DEPARTMENT_HEAD | Mark attendance for today only; past dates are rejected |
| `POST` | `/api/attendance/bulk` | DEPARTMENT_HEAD | Mark attendance for several team members for today |
| `GET` | `/api/attendance/me` |  | My monthly attendance summary |
| `GET` | `/api/attendance/today/{departmentId}` |  | Today sheet of a department with current marks |
| `GET` | `/api/attendance/users/{userId}/summary` | HR, SUPERADMIN, DEPARTMENT_HEAD | Monthly attendance summary of an employee in scope |

## Tasks

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `GET` | `/api/tasks` |  | Tasks within the caller scope with filters and sorting |
| `POST` | `/api/tasks` | DEPARTMENT_HEAD | Assign a regular or bonus task to a team member |
| `DELETE` | `/api/tasks/{id}` | DEPARTMENT_HEAD | Delete an unverified task |
| `GET` | `/api/tasks/{id}` |  | Task details |
| `PATCH` | `/api/tasks/{id}` | DEPARTMENT_HEAD | Edit a task that is not yet verified |
| `PATCH` | `/api/tasks/{id}/status` |  | Assignee marks the task In progress, Completed or Partially completed |
| `POST` | `/api/tasks/{id}/verify` | DEPARTMENT_HEAD | Verify completion and award KPI points, or reject |

## KPI

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `POST` | `/api/kpi/adjust` | DEPARTMENT_HEAD, HR | Manually add or remove points with a reason |
| `GET` | `/api/kpi/departments/{departmentId}` |  | Department KPI summary |
| `GET` | `/api/kpi/leaderboard` |  | Points leaderboard within scope |
| `GET` | `/api/kpi/me` |  | My points for the month with breakdown and history |
| `POST` | `/api/kpi/snapshot` | SUPERADMIN, HR | Force the monthly KPI snapshot for a period |
| `GET` | `/api/kpi/users/{userId}` | HR, SUPERADMIN, DEPARTMENT_HEAD | KPI of an employee in scope |

## Daily Reports

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `GET` | `/api/reports/daily` |  | Reports within scope with filters |
| `POST` | `/api/reports/daily` |  | Submit or update today end-of-day report |
| `GET` | `/api/reports/daily/me` |  | My reports for a month |
| `GET` | `/api/reports/daily/missing` | DEPARTMENT_HEAD, HR, SUPERADMIN | Team members who have not submitted today |
| `GET` | `/api/reports/daily/today` |  | My report for today, null when not yet submitted |
| `GET` | `/api/reports/daily/{id}` |  | Report details |
| `POST` | `/api/reports/daily/{id}/rate` | DEPARTMENT_HEAD | Rate a report 1-5 and award KPI points |

## Payroll

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `GET` | `/api/payroll` |  | Payroll records within scope |
| `POST` | `/api/payroll/calculate` | HR | Calculate monthly salaries from attendance, points and team performance |
| `GET` | `/api/payroll/me` |  | My payroll history |
| `GET` | `/api/payroll/{id}` |  | Payroll record details with breakdown |
| `PATCH` | `/api/payroll/{id}/status` | HR | Move a payroll record to PAID; paid records become immutable |

## Calendar

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `GET` | `/api/calendar` |  | Month view merging default weekends with HR overrides |
| `PUT` | `/api/calendar/days` | HR, SUPERADMIN | Define a working day, weekend, holiday or non-working date |
| `POST` | `/api/calendar/days/bulk` | HR, SUPERADMIN | Bulk define calendar days |
| `DELETE` | `/api/calendar/days/{date}` | HR, SUPERADMIN | Remove an override so the date falls back to the default rule |

## Announcements

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `GET` | `/api/announcements` |  | Announcements visible to the caller |
| `POST` | `/api/announcements` | DEPARTMENT_HEAD, HR, SUPERADMIN | Create a department or organization-wide announcement |
| `DELETE` | `/api/announcements/{id}` | DEPARTMENT_HEAD, HR, SUPERADMIN | Delete an announcement |
| `GET` | `/api/announcements/{id}` |  | Announcement details |
| `PATCH` | `/api/announcements/{id}` | DEPARTMENT_HEAD, HR, SUPERADMIN | Update an announcement |

## Polls

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `GET` | `/api/polls` |  | Polls visible to the caller |
| `POST` | `/api/polls` | DEPARTMENT_HEAD, HR, SUPERADMIN | Create an internal poll |
| `DELETE` | `/api/polls/{id}` | DEPARTMENT_HEAD, HR, SUPERADMIN | Delete a poll |
| `GET` | `/api/polls/{id}` |  | Poll details and results when permitted |
| `PATCH` | `/api/polls/{id}/close` | DEPARTMENT_HEAD, HR, SUPERADMIN | Close a poll |
| `POST` | `/api/polls/{id}/vote` |  | Cast a vote |

## Notifications

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `GET` | `/api/notifications` |  | List my notifications |
| `POST` | `/api/notifications/read-all` |  | Mark all my notifications as read |
| `GET` | `/api/notifications/unread-count` |  | Count my unread notifications |
| `PATCH` | `/api/notifications/{id}/read` |  | Mark one notification as read |

## Organization

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `GET` | `/api/organization` |  | Full organization settings |
| `PATCH` | `/api/organization` | SUPERADMIN | Update organization settings and payroll coefficients |
| `GET` | `/api/organization/public` | public | Public branding (name, logo, color) used by login screen |

## Audit (Superadmin)

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `GET` | `/api/audit/login-history` | SUPERADMIN | Login history of all users |
| `GET` | `/api/audit/logs` | SUPERADMIN | System-wide action log with employee ID filter |
| `GET` | `/api/audit/sessions` | SUPERADMIN | All active sessions across the organization |

## Dashboard

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `GET` | `/api/dashboard` |  | Role-aware dashboard statistics |

## Export

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `POST` | `/api/export/excel` |  | Render a table as Excel with generation timestamp header |
| `POST` | `/api/export/pdf` |  | Render a table as PDF with timestamp watermark and footer |

## Health

| Metod | Yo'l | Rollar | Tavsif |
|---|---|---|---|
| `GET` | `/api/health` | public | Liveness and dependency status |

# File-service endpointlari (port 3001)

| Metod | Yo'l | Kirish | Tavsif |
|---|---|---|---|
| `GET` | `/files` | HR, SUPERADMIN | List files (HR and SUPERADMIN only) |
| `POST` | `/files/upload` | JWT; LOGO → SUPERADMIN, PHOTO/PASSPORT → HR, SUPERADMIN, DOCUMENT → barcha rollar | Upload a file |
| `GET` | `/files/{id}` | PHOTO/LOGO ochiq; PASSPORT/DOCUMENT → egasi, HR, SUPERADMIN | Get file metadata |
| `DELETE` | `/files/{id}` | HR, SUPERADMIN | Soft-delete a file and remove it from storage |
| `GET` | `/files/{id}/content` | PHOTO/LOGO ochiq; PASSPORT/DOCUMENT → egasi, HR, SUPERADMIN (`?token=` orqali ham) | Stream file content |
| `GET` | `/health` | ochiq | Service health check |

## Xato kodlari

| Kod | Ma'nosi |
|---|---|
| `AUTH_INVALID_CREDENTIALS` | Login yoki parol noto'g'ri |
| `AUTH_ACCOUNT_INACTIVE` | Hisob TERMINATED yoki BLOCKED holatida |
| `AUTH_SESSION_REVOKED` | Sessiya yakunlangan yoki muddati o'tgan |
| `AUTH_REFRESH_INVALID` | Refresh token yaroqsiz yoki qayta ishlatilgan |
| `AUTH_PASSWORD_MISMATCH` | Joriy parol noto'g'ri |
| `ACCESS_FORBIDDEN_ROLE` | Rol ruxsati yo'q |
| `ACCESS_FORBIDDEN_SCOPE` | Bo'lim/xodim doirasidan tashqari |
| `USER_NOT_FOUND` | Foydalanuvchi topilmadi |
| `USER_LOGIN_TAKEN` | Login band |
| `USER_PINFL_TAKEN` | JSHSHIR band |
| `USER_HR_EDIT_ONLY_SUPERADMIN` | HR ma'lumotini faqat SUPERADMIN tahrirlaydi |
| `USER_SUPERADMIN_CANNOT_CREATE_EMPLOYEE` | SUPERADMIN oddiy xodim yaratmaydi |
| `DEPARTMENT_NOT_FOUND` | Bo'lim topilmadi |
| `DEPARTMENT_CODE_TAKEN` | Bo'lim kodi band |
| `ASSIGNMENT_RATE_EXCEEDS_100` | Yuklamalar yig'indisi 100% dan oshdi |
| `ASSIGNMENT_NOT_FOUND` | Biriktirish topilmadi |
| `ATTENDANCE_PAST_DATE_FORBIDDEN` | O'tgan sana uchun davomat kiritish taqiqlangan |
| `ATTENDANCE_FUTURE_DATE_FORBIDDEN` | Kelajak sana uchun davomat kiritish taqiqlangan |
| `TASK_NOT_FOUND` | Vazifa topilmadi |
| `TASK_INVALID_TRANSITION` | Holat o'tishi noto'g'ri |
| `TASK_ALREADY_VERIFIED` | Vazifa allaqachon tasdiqlangan |
| `REPORT_ALREADY_RATED` | Hisobot allaqachon baholangan |
| `REPORT_NOT_FOUND` | Hisobot topilmadi |
| `PAYROLL_NOT_FOUND` | Ish haqi yozuvi topilmadi |
| `PAYROLL_IMMUTABLE_PAID` | PAID yozuv o'zgartirilmaydi |
| `PAYROLL_INVALID_TRANSITION` | Ish haqi holati o'tishi noto'g'ri |
| `CALENDAR_INVALID_DATE` | Sana noto'g'ri |
| `ANNOUNCEMENT_NOT_FOUND` | E'lon topilmadi |
| `POLL_NOT_FOUND` | So'rovnoma topilmadi |
| `POLL_CLOSED` | So'rovnoma yopilgan |
| `POLL_ALREADY_VOTED` | Allaqachon ovoz berilgan |
| `POLL_INVALID_OPTION` | Variant noto'g'ri |
| `NOTIFICATION_NOT_FOUND` | Bildirishnoma topilmadi |
| `SESSION_NOT_FOUND` | Sessiya topilmadi |
| `STATUS_INVALID_TRANSITION` | Xodim holati o'tishi noto'g'ri |
| `VALIDATION_FAILED` | Validatsiya xatosi (details massivida tafsilotlar) |
