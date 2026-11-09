/* Projects. Each one is a tiny working diorama of the idea. */
import {
  THREE, C, M, stage, rig, damp, clamp, lerp, seg, loop, easeOut, easeInOut, easeOutBack, smooth,
  rbox, textTex, label, sprite, tag, shadow, sparkles, setInst, enhance, canvasTex, rng, dotTex, roundRectPath, FONT, MONO,
} from '../kit.js';
import { vinyl, person } from './builders.js';

const TAU = Math.PI * 2;

/* ======================================================================
   BETTER SPOTIFY WRAPPED — a record that never stops, with a live EQ ring
   ====================================================================== */
export function spotify(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [0, 4.6, 9.8], look: [0, 0.15, 0] });
  const plinth = new THREE.Mesh(rbox(3.9, 0.34, 3.2, 0.17), M.ceramic('#ffffff', { roughness: 0.3 }));
  plinth.position.y = -0.17;
  const platter = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.36, 0.08, 96), M.satin('#E3E5EB'));
  platter.position.y = 0.04;
  const rec = vinyl({ r: 1.26, t: 0.03 });
  rec.position.y = 0.1;
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 16), M.chrome());
  spindle.position.y = 0.16;
  const armBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.2, 32), M.chrome());
  armBase.position.set(1.55, 0.1, -1.1);
  const arm = new THREE.Group();
  arm.position.set(1.55, 0.25, -1.1);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.75, 12), M.chrome());
  rod.rotation.x = Math.PI / 2;
  rod.position.z = 0.85;
  const head = new THREE.Mesh(rbox(0.16, 0.06, 0.26, 0.025), M.gloss('#131318'));
  head.position.set(0, -0.06, 1.72);
  arm.add(rod, head);
  arm.rotation.y = -0.5;
  scene.add(plinth, platter, rec, spindle, armBase, arm);

  const N = 44;
  const bars = new THREE.InstancedMesh(rbox(0.1, 1, 0.1, 0.035), M.gloss('#ffffff'), N);
  const stops = [C.violet, C.sky, C.mint, C.pink, C.violet].map((h) => new THREE.Color(h));
  const tmp = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const f = (i / N) * 4;
    const j = Math.floor(f);
    bars.setColorAt(i, tmp.copy(stops[j]).lerp(stops[j + 1], f - j));
  }
  bars.instanceColor.needsUpdate = true;
  scene.add(bars);
  const notes = ['♪', '♫', '♪'].map((ch, i) => {
    const s = sprite(textTex(ch, { w: 128, h: 128, size: 96, weight: 500, color: i % 2 ? '#e2569b' : C.violet }), 0.42, 0.42);
    s.userData.off = i / 3;
    scene.add(s);
    return s;
  });
  const floor = shadow(6, 4.6, 0.14);
  floor.position.y = -0.35;
  scene.add(floor);
  let spin = 0;
  let speed = 1;
  return {
    scene, camera, posterT: 3,
    update(s) {
      cam(s);
      speed = damp(speed, s.hover ? 2.6 : 1, 3, s.dt);
      spin += s.dt * 0.9 * speed;
      rec.rotation.y = -spin;
      const kin = easeOut(seg(s.t, 0, 1));
      arm.rotation.y = lerp(-0.95, -0.42, easeInOut(seg(s.t, 0.4, 1)));
      const amp = s.hover ? 1.35 : 1;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU;
        const beat = Math.pow(0.5 + 0.5 * Math.sin(s.time * 4.2), 6);
        const v = 0.5 + 0.5 * Math.sin(s.time * (2.1 + (i % 5) * 0.35) + i * 1.7) * Math.cos(s.time * 1.3 + i * 0.5);
        const h = (0.12 + (0.55 * v + 0.35 * beat) * amp) * kin + 0.0001;
        setInst(bars, i, Math.cos(a) * 1.6, h / 2, Math.sin(a) * 1.6, 0, -a, 0, 1, h, 1);
      }
      bars.instanceMatrix.needsUpdate = true;
      notes.forEach((n, i) => {
        const p = loop(s.time * 0.25 + n.userData.off, 1);
        n.position.set(-1.2 + i * 1.1 + Math.sin(p * 7) * 0.2, 0.6 + p * 2.2, 0.4);
        n.material.opacity = Math.sin(Math.PI * p) * kin;
      });
      scene.rotation.y = Math.sin(s.time * 0.25) * 0.15;
    },
  };
}

/* ======================================================================
   IDENTIFAI — a recognition reticle locks onto familiar faces, names them
   ====================================================================== */
