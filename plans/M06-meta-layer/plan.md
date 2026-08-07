# M6 — Meta Layer

**Duration:** 4 weeks (~120 h) · **Dates:** 2027-02-01 → 2027-02-26 · **Detail:** 🟡 Medium
**Roadmap:** `docs/17-Roadmap.md` M6 · **Risk:** 🟡 MEDIUM — the GUI kit is unknown

---

## Goal

Everything around the game. At the end: start it, pick a hero, play World 1, beat the boss, earn
About Me, read it, quit, come back tomorrow, resume exactly where you were.

**This is the milestone where the game becomes a product.** It is also where the Deletion Test
becomes real for the first time.

---

## Preconditions

- [ ] M5 exit gate passed, `v0.5.0` tagged
- [ ] Content-rate re-forecast recorded
- [ ] Portfolio content drafted (the developer's actual bio, projects, experience, skills, contact)

---

## Week 1 — UI assets (~34 h) · **the risk**

`docs/05-Asset-Pipeline.md` §9.2 flags this: licensed GUI packs are typically ornamented fantasy
frames (scrollwork, filigree) which **conflict with the modern-pixel direction** in
`docs/04-Art-Direction.md` §9.1 — square corners, 1 px borders, no faux-3D bevel.

| Task | Hours | Notes |
|---|---|---|
| **M6-T1** Evaluate CraftPix GUI packs | 4 | Gate 1 on 2–3 candidates. Record rejections |
| **M6-T2** GUI kit | 20 | Likely custom. 9-slice panels, buttons ×3 states, sliders, toggles, scrollbars, tabs, focus ring, tooltip, boss bar frame |
| **M6-T3** Icons | 10 | ~28 at 16×16: coin, heart, shard, 8 charms, lock, check, arrow, device glyphs, **5 portfolio-section icons** (necessarily custom) |

**Plan for custom.** If a licensed pack fits, that is 10 hours back. If it does not, the estimate
holds. Do not spend a week hoping.

**Bitmap fonts** were authored in M0-T14/M3; verify all three weights (6/8/12 px) are complete
with a 96-glyph Latin set.

---

## Week 2 — UI framework (~30 h)

| Task | Hours | Notes |
|---|---|---|
| **M6-T4** Widget library | 10 | 13 widgets, four states each (`docs/13-UI-UX.md` §7.1–7.2) |
| **M6-T5** `FocusManager` | 6 | Explicit neighbours, geometric fallback, **no wrapping**, group nav, restoration. 400 ms initial repeat then 130 ms |
| **M6-T6** `UiBuilder` | 6 | JSON `MenuSpec` → widgets + focus graph. **A menu is a JSON file plus handler entries** |
| **M6-T7** Title + Character Select | 8 | Live hero idle animations on the cards, stat bars **derived from the character JSON**, "Recommended for your first run" on the Knight |

**The focus ring tweening over 80 ms between widgets** is the single highest-value UI polish
detail. It makes navigation feel physical and the direction of movement unmistakable.

**No wrapping.** Pressing ↓ at the bottom does nothing. Wrapping disorients.

---

## Week 3 — Save and progression (~30 h)

| Task | Hours | Notes |
|---|---|---|
| **M6-T8** `SaveSystem` | 10 | Schema v1, checksum, 3 slots, backup, **corrupt saves renamed not deleted**, quota handling with pruning |
| **M6-T9** Migration harness | 4 | The framework plus fixtures. **`check-migrations.ts` fails CI if a fixture is missing for any version** |
| **M6-T10** `ProgressionSystem` | 8 | Coins, shards, containers, unlocks, stats. **Derived stats recomputed on load, never persisted** |
| **M6-T11** Charms | 4 | All 10, exactly 3 slots, `CHARM_EFFECTS` as pure mutators |
| **M6-T12** World Select + panels | 4 | World map, level nodes, and Vendor / Charms / Stats / Hero as **overlay panels, not scenes** (ADR-016) |

**Two save details that are exit-gate items:**

- **Derived stats are never persisted.** Storing `maxHp` means a charm rebalance in a patch does
  not apply to existing saves. Recompute from source on every load.
- **Saves never occur during combat.** A 6 KB `localStorage` write is 0.3–2 ms and spikes a frame.
  Defer to the next non-combat frame; `critical` reasons (boss defeat, unlock) bypass.

---

## Week 4 — Portfolio and HUD (~30 h)

| Task | Hours | Notes |
|---|---|---|
| **M6-T13** HUD | 6 | Reserved 20 px top / 12 px bottom bands. Hearts, resource, ability pips, charms, coins, shards. **Bus-only communication — `UIScene` holds no entity reference** |
| **M6-T14** Pause + Settings | 6 | 4 settings tabs, full remapping with conflict detection, apply-immediately |
| **M6-T15** `PortfolioSystem` | 4 | Subscribes to `boss:defeated`. **Idempotent.** Saves *before* launching the ceremony |
| **M6-T16** `UnlockScene` | 4 | 4 beats, skippable from 400 ms, **skip jumps to beat 4 rather than dismissing**, never auto-dismisses |
| **M6-T17** `CodexScene` | 6 | Tabs with lock states, rich-text parser (4 inline markers), cached layout, 52 chars/line, link confirmation panel |
| **M6-T18** `/resume` + Deletion Test | 4 | Build script from the same JSON. ≤ 40 KB, **zero JS**, WCAG 2.2 AA. Then run the Deletion Test properly |

---

## The Deletion Test (M6-T18) — the milestone's most important 2 hours

First real run (`docs/12-Portfolio-System.md` §5.1):

```bash
git checkout -b deletion-test-m6
rm -rf src/portfolio/ src/scenes/CodexScene.ts src/scenes/UnlockScene.ts
rm -rf public/assets/data/portfolio/
# remove 4 touch points: SYSTEM_ORDER, Services registration, 3 menu entries, SaveData.portfolio
npm run typecheck && npm run build && npm run test:e2e
```

**Pass:** builds, runs, World 1 completable.
**Target: under 2 hours to execute.** If it takes longer, the portfolio has grown roots and
pruning them is the next task, not a later one.

Record the result and the elapsed time in `docs/audits/deletion-test-m6.md`.

---

## Exit gate

- [ ] Every screen in `docs/13-UI-UX.md` §4.1 exists and is fully keyboard + gamepad navigable
- [ ] Every menu built from a JSON `MenuSpec`
- [ ] Full input remapping with live conflict detection
- [ ] Glyphs match the active device and switch within one frame
- [ ] `this.add.text` appears nowhere in `src/`
- [ ] Focus never wraps, never lands on a disabled widget, always visible
- [ ] Save round-trips through a browser restart
- [ ] Corrupt-save injection produces the recovery dialog, never data loss
- [ ] A migration fixture exists for every schema version
- [ ] Derived stats recomputed on load, never persisted
- [ ] Saves deferred out of combat
- [ ] All 10 charms implemented; exactly 3 slots
- [ ] `UIScene` holds no entity references
- [ ] Every scene calls `bus.offAllFor(this)` in `shutdown`
- [ ] Unlock is idempotent and saved before the ceremony launches
- [ ] Ceremony ≤ 4 s, skippable from 400 ms, never auto-dismisses
- [ ] **Deletion Test passes in under 2 hours**
- [ ] `/resume` deployed, ≤ 40 KB, zero JS, automated WCAG 2.2 AA pass
- [ ] `/resume` linked from the title screen **and the preloader**
- [ ] `check-cutlines.ts` passes at all three cut lines
- [ ] Time to interactive ≤ 8 s throttled

Then: tag `v0.6.0`, write the review, **expand `plans/M08-world-3/plan.md` to 🟡 Medium**.

---

## Risks

| Risk | P | Mitigation |
|---|---|---|
| **GUI kit needs full custom authoring** | 🟠 Med-High | 20 h budgeted. If it runs to 30, compress T7 (Character Select polish) and finish it in M7 |
| Deletion Test reveals coupling | Med | Fix immediately. It only gets worse |
| Save schema wrong, needs a migration in M7 | Med | Fine — that is what the migration harness is for. **Do not delay M6 trying to design the final schema** |
| Codex text rendering at 6 px unreadable | Low | Test with real portfolio copy in week 1, not week 4 |
| Portfolio content not written | **Med** | It is the developer's own bio. Draft it in the M5 gap, not M6 week 4 |

---

## Explicitly not in M6

World 2 content, Assist Options (M11), audio, Time Trial, achievements, cloud saves.

**Assist Options are M11, deliberately.** They need the full difficulty curve to exist before they
can be tuned, and M6 has enough surface already.
