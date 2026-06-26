import {
	RiArrowRightLine,
	RiCheckboxCircleLine,
	RiCircleLine,
	RiPlayCircleLine,
	RiPlayList2Line,
} from "@remixicon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LmsShell } from "#/components/lms-shell.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import { Progress } from "#/components/ui/progress.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import { countLessons, formatDuration, getCourse } from "#/lib/lms-data.ts";

export const Route = createFileRoute("/_protected/courses/$slug")({
	component: CourseView,
});

function CourseView() {
	const { slug } = Route.useParams();
	const course = getCourse(slug);
	const firstLesson = course.modules[0]?.lessons[0];
	const nextLesson =
		course.modules
			.flatMap((module) => module.lessons)
			.find((lesson) => lesson.status !== "completed") ?? firstLesson;

	return (
		<LmsShell
			eyebrow="Course outline"
			title={course.title}
			description={`${course.description} Move through the modules in order, then return to the outline whenever you need a clean map of the work.`}
		>
			<div className="grid gap-5 lg:grid-cols-[1fr_330px]">
				<section className="flex flex-col gap-4">
					{course.modules.map((module, moduleIndex) => (
						<Card
							key={module.id}
							className="rise-in border-white/15 bg-background/85 duration-200 hover:border-white/25"
						>
							<CardHeader>
								<CardTitle className="font-display text-3xl tracking-tighter text-white">
									{module.title}
								</CardTitle>
								<CardDescription>
									Module {moduleIndex + 1} · {module.lessons.length} focused
									lessons
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-3">
								{module.lessons.map((lesson) => (
									<Link
										key={lesson.id}
										to="/courses/$slug/lessons/$lessonId"
										params={{ slug: course.slug, lessonId: lesson.id }}
										className="group grid gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4 no-underline duration-200 hover:border-amber/25 hover:shadow-[0_0_16px_rgba(255,186,90,0.05)] md:grid-cols-[1fr_auto] md:items-center"
									>
										<div className="flex items-center gap-3">
											{lesson.status === "completed" ? (
												<RiCheckboxCircleLine
													className="size-5 text-amber"
													aria-hidden="true"
												/>
											) : lesson.status === "in_progress" ? (
												<RiPlayCircleLine
													className="size-5 text-amber"
													aria-hidden="true"
												/>
											) : (
												<RiCircleLine
													className="size-5 text-muted-foreground"
													aria-hidden="true"
												/>
											)}
											<div className="flex flex-col gap-1">
												<span className="font-medium text-white group-hover:text-amber">
													{lesson.title}
												</span>
												<span className="text-sm text-muted-foreground">
													{formatDuration(lesson.durationSeconds)} ·{" "}
													{lesson.status.replace("_", " ")}
												</span>
											</div>
										</div>
										<Badge variant="outline">Open lesson</Badge>
									</Link>
								))}
							</CardContent>
						</Card>
					))}
				</section>

				<aside className="flex flex-col gap-4">
					<Card className="border-amber/20 bg-background/85 shadow-[inset_0_0_24px_rgba(255,186,90,0.06)]">
						<CardHeader>
							<CardTitle className="font-display text-3xl tracking-tighter text-white">
								{course.progress}% complete
							</CardTitle>
							<CardDescription>
								A precise read on what you have already finished.
							</CardDescription>
							<CardAction>
								<Badge>{course.status}</Badge>
							</CardAction>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<Progress value={course.progress} />
							<div className="grid grid-cols-2 gap-3 text-sm">
								<div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
									<p className="text-muted-foreground">Lessons</p>
									<p className="text-xl text-white">{countLessons(course)}</p>
								</div>
								<div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
									<p className="text-muted-foreground">Modules</p>
									<p className="text-xl text-white">{course.modules.length}</p>
								</div>
							</div>
						</CardContent>
						<CardFooter className="border-t border-white/10">
							{nextLesson ? (
								<Button className="w-full" asChild>
									<Link
										to="/courses/$slug/lessons/$lessonId"
										params={{ slug: course.slug, lessonId: nextLesson.id }}
									>
										Continue lesson{" "}
										<RiArrowRightLine
											aria-hidden="true"
											data-icon="inline-end"
										/>
									</Link>
								</Button>
							) : null}
						</CardFooter>
					</Card>

					<Card className="border-white/15 bg-background/85">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.16em] text-muted-foreground">
								<RiPlayList2Line aria-hidden="true" className="size-4" />
								Course rhythm
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
							<p>Work module-by-module; each lesson is intentionally short.</p>
							<Separator />
							<p>Use the outline as your map, not a scoreboard.</p>
						</CardContent>
					</Card>
				</aside>
			</div>
		</LmsShell>
	);
}
