import { useGSAP } from "@gsap/react";
import {
	RiArrowRightLine,
	RiCheckboxCircleLine,
	RiLoader4Line,
	RiLock2Line,
} from "@remixicon/react";
import { createFileRoute } from "@tanstack/react-router";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { SplitText } from "gsap/SplitText";
import { type FormEvent, useRef, useState } from "react";
import { CourseLogo } from "#/components/course-logo.tsx";
import { SignInDialog } from "#/components/sign-in-dialog.tsx";
import GlowingTag from "#/components/storybook/GlowingTag";
import TagMarquee from "#/components/storybook/TagMarquee";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog.tsx";
import { Input } from "#/components/ui/input.tsx";
import { requestBetaAccess } from "#/lib/backend-api.ts";
import {
	formatBrazilianWhatsapp,
	isValidBrazilianWhatsapp,
	WHATSAPP_ERROR_MESSAGE,
} from "#/lib/brazilian-whatsapp.ts";
import { cn } from "#/utils/cn";

export const Route = createFileRoute("/")({ component: Home });

gsap.registerPlugin(useGSAP, SplitText, DrawSVGPlugin);

type RequestState =
	| { status: "idle"; message: string }
	| { status: "loading"; message: string }
	| { status: "success"; message: string }
	| { status: "error"; message: string };

const courseSignals = [
	"SDLC Application",
	"Agentic Context",
	"Agentic KPIs",
	"Software Architecture",
	"AI recursion",
];

