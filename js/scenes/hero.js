/* Hero: a liquid-pearl core with six miniatures in orbit, one for each "I'm a
   ..." in the headline: a snowflake (developer advocate), a practice card
   (founder), a phone with my face (TikTok effect creator), a λ cube (software
   engineer), a grad cap (Georgia Tech grad), and a dumbbell (gym rat). When the
   headline changes, its miniature swings to the front and the pearl takes on
   that world's tint. Scrolling away spreads the system apart. */
import {
  THREE, C, M, stage, damp, clamp, easeOut, easeOutBack, seg, sparkles, shadow, enhance, rbox, label, textTex,
} from '../kit.js';
import { crystal, phone, dumbbell, gradCap } from './builders.js';

function practiceCard() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(rbox(1.1, 0.76, 0.09, 0.1), M.gloss('#ffffff'));
  const face = label(textTex('Q', { w: 128, h: 128, size: 80, weight: 800, color: '#ffffff', bg: '#1E7A4C', radius: 28 }), 0.36, 0.36);
  face.position.set(-0.27, 0.06, 0.047);
  const line = new THREE.Mesh(rbox(0.42, 0.07, 0.01, 0.03), M.flat('#d7dbe2'));
  line.position.set(0.2, 0.14, 0.047);
  const line2 = line.clone();
  line2.position.y = 0.0;
  line2.scale.x = 0.7;
  const line3 = line.clone();
  line3.position.set(0.0, -0.2, 0.047);
  line3.scale.x = 1.6;
  g.add(body, face, line, line2, line3);
  return g;
}

function lambdaCube() {
  const box = new THREE.Mesh(rbox(1.3, 1.3, 1.3, 0.3, 6), enhance(M.pearl('#EBEDF2'), { holo: 0.7 }));
  const lam = label(textTex('λ', { w: 256, h: 256, size: 190, weight: 500, color: '#FF8A3D' }), 0.78, 0.78);
  lam.position.z = 0.66;
  box.add(lam);
  return box;
}

// Pearl tints, one per headline word (same order as the minis).
const TINTS = ['#DCEBFF', '#DDF3E5', '#FFE0EC', '#FFE9D8', '#FBE5E0', '#D6F3EF'].map((h) => new THREE.Color(h));
const BASE = new THREE.Color('#EEF0F6');

