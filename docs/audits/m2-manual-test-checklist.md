# M2 Combat Feel — Manual Test Checklist

M2 is **not closed**. This is a working checklist for the manual pass over what landed
in this session (M2-T12 through T15; T1–T11 were already live-verified in earlier
sessions per their own commits). T13 (Combat tuning) is genuinely unstarted — it is a
playtest-driven task, not something that can be built and left for review.

Run with `npm run dev`, then open the level. Hotkeys: `F1`–`F4` hero swap, `A`/`D`
move, `Space` jump, `J` attack, `K` dash, `Ctrl+Shift+D` debug text panel, `F9`
hitbox overlay, `F8` frame-step, `F10` cull margins.

---

## T12 — Crouch

- [ ] Hold `S`/`↓` while grounded → enters `CROUCH` (state shows in the debug readout).
- [ ] While crouched, `A`/`D` does nothing — no horizontal movement (no crawl).
- [ ] Release down → returns to `IDLE` immediately.
- [ ] With `F9` on: crouched hurtbox (green box) visibly shrinks to ~60% height and
      stays bottom-aligned (feet don't move, only the top edge drops).

**Flag:** the FSM's `CROUCH` state has no `HURT`/`hp<=0 → DEATH` transition — this
matches `docs/06-Characters.md` §6.1's diagram exactly (it isn't in the `HURT` source
list there either), so it's not a deviation, but it means a crouching player can take
damage (health/poise still decrement) without ever staggering or dying while held
down. Confirm this is the intended read of the diagram before M2 closes.

## T14 — Combat debug overlay

- [ ] `F9` toggles a box overlay independent of `Ctrl+Shift+D`.
- [ ] Player hurtbox renders green; attacking shows the hitbox in blue at 40% while
      active, ~12% during the windup telegraph just before it.
- [ ] Skeleton hurtbox renders yellow; its swing hitbox renders red only while active.
- [ ] Getting hit shows a green outline (i-frames) on the player's hurtbox for the
      i-frame window.
- [ ] Landing a hit shows a red border on both attacker and victim during hit stop.
- [ ] A 1px poise bar renders above the Skeleton, draining on hits and resetting to
      full on a poise break.
- [ ] With `Ctrl+Shift+D` on: a `COMBAT` block appears with queued-hit count,
      resolve time (ms), trauma, and live damage-number count, updating live.

## T15 — Pillar 2 tests + perf gates

- [ ] `npm run test:pillars` — 11 tests pass (6 `p1.*` + 5 `p2.*`).
- [ ] `npm run test:e2e -- e2e/perf.spec.ts --project=chromium` — the heap-growth
      test (60s of simulated combat) should pass cleanly.
- [ ] The frame-time test's `max frame time ≤ 33ms` check was **flaky in this
      session's sandboxed dev container** — a single isolated ~90–100ms spike showed
      up consistently, surrounded by clean ~8ms frames, with no repeating pattern
      tied to a specific frame. p50 and p99 both passed every run. Re-run on your
      actual machine (or real CI) before trusting this gate; if it's still spiking
      there, it's a real finding, not sandbox noise.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` — all clean as of this session.

**Known gap:** the draw-call CI gate from the plan's T15 line ("enable ... draw
calls") is **not implemented**. `docs/15-Performance.md` §9.2 gives no CDP/evaluate
recipe for it (only frame-time and heap have code snippets), and Phaser exposes no
public renderer stat for it today. Needs a decision — e.g. a debug-only hook — rather
than a guess.

**Scope note:** the perf spec targets `GameScene`'s feel-test level + the one
hardcoded Skeleton, not the doc's own `?level=w1-1&bot=replay-1-1` / `w1-3` / Gorgon
phase 4 targets — those need real Tiled levels (M3) and the Gorgon boss (M5), neither
of which exists yet. Re-target `e2e/perf.spec.ts` once that content lands.

## T13 — Combat tuning (not started)

This is the actual remaining M2 work and it's inherently manual — nothing to review
here yet, only to do. Per `plans/M02-combat-feel/plan.md`:

- [ ] Day 1 — sweep hit-stop durations (40/60/80ms) on light hits, find where impact
      turns to lag.
- [ ] Day 2 — tune knockback/trauma/flash timing, verify the poise-break read.
- [ ] Day 3 — Playtest 1: **muted recording test.** Record a fight with no audio; if
      you can't always tell a hit landed, a feedback layer is failing.
- [ ] Days 4–5 — Playtests 2–3, Skeleton encounter pacing, final adjust + Pillar 2
      audit.

## T16 — Buffer

No defined work — nothing to test.

---

## Exit gate (from the plan, for reference — not all gated on this session's work)

- [ ] All nine layers fire on every connected hit (integration test) — covered by
      `p2.nineLayers`.
- [ ] `HitResolution` has zero optional fields — true by construction (TS).
- [ ] Hit stop freezes participants only, particles continue.
- [ ] Hit stop longest-wins, never additive — covered by `p2.hitStopNotAdditive`.
- [ ] Input buffered through hit stop — covered by `p2.inputBuffered`.
- [ ] Velocity/`allowGravity` correctly saved/restored across a freeze.
- [ ] One attack cannot hit the same victim twice (5-frame test) — covered by
      existing `Hitbox.test.ts` dedup tests.
