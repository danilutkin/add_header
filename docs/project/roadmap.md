# Roadmap

Ranked — not a backlog. Last reviewed: 2026-06-19.

## 1. First shippable slice (v0.1.0)

- [x] Repo scaffold, build, lint, test
- [x] Rule model + storage + DNR apply
- [x] Popup + options UI
- [x] Manual Chrome verification on httpbin

## 2. Top product features (next)

Ranked by QA/dev daily-use value. Build in order unless a spike proves otherwise.

### 1. Profiles (header profiles) — **shipped (partial)**

Named snapshots of header sets that represent a **test state** — e.g. “Free user”, “Admin”, “Feature flag ON”, “Staging auth”.

- [x] Create, delete profiles (per site rule)
- [x] Each profile holds a full header list (name, value, enabled)
- [x] One-click activate from popup (colored tabs)
- [x] Optional description per profile (options)
- [x] Draft header row UX (no separate Add button)
- [x] Auto site setup on popup open; empty rules not saved
- [ ] Rename, duplicate profiles

*Why first:* Manual QA lives in state switching. Profiles turn header editing from a ritual into a repeatable workflow.

### 2. Export / import (profiles + site rules)

Download and upload configuration as JSON — profiles, per-site rules, and global toggle state.

- Share a “QA starter pack” across the team (Slack, repo, wiki)
- Backup before browser profile reset or machine change
- Import merges or replaces (pick one behavior early; default: merge with conflict prompt)

*Why second:* Profiles only pay off at team scale when configs are portable.

### 3. Per-site profile binding

Remember which profile applies on which origin — e.g. `app.example.com` → “Staging user”, `admin.example.com` → “Admin”.

- Assign a default profile per site rule (or per origin)
- Visiting a matched site auto-activates its bound profile (respecting global off)
- Popup shows site + active profile together

*Why third:* Removes “forgot to switch profile” — the most common QA mistake after profiles exist.

## 3. Polish for daily use

Build after top-3 features unless a small slice can ship alongside Profiles UI work.

### Header name autocomplete (Tab to complete)

When typing a header **name** in popup or options, suggest well-known names and complete on **Tab** (same muscle memory as an IDE).

- Trigger on partial match (prefix, case-insensitive)
- **Tab** accepts the highlighted suggestion; **Esc** dismisses; arrow keys cycle suggestions
- Curated built-in list to start — e.g. `Authorization`, `Accept`, `Content-Type`, `Cookie`, `User-Agent`, `X-Request-Id`, `X-Api-Key`, `X-Feature-Flag`, `X-Tenant-Id`, `X-Debug`, `X-Forwarded-For` (extend as we learn QA patterns)
- No autocomplete on header **values** in v1 (secrets + noise); revisit “recent values” separately
- Shared component in popup + options; one source of truth for the suggestion list

*Why here:* Low scope, high daily friction reduction — especially when building profiles with many headers.

- [ ] Inline validation for patterns and header names
- [x] “Add rule for current site” from popup (auto on open)
- [ ] Duplicate headers / clone site rule to another origin

## 4. Store readiness

- [ ] Replace `<all_urls>` with optional/on-demand host permissions
- [x] Icons (SVG pipeline; listing copy, privacy policy still open)
- [ ] Chrome Web Store submission

## Brainstorm backlog (not ranked — revisit at checkpoint)

Ideas worth tracking but not in top 3 yet:

| Idea | Value | Notes |
|------|--------|--------|
| Path-scoped rules | API-only headers (`/api/*`) | DNR supports `urlFilter`; needs UX for path patterns |
| “Verify on this site” | Trust without DevTools | Link or inline check that headers reached the server |
| Profile keyboard shortcut | Power-user speed | Cycle profiles via `chrome.commands` |
| ModHeader import | Migration | One-time import path if teams switch tools |
| Environment labels | Org clarity | Tag profiles as dev / staging / prod (visual only) |
| Recent header values | Less re-typing | Local history per header name; sensitive-value caution |

## Explicit non-goals (MVP)

- Multi-browser support
- Cloud sync
- Response header modification
- Cookie / auth token management beyond user-entered header values
