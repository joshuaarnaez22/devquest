import * as Browser from './Browser';
import * as Clock from './Clock';
import * as Env from './Env';
import * as Fullscreen from './Fullscreen';
import * as GamepadAdapter from './GamepadAdapter';
import * as Storage from './Storage';

export const Platform = {
  Storage,
  Clock,
  Env,
  Fullscreen,
  GamepadAdapter,
  Browser,
} as const;