export function hero(env) {
  const base = [0, 0.25, 13.5];
  const { scene, camera } = stage(env, { fov: 27, pos: base, look: [0, -0.05, 0] });
  const root = new THREE.Group();
  scene.add(root);

  const uTime = { value: 0 };
  const coreMat = enhance(M.pearl('#EEF0F6', {
    roughness: 0.06, iridescenceIOR: 1.8, iridescenceThicknessRange: [100, 820], metalness: 0.18,
  }), { uTime, liquid: [0.045, 0.75], holo: 0.85 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.15, 160, 120), coreMat);
  root.add(core);

  const rings = [
    { R: 2.5, rot: new THREE.Euler(1.2, 0.0, -0.34), speed: 0.17 },
    { R: 3.3, rot: new THREE.Euler(1.34, 0.0, 0.46), speed: -0.115 },
  ];
  const orbitMat = M.chrome('#cdd3df', { transparent: true, opacity: 0.5 });
  // Where on each ring a miniature sits front and right of the pearl.
  const want = new THREE.Vector3(1.2, 0, 1);
  for (const r of rings) {
    const torus = new THREE.Mesh(new THREE.TorusGeometry(r.R, 0.008, 8, 300), orbitMat);
    torus.rotation.copy(r.rot);
    root.add(torus);
    r.mesh = torus;
    const ex = new THREE.Vector3(1, 0, 0).applyEuler(r.rot);
    const ey = new THREE.Vector3(0, 1, 0).applyEuler(r.rot);
    r.front = Math.atan2(ey.dot(want), ex.dot(want));
    r.off = 0;
    r.mult = 1;
  }

  const holder = (obj, s, tilt = [0, 0, 0]) => {
    const g = new THREE.Group();
    obj.rotation.set(...tilt);
    g.add(obj);
    g.scale.setScalar(s);
    g.userData.s = s;
    root.add(g);
    return g;
  };
  const minis = [
    { g: holder(crystal({ arm: 0.6, thick: 0.032 }).group, 1), ring: 0, a0: 0.4, spin: [0, 0, 0.5] },
    { g: holder(practiceCard(), 0.62, [0.2, -0.4, 0.1]), ring: 0, a0: 2.5, spin: [0, 0.5, 0] },
    { g: holder(phone().group, 0.3, [0, -0.35, 0.08]), ring: 0, a0: 4.55, spin: [0, 0.45, 0] },
    { g: holder(lambdaCube(), 0.4, [0.3, 0.5, 0]), ring: 1, a0: 1.0, spin: [0.2, 0.5, 0] },
    { g: holder(gradCap().group, 0.5, [0.25, 0.3, 0]), ring: 1, a0: 3.15, spin: [0, 0.6, 0] },
    { g: holder(dumbbell(), 0.36, [0.4, 0.2, 0.6]), ring: 1, a0: 5.25, spin: [0.35, 0.5, 0] },
  ];
  minis.forEach((m) => { m.a = m.a0; m.boost = 1; });

  // The page tells us which "I'm a ..." is showing (-1: none).
  let focus = Number.isInteger(window.__heroRole) ? window.__heroRole : -1;
  const onRole = (e) => { focus = Number.isInteger(e.detail) ? e.detail : -1; };
  window.addEventListener('hero-role', onRole);
  const tint = new THREE.Color();

  const dust = sparkles(80, 4.6, { color: C.violet, size: 0.055, opacity: 0.5, seed: 3 });
  root.add(dust);
  const floor = shadow(6.5, 2.6, 0.13);
  floor.position.y = -2.75;
  scene.add(floor);

  const P = new THREE.Vector3();
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  let speed = 1;
  let rx = 0;
  let ry = 0;
  let spread = 1;

  return {
    scene,
    camera,
    posterT: 7,
    update(s) {
      const { t, dt } = s;
      uTime.value = s.reduced ? 3.2 : s.time;
      speed = damp(speed, s.hover ? 2.4 : 1, 2, dt);
      const p = clamp((s.progress - 0.55) / 0.45);
      spread = s.reduced ? 1 : damp(spread, 1 + easeOut(p) * 0.55, 6, dt);
      ry = damp(ry, s.gx * 0.38 + p * 0.5, 2.5, dt);
      rx = damp(rx, s.gy * 0.16, 2.5, dt);
      root.rotation.set(rx, ry, 0);
      root.position.y = Math.sin(s.time * 0.7) * 0.07;

      const ci = easeOutBack(seg(t, 0, 1.3), 1.2);
      core.scale.setScalar((0.55 + 0.45 * ci) * (1 - p * 0.18));
      tint.copy(BASE);
      if (focus >= 0) tint.lerp(TINTS[focus % TINTS.length], 0.9);
      coreMat.color.lerp(tint, 1 - Math.exp(-3 * dt));

      // A focused miniature's ring stops and turns so it sits up front.
      const fm = focus >= 0 ? minis[focus % minis.length] : null;
      rings.forEach((r, ri) => {
        const own = fm && fm.ring === ri;
        r.mult = damp(r.mult, own ? 0 : 1, 3, dt);
        const target = own ? r.front - fm.a : r.off;
        r.off += wrap(target - r.off) * (1 - Math.exp(-(s.reduced ? 60 : 3.2) * dt));
      });

      minis.forEach((m, i) => {
        const r = rings[m.ring];
        const k = easeOut(seg(t, 0.25 + i * 0.09, 1.25));
        m.a += r.speed * speed * r.mult * dt;
        const on = m === fm;
        m.boost = damp(m.boost, on ? 1.5 : 1, 4, dt);
        const R = r.R * spread * (1 + (1 - k) * 1.6);
        const a = m.a + r.off;
        P.set(Math.cos(a) * R, Math.sin(a) * R, 0).applyEuler(r.rot);
        m.g.position.copy(P);
        m.g.scale.setScalar(m.g.userData.s * m.boost * Math.max(0.0001, k));
        const o = m.g.children[0];
        const sp = on ? 1.8 : 1;
        o.rotation.x += m.spin[0] * sp * dt;
        o.rotation.y += m.spin[1] * sp * dt;
        o.rotation.z += m.spin[2] * sp * dt;
      });
      for (const r of rings) r.mesh.scale.setScalar(spread);
      dust.rotation.y = s.time * 0.03;
    },
  };
}
