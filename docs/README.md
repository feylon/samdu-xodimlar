# Xodimlar HRMS hujjatlari

Barcha hujjatlar o'zbek tilida (lotin yozuvi), texnik atamalar inglizcha qoldirilgan. Har bir fayl bitta mavzuga bag'ishlangan.

| Fayl | Bir qatorli tavsif |
|---|---|
| [architecture.md](architecture.md) | Xizmatlar diagrammasi, backend modullari va mas'uliyatlari, login / vazifa-KPI-ish haqi / bildirishnoma oqimlari, PostgreSQL va MongoDB bo'linishi, cron jadvali |
| [setup.md](setup.md) | Talablar, har bir xizmatni Dockersiz lokal ishga tushirish, Docker bilan ishga tushirish, migratsiya va seed, `api.md` ni Swagger dan qayta yaratish |
| [docker.md](docker.md) | `docker-compose.yml` xizmatlari jadvali, lifecycle buyruqlari, volume backup/restore, production tavsiyalari (reverse proxy, HTTPS, S3), muammolarni bartaraf etish |
| [database.md](database.md) | PostgreSQL jadvallari (ustunlar, enum, unique cheklovlar), MongoDB kolleksiyalari (maydonlar, indekslar), migratsiya qoidalari |
| [migrations.md](migrations.md) | Entity o'zgarishi -> migration generatsiya -> ko'rib chiqish -> commit; nomlash, revert, konteynerda avtomatik qo'llanish |
| [roles.md](roles.md) | Funksiya x rol ruxsatlar matritsasi, biznes qoidalar va ular qaytaradigan xato kodlari |
| [security.md](security.md) | JWT oqimi, token muddatlari, sessiya modeli, login tarixi, xavfsizlik ogohlantirishlari, parol qoidalari, guard'lar, rate limit, helmet/CORS, audit, fayl ruxsatlari, hardening ro'yxati |
| [operations.md](operations.md) | Operator uchun kundalik qo'llanma: rollar bo'yicha onboarding, oylik ish haqi sikli, kalendar, KPI oy almashinuvi, eslatmalar, bloklangan xodimlar, parolni tiklash, audit, eksport, backup, loglar |
| [frontend.md](frontend.md) | Nuxt ilovasi tuzilishi, Pinia store'lar, i18n, routing/middleware, DataTable + eksport, Socket.IO integratsiyasi, brending, build va ishga tushirish |
| [mobile-api.md](mobile-api.md) | Mobil dasturchilar uchun: login/refresh oqimi JSON namunalari bilan, sessiya endpointlari, push token, socket eventlari, xatolarni qayta ishlash |
| [api.md](api.md) | Swagger (`GET /api/docs-json`) dan avtomatik yaratilgan endpointlar jadvali. Qo'lda tahrirlanmaydi |
| [superpowers/specs/2025-03-02-hrms-design.md](superpowers/specs/2025-03-02-hrms-design.md) | Dastlabki dizayn spetsifikatsiyasi (qabul qilingan qarorlar) |

## Qayerdan boshlash

1. Tizimni ishga tushirish: [../README.md](../README.md) dagi "Tez boshlash", keyin [setup.md](setup.md).
2. Tizim qanday ishlaydi: [architecture.md](architecture.md) va [database.md](database.md).
3. Kim nima qila oladi: [roles.md](roles.md).
4. Kundalik ish: [operations.md](operations.md).
5. Xavfsizlik va production: [security.md](security.md), [docker.md](docker.md).
6. Integratsiya: [api.md](api.md), [mobile-api.md](mobile-api.md).

## Hujjatlarni yangilash qoidalari

- Kodda biznes qoida o'zgarsa, [roles.md](roles.md) va [operations.md](operations.md) ham yangilanadi.
- Sxema o'zgarsa, yangi migration bilan birga [database.md](database.md) yangilanadi.
- Yangi endpoint qo'shilsa, `api.md` Swagger dan qayta generatsiya qilinadi (qo'lda yozilmaydi), tartib [setup.md](setup.md) da.
- Yangi env o'zgaruvchi qo'shilsa, `.env.example` fayllari va [setup.md](setup.md) dagi jadval yangilanadi.
