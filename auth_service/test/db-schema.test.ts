import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPoolConfig,
  buildSearchPathOption,
  normalizeDatabaseSchema,
  quotePostgresIdentifier,
} from "../src/db-config.js";

test("auth PostgreSQL pool targets the app schema before public", () => {
  const schema = normalizeDatabaseSchema("app");
  const config = buildPoolConfig({
    connectionString: "postgresql://app:app@localhost:55432/app?sslmode=disable",
    schema,
  });

  assert.equal(config.options, "-c search_path=app,public");
});

test("auth PostgreSQL pool can target a configured application schema", () => {
  const schema = normalizeDatabaseSchema("auth_app");

  assert.equal(buildSearchPathOption(schema), "-c search_path=auth_app,public");
  assert.equal(quotePostgresIdentifier(schema), '"auth_app"');
});

test("auth PostgreSQL schema names reject unsafe identifiers", () => {
  assert.throws(() => normalizeDatabaseSchema("app;drop schema public"), /valid PostgreSQL identifier/);
  assert.throws(() => normalizeDatabaseSchema(""), /must not be empty/);
});
