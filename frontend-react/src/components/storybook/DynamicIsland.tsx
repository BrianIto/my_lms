"use client";

import { useGSAP } from "@gsap/react";
import {
	RiArrowDownLine,
	RiComputerLine,
	RiHome2Line,
	RiMoneyDollarCircleLine,
	RiPhoneLine,
	RiStarSmileLine,
} from "@remixicon/react";
import gsap from "gsap";
import { AnimatePresence, motion, stagger } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { useScroll } from "../context/ScrollContext";
import ListItem from "./DynamicIsland.ListItem";
import TextChangeAnimate from "./TextChangeAnimate";

// Navigation mapping for all sections
const navigationMap: Record<string, string> = {
	Homepage: "#hero-section",
	"Stack for": "#stack-section",
	"Frontend Development": "#stack-section",
	"Data Visualization": "#stack-section",
	"Featured Projects": "#projects-section",
	Integra: "#projects-section",
	Commitsense: "#projects-section",
	"DLMR Split Payments": "#projects-section",
	Pricing: "#pricing-section",
	Contact: "#contact-section",
};

const DynamicIsland: React.FC = () => {
	const [open, setOpen] = useState(false);
	const { scrollSmootherRef, currentSection } = useScroll();
	const iconRef = useRef<HTMLDivElement>(null);

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

	const pages = [
		{
			name: "Homepage",
			icon: RiHome2Line,
		},
		{
			name: "Stack for",
			icon: RiComputerLine,
			sub: [
				{
					name: "Frontend Development",
				},
				{
					name: "Data Visualization",
				},
			],
		},
		{
			name: "Featured Projects",
			icon: RiStarSmileLine,
			sub: [
				{ name: "Integra" },
				{ name: "Commitsense" },
				{ name: "DLMR Split Payments" },
			],
		},
		{ name: "Pricing", icon: RiMoneyDollarCircleLine },
		{ name: "Contact", icon: RiPhoneLine },
	];

	const [pageIndex, setPageIndex] = useState(-1);
	const [selectedIndex, setSelectedIndex] = useState(0);

	// Handle keyboard events
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Toggle with "/" key
			if (e.key === "/") {
				e.preventDefault();
				setOpen((prev) => !prev);
				return;
			}

			// Only handle other keys when open
			if (open) {
				if (e.key === "Escape") {
					e.preventDefault();
					setOpen(false);
					setPageIndex(-1);
					setSelectedIndex(0);
				} else if (e.key === "ArrowDown") {
					e.preventDefault();
					setSelectedIndex((prev) => (prev + 1) % pages.length);
				} else if (e.key === "ArrowUp") {
					e.preventDefault();
					setSelectedIndex((prev) => (prev - 1 + pages.length) % pages.length);
				} else if (e.key === "Enter") {
					e.preventDefault();
					const selectedPage = pages[selectedIndex];
					if (selectedPage.sub) {
						// Toggle submenu
						setPageIndex((prev) =>
							prev === selectedIndex ? -1 : selectedIndex,
						);
					} else {
						// Navigate to page
						handleNavigate(selectedPage.name);
					}
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, selectedIndex, pageIndex]);

	// Reset selected index when closing
	useEffect(() => {
		if (!open) {
			setSelectedIndex(0);
		}
	}, [open]);

	// Handle navigation
	const handleNavigate = (pageName: string) => {
		const sectionId = navigationMap[pageName];
		if (sectionId && scrollSmootherRef.current) {
			scrollSmootherRef.current.scrollTo(sectionId, true, "top 100px");
			setOpen(false);
			setPageIndex(-1);
		}
	};

	gsap.registerPlugin(useGSAP);

	useGSAP(() => {
		gsap.from(".dynamic-island", {
			duration: 1,
			y: 4,
			scaleX: 0,
			opacity: 0,
			ease: "elastic.inOut",
		});
	}, []);

	// Get current section icon
	const CurrentIcon = currentSection?.icon || RiHome2Line;

	return (
		<>
			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						onClick={() => setOpen(false)}
						className="fixed top-0 left-0 w-screen h-screen z-[999] bg-black/10"
					/>
				)}
			</AnimatePresence>

			<motion.div
				animate={open ? "open" : "closed"}
				className="fixed outline-none z-[9999] top-4 flex flex-col "
			>
				<motion.button
					variants={variants}
					onClick={() => setOpen((prev) => !prev)}
					className={cn(
						"dynamic-island  flex flex-col group  text-[#AEAEAE] bg-black py-1 rounded-[16px] min-w-44 text-[15px] shadow-lg px-1.5 font-medium font-sans ",
						{ "hover:text-white": !open },
						{ "text-white": open },
					)}
				>
					<motion.div className="w-full h-[24px] flex items-center">
						<motion.div
							ref={iconRef}
							className="rounded-full duration-300 w-5 flex items-center justify-center h-5 bg-transparent"
						>
							<CurrentIcon className="w-3.5  text-[#AEAEAE]" />
						</motion.div>
						<AnimatePresence mode="wait">
							<TextChangeAnimate
								key={currentSection?.name || "Homepage"}
								text={currentSection?.name || "Homepage"}
							/>
						</AnimatePresence>

						<div className="flex gap-1">
							<div className="-ml-5 rounded opacity-50 text-[12px] bg-white/5 w-5 border border-white/10">
								/
							</div>
							<div className="rounded-full group-hover:bg-[#888] duration-300 w-5 flex items-center justify-center h-5 bg-[#1A1A1A]">
								<RiArrowDownLine
									className={cn(
										"duration-200 w-3.5 group-hover:text-black text-[#AEAEAE]",
										{
											"rotate-180": open,
										},
									)}
								/>
							</div>
						</div>
					</motion.div>
					<motion.div
						className="w-full"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
					>
						<AnimatePresence>
							{open &&
								pages.map((page, index) => (
									<ListItem
										key={page.name}
										onToggle={() => {
											setPageIndex((prev) => (prev === index ? -1 : index));
										}}
										onNavigate={handleNavigate}
										isOpen={pageIndex === index}
										isSelected={selectedIndex === index}
										page={page}
										index={index}
									/>
								))}
						</AnimatePresence>
					</motion.div>
				</motion.button>
			</motion.div>
		</>
	);
};

export default DynamicIsland;
