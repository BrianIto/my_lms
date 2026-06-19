"use client";

import { motion } from "motion/react";
import { memo, useMemo } from "react";
import { useWindowDimensions } from "@/hooks/useWindowDimensions";

interface Props {
	height: number;
}

const Grid: React.FC<Props> = ({ height }) => {
	const { isMobile } = useWindowDimensions();
	const squareSize = isMobile ? 16 : 56;
	const rowCount = Math.ceil(Math.max(height, 0) / squareSize);

	const rows = useMemo(
		() => Array.from({ length: rowCount }, (_, i) => i),
		[rowCount],
	);

	return (
		<div className="pointer-events-none absolute w-full z-[-1]" style={{ height }}>
			{/** Left Side */}
			<motion.div
				className="w-0.25 bg-white/10 absolute"
				initial={{ scaleY: 0, left: squareSize }}
				animate={{ scaleY: 1, left: squareSize }}
				transition={{ duration: 0.9, ease: "easeOut" }}
				style={{ height, transformOrigin: "top" }}
			/>
			<motion.div
				className="w-0.25 bg-white/10 absolute"
				initial={{ scaleY: 0, left: squareSize * 2 }}
				animate={{ scaleY: 1, left: squareSize * 2 }}
				transition={{ duration: 0.9, ease: "easeOut" }}
				style={{ height, transformOrigin: "top" }}
			/>
			{rows.map((i) => (
				<motion.div
					key={`left-${i}`}
					className="left-0 top-8 h-0.25 absolute bg-white/10"
					initial={{ scaleX: 0 }}
					whileInView={{ scaleX: 1 }}
					viewport={{ once: true, margin: "150px" }}
					transition={{ duration: 0.25, ease: "easeOut" }}
					style={{
						top: 32 + squareSize * i,
						width: isMobile ? (i % 2 ? 44 : 56) : i % 2 ? 144 : 176,
						transformOrigin: "left",
					}}
				/>
			))}

			{/** Right Side */}
			<motion.div
				className="w-0.25 bg-white/10 absolute"
				initial={{ scaleY: 0, right: squareSize }}
				animate={{ scaleY: 1, right: squareSize }}
				transition={{ duration: 0.9, ease: "easeOut" }}
				style={{ height, transformOrigin: "top" }}
			/>
			<motion.div
				className="w-0.25 bg-white/10 absolute"
				initial={{ scaleY: 0, right: squareSize * 2 }}
				animate={{ scaleY: 1, right: squareSize * 2 }}
				transition={{ duration: 0.9, ease: "easeOut" }}
				style={{ height, transformOrigin: "top" }}
			/>
			{rows.map((i) => (
				<motion.div
					key={`right-${i}`}
					className="right-0 top-8 h-0.25 absolute bg-white/10"
					initial={{ scaleX: 0 }}
					whileInView={{ scaleX: 1 }}
					viewport={{ once: true, margin: "150px" }}
					transition={{ duration: 0.25, ease: "easeOut" }}
					style={{
						top: 32 + squareSize * i,
						width: isMobile ? (i % 2 ? 44 : 56) : i % 2 ? 144 : 176,
						transformOrigin: "right",
					}}
				/>
			))}
		</div>
	);
};

export default memo(Grid);
