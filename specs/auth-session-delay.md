# Reduce protected-page auth session delay

**What needs to be done**:
Move the frontend FROM calling `getServerAuthState()`/Better Auth `get-session` before every protected route/page TO a shared, cached auth-state flow that gates protected routes once per navigation/session and feeds the navigation element without repeated blocking calls.

**Risk level**: high
This touches frontend auth gates and admin visibility, so preserve all access-control semantics and do not weaken backend server-side enforcement.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/Router/Query + Better Auth client
- Test runner: Vitest via Bun
- Verification command: `cd frontend-react && bun --bun run test && bun --bun run check && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repository rules, auth boundaries, beta access requirements, and frontend design constraints.
- `design.md` — required UI language if any loading/auth transition UI is changed.
- `plan/README.md` — plan index and cross-cutting rules.
- `plan/01-auth-and-beta.md` — Better Auth ownership and frontend/backend auth responsibilities.
- `plan/04-frontend-design.md` — data-loading UI guidance; progress/auth loading should be subtle and not block unnecessarily.
- `frontend-react/package.json` — framework/test versions and available scripts.
- `frontend-react/src/lib/auth-session.ts` — current server-side `getServerAuthState()` implementation that calls Better Auth `get-session`.
- `frontend-react/src/lib/auth-client.ts` — Better Auth React client configuration and credentials behavior.
- `frontend-react/src/routes/__root.tsx` — router context root; likely place to provide shared auth state if the pattern fits TanStack Start.
- `frontend-react/src/routes/_protected.tsx` — current protected-layout gate that calls `getServerAuthState()`.
- `frontend-react/src/routes/_protected.admin.tsx` — current admin gate that calls `getServerAuthState()` again.
- `frontend-react/src/routes/index.tsx` — public landing redirect currently calls `getServerAuthState()`.
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — the navigation element currently calls `authClient.useSession()` and uses session/admin state for menu visibility and sign-out.
- `frontend-react/src/components/lms-shell.tsx` — protected-page shell/layout behavior, in case auth-loading UI needs to sit around protected content.
- Related protected pages: `frontend-react/src/routes/_protected.dashboard.tsx`, `frontend-react/src/routes/_protected.courses.$slug.tsx`, `frontend-react/src/routes/_protected.courses.$slug_.lessons.$lessonId.tsx` — verify they do not add additional auth blockers and that any UX changes do not regress page loading.

**Architecture context**:
Auth remains owned by `auth_service`/Better Auth; the frontend may cache or share the session state for UX, but must not become the source of truth for protected LMS data. The Go backend must continue enforcing session + beta/admin access for protected APIs. If the desired fix conflicts with TanStack Start SSR/router conventions or Better Auth session semantics, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/lib/auth-session.ts` — adjust or split server auth-state helper if needed.
- `frontend-react/src/lib/auth-client.ts` — adjust Better Auth client/session options only if needed for shared state.
- `frontend-react/src/routes/__root.tsx` — add shared router context/auth state only if this is the cleanest TanStack pattern.
- `frontend-react/src/routes/_protected.tsx` — centralize protected route gating and avoid repeated child-route calls.
- `frontend-react/src/routes/_protected.admin.tsx` — replace duplicate session call with shared auth state while preserving admin-only behavior.
- `frontend-react/src/routes/index.tsx` — avoid unnecessary blocking redirect calls or reuse shared/cached auth state.
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — make the nav element consume the shared auth state where appropriate and avoid issuing redundant session requests.
- `frontend-react/src/components/lms-shell.tsx` — only if a subtle auth-loading boundary is needed.
- `frontend-react/src/**/*.test.ts` and `frontend-react/src/**/*.test.tsx` — add/update regression tests for auth-state deduplication and route behavior.

---

**Confidence check** (do this before step 1):
Restate the chore in your own words in 2–3 sentences. List any assumption you are making, especially what “the element” refers to. If “the element” does not refer to `DynamicIsland`/the navigation element or if the current TanStack Start route lifecycle prevents safe deduplication, ask before proceeding.

**Workflow steps**:
1. Trace the current auth call graph: identify every `getServerAuthState()`, Better Auth `get-session`, and `authClient.useSession()` call that runs during initial load, protected navigation, admin navigation, and landing-page redirect.
2. Propose the smallest safe design to deduplicate auth state: prefer one protected-layout/root-level auth check that can be reused by child routes and by `DynamicIsland`, with clear cache/stale behavior and no loss of SSR redirect correctness.
3. Implement the shared auth-state flow and remove duplicate route-level session calls, preserving redirects: anonymous users go to `/`, authenticated users can enter `/dashboard`/courses, non-admin users cannot enter `/admin`.
4. Update the navigation element to consume the shared state or otherwise avoid a second eager session fetch while keeping admin menu visibility, greeting, and sign-out behavior correct.
5. Add regression tests or instrumentation-friendly assertions that would catch repeated `get-session` calls on protected navigation, then run the verification command.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests still pass (`cd frontend-react && bun --bun run test && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] Anonymous users are still redirected away from protected routes.
- [ ] Authenticated non-admin users are still redirected away from `/admin`.
- [ ] Admin users can still access `/admin` and see the admin navigation item.
- [ ] Sign-out still clears the session UI and navigates to `/`.
- [ ] Backend API calls still use credentials and backend server-side auth/beta enforcement remains unchanged.
- [ ] No new blocking `get-session` call is added to every protected page render.

**Done looks like**:
- Files changed: only files within scope above.
- Command to verify: `cd frontend-react && bun --bun run test && bun --bun run check && bun --bun run build`
- Expected output: all tests pass, type/check/build complete successfully, and no new warnings attributable to this change.
- Observable state: navigating between `/dashboard`, `/courses/:slug`, lesson pages, and `/admin` no longer triggers repeated blocking Better Auth `get-session` calls before each page; auth state is resolved once at the shared boundary or served from an intentional cache, and `DynamicIsland` reflects that same state.
