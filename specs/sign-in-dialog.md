**What needs to be done**:
Move the primary sign-in experience from a standalone `/auth` page linked from the home hero to an accessible hero-styled Sign In Dialog opened directly from the home page, preserving existing Better Auth Google and email/password sign-in behavior.

**Risk level**: medium
This touches public auth UX and client-side routing/navigation, but should not change Better Auth configuration, backend contracts, schemas, or session semantics.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router + Tailwind CSS + shadcn/Radix Dialog
- Test runner: Vitest; Biome for checks
- Verification command: `cd frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide service ownership, auth boundaries, beta-access rules, and frontend design requirements
- `frontend-react/AGENTS.md` — frontend command and framework conventions
- `design.md` — required dark premium visual language and hero-derived dialog treatment
- `plan/README.md` — plan index and cross-cutting rules
- `plan/01-auth-and-beta.md` — Better Auth, Google sign-in, beta gate, and session expectations
- `plan/04-frontend-design.md` — auth screen/dialog styling guidance and LMS frontend expectations
- `frontend-react/package.json` — confirm React/TanStack/Better Auth/shadcn dependencies and scripts
- `frontend-react/src/routes/index.tsx` — current home hero, beta-access Dialog, and `Already invited? Sign in` link to replace
- `frontend-react/src/routes/auth.tsx` — current standalone sign-in UI and Better Auth call behavior to preserve or retire safely
- `frontend-react/src/components/ui/dialog.tsx` — existing accessible Dialog primitive and styling conventions
- `frontend-react/src/lib/auth-client.ts` — Better Auth client base URL and sign-in API usage
- `frontend-react/src/routes/__root.tsx` and `frontend-react/src/styles.css` — global layout/head/style conventions and reduced-motion behavior
- `frontend-react/src/components/lms-shell.tsx` — only to understand the current `/auth` page wrapper before deciding whether it can be bypassed or removed

**Architecture context**:
Frontend owns the sign-in UX, but `auth_service` owns identity, sessions, OAuth, and Better Auth configuration. Do not reimplement auth, change auth service routes, or alter backend beta enforcement. If the existing `/auth` route is referenced by protected-route redirects or deep links, preserve compatibility with a redirect or a minimal fallback instead of deleting it blindly.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/routes/index.tsx` — replace the home hero sign-in link with a Sign In Dialog trigger and compose the dialog UX
- `frontend-react/src/routes/auth.tsx` — remove, redirect, or simplify the standalone auth page only if compatibility is understood and maintained
- `frontend-react/src/components/` — add a focused reusable auth dialog component only if it keeps route files maintainable
- `frontend-react/src/styles.css` — add minimal reusable dialog/motion styles only if existing Tailwind utilities are insufficient
- `frontend-react/src/routeTree.gen.ts` — update only if TanStack Router generation changes because a route file is removed or renamed

---

**Confidence check** (do this before step 1):
Restate that the goal is to keep users on the home page and open sign-in in a Dialog, rather than sending them to a dedicated sign-in page as the primary path. List assumptions about whether `/auth` is still needed for backwards compatibility, whether the existing email/password flow is sign-in only or should include sign-up, and whether the beta-access Dialog and sign-in Dialog should coexist independently. If any assumption feels shaky, ask before proceeding.

**Workflow steps**:
1. Inspect the current home route, standalone auth route, auth client calls, Dialog primitive, and any route guards or links that reference `/auth`.
2. Design the Sign In Dialog as a continuation of the home hero: dark bordered shell, restrained amber glow, two-tone display title, rounded controls, Google option, email/password controls, loading/error feedback, and accessible title/description/focus behavior.
3. Move or extract the current `/auth` sign-in behavior into the Dialog without changing Better Auth provider names, callback target (`/dashboard` unless the code proves another target is required), cookie/session behavior, or beta-gate semantics.
4. Replace the home `Already invited? Sign in` navigation with a Dialog trigger while ensuring the existing beta-access Dialog remains usable and state does not leak between dialogs.
5. Decide how to handle `/auth`: keep a compatible route, redirect to home, or render the same dialog/fallback if existing code or external links rely on it; do not break route generation.
6. Run verification, fix issues within scope, and check for unused imports, stale route links, and broken generated route artifacts.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing checks/build still pass (`cd frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] Better Auth client calls still use `authClient.signIn.social({ provider: "google" })` and `authClient.signIn.email(...)` semantics unless explicitly approved
- [ ] Successful sign-in still lands on the dashboard or the existing intended callback URL
- [ ] Home page remains public and beta-access request flow remains unchanged
- [ ] Dialogs are keyboard accessible, include `DialogTitle`/`DialogDescription`, close predictably, and have clear loading/error states
- [ ] Visual design follows `design.md`: `#0a0a0a`, restrained `#ffba5a`, `font-display`, `font-sans`, border-first surfaces, and contained motion respecting reduced motion
- [ ] No backend API, auth_service config, database schema, or secret/env file changes

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd frontend-react && bun --bun run check && bun --bun run build`
- Expected output: Biome check and production build pass with no new type/lint errors or route-generation issues
- Observable state: visiting `/` shows the existing home hero; clicking `Already invited? Sign in` opens a polished Sign In Dialog on the home page; Google and email/password sign-in attempts use the existing Better Auth client and preserve the dashboard callback; `/auth` is either safely compatible or intentionally retired with no broken internal links
