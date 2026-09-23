import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const browserErrors = new WeakMap();
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) || []).toEqual([]);
});

test.beforeEach(async ({ page }) => {
  const errors = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dialogs-ready/);
});

test('SEO, local assets, anchors and security headers', async ({
  page,
  request,
}) => {
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://byaskora.com/',
  );
  const response = await request.get('/');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['content-security-policy']).toContain(
    "script-src 'self'",
  );
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="#"], use[href^="#"]')]
      .map((el) => el.getAttribute('href').slice(1))
      .filter((id) => !document.getElementById(id)),
  );
  expect(broken).toEqual([]);
  const ids = await page
    .locator('[id]')
    .evaluateAll((elements) => elements.map((el) => el.id));
  expect(new Set(ids).size).toBe(ids.length);
  expect(
    await page
      .locator('img')
      .evaluateAll((images) =>
        images.every((img) => img.complete && img.naturalWidth > 0),
      ),
  ).toBe(true);
  expect(await (await request.get('/robots.txt')).text()).toContain('Allow: /');
  expect(await (await request.get('/sitemap.xml')).text()).toContain(
    'https://byaskora.com/',
  );
  expect((await request.get('/missing-page')).status()).toBe(404);
});

test('service tabs support keyboard and footer shortcuts', async ({ page }) => {
  const first = page.getByRole('tab', { name: /Sistemas web/ });
  await first.focus();
  await first.press('ArrowDown');
  await expect(page.getByRole('tab', { name: /Dashboards/ })).toBeFocused();
  await expect(page.locator('#panel-dashboards')).toBeVisible();
  await page.getByRole('tab', { name: /Dashboards/ }).press('End');
  await expect(page.locator('#panel-sites')).toBeVisible();
  await page.locator('[data-service="automacoes"]').click();
  await expect(page.locator('#panel-automacoes')).toBeVisible();
});

test('contact validation, review, editing, escaping and reset of interest', async ({
  page,
}) => {
  await page.locator('#tab-dashboards').click();
  await page.locator('#panel-dashboards [data-open-project]').click();
  const dialog = page.locator('#project-dialog');
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.locator('#contact-name')).toBeFocused();
  await expect(page.locator('#contact-name')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.locator('#contact-name').fill('João <script>alert(1)</script>');
  await page.locator('#contact-email').fill('invalid');
  await page
    .locator('#contact-context')
    .fill('Preciso de um painel de indicadores.');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.locator('#contact-email')).toBeFocused();
  await page.locator('#contact-email').fill('joao@example.com');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.locator('#message-preview')).toHaveValue(
    /Interesse: Dashboard/,
  );
  await expect(page.locator('#message-preview')).toHaveValue(
    /<script>alert\(1\)<\/script>/,
  );
  const mail = new URL(
    await page.locator('#message-email').getAttribute('href'),
  );
  expect(mail.searchParams.get('body')).toContain('joao@example.com');
  await page.getByRole('button', { name: 'Editar informações' }).click();
  await expect(page.locator('#contact-email')).toHaveValue('joao@example.com');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.locator('.hero-actions [data-open-project]').click();
  await expect(page.locator('#contact-type')).toHaveValue('Projeto sob medida');
});

test('dialog focus, privacy and mobile menu', async ({ page, isMobile }) => {
  if (isMobile) {
    const menu = page.getByRole('button', { name: 'Menu', exact: true });
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await page.locator('.nav-contact').click();
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
  }
  await page.locator('.privacy-trigger').click();
  await expect(page.locator('#privacy-dialog')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#privacy-dialog a').last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.locator('#privacy-dialog [data-close-dialog]'),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.privacy-trigger')).toBeFocused();
});

test('no accessibility violations in page, each tab and dialog steps', async ({
  page,
}) => {
  test.setTimeout(90000);
  const audit = async () => {
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze();
    expect(violations).toEqual([]);
    // WCAG 1.4.3 exempts logotypes. Only the original brand lettering is excluded
    // from contrast measurement; every other accessibility rule still covers it.
    const contrast = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .exclude('.brand-by')
      .exclude('.emblem-word')
      .analyze();
    expect(contrast.violations).toEqual([]);
  };
  await audit();
  for (const tab of ['dashboards', 'automacoes', 'sites']) {
    await page.locator(`#tab-${tab}`).click();
    await audit();
  }
  await page.locator('.hero-actions [data-open-project]').click();
  await audit();
  await page.locator('#contact-name').fill('Maria');
  await page.locator('#contact-email').fill('maria@example.com');
  await page.locator('#contact-context').fill('Preciso desenvolver um site.');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await audit();
});

test('layout fits widths from 320 to 1920 pixels', async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test('circuit honors reduced motion and resumes only on explicit request', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-signal-scene]')).toHaveAttribute(
    'data-paused',
    'true',
  );
  await page.getByRole('switch').click();
  await expect(page.getByRole('switch')).toHaveAttribute(
    'aria-checked',
    'true',
  );
  const state = () =>
    page.locator('[data-signal-scene]').evaluate((host) => host.signalDebug());
  expect((await state()).scheduled).toBe(false);
  await page.getByRole('button', { name: 'Retomar animação' }).click();
  await expect.poll(async () => (await state()).clock).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pausar animação' }).click();
  expect((await state()).scheduled).toBe(false);
});

test('content and direct contact survive unavailable JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(baseURL);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('#panel-sites')).toBeVisible();
  await expect(page.locator('#main-navigation')).toBeVisible();
  await expect(
    page.locator('.hero-actions [data-open-project]'),
  ).toHaveAttribute('href', 'mailto:contato@askora.com.br');
  await context.close();
});

test('canvas failure preserves SVG fallback and functional contact', async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.reload();
  await expect(page.locator('.signal-fallback')).toBeVisible();
  await expect(page.getByRole('switch')).toBeDisabled();
  await page.locator('.hero-actions [data-open-project]').click();
  await expect(page.locator('#project-dialog')).toBeVisible();
});

test('failed module download restores readable services and direct contact', async ({
  page,
}) => {
  await page.route('**/assets/*.js', (route) => route.abort());
  // Network errors are expected only in this deliberate outage scenario.
  page.removeAllListeners('console');
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/enhancing/);
  await expect(page.locator('#panel-sites')).toBeVisible();
  await expect(
    page.locator('.hero-actions [data-open-project]'),
  ).toHaveAttribute('href', 'mailto:contato@askora.com.br');
});
