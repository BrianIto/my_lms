import { cn } from "#/utils/cn";

export function CourseLogo({
	className,
	"aria-label": ariaLabel = "Agentic Engineering",
}: {
	className?: string;
	"aria-label"?: string;
}) {
	return (
		<svg
			className={cn("shrink-0", className)}
			viewBox="0 0 62 62"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-label={ariaLabel}
		>
			<path
				className="logo-path"
				d="M23 44V18l22 13-22 13Z"
				stroke="rgba(255,255,255,0.78)"
				strokeWidth="1.4"
				strokeLinejoin="round"
			/>
			<path
				className="logo-path"
				d="M46 18v26L24 31l22-13Z"
				stroke="rgba(255,186,90,0.72)"
				strokeWidth="1.4"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
