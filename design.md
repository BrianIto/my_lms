# Portfolio Design System

A reusable design reference for Brian Ito's portfolio and adjacent projects. The visual direction is **dark, precise, technical, motion-rich, and quietly premium**: black canvas, warm amber accents, thin grid lines, rounded utility surfaces, serif display typography, and deliberate interaction animation.

**Current standard:** the new Agentic Engineering hero is the canonical reference for this project. New LMS screens, dialogs, and docs should borrow its centered cinematic composition, orbit/grid mechanics, two-tone serif headline treatment, soft white title glow, restrained amber energy, and pill CTA language before inventing a new pattern.

## 1. Brand Direction

- **Personality:** senior craft, technical confidence, design-forward engineering.
- **Mood:** cinematic dark UI, faint machinery/grid language, subtle glowing energy.
- **Core idea:** components should feel like polished developer tools with editorial typography and handcrafted motion.
- **Avoid:** generic SaaS gradients, colorful dashboards, flat white cards, loud neon overload, default system typography.

## 2. Color Tokens

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

- **Page background:** `#0a0a0a` only.
- **Primary text:** white or `#ededed`.
- **Secondary headings:** `#999`, `#8c8c8c`, or white at 45–70% opacity.
- **Borders:** white at 10–20% opacity.
- **Accent:** amber only for glow, orbit details, highlights, and active energy states.
- **Cards:** keep mostly black/background; use borders instead of filled panels.

## 3. Typography

Current font pairing:

- **Display:** `Halant` via `--font-halant` / Tailwind `font-display`.
- **Body/UI:** `Atkinson Hyperlegible Next` via `--font-atkinson` / Tailwind `font-sans`.

### Type Style

- Display headings use tight tracking: `tracking-tighter`.
- Hero display type is large, serif, and slightly compressed by spacing:
  - Mobile: `52px`
  - Desktop: `76px`
- Section headings:
  - Mobile: `40px`
  - Tablet: `44px`
  - Desktop: `60–62px`
- Card titles: `19px`, `font-medium`, tight tracking.
- Supporting text: `14–15px`, soft gray, compact line height.

### Copy Tone

- Direct, conversational, slightly informal.
- Prefer specific capability statements over abstract marketing.
- Lowercase microcopy is acceptable for secondary buttons and notes.

## 4. Layout & Spacing

### Page Structure

- Center all main sections.
- Use a narrow max-width rhythm:
  - Medium sections: `md:max-w-[700px]`
  - Large sections: `lg:max-w-[940px]`
- Hero occupies full viewport: `h-screen`.
- The Agentic Engineering hero is the project baseline: centered logo/mark, slow orbit SVG, marquee signal tags, two stacked display lines, compact supporting copy, and a primary glowing pill CTA with a secondary text link.
- Sections are stacked vertically with generous breathing room.

### Grid Language

The background grid is part of the brand:

- Thin white lines at `10%` opacity.
- Desktop square rhythm: `56px`.
- Mobile square rhythm: `16px`.
- Side-only grid framing, not full-page graph paper.
- Animate grid lines in with scale transforms.

## 5. Components

### Hero-Derived Dialogs

Dialogs opened from the hero should feel like a focused continuation of the hero, not a generic modal:

- black/translucent surface with `border-white/20`, heavy black shadow, and very soft amber radial energy;
- mini grid framing on the sides when there is enough space;
- optional low-opacity orbit SVG behind the title;
- centered logo/mark and two-tone `font-display` title (`#8c8c8c` line + white glowing line);
- rounded full email/input controls and glow-border submit CTA;
- concise operational microcopy in muted white, with amber reserved for success/active state.

### Cards

```tsx
className="bg-background border border-white/20 rounded-lg p-6"
```

Rules:

- Prefer border definition over heavy fills.
- Use `rounded-lg` for cards.
- Hover states should be subtle: faint white shadow or amber glow.
- Text alignment can shift from centered on mobile to left-aligned on desktop.

### Glowing Tags / Primary CTAs

Use pill CTAs with animated conic borders.

