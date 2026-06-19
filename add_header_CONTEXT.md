# add_header — Agent Context

- Owner: Product + Engineering
- Last reviewed: 2026-06-19
- Source of truth for: Project identity, agent startup, delivery model, and ranked defaults for **add_header**

## What We Are Building

**add_header** is a simple Chrome extension that lets users add, edit, and remove custom HTTP request headers on specific websites.

Product promise:

- **Convenient** — set headers per domain in a few clicks, no DevTools ritual
- **Simple** — understandable by non-developers; sane defaults and clear copy
- **Reliable** — rules apply consistently on matched origins; easy to enable/disable per site or globally

MVP is not a generic HTTP proxy, API client, or developer power-tool. It is a focused header injector for everyday browser use.

## Agent Startup (read this first)

1. Read this file and [README](README.md).
2. Read the relevant durable doc plus nearest folder rules under `.cursor/rules/` before editing.
3. For risky, ambiguous, cross-cutting, store-publish, permission, migration, or scope-changing work, read [Agent Snapshot](docs/project/agent_snapshot.md) first. Expand into [Current Status](docs/project/current_status.md), [Roadmap](docs/project/roadmap.md), or [Operating Model](docs/engineering/operating_model.md) only when needed.
4. For an active slice under `docs/tasks/`, use that file as the control surface: update **Current status** and **Progress log** after each verified chunk; archive or delete before merge.

**Rule:** load minimum sufficient context; expand only when risk or ambiguity justifies it.

## Repo Map (target layout)

```
add_header/
├── AGENTS.md                 # thin routing guide → links here + bootstrap
├── README.md                 # human + agent entry
├── manifest.json             # Chrome MV3
├── src/
│   ├── background/           # service worker: rule sync, lifecycle
│   ├── popup/                # quick on/off, active site, entry to options
│   ├── options/              # per-site header rules UI
│   └── shared/               # types, storage helpers, URL matching
├── docs/                     # durable source of truth
│   ├── engineering/
│   │   ├── agent_bootstrap.md
│   │   └── operating_model.md  # split from this file when repo grows
│   └── project/
│       ├── agent_snapshot.md
│       ├── current_status.md
│       └── roadmap.md
├── docs/tasks/               # temporary slice control only
├── .cursor/rules/            # folder-scoped agent rules
└── package.json              # build, lint, test scripts
```

## Product Defaults

- **Chrome MV3 only** for MVP; ship unpacked/local first, store later.
- **Per-origin rules** as the primary model (`https://example.com` or `*.example.com` — pick one scheme early and document it).
- **Header list per rule**: name, value, enabled flag; no exotic auth flows in v1.
- **Use `chrome.storage.local`** for rules; avoid sync until there is a real multi-device story.
- **Prefer `declarativeNetRequest`** for header modification; do not depend on blocking `webRequest` unless a spike proves DNR is insufficient.
- **Popup** answers: “Is it on?”, “This site’s rules”, “Open settings”.
- **Options page** is the main configuration surface; keep popup minimal.
- **No backend** in MVP — extension-only, offline-capable configuration.
- **Research** (`research/`) is not source of truth; promote ideas into `docs/project/roadmap.md` only at a deliberate checkpoint.

## Technical Guardrails

- Least privilege: request only permissions the current slice needs; justify each in `manifest.json` and docs.
- Never log or persist secrets (tokens, cookies) beyond what the user explicitly configures as header values; treat storage as sensitive on shared machines.
- URL matching must be explicit and tested — wrong matching is the highest-impact bug class.
- Keep service worker logic thin: load rules from storage → compile to DNR rules → apply; UI does not talk to DNR directly.
- One source of truth for rule shape (shared TypeScript types or JSON schema).
- Dependency direction: UI → shared storage/API → background/DNR adapter; do not duplicate rule logic in popup and options.

## Source Priority

When product intent and implementation disagree, resolve in this order:

1. Relevant durable doc under `docs/`
2. [Current Status](docs/project/current_status.md)
3. [Roadmap](docs/project/roadmap.md)
4. Code and tests
5. `docs/tasks/*.md` (active slice only)

Durable docs win over task notes. Code is runtime truth — if runtime and docs disagree, fix in-slice or record the mismatch before continuing. Git history is context, not source of truth. `AGENTS.md` and `agent_bootstrap.md` are routing guides only.

## Delivery Principles

- Keep `README.md`, `AGENTS.md`, and `agent_bootstrap.md` **thin**; put depth in durable topic docs.
- One source of truth per topic; one ranked planning surface (`roadmap.md`).
- Use [Agent Snapshot](docs/project/agent_snapshot.md) for risky or cross-cutting work.
- Prefer existing `npm`/`make` scripts; keep the default check command green.
- **Conventional Commits** that explain how and why.
- Update docs in the **same slice** as behavior changes.
- Avoid process built for a large team — optimize for solo builder + agents.

