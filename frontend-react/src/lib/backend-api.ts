export type BetaAccessRequestInput = {
	email: string;
	preferredName?: string;
	whatsappContact?: string;
	whatsappConsent: boolean;
};

export type BetaAccessRequestResponse = {
	email: string;
	status: "pending";
	message: string;
};

export type BetaAllowlistStatus = "invited" | "active" | "revoked";

export type BetaAllowlistEntry = {
	id: string;
	email: string;
	user_id: string | null;
	status: BetaAllowlistStatus;
	created_at: string;
	updated_at: string;
};

export type BetaAllowlistResponse = {
	entries: BetaAllowlistEntry[];
};

export type EmailFirstSigninPreflight = {
	email: string;
	credential_state: "has_password" | "needs_password_setup";
};

const authServiceURL =
	import.meta.env.VITE_AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
const backendURL =
	import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ??
	"http://localhost:8080";

function getApiError(payload: unknown, fallback: string) {
	return typeof (payload as { error?: unknown } | null)?.error === "string"
		? (payload as { error: string }).error
		: fallback;
}

export async function requestBetaAccess(
	input: BetaAccessRequestInput,
): Promise<BetaAccessRequestResponse> {
	const response = await fetch(`${authServiceURL}/api/beta/requests`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});

	const payload = await response.json().catch(() => null);

	if (!response.ok) {
		throw new Error(getApiError(payload, "Could not request beta access."));
	}

	return payload as BetaAccessRequestResponse;
}

export async function preflightEmailFirstSignin(input: {
	email: string;
}): Promise<EmailFirstSigninPreflight> {
	const response = await fetch(
		`${authServiceURL}/api/beta/email-first-signin`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		},
	);
	const payload = await response.json().catch(() => null);

	if (!response.ok) {
		throw new Error(
			getApiError(payload, "This email is not active for beta access."),
		);
	}

	return payload as EmailFirstSigninPreflight;
}

export async function listBetaAllowlist(): Promise<BetaAllowlistResponse> {
	const response = await fetch(`${authServiceURL}/api/beta/allowlist`, {
		credentials: "include",
	});
	const payload = await response.json().catch(() => null);

	if (!response.ok) {
		throw new Error(getApiError(payload, "Could not load beta allowlist."));
	}

	return payload as BetaAllowlistResponse;
}

export async function upsertBetaAllowlistEntry(input: {
	email: string;
	status: BetaAllowlistStatus;
}): Promise<BetaAllowlistEntry> {
	const response = await fetch(`${authServiceURL}/api/beta/allowlist`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify(input),
	});
	const payload = await response.json().catch(() => null);

	if (!response.ok) {
		throw new Error(getApiError(payload, "Could not update beta allowlist."));
	}

	return payload as BetaAllowlistEntry;
}

export type CourseStatus = "draft" | "beta" | "published";
export type LessonStatus = "not_started" | "in_progress" | "completed";

export type LessonSequencePoint = {
	id: string;
	lessonId: string;
	title: string;
	description: string;
	timestampSeconds: number;
	sortOrder: number;
};

export type Lesson = {
	id: string;
	title: string;
	youtubeEmbedUrl: string;
	durationSeconds: number;
	sortOrder: number;
	lessonSequence: LessonSequencePoint[];
	status?: LessonStatus;
};

export type Module = {
	id: string;
	title: string;
	sortOrder: number;
	lessons: Lesson[];
};

export type Course = {
	id: string;
	slug: string;
	title: string;
	description: string;
	status: CourseStatus;
	sortOrder: number;
	progress?: number;
	modules: Module[];
};

export type CourseCard = Omit<Course, "modules"> & {
	moduleCount: number;
	lessonCount: number;
	durationSeconds: number;
};

export type CourseProgress = {
	courseSlug: string;
	completedLessons: number;
	totalLessons: number;
	percent: number;
};

type RawCourseCard = {
	id: string;
	slug: string;
	title: string;
	description: string;
	status: CourseStatus;
	sort_order: number;
	module_count: number;
	lesson_count: number;
	duration_seconds: number;
};

