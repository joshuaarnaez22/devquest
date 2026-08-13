# M2 — Combat Feel

**Status:** 🔄 In progress · next **M2-S03** (`M2-T3`) · S01–S02 done
**Duration:** 4 weeks (~120 h) · **Dates:** 2026-10-05 → 2026-10-30 · **Detail:** 🔵 Full
**Roadmap:** `docs/17-Roadmap.md` M2 · **Risk:** 🔴 **HIGH — second only to M1**

---

## Goal

One grey rectangle hitting another grey rectangle, and it feels like Dead Cells.

Pillar 2 requires **nine feedback layers on every connected hit** (`docs/07-Combat.md` §6).
Not eight. The whole milestone is building those nine and tuning them until a playtester
watching a muted recording can always tell whether a hit landed.

## The deliberate non-abstraction

**The Skeleton in M2 is hardcoded.** Not `EnemyDefinition`, not behaviour modules, not JSON.
A single `Skeleton.ts` with its numbers inline.

This is ADR-004 applied: building `EnemyDefinition` before shipping one enemy that feels good
produces a schema that abstracts the wrong axes. M4 extracts the framework from this working
case, and the extraction is small because the behaviour code becomes `PatrolBehaviour` and
`MeleeBehaviour` almost verbatim.

Put a header comment on `Skeleton.ts` saying exactly this, or it looks like poor engineering.

---

## Preconditions

- [ ] M1 exit gate passed, `v0.1.0` tagged, **constants locked**
- [ ] Skeleton pack downloaded and Gate-1'd (parallel asset track) — frames not needed until M3,
      but a Gate-1 failure changes M3's plan

---

## Sessions (do not run M2 in one shot)

**One session = one sitting = one task** (except S13, which is five day-sessions inside T13).
Commit when that session's Verify passes. Do not start the next session in the same breath
unless you are mid-flow and unblocked. Task IDs stay stable; session IDs are only a work queue.

**Rule:** stop at each ▶ checkpoint and play before continuing. Checkpoints continue M1's
A–D lettering (E, F, G) and mark the points where combat becomes observable.

| Session        | Task                                | ~h  | Done when                                                          |
| -------------- | ----------------------------------- | --- | ------------------------------------------------------------------ |
| [x] **M2-S01** | M2-T1 Components                    | 8   | Poise break/regen + i-frame max-not-sum unit-tested                |
| [x] **M2-S02** | M2-T2 Hitbox / Hurtbox              | 8   | 83 ms window over 5 frames = exactly 1 hit                         |
| [ ] **M2-S03** | M2-T3 Collision groups + queue      | 6   | Overlap queues; nothing resolves inside a callback                 |
| [ ] **M2-S04** | M2-T4 Attack scheduling + combo     | 8   | ▶ **Checkpoint E** — hitbox at `windupMs` ±1 frame; combo chains   |
| [ ] **M2-S05** | M2-T5 CombatSystem + HitResolution  | 10  | All nine side effects fire on one hit (integration)                |
| [ ] **M2-S06** | M2-T6 HitStopSystem                 | 8   | Particles continue; 2×110 ms → 110 ms; velocity survives           |
| [ ] **M2-S07** | M2-T7 Layers 2–5, 8                 | 8   | Shake rounded + clamped; flash `tintFill` not `tint`               |
| [ ] **M2-S08** | M2-T8 Layers 6, 7, 9                | 6   | ▶ **Checkpoint F** — poise break vs flinch visibly distinct        |
| [ ] **M2-S09** | M2-T9 Hardcoded Skeleton            | 10  | Full AI cycle runs; never walks off a ledge                        |
| [ ] **M2-S10** | M2-T10 Player damage/i-frames/death | 8   | i-frames block exactly 800 ms; 100 ms flicker                      |
| [ ] **M2-S11** | M2-T11 Four abilities               | 10  | Each ability works on its hero; parry → 2× crit                    |
| [ ] **M2-S12** | M2-T12 Crouch                       | 2   | ▶ **Checkpoint G** — Skeleton fight playable end to end            |
| [ ] **M2-S13** | M2-T13 Combat tuning                | 18  | Five day-sessions (see T13); **no features**; muted-recording test |
| [ ] **M2-S14** | M2-T14 Debug overlay: combat        | 4   | `F9` renders hitbox/hurtbox/poise/hit-stop                         |
| [ ] **M2-S15** | M2-T15 Pillar 2 tests + perf gates  | 6   | Five `p2.*` checks green; `resolveQueuedHits()` < 1 ms / 8 hits    |
| [ ] **M2-S16** | M2-T16 Buffer                       | 2   | Overrun only — tests, not features                                 |

