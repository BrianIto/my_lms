# Backend Course Authoring Plan

## Goal

Add secure backend endpoints that let an admin create courses, create modules, and add lessons while preserving the frontend experience for:

- Admin course authoring screen (`/_protected/admin`)
- Dashboard course cards (`/_protected/dashboard`)
- Course detail module/lesson outline (`/_protected/courses/$slug`)
- Lesson player (`/_protected/courses/$slug/lessons/$lessonId`)

The backend remains the source of truth for LMS data. Static course structure can be cached aggressively; per-user progress stays separate and uncached globally.

## Prerequisite: real admin auth (blocking)

Today the backend has no session/admin validation: `internal/handler/handler.go` `GetAccess()` returns a hardcoded `{Authenticated: true, BetaAccess: true}` placeholder. Exposing course/module/lesson **write** endpoints on top of that stub means shipping unauthenticated mutation routes.

Therefore, real Better Auth session validation plus an admin-permission check is a **blocking prerequisite** for every admin write endpoint below — not a trailing step. Concretely:

- Admin middleware must validate the Better Auth session and reject non-admin callers with `403` before any handler runs.
- Until that middleware is wired, admin write routes must stay feature-flagged off in any deployed environment.
- Acceptance: admin writes reject anonymous callers with `401` and authenticated non-admins with `403`.

## Current context

- Existing public/business routes live under `/api/v1` in `backend-go/internal/handler/handler.go`.
- Course data was originally seeded in memory in `backend-go/internal/service/course.go`; recent backend changes move course catalog reads/writes toward Postgres-backed repository/service methods plus a seed migration.
- The admin frontend still has a course-authoring placeholder with fields for title, slug, description, status, and YouTube embed URL; it is not yet wired to the backend authoring endpoints.
- Existing catalog routes:
  - `GET /api/v1/courses`
  - `GET /api/v1/courses/{slug}`
- Planned/partially implemented admin routes from `plan/05-admin-and-production.md` and this course plan:
  - `GET /api/v1/admin/courses`
  - `POST /api/v1/admin/courses`
  - `PATCH /api/v1/admin/courses/{id}`
  - `POST /api/v1/admin/courses/{id}/modules`
  - `POST /api/v1/admin/modules/{id}/lessons`
  - `PUT /api/v1/admin/lessons/{id}/sequence`

## Implementation status and remaining gaps

Recent backend work has added the first DB-backed course catalog/admin authoring slice: normalized course/module/lesson/lesson-sequence migrations, repository/service methods, public course list/detail caching, slug-keyed detail cache invalidation, admin routes, CORS methods for writes, and a Better Auth session check for admin write routes.

What is still missing before this plan is production-ready:

- **Backend tests are still missing.** There are currently no `*_test.go` files covering course creation, duplicate slugs, invalid statuses, missing parents, YouTube URL validation, lesson-sequence timestamp validation, cache invalidation, draft exclusion, or ordering.
- **OpenAPI docs need regeneration.** `backend-go/docs` does not yet include the new admin/course DTOs and routes; run `cd backend-go && make docs` after the route annotations compile cleanly.
- **Public/private course access still needs real auth gating.** `GetAccess()` still returns a hardcoded authenticated/beta response, and the public catalog/detail routes are not yet protected by real Better Auth session + beta-access validation where private course content is required.
- **Admin auth needs end-to-end verification.** The backend admin middleware expects `/api/auth/get-session` to return a `user.role` containing `admin`; verify this contract with the auth service, cookies/CORS, and anonymous/non-admin/admin integration cases.
- **Frontend is not wired to these course APIs yet.** Dashboard, course detail, lesson player, and admin authoring still read from static `frontend-react/src/lib/lms-data.ts`; replace that with TanStack Query calls to the backend and submit admin forms to the new endpoints.
- **Progress storage remains placeholder-only.** `GetCourseProgress()` reports zero completed lessons from static totals and `UpdateLessonProgress()` only normalizes the payload; the per-user progress schema/API from `plan/03-progress-and-player.md` still needs persistence and auth-derived user IDs.
- **Operational migration flow needs confirmation.** Ensure the new `004_course_catalog` migration is applied by the local/dev startup path and documented for deploys; do not rely on checked-in schema alone.
- **Optional import/admin UX remains future work.** The bulk course import endpoint and richer module/lesson/sequence editing UI are still not implemented.

