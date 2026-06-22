# Chrome Web Store publish

- Owner: Product + Engineering
- Last reviewed: 2026-06-20
- Source of truth for: Store submission prep, listing assets, permission narrowing, privacy policy, **public name & discoverability**
- Links: [roadmap](../project/roadmap.md) §4, [agent_snapshot](../project/agent_snapshot.md), [manifest.json](../../manifest.json)
- Status: active

## Current status

**In progress.** Rebrand + privacy policy drafted. Remaining: enable GitHub Pages, listing assets, developer account upload.

## Decisions locked

| Item | Decision |
|------|----------|
| Public name | **Request Headers** |
| Version | `0.1.0` |
| Visibility | Unlisted at launch |
| Privacy policy | GitHub Pages → `https://danilutkin.github.io/add_header/privacy/` |

## Scope

### In scope

- Optional/on-demand host permissions (replace `<all_urls>`)
- **Public rename / rebrand for Chrome Web Store search** (name, manifest, listing keywords)
- Privacy policy (public URL)
- Store listing copy, screenshots, category
- Developer account + production zip upload
- Permission justifications for review questionnaire
- Post-approval update workflow (version bump → rebuild → re-upload)

### Out of scope (this task)

- Per-site profile binding, autocomplete, other product features
- Firefox / Safari ports
- Paid features, accounts, cloud sync
- Marketing site beyond privacy policy page

## Open decisions (answer before build)

| # | Question | Options / notes | Decision |
|---|----------|-----------------|----------|
| 1 | **Public store name** | See **Phase 0** — keyword-led name vs internal `add_header` | **Request Headers** |
| 2 | **First public version** | `0.1.0` (current) vs `1.0.0` for store launch | **0.1.0** |
| 3 | **Visibility at launch** | Public vs Unlisted (beta with testers) | **Unlisted** |
| 4 | **Privacy policy host** | GitHub Pages, personal site, other static host | **GitHub Pages** (`docs/privacy/`) |
| 5 | **Publisher identity** | Individual vs organization account on Chrome Web Store | _TBD_ |
| 6 | **Pricing** | Free (MVP default) vs paid | _TBD — default free_ |
| 7 | **Support contact** | Email shown on store listing | _TBD_ |
| 8 | **Regions** | All regions vs subset | _TBD — default all_ |

## Build order

Work in this order unless a spike proves otherwise.

### Phase 0 — Name & store discoverability (before first upload)

Goal: users searching “request headers”, “modify headers”, “header injector”, “ModHeader alternative”, etc. find us quickly. **Pick the name once** — it flows into manifest, UI chrome, zip filename, listing, and privacy page.