- Outer: animated `glow-border`, rounded-full.
- Inner: `bg-[#333]`, rounded-full, display/body font depending on size.
- Large CTA height: `44px`.
- Small tag height: `28px`.
- Hover: slight scale only for important CTAs.

### Navigation / Dynamic Island

- Fixed top-center.
- Black pill/container, `rounded-[16px]`.
- Width animates between compact and expanded states.
- Text color starts muted (`#AEAEAE`) and turns white on active/open.
- Use keyboard shortcut hints as tiny bordered chips.

### Pricing / Interactive Panels

- Card base stays black with white/20 border.
- Hover can introduce amber blurred layers behind the panel.
- Motion should feel physical and contained, not decorative confetti.

## 6. Motion Principles

Motion is a primary differentiator. Use it to reveal craft.

Current libraries:

- **GSAP:** page/section reveal, text splitting, scroll smoothing, continuous rotations.
- **Motion:** component-level hover/presence/layout animations.
- **CSS keyframes:** simple loops like marquee and conic-border spin.

### Patterns

- Text reveal: split into characters, stagger `0.05s`, duration around `0.2–0.35s`.
- Section entry: fade in cards with short stagger `0.15s`.
- Ambient loops: slow rotation (`20–60s`) and subtle scale/yoyo.
- Marquee: continuous horizontal movement, pause on hover.
- Respect reduced motion with global duration overrides.

## 7. Borders, Glow & Depth

- Use `border-white/15` and `border-white/20` as the default structure.
- Use inset amber shadows for technical/orbit elements:

```tsx
shadow-[inset_0px_0px_24px_var(--amber-low-opacity)] border-amber/20
```

- Use white shadows sparingly:

```tsx
hover:shadow-[0px_0px_12px_rgba(255,255,255,0.1)]
```

- Hero title glow:

```tsx
text-shadow-[0px_12px_88px_rgba(255,255,255,0.25)]
```

## 8. Responsive Rules

- Mobile-first components should stack vertically.
- Use `md:grid` for structured desktop layouts.
- On mobile, center text and CTAs.
- On desktop, allow left alignment in cards/sections for a more editorial composition.
- Disable custom cursor and heavy smoothing on mobile.

## 9. Tailwind Conventions

- Use Tailwind utility classes directly for most styling.
- Use CSS variables for core colors and fonts.
- Prefer arbitrary values when precision matters, e.g. `text-[62px]`, `gap-[28px]`.
- Use `bg-background`, `text-foreground`, `font-display`, and `font-sans` from theme tokens.

## 10. Quick Component Recipes

### Section Heading

```tsx
<h1 className="w-full mt-4 font-display tracking-tighter text-[40px] md:text-[44px] lg:text-[62px] text-center md:text-left">
  Section Title
</h1>
```

### Standard Card

```tsx
<div className="bg-background border border-white/20 rounded-lg p-6 hover:shadow-[0px_0px_12px_rgba(255,255,255,0.1)] duration-200">
  <h2 className="font-sans leading-5.5 tracking-tighter text-[19px] font-medium">
    Card title
  </h2>
  <p className="font-sans tracking-tight text-[14px] text-[#BFBFBF]">
    Supporting description.
  </p>
</div>
```

### Primary Pill CTA

```tsx
<button className="glow-border rounded-full p-0.5 duration-300 hover:scale-[1.05]">
  <span className="rounded-full bg-[#333] h-[44px] px-[29px] flex items-center justify-center font-sans text-[20px] tracking-tight">
    Let's build something
  </span>
</button>
```

## 11. Design Checklist

Before shipping a new page/component, verify:

- Uses the Agentic Engineering hero as the north star for composition, glow, orbit/grid detail, and CTA treatment.
- Uses black canvas and restrained border-based surfaces.
- Typography follows Halant display + Atkinson UI/body pairing.
- Accent amber is rare and meaningful.
- Interactions include one polished reveal or hover behavior.
- Mobile layout stacks cleanly and keeps text readable.
- Reduced-motion users are respected.
- The result feels crafted, technical, and personal — not generic SaaS.
