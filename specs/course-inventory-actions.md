**What needs to be done**:
Change the admin Course inventory row actions from labeled outline/grid buttons to compact icon-only ghost actions on desktop, and to a mobile three-dot action menu with the outline shown as an accordion-style disclosure, adding Motion/React presence animation for opening and closing UI.

**Risk level**: medium
This is frontend-only, but it changes interactive/admin UI behavior, responsive layout, accessibility labels, and animated state.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router + Tailwind CSS + shadcn-style components
- Test runner: Vitest; Biome for checks
- Verification command: `cd frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide service boundaries, required planning/design docs, and frontend design rules
- `frontend-react/AGENTS.md` — frontend commands and TanStack/shadcn project conventions
- `design.md` — required dark, precise, border-first, amber-restrained UI language and motion/reduced-motion expectations
- `plan/README.md` — plan index and cross-cutting LMS constraints
- `plan/04-frontend-design.md` — frontend design implementation rules for admin/course UI
- `frontend-react/package.json` — confirm React, Motion, Remix Icon, scripts, and available dependencies
- `frontend-react/src/routes/_protected.admin.tsx` — Course inventory implementation, `AdminCourseRow`, `CourseDialog`, `ModuleDialog`, current action buttons, and course outline rendering
- `frontend-react/src/components/ui/button.tsx` — existing `ghost`, `xs`, and `icon-xs` button variants to reuse before adding new styles
- `frontend-react/src/components/sign-in-dialog.tsx` — existing `motion/react` + `AnimatePresence` pattern and reduced-motion handling in first-party code
- `frontend-react/src/styles.css` — existing motion utilities and `prefers-reduced-motion` conventions

**Architecture context**:
Admin UI lives in the protected frontend route and should not change backend APIs, auth/session behavior, course mutation semantics, or TanStack Query keys. Keep the LMS cockpit style from `design.md`: black canvas, thin borders, restrained amber, compact controls, and contained motion. If the requested “without the grid, only in the left of the text” conflicts with current layout semantics or is unclear after inspecting the code, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/routes/_protected.admin.tsx` — update Course inventory row action layout, responsive mobile action menu/accordion behavior, and Motion/AnimatePresence animation
- `frontend-react/src/components/ui/button.tsx` — only if an existing size/variant cannot express icon-only ghost xs controls without duplicating classes; prefer no change
- `frontend-react/src/styles.css` — only for minimal reusable motion/accessibility utility if inline Tailwind/Motion props are insufficient; prefer no change

---

**Confidence check** (do this before step 1):
Restate that you are only changing the admin Course inventory row controls: desktop should show compact icon-only ghost xs buttons for outline/hide, edit, and module actions, positioned to the left of the course text rather than in a separate grid/right action column. On mobile, edit/module actions should move behind a vertical three-dot menu, while outline/hide remains a visible accordion-style disclosure for the course outline. Confirm the assumption that the existing `Open` action should remain functionally available and visually consistent, but is not the primary target unless the row action layout requires moving it into the mobile menu.

**Workflow steps**:
1. Inspect `AdminCourseRow`, `CourseDialog`, `ModuleDialog`, existing `Button` variants, and any existing Motion patterns to understand current action rendering and state ownership.
2. Refactor the desktop Course inventory row layout so it no longer uses a right-side grid action column; put icon-only ghost xs controls to the left of the course title/text, with clear `aria-label`s, tooltips/titles where appropriate, and no visible “Hide”, “Edit”, or “Module” labels.
3. Implement the mobile behavior: keep the outline/hide control as an accordion-style disclosure for the outline, and move the other row actions into an accessible vertical three-dot menu that can be opened, closed, keyboard-reached, and dismissed predictably.
4. Add `motion/react` `AnimatePresence`/`motion` transitions for the outline accordion and mobile menu presence; keep animation subtle, dark-premium, and disabled or minimized for reduced-motion users.
5. Preserve existing dialogs, mutations, query invalidation, toasts, route links, and admin access gating; update imports/icons only as needed.
6. Run the verification command and fix any type/lint/build issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing checks/build still pass (`cd frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] Course create/edit/module dialogs still open and submit exactly as before
- [ ] Course outline fetch still only runs when the outline/accordion is open
- [ ] Admin route auth gating and TanStack Query keys remain unchanged
- [ ] Icon-only controls have accessible names and keyboard focus states
- [ ] Mobile three-dot menu does not trap focus or leave unreachable actions
- [ ] Motion is contained, subtle, and respects reduced-motion preferences
- [ ] No backend, auth service, database schema, API contract, generated route tree, lockfile, or env/secret files are modified

**Done looks like**:
- Files changed: preferably only `frontend-react/src/routes/_protected.admin.tsx`; otherwise only files within scope above
- Command to verify: `cd frontend-react && bun --bun run check && bun --bun run build`
- Expected output: Biome check and production build pass with no new type/lint errors or warnings
- Observable state: Course inventory desktop rows show xs ghost icon-only controls at the left of the course text with no action grid; mobile rows show an outline accordion control plus a vertical three-dot menu for row actions; outline/menu open and close with polished Motion presence animation
