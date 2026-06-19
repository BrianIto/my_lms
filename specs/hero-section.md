**What needs to be done**:
Move the frontend home page from the current centered beta hero with inline email form to a portfolio-inspired hero that closely matches the provided HeroSection composition, uses the phrase “Your Tactical course in *Agentic Engineering*”, and opens a beta-access email Dialog from a HeroButtons-style CTA. This hero is now the canonical design standard for the project; follow its orbit/grid, two-tone display type, restrained amber energy, and pill CTA treatment for future frontend surfaces.

**Risk level**: medium
This touches the public landing route, client-side beta request UX, animation behavior, and possibly frontend dependencies, but should not change backend contracts or schemas.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router + Tailwind CSS
- Test runner: Vitest; Biome for checks
- Verification command: `cd frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide frontend/design rules and service ownership boundaries
- `design.md` — required dark premium visual direction, typography, amber accent, border-first surfaces, and motion rules
- `plan/README.md` — plan index and cross-cutting rules
- `plan/04-frontend-design.md` — frontend design expectations for landing/beta-access screens
- `specs/beta-access-landing.md` — prior beta landing/API intent; preserve existing beta request behavior unless the code proves it changed
- `frontend-react/package.json` — confirm installed animation/dialog dependencies before importing new libraries
- `frontend-react/src/routes/index.tsx` — current canonical hero, beta request state, and existing `requestBetaAccess` integration
- `frontend-react/src/routes/__root.tsx` — document/head conventions and global app shell behavior
- `frontend-react/src/styles.css` — existing tokens, font setup, `rise-in`, `hero-orbit`, reduced-motion overrides, and whether `glow-border`/marquee styles exist
- `frontend-react/src/lib/backend-api.ts` — existing beta-access request function and response/error shape
- `frontend-react/src/components/ui/button.tsx` and `frontend-react/src/components/ui/input.tsx` — existing UI primitives and class conventions
- `frontend-react/src/components/storybook/HeroButtons.tsx`, `TagMarquee.tsx`, and `GlowingTag.tsx` — portfolio component references for the CTA/marquee style, but verify imports/aliases before reusing directly
- If adding a real modal, check whether a shadcn/Radix Dialog component already exists; if not, add the smallest project-consistent dialog component needed

**Architecture context**:
Frontend owns the public landing and beta-request UX; the existing `requestBetaAccess` helper owns the backend call from the browser. Do not change backend routes/contracts for this chore. If you discover the beta request endpoint is missing or incompatible, STOP and ask instead of silently changing API behavior.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/routes/index.tsx` — implement the new portfolio-like home hero and Dialog-triggered beta request flow
- `frontend-react/src/components/` — add focused landing/Dialog/CTA/marquee helpers only if it keeps the route maintainable
- `frontend-react/src/styles.css` — add or repair minimal reusable styles for glow borders, marquee, GSAP-safe initial states, and reduced-motion support
- `frontend-react/package.json` and `frontend-react/bun.lock` — update only if GSAP/`@gsap/react` or a required dialog package must be installed
- `frontend-react/src/lib/backend-api.ts` — touch only if needed to preserve the existing beta request call from the new Dialog

---

**Confidence check** (do this before step 1):
Restate that you are turning the LMS home page into a close adaptation of the supplied portfolio HeroSection, with the main headline changed to “Your Tactical course in Agentic Engineering” and the beta CTA opening an email Dialog. List assumptions about whether GSAP should be added, whether SplitText/DrawSVGPlugin are available/licensable in this project, and whether the existing beta-access endpoint/helper should remain unchanged. If any assumption feels shaky, ask before proceeding.

**Workflow steps**:
1. Inspect the current home route, existing beta-access helper, UI primitives, global styles, and portfolio/storybook reference components to identify what can be reused safely.
2. Decide the animation approach: use GSAP/`@gsap/react` only if dependencies/plugins are available and compatible; otherwise reproduce the same feel with existing CSS/Tailwind motion while respecting reduced motion.
3. Build the portfolio-like hero composition: centered full-height layout, rotating orbit SVG, optional marquee tags, serif split-style headline, subtle logo/course mark area if appropriate, and lower explanatory microcopy consistent with `design.md`.
4. Replace the inline beta form with a HeroButtons/GlowingTag-style primary CTA that opens a premium dark Dialog where the user enters an email and submits through `requestBetaAccess`; the Dialog should visually continue the hero with orbit/grid detail, two-tone display title, rounded controls, and restrained amber feedback.
5. Preserve accessible loading/success/error states in the Dialog, keyboard/focus behavior, mobile layout, and reduced-motion behavior.
6. Run the verification command, fix issues within scope, and grep/check for unused imports or broken aliases introduced by adapting storybook components.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing checks/build still pass (`cd frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] Existing beta-access request helper behavior and backend API path remain unchanged unless explicitly approved
- [ ] The home page remains public and does not require auth/session state
- [ ] The design keeps `#0a0a0a`, restrained amber `#ffba5a`, `font-display`, `font-sans`, border-first surfaces, and quiet premium motion
- [ ] Motion is contained and respects `prefers-reduced-motion`
- [ ] The Dialog is keyboard accessible, closes predictably, and does not trap users in an invalid state
- [ ] No secrets or real `.env` values are added

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd frontend-react && bun --bun run check && bun --bun run build`
- Expected output: Biome check and production build pass with no new type/lint errors
- Observable state: visiting `/` shows a close visual adaptation of the provided portfolio HeroSection, the main phrase reads “Your Tactical course in Agentic Engineering”, the primary beta CTA looks like the HeroButtons/GlowingTag button, and clicking it opens an email Dialog that submits beta-access requests with clear loading/success/error feedback
