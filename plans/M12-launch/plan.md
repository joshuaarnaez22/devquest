# M12 — Launch

**Duration:** 2 weeks (~60 h) · **Dates:** 2027-07-26 → 2027-08-06 · **Detail:** 🟡 Medium
**Roadmap:** `docs/17-Roadmap.md` M12 · **Risk:** 🔴 CRITICAL — but low-variance

---

## Goal

Ship it.

Two weeks of verification and deployment. **No new features, no new content, no refactors.** If
something is not in the build at the start of M12, it is not in v1.0.0.

---

## Preconditions

- [ ] M11 exit gate passed, `v0.11.0` tagged
- [ ] Zero open P0 and P1
- [ ] A non-gamer has reached the credits

---

## Week 1 — Final QA (~30 h)

### M12-T1 — The full matrix · 12 h

**4 heroes × 3 browsers = 12 complete playthroughs.**

| Axis | Values |
|---|---|
| Hero | Knight, Samurai, Ninja, Wizard |
| Browser | Chrome, Firefox, Safari |
| Assist | Off (the base experience) |

Every playthrough is start-to-credits. Record every anomaly, however small.

Plus one Assist-on playthrough and one skip-valve playthrough (skip every boss, verify all five
sections still unlock).

---

### M12-T2 — Save verification · 6 h

The save is the one thing that can destroy a player's experience irrecoverably, so it gets
disproportionate attention.

| Test | Expected |
|---|---|
| Browser restart mid-run | Resumes at the last checkpoint |
| Tab close during combat | Deferred save flushed on `visibilitychange` |
| All historical schema versions | Migrate cleanly to current (fixture suite) |
| Corrupt-save injection (truncated, bad checksum, malformed JSON) | Renamed to `.corrupt.<ts>`, **never deleted**, recovery dialog offers the backup |
| `QuotaExceededError` injection | Prunes, retries, then surfaces an honest message |
| Three slots independently | No cross-contamination |
| Equipped charm not in `ownedCharms` | Silently unequipped on load |

---

### M12-T3 — Licence audit · 6 h

Every asset in the build traced to an archived licence in `licenses/<slug>/` with `LICENSE.txt`,
a store-page screenshot, and `download-record.json` including the sha256.

**Then external legal review of the completed manifest.** `docs/05-Asset-Pipeline.md` §15 is
explicit that the pipeline records the evidence and the procedure — it is not legal advice, and a
lawyer signs off before release.

---

### M12-T4 — Accessibility audit · 4 h

`/resume` against WCAG 2.2 AA with a real screen reader, not only the automated check. Keyboard-only
navigation of every game screen. Gamepad-only navigation of every game screen, including the Codex.

---

### M12-T5 — Content proofread · 2 h

Every string in the game. Portfolio copy especially — it is the developer's actual bio and a typo
there is worse than a typo anywhere else.

---

## Week 2 — Ship (~30 h)

### M12-T6 — Production build and deploy · 6 h

Build, verify bundle and payload sizes, deploy `dist/` and `/resume`. Confirm relative asset paths
work from the real origin.

**Deployment is a file upload.** No server, no migrations, no downtime — the architectural payoff
of ADR-009.

---

### M12-T7 — Post-deploy verification · 6 h

The full matrix again, **against production**, from a cold cache on a real connection. Load time,
first-boss-unlock time, `/resume` reachability, the title-screen link.

**The 12-minute target:** cold cache → first boss → About Me unlocked in under 12 minutes
(`docs/01-Vision.md` §7.5). Measure it with a stopwatch and a naive player.

---

### M12-T8 — Monitoring and hotfix readiness · 4 h

There is no telemetry (ADR-009), so "monitoring" means: a way for people to report bugs, a tested
hotfix path (branch → CI → deploy in under 30 minutes), and a rollback plan (redeploy the previous
tag).

---

### M12-T9 — Launch · 4 h

Announce. Post the link.

---

### M12-T10 — Documentation final pass · 6 h

- All 21 docs match the shipped product
- `plans/README.md` progress boxes all ticked
- `CLAUDE.md` status block updated to reflect a shipped product
- `docs/audits/` complete for all milestones
- Final ADR: **the project retrospective** — what the estimates got wrong, which risks materialised,
  what the cut lines actually cost. This is the single most useful artifact to hand a future project

---

### M12-T11 — Buffer · 4 h

Hotfix capacity for launch week.

---

## Exit gate — Definition of Done

From `docs/01-Vision.md` §7.5. This is the product's definition of done, not just the milestone's.

- [ ] Cold cache → first boss → About Me unlocked in **under 12 minutes**
- [ ] Sustained 60 fps on minimum hardware, no frame over 33 ms
- [ ] All four heroes complete all shipped worlds
- [ ] All five portfolio sections reachable and readable
- [ ] Save survives a browser restart, a version upgrade, and a corruption injection
- [ ] Full keyboard and gamepad parity everywhere, including the Codex
- [ ] Assist Options allow a non-gamer to reach the credits
- [ ] **Zero open P0 and P1 bugs**
- [ ] Every asset has a verified, archived licence, externally reviewed
- [ ] `/resume` live, linked from the title screen and the preloader
- [ ] All 21 documents updated to match the shipped product
- [ ] **`v1.0.0` tagged**

---

## Risks

| Risk | P | Mitigation |
|---|---|---|
| A browser-specific bug found in final QA | Med | CI has tested three browsers since M0. A surprise here is likely Safari-specific and probably a WebGL or audio-context issue |
| Licence problem found in legal review | Low | **Fatal if it happens.** Every pack has been archived since M3. If a pack fails, it must be replaced before launch — this is why the audit is week 1, not week 2 |
| Scope creep in the final two weeks | **Med** | Nothing new ships in M12. Park everything in `docs/20-Future-Ideas.md` |
| The 12-minute target missed | Low | It has been measurable since M6. If it fails now, it failed earlier and was not measured |
| Launch-day breakage | Low | Static files, tested rollback, sub-30-minute hotfix path |

---

## Explicitly not in M12

New features, new content, refactors, performance work beyond verification, the Steam port, audio
if it did not ship, and anything in `docs/20-Future-Ideas.md`.

**Post-launch begins after a two-week hotfix window** (`docs/17-Roadmap.md` §11). The ranked
backlog is Boss Rush → Time Trial → Audio (if unshipped) → Steam port.
