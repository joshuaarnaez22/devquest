# M4 — Frameworks

**Duration:** 4 weeks (~120 h) · **Dates:** 2026-12-07 → 2027-01-01 · **Detail:** 🔵 Full
**Roadmap:** `docs/17-Roadmap.md` M4 · **Risk:** 🟡 MEDIUM — over-generalisation

---

## Goal

Generalise what M2 and M3 proved, and build the tools that make M5–M10 fast.

At the end, **adding an enemy is one JSON file and zero TypeScript**, and a level designer can
iterate without an engineer.

## The rule that governs this milestone

**Two concrete implementations before one abstraction** (`docs/16-Coding-Standards.md` §9.4).

M4 is where framework astronautics kills projects. The counter is that everything built here is
extracted from working M2/M3 code, not imagined. If you are writing an interface and cannot name
its second implementation, delete it.

**The extraction should feel small.** The hardcoded Skeleton's patrol code becomes
`PatrolBehaviour` almost verbatim. If it feels like a rewrite, the M2 slice was too specialised
and that is worth recording.

---

## Preconditions

- [ ] M3 exit gate passed, `v0.3.0` tagged
- [ ] Art-cost variance recorded; cut-line escalation resolved if it triggered

---

## Week 1 — Content database (~30 h)

### M4-T1 — JSON schemas · 10 h

`src/data/schemas/`, JSON Schema draft 2020-12, one per content type: `enemy`, `boss`,
`character`, `world`, `level`, `charm`, `portfolio`, `ui-menu`.

Schemas are the designer's error messages. A missing required field must produce
`enemies/skeleton_archer.json/stats/maxHp: required property missing`, not a runtime crash three
levels in.

**Verify:** each schema rejects a deliberately malformed fixture with the correct JSON pointer.

---

### M4-T2 — `ContentDatabase` · 8 h · *depends: T1*

`src/data/ContentDatabase.ts`. Loads, validates, indexes, freezes. Typed accessors returning
branded ids (`docs/03-Technical-Architecture.md` §15).

**`validateAll()` runs at boot and fails loudly.** A designer's typo is caught before the title
screen, not at spawn time in World 4.

Branded-id factories are the only place `as EnemyDefId` appears. Everywhere else the compiler
guarantees an id names real content.

**Verify:** boot fails with a readable path when a content file is malformed.

---

### M4-T3 — Extract `EnemyDefinition` · 8 h · *depends: T2*

Convert the hardcoded M2 Skeleton to data. Write `enemies/skeleton_basic.json` with the exact
numbers from `Skeleton.ts`, then delete `Skeleton.ts`.

**The behaviour must be pixel-identical.** Record a before/after input replay and diff the
resulting position traces. If they differ, the extraction lost something.

---

### M4-T4 — The one `Enemy` class · 4 h · *depends: T3*

`src/entities/enemy/Enemy.ts`, configured entirely from `EnemyDefinition`
(`docs/08-Enemy-System.md` §10.1).

**No `switch (family)` anywhere.** The `family` field exists for tooling and telemetry, not
branching. `grep -r "extends Enemy" src/` must return nothing, forever.

---

## Week 2 — Behaviours and spawning (~30 h)

### M4-T5 — Behaviour interface and registry · 6 h · *depends: T4*

`docs/08-Enemy-System.md` §5.3, §9.2 of the coding standards.

**Behaviours are singletons; per-instance state lives in `ctx.state`.** A behaviour that stores
per-enemy data in its own fields makes every Werewolf in the level leap in perfect synchrony —
the bug this design exists to prevent.

Behaviours return `BehaviourIntent`; the FSM decides. A behaviour cannot force an illegal
transition, so the `allowed` guard stays meaningful.

---

### M4-T6 — Five behaviours · 12 h · *depends: T5*

`patrol`, `chase`, `melee`, `ranged`, `leap`. The first three are extracted from the M2 Skeleton;
`ranged` and `leap` are new but needed for the Skeleton Archer and (in M7) the Werewolf.

**Each gets unit tests with no Phaser scene.** This is the payoff of the intent model — a
behaviour is testable against a fake context.

---

### M4-T7 — Shared enemy FSM · 6 h · *depends: T5*

`src/entities/enemy/EnemyStates.ts` — all 11 states from `docs/08-Enemy-System.md` §5.1.

`ALERT` mandatory, ≥ 300 ms. `RECOVER` is the fairness contract — every attack is followed by a
window where the enemy cannot act.

---

### M4-T8 — Sensing · 6 h · *depends: T7*

`VisionCone` and `LedgeSensor` (`docs/08-Enemy-System.md` §5.5, §5.6).

**Line of sight is mandatory for ranged enemies.** An archer that shoots through a wall is a bug,
and P6 ("enemies do not cheat") is a stated principle.

Hearing is omnidirectional, short (48–60 px), and *does* pass through walls — it models "it heard
you land" and prevents cheesing enemies behind thin walls.

Implement the **10 Hz staggered raycast now** (ADR-021), keyed `(frameCount + id) % 6`. Doing it
later means measuring a regression first.

---

## Week 3 — Spawning, pooling, bosses (~30 h)

### M4-T9 — `SpawnSystem` and `CullingSystem` · 8 h · *depends: T4*

Activation margin 400 px, deactivation 560 px — the 160 px hysteresis prevents boundary thrash.

**Aggroed enemies are never culled.** Otherwise an enemy chasing you vanishes when you run, and
worse, reappears at full health at its spawn point.

`killedSpawnPointIds` prevents farming — a killed enemy does not respawn until a checkpoint restart.

---

### M4-T10 — Enemy pooling and tier generation · 6 h · *depends: T9*

