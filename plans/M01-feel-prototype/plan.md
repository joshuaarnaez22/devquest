# M1 — Feel Prototype

**Status:** 🔄 In progress · next **M1-S14** (`M1-T14`) · S01–S13 done · ▶ Checkpoint B
**Duration:** 5 weeks (~150 h) · **Dates:** 2026-08-31 → 2026-10-02 · **Detail:** 🔵 Full
**Roadmap:** `docs/17-Roadmap.md` M1 · **Risk:** 🔴 **HIGH — tuning paralysis**
**Next:** [M02-combat-feel/plan.md](../M02-combat-feel/plan.md) (after exit gate)

---

## Goal

A grey rectangle that feels as good to move as Celeste. No art, no combat, no content.

**This is the most important milestone in the project.** Pillar 1 is load-bearing: it is a
prerequisite for Pillar 2 (combat) and Pillar 4 (learnability), and every hour of content
built on a movement system that feels wrong is an hour wasted.

## The hard end date

**Week 5 ends on 2026-10-02 regardless of how the tuning feels.** At that point the
constants in `docs/00-README.md` §5.3 lock, and further changes require an ADR.

This is not arbitrary discipline. Tuning paralysis is the project's #1 named risk
(`docs/01-Vision.md` §8.3), and the countermeasure is a date, not willpower. **Shipping a
movement system that is 90% right beats an indefinite search for 100%.** The remaining 10%
becomes a backlog item with a measured description of what feels off.

---

## Preconditions

- [x] M0 exit gate passed, `v0.0.1` tagged — [audit](../../docs/audits/milestone-M0.md) · tag `v0.0.1`
- [x] spike-00 findings available — [S0-T6 answers](../spike-00/results.md) are the starting point for tuning
- [x] Any constant deltas discovered in the spike already applied to `GameConstants.ts` — spike kept doc defaults; no delta required

---

## Sessions (do not run M1 in one shot)

**One session = one sitting = one task** (except S20, which is five day-sessions inside T20).
Commit when that session’s Verify passes. Do not start the next session in the same breath
unless you are mid-flow and unblocked. Task IDs stay stable; session IDs are only a work
queue.

**Rule:** stop at each ▶ checkpoint and play before continuing.

| Session        | Task                   | ~h  | Done when                                             |
| -------------- | ---------------------- | --- | ----------------------------------------------------- |
| [x] **M1-S01** | M1-T1 Entity           | 4   | Unit test: scaled delta / frozen entity               |
| [x] **M1-S02** | M1-T2 InputSystem      | 8   | Input-to-physics ≤ 1 frame instrumented               |
| [x] **M1-S03** | M1-T3 SystemRegistry   | 3   | Systems update in `SYSTEM_ORDER`                      |
| [x] **M1-S04** | M1-T4 Horizontal move  | 10  | Max speed + turn boost measured (may span 2 sittings) |
| [x] **M1-S05** | M1-T5 Test scene       | 5   | ▶ **Checkpoint A** — `level:test` grey box runs L/R   |
| [x] **M1-S06** | M1-T6 Gravity + jump   | 8   | Full-hold peak 32.0 ± 0.5 px                          |
| [x] **M1-S07** | M1-T7 Variable jump    | 4   | Hold / early release / tap heights                    |
| [x] **M1-S08** | M1-T8 Coyote + buffer  | 6   | ≥ 98% ledge success over 1,000 attempts               |
| [x] **M1-S09** | M1-T9 Player FSM       | 8   | Transitions + `LAND` duration === 0                   |
| [x] **M1-S10** | M1-T10 Animator seam   | 4   | ▶ **Checkpoint B** — jump + tint-per-state            |
| [x] **M1-S11** | M1-T11 Dash            | 8   | Distance + cooldown-from-start                        |
| [x] **M1-S12** | M1-T12 Wall slide/jump | 8   | Clears `SHAFT`; input lock holds                      |
| [x] **M1-S13** | M1-T13 Four heroes     | 6   | JSON vs §5.2; `F1`–`F4` swap                          |
| [ ] **M1-S14** | M1-T14 Ninja air jump  | 4   | Fast-fall air jump = apex height                      |
| [ ] **M1-S15** | M1-T15 Camera          | 4   | ▶ **Checkpoint C** — camera + all heroes              |
| [ ] **M1-S16** | M1-T16 Squash/stretch  | 6   | Distinct jump / fall / land deformation               |
| [ ] **M1-S17** | M1-T17 Dust VFX        | 8   | 60 s movement, zero heap growth                       |
| [ ] **M1-S18** | M1-T18 Debug overlay   | 6   | Sparkline + pools + frame-step live                   |
| [ ] **M1-S19** | M1-T19 Pillar tests    | 6   | ▶ **Checkpoint D** — `test:pillars` green in CI       |
| [ ] **M1-S20** | M1-T20 Tuning only     | 20  | Five day-sessions (see T20); **no features**          |
| [ ] **M1-S21** | M1-T21 Latency capture | 4   | p99 ≤ 50 ms (240 fps phone)                           |
| [ ] **M1-S22** | M1-T22 Constants lock  | 2   | ADR-023 + `check-constants` green                     |
| [ ] **M1-S23** | M1-T23 Buffer          | 4   | Overrun only — tests, not features                    |

