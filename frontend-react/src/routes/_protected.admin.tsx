import {
	RiAddLine,
	RiArrowDownSLine,
	type RiCheckboxCircleLine,
	RiDatabase2Line,
	RiDeleteBin6Line,
	RiEditLine,
	RiFileCopyLine,
	RiFileList3Line,
	RiFileVideoLine,
	RiMore2Line,
	RiPlayList2Line,
	RiUserLine,
} from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LmsShell } from "#/components/lms-shell.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog.tsx";
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
import { getAuthStateQueryOptions } from "#/lib/auth-session.ts";
import {
	type BetaAllowlistEntry,
	type BetaAllowlistStatus,
	type Course,
	type CourseCard,
	type CourseStatus,
	createAdminCourse,
	createAdminLesson,
	createAdminModule,
	deleteAdminCourse,
	deleteAdminLesson,
	deleteAdminModule,
	deleteAdminSequencePoint,
	getCourse,
	listAdminCourses,
	listBetaAllowlist,
	replaceAdminLessonSequence,
	updateAdminCourse,
	upsertBetaAllowlistEntry,
} from "#/lib/backend-api.ts";
import { cn } from "#/utils/cn";

export const Route = createFileRoute("/_protected/admin")({
	beforeLoad: async ({ context }) => {
		const auth = await context.queryClient.ensureQueryData(
			getAuthStateQueryOptions(),
		);

		if (!auth.isAuthenticated) throw redirect({ to: "/" });
		if (!auth.isAdmin) throw redirect({ to: "/dashboard" });
	},
	component: AdminView,
});

function AdminView() {
	const [allowlistEntries, setAllowlistEntries] = useState<
		BetaAllowlistEntry[]
	>([]);
	const coursesQuery = useQuery({
		queryKey: ["admin", "courses"],
		queryFn: listAdminCourses,
		staleTime: 30 * 1000,
	});
	const courses = coursesQuery.data ?? [];
	const totalLessons = courses.reduce(
		(total, course) => total + course.lessonCount,
		0,
	);
	const activeAllowlistEntries = useMemo(
		() => allowlistEntries.filter((user) => user.status === "active").length,
		[allowlistEntries],
	);

	return (
		<LmsShell
			eyebrow="Admin control plane"
			title="Administrative Dashboard"
			description="Manage beta access and author the normalized course catalog with dialog-first CRUD flows."
		>
			<div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
				<MetricCard
					icon={RiFileVideoLine}
					label="Courses"
					value={String(courses.length)}
					detail={`${totalLessons} video lessons`}
				/>
				<MetricCard
					icon={RiUserLine}
					label="Beta users"
					value={String(activeAllowlistEntries)}
					detail="active allowlist entries"
				/>
				<MetricCard
					icon={RiDatabase2Line}
					label="Static cache"
					value="v1"
					detail="catalog/detail keys invalidated by writes"
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr] lg:gap-0">
				<CourseInventoryCard
					courses={courses}
					isLoading={coursesQuery.isLoading}
				/>
				<BetaAllowlistCard
					entries={allowlistEntries}
					onEntriesChange={setAllowlistEntries}
				/>
			</div>
		</LmsShell>
	);
}

function CourseInventoryCard({
	courses,
	isLoading,
}: {
	courses: CourseCard[];
	isLoading: boolean;
}) {
	return (
		<Card className="z-[2] border-white/15 bg-background shadow-[inset_0_0_24px_rgba(255,186,90,0.03)] lg:border-r-0">
			<CardHeader>
				<CardTitle className="font-display text-3xl tracking-tighter text-white">
					Course inventory
				</CardTitle>
				<CardDescription>
					Create courses, then add modules, lessons, and sequence bookmarks
					through focused dialogs.
				</CardDescription>
				<CardAction>
					<CourseDialog />
				</CardAction>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{isLoading ? (
					<p className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-muted-foreground">
						Loading courses…
					</p>
				) : null}
				{!isLoading && courses.length === 0 ? (
					<p className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-muted-foreground">
						No courses yet. Create the first draft course.
					</p>
				) : null}
				{courses.map((course) => (
					<AdminCourseRow key={course.id} course={course} />
				))}
			</CardContent>
		</Card>
	);
}

