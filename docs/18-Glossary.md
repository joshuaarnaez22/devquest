# 18 — Glossary

**Project:** DevQuest (Working Title)
**Document Owner:** Technical Director
**Status:** 🔄 Living — append freely
**Version:** 1.0.0
**Last Updated:** 2026-08-07

---

## 1. Purpose

This document defines every term used with a specific meaning in the DevQuest documentation and codebase.

Its practical value is narrow and real: it makes `grep` work. A codebase where one developer writes "enemy," another writes "monster," and a third writes "mob" is a codebase where searching for anything returns two-thirds of the results. The vocabulary here is the one used in code identifiers, content JSON, commit messages, issue titles, and documentation prose — consistently, without synonyms.

Where a term has a common industry meaning that differs from ours, both are given and the difference is stated.

---

## 2. Goals

| # | Goal | Success Signal |
|---|------|----------------|
| G1 | One term per concept, used everywhere | `grep -r "monster" src/` returns nothing |
| G2 | Disambiguate terms with conflicting industry meanings | Nobody assumes "component" means an ECS component |
| G3 | Give every term a document reference | A definition is a pointer to the full specification |
| G4 | Cover project-specific coinages | "Deletion Test" and "cut line" are defined once |
| G5 | Make onboarding faster | A new contributor reads this in ten minutes |

---

## 3. Design Principles

### P1 — One Term, One Concept
Synonyms are banned. If two words could describe the same thing, one is chosen and the other is not used.

### P2 — Define by Use, Not by Dictionary
"Poise" is defined by what it does in DevQuest, not by what it means generally.

### P3 — Point to the Specification
A glossary entry is a summary plus a reference. It never duplicates a full specification.

### P4 — Record Rejected Synonyms
Naming what we *do not* say is as useful as naming what we do. It makes review comments faster and greps reliable.

---

## 4. Overview — Conventions

| Notation | Meaning |
|---|---|
| **Bold** | The canonical term |
| *Italic* | A rejected synonym — do not use |
| `code` | An exact identifier as it appears in source |
| → | "See also" |
| §Doc | The document owning the full specification |

**How to add a term:** append it to the correct section in alphabetical order, give it a one-paragraph definition, list rejected synonyms, and cite the owning document. No review required — this is a living document.

---

## 5. Technical Design — Core Game Concepts

### **Ability**
A hero's unique verb, implemented as a module satisfying the `Ability` interface. Each of the four heroes has exactly one: Knight's Guard, Samurai's Iai Slash, Ninja's Shadow Step, Wizard's Arcane Nova. An ability is what makes a hero mechanically distinct, as opposed to statistically distinct.
*Rejected: skill, power, special move, ultimate.* → §`06-Characters.md` §9.1

### **Active frames**
The window during which an attack's hitbox is enabled, measured in milliseconds as `activeMs`. Distinct from the animation's frame count — the hitbox is time-scheduled, not frame-driven.
→ §`07-Combat.md` §5.1, §`14-Animation-Standards.md` §7

### **Adds**
Enemies summoned by a boss during a fight. Always `basic` tier, capped at 4 alive, and killed automatically when the boss dies.
*Rejected: minions, spawns, summons (as a noun).* → §`09-Boss-System.md` §6.5

### **Ambient tint**
A full-screen `MULTIPLY`-blended quad applied above background layers and below the midground, giving each world its time-of-day and mood. Never affects the HUD.
→ §`04-Art-Direction.md` §6.3

### **Apex hang**
The reduction of gravity to 0.70× while vertical speed is within ±40 px/s, extending the top of a jump arc by roughly 50 ms. The window in which players make their aim adjustment.
*Rejected: float, hover, air time.* → §`06-Characters.md` §5.1

### **Arena**
The gated, camera-locked space in which a boss fight occurs. Purpose-built per boss, always preceded by an approach corridor and a checkpoint.
→ §`09-Boss-System.md` §5.5

### **Assist Options**
Player-facing settings that reduce difficulty without altering the game's structure: damage scaling, extended input windows, slow motion, infinite dash, auto-retry, and the boss skip valve. Presented neutrally, carrying no penalty of any kind.
*Rejected: easy mode, casual mode, difficulty settings.* → §`13-UI-UX.md` §11.1

