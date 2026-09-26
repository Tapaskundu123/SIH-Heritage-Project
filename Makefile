# ===========================================================
# KarigarSetu — Makefile
# Convenience commands for Docker Compose operations.
#
# Usage: make <target>
# Requires: Docker Desktop, make (Git Bash / WSL / Linux / macOS)
# ===========================================================

COMPOSE       = docker compose
ENV_FILE      = .env.compose.local
COMPOSE_FLAGS = --env-file $(ENV_FILE)

# Default target
.DEFAULT_GOAL := help

# ---- Help ----
.PHONY: help
help: ## Show this help message
	@echo ""
	@echo "  KarigarSetu — Docker Compose Commands"
	@echo "  ======================================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ---- Setup ----
.PHONY: env-setup
env-setup: ## Copy .env.compose → .env.compose.local (first-time setup)
	@if [ ! -f $(ENV_FILE) ]; then \
		cp .env.compose $(ENV_FILE); \
		echo "✅ Created $(ENV_FILE) — fill in your secrets before running 'make up'"; \
	else \
		echo "⚠️  $(ENV_FILE) already exists — skipping"; \
	fi

# ---- Build ----
.PHONY: build
build: ## Build all Docker images
	$(COMPOSE) $(COMPOSE_FLAGS) build --parallel

.PHONY: build-no-cache
build-no-cache: ## Build all images without cache
	$(COMPOSE) $(COMPOSE_FLAGS) build --no-cache --parallel

.PHONY: build-backend
build-backend: ## Build only the backend image
	$(COMPOSE) $(COMPOSE_FLAGS) build backend

.PHONY: build-ai
build-ai: ## Build only the AI service image
	$(COMPOSE) $(COMPOSE_FLAGS) build ai

.PHONY: build-frontend
build-frontend: ## Build only the frontend image
	$(COMPOSE) $(COMPOSE_FLAGS) build frontend

# ---- Run (Production) ----
.PHONY: up
up: ## Start all services in production mode (detached)
	$(COMPOSE) $(COMPOSE_FLAGS) -f docker-compose.yml up -d

.PHONY: down
down: ## Stop and remove containers
	$(COMPOSE) $(COMPOSE_FLAGS) down

.PHONY: restart
restart: down up ## Restart all services

# ---- Run (Development — live reload) ----
.PHONY: dev
dev: ## Start all services in development mode with live reload
	$(COMPOSE) $(COMPOSE_FLAGS) up

.PHONY: dev-detach
dev-detach: ## Start all services in development mode (detached)
	$(COMPOSE) $(COMPOSE_FLAGS) up -d

# ---- Logs ----
.PHONY: logs
logs: ## Follow logs for all services
	$(COMPOSE) $(COMPOSE_FLAGS) logs -f

.PHONY: logs-backend
logs-backend: ## Follow backend logs
	$(COMPOSE) $(COMPOSE_FLAGS) logs -f backend

.PHONY: logs-ai
logs-ai: ## Follow AI service logs
	$(COMPOSE) $(COMPOSE_FLAGS) logs -f ai

.PHONY: logs-frontend
logs-frontend: ## Follow frontend logs
	$(COMPOSE) $(COMPOSE_FLAGS) logs -f frontend

# ---- Status ----
.PHONY: ps
ps: ## Show running containers and health status
	$(COMPOSE) $(COMPOSE_FLAGS) ps

.PHONY: health
health: ## Quick health check for all services
	@echo "--- Backend ---"
	@curl -sf http://localhost:5000/health | python3 -m json.tool || echo "❌ Backend not responding"
	@echo ""
	@echo "--- AI Service ---"
	@curl -sf http://localhost:8000/health | python3 -m json.tool || echo "❌ AI service not responding"
	@echo ""
	@echo "--- Frontend ---"
	@curl -sf http://localhost:3000 -o /dev/null -w "HTTP %{http_code}\n" || echo "❌ Frontend not responding"

# ---- Shell access ----
.PHONY: shell-backend
shell-backend: ## Open shell in backend container
	$(COMPOSE) $(COMPOSE_FLAGS) exec backend sh

.PHONY: shell-ai
shell-ai: ## Open shell in AI service container
	$(COMPOSE) $(COMPOSE_FLAGS) exec ai bash

.PHONY: shell-frontend
shell-frontend: ## Open shell in frontend container
	$(COMPOSE) $(COMPOSE_FLAGS) exec frontend sh

# ---- Cleanup ----
.PHONY: prune
prune: ## Remove stopped containers, dangling images, unused volumes
	docker system prune -f
	docker volume prune -f

.PHONY: nuke
nuke: ## WARNING: Remove ALL containers, images, and volumes for this project
	$(COMPOSE) $(COMPOSE_FLAGS) down -v --rmi all --remove-orphans
	@echo "🗑️  All containers, images and volumes removed."

# ---- Validate ----
.PHONY: validate
validate: ## Validate docker-compose.yml syntax
	$(COMPOSE) $(COMPOSE_FLAGS) config --quiet && echo "✅ docker-compose.yml is valid"