function AdminCourseRow({ course }: { course: CourseCard }) {
	const [openDetail, setOpenDetail] = useState(false);
	const [openMobileActions, setOpenMobileActions] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const outlineId = useId();
	const prefersReducedMotion = useReducedMotion();
	const detailQuery = useQuery({
		queryKey: ["courses", course.slug],
		queryFn: () => getCourse(course.slug),
		enabled: openDetail,
		staleTime: 60 * 1000,
	});

	useEffect(() => {
		if (!openMobileActions) return;

		function onPointerDown(event: PointerEvent) {
			if (!menuRef.current?.contains(event.target as Node)) {
				setOpenMobileActions(false);
			}
		}

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") setOpenMobileActions(false);
		}

		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [openMobileActions]);

	const outlineMotion = prefersReducedMotion
		? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
		: {
				initial: { opacity: 0, height: 0, y: -6 },
				animate: { opacity: 1, height: "auto", y: 0 },
				exit: { opacity: 0, height: 0, y: -6 },
			};
	const menuMotion = prefersReducedMotion
		? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
		: {
				initial: { opacity: 0, scale: 0.98, y: -4 },
				animate: { opacity: 1, scale: 1, y: 0 },
				exit: { opacity: 0, scale: 0.98, y: -4 },
			};

	return (
		<div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
			<div className="flex min-w-0 gap-2 md:gap-4">
				<div className="hidden shrink-0 flex-col gap-1 md:flex">
					<Button
						variant="ghost"
						size="icon-xs"
						aria-label={
							openDetail
								? `Hide ${course.title} outline`
								: `Show ${course.title} outline`
						}
						aria-expanded={openDetail}
						aria-controls={outlineId}
						title={openDetail ? "Hide outline" : "Show outline"}
						onClick={() => setOpenDetail((value) => !value)}
					>
						<RiArrowDownSLine
							aria-hidden="true"
							className={cn("size-4 duration-200", {
								"rotate-180": openDetail,
							})}
							data-icon="inline-start"
						/>
					</Button>
					<CourseDialog course={course} triggerMode="icon" />
					<ModuleDialog course={course} triggerMode="icon" />
					<DeleteCourseDialog course={course} triggerMode="icon" />
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex min-w-0 items-start gap-2 md:items-center">
						<Button
							variant="ghost"
							size="icon-xs"
							className="mt-1 md:hidden"
							aria-label={
								openDetail
									? `Hide ${course.title} outline`
									: `Show ${course.title} outline`
							}
							aria-expanded={openDetail}
							aria-controls={outlineId}
							title={openDetail ? "Hide outline" : "Show outline"}
							onClick={() => setOpenDetail((value) => !value)}
						>
							<RiPlayList2Line aria-hidden="true" data-icon="inline-start" />
						</Button>
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<h2 className="break-words font-display text-[1.55rem] leading-none tracking-tighter text-white sm:text-2xl">
									{course.title}
								</h2>
								<Badge variant="outline" className="border-white/20">
									{course.status}
								</Badge>
							</div>
							<p className="mt-2 max-w-[720px] break-words text-sm leading-6 text-muted-foreground">
								{course.description}
							</p>
							<div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
								<span>
									{course.moduleCount} modules · {course.lessonCount} lessons
								</span>
								<Button
									variant="ghost"
									size="xs"
									className="hidden tracking-normal md:inline-flex"
									asChild
								>
									<Link to="/courses/$slug" params={{ slug: course.slug }}>
										Open
									</Link>
								</Button>
							</div>
						</div>

						<div className="relative md:hidden" ref={menuRef}>
							<Button
								variant="ghost"
								size="icon-xs"
								aria-label={`Open ${course.title} actions`}
								aria-haspopup="menu"
								aria-expanded={openMobileActions}
								title="Course actions"
								onClick={() => setOpenMobileActions((value) => !value)}
							>
								<RiMore2Line aria-hidden="true" data-icon="inline-start" />
							</Button>
							<AnimatePresence>
								{openMobileActions ? (
									<motion.div
										{...menuMotion}
										transition={{ duration: 0.16, ease: "easeOut" }}
										role="menu"
										className="absolute right-0 top-8 z-20 flex w-40 origin-top-right flex-col gap-1 rounded-xl border border-white/15 bg-background/95 p-1.5 shadow-[0_16px_44px_rgba(0,0,0,0.45)] backdrop-blur"
									>
										<CourseDialog
											course={course}
											triggerMode="menu"
											onClose={() => setOpenMobileActions(false)}
										/>
										<ModuleDialog
											course={course}
											triggerMode="menu"
											onClose={() => setOpenMobileActions(false)}
										/>
										<DeleteCourseDialog
											course={course}
											triggerMode="menu"
											onClose={() => setOpenMobileActions(false)}
										/>
										<Button
											variant="ghost"
											size="xs"
											className="w-full justify-start"
											role="menuitem"
											asChild
										>
											<Link to="/courses/$slug" params={{ slug: course.slug }}>
												Open
											</Link>
										</Button>
									</motion.div>
								) : null}
							</AnimatePresence>
						</div>
					</div>
				</div>
			</div>

			<AnimatePresence initial={false}>
				{openDetail ? (
					<motion.div
						{...outlineMotion}
						transition={{ duration: 0.22, ease: "easeOut" }}
						id={outlineId}
						className="overflow-hidden"
					>
						<div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4">
							{detailQuery.isLoading ? (
								<p className="text-sm text-muted-foreground">
									Loading outline…
								</p>
							) : null}
							{detailQuery.data ? (
								<CourseOutlineAdmin course={detailQuery.data} />
							) : null}
						</div>
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}

function CourseOutlineAdmin({ course }: { course: Course }) {
	return (
		<div className="flex flex-col gap-3">
			{course.modules.map((module) => (
				<div
					key={module.id}
					className="rounded-lg border border-white/10 bg-background/70 p-3"
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="font-medium text-white">{module.title}</p>
							<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
								sort {module.sortOrder} · {module.lessons.length} lessons
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2 sm:justify-end">
							<LessonDialog courseSlug={course.slug} moduleId={module.id} />
							<DeleteModuleDialog
								courseSlug={course.slug}
								moduleId={module.id}
								moduleTitle={module.title}
								lessonCount={module.lessons.length}
							/>
						</div>
					</div>
					<div className="mt-3 flex flex-col gap-2">
						{module.lessons.map((lesson) => (
							<div
								key={lesson.id}
								className="grid gap-2 rounded-md border border-white/10 bg-white/[0.02] p-3 md:grid-cols-[1fr_auto] md:items-center"
							>
								<div>
									<p className="text-sm font-medium text-white">
										{lesson.title}
									</p>
									<p className="text-xs text-muted-foreground">
										{lesson.durationSeconds}s · {lesson.lessonSequence.length}{" "}
										bookmarks
									</p>
								</div>
								<div className="flex flex-wrap items-center gap-2 sm:justify-end">
									<SequenceDialog courseSlug={course.slug} lesson={lesson} />
									<DeleteLessonDialog
										courseSlug={course.slug}
										lessonId={lesson.id}
										lessonTitle={lesson.title}
										bookmarkCount={lesson.lessonSequence.length}
									/>
								</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function CourseDialog({
	course,
	triggerMode = "default",
	onClose,
}: {
	course?: CourseCard;
	triggerMode?: "default" | "icon" | "menu";
	onClose?: () => void;
}) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState(course?.title ?? "");
	const [slug, setSlug] = useState(course?.slug ?? "");
	const [description, setDescription] = useState(course?.description ?? "");
	const [status, setStatus] = useState<CourseStatus>(course?.status ?? "draft");
	const [sortOrder, setSortOrder] = useState(String(course?.sortOrder ?? 0));
	const mutation = useMutation({
		mutationFn: () =>
			course
				? updateAdminCourse({
						id: course.id,
						title,
						description,
						status,
						sortOrder: Number(sortOrder),
					})
				: createAdminCourse({
						slug,
						title,
						description,
						status,
						sortOrder: Number(sortOrder),
					}),
		onSuccess: async () => {
			toast.success(course ? "Course updated" : "Course created");
			setOpen(false);
			onClose?.();
			await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
			await queryClient.invalidateQueries({ queryKey: ["courses"] });
		},
		onError: (error) =>
			toast.error(
				error instanceof Error ? error.message : "Course write failed",
			),
	});
	const isIconTrigger = triggerMode === "icon" && course;
	const isMenuTrigger = triggerMode === "menu" && course;

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) onClose?.();
			}}
		>
			<DialogTrigger asChild>
				<Button
					size={isIconTrigger ? "icon-xs" : isMenuTrigger ? "xs" : "sm"}
					variant={
						isIconTrigger || isMenuTrigger
							? "ghost"
							: course
								? "outline"
								: "default"
					}
					className={isMenuTrigger ? "w-full justify-start" : undefined}
					aria-label={isIconTrigger ? `Edit ${course.title}` : undefined}
					title={isIconTrigger ? "Edit course" : undefined}
					role={isMenuTrigger ? "menuitem" : undefined}
				>
					{course ? (
						<RiEditLine aria-hidden="true" data-icon="inline-start" />
					) : (
						<RiAddLine aria-hidden="true" data-icon="inline-start" />
					)}
					{isIconTrigger ? null : course ? "Edit" : "New course"}
				</Button>
			</DialogTrigger>
			<DialogContent className="border-white/20 bg-background/95 sm:max-w-[620px]">
				<DialogHeader>
					<DialogTitle className="font-display text-3xl tracking-tighter">
						{course ? "Edit course" : "Create course"}
					</DialogTitle>
					<DialogDescription>
						Persist normalized course metadata through the backend admin route.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 md:grid-cols-2">
					<FormField label="Title">
						<Input value={title} onChange={(e) => setTitle(e.target.value)} />
					</FormField>
					<FormField label="Slug">
						<Input
							value={slug}
							onChange={(e) => setSlug(e.target.value)}
							disabled={Boolean(course)}
						/>
					</FormField>
					<FormField label="Description" className="md:col-span-2">
						<Textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</FormField>
					<FormField label="Status">
						<StatusSelect value={status} onValueChange={setStatus} />
					</FormField>
					<FormField label="Sort order">
						<Input
							type="number"
							value={sortOrder}
							onChange={(e) => setSortOrder(e.target.value)}
						/>
					</FormField>
				</div>
				<div className="flex justify-end">
					<Button
						disabled={
							mutation.isPending || !title || !description || (!course && !slug)
						}
						onClick={() => mutation.mutate()}
					>
						Save course
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function DeleteCourseDialog({
	course,
	triggerMode = "default",
	onClose,
}: {
	course: CourseCard;
	triggerMode?: "default" | "icon" | "menu";
	onClose?: () => void;
}) {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: () => deleteAdminCourse(course.id),
		onSuccess: async () => {
			toast.success("Course deleted");
			onClose?.();
			await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
			await queryClient.invalidateQueries({ queryKey: ["courses"] });
			await queryClient.invalidateQueries({
				queryKey: ["courses", course.slug],
			});
		},
		onError: (error) =>
			toast.error(
				error instanceof Error ? error.message : "Course delete failed",
			),
	});
	return (
		<DeleteConfirmDialog
			triggerMode={triggerMode}
			triggerLabel={`Delete ${course.title}`}
			title="Delete course"
			description={`This will permanently delete ${course.title}, including all modules, lessons, and lesson bookmarks.`}
			confirmLabel="Delete course"
			isPending={mutation.isPending}
			onConfirm={() => mutation.mutate()}
			onClose={onClose}
		/>
	);
}

function ModuleDialog({
	course,
	triggerMode = "default",
	onClose,
}: {
	course: CourseCard;
	triggerMode?: "default" | "icon" | "menu";
	onClose?: () => void;
}) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [sortOrder, setSortOrder] = useState("0");
	const mutation = useMutation({
		mutationFn: () =>
			createAdminModule({
				courseId: course.id,
				title,
				sortOrder: Number(sortOrder),
			}),
		onSuccess: async () => {
			toast.success("Module added");
			setOpen(false);
			onClose?.();
			setTitle("");
			await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
			await queryClient.invalidateQueries({
				queryKey: ["courses", course.slug],
			});
		},
		onError: (error) =>
			toast.error(
				error instanceof Error ? error.message : "Module write failed",
			),
	});
	return (
		<SimpleDialog
			open={open}
			setOpen={setOpen}
			title="Add module"
			description={`Create a module inside ${course.title}.`}
			trigger={
				<>
					<RiFileList3Line aria-hidden="true" data-icon="inline-start" />
					{triggerMode === "icon" ? null : "Module"}
				</>
			}
			triggerMode={triggerMode}
			triggerLabel={`Add module to ${course.title}`}
			onClose={onClose}
			submit="Save module"
			disabled={!title || mutation.isPending}
			onSubmit={() => mutation.mutate()}
		>
			<FormField label="Title">
				<Input value={title} onChange={(e) => setTitle(e.target.value)} />
			</FormField>
			<FormField label="Sort order">
				<Input
					type="number"
					value={sortOrder}
					onChange={(e) => setSortOrder(e.target.value)}
				/>
			</FormField>
		</SimpleDialog>
	);
}

function DeleteModuleDialog({
	courseSlug,
	moduleId,
	moduleTitle,
	lessonCount,
}: {
	courseSlug: string;
	moduleId: string;
	moduleTitle: string;
	lessonCount: number;
}) {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: () => deleteAdminModule(moduleId),
		onSuccess: async () => {
			toast.success("Module deleted");
			await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
			await queryClient.invalidateQueries({
				queryKey: ["courses", courseSlug],
			});
		},
		onError: (error) =>
			toast.error(
				error instanceof Error ? error.message : "Module delete failed",
			),
	});
	return (
		<DeleteConfirmDialog
			triggerMode="icon"
			triggerLabel={`Delete ${moduleTitle}`}
			title="Delete module"
			description={`This will permanently delete ${moduleTitle} and cascade to ${lessonCount} lessons with their bookmarks.`}
			confirmLabel="Delete module"
			isPending={mutation.isPending}
			onConfirm={() => mutation.mutate()}
		/>
	);
}

function DeleteLessonDialog({
	courseSlug,
	lessonId,
	lessonTitle,
	bookmarkCount,
}: {
	courseSlug: string;
	lessonId: string;
	lessonTitle: string;
	bookmarkCount: number;
}) {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: () => deleteAdminLesson(lessonId),
		onSuccess: async () => {
			toast.success("Lesson deleted");
			await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
			await queryClient.invalidateQueries({
				queryKey: ["courses", courseSlug],
			});
		},
		onError: (error) =>
			toast.error(
				error instanceof Error ? error.message : "Lesson delete failed",
			),
	});
	return (
		<DeleteConfirmDialog
			triggerMode="icon"
			triggerLabel={`Delete ${lessonTitle}`}
			title="Delete lesson"
			description={`This will permanently delete ${lessonTitle} and cascade to ${bookmarkCount} lesson bookmarks.`}
			confirmLabel="Delete lesson"
			isPending={mutation.isPending}
			onConfirm={() => mutation.mutate()}
		/>
	);
}

function LessonDialog({
	moduleId,
	courseSlug,
}: {
	moduleId: string;
	courseSlug: string;
}) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [url, setUrl] = useState("https://www.youtube.com/embed/VIDEO_ID");
	const [duration, setDuration] = useState("300");
	const [sortOrder, setSortOrder] = useState("0");
	const mutation = useMutation({
		mutationFn: () =>
			createAdminLesson({
				moduleId,
				title,
				youtubeEmbedUrl: url,
				durationSeconds: Number(duration),
				sortOrder: Number(sortOrder),
			}),
		onSuccess: async () => {
			toast.success("Lesson added");
			setOpen(false);
			setTitle("");
			await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
			await queryClient.invalidateQueries({
				queryKey: ["courses", courseSlug],
			});
		},
		onError: (error) =>
			toast.error(
				error instanceof Error ? error.message : "Lesson write failed",
			),
	});
	return (
		<SimpleDialog
			open={open}
			setOpen={setOpen}
			title="Add lesson"
			description="Add a YouTube lesson to this module."
			trigger={
				<>
					<RiAddLine aria-hidden="true" data-icon="inline-start" />
					Lesson
				</>
			}
			submit="Save lesson"
			disabled={!title || !url || mutation.isPending}
			onSubmit={() => mutation.mutate()}
		>
			<FormField label="Title">
				<Input value={title} onChange={(e) => setTitle(e.target.value)} />
			</FormField>
			<FormField label="YouTube URL">
				<Input value={url} onChange={(e) => setUrl(e.target.value)} />
			</FormField>
			<div className="grid gap-4 md:grid-cols-2">
				<FormField label="Duration seconds">
					<Input
						type="number"
						value={duration}
						onChange={(e) => setDuration(e.target.value)}
					/>
				</FormField>
				<FormField label="Sort order">
					<Input
						type="number"
						value={sortOrder}
						onChange={(e) => setSortOrder(e.target.value)}
					/>
				</FormField>
			</div>
		</SimpleDialog>
	);
}

