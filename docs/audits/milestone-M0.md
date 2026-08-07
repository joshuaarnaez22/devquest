# M0 Foundation — closed 2026-08-07

## Outcome

Foundation toolchain landed in the main app. Boot → Preload shows a progress bar and
prints `ready`. Exactly one runtime dependency (`phaser`).

## Exit gate

| Check | Result |
|---|---|
| `npm run dev` | OK |
| Lint non-negotiables | OK (`npm run lint`) |
| `check-constants` / `check-template` | OK |
| `check-portability` / `check-scenes` | OK |
| `madge --circular` | OK |
| Atlas determinism (two runs) | OK |
| `ObjectPool` / `StateMachine` coverage | Lines 100% |
| `src/core` coverage | ≥ 70% (overall ~91% stmts) |
| Loading bar → ready | OK |
| One runtime dependency | `phaser` only |
| CI workflow | `.github/workflows/ci.yml` (Pages deploy on `main`) |

## Notes

- Spike `ProbeScene` removed; Boot/Preload only.
- BitmapText deferred until font atlas (M3); Preload uses bar + `console.warn('ready')`.
- GitHub Pages deploy requires repo Pages settings enabled once.
- Staging/`develop` branch protection is a manual GitHub settings step.

## Next

Expand `plans/M02-combat-feel/plan.md` remains deferred until M1 closes (expansion rule:
expand next-but-one at each gate). Proceed to M1 Feel Prototype.
