# 19 — Decision Log (ADRs)

**Project:** DevQuest (Working Title)
**Document Owner:** Technical Director
**Status:** 🔄 Living — append only
**Version:** 1.0.0
**Last Updated:** 2026-08-07

---

## 1. Purpose

This document records **why** DevQuest is the way it is. Every significant decision — architectural, design, or process — is recorded here as an Architecture Decision Record: the context, the options considered, the choice, and the consequences accepted.

Its value is entirely in the future. Six months from now, someone will look at a constraint in this project and think "that seems arbitrary, let me change it." This document is what tells them whether they are about to fix a mistake or repeat one.

An ADR is **append-only**. A decision that turns out to be wrong is not edited — it is superseded by a new ADR, and the old one is marked. The history of the reasoning is as valuable as the current state, because it shows what was already tried.

---

## 2. Goals

| #   | Goal                                                 | Success Signal                                           |
| --- | ---------------------------------------------------- | -------------------------------------------------------- |
| G1  | Record every significant decision with its reasoning | A stranger can answer "why X and not Y?" without asking  |
| G2  | Prevent decisions being silently re-litigated        | A rejected option is cited, not re-argued                |
| G3  | Make reversal possible and honest                    | Superseding an ADR is a documented act, not a quiet edit |
| G4  | Record what was rejected, not only what was chosen   | The rejected options are half the value                  |
| G5  | Give lint rules and constraints a citable rationale  | An error message points at an ADR                        |

---

## 3. Design Principles

### P1 — Append Only

Never edit an accepted ADR except to change its status or add a supersession link. The record of what we believed at the time is the point.

### P2 — Record the Rejected Options

An ADR listing only the chosen option is a press release. The rejected options, with their real trade-offs, are what stop the decision being re-made badly.

### P3 — Record Consequences, Including Bad Ones

Every decision costs something. An ADR that lists only benefits is not honest and will not be trusted.

### P4 — Write It When You Decide, Not After

An ADR written three months later is a rationalisation. Written at the moment of decision, it is a record.

### P5 — Small Decisions Do Not Need an ADR

A variable name does not need one. The test is: **would a competent stranger be surprised by this, and would they want to change it?** If yes, write the ADR.

---

## 4. Overview

### 4.1 The Format

```markdown
## ADR-NNN — Title

**Status:** Proposed | Accepted | Superseded by ADR-XXX | Deprecated
**Date:** YYYY-MM-DD
**Deciders:** Role(s)
**Affects:** Documents and modules

### Context

The situation and the forces at play.

### Options

Each option with its real trade-offs.

### Decision

What was chosen.

### Rationale

Why, in terms of the pillars, the vision, or measured evidence.

### Consequences

What this costs. Positive and negative.

### Revisit If

The condition under which this should be reconsidered.
```

### 4.2 The Index

