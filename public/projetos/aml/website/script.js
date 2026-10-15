(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const video = document.querySelector('.hero-video');
  const toggles = [...document.querySelectorAll('.motion-toggle')];
  const marquee = document.querySelector('.segments-marquee');
  const group = document.querySelector('.segments-group');
  const activeCounts = new Map();
  const revealItems = [
    ...document.querySelectorAll('[data-reveal], [data-reveal-group] > *'),
  ];
  let paused = false;
  let heroVisible = false;
  let segmentsVisible = false;
  let loaded = false;
  let revealObserver;
  let countObserver;

  // Preserve the original list for assistive technology and no-script browsing.
  if (group) {
    const clone = group.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    group.after(clone);
  }

  function syncPlayback() {
    const enabled = !motion.matches && !connection?.saveData;
    root.classList.toggle('motion-enabled', enabled);
    root.classList.toggle('motion-paused', paused || document.hidden);
    const track = document.querySelector('.segments-track');
    if (track)
      track.style.animationPlayState =
        paused || document.hidden || !segmentsVisible ? 'paused' : '';
    toggles.forEach((button) => {
      button.hidden = !enabled;
      button.setAttribute('aria-pressed', String(paused));
      button.textContent = paused ? 'Retomar animações' : 'Pausar animações';
    });
    if (!video) return;
    if (!enabled || paused || document.hidden || !heroVisible) {
      video.pause();
      return;
    }
    // A poster is enough until motion is allowed and the hero is visible.
    if (!loaded) {
      video.querySelectorAll('source[data-src]').forEach((source) => {
        source.src = source.dataset.src;
      });
      video.load();
      loaded = true;
    }
    video.play().catch(() => {});
  }

  toggles.forEach((button) =>
    button.addEventListener('click', () => {
      paused = !paused;
      syncPlayback();
    }),
  );
  document.addEventListener('visibilitychange', syncPlayback);
  connection?.addEventListener('change', syncPlayback);

  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === video) heroVisible = entry.isIntersecting;
          if (entry.target === marquee) segmentsVisible = entry.isIntersecting;
        });
        syncPlayback();
      },
      { threshold: 0.01 },
    );
    if (video) visibility.observe(video);
    if (marquee) visibility.observe(marquee);
  } else {
    heroVisible = true;
    segmentsVisible = true;
  }

  function finishCounts() {
    activeCounts.forEach(({ frame, final }, element) => {
      cancelAnimationFrame(frame);
      element.textContent = final;
    });
    activeCounts.clear();
  }

  function runCount(element) {
    if (element.dataset.counted || element.dataset.plain || motion.matches)
      return;
    element.dataset.counted = 'true';
    const target = Number(element.dataset.count);
    if (!Number.isFinite(target)) return;
    const final = element.textContent;
    const formatter = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: Number(element.dataset.decimals || 0),
      maximumFractionDigits: Number(element.dataset.decimals || 0),
      useGrouping: element.dataset.sep === '1',
    });
    const start = performance.now();
    const state = { frame: 0, final };
    activeCounts.set(element, state);
    function step(now) {
      const progress = Math.min(1, (now - start) / 1100);
      element.textContent =
        (element.dataset.prefix || '') +
        formatter.format(target * (1 - (1 - progress) ** 3)) +
        (element.dataset.suffix || '');
      if (progress < 1) state.frame = requestAnimationFrame(step);
      else {
        element.textContent = final;
        activeCounts.delete(element);
      }
    }
    state.frame = requestAnimationFrame(step);
  }

  function syncMotion() {
    revealObserver?.disconnect();
    countObserver?.disconnect();
    root.classList.remove('reveal-ready');
    syncPlayback();
    if (motion.matches || !('IntersectionObserver' in window)) {
      finishCounts();
      revealItems.forEach((element) => element.classList.add('is-visible'));
      return;
    }
    root.classList.add('reveal-ready');
    document.querySelectorAll('[data-reveal-group]').forEach((group) => {
      [...group.children].forEach((child, index) => {
        child.style.setProperty('--reveal-delay', `${(index % 2) * 70}ms`);
      });
    });
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.06, rootMargin: '0px 0px -20px 0px' },
    );
    revealItems.forEach((element) => {
      if (element.getBoundingClientRect().top < innerHeight - 20)
        element.classList.add('is-visible');
      else if (!element.classList.contains('is-visible'))
        revealObserver.observe(element);
    });
    countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          runCount(entry.target);
          countObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.6 },
    );
    document.querySelectorAll('[data-count]').forEach((element) => {
      element.setAttribute('aria-label', element.textContent);
      countObserver.observe(element);
    });
  }
  motion.addEventListener('change', syncMotion);
  syncMotion();

  const picker = document.querySelector('.interest-picker');
  const trigger = picker?.querySelector('.interest-trigger');
  const options = picker?.querySelector('.interest-options');
  const selectedInterest = document.getElementById('aml-interest-value');
  if (picker && trigger && options && selectedInterest) {
    function positionOptions() {
      if (options.hidden) return;
      const bounds = trigger.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop || 0;
      const bottom = top + (viewport?.height || innerHeight);
      if (bounds.bottom < top || bounds.top > bottom) {
        setPickerOpen(false);
        return;
      }
      const above = Math.max(0, bounds.top - top - 12);
      const below = Math.max(0, bottom - bounds.bottom - 12);
      const opensUp = below < 200 && above > below;
      picker.classList.toggle('opens-up', opensUp);
      options.style.maxHeight = `${Math.min(260, Math.max(60, opensUp ? above : below))}px`;
    }
    function setPickerOpen(open, restoreFocus = false) {
      options.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      if (open) positionOptions();
      if (restoreFocus) trigger.focus({ preventScroll: true });
    }
    let positionFrame;
    function queuePosition() {
      if (options.hidden) return;
      cancelAnimationFrame(positionFrame);
      positionFrame = requestAnimationFrame(positionOptions);
    }
    window.addEventListener('resize', queuePosition, { passive: true });
    window.addEventListener('scroll', queuePosition, { passive: true });
    window.visualViewport?.addEventListener('resize', queuePosition, {
      passive: true,
    });
    window.visualViewport?.addEventListener('scroll', queuePosition, {
      passive: true,
    });
    trigger.hidden = false;
    picker.classList.add('is-ready');
    setPickerOpen(false);
    trigger.addEventListener('click', () => setPickerOpen(options.hidden));
    picker.addEventListener('change', (event) => {
      if (event.target.matches('input[type="radio"]'))
        selectedInterest.textContent = event.target.value;
    });
    picker.addEventListener('click', (event) => {
      if (event.target.matches('input[type="radio"]'))
        setPickerOpen(false, true);
    });
    picker.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !options.hidden) {
        event.preventDefault();
        setPickerOpen(false, true);
      }
      if (
        event.key === 'Enter' &&
        event.target.matches('input[type="radio"]')
      ) {
        event.preventDefault();
        setPickerOpen(false, true);
      }
    });
    document.addEventListener('click', (event) => {
      if (!picker.contains(event.target)) setPickerOpen(false);
    });
    picker.addEventListener('keydown', (event) => {
      if (event.key === 'Tab')
        requestAnimationFrame(() => {
          if (!picker.contains(document.activeElement)) setPickerOpen(false);
        });
    });
  }

  const contactForm = document.querySelector('.contact-form');
  const formContent = contactForm?.querySelector('.contact-form-content');
  const success = contactForm?.querySelector('.contact-success');
  if (contactForm && formContent && success) {
    function bringIntoView(element) {
      requestAnimationFrame(() => {
        const bounds = element.getBoundingClientRect();
        const top = window.visualViewport?.offsetTop || 0;
        const bottom = top + (window.visualViewport?.height || innerHeight);
        if (bounds.top < top + 24 || bounds.bottom > bottom - 24) {
          element.scrollIntoView({
            block: 'center',
            behavior: motion.matches ? 'instant' : 'smooth',
          });
        }
      });
    }
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!contactForm.reportValidity()) return;
      // This is a local demonstration: no request, storage or data submission.
      contactForm.style.setProperty(
        '--submitted-height',
        `${contactForm.getBoundingClientRect().height}px`,
      );
      contactForm.classList.add('is-complete');
      formContent.hidden = true;
      success.hidden = false;
      success.querySelector('[role="status"]').textContent =
        'Solicitação recebida.';
      success.focus({ preventScroll: true });
      bringIntoView(success);
    });
    contactForm
      .querySelector('.contact-reset')
      .addEventListener('click', () => {
        contactForm.reset();
        if (selectedInterest)
          selectedInterest.textContent = 'Selecione uma solução';
        success.hidden = true;
        success.querySelector('[role="status"]').textContent = '';
        formContent.hidden = false;
        contactForm.classList.remove('is-complete');
        contactForm.style.removeProperty('--submitted-height');
        const nameInput = contactForm.querySelector('[name="nome"]');
        nameInput.focus({ preventScroll: true });
        bringIntoView(nameInput);
      });
  }
})();
