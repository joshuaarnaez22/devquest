# M3 — Vertical Slice

**Duration:** 5 weeks (~150 h) · **Dates:** 2026-11-02 → 2026-12-04 · **Detail:** 🔵 Full
**Roadmap:** `docs/17-Roadmap.md` M3 · **Risk:** 🟠 **MEDIUM-HIGH — art cost is unmeasured**

---

## Goal

Level 1-1, complete and beautiful. One level that proves the whole product.

**M3's real output is a measurement.** Every art estimate in the twelve-month plan rests on
`docs/04-Art-Direction.md` §8.3's figure of 79 hours to harmonise all locked packs. M3
harmonises roughly a quarter of them. **If the measured cost exceeds the estimate by more than
40%, that is a scope-cut trigger** escalated at the M3 review.

---

## Preconditions

- [ ] M2 exit gate passed, `v0.2.0` tagged
- [ ] Knight, Skeleton, Green Zone tileset, Nature backgrounds, explosion and slash packs
      downloaded and Gate-1'd
- [ ] Tiled 1.11+ installed
- [ ] Aseprite installed

---

## Week 1 — Harmonisation pipeline (~30 h)

### M3-T1 — Harmonisation scripts · 12 h

Complete the M0-T12 stubs. These are the tools that make 79 hours possible rather than 300.

| Script | Detail |
|---|---|
| `remap-palette.ts` | Nearest-Lab (CIEDE2000) snap to the 48-colour master. ΔE ≤ 2 snap, ≤ 6 warn, > 6 fail. **Output indexed PNG (`palette: true`) — 60–70% file-size reduction, free** |
| `deaa.ts` | Alpha cutoff 128. **Emits a before/after contact sheet for human review** — automated de-AA eats sword tips and antennae |
| `add-outline.ts` | 1 px `#0d0b14`, all sides |
| `desaturate.ts` | Pull to the background band: saturation 0.15–0.40, value range compressed to 30–70% |
| `normalise-frames.ts` | Re-canvas to the max bounding box, **aligned bottom-centre, not canvas-centre** — otherwise a raised-sword frame makes the character bob |
| `check-tiling.ts` | Compare leftmost and rightmost pixel columns; flags non-looping background layers |

**Verify:** run each on a test asset. The de-AA contact sheet is generated and inspectable.

---

### M3-T2 — Aseprite scripts · 6 h

`art/scripts/`: `apply-master-palette.lua`, `add-outline.lua`, `export-anim-strip.lua`,
`check-density.lua` (`docs/04-Art-Direction.md` §10.4).

`export-anim-strip.lua` emits both a horizontal strip and the frame manifest with
**pivot at `(w/2, h−2)`** — uniform across every entity, which is what makes swapping a
differently-sized sprite safe.

---

### M3-T3 — Harmonise Knight · 6 h · **the measurement baseline**

The first pack through all six gates. **Time it precisely** — this number calibrates every
remaining art estimate.

Palette remap → verify `hurt` exists → outline check → slice with frame tags → atlas → in-game
at 1× and 6×.

Frame tags per `docs/14-Animation-Standards.md` §5.2, exactly. `check-anim-names` rejects anything
outside the controlled vocabulary.

**Verify:** `assets:verify` passes. Record actual hours vs. the 2 h estimate in
`docs/05-Asset-Pipeline.md` §6.1.

---

### M3-T4 — Harmonise Skeleton · 3 h · *depends: T3*

Same pipeline, second pack. The second measurement matters more than the first — it shows
whether T3's time was setup cost or per-pack cost.

---

### M3-T5 — Animation registry and attack-anim generation · 3 h · *depends: T3*

`src/entities/AnimationRegistry.ts` + `AnimationBuilder.ts`
(`docs/14-Animation-Standards.md` §6.2, §11.1).

**Attack animations use per-frame durations derived from `AttackStep`, never a single frame rate.**
A uniform rate drifts against the hitbox window; `buildAttackAnim` splits durations per phase so
`windupMs` in JSON retimes the animation automatically with no art change.

**Registered once at boot, not per scene.** Phaser's animation manager is global; re-registering
leaks and eventually throws.

**Verify:** change `windupMs` in the character JSON; the animation retimes, hitbox still aligns.

---

## Week 2 — Environment art (~30 h)

### M3-T6 — Green Zone tileset · 6 h

Palette remap plus a **selective-outline pass** — silhouette edges only, not internal detail.
A fully outlined tileset makes every brick shout as loudly as the player.

Tileset requirements (`docs/05-Asset-Pipeline.md` §8.4): **0 margin, 0 spacing** in both Tiled and
the loader; tile custom properties `collides`, `slope`, `oneWay`, `hazard`, `material`, `breakable`.

**Tile IDs are stable from this point.** Once locked, tiles may be appended but never reordered —
reordering invalidates every `.tmj`.

---

### M3-T7 — Nature backgrounds · 5 h

Desaturate and value-compress to the background band. Verify horizontal tiling with `check-tiling`.

