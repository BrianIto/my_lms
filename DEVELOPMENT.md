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

Stop the app processes with `Ctrl+C`. Docker infra is intentionally left running for faster restarts. To remove it:

```bash
cd backend-go && docker compose down -v
```
