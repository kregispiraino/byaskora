import { $ } from '../dom.js';
import {
  validateField,
  prepareMessage,
  createEmailLink,
} from '../contact-message.js';
export function initContact(cfg, { showStep }) {
  const message = $('#message-preview');
  const feedback = $('#form-feedback');
  const copyFeedback = $('#copy-feedback');
  const fields = {
    name: $('#contact-name'),
    company: $('#contact-company'),
    email: $('#contact-email'),
    context: $('#contact-context'),
  };
  const messages = {
    name: 'Informe seu nome.',
    company: 'Use até 150 caracteres para a empresa.',
    email: 'Informe um e-mail válido.',
    context: 'Conte um pouco mais sobre o projeto (ao menos 15 caracteres).',
  };
  Object.entries(fields).forEach(([key, input]) => {
    input.addEventListener('input', () => {
      if (
        input.getAttribute('aria-invalid') === 'true' &&
        validateField(
          key,
          input.value,
          input.maxLength,
          input.validity.typeMismatch,
        )
      ) {
        input.removeAttribute('aria-invalid');
        $('#error-' + key).textContent = '';
      }
      feedback.textContent = '';
    });
  });
  $('#project-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const invalid = [];
    for (const [key, input] of Object.entries(fields)) {
      const okay = validateField(
        key,
        input.value,
        input.maxLength,
        input.validity.typeMismatch,
      );
      input.setAttribute('aria-invalid', String(!okay));
      $('#error-' + key).textContent = okay ? '' : messages[key];
      if (!okay) invalid.push(input);
    }
    if (invalid.length) {
      feedback.textContent = 'Confira os campos indicados.';
      invalid[0].focus();
      return;
    }
    const values = Object.fromEntries(
      Object.entries(fields).map(([key, input]) => [key, input.value.trim()]),
    );
    message.value = prepareMessage({
      ...values,
      interest: $('#contact-type').value,
    });
    $('#message-email').href = createEmailLink(
      cfg.email,
      values.company || values.name,
      message.value,
    );
    copyFeedback.textContent = '';
    feedback.textContent = '';
    showStep(true);
  });
  $('#edit-message').addEventListener('click', () => showStep(false));
  $('#copy-message').addEventListener('click', async () => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(message.value);
        copyFeedback.textContent =
          'Mensagem copiada. Cole na conversa para enviar.';
        return;
      } catch (_) {
        /* Selecting the text also works in local previews. */
      }
    }
    message.focus();
    message.select();
    message.setSelectionRange(0, message.value.length);
    copyFeedback.textContent =
      'Mensagem selecionada. Use Copiar ou Ctrl+C / ⌘C.';
  });
}
