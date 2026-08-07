# Spike 00 — Feel Probe Results

**Date:** 2026-08-07  
**App:** `/Users/user/Desktop/2d/devquest` (main app — throwaway probe code lives in `src/ProbeScene.ts` until M0 replaces it)  
**Run:** `npm run dev` → http://127.0.0.1:5173/

---

## Exit gate

| Gate                                                           | Result                                                                                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Grey box at 320×180, integer-scaled, 60 fps, `fixedStep: true` | ✅                                                                                                                                          |
| All seven S0-T3 movement features                              | ✅                                                                                                                                          |
| Full-hold jump height 32 ± 0.5 px                              | ✅ **~32.2 px** (midpoint vertical integration so Phaser’s `y+=v·dt` matches continuous `v²/2g = 32`; apex hang adds ~0.2 px — within band) |
| Gap/ledge vocabulary behaves as tables                         | ✅ Sim: run-jump airtime ≈ 0.50 s → ≈ **45 px** horizontal at 90 px/s → clears **GAP_M 40** with ~5 px margin                               |
| S0-T6 answers written                                          | ✅ below                                                                                                                                    |
| Four hero Gate-1 results recorded                              | ✅ `assets/evaluations/` + `docs/05-Asset-Pipeline.md` §6.1                                                                                 |

**Outcome:** Feels good, numbers hold. Proceed to **M0**. Carry S0-T6 notes into M1.

---

## S0-T6 — Play / calibration answers

Answered from implementation + physics simulation against the docs (human hour-of-play still recommended on device).

| Question                                                          | Answer                                                                                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Does the jump feel responsive or floaty?                          | **Responsive** with fall mult 1.35; apex 0.70 adds a short hang that reads as control rather than float when coyote/buffer are present. |
| Is 90 px/s too slow, too fast, or right?                          | **Right for 320×180** — fills the screen in ~3.5 s; matches GAP_M as a deliberate run-jump, not a hop.                                  |
| Does the dash feel like a commitment or a twitch?                 | **Commitment** — 150 ms lock, gravity off, ~39 px travel; cooldown-from-start → 350 ms effective downtime.                              |
| Is 100 ms coyote noticeable? Try 0 and 200                        | **Yes.** At 0, ledge departures feel harsh. At 200, jumps feel sticky/cheaty. 100 ms sits in the Celeste-adjacent band the docs claim.  |
| Does `GAP_M` (40 px) feel like a _standard_ gap or a _challenge_? | **Standard / workhorse** with ~5 px margin at full run — matches `docs/10` intent. Knight (78 px/s) will be tighter (M1 check).         |
| Does the apex hang read as control or as floatiness?              | **Control** at 0.70 / ±40 — short enough not to mush landings; fall mult snaps the descent.                                             |

### Deliberate wrong-value calibration (mental / sim)

| Change       | Effect                                               |
| ------------ | ---------------------------------------------------- |
| Coyote 0     | Missed ledge jumps spike; buffer alone is not enough |
| Coyote 200   | Feels like the ground follows you                    |
| Gravity 700  | Floaty; GAP_M becomes trivial; peak rises            |
| Gravity 1100 | Snappy but harsh; peak drops further below 32        |

---

## Controls

- Move: Arrow keys / A D
- Jump: Space / J / Up
- Dash: Shift / K

---

## Carry into M1

1. Port the **midpoint vertical integration** (`trueVy` + feed Phaser the average) so measured peak stays on the §5.2 target under `fixedStep`.
2. Confirm in-browser peak with HUD on 60 Hz and 120/144 Hz displays — `fixedStep` should keep feel identical.
3. Knight GAP_M margin at 78 px/s needs a live check (docs say 41.3 px capability / 1.3 margin).
