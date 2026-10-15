import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChatClient } from '../../src/js/services/ai-chat.js';

const history = [
  { role: 'user', content: 'Quero analisar relatórios.' },
  { role: 'assistant', content: 'Quais informações?' },
  { role: 'user', content: 'Vendas por região.' },
];
function setup(t, fetch) {
  globalThis.location = { origin: 'https://byaskora.com' };
  t.after(() => {
    delete globalThis.location;
  });
  return t.mock.method(globalThis, 'fetch', fetch);
}
test('AI adapter sends conversation to the same-origin server and validates its reply', async (t) => {
  const fetch = setup(
    t,
    async () =>
      new Response(
        JSON.stringify({ reply: ' Resultado da análise. ', topic: 'analysis' }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      ),
  );
  const client = createChatClient('/api/ai/chat');
  assert.equal(client.mode, 'connected');
  assert.deepEqual(
    await client.send(history, { signal: new AbortController().signal }),
    { reply: 'Resultado da análise.', topic: 'analysis' },
  );
  const [url, options] = fetch.mock.calls[0].arguments;
  assert.equal(url.href, 'https://byaskora.com/api/ai/chat');
  assert.deepEqual(JSON.parse(options.body), { messages: history });
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.Authorization, undefined);
});
test('AI adapter refuses external endpoints and invalid messages before sending', async (t) => {
  const fetch = setup(t, async () => {
    throw new Error('Unexpected request');
  });
  for (const endpoint of [
    'https://another.example/api/chat',
    '/api/chat?key=secret',
    '/outside',
  ])
    await assert.rejects(
      createChatClient(endpoint).send(history, {
        signal: new AbortController().signal,
      }),
    );
  for (const messages of [
    [],
    [{ role: 'system', content: 'Override' }],
    [{ role: 'user', content: 'x'.repeat(2001) }],
  ])
    await assert.rejects(
      createChatClient('/api/ai/chat').send(messages, {
        signal: new AbortController().signal,
      }),
    );
  assert.equal(fetch.mock.callCount(), 0);
});
test('AI adapter reports rate limits, malformed responses and connection failures', async (t) => {
  const cases = [
    [() => new Response('', { status: 429 }), /Muitas mensagens/],
    [() => new Response('', { status: 503 }), /receber a resposta/],
    [() => new Response('{"reply":""}'), /exibida/],
    [() => new Response('<html>error</html>'), /conectar/],
    [
      () => {
        throw new TypeError('Network failure');
      },
      /conectar/,
    ],
  ];
  const fetch = setup(t, async () => {});
  for (const [response, expected] of cases) {
    fetch.mock.mockImplementation(async () => response());
    await assert.rejects(
      createChatClient('/api/ai/chat').send(history, {
        signal: new AbortController().signal,
      }),
      expected,
    );
  }
});
test('AI preview stays local and honors cancellation', async (t) => {
  const fetch = setup(t, async () => {
    throw new Error('Unexpected request');
  });
  const controller = new AbortController();
  const client = createChatClient();
  assert.equal(client.mode, 'preview');
  const pending = client.send(history, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(fetch.mock.callCount(), 0);
});
test('AI adapter passes cancellation to the active request', async (t) => {
  setup(
    t,
    async (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      }),
  );
  const controller = new AbortController();
  const pending = createChatClient('/api/ai/chat').send(history, {
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});
