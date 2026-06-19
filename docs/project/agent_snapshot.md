# Agent snapshot

Ranked state for cross-cutting or risky work. Last reviewed: 2026-06-19.

## Now

- MV3 scaffold with Vite build
- Per-site header rules (origin + `*.subdomain` patterns)
- Popup: global toggle, current site status, link to options
- Options: add/edit/remove site rules and headers
- `chrome.storage.local` persistence
- Background service worker compiles rules → `declarativeNetRequest` dynamic rules

## Next

1. Polish options UX (validation feedback, empty states)
2. Export/import rules (JSON)
3. Optional host permissions instead of `<all_urls>` (store readiness)
4. Chrome Web Store publish prep

## Not default

- Firefox / Safari ports
- Cloud sync or accounts
- Collaborative rules
- Full API client / proxy features
- Blocking `webRequest` patterns

## Top risks

- **Wrong URL matching** — highest-impact bug class; keep tests on `url-match.ts`
- **Store permission review** — `<all_urls>` needs narrowing before publish
- **DNR rule limits** — batch headers (20 per rule max); watch total dynamic rule count

## Guardrails

- Simple UX for non-developers
- Minimal permissions; justify each in manifest + docs
- No backend for MVP
- No secrets in logs; treat stored header values as sensitive on shared machines
