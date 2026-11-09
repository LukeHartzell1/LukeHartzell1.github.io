/* The two Georgia Tech VIP roles, each acting out the product I built.
   studyBuddy: StudyBuddy, the AI note-taking and lecture assistant. A lecture
     is recorded and its slide OCR-scanned, the capture streams into a GPU rack
     (it ran on Georgia Tech's NVIDIA AI supercomputer), and notes write
     themselves (summary and tags included), then go out to students' phones.
   tutor: the AI-enhanced Data Structures & Algorithms modules. A student's
     BST insert is missing its base case; the tutor bot hints in chat, the fix
     types in and the tests pass, the key drops into the tree, and a quiz card
     checks the idea. */
import {
  THREE, M, rig, stage, damp, clamp, lerp, seg, loop, easeOut, easeInOut, easeOutBack,
  rbox, canvasTex, dotTex, sprite, shadow, rng, roundRectPath, setInst, FONT, MONO,
} from '../kit.js';

const TAU = Math.PI * 2;

/* ---------- shared helpers ---------- */
const box = (w, h, d, mat, r) => new THREE.Mesh(rbox(w, h, d, r ?? Math.min(w, h, d) * 0.2), mat);
const put = (parent, obj, x = 0, y = 0, z = 0) => {
  obj.position.set(x, y, z);
  parent.add(obj);
  return obj;
};

/* A line of text drawn in colored runs: [[text, color, weight?], ...]. */
function runsTex(runs, { w = 1024, h = 64, size = 34, mono = true, pad = 10, bg = null } = {}) {
  return canvasTex(w, h, (g) => {
    if (bg) {
      g.fillStyle = bg;
      roundRectPath(g, 0, 0, w, h, h * 0.22);
      g.fill();
    }
    g.textBaseline = 'middle';
    let x = pad;
    for (const [txt, col, weight = 500] of runs) {
      g.font = `${weight} ${size}px ${mono ? MONO : FONT}`;
      g.fillStyle = col;
      g.fillText(txt, x, h / 2 + 2);
      x += g.measureText(txt).width;
    }
  });
}

/* A flat strip whose left edge is the pivot, so it can be "written" from left
   to right: reveal(k) shows the first k of it without squashing the text. */
function strip(tex, w, h, o = {}) {
  const geo = new THREE.PlaneGeometry(w, h);
  geo.translate(w / 2, 0, 0);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false, ...o });
  const m = new THREE.Mesh(geo, mat);
  m.reveal = (k) => {
    const v = clamp(k);
    m.scale.x = Math.max(0.0001, v);
    tex.repeat.x = Math.max(0.0001, v);
    m.visible = v > 0.001;
  };
  return m;
}

