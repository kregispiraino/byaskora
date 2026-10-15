import { readFileSync } from 'node:fs';
import { escapeHtml as e } from './html.js';

// Shared showroom structure with independent editorial content and local photographs.
export function renderWebShowcase() {
  const examples = JSON.parse(
    readFileSync(
      new URL('../src/content/website-showcase.json', import.meta.url),
      'utf8',
    ),
  );
  return `<div class="web-showcase" role="group" aria-label="Exemplos de sites" aria-roledescription="carrossel">${examples
    .map((site, index) => {
      const art = `<img class="web-photo" src="${e(site.image.src)}" alt="${e(site.image.alt)}" width="${site.image.width}" height="${site.image.height}" decoding="async" fetchpriority="${index === 0 ? 'high' : 'auto'}">`;
      return `<div class="web-client-site" data-web-slide="${e(site.id)}" data-palette="${e(site.palette)}" data-domain="${e(site.domain)}" data-name="${e(site.name)}" data-category="${e(site.category)}" data-active="${index === 0}" role="group" aria-roledescription="slide" aria-label="${index + 1} de ${examples.length}: ${e(site.category)}" ${index ? 'aria-hidden="true" inert' : ''}>
      <div class="web-client-nav"><span class="web-client-brand">${e(site.name)}<span aria-hidden="true">.</span></span><span class="web-client-links">${site.nav.map((item) => `<span>${e(item)}</span>`).join('')}</span><span class="web-client-menu" aria-hidden="true"><i></i><i></i></span></div>
      <div class="web-client-hero"><div class="web-client-copy"><span class="web-client-eyebrow">${e(site.eyebrow)}</span><h2>${e(site.title[0])}<br>${e(site.title[1])}<em>${e(site.accent)}</em></h2><p class="web-client-description">${site.description.map(e).join(' ')}</p><span class="web-client-cta">${e(site.cta)} {{icon:arrow-up}}</span><span class="web-client-footnote">${e(site.note)}</span></div>
      <div class="web-client-art"><div class="web-art-page">${art}<div class="web-art-caption"><span>${e(site.artTitle)}</span><span>${e(site.artSubtitle)}</span></div></div></div></div>
      <div class="web-client-bottom"><span>${e(site.footer)}</span><span>${site.tags.map((tag) => `<span>${e(tag)}</span>`).join('')}</span></div>
    </div>`;
    })
    .join('')}</div>`;
}
