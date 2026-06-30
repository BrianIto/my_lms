import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAuthStateQueryOptions } from "#/lib/auth-session.ts";

export const Route = createFileRoute("/_protected")({
	beforeLoad: async ({ context }) => {
		const auth = await context.queryClient.ensureQueryData(
			getAuthStateQueryOptions(),
		);

		if (!auth.isAuthenticated) {
			throw redirect({ to: "/" });
		}

		return { auth };
	},
	component: ProtectedLayout,
});

function ProtectedLayout() {
	return <Outlet />;
}
