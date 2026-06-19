# Current status

Last reviewed: 2026-06-19

## Scorecard

| Area | Status |
|------|--------|
| MV3 scaffold | Done — build outputs `dist/` |
| Per-site rules + DNR | Done — first vertical slice |
| Popup / options UI | Done — minimal MVP |
| Unit tests | Done — url-match + DNR compile |
| Manual Chrome smoke | **Not yet verified** in this environment |
| Store publish | Not started |

## Open gaps

- Run manual smoke on httpbin after first local load
- No export/import yet
- `<all_urls>` host permission — acceptable for unpacked dev; narrow before store

## Commands

```bash
make check   # should pass
make build   # load dist/ unpacked
```
