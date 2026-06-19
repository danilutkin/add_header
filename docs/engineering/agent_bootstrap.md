# Agent bootstrap

Start here after [add_header_CONTEXT.md](../../add_header_CONTEXT.md).

## Startup path

1. Read context + [README](../../README.md).
2. Check [agent_snapshot.md](../project/agent_snapshot.md) for ranked Now/Next/Not.
3. Read nearest `.cursor/rules/` before editing matched folders.
4. For active work, use `docs/tasks/*.md` as slice control (if present).

## Verification commands

All commands run inside Docker (see [docker.md](docker.md)):

```bash
make setup           # first time only
make check           # lint + typecheck + test
make build           # dist/ for load unpacked
```

Manual Chrome check every slice:

1. Load unpacked from `dist/`
2. Add rule for `https://httpbin.org` with a test header
3. Confirm via DevTools Network or httpbin echo
4. Toggle off / delete — headers must disappear

## Architecture (MVP)

```
UI (popup/options) → shared (types, storage, url-match) → background → DNR
```

- **Single rule model** in `src/shared/types.ts`
- **URL matching** in `src/shared/url-match.ts` — test changes here
- **DNR compilation** in `src/shared/dnr-compile.ts` — background only applies compiled rules

## Permissions note

MVP uses `<all_urls>` host permission so rules work on any origin users configure. Narrow to optional/on-demand permissions before store publish.
