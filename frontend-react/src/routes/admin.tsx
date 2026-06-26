import {
	RiAddLine,
	type RiCheckboxCircleLine,
	RiDatabase2Line,
	RiEyeLine,
	RiFileCopyLine,
	RiFileVideoLine,
	RiUserLine,
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
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Progress } from "#/components/ui/progress.tsx";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { betaUsers, countLessons, courses } from "#/lib/lms-data.ts";

export const Route = createFileRoute("/admin")({ component: AdminView });

function AdminView() {
	const totalLessons = courses.reduce(
		(total, course) => total + countLessons(course),
		0,
	);
	const activeBetaUsers = betaUsers.filter(
		(user) => user.status === "active",
	).length;

	return (
		<LmsShell
			eyebrow="Admin control plane"
			title="Publish course material without touching the learning loop."
			description="The admin view starts with a seed-friendly course editor: validate YouTube embeds, set beta/published status, review cache keys, and manage the early beta allowlist."
		>
			<div className="grid gap-4 md:grid-cols-3">
				<MetricCard
					icon={RiFileVideoLine}
					label="Courses"
					value={String(courses.length)}
					detail={`${totalLessons} video lessons`}
				/>
				<MetricCard
					icon={RiUserLine}
					label="Beta users"
					value={String(activeBetaUsers)}
					detail="active allowlist entries"
				/>
				<MetricCard
					icon={RiDatabase2Line}
					label="Static cache"
					value="v1"
					detail="catalog/detail keys ready"
				/>
			</div>

			<div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
				<Card className="border-white/15 bg-background/85 shadow-[inset_0_0_24px_rgba(255,186,90,0.03)]">
					<CardHeader>
						<CardTitle className="font-display text-3xl tracking-tighter text-white">
							Course authoring
						</CardTitle>
						<CardDescription>
							Add the first YouTube-based course using the planned normalized
							shape.
						</CardDescription>
						<CardAction>
							<Badge variant="outline" className="border-amber/30 text-amber">
								draft safe
							</Badge>
						</CardAction>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="flex flex-col gap-2">
								<Label htmlFor="course-title">Course title</Label>
								<Input id="course-title" defaultValue="Building with AI" />
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="course-slug">Slug</Label>
								<Input id="course-slug" defaultValue="building-with-ai" />
							</div>
							<div className="flex flex-col gap-2 md:col-span-2">
								<Label htmlFor="course-description">Description</Label>
								<Textarea
									id="course-description"
									defaultValue="A practical course for shipping AI products."
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label>Status</Label>
								<Select defaultValue="beta">
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="draft">Draft</SelectItem>
											<SelectItem value="beta">Beta</SelectItem>
											<SelectItem value="published">Published</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="lesson-url">YouTube embed URL</Label>
								<Input
									id="lesson-url"
									defaultValue="https://www.youtube.com/embed/VIDEO_ID"
								/>
							</div>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col gap-3 border-t border-white/10 md:flex-row md:justify-between">
						<p className="text-sm text-muted-foreground">
							Next backend step: persist normalized records and invalidate
							`courses:*:v1`.
						</p>
						<div className="flex gap-2">
							<Button variant="outline">
								<RiEyeLine aria-hidden="true" data-icon="inline-start" />{" "}
								Preview
							</Button>
							<Button>
								<RiAddLine aria-hidden="true" data-icon="inline-start" /> Save
								course
							</Button>
						</div>
					</CardFooter>
				</Card>

				<Card className="border-white/15 bg-background/85">
					<CardHeader>
						<CardTitle className="font-display text-3xl tracking-tighter text-white">
							Beta allowlist
						</CardTitle>
						<CardDescription>
							Google sign-in still resolves through server-side beta access.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<div className="flex gap-2">
							<Input placeholder="student@example.com" />
							<Button>
								<RiFileCopyLine aria-hidden="true" data-icon="inline-start" />{" "}
								Invite
							</Button>
						</div>
						<Separator />
						<div className="flex flex-col gap-3">
							{betaUsers.map((user) => (
								<div
									key={user.id}
									className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3"
								>
									<div className="flex flex-col gap-1">
										<span className="text-sm font-medium text-white">
											{user.email}
										</span>
										<span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
											{user.provider}
										</span>
									</div>
									<Badge
										variant={user.status === "active" ? "default" : "outline"}
									>
										{user.status}
									</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className="border-white/15 bg-background/85">
				<CardHeader>
					<CardTitle className="font-display text-3xl tracking-tighter text-white">
						Course inventory
					</CardTitle>
					<CardDescription>
						Static course data is safe to cache; progress stays per-user.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3">
					{courses.map((course) => (
						<div
							key={course.id}
							className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.02] p-4 md:grid-cols-[1fr_160px_160px] md:items-center"
						>
							<div className="flex flex-col gap-2">
								<div className="flex flex-wrap items-center gap-2">
									<h2 className="font-display text-2xl tracking-tighter text-white">
										{course.title}
									</h2>
									<Badge variant="outline" className="border-white/20">
										{course.status}
									</Badge>
								</div>
								<p className="max-w-[720px] text-sm leading-6 text-muted-foreground">
									{course.description}
								</p>
							</div>
							<div className="flex flex-col gap-2">
								<span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
									Lessons
								</span>
								<span className="text-sm text-white">
									{countLessons(course)} videos
								</span>
							</div>
							<Button variant="outline" asChild>
								<Link to="/courses/$slug" params={{ slug: course.slug }}>
									Open course
								</Link>
							</Button>
						</div>
					))}
				</CardContent>
			</Card>
		</LmsShell>
	);
}

function MetricCard({
	icon: Icon,
	label,
	value,
	detail,
}: {
	icon: typeof RiCheckboxCircleLine;
	label: string;
	value: string;
	detail: string;
}) {
	return (
		<Card className="border-white/15 bg-background/85">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.16em] text-muted-foreground">
					<Icon aria-hidden="true" className="size-4" />
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<span className="font-display text-5xl tracking-tighter text-white">
					{value}
				</span>
				<p className="text-sm text-muted-foreground">{detail}</p>
				<Progress value={label === "Static cache" ? 100 : 68} />
			</CardContent>
		</Card>
	);
}
