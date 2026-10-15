import { $, $$ } from '../dom.js';
export function initTabs() {
  document.documentElement.classList.add('tabs-ready');
  const tabs = $$('.solution-tab');
  const panels = $$('.solution-panel');
  const selector = $('.solution-selector');
  if (!selector) return;
  const compact = matchMedia('(max-width: 900px)');
  const syncOrientation = () =>
    selector.setAttribute(
      'aria-orientation',
      compact.matches ? 'horizontal' : 'vertical',
    );
  compact.addEventListener('change', syncOrientation);
  syncOrientation();
  function selectTab(tab, focus = false) {
    if (!tab) return;
    tabs.forEach((t) => {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((p) => {
      p.hidden = p.id !== tab.getAttribute('aria-controls');
    });
    if (focus) tab.focus({ preventScroll: true });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      let n;
      if (['ArrowDown', 'ArrowRight'].includes(e.key))
        n = (i + 1) % tabs.length;
      else if (['ArrowUp', 'ArrowLeft'].includes(e.key))
        n = (i + tabs.length - 1) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      else return;
      e.preventDefault();
      selectTab(tabs[n], true);
    });
  });
  $$('[data-service]').forEach((a) =>
    a.addEventListener('click', () =>
      selectTab($('#tab-' + a.dataset.service)),
    ),
  );
}
