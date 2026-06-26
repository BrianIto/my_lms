**What needs to be done**:
Move the frontend from mostly public route rendering to requiring a valid Better Auth login for every existing frontend route except `/`, and ensure logging out redirects the user back to `/`.

**Risk level**: high
This touches auth/session route guards and redirect behavior shared across frontend pages.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router + Better Auth React client + Tailwind CSS
- Test runner: Vitest; Biome for checks
- Verification command: `cd frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide LMS service boundaries, Better Auth ownership, security rules, and verification expectations
- `frontend-react/AGENTS.md` — frontend-specific TanStack/shadcn conventions and commands
- `plan/README.md` — plan index and cross-cutting constraints
- `plan/01-auth-and-beta.md` — Better Auth/session guard expectations; frontend gates are UX only and must not replace backend enforcement
- `plan/04-frontend-design.md` — frontend UI and app-shell expectations if an unauthenticated redirect/loading state is needed
- `design.md` — canonical dark LMS design system; preserve existing app shell and navigation language
- `frontend-react/package.json` — confirm TanStack Router, Better Auth, React, and scripts
- `frontend-react/src/router.tsx` — router context setup; update only if a route guard needs session/query context
- `frontend-react/src/routes/__root.tsx` — root route context/shell owner and possible shared guard location
- `frontend-react/src/routes/index.tsx` — the only route that must remain public; it already has session-aware landing behavior
- `frontend-react/src/routes/dashboard.tsx` — protected LMS dashboard route
- `frontend-react/src/routes/courses.$slug.tsx` — protected course detail route
- `frontend-react/src/routes/courses.$slug.lessons.$lessonId.tsx` — protected lesson/player route
- `frontend-react/src/routes/admin.tsx` — protected admin route
- `frontend-react/src/routes/mcp.ts` — existing non-index frontend route; decide carefully whether and how auth applies to this server handler, and stop if protecting it would break MCP contract assumptions
- `frontend-react/src/components/lms-shell.tsx` — shared protected app layout
- `frontend-react/src/components/lms-topbar.tsx` — shared topbar owner
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — current navigation/logout behavior and sign-out redirect handling
- `frontend-react/src/lib/auth-client.ts` — Better Auth React client instance and base URL

**Architecture context**:
The frontend may use Better Auth session state and TanStack Router redirects for UX route protection, but auth remains owned by `auth_service` and private LMS data must still be enforced server-side by the backend. Prefer one consistent guard pattern over duplicating ad-hoc checks in every component. If the existing `/mcp` server route cannot safely use the same browser-session guard as UI pages, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/routes/` — add route protection for every existing non-index route and preserve `/` as public
- `frontend-react/src/router.tsx` — adjust router context only if needed for a clean auth guard
- `frontend-react/src/integrations/tanstack-query/root-provider.tsx` — adjust context only if needed for a clean auth/session guard
- `frontend-react/src/lib/auth-client.ts` — adjust only if needed to use supported Better Auth client APIs
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — ensure logout signs out and redirects to `/`
- `frontend-react/src/components/lms-shell.tsx` — adjust only if needed to centralize protected-shell behavior without changing visual design
- `frontend-react/src/routeTree.gen.ts` — generated update only if TanStack Router generation/build changes it

---

**Confidence check** (do this before step 1):
Restate that `/` remains public, while all other existing frontend routes should require login before rendering. Confirm that logout must call the existing Better Auth client sign-out flow and then navigate/redirect to `/`. List assumptions about whether route protection should be implemented via TanStack Router `beforeLoad`, a protected layout route, or another existing abstraction; if `/mcp` or any server route cannot be protected with the same assumptions, ask before coding.

**Workflow steps**:
1. Inventory all existing frontend routes and identify the safest TanStack Router guard pattern that preserves SSR/hydration behavior and avoids redirect loops.
2. Implement the protected-route behavior for every existing non-index route, keeping `/` public and preserving the current logged-in home behavior.
3. Verify the logout flow uses Better Auth client APIs, clears/updates session state, closes any open navigation UI, and redirects to `/` after successful sign-out.
4. Regenerate or update TanStack Router generated files only if required by the chosen route structure.
5. Run the verification command and fix type, lint, route-generation, hydration, or build issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing checks still pass (`cd frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] `/` remains public and continues to show the existing landing/sign-in/beta-request UI to unauthenticated users
- [ ] Authenticated users visiting `/` still reach the logged-in experience without a redirect loop
- [ ] Unauthenticated users cannot render `dashboard`, `admin`, course detail, lesson player, or any other existing non-index frontend route
- [ ] Auth redirects preserve safe navigation behavior; do not trust client-provided user ids
- [ ] Logout uses Better Auth client APIs only and redirects to `/` after success
- [ ] Existing Dynamic Island navigation, keyboard behavior, route labels, salute, and reduced-motion behavior remain intact
- [ ] No backend, auth service, database schema, migration, API contract, secret/env, Docker, or lockfile changes are introduced

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd frontend-react && bun --bun run check && bun --bun run build`
- Expected output: Biome check and production build pass with no new type/lint errors or warnings introduced by this chore
- Observable state: unauthenticated visits to every existing non-index frontend route redirect to `/`; `/` stays public; after logging out from any protected page, the app returns to `/` and no protected page content remains visible.
