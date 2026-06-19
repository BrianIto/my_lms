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
          "durationSeconds": 420
        }
      ]
    }
  ]
}
```

## Backend tasks

- Add migrations/schema for courses, modules, and lessons.
- Add SQLC queries, repository methods, service methods, and handlers.
- Validate YouTube embed URLs before saving.
- Add routes:
  - `GET /api/v1/courses`
  - `GET /api/v1/courses/{slug}`
- Protect beta/private course detail routes with session + beta access guard.
- Generate OpenAPI docs after route/DTO changes:

```bash
cd backend-go
make docs
```

## Cache strategy

Cache static course data aggressively in Redis.

Recommended keys:

- `courses:list:v1`
- `courses:detail:{courseID}:v1`
- `courses:public-preview:v1`

Rules:

- Use TTL of 1h–24h depending on environment.
- Add version suffix when content response shape changes.
- Invalidate relevant keys when course metadata/modules/lessons change.
- Never globally cache per-user progress in these keys.

## Frontend tasks

- Add course dashboard/list page.
- Add course detail page with modules and lessons.
- Use TanStack Query with long stale time for course list/detail.
- Keep progress queries separate from static course queries.

## Deliverable

A beta user can browse a seeded course catalog and course detail quickly, with backend Redis caching for static content.

## Done checks

- Course list and detail routes return expected data.
- Cached responses are served for repeated catalog/detail requests.
- Cache does not include user-specific progress.
- OpenAPI docs include new endpoints.
