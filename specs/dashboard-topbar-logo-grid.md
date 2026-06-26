**What needs to be done**:
Move the LMS dashboard/shell branding from the current local `Course OS` book-icon header to the same logo mark used on the home page, centralized in a reusable topbar component, and add home-dialog-style side grid framing to the dashboard shell.

**Risk level**: medium
This is frontend-only, but it touches shared LMS layout/branding components used by multiple routes.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router + Tailwind CSS
- Test runner: Vitest; Biome for checks
- Verification command: `cd frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide LMS boundaries, UI requirements, and implementation rules
- `frontend-react/AGENTS.md` — frontend-specific TanStack/shadcn conventions and commands
- `design.md` — canonical dark/premium design system, logo/orbit/grid language, typography, and motion constraints
- `plan/README.md` — plan index and cross-cutting LMS constraints
- `plan/04-frontend-design.md` — LMS frontend visual expectations and dashboard guidance
- `frontend-react/package.json` — confirm scripts, React/TanStack versions, and current dependencies
- `frontend-react/src/routes/index.tsx` — home page visual source of truth; `CourseLogo` currently lives here and is the mark to reuse
- `frontend-react/src/components/lms-shell.tsx` — shared shell that currently owns the LMS header/nav and dashboard background/grid framing
- `frontend-react/src/routes/dashboard.tsx` — dashboard route that consumes `LmsShell` and should receive the improved grid/framing treatment
- `frontend-react/src/components/sign-in-dialog.tsx` — existing dialog implementation showing the side grid/orbit pattern to echo without overdoing it
- `frontend-react/src/styles.css` — existing theme tokens, `hero-orbit`, `glow-border`, reduced-motion handling, and grid/motion utilities

**Architecture context**:
The home page is the canonical brand reference; shared LMS branding should not be duplicated route-by-route. There does not appear to be an existing `Topbar`/`TopBar` component, so create one if that remains true after your search. If you find an existing topbar-like component or a conflict with route/layout ownership, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/components/lms-shell.tsx` — use the centralized topbar and add dashboard/shell grid framing consistent with home dialogs
- `frontend-react/src/components/lms-topbar.tsx` — create if no topbar component exists; centralize logo + nav here
- `frontend-react/src/components/course-logo.tsx` — create if needed so the home page and topbar can share the same logo mark
- `frontend-react/src/routes/index.tsx` — update only as needed to import/reuse the shared logo component instead of keeping a route-local duplicate
- `frontend-react/src/routes/dashboard.tsx` — adjust only if needed for layout classes/content spacing after the shell grid/topbar change
- `frontend-react/src/styles.css` — add only minimal reusable grid/motion utilities if Tailwind classes in components are insufficient

---

**Confidence check** (do this before step 1):
Restate that you are centralizing the LMS logo/nav into a topbar and making the dashboard shell visually match the home page/dialog grid language. Confirm the assumption that the home page `CourseLogo` SVG is the desired logo and that route behavior/data should remain unchanged. If the logo should be text-only, image-based, or different from the home SVG, ask before coding.

**Workflow steps**:
1. Search for existing topbar/header/logo components and confirm where the home page logo is defined and used.
2. Extract or create a reusable `CourseLogo` component, then use it on the home page and in the LMS topbar without changing the SVG’s visual identity.
3. Create a centralized LMS topbar component if none exists, moving the `LmsShell` brand link and nav into it while preserving current routes and labels.
4. Update `LmsShell` to render the topbar and add dialog/home-style side grid framing to the dashboard shell using the existing dark canvas, white/10 borders, amber restraint, and responsive grid sizes.
5. Review dashboard, course detail, and lesson player pages that use `LmsShell` to ensure the new topbar/grid does not crowd content on mobile or desktop.
6. Run the verification command and fix any type, lint, import, or build issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests/checks still pass (`cd frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] Public route paths and TanStack Router file-route names remain unchanged
- [ ] Home page beta request and sign-in dialog behavior remain unchanged
- [ ] LMS nav links to `/`, `/admin`, and `/dashboard` remain accessible and keyboard-focusable
- [ ] Course/dashboard/lesson data rendering and links remain unchanged
- [ ] The home page logo visual identity is preserved while being reusable
- [ ] Dashboard/shell grid styling follows `design.md`: `#0a0a0a`, restrained `#ffba5a`, side grid framing, border-first surfaces, Halant/Atkinson typography
- [ ] No backend, auth service, database schema, API contract, generated route tree, lockfile, or secret/env files are modified

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd frontend-react && bun --bun run check && bun --bun run build`
- Expected output: Biome check and production build pass with no new type/lint errors or warnings
- Observable state: dashboard and all `LmsShell` pages show the home page logo via a centralized topbar, and the dashboard shell has dialog/home-style side grid framing without duplicating branding code.
