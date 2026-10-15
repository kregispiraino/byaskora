import { $ } from '../dom.js';
import { validateField } from '../contact-validation.js';

// The form uses the contact service's public contract. No credentials or personal
// data are persisted in the browser; success requires explicit server confirmation.
export function initContact(cfg) {
  const form = $('#project-form');
  if (!form) return;
  const feedback = $('#form-feedback');
  const fieldset = $('[data-contact-fields]');
  const fields = Object.fromEntries(
    ['name', 'company', 'email', 'phone', 'context'].map((key) => [
      key,
      $(`#contact-${key}`),
    ]),
  );
  const errors = {
    name: 'Informe seu nome.',
    company: 'Use até 140 caracteres para a empresa.',
    email: 'Informe um e-mail válido.',
    phone: 'Informe um telefone válido, com DDD ou código do país.',
    context: 'Conte um pouco mais sobre o projeto (ao menos 15 caracteres).',
  };
  const interest = new URLSearchParams(location.search).get('interesse') || '';
  const normalized = interest.toLowerCase();
  const topic = /ai solutions/.test(normalized)
    ? 'AI Solutions'
    : /site/.test(normalized)
      ? 'Websites'
      : /aplicativo/.test(normalized)
        ? 'Aplicativos'
        : /sistema/.test(normalized)
          ? 'Sistemas'
          : 'Projeto sob medida';
  form.querySelectorAll('[name="interest"]').forEach((input) => {
    input.checked = input.value === topic;
  });
  function valid(key, input) {
    return validateField(
      key,
      input.value,
      input.maxLength,
      input.validity.typeMismatch,
    );
  }
  Object.entries(fields).forEach(([key, input]) => {
    input.addEventListener('input', () => {
      if (valid(key, input)) {
        input.removeAttribute('aria-invalid');
        $(`#error-${key}`).textContent = '';
      }
      feedback.textContent = '';
    });
  });
  let sending = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;
    const invalid = [];
    for (const [key, input] of Object.entries(fields)) {
      const okay = valid(key, input);
      input.setAttribute('aria-invalid', String(!okay));
      $(`#error-${key}`).textContent = okay ? '' : errors[key];
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
    const payload = {
      kind: 'contact',
      name: values.name,
      email: values.email,
      company: values.company,
      phone: values.phone,
      topic: form.querySelector('[name="interest"]:checked').value,
      message: values.context,
    };
    const submitLabel = form.querySelector('button[type="submit"] span');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    sending = true;
    fieldset.disabled = true;
    form.setAttribute('aria-busy', 'true');
    submitLabel.textContent = 'Enviando…';
    feedback.textContent = '';
    try {
      if (!cfg.contactEndpoint) throw new Error('unconfigured');
      const response = await fetch(cfg.contactEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Askora-Request': '1',
        },
        credentials: 'omit',
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (
        !response.ok ||
        !(result?.data?.sent === true || result?.data?.saved === true)
      )
        throw new Error('unconfirmed');
      $('[data-contact-form-view]').hidden = true;
      $('[data-contact-success]').hidden = false;
      $('#contact-success-title').focus();
    } catch (error) {
      feedback.textContent =
        error.message === 'unconfigured'
          ? 'O envio pelo formulário ainda não está disponível. Você pode falar conosco pelo WhatsApp ou e-mail ao lado.'
          : 'Não foi possível confirmar o envio. Seus dados foram mantidos; tente novamente ou converse pelo WhatsApp.';
    } finally {
      clearTimeout(timeout);
      sending = false;
      fieldset.disabled = false;
      form.removeAttribute('aria-busy');
      submitLabel.textContent = 'Solicitar contato';
    }
  });
  fieldset.disabled = false;
}
