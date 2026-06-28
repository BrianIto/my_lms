# Backend Tests Plan

## Goal

Add a focused backend test suite for the LMS course catalog, admin authoring, cache behavior, auth gates, and progress placeholders so `cd backend-go && make test` catches regressions before OpenAPI/docs/frontend wiring work continues.

Follow repository guidance: automated backend tests should avoid requiring Docker/Postgres. Prefer pure unit tests, `httptest`, fake repositories/caches/auth services, and SQLite only when a lightweight database is genuinely needed.

## Scope

Primary code under test:

- `backend-go/internal/service/course.go`
- `backend-go/internal/service/validation.go`
- `backend-go/internal/handler/handler.go`
- `backend-go/internal/handler/admin.go`
- `backend-go/internal/repository/course.go` where practical
- cache invalidation behavior for course list/detail keys

Out of scope for this first pass:

- Browser/frontend tests.
- Live Better Auth integration tests.

Required for this pass:

- Real Postgres repository/migration integration tests, run through `make test-integration` and isolated from default `make test`.

## Test harness strategy

### 1. Service tests with fakes

Create service tests that use fake implementations of:

- `repository.Querier`
- cache interface used by `service.Service`

This is the highest-value layer because it can verify validation, persistence calls, cache invalidation, draft filtering intent, and error mapping without a database.

Recommended files:

- `backend-go/internal/service/validation_test.go`
- `backend-go/internal/service/course_test.go`

### 2. Handler tests with `httptest`

Use `httptest.NewServer` or `httptest.ResponseRecorder` for API behavior. For admin middleware, use a fake auth service HTTP server that returns Better Auth-like session JSON.

Recommended files:

- `backend-go/internal/handler/admin_test.go`
- `backend-go/internal/handler/course_test.go`

### 3. Repository integration tests with real Postgres

Current repository SQL uses Postgres-specific syntax (`uuid`, `::uuid`, `gen_random_uuid()`), so repository SQL must be validated against real Postgres.

Keep these tests separate from the fast default suite:

- `make test` runs unit/handler/service tests without Docker/Postgres/Redis.
- `make test-integration` starts or connects to a dedicated Postgres test database and runs `go test -tags=integration ./internal/repository/...`.

Do not make the default automated suite depend on a running Postgres container, but do require the integration suite to exist and pass in environments that provide Docker/Postgres.

## Phase 1 — validation unit tests

Add table-driven tests for `validation.go`.

### Slug validation

Cover:

- accepts `building-with-ai`
- rejects empty slug
- rejects uppercase letters
- rejects spaces
- rejects leading/trailing/double hyphens
- rejects overly long values

### Title/status validation

Cover:

- title required and trimmed
- title max length
- status accepts `draft`, `beta`, `published`
- status rejects unknown values

### YouTube URL normalization

Cover success cases:

- `https://www.youtube.com/embed/VIDEO_ID`
- `https://youtube.com/embed/VIDEO_ID`
- `https://m.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`

Cover rejection cases:

- non-HTTPS URL
- untrusted host
- arbitrary iframe/script content
- missing video id
- invalid video id characters
- query-heavy embed URLs if not intentionally supported

### Lesson sequence validation

Cover:

- accepts timestamp `0`
- accepts timestamp equal to duration
- rejects negative timestamp
- rejects timestamp greater than duration
- rejects empty title

## Phase 2 — service tests

Use a fake repository and fake cache.

### Catalog reads

Test `ListCourses`:

- returns cached public list when present
- loads repo cards with `includeDrafts=false` on cache miss
- writes successful cache payload to `courses:list:v1`
- ignores corrupt cache payload and falls back to repo

Test `ListCoursesAdmin`:

- calls repo with `includeDrafts=true`
- bypasses public cache entirely
- includes draft rows returned by repo

Test `GetCourse`:

- uses `courses:detail:{slug}:v1`
- returns cached detail when valid
- loads course/modules/lessons/sequence from repo on miss
- assembles modules and lessons in repository order
- returns empty arrays instead of `null`
- maps repository not found to `service.ErrNotFound`

### Admin writes

