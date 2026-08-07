# 16 — Coding Standards

**Project:** DevQuest (Working Title)
**Document Owner:** Technical Director
**Status:** ✅ Stable
**Version:** 1.0.0
**Last Updated:** 2026-08-07

---

## 1. Purpose

This document defines how DevQuest's code is written, named, formatted, reviewed, tested, committed, and shipped.

Its purpose is not aesthetic consistency for its own sake. It is to make the codebase **readable by a stranger** — which, over a twelve-month project, includes the author six months from now. Every rule here exists because its absence causes a specific, observed problem.

The codebase is also a portfolio artifact (`01-Vision.md` §6.2). A fellow developer will read it. That raises the bar on clarity and lowers the tolerance for cleverness.

Rules are stated as **musts** (enforced by tooling), **shoulds** (enforced by review), and **prefers** (guidance). Where a rule is enforced automatically, the enforcement mechanism is named.

---

## 2. Goals

| # | Goal | Success Signal |
|---|------|----------------|
| G1 | Make the codebase readable by a stranger | A new contributor is productive on day one |
| G2 | Automate every rule that can be automated | Review discusses design, never formatting |
| G3 | Encode architectural invariants as lint rules | Boundary violations fail CI, not review |
| G4 | Define a testing strategy that catches real bugs | The tests that exist are the ones that would have caught the bugs we shipped |
| G5 | Define a git workflow that keeps `main` deployable | `main` is always releasable |
| G6 | Define review standards that are fast and useful | Median review turnaround under 4 hours |
| G7 | Prevent the codebase from becoming clever | No file requires a comment to explain what it does |

---

## 3. Design Principles

### P1 — Optimise for Reading
Code is read far more often than written. A slightly longer name, an explicit branch instead of a ternary chain, and a boring loop instead of a functional pipeline are all correct trades.

### P2 — Make Invalid States Unrepresentable
Prefer types that cannot express a wrong value. A `HitKind` union beats a string. A branded `EnemyDefId` beats a string. A required field beats an optional one with a runtime check.

### P3 — Automate or Drop It
A rule that depends on humans remembering is a rule that will be violated. Either encode it in the linter, the type system, or CI — or stop pretending it is a rule.

### P4 — Explicit Beats Implicit
Declared update order beats call-site order. Named constants beat literals. An explicit `readonly` beats an assumption of immutability.

### P5 — Delete Before You Add
The best change is the one that removes code. A pull request with a negative diff and the same behaviour is the highest-quality contribution available.

### P6 — Comments Explain Why, Never What
`// increment i` is noise. `// ponytail: 45° slopes only — arbitrary angles would need Matter.js (ADR-005)` is documentation.

---

## 4. Overview

### 4.1 The Toolchain

| Concern | Tool | Config | Enforcement |
|---|---|---|---|
| Language | TypeScript 5.6 | `tsconfig.json` | `npm run typecheck` |
| Formatting | Prettier 3 | `.prettierrc` | Pre-commit hook + CI |
| Linting | ESLint 9 (flat config) | `eslint.config.js` | CI |
| Boundaries | `eslint-plugin-boundaries` | Same | CI |
| Cycles | `madge` | `tools/ci/check-boundaries.ts` | CI |
| Unit tests | Vitest 2 | `vitest.config.ts` | CI |
| E2E | Playwright 1.49 | `playwright.config.ts` | CI |
| Commit messages | commitlint | `commitlint.config.js` | Pre-commit hook |
| Hooks | Husky + lint-staged | `.husky/` | Local |
| Spelling | cspell | `project-words.txt` | CI |

### 4.2 The Non-Negotiables

Six rules that are never waived, in any circumstance:

| # | Rule | Enforced By |
|---|---|---|
| 1 | `strict: true` with `noUncheckedIndexedAccess` | `tsconfig.json` |
| 2 | No `any`, ever (`unknown` is fine) | ESLint |
| 3 | No browser globals outside `src/platform/` | ESLint + `check-portability.ts` |
| 4 | No `Math.random()` outside `src/core/Rng.ts` | ESLint |
| 5 | No layer-boundary violations | `eslint-plugin-boundaries` |
| 6 | No dependency cycles | `madge --circular` |

---

## 5. Technical Design — TypeScript

### 5.1 Compiler Configuration

```jsonc
// tsconfig.json — NORMATIVE
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],

    // Strictness — every flag is deliberate.
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "useUnknownInCatchVariables": true,
    "noImplicitReturns": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,

    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,

    "baseUrl": "./src",
    "paths": {
      "@config/*": ["config/*"], "@platform/*": ["platform/*"], "@core/*": ["core/*"],
      "@systems/*": ["systems/*"], "@components/*": ["components/*"],
      "@entities/*": ["entities/*"], "@level/*": ["level/*"],
      "@ui/*": ["ui/*"], "@scenes/*": ["scenes/*"], "@data/*": ["data/*"], "@util/*": ["util/*"]
    }
  }
}
```

**On `noUncheckedIndexedAccess`:** this is the most annoying flag and the most valuable. It makes `arr[i]` return `T | undefined`, forcing an explicit handle. In a codebase built on object pools and indexed lookups, it catches exactly the class of bug that otherwise produces a `Cannot read property 'x' of undefined` three hours into a playtest.

The escape hatch, used deliberately and sparingly:

```ts
// When the index is provably valid, assert it — and say why.
const step = def.combat.combo[this.comboIndex]!;   // comboIndex is clamped to combo.length in enterAttack()
```

**A bare `!` without a justifying comment is a review failure.**

**On `exactOptionalPropertyTypes`:** distinguishes `{ x?: number }` from `{ x: number | undefined }`. This matters for the content JSON, where an absent field and an explicitly-null field mean different things.

### 5.2 Types Over Interfaces — and When Not

| Use | For |
|---|---|
| `interface` | Object shapes that might be extended or implemented: `System`, `Behaviour`, `Ability`, `EnemyDefinition` |
| `type` | Unions, intersections, mapped types, function types, tuples: `HitKind`, `BehaviourIntent`, `PortfolioBlock` |

**Discriminated unions are the default for anything with variants:**

