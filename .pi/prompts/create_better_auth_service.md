---
description: Scaffold a standalone TypeScript Better Auth service with PostgreSQL, Organization, and Admin plugins
argument-hint: "[service-name=auth_service]"
---
Create a standalone Better Auth service in a folder named `${1:-auth_service}`. If no argument is provided, use `auth_service`.

Use the Better Auth best-practices skill guidance. The service must be TypeScript-first and easy to connect to the existing application PostgreSQL database via `.env`.

## Requirements

1. Create the service folder and scaffold a minimal Node/Hono TypeScript API.
2. Install/configure Better Auth with:
   - PostgreSQL using the direct `pg.Pool` adapter via `DATABASE_URL`
   - Use the same application database and `public` schema as the backend; do not create a separate auth database or extra PostgreSQL schema
   - Email/password authentication enabled
   - Organization plugin enabled
   - Admin plugin enabled
   - OpenAPI plugin if available and compatible
3. Add client helper setup with Organization and Admin client plugins.
4. Add environment files:
   - `.env.example` with `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `PORT`, and trusted origin variables
   - Do not commit real secrets in `.env`
5. Add scripts for:
   - `dev`
   - `build`
   - `start`
   - `auth:migrate` using `npx @better-auth/cli@latest migrate --config src/auth.ts`
   - `auth:generate` using `npx @better-auth/cli@latest generate --config src/auth.ts`
6. Add clear integration docs in `README.md`, including:
   - how to set `DATABASE_URL` to the shared application database
   - how to generate `BETTER_AUTH_SECRET`
   - how to run migrations after plugin changes
   - available auth endpoint base path
   - how another app can call/use this auth service
7. Include production-minded defaults:
   - secure cookies in production
   - trusted origins from env
   - rate limiting enabled
   - sessions stored in database
8. Keep code framework-agnostic enough to run as a separate auth microservice while sharing the app database/schema.

## Suggested files

Create at least:

```text
${1:-auth_service}/
  package.json
  tsconfig.json
  .env.example
  README.md
  src/
    index.ts
    auth.ts
    auth-client.ts
    db.ts
    env.ts
```

## Implementation notes

- Use `dotenv/config` or equivalent env loading.
- Use `pg` for PostgreSQL connection pooling.
- Export `auth` from `src/auth.ts` and `authClient` from `src/auth-client.ts`.
- Mount Better Auth at `/api/auth/*`.
- In local examples, prefer `DATABASE_URL=postgresql://app:app@localhost:55432/app?sslmode=disable` so Better Auth tables land in the same database/public schema as backend tables.
- Verify the health endpoint `GET /api/auth/ok` returns `{ "status": "ok" }` after setup.
- Re-run Better Auth CLI migrations/generation after adding or changing plugins.
- If exact import paths for `organization`, `admin`, or their client plugins differ for the installed Better Auth version, check installed package docs/types and adjust imports accordingly.

After creating the files, run package-manager install if appropriate for this workspace, then run typecheck/build. Report any follow-up commands the user needs to run manually, especially migration commands and `.env` setup.
