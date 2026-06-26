# 00 — Foundation

## Goal

Make the monorepo easy to run and keep service responsibilities clear before feature work begins.

## Scope

- Confirm local service origins:
  - Frontend: `http://localhost:5173`
  - Auth service: `http://localhost:3000`
  - Backend: `http://localhost:8080`
- Align `.env.example` files across services.
- Decide how `backend-go` validates Better Auth sessions:
  - preferred: forward cookie/session token to auth service validation endpoint;
  - acceptable: signed bearer/JWT only if Better Auth config explicitly supports it.
- Document service responsibilities in READMEs when changed.
- Keep route conventions stable:
  - backend business routes: `/api/v1/*`
  - backend operational routes: `/health`, `/scalar`, `/swagger/*`
  - auth routes: `/api/auth/*`

## Service boundaries

### `auth_service/`

Owns identity, sessions, OAuth, Better Auth migrations, and beta access source of truth. It uses the same PostgreSQL database and `public` schema as `backend-go` so auth-owned and LMS-owned tables live together while code ownership stays separate.

### `backend-go/`

Owns LMS business data: courses, modules, lessons, enrollments, progress, cache, OpenAPI docs.

### `frontend-react/`

Owns user experience: landing, auth flow, dashboard, course pages, lesson player, client caching.

## Development environment

The canonical local-development entrypoint lives at the repository root:

```bash
./dev.sh
```

It prioritizes hot reload where the stack supports it:

- Frontend: Vite/TanStack dev server on `http://localhost:5173` with hot reload.
- Auth service: `tsx watch` on `http://localhost:3000` with TypeScript reload.
- Backend: `go run ./cmd/server` on `http://localhost:8080`; restart the script after Go source changes.
- Infrastructure: Postgres, Redis, and OpenTelemetry collector via `backend-go/docker-compose.yml`.

The script creates missing local `.env` files, installs missing JavaScript dependencies, points both backend and auth service at the same local Postgres database/public schema, and applies backend/Better Auth migrations. Useful flags:

```bash
./dev.sh --no-install
./dev.sh --no-migrate
./dev.sh --help
```

Health checks:

```bash
curl http://localhost:8080/health
curl http://localhost:3000/api/auth/ok
```

Stop app processes with `Ctrl+C`. Docker infrastructure is intentionally left running for faster restarts; remove it with:

```bash
cd backend-go && docker compose down -v
```

## Deliverables

- All services run locally.
- Health checks pass.
- `.env.example` files include required variables.
- Integration approach between backend and auth service is documented.
- Root `./dev.sh` starts the full development environment with hot reload for frontend/auth and fast Go startup.

## Done checks

```bash
cd auth_service && npm run typecheck
cd backend-go && make test
cd frontend-react && bun --bun run check
```