## Delivery Shape (default slice)

Ship one vertical slice at a time:

1. user-visible behavior (popup/options)
2. rule storage and validation
3. background application to DNR
4. focused verification (unit + manual Chrome check)
5. durable doc updates

Avoid broad refactors unless they remove repeated real pain.

## Normal Dev Loop

```bash
make setup           # first time only
make build           # production bundle for load unpacked
make dev             # watch build
make test            # unit tests
make lint
make check           # aggregate: lint + test + typecheck
```

Requires Docker. See [docs/engineering/docker.md](docs/engineering/docker.md). Do not run npm on the host.

Manual verification every slice:

1. `chrome://extensions` → Load unpacked → dist/ (or build output dir)
2. Add a rule for a test origin (e.g. `https://httpbin.org`)
3. Confirm request headers via DevTools Network or httpbin echo
4. Toggle off / delete rule — confirm headers disappear

## Task Doc Policy

Use `docs/tasks/*.md` only for risky, ambiguous, multi-step, store-sensitive, or cross-cutting work. While active, the task file is the slice control surface — not a second roadmap.

Required frontmatter:

```text
- Owner: …
- Last reviewed: YYYY-MM-DD
- Source of truth for: …
- Links: …
- Status: active | archive-pointer | delete-after-merge
```

Active tasks keep: Current status, Progress log, Decisions/scope, Build order, Verification. After ship: merge truth into durable docs, then archive (≤90 lines), move to archive, or delete.

| Status | Use |
|---|---|
| `active` | Slice in progress |
| `archive-pointer` | Shipped; short pointer |
| `delete-after-merge` | Scratch note to remove |

## Definition Of Done

A slice is done when:

- happy path works in Chrome (load unpacked)
- important failures are handled with clear UI or logs
- risk-appropriate tests exist for matching, storage, and rule compilation
- docs updated if behavior or operator workflow changed
- permissions and manifest stay minimal
- temporary task docs archived or deleted

## Anti-Patterns

- backlog-shaped roadmaps with no ranking
- duplicate guidance across README, AGENTS, and CONTEXT
- `webRequest` blocking patterns when DNR suffices
- business logic duplicated in popup, options, and service worker
- over-broad host permissions (`<all_urls>`) without justification
- vague commit messages
- team-scale ceremony before it helps
- stale task docs or silent rule-format changes without migration

## Agent Snapshot Template (fill when bootstrapping repo)

Use `docs/project/agent_snapshot.md` for ranked state. Initial content sketch:

- **Now:** MV3 scaffold, per-site header rules, popup + options, local storage, DNR apply
- **Next:** polish UX, export/import rules, optional store publish
- **Not default:** Firefox/Safari ports, cloud sync, collaborative rules, full API client features
- **Top risks:** wrong URL matching, permission review rejection, DNR rule limit edge cases
- **Guardrails:** simple UX, minimal permissions, no backend for MVP

## Bootstrap Checklist (first hour in empty repo)

Copy this file to repo root as seed, then split when stable:

- [ ] `README.md` — what it is, load unpacked, dev loop
- [ ] `AGENTS.md` — thin pointer to this file + `docs/engineering/agent_bootstrap.md`
- [ ] `docs/engineering/agent_bootstrap.md` — startup path + verification commands
- [ ] `docs/engineering/operating_model.md` — move Delivery Principles + Source Priority here
- [ ] `docs/project/agent_snapshot.md` — ranked Now/Next/Not
- [ ] `docs/project/current_status.md` — short scorecard after first shippable slice
- [ ] `docs/project/roadmap.md` — ranked, not backlog-shaped
- [ ] `.cursor/rules/` — extension-specific conventions (MV3, storage, no secrets in logs)
- [ ] `package.json` scripts: `build`, `test`, `lint`, `check`
- [ ] Docker dev loop: `Dockerfile`, `docker-compose.yml`, `Makefile` — all npm commands via container

## Review Bar (non-trivial slices only)

Before closing a non-trivial slice, sanity-check:

- **Engineering:** clear boundaries, typed rule model, no duplicated matching logic
- **Product:** scope matches promise; non-goals explicit
- **UX:** non-technical user can add a header without reading docs
- **QA:** happy path + off/delete/malformed URL cases checked
- **Pragmatism:** smallest change that ships; no platform expansion hidden in the slice

Do not inflate quality scores; list concrete gaps if not ready to ship.

## Operating Cadence

After non-trivial releases or scope changes, refresh a short scorecard in `current_status.md`:

- Chrome/manual smoke result
- open bugs by severity
- permission / store review status (when relevant)
- user-reported confusion points
- hygiene: `make check`, stale tasks, manifest drift

Improve the operating model only when real friction appears: SOT confusion, missing verification, or repeated manual steps. Fix same-slice with the smallest durable change.
