import { readFileSync } from 'node:fs';
import { escapeHtml as e } from './html.js';
import { renderEditorialSection } from './service-editorial.js';

export const serviceSlugs = [
  'websites',
  'aplicativos',
  'sistemas',
  'ai-solutions',
  'reestruturacao',
];
const titles = {
  websites: 'Websites profissionais',
  aplicativos: 'Aplicativos para iOS e Android',
  sistemas: 'Sistemas, dashboards e BI',
  'ai-solutions': 'AI Solutions — Soluções com inteligência artificial',
  reestruturacao: 'Reestruturação de softwares e projetos com IA',
};
export function loadService(slug) {
  if (!serviceSlugs.includes(slug)) throw new Error(`Unknown service: ${slug}`);
  return JSON.parse(
    readFileSync(
      new URL(`../src/content/services/${slug}.json`, import.meta.url),
      'utf8',
    ),
  );
}
export function serviceMeta(slug) {
  const content = loadService(slug);
  return {
    title: `${titles[slug]} | ByAskora`,
    description: content.hero.description,
    interest: titles[slug],
    content,
  };
}
const paragraphs = (items) => items.map((p) => `<p>${e(p)}</p>`).join('');
const cta = (label, style = 'text-link') =>
  `<a class="${style}" href="/contato" data-open-project aria-haspopup="dialog" aria-controls="project-dialog">${e(label)} {{icon:arrow-up}}</a>`;
function section(s) {
  if (s.kind === 'faq')
    return `<section class="faq-section section-space" id="${e(s.id)}" aria-labelledby="faq-title"><div class="faq-layout wrap"><!-- include:faqIntro --><div class="faq-list">${s.items.map((a) => `<details><summary>${e(a.title)} {{icon:plus}}</summary><div class="faq-answer">${paragraphs(a.paragraphs)}</div></details>`).join('')}</div></div></section>`;
  return renderEditorialSection(s);
}
export function renderService(content, illustration) {
  const { hero, slug } = content;
  const first = content.sections[0].id;
  const split = hero.title.indexOf('. ');
  const title =
    split < 0
      ? e(hero.title)
      : `${e(hero.title.slice(0, split + 1))} <span>${e(hero.title.slice(split + 2))}</span>`;
  const ai = slug === 'ai-solutions';
  const heroHtml = `<section class="service-hero service-hero--${slug}" aria-labelledby="service-title"><!-- include:heroDots --><div class="wrap service-hero-layout">${ai ? '<div class="ai-intro" data-ai-intro>' : ''}<div class="service-hero-copy"><h1 id="service-title">${title}</h1><p class="service-lead">${e(hero.description)}</p><div class="service-actions">${cta(hero.cta, 'button button-dark')}<a class="text-link" href="#${first}">Conhecer a entrega {{icon:arrow}}</a></div>${hero.note ? `<p class="service-hero-note">${e(hero.note)}</p>` : ''}</div>${ai ? '</div>' : ''}${illustration}</div></section>`;
  return (
    heroHtml +
    content.sections.map(section).join('') +
    '<!-- include:closing -->'
  );
}
