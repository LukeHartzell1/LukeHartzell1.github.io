/* Procedural models shared by the hero and the section scenes. */
import {
  THREE, C, M, rbox, canvasTex, roundRectPath, setInst, easeOut, clamp, FONT, MONO, enhance,
} from '../kit.js';

/* ---------- Snowflake crystal: six arms that grow branches ---------- */
export function crystal({ arm = 2, thick = 0.075, color = '#DDE6FF', seed = 0, holo = 0.75 } = {}) {
  const group = new THREE.Group();
  const prism = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
  prism.translate(0, 0.5, 0);
  const plate = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
  const mat = enhance(M.pearl(color, { flatShading: true, roughness: 0.08, metalness: 0.12, iridescenceIOR: 1.35 }), { holo });
  const segs = [];
  const plates = [];
  const fr = [0.27, 0.46, 0.64, 0.8];
  const fl = [0.34, 0.29, 0.22, 0.14];
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + Math.PI / 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    segs.push({ x: 0, y: 0, a, len: arm, r: thick, d: 0.04 + k * 0.025 });
    fr.forEach((at, j) => {
      for (const side of [-1, 1]) {
        segs.push({
          x: ca * arm * at, y: sa * arm * at, a: a + (side * Math.PI) / 3,
          len: arm * fl[j] * (1 + ((seed + k + j) % 3) * 0.04), r: thick * 0.72, d: 0.3 + j * 0.11 + k * 0.02,
        });
      }
    });
    plates.push({ x: ca * arm, y: sa * arm, r: thick * 1.9, d: 0.82 + k * 0.02 });
    plates.push({ x: ca * arm * 0.5, y: sa * arm * 0.5, r: thick * 1.15, d: 0.6 + k * 0.02 });
  }
  plates.push({ x: 0, y: 0, r: arm * 0.2, d: 0, center: true });

  const bars = new THREE.InstancedMesh(prism, mat, segs.length);
  const discs = new THREE.InstancedMesh(plate, mat, plates.length);
  group.add(bars, discs);

  function setGrowth(k) {
    segs.forEach((s, i) => {
      const g = easeOut(clamp((k - s.d) / 0.42));
      const sc = Math.max(g, 0.0001);
      setInst(bars, i, s.x, s.y, 0, 0, 0, s.a - Math.PI / 2, s.r * (0.5 + 0.5 * sc), s.len * sc, s.r * (0.5 + 0.5 * sc));
    });
    plates.forEach((p, i) => {
      const g = easeOut(clamp((k - p.d) / 0.3));
      const sc = Math.max(g, 0.0001);
      setInst(discs, i, p.x, p.y, 0, Math.PI / 2, Math.PI / 6, 0, p.r * sc, (p.center ? 0.09 : 0.05) * sc, p.r * sc);
    });
    bars.instanceMatrix.needsUpdate = true;
    discs.instanceMatrix.needsUpdate = true;
  }
  setGrowth(1);
  return { group, setGrowth, material: mat };
}

/* ---------- Phone with my photo on screen ---------- */
let screenMask = null;
function maskTex() {
  if (!screenMask) {
    screenMask = canvasTex(256, 512, (g, w, h) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff';
      roundRectPath(g, 0, 0, w, h, 34);
      g.fill();
    }, { srgb: false });
  }
  return screenMask;
}
export function phone({ w = 1.5, h = 3.05, d = 0.17, body = '#F4F1FF' } = {}) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(rbox(w, h, d, 0.24, 6), M.ceramic(body, { roughness: 0.3 })));
  const sw = w - 0.12;
  const sh = h - 0.12;
  const tex = new THREE.TextureLoader().load(new URL('../../images/opt/luke.webp', import.meta.url).href);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const rx = (sw / sh) / (820 / 1024);
  tex.repeat.set(rx, 1);
  tex.offset.set((1 - rx) / 2, 0);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(sw, sh),
    new THREE.MeshBasicMaterial({ map: tex, alphaMap: maskTex(), transparent: true, toneMapped: false }),
  );
  screen.position.z = d / 2 + 0.002;
  group.add(screen);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), M.glass('#ffffff', { opacity: 0.1, alphaMap: maskTex() }));
  glass.position.z = d / 2 + 0.006;
  group.add(glass);
  const island = new THREE.Mesh(rbox(0.44, 0.12, 0.02, 0.055), M.gloss('#14101f'));
  island.position.set(0, sh / 2 - 0.16, d / 2 + 0.008);
  group.add(island);
  for (const [y, hh] of [[0.62, 0.36], [0.16, 0.36]]) {
    const b = new THREE.Mesh(rbox(0.04, hh, 0.08, 0.018), M.satin('#E3DCFF'));
    b.position.set(w / 2 + 0.012, y, 0);
    group.add(b);
  }
  return { group, screen, sw, sh };
}

