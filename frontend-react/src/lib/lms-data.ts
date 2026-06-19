export type CourseStatus = "draft" | "beta" | "published";
export type LessonStatus = "not_started" | "in_progress" | "completed";

export type Lesson = {
	id: string;
	title: string;
	youtubeEmbedUrl: string;
	durationSeconds: number;
	status: LessonStatus;
};

export type Module = {
	id: string;
	title: string;
	lessons: Lesson[];
};

export type Course = {
	id: string;
	slug: string;
	title: string;
	description: string;
	status: CourseStatus;
	progress: number;
	modules: Module[];
};

export type BetaUser = {
	id: string;
	email: string;
	status: "invited" | "active" | "revoked";
	provider: "email" | "google";
};

export const courses: Course[] = [
	{
		id: "course_ai_products",
		slug: "building-with-ai",
		title: "Building with AI",
		description:
			"A precise course on turning model capabilities into durable product workflows, shipped in small useful increments.",
		status: "beta",
		progress: 42,
		modules: [
			{
				id: "mod_01",
				title: "Orientation",
				lessons: [
					{
						id: "lesson_welcome",
						title: "Welcome and operating principles",
						youtubeEmbedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
						durationSeconds: 420,
						status: "completed",
					},
					{
						id: "lesson_stack",
						title: "Course stack and project constraints",
						youtubeEmbedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
						durationSeconds: 690,
						status: "completed",
					},
				],
			},
			{
				id: "mod_02",
				title: "Designing the learning loop",
				lessons: [
					{
						id: "lesson_loop",
						title: "From passive video to tracked knowledge",
						youtubeEmbedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
						durationSeconds: 840,
						status: "in_progress",
					},
					{
						id: "lesson_cache",
						title: "Caching static content without leaking progress",
						youtubeEmbedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
						durationSeconds: 780,
						status: "not_started",
					},
				],
			},
		],
	},
	{
		id: "course_agents",
		slug: "agentic-systems",
		title: "Agentic Systems in Production",
		description:
			"Build agents with disciplined boundaries: tools, traces, cache, evaluation, and operator control.",
		status: "draft",
		progress: 0,
		modules: [
			{
				id: "mod_agents_01",
				title: "Foundations",
				lessons: [
					{
						id: "lesson_agents_intro",
						title: "What belongs in an agent loop",
						youtubeEmbedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
						durationSeconds: 510,
						status: "not_started",
					},
				],
			},
		],
	},
];

export const betaUsers: BetaUser[] = [
	{
		id: "usr_001",
		email: "brian@example.com",
		status: "active",
		provider: "google",
	},
	{
		id: "usr_002",
		email: "student@example.com",
		status: "invited",
		provider: "email",
	},
	{
		id: "usr_003",
		email: "paused@example.com",
		status: "revoked",
		provider: "google",
	},
];

export function getCourse(slug: string) {
	return courses.find((course) => course.slug === slug) ?? courses[0];
}

export function getLesson(slug: string, lessonId: string) {
	const course = getCourse(slug);
	const lessons = course.modules.flatMap((module) => module.lessons);
	return lessons.find((lesson) => lesson.id === lessonId) ?? lessons[0];
}

export function formatDuration(seconds: number) {
	const minutes = Math.round(seconds / 60);
	return `${minutes} min`;
}

export function countLessons(course: Course) {
	return course.modules.reduce(
		(total, module) => total + module.lessons.length,
		0,
	);
}
