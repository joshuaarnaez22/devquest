# M0 — Foundation

**Duration:** 3 weeks (~90 h) · **Dates:** 2026-08-10 → 2026-08-28 · **Detail:** 🔵 Full
**Roadmap:** `docs/17-Roadmap.md` M0 · **Risk:** Low

---

## Goal

Everything needed to start building, and nothing else. At the end, `main` auto-deploys
a black screen with a working loading bar, and every architectural rule in the docs is
enforced by a machine rather than by memory.

**The temptation to resist:** building gameplay. M0 produces no gameplay. A day spent
on a player controller here is a day the lint rules do not exist, and every hour after
that is written without a safety net.

---

## Preconditions

- [ ] spike-00 complete, outcome recorded
- [ ] Node 20+, git, an editor with the ESLint and Prettier extensions
- [ ] Static hosting target chosen (any — the build is a folder of files)

---

## Week 1 — Repo and toolchain (~30 h)

### M0-T1 — Scaffold and dependencies · 1 h

```bash
npm create vite@latest devquest -- --template vanilla-ts
```

```bash
cd devquest && npm i phaser@^3.90.0
```

```bash
npm i -D typescript eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-boundaries eslint-plugin-import prettier vitest @vitest/coverage-v8 @playwright/test madge husky lint-staged @commitlint/cli @commitlint/config-conventional cspell @types/node
```

```bash
npm i -D free-tex-packer-core sharp
```

**Exactly one runtime dependency.** Adding a second requires an ADR (`docs/19-Decisions.md` §5.1).

**Verify:** `npm ls --depth=0` shows `phaser` as the sole non-dev dependency.

---

### M0-T2 — `tsconfig.json` · 1 h · _depends: T1_

Copy verbatim from `docs/16-Coding-Standards.md` §5.1. Every strictness flag is deliberate;
do not soften `noUncheckedIndexedAccess` when it first annoys you.

Path aliases (`@core/*`, `@systems/*`, …) must be mirrored in `vite.config.ts` `resolve.alias`
or imports resolve in the editor and fail at build.

**Verify:** `npx tsc --noEmit` passes on an empty `src/`. Create a file with `const x: any = 1;`
and confirm the editor flags it.

---

### M0-T3 — `vite.config.ts` · 1 h · _depends: T2_

| Setting         | Value                   | Why                                                            |
| --------------- | ----------------------- | -------------------------------------------------------------- |
| `base`          | `'./'`                  | Portable to a subdirectory host and to the Tauri wrapper later |
| `resolve.alias` | Mirror `tsconfig` paths | Editor and build must agree                                    |
| `assetsInclude` | `['**/*.tmj']`          | Tiled JSON maps are importable                                 |
| `build.target`  | `'es2022'`              | Matches `tsconfig`                                             |
| `server.port`   | `5173`                  | Stable for E2E                                                 |

**Verify:** `npm run dev` starts in under 2 s. `npm run build` emits `dist/` with relative asset paths.

---

### M0-T4 — Prettier + EditorConfig · 30 min

`.prettierrc`: `printWidth: 100`, `singleQuote: true`, `semi: true`, `trailingComma: 'all'`,
`arrowParens: 'avoid'`. `.editorconfig` for non-VS-Code editors. Commit `.vscode/settings.json`
and `.vscode/extensions.json` (`docs/16-Coding-Standards.md` §12.2).

**Verify:** save a badly-formatted file; it reformats.

---

### M0-T5 — ESLint flat config · 6 h · _depends: T2_ · **the most valuable task in M0**

`eslint.config.js`, copied from `docs/16-Coding-Standards.md` §7. This is where the
architecture stops being a document and becomes enforcement.

Implement in this order, testing each before adding the next:

| #   | Rule group                                                                                                                            | Encodes                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | Base TS recommended + `no-explicit-any`, `consistent-type-imports`                                                                    | Non-negotiables 1–2                      |
| 2   | `boundaries/element-types` with the nine layers                                                                                       | `docs/03-Technical-Architecture.md` §6.1 |
| 3   | `no-restricted-globals` — `window`, `document`, `localStorage`, `navigator`, `fetch`, `setTimeout`, `setInterval`, `alert`, `confirm` | Non-negotiable 3, Steam port             |
| 4   | `no-restricted-properties` — `Math.random`, `this.add.text`                                                                           | Non-negotiable 4, ADR-019, ADR-008       |
| 5   | `no-restricted-syntax` — literal `setDepth`, `TSEnumDeclaration`, `unlocksSection` outside `src/portfolio/`                           | Art direction, portfolio isolation       |
| 6   | Scoped exemptions — `src/platform/**`, `src/core/Rng.ts`, `src/portfolio/**`, `src/config/Depth.ts`, `**/*Animator.ts`                |                                          |
| 7   | `max-lines: 400`, `complexity: 12`, `max-params: 4`, `max-depth: 4`                                                                   | §8.1                                     |
| 8   | `import/order` with the six-group ordering                                                                                            | §8.2                                     |