/* Pixel "deal with it" shades, built from little cubes. */
export function pixelShades({ px = 0.07, depth = 0.05 } = {}) {
  const rows = [
    '##############',
    ' #####  ##### ',
    ' ##.##  ##.## ',
    '  ###    ###  ',
  ];
  const cells = [];
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ' ') cells.push([x, y, ch]); }));
  const geo = new THREE.BoxGeometry(px, px, depth);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0 }), cells.length);
  const dark = new THREE.Color('#15111f');
  const light = new THREE.Color('#ffffff');
  cells.forEach(([x, y, ch], i) => {
    setInst(mesh, i, (x - 6.5) * px, (1.5 - y) * px, 0);
    mesh.setColorAt(i, ch === '.' ? light : dark);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/* ---------- Dumbbell ---------- */
export function dumbbell({ color = C.lilac } = {}) {
  const group = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 24), M.chrome());
  bar.rotation.z = Math.PI / 2;
  group.add(bar);
  const plateMat = M.ceramic(color, { roughness: 0.32 });
  for (const side of [-1, 1]) {
    for (const [x, r, t] of [[0.62, 0.52, 0.16], [0.8, 0.42, 0.14], [0.95, 0.3, 0.1]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, t, 48), plateMat);
      p.rotation.z = Math.PI / 2;
      p.position.x = side * x;
      group.add(p);
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 24), M.chrome());
    cap.rotation.z = Math.PI / 2;
    cap.position.x = side * 1.08;
    group.add(cap);
  }
  return group;
}

/* ---------- Vinyl record ---------- */
let grooves = null;
export function vinylTex() {
  if (!grooves) {
    grooves = canvasTex(1024, 1024, (g, w) => {
      const c = w / 2;
      const bg = g.createRadialGradient(c, c, 40, c, c, c);
      bg.addColorStop(0, '#2a2240');
      bg.addColorStop(1, '#141020');
      g.fillStyle = bg;
      g.fillRect(0, 0, w, w);
      for (let r = 190; r < 505; r += 3) {
        g.strokeStyle = `rgba(255,255,255,${0.025 + 0.035 * ((r * 7) % 5) / 5})`;
        g.lineWidth = 1;
        g.beginPath();
        g.arc(c, c, r, 0, Math.PI * 2);
        g.stroke();
      }
      for (const r of [300, 380, 450]) {
        g.strokeStyle = 'rgba(0,0,0,0.55)';
        g.lineWidth = 6;
        g.beginPath();
        g.arc(c, c, r, 0, Math.PI * 2);
        g.stroke();
      }
      const lab = g.createLinearGradient(c - 180, c - 180, c + 180, c + 180);
      lab.addColorStop(0, '#C9B6FF');
      lab.addColorStop(0.55, '#F7B6D8');
      lab.addColorStop(1, '#A6C8FF');
      g.fillStyle = lab;
      g.beginPath();
      g.arc(c, c, 175, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#1A1530';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `700 54px ${FONT}`;
      g.fillText('WRAPPED', c, c - 58);
      g.font = `500 30px ${MONO}`;
      g.fillText('anytime · side A', c, c + 62);
      g.beginPath();
      g.arc(c, c, 14, 0, Math.PI * 2);
      g.fillStyle = '#0f0b18';
      g.fill();
    });
  }
  return grooves;
}
export function vinyl({ r = 1.2, t = 0.04 } = {}) {
  const top = new THREE.MeshPhysicalMaterial({ map: vinylTex(), roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 });
  const side = M.gloss('#17121f');
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, t, 128), [side, top, top]);
  return mesh;
}

/* ---------- Graduation cap ---------- */
export function gradCap({ color = '#2B2160' } = {}) {
  const group = new THREE.Group();
  const mat = M.ceramic(color, { roughness: 0.5, sheenColor: new THREE.Color('#8c7bff') });
  const board = new THREE.Mesh(rbox(1.7, 0.07, 1.7, 0.03), mat);
  board.position.y = 0.42;
  board.rotation.y = Math.PI / 4;
  const skull = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.66, 0.42, 48), mat);
  skull.position.y = 0.2;
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 16), M.chrome('#F4D98B'));
  button.position.y = 0.47;
  group.add(board, skull, button);
  const tassel = new THREE.Group();
  tassel.position.set(0, 0.47, 0);
  const cordMat = M.satin('#F4D98B', { roughness: 0.4 });
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.9, 8), cordMat);
  cord.rotation.z = Math.PI / 2;
  cord.position.x = 0.45;
  const drop = new THREE.Group();
  drop.position.x = 0.9;
  const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8), cordMat);
  hang.position.y = -0.21;
  const tuft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.2, 16), cordMat);
  tuft.position.y = -0.48;
  drop.add(hang, tuft);
  tassel.add(cord, drop);
  tassel.rotation.y = -Math.PI / 4;
  group.add(tassel);
  return { group, drop };
}

/* ---------- Paper plane ---------- */
export function paperPlane({ color = '#ffffff', edge = C.violet } = {}) {
  const N = [0, 0, 1.3];
  const L = [-1.0, 0.16, -0.75];
  const R = [1.0, 0.16, -0.75];
  const Cc = [0, 0, -0.75];
  const K = [0, -0.36, -0.75];
  const tris = [N, Cc, L, N, R, Cc, N, K, Cc].flat();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, M.paper(color, { roughness: 0.7 }));
  const lines = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 1),
    new THREE.LineBasicMaterial({ color: edge, transparent: true, opacity: 0.35 }),
  );
  const group = new THREE.Group();
  group.add(mesh, lines);
  return group;
}

/* ---------- A simple person (capsule + head) ---------- */
export function person({ color = '#ffffff', mat = null } = {}) {
  const m = mat || M.ceramic(color);
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 8, 20), m);
  body.position.y = 0.43;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 20), m);
  head.position.y = 1.0;
  group.add(body, head);
  return group;
}
