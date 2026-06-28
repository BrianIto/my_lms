# Production Deploy TODO

Tracking checklist for deploying the LMS with Vercel frontend, Hetzner VPS backend/auth, Traefik, Docker Compose, PostgreSQL, Redis, Prometheus/Grafana, and OpenTelemetry.

## Already done

- [x] Decided production domains:
  - `learning.brianito.com` → frontend on Vercel
  - `api.brianito.com` → Go backend on VPS
  - `auth.brianito.com` → Better Auth service on VPS
- [x] Decided VPS IP: `178.105.113.44`
- [x] Decided Let's Encrypt email: `contact@brianito.com`
- [x] Decided root domain behavior: leave `brianito.com` portfolio unchanged
- [x] Decided sender domain: `brianito.com`
- [x] Decided initial observability approach: local Prometheus + Grafana + OpenTelemetry Collector
- [x] Decided to skip backups for initial deploy
- [x] Added production deploy plan: `plan/06-production-deploy.md`
- [x] Linked production deploy plan from `plan/README.md`
- [x] Fixed auth DB schema example to use `DATABASE_SCHEMA="public"`
- [x] Fixed auth service schema defaults to use `public` instead of `app`

## Repository work

- [x] Add production Docker Compose file:
  - `deploy/docker-compose.prod.yml`
- [x] Add production env example:
  - `deploy/.env.prod.example`
- [x] Add Traefik dynamic config if needed:
  - `deploy/traefik/dynamic.yml`
- [x] Add OpenTelemetry collector production config:
  - `deploy/otel/otel-collector.prod.yml`
- [x] Add Prometheus config:
  - `deploy/prometheus/prometheus.yml`
- [x] Add Grafana Prometheus datasource provisioning:
  - `deploy/grafana/provisioning/datasources/prometheus.yml`
- [x] Add auth service Dockerfile:
  - `auth_service/Dockerfile`
- [x] Add backend migration one-off service to production Compose:
  - service name: `postgres-migrate`
  - runs `backend-go/internal/db/migrations/*.up.sql`
- [x] Add deploy documentation:
  - `deploy/README.md`

## Secrets and production env

- [ ] Generate secure `POSTGRES_PASSWORD`
  ```bash
  openssl rand -base64 32
  ```
- [ ] Generate secure `BETTER_AUTH_SECRET`
  ```bash
  openssl rand -base64 32
  ```
- [ ] Set Google OAuth values:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- [ ] Set Resend value:
  - `RESEND_API_KEY`
- [ ] Set production sender:
  ```env
  BETA_REQUEST_FROM="Brianito Learning <noreply@brianito.com>"
  ```
- [ ] Set beta/admin email:
  ```env
  BETA_REQUEST_ADMIN_EMAIL=contact@brianito.com
  ```

## DNS

- [ ] Add Vercel frontend DNS:
  ```txt
  learning.brianito.com  CNAME  cname.vercel-dns.com
  ```
- [ ] Add backend API DNS:
  ```txt
  api.brianito.com  A  178.105.113.44
  ```
- [ ] Add auth service DNS:
  ```txt
  auth.brianito.com  A  178.105.113.44
  ```
- [ ] Confirm `brianito.com` root DNS remains unchanged

## Vercel

- [ ] Configure frontend env vars:
  ```env
  VITE_AUTH_URL=https://auth.brianito.com
  VITE_API_URL=https://api.brianito.com
  ```
- [ ] Connect `learning.brianito.com` to the Vercel project
- [ ] Deploy frontend production build

## Google OAuth

- [ ] Add production Google OAuth redirect URI:
  ```txt
  https://auth.brianito.com/api/auth/callback/google
  ```
- [ ] Confirm Google sign-in works from `https://learning.brianito.com`

## VPS setup

- [ ] SSH into Hetzner VPS `178.105.113.44`
- [ ] Install Docker and Docker Compose plugin
- [ ] Configure firewall to allow only:
  - `22`
  - `80`
  - `443`
- [ ] Confirm Postgres and Redis ports are not publicly exposed
- [ ] Clone/pull repository onto VPS
- [ ] Create production env file from `deploy/.env.prod.example`
- [ ] Fill production env file with generated secrets and provider values

## First production deploy

- [ ] Start infrastructure/services:
  ```bash
  docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml up -d --build
  ```
- [ ] Run backend migrations:
  ```bash
  docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml run --rm postgres-migrate
  ```
- [ ] Run Better Auth migrations:
  ```bash
  docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml run --rm auth npm run auth:migrate
  ```
- [ ] Restart app services after migrations if needed:
  ```bash
  docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml up -d --build backend auth
  ```

## Local validation before deploy

- [ ] Backend tests pass:
  ```bash
  cd backend-go && make test
  ```
- [ ] Auth service typecheck/build pass:
  ```bash
  cd auth_service && npm run typecheck && npm run build
  ```
- [ ] Frontend check/build pass:
  ```bash
  cd frontend-react && bun --bun run check && bun --bun run build
  ```

## Production smoke checks

- [ ] Backend health passes:
  ```bash
  curl https://api.brianito.com/health
  ```
- [ ] Auth health passes:
  ```bash
  curl https://auth.brianito.com/api/auth/ok
  ```
- [ ] Frontend loads at:
  ```txt
  https://learning.brianito.com
  ```
- [ ] Sign-in works
- [ ] Google sign-in works, if enabled
- [ ] Private LMS routes reject unauthenticated users
- [ ] Backend enforces beta access server-side
- [ ] Course catalog loads
- [ ] Progress updates work
- [ ] Redis-backed course cache works
- [ ] Metrics appear in Prometheus/Grafana

## Deferred

- [ ] Add PostgreSQL backups before public/paid launch
- [ ] Consider Tempo for traces if local resources allow it
- [ ] Consider external observability provider if VPS resources become constrained
