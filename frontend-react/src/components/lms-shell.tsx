import { cn } from "#/lib/utils.ts";

export function LmsShell({
	eyebrow,
	title,
	description,
	children,
	className,
}: {
	eyebrow: string;
	title: string;
	description: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<main
			className={cn(
				"relative min-h-screen overflow-x-hidden bg-background px-3 pb-4 pt-20 text-foreground sm:px-4 sm:pb-6 sm:pt-22",
				className,
			)}
		>
			<div className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/3 border-r border-white/10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />
			<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_8%,rgba(255,186,90,0.105),transparent_27%),radial-gradient(circle_at_50%_58%,rgba(255,255,255,0.052),transparent_36%)]" />
			<div className="pointer-events-none fixed inset-y-0 left-0 -z-10 w-[34vw] origin-left border-r border-white/10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:16px_16px] opacity-25 md:w-[28vw] md:bg-[size:56px_56px] md:opacity-35" />
			<div className="pointer-events-none fixed inset-y-0 right-0 -z-10 w-[34vw] origin-right border-l border-white/10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:16px_16px] opacity-20 md:w-[28vw] md:bg-[size:56px_56px] md:opacity-30" />
			<div className="pointer-events-none fixed inset-x-[34vw] top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:inset-x-[28vw]" />
			<svg
				className="hero-orbit pointer-events-none fixed left-1/2 top-[190px] -z-10 w-[300px] opacity-25 sm:w-[420px] sm:opacity-35"
				viewBox="0 0 44 44"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				{" "}
				<circle
					stroke="rgba(255,255,255,0.18)"
					r="20"
					cx="22"
					cy="22"
					strokeWidth="0.25"
					strokeDasharray="0.8"
				/>
				<circle
					stroke="rgba(255,186,90,0.22)"
					r="16.5"
					cx="22"
					cy="22"
					strokeWidth="0.12"
					strokeDasharray="0.35 1.4"
				/>
			</svg>
			<div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 sm:gap-8 md:gap-10">
				<section className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
					<div className="flex min-w-0 flex-col gap-3 sm:gap-4">
						<div className="flex w-fit max-w-full items-center gap-2 rounded-full bg-amber/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50 sm:text-xs sm:tracking-[0.18em]">
							{eyebrow}
						</div>
						<h1 className="max-w-[760px] text-wrap font-display text-[clamp(2.55rem,13vw,3.25rem)] leading-[0.94] tracking-tighter text-white [text-shadow:0px_12px_88px_rgba(255,255,255,0.18)] md:text-[76px]">
							{title}
						</h1>
						<p className="max-w-[680px] text-[14px] leading-6 tracking-tight text-[#bfbfbf] sm:text-[15px] sm:leading-7">
							{description}
						</p>
					</div>
				</section>

				{children}
			</div>
		</main>
	);
}
