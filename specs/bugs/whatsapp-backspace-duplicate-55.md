## Fix the Bug

**Environment** (1 line): macOS Darwin 27.0.0 arm64; Node v22.20.0; Bun 1.3.13; React 19.2.7; Vite 8; Vitest 4.1.9; Biome 2.4.5

**Actual Behavior**:
When typing in the beta-access Dialog WhatsApp field and then pressing Backspace/Delete to erase characters, the formatter re-adds the Brazil country code prefix. In practice, the input can accumulate extra `55` digits instead of simply deleting the previous character, causing malformed values and making the field hard to clear.

Example observed behavior: starting from a formatted value like `+55 (92) 98437-4357`, pressing Backspace around the `+55`/prefix area causes the formatter to produce another value with `55` reinserted rather than preserving the user’s deletion intent.

**Expected Behavior**:
Pressing Backspace/Delete in the WhatsApp field should remove characters predictably and never add extra `55` prefixes. The formatter should still support valid Brazilian WhatsApp formatting (`+55 (DD) 9XXXX-XXXX`) while typing/pasting, but deletion should be stable and users must be able to clear the field completely.

**Steps to Reproduce**:
1. Run the frontend app, open the landing page beta-access Dialog, and type or paste a valid WhatsApp number such as `+55 (92) 98437-4357`.
2. Place the cursor in the field and press Backspace repeatedly, especially near the `+55` prefix or while trying to clear the input.
3. Notice that the formatter keeps reintroducing/duplicating `55` instead of only deleting characters.

**Key Files**:
- `frontend-react/src/routes/index.tsx` — contains `formatBrazilianWhatsapp`, `normalizeBrazilianWhatsappDigits`, `isValidBrazilianWhatsapp`, `updateWhatsappContact`, and the beta-access Dialog WhatsApp input wiring.
- `frontend-react/src/lib/backend-api.ts` — defines the beta request payload; preserve the existing `whatsappContact`/`whatsappConsent` API contract.
- `frontend-react/package.json` — confirms scripts and test tooling (`test`, `check`, `build`, Vitest, Testing Library, jsdom).
- `specs/whatsapp-format.md` — original formatting spec; keep valid final format behavior while fixing deletion.

**Already Tried**:
- Existing formatter strips non-digits, conditionally removes a leading `55` when `digits.startsWith("55") && digits.length > 11`, and always renders formatted non-empty values with a `+55` prefix.
- Existing input uses `maxLength={19}` and validates non-empty values against `/^\+55 \(\d{2}\) 9\d{4}-\d{4}$/`, but this does not prevent the backspace/prefix duplication problem.

**Constraints** (do not touch):
- Do not change the beta request API path, DTO names, or payload fields in `frontend-react/src/lib/backend-api.ts` unless a hard contract issue is discovered.
- Do not change auth service or Go backend behavior for this bug.
- Preserve valid final format exactly as `+55 (DD) 9XXXX-XXXX`.
- Preserve optional WhatsApp behavior: empty value should remain valid.
- Preserve accessible error messaging and the current dark premium Dialog styling.
- Do not commit secrets or modify real `.env` files.

**Success Looks Like**:
Typing and pasting still formats valid Brazilian WhatsApp numbers, but pressing Backspace/Delete never duplicates or re-adds extra `55`. Users can clear the field to an empty string. Valid examples like `+55 (92) 98437-4357` and `+55 (94) 93213-4123` still pass validation and submit; invalid non-empty values are rejected before `requestBetaAccess` is called.

**Test Coverage**:
Create a test for this bug so it doesn't happen anymore.
After fixing, run the existing test suite. If all pass, generate a regression test that:
1. Reproduces the exact failure condition described above
2. Asserts the expected behavior
3. Is placed alongside related tests in `frontend-react/src/routes/index.test.tsx` if testing the Dialog/input behavior directly, or in `frontend-react/src/lib/brazilian-whatsapp.test.ts` if you extract the formatter into a focused helper module.
If any existing tests fail during the fix, try to fix them.

Recommended regression assertions:
- Simulate entering `+55 (92) 98437-4357`, then clearing/backspacing the input, and assert the value becomes shorter/empty without duplicated `55` prefixes.
- Add pure formatter tests if the helper is extracted: pasted values with and without `55` format correctly, partial deletion around the prefix does not create `+55 (55...)`, and `""` formats to `""`.

Before coding, read `AGENTS.md`, `plan/README.md`, `plan/01-auth-and-beta.md`, `plan/04-frontend-design.md`, `design.md`, and `specs/whatsapp-format.md`. After the fix, run:

```bash
cd frontend-react
bun --bun run test
bun --bun run check
bun --bun run build
```
