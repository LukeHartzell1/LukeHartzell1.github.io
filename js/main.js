/* Page behaviour: the hero's lights-up moment, the worlds' entrances, the nav
   that takes on the colors of the world under it, the RPG dialogue, the quiz,
   the holo card, the projects gallery, 8-bit mode, and booting the 3D engine.
   Works on the case-study pages too (anything missing is simply skipped). */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode is fine */ } },
};
// Entrance sequences only run when motion is welcome (and only once js is
// here to finish them), so nothing is ever left hidden.
if (!reduced) root.classList.add('steps');

$$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

/* ---------- toast ---------- */
const toastEl = $('.toast');
let toastTimer = 0;
function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
}

/* ---------- hero: the lights come up once the page has painted ---------- */
requestAnimationFrame(() => requestAnimationFrame(() => $('.hero')?.classList.add('is-in')));

/* ---------- hero: "I'm a ..." cycles through worlds ----------
   Each word is styled like its world; the 3D scene hears 'hero-role' and swings
   the matching miniature to the front. Hovering the "In orbit" legend picks one. */
const iam = $('[data-iam]');
if (iam) {
  const words = $$('.iam__word', iam);
  const legend = $$('[data-legend]');
  let at = -1;
  let held = false;
  const show = (i) => {
    if (i === at) return;
    const prev = words[at];
    at = i;
    words.forEach((w, k) => {
      w.classList.toggle('is-on', k === i);
      w.classList.toggle('is-off', w === prev);
    });
    legend.forEach((a) => a.classList.toggle('is-on', Number(a.dataset.legend) === i));
    window.__heroRole = i;
    window.dispatchEvent(new CustomEvent('hero-role', { detail: i }));
  };
  show(0);
  if (!reduced) {
    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(iam);
    setInterval(() => { if (visible && !held && !document.hidden) show((at + 1) % words.length); }, 2600);
  }
  legend.forEach((a) => {
    const pick = () => { held = true; show(Number(a.dataset.legend)); };
    a.addEventListener('mouseenter', pick);
    a.addEventListener('focus', pick);
    a.addEventListener('mouseleave', () => { held = false; });
    a.addEventListener('blur', () => { held = false; });
  });
}

/* ---------- worlds: number the steps, play each entrance once ---------- */
const onEnter = new Map(); // element -> callbacks to run when it first turns on
function whenOn(el, fn) {
  if (!el) return;
  if (el.classList.contains('is-on')) { fn(); return; }
  if (!onEnter.has(el)) onEnter.set(el, []);
  onEnter.get(el).push(fn);
}
const worlds = $$('.band, .slide');
worlds.forEach((w) => $$('[data-step]', w).forEach((el, i) => el.style.setProperty('--i', String(i))));
const turnOn = (w) => {
  if (w.classList.contains('is-on')) return;
  w.classList.add('is-on');
  (onEnter.get(w) || []).forEach((fn) => fn());
  onEnter.delete(w);
};
const worldIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    if (e.intersectionRatio >= 0.28 || e.intersectionRect.height >= window.innerHeight * 0.5) {
      turnOn(e.target);
      worldIO.unobserve(e.target);
    }
  }
}, { threshold: [0, 0.15, 0.28, 0.5] });
worlds.forEach((w) => worldIO.observe(w));

