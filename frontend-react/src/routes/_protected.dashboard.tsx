import {
	RiArrowRightLine,
	RiCheckboxCircleLine,
	RiPlayCircleLine,
	RiTimeLine,
	RiWhatsappLine,
} from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
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
import { type CourseCard, listCourses } from "#/lib/backend-api.ts";
import { formatDuration } from "#/lib/lms-data.ts";
import { cn } from "#/utils/cn";

export const Route = createFileRoute("/_protected/dashboard")({
	component: DashboardView,
});

function DashboardView() {
	const coursesQuery = useQuery({
		queryKey: ["courses"],
		queryFn: listCourses,
		staleTime: 60 * 60 * 1000,
	});
	const courses = coursesQuery.data ?? [];
	const nextCourse = courses[0];

	return (
		<LmsShell
			eyebrow="Learning dashboard"
			title={
				<>
					<span className="text-white/50 ">Your</span> learning cockpit
				</>
			}
			description="A calm cockpit for course progress, next videos, and study momentum — focused on what to watch, review, and complete next."
		>
			<div className="grid items-start lg:grid-cols-[1fr_340px]">
				<section className="grid grid-cols-1">
					{coursesQuery.isLoading ? (
						<CourseSkeleton />
					) : coursesQuery.isError ? (
						<EmptyCourseCard message="Could not load the course catalog. Confirm the Go backend is running on VITE_BACKEND_URL." />
					) : courses.length === 0 ? (
						<EmptyCourseCard message="No published or beta courses are visible yet." />
					) : (
						courses.map((course) => (
							<CourseCardItem key={course.id} course={course} />
						))
					)}

					<Card className="rise-in border-white/15 bg-white/10 border-0 border-l first-of-type:border-t border-r border-b lg:border-r-0 duration-200 hover:border-white/25 hover:shadow-[0_0_18px_rgba(255,255,255,0.08)]">
						<CardHeader>
							<CardTitle className="font-display text-4xl tracking-tighter text-white">
								Want more courses?
							</CardTitle>
							<CardDescription className="max-w-[720px] leading-6">
								We are always trying to deliver the best experience to students.
							</CardDescription>
						</CardHeader>
						<CardFooter className="justify-between border-t -mt-1 border-white/10">
							<span className="text-sm text-muted-foreground">
								You can always ask for new content contact me by the button.
							</span>

							<Button asChild variant="outline">
								<a
									href="https://wa.me/5592984374357"
									target="_blank"
									rel="noopener noreferrer"
								>
									Send a WhatsApp{" "}
									<RiWhatsappLine aria-hidden="true" data-icon="inline-end" />
								</a>
							</Button>
						</CardFooter>
					</Card>
				</section>

				<aside className="flex flex-col ">
					<Card className="border-amber/20 bg-background/85 shadow-[inset_0_0_24px_rgba(255,186,90,0.06)]">
						<CardHeader>
							<CardTitle className="font-display text-3xl tracking-tighter text-white">
								Next study block
							</CardTitle>
							<CardDescription>
								Resume with the nearest available course and keep the session
								small.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
							<div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
								<p className="text-xs uppercase tracking-[0.16em] text-amber">
									Up next
								</p>
								<p className="mt-2 font-medium text-white">
									{nextCourse?.title ?? "Course outline"}
								</p>
								<p className="mt-1 text-muted-foreground">
									{nextCourse
										? formatDuration(nextCourse.durationSeconds)
										: "Review the full course map."}
								</p>
							</div>
							{nextCourse ? (
								<Button className="w-full mt-1.25" asChild>
									<Link to="/courses/$slug" params={{ slug: nextCourse.slug }}>
										Open course{" "}
										<RiArrowRightLine
											aria-hidden="true"
											data-icon="inline-end"
										/>
									</Link>
								</Button>
							) : null}
						</CardContent>
					</Card>

					<Card
						className={cn(
							"border-white/15 bg-background/85 border-0 border-b border-r",
						)}
					>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.16em] text-muted-foreground">
								<RiCheckboxCircleLine aria-hidden="true" className="size-4" />
								Study rhythm
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
							<p>1. Watch one lesson with a concrete question in mind.</p>
							<p>2. Capture the tactic you can reuse this week.</p>
							<p>3. Mark it complete, then choose the next small block.</p>
						</CardContent>
					</Card>
				</aside>
			</div>
		</LmsShell>
	);
}

function CourseCardItem({ course }: { course: CourseCard }) {
	return (
		<Card className="rise-in border-white/15 bg-background/85 border-0 border-l first-of-type:border-t border-r first-of-type:border-r-0 border-b duration-200 hover:border-white/25 hover:shadow-[0_0_18px_rgba(255,255,255,0.08)]">
			<CardHeader>
				<CardTitle className="font-display text-4xl tracking-tighter text-white">
					{course.title}
				</CardTitle>
				<CardDescription className="max-w-[720px] leading-6">
					{course.description}
				</CardDescription>
				<CardAction>
					<Badge variant={course.status === "draft" ? "outline" : "default"}>
						{course.status}
					</Badge>
				</CardAction>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="grid gap-3 md:grid-cols-3">
					<MiniStat
						icon={RiPlayCircleLine}
						label="Lessons"
						value={`${course.lessonCount} videos`}
					/>
					<MiniStat
						icon={RiTimeLine}
						label="Duration"
						value={formatDuration(course.durationSeconds)}
					/>
					<MiniStat
						icon={RiCheckboxCircleLine}
						label="Progress"
						value={`${course.progress ?? 0}% complete`}
					/>
				</div>
				<Progress value={course.progress ?? 0} />
			</CardContent>
			<CardFooter className="justify-between border-t border-white/10">
				<span className="text-sm text-muted-foreground">
					Next: open the outline and continue the sequence.
				</span>
				<Button asChild>
					<Link to="/courses/$slug" params={{ slug: course.slug }}>
						Continue{" "}
						<RiArrowRightLine aria-hidden="true" data-icon="inline-end" />
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}

function CourseSkeleton() {
	return (
		<Card className="rise-in border-white/15 bg-background/85 border-0 border-l border-r border-b">
			<CardHeader>
				<CardTitle className="font-display text-4xl tracking-tighter text-white/70">
					Loading catalog…
				</CardTitle>
				<CardDescription>
					Fetching static course cards from the backend cache.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-3 md:grid-cols-3">
				<MiniStat icon={RiPlayCircleLine} label="Lessons" value="—" />
				<MiniStat icon={RiTimeLine} label="Duration" value="—" />
				<MiniStat icon={RiCheckboxCircleLine} label="Progress" value="—" />
			</CardContent>
		</Card>
	);
}

function EmptyCourseCard({ message }: { message: string }) {
	return (
		<Card className="rise-in border-white/15 bg-background/85 border-0 border-l border-r border-b">
			<CardHeader>
				<CardTitle className="font-display text-4xl tracking-tighter text-white">
					Course signal empty
				</CardTitle>
				<CardDescription>{message}</CardDescription>
			</CardHeader>
		</Card>
	);
}

function MiniStat({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof RiPlayCircleLine;
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
			<div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
				<Icon aria-hidden="true" className="size-4" />
				{label}
			</div>
			<p className="mt-3 text-sm font-medium text-white">{value}</p>
		</div>
	);
}
