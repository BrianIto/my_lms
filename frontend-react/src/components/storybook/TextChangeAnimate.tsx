import { motion } from "motion/react";
import { Teko } from "next/font/google";

const TextChangeAnimate: React.FC<{ text: string }> = ({ text }) => {
	return (
		<motion.div
			initial={{
				opacity: 0,
				y: 4,
			}}
			animate={{
				opacity: 1,
				y: 0,
			}}
			exit={{
				opacity: 0,
				y: 4,
			}}
			className="flex-1 px-2 flex justify-center"
		>
			{text || "Homepage"}
		</motion.div>
	);
};

export default TextChangeAnimate;
