import { LmsTopbar } from "#/components/lms-topbar.tsx";
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
				"relative min-h-screen overflow-hidden bg-background px-4 py-4 text-foreground sm:py-6",
				className,
			)}
		>
			<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_8%,rgba(255,186,90,0.105),transparent_27%),radial-gradient(circle_at_50%_58%,rgba(255,255,255,0.052),transparent_36%)]" />
			<div className="pointer-events-none fixed inset-y-0 left-0 -z-10 w-[34vw] origin-left border-r border-white/10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:16px_16px] opacity-25 md:w-[28vw] md:bg-[size:56px_56px] md:opacity-35" />
			<div className="pointer-events-none fixed inset-y-0 right-0 -z-10 w-[34vw] origin-right border-l border-white/10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:16px_16px] opacity-20 md:w-[28vw] md:bg-[size:56px_56px] md:opacity-30" />
			<div className="pointer-events-none fixed inset-x-[34vw] top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:inset-x-[28vw]" />
			<svg
				className="hero-orbit pointer-events-none fixed left-1/2 top-[210px] -z-10 w-[420px] opacity-35"
				viewBox="0 0 44 44"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
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
			<div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 md:gap-10">
				<LmsTopbar />

				<section className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
					<div className="flex flex-col gap-4">
						<div className="flex w-fit items-center gap-2 rounded-full bg-amber/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
							{eyebrow}
						</div>
						<h1 className="max-w-[760px] font-display text-[52px] leading-[0.94] tracking-tighter text-white [text-shadow:0px_12px_88px_rgba(255,255,255,0.18)] md:text-[76px]">
							{title}
						</h1>
						<p className="max-w-[680px] text-[15px] leading-7 tracking-tight text-[#bfbfbf]">
							{description}
						</p>
					</div>
				</section>

				{children}
			</div>
		</main>
	);
}
