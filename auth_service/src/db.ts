import pg from "pg";
import { buildPoolConfig, normalizeDatabaseSchema, quotePostgresIdentifier } from "./db-config.js";
import { env } from "./env.js";

export const databaseSchema = normalizeDatabaseSchema(env.databaseSchema);

export const db = new pg.Pool(
  buildPoolConfig({
    connectionString: env.databaseUrl,
    schema: databaseSchema,
    max: process.env.PG_POOL_MAX,
    idleTimeoutMillis: process.env.PG_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: process.env.PG_CONNECTION_TIMEOUT_MS,
  }),
);

export async function ensureDatabaseSchema() {
  const bootstrapPool = new pg.Pool({
    connectionString: env.databaseUrl,
    max: 1,
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30_000),
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS ?? 10_000),
  });

  try {
    await bootstrapPool.query(`CREATE SCHEMA IF NOT EXISTS ${quotePostgresIdentifier(databaseSchema)}`);
  } finally {
    await bootstrapPool.end();
  }
}

export async function closeDb() {
  await db.end();
}
