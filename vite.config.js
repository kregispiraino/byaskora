import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import {
  loadSite,
  renderPage,
  robots,
  sitemap,
  pageSlugs,
} from './tools/site.js';
import { securityHeaders } from './tools/security.js';
import { createAiHandler } from './server/ai/handler.js';
import { loadAiConfig } from './server/ai/config.js';
import { projects } from './tools/portfolio.js';

const projectPaths = projects
  .map((project) => project.website)
  .filter((path) => path.startsWith('/'));

function serviceRoutes(server) {
  server.middlewares.use(createAiHandler({ config: loadAiConfig }));
  server.middlewares.use((req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    if (projectPaths.includes(`${url.pathname}/`)) {
      res.writeHead(308, { Location: `${url.pathname}/${url.search}` });
      return res.end();
    }
    if (projectPaths.includes(url.pathname))
      req.url = `${url.pathname}index.html${url.search}`;
    if (pageSlugs.includes(url.pathname.slice(1)))
      req.url = `${url.pathname}/index.html${url.search}`;
    next();
  });
}

export default defineConfig(({ mode }) => {
  const site = loadSite();
  const preview = mode === 'preview';
  return {
    appType: 'mpa',
    build: {
      target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
      sourcemap: false,
      rollupOptions: {
        input: Object.fromEntries(
          ['', ...pageSlugs].map((slug) => [
            slug || 'index',
            resolve(slug, 'index.html'),
          ]),
        ),
      },
    },
    preview: { headers: securityHeaders },
    plugins: [
      {
        name: 'byaskora-static-pages',
        transformIndexHtml: {
          order: 'pre',
          handler: (html) => renderPage(html, site, preview),
        },
        configureServer(server) {
          serviceRoutes(server);
          server.watcher.add([
            'src/sections/**/*.html',
            'src/pages/**/*.html',
            'src/shared/**/*.html',
            'src/site.json',
            'src/content/**/*.json',
            'src/illustrations/**/*.html',
          ]);
          server.watcher.on('change', (path) => {
            if (
              /src\/(sections|pages|shared|illustrations|content)\//.test(path)
            )
              server.ws.send({ type: 'full-reload' });
            if (
              path.endsWith('src/site.json') ||
              path.endsWith('src/content/portfolio.json')
            )
              server.restart();
          });
        },
        configurePreviewServer: serviceRoutes,
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'robots.txt',
            source: robots(site, preview),
          });
          this.emitFile({
            type: 'asset',
            fileName: 'sitemap.xml',
            source: sitemap(site),
          });
          this.emitFile({
            type: 'asset',
            fileName: '_nginx-headers.conf',
            source:
              Object.entries(securityHeaders)
                .map(([key, value]) => `add_header ${key} "${value}" always;`)
                .join('\n') + '\n',
          });
        },
      },
    ],
  };
});
