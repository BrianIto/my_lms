import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

type BetterAuthSessionPayload = {
	user?: {
		email?: string | null;
		name?: string | null;
		role?: string | null;
	} | null;
	session?: unknown;
};

export type AuthState = {
	isAuthenticated: boolean;
	isAdmin: boolean;
	user: {
		email: string | null;
		name: string | null;
		role: string | null;
	} | null;
};

export const anonymousAuthState: AuthState = {
	isAuthenticated: false,
	isAdmin: false,
	user: null,
};

export const authStateQueryKey = ["auth", "state"] as const;
export const authStateStaleTimeMs = 30 * 1000;
export const authStateGcTimeMs = 5 * 60 * 1000;

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
	async (): Promise<AuthState> => {
		const cookie = getRequestHeader("cookie");

		if (!cookie) {
			return anonymousAuthState;
		}

		try {
			const response = await fetch(getAuthSessionUrl(), {
				credentials: "include",
				headers: {
					accept: "application/json",
					cookie,
				},
			});

			if (!response.ok) {
				return anonymousAuthState;
			}

			const session = (await response.json()) as BetterAuthSessionPayload;
			const isAuthenticated = Boolean(session?.user && session?.session);

			if (!isAuthenticated) {
				return anonymousAuthState;
			}

			return {
				isAuthenticated,
				isAdmin: isAdminRole(session.user?.role),
				user: {
					email: session.user?.email ?? null,
					name: session.user?.name ?? null,
					role: session.user?.role ?? null,
				},
			};
		} catch {
			return anonymousAuthState;
		}
	},
);

export function getAuthStateQueryOptions(
	queryFn: () => Promise<AuthState> = getServerAuthState,
) {
	return queryOptions({
		queryKey: authStateQueryKey,
		queryFn,
		staleTime: authStateStaleTimeMs,
		gcTime: authStateGcTimeMs,
	});
}
