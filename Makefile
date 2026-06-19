COMPOSE = docker compose
RUN_DEV = $(COMPOSE) run --rm dev

.DEFAULT_GOAL := help

.PHONY: help setup build dev check test lint typecheck shell clean

help: ## Show available commands
	@grep -E '^[a-zA-Z0-9_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: ## Build image and install deps into isolated node_modules volume
	$(COMPOSE) build
	$(RUN_DEV) npm install

build: ## Production bundle → dist/
	$(RUN_DEV) npm run build

dev: ## Watch rebuild (foreground)
	$(COMPOSE) up dev

check: ## lint + typecheck + test
	$(RUN_DEV) npm run check

test: ## Run unit tests
	$(RUN_DEV) npm run test

lint: ## ESLint
	$(RUN_DEV) npm run lint

typecheck: ## TypeScript
	$(RUN_DEV) npm run typecheck

shell: ## Interactive shell in dev container
	$(RUN_DEV) bash

clean: ## Remove build output on host
	rm -rf dist
