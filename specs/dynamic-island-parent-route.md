**What needs to be done**:
Move the Dynamic Island from being mounted inside each protected page shell to being mounted once in a persistent parent protected/auth-gated route layout that wraps dashboard, course, lesson, and admin pages, so page navigation does not unmount/reset the island.

**Risk level**: high
This touches shared frontend route hierarchy, auth gating, generated TanStack Router structure, and shared navigation state.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router + Better Auth React client + Tailwind CSS + Motion + GSAP
- Test runner: Vitest; Biome for checks
- Verification command: `cd frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide auth, frontend ownership, route protection, and verification expectations
- `frontend-react/AGENTS.md` — frontend-specific TanStack/shadcn conventions and commands
- `design.md` — canonical LMS visual/motion rules; preserve Dynamic Island look and reduced-motion behavior
- `plan/README.md` — plan index and cross-cutting LMS constraints
- `plan/01-auth-and-beta.md` — protected-shell and Better Auth session gate expectations
- `plan/04-frontend-design.md` — frontend shell/topbar design expectations
- `frontend-react/package.json` — confirm React, TanStack Router, Better Auth, Motion, GSAP, and scripts
- `frontend-react/README.md` — current TanStack Start routing/layout conventions and commands
- `frontend-react/src/router.tsx` — router setup and generated route tree usage
- `frontend-react/src/routeTree.gen.ts` — current generated route nesting; do not hand-edit except as generated output
- `frontend-react/src/routes/__root.tsx` — root document/shell owner; avoid putting protected-only UI here unless intentionally public-safe
- `frontend-react/src/routes/index.tsx` — public landing route that must remain outside the protected Dynamic Island layout
- `frontend-react/src/routes/dashboard.tsx` — protected page currently rendering `LmsShell`
- `frontend-react/src/routes/courses.$slug.tsx` — protected course route and parent of lesson route today
- `frontend-react/src/routes/courses.$slug.lessons.$lessonId.tsx` — protected lesson/player route
- `frontend-react/src/routes/admin.tsx` — protected admin route and admin-role guard behavior
- `frontend-react/src/components/lms-shell.tsx` — currently owns page background and renders `LmsTopbar`, causing the island to be page-shell scoped
- `frontend-react/src/components/lms-topbar.tsx` — shared topbar owner that renders `DynamicIsland`
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — target navigation component; preserve route labels, auth/session UI, logout, keyboard, and animation behavior
- `frontend-react/src/components/storybook/DynamicIsland.ListItem.tsx` — companion link/list rendering
- `../specs/protected-routes.md` — previous route-auth guard requirements and logout redirect expectations
- `../specs/dynamic-island.md` — prior Dynamic Island implementation intent and route/navigation expectations
- `../specs/dynamic-island-salute.md` — preserve personalized salute behavior if currently implemented

**Architecture context**:
The public `/` route must stay public and should not inherit the protected app topbar. Protected LMS pages should share one persistent TanStack Router parent layout that performs the Better Auth gate and renders the app chrome/Dynamic Island above an `Outlet`, while child page content changes underneath. If the current TanStack Router file-based conventions do not support a pathless protected layout without changing public URLs, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/routes/` — add/rename protected layout routes and move protected page route definitions as needed while preserving public URLs
- `frontend-react/src/components/lms-shell.tsx` — remove or make optional the embedded topbar so the island is not mounted per page; preserve visual background/page framing
- `frontend-react/src/components/lms-topbar.tsx` — adjust only if needed for persistent layout ownership
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — adjust only if route nesting exposes remount/session/navigation bugs
- `frontend-react/src/components/storybook/DynamicIsland.ListItem.tsx` — adjust only if route types need updating after route layout changes
- `frontend-react/src/router.tsx` — adjust only if required by route context/layout changes
- `frontend-react/src/routeTree.gen.ts` — generated update only; do not manually edit

---

**Confidence check** (do this before step 1):
Restate that the goal is not to stop every React render, but to stop the Dynamic Island from unmounting/remounting and replaying/resetting state on protected page navigation. Confirm the assumption that `/`, sign-in/beta flows, and public landing UI remain outside the protected island layout, while `/dashboard`, `/courses/$slug`, `/courses/$slug/lessons/$lessonId`, and `/admin` remain protected at the parent or child level. If preserving the exact current URLs conflicts with creating a persistent protected parent route, ask before coding.

**Workflow steps**:
1. Inventory the current route tree, current auth guards, and every place `LmsShell`, `LmsTopbar`, and `DynamicIsland` are mounted.
2. Choose the safest TanStack Router file-based layout pattern for a pathless protected parent route that preserves existing URLs and keeps `/` public.
3. Centralize the common auth gate and persistent topbar in the protected parent layout, then render protected child page content through `Outlet`.
4. Refactor `LmsShell` so page-specific backgrounds/headings/content remain reusable without remounting the Dynamic Island on every child route change.
5. Move or update protected route files so dashboard, course detail, lesson player, and admin render under the protected parent without changing their visible paths or business behavior.
6. Regenerate route types if required by the file-route changes, then run verification and fix route, type, lint, build, hydration, or import issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests/checks still pass (`cd frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] `/` remains public and unauthenticated users can still access the landing/sign-in/beta UI
- [ ] `/dashboard`, `/courses/$slug`, `/courses/$slug/lessons/$lessonId`, and `/admin` keep the same public URLs and remain auth gated
- [ ] Admin-specific access behavior remains intact; do not weaken admin checks
- [ ] Dynamic Island navigation labels still reflect `/`, `/dashboard`, `/courses/*`, and `/admin` correctly
- [ ] Dynamic Island logout, salute/session behavior, keyboard controls, overlay close, route navigation, and reduced-motion behavior remain intact
- [ ] The island may update its active label on navigation, but it must not unmount/remount or reset open/salute/sign-out state solely because a protected child page changes
- [ ] No backend, auth service, database schema, API contract, secret/env, Docker, lockfile, or generated files other than TanStack route generation are modified

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd frontend-react && bun --bun run check && bun --bun run build`
- Expected output: Biome check and production build pass with no new type/lint errors or warnings
- Observable state: navigating among protected pages changes only the child route content under the protected layout; the Dynamic Island remains mounted once in the parent protected layout and does not replay initial mount behavior or lose local state on each page navigation.
