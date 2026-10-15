import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const services = [
  ['websites', 'websites', 'o_xZCJTFrZ4dEJv36flE'],
  ['aplicativos', 'aplicativos', 'OJNrCJfFrZ4dEJv36flE'],
  ['sistemas', 'sistemas', '-LYLCJrFrZ4dEJv36flE'],
  ['ai-solutions', 'aiSolutions', 'OIzpCJ3FrZ4dEJv36flE'],
  ['reestruturacao', 'reestruturacao', '7jDQCNTGrZ4dEJv36flE'],
];
const conversions = (page) =>
  page.evaluate(() =>
    (window.dataLayer || [])
      .filter((entry) => entry[0] === 'event' && entry[1] === 'conversion')
      .map((entry) => entry[2]),
  );
const dialog = (page) => page.locator('#project-dialog');
async function openHeader(page) {
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.locator('header [data-open-project]').click();
}
async function clickWhatsApp(page) {
  const popup = page.waitForEvent('popup');
  await page.locator('[data-whatsapp-conversion]').click();
  const destination = await popup;
  await destination.waitForLoadState();
  expect(destination.url()).toMatch(/^https:\/\/wa.me\/551151977551\?/);
  await destination.close();
}

test.beforeEach(async ({ context }) => {
  // Never send test conversions or contact real WhatsApp/AI services.
  await context.route('https://www.googletagmanager.com/**', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' }),
  );
  await context.route('https://wa.me/**', (route) =>
    route.fulfill({ body: 'WhatsApp test destination' }),
  );
  await context.route('**/api/ai/chat', (route) =>
    route.fulfill({
      json: {
        reply: 'Podemos criar um chatbot. Vamos conversar?',
        topic: 'chatbots',
      },
    }),
  );
});

for (const [slug, service, label] of services) {
  test(`${slug}: every opener captures origin; only final WhatsApp clicks convert`, async ({
    page,
  }) => {
    await page.goto(`/${slug}`);
    await page
      .locator('[data-cookie-notice] [data-cookie-choice="granted"]')
      .click();
    expect(await conversions(page)).toEqual([]);
    const openers = page.locator('[data-open-project]');
    let count = 0;
    for (let i = 0; i < (await openers.count()); i++) {
      const opener = openers.nth(i);
      if ((await opener.getAttribute('data-ai-project')) !== null) {
        await page
          .getByRole('button', { name: 'Atendimento', exact: true })
          .click();
        await expect(opener).toBeVisible();
      }
      const header = await opener.evaluate((node) => !!node.closest('header'));
      if (header) await openHeader(page);
      else await opener.click();
      await expect(dialog(page)).toHaveAttribute(
        'data-origin-service',
        service,
      );
      await expect(dialog(page)).toHaveAttribute(
        'data-origin-route',
        `/${slug}`,
      );
      const trigger = await dialog(page).getAttribute('data-origin-trigger');
      expect(trigger).toBeTruthy();
      if (header) expect(trigger).toBe('header');
      expect(await conversions(page)).toHaveLength(count);
      // Repeated requests while open must not replace the recorded context.
      await page
        .locator('.closing-section [data-open-project]')
        .evaluate((node) => {
          node.click();
          node.click();
        });
      await expect(dialog(page)).toHaveAttribute(
        'data-origin-trigger',
        trigger,
      );
      expect(await conversions(page)).toHaveLength(count);
      await clickWhatsApp(page);
      count++;
      expect(await conversions(page)).toEqual(
        Array.from({ length: count }, () => ({
          send_to: `AW-18509101979/${label}`,
        })),
      );
      await page.locator('#project-dialog [data-close-dialog]').click();
      await expect(dialog(page)).not.toHaveAttribute('data-origin-service');
    }
    await openHeader(page);
    expect(await conversions(page)).toHaveLength(count);
    // A new deliberate final click is a new interaction, even in the same modal.
    await clickWhatsApp(page);
    await clickWhatsApp(page);
    expect(await conversions(page)).toHaveLength(count + 2);
  });
}

