**What needs to be done**:
Move the lesson page from static YouTube embeds and rounded bookmark labels to a YouTube IFrame API-backed player where bookmark timestamps render as pure `m:ss` time (for example `3:51`) and clicking a bookmark seeks the current video to that exact timestamp.

**Risk level**: medium
This changes lesson-player runtime behavior, external YouTube API loading, iframe ownership, and visible bookmark formatting, but should not touch backend contracts or persisted data.

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/Router/Query
- Test runner: Vitest/Biome for frontend checks
- Verification command: `cd frontend-react && bunx --bun biome check src/routes/_protected.courses.$slug_.lessons.$lessonId.tsx src/lib/lms-data.ts && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `AGENTS.md` — service boundaries, frontend ownership, repository commands, and LMS working rules
- `design.md` — lesson-player UI must preserve the dark, border-first, quietly premium cockpit style
- `plan/README.md` — plan index and cross-cutting constraints
- `plan/03-progress-and-player.md` — lesson player expectations, progress separation, and YouTube embed rules
- `frontend-react/package.json` — confirms React/TanStack/Vite/Biome versions and available scripts
- `frontend-react/src/routes/_protected.courses.$slug_.lessons.$lessonId.tsx` — current lesson player iframe, bookmark rendering, progress controls, and lesson sequence sidebar
- `frontend-react/src/lib/lms-data.ts` — current `formatDuration` helper returns rounded minutes and is reused outside bookmarks
- `frontend-react/src/lib/backend-api.ts` — lesson and bookmark types (`youtubeEmbedUrl`, `timestampSeconds`) used by the player
- `frontend-react/src/routes/_protected.courses.$slug.tsx` and `frontend-react/src/routes/_protected.dashboard.tsx` — check related duration display usage before changing shared formatting helpers

**Architecture context**:
The backend already provides validated YouTube embed URLs and bookmark `timestampSeconds`; this chore should be frontend-only and must not alter API response shapes. Static course data and progress queries stay separate. If the YouTube IFrame API cannot be used safely with the existing embed URL shape, STOP and ask before changing backend data or validation.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/routes/_protected.courses.$slug_.lessons.$lessonId.tsx` — implement YouTube IFrame API player creation, bookmark seek behavior, and clickable bookmark UI
- `frontend-react/src/lib/lms-data.ts` — add or adjust a timestamp-formatting helper without breaking existing duration displays elsewhere
- `frontend-react/src/lib/backend-api.ts` — only if an existing exported type needs a frontend-only type refinement; do not change API paths or payload mapping

---

**Confidence check** (do this before step 1):
Restate that you are replacing the lesson page's plain iframe playback with a YouTube IFrame API-controlled player so bookmark clicks call `seekTo(timestampSeconds, true)` on the active player. Confirm that bookmark badges should display exact minute/second time like `3:51`, while existing lesson/course duration labels should keep their current human-readable behavior unless a separate helper is introduced. List assumptions about script loading, player cleanup, and behavior before the YouTube player is ready; if any assumption is shaky, ask before proceeding.

**Workflow steps**:
1. Inventory the current lesson player route, bookmark rendering, shared duration helper usage, and related course/dashboard duration displays.
2. Add a small, typed YouTube IFrame API integration for the lesson page: load `https://www.youtube.com/iframe_api` once, create/destroy the player when the lesson video changes, and keep a safe player ref.
3. Parse the video ID from the existing validated YouTube embed URL and render the player in the existing bordered video frame without changing backend data contracts.
4. Add an exact timestamp formatter for bookmarks (`m:ss`, zero-padded seconds), and use it only for lesson bookmark/sequence point labels.
5. Convert bookmark rows into accessible buttons/actions that seek to the selected timestamp via the YouTube IFrame API, with graceful disabled/no-op behavior until the player is ready.
6. Preserve existing progress controls, lesson navigation, query keys, dark cockpit styling, keyboard accessibility, and mobile layout.
7. Run the verification command and fix issues within scope.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing frontend checks/build still pass (`cd frontend-react && bunx --bun biome check src/routes/_protected.courses.$slug_.lessons.$lessonId.tsx src/lib/lms-data.ts && bun --bun run build`)
- [ ] Type checks/build pass for the touched frontend files
- [ ] Existing course, dashboard, progress-control, and lesson navigation behavior remains unchanged
- [ ] Backend API contracts, database schema, generated route tree files, and auth service code are not modified
- [ ] Bookmark timestamps render exact `m:ss` values (`231` seconds renders `3:51`; `0` renders `0:00`)
- [ ] Clicking a bookmark seeks the currently loaded YouTube player to `timestampSeconds` using the YouTube IFrame API, not URL hash changes or remount-only iframe tricks
- [ ] The YouTube API script is loaded once and player instances are cleaned up when the lesson changes/unmounts
- [ ] The page remains accessible by keyboard and does not throw during SSR or before `window.YT` is available

**Done looks like**:
- Files changed: only files within scope above
- Command to verify: `cd frontend-react && bunx --bun biome check src/routes/_protected.courses.$slug_.lessons.$lessonId.tsx src/lib/lms-data.ts && bun --bun run build`
- Expected output: Biome passes and the production build succeeds with no new errors
- Observable state: lesson bookmarks display exact `m:ss` timing and clicking any bookmark jumps the YouTube player to that timestamp on the current lesson page
