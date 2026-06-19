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

Owns identity, sessions, OAuth, Better Auth migrations, and beta access source of truth.

### `backend-go/`

Owns LMS business data: courses, modules, lessons, enrollments, progress, cache, OpenAPI docs.

### `frontend-react/`

Owns user experience: landing, auth flow, dashboard, course pages, lesson player, client caching.

## Deliverables

- All services run locally.
- Health checks pass.
- `.env.example` files include required variables.
- Integration approach between backend and auth service is documented.

## Done checks

```bash
cd auth_service && npm run typecheck
cd backend-go && make test
cd frontend-react && bun --bun run check
```