type RawCourse = {
	id: string;
	slug: string;
	title: string;
	description: string;
	status: CourseStatus;
	sort_order: number;
	progress?: number;
	modules: RawModule[];
};

type RawModule = {
	id: string;
	title: string;
	sort_order: number;
	lessons: RawLesson[];
};

type RawLesson = {
	id: string;
	title: string;
	youtube_embed_url: string;
	duration_seconds: number;
	sort_order: number;
	lesson_sequence: RawLessonSequencePoint[];
	status?: LessonStatus;
};

type RawLessonSequencePoint = {
	id: string;
	lesson_id: string;
	title: string;
	description: string;
	timestamp_seconds: number;
	sort_order: number;
};

type RawCourseProgress = {
	course_slug: string;
	completed_lessons: number;
	total_lessons: number;
	percent: number;
};

function mapPoint(point: RawLessonSequencePoint): LessonSequencePoint {
	return {
		id: point.id,
		lessonId: point.lesson_id,
		title: point.title,
		description: point.description,
		timestampSeconds: point.timestamp_seconds,
		sortOrder: point.sort_order,
	};
}

function mapLesson(lesson: RawLesson): Lesson {
	return {
		id: lesson.id,
		title: lesson.title,
		youtubeEmbedUrl: lesson.youtube_embed_url,
		durationSeconds: lesson.duration_seconds,
		sortOrder: lesson.sort_order,
		lessonSequence: (lesson.lesson_sequence ?? []).map(mapPoint),
		status: lesson.status ?? "not_started",
	};
}

function mapModule(module: RawModule): Module {
	return {
		id: module.id,
		title: module.title,
		sortOrder: module.sort_order,
		lessons: (module.lessons ?? []).map(mapLesson),
	};
}

function mapCourse(course: RawCourse): Course {
	return {
		id: course.id,
		slug: course.slug,
		title: course.title,
		description: course.description,
		status: course.status,
		sortOrder: course.sort_order,
		progress: course.progress ?? 0,
		modules: (course.modules ?? []).map(mapModule),
	};
}

function mapCourseCard(course: RawCourseCard): CourseCard {
	return {
		id: course.id,
		slug: course.slug,
		title: course.title,
		description: course.description,
		status: course.status,
		sortOrder: course.sort_order,
		progress: 0,
		moduleCount: course.module_count,
		lessonCount: course.lesson_count,
		durationSeconds: course.duration_seconds,
	};
}

