"use client";

import { useGSAP } from "@gsap/react";
import {
	RiAdminLine,
	RiArrowDownLine,
	RiBookOpenLine,
	RiHome2Line,
	RiLoader4Line,
	RiLogoutBoxRLine,
} from "@remixicon/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import gsap from "gsap";
import { AnimatePresence, motion, stagger } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "#/lib/auth-client.ts";
import {
	anonymousAuthState,
	authStateQueryKey,
	getAuthStateQueryOptions,
} from "#/lib/auth-session.ts";
import { cn } from "#/utils/cn";
import ListItem, {
	type IslandPage,
	type IslandRoute,
} from "./DynamicIsland.ListItem";
import TextChangeAnimate from "./TextChangeAnimate";

const pages: IslandPage[] = [
	{ name: "Home", to: "/", icon: RiHome2Line },
	{ name: "Learning", to: "/dashboard", icon: RiBookOpenLine },
	{ name: "Admin", to: "/admin", icon: RiAdminLine },
];

const variants = {
	open: {
		width: "calc(var(--spacing) * 66)",
		minHeight: "calc(var(--spacing) * 12)",
		transition: {
			when: "beforeChildren",
			delayChildren: stagger(0.05),
		},
	},
	closed: {
		width: "calc(var(--spacing) * 58)",
		minHeight: "calc(var(--spacing) * 6)",
		transition: {
			when: "afterChildren",
		},
	},
};

function isEditableTarget(target: EventTarget | null) {
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		(target instanceof HTMLElement && target.isContentEditable)
	);
}

function getActivePage(pathname: string) {
	if (pathname === "/admin") {
		return pages[2];
	}

	if (pathname === "/dashboard" || pathname.startsWith("/courses")) {
		return pages[1];
	}

	return pages[0];
}

function getDisplayName(user?: {
	name?: string | null;
	email?: string | null;
}) {
	const name = user?.name?.trim().split(/\s+/)[0];

	if (name) {
		return name;
	}

	const emailLocalPart = user?.email
		?.split("@")[0]
		?.trim()
		.split(/[._-]+/)[0];
	return emailLocalPart || "";
}

gsap.registerPlugin(useGSAP);

