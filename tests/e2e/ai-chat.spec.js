import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const reply =
  'Podemos desenvolver um chatbot que qualifica os contatos e ajuda seu time a priorizar oportunidades. Assim, os vendedores ganham tempo para as negociações. Vamos conversar sobre o seu projeto?';
test.beforeEach(async ({ page }) => {
  await page.route('**/api/ai/chat', async (route) => {
    const message = route.request().postDataJSON().messages.at(-1).content;
    const topic = /anal|relat|document/i.test(message)
      ? 'analysis'
      : /taref|equipe/i.test(message)
        ? 'automation'
        : 'chatbots';
    await new Promise((resolve) => setTimeout(resolve, 400));
    try {
      await route.fulfill({ json: { reply, topic } });
    } catch {
      /* A reset or stop can cancel the request. */
    }
  });
});

test('AI conversation stays hidden while assets load and appears only after sending', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let releaseAssets;
  const assetsReady = new Promise((resolve) => (releaseAssets = resolve));
  await page.route('**/*', async (route) => {
    if (['script', 'stylesheet'].includes(route.request().resourceType())) {
      await assetsReady;
    }
    await route.fallback();
  });
  await page.goto('/ai-solutions', { waitUntil: 'commit' });
  const bar = page.locator('.ai-conversation-bar');
  try {
    await expect(bar).toBeAttached();
    await expect(bar).toBeHidden();
  } finally {
    releaseAssets();
  }
  await page.waitForLoadState('load');
  await expect(
    page.getByRole('textbox', { name: 'Sua mensagem' }),
  ).toBeEnabled();
  await expect(bar).toBeHidden();
  await page.getByRole('button', { name: 'Atendimento', exact: true }).click();
  await expect(bar).toBeVisible();
  await expect(page.locator('.ai-message--assistant')).toContainText(reply);
  await page.getByRole('button', { name: 'Nova conversa' }).click();
  await expect(bar).toBeHidden();
  await expect(page.locator('[data-ai-intro]')).toHaveCSS('opacity', '1');
});

test('AI returns a contextual CTA and keeps the composer anchored while typing and replying', async ({
  page,
}) => {
  await page.goto('/ai-solutions');
  const input = page.getByRole('textbox', { name: 'Sua mensagem' });
  const composer = page.locator('.ai-composer');
  const before = await composer.boundingBox();
  await input.fill('Meu time de vendas precisa de ajuda.\n'.repeat(15));
  let bounds = await composer.boundingBox();
  expect(Math.abs(bounds.y - before.y)).toBeLessThan(1);
  expect(Math.abs(bounds.height - before.height)).toBeLessThan(1);
  await input.fill('Quero uma IA pro meu time de vendas');
  await page
    .getByRole('button', { name: 'Enviar mensagem', exact: true })
    .click();
  await expect(page.locator('[data-ai-intro]')).toHaveCSS('opacity', '0');
  await expect(page.locator('.ai-message--assistant')).toContainText(reply);
  await expect(
    page.getByRole('link', { name: 'Conversar sobre Chatbots', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.ai-send')).toBeHidden();
  bounds = await composer.boundingBox();
  expect(Math.abs(bounds.y - before.y)).toBeLessThan(1);
  expect(Math.abs(bounds.height - before.height)).toBeLessThan(1);
  await expect(page.locator('.ai-thread')).not.toContainText('"topic"');
  await page
    .getByRole('link', { name: 'Conversar sobre Chatbots', exact: true })
    .click();
  await expect(page.locator('#project-dialog')).toBeVisible();
  await expect(page.locator('[data-contact-page]')).toHaveAttribute(
    'href',
    /AI%20Solutions%3A%20Chatbots/,
  );
  await page.keyboard.press('Escape');
  const audit = await new AxeBuilder({ page })
    .include('.service-hero')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await input.fill('Quero analisar documentos.');
  await expect(page.locator('[data-ai-project]')).toBeHidden();
  await page
    .getByRole('button', { name: 'Enviar mensagem', exact: true })
    .click();
  await expect(page.locator('.ai-message--assistant')).toHaveCount(2);
  await expect(page.locator('[data-ai-project]')).toContainText(
    'Agentes de análise',
  );
  bounds = await composer.boundingBox();
  expect(Math.abs(bounds.y - before.y)).toBeLessThan(1);
  await page.getByRole('button', { name: 'Nova conversa' }).click();
  await expect(page.locator('.ai-message')).toHaveCount(0);
  await expect(page.locator('[data-ai-intro]')).toHaveCSS('opacity', '1');
});

test('AI fallback topics cannot inject button text and replies render as plain text', async ({
  page,
}) => {
  await page.route('**/api/ai/chat', (route) =>
    route.fulfill({
      json: {
        reply:
          'Uma resposta de teste <img src=x onerror=alert(1)> para conferir texto simples.',
        topic: '<script>malicious</script>',
      },
    }),
  );
  await page.goto('/ai-solutions');
  await page.getByRole('button', { name: 'Atendimento', exact: true }).click();
  await expect(page.locator('[data-ai-project]')).toHaveText(
    'Conversar sobre uma solução',
  );
  await expect(page.locator('.ai-thread img')).toHaveCount(0);
  await expect(page.locator('.ai-message--assistant')).toContainText('<img');
});

test('AI can stop, retry and reset without duplicate or stale replies', async ({
  page,
}) => {
  const releases = [];
  const pending = [0, 1].map(
    (index) => new Promise((resolve) => (releases[index] = resolve)),
  );
  let requests = 0;
  await page.route('**/api/ai/chat', async (route) => {
    const request = ++requests;
    if (request === 1) await pending[0];
    if (request === 3) await pending[1];
    try {
      await route.fulfill({ json: { reply, topic: 'analysis' } });
    } catch {
      /* Interrupted requests may already be closed. */
    }
  });
  await page.goto('/ai-solutions');
  await page.getByRole('button', { name: 'Análises', exact: true }).click();
  await expect.poll(() => requests).toBe(1);
  await page.getByRole('button', { name: 'Interromper resposta' }).click();
  releases[0]();
  await expect(page.locator('[data-ai-status]')).toContainText('interrompida');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('.ai-message--assistant')).toHaveCount(1);
  await expect(page.locator('.ai-message--user')).toHaveCount(1);
  await page
    .getByRole('textbox', { name: 'Sua mensagem' })
    .fill('Outra pergunta');
  await page
    .getByRole('button', { name: 'Enviar mensagem', exact: true })
    .click();
  await expect.poll(() => requests).toBe(3);
  await page.getByRole('button', { name: 'Nova conversa' }).click();
  releases[1]();
  await expect(page.locator('.ai-message')).toHaveCount(0);
  await page.getByRole('button', { name: 'Operação', exact: true }).click();
  await expect(page.locator('.ai-message--assistant')).toHaveCount(1);
  await expect(page.locator('.ai-message--user')).toHaveCount(1);
});

test('AI request errors offer retry and contact; layout remains anchored with motion on small screens', async ({
  page,
}) => {
  await page.route('**/api/ai/chat', (route) =>
    route.fulfill({ status: 429, json: { error: 'Quota' } }),
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/ai-solutions');
  await page.getByRole('button', { name: 'Atendimento', exact: true }).click();
  await expect(page.locator('[data-ai-retry]')).toBeVisible();
  await expect(page.locator('[data-ai-project]')).toContainText('uma solução');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator('[data-ai-project]')
        .evaluate((el) => Math.round(el.getBoundingClientRect().height)),
    ).toBeGreaterThanOrEqual(44);
  }
});
