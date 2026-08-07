# M10 — World 5: Gorgon's Spire

**Duration:** 5 weeks (~150 h) · **Dates:** 2027-05-31 → 2027-07-02 · **Detail:** ⚪ Outline
**Roadmap:** `docs/17-Roadmap.md` M10 · **Risk:** 🟠 MEDIUM-HIGH — the castle tileset
**Expand to 🟡 Medium at the M8 gate. Template: [M05-world-1/plan.md](../M05-world-1/plan.md).**

**Five weeks.** World 5 reuses every prior mechanic in combination, and the Gorgon has four phases.

---

## Goal

**Content complete.** 20 levels, 5 bosses, 5 portfolio sections, an ending.

---

## 🔴 The blocking dependency: the castle tileset

**This has been unresolved since M0 and week 1 is the last responsible moment.**

`docs/05-Asset-Pipeline.md` §9.1 has both paths costed:

| Path                                         | Hours | Notes                                                                                                                                                                                   |
| -------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Licensed CraftPix castle/dungeon tileset** | 8     | Search the pixel-art-tilesets category, Gate 1 evaluate. Needs stone floor/wall/pillar/stair, one-way platform, spike trap, portcullis, animated torch, banner, rubble, breakable block |
| **Fallback: graveyard recolour**             | 16    | The Forbidden Graveyard set already has stone architecture. Recolour to Neutral+Magenta, author ~15 custom tiles (portcullis, banner, spike trap)                                       |

**Decide in week 1, day 1.** Do not spend a week searching. If two Gate-1 evaluations fail, execute
the fallback — it is fully costed and produces a serviceable castle.

---

## Deliverables

| #   | Deliverable                                                            | Spec                             |
| --- | ---------------------------------------------------------------------- | -------------------------------- |
| 1   | Castle tileset resolved (8–16 h) + Fairy Tale storm backgrounds        | §9.1 above                       |
| 2   | Gorgon pack harmonised (~8 h) **including a phase-2 recolour variant** | `docs/05-Asset-Pipeline.md` §6.2 |
| 3   | `TimedGateMechanic`, wall turrets, petrify zones, crushers             | `docs/10-Level-Design.md` §7.5   |
| 4   | Levels 5-1, 5-2, 5-3                                                   | `docs/10-Level-Design.md` §10    |
| 5   | Gorgon — **4 phases**, escalating gaze, collapsing arena               | `docs/09-Boss-System.md` §7.5    |
| 6   | Contact unlock, the ending, `VictoryScene`, credits                    | `docs/13-UI-UX.md` §8.9          |
| 7   | Attack module: `gazeCone`                                              |                                  |

---

## The hard parts

**World 5 is the synthesis world and has a rule the other four do not:** every room combines at
least two mechanics, and **no prior mechanic ever appears alone**
(`docs/02-Game-Pillars.md` §5.5.3). A room that is just moving platforms is a Pillar 5 violation
here even though it was correct in World 1. Check every room against this.

**Gate group clocks are globally synchronised from level start and reset on checkpoint reload,
not on death.** A retry must be identical to the first attempt.

**Petrify is not damage.** It is not blocked by Guard, not avoided by dash i-frames, and does not
trigger the i-frame path at all. The answer is always position. The cone is drawn on the ground in
S3 gold for the full charge duration — 900–1400 ms depending on phase.

**The two arena pits are the documented exception** to `docs/09-Boss-System.md` §5.5's no-pits
rule. By World 5 the player has completed 19 levels of platforming; the final fight is allowed to
demand it. Record it as deliberate in the plan expansion so a later reviewer does not "fix" it.

**Petrify + pit edge in phase 4 is the fight's cruellest interaction** and it is entirely avoidable
by watching the cone. Verify it is survivable for all four heroes at Assist-off before shipping it.

**Phase 4's petrify weight is 30 — the highest of any attack in the game.** The final phase is a
positioning test, which is the correct final exam for a platformer.

**Frame budget:** Gorgon phase 4 is the heaviest moment in the game (measured 13.6 ms against a
16.67 budget). Verify on minimum hardware in week 4, not week 5.

---

## Week shape

| Week | Focus                                                                   |
| ---- | ----------------------------------------------------------------------- |
| 1    | **Castle tileset decision + execution.** Gorgon pack + phase-2 recolour |
| 2    | `TimedGateMechanic`, turrets, petrify zones, crushers. Level 5-1        |
| 3    | Levels 5-2 and 5-3 (the synthesis gauntlets)                            |
| 4    | Gorgon four phases, collapsing arena, perf verification                 |
| 5    | Polish reserve, Contact unlock, ending, Victory scene, credits          |

---

## Exit gate

Standard world gate plus:

- [ ] **Every World 5 room combines ≥ 2 mechanics; none uses a prior mechanic alone**
- [ ] Gate group clocks reset on checkpoint reload, not on death
- [ ] The petrify cone is drawn for its full charge duration in every phase
- [ ] Petrify is unaffected by Guard, Barrier, and dash i-frames
- [ ] The two arena pits are recorded as a deliberate exception
- [ ] Phase 4 survivable by all four heroes at Assist-off
- [ ] The Gorgon's four phases each change the question
- [ ] Contact unlocks; the ending plays; Victory shows accurate stats
- [ ] **Full playthrough completable by all four heroes at Assist-off**
- [ ] Gorgon phase 4 measured ≤ 16.67 ms on minimum hardware
- [ ] Pillar 5 audit: mechanic sets disjoint across Worlds 1–4, synthesis verified in 5
- [ ] `check-cutlines.ts` green at the full configuration

Then: tag `v0.10.0` — **content complete**.

---

## Risks

| Risk                          | P       | Mitigation                                                                                    |
| ----------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| **Castle tileset unresolved** | 🟠 Med  | Fallback fully costed at 16 h. Decide day 1, execute week 1                                   |
| Four-phase boss overruns      | Med     | Phases 1–3 are the fight; phase 4 is short. If time runs out, merge 3 and 4 and record an ADR |
| Synthesis rooms become noise  | Med     | Two mechanics per room max. Three is the 3-3-5 exception and it is not repeated               |
| Perf at phase 4               | Med     | Measure in week 4. Degradation ladder tiers 1–3 are available                                 |
| Ending scope creep            | **Med** | Four beats, ~10 s. Not a cinematic. `docs/13-UI-UX.md` §8.9                                   |