**Every rule message must cite the doc or ADR that motivates it.** A developer hitting a
rule should get the reasoning, not a wall.

**Verify — this is the acceptance test, do it properly:** write a scratch file that
deliberately violates each of the six non-negotiables plus `add.text` and a literal depth.
Confirm all eight fire. Then delete the file.

---

### M0-T6 — Husky, lint-staged, commitlint · 2 h · _depends: T4, T5_

```bash
npx husky init
```

`pre-commit` → `npx lint-staged`. `commit-msg` → `npx commitlint --edit $1`.

`lint-staged` per `docs/16-Coding-Standards.md` §12.1. **Keep it under 3 seconds** — typecheck
and tests belong in CI, not the hook. A slow hook gets bypassed with `--no-verify`.

**Verify:** commit a badly-formatted file (auto-fixes), then commit with message `stuff` (rejected).

---

### M0-T7 — Vitest + Playwright harnesses · 3 h · _depends: T2_

`vitest.config.ts` with the path aliases and coverage thresholds (70% on `src/core`, `src/systems`).
`playwright.config.ts` targeting Chromium, Firefox, WebKit against the **production preview build**,
never the dev server (`docs/19-Decisions.md` ADR-010 consequences).

One trivial test each to prove the harness runs.

**Verify:** `npm test` and `npm run test:e2e` both pass with one test each.

---

### M0-T8 — npm scripts · 1 h

Every command in `CLAUDE.md` § Commands must exist, even if some are stubs that echo
"not implemented" — a missing script is a broken instruction.

**Verify:** every documented command runs without "missing script".

---

## Week 2 — CI and deployment (~30 h)

### M0-T9 — CI pipeline · 8 h · _depends: T5, T7, T8_

`.github/workflows/ci.yml`, gates in the order from `docs/16-Coding-Standards.md` §11.5.
M0 implements the first ten; the last four (e2e, visual, perf, level) land as their subjects exist.

| Gate                            | M0        | Fails if                                         |
| ------------------------------- | --------- | ------------------------------------------------ |
| format                          | ✅        | Prettier would change a file                     |
| eslint                          | ✅        | Any error                                        |
| typecheck                       | ✅        | Any TS error                                     |
| boundaries + `madge --circular` | ✅        | A cycle or layer violation                       |
| unit                            | ✅        | Failure, or coverage below threshold             |
| schema                          | ✅ (stub) | Content JSON invalid — no content yet, so passes |
| migrations                      | ✅ (stub) | Missing fixture                                  |
| build                           | ✅        | Build error                                      |
| size                            | ✅        | Bundle > 1.2 MB gz, payload > 8 MB               |
| spelling                        | ✅        | Unknown word not in `project-words.txt`          |
| e2e                             | M2        |                                                  |
| visual                          | M3        |                                                  |
| levels                          | M4        |                                                  |
| perf                            | M2        |                                                  |

**Use `npm ci`, never `npm install`.** Cache `~/.npm` keyed on the lockfile hash.

**Verify:** open a PR that violates a boundary rule. CI must fail with a readable message.

---

### M0-T10 — Deployment · 4 h · _depends: T9_

Merge to `main` → build → upload `dist/`. No server, no migrations, no downtime — deployment
is a file copy (`docs/19-Decisions.md` ADR-009).

Also: branch protection on `main`, required status checks, and a staging deploy from `develop`.

**Verify:** merge to `main`; the staging URL updates within 3 minutes.

---

### M0-T11 — Doc-parity checks · 6 h · _depends: T9_

Three scripts under `tools/docs/` and `tools/ci/`. These prevent the docs and the code
drifting, which is the slow failure mode of a heavily-documented project.

