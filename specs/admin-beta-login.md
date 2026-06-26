**What needs to be done**:
Move auth from allowing any valid Better Auth user to create/use a login session to allowing login only for active beta-access users, with a Google-provider exception that automatically grants `brian.oliveira100@gmail.com` active beta access and full Better Auth admin access when he signs in.

**Risk level**: high
This touches authentication hooks/session creation, beta-access shared state, Better Auth admin privileges, and login behavior contracts.

**Stack & tooling**:
- Language/Framework: TypeScript + Hono + Better Auth for `auth_service`; TypeScript + React 19 + TanStack Start only if frontend copy/UX needs adjustment
- Test runner: Node test via `tsx --test`; TypeScript compiler; Bun/Biome only if frontend files change
- Verification command: `cd auth_service && npm run test && npm run typecheck && npm run build`
- If unsure about versions, check `auth_service/package.json` and `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide service ownership, Better Auth requirements, beta-access rules, admin/security expectations, and verification commands
- `plan/README.md` — plan index and cross-cutting constraints
- `plan/01-auth-and-beta.md` — canonical beta allowlist and Better Auth ownership guidance
- `specs/beta-request-approval.md` — existing approval workflow that writes active beta access
- `specs/protected-routes.md` — current frontend login/session guard assumptions
- `auth_service/package.json` — scripts and dependency versions
- `auth_service/src/auth.ts` — Better Auth configuration, Google provider, admin plugin, and the right place for auth hooks/middleware
- `auth_service/src/beta-access.ts` — `beta_access` schema, email normalization/status logic, and access endpoint behavior
- `auth_service/src/index.ts` — route mounting order and public beta/admin routes
- `auth_service/src/auth-client.ts` — current Better Auth admin client plugin usage
- `auth_service/test/beta-access.test.ts` — existing test style and fake DB pattern
- Better Auth docs or installed package references for `hooks`, `databaseHooks`, and the `admin` plugin — confirm the supported API before changing auth/session behavior
- `frontend-react/src/components/sign-in-dialog.tsx` and `frontend-react/src/lib/auth-session.ts` — read only if changing login error copy or session UX

**Architecture context**:
`auth_service` owns Better Auth identity/session state and the app-owned `beta_access` allowlist; do not reimplement auth in Go or trust client-provided user ids. Beta gating must be enforced server-side before a non-admin user receives or keeps a usable session. If Better Auth’s admin plugin role schema/API differs from assumptions, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `auth_service/src/auth.ts` — add/adjust Better Auth hooks or database hooks to block non-beta login and grant the Google admin exception
- `auth_service/src/beta-access.ts` — add reusable beta/admin helper functions, ensure lowercase email handling, and link/update `beta_access` for the admin exception
- `auth_service/test/` — add focused tests for denied non-beta login logic, active beta login allowance, and Google admin auto-grant behavior
- `auth_service/README.md` — document the beta-login gate and fixed Google admin bootstrap behavior if behavior changes are user-visible
- `auth_service/package.json` and `auth_service/package-lock.json` — change only if a test helper or Better Auth-supported integration requires it
- `frontend-react/src/components/sign-in-dialog.tsx` — update only if current copy becomes misleading after non-beta users are blocked at login

---

**Confidence check** (do this before step 1):
Restate that users without `beta_access.status = 'active'` must not be able to complete login, while active beta users can log in normally. Confirm that `brian.oliveira100@gmail.com` is a special bootstrap admin only when signing in through Google, and that this path should upsert active beta access plus full Better Auth admin privileges. List assumptions about the Better Auth hook point, how the admin plugin stores/checks admin role, and whether blocking should occur before session creation or immediately invalidate/deny the session; ask before coding if any are unclear.

**Workflow steps**:
1. Map the existing Better Auth sign-in/session lifecycle and identify the supported hook or database-hook point for enforcing beta approval and granting admin status.
2. Extract or add small reusable helpers for normalized email beta checks/upserts and for the fixed Google admin bootstrap, keeping database writes idempotent.
3. Implement the login gate so non-admin users whose normalized email is not `active` in `beta_access` cannot complete email/password or Google login.
4. Implement the admin exception so Google sign-in for `brian.oliveira100@gmail.com` grants/maintains active beta access and full Better Auth admin access without granting that privilege to email/password sign-in or other providers.
5. Add focused automated tests around beta-denied login, active beta login, revoked/invited denial, and Google admin auto-grant/idempotency.
6. Update auth-service docs if needed, then run the verification command and fix issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests still pass (`cd auth_service && npm run test && npm run typecheck && npm run build`)
- [ ] Type checks pass
- [ ] Better Auth remains configured only in `auth_service`
- [ ] Existing `/api/auth/*`, `/api/auth/ok`, `/api/beta/access`, beta request, and approval-link routes remain available
- [ ] Email addresses are normalized to lowercase before beta/admin checks
- [ ] New users default to no private/login access unless approved, except the fixed Google admin bootstrap
- [ ] `brian.oliveira100@gmail.com` receives full admin access only for Google-provider login, not merely because a client claims that email
- [ ] No secrets or real `.env` values are committed
- [ ] No Go backend schema/API changes are introduced for this chore

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd auth_service && npm run test && npm run typecheck && npm run build`
- Expected output: all auth-service tests pass, TypeScript typecheck/build succeed, and no new warnings from touched code
- Observable state: a non-approved user cannot complete login; an active beta user can log in; Google login as `brian.oliveira100@gmail.com` is idempotently added/kept as active beta and full admin; grep/tests show no bypass based on client-provided user id or provider claims.
