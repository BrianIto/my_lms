**What needs to be done**:
Improve the frontend from awkward/cramped layouts at a 390x844 viewport to polished, readable, mobile-first layouts across the LMS landing, protected shell, dashboard, course outline, lesson player, and admin screens.

**Risk level**: medium

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/Router + Tailwind CSS + shadcn/ui-style components
- Test runner: Vitest
- Verification command: `cd frontend-react && bun --bun run test && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo rules, frontend design rules, and command conventions.
- `design.md` — canonical visual direction; mobile changes must preserve the dark, precise, technical, premium LMS identity.
- `plan/README.md` — plan index and cross-cutting constraints.
- `plan/04-frontend-design.md` — frontend-specific mobile, motion, and LMS screen expectations.
- `frontend-react/package.json` — exact scripts, dependencies, and test tooling.
- `frontend-react/src/components/lms-shell.tsx` — shared protected-page shell likely responsible for global mobile spacing/header behavior.
- `frontend-react/src/routes/index.tsx` — public landing/beta screen; verify hero and dialogs at 390x844.
- `frontend-react/src/routes/_protected.dashboard.tsx` — dashboard course stack and study rail; likely needs better single-column mobile composition.
- `frontend-react/src/routes/_protected.courses.$slug.tsx` — course detail/module lesson rows; verify touch targets and wrapping.
- `frontend-react/src/routes/_protected.courses.$slug_.lessons.$lessonId.tsx` — lesson player/video and progress controls; ensure video/sidebar stack well on small screens.
- `frontend-react/src/routes/_protected.admin.tsx` — admin control plane has dense cards/dialogs/forms; make it usable at 390px without horizontal overflow.
- `frontend-react/src/styles.css` — global tokens, typography, animation, and responsive utilities.

**Architecture context**:
The frontend uses a shared `LmsShell` for protected screens and route-level components for page-specific layouts. Preserve the design system from `design.md`: black canvas, amber used sparingly, border-first cards, Halant display type, Atkinson UI/body type, and contained motion. If you find the 390x844 problem is caused by generated routes or backend data contracts instead of layout/CSS, STOP and ask before proceeding.

---

**Scope — areas you must NOT modify** (blacklist; BLACKLIST ONLY CRITICAL STUFF, do not go out blacklisting everything):
- Backend/auth service code under `backend-go/` and `auth_service/`.
- API contracts and data mapping in `frontend-react/src/lib/backend-api.ts` unless a UI-only type guard is strictly necessary.
- Generated route tree files such as `frontend-react/src/routeTree.gen.ts`.
- Database migrations, deploy files, and production environment examples.

> Use ONE of the two sections above, not both. Whitelist = "only touch these." Blacklist = "touch anything except these."

---

**Confidence check** (do this before step 1):
Restate the chore in your own words in 2–3 sentences. List any assumption you are making, especially which screens look broken at 390x844 and whether the issue is overflow, cramped spacing, oversized typography, navigation, dialogs, or video/admin density. If any assumption feels shaky, ask before proceeding.

**Workflow steps**:
1. Audit the app at a 390x844 viewport and identify the specific screens/components causing ugly mobile layout or horizontal overflow.
2. Adjust shared responsive foundations first (`LmsShell`, global styles, shared cards/buttons/dialog patterns) while preserving desktop composition.
3. Refine route-level mobile layouts for landing, dashboard, course detail, lesson player, and admin screens with mobile-first spacing, readable type scales, usable touch targets, and no horizontal scrolling.
4. Verify reduced-motion, dark design tokens, loading/error states, and dialog/form usability on small screens.
5. Update or add focused tests only where behavior changes are introduced, then run the verification command.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests still pass (`cd frontend-react && bun --bun run test && bun --bun run build`)
- [ ] Type checks pass as part of the production build
- [ ] No new horizontal overflow at 390x844 on the landing, dashboard, course detail, lesson player, or admin screens
- [ ] Desktop/tablet layouts remain aligned with the existing editorial LMS composition
- [ ] Better Auth/session behavior and backend API request behavior remain unchanged
- [ ] Motion remains contained and respects reduced-motion preferences

**Done looks like**:
- Files changed: frontend UI/layout/style files only, within the scope above.
- Command to verify: `cd frontend-react && bun --bun run test && bun --bun run build`
- Expected output: all tests pass and the production build completes with 0 type errors.
- Observable state: at 390x844, core LMS screens are readable, visually balanced, touch-friendly, free of horizontal scrolling, and still match `design.md`.
