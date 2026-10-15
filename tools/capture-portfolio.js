// Capture the imported websites and the public Askora demo, never private accounts.
// Optional: node tools/capture-portfolio.js /absolute/path/to/askora/apps/public/frontend
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep, extname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const args = process.argv.slice(2);
const projectFlag = args.find((arg) => arg.startsWith('--project='));
const selectedProject = projectFlag?.split('=')[1];
if (selectedProject && !['osler', 'gear-seo', 'aml'].includes(selectedProject))
  throw new Error('Unknown project');
const askoraDirectory = args.find((arg) => !arg.startsWith('--'));
const output = 'public/assets/images/portfolio';
await mkdir(output, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'byaskora-portfolio-'));
const server = await createServer({
  server: { host: '127.0.0.1', port: 5192, strictPort: true },
});
await server.listen();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  async function save(name, selector) {
    const path = join(temporary, `${name}.png`);
    if (selector) await page.locator(selector).screenshot({ path });
    else await page.screenshot({ path });
    await promisify(execFile)('cwebp', [
      '-quiet',
      '-q',
      '90',
      path,
      '-o',
      `${output}/${name}.webp`,
    ]);
  }
  for (const slug of selectedProject
    ? [selectedProject]
    : ['osler', 'gear-seo', 'aml']) {
    // AML's brighter opening frame and its real pause control belong in the print.
    await page.emulateMedia({
      reducedMotion: slug === 'aml' ? 'no-preference' : 'reduce',
    });
    const response = await page.goto(
      `http://127.0.0.1:5192/projetos/${slug}/website/`,
    );
    if (!response.ok())
      throw new Error(`Could not load ${slug}: ${response.status()}`);
    await page.locator('h1').waitFor();
    if (slug === 'aml') {
      await page.locator('.hero-motion:not([hidden])').waitFor();
      await page.waitForFunction(
        () => document.querySelector('.hero-video')?.readyState >= 2,
      );
    }
    await page.evaluate(
      async (frameTime) => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images]
            .filter((img) => img.loading !== 'lazy')
            .map((img) => img.decode().catch(() => {})),
        );
        await Promise.all(
          [...document.querySelectorAll('video')].map(async (video) => {
            if (!video.readyState)
              await new Promise((done) => {
                video.addEventListener('loadeddata', done, { once: true });
                video.addEventListener('error', done, { once: true });
                setTimeout(done, 3000);
              });
            video.pause();
            if (video.readyState >= 2) {
              const seeked = new Promise((done) => {
                video.addEventListener('seeked', done, { once: true });
                setTimeout(done, 2000);
              });
              video.currentTime = Math.min(frameTime, video.duration / 2);
              await seeked;
            }
          }),
        );
      },
      slug === 'aml' ? 8.5 : 2,
    );
    await page.addStyleTag({
      content:
        '.byaskora-preview-back { visibility: hidden !important; } .reveal { opacity: 1 !important; transform: none !important; } * { animation: none !important; transition: none !important; }',
    });
    await save(slug);
  }
  if (askoraDirectory) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const root = resolve(askoraDirectory);
    const types = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.woff2': 'font/woff2',
    };
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'askora-preview.local') return route.abort();
      if (url.pathname.startsWith('/api/')) return route.fulfill({ json: {} });
      const file = resolve(root, '.' + decodeURIComponent(url.pathname));
      if (file !== root && !file.startsWith(root + sep)) return route.abort();
      try {
        const target = (await stat(file)).isDirectory()
          ? join(file, 'index.html')
          : file;
        await route.fulfill({
          body: await readFile(target),
          contentType: types[extname(target)] || 'application/octet-stream',
        });
      } catch {
        await route.fulfill({ status: 404 });
      }
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://askora-preview.local/');
    await page.locator('.app-window').waitFor();
    await page.addStyleTag({
      content:
        '* { animation: none !important; transition: none !important; scroll-behavior: auto !important; } [class*="consent"], [class*="cookie"] { visibility: hidden !important; }',
    });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => scrollTo(0, 0));
    await save('askora');
  }
} finally {
  await browser.close();
  await server.close();
  await rm(temporary, { recursive: true, force: true });
}
