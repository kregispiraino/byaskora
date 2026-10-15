import { generateReply, AiError } from './gemini.js';

const BODY_LIMIT = 40000;
function readBody(req) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks = [];
    const timer = setTimeout(
      () => finish(new AiError('O envio demorou mais que o esperado.', 408)),
      10000,
    );
    function cleanup() {
      clearTimeout(timer);
      req.off('data', data);
      req.off('end', end);
      req.off('error', error);
      req.off('aborted', aborted);
    }
    function finish(reason) {
      cleanup();
      req.resume();
      reject(reason);
    }
    function data(chunk) {
      bytes += chunk.length;
      if (bytes > BODY_LIMIT)
        finish(new AiError('A mensagem é muito longa.', 413));
      else chunks.push(chunk);
    }
    function end() {
      cleanup();
      resolve(Buffer.concat(chunks).toString('utf8'));
    }
    function error() {
      finish(new AiError('O envio foi interrompido.', 400));
    }
    function aborted() {
      finish(new AiError('O envio foi interrompido.', 400));
    }
    req.on('data', data);
    req.on('end', end);
    req.on('error', error);
    req.on('aborted', aborted);
  });
}
export function validateMessages(body) {
  const messages = body?.messages;
  if (
    !Array.isArray(messages) ||
    !messages.length ||
    messages.length > 9 ||
    messages.length % 2 !== 1
  )
    throw new AiError('Envie uma mensagem para começar.', 400);
  return messages.map((item, index) => {
    const role = index % 2 === 0 ? 'user' : 'assistant';
    if (
      item?.role !== role ||
      typeof item.content !== 'string' ||
      !item.content.trim() ||
      item.content.length > (role === 'user' ? 2000 : 520)
    )
      throw new AiError(
        'A mensagem não pôde ser enviada. Revise o texto ou inicie uma nova conversa.',
        400,
      );
    return { role, content: item.content.trim() };
  });
}
export function createAiHandler({
  config,
  generate = generateReply,
  trustProxy = false,
  now = Date.now,
  limits = {},
}) {
  const buckets = new Map();
  const cap = {
    perMinute: 5,
    perDay: 30,
    globalMinute: 15,
    globalDay: 100,
    ...limits,
  };
  let active = 0;
  function allowed(ip) {
    const time = now();
    for (const [key, entry] of buckets)
      if (time - entry.dayStart >= 86400000) buckets.delete(key);
    if (buckets.size >= 2000 && !buckets.has(ip)) return false;
    const records = [ip, '*'].map((key) => {
      let entry = buckets.get(key);
      if (!entry) {
        entry = { minuteStart: time, dayStart: time, minute: 0, day: 0 };
        buckets.set(key, entry);
      }
      if (time - entry.minuteStart >= 60000) {
        entry.minuteStart = time;
        entry.minute = 0;
      }
      return entry;
    });
    if (
      records[0].minute >= cap.perMinute ||
      records[0].day >= cap.perDay ||
      records[1].minute >= cap.globalMinute ||
      records[1].day >= cap.globalDay ||
      active >= 3
    )
      return false;
    records.forEach((entry) => {
      entry.minute++;
      entry.day++;
    });
    return true;
  }
  return async function handleAi(req, res, next = () => {}) {
    if (req.url?.split('?')[0] !== '/api/ai/chat') return next();
    const json = (status, data) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(JSON.stringify(data));
    };
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(405, { error: 'Método não permitido.' });
    }
    if (req.headers.origin) {
      try {
        if (new URL(req.headers.origin).host !== req.headers.host)
          return json(403, { error: 'Origem não permitida.' });
      } catch {
        return json(403, { error: 'Origem não permitida.' });
      }
    }
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || ''))
      return json(415, { error: 'Envie uma mensagem válida.' });
    const ip = trustProxy
      ? req.headers['x-real-ip'] || req.socket.remoteAddress
      : req.socket.remoteAddress;
    if (!allowed(String(ip))) {
      res.setHeader('Retry-After', '60');
      return json(429, {
        error:
          'Muitas mensagens em pouco tempo. Aguarde um momento ou converse com nossa equipe.',
      });
    }
    const controller = new AbortController();
    const disconnected = () => {
      if (!res.writableEnded) controller.abort();
    };
    res.on('close', disconnected);
    active++;
    try {
      const raw = await readBody(req);
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new AiError('Envie uma mensagem válida.', 400);
      }
      const messages = validateMessages(body);
      const result = await generate(
        messages,
        typeof config === 'function' ? config() : config,
        { signal: controller.signal },
      );
      json(200, result);
    } catch (error) {
      if (!controller.signal.aborted)
        json(error instanceof AiError ? error.status : 502, {
          error:
            error instanceof AiError
              ? error.message
              : 'Não foi possível responder agora. Tente novamente.',
        });
    } finally {
      active--;
      res.off('close', disconnected);
    }
  };
}
