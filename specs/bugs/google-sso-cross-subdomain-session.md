## Fix the Bug

**Environment** (1 line): macOS Darwin arm64, Node.js v24.10.0, npm 11.6.1, Bun 1.3.13, Better Auth 1.6.19, TypeScript/Hono auth service, TanStack Start React frontend.

**Actual Behavior**:
In a production-like DEV environment using the production domains, Google SSO completes through the auth service domain but the frontend is not authenticated afterward. The app uses three origins:

- `https://learning.brianito.com` — frontend
- `https://auth.brianito.com` — Better Auth Hono auth service
- `https://api.brianito.com` — Go backend API

After Google redirects back to `auth.brianito.com/api/auth/callback/google`, Better Auth appears to set the session cookie for `auth.brianito.com` only. Instead of landing on `https://learning.brianito.com/dashboard`, the user is redirected back to `https://learning.brianito.com/`, which matches the app's unauthenticated/protected-route behavior. The suspected cause is that when `/dashboard` loads or SSR-renders on `learning.brianito.com`, the frontend server/client session lookup does not see the auth cookie, so `getSession`/`getServerAuthState` behaves as unauthenticated and the protected route sends the user to `/`.

There may also be OAuth state/cookie issues in split-domain flows. The current auth config already includes:

```ts
account: {
  storeStateStrategy: "database",
  skipStateCookieCheck: true,
},
```

but the session cookie still does not appear to be shared or forwarded correctly for `learning.brianito.com` session checks.

**Expected Behavior**:
After signing in with Google from `learning.brianito.com`, the user should be redirected back to `https://learning.brianito.com/dashboard` and be treated as authenticated by both:

- frontend client-side Better Auth calls; and
- frontend SSR/server session checks that call `https://auth.brianito.com/api/auth/get-session`.

The session cookie strategy should work safely across the `*.brianito.com` subdomains without requiring the auth service to be hosted on the same exact hostname as the frontend.

**Steps to Reproduce**:
1. Run the app in DEV using production-like env values:
   - frontend `VITE_AUTH_URL=https://auth.brianito.com`
   - frontend API URL pointed at `https://api.brianito.com` as appropriate
   - auth service `BETTER_AUTH_URL=https://auth.brianito.com`
   - auth service `TRUSTED_ORIGINS=https://learning.brianito.com,https://api.brianito.com,https://auth.brianito.com`
2. Open `https://learning.brianito.com` and click Google sign-in.
3. Complete the Google OAuth flow.
4. Observe that after the Google callback, the browser briefly attempts or is expected to reach the frontend dashboard callback target.
5. Observe that the final URL becomes `https://learning.brianito.com/` instead of `https://learning.brianito.com/dashboard`, as if `/dashboard` considered the user unauthenticated because `get-session` cannot see/use the auth session cookie from the frontend origin.

**Key Files**:
- `auth_service/src/auth.ts` — Better Auth server config, session config, cookie/security options, Google provider, OAuth state config.
- `auth_service/src/index.ts` — Hono service, CORS credentials, Better Auth route mounting, request/error logging.
- `auth_service/src/env.ts` — production origin/env parsing for `BETTER_AUTH_URL`, `TRUSTED_ORIGINS`, and production mode.
- `frontend-react/src/lib/auth-client.ts` — Better Auth React client base URL configuration.
- `frontend-react/src/lib/auth-session.ts` — SSR/server-side `get-session` call that forwards incoming cookies to the auth service.
- `frontend-react/src/components/sign-in-dialog.tsx` — Google SSO trigger and callback URL logic.
- `deploy/docker-compose.prod.yml` — production env values and auth/frontend/backend domain assumptions.
- `frontend-react/src/components/sign-in-dialog.test.tsx` — closest existing frontend auth-related test file.
- `auth_service/test/beta-access.test.ts` and `auth_service/test/db-schema.test.ts` — existing auth service test area.

**Already Tried**:
- Set Better Auth OAuth state to database storage and disabled the extra state cookie check:
  ```ts
  account: {
    storeStateStrategy: "database",
    skipStateCookieCheck: true,
  }
  ```
- Updated frontend Google SSO to let Better Auth perform the redirect instead of manually requiring a returned redirect URL.
- Added structured auth-service logs around Better Auth handler failures and request handling.

**Constraints** (do not touch):
- Do not merge the auth service into the frontend or backend; keep the service-oriented architecture.
- Do not replace Better Auth or implement custom authentication.
- Do not expose Postgres/Redis publicly.
- Do not remove beta access gating or admin allowlist behavior.
- Do not change public route contracts unless absolutely necessary; Better Auth routes must remain under `/api/auth/*`.
- Do not hardcode secrets or real production credentials.
- Preserve the three-domain production topology: `learning.brianito.com`, `auth.brianito.com`, `api.brianito.com`.

**Success Looks Like**:
A Google sign-in initiated from `https://learning.brianito.com` results in:

1. Google callback handled at `https://auth.brianito.com/api/auth/callback/google` without state mismatch.
2. Browser's final URL remains `https://learning.brianito.com/dashboard`; it must not bounce back to `https://learning.brianito.com/` after the OAuth callback.
3. The browser has a valid Better Auth session cookie available in a way that works for the frontend/auth split-domain setup, likely via cookie domain `.brianito.com` or the correct Better Auth cross-subdomain cookie configuration.
4. `GET https://auth.brianito.com/api/auth/get-session` returns an authenticated session when called from the frontend flow with credentials/cookies included.
5. `frontend-react/src/lib/auth-session.ts` returns `{ isAuthenticated: true, isAdmin: ... }` after Google SSO instead of `{ isAuthenticated: false, isAdmin: false }`.
6. Existing auth/beta behavior still works, including beta allowlist gating.

**Test Coverage**:
Create a test for this bug so it doesn't happen anymore.
After fixing, run the existing test suite. If all pass, generate a regression test that:
1. Reproduces the exact failure condition described above: split-subdomain Google SSO/session lookup where auth service is `auth.brianito.com` and frontend is `learning.brianito.com`.
2. Asserts the expected behavior: Better Auth config emits/allows a session cookie strategy that can be read by the auth service during `get-session` after the frontend flow, and frontend session helpers include/forward cookies correctly.
3. Is placed alongside related tests in either `auth_service/test/` for Better Auth/cookie config behavior or `frontend-react/src/components/sign-in-dialog.test.tsx` / a nearby frontend auth-session test for client/SSR cookie forwarding behavior.

If any existing tests fail during the fix, try to fix them.

Think through Better Auth's documented cross-subdomain cookie configuration before changing code. Check whether this project should use Better Auth `advanced.crossSubDomainCookies` and/or cookie attributes such as `domain: ".brianito.com"`, `sameSite: "none"`, and `secure: true` in production. Also verify whether frontend `fetch`/Better Auth client calls require `credentials: "include"`, and whether TanStack Start server-side requests can receive and forward the relevant cookies when running on `learning.brianito.com`.
