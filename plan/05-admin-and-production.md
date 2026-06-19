# 05 — Admin, Course Authoring, and Production Hardening

## Goal

Make course additions repeatable and prepare the private beta for production deployment.

## Course authoring MVP

Start with a seed-file or script-based workflow before building an admin UI.

Required authoring capabilities:

- Create/update course metadata.
- Add modules.
- Add lessons with YouTube embed URLs.
- Set `draft`, `beta`, or `published` status.
- Validate embed URLs.
- Invalidate static course cache after content changes.

Optional later admin endpoints:

- `POST /api/v1/admin/courses`
- `PATCH /api/v1/admin/courses/{id}`
- `POST /api/v1/admin/courses/{id}/modules`
- `POST /api/v1/admin/modules/{id}/lessons`
- `POST /api/v1/admin/cache/invalidate`

Admin routes must require session + admin permission, not just beta access.

## Testing

Add tests for:

- Better Auth/session integration boundaries.
- Beta allowlist behavior.
- Backend access guards.
- Course list/detail APIs.
- YouTube embed validation.
- Course cache hit/miss behavior.
- Progress percentage calculations.
- Progress idempotency.

## Observability

Track/log:

- auth validation failures;
- beta access denied events;
- course cache hit/miss;
- progress write failures;
- slow API responses;
- Redis/Postgres connectivity issues.

Keep logs privacy-aware. Do not log secrets, raw cookies, or sensitive session data.

## Production security

- Use HTTPS.
- Enable secure cookies.
- Restrict `TRUSTED_ORIGINS` to real frontend/backend origins.
- Keep `.env` secrets out of git.
- Validate all server-side route access.
- Sanitize and validate YouTube embed URLs.
- Keep CORS/CSRF settings explicit.

## Deployment documentation

Document:

- service env vars;
- migration commands;
- startup commands;
- health check URLs;
- cache/Redis requirements;
- Postgres requirements;
- Google OAuth redirect URLs;
- beta allowlist management workflow.

## Deliverable

A private beta deployment that is secure, observable, and easy to update with new YouTube-based courses.

## Done checks

- Course content can be added through the documented MVP workflow.
- Cache invalidation works after course edits.
- Production env checklist is complete.
- Relevant tests pass.
- Deployment README/docs are updated.