function faceTex(bg, skin, hair, style, seed) {
  return canvasTex(512, 620, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, bg[0]);
    grd.addColorStop(1, bg[1]);
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.beginPath();
    g.ellipse(w / 2, h + 40, 220, 210, 0, Math.PI, TAU);
    g.fill();
    g.fillStyle = hair;
    g.beginPath();
    g.ellipse(w / 2, h + 40, 205, 190, 0, Math.PI, TAU);
    g.fill();
    g.fillStyle = skin;
    g.fillRect(w / 2 - 42, 330, 84, 90);
    g.beginPath();
    g.ellipse(w / 2, 260, 112, 132, 0, 0, TAU);
    g.fill();
    g.fillStyle = hair;
    g.beginPath();
    if (style === 0) { g.ellipse(w / 2, 185, 122, 82, 0, Math.PI, TAU); g.fill(); }
    if (style === 1) { g.ellipse(w / 2, 200, 138, 110, 0, Math.PI * 0.95, Math.PI * 2.05); g.fill(); g.fillRect(w / 2 - 138, 200, 50, 180); g.fillRect(w / 2 + 88, 200, 50, 180); }
    if (style === 2) { g.ellipse(w / 2, 170, 98, 46, 0, Math.PI, TAU); g.fill(); }
    if (style === 3) { g.arc(w / 2, 150, 70, 0, TAU); g.fill(); g.beginPath(); g.ellipse(w / 2, 195, 118, 70, 0, Math.PI, TAU); g.fill(); }
    g.fillStyle = 'rgba(19,19,24,0.75)';
    g.beginPath();
    g.arc(w / 2 - 40, 262, 10, 0, TAU);
    g.arc(w / 2 + 40, 262, 10, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(19,19,24,0.55)';
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(w / 2, 300, 34, 0.2 * Math.PI, 0.8 * Math.PI);
    g.stroke();
    if (seed % 2) {
      g.strokeStyle = 'rgba(19,19,24,0.6)';
      g.lineWidth = 5;
      g.strokeRect(w / 2 - 72, 244, 56, 38);
      g.strokeRect(w / 2 + 16, 244, 56, 38);
    }
  });
}
export function identifai(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [0, 0.75, 10.4], look: [0, 0.15, 0], fit: 1.3 });
  const people = [
    { name: 'Mom 99%', bg: ['#EDEFF4', '#D3D9E6'], skin: '#F4C9A8', hair: '#5B3A29', style: 1 },
    { name: 'Sam 97%', bg: ['#E3F0FF', '#C7DBFF'], skin: '#E8B892', hair: '#2A2230', style: 0 },
    { name: 'Grandpa 98%', bg: ['#FFE9F3', '#FFCFE4'], skin: '#F1CBB0', hair: '#CFC8D8', style: 2 },
    { name: 'Dr. Lee 96%', bg: ['#E6FBF3', '#C4EEDF'], skin: '#C99872', hair: '#1F1B1A', style: 3 },
    { name: 'Maya 97%', bg: ['#FFF1E8', '#FFD9C6'], skin: '#8D5B3E', hair: '#191514', style: 1 },
  ];
  const cards = people.map((p, i) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(rbox(1.12, 1.36, 0.06, 0.07), M.ceramic('#ffffff'));
    const face = label(faceTex(p.bg, p.skin, p.hair, p.style, i), 0.98, 1.18);
    face.position.z = 0.032;
    g.add(body, face);
    const x = (i - 2) * 1.3;
    g.position.set(x, -Math.abs(i - 2) * 0.08, -Math.abs(i - 2) * 0.35);
    g.rotation.y = -(i - 2) * 0.16;
    g.userData.base = g.position.clone();
    scene.add(g);
    const nm = tag(p.name, { size: 42, color: C.violet, scale: 1.25 });
    nm.position.copy(g.position).add(new THREE.Vector3(0, 1.0, 0.25));
    nm.material.opacity = 0;
    scene.add(nm);
    return { g, nm };
  });
  const ret = new THREE.Group();
  const bm = M.glow('#2E4BFF', { opacity: 1, blending: THREE.NormalBlending });
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.02), bm);
      h.position.set(sx * 0.48, sy * 0.6, 0);
      h.position.x -= sx * 0.11;
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.02), bm);
      v.position.set(sx * 0.48, sy * 0.6 - sy * 0.11, 0);
      ret.add(h, v);
    }
  }
  scene.add(ret);
  const scanLine = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.025), M.glow('#7ef0c6', { opacity: 0.9 }));
  ret.add(scanLine);
  const floor = shadow(7, 2.2, 0.13);
  floor.position.y = -1.15;
  scene.add(floor);
  const STEP = 1.9;
  const P = new THREE.Vector3();
  return {
    scene, camera, posterT: 0.8 + STEP * 1.6,
    update(s) {
      cam(s);
      const t = Math.max(0, s.t - 0.8);
      const n = Math.floor(t / STEP);
      const f = t / STEP - n;
      const cur = n % cards.length;
      const next = (n + 1) % cards.length;
      cards.forEach((c, i) => {
        const k = easeOutBack(seg(s.t, i * 0.08, 0.7));
        c.g.scale.setScalar(Math.max(0.0001, k));
        c.g.position.y = c.g.userData.base.y + Math.sin(s.time * 1.1 + i) * 0.04;
        const on = i === cur && f > 0.32 && f < 0.95;
        c.nm.material.opacity = damp(c.nm.material.opacity, on ? 1 : 0, 10, s.dt || 1);
        c.nm.position.y = c.g.position.y + 1.02 + (on ? 0 : -0.08);
      });
      const mv = easeInOut(clamp((f - 0.82) / 0.18));
      P.lerpVectors(cards[cur].g.position, cards[next].g.position, mv);
      ret.position.set(P.x, P.y, P.z + 0.12);
      ret.rotation.y = lerp(cards[cur].g.rotation.y, cards[next].g.rotation.y, mv);
      const lock = easeOutBack(clamp(f / 0.3), 2.2);
      ret.scale.setScalar(lerp(1.25, 1, lock));
      ret.visible = s.t > 0.8;
      scanLine.position.y = 0.55 - clamp(f / 0.32) * 1.1;
      scanLine.visible = f < 0.32;
    },
  };
}

