# 04 — Frontend Design

## Goal

Implement LMS screens with the design language from `../design.md`: dark, precise, technical, motion-rich, and quietly premium.

Always read `../design.md` before UI work.

## Required screens

- Landing/beta access page.
- Sign-in/sign-up page with Google option.
- Beta pending/access denied page.
- Dashboard with course cards and progress.
- Course detail with module and lesson outline.
- Lesson player with YouTube iframe and progress controls.

## Visual rules

- Page background: `#0a0a0a`.
- The new Agentic Engineering hero is the standard for the whole frontend: centered cinematic layout, side grid framing, slow orbit SVG, two-tone serif headline, soft white title glow, restrained amber energy, marquee/signal tags, and pill CTAs.
- Dialogs launched from that hero should extend the same system: dark bordered surface, subtle amber radial glow, optional orbit/grid detail, centered display title, rounded controls, and glow-border primary action.
- Text: white/near-white with muted gray secondary text.
- Accent: restrained amber `#ffba5a` only for active states, glow, focus, progress, and highlights.
- Surfaces: mostly black with `border-white/15` or `border-white/20`.
- Avoid heavy filled panels and generic SaaS gradients.
- Use rounded utility surfaces and pill CTAs.
- Typography:
  - display: Halant / `font-display`;
  - body/UI: Atkinson Hyperlegible Next / `font-sans`.

## Interaction rules

- Include one polished reveal or hover behavior per major screen.
- Keep motion contained and purposeful.
- Respect reduced motion.
- On mobile, stack layouts and keep text readable.
- On desktop, use editorial composition and left-aligned cards where appropriate.

## Component guidance

Dashboard course card:

- black card with white/20 border;
- course title, short description, module/lesson count;
- amber progress indicator, but not loud;
- hover with subtle white shadow or amber glow.

Course detail:

- large serif title;
- module cards with lesson rows;
- completed lessons should feel precise and calm, not gamified/noisy.

Lesson player:

- iframe in a strong bordered frame;
- side or below-player lesson outline;
- progress control as a premium pill/button;
- avoid clutter around the video.

Auth pages:

- keep form surfaces minimal and premium;
- use the hero-derived modal/auth treatment where appropriate: black canvas, border-first shell, side grid or orbit detail, two-tone display heading, rounded full controls, and restrained amber feedback;
- Google button should match the design system instead of default OAuth styling when possible;
- clearly communicate beta status.

## Data-fetching UI

- Static course queries may use long loading skeletons with card outlines.
- Progress loading should be subtle and not block the entire course view if static course content is available.
- Error states should be precise and calm.

## Deliverable

The LMS feels like a premium technical course platform aligned with `../design.md`, not a generic dashboard template.

## Done checks

- All new UI follows `../design.md` tokens and style rules.
- Mobile and desktop layouts are reviewed.
- Reduced-motion behavior is respected.
- Auth, dashboard, course, and player screens have clear loading/error states.
