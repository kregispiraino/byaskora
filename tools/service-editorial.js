import { escapeHtml as e } from './html.js';

// Service editorial sections share the institutional typography and open layouts.
// The showroom and FAQ keep their existing shared rendering and interactions.
const copy = (item) => item.paragraphs.map((p) => `<p>${e(p)}</p>`).join('');
const title = (section) =>
  `<h2 id="${e(section.id)}-title">${e(section.title)}</h2>`;

export function renderEditorialSection(section) {
  const { id, kind, items } = section;
  const open = `<section class="editorial-section editorial-${e(kind)} section-space" id="${e(id)}" aria-labelledby="${e(id)}-title">`;
  if (kind === 'delivery')
    return `${open}<div class="wrap editorial-delivery-layout"><div class="editorial-section-copy">${title(section)}<p class="section-intro">${e(section.intro)}</p></div><div class="editorial-deliverables">${items.map((item) => `<article><span class="editorial-detail-icon" aria-hidden="true">{{icon:${e(item.icon)}}}</span><div><h3>${e(item.title)}</h3>${copy(item)}</div></article>`).join('')}</div></div></section>`;
  if (kind === 'process')
    return `${open}<div class="wrap"><div class="section-heading-row">${title(section)}<p class="section-intro">${e(section.intro)}</p></div><ol class="work-steps">${items.map((item, index) => `<li><span class="work-step-index" aria-hidden="true">${index + 1}</span><h3>${e(item.title)}</h3>${copy(item)}</li>`).join('')}</ol></div></section>`;
  if (kind === 'continuity')
    return `${open}<div class="wrap">${title(section)}<div class="editorial-continuity-grid">${items.map((item) => `<article><span class="editorial-detail-icon" aria-hidden="true">{{icon:${e(item.icon)}}}</span><div><h3>${e(item.title)}</h3>${copy(item)}</div></article>`).join('')}</div><p class="editorial-continuity-note">${e(section.note)}</p></div></section>`;
  throw new Error(`Unknown editorial section: ${kind}`);
}
