import "dotenv/config";

const parsePort = (value: string | undefined) => {
  const port = Number(value ?? "3000");
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }
  return port;
};

const parseOrigins = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const unique = <T>(values: T[]) => [...new Set(values)];

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  port: parsePort(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL,
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  trustedOrigins: unique([
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...parseOrigins(process.env.TRUSTED_ORIGINS),
  ]),
  resendApiKey: process.env.RESEND_API_KEY,
  betaRequestFrom: process.env.BETA_REQUEST_FROM,
  betaRequestAdminEmail: process.env.BETA_REQUEST_ADMIN_EMAIL ?? "brian.oliveira100@gmail.com",
  betaRequestApprovalBaseUrl:
    process.env.BETA_REQUEST_APPROVAL_BASE_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000",
};

export function assertRuntimeEnv() {
  const missing = [
    ["DATABASE_URL", env.databaseUrl],
    ["BETTER_AUTH_SECRET", env.betterAuthSecret],
    ["BETTER_AUTH_URL", env.betterAuthUrl],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
