export const BRAZILIAN_WHATSAPP_PATTERN = /^\+55 \(\d{2}\) 9\d{4}-\d{4}$/;

export const WHATSAPP_ERROR_MESSAGE = "Use the format +55 (DD) 9XXXX-XXXX.";

export function normalizeBrazilianWhatsappDigits(value: string) {
	const trimmedValue = value.trim();
	const digits = trimmedValue.replace(/\D/g, "");

	if (!digits) {
		return "";
	}

	if (trimmedValue.startsWith("+")) {
		if (digits.startsWith("55")) {
			return digits.slice(2, 13);
		}

		if (digits.startsWith("5") && digits.length > 11) {
			return digits.slice(1, 12);
		}
	}

	if (digits.startsWith("55") && digits.length > 11) {
		return digits.slice(2, 13);
	}

	return digits.slice(0, 11);
}

export function formatBrazilianWhatsapp(value: string) {
	const digits = normalizeBrazilianWhatsappDigits(value);

	if (!digits) {
		return "";
	}

	const areaCode = digits.slice(0, 2);
	const firstDigit = digits.slice(2, 3);
	const firstBlock = digits.slice(3, 7);
	const secondBlock = digits.slice(7, 11);

	let formatted = "+55";

	if (areaCode.length > 0) {
		formatted += ` (${areaCode}`;
	}

	if (firstDigit.length > 0) {
		formatted += `) ${firstDigit}`;
	}

	if (firstBlock.length > 0) {
		formatted += firstBlock;
	}

	if (secondBlock.length > 0) {
		formatted += `-${secondBlock}`;
	}

	return formatted;
}

export function isValidBrazilianWhatsapp(value: string) {
	return BRAZILIAN_WHATSAPP_PATTERN.test(value);
}
