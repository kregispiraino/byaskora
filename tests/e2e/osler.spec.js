import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const path = '/projetos/osler/website/';

test('Osler glass menu opens in place, supports keyboard and navigates to sections', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(path);
  const toggle = page.locator('.nav-toggle');
  const links = page.locator('#osler-navigation');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(links).toHaveJSProperty('inert', true);
  const before = await page.locator('.nav-actions').boundingBox();
  const login = await page.locator('.nav-actions .login-link').boundingBox();
  expect((await toggle.boundingBox()).x).toBeLessThan(login.x);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(links).toBeVisible();
  const after = await page.locator('.nav-actions').boundingBox();
  expect(after.width).toBe(before.width);
  expect(after.y).toBe(before.y);
  expect(after.height).toBeGreaterThan(before.height + 150);
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(links).toHaveJSProperty('inert', true);
  await toggle.click();
  await page.locator('h1').click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await links.getByRole('link', { name: 'Método' }).click();
  await expect(page).toHaveURL(/#metodo$/);
  await expect(page.locator('#metodo')).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.nav-actions .login-link')).toHaveAttribute(
    'href',
    'https://oslermedicina.com.br/app',
  );
  expect(errors).toEqual([]);
});

test('Osler layout fits small screens and reveals content with motion preferences', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(path);
  await expect(page.locator('html')).toHaveClass(/motion-ready/);
  const card = page.locator('.feature-card').first();
  await expect(card).toHaveCSS('opacity', '0');
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).not.toHaveClass(/motion-ready/);
  expect(
    await page
      .locator('.reveal')
      .evaluateAll((items) =>
        items.every((item) => getComputedStyle(item).opacity === '1'),
      ),
  ).toBe(true);
  for (const width of [1440, 1024, 768, 480, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test('Osler remains readable and navigable without its script', async ({
  page,
}) => {
  await page.route('**/osler/website/script.js', (route) => route.abort());
  await page.goto(path);
  await expect(page.locator('.nav-toggle')).toBeHidden();
  await expect(page.locator('#osler-navigation')).toBeVisible();
  expect(
    await page
      .locator('.reveal')
      .evaluateAll((items) =>
        items.every((item) => getComputedStyle(item).opacity === '1'),
      ),
  ).toBe(true);
  await page
    .locator('#osler-navigation')
    .getByRole('link', { name: 'Jornada' })
    .click();
  await expect(page).toHaveURL(/#jornada$/);
});
