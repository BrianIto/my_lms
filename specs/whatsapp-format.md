**What needs to be done**:
Format the WhatsApp field in the beta-access request Dialog as a Brazilian mobile number while the user types, and validate that any submitted WhatsApp value matches the exact format `+55 (DD) 9XXXX-XXXX` such as `+55 (92) 98437-4357` or `+55 (94) 93213-4123`.

**Risk level**: medium
This touches public landing form UX and client-side validation for data sent to the beta request endpoint, but should not change backend/auth contracts unless the existing API rejects the desired formatted value.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router + Tailwind CSS
- Test runner: Vitest; Biome for checks
- Verification command: `cd frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide frontend/design rules, beta-access ownership, and service boundaries
- `design.md` — required dark premium visual direction for any changed form feedback/UI
- `plan/README.md` — plan index and cross-cutting rules
- `plan/01-auth-and-beta.md` — beta access model and auth-service ownership boundaries
- `plan/04-frontend-design.md` — frontend/beta-access screen expectations
- `specs/hero-section.md` — current canonical landing hero and beta Dialog design intent
- `frontend-react/package.json` — confirm scripts and installed form/test dependencies
- `frontend-react/src/routes/index.tsx` — current home page, `BetaAccessDialog`, WhatsApp state, and submit flow
- `frontend-react/src/lib/backend-api.ts` — existing `requestBetaAccess` input shape and endpoint path; preserve it unless the code proves a contract mismatch
- `frontend-react/src/components/ui/input.tsx` — Input primitive class/ARIA conventions
- `frontend-react/src/utils/cn.ts` and `frontend-react/src/lib/utils.ts` — shared class merging helper if conditional form styling is needed

**Architecture context**:
Frontend owns formatting, inline validation, accessible error messaging, and the public beta-request UX. The auth service owns beta request persistence/decisions, and `requestBetaAccess` owns the browser call to that service. Do not change backend/auth routes, request fields, or persistence for this chore unless you discover the current contract cannot accept the formatted WhatsApp value; if so, STOP and ask.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/routes/index.tsx` — add WhatsApp formatter/validator wiring to the beta-access Dialog and submit flow
- `frontend-react/src/lib/` — add a small focused formatter/validator helper only if keeping it in the route would hurt readability
- `frontend-react/src/components/` — touch only if a reusable form/error display component is needed for accessibility consistency
- `frontend-react/src/styles.css` — touch only if minimal focus/error styling is needed and cannot be expressed with existing Tailwind utilities

---

**Confidence check** (do this before step 1):
Restate that the task is to format the beta Dialog WhatsApp input while typing into Brazilian mobile format and prevent invalid WhatsApp values from being submitted. List assumptions, especially whether the field remains optional, whether validation should only run when the field is non-empty, whether the stored/submitted value should be the formatted string, and whether valid numbers must match exactly `+55 (DD) 9XXXX-XXXX`. If any assumption feels shaky, ask before proceeding.

**Workflow steps**:
1. Inspect the current `BetaAccessDialog`, WhatsApp state handling, and `requestBetaAccess` payload to understand where formatting and validation should live.
2. Implement a deterministic Brazilian WhatsApp formatter that strips non-digits, handles a pasted value with or without the leading `55`, caps input to the needed digits, and displays values progressively as `+55 (DD) 9XXXX-XXXX` while typing.
3. Add validation so any non-empty WhatsApp value must match the exact final format `+55 (DD) 9XXXX-XXXX` before submission; examples that must pass include `+55 (92) 98437-4357` and `+55 (94) 93213-4123`, and anything outside that shape must fail.
4. Surface accessible validation feedback in the Dialog without disrupting email/name fields, loading state, success/error state, keyboard use, or the dark premium design.
5. Ensure the submitted `whatsappContact` value is the formatted value users see, and preserve the existing `whatsappConsent`, `preferredName`, email, and endpoint behavior.
6. Run the verification command, fix issues within scope, and grep/check for unused helpers/imports.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests/build still pass (`cd frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] Existing beta-access endpoint path and request fields remain unchanged
- [ ] Empty WhatsApp behavior follows the confirmed assumption; if optional, empty remains valid
- [ ] Valid examples `+55 (92) 98437-4357` and `+55 (94) 93213-4123` pass validation
- [ ] Invalid values outside `+55 (DD) 9XXXX-XXXX` do not submit and show a clear accessible message
- [ ] The Dialog remains keyboard accessible and keeps the current dark premium visual treatment
- [ ] No secrets or real `.env` values are added

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd frontend-react && bun --bun run check && bun --bun run build`
- Expected output: Biome check and production build pass with no new type/lint errors from touched files
- Observable state: In the beta-access Dialog, typing or pasting WhatsApp digits formats into Brazilian mobile form as the user types; `+55 (92) 98437-4357` and `+55 (94) 93213-4123` submit successfully, while anything outside that exact format is rejected before calling `requestBetaAccess`.