| Script                          | Checks                                                                                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/docs/check-constants.ts` | Parses the tables in `docs/00-README.md` §5 and diffs against `src/config/GameConstants.ts`. Fails on any mismatch                                                               |
| `tools/docs/check-template.ts`  | Every doc `01`–`20` has all 13 required headings (`docs/00-README.md` §9.1)                                                                                                      |
| `tools/ci/check-portability.ts` | Greps for browser globals outside `src/platform/` and `Math.random` outside `src/core/Rng.ts` — a second net under the lint rules, catching anything added via a disable comment |

**Verify:** change a value in `GameConstants.ts` only. `check-constants` fails.

---

### M0-T12 — Atlas build skeleton · 8 h · _depends: T1_

`tools/atlas/` per `docs/05-Asset-Pipeline.md` §7. M0 builds the _skeleton_ — the scripts exist,
are wired into npm, and run on an empty input set.

| Script                                                              | M0 scope                                                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `build-atlas.ts`                                                    | Full — `free-tex-packer-core` with the normative options from §7.2. Deterministic sort |
| `check-budget.ts`                                                   | Full — the budget table from §7.3                                                      |
| `check-density.ts`                                                  | Full — it is needed for asset Gate 3 from M2                                           |
| `check-palette.ts`                                                  | Full — needs `src/config/Palette.ts` from T14                                          |
| `remap-palette.ts`                                                  | Full — the highest-use harmonisation script                                            |
| `deaa.ts`, `add-outline.ts`, `desaturate.ts`, `normalise-frames.ts` | **Stubs.** Written in M3 when there are assets to harmonise                            |

**Determinism matters and is easy to lose.** Sort inputs with
`Intl.Collator('en', { numeric: true })` before packing, and commit `atlas-hashes.json`
so CI can verify a rebuild is byte-identical.

**Verify:** run twice on the same input; output hashes match.

---

### M0-T13 — `README.md`, `LICENSE`, `.gitignore` · 2 h

`.gitignore` must include `public/assets/atlas/` (build artifacts) but **not**
`art/source/` (committed originals) or `public/assets/data/` (committed content).

---

## Week 3 — Core modules and boot (~30 h)

### M0-T14 — Config modules · 4 h · _depends: T2_

Four files, all `as const`, all normative, all mirrored in the docs.

| File                          | Source                           | Notes                                                    |
| ----------------------------- | -------------------------------- | -------------------------------------------------------- |
| `src/config/GameConstants.ts` | `docs/00-README.md` §5           | `DISPLAY`, `PHYSICS`, `FEEL`, `FEEDBACK`, `BUDGET`       |
| `src/config/Palette.ts`       | `docs/04-Art-Direction.md` §12   | 48 colours. Also emit `art/palettes/devquest-master.gpl` |
| `src/config/Depth.ts`         | `docs/04-Art-Direction.md` §10.1 | The only legal source of depth values                    |
| `src/config/LevelMetrics.ts`  | `docs/10-Level-Design.md` §11    | `GAP`, `HEIGHT`, `CLEARANCE`, `WORST_CASE`, `PACING`     |

**Verify:** `check-constants` passes. `check-palette` runs against a test PNG.

---

### M0-T15 — Platform layer · 4 h · _depends: T2_ · **the Steam port depends entirely on this**

`src/platform/` — the only place browser APIs are permitted.

| File                | Exposes                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `Storage.ts`        | `get`/`set`/`remove` returning `Result`. Quota handling with pruning (`docs/11-Progression.md` §8.7)    |
| `Clock.ts`          | `now()` wrapping `performance.now()`. **Mockable** — every timing test depends on this                  |
| `Env.ts`            | `isDev`, `isSteam`, browser detection                                                                   |
| `Fullscreen.ts`     | Request/exit, wrapping the Fullscreen API                                                               |
| `GamepadAdapter.ts` | Raw polling, vendor detection for glyph selection                                                       |
| `Browser.ts`        | `openExternal(url)` — used only by the Codex, with confirmation                                         |
| `index.ts`          | The `Platform` facade                                                                                   |
| `steam/`            | Empty directory with a `.gitkeep` and a README stating the interfaces the Steam build will re-implement |

**Verify:** `check-portability.ts` passes. Every browser global in the codebase is inside this folder.

---

### M0-T16 — Core primitives · 12 h · _depends: T14_ · **highest test coverage in the project**

`src/core/`. These are pure logic, used by everything, and are where a bug is most expensive.

| File                 | Spec                                                                      | Tests                                                                                             |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Result.ts`          | `docs/16-Coding-Standards.md` §5.5                                        | Trivial                                                                                           |
| `Rng.ts`             | ADR-019. mulberry32, seeded                                               | Determinism: same seed → same sequence                                                            |
| `Assert.ts`          | `docs/03-Technical-Architecture.md` §11.4. Dev-only, dead-code-eliminated | Verify stripped from the prod bundle                                                              |
| `Timer.ts`           | Timestamp-based windows                                                   | Coyote/buffer semantics                                                                           |
| `EventBus.ts`        | §5.4. Typed wrapper + `offAllFor`                                         | **`offAllFor` removes exactly the right listeners** — the leak this prevents is the #1 Phaser bug |
| `GameEvents.ts`      | §5.4. The full typed event map                                            | Compile-time only                                                                                 |
| `StateMachine.ts`    | §5.3                                                                      | **`allowed` enforcement, `force()` bypass, `timeInState`, history ring**                          |
| `ObjectPool.ts`      | §10.1                                                                     | **acquire/release/cap, recycle-oldest, double-release is a no-op, peak tracking**                 |
| `Registry.ts`        | §5.5                                                                      | Double registration throws; unknown key throws                                                    |
| `SystemRegistry.ts`  | §8.2                                                                      | Ordered update, reverse-order destroy, pause gating                                               |
| `SchemaValidator.ts` | JSON Schema 2020-12, JSON-pointer error paths                             | Rejects a malformed fixture with the right pointer                                                |

