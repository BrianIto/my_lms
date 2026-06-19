**What needs to be done**:
Move the public frontend home screen from the current generic LMS overview to a centered, motion-polished Agentic Engineering Course hero that explains the course is not yet available and offers a beta-access CTA, and add a backend API endpoint that accepts beta-access requests.

**Risk level**: high
This touches a public frontend route plus a new backend API contract; if persistence or auth/beta-access ownership conflicts with existing service boundaries, stop and ask before proceeding.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router/Tailwind; Go 1.25 + chi for backend API
- Test runner: Vitest for frontend; Go test for backend
- Verification command: `cd frontend-react && bun --bun run check && bun --bun run build && cd ../backend-go && make test && make docs`
- If unsure about versions, check `frontend-react/package.json`, `backend-go/go.mod`, and `backend-go/Makefile`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide architecture, beta-access, backend/frontend ownership, and required planning docs
- `design.md` — visual direction: black canvas, amber accent, Halant display, Atkinson UI/body, border-first cards, contained motion
- `plan/README.md` — plan index and cross-cutting service rules
- `plan/00-foundation.md` — local service origins and API route boundaries
- `plan/01-auth-and-beta.md` — beta access model, allowlist rules, and auth/backend responsibilities
- `plan/04-frontend-design.md` — required landing/beta-access screen and design requirements
- `frontend-react/src/routes/index.tsx` — current first screen to replace/refactor
- `frontend-react/src/routes/__root.tsx` — root document/head conventions
- `frontend-react/src/components/lms-shell.tsx` — existing shell/nav/background conventions; update or bypass only if the landing design needs it
- `frontend-react/src/styles.css` — existing tokens, fonts, `rise-in`, and reduced-motion behavior
- `frontend-react/src/components/ui/button.tsx` and related UI components — existing CTA/component variants
- `frontend-react/src/lib/auth-client.ts` and `frontend-react/src/lib/lms-data.ts` — current client/data conventions and beta-related placeholders
- `backend-go/README.md` — backend route/versioning and docs-generation conventions
- `backend-go/internal/handler/handler.go` — current route registration, DTO style, error responses, and Swagger annotations
- `backend-go/internal/service/service.go` — service-layer pattern
- `backend-go/internal/repository/repository.go` — current repository/persistence pattern
- `backend-go/pkg/response/response.go` — JSON/error envelope conventions

**Architecture context**:
Frontend owns the public landing/beta-request UX, but Better Auth/auth_service owns identity and beta access source of truth; the Go backend owns LMS business APIs under `/api/v1/*`. If implementing beta-request persistence requires new schema/table ownership that conflicts with auth_service’s beta allowlist responsibility, STOP and ask whether the request should be stored in backend, auth_service, or sent to an external system.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/routes/index.tsx` — replace the first screen with the Agentic Engineering Course hero and beta CTA flow
- `frontend-react/src/components/` — add/reuse focused landing components only if it keeps `index.tsx` clean
- `frontend-react/src/styles.css` — add small reusable keyframes/classes for hero motion/glow only if Tailwind utilities are insufficient
- `frontend-react/src/lib/` — add a small backend API helper/type for beta-access requests if needed
- `backend-go/internal/handler/handler.go` — register and implement the beta-request route/DTO/Swagger annotations following current conventions
- `backend-go/internal/service/` — add service-layer logic for beta-access request validation/normalization if needed
- `backend-go/internal/repository/` — add repository-layer persistence only if an existing migration/schema pattern supports it or after confirming ownership
- `backend-go/internal/db/migrations/` — add migration only if backend persistence is confirmed appropriate
- `backend-go/docs/` — regenerate Swagger/Scalar docs after route/DTO changes
- `backend-go/README.md` and `frontend-react/README.md` — update only if new env vars, commands, or API contracts are introduced

---

**Confidence check** (do this before step 1):
Restate the chore in your own words in 2–3 sentences. List assumptions about where beta-request data should be stored, what request fields are required, and whether the request endpoint is public. If any assumption feels shaky — especially persistence/schema ownership or whether unauthenticated users can request beta access — ask before proceeding.

**Workflow steps**:
1. Map the current frontend landing route, shell/background, UI components, and any existing backend API-calling conventions.
2. Define the beta-access request contract under `/api/v1/*` with normalized email validation, JSON request/response DTOs, consistent errors, and Swagger annotations.
3. Implement the backend endpoint through the existing handler/service/repository layers, adding persistence only if it matches confirmed architecture; otherwise implement the agreed minimal behavior and document the limitation.
4. Replace the first screen with a simple centered Agentic Engineering Course hero: clear unavailable/beta copy, premium dark design from `design.md`, restrained amber CTA, and contained motion that respects reduced-motion.
5. Wire the CTA to the beta-request endpoint with loading/success/error states; do not fake success if the request fails.
6. Regenerate any generated docs/routes required by the project, then run the verification command and fix issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests still pass (`cd frontend-react && bun --bun run check && bun --bun run build && cd ../backend-go && make test && make docs`)
- [ ] Type checks pass
- [ ] Backend business routes remain under `/api/v1/*`; operational routes remain `/health`, `/scalar`, `/swagger/*`
- [ ] Existing course, progress, user, and `/api/v1/me/access` routes keep their public signatures and response shapes
- [ ] The landing page still uses the project typography/tokens: `#0a0a0a`, amber `#ffba5a`, `font-display`, `font-sans`, border-first surfaces
- [ ] Motion is tasteful, contained, and respects `prefers-reduced-motion`
- [ ] No secrets or real `.env` values are added
- [ ] No new sync I/O or blocking external calls in the backend request path

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd frontend-react && bun --bun run check && bun --bun run build && cd ../backend-go && make test && make docs`
- Expected output: frontend check/build passes, backend tests pass, Swagger docs regenerate without errors, and no new type/lint warnings from touched code
- Observable state: visiting `/` shows a centered Agentic Engineering Course hero stating the course is not yet available, with a beta-access CTA; submitting the CTA calls a backend `/api/v1/...` beta-request endpoint and shows clear success/error feedback
