# 06 — Production Deploy: Traefik, Docker Compose, Vercel, and Observability

## Goal

Deploy the LMS production beta with the frontend on Vercel and backend services on a Hetzner VPS using Docker Compose, Traefik, HTTPS, PostgreSQL, Redis, and OpenTelemetry.

## Fixed deployment decisions

- Root domain: `brianito.com` — already used by the portfolio. Do not redirect or modify it.
- Frontend: `learning.brianito.com` on Vercel.
- Backend API: `api.brianito.com` on Hetzner VPS through Traefik.
- Auth service: `auth.brianito.com` on Hetzner VPS through Traefik.
- Hetzner VPS IPv4: `178.105.113.44`.
- Let's Encrypt email: `contact@brianito.com`.
- Sender domain: `brianito.com`.
- Backups: intentionally skipped for the first deployment. Add before public launch or paid usage.
- Traefik dashboard: already configured outside this project. Do not add a second dashboard unless explicitly requested.

## DNS records

Configure only these LMS records. Leave `brianito.com` unchanged.

```txt
learning.brianito.com  CNAME  cname.vercel-dns.com
api.brianito.com       A      178.105.113.44
auth.brianito.com      A      178.105.113.44
```

## Production architecture

```txt
Vercel
└── learning.brianito.com
    ├── VITE_API_URL=https://api.brianito.com
    └── VITE_AUTH_URL=https://auth.brianito.com

Hetzner VPS 178.105.113.44
├── Traefik :80/:443
│   ├── api.brianito.com  -> backend-go:8080
│   └── auth.brianito.com -> auth_service:3000
├── backend-go
├── auth_service
├── postgres
├── redis
├── otel-collector
├── prometheus
└── grafana
```

## Production files to add

```txt
deploy/
├── docker-compose.prod.yml
├── .env.prod.example
├── traefik/
│   └── dynamic.yml
├── otel/
│   └── otel-collector.prod.yml
├── prometheus/
│   └── prometheus.yml
└── README.md

auth_service/
└── Dockerfile
```

Keep production secrets out of git. Commit only `.env.prod.example`.

## Required production env values

### Vercel frontend

```env
VITE_AUTH_URL=https://auth.brianito.com
VITE_API_URL=https://api.brianito.com
```

### Traefik

```env
TRAEFIK_ACME_EMAIL=contact@brianito.com
```

### Backend

```env
ENV=production
HTTP_ADDR=:8080
DATABASE_URL=postgres://app:${POSTGRES_PASSWORD}@postgres:5432/app?sslmode=disable
REDIS_ADDR=redis:6379
REDIS_PASSWORD=
AUTH_SERVICE_URL=http://auth:3000
OTEL_EXPORTER_OTLP_ENDPOINT=otel-collector:4317
OTEL_SERVICE_NAME=lms-backend
WS_ALLOWED_ORIGINS=https://learning.brianito.com,https://auth.brianito.com
```

### Auth service

Use the shared Postgres database and the `public` schema.

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://app:${POSTGRES_PASSWORD}@postgres:5432/app?sslmode=disable
DATABASE_SCHEMA=public
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
BETTER_AUTH_URL=https://auth.brianito.com
TRUSTED_ORIGINS=https://learning.brianito.com,https://api.brianito.com,https://auth.brianito.com
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
RESEND_API_KEY=${RESEND_API_KEY}
BETA_REQUEST_FROM="Brianito Learning <noreply@brianito.com>"
BETA_REQUEST_ADMIN_EMAIL=contact@brianito.com
BETA_REQUEST_APPROVAL_BASE_URL=https://auth.brianito.com
```

Generate secrets on the VPS or a trusted local machine:

```bash
openssl rand -base64 32 # BETTER_AUTH_SECRET
openssl rand -hex 32    # POSTGRES_PASSWORD; keep URL-safe because it is embedded in DATABASE_URL
```

Do not use reserved URL characters like `@`, `:`, `/`, `?`, or `#` in `POSTGRES_PASSWORD` unless every database URL uses the URL-encoded form.

## Auth DB schema fix

`auth_service/.env.example` and production env must use:

```env
DATABASE_SCHEMA="public"
```

Do not create a separate `app` schema for Better Auth. The project uses one Postgres database and `public` schema with ownership separated by table/service.

## Auth service Dockerfile plan

Add a production Dockerfile for `auth_service`:

- Use Node 20+ Alpine.
- Install dependencies with `npm ci` when a lockfile exists, otherwise `npm install`.
- Build with `npm run build`.
- Run with `npm run start`.
- Expose port `3000`.
- Do not bake secrets into the image.

## Backend migration command

Backend migrations currently run through:

```bash
cd backend-go
make migrate-up
```

For production Compose, run migrations with a one-off Postgres client container so the distroless backend image does not need `psql`:

```bash
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml run --rm postgres-migrate
```

The `postgres-migrate` service should:

- use `postgres:16-alpine`;
- mount `backend-go/internal/db/migrations` read-only;
- wait for `postgres` to be healthy;
- execute every `*.up.sql` against `DATABASE_URL` in sorted order.

Better Auth migrations run separately:

```bash
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml run --rm auth npm run auth:migrate
```

Deploy order:

1. Start `postgres` and `redis`.
2. Run backend migrations.
3. Run Better Auth migrations.
4. Start/restart `backend` and `auth`.
5. Verify health checks.

## Local Grafana + Prometheus + OpenTelemetry

Local observability is acceptable on the 2 vCPU / 4GB VPS if kept small.

Recommended first version:

- `otel-collector` receives OTLP traces/metrics from backend/auth.
- `prometheus` scrapes collector/backend metrics.
- `grafana` visualizes Prometheus metrics.
- For traces, add `tempo` only if needed; otherwise keep traces exported to collector logs/dev or add Tempo later.

Resource caution:

- Grafana + Prometheus is okay for beta traffic.
- Avoid Loki, Tempo, Jaeger, and high-cardinality metrics at first unless resource usage is monitored.
- Set Prometheus retention low, e.g. `--storage.tsdb.retention.time=7d` and/or size limit.

Prometheus should not be publicly exposed. Grafana may be exposed only behind Traefik with existing dashboard auth/IP protection, or kept accessible through SSH tunnel.

## Health checks

Required checks after deployment:

```bash
curl https://api.brianito.com/health
curl https://auth.brianito.com/api/auth/ok
```

Also verify:

- frontend sign-in works from `https://learning.brianito.com`;
- backend logs show session validation through `AUTH_SERVICE_URL=http://auth:3000`, not `localhost:3000`;
- backend rejects unauthenticated private routes;
- backend enforces beta access server-side;
- Redis-backed course cache works;
- OpenTelemetry metrics appear in Grafana/Prometheus.

## Security checklist

- Only ports `22`, `80`, and `443` are open on the VPS.
- Postgres and Redis are not exposed publicly.
- Secure Better Auth cookies in production.
- `TRUSTED_ORIGINS` is restricted to real origins.
- CORS allows `https://learning.brianito.com` only, plus required auth/backend origins.
- Secrets are generated securely and never committed.
- `brianito.com` root portfolio DNS remains untouched.

## Done checks

```bash
cd backend-go && make test
cd auth_service && npm run typecheck && npm run build
cd frontend-react && bun --bun run check && bun --bun run build
```

Production smoke checks:

```bash
curl https://api.brianito.com/health
curl https://auth.brianito.com/api/auth/ok
```
