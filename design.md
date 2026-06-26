# LMS Design System

A reusable design reference for the Agentic Engineering LMS. The **home screen and dashboard are the canonical base for the rest of the project**. New auth, course, lesson, admin, and empty/loading/error states should extend these screens instead of inventing a separate SaaS dashboard language.

The visual direction is **dark, precise, technical, motion-rich, and quietly premium**: black canvas, warm amber energy, thin technical grid lines, border-first surfaces, serif display typography, compact UI copy, and contained interaction animation.

## 1. Canonical Screens

### Home / Beta Landing

The home screen defines the public-facing tone:

- centered cinematic composition on a black canvas;
- side grid framing, not full-page graph paper;
- low-opacity amber and white radial atmospherics;
- centered course mark above the headline;
- slow orbital SVG behind the hero;
- marquee/signal tags for course concepts;
- two-line Halant headline with muted first line and glowing white second line;
- one primary glowing pill CTA plus one quiet secondary text action;
- concise, technical promise copy and a muted footnote.

Use this pattern for landing, auth, beta pending, invitations, and major empty states.

### Dashboard / App Cockpit

The dashboard defines the logged-in product language:

- `LmsShell` layout with top-center dynamic island navigation;
- large editorial page header with small uppercase eyebrow, Halant display title, and measured description;
- black/background surfaces with thin white borders and very restrained fills;
- course cards arranged as a continuous vertical stack with shared border rhythm;
- right-side study rail for next action, rhythm, or contextual metadata;
- amber only for progress, active labels, and subtle inset energy;
- compact stat tiles inside cards, never noisy gamification;
- calm operational copy: “next study block”, “resume”, “watch, note, complete”.

Use this pattern for dashboard, course detail, lesson player sidebars, progress views, and admin lists.

## 2. Brand Direction

- **Personality:** senior craft, technical confidence, course-builder precision.
- **Mood:** cinematic dark UI, faint machinery/grid language, quiet amber energy.
- **Core idea:** the LMS should feel like a premium engineering cockpit, not a generic course marketplace.
- **Avoid:** generic SaaS gradients, colorful dashboards, flat white panels, loud neon overload, default OAuth styling, playful gamification, and noisy analytics widgets.

## 3. Color Tokens

Use a near-black foundation with restrained whites and one warm accent.

```css
:root {
  --background: #0a0a0a;
  --foreground: #ededed;
  --amber: #ffba5a;
  --amber-low-opacity: #ffba5a0f;

  --surface: #101010;
  --surface-raised: #161616;
  --surface-control: #333333;

  --text-primary: #ffffff;
  --text-secondary: #cccccc;
  --text-muted: #999999;
  --text-subtle: #8c8c8c;
  --text-disabled: rgba(255, 255, 255, 0.4);

  --border-soft: rgba(255, 255, 255, 0.15);
  --border-default: rgba(255, 255, 255, 0.2);
  --border-faint: rgba(255, 255, 255, 0.1);
}
```

### Usage

- **Page background:** always `#0a0a0a`.
- **Primary text:** white or `#ededed`.
- **Secondary text:** `#bfbfbf`, `#999`, `#8c8c8c`, or white at 45–75% opacity.
- **Borders:** white at 10–20% opacity.
- **Accent:** `#ffba5a` only for glow, progress, focus, active status, and small technical highlights.
- **Surfaces:** mostly black/background; prefer borders and inset shadows over filled panels.
- **Fills:** `bg-white/[0.02]`, `bg-background/85`, or `bg-amber/5` are acceptable. Avoid large bright panels.

## 4. Typography

Current font pairing:

- **Display:** `Halant` via `--font-halant` / Tailwind `font-display`.
- **Body/UI:** `Atkinson Hyperlegible Next` via `--font-atkinson` / Tailwind `font-sans`.

### Type Style

- Display headings use `tracking-tighter` and tight line height.
- Home hero headline:
  - Mobile: `52px`
  - Desktop: `76px`
  - first line muted `#8c8c8c`, second line white with soft title glow.
- App shell page titles:
  - Mobile: `52px`
  - Desktop: `76px`
  - allow inline muted spans like `text-white/50` for editorial emphasis.
- Card/course titles: Halant, `text-3xl` to `text-4xl`, tight tracking.
- UI labels: `11–12px`, uppercase, `tracking-[0.16em]` to `tracking-[0.2em]`, muted.
- Supporting text: `14–15px`, soft gray, compact but readable line height.

### Copy Tone

- Direct, technical, and calm.
- Prefer tactics and concrete outcomes over abstract marketing.
- Use course/product language like “study block”, “course outline”, “progress”, “watch, note, complete”.
- Lowercase microcopy is acceptable for notes and secondary actions.

## 5. Layout & Spacing

### Public Pages

- Center the primary composition.
- Hero occupies full viewport: `h-screen`.
- Use max widths around `980px` for the home hero and `560px` for focused dialogs.
- Primary hero stack: logo → orbit → signal marquee → headline → description → CTAs → footnote.

### App Pages

- Use `LmsShell` as the base.
- Outer page padding: `px-4 py-4 sm:py-6`.
- Main content max width: about `1180px`.
- Header rhythm: topbar, then eyebrow/title/description, then content.
- Desktop dashboard/course pattern: main content plus right rail, e.g. `lg:grid-cols-[1fr_340px]`.
- Prefer continuous border stacks for course lists instead of isolated floating tiles.

### Grid Language

The grid is part of the brand:

- Thin white lines at roughly 8–10% opacity.
- Desktop square rhythm: `56px` on landing/shell backgrounds.
- Mobile square rhythm: `16px`.
- Side-only grid framing is preferred.
- Local dashboard grid accents may use `24px` rhythm when contained inside a section.

