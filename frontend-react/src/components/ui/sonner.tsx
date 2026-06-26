import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	return (
		<Sonner
			theme="dark"
			className="toaster group"
			toastOptions={{
				classNames: {
					toast: "bg-background text-foreground",
					description: "text-muted-foreground",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
