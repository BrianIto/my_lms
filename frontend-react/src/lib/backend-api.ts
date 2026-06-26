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

export type BetaAllowlistStatus = "invited" | "active" | "revoked";

export type BetaAllowlistEntry = {
	id: string;
	email: string;
	user_id: string | null;
	status: BetaAllowlistStatus;
	created_at: string;
	updated_at: string;
};

export type BetaAllowlistResponse = {
	entries: BetaAllowlistEntry[];
};

export type EmailFirstSigninPreflight = {
	email: string;
	credential_state: "has_password" | "needs_password_setup";
};

const authServiceURL =
	import.meta.env.VITE_AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

function getApiError(payload: unknown, fallback: string) {
	return typeof (payload as { error?: unknown } | null)?.error === "string"
		? (payload as { error: string }).error
		: fallback;
}

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
		throw new Error(getApiError(payload, "Could not request beta access."));
	}

	return payload as BetaAccessRequestResponse;
}

export async function preflightEmailFirstSignin(input: {
	email: string;
}): Promise<EmailFirstSigninPreflight> {
	const response = await fetch(
		`${authServiceURL}/api/beta/email-first-signin`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		},
	);
	const payload = await response.json().catch(() => null);

	if (!response.ok) {
		throw new Error(
			getApiError(payload, "This email is not active for beta access."),
		);
	}

	return payload as EmailFirstSigninPreflight;
}

export async function listBetaAllowlist(): Promise<BetaAllowlistResponse> {
	const response = await fetch(`${authServiceURL}/api/beta/allowlist`, {
		credentials: "include",
	});
	const payload = await response.json().catch(() => null);

	if (!response.ok) {
		throw new Error(getApiError(payload, "Could not load beta allowlist."));
	}

	return payload as BetaAllowlistResponse;
}

export async function upsertBetaAllowlistEntry(input: {
	email: string;
	status: BetaAllowlistStatus;
}): Promise<BetaAllowlistEntry> {
	const response = await fetch(`${authServiceURL}/api/beta/allowlist`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify(input),
	});
	const payload = await response.json().catch(() => null);

	if (!response.ok) {
		throw new Error(getApiError(payload, "Could not update beta allowlist."));
	}

	return payload as BetaAllowlistEntry;
}
