# Spike 00 — Feel Probe

**Duration:** 1 day (8 h) · **Precedes:** M0 · **Throwaway:** yes, deliberately

---

## Why this exists

`docs/17-Roadmap.md` puts M0 Foundation (3 weeks of repo, CI, lint rules, tooling)
before M1 Feel Prototype. That order is correct for a funded team with parallel
workstreams.

Solo, it is backwards. **Three weeks of infrastructure to protect a feel you have
not yet proven is three weeks at risk.** This spike answers one question in a day:

> Do the movement constants in `docs/00-README.md` §5.3 produce a jump that feels good?

If yes, M0's three weeks are a confident investment.
If no, you have lost one day instead of three weeks, and M1's tuning starts from
better numbers.

**This code is thrown away.** It is not the M1 implementation. It has no tests, no
lint config, no architecture. Writing it as if it were production is the failure mode.

---

## Preconditions

- Node 20+, npm
- Nothing else

---

## Tasks

### S0-T1 — Scaffold · 20 min

```bash
npm create vite@latest devquest-spike -- --template vanilla-ts
```

```bash
cd devquest-spike && npm i phaser && rm -rf src/* public/*
```

**Verify:** `npm run dev` serves an empty page without error.

---

### S0-T2 — Phaser boot at 320×180 · 30 min

`src/main.ts` — the config from `docs/03-Technical-Architecture.md` §11.1, trimmed:

```ts
new Phaser.Game({
  type: Phaser.WEBGL,
  width: 320,
  height: 180,
  parent: 'app',
  backgroundColor: '#1c1a2a',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, autoRound: true },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 900 }, tileBias: 8, fps: 60, fixedStep: true, debug: true },
  },
  scene: [ProbeScene],
});
```

**`fixedStep: true` is the one setting that must not be omitted.** Without it a
144 Hz monitor runs the game 2.4× fast and every subsequent measurement is wrong.

**Verify:** a `#1c1a2a` rectangle fills the browser, integer-scaled, no blurring at any window size.

---

### S0-T3 — Grey box with the real constants · 2 h

One file. No architecture. A `Phaser.GameObjects.Rectangle` 14 × 28 px with an
Arcade body, and the constants verbatim from `docs/00-README.md` §5.2–5.3:

```ts
const GRAVITY_Y = 900,
  MAX_FALL = 300;
const FALL_MULT = 1.35,
  APEX_MULT = 0.7,
  APEX_THRESHOLD = 40;
const RUN_SPEED = 90,
  GROUND_ACCEL = 900,
  GROUND_DECEL = 1200;
const AIR_ACCEL = 600,
  AIR_DECEL = 400,
  TURN_BOOST = 1.8;
const JUMP_V = -240,
  JUMP_CUT = 0.45;
const COYOTE_MS = 100,
  BUFFER_MS = 120;
const DASH_SPEED = 260,
  DASH_MS = 150,
  DASH_CD_MS = 500;
```

Implement, in this order, testing each before adding the next:

| #   | Feature                                                                            | Doc                     |
| --- | ---------------------------------------------------------------------------------- | ----------------------- |
| 1   | Horizontal accel/decel with turn boost                                             | `06-Characters.md` §5.1 |
| 2   | Jump                                                                               | §5.3                    |
| 3   | Variable jump height (`vy *= 0.45` on release, guarded by a `jumpCutApplied` flag) | §5.4                    |
| 4   | Asymmetric gravity — `1.35×` falling, `0.70×` within ±40 px/s of apex              | §5.1                    |
| 5   | Coyote time — **absolute expiry timestamp, not a countdown**                       | §5.3                    |
| 6   | Jump buffer — store `jumpPressedAt`, consume on ground contact                     | §5.3                    |
| 7   | Dash — 260 px/s for 150 ms, gravity off, cooldown from _start_                     | §5.5                    |

**The four details that are easy to get wrong and change the feel entirely:**

- Coyote as a **timestamp**, not a per-frame decrement.
- Jump cut applied **once** per jump — without the flag, release-and-repress cuts twice.
- Dash cooldown measured from **start**, so effective downtime is 350 ms not 500 ms.
- **Zero landing recovery.** No lag frames on touchdown, ever.

**Verify:** the box moves, jumps, dashes. Arcade debug bodies visible.

---

### S0-T4 — A measurement level · 1 h

Static rectangles, no tilemap. Place gaps and ledges at the exact vocabulary widths
from `docs/10-Level-Design.md` §5.2–5.3, labelled:

| Gap      | px  | Should be                             |
| -------- | --- | ------------------------------------- |
| `HOP`    | 24  | Trivial standing jump                 |
| `GAP_S`  | 32  | Comfortable standing jump             |
| `GAP_M`  | 40  | Run-jump, **the main-path workhorse** |
| `GAP_L`  | 56  | Run-jump + dash                       |
| `GAP_XL` | 64  | Run-jump + dash, tight                |

| Ledge      | px  | Should be                           |
| ---------- | --- | ----------------------------------- |
| `LEDGE_M`  | 24  | Comfortable                         |
| `LEDGE_L`  | 26  | **Tightest allowed on a main path** |
| `LEDGE_XL` | 40  | Requires a two-stage climb          |

Put a soft floor 32 px below every gap so failure costs nothing — this is a
measuring instrument, not a level.

