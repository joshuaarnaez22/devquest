/** Player FSM state ids — docs/06-Characters.md §6. Full transitions land in M1-T9. */
export type PlayerStateId =
  | 'IDLE'
  | 'RUN'
  | 'JUMP'
  | 'AIR_JUMP'
  | 'FALL'
  | 'LAND'
  | 'WALL_SLIDE'
  | 'WALL_JUMP'
  | 'ATTACK_1'
  | 'ATTACK_2'
  | 'ATTACK_3'
  | 'AIR_ATTACK'
  | 'DASH'
  | 'SPECIAL'
  | 'CROUCH'
  | 'HURT'
  | 'DEATH';
