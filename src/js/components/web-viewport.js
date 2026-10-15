// Resize the same browser surface and move its existing content into its new layout.
// Layout dimensions stay independent of the viewer's device; only the fitted scale changes.
export function createWebViewport({
  workspace,
  frame,
  canvas,
  reducedMotion,
  onStart,
  onRest,
}) {
  const buttons = [
    ...workspace.parentElement.querySelectorAll('[data-device-button]'),
  ];
  const chrome = frame.querySelector('.web-chrome');
  const parts =
    '.web-client-brand, .web-client-menu, .web-client-eyebrow, h2, .web-client-description, .web-client-cta, .web-client-footnote, .web-client-art, .web-client-bottom';
  let animations = [];
  let moving = false;
  let run = 0;
  let resizeFrame;
  let observedWidth = 0;

  function stop() {
    run++;
    animations.forEach((animation) => animation.cancel());
    animations = [];
    moving = false;
    workspace.dataset.resizing = 'false';
  }
  function bounds() {
    const padding = getComputedStyle(workspace);
    const available =
      workspace.clientWidth -
      parseFloat(padding.paddingLeft) -
      parseFloat(padding.paddingRight);
    // Desktop keeps its width and the site's natural page proportions. A height
    // cap would shrink the whole browser when the taller layout needs more room.
    if (workspace.dataset.device === 'desktop') {
      const scale = Math.min(1, available / canvas.offsetWidth);
      return {
        scale,
        width: canvas.offsetWidth * scale,
        height: canvas.offsetHeight * scale + chrome.offsetHeight,
      };
    }
    // Reserve room for the browser bar, device controls and breathing space on short screens.
    const firstFoldRoom = Math.max(
      340,
      innerHeight -
        (workspace.getBoundingClientRect().top + scrollY) -
        parseFloat(padding.paddingTop) -
        parseFloat(padding.paddingBottom) -
        54,
    );
    const maxHeight = Math.max(
      180,
      Math.min(440, innerHeight * 0.58, innerHeight - 150, firstFoldRoom),
    );
    const scale = Math.min(
      1,
      available / canvas.offsetWidth,
      (maxHeight - chrome.offsetHeight) / canvas.offsetHeight,
    );
    return {
      scale,
      width: canvas.offsetWidth * scale,
      height: canvas.offsetHeight * scale + chrome.offsetHeight,
    };
  }
  function fit() {
    const size = bounds();
    canvas.style.setProperty('--web-scale', String(size.scale));
    frame.style.width = `${size.width}px`;
    frame.style.height = `${size.height}px`;
    workspace.dataset.ready = 'true';
    return size;
  }
  function refresh() {
    if (moving) stop();
    fit();
    onRest();
  }
  function setDevice(device, withMotion = true) {
    if (
      workspace.dataset.device === device &&
      workspace.dataset.ready &&
      !moving
    )
      return;
    onStart();
    // Capture the displayed geometry, even if the user reverses a morph mid-flight.
    const before = frame.getBoundingClientRect();
    const elements = [
      ...canvas.querySelector('[data-active="true"]').querySelectorAll(parts),
    ];
    const oldRects = elements.map((element) => element.getBoundingClientRect());
    const oldFonts = elements.map(
      (element, index) =>
        parseFloat(getComputedStyle(element).fontSize) *
        (oldRects[index].height / (element.offsetHeight || 1)),
    );
    stop();
    workspace.dataset.device = device;
    canvas.style.width = `${device === 'mobile' ? 320 : 880}px`;
    buttons.forEach((button) =>
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.deviceButton === device),
      ),
    );
    const size = fit();
    const after = frame.getBoundingClientRect();
    const newRects = elements.map((element) => element.getBoundingClientRect());
    frame.style.borderRadius = device === 'mobile' ? '16px' : '10px';
    if (!withMotion || reducedMotion() || document.hidden) {
      onRest();
      return;
    }
    moving = true;
    workspace.dataset.resizing = 'true';
    const version = run;
    const timing = {
      duration: 760,
      easing: 'cubic-bezier(.22,1,.36,1)',
      fill: 'both',
    };
    const toMobile = device === 'mobile';
    animations.push(
      frame.animate(
        [{ width: `${before.width}px` }, { width: `${after.width}px` }],
        {
          ...timing,
          easing: toMobile ? 'cubic-bezier(.65,0,.35,1)' : timing.easing,
        },
      ),
      frame.animate(
        [
          { height: `${before.height}px` },
          { height: `${Math.max(before.height, after.height)}px`, offset: 0.5 },
          { height: `${after.height}px` },
        ],
        timing,
      ),
    );
    elements.forEach((element, index) => {
      const from = oldRects[index];
      const to = newRects[index];
      if (!from.width || !from.height || !to.width || !to.height) return;
      // Coordinates are relative to the browser so its moving left edge is accounted for.
      const dx =
        (from.left - before.left - (to.left - after.left)) / size.scale;
      const dy = (from.top - before.top - (to.top - after.top)) / size.scale;
      const isArt = element.classList.contains('web-client-art');
      const fontScale =
        oldFonts[index] /
        (parseFloat(getComputedStyle(element).fontSize) * size.scale);
      const scaleX = isArt ? from.width / to.width : fontScale;
      const scaleY = isArt ? from.height / to.height : fontScale;
      const keyframes = [
        {
          transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
          transformOrigin: '0 0',
        },
        { transform: 'translate(0, 0) scale(1)', transformOrigin: '0 0' },
      ];
      // Travel around the copy: down then across on mobile; across then up on desktop.
      if (isArt)
        keyframes.splice(1, 0, {
          offset: toMobile ? 0.35 : 0.65,
          transform: toMobile
            ? `translate(${dx}px, 0) scale(1)`
            : `translate(0, ${dy}px) scale(${scaleX}, ${scaleY})`,
          transformOrigin: '0 0',
        });
      animations.push(element.animate(keyframes, timing));
    });
    Promise.allSettled(animations.map((animation) => animation.finished)).then(
      () => {
        if (version !== run) return;
        stop();
        onRest();
      },
    );
  }
  buttons.forEach((button) => {
    button.disabled = false;
    button.addEventListener('click', () =>
      setDevice(button.dataset.deviceButton),
    );
  });
  function requestFit() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(refresh);
  }
  // Observe available width, never our animated browser: no resize/animation feedback loop.
  new ResizeObserver(([entry]) => {
    if (Math.abs(entry.contentRect.width - observedWidth) < 0.5) return;
    observedWidth = entry.contentRect.width;
    requestFit();
  }).observe(workspace);
  addEventListener('resize', requestFit);
  document.fonts.ready.then(requestFit);
  setDevice(
    matchMedia('(max-width: 640px)').matches ? 'mobile' : 'desktop',
    false,
  );
  return { refresh, finish: stop, isMoving: () => moving };
}