const DynamicIsland: React.FC = () => {
	const [open, setOpen] = useState(false);
	const [pageIndex, setPageIndex] = useState(-1);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [showSalute, setShowSalute] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [signOutError, setSignOutError] = useState("");
	const labelRef = useRef<HTMLSpanElement>(null);
	const authQuery = useQuery(getAuthStateQueryOptions());
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const location = useLocation();
	const activePage = getActivePage(location.pathname);
	const activeRoute = activePage.to;
	const CurrentIcon = activePage.icon ?? RiHome2Line;
	const auth = authQuery.data ?? anonymousAuthState;
	const isAuthenticated = auth.isAuthenticated;
	const isAdmin = auth.isAdmin;
	const availablePages = useMemo(
		() => pages.filter((page) => page.to !== "/admin" || isAdmin),
		[isAdmin],
	);
	const menuItemCount = availablePages.length + (isAuthenticated ? 1 : 0);
	const logoutIndex = availablePages.length;
	const displayName = getDisplayName(auth.user);
	const saluteText = displayName ? `Hi, ${displayName}!` : "";
	const displayText = showSalute && saluteText ? saluteText : activePage.name;
	const prefersReducedMotion = useMemo(
		() =>
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches,
		[],
	);

	const closeIsland = useCallback(() => {
		setOpen(false);
		setPageIndex(-1);
	}, []);

	const handleNavigate = useCallback(
		(to: IslandRoute) => {
			void navigate({ to });
			closeIsland();
		},
		[navigate, closeIsland],
	);

	const handleSignOut = useCallback(async () => {
		if (isSigningOut) {
			return;
		}

		setIsSigningOut(true);
		setSignOutError("");

		try {
			const result = await authClient.signOut();

			if (result.error) {
				setSignOutError(result.error.message ?? "Sign out failed.");
				return;
			}

			queryClient.setQueryData(authStateQueryKey, anonymousAuthState);
			closeIsland();
			void navigate({ to: "/", replace: true });
		} catch (error) {
			setSignOutError(
				error instanceof Error ? error.message : "Sign out failed.",
			);
		} finally {
			setIsSigningOut(false);
		}
	}, [closeIsland, isSigningOut, navigate, queryClient]);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (isEditableTarget(event.target)) {
				return;
			}

			if (event.key === "/") {
				event.preventDefault();
				setOpen((prev) => !prev);
				return;
			}

			if (!open) {
				return;
			}

			if (event.key === "Escape") {
				event.preventDefault();
				closeIsland();
				setSelectedIndex(0);
				return;
			}

			if (event.key === "ArrowDown") {
				event.preventDefault();
				setSelectedIndex((prev) => (prev + 1) % menuItemCount);
				return;
			}

			if (event.key === "ArrowUp") {
				event.preventDefault();
				setSelectedIndex((prev) => (prev - 1 + menuItemCount) % menuItemCount);
				return;
			}

			if (event.key === "Enter") {
				event.preventDefault();

				if (isAuthenticated && selectedIndex === logoutIndex) {
					void handleSignOut();
					return;
				}

				const selectedPage = availablePages[selectedIndex];

				if (!selectedPage) {
					return;
				}

				if (selectedPage.sub) {
					setPageIndex((prev) => (prev === selectedIndex ? -1 : selectedIndex));
					return;
				}

				handleNavigate(selectedPage.to);
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		open,
		selectedIndex,
		menuItemCount,
		isAuthenticated,
		availablePages,
		handleNavigate,
		handleSignOut,
		closeIsland,
		logoutIndex,
	]);

	useEffect(() => {
		if (!open) {
			setSelectedIndex(0);
			setSignOutError("");
		}
	}, [open]);

	useEffect(() => {
		if (selectedIndex >= menuItemCount) {
			setSelectedIndex(0);
		}
	}, [menuItemCount, selectedIndex]);

	useEffect(() => {
		if (!saluteText) {
			setShowSalute(false);
			return;
		}

		setShowSalute(true);
		gsap.set(labelRef.current, { clearProps: "opacity,transform" });

		const timer = window.setTimeout(() => {
			if (prefersReducedMotion) {
				setShowSalute(false);
				return;
			}

			gsap.to(labelRef.current, {
				duration: 0.18,
				y: -3,
				opacity: 0,
				ease: "power2.out",
				onComplete: () => {
					setShowSalute(false);
					gsap.fromTo(
						labelRef.current,
						{ y: 3, opacity: 0 },
						{ duration: 0.24, y: 0, opacity: 1, ease: "power2.out" },
					);
				},
			});
		}, 3000);

		return () => {
			window.clearTimeout(timer);
			gsap.killTweensOf(labelRef.current);
		};
	}, [saluteText, prefersReducedMotion]);

	useGSAP(() => {
		gsap.from(".dynamic-island", {
			duration: 1,
			y: 4,
			scaleX: 0,
			opacity: 0,
			ease: "elastic.inOut",
		});
	}, []);

	return (
		<>
			<AnimatePresence>
				{open ? (
					<motion.button
						type="button"
						aria-label="Close LMS navigation"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						onClick={closeIsland}
						className="fixed left-0 top-0 z-[999] h-screen w-screen cursor-default bg-black/10"
					/>
				) : null}
			</AnimatePresence>

			<motion.nav
				aria-label="LMS navigation"
				animate={open ? "open" : "closed"}
				className="fixed left-1/2 top-4 z-[9999] flex -translate-x-1/2 flex-col outline-none"
			>
				<motion.div
					variants={variants}
					className={cn(
						"dynamic-island flex min-w-44 flex-col rounded-[16px] border border-white/10 bg-black px-1.5 py-1 font-sans text-[15px] font-medium text-[#AEAEAE] shadow-[0_18px_80px_rgba(0,0,0,0.45)] backdrop-blur",
						{ "text-white": open },
					)}
				>
					<button
						type="button"
						onClick={() => setOpen((prev) => !prev)}
						aria-expanded={open}
						aria-haspopup="menu"
						className={cn(
							"group flex h-6 w-full items-center rounded-[12px] text-[#AEAEAE] outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40",
							{ "hover:text-white": !open, "text-white": open },
						)}
					>
						<span className="flex size-5 items-center justify-center rounded-full bg-transparent duration-300">
							<CurrentIcon
								aria-hidden="true"
								className="w-3.5 text-[#AEAEAE]"
							/>
						</span>
						<span ref={labelRef} className="flex flex-1">
							<AnimatePresence mode="wait">
								<TextChangeAnimate key={displayText} text={displayText} />
							</AnimatePresence>
						</span>

						<span className="flex gap-1">
							<span className="-ml-5 w-5 rounded border border-white/10 bg-white/5 text-[12px] opacity-50">
								/
							</span>
							<span className="flex size-5 items-center justify-center rounded-full bg-[#1A1A1A] duration-300 group-hover:bg-[#888]">
								<RiArrowDownLine
									aria-hidden="true"
									className={cn(
										"w-3.5 text-[#AEAEAE] duration-200 group-hover:text-black",
										{
											"rotate-180": open,
										},
									)}
								/>
							</span>
						</span>
					</button>

					<motion.div
						className="w-full"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
					>
						{open
							? availablePages.map((page, index) => (
									<ListItem
										key={page.name}
										onToggle={() => {
											setPageIndex((prev) => (prev === index ? -1 : index));
										}}
										onClose={closeIsland}
										isOpen={pageIndex === index}
										isSelected={selectedIndex === index}
										isRouteActive={page.to === activeRoute}
										page={page}
										index={index}
									/>
								))
							: null}
						{open && isAuthenticated ? (
							<motion.div
								key="logout"
								initial={{ opacity: 0 }}
								animate={{
									opacity: 1,
									transition: { delay: logoutIndex * 0.07 },
								}}
								exit={{ opacity: 0 }}
							>
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation();
										void handleSignOut();
									}}
									disabled={isSigningOut}
									aria-describedby={
										signOutError ? "dynamic-island-sign-out-error" : undefined
									}
									className={cn(
										"flex w-full items-center gap-3 cursor-pointer px-2 py-1.5 text-left text-sm transition-colors first:mt-1 last-of-type:mb-0.75  focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
										"mt-1 border-t border-white/10 pt-2 text-[#AEAEAE] hover:bg-[#1A1A1A] hover:text-white disabled:pointer-events-none disabled:opacity-60",
										{
											"bg-[#1A1A1A] text-white": selectedIndex === logoutIndex,
											"!rounded-b-xl": isAuthenticated,
										},
									)}
								>
									{isSigningOut ? (
										<RiLoader4Line
											aria-hidden="true"
											className="size-4 animate-spin"
										/>
									) : (
										<RiLogoutBoxRLine aria-hidden="true" className="size-4" />
									)}
									<span className="flex-1">
										{isSigningOut ? "Signing out…" : "Log out"}
									</span>
								</button>
								{signOutError ? (
									<p
										id="dynamic-island-sign-out-error"
										className="px-2 pb-1 pt-1 text-[11px] leading-4 text-red-400"
										role="alert"
									>
										{signOutError}
									</p>
								) : null}
							</motion.div>
						) : null}
					</motion.div>
				</motion.div>
			</motion.nav>
		</>
	);
};

export default DynamicIsland;
