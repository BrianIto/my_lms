## Fix the Bug

**Environment** (1 line): macOS 27.0; Node v22.20.0; Bun 1.3.13; React 19.2.0; TanStack Start/Router latest; Better Auth 1.6.19; Vite 8.0.16; Vitest 4.1.x; Biome 2.4.5

**Actual Behavior**:
After an approved beta user enters an email that returns `credential_state: "needs_password_setup"`, the Sign In Dialog shows the create-password step and `authClient.signUp.email(...)` successfully creates the password/account, but the UI stays in the loading state forever. The submit button remains disabled with the spinner and message `Creating your password…`. The user is not redirected to `/dashboard` even though the password/account was created.

No stack trace is currently known from the browser or terminal. The visible failure is an infinite loading state after successful password creation.

**Expected Behavior**:
After a successful create-password submission, the user should be signed in and redirected to `/dashboard`. The loading state should not remain indefinitely. If Better Auth returns success without performing navigation, the frontend should explicitly navigate/redirect after confirming there is no `result.error`. If session creation fails, the dialog should show an actionable error and re-enable the form instead of spinning forever.

**Steps to Reproduce**:
1. Start the auth service and frontend with a beta allowlisted email whose email/password credential does not exist yet, then open the frontend Sign In Dialog.
2. Enter that active beta email, continue to the create-password step, enter a valid password, and submit **Create password and enter**.
3. Observe that the password/account is created, but the dialog remains in a loading state and the browser does not navigate to `/dashboard`.

**Key Files**:
- `frontend-react/src/components/sign-in-dialog.tsx` — contains the email-first staged flow, create-password branch, `authClient.signUp.email(...)`, callback URL, loading status, and missing/failed redirect behavior.
- `frontend-react/src/lib/auth-client.ts` — configures the Better Auth React client `baseURL`; verify callback/navigation expectations against this client.
- `frontend-react/src/lib/backend-api.ts` — contains `preflightEmailFirstSignin(...)` and the credential-state contract used to reach create-password mode; read to preserve the preflight behavior.
- `frontend-react/src/lib/auth-session.ts` — server-side route guard checks Better Auth session cookies before allowing `/dashboard`.
- `frontend-react/src/routes/dashboard.tsx` — protected destination route; redirects unauthenticated users back to `/`.
- `frontend-react/src/routes/index.tsx` — home route redirects authenticated users to `/dashboard`; useful for validating post-signup auth state.
- `auth_service/src/auth.ts` — Better Auth email/password config and session creation beta gate; inspect if signup creates the user but session creation is being rejected or not returned.
- `auth_service/src/beta-access.ts` — source of the email-first preflight and beta allowlist status; preserve active/non-active gating.

**Already Tried**:
- The create-password flow already calls `authClient.signUp.email({ email, password, name, callbackURL: `${window.location.origin}/dashboard` })` from `frontend-react/src/components/sign-in-dialog.tsx`.
- The password/account creation succeeds, which suggests the Better Auth signup call reaches the auth service and persists credentials.
- Google sign-in and existing-password sign-in use dashboard callback URLs and should remain unchanged unless inspection proves the redirect pattern must be centralized.
- Recent UI work added `AnimatePresence` around the password/create-password block; do not assume animation is the root cause unless verified.

**Constraints** (do not touch):
- Do not change the email-first beta preflight endpoint or its response contract: `credential_state: "has_password" | "needs_password_setup"`.
- Do not reveal password/create-password UI for inactive or non-beta emails.
- Do not reimplement authentication in the Go backend; Better Auth remains owned by `auth_service`.
- Do not change database schema, auth migrations, environment variable names, or package/lock files unless inspection proves it is required and you stop to explain why.
- Do not weaken the beta login/session gate in `auth_service/src/auth.ts`.
- Preserve Google sign-in, existing-password sign-in, create-password helper copy, and the current dark hero-derived Sign In Dialog design.
- Do not leave the form disabled indefinitely after any success/error path.

**Success Looks Like**:
Submitting **Create password and enter** for an active beta email without an existing password creates the password/account, establishes a valid Better Auth session, and navigates the browser to `/dashboard`. The button spinner/loading status clears on handled failures. Existing-password sign-in and Google sign-in still work. Run and pass:

```bash
cd frontend-react
bunx biome check src/components/sign-in-dialog.tsx
bun --bun run build
bun --bun run test
```

If auth-service code is touched, also run:

```bash
cd auth_service
npm run test
npm run typecheck
npm run build
```

**Test Coverage**:
Create a test for this bug to it doesn't happen anymore.
After fixing, run the existing test suite. If all pass, generate a regression test that:
1. Reproduces the exact failure condition described above
2. Asserts the expected behavior
3. Is placed alongside related tests in `frontend-react/src/components/` or the closest existing frontend test location after inspection
If any existing tests fail during the fix, try to fix them.

Recommended regression coverage:
- Mock `preflightEmailFirstSignin(...)` to return `{ email, credential_state: "needs_password_setup" }`.
- Mock `authClient.signUp.email(...)` to resolve successfully with no `error`.
- Render `SignInDialog`, submit email, submit password, and assert that the successful create-password path triggers navigation to `/dashboard` or `window.location.assign/replace` with `/dashboard` according to the implementation chosen.
- Add a companion assertion that if `authClient.signUp.email(...)` returns an error, the loading state clears and the error is shown.

Before coding, read `AGENTS.md`, `design.md`, `plan/README.md`, `plan/01-auth-and-beta.md`, `specs/email-first-signin.md`, and inspect the key files above. Confirm Better Auth React client behavior for `signUp.email` callback URLs before choosing whether to use TanStack Router navigation, `window.location.assign`, or a Better Auth option/callback. Keep the fix minimal and scoped to the create-password redirect/loading bug.
