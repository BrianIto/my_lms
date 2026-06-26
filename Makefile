.DEFAULT_GOAL := help

.PHONY: help dev dev-no-install dev-no-migrate dev-help install check test build \
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
