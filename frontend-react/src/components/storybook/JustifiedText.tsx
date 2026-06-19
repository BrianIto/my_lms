"use client";

import type { PreparedTextWithSegments } from "@chenglou/pretext";
import { prepareWithSegments } from "@chenglou/pretext";
import type { ClassValue } from "clsx";
import type { ReactNode } from "react";
import { Children, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";

// ---------------------------------------------------------------------------
// Rich-content token model
//
// The component accepts React children with inline markup (<b>, <strong>,
// <i>, <em>, <code>, <s>, <u>). The tree is flattened into a stream of
// RichTokens, each carrying the plain text and a style context so that
// canvas measurement can use the correct font variant.
// ---------------------------------------------------------------------------

type MarkupStyle = {
	bold?: boolean;
	italic?: boolean;
	code?: boolean;
	strike?: boolean;
	underline?: boolean;
};

type RichToken = {
	text: string;
	style: MarkupStyle;
};

/** Walk a React node tree and collect a flat list of RichTokens. */
function collectTokens(node: ReactNode, style: MarkupStyle = {}): RichToken[] {
	if (node === null || node === undefined || typeof node === "boolean")
		return [];

	if (typeof node === "string" || typeof node === "number") {
		return [{ text: String(node), style }];
	}

	if (Array.isArray(node)) {
		return node.flatMap((child) => collectTokens(child, style));
	}

	// React element
	if (typeof node === "object" && "type" in node) {
		const el = node as React.ReactElement<{ children?: ReactNode }>;
		const childStyle = { ...style };
		const tag = typeof el.type === "string" ? el.type : "";
		if (tag === "b" || tag === "strong") childStyle.bold = true;
		if (tag === "i" || tag === "em") childStyle.italic = true;
		if (tag === "code") childStyle.code = true;
		if (tag === "s") childStyle.strike = true;
		if (tag === "u") childStyle.underline = true;
		return collectTokens(el.props?.children, childStyle);
	}

	return [];
}

/** Build the canvas font string for a given style context. */
function canvasFont(
	style: MarkupStyle,
	fontSize: number,
	baseFont: string,
	codeFont: string,
): string {
	const weight = style.bold ? "bold" : "normal";
	const slant = style.italic ? "italic" : "normal";
	const family = style.code ? codeFont : baseFont;
	return `${slant} ${weight} ${fontSize}px ${family}`;
}

// ---------------------------------------------------------------------------
// Knuth-Plass optimal paragraph line-breaking
// ---------------------------------------------------------------------------

type LineSegment = {
	text: string;
	width: number;
	isSpace: boolean;
	style: MarkupStyle;
};
type KPLine = { segments: LineSegment[]; wordWidth: number; isLast: boolean };

function knuthPlassLayout(
	segs: string[],
	widths: number[],
	styles: MarkupStyle[],
	maxWidth: number,
): KPLine[] {
	const n = segs.length;
	if (n === 0) return [];

	let normalSpaceW = 0;
	for (let i = 0; i < n; i++) {
		if (segs[i].trim().length === 0 && widths[i] > 0) {
			normalSpaceW = widths[i];
			break;
		}
	}
	if (normalSpaceW === 0) normalSpaceW = maxWidth * 0.03;

	const candidates: number[] = [0];
	for (let i = 0; i < n; i++) {
		if (segs[i].trim().length === 0 && i + 1 < n) {
			candidates.push(i + 1);
		}
	}
	candidates.push(n);

	const m = candidates.length;

	function spanInfo(a: number, b: number): { wordWidth: number; spaces: number } {
		const from = candidates[a];
		const to = candidates[b];
		let wordWidth = 0;
		let spaces = 0;
		for (let si = from; si < to; si++) {
			if (segs[si].trim().length === 0) spaces++;
			else wordWidth += widths[si];
		}
		if (to > from && segs[to - 1].trim().length === 0) spaces--;
		return { wordWidth, spaces };
	}

	function badness(wordWidth: number, spaces: number, isLast: boolean): number {
		if (isLast) return wordWidth > maxWidth ? 1e9 : 0;
		if (spaces <= 0) {
			const slack = maxWidth - wordWidth;
			return slack < 0 ? 1e9 : slack * slack * 10;
		}
		const justifiedSpace = (maxWidth - wordWidth) / spaces;
		if (justifiedSpace < 0) return 1e9;
		if (justifiedSpace < normalSpaceW * 0.4) return 1e9;

		const ratio = (justifiedSpace - normalSpaceW) / normalSpaceW;
		const bad = Math.abs(ratio) ** 3 * 1000;

		const riverExcess = justifiedSpace / normalSpaceW - 1.5;
		const riverPenalty =
			riverExcess > 0 ? 5000 + riverExcess * riverExcess * 10_000 : 0;

		const tightThreshold = normalSpaceW * 0.65;
		const tightPenalty =
			justifiedSpace < tightThreshold
				? 3000 + (tightThreshold - justifiedSpace) ** 2 * 10_000
				: 0;

		return bad + riverPenalty + tightPenalty;
	}

	const dp = new Float64Array(m).fill(Infinity);
	const prev = new Int32Array(m).fill(-1);
	dp[0] = 0;

	for (let j = 1; j < m; j++) {
		const isLast = j === m - 1;
		for (let i = j - 1; i >= 0; i--) {
			if (dp[i] === Infinity) continue;
			const { wordWidth, spaces } = spanInfo(i, j);
			if (wordWidth > maxWidth * 2) break;
			const cost = dp[i] + badness(wordWidth, spaces, isLast);
			if (cost < dp[j]) {
				dp[j] = cost;
				prev[j] = i;
			}
		}
	}

	const breakAt: number[] = [];
	let cur = m - 1;
	while (cur > 0) {
		breakAt.push(cur);
		cur = prev[cur] === -1 ? cur - 1 : prev[cur];
	}
	breakAt.reverse();

	const lines: KPLine[] = [];
	let fromCandidate = 0;

	for (const toCandidateIdx of breakAt) {
		const from = candidates[fromCandidate];
		const to = candidates[toCandidateIdx];
		const isLast = toCandidateIdx === m - 1;

		const segments: LineSegment[] = [];
		for (let si = from; si < to; si++) {
			const t = segs[si];
			segments.push({
				text: t,
				width: widths[si],
				isSpace: t.trim().length === 0,
				style: styles[si],
			});
		}
		while (segments.length > 0 && segments[segments.length - 1].isSpace) {
			segments.pop();
		}

		let wordWidth = 0;
		for (const seg of segments) {
			if (!seg.isSpace) wordWidth += seg.width;
		}

		lines.push({ segments, wordWidth, isLast });
		fromCandidate = toCandidateIdx;
	}

	return lines;
}

// ---------------------------------------------------------------------------
// Measure a flat token list using pretext's canvas infrastructure.
// Returns parallel arrays: segments[], widths[], styles[].
// ---------------------------------------------------------------------------

type MeasuredTokens = {
	segs: string[];
	widths: number[];
	styles: MarkupStyle[];
};

function measureTokens(
	tokens: RichToken[],
	fontSize: number,
	baseFont: string,
	codeFont: string,
): MeasuredTokens {
	const segs: string[] = [];
	const widths: number[] = [];
	const styles: MarkupStyle[] = [];

	// prepareWithSegments normalises whitespace per CSS white-space:normal,
	// which strips leading and trailing spaces from each string it receives.
	// When a token boundary falls inside a word gap (e.g. the space between
	// </b> and the next word), that boundary space lives at the start or end
	// of a token and would be silently dropped.
	//
	// Fix: measure a single reference space in the base font once, then emit
	// any leading/trailing spaces as explicit space segments before/after
	// handing the trimmed token text to prepareWithSegments.
	let spaceWidth = 0;
	const spaceFont = `normal normal ${fontSize}px ${baseFont}`;
	// Use "a b" so the space is internal — normalizeWhitespaceNormal strips
	// leading/trailing spaces, so " x" would return only ["x"] with no space.
	const spacePrepared = prepareWithSegments("a b", spaceFont);
	for (let i = 0; i < spacePrepared.segments.length; i++) {
		if (spacePrepared.segments[i].trim().length === 0) {
			spaceWidth = spacePrepared.widths[i];
			break;
		}
	}

	for (const token of tokens) {
		const font = canvasFont(token.style, fontSize, baseFont, codeFont);
		const text = token.text;

		// Emit leading space explicitly if present
		const leadingSpace = text.length > 0 && /^\s/.test(text);
		if (leadingSpace) {
			segs.push(" ");
			widths.push(spaceWidth);
			styles.push(token.style);
		}

		// Measure the trimmed content (prepareWithSegments won't drop anything now)
		const trimmed = text.trim();
		if (trimmed.length > 0) {
			const prepared: PreparedTextWithSegments = prepareWithSegments(
				trimmed,
				font,
			);
			for (let i = 0; i < prepared.segments.length; i++) {
				segs.push(prepared.segments[i]);
				widths.push(prepared.widths[i]);
				styles.push(token.style);
			}
		}

		// Emit trailing space explicitly if present (and text isn't just whitespace)
		const trailingSpace = trimmed.length > 0 && /\s$/.test(text);
		if (trailingSpace) {
			segs.push(" ");
			widths.push(spaceWidth);
			styles.push(token.style);
		}
	}

	return { segs, widths, styles };
}

// ---------------------------------------------------------------------------
// Render a segment span wrapped with the correct HTML element(s).
// ---------------------------------------------------------------------------

function SegmentSpan({
	seg,
}: {
	seg: LineSegment;
}) {
	let content: ReactNode = (
		<span className="group-hover/pretext:text-amber group-hover/pretext:brightness-105 duration-300">
			{seg.text}
		</span>
	);

	if (seg.style.code)
		content = <code className="font-mono text-[0.9em]">{content}</code>;
	if (seg.style.strike) content = <s>{content}</s>;
	if (seg.style.underline) content = <u>{content}</u>;
	if (seg.style.italic) content = <em>{content}</em>;
	if (seg.style.bold) content = <strong>{content}</strong>;

	return <>{content}</>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = {
	/** Plain text — use this when you don't need inline markup. */
	text?: string;
	/** Rich children — supports <b>, <strong>, <i>, <em>, <code>, <s>, <u>. */
	children?: ReactNode;
	width?: number;
	fontSize?: number;
	font?: string;
	codeFont?: string;
	className?: ClassValue;
	lineHeight?: number;
};

export function JustifiedText({
	text,
	children,
	width: widthProp,
	className,
	fontSize = 16,
	font = "'Atkinson Hyperlegible Next'",
	codeFont = "ui-monospace, monospace",
	lineHeight = 24,
}: Props) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [measuredWidth, setMeasuredWidth] = useState<number>(widthProp ?? 0);
	const [measured, setMeasured] = useState<MeasuredTokens | null>(null);

	// Collect tokens from children or plain text prop
	const tokens = useMemo<RichToken[]>(() => {
		if (children !== undefined) {
			const t = collectTokens(Children.toArray(children));
			return t;
		}
		if (text !== undefined) {
			return [{ text, style: {} }];
		}
		return [];
	}, [children, text]);

	// Defer canvas-based measurement to the client only
	useEffect(() => {
		if (tokens.length === 0) {
			setMeasured(null);
			return;
		}
		setMeasured(measureTokens(tokens, fontSize, font, codeFont));
	}, [tokens, fontSize, font, codeFont]);

	useEffect(() => {
		if (widthProp !== undefined) return;
		const el = containerRef.current;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			const w = entries[0]?.contentRect.width;
			if (w && w > 0) setMeasuredWidth(w);
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, [widthProp]);

	const width = widthProp ?? measuredWidth;

	const lines = useMemo(
		() =>
			measured && width > 0
				? knuthPlassLayout(
						measured.segs,
						measured.widths,
						measured.styles,
						width,
					)
				: [],
		[measured, width],
	);

	return (
		<div
			ref={containerRef}
			style={{
				...(widthProp !== undefined ? { width } : { width: "100%" }),
				font: fontSize + "px " + font,
				lineHeight: `${lineHeight}px`,
			}}
			className={cn(className)}
		>
			{lines.map((line, i) => {
				const spaces = line.segments.filter((s) => s.isSpace).length;
				const wordSpacing =
					!line.isLast && spaces > 0 ? (width - line.wordWidth) / spaces : 0;

				return (
					<div className="group/pretext" key={i} style={{ display: "flex" }}>
						{line.segments.map((seg, j) =>
							seg.isSpace ? (
								<span
									key={j}
									style={{
										display: "inline-block",
										width: wordSpacing || seg.width,
									}}
								/>
							) : (
								<SegmentSpan key={j} seg={seg} />
							),
						)}
					</div>
				);
			})}
		</div>
	);
}
