// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { authClient } from "#/lib/auth-client.ts";
import { preflightEmailFirstSignin } from "#/lib/backend-api.ts";
import { SignInDialog } from "./sign-in-dialog";

vi.mock("#/lib/auth-client.ts", () => ({
	authClient: {
		signIn: {
			email: vi.fn(),
			social: vi.fn(),
		},
		signUp: {
			email: vi.fn(),
		},
	},
}));

vi.mock("#/lib/backend-api.ts", () => ({
	preflightEmailFirstSignin: vi.fn(),
}));

const mockedPreflight = vi.mocked(preflightEmailFirstSignin);
const mockedSignUpEmail = vi.mocked(authClient.signUp.email);

function renderCreatePasswordFlow(redirectToDashboard = vi.fn()) {
	render(
		<SignInDialog defaultOpen redirectToDashboard={redirectToDashboard} />,
	);

	fireEvent.change(screen.getByLabelText(/email address/i), {
		target: { value: "Student@Example.com" },
	});
	fireEvent.submit(
		screen.getByRole("button", { name: /continue with email/i }),
	);

	return { redirectToDashboard };
}

describe("SignInDialog create-password flow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedPreflight.mockResolvedValue({
			email: "student@example.com",
			credential_state: "needs_password_setup",
		});
	});

	test("redirects to the dashboard after successful password creation", async () => {
		const redirectToDashboard = vi.fn();
		mockedSignUpEmail.mockResolvedValue({ error: null } as Awaited<
			ReturnType<typeof authClient.signUp.email>
		>);

		renderCreatePasswordFlow(redirectToDashboard);

		const passwordInput = await screen.findByLabelText(/create password/i);
		fireEvent.change(passwordInput, { target: { value: "valid-password" } });
		fireEvent.submit(
			screen.getByRole("button", { name: /create password and enter/i }),
		);

		await waitFor(() => {
			expect(mockedSignUpEmail).toHaveBeenCalledWith({
				email: "student@example.com",
				password: "valid-password",
				name: "student",
				callbackURL: "http://localhost:3000/dashboard",
			});
			expect(redirectToDashboard).toHaveBeenCalledWith(
				"http://localhost:3000/dashboard",
			);
		});
	});

	test("re-enables the form and shows an error when password creation fails", async () => {
		mockedSignUpEmail.mockResolvedValue({
			error: { message: "Session could not be created." },
		} as Awaited<ReturnType<typeof authClient.signUp.email>>);

		renderCreatePasswordFlow();

		const passwordInput = await screen.findByLabelText(/create password/i);
		fireEvent.change(passwordInput, { target: { value: "valid-password" } });
		const submitButton = screen.getByRole("button", {
			name: /create password and enter/i,
		});
		fireEvent.submit(submitButton);

		expect(
			await screen.findByText("Session could not be created."),
		).toBeTruthy();
		expect(submitButton.hasAttribute("disabled")).toBe(false);
	});
});