### **Atlas**
A packed texture containing many sprite frames, plus a JSON frame map. DevQuest uses seven: `core`, `chars`, and `enemies-w1` through `enemies-w5`.
*Rejected: spritesheet (which we reserve for a single un-atlased strip), texture page.* → §`05-Asset-Pipeline.md` §7.3

### **Behaviour**
A composable enemy AI module implementing the `Behaviour` interface — `patrol`, `chase`, `melee`, `leap`, `teleport`, and nine others. Behaviours are singletons; per-enemy state lives in a context record. An enemy's identity is the combination of behaviours its definition lists.
*Rejected: AI, brain, strategy, state (which means an FSM state).* → §`08-Enemy-System.md` §5.3

### **Charm**
An equippable modifier. Ten exist; three can be equipped at once. The only build customisation in the game, and deliberately capped at ±15% on any core stat.
*Rejected: item, relic, trinket, accessory, perk.* → §`11-Progression.md` §7

### **Checkpoint**
A position in a level that, on contact, saves the run state — position, HP, resource, collected pickups, killed spawn points, and mechanic state. Three per level plus the exit.
→ §`10-Level-Design.md` §12.2

### **Codex**
The in-game UI presenting the developer's portfolio. Five sections, unlocked one per boss. The whole portfolio layer is designed so that deleting it leaves a complete game.
*Rejected: portfolio menu, resume screen, gallery, journal.* → §`12-Portfolio-System.md` §8

### **Combo window**
The period after an attack's active frames during which pressing attack again advances to the next combo step. Per-attack, 220–350 ms.
→ §`06-Characters.md` §7

### **Contact damage**
Damage dealt by walking into an enemy's body, distinct from its attacks. Has a 900 ms per-victim cooldown.
→ §`07-Combat.md` §7.4

### **Coyote time**
A 100 ms window after leaving a ledge during which a jump input still produces a full ground jump. Stored as an absolute expiry timestamp, never a countdown.
*Rejected: ledge forgiveness, grace jump.* → §`06-Characters.md` §5.3

### **Cut line**
A pre-planned scope reduction with a date, named trigger signals, and thresholds. Cut Line A (drop Worlds 4 and 5) is decided at M7; Cut Line B (drop World 5) at M9. Cut lines never orphan a portfolio section.
*Rejected: descope, scope cut (as a plan; fine as a verb).* → §`01-Vision.md` §7.4, §`17-Roadmap.md` §8

### **Deletion Test**
The engineering procedure that proves the portfolio layer is decoupled: delete `src/portfolio/`, `CodexScene`, `UnlockScene`, and the portfolio content, remove four touch points, and verify the game still builds, runs, and can be completed. Run at M3, M6, M9, and M11. Target: under two hours to execute.
→ §`01-Vision.md` §4.4, §`12-Portfolio-System.md` §5

### **Definition**
Immutable JSON-authored data describing an entity type: `EnemyDefinition`, `BossDefinition`, `CharacterDefinition`, `LevelDefinition`. Loaded and validated at boot, never mutated.
*Rejected: config, template, blueprint, archetype, prefab.* → §`03-Technical-Architecture.md` §5.2

### **Elite**
The third and strongest enemy tier: ×2.4 HP, ×1.5 damage, two extra behaviours, and a 1 px emissive rim light in the world's accent colour. → **Tier**
→ §`08-Enemy-System.md` §4.2

### **Extension frame**
The single animation frame at which a weapon reaches maximum extent. Must fall inside the attack's active window; ideally on its first frame.
→ §`14-Animation-Standards.md` §7.3

### **Flinch**
The minor reaction to a hit that does not break poise: two frames of `hurt`, 35% knockback, and no interruption of the enemy's AI. Distinct from **stagger**.
→ §`07-Combat.md` §8.3

### **Ground indicator**
A shape drawn on the ground plane during a boss attack's windup — cone, circle, rectangle, or line — whose opacity fills from 0% to 100% over the windup, doubling as a timing cue. All indicators share one `Graphics` object and therefore one draw call.
*Rejected: telegraph marker, AOE indicator, danger zone.* → §`09-Boss-System.md` §10.2

