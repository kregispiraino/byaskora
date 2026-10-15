import { AI_TOPICS, normalizeTopic } from '../../src/js/ai-topics.js';
import { SYSTEM_PROMPT } from './prompt.js';

export class AiError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}
export function normalizeReply(data) {
  if (!data || typeof data.reply !== 'string')
    throw new AiError('A resposta não pôde ser exibida. Tente novamente.');
  const reply = data.reply
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, '')
    .replace(/[*#`_]/g, '')
    .replace(/[—–]+/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
  if (
    reply.length < 20 ||
    reply.length > 520 ||
    /https?:\/\/|<[^>]*>|\{\s*"/.test(reply)
  )
    throw new AiError('A resposta não pôde ser exibida. Tente novamente.');
  return { reply, topic: normalizeTopic(data.topic) };
}
export async function generateReply(
  messages,
  { key, model },
  { signal, fetchImpl = fetch } = {},
) {
  if (!key)
    throw new AiError(
      'O assistente está indisponível no momento. Converse com nossa equipe.',
      503,
    );
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,75}$/.test(model))
    throw new AiError('O assistente está indisponível no momento.', 503);
  let response;
  try {
    response = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        signal: AbortSignal.any([
          signal || new AbortController().signal,
          AbortSignal.timeout(18000),
        ]),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: messages.map(({ role, content }) => ({
            role: role === 'assistant' ? 'model' : 'user',
            parts: [{ text: content }],
          })),
          generationConfig: {
            temperature: 0.65,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
            responseJsonSchema: {
              type: 'object',
              properties: {
                reply: { type: 'string' },
                topic: { type: 'string', enum: Object.keys(AI_TOPICS) },
              },
              required: ['reply', 'topic'],
              additionalProperties: false,
            },
          },
        }),
      },
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    // Do not forward provider errors, URLs, credentials or payloads to the client/logs.
    throw new AiError(
      'Não foi possível conectar ao assistente. Tente novamente.',
      504,
    );
  }
  if (!response.ok)
    throw new AiError(
      response.status === 429
        ? 'O assistente atingiu o limite de uso. Tente mais tarde ou converse com nossa equipe.'
        : 'O assistente está indisponível no momento. Tente novamente.',
      response.status === 429 ? 429 : 502,
    );
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new AiError('A resposta não pôde ser exibida. Tente novamente.');
  }
  const candidate = payload.candidates?.[0];
  if (candidate?.finishReason !== 'STOP')
    throw new AiError('Não foi possível concluir a resposta. Tente novamente.');
  const raw = candidate.content?.parts
    ?.filter((part) => !part.thought)
    .map((part) => part.text || '')
    .join('');
  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    throw new AiError('A resposta não pôde ser exibida. Tente novamente.');
  }
  return normalizeReply(result);
}