function SequenceDialog({
	lesson,
	courseSlug,
}: {
	lesson: {
		id: string;
		title: string;
		lessonSequence: Array<{
			id: string;
			title: string;
			description: string;
			timestampSeconds: number;
			sortOrder: number;
		}>;
	};
	courseSlug: string;
}) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [points, setPoints] = useState(() =>
		lesson.lessonSequence.map((p) => ({
			id: p.id,
			title: p.title,
			description: p.description,
			timestampSeconds: String(p.timestampSeconds),
			sortOrder: String(p.sortOrder),
		})),
	);
	const deletePointMutation = useMutation({
		mutationFn: (pointId: string) => deleteAdminSequencePoint(pointId),
		onSuccess: async (_data, pointId) => {
			toast.success("Bookmark deleted");
			setPoints((current) => current.filter((point) => point.id !== pointId));
			await queryClient.invalidateQueries({
				queryKey: ["courses", courseSlug],
			});
		},
		onError: (error) =>
			toast.error(
				error instanceof Error ? error.message : "Bookmark delete failed",
			),
	});
	const mutation = useMutation({
		mutationFn: () =>
			replaceAdminLessonSequence({
				lessonId: lesson.id,
				points: points
					.filter((p) => p.title)
					.map((p) => ({
						title: p.title,
						description: p.description,
						timestampSeconds: Number(p.timestampSeconds),
						sortOrder: Number(p.sortOrder),
					})),
			}),
		onSuccess: async () => {
			toast.success("Sequence replaced");
			setOpen(false);
			await queryClient.invalidateQueries({
				queryKey: ["courses", courseSlug],
			});
		},
		onError: (error) =>
			toast.error(
				error instanceof Error ? error.message : "Sequence write failed",
			),
	});
	return (
		<SimpleDialog
			open={open}
			setOpen={setOpen}
			title="Replace sequence"
			description={`Replace all bookmarks for ${lesson.title}.`}
			trigger={
				<>
					<RiPlayList2Line aria-hidden="true" data-icon="inline-start" />
					Sequence
				</>
			}
			submit="Replace sequence"
			disabled={mutation.isPending}
			onSubmit={() => mutation.mutate()}
		>
			<div className="flex flex-col gap-3">
				{points.map((point, index) => (
					<div
						key={point.id || index.toString()}
						className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
					>
						<div className="grid gap-3 md:grid-cols-[1fr_120px_100px_auto]">
							<Input
								placeholder="Title"
								value={point.title}
								onChange={(e) =>
									setPoints(
										points.map((p, i) =>
											i === index ? { ...p, title: e.target.value } : p,
										),
									)
								}
							/>
							<Input
								type="number"
								placeholder="Seconds"
								value={point.timestampSeconds}
								onChange={(e) =>
									setPoints(
										points.map((p, i) =>
											i === index
												? { ...p, timestampSeconds: e.target.value }
												: p,
										),
									)
								}
							/>
							<Input
								type="number"
								placeholder="Sort"
								value={point.sortOrder}
								onChange={(e) =>
									setPoints(
										points.map((p, i) =>
											i === index ? { ...p, sortOrder: e.target.value } : p,
										),
									)
								}
							/>
							{point.id ? (
								<DeleteConfirmDialog
									triggerMode="icon"
									triggerLabel={`Delete bookmark ${point.title || index + 1}`}
									title="Delete bookmark"
									description="This removes only this lesson bookmark. The lesson and other sequence points remain in place."
									confirmLabel="Delete bookmark"
									isPending={deletePointMutation.isPending}
									onConfirm={() => deletePointMutation.mutate(point.id)}
								/>
							) : (
								<Button
									variant="ghost"
									size="icon-xs"
									aria-label="Remove unsaved bookmark"
									onClick={() =>
										setPoints(points.filter((_, i) => i !== index))
									}
								>
									<RiDeleteBin6Line
										aria-hidden="true"
										data-icon="inline-start"
									/>
								</Button>
							)}
						</div>
						<Textarea
							className="mt-3"
							placeholder="Description"
							value={point.description}
							onChange={(e) =>
								setPoints(
									points.map((p, i) =>
										i === index ? { ...p, description: e.target.value } : p,
									),
								)
							}
						/>
					</div>
				))}
				<Button
					variant="outline"
					onClick={() =>
						setPoints([
							...points,
							{
								id: "",
								title: "",
								description: "",
								timestampSeconds: "0",
								sortOrder: String(points.length + 1),
							},
						])
					}
				>
					Add bookmark
				</Button>
			</div>
		</SimpleDialog>
	);
}

