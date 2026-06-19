export type BetaAccessRequestInput = {
	email: string;
	preferredName?: string;
	whatsappContact?: string;
	whatsappConsent: boolean;
};

export type BetaAccessRequestResponse = {
	email: string;
	status: "pending";
	message: string;
};

const authServiceURL =
	import.meta.env.VITE_AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export async function requestBetaAccess(
	input: BetaAccessRequestInput,
): Promise<BetaAccessRequestResponse> {
	const response = await fetch(`${authServiceURL}/api/beta/requests`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});

	const payload = await response.json().catch(() => null);

	if (!response.ok) {
		const message =
			typeof payload?.error === "string"
				? payload.error
				: "Could not request beta access.";
		throw new Error(message);
	}

	return payload as BetaAccessRequestResponse;
}
