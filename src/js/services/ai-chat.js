import { normalizeTopic } from '../ai-topics.js';
// Public browser contract only. Provider keys and system prompts belong on the server.
export const MESSAGE_LIMIT = 2000;
export const HISTORY_LIMIT = 10;

function exampleReply(messages) {
  const message = messages.at(-1).content.toLowerCase();
  if (/atend|client|chatbot|whatsapp/.test(message))
    return 'Podemos começar pelas dúvidas mais frequentes, com respostas baseadas nos seus serviços.\n\nO assistente orienta o cliente e encaminha à sua equipe o que precisa de atenção, levando o contexto da conversa.';
  if (/analis|anális|document|relat[oó]rio|dado/.test(message))
    return 'Um agente pode ajudar sua equipe a consultar documentos, comparar informações e preparar resumos para revisão.\n\nAs análises partem das fontes que você disponibiliza, com referências para conferir o resultado e permissões para cada pessoa.';
  if (/automat|tarefa|equipe|opera/.test(message))
    return 'Organizar solicitações, consultar procedimentos e preparar informações para uma aprovação são bons pontos de partida.\n\nO assistente apoia a execução. Sua equipe mantém o controle das decisões e das etapas que precisam de aprovação.';
  return 'A IA pode ajudar no atendimento, na análise de informações e nas tarefas da equipe.\n\nUm bom começo é escolher uma atividade recorrente e organizar as informações necessárias para realizá-la. Experimente um dos cenários de atendimento, análise ou operação nesta prévia.';
}

function previewDelay(signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted)
      return reject(new DOMException('Aborted', 'AbortError'));
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, 650);
    signal.addEventListener('abort', abort, { once: true });
  });
}

export function createChatClient(endpoint = '') {
  return {
    mode: endpoint ? 'connected' : 'preview',
    async send(messages, { signal }) {
      if (
        !messages.length ||
        messages.length > HISTORY_LIMIT ||
        messages.some(
          ({ role, content }) =>
            !['user', 'assistant'].includes(role) ||
            typeof content !== 'string' ||
            !content.trim() ||
            content.length > (role === 'user' ? MESSAGE_LIMIT : 520),
        )
      )
        throw new Error(
          'Não foi possível enviar esta conversa. Comece uma nova conversa.',
        );
      if (!endpoint) {
        await previewDelay(signal);
        const content = messages.at(-1).content.toLowerCase();
        const topic = /atend|client|venda|chatbot/.test(content)
          ? 'chatbots'
          : /analis|anális|document|dado/.test(content)
            ? 'analysis'
            : /automat|tarefa|equipe/.test(content)
              ? 'automation'
              : 'solution';
        return { reply: exampleReply(messages), topic };
      }
      const url = new URL(endpoint, location.origin);
      if (
        url.origin !== location.origin ||
        !url.pathname.startsWith('/api/') ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      )
        throw new Error(
          'O assistente está indisponível no momento. Tente novamente mais tarde.',
        );
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (signal.aborted) controller.abort();
      signal.addEventListener('abort', abort, { once: true });
      const timeout = setTimeout(abort, 20000);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          credentials: 'same-origin',
          signal: controller.signal,
          body: JSON.stringify({ messages }),
        });
        if (!response.ok)
          throw new Error(
            response.status === 429
              ? 'Muitas mensagens em pouco tempo. Aguarde um momento e tente novamente.'
              : 'Não foi possível receber a resposta. Tente novamente.',
          );
        const data = await response.json();
        if (
          typeof data.reply !== 'string' ||
          !data.reply.trim() ||
          data.reply.length > 520
        )
          throw new Error('A resposta não pôde ser exibida. Tente novamente.');
        return { reply: data.reply.trim(), topic: normalizeTopic(data.topic) };
      } catch (error) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        if (controller.signal.aborted)
          throw new Error(
            'A resposta demorou mais que o esperado. Tente novamente.',
            { cause: error },
          );
        if (error instanceof TypeError || error instanceof SyntaxError)
          throw new Error(
            'Não foi possível conectar ao assistente. Tente novamente.',
            { cause: error },
          );
        throw error;
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
      }
    },
  };
}
