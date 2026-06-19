**What needs to be done**:
Move the beta-list flow from a simple email-only request acknowledgement to a persisted approval workflow: collect email plus optional preferred name/WhatsApp consent in the frontend, save the request server-side, notify `brian.oliveira100@gmail.com` via Resend with approve/decline links, and make approved emails become related to Better Auth beta sign-in/access.

**Risk level**: high
This touches public form UX, email delivery, database persistence, approval links/tokens, and Better Auth beta-access state.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/TanStack Router/Tailwind; TypeScript + Hono + Better Auth for `auth_service`; Go 1.25 + chi for backend API if the existing `/api/v1/beta-access-requests` proxy/route remains involved
- Test runner: Vitest/Biome for frontend checks; TypeScript compiler for auth service; Go test for backend if Go code changes
- Verification command: `cd auth_service && npm run typecheck && npm run build && cd ../frontend-react && bun --bun run check && bun --bun run build && cd ../backend-go && make test && make docs`
- If unsure about versions, check `auth_service/package.json`, `frontend-react/package.json`, `backend-go/go.mod`, and `backend-go/Makefile`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repo-wide service ownership, Better Auth requirements, beta-access rules, and implementation plan requirements
- `design.md` — frontend visual system for the beta dialog/form and success state
- `plan/README.md` — plan index and cross-cutting service rules
- `plan/01-auth-and-beta.md` — source-of-truth guidance for beta access, allowlisting, and Better Auth boundaries
- `plan/04-frontend-design.md` — landing/beta-access UI requirements and motion constraints
- `specs/beta-access-landing.md` — existing beta landing/request prompt and current endpoint expectations
- `frontend-react/src/routes/index.tsx` — current Join/Request beta dialog and success/error state
- `frontend-react/src/lib/backend-api.ts` — current request payload/response helper for beta access requests
- `frontend-react/src/components/ui/input.tsx`, `frontend-react/src/components/ui/dialog.tsx`, and nearby UI components — existing shadcn-style form/dialog conventions
- `auth_service/src/index.ts` — current Hono route registration for Better Auth, beta access, and CORS
- `auth_service/src/beta-access.ts` — existing `beta_access` table creation and allowlist/status helpers
- `auth_service/src/auth.ts` — Better Auth configuration, plugins, session persistence, and database ownership
- `auth_service/src/env.ts` and `auth_service/.env.example` — required env parsing and documentation pattern for new Resend/admin URL variables
- `auth_service/README.md` — auth service setup, migrations, beta access docs, and command conventions
- `backend-go/internal/handler/handler.go`, `backend-go/internal/service/service.go`, and `backend-go/internal/repository/repository.go` — only if retaining/updating the existing Go `/api/v1/beta-access-requests` API route
- Resend skill/docs or package docs — Resend SDK errors must be checked explicitly, API keys stay server-side, and sends should use idempotency keys

**Architecture context**:
Auth service owns Better Auth identity/session tables and the app-owned `beta_access` allowlist, so the approval decision that grants/revokes beta access should live there unless the codebase clearly establishes otherwise. The frontend owns the public beta request UX and must not call Resend directly. If the Go backend remains the public frontend API, it should either proxy to `auth_service` or use a clearly documented contract without duplicating beta-access source of truth.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/routes/index.tsx` — update beta dialog fields, consent copy, submit payload, and success message
- `frontend-react/src/lib/backend-api.ts` — update beta request DTOs/client helper for email, preferred name, WhatsApp/contact, and consent fields
- `frontend-react/src/components/` — add focused form UI components only if keeping the route readable
- `auth_service/src/beta-access.ts` — add beta request persistence, approval/decline token handling, and allowlist linkage to `beta_access`
- `auth_service/src/index.ts` — register public request and approve/decline routes with appropriate CORS/HTTP methods
- `auth_service/src/env.ts` and `auth_service/.env.example` — add `RESEND_API_KEY`, sender/from address, admin recipient, and public approval base URL variables without committing secrets
- `auth_service/package.json` and `auth_service/package-lock.json` — add the Resend SDK if using it server-side
- `auth_service/README.md` — document the beta request workflow, new env vars, and manual verification curls
- `backend-go/internal/handler/handler.go`, `backend-go/internal/service/`, `backend-go/internal/repository/`, and `backend-go/docs/` — update only if the existing Go endpoint is kept as the frontend-facing API/proxy
- `frontend-react/README.md` and `backend-go/README.md` — update only if public env vars, routes, or verification commands change

---

**Confidence check** (do this before step 1):
Restate the chore in your own words in 2–3 sentences. List assumptions about whether beta requests should be stored in `auth_service`, whether the Go backend endpoint should remain as a proxy, what URL the approve/decline links should target, what `from` address Resend should use, and how WhatsApp consent should be represented. If any assumption is shaky, especially approval-link security or service ownership, ask before proceeding.

**Workflow steps**:
1. Map the current beta request path from landing form to API handler and identify whether `auth_service` or Go is currently authoritative for request persistence.
2. Design the beta request data model and API contract: normalized email, optional preferred name, optional WhatsApp/contact value, explicit WhatsApp notification consent, status (`pending`, `approved`, `declined`), timestamps, and single-use approve/decline tokens.
3. Implement server-side persistence and Resend notification from a trusted backend only, using `RESEND_API_KEY` from env, explicit Resend error checks, and an idempotency key based on the saved request id.
4. Implement approve/decline links so approval updates the request status and upserts the normalized email into `beta_access` with an appropriate Better Auth-related status, while decline records the decision without granting access.
5. Update the frontend beta form to collect preferred name and optional WhatsApp/contact consent, submit the expanded payload, and show: “Request sent — we’ll notify you by email or WhatsApp.”
6. Update docs/env examples and regenerate Swagger docs if the Go backend route changes, then run the verification command and fix issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests still pass (`cd auth_service && npm run typecheck && npm run build && cd ../frontend-react && bun --bun run check && bun --bun run build && cd ../backend-go && make test && make docs`)
- [ ] Type checks pass
- [ ] Better Auth remains configured only in `auth_service`; do not reimplement authentication in Go or the frontend
- [ ] `RESEND_API_KEY` and any sender/admin config are environment variables only; no secrets are committed
- [ ] Resend is called only from server-side code, never from the browser
- [ ] Approval links are unguessable, single-use or safely idempotent, and do not grant access without a valid token
- [ ] Email addresses are normalized to lowercase before persistence or allowlisting
- [ ] Existing Better Auth routes under `/api/auth/*` and beta access route behavior remain compatible unless explicitly updated in docs
- [ ] The landing page remains aligned with `design.md`: black canvas, restrained amber, Halant/Atkinson typography, border-first dialog, and reduced-motion-safe behavior
- [ ] No new blocking external calls are added to private LMS request paths

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd auth_service && npm run typecheck && npm run build && cd ../frontend-react && bun --bun run check && bun --bun run build && cd ../backend-go && make test && make docs`
- Expected output: auth service typecheck/build passes, frontend check/build passes, backend tests/docs pass if touched, and no new warnings from touched code
- Observable state: submitting the Join Beta List form saves a pending request, sends one Resend email to `brian.oliveira100@gmail.com` with approve/decline links, displays the request-sent message to the user, and approving the link records the decision and connects the normalized email to the Better Auth beta access flow
