import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";

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

export type YouTubeLessonPlayerHandle = {
	seekTo: (seconds: number) => void;
};

type YouTubeLessonPlayerProps = {
	embedUrl: string;
	title?: string;
	onReadyChange?: (isReady: boolean) => void;
};

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
			script.onerror = () => {
				youtubeApiPromise = null;
				reject(new Error("Could not load YouTube API."));
			};
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

export const YouTubeLessonPlayer = forwardRef<
	YouTubeLessonPlayerHandle,
	YouTubeLessonPlayerProps
>(function YouTubeLessonPlayer({ embedUrl, title, onReadyChange }, ref) {
	const playerContainerRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<YouTubePlayer | null>(null);
	const [isReady, setIsReady] = useState(false);
	const videoId = getYouTubeVideoId(embedUrl);

	useImperativeHandle(
		ref,
		() => ({
			seekTo: (seconds: number) => {
				if (!isReady || !playerRef.current) {
					return;
				}

				playerRef.current.seekTo(seconds, true);
			},
		}),
		[isReady],
	);

	useEffect(() => {
		const setReadyState = (nextReady: boolean) => {
			setIsReady(nextReady);
			onReadyChange?.(nextReady);
		};

		const container = playerContainerRef.current;
		setReadyState(false);

		if (!videoId || !container) {
			return;
		}

		let isMounted = true;
		container.replaceChildren();

		loadYouTubeIframeApi()
			.then((api) => {
				if (!isMounted || !playerContainerRef.current) {
					return;
				}

				playerRef.current = new api.Player(playerContainerRef.current, {
					videoId,
					host: getYouTubeHost(embedUrl),
					playerVars: {
						enablejsapi: 1,
						modestbranding: 1,
						playsinline: 1,
						rel: 0,
					},
					events: {
						onReady: () => {
							if (isMounted) {
								setReadyState(true);
							}
						},
						onError: () => {
							if (isMounted) {
								setReadyState(false);
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
			onReadyChange?.(false);
			playerRef.current?.destroy();
			playerRef.current = null;
			container.replaceChildren();
		};
	}, [embedUrl, onReadyChange, videoId]);

	return (
		<div className="overflow-hidden rounded-xl border border-white/20 bg-black shadow-[0_0_40px_rgba(255,186,90,0.06)]">
			{videoId ? (
				<div
					ref={playerContainerRef}
					className="aspect-video w-full md:min-h-[480px] [&_iframe]:aspect-video [&_iframe]:h-full [&_iframe]:w-full"
					title={title}
				/>
			) : (
				<div className="flex aspect-video w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
					This lesson video URL could not be prepared for YouTube playback.
				</div>
			)}
		</div>
	);
});
