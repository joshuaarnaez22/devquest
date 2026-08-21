# M2 — Combat Feel

**Status:** 🔄 In progress · next **M2-S10** (`M2-T10`) · S01–S09 done · ▶ Checkpoint E confirmed (e2e); Checkpoint F pending real combat (T10)
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

| Session        | Task                                | ~h  | Done when                                                           |
| -------------- | ----------------------------------- | --- | ------------------------------------------------------------------- |
| [x] **M2-S01** | M2-T1 Components                    | 8   | Poise break/regen + i-frame max-not-sum unit-tested                 |
| [x] **M2-S02** | M2-T2 Hitbox / Hurtbox              | 8   | 83 ms window over 5 frames = exactly 1 hit                          |
| [x] **M2-S03** | M2-T3 Collision groups + queue      | 6   | Overlap queues; nothing resolves inside a callback                  |
| [x] **M2-S04** | M2-T4 Attack scheduling + combo     | 8   | ▶ **Checkpoint E** — confirmed via e2e (`combo.spec.ts`), see T5    |
| [x] **M2-S05** | M2-T5 CombatSystem + HitResolution  | 10  | All nine side effects fire on one hit (integration)                 |
| [x] **M2-S06** | M2-T6 HitStopSystem                 | 8   | Particles continue; 2×110 ms → 110 ms; velocity survives            |
| [x] **M2-S07** | M2-T7 Layers 2–5, 8                 | 8   | Shake rounded + clamped; flash `tintFill` not `tint`                |
| [x] **M2-S08** | M2-T8 Layers 6, 7, 9                | 6   | Buildable pieces done; ▶ **Checkpoint F** pending real combat (T9+) |
| [x] **M2-S09** | M2-T9 Hardcoded Skeleton            | 10  | Full AI cycle runs; never walks off a ledge                         |
| [ ] **M2-S10** | M2-T10 Player damage/i-frames/death | 8   | i-frames block exactly 800 ms; 100 ms flicker                       |
| [ ] **M2-S11** | M2-T11 Four abilities               | 10  | Each ability works on its hero; parry → 2× crit                     |
| [ ] **M2-S12** | M2-T12 Crouch                       | 2   | ▶ **Checkpoint G** — Skeleton fight playable end to end             |
| [ ] **M2-S13** | M2-T13 Combat tuning                | 18  | Five day-sessions (see T13); **no features**; muted-recording test  |
| [ ] **M2-S14** | M2-T14 Debug overlay: combat        | 4   | `F9` renders hitbox/hurtbox/poise/hit-stop                          |
| [ ] **M2-S15** | M2-T15 Pillar 2 tests + perf gates  | 6   | Five `p2.*` checks green; `resolveQueuedHits()` < 1 ms / 8 hits     |
| [ ] **M2-S16** | M2-T16 Buffer                       | 2   | Overrun only — tests, not features                                  |

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

**Status (2026-08-11):** done for the buildable half. `src/config/CollisionGroups.ts`
(bitmask + normative `COMBAT_OVERLAP_PAIRS`, §5.4) and `src/systems/HitQueue.ts`
(`queue`/`drain`/`clear` — buffers during the step, resolves nothing until drained). 9 tests.
`HitQueue` is standalone so CombatSystem composes it in T5; priority sort (§9.3) stays in T5
where fatal/damage are known. **Deferred:** the actual `physics.add.overlap` registration in
`GameScene` — there are no attack hitboxes (T4) or enemies (T9) to overlap yet, so wiring it
now would be untestable scaffolding. It lands with the first real hit in T9/T10 via
`COMBAT_OVERLAP_PAIRS`.

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

**Status (2026-08-11):** logic done and unit-tested (228/36 suite green, typecheck/lint/cycles
clean). `AttackStep.ts`, `CharacterCombat.ts` (`SAMURAI_COMBO`/`SAMURAI_AIR_ATTACK` — combo
totals match §7.2.3 exactly: 880 ms, 78 dmg), `AttackScheduler.ts` (Verify test passes: hitbox
active at `windupMs` ±1 frame). Wired into `FeelPlayer` — this also fixes a real bug where
attacks previously got stuck in `ATTACK_1` forever (nothing fed `animComplete`/
`comboWindowOpen` to the FSM before this). **Not yet confirmed live**: watching the combo
chain on screen (the Checkpoint E visual half) — the preview pane was hidden/unfocused for
the whole session, an environment issue not a code issue. Re-verify with the pane visible
before treating Checkpoint E as fully closed. `rangeY`/`offsetY` on the combo steps and all of
`SAMURAI_AIR_ATTACK` are derived, not normative (§7.2.3 gives no vertical/air numbers) —
flagged in `CharacterCombat.ts` for review.

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

