(() => {
  const root = document.documentElement;
  const mobile = matchMedia('(max-width: 980px)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (header && menuButton && mobileNav) {
    function setMenu(open, restoreFocus = false) {
      if (restoreFocus) menuButton.focus({ preventScroll: true });
      root.classList.toggle('menu-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute(
        'aria-label',
        open ? 'Fechar menu' : 'Abrir menu',
      );
      mobileNav.inert = !open;
    }
    menuButton.addEventListener('click', () =>
      setMenu(menuButton.getAttribute('aria-expanded') !== 'true'),
    );
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && root.classList.contains('menu-open'))
        setMenu(false, true);
    });
    document.addEventListener('click', (event) => {
      if (!header.contains(event.target)) setMenu(false);
    });
    document.addEventListener('focusin', (event) => {
      if (!header.contains(event.target)) setMenu(false);
    });
    mobileNav.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;
      document
        .querySelector(link.getAttribute('href'))
        ?.focus({ preventScroll: true });
      setMenu(false);
    });
    mobile.addEventListener('change', () => setMenu(false));
    setMenu(false);
    root.classList.add('navigation-ready');
  }

  const heroVideo = document.querySelector('.hero-video');
  const heroToggle = document.querySelector('.hero-motion');
  const connection = navigator.connection;
  let heroVisible = false;
  let userPaused = false;
  function syncHeroVideo() {
    if (!heroVideo || !heroToggle) return;
    const allowed = !motion.matches && !connection?.saveData;
    heroToggle.hidden = !allowed;
    heroToggle.setAttribute('aria-pressed', String(userPaused));
    heroToggle.textContent = userPaused
      ? 'Reproduzir vídeo de fundo'
      : 'Pausar vídeo de fundo';
    if (!allowed || !heroVisible || userPaused || document.hidden) {
      heroVideo.pause();
      return;
    }
    if (!heroVideo.getAttribute('src')) heroVideo.src = heroVideo.dataset.src;
    heroVideo.play().catch(() => {});
  }
  heroToggle?.addEventListener('click', () => {
    userPaused = !userPaused;
    syncHeroVideo();
  });
  if (heroVideo && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        heroVisible = entry.isIntersecting;
        syncHeroVideo();
      },
      { threshold: 0.01 },
    );
    observer.observe(heroVideo);
  } else heroVisible = true;
  document.addEventListener('visibilitychange', syncHeroVideo);
  connection?.addEventListener('change', syncHeroVideo);

  const teaser = document.querySelector('.floating-video-card');
  const launcher = document.querySelector('.presentation-launch');
  const minimize = document.querySelector('.floating-minimize');
  const bubble = document.querySelector('.floating-video-bubble');
  const presentation = document.querySelector('.presentation-video');
  const controls = document.querySelector('.video-controls');
  const playPause = document.querySelector('.video-play-pause');
  const progress = document.querySelector('.video-progress');
  const currentLabel = document.querySelector('.video-current');
  const durationLabel = document.querySelector('.video-duration');
  if (
    teaser &&
    launcher &&
    minimize &&
    bubble &&
    presentation &&
    controls &&
    playPause &&
    progress
  ) {
    let state = 'preview';
    const formatTime = (value) => {
      const seconds = Number.isFinite(value) ? Math.floor(value) : 0;
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    };
    function loadPresentation() {
      if (!presentation.getAttribute('src'))
        presentation.src = presentation.dataset.src;
    }
    function updateControls() {
      currentLabel.textContent = formatTime(presentation.currentTime);
      durationLabel.textContent = formatTime(presentation.duration);
      progress.value = presentation.duration
        ? String((presentation.currentTime / presentation.duration) * 100)
        : '0';
      progress.setAttribute(
        'aria-valuetext',
        `${formatTime(presentation.currentTime)} de ${formatTime(presentation.duration)}`,
      );
      playPause.classList.toggle('is-paused', presentation.paused);
      playPause.setAttribute(
        'aria-label',
        presentation.paused ? 'Reproduzir vídeo' : 'Pausar vídeo',
      );
    }
    function syncPreview() {
      if (document.hidden || state === 'minimized') {
        presentation.pause();
        return;
      }
      if (state !== 'preview') return;
      if (motion.matches || connection?.saveData) presentation.pause();
      else {
        loadPresentation();
        presentation.play().catch(() => {});
      }
    }
    function setState(next) {
      state = next;
      const expanded = state === 'expanded';
      teaser.hidden = state === 'minimized';
      bubble.hidden = state !== 'minimized';
      teaser.classList.toggle('is-expanded', expanded);
      launcher.setAttribute('aria-expanded', String(expanded));
      launcher.hidden = expanded;
      controls.hidden = !expanded;
      presentation.muted = !expanded;
      presentation.loop = !expanded;
      if (expanded) {
        loadPresentation();
        presentation.currentTime = 0;
        presentation.play().catch(() => {});
        playPause.focus({ preventScroll: true });
      } else {
        syncPreview();
      }
      updateControls();
    }
    launcher.addEventListener('click', () => setState('expanded'));
    minimize.addEventListener('click', () => {
      setState('minimized');
      bubble.focus({ preventScroll: true });
    });
    bubble.addEventListener('click', () => {
      setState('preview');
      launcher.focus({ preventScroll: true });
    });
    teaser.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      setState('minimized');
      bubble.focus({ preventScroll: true });
    });
    playPause.addEventListener('click', () => {
      if (presentation.paused) presentation.play().catch(() => {});
      else presentation.pause();
    });
    progress.addEventListener('input', () => {
      if (Number.isFinite(presentation.duration)) {
        presentation.currentTime =
          (Number(progress.value) / 100) * presentation.duration;
        updateControls();
      }
    });
    for (const event of [
      'loadedmetadata',
      'timeupdate',
      'play',
      'pause',
      'ended',
    ]) {
      presentation.addEventListener(event, updateControls);
    }
    document.addEventListener('visibilitychange', syncPreview);
    motion.addEventListener('change', syncPreview);
    connection?.addEventListener('change', syncPreview);
    setState('preview');
  }

  const revealItems = [
    ...document.querySelectorAll(
      '.section-copy, .section-heading, .process-card article, .service-card, .result-panel, .proof-grid-card article, .contact-card',
    ),
  ];
  revealItems.forEach((element) => element.classList.add('reveal'));
  let revealObserver;
  function syncMotion() {
    syncHeroVideo();
    revealObserver?.disconnect();
    root.classList.remove('motion-ready');
    if (motion.matches || !('IntersectionObserver' in window)) {
      revealItems.forEach((element) => element.classList.add('is-visible'));
      return;
    }
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.06, rootMargin: '0px 0px -16px 0px' },
    );
    revealItems.forEach((element) => {
      if (element.getBoundingClientRect().top < innerHeight - 16)
        element.classList.add('is-visible');
      else if (!element.classList.contains('is-visible'))
        revealObserver.observe(element);
    });
    root.classList.add('motion-ready');
  }
  motion.addEventListener('change', syncMotion);
  syncMotion();
})();
