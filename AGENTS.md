# AGENTS.md

Guidance for agents working on this LMS monorepo. The product is a Learning Management System for a course, split into:

- `frontend-react/` — TanStack Start React app, shadcn/ui, Tailwind, TanStack Router/Query/Form.
- `backend-go/` — Go API for LMS domain data, progress, course catalog, caching, and operational endpoints.
- `auth_service/` — standalone TypeScript Hono service using Better Auth for identity and sessions.

Always read `design.md` before implementing UI. The visual direction is dark, precise, technical, motion-rich, and quietly premium.

## Plan references

The implementation plan is split by work area under `plan/`. Before changing code, read `plan/README.md` and then the specific plan file for the task:

- Foundation, env vars, local service boundaries: `plan/00-foundation.md`
- Better Auth, Google sign-in, beta access, auth/session gates: `plan/01-auth-and-beta.md`
- Course schema, YouTube embed content, catalog APIs, Redis cache: `plan/02-course-catalog-and-cache.md`
- Lesson player, progress schema, percentage tracking: `plan/03-progress-and-player.md`
- Frontend screens, styling, motion, `design.md` application: `plan/04-frontend-design.md`
- Course authoring, admin workflow, tests, observability, deployment: `plan/05-admin-and-production.md`

If a task crosses multiple areas, read every relevant plan file and keep the implementation consistent across service boundaries.

## Product principles

- Courses are mostly static and should be cached aggressively.
- A course should be easy to add by metadata plus one or more YouTube iframe/embed links.
- Initial knowledge tracking is progress-based: percentage of watched/marked-complete videos per course.
- Auth must use Better Auth, support email/password and Google sign-in, and gate beta access for selected users.
- Keep the architecture service-oriented: auth owns identity, backend owns LMS business data, frontend composes user experience.
- Use one PostgreSQL database/public schema for local app data; separate ownership by table/service, not by creating a second auth database/schema.

## Repository commands

### Frontend

```bash
cd frontend-react
bun install
bun --bun run dev
bun --bun run build
bun --bun run check
```

### Backend

```bash
cd backend-go
make run
make build
make test
make docs
make sqlc
```

With Docker/Postgres/Redis:

```bash
cd backend-go
docker compose up --build
```

### Auth service

```bash
cd auth_service
npm install
npm run dev
npm run build
npm run typecheck
npm run auth:migrate
```

Verify Better Auth:

```bash
curl http://localhost:3000/api/auth/ok
```

## Architecture contracts

### Auth service owns

