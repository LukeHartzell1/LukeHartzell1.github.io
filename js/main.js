/* Page behaviour: reveals, nav, counters, the holo card, the experience
   scroll story, 8-bit mode, and booting the 3D engine. Works on the case-study
   pages too (anything missing is simply skipped). */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode is fine */ } },
};

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

/* ---------- reveal on scroll ---------- */
const revealIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    }
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
$$('[data-reveal]').forEach((el) => revealIO.observe(el));
requestAnimationFrame(() => requestAnimationFrame(() => $('.hero')?.classList.add('is-in')));

/* ---------- counters ---------- */
const countIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    countIO.unobserve(e.target);
    const el = e.target;
    const to = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    if (reduced) { el.textContent = to.toFixed(dec); continue; }
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 1500);
      el.textContent = (to * (1 - Math.pow(1 - k, 4))).toFixed(dec);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}, { threshold: 0.6 });
$$('[data-count]').forEach((el) => countIO.observe(el));

/* ---------- nav: scrolled state, scroll-spy pill, mobile sheet ---------- */
const nav = $('#nav');
const links = $$('.nav__links a').filter((a) => a.getAttribute('href').startsWith('#'));
const pill = $('.nav__pill');
const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
function movePill(a) {
  if (!pill) return;
  if (!a) { pill.style.opacity = '0'; return; }
  pill.style.opacity = '1';
  pill.style.width = `${a.offsetWidth}px`;
  pill.style.transform = `translateX(${a.offsetLeft}px)`;
}
let spyRaf = 0;
function spy() {
  spyRaf = 0;
  nav?.classList.toggle('is-scrolled', window.scrollY > 12);
  const y = window.innerHeight * 0.38;
  let current = null;
  sections.forEach((sec, i) => { if (sec.getBoundingClientRect().top <= y) current = links[i]; });
  links.forEach((a) => a.classList.toggle('is-active', a === current));
  movePill(current);
  // Each section tints the page background a little differently.
  const wash = current ? current.getAttribute('href').slice(1) : 'top';
  if (root.dataset.section !== wash) root.dataset.section = wash;
}
window.addEventListener('scroll', () => { if (!spyRaf) spyRaf = requestAnimationFrame(spy); }, { passive: true });
window.addEventListener('resize', () => { if (!spyRaf) spyRaf = requestAnimationFrame(spy); });
spy();

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
const hs = $('[data-hscroll]');
if (hs) {
  const track = $('.hscroll__track', hs);
  const bar = $('.hscroll__bar', hs);
  const now = $('[data-proj-now]');
  const slides = $$('.slide', hs);
  const wide = window.matchMedia('(min-width: 961px)');
  let maxX = 0;
  let cur = 0;
  let target = 0;
  let running = false;
  // Invisible snap points (one per slide) so the gallery settles on a project.
  const snaps = [];
  const measure = () => {
    snaps.splice(0).forEach((el) => el.remove());
    if (!wide.matches) {
      hs.style.height = '';
      track.style.transform = '';
      root.classList.remove('has-hsnap');
      return;
    }
    maxX = Math.max(0, track.scrollWidth - window.innerWidth);
    hs.style.height = `${window.innerHeight + maxX}px`;
    const step = slides.length > 1 ? maxX / (slides.length - 1) : 0;
    slides.forEach((_, i) => {
      const el = document.createElement('i');
      el.className = 'hscroll__snap';
      el.setAttribute('aria-hidden', 'true');
      el.style.top = `${Math.round(i * step)}px`;
      hs.appendChild(el);
      snaps.push(el);
    });
    root.classList.toggle('has-hsnap', !reduced);
  };
  const read = () => {
    const r = hs.getBoundingClientRect();
    const span = hs.offsetHeight - window.innerHeight;
    const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    target = p * maxX;
    hs.classList.toggle('is-pinned', r.top <= 1 && r.bottom >= window.innerHeight - 1);
    bar?.style.setProperty('--p', p.toFixed(4));
    if (now) now.textContent = String(Math.min(slides.length, Math.round(p * (slides.length - 1)) + 1)).padStart(2, '0');
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
  measure();
  kick();
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', () => { measure(); kick(); });
  wide.addEventListener?.('change', () => { measure(); kick(); });
  window.addEventListener('load', () => { measure(); kick(); });
}

/* ---------- skills readout ---------- */
const skillNow = $('[data-skill-now]');
document.addEventListener('skill', (e) => { if (skillNow) skillNow.textContent = e.detail; });

/* ---------- case-study pages: reading progress, contents spy, image zoom ---------- */
const progress = $('.progress');
if (progress) {
  let ticking = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.setProperty('--p', max > 0 ? String(Math.min(window.scrollY / max, 1)) : '0');
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
      caption.append(' · ');
      const a = document.createElement('a');
      a.href = btn.dataset.full;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Open full resolution ↗';
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
      Promise.all([document.fonts.load('600 48px Geist'), document.fonts.load('500 48px "Geist Mono"')]),
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

  // Experience: one sticky stage that crossfades between roles as you scroll.
  const xpEl = $('[data-switch="xp"]');
  const roles = $$('.role');
  if (xpEl && roles.length) {
    const cache = new Map();
    const get = (n) => {
      if (!cache.has(n)) cache.set(n, make(n));
      return cache.get(n);
    };
    let ready = false;
    let current = null;
    const badge = $('.xp__badge');
    const badgeText = $('[data-badge]');
    const countNow = $('[data-count-now]');
    const xpNum = $('[data-xp-num]');
    const tg = engine.mount(xpEl, { onFirstVisible: () => { ready = true; pick(true); } });
    const activate = (role) => {
      if (role === current) return;
      current = role;
      roles.forEach((r) => r.classList.toggle('is-active', r === role));
      const n = String(roles.indexOf(role) + 1).padStart(2, '0');
      if (countNow) countNow.textContent = n;
      if (xpNum) {
        xpNum.classList.add('is-swapping');
        setTimeout(() => { xpNum.textContent = n; xpNum.classList.remove('is-swapping'); }, 220);
      }
      if (badge && badgeText) {
        badge.classList.add('is-swapping');
        setTimeout(() => {
          badgeText.textContent = role.dataset.badgeText || '';
          badge.classList.remove('is-swapping');
        }, 220);
      }
      if (ready) tg.show(get(role.dataset.role));
    };
    let raf = 0;
    function pick(force = false) {
      raf = 0;
      const mid = window.innerHeight / 2;
      let best = roles[0];
      let bestD = Infinity;
      for (const r of roles) {
        const b = r.getBoundingClientRect();
        const d = Math.abs(b.top + b.height / 2 - mid);
        if (d < bestD) { bestD = d; best = r; }
      }
      if (force && best === current) {
        tg.show(get(best.dataset.role));
        return;
      }
      activate(best);
    }
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => pick()); }, { passive: true });
    pick();
  }
}
boot3d();
