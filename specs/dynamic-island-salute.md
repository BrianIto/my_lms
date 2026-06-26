**What needs to be done**:
Move the shared frontend Dynamic Island from immediately showing the active page label for logged-in users to briefly showing a personalized salute (`Hi, {Logged User}!`) for about 3 seconds, then GSAP-animating back to the current page label.

**Risk level**: medium
This is frontend-only, but it touches shared shell navigation and reads Better Auth client session state.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router + Better Auth client + Tailwind CSS + Motion + GSAP
- Test runner: Vitest; Biome for checks
- Verification command: `cd frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide LMS boundaries, auth ownership, UI rules, and verification expectations
- `frontend-react/AGENTS.md` — frontend-specific TanStack/shadcn conventions and commands
- `design.md` — canonical dark/premium design system, Dynamic Island guidance, and motion constraints
- `plan/README.md` — plan index and cross-cutting LMS constraints
- `plan/01-auth-and-beta.md` — Better Auth/session and beta-access expectations; only read/update frontend client behavior for this chore
- `plan/04-frontend-design.md` — frontend visual expectations and motion guidance
- `frontend-react/package.json` — confirm React, Better Auth, GSAP, Motion, and check/build scripts
- `frontend-react/src/lib/auth-client.ts` — existing Better Auth client instance and base URL
- `frontend-react/src/components/lms-topbar.tsx` — shared topbar owner that renders the Dynamic Island
- `frontend-react/src/components/lms-shell.tsx` — shared LMS layout that renders the topbar across app pages
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — target component; current active-page label, GSAP setup, route awareness, keyboard behavior
- `frontend-react/src/components/storybook/TextChangeAnimate.tsx` — text transition helper used for the active label
- `frontend-react/src/components/storybook/DynamicIsland.ListItem.tsx` — companion list rendering; verify changes do not break open/menu behavior
- `frontend-react/src/components/sign-in-dialog.tsx` — existing Better Auth client usage and user-facing auth flow

**Architecture context**:
Frontend may read the Better Auth session for UI personalization, but auth ownership stays in `auth_service`; do not add backend endpoints, schemas, or custom auth logic. `DynamicIsland` is shared navigation inside `LmsTopbar`, so preserve route-aware labels, keyboard controls, and compact top-center behavior. If an existing session/provider abstraction is found that conflicts with direct `authClient.useSession()`, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — add session-aware salute state, 3-second timing, and GSAP transition back to active page display
- `frontend-react/src/components/storybook/TextChangeAnimate.tsx` — adjust only if the existing text animation helper needs to accept refs/classes or cooperate with the GSAP label transition
- `frontend-react/src/lib/auth-client.ts` — adjust only if needed to expose the typed Better Auth client/session hook already supported by Better Auth
- `frontend-react/src/components/lms-topbar.tsx` — adjust only if topbar ownership or hydration/layout behavior requires a minimal change

---

**Confidence check** (do this before step 1):
Restate that you are adding a short, personalized logged-in greeting inside the existing Dynamic Island, then returning to the normal active route label after roughly 3 seconds with a GSAP animation. Confirm the assumption that the displayed user name should come from the Better Auth session (`user.name` preferred, then email local-part fallback) and that unauthenticated users should see the current behavior unchanged. If the project already has a different session source or no reliable session name/email, ask before coding.

**Workflow steps**:
1. Inspect the existing Dynamic Island render flow, GSAP usage, text animation helper, and Better Auth client session API/call sites.
2. Add a minimal session-aware display state that shows `Hi, {name}!` only when a logged-in user is detected, avoids flicker for loading/unauthenticated states, and cleans up timers on unmount/session changes.
3. Implement the GSAP transition so the greeting lasts about 3 seconds, then animates back to the active page label while respecting reduced-motion preferences.
4. Preserve existing navigation behavior: click toggle, overlay close, `/` keyboard shortcut, arrow navigation, Escape, Enter, route-derived active page, and menu item links.
5. Run the verification command and fix any type, lint, import, hook-dependency, hydration, or build issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing checks still pass (`cd frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] Unauthenticated users still see the current active page label with no greeting or auth error noise
- [ ] Logged-in user name/email is read from the Better Auth session only; no client-provided user id or new auth implementation is introduced
- [ ] Route labels for `/`, `/dashboard`, `/courses/*`, and `/admin` still resolve as before
- [ ] Dynamic Island keyboard and pointer interactions remain accessible and unchanged
- [ ] Reduced-motion users are respected; no forced distracting animation
- [ ] No backend, auth service, database schema, API contract, generated route tree, lockfile, or secret/env files are modified

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd frontend-react && bun --bun run check && bun --bun run build`
- Expected output: Biome check and production build pass with no new type/lint errors or warnings
- Observable state: after login/session restoration, the Dynamic Island displays `Hi, {Logged User}!` for about 3 seconds and then GSAP-animates back to the correct active page label; unauthenticated behavior remains unchanged.
