**What needs to be done**:
Move the Sign In Dialog create-password step from appearing/disappearing instantly to entering and exiting with `motion/react` `AnimatePresence` while preserving the existing email-first beta-gated flow.

**Risk level**: medium
Touches auth UX state rendering and animation behavior in a shared sign-in component, but should not change auth contracts, API calls, or backend state.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start + Tailwind CSS + Better Auth React client
- Test runner: Biome check and Vite/TanStack build
- Verification command: `cd frontend-react && bunx biome check src/components/sign-in-dialog.tsx && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide frontend design/auth expectations and verification commands
- `design.md` — auth dialog visual language and motion principles to preserve
- `plan/README.md` — plan index and service boundary constraints
- `plan/01-auth-and-beta.md` — Better Auth and beta-gated sign-in expectations
- `plan/04-frontend-design.md` — frontend animation/design expectations if present
- `specs/email-first-signin.md` — current staged email-first sign-in behavior that must remain intact
- `frontend-react/package.json` — confirms `motion` package version and frontend scripts
- `frontend-react/src/components/sign-in-dialog.tsx` — the only UI component that should need the animation change
- `frontend-react/src/lib/backend-api.ts` — confirms preflight contract; read only to avoid accidentally changing auth flow
- Existing `motion/react` examples such as `frontend-react/src/components/storybook/DynamicIsland.tsx` and `frontend-react/src/components/storybook/DynamicIsland.ListItem.tsx` — local `AnimatePresence` usage patterns

**Architecture context**:
Auth remains owned by `auth_service`; this chore is frontend presentation only. Do not change beta preflight, Better Auth sign-in/sign-up calls, credential-state semantics, or route protection. The Sign In Dialog must continue to follow the hero-derived dark dialog system: black canvas, border-first surfaces, restrained amber, and contained motion that respects reduced motion where practical.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/components/sign-in-dialog.tsx` — add `AnimatePresence`/`motion` around the password/create-password field and related helper text while preserving auth behavior

---

**Confidence check** (do this before step 1):
Restate that the task is to animate the staged password/create-password area in the existing Sign In Dialog, especially the create-password step, using `AnimatePresence` from `motion/react`. Confirm you will not change the email-first preflight endpoint, Better Auth calls, button behavior, copy semantics, or backend files. List assumptions about the intended animation direction, duration, and whether reduced-motion should use a minimal opacity-only or near-instant transition; ask before coding if those assumptions are unclear.

**Workflow steps**:
1. Map the current Sign In Dialog state transitions: `email` → `password` and `email` → `create-password`, plus reset-to-email when the email changes.
2. Import `AnimatePresence` and `motion` from `motion/react` and wrap the conditional password/create-password block with a small, accessible enter/exit animation.
3. Ensure the animation feels native to the LMS design system: subtle vertical reveal, opacity fade, no layout jank, no loud bounce, and stable focus/required-field behavior.
4. Preserve the create-password helper copy and the existing submit button state labels without changing auth or beta logic.
5. Run the verification command and fix any type, format, or build issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing targeted checks still pass (`cd frontend-react && bunx biome check src/components/sign-in-dialog.tsx && bun --bun run build`)
- [ ] Type checks/build pass
- [ ] Email-first flow still initially shows only email plus Google sign-in
- [ ] Inactive/non-beta emails still do not reveal password or create-password UI
- [ ] Existing-password active beta users still see password sign-in
- [ ] Active beta users without an email/password credential still see create-password UI and can submit through Better Auth `signUp.email`
- [ ] Google sign-in remains available and visually consistent
- [ ] No auth-service, backend, API contract, schema, environment, lockfile, or package changes are introduced
- [ ] Motion remains subtle, contained, and consistent with `design.md`

**Done looks like**:
- Files changed: only `frontend-react/src/components/sign-in-dialog.tsx`
- Command to verify: `cd frontend-react && bunx biome check src/components/sign-in-dialog.tsx && bun --bun run build`
- Expected output: touched-file Biome check passes and production build succeeds with no new errors from this change
- Observable state: after entering an active beta email with no credential, the create-password field/helper appears with a polished `AnimatePresence` animation instead of popping in instantly; changing the email cleanly exits the password/create-password area and returns to the email-only step.
