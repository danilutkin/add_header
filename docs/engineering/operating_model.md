# Operating model

Moved from [add_header_CONTEXT.md](../../add_header_CONTEXT.md) — delivery principles and source priority.

## Source priority

When product intent and implementation disagree:

1. Relevant durable doc under `docs/`
2. [current_status.md](../project/current_status.md)
3. [roadmap.md](../project/roadmap.md)
4. Code and tests
5. `docs/tasks/*.md` (active slice only)

Durable docs win over task notes. Code is runtime truth — fix mismatches in-slice or record them before continuing.

## Delivery principles

- Keep README, AGENTS, and bootstrap docs **thin**; depth lives in topic docs.
- One source of truth per topic; one ranked planning surface (`roadmap.md`).
- Prefer existing `make` / Docker scripts; keep `make check` green.
- Conventional Commits explaining how and why.
- Update docs in the **same slice** as behavior changes.
- Ship one vertical slice at a time: UI → storage → DNR → tests → docs.

## Definition of done (slice)

- Happy path works in Chrome (load unpacked)
- Important failures handled with clear UI or logs
- Tests for matching, storage, and rule compilation
- Docs updated if behavior or workflow changed
- Permissions stay minimal and justified
- Temporary task docs archived or deleted

## Operating cadence

After non-trivial releases, refresh [current_status.md](../project/current_status.md):

- Chrome/manual smoke result
- Open bugs by severity
- Permission / store review status (when relevant)
- User-reported confusion points
- Hygiene: `make check`, stale tasks, manifest drift

Improve this model only when real friction appears.
