import { test, expect } from '@playwright/test';

const addresses = {
  '/': 'byaskora.com',
  '/websites': 'byaskora.com/websites',
  '/aplicativos': 'byaskora.com/aplicativos',
  '/sistemas': 'byaskora.com/sistemas',
  '/ai-solutions': 'byaskora.com/ia',
  '/reestruturacao': 'byaskora.com/reestruturacao',
};

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2026-10-15T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-15T12:01:00Z'));
});

test('search opening types each page address, fits the viewport and releases the page', async ({
  page,
}) => {
  for (const [route, address] of Object.entries(addresses)) {
    await page.goto(route);
    const opening = page.locator('[data-entry-search]');
    await expect(opening).toHaveAttribute('data-phase', 'typing');
    await expect(opening).toBeVisible();
    await expect(page.locator('[data-entry-domain]')).toHaveText(
      route === '/' ? '' : 'byaskora.com',
    );
    await page.clock.runFor(180);
    const partial = await page.locator('.entry-search-address').textContent();
    expect(partial.trim().length).toBeGreaterThan(0);
    expect(partial.trim().length).toBeLessThan(address.length);
    expect(address.startsWith(partial.trim())).toBe(true);
    let elapsed = 180;
    while (
      (await opening.getAttribute('data-phase')) === 'typing' &&
      elapsed < 1500
    ) {
      await page.clock.runFor(50);
      elapsed += 50;
    }
    await expect(opening).toHaveAttribute('data-phase', 'submitted');
    expect(elapsed).toBeLessThanOrEqual(route === '/' ? 1200 : 900);
    await expect(page.locator('.entry-search-address')).toHaveText(address);
    expect(
      await page.locator('.entry-search-box').evaluate((box) => {
        const text = box
          .querySelector('.entry-search-address')
          .getBoundingClientRect();
        const button = box.querySelector('button').getBoundingClientRect();
        const caret = box
          .querySelector('.entry-search-caret')
          .getBoundingClientRect();
        return (
          box.getBoundingClientRect().left >= 0 &&
          button.right <= innerWidth &&
          text.right <= button.left &&
          caret.right <= button.left
        );
      }),
    ).toBe(true);
    await page.clock.runFor(200);
    const entrances = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((animation) => animation.id === 'hero-entrance')
        .map((animation) => ({
          delay: animation.effect.getTiming().delay,
          properties: Object.keys(animation.effect.getKeyframes()[0]).filter(
            (key) =>
              !['offset', 'computedOffset', 'easing', 'composite'].includes(
                key,
              ),
          ),
        })),
    );
    expect(entrances).toHaveLength(4);
    expect(entrances.map((animation) => animation.delay)).toEqual([
      80, 150, 220, 290,
    ]);
    for (const animation of entrances)
      expect(animation.properties.sort()).toEqual(['opacity', 'transform']);
    // Web Animations use the document timeline rather than Playwright's JS clock.
    await page.evaluate(() =>
      document
        .getAnimations()
        .filter((animation) => animation.id === 'hero-entrance')
        .forEach((animation) => animation.finish()),
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((animation) => animation.id === 'hero-entrance').length,
        ),
      )
      .toBe(0);
    await page.clock.runFor(500);
    await expect(opening).toBeHidden();
    await expect(page.locator('html')).not.toHaveClass(/entry-active/);
    await expect(page.locator('h1')).toBeVisible();
  }
});

test('opening supports skip and reduced motion, and excludes contact, portfolio and anchors', async ({
  page,
}) => {
  await page.goto('/websites');
  await page
    .getByRole('button', { name: 'Pular abertura e acessar a página' })
    .click();
  await expect(page.locator('[data-entry-search]')).toBeHidden();
  await page.goto('/aplicativos');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-entry-search]')).toBeHidden();
  await page.goto('/sistemas');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-entry-search]')).toBeHidden();
  await page.goto('/ai-solutions');
  await expect(page.locator('[data-entry-search]')).toBeHidden();
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.id === 'hero-entrance').length,
    ),
  ).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/ai-solutions');
  await page
    .getByRole('button', { name: 'Pular abertura e acessar a página' })
    .click();
  await page.getByRole('textbox', { name: 'Sua mensagem' }).focus();
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.id === 'hero-entrance').length,
    ),
  ).toBe(0);
  for (const route of ['/contato', '/portifolio']) {
    await page.goto(route);
    await expect(page.locator('[data-entry-search]')).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveClass(/entry-active/);
  }
  await page.goto('/#solucoes');
  await expect(page.locator('[data-entry-search]')).toBeHidden();
});

test('opening cannot cover the page indefinitely when application scripts fail', async ({
  page,
}) => {
  await page.route('**/*.js', (route) => route.abort());
  await page.goto('/reestruturacao');
  await expect(page.locator('[data-entry-search]')).toBeVisible();
  await page.clock.runFor(3300);
  await expect(page.locator('[data-entry-search]')).toBeHidden();
  await expect(page.locator('h1')).toBeVisible();
});
