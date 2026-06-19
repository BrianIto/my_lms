# Go Backend Server

Production-ready Go backend using chi, PostgreSQL/pgx, sqlc layout, Redis, OpenTelemetry, WebSockets, Swaggo, and Scalar.

## Run

```bash
cp .env.example .env
docker compose up --build
```

Then open:

- Health: http://localhost:8080/health
- Scalar API docs: http://localhost:8080/scalar
- Swagger JSON: http://localhost:8080/swagger/doc.json
- WebSocket: ws://localhost:8080/api/v1/ws

## Route versioning decision

Business/application API routes are versioned under `/api/v1/*`.
Operational and documentation routes are intentionally unversioned:

- `GET /health`
- `GET /scalar`
- `GET /swagger/*`

`/health` must remain `http://localhost:8080/health`, not `http://localhost:8080/api/v1/health`.
OpenAPI annotations use `@BasePath /` plus full `@Router /api/v1/...` paths for business endpoints so Scalar shows accurate URLs.

## Development

```bash
make run
make build
make test
make docs
make sqlc
```

Regenerate `docs/` whenever handlers or DTOs change:

```bash
go install github.com/swaggo/swag/cmd/swag@latest
swag init -g cmd/server/main.go -o docs --parseInternal --parseDependency
```

Run migrations manually with:

```bash
export DATABASE_URL=postgres://app:app@localhost:5432/app?sslmode=disable
make migrate-up
```
