import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

type BetterAuthSessionPayload = {
	user?: {
		role?: string | null;
	} | null;
	session?: unknown;
};

export function isAdminRole(role: string | null | undefined) {
	return (
		typeof role === "string" &&
		role
			.split(",")
			.map((value) => value.trim().toLowerCase())
			.includes("admin")
	);
}

function getAuthSessionUrl() {
	const baseUrl = import.meta.env.VITE_AUTH_URL ?? "http://localhost:3000";
	const trimmedBaseUrl = baseUrl.replace(/\/+$/, "");
	return trimmedBaseUrl.endsWith("/api/auth")
		? `${trimmedBaseUrl}/get-session`
		: `${trimmedBaseUrl}/api/auth/get-session`;
}

export const getServerAuthState = createServerFn({ method: "GET" }).handler(
	async () => {
		const cookie = getRequestHeader("cookie");

		if (!cookie) {
			return { isAuthenticated: false, isAdmin: false };
		}

		try {
			const response = await fetch(getAuthSessionUrl(), {
				headers: { cookie },
			});

			if (!response.ok) {
				return { isAuthenticated: false, isAdmin: false };
			}

			const session = (await response.json()) as BetterAuthSessionPayload;
			const isAuthenticated = Boolean(session?.user && session?.session);

			return {
				isAuthenticated,
				isAdmin: isAuthenticated && isAdminRole(session.user?.role),
			};
		} catch {
			return { isAuthenticated: false, isAdmin: false };
		}
	},
);
