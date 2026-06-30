## Fix the Bug

**Environment** (1 line): macOS Darwin 27.0.0 arm64, Node.js v22.20.0, npm 10.9.3, Bun 1.3.13, Go 1.25.3, Vite 8.0.16, TypeScript 6.0.3, React 19.2.0, Better Auth 1.6.x/latest, Hono auth service, Go chi backend.

**Actual Behavior**:
After signing in successfully, protected LMS API calls return `401 Unauthorized` from the Go backend with this JSON response:

```json
{ "error": "authentication required" }
```

This happens for protected/private API calls such as:

```txt
GET  https://api.brianito.com/api/v1/courses/{slug}/progress
POST https://api.brianito.com/api/v1/lessons/{lessonID}/progress
GET  https://api.brianito.com/api/v1/admin/courses
```

Public/static LMS routes like `GET /api/v1/courses` and `GET /api/v1/courses/{slug}` may still work because they do not use the backend auth middleware.

The frontend already uses `credentials: "include"` for backend requests and `VITE_API_URL=https://api.brianito.com`, so the request reaches the correct backend host. The failure appears to happen when `backend-go` tries to validate the Better Auth session by forwarding the request cookie to `auth_service`.

Important suspicious production mismatch found during inspection:

- `backend-go/internal/config/config.go` defines `AUTH_SERVICE_URL` with default `http://localhost:3000`.
- `backend-go/internal/handler/auth.go` and `backend-go/internal/handler/admin.go` call `h.authServiceURL + "/api/auth/get-session"`.
- `deploy/docker-compose.prod.yml` does **not** set `AUTH_SERVICE_URL` for the `backend` service.
- In Docker production, `localhost:3000` inside the backend container is not the auth service container. The backend likely cannot reach Better Auth, then returns `401 authentication required`.

**Expected Behavior**:
Authenticated active beta users should be able to call protected LMS APIs from `https://learning.brianito.com`, with cookies/session preserved across subdomains:

```txt
GET  https://api.brianito.com/api/v1/courses/{slug}/progress        -> 200
POST https://api.brianito.com/api/v1/lessons/{lessonID}/progress    -> 200
GET  https://api.brianito.com/api/v1/admin/courses                  -> 200 for admin users, 403 for non-admin authenticated users
```

The Go backend should validate sessions against the real auth service in every environment:

- local/dev: `http://localhost:3000`
- production Docker Compose: internal service URL such as `http://auth:3000` (not browser-public `https://auth.brianito.com` unless intentionally needed)

Unauthenticated users should still receive `401`, and authenticated non-beta users should still receive `403 active beta access required` for beta-protected LMS routes.

**Steps to Reproduce**:
1. Deploy/run production topology with frontend at `https://learning.brianito.com`, backend at `https://api.brianito.com`, and auth service at `https://auth.brianito.com`.
2. Sign in from the frontend as a user that should have active beta access.
3. Open DevTools → Network.
4. Navigate to a protected course/progress/lesson/admin page that triggers a private API call.
5. Observe a backend response like:
   ```http
   HTTP/1.1 401 Unauthorized
   Content-Type: application/json
   ```
   ```json
   { "error": "authentication required" }
   ```
6. In backend logs, check whether auth validation is trying to use `http://localhost:3000/api/auth/get-session` or logs `auth service unreachable` / `admin auth check: auth service unreachable`.

**Key Files**:
- `backend-go/internal/config/config.go` — defines `AUTH_SERVICE_URL`, currently defaulting to `http://localhost:3000`.
- `backend-go/cmd/server/main.go` — passes `cfg.AuthServiceURL` into the HTTP handler.
- `backend-go/internal/handler/auth.go` — beta-protected route middleware forwards cookies to Better Auth `/api/auth/get-session` and `/api/beta/access`.
- `backend-go/internal/handler/admin.go` — admin middleware forwards cookies to Better Auth `/api/auth/get-session`.
- `backend-go/internal/handler/handler.go` — mounts protected progress routes and admin routes, plus CORS behavior.
- `deploy/docker-compose.prod.yml` — production backend service currently needs the correct internal `AUTH_SERVICE_URL` env var.
- `deploy/.env.prod.example` — production env example should document the backend auth-service URL.
- `plan/06-production-deploy.md` — production architecture/env docs should stay aligned with Compose.
- `frontend-react/src/lib/backend-api.ts` — confirms protected frontend API helpers use `credentials: "include"`.
- `frontend-react/src/lib/auth-client.ts` — Better Auth React client config and credentials behavior.
- `frontend-react/src/lib/auth-session.ts` — server-side session check against Better Auth.
- `auth_service/src/auth.ts` — Better Auth config, secure cookies, trusted origins, cross-subdomain cookie config.
- `auth_service/src/cookie-config.ts` — computes `.brianito.com` cross-subdomain cookie domain.
- `auth_service/src/env.ts` — loads `TRUSTED_ORIGINS`, `BETTER_AUTH_URL`, and optional `AUTH_COOKIE_DOMAIN`.

