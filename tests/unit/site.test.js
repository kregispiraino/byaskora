import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { securityHeaders } from '../../tools/security.js';
import {
  render,
  loadSite,
  renderPage,
  readSource,
  robots,
  sitemap,
  structuredData,
} from '../../tools/site.js';

test('build escapes values and rejects unknown placeholders and icons', () => {
  assert.equal(
    render('{{name}}', { name: '<script>"&' }),
    '&lt;script&gt;&quot;&amp;',
  );
  assert.throws(() => render('{{missing}}', {}), /Unknown template/);
  assert.throws(() => render('{{icon:missing}}', {}), /Unknown icon/);
});
test('production has a canonical domain, crawlable content and consistent metadata', () => {
  const site = loadSite();
  const page = renderPage(readSource('index.html'), site);
  assert.ok(page.includes('href="https://byaskora.com/"'));
  assert.ok(page.includes('index,follow,max-image-preview:large'));
  assert.ok(!page.includes('{{'));
  assert.ok(!page.includes('<!-- include:'));
  assert.equal((page.match(/<h1\b/g) || []).length, 1);
  assert.ok(robots(site).includes(`Sitemap: ${site.url}sitemap.xml`));
  assert.ok(sitemap(site).includes(`<loc>${site.url}</loc>`));
  assert.equal(JSON.parse(structuredData(site))['@graph'][0].url, site.url);
});
test('preview explicitly blocks indexing', () => {
  const site = loadSite();
  assert.ok(
    renderPage(readSource('index.html'), site, true).includes(
      'noindex,nofollow',
    ),
  );
  assert.equal(robots(site, true), 'User-agent: *\nDisallow: /\n');
});

test('the first-paint bootstrap is explicitly authorized by CSP', () => {
  const page = renderPage(readSource('index.html'), loadSite());
  const bootstrap = page.match(/<script>([\s\S]*?)<\/script>/)[1];
  const hash = createHash('sha256').update(bootstrap).digest('base64');
  assert.ok(
    securityHeaders['Content-Security-Policy'].includes(`'sha256-${hash}'`),
  );
});
