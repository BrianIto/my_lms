import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	CheckCircle2,
	CirclePlay,
	LockKeyhole,
	Timer,
} from "lucide-react";
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
import { LmsShell } from "#/components/lms-shell.tsx";
import { countLessons, courses } from "#/lib/lms-data.ts";

export const Route = createFileRoute("/dashboard")({
	component: DashboardView,
});

function DashboardView() {
	return (
		<LmsShell
			eyebrow="User dashboard"
			title="Your course progress, reduced to the next useful lesson."
			description="Private beta students see cached course structure immediately while their own progress is loaded separately and updated lesson-by-lesson."
		>
			<div className="grid gap-5 lg:grid-cols-[1fr_340px]">
				<section className="grid gap-4">
					{courses.map((course) => (
						<Card
							key={course.id}
							className="group border-white/15 bg-background/85 duration-200 hover:shadow-[0_0_18px_rgba(255,255,255,0.08)]"
						>
							<CardHeader>
								<CardTitle className="font-display text-4xl tracking-tighter text-white">
									{course.title}
								</CardTitle>
								<CardDescription className="max-w-[720px] leading-6">
									{course.description}
								</CardDescription>
								<CardAction>
									<Badge
										variant={course.status === "draft" ? "outline" : "default"}
									>
										{course.status}
									</Badge>
								</CardAction>
							</CardHeader>
							<CardContent className="flex flex-col gap-4">
								<div className="grid gap-3 md:grid-cols-3">
									<MiniStat
										icon={CirclePlay}
										label="Lessons"
										value={`${countLessons(course)} videos`}
									/>
									<MiniStat
										icon={Timer}
										label="Progress"
										value={`${course.progress}%`}
									/>
									<MiniStat
										icon={CheckCircle2}
										label="Knowledge"
										value="video completion"
									/>
								</div>
								<Progress value={course.progress} />
							</CardContent>
							<CardFooter className="justify-between border-t border-white/10">
								<span className="text-sm text-muted-foreground">
									Static content cache key: `courses:detail:{course.id}:v1`
								</span>
								<Button asChild>
									<Link to="/courses/$slug" params={{ slug: course.slug }}>
										Continue <ArrowRight data-icon="inline-end" />
									</Link>
								</Button>
							</CardFooter>
						</Card>
					))}
				</section>

				<aside className="flex flex-col gap-4">
					<Card className="border-amber/20 bg-background/85 shadow-[inset_0_0_24px_rgba(255,186,90,0.06)]">
						<CardHeader>
							<CardTitle className="font-display text-3xl tracking-tighter text-white">
								Beta access active
							</CardTitle>
							<CardDescription>
								Authenticated through Better Auth and allowlisted for the course
								beta.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
							<p>
								Google sign-in is available, but access remains controlled by
								the backend beta guard.
							</p>
							<div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-white">
								brian@example.com
							</div>
						</CardContent>
					</Card>

					<Card className="border-white/15 bg-background/85">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.16em] text-muted-foreground">
								<LockKeyhole aria-hidden="true" />
								Access model
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
							<p>Public preview: marketing/course metadata.</p>
							<p>Private lessons: session + beta allowlist.</p>
							<p>Progress: per-user, never stored in global course cache.</p>
						</CardContent>
					</Card>
				</aside>
			</div>
		</LmsShell>
	);
}

function MiniStat({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof CirclePlay;
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
			<div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
				<Icon aria-hidden="true" />
				{label}
			</div>
			<p className="mt-3 text-sm font-medium text-white">{value}</p>
		</div>
	);
}
