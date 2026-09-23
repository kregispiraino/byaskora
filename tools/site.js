import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export function readSource(path) {
  return readFileSync(resolve(root, path), 'utf8');
}
export function loadSite() {
  const site = JSON.parse(readSource('src/site.json'));
  const url = new URL(site.url);
  if (
    url.protocol !== 'https:' ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error(
      'src/site.json: url must be an HTTPS origin with a trailing slash.',
    );
  }
  return site;
}
export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ],
  );
}
export function render(text, values) {
  return text.replace(/\{\{([\w:-]+)\}\}/g, (_, key) => {
    if (key.startsWith('icon:')) {
      const name = key.slice(5);
      if (!readSource('src/shared/icons.html').includes(`id="i-${name}"`))
        throw new Error(`Unknown icon: ${name}`);
      return `<svg class="icon" width="20" height="20" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
    }
    if (!Object.hasOwn(values, key))
      throw new Error(`Unknown template value: ${key}`);
    return escapeHtml(values[key]);
  });
}
export function structuredData(site) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${site.url}#organization`,
        name: site.brand,
        url: site.url,
        email: site.email,
        telephone: site.phone,
        logo: `${site.url}assets/images/askora-mark-black.webp`,
        parentOrganization: {
          '@type': 'Organization',
          name: site.company,
          url: site.askora,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${site.url}#website`,
        name: site.brand,
        url: site.url,
        inLanguage: 'pt-BR',
        publisher: { '@id': `${site.url}#organization` },
      },
    ],
  }).replace(/</g, '\\u003c');
}
export function renderPage(template, site, preview = false) {
  const fragments = {
    icons: readSource('src/shared/icons.html'),
    header: readSource('src/shared/header.html'),
    footer: readSource('src/shared/footer.html'),
    dialogs: readSource('src/shared/dialogs.html'),
    sections: readdirSync(resolve(root, 'src/sections'))
      .filter((name) => name.endsWith('.html'))
      .sort()
      .map((name) => readSource(`src/sections/${name}`))
      .join('\n'),
  };
  const assembled = template.replace(/<!-- include:(\w+) -->/g, (_, key) => {
    if (!Object.hasOwn(fragments, key))
      throw new Error(`Unknown fragment: ${key}`);
    return fragments[key];
  });
  return render(assembled, {
    ...site,
    robots: preview
      ? 'noindex,nofollow'
      : 'index,follow,max-image-preview:large',
  })
    .replace(
      '<!-- bootstrap -->',
      `<script>${readSource('src/js/bootstrap.js')}</script>`,
    )
    .replace(
      '<!-- structured-data -->',
      `<script type="application/ld+json">${structuredData(site)}</script>`,
    );
}
export function robots(site, preview = false) {
  return preview
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${site.url}sitemap.xml\n`;
}
export function sitemap(site) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeHtml(site.url)}</loc></url></urlset>\n`;
}
