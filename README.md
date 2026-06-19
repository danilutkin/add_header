# add_header

Chrome extension (MV3) that lets developers and QA add custom HTTP request headers on specific websites — without the DevTools ritual.

## What it does

- Set headers **per site** (`https://example.com` or `*.example.com`)
- Toggle rules on/off globally or per site
- Headers apply via **declarativeNetRequest** (reliable, non-blocking)

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Chrome on the host (for manual smoke only — extension runs in host browser)

All build, test, and lint commands run **inside Docker**. No local Node.js required.

## First-time setup

```bash
make setup
```

## Dev loop (Docker)

```bash
make check        # lint + typecheck + test
make build        # production bundle → dist/
make dev          # watch rebuild (foreground)
make test
make lint
make shell        # interactive container shell
```

After code changes: rebuild (or keep `make dev` running) and click **Reload** on the extension card in `chrome://extensions`.

## Load unpacked (manual smoke)

1. `make build`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. **Load unpacked** → select the `dist/` folder
5. Open **Manage headers** from the popup, add a rule for `https://httpbin.org`
6. Visit [httpbin.org/headers](https://httpbin.org/headers) and confirm your header appears

## Isolation model

| What | Where |
|------|--------|
| Node, npm, dependencies | Docker volume `node_modules` (not on host) |
| Source code | Bind-mounted from host (edit locally) |
| Build output `dist/` | Written to host (Chrome loads unpacked from here) |
| Chrome / manual QA | Host browser only |

## Project docs

- Agent context: [add_header_CONTEXT.md](add_header_CONTEXT.md)
- Agent routing: [AGENTS.md](AGENTS.md)
- Docker details: [docs/engineering/docker.md](docs/engineering/docker.md)
- Status & roadmap: [docs/project/](docs/project/)

## MVP scope

In scope: per-origin header rules, popup + options UI, local storage, DNR apply.

Out of scope for now: cloud sync, Firefox/Safari, full API client, backend.
