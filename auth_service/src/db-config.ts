import type pg from "pg";

const POSTGRES_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function normalizeDatabaseSchema(value: string | undefined) {
  const schema = (value ?? "app").trim();
  if (!schema) {
    throw new Error("DATABASE_SCHEMA must not be empty");
  }
  if (!POSTGRES_IDENTIFIER.test(schema)) {
    throw new Error("DATABASE_SCHEMA must be a valid PostgreSQL identifier");
  }
  return schema;
}

export function quotePostgresIdentifier(identifier: string) {
  if (!POSTGRES_IDENTIFIER.test(identifier)) {
    throw new Error("Invalid PostgreSQL identifier");
  }
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function buildSearchPathOption(schema: string) {
  return `-c search_path=${schema},public`;
}

export function buildPoolConfig(params: {
  connectionString: string | undefined;
  schema: string;
  max?: string | number;
  idleTimeoutMillis?: string | number;
  connectionTimeoutMillis?: string | number;
}): pg.PoolConfig {
  return {
    connectionString: params.connectionString,
    max: Number(params.max ?? 10),
    idleTimeoutMillis: Number(params.idleTimeoutMillis ?? 30_000),
    connectionTimeoutMillis: Number(params.connectionTimeoutMillis ?? 10_000),
    options: buildSearchPathOption(params.schema),
  };
}
