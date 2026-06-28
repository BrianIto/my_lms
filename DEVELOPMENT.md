# Development environment

Use the root script for the full local stack:

```bash
./dev.sh
```

It starts:

- Postgres, Redis, and OpenTelemetry via `backend-go/docker-compose.yml`
- Go backend on `http://localhost:8080` with `go run ./cmd/server`
- Better Auth service on `http://localhost:3000` with `tsx watch`
- Frontend on `http://localhost:5173` with Vite hot reload

Hot reload priorities:

- Frontend changes reload through Vite.
- Auth service TypeScript changes reload through `tsx watch`.
- Go is run directly for fast startup; restart `./dev.sh` after backend Go code changes.

The script creates missing local `.env` files for each service, installs missing JS dependencies, points both backend and auth service at the same local Postgres database/public schema, and applies backend/Better Auth migrations.

Useful flags:

```bash
./dev.sh --no-install   # skip npm/bun install checks
./dev.sh --no-migrate   # skip database migrations
./dev.sh --help
```

Health checks:

```bash
curl http://localhost:8080/health
curl http://localhost:3000/api/auth/ok
```

## Backend tests

Fast backend tests must not require Docker/Postgres/Redis:

```bash
cd backend-go
make test
```

The backend also has required real Postgres integration tests for migrations and repository SQL. Run them against an isolated test database only:

```bash
cd backend-go
make test-integration
```

Integration test requirements:

- Use a dedicated test database such as `lms_test`, never a shared dev/staging/production database.
- Tests run with the `integration` build tag and `BACKEND_INTEGRATION_DATABASE_URL`.
- The integration harness must create a unique per-run schema, run migrations into it, and drop that schema with `DROP SCHEMA ... CASCADE` when the test process exits, whether tests pass or fail.
- If a schema-per-run setup is not possible, tests must use equivalent guaranteed cleanup with test-owned records and final cleanup in `TestMain`.

Stop the app processes with `Ctrl+C`. Docker infra is intentionally left running for faster restarts. To remove it:

```bash
cd backend-go && docker compose down -v
```
