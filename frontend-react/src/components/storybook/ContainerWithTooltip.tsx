"use client";

import clsx, { type ClassValue } from "clsx";
import React, {
	memo,
	type PropsWithChildren,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";

interface Props {
	tooltipLabel: string | React.ReactNode;
	tooltipClass?: ClassValue;
	className?: ClassValue;
	position?: "top" | "bottom" | "left" | "right";
	style?: React.CSSProperties;
	condition?: boolean;
	margin?: number;
}

const ContainerWithTooltip: React.FC<PropsWithChildren<Props>> = ({
	tooltipLabel,
	children,
	className,
	tooltipClass,
	position = "top",
	style = {},
	margin = 4,
	condition = true,
}) => {
	const ref = useRef<HTMLDivElement>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);
	const [pos, setPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);
	const [visible, setVisible] = useState(false);

	const isMounted = useMemo(() => typeof window !== "undefined", []);

	const getPositionRectAs = React.useCallback(() => {
		if (tooltipRef.current && ref.current) {
			const tooltipBox = tooltipRef.current.getBoundingClientRect();
			const triggerRect = ref.current.getBoundingClientRect();
			switch (position) {
				case "top":
					return {
						top: triggerRect.top - tooltipBox.height - margin,
						left: triggerRect.left + triggerRect.width / 2,
					};
				case "bottom":
					return {
						top: triggerRect.bottom + margin,
						left: triggerRect.left + triggerRect.width / 2,
					};
				case "left":
					return {
						top:
							triggerRect.top + triggerRect.height / 2 - tooltipBox.height / 2,
						left: triggerRect.left - tooltipBox.width - margin,
					};
				case "right":
					return {
						top:
							triggerRect.top + triggerRect.height / 2 - tooltipBox.height / 2,
						left: triggerRect.right + margin,
					};
				default:
					return null;
			}
		}
		return null;
	}, [position]);

	const showTooltip = () => {
		setVisible(true);
	};

	const hideTooltip = () => setVisible(false);

	// Update position when visible changes
	useEffect(() => {
		if (visible && ref.current) {
			const size = getPositionRectAs();
			if (size && size.top > 0) {
				setPosition(size as { top: number; left: number });
			}
		}
	}, [visible, getPositionRectAs]);

	// Handle scroll and resize events
	useEffect(() => {
		const handleScrollOrResize = () => hideTooltip();
		window.addEventListener("scroll", handleScrollOrResize, true);
		window.addEventListener("resize", handleScrollOrResize);
		return () => {
			window.removeEventListener("scroll", handleScrollOrResize, true);
			window.removeEventListener("resize", handleScrollOrResize);
		};
	}, []);

	useEffect(() => {
		if (document) 3;
		{
			if (!visible) return;

			const isHovering = (el: HTMLElement | null): boolean =>
				!!el && el.matches(":hover");

			const handleMouseMove = () => {
				if (!isHovering(ref.current)) {
					setVisible(false);
				}
			};

			document.addEventListener("mousemove", handleMouseMove);
			return () => document.removeEventListener("mousemove", handleMouseMove);
		}
	}, [visible]);

	if (
		typeof tooltipLabel === "string" &&
		(!tooltipLabel || tooltipLabel.length === 0 || tooltipLabel.trim() === "")
	) {
		return children;
	}

	return (
		<>
			<div
				ref={ref}
				onMouseEnter={showTooltip}
				className={clsx(className, "cursor-pointer")}
			>
				{children}
			</div>

			{isMounted /* Looks shady but if you don't do that SSR crashes really hard */ &&
				createPortal(
					<div
						ref={tooltipRef}
						className={cn(
							"pointer-events-none fixed z-9999 max-w-[550px] whitespace-normal rounded border border-white/20 bg-background px-2.5 py-1.5 font-medium text-[12px] text-secondary-text leading-[18px] shadow-md backdrop-blur-sm transition-[opacity,transform,backdrop-filter] duration-150",
							(position === "top" || position === "bottom") &&
								"-translate-x-1/2",
							tooltipClass,
						)}
						style={{
							top: pos?.top ?? 0,
							left: pos?.left ?? 0,
							opacity: visible ? 1 : 0,
							transform: `scale(${visible ? 1 : 0.95})`,
							...style,
						}}
					>
						{tooltipLabel}
					</div>,
					document.body,
				)}
		</>
	);
};

export default memo(ContainerWithTooltip);