/* ======================================================================
   GOPU — Google won't search for public restrooms, so: a map, pins drop in,
   the filters thin them out, and a route leads to the nearest one
   ====================================================================== */
export function gopu(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [0, 6.3, 7.5], look: [0, 0.3, 0.15] });
  const board = new THREE.Mesh(rbox(4.2, 0.16, 3.0, 0.14), M.ceramic('#ffffff', { roughness: 0.35 }));
  board.position.y = -0.08;
  const mapTex = canvasTex(1024, 732, (g, w, h) => {
    g.fillStyle = '#E7EEE5';
    g.fillRect(0, 0, w, h);
    // A park and a waterfront.
    g.fillStyle = '#CDE6C6';
    roundRectPath(g, 640, 60, 250, 180, 34);
    g.fill();
    g.fillStyle = '#CBDDF6';
    g.beginPath();
    g.moveTo(0, 590);
    g.bezierCurveTo(210, 545, 330, 650, 520, 615);
    g.bezierCurveTo(700, 580, 830, 690, w, 655);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.closePath();
    g.fill();
    // Blocks.
    g.fillStyle = '#DCE3DA';
    for (const [x, y, bw, bh] of [[40, 40, 120, 90], [220, 40, 160, 90], [420, 40, 170, 90], [40, 190, 120, 120], [220, 190, 160, 120], [440, 300, 150, 120], [650, 300, 160, 120], [860, 300, 130, 120], [220, 360, 160, 110]]) {
      roundRectPath(g, x, y, bw, bh, 10);
      g.fill();
    }
    // Streets.
    g.strokeStyle = '#ffffff';
    g.lineCap = 'round';
    g.lineWidth = 20;
    for (const x of [190, 405, 615, 835]) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 560); g.stroke(); }
    for (const y of [160, 340, 500]) { g.beginPath(); g.moveTo(20, y); g.lineTo(w - 20, y); g.stroke(); }
    g.lineWidth = 30;
    g.beginPath();
    g.moveTo(60, 560);
    g.lineTo(960, 40);
    g.stroke();
  });
  const map = label(mapTex, 4.0, 2.86);
  map.rotation.x = -Math.PI / 2;
  map.position.y = 0.002;
  scene.add(board, map);

  // Map units: the texture's 1024x732 maps onto 4.0 x 2.86.
  const at = (px, py) => new THREE.Vector3((px / 1024 - 0.5) * 4.0, 0, (py / 732 - 0.5) * 2.86);
  const spots = [[150, 120], [300, 250], [470, 180], [560, 420], [700, 120], [760, 400], [905, 250], [330, 470], [905, 470]].map(([x, y]) => at(x, y));
  const hits = new Set([1, 3, 5]);
  const grey = new THREE.Color('#AEB4C0');
  const blue = new THREE.Color('#2F7BF6');
  const wcTex = textTex('WC', { w: 128, h: 128, size: 58, weight: 800, color: '#ffffff', bg: '#2F7BF6', radius: 64 });
  const pins = spots.map((p, i) => {
    const g = new THREE.Group();
    const mat = M.gloss('#AEB4C0');
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 28, 20), mat);
    head.position.y = 0.42;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 24), mat);
    tip.rotation.x = Math.PI;
    tip.position.y = 0.24;
    g.add(head, tip);
    let wc = null;
    if (hits.has(i)) {
      wc = sprite(wcTex, 0.3, 0.3);
      wc.position.y = 0.82;
      g.add(wc);
    }
    g.position.copy(p);
    scene.add(g);
    return { g, mat, wc, hit: hits.has(i), p };
  });

  // You are here, with a pulse.
  const youPos = at(380, 610 - 160);
  const you = new THREE.Mesh(new THREE.CircleGeometry(0.11, 40), M.flat('#2F7BF6'));
  you.rotation.x = -Math.PI / 2;
  you.position.copy(youPos).setY(0.012);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.17, 48), M.flat('#2F7BF6', { transparent: true, opacity: 0.5 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(you.position).setY(0.013);
  scene.add(you, ring);

  // Route to the nearest hit, drawn as dots along the streets.
  const near = pins[3].p;
  const route = new THREE.CatmullRomCurve3([
    you.position.clone(), at(405, 450).setY(0.012), at(405, 420).setY(0.012), at(520, 420).setY(0.012), near.clone().setY(0.012),
  ], false, 'catmullrom', 0.1);
  const D = 26;
  const dots = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 16), M.flat('#2F7BF6'), D);
  scene.add(dots);
  const search = tag('public restrooms near me', { w: 820, size: 44, scale: 1.0, color: '#17201A' });
  search.position.set(-0.55, 1.55, -1.05);
  scene.add(search);
  const floor = shadow(6.4, 4.6, 0.12);
  floor.position.y = -0.17;
  scene.add(floor);

  const P = 8.2;
  const v = new THREE.Vector3();
  return {
    scene, camera, posterT: 5.6,
    update(s) {
      cam(s);
      const tt = s.reduced ? 5.6 : loop(s.t, P) * P;
      const out = easeInOut(seg(tt, P - 0.8, 0.7));
      const filt = easeInOut(seg(tt, 2.5, 0.8));
      pins.forEach((pin, i) => {
        const drop = seg(tt, 0.3 + i * 0.16, 0.55);
        const y = (1 - easeOutBack(drop, 1.8)) * 1.6;
        pin.g.position.set(pin.p.x, y, pin.p.z);
        let sc = drop > 0 ? 1 : 0.0001;
        if (pin.hit) {
          pin.mat.color.copy(grey).lerp(blue, filt);
          sc *= 1 + filt * 0.18;
          pin.g.position.y += filt * 0.06;
          if (pin.wc) pin.wc.scale.setScalar(Math.max(0.0001, easeOutBack(seg(tt, 3.0, 0.5)) * 0.3));
        } else {
          pin.mat.color.copy(grey);
          sc *= 1 - filt * 0.55;
          pin.mat.transparent = true;
          pin.mat.opacity = 1 - filt * 0.6;
        }
        pin.g.scale.setScalar(Math.max(0.0001, sc * (1 - out)));
      });
      const rk = clamp((tt - 3.5) / 1.2) * (1 - out);
      const shown = Math.floor(rk * D);
      for (let i = 0; i < D; i++) {
        route.getPointAt(i / (D - 1), v);
        setInst(dots, i, v.x, v.y, v.z, 0, 0, 0, i < shown ? 1 : 0.0001);
      }
      dots.instanceMatrix.needsUpdate = true;
      const pulse = (s.time * 0.8) % 1;
      ring.scale.setScalar(1 + pulse * 1.6);
      ring.material.opacity = 0.5 * (1 - pulse);
      search.material.opacity = easeOut(seg(s.t, 0.2, 0.6));
      scene.rotation.y = Math.sin(s.time * 0.3) * 0.1 + s.px * 0.15;
    },
  };
}