**Start here:** open this plan → **M1-S14** → read docs cited by T14 → implement → Verify → commit → stop.

---

## Week 1 — Entity, input, and horizontal movement (~30 h) · sessions S01–S05

### M1-T1 — `Entity` base class · 4 h · _session: S01_

`src/entities/Entity.ts`. Deliberately thin — this is the _only_ project-authored class
between `Phaser.GameObjects.Sprite` and a concrete entity (`docs/03-Technical-Architecture.md` P2).

Owns: `EntityId`, the Arcade body, `active`, hit-stop-scaled delta, and the `Poolable` contract.
Does **not** own: health, state, animation, or anything gameplay-specific.

```ts
update(time: number, rawDelta: number): void {
  const delta = this.hitStop.scaledDelta(this.id, rawDelta);
  if (delta === 0) { /* frozen — see 07-Combat §6.2 */ return; }
  this.onUpdate(time, delta);
}
```

Hit stop does not exist until M2, so `scaledDelta` returns `rawDelta` via a null implementation.
**Wire the seam now** so M2 is additive rather than a refactor of every entity.

**Verify:** unit test — a subclass receives scaled delta; a frozen entity receives 0.

---

### M1-T2 — `InputSystem` · 8 h · _session: S02_ · _depends: T1_

`src/systems/InputSystem.ts`. Produces the immutable `InputFrame`
(`docs/13-UI-UX.md` §5.2) — the single source of input truth for everything downstream.

| Requirement                | Detail                                                                        |
| -------------------------- | ----------------------------------------------------------------------------- |
| Rebuilt every frame        | Never mutated after construction                                              |
| Edge + level detection     | `jumpPressed` / `jumpHeld` / `jumpReleased`, computed once against last frame |
| `jumpPressedAt`            | Absolute timestamp, for buffering                                             |
| Both devices always polled | Either can act; `device` reflects most recent                                 |
| Analog deadzone            | 0.30 radial                                                                   |
| **Digital output only**    | `moveX: -1                                                                    | 0   | 1`. No analog speed — `docs/13-UI-UX.md` §5.3 |
| Device switch              | Any button, or stick displacement > 0.5                                       |
| Runs first                 | Position 1 in `SYSTEM_ORDER_GAMEPLAY`                                         |

Also `src/config/InputMap.ts` with the defaults from §5.1 — three keyboard bindings for jump.

**Verify:** instrumented latency test — timestamp at `keydown` vs. the physics step that
consumed it. Must be ≤ 1 frame. This is Pillar 1's primary numeric target.

---

### M1-T3 — `SystemRegistry` wiring + `SYSTEM_ORDER` · 3 h · _session: S03_ · _depends: T2_