**Verify:** every gap and ledge is reachable as the table says. **`GAP_M` at 40 px
is the critical one** — if a run-jump does not clear it comfortably with the
Samurai's 90 px/s, the level-design vocabulary in `docs/10-Level-Design.md` §5 is
wrong and needs re-deriving before M1.

---

### S0-T5 — Instrument it · 1 h

An on-screen text readout (`console.log` is too slow to read):

```
vx  -12.4   vy   87.2
state  FALL      grounded  false
coyote  expired   buffer   idle
dash  ready (cd 0ms)
last jump: coyote=false  cut=true  height=13.2px
```

Plus a **jump-height tracker**: record peak height per jump and print the last five.
Full hold should read `32.0 px`; instant tap should read `~6.5 px`.

**Verify:** the numbers match the derivations. `jumpHeight = v² / 2g = 240² / 1800 = 32.0`.
If the measured peak is not 32 ± 0.5 px, the gravity or integration order is wrong.

---

### S0-T6 — Play it for an hour · 1 h

Not a task with a deliverable. **Actually play it.** Then answer, in writing:

| Question                                                          | Answer |
| ----------------------------------------------------------------- | ------ |
| Does the jump feel responsive or floaty?                          |        |
| Is 90 px/s too slow, too fast, or right?                          |        |
| Does the dash feel like a commitment or a twitch?                 |        |
| Is 100 ms coyote noticeable? Try 0 and 200 to calibrate           |        |
| Does `GAP_M` (40 px) feel like a _standard_ gap or a _challenge_? |        |
| Does the apex hang read as control or as floatiness?              |        |

**Try deliberately wrong values to calibrate.** Set coyote to 0 for two minutes, then
back to 100. Set gravity to 700, then 1100. You cannot judge a number without
knowing what its neighbours feel like.

---

### S0-T7 — Asset Gate 1 (parallel, 1 h)

Unrelated to the code, same day, because it has a long lead time and its findings
change M3's estimates.

Download the four hero packs from `docs/05-Asset-Pipeline.md` §6.1 and measure:

| Check                                 | Pass                                                           |
| ------------------------------------- | -------------------------------------------------------------- |
| Sprite height                         | 28–34 px, or exactly 2× (56–68 px)                             |
| If 2×: round-trip downscale lossless? | Halve, double, diff — must be identical                        |
| `hurt` animation present?             | **The docs predict the Ninja lacks one** (6 h to author if so) |
| Unique colours per sheet              | ≤ 64                                                           |
| Anti-aliasing on edges                | None, or minimal                                               |
| Outline                               | 1 px dark, or absent-and-addable                               |

Record findings in `docs/05-Asset-Pipeline.md` §6.1's status column.

**Why this matters now:** every art estimate in the plan assumes these pass. If the
Knight is 47 px tall and not on a 2× grid, it cannot be integer-scaled, the pack is
rejected, and the roster changes. Better to know in week zero.

---

## Exit gate

- [x] A grey box runs at 320×180, integer-scaled, 60 fps
- [x] All seven movement features from S0-T3 work
- [x] Measured full-hold jump height is 32 ± 0.5 px — **fixed via midpoint integration; ~32.2 px (see [results.md](results.md))**
- [x] Every gap and ledge in S0-T4 behaves as the table predicts
- [x] **`GAP_M` (40 px) clears comfortably with a run-jump**
- [x] The S0-T6 questions are answered in writing
- [x] All four hero packs have Gate-1 results recorded

---

## Outcomes and what each means

| Outcome                                                                  | Action                                                                        |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Feels good, numbers hold**                                             | Proceed to M0 with confidence. Carry the S0-T6 notes into M1                  |
| **Feels good, some numbers off**                                         | Note the deltas. M1 starts from the corrected values. No plan change          |
| **Feels wrong, fixable by tuning**                                       | Expected and fine. This is what M1's five weeks are for. Record the direction |
| **Feels wrong, structurally** (e.g. Arcade's fixed step fights the feel) | **Stop.** This is an ADR-005 revisit, and it is far cheaper to discover now   |
| **An asset pack fails Gate 1**                                           | Find a replacement before M3. Record in `assets/rejected.md`                  |

---

## Explicitly not in this spike

| Not doing                         | Why                                                                       |
| --------------------------------- | ------------------------------------------------------------------------- |
| Tests, lint, CI                   | It is throwaway code. Testing it is testing something that will not exist |
| The state machine                 | Raw `if`/`else` is fine for one day. M1 builds the FSM properly           |
| Sprites or animation              | Grey rectangles. Art hides feel problems                                  |
| Wall slide, all four heroes       | One hero's movement is enough to answer the question                      |
| Combat                            | M2                                                                        |
| The real folder structure         | M0                                                                        |
| Committing it to the project repo | Separate throwaway directory. Delete after                                |

---

## References

| Topic                            | Doc                                       |
| -------------------------------- | ----------------------------------------- |
| Every constant used here         | `docs/00-README.md` §5.2–5.3              |
| Movement controller spec         | `docs/06-Characters.md` §5                |
| Gap and ledge vocabulary         | `docs/10-Level-Design.md` §5              |
| Phaser config                    | `docs/03-Technical-Architecture.md` §11.1 |
| Pillar 1 targets this is probing | `docs/02-Game-Pillars.md` §5.1            |
| Asset Gate 1 checklist           | `docs/05-Asset-Pipeline.md` §5.1          |