- Better Auth configuration and migrations.
- User identity, sessions, accounts, OAuth providers, and trusted origins.
- Google sign-in via `socialProviders.google` using `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Beta access claims/status. Preferred model: add user metadata or an app-owned `beta_access` table keyed by Better Auth user id/email.
- Admin-only user beta allowlisting endpoints if needed.

### Backend owns

- LMS domain models: courses, modules, lessons/videos, enrollments, progress events, aggregate progress.
- Course catalog API and progress API.
- Redis-backed cache for static course/catalog responses.
- Validation that authenticated users have beta access before exposing private course content.
- OpenAPI/Swagger docs for all business routes.

### Frontend owns

- Public landing page, beta access/sign-in flows, dashboard, course detail, and lesson player.
- Better Auth client integration against `auth_service`.
- TanStack Query caching, route loaders, optimistic progress updates where safe.
- UI implementation following `design.md`: black canvas, amber accents, border-based cards, Halant display typography, Atkinson body/UI, tasteful motion.

## Better Auth requirements

Use Better Auth in `auth_service/` only. Do not reimplement authentication in the Go backend.

Required configuration checklist:

- `BETTER_AUTH_SECRET` min 32 chars.
- `BETTER_AUTH_URL` points to the auth service public origin.
- `TRUSTED_ORIGINS` includes frontend and backend origins.
- `DATABASE_URL` is configured.
- `emailAndPassword.enabled = true`.
- `socialProviders.google` configured when Google sign-in is enabled.
- Secure cookies in production.
- Rate limiting enabled.
- Sessions persisted or backed by secondary storage if introduced.
- Run `npm run auth:migrate` after Better Auth config/schema/plugin changes.

Frontend auth client should use `better-auth/client` or framework-specific Better Auth client APIs and preserve credentials/cookies.

## Beta access rules

- Default state for new users: no private course access unless explicitly allowlisted or invited.
- Allowlist by email for early beta users; normalize emails to lowercase.
- Google sign-in users should still be checked against the beta allowlist.
- Public pages may show marketing/course previews; private lesson pages require session + beta access.
- Backend must enforce beta access server-side; frontend gating is UX only.

## Caching strategy

### Cache aggressively

- Course catalog list.
- Course detail structure: modules, lessons, titles, descriptions, durations, YouTube embed URLs.
- Public marketing/course preview metadata.

### Do not cache globally

- Per-user progress.
- Enrollments.
- Session/auth responses.
- Beta access decisions without short TTL and explicit invalidation.

### Recommended cache approach

- Backend Redis keys:
  - `courses:list:v1`
  - `courses:detail:{courseID}:v1`
  - `courses:public-preview:v1`
- TTL for static content: 1h–24h in development/production depending on update frequency.
- Add cache busting/version suffix when course content schema changes.
- Invalidate course keys when course metadata changes.
- Frontend TanStack Query stale times can be long for course catalog/detail and short for progress.

## Course content model

Keep adding a course simple at first. Prefer a seed file, migration seed, or admin-only endpoint with this shape:

```json
{
  "slug": "building-with-ai",
  "title": "Building with AI",
  "description": "A practical course for shipping AI products.",
  "status": "draft|published|beta",
  "modules": [
    {
      "title": "Introduction",
      "lessons": [
        {
          "title": "Welcome",
          "youtubeEmbedUrl": "https://www.youtube.com/embed/VIDEO_ID",
          "durationSeconds": 420
        }
      ]
    }
  ]
}
```

Persist normalized records in Postgres, not raw unvalidated blobs. Validate YouTube embed URLs before saving.

## Progress model

Initial tracking is percent complete:

- Lesson progress states: `not_started`, `in_progress`, `completed`.
- Record `last_position_seconds` if available later; phase 1 may use manual complete.
- Course progress = completed lessons / total lessons * 100.
- Store progress per user, lesson, and course.
- Make progress updates idempotent.

## API conventions

- Backend business API routes live under `/api/v1/*`.
- Operational routes remain unversioned: `/health`, `/scalar`, `/swagger/*`.
- Use structured JSON responses and consistent error envelopes.
- Generate docs after route/DTO changes: `make docs`.
- Auth service routes stay under `/api/auth/*`.

Suggested backend routes:

- `GET /api/v1/courses`
- `GET /api/v1/courses/{slug}`
- `GET /api/v1/courses/{slug}/progress`
- `POST /api/v1/lessons/{lessonID}/progress`
- `GET /api/v1/me/access`

## Frontend design rules

Follow `design.md` exactly:

- Near-black background `#0a0a0a`.
- Restrained amber `#ffba5a` for active states/glow only.
- Border-first cards, minimal heavy fills.
- Halant for display, Atkinson Hyperlegible Next for body/UI.
- Mobile-first layout; use centered mobile and editorial desktop composition.
- Add polished but contained motion; respect reduced motion.
- Avoid generic SaaS gradients, flat white panels, and noisy dashboards.

Key LMS screens:

- Landing/waitlist beta page.
- Sign in/sign up page with Google option.
- Beta pending/access denied screen.
- Dashboard with course cards and progress rings/bars.
- Course detail with module/lesson outline.
- Lesson player page with YouTube iframe and progress controls.

## Security and privacy

- Never commit secrets or real `.env` files.
- Backend must validate session/auth headers/cookies through the auth integration before returning private data.
- Do not trust client-provided user ids.
- Use HTTPS and secure cookies in production.
- Keep YouTube embeds sandboxed where practical and only allow trusted embed hosts.

## Working style

- Prefer small, typed, testable changes.
- Update README/docs when commands, env vars, or architecture change.
- Run relevant checks before finishing.
- Keep generated files (`dist/`, generated route trees, Swagger docs) consistent with project conventions.
