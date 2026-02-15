import { loadConfiguration } from '../config/configuration';
import { UserRole } from '../common/enums';
import { hashPassword } from '../common/utils/password.util';
import { OrganizationSettings } from '../modules/organization/entities/organization-settings.entity';
import { User } from '../modules/users/entities/user.entity';
import { AppDataSource } from './data-source';

const seed = async () => {
  const config = loadConfiguration();
  await AppDataSource.initialize();

  const settingsRepository = AppDataSource.getRepository(OrganizationSettings);
  const existingSettings = await settingsRepository.findOne({ where: { id: 1 } });
  if (!existingSettings) {
    await settingsRepository.save(
      settingsRepository.create({ id: 1, name: 'Xodimlar HRMS', description: 'Xodimlarni boshqarish tizimi', reportDeadlineHour: config.reportReminderHour }),
    );
    process.stdout.write('Seeded organization settings\n');
  }

  const userRepository = AppDataSource.getRepository(User);
  const existingSuperadmin = await userRepository
    .createQueryBuilder('user')
    .where('LOWER(user.login) = LOWER(:login)', { login: config.seed.superadminLogin })
    .getOne();
  if (!existingSuperadmin) {
    await userRepository.save(
      userRepository.create({
        login: config.seed.superadminLogin,
        passwordHash: await hashPassword(config.seed.superadminPassword),
        role: UserRole.SUPERADMIN,
        fullName: 'Super Administrator',
        position: 'System owner',
        mustChangePassword: false,
      }),
    );
    process.stdout.write(`Seeded superadmin account ${config.seed.superadminLogin}\n`);
  } else {
    process.stdout.write('Superadmin account already exists\n');
  }

  await AppDataSource.destroy();
};

seed().catch((error) => {
  process.stderr.write(`Seed failed: ${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
