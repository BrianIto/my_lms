import Logo from "./icons/Logo";

const Footer: React.FC = () => {
	return (
		<footer>
			<div className="w-full bg-background border-t border-white/20 mt-12 py-6 flex justify-center items-center ">
				<div className="px-10 lg:px-0 max-w-[940px] w-full">
					<div className="w-fit">
						<div className="size-10 mb-2 rounded border border-white/20 flex items-center justify-center bg-white/5">
							<Logo className="size-5" />
						</div>
					</div>
					<div className="flex my-auto flex-col">
						<p className="text-md font-sans tracking-tighter font-medium text-white/90">
							Created with Heart by Brian Ito
						</p>

						<p className=" text-xs text-white/50">
							All rights reserved. &copy; 2026
						</p>
					</div>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
