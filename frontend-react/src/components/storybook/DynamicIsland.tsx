"use client";

import { useGSAP } from "@gsap/react";
import {
	RiAdminLine,
	RiArrowDownLine,
	RiBookOpenLine,
	RiHome2Line,
} from "@remixicon/react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import gsap from "gsap";
import { AnimatePresence, motion, stagger } from "motion/react";
import { useCallback, useEffect, useState } from "react";
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

gsap.registerPlugin(useGSAP);

const DynamicIsland: React.FC = () => {
	const [open, setOpen] = useState(false);
	const [pageIndex, setPageIndex] = useState(-1);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const navigate = useNavigate();
	const location = useLocation();
	const activePage = getActivePage(location.pathname);
	const CurrentIcon = activePage.icon ?? RiHome2Line;

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
				setSelectedIndex((prev) => (prev + 1) % pages.length);
				return;
			}

			if (event.key === "ArrowUp") {
				event.preventDefault();
				setSelectedIndex((prev) => (prev - 1 + pages.length) % pages.length);
				return;
			}

			if (event.key === "Enter") {
				event.preventDefault();
				const selectedPage = pages[selectedIndex];

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
	}, [open, selectedIndex, handleNavigate, closeIsland]);

	useEffect(() => {
		if (!open) {
			setSelectedIndex(0);
		}
	}, [open]);

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
						<AnimatePresence mode="wait">
							<TextChangeAnimate key={activePage.name} text={activePage.name} />
						</AnimatePresence>

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
						<AnimatePresence>
							{open
								? pages.map((page, index) => (
										<ListItem
											key={page.name}
											onToggle={() => {
												setPageIndex((prev) => (prev === index ? -1 : index));
											}}
											onClose={closeIsland}
											isOpen={pageIndex === index}
											isSelected={selectedIndex === index}
											page={page}
											index={index}
										/>
									))
								: null}
						</AnimatePresence>
					</motion.div>
				</motion.div>
			</motion.nav>
		</>
	);
};

export default DynamicIsland;