**Already Tried**:
- Fixed the previous frontend production API URL issue so `VITE_API_URL=https://api.brianito.com` is honored and frontend requests no longer fall back to localhost.
- Confirmed `frontend-react/src/lib/backend-api.ts` sends backend requests with `credentials: "include"`.
- Inspected backend auth middleware and found it requires the incoming `Cookie` header, then validates the session by calling `AUTH_SERVICE_URL + /api/auth/get-session`.
- Inspected production Compose and found the backend service does not set `AUTH_SERVICE_URL`, so it uses the default `http://localhost:3000` inside the backend container.
- Confirmed auth service production config includes cross-subdomain cookies via `AUTH_COOKIE_DOMAIN=.brianito.com` and trusted origins include `https://learning.brianito.com`, `https://api.brianito.com`, and `https://auth.brianito.com`.

**Constraints** (do not touch):
- Do not replace Better Auth or reimplement authentication in the Go backend.
- Do not trust client-provided user IDs.
- Do not remove server-side beta access enforcement from the backend.
- Do not make protected progress/admin routes public.
- Do not change backend API contracts under `/api/v1/*`.
- Do not merge services or change the production domains: `learning.brianito.com`, `auth.brianito.com`, `api.brianito.com`.
- Do not expose Postgres or Redis publicly.
- Do not commit real `.env` files or secrets.
- Keep local development working with `AUTH_SERVICE_URL=http://localhost:3000`.

**Success Looks Like**:
- Production `backend` container has `AUTH_SERVICE_URL=http://auth:3000` or another correct internal auth-service URL.
- `GET https://api.brianito.com/health` still returns OK.
- `GET https://auth.brianito.com/api/auth/ok` still returns OK.
- After signing in from `https://learning.brianito.com`, protected backend calls include the Better Auth cookie and return expected status:
  - active beta user: progress routes return `200`.
  - unauthenticated user: protected routes return `401`.
  - authenticated non-beta user: beta-protected routes return `403`.
  - authenticated non-admin user hitting admin routes returns `403`, not `401`.
- Backend logs no longer show auth service validation attempts to `localhost:3000` in production.
- Docs/examples agree on `AUTH_SERVICE_URL` for backend production config.
- Existing backend/auth/frontend tests pass, or any unrelated pre-existing failures are clearly documented.

**Test Coverage**:
Create a test for this bug so it doesn't happen anymore.
After fixing, run the existing test suite. If all pass, generate a regression test that:
1. Reproduces the exact failure condition described above: production backend configuration is loaded without an explicit `AUTH_SERVICE_URL`, or production Compose is rendered without passing one to the backend, causing the backend to use `http://localhost:3000` and reject protected requests with `401 authentication required`.
2. Asserts the expected behavior: production deploy config provides the backend with the correct auth-service URL, and backend protected-route middleware forwards cookies to that configured URL rather than `localhost:3000`.
3. Is placed alongside related tests in one or more of:
   - `backend-go/internal/config/config_test.go` for config default/production behavior;
   - `backend-go/internal/handler/auth_test.go` or existing `backend-go/internal/handler/admin_test.go` for auth forwarding behavior;
   - a deploy config test/script if this repository already has deploy validation conventions.

If any existing tests fail during the fix, try to fix them. At minimum, run:

```bash
cd backend-go && make test
cd auth_service && npm run typecheck && npm run build
cd frontend-react && bun --bun run test && bun --bun run build
```
