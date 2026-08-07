# M5 — World 1: Verdant Ascent

**Duration:** 4 weeks (~120 h) · **Dates:** 2027-01-04 → 2027-01-29 · **Detail:** 🟡 Medium
**Roadmap:** `docs/17-Roadmap.md` M5 · **Risk:** 🟡 MEDIUM

> **This plan is the template for M7–M10.** Those four milestones are the same shape —
> harmonise assets, build a mechanic, build three levels, build a boss, polish — and their
> outline plans expand from this one.

---

## Goal

World 1 complete: levels 1-1 through 1-4, the Skeleton Warlord, and the first portfolio unlock hook.

**M5's real output is a measurement: how long does a world take?** Every remaining estimate
depends on it. Four weeks is the plan; if it takes six, Worlds 2–5 need 24 weeks instead of 16 and
Cut Line A becomes likely. This is the earliest reliable signal in the project.

---

## Preconditions

- [ ] M4 exit gate passed, `v0.4.0` tagged
- [ ] `level:test` and `level:validate` working
- [ ] 1-1 complete from M3
- [ ] Collectible and prop assets acquired (parallel track, ~10 h — check the Green Zone tileset
      first; platformer tilesets usually bundle crates, barrels, and chests, which may resolve
      the category at zero cost)

---

## Week 1 — Content foundation (~30 h)

| Task                      | Hours | Notes                                                                                                                                         |
| ------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **M5-T1** Skeleton Archer | 6     | `ranged` behaviour, LoS required, retreats below 56 px. JSON only                                                                             |
| **M5-T2** Skeleton Brute  | 4     | Elite reskin: 1.3× scale, poise 30, no shield, +6 damage. **Add a shoulder pauldron** — it must be silhouette-distinct from the base Skeleton |
| **M5-T3** Collectibles    | 8     | Coin (8-frame spin), heart shard, charm pickup, chest, breakable crate, checkpoint lantern                                                    |
| **M5-T4** Greybox 1-2     | 6     | 11 rooms, one-way platform teaching, Archer introduction                                                                                      |
| **M5-T5** Greybox 1-3     | 6     | 12 rooms, bounce caps, all three W1 mechanics combined                                                                                        |

**The three-mechanic rule:** 1-3 rooms 6 and 8 combine bounce caps with moving platforms and
one-way platforms. Two mechanics per room maximum (`docs/10-Level-Design.md` P6) — check each
room against it.

---

## Week 2 — Levels (~30 h)

| Task                                | Hours | Notes                                                                             |
| ----------------------------------- | ----- | --------------------------------------------------------------------------------- |
| **M5-T6** Art pass 1-2              | 8     | Decor, parallax, foreground occlusion                                             |
| **M5-T7** Art pass 1-3              | 8     |                                                                                   |
| **M5-T8** Populate 1-2              | 6     | Budget 12: Pair(2) + Screen(3) + Elevated(4) + Screen(3)                          |
| **M5-T9** Populate 1-3              | 6     | Budget 16: Gauntlet(3) + Pincer(4) + Mixed(5) + Gauntlet(3)                       |
| **M5-T10** Optional paths + secrets | 2     | 1-2 secret: heart shard. 1-3 optional: Featherfall charm. 1-3 secret: heart shard |

**Every optional path and secret pays out.** Nothing is a dead end.

**Watch a playtester find each secret.** Nobody finding it means the tell is too subtle; everybody
finding it means it is not a secret.

---

## Week 3 — Boss (~30 h)

| Task                              | Hours | Notes                                                                                                   |
| --------------------------------- | ----- | ------------------------------------------------------------------------------------------------------- |
| **M5-T11** Warlord asset          | 6     | Skeleton pack, elite-scaled, custom crown/cape. 96 frames                                               |
| **M5-T12** Arena 1-4              | 6     | 560 × 200, three platforms at 26/40/26 px, **no pits**, 600 px approach corridor with 2 Skeletons       |
| **M5-T13** Phase 1                | 6     | 4 attacks, 4 different answers: back away / jump / move sideways / destroy-or-dodge                     |
| **M5-T14** Phase 2 + transition   | 6     | Adds (max 4, resummon below 2), shortened windups, 5-projectile volley                                  |
| **M5-T15** Intro + death sequence | 6     | Skippable from 400 ms, auto-skip after first clear. Four death beats **including the 500 ms stillness** |