test('consent defaults to denied, persists, revokes and never replays earlier clicks', async ({
  page,
}) => {
  await page.goto('/websites');
  const tag = page.locator('script[src*="googletagmanager.com/gtag/js"]');
  await expect(tag).toHaveCount(0);
  await openHeader(page);
  await clickWhatsApp(page);
  expect(await conversions(page)).toEqual([]);
  await page.locator('#project-dialog [data-close-dialog]').click();
  await page
    .locator('[data-cookie-notice] [data-cookie-choice="denied"]')
    .click();
  await page.reload();
  await expect(page.locator('[data-cookie-notice]')).toBeHidden();
  await expect(tag).toHaveCount(0);
  await page.locator('[data-dialog="privacy-dialog"]').click();
  await page.locator('#privacy-dialog [data-cookie-choice="granted"]').click();
  await expect(tag).toHaveCount(1);
  expect(await conversions(page)).toEqual([]);
  await page.locator('#privacy-dialog [data-cookie-choice="granted"]').click();
  expect(
    await page.evaluate(
      () => window.dataLayer.filter((entry) => entry[0] === 'config').length,
    ),
  ).toBe(1);
  await page.locator('#privacy-dialog [data-close-dialog]').click();
  await page.reload();
  await expect(tag).toHaveCount(1);
  await openHeader(page);
  await clickWhatsApp(page);
  expect(await conversions(page)).toHaveLength(1);
  await page.locator('#project-dialog [data-close-dialog]').click();
  await page.locator('[data-dialog="privacy-dialog"]').click();
  await page.locator('#privacy-dialog [data-cookie-choice="denied"]').click();
  await page.locator('#privacy-dialog [data-close-dialog]').click();
  await openHeader(page);
  await clickWhatsApp(page);
  expect(await conversions(page)).toHaveLength(1);
  await page.reload();
  await expect(tag).toHaveCount(0);
});

test('navigation resets service; institutional, contact and portfolio never inherit a conversion', async ({
  page,
}) => {
  await page.goto('/websites');
  await page
    .locator('[data-cookie-notice] [data-cookie-choice="granted"]')
    .click();
  for (const path of [
    '/websites',
    '/aplicativos',
    '/',
    '/portifolio',
    '/contato?interesse=Websites',
  ]) {
    await page.goto(path);
    await openHeader(page);
    const service =
      path === '/websites'
        ? 'websites'
        : path === '/aplicativos'
          ? 'aplicativos'
          : '';
    await expect(dialog(page)).toHaveAttribute('data-origin-service', service);
    await clickWhatsApp(page);
    expect(await conversions(page)).toHaveLength(service ? 1 : 0);
  }
});

test('blocked storage and failed tags never prevent contact; banner is accessible at 320px', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('Storage unavailable');
    };
    Storage.prototype.setItem = () => {
      throw new Error('Storage unavailable');
    };
  });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/sistemas');
  await expect(page.locator('[data-cookie-notice]')).toBeVisible();
  const audit = await new AxeBuilder({ page })
    .include('[data-cookie-notice]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator('[data-cookie-notice] [data-cookie-choice="granted"]')
    .click();
  await page.evaluate(() => {
    window.gtag = () => {
      throw new Error('Tag blocked');
    };
  });
  await openHeader(page);
  await clickWhatsApp(page);
});

test('existing Google tag and dataLayer are reused without duplicate installation', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('byaskora.ads-consent.v1', 'granted');
    window.dataLayer = [['existing-event'], ['config', 'AW-18509101979']];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    const script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=AW-18509101979';
    document.documentElement.append(script);
  });
  await page.goto('/websites');
  await expect(
    page.locator('script[src*="googletagmanager.com/gtag/js"]'),
  ).toHaveCount(1);
  expect(
    await page.evaluate(
      () => window.dataLayer.filter((entry) => entry[0] === 'config').length,
    ),
  ).toBe(1);
  expect(await page.evaluate(() => window.dataLayer[0])).toEqual([
    'existing-event',
  ]);
  await openHeader(page);
  await clickWhatsApp(page);
  expect(await conversions(page)).toHaveLength(1);
});
