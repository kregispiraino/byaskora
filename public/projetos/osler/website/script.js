(() => {
  const root = document.documentElement;
  const card = document.querySelector('.nav-actions');
  const toggle = card?.querySelector('.nav-toggle');
  const links = card?.querySelector('[data-nav-links]');

  if (card && toggle && links) {
    function setOpen(open, restoreFocus = false) {
      if (!open && restoreFocus) toggle.focus({ preventScroll: true });
      card.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      links.inert = !open;
    }
    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && card.classList.contains('is-open')) {
        setOpen(false, true);
      }
    });
    document.addEventListener('click', (event) => {
      if (!card.contains(event.target)) {
        setOpen(false, links.contains(document.activeElement));
      }
    });
    document.addEventListener('focusin', (event) => {
      if (!card.contains(event.target)) setOpen(false);
    });
    links.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;
      const section = document.querySelector(link.getAttribute('href'));
      section?.focus({ preventScroll: true });
      setOpen(false);
    });
    setOpen(false);
    root.classList.add('navigation-ready');
  }

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let observer;
  // Animate individual cards instead of waiting for a tall mobile group to enter.
  document
    .querySelectorAll(
      '.cards.reveal, .feature-grid.reveal, .residency-grid.reveal, .timeline.reveal',
    )
    .forEach((group) => {
      group.classList.remove('reveal');
      [...group.children].forEach((item, index) => {
        item.classList.add('reveal');
        item.style.setProperty('--reveal-delay', `${(index % 2) * 70}ms`);
      });
    });
  const items = [...document.querySelectorAll('.reveal')];
  function syncMotion() {
    observer?.disconnect();
    root.classList.remove('motion-ready');
    if (motion.matches || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' },
    );
    items.forEach((item) => {
      if (item.getBoundingClientRect().top < innerHeight - 24) {
        item.classList.add('is-visible');
      } else if (!item.classList.contains('is-visible')) {
        observer.observe(item);
      }
    });
    root.classList.add('motion-ready');
  }
  syncMotion();
  motion.addEventListener('change', syncMotion);

  const metrics = document.querySelector('.metrics');
  const counters = [...document.querySelectorAll('[data-count]')];
  let countObserver;
  let countFrame;
  let counted = false;
  const countAnimations = [];

  function finishCounts() {
    cancelAnimationFrame(countFrame);
    countAnimations.forEach((animation) => animation.cancel());
    counters.forEach((counter) => {
      counter.textContent =
        counter.dataset.count + (counter.dataset.suffix || '');
    });
  }

  function animateCounts() {
    if (counted) return;
    counted = true;
    countObserver?.disconnect();
    if (motion.matches) return;
    const start = performance.now();
    counters.forEach((counter, index) => {
      countAnimations.push(
        counter.animate(
          [
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          {
            duration: 500,
            delay: index * 80,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'backwards',
          },
        ),
      );
    });
    function tick(now) {
      counters.forEach((counter, index) => {
        const progress = Math.min(
          1,
          Math.max(0, (now - start - index * 80) / 1100),
        );
        const eased = 1 - Math.pow(1 - progress, 3);
        counter.textContent =
          Math.round(Number(counter.dataset.count) * eased) +
          (counter.dataset.suffix || '');
      });
      if (now - start < 1100 + (counters.length - 1) * 80) {
        countFrame = requestAnimationFrame(tick);
      }
    }
    countFrame = requestAnimationFrame(tick);
  }

  if (metrics && 'IntersectionObserver' in window) {
    countObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) animateCounts();
      },
      { threshold: 0.45 },
    );
    countObserver.observe(metrics);
  }
  motion.addEventListener('change', () => {
    if (motion.matches) finishCounts();
  });
})();
