import { AppDataSource } from './data-source';

const run = async () => {
  await AppDataSource.initialize();
  const executed = await AppDataSource.runMigrations({ transaction: 'each' });
  for (const migration of executed) {
    process.stdout.write(`Applied migration ${migration.name}\n`);
  }
  if (executed.length === 0) {
    process.stdout.write('Database schema is up to date\n');
  }
  await AppDataSource.destroy();
};

run().catch((error) => {
  process.stderr.write(`Migration failed: ${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
