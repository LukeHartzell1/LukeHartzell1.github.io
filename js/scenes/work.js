/* Education + Experience. Each role gets a small sculpture that acts out what
   I actually did there. Intros replay every time a chapter becomes active. */
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
import {
  THREE, C, M, stage, rig, damp, clamp, lerp, seg, loop, easeOut, easeInOut, easeOutBack, bounce,
  rbox, textTex, label, tag, shadow, sparkles, setInst, enhance, canvasTex, heartShape, rng, dotTex, roundRectPath, FONT, MONO,
} from '../kit.js';
import { crystal, phone, pixelShades, gradCap, person } from './builders.js';

const TAU = Math.PI * 2;

/* ======================================================================
   EDUCATION — Georgia Tech: a 4.0 built one course at a time
   ====================================================================== */
export function education(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [2.2, 3.4, 12.6], look: [0, 1.55, 0] });
  const tower = new THREE.Group();
  scene.add(tower);
  const courses = [
    ['Algorithms', C.lilac], ['Data Structures', C.sky], ['Intro to AI', C.pink],
    ['Object-Oriented Programming', C.mint], ['UI / UX', C.peach], ['Educational Technology', C.lilac2],
  ];
  const blocks = courses.map(([name, color], i) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(rbox(2.7, 0.46, 1.3, 0.13), M.ceramic(color, { roughness: 0.32 }));
    const txt = label(textTex(name, { w: 1024, h: 160, size: name.length > 20 ? 52 : 64, weight: 600 }), 2.5, 0.39);
    txt.position.z = 0.652;
    g.add(body, txt);
    g.userData.y = 0.25 + i * 0.5;
    g.userData.r = (i % 2 ? 0.16 : -0.12) + i * 0.02;
    tower.add(g);
    return g;
  });
  const cap = gradCap();
  cap.group.scale.setScalar(1.05);
  tower.add(cap.group);
  const capY = 0.25 + 5 * 0.5 + 0.24;

  const medalTex = canvasTex(512, 512, (g, w) => {
    const grd = g.createLinearGradient(0, 0, w, w);
    grd.addColorStop(0, '#F0F1F5');
    grd.addColorStop(1, '#D6DBE6');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(w / 2, w / 2, w / 2, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(46,75,255,0.35)';
    g.lineWidth = 10;
    g.beginPath();
    g.arc(w / 2, w / 2, w / 2 - 34, 0, TAU);
    g.stroke();
    g.fillStyle = C.ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `700 170px ${FONT}`;
    g.fillText('4.0', w / 2, w / 2 - 14);
    g.font = `500 44px ${MONO}`;
    g.fillStyle = C.violet;
    g.fillText('GPA', w / 2, w / 2 + 110);
  });
  const medalFace = new THREE.MeshPhysicalMaterial({ map: medalTex, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
  const medal = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.09, 64), [M.chrome('#E6E9F0'), medalFace, medalFace]);
  medal.rotation.set(Math.PI / 2, Math.PI / 2, 0);
  const medalHolder = new THREE.Group();
  medalHolder.add(medal);
  medalHolder.position.set(2.45, 2.55, 0.4);
  scene.add(medalHolder);
  const floor = shadow(5.2, 3.4, 0.2);
  floor.position.y = 0.0;
  scene.add(floor);
  const dust = sparkles(40, 3.6, { color: C.violet, size: 0.05, opacity: 0.45, seed: 11 });
  dust.position.set(0, 2, 0);
  scene.add(dust);

  return {
    scene, camera, posterT: 5,
    update(s) {
      cam(s);
      const { t } = s;
      blocks.forEach((b, i) => {
        const k = bounce(seg(t, 0.1 + i * 0.16, 0.75));
        b.position.y = b.userData.y + (1 - k) * 6.5;
        b.rotation.y = b.userData.r + (1 - k) * 0.9;
        b.visible = t > 0.1 + i * 0.16 - 0.02 || s.reduced;
      });
      const kc = easeOutBack(seg(t, 1.15, 0.8), 1.4);
      cap.group.position.y = capY + (1 - kc) * 4;
      cap.group.rotation.y = (1 - kc) * 2.4 + Math.sin(s.time * 0.6) * 0.12;
      cap.group.visible = t > 1.13 || s.reduced;
      cap.drop.rotation.z = Math.sin(s.time * 2.4) * (0.12 + 0.3 * (1 - seg(t, 1.6, 2)));
      cap.drop.rotation.x = Math.cos(s.time * 1.7) * 0.08;
      const km = easeOutBack(seg(t, 1.7, 0.7));
      medalHolder.scale.setScalar(Math.max(0.0001, km));
      medalHolder.rotation.y = Math.sin(s.time * 0.9) * 0.45 - 0.2;
      medalHolder.position.y = 2.55 + Math.sin(s.time * 1.3) * 0.08;
      tower.rotation.y = Math.sin(s.time * 0.32) * 0.22 + s.px * 0.25;
    },
  };
}

