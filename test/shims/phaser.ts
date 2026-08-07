/**
 * Minimal Phaser stub for Vitest (Node has no `window`).
 * Production and `tsc` still resolve the real `phaser` package.
 */
class StubArcadeBody {
  enable = true;
  allowGravity = true;
  velocity = { x: 0, y: 0 };

  setVelocity(x: number, y: number): this {
    this.velocity.x = x;
    this.velocity.y = y;
    return this;
  }
}

class StubSprite {
  body: StubArcadeBody | null = null;
  active = false;
  visible = false;
  x: number;
  y: number;

  constructor(
    _scene: unknown,
    x: number,
    y: number,
    _texture?: string | object,
    _frame?: string | number,
  ) {
    this.x = x;
    this.y = y;
  }

  setActive(value: boolean): this {
    this.active = value;
    return this;
  }

  setVisible(value: boolean): this {
    this.visible = value;
    return this;
  }
}

const Phaser = {
  GameObjects: {
    Sprite: StubSprite,
  },
  Physics: {
    Arcade: {
      Body: StubArcadeBody,
    },
  },
};

export default Phaser;