`src/config/SystemOrder.ts` with the full array from `docs/03-Technical-Architecture.md` §8.3.
M1 populates `input` and `camera`; the rest are registered as no-ops so the order is visible
and stable from the start.

**Update order is data, never call-site order.** A `GameScene.update` that calls systems by hand
is the thing this prevents.

**Verify:** unit test — systems update in declared order; destroy runs in reverse.

---

### M1-T4 — `PlayerController` horizontal · 10 h · _session: S04_ · _depends: T2_

`src/entities/player/PlayerController.ts`, per `docs/06-Characters.md` §5.1.

Accel, decel, air accel, air decel, turn boost. **Zero `characterId` branches** — the controller
takes a `CharacterMovement` struct and nothing else. This constraint is what guarantees a Pillar 1
fix applies to all four heroes at once and cannot silently regress three of them.

**Verify:** reaches max speed in the derived time (90 px/s at 900 px/s² = 100 ms). Turn-around
under the 1.8× boost is measurably snappier than a standing start.

---

### M1-T5 — Test scene and debug readout · 5 h · _session: S05_ · _depends: T4_ · ▶ Checkpoint A

`src/scenes/GameScene.ts` (minimal) and a grey-box test level built from
`src/config/LevelMetrics.ts` — every gap and ledge in the vocabulary, labelled, with soft floors.

Plus a live readout: `vx`, `vy`, state, grounded, coyote status, buffer status, dash cooldown,
last jump height. This is the instrument for the next four weeks; build it properly.

**Verify:** `npm run level:test` boots straight into it.

---

## Week 2 — Vertical movement (~30 h) · sessions S06–S10

### M1-T6 — Gravity and jump · 8 h · _session: S06_ · _depends: T4_

Asymmetric gravity per `docs/06-Characters.md` §5.1: base 900, ×1.35 falling, ×0.70 within
±40 px/s of apex, terminal 300.

**Verify:** full-hold jump peaks at **32.0 ± 0.5 px**. If not, the integration order is wrong —
gravity must apply before the position step, and the apex window must be checked against the
pre-step velocity.

---

### M1-T7 — Variable jump height · 4 h · _session: S07_ · _depends: T6_

`vy *= 0.45` on release while rising, guarded by a `jumpCutApplied` flag that resets per jump.

**Without the flag, release-and-repress cuts twice** and the minimum jump becomes
inconsistent — one of the four bugs that make a jump feel unreliable for reasons players
cannot articulate.

**Verify:** full hold 32.0 px, release at 50 ms ≈ 13.5 px, instant tap ≈ 6.5 px. The 4.9× range
is what makes vertical navigation expressive.

---

### M1-T8 — Coyote time and jump buffer · 6 h · _session: S08_ · _depends: T6_

| Mechanic | Implementation                                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coyote   | **Absolute expiry timestamp**, not a countdown. Cleared by: jump, dash, re-ground, damage. **Not** by attacking                                      |
| Buffer   | Store `jumpPressedAt`; consume on ground contact. **Consumed, not re-evaluated** — once resolved the buffer clears even if the resolution was `none` |

**Verify:** automated harness — 1,000 jumps triggered at random offsets within ±100 ms of leaving
a ledge. Success rate ≥ 98% inside the window, 0% outside it. This is a Pillar 1 exit-gate target.

---

### M1-T9 — Player FSM · 8 h · _session: S09_ · _depends: T6, T7, T8_

`src/entities/player/PlayerStates.ts` — every state and transition from
`docs/06-Characters.md` §6.1, using the shared `StateMachine` from M0.

**Two details that are exit-gate items:**

- **`LAND` has a duration of exactly 0 ms.** It exists only as a hook for landing feedback.
  A `LAND` state with any duration is landing recovery, which violates Pillar 1 falsification
  test #5.
- **Every state's `allowed` array is populated.** An illegal transition throws in dev. This has
  caught more bugs in comparable projects than any other single measure.

