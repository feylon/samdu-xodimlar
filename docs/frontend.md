# Frontend (Nuxt 3 SPA)

Manba: `frontend/`. Nuxt 3 (`ssr: false`, Nitro `node-server` preset), Vue 3, Pinia, TailwindCSS, `@nuxtjs/i18n`, Chart.js (`vue-chartjs`), `socket.io-client`, dayjs. Port 3002. Frontend da biznes mantiq yo'q: barcha qoidalar backend da, SPA faqat `/api` va file-service bilan ishlaydi.

## Konfiguratsiya (`nuxt.config.ts`)

| Sozlama | Qiymat |
|---|---|
| `ssr` | `false` (SPA; Nitro faqat statik fayllarni beradi) |
| `modules` | `@pinia/nuxt`, `@nuxtjs/tailwindcss`, `@nuxtjs/i18n` |
| `runtimeConfig.public` | `apiBase` (`http://localhost:3000/api`), `wsBase` (`http://localhost:3000`), `fileBase` (`http://localhost:3001`) - env orqali `NUXT_PUBLIC_API_BASE`, `NUXT_PUBLIC_WS_BASE`, `NUXT_PUBLIC_FILE_BASE` |
| `i18n` | `strategy: no_prefix`, `defaultLocale: uz`, `lazy`, `langDir: locales`, locale fayllari `i18n/locales/uz.json`, `ru.json`; brauzer tilini aniqlash cookie `hrms_locale` bilan, fallback `uz` |
| `app.head` | sarlavha `Xodimlar HRMS`, Inter shrifti (Google Fonts), `pageTransition` |
| `tailwindcss` | `assets/css/main.css`, `tailwind.config.ts` (`brand` rangi `rgb(var(--brand-rgb) / <alpha>)`) |
| `typescript.strict` | `true` |

## Papka tuzilishi

```text
frontend/
├── app.vue                    # <NuxtLayout><NuxtPage/></NuxtLayout> + <UiToast/>
├── layouts/
│   ├── default.vue            # Sidebar, header (bildirishnomalar menyusi, til, profil), kontent
│   └── auth.vue               # Login ekrani uchun markazlashgan layout
├── pages/                     # fayl asosidagi routing (quyida)
├── components/
│   ├── ui/                    # DataTable, Modal, Drawer, Dropdown, Select, FormField, FileUpload, Badge, Avatar,
│   │                          # Tabs, Toast, StatCard, PageHeader, EmptyState, Spinner, MonthPicker, ConfirmDialog, Icon
│   ├── layout/                # Sidebar, NotificationsMenu, LanguageSwitcher
│   ├── dashboard/             # Superadmin, Hr, Head, Employee - rolga mos dashboardlar
│   ├── charts/                # BarChart, LineChart, DoughnutChart, RatioRing (Chart.js)
│   ├── employees/             # PersonalForm, AssignmentsEditor, StatusDialog, TransferDialog, CredentialsDialog, Search
│   ├── attendance/, tasks/, reports/, kpi/, payroll/
├── stores/                    # Pinia: auth, organization, notifications, ui
├── composables/               # useApi, useFiles, useTranslate (+useEnumLabel), useFormat, useAsyncAction, useDebounce,
│                              # useDepartments, useDashboardSeries
├── middleware/                # auth.global.ts, role.ts
├── plugins/                   # bootstrap.client.ts, chart.client.ts, directives.client.ts
├── i18n/locales/              # uz.json, ru.json
├── utils/                     # navigation.ts (NAV_ITEMS), enums.ts (ro'yxatlar, badge ranglari), dates.ts, color.ts
├── types/                     # api.ts (backend javob turlari), page-meta.d.ts (PageMeta.roles)
├── assets/css/main.css        # Tailwind + .btn, .input, .card kabi komponent klasslar, --brand o'zgaruvchilari
├── nuxt.config.ts, tailwind.config.ts, tsconfig.json, Dockerfile, .env.example
```

## Routing va sahifalar

Navigatsiya `utils/navigation.ts` dagi `NAV_ITEMS` dan quriladi; `roles` ko'rsatilgan bandlar faqat shu rollarga ko'rinadi:

| Yo'l | Sahifa | Ko'rinish |
|---|---|---|
| `/login` | Kirish (layout `auth`) | hamma, autentifikatsiyalangan bo'lsa `/` ga yo'naltiriladi |
| `/` | Dashboard - `GET /dashboard` javobidagi `role` ga qarab `DashboardSuperadmin`, `DashboardHr`, `DashboardHead`, `DashboardEmployee` | hamma |
| `/employees`, `/employees/new`, `/employees/:id` | Xodimlar ro'yxati, onboarding, karta (shaxsiy ma'lumot, yuklamalar, holat, transfer, hisob ma'lumotlari) | HR, SUPERADMIN, DEPARTMENT_HEAD (faqat ko'rish) |
| `/departments`, `/departments/:id` | Bo'limlar, a'zolar, boshliq | hamma (scope backend da) |
| `/attendance` | Bugungi varaq (boshliq), ro'yxat, oylik xulosa | hamma |
| `/tasks` | Vazifalar, holat topshirish, tasdiqlash | hamma |
| `/reports` | Kunlik hisobotlar, yuborish, baholash | hamma |
| `/kpi` | Ballar, leaderboard, qo'lda tuzatish | hamma |
| `/payroll` | Ish haqi yozuvlari, hisoblash, PAID, breakdown drawer | hamma |
| `/calendar` | Oy kalendari, kun turini belgilash | hamma (tahrir HR/SUPERADMIN) |
| `/announcements`, `/polls` | E'lonlar, so'rovnomalar | hamma |
| `/notifications` | Barcha bildirishnomalar | hamma |
| `/security` | Sessiyalar, login tarixi, parolni o'zgartirish | hamma |
| `/profile` | O'z profili | hamma |
| `/audit` | Audit loglari, login tarixi, sessiyalar | SUPERADMIN |
| `/settings/organization` | Tashkilot sozlamalari va koeffitsientlar | SUPERADMIN |
| `/settings/users` | Barcha foydalanuvchilar, HR yaratish, login/parolni tiklash | SUPERADMIN |

`notificationTarget(data)` (`utils/navigation.ts`) bildirishnoma `data` kalitiga qarab sahifa tanlaydi: `taskId -> /tasks`, `payrollId -> /payroll`, `reportId -> /reports`, `announcementId -> /announcements`, `pollId -> /polls`, `sessionId -> /security`.

### Middleware

- `middleware/auth.global.ts` (global): `accessToken` yo'q bo'lsa `/login?redirect=<to>` ga; `/login` ga kirishda token bor bo'lsa `/` ga.
- `middleware/role.ts` (sahifada `definePageMeta({ middleware: 'role', roles: ['SUPERADMIN'] })`): `to.meta.roles` foydalanuvchi roliga mos kelmasa `errors.ACCESS_FORBIDDEN_ROLE` toast va `/` ga. `types/page-meta.d.ts` `PageMeta` ga `roles` va `title` qo'shadi.

### Plugins (client-only)

- `bootstrap.client.ts`: ilova yuklanganda `organization.loadPublic()` (brending) va, token bo'lsa, `auth.fetchMe()` -> socket ulanishi -> `notifications.fetchUnread()`.
- `chart.client.ts`: Chart.js elementlarini ro'yxatdan o'tkazadi, Inter shrifti va umumiy tooltip/legend uslublari.
- `directives.client.ts`: `v-click-outside` direktivasi.

## Pinia store'lar

### `stores/auth.ts`

- Holat: `accessToken`, `refreshToken`, `sessionId`, `user` (`AuthUser`). `localStorage['hrms.auth']` ga saqlanadi va yuklanganda qayta o'qiladi (sahifa yangilansa sessiya saqlanadi).
- Hisoblanadigan: `role`, `isAuthenticated`, `isSuperadmin`, `isHr`, `isHead`, `isEmployee`, `isManagement`, `mustChangePassword`, `hasRole(roles)`.
- `login(login, password)`: `POST /auth/login` -> tokenlar -> socket `connect` -> `fetchMe` + `fetchUnread`.
- `refresh()`: `POST /auth/refresh` -> yangi tokenlar -> socket `reconnect`. Muvaffaqiyatsiz bo'lsa `false`.
- `logout()`: `POST /auth/logout`, socket uzish, `clear()`, `/login`.
- `forceLogout(reasonKey)`: serverdan kelgan `session.terminated` yoki refresh muvaffaqiyatsizligida; `auth.logoutReasons.<reason>` kaliti bo'lsa toast (`PASSWORD_CHANGED`, `TERMINATED_BY_USER`, `CREDENTIALS_RESET_BY_ADMIN`, `STATUS_TERMINATED`, `STATUS_BLOCKED`, `SESSION_EXPIRED`).

### `stores/organization.ts`

- `branding` (`GET /organization/public`: `name`, `logoUrl`, `primaryColor`, `currency`, `timezone`) va `settings` (`GET /organization`, autentifikatsiyalangan).
- `applyBranding()`: `--brand` / `--brand-rgb` CSS o'zgaruvchilarini o'rnatadi (`utils/color.ts`) va `document.title` ni tashkilot nomiga qo'yadi. `previewColor(hex)` - sozlamalar sahifasida jonli ko'rish.
- `monogram` - logo yo'q bo'lsa nomning bosh harflari.

### `stores/notifications.ts`

