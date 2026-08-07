# M9 — World 4: Crystal Deep

**Duration:** 5 weeks (~150 h) · **Dates:** 2027-04-26 → 2027-05-28 · **Detail:** ⚪ Outline
**Roadmap:** `docs/17-Roadmap.md` M9 · **Risk:** 🟡 MEDIUM
**Expand to 🟡 Medium at the M7 gate. Template: [M05-world-1/plan.md](../M05-world-1/plan.md).**

**Five weeks, not four.** Beam puzzles are slow to author and slower to verify — every puzzle must
be solvable by all four heroes, which is four playthroughs per room.

---

## Goal

World 4 complete, plus **the Cut Line B decision**.

---

## Deliverables

| #   | Deliverable                                                                                                | Spec                                 |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | Crystal Cave tileset (~8 h — includes **authoring emissive crystal frames**, which the pack will not have) | `docs/04-Art-Direction.md` §8.3      |
| 2   | Orc and Golem packs harmonised (~5 h, both paid packs)                                                     | `docs/08-Enemy-System.md` §6.5, §6.6 |
| 3   | `LightBeamMechanic`, low-gravity fields, conveyors                                                         | `docs/10-Level-Design.md` §7.4       |
| 4   | Levels 4-1, 4-2, 4-3                                                                                       | `docs/10-Level-Design.md` §10        |
| 5   | Golem Sovereign — 3 phases, **the crystal-core mechanic**                                                  | `docs/09-Boss-System.md` §7.4        |
| 6   | Skills unlock                                                                                              |                                      |
| 7   | Behaviours: `shield`, `groundSlam`. Attack modules: `beamSweep`, `radialBurst`, `projectileArc`            |                                      |

---

## The hard parts

**Beam routing is the game's only real puzzle mechanic.** Beams recompute on mirror rotation and
emitter toggle, **not every frame** — a raycast chain capped at 8 bounces, triggered by an event.
Per-frame recomputation is the obvious implementation and it is wasteful.

**`mechanicState` restoration is critical here.** Dying after solving a 5-mirror puzzle must not
reset it. `CheckpointState.mechanicState` exists for this (`docs/10-Level-Design.md` §12.2) and
World 4 is where it stops being theoretical. Test it explicitly: solve, die, verify still solved.

**Every puzzle must be solvable by all four heroes.** The Wizard reaches mirrors with bolts; melee
heroes must jump. Verify each puzzle four times, not once. This is the reason for the fifth week.

**Conveyor cap is ±90 px/s.** At −90 the Knight (78 px/s) cannot make forward progress, which is
used deliberately in two places to force a dash — and must never appear on a required path without
a dash-refresh point.

**The Golem Sovereign is a puzzle boss** and the only fight with a hard requirement beyond "reduce
HP". Three crystal cores, 60 HP each, at 52 px height for the shoulders — above standing melee
range. A player who only hits the body takes ~2.4× longer and will likely lose. **Verify all four
heroes can reach the shoulder cores**; the low-gravity fields in phase 2 exist partly for this.

**The 4-2 Orc corridor is already flagged.** `docs/08-Enemy-System.md` §11.3 works through the
tuning: widen to 200 px and add a raised ledge, rather than nerfing the Orc. Build it correctly
the first time.

**`enemies-w4` is the tightest atlas** (~1010 × 1010 against a 1024 budget). If it overflows, split
the Sovereign to a `boss-w4` atlas loaded only in the arena — a build-config change, not code.

---

## Week shape

| Week | Focus                                                                                    |
| ---- | ---------------------------------------------------------------------------------------- |
| 1    | Asset harmonisation incl. emissive crystals, `LightBeamMechanic`, low-gravity, conveyors |
| 2    | Level 4-1, `shield` and `groundSlam` behaviours                                          |
| 3    | Level 4-2                                                                                |
| 4    | Level 4-3 (puzzle-heavy), Golem Sovereign three phases + core mechanic                   |
| 5    | Polish reserve, four-hero puzzle verification, Skills unlock, **Cut Line B decision**    |

---

## 🔴 Cut Line B decision — 2027-05-28

| Signal                               | Threshold | If breached |
| ------------------------------------ | --------- | ----------- |
| Castle tileset resolved              | No        | Invoke      |
| Weeks remaining vs. M10+M11+M12 work | < 8 weeks | Invoke      |
| Open P1 bugs                         | > 6       | Invoke      |
| Cut Line A already invoked           | —         | N/A         |

**If invoked:** drop World 5. The Golem Sovereign becomes the final boss and unlocks Skills **and**
Contact. Product: 16 levels, 4 worlds, ~3.5 hours. The freed 5 weeks go to polish.

**ADR either way.**

---

## Exit gate

Standard world gate plus:

- [ ] Every beam puzzle solvable by all four heroes (verified individually, four passes)
- [ ] `mechanicState` restores on checkpoint reload — solve, die, still solved
- [ ] All three Sovereign cores reachable by all four heroes
- [ ] The Sovereign is defeatable without breaking cores (slower) and ~2.4× faster with them
- [ ] The 4-2 Orc corridor is 200 px with a raised ledge
- [ ] `enemies-w4` atlas fits, or the Sovereign is split to `boss-w4`
- [ ] Beams recompute on change, not per frame
- [ ] Skills unlocks and is readable
- [ ] Deletion Test run (M9 is a scheduled run) and passes under 2 hours
- [ ] **Cut Line B decision made and recorded as an ADR**

Then: tag `v0.9.0`, **expand `plans/M11-polish-accessibility/plan.md` to 🔵 Full**.