/* ---------- nav: active section, tint from the world underneath ---------- */
const nav = $('#nav');
const links = $$('.nav__links a').filter((a) => a.getAttribute('href').startsWith('#'));
const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
const bands = $$('[data-band]');
const themeMeta = $('meta[name="theme-color"]');
const hs = $('[data-hscroll]');
let tintedBy = null;
function tint(el) {
  if (!nav || !el || el === tintedBy) return;
  tintedBy = el;
  const cs = getComputedStyle(el);
  const bg = cs.getPropertyValue('--band-bg').trim() || '#EDEDEA';
  nav.style.setProperty('--nav-bg', bg);
  nav.style.setProperty('--nav-fg', cs.getPropertyValue('--band-fg').trim() || '#111114');
  nav.style.setProperty('--nav-accent', cs.getPropertyValue('--band-accent').trim() || '#FF5A2C');
  themeMeta?.setAttribute('content', bg);
}
let spyRaf = 0;
function spy() {
  spyRaf = 0;
  const y = window.innerHeight * 0.38;
  let current = null;
  sections.forEach((sec, i) => { if (sec.getBoundingClientRect().top <= y) current = links[i]; });
  links.forEach((a) => a.classList.toggle('is-active', a === current));
  if (!bands.length) return;
  const probe = (nav?.offsetHeight || 60) / 2;
  let under = bands[0];
  for (const b of bands) {
    const r = b.getBoundingClientRect();
    if (r.top <= probe && r.bottom > probe) under = b;
  }
  // The pinned gallery is many worlds side by side: use the one on screen.
  if (under === hs && hs.currentSlide) under = hs.currentSlide;
  tint(under);
}
window.addEventListener('scroll', () => { if (!spyRaf) spyRaf = requestAnimationFrame(spy); }, { passive: true });
window.addEventListener('resize', () => { tintedBy = null; if (!spyRaf) spyRaf = requestAnimationFrame(spy); });

const menuBtn = $('.nav__menu');
const sheet = $('#sheet');
function setMenu(open) {
  if (!menuBtn || !sheet) return;
  menuBtn.setAttribute('aria-expanded', String(open));
  sheet.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
}
menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
sheet?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

/* ---------- copy email ---------- */
$$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  const text = b.dataset.copy;
  try {
    await navigator.clipboard.writeText(text);
    toast('Email copied. Talk soon!');
  } catch {
    window.prompt('Copy my email:', text);
  }
}));

/* ---------- about: an RPG dialogue box ---------- */
const dialog = $('[data-dialog]');
if (dialog) {
  const lines = $$('[data-line]', dialog);
  const page = $('.dialog__page', dialog);
  const next = $('.dialog__next', dialog);
  const texts = lines.map((p) => p.textContent.trim());
  let at = 0;
  let timer = 0;
  let typing = false;
  const show = (i, animate) => {
    clearInterval(timer);
    at = i;
    lines.forEach((p, k) => { p.hidden = k !== i; });
    if (page) page.textContent = `${i + 1}/${lines.length}`;
    const p = lines[i];
    const full = texts[i];
    if (!animate || reduced) {
      p.textContent = full;
      typing = false;
      dialog.classList.add('is-waiting');
      return;
    }
    // Type it out, keeping the untyped rest in place (transparent) so the
    // box never changes size mid-sentence.
    typing = true;
    dialog.classList.remove('is-waiting');
    const on = document.createElement('span');
    const off = document.createElement('span');
    off.className = 'tw-off';
    p.replaceChildren(on, off);
    let n = 0;
    const draw = () => { on.textContent = full.slice(0, n); off.textContent = full.slice(n); };
    draw();
    timer = setInterval(() => {
      n = Math.min(full.length, n + 2);
      draw();
      if (n >= full.length) { clearInterval(timer); typing = false; p.textContent = full; dialog.classList.add('is-waiting'); }
    }, 16);
  };
  show(0, false);
  whenOn(dialog.closest('.band'), () => show(0, true));
  next?.addEventListener('click', () => {
    if (typing) { clearInterval(timer); typing = false; lines[at].textContent = texts[at]; dialog.classList.add('is-waiting'); return; }
    show((at + 1) % lines.length, true);
  });
}

/* ---------- counters (the creator stats) ---------- */
$$('[data-count]').forEach((el) => {
  const to = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  if (reduced) return;
  el.textContent = `0${suffix}`;
  whenOn(el.closest('.band, .slide'), () => {
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 1400);
      el.textContent = `${Math.round(to * (1 - Math.pow(1 - k, 4)))}${suffix}`;
      if (k < 1) requestAnimationFrame(tick);
    };
    setTimeout(() => requestAnimationFrame(tick), 250);
  });
});