/* A pill with a word on it, as a sprite-like plane. */
function pill(text, { color = '#2E4BFF', bg = '#ffffff', w = 1.2, h = 0.32, size = 40, mono = true, border = null } = {}) {
  const tex = canvasTex(512, 136, (g, cw, ch) => {
    g.fillStyle = bg;
    roundRectPath(g, 4, 4, cw - 8, ch - 8, (ch - 8) / 2);
    g.fill();
    if (border) {
      g.strokeStyle = border;
      g.lineWidth = 5;
      g.stroke();
    }
    g.fillStyle = color;
    g.font = `600 ${size * 1.6}px ${mono ? MONO : FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, cw / 2, ch / 2 + 3);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
}

/* ======================================================================
   STUDYBUDDY
   ====================================================================== */
function lectureTex() {
  return canvasTex(1024, 640, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2E5BFF';
    g.font = `600 30px ${MONO}`;
    g.fillText('LEC 14', 70, 92);
    g.fillStyle = '#121A2B';
    g.font = `700 70px ${FONT}`;
    g.fillText('Hash Tables', 70, 172);
    // Handwritten-ish notes on the slide.
    g.strokeStyle = '#B7C2DA';
    g.lineWidth = 7;
    g.lineCap = 'round';
    const r = rng(5);
    for (let y = 250; y < 560; y += 62) {
      g.beginPath();
      g.moveTo(70, y);
      let x = 70;
      const end = 420 + r() * 160;
      while (x < end) {
        const nx = x + 22 + r() * 26;
        g.quadraticCurveTo((x + nx) / 2, y - 9 + r() * 18, nx, y);
        x = nx;
      }
      g.stroke();
    }
    // The diagram: keys hashed into buckets.
    g.strokeStyle = '#2E5BFF';
    g.lineWidth = 6;
    g.font = `500 28px ${MONO}`;
    for (let i = 0; i < 5; i++) {
      const y = 240 + i * 66;
      g.strokeRect(700, y, 150, 48);
      g.fillStyle = '#2E5BFF';
      g.fillText(String(i), 670, y + 33);
      if (i === 1 || i === 3) {
        g.beginPath();
        g.moveTo(850, y + 24);
        g.lineTo(900, y + 24);
        g.stroke();
        g.strokeRect(900, y + 6, 54, 36);
      }
    }
  });
}

function rackTex() {
  return canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#0E1322';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#7EF0C6';
    g.font = `600 30px ${MONO}`;
    g.textBaseline = 'middle';
    g.fillText('GPU', 18, h / 2 + 2);
    g.fillStyle = '#3B4566';
    for (let i = 0; i < 9; i++) g.fillRect(110 + i * 15, 18, 8, 28);
  });
}

function phoneNoteTex() {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2E5BFF';
    g.fillRect(0, 0, w, 46);
    g.fillStyle = '#ffffff';
    g.fillRect(14, 18, 54, 10);
    g.fillStyle = '#121A2B';
    g.fillRect(14, 66, 86, 14);
    g.fillStyle = '#C8D0E2';
    for (let i = 0; i < 5; i++) g.fillRect(14, 100 + i * 24, 60 + ((i * 37) % 40), 9);
    g.fillStyle = '#E3EBFF';
    g.fillRect(10, 222, w - 20, 22);
  });
}

export function studyBuddy(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [0.3, 1.6, 13.2], look: [0.15, 0.1, 0], fit: 0.9 });
  const root = new THREE.Group();
  scene.add(root);

  // 1. The lecture: a slide being recorded, its audio, and the OCR beam.
  const lecture = put(root, new THREE.Group(), -1.55, 1.3, 0);
  put(lecture, box(2.62, 1.66, 0.08, M.ceramic('#ffffff', { roughness: 0.35 }), 0.06));
  const slide = put(lecture, new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.56), new THREE.MeshBasicMaterial({ map: lectureTex(), toneMapped: false })), 0, 0, 0.042);
  const rec = put(lecture, new THREE.Group(), -0.95, 0.98, 0.06);
  put(rec, box(0.56, 0.2, 0.04, M.gloss('#121A2B'), 0.08));
  const recDot = put(rec, new THREE.Mesh(new THREE.CircleGeometry(0.045, 24), M.flat('#FF4D4D')), -0.17, 0, 0.022);
  const recTxt = put(rec, new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), new THREE.MeshBasicMaterial({
    map: runsTex([['REC', '#ffffff', 600]], { w: 192, h: 64, size: 40, pad: 6 }), transparent: true, toneMapped: false,
  })), 0.06, 0, 0.022);
  recTxt.renderOrder = 1;
  const beam = put(lecture, new THREE.Mesh(new THREE.PlaneGeometry(2.56, 0.05), M.glow('#4BE3A6', { opacity: 0 })), 0, 0, 0.07);
  const beamGlow = put(beam, sprite(dotTex(), 2.9, 0.4, { color: '#4BE3A6', opacity: 0, blending: THREE.AdditiveBlending }), 0, 0, 0.01);
  const WAVE = 26;
  const wave = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.gloss('#2E5BFF'), WAVE);
  put(lecture, wave, 0, -1.08, 0);
  const setBar = (i, hgt) => setInst(wave, i, -1.2 + (i / (WAVE - 1)) * 2.4, 0, 0, 0, 0, 0, 0.05, Math.max(0.0001, hgt), 0.05);

  // 2. The GPU rack it all runs on.
  const rack = put(root, new THREE.Group(), -1.45, -1.55, 0.1);
  put(rack, box(1.55, 1.05, 0.95, M.ceramic('#1A2034', { roughness: 0.45 }), 0.07));
  put(rack, new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: rackTex(), toneMapped: false })), -0.32, 0.36, 0.48);
  const leds = [];
  for (let i = 0; i < 4; i++) {
    put(rack, box(1.3, 0.13, 0.04, M.ceramic('#262E48', { roughness: 0.4 }), 0.02), 0, 0.15 - i * 0.19, 0.49);
    const led = put(rack, box(0.5, 0.035, 0.02, new THREE.MeshBasicMaterial({ color: '#7EF0C6', toneMapped: false, transparent: true, opacity: 0.25 }), 0.01), 0.3, 0.15 - i * 0.19, 0.52);
    leds.push(led);
  }
  const rackGlow = put(rack, sprite(dotTex(), 2.6, 1.6, { color: '#4BE3A6', opacity: 0, blending: THREE.AdditiveBlending }), 0, 0, 0.55);

  // 3. The notes StudyBuddy writes.
  const notes = put(root, new THREE.Group(), 1.5, 0.45, 0.35);
  notes.rotation.y = -0.18;
  put(notes, box(2.25, 2.85, 0.06, M.ceramic('#ffffff', { roughness: 0.4 }), 0.07));
  const head = put(notes, new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.32), new THREE.MeshBasicMaterial({
    map: runsTex([['● ', '#4BE3A6', 700], ['StudyBuddy', '#ffffff', 600]], { w: 672, h: 104, size: 46, mono: false, pad: 30, bg: '#2E5BFF' }), transparent: true, toneMapped: false,
  })), 0, 1.18, 0.035);
  head.renderOrder = 1;
  const L = -0.95;
  const lines = [
    { m: strip(runsTex([['Hash Tables', '#121A2B', 700]], { size: 50, mono: false, w: 512, h: 64 }), 1.95, 0.244), y: 0.76, at: 3.0 },
    { m: strip(runsTex([['• ', '#2E5BFF', 700], ['keys → buckets', '#37425A']], { size: 38, mono: false, w: 512, h: 64 }), 1.95, 0.244), y: 0.42, at: 3.45 },
    { m: strip(runsTex([['• ', '#2E5BFF', 700], ['lookup: O(1)', '#37425A']], { size: 38, mono: false, w: 512, h: 64 }), 1.95, 0.244), y: 0.14, at: 3.85 },
    { m: strip(runsTex([['• ', '#2E5BFF', 700], ['collisions chain', '#37425A']], { size: 38, mono: false, w: 512, h: 64 }), 1.95, 0.244), y: -0.14, at: 4.25 },
  ];
  lines.forEach((ln) => put(notes, ln.m, L, ln.y, 0.036));
  const sumBox = put(notes, new THREE.Group(), 0, -0.68, 0.036);
  put(sumBox, new THREE.Mesh(new THREE.PlaneGeometry(1.95, 0.72), M.flat('#E8EEFF')));
  put(sumBox, new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.72), M.flat('#2E5BFF')), -0.96, 0, 0.001);
  const sumText = put(sumBox, strip(runsTex([['Summary', '#2E5BFF', 700]], { size: 36, mono: false, w: 512, h: 64 }), 1.75, 0.219), -0.86, 0.15, 0.002);
  const sumText2 = put(sumBox, strip(runsTex([['avg O(1), worst O(n)', '#121A2B', 600]], { size: 36, mono: false, w: 512, h: 64 }), 1.75, 0.219), -0.86, -0.13, 0.002);
  const tags = [['#hashing', '#2E5BFF'], ['#O(1)', '#1F9D74'], ['#collisions', '#D6457A']].map(([t, c], i) => {
    const p = pill(t, { color: c, bg: '#ffffff', border: c, w: 1.05, h: 0.28, size: 34 });
    p.userData.to = new THREE.Vector3(-0.78 + i * 0.86, 1.72 + (i % 2) * 0.14, 0.1);
    put(notes, p, 0, 0.6, 0.1);
    return p;
  });

  // 4. The students: phones that light up as the notes arrive.
  const PH = 5;
  const noteTex = phoneNoteTex();
  const phones = [...Array(PH)].map((_, i) => {
    const g = put(root, new THREE.Group(), 0.35 + i * 0.62, -1.95 + Math.sin(i * 1.3) * 0.04, 0.9 + (i % 2) * 0.12);
    g.rotation.set(-0.2, -0.3 + i * 0.06, (i - 2) * -0.04);
    put(g, box(0.4, 0.76, 0.05, M.ceramic('#F4F6FA', { roughness: 0.3 }), 0.07));
    const scr = put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.66), new THREE.MeshBasicMaterial({ color: '#C9D3EA', toneMapped: false })), 0, 0, 0.027);
    put(g, box(0.1, 0.025, 0.01, M.gloss('#1A2034'), 0.01), 0, 0.3, 0.03);
    const lit = put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.66), new THREE.MeshBasicMaterial({ map: noteTex, transparent: true, opacity: 0, toneMapped: false })), 0, 0, 0.029);
    const fly = put(root, new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.34), new THREE.MeshBasicMaterial({ map: noteTex, transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide })), 0, 0, 0);
    return { g, scr, lit, fly, at: 6.2 + i * 0.2 };
  });

  // Streams: lecture to rack, rack to notes.
  const curves = [
    new THREE.CatmullRomCurve3([new THREE.Vector3(-1.55, 0.25, 0.1), new THREE.Vector3(-1.75, -0.4, 0.4), new THREE.Vector3(-1.45, -0.98, 0.6)]),
    new THREE.CatmullRomCurve3([new THREE.Vector3(-0.66, -1.45, 0.6), new THREE.Vector3(-0.1, -1.0, 0.8), new THREE.Vector3(0.45, -0.1, 0.5)]),
  ];
  const SN = 30;
  const streams = curves.map((c, k) => {
    const pos = new Float32Array(SN * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.11, map: dotTex(), color: k ? '#2E5BFF' : '#4BE3A6', transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
    }));
    pts.frustumCulled = false;
    root.add(pts);
    return { c, pos, geo, pts };
  });
  const floor = shadow(8, 3.4, 0.16, '#1B2A55');
  floor.position.y = -2.4;
  scene.add(floor);

  const P = 9.6;
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  return {
    scene,
    camera,
    posterT: 0.4 + 6.9,
    update(s) {
      cam(s);
      const tt = s.reduced ? 6.9 : loop(Math.max(0, s.t - 0.4), P) * P;
      const kin = easeOutBack(seg(s.t, 0, 0.9), 1.3);
      root.scale.setScalar(Math.max(0.0001, kin));
      root.rotation.y = s.px * 0.12 + Math.sin(s.time * 0.3) * 0.05;
      const out = 1 - easeInOut(seg(tt, 8.6, 0.8)); // everything resets at the end

      // Recording + OCR.
      const recOn = tt < 2.6;
      recDot.material.color.set(recOn && Math.sin(s.time * 6) > -0.2 ? '#FF4D4D' : '#5A2430');
      for (let i = 0; i < WAVE; i++) {
        const n = 0.5 + 0.5 * Math.sin(s.time * 7 + i * 1.7) * Math.sin(s.time * 3.1 + i * 0.6);
        setBar(i, recOn ? 0.06 + n * 0.32 : 0.04);
      }
      wave.instanceMatrix.needsUpdate = true;
      const sc = seg(tt, 0.3, 1.8);
      beam.position.y = 0.76 - easeInOut(sc) * 1.52;
      beam.material.opacity = sc > 0 && sc < 1 ? 0.95 : 0;
      beamGlow.material.opacity = sc > 0 && sc < 1 ? 0.35 : 0;
      lecture.position.y = 1.3 + Math.sin(s.time * 1.1) * 0.03;

      // Streams and the GPU.
      streams.forEach((st, k) => {
        const on = k ? seg(tt, 2.5, 0.3) * (1 - seg(tt, 4.6, 0.5)) : seg(tt, 0.6, 0.3) * (1 - seg(tt, 3.0, 0.5));
        st.pts.material.opacity = on * 0.95;
        for (let q = 0; q < SN; q++) {
          const u = (q / SN + s.time * 0.55) % 1;
          st.c.getPointAt(u, tmp);
          st.pos[q * 3] = tmp.x;
          st.pos[q * 3 + 1] = tmp.y + Math.sin(q * 3.1 + s.time * 4) * 0.02;
          st.pos[q * 3 + 2] = tmp.z;
        }
        st.geo.attributes.position.needsUpdate = true;
      });
      const busy = seg(tt, 1.1, 0.4) * (1 - seg(tt, 4.8, 0.6));
      leds.forEach((led, i) => {
        const k = seg(tt, 1.2 + i * 0.35, 0.3) * (1 - seg(tt, 4.8, 0.6));
        led.material.opacity = 0.25 + 0.75 * k * (0.75 + 0.25 * Math.sin(s.time * 12 + i * 2));
        led.scale.x = 0.4 + 0.6 * k;
      });
      rackGlow.material.opacity = busy * (0.22 + Math.sin(s.time * 5) * 0.04);

      // The notes write themselves.
      lines.forEach((ln) => ln.m.reveal(easeOut(seg(tt, ln.at, 0.55)) * out));
      sumBox.visible = tt > 4.6 && out > 0.01;
      sumBox.scale.set(1, Math.max(0.0001, easeOutBack(seg(tt, 4.6, 0.45)) * out), 1);
      sumText.reveal(easeOut(seg(tt, 4.9, 0.4)) * out);
      sumText2.reveal(easeOut(seg(tt, 5.15, 0.5)) * out);
      tags.forEach((p, i) => {
        const k = easeOutBack(seg(tt, 5.3 + i * 0.22, 0.5), 1.5) * out;
        p.position.lerpVectors(tmp2.set(0, 0.6, 0.1), p.userData.to, k);
        p.position.y += Math.sin(s.time * 1.6 + i) * 0.03 * k;
        p.scale.setScalar(Math.max(0.0001, k));
      });
      notes.position.y = 0.45 + Math.sin(s.time * 0.9 + 1) * 0.03;

      // Out to the students.
      notes.updateMatrixWorld();
      phones.forEach((ph, i) => {
        const k = seg(tt, ph.at, 0.7);
        const arrived = k >= 1 && out > 0.01;
        tmp.set(0.3, 0.2, 0.1).applyMatrix4(notes.matrixWorld);
        root.worldToLocal(tmp);
        ph.g.updateMatrixWorld();
        tmp2.setFromMatrixPosition(ph.g.matrixWorld);
        root.worldToLocal(tmp2);
        const e = easeInOut(k);
        ph.fly.position.lerpVectors(tmp, tmp2, e);
        ph.fly.position.y += Math.sin(Math.PI * e) * 0.55;
        ph.fly.rotation.set(-0.2, -0.3, (1 - e) * 0.6);
        ph.fly.scale.setScalar(1 - e * 0.25);
        ph.fly.material.opacity = k > 0 && k < 1 ? 1 : 0;
        ph.lit.material.opacity = damp(ph.lit.material.opacity, arrived ? 1 : 0, 6, s.dt || 1);
        ph.g.position.y = -1.95 + Math.sin(i * 1.3) * 0.04 + (arrived ? Math.max(0, Math.sin(Math.PI * seg(tt, ph.at + 0.7, 0.35))) * 0.08 : 0);
      });
    },
  };
}

/* ======================================================================
   TUTOR
   ====================================================================== */
const KW = '#FF8A5C';
const FN = '#7CC4FF';
const TX = '#E6E9F0';
const DIM = '#8A93AB';
const CODE = [
  [['def ', KW], ['insert', FN], ['(node, key):', TX]],
  [['  ', TX], ['if ', KW], ['node ', TX], ['is None', KW], [': ', TX], ['return ', KW], ['Node', FN], ['(key)', TX]],
  [['  ', TX], ['if ', KW], ['key < node.key:', TX]],
  [['    node.left = ', TX], ['insert', FN], ['(node.left, key)', TX]],
  [['  ', TX], ['else', KW], [':', TX]],
  [['    node.right = ', TX], ['insert', FN], ['(node.right, key)', TX]],
  [['  ', TX], ['return ', KW], ['node', TX]],
];

function editorChromeTex() {
  return canvasTex(1024, 80, (g, w, h) => {
    g.fillStyle = '#1A1E29';
    g.fillRect(0, 0, w, h);
    ['#FF6B5A', '#596178', '#33D1B5'].forEach((c, i) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(34 + i * 30, h / 2, 9, 0, TAU);
      g.fill();
    });
    g.fillStyle = '#C9CFDC';
    g.font = `500 30px ${MONO}`;
    g.textBaseline = 'middle';
    g.fillText('bst.py', 150, h / 2 + 2);
    g.fillStyle = '#8A93AB';
    g.font = `500 26px ${MONO}`;
    g.textAlign = 'right';
    g.fillText('data structures', w - 26, h / 2 + 2);
  });
}

function squiggleTex() {
  return canvasTex(512, 32, (g, w, h) => {
    g.strokeStyle = '#FF5A5A';
    g.lineWidth = 4;
    g.beginPath();
    for (let x = 0; x <= w; x += 4) g.lineTo(x, h / 2 + Math.sin(x / 7) * 6);
    g.stroke();
  });
}

function bubbleTex(text, { w = 1024, h = 200, size = 58, color = '#1B1E26', bg = '#ffffff' } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg;
    roundRectPath(g, 6, 6, w - 12, h - 40, 44);
    g.fill();
    g.beginPath();
    g.moveTo(w - 150, h - 36);
    g.lineTo(w - 96, h - 4);
    g.lineTo(w - 110, h - 36);
    g.fill();
    g.fillStyle = color;
    g.font = `600 ${size}px ${FONT}`;
    g.textBaseline = 'middle';
    g.fillText(text, 48, (h - 30) / 2 + 4);
  });
}

function nodeTex(v) {
  return canvasTex(128, 128, (g, w) => {
    g.fillStyle = '#1B1E26';
    g.font = `700 54px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(v), w / 2, w / 2 + 3);
  });
}