| #                                                                   | Title                                                    | Status      | Date       |
| ------------------------------------------------------------------- | -------------------------------------------------------- | ----------- | ---------- |
| [001](#adr-001--not-an-rpg)                                         | Not an RPG                                               | ✅ Accepted | 2026-08-07 |
| [002](#adr-002--a-game-not-a-portfolio-website-with-a-resume-hedge) | A game, not a portfolio website (with a `/resume` hedge) | ✅ Accepted | 2026-08-07 |
| [003](#adr-003--phaser-3-as-the-engine)                             | Phaser 3 as the engine                                   | ✅ Accepted | 2026-08-07 |
| [004](#adr-004--vertical-slice-before-framework)                    | Vertical slice before framework                          | ✅ Accepted | 2026-08-07 |
| [005](#adr-005--arcade-physics-over-matterjs)                       | Arcade Physics over Matter.js                            | ✅ Accepted | 2026-08-07 |
| [006](#adr-006--typescript-strict-with-nouncheckedindexedaccess)    | TypeScript strict with `noUncheckedIndexedAccess`        | ✅ Accepted | 2026-08-07 |
| [007](#adr-007--one-enemy-class-composition-over-inheritance)       | One `Enemy` class, composition over inheritance          | ✅ Accepted | 2026-08-07 |
| [008](#adr-008--320--180-internal-resolution)                       | 320 × 180 internal resolution                            | ✅ Accepted | 2026-08-07 |
| [009](#adr-009--no-backend-localstorage-saves)                      | No backend, localStorage saves                           | ✅ Accepted | 2026-08-07 |
| [010](#adr-010--vite-as-the-bundler)                                | Vite as the bundler                                      | ✅ Accepted | 2026-08-07 |
| [011](#adr-011--wall-slide-for-all-four-heroes)                     | Wall-slide for all four heroes                           | ✅ Accepted | 2026-08-07 |
| [012](#adr-012--parry-is-knight-only-at-200-ms)                     | Parry is Knight-only at 200 ms                           | ✅ Accepted | 2026-08-07 |
| [013](#adr-013--five-inputs-and-no-interact-key)                    | Five inputs and no interact key                          | ✅ Accepted | 2026-08-07 |
| [014](#adr-014--hit-stop-is-not-negotiable)                         | Hit stop is not negotiable                               | ✅ Accepted | 2026-08-07 |
| [015](#adr-015--content-is-data-not-code)                           | Content is data, not code                                | ✅ Accepted | 2026-08-07 |
| [016](#adr-016--no-walkable-hub-world)                              | No walkable hub world                                    | ✅ Accepted | 2026-08-07 |
| [017](#adr-017--three-charm-slots-not-four)                         | Three charm slots, not four                              | ✅ Accepted | 2026-08-07 |
| [018](#adr-018--darkness-constraints-for-world-3)                   | Darkness constraints for World 3                         | ✅ Accepted | 2026-08-07 |
| [019](#adr-019--seeded-rng-everywhere)                              | Seeded RNG everywhere                                    | ✅ Accepted | 2026-08-07 |
| [020](#adr-020--audio-may-come-from-a-non-craftpix-vendor)          | Audio may come from a non-CraftPix vendor                | 🟡 Proposed | 2026-08-07 |
| [021](#adr-021--staggered-enemy-vision-at-10-hz)                    | Staggered enemy vision at 10 Hz                          | ✅ Accepted | 2026-08-07 |
| [022](#adr-022--one-graphics-object-for-boss-ground-indicators)     | One Graphics object for boss ground indicators           | ✅ Accepted | 2026-08-07 |

---

## 5. Technical Design — The Decision Records

The twenty-two records below are the substance of this document. They are
ordered by number, not by importance, and numbers are never reused.

Reading them in order is not recommended. Reading the index in §4.2 and
jumping to the one you need is. The records that shape the most other
decisions, and are therefore worth reading unprompted, are:

| ADR                                                           | Why It Is Load-Bearing                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| [001](#adr-001--not-an-rpg)                                   | Determines what the game is, and closes the most common re-proposal |
| [003](#adr-003--phaser-3-as-the-engine)                       | Determines every technical constraint downstream                    |
| [004](#adr-004--vertical-slice-before-framework)              | Determines the entire milestone sequence                            |
| [007](#adr-007--one-enemy-class-composition-over-inheritance) | Determines how all content is authored                              |
| [008](#adr-008--320--180-internal-resolution)                 | Determines every art and UI constraint. Unchangeable                |

---

## ADR-001 — Not an RPG

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Game Director
**Affects:** `01-Vision.md`, `07-Combat.md`, `11-Progression.md`

### Context

The single most common suggestion for a developer-portfolio game is to make it an RPG: levelling maps to career progression, skills map to technical skills, quests map to projects. The metaphor is immediately legible and the genre is familiar.

### Options

| Option                             | Pros                                                                                                | Cons                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **RPG** (turn-based or action-RPG) | Metaphor is obvious; familiar genre; stat systems are easy to author                                | Needs dozens of hours of content; combat becomes arithmetic; metaphor exhausts in ten seconds; every portfolio game is this |
| **Action platformer**              | Combat is skill-based; 4 hours of excellent content is achievable solo; feel-driven; differentiated | The portfolio connection is less obvious; needs precise controls                                                            |
| **Puzzle game**                    | Cheap to produce; showcases logic                                                                   | No feel, no spectacle; weak demonstration of engine skill                                                                   |
| **Metroidvania**                   | Depth, exploration                                                                                  | Scope is 2–3× an action platformer at the same quality                                                                      |

### Decision

**A 2D side-scrolling action platformer.** No XP, no levels, no stat allocation, no equipment stats, no inventory management.

### Rationale

1. **The metaphor is cute for ten seconds and tedious for two hours.** A pun does not sustain a play session.
2. **RPG systems demand content volume we cannot produce.** A satisfying RPG needs dozens of hours. A satisfying action platformer needs four. With a twelve-month solo-scale budget, only one is achievable at a shippable quality bar.
3. **RPG combat is arithmetic; action combat is skill.** Our pillars are built on feel. Stat-driven combat has no hit stop, no knockback, no screen shake — it removes Pillar 2 entirely.
4. **It fails the Deletion Test.** An RPG whose stats are career metaphors collapses without the metaphor. An action platformer does not.
5. **It is the expected answer.** Every developer-portfolio game is an RPG. Building an action platformer is itself a differentiator.

### Consequences

**Positive:** combat can be tuned for feel; content scope is achievable; the game stands alone.

**Negative:** the portfolio connection is less immediately obvious to a casual observer. Progression must create a sense of growth without stat inflation, which is a harder design problem — solved by health containers and charms with a hard ±15% cap (`11-Progression.md` §7.3).

**Also negative:** we will receive the "make it an RPG" suggestion repeatedly. This ADR is the answer.

### Revisit If

Never for this project. A different project with a different scope might legitimately choose differently.

---

## ADR-002 — A game, not a portfolio website (with a `/resume` hedge)

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Game Director
**Affects:** `01-Vision.md`, `12-Portfolio-System.md`

### Context

The stated goal is to present a developer's portfolio effectively. A game is an unusual delivery mechanism and carries obvious risk: a recruiter with 90 seconds may not want to play anything.

### Options

| Option                          | Pros                                                                            | Cons                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **A fast, beautiful website**   | Zero friction; universally accessible; 2 weeks of work                          | Demonstrates that you can build a website. Time-on-page measured in seconds |
| **A game only**                 | Demonstrates substantially more skill; time-in-game measured in tens of minutes | Some visitors will not play; accessibility barriers                         |
| **A game plus a static résumé** | Both audiences served; the game is the reason to read the résumé                | Two things to maintain (but they share one data source)                     |

### Decision

**A game, plus a plain static `/resume` page generated from the same content JSON, linked from the title screen and the preloader.**

### Rationale

1. A 60 fps engine build with a data-driven enemy framework, object pooling, a state-machine-driven boss system, and a documented architecture demonstrates considerably more than a website.
2. The hedge costs almost nothing: one build script, one afternoon, and it shares the portfolio JSON so it cannot drift.
3. It eliminates the largest single risk to the project's premise — a visitor who will not play.
4. It is also the accessibility answer. A blind visitor cannot play a canvas-rendered pixel platformer; they can read a WCAG-compliant page in under a second (`12-Portfolio-System.md` §11.5).

### Consequences

**Positive:** both audiences served; the accessibility story becomes honest rather than apologetic; the résumé link on the _preloader_ means someone can leave for the CV before the game even loads.

**Negative:** a small ongoing maintenance surface, mitigated by generating from one source.

### Revisit If

Analytics ever show `/resume` is never used — but there is no backend, so this cannot be measured. The page stays.

---

## ADR-003 — Phaser 3 as the engine

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Technical Director
**Affects:** `03-Technical-Architecture.md`, all engineering

### Context

The game is a 2D pixel-art platformer for the browser, built by a small team over twelve months.

### Options

| Option                 | Pros                                                                                                             | Cons                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phaser 3**           | Mature; WebGL-first; excellent Arcade Physics; tilemap support; huge community; TypeScript types; one dependency | Some API inconsistency; large default bundle (mitigated by a custom build)                                                                   |
| **PixiJS + custom**    | Lighter; more control                                                                                            | We would write physics, tilemaps, scenes, input, and animation ourselves. Months of work                                                     |
| **Excalibur.js**       | TypeScript-native; clean API                                                                                     | Much smaller community; less battle-tested                                                                                                   |
| **Godot (web export)** | Full editor; excellent 2D                                                                                        | Large WASM payload (~15 MB) breaks the 8-second load promise; the codebase would be GDScript/C#, weakening the portfolio value of the source |
| **Custom engine**      | Maximum portfolio value                                                                                          | 6+ months before the first level. Fatal to the schedule                                                                                      |

### Decision

**Phaser 3 (`^3.90.0`), with a custom build stripping Matter.js, Impact physics, Spine, and unused tilemap parsers.**

### Rationale

1. It solves every problem we have and none we do not: scenes, input, tilemaps, Arcade Physics, animation, atlases, WebGL batching.
2. The custom build removes 340 KB and gets us inside the bundle budget.
3. The community and documentation matter enormously for a solo developer — most problems are already answered.
4. Godot's web export is disqualified purely by payload size against the 8-second promise (`01-Vision.md` §5.2).
5. A custom engine would be more impressive and would not ship.

### Consequences

**Positive:** fast start; one runtime dependency; excellent tooling.

**Negative:** we accept Phaser's architectural choices — global animation manager, scene lifecycle quirks, the need to manually wire `shutdown`. Each of these is documented as a hazard in `03-Technical-Architecture.md` §7.4.

**Also negative:** Phaser 4 will eventually exist. Migration is not planned and would be a separate decision.

### Revisit If

Phaser 3 is abandoned upstream, or a measured performance ceiling is hit that a different renderer would solve. Neither is anticipated.

---

## ADR-004 — Vertical slice before framework

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Technical Director, Game Director
**Affects:** `01-Vision.md` §8.1, `17-Roadmap.md`

### Context

The instinct on a data-driven project is to build the framework first — the enemy system, the boss system, the level pipeline — and then author content into it. This is how most engine-adjacent projects are structured.

### Options

| Option                   | Pros                                                                  | Cons                                                                                             |
| ------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Framework first**      | Content authoring is fast once it exists; feels architecturally clean | Generalises before you know what to generalise; the first content reveals the framework is wrong |
| **Vertical slice first** | The framework is extracted from a working case; you know what varies  | The first enemy is thrown away (partially); feels like rework                                    |
| **Both in parallel**     | —                                                                     | Neither is done well; the framework churns while content is authored against it                  |

### Decision

**Build one complete, polished level with one hardcoded enemy and one hardcoded boss (M2–M3), then extract the frameworks from it (M4).**

### Rationale

1. Building `EnemyDefinition` before shipping one enemy that feels good produces a schema that abstracts the wrong axes. You discover the Werewolf needs a leap behaviour only after you have built the Werewolf.
2. The "rework" is smaller than it looks. The hardcoded Skeleton's behaviour code becomes `PatrolBehaviour` and `MeleeBehaviour` almost verbatim; only the wiring changes.
3. It front-loads the risk that matters. If combat does not feel good, we learn in month 3 with a hardcoded enemy, not in month 6 with a framework built on a bad foundation.
4. It matches the two-implementations rule (`16-Coding-Standards.md` §9.4) applied at project scale.

### Consequences

**Positive:** the frameworks in M4 are extracted from evidence rather than imagined. Risk retired early.

**Negative:** M2 and M3 produce code that is knowingly non-final. This must be communicated clearly or it looks like poor engineering. The M2 Skeleton is explicitly labelled "hardcoded, to be extracted in M4" in its file header.

### Revisit If

M4's extraction takes more than one week, indicating the slice was too specialised to generalise from.

---

## ADR-005 — Arcade Physics over Matter.js

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Technical Director
**Affects:** `03-Technical-Architecture.md`, `07-Combat.md`, `10-Level-Design.md`

### Context

Phaser ships two physics systems. Arcade is AABB-only with no rotation. Matter.js is a full rigid-body engine with arbitrary polygons, constraints, and rotation.

### Options

| Option               | Pros                                                                         | Cons                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Arcade Physics**   | 5–10× faster; simple, predictable; tilemap collision built in; deterministic | AABB only; no slopes beyond manual handling; no rotation                                                  |
| **Matter.js**        | Arbitrary shapes; slopes; rotation; constraints                              | Much slower; harder to make feel tight; tilemap integration is manual; non-deterministic across platforms |
| **Custom collision** | Exactly what we need                                                         | Weeks of work to match Arcade's quality                                                                   |

### Decision

**Arcade Physics**, with 45° slopes handled by a small manual correction pass on the player only.

### Rationale

1. Nothing in the design needs rotation, arbitrary polygons, or constraints. Every entity is an upright rectangle.
2. Arcade's speed is the difference between 1.3 ms and 8+ ms of physics per frame at our entity count — a third of the entire frame budget.
3. Precision platforming needs _predictable_ collision. Matter's solver introduces small inconsistencies that are fatal to Pillar 1.
4. Arcade's tilemap collision is built in and battle-tested.
5. Determinism. Matter.js is not bit-identical across platforms, which would break replay determinism (ADR-019).

### Consequences

**Positive:** fast, predictable, deterministic, well-integrated.

**Negative:** **slopes are 45° only**, handled by a position-correction hack on the player (`10-Level-Design.md` §9.2). Two of five worlds use no slopes at all. Arbitrary-angle terrain is permanently out of scope.

**Also negative:** no physics-driven ragdolls or debris. Debris particles are faked with simple ballistic motion, which is sufficient at 320×180.

### Revisit If

A design requirement emerges that genuinely needs rotation or arbitrary polygons. None is anticipated, and it would need to justify a 6 ms/frame cost.

---

## ADR-006 — TypeScript strict with `noUncheckedIndexedAccess`

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Technical Director
**Affects:** `16-Coding-Standards.md` §5.1, all source

### Context

TypeScript's strictness is a spectrum. `noUncheckedIndexedAccess` in particular is widely disabled because it is annoying: it makes `arr[i]` return `T | undefined`, requiring an explicit handle at every array access.

### Options

| Option                                              | Pros                                                  | Cons                                                                |
| --------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| **`strict` only**                                   | Standard; low friction                                | Array-index bugs pass the compiler                                  |
| **`strict` + `noUncheckedIndexedAccess`**           | Catches the exact bug class our architecture produces | Noticeable friction; requires `!` assertions in provably-safe cases |
| **Full strictness including `noImplicitAny` on JS** | Maximum safety                                        | We have no JS                                                       |

### Decision

**`strict: true` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, and `useUnknownInCatchVariables`.**

### Rationale

1. This codebase is built on object pools, indexed lookups, frame arrays, and content maps. `arr[i]` returning `undefined` is not hypothetical — it is what happens when a pool is empty, a frame index is out of range, or a content id is wrong.
2. The friction is real but bounded, and the escape hatch (`!` with a justifying comment) is explicit and greppable.
3. `exactOptionalPropertyTypes` matters for content JSON, where "field absent" and "field explicitly null" mean different things.

### Consequences

**Positive:** an entire bug class is eliminated at compile time. Reviewers can trust that any `!` has been thought about.

**Negative:** more verbose code in places. Occasional friction with third-party types (mitigated by `skipLibCheck`).

**Enforced:** a bare `!` without a justifying comment is a review failure (`16-Coding-Standards.md` §5.1).

### Revisit If

The `!` count exceeds roughly one per 200 lines, indicating the flag is being worked around rather than satisfied.

---

## ADR-007 — One `Enemy` class, composition over inheritance

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Technical Director, Lead Designer
**Affects:** `03-Technical-Architecture.md` §5.2, `08-Enemy-System.md`, `09-Boss-System.md`

### Context

Seven enemy families × three tiers = 21 configurations, plus five bosses. The conventional approach is a class per enemy type.

### Options

| Option                              | Pros                                                                                | Cons                                                                                                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Class per enemy**                 | Familiar; each enemy's code is in one file                                          | 21 classes; variants require subclasses; shared behaviour needs a base class that grows; a diamond problem the moment two enemies share a behaviour a third does not |
| **One class + composed behaviours** | Variants are free; behaviours are independently testable; designers can add enemies | Behaviour composition is less obvious to read than a single class                                                                                                    |
| **ECS**                             | Maximum flexibility                                                                 | 40 entities does not justify the archetype machinery; a large conceptual overhead                                                                                    |

### Decision

**One `Enemy` class configured entirely by `EnemyDefinition`, with behaviour composed from 14 registered modules. One `Boss` class following the same pattern with a nested phase machine.**

### Rationale

1. **Variants become free.** A veteran skeleton is a generated JSON file, not a class.
2. **Behaviours are independently testable** with no Phaser scene.
3. **Designers can add enemies** without an engineer — the stated goal G4 of `03-Technical-Architecture.md`.
4. **No diamond problems.** When the elite werewolf needs the yokai's teleport, that is one array entry, not a refactor.

### Consequences

**Positive:** 21 configurations cost 21 small JSON files. Adding an eighth family likely needs zero new behaviours.

**Negative:** reading "what does a werewolf do" requires reading its JSON plus four behaviour modules, rather than one file. This is genuinely worse for comprehension and is accepted deliberately.

**Escape hatch:** a truly unique enemy gets a **new behaviour module**, never a subclass. A behaviour used by exactly one enemy is acceptable — it is still composable and testable.

### Revisit If

The behaviour count exceeds ~25, at which point composition may be producing more complexity than it removes.

---

## ADR-008 — 320 × 180 internal resolution

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Art Director, Technical Director
**Affects:** Everything

### Context

The internal render resolution determines the art budget, the level-design vocabulary, the UI density, and the performance profile. It cannot be changed later without invalidating every asset.

### Options

| Resolution    | Scales to 1080p    | Character height | Trade-off                                               |
| ------------- | ------------------ | ---------------- | ------------------------------------------------------- |
| **256 × 144** | ×7.5 (non-integer) | 24 px            | Too cramped; bad 1080p scaling                          |
| **320 × 180** | ×6 exactly         | 32 px            | Sweet spot                                              |
| **384 × 216** | ×5 exactly         | 38 px            | More room, more art per screen, larger atlases          |
| **480 × 270** | ×4 exactly         | 48 px            | Substantially more art cost; less "pixel art" character |
| **640 × 360** | ×3 exactly         | 64 px            | Art cost roughly 4× that of 320×180                     |

### Decision

**320 × 180**, with 16 px tiles and 32 px characters.

### Rationale

1. **Integer scaling to both 720p (×4) and 1080p (×6).** No fractional scaling ever.
2. **A 32 px character is 17.8% of screen height** — large enough for readable animation detail, small enough that the camera shows 20 × 11.25 tiles of context.
3. **Art cost.** Every step up multiplies the pixels an artist must place. At 320×180, a full character animation set is ~75 frames of ~40×40. At 640×360 the same set is 4× the pixel work.
4. **Performance.** Fill rate is negligible at this resolution even on Intel integrated graphics.

### Consequences

**Positive:** achievable art scope; excellent scaling; strong pixel-art identity; trivial fill cost.

**Negative:** **UI is severely constrained.** A 4 px margin is 2.2% of screen width. The HUD must occupy reserved bands rather than overlaying (`04-Art-Direction.md` §9.3), costing 32 px of the 180 and leaving a 148 px gameplay viewport. Text is limited to a 6 px cap height and ~52 characters per line.

**Also negative:** the accessibility "larger text" option can only go to 8 px, which is a real limit honestly recorded in `13-UI-UX.md` §11.5.

### Revisit If

Never. Changing this invalidates every asset in the project.

---

## ADR-009 — No backend, localStorage saves

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Technical Director, Game Director
**Affects:** `01-Vision.md` §14, `11-Progression.md` §8

### Context

A backend would enable cloud saves, leaderboards, telemetry, and a contact form.

### Options

| Option                           | Pros                                                                                         | Cons                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **No backend**                   | Zero infrastructure, cost, or privacy obligation; deployment is a file upload; fully offline | No cloud saves, leaderboards, or telemetry                                                  |
| **Minimal backend** (saves only) | Cross-device saves                                                                           | Accounts, auth, GDPR, hosting cost, uptime, and a new failure mode for a single-player game |
| **Full backend**                 | Everything                                                                                   | All of the above, considerably more                                                         |

### Decision

**No backend of any kind.** Saves are `localStorage`. No accounts, no telemetry, no leaderboards, no contact form.

### Rationale

1. Nothing in the vision needs one. Progression is single-player; the portfolio is static content.
2. Deployment becomes a static file upload — no migrations, no downtime, no ops.
3. No accounts means no auth, no password reset, no GDPR obligations, and no privacy surface for a recruiter who is being asked to interact with a stranger's website.
4. The game works offline once cached.
5. Cost is zero, indefinitely. A portfolio piece that stops working when a hosting bill lapses is worse than useless.

### Consequences

**Positive:** enormous simplification. No ops burden. No privacy story to write.

**Negative:** no cross-device saves. No telemetry, which means tuning decisions rest on playtesting rather than data — genuinely worse for balance, and accepted.

**Also negative:** the Contact section shows an email address rather than a form. This is arguably better anyway.

**Consequence for the Steam port:** Steam Cloud saves become available by swapping the `Storage` implementation, since the save schema is storage-agnostic.

### Revisit If

Never for the web build. The Steam port revisits it for Cloud saves only.

---

## ADR-010 — Vite as the bundler

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Technical Director
**Affects:** `03-Technical-Architecture.md`, `16-Coding-Standards.md`

### Context

The project needs a dev server with fast HMR, a production bundler with tree-shaking, and TypeScript support.

### Options

| Option                      | Pros                                                                                                                   | Cons                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Vite**                    | Near-instant dev server; native ESM; excellent TS support; `import.meta.env` for dead-code elimination; minimal config | Rollup under the hood, so some Rollup plugin knowledge leaks through |
| **Webpack**                 | Mature; maximum ecosystem                                                                                              | Slow dev server; heavy configuration                                 |
| **esbuild alone**           | Fastest                                                                                                                | No dev server, no HMR, minimal plugin ecosystem                      |
| **Parcel**                  | Zero config                                                                                                            | Less control; smaller community                                      |
| **No bundler** (native ESM) | Simplest                                                                                                               | No tree-shaking, no minification, hundreds of requests               |

### Decision

**Vite 6**, with `base: './'` for portable deployment and `assetsInclude` for `.tmj` files.

### Rationale

1. Sub-second dev server start and instant HMR matter enormously over twelve months.
2. `import.meta.env.DEV` is statically replaced, which is what makes assertions and the profiler free in production (`03-Technical-Architecture.md` §11.4).
3. `base: './'` makes the build portable to a subdirectory host and to the Tauri wrapper for Steam.
4. Configuration is roughly 30 lines rather than 300.

### Consequences

**Positive:** fast iteration; small config; good tree-shaking.

**Negative:** the dev server uses native ESM while the production build is bundled, so behaviour can theoretically differ. Mitigated by CI running the production build for all E2E and performance tests, never the dev server.

### Revisit If

Vite is abandoned upstream. Migration to Rollup directly would be straightforward.

---

## ADR-011 — Wall-slide for all four heroes

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Lead Designer
**Affects:** `06-Characters.md` §5.6, `10-Level-Design.md`

### Context

A wall-slide was proposed as a Ninja-exclusive ability, reinforcing its mobility identity.

### Options

| Option                                 | Pros                                              | Cons                                                                                                            |
| -------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Ninja only**                         | Strong identity; a clear reason to pick the Ninja | Any level using a shaft becomes Ninja-only or Ninja-trivial. Violates `06-Characters.md` P3 (no hero gated out) |
| **All heroes, identical**              | No gating                                         | Removes an identity opportunity                                                                                 |
| **All heroes, different slide speeds** | No gating; still expresses identity               | Slightly more tuning                                                                                            |
| **No wall-slide**                      | Simplest                                          | Loses a genuinely good traversal verb                                                                           |

### Decision

**Wall-slide for all four heroes, with per-hero slide speeds** — Ninja 45 px/s (slowest, near-hovering), Samurai 70, Wizard 80, Knight 90 (heaviest, a brief catch).

### Rationale

1. P3 is non-negotiable: no level may be gated on a hero-specific ability. A Ninja-only wall-slide would force every shaft to have an alternative route, which is expensive and produces worse levels.
2. Differing slide speeds preserve the identity expression: the Ninja can descend a long shaft in control; the Knight gets a brief catch.
3. Wall-jump is identical for everyone, so the _skill_ is universal and only the _feel_ differs.

### Consequences

**Positive:** shafts and vertical sections become available to level design without alternative routes. Character identity preserved.

**Negative:** the Ninja loses one exclusive verb. Compensated by keeping the double jump and i-frame dash exclusive.

**Also:** wall-slide is introduced in World 2, not World 1, so World 1 keeps to five inputs and zero advanced verbs (Pillar 4).

### Revisit If

Playtests show wall-slide makes any hero trivially dominant in vertical sections.

---

## ADR-012 — Parry is Knight-only at 200 ms

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Lead Designer, Game Director
**Affects:** `06-Characters.md` §7.1.4, `02-Game-Pillars.md` §8.1

### Context

A parry — a tight timing window that negates damage and rewards with a counter opportunity — was proposed as a universal mechanic with a 6-frame (100 ms) window.

### Pillar assessment

| Pillar       | Assessment                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| 1 Responsive | ⚠️ A 100 ms window demands perfect input latency. We have it, but it is unforgiving                     |
| 2 Combat     | ✅ Strongly served. A successful parry is the highest-feedback moment available                         |
| 3 Polish     | ✅ A parry flash is exceptional feedback                                                                |
| 4 Learnable  | ❌ **Violated.** 100 ms is not learnable by a non-gamer. Mandatory parry gates out the primary audience |
| 5 Novelty    | ➖ Neutral                                                                                              |

### Options

| Option                  | Pros                                                                                 | Cons                                           |
| ----------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------- |
| **Universal, 100 ms**   | Deep, high-skill                                                                     | Fails Pillar 4                                 |
| **Universal, 200 ms**   | More accessible                                                                      | Still mandatory-feeling; dilutes hero identity |
| **Knight-only, 200 ms** | Opt-in at character select; never mandatory; gives the beginner hero a skill ceiling | Only one hero gets the best mechanic           |
| **Cut it**              | Simplest                                                                             | Loses the single best combat moment available  |

### Decision

**Parry is the Knight's ability only, with a 200 ms (12-frame) window, extended to 333 ms (20 frames) by the "Extended Windows" Assist Option.**

### Rationale

1. Pillar 4 outranks Pillar 2 in the precedence order (`02-Game-Pillars.md` §11), because the primary audience must be able to finish.
2. Making it hero-exclusive means it is **opt-in at character select** and never mandatory. A player who cannot parry picks a different hero and loses nothing.
3. It gives the _beginner_ hero the highest skill ceiling, which is an elegant inversion: a novice holds Guard and survives; an expert taps Guard and turns every enemy attack into a free critical. Low floor, high ceiling, in one ability.
4. 200 ms rather than 100 ms because the window should reward reading a telegraph, not frame-perfect execution.

### Consequences

**Positive:** the mechanic exists without gating anyone out. The Knight gains genuine depth.

**Negative:** three heroes do not have access to the game's best defensive tool. Mitigated by giving each a comparable-value ability (Iai i-frames, dash i-frames, Barrier).

### Revisit If

Playtests show the Knight is dominant against bosses, or that the 200 ms window is still too tight for the primary audience even with Assist.

---

## ADR-013 — Five inputs and no interact key

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** UX Designer, Game Director
**Affects:** `13-UI-UX.md` §5.1, `02-Game-Pillars.md` §5.4.2

### Context

The primary audience may not play games. Every additional control is a barrier.

### Options

| Option                                                      | Pros                                                                | Cons                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| **Move, jump, attack, dash, special, interact (6)**         | Conventional; interact is explicit                                  | A non-gamer must learn which key opens a door |
| **Move, jump, attack, dash, special (5), interact on jump** | One fewer thing to learn; mashing the confident button always works | Slightly unconventional                       |
| **Four inputs** (no special)                                | Simplest                                                            | Removes hero identity entirely                |

### Decision

**Five inputs — move, jump, attack, dash, special — plus pause. No separate interact key.** Doors, chests, checkpoints, and every other interaction activate on contact or on jump.

Additionally: **no new inputs are introduced after World 1.** Worlds 2–5 add contexts, never controls.

### Rationale

1. The most common non-gamer failure is not knowing which key does the contextual thing. Binding interaction to jump means the player who mashes the one button they are confident about always succeeds.
2. Nothing in the design needs a distinct interact verb. There is no dialogue, no inventory, no examine.
3. The "no new inputs after World 1" rule is Pillar 4's strongest protection and is checked statically.
4. Three default keyboard bindings for jump (`Space`, `W`, `↑`) cost nothing and settle a preference argument before it starts.

### Consequences

**Positive:** the smallest possible control surface. A naive playtester reaches their first jump in under 10 seconds.

**Negative:** any future mechanic needing a distinct contextual action has nowhere to go. This is a real constraint on post-launch content and is accepted.

### Revisit If

A post-launch mechanic genuinely requires a sixth input. It would need to be introduced in a post-World-1 context with its own teaching beats.

---

## ADR-014 — Hit stop is not negotiable

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Game Director
**Affects:** `07-Combat.md` §6.2, `02-Game-Pillars.md` §5.2

### Context

A recurring proposal, arising whenever hit stop is perceived as lag on slower machines: remove or reduce hit stop.

### Options

| Option                     | Assessment                                                                    |
| -------------------------- | ----------------------------------------------------------------------------- |
| **Remove hit stop**        | Destroys Pillar 2's load-bearing layer. Combat becomes "the number went down" |
| **Reduce durations**       | Weakens the effect without addressing the cause                               |
| **Make it a setting**      | Splits the game into a version that feels good and a version that does not    |
| **Fix the implementation** | The actual answer                                                             |

### Decision

**Hit stop stays at its specified durations. When it reads as lag, the implementation is fixed, not the mechanic.**

### Rationale

Hit stop reading as lag has exactly three causes, all of them bugs:

1. **Freezing the whole scene rather than the participants.** If VFX, particles, camera shake, and parallax freeze too, the brain reads a dropped frame. Fix: freeze only the attacker and victim (`07-Combat.md` §6.2).
2. **Freezing input.** If input is dropped rather than buffered, the player feels control loss. Fix: buffer and apply on the first unfrozen frame.
3. **An actual frame-rate problem being blamed on hit stop.** Fix: the performance budget.

None of these is an argument against hit stop.

### Consequences

**Positive:** the pillar is protected from erosion by well-intentioned bug reports.

**Negative:** none. This ADR exists purely to make the correct response fast.

**Process consequence:** any bug report describing hit stop as lag is triaged against the three causes above before any tuning change is considered.

### Revisit If

A fourth cause is discovered that is not an implementation bug.

---

## ADR-015 — Content is data, not code

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Technical Director
**Affects:** `03-Technical-Architecture.md` P1, `08`, `09`, `10`, `13`

### Context

Enemies, bosses, levels, characters, charms, UI menus, and portfolio content all need to be defined somewhere.

### Options

| Option                 | Pros                                                                              | Cons                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **TypeScript objects** | Type-safe by construction; no schema needed; refactorable                         | Every content change is a code change; designers need an engineer; content churn pollutes source history |
| **JSON + schemas**     | Designers are autonomous; content and code churn are separated; validated at boot | Types must be maintained alongside schemas; runtime validation needed                                    |
| **A custom DSL**       | Maximally expressive                                                              | A parser to write and maintain, for no clear gain                                                        |
| **A database or CMS**  | Editing UI                                                                        | Requires a backend (ADR-009)                                                                             |

### Decision

**JSON validated against JSON Schema (draft 2020-12) at boot, with hand-written TypeScript types verified against the schemas in CI.**

### Rationale

1. A designer adding an enemy variant must not need an engineer. This is the stated goal G4 of the architecture.
2. Content changes and code changes have different review requirements and different risk profiles. Separating them makes both reviews better.
3. Boot-time validation with JSON-pointer error paths turns a designer's typo into a clear message rather than a runtime crash three levels in.
4. Hand-written types rather than generated ones: generation adds a build step, and CI verification catches drift just as well with less machinery.

### Consequences

**Positive:** adding an enemy is one JSON file and zero TypeScript. Tier variants are generated. Level objects dispatch through a registry.

**Negative:** types and schemas must be kept in sync, verified by CI. A JSON typo is caught at boot rather than at compile time — later than ideal, but loudly.

**Also negative:** JSON has no comments. Mitigated by a `$comment` convention where explanation is needed.

### Revisit If

Content volume grows to the point that hand-editing JSON becomes error-prone — at which point a small authoring tool, not a different format, is the answer.

---

## ADR-016 — No walkable hub world

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Game Director, Lead Designer
**Affects:** `11-Progression.md` §6.3, `13-UI-UX.md` §8.4

### Context

A walkable hub — a small explorable space with an NPC vendor, a charm bench, and portals to each world — is a genre convention and adds character.

### Options

| Option                                                 | Pros                                                            | Cons                                                                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Walkable hub**                                       | Atmospheric; makes the vendor a character; a place to return to | 2–3 weeks of level design, art, and NPC work; adds walking time to every transition; a space the player passes through in 8 seconds |
| **Menu-based world select**                            | Instant; zero content cost; more information density            | Less atmospheric                                                                                                                    |
| **Hybrid** (a static illustrated screen with hotspots) | Some atmosphere, low cost                                       | Neither one thing nor the other                                                                                                     |

### Decision

**A menu-based World Select scene**, with the vendor, charm loadout, stats, and Codex as overlay panels on that scene rather than separate scenes.

### Rationale

1. **Cost.** A walkable hub is 2–3 weeks — roughly two-thirds of a world's content budget — for a space the player crosses in eight seconds.
2. **Friction.** Walking to the vendor, then to the charm bench, then to the World 3 portal is friction on every single session. A menu is instant.
3. **Information density.** A menu can show completion percentages, best times, secrets found, and lock states simultaneously. A walkable hub cannot.
4. **Pillar 5 relevance:** a hub does not introduce a new mechanic and therefore competes with content that does.

### Consequences

**Positive:** three weeks saved and reallocated to worlds. World Select is fast and information-dense.

**Negative:** less atmosphere. The vendor is a panel rather than a character. This is a real loss and is accepted.

### Revisit If

Post-launch, with time to spare, a hub could be added as pure polish without changing any system — World Select would become reachable from within it.

---

## ADR-017 — Three charm slots, not four

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Lead Designer
**Affects:** `11-Progression.md` §7

### Context

Ten charms exist. The number of simultaneous slots determines whether the system is a choice or an accumulation.

### Options

| Slots  | Effect                                                                     |
| ------ | -------------------------------------------------------------------------- |
| **2**  | Very tight; most charms never used; the two best dominate                  |
| **3**  | Meaningful choice; world-specific charms compete with always-good ones     |
| **4**  | Prototyped: players converged on one dominant loadout and stopped engaging |
| **5+** | Accumulation, not choice                                                   |

### Decision

**Three slots, fixed. Never increases through progression.**

### Rationale

Four slots were prototyped. With four, the dominant loadout became Whetstone + Ironhide + Soulbind + one situational, and players stopped thinking about it after World 2. With three, dropping one of the "always good" charms to fit Lantern for World 3 is a real decision that has to be made again for World 5.

Four of the ten charms are deliberately world-specific (Windrider, Lantern, Clockwork, Featherfall), which is what makes three slots generate per-world decisions rather than one permanent one.

### Consequences

**Positive:** the system stays active for the whole game. Loadout swapping between worlds is a genuine ritual.

**Negative:** players will want a fourth slot and will ask for it. This ADR is the answer.

**Design constraint created:** no charm may exceed ±15% on a core stat, or the "obviously correct" charms would crowd out the situational ones.

### Revisit If

Post-launch data (playtests, not telemetry — there is no backend) shows players never swap loadouts, indicating three is still too many.

---

## ADR-018 — Darkness constraints for World 3

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Lead Designer, Art Director
**Affects:** `10-Level-Design.md` §7.3, `08-Enemy-System.md` §7, `09-Boss-System.md` §7.3

### Context

World 3's mechanic is light and darkness — a lantern radius, extinguishable braziers, and fog. The obvious risk is that darkness makes the game unfair rather than tense.

### Pillar assessment

| Pillar       | Assessment                                                                           |
| ------------ | ------------------------------------------------------------------------------------ |
| 1 Responsive | ➖ Neutral, provided the light radius does not obscure the player's own landing zone |
| 2 Combat     | ⚠️ Risk — enemy tells must remain readable                                           |
| 3 Polish     | ✅ Strongly served. Lighting is high-value visual polish                             |
| 4 Learnable  | ⚠️ Risk — a player who cannot see cannot learn                                       |
| 5 Novelty    | ✅ Exactly the mandate                                                               |

### Decision

**Darkness is approved, with two inviolable constraints:**

**(a) No instant-death hazard may exist outside the lantern radius on a main path.** A pit the player cannot see is not a challenge.

**(b) Every enemy attack windup is self-illuminated regardless of ambient darkness.** During `WINDUP`, the enemy sprite renders with an additive glow in the world's accent colour at 25% alpha.

Extended to bosses: **the Oni Lord is always visible** at 60% self-illumination even at zero braziers, rising to 100% in phase 3. What darkness hides is its adds and projectiles, never the boss itself.

### Rationale

1. Constraint (a) preserves Pillar 4. Learning requires seeing the thing that killed you.
2. Constraint (b) preserves Pillar 2. An unreadable telegraph is not difficulty; it is noise.
3. With both constraints, darkness becomes an _information management_ challenge — do I spend time relighting braziers? — rather than a visibility punishment. That is a genuinely new question and satisfies Pillar 5.
4. Phase 3's "boss as a beacon in total dark" turns the constraint into the most dramatic moment in the fight.

### Consequences

**Positive:** World 3 gets a genuinely novel mechanic without fairness problems.

**Negative:** constraint (b) is a hard technical requirement on every enemy's rendering path, and a hard requirement on the art (windup frames must read at 25% additive glow). Checked by `check-dark-hazards.ts` and by the telegraph validator.

**Also negative:** the light mask is the most expensive rendering feature in the game (0.42 ms) and is the first candidate for the degradation ladder.

### Revisit If

Playtests show World 3 has a materially higher death rate than Worlds 2 and 4 from causes players describe as "I couldn't see it."

---

## ADR-019 — Seeded RNG everywhere

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Technical Director
**Affects:** `03-Technical-Architecture.md` §16, `16-Coding-Standards.md` §5.6

### Context

The game needs randomness for enemy attack selection, particle spread, drop rolls, and camera shake offsets. `Math.random()` is the obvious choice.

### Options

| Option                                               | Pros                                                                                 | Cons                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| **`Math.random()`**                                  | Zero effort                                                                          | Non-reproducible; makes bug reports unactionable; forecloses replays |
| **A seeded PRNG, used everywhere**                   | Deterministic; reproducible bugs; enables replays, ghosts, and reliable perf testing | Must be threaded to every consumer; needs a lint rule                |
| **Seeded for gameplay, `Math.random` for cosmetics** | Slightly less plumbing                                                               | The boundary is unclear and will erode                               |

### Decision

**A seeded `mulberry32` PRNG in `src/core/Rng.ts`, registered as a service, used for every random value in the game. `Math.random()` is banned by ESLint outside that one file.**

### Rationale

1. **Cost today: near zero.** One 20-line file and a lint rule.
2. **Deterministic performance testing.** The CI frame-time gates replay a recorded input sequence. Without determinism, frame times vary run to run and the gate is noise (`15-Performance.md` §9.2). This benefit is immediate, not speculative.
3. **Reproducible bug reports.** "Seed 48291, level 3-2, input log attached" is actionable. "It happened once" is not.
4. **Keeps the replay/ghost door open.** Combined with fixed-step physics (ADR-005), recording an `InputFrame[]` and replaying it deterministically becomes feasible post-launch. Retrofitting determinism later would be a large refactor; building it in costs nothing.

### Consequences

**Positive:** deterministic CI performance gates — which is worth the decision on its own. Reproducible bugs. Replays remain possible.

**Negative:** `Rng` must be threaded to consumers (via `Registry` or constructor injection). A small ongoing discipline cost.

**Enforced:** `no-restricted-properties` on `Math.random`, with an exemption scoped to `src/core/Rng.ts`. Also checked by `check-portability.ts`.

### Revisit If

Never. The cost is trivial and the benefits are already being used.

---

## ADR-020 — Audio may come from a non-CraftPix vendor

**Status:** 🟡 **Proposed** — decision required before M9 · **Date:** 2026-08-07
**Deciders:** Art Director, Producer
**Affects:** `05-Asset-Pipeline.md` §9.6, `13-UI-UX.md` §12.4

### Context

The project brief states that all gameplay assets must come from CraftPix, to maintain visual cohesion. CraftPix's catalogue is predominantly visual. The game needs approximately 66 sound effects and 14 music tracks.

Read literally, "CraftPix only" would block audio procurement entirely.

### Options

| Option                                     | Pros                                  | Cons                                                                                                           |
| ------------------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Ship with no audio**                     | No decision needed                    | A silent action platformer is materially worse. Audio is the strongest telegraph tool available in dark worlds |
| **CraftPix only, even for audio**          | Literal compliance                    | May be impossible; would produce a poor or incomplete soundscape                                               |
| **License audio from a specialist vendor** | Good audio; no visual cohesion impact | An explicit exception to the stated constraint                                                                 |
| **Commission original audio**              | Best fit                              | Cost and schedule beyond the project's scope                                                                   |

### Proposed decision

**Audio may be sourced from a non-CraftPix vendor.** The CraftPix-only constraint is understood to govern _visual_ cohesion, which audio does not affect.

### Rationale

1. The constraint's purpose, stated in `04-Art-Direction.md`, is "one cohesive visual identity." Audio has no visual identity.
2. Audio is not merely polish here — it is the strongest telegraph channel available, and `08-Enemy-System.md` §7.4 identifies audio telegraphs as the highest-priority audio work precisely because World 3's darkness reduces visual readability.
3. Every audio hook point already ships wired to a `NullAudioBackend` (`13-UI-UX.md` §12.4), so adding real audio requires zero gameplay code changes.

### Consequences if accepted

**Positive:** a complete soundscape becomes achievable. Audio telegraphs improve World 3's fairness.

**Negative:** a second vendor relationship, a second licence-archival process, and a new set of pipeline gates (format, loudness normalisation to −16 LUFS, loop-point verification, size budget).

### Consequences if rejected

The game ships silent. `AudioSystem` and every hook point remain in place, so audio could be added post-launch without code changes. This is a viable, if diminished, outcome.

### Decision required by

**M9 (May 2027)**, so that procurement and integration fit within M10 and M11.

---

## ADR-021 — Staggered enemy vision at 10 Hz

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Technical Director
**Affects:** `08-Enemy-System.md` §10.2, `15-Performance.md` §8.2

### Context

A 40-enemy stress test measured the `ai` system at 2.80 ms — 187% of its 1.5 ms budget. Profiling attributed 91% of that to `VisionCone.canSee`, specifically the tilemap raycast for line-of-sight.

### Options

| Option                                   | Saving  | Cost                                                                                               |
| ---------------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| **Remove line-of-sight**                 | 2.5 ms  | Enemies see through walls. Violates `08-Enemy-System.md` P6 ("enemies do not cheat"). **Rejected** |
| **Cheaper raycast algorithm**            | ~0.4 ms | Marginal; does not solve the problem                                                               |
| **Cache results per tile pair**          | ~1.9 ms | Cache invalidation on any movement; substantial complexity                                         |
| **Stagger to 10 Hz, keyed on entity id** | ~2.2 ms | 100 ms of sight latency                                                                            |

### Decision

**Vision raycasts run at 10 Hz, staggered across frames by `(frameCount + entityId) % 6 === 0`.**

### Rationale

1. The 100 ms latency is **imperceptible**, because every enemy has a mandatory `ALERT` state of 300–600 ms before it acts. A player cannot detect that the enemy noticed them 60 ms late when the enemy then spends half a second visibly reacting.
2. Staggering by entity id spreads the cost evenly with zero coordination — at most one-sixth of enemies raycast on any frame.
3. It preserves P6 completely. Line-of-sight remains fully honest; it is merely sampled less often.

### Consequences

**Positive:** 2.80 ms → 0.61 ms, a 78% reduction. A CI gate was added at 1.0 ms.

**Negative:** an enemy can, in a narrow window, fail to notice a player who briefly enters and leaves its cone within 100 ms. This is arguably desirable — it rewards fast movement.

### Revisit If

Enemy count rises substantially, or a mechanic requires sub-100 ms reaction.

---

## ADR-022 — One Graphics object for boss ground indicators

**Status:** ✅ Accepted · **Date:** 2026-08-07 · **Deciders:** Technical Director
**Affects:** `09-Boss-System.md` §10.2, `15-Performance.md` §8.4

### Context

Boss attacks draw ground indicators during their windup — cones, circles, rectangles, and beam paths. The initial implementation used one `Sprite` per indicator. During Golem Sovereign phase 2, with four pillars, two beams, and three shockwave paths, draw calls hit 48 against a budget of 40.

### Options

| Option                           | Draw Calls | Notes                                                                                   |
| -------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| **Sprite per indicator**         | +9         | Simple; over budget                                                                     |
| **Pre-rendered indicator atlas** | +1         | Cones and beams have variable angles and lengths; would need many pre-rendered variants |
| **One shared `Graphics` object** | +1         | Redrawn per frame; arbitrary shapes and angles free                                     |
| **A custom shader**              | +1         | Overkill; introduces the project's first shader                                         |

### Decision

**A single `Graphics` object, cleared and redrawn each frame, rendering every active indicator.**

### Rationale

1. One draw call regardless of indicator count.
2. Arbitrary cones, angles, and lengths come free — no pre-rendered variants needed for the Gorgon's four escalating gaze cone sizes.
3. The fill-over-windup opacity animation becomes a single alpha multiply per indicator, rather than nine separate tweens.
4. Measured at 0.11 ms for four simultaneous indicators — cheaper than the sprite version it replaced.

### Consequences

**Positive:** 48 → 24 draw calls. Frame time in Sovereign phase 2: 15.1 ms → 11.8 ms. The opacity animation simplified substantially.

**Negative:** indicators cannot use textured art — they are flat fills with a border. Given the art direction (flat, 1 px borders, no gradients), this is not a loss.

**Also:** `Graphics` redraw allocates internally in some Phaser versions. Verified against the heap-growth test: no growth observed.

### Revisit If

An indicator design requires a texture, or the heap-growth test ever flags `Graphics` allocation.

---

## ADR-023 — M1 constants lock

**Status:** ✅ Accepted · **Date:** 2026-08-11 · **Deciders:** Technical Director
**Affects:** `00-README.md` §5.2/§5.3, `06-Characters.md` §5.2, `src/config/GameConstants.ts`, `public/assets/data/characters/*.json`, `CLAUDE.md`

### Context

`M1-T20` (Week 5, session S20) ran the full tuning protocol against the spec values shipped since M0: a solo sweep of `GRAVITY_Y`, Samurai `runSpeed`, and Samurai `jumpVelocity` at ±15% against the spike-00 baseline notes (`plans/spike-00/results.md`), followed by three independent playtests with people who had not played the build.

Sweep findings (measured live via the feel-test level's debug HUD, not simulation):

| Constant               | −15%         | Spec (locked)       | +15%         |
| ---------------------- | ------------ | ------------------- | ------------ |
| `GRAVITY_Y`            | 38.0 px peak | 900 → 31.5 px peak  | 28.9 px peak |
| Samurai `runSpeed`     | 76.5 px/s    | 90 px/s             | 103.5 px/s   |
| Samurai `jumpVelocity` | 24.8 px peak | −240 → 31.5 px peak | 43.5 px peak |

The measured baseline peak (31.5 px) sits inside the 32 ± 0.5 px band from spike-00's simulated 32.2 px. All three sweep directions matched spike-00's S0-T6 qualitative predictions (e.g. lower gravity trending floaty, higher gravity trending harsh with a peak further below target), giving no positive signal to move off spec in either direction.

All three playtests (`M1-S20` Days 2 and 4) came back clean: zero "it didn't register" reports, i.e. zero occurrences against the Pillar 1 falsification threshold of >1 per 10 minutes (`02-Game-Pillars.md` §5.1.4). `npm run test:pillars` stayed green (5/5) throughout every sweep.

`M1-T21` (latency) could not use the plan's specified method — a 240 fps phone camera was not available. Latency was instead measured with an in-browser console harness timing native `keydown` events against the first `requestAnimationFrame` in which the debug HUD showed `STATE JUMP`. This does not capture GPU compositing or monitor scan-out, which the phone-camera method exists specifically to catch (worth up to roughly one frame, ~16.7 ms at 60 Hz, unaccounted for).

### Decision

**Lock all M1 Feel constants (`00-README.md` §5.2/§5.3, mirrored in `GameConstants.ts` and the four character JSON files) at their existing spec values — no changes.** Further changes to any locked value require a new ADR per `00-README.md` §9.5.

**Accept the `M1-T21` latency result as measured** (20/20 trials, p99/worst 8.2 ms, range 1.0–8.2 ms) rather than blocking on camera hardware. Even with a conservative +16.7 ms correction for the unmeasured monitor/compositor stage, the corrected estimate (~24.9 ms) clears the 50 ms target with more than 2× headroom.

### Rationale

1. Nothing in the sweep or the three playtests produced a reason to move off spec — the falsification test (the one instrument that would justify a change) triggered zero times.
2. `docs/00-README.md` §5 explicitly frames the pre-prototype values as "a starting point... expected to change during the Feel Prototype milestone... do not treat pre-prototype tuning values as sacred — treat the process of tuning them as sacred." The process ran in full; it converged on the starting values themselves.
3. The latency margin is large enough (>2×) that the software-proxy method's blind spot does not change the pass/fail outcome, even under a pessimistic correction.

### Consequences

**Positive:** Constants lock with a documented sweep + playtest trail, satisfying the M1 exit gate's tuning requirements without inventing values that weren't actually validated. `check-constants` and `check-character-values` both stay green with zero diff.

**Negative:** `M1-T21`'s number is a lower bound, not a true glass-to-glass measurement — the exit gate's literal "240 fps capture" language is not satisfied. If a phone or camera becomes available later, a real capture would close this gap; given the >2× margin, a regression to failing is considered unlikely but not proven.

### Revisit If

A future playtest (any milestone) reports "it didn't register" above the Pillar 1 threshold, or 240 fps camera hardware becomes available and a real capture is run — either result should append a note here rather than silently re-tuning.

---

## 6. Implementation Notes

### 5.1 When to Write an ADR

| Situation                                        | ADR?            |
| ------------------------------------------------ | --------------- |
| Choosing a library or framework                  | **Yes**         |
| Choosing between two architectural patterns      | **Yes**         |
| A design decision that a stranger would question | **Yes**         |
| Rejecting a proposed feature for a pillar reason | **Yes**         |
| A performance optimisation with a real trade-off | **Yes**         |
| Changing a locked constant                       | **Yes**         |
| Invoking or declining a cut line                 | **Yes, always** |
| Adding an exception to a stated constraint       | **Yes**         |
| Naming a variable                                | No              |
| Fixing a bug                                     | No              |
| Adding a level                                   | No              |
| Refactoring with no behaviour change             | No              |

### 5.2 Superseding

An ADR is never edited. To reverse a decision:

1. Write a new ADR describing the new context and the new decision.
2. In its Context, state what changed since the original.
3. Edit **only the Status line** of the original: `**Status:** Superseded by ADR-XXX`.
4. Add the superseding ADR to the index.

```markdown
## ADR-005 — Arcade Physics over Matter.js

**Status:** ⛔ Superseded by ADR-034 · **Date:** 2026-08-07
```

The original text stays intact. Someone reading ADR-034 needs to know what we believed in 2026 and why it stopped being true.

### 5.3 Citing ADRs

ADRs are cited from:

- **Lint rule messages** — `'Use Registry.get("rng"). Determinism enables replays.'` traces to ADR-019.
- **Code comments** — `// ponytail: 45° slopes only. Arbitrary angles would need Matter.js (ADR-005).`
- **Commit footers** — `Refs: ADR-011`
- **Documentation** — every doc's Cross References section
- **Review comments** — "This is settled by ADR-017."

**A rejected proposal that cites an ADR is closed in one line.** That is the mechanism G2 describes.

### 5.4 The Decision Backlog

Decisions identified as necessary but not yet made:

| Topic                              | Decide By                  | Owner         | Notes                                |
| ---------------------------------- | -------------------------- | ------------- | ------------------------------------ |
| Audio vendor (ADR-020)             | M9                         | Producer      | Currently Proposed                   |
| Castle tileset source              | M9                         | Art Director  | Licensed pack vs. graveyard recolour |
| Cut Line A: invoke or decline      | M7 (Mar 26)                | Producer      | ADR required either way              |
| Cut Line B: invoke or decline      | M9 (May 28)                | Producer      | ADR required either way              |
| `enemies-w4` atlas split           | M9                         | Tech Director | Only if the atlas overflows          |
| Steam wrapper (Tauri vs. Electron) | Post-launch                | Tech Director | Tauri preferred; see `03` §14.1      |
| Per-world atlas eviction           | If texture memory > 110 MB | Tech Director | Implemented, disabled                |

---

## 7. Architecture — How ADRs Bind to the Codebase

An ADR is only useful if the thing it decided can be traced back to it. Four
binding mechanisms exist, in decreasing order of strength.

```mermaid
flowchart TD
    ADR[("ADR-NNN")]

    ADR -->|strongest| LINT["ESLint rule message<br/>'Use Registry.get(\"rng\"). Determinism enables replays.'<br/>→ ADR-019"]
    ADR -->|strong| CI["CI check<br/>check-portability.ts, check-cutlines.ts<br/>→ ADR-003 §14.2, ADR-002"]
    ADR -->|medium| CODE["Source comment<br/>// ponytail: 45° slopes only (ADR-005)"]
    ADR -->|weakest| DOC["Documentation cross-reference<br/>every doc's §Cross References table"]

    LINT --> DEV["Developer hits the rule<br/>and gets the reasoning immediately"]
    CI --> DEV
    CODE --> READER["Reader of the code<br/>finds the reasoning in place"]
    DOC --> SEEKER["Someone actively looking<br/>finds the reasoning"]

    style LINT fill:#1f4d2e,stroke:#2fbf6b,color:#fff
    style DOC fill:#4d3f1f,stroke:#ffd23f,color:#fff
```

**The strength ordering matters.** A decision bound only by documentation will
eventually be violated by someone who did not read the documentation. A decision
bound by a lint rule cannot be violated without an explicit, visible override.

**Which ADRs are bound at which strength:**

| Binding            | ADRs                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint rule          | 005 (no Matter import), 006 (tsconfig), 008 (no literal depths), 013 (`add.text` ban), 015 (schema validation), 019 (`Math.random` ban), plus the portfolio-isolation rule from `12-Portfolio-System.md` §5.3 |
| CI check           | 002 (`/resume` build + WCAG), 003 (bundle size), 009 (`check-portability`), 012 (pillar checks), 018 (`check-dark-hazards`), 021/022 (perf gates)                                                             |
| Source comment     | 004, 005, 007, 011, 014, 016, 017                                                                                                                                                                             |
| Documentation only | 001, 010, 020, 023+                                                                                                                                                                                           |

**The four documentation-only ADRs are the ones most at risk of being
re-litigated.** ADR-001 in particular is the reason §8 of `20-Future-Ideas.md`
exists — a Declined entry that cites an ADR is a second binding mechanism for a
decision that cannot be encoded in a lint rule.

---

## 8. Examples — ADRs in Use

### 8.1 Closing a Proposal by Citation

> **Proposal, month 7:** "Let's add a fourth charm slot — players have all ten
> charms by World 4 and only three slots feels stingy."
>
> **Response:** "ADR-017. Four slots was prototyped; players converged on one
> dominant loadout and stopped engaging with the system by World 2. The
> three-slot constraint is what makes swapping in Lantern for World 3 a real
> decision. The 'feels stingy' observation is real though — worth checking
> whether the _cosmetic_ sink (F09) is a better answer to having spare coins."

**One citation, one line, and the underlying observation still gets taken
seriously.** That is the difference between a decision log and a wall.

### 8.2 Superseding a Decision

Hypothetically, in month 9, the light mask proves too slow on the low tier even
after the degradation ladder:

```markdown
## ADR-034 — Replace the World 3 light mask with a static ambient gradient

**Status:** ✅ Accepted · **Date:** 2027-04-18 · **Supersedes:** part of ADR-018

### Context

ADR-018 approved darkness for World 3 with two constraints. Both hold. What
has changed is measurement: on the low tier (2017 Intel HD 620), the light
mask costs 1.8 ms rather than the 0.42 ms measured on minimum spec, pushing
3-3 to 19 ms/frame. The degradation ladder's tier-4 fallback triggers for
most low-tier players, meaning they see the static version anyway — but only
after 5 seconds of stutter.
...
```

And ADR-018's status line — **and only its status line** — becomes:

```markdown
**Status:** ⚠️ Partially superseded by ADR-034 · **Date:** 2026-08-07
```

The original text stays. Someone reading ADR-034 needs to know that in 2026 we
believed a radial mask was affordable, and what measurement changed that.

### 8.3 An ADR That Prevented a Bad Fix

**Bug report, month 5:** "Hit stop feels like the game is lagging on my laptop."

**Without ADR-014**, the plausible response is to reduce hit-stop durations,
which weakens Pillar 2 across the whole game to address one report.

**With ADR-014**, the response is a triage against three known causes:

| Cause                        | Check                                  | Result                                                          |
| ---------------------------- | -------------------------------------- | --------------------------------------------------------------- |
| Freezing the whole scene     | Do particles continue during a freeze? | ✅ They do                                                      |
| Freezing input               | Is input buffered through the freeze?  | ❌ **No** — the buffer was cleared on freeze entry, not on exit |
| An actual frame-rate problem | Is p99 within budget on that machine?  | ✅ 14.2 ms                                                      |

**Root cause: cause 2, a real bug.** Six lines changed in `InputSystem`. Hit
stop durations unchanged. The report was accurate and the proposed fix was
wrong, and the ADR is what made the difference visible.

---

## 9. Data Structures — The ADR Record

The records are prose, but their metadata is machine-readable so the index in
§4.2 and the binding table in §7 can be verified rather than hand-maintained.

```ts
// tools/docs/adr.ts

export type AdrStatus =
  | { readonly kind: 'proposed'; readonly decideBy: string } // milestone or ISO date
  | { readonly kind: 'accepted' }
  | { readonly kind: 'superseded'; readonly by: string; readonly partial: boolean }
  | { readonly kind: 'deprecated'; readonly reason: string };

export type AdrBinding = 'lint' | 'ci' | 'comment' | 'docs-only';

export interface AdrOption {
  readonly name: string;
  readonly pros: readonly string[];
  readonly cons: readonly string[];
  readonly chosen: boolean;
}

export interface Adr {
  readonly id: string; // 'ADR-017'
  readonly title: string;
  readonly status: AdrStatus;
  readonly date: string; // ISO 8601
  readonly deciders: readonly string[];
  readonly affects: readonly string[]; // doc filenames and module paths
  readonly options: readonly AdrOption[]; // MUST contain >= 2, exactly 1 chosen
  readonly consequences: {
    readonly positive: readonly string[];
    readonly negative: readonly string[]; // MUST be non-empty
  };
  readonly revisitIf: string;
  readonly binding: AdrBinding;
}
```

**Three invariants `check-adrs.ts` enforces:**

| Invariant                                                                                     | Rationale                                                                                             |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `options.length >= 2` with exactly one `chosen`                                               | §3 P2 — an ADR listing only the chosen option is a press release                                      |
| `consequences.negative.length >= 1`                                                           | §3 P3 — every decision costs something. An ADR with no downside is not honest and will not be trusted |
| Every `superseded` status names an existing ADR, and that ADR's Context mentions what changed | §5.2 — a supersession without a stated change is an unexplained reversal                              |

A fourth check runs against the codebase rather than the document: **every ADR
declared `binding: 'lint'` must have its id appear in at least one ESLint rule
message.** A decision claiming lint enforcement that has no rule is a decision
that is not actually enforced.

---

## 10. Future Expansion — This Log

| Item                                         | Trigger                | Notes                                                                                                                                            |
| -------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Generated index**                          | Past ~40 ADRs          | Parse records into `Adr[]` and emit §4.2 and the §7 binding table. Removes hand-maintenance drift                                                |
| **`check-adrs.ts`**                          | Now, ~1 day            | The three invariants in §9. High value: it catches the press-release failure mode automatically                                                  |
| **ADR-to-code link check**                   | With `check-adrs.ts`   | Verify every `binding: 'lint'` ADR appears in a rule message                                                                                     |
| **Annual supersession review**               | Yearly                 | Re-read accepted ADRs against current measurements. ADR-018 and ADR-021 both rest on numbers that could change with new hardware or content      |
| **Steam-port ADR block**                     | Steam port             | Wrapper choice, achievement mapping, Cloud-save conflict resolution. Likely 4–6 records                                                          |
| **Audio ADR block**                          | After ADR-020 resolves | Vendor, format, loudness target, licensing archival process                                                                                      |
| **A "decisions we got wrong" retrospective** | Post-launch            | Not a new format — the supersession chain already records it. But a short summary would be the single most useful thing to hand a future project |

**Deliberately not planned:** a lightweight ADR format for small decisions.
§3 P5 already says small decisions do not need one, and adding a second, lighter
format would blur that line until every variable name got a record.

---

## 11. Acceptance Criteria

- [ ] Every ADR referenced from another document exists here with a matching number.
- [ ] Every ADR follows the §4.1 format, including Options, Consequences, and Revisit If.
- [ ] Every ADR lists at least two rejected options with their real trade-offs.
- [ ] Every ADR's Consequences section includes at least one negative.
- [ ] No accepted ADR has been edited except for its Status line.
- [ ] Every superseded ADR links to its successor, and the successor states what changed.
- [ ] Every lint rule with a project-specific rationale cites an ADR in its message.
- [ ] The decision backlog (§6.4) has an owner and a date for every entry.
- [ ] Both cut-line decisions are recorded as ADRs at their decision dates, whether or not the cut is invoked.
- [ ] `ADR-020` is resolved from Proposed before M9 closes.

---

## 12. Out of Scope

| Excluded                           | Reason                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Implementation details**         | An ADR records the decision, not the code. The owning document has the specification                                           |
| **Bug fixes**                      | Not decisions                                                                                                                  |
| **Content decisions**              | "World 3 is a graveyard" is a design choice recorded in `10-Level-Design.md`, not an ADR — unless a stranger would question it |
| **Reversible, low-cost choices**   | P5. A choice that costs an hour to change does not need a record                                                               |
| **Meeting minutes**                | An ADR is the outcome, not the discussion                                                                                      |
| **Personnel or process decisions** | Unless they change the architecture                                                                                            |
| **Post-launch decisions**          | Recorded when made, not planned here                                                                                           |

---

## 13. Cross References

| Topic                                                         | Document                       |
| ------------------------------------------------------------- | ------------------------------ |
| Change control requiring an ADR for MAJOR doc versions        | `00-README.md` §9.5            |
| M1 constants lock: ADR-023                                    | `00-README.md` §5.2/§5.3       |
| Vision decisions: ADR-001, ADR-002                            | `01-Vision.md` §7              |
| Pillar precedence used in ADR-012                             | `02-Game-Pillars.md` §11       |
| Architecture decisions: ADR-003, 005, 006, 007, 010, 015, 019 | `03-Technical-Architecture.md` |
| Resolution decision: ADR-008                                  | `04-Art-Direction.md` §5       |
| Asset constraint exception: ADR-020                           | `05-Asset-Pipeline.md` §9.6    |
| Character decisions: ADR-011, ADR-012                         | `06-Characters.md`             |
| Combat decision: ADR-014                                      | `07-Combat.md` §6.2            |
| Enemy framework: ADR-007; vision staggering: ADR-021          | `08-Enemy-System.md`           |
| Indicator rendering: ADR-022                                  | `09-Boss-System.md` §10.2      |
| Darkness constraints: ADR-018                                 | `10-Level-Design.md` §7.3      |
| Progression decisions: ADR-016, ADR-017                       | `11-Progression.md`            |
| Portfolio decisions: ADR-002, ADR-009                         | `12-Portfolio-System.md`       |
| Input decision: ADR-013                                       | `13-UI-UX.md` §5.1             |
| Performance decisions: ADR-021, ADR-022                       | `15-Performance.md` §14        |
| Lint rules citing ADRs                                        | `16-Coding-Standards.md` §7    |
| Cut-line decisions requiring ADRs                             | `17-Roadmap.md` §8             |
| Rejected ideas that did not warrant an ADR                    | `20-Future-Ideas.md`           |
