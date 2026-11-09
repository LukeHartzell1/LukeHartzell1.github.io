/* Page behaviour: the hero's reveal and word reel, the worlds' entrances, the
   nav that takes on the colors of the world under it, the tour of my room, the
   quiz, the holo card, the projects gallery, and booting the 3D engine.
   Works on the case-study pages too (anything missing is simply skipped). */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

/* ---------- hero: the universe, the headline, and the "I'm a ..." reel ----------
   The 3D scene dives in and says 'hero-arrive' as its star ignites. The
   headline then assembles letter by letter and the reel spins, slows, and
   lands on the first word (the planets whirl with it). From then on it rolls
   to the next word every few seconds, and each landing tells the scene which
   planet to bring forward ('hero-role'). Hovering a planet's label picks it. */
const hero = $('.hero');
const iam = $('[data-iam]');
let reel = null;
if (hero) {
  const name = $('.hero__name', hero);
  if (name) {
    const plain = name.textContent.replace(/\s+/g, ' ').trim();
    let k = 0;
    $$('.line', name).forEach((line) => {
      const text = line.textContent.trim();
      line.textContent = '';
      line.setAttribute('aria-hidden', 'true');
      [...text].forEach((ch) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.style.setProperty('--k', String(k++));
        s.textContent = ch;
        line.appendChild(s);
      });
    });
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = plain;
    name.prepend(sr);
  }
}

// Text that decodes itself from noise into place.
function scramble(el, dur = 950) {
  const final = el.textContent;
  const glyphs = '<>/[]{}=+*#01_-';
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const n = Math.floor(final.length * k);
    el.textContent = final.slice(0, n) + [...final.slice(n)]
      .map((c) => (c === ' ' || c === '/' ? c : glyphs[Math.floor(Math.random() * glyphs.length)])).join('');
    if (k < 1) requestAnimationFrame(step);
    else el.textContent = final;
  };
  requestAnimationFrame(step);
}

const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function makeReel(el) {
  const words = $$('.iam__word', el).map((w) => ({ text: w.textContent, cls: w.className }));
  const N = words.length;
  const orbits = $$('[data-orbit]');
  el.textContent = '';
  const win = document.createElement('span');
  win.className = 'reel__win';
  const items = [0, 1, 2, 3].map(() => {
    const it = document.createElement('span');
    it.className = 'reel__item';
    it.appendChild(document.createElement('span'));
    win.appendChild(it);
    return it;
  });
  const meter = document.createElement('span');
  meter.className = 'reel__measure';
  words.forEach((w) => {
    const m = document.createElement('span');
    m.className = w.cls;
    m.textContent = w.text;
    meter.appendChild(m);
  });
  el.append(win, meter);
  el.classList.add('is-built');

  let widths = [];
  let p = 0; // reel position, in words (k shows words[k mod N])
  let cur = 0;
  let wide = false; // full width while spinning through every word
  let busy = false;
  let landed = false;
  let held = false;
  const wordAt = (k) => ((k % N) + N) % N;
  const measure = () => { widths = [...meter.children].map((m) => m.getBoundingClientRect().width); };
  const setWidth = () => {
    if (!widths.length) return;
    el.style.setProperty('--w', `${(wide ? Math.max(...widths) : widths[cur]).toFixed(1)}px`);
  };
  const render = () => {
    const base = Math.floor(p) - 1;
    items.forEach((it, j) => {
      const k = base + j;
      if (it.__k !== k) {
        it.__k = k;
        const w = words[wordAt(k)];
        it.firstChild.className = w.cls;
        it.firstChild.textContent = w.text;
      }
      it.style.transform = `translate3d(0, ${((k - p) * 100).toFixed(3)}%, 0)`;
      it.classList.toggle('is-cur', k === Math.round(p));
    });
  };
  const announce = (i) => {
    cur = i;
    orbits.forEach((a) => a.classList.toggle('is-on', Number(a.dataset.orbit) === i));
    window.__heroRole = i;
    window.dispatchEvent(new CustomEvent('hero-role', { detail: i }));
  };
  // Roll to position `to`: decelerate past it a touch, then settle back.
  const roll = (to, dur, overshoot, done) => {
    if (reduced || dur <= 0) {
      p = to;
      render();
      done?.();
      return;
    }
    const p0 = p;
    const t0 = performance.now();
    let lastT = t0;
    let lastP = p0;
    busy = true;
    el.classList.remove('is-settled');
    const tick = (now) => {
      const u = Math.min(1, (now - t0) / dur);
      const A = 0.84;
      p = u < A
        ? p0 + (to - p0 + overshoot) * (1 - Math.pow(1 - u / A, 4))
        : to + overshoot * (1 - easeIO((u - A) / (1 - A)));
      const vel = Math.abs(p - lastP) / Math.max(0.001, (now - lastT) / 1000);
      lastT = now;
      lastP = p;
      win.style.filter = vel > 2 ? `blur(${Math.min(4.5, vel * 0.16).toFixed(2)}px)` : '';
      window.dispatchEvent(new CustomEvent('hero-spin', { detail: Math.min(1, vel / 16) }));
      render();
      if (u < 1) {
        requestAnimationFrame(tick);
        return;
      }
      p = to;
      render();
      win.style.filter = '';
      busy = false;
      el.classList.add('is-settled');
      window.dispatchEvent(new CustomEvent('hero-spin', { detail: 0 }));
      done?.();
    };
    requestAnimationFrame(tick);
  };
  const land = () => {
    landed = true;
    wide = false;
    announce(wordAt(Math.round(p)));
    setWidth();
    hero?.classList.add('is-landed');
    window.__heroLanded = true;
    window.dispatchEvent(new Event('hero-landed'));
  };
  const step = (to, dur) => {
    const i = wordAt(to);
    cur = i;
    setWidth();
    announce(i);
    roll(to, dur, 0.08);
  };
  measure();
  setWidth();
  render();
  el.classList.add('is-settled');
  document.fonts?.ready.then(() => { measure(); setWidth(); });
  window.addEventListener('resize', () => { measure(); setWidth(); });

  // The rest of the time: one word every few seconds while it's on screen.
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(el);
  if (!reduced) {
    setInterval(() => {
      if (landed && visible && !held && !busy && !document.hidden) step(Math.round(p) + 1, 760);
    }, 2600);
  }
  orbits.forEach((a) => {
    const pick = () => {
      if (!landed) return;
      held = true;
      const ahead = wordAt(Number(a.dataset.orbit) - cur);
      if (ahead) step(Math.round(p) + ahead, 420 + ahead * 110);
    };
    a.addEventListener('mouseenter', pick);
    a.addEventListener('focus', pick);
    a.addEventListener('mouseleave', () => { held = false; });
    a.addEventListener('blur', () => { held = false; });
  });

  return {
    // The opening spin: three times round, then the first word.
    spin(delay) {
      if (reduced || delay < 0) {
        land();
        return;
      }
      setTimeout(() => {
        wide = true;
        setWidth();
        roll(N * 3, 2700, 0.24, land);
      }, delay);
    },
  };
}
if (iam) reel = makeReel(iam);