```ts
// ✓ Invalid states unrepresentable (P2).
export type BehaviourIntent =
  | { kind: 'none' }
  | { kind: 'move'; vx: number }
  | { kind: 'requestAttack'; attackId: string };

// ✗ Every field optional; a caller can construct nonsense.
export interface BehaviourIntent {
  kind: string;
  vx?: number;
  attackId?: string;
}
```

### 5.3 Immutability

| Rule | Application |
|---|---|
| `readonly` on every interface field that is not mutated | Default. Mutability is opt-in |
| `readonly T[]` for arrays that are not mutated | Default |
| `as const` on every configuration object | `GameConstants`, `Palette`, `Depth`, `HIT_TIERS` |
| `Readonly<T>` on function parameters that must not be mutated | Snapshots passed to animators |
| No `Object.freeze` at runtime | Compile-time immutability is sufficient; freezing costs performance |

```ts
// Content is frozen structurally by the type system.
export interface EnemyDefinition {
  readonly id: EnemyDefId;
  readonly stats: {
    readonly maxHp: number;
    // …
  };
  readonly behaviours: readonly BehaviourId[];
}
```

### 5.4 Branded IDs

```ts
// src/types/ids.ts — NORMATIVE
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type EntityId     = Brand<number, 'EntityId'>;
export type EnemyDefId   = Brand<string, 'EnemyDefId'>;
export type BossDefId    = Brand<string, 'BossDefId'>;
export type CharacterId  = Brand<string, 'CharacterId'>;
export type LevelId      = Brand<string, 'LevelId'>;
export type WorldId      = Brand<string, 'WorldId'>;
export type CharmId      = Brand<string, 'CharmId'>;
export type CheckpointId = Brand<string, 'CheckpointId'>;
export type SecretId     = Brand<string, 'SecretId'>;
export type AbilityId    = Brand<string, 'AbilityId'>;
```

**Construction goes through validated factories only:**

```ts
// src/data/ContentDatabase.ts
enemyId(raw: string): EnemyDefId {
  if (!this.enemies.has(raw)) throw new Error(`Unknown enemy definition: ${raw}`);
  return raw as EnemyDefId;
}
```

The single `as EnemyDefId` cast lives inside the validator. Everywhere else, the compiler guarantees the id names real content.

### 5.5 Error Handling

Two mechanisms, used for different things:

| Mechanism | Use For |
|---|---|
| `throw` | Programmer errors: unknown content id, illegal state transition, double service registration. These are bugs and should crash loudly in dev |
| `Result<T, E>` | Expected failures: save load, storage quota, content validation. These are conditions the code must handle |

```ts
// src/core/Result.ts
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Ok  = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

```ts
// ✓ Expected failure — the caller must handle it.
const loaded = saveSystem.load(slot);
if (!loaded.ok) return this.showRecoveryDialog(loaded.error);

// ✓ Programmer error — crash.
const def = content.enemy('skeleton_basic');   // throws if missing
```

**No exceptions are caught broadly.** There is no top-level `try/catch` that swallows errors and continues. A crash in dev is a bug found; a crash silently swallowed is a bug shipped. Production has one global handler that logs to the console and shows an honest error screen.

### 5.6 Banned Constructs

| Banned | Reason | Enforcement |
|---|---|---|
| `any` | Defeats the type system | `@typescript-eslint/no-explicit-any` |
| `as` casts (except in validators and documented `!`) | Hides type errors | Review + `no-unnecessary-type-assertion` |
| `@ts-ignore` | Hides errors | `@typescript-eslint/ban-ts-comment` (`@ts-expect-error` with a description is allowed) |
| `enum` | Produces runtime code; `as const` objects are better | `no-restricted-syntax` |
| `namespace` | Legacy | ESLint |
| `var` | Legacy | `no-var` |
| `==` / `!=` | Coercion surprises | `eqeqeq` |
| `Math.random()` | Breaks determinism (`03-Technical-Architecture.md` §16) | `no-restricted-properties` |
| `console.log` in `src/` | Use the logger | `no-console` (allows `warn`/`error`) |
| `setTimeout` / `setInterval` | Use Phaser's timer (pooled, pausable, scene-scoped) | `no-restricted-globals` |
| `this.add.text` | Breaks pixel alignment (`04-Art-Direction.md` §9.2) | `no-restricted-properties` |
| Browser globals outside `src/platform/` | Breaks the Steam port | `no-restricted-globals` |
| Default exports | Harder to rename and grep | `import/no-default-export` |

**On banning `enum`:** TypeScript enums generate a runtime object and have surprising bidirectional-mapping behaviour. `as const` objects plus a derived union type give the same ergonomics with zero runtime cost:

```ts
export const Depth = { PLAYER: 20, ENEMY: 10 } as const;
export type DepthKey = keyof typeof Depth;
```

---

## 6. Naming

### 6.1 Conventions

| Kind | Convention | Example |
|---|---|---|
| File — class/system | `PascalCase.ts` | `CombatSystem.ts`, `PlayerController.ts` |
| File — module of functions | `camelCase.ts` | `math.ts`, `array.ts` |
| File — config/data | `PascalCase.ts` | `GameConstants.ts`, `Palette.ts` |
| File — test | `<subject>.test.ts` | `StateMachine.test.ts` |
| Class | `PascalCase` | `ObjectPool`, `HitStopSystem` |
| Interface | `PascalCase`, **no `I` prefix** | `System`, `Behaviour` |
| Type alias | `PascalCase` | `HitKind`, `BehaviourIntent` |
| Function / method | `camelCase`, verb-first | `resolveQueuedHits`, `computeDerived` |
| Variable | `camelCase` | `remainingHp` |
| Constant (module-level) | `SCREAMING_SNAKE` | `GRAVITY_Y`, `MAX_DELTA_MS` |
| Constant object | `PascalCase` | `Depth`, `Palette`, `HIT_TIERS` |
| Private field | `camelCase`, no underscore | `private currentKey` |
| Boolean | `is` / `has` / `can` / `should` prefix | `isGrounded`, `hasPatrolBehaviour`, `canActivate` |
| Event name | `domain:verbPast` | `combat:hit`, `boss:defeated` |
| Content id | `snake_case` | `skeleton_archer`, `w2-3` |
| Animation key | `snake_case` | `knight_attack1` |

### 6.2 Naming Rules

| Rule | Example |
|---|---|
| **Units in the name** where ambiguous | `windupMs`, `speedPxPerSec`, `radiusPx` |
| **No abbreviations** except a documented list | `hp`, `vx`, `vy`, `dt`, `id`, `ui`, `vfx`, `fsm`, `px`, `ms` |
| **Verb-first for functions** | `computeDerived`, not `derivedComputation` |
| **Noun for classes** | `CombatSystem`, not `HandleCombat` |
| **No Hungarian notation** | `enemies`, not `arrEnemies` |
| **Plural for collections** | `enemies`, `behaviours` |
| **No `Manager`, `Helper`, `Util`, `Service` suffixes** | These say nothing. `CombatSystem` not `CombatManager`; `math.ts` not `MathHelper.ts` |

**On banning `Manager`:** a class called `EntityManager` tells you nothing about what it does. If you cannot name it more precisely, it probably does too many things. The one permitted `-Manager` is `FocusManager`, because "manages focus" is genuinely the whole responsibility.

### 6.3 Domain Vocabulary

Terms used consistently across code, docs, and content. Full definitions in `18-Glossary.md`.

| Term | Means | Not |
|---|---|---|
| **Entity** | A pooled game object with a body | "actor", "object", "thing" |
| **Definition** | Immutable data describing an entity type | "config", "template", "blueprint" |
| **System** | A per-frame subsystem in `SYSTEM_ORDER` | "manager", "controller", "service" |
| **Component** | A reusable piece of entity state | "module", "part" |
| **Behaviour** | A composable enemy AI module | "AI", "brain", "strategy" |
| **Ability** | A hero's unique verb | "skill", "power", "special" |
| **Hitbox** | Where an attack hits | "attack box", "damage box" |
| **Hurtbox** | Where an entity can be hit | "collision box", "body" |
| **Poise** | Stagger resistance | "stability", "balance" |
| **Charm** | An equippable modifier | "item", "relic", "trinket" |
| **Codex** | The portfolio UI | "portfolio menu", "resume screen" |

**Consistency here matters more than the specific choices.** A codebase using "enemy", "monster", "mob", and "creature" interchangeably is a codebase where grep does not work.

---

## 7. Lint Rules That Encode Architecture

These are the rules that make architectural decisions enforceable rather than aspirational (P3, G3).

```js
// eslint.config.js — the project-specific rules. Standard rules omitted.
import boundaries from 'eslint-plugin-boundaries';

