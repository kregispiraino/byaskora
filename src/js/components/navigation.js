import { $ } from '../dom.js';
export function initNavigation() {
  document.documentElement.classList.add('navigation-ready');
  const nav = $('#main-navigation');
  const menu = $('.mobile-menu-toggle');
  const desktop = matchMedia('(min-width: 901px)');
  function closeMenu(restore = false) {
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    if (restore && !desktop.matches) menu.focus({ preventScroll: true });
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeMenu();
  });
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && !menu.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true')
      closeMenu(true);
  });
  document.addEventListener('focusin', (e) => {
    if (!nav.contains(e.target) && !menu.contains(e.target)) closeMenu();
  });
  desktop.addEventListener('change', () => closeMenu());

  return { closeMenu, nav, menu, desktop };
}
