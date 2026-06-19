"use client";

import { motion } from "motion/react";
import { cn } from "@/utils/cn";

interface Props {
	enabled?: boolean;
	onToggle: () => void;
}

const DisableCursor: React.FC<Props> = ({
	enabled = true,
	onToggle = () => {},
}) => {
	return (
		<button
			onClick={onToggle}
			className="fixed z-[9999] gap-2 text-[14px] bottom-0 right-0 px-2 py-1 bg-[#333] border-t border-white/20 border-l font-sans items-center flex text-white"
		>
			Custom cursor
			<motion.div
				transition={{ duration: 0.1 }}
				className={cn(
					"relative justify-end w-6 h-3.5 bg-[#666] flex items-center px-0.5 border-white/20 border",
					{
						"justify-end  bg-[#666] ": enabled,
						"justify-start bg-transparent": !enabled,
					},
				)}
			>
				<motion.div layout className="w-2 h-2 bg-white"></motion.div>
			</motion.div>
		</button>
	);
};
export default DisableCursor;
