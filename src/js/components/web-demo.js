import { createWebViewport } from './web-viewport.js';

// Independent site examples share a real desktop/mobile layout viewport.
export function initWebDemo() {
  const scene = document.querySelector('.web-scene');
  if (!scene) return;
  const workspace = scene.querySelector('.web-workspace');
  const frame = scene.querySelector('.web-browser');
  const canvas = scene.querySelector('.web-canvas');
  const slides = [...scene.querySelectorAll('[data-web-slide]')];
  const address = scene.querySelector('[data-web-address]');
  const position = scene.querySelector('[data-web-position]');
  const pause = scene.querySelector('[data-web-pause]');
  const next = scene.querySelector('[data-web-next]');
  const announcement = scene.querySelector('[data-web-announcement]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = () => reduced.matches;
  let current = 0;
  let timer;
  let visible = false;
  let paused = false;
  let busy = false;
  let generation = 0;
  let transitions = [];
  let viewport = null;
  function syncControls() {
    const disabled = prefersReducedMotion();
    pause.disabled = disabled;
    pause.setAttribute('aria-pressed', String(paused || disabled));
    // The icon follows playback; reduced motion keeps manual next available.
    pause.setAttribute(
      'aria-label',
      disabled
        ? 'Apresentação automática desativada'
        : paused
          ? 'Retomar apresentação'
          : 'Pausar apresentação',
    );
    pause
      .querySelector('path')
      .setAttribute(
        'd',
        paused || disabled ? 'm5 3 7 5-7 5Z' : 'M5 3v10M11 3v10',
      );
    position.textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    workspace.dataset.site = slides[current].dataset.webSlide;
  }
  function settle() {
    generation++;
    transitions.forEach((animation) => animation.cancel());
    transitions = [];
    busy = false;
    workspace.dataset.transitioning = 'false';
    slides.forEach((slide, index) => {
      const active = index === current;
      slide.dataset.active = String(active);
      delete slide.dataset.leaving;
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active;
    });
    address.textContent = slides[current].dataset.domain;
    syncControls();
  }
  function canCycle() {
    return (
      !prefersReducedMotion() &&
      !document.hidden &&
      visible &&
      !paused &&
      !busy &&
      !viewport?.isMoving()
    );
  }
  function schedule() {
    clearTimeout(timer);
    if (!canCycle()) return;
    timer = setTimeout(() => {
      if (canCycle()) show((current + 1) % slides.length);
    }, 5500);
  }
  function animate(element, frames, options) {
    const animation = element.animate(frames, { fill: 'both', ...options });
    transitions.push(animation);
    return animation;
  }
  function show(index, manual = false) {
    clearTimeout(timer);
    viewport?.finish();
    settle();
    const outgoing = slides[current];
    current = index;
    const incoming = slides[current];
    workspace.dataset.palette = incoming.dataset.palette;
    outgoing.dataset.active = 'false';
    outgoing.dataset.leaving = 'true';
    outgoing.setAttribute('aria-hidden', 'true');
    outgoing.inert = true;
    incoming.dataset.active = 'true';
    incoming.setAttribute('aria-hidden', 'false');
    incoming.inert = false;
    syncControls();
    if (manual)
      announcement.textContent = `${current + 1} de ${slides.length}: ${incoming.dataset.name}, ${incoming.dataset.category}.`;
    if (prefersReducedMotion() || !visible || document.hidden) {
      settle();
      schedule();
      return;
    }
    busy = true;
    workspace.dataset.transitioning = 'true';
    const run = generation;
    const movement = { duration: 1100, easing: 'cubic-bezier(.65,0,.35,1)' };
    // Both art pages travel at the same speed through identical clipped frames.
    animate(
      outgoing.querySelector('.web-art-page'),
      [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }],
      movement,
    );
    animate(
      incoming.querySelector('.web-art-page'),
      [{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }],
      movement,
    );
    for (const selector of [
      '.web-client-nav',
      '.web-client-copy',
      '.web-client-bottom',
    ]) {
      animate(
        outgoing.querySelector(selector),
        [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: 'translateX(24px)' },
        ],
        { duration: 420, easing: 'ease-in' },
      );
      animate(
        incoming.querySelector(selector),
        [
          { opacity: 0, transform: 'translateX(-24px)' },
          { opacity: 1, transform: 'translateX(0)' },
        ],
        { duration: 740, delay: 260, easing: 'cubic-bezier(.22,1,.36,1)' },
      );
    }
    const addressOut = animate(address, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 220,
    });
    addressOut.finished
      .then(() => {
        if (run !== generation) return;
        address.textContent = incoming.dataset.domain;
        animate(
          address,
          [
            { opacity: 0, transform: 'translateX(-5px)' },
            { opacity: 1, transform: 'translateX(0)' },
          ],
          { duration: 420, easing: 'ease-out' },
        );
      })
      .catch(() => {});
    Promise.allSettled(transitions.map((animation) => animation.finished)).then(
      () => {
        if (run !== generation) return;
        settle();
        schedule();
      },
    );
  }
  next.disabled = false;
  next.addEventListener('click', () =>
    show((current + 1) % slides.length, true),
  );
  pause.addEventListener('click', () => {
    paused = !paused;
    syncControls();
    schedule();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      viewport?.finish();
      settle();
    }
    schedule();
  });
  window.addEventListener('pagehide', () => {
    clearTimeout(timer);
    viewport?.finish();
    settle();
  });
  window.addEventListener('pageshow', schedule);
  reduced.addEventListener('change', () => {
    if (prefersReducedMotion()) {
      viewport?.finish();
      settle();
    }
    syncControls();
    schedule();
  });
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) settle();
      schedule();
    },
    { threshold: 0.15 },
  ).observe(scene);
  viewport = createWebViewport({
    workspace,
    frame,
    canvas,
    reducedMotion: prefersReducedMotion,
    onStart: () => {
      clearTimeout(timer);
      settle();
    },
    onRest: schedule,
  });
}
