import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const services = {
  websites: 'Websites profissionais',
  aplicativos: 'Aplicativos para iOS e Android',
  sistemas: 'Sistemas, dashboards e BI',
  'ai-solutions': 'AI Solutions — Soluções com inteligência artificial',
  reestruturacao: 'Reestruturação de softwares e projetos com IA',
};
for (const [slug, interest] of Object.entries(services)) {
  test(`${slug}: routes, semantics, contact, responsive layout and accessibility`, async ({
    page,
    request,
  }) => {
    test.setTimeout(90000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const response = await page.goto(`/${slug}`);
    expect(response.status()).toBe(200);
    await expect(page).toHaveTitle(`${interest} | ByAskora`);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://byaskora.com/${slug}`,
    );
    await expect(
      page.locator('.nav-pages [aria-current="page"]'),
    ).toHaveAttribute('href', `/${slug}`);
    await expect(page.locator('[data-scene]')).toHaveAttribute(
      'data-scene',
      slug,
    );
    const ids = await page
      .locator('[id]')
      .evaluateAll((elements) => elements.map((el) => el.id));
    expect(new Set(ids).size).toBe(ids.length);
    const broken = await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="#"], use[href^="#"]')]
        .map((el) => el.getAttribute('href').slice(1))
        .filter((id) => !document.getElementById(id)),
    );
    expect(broken).toEqual([]);
    // The shared circuit names its switch in screen-reader instructions; commercial copy has no product case.
    const commercialCopy = await page.locator('main').evaluate((main) => {
      const copy = main.cloneNode(true);
      copy.querySelectorAll('.sr-only').forEach((node) => node.remove());
      return copy.textContent;
    });
    expect(commercialCopy).not.toMatch(/\bAskora\b/);
    const paths = await page
      .locator('a[href^="/"]')
      .evaluateAll((elements) => [
        ...new Set(elements.map((el) => new URL(el.href).pathname)),
      ]);
    for (const path of paths)
      expect((await request.get(path)).status()).toBe(200);
    for (const width of [320, 390, 768, 900, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 950 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Overflow at ${width}px`,
      ).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await expect(page.locator('.nav-pages a')).toHaveCount(9);
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Menu', exact: true }),
    ).toBeFocused();
    await page.locator('.service-actions [data-open-project]').click();
    const contactUrl = new URL(
      await page.locator('[data-contact-page]').getAttribute('href'),
      page.url(),
    );
    expect(contactUrl.pathname).toBe('/contato');
    expect(contactUrl.searchParams.get('interesse')).toBe(interest);
    await page.keyboard.press('Escape');
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      const audit = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .exclude('.brand-by')
        .analyze();
      expect(audit.violations).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}

test('all four scenes respond to keyboard input under reduced motion', async ({
  page,
}) => {
  await page.goto('/websites');
  const mobile = page.getByRole('button', { name: 'Mobile', exact: true });
  await mobile.focus();
  await mobile.press('Enter');
  await expect(page.locator('.web-workspace')).toHaveAttribute(
    'data-device',
    'mobile',
  );
  await expect(page.locator('[data-grid-toggle]')).toHaveCount(0);
  await expect(mobile).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/aplicativos');
  const clients = page.getByRole('tab', { name: 'Clientes', exact: true });
  await clients.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: 'Equipe', exact: true }),
  ).toBeFocused();
  await expect(page.locator('#app-panel-equipe')).toBeVisible();
  await page.getByRole('checkbox', { name: /Conferir materiais/ }).check();
  await expect(page.locator('[data-task-progress]')).toHaveText(
    '1 de 3 etapas',
  );
  await page.getByRole('tab', { name: 'Gestão', exact: true }).click();
  await page.getByRole('button', { name: 'Aprovar', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Aprovado', exact: true }),
  ).toBeDisabled();
  await page.goto('/sistemas');
  if (page.viewportSize().width > 700) {
    await page.getByRole('combobox', { name: 'Filtrar área' }).click();
    await page.getByRole('option', { name: 'Financeiro', exact: true }).click();
    await expect(page.locator('[data-metric="total"]')).toHaveText('40');
    await expect(page.locator('[data-metric="done"]')).toHaveText('26');
    await expect(page.locator('[data-metric="open"]')).toHaveText('14');
    await expect(page.locator('[data-area="administrativo"]')).toBeHidden();
  }
  const dashboard = page.getByRole('tab', { name: 'Dashboard', exact: true });
  await dashboard.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: 'Operação', exact: true }),
  ).toBeFocused();
  await expect(page.locator('#mg-panel-operacao')).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.locator('#mg-panel-integracoes')).toBeVisible();
  await page
    .getByRole('button', { name: 'Sincronizar ERP', exact: true })
    .click();
  await expect(page.locator('[data-sync-title]')).toHaveText(
    'ERP sincronizado',
  );
  await page.goto('/reestruturacao');
  const circuit = page.locator('[data-signal-scene]');
  const power = page.getByRole('switch');
  const caption = page.locator('.signal-caption > span');
  await expect(caption).toHaveText('Pronto para escalar?');
  await expect(circuit).toHaveAttribute('data-state', 'off');
  await expect(caption).toHaveText('Pronto para escalar?');
  await expect(page.locator('.service-hero-note')).toHaveCount(0);
  await expect(
    page.locator('.architecture-scene, .scene-topline, .scene-controls'),
  ).toHaveCount(0);
  await power.focus();
  await power.press('Space');
  await expect(circuit).toHaveAttribute('data-state', 'on');
  await expect(caption).toHaveText('Pronto para escalar!');
  expect(
    await caption.evaluate((el) =>
      el.style.getPropertyValue('--signal-charge'),
    ),
  ).toBe('1');
  expect(
    await caption.evaluate(
      (el) => getComputedStyle(el, '::after').animationName,
    ),
  ).toBe('none');
  await power.click();
  await expect(circuit).toHaveAttribute('data-state', 'off');
  await expect(caption).toHaveText('Pronto para escalar?');
  await page.clock.install({ time: new Date('2026-10-15T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-15T12:01:00Z'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await power.click();
  await page.clock.runFor(120);
  await expect(circuit).toHaveAttribute('data-animating', 'true');
  await expect(caption).toHaveText('Pronto para escalar?');
  await expect(circuit).toHaveAttribute('data-connected', 'false');
  await page
    .getByRole('button', { name: 'Pausar animação', exact: true })
    .click();
  await expect(circuit).toHaveAttribute('data-animating', 'false');
  await expect(caption).toHaveText('Pronto para escalar?');
  await page
    .getByRole('button', { name: 'Retomar animação', exact: true })
    .click();
  await page.clock.runFor(240);
  const charge = await caption.evaluate((el) =>
    Number(el.style.getPropertyValue('--signal-charge')),
  );
  expect(charge).toBeGreaterThan(0.2);
  expect(charge).toBeLessThan(0.8);
  await expect(caption).toHaveText('Pronto para escalar?');
  await expect(circuit).toHaveAttribute('data-connected', 'false');
  await page.clock.runFor(1600);
  await expect(circuit).toHaveAttribute('data-connected', 'true');
  await expect(caption).toHaveText('Pronto para escalar!');
  expect(await circuit.evaluate((el) => el.signalDebug().progress)).toBe(1);
  expect(
    await caption.evaluate(
      (el) => getComputedStyle(el, '::after').animationPlayState,
    ),
  ).toBe('running');
  await page
    .getByRole('button', { name: 'Pausar animação', exact: true })
    .click();
  await expect(circuit).toHaveAttribute('data-animating', 'false');
  expect(
    await caption.evaluate(
      (el) => getComputedStyle(el, '::after').animationPlayState,
    ),
  ).toBe('paused');
  await power.click();
  await expect(circuit).toHaveAttribute('data-state', 'off');
  await expect(caption).toHaveText('Pronto para escalar?');
});

test('services remain readable and navigable without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 800 },
  });
  const page = await context.newPage();
  for (const slug of Object.keys(services)) {
    await page.goto(`${baseURL}/${slug}`);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#main-navigation')).toBeVisible();
    await expect(page.locator('.closing-button')).toHaveAttribute(
      'href',
      '/contato',
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await context.close();
});

test('management demo keeps its compact height, approvals, filters and integrations consistent', async ({
  page,
}) => {
  await page.goto('/sistemas');
  const demo = page.locator('.management-demo');
  const compact = page.viewportSize().width <= 700;
  if (compact) {
    await expect(demo.locator('.mg-topbar')).toBeHidden();
    await expect(demo.locator('.mg-heading').first()).toBeHidden();
    await expect(
      page.getByRole('combobox', { name: 'Filtrar área' }),
    ).toBeHidden();
  }
  await expect(demo.locator('.scene-topline, figcaption')).toHaveCount(0);
  await expect(page.locator('.service-hero-note')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('tab', { name: 'Operação', exact: true }).click();
  await expect(page.locator('#mg-panel-operacao')).toHaveCSS(
    'animation-name',
    'mg-page-in',
  );
  await expect(page.locator('.mg-insight, .mg-pagination')).toHaveCount(0);
  await expect(page.locator('[data-operation-rows] tr')).toHaveCount(6);
  await page
    .getByRole('button', { name: 'Concluir conferência de pagamentos' })
    .click();
  await expect(page.locator('[data-management-feedback]')).toContainText(
    'FIN-022 concluída',
  );
  await page.getByRole('tab', { name: 'Dashboard', exact: true }).click();
  await expect(page.locator('[data-metric="done"]')).toHaveText('97');
  await expect(page.locator('[data-metric="open"]')).toHaveText('31');
  if (!compact) {
    await page.getByRole('combobox', { name: 'Filtrar área' }).click();
    await page.getByRole('option', { name: 'Financeiro', exact: true }).click();
    await expect(page.locator('[data-metric="done"]')).toHaveText('27');
    await expect(page.locator('[data-metric="open"]')).toHaveText('13');
    await expect(page.locator('#mg-chart-title')).toContainText(
      '40 recebidas e 27 concluídas',
    );
  }
  await page.getByRole('tab', { name: 'Operação', exact: true }).click();
  await page.getByRole('combobox', { name: 'Filtrar solicitações' }).click();
  await page.getByRole('option', { name: 'Concluídas', exact: true }).click();
  await expect(page.locator('[data-operation-rows] tr')).toHaveCount(1);
  await expect(page.locator('[data-operation-rows]')).toContainText('FIN-022');
  await expect(page.locator('[data-complete]')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Filtrar solicitações' }).click();
  await page.getByRole('option', { name: 'Em análise', exact: true }).click();
  for (let index = 0; index < 5; index++) {
    await page.locator('[data-complete]').first().click();
  }
  await expect(page.locator('[data-operation-rows]')).toContainText(
    'Nenhuma solicitação',
  );
  await page.getByRole('tab', { name: 'Integrações', exact: true }).click();
  await page
    .getByRole('button', { name: 'Sincronizar CRM', exact: true })
    .click();
  await expect(page.locator('[data-sync="erp"]')).toBeDisabled();
  await expect(page.locator('[data-sync-title]')).toHaveText(
    'CRM sincronizado',
  );
  await expect(page.locator('[data-sync="erp"]')).toBeEnabled();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('tab', { name: 'Dashboard', exact: true }).click();
  await expect(page.locator('#mg-panel-dashboard')).toHaveCSS(
    'animation-name',
    'none',
  );
  if (!compact) {
    await page.getByRole('combobox', { name: 'Filtrar área' }).click();
    await page
      .getByRole('option', { name: 'Todas as áreas', exact: true })
      .click();
  }
  await expect(page.locator('[data-metric="done"]')).toHaveText('102');
  await expect(page.locator('[data-metric="open"]')).toHaveText('26');
  const heights = [];
  for (const name of ['Dashboard', 'Operação', 'Integrações']) {
    await page.getByRole('tab', { name, exact: true }).click();
    heights.push((await page.locator('.mg-window').boundingBox()).height);
    const fits = await page
      .locator('.mg-panel:not([hidden])')
      .evaluate((panel) => panel.scrollHeight <= panel.clientHeight + 1);
    expect(fits).toBe(true);
  }
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
  await page.reload();
  await expect(page.locator('[data-metric="done"]')).toHaveText('96');
});

test('management selectors support keyboard selection, cancellation and dismissal', async ({
  page,
}) => {
  test.skip(
    page.viewportSize().width <= 700,
    'O filtro de área não é exibido no mobile.',
  );
  await page.goto('/sistemas');
  const area = page.getByRole('combobox', { name: 'Filtrar área' });
  await area.focus();
  await page.keyboard.press('Enter');
  await expect(area).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('f');
  await expect(area).toHaveAttribute(
    'aria-activedescendant',
    'mg-area-option-financeiro',
  );
  await expect(page.locator('[data-metric="total"]')).toHaveText('128');
  await page.keyboard.press('Escape');
  await expect(area).toBeFocused();
  await expect(area).toHaveAttribute('aria-expanded', 'false');
  await area.press('ArrowDown');
  await area.press('End');
  await area.press('Enter');
  await expect(area).toContainText('Comercial');
  await expect(page.locator('[data-metric="total"]')).toHaveText('40');
  await expect(page.locator('[data-metric="done"]')).toHaveText('30');
  await area.click();
  await expect(
    page.getByRole('option', { name: 'Comercial', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  const audit = await new AxeBuilder({ page })
    .include('.management-demo')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page
    .getByRole('heading', { name: 'O seu negócio, em perspectiva.' })
    .click();
  await expect(area).toHaveAttribute('aria-expanded', 'false');
  await area.click();
  await page.keyboard.press('Tab');
  await expect(area).toHaveAttribute('aria-expanded', 'false');
  await expect(area).not.toBeFocused();
  await expect(page.locator('.mg-account')).toContainText('Rafael Almeida');
});

test('phone keeps every area on one screen with usable controls', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/aplicativos');
    const phone = await page.locator('.app-phone').boundingBox();
    expect(phone.height).toBeLessThanOrEqual(
      Math.min(520, viewport.height - 90),
    );
    expect(phone.width).toBeLessThanOrEqual(292);
    for (const name of ['Clientes', 'Equipe', 'Gestão']) {
      await page.getByRole('tab', { name, exact: true }).click();
      const layout = await page.locator('.app-viewport').evaluate((element) => {
        const panel = element.querySelector('.app-panel:not([hidden])');
        return {
          fits: element.scrollHeight <= element.clientHeight + 1,
          overflow: getComputedStyle(element).overflowY,
          overscroll: getComputedStyle(element).overscrollBehaviorY,
          targets: [...panel.querySelectorAll('button, .app-task')].map(
            (target) => target.getBoundingClientRect().height,
          ),
          pageFits: document.documentElement.scrollWidth <= innerWidth,
        };
      });
      expect(layout.fits, `${viewport.width}px / ${name}`).toBe(true);
      expect(layout.overflow).toBe('clip');
      expect(layout.overscroll).toBe('auto');
      expect(layout.pageFits).toBe(true);
      for (const height of layout.targets)
        expect(height).toBeGreaterThanOrEqual(44);
    }
  }
});

test('phone demo connects bookings, team tasks and management inside the device', async ({
  page,
}) => {
  await page.goto('/aplicativos');
  await expect(
    page.locator(
      '.service-hero-note, .app-scene .scene-topline, .app-scene figcaption, .mobile-orbit, .mobile-annotation',
    ),
  ).toHaveCount(0);
  await expect(page.locator('.app-bottom-nav [role="tab"]')).toHaveCount(3);
  await page
    .getByRole('button', { name: '22 de outubro', exact: true })
    .click();
  await page.getByRole('button', { name: '14:30', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar horário' }).click();
  await expect(page.locator('[data-booking-result]')).toHaveText(
    '22 de outubro, às 14:30 · Confirmado',
  );
  await expect(page.locator('[data-confirm-booking]')).toBeDisabled();
  await expect(page.locator('[data-app-day="22"]')).toBeVisible();
  await page.getByRole('tab', { name: 'Gestão', exact: true }).click();
  await expect(page.locator('[data-app-bookings]')).toHaveText('13');
  await expect(page.locator('[data-admin-appointment]')).toContainText('14:30');
  await page.getByRole('tab', { name: 'Clientes', exact: true }).click();
  await page
    .getByRole('button', { name: '23 de outubro', exact: true })
    .click();
  await page.getByRole('button', { name: '11:00', exact: true }).click();
  await page.getByRole('button', { name: 'Atualizar horário' }).click();
  await page.getByRole('tab', { name: 'Gestão', exact: true }).click();
  await expect(page.locator('[data-app-bookings]')).toHaveText('13');
  await expect(page.locator('[data-admin-appointment]')).toContainText('11:00');
  await page.getByRole('tab', { name: 'Equipe', exact: true }).click();
  const complete = page.getByRole('button', {
    name: 'Concluir visita',
    exact: true,
  });
  await expect(complete).toBeDisabled();
  for (const name of [
    'Conferir materiais',
    'Revisar a solicitação',
    'Registrar a visita',
  ]) {
    await page.getByRole('checkbox', { name: new RegExp(name) }).check();
  }
  await expect(complete).toBeEnabled();
  await complete.click();
  await expect(page.locator('[data-visit-status]')).toHaveText('Concluída');
  await page.getByRole('tab', { name: 'Gestão', exact: true }).click();
  await expect(page.locator('[data-app-visits]')).toHaveText('9');
  await page.getByRole('button', { name: 'Aprovar', exact: true }).click();
  await expect(page.locator('[data-approval-count]')).toHaveText('0');
  await page.getByRole('tab', { name: 'Equipe', exact: true }).click();
  await page.getByRole('button', { name: 'Reiniciar checklist' }).click();
  await expect(page.locator('[data-task-progress]')).toHaveText(
    '0 de 3 etapas',
  );
  await expect(page.locator('[data-app-task]:checked')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Gestão', exact: true }).click();
  await expect(page.locator('[data-app-visits]')).toHaveText('8');
  for (const name of ['Clientes', 'Equipe', 'Gestão']) {
    await page.getByRole('tab', { name, exact: true }).click();
    const audit = await new AxeBuilder({ page })
      .include('.app-scene')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(audit.violations).toEqual([]);
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('tab', { name: 'Equipe', exact: true }).click();
  await expect(page.locator('#app-panel-equipe')).toHaveCSS(
    'animation-name',
    'app-screen-in',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#app-panel-equipe')).toHaveCSS(
    'animation-name',
    'none',
  );
  await page.reload();
  await page.getByRole('tab', { name: 'Gestão', exact: true }).click();
  await expect(page.locator('[data-app-bookings]')).toHaveText('12');
  await expect(page.locator('[data-approval-count]')).toHaveText('1');
});

test('website preview fits both layouts without overlap or clipped content', async ({
  page,
}) => {
  await page.goto('/websites');
  await expect(page.locator('.web-device-controls button')).toHaveCount(2);
  await expect(
    page.locator(
      '.service-hero-note, .web-scene figcaption, .web-layout-mark, [data-grid-toggle]',
    ),
  ).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const device of ['desktop', 'mobile']) {
      const button = page.locator(`[data-device-button="${device}"]`);
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(button).toHaveCSS('font-weight', '650');
      await expect
        .poll(() =>
          page.locator('.web-browser').evaluate((frame) => {
            const canvas = frame
              .querySelector('.web-canvas')
              .getBoundingClientRect();
            const bounds = frame.getBoundingClientRect();
            return (
              Math.abs(
                canvas.height +
                  frame.querySelector('.web-chrome').getBoundingClientRect()
                    .height -
                  bounds.height,
              ) < 1 &&
              (frame.closest('.web-workspace').dataset.device === 'desktop'
                ? bounds.height <= 510 &&
                  bounds.height / bounds.width > 0.55 &&
                  bounds.height / bounds.width < 0.67
                : bounds.height <= Math.min(470, innerHeight * 0.58) + 1) &&
              Math.abs(canvas.width - bounds.width) < 1
            );
          }),
        )
        .toBe(true);
      const layout = await page
        .locator('.web-client-site[data-active="true"] .web-client-hero')
        .evaluate((hero) => {
          const copy = hero
            .querySelector('.web-client-copy')
            .getBoundingClientRect();
          const art = hero
            .querySelector('.web-client-art')
            .getBoundingClientRect();
          return {
            sideBySide: art.left >= copy.right,
            stacked: art.top >= copy.bottom,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
      expect(layout.overflow).toBe(false);
      expect(device === 'desktop' ? layout.sideBySide : layout.stacked).toBe(
        true,
      );
    }
  }
});

test('website showcase cycles complete sites and supports pause and manual browsing', async ({
  page,
}) => {
  await page.goto('/websites');
  const workspace = page.locator('.web-workspace');
  const active = page.locator('.web-client-site[data-active="true"]');
  const next = page.getByRole('button', { name: 'Próximo site', exact: true });
  for (const [id, name, title, description] of [
    ['furniture', 'forma', 'O essencial', 'Poltrona'],
    ['food', 'mesa', 'Feito com tempo', 'Massa'],
    ['services', 'elo', 'Clareza para', 'notebook'],
  ]) {
    await expect(workspace).toHaveAttribute('data-site', id);
    await expect(active.locator('.web-client-brand')).toContainText(name);
    await expect(active.locator('h2')).toContainText(title);
    await expect(active.locator('.web-photo')).toHaveAttribute(
      'alt',
      new RegExp(description),
    );
    await expect(page.locator('[data-web-address]')).toContainText(name);
    const audit = await new AxeBuilder({ page })
      .include('.web-scene')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(audit.violations).toEqual([]);
    await next.click();
  }
  await expect(workspace).toHaveAttribute('data-site', 'furniture');
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(
    page.getByRole('button', { name: 'Pausar apresentação', exact: true }),
  ).toBeEnabled();
  await page.clock.runFor(150);
  await page.clock.fastForward(6000);
  await expect(workspace).toHaveAttribute('data-site', 'food');
  await expect(workspace).toHaveAttribute('data-transitioning', 'false');
  await page
    .getByRole('button', { name: 'Pausar apresentação', exact: true })
    .click();
  await page.clock.fastForward(20000);
  await expect(workspace).toHaveAttribute('data-site', 'food');
  await page
    .getByRole('button', { name: 'Retomar apresentação', exact: true })
    .click();
  await page.clock.fastForward(6000);
  await expect(workspace).toHaveAttribute('data-site', 'services');
  await expect(workspace).toHaveAttribute('data-transitioning', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.runFor(150);
  await page.clock.fastForward(15000);
  await expect(workspace).toHaveAttribute('data-site', 'services');
  await next.click();
  await expect(workspace).toHaveAttribute('data-site', 'furniture');
  await expect(workspace).toHaveAttribute('data-transitioning', 'false');
});

test('website transitions keep geometry stable and recover from rapid navigation', async ({
  page,
}) => {
  await page.goto('/websites');
  const workspace = page.locator('.web-workspace');
  const next = page.getByRole('button', { name: 'Próximo site', exact: true });
  await next.scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const initialHeight = await page
    .locator('.web-browser')
    .evaluate((el) => el.getBoundingClientRect().height);
  await next.click();
  await expect(workspace).toHaveAttribute('data-transitioning', 'true');
  await expect
    .poll(() =>
      page
        .locator('[data-web-slide="furniture"] .web-art-page')
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      page
        .locator('[data-web-slide="food"] .web-art-page')
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41),
    )
    .toBeLessThan(0);
  await expect(workspace).toHaveAttribute('data-transitioning', 'false');
  expect(
    await page
      .locator('.web-browser')
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeCloseTo(initialHeight, 0);
  await next.click();
  await next.click();
  await page.getByRole('button', { name: 'Mobile', exact: true }).click();
  await expect(workspace).toHaveAttribute('data-site', 'furniture');
  await expect(workspace).toHaveAttribute('data-transitioning', 'false');
  await expect(
    page.locator('.web-client-site[data-active="true"]'),
  ).toHaveCount(1);
  await expect(page.locator('.web-client-site[data-leaving]')).toHaveCount(0);
  await expect(page.locator('[data-web-address]')).toHaveText('forma.studio');
  await expect(
    page.locator('.web-client-site[data-active="true"]'),
  ).toHaveAttribute('aria-hidden', 'false');
});

test('website device switch morphs the same card and settles after reversals', async ({
  page,
}) => {
  await page.goto('/websites');
  const workspace = page.locator('.web-workspace');
  const frame = page.locator('.web-browser');
  const originalFrame = await frame.elementHandle();
  await page.locator('[data-device-button="desktop"]').click();
  await frame.scrollIntoViewIfNeeded();
  const desktop = await frame.boundingBox();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(
    page.getByRole('button', { name: 'Pausar apresentação', exact: true }),
  ).toBeEnabled();
  await page
    .getByRole('button', { name: 'Pausar apresentação', exact: true })
    .click();
  await page
    .locator('[data-device-button="mobile"]')
    .evaluate((button) => button.click());
  await expect(workspace).toHaveAttribute('data-resizing', 'true');
  await expect
    .poll(async () => (await frame.boundingBox()).width)
    .toBeLessThan(desktop.width - 2);
  await expect(frame).toHaveCSS('opacity', '1');
  await expect(workspace).toHaveAttribute('data-resizing', 'false');
  const mobile = await frame.boundingBox();
  expect(mobile.width).toBeLessThan(desktop.width);
  expect(mobile.height / mobile.width).toBeGreaterThan(
    desktop.height / desktop.width,
  );
  expect(
    await originalFrame.evaluate(
      (element) => element === document.querySelector('.web-browser'),
    ),
  ).toBe(true);
  for (const device of ['desktop', 'mobile', 'desktop']) {
    await page
      .locator(`[data-device-button="${device}"]`)
      .evaluate((button) => button.click());
    await page.waitForTimeout(100); // Deliberately reverse an in-flight animation.
  }
  await expect(workspace).toHaveAttribute('data-resizing', 'false');
  expect((await frame.boundingBox()).width).toBeCloseTo(desktop.width, 0);
  await page
    .locator('[data-device-button="mobile"]')
    .evaluate((button) => button.click());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(workspace).toHaveAttribute('data-resizing', 'false');
  expect(
    await frame.evaluate(
      (element) =>
        element
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === 'running').length,
    ),
  ).toBe(0);
  await page.setViewportSize({ width: 390, height: 600 });
  await expect
    .poll(async () => (await frame.boundingBox()).height)
    .toBeLessThan(350);
});