Interrupt priority per §6.3: `DEATH > HURT > SPECIAL > DASH > JUMP > ATTACK > movement`.
**Dash outranks jump** — a player pressing both wants the scarcer resource.

**Verify:** unit tests for every transition in the diagram, plus rejection of a sample of
illegal ones. `LAND` duration asserted to be 0.

---

### M1-T10 — `PlayerAnimator` seam · 4 h · _session: S10_ · _depends: T9_ · ▶ Checkpoint B

`src/entities/player/PlayerAnimator.ts`. No sprites yet — it swaps the grey box's tint per state,
which is enough to verify the state machine visually.

**Built now, before art, to establish the architectural rule while it is cheap:** the animator
receives `Readonly<PlayerSnapshot>` and has no body access. The ESLint rule from M0-T5 enforces it.

**Verify:** the lint rule fires if you add `snap.body` to the animator.

---

## Week 3 — Dash, walls, and the four heroes (~30 h) · sessions S11–S15

### M1-T11 — Dash · 8 h · _session: S11_ · _depends: T9_

Per `docs/06-Characters.md` §5.5. Velocity locked, gravity suspended, horizontal input ignored,
jump input **buffered** and fired on dash end.

**Cooldown measured from dash _start_.** Effective downtime is `cooldown − duration`, which for
the Ninja is 210 ms and reads as "always available." Measuring from the end makes every dash feel
sluggish, and it is the single most common dash bug.

Air dash: one per airborne period, refreshed on landing.

**Verify:** travels the derived distance (260 × 0.15 = 39 px). Cooldown timing correct from start.

---

### M1-T12 — Wall slide and wall jump · 8 h · _session: S12_ · _depends: T11_

All four heroes, differing slide speeds (ADR-011). Wall jump: `vy = jumpVelocity × 0.95`,
`vx = −wallDir × 150`, **120 ms horizontal input lock**.

**Without the input lock, holding toward the wall re-attaches immediately** and the jump appears
not to work.

Wall jump restores the air jump and refreshes the dash.

**Verify:** a two-jump chain clears a 48 px `SHAFT`. Holding toward the wall after a wall jump
does not re-attach within the lock window.

---

### M1-T13 — Four character configurations · 6 h · _session: S13_ · _depends: T11, T12_

`public/assets/data/characters/{knight,samurai,ninja,wizard}.json` — the movement blocks only.
Combat, abilities, and animations come in M2 and M6.

A minimal `ContentDatabase` that loads and validates just these four. The full content database
is M4-T1; this is the smallest thing that works.

Every value from `docs/06-Characters.md` §5.2, exactly.

**Verify:** `tools/ci/check-character-values.ts` diffs the JSONs against the §5.2 table.
`F1`–`F4` hot-swaps heroes in the test scene.

---

### M1-T14 — Ninja double jump · 4 h · _session: S14_ · _depends: T13_

The only hero-specific movement code in M1. Lives in the FSM's `AIR_JUMP` state, driven by
`CharacterMovement.airJumps` — **not** by a `characterId` check.

**`vy = min(vy, 0)` before applying the air jump.** Without it, a double jump taken while falling
fast produces a weak, inconsistent arc — the classic double-jump bug.

**Verify:** air jump from a fast fall reaches the same height as one from apex (24.0 px).

---

### M1-T15 — Camera · 4 h · _session: S15_ · _depends: T9_ · ▶ Checkpoint C

`src/systems/CameraSystem.ts` per `docs/04-Art-Direction.md` §10.2: lerp 0.12, deadzone 48 × 32,
follow offset −12 (bias upward — players jump more than they fall), `roundPixels`, look-ahead
+24 px eased over 400 ms above 70% max speed.

Plus **vertical snap**: after a fall over 48 px, the vertical target eases to the new ground level
over 300 ms rather than following continuously. Without it, a long fall makes the camera lag then whip.

Trauma-based shake is scaffolded but unused until M2.

**Verify:** no shimmer during movement at any zoom. Falling 200 px does not whip the camera.