/* ---------- tutoring: a one-question quiz ---------- */
$$('[data-quiz]').forEach((q) => {
  const fb = $('.quiz__fb', q);
  const buttons = $$('button[data-answer]', q);
  buttons.forEach((b) => b.addEventListener('click', () => {
    const right = b.dataset.answer === 'yes';
    buttons.forEach((x) => x.classList.remove('is-wrong'));
    b.classList.add(right ? 'is-right' : 'is-wrong');
    if (fb) fb.textContent = right ? 'Yes. Each step cuts the search space in half.' : 'Not quite. Think about what each comparison rules out.';
  }));
});

/* ---------- holo trading card ---------- */
const holo = $('.holo');
if (holo) {
  let hovering = false;
  const set = (x, y, o) => {
    holo.style.setProperty('--rx', `${((x - 0.5) * 26).toFixed(2)}deg`);
    holo.style.setProperty('--ry', `${((0.5 - y) * 22).toFixed(2)}deg`);
    holo.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    holo.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    holo.style.setProperty('--o', o.toFixed(2));
  };
  holo.addEventListener('pointermove', (e) => {
    if (reduced) return;
    const r = holo.getBoundingClientRect();
    hovering = true;
    holo.classList.add('is-tilting');
    set((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, 1);
  });
  holo.addEventListener('pointerleave', () => {
    hovering = false;
    holo.classList.remove('is-tilting');
    set(0.5, 0.4, 0);
  });
  holo.addEventListener('click', () => {
    holo.setAttribute('aria-pressed', String(holo.getAttribute('aria-pressed') !== 'true'));
  });
  // A slow idle shimmer so the foil catches the light even on phones.
  if (!reduced) {
    let visible = false;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(holo);
    const idle = (now) => {
      requestAnimationFrame(idle);
      if (!visible || hovering) return;
      const t = now / 1000;
      set(0.5 + Math.sin(t * 0.6) * 0.18, 0.42 + Math.cos(t * 0.45) * 0.12, 0.38);
    };
    requestAnimationFrame(idle);
  }
}

/* ---------- 8-bit mode (button, footer link, or the Konami code) ---------- */
let engine = null;
function setPixel(on, announce = true) {
  root.classList.toggle('pixel', on);
  $$('[data-8bit]').forEach((b) => b.setAttribute('aria-pressed', String(on)));
  store.set('lh-8bit', on ? '1' : '0');
  engine?.setPixel(on);
  if (announce) toast(on ? '8-bit mode on. Every scene is now pixel art.' : 'Back to full resolution.');
}
setPixel(root.classList.contains('pixel'), false);
$$('[data-8bit]').forEach((b) => b.addEventListener('click', () => setPixel(!root.classList.contains('pixel'))));
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let kAt = 0;
document.addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  kAt = k === KONAMI[kAt] ? kAt + 1 : (k === KONAMI[0] ? 1 : 0);
  if (kAt === KONAMI.length) {
    kAt = 0;
    setPixel(!root.classList.contains('pixel'));
  }
});

