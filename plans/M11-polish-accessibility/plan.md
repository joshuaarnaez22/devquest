# M11 — Polish & Accessibility

**Duration:** 3 weeks (~90 h) · **Dates:** 2027-07-05 → 2027-07-23 · **Detail:** 🟡 Medium
**Roadmap:** `docs/17-Roadmap.md` M11 · **Risk:** 🔴 **CRITICAL**

---

## Goal

**A game a non-gamer can finish.**

`docs/01-Vision.md` §7.5 defines "done" partly as "Assist Options allow a non-gamer to reach the
credits." That is not a stretch goal or a nice-to-have — it is a P0 shipping requirement, because
the primary audience is a recruiter who may not play games and who must still reach the portfolio
content.

Three weeks is tight. It works only because the 20% polish reserve in every prior milestone means
polish has been continuous; M11 is the final pass, not the only one.

---

## Preconditions

- [ ] M10 exit gate passed, `v0.10.0` tagged, content complete
- [ ] Or: a cut line invoked, and the shipped worlds are complete

---

## Week 1 — Accessibility (~30 h)

### M11-T1 — Assist Options · 12 h

All seven from `docs/13-UI-UX.md` §11.1. Reachable from Pause in **one press**.

| Option           | Values                                                    |
| ---------------- | --------------------------------------------------------- |
| Damage taken     | 100 / 75 / 50 / 25 / 0%                                   |
| Extended windows | Coyote 100→150, buffer 120→180, parry 200→333, combo +50% |
| Slow motion      | 100 / 90 / 75 / 60% global time scale                     |
| Infinite dash    | Removes the cooldown                                      |
| Auto-retry       | Skips the Game Over screen                                |
| Combat speed     | Outgoing damage 100 / 75 / 50%                            |
| Skip boss fight  | Contextual, after 3 deaths                                |

**What Assist never changes:** boss patterns, telegraph durations, level geometry, gap widths, or
portfolio content. The game stays the game; the margin for error grows.

**Language is a hard requirement.** Neutral throughout. No "easy mode," no "casual," no warnings,
no achievement penalties, no watermark on the save. `docs/13-UI-UX.md` P4.

---

### M11-T2 — Boss skip valve · 4 h

After 3 deaths on the same boss, **"Skip this fight"** appears in the pause menu above "Restart
Level". Fires the death sequence and the portfolio unlock **normally**. Records a `skippedBosses`
entry used only for a small informational Codex marker that disappears if the boss is later beaten.

**This is the single most important accessibility feature in the game.** A recruiter who cannot
beat the Alpha Werewolf must still read Projects.

---

### M11-T3 — Visual accessibility · 8 h

Reduced Motion (disables shake, screen flashes, vignette, focus-ring crawl — **keeps hit stop,
hit flash, and world-space VFX, which are information not decoration**), independent screen-shake
slider, flash intensity, high-contrast HUD, **enemy outline**, **hazard outline**, larger text,
damage-number toggle.

**I-frame flicker becomes a steady 0.7 alpha under Reduced Motion** — rapid alpha oscillation is a
photosensitivity concern and the steady value conveys the same information.

**Enemy and hazard outlines are a significant help in Worlds 3–5** and cost one duplicated tinted
sprite each.

**No colourblind mode exists** because none is needed — the value-first principle
(`docs/04-Art-Direction.md` P3) means nothing relies on hue, verified by the automated greyscale
check.

---

### M11-T4 — Input accessibility · 6 h

Hold-vs-toggle for Guard and Charge, menu repeat rate, stick deadzone, vibration.

**Verify the standing claim:** no timed input sequences, QTEs, double-taps, or button combos exist
anywhere in the game. This eliminates the largest category of motor-accessibility barriers by
design rather than by option — but it must be checked, not assumed.

---

## Week 2 — Performance (~30 h)

### M11-T5 — Minimum-hardware verification · 10 h

The full procedure from `docs/15-Performance.md` §9.4, per world, on the real 2019 MacBook Air:
fresh profile, full playthrough, overlay on, record every frame over 16.67 ms with its cause.

**Then repeat with 20 background Chrome tabs open.** This is not a joke — the target user has a
browser full of tabs, and a game that holds 60 fps in isolation and 42 in reality has failed.

Archive in `docs/audits/perf-M11.md`.

---

