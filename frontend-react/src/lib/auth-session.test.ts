import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test, vi } from "vitest";
import {
	type AuthState,
	authStateQueryKey,
	getAuthStateQueryOptions,
} from "./auth-session";

const authenticatedAuthState: AuthState = {
	isAuthenticated: true,
	isAdmin: true,
	user: {
		email: "admin@example.com",
		name: "Admin User",
		role: "admin",
	},
};

describe("auth state query options", () => {
	test("reuse cached auth state instead of repeating session fetches while fresh", async () => {
		const queryClient = new QueryClient();
		const fetchAuthState = vi.fn().mockResolvedValue(authenticatedAuthState);
		const options = getAuthStateQueryOptions(fetchAuthState);

		await expect(queryClient.ensureQueryData(options)).resolves.toEqual(
			authenticatedAuthState,
		);
		await expect(queryClient.ensureQueryData(options)).resolves.toEqual(
			authenticatedAuthState,
		);

		expect(fetchAuthState).toHaveBeenCalledTimes(1);
		expect(queryClient.getQueryData(authStateQueryKey)).toEqual(
			authenticatedAuthState,
		);

		queryClient.clear();
	});
});