**The teaching structure of phase 1 is the point.** Great Cleave → back away. Ground Thrust →
jump. Overhead Crush → move sideways, unblockable. Bone Volley → move or destroy. Four attacks,
four answers, all clearly telegraphed. Build them in that order and test each in isolation.

**Phase 2 must change the question, not the volume** (`docs/09-Boss-System.md` P2). Adds are the
new problem — crowd management while dodging. The shortened windups are secondary.

---

## Week 4 — Polish and gate (~30 h)

| Task                           | Hours | Notes                                                                                                       |
| ------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------- |
| **M5-T16** Boss health bar     | 4     | **Chip bar draining over 400 ms** — without it a 78-damage combo against 420 HP feels like nothing happened |
| **M5-T17** Encounter tuning    | 8     | Playtest-driven. Fix levels, not enemies (`docs/08-Enemy-System.md` P4)                                     |
| **M5-T18** Pacing pass         | 4     | `check-pacing` plus a human read. No empty stretch over 160 px                                              |
| **M5-T19** Naive playtest      | 4     | The Pillar 4 targets: first jump ≤ 10 s, first kill ≤ 90 s, W1 completion ≥ 90%                             |
| **M5-T20** Perf + gate         | 6     | Minimum hardware through the boss fight                                                                     |
| **M5-T21** Content-rate report | 4     | **The milestone's real output**                                                                             |

---

## The content-rate report

| Activity                 | Estimated        | Actual |
| ------------------------ | ---------------- | ------ |
| Enemy variants (2)       | 10 h             |        |
| Collectibles/props       | 8 h              |        |
| Greybox (2 levels)       | 12 h             |        |
| Art pass (2 levels)      | 16 h             |        |
| Populate (2 levels)      | 12 h             |        |
| Boss (asset → death seq) | 30 h             |        |
| Polish + tuning          | 16 h             |        |
| **Total**                | **104 h ≈ 4 wk** |        |

Then re-forecast: `worldsRemaining × measuredRate` vs. weeks available
(`docs/17-Roadmap.md` §6.3). Record slack. If slack is negative by more than 2 weeks, flag Cut
Line A as likely at M7.

---

## Exit gate

- [ ] All four W1 levels pass `level:validate` (six checks)
- [ ] All four levels completable by all four heroes
- [ ] Every level has main path, optional path, secret, mini challenge, 3 checkpoints
- [ ] Moving platforms have all five teaching beats, beats 1–4 in 1-1
- [ ] Skeleton Warlord: 2 phases, skippable intro, 4-beat death, ≥1 unblockable per phase
- [ ] Boss retry from death to arena under 12 s
- [ ] Boss health bar shows chip damage over 400 ms
- [ ] Adds die when the boss dies
- [ ] W1 novice completion ≥ 90% (5 subjects, Assist off)
- [ ] Naive playtester: first jump ≤ 10 s, first kill ≤ 90 s
- [ ] 60 fps sustained through the boss on minimum hardware
- [ ] **Content-production rate measured and the plan re-forecast**

Then: tag `v0.5.0`, write the review, **expand `plans/M07-world-2/plan.md` to 🟡 Medium**.

---

## Risks

| Risk                                  | P   | Mitigation                                                                                   |
| ------------------------------------- | --- | -------------------------------------------------------------------------------------------- |
| **World takes > 4 weeks**             | Med | This is the measurement, not a failure. Re-forecast honestly; cut lines exist for it         |
| Boss takes longer than 30 h           | Med | First boss carries framework-shakedown cost. Bosses 2–5 should be faster; measure to confirm |
| 1-1 needs rework after seeing 1-2/1-3 | Med | Expected. Budget it in T17 rather than pretending 1-1 was finished in M3                     |
| Props not in the tileset              | Low | +10 h. Check in week 1, not week 3                                                           |
| Encounter difficulty wrong            | Med | Fix level geometry, not enemy stats. The 4-2 Orc corridor precedent                          |

---

## Explicitly not in M5

Menus, HUD beyond debug, save, progression, charms as a _system_ (the pickups exist; equipping is
M6), the Codex, any World 2 content, Assist Options.

**The Whetstone charm found in 1-1 does nothing until M6.** Picking it up shows a toast and
records it. That is correct and should not be "fixed" by building the charm system early.
