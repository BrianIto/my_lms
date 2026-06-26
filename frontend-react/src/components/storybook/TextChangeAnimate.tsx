import { motion } from "motion/react";

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
			className="flex flex-1 justify-center px-2"
		>
			{text || "Home"}
		</motion.div>
	);
};

export default TextChangeAnimate;
