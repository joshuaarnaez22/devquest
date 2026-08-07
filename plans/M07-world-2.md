# M7 — World 2: Autumn Reach

**Duration:** 4 weeks (~120 h) · **Dates:** 2027-03-01 → 2027-03-26 · **Detail:** ⚪ Outline
**Roadmap:** `docs/17-Roadmap.md` M7 · **Risk:** 🟡 MEDIUM
**Expand to 🟡 Medium at the M5 gate. Template: [M05-world-1.md](M05-world-1.md).**

---

## Goal

World 2 complete, plus **the Cut Line A decision** — the first hard scope checkpoint.

---

## Deliverables

| # | Deliverable | Spec |
|---|---|---|
| 1 | Autumn Forest tileset + Fairy Tale backgrounds harmonised (~10 h) | `docs/04-Art-Direction.md` §8.3 |
| 2 | Werewolf pack harmonised (~3 h); Werewolf Scout veteran variant | `docs/08-Enemy-System.md` §6.2 |
| 3 | `WindZoneMechanic`, crumbling branches, updrafts | `docs/10-Level-Design.md` §7.2 |
| 4 | **Wall-slide introduced** as the World 2 mastery beat, all four heroes | `docs/06-Characters.md` §5.6, ADR-011 |
| 5 | Levels 2-1, 2-2, 2-3 | `docs/10-Level-Design.md` §10 |
| 6 | Alpha Werewolf — 3 phases, arena 2-4 with active wind | `docs/09-Boss-System.md` §7.2 |
| 7 | Projects unlock | `docs/12-Portfolio-System.md` |
| 8 | Behaviours: `enrage`, `charge`. Attack modules: `chargeRush`, `ricochetLeap` | |

---

## The hard parts

**Wind is the first mechanic that changes the movement maths.** `check-hero-parity` must account
for wind assistance when validating gap widths — a 56 px gap is impossible unassisted and trivial
with a 140 px/s² tailwind. The arithmetic is worked in `docs/10-Level-Design.md` §13.1; the
checker needs the same formula.

**Wind must always be visible.** Foreground leaf particles show current direction and **change
500 ms before the force does** on oscillating zones. Wind you cannot see is wind you cannot plan
around.

**Force cap is 200 px/s².** Beyond ~22% of gravity the player loses meaningful control.

**Crumbling branch delay is 400 ms** — jump buffer (120 ms) + reaction (~250 ms) + margin. Derived,
not chosen.

**Wall-slide arrives here, not in World 1**, so World 1 keeps to five inputs and zero advanced
verbs (Pillar 4). It is introduced in 2-1 room 6 with soft ground below.

**The Alpha's arena wind does not affect the boss.** Deliberate asymmetry — making it symmetric
neutralises it.

---

## Week shape

| Week | Focus |
|---|---|
| 1 | Asset harmonisation, `WindZoneMechanic`, crumbling branches, updrafts, wall-slide |
| 2 | Levels 2-1 and 2-2 (greybox → art → populate) |
| 3 | Level 2-3, Alpha Werewolf three phases |
| 4 | Polish reserve, Projects unlock, **Cut Line A decision** |

---

## 🔴 Cut Line A decision — 2027-03-26

Assessed at the M7 gate (`docs/17-Roadmap.md` §8):

| Signal | Threshold | If breached |
|---|---|---|
| Weeks per world (mean of M5, M7) | > 5 | Invoke |
| Art harmonisation variance vs. estimate | > +40% | Invoke |
| Open P1 bugs | > 8 | Invoke |
| Castle tileset unresolved at this date | Yes | Escalate; likely Cut Line B |

**If invoked:** drop Worlds 4 and 5. The Oni Lord (M8) becomes the final boss and unlocks
Experience, Skills, **and** Contact via `fallbackUnlocks`. Product: 12 levels, 3 worlds, ~3 hours,
complete. The freed 10 weeks go to polish, accessibility, and Time Trial.

**An ADR is written either way** — including the decision not to cut, with its reasoning.

---

## Exit gate

Standard world gate (see M05 §Exit gate) plus:

- [ ] Wind zones implement all five teaching beats, 1–4 in 2-1
- [ ] Wall-slide available to all four heroes at differing speeds
- [ ] `check-hero-parity` accounts for wind assistance
- [ ] Wind direction telegraphed 500 ms ahead on oscillating zones
- [ ] Alpha Werewolf: 3 phases, each changing the question not the volume
- [ ] Frenzy Rush wall-slam produces the 1100 ms punish window
- [ ] Projects unlocks and is readable
- [ ] **Cut Line A decision made and recorded as an ADR**

Then: tag `v0.7.0`, **expand `plans/M09-world-4.md` to 🟡 Medium** (or skip if Cut Line A invoked).
