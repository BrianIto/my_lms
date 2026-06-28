**What needs to be done**:
Move course progress from placeholder backend responses and mostly static frontend display to persisted, per-authenticated-user lesson progress that updates course percentage and lesson statuses across dashboard, course detail, and lesson player.

**Risk level**: high
This adds database schema/state, changes API response contracts, touches auth/session enforcement, and wires shared frontend data flows.

**Stack & tooling**:
- Language/Framework: Go 1.25 + chi/pgx/PostgreSQL backend; TypeScript + React 19 + TanStack Start/Router/Query frontend
- Test runner: Go test for backend; Vitest/Biome plus TanStack/Vite build for frontend
- Verification command: `cd backend-go && make test && make docs && cd ../frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `backend-go/go.mod` and `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — service boundaries, Better Auth ownership, progress model, caching rules, and repository commands
- `design.md` — dashboard/course/player UI must preserve the dark, border-first, quietly premium LMS design language
- `plan/README.md` — plan index and cross-cutting rules for auth, cache separation, and frontend/backend ownership
- `plan/01-auth-and-beta.md` — session and beta-access gates; backend must enforce access, frontend gates are UX only
- `plan/03-progress-and-player.md` — target progress schema, routes, idempotent writes, and frontend progress requirements
- `plan/04-frontend-design.md` — dashboard, course detail, and lesson player visual/data-loading expectations
- `backend-go/README.md` — backend commands, migration/docs conventions, and database ownership note
- `backend-go/internal/handler/handler.go` — current public routes and progress handler placeholders
- `backend-go/internal/handler/admin.go` — existing Better Auth session forwarding pattern for admin checks; reuse or extract instead of inventing unrelated auth logic
- `backend-go/internal/service/course.go` — current `CourseProgress`/`LessonProgressUpdate` placeholders and static course cache behavior
- `backend-go/internal/repository/repository.go` and `backend-go/internal/repository/course.go` — repository interface and pgx query style to extend for progress persistence
- `backend-go/internal/db/migrations/004_course_catalog.up.sql` — course/module/lesson schema that `lesson_progress.lesson_id` should reference
- `backend-go/internal/service/course_test.go`, `backend-go/internal/handler/course_test.go`, and `backend-go/internal/repository/course_integration_test.go` — existing fake repo, handler, and repository test conventions
- `frontend-react/AGENTS.md` — frontend-specific conventions if present
- `frontend-react/package.json` — React/TanStack/Biome scripts and versions
- `frontend-react/src/lib/backend-api.ts` — current course/progress types, API functions, and snake_case/camelCase mappers
- `frontend-react/src/lib/lms-data.ts` — lesson lookup and next-lesson logic currently based on `lesson.status`
- `frontend-react/src/routes/_protected.dashboard.tsx` — course cards currently show `course.progress ?? 0`
- `frontend-react/src/routes/_protected.courses.$slug.tsx` — course detail already fetches static course data and progress separately
- `frontend-react/src/routes/_protected.courses.$slug_.lessons.$lessonId.tsx` — lesson player progress mutation and query invalidation flow
- `auth_service/src/beta-access.ts` and `auth_service/src/index.ts` — existing `/api/beta/access` and Better Auth/beta access behavior the backend can call/validate against

