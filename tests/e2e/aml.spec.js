import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const path = '/projetos/aml/website/';

test('AML text navigation, content and form remain accessible at different widths', async ({
  page,
}) => {
  const errors = [];
  const mediaRequests = [];
  const submissions = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (
      request.method() !== 'GET' ||
      ['fetch', 'xhr'].includes(request.resourceType())
    )
      submissions.push(request.url());
    if (/hero-video\.(mp4|webm)/.test(request.url()))
      mediaRequests.push(request.url());
  });
  await page.goto(path);
  await expect(page.locator('.hero-fade, .site-menu, .header-cta')).toHaveCount(
    0,
  );
  await expect(page.locator('.nav-links a')).toHaveCount(4);
  for (const width of [1440, 1024, 768, 480, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const header = await page.locator('.site-header').boundingBox();
    const hero = await page.locator('.hero-content').boundingBox();
    expect(header.y + header.height).toBeLessThan(hero.y);
    expect(
      await page
        .locator('.metric')
        .evaluateAll((cards) =>
          cards.every((card) => card.scrollWidth <= card.clientWidth + 1),
        ),
    ).toBe(true);
  }
  await page
    .getByRole('navigation', { name: 'Menu principal' })
    .getByRole('link', { name: 'Contato' })
    .click();
  await expect(page).toHaveURL(/#contato$/);
  await page.getByRole('button', { name: 'Solicitar contato' }).click();
  await expect(page.getByRole('status')).toHaveCount(0);
  await page
    .getByRole('textbox', { name: 'Nome', exact: true })
    .fill('Demonstração');
  await page
    .getByRole('textbox', { name: 'E-mail corporativo' })
    .fill('demo@example.com');
  await page
    .getByRole('textbox', { name: 'Empresa', exact: true })
    .fill('Empresa de demonstração');
  const picker = page.locator('.interest-picker');
  const formHeight = await page
    .locator('.contact-form')
    .evaluate((el) => el.offsetHeight);
  for (const label of await picker
    .locator('.interest-option span')
    .allTextContents()) {
    await picker.locator('.interest-trigger').click();
    // Click the visible label as a visitor does, not the hidden radio input.
    await picker.locator('.interest-option').filter({ hasText: label }).click();
    await expect(page.locator('#aml-interest-value')).toHaveText(label);
    await expect(
      picker.getByRole('radio', {
        name: label,
        exact: true,
        includeHidden: true,
      }),
    ).toBeChecked();
    await expect(picker.locator('.interest-trigger')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(
      await page.locator('.contact-form').evaluate((el) => el.offsetHeight),
    ).toBe(formHeight);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await picker.locator('.interest-trigger').press('Enter');
  await expect(picker.locator('.interest-trigger')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(picker.locator('.interest-trigger')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(picker.locator('.interest-trigger')).toBeFocused();
  await page
    .getByRole('textbox', { name: 'O que sua instituição precisa?' })
    .fill('Analisar nossos fornecedores.');
  await page.getByRole('button', { name: 'Solicitar contato' }).click();
  await expect(page.getByRole('status')).toHaveText('Solicitação recebida.');
  await expect(page.locator('.contact-form-content')).toBeHidden();
  expect(
    await page.locator('.contact-form').evaluate((el) => el.offsetHeight),
  ).toBeLessThan(formHeight);
  await page.getByRole('button', { name: 'Preencher novamente' }).click();
  await expect(
    page.getByRole('textbox', { name: 'Nome', exact: true }),
  ).toHaveValue('');
  await expect(page.locator('#aml-interest-value')).toHaveText(
    'Selecione uma solução',
  );
  expect(submissions).toEqual([]);
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  expect(mediaRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('AML controls motion, pauses offscreen video and finishes counters', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(path);
  const root = page.locator('html');
  await expect(root).toHaveClass(/motion-enabled/);
  await expect(page.locator('.hero-video source').first()).toHaveAttribute(
    'src',
    /hero-video\.mp4/,
  );
  const pause = page.locator('.hero-motion');
  await pause.click();
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.hero-video')).toHaveJSProperty('paused', true);
  await pause.click();
  await expect(pause).toHaveAttribute('aria-pressed', 'false');
  await page.locator('.metrics-grid').scrollIntoViewIfNeeded();
  await expect(page.locator('.hero-video')).toHaveJSProperty('paused', true);
  await expect(page.locator('[data-count="1000"]')).toHaveText('+1.000');
  await expect(page.locator('[data-count="1.2"]')).toHaveText('+1,2 milhão');
  const card = page.locator('.card').last();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(root).not.toHaveClass(/motion-enabled/);
  await expect(page.locator('.segments-group[aria-hidden]')).toBeHidden();
  await expect
    .poll(() =>
      page
        .locator('[data-reveal], [data-reveal-group] > *')
        .evaluateAll((items) =>
          items.every((item) => getComputedStyle(item).opacity === '1'),
        ),
    )
    .toBe(true);
});

test('AML has complete segment content and navigation without its script', async ({
  page,
}) => {
  await page.route('**/aml/website/script.js', (route) => route.abort());
  await page.goto(path);
  await expect(page.locator('.segments-group .segment')).toHaveCount(12);
  await expect(page.locator('.motion-toggle').first()).toBeHidden();
  await page
    .locator('.nav-links')
    .getByRole('link', { name: 'Tecnologia' })
    .click();
  await expect(page).toHaveURL(/#solucoes$/);
  await expect(page.locator('.card').first()).toHaveCSS('opacity', '1');
  await expect(page.locator('.hero-video source').first()).not.toHaveAttribute(
    'src',
  );
});

test('AML mobile keeps controls and confirmation in view in both orientations', async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(path);
    await expect(page.locator('.byaskora-preview-back')).toHaveCSS(
      'position',
      'static',
    );
    if (viewport.width < 600)
      await expect(page.locator('.hero-actions')).toBeInViewport({ ratio: 1 });
    await page.locator('#aml-name').fill('Demonstração');
    await page.locator('#aml-email').fill('demo@example.com');
    await page.locator('#aml-company').fill('Empresa');
    await page.locator('.interest-trigger').click();
    await expect
      .poll(async () => {
        const box = await page.locator('.interest-options').boundingBox();
        return box && box.y >= 0 && box.y + box.height <= viewport.height;
      })
      .toBe(true);
    await page
      .locator('.interest-option')
      .filter({ hasText: 'Ainda não sei' })
      .click();
    await expect(page.locator('#aml-interest-value')).toHaveText(
      'Ainda não sei',
    );
    await page.locator('.form-button').click();
    await expect(page.getByRole('status')).toHaveText('Solicitação recebida.');
    await expect(page.locator('.contact-success')).toBeInViewport({ ratio: 1 });
    await page.locator('.contact-reset').click();
    await expect(page.locator('#aml-name')).toBeFocused();
    await expect(page.locator('#aml-name')).toBeInViewport({ ratio: 1 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
