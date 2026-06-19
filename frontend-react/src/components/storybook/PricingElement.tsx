"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface Props {
	onClickPrice: () => void;
	method: {
		type: string;
		price: number;
		title: string;
		bullets: string[];
	};
}
const PricingElement: React.FC<Props> = ({ onClickPrice, method }) => {
	const [hovered, setHovered] = useState(false);

	return (
		<motion.button
			onClick={onClickPrice}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			className="pricing-el text-left border flex flex-col gap-3 p-6 relative bg-background rounded-lg duration-300 border-white/20 group/pricing"
		>
			<div className="absolute w-full h-full -z-2">
				<AnimatePresence>
					{hovered && (
						<motion.div
							animate={{
								rotate: 360,
							}}
							transition={{
								repeat: Infinity,
								duration: 6,
								ease: "linear",
							}}
							className="group-hover/pricing:opacity-100 rounded-full opacity-0 w-full -translate-x-6 -translate-y-6 blur-lg h-full absolute bg-amber/60"
						/>
					)}
					{hovered && (
						<motion.div
							initial={{
								opacity: 0,
								scale: 0.9,
							}}
							animate={{
								scale: 0.95,
								opacity: 1,
							}}
							exit={{
								opacity: 0,
								scale: 0.75,
							}}
							transition={{
								duration: 0.3,
								ease: "easeInOut",
							}}
							className="absolute -translate-x-6 -translate-y-6 bg-amber/60 w-full h-full blur-lg"
						/>
					)}
				</AnimatePresence>
			</div>
			<h2 className="font-sans leading-5.5 tracking-tighter text-[19px] font-medium">
				{method.type}
			</h2>

			<p className="font-sans leading-[47px] tracking-tight text-[40px] md:text-[48px] text-white">
				USD {method.price}
			</p>
			<h2 className="font-sans leading-5.5 tracking-tighter text-[19px] font-medium">
				{method.title}
			</h2>
			<ul className="mt-3 flex flex-col gap-2 text-[#BEBEBE] text-[14px] md:text-[15px] font-sans">
				{method.bullets.map((bullet) => (
					<li key={bullet}>{bullet}</li>
				))}
			</ul>
		</motion.button>
	);
};

export default PricingElement;
