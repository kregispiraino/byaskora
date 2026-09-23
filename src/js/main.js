import '../styles/tokens.css';
import '../styles/shared.css';
import '../styles/landing.css';
import '../styles/hero-dots.css';
import '../styles/signal-scene.css';
import '../styles/fallbacks.css';
import config from '../site.json';
import { initNavigation } from './components/navigation.js';
import { initTabs } from './components/tabs.js';
import { initDialogs } from './components/dialogs.js';
import { initContact } from './components/contact.js';
import { initHeroDots } from './components/hero-dots.js';
import { initSignalScene } from './components/signal-scene.js';

const navigation = initNavigation();
initTabs();
initContact(config, initDialogs(navigation));

// Decorative effects initialize after the first paint, leaving content and controls ready.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    initHeroDots();
    initSignalScene();
  });
});

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
