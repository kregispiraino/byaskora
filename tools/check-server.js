import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

const base = process.argv[2] || 'http://127.0.0.1:8080';
let response;
for (let attempt = 0; attempt < 20; attempt++) {
  try {
    response = await fetch(base, { signal: AbortSignal.timeout(2000) });
    if (response.ok) break;
  } catch {
    /* Wait briefly for the container to finish starting. */
  }
  await setTimeout(250);
}
assert.equal(
  response?.status,
  200,
  'The production server must serve the homepage.',
);
const html = await response.text();
assert.ok(html.includes('https://byaskora.com/'));
assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
assert.ok(
  response.headers.get('content-security-policy').includes("script-src 'self'"),
);
assert.ok(response.headers.get('cache-control').includes('must-revalidate'));
const compressed = await fetch(base, {
  headers: { 'Accept-Encoding': 'gzip' },
});
assert.equal(compressed.headers.get('content-encoding'), 'gzip');
const asset = html.match(/src="(\/assets\/[^"]+\.js)"/)[1];
const script = await fetch(new URL(asset, base));
assert.equal(script.status, 200);
assert.ok(script.headers.get('cache-control').includes('immutable'));
assert.ok(script.headers.get('content-type').includes('javascript'));
assert.equal((await fetch(`${base}/missing-page`)).status, 404);
assert.equal((await fetch(`${base}/src/site.json`)).status, 404);
assert.equal((await fetch(`${base}/_nginx-headers.conf`)).status, 404);
const redirect = await fetch(`${base}/index.html?source=test`, {
  redirect: 'manual',
});
assert.equal(redirect.status, 301);
assert.equal(redirect.headers.get('location'), '/?source=test');
assert.ok(
  (await (await fetch(`${base}/robots.txt`)).text()).includes(
    'Sitemap: https://byaskora.com/sitemap.xml',
  ),
);
assert.ok(
  (await (await fetch(`${base}/sitemap.xml`)).text()).includes(
    '<loc>https://byaskora.com/</loc>',
  ),
);
console.log(
  'Production server: homepage, PORT, gzip, cache, security headers, redirect, 404 and SEO passed.',
);