/* The two CoCo skills I built, as little props. */
function clapperboard() {
  const g = new THREE.Group();
  const slate = new THREE.Mesh(rbox(1.1, 0.78, 0.09, 0.06), M.gloss('#17171d', { roughness: 0.32 }));
  const face = label(textTex(['TAKE 01', 'auto-cut ✓'], { w: 512, h: 320, size: 62, weight: 600, mono: true, color: '#ffffff', lineHeight: 1.55 }), 0.95, 0.6);
  face.position.z = 0.047;
  const stripes = canvasTex(512, 96, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#17171d';
    for (let x = -h; x < w + h; x += 96) {
      c.beginPath();
      c.moveTo(x, h);
      c.lineTo(x + 48, h);
      c.lineTo(x + 48 + h * 0.6, 0);
      c.lineTo(x + h * 0.6, 0);
      c.closePath();
      c.fill();
    }
  });
  const stickMat = new THREE.MeshPhysicalMaterial({ map: stripes, roughness: 0.3, clearcoat: 0.6 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.16, 0.1), stickMat);
  base.position.y = 0.47;
  const hinge = new THREE.Group();
  hinge.position.set(-0.56, 0.56, 0);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.16, 0.1), stickMat);
  top.position.set(0.56, 0.08, 0);
  hinge.add(top);
  g.add(slate, face, base, hinge);
  g.userData.hinge = hinge;
  return g;
}
function demoScreen() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(rbox(1.3, 0.9, 0.07, 0.07), M.ceramic('#ffffff', { roughness: 0.28 }));
  const tex = canvasTex(640, 440, (c, w, h) => {
    c.fillStyle = '#F3F4F7';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, 56);
    ['#FF7EA5', '#FFD27A', '#8FE2C6'].forEach((col, i) => {
      c.fillStyle = col;
      c.beginPath();
      c.arc(30 + i * 26, 28, 8, 0, TAU);
      c.fill();
    });
    c.fillStyle = '#8a8f9c';
    c.font = `500 22px ${MONO}`;
    c.fillText('demo.app', 120, 36);
    c.fillStyle = '#D6DCE8';
    roundRectPath(c, 40, 92, 300, 26, 13);
    c.fill();
    c.fillStyle = '#E4E8F5';
    roundRectPath(c, 40, 132, 220, 18, 9);
    c.fill();
    [0.5, 0.8, 0.62, 0.95, 0.72].forEach((v, i) => {
      c.fillStyle = i === 3 ? '#2E4BFF' : '#B9C6EA';
      const bh = v * 160;
      roundRectPath(c, 40 + i * 58, 400 - bh, 40, bh, 8);
      c.fill();
    });
    c.fillStyle = '#2E4BFF';
    c.beginPath();
    c.arc(500, 250, 66, 0, TAU);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(482, 216);
    c.lineTo(482, 284);
    c.lineTo(536, 250);
    c.closePath();
    c.fill();
  });
  const screen = label(tex, 1.2, 0.82);
  screen.position.z = 0.037;
  const arrow = canvasTex(128, 128, (c) => {
    c.fillStyle = '#111114';
    c.strokeStyle = '#ffffff';
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(24, 12);
    c.lineTo(24, 104);
    c.lineTo(48, 82);
    c.lineTo(66, 118);
    c.lineTo(84, 110);
    c.lineTo(66, 74);
    c.lineTo(98, 72);
    c.closePath();
    c.stroke();
    c.fill();
  });
  const cursor = label(arrow, 0.22, 0.22);
  cursor.position.z = 0.05;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.075, 32), M.glow('#2E4BFF', { opacity: 0 }));
  ring.position.z = 0.045;
  g.add(body, screen, ring, cursor);
  g.userData = { cursor, ring };
  return g;
}

/* ======================================================================
   SNOWFLAKE — a crystal that grows its branches (adoption, 3×), orbited by
   the two agent skills I built for CoCo: a video editor and a demo maker
   ====================================================================== */
