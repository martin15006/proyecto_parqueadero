import 'reflect-metadata';
import * as path from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

dotenv.config({
  path: path.resolve(__dirname, '..', '.env'),
});

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: String(process.env.DB_PASSWORD || ''),
  database: process.env.DB_NAME || 'parqueadero',
  entities: [path.join(__dirname, '/**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '/migrations/*{.ts,.js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  migrationsRun: false,
  migrationsTableName: 'migrations_history',
  namingStrategy: new SnakeNamingStrategy(),
});