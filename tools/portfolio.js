import { readFileSync } from 'node:fs';
import { escapeHtml as e } from './html.js';

export const projects = JSON.parse(
  readFileSync(
    new URL('../src/content/portfolio.json', import.meta.url),
    'utf8',
  ),
);

export function renderPortfolio() {
  const shell = readFileSync(
    new URL('../src/pages/portifolio.html', import.meta.url),
    'utf8',
  );
  return shell.replace(
    '<!-- projects -->',
    projects
      .map((project, index) => {
        const ownProduct = project.id === 'askora';
        const external = ownProduct
          ? ' target="_blank" rel="noopener noreferrer"'
          : '';
        const action = ownProduct ? 'Explorar produto' : 'Ver website';
        return `<article class="project-card project-card--${e(project.id)}" id="${e(project.id)}" aria-labelledby="project-${e(project.id)}">
        <a class="project-visual" href="${e(project.website)}"${external} aria-label="${action}: ${e(project.name)}${ownProduct ? ', abre em nova aba' : ''}">
          <div class="project-preview">
            <div class="web-chrome project-browser-chrome" aria-hidden="true">
              <span class="web-window-dots"><i></i><i></i><i></i></span>
              <span class="web-address">{{icon:shield}}<span>${e(project.name)}</span></span>
              <span class="project-browser-open">{{icon:arrow-up}}</span>
            </div>
            <img src="/assets/images/portfolio/${e(project.image)}" alt="${e(project.imageAlt)}" width="1280" height="800" ${index < 2 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />
          </div>
        </a>
        <div class="project-copy">
          <div class="project-identity"><h2 id="project-${e(project.id)}">${e(project.name)}</h2><span>${e(project.context)}</span></div>
          <h3>${e(project.headline)}</h3>
          <p>${e(project.description)}</p>
          <p class="project-scope">${e(project.scope)}</p>
          <div class="project-actions">
            <a href="${e(project.website)}"${external}>${action} {{icon:arrow-up}}${ownProduct ? '<span class="sr-only">, abre em nova aba</span>' : ''}</a>
            ${ownProduct || project.system === false ? '' : project.system ? `<a href="${e(project.system)}">Ver sistema {{icon:arrow-up}}</a>` : '<button type="button" disabled>Ver sistema {{icon:arrow-up}}</button>'}
          </div>
        </div>
      </article>`;
      })
      .join('\n'),
  );
}
