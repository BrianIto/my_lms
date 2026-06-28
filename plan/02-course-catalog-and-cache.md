# 02 — Course Catalog and Cache

## Goal

Create a simple, cache-friendly course catalog backed by Postgres, with course creation based on YouTube embed links.

## Data model

Use normalized Postgres records, not raw unvalidated blobs.

Suggested tables:

- `courses`
  - `id`
  - `slug`
  - `title`
  - `description`
  - `status`: `draft`, `published`, `beta`
  - `sort_order`
  - timestamps
- `modules`
  - `id`
  - `course_id`
  - `title`
  - `sort_order`
  - timestamps
- `lessons`
  - `id`
  - `module_id`
  - `title`
  - `youtube_embed_url`
  - `duration_seconds`
  - `sort_order`
  - timestamps
- `lesson_sequence_points` (timestamped video bookmarks/chapters)
  - `id`
  - `lesson_id`
  - `title`
  - `description` (optional, defaults to empty)
  - `timestamp_seconds` (>= 0 and <= the lesson `duration_seconds`)
  - `sort_order`
  - timestamps

Ordering note: do not enforce a unique constraint on `sort_order`. Accept the client value and tie-break deterministically with `ORDER BY sort_order, created_at` (lesson sequence points use `ORDER BY sort_order, timestamp_seconds`). `updated_at` defaults only fire on INSERT — bump it via trigger or explicit `SET updated_at = now()` on every update.

## Easy course seed shape

```json
{
  "slug": "building-with-ai",
  "title": "Building with AI",
  "description": "A practical course for shipping AI products.",
  "status": "beta",
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
            }
          ]
        }
      ]
    }
  ]
}
```

Casing note: this seed shape uses camelCase (`youtubeEmbedUrl`, `durationSeconds`, `lessonSequence`) for human-authored seed/import files. The public JSON API uses snake_case (`youtube_embed_url`, `duration_seconds`, `lesson_sequence`) to match the existing catalog responses. Treat the seed/import ingestion as an explicit adapter — do not leak camelCase into the general API.

## Backend tasks

- Add migrations/schema for courses, modules, lessons, and lesson_sequence_points.
- Add SQLC queries, repository methods, service methods, and handlers.
- Validate YouTube embed URLs before saving (trusted embed hosts only).
- Validate lesson sequence timestamps fall within the lesson duration.
- Add routes:
  - `GET /api/v1/courses`
  - `GET /api/v1/courses/{slug}` (returns modules, lessons, and `lesson_sequence` bookmarks)
- The public `GET /api/v1/courses` list must exclude `draft` courses. Admin inventory views (which include drafts) use a separate query/cache path — see Cache strategy below.
- Protect beta/private course detail routes with session + beta access guard.
- Admin authoring write endpoints are specified in `COURSE_PLAN.md` and require session + admin permission (not just beta access).
- Generate OpenAPI docs after route/DTO changes:

```bash
cd backend-go
make docs
```

## Cache strategy

Cache static course data aggressively in Redis.

Recommended keys:

- `courses:list:v1` — public, **draft-excluded** course-card list. Served to non-admin callers only.
- `courses:list:admin:v1` — admin inventory list including drafts (or a query that bypasses the public cache entirely). Never returned to non-admin callers.
- `courses:detail:{slug}:v1` — full static outline for a course, keyed by **slug**.
- `courses:public-preview:v1`

Key the detail cache by `slug`, not `courseID`: the read route `GET /api/v1/courses/{slug}` can build the key directly with no slug→id pre-lookup, and writes resolve the parent slug before invalidating. If a slug ever becomes editable, invalidate both the old and new `courses:detail:{slug}:v1` keys on update.

Rules:

- Use TTL of 1h–24h depending on environment.
- Add version suffix when content response shape changes.
- A single shared list key cannot serve both audiences — keep the public draft-excluded list and the admin (draft-including) list on separate paths so drafts never leak publicly.
- Invalidate relevant keys when course metadata/modules/lessons/sequence points change. Module and lesson writes carry only a child ID, so the service must resolve `module ID → course slug` / `lesson ID → course slug` before busting the `courses:detail:{slug}:v1` key.
- Never globally cache per-user progress in these keys.

## Frontend tasks

- Add course dashboard/list page.
- Add course detail page with modules and lessons.
- Use TanStack Query with long stale time for course list/detail.
- Keep progress queries separate from static course queries.

## Deliverable

A beta user can browse a seeded course catalog and course detail quickly, with backend Redis caching for static content.

## Done checks

- Course list and detail routes return expected data, with detail including `lesson_sequence` bookmarks.
- Public course list excludes `draft` courses; admin inventory (with drafts) is served from a separate path.
- Cached responses are served for repeated catalog/detail requests, keyed consistently by slug for detail.
- Cache does not include user-specific progress.
- OpenAPI docs include new endpoints.
