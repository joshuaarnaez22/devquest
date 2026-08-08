/** Minimal character content for M1 — movement block only (docs/06 §5.2 / §9). */

export const CHARACTER_IDS = ['knight', 'samurai', 'ninja', 'wizard'] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];

export interface CharacterMovementData {
  readonly runSpeed: number;
  readonly groundAccel: number;
  readonly groundDecel: number;
  readonly airAccel: number;
  readonly airDecel: number;
  readonly jumpVelocity: number;
  readonly airJumps: number;
  readonly airJumpScale: number;
  readonly dashSpeed: number;
  readonly dashDurationMs: number;
  readonly dashCooldownMs: number;
  readonly dashIFrames: boolean;
  readonly dashIFrameGraceMs: number;
  readonly wallSlideSpeed: number;
}

export interface CharacterContent {
  readonly id: CharacterId;
  readonly displayName: string;
  readonly animPrefix: string;
  readonly movement: CharacterMovementData;
}
