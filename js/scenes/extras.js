/* Skills keyboard + contact paper plane. */
import {
  THREE, C, M, stage, rig, damp, clamp, lerp, seg, loop, easeOut, easeInOut, easeOutBack,
  rbox, textTex, label, tag, shadow, sparkles, rng,
} from '../kit.js';
import { paperPlane } from './builders.js';

/* ======================================================================
   SKILLS — a pastel keyboard where every keycap is a skill.
   Hover or click keys; typing on your own keyboard presses matching caps.
   ====================================================================== */
export function keyboard(env) {
  const { scene, camera } = stage(env, { fov: 26 });
  const cam = rig(camera, { pos: [0, 8.3, 8.1], look: [0, -0.15, 0.25], fit: 2.1, px: 0.35, py: 0.18 });
  const root = new THREE.Group();
  scene.add(root);
  const base = new THREE.Mesh(rbox(7.9, 0.44, 3.35, 0.22), M.ceramic('#ffffff', { roughness: 0.28 }));
  base.position.y = -0.24;
  const plate = new THREE.Mesh(rbox(7.5, 0.06, 2.95, 0.04), M.ceramic('#E9EBF0'));
  plate.position.y = 0.0;
  root.add(base, plate);
  const L = { lang: '#ffffff', fw: '#EDEFF4', ai: '#E2EAFF', pm: '#FFE9E2', sp: C.violet };
  const rows = [
    [['Java', 'lang'], ['JavaScript', 'lang'], ['Python', 'lang'], ['C', 'lang'], ['SQL', 'lang'], ['HTML/CSS', 'lang'], ['Lua', 'lang'], ['Kotlin', 'lang']],
    [['React', 'fw'], ['Node.js', 'fw'], ['Playwright', 'fw'], ['Cucumber', 'fw'], ['Firebase', 'fw'], ['Bootstrap', 'fw'], ['Git', 'fw'], ['Jira', 'fw']],
    [['AWS', 'ai'], ['Lambda', 'ai'], ['Kinesis', 'ai'], ['Vertex AI', 'ai'], ['Gemini', 'ai'], ['LLMs', 'ai'], ['Figma', 'pm'], ['PRDs', 'pm']],
    [['A/B tests', 'pm', 1.4], ['OKRs', 'pm'], ['Effect House', 'sp', 3.05], ['User research', 'pm', 1.55], ['Agile', 'pm']],
  ];
  const U = 0.86;
  const keys = [];
  rows.forEach((row, r) => {
    const widths = row.map((k) => k[2] || 1);
    const total = widths.reduce((a, b) => a + b, 0) * U;
    let x = -total / 2;
    row.forEach(([name, kind, w = 1]) => {
      const cw = w * U - 0.08;
      const g = new THREE.Group();
      const cap = new THREE.Mesh(rbox(cw, 0.34, U - 0.08, 0.12), kind === 'sp' ? M.gloss(L.sp) : M.ceramic(L[kind], { roughness: 0.26 }));
      const size = kind === 'sp' ? 70 : name.length > 9 ? 40 : name.length > 6 ? 48 : 58;
      const txt = label(textTex(name, { w: Math.round(256 * w), h: 256, size, weight: kind === 'sp' ? 700 : 600, color: kind === 'sp' ? '#ffffff' : C.ink }), cw * 0.94, (U - 0.08) * 0.94);
      txt.rotation.x = -Math.PI / 2;
      txt.position.y = 0.171;
      g.add(cap, txt);
      const z = -1.12 + r * U;
      g.position.set(x + (w * U) / 2, 0.2, z);
      g.userData = { name, press: 0, target: 0, y: 0.2, cap };
      root.add(g);
      keys.push(g);
      x += w * U;
    });
  });
  root.rotation.x = 0.06;
  const floor = shadow(10, 5.4, 0.12);
  floor.position.y = -0.48;
  scene.add(floor);
  const hint = tag('try typing', { size: 40, scale: 1.1 });
  hint.position.set(3.05, 0.95, -1.05);
  scene.add(hint);

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const caps = keys.map((k) => k.userData.cap);
  let hovered = null;
  let tgRef = null;
  const r = rng(3);
  let nextAmbient = 1.5;
  let typed = 0;
  const pressKey = (k, hold = 0.18) => {
    k.userData.target = 1;
    k.userData.until = performance.now() + hold * 1000;
  };
  const pick = (e) => {
    if (!tgRef) return null;
    tgRef.ndc(e.clientX, e.clientY, ndc);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(caps, false)[0];
    return hit ? keys[caps.indexOf(hit.object)] : null;
  };
  return {
    scene, camera, posterT: 2,
    attach(tg) {
      tgRef = tg;
      tg.el.addEventListener('pointermove', (e) => {
        hovered = pick(e);
        tg.el.style.cursor = hovered ? 'pointer' : '';
      });
      tg.el.addEventListener('pointerleave', () => { hovered = null; });
      tg.el.addEventListener('pointerdown', (e) => {
        const k = pick(e);
        if (k) {
          pressKey(k, 0.25);
          tg.el.dispatchEvent(new CustomEvent('skill', { detail: k.userData.name, bubbles: true }));
        }
      });
      window.addEventListener('keydown', (e) => {
        if (!tg.visible || e.metaKey || e.ctrlKey || e.altKey) return;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
        const ch = e.key.length === 1 ? e.key.toLowerCase() : e.key === ' ' ? ' ' : '';
        if (!ch) return;
        let first = null;
        keys.forEach((k) => {
          const n = k.userData.name.toLowerCase();
          if ((ch === ' ' && n === 'effect house') || (ch !== ' ' && n[0] === ch)) {
            pressKey(k, 0.22);
            first = first || k.userData.name;
          }
        });
        if (first) {
          typed++;
          tg.el.dispatchEvent(new CustomEvent('skill', { detail: first, bubbles: true }));
        }
      });
    },
    update(s) {
      cam(s);
      const now = performance.now();
      if (!s.reduced && s.t > nextAmbient && !hovered) {
        pressKey(keys[Math.floor(r() * keys.length)], 0.14);
        nextAmbient = s.t + 0.35 + r() * 0.9;
      }
      keys.forEach((k, i) => {
        const u = k.userData;
        if (u.until && now > u.until) { u.target = 0; u.until = 0; }
        const tgt = Math.max(u.target, hovered === k ? 0.55 : 0);
        u.press = s.reduced ? 0 : damp(u.press, tgt, 22, s.dt);
        const kin = easeOutBack(seg(s.t, 0.05 + (i % 8) * 0.04 + Math.floor(i / 8) * 0.06, 0.55));
        k.position.y = u.y - u.press * 0.13 + (1 - kin) * 1.2;
        k.scale.setScalar(Math.max(0.0001, kin));
      });
      hint.material.opacity = typed > 2 ? damp(hint.material.opacity, 0, 3, s.dt) : easeOut(seg(s.t, 1.2, 0.6));
      root.rotation.y = s.px * 0.08;
    },
  };
}

