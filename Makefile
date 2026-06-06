# Rentals Dashboard — cross-platform dev tasks (macOS + Linux)
SHELL := /bin/bash
.PHONY: help setup dev db-up db-down db-reset db-wait studio install-node check-node check-docker env-setup

# Prefer Compose V2 (`docker compose`); fall back to legacy `docker-compose`.
DOCKER_COMPOSE := $(shell \
	if docker compose version >/dev/null 2>&1; then \
		echo "docker compose"; \
	elif command -v docker-compose >/dev/null 2>&1; then \
		echo docker-compose; \
	else \
		echo "docker compose"; \
	fi)

UNAME := $(shell uname -s)
DB_WAIT_SECONDS ?= 60

# ── Help ───────────────────────────────────────────────────────────────────────

help:
	@echo "Rentals Dashboard — make targets"
	@echo ""
	@echo "  make install-node   Install fnm (Node version manager)"
	@echo "  make setup          First-time setup (env, DB, deps, schema, seed)"
	@echo "  make dev            Start Postgres + Next.js dev server"
	@echo "  make db-up          Start Postgres container"
	@echo "  make db-down        Stop Postgres container"
	@echo "  make db-reset       Push schema and reseed demo data"
	@echo "  make db-wait        Wait until Postgres accepts connections"
	@echo "  make studio         Open Prisma Studio (http://localhost:5555)"
	@echo ""
	@echo "Platform: $(UNAME)  |  Compose: $(DOCKER_COMPOSE)"

# ── Prerequisites ──────────────────────────────────────────────────────────────

install-node:
	@echo "Installing fnm (Fast Node Manager)..."
	@curl -fsSL https://fnm.vercel.app/install | bash
	@echo ""
	@echo "fnm installed. Restart your terminal, then run:"
	@echo "  fnm install 20"
	@echo "  fnm default 20"
	@echo "  make setup"
	@echo ""
	@if [ "$(UNAME)" = "Darwin" ]; then \
		echo "On macOS you can also install Node with Homebrew:"; \
		echo "  brew install node@20"; \
	fi

check-node:
	@if ! command -v node >/dev/null 2>&1; then \
		echo ""; \
		echo "Error: Node.js not found."; \
		echo "Run 'make install-node', restart your terminal, then:"; \
		echo "  fnm install 20 && fnm default 20"; \
		if [ "$(UNAME)" = "Darwin" ]; then \
			echo "Or on macOS: brew install node@20"; \
		fi; \
		echo ""; \
		exit 1; \
	fi
	@node_major=$$(node -v | sed 's/v//' | cut -d. -f1); \
	if [ "$$node_major" -lt 20 ]; then \
		echo ""; \
		echo "Error: Node $$(node -v) found, but >= 20 is required."; \
		echo "Run: fnm install 20 && fnm default 20"; \
		echo ""; \
		exit 1; \
	fi
	@echo "Node $$(node -v) ✓"

check-docker:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo ""; \
		echo "Error: Docker not found."; \
		if [ "$(UNAME)" = "Darwin" ]; then \
			echo "Install Docker Desktop: https://www.docker.com/products/docker-desktop/"; \
		else \
			echo "Install Docker Engine for your distro, then start the daemon."; \
			echo "Example (systemd): sudo systemctl start docker"; \
		fi; \
		echo ""; \
		exit 1; \
	fi
	@if ! docker info >/dev/null 2>&1; then \
		echo ""; \
		echo "Error: Docker daemon is not running."; \
		if [ "$(UNAME)" = "Darwin" ]; then \
			echo "Start Docker Desktop, or run: open -a Docker"; \
		else \
			echo "Start Docker, e.g.: sudo systemctl start docker"; \
		fi; \
		echo ""; \
		exit 1; \
	fi
	@if ! $(DOCKER_COMPOSE) version >/dev/null 2>&1; then \
		echo ""; \
		echo "Error: Docker Compose is not available."; \
		echo "Install the Compose plugin or docker-compose package."; \
		echo ""; \
		exit 1; \
	fi
	@echo "Docker ✓ ($(DOCKER_COMPOSE))"

env-setup:
	@if [ ! -f .env ]; then \
		if [ ! -f .env.example ]; then \
			echo "Error: .env.example is missing."; \
			exit 1; \
		fi; \
		cp .env.example .env; \
		secret=$$(openssl rand -base64 32 2>/dev/null | tr -d '\n'); \
		if [ -z "$$secret" ]; then \
			secret=$$(head -c 32 /dev/urandom | base64 | tr -d '\n'); \
		fi; \
		if [ "$(UNAME)" = "Darwin" ]; then \
			sed -i '' "s|SESSION_SECRET=\"change-me-to-a-long-random-string\"|SESSION_SECRET=\"$$secret\"|" .env; \
		else \
			sed -i "s|SESSION_SECRET=\"change-me-to-a-long-random-string\"|SESSION_SECRET=\"$$secret\"|" .env; \
		fi; \
		echo ".env created from .env.example"; \
	else \
		echo ".env already exists"; \
	fi

db-wait: check-docker
	@echo "Waiting for Postgres (up to $(DB_WAIT_SECONDS)s)..."
	@for i in $$(seq 1 $(DB_WAIT_SECONDS)); do \
		if $(DOCKER_COMPOSE) exec -T db pg_isready -U rental -d rental_app >/dev/null 2>&1; then \
			echo "Postgres ready ✓"; \
			exit 0; \
		fi; \
		sleep 1; \
	done; \
	echo "Postgres did not become ready within $(DB_WAIT_SECONDS)s."; \
	echo "Check logs: $(DOCKER_COMPOSE) logs db"; \
	exit 1

# ── Local dev setup ────────────────────────────────────────────────────────────

setup: check-node check-docker env-setup
	$(DOCKER_COMPOSE) up -d
	$(MAKE) db-wait
	npm install
	npm run db:push
	npm run db:seed
	@mkdir -p uploads
	@echo ""
	@echo "Setup complete. Run 'make dev' to start."
	@echo "Demo account: demo@landlord.app / demo1234"

dev: check-node check-docker env-setup
	$(DOCKER_COMPOSE) up -d
	$(MAKE) db-wait
	npm run dev

# ── Database helpers ───────────────────────────────────────────────────────────

db-up: check-docker
	$(DOCKER_COMPOSE) up -d
	$(MAKE) db-wait

db-down: check-docker
	$(DOCKER_COMPOSE) down

db-reset: check-node check-docker
	$(DOCKER_COMPOSE) up -d
	$(MAKE) db-wait
	npm run db:push
	npm run db:seed

studio: check-node env-setup
	npx prisma studio
