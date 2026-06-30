## Fix the Bug

**Environment** (1 line): macOS Darwin arm64, Node.js v22.20.0, npm 10.9.3, Bun 1.3.13, Vite 8.0.0, React 19.2.0, TanStack Start latest, TypeScript frontend.

**Actual Behavior**:
In the production frontend deployed at `https://learning.brianito.com`, API requests are being made to `https://localhost:8080` / localhost backend URLs instead of the production API domain.

Observed/suspected request examples:

```txt
https://localhost:8080/api/v1/courses
https://localhost:8080/api/v1/courses/{slug}
https://localhost:8080/api/v1/courses/{slug}/progress
https://localhost:8080/api/v1/lessons/{lessonID}/progress
```

This causes the production app to fail loading protected LMS/course data because each user's browser tries to call its own local machine, not the VPS backend. Depending on the browser/network state, this may show as failed requests such as `ERR_CONNECTION_REFUSED`, `ERR_SSL_PROTOCOL_ERROR`, CORS/network errors, or the dashboard fallback message:

```txt
Could not load the course catalog. Confirm the Go backend is running on VITE_BACKEND_URL.
```

Important mismatch found during inspection:

- `deploy/README.md`, `deploy/TODO.md`, and `plan/06-production-deploy.md` tell production/Vercel to set `VITE_API_URL=https://api.brianito.com`.
- `frontend-react/.env.example` defines `VITE_API_URL="http://localhost:8080"`.
- `frontend-react/src/lib/backend-api.ts` currently reads `import.meta.env.VITE_BACKEND_URL` and falls back to `http://localhost:8080`.

So production can be correctly configured with `VITE_API_URL=https://api.brianito.com` while the frontend bundle ignores it and uses the localhost fallback.

**Expected Behavior**:
The production frontend should call the public Go backend API at:

```txt
https://api.brianito.com
```

All frontend LMS API requests should resolve to URLs like:

```txt
https://api.brianito.com/api/v1/courses
https://api.brianito.com/api/v1/courses/{slug}
https://api.brianito.com/api/v1/courses/{slug}/progress
https://api.brianito.com/api/v1/lessons/{lessonID}/progress
```

The app should use one consistent documented frontend env var for the backend API URL. Prefer the already documented `VITE_API_URL`, or support both `VITE_API_URL` and legacy `VITE_BACKEND_URL` with a clear precedence and updated docs.

**Steps to Reproduce**:
1. Configure/build the frontend production environment with the documented variable only:
   ```env
   VITE_AUTH_URL=https://auth.brianito.com
   VITE_API_URL=https://api.brianito.com
   ```
2. Deploy/open `https://learning.brianito.com` and sign in as an active beta user.
3. Open DevTools → Network.
4. Navigate to `/dashboard`, a course detail page, or a lesson page.
5. Observe that course/progress requests target localhost, e.g. `https://localhost:8080` or `http://localhost:8080`, instead of `https://api.brianito.com`.

**Key Files**:
- `frontend-react/src/lib/backend-api.ts` — constructs the backend API base URL and currently reads `VITE_BACKEND_URL` with a localhost fallback.
- `frontend-react/.env.example` — documents local frontend env vars and currently uses `VITE_API_URL`.
- `deploy/README.md` — production deploy instructions tell Vercel to set `VITE_API_URL=https://api.brianito.com`.
- `deploy/TODO.md` — production checklist also references `VITE_API_URL`.
- `plan/06-production-deploy.md` — architecture/deploy plan documents `VITE_API_URL=https://api.brianito.com`.
- `frontend-react/src/routes/_protected.dashboard.tsx` — user-visible error copy references `VITE_BACKEND_URL`, which may now be misleading.
- `frontend-react/package.json` — contains frontend build/test/check commands.

**Already Tried**:
- Verified production deploy docs already instruct setting `VITE_API_URL=https://api.brianito.com`.
- Searched the codebase and found the frontend implementation uses `VITE_BACKEND_URL`, not `VITE_API_URL`, causing a fallback to localhost when only the documented variable exists.
- Confirmed backend production routing exists through Traefik at `https://api.brianito.com` in `deploy/docker-compose.prod.yml`.

**Constraints** (do not touch):
- Do not hardcode `https://api.brianito.com` directly into frontend runtime code as the only option; keep environment-based configuration.
- Do not change backend route contracts under `/api/v1/*`.
- Do not merge services or change the three-domain production topology: `learning.brianito.com`, `auth.brianito.com`, `api.brianito.com`.
- Do not replace Better Auth or alter auth/beta access behavior.
- Do not expose Postgres/Redis publicly.
- Do not rename public env vars without updating every relevant doc/example and preserving a reasonable compatibility path if possible.

**Success Looks Like**:
- A production build with only `VITE_API_URL=https://api.brianito.com` configured calls `https://api.brianito.com/api/v1/*`, never `localhost:8080`.
- Dashboard/course/lesson pages load course catalog, details, and progress from the production backend.
- Any user-facing error/help text references the correct env var name.
- `.env.example`, deploy docs, and implementation agree on the backend API env var name.
- Existing frontend tests still pass.
- A regression test fails before the fix and passes after the fix by proving `VITE_API_URL` is honored.

**Test Coverage**:
Create a test for this bug to it doesn't happen anymore.
After fixing, run the existing test suite. If all pass, generate a regression test that:
1. Reproduces the exact failure condition described above: `VITE_API_URL` is set to `https://api.brianito.com`, `VITE_BACKEND_URL` is absent/undefined, and backend API helpers must not fall back to localhost.
2. Asserts the expected behavior: course/progress/admin API helpers call `https://api.brianito.com/api/v1/...` and do not call `localhost:8080`.
3. Is placed alongside related frontend tests, preferably in a new `frontend-react/src/lib/backend-api.test.ts` or the nearest existing frontend API/client test file.

If any existing tests fail during the fix, try to fix them.
