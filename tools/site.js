import { escapeHtml } from './html.js';
import { renderWebShowcase } from './web-showcase.js';
export { escapeHtml } from './html.js';
import { serviceSlugs, serviceMeta, renderService } from './services.js';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { renderPortfolio } from './portfolio.js';

export const pageSlugs = [...serviceSlugs, 'portifolio', 'contato'];
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
export function render(text, values) {
  const icons = new Set(
    [...readSource('src/shared/icons.html').matchAll(/id="i-([^"]+)"/g)].map(
      (match) => match[1],
    ),
  );
  return text.replace(/\{\{([\w:-]+)\}\}/g, (_, key) => {
    if (key.startsWith('icon:')) {
      const name = key.slice(5);
      if (!icons.has(name)) throw new Error(`Unknown icon: ${name}`);
      return `<svg class="icon" width="20" height="20" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
    }
    if (!Object.hasOwn(values, key))
      throw new Error(`Unknown template value: ${key}`);
    return escapeHtml(values[key]);
  });
}
export function structuredData(site, page = null, pageUrl = site.url) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      ...(page
        ? [
            {
              '@type': 'Service',
              name: page.interest,
              description: page.description,
              url: pageUrl,
              provider: { '@id': `${site.url}#organization` },
            },
          ]
        : []),
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
  const slug = template.match(/<!-- page:([a-z-]+) -->/)?.[1] || '';
  const contact = slug === 'contato';
  const portfolio = slug === 'portifolio';
  const page = slug && !contact && !portfolio ? serviceMeta(slug) : null;
  if (slug) template = readSource('index.html');
  const closing = page?.content.closing;
  const pageUrl = site.url + slug;
  const pageTitle = contact
    ? 'Fale Conosco | ByAskora'
    : portfolio
      ? 'Portfólio | Projetos desenvolvidos pelo ByAskora'
      : page?.title || 'ByAskora | Websites, aplicativos e sistemas sob medida';
  const pageDescription = contact
    ? 'Converse com o ByAskora sobre websites, aplicativos, sistemas e desenvolvimento web sob medida.'
    : portfolio
      ? 'Conheça os projetos Askora, Osler Medicina, Gear SEO e AML Reputacional. Produtos digitais desenvolvidos pelo ByAskora, da experiência à operação.'
      : page?.description ||
        'Websites, aplicativos e sistemas sob medida para sua empresa. Da presença digital à experiência dos clientes e à gestão da operação, com desenvolvimento e manutenção.';
  const fragments = {
    entrySearch:
      !contact && !portfolio ? readSource('src/shared/entry-search.html') : '',
    webShowcase: slug === 'websites' ? renderWebShowcase() : '',
    icons: readSource('src/shared/icons.html'),
    heroDots: readSource('src/shared/hero-dots.html'),
    signalScene: readSource('src/shared/signal-scene.html'),
    mascot: readSource('src/shared/mascot.html'),
    header: readSource('src/shared/header.html'),
    footer: readSource('src/shared/footer.html'),
    dialogs: readSource('src/shared/dialogs.html'),
    faqIntro: readSource('src/shared/faq-intro.html'),
    closing: page
      ? readSource('src/shared/closing.html')
      : readSource('src/shared/closing.html').replace(
          '{{closingTitle}}',
          'O seu projeto começa<br />com uma conversa.',
        ),
    sections: contact
      ? readSource('src/pages/contato.html')
      : portfolio
        ? renderPortfolio()
        : page
          ? renderService(
              page.content,
              readSource(`src/illustrations/${slug}.html`),
            )
          : readdirSync(resolve(root, 'src/sections'))
              .filter((name) => name.endsWith('.html'))
              .sort()
              .map((name) => readSource(`src/sections/${name}`))
              .join('\n'),
  };
  const include = (text) =>
    text.replace(/<!-- include:(\w+) -->/g, (_, key) => {
      if (!Object.hasOwn(fragments, key))
        throw new Error(`Unknown fragment: ${key}`);
      return include(fragments[key]);
    });
  let assembled = include(template);
  assembled = assembled.replace(/<a href="([^"]+)">/g, (link, href) =>
    href === (slug ? `/${slug}` : '/')
      ? link.replace('>', ' aria-current="page">')
      : link,
  );
  return render(assembled, {
    ...site,
    pageSlug: slug,
    entryDomain: page ? 'byaskora.com' : '',
    entryAddress:
      contact || portfolio
        ? ''
        : `byaskora.com${slug ? `/${slug === 'ai-solutions' ? 'ia' : slug}` : ''}`,
    pageEntry: slug || 'institucional',
    pageInterest: page?.interest || 'Projeto sob medida',
    pageTitle,
    pageDescription,
    pageUrl,
    closingTitle: closing?.title || 'O seu projeto começa com uma conversa.',
    closingDescription:
      closing?.intro ||
      'Conte sua ideia ou o que precisa funcionar melhor na sua empresa.',
    closingCta: page?.content.hero.cta || 'Conversar sobre um projeto',
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
      `<script type="application/ld+json">${structuredData(site, page, pageUrl)}</script>`,
    );
}
export function robots(site, preview = false) {
  return preview
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${site.url}sitemap.xml\n`;
}
export function sitemap(site) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['', ...pageSlugs].map((slug) => `<url><loc>${escapeHtml(site.url + slug)}</loc></url>`).join('')}</urlset>\n`;
}
