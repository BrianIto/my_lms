import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	CheckCircle2,
	Circle,
	CirclePlay,
	ShieldCheck,
} from "lucide-react";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import { Progress } from "#/components/ui/progress.tsx";
import { LmsShell } from "#/components/lms-shell.tsx";
import { formatDuration, getCourse, getLesson } from "#/lib/lms-data.ts";

export const Route = createFileRoute("/courses/$slug/lessons/$lessonId")({
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
			description="The player keeps the course payload static and cacheable. Completion writes are idempotent per user and lesson."
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
								{formatDuration(lesson.durationSeconds)} · current state:{" "}
								{lesson.status.replace("_", " ")}
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 md:grid-cols-3">
							<Button variant="outline">
								<CirclePlay data-icon="inline-start" /> In progress
							</Button>
							<Button>
								<CheckCircle2 data-icon="inline-start" /> Mark complete
							</Button>
							<Button variant="ghost" asChild>
								<Link to="/courses/$slug" params={{ slug: course.slug }}>
									<ArrowLeft data-icon="inline-start" /> Course outline
								</Link>
							</Button>
						</CardContent>
						<CardFooter className="border-t border-white/10 text-sm text-muted-foreground">
							Backend endpoint planned: `POST /api/v1/lessons/{lesson.id}
							/progress`.
						</CardFooter>
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
						<CardContent>
							<Progress value={course.progress} />
						</CardContent>
					</Card>

					<Card className="border-white/15 bg-background/85">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.16em] text-muted-foreground">
								<ShieldCheck aria-hidden="true" />
								Lesson list
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-3">
							{course.modules
								.flatMap((module) => module.lessons)
								.map((item) => (
									<Link
										key={item.id}
										to="/courses/$slug/lessons/$lessonId"
										params={{ slug: course.slug, lessonId: item.id }}
										className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3 no-underline hover:border-amber/25"
									>
										<span className="flex items-center gap-2 text-sm text-white">
											{item.status === "completed" ? (
												<CheckCircle2
													className="text-amber"
													aria-hidden="true"
												/>
											) : (
												<Circle
													className="text-muted-foreground"
													aria-hidden="true"
												/>
											)}
											{item.title}
										</span>
										<Badge variant="outline">
											{formatDuration(item.durationSeconds)}
										</Badge>
									</Link>
								))}
						</CardContent>
					</Card>
				</aside>
			</div>
		</LmsShell>
	);
}
