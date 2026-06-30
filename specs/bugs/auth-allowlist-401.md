## Fix the Bug

**Environment** (1 line): macOS Darwin 27.0.0 arm64, Node.js v22.20.0, npm 10.9.3, Bun 1.3.13, Go 1.25.3, TypeScript 6.0.x, React 19.2.x, Vite 8.0.x, Better Auth 1.6.x/latest, Hono auth service, Go chi backend.

**Actual Behavior**:
The admin beta allowlist endpoint returns `401 Unauthorized` even though authenticated admin course APIs now work correctly.

Failing request:

```txt
GET https://auth.brianito.com/api/beta/allowlist
```

Response:

```json
{ "error": "authentication required" }
```

Context: `https://api.brianito.com/api/v1/admin/courses` works now, so the user is signed in and admin/backend auth is functioning through `backend-go`. The remaining failure appears isolated to the frontend calling `auth_service` directly for allowlist data. In `auth_service/src/beta-access.ts`, `listBetaAllowlist` calls `requireBetaAllowlistAdmin`, which calls Better Auth `auth.api.getSession({ headers: c.req.raw.headers })`; that session is missing/invalid for the direct browser request to `auth.brianito.com`.

**Expected Behavior**:
An authenticated Better Auth admin user on `https://learning.brianito.com` should be able to load and update the beta allowlist:

```txt
GET  https://auth.brianito.com/api/beta/allowlist -> 200 { "entries": [...] }
POST https://auth.brianito.com/api/beta/allowlist -> 201 { ...entry }
```

Unauthenticated users should still receive `401`, and authenticated non-admin users should receive `403 admin access required`.

**Steps to Reproduce**:
1. Sign in at `https://learning.brianito.com` as an admin user that can successfully load `GET https://api.brianito.com/api/v1/admin/courses`.
2. Open the admin page section that loads the beta allowlist.
3. In DevTools → Network, inspect `GET https://auth.brianito.com/api/beta/allowlist`.
4. Observe `401 Unauthorized` with `{ "error": "authentication required" }`, while `GET https://api.brianito.com/api/v1/admin/courses` returns `200`.

**Key Files**:
- `frontend-react/src/lib/backend-api.ts` — `listBetaAllowlist` and `upsertBetaAllowlistEntry` call `VITE_AUTH_URL/api/beta/allowlist` directly with `credentials: "include"`.
- `frontend-react/src/lib/auth-client.ts` — Better Auth client base URL and credential behavior.
- `frontend-react/src/routes/_protected.admin.tsx` — admin UI that loads and mutates allowlist entries.
- `auth_service/src/beta-access.ts` — `requireBetaAllowlistAdmin` returns the current `401 authentication required` when Better Auth session is absent.
- `auth_service/src/index.ts` — CORS config for `/api/*`, allowed origins, allowed headers, credentials.
- `auth_service/src/auth.ts` — Better Auth session, admin plugin, trusted origins, secure cookie config.
- `auth_service/src/cookie-config.ts` — cross-subdomain cookie domain logic for `.brianito.com`.
- `auth_service/src/env.ts` — loads `BETTER_AUTH_URL`, `TRUSTED_ORIGINS`, and `AUTH_COOKIE_DOMAIN`.
- `frontend-react/.env.example` — documents `VITE_AUTH_URL` and `VITE_API_URL` expectations.
- `deploy/docker-compose.prod.yml` — production auth env values for `BETTER_AUTH_URL`, `AUTH_COOKIE_DOMAIN`, and `TRUSTED_ORIGINS`.
- `auth_service/test/beta-access.test.ts` — existing auth-service tests for beta access and allowlist admin helpers.
- `frontend-react/src/lib/backend-api.test.ts` — existing frontend API URL/credentials tests.

**Already Tried**:
- Fixed the earlier protected backend API `401` issue; `https://api.brianito.com/api/v1/admin/courses` now works.
- Confirmed frontend backend API requests use `credentials: "include"`.
- Confirmed allowlist code also uses `credentials: "include"`, but it calls `https://auth.brianito.com/api/beta/allowlist` directly instead of going through `https://api.brianito.com`.
- Inspected `auth_service/src/beta-access.ts`; the allowlist route requires a valid Better Auth session with an admin role and returns `401` before role checking if `auth.api.getSession` cannot see the session.

**Constraints** (do not touch):
- Do not replace Better Auth or reimplement authentication in the Go backend.
- Do not make `/api/beta/allowlist` public.
- Do not remove the admin-role check for allowlist routes.
- Do not trust client-provided user IDs, emails, or roles.
- Do not change the public backend `/api/v1/*` contracts unless adding a deliberate proxy endpoint is chosen and documented.
- Do not break working `https://api.brianito.com/api/v1/admin/courses` behavior.
- Do not commit real `.env` files or secrets.
- Keep local development working with `VITE_AUTH_URL=http://localhost:3000` and `VITE_API_URL=http://localhost:8080`.

**Success Looks Like**:
- On production, after admin sign-in from `https://learning.brianito.com`:
  - `GET https://api.brianito.com/api/v1/admin/courses` returns `200`.
  - `GET https://auth.brianito.com/api/beta/allowlist` returns `200` with `{ "entries": [...] }`.
  - `POST https://auth.brianito.com/api/beta/allowlist` returns `201` for valid admin updates.
- DevTools shows the allowlist request includes/sends the Better Auth session cookie, or the implementation intentionally routes allowlist through an authenticated backend/server boundary that preserves the session.
- Unauthenticated allowlist requests still return `401`.
- Authenticated non-admin allowlist requests return `403`.
- Relevant docs/env examples are updated if production env values or request routing change.

**Test Coverage**:
Create a test for this bug so it doesn't happen anymore.
After fixing, run the existing test suite. If all pass, generate a regression test that:
1. Reproduces the exact failure condition described above: an authenticated admin context where backend admin courses work, but direct auth-service allowlist session validation returns `401 authentication required` because the Better Auth session is not available to `/api/beta/allowlist`.
2. Asserts the expected behavior: allowlist fetch/mutation succeeds for an authenticated admin and still returns `401` for anonymous users and `403` for non-admin authenticated users.
3. Is placed alongside related tests in:
   - `auth_service/test/beta-access.test.ts` for `requireBetaAllowlistAdmin`/allowlist auth behavior;
   - `frontend-react/src/lib/backend-api.test.ts` for allowlist URL and `credentials: "include"` behavior;
   - add or extend route/integration tests if introducing a backend proxy endpoint.

If any existing tests fail during the fix, try to fix them. At minimum, run:

```bash
cd auth_service && npm run typecheck && npm run build && npm run test
cd frontend-react && bun --bun run test && bun --bun run build
cd backend-go && make test
```
