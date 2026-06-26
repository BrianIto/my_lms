"use client";

import { RiArrowDownSLine } from "@remixicon/react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import type { ElementType } from "react";
import { cn } from "#/utils/cn";

export type IslandRoute = "/" | "/dashboard" | "/admin";
export type IslandLeaf = { name: string; to: IslandRoute };
export type IslandPage = IslandLeaf & {
	icon?: ElementType;
	sub?: IslandLeaf[];
};

interface Props {
	page: IslandPage;
	index: number;
	onToggle: () => void;
	onClose: () => void;
	isOpen: boolean;
	isSelected: boolean;
}

const itemClassName =
	"flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors first:mt-1 last-of-type:mb-0.75 last-of-type:rounded-b-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40";

const ListItem: React.FC<Props> = ({
	page,
	index,
	onToggle,
	onClose,
	isOpen,
	isSelected,
}) => {
	const Icon = page.icon;

	return (
		<>
			<motion.div
				key={page.name}
				initial={{ opacity: 0 }}
				animate={{
					opacity: 1,
					transition: {
						delay: index * 0.07,
					},
				}}
			>
				{page.sub ? (
					<button
						type="button"
						onClick={(event) => {
							event.stopPropagation();
							onToggle();
						}}
						aria-expanded={isOpen}
						className={cn(
							itemClassName,
							"rounded-b-none border-b border-white/10",
							{
								"bg-[#1A1A1A] text-white": isSelected,
							},
						)}
					>
						{Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
						<span className="flex-1">{page.name}</span>
						<RiArrowDownSLine
							aria-hidden="true"
							className={cn("size-4 duration-200", {
								"rotate-180": isOpen,
							})}
						/>
					</button>
				) : (
					<Link
						to={page.to}
						onClick={(event) => {
							event.stopPropagation();
							onClose();
						}}
						className={cn(itemClassName, "no-underline hover:bg-[#1A1A1A]", {
							"bg-[#1A1A1A] text-white": isSelected,
						})}
					>
						{Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
						<span className="flex-1">{page.name}</span>
					</Link>
				)}
			</motion.div>
			<motion.div className="mb-1">
				<AnimatePresence>
					{isOpen && page.sub ? (
						<div className="my-0">
							{page.sub.map((item) => (
								<motion.div
									key={item.name}
									initial={{
										translateY: -33.6,
										maxHeight: 0,
										opacity: 0,
									}}
									animate={{
										translateY: 0,
										maxHeight: 33.6,
										opacity: 1,
									}}
									exit={{
										scale: 0,
										maxHeight: 0,
										opacity: 0,
									}}
								>
									<Link
										to={item.to}
										onClick={(event) => {
											event.stopPropagation();
											onClose();
										}}
										className="flex w-full items-center gap-3 rounded-b-md rounded-t-md px-8 py-1.5 text-left text-sm text-[#AAA] no-underline hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 first:mt-1 last-of-type:mb-0.75"
									>
										{item.name}
									</Link>
								</motion.div>
							))}
						</div>
					) : null}
				</AnimatePresence>
			</motion.div>
		</>
	);
};

export default ListItem;
