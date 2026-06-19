import { motion } from "motion/react";
import ContainerWithTooltip from "./ContainerWithTooltip";
import Angular from "./icons/Angular";
import NextJSIcon from "./icons/Nextjs";
import Storybook from "./icons/Storybook";
import Svelte from "./icons/Svelte";
import TailwindCSS from "./icons/Tailwindcss";
import { JustifiedText } from "./JustifiedText";

const DataVizStack = () => {
	const frameworks = [
		{
			icon: Svelte,
			name: "Svelte + SvelteKit",
			definition:
				"is my personal favorite, not so adopted by market right now, but it's very stable, great DX and fast to ship.",
			years: 4,
		},
		{
			name: "Next.js + React",
			icon: NextJSIcon,
			definition:
				"the most adopted framework in the market, with a huge ecosystem and a lot of resources. Plenty of my projects are built with Next.js, including this website and my storybook.",
			years: 6,
		},
		{
			name: "Angular",
			icon: Angular,
			definition:
				"It was many features out of the box, it's a very good choice where opinionated is a good thing, I used it many times in manufacturing web apps.",
			years: 3,
		},
		{
			name: "Storybook",
			icon: Storybook,
			definition:
				"Documentation tool for components, I use it in all my projects to document components and edge cases, and also to test them in isolation.",
			years: 4,
		},
		{
			name: "TailwindCSS",
			icon: TailwindCSS,
			years: 5,
			definition:
				"Utility-first CSS framework, I use it in all my projects to style components, it's very flexible and allows me to create custom designs without writing custom CSS.",
		},
	];

	return (
		<>
			<div className="flex flex-col gap-5 p-8">
				<h2 className="font-display tracking-tight font-medium text-[30px]">
					One dev to{" "}
					<ContainerWithTooltip
						className="inline-flex items-center gap-1"
						tooltipLabel={
							<>
								<p>
									<span className="opacity-70">
										This is a reference for famous quote from Lord of the Rings,
										"One Ring to rule them all, One Ring to find them, One Ring
										to bring them all and in the darkness bind them", from
										J.R.R. Tolkien.
									</span>
								</p>
							</>
						}
					>
						<span className="font-semibold">rule them all</span>
					</ContainerWithTooltip>
				</h2>
				<JustifiedText>
					I craft well-written, useful and documented components in any
					JavaScript Front-end Framework, from Vanilla Javascript to SSR Next.js
					and SvelteKit. But don't believe my words, believe my code by checking
					this website repository and storybook.
				</JustifiedText>
			</div>
			{frameworks.map((framework, i) => (
				<motion.div
					key={framework.name}
					initial={{
						opacity: 0,
						y: 5,
						borderLeft: "0px solid #999",
					}}
					whileInView={{
						opacity: 1,
						y: 0,
					}}
					transition={{
						delay: 0.1 + i * 0.05,
					}}
					className="border-t flex border-white/15 py-4 px-8 text-[18px]"
				>
					<ContainerWithTooltip
						margin={8}
						tooltipLabel={
							<div>
								<p className="flex flex-col font-sans font-semibold text-[13px]">
									<span className="flex-1 font-sans">{framework.name}</span>
									<span className="opacity-70">{framework.years}y exp.</span>
								</p>
								<JustifiedText
									fontSize={13}
									font="'Atkinson Hyperlegible Next'"
									text={framework.definition}
									lineHeight={16}
									width={210}
								/>
							</div>
						}
						position="right"
						tooltipClass="max-w-[250px]"
					>
						<motion.div className="flex gap-[20px] ">
							<framework.icon /> {framework.name}
						</motion.div>
					</ContainerWithTooltip>
				</motion.div>
			))}
		</>
	);
};

export default DataVizStack;
