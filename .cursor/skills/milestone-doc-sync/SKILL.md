---
name: milestone-doc-sync
description: >-
  Sync DevQuest milestone status across plan, docs, audit, and CLAUDE.md in one
  pass. Use when closing a milestone, marking exit-gate items done, updating
  docs after implementation, writing docs/audits/milestone-*, or when the user
  asks to update docs/status/plans after shipping work.
---

# Milestone doc sync

**Rule:** updating docs or status without updating the matching plan is incomplete.

When closing a milestone or syncing post-ship docs, update **all** of these in the
**same pass** — never leave `plans/` for a follow-up.

## Same-pass checklist

Copy and tick:

```
- [ ] plans/<id>/plan.md — status, preconditions, exit gate, post-gate
- [ ] plans/README.md — status column for that milestone
- [ ] CLAUDE.md — PHASE / NEXT / THEN / NOTES
- [ ] docs/17-Roadmap.md — §10.1 status line (+ exit-gate boxes if closing)
- [ ] docs/audits/milestone-M*.md — write or refresh if closing
- [ ] README.md — top-level Status (if it mentions the milestone)
- [ ] Spec docs that drifted (e.g. tsconfig include in docs/03, docs/16)
- [ ] Spike/results notes if they still claim throwaway code still exists
```

## Plan file fields (`plans/<id>/plan.md`)

At close, the plan must show reality:

1. **Status** line at top — e.g. `✅ Done · closed YYYY-MM-DD` + link to audit
2. **Next** — pointer to the following plan
3. **Preconditions** — all `[x]` with brief evidence links where useful
4. **Exit gate** — every box `[x]`, or an ADR for a cut/date change
5. **Post-gate** — split remaining work (`tag`, expand next-but-one) into checked/unchecked items; do not leave a stale “Then: …” paragraph that claims undone work is still todo when some of it is done

Task IDs stay stable. Do not renumber. Struck-through cuts stay in place.

## Expansion rule

At each gate, expand the **next-but-one** plan toward 🔵 Full
(`plans/README.md`). Record deferrals explicitly in the closed plan’s post-gate
section (example: M0 deferred M02 expand until M1 closes).

## Do not

- Edit Cursor plan files under `~/.cursor/plans/` unless the user asked
- Mark a milestone closed with unticked exit-gate boxes and no ADR
- Update only `docs/` or only `CLAUDE.md` and call the sync done
