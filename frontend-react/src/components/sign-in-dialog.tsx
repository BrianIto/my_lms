import { RiGoogleLine, RiLoader4Line, RiMailLine } from "@remixicon/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import { authClient } from "#/lib/auth-client.ts";
import { preflightEmailFirstSignin } from "#/lib/backend-api.ts";
import { cn } from "#/utils/cn";

type EmailStep = "email" | "password" | "create-password";

type SignInStatus =
	| { state: "idle"; message: string }
	| { state: "loading"; message: string }
	| { state: "error"; message: string };

export function SignInDialog({
	trigger,
	defaultOpen = false,
	redirectToDashboard = (url) => window.location.assign(url),
}: {
	trigger?: ReactNode;
	defaultOpen?: boolean;
	redirectToDashboard?: (url: string) => void;
}) {
	const [open, setOpen] = useState(defaultOpen);
	const [step, setStep] = useState<EmailStep>("email");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [status, setStatus] = useState<SignInStatus>({
		state: "idle",
		message: "",
	});

	const isLoading = status.state === "loading";
	const showPassword = step !== "email";
	const prefersReducedMotion = useReducedMotion();

	async function signInWithGoogle() {
		setStatus({ state: "loading", message: "Starting Google sign-in…" });

		try {
			const callbackURL = `${window.location.origin}/dashboard`;
			const result = await authClient.signIn.social({
				provider: "google",
				callbackURL,
				disableRedirect: true,
			});

			if (result.error) {
				setStatus({
					state: "error",
					message: [
						"Google sign-in failed before reaching Google.",
						result.error.code ? `Code: ${result.error.code}.` : null,
						result.error.message ? `Message: ${result.error.message}` : null,
					]
						.filter(Boolean)
						.join(" "),
				});
				return;
			}

			if (!result.data?.url) {
				setStatus({
					state: "error",
					message:
						"Google sign-in did not return a redirect URL. Check the auth service response in Network → sign-in/social.",
				});
				return;
			}

			window.location.assign(result.data.url);
		} catch (error) {
			setStatus({
				state: "error",
				message:
					error instanceof Error
						? `Google sign-in request failed: ${error.message}`
						: "Google sign-in request failed before reaching Google.",
			});
		}
	}

	function handleEmailChange(value: string) {
		setEmail(value);
		setPassword("");
		setStep("email");
		setStatus({ state: "idle", message: "" });
	}

	async function continueWithEmail(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (step === "email") {
			setStatus({ state: "loading", message: "Checking beta access…" });

			try {
				const preflight = await preflightEmailFirstSignin({ email });
				setEmail(preflight.email);
				setStep(
					preflight.credential_state === "has_password"
						? "password"
						: "create-password",
				);
				setStatus({
					state: "idle",
					message: "",
				});
			} catch (error) {
				setStatus({
					state: "error",
					message:
						error instanceof Error
							? error.message
							: "This email is not active for beta access.",
				});
			}
			return;
		}

		setStatus({
			state: "loading",
			message:
				step === "password" ? "Signing you in…" : "Creating your password…",
		});

		try {
			const dashboardURL = `${window.location.origin}/dashboard`;
			const result =
				step === "password"
					? await authClient.signIn.email({
							email,
							password,
							callbackURL: dashboardURL,
						})
					: await authClient.signUp.email({
							email,
							password,
							name: email.split("@")[0] ?? "Beta student",
							callbackURL: dashboardURL,
						});

			if (result.error) {
				setStatus({
					state: "error",
					message:
						result.error.message ??
						(step === "password"
							? "Email sign-in failed."
							: "Password setup failed."),
				});
				return;
			}

			redirectToDashboard(dashboardURL);
		} catch (error) {
			setStatus({
				state: "error",
				message:
					error instanceof Error
						? error.message
						: step === "password"
							? "Email sign-in failed."
							: "Password setup failed.",
			});
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="max-h-[calc(100vh-2rem)] max-w-[520px] overflow-hidden overflow-y-auto rounded-[28px] border-white/20 bg-background/95 p-0 shadow-[0_26px_140px_rgba(0,0,0,0.82),0_0_90px_rgba(255,186,90,0.08)]">
				<div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,186,90,0.1),transparent_34%),radial-gradient(circle_at_50%_76%,rgba(255,255,255,0.055),transparent_42%)]" />
				<div className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/3 border-r border-white/10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:16px_16px] opacity-25" />
				<div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-1/3 border-l border-white/10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:16px_16px] opacity-20" />
				<svg
					className="hero-orbit pointer-events-none absolute left-1/2 top-[136px] z-0 w-[330px] -translate-x-1/2 opacity-65"
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
					<DialogHeader className="mx-auto max-w-[400px] gap-3 pr-0 text-center">
						<DialogTitle className="text-[42px] leading-[0.9] md:text-[52px]">
							<span className="block text-[#8c8c8c]">Sign in</span>
							<span className="block text-white [text-shadow:0px_12px_88px_rgba(255,255,255,0.22)]">
								to continue.
							</span>
						</DialogTitle>
						<DialogDescription className="mx-auto max-w-[365px] text-center text-[14px] leading-6 text-white/70">
							Use your approved beta email. You’ll land on the dashboard after
							Better Auth creates or restores your session.
						</DialogDescription>
					</DialogHeader>

					<div className="mt-7 flex flex-col gap-4">
						<button
							type="button"
							onClick={signInWithGoogle}
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
									<RiGoogleLine aria-hidden="true" className="size-4" />
								)}
								Sign in with Google
							</span>
						</button>

						<div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/40">
							<Separator className="flex-1" />
							or
							<Separator className="flex-1" />
						</div>

						<form onSubmit={continueWithEmail} className="flex flex-col gap-4">
							<div className="flex flex-col gap-2">
								<label
									className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#999] sm:text-left"
									htmlFor="sign-in-email"
								>
									Email address
								</label>
								<Input
									id="sign-in-email"
									type="email"
									required
									placeholder="you@example.com"
									value={email}
									onChange={(event) => handleEmailChange(event.target.value)}
									className="h-12 rounded-full border-white/15 bg-background/80 px-5 text-center text-white placeholder:text-[#8c8c8c] focus-visible:border-amber/40 sm:text-left"
									autoComplete="email"
									aria-invalid={status.state === "error"}
								/>
							</div>

							<AnimatePresence initial={false} mode="wait">
								{showPassword ? (
									<motion.div
										key={step}
										initial={
											prefersReducedMotion
												? { height: 0, opacity: 0 }
												: { height: 0, opacity: 0, y: -6 }
										}
										animate={
											prefersReducedMotion
												? { height: "auto", opacity: 1 }
												: { height: "auto", opacity: 1, y: 0 }
										}
										exit={
											prefersReducedMotion
												? { height: 0, opacity: 0 }
												: { height: 0, opacity: 0, y: -4 }
										}
										transition={{ duration: 0.2, ease: "easeOut" }}
										className="overflow-hidden"
									>
										<div className="flex flex-col gap-2">
											<label
												className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#999] sm:text-left"
												htmlFor="sign-in-password"
											>
												{step === "password" ? "Password" : "Create password"}
											</label>
											<Input
												id="sign-in-password"
												type="password"
												required
												minLength={8}
												placeholder="••••••••••••"
												value={password}
												onChange={(event) => setPassword(event.target.value)}
												className="h-12 rounded-full border-white/15 bg-background/80 px-5 text-center text-white placeholder:text-[#8c8c8c] focus-visible:border-amber/40 sm:text-left"
												autoComplete={
													step === "password"
														? "current-password"
														: "new-password"
												}
												aria-invalid={status.state === "error"}
											/>
											{step === "create-password" ? (
												<p className="text-center text-xs leading-5 text-white/45 sm:text-left">
													This approved beta email does not have a password yet.
													Create one to open your LMS session.
												</p>
											) : null}
										</div>
									</motion.div>
								) : null}
							</AnimatePresence>

							<button
								type="submit"
								disabled={isLoading}
								className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-background/75 px-5 font-medium text-white shadow-[inset_0_0_24px_rgba(255,186,90,0.04)] hover:border-white/25 hover:shadow-[0_0_16px_rgba(255,255,255,0.08)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60"
							>
								{isLoading ? (
									<RiLoader4Line
										aria-hidden="true"
										className="size-4 animate-spin"
									/>
								) : (
									<RiMailLine aria-hidden="true" className="size-4" />
								)}
								{step === "email"
									? "Continue with email"
									: step === "password"
										? "Sign in with password"
										: "Create password and enter"}
							</button>
						</form>
					</div>

					<div
						className={cn(
							"min-h-6 mt-4 text-center text-sm leading-6 text-[#bfbfbf]",
							{ hidden: status.state === "idle" },
						)}
						role={status.state === "error" ? "alert" : "status"}
					>
						<span
							className={cn({
								"text-red-400": status.state === "error",
							})}
						>
							{status.message}
						</span>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