export function snowflakeRole(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [0, 0.6, 12.6], look: [0, 0.05, 0], fit: 1.05 });
  const holder = new THREE.Group();
  scene.add(holder);
  const cr = crystal({ arm: 1.95, thick: 0.08, holo: 0.9 });
  holder.add(cr.group);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.01, 8, 256), M.chrome('#c8cedb', { transparent: true, opacity: 0.45 }));
  holder.add(halo);
  // Gentle snowfall.
  const N = 140;
  const r = rng(5);
  const pos = new Float32Array(N * 3);
  const vel = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (r() - 0.5) * 9;
    pos[i * 3 + 1] = (r() - 0.5) * 7;
    pos[i * 3 + 2] = (r() - 0.5) * 4 - 0.5;
    vel[i] = 0.18 + r() * 0.35;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({
    size: 0.075, map: dotTex(), color: '#afc0f2', transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false,
  }));
  scene.add(snow);
  const clap = clapperboard();
  const demo = demoScreen();
  const sats = [
    { obj: clap, a0: 0.35, label: tag('agentic video editor', { size: 40, scale: 0.92 }) },
    { obj: demo, a0: 0.35 + Math.PI, label: tag('agentic demo maker', { size: 40, scale: 0.92 }) },
  ].map((st) => {
    const g = new THREE.Group();
    g.add(st.obj);
    st.label.position.y = -0.78;
    g.add(st.label);
    scene.add(g);
    return { ...st, g };
  });
  let spin = 0;
  let tx = 0;
  let ty = 0;
  let orbit = 0;
  return {
    scene, camera, posterT: 4,
    update(s) {
      cam(s);
      cr.setGrowth(s.reduced ? 1.3 : seg(s.t, 0, 2.3) * 1.3);
      spin += s.dt * (s.hover ? 0.5 : 0.12);
      tx = damp(tx, -s.py * 0.45, 3, s.dt);
      ty = damp(ty, s.px * 0.6, 3, s.dt);
      cr.group.rotation.set(tx, ty, spin);
      halo.rotation.set(tx * 0.6 + 0.2, ty * 0.6, 0);
      halo.scale.setScalar(0.7 + 0.3 * easeOut(seg(s.t, 0.6, 1.6)));
      holder.position.y = Math.sin(s.time * 0.8) * 0.06;
      orbit += s.dt * (s.hover ? 0.55 : 0.28);
      sats.forEach((st, i) => {
        const a = st.a0 + orbit;
        const k = easeOutBack(seg(s.t, 1.5 + i * 0.25, 0.8));
        st.g.position.set(Math.cos(a) * 2.5, -0.2 + Math.sin(a + 0.6) * 0.45, Math.sin(a) * 2.1 + 0.4);
        st.g.scale.setScalar(Math.max(0.0001, k * 0.92));
        st.obj.lookAt(camera.position);
        st.obj.rotateY(Math.sin(s.time * 0.9 + i) * 0.18);
        st.label.material.opacity = easeOut(seg(s.t, 2, 0.6));
      });
      // Clapperboard snaps shut every couple of seconds.
      const cp = s.reduced ? 0.6 : loop(s.time, 2.4);
      clap.userData.hinge.rotation.z = cp < 0.75 ? 0.5 * easeOut(cp / 0.75) : 0.5 * (1 - easeIn((cp - 0.75) / 0.25));
      // The demo maker's cursor drives to the play button and clicks.
      const dp = s.reduced ? 0.8 : loop(s.time + 0.7, 3.2);
      const tgt = dp < 0.55 ? easeInOut(dp / 0.55) : 1;
      demo.userData.cursor.position.set(lerp(-0.4, 0.38, tgt), lerp(-0.25, 0.0, tgt) - 0.06, 0.05);
      const click = clamp((dp - 0.6) / 0.3);
      demo.userData.ring.position.set(0.32, 0.0, 0.045);
      demo.userData.ring.scale.setScalar(1 + click * 2.4);
      demo.userData.ring.material.opacity = dp > 0.6 ? (1 - click) * 0.9 : 0;
      for (let i = 0; i < N; i++) {
        let y = pos[i * 3 + 1] - vel[i] * s.dt;
        if (y < -3.6) y = 3.6;
        pos[i * 3 + 1] = y;
        pos[i * 3] += Math.sin(s.time * 0.6 + i) * 0.002;
      }
      snowGeo.attributes.position.needsUpdate = true;
    },
  };
}

