**What needs to be done**:
Move the frontend LMS screens from architecture/access-model exposition and `lucide-react` icons to a learning-environment-focused UI that follows `design.md` and the current home page visual language, using Remix Icon components instead of Lucide icons.

**Risk level**: medium
This is a broad frontend design/dependency cleanup touching shared route components and package metadata, but it should not change backend/auth contracts, schemas, or persisted state.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router + Tailwind CSS
- Test runner: Vitest; Biome for checks
- Verification command: `cd frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide service boundaries, design requirements, and frontend rules
- `frontend-react/AGENTS.md` — frontend-specific TanStack/shadcn conventions and commands
- `design.md` — required black canvas, amber restraint, Halant/Atkinson typography, grid/orbit language, border-first cards, and motion rules
- `plan/README.md` — plan index and cross-cutting LMS constraints
- `plan/04-frontend-design.md` — frontend screen expectations for dashboard, course detail, and lesson player
- `frontend-react/package.json` — confirm current dependencies, scripts, and whether `@remixicon/react` needs to be installed
- `frontend-react/src/routes/index.tsx` — current home page/canonical hero visual reference to align the rest of the LMS with
- `frontend-react/src/components/lms-shell.tsx` — shared LMS page shell, nav, header copy, and current architecture/access gate messaging
- `frontend-react/src/routes/dashboard.tsx` — dashboard content currently mentioning beta access, cache keys, access model, and Lucide icons
- `frontend-react/src/routes/courses.$slug.tsx` — course outline page currently mentioning cache boundaries and Lucide icons
- `frontend-react/src/routes/courses.$slug.lessons.$lessonId.tsx` — lesson player currently mentioning payload/cache/endpoint implementation details and Lucide icons
- `frontend-react/src/routes/admin.tsx`, `frontend-react/src/components/sign-in-dialog.tsx`, `frontend-react/src/components/ui/dialog.tsx`, and `frontend-react/src/components/ui/select.tsx` — additional `lucide-react` import sites to migrate if the dependency is removed
- `frontend-react/src/styles.css` — existing design tokens, grid/glow/marquee/orbit animations, font setup, and reduced-motion behavior

**Architecture context**:
Frontend pages should present a premium course-taking environment; auth, beta access, cache strategy, and backend endpoint details are implementation concerns and should not be foregrounded in learner-facing UI. Keep existing routes and data helpers unless the code proves they are broken. If you find that removing `lucide-react` affects generated or third-party-owned code, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/package.json` and `frontend-react/bun.lock` — add `@remixicon/react`; remove `lucide-react` only after all first-party imports are migrated and verification passes
- `frontend-react/src/components/lms-shell.tsx` — replace architecture/access gate copy with learner-focused shell content and migrate icons
- `frontend-react/src/routes/dashboard.tsx` — remove access-model/cache/internal structure messaging, refocus cards/sidebar on learning progress and next lessons, migrate icons
- `frontend-react/src/routes/courses.$slug.tsx` — remove cache-boundary/internal implementation copy, refine course outline for learning flow, migrate icons
- `frontend-react/src/routes/courses.$slug.lessons.$lessonId.tsx` — remove payload/cache/endpoint implementation copy, refine lesson player/progress controls, migrate icons
- `frontend-react/src/routes/index.tsx` — migrate icons to Remix Icon while preserving current home page behavior and visual direction
- `frontend-react/src/routes/admin.tsx` — migrate icons only; do not redesign admin beyond what is necessary to eliminate Lucide usage
- `frontend-react/src/components/sign-in-dialog.tsx` — migrate icons only; preserve Better Auth behavior
- `frontend-react/src/components/ui/dialog.tsx` and `frontend-react/src/components/ui/select.tsx` — migrate primitive icons only if they import Lucide
- `frontend-react/src/styles.css` — add only minimal reusable design/motion utilities needed for the revamp

---

**Confidence check** (do this before step 1):
Restate that you are revamping the LMS frontend so learner-facing pages emphasize course progress, lessons, and study flow instead of access models, cache keys, backend endpoints, or architecture notes. Confirm the assumption that Remix Icon should be provided by `@remixicon/react` and that existing routes/data behavior should remain intact. If you are unsure whether admin/internal pages should keep implementation copy, ask before redesigning them; otherwise only migrate their icons.

**Workflow steps**:
1. Inventory all `lucide-react` imports and all learner-facing copy that mentions access model, beta gates, cache boundaries, payloads, backend endpoints, or internal architecture.
2. Install `@remixicon/react` if it is not present, then migrate first-party icon imports to Remix Icon components using consistent sizing and accessible `aria-hidden` usage.
3. Redesign `LmsShell`, dashboard, course detail, and lesson player around the home page/design.md language: black canvas, side grid/orbit/glow details, Halant display headings, Atkinson UI text, border-first cards, restrained amber progress and active states.
4. Replace internal explanatory panels with learner-focused content such as next lesson, course rhythm, modules, completion, study notes, lesson outline, duration, and calm progress controls.
5. Preserve existing navigation, route params, mock LMS data usage, auth/sign-in behavior, beta request behavior, shadcn primitives, mobile layouts, keyboard accessibility, and reduced-motion support.
6. Remove `lucide-react` from dependencies only if `rg "lucide-react" frontend-react/src frontend-react/package.json` confirms there are no remaining source imports, then run the verification command and fix issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing checks/build still pass (`cd frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] Public route paths and TanStack Router file-route names remain unchanged
- [ ] Better Auth/sign-in and beta-access request behavior remain unchanged
- [ ] Course data lookup, lesson links, YouTube iframe rendering, and progress display remain functional
- [ ] Learner-facing pages no longer foreground access-model, cache-key, backend endpoint, payload, allowlist, or architecture-copy panels
- [ ] No `lucide-react` imports remain in first-party frontend source after migration
- [ ] The visual system keeps `#0a0a0a`, restrained `#ffba5a`, `font-display`, `font-sans`, border-first surfaces, home-page grid/orbit/glow cues, and quiet premium motion
- [ ] Motion remains contained and respects `prefers-reduced-motion`
- [ ] No backend, auth service, database schema, API contract, generated route tree, or secret/env files are modified unless explicitly required by the build and approved

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd frontend-react && bun --bun run check && bun --bun run build`
- Expected output: Biome check and production build pass with no new type/lint errors or warnings
- Observable state: dashboard, course detail, and lesson player feel like a premium learning environment aligned with the home page and `design.md`; internal access/cache/backend copy is gone from learner-facing UI; `rg "lucide-react" frontend-react/src frontend-react/package.json` returns no first-party source imports and no dependency entry if it was safely removed