export default [
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'config',     pattern: 'src/config/*' },
        { type: 'platform',   pattern: 'src/platform/**/*' },
        { type: 'core',       pattern: 'src/core/*' },
        { type: 'systems',    pattern: 'src/systems/**/*' },
        { type: 'components', pattern: 'src/components/*' },
        { type: 'entities',   pattern: 'src/entities/**/*' },
        { type: 'level',      pattern: 'src/level/**/*' },
        { type: 'ui',         pattern: 'src/ui/**/*' },
        { type: 'scenes',     pattern: 'src/scenes/*' },
        { type: 'portfolio',  pattern: 'src/portfolio/**/*' },
      ],
    },
    rules: {
      // ── Layer boundaries (03-Technical-Architecture §6.1) ──
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          { from: 'config',     allow: ['config'] },
          { from: 'platform',   allow: ['config', 'platform'] },
          { from: 'core',       allow: ['config', 'platform', 'core'] },
          { from: 'systems',    allow: ['config', 'platform', 'core', 'components'] },
          { from: 'components', allow: ['config', 'core', 'components'] },
          { from: 'entities',   allow: ['config', 'core', 'components', 'entities'] },
          { from: 'level',      allow: ['config', 'core', 'components', 'entities', 'systems'] },
          { from: 'ui',         allow: ['config', 'platform', 'core', 'systems', 'ui'] },
          { from: 'portfolio',  allow: ['config', 'platform', 'core', 'systems', 'ui', 'portfolio'] },
          { from: 'scenes',     allow: ['*'] },
        ],
      }],

      // ── Steam portability (03 §14.2) ──
      'no-restricted-globals': ['error',
        { name: 'window',       message: 'Use src/platform/. Breaks the Steam port.' },
        { name: 'document',     message: 'Use src/platform/.' },
        { name: 'localStorage', message: 'Use platform/Storage.ts.' },
        { name: 'navigator',    message: 'Use platform/Env.ts.' },
        { name: 'fetch',        message: 'The game is offline. No network calls.' },
        { name: 'setTimeout',   message: 'Use scene.time.delayedCall (pooled, pausable).' },
        { name: 'setInterval',  message: 'Use scene.time.addEvent.' },
        { name: 'alert',        message: 'Native dialogs look wrong in a game.' },
        { name: 'confirm',      message: 'Use a UI confirmation panel.' },
      ],

      // ── Determinism (03 §16) ──
      'no-restricted-properties': ['error',
        { object: 'Math', property: 'random', message: 'Use Registry.get("rng"). Determinism enables replays.' },
        { object: 'this.add', property: 'text', message: 'Use BitmapText. See 04-Art-Direction §9.2.' },
      ],

      // ── Art direction: no literal depths (04 §10.1) ──
      'no-restricted-syntax': ['error',
        {
          selector: "CallExpression[callee.property.name='setDepth'] > Literal",
          message: 'Use a constant from src/config/Depth.ts.',
        },
        {
          selector: 'TSEnumDeclaration',
          message: 'Use `as const` objects. Enums emit runtime code.',
        },
        // ── Portfolio isolation (12-Portfolio-System §5.3) ──
        {
          selector: "MemberExpression[property.name='unlocksSection']",
          message: 'unlocksSection may only be read in src/portfolio/. See the Deletion Test.',
        },
      ],

      'import/no-default-export': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },

  // ── Scoped exemptions ──
  {
    files: ['src/platform/**/*.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
  {
    files: ['src/core/Rng.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    files: ['src/portfolio/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['src/config/Depth.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Pillar 1 guard: the animator may not touch physics (02 §5.1.5).
    files: ['src/entities/**/[A-Za-z]*Animator.ts'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: "MemberExpression[property.name='body']",
        message: 'Animators are read-only projections of state. See Pillar 1.',
      }],
    },
  },
];
```

**Every rule cites the document that motivates it.** A developer who hits one gets an explanation, not a wall.

---

## 8. Architecture — File and Module Structure

### 8.1 File Rules

| Rule | Value |
|---|---|
| One primary export per file | Class, interface, or coherent function group |
| Maximum file length | **400 lines.** Over that, split — no exceptions without a review conversation |
| Maximum function length | **50 lines.** Over that, extract |
| Maximum cyclomatic complexity | **12** (ESLint `complexity`) |
| Maximum parameters | **4.** Beyond that, take an options object |
| Maximum nesting depth | **4** |

**The 400-line limit is the most useful of these.** Files that exceed it are almost always doing two things, and splitting them almost always reveals a missing abstraction — or, more often, code that should be deleted.

### 8.2 Import Order

Enforced by `import/order`:

```ts
// 1. Node/external
import Phaser from 'phaser';

// 2. Type-only imports (grouped, always `import type`)
import type { EnemyDefinition } from '@data/types';
import type { InputFrame } from '@systems/InputSystem';

// 3. Config
import { PHYSICS, FEEL } from '@config/GameConstants';
import { Depth } from '@config/Depth';

// 4. Core
import { StateMachine } from '@core/StateMachine';
import { assert } from '@core/Assert';

// 5. Components
import { Health } from '@components/Health';

// 6. Same-layer siblings
import { EnemyAnimator } from './EnemyAnimator';
import { ENEMY_STATES } from './EnemyStates';
```

`verbatimModuleSyntax` makes `import type` mandatory for type-only imports, which is what keeps the boundary rules honest (`03-Technical-Architecture.md` §6.3).

### 8.3 File Template

```ts
/**
 * CombatSystem
 *
 * Resolves queued hits after the physics step and applies the nine-layer
 * feedback stack. See docs/07-Combat.md §6.
 *
 * Invariants:
 *  - Hits are QUEUED during physics overlap callbacks, never resolved there.
 *  - Every resolved hit fires all nine layers. HitResolution has no optional fields.
 *  - Hit stop is longest-wins, never additive.
 */

import type { ... } from '...';
import { ... } from '...';

// ── Constants ──────────────────────────────────────────────

const MAX_QUEUED_HITS = 32;

// ── Types ──────────────────────────────────────────────────

interface QueuedHit { /* … */ }

// ── Implementation ─────────────────────────────────────────

export class CombatSystem implements System {
  // public readonly fields
  // private fields
  // constructor
  // public methods
  // private methods
}
```

**The header comment states invariants, not description.** "Resolves combat" is obvious from the name. "Hits are queued, never resolved in the overlap callback" is the thing that will be broken by someone who does not know why.

### 8.4 Comments

| Comment | When |
|---|---|
| File header | Always. Purpose + invariants + doc reference |
| `/** JSDoc */` | On every exported symbol whose purpose is not obvious from its name and signature |
| `// Why` | Wherever the code is non-obvious, surprising, or a deliberate trade |
| `// ponytail:` | Marking a deliberate simplification, naming its ceiling and upgrade path |
| `// TODO(name, date):` | Only with an owner and a date. A bare `TODO` fails lint |
| `// HACK:` | Banned. Either fix it or write a `ponytail:` comment explaining the trade honestly |

```ts
// ✓ Explains a non-obvious decision.
// Cooldown is measured from dash START, not end. This makes the Ninja's
// effective downtime 210ms rather than 380ms, which is its defining feel.
// See 06-Characters §5.5.
this.dashReadyAt = now + def.movement.dashCooldownMs;

// ✓ Names a known ceiling and the upgrade path.
// ponytail: linear scan over ≤40 entities. Spatial hash if the cap ever rises.
for (const e of this.entities.all()) { /* … */ }

// ✗ Noise.
// Set the dash ready time
this.dashReadyAt = now + def.movement.dashCooldownMs;
```

---

## 9. Data Structures — Patterns and Shapes

### 9.1 Preferred Patterns

| Pattern | Where | Why |
|---|---|---|
| **Composition over inheritance** | Entities, behaviours, abilities | `03-Technical-Architecture.md` P2 |
| **Data-driven configuration** | Enemies, bosses, levels, UI, characters | P1 |
| **Object pooling** | Everything created more than once per second | `15-Performance.md` §6 |
| **Typed event bus** | Cross-system notification | Decoupling |
| **Discriminated unions** | Any value with variants | P2 |
| **Result types** | Expected failures | §5.5 |
| **Explicit registries** | Behaviours, abilities, mechanics, object types | Extension without modification |
| **Snapshot passing** | Animators, UI | Read-only by construction |

### 9.2 The Registry Pattern

Used four times, always identically:

```ts
// src/entities/enemy/behaviours/BehaviourRegistry.ts
const REGISTRY = new Map<BehaviourId, Behaviour>();

export function registerBehaviour(b: Behaviour): void {
  if (REGISTRY.has(b.id)) throw new Error(`Behaviour already registered: ${b.id}`);
  REGISTRY.set(b.id, b);
}

export function getBehaviour(id: BehaviourId): Behaviour {
  const b = REGISTRY.get(id);
  if (!b) throw new Error(`Unknown behaviour: ${id}. Registered: ${[...REGISTRY.keys()].join(', ')}`);
  return b;
}
```

**Throwing on duplicate registration** catches double-import bugs at boot. **Listing registered keys in the error** turns a five-minute debugging session into a five-second one.

### 9.3 Anti-Patterns

| Anti-Pattern | Why | Instead |
|---|---|---|
| Deep inheritance | Unmaintainable at month eight | Composition |
| God objects | Untestable, unreviewable | Split by responsibility |
| Singletons via module state | Untestable, hidden dependencies | `Registry` with explicit registration |
| Callback pyramids | Unreadable | `async`/`await` (rare here) or state machines |
| Implicit update order | Reordering breaks things silently | `SYSTEM_ORDER` |
| Magic numbers | Unmaintainable | Named constants |
| Stringly-typed | No compiler help | Branded types, unions |
| Optional fields as flags | Invalid states representable | Discriminated unions |
| Premature abstraction | Generalises the wrong thing | Two implementations first (`03` P4) |
| Clever one-liners | Costs a reader ten minutes to save the writer ten seconds | Boring, explicit code |
| Comments explaining what | Rots immediately | Better names |
| Broad `try/catch` | Hides bugs | Handle specific failures with `Result` |

### 9.4 The Two-Implementations Rule

From `03-Technical-Architecture.md` P4, restated as a review criterion:

> **Do not write an abstraction until you have two concrete implementations that need it.**

| Situation | Correct Action |
|---|---|
| One enemy type exists | Write it concretely |
| Two enemy types share 80% of their code | *Now* extract the shared framework |
| A feature "might need" an interface later | Do not write the interface |
| An interface has exactly one implementation | Delete the interface, use the class |

**Reviewers must ask "what is the second implementation?" of any new interface.** If the answer is hypothetical, the interface is rejected.

**Documented exceptions** — abstractions written before two implementations because the architecture depends on them: `System`, `Behaviour`, `Ability`, `MechanicPlugin`, `Poolable`, `AudioBackend`. Each is justified in `03-Technical-Architecture.md` and each had at least two planned implementations at the time of writing.

---

## 10. Testing

### 10.1 The Strategy

| Layer | Tool | Coverage Target | Runtime |
|---|---|---|---|
| Unit | Vitest | 70% of `core` + `systems` | < 10 s |
| Integration | Vitest + headless Phaser | Key flows | < 45 s |
| E2E | Playwright | Smoke paths, 3 browsers | < 6 min |
| Pillar | Custom | All automatable targets | < 30 s |
| Visual | Playwright screenshots | Per scene | < 2 min |
| Performance | Playwright + CDP | Per world | < 8 min |

### 10.2 What to Test

**Test heavily:**

| Subject | Why |
|---|---|
| Save migrations | A broken migration destroys player data. **Highest value in the suite** |
| `StateMachine` `allowed` transitions | Catches the widest class of gameplay bugs |
| Content schema validation | Catches designer typos at boot, not at spawn |
| Damage formula | Every number must be reproducible by hand |
| `ObjectPool` acquire/release/cap | Pooling bugs are subtle and destructive |
| Coyote time and jump buffer | Pillar 1 is load-bearing |
| Behaviour modules | Pure logic, trivially testable |
| Cut-line reachability | A cut that orphans Contact must fail CI |

**Do not test:**

| Subject | Why |
|---|---|
| Phaser internals | Not our code |
| Arcade Physics | Not our code |
| Rendering output | Visual regression covers it better |
| Getters that return a field | Testing the language |
| Private methods | Test through the public surface |

**The rule:** write the test that would have caught the bug. Coverage percentage is a diagnostic, not a goal — 70% is the floor for `core` and `systems` because those are where a bug is expensive.

### 10.3 Test Style

```ts
// tests/unit/core/StateMachine.test.ts
import { describe, it, expect } from 'vitest';

describe('StateMachine', () => {
  describe('transitions', () => {
    it('allows a declared transition', () => {
      const sm = makeMachine('IDLE');
      sm.update(ctx());
      expect(sm.id).toBe('RUN');
    });

    it('throws in dev on an undeclared transition', () => {
      const sm = makeMachine('IDLE', [{ id: 'IDLE', allowed: ['RUN'], update: () => 'DEATH' }]);
      expect(() => sm.update(ctx())).toThrow(/not allowed/);
    });

    it('permits force() to bypass allowed', () => {
      const sm = makeMachine('IDLE');
      sm.force('DEATH', ctx());
      expect(sm.id).toBe('DEATH');
    });
  });

  describe('timeInState', () => {
    it('resets on transition', () => { /* … */ });
    it('accumulates hitstop-scaled delta', () => { /* … */ });
  });
});
```

| Rule | Value |
|---|---|
| Naming | `it('does the thing when the condition')` — a sentence |
| Structure | Arrange, Act, Assert, visually separated |
| One assertion concept per test | Multiple `expect` calls are fine if they test one behaviour |
| No shared mutable state between tests | Fresh fixtures per test |
| No `beforeAll` for mutable setup | `beforeEach` only |
| Fixtures | Builder functions (`makeEnemy({ hp: 30 })`) over object literals |
| No mocking our own code | If a unit needs heavy mocking, it has too many dependencies |
| No snapshot tests for logic | Snapshots hide what changed |

### 10.4 The Critical Test Suites

**Save migrations** — the single most important suite:

```ts
// tests/unit/save-migrations.test.ts
describe('save migrations', () => {
  const versions = [1, 2, 3];   // every historical version

  for (const v of versions) {
    it(`migrates v${v} to v${SAVE_SCHEMA_VERSION}`, () => {
      const raw = loadFixture(`save-v${v}.json`);
      const result = migrate(raw);
      expect(result.ok).toBe(true);
      expect(result.value.version).toBe(SAVE_SCHEMA_VERSION);
      expect(validateSave(result.value).ok).toBe(true);
    });

    it(`preserves progression through the v${v} migration`, () => {
      const raw = loadFixture(`save-v${v}.json`);
      const result = migrate(raw);
      expect(result.value.collection.coins).toBe(raw.collection.coins);
      expect(result.value.progress.completedLevels).toEqual(raw.progress.completedLevels);
    });
  }
});
```

`tools/ci/check-migrations.ts` fails the build if a fixture is missing for any version below current.

**Pillar tests** — `02-Game-Pillars.md` §6.3.

**Content validation:**

```ts
it('every content file validates against its schema', () => {
  const result = new ContentDatabase(loadAllContent()).validateAll();
  if (!result.ok) {
    const msg = result.error.map(e => `${e.file}${e.pointer}: ${e.message}`).join('\n');
    throw new Error(`Content validation failed:\n${msg}`);
  }
});
```

### 10.5 Test-Driven Development

**TDD is encouraged but not mandated.** Where it is strongly recommended:

| Subject | Reason |
|---|---|
| Save migrations | Write the fixture, then the migration |
| Damage formulas | Write the expected numbers from the doc, then the code |
| State machine transitions | The transition table is the test |
| Behaviour modules | Pure logic; the test is easier than the debugging |

Where it is impractical: anything involving Phaser rendering, physics integration, or feel tuning. You cannot write a failing test for "the jump feels wrong."

---

## 11. Git and CI

### 11.1 Branching

```
main            ← always deployable, protected, tagged per milestone
  └── develop   ← integration
        ├── feat/ninja-double-jump
        ├── fix/coyote-cancels-on-dash
        ├── content/w2-level-3
        ├── art/autumn-tileset-integration
        ├── perf/stagger-enemy-vision
        ├── docs/update-combat-spec
        └── chore/bump-vite
```

| Prefix | Use |
|---|---|
| `feat/` | New functionality |
| `fix/` | Bug fix |
| `content/` | Levels, enemy definitions, portfolio text |
| `art/` | Asset integration and harmonisation |
| `perf/` | Performance work |
| `docs/` | Documentation only |
| `chore/` | Dependencies, tooling, config |
| `refactor/` | Behaviour-preserving restructure |

**Branch lifetime target: under 3 days.** A branch open for two weeks is a merge conflict waiting to happen and a review nobody wants to do.

### 11.2 Commits

Conventional Commits, enforced by commitlint:

```
<type>(<scope>): <subject>

<body>

<footer>
```

```
feat(player): add wall-slide with per-character slide speed

Ninja slides at 45 px/s, Knight at 90 px/s. Available to all four
characters so no level becomes character-gated.

Introduced as the World 2 mastery beat, so World 1 keeps to five
inputs and zero advanced verbs.

Refs: ADR-011, docs/06-Characters.md §5.6
Closes: #142

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

| Field | Rule |
|---|---|
| Type | `feat`, `fix`, `content`, `art`, `perf`, `docs`, `chore`, `refactor`, `test` |
| Scope | The module: `player`, `combat`, `enemy`, `boss`, `level`, `ui`, `save`, `portfolio` |
| Subject | Imperative mood, lowercase, no trailing period, ≤ 72 chars |
| Body | **The why.** Wrapped at 72 |
| Footer | `Refs:` for ADRs and docs, `Closes:` for issues, `BREAKING CHANGE:` where applicable |

**The body is where the value is.** A commit that says what changed duplicates the diff. A commit that says why changed is the only record of the reasoning.

### 11.3 Pull Requests

| Requirement | Value |
|---|---|
| Size target | **< 400 lines changed.** Larger PRs get worse reviews |
| CI | All gates green |
| Approvals | 1, or **2** for `src/core/`, `GameConstants.ts`, or the save schema |
| Docs | If a doc-owned value changed, the doc changes in the same PR |
| Visual changes | A screenshot or a short capture, before and after |
| Performance-sensitive changes | Before/after numbers from the debug overlay |
| Self-review | The author reviews their own diff first |

**PR template:**

```markdown
## What
One or two sentences.

## Why
The problem this solves. Link the issue or ADR.

## How
Notable implementation decisions. What you considered and rejected.

## Verification
- [ ] Tested in-game on: (levels/scenarios)
- [ ] Tested with all four heroes (if gameplay-affecting)
- [ ] Perf checked (if in a hot path): before X ms → after Y ms
- [ ] Docs updated: (which)

## Screenshots
(if visual)
```

### 11.4 Code Review

**What reviewers look for, in priority order:**

| # | Concern | Question |
|---|---|---|
| 1 | Correctness | Does it do what it claims? What are the edge cases? |
| 2 | Invariant violations | Does it break a documented invariant or a pillar? |
| 3 | Boundary violations | (CI catches most; check the intent) |
| 4 | Premature abstraction | Is there a second implementation? (§9.4) |
| 5 | Allocation in hot paths | Does this run per frame? Does it allocate? |
| 6 | Missing tests | Would a test have caught the bug this fixes? |
| 7 | Naming and readability | Will a stranger understand this? |
| 8 | Documentation drift | Does a doc need updating? |

**What reviewers do not comment on:** formatting (Prettier), import order (ESLint), or style preferences already settled in this document. If it can be automated and is not, that is a tooling issue to file — not a review comment.

**Review tone:** questions over assertions. "What happens if the pool is empty here?" beats "this is wrong." Everyone is doing their best with incomplete information.

**Turnaround target: 4 hours during working hours.** A PR sitting for two days is worse for the codebase than a slightly less thorough review.

### 11.5 The CI Pipeline

```mermaid
flowchart LR
    PR[Pull Request] --> F[format check]
    F --> L[eslint]
    L --> T[typecheck]
    T --> B[boundaries + madge]
    B --> U[unit tests]
    U --> S[schema validation]
    S --> M[migration fixtures]
    M --> P[pillar checks]
    P --> LV[level validation]
    LV --> BLD[build]
    BLD --> SZ[bundle + payload size]
    SZ --> E2E[e2e: Chrome/FF/Safari]
    E2E --> VIS[visual diff]
    VIS --> PERF[perf traces]
    PERF --> OK[mergeable]
```

| Gate | Fails If | Duration |
|---|---|---|
| format | Prettier would change a file | 8 s |
| eslint | Any error, including boundary violations | 22 s |
| typecheck | Any TS error | 18 s |
| boundaries | A cycle, or a layer violation | 6 s |
| unit | A failing test, or coverage < 70% on `core`/`systems` | 12 s |
| schema | Any content JSON fails validation | 4 s |
| migrations | A fixture is missing for any historical version | 3 s |
| pillars | Any automated pillar target regresses | 25 s |
| levels | Any of the six level checks fails | 14 s |
| build | Build error | 34 s |
| size | Bundle > 1.2 MB gz, or blocking payload > 8 MB | 5 s |
| e2e | The smoke path fails in any browser | 5 m 40 s |
| visual | Any scene differs by > 0.1% of pixels | 1 m 50 s |
| perf | p99 frame time, heap growth, or draw calls regress | 7 m 20 s |
| **Total** | | **~16 min** |

**The full pipeline runs on every PR.** Sixteen minutes is acceptable; a pipeline nobody waits for is a pipeline that gets bypassed.

### 11.6 Releases

| Event | Action |
|---|---|
| Merge to `develop` | Deploy to a staging URL |
| Merge to `main` | Deploy to production + `/resume`; tag `v0.M.x` |
| Milestone close | Tag `v0.M.0`, archive audits, write release notes |
| Launch | Tag `v1.0.0` |

**Deployment is a static file upload.** No server, no migrations, no downtime. This is an architectural benefit of having no backend (`01-Vision.md` §14) and it is worth naming.

### 11.7 Bug Severity

| Severity | Definition | Response |
|---|---|---|
| **P0** | Game unplayable, save corruption, crash on boot | Fix immediately; block all other work |
| **P1** | A level or boss cannot be completed; progression lost; a pillar broken | Fix before the milestone closes |
| **P2** | A feature works incorrectly but has a workaround | Fix in the current milestone if possible |
| **P3** | Cosmetic, minor, or rare | Backlog |
| **P4** | Nice to have | `20-Future-Ideas.md` |

**"Definition of done" for the product requires zero open P0 and P1** (`01-Vision.md` §7.5).

---

## 12. Implementation Notes

### 12.1 The Pre-Commit Hook

```bash
# .husky/pre-commit
npx lint-staged
```

```json
// package.json
"lint-staged": {
  "*.{ts,js}": ["prettier --write", "eslint --fix --max-warnings 0"],
  "*.{json,md}": ["prettier --write"],
  "public/assets/data/**/*.json": ["node tools/ci/validate-content.js"]
}
```

**Deliberately fast — under 3 seconds.** A slow hook gets bypassed with `--no-verify`, which defeats the purpose. Type checking and tests run in CI, not in the hook.

### 12.2 Editor Configuration

`.vscode/settings.json` is committed:

```jsonc
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "files.eol": "\n"
}
```

`.vscode/extensions.json` recommends Prettier, ESLint, and the Phaser snippet pack. `.editorconfig` covers non-VS Code editors.

### 12.3 Dependencies

| Rule | Value |
|---|---|
| New runtime dependency | Requires an ADR |
| New dev dependency | Requires reviewer agreement |
| Current runtime dependencies | **Phaser only.** That is the entire list |
| Update cadence | Monthly for dev deps; Phaser only on a specific need |
| Lockfile | Committed. `npm ci` in CI, never `npm install` |
| Audit | `npm audit` in CI; high or critical fails the build |

**One runtime dependency** is a deliberate achievement, not an accident. Every candidate was evaluated against "can a few lines of our own code do this?" and the answer was yes every time.

### 12.4 The Logger

```ts
// src/core/Logger.ts
type Level = 'debug' | 'info' | 'warn' | 'error';

