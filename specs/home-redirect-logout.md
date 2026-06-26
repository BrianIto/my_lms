**What needs to be done**:
Move logged-in users on the home page from seeing the public landing screen to being redirected straight to `/dashboard`, and move the Dynamic Island from navigation-only items to also including a non-link logout button that signs out via Better Auth.

**Risk level**: medium
This is frontend-only, but it touches auth/session-driven routing and shared navigation used across LMS pages.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router + Better Auth React client + Tailwind CSS + Motion/GSAP
- Test runner: Vitest; Biome for checks
- Verification command: `cd frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide LMS boundaries, Better Auth ownership, UI rules, and verification expectations
- `frontend-react/AGENTS.md` — frontend-specific TanStack/shadcn conventions and commands
- `design.md` — canonical dark/premium design system and Dynamic Island guidance
- `plan/README.md` — plan index and cross-cutting LMS constraints
- `plan/01-auth-and-beta.md` — Better Auth/session and beta-access expectations; only update frontend client behavior for this chore
- `plan/04-frontend-design.md` — frontend visual expectations and motion guidance
- `frontend-react/package.json` — confirm React, Better Auth, TanStack Router, Motion/GSAP, and scripts
- `frontend-react/src/lib/auth-client.ts` — existing Better Auth React client instance and base URL
- `frontend-react/src/routes/index.tsx` — home/landing route that should redirect logged-in users to `/dashboard`
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — shared Dynamic Island owner, session-aware salute, route labels, GSAP setup, and keyboard behavior
- `frontend-react/src/components/storybook/DynamicIsland.ListItem.tsx` — companion menu rendering; extend or mirror this pattern for a button item without making logout a link
- `frontend-react/src/components/lms-topbar.tsx` — shared topbar owner that renders the Dynamic Island
- `frontend-react/src/components/lms-shell.tsx` — shared LMS layout that renders the topbar across app pages
- `frontend-react/src/components/sign-in-dialog.tsx` — existing Better Auth client usage and user-facing sign-in flow

**Architecture context**:
Frontend may read the Better Auth session and call Better Auth client sign-out APIs for UX, but auth ownership stays in `auth_service`; do not add backend endpoints, schemas, or custom auth logic. The home redirect must respect TanStack Start SSR/hydration behavior and avoid flickering or redirect loops. The Dynamic Island is shared navigation, so preserve route-aware labels, salute behavior, keyboard controls, compact top-center layout, and menu accessibility. If an existing route/session guard abstraction is found that conflicts with direct `authClient.useSession()` or `authClient.getSession()`, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/routes/index.tsx` — add logged-in home redirect behavior
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — add logout action/state and include it in the open island menu
- `frontend-react/src/components/storybook/DynamicIsland.ListItem.tsx` — adjust only if needed to support a menu item rendered as a `<button>` instead of a TanStack `<Link>`
- `frontend-react/src/lib/auth-client.ts` — adjust only if needed to use an already-supported Better Auth React client API/type

---

**Confidence check** (do this before step 1):
Restate that you are adding session-aware behavior in two frontend places: logged-in users who land on `/` should be sent to `/dashboard`, and the Dynamic Island menu should expose a real button that signs the user out through Better Auth. Assume the session source is the existing `authClient` from `frontend-react/src/lib/auth-client.ts`, logout should call Better Auth `signOut`, and after logout the user should be returned to `/` with the island closed. If the app already has a different session/route guard abstraction, or if Better Auth sign-out has a project-specific callback pattern, ask before coding.

**Workflow steps**:
1. Inspect current home route rendering, TanStack Router redirect/navigation patterns, Better Auth React client APIs, and existing Dynamic Island menu/keyboard behavior.
2. Implement logged-in home redirect with minimal flicker and no SSR/hydration crash; unauthenticated users must still see the landing page unchanged.
3. Add a Dynamic Island logout button that is not a link, is only shown when authenticated, calls Better Auth sign-out, closes the island, navigates to `/`, and handles loading/error state accessibly.
4. Preserve existing Dynamic Island behavior: click toggle, overlay close, `/` shortcut, arrow navigation, Escape, Enter for navigable items, route-derived active page, salute timing, reduced-motion behavior, and existing menu links.
5. Run the verification command and fix type, lint, import, hook-dependency, hydration, or build issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing checks still pass (`cd frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] Unauthenticated users still see the current home landing page and sign-in/beta-request UI unchanged
- [ ] Authenticated users reaching `/` are redirected to `/dashboard` without redirect loops
- [ ] Logout uses Better Auth client APIs only; no new backend/auth service/database/API changes are introduced
- [ ] Logout menu control is a `<button type="button">`, not a link, and remains keyboard accessible
- [ ] Dynamic Island route labels, personalized salute, open/close behavior, keyboard shortcuts, and menu link navigation remain intact
- [ ] Reduced-motion users are respected; no forced distracting animation is added
- [ ] No generated route tree, lockfile, backend, auth service, schema, migration, API contract, secret/env, or Docker files are modified

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd frontend-react && bun --bun run check && bun --bun run build`
- Expected output: Biome check and production build pass with no new type/lint errors or warnings introduced by this chore
- Observable state: while logged in, visiting `http://localhost:5173/` redirects to `/dashboard`; opening the Dynamic Island shows a logout button that signs out through Better Auth and returns the user to the public home page; unauthenticated users continue to see the landing page and no logout action.
