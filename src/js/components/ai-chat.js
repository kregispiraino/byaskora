import { createChatClient, HISTORY_LIMIT } from '../services/ai-chat.js';
import { topicLabel, normalizeTopic, AI_TOPICS } from '../ai-topics.js';

export function initAiChat({ endpoint = '' } = {}) {
  const scene = document.querySelector('[data-ai-chat]');
  if (!scene) return;
  const hero = scene.closest('.service-hero');
  const intro = hero.querySelector('[data-ai-intro]');
  const form = scene.querySelector('[data-ai-form]');
  const input = form.querySelector('textarea');
  const send = form.querySelector('[type="submit"]');
  const stop = form.querySelector('[data-ai-stop]');
  const project = form.querySelector('[data-ai-project]');
  const conversation = scene.querySelector('[data-ai-conversation]');
  const thread = scene.querySelector('[data-ai-thread]');
  const feedback = scene.querySelector('[data-ai-feedback]');
  const status = scene.querySelector('[data-ai-status]');
  const retry = scene.querySelector('[data-ai-retry]');
  const suggestions = scene.querySelector('[data-ai-suggestions]');
  const client = createChatClient(endpoint);
  let messages = [];
  let request = null;
  let failed = false;
  let topic = null;
  scene.dataset.mode = client.mode;
  scene.querySelector('[data-ai-fields]').disabled = false;

  function measure() {
    scene.style.setProperty(
      '--ai-conversation-height',
      `${Math.max(160, intro.getBoundingClientRect().height - 18)}px`,
    );
  }
  new ResizeObserver(measure).observe(intro);
  measure();
  scene.querySelectorAll('[data-ai-prompt]').forEach((button) => {
    button.disabled = false;
    button.addEventListener('click', () => {
      input.value = button.dataset.aiPrompt;
      updateControls();
      form.requestSubmit();
    });
  });
  function showStatus(message, canRetry = false) {
    status.textContent = message;
    feedback.hidden = !message;
    retry.hidden = !canRetry;
  }
  function scrollThread() {
    requestAnimationFrame(() =>
      thread.scrollTo({
        top: thread.scrollHeight,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      }),
    );
  }
  function appendMessage(role, content) {
    const article = document.createElement('div');
    article.className = `ai-message ai-message--${role}`;
    const label = document.createElement('span');
    label.className = 'ai-message-label';
    label.textContent =
      role === 'user'
        ? 'Você'
        : client.mode === 'preview'
          ? 'AI Solutions · exemplo'
          : 'AI Solutions';
    const body = document.createElement('p');
    body.className = 'ai-message-content';
    body.textContent = content;
    article.append(label, body);
    thread.append(article);
    scrollThread();
  }
  function updateControls() {
    const showProject =
      !request && !input.value.trim() && (topic !== null || failed);
    project.hidden = !showProject;
    form.classList.toggle('has-project', showProject);
    send.hidden = !!request || showProject;
    stop.hidden = !request;
    send.disabled =
      !!request ||
      failed ||
      messages.length >= HISTORY_LIMIT ||
      !input.value.trim();
    input.readOnly = !!request || failed || messages.length >= HISTORY_LIMIT;
    thread.setAttribute('aria-busy', String(!!request));
    const selected = normalizeTopic(topic);
    project.querySelector('span').textContent = topicLabel(selected);
    project.dataset.interest = `AI Solutions: ${AI_TOPICS[selected]}`;
    project.href = `/contato?interesse=${encodeURIComponent(project.dataset.interest)}`;
  }
  async function respond() {
    if (request) return;
    const current = new AbortController();
    request = current;
    failed = false;
    const pending = document.createElement('div');
    pending.className = 'ai-pending';
    pending.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) pending.append(document.createElement('span'));
    thread.append(pending);
    showStatus(
      client.mode === 'preview'
        ? 'Preparando uma resposta de exemplo…'
        : 'Preparando a resposta…',
    );
    updateControls();
    scrollThread();
    try {
      const result = await client.send(
        messages.map((message) => ({ ...message })),
        { signal: current.signal },
      );
      if (request !== current) return;
      pending.remove();
      topic = normalizeTopic(result.topic);
      messages.push({ role: 'assistant', content: result.reply });
      appendMessage('assistant', result.reply);
      showStatus(
        messages.length >= HISTORY_LIMIT
          ? 'Para explorar outra ideia, inicie uma nova conversa.'
          : '',
      );
    } catch (error) {
      if (request !== current) return;
      failed = true;
      showStatus(
        error.name === 'AbortError'
          ? 'Resposta interrompida. Você pode tentar novamente ou iniciar uma nova conversa.'
          : error.message,
        true,
      );
    } finally {
      pending.remove();
      if (request === current) {
        const restoreFocus =
          document.activeElement === stop || document.activeElement === retry;
        request = null;
        updateControls();
        if (restoreFocus)
          (failed ? retry : project).focus({ preventScroll: true });
      }
    }
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const content = input.value.trim();
    if (!content || request || failed || messages.length >= HISTORY_LIMIT)
      return;
    intro.inert = true;
    suggestions.inert = true;
    if (conversation.hidden) {
      conversation.hidden = false;
      // Establish the hidden CSS state before starting the first transition.
      conversation.getBoundingClientRect();
    }
    hero.classList.add('is-conversing');
    messages.push({ role: 'user', content });
    appendMessage('user', content);
    input.value = '';
    input.scrollTop = 0;
    input.focus({ preventScroll: true });
    void respond();
  });
  input.addEventListener('input', () => {
    input.scrollTop = input.scrollHeight;
    updateControls();
  });
  input.addEventListener('keydown', (event) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.isComposing &&
      matchMedia('(pointer: fine)').matches
    ) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  stop.addEventListener('click', () => request?.abort());
  retry.addEventListener('click', () => {
    void respond();
  });
  scene.querySelector('[data-ai-reset]').addEventListener('click', () => {
    request?.abort();
    request = null;
    messages = [];
    failed = false;
    topic = null;
    thread.replaceChildren();
    input.value = '';
    input.scrollTop = 0;
    hero.classList.remove('is-conversing');
    intro.inert = false;
    suggestions.inert = false;
    showStatus('');
    updateControls();
    input.focus({ preventScroll: true });
  });
  window.addEventListener('pagehide', () => request?.abort());
  updateControls();
}
