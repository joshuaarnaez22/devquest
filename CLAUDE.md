# DevQuest — Claude Code Instructions

2D side-scrolling action platformer. Phaser 3 + TypeScript, browser, 320×180 internal, 60 fps.
Four heroes, five worlds, five bosses. Each boss unlocks one section of the developer's portfolio.

**`docs/` (21 documents) is the authoritative specification. This file is the operational summary.**
Where this file and a doc disagree, the doc wins.

---

## Status

```
PHASE:      M1 Feel Prototype — in progress · next session M1-S11 (M1-T11 dash) · ▶ Checkpoint B done
NEXT:       plans/M01-feel-prototype/plan.md (5 wk · 23 sessions · S01–S10 done · Checkpoint B)
THEN:       plans/M02-combat-feel/plan.md
OPEN P0/P1: 0
NOTES:      docs/audits/milestone-M0.md · spike notes in plans/spike-00/results.md · npm run level:test
```

Update this block at every milestone close.

**Milestone close / status sync:** use the project skill
[`.cursor/skills/milestone-doc-sync/SKILL.md`](.cursor/skills/milestone-doc-sync/SKILL.md) —
docs, audit, `CLAUDE.md`, **and** `plans/<id>/plan.md` in the same pass.

---

## Before writing any code

1. **Read the current plan** — `plans/<milestone>/plan.md`. It has the task list, files, and exit gate.
2. **Read the doc that owns the system** you are touching (table below).
3. **Do not invent behaviour.** If the spec does not define it, stop and ask. The docs are unusually complete; if something seems unspecified, you have probably not found the right section.
4. **Do not build ahead of the plan.** A task not in the current milestone does not get built, even if it is quick.

---

## Which doc owns what

| Working on…                                 | Read                                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| Any constant, resolution, budget            | `docs/00-README.md` §5 — **canonical, mirrored in `src/config/GameConstants.ts`** |
| Whether a feature should exist              | `docs/02-Game-Pillars.md`                                                         |
| Module layout, boundaries, scenes, systems  | `docs/03-Technical-Architecture.md`                                               |
| Palette, depth, sprite scale, VFX           | `docs/04-Art-Direction.md`                                                        |
| Importing or harmonising an asset           | `docs/05-Asset-Pipeline.md`                                                       |
| Player movement, heroes, abilities          | `docs/06-Characters.md`                                                           |
| Hitboxes, damage, hit stop, poise           | `docs/07-Combat.md`                                                               |
| Enemy AI, behaviours, encounters            | `docs/08-Enemy-System.md`                                                         |
| Boss phases, arenas, attack modules         | `docs/09-Boss-System.md`                                                          |
| Tiled, level metrics, world mechanics       | `docs/10-Level-Design.md`                                                         |
| Coins, charms, save data                    | `docs/11-Progression.md`                                                          |
| Codex, unlocks, `/resume`                   | `docs/12-Portfolio-System.md`                                                     |
| Menus, HUD, input, accessibility            | `docs/13-UI-UX.md`                                                                |
| Animation naming, timing, procedural motion | `docs/14-Animation-Standards.md`                                                  |
| Anything performance                        | `docs/15-Performance.md`                                                          |
| Style, testing, git, CI                     | `docs/16-Coding-Standards.md`                                                     |
| Schedule, gates, cut lines                  | `docs/17-Roadmap.md`                                                              |
| A term you do not recognise                 | `docs/18-Glossary.md`                                                             |
| "Why is it like this?"                      | `docs/19-Decisions.md`                                                            |
| A new idea                                  | `docs/20-Future-Ideas.md` — **park it there, do not build it**                    |

---

## Non-negotiables

Six rules that are never waived. All six are lint- or CI-enforced.

| #   | Rule                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | `strict: true` + `noUncheckedIndexedAccess`. A bare `!` needs a justifying comment                                    |
| 2   | No `any`. `unknown` is fine                                                                                           |
| 3   | No browser globals (`window`, `document`, `localStorage`, `navigator`, `fetch`, `setTimeout`) outside `src/platform/` |
| 4   | No `Math.random()` outside `src/core/Rng.ts`                                                                          |
| 5   | No layer-boundary violations (`docs/03-Technical-Architecture.md` §6.1)                                               |
| 6   | No dependency cycles                                                                                                  |

Plus three that are equally absolute:

- **No `this.add.text`.** All text is `BitmapText` (`docs/04-Art-Direction.md` §9.2).
- **Animation never gates a state transition.** Animators receive `Readonly<Snapshot>` and have no body access (`docs/02-Game-Pillars.md` §5.1.5).
- **Zero heap allocation in steady-state gameplay.** Everything repeated is pooled (`docs/15-Performance.md` §6).