**If the pack ships flat rather than layered**, manual separation into 3–5 parallax layers is
3–4 h — the reason background harmonisation is budgeted at 4 h each.

---

### M3-T8 — VFX packs · 8 h · **the slash pack is the risk**

Explosion pack: palette remap, additive conversion (remove dark pixels — dark + additive = muddy).

**Slash pack: de-cartooning** (`docs/04-Art-Direction.md` §8.4). The source is anime-style and will
be the most visually discordant element in the game if used raw. Five steps: reduce to 5–7 frames,
neutral ramp only, hard-quantise to ≤3 values, thin the arcs 1–2 px, convert to additive.

**If it still reads as foreign after treatment, author custom slashes instead** — a 5-frame arc is
~2 h and it is the highest-visibility VFX in the game.

Plus dust, sparkle, and impact particles as custom assets (small, ~4 h).

---

### M3-T9 — Ambient tint and parallax · 5 h · *depends: T7*

`src/level/ParallaxBackground.ts`. The ambient tint is a `MULTIPLY` quad at
`Depth.AMBIENT_TINT`, **between background and midground, never touching the HUD**
(`docs/04-Art-Direction.md` §6.3).

Parallax scroll factors must produce whole-pixel offsets — `Math.floor(cameraScrollX * factor)`
when positioning manually. Fractional parallax shimmer is the most common pixel-art rendering bug.

---

### M3-T10 — Palette conformance in CI · 6 h

Wire `check-palette` into CI over the whole asset tree, including the reserved-signal check —
no environment or background asset may use S0–S5.

Add the **greyscale contrast check** (`tools/ci/check-contrast.ts`): convert visual-regression
screenshots to luminance and assert the player sprite differs from its surrounding 64 × 64 region
by ≥ 40%. This is `docs/04-Art-Direction.md` P3 made automatic, and it delivers colourblind
support as a side effect.

---

## Week 3 — Level pipeline (~30 h)

### M3-T11 — `LevelLoader` and `TileCollision` · 10 h

`src/level/`. Parse `.tmj`, build tile layers, collision by property, one-way platforms.

**45° slopes only** — Arcade is AABB (ADR-005). Handled by a position-correction pass on the
player when overlapping a slope tile. Mark it with a `ponytail:` comment naming the ceiling.

Required layers, exact names, throw at load if missing (`docs/10-Level-Design.md` §8.2).

**Verify:** load time under 45 ms. Missing-layer error names the level and the layer.

---

### M3-T12 — `ObjectFactory` registry · 6 h · *depends: T11*

`registerObjectType(type, builder)` (`docs/10-Level-Design.md` §9.1). **The loader knows nothing
about specific types** — dispatch is a map lookup. Adding an object type is one registration call.

M3 registers: `enemy`, `pickup`, `hazard`, `platform`, `checkpoint`, `cameraZone`, `spawn`, `door`.

---

### M3-T13 — Moving platforms, one-way, bounce caps · 8 h · *depends: T12*

World 1's mechanic set as the first `MechanicPlugin` implementations
(`docs/10-Level-Design.md` §7.1).

**Player velocity inheritance is the subtle part.** Jumping off a moving platform must carry its
horizontal velocity, or the platform steals the jump. Speed bounds 20–60 px/s: faster is
unreadable at 320×180, slower is waiting rather than timing.

---

### M3-T14 — `CheckpointSystem` · 6 h · *depends: T12*

`CheckpointState` per `docs/10-Level-Design.md` §12.2 — position, HP, resource, collected
pickups, killed spawn points, **and `mechanicState`**.

`mechanicState` matters more than it looks: dying after solving a puzzle must not reset the
puzzle. It is the single most important checkpoint detail once World 4 exists.

**Coins are kept on death.** Losing currency discourages exploration.

Respawn uses `flashCut` (120 ms) — death should be cheap.

---

## Week 4 — Build 1-1 (~30 h)

### M3-T15 — Greybox 1-1 · 8 h

All 12 rooms from `docs/10-Level-Design.md` §10, terrain only. Play it before adding anything.

**Every gap and ledge from `LevelMetrics`.** Rooms 2–4 are the jump teaching sequence and their
metrics are load-bearing: room 2's `HOP` gaps must be trivially clearable with a 16 px soft-landing
ledge below, because beat 1 requires that failure costs nothing.

---

### M3-T16 — Art pass 1-1 · 8 h · *depends: T6, T7, T15*

Decor layers, foreground occlusion, ambient tint, parallax, props.

**Depth discipline:** every object uses a `Depth.ts` constant. The lint rule bans literal
`setDepth(n)`.

---

### M3-T17 — Populate 1-1 · 6 h · *depends: T13, T14, T16*

Skeletons at the documented encounter positions, coins (52 main / 24 optional / 20 secret),
the optional path, the secret alcove with the Whetstone charm, three checkpoints, the mini
challenge.

Encounter budget 8; `docs/10-Level-Design.md` §10 uses 7.