### M11-T6 — Degradation ladder + watchdog · 10 h

All seven tiers (`docs/15-Performance.md` §12.2), each individually testable. `PerfWatchdog`
sampling a 5 s rolling window, stepping down above p95 > 20 ms and back up below 12 ms after 30 s
stable.

The one-time notice at tier ≥ 3, and Settings → Video → Performance mode (Auto / Full / Reduced).

**Tier 7 drops to a 30 fps target.** A stable 30 is far more playable than an unstable 45, and
because physics is fixed-step at 60 Hz, gameplay timing is unaffected.

---

### M11-T7 — Boss-fight perf verification · 6 h

Each of the five bosses at its peak phase, measured individually against
`docs/15-Performance.md` §11.1. The Gorgon phase 4 and the Oni Lord phase 3 are the two at risk.

---

### M11-T8 — Load-time verification · 4 h

Time to interactive ≤ 8 s on a throttled 25 Mbit / 40 ms connection, cold cache, measured in CI
and by hand.

---

## Week 3 — Bugs and gate (~30 h)

### M11-T9 — P0/P1 burn-down · 16 h

**Zero open P0 and P1 is a shipping requirement**, not a target. If the count is not trending to
zero by mid-week, cut P2 work rather than extending.

---

### M11-T10 — The non-gamer playtest · 6 h · **the milestone's defining test**

Someone who does not play games. Assist Options available and explained once, neutrally.

**Success condition: they reach the credits.**

If they cannot, the fix is an Assist Option or the skip valve — never a difficulty reduction to
the base game. The base game stays as tuned for the tertiary audience.

Record where they struggled. That list is the post-launch tuning backlog.

---

### M11-T11 — Final Deletion Test · 2 h

The last scheduled run. Under 2 hours to execute, and the game builds, runs, and completes without
the portfolio layer.

---

### M11-T12 — Full pillar audit · 4 h

All five pillars, every falsification test, plus the two audit lists:

- **Features serving no pillar** — must be empty
- **Features rejected by pillar citation** — must be non-empty, or the pillars were decorative

---

### M11-T13 — Doc sync · 2 h

Every one of the 21 docs updated to match the shipped product. `npm run docs:check` green.

---

## Exit gate

- [ ] Every Assist Option implemented, reachable from Pause in one press
- [ ] Assist uses neutral language everywhere; no "easy mode" framing anywhere
- [ ] Assist carries no penalty of any kind
- [ ] The 3-death skip valve works and fires the unlock normally
- [ ] Reduced Motion disables shake/flash/vignette, preserves hit stop and hit flash
- [ ] I-frame flicker replaced by steady alpha under Reduced Motion
- [ ] Enemy and hazard outline options work
- [ ] **No timed input sequences, QTEs, double-taps, or combos exist** (verified)
- [ ] **A non-gamer playtester reaches the credits with Assist enabled**
- [ ] p99 frame time ≤ 16.67 ms on minimum hardware, every world
- [ ] Minimum-hardware verification includes the 20-tabs scenario
- [ ] All five bosses measured at peak phase, all within budget
- [ ] Degradation ladder implemented, each tier individually testable
- [ ] Watchdog steps down and back up correctly under synthetic load
- [ ] Time to interactive ≤ 8 s throttled
- [ ] **Zero open P0 and P1 bugs**
- [ ] Deletion Test passes in under 2 hours
- [ ] All five pillar audits pass; `featuresServingNoPillar` empty
- [ ] All 21 docs match the shipped product

Then: tag `v0.11.0`, write the review.

---

## Risks

| Risk                                 | P   | Mitigation                                                                                                                                                              |
| ------------------------------------ | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Three weeks is not enough**        | Med | The 20% reserve in every prior milestone means this is a final pass, not a first one. If it is genuinely a first pass, that is a prior-milestone failure surfacing late |
| Non-gamer playtest fails             | Med | Fix via Assist, never by nerfing the base game. Have a second tester lined up                                                                                           |
| Perf problems found late             | Low | CI has gated frame time since M2. A surprise here means the gates were too loose                                                                                        |
| Assist framing drifts to "easy mode" | Med | Review every string. It is the difference between a feature people use and one they avoid                                                                               |
| P1 count does not reach zero         | Med | Cut P2 work. Do not ship with open P1                                                                                                                                   |