/* ======================================================================
   INTERVIEW PREPPER — a habit loop: practice cards riding a Möbius strip
   ====================================================================== */
export function habitLoop(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [0, 0.6, 12], look: [0, 0, 0] });
  const R = 1.75;
  const W = 0.9;
  const slices = 10;
  const stacks = 260;
  const geo = new ParametricGeometry((u, v, out) => {
    const a = v * TAU;
    const w = (u - 0.5) * W;
    out.set((R + w * Math.cos(a / 2)) * Math.cos(a), (R + w * Math.cos(a / 2)) * Math.sin(a), w * Math.sin(a / 2));
  }, slices, stacks);
  const stops = [new THREE.Color(C.lilac), new THREE.Color(C.pink), new THREE.Color(C.sky), new THREE.Color(C.lilac)];
  const col = new Float32Array(geo.attributes.position.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const v = Math.floor(i / (slices + 1)) / stacks;
    const f = v * 3;
    const j = Math.min(2, Math.floor(f));
    tmp.copy(stops[j]).lerp(stops[j + 1], f - j);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const strip = new THREE.Mesh(geo, enhance(M.gloss('#ffffff', { vertexColors: true, side: THREE.DoubleSide, roughness: 0.2 }), { holo: 0.35 }));
  const group = new THREE.Group();
  group.add(strip);
  scene.add(group);

  const kinds = [['Q', C.violet], ['B', '#4f8df0'], ['V', '#e2569b']];
  const cards = [];
  for (let i = 0; i < 9; i++) {
    const [ch, colr] = kinds[i % 3];
    const g = new THREE.Group();
    const body = new THREE.Mesh(rbox(0.46, 0.32, 0.07, 0.06), M.gloss('#ffffff'));
    const face = label(textTex(ch, { w: 128, h: 128, size: 78, weight: 700, color: '#ffffff', bg: colr, radius: 30 }), 0.2, 0.2);
    face.position.set(-0.1, 0, 0.037);
    const line = new THREE.Mesh(rbox(0.16, 0.035, 0.01, 0.012), M.flat('#d7dae1'));
    line.position.set(0.1, 0.04, 0.037);
    const line2 = line.clone();
    line2.position.y = -0.03;
    line2.scale.x = 0.7;
    g.add(body, face, line, line2);
    g.userData.off = i / 9;
    group.add(g);
    cards.push(g);
  }
  const T = new THREE.Vector3();
  const Wd = new THREE.Vector3();
  const Nn = new THREE.Vector3();
  const P = new THREE.Vector3();
  const mtx = new THREE.Matrix4();
  let flow = 0;
  let speed = 1;
  const floor = shadow(5, 2.4, 0.14);
  floor.position.y = -2.6;
  scene.add(floor);

  return {
    scene, camera, posterT: 4,
    update(s) {
      cam(s);
      const reveal = s.reduced ? 1 : easeInOut(seg(s.t, 0, 1.6));
      geo.setDrawRange(0, Math.floor(geo.index.count * reveal / 6) * 6);
      speed = damp(speed, s.hover ? 2.6 : 1, 3, s.dt);
      flow += s.dt * 0.055 * speed;
      group.rotation.set(-0.95 + s.py * 0.2, Math.sin(s.time * 0.3) * 0.2 + s.px * 0.35, s.time * 0.05);
      cards.forEach((c, i) => {
        const v = (c.userData.off + flow) % 1;
        const a = v * TAU;
        const vis = reveal >= 0.999 ? 1 : 0;
        P.set(R * Math.cos(a), R * Math.sin(a), 0);
        T.set(-Math.sin(a), Math.cos(a), 0);
        Wd.set(Math.cos(a / 2) * Math.cos(a), Math.cos(a / 2) * Math.sin(a), Math.sin(a / 2));
        Nn.crossVectors(T, Wd).normalize();
        mtx.makeBasis(T, Wd, Nn);
        c.quaternion.setFromRotationMatrix(mtx);
        c.position.copy(P).addScaledVector(Nn, 0.075);
        const k = easeOutBack(seg(s.t, 1.4 + i * 0.07, 0.5));
        c.scale.setScalar(Math.max(0.0001, s.reduced ? 1 : k * vis));
      });
    },
  };
}

/* ======================================================================
   TIKTOK — my face on a phone, pixel shades dropping on cue, hearts rising
   ====================================================================== */
