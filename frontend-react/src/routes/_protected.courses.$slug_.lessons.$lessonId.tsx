import {
	RiArrowLeftLine,
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
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import { Progress } from "#/components/ui/progress.tsx";
import { formatDuration, getCourse, getLesson } from "#/lib/lms-data.ts";

export const Route = createFileRoute(
	"/_protected/courses/$slug_/lessons/$lessonId",
)({
	component: LessonView,
});

function LessonView() {
	const { slug, lessonId } = Route.useParams();
	const course = getCourse(slug);
	const lesson = getLesson(slug, lessonId);

	return (
		<LmsShell
			eyebrow="Lesson player"
			title={lesson.title}
			description="Watch the lesson, keep one practical takeaway in view, and update your progress when the idea is clear enough to reuse."
		>
			<div className="grid gap-5 lg:grid-cols-[1fr_340px]">
				<section className="flex flex-col gap-4">
					<div className="overflow-hidden rounded-xl border border-white/20 bg-black shadow-[0_0_40px_rgba(255,186,90,0.06)]">
						<iframe
							title={lesson.title}
							src={lesson.youtubeEmbedUrl}
							className="aspect-video w-full"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							allowFullScreen
							referrerPolicy="strict-origin-when-cross-origin"
						/>
					</div>

					<Card className="border-white/15 bg-background/85">
						<CardHeader>
							<CardTitle className="font-display text-3xl tracking-tighter text-white">
								Progress controls
							</CardTitle>
							<CardDescription>
								{formatDuration(lesson.durationSeconds)} ·{" "}
								{lesson.status.replace("_", " ")}
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 md:grid-cols-3">
							<Button variant="outline">
								<RiPlayCircleLine aria-hidden="true" data-icon="inline-start" />{" "}
								In progress
							</Button>
							<Button>
								<RiCheckboxCircleLine
									aria-hidden="true"
									data-icon="inline-start"
								/>{" "}
								Mark complete
							</Button>
							<Button variant="ghost" asChild>
								<Link to="/courses/$slug" params={{ slug: course.slug }}>
									<RiArrowLeftLine
										aria-hidden="true"
										data-icon="inline-start"
									/>{" "}
									Course outline
								</Link>
							</Button>
						</CardContent>
					</Card>
				</section>

				<aside className="flex flex-col gap-4">
					<Card className="border-amber/20 bg-background/85 shadow-[inset_0_0_24px_rgba(255,186,90,0.06)]">
						<CardHeader>
							<CardTitle className="font-display text-3xl tracking-tighter text-white">
								{course.progress}%
							</CardTitle>
							<CardDescription>Course completion</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<Progress value={course.progress} />
							<div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-muted-foreground">
								Current lesson:{" "}
								<span className="text-white">{lesson.title}</span>
							</div>
						</CardContent>
					</Card>

					<Card className="border-white/15 bg-background/85">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.16em] text-muted-foreground">
								<RiPlayList2Line aria-hidden="true" className="size-4" />
								Lesson sequence
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-3">
							{course.modules
								.flatMap((module) => module.lessons)
								.map((item) => {
									const isCurrent = item.id === lesson.id;

									return (
										<Link
											key={item.id}
											to="/courses/$slug/lessons/$lessonId"
											params={{ slug: course.slug, lessonId: item.id }}
											className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3 no-underline hover:border-amber/25 data-[current=true]:border-amber/30 data-[current=true]:shadow-[inset_0_0_18px_rgba(255,186,90,0.05)]"
											data-current={isCurrent}
										>
											<span className="flex items-center gap-2 text-sm text-white">
												{item.status === "completed" ? (
													<RiCheckboxCircleLine
														className="size-4 text-amber"
														aria-hidden="true"
													/>
												) : isCurrent ? (
													<RiPlayCircleLine
														className="size-4 text-amber"
														aria-hidden="true"
													/>
												) : (
													<RiCircleLine
														className="size-4 text-muted-foreground"
														aria-hidden="true"
													/>
												)}
												{item.title}
											</span>
											<Badge variant="outline">
												{formatDuration(item.durationSeconds)}
											</Badge>
										</Link>
									);
								})}
						</CardContent>
					</Card>
				</aside>
			</div>
		</LmsShell>
	);
}
