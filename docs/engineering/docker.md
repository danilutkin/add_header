# Docker development

All toolchain commands run in an isolated container. Do not run `npm install` on the host.

## Quick reference

```bash
make setup     # once: build image + npm install in volume
make check     # lint + typecheck + test
make build     # dist/ on host
make dev       # watch rebuild
make shell     # debug inside container
```

Equivalent without Make:

```bash
docker compose build
docker compose run --rm dev npm install
docker compose run --rm dev npm run check
docker compose run --rm dev npm run build
docker compose up dev
```

## Volumes

- **Bind mount** `.` → `/app` — edit source on host, changes visible in container
- **Named volume** `node_modules` — dependencies never touch host filesystem
- **`dist/`** — written through bind mount so host Chrome can load unpacked extension

## When lockfile changes

Re-run:

```bash
make setup
```

Or: `docker compose run --rm dev npm install`

## What stays on the host

Chrome manual verification only. The extension cannot run inside the container — load `dist/` from the host browser after `make build`.

## Troubleshooting

**Stale dependencies after package.json change**

```bash
docker compose run --rm dev npm install
```

**Reset isolated node_modules volume**

```bash
docker compose down -v
make setup
```

**Permission errors on dist/** (Linux)

Ensure your user can write to the project directory; the container runs as root by default for bind-mount compatibility.