export function arPhone(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [0, 0.3, 11.5], look: [0, 0.05, 0] });
  const ph = phone();
  const root = new THREE.Group();
  root.add(ph.group);
  scene.add(root);
  const rx = (ph.sw / ph.sh) / (820 / 1024);
  const off = (1 - rx) / 2;
  const x1 = (0.321 - off) / rx;
  const x2 = (0.731 - off) / rx;
  const shadesW = (x2 - x1) * ph.sw;
  const shades = pixelShades({ px: shadesW / 14, depth: 0.06 });
  const shadeHome = new THREE.Vector3(((x1 + x2) / 2 - 0.5) * ph.sw, (0.5 - 0.378) * ph.sh, 0.2);
  root.add(shades);

  const heartGeo = new THREE.ExtrudeGeometry(heartShape(0.16), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 18 });
  heartGeo.center();
  const hearts = [];
  const hc = [C.rose, C.pink, '#ff9ec2', C.lilac];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(heartGeo, M.gloss(hc[i % hc.length]));
    m.userData.off = i / 8;
    m.userData.x = 0.95 + (i % 3) * 0.22;
    scene.add(m);
    hearts.push(m);
  }
  const floor = shadow(3.4, 1.6, 0.2);
  floor.position.y = -1.9;
  scene.add(floor);
  let ry = 0;
  return {
    scene, camera, posterT: 2.2,
    update(s) {
      cam(s);
      const { t } = s;
      const kin = easeOutBack(seg(t, 0, 0.9), 1.3);
      root.scale.setScalar(Math.max(0.0001, 0.6 + 0.4 * kin));
      ry = damp(ry, Math.sin(s.time * 0.55) * 0.28 + s.px * 0.35, 3, s.dt);
      root.rotation.set(-0.06 + s.py * 0.12, ry, 0);
      root.position.y = Math.sin(s.time * 0.9) * 0.05;
      // Deal with it: drop, hold, lift. Hovering keeps them on.
      const cyc = s.reduced ? 0.5 : loop(Math.max(0, t - 0.6), 5.2);
      let dy = 0;
      let sc = 1;
      if (!s.hover) {
        if (cyc < 0.2) dy = (1 - bounce(cyc / 0.2)) * 2.4;
        else if (cyc > 0.86) {
          const k = (cyc - 0.86) / 0.14;
          dy = easeInOut(k) * 2.4;
          sc = 1 - k;
        }
      }
      shades.position.set(shadeHome.x, shadeHome.y + dy, shadeHome.z);
      shades.scale.setScalar(Math.max(0.0001, sc));
      shades.visible = t > 0.6 || s.reduced;
      hearts.forEach((h, i) => {
        const p = loop(s.time * 0.32 + h.userData.off, 1);
        h.position.set(h.userData.x + Math.sin(p * 9 + i) * 0.12, -1.25 + p * 3.1, 0.3 + (i % 2) * 0.15);
        const a = Math.sin(Math.PI * p);
        h.scale.setScalar(Math.max(0.0001, a * (0.8 + (i % 3) * 0.15)) * (s.reduced ? (i < 3 ? 1 : 0.0001) : 1));
        h.rotation.set(0, Math.sin(p * 6 + i) * 0.5, Math.sin(p * 5) * 0.3);
      });
    },
  };
}

/* ======================================================================
   AWS — events stream in, a λ router drops the noise, signal reaches on-call
   ====================================================================== */
