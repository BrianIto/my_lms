# Agentic Coding Prompt — Isolate YouTube Component

**What needs to be done**:
Move the inline YouTube iframe API/player logic currently embedded in the lesson route into a dedicated reusable component/module, so the lesson page goes from owning player setup/seek/readiness details to consuming a focused YouTube lesson player abstraction.

**Risk level**: medium

**Stack & tooling**:
- Language/Framework: TypeScript + React 19 + TanStack Start/Router
- Test runner: Vitest
- Verification command: `cd frontend-react && bun --bun run check && bun --bun run build`
- If unsure about versions, check `frontend-react/package.json`

---

**Context to read first** (do this before writing any code):
- `design.md` — canonical LMS visual system; the player frame must keep the dark, border-first, amber-restrained treatment.
- `plan/README.md` — project work-area index and cross-cutting rules.
- `plan/04-frontend-design.md` — lesson player UI expectations and frontend design constraints.
- `frontend-react/src/routes/_protected.courses.$slug_.lessons.$lessonId.tsx` — current inline YouTube API loader, video ID parsing, player lifecycle, bookmark seek behavior, and lesson page layout.
- `frontend-react/src/lib/lms-data.ts` — lesson data helpers and types already used by the route.
- `frontend-react/src/lib/backend-api.ts` — backend lesson/course response shapes used by the player page.

**Architecture context**:
The lesson route should remain responsible for data fetching, routing, progress mutation, and page composition. YouTube-specific concerns should live behind a small frontend component/API so future player features can be added without growing the route file. If this conflicts with existing frontend component conventions, STOP and ask before proceeding.

---

**Scope — files you ARE allowed to modify** (whitelist; leave EMPTY if using blacklist below):
- `frontend-react/src/routes/_protected.courses.$slug_.lessons.$lessonId.tsx` — remove inline YouTube player implementation and consume the new component.
- `frontend-react/src/components/` — add the isolated YouTube component in the most appropriate existing or new subdirectory.
- `frontend-react/src/lib/` — add shared YouTube utilities/types only if they should not live inside the component file.
- `frontend-react/src/styles.css` — only if the isolated component needs a small reusable style that cannot be expressed with Tailwind utilities.

---

**Confidence check** (do this before step 1):
Restate the chore in your own words in 2–3 sentences. List any assumption you are making. If any assumption feels shaky, ask before proceeding.

**Workflow steps**:
1. Identify the current YouTube responsibilities in the lesson route: API script loading, video ID/host parsing, player lifecycle, readiness state, error handling, and seek-to-bookmark behavior.
2. Create a focused reusable YouTube player component that accepts the lesson embed URL and exposes readiness/seek behavior in a clean React-friendly way, without changing lesson data fetching or progress behavior.
3. Refactor the lesson route to consume the new component while preserving the existing player frame, invalid URL fallback, bookmark buttons, and progress controls.
4. Run the verification command and fix only issues caused by this refactor; if unrelated existing Biome errors block verification, document them clearly.

> Steps should be milestones, not micro-instructions. You decide the sub-steps.

**If you get stuck or discover the task is wrong**:
- Do NOT force the change through.
- Stop, summarize what you found, and ask. A wrong chore done well is worse than a right chore left undone.

---

**Do not break**:
- [ ] Existing tests/checks still pass or only fail on documented pre-existing issues (`cd frontend-react && bun --bun run check && bun --bun run build`).
- [ ] Type checks pass for all files touched by this chore.
- [ ] Bookmark buttons still seek to the authored timestamp once the YouTube player is ready.
- [ ] Invalid or unsupported YouTube embed URLs still show the current user-facing fallback instead of crashing.
- [ ] Lesson progress controls and course outline navigation remain unchanged.
- [ ] No new global state beyond the existing YouTube iframe API loader cache.

**Done looks like**:
- Files changed: only files within scope above.
- Command to verify: `cd frontend-react && bun --bun run check && bun --bun run build`
- Expected output: all checks/build pass, or any failures are explicitly identified as pre-existing and unrelated.
- Observable state: `frontend-react/src/routes/_protected.courses.$slug_.lessons.$lessonId.tsx` no longer declares YouTube API types/loader/parser/player lifecycle directly; those responsibilities are isolated behind the new YouTube component/module.
