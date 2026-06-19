import GlowingTag from "./GlowingTag";

interface Props {
	areas: string[];
}

const TagMarquee: React.FC<Props> = ({ areas }) => {
	return (
		<div className="relative w-full opacity-70 overflow-hidden mb-8">
			{/* Left fade */}
			<div
				className="pointer-events-none absolute left-0 top-0 h-full w-56 z-10"
				style={{
					background:
						"linear-gradient(to right, var(--background) 0%, transparent 100%)",
				}}
			/>
			{/* Right fade */}
			<div
				className="pointer-events-none absolute right-0 top-0 h-full w-56 z-10"
				style={{
					background:
						"linear-gradient(to left, var(--background) 0%, transparent 100%)",
				}}
			/>

			<div className="flex marquee-track w-max">
				{[...areas, ...areas].map((area, i) => (
					<div key={i} className="mx-2 peer peer-hover:opacity-40 duration-300">
						<GlowingTag>{area}</GlowingTag>
					</div>
				))}
			</div>
		</div>
	);
};

export default TagMarquee;