export function router(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [0.4, 1.2, 12.4], look: [0.15, 0.1, 0], fit: 1.35 });
  const cin = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.6, 1.35, 0), new THREE.Vector3(-2.7, 1.25, 0.25), new THREE.Vector3(-1.5, 0.55, 0.2), new THREE.Vector3(-0.66, 0.08, 0),
  ]);
  const cout = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.66, -0.05, 0), new THREE.Vector3(1.45, -0.45, -0.1), new THREE.Vector3(2.35, -0.66, 0.12), new THREE.Vector3(3.05, -0.66, 0),
  ]);
  const glass = M.glass('#ffffff', { opacity: 0.22 });
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(cin, 80, 0.15, 20, false), glass));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(cout, 80, 0.15, 20, false), glass));
  const box = new THREE.Mesh(rbox(1.3, 1.3, 1.3, 0.3, 6), enhance(M.pearl('#EBEDF2'), { holo: 0.7 }));
  scene.add(box);
  const lam = label(textTex('λ', { w: 256, h: 256, size: 190, weight: 500, color: C.violet }), 0.78, 0.78);
  lam.position.z = 0.66;
  box.add(lam);
  const pager = new THREE.Group();
  const pb = new THREE.Mesh(rbox(0.72, 0.98, 0.24, 0.14), M.ceramic('#ffffff'));
  const screen = label(textTex(['ON', 'CALL'], { w: 256, h: 300, size: 64, weight: 600, mono: true, color: C.mint, bg: '#131318', radius: 36 }), 0.52, 0.6);
  screen.position.z = 0.125;
  pager.add(pb, screen);
  pager.position.set(3.6, -0.62, 0);
  scene.add(pager);
  const tray = new THREE.Mesh(rbox(1.25, 0.14, 0.9, 0.06), M.glass('#ffd6e5', { opacity: 0.45 }));
  tray.position.set(0, -1.62, 0);
  scene.add(tray);
  const noiseTag = tag('noise ↓ dropped', { size: 40, color: '#E2461C', scale: 1.5 });
  noiseTag.position.set(0, -2.2, 0.3);
  const evTag = tag('events', { size: 40, scale: 1.5 });
  evTag.position.set(-3.1, 2.05, 0.2);
  scene.add(noiseTag, evTag);

  const N = 34;
  const parts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 18, 12), M.gloss('#ffffff'), N);
  const r = rng(9);
  const info = [];
  const cSignal = [new THREE.Color(C.violet), new THREE.Color('#5d93f5')];
  const cNoise = new THREE.Color(C.rose);
  for (let i = 0; i < N; i++) {
    const noise = r() < 0.55;
    info.push({ off: i / N + r() * 0.01, noise, jx: (r() - 0.5) * 0.12, jy: (r() - 0.5) * 0.12 });
    parts.setColorAt(i, noise ? cNoise : cSignal[i % 2]);
  }
  parts.instanceColor.needsUpdate = true;
  scene.add(parts);
  const floor = shadow(7, 2.6, 0.12);
  floor.position.y = -2.4;
  scene.add(floor);
  const P = new THREE.Vector3();
  let speed = 1;
  let flow = 0;
  let pulse = 0;
  const lastPhase = new Float32Array(N);
  return {
    scene, camera, posterT: 6,
    update(s) {
      cam(s);
      speed = damp(speed, s.hover ? 1.9 : 1, 3, s.dt);
      flow += s.dt * 0.2 * speed;
      const kin = easeOutBack(seg(s.t, 0, 0.8));
      box.scale.setScalar(Math.max(0.0001, kin));
      box.rotation.set(0.25 + s.py * 0.15, -0.5 + Math.sin(s.time * 0.5) * 0.25 + s.px * 0.3, 0);
      for (let i = 0; i < N; i++) {
        const I = info[i];
        const ph = (I.off + flow) % 1;
        let sc = 1;
        if (ph < 0.42) {
          cin.getPointAt(ph / 0.42, P);
          P.x += I.jx * 0.3;
          P.y += I.jy * 0.3;
        } else if (ph < 0.5) {
          P.set(0, 0, 0);
          sc = 0.0001;
        } else if (!I.noise) {
          cout.getPointAt(Math.min(1, (ph - 0.5) / 0.46), P);
          if (ph > 0.96) sc = 0.0001;
          if (lastPhase[i] < 0.96 && ph >= 0.96) pulse = 1;
        } else {
          const k = (ph - 0.5) / 0.5;
          const f = Math.min(1, k / 0.45);
          P.set(I.jx * 3, -0.66 - easeIn(f) * 0.9, I.jy * 2);
          sc = f < 1 ? 1 - f * 0.3 : 0.0001;
        }
        lastPhase[i] = ph;
        if (s.t < 0.6) sc = 0.0001;
        setInst(parts, i, P.x, P.y, P.z, 0, 0, 0, sc);
      }
      parts.instanceMatrix.needsUpdate = true;
      pulse = damp(pulse, 0, 4, s.dt);
      pager.scale.setScalar(1 + pulse * 0.12);
      pager.rotation.y = -0.35 + Math.sin(s.time * 0.8) * 0.1;
    },
  };
}
function easeIn(t) { return t * t; }

/* ======================================================================
   CHAMBERLAIN — a garage door of test cases: scan, escalate 2 bugs, ship
   ====================================================================== */
