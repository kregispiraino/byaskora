import { $, $$ } from '../dom.js';
export function initDialogs({ closeMenu, nav, menu, desktop }) {
  if (
    typeof HTMLDialogElement !== 'undefined' &&
    HTMLDialogElement.prototype.showModal
  )
    document.documentElement.classList.add('dialogs-ready');
  const inquiry = $('#project-dialog');
  const openers = new WeakMap();
  function openDialog(dialog, opener) {
    if (!dialog || dialog.open || typeof dialog.showModal !== 'function')
      return;
    closeMenu();
    if (opener) openers.set(dialog, opener);
    dialog.showModal();
    document.body.classList.add('modal-open');
    const title = document.getElementById(
      dialog.getAttribute('aria-labelledby'),
    );
    title?.focus({ preventScroll: true });
  }
  $$('[data-open-project]').forEach((link) =>
    link.addEventListener('click', (e) => {
      if (typeof inquiry.showModal !== 'function') return;
      e.preventDefault();
      const interest =
        link.dataset.interest ||
        document.body.dataset.interest ||
        'Projeto sob medida';
      $('[data-contact-page]').href =
        `/contato?interesse=${encodeURIComponent(interest)}`;
      openDialog(inquiry, link);
    }),
  );
  $$('[data-dialog]').forEach((button) =>
    button.addEventListener('click', () => {
      openDialog(document.getElementById(button.dataset.dialog), button);
    }),
  );
  $$('dialog').forEach((dialog) => {
    dialog.addEventListener('close', () => {
      if (!$('dialog[open]')) document.body.classList.remove('modal-open');
      const opener = openers.get(dialog);
      if (opener && nav.contains(opener) && !desktop.matches)
        menu.focus({ preventScroll: true });
      else opener?.focus({ preventScroll: true });
    });
    // Keep keyboard navigation inside the active step, including after a view change.
    dialog.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const items = $$(
        'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]',
        dialog,
      ).filter((el) => el.getClientRects().length && !el.closest('[hidden]'));
      const first = items[0],
        last = items[items.length - 1];
      if (!first) {
        e.preventDefault();
        return;
      }
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          !items.includes(document.activeElement))
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    // Close only a completed pointer action on the backdrop, never a drag from a text field.
    let downOutside = false;
    function outside(e) {
      const r = dialog.getBoundingClientRect();
      return (
        e.target === dialog &&
        (e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom)
      );
    }
    dialog.addEventListener('pointerdown', (e) => {
      downOutside = outside(e);
    });
    dialog.addEventListener('click', (e) => {
      if (downOutside && outside(e)) dialog.close();
      downOutside = false;
    });
    $$('[data-close-dialog]', dialog).forEach((button) =>
      button.addEventListener('click', () => dialog.close()),
    );
  });
}