---

## Week 4 — Feedback and polish (~30 h) · sessions S16–S19

### M1-T16 — Squash and stretch · 6 h · _session: S16_ · _depends: T9_

`src/entities/ProceduralAnim.ts`, values from `docs/14-Animation-Standards.md` §8.1.

**Origin must be bottom-centre** or squash lifts the box off the ground — the most common
squash-and-stretch bug. Max deformation ±25%.

**Verify:** jump, fall, and all three landing tiers produce visibly distinct deformation.

---

### M1-T17 — Dust VFX and `VfxSystem` skeleton · 8 h · _session: S17_ · _depends: T16_

`src/systems/VfxSystem.ts` + `src/systems/ParticleSystem.ts`, pooled from M0's `ObjectPool`.
Grey placeholder shapes — real sprites are M3.

Run dust, jump dust, land dust (three impact tiers), skid dust, dash afterimages (3 at 60 ms,
50%→0% alpha).

**Everything pooled from day one.** Retrofitting pooling is a refactor; building it in is free.

**Verify:** heap-growth test — 60 s of continuous movement, zero growth.

---

### M1-T18 — Debug overlay · 6 h · _session: S18_ · _depends: T15, T17_

`src/systems/DebugSystem.ts`. `Ctrl+Shift+D`, ships in production (`docs/01-Vision.md` §6.2).

M1 scope: frame-time sparkline (60-frame ring, 16.67 ms line in S3 gold), per-system ms bars,
pool live/peak/max, heap delta over 60 s, player state readout, `F8` frame-step, `F10` cull margins.

**The sparkline is the highest-value dev feature in the project.** A spike you can see is a spike
you fix the same session.

**Verify:** all panels live and accurate. Stripped-profiler check confirms dev-only instrumentation
is absent from the prod bundle.

---

### M1-T19 — Pillar 1 automated tests · 6 h · _session: S19_ · _depends: T8, T11_ · ▶ Checkpoint D

`npm run test:pillars`, the Pillar 1 subset from `docs/02-Game-Pillars.md` §6.3:

| Check                  | Target                                       |
| ---------------------- | -------------------------------------------- |
| `p1.latency`           | Input-to-velocity ≤ 1 frame                  |
| `p1.coyote`            | Ledge-jump success ≥ 98% over 1,000 attempts |
| `p1.fuzz`              | 0 dropped inputs per 10,000 fuzzed           |
| `p1.noLandingRecovery` | `LAND` duration === 0                        |
| `p1.animatorReadonly`  | Static — animator has no body access         |

Wire into CI as a required gate.

**Verify:** all five pass. Break one deliberately and confirm CI fails.

---

## Week 5 — Tuning only (~30 h) · sessions S20–S23

### M1-T20 — Tuning · 20 h · _session: S20_ · **no new features**

**Week 5 adds nothing.** It measures, adjusts, and re-measures.

| Day | Focus                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Solo tuning against the spike-00 notes. Sweep gravity, run speed, jump velocity ±15% and record which direction improves |
| 2   | Playtest 1 — a person who has not played it. Silent observation, then the Pillar 1 questions                             |
| 3   | Adjust. Re-measure all five automated targets                                                                            |
| 4   | Playtests 2 and 3                                                                                                        |
| 5   | Final adjust, **lock**, document                                                                                         |

**The playtest protocol:** hand them the keyboard, say nothing, watch. Count every "it didn't
register" out loud. Pillar 1's falsification threshold is **more than one per 10 minutes**.

**Do not fix what testers do not notice.** A 4 ms latency improvement nobody perceives is not a
week-5 activity.

---

### M1-T21 — Latency measurement · 4 h · _session: S21_

The one target that cannot be automated: input-to-_visible_-response at p99 ≤ 50 ms.

240 fps phone camera, capture the physical key press and the screen together, count frames across
20 trials. Crude and accurate.