## Frontend-driven API requirements

### Admin screen

The admin screen needs endpoints that support a fast MVP authoring flow:

1. Create a draft/beta course from metadata.
2. Add one or more modules to that course.
3. Add one or more YouTube lessons to each module.
4. Save safely as `draft` first, then publish/beta later.
5. Invalidate course list/detail caches after writes.

The API should return enough data for the admin screen to immediately update its inventory card without a full reload.

### Dashboard course cards

`GET /api/v1/courses` should return compact course card data:

```json
[
  {
    "id": "uuid",
    "slug": "building-with-ai",
    "title": "Building with AI",
    "description": "A practical course for shipping AI products.",
    "status": "beta",
    "module_count": 2,
    "lesson_count": 8,
    "duration_seconds": 3600
  }
]
```

Do not include user progress in the static list response. Progress remains a separate query.

**Admin vs public list caching.** A single shared `courses:list:v1` key cannot serve both audiences: the public catalog must exclude `draft` courses, while the admin inventory must see them. Resolve this explicitly:

- `courses:list:v1` caches only the **public, draft-excluded** list. It is served to non-admin callers.
- Admin inventory uses a separate path that includes drafts — either a dedicated admin listing query that **bypasses the public cache**, or a distinct `courses:list:admin:v1` key that is never returned to non-admin callers.
- Never serve the admin-visible list (with drafts) from the public key.

### Course detail screen

`GET /api/v1/courses/{slug}` should return the full static outline:

```json
{
  "id": "uuid",
  "slug": "building-with-ai",
  "title": "Building with AI",
  "description": "A practical course for shipping AI products.",
  "status": "beta",
  "modules": [
    {
      "id": "uuid",
      "title": "Introduction",
      "sort_order": 1,
      "lessons": [
        {
          "id": "uuid",
          "title": "Welcome",
          "youtube_embed_url": "https://www.youtube.com/embed/VIDEO_ID",
          "duration_seconds": 420,
          "sort_order": 1,
          "lesson_sequence": [
            {
              "id": "uuid",
              "title": "Setup the mental model",
              "description": "What to pay attention to in this section.",
              "timestamp_seconds": 0,
              "sort_order": 1
            },
            {
              "id": "uuid",
              "title": "Implementation checkpoint",
              "description": "Pause here and compare the code shape.",
              "timestamp_seconds": 185,
              "sort_order": 2
            }
          ]
        }
      ]
    }
  ]
}
```

The frontend can combine this static response with `GET /api/v1/courses/{slug}/progress` for completion state.

**Detail cache key consistency.** The read route is keyed by `slug`, but the existing cache key is `courses:detail:{courseID}:v1`. Reads cannot compute that key without first resolving slug→id (a DB hit that partly defeats the cache), and writes only know the `courseID`. Pick one consistent scheme so reads and invalidations target the same key. Recommended: key the detail cache by **slug** (`courses:detail:{slug}:v1`) so the read path needs no pre-lookup. If a slug ever becomes editable, invalidate both the old and new slug keys on update.

### Lesson player screen

The lesson player needs stable lesson IDs, trusted YouTube embed URLs, duration, previous/next lesson derivation, the course outline, and a `lesson_sequence` array. `lesson_sequence` is a set of timestamped bookmarks/chapters inside the video that the frontend can render as a calm technical timeline beside or below the player.

### Lesson Sequence / video bookmarks

Each lesson can include a `Lesson Sequence`: a curated list of important moments in the video. In the frontend, these become clickable bookmark rows such as “Setup the mental model”, “Implementation checkpoint”, or “Common failure mode”.

Lesson Sequence requirements:

- Each point belongs to one lesson.
- Each point has a title, optional short description, timestamp in seconds, and sort order.
- Points must be ordered by `sort_order`, then `timestamp_seconds`.
- `timestamp_seconds` must be between `0` and the lesson's `duration_seconds`. Since `duration_seconds` is required and `> 0` on every lesson, duration is always known — there is no "unknown duration" case to special-case in the MVP.
- The lesson player can use these points as clickable bookmarks that seek the YouTube iframe to that section.
- These points are static course content, so they can be cached with course detail responses.