export const log = {
  debug: (scope: string, msg: string, data?: unknown) => {
    if (import.meta.env.DEV) emit('debug', scope, msg, data);
  },
  info:  (scope: string, msg: string, data?: unknown) => emit('info', scope, msg, data),
  warn:  (scope: string, msg: string, data?: unknown) => emit('warn', scope, msg, data),
  error: (scope: string, msg: string, err?: unknown)  => emit('error', scope, msg, err),
};
```

`debug` is stripped in production. `warn` and `error` ship, because a player reporting a bug with console output is a player who helped.

### 12.5 Common Standards Violations

| Violation | Why It Happens | Prevention |
|---|---|---|
| `any` to silence an error | Deadline pressure | ESLint error, not warning |
| Browser global outside `platform/` | Habit | ESLint with a Steam-port explanation |
| Interface with one implementation | Anticipating the future | Reviewer asks "what is the second?" |
| File over 400 lines | Incremental growth | ESLint `max-lines` |
| Allocation in a hot path | Not thinking about it | The heap-growth CI gate |
| A doc value changed in code only | Forgetting | `check-constants.ts` |
| Missing `shutdown()` | Phaser does not require it | `check-scenes.ts` |
| Magic number | Convenience | Review |
| `TODO` with no owner | Habit | ESLint requires `TODO(name, date)` |

---

## 13. Examples

### 13.1 A Well-Formed Module

```ts
/**
 * Poise
 *
 * Stagger resistance. A depleting pool that fully regenerates after a
 * quiet period. Breaking poise produces a full stagger; an intact pool
 * produces a flinch only. See docs/07-Combat.md §8.
 *
 * Invariants:
 *  - Breaking resets the pool to max immediately (not to zero).
 *  - Regeneration is all-or-nothing after regenDelayMs of no hits.
 */

