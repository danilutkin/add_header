# Agent snapshot

Ranked state for cross-cutting or risky work. Last reviewed: 2026-06-20.

## Now

- MV3 scaffold with Vite build
- Per-site rule sets with multiple URL patterns (`origin`, `*.subdomain`)
- **Profiles per site rule** — tabbed header sets, numeric names (`1`, `2`, …)
- Popup: auto site setup, draft header rows, profile tabs, reload hint
- Options: full rule-set editor with profile tabs
- DNR: active profile headers, skip unchanged rule updates, Basic Auth loop mitigation
- Persist: prune site rules with no header names; legacy storage migration
- `chrome.storage.local` + background DNR sync
- Icon: SVG → PNG via `sharp` on build
- Export/import JSON (merge + replace) from options page
- Profile duplicate in popup + options

## Next

1. Per-site default profile binding
2. Chrome Web Store publish prep — [task](../tasks/chrome_web_store_publish.md) (name brainstorm, privacy policy, listing)
3. Header name autocomplete (Tab to complete)

## Not default

- Firefox / Safari ports
- Cloud sync or accounts
- Collaborative rules
- Full API client / proxy features
- Blocking `webRequest` patterns

## Top risks

- **Wrong URL matching** — keep tests on `url-match.ts`
- **Popup sync order** — sync headers from DOM before re-render; never read site toggle before painting from model
- **Store permission review** — optional on-demand host permissions (Phase 1 done); privacy policy + listing still open
- **DNR rule limits** — batch headers (20 per rule max)

## Guardrails

- Simple UX for non-developers
- Minimal permissions; justify each in manifest + docs
- No backend for MVP
- No secrets in logs; treat stored header values as sensitive on shared machines
