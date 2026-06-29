.DEFAULT_GOAL := help

.PHONY: help dev dev-no-install dev-no-migrate dev-help install check test build \
	prod prod-infra prod-migrate prod-auth-migrate prod-apps prod-logs prod-restart prod-down prod-down-volumes prod-ps prod-psql prod-smoke \
	backend-run backend-build backend-test backend-docs backend-sqlc backend-docker-up backend-docker-down \
	auth-dev auth-build auth-typecheck auth-migrate auth-generate \
	frontend-dev frontend-build frontend-check frontend-test

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make <target>\n\nTargets:\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-22s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

dev: ## Start the full local development stack
	./dev.sh

dev-no-install: ## Start the dev stack without npm/bun install checks
	./dev.sh --no-install

dev-no-migrate: ## Start the dev stack without database migrations
	./dev.sh --no-migrate

dev-help: ## Show dev.sh help
	./dev.sh --help

install: ## Install frontend and auth service dependencies
	cd auth_service && npm install
	cd frontend-react && bun install

check: ## Run repository validation checks
	cd auth_service && npm run typecheck
	$(MAKE) -C backend-go test
	cd frontend-react && bun --bun run check

test: ## Run backend and frontend tests
	$(MAKE) -C backend-go test
	cd frontend-react && bun --bun run test

build: ## Build all services/apps
	$(MAKE) -C backend-go build
	cd auth_service && npm run build
	cd frontend-react && bun --bun run build

prod: ## Start/rebuild the production Docker Compose stack
	docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml up -d --build

prod-infra: ## Start/rebuild production infrastructure services
	docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml up -d --build postgres redis otel-collector prometheus grafana

prod-migrate: ## Run production backend database migrations
	docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml run --rm postgres-migrate

prod-auth-migrate: ## Run production Better Auth migrations
	docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml run --rm auth npm run auth:migrate:prod

prod-apps: ## Start/rebuild production app services
	docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml up -d --build backend auth

prod-logs: ## Tail production backend/auth logs
	docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml logs -f backend auth

prod-restart: ## Restart/rebuild production app services
	$(MAKE) prod-apps

prod-down: ## Stop the production Docker Compose stack without deleting volumes
	docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml down

prod-down-volumes: ## DANGER: Stop production stack and delete all persisted volumes
	@printf '\nDANGER: This deletes production Docker volumes, including Postgres, Redis, Grafana, and Prometheus data.\n'
	@printf 'Only use this for a fresh/reset deployment when data loss is acceptable.\n\n'
	@printf 'Type "delete production volumes" to continue: '; \
	read confirm; \
	if [ "$$confirm" = "delete production volumes" ]; then \
		docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml down -v; \
	else \
		echo 'Aborted.'; \
		exit 1; \
	fi

prod-ps: ## Show production Docker Compose service status
	docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml ps

prod-psql: ## Open psql in the production Postgres container
	docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml exec postgres sh -lc 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

prod-smoke: ## Run production API/auth smoke checks
	curl https://api.brianito.com/health
	curl https://auth.brianito.com/api/auth/ok

backend-run: ## Run the Go backend
	$(MAKE) -C backend-go run

backend-build: ## Build the Go backend
	$(MAKE) -C backend-go build

backend-test: ## Test the Go backend
	$(MAKE) -C backend-go test

backend-docs: ## Generate backend Swagger docs
	$(MAKE) -C backend-go docs

backend-sqlc: ## Generate backend sqlc code
	$(MAKE) -C backend-go sqlc

backend-docker-up: ## Start backend Docker services
	$(MAKE) -C backend-go docker-up

backend-docker-down: ## Stop and remove backend Docker services/volumes
	$(MAKE) -C backend-go docker-down

auth-dev: ## Run the auth service dev server
	cd auth_service && npm run dev

auth-build: ## Build the auth service
	cd auth_service && npm run build

auth-typecheck: ## Typecheck the auth service
	cd auth_service && npm run typecheck

auth-migrate: ## Run Better Auth migrations
	cd auth_service && npm run auth:migrate

auth-generate: ## Generate Better Auth schema artifacts
	cd auth_service && npm run auth:generate

frontend-dev: ## Run the frontend dev server
	cd frontend-react && bun --bun run dev

frontend-build: ## Build the frontend
	cd frontend-react && bun --bun run build

frontend-check: ## Run frontend checks
	cd frontend-react && bun --bun run check

frontend-test: ## Run frontend tests
	cd frontend-react && bun --bun run test
