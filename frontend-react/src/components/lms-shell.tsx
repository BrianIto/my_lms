import { Link } from "@tanstack/react-router";
import { BookOpenCheck, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "#/components/ui/button.tsx";
import { cn } from "#/lib/utils.ts";

const navItems = [
	{ to: "/admin", label: "Admin" },
	{ to: "/dashboard", label: "User view" },
];

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
				"min-h-screen overflow-hidden px-4 py-6 text-foreground",
				className,
			)}
		>
			<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_8%,rgba(255,186,90,0.11),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.07),transparent_24%)]" />
			<div className="pointer-events-none fixed inset-y-0 left-0 -z-10 w-[24vw] border-r border-white/10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:56px_56px] opacity-40" />
			<div className="mx-auto flex w-full max-w-[1180px] flex-col gap-10">
				<header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
					<Link
						to="/"
						className="inline-flex items-center gap-3 no-underline"
						aria-label="LMS home"
					>
						<span className="flex size-10 items-center justify-center rounded-full border border-amber/30 bg-amber/10 shadow-[inset_0_0_24px_rgba(255,186,90,0.08)]">
							<BookOpenCheck aria-hidden="true" />
						</span>
						<span className="font-display text-2xl tracking-tighter text-white">
							Course OS
						</span>
					</Link>
					<nav className="flex w-fit items-center gap-1 rounded-2xl border border-white/15 bg-black/70 p-1 backdrop-blur">
						{navItems.map((item) => (
							<Button key={item.to} variant="ghost" size="sm" asChild>
								<Link
									to={item.to}
									className="text-[#bfbfbf] no-underline hover:text-white"
								>
									{item.label}
								</Link>
							</Button>
						))}
					</nav>
				</header>

				<section className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
					<div className="flex flex-col gap-4">
						<div className="flex w-fit items-center gap-2 rounded-full border border-amber/20 bg-amber/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber">
							<Sparkles aria-hidden="true" />
							{eyebrow}
						</div>
						<h1 className="max-w-[760px] font-display text-[52px] leading-[0.94] tracking-tighter text-white md:text-[76px]">
							{title}
						</h1>
						<p className="max-w-[680px] text-[15px] leading-7 tracking-tight text-[#bfbfbf]">
							{description}
						</p>
					</div>
					<div className="rounded-lg border border-white/15 bg-black/50 p-5 shadow-[inset_0_0_24px_rgba(255,186,90,0.04)]">
						<div className="flex items-center gap-3 text-sm text-[#cccccc]">
							<ShieldCheck aria-hidden="true" />
							<span>
								Better Auth gate: Google sign-in + beta allowlist before private
								content.
							</span>
						</div>
					</div>
				</section>

				{children}
			</div>
		</main>
	);
}
