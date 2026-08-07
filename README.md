# DevQuest

2D side-scrolling action platformer. Phaser 3 + TypeScript. Browser, 320×180 internal, 60 fps.

Four heroes, five worlds, five bosses. Each boss unlocks one section of a developer portfolio.

## Status

Spike 00 (feel probe) complete. **M0 Foundation** complete — see [`docs/audits/milestone-M0.md`](docs/audits/milestone-M0.md). **M1 Feel Prototype** in progress — Checkpoint A live (`npm run level:test`). Next: **M1-S06** (`M1-T6` gravity/jump) in [`plans/M01-feel-prototype/plan.md`](plans/M01-feel-prototype/plan.md).

## Quick start

```bash
npm ci
npm run dev
```

Open http://127.0.0.1:5173 — Boot → Preload loading bar → `ready` in the console.

Feel-test grey box (Checkpoint A):

```bash
npm run level:test
```

Moves with **A/D** (or arrows). Debug readout top-left.

## Commands

See `CLAUDE.md` for the full command table (`typecheck`, `lint`, `test`, `test:e2e`, `docs:check`, …).

## Docs

Authoritative specs live in [`docs/`](docs/). Implementation plans live in [`plans/`](plans/).

## Licence

MIT — see [LICENSE](LICENSE).