- `latest` (oxirgi 8), `unreadCount`, `connected`.
- REST: `fetchLatest` (`GET /notifications?page=1&limit=8`), `fetchUnread`, `markRead` (`PATCH /notifications/:id/read`), `markAllRead` (`POST /notifications/read-all`).
- Socket.IO: `connect(token)` -> `io(`${wsBase}/ws`, { auth: { token }, transports: ['websocket', 'polling'], reconnection: true })`. Eventlar:
  - `notification` -> ro'yxat boshiga, `unreadCount++`, info toast;
  - `notification.unread` -> `unreadCount = count`;
  - `security.alert` -> 15 soniyali warning toast (`socket.newLoginTitle`, qurilma va IP bilan);
  - `session.terminated` -> `auth.forceLogout(reason)`.
- `reconnect(token)`: access token yangilanganda `socket.auth` ni almashtirib qayta ulanadi.

### `stores/ui.ts`

- `sidebarCollapsed` (`localStorage['hrms.sidebar']`), `mobileSidebarOpen`, `toasts` (maksimum 6, error 7 s, boshqalari 4.5 s).
- `success(titleKey)`, `info(titleKey)`, `warning(title, message, timeout)`, `error(title, message, timeout)`.
- `describeError(err)` / `toastError(err)`: `ApiError.code` ni `errors.<CODE>` i18n kalitiga aylantiradi (`errors.AUTH_INVALID_CREDENTIALS`, `errors.ASSIGNMENT_RATE_EXCEEDS_100` va h.k.), `details` (validatsiya xabarlari) ni `;` bilan qo'shadi. Kalit yo'q bo'lsa kodning o'zi ko'rsatiladi.

## API qatlami (`composables/useApi.ts`)