**Target: 100% coverage on `StateMachine` and `ObjectPool`.** Everything in the game is built
on these two, and both have subtle edge cases (illegal transitions, cap recycling) that will
otherwise surface as inexplicable gameplay bugs in month six.

**Verify:** `npm test` green, coverage ≥ 70% overall on `src/core`, 100% on the two above.

---

### M0-T17 — Boot and Preload scenes · 6 h · _depends: T15, T16_

| File                          | Does                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `src/main.ts`                 | Builds `Phaser.Game` from `PhaserConfig`. Registers scenes. **Nothing else**                                             |
| `src/config/PhaserConfig.ts`  | Verbatim from `docs/03-Technical-Architecture.md` §11.1                                                                  |
| `src/scenes/BootScene.ts`     | Registers services in `Registry`, loads settings, loads the save index, loads boot assets (~40 KB)                       |
| `src/scenes/PreloadScene.ts`  | Phase 1 assets, progress bar, version string, **the `/resume` link live from the first frame** (`docs/13-UI-UX.md` §8.1) |
| `src/config/AssetManifest.ts` | The three load phases (`docs/05-Asset-Pipeline.md` §5.4)                                                                 |

**Every scene wires `shutdown`.** Phaser does not do this for you:

```ts
this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
```

Also write `tools/ci/check-scenes.ts`, which statically verifies every scene class wires and
implements `shutdown`. A missing one produces bugs that appear only on the second visit to a
scene — the worst class of bug to find late.

**Verify:** loading bar reaches 100%, "ready" prints, no console errors, `Ctrl+Shift+D` reserved.

---

### M0-T18 — Buffer and gate · 4 h

Reserved for overrun. If unused, spend it on `src/core` test coverage.

---

## Exit gate

From `docs/17-Roadmap.md` M0. Every box, or a recorded cut/date-change ADR.

- [ ] `npm run dev` starts in under 2 s
- [ ] CI green end to end in under 5 minutes
- [ ] **Every non-negotiable lint rule fires when deliberately violated** (all eight, tested)
- [ ] `check-constants.ts` passes
- [ ] `check-template.ts` passes on all 20 docs
- [ ] `check-portability.ts` passes
- [ ] `check-scenes.ts` passes
- [ ] `madge --circular src/` reports zero
- [ ] A commit to `main` auto-deploys to production; `develop` to staging
- [ ] Atlas build is deterministic — two runs, identical hashes
- [ ] `ObjectPool` and `StateMachine` at 100% coverage
- [ ] `src/core` overall ≥ 70% coverage
- [ ] Loading bar reaches 100% and prints "ready", deployed
- [ ] Exactly one runtime dependency

Then: tag `v0.0.1`, write `docs/audits/milestone-M0.md`, **expand `plans/M02-combat-feel/plan.md` to 🔵 Full**.

---

## Risks

| Risk                                                             | P       | Mitigation                                                                                                                                                      |
| ---------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint flat config + `eslint-plugin-boundaries` version friction | Med     | T5 is budgeted at 6 h partly for this. If the plugin fights the flat config, fall back to `import/no-restricted-paths`, which is less expressive but sufficient |
| Atlas determinism not achieved                                   | Low     | Explicit collator sort. If `free-tex-packer-core` is still non-deterministic, pin the version and record an ADR                                                 |
| Over-building core primitives                                    | **Med** | Build only what T16 lists. No `EntityManager`, no DI container, no plugin system. The two-implementations rule applies from day one                             |
| M0 expanding past 3 weeks                                        | Med     | T18 is the buffer. Beyond that, cut T12 to stubs-only and build the atlas properly in M3                                                                        |

---

## Explicitly not in M0

| Not doing                                               | Milestone |
| ------------------------------------------------------- | --------- |
| Any gameplay, any entity, any scene beyond Boot/Preload | M1        |
| Player controller                                       | M1        |
| Combat, hitboxes                                        | M2        |
| Any asset harmonisation                                 | M3        |
| `ContentDatabase`, JSON schemas for content             | M4        |
| Enemy or boss frameworks                                | M4        |
| E2E, visual, and perf CI gates                          | M2–M3     |
| The debug overlay                                       | M2        |
| UI widgets, menus                                       | M6        |

**`src/systems/` stays empty in M0.** `SystemRegistry` exists; no system does.
