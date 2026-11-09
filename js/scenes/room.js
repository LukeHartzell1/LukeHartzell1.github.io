/* About: my room, as a little diorama you can look around.
   A cut-away bedroom at dusk: the desk where I work on CoCo (its monitor runs
   an agent session), a corkboard of interview practice cards, the window onto
   a skyline, a phone on a ring-light tripod with AR hearts floating off it, a
   bookshelf with my Georgia Tech cap, a shelf of trophies, a gym corner, and a
   beanbag in front of a TV. The room assembles itself the first time it's
   seen. Each of those spots has a marker (an HTML button the scene keeps on
   top of its object); the page says which one is open ('room-focus') and the
   scene says when one is clicked in 3D ('room-pick'). */
import {
  THREE, M, damp, easeOut, easeOutBack, bounce, seg, rbox, canvasTex, dotTex, sprite, heartShape, rng, shadow, FONT, MONO,
} from '../kit.js';
import { dumbbell, gradCap } from './builders.js';

const TAU = Math.PI * 2;

/* ---------- textures ---------- */
function woodTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(4);
    const n = 9;
    for (let i = 0; i < n; i++) {
      const y0 = (i / n) * h;
      g.fillStyle = `hsl(${24 + r() * 6}, 44%, ${52 + (r() - 0.5) * 9}%)`;
      g.fillRect(0, y0, w, h / n);
      for (let k = 0; k < 16; k++) {
        g.strokeStyle = `rgba(90,48,22,${(0.05 + r() * 0.09).toFixed(3)})`;
        g.lineWidth = 1 + r() * 2;
        const yy = y0 + r() * (h / n);
        g.beginPath();
        g.moveTo(0, yy);
        g.bezierCurveTo(w * 0.3, yy + (r() - 0.5) * 6, w * 0.6, yy + (r() - 0.5) * 6, w, yy + (r() - 0.5) * 4);
        g.stroke();
      }
      g.fillStyle = 'rgba(52,26,10,0.5)';
      g.fillRect(0, y0, w, 2);
      g.fillRect(r() * w, y0, 2, h / n);
    }
  });
}

