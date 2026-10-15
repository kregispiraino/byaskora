import { afterPaint } from './dom.js';
import { initNavigation } from './components/navigation.js';
import { initDialogs } from './components/dialogs.js';
import { initHeroDots } from './components/hero-dots.js';

import { initAnalytics } from './analytics.js';

initAnalytics();
const navigation = initNavigation();
initDialogs(navigation);

// Shared decoration starts after content and navigation are usable.
afterPaint(initHeroDots);

let printState = [];
addEventListener('beforeprint', () => {
  printState = [...document.querySelectorAll('.faq-list details')].map(
    (detail) => [detail, detail.open],
  );
  printState.forEach(([detail]) => {
    detail.open = true;
  });
});
addEventListener('afterprint', () => {
  printState.forEach(([detail, open]) => {
    detail.open = open;
  });
});