function Home() {
	const [email, setEmail] = useState("");
	const [preferredName, setPreferredName] = useState("");
	const [whatsappContact, setWhatsappContact] = useState("");
	const [whatsappConsent, setWhatsappConsent] = useState(false);
	const [whatsappError, setWhatsappError] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [requestState, setRequestState] = useState<RequestState>({
		status: "idle",
		message: "",
	});
	const heroRef = useRef<HTMLDivElement>(null);

	useGSAP(
		() => {
			if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
				gsap.set(
					[
						".animated-text",
						".button",
						".marquee-container",
						".logo-path",
						".circle-path",
						".course-footnote",
						".rotate",
					],
					{ autoAlpha: 1 },
				);
				return;
			}

			const split = SplitText.create(".animated-text", { type: "chars" });

			gsap.from(".rotate", {
				duration: 20,
				rotate: 360,
				repeat: -1,
				ease: "none",
			});

			gsap.from(".rotate", {
				duration: 5,
				autoAlpha: 0,
				delay: 0.3,
			});

			const tl = gsap.timeline({ defaults: { force3D: true } });

			tl.from(split.chars, {
				duration: 0.22,
				y: 2,
				scale: 0.83,
				autoAlpha: 0,
				stagger: 0.035,
				ease: "circ.out",
			});
			tl.from(
				".button",
				{
					duration: 0.4,
					y: 4,
					autoAlpha: 0,
					stagger: 0.2,
					ease: "power2.inOut",
				},
				"<0.7",
			);
			tl.from(
				".marquee-container",
				{
					duration: 0.45,
					y: 4,
					autoAlpha: 0,
					ease: "power2.inOut",
				},
				">-0.1",
			);
			tl.from(
				".logo-path",
				{
					duration: 0.7,
					drawSVG: 0,
					stagger: 0.1,
				},
				">-0.2",
			);
			tl.from(
				".circle-path",
				{
					duration: 0.1,
					scale: 0,
					autoAlpha: 0,
					stagger: 0.1,
					transformOrigin: "center",
				},
				">-0.3",
			);
			tl.from(
				".course-footnote",
				{
					duration: 0.3,
					autoAlpha: 0,
				},
				">-0.7",
			);

			return () => split.revert();
		},
		{ scope: heroRef },
	);

	function updateWhatsappContact(value: string) {
		const formattedValue = formatBrazilianWhatsapp(value);
		setWhatsappContact(formattedValue);

		if (
			whatsappError &&
			(!formattedValue || isValidBrazilianWhatsapp(formattedValue))
		) {
			setWhatsappError("");
		}
	}

	async function submitBetaRequest(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const formattedWhatsappContact = whatsappContact.trim();

		if (
			formattedWhatsappContact &&
			!isValidBrazilianWhatsapp(formattedWhatsappContact)
		) {
			setWhatsappError(WHATSAPP_ERROR_MESSAGE);
			setRequestState({ status: "idle", message: "" });
			return;
		}

		setWhatsappError("");
		setRequestState({ status: "loading", message: "Requesting access…" });

		try {
			const response = await requestBetaAccess({
				email,
				preferredName,
				whatsappContact: formattedWhatsappContact,
				whatsappConsent,
			});
			setEmail(response.email);
			setRequestState({ status: "success", message: response.message });
		} catch (error) {
			setRequestState({
				status: "error",
				message:
					error instanceof Error
						? error.message
						: "Could not request beta access.",
			});
		}
	}

	const isLoading = requestState.status === "loading";

	return (
		<main className="relative min-h-screen overflow-hidden bg-background px-4 text-foreground">
			<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_24%,rgba(255,186,90,0.12),transparent_27%),radial-gradient(circle_at_50%_72%,rgba(255,255,255,0.055),transparent_34%)]" />
			<div className="pointer-events-none fixed inset-y-0 left-0 -z-10 w-[30vw] border-r border-white/10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:16px_16px] opacity-30 md:bg-[size:56px_56px]" />
			<div className="pointer-events-none fixed inset-y-0 right-0 -z-10 w-[30vw] border-l border-white/10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:16px_16px] opacity-20 md:bg-[size:56px_56px]" />

			<div
				id="hero-section"
				ref={heroRef}
				className="relative mx-auto flex h-screen max-w-[980px] flex-col flex-wrap items-center justify-center gap-3 text-center"
			>
				<div className="relative z-10 mb-2 flex w-full justify-center -mt-14 md:-mt-32 lg:mb-6">
					<CourseLogo className="mb-4 w-[90px]" />
				</div>

				<svg
					className="rotate pointer-events-none absolute w-9/12 md:w-96"
					viewBox="0 0 44 44"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					aria-hidden="true"
				>
					<circle
						stroke="rgba(255, 255, 255, 0.2)"
						r="20"
						cx="22"
						cy="22"
						strokeWidth="0.25"
						strokeDasharray="0.8"
					/>
					<circle
						stroke="rgba(255, 186, 90, 0.22)"
						r="16.5"
						cx="22"
						cy="22"
						strokeWidth="0.12"
						strokeDasharray="0.35 1.4"
					/>
				</svg>

				<div className="relative z-10 max-w-md md:max-w-lg lg:max-w-3xl">
					<div className="marquee-container mb-12">
						<TagMarquee areas={courseSignals} />
					</div>

					<div className="text-center">
						<h1 className="animated-text mb-[-31px] font-display text-[52px] tracking-tighter text-[#8C8C8C] md:mb-[-37px] lg:text-[76px]">
							Your Tactical course in
						</h1>
						<h1 className="animated-text mt-2 font-display text-[52px] tracking-tighter text-white [text-shadow:0px_12px_88px_rgba(255,255,255,0.25)] md:mt-0 lg:text-[76px]">
							Agentic Engineering.
						</h1>
					</div>

					<div className="mx-auto mt-6 max-w-[620px] text-center text-[14px] leading-6 tracking-tight text-white/75 md:mt-8 md:text-[15px]">
						A course for shipping agent systems with tools, evals, memory,
						guardrails, and production constraints. Not available yet — request
						access for the beta cohort.
					</div>

					<div className="mx-auto mt-12 flex w-fit flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
						<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
							<DialogTrigger asChild>
								<GlowingTag size="lg">
									<RiLock2Line aria-hidden="true" className="size-4 mr-2" />
									Request beta access
								</GlowingTag>
							</DialogTrigger>
							<BetaAccessDialog
								email={email}
								isLoading={isLoading}
								requestState={requestState}
								preferredName={preferredName}
								whatsappContact={whatsappContact}
								whatsappConsent={whatsappConsent}
								whatsappError={whatsappError}
								onEmailChange={setEmail}
								onPreferredNameChange={setPreferredName}
								onWhatsappContactChange={updateWhatsappContact}
								onWhatsappConsentChange={setWhatsappConsent}
								onSubmit={submitBetaRequest}
							/>
						</Dialog>

						<SignInDialog
							trigger={
								<button
									type="button"
									className="button inline-flex items-center gap-2 px-3 py-3 text-sm tracking-tight text-[#cccccc] no-underline hover:text-white"
								>
									Already invited? Sign in
									<RiArrowRightLine aria-hidden="true" className="size-3" />
								</button>
							}
						/>
					</div>
				</div>

				<div className="course-footnote absolute bottom-8 max-w-2xl px-8 text-center text-[14px] leading-6 text-white/45 lg:max-w-4xl">
					this course is built for engineers who want tactics over hype: agent
					loops, evaluations, system boundaries, and the judgment to ship
					reliably.
				</div>
			</div>
		</main>
	);
}