---

## Architectural shape

```
src/
  config/      GameConstants, Palette, Depth, SystemOrder   ← no imports except config
  platform/    Storage, Clock, Gamepad, Env                 ← the ONLY place browser APIs live
  core/        EventBus, StateMachine, ObjectPool, Registry, Rng, Result
  systems/     17 per-frame systems, order declared in config/SystemOrder.ts
  components/  Health, Poise, Hitbox, Hurtbox, VisionCone, …
  entities/    Entity, Player, Enemy (ONE class), Boss (ONE class), Projectile, …
  level/       LevelLoader, ObjectFactory, TileCollision
  ui/          UiBuilder, FocusManager, widgets
  scenes/      Boot, Preload, Title, Game, UI, Pause, Codex, …
  portfolio/   PortfolioSystem — must stay deletable in under 2 hours
```

**A layer may import from layers below it, never above.** Enforced by `eslint-plugin-boundaries`.

### The three rules that shape everything

1. **One `Enemy` class, one `Boss` class.** All 21 enemy configurations and 5 bosses are JSON + composed behaviour modules. Adding an enemy is zero TypeScript. Never write a subclass — write a new behaviour module instead.
2. **Content is data.** Enemies, bosses, levels, characters, charms, and menus are JSON validated at boot.
3. **Systems communicate through the typed event bus.** Entities never import systems. Systems never reach into scenes.

---

## Commands

| Command                  | Does                                                                  |
| ------------------------ | --------------------------------------------------------------------- |
| `npm run dev`            | Vite dev server                                                       |
| `npm run build`          | Production build                                                      |
| `npm run typecheck`      | tsc, no emit                                                          |
| `npm run lint`           | ESLint incl. boundaries                                               |
| `npm test`               | Vitest unit                                                           |
| `npm run test:e2e`       | Playwright                                                            |
| `npm run test:pillars`   | Automated pillar targets                                              |
| `npm run level:test`     | Boot feel-test GameScene (Checkpoint A); later: `-- w1-1` + `F1`–`F4` |
| `npm run level:validate` | Six level checks                                                      |
| `npm run assets:build`   | Harmonise → slice → pack → budget                                     |
| `npm run assets:verify`  | Density, palette, animations, AA, uniformity                          |
| `npm run docs:check`     | Template, constants parity, links                                     |

In-game: `Ctrl+Shift+D` debug overlay · `F8` frame-step · `F9` hitboxes · `F10` cull margins.

---

## Working rules

**Follow the plan.** Each milestone has a plan in `plans/` with numbered tasks. Work them in dependency order. Do not start the next milestone before the current one's exit gate passes.

**Commit per task.** Conventional Commits, scope = module, body explains _why_:

```
feat(player): add coyote time as an absolute expiry timestamp

Countdown timers drift at variable frame rates. Storing the expiry as
an absolute ms timestamp makes the 100ms window exact regardless of
frame time, and needs no per-frame decrement.

Refs: docs/06-Characters.md §5.3
```

**Update the doc in the same PR** if you change a value the doc specifies. `check-constants.ts` will fail the build otherwise.

**Park ideas, do not build them.** New idea mid-milestone → one entry in `docs/20-Future-Ideas.md`, then continue. This is the single most important process rule in the project; scope absorption is the named top risk.

**Write the ADR when you decide**, not later. A decision a stranger would question goes in `docs/19-Decisions.md` before the code lands.

---

## What kills this project

From `docs/01-Vision.md` §8.3, repeated here because these are behavioural and will not announce themselves:

| Failure                                                                      | Countermeasure                                                         |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Tuning paralysis** — endless polishing of movement, never shipping content | M1 has a hard end date. Constants lock at M1 exit; changes need an ADR |
| **Framework astronautics** — abstractions before concrete cases              | Two implementations before one abstraction. No exceptions              |
| **Portfolio creep** — the Codex grows until it dominates                     | Deletion Test at M3, M6, M9, M11. If it takes over 2 hours, prune      |
| **Scope absorption** — features added without cutting others                 | `docs/20-Future-Ideas.md` is the only legal destination                |

---

## Do not

- Add a runtime dependency. There is exactly one (Phaser) and adding a second needs an ADR.
- Use a UI framework. All UI is Phaser GameObjects built from JSON by `UiBuilder`.
- Add a backend, telemetry, or any network call. The game is fully offline.
- Build procedural generation, multiplayer, or RPG systems. All three are permanently out of scope.
- Optimise before measuring. Every budget is in `docs/15-Performance.md` §4 with a CI gate.
- Write a test for Phaser internals or Arcade Physics.