Test `CreateCourse`:

- success returns `CourseCard`
- duplicate slug maps to `service.ErrConflict`
- invalid slug/status/title/description returns `ValidationError`
- invalidates `courses:list:v1`

Test `UpdateCourse`:

- validates only provided fields
- preserves omitted fields through pointer DTOs
- maps missing course to `service.ErrNotFound`
- invalidates public list and `courses:detail:{slug}:v1`

Test `CreateModule`:

- missing parent course maps to `service.ErrNotFound`
- invalid title returns `ValidationError`
- success persists module and invalidates list/detail keys

Test `CreateLesson`:

- missing module maps to `service.ErrNotFound`
- invalid YouTube URL returns `ValidationError`
- non-positive duration returns `ValidationError`
- invalid sequence timestamp returns `ValidationError`
- success normalizes YouTube URL, saves sequence points, invalidates list/detail keys

Test `ReplaceLessonSequence`:

- missing lesson maps to `service.ErrNotFound`
- invalid point timestamp/title returns `ValidationError`
- success replaces all points and invalidates parent detail key only

### Progress placeholders

Until progress persistence lands, test current behavior explicitly:

- `GetCourseProgress` reports total lessons from course detail and zero completed
- missing course maps through as `ErrNotFound`
- `UpdateLessonProgress` defaults empty status to `completed`
- empty lesson id returns validation error

## Phase 3 — handler/API tests

Use fake service dependencies or a service with fake repo/cache.

### Public catalog handlers

Cover:

- `GET /api/v1/courses` returns `200` and array of course cards
- `GET /api/v1/courses/{slug}` returns `200` and full outline
- not found course returns `404`
- malformed/internal service errors return consistent error envelope

### Admin middleware

Use a fake auth service URL configured on the handler.

Cover:

- no cookie returns `401`
- auth service non-200 returns `401`
- malformed session payload returns `401`
- authenticated user without admin role returns `403`
- user with `role: "admin"` is allowed
- comma-separated roles containing admin are allowed
- `ADMIN_WRITES_DISABLED=true` returns `503`

### Admin endpoints

Cover status/error mapping:

- `POST /api/v1/admin/courses` success returns `201`
- duplicate slug returns `409`
- validation error returns `400`
- `PATCH /api/v1/admin/courses/{id}` success returns `200`
- `POST /api/v1/admin/courses/{id}/modules` success returns `201`
- `POST /api/v1/admin/modules/{id}/lessons` success returns `201`
- `PUT /api/v1/admin/lessons/{id}/sequence` success returns `200`
- malformed JSON returns `400`
- missing parent/target returns `404`

### CORS

Cover:

- allowed origin receives `Access-Control-Allow-Credentials: true`
- allowed methods include `PATCH`, `PUT`, and `DELETE`
- disallowed origin does not receive permissive CORS headers
- `OPTIONS` returns `204`

## Phase 4 — required real Postgres integration tests

Add a required integration test suite that runs against a real Postgres database, validates repository/migration behavior, and always removes test data when the test process exits, whether tests pass or fail.

These tests must exist and be maintained alongside repository/migration changes. Keep the fast unit/handler suite in the default `make test` path so local regression checks still pass without Docker/Postgres/Redis, and expose the real DB suite through `make test-integration` and CI jobs that provide Postgres.

### Activation

Use both a build tag and an explicit database URL so accidental local/prod data access is hard:

```bash
cd backend-go
BACKEND_INTEGRATION_DATABASE_URL="postgres://postgres:postgres@localhost:5432/lms_test?sslmode=disable" \
  go test -tags=integration ./internal/repository/...
```

Recommended guardrails:

- Test files use `//go:build integration`.
- Tests fail fast if `BACKEND_INTEGRATION_DATABASE_URL` is empty.
- Tests refuse URLs that do not look like an isolated test database, e.g. database name must end in `_test` or host must be localhost/127.0.0.1.
- Never point these tests at a shared development, staging, or production database.

### Database setup and cleanup

Prefer a per-run isolated schema inside the real Postgres database:

