**What needs to be done**:
Move the Sign In Dialog from immediately asking for email + password to an email-first beta-gated flow:
1. Ask only for email first.
2. Check server-side whether the normalized email has active beta access.
3. If the email is not active in `beta_access`, show an access error and do not reveal password/signup state.
4. If active and the user already has an email/password credential, reveal the password input and sign them in.
5. If active and no email/password credential exists yet, ask the user to create a password, create the Better Auth email/password account or credential through supported Better Auth APIs, then log them in.

**Risk level**: high
Touches auth UX, Better Auth account/credential state, beta allowlist checks, login/session behavior, and security-sensitive user enumeration/password creation paths.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router + Better Auth React client; TypeScript + Hono + Better Auth for `auth_service`
- Test runner: Node test via `tsx --test`; TypeScript compiler; Bun/Biome for frontend checks
- Verification command: `cd auth_service && npm run test && npm run typecheck && npm run build && cd ../frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `auth_service/package.json` and `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide auth ownership, beta-access rules, security expectations, and verification commands
- `design.md` — Sign In Dialog must preserve the dark hero-derived dialog system
- `plan/README.md` — plan index and cross-cutting service boundaries
- `plan/01-auth-and-beta.md` — canonical Better Auth and beta allowlist guidance
- `specs/admin-beta-login.md` — current login gate and Google bootstrap admin behavior built on `beta_access`
- `specs/beta-allowlist.md` — `auth_service.beta_access` is the real allowlist source of truth
- `specs/protected-routes.md` — frontend route/session guard assumptions after login/logout
- `auth_service/package.json` — scripts, Better Auth version, and test command
- `auth_service/src/auth.ts` — Better Auth email/password config, session hook, admin plugin, and login gate
- `auth_service/src/beta-access.ts` — beta access schema/helpers and existing `/api/beta/access` / allowlist patterns
- `auth_service/src/index.ts` — route mounting, CORS, and auth-service route order
- `auth_service/test/beta-access.test.ts` — existing test style and fake DB pattern
- `auth_service/README.md` — documented beta access/login behavior and curl examples
- `frontend-react/package.json` — frontend scripts and dependency versions
- `frontend-react/src/components/sign-in-dialog.tsx` — current email/password-at-once UI to replace with an email-first flow
- `frontend-react/src/lib/backend-api.ts` — existing auth-service beta API client pattern
- `frontend-react/src/lib/auth-client.ts` — Better Auth React client setup
- `frontend-react/src/lib/auth-session.ts` — frontend session conventions and route guards
- Better Auth docs or installed package references for email/password sign-up, sign-in, account lookup, password credential detection, and safe password creation/reset APIs — confirm the supported API before changing auth behavior

**Architecture context**:
`auth_service` owns Better Auth identity/session state and `beta_access`; the frontend may orchestrate UX but must not infer or trust auth/account state from client-only data. Any email preflight or credential-existence check must be implemented server-side in `auth_service` and must avoid unsafe account takeover behavior. If Better Auth does not provide a safe supported way to determine or create an email/password credential for an existing user without email verification/session proof, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `auth_service/src/beta-access.ts` — add reusable beta email preflight and credential-state helpers/endpoints if this remains the auth-service beta API home
- `auth_service/src/index.ts` — register any new auth-service route needed for email-first preflight while preserving existing route order/CORS behavior
- `auth_service/src/auth.ts` — adjust Better Auth email/password configuration only if a supported API requires it; do not weaken the existing beta login gate
- `auth_service/test/` — add focused tests for active/inactive beta preflight, credential-state responses, normalization, and safe denial behavior
- `auth_service/README.md` — document the email-first sign-in contract and manual verification curls
- `frontend-react/src/components/sign-in-dialog.tsx` — implement the staged email → password/create-password UI while preserving the design
- `frontend-react/src/lib/backend-api.ts` — add typed client helpers for any new auth-service email preflight endpoint
- `frontend-react/src/lib/auth-client.ts` — adjust only if needed to use supported Better Auth client APIs

---

**Confidence check** (do this before step 1):
Restate that the dialog should initially collect only an email, then use `auth_service` to confirm the normalized email is active in `beta_access` before revealing any password or account-creation UI. Confirm that existing email/password users should be prompted to sign in with their password, while active beta users without an email/password credential should be guided through a safe Better Auth-supported password creation flow and then logged in. List assumptions about how credential existence is checked, whether account creation is only for users with no Better Auth account vs existing OAuth-only users, and how email ownership/account takeover is prevented; ask before coding if any assumption is unclear.

**Workflow steps**:
1. Map the current email/password and Google sign-in lifecycle, including the Better Auth session hook that blocks non-active beta users.
2. Design the auth-service email-first contract: normalized email input, active beta check, credential state (`has_password` vs `needs_password_setup`), and consistent error envelopes that do not expose unnecessary account details.
3. Confirm the supported Better Auth API for detecting email/password credentials and for safely creating a password/account; if existing OAuth-only users cannot safely set a password without verification, stop and ask rather than inventing an insecure flow.
4. Implement server-side preflight/helpers/tests in `auth_service` without changing public beta request, allowlist, Google bootstrap admin, or existing login gate semantics.
5. Update the Sign In Dialog into a staged flow with clear loading/error states, email-first UI, password sign-in for existing credential users, and safe create-password flow for active beta users without credentials.
6. Update docs and run the verification command, fixing issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests still pass (`cd auth_service && npm run test && npm run typecheck && npm run build && cd ../frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] Better Auth remains configured only in `auth_service`
- [ ] Existing `/api/auth/*`, `/api/auth/ok`, `/api/beta/access`, beta request, approval-link, and allowlist routes remain available
- [ ] Public beta request submission remains unauthenticated and does not grant active access until approval
- [ ] Email addresses are normalized to lowercase before beta lookup, credential lookup, account creation, or sign-in
- [ ] Non-active beta emails cannot reach password or password-creation steps
- [ ] Active beta login behavior and the Google bootstrap admin exception from `specs/admin-beta-login.md` continue to work
- [ ] Do not allow account takeover: do not set a password on an existing OAuth/email account unless Better Auth supports doing so safely with verified ownership/session/token proof
- [ ] Google sign-in remains available and visually consistent
- [ ] The dialog preserves `design.md`: black canvas, border-first surface, restrained amber, Halant/Atkinson typography, and accessible loading/error states
- [ ] No secrets, real `.env` values, Go backend changes, or database schema changes are introduced unless you stop and confirm they are required

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd auth_service && npm run test && npm run typecheck && npm run build && cd ../frontend-react && bun --bun run check && bun --bun run build`
- Expected output: all auth-service tests pass, TypeScript typecheck/build succeed, frontend check/build succeed, and no new warnings from touched code
- Observable state: opening Sign In shows only email plus Google; inactive/non-beta email gets an error; active beta email with password proceeds to password sign-in; active beta email without an email/password credential is asked to create a password through a safe Better Auth flow and lands on the dashboard after login.
