"use client";

import { RiArrowDownSLine } from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/utils/cn";

interface Props {
	page: {
		name: string;
		icon?: React.ElementType;
		sub?: { name: string }[];
	};
	index: number;
	onToggle: () => void;
	onNavigate: (pageName: string) => void;
	isOpen: boolean;
	isSelected: boolean;
}
const ListItem: React.FC<Props> = ({
	page,
	index,
	onToggle,
	onNavigate,
	isOpen,
	isSelected,
}) => {
	return (
		<>
			<motion.button
				key={page.name}
				initial={{
					opacity: 0,
				}}
				animate={{
					opacity: 1,
					transition: {
						delay: index * 0.07,
					},
				}}
				onClick={(e) => {
					e.stopPropagation();
					if (page.sub) {
						onToggle();
					} else {
						onNavigate(page.name);
					}
				}}
				className={cn(
					"w-full  flex last-of-type:rounded-b-xl rounded-b-md rounded-t-md px-2 py-1.5 first:mt-1 last-of-type:mb-0.75 text-sm text-left items-center gap-3 transition-colors",
					{
						"hover:bg-[#1A1A1A]": page.sub === undefined,
					},
					{
						"border-b rounded-b-none border-white/10": page.sub !== undefined,
					},
					{
						"bg-[#1A1A1A]": isSelected,
					},
				)}
			>
				{page.icon && <page.icon className="size-4" />}{" "}
				<span className="flex-1">{page.name}</span>
				{page.sub && (
					<RiArrowDownSLine
						className={cn("size-4 duration-200", {
							"rotate-180": isOpen,
						})}
					/>
				)}
			</motion.button>
			<motion.div className="mb-1">
				<AnimatePresence>
					{isOpen && (
						<div className="my-0">
							{page.sub?.map((s) => (
								<motion.button
									key={s.name}
									initial={{
										translateY: -33.6,
										maxHeight: 0,
										opacity: 0,
										padding: "0 2rem",
									}}
									animate={{
										translateY: 0,
										maxHeight: 33.6,
										opacity: 1,
										padding: "0.375rem 2rem",
									}}
									exit={{
										scale: 0,
										maxHeight: 0,
										opacity: 0,
										padding: 0,
									}}
									onClick={(e) => {
										e.stopPropagation();
										onNavigate(s.name);
									}}
									className={cn(
										"w-full  hover:bg-[#1A1A1A] flex text-[#AAA] rounded-b-md rounded-t-md first:mt-1 last-of-type:mb-0.75 text-sm text-left items-center gap-3 pl-8",
									)}
								>
									{s.name}
								</motion.button>
							))}
						</div>
					)}
				</AnimatePresence>
			</motion.div>
		</>
	);
};

export default ListItem;