**Verify:** p99 ≤ 50 ms on minimum hardware. If it fails, the cause is almost always browser
compositor latency rather than game code — check `requestAnimationFrame` alignment before
touching the controller.

---

### M1-T22 — Constants lock · 2 h · _session: S22_

1. Final values into `src/config/GameConstants.ts`
2. Mirror into `docs/00-README.md` §5.3
3. `check-constants` green
4. `docs/19-Decisions.md` → **ADR-023 — M1 constants lock**, recording the final values, what
   changed from the spec, and why
5. Note in `CLAUDE.md`: these values now require an ADR to change

---

### M1-T23 — Buffer · 4 h · _session: S23_

Overrun only. If unused, add tests. **Do not add features.**

---

## Exit gate

- [ ] Input-to-velocity ≤ 1 frame, measured
- [ ] Input-to-visible ≤ 50 ms at p99, 240 fps capture
- [ ] Ledge-jump success ≥ 98% over 1,000 automated attempts
- [ ] 0 dropped inputs over 10,000 fuzzed
- [ ] **Zero landing recovery frames** — `LAND` duration is 0
- [ ] All four movement configs implemented and distinguishable
- [ ] **`PlayerController.ts` contains zero `characterId` branches** (grep)
- [ ] Coyote stored as an absolute timestamp
- [ ] Air jump zeroes negative `vy` first
- [ ] Jump cut applied once per jump
- [ ] Wall jump locks horizontal input 120 ms
- [ ] Dash cooldown measured from start
- [ ] **Three external playtesters report the movement feels good, unprompted**
- [ ] "It didn't register" ≤ 1 per 10 minutes of play
- [ ] Zero heap growth over 60 s of movement
- [ ] Sustained 60 fps on minimum hardware
- [ ] Debug overlay complete for M1 scope
- [ ] **Constants LOCKED, ADR-023 written**
- [ ] Pillar 1 audit: all five falsification tests pass

Then (post-gate, after all exit boxes):

- [ ] tag `v0.1.0`
- [ ] write `docs/audits/milestone-M1.md`
- [ ] expand `plans/M03-vertical-slice/plan.md` to 🔵 Full
- [ ] expand `plans/M02-combat-feel/plan.md` to 🔵 Full — deferred from M0 (next-but-one at M0 gate)

---

## Risks

| Risk                                     | P       | Impact   | Mitigation                                                                                                                                |
| ---------------------------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Tuning paralysis**                     | 🔴 High | Fatal    | Hard end date. Week 5 is timeboxed. Lock at 90% if needed and record the gap                                                              |
| Feel is wrong and tuning does not fix it | Low     | Severe   | Would indicate a structural problem (fixed-step, integration order, compositor). Escalate to an ADR-005 revisit rather than tuning harder |
| Latency fails on minimum hardware        | Low     | Severe   | Check `rAF` alignment and `fixedStep` first. Game code is rarely the cause                                                                |
| Scope creep into combat                  | **Med** | Moderate | M1 has no hitboxes, no enemies, no damage. Park anything combat-shaped in `docs/20-Future-Ideas.md`                                       |
| Building the FSM too generally           | Med     | Moderate | Player FSM only. The enemy FSM is M4, and it will be a _different_ state set on the same primitive                                        |

---

## Explicitly not in M1

| Not doing                                           | Milestone                        |
| --------------------------------------------------- | -------------------------------- |
| Any sprite, animation frame, or art                 | M3                               |
| Hitboxes, damage, combat, hit stop                  | M2                               |
| Character abilities (Guard, Iai, Shadow Step, Nova) | M2                               |
| Enemies of any kind                                 | M2                               |
| Tilemaps, Tiled, real levels                        | M3                               |
| Crouch                                              | M2 (needed only for projectiles) |
| Audio                                               | M11 or post-launch               |
| UI beyond the debug overlay                         | M6                               |
| Save system                                         | M6                               |

**Combat is the strongest pull in M1 and must be resisted.** A movement system tuned in isolation
is tunable; one tuned while combat is also changing has two moving variables and neither converges.