export function garage(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [2.6, 3.0, 11.6], look: [0, 1.55, 0] });
  const frameMat = M.ceramic('#ffffff', { roughness: 0.35 });
  const postL = new THREE.Mesh(rbox(0.26, 3.4, 0.36, 0.08), frameMat);
  postL.position.set(-1.68, 1.7, 0);
  const postR = postL.clone();
  postR.position.x = 1.68;
  const header = new THREE.Mesh(rbox(3.7, 0.42, 0.4, 0.1), frameMat);
  header.position.set(0, 3.42, 0.02);
  const slab = new THREE.Mesh(rbox(4.6, 0.12, 2.2, 0.05), M.ceramic('#ECEEF3'));
  slab.position.set(0, -0.06, 0.2);
  scene.add(postL, postR, header, slab);
  const glowTex = canvasTex(1024, 1024, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#C9D5FF');
    grd.addColorStop(1, '#FFC9E3');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `700 120px ${FONT}`;
    g.fillText('SHIP IT', w / 2, h / 2 - 50);
    g.font = `500 54px ${MONO}`;
    g.fillText('suite: 62% faster ✓', w / 2, h / 2 + 80);
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.2), new THREE.MeshBasicMaterial({ map: glowTex, toneMapped: false }));
  glow.position.set(0, 1.62, -0.25);
  scene.add(glow);

  const grey = new THREE.Color('#D3D6DE');
  const mint = new THREE.Color('#41c79a');
  const rose = new THREE.Color('#FF5A3C');
  const slats = [];
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(rbox(3.08, 0.36, 0.11, 0.05), M.ceramic('#ffffff', { roughness: 0.3 }));
    const dotMat = M.gloss('#D3D6DE');
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), dotMat);
    dot.position.set(-1.28, 0, 0.07);
    const l1 = new THREE.Mesh(rbox(1.5, 0.05, 0.02, 0.02), M.flat('#e3e5ea'));
    l1.position.set(-0.3, 0.05, 0.062);
    const l2 = new THREE.Mesh(rbox(0.9, 0.05, 0.02, 0.02), M.flat('#eaebef'));
    l2.position.set(-0.6, -0.06, 0.062);
    g.add(body, dot, l1, l2);
    g.userData = { y: 0.24 + i * 0.39, dotMat, bug: i === 2 || i === 5 };
    scene.add(g);
    slats.push(g);
  }
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.06), M.glow('#7ef0c6', { opacity: 0.8 }));
  scan.position.z = 0.12;
  scene.add(scan);
  const bugTag = tag('2 critical bugs escalated', { size: 38, color: '#E2461C', scale: 0.9 });
  bugTag.position.set(1.15, 4.05, 0.4);
  scene.add(bugTag);
  const floor = shadow(5, 2.8, 0.16);
  floor.position.y = 0.0;
  scene.add(floor);
  const P = 8.6;
  return {
    scene, camera, posterT: 0.6 + P * 0.62,
    update(s) {
      cam(s);
      const t = s.t;
      const c = s.reduced ? 0.62 : loop(Math.max(0, t - 0.4), P);
      const tt = c * P;
      const lift = tt < 3.9 ? 0 : tt < 5.0 ? easeInOut((tt - 3.9) / 1.1) : tt < 6.9 ? 1 : tt < 7.9 ? 1 - easeInOut((tt - 6.9) / 1.0) : 0;
      slats.forEach((g, i) => {
        const j = 7 - i;
        const hit = 0.3 + j * 0.24;
        const ud = g.userData;
        let state = tt > hit ? (ud.bug ? 'bug' : 'pass') : 'idle';
        if (ud.bug && tt > 2.75) state = 'pass';
        if (tt > 7.9) state = 'idle';
        const target = state === 'pass' ? mint : state === 'bug' ? rose : grey;
        ud.dotMat.color.lerp(target, s.reduced ? 1 : 1 - Math.exp(-12 * s.dt));
        const pop = ud.bug ? easeOutBack(seg(tt, hit, 0.35)) * (1 - easeInOut(seg(tt, 2.5, 0.5))) : 0;
        const y = ud.y + lift * 3.3;
        g.position.set(0, y, pop * 0.55);
        g.rotation.x = -pop * 0.12;
        const hide = clamp((y - 3.2) / 0.25);
        g.scale.set(1, Math.max(0.0001, 1 - hide), 1);
        g.visible = hide < 1;
      });
      const sp = seg(tt, 0.2, 2.1);
      scan.position.y = 3.15 - sp * 3.0;
      scan.material.opacity = sp > 0 && sp < 1 ? 0.85 : 0;
      bugTag.material.opacity = clamp(Math.min(seg(tt, 0.9, 0.4), 1 - seg(tt, 3.0, 0.4)));
      glow.material.color.setScalar(0.75 + 0.25 * lift);
      const intro = easeOutBack(seg(t, 0, 0.8), 1.2);
      scene.scale.setScalar(Math.max(0.0001, 0.7 + 0.3 * intro));
    },
  };
}