/* ======================================================================
   FOGOFYOU — you, hidden in a crowd of decoy personas and drifting fog
   ====================================================================== */
export function fog(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [0, 2.7, 9.2], look: [0, 0.7, 0] });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.12, 96), M.ceramic('#F1F2F5'));
  disc.position.y = -0.06;
  scene.add(disc);
  const personas = ['mom', 'gym bro', 'k-pop stan', 'veteran', 'gamer', 'chef', 'golfer', 'birder'];
  const figs = [];
  const decoyMat = () => M.ceramic('#ffffff', { transparent: true, opacity: 0.62, roughness: 0.25 });
  for (let i = 0; i < 9; i++) {
    const you = i === 0;
    const mat = you ? M.gloss(C.violet) : decoyMat();
    const p = person({ mat });
    const a = (i / 9) * TAU + 0.3;
    const R = you ? 0.35 : 1.15 + (i % 3) * 0.42;
    p.userData = { a, R, you, spd: (i % 2 ? 1 : -1) * (0.08 + (i % 4) * 0.03), mat };
    p.scale.setScalar(you ? 0.9 : 0.82);
    if (!you && i % 2 === 1) {
      const tg = tag(personas[i - 1], { size: 40, color: '#6C6C76', scale: 0.95 });
      tg.position.y = 1.62;
      tg.scale.multiplyScalar(1 / 0.82);
      p.add(tg);
      p.userData.tag = tg;
    } else if (you) {
      const tg = tag('you', { size: 44, color: '#ffffff', bg: C.violet, scale: 1 });
      tg.position.y = 1.62;
      p.add(tg);
      p.userData.tag = tg;
    }
    scene.add(p);
    figs.push(p);
  }
  const puffs = [];
  const rr = rng(77);
  const puffMat = new THREE.SpriteMaterial({ map: dotTex(), color: '#edeff4', transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false });
  for (let i = 0; i < 30; i++) {
    const sp = new THREE.Sprite(puffMat.clone());
    const sc = 1.2 + rr() * 1.8;
    sp.scale.set(sc, sc * 0.7, 1);
    sp.userData = { a: rr() * TAU, R: 1.2 + rr() * 2.2, y: 0.1 + rr() * 1.3, spd: (rr() - 0.5) * 0.25, base: 0.05 + rr() * 0.09 };
    scene.add(sp);
    puffs.push(sp);
  }
  const floor = shadow(6.4, 3.4, 0.14);
  floor.position.y = -0.13;
  scene.add(floor);
  return {
    scene, camera, posterT: 2.4,
    update(s) {
      cam(s);
      const dens = 0.5 + 0.5 * Math.sin(s.time * 0.6);
      figs.forEach((p, i) => {
        const ud = p.userData;
        ud.a += ud.spd * s.dt * (s.hover ? 2.2 : 1);
        p.position.set(Math.cos(ud.a) * ud.R, Math.abs(Math.sin(s.time * 2 + i)) * 0.03, Math.sin(ud.a) * ud.R * 0.62);
        p.rotation.y = -ud.a + Math.PI / 2;
        const k = easeOutBack(seg(s.t, i * 0.07, 0.6));
        p.scale.setScalar(Math.max(0.0001, k) * (ud.you ? 0.9 : 0.82));
        if (ud.you) ud.mat.opacity = 1;
        if (ud.tag) ud.tag.material.opacity = easeOut(seg(s.t, 0.8 + i * 0.05, 0.5)) * (ud.you ? 1 - dens * 0.45 : 0.85);
      });
      puffs.forEach((sp) => {
        const u = sp.userData;
        u.a += u.spd * s.dt;
        sp.position.set(Math.cos(u.a) * u.R, u.y + Math.sin(s.time * 0.5 + u.R) * 0.15, Math.sin(u.a) * u.R * 0.6 + 0.4);
        sp.material.opacity = u.base * (0.55 + dens * 0.9) * easeOut(seg(s.t, 0.3, 1.2));
      });
      scene.rotation.y = Math.sin(s.time * 0.2) * 0.1 + s.px * 0.15;
    },
  };
}