function DeleteConfirmDialog({
	triggerMode = "default",
	triggerLabel,
	title,
	description,
	confirmLabel,
	isPending,
	onConfirm,
	onClose,
}: {
	triggerMode?: "default" | "icon" | "menu";
	triggerLabel: string;
	title: string;
	description: string;
	confirmLabel: string;
	isPending: boolean;
	onConfirm: () => void;
	onClose?: () => void;
}) {
	const [open, setOpen] = useState(false);
	const isIconTrigger = triggerMode === "icon";
	const isMenuTrigger = triggerMode === "menu";
	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) onClose?.();
			}}
		>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size={isIconTrigger ? "icon-xs" : isMenuTrigger ? "xs" : "sm"}
					className={cn(isMenuTrigger && "w-full justify-start text-amber")}
					aria-label={isIconTrigger ? triggerLabel : undefined}
					title={isIconTrigger ? triggerLabel : undefined}
					role={isMenuTrigger ? "menuitem" : undefined}
				>
					<RiDeleteBin6Line aria-hidden="true" data-icon="inline-start" />
					{isIconTrigger ? null : "Delete"}
				</Button>
			</DialogTrigger>
			<DialogContent className="border-amber/20 bg-background/95 sm:max-w-[520px] shadow-[inset_0_0_24px_rgba(255,186,90,0.06)]">
				<DialogHeader>
					<DialogTitle className="font-display text-3xl tracking-tighter">
						{title}
					</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<div className="rounded-lg border border-amber/20 bg-amber/5 p-3 text-sm text-muted-foreground">
					This action is permanent. Confirm only after checking the selected
					catalog node.
				</div>
				<div className="flex justify-end gap-2">
					<Button
						variant="outline"
						disabled={isPending}
						onClick={() => setOpen(false)}
					>
						Cancel
					</Button>
					<Button
						variant="default"
						disabled={isPending}
						onClick={() => {
							onConfirm();
							setOpen(false);
						}}
					>
						{confirmLabel}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function SimpleDialog({
	open,
	setOpen,
	title,
	description,
	trigger,
	triggerMode = "default",
	triggerLabel,
	onClose,
	submit,
	disabled,
	onSubmit,
	children,
}: {
	open: boolean;
	setOpen: (open: boolean) => void;
	title: string;
	description: string;
	trigger: React.ReactNode;
	triggerMode?: "default" | "icon" | "menu";
	triggerLabel?: string;
	onClose?: () => void;
	submit: string;
	disabled: boolean;
	onSubmit: () => void;
	children: React.ReactNode;
}) {
	const isIconTrigger = triggerMode === "icon";
	const isMenuTrigger = triggerMode === "menu";

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) onClose?.();
			}}
		>
			<DialogTrigger asChild>
				<Button
					size={isIconTrigger ? "icon-xs" : isMenuTrigger ? "xs" : "sm"}
					variant={isIconTrigger || isMenuTrigger ? "ghost" : "outline"}
					className={isMenuTrigger ? "w-full justify-start" : undefined}
					aria-label={isIconTrigger ? triggerLabel : undefined}
					title={isIconTrigger ? title : undefined}
					role={isMenuTrigger ? "menuitem" : undefined}
				>
					{trigger}
				</Button>
			</DialogTrigger>
			<DialogContent className="border-white/20 bg-background/95 sm:max-w-[620px]">
				<DialogHeader>
					<DialogTitle className="font-display text-3xl tracking-tighter">
						{title}
					</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4">{children}</div>
				<div className="flex justify-end">
					<Button disabled={disabled} onClick={onSubmit}>
						{submit}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function FormField({
	label,
	children,
	className,
}: {
	label: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={`flex flex-col gap-2 ${className ?? ""}`}>
			<Label>{label}</Label>
			{children}
		</div>
	);
}

