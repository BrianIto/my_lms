## Fix the Bug

**Environment** (1 line): macOS 27.0; Node v22.20.0; npm 10.9.3; TypeScript 6.0.3; Better Auth 1.6.19; Hono 4.12.26; pg 8.21.0; auth service runs on Node >=20

**Actual Behavior**:
Google sign-in completes successfully in the browser and the user is redirected/authenticated, but when inspecting PostgreSQL there is no user row in the `app` schema. The Better Auth migration has been run / exists, but no authenticated Google user is added to `app.user` / app-scoped Better Auth tables.

No runtime stack trace is currently visible from the UI because the OAuth flow appears successful. The failure is observed only by checking the database after sign-in: the expected user data is absent from the `app` schema.

**Expected Behavior**:
After a successful Google sign-in, Better Auth should persist the user, account, session, and any related auth/plugin rows into the intended application schema (`app`) in the configured PostgreSQL database. Querying the app schema after OAuth callback should show the new user and linked Google account. The beta access table should remain app-owned and continue to work with the signed-in user's normalized email.

**Steps to Reproduce**:
1. Start the local database/auth/frontend stack with Google OAuth env vars configured, run `cd auth_service && npm run auth:migrate`, then start `npm run dev` for the auth service and the frontend.
2. Open the frontend sign-in dialog and click **Sign in with Google**.
3. Complete Google OAuth and confirm the UI redirects to `/dashboard` / shows the signed-in session.
4. Inspect PostgreSQL tables in the `app` schema and notice no Better Auth user/account/session row was inserted there.

**Key Files**:
- `auth_service/src/auth.ts` — Better Auth configuration, `database: db`, Google social provider, session persistence, plugins, and the likely place to set schema/table mapping or adapter options.
- `auth_service/src/db.ts` — creates the `pg.Pool`; likely missing `search_path`/schema handling for the intended `app` schema.
- `auth_service/src/env.ts` — validates `DATABASE_URL`, `BETTER_AUTH_URL`, Google env vars, and trusted origins; do not leak or commit real env values.
- `auth_service/package.json` — scripts for `auth:migrate`, `auth:generate`, `typecheck`, and dependency versions.
- `auth_service/README.md` — currently documents using the shared database/public schema, which may conflict with the current expectation that auth rows live in the `app` schema.
- `auth_service/src/beta-access.ts` — app-owned beta access tables are created via raw SQL; any schema fix must keep beta access checks working.
- `backend-go/internal/db/migrations/001_init.up.sql` — backend currently only creates `pgcrypto`; useful for understanding DB bootstrap.
- `backend-go/internal/db/migrations/002_beta_access_requests.up.sql` — backend migration creates beta request data in the default schema.
- `backend-go/internal/db/migrations/003_drop_legacy_backend_users.up.sql` — intentionally drops a legacy `public.users` table under strict conditions; don't reintroduce backend-owned users.
- `frontend-react/src/lib/auth-client.ts` — frontend Better Auth client base URL used by sign-in.
- `frontend-react/src/components/sign-in-dialog.tsx` — calls `authClient.signIn.social({ provider: "google" })` and redirects to `/dashboard`.

**Already Tried**:
- Google OAuth sign-in itself works from the UI, so provider credentials/callback routing are probably valid.
- Better Auth migration script exists: `npm run auth:migrate` runs `npx @better-auth/cli@latest migrate --config src/auth.ts --yes`.
- Current Better Auth database config passes a raw `pg.Pool` without an explicit schema/search path.
- Current docs say the auth service uses the shared database and `public` schema, but the observed/desired storage location is the `app` schema.

**Constraints** (do not touch):
- Do not reimplement authentication in the Go backend; Better Auth must remain in `auth_service/` only.
- Do not change the frontend sign-in API contract or Better Auth route base path (`/api/auth/*`) unless proven necessary.
- Do not create a second auth database; use the configured `DATABASE_URL` and intended schema in the same PostgreSQL database.
- Do not commit secrets or edit real `.env` values.
- Do not reintroduce legacy backend-owned users in Go migrations.
- Preserve Google sign-in, email/password auth, session persistence, rate limiting, organization/admin/openAPI plugins, and beta access behavior.
- If changing schema/table location, update migrations/docs consistently and avoid destructive changes to existing production data.

**Success Looks Like**:
After the fix, a fresh Google sign-in creates/updates the Better Auth user/account/session rows in the intended `app` schema. A DB query against `app` schema returns the signed-in Google user's email and linked Google account. `GET /api/auth/ok` still returns `{ "status": "ok" }`, `GET /api/beta/access` still resolves the current session, and `cd auth_service && npm run typecheck && npm run build` passes.

**Test Coverage**:
Create a test for this bug to it doesn't happen anymore.
After fixing, run the existing test suite. If all pass, generate a regression test that:
1. Reproduces the exact failure condition described above
2. Asserts the expected behavior
3. Is placed alongside related tests in `auth_service/src` or a new `auth_service/test` directory, whichever fits the project conventions after inspection
If any existing tests fail during the fix, try to fix them.

Recommended regression coverage:
- Add a focused test that initializes the auth DB connection/config for a PostgreSQL URL targeting the `app` schema and asserts Better Auth writes/selects using that schema rather than falling back to `public`.
- If a full OAuth callback is hard to exercise, test the underlying Better Auth/database adapter persistence path with a simulated social account/user creation and assert rows are present under `app`.
- Add a guard around raw SQL helpers such as `ensureBetaAccessTable()` so app-owned tables are also created in the intended schema.

Before coding, read `AGENTS.md`, `plan/README.md`, and `plan/01-auth-and-beta.md`. Inspect the actual database schema/search path and Better Auth generated migration SQL before choosing a fix. After the fix, run:

```bash
cd auth_service
npm run typecheck
npm run build
# Also run the regression test command you add, and any existing test suite if present.
```