import type { Clock } from '@platform/Clock';

export class Poise {
  private current: number;
  private lastHitAt = -Infinity;

  constructor(
    public readonly max: number,
    private readonly regenDelayMs: number,
    private readonly clock: Clock,
  ) {
    this.current = max;
  }

  /** Applies poise damage. Returns true if this hit BROKE poise. */
  damage(amount: number): boolean {
    this.lastHitAt = this.clock.now();
    this.current -= amount;
    if (this.current > 0) return false;
    this.current = this.max;   // break resets to full — see invariants
    return true;
  }

  update(): void {
    if (this.current >= this.max) return;
    if (this.clock.now() - this.lastHitAt >= this.regenDelayMs) this.current = this.max;
  }

  reset(newMax?: number): void {
    this.current = newMax ?? this.max;
    this.lastHitAt = -Infinity;
  }

  get normalised(): number {
    return this.current / this.max;
  }
}
```

**What makes this good:** header states invariants; the class does one thing; `Clock` is injected so it is testable without a scene; the non-obvious reset-on-break is commented; every field is as private as it can be; 38 lines.

### 13.2 A Review That Improved a PR

**Original:**

```ts
export class EnemyManager {
  private enemies: any[] = [];

  update(dt: number) {
    this.enemies = this.enemies.filter(e => e.active);
    this.enemies.forEach(e => {
      if (Math.abs(e.x - this.player.x) < e.sightRange) {
        e.state = 'chase';
      }
      e.update(dt);
    });
  }
}
```

**Review comments:**

1. `any[]` — banned. Should be `Enemy[]`.
2. `.filter()` reassigns the array every frame — allocation in a hot path. Use a manual compaction or leave inactive entities and skip them.
3. `.forEach` with a closure allocates. Use `for…of`.
4. Setting `e.state` directly bypasses the FSM's `allowed` check — this is exactly the bug the state machine exists to prevent.
5. Sight is checked with a raw distance comparison, bypassing `VisionCone` — no line of sight, no cone. Enemies will see through walls (`08-Enemy-System.md` P6).
6. `EnemyManager` — name says nothing. This appears to be a spawn/update system.
7. Missing: this does not respect hit stop.

**Revised:**

```ts
export class EnemyUpdateSystem implements System {
  readonly id = 'ai' as const;
  enabled = true;

