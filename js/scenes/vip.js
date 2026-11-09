/* The two Georgia Tech VIP roles, each showing what the product is like to
   use, not how it's built.
   studyBuddy: StudyBuddy, an AI note-taker for lectures. In a little lecture
     room, the buddy (a book with a face) reads the slide while the professor
     talks, flies over the class leaving notes with every student, then lands
     by your phone: notes, a summary, and topics, ready to go.
   tutor: AI study modules for data structures. A student's practice code is
     missing a case; the tutor bot nudges them in plain words, the fix goes in
     and the checks pass, 42 drops into its spot in the tree, and a quiz card
     asks which way smaller numbers go. */
import {
  THREE, M, rig, stage, damp, clamp, lerp, seg, loop, easeOut, easeInOut, easeOutBack,
  rbox, canvasTex, dotTex, sprite, shadow, roundRectPath, FONT, MONO,
} from '../kit.js';
import { person } from './builders.js';

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
   STUDYBUDDY: a study buddy in the lecture hall
   ====================================================================== */
function slideTex(part) {
  return canvasTex(1024, 640, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2E5BFF';
    g.font = `600 30px ${MONO}`;
    g.fillText(part ? 'LECTURE 14 · PART 2' : 'LECTURE 14', 70, 92);
    g.fillStyle = '#121A2B';
    g.font = `700 66px ${FONT}`;
    g.fillText(part ? 'Putting it together' : "Today's big idea", 70, 172);
    for (let i = 0; i < 3; i++) {
      g.fillStyle = '#2E5BFF';
      g.beginPath();
      g.arc(84, 262 + i * 74, 9, 0, TAU);
      g.fill();
      g.fillStyle = '#CFD8EC';
      roundRectPath(g, 112, 250 + i * 74, 360 - i * 70 + (part ? 40 : 0), 24, 12);
      g.fill();
    }
    if (part) {
      // A little diagram: three ideas joined up.
      g.strokeStyle = '#2E5BFF';
      g.lineWidth = 7;
      const pts = [[640, 300], [860, 300], [750, 480]];
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.stroke();
      pts.forEach(([x, y], i) => {
        g.fillStyle = ['#2E5BFF', '#4BE3A6', '#FF8A6A'][i];
        g.beginPath();
        g.arc(x, y, 40, 0, TAU);
        g.fill();
      });
    } else {
      // A simple chart.
      [150, 230, 190, 290].forEach((bh, i) => {
        g.fillStyle = i === 3 ? '#2E5BFF' : '#AFC0F0';
        roundRectPath(g, 620 + i * 80, 520 - bh, 54, bh, 10);
        g.fill();
      });
      g.fillStyle = '#121A2B';
      g.fillRect(600, 522, 320, 5);
    }
  });
}

/* The StudyBuddy app, drawn in parts so it can fill in. */
function appTex(kind) {
  const W = 512;
  const H = { head: 132, title: 120, row: 132, chips: 96 }[kind];
  return canvasTex(W, H, (g, w, h) => {
    if (kind === 'head') {
      g.fillStyle = '#2E5BFF';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#4BE3A6';
      g.beginPath();
      g.arc(52, h / 2, 14, 0, TAU);
      g.fill();
      g.fillStyle = '#ffffff';
      g.font = `700 50px ${FONT}`;
      g.textBaseline = 'middle';
      g.fillText('StudyBuddy', 82, h / 2 + 3);
    } else if (kind === 'title') {
      g.fillStyle = '#121A2B';
      g.font = `700 46px ${FONT}`;
      g.textBaseline = 'middle';
      g.fillText('Lecture 14', 34, h * 0.42);
      g.fillStyle = '#1F9D74';
      g.font = `600 30px ${FONT}`;
      g.fillText('Your notes are ready', 34, h * 0.82);
    }
  });
}

