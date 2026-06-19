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

Set `DATABASE_URL` in `.env` to your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
```

For managed PostgreSQL providers, you may need SSL:

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

The service creates app-owned `beta_access` and `beta_access_requests` tables on startup for private beta gating and public beta-request review.

Public beta requests are saved as `pending`, then a Resend notification is sent to the admin recipient with single-use approve/decline links. Approving a request marks it `approved` and upserts the normalized email into `beta_access` with `active` status; declining records the decision without granting access.

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

Allowlist or update a beta user:

```bash
curl -X POST http://localhost:3000/api/beta/allowlist \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","status":"active"}'
```

Statuses are `invited`, `active`, and `revoked`.

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