**Start here:** open this plan → **M2-S01** → build → Verify → commit → stop.

---

## Week 1 — Collision primitives (~30 h)

### M2-T1 — Components · 8 h

`src/components/`. Small, pure, heavily tested.

| Component      | Spec                    | Key detail                                                                               |
| -------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| `Health.ts`    | `docs/07-Combat.md` §12 | Trivial                                                                                  |
| `Poise.ts`     | §8                      | **Break resets the pool to max, not to zero.** All-or-nothing regen after `regenDelayMs` |
| `IFrames.ts`   | §9.1                    | **Longest wins, never additive.** `grant()` uses `Math.max`                              |
| `Knockback.ts` | §6.4                    | Decaying impulse _added_ to velocity, not overriding it                                  |
| `Facing.ts`    | —                       | −1 / +1, drives flip and hitbox offset                                                   |

**Verify:** unit tests. Poise break/regen semantics and i-frame max-not-sum are the two that
must be exact.

**Status (2026-08-11):** done. Five components in `src/components/`, 28 unit tests. Deviation
from §12: `Poise` takes `now` as a method arg instead of holding a `Clock` — `components` may
not import `platform` (eslint boundary), and this matches `IFrames` in the same section.
`Knockback` is a pure impulse holder (decay + one-shot lift + last-wins replace); the
`impulseScale` config multiplier is passed into `step()` so the component imports nothing.
Full suite 189/29 green, typecheck + lint + no-cycles clean.

---

### M2-T2 — `Hitbox` and `Hurtbox` · 8 h · _depends: T1_

`docs/07-Combat.md` §5.

**The `alreadyHit` set is the whole task.** An 83 ms active window is 5 physics frames; without
per-activation deduplication a single swing deals 5× damage. This is the most common combat bug
in Phaser projects and the `instanceId` + `alreadyHit` pattern eliminates it structurally.

Also implement the generosity asymmetry (§5.2): player hitbox +3 px leading edge, player hurtbox
−2 px per side, enemy hurtbox +2 px per side. Invisible, and it is what makes combat feel fair.

**Verify:** test — activate an 83 ms hitbox over 5 frames against one victim; assert exactly one hit.

**Status (2026-08-11):** done. `Box.ts` (shared `BoxSpec`/`Aabb`, `aabbOverlap`, `expand`,
`GENEROSITY` profiles), `Hitbox.ts` (schedule/active-window/dedup/rect/cancel), `Hurtbox.ts`
(geometry + enable). 19 tests incl. the 83 ms / 5-frame single-hit case. Split from §5.1's
illustrative code: the component stays pure (no Phaser body) — a system applies `rect`/`active`
to the Arcade body in T3, since `components` is Phaser-free. **Generosity interpretation
(§5.2):** modelled as explicit per-edge deltas; "+2 px vertically" read as +1 top/+1 bottom and
"leading edge" as the forward edge — flag for review if a different centring was intended.

---

### M2-T3 — Collision groups and the hit queue · 6 h · _depends: T2_

`src/config/CollisionGroups.ts` and the overlap registration in `GameScene`.

**Entities do not collide with each other** (§5.4). Only with terrain. This removes constant
unintentional shoving and corner-trapping, and it halves the physics broadphase cost.

