.PHONY: run build docker-up docker-down migrate-up migrate-down sqlc docs test lint

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
lint:
	golangci-lint run
