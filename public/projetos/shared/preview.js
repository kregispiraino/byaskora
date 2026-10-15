const project = location.pathname.split('/')[2];
const back = document.createElement('a');
back.className = 'byaskora-preview-back';
back.href = `/portifolio#${project}`;
back.textContent = '← Portfólio';
back.setAttribute('aria-label', 'Voltar ao portfólio do ByAskora');
const backContainer =
  ['aml', 'gear-seo'].includes(project) &&
  document.querySelector('.footer-bottom');
(backContainer || document.body).append(back);
// These isolated presentations never submit a lead or personal data.
document.querySelectorAll('form').forEach((form) => {
  form.addEventListener('submit', (event) => event.preventDefault());
  if (form.hasAttribute('data-preview-custom')) return;
  const button =
    form.querySelector('[data-preview-submit]') || form.querySelector('button');
  if (!button) return;
  button.type = 'button';
  button.addEventListener('click', () => {
    if (form.querySelector('[role="status"]')) return;
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'Esta apresentação não envia dados.';
    form.append(status);
  });
});
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('video').forEach((video) => {
    video.autoplay = false;
    video.pause();
  });
}
