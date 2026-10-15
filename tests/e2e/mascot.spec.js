import { test, expect } from '@playwright/test';

const offset = (page) =>
  page.locator('[data-mascot-gaze]').evaluate((element) => {
    const matrix = element.transform.baseVal.consolidate()?.matrix;
    const center = new DOMPoint(320, 175).matrixTransform(
      matrix || new DOMMatrix(),
    );
    return { x: center.x - 320, y: center.y - 175 };
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
  isMobile,
}) => {
  test.skip(
    isMobile,
    'Touch devices follow the selected pillar instead of a mouse.',
  );
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

test('mobile character keeps its gaze on the selected pillar through scrolling and resizing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const stage = page.locator('[data-mascot]');
  await stage.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await offset(page)).x).toBeLessThan(-10);
  await expect.poll(async () => (await offset(page)).y).toBeGreaterThan(10);
  await page.locator('#tab-mais').click();
  await expect.poll(async () => (await offset(page)).x).toBeGreaterThan(10);
  await stage.click();
  await page.waitForTimeout(1100);
  await expect.poll(async () => (await offset(page)).x).toBeGreaterThan(10);
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await stage.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await offset(page)).x).toBeGreaterThan(10);
  await page.locator('#tab-mais').focus();
  await page.keyboard.press('Home');
  await expect(page.locator('#tab-sites')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await stage.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await offset(page)).x).toBeLessThan(-10);
  for (const width of [320, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => (await offset(page)).x).toBeLessThan(-10);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#tab-mais').click();
  await expect.poll(async () => (await offset(page)).x).toBeGreaterThan(10);
  const still = await page
    .locator('[data-mascot-head]')
    .getAttribute('transform');
  await page.waitForTimeout(200);
  expect(
    await page.locator('[data-mascot-head]').getAttribute('transform'),
  ).toBe(still);
});
