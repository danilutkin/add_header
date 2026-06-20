# Current status

Last reviewed: 2026-06-20

## Scorecard

| Area | Status |
|------|--------|
| MV3 scaffold | Done — build outputs `dist/` |
| Per-site rules + profiles + DNR | Done |
| Popup / options UI | Done — profiles, draft header rows |
| Unit tests | Done — 53 tests (`make check`) |
| Manual Chrome smoke | Done — httpbin + localhost `/headers` |
| Store publish | Not started |

## Manual smoke (2026-06-19)

| Check | Result |
|-------|--------|
| httpbin headers echo | Pass |
| localhost `/headers` with profile switch | Pass |
| Popup reopen → site **On** when headers exist | Pass (policy A) |
| Site **Off** → no custom headers on echo | Pass |
| Profile switch keeps saved headers | Pass |
| Delete all named headers → rule removed on save | Pass |
| Global off → no injection | Pass |

## Behavior notes

- **Site On (policy A):** Opening the popup on a site with configured headers turns the site rule **On** and re-applies DNR.
- **Draft headers:** Bottom row is a draft until a header name is typed; typing a name enables the row and adds a new draft below.
- **Empty rules:** Site rules with no header names are not persisted.
- **Basic Auth:** When `Authorization` is injected, `WWW-Authenticate` is stripped to avoid browser login loops. Background Traefik tabs may still prompt if no matching rule applies.

## Open gaps

- Per-site default profile binding (roadmap #3)
- `<all_urls>` — acceptable for unpacked dev; narrow before store

## Commands

```bash
make check   # should pass
make build   # load dist/ unpacked
```
