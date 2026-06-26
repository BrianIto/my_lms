**What needs to be done**:
Move beta-request submission from “save request then fail the whole request when the admin notification email fails” to “persist the beta request and an approvable beta-access record first, then attempt email notification, returning a durable pending state even if email delivery fails.”

**Risk level**: medium

**Stack & tooling**:
- Language/Framework: TypeScript + Hono + Better Auth + PostgreSQL (`pg.Pool`)
- Test runner: Node test via `tsx --test`
- Verification command: `cd auth_service && npm run typecheck && npm run test && npm run build`
- If unsure about versions, check `auth_service/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — repository rules, service boundaries, and beta-access constraints.
- `plan/README.md` — plan index and cross-cutting implementation rules.
- `plan/01-auth-and-beta.md` — auth service ownership and beta allowlist model.
- `auth_service/src/beta-access.ts` — current beta request persistence, Resend notification, approval/decline token flow, and beta allowlist writes.
- `auth_service/src/index.ts` — route registration for `/api/beta/requests` and approval links.
- `auth_service/src/db.ts` — shared PostgreSQL pool and current schema/search-path behavior.
- `auth_service/README.md` — documented beta request and allowlist behavior.
- `auth_service/package.json` — scripts and test runner.

**Architecture context**:
The auth service owns beta access and stores app-owned beta tables in the configured database schema. Public beta requests must normalize email to lowercase, default to no private access until approved, and keep approval/decline links idempotent and safe. If the implementation conflicts with existing schema or route conventions, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `auth_service/src/beta-access.ts` — implement durable request/allowlist persistence before email sending and fallback behavior when Resend fails.
- `auth_service/test/` — add or update focused regression tests for beta request persistence and email-failure behavior.
- `auth_service/README.md` — update documented beta-request semantics if response behavior changes.
- `auth_service/package.json` — only if a missing test script or test dependency is genuinely required.

---

**Confidence check** (do this before step 1):
Restate the chore in your own words in 2–3 sentences. List any assumption you are making, especially whether “add him to the database first” means `beta_access_requests`, `beta_access`, or both. If that assumption feels shaky, ask before proceeding.

**Workflow steps**:
1. Trace the current `/api/beta/requests` path and identify exactly what persists before and after `sendBetaRequestNotification()`.
2. Update the flow so the user’s normalized email is stored durably before the email attempt, and an administrator can still approve the user even if Resend throws or returns an error.
3. Preserve approval/decline token behavior, idempotent resubmission behavior, and beta access rules where private access is only granted after approval.
4. Add regression coverage for the email-failure path proving the request remains in the database and can later be approved.
5. Update docs if the endpoint now returns a different status/message when the email notification fails, then run the verification command.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests still pass (`cd auth_service && npm run typecheck && npm run test && npm run build`)
- [ ] Type checks pass
- [ ] `/api/beta/requests` still validates and normalizes email addresses.
- [ ] Approval links still upsert `beta_access` to `active`; decline links still do not grant access.
- [ ] Google/email Better Auth sign-in and `/api/auth/*` routes are unchanged.
- [ ] No secrets or real `.env` values are committed.

**Done looks like**:
- Files changed: only files within scope above.
- Command to verify: `cd auth_service && npm run typecheck && npm run test && npm run build`
- Expected output: all tests pass, 0 type errors, successful production build.
- Observable state: when Resend email sending fails, the beta request remains persisted with approval metadata so an administrator can still approve the user later.
