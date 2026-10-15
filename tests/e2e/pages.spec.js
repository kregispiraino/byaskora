import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = [
  '',
  'websites',
  'aplicativos',
  'sistemas',
  'ai-solutions',
  'reestruturacao',
  'contato',
  'portifolio',
];

test('all ByAskora routes load only their page resources and remain usable', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()}: ${response.url()}`);
  });
  for (const route of routes) {
    await page.goto(`/${route}`);
    await expect(page.locator('html')).toHaveClass(/dialogs-ready/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(
      page.locator('.nav-pages [aria-current="page"]'),
    ).toHaveAttribute('href', route ? `/${route}` : '/');
    const urls = await page
      .locator(
        'script[type="module"][src], link[rel="modulepreload"], link[rel="stylesheet"]',
      )
      .evaluateAll((elements) => [
        ...new Set(elements.map((el) => el.src || el.href)),
      ]);
    // Resource Timing may report zero for cached stylesheets; measure the actual assets.
    const sizes = await Promise.all(
      urls.map(async (url) => {
        const response = await page.request.get(url);
        expect(response.ok()).toBe(true);
        return {
          type: new URL(url).pathname.split('.').at(-1),
          size: (await response.body()).length,
        };
      }),
    );
    const assets = sizes.reduce(
      (sum, asset) => {
        if (asset.type === 'js' || asset.type === 'css')
          sum[asset.type] += asset.size;
        return sum;
      },
      { js: 0, css: 0 },
    );
    // Uncompressed production budgets guard against reintroducing every demo on every page.
    expect(assets.js).toBeGreaterThan(0);
    // Consent and Ads add ~3 KB to the shared bundle; the circuit page is the largest.
    expect(assets.js).toBeLessThan(route === 'reestruturacao' ? 28000 : 25000);
    expect(assets.css).toBeGreaterThan(0);
    expect(assets.css).toBeLessThan(65000);
    const documentState = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
      const broken = [
        ...document.querySelectorAll('a[href^="#"], use[href^="#"]'),
      ]
        .map((el) => el.getAttribute('href').slice(1))
        .filter((id) => !document.getElementById(id));
      return {
        duplicates: ids.length - new Set(ids).size,
        broken,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(documentState).toEqual({
      duplicates: 0,
      broken: [],
      overflow: false,
    });
  }
  expect(errors).toEqual([]);
});

test('portfolio keeps its project order, actions and contact without opening templates', async ({
  page,
}) => {
  await page.goto('/portifolio');
  expect(
    await page
      .locator('.project-card')
      .evaluateAll((cards) => cards.map((card) => card.id)),
  ).toEqual(['askora', 'osler', 'aml', 'gear-seo']);
  for (const id of ['aml', 'gear-seo']) {
    await expect(page.locator(`#${id} .project-actions`)).toHaveText(
      'Ver website',
    );
  }
  await expect(page.locator('#osler .project-actions button')).toBeDisabled();
  await page.locator('.portfolio-next [data-open-project]').click();
  await expect(page.locator('#project-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .exclude('.brand-by')
    .analyze();
  expect(audit.violations).toEqual([]);
});