Optional later endpoint if the lesson page becomes too heavy:

- `GET /api/v1/lessons/{lessonID}` returning the lesson plus course/module context and `lesson_sequence`.

## Endpoint plan

### 1. Create course

`POST /api/v1/admin/courses`

Auth: session + admin permission.

Request:

```json
{
  "slug": "building-with-ai",
  "title": "Building with AI",
  "description": "A practical course for shipping AI products.",
  "status": "draft",
  "sort_order": 10
}
```

Response: `201 Created`

```json
{
  "id": "uuid",
  "slug": "building-with-ai",
  "title": "Building with AI",
  "description": "A practical course for shipping AI products.",
  "status": "draft",
  "sort_order": 10,
  "module_count": 0,
  "lesson_count": 0,
  "duration_seconds": 0
}
```

Validation:

- `slug`: lowercase URL-safe slug, unique.
- `title`: required, length bounded.
- `description`: required for frontend cards.
- `status`: one of `draft`, `beta`, `published`.
- `sort_order`: optional, default after existing courses.

Side effects:

- Invalidate `courses:list:v1`.
- Do not cache admin write responses.

### 2. Update course metadata/status

`PATCH /api/v1/admin/courses/{id}`

Auth: session + admin permission.

Request allows partial updates:

```json
{
  "title": "Building with AI Systems",
  "description": "Updated copy.",
  "status": "beta",
  "sort_order": 20
}
```

Partial-update semantics: use pointer fields (`*string`, `*int`) or a patch map in the request DTO so the handler can distinguish "field omitted" from "field set to empty/zero". A plain struct with value fields would silently overwrite unspecified fields with their zero values. `slug` is not editable via PATCH in the MVP; if that changes later, invalidate both the old and new `courses:detail:{slug}:v1` keys.

Side effects:

- Invalidate `courses:list:v1`.
- Invalidate `courses:detail:{slug}:v1`.

### 3. Create module

`POST /api/v1/admin/courses/{id}/modules`

Auth: session + admin permission.

Request:

```json
{
  "title": "Introduction",
  "sort_order": 1
}
```

Response: `201 Created`

```json
{
  "id": "uuid",
  "course_id": "uuid",
  "title": "Introduction",
  "sort_order": 1,
  "lessons": []
}
```

Validation:

- Course must exist.
- Module title is required.
- Do not enforce a unique constraint on `sort_order`. Accept the client value and resolve ties deterministically with `ORDER BY sort_order, created_at` everywhere ordering matters. This applies equally to module, lesson, and lesson-sequence ordering.

Side effects:

- Invalidate `courses:list:v1` because module count changed.
- Invalidate `courses:detail:{slug}:v1`.

### 4. Add lesson to module

`POST /api/v1/admin/modules/{id}/lessons`

Auth: session + admin permission.

Request:

```json
{
  "title": "Welcome",
  "youtube_embed_url": "https://www.youtube.com/embed/VIDEO_ID",
  "duration_seconds": 420,
  "sort_order": 1,
  "lesson_sequence": [
    {
      "title": "Setup the mental model",
      "description": "What to pay attention to in this section.",
      "timestamp_seconds": 0,
      "sort_order": 1
    },
    {
      "title": "Implementation checkpoint",
      "description": "Pause here and compare the code shape.",
      "timestamp_seconds": 185,
      "sort_order": 2
    }
  ]
}
```

Response: `201 Created`

```json
{
  "id": "uuid",
  "module_id": "uuid",
  "title": "Welcome",
  "youtube_embed_url": "https://www.youtube.com/embed/VIDEO_ID",
  "duration_seconds": 420,
  "sort_order": 1,
  "lesson_sequence": [
    {
      "id": "uuid",
      "lesson_id": "uuid",
      "title": "Setup the mental model",
      "description": "What to pay attention to in this section.",
      "timestamp_seconds": 0,
      "sort_order": 1
    }
  ]
}
```

Validation:

- Module must exist.
- Lesson title is required.
- `duration_seconds` must be positive.
- `lesson_sequence` is optional on create, but if provided every point must have a title and valid timestamp.
- Lesson sequence point timestamps must be within the lesson duration.
- Only allow trusted YouTube embed hosts:
  - `https://www.youtube.com/embed/{videoId}`
  - optionally normalize `https://youtu.be/{videoId}` and watch URLs into embed URLs later.
