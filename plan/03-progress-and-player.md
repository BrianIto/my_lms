# 03 — Progress and Lesson Player

## Goal

Let beta users watch YouTube-based lessons and track knowledge progress initially as percentage of videos completed.

## Progress model

Initial states:

- `not_started`
- `in_progress`
- `completed`

Course progress formula:

```text
completed lessons / total lessons * 100
```

Store progress per user and lesson. Derive course-level percentage from lesson records.

## Backend tasks

Suggested tables:

- `enrollments` optional for phase 1, useful for later cohort/access work.
- `lesson_progress`
  - `id`
  - `user_id` from Better Auth identity
  - `lesson_id`
  - `status`
  - `last_position_seconds` nullable
  - `completed_at` nullable
  - timestamps
  - unique `(user_id, lesson_id)`

Routes:

- `GET /api/v1/courses/{slug}/progress`
- `POST /api/v1/lessons/{lessonID}/progress`

Rules:

- Require session + beta access.
- Make progress writes idempotent.
- Do not trust user id from client body.
- Do not globally cache progress.
- Optionally short-cache access/user identity decisions only with explicit TTL and invalidation strategy.

## Frontend tasks

- Build lesson player page with a YouTube iframe.
- Add module/lesson side navigation.
- Add mark-as-complete and in-progress controls.
- Show progress percentage on:
  - dashboard course card;
  - course detail page;
  - lesson player page.
- Use optimistic updates only when rollback is straightforward.
- Keep static course query and progress query separate.

## YouTube embed rules

- Prefer `https://www.youtube.com/embed/{VIDEO_ID}`.
- Validate and sanitize values server-side.
- Use iframe attributes intentionally, for example:
  - `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"`
  - `allowFullScreen`
- Consider sandbox/referrer policy when compatible with YouTube playback.

## Deliverable

Users can watch lessons and see their completion percentage update reliably.

## Done checks

- Progress updates are idempotent.
- Course percentage is correct for zero, partial, and full completion.
- Progress is scoped to the authenticated user.
- Static course cache remains separate from progress state.