function quizTex() {
  return canvasTex(1024, 300, (g, w) => {
    g.fillStyle = '#1F5FD6';
    g.font = `600 30px ${MONO}`;
    g.fillText('QUIZ', 44, 64);
    g.fillStyle = '#1B1E26';
    g.font = `700 50px ${FONT}`;
    g.fillText('Search a balanced BST?', 44, 128);
  });
}

export function tutor(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [0.2, 1.2, 13.2], look: [0.25, 0.2, 0], fit: 0.9 });
  const root = new THREE.Group();
  scene.add(root);

  // 1. The editor, with the student's code.
  const ed = put(root, new THREE.Group(), -0.75, 0.55, 0);
  ed.rotation.y = 0.12;
  const W = 3.7;
  const H = 2.72;
  put(ed, box(W, H, 0.1, M.gloss('#12151C', { roughness: 0.3 }), 0.08));
  put(ed, new THREE.Mesh(new THREE.PlaneGeometry(W - 0.12, 0.26), new THREE.MeshBasicMaterial({ map: editorChromeTex(), toneMapped: false })), 0, H / 2 - 0.19, 0.052);
  const LH = 0.27;
  const top = H / 2 - 0.55;
  const left = -W / 2 + 0.36;
  const codeLines = CODE.map((runs, i) => {
    const m = strip(runsTex(runs, { size: 38, w: 1024, h: 64 }), 3.25, 0.2);
    put(ed, m, left, top - i * LH, 0.054);
    const num = put(ed, new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({
      map: runsTex([[String(i + 1), '#4C556E']], { w: 64, h: 64, size: 30, pad: 14 }), transparent: true, toneMapped: false,
    })), -W / 2 + 0.17, top - i * LH, 0.054);
    return { m, num };
  });
  const fixBar = put(ed, new THREE.Mesh(new THREE.PlaneGeometry(W - 0.14, LH * 0.92), new THREE.MeshBasicMaterial({ color: '#1F9D74', transparent: true, opacity: 0, toneMapped: false })), 0, top - LH, 0.053);
  const fixEdge = put(ed, new THREE.Mesh(new THREE.PlaneGeometry(0.04, LH * 0.92), M.flat('#33D1B5', { transparent: true, opacity: 0 })), -W / 2 + 0.07, top - LH, 0.055);
  const squiggle = put(ed, new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.06), new THREE.MeshBasicMaterial({ map: squiggleTex(), transparent: true, opacity: 0, toneMapped: false })), left + 0.86, 0, 0.056);
  const errDot = put(ed, new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), M.flat('#FF5A5A', { transparent: true, opacity: 0 })), -W / 2 + 0.06, 0, 0.056);
  const cursor = put(ed, new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.2), M.flat('#7CC4FF')), left, top - LH, 0.057);
  const testsFail = put(ed, new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.26), new THREE.MeshBasicMaterial({
    map: runsTex([['✗ ', '#FF5A5A', 700], ['test_insert_empty', '#FFB3AE']], { w: 640, h: 108, size: 44, pad: 28, bg: '#3A1A20' }), transparent: true, toneMapped: false,
  })), W / 2 - 0.92, -H / 2 + 0.25, 0.056);
  const testsPass = put(ed, new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.26), new THREE.MeshBasicMaterial({
    map: runsTex([['✓ ', '#4BE3A6', 700], ['3/3 tests pass', '#BDF5DE']], { w: 640, h: 108, size: 44, pad: 28, bg: '#123528' }), transparent: true, opacity: 0, toneMapped: false,
  })), W / 2 - 0.92, -H / 2 + 0.25, 0.057);

  // 2. The tutor bot.
  const bot = put(root, new THREE.Group(), 2.35, 2.05, 0.5);
  const headMat = M.ceramic('#ffffff', { roughness: 0.3 });
  put(bot, box(0.98, 0.8, 0.8, headMat, 0.3));
  put(bot, box(0.78, 0.5, 0.06, M.gloss('#141A2C', { roughness: 0.2 }), 0.14), 0, -0.02, 0.4);
  const eyes = [-0.17, 0.17].map((x) => put(bot, box(0.12, 0.17, 0.02, M.flat('#4BE3A6'), 0.05), x, 0.0, 0.44));
  put(bot, new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 10), M.chrome()), 0, 0.53, 0);
  const tip = put(bot, new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 14), M.flat('#FF8A5C')), 0, 0.68, 0);
  for (const sx of [-1, 1]) put(bot, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 24), M.ceramic('#DDE3F0')), sx * 0.52, 0, 0).rotation.z = Math.PI / 2;
  put(root, shadow(1.2, 0.5, 0.2, '#1B1E26'), 2.35, 1.35, 0.5);

  // 3. Chat bubbles: typing dots, a hint, a cheer.
  const bubble = (text) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 0.5), new THREE.MeshBasicMaterial({ map: bubbleTex(text), transparent: true, toneMapped: false, depthWrite: false }));
    put(root, m, 0.95, 2.82, 0.6);
    return m;
  };
  const hint = bubble('What if node is None?');
  const cheer = bubble("Nice! That's the base case.");
  const dots = put(root, new THREE.Group(), 1.55, 2.82, 0.6);
  put(dots, new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.38), new THREE.MeshBasicMaterial({ map: bubbleTex('', { w: 320, h: 196 }), transparent: true, toneMapped: false, depthWrite: false })));
  const dotMeshes = [-0.13, 0, 0.13].map((x) => put(dots, new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), M.flat('#8A93AB')), x, 0.03, 0.01));

  // 4. The tree the code builds; 42 gets inserted.
  const tree = put(root, new THREE.Group(), 2.2, -1.0, 0.35);
  const nodeDefs = { 50: [0, 0.75], 25: [-0.62, 0.15], 75: [0.62, 0.15], 12: [-0.95, -0.45], 37: [-0.3, -0.45], 42: [-0.05, -1.02] };
  const edgeMat = M.satin('#B9C0CE', { roughness: 0.35 });
  const nodes = {};
  Object.entries(nodeDefs).forEach(([v, [x, y]]) => {
    const mat = M.pearl('#ffffff', { roughness: 0.2 });
    const m = put(tree, new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), mat), x, y, 0);
    const lab = put(m, new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshBasicMaterial({ map: nodeTex(v), transparent: true, toneMapped: false, depthWrite: false })), 0, 0, 0.205);
    lab.renderOrder = 2;
    nodes[v] = { m, mat };
  });
  const edge = (a, b) => {
    const A = nodes[a].m.position;
    const B = nodes[b].m.position;
    const len = A.distanceTo(B);
    const e = put(tree, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 8), edgeMat));
    e.position.copy(A).add(B).multiplyScalar(0.5);
    e.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return e;
  };
  [[50, 25], [50, 75], [25, 12], [25, 37]].forEach(([a, b]) => edge(a, b));
  const newEdge = edge(37, 42);
  const keyChip = put(root, pill('42', { color: '#ffffff', bg: '#1F5FD6', w: 0.5, h: 0.3, size: 40 }));

  // 5. The quiz card.
  const quiz = put(root, new THREE.Group(), -0.55, -1.55, 1.25);
  quiz.rotation.x = -0.12;
  put(quiz, box(3.0, 1.15, 0.06, M.ceramic('#ffffff', { roughness: 0.35 }), 0.08));
  put(quiz, new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.85), new THREE.MeshBasicMaterial({ map: quizTex(), transparent: true, toneMapped: false })), 0, 0.2, 0.033);
  const opts = ['O(n)', 'O(log n)', 'O(1)'].map((t, i) => {
    const plain = pill(t, { color: '#1B1E26', bg: '#ffffff', border: '#1B1E26', w: 0.86, h: 0.27, size: 34 });
    put(quiz, plain, -0.95 + i * 0.95, -0.3, 0.035);
    return plain;
  });
  const right = put(quiz, pill('✓ O(log n)', { color: '#ffffff', bg: '#1F9D55', w: 0.86, h: 0.27, size: 32 }), 0, -0.3, 0.04);
  const pointer = put(root, new THREE.Group(), 0, 0, 0);
  const arrow = new THREE.Shape();
  arrow.moveTo(0, 0);
  arrow.lineTo(0, -0.3);
  arrow.lineTo(0.08, -0.22);
  arrow.lineTo(0.14, -0.34);
  arrow.lineTo(0.18, -0.32);
  arrow.lineTo(0.12, -0.2);
  arrow.lineTo(0.22, -0.2);
  arrow.closePath();
  put(pointer, new THREE.Mesh(new THREE.ShapeGeometry(arrow), M.flat('#1B1E26')));
  const floor = shadow(8, 3.2, 0.12, '#1B1E26');
  floor.position.y = -2.5;
  scene.add(floor);

  const P = 11.2;
  const white = new THREE.Color('#ffffff');
  const lit = new THREE.Color('#BFD3FF');
  const mint = new THREE.Color('#9BF0CF');
  const tmp = new THREE.Vector3();
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  return {
    scene,
    camera,
    posterT: 0.4 + 8.6,
    update(s) {
      cam(s);
      const tt = s.reduced ? 8.6 : loop(Math.max(0, s.t - 0.4), P) * P;
      const kin = easeOutBack(seg(s.t, 0, 0.9), 1.3);
      root.scale.setScalar(Math.max(0.0001, kin));
      root.rotation.y = s.px * 0.1 + Math.sin(s.time * 0.3) * 0.04;
      const back = easeInOut(seg(tt, 10.0, 0.8)); // reset at the end of the loop

      // The fix: line 2 types in and pushes the rest down.
      const fix = easeOut(seg(tt, 2.9, 0.9)) * (1 - back);
      const room = easeInOut(seg(tt, 2.75, 0.3)) * (1 - back);
      codeLines.forEach((cl, i) => {
        if (i === 1) {
          cl.m.reveal(fix);
          cl.num.visible = room > 0.5;
          return;
        }
        const y = top - (i > 1 ? (i - 1) + room : i) * LH;
        cl.m.position.y = y;
        cl.num.position.y = y;
      });
      const err = seg(tt, 1.0, 0.25) * (1 - seg(tt, 3.8, 0.3));
      const errY = top - (1 + room) * LH - 0.1;
      squiggle.position.y = errY;
      squiggle.material.opacity = err;
      errDot.position.y = errY + 0.1;
      errDot.material.opacity = err;
      const good = seg(tt, 3.8, 0.3) * (1 - back);
      const fixOn = fix > 0.02 ? 1 - back : 0;
      fixBar.material.opacity = 0.16 * fixOn;
      fixEdge.material.opacity = fixOn;
      testsFail.material.opacity = 1 - good;
      testsPass.material.opacity = good;
      cursor.visible = Math.sin(s.time * 6) > 0 && tt < 3.9;
      cursor.position.x = left + 3.25 * fix * 0.8 + 0.02;

      // The bot: types, hints, cheers.
      const typing = seg(tt, 1.4, 0.2) * (1 - seg(tt, 1.95, 0.15));
      dots.scale.setScalar(Math.max(0.0001, typing));
      dotMeshes.forEach((d, i) => { d.position.y = 0.03 + Math.max(0, Math.sin(s.time * 9 - i * 0.9)) * 0.05; });
      const hintK = easeOutBack(seg(tt, 2.0, 0.4), 1.6) * (1 - seg(tt, 3.85, 0.25));
      hint.scale.setScalar(Math.max(0.0001, hintK));
      const cheerK = easeOutBack(seg(tt, 4.15, 0.4), 1.6) * (1 - seg(tt, 6.4, 0.3));
      cheer.scale.setScalar(Math.max(0.0001, cheerK));
      const happy = cheerK > 0.5;
      eyes.forEach((e) => { e.scale.y = damp(e.scale.y, happy ? 0.35 : 1, 10, s.dt || 1); });
      const blink = Math.sin(s.time * 2.3) > 0.985 ? 0.15 : 1;
      if (!happy) eyes.forEach((e) => { e.scale.y = Math.min(e.scale.y, blink); });
      const hop = happy ? Math.abs(Math.sin(seg(tt, 4.15, 0.8) * Math.PI * 2)) * 0.18 : 0;
      bot.position.y = 2.05 + Math.sin(s.time * 1.6) * 0.05 + hop;
      bot.rotation.y = -0.35 + Math.sin(s.time * 0.8) * 0.12;
      bot.rotation.z = happy ? Math.sin(s.time * 8) * 0.06 : 0;
      tip.material.color.set(hintK > 0.5 || typing > 0.5 ? (Math.sin(s.time * 10) > 0 ? '#FF8A5C' : '#FFD2BF') : '#FF8A5C');

      // 42 goes into the tree: down the path, then a new leaf.
      const fly = seg(tt, 4.9, 0.7);
      ed.updateMatrixWorld();
      from.set(left + 0.5, top - LH, 0.1).applyMatrix4(ed.matrixWorld);
      root.worldToLocal(from);
      tree.updateMatrixWorld();
      const pathNodes = [50, 25, 37];
      const visit = Math.min(pathNodes.length - 1, Math.floor(seg(tt, 5.6, 1.0) * pathNodes.length));
      to.copy(nodes[pathNodes[visit]].m.position).add({ x: 0, y: 0.38, z: 0.2 }).applyMatrix4(tree.matrixWorld);
      root.worldToLocal(to);
      const landed = seg(tt, 6.65, 0.35);
      if (fly < 1) keyChip.position.lerpVectors(from, to, easeInOut(fly)).add({ x: 0, y: Math.sin(Math.PI * fly) * 0.6, z: 0 });
      else keyChip.position.lerp(to, 1 - Math.exp(-10 * (s.dt || 1)));
      keyChip.scale.setScalar(Math.max(0.0001, seg(tt, 4.8, 0.2) * (1 - landed) * (1 - back)));
      pathNodes.forEach((v, i) => {
        const on = tt > 5.6 + (i * 1.0) / pathNodes.length && tt < 9.6;
        nodes[v].mat.color.copy(white).lerp(lit, on ? 1 : 0);
      });
      const leaf = easeOutBack(landed, 2) * (1 - back);
      nodes[42].m.scale.setScalar(Math.max(0.0001, leaf));
      nodes[42].mat.color.copy(mint);
      newEdge.scale.set(1, Math.max(0.0001, leaf), 1);
      tree.position.y = -1.0 + Math.sin(s.time * 0.9) * 0.03;

      // The quiz: up it comes, and the pointer picks O(log n).
      const qk = easeOutBack(seg(tt, 7.1, 0.5), 1.4) * (1 - easeInOut(seg(tt, 9.9, 0.4)));
      quiz.scale.setScalar(Math.max(0.0001, qk));
      quiz.position.y = -1.55 + (1 - qk) * -0.4;
      const pick = seg(tt, 8.1, 0.6);
      const correct = seg(tt, 8.75, 0.15);
      right.material.opacity = correct;
      right.scale.setScalar(1 + Math.sin(Math.PI * seg(tt, 8.75, 0.35)) * 0.15);
      opts[1].material.opacity = 1 - correct;
      quiz.updateMatrixWorld();
      tmp.set(0.12, -0.36, 0.1).applyMatrix4(quiz.matrixWorld);
      root.worldToLocal(tmp);
      pointer.position.set(lerp(tmp.x + 1.4, tmp.x, easeInOut(pick)), lerp(tmp.y - 0.6, tmp.y, easeInOut(pick)), tmp.z);
      pointer.scale.setScalar(Math.max(0.0001, qk) * (correct > 0 && correct < 1 ? 0.9 : 1));
      pointer.visible = qk > 0.2 && tt < 9.7;
    },
  };
}