- Reject arbitrary iframes, scripts, query-heavy URLs, and non-HTTPS URLs.

Side effects:

- Invalidate `courses:list:v1` because lesson count/duration changed.
- Invalidate `courses:detail:{slug}:v1` for the parent course.

### 5. Add or replace lesson sequence points

`PUT /api/v1/admin/lessons/{id}/sequence`

Auth: session + admin permission.

Use this when an admin edits the timestamp bookmarks for an existing lesson.

Request:

```json
{
  "points": [
    {
      "title": "Setup the mental model",
      "description": "What to pay attention to in this section.",
      "timestamp_seconds": 0,
      "sort_order": 1
    },
    {
      "title": "Implementation checkpoint",
      "description": "Pause here and compare the code shape.",
      "timestamp_seconds": 185,
      "sort_order": 2
    }
  ]
}
```

Response: `200 OK` with the saved sequence points.

Implementation note: replace all points for the lesson in one transaction for MVP simplicity. Later, add granular `POST/PATCH/DELETE /api/v1/admin/lesson-sequence-points/{id}` endpoints if the UI needs inline editing.

Side effects:

- Invalidate `courses:detail:{slug}:v1` for the parent course.
- No need to invalidate `courses:list:v1` unless list cards start showing sequence counts.

### 6. Optional bulk create course with modules and lessons

For a smoother admin MVP, add this after the atomic endpoints work:

`POST /api/v1/admin/courses/import`

Accept the seed-file shape from `AGENTS.md` and persist in one transaction:

```json
{
  "slug": "building-with-ai",
  "title": "Building with AI",
  "description": "A practical course for shipping AI products.",
  "status": "draft",
  "modules": [
    {
      "title": "Introduction",
      "lessons": [
        {
          "title": "Welcome",
          "youtubeEmbedUrl": "https://www.youtube.com/embed/VIDEO_ID",
          "durationSeconds": 420,
          "lessonSequence": [
            {
              "title": "Setup the mental model",
              "description": "What to pay attention to in this section.",
              "timestampSeconds": 0
            },
            {
              "title": "Implementation checkpoint",
              "description": "Pause here and compare the code shape.",
              "timestampSeconds": 185
            }
          ]
        }
      ]
    }
  ]
}
```

This endpoint is useful for the admin screen once it supports multiple module/lesson rows.

Casing note: the example above uses camelCase (`youtubeEmbedUrl`, `durationSeconds`) to match the existing `AGENTS.md` seed-file shape, while the atomic endpoints use snake_case (`youtube_embed_url`, `duration_seconds`). Pick one convention for the public JSON API and apply it consistently. Recommended: snake_case everywhere to match the atomic endpoints and existing catalog responses; if the import body must accept the seed-file camelCase verbatim, treat it as an explicit ingestion adapter, not the general API style.

## Database plan

Add normalized tables if not already present:

```sql
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'beta', 'published')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  youtube_embed_url text NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lesson_sequence_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  timestamp_seconds integer NOT NULL CHECK (timestamp_seconds >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

`updated_at` note: `DEFAULT now()` only sets the value on INSERT — Postgres does not bump it on UPDATE. Either add a `BEFORE UPDATE` trigger that sets `updated_at = now()` on each table, or set `updated_at = now()` explicitly in every update query. Don't rely on the default to keep it fresh.

Indexes:

- `courses(status, sort_order)` for catalog list.
- `modules(course_id, sort_order)` for course detail.
- `lessons(module_id, sort_order)` for course detail/player outline.
- `lesson_sequence_points(lesson_id, sort_order, timestamp_seconds)` for player bookmarks.

## Backend implementation steps

1. Add migrations under `backend-go/internal/db/migrations`.
2. Add repository/query methods for:
   - create course
   - update course
   - create module
   - create lesson
   - replace lesson sequence points
   - list courses with counts/duration
   - get course by slug with modules, lessons, and lesson sequence points
   - resolve a course slug for cache invalidation given a child ID: `module ID -> course slug` and `lesson ID -> course slug`. The lesson and lesson-sequence write routes only carry a module/lesson ID, but they must invalidate the parent `courses:detail:{slug}:v1` key — so the service needs these lookups (a join up to `courses`) before busting the cache.
3. Move `service.Course`, `service.Module`, and `service.Lesson` responses from seeded data to DB-backed reads.
4. Add request DTOs and validation helpers in the service layer.
5. Add YouTube embed URL validation/normalization helper with unit tests.
6. Add lesson sequence timestamp validation with unit tests.
7. Wire real admin middleware (blocking prerequisite, see top of plan): validate the Better Auth session and reject anonymous callers with `401` and authenticated non-admins with `403` before any admin handler runs. Do not ship admin writes behind the existing hardcoded access stub; if the middleware is not yet wired, keep admin write routes feature-flagged off in deployed environments.
8. Register admin routes in `handler.Routes()`.
9. Update CORS allowed methods to include `PATCH`, `PUT`, and possibly `DELETE` later.
10. Invalidate Redis keys after every authoring write.
11. Regenerate OpenAPI docs with `cd backend-go && make docs`.

## Cache rules

Read routes:

- `GET /api/v1/courses` uses `courses:list:v1`.
- `GET /api/v1/courses/{slug}` uses `courses:detail:{slug}:v1`.

Write routes:

- Course create/update: invalidate list and detail key.
- Module create: invalidate list and parent detail key.
- Lesson create: invalidate list and parent detail key.
- Lesson sequence replace: invalidate parent detail key.

Never include user progress, auth state, beta access state, or admin-only fields in static course cache entries.

## Security rules

- Admin endpoints must require authenticated admin access, not just beta access.
- Do not accept client-provided user IDs for authorization.
- Validate all JSON bodies and return consistent error envelopes.
- Normalize emails/users in auth service only; backend should consume verified session/admin facts.
- Keep YouTube URLs sanitized and trusted before returning them to the frontend iframe.
- Draft courses should not appear to non-admin users in public catalog responses.

## Testing plan

Backend tests should cover:

- Create course success.
- Duplicate slug returns `409 Conflict`.
- Invalid status returns `400 Bad Request`.
- Create module for missing course returns `404 Not Found`.
- Add lesson with invalid YouTube URL returns `400 Bad Request`.
- Add lesson invalidates parent course detail cache.
- Add lesson sequence rejects timestamps outside lesson duration.
- Replace lesson sequence persists ordered bookmark points and invalidates parent course detail cache.
- Course list excludes `draft` for non-admin catalog.
- Course detail returns modules and lessons in `sort_order` order.
- OpenAPI docs include admin endpoints.

## Suggested status codes

- `201 Created`: course/module/lesson created.
- `200 OK`: course updated.
- `400 Bad Request`: malformed JSON or validation error.
- `401 Unauthorized`: no valid session.
- `403 Forbidden`: authenticated but not admin.
- `404 Not Found`: parent course/module missing.
- `409 Conflict`: duplicate course slug.
- `500 Internal Server Error`: unexpected persistence/cache failure.

## Deliverable

An admin can create a course, add modules, add YouTube lessons, and immediately see those records reflected in dashboard/course/detail/player screens through DB-backed catalog APIs with safe cache invalidation.

## Done checks

- Admin write endpoints reject anonymous callers with `401` and authenticated non-admins with `403` (no reliance on the hardcoded access stub).
- Public `GET /api/v1/courses` excludes `draft` courses while admin inventory still sees them, served from separate cache paths.
- `POST /api/v1/admin/courses` creates normalized course rows.
- `POST /api/v1/admin/courses/{id}/modules` creates ordered modules.
- `POST /api/v1/admin/modules/{id}/lessons` creates validated YouTube lessons with optional sequence bookmarks.
- `PUT /api/v1/admin/lessons/{id}/sequence` replaces timestamped lesson sequence points.
- `GET /api/v1/courses` returns frontend-ready course card data.
- `GET /api/v1/courses/{slug}` returns frontend-ready module/lesson outline with lesson sequence bookmarks.
- Static course cache is invalidated after admin writes.
- Progress remains separate from static course data.
- Backend tests pass with `cd backend-go && make test`.
- OpenAPI docs are regenerated with `cd backend-go && make docs`.