/* ---------- projects: vertical scroll drives a horizontal gallery ---------- */
if (hs) {
  const pin = $('.hscroll__pin', hs);
  const track = $('.hscroll__track', hs);
  const bar = $('.hscroll__bar', hs);
  const now = $('[data-proj-now]');
  const slides = $$('.slide', hs);
  const wide = window.matchMedia('(min-width: 961px) and (min-height: 621px)');
  const n = slides.length;
  // Each project holds still for a stretch of scrolling, then the track
  // glides to the next one, so a project's words and sculpture always arrive
  // together. HOLD is the share of each step spent holding.
  const HOLD = 0.3;
  let slideW = 0;
  let cur = 0;
  let target = 0;
  let running = false;
  let settleTimer = 0;
  hs.currentSlide = slides[0] || null;
  const span = () => hs.offsetHeight - window.innerHeight;
  const measure = () => {
    if (!wide.matches) {
      hs.style.height = '';
      track.style.transform = '';
      return;
    }
    slideW = slides[0]?.offsetWidth || window.innerWidth;
    hs.style.height = `${window.innerHeight + slideW * Math.max(0, n - 1)}px`;
  };
  // How far through the gallery the page has scrolled, in slides (0..n-1).
  const progress = () => {
    const s = span();
    return s > 0 && n > 1 ? Math.min(1, Math.max(0, -hs.getBoundingClientRect().top / s)) * (n - 1) : 0;
  };
  // Scroll progress -> track position: hold, ease across, hold.
  const shape = (u) => {
    if (n < 2) return 0;
    const k = Math.min(n - 2, Math.floor(u));
    const f = u - k;
    const a = HOLD / 2;
    if (f <= a) return k;
    if (f >= 1 - a) return k + 1;
    const t = (f - a) / (1 - HOLD);
    return k + t * t * (3 - 2 * t);
  };
  const setSlide = (i) => {
    const s = slides[i];
    if (!s || s === hs.currentSlide) return;
    hs.currentSlide = s;
    pin?.style.setProperty('--hs-fg', getComputedStyle(s).getPropertyValue('--band-fg').trim() || '#fff');
    if (!spyRaf) spyRaf = requestAnimationFrame(spy);
  };
  const read = () => {
    const r = hs.getBoundingClientRect();
    const u = progress();
    const x = shape(u);
    target = x * slideW;
    hs.classList.toggle('is-pinned', r.top <= 1 && r.bottom >= window.innerHeight - 1);
    bar?.style.setProperty('--p', (n > 1 ? u / (n - 1) : 0).toFixed(4));
    const i = Math.round(x);
    if (now) now.textContent = String(i + 1);
    setSlide(i);
  };
  // If the reader stops scrolling partway through a glide, finish the move
  // in the direction they were going (so a single wheel notch still lands on
  // the next project instead of bouncing back).
  let dir = 1;
  let lastY = window.scrollY;
  let autoUntil = 0; // while the page is scrolling itself, don't second-guess it
  const scrollToY = (top) => {
    autoUntil = performance.now() + 1600;
    window.scrollTo({ top: Math.round(top), behavior: reduced ? 'auto' : 'smooth' });
  };
  const settle = () => {
    if (performance.now() < autoUntil) return;
    if (!wide.matches || n < 2 || !hs.classList.contains('is-pinned')) return;
    const u = progress();
    const k = Math.min(n - 2, Math.floor(u));
    const f = u - k;
    const a = HOLD / 2;
    if (f <= a + 0.005 || f >= 1 - a - 0.005) return;
    const goal = dir > 0 ? k + 1 : k;
    scrollToY(window.scrollY + hs.getBoundingClientRect().top + (goal / (n - 1)) * span());
  };
  const loop = () => {
    if (!wide.matches) { running = false; return; }
    cur = reduced ? target : cur + (target - cur) * 0.12;
    if (Math.abs(target - cur) < 0.1) cur = target;
    track.style.transform = `translate3d(${(-cur).toFixed(2)}px, 0, 0)`;
    if (cur !== target) requestAnimationFrame(loop);
    else running = false;
  };
  const kick = () => {
    if (!wide.matches) return;
    read();
    if (!running) { running = true; requestAnimationFrame(loop); }
  };
  // Links to a project (#p-...) scroll to its place in the gallery.
  const goTo = (i) => {
    if (!wide.matches) { slides[i]?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); return; }
    scrollToY(window.scrollY + hs.getBoundingClientRect().top + (n > 1 ? (i / (n - 1)) * span() : 0));
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#p-"]');
    if (!a) return;
    const i = slides.findIndex((s) => `#${s.id}` === a.getAttribute('href'));
    if (i < 0) return;
    e.preventDefault();
    setMenu(false);
    goTo(i);
    history.replaceState(null, '', a.getAttribute('href'));
  });
  measure();
  kick();
  pin?.style.setProperty('--hs-fg', getComputedStyle(slides[0]).getPropertyValue('--band-fg').trim() || '#fff');
  // Settle once scrolling has actually stopped (momentum included). Browsers
  // without scrollend fall back to a short pause.
  const hasScrollEnd = 'onscrollend' in window;
  if (hasScrollEnd) window.addEventListener('scrollend', () => { autoUntil = 0; settle(); });
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y !== lastY) dir = y > lastY ? 1 : -1;
    lastY = y;
    kick();
    if (!hasScrollEnd) {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 220);
    }
  }, { passive: true });
  window.addEventListener('resize', () => { measure(); kick(); });
  wide.addEventListener?.('change', () => { measure(); kick(); });
  window.addEventListener('load', () => {
    measure();
    kick();
    // Arriving straight at a project link (e.g. /#p-lift) lands on that slide.
    const i = slides.findIndex((s) => `#${s.id}` === location.hash);
    if (i > 0 && wide.matches) goTo(i);
  });
}
spy();