if (hero) {
  let revealed = false;
  const reveal = (instant = false) => {
    if (revealed) return;
    revealed = true;
    window.__heroRevealed = true;
    hero.classList.add('is-revealed');
    const role = $('[data-scramble]', hero);
    if (role && !reduced && !instant) scramble(role);
    reel?.spin(instant ? -1 : 650);
  };
  // Arriving mid-page (a link or a restored scroll) skips the opening.
  const deep = (location.hash && location.hash !== '#top') || window.scrollY > window.innerHeight * 0.3;
  if (reduced || deep) {
    window.__heroSkip = true;
    reveal(true);
  }
  window.addEventListener('hero-arrive', () => reveal());
  // If the 3D never starts (or is slow to), show the page anyway.
  let introAt = 0;
  window.addEventListener('hero-intro', () => { introAt = performance.now(); });
  setTimeout(() => { if (!introAt) reveal(true); }, 4200);
  setTimeout(() => reveal(), 9000);
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
  nav.classList.toggle('is-clear', el.hasAttribute('data-nav-clear'));
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
  root.classList.toggle('menu-open', open);
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

/* ---------- about: a tour of my room ----------
   The markers in the 3D room are tabs. Each opens a line of my story in the
   caption, typed out like game dialogue, and the scene lights that spot up.
   Until someone picks a spot, the room gives itself a slow tour (it pauses
   while the pointer is over the room). */
const roomEl = $('.room');
if (roomEl) {
  const tabs = $$('.spot', roomEl);
  const panels = $$('.say__panel', roomEl);
  const say = $('[data-say]', roomEl);
  const count = $('.say__count', roomEl);
  const N = tabs.length;
  const texts = panels.map((p) => $('.say__text', p)?.textContent.trim() || '');
  let at = 0;
  let typer = 0;
  let touring = !reduced;
  let tourTimer = 0;
  let inView = false;
  let hovering = false;
  let built = false;
  const typeOut = (el, full) => {
    clearInterval(typer);
    if (!el) return;
    if (reduced) {
      el.textContent = full;
      return;
    }
    // Keep the untyped rest in place (transparent) so the box never jumps.
    const on = document.createElement('span');
    const off = document.createElement('span');
    off.className = 'tw-off';
    el.replaceChildren(on, off);
    let n = 0;
    const draw = () => { on.textContent = full.slice(0, n); off.textContent = full.slice(n); };
    draw();
    typer = setInterval(() => {
      n = Math.min(full.length, n + 2);
      draw();
      if (n >= full.length) {
        clearInterval(typer);
        el.textContent = full;
      }
    }, 18);
  };
  const schedule = () => {
    clearTimeout(tourTimer);
    say.classList.remove('is-touring');
    if (!touring || !built) return;
    const ms = panels[at].classList.contains('say__panel--list') ? 8000 : Math.max(5200, 2400 + texts[at].length * 40);
    say.style.setProperty('--dwell', `${ms}ms`);
    void say.offsetWidth; // restart the progress bar
    say.classList.add('is-touring');
    tourTimer = setTimeout(() => {
      if (inView && !hovering && !document.hidden) open(at + 1);
      else schedule();
    }, ms);
  };
  function open(i, { focus = false } = {}) {
    at = ((i % N) + N) % N;
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', String(k === at));
      t.tabIndex = k === at ? 0 : -1;
    });
    panels.forEach((p, k) => { p.hidden = k !== at; });
    say.style.setProperty('--c', tabs[at].style.getPropertyValue('--c'));
    if (count) count.textContent = `${at + 1} / ${N}`;
    window.__roomSpot = at;
    window.dispatchEvent(new CustomEvent('room-focus', { detail: at }));
    const panel = panels[at];
    if (panel.classList.contains('say__panel--list')) {
      clearInterval(typer);
      $$('li', panel).forEach((li, k) => li.style.setProperty('--k', String(k)));
      panel.classList.add('is-typing');
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('is-typing')));
    } else {
      typeOut($('.say__text', panel), texts[at]);
    }
    if (focus) tabs[at].focus();
    schedule();
  }
  const choose = (i, o) => {
    touring = false;
    open(i, o);
  };
  tabs.forEach((t, k) => t.addEventListener('click', () => choose(k)));
  $('.spots', roomEl)?.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) {
      e.preventDefault();
      choose(at + step, { focus: true });
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      choose(e.key === 'Home' ? 0 : N - 1, { focus: true });
    }
  });
  $('[data-say-prev]', roomEl)?.addEventListener('click', () => choose(at - 1));
  $('[data-say-next]', roomEl)?.addEventListener('click', () => choose(at + 1));
  window.addEventListener('room-pick', (e) => choose(Number(e.detail)));
  const view = $('.room__view', roomEl);
  view?.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') hovering = true; });
  view?.addEventListener('pointerleave', () => { hovering = false; });
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: 0.3 }).observe(roomEl);
  const start = () => {
    if (built) return;
    built = true;
    roomEl.classList.add('is-built');
    open(at);
  };
  window.addEventListener('room-built', start);
  // Without the 3D room (or if it's slow to build), the tour starts anyway.
  whenOn(roomEl.closest('.band'), () => setTimeout(start, root.classList.contains('no-webgl') ? 0 : 6500));
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
    if (fb) fb.textContent = right ? (q.dataset.yes || 'Yes!') : (q.dataset.no || 'Not quite. Try again.');
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
  // Scenes that draw text wait (briefly) for the fonts; the hero doesn't.
  const fontsReady = Promise.race([
    Promise.all([
      document.fonts.load('600 48px Archivo'),
      document.fonts.load('800 48px Archivo'),
      document.fonts.load('500 48px "IBM Plex Mono"'),
    ]).catch(() => {}),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  let mods;
  try {
    mods = await Promise.all([import('./engine.js'), import('./scenes/index.js')]);
  } catch (err) {
    console.warn('[luke] 3D failed to load, keeping the static page.', err);
    root.classList.add('no-webgl');
    window.dispatchEvent(new Event('hero-arrive'));
    return;
  }
  const [{ createEngine }, { registry }] = mods;
  const engine = createEngine();
  if (!engine) {
    root.classList.add('no-webgl');
    window.dispatchEvent(new Event('hero-arrive'));
    return;
  }
  window.__luke = engine;
  const make = (name) => {
    try { return registry[name]?.(engine.envMap) || null; } catch (err) { console.error(`[luke] scene "${name}" failed`, err); return null; }
  };
  let planeInst = null;
  const mountAll = (els) => els.forEach((el) => {
    engine.mount(el, {
      onFirstVisible: (tg) => {
        const inst = make(el.dataset.scene);
        if (!inst) return;
        tg.show(inst);
        if (el.dataset.scene === 'plane') planeInst = inst;
      },
    });
  });
  const stages = $$('.stage[data-scene]');
  mountAll(stages.filter((el) => el.dataset.scene === 'hero'));
  await fontsReady;
  mountAll(stages.filter((el) => el.dataset.scene !== 'hero'));
  $$('[data-send]').forEach((b) => b.addEventListener('click', () => planeInst?.launch?.()));
}
boot3d();