**Room 7 is the enemy demonstration** — a Skeleton on a ledge *below* the player's path, visible
for 4 s, unreachable. This is Pillar 4's "demonstration before demand" and it is easy to get wrong
by making it reachable.

---

### M3-T18 — Full feedback contract · 8 h · *depends: T8, T16*

Every row of `docs/02-Game-Pillars.md` §5.3.2 implemented. This is the Pillar 3 exit gate and it
is a checklist, not a judgement:

run dust · sustained trail · skid · jump ring + stretch · fall squash · land burst scaled by
impact · dash ghosts + streak · slash + weapon trail + lean · the nine-layer hit stack · damage
vignette · coin sparkle + arc + tick · shard flash + 500 ms slow-motion · debris · explosion +
coin scatter · checkpoint bloom + toast · area-name fade

**Make the contract an executable test fixture**, not a table someone reads. A build missing a row
fails.

---

## Week 5 — Polish and gate (~30 h)

### M3-T19 — Polish reserve · 14 h

The 20% reserve. Squash tuning, VFX timing, encounter pacing, camera zones, secret discoverability.

**Watch a playtester find the secret.** If nobody finds it, the visual tell is too subtle. If
everybody does, it is not a secret.

---

### M3-T20 — Visual regression CI · 6 h

Playwright screenshots per scene, 0.1% pixel-diff threshold. Baselines committed.

Catches the class of bug that is otherwise invisible: an accidental texture-filter change, a
depth reorder, a scaling regression.

---

### M3-T21 — Perf verification · 4 h

First **minimum-hardware pass** (`docs/15-Performance.md` §9.4) with real art. Full playthrough of
1-1, debug overlay on, record any frame over 16.67 ms.

Includes the 20-background-tabs scenario. The target user has a browser full of tabs; a game that
holds 60 fps in isolation and 42 in reality has failed.

---

### M3-T22 — Deletion Test rehearsal · 2 h

No portfolio code exists yet, so the test passes trivially. **Build the harness anyway** —
`tools/ci/deletion-test.sh` — so M6's run is a script rather than an archaeology exercise.

---

### M3-T23 — Art-cost report · 4 h · **the milestone's real output**

| Pack | Estimated | Actual | Variance |
|---|---|---|---|
| Knight | 2 h | | |
| Skeleton | 1 h | | |
| Green Zone | 6 h | | |
| Nature bg | 4 h | | |
| Explosion | 3 h | | |
| Slash | 6 h | | |
| **Total** | **22 h** | | |

Extrapolate to the remaining 57 h. **If the projection exceeds +40%, escalate at the M3 review as
a cut-line signal.**

---

## Exit gate

- [ ] 1-1 completable by all four heroes
- [ ] **Every row of the Pillar 3 feedback contract implemented** (executable fixture)
- [ ] All integrated assets pass `assets:verify`
- [ ] Every integrated pack has an archived licence in `licenses/<slug>/`
- [ ] Greyscale contrast check passes on 1-1 screenshots
- [ ] No environment asset uses a reserved signal colour
- [ ] Level loads in under 45 ms
- [ ] Sustained 60 fps on minimum hardware, including the tabs scenario
- [ ] Visual regression baselines committed, CI gate live
- [ ] Deletion Test harness exists and passes
- [ ] Tile IDs recorded and locked for Green Zone
- [ ] Attack animations retime from JSON with no art change
- [ ] Animations registered once at boot
- [ ] Pillar 3 audit: all five falsification tests pass
- [ ] **Art-cost report complete, variance recorded**

Then: tag `v0.3.0`, write `docs/audits/milestone-M3.md`, **expand `plans/M05-world-1/plan.md` to 🔵 Full**.

---

## Risks

| Risk | P | Mitigation |
|---|---|---|
| **Art harmonisation exceeds estimate** | 🟠 Med-High | This milestone measures it. > +40% is a cut-line escalation at the review |
| **Slash pack unusable after de-cartooning** | Med | Fall back to custom slashes, ~2 h. Budgeted inside T8 |
| Background pack ships flat, not layered | Med | +3–4 h manual separation. Absorbed by T7's 5 h |
| Tileset lacks needed tiles | Med | Author the gaps. Green Zone is the simplest world; if it is short, later worlds will be worse — record it |
| Perfecting 1-1 forever | Med | T19 is timeboxed at 14 h. 1-1 gets one more polish pass in M5 |
| Building level tooling beyond need | Low | `level:test` and `level:validate` are M4. M3 uses manual reload |

---

## Explicitly not in M3

| Not doing | Milestone |
|---|---|
| `EnemyDefinition`, behaviour modules, JSON enemies | M4 |
| Boss framework | M4 |
| Levels 1-2, 1-3, 1-4 | M5 |
| `level:test` hot-load, `level:validate` | M4 |
| Menus, HUD beyond the M2 debug readout | M6 |
| Save system, progression, charms | M6 |
| The Codex | M6 |
| Any world beyond 1 | M7+ |
