import { test, expect } from '@playwright/test';

const offset = (page) =>
  page.locator('[data-mascot-gaze]').evaluate((element) => {
    const matrix = element.transform.baseVal.consolidate()?.matrix;
    return { x: matrix?.e || 0, y: matrix?.f || 0 };
  });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-mascot]')).toHaveAttribute(
    'data-ready',
    'true',
  );
});

test('character follows the pointer, honors motion preferences and rests offscreen', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const stage = page.locator('[data-mascot]');
  const head = page.locator('[data-mascot-head]');
  await stage.scrollIntoViewIfNeeded();
  const rect = await stage.boundingBox();
  const width = page.viewportSize().width;
  const y = rect.y + rect.height * 0.46;
  await page.mouse.move(width - 10, y);
  await expect.poll(async () => (await offset(page)).x).toBeGreaterThan(12);
  // The pointer changes immediately, while the displayed gaze eases to its target.
  const first = await page.evaluate(
    ({ y }) => {
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: 10,
          clientY: y,
          pointerType: 'mouse',
        }),
      );
      return document
        .querySelector('[data-mascot-gaze]')
        .transform.baseVal.consolidate().matrix.e;
    },
    { y },
  );
  expect(first).toBeGreaterThan(0);
  await expect.poll(async () => (await offset(page)).x).toBeLessThan(-12);
  await expect(page.locator('[data-mascot-motion]')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(stage).toHaveAttribute('data-paused', 'true');
  const paused = await head.getAttribute('transform');
  await page.mouse.move(width - 10, 100);
  await page.waitForTimeout(250);
  expect(await head.getAttribute('transform')).toBe(paused);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => head.getAttribute('transform')).not.toBe(paused);
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await expect(stage).not.toBeInViewport();
  await page.waitForTimeout(100); // Let IntersectionObserver deliver the offscreen state.
  const resting = await head.getAttribute('transform');
  await page.waitForTimeout(250);
  expect(await head.getAttribute('transform')).toBe(resting);
  await stage.scrollIntoViewIfNeeded();
  await expect.poll(() => head.getAttribute('transform')).not.toBe(resting);
});

test('reduced motion keeps the character still and the circuit stays on restructuring', async ({
  page,
}) => {
  const head = page.locator('[data-mascot-head]');
  await expect(page.locator('[data-mascot]')).toHaveAttribute(
    'data-paused',
    'true',
  );
  await expect(page.locator('[data-mascot-motion]')).toHaveCount(0);
  const still = await head.getAttribute('transform');
  await page.mouse.move(20, 100);
  await page.waitForTimeout(150);
  expect(await head.getAttribute('transform')).toBe(still);
  await expect(page.locator('[data-signal-scene]')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => head.getAttribute('transform')).not.toBe(still);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(head).toHaveAttribute('transform', still);
  await page.goto('/reestruturacao');
  await expect(page.locator('[data-mascot]')).toHaveCount(0);
  await expect(page.locator('[data-signal-scene]')).toBeVisible();
  await expect(page.getByRole('switch')).toBeEnabled();
});

test('touch gives the character a direction and then releases the gaze', async ({
  page,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    'Native touch interaction is checked in the iPhone project.',
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const stage = page.locator('[data-mascot]');
  await stage.scrollIntoViewIfNeeded();
  const box = await stage.boundingBox();
  await page.touchscreen.tap(box.x + 12, box.y + box.height * 0.4);
  await expect.poll(async () => (await offset(page)).x).toBeLessThan(-10);
  await expect
    .poll(async () => Math.abs((await offset(page)).x))
    .toBeLessThan(0.2);
});
