.PHONY: setup dev db-up db-down db-reset studio install-node check-node

# ── Node.js ────────────────────────────────────────────────────────────────────

# Install Node 20 via fnm (works on macOS and Linux/WSL)
install-node:
	@echo "Installing fnm (Fast Node Manager)..."
	@curl -fsSL https://fnm.vercel.app/install | bash
	@echo ""
	@echo "fnm installed. Restart your terminal, then run:"
	@echo "  fnm install 20"
	@echo "  fnm default 20"
	@echo "  make setup"

# Verify Node >= 20 is active
check-node:
	@if ! command -v node > /dev/null 2>&1; then \
		echo ""; \
		echo "Error: Node.js not found."; \
		echo "Run 'make install-node', restart your terminal, then:"; \
		echo "  fnm install 20 && fnm default 20"; \
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

# ── Local dev setup ────────────────────────────────────────────────────────────

# First-time setup: verify node, start DB, install deps, push schema, seed demo data
setup: check-node
	docker compose up -d
	npm install
	npm run db:push
	npm run db:seed
	@echo ""
	@echo "Setup complete. Run 'make dev' to start."
	@echo "Demo account: demo@landlord.app / demo1234"

# Start DB + dev server
dev: check-node
	docker compose up -d
	npm run dev

# ── Database helpers ───────────────────────────────────────────────────────────

# Start the database container only
db-up:
	docker compose up -d

# Stop the database container
db-down:
	docker compose down

# Wipe and reseed the database (keeps the container running)
db-reset:
	npm run db:push
	npm run db:seed

# Open Prisma Studio to browse the database at http://localhost:5555
studio:
	npx prisma studio