**Status (2026-08-11):** done. `HitResolution`/`CombatVictim`/`CombatSinks`/`HIT_TIERS` (the
last two in `src/config/CombatFeedback.ts` — `VfxId`/`ParticleId`/`DamageNumberStyle` also
enumerated there, from §6.5/§6.8/§6.9/§6.10). `resolveQueuedHits()` implements §7.1 damage,
§7.3 poise damage, §9.3 same-frame priority sort (fatal DESC/damage DESC/attackerIsPlayer
DESC — "discard later hits on a dead victim" falls out of the existing dead-check for free),
and fans out to 9 injected sinks (T6-T8 will implement them against real systems). The Verify
integration test passes; §7.2's four worked damage examples (A-D) are locked in as regression
fixtures. 259/38 unit suite green, typecheck/lint/cycles clean.

**Also closed the M2-T4 Checkpoint E live-check** that was left pending (preview pane was
hidden all session): added `e2e/combo.spec.ts` (real Playwright, not the interactive pane) —
9/9 passing across Chromium/Firefox/WebKit, asserting the Samurai combo actually chains
ATTACK_1→ATTACK_2→ATTACK_3→IDLE with real keyboard events. Found and fixed a real e2e-only
bug in the test itself: Playwright's `keyboard.press()` does down+up faster than one 16.67ms
frame, invisible to `InputSystem`'s per-frame edge detection — fixed by holding the key down
across a frame boundary before releasing.

**Deviations flagged for review:**

- `HitResolution.shake` has no independent per-kind spec (§6.6 only gives `trauma`, consumed
  via `addTrauma`) — derived from already-normative `HIT_TIERS` fields (trauma→amplitude,
  hitStopMs→durationMs) rather than inventing new numbers.
- `QueuedHit.source: 'projectile'` has no ranged/magic model yet (Wizard's is M2-T11) —
  `resolveHitKind` defaults it to `ranged` as a placeholder.
- `AttackStep` moved from `entities/player/` to `components/` — `systems` (`HitQueue`) needed
  to reference it for `QueuedHit.step`, and `systems`/`entities` are sibling layers that
  cannot import each other.

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

**Status (2026-08-11):** done, all four rules. `src/systems/HitStopSystem.ts` implements
`HitStopScale` (the M1 seam already wired into `Entity.update()`) and matches
`CombatSinks.requestHitStop`'s exact signature so it plugs into `CombatSystem`'s fan-out
without an adapter, once GameScene wiring happens (deferred like T3's — no real enemy exists
yet to freeze against). Single global `freezeUntil` + a `frozen` id set, exactly per §6.2's
own sample: longest-wins-never-additive falls out of `if (end > freezeUntil)` naturally.

**Velocity/gravity save-restore** upgrades `Entity.update()`'s M1 placeholder (its own comment
already flagged this as "lands with HitStopSystem (M2)"). One real deviation from §6.2's
illustrative code: it hardcodes `allowGravity = true` on release, but `FeelPlayer` permanently
sets `allowGravity = false` and integrates gravity manually (`PHYSICS.GRAVITY_Y` is a real
nonzero world gravity — confirmed in `PhaserConfig.ts` — so a hardcoded restore would silently
re-enable Arcade's own gravity underneath the player's manual math). Entity now saves and
restores the entity's own prior value instead of hardcoding `true`.