1. In `TestMain`, connect to `BACKEND_INTEGRATION_DATABASE_URL`.
2. Generate a unique schema name, e.g. `test_lms_<timestamp>_<pid>`.
3. `CREATE SCHEMA <schema>`.
4. Set `search_path` to that schema for all test connections.
5. Run the real migrations into that schema.
6. Execute integration tests.
7. In a deferred cleanup from `TestMain`, run `DROP SCHEMA IF EXISTS <schema> CASCADE` before `os.Exit(code)`.

This guarantees cleanup after success or failure within the Go test process and avoids brittle table-by-table truncation.

If per-schema migrations are not feasible, use table cleanup instead:

- Insert only test-owned records with a unique run id prefix/suffix.
- Register `t.Cleanup` for each test and a final `TestMain` cleanup.
- Delete children before parents or run `TRUNCATE ... RESTART IDENTITY CASCADE` against only LMS-owned tables.
- Do not truncate Better Auth tables or any table outside backend ownership.

### Coverage

Initial real DB integration tests should validate:

- migrations apply cleanly to an empty schema
- seeded or inserted course data can be persisted and read back
- course list excludes drafts at the repository/query layer
- aggregate module/lesson counts and duration are correct
- course detail ordering is deterministic by `sort_order` tie-breakers
- lesson sequence ordering is deterministic by `sort_order`, then `timestamp_seconds`
- duplicate slug returns the expected repository/service conflict path
- deleting the per-run schema removes all integration test data

### Docker helper

Add a make target that starts a disposable Postgres container and runs only integration-tagged tests:

```bash
cd backend-go
make test-integration
```

The target should create/use a dedicated `lms_test` database, pass `BACKEND_INTEGRATION_DATABASE_URL`, run `go test -tags=integration`, and tear down the container or schema after the run.

## Phase 5 — optional SQLite-backed tests

Only add these after deciding how to make the schema/query layer SQLite-compatible. Real Postgres integration tests above are preferred for validating actual SQL when Docker/Postgres are available.

Potential SQLite tests:

- course list excludes drafts
- aggregate module/lesson counts and duration are correct
- detail query ordering is deterministic by `sort_order` tie-breakers
- lesson sequence ordering is deterministic by `sort_order`, then `timestamp_seconds`

If SQLite support would require substantial repository branching, defer these and rely on service tests plus the required Postgres integration suite.

## Manual Postgres smoke checks

Run only when Docker/Postgres/Redis are available:

```bash
cd backend-go
docker compose up --build
```

Then verify:

- migrations apply cleanly
- seeded `building-with-ai` course exists
- `GET /api/v1/courses` excludes draft courses
- admin writes reject anonymous callers
- admin writes work with a real admin session cookie
- cache keys are invalidated after course/module/lesson/sequence writes

## Suggested implementation order

1. Add fake cache and fake repository helpers for backend tests.
2. Add `validation_test.go` table tests.
3. Add service tests for catalog reads and admin writes.
4. Add handler tests for admin middleware and endpoint status codes.
5. Add CORS tests.
6. Add the real Postgres integration test harness, repository tests, and `make test-integration` target.
7. Run `cd backend-go && make test`.
8. Run `cd backend-go && make test-integration` with a real test Postgres database.
9. Fix compile/test failures.
10. Regenerate docs separately with `cd backend-go && make docs` after handler annotations are stable.

## Acceptance criteria

- `cd backend-go && make test` passes without Docker/Postgres/Redis.
- `cd backend-go && make test-integration` exists and runs required real Postgres integration tests against an isolated test database.
- Validation tests cover YouTube URLs and sequence timestamps.
- Service tests cover create/update/module/lesson/sequence success and failure cases.
- Cache tests prove public list and slug-keyed detail invalidation behavior.
- Handler tests prove anonymous admin writes return `401` and non-admin callers return `403`.
- Public course list draft-exclusion behavior is tested at the service/repository boundary and with real Postgres SQL.
- Progress placeholder behavior is documented by tests until real progress persistence replaces it.
- Real DB integration tests clean up all test data with per-run schema cleanup or an equivalent guaranteed cleanup strategy, regardless of pass/fail outcome.
