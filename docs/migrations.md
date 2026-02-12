# Migratsiyalar

PostgreSQL sxemasi faqat TypeORM migratsiyalari orqali o'zgaradi. `backend/src/database/data-source.ts` da `synchronize: false`, `migrations: [__dirname + '/migrations/*.{ts,js}']`, `migrationsTableName: 'typeorm_migrations'`. Hozirgi migratsiya: `backend/src/database/migrations/1741600000000-InitialSchema.ts` (barcha 12 jadval, enum turlari, indekslar, FK lar).

## Asosiy qoida

Har qanday entity o'zgarishi (yangi ustun, tur, indeks, FK, jadval) o'sha PR ichida `backend/src/database/migrations/` papkasida yangi migratsiya fayli bilan birga keladi. Entity o'zgargan, lekin migratsiya yo'q bo'lsa, konteyner ishga tushganda baza eski sxemada qoladi va so'rovlar `column ... does not exist` xatosi bilan tushadi.

## Nomlash

`<timestamp>-<Name>.ts`, bu yerda `<timestamp>` millisekundlardagi Unix vaqti (TypeORM CLI avtomatik qo'yadi), `<Name>` PascalCase da o'zgarish mazmunini aks ettiradi:

```text
1741600000000-InitialSchema.ts
1760000000000-AddEmployeeMiddleName.ts
1760100000000-AddTaskEstimatedHours.ts
```

Fayl ichidagi klass nomi `<Name><timestamp>` bo'ladi (`InitialSchema1741600000000`) va `name` xossasi bilan bir xil. TypeORM `typeorm_migrations` jadvalida shu nomni saqlaydi, shuning uchun fayl va klass nomini qo'llanganidan keyin o'zgartirmang.

## Qadam-baqadam: entity ni o'zgartirish

Misol: `users` ga `middleName` ustuni qo'shish.

### 1. Entity ni o'zgartiring

`backend/src/modules/users/entities/user.entity.ts`:

```ts
@Column({ type: 'varchar', length: 100, nullable: true })
middleName: string | null;
```

Yangi entity bo'lsa, uni `backend/src/database/entities.ts` dagi `ENTITIES` massiviga qo'shing (TypeORM `autoLoadEntities: false`, faqat shu ro'yxat ishlatiladi).

### 2. Bazani joriy holatga keltiring

Generatsiya entity bilan **haqiqiy baza** sxemasini solishtiradi, shuning uchun baza oxirgi migratsiyagacha yangilangan bo'lishi kerak:

```bash
cd backend
set -a; source .env; set +a      # JWT_* va POSTGRES_* o'zgaruvchilar CLI uchun ham kerak
npm run migration:run
```

### 3. Migratsiyani generatsiya qiling

```bash
npm run migration:generate -- src/database/migrations/AddEmployeeMiddleName
```

Natija: `src/database/migrations/<timestamp>-AddEmployeeMiddleName.ts`:

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmployeeMiddleName1760000000000 implements MigrationInterface {
    name = 'AddEmployeeMiddleName1760000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "middleName" character varying(100)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "middleName"`);
    }
}
```

`No changes in database schema were found` chiqsa, entity o'zgarishi saqlanmagan yoki baza allaqachon shu holatda.

### 4. Ko'rib chiqing

- `up` faqat kutilgan o'zgarishlarni o'z ichiga oladimi? Generator ba'zan ustun turini qayta yozish (`ALTER COLUMN ... TYPE`) yoki indeksni o'chirib qayta yaratishni qo'shadi; keraksiz qismlarni olib tashlang.
- `NOT NULL` ustun qo'shilayotgan bo'lsa, mavjud qatorlar uchun `DEFAULT` yoki ikki bosqichli migratsiya (nullable qo'shish -> to'ldirish -> NOT NULL) kerak, aks holda production da `up` tushadi.
- Enum ga qiymat qo'shish: PostgreSQL da `ALTER TYPE "public"."tasks_status_enum" ADD VALUE 'ON_HOLD'` tranzaksiya ichida bajarilmaydi (`run-migrations.ts` har migratsiyani `transaction: 'each'` bilan bajaradi). Generator yangi enum yaratib, ustunni ko'chiradi, eski turni o'chiradi - bu tranzaksiyada ishlaydi, lekin katta jadvalda sekin. Ikkalasini ham ko'rib chiqing.
- Ma'lumot migratsiyasi (`UPDATE ... SET`) kerak bo'lsa, uni shu faylga `up` ichiga yozing, `down` da teskarisini ko'rsating.
- `down` haqiqatan teskari amal qiladimi? Revert sinovdan o'tkaziladi (5-qadam).

### 5. Lokal sinov

```bash
npm run migration:run          # up
npm run migration:revert       # oxirgisini qaytaradi (down)
npm run migration:run          # yana up
npm run build                  # dist/database/migrations/*.js kompilyatsiya bo'lishini tasdiqlaydi
```

### 6. Commit

Bitta commit ichida: entity, DTO va service o'zgarishlari, migratsiya fayli, [database.md](database.md) yangilanishi (yangi ustun jadvalda), kerak bo'lsa `docs/api.md` qayta generatsiyasi.

## Konteynerda qo'llanish

Backend `Dockerfile` `npm run build` bilan `dist/` ga kompilyatsiya qiladi; migratsiyalar `dist/database/migrations/*.js` ko'rinishida image ichiga kiradi. Konteyner CMD `npm run start:prod`:

```text
node dist/database/run-migrations.js   -> AppDataSource.runMigrations({ transaction: 'each' })
                                          stdout: "Applied migration <Name>" yoki "Database schema is up to date"
                                          xato: stderr "Migration failed: ..." va exit 1
node dist/database/seed.js             -> organization_settings va superadmin (idempotent)
node dist/main.js                      -> API
```

Yangi migratsiya deploy qilish:

```bash
docker compose up -d --build backend
docker compose logs backend | grep -E "Applied migration|up to date|Migration failed"
```

Bir nechta backend replikasi bir vaqtda ishga tushsa, ikkalasi ham `runMigrations` ni chaqiradi; TypeORM `typeorm_migrations` yozuvi bo'yicha ikkinchisida qo'llamaydi, lekin DDL to'qnashuvi ehtimoli bor. Ko'p replikali deploy da avval bitta replikani ishga tushiring.

## Revert

```bash
# Lokal
npm run migration:revert

# Konteynerda (dist dan): typeorm CLI yo'q, shuning uchun qisqa skript
docker compose exec backend node -e "
const { AppDataSource } = require('./dist/database/data-source');
AppDataSource.initialize().then(async (ds) => { await ds.undoLastMigration({ transaction: 'each' }); await ds.destroy(); });
"
```

Revert faqat oxirgi qo'llangan migratsiyani qaytaradi. Production da revertdan oldin [docker.md](docker.md) dagi `pg_dump` bilan backup oling. Ma'lumot yo'qotadigan `down` (ustun o'chirish) qaytarib bo'lmaydi.

## Qoidalar

1. Qo'llangan (commit qilingan va biror muhitda bajarilgan) migratsiyani tahrirlamang. Xato bo'lsa yangi migratsiya yozing.
2. Migratsiya fayllarini qayta nomlamang va o'chirmang - `typeorm_migrations` dagi nom bilan mos kelmasa TypeORM ularni "qo'llanmagan" deb hisoblaydi.
3. Timestamp tartibi = bajarilish tartibi. Branch birlashtirilganda eski timestamp li migratsiya keyin kelsa ham TypeORM qo'llanmaganlarini timestamp bo'yicha bajaradi; bir-biriga bog'liq migratsiyalarda tartibni tekshiring.
4. Migratsiyada entity klasslarini import qilmang (keyinchalik entity o'zgarsa migratsiya buziladi); faqat `queryRunner.query` yoki `queryRunner` API dan foydalaning.
5. Seed ma'lumotini migratsiyaga yozmang - seed `seed.ts` da, idempotent.
6. MongoDB uchun migratsiya mexanizmi yo'q. Mongoose sxemasiga maydon qo'shilsa `default` bering; eski hujjatlarni ommaviy yangilash kerak bo'lsa, bir martalik skriptni `mongosh` orqali bajaring va uni PR tavsifida hujjatlang.
7. `docs/database.md` ni migratsiya bilan birga yangilang.