**Input buffered, never dropped** is the one requiring real new plumbing: `Entity.update()`
skips `onUpdate` entirely while frozen (correct for motion), which meant `FeelPlayer` never
even looked at `InputFrame` on a frozen frame — silently dropping any one-frame
`attackPressed`/`dashPressed`/`specialPressed` edge that landed there (jump already survives
this via its own absolute-timestamp `JUMP_BUFFER`; the other three had no such protection).
Added `Entity.onFrozenTick()` (runs every frozen frame instead of `onUpdate`) and
`FrozenInputLatch` (pure, tested) — `FeelPlayer` latches a press during the freeze and applies
it exactly once on the first real frame after release.

275/40 unit suite green (+16), typecheck/lint/cycles clean.

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

**Status (2026-08-11):** done, all five. **Layer 5 (camera shake) was already fully built in
M1** — `CameraSystem.addTrauma`/`traumaOffset` already match §6.6 exactly (quadratic, rounded,
clamped, 4px max); only added the literal "four simultaneous hits" regression case using real
`HIT_TIERS.heavy.trauma` (both Verify items now covered). New: `HitFlash` (`components/`, pure
hold/fade timing + `lerpColour`; a caller applies the result via `setTintFill`/`clearTint` once
wired). `KnockbackSystem` (implements `CombatSinks.applyKnockback` directly; ADDs to velocity,
never overrides). `VfxSystem.spawnSlash` (pooled, ADD-blended placeholder rects sized from a new
`VFX_VISUAL` table). `ParticleSystem.burst` now genuinely accepts `ParticleId` instead of an
ignored `string` — visuals stay one grey placeholder shape until M3 art.

