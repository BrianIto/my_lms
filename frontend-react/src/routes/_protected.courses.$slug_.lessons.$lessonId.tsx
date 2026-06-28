import {
	RiArrowLeftLine,
	RiCheckboxCircleLine,
	RiCircleLine,
	RiPlayCircleLine,
	RiPlayList2Line,
} from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
import {
	getCourse,
	getCourseProgress,
	updateLessonProgress,
} from "#/lib/backend-api.ts";
import { findLesson, formatDuration, formatTimestamp } from "#/lib/lms-data.ts";

type YouTubePlayer = {
	destroy: () => void;
	seekTo: (seconds: number, allowSeekAhead: boolean) => void;
};

type YouTubeIframeAPI = {
	Player: new (
		element: HTMLElement | string,
		options: {
			videoId: string;
			host?: string;
			playerVars?: Record<string, number | string>;
			events?: {
				onReady?: () => void;
				onError?: () => void;
			};
		},
	) => YouTubePlayer;
};

declare global {
	interface Window {
		YT?: YouTubeIframeAPI;
		onYouTubeIframeAPIReady?: () => void;
	}
}

let youtubeApiPromise: Promise<YouTubeIframeAPI> | null = null;

function loadYouTubeIframeApi() {
	if (typeof window === "undefined") {
		return Promise.reject(new Error("YouTube API is unavailable during SSR."));
	}

	if (window.YT?.Player) {
		return Promise.resolve(window.YT);
	}

	youtubeApiPromise ??= new Promise<YouTubeIframeAPI>((resolve, reject) => {
		const existingScript = document.querySelector<HTMLScriptElement>(
			'script[src="https://www.youtube.com/iframe_api"]',
		);
		const previousReady = window.onYouTubeIframeAPIReady;

		window.onYouTubeIframeAPIReady = () => {
			previousReady?.();
			if (window.YT?.Player) {
				resolve(window.YT);
			} else {
				reject(new Error("YouTube API loaded without a player."));
			}
		};

		if (!existingScript) {
			const script = document.createElement("script");
			script.src = "https://www.youtube.com/iframe_api";
			script.async = true;
			script.onerror = () => reject(new Error("Could not load YouTube API."));
			document.head.appendChild(script);
		}
	});

	return youtubeApiPromise;
}

function getYouTubeVideoId(embedUrl: string) {
	try {
		const url = new URL(embedUrl);
		const host = url.hostname.replace(/^www\./, "");
		const isYouTubeHost =
			host === "youtube.com" || host === "youtube-nocookie.com";

		if (!isYouTubeHost) {
			return undefined;
		}

		const [, embedSegment, videoId] = url.pathname.split("/");
		return embedSegment === "embed" && videoId ? videoId : undefined;
	} catch {
		return undefined;
	}
}

function getYouTubeHost(embedUrl: string) {
	try {
		return new URL(embedUrl).hostname.includes("youtube-nocookie.com")
			? "https://www.youtube-nocookie.com"
			: "https://www.youtube.com";
	} catch {
		return "https://www.youtube.com";
	}
}

export const Route = createFileRoute(
	"/_protected/courses/$slug_/lessons/$lessonId",
)({
	component: LessonView,
});

