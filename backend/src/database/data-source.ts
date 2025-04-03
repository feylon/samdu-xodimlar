import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { loadConfiguration } from '../config/configuration';
import { ENTITIES } from './entities';

const config = loadConfiguration();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: config.postgres.host,
  port: config.postgres.port,
  username: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.database,
  entities: ENTITIES,
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
};

export const AppDataSource = new DataSource(dataSourceOptions);
