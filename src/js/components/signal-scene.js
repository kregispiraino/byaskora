/* ByAskora / Sinal.
 * Original Canvas 2D scene: disconnected fragments -> connected, living circuit.
 * No CDN, WebGL, fonts, analytics, data requests or third-party runtime.
 * One render loop, time-based motion, offscreen pause, reduced-motion support.
 * v1.9: transparent surface; cable/fragment contrast tuned for the light page.
 */
export function initSignalScene() {
  const host = document.querySelector('[data-signal-scene]');
  if (!host) return;
  const power = host.querySelector('[data-signal-power]');
  if (power) power.disabled = true;
  const canvas = host.querySelector('canvas');
  let ctx;
  try {
    ctx = canvas?.getContext('2d', { alpha: true });
  } catch {
    return;
  }
  const motion = host.querySelector('[data-signal-motion]');
  const status = host.querySelector('[data-signal-status]');
  if (!ctx || !power || !motion || !status) return;
  power.disabled = false;

  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const palette = {
    cyan: [31, 225, 231],
    mint: [125, 240, 201],
    amber: [255, 177, 58],
    silver: [195, 204, 204],
  };
  const PI = Math.PI,
    TAU = PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = (x) => {
    x = clamp(x);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };
  const color = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a)})`;
  const blend = (a, b, t) => a.map((v, i) => Math.round(mix(v, b[i], t)));
  let seed = 324721;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const sample = (lo, hi) => lo + (hi - lo) * random();
  let w = 1000,
    h = 450,
    scale = 1,
    dpr = 1,
    mobile = false,
    center = { x: 500, y: 225 };
  let nodes = [],
    routes = [],
    clock = 0,
    progress = 0,
    target = 0,
    raf = 0,
    last = 0,
    visible = true;
  let paused = false,
    reduced = reducedQuery.matches,
    frames = 0,
    frameCost = 0;
  let pointer = { x: -1000, y: -1000, inside: false };
  let wave = null,
    bursts = [],
    transition = { at: 0, from: 0, to: 0 };
  const fragments = Array.from({ length: 96 }, (_, i) => ({
    id: i,
    route: i % 6,
    phase: random(),
    speed: sample(0.047, 0.07),
    x: random(),
    y: random(),
    rotation: sample(-PI, PI),
    size: sample(1.2, 3.0),
    delay: sample(0, 0.13),
    weight: sample(0.35, 0.95),
    lane: ((i % 3) - 1) * 2.4,
  }));
  const brokenOffsets = [
    [-44, 22],
    [34, -23],
    [-16, 30],
    [33, 14],
    [-24, -30],
    [17, 19],
  ];

  function roundRect(c, x, y, width, height, r) {
    r = Math.min(r, width / 2, height / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + width, y, x + width, y + height, r);
    c.arcTo(x + width, y + height, x, y + height, r);
    c.arcTo(x, y + height, x, y, r);
    c.arcTo(x, y, x + width, y, r);
    c.closePath();
  }
  function line(a, b, stroke, width = 1) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  function circle(x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function light(x, y, r, tint, alpha) {
    if (alpha <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color(tint, alpha));
    g.addColorStop(0.35, color(tint, alpha * 0.3));
    g.addColorStop(1, color(tint, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function cubic(p, t) {
    const s = 1 - t,
      a = s * s * s,
      b = 3 * s * s * t,
      c = 3 * s * t * t,
      d = t * t * t;
    return {
      x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x,
      y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y,
    };
  }
  function tangent(p, t) {
    const a = cubic(p, clamp(t - 0.002)),
      b = cubic(p, clamp(t + 0.002));
    return Math.atan2(b.y - a.y, b.x - a.x);
  }
  function routePoint(route, t, offset = 0) {
    const p = cubic(route.curve, clamp(t));
    if (offset) {
      const angle = tangent(route.curve, clamp(t));
      p.x -= Math.sin(angle) * offset;
      p.y += Math.cos(angle) * offset;
    }
    return p;
  }
  function trace(route, from, to, offset = 0) {
    from = clamp(from);
    to = clamp(to);
    if (to <= from) return;
    const count = Math.max(2, Math.ceil((to - from) * 70));
    ctx.beginPath();
    for (let i = 0; i <= count; i++) {
      const p = routePoint(route, mix(from, to, i / count), offset);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  function resize() {
    const box = host.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return;
    mobile = matchMedia('(max-width:640px)').matches;
    w = mobile ? 620 : 1000;
    h = mobile ? 710 : 450;
    center = { x: w / 2, y: h / 2 };
    scale = box.width / w;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    host.style.setProperty('--core-size', `${(mobile ? 110 : 98) * scale}px`);
    host.style.setProperty('--core-x', '50%');
    host.style.setProperty('--core-y', '50%');
    const xy = mobile
      ? [
          [125, 145],
          [310, 100],
          [495, 145],
          [125, 565],
          [310, 610],
          [495, 565],
        ]
      : [
          [125, 112],
          [94, 225],
          [125, 338],
          [875, 112],
          [906, 225],
          [875, 338],
        ];
    nodes = xy.map(([x, y], i) => ({
      x,
      y,
      index: i,
      rotation: (i % 2 ? -1 : 1) * (0.16 + (i % 3) * 0.035),
      value: 0,
    }));
    updateRoutes();
    render();
    wake();
  }
  function nodePosition(n) {
    const q = ease(clamp((progress - n.index * 0.012) / 0.9));
    const drift = reduced
      ? 0
      : Math.sin(clock * 0.43 + n.index * 2) * 2.3 * (1 - q);
    const dx = brokenOffsets[n.index][0],
      dy = brokenOffsets[n.index][1];
    return {
      x: n.x + dx * (1 - q) + drift,
      y: n.y + dy * (1 - q) + Math.cos(clock * 0.37 + n.index) * 1.8 * (1 - q),
      angle: n.rotation * (1 - q),
    };
  }
  function updateRoutes() {
    routes = nodes.map((n, i) => {
      const pos = nodePosition(n),
        input = i < 3,
        j = i % 3;
      let on;
      if (mobile) {
        const port = {
          x: center.x + (j - 1) * 18,
          y: center.y + (input ? -56 : 56),
        };
        if (input)
          on = [
            { x: pos.x, y: pos.y + 32 },
            { x: pos.x, y: pos.y + 121 },
            { x: port.x, y: port.y - 84 },
            port,
          ];
        else
          on = [
            port,
            { x: port.x, y: port.y + 84 },
            { x: pos.x, y: pos.y - 121 },
            { x: pos.x, y: pos.y - 32 },
          ];
      } else {
        const port = {
          x: center.x + (input ? -52 : 52),
          y: center.y + (j - 1) * 18,
        };
        if (input)
          on = [
            { x: pos.x + 32, y: pos.y },
            { x: pos.x + 167, y: pos.y },
            { x: port.x - 130, y: port.y },
            port,
          ];
        else
          on = [
            port,
            { x: port.x + 130, y: port.y },
            { x: pos.x - 167, y: pos.y },
            { x: pos.x - 32, y: pos.y },
          ];
      }
      const q = ease(progress),
        disorder = 1 - q;
      // Broken cables have independent tangents, then settle into clean routes.
      if (mobile) {
        on[1].x += Math.sin(i * 2 + 1) * 62 * disorder;
        on[2].x -= Math.cos(i * 2 + 1) * 44 * disorder;
      } else {
        on[1].y += Math.sin(i * 2 + 1) * 75 * disorder;
        on[2].y -= Math.cos(i * 2 + 1) * 58 * disorder;
      }
      const hue =
        i % 3 === 2 ? blend(palette.cyan, palette.mint, 0.6) : palette.cyan;
      return { curve: on, input, index: i, hue };
    });
  }
  function drawUnderlay(q) {
    // Small pools of reflected light, mostly graphite even when connected.
    if (q > 0.01) {
      light(center.x, center.y, 155, palette.cyan, 0.032 * q);
      for (let i = 3; i < 6; i++) {
        const p = nodePosition(nodes[i]);
        light(p.x, p.y, 85, i === 5 ? palette.amber : palette.mint, 0.018 * q);
      }
    }
    ctx.save();
    ctx.translate(center.x, center.y);
    const a = (1 - q) * -0.07;
    ctx.rotate(a);
    ctx.strokeStyle = color([89, 105, 101], 0.27);
    ctx.lineWidth = 0.75;
    const r = 76;
    [
      [-r, -r, 1, 1],
      [r, -r, -1, 1],
      [r, r, -1, -1],
      [-r, r, 1, -1],
    ].forEach(([x, y, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(x + dx * 9, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * 9);
      ctx.stroke();
    });
    ctx.restore();
    for (const side of [-1, 1])
      for (let j = -1; j <= 1; j++) {
        const x = mobile ? center.x + j * 18 : center.x + side * 55;
        const y = mobile ? center.y + side * 62 : center.y + j * 18;
        roundRect(
          ctx,
          x - (mobile ? 1.3 : 3),
          y - (mobile ? 3 : 1.3),
          mobile ? 2.6 : 6,
          mobile ? 6 : 2.6,
          1,
        );
        ctx.fillStyle = color(
          blend(palette.silver, palette.cyan, q * 0.7),
          0.18 + q * 0.42,
        );
        ctx.fill();
      }
  }
  function drawRoutes(q) {
    routes.forEach((route, i) => {
      const local = ease(clamp((progress - 0.08 - (i % 3) * 0.035) / 0.77));
      // Three filaments per connection; the middle gap physically closes.
      const gapLeft = mix(0.32, 0.5, local),
        gapRight = mix(0.68, 0.5, local);
      for (let lane = -1; lane <= 1; lane++) {
        const offset = lane * 3.4;
        ctx.lineWidth = lane === 0 ? 1 : 0.65;
        ctx.strokeStyle =
          lane === 0 ? 'rgba(91,112,107,.44)' : 'rgba(105,123,119,.23)';
        trace(route, 0, gapLeft, offset);
        trace(route, gapRight, 1, offset);
        if (local > 0.2) {
          const p0 = route.curve[0],
            p1 = route.curve[3],
            grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
          grad.addColorStop(0, color(palette.cyan, 0.06 * local));
          grad.addColorStop(
            0.5,
            color(route.hue, (lane === 0 ? 0.25 : 0.08) * local),
          );
          grad.addColorStop(
            1,
            color(route.input ? palette.cyan : palette.mint, 0.11 * local),
          );
          ctx.strokeStyle = grad;
          trace(route, 0, 1, offset);
        }
      }
      // Interrupted signals travel up to a break; they do not pretend to work.
      if (q < 0.97) {
        const k = (Math.sin(clock * 1.1 + i * 1.7) * 0.5 + 0.5) * 0.26;
        const p = routePoint(route, route.input ? k : 1 - k);
        circle(p.x, p.y, 1.6, color([94, 110, 106], 0.68 * (1 - q)));
        const cut = routePoint(route, route.input ? 0.34 : 0.66);
        circle(cut.x, cut.y, 1.5, color(palette.amber, 0.48 * (1 - q)));
      }
    });
    // A fine return line closes the circuit, with a travelling acknowledgement.
    const a = mobile ? { x: 525, y: 565 } : { x: 875, y: 370 },
      b = mobile ? { x: 525, y: 145 } : { x: 125, y: 370 };
    const c1 = mobile ? { x: 600, y: 565 } : { x: 805, y: 425 },
      c2 = mobile ? { x: 600, y: 145 } : { x: 190, y: 425 };
    const ret = { curve: [a, c1, c2, b] };
    if (q > 0.2) {
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = color([95, 114, 108], 0.27 * q);
      trace(ret, 0, 1);
      const tt = (((clock * 0.12) % 1) + 1) % 1,
        p = routePoint(ret, tt);
      const speedAlpha = Math.sin(tt * PI) * q;
      circle(p.x, p.y, 1.6, color(palette.mint, 0.8 * speedAlpha));
      ctx.strokeStyle = color(palette.mint, 0.35 * speedAlpha);
      ctx.lineWidth = 1;
      trace(ret, Math.max(0, tt - 0.09), tt);
    }
  }
  function scattered(f) {
    let x = mix(60, w - 60, f.x),
      y = mix(48, h - 48, f.y);
    const dx = x - center.x,
      dy = y - center.y,
      r = Math.hypot(dx, dy);
    if (r < 108) {
      x = center.x + ((dx || 0.1) * 108) / Math.max(1, r);
      y = center.y + ((dy || 0.1) * 108) / Math.max(1, r);
    }
    const drift = reduced ? 0 : 1;
    return {
      x: x + Math.sin(clock * 0.35 + f.id) * 4 * drift,
      y: y + Math.cos(clock * 0.27 + f.id * 0.8) * 3 * drift,
    };
  }
  function drawFragments(q) {
    fragments.forEach((f) => {
      const route = routes[f.route],
        t = (f.phase + clock * f.speed) % 1;
      const p = routePoint(route, t, f.lane),
        a = scattered(f);
      const lock = ease(clamp((progress - f.delay) / (0.9 - f.delay)));
      const bend = Math.sin(lock * PI) * (f.id % 2 ? 1 : -1) * 18;
      const pos = {
        x: mix(a.x, p.x, lock) + bend,
        y: mix(a.y, p.y, lock) - bend * 0.5,
      };
      let repelX = 0,
        repelY = 0;
      if (pointer.inside && q < 0.5) {
        const dx = pos.x - pointer.x,
          dy = pos.y - pointer.y,
          len = Math.hypot(dx, dy);
        if (len < 72 && len > 0) {
          const force = (1 - len / 72) * 9 * (1 - q);
          repelX = (dx / len) * force;
          repelY = (dy / len) * force;
        }
      }
      const edgeFade = Math.min(t * 10, (1 - t) * 10, 1);
      const alpha = mix(
        0.38 * f.weight,
        edgeFade * (0.3 + f.weight * 0.55),
        lock,
      );
      let c = blend([91, 105, 101], route.hue, lock * 0.92);
      if (f.route === 5 && t > 0.63)
        c = blend(c, palette.amber, ((t - 0.63) / 0.37) * 0.72 * lock);
      const angle = mix(f.rotation, tangent(route.curve, t), lock);
      ctx.save();
      ctx.translate(pos.x + repelX, pos.y + repelY);
      ctx.rotate(angle);
      ctx.fillStyle = color(c, alpha);
      const sx = mix(f.size * 1.2, 3.8 + (f.id % 3), lock),
        sy = mix(f.size, 1.2, lock);
      roundRect(ctx, -sx / 2, -sy / 2, sx, sy, 0.6);
      ctx.fill();
      ctx.restore();
    });
  }
  function comet(route, t, opacity = 1, length = 0.095) {
    if (t < 0 || t > 1) return;
    const alpha = clamp(Math.min(t * 12, (1 - t) * 9, 1)) * opacity;
    const hue =
      route.index === 5 && t > 0.72
        ? blend(palette.mint, palette.amber, (t - 0.72) / 0.28)
        : route.hue;
    for (let k = 0; k < 13; k++) {
      const head = t - (k * length) / 13,
        tail = head - length / 13;
      if (tail < 0) continue;
      ctx.strokeStyle = color(hue, alpha * (1 - k / 13) * 0.74);
      ctx.lineWidth = 1.35;
      trace(route, tail, head);
    }
    const p = routePoint(route, t);
    light(p.x, p.y, 10, hue, 0.14 * alpha);
    circle(p.x, p.y, 1.8, color(hue, alpha * 0.88));
    circle(p.x, p.y, 0.68, `rgba(241,255,252,${alpha * 0.95})`);
  }
  function drawComets(q) {
    if (q < 0.2) return;
    const visibility = ease(clamp((q - 0.2) / 0.8));
    routes.forEach((route, i) => {
      for (let k = 0; k < 2; k++) {
        // The outgoing signal follows the incoming signal, through the core.
        let t =
          (clock * 0.155 - (i % 3) * 0.21 - (route.input ? 0 : 0.5) + k * 0.5) %
          1;
        if (t < 0) t += 1;
        comet(route, t, visibility);
      }
    });
    bursts = bursts.filter((b) => clock - b.at < 5.5);
    bursts.forEach((b) => {
      routes.forEach((route, i) => {
        const t =
          (clock - b.at) * 0.48 - (i % 3) * 0.11 - (route.input ? 0 : 1.1);
        comet(route, t, 0.95 * q, 0.14);
      });
    });
  }
  function drawGlyph(index, q) {
    // Abstract micro-interfaces: no invented data, labels or software claims.
    const ink = color(palette.silver, 0.64),
      dim = '#66706f80';
    const active =
      index === 5
        ? blend(palette.mint, palette.amber, 0.35)
        : index > 2
          ? palette.mint
          : palette.cyan;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.3;
    if (index === 0) {
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) {
          const p = (r * 3 + c) / 9,
            lit =
              q * (0.24 + 0.76 * (Math.sin(clock * 2.2 - p * 6) * 0.5 + 0.5));
          roundRect(ctx, -13 + c * 10, -13 + r * 10, 6, 6, 1.3);
          ctx.fillStyle = color(
            blend(palette.silver, active, q),
            0.3 + lit * 0.58,
          );
          ctx.fill();
        }
    } else if (index === 1) {
      // Two interleaved sheets become aligned records.
      ctx.strokeStyle = dim;
      roundRect(ctx, -15, -16, 23, 25, 3);
      ctx.stroke();
      ctx.fillStyle = '#252b2b';
      roundRect(ctx, -8, -10, 24, 28, 3);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.stroke();
      for (let r = 0; r < 3; r++) {
        line(
          { x: -2, y: -2 + r * 6 },
          { x: 10 - (r === 2 ? 4 : 0), y: -2 + r * 6 },
          color(blend(palette.silver, active, q), 0.44 + 0.2 * q),
        );
      }
    } else if (index === 2) {
      ctx.strokeStyle = ink;
      for (let r = 0; r < 3; r++) {
        const y = -9 + r * 9;
        ctx.beginPath();
        ctx.ellipse(0, y, 15, 5, 0, 0, TAU);
        ctx.stroke();
        if (r < 2) {
          line({ x: -15, y }, { x: -15, y: y + 9 }, dim);
          line({ x: 15, y }, { x: 15, y: y + 9 }, dim);
        }
      }
      circle(9, 10, 1.5, color(active, q * 0.9));
    } else if (index === 3) {
      ctx.strokeStyle = dim;
      ctx.lineWidth = 1;
      line({ x: -17, y: 16 }, { x: 17, y: 16 }, dim);
      for (let j = 0; j < 5; j++) {
        const targetH = [8, 15, 12, 24, 30][j];
        const pulse = reduced ? 0 : Math.sin(clock * 1.7 + j * 0.7) * 2 * q;
        const barH = mix([8, 22, 11, 6, 13][j], targetH, q) + pulse;
        ctx.fillStyle = color(
          blend(palette.silver, active, q * 0.5),
          0.38 + j * 0.08,
        );
        roundRect(ctx, -16 + j * 7, 13 - barH, 4, barH, 1.4);
        ctx.fill();
      }
    } else if (index === 4) {
      for (let r = 0; r < 3; r++) {
        const y = -11 + r * 11;
        ctx.strokeStyle = dim;
        roundRect(ctx, -16, y - 3, 6, 6, 1.5);
        ctx.stroke();
        if (q > 0.2) {
          ctx.strokeStyle = color(active, q * 0.7);
          ctx.beginPath();
          ctx.moveTo(-15, y);
          ctx.lineTo(-13, y + 2);
          ctx.lineTo(-9, y - 2);
          ctx.stroke();
        }
        line(
          { x: -4, y },
          { x: 15 - (r === 2 ? 6 : 0), y },
          color(palette.silver, 0.46),
        );
      }
    } else {
      ctx.strokeStyle = dim;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = color(active, 0.15 + 0.5 * q);
      ctx.beginPath();
      const start = reduced ? -PI / 2 : clock * 0.35 * q - PI / 2;
      ctx.arc(0, 0, 15, start, start + TAU * (0.2 + 0.58 * q));
      ctx.stroke();
      ctx.strokeStyle = color(palette.silver, 0.64);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(-1, 4);
      ctx.lineTo(6, -5);
      ctx.stroke();
    }
  }
  function drawNode(n) {
    const p = nodePosition(n),
      local = ease(clamp((progress - 0.12 - n.index * 0.025) / 0.71));
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    // Real edge, underside, face and recessed icon — no flat UI card.
    ctx.save();
    ctx.shadowColor = 'rgba(20,35,34,.22)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 10;
    roundRect(ctx, -32, -30, 64, 66, 17);
    ctx.fillStyle = '#070909';
    ctx.fill();
    ctx.restore();
    const bevel = ctx.createLinearGradient(-25, -32, 28, 32);
    bevel.addColorStop(0, '#697271');
    bevel.addColorStop(0.25, '#333a3a');
    bevel.addColorStop(0.7, '#1a2021');
    bevel.addColorStop(1, '#4d5554');
    roundRect(ctx, -32, -32, 64, 64, 17);
    ctx.fillStyle = bevel;
    ctx.fill();
    const face = ctx.createLinearGradient(-20, -32, 24, 35);
    face.addColorStop(0, '#313837');
    face.addColorStop(0.5, '#202628');
    face.addColorStop(1, '#14191a');
    roundRect(ctx, -31, -31, 62, 61, 16);
    ctx.fillStyle = face;
    ctx.fill();
    ctx.strokeStyle = '#ffffff06';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    drawGlyph(n.index, local);
    // A recessed connector. Once live its state is obvious without a label.
    const port = mobile
      ? { x: 0, y: n.index < 3 ? 32 : -32 }
      : { x: n.index < 3 ? 32 : -32, y: 0 };
    circle(port.x, port.y, 4, '#080b0c');
    const pulse = reduced
      ? 0.85
      : 0.6 + 0.4 * Math.sin(clock * 3 - n.index * 0.7) ** 4;
    circle(port.x, port.y, 1.8, color(palette.cyan, 0.1 + local * pulse * 0.8));
    if (local > 0.1) light(port.x, port.y, 10, palette.cyan, 0.13 * local);
    ctx.restore();
  }
  function drawEcho() {
    if (!wave) return;
    const age = clock - wave.at,
      duration = 1.8;
    if (age > duration) {
      wave = null;
      return;
    }
    const k = clamp(age / duration),
      r = mix(62, Math.max(w, h) * 0.65, k);
    ctx.save();
    ctx.translate(wave.x, wave.y);
    ctx.scale(1, mobile ? 1 : 0.73);
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = color(
      wave.on ? palette.cyan : palette.silver,
      0.18 * (1 - k) ** 2,
    );
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  function render() {
    const began = performance.now();
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const q = ease(progress);
    updateRoutes();
    drawUnderlay(q);
    drawRoutes(q);
    drawFragments(q);
    drawComets(q);
    drawEcho();
    nodes.forEach((n) => drawNode(n));
    frames++;
    frameCost = performance.now() - began;
  }
  function needsFrames() {
    return visible && !document.hidden && !paused && !reduced;
  }
  function tick(now) {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    if (needsFrames()) {
      clock += dt;
      const phase = clamp((clock - transition.at) / 2.65);
      progress = mix(transition.from, transition.to, ease(phase));
      if (phase === 1) progress = target;
      render();
      // Idle motion is deliberately quiet; the active circuit never times out.
      raf = requestAnimationFrame(tick);
    }
  }
  function wake() {
    if (needsFrames() && !raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }
  function setPower(on) {
    target = on ? 1 : 0;
    transition = { at: clock, from: progress, to: target };
    host.dataset.state = on ? 'on' : 'off';
    power.setAttribute('aria-checked', String(on));
    power.setAttribute(
      'aria-label',
      on ? 'Desconectar o circuito' : 'Conectar o circuito',
    );
    wave = { x: center.x, y: center.y, at: clock, on };
    motion.hidden = false;
    if (paused || reduced) {
      progress = target;
      wave = null;
      render();
    } else wake();
    status.textContent = on
      ? 'Circuito conectado. Os sinais circulam continuamente.'
      : 'Circuito desconectado. As peças estão dispersas.';
  }
  function updatePauseButton() {
    motion.setAttribute('aria-pressed', String(paused));
    motion.setAttribute(
      'aria-label',
      paused ? 'Retomar animação' : 'Pausar animação',
    );
    host.dataset.paused = String(paused);
  }
  power.addEventListener('click', () => setPower(!target));
  motion.addEventListener('click', () => {
    // A visitor requesting reduced motion still gets instantaneous state changes;
    // motion can be explicitly enabled with this separate control.
    if (reduced) {
      reduced = false;
      paused = false;
    } else paused = !paused;
    updatePauseButton();
    if (paused) stop();
    else wake();
    status.textContent = paused
      ? 'Animação pausada.'
      : 'Animação em movimento.';
  });
  host.addEventListener(
    'pointermove',
    (event) => {
      if (!finePointer.matches || reduced) return;
      const r = host.getBoundingClientRect();
      pointer = {
        x: (event.clientX - r.left) / scale,
        y: (event.clientY - r.top) / scale,
        inside: true,
      };
    },
    { passive: true },
  );
  host.addEventListener(
    'pointerleave',
    () => {
      pointer.inside = false;
    },
    { passive: true },
  );
  host.addEventListener('click', (event) => {
    if (event.target.closest('button')) return;
    if (!target) {
      setPower(true);
      return;
    }
    const r = host.getBoundingClientRect();
    if (!paused && !reduced) {
      wave = {
        x: (event.clientX - r.left) / scale,
        y: (event.clientY - r.top) / scale,
        at: clock,
        on: true,
      };
      bursts.push({ at: clock });
      if (bursts.length > 3) bursts.shift();
      wake();
    }
  });
  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) wake();
        else stop();
      },
      { threshold: 0.01 },
    );
    visibility.observe(host);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else wake();
  });
  reducedQuery.addEventListener('change', (event) => {
    reduced = event.matches;
    paused = reduced;
    progress = target;
    wave = null;
    updatePauseButton();
    if (reduced) {
      stop();
      render();
    } else wake();
  });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(host);
  else window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', wake);
  if (reduced) {
    paused = true;
    motion.hidden = false;
    updatePauseButton();
  }
  resize();
  host.dataset.ready = 'true';
  motion.hidden = false;
  // Read-only local diagnostics for reproducible QA. No user data or network.
  Object.defineProperty(host, 'signalDebug', {
    value: () =>
      Object.freeze({
        frames,
        clock,
        progress,
        target,
        paused,
        reduced,
        visible,
        scheduled: !!raf,
        frameCostMs: frameCost,
        routeCount: routes.length,
        fragmentCount: fragments.length,
        burstCount: bursts.length,
      }),
    enumerable: false,
  });
}