Pools keyed by `EnemyDefId`, not family — `skeleton_basic` and `skeleton_elite` have different
textures and body sizes.

`tools/content/generate-tiers.ts` (`docs/08-Enemy-System.md` §9.2). Veteran and elite JSONs are
**generated and committed**; CI verifies they match regeneration. A hand edit to a generated file
fails the build — the edit belongs in the basic definition or the tier delta.

**Verify:** `skeleton_veteran` and `skeleton_elite` generate correctly. Elite rim light renders.

---

### M4-T11 — Boss framework · 12 h · *depends: T7*

`src/entities/boss/Boss.ts` + `BossPhaseMachine.ts` — nested FSM, phases outer, attacks inner
(`docs/09-Boss-System.md` §5.1).

**Three rules that are exit-gate items:**

- **Phase thresholds checked only in `P_RECOVER`** — never mid-attack, or the boss goes
  invulnerable during a swing the player is dodging.
- **Stagger deferred during `P_WINDUP`/`P_ATTACK`** — a boss the player can lock out of its own
  patterns is not a fight.
- **`lastAttackId` excluded from selection** — weighted random without it produces runs of the
  same attack, which is either unfair or boring.

Plus four attack modules: `sweepMelee`, `slamMelee`, `thrustMelee`, `projectileFan`. The remaining
eight arrive with the bosses that need them.

---

### M4-T12 — Arena lifecycle · 4 h · *depends: T11*

Trigger volume, gate closing, camera bounds lock, health bar, **the intro that does not take
control from the player**, the four-beat death sequence.

**Beat 3 of the death sequence is 500 ms of stillness** and it is the beat people cut. It is what
converts a busy VFX sequence into a moment.

---

## Week 4 — Tooling (~30 h) · **pays for itself in M5 week 1**

### M4-T13 — `level:test` hot-load · 8 h

`npm run level:test -- w1-1` boots straight into a level, debug overlay on, `F1`–`F4` hero swap,
`F5` reload level data without restarting the game.

**The single highest-value tool for the level designer.** M5's review recorded an estimated 6 hours
saved in the first milestone alone.

---

### M4-T14 — `level:validate` · 10 h

Six checks (`docs/10-Level-Design.md` §8.7):

| Check | Fails if |
|---|---|
| `check-layers` | A required layer missing or misnamed |
| `check-hero-parity` | A main-path gap > 37.3 px or ledge > 26.1 px (worst-case hero minus margin) |
| `check-teaching` | A world's mechanic lacks any of the five beats, or they are out of order |
| `check-pacing` | Empty stretch > 160 px, or checkpoints > 900 px apart |
| `check-encounter-budget` | Weight exceeds the level's budget by > 15% |
| `check-template` | Missing main path, optional path, secret, mini challenge, or 3 checkpoints |

`check-hero-parity` is the important one — it is what makes `docs/06-Characters.md` P3 (no hero
gated out) enforceable rather than aspirational.

---

### M4-T15 — Debug overlay completion · 6 h

Enemy state labels, poise bars, vision cones, ledge probes, spawn/cull margins, boss phase and
attack readout, per-pool live/peak/max.

---

### M4-T16 — Extraction verification and gate · 6 h

- Add an enemy variant in a PR touching **zero `.ts` files** — this is G4 demonstrated, not claimed
- Replay-diff the extracted Skeleton against the M2 recording
- Full CI including the new level gates

---

## Exit gate

- [ ] **Zero enemy subclasses** — `grep "extends Enemy" src/` returns nothing
- [ ] **Adding an enemy variant requires zero `.ts` changes** (demonstrated in a PR)
- [ ] All five M4 behaviours implemented with scene-free unit tests
- [ ] Behaviour state is per-instance (two-enemy independence test)
- [ ] `ContentDatabase.validateAll()` runs at boot with JSON-pointer errors
- [ ] Tier generation works; CI verifies generated files match
- [ ] Extracted Skeleton behaviour is identical to M2 (replay diff)
- [ ] Boss phase thresholds checked only in `P_RECOVER`
- [ ] Stagger deferred during windup/attack (test)
- [ ] Attack selection never repeats the previous attack
- [ ] Aggroed enemies never culled
- [ ] Vision raycasts staggered at 10 Hz
- [ ] `npm run level:test -- w1-1` works with hero hot-swap
- [ ] `level:validate` runs all six checks and passes on 1-1
- [ ] Zero heap growth over 60 s of combat with spawning
- [ ] AI update under 1.5 ms with 40 active enemies

Then: tag `v0.4.0`, write `docs/audits/milestone-M4.md`, **expand `plans/M06-meta-layer.md` to 🔵 Full**.

---

## Risks

| Risk | P | Mitigation |
|---|---|---|
| **Over-generalisation** | 🟠 Med-High | Two-implementations rule, enforced in review. Every interface must name its second implementation |
| Extraction changes behaviour subtly | Med | Replay-diff against the M2 recording. Not eyeballing |
| Building all 14 behaviours now | Med | Five only. The rest arrive with the enemies that need them |
| Building all 12 attack modules now | Med | Four only |
| Tooling week cut under pressure | **Med** | **Do not cut it.** T13/T14 pay back within M5 week 1. Cutting tooling to save a week costs three |

---

## Explicitly not in M4

| Not doing | Milestone |
|---|---|
| Behaviours beyond the five | With their enemies, M5–M10 |
| Attack modules beyond the four | With their bosses |
| Any actual boss | M5 |
| Levels 1-2 through 1-4 | M5 |
| UI, save, progression, Codex | M6 |
| World mechanics beyond World 1's | M7+ |
