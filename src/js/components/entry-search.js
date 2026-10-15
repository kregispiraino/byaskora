import '../../styles/entry-search.css';
import { animateHeroEntrance } from './hero-entrance.js';

// A brief visual opening, never a prerequisite for using the page.
export function initEntrySearch() {
  const root = document.documentElement;
  const overlay = document.querySelector('[data-entry-search]');
  if (!overlay || !root.classList.contains('entry-active')) return;
  const address = root.dataset.entryAddress;
  const domain = overlay.querySelector('[data-entry-domain]');
  const path = overlay.querySelector('[data-entry-path]');
  const domainLength =
    address.indexOf('/') < 0 ? address.length : address.indexOf('/');
  const initialCount = domain.textContent.length;
  const typingLength = address.length - initialCount;
  const typingDuration = initialCount
    ? Math.min(600, Math.max(180, typingLength * 42))
    : 900;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  let frame = 0;
  let timer = 0;
  let lastCount = -1;
  let finished = false;
  let entered = false;

  function enterContent() {
    if (entered) return;
    entered = true;
    animateHeroEntrance();
  }

  function finish(event) {
    if (finished) return;
    if (!event || event.type === 'click') enterContent();
    finished = true;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    listeners.abort();
    root.classList.remove('entry-active');
    if (overlay.contains(document.activeElement)) {
      document.querySelector('main')?.focus({ preventScroll: true });
    }
  }
  function reveal() {
    enterContent();
    overlay.dataset.phase = 'leaving';
    timer = setTimeout(finish, 380);
  }
  function type(now) {
    const elapsed = now - began;
    const count = Math.min(
      address.length,
      initialCount +
        Math.max(
          0,
          Math.floor((elapsed - 90) / (typingDuration / typingLength)),
        ),
    );
    if (count !== lastCount) {
      domain.textContent = address.slice(0, Math.min(count, domainLength));
      path.textContent = address.slice(domainLength, count);
      lastCount = count;
    }
    if (count < address.length) {
      frame = requestAnimationFrame(type);
    } else {
      timer = setTimeout(() => {
        overlay.dataset.phase = 'submitted';
        timer = setTimeout(reveal, 180);
      }, 140);
    }
  }
  const options = { signal: listeners.signal };
  overlay
    .querySelector('[data-entry-skip]')
    .addEventListener('click', finish, options);
  // Keyboard users can reach the page immediately, without a focus trap.
  window.addEventListener('keydown', finish, options);
  window.addEventListener('wheel', finish, { ...options, passive: true });
  window.addEventListener('pagehide', finish, options);
  window.addEventListener('beforeprint', finish, options);
  reduced.addEventListener('change', finish, options);
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) finish();
    },
    options,
  );
  if (reduced.matches || document.hidden) return finish();
  const began = performance.now();
  overlay.dataset.phase = 'typing';
  frame = requestAnimationFrame(type);
}
