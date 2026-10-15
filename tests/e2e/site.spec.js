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
        images
          .filter((img) => img.loading !== 'lazy')
          .every((img) => img.complete && img.naturalWidth > 0),
      ),
  ).toBe(true);
  expect(await (await request.get('/robots.txt')).text()).toContain('Allow: /');
  expect(await (await request.get('/sitemap.xml')).text()).toContain(
    'https://byaskora.com/',
  );
  expect((await request.get('/missing-page')).status()).toBe(404);
});

test('five development pillars support keyboard navigation and service links', async ({
  page,
}) => {
  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(5);
  const first = page.getByRole('tab', { name: /^Websites/ });
  await first.focus();
  await first.press('ArrowDown');
  await expect(page.getByRole('tab', { name: /^Aplicativos/ })).toBeFocused();
  await expect(page.locator('#panel-apps')).toBeVisible();
  await page.getByRole('tab', { name: /^Aplicativos/ }).press('End');
  await expect(page.locator('#panel-mais')).toBeVisible();
  await page.getByRole('tab', { name: /^E mais/ }).press('ArrowDown');
  await expect(first).toBeFocused();
  await expect(page.locator('#panel-sites')).toBeVisible();
  await expect(page.locator('.expertise-band span')).toHaveText([
    'Websites',
    'Aplicativos',
    'Sistemas',
    'AI Solutions',
    'E mais',
  ]);
  for (const [name, url] of [
    ['Websites', '/websites'],
    ['Aplicativos', '/aplicativos'],
    ['Sistemas', '/sistemas'],
    ['AI Solutions', '/ai-solutions'],
  ]) {
    await expect(
      page.locator('footer').getByRole('link', { name, exact: true }),
    ).toHaveAttribute('href', url);
  }
});

test('static pillar previews link to services; E mais opens the contact chooser', async ({
  page,
}) => {
  for (const [key, path, count] of [
    ['sites', '/websites', 1],
    ['apps', '/aplicativos', 3],
    ['sistemas', '/sistemas', 1],
    ['ai', '/ai-solutions', 1],
  ]) {
    await page.locator(`#tab-${key}`).click();
    const panel = page.locator(`#panel-${key}`);
    await expect(panel.locator('.pillar-preview img')).toHaveCount(count);
    await expect(panel.locator('button, input, canvas')).toHaveCount(0);
    await expect(panel.getByRole('link')).toHaveAttribute('href', path);
    await expect
      .poll(() =>
        panel
          .locator('img')
          .evaluateAll((images) =>
            images.every((img) => img.complete && img.naturalWidth > 0),
          ),
      )
      .toBe(true);
  }
  await page.locator('#tab-mais').click();
  await expect(page.locator('#panel-mais img')).toHaveCount(0);
  await page.locator('#panel-mais [data-open-project]').click();
  const dialog = page.locator('#project-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
    'href',
    'https://wa.me/551151977551?text=Ol%C3%A1%20%F0%9F%91%8B%20Falo%20com%20o%20time%20Askora',
  );
  await expect(dialog.locator('form')).toHaveCount(0);
  await dialog.locator('[data-contact-page]').click();
  await expect(page).toHaveURL(/\/contato\?interesse=/);
  await expect(page.locator('h1')).toHaveText('Contato');
  await expect(
    page.getByRole('radio', { name: 'Outro projeto' }),
  ).toBeChecked();
});

test('contact form validates, preserves data on failure and confirms a retry', async ({
  page,
}) => {
  const requests = [];
  await page.route(/\/api\/(?:public\/)?contact$/, async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      json:
        requests.length === 1
          ? { data: {} }
          : { data: { saved: true, sent: false } },
    });
  });
  await page.goto('/contato?interesse=Aplicativos');
  await expect(
    page.getByRole('radio', { name: 'Aplicativos', exact: true }),
  ).toBeChecked();
  await page
    .getByRole('button', { name: 'Solicitar contato', exact: true })
    .click();
  await expect(page.locator('#contact-name')).toBeFocused();
  await page.locator('#contact-name').fill('João <script>alert(1)</script>');
  await page.locator('#contact-email').fill('invalid');
  await page
    .locator('#contact-context')
    .fill('Preciso de um aplicativo para meus clientes.');
  await page
    .getByRole('button', { name: 'Solicitar contato', exact: true })
    .click();
  await expect(page.locator('#contact-email')).toBeFocused();
  await page.locator('#contact-email').fill('joao@example.com');
  await page.locator('#contact-phone').fill('123');
  await page
    .getByRole('button', { name: 'Solicitar contato', exact: true })
    .click();
  await expect(page.locator('#contact-phone')).toBeFocused();
  await page.locator('#contact-phone').fill('(11) 99999-9999');
  await page
    .getByRole('button', { name: 'Solicitar contato', exact: true })
    .click();
  await expect(page.locator('#form-feedback')).toContainText(
    'Não foi possível confirmar o envio',
  );
  await expect(page.locator('[data-contact-success]')).toBeHidden();
  await expect(page.locator('#contact-name')).toHaveValue(
    'João <script>alert(1)</script>',
  );
  await page
    .getByRole('button', { name: 'Solicitar contato', exact: true })
    .click();
  await expect(page.locator('[data-contact-success]')).toBeVisible();
  await expect(page.locator('#contact-success-title')).toBeFocused();
  expect(requests).toHaveLength(2);
  expect(requests[0]).toEqual(requests[1]);
  expect(requests[1]).toMatchObject({
    kind: 'contact',
    topic: 'Aplicativos',
    email: 'joao@example.com',
  });
});

test('contact form waits for delivery confirmation and prevents repeat submissions', async ({
  page,
}) => {
  let release;
  let requests = 0;
  await page.route(/\/api\/(?:public\/)?contact$/, async (route) => {
    requests++;
    expect(route.request().headers()['x-askora-request']).toBe('1');
    expect(route.request().headers().cookie).toBeUndefined();
    await new Promise((resolve) => {
      release = resolve;
    });
    await route.fulfill({ json: { data: { sent: true } } });
  });
  await page.goto('/contato?interesse=Websites');
  await page.locator('#contact-name').fill('Ana Silva');
  await page.locator('#contact-email').fill('ana@example.test');
  await page
    .locator('#contact-context')
    .fill('Preciso de um website para minha empresa.');
  await page
    .getByRole('button', { name: 'Solicitar contato', exact: true })
    .click();
  await expect(page.locator('#project-form')).toHaveAttribute(
    'aria-busy',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
  await expect(page.locator('[data-contact-success]')).toBeHidden();
  await page
    .locator('#project-form')
    .evaluate((form) =>
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      ),
    );
  await expect.poll(() => requests).toBe(1);
  release();
  await expect(page.locator('[data-contact-success]')).toBeVisible();
  expect(requests).toBe(1);
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
  for (const tab of ['apps', 'sistemas', 'mais']) {
    await page.locator(`#tab-${tab}`).click();
    await audit();
  }
  await page.locator('.hero-actions [data-open-project]').click();
  await audit();
  await page.locator('[data-contact-page]').click();
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
  await page.goto('/reestruturacao');
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
  ).toHaveAttribute('href', '/contato');
  await context.close();
});

test('canvas failure preserves the vector character and functional contact', async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.reload();
  await expect(page.locator('.mascot-portrait')).toBeVisible();
  await expect(page.locator('[data-signal-scene]')).toHaveCount(0);
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
  ).toHaveAttribute('href', '/contato');
});
