export interface AppConfig {
  nodeEnv: string;
  port: number;
  timezone: string;
  corsOrigins: string[];
  postgres: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  mongoUri: string;
  jwt: {
    accessSecret: string;
    accessTtl: number;
    refreshSecret: string;
    refreshTtl: number;
  };
  fileService: {
    internalUrl: string;
    publicUrl: string;
  };
  reportReminderHour: number;
  seed: {
    superadminLogin: string;
    superadminPassword: string;
  };
}

const requireEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable ${key}`);
  }
  return value;
};

const toInt = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const loadConfiguration = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'production',
  port: toInt(process.env.PORT ?? '3000', 3000),
  timezone: process.env.TZ ?? 'Asia/Tashkent',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3002')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  postgres: {
    host: requireEnv('POSTGRES_HOST', 'localhost'),
    port: toInt(process.env.POSTGRES_PORT ?? '5432', 5432),
    user: requireEnv('POSTGRES_USER', 'hrms'),
    password: requireEnv('POSTGRES_PASSWORD', 'hrms_secret'),
    database: requireEnv('POSTGRES_DB', 'hrms'),
  },
  mongoUri: requireEnv('MONGO_URI', 'mongodb://localhost:27017/hrms'),
  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    accessTtl: toInt(process.env.JWT_ACCESS_TTL ?? '900', 900),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    refreshTtl: toInt(process.env.JWT_REFRESH_TTL ?? '2592000', 2592000),
  },
  fileService: {
    internalUrl: process.env.FILE_SERVICE_URL ?? 'http://localhost:3001',
    publicUrl: process.env.FILE_SERVICE_PUBLIC_URL ?? 'http://localhost:3001',
  },
  reportReminderHour: toInt(process.env.REPORT_REMINDER_HOUR ?? '17', 17),
  seed: {
    superadminLogin: process.env.SEED_SUPERADMIN_LOGIN ?? 'superadmin01',
    superadminPassword: process.env.SEED_SUPERADMIN_PASSWORD ?? 'superadmin01',
  },
});
