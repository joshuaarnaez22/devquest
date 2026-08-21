import { describe, expect, it } from 'vitest';
import { DEFAULT_LEDGE_SENSOR_CONFIG, LedgeSensor } from '@components/LedgeSensor';

const FLOOR_Y = 100; // feet resting on the surface; solid is y >= FLOOR_Y (below)

/** Solid floor for x in [0,100) and x>=132 -- a 32px gap in between (GAP_S). No walls. */
function floorWithGap(x: number, y: number): boolean {
  if (y < FLOOR_Y) return false; // above the ground plane = air
  return x < 100 || x >= 132;
}

describe('LedgeSensor (§5.6)', () => {
  it('reports no wall and no ledge on solid, unbroken ground', () => {
    const sensor = new LedgeSensor();
    const result = sensor.sense(50, FLOOR_Y, 1, floorWithGap);
    expect(result.wallAhead).toBe(false); // nothing above the flat ground plane
    expect(result.ledgeAhead).toBe(false);
    expect(result.gapWidth).toBe(0);
  });

  it('detects the ledge just before the gap', () => {
    const sensor = new LedgeSensor();
    // Standing at x=95, facing right; probe lands past x=100 (into the gap).
    const result = sensor.sense(95, FLOOR_Y, 1, floorWithGap);
    expect(result.ledgeAhead).toBe(true);
  });

  it('measures gap width up to where floor resumes', () => {
    const sensor = new LedgeSensor();
    const result = sensor.sense(100, FLOOR_Y, 1, floorWithGap);
    // Floor resumes at x=132; probing from x=100, gap = 32px.
    expect(result.gapWidth).toBe(32);
  });

  it('caps gapWidth at maxGapScanPx for a gap wider than the scan range', () => {
    function bottomlessPit(x: number, y: number): boolean {
      return y >= FLOOR_Y && x < 100;
    }
    const sensor = new LedgeSensor();
    const result = sensor.sense(100, FLOOR_Y, 1, bottomlessPit);
    expect(result.gapWidth).toBe(DEFAULT_LEDGE_SENSOR_CONFIG.maxGapScanPx);
  });

  it('senses in the facing direction — ledge behind is not reported ahead', () => {
    function edgeAtZero(x: number, y: number): boolean {
      return y >= FLOOR_Y && x >= 0;
    }
    const sensor = new LedgeSensor();
    const towardEdge = sensor.sense(5, FLOOR_Y, -1, edgeAtZero); // facing left, toward x=0 edge
    expect(towardEdge.ledgeAhead).toBe(true);
    const awayFromEdge = sensor.sense(5, FLOOR_Y, 1, edgeAtZero); // facing right, away from it
    expect(awayFromEdge.ledgeAhead).toBe(false);
  });

  it('reports a wall ahead on flat ground with a vertical obstacle, independent of ledge state', () => {
    function wallAtFifty(x: number, y: number): boolean {
      if (y >= FLOOR_Y) return true; // solid floor everywhere
      return x >= 50; // a wall rising above the floor starting at x=50
    }
    const sensor = new LedgeSensor();
    const result = sensor.sense(45, FLOOR_Y, 1, wallAtFifty);
    expect(result.wallAhead).toBe(true); // wall probe (above foot level) hits the wall
    expect(result.ledgeAhead).toBe(false); // floor itself is solid everywhere
  });

  it('flat ground alone never reports a wall (the false positive this design fixes)', () => {
    function flatGroundOnly(_x: number, y: number): boolean {
      return y >= FLOOR_Y;
    }
    const sensor = new LedgeSensor();
    const result = sensor.sense(0, FLOOR_Y, 1, flatGroundOnly);
    expect(result.wallAhead).toBe(false);
  });
});