function mapProgress(progress: RawCourseProgress): CourseProgress {
	return {
		courseSlug: progress.course_slug,
		completedLessons: progress.completed_lessons,
		totalLessons: progress.total_lessons,
		percent: progress.percent,
	};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${backendURL}${path}`, {
		credentials: "include",
		...init,
		headers: {
			...(init?.body ? { "Content-Type": "application/json" } : {}),
			...init?.headers,
		},
	});
	const payload = await response.json().catch(() => null);

	if (!response.ok) {
		throw new Error(getApiError(payload, "Backend request failed."));
	}

	return payload as T;
}

export async function listCourses(): Promise<CourseCard[]> {
	const payload = await apiFetch<RawCourseCard[]>("/api/v1/courses");
	return payload.map(mapCourseCard);
}

export async function getCourse(slug: string): Promise<Course> {
	const payload = await apiFetch<RawCourse>(`/api/v1/courses/${slug}`);
	return mapCourse(payload);
}

export async function getCourseProgress(slug: string): Promise<CourseProgress> {
	const payload = await apiFetch<RawCourseProgress>(
		`/api/v1/courses/${slug}/progress`,
	);
	return mapProgress(payload);
}

export async function updateLessonProgress(input: {
	lessonId: string;
	status?: LessonStatus;
}): Promise<{ status: LessonStatus }> {
	return apiFetch(`/api/v1/lessons/${input.lessonId}/progress`, {
		method: "POST",
		body: JSON.stringify({ status: input.status }),
	});
}

export async function listAdminCourses(): Promise<CourseCard[]> {
	const payload = await apiFetch<RawCourseCard[]>("/api/v1/admin/courses");
	return payload.map(mapCourseCard);
}

export async function createAdminCourse(input: {
	slug: string;
	title: string;
	description: string;
	status: CourseStatus;
	sortOrder?: number;
}): Promise<CourseCard> {
	const payload = await apiFetch<RawCourseCard>("/api/v1/admin/courses", {
		method: "POST",
		body: JSON.stringify({
			slug: input.slug,
			title: input.title,
			description: input.description,
			status: input.status,
			sort_order: input.sortOrder,
		}),
	});
	return mapCourseCard(payload);
}

export async function updateAdminCourse(input: {
	id: string;
	title?: string;
	description?: string;
	status?: CourseStatus;
	sortOrder?: number;
}): Promise<CourseCard> {
	const payload = await apiFetch<RawCourseCard>(
		`/api/v1/admin/courses/${input.id}`,
		{
			method: "PATCH",
			body: JSON.stringify({
				title: input.title,
				description: input.description,
				status: input.status,
				sort_order: input.sortOrder,
			}),
		},
	);
	return mapCourseCard(payload);
}

export async function createAdminModule(input: {
	courseId: string;
	title: string;
	sortOrder?: number;
}): Promise<Module> {
	const payload = await apiFetch<{
		id: string;
		title: string;
		sort_order: number;
	}>(`/api/v1/admin/courses/${input.courseId}/modules`, {
		method: "POST",
		body: JSON.stringify({ title: input.title, sort_order: input.sortOrder }),
	});
	return {
		id: payload.id,
		title: payload.title,
		sortOrder: payload.sort_order,
		lessons: [],
	};
}

export async function createAdminLesson(input: {
	moduleId: string;
	title: string;
	youtubeEmbedUrl: string;
	durationSeconds: number;
	sortOrder?: number;
	lessonSequence?: Array<{
		title: string;
		description?: string;
		timestampSeconds: number;
		sortOrder?: number;
	}>;
}): Promise<Lesson> {
	const payload = await apiFetch<RawLesson>(
		`/api/v1/admin/modules/${input.moduleId}/lessons`,
		{
			method: "POST",
			body: JSON.stringify({
				title: input.title,
				youtube_embed_url: input.youtubeEmbedUrl,
				duration_seconds: input.durationSeconds,
				sort_order: input.sortOrder,
				lesson_sequence: input.lessonSequence?.map((point) => ({
					title: point.title,
					description: point.description ?? "",
					timestamp_seconds: point.timestampSeconds,
					sort_order: point.sortOrder,
				})),
			}),
		},
	);
	return mapLesson(payload);
}

export async function deleteAdminCourse(id: string): Promise<void> {
	await apiFetch<null>(`/api/v1/admin/courses/${id}`, { method: "DELETE" });
}

export async function deleteAdminModule(id: string): Promise<void> {
	await apiFetch<null>(`/api/v1/admin/modules/${id}`, { method: "DELETE" });
}

export async function deleteAdminLesson(id: string): Promise<void> {
	await apiFetch<null>(`/api/v1/admin/lessons/${id}`, { method: "DELETE" });
}

export async function deleteAdminSequencePoint(id: string): Promise<void> {
	await apiFetch<null>(`/api/v1/admin/sequence/${id}`, { method: "DELETE" });
}

export async function replaceAdminLessonSequence(input: {
	lessonId: string;
	points: Array<{
		title: string;
		description?: string;
		timestampSeconds: number;
		sortOrder?: number;
	}>;
}): Promise<LessonSequencePoint[]> {
	const payload = await apiFetch<RawLessonSequencePoint[]>(
		`/api/v1/admin/lessons/${input.lessonId}/sequence`,
		{
			method: "PUT",
			body: JSON.stringify({
				points: input.points.map((point) => ({
					title: point.title,
					description: point.description ?? "",
					timestamp_seconds: point.timestampSeconds,
					sort_order: point.sortOrder,
				})),
			}),
		},
	);
	return payload.map(mapPoint);
}