function appRow(label, sub, color) {
  return canvasTex(512, 132, (g, w, h) => {
    g.fillStyle = '#F2F5FC';
    roundRectPath(g, 18, 10, w - 36, h - 20, 22);
    g.fill();
    g.fillStyle = color;
    g.beginPath();
    g.arc(70, h / 2, 26, 0, TAU);
    g.fill();
    g.strokeStyle = '#ffffff';
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(58, h / 2 + 1);
    g.lineTo(67, h / 2 + 10);
    g.lineTo(84, h / 2 - 9);
    g.stroke();
    g.fillStyle = '#121A2B';
    g.font = `700 38px ${FONT}`;
    g.textBaseline = 'middle';
    g.fillText(label, 116, h / 2 - 16);
    g.fillStyle = '#5A6680';
    g.font = `500 28px ${FONT}`;
    g.fillText(sub, 116, h / 2 + 22);
  });
}

function noteCardTex() {
  return canvasTex(128, 160, (g, w, h) => {
    g.fillStyle = '#ffffff';
    roundRectPath(g, 0, 0, w, h, 14);
    g.fill();
    g.fillStyle = '#2E5BFF';
    g.fillRect(0, 0, w, 34);
    g.fillStyle = '#4BE3A6';
    g.beginPath();
    g.arc(20, 17, 7, 0, TAU);
    g.fill();
    g.fillStyle = '#C9D3EA';
    for (let i = 0; i < 4; i++) g.fillRect(16, 52 + i * 24, 96 - (i % 2) * 30, 10);
  });
}

/* The buddy: a little book with a face and a bookmark tail. */
function buddyBook() {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  put(body, box(0.62, 0.78, 0.2, M.gloss('#2E5BFF', { roughness: 0.25 }), 0.06));
  put(body, box(0.56, 0.72, 0.17, M.ceramic('#FBFAF6', { roughness: 0.6 }), 0.03), 0.04, 0, 0.0);
  put(body, box(0.1, 0.8, 0.22, M.gloss('#2347D6', { roughness: 0.3 }), 0.04), -0.3, 0, 0);
  const eyeW = M.flat('#ffffff');
  const pupil = M.flat('#121A2B');
  const eyes = [-0.11, 0.13].map((x) => {
    const e = put(body, new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), eyeW), x, 0.1, 0.1);
    e.scale.z = 0.4;
    put(e, new THREE.Mesh(new THREE.SphereGeometry(0.038, 14, 10), pupil), 0, -0.01, 0.06);
    return e;
  });
  const smile = put(body, new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 20, Math.PI), M.flat('#ffffff')), 0.02, -0.05, 0.104);
  smile.rotation.z = Math.PI;
  const ribbon = put(body, box(0.06, 0.3, 0.01, M.gloss('#FF8A6A'), 0.01), 0.14, 0.48, -0.02);
  return { group: g, body, eyes, ribbon };
}