function BetaAccessDialog({
	email,
	isLoading,
	requestState,
	preferredName,
	whatsappContact,
	whatsappConsent,
	whatsappError,
	onEmailChange,
	onPreferredNameChange,
	onWhatsappContactChange,
	onWhatsappConsentChange,
	onSubmit,
}: {
	email: string;
	isLoading: boolean;
	requestState: RequestState;
	preferredName: string;
	whatsappContact: string;
	whatsappConsent: boolean;
	whatsappError: string;
	onEmailChange: (email: string) => void;
	onPreferredNameChange: (name: string) => void;
	onWhatsappContactChange: (contact: string) => void;
	onWhatsappConsentChange: (consent: boolean) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
	return (
		<DialogContent className="max-w-[560px] overflow-hidden rounded-[28px] border-white/20 bg-background/95 p-0 shadow-[0_26px_140px_rgba(0,0,0,0.82),0_0_90px_rgba(255,186,90,0.08)]">
			<div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,186,90,0.09),transparent_34%),radial-gradient(circle_at_50%_70%,rgba(255,255,255,0.06),transparent_44%)]" />
			<div className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/3 border-r border-white/10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:16px_16px] opacity-25" />
			<div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-1/3 border-l border-white/10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:16px_16px] opacity-20" />
			<svg
				className="pointer-events-none absolute left-1/2 top-[138px] z-0 w-[360px] -translate-x-1/2 opacity-70 hero-orbit"
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

			<div className="relative z-10 px-6 pb-6 pt-8 sm:px-8 sm:pb-8">
				<DialogHeader className="mx-auto max-w-[430px] gap-3 pr-0 text-center">
					<div className="mx-auto flex w-fit items-center gap-2 rounded-full  border-white/15 bg-background/20 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/50">
						<span className="size-1.5 rounded-full bg-green-500 shadow-lg" />
						open cohort intake
					</div>
					<DialogTitle className="text-[42px] leading-[0.9] md:text-[52px]">
						<span className="block text-[#8c8c8c]">Request</span>
						<span className="block text-white [text-shadow:0px_12px_88px_rgba(255,255,255,0.22)]">
							beta access.
						</span>
					</DialogTitle>
					<DialogDescription className="mx-auto max-w-[390px] text-center text-[14px] leading-6 text-white/70">
						Drop the email you want reviewed for the beta cohort. Add your
						preferred name and WhatsApp consent if you want a faster human
						follow-up.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={onSubmit} className="mt-7 grid gap-4">
					<div className="grid gap-2">
						<label
							className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#999] sm:text-left"
							htmlFor="beta-email"
						>
							Email address
						</label>
						<Input
							id="beta-email"
							type="email"
							required
							placeholder="you@example.com"
							value={email}
							onChange={(event) => onEmailChange(event.target.value)}
							className="h-13 rounded-full border-white/15 bg-background/80 px-5 text-center text-white placeholder:text-[#8c8c8c] focus-visible:border-amber/40 sm:text-left"
							aria-invalid={requestState.status === "error"}
							autoComplete="email"
						/>
					</div>

					<div className="grid gap-2 sm:grid-cols-2">
						<div className="flex flex-col items-start gap-2">
							<label
								className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#999] sm:text-left"
								htmlFor="beta-name"
							>
								Preferred name
							</label>
							<Input
								id="beta-name"
								type="text"
								placeholder="optional"
								value={preferredName}
								onChange={(event) => onPreferredNameChange(event.target.value)}
								className="h-12 rounded-full border-white/15 bg-background/80 px-5 text-center text-white placeholder:text-[#8c8c8c] focus-visible:border-amber/40 sm:text-left"
								autoComplete="given-name"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<label
								className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#999] sm:text-left"
								htmlFor="beta-whatsapp"
							>
								WhatsApp
							</label>
							<Input
								id="beta-whatsapp"
								type="tel"
								inputMode="tel"
								placeholder="+55 (92) 98437-4357"
								value={whatsappContact}
								onChange={(event) =>
									onWhatsappContactChange(event.target.value)
								}
								className="h-12 rounded-full border-white/15 bg-background/80 px-5 text-center text-white placeholder:text-[#8c8c8c] focus-visible:border-amber/40 aria-invalid:border-red-400/70 aria-invalid:ring-red-400/20 sm:text-left"
								autoComplete="tel"
								aria-describedby={
									whatsappError ? "beta-whatsapp-error" : undefined
								}
								aria-invalid={Boolean(whatsappError)}
								maxLength={19}
							/>
							{whatsappError ? (
								<p
									id="beta-whatsapp-error"
									className="px-3 text-center text-xs leading-5 text-red-400 sm:text-left"
								>
									{whatsappError}
								</p>
							) : null}
						</div>
					</div>

					<label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-background/55 p-4 text-left text-[12px] leading-5 text-white/55">
						<input
							type="checkbox"
							checked={whatsappConsent}
							onChange={(event) =>
								onWhatsappConsentChange(event.target.checked)
							}
							className="mt-0.5 size-4 rounded border-white/20 bg-background accent-[#ffba5a]"
						/>
						<span>
							I consent to receive beta follow-up by WhatsApp if I entered a
							contact number. Email may still be used for access decisions.
						</span>
					</label>

					<button
						type="submit"
						disabled={isLoading}
						className="glow-border inline-flex h-[48px] items-center justify-center rounded-full p-0.5 duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60"
					>
						<span className="flex h-full w-full items-center justify-center gap-2 rounded-full bg-[#333] px-6 font-medium text-white shadow-[inset_0_0_24px_rgba(255,186,90,0.08)]">
							{isLoading ? (
								<RiLoader4Line
									aria-hidden="true"
									className="size-4 animate-spin"
								/>
							) : (
								<RiLock2Line aria-hidden="true" className="size-4" />
							)}
							{isLoading ? "Requesting…" : "Join the beta list"}
						</span>
					</button>
				</form>

				<div
					className={cn(
						"min-h-6 mt-4 text-center text-sm leading-6 text-[#bfbfbf]",
						{ hidden: requestState.status === "idle" },
					)}
					role={requestState.status === "error" ? "alert" : "status"}
				>
					{requestState.status === "success" ? (
						<span className="inline-flex items-start gap-2 text-amber">
							<RiCheckboxCircleLine
								aria-hidden="true"
								className="mt-1 size-4 shrink-0"
							/>
							{requestState.message}
						</span>
					) : (
						<span
							className={cn({
								"text-red-400": requestState.status === "error",
							})}
						>
							{requestState.message}
						</span>
					)}
				</div>

				<div className="mt-6 grid gap-2 border-t border-white/10 pt-5 text-[12px] leading-5 text-white/45 sm:grid-cols-3">
					<p>Requests are saved for review.</p>
					<p className="text-center">
						Approved emails are linked to beta access.
					</p>
					<p className="text-right">We’ll notify you by email or WhatsApp.</p>
				</div>
			</div>
		</DialogContent>
	);
}