**Two real gaps found and fixed in T5's `CombatSystem`, not new to T7:** (1) knockback
`dirX` was a `hit.point.x >= 0` placeholder, not `Math.sign(victim.x - attacker.x)` per §6.4 —
`CombatVictim` gained a `centre` field and `buildResolution` an `attackerCentre` parameter to
fix it properly. (2) the poise-intact 35% knockback scale (§6.4's `poiseScale`) was never
wired in at all. Both are now regression-tested with exact §6.4 values. The VFX 40%-toward-
victim offset (§6.5) is computed in `CombatSystem.applyResolution` via `lerpPoint`, not stored
on `HitResolution` (keeps `res.point` the raw contact point for particles/damage numbers,
which use no such offset) — also regression-tested.

`KNOCKBACK_IMPULSE_SCALE` (§6.4's illustrative code) has no value anywhere in the docs;
`Knockback.step()` already defaults its own `impulseScale` param to 1 (a no-op) from S01
for exactly this reason, so `KnockbackSystem` doesn't introduce a new constant for it.

301/42 unit suite green (+22), typecheck/lint/cycles clean. Nothing to test in the UI —
none of these sinks are wired into `GameScene` yet (deferred like T3's, no real combat exists
to trigger them until T9/T10).

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

**Status (2026-08-11):** buildable pieces done. `Flinch` (`components/`, pure 100ms timing —
the poise-intact case; the poise-broken "full stagger" case is `fsm.force('HURT', ctx)` per
§11.1's pseudocode, which needs a real victim FSM and doesn't exist until Skeleton, T9).
`DamageNumberSystem` — pooled, `Quad.easeOut` rise (12px/500ms), fade over the final 200ms,
colour-coded via the new `DAMAGE_NUMBER_COLOUR` table, proximity stacking via the pure
`damageNumberRules.ts` (`stackOffsetY`/`damageNumberText`, both tested). `VfxSystem.
spawnDeathFlash` — the one net-new Layer 9 visual (200ms white circle, 8→40px). The
poise-break particle burst (12, white ring) was already wired in T5's `CombatSystem`.

**Deferred, not buildable yet:** the FSM-force for full stagger (needs an enemy FSM, T9), the
death explosion/3x particle multiplier/`combat:kill` emit (these are a live `CombatSinks`
adapter's job — T9/T10, once there is a real victim to wire), coin scatter (needs an enemy's
`drops` array — T9+ content), and the death sprite animation (M3 art).

**Font note:** `devquest-6px`/`devquest-8px` (§6.8) do not exist until M3's real atlas —
`DamageNumberSystem` uses the existing M1 debug bitmap font (`debug`, fixed 8px) as a
placeholder, so the normal/critical size distinction is not yet represented; colour-coding is
real. **Checkpoint F itself is NOT confirmable yet** — unlike Checkpoint E (closed via e2e
because the combo was already live-wired), nothing built in T5-T8 is wired into `GameScene`;
"poise break vs flinch visibly distinct" needs an actual fight, which doesn't exist until the
Skeleton (T9) lands and gets wired up.

315/44 unit suite green (+14), typecheck/lint/cycles clean. Nothing to test in the UI.

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

**Status (2026-08-21):** done. `SkeletonStateId.ts`/`SkeletonStates.ts` — the shared 9-state
subset a Basic melee enemy actually reaches (`SPAWN`/`REPOSITION`/`SPECIAL`/`SEARCH` omitted,
see the two flagged simplifications below), same `state()`/`allowedTransitions()` pattern as
`PlayerStates.ts`, 25 tests including the full happy-path cycle and every `poiseBroken → HURT`
edge. `SkeletonCombat.ts` — stats/timings/attack numbers from §6.1.1/§6.1.3/§8.2 inline per
ADR-004 (poise 12, regen 1500ms, stagger 220ms, overhead swing 600/133/500ms). `SkeletonMovement.ts`
— pure `resolvePatrolVelocity`/`resolveChaseVelocity`, 7 tests, so the "never walks off a ledge"
behaviour is unit-tested independent of Phaser. `Skeleton.ts` (`entities/enemy/`) — the Phaser
glue: Arcade body + standard gravity, `Health`/`Poise`/`Knockback`/`Hitbox`/`Hurtbox` (hurtbox
gets `GENEROSITY.ENEMY_HURTBOX` per §5.2 of `07-Combat.md`) + `Facing`/`VisionCone`/`LedgeSensor`,
FSM-driven movement and attack-hitbox scheduling on WINDUP entry. Not unit-tested directly
(Phaser glue, same precedent as `VfxSystem`/`ParticleSystem`) — its correctness rests on the
tested pure pieces (`SkeletonStates`, `SkeletonMovement`) it wires together.

Also landed the M2-T3 deferral this unblocks: `QueuedHit.step` is now `AttackStep |
EnemyAttackStep | null`; `CombatSystem.ts` gained an `isPlayerAttackStep` type guard so
`computeKnockback`/`buildResolution` fall back to `HIT_TIERS` defaults for enemy attacks
(no `knockback`/`knockbackLift`/`vfxAngleDeg` on `EnemyAttackStep`), with a regression test
proving the fallback.

**Two flagged simplifications** (diagram in §5.1 vs. what a single-attack Basic Skeleton needs):

- **No waypoint system exists yet (M3)** — `PATROL --> IDLE : reached waypoint` has no trigger,
  so the Skeleton patrols indefinitely, reversing only at a ledge/wall via `LedgeSensor`, until
  it spots the player. `SEARCH` is omitted entirely (no lost-player re-acquisition logic yet) —
  `CHASE`/`RECOVER`/`HURT`'s "lost player" edges go straight to `IDLE` instead.
- **`WINDUP --> RECOVER : interrupted (poise broken)` vs. the universal `WINDUP --> HURT : poise
broken`** — the source diagram has both edges on the same trigger. Resolved in favour of the
  universal rule (poise break always → `HURT`, matching §8.1's "on break: full stagger"); the
  `RECOVER` edge would skip the stagger the player just earned, contradicting the fairness
  contract in §5.2. Flag if a future enemy actually needs the softer `RECOVER` interrupt.

**Not yet wired into `GameScene`** — no `physics.add.overlap` registration, no spawning, no
`CombatSinks` adapter calling `Skeleton.receiveHit`. Per the plan's own T9/T10 split, that lands
in **T10** alongside player damage/i-frames — building it now against nothing to overlap with
would be untestable scaffolding (same reasoning T3 already used to defer `COMBAT_OVERLAP_PAIRS`
wiring). `receiveHit(damage, poiseDamage, t)` is the seam T10 hangs the adapter off.

365/48 unit suite green (+32), typecheck/lint/cycles clean. **Nothing to test in the UI** — same
as T5-T8: the Skeleton runs its full AI cycle standalone (proven by the FSM/movement unit tests)
but isn't spawned into a scene yet, so there's no live view of it until T10's `GameScene` wiring.

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
