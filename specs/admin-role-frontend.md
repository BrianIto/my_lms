**What needs to be done**:
Move the frontend `/admin` route from allowing any authenticated user to render it to allowing only authenticated Better Auth users whose session user has the `admin` role.

**Risk level**: high
This touches auth/session route guards and role-based access behavior for the frontend admin control plane.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router + Better Auth React client
- Test runner: Vitest; Biome for checks
- Verification command: `cd frontend-react && bunx biome check src/lib/auth-session.ts src/routes/admin.tsx && bun --bun run build && bun --bun run test`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide LMS service boundaries, Better Auth ownership, beta/admin access expectations, and verification commands
- `design.md` — preserve the current dark LMS admin/app-shell visual language if any denied state is introduced
- `plan/README.md` — plan index and cross-cutting service boundaries
- `plan/01-auth-and-beta.md` — Better Auth/session guard expectations and beta/admin access model
- `specs/protected-routes.md` — existing frontend route/session guard assumptions after login/logout
- `specs/admin-beta-login.md` — admin bootstrap/login behavior and role expectations if present
- `frontend-react/package.json` — confirm TanStack Router, Better Auth, Vitest, Biome, and scripts
- `frontend-react/src/lib/auth-session.ts` — server-side session helper currently returns only `isAuthenticated`; likely needs to expose role/admin state safely
- `frontend-react/src/routes/admin.tsx` — current admin route guard only checks authentication; this is the primary behavior to change
- `frontend-react/src/routes/dashboard.tsx` — protected non-admin route pattern that should continue allowing normal active beta users
- `frontend-react/src/routes/index.tsx` — home route session behavior; avoid redirect loops with authenticated/non-admin users
- `frontend-react/src/components/lms-shell.tsx` — shared protected app layout used by admin; preserve visual structure
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — navigation may expose an Admin link; inspect whether non-admin users can see or reach admin navigation
- `frontend-react/src/lib/backend-api.ts` — admin-only allowlist APIs are already protected server-side; preserve their client behavior
- `auth_service/src/auth.ts` — Better Auth config includes the admin plugin and stores sessions; role source comes from Better Auth user/session
- `auth_service/src/beta-access.ts` — `isAdminRole(...)`, `hasAdminSession(...)`, and backend-side allowlist admin checks define the existing role semantics to mirror on the frontend only for UX gating

**Architecture context**:
Auth remains owned by `auth_service`; the frontend may use Better Auth session data only for UX route gating. Server-side admin APIs must remain protected in `auth_service` and must not rely on frontend checks. Match the existing role semantics: a user is admin when their Better Auth user role contains `admin` as a comma-separated role value.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/lib/auth-session.ts` — expose a typed `isAdmin`/role result from the server-side Better Auth session lookup
- `frontend-react/src/routes/admin.tsx` — enforce admin-only access before rendering the admin page
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — hide or disable admin navigation for non-admin users only if inspection shows it currently exposes `/admin` to everyone
- `frontend-react/src/components/lms-shell.tsx` — adjust only if needed to pass admin/navigation state without changing design
- `frontend-react/src/components/` or closest existing frontend test location — add focused regression tests if test utilities already support route/session behavior

---

**Confidence check** (do this before step 1):
Restate that normal authenticated beta users should still access `/dashboard` and course pages, but must not render `/admin` unless their Better Auth session user has the `admin` role. Confirm whether non-admin visits to `/admin` should redirect to `/dashboard` or `/`; prefer `/dashboard` for authenticated non-admin users and `/` for unauthenticated users unless existing route conventions indicate otherwise. List assumptions about how the Better Auth session response exposes `user.role`; if the session does not include role data, stop and ask before changing auth-service schema or migrations.

**Workflow steps**:
1. Inspect current Better Auth session shape and all frontend admin entry points, especially `/admin` route guard and any Dynamic Island admin navigation.
2. Extend the frontend server-side auth-state helper to return role-aware state without trusting client-provided user ids or weakening existing unauthenticated behavior.
3. Update `/admin` `beforeLoad` so unauthenticated users redirect to `/` and authenticated non-admin users cannot render the page.
4. If admin navigation is visible to non-admin users, hide it based on the same session-derived admin state without disrupting existing navigation design.
5. Add or update focused regression coverage where practical, then run the verification command and fix issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests still pass (`cd frontend-react && bunx biome check src/lib/auth-session.ts src/routes/admin.tsx && bun --bun run build && bun --bun run test`)
- [ ] Type checks pass
- [ ] `/admin` does not render for unauthenticated users or authenticated non-admin users
- [ ] Existing normal protected routes such as `/dashboard`, course detail, and lesson player remain accessible to authenticated non-admin beta users
- [ ] Admin allowlist APIs remain protected server-side by `auth_service`; do not replace server checks with frontend-only checks
- [ ] Better Auth remains configured only in `auth_service`; do not reimplement authentication in the Go backend or frontend
- [ ] Do not change database schema, migrations, environment variable names, package/lock files, or auth-service role semantics unless you stop and explain why
- [ ] The admin page design and current LMS shell styling remain unchanged for admin users
- [ ] No protected admin content flashes before redirect during SSR/client navigation

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd frontend-react && bunx biome check src/lib/auth-session.ts src/routes/admin.tsx && bun --bun run build && bun --bun run test`
- Expected output: touched-file Biome checks pass, production build succeeds, and tests pass with no new failures from this chore
- Observable state: unauthenticated users visiting `/admin` are redirected to `/`; authenticated non-admin users are redirected away and never see admin content; authenticated users with the `admin` role can enter and use the existing admin page.
