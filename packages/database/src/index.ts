import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export * from './schema.js';

export function createDatabaseClient(connectionString?: string) {
  const url = connectionString || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mediaflow';
  const queryClient = postgres(url, { max: 10 });
  return drizzle(queryClient, { schema });
}
