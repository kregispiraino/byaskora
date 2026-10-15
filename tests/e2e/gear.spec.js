import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const path = '/projetos/gear-seo/website/';

test('Gear preserves readable responsive content and keyboard navigation', async ({
  page,
}) => {
  const errors = [];
  const videos = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/\.(mp4|webm)(?:\?|$)/.test(request.url())) videos.push(request.url());
  });
  await page.goto(path);
  for (const width of [1440, 1024, 768, 480, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const geometry = await page
      .locator('.hero-content h1')
      .evaluate((heading) => {
        const style = getComputedStyle(heading);
        return {
          align: style.textAlign,
          tracking:
            parseFloat(style.letterSpacing) / parseFloat(style.fontSize),
          leading: parseFloat(style.lineHeight) / parseFloat(style.fontSize),
          fits: heading.scrollWidth <= heading.clientWidth + 1,
        };
      });
    expect(geometry.align).toBe('left');
    expect(geometry.tracking).toBeGreaterThan(-0.05);
    expect(geometry.leading).toBeGreaterThan(1.05);
    expect(geometry.fits).toBe(true);
    const content = await page.locator('.hero-content').boundingBox();
    const metrics = await page.locator('.hero-metrics').boundingBox();
    expect(content.y + content.height).toBeLessThan(metrics.y);
  }
  const toggle = page.locator('.menu-toggle');
  const nav = page.locator('.mobile-nav');
  await toggle.click();
  await expect(nav).toHaveJSProperty('inert', false);
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(nav).toHaveJSProperty('inert', true);
  await toggle.click();
  await nav.getByRole('link', { name: 'Soluções' }).click();
  await expect(page).toHaveURL(/#servicos$/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#servicos')).toBeFocused();
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  expect(videos).toEqual([]);
  expect(errors).toEqual([]);
});

test('Gear expands its floating card and supports playback, seeking and minimization', async ({
  page,
}) => {
  await page.goto(path);
  const card = page.locator('.floating-video-card');
  const player = page.locator('.presentation-video');
  const launcher = page.locator('.presentation-launch');
  const bubble = page.locator('.floating-video-bubble');
  await expect(player).not.toHaveAttribute('src');
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(card).toHaveCSS('position', 'fixed');
    const compact = await card.boundingBox();
    await launcher.click();
    await expect(card).toHaveClass(/is-expanded/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(player).toHaveAttribute('src', 'presentation.mp4');
    await expect
      .poll(() => player.evaluate((video) => video.readyState))
      .toBeGreaterThanOrEqual(2);
    await expect(player).toHaveJSProperty('error', null);
    await expect(player).toHaveJSProperty('paused', false);
    await expect(player).toHaveJSProperty('muted', false);
    const expanded = await card.boundingBox();
    expect(expanded.width).toBeGreaterThan(compact.width);
    expect(expanded.x).toBeGreaterThanOrEqual(0);
    expect(expanded.y).toBeGreaterThanOrEqual(0);
    expect(expanded.x + expanded.width).toBeLessThanOrEqual(viewport.width);
    expect(expanded.y + expanded.height).toBeLessThanOrEqual(viewport.height);
    await page
      .getByRole('button', { name: 'Pausar vídeo', exact: true })
      .click();
    await expect(player).toHaveJSProperty('paused', true);
    await page.getByRole('slider', { name: 'Posição do vídeo' }).fill('50');
    expect(
      await player.evaluate((video) =>
        Math.abs(video.currentTime / video.duration - 0.5),
      ),
    ).toBeLessThan(0.02);
    await page
      .getByRole('button', { name: 'Reproduzir vídeo', exact: true })
      .click();
    await expect(player).toHaveJSProperty('paused', false);
    await page.getByRole('button', { name: 'Minimizar apresentação' }).click();
    await expect(card).toBeHidden();
    await expect(player).toHaveJSProperty('paused', true);
    await expect(bubble).toBeFocused();
    await bubble.click();
    await expect(card).not.toHaveClass(/is-expanded/);
    await expect(launcher).toBeFocused();
    await expect(player).toHaveJSProperty('muted', true);
  }
  await launcher.click();
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
  await expect(bubble).toBeFocused();
});

test('Gear respects motion preferences and remains readable without its script', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(path);
  const hero = page.locator('.hero-video');
  await expect(hero).toHaveAttribute('src', 'background_video.mp4');
  await page.locator('.hero-motion').click();
  await expect(hero).toHaveJSProperty('paused', true);
  await expect(page.locator('.hero-motion')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('.hero-motion').click();
  await page.locator('#contato').scrollIntoViewIfNeeded();
  await expect(hero).toHaveJSProperty('paused', true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.hero-motion')).toBeHidden();
  await page.route('**/gear-seo/website/script.js', (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  await expect(page.locator('.service-card').first()).toHaveCSS('opacity', '1');
  await page
    .locator('.mobile-nav')
    .getByRole('link', { name: 'Soluções' })
    .click();
  await expect(page).toHaveURL(/#servicos$/);
  await expect(hero).not.toHaveAttribute('src');
});