- `$fetch` (ofetch) ustida `get/post/put/patch/delete/download`; `baseURL = apiBase`, `Authorization: Bearer` avtomatik, `query` dan bo'sh qiymatlar olib tashlanadi.
- `401` da bir martalik refresh (`refreshPromise` mutex - parallel so'rovlar bitta refresh ni kutadi), muvaffaqiyatli bo'lsa so'rov takrorlanadi, aks holda `forceLogout('SESSION_EXPIRED')`. `/auth/login` va `/auth/refresh` uchun takrorlanmaydi.
- Xatolar `ApiError { status, code, details }` ga o'giriladi: backend `message` massiv bo'lsa `VALIDATION_FAILED` + `details`; tarmoq xatosi `NETWORK_ERROR`.
- `download(path, body, fallbackFilename)`: `POST` blob, `Content-Disposition` dan fayl nomini oladi (`filename*=UTF-8''` qo'llanadi), `<a download>` orqali saqlaydi.

### Fayllar (`composables/useFiles.ts`)

- `contentUrl(fileId, withToken)`: `${fileBase}/files/${id}/content`, `withToken = true` bo'lsa `?token=<accessToken>` qo'shiladi - PASSPORT va DOCUMENT uchun `<img>`/`<a>` teglarida. PHOTO va LOGO uchun tokensiz.
- `upload(file, category, onProgress, ownerUserId)`: `XMLHttpRequest` multipart `POST ${fileBase}/files/upload` (`file`, `category`, `ownerUserId`), progress bilan; xato kodi (`FILE_TOO_LARGE`, `FILE_TYPE_NOT_ALLOWED`, `CATEGORY_NOT_ALLOWED_FOR_ROLE`) `ApiError` ga tushadi.
- `metadata(fileId)`: `GET ${fileBase}/files/${id}`.
- `UiFileUpload` komponenti shu composable ustida: tanlash, progress, natijada `id` ni formaga (`photoFileId`, `passportFileIds`, `attachmentFileIds`, `logoFileId`) yozadi.

## DataTable va eksport (`components/ui/DataTable.vue`)

Barcha jadvallar uchun yagona komponent.

```vue
<UiDataTable
  :columns="columns"          
  :rows="items"
  :total="total" :page="page" :limit="limit"
  :sort-by="sortBy" :sort-order="sortOrder"
  :loading="loading"
  export-title="Xodimlar ro'yxati"
  :export-subtitle="filtersSummary"
  export-orientation="landscape"
  clickable
  @update:page="..." @update:limit="..." @sort="..." @row-click="..."
/>
```

- `DataTableColumn`: `key` (nuqtali yo'l qo'llanadi, `assignee.fullName`), `label`, `sortable`, `type` (`string | number | date | datetime | boolean`), `format(row)`, `align`, `width`, `exportable` (standart true).
- Server tomonidagi pagination (`page`, `limit` 10/20/50/100) va sortlash (`sort` eventi `{ sortBy, sortOrder }`); komponent ma'lumotni o'zi yuklamaydi, sahifa yuklaydi.
- Ko'rsatish: `date` -> `DD.MM.YYYY`, `datetime` -> sana va vaqt, `boolean` -> `common.yes/no`, `number` -> locale formatlash (`useFormat`).
- **Excel / PDF tugmalari**: `exportTable(kind)` joriy `rows` (ya'ni joriy sahifa va filtr) ni `POST /api/export/excel` yoki `/pdf` ga yuboradi:

```json
{
  "title": "<exportTitle>", "subtitle": "<exportSubtitle>",
  "columns": [{ "key": "fullName", "label": "F.I.Sh.", "type": "string" }, { "key": "baseSalary", "label": "Maosh", "type": "number" }],
  "rows": [{ "fullName": "...", "baseSalary": 8000000 }],
  "locale": "uz", "orientation": "landscape"
}
```

  `format` berilgan ustunlar matn sifatida (`string`), `type: number` ustunlar raqam sifatida ketadi; `exportable: false` ustunlar chiqarilmaydi. Natija `api.download` orqali `<title>_<vaqt>.xlsx|pdf` nomi bilan yuklanadi, `common.exportReady` toast. Hujjat tarkibi (sarlavha, yaratilgan vaqt, watermark, footer) backend da hosil bo'ladi ([operations.md](operations.md) "Eksport").

## i18n

- Ikki til: `uz` (standart) va `ru`; `LanguageSwitcher` komponenti `$i18n.setLocale`, tanlov `hrms_locale` cookie da.
- `useTranslate()` - `$i18n.t/te/locale` ga qisqa yo'l (store'lar ichida `useI18n` o'rniga). `useEnumLabel()` enum qiymatini `enums.<EnumName>.<VALUE>` kaliti bo'yicha tarjima qiladi (`enums.EmployeeStatus.ACTIVE`, `enums.TaskStatus.VERIFIED`).
- Kalit guruhlari: `nav.*` (menyu), `auth.*` (login, `logoutReasons.*`), `errors.<ERROR_CODE>` (backend xato kodlari), `enums.*`, `common.*` (`yes`, `no`, `refresh`, `exportReady`), `socket.*`, `dashboard.*` va sahifa bo'yicha guruhlar.
- Eksport `locale` ni ham backend ga uzatadi (Excel/PDF yorliqlari o'zbek yoki rus tilida).

## Brending

`organization.loadPublic()` dan `primaryColor` olinadi va `applyBrandColor(hex)` `:root` da `--brand` va `--brand-rgb` ni yangilaydi; Tailwind `brand` rangi (`bg-brand`, `text-brand`, `bg-brand/10`) shu o'zgaruvchiga bog'langan. Logo `logoUrl` (`${FILE_SERVICE_PUBLIC_URL}/files/<logoFileId>/content`) dan, yo'q bo'lsa `monogram`. Sarlavha (`document.title`) tashkilot nomi. Badge ranglari (`utils/enums.ts`, `ENUM_TONES`) enum qiymatlariga qattiq bog'langan (masalan `EmployeeStatus.BLOCKED -> red`, `TaskStatus.VERIFIED -> green`).

## Sessiya hayot sikli (frontend tomonidan)

```text
Login -> tokenlar localStorage -> socket connect -> fetchMe/fetchUnread
Har so'rov -> 401 -> refresh (bitta) -> takror | forceLogout('SESSION_EXPIRED')
Refresh -> yangi tokenlar -> socket reconnect
session.terminated -> forceLogout(reason) -> toast + /login
Logout -> POST /auth/logout -> clear -> /login
```

`user.mustChangePassword === true` bo'lsa, UI foydalanuvchini parolni almashtirishga undaydi (backend majburlamaydi).

## Build va ishga tushirish

```bash
cd frontend
npm ci                  # postinstall: nuxt prepare (.nuxt turlari)
npm run dev             # nuxt dev --port 3002 (HMR)
npm run build           # .output/ (Nitro node-server)
npm run preview         # build ni lokal ko'rish
npm run start           # node .output/server/index.mjs
```

Docker (`frontend/Dockerfile`): `node:22-alpine`, `npm ci` -> `npm run build` -> runtime image ga faqat `.output` ko'chiriladi, `NITRO_PORT=3002`, `NITRO_HOST=0.0.0.0`, `CMD node .output/server/index.mjs`. `NUXT_PUBLIC_*` qiymatlari konteyner env orqali beriladi, qayta build shart emas.

Tekshiruv ro'yxati (yangi sahifa qo'shganda):

1. `pages/` ga fayl, `definePageMeta({ title: 'nav.xxx', middleware: 'role', roles: [...] })` kerak bo'lsa.
2. `utils/navigation.ts` ga `NAV_ITEMS` bandi (`roles` bilan).
3. `i18n/locales/uz.json` va `ru.json` ga kalitlar (`nav.xxx`, sahifa matnlari, yangi `errors.*`).
4. `types/api.ts` ga backend javob turlari.
5. Jadval bo'lsa `UiDataTable` + `exportTitle`.