/* ======================================================================
   TEACHING ASSISTANT — 900 students; help ripples out from the front
   ====================================================================== */
export function hall(env) {
  const { scene, camera } = stage(env, { fov: 34 });
  const cam = rig(camera, { pos: [0, 5.4, 8.6], look: [0, 0.3, -2.7], px: 0.6, py: 0.3 });
  const rows = 20;
  const span = 2.3;
  const radii = Array.from({ length: rows }, (_, r) => 1.7 + r * 0.205);
  const total = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((R) => Math.round((R / total) * 900));
  counts[rows - 1] += 900 - counts.reduce((a, b) => a + b, 0);
  const seats = [];
  radii.forEach((R, r) => {
    const n = counts[r];
    for (let i = 0; i < n; i++) {
      const th = -span / 2 + (span * (i + 0.5)) / n;
      seats.push({ x: Math.sin(th) * R, z: -Math.cos(th) * R, y: r * 0.12, d: R, r });
    }
  });
  const mesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.048, 0.07, 4, 10), M.ceramic('#ffffff', { roughness: 0.35 }), seats.length);
  const pal = [C.white, C.white, C.lilac2, C.mist, C.pink, C.sky].map((h) => new THREE.Color(h));
  const rr = rng(13);
  seats.forEach((st) => { st.c = pal[Math.floor(rr() * pal.length)]; });
  const hot = new THREE.Color('#2E4BFF');
  const hot2 = new THREE.Color('#5ed3a8');
  const tmp = new THREE.Color();
  scene.add(mesh);
  const tiers = new THREE.Group();
  for (let r = 0; r < rows; r += 2) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radii[r] - 0.12, radii[Math.min(rows - 1, r + 1)] + 0.12, 64, 1, Math.PI / 2 - span / 2 - 0.05, span + 0.1),
      M.ceramic(r % 4 ? '#f1f2f5' : '#e9ebf0', { side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = r * 0.12 - 0.07;
    tiers.add(ring);
  }
  scene.add(tiers);
  const podium = new THREE.Mesh(rbox(0.7, 0.5, 0.42, 0.08), M.ceramic(C.lilac));
  podium.position.set(0, 0.2, 0.25);
  const ta = person({ mat: M.gloss(C.violet) });
  ta.scale.setScalar(0.42);
  ta.position.set(0.55, 0, 0.35);
  scene.add(podium, ta);
  const lbl = tag('900 students', { size: 46, scale: 1.1 });
  lbl.position.set(0, 3.2, -3.4);
  scene.add(lbl);
  const floor = shadow(10, 7, 0.1);
  floor.position.set(0, -0.08, -2.5);
  scene.add(floor);
  const W = 3.4;
  return {
    scene, camera, posterT: 1.7,
    update(s) {
      cam(s);
      const t = s.t;
      const wave = s.reduced ? 2.6 : loop(Math.max(0, t - 0.4), W) * W * 2.6;
      const intro = s.reduced ? 1 : seg(t, 0, 1.2);
      seats.forEach((st, i) => {
        const appear = easeOutBack(clamp((intro * 1.4 - st.r / rows)));
        const dd = st.d - wave;
        const inf = Math.exp(-(dd * dd) / 0.09) * (wave > 0.2 ? 1 : 0);
        setInst(mesh, i, st.x, st.y + 0.1 + inf * 0.16, st.z, 0, 0, 0, Math.max(0.0001, appear));
        tmp.copy(st.c).lerp(st.r % 2 ? hot : hot2, Math.min(1, inf * 1.1));
        mesh.setColorAt(i, tmp);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      ta.rotation.y = Math.PI + Math.sin(s.time * 1.2) * 0.3;
      ta.position.y = Math.abs(Math.sin(s.time * 2.4)) * 0.03;
      lbl.material.opacity = easeOut(seg(t, 1, 0.6));
    },
  };
}