/* ======================================================================
   CONTACT — a paper plane looping through clouds. "Send" launches it.
   ====================================================================== */
export function plane(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [0, 0.8, 11.5], look: [0, 0.3, 0], fit: 1.5 });
  const pp = paperPlane();
  const ship = new THREE.Group();
  ship.add(pp);
  pp.scale.setScalar(0.85);
  scene.add(ship);
  const cloudMat = M.ceramic('#ffffff', { roughness: 0.55, clearcoat: 0.2 });
  const clouds = [[-2.8, 1.3, -1.5, 1.0], [2.7, -0.6, -1.2, 0.85], [0.6, 2.1, -3, 0.7]].map(([x, y, z, k], ci) => {
    const g = new THREE.Group();
    const rr = rng(40 + ci);
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.45 + rr() * 0.3, 32, 24), cloudMat);
      m.position.set((i - 2) * 0.42, Math.sin(i * 1.3) * 0.12 + (i === 2 ? 0.18 : 0), (rr() - 0.5) * 0.3);
      g.add(m);
    }
    g.scale.setScalar(k);
    g.position.set(x, y, z);
    g.userData.base = g.position.clone();
    scene.add(g);
    return g;
  });
  const N = 46;
  const trailPos = new Float32Array(N * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  const trail = new THREE.Line(trailGeo, new THREE.LineDashedMaterial({ color: C.violet, dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0.55 }));
  scene.add(trail);
  const hist = [];
  const dust = sparkles(40, 4, { color: C.violet, size: 0.05, opacity: 0.4, seed: 9 });
  scene.add(dust);
  const P = new THREE.Vector3();
  const Q = new THREE.Vector3();
  const prev = new THREE.Vector3();
  let launchAt = -1;
  let roll = 0;
  const path = (t, out) => out.set(Math.sin(t * 0.55) * 2.7, Math.sin(t * 1.1) * 0.75 + 0.35, Math.cos(t * 0.55) * 1.1);
  return {
    scene, camera, posterT: 1.2,
    launch() { launchAt = -2; },
    update(s) {
      cam(s);
      const t = s.reduced ? 1.2 : s.time;
      if (launchAt === -2) launchAt = t;
      path(t, P);
      if (launchAt >= 0) {
        const k = (t - launchAt) / 2.4;
        if (k < 0.45) {
          const f = easeInOut(k / 0.45);
          P.lerp(Q.set(9, 5.5, 1.5), f * f);
        } else if (k < 1) {
          const f = easeOut((k - 0.45) / 0.55);
          path(t, Q);
          P.set(lerp(-9, Q.x, f), lerp(-1.5, Q.y, f), lerp(1.5, Q.z, f));
        } else {
          launchAt = -1;
        }
      }
      const kin = easeOutBack(seg(s.t, 0, 0.8));
      ship.scale.setScalar(Math.max(0.0001, kin));
      ship.position.copy(P);
      path(t + 0.05, Q);
      if (launchAt >= 0) Q.copy(P).add(P.clone().sub(prev).multiplyScalar(4));
      if (Q.distanceToSquared(P) > 1e-6) ship.lookAt(Q);
      const vx = P.x - prev.x;
      roll = damp(roll, clamp(-vx * 8, -0.8, 0.8), 4, s.dt || 0.016);
      pp.rotation.z = roll;
      prev.copy(P);
      hist.unshift(P.x, P.y, P.z);
      if (hist.length > N * 3) hist.length = N * 3;
      for (let i = 0; i < N * 3; i++) trailPos[i] = hist[i] ?? hist[hist.length - 3 + (i % 3)] ?? 0;
      trailGeo.attributes.position.needsUpdate = true;
      trail.computeLineDistances();
      trail.material.opacity = s.reduced ? 0 : 0.55;
      clouds.forEach((c, i) => {
        c.position.x = c.userData.base.x + Math.sin(s.time * 0.2 + i) * 0.3;
        c.position.y = c.userData.base.y + Math.sin(s.time * 0.5 + i * 2) * 0.08;
      });
      dust.rotation.y = s.time * 0.04;
    },
  };
}
