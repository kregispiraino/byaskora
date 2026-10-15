// One short compositor-only sequence; no scroll handlers or animation library.
export function animateHeroEntrance() {
  const hero = document.querySelector('.hero, .service-hero');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!hero || reduced.matches || document.hidden) return;

  const targets = [
    hero.querySelector('h1'),
    hero.querySelector('.hero-description, .service-lead'),
    hero.querySelector('.hero-actions, .service-actions'),
    hero.querySelector('.mascot-stage, .service-scene, .ai-scene'),
  ].filter(Boolean);
  const mascot = hero.querySelector('.mascot-stage');
  const animations = targets.map((element, index) => {
    const arrival = element.querySelector('.mascot-arrival');
    if (arrival) element.classList.add('is-arriving');
    const keyframes = arrival
      ? [
          {
            offset: 0,
            opacity: 0,
            transform: 'translateY(110%) rotate(-4deg) scale(0.96)',
            easing: 'cubic-bezier(0.22, 0.65, 0.3, 1)',
          },
          {
            offset: 0.14,
            opacity: 1,
            transform: 'translateY(58%) rotate(-2deg) scale(0.985)',
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          },
          {
            offset: 0.78,
            opacity: 1,
            transform: 'translateY(-6px) rotate(0.6deg) scale(1)',
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          },
          {
            offset: 1,
            opacity: 1,
            transform: 'translateY(0) rotate(0) scale(1)',
          },
        ]
      : [
          { opacity: 0, transform: `translateY(${index === 3 ? 18 : 12}px)` },
          { opacity: 1, transform: 'translateY(0)' },
        ];
    const animation = (arrival || element).animate(keyframes, {
      duration: arrival ? 1000 : 620,
      delay: 80 + index * 70,
      easing: arrival ? 'linear' : 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both',
    });
    animation.id = 'hero-entrance';
    return animation;
  });

  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  let pointerActive = false;
  const settle = () => {
    animations.forEach((animation) => animation.cancel());
    mascot?.classList.remove('is-arriving');
  };
  // Keep the target under the pointer until the click has been delivered.
  hero.addEventListener(
    'pointerdown',
    () => {
      pointerActive = true;
      animations.forEach((animation) => animation.pause());
    },
    options,
  );
  hero.addEventListener(
    'focusin',
    () => {
      if (!pointerActive) settle();
    },
    options,
  );
  window.addEventListener('click', settle, options);
  window.addEventListener('pointercancel', settle, options);
  window.addEventListener('contextmenu', settle, options);
  window.addEventListener('blur', settle, options);
  window.addEventListener('pagehide', settle, options);
  window.addEventListener('beforeprint', settle, options);
  reduced.addEventListener('change', settle, options);
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) settle();
    },
    options,
  );
  void Promise.allSettled(
    animations.map((animation) => animation.finished),
  ).then(() => {
    // Do not retain transforms or compositor layers on interactive demos.
    settle();
    listeners.abort();
  });
}