## 6. Components

### Dynamic Island Navigation

- Fixed/top-center feeling inside `LmsTopbar`.
- Black pill/container with rounded geometry.
- Active/open states move from muted gray to white.
- Keep it compact; do not turn it into a full nav bar.

### Hero-Derived Dialogs / Auth Surfaces

Dialogs and auth screens should feel like a focused continuation of the home hero:

- black/translucent surface with `border-white/20`;
- rounded large shell (`rounded-[28px]` works well);
- soft amber radial glow and optional side grid;
- optional low-opacity orbit SVG behind the title;
- centered logo/mark or status pill;
- two-tone `font-display` title;
- rounded full inputs and glow-border submit CTA;
- precise muted helper text and amber success/active feedback.

### Course Cards

Course cards should follow the dashboard base:

```tsx
<Card className="border-white/15 bg-background/85 border-0 border-l border-r border-b duration-200 hover:border-white/25 hover:shadow-[0_0_18px_rgba(255,255,255,0.08)]">
  ...
</Card>
```

Rules:

- Prefer continuous stacks with shared borders for lists.
- Use Halant for course titles.
- Include compact stat tiles for lessons, rhythm, and progress.
- Progress indicators may be amber but should remain thin and restrained.
- Card footers can use a top border and one clear action.

### Right Rail / Study Blocks

- Use for “next study block”, course metadata, lesson outline, or admin context.
- Base surface: `bg-background/85`, `border-white/15` or `border-amber/20` for active/next state.
- Amber inset glow is allowed for the primary next-action card.
- Keep text short and operational.

### Mini Stats

```tsx
<div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
    Label
  </div>
  <p className="mt-3 text-sm font-medium text-white">Value</p>
</div>
```

### Glowing Tags / Primary CTAs

Use pill CTAs with animated conic borders.

- Outer: animated `glow-border`, rounded-full.
- Inner: `bg-[#333]`, rounded-full.
- Large CTA height: `44–48px`.
- Small tag height: `28px`.
- Hover: slight scale only for important CTAs.

## 7. Motion Principles

Motion should reveal craft without distracting from learning.

Current libraries:

- **GSAP:** home hero reveal, text splitting, orbit/draw animations.
- **Motion:** component-level hover/presence/layout animations when needed.
- **CSS keyframes:** orbit, marquee, conic-border spin, simple rise-in.

### Patterns

- Home text reveal: character split, short stagger, subtle scale/y movement.
- App content reveal: `rise-in` fade/translate, around `700ms`.
- Ambient loops: slow orbit rotation (`20–60s`).
- Marquee: continuous horizontal movement, pause on hover.
- Hover: border brightening and faint white/amber shadow.
- Always respect reduced motion.

## 8. Borders, Glow & Depth

- Default structure: `border-white/15` and `border-white/20`.
- Faint internal panels: `border-white/10 bg-white/[0.02]`.
- Amber active/next state:

```tsx
shadow-[inset_0_0_24px_rgba(255,186,90,0.06)] border-amber/20
```

- White hover shadow:

```tsx
hover:shadow-[0_0_18px_rgba(255,255,255,0.08)]
```

- Hero/app title glow:

```tsx
[text-shadow:0px_12px_88px_rgba(255,255,255,0.18)]
```

## 9. LMS Screen Guidance

### Landing / Waitlist

Follow the current home screen exactly as the north star. Keep it centered, cinematic, and sparse.

### Sign In / Sign Up

Use the hero-derived dialog treatment. Google/email buttons should look native to this system: rounded, border-first, black/gray surfaces, no default bright OAuth panel.

### Beta Pending / Access Denied

Use a centered hero/dialog hybrid: status pill, two-tone display title, concise reason, one primary action, one muted secondary action.

### Dashboard

Use the current dashboard as the base: editorial shell, stacked course cards, right rail, calm progress, and compact stat tiles.

### Course Detail

Extend the dashboard pattern: large serif course title, module cards or continuous module stack, lesson rows with completion state, and a right rail for progress/next lesson.

### Lesson Player

Use a strong bordered video frame. Put the lesson outline in a side rail on desktop and below on mobile. Progress controls should be premium pills, not noisy controls.

### Admin

Admin screens should still feel like the LMS cockpit: dense, bordered, technical, and calm. Tables/lists should use thin dividers and compact labels rather than bright management-console styling.

## 10. Responsive Rules

- Mobile-first components stack vertically.
- Home remains centered on all breakpoints.
- App pages can shift from stacked mobile to `main + right rail` on desktop.
- On mobile, keep card actions and stats readable; avoid tiny multi-column dashboards.
- On desktop, use editorial left alignment inside app screens.
- Disable heavy smoothing/custom cursor on mobile.

## 11. Tailwind Conventions

- Use Tailwind utilities directly for most styling.
- Use CSS variables for core colors and fonts.
- Prefer arbitrary values when precision matters, e.g. `text-[52px]`, `tracking-[0.18em]`, `shadow-[...]`.
- Use `bg-background`, `text-foreground`, `font-display`, `font-sans`, `text-amber`, and white opacity utilities consistently.

## 12. Design Checklist

Before shipping a new page/component, verify:

- It clearly extends either the home hero or dashboard cockpit pattern.
- It uses black canvas and border-first surfaces.
- Typography follows Halant display + Atkinson UI/body pairing.
- Amber is rare and meaningful.
- Progress and completion states are calm, not gamified.
- There is one polished reveal/hover behavior where appropriate.
- Mobile stacks cleanly and desktop feels editorial.
- Reduced-motion users are respected.
- The result feels like a premium technical course platform, not a generic LMS template.
