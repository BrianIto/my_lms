**What needs to be done**:
Move the frontend from native page scrolling to a portfolio-style smooth scrolling shell on every page.

- Identify how `../portfolio` implements smooth scrolling with GSAP `ScrollSmoother`.
- Add an equivalent reusable smooth-scroll provider/shell to `frontend-react`.
- Wrap all TanStack Router pages once at the root so landing, protected dashboard, admin, course detail, and lesson player pages share the same smooth scroll behavior.
- Preserve route scroll restoration, anchors/programmatic scrolling where possible, and reduced-motion/mobile behavior.

**Risk level**: medium

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router + Tailwind CSS
- Test runner: Vitest
- Verification command: `cd frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `design.md` — global frontend design and motion constraints; smooth scrolling must remain premium and respect reduced motion.
- `plan/README.md` — project plan index and cross-cutting rules.
- `plan/04-frontend-design.md` — frontend motion/layout requirements.
- `frontend-react/package.json` — confirms React/TanStack/GSAP dependencies and scripts.
- `frontend-react/src/routes/__root.tsx` — root document where a global scroll wrapper likely belongs.
- `frontend-react/src/router.tsx` — TanStack Router scroll restoration configuration that must not be broken.
- `frontend-react/src/styles.css` — global body/html styles and reduced-motion rules.
- `frontend-react/src/routes/_protected.tsx` — protected layout and dynamic island placement.
- `../portfolio/app/page.tsx` — canonical smooth scroll implementation using `gsap`, `@gsap/react`, `ScrollSmoother`, `ScrollTrigger`, `#smooth-wrapper`, and `#smooth-content`.
- `../portfolio/app/context/ScrollContext.tsx` — portfolio context shape for `scrollSmootherRef` and programmatic scrolling.
- `../portfolio/app/projects/commitsense/page.tsx` — second portfolio example showing smooth scrolling on project pages.

**Architecture context**:
The LMS frontend uses TanStack Router with a root document in `src/routes/__root.tsx`; global page chrome and providers should be added once, not duplicated per route. The app already depends on `gsap` and `@gsap/react`, matching the portfolio pattern, but if `ScrollSmoother` is unavailable in this installation, install/add the needed supported package or stop and explain the licensing/package constraint before choosing a different smooth-scroll library. If this conflicts with the router's scroll restoration or SSR behavior, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/package.json` — only if a smooth-scroll dependency is genuinely missing.
- `frontend-react/bun.lock` — only if dependency installation changes it.
- `frontend-react/src/routes/__root.tsx` — wrap all pages in the smooth-scroll shell/provider.
- `frontend-react/src/router.tsx` — only if TanStack scroll restoration needs adjustment for the smooth-scroll wrapper.
- `frontend-react/src/styles.css` — add global wrapper/body styles required by the smooth-scroll implementation.
- `frontend-react/src/components/` — add a reusable smooth-scroll provider/component if appropriate.
- `frontend-react/src/lib/` — add a small hook/context utility if appropriate.
- `frontend-react/src/routes/` — only for minimal fixes where a route has page-level scroll assumptions that break under the global wrapper.

---

**Confidence check** (do this before step 1):
Restate the chore in your own words in 2–3 sentences. List any assumption you are making. If any assumption feels shaky, ask before proceeding.

**Workflow steps**:
1. Compare `../portfolio` smooth-scroll implementation with the LMS root/router structure and identify the smallest global integration point.
2. Implement a reusable smooth-scroll provider/shell using the portfolio behavior: `ScrollSmoother.create({ smooth: isMobile ? 0 : 0.8, effects: !isMobile, smoothTouch: 0 })`, proper plugin registration, cleanup on unmount, and `#smooth-wrapper` / `#smooth-content` structure.
3. Wire the provider at the LMS root so every route is inside the smooth content without duplicating dynamic islands, toasters, devtools, scripts, or route outlets.
4. Respect reduced motion and mobile/touch behavior; do not force heavy animation for users who prefer reduced motion.
5. Verify route changes, protected pages, anchor/programmatic scrolling, and scroll restoration do not regress.
6. Run the verification command and fix any type, lint, or build issues.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests still pass (`cd frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] TanStack Router route rendering and `scrollRestoration` still work acceptably with the smooth-scroll wrapper
- [ ] Existing design system remains intact: dark canvas, amber restraint, border-first surfaces, and contained motion
- [ ] Reduced-motion users do not get forced smooth/animated scrolling
- [ ] No duplicate `id="smooth-wrapper"` or `id="smooth-content"` elements are rendered per page
- [ ] No new sync I/O or heavy per-frame React state updates in the request/render path

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd frontend-react && bun --bun run check && bun --bun run build`
- Expected output: all checks pass, build completes, 0 type errors, no new warnings caused by the change
- Observable state: every LMS page scrolls smoothly like `../portfolio`, with smooth scrolling disabled/reduced on mobile or reduced-motion contexts as appropriate