**Hits are queued during overlap callbacks and resolved after the physics step** (§10.1).
Resolving inside a callback corrupts the physics group and produces random crashes.

**Verify:** overlap fires, queue fills, nothing resolves until `resolveQueuedHits()`.

---

### M2-T4 — Attack scheduling and player combo · 8 h · _depends: T2_

Attack states in the player FSM. Hitboxes **time-scheduled in milliseconds** from `AttackStep`,
never driven by animation frames (§11.2). An artist must be able to add a frame without silently
changing combat balance.

Samurai three-hit combo as the reference (`docs/06-Characters.md` §7.2.3). Combo windows,
cancels into dash and jump at any point.

**Attacks never fully stop movement** — 0.4× ground speed, 1.0× air momentum. A full stop
violates Pillar 1.

**Verify:** hitbox activates at exactly `windupMs` after state entry, ±1 frame.

---

## Week 2 — The nine layers (~30 h)

### M2-T5 — `CombatSystem` and `HitResolution` · 10 h · _depends: T3, T4_

`src/systems/CombatSystem.ts` per `docs/07-Combat.md` §6.1, §11.1.

**`HitResolution` has zero optional fields.** Omitting a layer becomes a compile error, which is
Pillar 2's falsification test #1 enforced by the type system rather than by review discipline.

Damage formula from §7.1, with every term present even where it is 1.0 in M2 (charms, assist).
Every damage number in the game must be reproducible by hand from that formula.

`HIT_TIERS` lookup table (§12), normative.

**Verify:** integration test asserting all nine side effects fire on one hit.

---

### M2-T6 — `HitStopSystem` · 8 h · _depends: T5_ · **the load-bearing layer**

`docs/07-Combat.md` §6.2. Four rules, all of which are exit-gate items:

| Rule                                                                     | Failure if broken                                          |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **Freeze participants only** — VFX, particles, camera, parallax continue | Reads as a dropped frame, not impact                       |
| **Longest wins, never additive**                                         | Two simultaneous hits produce an unbearable freeze         |
| **Input buffered, never dropped**                                        | Player feels control taken away                            |
| **Save and restore velocity; `allowGravity = false` while frozen**       | Knockback vanishes; entity drops suddenly after the freeze |

That last one is subtle: without disabling gravity, a frozen entity accumulates downward velocity
and lurches when released. It reads as "the hit stop feels wrong" with no obvious cause.

**Verify:** three tests — particles continue during a freeze; two 110 ms requests produce a
110 ms freeze; velocity survives the freeze intact.

---

### M2-T7 — Layers 2–5 and 8 · 8 h · _depends: T5_

| Layer          | Implementation                                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 2 Hit flash    | `setTintFill` (replace), **not** `setTint` (multiply). 80 ms hold, 40 ms fade                                                                |
| 3 Knockback    | `KnockbackSystem`. Direction from relative position. **Poise-intact victims receive only 35%** — this is what makes heavy enemies feel heavy |
| 4 Slash VFX    | Pooled, positioned at the contact point **offset 40% toward the victim**. Positioning on the attacker reads as a whiff                       |
| 5 Camera shake | Trauma model: 0–1 accumulator, **quadratic** response, decay 1.6/s, clamped, `Math.round` the offset, 4 px max                               |
| 8 Particles    | Material-aware (`bone`, `flesh`, `spirit`, `stone`, `scale`). Grey placeholders in M2                                                        |

**The quadratic trauma curve is why small hits feel present without shaking.** Linear makes every
hit either invisible or nauseating.

**Verify:** unrounded shake offsets cause visible shimmer — confirm rounding is applied. Four
simultaneous hits clamp rather than sum.

---

### M2-T8 — Layers 6, 7, 9 · 6 h · _depends: T6_

**Layers 6 (stagger) and 7 (damage number) fire _after_ hit stop ends**, or the stagger animation
is invisible inside the freeze.