export function studyBuddy(env) {
  const { scene, camera } = stage(env, { fov: 28 });
  const cam = rig(camera, { pos: [1.2, 4.4, 12.3], look: [0.05, 1.0, 0.3], fit: 0.9 });
  const root = new THREE.Group();
  scene.add(root);

  // The room: a floor, the lecture screen, the professor.
  put(root, box(7.4, 0.16, 5.6, M.ceramic('#E3E8F3', { roughness: 0.6 }), 0.08), 0.1, -0.08, 0.1);
  const screen = put(root, new THREE.Group(), -1.95, 1.75, -1.55);
  screen.rotation.y = 0.42;
  put(screen, box(2.7, 1.72, 0.08, M.gloss('#1A2034', { roughness: 0.3 }), 0.05));
  const slides = [slideTex(0), slideTex(1)];
  const slide = put(screen, new THREE.Mesh(new THREE.PlaneGeometry(2.56, 1.6), new THREE.MeshBasicMaterial({ map: slides[0], toneMapped: false })), 0, 0, 0.045);
  put(screen, box(0.08, 1.0, 0.08, M.chrome()), 0, -1.3, -0.05);
  const prof = put(root, person({ color: '#2E5BFF' }), -2.85, 0, -0.45);
  prof.rotation.y = 1.1;
  const talk = [0, 1, 2].map(() => put(root, new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 8, 40, Math.PI * 0.9), M.flat('#2E5BFF', { transparent: true, opacity: 0 })), -2.7, 1.0, -0.38));
  talk.forEach((r) => { r.rotation.set(0, 1.1 + Math.PI / 2, -Math.PI * 0.45); });

  // The class: two rows of students with laptops, facing the screen.
  const pastel = ['#FFB38A', '#7CC4FF', '#9BE3C7', '#FFD1DC', '#C9D3EA', '#FF8A6A', '#6CB6FF', '#B8E2D2'];
  const students = [];
  let n = 0;
  for (const z of [0.15, 1.35]) {
    for (let i = 0; i < 4; i++) {
      const g = put(root, new THREE.Group(), -0.75 + i * 1.0 + (z > 1 ? 0.35 : 0), 0, z);
      g.lookAt(screen.position.x, 0, screen.position.z);
      const p = put(g, person({ color: pastel[n % pastel.length] }), 0, 0, -0.05);
      p.scale.setScalar(0.72);
      put(g, box(0.62, 0.05, 0.4, M.ceramic('#F7F8FB'), 0.02), 0, 0.5, 0.42);
      put(g, box(0.05, 0.5, 0.05, M.chrome(), 0.01), 0, 0.25, 0.42);
      const lid = put(g, box(0.36, 0.24, 0.02, M.gloss('#1A2034'), 0.015), 0, 0.64, 0.5);
      lid.rotation.x = -0.25;
      const glow = put(lid, new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), M.flat('#7CA6FF', { transparent: true, opacity: 0 })), 0, 0, -0.012);
      glow.rotation.y = Math.PI;
      const card = put(root, new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.425), new THREE.MeshBasicMaterial({ map: noteCardTex(), transparent: true, toneMapped: false, depthWrite: false })), 0, 0, 0);
      card.renderOrder = 3;
      students.push({ g, glow, card, at: 0 });
      n++;
    }
  }

  // Your phone, up close, where it all lands.
  const phone = put(root, new THREE.Group(), 2.3, 0.85, 2.45);
  phone.rotation.set(-0.16, -0.3, 0.05);
  put(phone, box(1.2, 2.3, 0.08, M.ceramic('#F4F6FA', { roughness: 0.3 }), 0.14));
  put(phone, new THREE.Mesh(new THREE.PlaneGeometry(1.08, 2.14), M.flat('#FFFFFF')), 0, 0, 0.045);
  put(phone, box(0.3, 0.05, 0.01, M.gloss('#1A2034'), 0.02), 0, 0.98, 0.05);
  const app = [
    { m: put(phone, new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.28), new THREE.MeshBasicMaterial({ map: appTex('head'), transparent: true, toneMapped: false })), 0, 0.79, 0.047), at: 0 },
    { m: put(phone, new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.234), new THREE.MeshBasicMaterial({ map: appTex('title'), transparent: true, toneMapped: false })), 0, 0.46, 0.047), at: 6.55 },
    { m: put(phone, new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.258), new THREE.MeshBasicMaterial({ map: appRow('Notes', 'everything from class', '#2E5BFF'), transparent: true, toneMapped: false })), 0, 0.16, 0.047), at: 6.9 },
    { m: put(phone, new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.258), new THREE.MeshBasicMaterial({ map: appRow('Summary', 'the lecture in a minute', '#1F9D74'), transparent: true, toneMapped: false })), 0, -0.14, 0.047), at: 7.25 },
    { m: put(phone, new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.258), new THREE.MeshBasicMaterial({ map: appRow('Topics', 'tagged to find later', '#FF8A6A'), transparent: true, toneMapped: false })), 0, -0.44, 0.047), at: 7.6 },
  ];

  // The buddy, and its flight: read the slide, visit every student, then you.
  const buddy = buddyBook();
  root.add(buddy.group);
  const home = new THREE.Vector3(-1.25, 2.35, -0.85);
  const stops = [home.clone()];
  students.forEach((s) => {
    stops.push(s.g.position.clone().add(new THREE.Vector3(0, 1.75, 0)));
  });
  stops.push(new THREE.Vector3(1.55, 2.35, 2.0));
  const flight = new THREE.CatmullRomCurve3(stops, false, 'centripetal');
  const sparks = [...Array(14)].map((_, i) => {
    const sp = put(root, sprite(dotTex(), 0.16, 0.16, { color: i % 2 ? '#4BE3A6' : '#7CA6FF', opacity: 0, blending: THREE.AdditiveBlending }));
    sp.userData.ph = i / 14;
    return sp;
  });
  const floor = shadow(9, 6.5, 0.18, '#1B2A55');
  floor.position.y = -0.18;
  scene.add(floor);

  const P = 11;
  const FLY0 = 1.9;
  const FLY1 = 6.2;
  const tmp = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const slideW = new THREE.Vector3();
  return {
    scene,
    camera,
    posterT: 0.4 + 8.2,
    update(s) {
      cam(s);
      const tt = s.reduced ? 8.2 : loop(Math.max(0, s.t - 0.4), P) * P;
      const kin = easeOutBack(seg(s.t, 0, 0.9), 1.3);
      root.scale.setScalar(Math.max(0.0001, kin));
      root.rotation.y = s.px * 0.1 + Math.sin(s.time * 0.3) * 0.04;
      const out = 1 - easeInOut(seg(tt, 9.8, 0.8));

      // The lecture: the professor talks, the slide changes halfway.
      slide.material.map = slides[tt > 5 && tt < 10 ? 1 : 0];
      talk.forEach((r, i) => {
        const ph = (s.time * 0.8 + i / 3) % 1;
        r.scale.setScalar(0.6 + ph * 1.6);
        r.material.opacity = (1 - ph) * 0.6;
      });

      // The buddy reads, flies the rows, and lands by your phone.
      const fu = seg(tt, FLY0, FLY1 - FLY0);
      const back = seg(tt, 9.6, 1.2);
      if (tt < FLY0) {
        tmp.copy(home).add({ x: Math.sin(s.time * 2) * 0.05, y: Math.sin(s.time * 3) * 0.06, z: 0 });
      } else if (back > 0) {
        flight.getPointAt(1, tmp).lerp(home, easeInOut(back));
        tmp.y += Math.sin(Math.PI * back) * 0.8;
      } else {
        const e = easeInOut(fu);
        flight.getPointAt(Math.min(1, e), tmp);
        tmp.y += Math.sin(e * Math.PI * 14) * 0.08;
        if (fu >= 1) tmp.add({ x: Math.sin(s.time * 2) * 0.05, y: Math.sin(s.time * 3) * 0.06, z: 0 });
      }
      buddy.group.position.copy(tmp);
      flight.getPointAt(Math.min(1, easeInOut(fu) + 0.02), ahead);
      const moving = tt > FLY0 && fu < 1;
      const turn = moving ? Math.atan2(ahead.x - tmp.x, ahead.z - tmp.z) * 0.35 : 0.5;
      buddy.group.rotation.y = damp(buddy.group.rotation.y, turn, 5, s.dt || 1);
      buddy.body.rotation.z = moving ? Math.sin(s.time * 9) * 0.12 : Math.sin(s.time * 2) * 0.05;
      const flip = seg(tt, 7.9, 0.7);
      buddy.body.rotation.y = flip * TAU;
      buddy.ribbon.rotation.z = Math.sin(s.time * 7) * 0.4;
      const blink = Math.sin(s.time * 2.7) > 0.97 ? 0.15 : 1;
      buddy.eyes.forEach((e) => { e.scale.y = blink; });
      // Reading: sparks drift from the slide into the buddy.
      screen.updateMatrixWorld();
      slideW.set(0, 0, 0.1).applyMatrix4(screen.matrixWorld);
      root.worldToLocal(slideW);
      const reading = seg(tt, 0.3, 0.3) * (1 - seg(tt, FLY0 - 0.2, 0.3));
      sparks.forEach((sp) => {
        const ph = (s.time * 0.9 + sp.userData.ph) % 1;
        sp.position.lerpVectors(slideW, tmp, ph);
        sp.position.y += Math.sin(ph * Math.PI) * 0.3;
        sp.material.opacity = reading * Math.sin(ph * Math.PI);
      });

      // Each student's notes arrive as the buddy passes.
      students.forEach((st, i) => {
        const at = FLY0 + (FLY1 - FLY0) * ((i + 1) / (students.length + 1));
        const k = easeOutBack(seg(tt, at, 0.45), 1.6) * out;
        st.card.position.copy(st.g.position).add({ x: 0, y: 1.35 + k * 0.12 + Math.sin(s.time * 2 + i) * 0.03 * k, z: 0 });
        st.card.quaternion.copy(camera.quaternion);
        st.card.scale.setScalar(Math.max(0.0001, k));
        st.glow.material.opacity = Math.min(1, k) * 0.9;
      });

      // Your phone fills in.
      app.forEach((a, i) => {
        const k = i === 0 ? 1 : easeOutBack(seg(tt, a.at, 0.4), 1.5) * out;
        a.m.scale.set(Math.max(0.0001, k), Math.max(0.0001, k), 1);
        a.m.material.opacity = Math.min(1, k * 1.5);
      });
      phone.position.y = 0.85 + Math.sin(s.time * 1.1) * 0.04;
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

/* Code drawn as colored dashes: it reads as code without asking anyone to read it. */
function codeBarsTex(runs, { w = 1024, h = 64, charW = 22, pad = 10 } = {}) {
  return canvasTex(w, h, (g) => {
    let x = pad;
    for (const [txt, col] of runs) {
      for (const word of txt.split(/(\s+)/)) {
        if (!word) continue;
        const ww = word.length * charW;
        if (word.trim()) {
          g.fillStyle = col;
          g.globalAlpha = col === TX ? 0.55 : 0.9;
          roundRectPath(g, x + 2, h / 2 - 9, Math.max(8, ww - 6), 18, 9);
          g.fill();
        }
        x += ww;
      }
    }
    g.globalAlpha = 1;
  });
}

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
    g.fillText('Practice', 150, h / 2 + 2);
    g.fillStyle = '#8A93AB';
    g.font = `500 26px ${MONO}`;
    g.textAlign = 'right';
    g.fillText('binary trees', w - 26, h / 2 + 2);
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
    g.fillText('QUICK CHECK', 44, 64);
    g.fillStyle = '#1B1E26';
    g.font = `700 50px ${FONT}`;
    g.fillText('Smaller numbers go...', 44, 128);
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
    const m = strip(codeBarsTex(runs), 3.25, 0.2);
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
    map: runsTex([['✗ ', '#FF5A5A', 700], ['1 check failing', '#FFB3AE']], { w: 640, h: 108, size: 44, pad: 28, bg: '#3A1A20', mono: false }), transparent: true, toneMapped: false,
  })), W / 2 - 0.92, -H / 2 + 0.25, 0.056);
  const testsPass = put(ed, new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.26), new THREE.MeshBasicMaterial({
    map: runsTex([['✓ ', '#4BE3A6', 700], ['All checks pass', '#BDF5DE']], { w: 640, h: 108, size: 44, pad: 28, bg: '#123528', mono: false }), transparent: true, opacity: 0, toneMapped: false,
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
  const hint = bubble('Almost! One case is missing.');
  const cheer = bubble('Nailed it! Look at the tree.');
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
  const opts = ['Left', 'Right', 'Either'].map((t, i) => {
    const plain = pill(t, { color: '#1B1E26', bg: '#ffffff', border: '#1B1E26', w: 0.86, h: 0.27, size: 34 });
    put(quiz, plain, -0.95 + i * 0.95, -0.3, 0.035);
    return plain;
  });
  const right = put(quiz, pill('✓ Left', { color: '#ffffff', bg: '#1F9D55', w: 0.86, h: 0.27, size: 34 }), -0.95, -0.3, 0.04);
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
      opts[0].material.opacity = 1 - correct;
      quiz.updateMatrixWorld();
      tmp.set(-0.83, -0.36, 0.1).applyMatrix4(quiz.matrixWorld);
      root.worldToLocal(tmp);
      pointer.position.set(lerp(tmp.x + 1.4, tmp.x, easeInOut(pick)), lerp(tmp.y - 0.6, tmp.y, easeInOut(pick)), tmp.z);
      pointer.scale.setScalar(Math.max(0.0001, qk) * (correct > 0 && correct < 1 ? 0.9 : 1));
      pointer.visible = qk > 0.2 && tt < 9.7;
    },
  };
}
