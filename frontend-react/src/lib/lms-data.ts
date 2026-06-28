import type {
	Course,
	CourseCard,
	CourseProgress,
	Lesson,
} from "#/lib/backend-api.ts";

export type {
	Course,
	CourseCard,
	Lesson,
	LessonStatus,
	Module,
} from "#/lib/backend-api.ts";

export function formatDuration(seconds: number) {
	const minutes = Math.round(seconds / 60);
	return `${minutes} min`;
}

export function formatTimestamp(seconds: number) {
	const wholeSeconds = Math.max(0, Math.floor(seconds));
	const minutes = Math.floor(wholeSeconds / 60);
	const remainingSeconds = wholeSeconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function countLessons(course: Pick<Course, "modules">) {
	return course.modules.reduce(
		(total, module) => total + module.lessons.length,
		0,
	);
}

export function countCardLessons(course: Pick<CourseCard, "lessonCount">) {
	return course.lessonCount;
}

export function findLesson(
	course: Course,
	lessonId: string,
): Lesson | undefined {
	return course.modules
		.flatMap((module) => module.lessons)
		.find((lesson) => lesson.id === lessonId);
}

export function getFirstLesson(course: Course): Lesson | undefined {
	return course.modules[0]?.lessons[0];
}

export function mergeCourseProgress(
	course: Course,
	progress: CourseProgress | undefined,
): Course {
	if (!progress) {
		return course;
	}
	const statusByLesson = new Map(
		progress.lessons.map((lesson) => [lesson.lessonId, lesson.status]),
	);
	return {
		...course,
		progress: progress.percent,
		modules: course.modules.map((module) => ({
			...module,
			lessons: module.lessons.map((lesson) => ({
				...lesson,
				status: statusByLesson.get(lesson.id) ?? "not_started",
			})),
		})),
	};
}

export function getNextLesson(course: Course): Lesson | undefined {
	return (
		course.modules
			.flatMap((module) => module.lessons)
			.find((lesson) => lesson.status !== "completed") ?? getFirstLesson(course)
	);
}