| Layer            | Detail                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6 Stagger        | Poise broken → full stagger + a 12-particle white ring. Poise intact → 100 ms flinch, AI continues. **The visible distinction is the core readability mechanic** |
| 7 Damage numbers | Pooled, rise 12 px over 500 ms, colour-coded by `DamageNumberStyle`, 8 px proximity stacking                                                                     |
| 9 Death          | Explosion, +30 ms hit stop, +0.10 trauma, 3× particles, coin scatter with a **300 ms collection delay** so the sparkle is not eaten by the explosion             |

**Verify:** poise break and flinch are visually distinguishable at 1× without reading numbers.

---

## Week 3 — One enemy, one fight (~30 h)

### M2-T9 — Hardcoded Skeleton · 10 h · _depends: T5_

`src/entities/enemy/Skeleton.ts`. **One class, numbers inline, marked for extraction in M4.**

Stats from `docs/08-Enemy-System.md` §6.1.1. AI: `IDLE → PATROL → ALERT → CHASE → WINDUP →
ATTACK → RECOVER`, using the shared `StateMachine`. Ledge sensing so it does not walk into pits.

**The `ALERT` state is mandatory, minimum 300 ms.** Without it enemies snap from idle to charging
and it reads as unfair. This is a Pillar 4 requirement, not polish.

**The 600 ms windup is the longest in the game, deliberately.** The Skeleton teaches "wait for the
tell, dodge, punish."

**Verify:** the full state cycle runs. It never walks off a ledge. The 500 ms recovery fits two
Samurai combo hits.

---

### M2-T10 — Player damage, i-frames, death · 8 h · _depends: T5, T9_

Player takes damage, enters `HURT` (300 ms), gains 800 ms i-frames with 100 ms alpha flicker,
knockback applies. Death sequence and a respawn at the level start (checkpoints are M3).

Red vignette on damage, 200 ms, additive at 25%.

**Verify:** i-frames prevent damage for exactly 800 ms. Flicker period is 100 ms.

---

### M2-T11 — The four abilities · 10 h · _depends: T4_

`src/entities/player/abilities/` — the `Ability` interface (`docs/06-Characters.md` §9.1) plus all
four implementations.

| Hero    | Ability     | The hard part                                                                                       |
| ------- | ----------- | --------------------------------------------------------------------------------------------------- |
| Knight  | Guard       | `onIncomingDamage` hook. **200 ms parry window** (ADR-012), guard break after 3 blocked hits in 2 s |
| Samurai | Iai Slash   | Charge state, pass-through movement, **kill refunds cooldown**                                      |
| Ninja   | Shadow Step | Teleport with destination validation (8 samples then cancel), decoy that retargets enemies          |
| Wizard  | Arcane Nova | Mana pool, radial overlap query, Barrier with a damage cap                                          |

**Four implementations of one interface, written together.** This satisfies the two-implementations
rule with margin and validates the interface immediately.

**Verify:** each ability works with all four heroes selectable. Parry produces a 2× critical.

---

### M2-T12 — Crouch · 2 h · _depends: T9_

Deferred from M1 because it only matters once projectiles exist. Hurtbox height ×0.6,
horizontal movement locked. Stationary by design — no crawl.

---

## Week 4 — Tuning (~30 h)

### M2-T13 — Combat tuning · 18 h · **no new features**

Same structure as M1 week 5. Measure, adjust, re-measure.

| Day | Focus                                                                                  |
| --- | -------------------------------------------------------------------------------------- |
| 1   | Hit stop durations. Sweep 40/60/80 ms on light hits and find where impact turns to lag |
| 2   | Knockback, trauma, flash timing. Verify the poise-break read                           |
| 3   | Playtest 1. **Muted recording test** — can they tell hits landed?                      |
| 4   | Playtests 2 and 3. Skeleton encounter pacing                                           |
| 5   | Final adjust, Pillar 2 audit                                                           |

