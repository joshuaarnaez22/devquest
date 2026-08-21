/** NORMATIVE — docs/08-Enemy-System.md §5.6. Two probes: wall (ahead, above foot level), ledge (ahead + below). */
export interface SensorResult {
  readonly wallAhead: boolean;
  readonly ledgeAhead: boolean; // no floor at (x + facing*probeX, y + probeY)
  readonly gapWidth: number; // px of empty floor ahead, capped at maxGapScanPx
}

export interface LedgeSensorConfig {
  readonly wallProbeX: number; // px ahead
  /**
   * Offset from foot level for the wall probe — negative (above the foot). Flat
   * ground occupies only the surface at/below foot level, so probing above it reads
   * air; a genuine wall extends upward through that point too. Without this offset,
   * flat ground and a wall are indistinguishable to a single-height point probe.
   */
  readonly wallProbeY: number;
  readonly ledgeProbeX: number; // px ahead
  readonly ledgeProbeY: number; // px below foot level
  readonly maxGapScanPx: number; // §5.6: "capped at 64"
  readonly gapScanStepPx: number;
}

export const DEFAULT_LEDGE_SENSOR_CONFIG: LedgeSensorConfig = {
  wallProbeX: 8,
  wallProbeY: -8,
  ledgeProbeX: 8,
  ledgeProbeY: 4,
  maxGapScanPx: 64,
  gapScanStepPx: 4,
};

/** `true` if solid ground/wall geometry occupies this world point. Injected — M2 has no tilemap. */
export type SolidAtCheck = (x: number, y: number) => boolean;

export class LedgeSensor {
  constructor(private readonly cfg: LedgeSensorConfig = DEFAULT_LEDGE_SENSOR_CONFIG) {}

  sense(footX: number, footY: number, facing: -1 | 1, isSolidAt: SolidAtCheck): SensorResult {
    const wallAhead = isSolidAt(footX + facing * this.cfg.wallProbeX, footY + this.cfg.wallProbeY);
    const ledgeX = footX + facing * this.cfg.ledgeProbeX;
    const ledgeY = footY + this.cfg.ledgeProbeY;
    const ledgeAhead = !isSolidAt(ledgeX, ledgeY);

    return {
      wallAhead,
      ledgeAhead,
      gapWidth: ledgeAhead ? this.scanGap(footX, footY, facing, isSolidAt) : 0,
    };
  }

  /** Scans forward from the ledge probe until floor resumes, capped at `maxGapScanPx`. */
  private scanGap(footX: number, footY: number, facing: -1 | 1, isSolidAt: SolidAtCheck): number {
    const y = footY + this.cfg.ledgeProbeY;
    for (let d = this.cfg.ledgeProbeX; d <= this.cfg.maxGapScanPx; d += this.cfg.gapScanStepPx) {
      if (isSolidAt(footX + facing * d, y)) return d;
    }
    return this.cfg.maxGapScanPx;
  }
}
