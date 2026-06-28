import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getServerAuthState } from "#/lib/auth-session.ts";

export const Route = createFileRoute("/_protected")({
	beforeLoad: async () => {
		const auth = await getServerAuthState();

		if (!auth.isAuthenticated) {
			throw redirect({ to: "/" });
		}
	},
	component: ProtectedLayout,
});

function ProtectedLayout() {
	return <Outlet />;
}