/* ======================================================================
   BEELINGUAPP — a story book: pages turn, greetings float up
   ====================================================================== */
export function book(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [0, 4.4, 9.4], look: [0, 0.75, 0] });
  const root = new THREE.Group();
  scene.add(root);
  const coverMat = M.ceramic(C.rose, { roughness: 0.35 });
  const pageMat = M.ceramic('#fffdf8', { roughness: 0.6, clearcoat: 0.1 });
  const W = 1.7;
  const D = 2.3;
  for (const side of [-1, 1]) {
    const cov = new THREE.Mesh(rbox(W + 0.1, 0.07, D + 0.16, 0.03), coverMat);
    cov.position.set(side * (W / 2 + 0.03), 0, 0);
    cov.rotation.z = side * -0.1;
    const stack = new THREE.Mesh(rbox(W - 0.06, 0.16, D - 0.04, 0.04), pageMat);
    stack.position.set(side * (W / 2 + 0.01), 0.1, 0);
    stack.rotation.z = side * -0.1;
    root.add(cov, stack);
  }
  const lines = canvasTex(512, 700, (g, w, h) => {
    g.fillStyle = '#fffdf8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#bdc4d6';
    const rr = rng(8);
    for (let y = 80; y < h - 60; y += 46) {
      const len = 280 + rr() * 140;
      roundRectPath(g, 60, y, len, 14, 7);
      g.fill();
    }
  });
  const segs = 28;
  const pageGeo = new THREE.PlaneGeometry(W - 0.08, D - 0.1, segs, 1);
  const pos = pageGeo.attributes.position;
  const baseX = Array.from({ length: pos.count }, (_, i) => pos.getX(i) + (W - 0.08) / 2);
  const baseY = Array.from({ length: pos.count }, (_, i) => pos.getY(i));
  const page = new THREE.Mesh(pageGeo, new THREE.MeshStandardMaterial({ map: lines, roughness: 0.75, side: THREE.DoubleSide }));
  page.position.y = 0.19;
  root.add(page);
  function bend(theta, curl) {
    const L = W - 0.08;
    const n = segs;
    const ds = L / n;
    const px = [0];
    const py = [0];
    let x = 0;
    let y = 0;
    for (let i = 0; i < n; i++) {
      const s = (i + 0.5) / n;
      const phi = theta + curl * s * s;
      x += Math.cos(phi) * ds;
      y += Math.sin(phi) * ds;
      px.push(x);
      py.push(y);
    }
    for (let i = 0; i < pos.count; i++) {
      const k = Math.round((baseX[i] / L) * n);
      pos.setXYZ(i, px[k], py[k], -baseY[i]);
    }
    pos.needsUpdate = true;
    pageGeo.computeVertexNormals();
  }
  const words = [['Hola', C.pink], ['Bonjour', C.sky], ['Ciao', C.mint], ['Hallo', C.peach], ['Olá', C.lilac2], ['Namaste', '#ffe3b8']];
  const bubbles = words.map(([w, colr], i) => {
    const g = new THREE.Group();
    const bw = 0.42 + w.length * 0.13;
    const body = new THREE.Mesh(rbox(bw, 0.42, 0.12, 0.2), M.gloss(colr));
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 16), M.gloss(colr));
    tail.position.set(-bw * 0.28, -0.25, 0);
    tail.rotation.z = Math.PI + 0.35;
    const tx = label(textTex(w, { w: 512, h: 160, size: 84, weight: 600 }), bw * 0.9, 0.3);
    tx.position.z = 0.062;
    g.add(body, tail, tx);
    g.userData.off = i / words.length;
    root.add(g);
    return g;
  });
  const floor = shadow(5.6, 3.6, 0.14);
  floor.position.y = -0.06;
  scene.add(floor);
  return {
    scene, camera, posterT: 2.2,
    update(s) {
      cam(s);
      const p = s.reduced ? 0.35 : loop(s.t * 0.28, 1);
      const turn = easeInOut(clamp((p - 0.1) / 0.6));
      const theta = 0.1 + turn * (Math.PI - 0.2);
      bend(theta, Math.sin(turn * Math.PI) * -1.1);
      bubbles.forEach((b, i) => {
        const q = loop(s.time * 0.16 + b.userData.off, 1);
        const a = q * TAU * 0.6 + i;
        b.position.set(Math.cos(a) * (0.9 + q * 0.9), 0.5 + q * 2.6, Math.sin(a) * 0.6 + 0.2);
        const k = Math.sin(Math.PI * q);
        b.scale.setScalar(Math.max(0.0001, Math.min(1, k * 1.6)) * easeOut(seg(s.t, 0.4 + i * 0.1, 0.6)));
        b.lookAt(camera.position.x, b.position.y, camera.position.z);
      });
      const kin = easeOutBack(seg(s.t, 0, 0.8));
      root.scale.setScalar(Math.max(0.0001, 0.75 + 0.25 * kin));
      root.rotation.y = Math.sin(s.time * 0.3) * 0.15 + s.px * 0.2;
    },
  };
}

