## Fix the Bug

**Environment** (1 line): macOS 27.0; Node v22.20.0; Bun 1.3.13; React 19.2.0; TanStack Start/Router latest; Better Auth 1.6.19; Vite 8.0.16; Vitest 4.1.9; Biome 2.4.5

**Actual Behavior**:
After recent link/route changes, frontend redirects and navigations no longer behave reliably. Auth redirects and protected-route redirects appear to target the intended paths (`/dashboard`, `/`, `/admin`, `/courses/$slug`), but the app may bounce back to `/`, fail to navigate, or leave the user on the wrong screen after sign-in/sign-out or Dynamic Island/course-card navigation.

No exact stack trace is currently known. The likely failure is a route/link mismatch introduced when protected route files were renamed/moved to the `_protected` layout (`_protected.dashboard.tsx`, `_protected.courses.$slug.tsx`, `_protected.admin.tsx`, etc.) while existing redirects and links still assume specific URL route IDs/paths.

**Expected Behavior**:
All redirects and links should work with the current TanStack Router route tree while preserving the visible URLs:

- Logged-in users visiting `/` redirect to `/dashboard`.
- Unauthenticated users visiting protected routes redirect to `/`.
- Non-admin users visiting `/admin` redirect to `/dashboard`.
- Course links navigate to `/courses/$slug` and lesson links navigate to `/courses/$slug/lessons/$lessonId`.
- Sign-in/create-password/Google callbacks land on `/dashboard` and do not loop back to `/` if a valid Better Auth session exists.
- Logout signs out through Better Auth and redirects to `/`.

**Steps to Reproduce**:
1. Start the auth service and frontend, then sign in with an active beta account.
2. Try the redirect/navigation flows that depend on changed links: visit `/`, sign in to `/dashboard`, click dashboard course links, open Dynamic Island navigation items, visit `/admin` as admin and non-admin, and log out.
3. Observe which flow no longer lands on the expected route or redirects back unexpectedly.

**Key Files**:
- `frontend-react/src/routes/index.tsx` — home route redirects authenticated users to `/dashboard`; verify route target is still valid after link changes.
- `frontend-react/src/routes/_protected.tsx` — protected parent route redirects unauthenticated users to `/`; likely central redirect guard.
- `frontend-react/src/routes/_protected.admin.tsx` — admin guard redirects unauthenticated/non-admin users; verify no redirect loop or stale target.
- `frontend-react/src/routes/_protected.dashboard.tsx` — dashboard course links use `Link to="/courses/$slug"`; verify this matches generated route IDs.
- `frontend-react/src/routes/_protected.courses.$slug.tsx` — course detail route and lesson links should preserve `/courses/$slug` URLs.
- `frontend-react/src/routes/_protected.courses.$slug_.lessons.$lessonId.tsx` — lesson/player route; filename/path is easy to mismatch with TanStack file-route conventions.
- `frontend-react/src/routeTree.gen.ts` — generated route tree shows the actual route IDs/full paths; do not hand-edit except through generation.
- `frontend-react/src/components/sign-in-dialog.tsx` — Better Auth callback URLs and explicit dashboard redirect after email/password flows.
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — shared navigation and logout redirects; verify `navigate({ to })` targets valid routes.
- `frontend-react/src/components/storybook/DynamicIsland.ListItem.tsx` — typed island route union can silently exclude or constrain changed routes.
- `frontend-react/src/lib/auth-session.ts` — server-side session check used by route guards; verify redirects are not caused by missing cookies/session forwarding.

**Already Tried**:
- Protected routes were moved under a `_protected` parent layout while trying to keep public URLs unchanged.
- Existing redirects still use `redirect({ to: "/dashboard" })`, `redirect({ to: "/" })`, and `redirect({ to: "/dashboard" })` in the admin guard.
- Existing links still use TanStack Router targets such as `to="/courses/$slug"` with params.
- Sign-in flows already use `callbackURL: `${window.location.origin}/dashboard`` and create-password has a regression test for redirecting after success.

**Constraints** (do not touch):
- Do not change the visible public URLs: `/`, `/dashboard`, `/admin`, `/courses/$slug`, `/courses/$slug/lessons/$lessonId`.
- Do not remove or weaken the `_protected` auth gate or admin-only guard.
- Do not reimplement authentication in the Go backend; Better Auth remains owned by `auth_service`.
- Do not change backend/auth-service API contracts, database schema, migrations, env var names, secrets, Docker files, or lockfiles unless inspection proves it is required and you stop to explain why.
- Do not hand-edit `frontend-react/src/routeTree.gen.ts`; regenerate it with the project route-generation command if needed.
- Preserve the current dark LMS design, Dynamic Island behavior, sign-in dialog copy, and route URLs.

**Success Looks Like**:
Every current redirect and link target resolves against the generated TanStack Router route tree with no route mismatch, failed navigation, or redirect loop. Manual verification passes for: `/` while logged in, direct unauthenticated access to protected pages, `/admin` as admin/non-admin, dashboard course links, lesson links, Dynamic Island navigation, sign-in callback, create-password redirect, and logout.

Run and pass:

```bash
cd frontend-react
bun --bun run generate-routes
bun --bun run check
bun --bun run build
bun --bun run test
```

**Test Coverage**:
Create a test for this bug to it doesn't happen anymore.
After fixing, run the existing test suite. If all pass, generate a regression test that:
1. Reproduces the exact failure condition described above
2. Asserts the expected behavior
3. Is placed alongside related tests in `frontend-react/src/routes/`, `frontend-react/src/components/`, or the closest existing frontend test file after inspection
If any existing tests fail during the fix, try to fix them.

Recommended regression coverage:
- Add route/link tests that assert the current protected route URLs are valid in the generated route tree and that dashboard course links render/navigate with `to="/courses/$slug"` plus params.
- Add guard tests, if the current test setup supports route `beforeLoad`, for authenticated `/` -> `/dashboard`, unauthenticated protected route -> `/`, and non-admin `/admin` -> `/dashboard`.
- Add or extend Dynamic Island tests to verify its navigation targets still match valid routes after route/link changes.

Before coding, read `AGENTS.md`, `frontend-react/AGENTS.md`, `design.md`, `plan/README.md`, `plan/01-auth-and-beta.md`, `plan/04-frontend-design.md`, and inspect every key file above. Start by comparing the route file names, generated route tree, `Link to` values, `navigate({ to })` values, and `redirect({ to })` values. Keep the fix minimal and scoped to restoring redirects/links after the route/link changes.
