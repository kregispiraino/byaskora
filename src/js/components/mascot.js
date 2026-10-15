// A softly damped gaze leads the head. All animation is local and pauses offscreen.
export function initMascot() {
  const host = document.querySelector('[data-mascot]');
  if (!host) return;
  const head = host.querySelector('[data-mascot-head]');
  const gaze = host.querySelector('[data-mascot-gaze]');
  const eyelids = host.querySelector('[data-mascot-eyelids]');
  const shadow = host.querySelector('[data-mascot-shadow]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const target = { x: 0, y: 0 };
  const look = { x: 0, y: 0 };
  const pose = { x: 0, y: 0 };
  let rect = host.getBoundingClientRect();
  let visible = false;
  let frame = 0;
  let previous = 0;
  let elapsed = 0;
  let blinkAt = 3.4;
  let touchRelease;
  const clamp = (value) => Math.max(-1, Math.min(1, value));
  const active = () => visible && !reduced.matches && !document.hidden;

  function paint(blink = 1) {
    const float = Math.sin(elapsed * 1.25) * 2;
    head.setAttribute(
      'transform',
      `translate(${pose.x * 9} ${pose.y * 5 + float}) rotate(${pose.x * 4} 320 220)`,
    );
    gaze.setAttribute(
      'transform',
      `translate(${look.x * 24} ${look.y * 17}) rotate(${-look.x * 2} 320 175)`,
    );
    eyelids.setAttribute(
      'transform',
      `translate(320 175) scale(${1 - Math.abs(look.x) * 0.06} ${blink}) translate(-320 -175)`,
    );
    shadow.setAttribute('opacity', String(0.92 + float * 0.025));
  }
  function tick(now) {
    frame = 0;
    if (!active()) return;
    const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 1 / 60;
    previous = now;
    elapsed += dt;
    const eyeEase = 1 - Math.exp(-dt * 13);
    const headEase = 1 - Math.exp(-dt * 7);
    for (const axis of ['x', 'y']) {
      look[axis] += (target[axis] - look[axis]) * eyeEase;
      pose[axis] += (target[axis] - pose[axis]) * headEase;
    }
    const blinkTime = elapsed - blinkAt;
    let blink = 1;
    if (blinkTime >= 0 && blinkTime < 0.19)
      blink = 1 - Math.sin((blinkTime / 0.19) * Math.PI) ** 2 * 0.94;
    else if (blinkTime >= 0.19) blinkAt = elapsed + 4.2 + Math.random() * 2.2;
    paint(blink);
    frame = requestAnimationFrame(tick);
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
  }
  function wake() {
    if (active() && !frame) frame = requestAnimationFrame(tick);
  }
  function neutral() {
    target.x = 0;
    target.y = 0;
  }
  function measure() {
    rect = host.getBoundingClientRect();
  }
  function follow(event) {
    if (!active()) return;
    if (event.pointerType === 'touch' && !host.contains(event.target)) return;
    target.x = clamp(
      (event.clientX - rect.left - rect.width / 2) /
        Math.max(180, innerWidth * 0.36),
    );
    target.y = clamp(
      (event.clientY - rect.top - rect.height * 0.46) /
        Math.max(180, innerHeight * 0.32),
    );
  }
  function sync() {
    stop();
    host.dataset.paused = String(reduced.matches);
    if (reduced.matches) {
      neutral();
      look.x = look.y = pose.x = pose.y = elapsed = 0;
      paint();
    }
    wake();
  }
  window.addEventListener('pointermove', follow, { passive: true });
  host.addEventListener(
    'pointerdown',
    (event) => {
      clearTimeout(touchRelease);
      follow(event);
      if (active()) blinkAt = elapsed + 0.12;
    },
    { passive: true },
  );
  const release = (event) => {
    if (event.pointerType === 'touch') touchRelease = setTimeout(neutral, 900);
  };
  host.addEventListener('pointerup', release, { passive: true });
  host.addEventListener('pointercancel', neutral, { passive: true });
  document.documentElement.addEventListener('pointerleave', (event) => {
    // Touch pointers leave the document at finger release; keep that gaze until
    // the short release timer ends instead of resetting it before the next paint.
    if (event.pointerType !== 'touch') neutral();
  });
  window.addEventListener('blur', neutral);
  window.addEventListener(
    'scroll',
    () => {
      measure();
      neutral();
    },
    { passive: true },
  );
  window.addEventListener('resize', measure, { passive: true });
  new ResizeObserver(measure).observe(host);
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        measure();
        wake();
      } else {
        neutral();
        stop();
      }
    },
    { threshold: 0.1 },
  ).observe(host);
  document.addEventListener('visibilitychange', () => {
    neutral();
    if (document.hidden) stop();
    else wake();
  });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', wake);
  reduced.addEventListener('change', sync);
  sync();
  host.dataset.ready = 'true';
}