/* ======================================================================
   LIFTIQ — a squat with an AI form coach: keypoints, knee angle, depth ✓
   ====================================================================== */
export function squat(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [5.2, 2.6, 9.4], look: [0.1, 1.35, 0] });
  const body = M.ceramic(C.lilac, { roughness: 0.32 });
  const jointMat = enhance(M.pearl('#ffffff'), { holo: 0.5 });
  const unit = new THREE.CylinderGeometry(1, 1, 1, 20);
  const bones = [];
  const mkBone = (r) => {
    const m = new THREE.Mesh(unit, body);
    m.userData.r = r;
    scene.add(m);
    bones.push(m);
    return m;
  };
  const joint = (r) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), jointMat);
    scene.add(m);
    return m;
  };
  const J = {};
  for (const k of ['ankleL', 'ankleR', 'kneeL', 'kneeR', 'hipL', 'hipR', 'shoulder', 'elbowL', 'elbowR', 'handL', 'handR']) J[k] = joint(0.1);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 24), body);
  scene.add(head);
  const B = {
    shinL: mkBone(0.075), shinR: mkBone(0.075), thighL: mkBone(0.085), thighR: mkBone(0.085),
    torso: mkBone(0.15), neck: mkBone(0.06), uaL: mkBone(0.055), uaR: mkBone(0.055), faL: mkBone(0.05), faR: mkBone(0.05),
  };
  const bar = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.9, 16), M.chrome());
  rod.rotation.x = Math.PI / 2;
  bar.add(rod);
  for (const z of [-1, 1]) {
    for (const [d, r, c] of [[1.12, 0.42, C.pink], [1.23, 0.33, C.sky]]) {
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.1, 48), M.gloss(c));
      pl.rotation.x = Math.PI / 2;
      pl.position.z = z * d;
      bar.add(pl);
    }
  }
  scene.add(bar);
  const platform = new THREE.Mesh(rbox(3.0, 0.14, 2.6, 0.06), M.ceramic('#F1F2F5'));
  platform.position.y = -0.07;
  scene.add(platform);
  const hudMat = new THREE.LineBasicMaterial({ color: '#2fc996', transparent: true, opacity: 0.95, depthTest: false });
  const hudGeo = new THREE.BufferGeometry();
  const hudPos = new Float32Array(12 * 6);
  hudGeo.setAttribute('position', new THREE.BufferAttribute(hudPos, 3));
  const hud = new THREE.LineSegments(hudGeo, hudMat);
  hud.renderOrder = 10;
  scene.add(hud);
  const kpMat = new THREE.MeshBasicMaterial({ color: '#2fc996', depthTest: false, toneMapped: false });
  const kps = Array.from({ length: 7 }, () => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), kpMat);
    m.renderOrder = 11;
    scene.add(m);
    return m;
  });
  const arcPts = new Float32Array(65 * 3);
  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPts, 3));
  const arc = new THREE.Line(arcGeo, new THREE.LineBasicMaterial({ color: C.violet, depthTest: false }));
  arc.renderOrder = 12;
  scene.add(arc);
  const angCanvas = document.createElement('canvas');
  angCanvas.width = 256;
  angCanvas.height = 112;
  const angCtx = angCanvas.getContext('2d');
  const angTex = new THREE.CanvasTexture(angCanvas);
  angTex.colorSpace = THREE.SRGBColorSpace;
  const ang = sprite(angTex, 0.62, 0.27, { depthTest: false });
  ang.renderOrder = 13;
  scene.add(ang);
  let lastDeg = -1;
  const depth = tag('depth ✓', { size: 46, color: '#ffffff', bg: '#2fc996', scale: 1.1 });
  depth.material.depthTest = false;
  depth.renderOrder = 14;
  scene.add(depth);
  const coach = tag('AI form coach', { size: 40, scale: 1.05 });
  coach.position.set(-0.9, 3.35, 0.4);
  scene.add(coach);
  const floor = shadow(4.6, 3.6, 0.14);
  floor.position.y = -0.15;
  scene.add(floor);

  const up = new THREE.Vector3(0, 1, 0);
  const tmp = new THREE.Vector3();
  const place = (m, a, b) => {
    tmp.subVectors(b, a);
    const len = tmp.length();
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(up, tmp.normalize());
    m.scale.set(m.userData.r, len, m.userData.r);
  };
  const V = () => new THREE.Vector3();
  const p = { aL: V(), aR: V(), kL: V(), kR: V(), hL: V(), hR: V(), hC: V(), sh: V(), nk: V(), hd: V(), eL: V(), eR: V(), nL: V(), nR: V(), sL: V(), sR: V() };
  return {
    scene, camera, posterT: 1.3,
    update(s) {
      cam(s);
      const d = s.reduced ? 1 : 0.5 - 0.5 * Math.cos((Math.max(0, s.t - 0.6) / 2.6) * TAU);
      const ts = 0.12 + 0.6 * d;
      const tt = 0.08 + 1.64 * d;
      const tb = 0.1 + 0.62 * d;
      for (const [z, A, K, H] of [[-0.2, p.aL, p.kL, p.hL], [0.2, p.aR, p.kR, p.hR]]) {
        A.set(0, 0.1, z);
        K.set(Math.sin(ts) * 0.95, 0.1 + Math.cos(ts) * 0.95, z);
        H.set(K.x - Math.sin(tt) * 1.0, K.y + Math.cos(tt) * 1.0, z);
      }
      p.hC.addVectors(p.hL, p.hR).multiplyScalar(0.5);
      p.sh.set(p.hC.x + Math.sin(tb) * 1.15, p.hC.y + Math.cos(tb) * 1.15, 0);
      p.nk.set(p.sh.x + Math.sin(tb) * 0.2, p.sh.y + Math.cos(tb) * 0.2, 0);
      p.hd.set(p.nk.x + Math.sin(tb) * 0.18 + 0.04, p.nk.y + 0.22, 0);
      for (const [z, S, E, N] of [[-1, p.sL, p.eL, p.nL], [1, p.sR, p.eR, p.nR]]) {
        S.set(p.sh.x, p.sh.y, z * 0.24);
        N.set(p.sh.x - 0.06, p.sh.y + 0.08, z * 0.48);
        E.set(p.sh.x - 0.36, p.sh.y - 0.22, z * 0.52);
      }
      place(B.shinL, p.aL, p.kL);
      place(B.shinR, p.aR, p.kR);
      place(B.thighL, p.kL, p.hL);
      place(B.thighR, p.kR, p.hR);
      place(B.torso, p.hC, p.sh);
      place(B.neck, p.sh, p.nk);
      place(B.uaL, p.sL, p.eL);
      place(B.uaR, p.sR, p.eR);
      place(B.faL, p.eL, p.nL);
      place(B.faR, p.eR, p.nR);
      J.ankleL.position.copy(p.aL);
      J.ankleR.position.copy(p.aR);
      J.kneeL.position.copy(p.kL);
      J.kneeR.position.copy(p.kR);
      J.hipL.position.copy(p.hL);
      J.hipR.position.copy(p.hR);
      J.shoulder.position.copy(p.sh);
      J.elbowL.position.copy(p.eL);
      J.elbowR.position.copy(p.eR);
      J.handL.position.copy(p.nL);
      J.handR.position.copy(p.nR);
      head.position.copy(p.hd);
      bar.position.set(p.sh.x - 0.05, p.sh.y + 0.08, 0);
      // HUD: keypoints + skeleton drawn on a plane in front of the lifter.
      const zf = 0.62;
      const pts = [p.aR, p.kR, p.hR, p.sh, p.hd, p.eR, p.nR];
      pts.forEach((q, i) => kps[i].position.set(q.x, q.y, zf));
      const pairs = [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [5, 6]];
      pairs.forEach(([a, b], i) => {
        hudPos.set([pts[a].x, pts[a].y, zf, pts[b].x, pts[b].y, zf], i * 6);
      });
      hudGeo.setDrawRange(0, pairs.length * 2);
      hudGeo.attributes.position.needsUpdate = true;
      const a1 = Math.atan2(p.aR.y - p.kR.y, p.aR.x - p.kR.x);
      const a2 = Math.atan2(p.hR.y - p.kR.y, p.hR.x - p.kR.x);
      let da = a2 - a1;
      while (da < 0) da += TAU;
      if (da > Math.PI) da = da - TAU;
      for (let i = 0; i <= 64; i++) {
        const a = a1 + (da * i) / 64;
        arcPts.set([p.kR.x + Math.cos(a) * 0.36, p.kR.y + Math.sin(a) * 0.36, zf], i * 3);
      }
      arcGeo.attributes.position.needsUpdate = true;
      const deg = Math.round(Math.abs(da) * (180 / Math.PI));
      if (Math.abs(deg - lastDeg) >= 2) {
        lastDeg = deg;
        angCtx.clearRect(0, 0, 256, 112);
        angCtx.fillStyle = 'rgba(255,255,255,0.94)';
        roundRectPath(angCtx, 4, 4, 248, 104, 52);
        angCtx.fill();
        angCtx.fillStyle = C.violet;
        angCtx.font = `600 56px ${MONO}`;
        angCtx.textAlign = 'center';
        angCtx.textBaseline = 'middle';
        angCtx.fillText(`${deg}°`, 128, 60);
        angTex.needsUpdate = true;
      }
      ang.position.set(p.kR.x + 0.62, p.kR.y + 0.12, zf);
      const deep = p.hC.y < p.kR.y + 0.02;
      depth.material.opacity = damp(depth.material.opacity, deep ? 1 : 0, 10, s.dt || 1);
      depth.position.set(p.hC.x - 0.4, p.hC.y + 0.55, zf);
      coach.material.opacity = easeOut(seg(s.t, 0.5, 0.6));
      scene.rotation.y = s.px * 0.15;
    },
  };
}
