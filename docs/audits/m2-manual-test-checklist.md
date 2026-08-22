# M2 Combat Feel — Manual Test Checklist

M2 is **not closed**. This is a working checklist for the manual pass over what landed
in this session (M2-T12 through T15; T1–T11 were already live-verified in earlier
sessions per their own commits). T13 (Combat tuning) is genuinely unstarted — it is a
playtest-driven task, not something that can be built and left for review.

**Update:** T12 and T14 were live-verified in a follow-up pass (dev server + Playwright,
Chrome extension unavailable in this environment) — see the ✅ items below. That pass
also caught and fixed a real crash: `lethalInterrupt` in `PlayerStates.ts` checked
`hp<=0` before `damaged`, so a killing blow sent the FSM straight from e.g. `IDLE` to
`DEATH` — an illegal edge (only `HURT→DEATH` is legal per §6.1) — crashing the
`StateMachine` assertion. Reproduced by leaving the player idle near the Skeleton for
its normal contact-damage cycle; fixed in the `fix(combat)` commit with a regression
test. Re-verified live afterward: 15s+ standing in the Skeleton's attack range, zero
crashes.

Run with `npm run dev`, then open the level. Hotkeys: `F1`–`F4` hero swap, `A`/`D`
move, `Space` jump, `J` attack, `K` dash, `Ctrl+Shift+D` debug text panel, `F9`
hitbox overlay, `F8` frame-step, `F10` cull margins.

---

## T12 — Crouch

- [x] Hold `S`/`↓` while grounded → enters `CROUCH` (state shows in the debug readout).
      **Live-verified** — debug readout showed `STATE CROUCH`.
- [ ] While crouched, `A`/`D` does nothing — no horizontal movement (no crawl). Not
      re-checked live this pass (already covered by `PlayerController`'s
      `speedScaleFor` returning 0 for `CROUCH`, plus a unit test) — worth a quick
      manual double-check.
- [x] Release down → returns to `IDLE` immediately. **Live-verified.**
- [x] With `F9` on: crouched hurtbox (green box) visibly shrinks to ~60% height and
      stays bottom-aligned (feet don't move, only the top edge drops). **Live-verified**
      — screenshot showed the green box shrink from full height to a short strip sitting
      on the floor line when crouched, back to full height on release.

**Flag:** the FSM's `CROUCH` state has no `HURT`/`hp<=0 → DEATH` transition — this
matches `docs/06-Characters.md` §6.1's diagram exactly (it isn't in the `HURT` source
list there either), so it's not a deviation, but it means a crouching player can take
damage (health/poise still decrement) without ever staggering or dying while held
down. Confirm this is the intended read of the diagram before M2 closes.

## T14 — Combat debug overlay

- [x] `F9` toggles a box overlay independent of `Ctrl+Shift+D`. **Live-verified.**
- [x] Player hurtbox renders green. **Live-verified** (crouch screenshots). Attacking
      shows the hitbox in blue at 40% while active, ~12% during the windup telegraph —
      not exercised live this pass (would need a landed attack); code path is
      `Hitbox.isPending`/`.active` feeding `drawAttackHitbox`, unit-tested separately.
- [ ] Skeleton hurtbox renders yellow; its swing hitbox renders red only while active —
      not exercised live this pass.
- [ ] Getting hit shows a green outline (i-frames) on the player's hurtbox for the
      i-frame window — not exercised live this pass.
- [ ] Landing a hit shows a red border on both attacker and victim during hit stop —
      not exercised live this pass.
- [ ] A 1px poise bar renders above the Skeleton, draining on hits and resetting to
      full on a poise break — not exercised live this pass.
- [x] With `Ctrl+Shift+D` on: a `COMBAT` block appears with queued-hit count,
      resolve time (ms), trauma, and live damage-number count. **Live-verified** —
      panel rendered `queued hits 0 / resolve time 0.00 ms / trauma 0.00 / damage
    nums 0` and updated (FPS/heap numbers moved) across screenshots.

**Note:** the always-visible magenta outline around every physics body in
screenshots is Phaser's own Arcade-physics debug renderer (its default colour),
not part of this overlay — don't mistake it for an i-frame or hit-stop border when
eyeballing screenshots; it's present with `F9` off too.

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