- [x] **Competitor search** — in [Chrome Web Store](https://chromewebstore.google.com/), search top queries and note naming patterns:
- [x] **Name criteria** — chose **Request Headers**
- [x] **Apply chosen name in repo** (same slice as listing prep):
  - [x] `manifest.json` — `name`, `description`, `action.default_title`
  - [x] Popup / options visible strings
  - [x] Export bundle filename (`request-headers-export-*.json`; internal JSON `format` key stays `add_header`)
  - [x] Privacy policy title + GitHub Pages page `<title>`
  - [ ] Zip artifact name, e.g. `request-headers-v0.1.0.zip`
- [x] **Repo name** — `danilutkin/add_header` stays; store-facing strings rebranded
- [x] Record final name + rationale in **Decisions** row #1 and Progress log

**Reality check:** Title and keywords help **discovery**; **#1 ranking** also needs installs, ratings, and recency. Good naming is highest-ROI work *before* launch; reviews and word-of-mouth come after.

**Name brainstorm (starter — replace after competitor search):**

| Candidate | Pros | Cons |
|-----------|------|------|
| Request Headers — Per Site | Clear keyword match | Generic |
| Custom Request Headers | Strong SEO phrase | Long |
| Header Profiles for QA | Differentiator (profiles) | “Profiles” less searched |
| Simple Request Headers | Friendly, MVP tone | Weaker keyword density |

### Phase 1 — Code & permissions (store blocker)

- [x] Replace `host_permissions: ["<all_urls>"]` with optional/on-demand host permissions
- [x] Request host access when user adds a rule for a new origin (popup + options)
- [x] Handle denied permission gracefully (clear UI message, rule not applied)
- [x] Re-test DNR apply on granted origins only
- [ ] Document each manifest permission with one-line justification (manifest comment or `docs/`)
- [ ] `make check` green after permission changes

**Permission justifications (draft for listing / review):**

| Permission | Why |
|------------|-----|
| `storage` | Persist per-site header rules and profiles locally |
| `activeTab` | Detect current site in popup for quick setup |
| `declarativeNetRequestWithHostAccess` | Inject user-configured request headers on granted origins |
| `declarativeNetRequestFeedback` | Debug rule application during development |
| Host (per origin, on demand) | Apply headers only on origins the user explicitly configures |

### Phase 2 — Privacy policy

- [x] Draft privacy policy covering:
  - Data stored: header names, values, URL patterns, profile names, global toggle
  - Storage location: `chrome.storage.local` on device only
  - No backend, no analytics, no sale of data (confirm true at ship time)
  - User can delete all data via extension UI / Chrome “Clear extension data”
  - Contact via GitHub Issues
- [x] Publish at a stable public HTTPS URL — `docs/privacy/index.html` (enable GitHub Pages)
- [x] Add privacy policy URL to options page footer
- [ ] Verify URL loads after Pages deploy (incognito, no auth)

### Phase 3 — Store listing assets

_Use finalized name from Phase 0._

- [ ] **Short description** (≤132 characters) — lead with primary keyword from Phase 0
- [ ] **Detailed description** — first 2 lines repeat core keywords; then QA/dev value, profiles, export/import, no backend
- [ ] **Category** — Developer Tools
- [ ] **Single purpose statement** — “Modify HTTP request headers on user-specified websites”
- [ ] **Screenshots** (min 1, target 3–5 at 1280×800 or 640×400):
  - [ ] Popup with site rule + profile tabs
  - [ ] Options / manage headers
  - [ ] Export/import (optional)
- [ ] Icons — already built (16 / 48 / 128); verify quality on store preview
- [ ] Optional: promotional tile / marquee (only if doing featured placement later)

### Phase 4 — Developer account & package

- [ ] Register at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [ ] Pay one-time $5 developer registration fee
- [ ] Complete publisher profile (name, contact email)
- [ ] `make build`
- [ ] Zip **contents** of `dist/` (not the folder itself):

  ```bash
  cd dist && zip -r ../request-headers-v0.1.0.zip . && cd ..
  ```

- [ ] Bump `version` in `manifest.json` if launching as new public version

### Phase 5 — Dashboard questionnaire & submit

- [ ] Create **New item** → upload zip
- [ ] Attach privacy policy URL
- [ ] Complete **Privacy practices** form:
  - Collects user data? **Yes** (locally stored header config)
  - Sold to third parties? **No**
  - Used for unrelated purposes? **No**
  - Data handling certification as required by form
- [ ] Complete **Permission justifications** (especially host access — per-user-configured origins only)
- [ ] Set distribution: Public or Unlisted
- [ ] Submit for review (typical 1–3 business days; longer if broad permissions remain)

### Phase 6 — Post-approval

- [ ] Save store listing URL
- [ ] Update [current_status.md](../project/current_status.md) — store publish row
- [ ] Document update workflow: version bump → `make build` → zip → upload
- [ ] Archive this task (merge truth into durable docs, set status `archive-pointer`)

## Verification

Before submit:

1. Fresh Chrome profile or reset extension — install from zipped `dist/` via “Load unpacked” (same bits as upload)
2. Add rule for `https://httpbin.org` — permission prompt appears if Phase 1 done
3. Deny permission — UI explains failure; no headers injected
4. Grant permission — header visible at [httpbin.org/headers](https://httpbin.org/headers)
5. Toggle off / delete rule — headers disappear
6. `make check` passes
7. Privacy policy URL loads in incognito (no auth)
8. Store dashboard preview matches screenshots and description

After approval:

1. Install from store URL in clean profile
2. Repeat httpbin smoke test
3. Confirm listing text and icons match expectations

## Progress log

| Date | Note |
|------|------|
| 2026-06-20 | Task created from store-publish checklist; status Not started |
| 2026-06-20 | Added Phase 0 — public rename/rebrand for Chrome Web Store search discoverability |
| 2026-06-22 | Phase 1: optional host permissions, `declarativeNetRequestWithHostAccess`, permission UI |
| 2026-06-22 | Rebrand to **Request Headers**; privacy policy at `docs/privacy/` |

## Risks

| Risk | Mitigation |
|------|------------|
| Review rejection for `<all_urls>` | Phase 1 optional permissions before submit |
| Review rejection for vague single purpose | Clear listing copy; headers-only, no proxy/API client claims |
| Poor store discovery at launch | Phase 0 competitor search + keyword-led title before submit |
| Privacy form mismatch | Align answers with actual behavior (local-only, no telemetry) |
| DNR rule limits with many sites | Document 20-headers-per-rule limit; test edge case if power users expected |

## References

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)
- [Optional permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions#optional-permissions)
- [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare)
- [Fill out the privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
