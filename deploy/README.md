# Production Deploy

Production deployment for the LMS backend/auth stack on the Hetzner VPS `178.105.113.44`.

The frontend is deployed separately on Vercel at `https://learning.brianito.com`.

## Domains

Do not change the root `brianito.com`; it is already used by the portfolio.

```txt
learning.brianito.com  CNAME  cname.vercel-dns.com
api.brianito.com       A      178.105.113.44
auth.brianito.com      A      178.105.113.44
```

## Services

`docker-compose.prod.yml` runs:

- `backend` — Go LMS API, routed by Traefik at `https://api.brianito.com`
- `auth` — Better Auth Hono service, routed by Traefik at `https://auth.brianito.com`
- `postgres` — internal only
- `redis` — internal only
- `otel-collector` — internal only
- `prometheus` — bound to VPS localhost at `127.0.0.1:9090`
- `grafana` — bound to VPS localhost at `127.0.0.1:3001`
- `postgres-migrate` — one-off backend migration runner

The stack expects an existing Traefik container/network. The default external network name is `traefik-public`.

## First-time VPS setup

Install Docker and create/join the Traefik network if it does not already exist:

```bash
docker network create traefik-public || true
```

Only expose SSH/HTTP/HTTPS publicly:

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

Postgres, Redis, Prometheus, Grafana, and OpenTelemetry are not exposed publicly. Grafana/Prometheus are reachable through SSH tunnel.

## Environment

Create the production env file on the VPS:

```bash
cp deploy/.env.prod.example deploy/.env.prod
chmod 600 deploy/.env.prod
```

Generate secure values:

```bash
openssl rand -hex 32    # POSTGRES_PASSWORD; keep URL-safe because it is embedded in DATABASE_URL
openssl rand -base64 32 # BETTER_AUTH_SECRET
openssl rand -base64 32 # GRAFANA_ADMIN_PASSWORD
```

Do not use characters like `@`, `:`, `/`, `?`, or `#` in `POSTGRES_PASSWORD` unless you also URL-encode them in every database URL. The production Compose file builds `DATABASE_URL` from this value.

Fill in:

```env
POSTGRES_PASSWORD=...
BETTER_AUTH_SECRET=...
GRAFANA_ADMIN_PASSWORD=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=...
```

Keep:

```env
DATABASE_SCHEMA=public
BETTER_AUTH_URL=https://auth.brianito.com
AUTH_SERVICE_URL=http://auth:3000
TRUSTED_ORIGINS=https://learning.brianito.com,https://api.brianito.com,https://auth.brianito.com
BETA_REQUEST_FROM="Brianito Learning <noreply@brianito.com>"
BETA_REQUEST_ADMIN_EMAIL=contact@brianito.com
```

`AUTH_SERVICE_URL` is used only by the Go backend inside Docker to validate Better Auth sessions. Keep it on the internal Compose DNS name (`http://auth:3000`); do not set it to `http://localhost:3000` in production.

## Vercel frontend env

Set these in Vercel:

```env
VITE_AUTH_URL=https://auth.brianito.com
VITE_API_URL=https://api.brianito.com
```

## Google OAuth

Add this production redirect URI in Google Cloud:

```txt
https://auth.brianito.com/api/auth/callback/google
```

## Deploy

From the repository root on the VPS, start infrastructure first:

```bash
make prod-infra
```

Run backend migrations:

```bash
make prod-migrate
```

Run Better Auth migrations:

```bash
make prod-auth-migrate
```

Start app services:

```bash
make prod-apps
```

Or start/rebuild everything:

```bash
make prod
```

## Smoke checks

```bash
make prod-smoke
```

Then verify from the browser:

```txt
https://learning.brianito.com
```

## Grafana and Prometheus access

They are bound to VPS localhost only.

Use SSH tunnels from your machine:

```bash
ssh -L 3001:127.0.0.1:3001 -L 9090:127.0.0.1:9090 <user>@178.105.113.44
```

Then open:

```txt
Grafana:    http://127.0.0.1:3001
Prometheus: http://127.0.0.1:9090
```

Grafana is preconfigured with Prometheus as the default datasource.

## Useful commands

View logs:

```bash
make prod-logs
```

Restart app services:

```bash
make prod-restart
```

Show service status:

```bash
make prod-ps
```

Stop stack without deleting persisted data:

```bash
make prod-down
```

Reset the production stack and delete all persisted volumes:

```bash
make prod-down-volumes
```

`make prod-down-volumes` is destructive. It removes Postgres, Redis, Grafana, and Prometheus volumes. Only use it for a fresh/reset deployment when data loss is acceptable, such as clearing an old database initialized with the wrong credentials.

## Local validation before deploy

```bash
make check
make build
```

## Deferred

Backups are intentionally skipped for the initial deploy. Add PostgreSQL backups before public/paid launch.
