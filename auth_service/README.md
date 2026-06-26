# Auth Service

Standalone TypeScript Better Auth microservice using Hono, Node.js, and PostgreSQL via `pg.Pool`.

Better Auth is mounted at:

```text
/api/auth/*
```

Health check:

```bash
curl http://localhost:3000/api/auth/ok
# {"status":"ok"}
```

## Setup

```bash
cp .env.example .env
npm install
```

Set `DATABASE_URL` in `.env` to the shared PostgreSQL database and keep Better Auth/auth-service owned tables in the `app` schema:

```env
DATABASE_URL="postgresql://app:app@localhost:5432/app?sslmode=disable"
DATABASE_SCHEMA="app"
```

The auth service creates `DATABASE_SCHEMA` if needed and connects with `search_path=<schema>,public` so Better Auth migrations and OAuth writes land in `app` instead of falling back to `public`.

For managed PostgreSQL providers, point both backend and auth service at the same database. You may need SSL:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require"
```

Generate a strong Better Auth secret:

```bash
openssl rand -base64 32
```

Then set:

```env
BETTER_AUTH_SECRET="paste-generated-secret-here"
BETTER_AUTH_URL="http://localhost:3000"
PORT="3000"
TRUSTED_ORIGINS="http://localhost:5173,http://localhost:3000"
```

Do not commit `.env` with real secrets.

## Database migrations and schema generation

Run migrations after initial setup and any time Better Auth plugins or schema options change:

```bash
npm run auth:migrate
```

To generate schema artifacts supported by the Better Auth CLI:

```bash
npm run auth:generate
```

Current plugins that affect schema include email/password auth, Google OAuth when configured, Organization, Admin, and OpenAPI.

## Google sign-in

Set both variables to enable Google as a Better Auth social provider:

```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Beta access

The service creates app-owned `beta_access` and `beta_access_requests` tables in `DATABASE_SCHEMA` on startup for private beta gating and public beta-request review.

Login/session creation is gated by `beta_access`: non-admin users must have a normalized email row with `status = 'active'` before Better Auth can complete sign-in or sign-up session creation. `invited`, `revoked`, and missing beta rows are denied at the auth-service session hook.

Google sign-in for `brian.oliveira100@gmail.com` is the fixed bootstrap exception. Only when that normalized email signs in through the Google provider, the service idempotently upserts `beta_access.status = 'active'`, links the Better Auth user id, and sets the Better Auth admin plugin role to `admin`.

Public beta requests are saved as `pending` and the normalized email is inserted into `beta_access` as `invited` before notification delivery is attempted. The service then sends a Resend notification to the admin recipient with single-use approve/decline links. If notification delivery fails, the endpoint still returns a durable pending state so the request remains reviewable; approving a request marks it `approved` and upserts the normalized email into `beta_access` with `active` status, while declining records the decision without granting access.

Required when enabling public request notifications:

```env
RESEND_API_KEY="re_..."
BETA_REQUEST_FROM="Agentic Engineering <beta@your-verified-domain.com>"
BETA_REQUEST_ADMIN_EMAIL="brian.oliveira100@gmail.com"
BETA_REQUEST_APPROVAL_BASE_URL="https://auth.example.com"
```

Submit a public request:

```bash
curl -X POST http://localhost:3000/api/beta/requests \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","preferredName":"Student","whatsappContact":"+15555550123","whatsappConsent":true}'
```

Check the current signed-in user's beta status:

```bash
curl --include --cookie "better-auth-cookie=..." http://localhost:3000/api/beta/access
```

Email-first sign-in preflight is public but only returns credential state after the normalized email is already active in `beta_access`. Inactive, invited, revoked, or missing emails receive a beta-access error and do not learn whether a Better Auth account exists.

```bash
curl -X POST http://localhost:3000/api/beta/email-first-signin \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com"}'
# active with existing email/password: {"email":"student@example.com","credential_state":"has_password"}
# active without email/password: {"email":"student@example.com","credential_state":"needs_password_setup"}
```

The frontend uses this endpoint before showing a password field. Active beta emails without a Better Auth email/password credential are allowed to use the standard Better Auth `signUp.email` flow to create one.

List allowlist entries as a Better Auth admin:

```bash
curl --cookie "better-auth-cookie=..." http://localhost:3000/api/beta/allowlist
```

Allowlist or update a beta user as a Better Auth admin:

```bash
curl -X POST http://localhost:3000/api/beta/allowlist \
  --cookie "better-auth-cookie=..." \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","status":"active"}'
```

Both allowlist endpoints read/write the app-owned `beta_access` table, normalize email addresses to lowercase, and reject non-admin sessions server-side. Statuses are `invited`, `active`, and `revoked`.

## Development

```bash
npm run dev
```

Build and run production output:

```bash
npm run build
npm start
```

## Calling this auth service from another app

1. Add the other app's browser origin to `TRUSTED_ORIGINS`.
2. Use the auth service URL as the Better Auth client `baseURL`.
3. Send requests with credentials/cookies enabled for browser clients.

Example client setup in another TypeScript app:

```ts
import { createAuthClient } from "better-auth/client";
import { adminClient, organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: "https://auth.example.com",
  plugins: [organizationClient(), adminClient()],
});
```

Example sign-up/sign-in calls:

```ts
await authClient.signUp.email({
  email: "user@example.com",
  password: "a-strong-password",
  name: "Example User",
});

await authClient.signIn.email({
  email: "user@example.com",
  password: "a-strong-password",
});
```

Raw HTTP clients can call endpoints under `/api/auth/*` on this service, for example `POST /api/auth/sign-in/email`, and must preserve `Set-Cookie`/`Cookie` headers for session-based flows.

## Production notes

- `advanced.useSecureCookies` is enabled automatically when `NODE_ENV=production`.
- Rate limiting is enabled and stored in the database.
- Sessions are persisted in the database.
- Keep `BETTER_AUTH_URL` set to the public origin of this service.
- Keep `TRUSTED_ORIGINS` limited to your frontend/application origins.