function skylineTex() {
  return canvasTex(512, 384, (g, w, h) => {
    const r = rng(9);
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0F1C44');
    sky.addColorStop(0.42, '#25428F');
    sky.addColorStop(0.72, '#E0675B');
    sky.addColorStop(0.9, '#FF9466');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(255,255,255,${(0.3 + r() * 0.6).toFixed(2)})`;
      g.fillRect(r() * w, r() * h * 0.4, 1.5, 1.5);
    }
    g.fillStyle = '#F4F1FF';
    g.beginPath();
    g.arc(w * 0.18, h * 0.2, 16, 0, TAU);
    g.fill();
    g.fillStyle = '#25428F';
    g.beginPath();
    g.arc(w * 0.18 + 7, h * 0.2 - 4, 15, 0, TAU);
    g.fill();
    // Two layers of skyline: hazy far towers, then sharp near ones with lit windows.
    const row = (base, color, minH, maxH, lit) => {
      let x = -10;
      while (x < w) {
        const bw = 18 + r() * 36;
        let bh = minH + r() * (maxH - minH);
        if (lit && x > w * 0.56 && x < w * 0.64) bh = maxH * 1.45; // the tall one
        g.fillStyle = color;
        g.fillRect(x, base - bh, bw, bh + 4);
        if (lit && bh > maxH * 1.3) {
          g.fillRect(x + bw * 0.25, base - bh - 26, 3, 26);
          g.fillRect(x + bw * 0.7, base - bh - 20, 3, 20);
        }
        if (lit) {
          for (let yy = base - bh + 8; yy < base - 6; yy += 9) {
            for (let xx = x + 4; xx < x + bw - 4; xx += 7) {
              if (r() < 0.32) {
                g.fillStyle = r() < 0.75 ? 'rgba(255,226,196,0.95)' : 'rgba(170,212,255,0.9)';
                g.fillRect(xx, yy, 3, 4);
              }
            }
          }
        }
        x += bw + 2;
      }
    };
    row(h * 0.92, 'rgba(36,40,92,0.85)', 40, 120, false);
    row(h + 2, '#0C1230', 50, 150, true);
  });
}

function termTex() {
  return canvasTex(512, 300, (g, w, h) => {
    g.fillStyle = '#0B0D11';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#171B24';
    g.fillRect(0, 0, w, 30);
    ['#FF6B5A', '#596178', '#33D1B5'].forEach((c, i) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(20 + i * 20, 15, 6, 0, TAU);
      g.fill();
    });
    g.fillStyle = '#8B94AD';
    g.font = `500 15px ${MONO}`;
    g.fillText('coco — ~/demo', 200, 20);
    const lines = [
      ['› ', '#FF8A5C', 'build a demo for the new release', '#E8EAF0'],
      ['◆ ', '#6CB6FF', 'planning 3 steps', '#8B94AD'],
      ['✓ ', '#3FD08A', 'wrote demo_app.py', '#C9CFDC'],
      ['✓ ', '#3FD08A', 'recorded walkthrough.mp4', '#C9CFDC'],
      ['✓ ', '#3FD08A', 'drafted the blog post', '#C9CFDC'],
      ['› ', '#FF8A5C', 'ship it', '#E8EAF0'],
    ];
    g.font = `500 19px ${MONO}`;
    lines.forEach(([a, ca, b, cb], i) => {
      const y = 66 + i * 36;
      g.fillStyle = ca;
      g.fillText(a, 22, y);
      g.fillStyle = cb;
      g.fillText(b, 48, y);
    });
  });
}

function gameTex() {
  const t = canvasTex(512, 256, (g, w, h) => {
    const r = rng(12);
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#152A6B');
    sky.addColorStop(1, '#2EC4B6');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.fillRect(r() * w, r() * h * 0.45, 2, 2);
    }
    // Rolling hills, then blocky platforms and gems: a tiny side-scroller.
    g.fillStyle = '#1A6B67';
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) g.lineTo(x, h * 0.62 + Math.sin((x / w) * TAU * 2) * 16);
    g.lineTo(w, h);
    g.fill();
    g.fillStyle = '#0F3D45';
    g.fillRect(0, h * 0.84, w, h * 0.16);
    for (let i = 0; i < 6; i++) {
      const x = 30 + i * 84;
      const y = h * (0.42 + (i % 3) * 0.1);
      g.fillStyle = '#FF7A59';
      g.fillRect(x, y, 46, 12);
      g.fillStyle = '#7CF0E2';
      g.save();
      g.translate(x + 23, y - 22);
      g.rotate(Math.PI / 4);
      g.fillRect(-6, -6, 12, 12);
      g.restore();
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(0.5, 1);
  return t;
}

function corkTex() {
  return canvasTex(256, 128, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = '#B9875A';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(120,76,40,0.35)' : 'rgba(230,190,140,0.3)';
      g.fillRect(r() * w, r() * h, 2, 2);
    }
  });
}

function practiceTex(seed) {
  const r = rng(seed);
  return canvasTex(160, 112, (g, w, h) => {
    g.fillStyle = '#FFFFFF';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1E7A4C';
    g.fillRect(0, 0, w, 26);
    g.fillStyle = '#fff';
    g.font = `700 16px ${FONT}`;
    g.fillText('Q', 10, 19);
    g.fillStyle = '#C9D3CC';
    for (let i = 0; i < 3; i++) g.fillRect(12, 40 + i * 20, 70 + r() * 66, 8);
  });
}

function posterTex() {
  return canvasTex(256, 384, (g, w, h) => {
    g.fillStyle = '#FF5A3C';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#131318';
    g.font = `800 92px ${FONT}`;
    g.textAlign = 'center';
    g.fillText('SHIP', w / 2, h * 0.42);
    g.fillText('IT.', w / 2, h * 0.68);
    g.font = `500 18px ${MONO}`;
    g.fillText('then iterate', w / 2, h * 0.86);
  });
}

/* ---------- small builders ---------- */
const box = (w, h, d, mat, r) => new THREE.Mesh(rbox(w, h, d, r ?? Math.min(w, h, d) * 0.18), mat);
const cyl = (rt, rb, h, mat, s = 32) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), mat);
const put = (parent, obj, x = 0, y = 0, z = 0) => {
  obj.position.set(x, y, z);
  parent.add(obj);
  return obj;
};

function trophyCup(color) {
  const g = new THREE.Group();
  const mat = M.chrome(color, { roughness: 0.18 });
  put(g, box(0.26, 0.08, 0.26, M.gloss('#1A1D2A'), 0.02), 0, 0.04, 0);
  // A cup turned on a lathe: foot, stem, a flared bowl with a rolled lip.
  const prof = [[0.0, 0], [0.09, 0], [0.09, 0.02], [0.03, 0.05], [0.025, 0.15], [0.05, 0.18], [0.12, 0.24], [0.15, 0.34],
    [0.155, 0.42], [0.14, 0.42], [0.13, 0.35], [0.1, 0.27], [0.0, 0.24]].map(([x, y]) => new THREE.Vector2(x, y));
  put(g, new THREE.Mesh(new THREE.LatheGeometry(prof, 40), mat), 0, 0.08, 0);
  for (const s of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.014, 8, 24, Math.PI), mat);
    handle.rotation.z = s * -Math.PI / 2;
    put(g, handle, s * 0.15, 0.4, 0);
  }
  return g;
}

function plant() {
  const g = new THREE.Group();
  put(g, cyl(0.22, 0.17, 0.4, M.ceramic('#F1EEE8')), 0, 0.2, 0);
  const leaf = M.ceramic('#2E9A63', { roughness: 0.5 });
  const r = rng(3);
  for (let i = 0; i < 9; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), leaf);
    l.scale.set(0.5, 1.9, 0.18);
    const a = (i / 9) * TAU;
    l.position.set(Math.cos(a) * 0.1, 0.62 + r() * 0.2, Math.sin(a) * 0.1);
    l.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    g.add(l);
  }
  return g;
}

export function room(env) {
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  const hemi = new THREE.HemisphereLight('#B9C8FF', '#3A2A3A', 0.75);
  scene.add(hemi);
  const sunset = new THREE.DirectionalLight('#FF9C7A', 1.3); // dusk through the window
  sunset.position.set(3, 4, -8);
  scene.add(sunset);
  const fill = new THREE.DirectionalLight('#9DB4FF', 0.55);
  fill.position.set(8, 6, 6);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);
  const parts = []; // [object, start time] for the build-in
  const add = (obj, t0, parent = root) => {
    parent.add(obj);
    obj.userData.base = obj.position.clone();
    obj.userData.t0 = t0;
    parts.push(obj);
    return obj;
  };

  /* ---------- the shell ---------- */
  const H = 3.4;
  const wallMat = M.ceramic('#27304F', { roughness: 0.75, clearcoat: 0.1, sheen: 0.2 });
  const capMat = M.ceramic('#E9ECF5', { roughness: 0.5 });
  const base = new THREE.Group();
  put(base, box(7.3, 0.5, 7.3, M.ceramic('#151B33', { roughness: 0.6 }), 0.12), 0, -0.27, 0);
  const planks = new THREE.Mesh(new THREE.BoxGeometry(7, 0.06, 7), [
    M.ceramic('#9B6A44'), M.ceramic('#9B6A44'),
    new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.55 }),
    M.ceramic('#9B6A44'), M.ceramic('#9B6A44'), M.ceramic('#9B6A44'),
  ]);
  put(base, planks, 0, -0.01, 0);
  add(base, 0);
  const walls = new THREE.Group();
  put(walls, box(0.22, H, 7.22, wallMat, 0.03), -3.61, H / 2, -0.04);
  put(walls, box(7.22, H, 0.22, wallMat, 0.03), -0.04, H / 2, -3.61);
  put(walls, box(0.24, 0.06, 7.24, capMat, 0.02), -3.61, H, -0.04);
  put(walls, box(7.24, 0.06, 0.24, capMat, 0.02), -0.04, H, -3.61);
  // Skirting with an RGB strip along it.
  const rgbMat = M.glow('#59E3FF', { opacity: 1 });
  put(walls, box(0.04, 0.05, 7, rgbMat, 0.01), -3.47, 0.08, 0);
  put(walls, box(7, 0.05, 0.04, rgbMat, 0.01), 0, 0.08, -3.47);
  add(walls, 0.15);

  /* ---------- 1. desk, monitor, chair (Snowflake, CoCo) ---------- */
  const desk = new THREE.Group();
  const white = M.ceramic('#F3F2EF', { roughness: 0.35 });
  const black = M.gloss('#16181F', { roughness: 0.3 });
  put(desk, box(2.7, 0.08, 1.05, white, 0.03), 0, 1.0, 0);
  for (const sx of [-1.25, 1.25]) put(desk, box(0.07, 1.0, 0.95, black, 0.02), sx, 0.5, 0);
  put(desk, box(0.9, 0.035, 0.28, M.ceramic('#E3E6EE'), 0.012), 0.05, 1.06, 0.22);
  put(desk, box(0.14, 0.035, 0.2, M.ceramic('#E3E6EE'), 0.03), 0.75, 1.06, 0.26);
  put(desk, cyl(0.03, 0.03, 0.4, black), 0, 1.24, -0.32);
  put(desk, box(0.4, 0.03, 0.22, black, 0.01), 0, 1.05, -0.3);
  const monitor = put(desk, box(1.34, 0.8, 0.06, black, 0.03), 0, 1.68, -0.3);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 0.72), new THREE.MeshBasicMaterial({ map: termTex(), toneMapped: false }));
  put(monitor, screen, 0, 0, 0.032);
  const cursor = put(monitor, new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.05), M.flat('#6CB6FF')), -0.4, -0.22, 0.034);
  const monLight = new THREE.PointLight('#7FB8FF', 2.2, 3.2, 2);
  put(desk, monLight, 0, 1.6, 0.25);
  // Lamp.
  const lamp = new THREE.Group();
  put(lamp, cyl(0.15, 0.17, 0.04, black), 0, 0.02, 0);
  const arm = put(lamp, cyl(0.018, 0.018, 0.7, M.satin('#D9DDE6')), 0.08, 0.34, 0);
  arm.rotation.z = -0.25;
  const shade = put(lamp, new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.24, 32, 1, true), M.ceramic('#FF6B5A', { side: THREE.DoubleSide })), 0.2, 0.7, 0.05);
  shade.rotation.z = -0.5;
  put(lamp, new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), M.flat('#FFE8CF')), 0.23, 0.64, 0.05);
  const lampLight = new THREE.PointLight('#FFC9A0', 4, 4.5, 1.6);
  put(lamp, lampLight, 0.26, 0.5, 0.1);
  put(desk, lamp, 1.0, 1.04, -0.25);
  // Mug with steam.
  const mug = put(desk, cyl(0.075, 0.07, 0.17, M.ceramic('#2EC4B6')), -1.0, 1.13, 0.1);
  const steam = [0, 1, 2].map((k) => put(desk, sprite(dotTex(), 0.16, 0.16, { color: '#ffffff', opacity: 0 }), -1.0, 1.3 + k * 0.1, 0.1));
  add(desk, 0.55).position.set(-1.85, 0, -2.86);
  desk.userData.base.copy(desk.position);
  // Chair.
  const chair = new THREE.Group();
  const seatMat = M.ceramic('#2B3350', { roughness: 0.55 });
  put(chair, box(0.62, 0.1, 0.6, seatMat, 0.05), 0, 0.56, 0);
  put(chair, box(0.6, 0.72, 0.09, seatMat, 0.05), 0, 0.98, 0.29).rotation.x = -0.1;
  put(chair, box(0.6, 0.06, 0.09, M.ceramic('#FF6B5A'), 0.02), 0, 1.36, 0.31);
  put(chair, cyl(0.035, 0.035, 0.45, M.chrome()), 0, 0.3, 0);
  for (let k = 0; k < 5; k++) {
    const leg = put(chair, box(0.36, 0.035, 0.05, black, 0.012), 0, 0.07, 0);
    leg.rotation.y = (k / 5) * TAU;
    leg.translateX(0.16);
  }
  add(chair, 0.75).position.set(-1.7, 0, -1.9);
  chair.userData.base.copy(chair.position);

  /* ---------- 2. corkboard of practice cards (Interview Prepper) ---------- */
  const cork = new THREE.Group();
  put(cork, box(1.9, 0.95, 0.05, new THREE.MeshStandardMaterial({ map: corkTex(), roughness: 0.9 }), 0.02), 0, 0, 0);
  put(cork, box(1.98, 1.03, 0.03, M.ceramic('#8A5A3B'), 0.015), 0, 0, -0.02);
  const cards = [];
  [[-0.6, 0.18, 0.08], [-0.05, 0.2, -0.06], [0.52, 0.16, 0.05], [-0.34, -0.22, -0.05], [0.24, -0.2, 0.07]].forEach(([x, y, rz], i) => {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.32), new THREE.MeshStandardMaterial({ map: practiceTex(i + 3), roughness: 0.7 }));
    c.rotation.z = rz;
    put(cork, c, x, y, 0.04);
    put(cork, new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), M.gloss(i % 2 ? '#FF6B5A' : '#2EC4B6')), x, y + 0.13, 0.06);
    cards.push(c);
  });
  add(cork, 0.95).position.set(-1.85, 2.42, -3.47);
  cork.userData.base.copy(cork.position);

  // Poster between the corkboard and the window.
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 1.02), new THREE.MeshStandardMaterial({ map: posterTex(), roughness: 0.6 }));
  add(poster, 1.05).position.set(-0.32, 2.3, -3.49);
  poster.userData.base.copy(poster.position);

  /* ---------- 3. the window (the intro) ---------- */
  const win = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.45), new THREE.MeshBasicMaterial({ map: skylineTex(), toneMapped: false }));
  put(win, glass, 0, 0, 0);
  const frameMat = M.ceramic('#F1EEE8', { roughness: 0.4 });
  put(win, box(2.16, 0.08, 0.1, frameMat, 0.02), 0, 0.76, 0.03);
  put(win, box(2.16, 0.08, 0.1, frameMat, 0.02), 0, -0.76, 0.03);
  put(win, box(0.08, 1.6, 0.1, frameMat, 0.02), -1.04, 0, 0.03);
  put(win, box(0.08, 1.6, 0.1, frameMat, 0.02), 1.04, 0, 0.03);
  put(win, box(0.05, 1.45, 0.06, frameMat, 0.01), 0, 0, 0.03);
  put(win, box(2.3, 0.06, 0.26, frameMat, 0.02), 0, -0.82, 0.1);
  const sillPlant = plant();
  sillPlant.scale.setScalar(0.45);
  put(win, sillPlant, 0.75, -0.79, 0.12);
  const winGlow = put(win, sprite(dotTex(), 3.4, 2.4, { color: '#FF8A6A', opacity: 0.22, blending: THREE.AdditiveBlending }), 0, -0.1, 0.25);
  add(win, 0.85).position.set(1.6, 2.0, -3.47);
  win.userData.base.copy(win.position);

  /* ---------- 4. gym corner under the window ---------- */
  const gym = new THREE.Group();
  const pad = M.ceramic('#1A1D2A', { roughness: 0.6 });
  put(gym, box(1.25, 0.12, 0.38, pad, 0.05), 0, 0.5, 0);
  for (const sx of [-0.45, 0.45]) put(gym, box(0.06, 0.45, 0.32, M.chrome(), 0.015), sx, 0.23, 0);
  const rack = new THREE.Group();
  put(rack, box(0.08, 0.7, 0.5, black, 0.02), -0.55, 0.35, 0);
  put(rack, box(0.08, 0.7, 0.5, black, 0.02), 0.55, 0.35, 0);
  put(rack, box(1.18, 0.05, 0.5, black, 0.015), 0, 0.32, 0);
  put(rack, box(1.18, 0.05, 0.5, black, 0.015), 0, 0.64, 0);
  [['#2EC4B6', 0.38], ['#FF6B5A', 0.0], ['#7CC4FF', -0.38]].forEach(([c, x]) => {
    for (const y of [0.42, 0.74]) {
      const d = dumbbell({ color: c });
      d.scale.setScalar(0.13);
      d.rotation.y = Math.PI / 2;
      put(rack, d, x, y, 0);
    }
  });
  put(gym, rack, 0.15, 0, -0.62);
  const bell = put(gym, new THREE.Group(), -0.9, 0, 0.2);
  put(bell, new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), M.gloss('#FF6B5A')), 0, 0.16, 0);
  const bellHandle = put(bell, new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 10, 24, Math.PI), M.gloss('#FF6B5A')), 0, 0.28, 0);
  bellHandle.rotation.z = 0;
  add(gym, 1.15).position.set(1.75, 0, -2.45);
  gym.userData.base.copy(gym.position);
  const pot = plant();
  add(pot, 1.25).position.set(3.0, 0, -1.25);
  pot.userData.base.copy(pot.position);

  /* ---------- 5. bookshelf with my cap (Georgia Tech) ---------- */
  const shelf = new THREE.Group();
  const woodMat = M.ceramic('#8A5A3B', { roughness: 0.55 });
  put(shelf, box(0.42, 2.5, 0.05, woodMat, 0.01), 0, 1.25, -0.6);
  put(shelf, box(0.42, 2.5, 0.05, woodMat, 0.01), 0, 1.25, 0.6);
  for (const y of [0.04, 0.66, 1.28, 1.9, 2.5]) put(shelf, box(0.42, 0.05, 1.24, woodMat, 0.01), 0, y, 0);
  const bookCols = ['#2E4BFF', '#FF6B5A', '#E9DFC8', '#2EC4B6', '#16181F', '#7CC4FF', '#1E7A4C', '#F3F2EF'];
  const rB = rng(8);
  for (const y of [0.07, 0.69, 1.31]) {
    let z = -0.55;
    while (z < 0.5) {
      const t = 0.05 + rB() * 0.05;
      const h = 0.38 + rB() * 0.16;
      const b = box(0.3, h, t, M.ceramic(bookCols[Math.floor(rB() * bookCols.length)], { roughness: 0.5 }), 0.01);
      b.rotation.x = rB() < 0.15 ? 0.25 : 0;
      put(shelf, b, 0.02, y + h / 2, z + t / 2);
      z += t + 0.012;
    }
  }
  const cap = gradCap();
  cap.group.traverse((o) => { if (o.material?.color?.getHexString?.() === 'f4d98b') o.material = M.satin('#E9DFC8', { roughness: 0.4 }); });
  cap.group.scale.setScalar(0.32);
  put(shelf, cap.group, 0.02, 2.53, 0.1);
  const globe = put(shelf, new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), M.gloss('#2E4BFF')), 0.02, 2.11, -0.25);
  put(shelf, cyl(0.06, 0.08, 0.06, black), 0.02, 1.95, -0.25);
  add(shelf, 1.35).position.set(-3.27, 0, -1.55);
  shelf.userData.base.copy(shelf.position);

  /* ---------- 6. trophy shelf ---------- */
  const trophies = new THREE.Group();
  put(trophies, box(0.34, 0.06, 2.3, woodMat, 0.015), 0, 0, 0);
  const cups = ['#E9ECF5', '#7CC4FF', '#FF8A6A', '#E9ECF5', '#2EC4B6', '#C3CAD8'].map((c, i) => {
    const cup = trophyCup(c);
    cup.scale.setScalar(i % 2 ? 0.62 : 0.75);
    put(trophies, cup, 0.02, 0.03, -0.95 + i * 0.38);
    return cup;
  });
  add(trophies, 1.5).position.set(-3.3, 2.62, 1.35);
  trophies.userData.base.copy(trophies.position);

  /* ---------- 7. TV, console, beanbag (gaming, YouTube) ---------- */
  const tv = new THREE.Group();
  put(tv, box(0.08, 1.12, 1.9, black, 0.03), 0, 0, 0);
  const game = gameTex();
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.02), new THREE.MeshBasicMaterial({ map: game, toneMapped: false }));
  tvScreen.rotation.y = Math.PI / 2;
  put(tv, tvScreen, 0.045, 0, 0);
  const tvLight = new THREE.PointLight('#2EC4B6', 1.6, 3.5, 2);
  put(tv, tvLight, 0.6, 0, 0);
  add(tv, 1.6).position.set(-3.42, 1.62, 1.35);
  tv.userData.base.copy(tv.position);
  const cabinet = new THREE.Group();
  put(cabinet, box(0.5, 0.42, 1.7, white, 0.04), 0, 0.21, 0);
  put(cabinet, box(0.04, 0.04, 1.5, M.glow('#FF6B5A', { opacity: 1 }), 0.01), 0.26, 0.38, 0);
  const pad2 = put(cabinet, box(0.24, 0.05, 0.16, M.ceramic('#F3F2EF'), 0.03), 0.02, 0.45, 0.45);
  pad2.rotation.y = 0.4;
  add(cabinet, 1.4).position.set(-3.2, 0, 1.35);
  cabinet.userData.base.copy(cabinet.position);
  const bean = new THREE.Group();
  const bag = put(bean, new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), M.ceramic('#2E4BFF', { roughness: 0.6, sheen: 0.8, sheenColor: new THREE.Color('#9DB4FF') })), 0, 0.38, 0);
  bag.scale.set(1, 0.62, 1);
  const dent = put(bean, new THREE.Mesh(new THREE.SphereGeometry(0.44, 32, 24), M.ceramic('#2E4BFF', { roughness: 0.6 })), 0.18, 0.62, 0.05);
  dent.scale.set(0.9, 0.45, 0.95);
  const controller = put(bean, box(0.26, 0.05, 0.16, M.ceramic('#16181F'), 0.03), 0.05, 0.84, 0.1);
  controller.rotation.set(0.1, 0.5, 0);
  add(bean, 1.7).position.set(-1.45, 0, 1.55);
  bean.userData.base.copy(bean.position);

  /* ---------- 8. phone on a ring-light tripod (TikTok filters) ---------- */
  const tripod = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const leg = put(tripod, cyl(0.014, 0.014, 0.95, black, 8), 0, 0.42, 0);
    leg.rotation.set(0.32 * Math.cos((k / 3) * TAU), 0, 0.32 * Math.sin((k / 3) * TAU));
    leg.position.set(Math.sin((k / 3) * TAU) * 0.15, 0.42, -Math.cos((k / 3) * TAU) * 0.15);
  }
  put(tripod, cyl(0.02, 0.02, 0.75, black, 8), 0, 1.2, 0);
  const head = put(tripod, new THREE.Group(), 0, 1.62, 0);
  const ring = put(head, new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 12, 64), M.flat('#FFF1E6')), 0, 0, 0);
  const ringGlow = put(head, sprite(dotTex(), 1.3, 1.3, { color: '#FFD9C4', opacity: 0.35, blending: THREE.AdditiveBlending }), 0, 0, -0.05);
  const phoneBody = put(head, box(0.2, 0.4, 0.025, M.ceramic('#F2F3F6'), 0.03), 0, 0, 0.02);
  const phoneScreen = put(head, new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.37), M.flat('#FF4F7E')), 0, 0, 0.034);
  head.rotation.y = 0.75;
  const heartGeo = new THREE.ShapeGeometry(heartShape(0.05));
  const hearts = [...Array(8)].map((_, k) => {
    const m = new THREE.Mesh(heartGeo, M.flat(k % 3 ? '#FF4F7E' : '#2BE3E8', { transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    m.userData.ph = k / 8;
    put(tripod, m, 0, 1.7, 0);
    return m;
  });
  add(tripod, 1.85).position.set(1.45, 0, 1.0);
  tripod.userData.base.copy(tripod.position);

  /* ---------- rug, fairy lights, dust ---------- */
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.35, 64), M.ceramic('#FF7A59', { roughness: 0.9, clearcoat: 0 }));
  rug.rotation.x = -Math.PI / 2;
  const rugRing = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.08, 64), M.flat('#FFD2C2'));
  rugRing.position.z = 0.002;
  rug.add(rugRing);
  add(rug, 0.4).position.set(0.35, 0.04, 0.55);
  rug.userData.base.copy(rug.position);
  const bulbs = [];
  const lights = new THREE.Group();
  const string = [];
  for (let k = 0; k <= 26; k++) {
    const u = k / 26;
    // Along the back wall, then down the left one, sagging between pins.
    const along = u < 0.5 ? u / 0.5 : (u - 0.5) / 0.5;
    const sag = Math.sin(((along * 4) % 1) * Math.PI) * 0.16;
    const p = u < 0.5
      ? new THREE.Vector3(3.3 - along * 6.6, 3.18 - sag, -3.42)
      : new THREE.Vector3(-3.42, 3.18 - sag, -3.3 + along * 6.6);
    string.push(p);
    if (k % 2 === 0) {
      const bulb = put(lights, new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), M.flat('#FFE2C8')), p.x, p.y - 0.05, p.z);
      bulbs.push(bulb);
    }
  }
  lights.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(string), new THREE.LineBasicMaterial({ color: '#3A3F55' })));
  add(lights, 2.0);
  const dustN = 60;
  const dustPos = new Float32Array(dustN * 3);
  const rD = rng(14);
  for (let i = 0; i < dustN; i++) dustPos.set([-2.4 + rD() * 4.4, 0.4 + rD() * 2.6, -2.8 + rD() * 4.4], i * 3);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.05, map: dotTex(), color: '#FFE3CC', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  root.add(dust);
  const floorShadow = shadow(9.5, 9.5, 0.45, '#050812');
  floorShadow.position.y = -0.56;
  scene.add(floorShadow);

  /* ---------- hotspots: same order as the page's markers ---------- */
  const spots = [
    { obj: win, at: [1.6, 2.95, -3.3], color: '#FF8A6A' },
    { obj: desk, at: [-1.85, 2.22, -3.0], color: '#6CB6FF' },
    { obj: cork, at: [-1.85, 3.05, -3.35], color: '#3FD08A' },
    { obj: tripod, at: [1.45, 2.2, 1.0], color: '#FF4F7E' },
    { obj: shelf, at: [-3.2, 3.0, -1.55], color: '#E9DFC8' },
    { obj: trophies, at: [-3.2, 3.25, 1.35], color: '#7CC4FF' },
    { obj: gym, at: [1.75, 1.15, -2.3], color: '#2EC4B6' },
    { obj: bean, at: [-1.45, 1.25, 1.55], color: '#2E4BFF' },
  ].map((s) => ({ ...s, at: new THREE.Vector3(...s.at), pop: 0, glow: null }));
  const hiLight = new THREE.PointLight('#ffffff', 0, 3.2, 1.8);
  root.add(hiLight);
  const hiPos = new THREE.Vector3(0, 2, 0);
  const hiCol = new THREE.Color('#ffffff');

  let focus = Number.isInteger(window.__roomSpot) ? window.__roomSpot : 0;
  window.addEventListener('room-focus', (e) => {
    const i = Number(e.detail);
    if (!Number.isInteger(i) || i === focus) return;
    focus = i;
    spots[i].pop = 1;
  });
  let built = false;

  // Pointer: hover lights an object up, a click opens it.
  let tg = null;
  let marks = [];
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hover = -1;
  const findSpot = (o) => {
    while (o) {
      const i = spots.findIndex((s) => s.obj === o);
      if (i >= 0) return i;
      o = o.parent;
    }
    return -1;
  };
  const pickAt = (x, y) => {
    if (!tg) return -1;
    tg.ndc(x, y, ndc);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(spots.map((s) => s.obj), true);
    return hits.length ? findSpot(hits[0].object) : -1;
  };

  /* ---------- camera ---------- */
  const look0 = new THREE.Vector3(-0.35, 1.25, -0.4);
  const dir = new THREE.Vector3(1, 0.82, 1).normalize();
  const dist0 = 17.5;
  const look = look0.clone();
  const lookT = new THREE.Vector3();
  const W = new THREE.Vector3();
  let ox = 0;
  let oy = 0;
  let zoom = 1;
  let hueT = 0;

  return {
    scene,
    camera,
    posterT: 6,
    attach(t) {
      tg = t;
      const host = t.el.closest('.room__view') || t.el.parentElement;
      marks = [...host.querySelectorAll('[data-spot]')];
      t.el.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        hover = built ? pickAt(e.clientX, e.clientY) : -1;
        t.el.style.cursor = hover >= 0 ? 'pointer' : '';
      });
      t.el.addEventListener('pointerleave', () => { hover = -1; t.el.style.cursor = ''; });
      t.el.addEventListener('click', (e) => {
        const i = pickAt(e.clientX, e.clientY);
        if (i >= 0) window.dispatchEvent(new CustomEvent('room-pick', { detail: i }));
      });
    },
    update(s) {
      const { t, dt } = s;

      // Build-in: the base, then walls, then everything drops into place.
      parts.forEach((o) => {
        const k = seg(t, o.userData.t0, 0.7);
        const b = o.userData.base;
        if (o === walls) {
          o.scale.set(1, Math.max(0.0001, easeOut(k)), 1);
        } else if (o === base || o === rug) {
          o.scale.setScalar(Math.max(0.0001, easeOutBack(k, 1.3)));
        } else {
          o.position.set(b.x, b.y + (1 - bounce(k)) * 2.2, b.z);
          o.scale.setScalar(Math.max(0.0001, Math.min(1, k * 3)));
        }
      });
      if (!built && t > 2.4) {
        built = true;
        window.dispatchEvent(new Event('room-built'));
      }
      const glowIn = easeOut(seg(t, 1.9, 0.8));
      lampLight.intensity = 4 * glowIn;
      monLight.intensity = 2.2 * glowIn;
      tvLight.intensity = 1.6 * glowIn;
      dust.material.opacity = 0.55 * glowIn;

      // Life: steam, cursor, RGB strip, the TV, hearts, fairy lights, dust.
      cursor.visible = Math.sin(s.time * 6) > 0;
      steam.forEach((sp, k) => {
        const ph = (s.time * 0.35 + k / 3) % 1;
        sp.position.y = 1.24 + ph * 0.45;
        sp.position.x = -1.0 + Math.sin(ph * 6 + k) * 0.03;
        sp.material.opacity = Math.sin(Math.PI * ph) * 0.35 * glowIn;
        sp.scale.setScalar(0.1 + ph * 0.16);
      });
      hueT += dt * 0.08;
      rgbMat.color.setHSL((0.52 + Math.sin(hueT * TAU) * 0.08 + hueT) % 1, 0.9, 0.6);
      game.offset.x = (s.time * 0.04) % 1;
      hearts.forEach((h, k) => {
        const ph = (s.time * 0.28 + h.userData.ph) % 1;
        h.position.set(Math.sin(k * 2.1) * (0.12 + ph * 0.35), 1.75 + ph * 1.2, Math.cos(k * 2.1) * (0.12 + ph * 0.35));
        h.material.opacity = Math.sin(Math.PI * ph) * glowIn;
        h.quaternion.copy(camera.quaternion);
      });
      ringGlow.material.opacity = (0.3 + Math.sin(s.time * 2) * 0.05) * glowIn;
      bulbs.forEach((b, k) => {
        const tw = 0.7 + 0.3 * Math.sin(s.time * 2.2 + k * 1.7);
        b.material.color.setRGB(tw, tw * 0.88, tw * 0.78);
      });
      for (let i = 0; i < dustN; i++) {
        let y = dustPos[i * 3 + 1] + dt * 0.05;
        if (y > 3) y = 0.4;
        dustPos[i * 3 + 1] = y;
      }
      dustGeo.attributes.position.needsUpdate = true;
      winGlow.material.opacity = 0.2 + Math.sin(s.time * 0.5) * 0.03;
      chair.rotation.y = Math.sin(s.time * 0.4) * 0.18;
      globe.rotation.y += dt * 0.4;
      cups.forEach((c, k) => { c.rotation.y = Math.sin(s.time * 0.8 + k) * 0.3; });

      // The open spot pops, glows, and pulls the camera a little.
      const active = built ? focus : -1;
      spots.forEach((sp, i) => {
        sp.pop = damp(sp.pop, 0, 3, dt);
        const lift = (i === active ? 1 : 0) + (i === hover ? 0.6 : 0);
        sp.lift = damp(sp.lift || 0, lift, 6, dt);
        if (parts.includes(sp.obj) && seg(t, sp.obj.userData.t0, 0.7) >= 1) {
          const b = sp.obj.userData.base;
          sp.obj.position.y = b.y + sp.lift * 0.06 + Math.sin(sp.pop * Math.PI) * 0.12;
        }
      });
      if (active >= 0) {
        const sp = spots[active];
        hiPos.lerp(W.copy(sp.at).add({ x: 0.6, y: -0.2, z: 0.6 }), 1 - Math.exp(-4 * dt));
        hiCol.lerp(new THREE.Color(sp.color), 1 - Math.exp(-4 * dt));
      }
      hiLight.position.copy(hiPos);
      hiLight.color.copy(hiCol);
      hiLight.intensity = damp(hiLight.intensity, active >= 0 ? 3.2 : 0, 3, dt);

      // Camera: an isometric three-quarter view that leans toward the open
      // spot and the pointer; tall stages back off to fit.
      const fit = s.aspect < 1.25 ? Math.pow(1.25 / s.aspect, 0.85) : 1;
      lookT.copy(look0);
      if (active >= 0) lookT.lerp(spots[active].at, 0.22);
      look.lerp(lookT, 1 - Math.exp(-2.5 * dt));
      zoom = damp(zoom, active >= 0 ? 0.94 : 1, 2, dt);
      ox = damp(ox, (s.gx * 0.5 + s.px * 0.5) * 0.9, 3, dt);
      oy = damp(oy, (s.gy * 0.5 + s.py * 0.5) * 0.5, 3, dt);
      camera.position.copy(look).addScaledVector(dir, dist0 * fit * zoom);
      camera.position.x += ox - oy * 0.2;
      camera.position.z -= ox * 0.9;
      camera.position.y -= oy;
      camera.lookAt(look);

      // Keep the HTML markers on their objects.
      if (tg && marks.length && tg.w) {
        root.updateMatrixWorld();
        camera.updateMatrixWorld();
        spots.forEach((sp, i) => {
          const el = marks[i];
          if (!el) return;
          W.copy(sp.at).project(camera);
          const x = (W.x * 0.5 + 0.5) * tg.w;
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${((-W.y * 0.5 + 0.5) * tg.h).toFixed(1)}px, 0)`;
          // Names near the right edge open to the left.
          const flip = x > tg.w * 0.68;
          if (el.__flip !== flip) {
            el.__flip = flip;
            el.classList.toggle('is-flip', flip);
          }
          if (el.__hover !== (i === hover)) {
            el.__hover = i === hover;
            el.classList.toggle('is-hover', i === hover);
          }
        });
      }
    },
  };
}