### **Hitbox**
The rectangle that deals damage. Enabled only during an attack's active frames. Player hitboxes are 3 px more generous than the visual on the leading edge.
*Rejected: attack box, damage box.* → §`07-Combat.md` §5

### **Hit stop**
Freezing the attacker and victim for 40–140 ms on contact while the rest of the world — VFX, particles, camera shake, parallax — continues at full speed. The load-bearing layer of the combat feel. Longest-wins, never additive. Input is buffered, never dropped.
*Rejected: hitlag, freeze frame, impact pause.* → §`07-Combat.md` §6.2

### **Hurtbox**
The rectangle that can receive damage. Player hurtboxes are 2 px smaller than the visual per side; enemy hurtboxes are 2 px larger.
*Rejected: collision box, body (which means the Arcade physics body).* → §`07-Combat.md` §5

### **Jump buffer**
A 120 ms window before landing during which a jump input is stored and fires on the frame the player becomes grounded.
*Rejected: input buffer (too broad), pre-jump.* → §`06-Characters.md` §5.3

### **Mechanic**
A world-specific interactive system implemented as a `MechanicPlugin`: moving platforms (W1), wind zones (W2), lantern light (W3), light beams (W4), timed gates (W5). Each world introduces exactly one primary mechanic and two supporting ones, never reused in a later world except in World 5's synthesis.
*Rejected: gimmick, feature, system (which means a per-frame subsystem).* → §`10-Level-Design.md` §7

### **Petrify**
The Gorgon's gaze effect: a movement and jump-height reduction applied while inside a cone. It is **not damage** — it does not trigger i-frames, is not blocked by Guard, and is not avoided by dash i-frames. The only answer is position.
→ §`08-Enemy-System.md` §6.7.4

### **Poise**
Stagger resistance, modelled as a depleting pool that fully regenerates after a quiet period. Breaking poise produces a full stagger; an intact pool produces a flinch. The primary mechanism by which enemy weight is communicated.
*Rejected: stability, balance, super armour, stagger resistance (as a noun).* → §`07-Combat.md` §8

### **Presentation clip**
An animation representing a zero-duration state (`land`, `air_jump`, `guard_parry`) that is allowed to finish playing after the FSM has already moved on. It never blocks a transition — the player is fully controllable while it draws.
→ §`14-Animation-Standards.md` §12.2

### **Recover / recovery**
The window after an attack's active frames during which the attacker cannot act. The player's punish window against an enemy, and the enemy's fairness contract.
*Rejected: cooldown (which means the gap between uses), endlag.* → §`08-Enemy-System.md` §5.2

### **Rim light**
The elite-enemy marker: a duplicated sprite one pixel larger, tinted the world's accent colour at 55% alpha, drawn behind the enemy.
→ §`08-Enemy-System.md` §4.2, §`14-Animation-Standards.md` §8.5

### **Secret**
A hidden room, one per non-boss level, with no signposting beyond a subtle visual tell. Contains the level's best reward. Fifteen exist.
→ §`10-Level-Design.md` §4.3

### **Shard** / **Heart shard**
A collectible; four combine into one health container (+12% max HP). Seventeen exist in levels; four more are purchasable, capped.
*Rejected: heart piece, health fragment.* → §`11-Progression.md` §5.3

### **Skip valve**
The pause-menu option to skip a boss fight, appearing after three deaths on the same boss. Fires the portfolio unlock normally and carries no penalty. The mechanism that guarantees the primary audience reaches the portfolio content.
*Rejected: boss skip (fine informally), easy out.* → §`09-Boss-System.md` §11.3

