# M8 — World 3: Hollow Barrow

**Duration:** 4 weeks (~120 h) · **Dates:** 2027-03-29 → 2027-04-23 · **Detail:** ⚪ Outline
**Roadmap:** `docs/17-Roadmap.md` M8 · **Risk:** 🟡 MEDIUM — the light mask is the only novel rendering feature
**Expand to 🟡 Medium at the M6 gate. Template: [M05-world-1/plan.md](../M05-world-1/plan.md).**

---

## Goal

World 3 complete — and, if Cut Line A was invoked at M7, **this is the shipping product.**

Three worlds, twelve levels, all five portfolio sections reachable via fallback unlocks, full meta
layer. Everything after M8 makes the product better rather than making it exist.

---

## Deliverables

| #   | Deliverable                                                                                         | Spec                                 |
| --- | --------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | Forbidden Graveyard tileset + Fairy Tale night backgrounds (~10 h)                                  | `docs/04-Art-Direction.md` §8.3      |
| 2   | Yokai and Witch packs harmonised (~5 h)                                                             | `docs/08-Enemy-System.md` §6.3, §6.4 |
| 3   | `LanternMechanic` — light mask, soul-braziers, fog banks                                            | `docs/10-Level-Design.md` §7.3       |
| 4   | Levels 3-1, 3-2, 3-3                                                                                | `docs/10-Level-Design.md` §10        |
| 5   | Oni Lord — 3 phases, shadow copies, brazier extinguishing                                           | `docs/09-Boss-System.md` §7.3        |
| 6   | Experience unlock                                                                                   |                                      |
| 7   | Behaviours: `teleport`, `summon`, `flee`, `hover`. Attack module: `blinkStrike`, `projectileHoming` |                                      |

---

## The hard parts

**ADR-018's two constraints are inviolable and must be checked, not trusted:**

1. **No instant-death hazard outside the lantern radius on a main path.** Write
   `tools/ci/check-dark-hazards.ts` in week 1, before authoring a single dark room. A pit the
   player cannot see is not a challenge.
2. **Every enemy attack windup is self-illuminated** regardless of ambient darkness — an additive
   glow at 25% in the world's accent colour during `WINDUP`. This is a rendering-path requirement
   on every enemy, and an art requirement that windup frames read at that glow level.

**The light mask is the most expensive rendering feature in the game.** A single `RenderTexture`,
cleared and redrawn per frame, with `erase` per light source. Budgeted at 0.42 ms on minimum
hardware. Measure it in week 1 on the real machine — if it exceeds ~0.8 ms, the degradation
ladder's tier-4 fallback (static ambient tint) becomes the default rather than the fallback, and
that is an ADR.

**The Oni Lord is always visible.** Even at zero braziers it renders at 60% self-illumination,
rising to 100% in phase 3. **Darkness hides its adds and projectiles, never the boss itself.** An
invisible boss is unfair; an invisible threat pattern is a challenge.

**Shadow copies need a tell that survives the darkness.** The real Oni Lord has glowing eyes;
copies have dark ones. At ambient 0.35 with braziers doused, verify that tell actually reads —
`docs/09-Boss-System.md` §13.3 works through exactly this diagnosis.

**Room 3-3-5 is the documented three-mechanic exception** (fog + wind + darkness), the only one in
the game. It is 320 px long with a checkpoint 160 px before it. Do not add a second exception.

**Killing the Witch clears her summons.** This is the entire mechanical reason the Witch exists;
without it, killing her is pointless once she has summoned.

---

## Week shape

| Week | Focus                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------- |
| 1    | Asset harmonisation, `LanternMechanic` + light mask, **`check-dark-hazards.ts`**, perf-measure the mask |
| 2    | Levels 3-1 and 3-2, `teleport`/`summon`/`flee`/`hover` behaviours                                       |
| 3    | Level 3-3, Oni Lord three phases                                                                        |
| 4    | Polish reserve, Experience unlock, **Cut-Line-A shipping verification if invoked**                      |

---

## Exit gate

Standard world gate plus:

- [ ] `check-dark-hazards.ts` passes — no main-path pit outside the lantern radius
- [ ] Every enemy attack windup self-illuminates regardless of ambient darkness
- [ ] The Oni Lord's real self is always distinguishable from its shadow copies at every brazier state
- [ ] Light mask costs ≤ 0.5 ms on minimum hardware
- [ ] Room 3-3-5 has a checkpoint 160 px before it
- [ ] Witch summons die when the Witch dies
- [ ] Experience unlocks and is readable
- [ ] **If Cut Line A invoked:** all five portfolio sections reachable, `check-cutlines.ts` green,
      full accessibility pass, and this build is shippable

Then: tag `v0.8.0`, **expand `plans/M10-world-5/plan.md` to 🟡 Medium**.
