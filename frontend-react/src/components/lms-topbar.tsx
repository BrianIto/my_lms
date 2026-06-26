import { cn } from "#/lib/utils.ts";
import DynamicIsland from "./storybook/DynamicIsland";

export function LmsTopbar({ className }: { className?: string }) {
	return (
		<header className={cn("relative z-50 flex h-14 justify-center", className)}>
			<DynamicIsland />
		</header>
	);
}
