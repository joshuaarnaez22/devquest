import { EventBus } from '@core/EventBus';
import { IFrames } from '@components/IFrames';
import { HitQueue } from '@systems/HitQueue';
import type { EntityId, GameEventMap } from '@core/GameEvents';
import type { InputFrame } from '@core/InputFrame';
import type { Ability, AbilityContext, AbilityTarget } from '@entities/player/abilities/Ability';
import type { FeelPlayer } from '@entities/player/FeelPlayer';
import type { VfxSystem } from '@systems/VfxSystem';

/**
 * Shared test-only mock of `AbilityContext` (M2-T11) — abilities are typed
 * against the real `FeelPlayer`/`VfxSystem` per ADR-004 (no `Player` abstraction
 * yet), so a full mock only needs the handful of fields each ability actually
 * touches, cast through `unknown`. Not exported from `src` production code.
 */
export interface MockBody {
  x: number;
  readonly halfWidth: number;
  velocityX: number;
  velocityY: number;
  setVelocityX(v: number): MockBody;
  setVelocityY(v: number): MockBody;
}

export function makeMockBody(x = 0): MockBody {
  const body: MockBody = {
    x,
    halfWidth: 7,
    velocityX: 0,
    velocityY: 0,
    setVelocityX(v: number) {
      body.velocityX = v;
      return body;
    },
    setVelocityY(v: number) {
      body.velocityY = v;
      return body;
    },
  };
  return body;
}

export interface MockPlayer {
  id: EntityId;
  x: number;
  y: number;
  facingDir: -1 | 1;
  knockbackResist: number;
  body: MockBody;
  damage: { iFrames: IFrames };
  abilitySlot: { markNextAttackCritical: () => void; markedCritical: boolean };
  restoreAirMobility: () => void;
  restoreAirMobilityCalls: number;
}

export function makeMockPlayer(overrides: Partial<MockPlayer> = {}): MockPlayer {
  const player: MockPlayer = {
    id: 1,
    x: 0,
    y: 0,
    facingDir: 1,
    knockbackResist: 0,
    body: makeMockBody(),
    damage: { iFrames: new IFrames() },
    abilitySlot: {
      markedCritical: false,
      markNextAttackCritical() {
        player.abilitySlot.markedCritical = true;
      },
    },
    restoreAirMobilityCalls: 0,
    restoreAirMobility() {
      player.restoreAirMobilityCalls += 1;
    },
    ...overrides,
  };
  return player;
}

const DEFAULT_FRAME: InputFrame = {
  moveX: 0,
  moveY: 0,
  jumpPressed: false,
  jumpHeld: false,
  jumpReleased: false,
  attackPressed: false,
  attackHeld: false,
  dashPressed: false,
  specialPressed: false,
  specialHeld: false,
  specialReleased: false,
  pausePressed: false,
  jumpPressedAt: 0,
  device: 'keyboard',
  gamepadKind: null,
};

export interface AbilityHarness {
  ctx: AbilityContext;
  player: MockPlayer;
  bus: EventBus<GameEventMap>;
  hitQueue: HitQueue;
  targets: AbilityTarget[];
  setFrame(frame: Partial<InputFrame>): void;
  setTime(time: number, delta?: number): void;
  setSolid(fn: (x: number, y: number) => boolean): void;
}

export function makeAbilityHarness(playerOverrides: Partial<MockPlayer> = {}): AbilityHarness {
  const player = makeMockPlayer(playerOverrides);
  const bus = new EventBus<GameEventMap>();
  const hitQueue = new HitQueue();
  const targets: AbilityTarget[] = [];
  let frame: InputFrame = { ...DEFAULT_FRAME };
  let time = 0;
  let delta = 16;
  let isSolidAt: (x: number, y: number) => boolean = () => false;

  const harness: AbilityHarness = {
    get ctx(): AbilityContext {
      return {
        player: player as unknown as FeelPlayer,
        frame,
        time,
        delta,
        bus,
        hitQueue,
        vfx: {} as VfxSystem,
        isSolidAt: (x, y) => isSolidAt(x, y),
        getTargets: () => targets,
      };
    },
    player,
    bus,
    hitQueue,
    targets,
    setFrame(patch: Partial<InputFrame>) {
      frame = { ...frame, ...patch };
    },
    setTime(t: number, d = 16) {
      time = t;
      delta = d;
    },
    setSolid(fn) {
      isSolidAt = fn;
    },
  };
  return harness;
}

/**
 * Some `Ability` implementations (`KnightGuard`, `NinjaShadow`) omit unused
 * parameters on `init`/`onDeactivate` — valid TS since the interface is
 * satisfied structurally, but calling the concrete class directly with the
 * full arity errors ("too many arguments"). Going through the `Ability`
 * interface type sidesteps that without touching production code.
 */
export function asAbility(ability: Ability): Ability {
  return ability;
}
