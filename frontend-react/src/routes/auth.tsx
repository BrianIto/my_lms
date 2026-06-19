import { createFileRoute, Link } from "@tanstack/react-router";
import { Chrome, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { LmsShell } from "#/components/lms-shell.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import { authClient } from "#/lib/auth-client.ts";

export const Route = createFileRoute("/auth")({ component: AuthView });

function AuthView() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const signInWithGoogle = () => {
		void authClient.signIn.social({
			provider: "google",
			callbackURL: "/dashboard",
		});
	};

	const signInWithEmail = () => {
		void authClient.signIn.email({
			email,
			password,
			callbackURL: "/dashboard",
		});
	};

	return (
		<LmsShell
			eyebrow="Better Auth"
			title="Sign in, then pass the beta gate."
			description="Google sign-in and email/password both create identity in Better Auth. Private LMS content remains protected by a server-side beta allowlist."
		>
			<div className="mx-auto w-full max-w-[520px]">
				<Card className="border-white/15 bg-background/90 shadow-[inset_0_0_24px_rgba(255,186,90,0.05)]">
					<CardHeader>
						<CardTitle className="font-display text-4xl tracking-tighter text-white">
							Access the course
						</CardTitle>
						<CardDescription>
							Use your beta email. If you are not allowlisted, you will land on
							the pending screen.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<Button
							variant="outline"
							className="h-11"
							onClick={signInWithGoogle}
						>
							<Chrome data-icon="inline-start" /> Continue with Google
						</Button>
						<div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
							<Separator className="flex-1" /> or{" "}
							<Separator className="flex-1" />
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="••••••••••••"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
							/>
						</div>
						<Button className="h-11" onClick={signInWithEmail}>
							<Mail data-icon="inline-start" /> Continue with email
						</Button>
					</CardContent>
					<CardFooter className="flex flex-col gap-3 border-t border-white/10 text-sm text-muted-foreground">
						<div className="flex items-center gap-2">
							<ShieldCheck aria-hidden="true" /> Protected by Better Auth
							sessions.
						</div>
						<Button variant="link" asChild>
							<Link to="/dashboard">View beta dashboard prototype</Link>
						</Button>
					</CardFooter>
				</Card>
			</div>
		</LmsShell>
	);
}
