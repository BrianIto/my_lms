import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const courseCardPayload = {
	id: "course-1",
	slug: "building-with-ai",
	title: "Building with AI",
	description: "A practical course for shipping AI products.",
	status: "beta",
	sort_order: 1,
	module_count: 1,
	lesson_count: 1,
	duration_seconds: 420,
};

const coursePayload = {
	id: "course-1",
	slug: "building-with-ai",
	title: "Building with AI",
	description: "A practical course for shipping AI products.",
	status: "beta",
	sort_order: 1,
	modules: [
		{
			id: "module-1",
			title: "Introduction",
			sort_order: 1,
			lessons: [
				{
					id: "lesson-1",
					title: "Welcome",
					youtube_embed_url: "https://www.youtube.com/embed/VIDEO_ID",
					duration_seconds: 420,
					sort_order: 1,
					lesson_sequence: [],
				},
			],
		},
	],
};

const progressPayload = {
	course_slug: "building-with-ai",
	completed_lessons: 1,
	total_lessons: 1,
	percent: 100,
	lessons: [
		{
			lesson_id: "lesson-1",
			status: "completed",
			last_position_seconds: 420,
		},
	],
};

const lessonPayload = {
	id: "lesson-1",
	title: "Welcome",
	youtube_embed_url: "https://www.youtube.com/embed/VIDEO_ID",
	duration_seconds: 420,
	sort_order: 1,
	lesson_sequence: [],
};

const sequencePointPayload = {
	id: "point-1",
	lesson_id: "lesson-1",
	title: "Checkpoint",
	description: "Review the core tactic.",
	timestamp_seconds: 120,
	sort_order: 1,
};

function jsonResponse(payload: unknown) {
	return new Response(JSON.stringify(payload), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

describe("auth service beta allowlist API", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubEnv("VITE_AUTH_URL", "https://auth.brianito.com/");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	test("uses VITE_AUTH_URL and includes credentials for allowlist reads and writes", async () => {
		const requested: Array<{ url: string; init?: RequestInit }> = [];
		const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
			requested.push({ url: String(input), init });
			if (init?.method === "POST") {
				return jsonResponse({
					id: "beta-1",
					email: "student@example.com",
					user_id: null,
					status: "active",
					created_at: "2026-06-30T00:00:00.000Z",
					updated_at: "2026-06-30T00:00:00.000Z",
				});
			}
			return jsonResponse({ entries: [] });
		});
		vi.stubGlobal("fetch", fetchMock);

		const api = await import("./backend-api");
		await api.listBetaAllowlist();
		await api.upsertBetaAllowlistEntry({ email: "student@example.com", status: "active" });

		expect(requested).toEqual([
			{
				url: "https://auth.brianito.com/api/beta/allowlist",
				init: { credentials: "include" },
			},
			{
				url: "https://auth.brianito.com/api/beta/allowlist",
				init: expect.objectContaining({
					method: "POST",
					credentials: "include",
					headers: { "Content-Type": "application/json" },
				}),
			},
		]);
	});
});

describe("backend API base URL", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubEnv("VITE_API_URL", "https://api.brianito.com/");
		vi.stubEnv("VITE_BACKEND_URL", undefined);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	test("uses VITE_API_URL when VITE_BACKEND_URL is absent for course, progress, and admin requests", async () => {
		const requestedUrls: string[] = [];
		const fetchMock = vi.fn(async (input: string | URL | Request) => {
			const requestUrl = String(input);
			requestedUrls.push(requestUrl);
			const { pathname } = new URL(requestUrl);

			if (pathname === "/api/v1/courses") {
				return jsonResponse([courseCardPayload]);
			}
			if (pathname === "/api/v1/courses/building-with-ai") {
				return jsonResponse(coursePayload);
			}
			if (pathname === "/api/v1/courses/building-with-ai/progress") {
				return jsonResponse(progressPayload);
			}
			if (pathname === "/api/v1/lessons/lesson-1/progress") {
				return jsonResponse(progressPayload.lessons[0]);
			}
			if (pathname === "/api/v1/admin/courses") {
				return jsonResponse([courseCardPayload]);
			}
			if (pathname === "/api/v1/admin/courses/admin-course-id") {
				return jsonResponse(courseCardPayload);
			}
			if (pathname === "/api/v1/admin/courses/course-1/modules") {
				return jsonResponse({
					id: "module-1",
					title: "Introduction",
					sort_order: 1,
				});
			}
			if (pathname === "/api/v1/admin/modules/module-1/lessons") {
				return jsonResponse(lessonPayload);
			}
			if (pathname === "/api/v1/admin/courses/course-1") {
				return jsonResponse(null);
			}
			if (pathname === "/api/v1/admin/modules/module-1") {
				return jsonResponse(null);
			}
			if (pathname === "/api/v1/admin/lessons/lesson-1") {
				return jsonResponse(null);
			}
			if (pathname === "/api/v1/admin/sequence/point-1") {
				return jsonResponse(null);
			}
			if (pathname === "/api/v1/admin/lessons/lesson-1/sequence") {
				return jsonResponse([sequencePointPayload]);
			}

			return new Response(JSON.stringify({ error: `Unhandled ${pathname}` }), {
				status: 500,
			});
		});
		vi.stubGlobal("fetch", fetchMock);

		const api = await import("./backend-api");

		await api.listCourses();
		await api.getCourse("building-with-ai");
		await api.getCourseProgress("building-with-ai");
		await api.updateLessonProgress({
			lessonId: "lesson-1",
			status: "completed",
		});
		await api.listAdminCourses();
		await api.createAdminCourse({
			slug: "building-with-ai",
			title: "Building with AI",
			description: "A practical course for shipping AI products.",
			status: "beta",
		});
		await api.updateAdminCourse({
			id: "admin-course-id",
			title: "Building with AI",
		});
		await api.createAdminModule({
			courseId: "course-1",
			title: "Introduction",
		});
		await api.createAdminLesson({
			moduleId: "module-1",
			title: "Welcome",
			youtubeEmbedUrl: "https://www.youtube.com/embed/VIDEO_ID",
			durationSeconds: 420,
		});
		await api.deleteAdminCourse("course-1");
		await api.deleteAdminModule("module-1");
		await api.deleteAdminLesson("lesson-1");
		await api.deleteAdminSequencePoint("point-1");
		await api.replaceAdminLessonSequence({
			lessonId: "lesson-1",
			points: [{ title: "Checkpoint", timestampSeconds: 120 }],
		});

		expect(requestedUrls).toContain("https://api.brianito.com/api/v1/courses");
		expect(requestedUrls).toContain(
			"https://api.brianito.com/api/v1/courses/building-with-ai",
		);
		expect(requestedUrls).toContain(
			"https://api.brianito.com/api/v1/courses/building-with-ai/progress",
		);
		expect(requestedUrls).toContain(
			"https://api.brianito.com/api/v1/lessons/lesson-1/progress",
		);
		expect(requestedUrls).toContain(
			"https://api.brianito.com/api/v1/admin/courses",
		);
		expect(requestedUrls).not.toEqual(
			expect.arrayContaining([expect.stringContaining("localhost:8080")]),
		);
		expect(fetchMock).toHaveBeenCalledTimes(14);
	});
});
