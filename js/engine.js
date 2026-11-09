/* One WebGL renderer, many stages.
   Every 3D piece on the page is a "stage": a plain <canvas> that lives in the
   document flow (so it scrolls perfectly with the page). Each frame the shared
   renderer draws a stage's scene into a corner of an offscreen buffer and the
   pixels are copied into that stage's canvas. Only stages near the viewport
   render, and quality adapts to the device. */
import * as THREE from 'three';
import { clamp, damp } from './kit.js';

/* A soft pastel photo studio for reflections: a big white softbox overhead,
   pink and sky panels on the sides, a lilac bounce behind. Every glossy or
   pearly surface on the site picks these up. */
function studio(renderer) {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(24, 16, 24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#e6e8ec').multiplyScalar(0.62), side: THREE.BackSide }),
  );
  scene.add(room);
  const panel = (w, h, hex, k, pos) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(12, 4, '#ffffff', 7, [0, 7.5, 1]);
  panel(5, 9, '#ffe2d4', 3.6, [-10, 1, 3]);
  panel(5, 9, '#bcd3ff', 3.6, [10, 1.5, -2]);
  panel(7, 4, '#ffffff', 4.2, [4, 2.5, 10]);
  panel(8, 4, '#c4d0ff', 2.8, [-3, -0.5, -10]);
  panel(16, 16, '#d8dbe2', 0.9, [0, -7.5, 0]);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(scene, 0.03).texture;
  pm.dispose();
  return tex;
}

