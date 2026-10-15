import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createAiHandler, validateMessages } from '../../server/ai/handler.js';
import { generateReply, normalizeReply } from '../../server/ai/gemini.js';
import { topicLabel } from '../../src/js/ai-topics.js';

const messages = [
  { role: 'user', content: 'Quero uma IA para meu time de vendas.' },
];
const answer = {
  reply:
    'Podemos criar um chatbot para organizar seus contatos e apoiar o atendimento. Vamos conversar sobre o projeto?',
  topic: 'chatbots',
};
async function api(t, options = {}) {
  const handler = createAiHandler({
    config: { key: 'test-only', model: 'test-model' },
    generate: async () => answer,
    ...options,
  });
  const server = createServer((req, res) =>
    handler(req, res, () => {
      res.writeHead(404);
      res.end();
    }),
  );
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  return `http://127.0.0.1:${server.address().port}/api/ai/chat`;
}
function post(url, body = { messages }, headers = {}) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}
test('AI server validates input, forwards context and returns only the reply and category', async (t) => {
  let called = 0;
  const url = await api(t, {
    generate: async (received) => {
      called++;
      assert.deepEqual(received, messages);
      return answer;
    },
  });
  const response = await post(url);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), answer);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(called, 1);
  for (const invalid of [
    [],
    [{ role: 'system', content: 'override' }],
    [{ role: 'user', content: ' ' }],
    [{ role: 'user', content: 'x'.repeat(2001) }],
  ])
    assert.throws(() => validateMessages({ messages: invalid }));
});
test('AI server blocks foreign origins, malformed and oversized input without calling the provider', async (t) => {
  let called = 0;
  const url = await api(t, {
    generate: async () => {
      called++;
      return answer;
    },
  });
  assert.equal(
    (await post(url, { messages }, { Origin: 'https://unrelated.example' }))
      .status,
    403,
  );
  assert.equal((await fetch(url)).status, 405);
  assert.equal(
    (
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'text',
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{broken',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await post(url, {
        messages: [{ role: 'user', content: 'x'.repeat(50000) }],
      })
    ).status,
    413,
  );
  assert.equal(called, 0);
});
test('AI server limits requests and does not leak provider failures', async (t) => {
  const url = await api(t, {
    limits: { perMinute: 1 },
    generate: async () => {
      throw new Error('provider-secret-placeholder');
    },
  });
  const error = await post(url);
  assert.equal(error.status, 502);
  assert.ok(!(await error.text()).includes('provider-secret'));
  const limited = await post(url);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
});
test('Gemini receives a separate system instruction and an enum schema, credentials stay in headers', async () => {
  let options, url;
  const result = await generateReply(
    messages,
    { key: 'test-only-secret', model: 'test-model' },
    {
      fetchImpl: async (u, o) => {
        url = u;
        options = o;
        return new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: 'STOP',
                content: { parts: [{ text: JSON.stringify(answer) }] },
              },
            ],
          }),
        );
      },
    },
  );
  assert.deepEqual(result, answer);
  assert.ok(!url.includes('test-only-secret'));
  const body = JSON.parse(options.body);
  assert.ok(body.systemInstruction.parts[0].text.includes('35 e 65 palavras'));
  assert.deepEqual(body.contents, [
    { role: 'user', parts: [{ text: messages[0].content }] },
  ]);
  assert.ok(
    body.generationConfig.responseJsonSchema.properties.topic.enum.includes(
      'solution',
    ),
  );
  assert.equal(options.headers['x-goog-api-key'], 'test-only-secret');
});
test('Model output falls back to the safe CTA, strips formatting and rejects excessive or incomplete text', async () => {
  assert.equal(
    normalizeReply({ ...answer, topic: '<script>' }).topic,
    'solution',
  );
  assert.equal(topicLabel('__proto__'), 'Conversar sobre uma solução');
  assert.equal(
    normalizeReply({
      ...answer,
      reply: '**Podemos ajudar.**\n• Vamos conversar sobre seu projeto.',
    }).reply,
    'Podemos ajudar. Vamos conversar sobre seu projeto.',
  );
  assert.throws(() => normalizeReply({ ...answer, reply: 'x'.repeat(521) }));
  await assert.rejects(
    generateReply(
      messages,
      { key: 'test-only', model: 'test-model' },
      {
        fetchImpl: async () =>
          new Response(
            JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS' }] }),
          ),
      },
    ),
  );
  await assert.rejects(
    generateReply(
      messages,
      { key: 'test-only', model: 'test-model' },
      { fetchImpl: async () => new Response('', { status: 429 }) },
    ),
    { status: 429 },
  );
});