### **Stagger**
The full reaction to a poise-breaking hit: the AI is suspended for 180–900 ms, full knockback applies, and a distinct particle burst fires. Distinct from **flinch**. Bosses defer stagger until an in-progress attack completes.
*Rejected: stun (reserved for specific scripted effects like the Orc's wall-slam), knockdown.* → §`07-Combat.md` §8

### **Teaching beat**
One of the five stages through which every new mechanic is introduced: SAFE, GATED, HAZARD, COMBINED, MASTERY. Beats 1–4 appear in the world's first level.
*Rejected: tutorial step, introduction phase.* → §`02-Game-Pillars.md` §5.5.4, §`10-Level-Design.md` §6

### **Telegraph**
The visual and temporal warning preceding an attack: a minimum 250 ms windup (400 ms for bosses), a distinct silhouette-readable pose, an S0 flash for unblockable attacks, and self-illumination in dark environments.
*Rejected: tell (fine informally), warning, wind-up (which is the timing, not the communication).* → §`08-Enemy-System.md` §7

### **Tier**
An enemy's power level: `basic`, `veteran`, or `elite`. Tiers are pure JSON multipliers plus extra behaviours; they require no new code and no new art beyond a recolour.
→ §`08-Enemy-System.md` §4.2

### **Trauma**
The camera-shake model: a 0–1 accumulator, applied quadratically, decaying at 1.6/s, clamped at 1.0. Prevents simultaneous hits from summing into nausea.
*Rejected: shake amount, screen shake intensity.* → §`07-Combat.md` §6.6

### **Unblockable**
An attack that ignores the Knight's Guard and the Wizard's Barrier. Marked with an S0 flash on the second windup frame. Always dodgeable by every hero — "unblockable" means "you must move," not "you must lose HP."
→ §`09-Boss-System.md` §6.2

### **Windup**
The period between an attack's initiation and its active frames, during which the hitbox is inactive. The telegraph's duration.
*Rejected: charge (reserved for chargeable abilities), startup.* → §`07-Combat.md` §5

---

## 6. Architecture — Technical Terms

### **Behaviour context**
The per-frame record passed to a behaviour, carrying the enemy, the player, timing, the event bus, the RNG, and a mutable per-instance state object. The mechanism that allows behaviours to be singletons.
→ §`08-Enemy-System.md` §5.3

### **Branded type**
A nominal type built from a primitive plus a phantom symbol, preventing a `LevelId` being passed where an `EnemyDefId` is expected. Constructed only through validated factories.
→ §`16-Coding-Standards.md` §5.4

### **Component**
A reusable piece of entity state and behaviour: `Health`, `Poise`, `Hurtbox`, `Hitbox`, `Facing`, `GroundSensor`, `LedgeSensor`, `VisionCone`, `Knockback`.
**Note the industry ambiguity:** these are **not** ECS components. There is no entity-component-system in DevQuest. A component here is an ordinary object owned by an entity, with methods.
*Rejected: module, part, aspect.* → §`03-Technical-Architecture.md` §5.1

### **Content database**
The single boot-time-constructed, frozen index of all JSON content, with typed accessors and full schema validation.
→ §`03-Technical-Architecture.md` §15

### **Cut** (verb)
To remove planned scope. Distinct from **cut line**, which is a planned decision point.

### **Degradation ladder**
The seven-tier sequence of visual reductions applied automatically when the frame rate cannot be sustained, ending at a 30 fps target. Announced to the player once.
→ §`15-Performance.md` §12.2

### **Derived stats**
Player values computed fresh from base character data, health containers, and equipped charms. **Never persisted** — recomputing on load means balance patches apply to existing saves.
→ §`11-Progression.md` §10.1

### **Entity**
A pooled game object with a physics body: `Player`, `Enemy`, `Boss`, `Projectile`, `Pickup`, `Hazard`, `Platform`. Extends a thin `Entity` base class.
*Rejected: actor, object, GameObject (which means the Phaser class), thing.* → §`03-Technical-Architecture.md` §5.1

### **Event bus**
The single global typed `EventEmitter` wrapper through which systems communicate. Events are notifications of fact, never commands. Every listener has a matching removal in scene `shutdown`.
→ §`03-Technical-Architecture.md` §5.4

### **Frame manifest**
The JSON emitted by the Aseprite export script, describing an entity's frame size, pivot, and animation tags.
→ §`05-Asset-Pipeline.md` §12

### **Gate** (CI)
An automated check that fails a pull request. Distinct from **milestone gate**, which is the manual close procedure.

### **Harmonisation**
The set of operations that make a licensed asset pack conform to the Style Bible: palette remapping, outline addition, anti-alias removal, downscaling, desaturation, frame normalisation, and authoring missing animations. Estimated at 79 hours across all locked packs.
*Rejected: cleanup, conversion, processing.* → §`04-Art-Direction.md` §8

### **Input frame**
The immutable snapshot of all input state, rebuilt once per frame by `InputSystem` and consumed by everything. The single source of input truth.
→ §`13-UI-UX.md` §5.2

### **Milestone gate**
The four-hour manual procedure closing each milestone: automated gates, Pillar Audit, minimum-hardware pass, external playtest, Deletion Test (at four milestones), and the exit-gate checklist.
→ §`17-Roadmap.md` §6.1

### **Object pool**
A pre-allocated set of reusable objects. Everything created more than once per second comes from one. On reaching a cap, the oldest live object is recycled rather than allocating — a missing particle is invisible; a GC pause is not.
→ §`03-Technical-Architecture.md` §10.1

### **Pillar**
One of the five decision-making instruments: Responsive Controls, Satisfying Combat, Visual Polish, Simple to Learn, Every World Introduces Something New. Each has numeric targets and falsification tests. Precedence order resolves conflicts.
→ §`02-Game-Pillars.md`

### **Pillar Audit**
The one-hour procedure run at every milestone close: run every falsification test, run the automated targets, conduct one naive playtest, and record both features serving no pillar (should be empty) and features rejected by pillar citation (should not be).
→ §`02-Game-Pillars.md` §6.2

### **Pivot**
The reference point of a sprite, always `(width / 2, height − 2)` — bottom-centre, two pixels above the sprite's bottom edge. Uniform across every entity, which is what makes swapping a differently-sized sprite safe.
→ §`05-Asset-Pipeline.md` §5.4

### **Signal ramp**
The six palette colours reserved exclusively for gameplay communication: hostile (S0), damage (S1), heal (S2), collectible (S3), interactive (S4), portfolio (S5). No environment or background asset may use them.
→ §`04-Art-Direction.md` §6.2

### **Snapshot**
A `Readonly<T>` view of an entity's state passed to an animator or UI. Read-only by construction, which is how the animation-is-a-projection rule is enforced.
→ §`14-Animation-Standards.md` §11.2

### **Staggered update**
Spreading a periodic cost across frames by keying on entity id — `(frameCount + id) % 6 === 0`. Used for enemy vision raycasts, reducing AI cost by 78%.
**Note:** unrelated to **stagger** (the combat reaction). The collision is unfortunate but both terms are standard.
→ §`15-Performance.md` §8.2

### **Style Bible**
The measurable, checkable properties every asset must satisfy: pixel density, scale, outline convention, lighting direction, palette conformance, silhouette distinctness.
→ §`04-Art-Direction.md` §5

### **System**
A per-frame subsystem registered in `SYSTEM_ORDER` and satisfying the `System` interface. Seventeen exist.
*Rejected: manager, service, controller, handler.* → §`03-Technical-Architecture.md` §8

### **Touch point**
One of the four places where the portfolio layer connects to the rest of the codebase. The Deletion Test removes all four.
→ §`12-Portfolio-System.md` §4.2

---

## 7. Data Structures — Content Identifiers

Formats used across content JSON, Tiled properties, and code.

| Kind | Format | Examples |
|---|---|---|
| World | `w<n>` | `w1`, `w5` |
| Level | `w<n>-<m>` | `w1-1`, `w5-4` |
| Character | `snake_case` | `knight`, `samurai` |
| Enemy definition | `<family>_<tier>` | `skeleton_basic`, `orc_elite` |
| Enemy variant | `<family>_<variant>` | `skeleton_archer` |
| Boss definition | `snake_case` | `skeleton_warlord`, `golem_sovereign` |
| Behaviour | `camelCase` | `patrol`, `groundSlam` |
| Ability | `<hero>_<name>` | `knight_guard`, `wizard_nova` |
| Charm | `snake_case` | `whetstone`, `featherfall` |
| Mechanic | `camelCase` | `windZone`, `lightBeam` |
| Attack | `snake_case` | `great_cleave`, `petrify_gaze` |
| Animation key | `<entityKey>_<animName>` | `knight_attack1`, `gorgon_p2_tail_sweep` |
| Checkpoint | `<levelId>_cp<n>` | `w2-1_cp1` |
| Secret | `<levelId>_secret<n>` | `w3-2_secret1` |
| Portfolio section | `camelCase` | `about`, `projects`, `experience`, `skills`, `contact` |
| Event | `domain:verbPast` | `combat:hit`, `boss:defeated` |
| ADR | `ADR-<nnn>` | `ADR-001`, `ADR-022` |
| Milestone | `M<n>` | `M0`, `M12` |

---

## 8. Rejected Vocabulary

Terms that appear in comparable projects and are **not** used here. Listed so a reviewer can point at this section instead of explaining.

| Do Not Use | Use Instead | Why |
|---|---|---|
| *monster*, *mob*, *creature* | **enemy** | One word, greppable |
| *manager*, *service*, *handler* | **system**, or a precise name | Says nothing about behaviour |
| *config* (for content) | **definition** | `config` means engine configuration |
| *prefab*, *template*, *blueprint* | **definition** | Unity/Unreal vocabulary; we are neither |
| *component* (in the ECS sense) | **component** (our sense) | We have components, not ECS components. See §6 |
| *skill*, *power*, *ultimate* | **ability** | RPG vocabulary we are avoiding |
| *item*, *relic*, *trinket* | **charm** | One word |
| *stats* (for player growth) | **derived stats**, or the specific value | "Stats" implies an RPG |
| *level* (for character progression) | — | There are no character levels. "Level" means a stage |
| *XP*, *experience points* | — | Do not exist. `experience` is a portfolio section |
| *easy mode*, *casual mode* | **Assist Options** | Framing matters (`13-UI-UX.md` P4) |
| *hitlag*, *freeze frame* | **hit stop** | One term |
| *super armour* | **poise** | Ours is a pool, not a binary state |
| *endlag* | **recovery** | Plain English |
| *AOE* | **radius**, **cone**, **area** | Say what it is |
| *proc* | — | Nothing procs; effects are deterministic |
| *RNG* (as a gameplay concept) | — | Combat is deterministic (`07-Combat.md` P5) |
| *tutorial* | **teaching beat** | There are no tutorials; geometry teaches |
| *cutscene* | **intro sequence**, **death sequence** | Ours are short, skippable, and non-blocking |
| *boss health* as a percentage | **HP threshold** | Phase thresholds are absolute HP values |
| *frame data* | the specific timing (`windupMs`, etc.) | Fighting-game vocabulary; be explicit |
| *juice* | **feedback**, or the specific layer | Vague. Name the layer |
| *game feel* | the specific pillar and metric | Vague. Cite Pillar 1 or 2 |

---

## 9. Implementation Notes — Abbreviations

The complete permitted list. Any abbreviation not here is spelled out.

| Abbrev | Expansion | Context |
|---|---|---|
| `hp` | hit points | Health values |
| `vx`, `vy` | velocity x, velocity y | Physics |
| `dt` | delta time | Per-frame timing |
| `ms` | milliseconds | Always suffixed on durations |
| `px` | pixels | Always suffixed on distances |
| `fps` | frames per second | Performance |
| `id` | identifier | Everywhere |
| `ui` | user interface | Module names |
| `vfx` | visual effects | Module names |
| `fsm` | finite state machine | Architecture |
| `aabb` | axis-aligned bounding box | Collision |
| `adr` | architecture decision record | `19-Decisions.md` |
| `a11y` | accessibility | Issue labels only, never in code |
| `cp` | checkpoint | Content ids only |
| `def` | definition | Local variables only, never in a type name |
| `cfg` | configuration | Local variables only |
| `ctx` | context | Parameter names |

**Everything else is spelled out.** `enemy` not `enm`, `position` not `pos`, `velocity` not `vel` (except as `vx`/`vy`), `temporary` not `tmp`.

---

## 10. Examples

### 10.1 Vocabulary Applied

**Correct:**

> The Orc's cleave has a 500 ms windup, during which its telegraph is a held pose on the final windup frame. On connecting, the hit resolution applies 18 damage after armour, deals 22 poise damage against the Orc's 60-point pool, and produces a flinch rather than a stagger. The player's punish window is the 550 ms recovery.

Every term is canonical. A reader knows exactly what each means, and every one is greppable.

**Incorrect:**

> The orc's big swing has a long startup where you can see the tell. When you hit it you do some damage and chip its super armour, but it doesn't get stunned unless you break through, then you get endlag frames to punish.

Six rejected terms, two vague ones, and nothing that survives a grep.

### 10.2 Resolving a Naming Question in Review

> **Reviewer:** "Should this be `EnemySpawnManager` or `SpawnSystem`?"
>
> **Answer:** `SpawnSystem`. `18-Glossary.md` §8 — *manager* is rejected. §6 — a **system** is a per-frame subsystem in `SYSTEM_ORDER`, which this is. The `Enemy` prefix is redundant because nothing else spawns.

Thirty seconds, no debate, consistent outcome. That is the entire value of this document.

### 10.3 Adding a Term

A new mechanic, "grapple point," is introduced post-launch:

```markdown
### **Grapple point**
An anchor the player can attach to with the grapple ability, pulling
themselves toward it at 220 px/s. Introduced in World 6.
*Rejected: hook point, swing anchor, tether.* → §`10-Level-Design.md` §7.6
```

Then: add `grapplePoint` to §7's mechanic format examples, and add *hook point* to §8's rejection table.

---

## 11. Acceptance Criteria

- [ ] Every term used with a specific meaning in `docs/` or `src/` appears here.
- [ ] Every entry cites the document owning its full specification.
- [ ] Every entry with a plausible synonym lists the rejected alternatives.
- [ ] `grep -riE "monster|mob\b|manager|prefab" src/` returns nothing (excluding `FocusManager`).
- [ ] Every abbreviation in the codebase appears in §9.
- [ ] Content identifier formats in §7 match the actual content files.
- [ ] The ambiguous terms — **component**, **stagger**/**staggered**, **gate**, **cut** — each carry an explicit disambiguation note.
- [ ] A new contributor reports being able to read this in under ten minutes.

---

## 12. Future Expansion

| Item | Trigger |
|---|---|
| **Audio vocabulary** | When audio is procured (`ADR-020`) — cue, stem, bus, ducking |
| **Steam vocabulary** | Steam port — achievement, rich presence, Steam Input |
| **Localisation vocabulary** | If localisation happens — string key, locale, pluralisation rule |
| **Time Trial vocabulary** | Post-launch — split, ghost, PB |
| **An automated vocabulary linter** | If drift becomes a problem — a cspell dictionary of rejected terms that flags them in review |

---

## 13. Out of Scope

| Excluded | Reason |
|---|---|
| **General game-development terms** | "Sprite", "tilemap", "collision" are industry-standard and need no local definition |
| **TypeScript and Phaser API terms** | Documented upstream |
| **Terms used once** | If a word appears in one document and nowhere else, it does not need a glossary entry |
| **Prose style guidance** | `00-README.md` §9.2 |
| **Pronunciation** | It is a written document |
| **Etymology or rationale for names** | Where a name choice has a rationale worth recording, it belongs in `19-Decisions.md` |

---

## 14. Cross References

| Topic | Document |
|-------|----------|
| Documentation writing conventions | `00-README.md` §9.2 |
| Pillars, audits, and teaching beats | `02-Game-Pillars.md` |
| Systems, entities, components, definitions | `03-Technical-Architecture.md` §5 |
| Style Bible, palette, signal ramp | `04-Art-Direction.md` §5, §6 |
| Harmonisation, atlases, pivots | `05-Asset-Pipeline.md` |
| Abilities, coyote time, jump buffer | `06-Characters.md` |
| Hitbox, hurtbox, hit stop, poise, trauma | `07-Combat.md` |
| Behaviours, tiers, telegraphs, elites | `08-Enemy-System.md` |
| Arenas, adds, unblockable, skip valve | `09-Boss-System.md` |
| Mechanics, teaching beats, secrets | `10-Level-Design.md` |
| Charms, shards, derived stats | `11-Progression.md` |
| Codex, Deletion Test, touch points | `12-Portfolio-System.md` |
| Assist Options, input frame | `13-UI-UX.md` |
| Presentation clips, extension frames | `14-Animation-Standards.md` |
| Degradation ladder, staggered updates | `15-Performance.md` |
| Naming conventions and domain vocabulary | `16-Coding-Standards.md` §6 |
| Cut lines, milestone gates | `17-Roadmap.md` |
| Decisions behind naming choices | `19-Decisions.md` |