function LessonView() {
	const { slug, lessonId } = Route.useParams();
	const queryClient = useQueryClient();
	const courseQuery = useQuery({
		queryKey: ["courses", slug],
		queryFn: () => getCourse(slug),
		staleTime: 60 * 60 * 1000,
	});
	const progressQuery = useQuery({
		queryKey: ["courses", slug, "progress"],
		queryFn: () => getCourseProgress(slug),
		staleTime: 30 * 1000,
	});
	const course = courseQuery.data;
	const lesson = course ? findLesson(course, lessonId) : undefined;
	const playerContainerRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<YouTubePlayer | null>(null);
	const [isPlayerReady, setIsPlayerReady] = useState(false);
	const videoId = lesson
		? getYouTubeVideoId(lesson.youtubeEmbedUrl)
		: undefined;
	const progressMutation = useMutation({
		mutationFn: updateLessonProgress,
		onSuccess: async () => {
			toast.success("Progress updated");
			await queryClient.invalidateQueries({
				queryKey: ["courses", slug, "progress"],
			});
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Could not update progress",
			);
		},
	});

	useEffect(() => {
		const container = playerContainerRef.current;

		if (!lesson || !videoId || !container) {
			return;
		}

		let isMounted = true;
		setIsPlayerReady(false);
		container.replaceChildren();

		loadYouTubeIframeApi()
			.then((api) => {
				if (!isMounted || !playerContainerRef.current) {
					return;
				}

				playerRef.current = new api.Player(playerContainerRef.current, {
					videoId,
					host: getYouTubeHost(lesson.youtubeEmbedUrl),
					playerVars: {
						enablejsapi: 1,
						modestbranding: 1,
						playsinline: 1,
						rel: 0,
					},
					events: {
						onReady: () => {
							if (isMounted) {
								setIsPlayerReady(true);
							}
						},
						onError: () => {
							if (isMounted) {
								setIsPlayerReady(false);
							}
						},
					},
				});
			})
			.catch((error) => {
				if (isMounted) {
					toast.error(
						error instanceof Error
							? error.message
							: "Could not load YouTube player.",
					);
				}
			});

		return () => {
			isMounted = false;
			setIsPlayerReady(false);
			playerRef.current?.destroy();
			playerRef.current = null;
			container.replaceChildren();
		};
	}, [lesson, videoId]);

	function seekToBookmark(seconds: number) {
		if (!isPlayerReady || !playerRef.current) {
			return;
		}

		playerRef.current.seekTo(seconds, true);
	}

	return (
		<LmsShell
			eyebrow="Lesson player"
			title={lesson?.title ?? "Lesson player"}
			description="Watch the lesson, keep one practical takeaway in view, and update your progress when the idea is clear enough to reuse."
		>
			{courseQuery.isError || (course && !lesson) ? (
				<Card className="border-white/15 bg-background/85">
					<CardHeader>
						<CardTitle className="font-display text-3xl tracking-tighter text-white">
							Lesson not found
						</CardTitle>
						<CardDescription>
							The backend catalog did not return this lesson.
						</CardDescription>
					</CardHeader>
				</Card>
			) : null}
			{!course || !lesson ? null : (
				<div className="grid gap-5 lg:grid-cols-[1fr_340px]">
					<section className="flex flex-col gap-4">
						<div className="overflow-hidden rounded-xl border border-white/20 bg-black shadow-[0_0_40px_rgba(255,186,90,0.06)]">
							{videoId ? (
								<div
									ref={playerContainerRef}
									className="min-h-[480px] w-full [&_iframe]:aspect-video [&_iframe]:h-full [&_iframe]:w-full"
								/>
							) : (
								<div className="flex aspect-video w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
									This lesson video URL could not be prepared for YouTube
									playback.
								</div>
							)}
						</div>

						<Card className="border-white/15 bg-background/85">
							<CardHeader>
								<CardTitle className="font-display text-3xl tracking-tighter text-white">
									Progress controls
								</CardTitle>
								<CardDescription>
									{formatDuration(lesson.durationSeconds)} ·{" "}
									{(lesson.status ?? "not_started").replace("_", " ")}
								</CardDescription>
							</CardHeader>
							<CardContent className="grid gap-3 md:grid-cols-3">
								<Button
									variant="outline"
									disabled={progressMutation.isPending}
									onClick={() =>
										progressMutation.mutate({
											lessonId: lesson.id,
											status: "in_progress",
										})
									}
								>
									<RiPlayCircleLine
										aria-hidden="true"
										data-icon="inline-start"
									/>{" "}
									In progress
								</Button>
								<Button
									disabled={progressMutation.isPending}
									onClick={() =>
										progressMutation.mutate({
											lessonId: lesson.id,
											status: "completed",
										})
									}
								>
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

						{lesson.lessonSequence.length > 0 ? (
							<Card className="border-white/15 bg-background/85">
								<CardHeader>
									<CardTitle className="font-display text-3xl tracking-tighter text-white">
										Bookmarks
									</CardTitle>
									<CardDescription>
										Timestamped sequence points authored for this lesson.
									</CardDescription>
								</CardHeader>
								<CardContent className="flex flex-col gap-3">
									{lesson.lessonSequence.map((point) => (
										<button
											key={point.id}
											type="button"
											disabled={!isPlayerReady}
											onClick={() => seekToBookmark(point.timestampSeconds)}
											className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-left text-sm duration-200 hover:border-amber/25 hover:shadow-[0_0_16px_rgba(255,186,90,0.05)] focus-visible:border-amber/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/30 disabled:cursor-not-allowed disabled:opacity-60"
											aria-label={`Seek to ${point.title} at ${formatTimestamp(point.timestampSeconds)}`}
										>
											<span className="flex items-center justify-between gap-3">
												<span className="font-medium text-white">
													{point.title}
												</span>
												<Badge variant="outline">
													{formatTimestamp(point.timestampSeconds)}
												</Badge>
											</span>
											{point.description ? (
												<span className="mt-2 block text-muted-foreground">
													{point.description}
												</span>
											) : null}
										</button>
									))}
								</CardContent>
							</Card>
						) : null}
					</section>

					<aside className="flex flex-col gap-4">
						<Card className="border-amber/20 bg-background/85 shadow-[inset_0_0_24px_rgba(255,186,90,0.06)]">
							<CardHeader>
								<CardTitle className="font-display text-3xl tracking-tighter text-white">
									{progressQuery.data?.percent ?? course.progress ?? 0}%
								</CardTitle>
								<CardDescription>Course completion</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-4">
								<Progress
									value={progressQuery.data?.percent ?? course.progress ?? 0}
								/>
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
			)}
		</LmsShell>
	);
}
