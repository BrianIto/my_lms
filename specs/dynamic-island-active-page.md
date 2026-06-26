**What needs to be done**:
Move the Dynamic Island menu from highlighting whichever keyboard index was last selected by default to highlighting the nav item that matches the current route while still preserving keyboard selection/focus behavior when the island is open.

**Risk level**: medium
This is frontend-only, but it touches shared protected navigation used by dashboard, course, lesson, and admin pages.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router + Tailwind CSS + Motion + GSAP
- Test runner: Vitest; Biome for checks
- Verification command: `cd frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide LMS boundaries, UI rules, and verification expectations
- `frontend-react/AGENTS.md` — frontend-specific TanStack conventions and commands
- `design.md` — canonical Dynamic Island, active-state, amber restraint, and motion guidance
- `plan/README.md` — plan index and cross-cutting LMS constraints
- `plan/04-frontend-design.md` — frontend visual expectations and app shell guidance
- `frontend-react/package.json` — confirm scripts and React/TanStack/Motion versions
- `frontend-react/src/routes/_protected.tsx` — persistent protected layout that mounts the Dynamic Island
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — current active route label logic and keyboard selected-index state
- `frontend-react/src/components/storybook/DynamicIsland.ListItem.tsx` — current menu item active styling; likely needs route-active and keyboard-selected states separated
- `frontend-react/src/routes/_protected.dashboard.tsx` — dashboard route that should activate Learning
- `frontend-react/src/routes/_protected.courses.$slug.tsx` — course detail route that should activate Learning
- `frontend-react/src/routes/_protected.courses.$slug_.lessons.$lessonId.tsx` — lesson route that should activate Learning
- `frontend-react/src/routes/_protected.admin.tsx` — admin route that should activate Admin when visible to admins
- `specs/dynamic-island.md` — original Dynamic Island route/navigation intent
- `specs/dynamic-island-parent-route.md` — current parent-layout persistence intent; do not regress it

**Architecture context**:
The Dynamic Island is mounted once in the protected parent route and should derive active page state from TanStack Router location, not from transient local keyboard selection. The closed island label already maps `/courses/*` to Learning; the open menu should use the same route-aware mapping. If the route model has changed or active behavior conflicts with keyboard accessibility, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — derive/pass current route-active page state and keep keyboard state intact
- `frontend-react/src/components/storybook/DynamicIsland.ListItem.tsx` — render route-active styling separately from keyboard-selected styling
- `frontend-react/src/components/storybook/DynamicIsland.test.tsx` — create/update only if an existing test pattern supports a focused regression test for active-route behavior

---

**Confidence check** (do this before step 1):
Restate that the chore is to make the open Dynamic Island visually mark the page matching the current URL, not always the first item or the last keyboard-selected index. Confirm the assumption that `/dashboard`, `/courses/$slug`, and `/courses/$slug/lessons/$lessonId` should activate Learning; `/admin` should activate Admin; `/` should activate Home. If any nav item mapping should differ, ask before coding.

**Workflow steps**:
1. Inspect the current Dynamic Island active-label logic, list item props, keyboard navigation behavior, and route mappings.
2. Add a route-active concept that reuses the existing `getActivePage(location.pathname)` mapping and pass it to menu items independently from `selectedIndex`.
3. Update menu item styling so the current route is visibly active, while arrow-key selection still provides an accessible focus/selection affordance when it differs from the active route.
4. Verify Learning stays active for dashboard, course detail, and lesson player routes; Admin stays active on admin; Home stays active on `/` if it is reachable from the protected layout.
5. Add or update a focused test only if the project has an appropriate lightweight pattern; otherwise rely on check/build plus manual route review.
6. Run the verification command and fix any type, lint, import, accessibility, or build issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests/checks still pass (`cd frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] Dynamic Island remains mounted from the protected parent layout and does not move back into per-page shells
- [ ] Dynamic Island closed label/icon still reflects the active route
- [ ] Keyboard controls still work: `/` toggles, `Escape` closes, arrow keys move selection, `Enter` activates the selected item or logout
- [ ] Logout, salute/session behavior, overlay close, route navigation, and reduced-motion behavior remain intact
- [ ] Admin item remains hidden for non-admin users and admin access behavior is not weakened
- [ ] No public route paths, TanStack file-route names, backend, auth service, database schema, API contract, generated route tree, lockfile, or secret/env files are modified

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd frontend-react && bun --bun run check && bun --bun run build`
- Expected output: Biome check and production build pass with no new type/lint errors or warnings
- Observable state: opening the Dynamic Island on `/dashboard`, `/courses/*`, or lesson pages visibly marks Learning active; opening it on `/admin` marks Admin active; keyboard selection can move without permanently replacing the route-active state unless navigation occurs.
