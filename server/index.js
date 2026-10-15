import { createServer } from 'node:http';
import { loadAiConfig } from './ai/config.js';
import { createAiHandler } from './ai/handler.js';
const handler = createAiHandler({ config: loadAiConfig, trustProxy: true });
const server = createServer((req, res) =>
  handler(req, res, () => {
    res.writeHead(404);
    res.end();
  }),
);
server.requestTimeout = 25000;
server.headersTimeout = 10000;
server.listen(3001, '127.0.0.1', () =>
  console.log('AI service listening on loopback port 3001.'),
);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => server.close(() => process.exit(0)));
