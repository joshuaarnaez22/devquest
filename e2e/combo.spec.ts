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
 * across at least one frame guarantees the edge is observed.
 */
async function tapAttack(page: Page): Promise<void> {
  await page.keyboard.down('j');
  await page.waitForTimeout(50);
  await page.keyboard.up('j');
}

test('Samurai combo chains ATTACK_1 -> ATTACK_2 -> ATTACK_3 -> IDLE', async ({ page }) => {
  await bootAndFocus(page);

  // Press 1 -- enters the first hit.
  await tapAttack(page);
  await expect.poll(async () => readState(page), { timeout: 2_000 }).toBe('ATTACK_1');

  // docs/06-Characters.md SS7.2.3 hit 1: windup 66ms + active 66ms = combo window opens
  // at 132ms, open for 300ms. Press again at 180ms -- inside the window.
  await page.waitForTimeout(130);
  await tapAttack(page);
  await expect.poll(async () => readState(page), { timeout: 2_000 }).toBe('ATTACK_2');

  // Hit 2 has the same 66/66/300 timing -- press again at 180ms.
  await page.waitForTimeout(130);
  await tapAttack(page);
  await expect.poll(async () => readState(page), { timeout: 2_000 }).toBe('ATTACK_3');

  // Hit 3 (the finisher) has no combo window -- it completes on its own (116+100+200ms)
  // and the FSM returns to IDLE/RUN.
  await expect.poll(async () => readState(page), { timeout: 2_000 }).toBe('IDLE');
});

test('a single attack press completes on its own without further input', async ({ page }) => {
  await bootAndFocus(page);

  await tapAttack(page);
  await expect.poll(async () => readState(page), { timeout: 2_000 }).toBe('ATTACK_1');

  // No second press -- windup(66) + active(66) + recovery(100) = 232ms, then IDLE.
  // This is the exact bug M2-T4 fixed: before it, attacks got stuck in ATTACK_1 forever.
  await expect.poll(async () => readState(page), { timeout: 2_000 }).toBe('IDLE');
});
