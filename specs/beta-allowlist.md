**What needs to be done**:
Move beta allowlist management from hardcoded/frontend-demo and legacy placeholder paths to the `auth_service` beta engine as the single source of truth:
1. Add/read/update allowlist entries through `auth_service` endpoints backed by `beta_access`.
2. Make the frontend admin allowlist panel load real entries and update statuses via those endpoints instead of `betaUsers` demo data.
3. Ensure admin-only allowlist mutations are enforced server-side through Better Auth admin/session checks.

**Risk level**: high
This touches auth-owned shared state, admin authorization, frontend-admin API contracts, and beta login/access behavior.

**Stack & tooling**:
- Language/Framework: TypeScript + Hono + Better Auth for `auth_service`; TypeScript + React 19 + TanStack Start for frontend admin UI
- Test runner: Node test via `tsx --test`; TypeScript compiler; Bun/Biome for frontend checks
- Verification command: `cd auth_service && npm run test && npm run typecheck && npm run build && cd ../frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `auth_service/package.json` and `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide auth ownership, beta-access rules, admin/security expectations, and verification commands
- `design.md` — frontend visual system to preserve if changing the admin allowlist UI
- `plan/README.md` — plan index and cross-cutting service boundaries
- `plan/01-auth-and-beta.md` — canonical Better Auth and beta allowlist guidance
- `plan/05-admin-and-production.md` — admin workflow, tests, and production-hardening expectations
- `specs/admin-beta-login.md` — current login gate and Google bootstrap admin behavior built on `beta_access`
- `specs/beta-request-approval.md` — approval workflow that writes active beta access
- `auth_service/package.json` — scripts, Better Auth version, and test command
- `auth_service/src/auth.ts` — Better Auth config, admin plugin, session hook, and available auth/session APIs
- `auth_service/src/beta-access.ts` — `beta_access` schema, normalization helpers, login gate helpers, and current allowlist upsert route
- `auth_service/src/index.ts` — route mounting, CORS, and current beta route registration
- `auth_service/test/beta-access.test.ts` — existing test style and fake DB pattern
- `auth_service/README.md` — documented beta access behavior and public/admin curl examples
- `frontend-react/package.json` — frontend scripts and dependency versions
- `frontend-react/src/routes/admin.tsx` — current hardcoded allowlist panel and protected admin page
- `frontend-react/src/lib/backend-api.ts` — existing auth-service beta request client pattern
- `frontend-react/src/lib/auth-client.ts` and `frontend-react/src/lib/auth-session.ts` — Better Auth client/session conventions
- `frontend-react/src/lib/lms-data.ts` — current demo `betaUsers` source that should no longer drive allowlist management if real data is wired

**Architecture context**:
`auth_service` owns Better Auth identity/session state and the app-owned `beta_access` allowlist. Frontend admin UI may call auth-service APIs for UX, but mutations and reads of private/admin allowlist data must be authorized server-side and must not trust client-provided user ids or roles. If Better Auth admin plugin APIs or current route/session mechanics do not support reliable admin checks, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `auth_service/src/beta-access.ts` — add allowlist list/update helpers, admin authorization helpers, normalized DTOs, and tests seams
- `auth_service/src/index.ts` — register any new allowlist routes and preserve existing route order/CORS behavior
- `auth_service/test/` — add focused tests for listing, creating/updating, status validation, lowercase normalization, and admin-only enforcement helpers
- `auth_service/README.md` — document real allowlist endpoints, admin requirements, and manual verification curls
- `frontend-react/src/routes/admin.tsx` — replace demo allowlist display/form with real auth-service allowlist data and mutations while preserving the design
- `frontend-react/src/lib/backend-api.ts` — add typed auth-service allowlist client helpers if this is the existing API-client home
- `frontend-react/src/lib/lms-data.ts` — remove or stop exporting demo `betaUsers` only if no longer used
- `frontend-react/src/components/` — add a small focused admin allowlist component only if needed to keep `admin.tsx` readable

---

**Confidence check** (do this before step 1):
Restate that `beta_access` in `auth_service` must become the real beta allowlist source of truth, and that the admin page should no longer manage/display hardcoded `betaUsers`. Confirm that allowlist mutations must require a valid Better Auth admin session server-side, while public beta request and approval routes must keep their existing behavior. List assumptions about the auth-service endpoints to expose, how the Better Auth admin role is checked, and whether the frontend can call `auth_service` directly with credentials; ask before coding if any assumption is unclear.

**Workflow steps**:
1. Map the current allowlist paths: hardcoded frontend `betaUsers`, existing `POST /api/beta/allowlist`, beta request approval writes, and login/session checks against `beta_access`.
2. Design the auth-service allowlist API contract for listing entries and creating/updating statuses, including normalized email, optional linked `user_id`, status values, timestamps, and consistent error envelopes.
3. Implement server-side admin authorization for allowlist reads/mutations using Better Auth session/admin role data, without changing public beta request routes or login gate semantics.
4. Wire the frontend admin allowlist panel to fetch and mutate real auth-service allowlist entries, preserving existing route protection, credentials/cookies, loading/error states, and the dark border-first design.
5. Add focused auth-service tests for allowlist behavior and update frontend types/helpers so checks catch contract drift.
6. Update docs, then run the verification command and fix issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests still pass (`cd auth_service && npm run test && npm run typecheck && npm run build && cd ../frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] Better Auth remains configured only in `auth_service`
- [ ] Existing `/api/auth/*`, `/api/auth/ok`, `/api/beta/access`, public beta request, and approval-link routes remain available
- [ ] Public beta request submission remains unauthenticated and does not grant active access until approval
- [ ] Email addresses are normalized to lowercase before persistence, lookup, or display from the API
- [ ] Only `invited`, `active`, and `revoked` beta statuses are accepted
- [ ] Non-admin users cannot list or mutate the allowlist, even if they can reach the frontend admin route or craft HTTP requests
- [ ] Active beta login behavior and the Google bootstrap admin exception from `specs/admin-beta-login.md` continue to work
- [ ] No secrets or real `.env` values are committed
- [ ] No Go backend schema/API changes are introduced unless you stop and confirm the legacy route must be kept as a proxy

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd auth_service && npm run test && npm run typecheck && npm run build && cd ../frontend-react && bun --bun run check && bun --bun run build`
- Expected output: all auth-service tests pass, TypeScript typecheck/build succeed, frontend check/build succeed, and no new warnings from touched code
- Observable state: admin allowlist UI displays real `beta_access` rows from `auth_service`; admin can invite/activate/revoke normalized emails through auth-service endpoints; non-admin requests to those endpoints are rejected; grep shows the admin allowlist no longer depends on demo `betaUsers` data.
