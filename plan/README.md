# LMS Plan Index

Use these plan files by work area instead of one large plan. Start with this index, then read the most relevant plan before editing code.

## Plan files

- [`00-foundation.md`](./00-foundation.md) — local setup, service boundaries, shared decisions, and done criteria.
- [`01-auth-and-beta.md`](./01-auth-and-beta.md) — Better Auth, Google sign-in, beta allowlist, session validation, access gates.
- [`02-course-catalog-and-cache.md`](./02-course-catalog-and-cache.md) — course/module/lesson model, YouTube embeds, catalog APIs, Redis caching.
- [`03-progress-and-player.md`](./03-progress-and-player.md) — lesson player, progress schema, percentage completion, progress APIs.
- [`04-frontend-design.md`](./04-frontend-design.md) — LMS screens and UI implementation following `../design.md`.
- [`05-admin-and-production.md`](./05-admin-and-production.md) — course authoring MVP, tests, observability, deployment hardening.
- [`06-production-deploy.md`](./06-production-deploy.md) — Traefik/Docker Compose VPS deploy, Vercel frontend, domains, migrations, and OpenTelemetry/Grafana plan.

## Suggested order

1. Foundation
2. Auth and beta access
3. Course catalog and cache
4. Lesson player and progress
5. Frontend design polish
6. Admin/course authoring and production hardening
7. Production deploy

## Cross-cutting rules

- Auth must be implemented with Better Auth in `auth_service/`.
- Backend must enforce beta access server-side for private LMS data.
- Static course data can be cached aggressively; user progress cannot be globally cached.
- UI must follow `../design.md`.
