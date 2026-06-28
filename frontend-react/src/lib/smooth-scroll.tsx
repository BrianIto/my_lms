"use client";

import { useGSAP } from "@gsap/react";
import { useLocation } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
	createContext,
	lazy,
	type ReactNode,
	type RefObject,
	Suspense,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother);

const DynamicIsland = lazy(
	() => import("#/components/storybook/DynamicIsland"),
);

type SmoothScrollContextValue = {
	scrollSmootherRef: RefObject<ScrollSmoother | null>;
	scrollTo: (target: string | number | Element, smooth?: boolean) => void;
};

const SmoothScrollContext = createContext<SmoothScrollContextValue | null>(
	null,
);

function useMediaQuery(query: string) {
	const [matches, setMatches] = useState(() =>
		typeof window === "undefined" ? false : window.matchMedia(query).matches,
	);

	useEffect(() => {
		const mediaQuery = window.matchMedia(query);
		const updateMatches = () => setMatches(mediaQuery.matches);

		updateMatches();
		mediaQuery.addEventListener("change", updateMatches);

		return () => mediaQuery.removeEventListener("change", updateMatches);
	}, [query]);

	return matches;
}

function isProtectedPath(pathname: string) {
	return (
		pathname === "/dashboard" ||
		pathname === "/admin" ||
		pathname.startsWith("/courses")
	);
}

function getHashTarget(hash: string) {
	if (!hash) return null;

	try {
		return document.getElementById(decodeURIComponent(hash.slice(1)));
	} catch {
		return document.getElementById(hash.slice(1));
	}
}

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
	const location = useLocation();
	const scrollSmootherRef = useRef<ScrollSmoother | null>(null);
	const isMobile = useMediaQuery("(max-width: 767px), (pointer: coarse)");
	const prefersReducedMotion = useMediaQuery(
		"(prefers-reduced-motion: reduce)",
	);

	useGSAP(
		() => {
			if (prefersReducedMotion) {
				return;
			}

			scrollSmootherRef.current = ScrollSmoother.create({
				smooth: isMobile ? 0 : 0.65,
				effects: !isMobile,
				smoothTouch: 0,
			});

			return () => {
				scrollSmootherRef.current?.kill();
				scrollSmootherRef.current = null;
			};
		},
		{ dependencies: [isMobile, prefersReducedMotion] },
	);

	useEffect(() => {
		const target = getHashTarget(location.hash);

		if (!target) return;

		const frame = window.requestAnimationFrame(() => {
			if (prefersReducedMotion) {
				target.scrollIntoView({ block: "start" });
				return;
			}

			scrollSmootherRef.current?.scrollTo(target, true, "top top");
		});

		return () => window.cancelAnimationFrame(frame);
	}, [location.hash, prefersReducedMotion]);

	const value = useMemo<SmoothScrollContextValue>(
		() => ({
			scrollSmootherRef,
			scrollTo: (target, smooth = true) => {
				if (prefersReducedMotion) {
					if (typeof target === "number") {
						window.scrollTo({ top: target, behavior: "auto" });
						return;
					}

					if (typeof target === "string") {
						getHashTarget(target)?.scrollIntoView({ block: "start" });
						return;
					}

					target.scrollIntoView({ block: "start" });
					return;
				}

				scrollSmootherRef.current?.scrollTo(target, smooth, "top top");
			},
		}),
		[prefersReducedMotion],
	);

	return (
		<SmoothScrollContext.Provider value={value}>
			{isProtectedPath(location.pathname) ? (
				<Suspense fallback={null}>
					<DynamicIsland />
				</Suspense>
			) : null}
			<div id="smooth-wrapper">
				<div id="smooth-content">{children}</div>
			</div>
		</SmoothScrollContext.Provider>
	);
}

export function useSmoothScroll() {
	const context = useContext(SmoothScrollContext);

	if (!context) {
		throw new Error("useSmoothScroll must be used within SmoothScrollProvider");
	}

	return context;
}
