import GlowingTag from "./GlowingTag";

interface Props {
	onClickPrimary?: () => void;
	onClickSecondary?: () => void;
}

const HeroButtons: React.FC<Props> = ({
	onClickPrimary = () => {},
	onClickSecondary = () => {},
}) => {
	const handlePrimaryClick = () => {
		// Track event in GA4
		if (typeof window !== "undefined" && (window as any).gtag) {
			(window as any).gtag("event", "cta_click", {
				event_category: "engagement",
				event_label: "hero_primary_cta",
			});
		}
		onClickPrimary();
	};

	const handleSecondaryClick = () => {
		// Track event in GA4
		if (typeof window !== "undefined" && (window as any).gtag) {
			(window as any).gtag("event", "cta_click", {
				event_category: "engagement",
				event_label: "hero_secondary_cta",
			});
		}
		onClickSecondary();
	};

	return (
		<div className="w-fit flex flex-col md:flex-row  items-center justify-center gap-4 md:gap-8 mt-12 mx-auto">
			<div className="button">
				<GlowingTag onClick={handlePrimaryClick} size="lg">
					Let's build something
				</GlowingTag>
			</div>
			<button onClick={handleSecondaryClick} className="button px-3 py-3">
				see what i can do first.
			</button>
		</div>
	);
};

export default HeroButtons;
