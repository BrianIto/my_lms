**What needs to be done**:
Move the copied portfolio Dynamic Island navigation from a Next/GSAP-scroll-context implementation that does not work in `frontend-react` to a TanStack Start-compatible LMS topbar/dynamic-island implementation that preserves the portfolio interaction style while navigating the LMS routes correctly.

**Risk level**: medium
This is frontend-only, but it touches shared shell/topbar navigation used by dashboard, course detail, lesson player, and admin routes.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router + Tailwind CSS + Motion + GSAP
- Test runner: Vitest; Biome for checks
- Verification command: `cd frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide LMS boundaries, UI rules, and verification expectations
- `frontend-react/AGENTS.md` — frontend-specific TanStack/shadcn conventions and commands
- `design.md` — canonical dark/premium design system, dynamic island guidance, typography, and motion constraints
- `plan/README.md` — plan index and cross-cutting LMS constraints
- `plan/04-frontend-design.md` — frontend visual expectations and LMS screen guidance
- `frontend-react/package.json` — confirm React, TanStack, Motion, Remix Icon, GSAP, Biome scripts
- `frontend-react/src/components/lms-topbar.tsx` — currently consumes `DynamicIsland` and should remain the shared shell topbar owner
- `frontend-react/src/components/lms-shell.tsx` — shared LMS layout that renders the topbar across admin/dashboard/course/lesson pages
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — copied portfolio component that currently imports a missing scroll context and assumes section scrolling
- `frontend-react/src/components/storybook/DynamicIsland.ListItem.tsx` — submenu item rendering and keyboard-related companion component
- `frontend-react/src/components/storybook/TextChangeAnimate.tsx` — text transition helper; remove Next-only imports and keep Motion animation
- `frontend-react/src/routes/index.tsx` — home route and IDs if home-section navigation is preserved
- `frontend-react/src/routes/dashboard.tsx` — dashboard consumer of `LmsShell`; verify topbar spacing on this page
- `frontend-react/src/routes/courses.$slug.tsx` — course detail consumer of `LmsShell`; verify topbar navigation does not crowd content
- `frontend-react/src/routes/courses.$slug.lessons.$lessonId.tsx` — lesson player consumer of `LmsShell`; verify fixed topbar does not cover video/content
- `frontend-react/src/routes/admin.tsx` — admin consumer of `LmsShell`; preserve `/admin` access
- `../portfolio/app/components/DynamicIsland.tsx` — source reference for the intended dynamic island behavior and styling
- `../portfolio/app/components/DynamicIsland.ListItem.tsx` — source reference for nested list behavior
- `../portfolio/app/context/ScrollContext.tsx` — explains why the portfolio component cannot be copied directly into TanStack Start

**Architecture context**:
The portfolio Dynamic Island is a visual/interaction reference, not a contract to copy literally: `frontend-react` uses TanStack Router links/navigation, not Next app routing or the portfolio `ScrollContext`/`ScrollSmoother`. Shared LMS navigation belongs in `LmsTopbar`, and `LmsShell` should not duplicate route links. If you find an existing production topbar/navigation component besides `LmsTopbar`, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/components/lms-topbar.tsx` — keep it as the shared LMS topbar owner and integrate/finalize Dynamic Island usage here
- `frontend-react/src/components/storybook/DynamicIsland.tsx` — adapt the portfolio component to TanStack Start routing and LMS routes
- `frontend-react/src/components/storybook/DynamicIsland.ListItem.tsx` — fix unused imports, types, submenu behavior, and accessibility as needed
- `frontend-react/src/components/storybook/TextChangeAnimate.tsx` — remove Next-only imports and keep Motion-compatible text animation
- `frontend-react/src/components/lms-shell.tsx` — adjust only if topbar positioning/spacing needs shell-level padding or layout changes
- `frontend-react/src/routes/index.tsx` — adjust only if home anchor IDs/navigation targets need to remain compatible
- `frontend-react/src/routes/dashboard.tsx` — adjust only if topbar spacing/content crowding requires local layout tweaks
- `frontend-react/src/styles.css` — add only minimal reusable reduced-motion or dynamic-island styling if Tailwind utilities are insufficient

---

**Confidence check** (do this before step 1):
Restate that you are making the portfolio Dynamic Island work inside the TanStack LMS frontend by replacing portfolio-specific section scrolling/context with route-aware LMS navigation. Confirm the assumption that the visual behavior should stay close to `../portfolio/app/components/DynamicIsland.tsx`, but route behavior must use `/`, `/dashboard`, and `/admin` plus course-related links where appropriate. If the desired nav items are different from the current LMS topbar links, ask before coding.

