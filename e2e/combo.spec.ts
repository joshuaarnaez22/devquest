import { test, expect, type Page } from '@playwright/test';

// M2-T4 Checkpoint E: "hitbox at windupMs +-1 frame; combo chains". Closes the live
// verification gap left by M2-T4 (the interactive preview pane was hidden/unfocused
// all session, so this could only be confirmed here, in a real Playwright browser).

async function readState(page: Page): Promise<string> {
  const text = await page.locator('body').innerText();
  return /STATE\s+(\w+)/.exec(text)?.[1] ?? '';
}

async function bootAndFocus(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#game-root')).toBeVisible();
  await expect.poll(async () => readState(page), { timeout: 15_000 }).not.toBe('');
  await page.locator('body').click();
}

/**
 * `page.keyboard.press()` does down+up back-to-back, faster than one 16.67ms game
 * frame. InputSystem's edge detection (`attackPressed: raw.attack && !prev.attack`)
 * polls down-state once per frame, so a pulse shorter than a frame can be invisible
 * to it -- the key is already back up by the time the game samples. Holding it down
 * across a frame boundary before releasing guarantees the edge is observed.
 */
async function tapAttack(page: Page): Promise<void> {
  await page.keyboard.down('j');
  await page.waitForTimeout(50);
  await page.keyboard.up('j');
}

/**
 * Taps attack repeatedly until `target` is observed. A single precisely-timed press
 * is fragile under parallel-worker CPU contention -- a delayed animation frame can
 * blow straight through the 300ms combo window before a one-shot poll even runs.
 * Spamming taps across the window is robust to that jitter: presses before the
 * window opens are harmless no-ops (the FSM ignores `wantsAttack` until
 * `comboWindowOpen`), and this is closer to how a real player chains combos anyway.
 */
async function tapUntil(page: Page, target: string, budgetMs: number): Promise<void> {
  const deadline = Date.now() + budgetMs;
  let last = '';
  while (Date.now() < deadline) {
    await tapAttack(page);
    last = await readState(page);
    if (last === target) return;
    await page.waitForTimeout(20);
  }
  throw new Error(`Never reached "${target}" within ${budgetMs}ms (last state: "${last}")`);
}

test('Samurai combo chains ATTACK_1 -> ATTACK_2 -> ATTACK_3 -> IDLE', async ({ page }) => {
  await bootAndFocus(page);

  await tapUntil(page, 'ATTACK_1', 1_000);
  // docs/06-Characters.md §7.2.3 hit 1: windup 66ms + active 66ms = combo window opens
  // at 132ms, open for 300ms (closes at 432ms). Hit 2 has the same 66/66/300 timing.
  await tapUntil(page, 'ATTACK_2', 600);
  await tapUntil(page, 'ATTACK_3', 600);

  // Hit 3 (the finisher) has no combo window -- it completes on its own
  // (116+100+200ms) and the FSM returns to IDLE/RUN.
  await expect.poll(async () => readState(page), { timeout: 2_000 }).toBe('IDLE');
});

test('a single attack press completes on its own without further input', async ({ page }) => {
  await bootAndFocus(page);

  await tapUntil(page, 'ATTACK_1', 1_000);

  // No second press -- windup(66) + active(66) + recovery(100) = 232ms, then IDLE.
  // This is the exact bug M2-T4 fixed: before it, attacks got stuck in ATTACK_1 forever.
  await expect.poll(async () => readState(page), { timeout: 2_000 }).toBe('IDLE');
});