**The muted-recording test is Pillar 2's falsification test #2.** Show a playtester a silent
recording; if they cannot always tell whether a hit connected, a layer is failing.

---

### M2-T14 — Debug overlay: combat · 4 h

Hitbox/hurtbox rendering with the colour scheme from `docs/07-Combat.md` §11.4, i-frame outlines,
per-enemy poise bars, hit-stop borders, queued-hit count, resolution time.

`F9` toggles.

---

### M2-T15 — Pillar 2 tests + perf gates · 6 h

| Check                   | Target                                                  |
| ----------------------- | ------------------------------------------------------- |
| `p2.nineLayers`         | Every `HitResolution` fires nine effects                |
| `p2.hitStopNotAdditive` | Two 110 ms requests → 110 ms                            |
| `p2.inputBuffered`      | Input during freeze applies on the first unfrozen frame |
| `p2.traumaClamped`      | Trauma never exceeds 1.0                                |
| `p2.noEnemyIFrames`     | Enemies hittable every overlapping frame                |

Also enable the **e2e and perf CI gates** deferred from M0-T9: p99 frame time, heap growth over
60 s of combat, draw calls.

**Verify:** `resolveQueuedHits()` under 1 ms with 8 simultaneous hits. Zero heap growth.

---

### M2-T16 — Buffer · 2 h

---

## Exit gate

- [ ] All nine layers fire on every connected hit (integration test)
- [ ] `HitResolution` has zero optional fields
- [ ] Hit stop freezes participants only — particles continue (tested)
- [ ] Hit stop longest-wins, never additive (tested)
- [ ] Input buffered through hit stop, applied on the first unfrozen frame
- [ ] Velocity and `allowGravity` correctly saved/restored across a freeze
- [ ] One attack cannot hit the same victim twice (5-frame test)
- [ ] Hits queued during physics, resolved after — nothing resolves in a callback
- [ ] Camera trauma quadratic, clamped to 1.0, pixel-rounded
- [ ] Poise break visibly distinct from flinch
- [ ] Enemies have no i-frames
- [ ] Every damage number reproducible by hand from the §7.1 formula
- [ ] All four abilities implemented and working on their heroes
- [ ] **Three playtesters, audio muted, can always tell whether a hit connected**
- [ ] **No playtester describes hit stop as a stutter or frame drop**
- [ ] `resolveQueuedHits()` under 1 ms with 8 hits
- [ ] Zero heap growth over 60 s of combat
- [ ] Pillar 2 audit: all six falsification tests pass

Then: tag `v0.2.0`, write `docs/audits/milestone-M2.md`, **expand `plans/M04-frameworks/plan.md` to 🔵 Full**.

---

## Risks

| Risk                                 | P       | Mitigation                                                                                                                  |
| ------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Hit-feel tuning paralysis**        | 🔴 High | Week 4 is timeboxed. Same discipline as M1                                                                                  |
| Hit stop perceived as lag            | Med     | ADR-014's three causes: whole-scene freeze, input freeze, actual frame drop. Triage against those before touching durations |
| **Over-abstracting the enemy early** | 🔴 High | The Skeleton is hardcoded. If you find yourself writing `EnemyDefinition`, stop — that is M4                                |
| Ability interface wrong              | Med     | Four implementations written together surface interface problems immediately                                                |
| Combat scope creep (more enemies)    | Med     | One enemy. Variety is M4–M5                                                                                                 |

---

## Explicitly not in M2

| Not doing                                          | Milestone                       |
| -------------------------------------------------- | ------------------------------- |
| `EnemyDefinition`, JSON enemies, behaviour modules | M4                              |
| More than one enemy type                           | M4–M5                           |
| Bosses                                             | M4 (framework), M5 (first boss) |
| Real sprites and animations                        | M3                              |
| Tilemaps and real levels                           | M3                              |
| Checkpoints                                        | M3                              |
| Charms, progression, save                          | M6                              |
| Assist Options                                     | M11                             |
| Audio                                              | M11 or post-launch              |
