export type StorageDriverName = 'local' | 's3';

export interface S3Config {
  endpoint: string | undefined;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  forcePathStyle: boolean;
}

export interface AppConfig {
  port: number;
  mongoUri: string;
  jwtAccessSecret: string;
  corsOrigins: string[];
  storageDriver: StorageDriverName;
  localStoragePath: string;
  publicBaseUrl: string;
  maxFileSizeMb: number;
  maxFileSizeBytes: number;
  s3: S3Config;
}

const readString = (name: string, fallback: string): string => {
  const value = process.env[name];
  return value !== undefined && value.trim() !== '' ? value.trim() : fallback;
};

const readOptionalString = (name: string): string | undefined => {
  const value = process.env[name];
  return value !== undefined && value.trim() !== '' ? value.trim() : undefined;
};

const readRequiredString = (name: string): string => {
  const value = readOptionalString(name);
  if (value === undefined) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
};

const readPositiveInteger = (name: string, fallback: number): number => {
  const raw = readOptionalString(name);
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer`);
  }
  return parsed;
};

const readBoolean = (name: string, fallback: boolean): boolean => {
  const raw = readOptionalString(name);
  if (raw === undefined) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
};

const readStorageDriver = (): StorageDriverName => {
  const raw = readString('STORAGE_DRIVER', 'local').toLowerCase();
  if (raw !== 'local' && raw !== 's3') {
    throw new Error('Environment variable STORAGE_DRIVER must be "local" or "s3"');
  }
  return raw;
};

const readCorsOrigins = (): string[] =>
  readString('CORS_ORIGINS', 'http://localhost:3002')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

export const configuration = (): AppConfig => {
  const storageDriver = readStorageDriver();
  const maxFileSizeMb = readPositiveInteger('MAX_FILE_SIZE_MB', 10);
  const s3: S3Config = {
    endpoint: readOptionalString('S3_ENDPOINT'),
    region: readString('S3_REGION', 'us-east-1'),
    bucket: storageDriver === 's3' ? readRequiredString('S3_BUCKET') : readString('S3_BUCKET', ''),
    accessKey: storageDriver === 's3' ? readRequiredString('S3_ACCESS_KEY') : readString('S3_ACCESS_KEY', ''),
    secretKey: storageDriver === 's3' ? readRequiredString('S3_SECRET_KEY') : readString('S3_SECRET_KEY', ''),
    forcePathStyle: readBoolean('S3_FORCE_PATH_STYLE', false),
  };

  return {
    port: readPositiveInteger('PORT', 3001),
    mongoUri: readString('MONGO_URI', 'mongodb://localhost:27017/hrms_files'),
    jwtAccessSecret: readRequiredString('JWT_ACCESS_SECRET'),
    corsOrigins: readCorsOrigins(),
    storageDriver,
    localStoragePath: readString('LOCAL_STORAGE_PATH', '/data/uploads'),
    publicBaseUrl: stripTrailingSlash(readString('PUBLIC_BASE_URL', 'http://localhost:3001')),
    maxFileSizeMb,
    maxFileSizeBytes: maxFileSizeMb * 1024 * 1024,
    s3,
  };
};

export default configuration;