  private readonly active: Enemy[] = [];

  update(time: number, delta: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const enemy = this.active[i]!;
      if (!enemy.active) { swapRemove(this.active, i); continue; }
      enemy.update(time, delta);   // Entity.update applies hitstop scaling
    }
  }
}
```

Sight checking moved into `ChaseBehaviour`, using `VisionCone` with line of sight, staggered at 10 Hz (`15-Performance.md` §8.2). State transitions go through the FSM.

**Seven issues, all caught by review or lint, all preventing real bugs.** Items 4 and 5 in particular would have produced "enemies behave weirdly" reports weeks later.

### 13.3 A Good Deletion PR

```
refactor(vfx): remove the unused VfxLayer abstraction

VfxLayer was written to support rendering VFX to separate composited
layers. Only one layer was ever used. The interface, the registry, and
the compositing path were all dead weight.

Removing it also removed a per-frame loop over an always-empty array.

-247 lines, +18 lines. No behaviour change.
Frame time in 1-3: 7.4ms → 7.2ms.

Refs: docs/16-Coding-Standards.md §9.4
```

**This is the highest-quality PR shape available** (P5): a large negative diff, no behaviour change, a small measured improvement, and a clear explanation of why the abstraction was never needed.

---

## 14. Acceptance Criteria

- [ ] `tsconfig.json` matches §5.1 exactly, including all strictness flags.
- [ ] `npm run lint` enforces every rule in §7; each has been deliberately violated once to confirm it fires.
- [ ] `npm run typecheck` passes with zero errors and zero `@ts-ignore`.
- [ ] `grep -rn ": any" src/` returns nothing.
- [ ] No browser global appears outside `src/platform/` (`check-portability.ts`).
- [ ] `Math.random()` appears only in `src/core/Rng.ts`.
- [ ] `madge --circular src/` reports zero cycles.
- [ ] No file exceeds 400 lines (ESLint `max-lines`).
- [ ] Unit coverage ≥ 70% on `src/core` and `src/systems`.
- [ ] A migration fixture exists for every historical save-schema version.
- [ ] Every scene implements and wires `shutdown()` (`check-scenes.ts`).
- [ ] `GameConstants.ts` matches `00-README.md` §5 (`check-constants.ts`).
- [ ] Pre-commit hook runs in under 3 seconds.
- [ ] The full CI pipeline runs in under 20 minutes.
- [ ] The PR template is in `.github/`.
- [ ] Exactly one runtime dependency (Phaser).
- [ ] `npm audit` reports no high or critical vulnerabilities.
- [ ] Every `TODO` has an owner and a date.
- [ ] Every interface in `src/` has at least two implementations, or a documented exception.

---

## 15. Future Expansion

| Item | Trigger | Notes |
|---|---|---|
| **TypeDoc API reference** | ~150 modules | Generated into `docs/api/`, excluded from the PDF |
| **Mutation testing (Stryker)** | If coverage feels hollow | Measures whether tests actually catch bugs. Slow; run weekly, not per PR |
| **Automated dependency updates** | Now, low cost | Renovate with grouped weekly PRs |
| **Custom ESLint rules** | If a project-specific pattern needs enforcing | The `no-restricted-syntax` selectors cover most cases today |
| **Commit-message linting for docs** | If doc drift becomes a problem | Require a `Refs:` on any PR touching `src/config/` |
| **Preview deployments per PR** | Now, low cost | Static hosting makes this trivial |
| **Performance bisection harness** | If a regression slips past CI | Deterministic replays make it straightforward |
| **Contributor guide** | If the project takes outside contributions | `CONTRIBUTING.md` distilled from this document |

---

## 16. Out of Scope

| Excluded | Reason |
|---|---|
| **Style debates already settled here** | Prettier decides. Move on |
| **100% test coverage** | Chasing the last 30% tests getters and constructors |
| **Mocking frameworks** | If a unit needs heavy mocking, it has too many dependencies |
| **BDD/Gherkin** | Overhead without benefit at this team size |
| **A monorepo** | One package |
| **Semantic-release automation** | Manual milestone tagging is five seconds of work |
| **Code-generation from schemas** | Types are hand-written and CI-verified against schemas. Generation adds a build step for little gain |
| **A custom build system** | Vite is sufficient |
| **Pair programming mandates** | Team-size dependent, not a standard |
| **Linting the documentation prose** | Spelling only. Style guides for prose are a rabbit hole |

---

## 17. Cross References

| Topic | Document |
|-------|----------|
| Canonical constants that `check-constants.ts` verifies | `00-README.md` §5 |
| Documentation conventions and CI checks | `00-README.md` §9, §10.2 |
| The codebase as a portfolio artifact | `01-Vision.md` §6.2 |
| Pillar invariants encoded as lint rules | `02-Game-Pillars.md` §6.1 |
| Layer boundaries and the dependency matrix | `03-Technical-Architecture.md` §6 |
| Composition over inheritance, two-implementations rule | `03-Technical-Architecture.md` §3 |
| Scene lifecycle and the `shutdown` contract | `03-Technical-Architecture.md` §7.4 |
| Testing strategy, git workflow, CI overview | `03-Technical-Architecture.md` §13 |
| Steam portability constraints | `03-Technical-Architecture.md` §14.2 |
| Determinism and the seeded RNG | `03-Technical-Architecture.md` §16 |
| `no add.text` and depth-constant rules | `04-Art-Direction.md` §9.2, §10.1 |
| The animator read-only rule | `14-Animation-Standards.md` §6.4 |
| Performance gates in CI | `15-Performance.md` §9.2 |
| Milestone gates and audits | `17-Roadmap.md` §6 |
| Term definitions | `18-Glossary.md` |
| ADRs referenced by lint-rule messages | `19-Decisions.md` |
