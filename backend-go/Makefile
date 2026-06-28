.PHONY: run build docker-up docker-down migrate-up migrate-down sqlc docs test test-integration lint

run:
	go run ./cmd/server
build:
	go build -o bin/server ./cmd/server
docker-up:
	docker compose up --build
docker-down:
	docker compose down -v
migrate-up:
	for f in internal/db/migrations/*.up.sql; do psql "$$DATABASE_URL" -f $$f; done
migrate-down:
	for f in internal/db/migrations/*.down.sql; do psql "$$DATABASE_URL" -f $$f; done
sqlc:
	sqlc generate
docs:
	swag init -g cmd/server/main.go -o docs --parseInternal --parseDependency
test:
	go test ./... -race -cover

test-integration:
	@set -e; \
	CID=$$(docker run -d --rm -e POSTGRES_DB=lms_test -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:16-alpine); \
	trap 'docker stop $$CID >/dev/null' EXIT; \
	until docker exec $$CID pg_isready -U postgres -d lms_test >/dev/null 2>&1; do sleep 1; done; \
	BACKEND_INTEGRATION_DATABASE_URL="postgres://postgres:postgres@localhost:55432/lms_test?sslmode=disable" go test -tags=integration ./internal/repository/... -race -cover
lint:
	golangci-lint run
