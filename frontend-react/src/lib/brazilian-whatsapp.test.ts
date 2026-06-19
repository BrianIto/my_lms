import { describe, expect, test } from "vitest";
import {
	formatBrazilianWhatsapp,
	isValidBrazilianWhatsapp,
	normalizeBrazilianWhatsappDigits,
} from "./brazilian-whatsapp";

describe("Brazilian WhatsApp formatting", () => {
	test("formats valid pasted values with and without the country code", () => {
		expect(formatBrazilianWhatsapp("+55 (92) 98437-4357")).toBe(
			"+55 (92) 98437-4357",
		);
		expect(formatBrazilianWhatsapp("92984374357")).toBe("+55 (92) 98437-4357");
		expect(formatBrazilianWhatsapp("5594932134123")).toBe(
			"+55 (94) 93213-4123",
		);
	});

	test("keeps deletion around the prefix from duplicating 55", () => {
		expect(formatBrazilianWhatsapp("+55 () 98437-4357")).not.toContain(
			"+55 (55",
		);
		expect(formatBrazilianWhatsapp("+5 (92) 98437-4357")).toBe(
			"+55 (92) 98437-4357",
		);
		expect(normalizeBrazilianWhatsappDigits("+55 () 98437-4357")).toBe(
			"984374357",
		);
	});

	test("can be cleared by repeated backspace-style deletion", () => {
		let value = formatBrazilianWhatsapp("+55 (92) 98437-4357");
		const seen = new Set<string>();

		while (value) {
			expect(value).not.toContain("+55 (55");
			expect(seen.has(value)).toBe(false);
			seen.add(value);
			value = formatBrazilianWhatsapp(value.slice(0, -1));
		}

		expect(value).toBe("");
	});

	test("validates optional final values exactly", () => {
		expect(formatBrazilianWhatsapp("")).toBe("");
		expect(isValidBrazilianWhatsapp("+55 (92) 98437-4357")).toBe(true);
		expect(isValidBrazilianWhatsapp("+55 (94) 93213-4123")).toBe(true);
		expect(isValidBrazilianWhatsapp("+55 (92) 88437-4357")).toBe(false);
		expect(isValidBrazilianWhatsapp("+55 (92) 98437-435")).toBe(false);
	});
});