**Workflow steps**:
1. Compare the frontend copy against `../portfolio/app/components/DynamicIsland.tsx`, `DynamicIsland.ListItem.tsx`, and `ScrollContext.tsx`; identify every Next/portfolio-specific dependency that must be removed or replaced.
2. Define an LMS route-aware island model with stable typed nav items and no missing providers; preserve accessible links to `/`, `/admin`, and `/dashboard`.
3. Refactor `DynamicIsland.tsx`, `DynamicIsland.ListItem.tsx`, and `TextChangeAnimate.tsx` to use TanStack Router primitives/hooks instead of portfolio `useScroll`, to satisfy React hook dependency rules, and to keep keyboard/mouse behavior working.
4. Integrate the finished island in `LmsTopbar` without duplicating nav markup elsewhere; keep the topbar responsive, keyboard-focusable, and visually aligned with `design.md`.
5. Review dashboard, course detail, lesson player, and admin pages that render `LmsShell` so the fixed/absolute island does not cover content on mobile or desktop.
6. Run the verification command and fix any type, lint, import, accessibility, or build issues within scope.

Useful implementation notes/code chunks:

```tsx
// Prefer route navigation over portfolio ScrollContext/ScrollSmoother.
import { Link, useLocation, useNavigate } from "@tanstack/react-router";

type IslandItem = {
  name: string;
  to?: "/" | "/dashboard" | "/admin";
  icon?: React.ElementType;
  sub?: Array<{ name: string; to: "/" | "/dashboard" | "/admin" }>;
};

const pages = [
  { name: "Home", to: "/", icon: RiHome2Line },
  { name: "Learning", to: "/dashboard", icon: RiComputerLine },
  { name: "Admin", to: "/admin", icon: RiShieldCheckLine },
] satisfies IslandItem[];
```

```tsx
// Derive active label from TanStack location instead of currentSection.
const location = useLocation();
const activePage = pages.find((page) => page.to === location.pathname) ?? pages[0];
const CurrentIcon = activePage.icon ?? RiHome2Line;
```

```tsx
// Programmatic navigation for keyboard Enter; mouse users can still use Link/asChild if preferred.
const navigate = useNavigate();
const handleNavigate = useCallback(
  (to: NonNullable<IslandItem["to"]>) => {
    void navigate({ to });
    setOpen(false);
    setPageIndex(-1);
  },
  [navigate],
);
```

```tsx
// Avoid stale closure diagnostics by memoizing pages or defining them outside the component.
useEffect(() => {
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "/") {
      event.preventDefault();
      setOpen((value) => !value);
      return;
    }
    if (!open) return;
    // Arrow/Escape/Enter handling here using pages.length and handleNavigate.
  }

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [open, selectedIndex, handleNavigate]);
```

```tsx
// TextChangeAnimate should not import from next/font/google in this Vite/TanStack app.
import { motion } from "motion/react";

export default function TextChangeAnimate({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex flex-1 justify-center px-2"
    >
      {text || "Home"}
    </motion.div>
  );
}
```

```tsx
// List item type direction: keep buttons for submenu toggles and links/buttons for leaf navigation.
type IslandLeaf = { name: string; to: "/" | "/dashboard" | "/admin" };
type IslandPage = IslandLeaf & { icon?: React.ElementType; sub?: IslandLeaf[] };
```

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests/checks still pass (`cd frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] LMS nav links to `/`, `/admin`, and `/dashboard` remain accessible and keyboard-focusable
- [ ] Public route paths and TanStack Router file-route names remain unchanged
- [ ] `LmsShell` pages still render their data/content unchanged
- [ ] Home page beta request and sign-in dialog behavior remain unchanged
- [ ] No `../portfolio` files are modified; it is read-only reference material
- [ ] No Next-only imports remain in `frontend-react`, especially `next/font/google`
- [ ] No dependency on missing `ScrollContext`/`ScrollSmoother` providers remains in the LMS topbar path
- [ ] No backend, auth service, database schema, API contract, generated route tree, lockfile, or secret/env files are modified

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd frontend-react && bun --bun run check && bun --bun run build`
- Expected output: Biome check and production build pass with no new type/lint errors or warnings
- Observable state: `LmsTopbar` renders a working Dynamic Island in all `LmsShell` pages; `/`, `/dashboard`, and `/admin` navigation works by mouse and keyboard; `rg "useScroll|ScrollContext|next/font/google" frontend-react/src/components/storybook frontend-react/src/components/lms-topbar.tsx` returns no relevant Dynamic Island/topbar dependencies.
