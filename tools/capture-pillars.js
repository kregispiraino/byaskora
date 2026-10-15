// Refresh static institutional previews from the actual service illustrations.
// Requires Chromium (npx playwright install chromium) and cwebp on PATH.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const requested = new Set(process.argv.slice(2));
for (const pillar of requested) {
  if (!['websites', 'sistemas', 'aplicativos', 'ai-solutions'].includes(pillar))
    throw new Error(`Unknown pillar: ${pillar}`);
}
const includes = (pillar) => !requested.size || requested.has(pillar);

const server = await createServer({
  server: { host: '127.0.0.1', port: 5191, strictPort: true },
});
await server.listen();
const browser = await chromium.launch();
const temp = await mkdtemp(join(tmpdir(), 'byaskora-pillars-'));
const output = 'public/assets/images/pillars';
await mkdir(output, { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  async function prepare(path) {
    await page.goto(`http://127.0.0.1:5191/${path}`);
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content:
        'html, body, .service-hero { background: transparent !important; } .hero-dots, .site-header, .page-brand { visibility: hidden !important; } * { scroll-behavior: auto !important; }',
    });
  }
  async function capture(selector, name) {
    const png = join(temp, `${name}.png`);
    const element = page.locator(selector);
    await element.evaluate((el) =>
      window.scrollBy({
        top: el.getBoundingClientRect().top - 40,
        behavior: 'instant',
      }),
    );
    await element.screenshot({ path: png, omitBackground: true });
    await promisify(execFile)('cwebp', [
      '-quiet',
      '-q',
      '95',
      '-alpha_q',
      '100',
      png,
      '-o',
      `${output}/${name}.webp`,
    ]);
  }
  if (includes('websites')) {
    await prepare('websites');
    await page.locator('.web-workspace[data-ready]').waitFor();
    await capture('.web-browser', 'websites');
  }
  if (includes('sistemas')) {
    await prepare('sistemas');
    await capture('.mg-window', 'sistemas');
  }
  if (includes('ai-solutions')) {
    await prepare('ai-solutions');
    await page
      .locator('#ai-message')
      .fill('Como a IA pode melhorar meu atendimento?');
    await page.addStyleTag({
      content:
        '.ai-suggestions { display: none !important; } .ai-scene { padding: 12px; }',
    });
    await capture('.ai-scene', 'ai-solutions');
  }
  if (includes('aplicativos')) {
    await prepare('aplicativos');
    for (const tab of ['clientes', 'equipe', 'gestao']) {
      await page.locator(`[data-app-tab="${tab}"]`).click();
      await capture('.app-phone', `aplicativos-${tab}`);
    }
  }
} finally {
  await browser.close();
  await server.close();
  await rm(temp, { recursive: true, force: true });
}
