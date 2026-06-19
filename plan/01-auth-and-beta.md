# 01 — Auth and Beta Access

## Goal

Use Better Auth for all authentication and gate private LMS content to selected beta users.

## Auth service tasks

- Configure Better Auth in `auth_service/` only.
- Enable email/password authentication.
- Enable Google sign-in with:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- Require env vars:
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL`
  - `TRUSTED_ORIGINS`
  - `DATABASE_URL`
- Enable secure cookies in production.
- Enable rate limiting.
- Persist sessions or use an intentional Better Auth secondary storage strategy.
- Run migrations after Better Auth config/schema/plugin changes:

```bash
cd auth_service
npm run auth:migrate
```

## Beta access model

Preferred initial approach:

- Add an app-owned `beta_access` table keyed by normalized email and/or Better Auth user id.
- Normalize all emails to lowercase.
- New users default to no beta/private access.
- Google sign-in users must still pass beta allowlist checks.

Minimum fields:

- `id`
- `email`
- `user_id` nullable until first login/link
- `status`: `invited`, `active`, `revoked`
- `created_at`
- `updated_at`

## Backend tasks

- Add middleware/client code that validates the Better Auth session.
- Add beta access guard for private LMS routes.
- Do not trust client-provided user ids.
- Add `GET /api/v1/me/access` or equivalent to expose access state to the frontend.

## Frontend tasks

- Add Better Auth client integration against `auth_service`.
- Preserve cookies/credentials in browser requests.
- Build:
  - sign-in/sign-up page;
  - Google sign-in button;
  - beta pending/access denied screen;
  - protected app shell.

## Deliverable

Selected beta users can sign in and access protected LMS screens. Non-beta users can sign in but cannot access private course content.

## Done checks

- `GET /api/auth/ok` returns `{ "status": "ok" }`.
- Google sign-in works in local/dev environment when credentials are present.
- Backend rejects unauthenticated users.
- Backend rejects authenticated but non-beta users.
- Frontend shows a clear beta pending state.
