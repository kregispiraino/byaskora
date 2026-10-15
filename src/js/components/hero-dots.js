import { tokenRgb } from '../palette.js';
/* ByAskora / Dotted field — vanilla Canvas 2D, no dependency or network.
 * Small spring-loaded dots move away from the pointer and settle back in place.
 * Only the decoration moves. Canvas never intercepts clicks or text selection.
 * Static CSS is used for touch, reduced motion and missing Canvas support.
 * requestAnimationFrame runs on demand, not permanently in the background.
 */
export function initHeroDots() {
  const layer = document.querySelector('[data-hero-dots]');
  if (!layer) return;
  const canvas = layer.querySelector('canvas');
  if (!canvas) return;
  let ctx;
  try {
    ctx = canvas.getContext('2d');
  } catch (_) {
    return;
  }
  if (!ctx) return; // The static CSS layer remains visible.

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mouse = window.matchMedia('(hover: hover) and (pointer: fine)');
  const contrast = window.matchMedia('(forced-colors: active)');
  const COLORS = { base: [49, 63, 77], active: tokenRgb('--accent') };
  const SETTINGS = {
    gap: 26,
    radius: 162,
    displacement: 32,
    spring: 0.082,
    friction: 0.74,
    colorEase: 0.15,
    maxDpr: 2,
    maxPixels: 4800000,
    maxPoints: 5200,
  };
  let width = 0,
    height = 0,
    rect = null,
    points = [];
  let enabled = false,
    visible = true,
    frame = 0,
    resizeFrame = 0,
    previousTime = 0;
  const pointer = { x: 0, y: 0, active: false };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const smooth = (n) => n * n * (3 - 2 * n);

  function pause() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  }
  function resetPoints() {
    pointer.active = false;
    for (const p of points) {
      p.x = p.homeX;
      p.y = p.homeY;
      p.vx = 0;
      p.vy = 0;
      p.heat = 0;
    }
  }
  function paint() {
    ctx.clearRect(0, 0, width, height);
    for (const p of points) {
      // Crisp grey at rest; only nearby points receive the Askora-cyan accent.
      const heat = p.heat;
      const r = Math.round(
        COLORS.base[0] + (COLORS.active[0] - COLORS.base[0]) * heat,
      );
      const g = Math.round(
        COLORS.base[1] + (COLORS.active[1] - COLORS.base[1]) * heat,
      );
      const b = Math.round(
        COLORS.base[2] + (COLORS.active[2] - COLORS.base[2]) * heat,
      );
      ctx.fillStyle = `rgba(${r},${g},${b},${(0.31 + heat * 0.59).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.04 + heat * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function tick(now) {
    frame = 0;
    if (!enabled || !visible || document.hidden) return;
    const dt = previousTime
      ? clamp((now - previousTime) / (1000 / 60), 0.3, 1.8)
      : 1;
    previousTime = now;
    const friction = Math.pow(SETTINGS.friction, dt);
    const colorEase = 1 - Math.pow(1 - SETTINGS.colorEase, dt);
    let unsettled = false;
    for (const p of points) {
      let targetX = p.homeX,
        targetY = p.homeY,
        targetHeat = 0;
      if (pointer.active) {
        const dx = p.homeX - pointer.x,
          dy = p.homeY - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < SETTINGS.radius) {
          const proximity = 1 - distance / SETTINGS.radius;
          const force = smooth(proximity) * SETTINGS.displacement;
          // A deterministic direction avoids an undefined vector at a dot centre.
          const nx = distance > 0.001 ? dx / distance : Math.cos(p.angle);
          const ny = distance > 0.001 ? dy / distance : Math.sin(p.angle);
          targetX += nx * force;
          targetY += ny * force;
          targetHeat = smooth(proximity);
        }
      }
      p.vx = (p.vx + (targetX - p.x) * SETTINGS.spring * dt) * friction;
      p.vy = (p.vy + (targetY - p.y) * SETTINGS.spring * dt) * friction;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.heat += (targetHeat - p.heat) * colorEase;
      if (
        Math.abs(p.vx) +
          Math.abs(p.vy) +
          Math.abs(targetX - p.x) +
          Math.abs(targetY - p.y) >
          0.025 ||
        Math.abs(targetHeat - p.heat) > 0.002
      ) {
        unsettled = true;
      } else {
        p.x = targetX;
        p.y = targetY;
        p.vx = 0;
        p.vy = 0;
        p.heat = targetHeat;
      }
    }
    paint();
    if (unsettled) frame = requestAnimationFrame(tick);
    else previousTime = 0; // No work until another pointer/geometry event.
  }
  function wake() {
    if (!frame && enabled && visible && !document.hidden)
      frame = requestAnimationFrame(tick);
  }
  function measure() {
    resizeFrame = 0;
    if (!enabled) return;
    rect = layer.getBoundingClientRect();
    const nextWidth = Math.round(rect.width),
      nextHeight = Math.round(rect.height);
    if (!nextWidth || !nextHeight) return;
    width = nextWidth;
    height = nextHeight;
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      SETTINGS.maxDpr,
      Math.sqrt(SETTINGS.maxPixels / (width * height)),
    );
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const spacing = Math.max(
      width <= 540 ? 24 : SETTINGS.gap,
      Math.ceil(Math.sqrt((width * height) / SETTINGS.maxPoints)),
    );
    const columns = Math.ceil(width / spacing),
      rows = Math.ceil(height / spacing);
    const offsetX = (width - (columns - 1) * spacing) / 2;
    points = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x = offsetX + col * spacing,
          y = spacing / 2 + row * spacing;
        points.push({
          homeX: x,
          homeY: y,
          x,
          y,
          vx: 0,
          vy: 0,
          heat: 0,
          angle: (col * 0.9 + row * 1.7) % (Math.PI * 2),
        });
      }
    }
    pause();
    resetPoints();
    paint();
    layer.classList.add('is-enhanced');
  }
  function scheduleMeasure() {
    if (!enabled || resizeFrame) return;
    resizeFrame = requestAnimationFrame(measure);
  }
  function leave() {
    if (!pointer.active) return;
    pointer.active = false;
    wake();
  }
  function syncMode() {
    enabled = mouse.matches && !motion.matches && !contrast.matches;
    layer.dataset.dotMode = enabled ? 'interactive' : 'static';
    pause();
    resetPoints();
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = 0;
    if (enabled) measure();
    else {
      layer.classList.remove('is-enhanced');
      ctx.clearRect(0, 0, width, height);
    }
  }

  // Passive observation: the decoration does not replace the cursor or hijack input.
  window.addEventListener(
    'pointermove',
    (event) => {
      if (
        !enabled ||
        !visible ||
        document.hidden ||
        event.pointerType === 'touch'
      )
        return;
      if (!rect) rect = layer.getBoundingClientRect();
      const target = event.target instanceof Element ? event.target : null;
      if (
        event.buttons ||
        document.querySelector('dialog[open]') ||
        target?.closest('.hero-stage,.service-scene,.site-header,.page-brand')
      ) {
        leave();
        return;
      }
      const x = event.clientX - rect.left,
        y = event.clientY - rect.top;
      if (x < 0 || x > width || y < 0 || y > height) {
        leave();
        return;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
      wake();
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', leave, {
    passive: true,
  });
  document.addEventListener('pointerdown', leave, { passive: true });
  window.addEventListener('blur', () => {
    pause();
    resetPoints();
    if (enabled) paint();
  });
  window.addEventListener(
    'scroll',
    () => {
      if (!enabled) return;
      rect = layer.getBoundingClientRect();
      leave();
    },
    { passive: true },
  );
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pause();
      resetPoints();
    } else if (enabled) {
      rect = layer.getBoundingClientRect();
      paint();
    }
  });
  window.addEventListener('pagehide', () => {
    pause();
    resetPoints();
  });
  window.addEventListener('pageshow', () => {
    if (enabled) measure();
  });
  for (const query of [motion, mouse, contrast]) {
    if (query.addEventListener) query.addEventListener('change', syncMode);
    else if (query.addListener) query.addListener(syncMode);
  }
  if ('ResizeObserver' in window)
    new ResizeObserver(scheduleMeasure).observe(layer);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (!visible) {
          pause();
          resetPoints();
        } else if (enabled) {
          rect = layer.getBoundingClientRect();
          paint();
        }
      },
      { threshold: 0 },
    ).observe(layer);
  }
  syncMode();
}
