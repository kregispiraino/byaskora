import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('portfolio presents four projects, correct navigation and isolated website previews', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/portifolio');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('.project-card')).toHaveCount(4);
  await expect(page.locator('.project-actions button:disabled')).toHaveCount(1);
  await expect(page.locator('.nav-pages a[aria-current="page"]')).toHaveText(
    'Portfólio',
  );
  await expect(page.locator('.nav-pages a[href="/portifolio"] + a')).toHaveText(
    'Contato',
  );
  await expect(page.locator('#askora .project-actions a')).toHaveAttribute(
    'href',
    'https://askora.com.br/',
  );
  await expect(page.locator('#askora .project-actions a')).toContainText(
    'Explorar produto',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://byaskora.com/portifolio',
  );
  for (const id of ['askora', 'osler', 'gear-seo', 'aml']) {
    const image = page.locator(`#${id} .project-visual img`);
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (img) =>
            img.complete &&
            img.naturalWidth === 1280 &&
            img.naturalHeight === 800,
        ),
      )
      .toBe(true);
  }
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .disableRules(['color-contrast'])
    .analyze();
  expect(audit.violations).toEqual([]);
  // Brand lettering is exempt under WCAG 1.4.3; all content is measured.
  const contrast = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .exclude('.brand-by')
    .analyze();
  expect(contrast.violations).toEqual([]);
  await page.locator('.portfolio-next [data-open-project]').click();
  await expect(page.locator('#project-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  for (const id of ['osler', 'gear-seo', 'aml']) {
    await page.locator(`#${id} .project-actions a`).click();
    await expect(page).toHaveURL(new RegExp(`/projetos/${id}/website/`));
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex,nofollow',
    );
    await expect(page.locator('img').first()).toBeVisible();
    await page
      .getByRole('link', { name: 'Voltar ao portfólio do ByAskora' })
      .click();
    await expect(page).toHaveURL(new RegExp(`/portifolio#${id}`));
  }
  expect(errors).toEqual([]);
});

test('portfolio gallery and expanded navigation fit desktop, tablet and mobile', async ({
  page,
}) => {
  await page.goto('/portifolio');
  for (const width of [1440, 1200, 1100, 1024, 981, 980, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width > 980) {
      expect(
        await page.evaluate(
          () =>
            document.querySelector('.nav-card').getBoundingClientRect().left >
            document.querySelector('.page-brand').getBoundingClientRect().right,
        ),
      ).toBe(true);
    } else {
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await expect(
        page.locator('.nav-pages a[href="/portifolio"]'),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('button', { name: 'Menu', exact: true }),
      ).toHaveAttribute('aria-expanded', 'false');
    }
  }
});
