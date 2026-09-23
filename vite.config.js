import { defineConfig } from 'vite';
import { loadSite, renderPage, robots, sitemap } from './tools/site.js';
import { securityHeaders } from './tools/security.js';

export default defineConfig(({ mode }) => {
  const site = loadSite();
  const preview = mode === 'preview';
  return {
    appType: 'mpa',
    build: {
      target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
      sourcemap: false,
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
          server.watcher.add([
            'src/sections/**/*.html',
            'src/shared/**/*.html',
            'src/site.json',
          ]);
          server.watcher.on('change', (path) => {
            if (/src\/(sections|shared)\/.*\.html$/.test(path))
              server.ws.send({ type: 'full-reload' });
            if (path.endsWith('src/site.json')) server.restart();
          });
        },
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