**Architecture context**:
Static course catalog/detail data may remain cached aggressively, but per-user progress must never be globally cached or embedded in shared course cache responses. Backend progress reads/writes must derive the user id from the Better Auth session/cookies, require active beta access, and never trust a client-supplied user id. If the auth service does not expose enough session or beta-access information to identify the current user securely, STOP and ask before changing auth-service contracts.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `backend-go/internal/db/migrations/` — add `lesson_progress` migration up/down files with constraints and indexes
- `backend-go/internal/repository/` — add progress row types and pgx repository methods for idempotent upsert/read operations
- `backend-go/internal/service/` — replace placeholder progress logic with persisted per-user calculations and validation
- `backend-go/internal/handler/` — enforce session + beta access for private progress endpoints and pass authenticated user identity into service calls
- `backend-go/docs/` — regenerate Swagger/Scalar docs after DTO/handler annotation changes
- `backend-go/internal/*_test.go` — update/add backend tests for progress persistence, percentages, auth failures, and idempotency
- `frontend-react/src/lib/backend-api.ts` — update progress response/request types and mapping only as needed for real lesson status data
- `frontend-react/src/lib/lms-data.ts` — adjust next-lesson/status helpers to consume progress-derived status without mixing static and user-specific cache assumptions
- `frontend-react/src/routes/_protected.dashboard.tsx` — fetch and display real course progress for cards without blocking static catalog rendering unnecessarily
- `frontend-react/src/routes/_protected.courses.$slug.tsx` — merge progress data into lesson rows/outline and percentage UI while keeping static and progress queries separate
- `frontend-react/src/routes/_protected.courses.$slug_.lessons.$lessonId.tsx` — update mutation response handling, query invalidation/optimistic behavior, and lesson sidebar status display
- `frontend-react/src/routeTree.gen.ts` — update only if TanStack Router generation/build requires it

---

**Confidence check** (do this before step 1):
Restate that the backend currently exposes progress routes but returns placeholder zero/echo data, and the goal is to persist lesson progress per Better Auth user and have the frontend render that real state everywhere. List assumptions about how the backend will validate the current session and beta access through `auth_service`, what the progress response shape should be, and whether dashboard progress can be fetched per course or needs a small aggregate endpoint. If any assumption about auth identity, beta-access enforcement, or API shape is shaky, ask before proceeding.

**Workflow steps**:
1. Inventory existing progress placeholders, frontend query usage, backend auth/session forwarding, and course cache boundaries.
2. Design the minimal progress API contract: include course totals/percent plus per-lesson statuses so frontend outlines can reflect user-specific state without contaminating cached static course data.
3. Add the `lesson_progress` database migration with status constraints, `completed_at`, nullable `last_position_seconds`, timestamps, foreign key cascade to `lessons`, and unique `(user_id, lesson_id)`.
4. Implement repository methods to upsert lesson progress idempotently, read progress by course/user, and compute completed/total counts from persisted rows plus course lessons.
5. Replace service placeholders with validated status handling, idempotent writes, zero-lesson-safe percentage calculation, and no global cache usage for progress.
6. Add or extract backend middleware/helper logic that validates Better Auth session cookies and active beta access, derives the authenticated user id, and applies it to progress endpoints.
7. Update handler DTOs, response codes, error mapping, and Swagger annotations for authenticated progress reads/writes.
8. Update backend tests for unauthenticated/unauthorized access, missing courses/lessons, default `completed` behavior if retained, invalid statuses, idempotent updates, and 0/partial/100% course completion.
9. Wire the frontend to consume the new progress shape separately from static course queries, merge statuses for display, and invalidate/update progress queries after mutations.
10. Ensure dashboard course cards show real progress while preserving long-lived static catalog caching and graceful progress loading/error states.
11. Run the verification command, regenerate docs if needed, and fix issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests still pass (`cd backend-go && make test && make docs && cd ../frontend-react && bun --bun run check && bun --bun run build`)
- [ ] Type checks pass
- [ ] Static course catalog/detail responses remain cacheable and do not include user-specific progress from shared cache
- [ ] Progress reads and writes require authenticated Better Auth session plus active beta access server-side
- [ ] User id is derived only from the validated session; no client-provided user id is accepted
- [ ] Progress writes are idempotent for repeated updates to the same lesson/user pair
- [ ] Course percentage is correct for zero, partial, and full completion
- [ ] Existing public/admin course catalog and course authoring behavior remains unchanged
- [ ] Frontend dashboard, course detail, and lesson player continue to render useful static content if progress is loading separately
- [ ] No secrets or real `.env` values are committed

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd backend-go && make test && make docs && cd ../frontend-react && bun --bun run check && bun --bun run build`
- Expected output: backend tests pass, Swagger docs regenerate cleanly, frontend Biome check and production build pass with no new type errors
- Observable state: marking a lesson in progress or complete persists for the authenticated beta user, refreshing the app preserves lesson statuses, course percentage updates on dashboard/course/player screens, and another user does not see that progress