/* ---------- skills readout ---------- */
const skillNow = $('[data-skill-now]');
document.addEventListener('skill', (e) => { if (skillNow) skillNow.textContent = e.detail; });

/* ---------- case-study pages: reading progress, contents spy, image zoom ---------- */
const progressBar = $('.progress');
if (progressBar) {
  let ticking = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.setProperty('--p', max > 0 ? String(Math.min(window.scrollY / max, 1)) : '0');
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}
const tocLinks = $$('.cs-toc a[href^="#"]');
if (tocLinks.length) {
  const map = new Map(tocLinks.map((a) => [a.getAttribute('href').slice(1), a]));
  const tocSpy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      tocLinks.forEach((a) => a.removeAttribute('aria-current'));
      map.get(entry.target.id)?.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) tocSpy.observe(s); });
}
const zoomables = $$('[data-zoom]');
if (zoomables.length) {
  const box = document.createElement('dialog');
  box.className = 'lightbox';
  box.setAttribute('aria-label', 'Image preview');
  box.innerHTML = '<button class="lightbox__close" type="button" aria-label="Close preview">✕</button><img alt=""><p></p>';
  document.body.appendChild(box);
  const big = $('img', box);
  const caption = $('p', box);
  box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('.lightbox__close')) box.close(); });
  zoomables.forEach((btn) => btn.addEventListener('click', () => {
    const img = $('img', btn);
    big.src = btn.dataset.zoom || img.currentSrc || img.src;
    big.alt = img.alt;
    caption.textContent = img.alt;
    if (btn.dataset.full) {
      caption.append(' ');
      const a = document.createElement('a');
      a.href = btn.dataset.full;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Open full resolution';
      caption.appendChild(a);
    }
    box.showModal();
  }));
}

/* ---------- 3D ---------- */
async function boot3d() {
  if (!$('.stage')) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('600 48px Archivo'),
        document.fonts.load('800 48px Archivo'),
        document.fonts.load('500 48px "IBM Plex Mono"'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* fonts are a nicety */ }
  let mods;
  try {
    mods = await Promise.all([import('./engine.js'), import('./scenes/index.js')]);
  } catch (err) {
    console.warn('[luke] 3D failed to load, keeping the static page.', err);
    root.classList.add('no-webgl');
    return;
  }
  const [{ createEngine }, { registry }] = mods;
  engine = createEngine();
  if (!engine) { root.classList.add('no-webgl'); return; }
  engine.setPixel(root.classList.contains('pixel'));
  window.__luke = engine;
  const make = (name) => {
    try { return registry[name]?.(engine.envMap) || null; } catch (err) { console.error(`[luke] scene "${name}" failed`, err); return null; }
  };
  let planeInst = null;
  $$('.stage[data-scene]').forEach((el) => {
    engine.mount(el, {
      onFirstVisible: (tg) => {
        const inst = make(el.dataset.scene);
        if (!inst) return;
        tg.show(inst);
        if (el.dataset.scene === 'plane') planeInst = inst;
      },
    });
  });
  $$('[data-send]').forEach((b) => b.addEventListener('click', () => planeInst?.launch?.()));
}
boot3d();