export function createEngine() {
  const glCanvas = document.createElement('canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: glCanvas, antialias: true, alpha: true, premultipliedAlpha: true,
      powerPreference: 'high-performance', preserveDrawingBuffer: false,
    });
  } catch (err) {
    console.warn('[luke] WebGL unavailable, showing the static version.', err);
    return null;
  }
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;

  const envMap = studio(renderer);

  const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const smallMQ = window.matchMedia('(max-width: 760px)');
  let reduced = reducedMQ.matches;
  let dprBase = Math.min(window.devicePixelRatio || 1, smallMQ.matches ? 1.6 : 2);
  let quality = 1;

  /* ---------- offscreen buffer ---------- */
  let bufW = 0;
  let bufH = 0;
  function ensure(w, h) {
    if (w <= bufW && h <= bufH) return;
    bufW = Math.max(bufW, Math.ceil(w / 128) * 128);
    bufH = Math.max(bufH, Math.ceil(h / 128) * 128);
    renderer.setSize(bufW, bufH, false);
  }

  function draw(inst, w, h, ctx, alpha) {
    const cam = inst.camera;
    const aspect = w / h;
    if (Math.abs(cam.aspect - aspect) > 1e-4) {
      cam.aspect = aspect;
      cam.updateProjectionMatrix();
      inst.onAspect?.(aspect);
    }
    ensure(w, h);
    renderer.setRenderTarget(null);
    renderer.setViewport(0, 0, w, h);
    renderer.setScissor(0, 0, w, h);
    renderer.setScissorTest(true);
    renderer.clear();
    renderer.render(inst.scene, cam);
    ctx.globalAlpha = alpha;
    ctx.drawImage(glCanvas, 0, bufH - h, w, h, 0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  /* ---------- input ---------- */
  const ptr = { x: -1e4, y: -1e4, nx: 0, ny: 0, touch: false };
  const G = { gx: 0, gy: 0 };
  window.addEventListener('pointermove', (e) => {
    ptr.x = e.clientX;
    ptr.y = e.clientY;
    ptr.touch = e.pointerType === 'touch';
    ptr.nx = (e.clientX / window.innerWidth) * 2 - 1;
    ptr.ny = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  window.addEventListener('pointerdown', (e) => { ptr.touch = e.pointerType === 'touch'; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { ptr.x = -1e4; ptr.y = -1e4; ptr.nx = 0; ptr.ny = 0; });

  /* ---------- stages ---------- */
  const targets = new Set();
  let clock = 0;
  const S = {
    t: 0, time: 0, dt: 0, px: 0, py: 0, hover: false, gx: 0, gy: 0, progress: 0.5,
    reduced: false, aspect: 1, active: true,
  };

  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      const tg = e.target.__stage;
      if (!tg) continue;
      tg.w = e.contentRect.width;
      tg.h = e.contentRect.height;
      size(tg);
    }
  });
  function size(tg) {
    const k = dprBase * quality;
    tg.pw = Math.max(1, Math.round(tg.w * k));
    tg.ph = Math.max(1, Math.round(tg.h * k));
    if (tg.cvs.width !== tg.pw) tg.cvs.width = tg.pw;
    if (tg.cvs.height !== tg.ph) tg.cvs.height = tg.ph;
    tg.dirty = true;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const tg = e.target.__stage;
      if (!tg) continue;
      tg.visible = e.isIntersecting;
      if (tg.visible) {
        tg.dirty = true;
        if (!tg.seen) {
          tg.seen = true;
          tg.onFirstVisible?.(tg);
        }
      }
    }
  }, { rootMargin: '25% 0px 25% 0px' });

  function mount(el, { onFirstVisible } = {}) {
    const cvs = document.createElement('canvas');
    cvs.className = 'stage__canvas';
    cvs.setAttribute('aria-hidden', 'true');
    el.prepend(cvs);
    const tg = {
      el, cvs, ctx: cvs.getContext('2d'), layers: [], visible: false, seen: false, dirty: true,
      w: 0, h: 0, pw: 0, ph: 0, px: 0, py: 0, hover: false, onFirstVisible, rect: null,
      show(inst, { instant = false } = {}) {
        if (!inst) return;
        const top = tg.layers[tg.layers.length - 1];
        if (top && top.inst === inst && top.target === 1) return;
        for (const L of tg.layers) L.target = 0;
        const existing = tg.layers.find((L) => L.inst === inst);
        if (existing) tg.layers.splice(tg.layers.indexOf(existing), 1);
        const first = !tg.layers.length || instant || reduced;
        tg.layers.push({ inst, alpha: first ? 1 : (existing ? existing.alpha : 0), target: 1, t0: null });
        if (!inst.__attached) {
          inst.__attached = true;
          inst.attach?.(tg);
        }
        inst.onShow?.();
        el.classList.add('is-live');
        tg.dirty = true;
      },
      /* Pointer position in normalized device coords for raycasting. */
      ndc(clientX, clientY, out = new THREE.Vector2()) {
        const r = el.getBoundingClientRect();
        return out.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      },
    };
    el.__stage = tg;
    targets.add(tg);
    ro.observe(el);
    io.observe(el);
    return tg;
  }

  function tick(tg, dt) {
    if (!tg.visible || !tg.layers.length || !tg.pw || !tg.ph) return;
    const fading = tg.layers.some((L) => Math.abs(L.alpha - L.target) > 0.002);
    const now = performance.now();
    // Reduced motion draws still frames, refreshed once a second so late textures/fonts appear.
    if (reduced && !tg.dirty && !fading && now - (tg.drawn || 0) < 1000) return;
    tg.drawn = now;

    const r = tg.el.getBoundingClientRect();
    const vh = window.innerHeight;
    const inside = !ptr.touch && ptr.x >= r.left && ptr.x <= r.right && ptr.y >= r.top && ptr.y <= r.bottom;
    const lx = inside ? ((ptr.x - r.left) / r.width) * 2 - 1 : 0;
    const ly = inside ? ((ptr.y - r.top) / r.height) * 2 - 1 : 0;
    tg.px = reduced ? 0 : damp(tg.px, lx, 5, dt);
    tg.py = reduced ? 0 : damp(tg.py, ly, 5, dt);
    tg.hover = inside;

    S.dt = reduced ? 0 : dt;
    S.time = clock;
    S.px = tg.px;
    S.py = tg.py;
    S.hover = inside && !reduced;
    S.gx = reduced ? 0 : G.gx;
    S.gy = reduced ? 0 : G.gy;
    S.progress = clamp((vh - r.top) / (vh + r.height));
    S.reduced = reduced;
    S.aspect = tg.pw / tg.ph;

    tg.ctx.clearRect(0, 0, tg.pw, tg.ph);
    for (let i = 0; i < tg.layers.length; i++) {
      const L = tg.layers[i];
      L.alpha = reduced ? L.target : damp(L.alpha, L.target, 7, dt);
      if (L.target === 0 && L.alpha < 0.004) {
        tg.layers.splice(i--, 1);
        continue;
      }
      if (L.t0 === null) L.t0 = clock;
      S.t = reduced ? (L.inst.posterT ?? 8) : clock - L.t0;
      S.active = L.target === 1;
      L.inst.update?.(S);
      draw(L.inst, tg.pw, tg.ph, tg.ctx, L.alpha);
    }
    tg.dirty = false;
  }

  /* ---------- loop + adaptive quality ---------- */
  let raf = 0;
  let last = performance.now();
  let slow = 0;
  let frames = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!reduced) clock += dt;
    G.gx = damp(G.gx, ptr.nx, 2.5, dt);
    G.gy = damp(G.gy, ptr.ny, 2.5, dt);
    let active = 0;
    for (const tg of targets) {
      if (tg.visible && tg.layers.length) active++;
      tick(tg, dt);
    }
    // If the device can't keep up, render fewer pixels (down to 60%).
    if (active && !reduced) {
      frames++;
      if (dt > 1 / 38) slow++;
      if (frames >= 90) {
        if (slow / frames > 0.5 && quality > 0.62) {
          quality *= 0.86;
          for (const tg of targets) size(tg);
        }
        frames = 0;
        slow = 0;
      }
    }
  }
  function start() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  reducedMQ.addEventListener?.('change', (e) => {
    reduced = e.matches;
    for (const tg of targets) tg.dirty = true;
  });
  glCanvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); });
  glCanvas.addEventListener('webglcontextrestored', () => start());

  start();

  return {
    THREE,
    renderer,
    envMap,
    mount,
    get reduced() { return reduced; },
    /* Jump every scene's clock forward (used by screenshot tests). */
    advance(sec) { clock += sec; },
    get clock() { return clock; },
  };
}