function StatusSelect({
	value,
	onValueChange,
}: {
	value: CourseStatus;
	onValueChange: (value: CourseStatus) => void;
}) {
	return (
		<Select
			value={value}
			onValueChange={(next) => onValueChange(next as CourseStatus)}
		>
			<SelectTrigger className="w-full">
				<SelectValue placeholder="Status" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectItem value="draft">Draft</SelectItem>
					<SelectItem value="beta">Beta</SelectItem>
					<SelectItem value="published">Published</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

function BetaAllowlistCard({
	entries,
	onEntriesChange,
}: {
	entries: BetaAllowlistEntry[];
	onEntriesChange: (entries: BetaAllowlistEntry[]) => void;
}) {
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<BetaAllowlistStatus>("invited");
	const [isLoading, setIsLoading] = useState(true);
	const [savingEmail, setSavingEmail] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		setIsLoading(true);
		listBetaAllowlist()
			.then((payload) => {
				if (!isMounted) return;
				onEntriesChange(payload.entries);
				setError(null);
			})
			.catch((loadError) => {
				if (!isMounted) return;
				setError(
					loadError instanceof Error
						? loadError.message
						: "Could not load beta allowlist.",
				);
			})
			.finally(() => {
				if (isMounted) setIsLoading(false);
			});
		return () => {
			isMounted = false;
		};
	}, [onEntriesChange]);

	async function copyUserId(userId: string) {
		try {
			await navigator.clipboard.writeText(userId);
			toast.success("User id copied");
		} catch {
			toast.error("Error copying user ID");
		}
	}
	async function saveEntry(nextEmail: string, nextStatus: BetaAllowlistStatus) {
		setSavingEmail(nextEmail);
		setError(null);
		try {
			const entry = await upsertBetaAllowlistEntry({
				email: nextEmail,
				status: nextStatus,
			});
			onEntriesChange(
				[entry, ...entries.filter((item) => item.email !== entry.email)].sort(
					(a, b) => a.email.localeCompare(b.email),
				),
			);
			setEmail("");
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: "Could not update beta allowlist.",
			);
		} finally {
			setSavingEmail(null);
		}
	}

	return (
		<Card className="border-white/15 bg-background/85 lg:border-t">
			<CardHeader>
				<CardTitle className="font-display text-3xl tracking-tighter text-white">
					Beta allowlist
				</CardTitle>
				<CardDescription>
					Real entries are read from auth_service beta_access and mutations
					require Better Auth admin server-side.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<form
					className="grid gap-2 sm:grid-cols-[1fr_140px_auto]"
					onSubmit={(event) => {
						event.preventDefault();
						void saveEntry(email, status);
					}}
				>
					<Input
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						placeholder="student@example.com"
					/>
					<Select
						value={status}
						onValueChange={(value) => setStatus(value as BetaAllowlistStatus)}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="invited">Invited</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="revoked">Revoked</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
					<Button type="submit" disabled={!email || savingEmail === email}>
						<RiFileCopyLine aria-hidden="true" data-icon="inline-start" />
						Save
					</Button>
				</form>
				{error ? (
					<p className="rounded-lg border border-amber/20 bg-amber/5 px-3 py-2 text-sm text-amber">
						{error}
					</p>
				) : null}
				<Separator />
				<div className="flex flex-col gap-3">
					{isLoading ? (
						<p className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-muted-foreground">
							Loading real allowlist entries…
						</p>
					) : null}
					{!isLoading && entries.length === 0 ? (
						<p className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-muted-foreground">
							No beta_access rows yet.
						</p>
					) : null}
					{entries.map((user) => (
						<div
							key={user.id}
							className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 sm:grid-cols-[1fr_150px] sm:items-center"
						>
							<div className="min-w-0 flex flex-col gap-1">
								<span className="break-all text-sm font-medium text-white">
									{user.email}
								</span>
								<span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
									{user.user_id ? (
										<div className="flex items-center">
											linked $
											{user.user_id.slice(0, 3) +
												"..." +
												user.user_id.slice(-3)}
											<Button
												variant="ghost"
												size="xs"
												className="ml-1"
												aria-label="Copy linked user id"
												onClick={() => void copyUserId(user.user_id ?? "")}
											>
												<RiFileCopyLine
													aria-hidden="true"
													data-icon="inline-start"
												/>
											</Button>
										</div>
									) : (
										"email allowlist"
									)}
								</span>
							</div>
							<div className="flex items-center gap-2 sm:justify-end">
								<Select
									value={user.status}
									onValueChange={(value) =>
										void saveEntry(user.email, value as BetaAllowlistStatus)
									}
								>
									<SelectTrigger className="h-9 w-[112px]">
										<SelectValue placeholder="Status" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="invited">Invited</SelectItem>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="revoked">Revoked</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
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
