/* Hero: my story as a small universe.
   It opens outside a spiral galaxy. The camera dives in through the stars
   toward one point of light on an outer arm, the point ignites into a star
   (the liquid pearl), and six planets swing in from beyond the edges of the
   screen and settle into orbit. Each planet is a chapter, in the same order
   as the headline's "I'm a ..." words:
     an ice world with a snowflake moon (Snowflake, developer advocate),
     a green world ringed with practice cards (Interview Prepper, founder),
     a dark world with neon auroras and drifting hearts (TikTok filters),
     an orange gas giant with a λ moon and a ring of events (AWS),
     a navy world with a mortarboard moon (Georgia Tech),
     and a teal world with a dumbbell moon (the gym).
   An asteroid belt, the galaxy's band, nebulae, shooting stars and a paper-plane
   comet fill in the rest. The page reveals the headline when the star
   ignites ('hero-arrive'), spins the planets while its word reel spins
   ('hero-spin'), and tells the scene which planet to bring forward
   ('hero-role'). The scene places the HTML planet labels ([data-orbit]). */
import {
  THREE, M, damp, clamp, lerp, easeOut, easeInOut, easeOutBack, seg, enhance, canvasTex, dotTex, sprite, rng,
  rbox, heartShape, setInst, textTex, label,
} from '../kit.js';
import { crystal, dumbbell, gradCap, paperPlane } from './builders.js';

const TAU = Math.PI * 2;
const FLIGHT = 3.0; // the dive in, in seconds of scene time
const IGNITE = FLIGHT - 0.55; // the star lights up
const ARRIVE = FLIGHT - 0.35; // the page starts revealing the headline
const PX = Math.min(window.devicePixelRatio || 1, 2);

/* ---------- point clouds with per-point size, color and twinkle ---------- */
const POINT_VERT = (attenuate, max) => /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPx;
  uniform float uScale;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vTw = 0.72 + 0.28 * sin(uTime * (0.5 + aPhase * 2.2) + aPhase * 37.0);
    vColor = aColor;
    ${attenuate
    ? `gl_PointSize = aSize * uPx * clamp(uScale / max(0.1, -mv.z), 0.5, ${max.toFixed(2)});`
    : 'gl_PointSize = aSize * uPx;'}
  }`;
const POINT_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = pow(clamp(1.0 - d, 0.0, 1.0), 1.7) * uOpacity;
    gl_FragColor = vec4(vColor * vTw, a);
    #include <colorspace_fragment>
  }`;
const shared = { uTime: { value: 0 } };

function cloud(pos, col, size, phase, { attenuate = false, scale = 160, max = 2.4, opacity = 1 } = {}) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uPx: { value: PX }, uScale: { value: scale }, uOpacity: { value: opacity } },
    vertexShader: POINT_VERT(attenuate, max),
    fragmentShader: POINT_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

const gauss = (r) => (r() + r() + r() + r() - 2) * 0.5;

/* The night sky: thousands of stars at "infinity" (the sky follows the camera). */
function skyStars(n, seed) {
  const r = rng(seed);
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const ph = new Float32Array(n);
  const pal = ['#FFFFFF', '#DDE7FF', '#BCD0FF', '#FFE3EB', '#CDF5FF'].map((h) => new THREE.Color(h));
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1;
    const a = r() * TAU;
    const s = Math.sqrt(1 - u * u);
    const rad = 900 + r() * 300;
    pos[i * 3] = Math.cos(a) * s * rad;
    pos[i * 3 + 1] = u * rad;
    pos[i * 3 + 2] = Math.sin(a) * s * rad;
    const c = pal[Math.floor(r() * pal.length)];
    const b = 0.3 + Math.pow(r(), 3) * 0.95;
    col[i * 3] = c.r * b;
    col[i * 3 + 1] = c.g * b;
    col[i * 3 + 2] = c.b * b;
    size[i] = 1.4 + Math.pow(r(), 5) * 3.6;
    ph[i] = r();
  }
  return cloud(pos, col, size, ph);
}

/* A two-armed spiral galaxy in its local XZ plane. */
function galaxy(n, R, seed, keep = () => true) {
  const r = rng(seed);
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const ph = new Float32Array(n);
  const cCore = new THREE.Color('#FFF2E6');
  const cWarm = new THREE.Color('#FFC6D8');
  const cArm = new THREE.Color('#93AEFF');
  const cEdge = new THREE.Color('#5CD3FF');
  const cHii = new THREE.Color('#FF5C8D');
  const c = new THREE.Color();
  const ARMS = 2;
  for (let i = 0; i < n; i++) {
    let x;
    let y;
    let z;
    let b;
    const kind = r();
    if (kind < 0.085) {
      // The bulge: a dense warm core.
      const rr = Math.abs(gauss(r)) * R * 0.34;
      const a = r() * TAU;
      const u = r() * 2 - 1;
      const s = Math.sqrt(1 - u * u);
      x = Math.cos(a) * s * rr;
      y = u * rr * 0.45;
      z = Math.sin(a) * s * rr;
      c.copy(cCore).lerp(cWarm, clamp(rr / (R * 0.2)));
      size[i] = 2.2 + r() * 2.6;
      b = 0.85;
    } else if (kind < 0.8) {
      // Two arms that sweep out of the core, with pink star-forming knots.
      const t = 0.06 + Math.pow(r(), 0.9) * 0.94;
      const arm = Math.floor(r() * ARMS) * (TAU / ARMS);
      const ang = arm + 4.6 * Math.pow(t, 0.8) + gauss(r) * (0.55 + 0.35 * t);
      const rad = t * R * (1 + gauss(r) * 0.1);
      x = Math.cos(ang) * rad;
      z = Math.sin(ang) * rad;
      y = gauss(r) * R * 0.035 * (1.3 - t);
      c.copy(cWarm).lerp(cArm, clamp((t - 0.12) * 2.3)).lerp(cEdge, clamp((t - 0.58) * 2.3));
      if (r() < 0.06) {
        c.copy(cHii);
        size[i] = 3.2 + r() * 3.4;
        b = 1.2;
      } else {
        size[i] = 1.8 + r() * 2.6;
        b = 0.75 + r() * 0.6;
      }
    } else {
      // A faint diffuse disc between the arms, densest near the core.
      const t = Math.min(1.05, -Math.log(1 - r() * 0.98) * 0.3);
      const a = r() * TAU;
      x = Math.cos(a) * t * R * 1.05;
      z = Math.sin(a) * t * R * 1.05;
      y = gauss(r) * R * 0.035;
      c.copy(cArm).lerp(cEdge, t);
      size[i] = 1.4 + r() * 1.8;
      b = 0.35 + r() * 0.35;
    }
    if (!keep(x, y, z, r())) {
      i--;
      continue;
    }
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
    col[i * 3] = c.r * b;
    col[i * 3 + 1] = c.g * b;
    col[i * 3 + 2] = c.b * b;
    ph[i] = r();
  }
  const g = new THREE.Group();
  const pts = cloud(pos, col, size, ph, { attenuate: true, scale: 210, max: 2.3 });
  g.add(pts);
  // A soft disc of light under the stars, flat in the galaxy's plane.
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2.4, R * 2.4),
    new THREE.MeshBasicMaterial({
      map: discTex(), color: '#8FA8FF', transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  g.add(disc);
  const bulge = sprite(dotTex(), R * 0.36, R * 0.36, { color: '#FFE6EE', opacity: 0.32, blending: THREE.AdditiveBlending });
  g.add(bulge);
  return { group: g, points: pts, disc, bulge };
}

function discTex() {
  return canvasTex(512, 512, (g, w) => {
    const c = w / 2;
    const grd = g.createRadialGradient(c, c, 0, c, c, c);
    grd.addColorStop(0, 'rgba(255,236,242,0.95)');
    grd.addColorStop(0.12, 'rgba(255,200,222,0.5)');
    grd.addColorStop(0.4, 'rgba(150,175,255,0.18)');
    grd.addColorStop(1, 'rgba(90,140,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, w);
  });
}

/* Wispy cloud texture for nebulae. */
function cloudTex(seed) {
  const r = rng(seed);
  return canvasTex(256, 256, (g, w) => {
    for (let i = 0; i < 54; i++) {
      const ang = r() * TAU;
      const d = Math.pow(r(), 0.75) * w * 0.3;
      const x = w / 2 + Math.cos(ang) * d;
      const y = w / 2 + Math.sin(ang) * d * 0.72;
      const rad = w * (0.07 + r() * 0.17);
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, `rgba(255,255,255,${(0.08 + r() * 0.12).toFixed(3)})`);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, w);
    }
  });
}

/* Thin rays for the star's glare. */
function raysTex() {
  return canvasTex(512, 512, (g, w) => {
    const c = w / 2;
    g.translate(c, c);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + (i % 2) * 0.1;
      const len = c * (i % 4 === 0 ? 0.98 : i % 2 ? 0.42 : 0.66);
      const grd = g.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
      grd.addColorStop(0, 'rgba(255,255,255,0.7)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.strokeStyle = grd;
      g.lineWidth = i % 4 === 0 ? 3.2 : 1.6;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      g.stroke();
    }
  });
}

/* A planet's surface: soft bands with streaks, spots, polar caps or glowing lines. */
function bandTex(stops, { seed = 1, spots = 0, streaks = 0.35, caps = null, storm = null, glow = null } = {}) {
  const r = rng(seed);
  const cols = stops.map((h) => new THREE.Color(h));
  const pick = (v) => {
    const x = clamp(v) * (cols.length - 1);
    const i = Math.min(cols.length - 2, Math.floor(x));
    return cols[i].clone().lerp(cols[i + 1], x - i);
  };
  const ph = [r() * 9, r() * 9, r() * 9];
  return canvasTex(1024, 512, (g, w, h) => {
    for (let y = 0; y < h; y++) {
      const v = y / h;
      const n = 0.5 + 0.27 * Math.sin(v * 9 + ph[0]) + 0.15 * Math.sin(v * 23 + ph[1]) + 0.08 * Math.sin(v * 61 + ph[2]);
      g.fillStyle = `#${pick(n).getHexString()}`;
      g.fillRect(0, y, w, 1);
    }
    for (let i = 0; i < 260; i++) {
      const y = r() * h;
      const c = pick(0.5 + 0.5 * Math.sin((y / h) * 9 + ph[0] + 1.5));
      g.strokeStyle = `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${(streaks * r()).toFixed(3)})`;
      g.lineWidth = 1 + r() * 4;
      g.beginPath();
      const x0 = r() * w;
      g.moveTo(x0, y);
      g.bezierCurveTo(x0 + 80, y + (r() - 0.5) * 14, x0 + 180, y + (r() - 0.5) * 14, x0 + 260 + r() * 240, y + (r() - 0.5) * 10);
      g.stroke();
    }
    for (let i = 0; i < spots; i++) {
      const x = r() * w;
      const y = h * (0.3 + r() * 0.4);
      const grd = g.createRadialGradient(x, y, 0, x, y, 30);
      grd.addColorStop(0, 'rgba(255,255,255,0.4)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(x, y, 60, 22, 0, 0, TAU);
      g.fill();
    }
    if (storm) {
      const [sx, sy, colr] = storm;
      g.save();
      g.translate(w * sx, h * sy);
      g.scale(1, 0.45);
      for (let k = 6; k > 0; k--) {
        g.fillStyle = k % 2 ? colr : 'rgba(255,230,210,0.5)';
        g.globalAlpha = 0.18 + (6 - k) * 0.1;
        g.beginPath();
        g.arc(0, 0, k * 11, 0, TAU);
        g.fill();
      }
      g.restore();
      g.globalAlpha = 1;
    }
    if (caps) {
      for (const top of [true, false]) {
        const grd = g.createLinearGradient(0, top ? 0 : h, 0, top ? h * 0.2 : h * 0.8);
        grd.addColorStop(0, caps);
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd;
        g.fillRect(0, top ? 0 : h * 0.8, w, h * 0.2);
      }
    }
    if (glow) {
      // Bright aurora lines on black, used as an emissive map.
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 12; i++) {
        const y = h * (0.12 + r() * 0.76);
        g.strokeStyle = glow[i % glow.length];
        g.lineWidth = 2 + r() * 3;
        g.globalAlpha = 0.85;
        g.beginPath();
        for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin((x / w) * TAU * (2 + (i % 3)) + i) * 14);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
  });
}

function ringTex(inner, rgb, seed = 2) {
  const r = rng(seed);
  return canvasTex(512, 512, (g, w) => {
    const c = w / 2;
    for (let rad = c * inner; rad < c; rad += 1.5) {
      const k = (rad - c * inner) / (c * (1 - inner));
      const a = (0.12 + 0.55 * Math.abs(Math.sin(rad * 0.11 + r() * 0.5)) * (0.55 + r() * 0.45)) * Math.sin(Math.PI * k);
      g.strokeStyle = `rgba(${rgb},${a.toFixed(3)})`;
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(c, c, rad, 0, TAU);
      g.stroke();
    }
  });
}

const glowSprite = (color, size, opacity) => sprite(dotTex(), size, size, { color, opacity, blending: THREE.AdditiveBlending });

/* A rim of atmosphere: brightest at the silhouette. */
function atmosphere(radius, color, k = 1.2, p = 2.4) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uK: { value: k }, uP: { value: p } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uK;
      uniform float uP;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uP) * uK;
        gl_FragColor = vec4(uColor, clamp(f, 0.0, 1.0));
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), mat);
}

/* An orbit line that glows brightest just behind its planet. */
function orbitLine(R, color) {
  const N = 256;
  const pos = new Float32Array((N + 1) * 3);
  const ang = new Float32Array(N + 1);
  for (let k = 0; k <= N; k++) {
    const a = (k / N) * TAU;
    pos[k * 3] = Math.cos(a) * R;
    pos[k * 3 + 2] = Math.sin(a) * R;
    ang[k] = a;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAng', new THREE.BufferAttribute(ang, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uA: { value: 0 }, uBase: { value: 0.1 }, uTrail: { value: 0.75 }, uOpacity: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aAng;
      varying float vAng;
      void main() {
        vAng = aAng;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uA;
      uniform float uBase;
      uniform float uTrail;
      uniform float uOpacity;
      varying float vAng;
      void main() {
        float d = mod(uA - vAng, 6.2831853);
        float a = (uBase + uTrail * exp(-d * 1.1)) * uOpacity;
        gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Line(geo, mat);
}

/* A glowing ribbon that follows a planet in: wide and bright at the head,
   thin and faint at the end, always turned to face the camera. */
function ribbon(n, color) {
  const pos = new Float32Array(n * 6);
  const fade = new Float32Array(n * 2);
  const side = new Float32Array(n * 2);
  const idx = [];
  for (let k = 0; k < n; k++) {
    fade[k * 2] = fade[k * 2 + 1] = k / (n - 1);
    side[k * 2] = -1;
    side[k * 2 + 1] = 1;
    if (k < n - 1) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aFade', new THREE.BufferAttribute(fade, 1));
  geo.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aFade;
      attribute float aSide;
      varying float vFade;
      varying float vSide;
      void main() {
        vFade = aFade;
        vSide = aSide;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vFade;
      varying float vSide;
      void main() {
        float across = 1.0 - abs(vSide);
        float a = across * across * pow(1.0 - vFade, 1.5) * uOpacity;
        vec3 c = mix(uColor, vec3(1.0), across * (1.0 - vFade) * 0.55);
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return { mesh, pos, mat, n };
}

/* A comet-style tail of glowing points, laid along a curve each frame. */
function tail(n, color, size) {
  const pos = new Float32Array(n * 3);
  const fade = new Float32Array(n);
  for (let k = 0; k < n; k++) fade[k] = k / (n - 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aFade', new THREE.BufferAttribute(fade, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uPx: { value: PX }, uSize: { value: size }, uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aFade;
      uniform float uPx;
      uniform float uSize;
      varying float vFade;
      void main() {
        vFade = aFade;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uSize * uPx * (1.0 - aFade * 0.75) * 320.0 / max(0.1, -mv.z), 0.0, 90.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.0) * pow(1.0 - vFade, 1.4) * uOpacity;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return { pts, pos, mat, n };
}

/* Tiny practice card for the Interview Prepper ring. */
function cardTex() {
  return canvasTex(128, 88, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1E7A4C';
    g.fillRect(0, 0, w, 22);
    g.fillStyle = '#C9D3CC';
    g.fillRect(14, 36, 90, 9);
    g.fillRect(14, 54, 64, 9);
  });
}

function lambdaCube() {
  const box = new THREE.Mesh(rbox(1, 1, 1, 0.24, 5), enhance(M.pearl('#FFE9D6'), { holo: 0.6 }));
  const lam = label(textTex('λ', { w: 256, h: 256, size: 190, weight: 600, color: '#FF7A2F' }), 0.62, 0.62);
  lam.position.z = 0.51;
  box.add(lam);
  return box;
}

export function hero(env) {
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentIntensity = 0.32;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 4000);
  scene.add(new THREE.HemisphereLight('#aebcff', '#1b2142', 0.55));
  const fill = new THREE.DirectionalLight('#a9bbff', 0.28);
  fill.position.set(-6, 5, 8);
  scene.add(fill);

  // Where the camera ends up, and the system it looks at (at the origin).
  const camEnd = new THREE.Vector3(-1.5, 8.4, 24.6);
  const lookEnd = new THREE.Vector3(0, 0, 0);
  const dEnd = lookEnd.clone().sub(camEnd).normalize();
  const rEnd = new THREE.Vector3().crossVectors(dEnd, new THREE.Vector3(0, 1, 0)).normalize();
  const uEnd = new THREE.Vector3().crossVectors(rEnd, dEnd).normalize();

  /* ---------- the universe ---------- */
  const sky = skyStars(3800, 3);
  scene.add(sky);
  const milky = new THREE.Group();
  scene.add(milky);

  // The galaxy lies so that, from the final view, its band rises across the
  // sky behind the system and its bright core glows up and to the right.
  const GR = 120;
  const tiltB = 0.95;
  const along = rEnd.clone().multiplyScalar(Math.cos(tiltB)).addScaledVector(uEnd, Math.sin(tiltB));
  const nGal = new THREE.Vector3().crossVectors(along, dEnd).normalize();
  if (nGal.y < 0) nGal.negate();
  const toGC = dEnd.clone().multiplyScalar(Math.cos(0.62)).addScaledVector(along, Math.sin(0.62)).normalize();
  const GC = camEnd.clone().addScaledVector(toGC, GR * 0.56);
  const qGal = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), nGal);
  // Keep a clear bubble around the system so no stars drift in front of it.
  // (Tall screens pull the camera back along the same line, so the clearing
  // runs out past the end of the flight.)
  const kv = new THREE.Vector3();
  const lineEnd = camEnd.clone().multiplyScalar(2.6);
  const seg3 = new THREE.Line3(new THREE.Vector3(), lineEnd);
  const kp = new THREE.Vector3();
  const gal = galaxy(28000, GR, 5, (x, y, z, rnd) => {
    kv.set(x, y, z).applyQuaternion(qGal).add(GC);
    seg3.closestPointToPoint(kv, true, kp);
    return kv.length() > 24 * (0.6 + 0.4 * rnd) && kv.distanceTo(kp) > 14 * (0.7 + 0.3 * rnd);
  });
  gal.group.position.copy(GC);
  gal.group.quaternion.copy(qGal);
  scene.add(gal.group);
  {
    // Band stars: thick near the plane, warm toward the galaxy's core.
    const n = 5200;
    const r = rng(77);
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const ph = new Float32Array(n);
    const e1 = toGC.clone();
    const e2 = new THREE.Vector3().crossVectors(nGal, e1).normalize();
    const cA = new THREE.Color('#A9BEFF');
    const cB = new THREE.Color('#FFC9DA');
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = gauss(r) * 2.4;
      const lat = gauss(r) * (0.09 + 0.05 * Math.exp(-a * a * 2)) + gauss(r) * 0.03;
      const v = e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a));
      v.multiplyScalar(Math.cos(lat)).addScaledVector(nGal, Math.sin(lat)).multiplyScalar(950);
      pos.set([v.x, v.y, v.z], i * 3);
      c.copy(cA).lerp(cB, Math.exp(-a * a * 3) * 0.8 + (r() < 0.05 ? 0.6 : 0));
      const b = 0.25 + Math.pow(r(), 2.5) * 0.85;
      col.set([c.r * b, c.g * b, c.b * b], i * 3);
      size[i] = 1.1 + Math.pow(r(), 4) * 2.6;
      ph[i] = r();
    }
    milky.add(cloud(pos, col, size, ph));
    // Soft glow along the band, brightest toward the galaxy's core.
    const along2 = e1.clone();
    [[0, 1700, 240, '#7F95FF', 0.12], [0.18, 900, 200, '#FFB3CB', 0.1], [-0.5, 1100, 170, '#58D2FF', 0.06]].forEach(([off, w, h, colr, o]) => {
      const sp = sprite(dotTex(), w, h, { color: colr, opacity: o, blending: THREE.AdditiveBlending });
      sp.position.copy(along2).applyAxisAngle(nGal, off).multiplyScalar(900);
      sp.userData.o = o;
      milky.add(sp);
    });
  }

  // Nebulae far behind the system.
  const nebula = new THREE.Group();
  const rN = rng(17);
  [
    ['#2747FF', 420, 0.2, [-0.35, 0.18]], ['#16C6D8', 330, 0.16, [0.42, 0.28]], ['#FF4F86', 230, 0.12, [0.62, -0.12]],
    ['#3A5BFF', 520, 0.1, [0.1, -0.35]], ['#FF7A45', 200, 0.09, [-0.62, -0.2]],
  ].forEach(([colr, s, o, [ax, ay]], i) => {
    const sp = sprite(cloudTex(30 + i), s, s * 0.72, { color: colr, opacity: o, blending: THREE.AdditiveBlending });
    sp.material.rotation = rN() * TAU;
    sp.position.copy(camEnd).addScaledVector(dEnd, 640).addScaledVector(rEnd, ax * 640).addScaledVector(uEnd, ay * 640);
    nebula.add(sp);
  });
  scene.add(nebula);

  // Shooting stars across the sky now and then.
  const shootGeo = new THREE.BufferGeometry();
  const shootPos = new Float32Array(6);
  shootGeo.setAttribute('position', new THREE.BufferAttribute(shootPos, 3));
  shootGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array([1, 1, 1, 0, 0, 0]), 3));
  const shooting = new THREE.Line(shootGeo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  shooting.frustumCulled = false;
  scene.add(shooting);
  const rS = rng(91);
  let shootAt = 4.2;
  const shootA = new THREE.Vector3();
  const shootB = new THREE.Vector3();

  /* ---------- the star ---------- */
  const sys = new THREE.Group();
  sys.rotation.set(0.24, 0, -0.05);
  scene.add(sys);
  const uTime = { value: 0 };
  const coreMat = enhance(M.pearl('#FFFFFF', {
    roughness: 0.06, iridescenceIOR: 1.8, iridescenceThicknessRange: [100, 820], metalness: 0.05,
    emissive: new THREE.Color('#FFF1F6'), emissiveIntensity: 0.95, envMapIntensity: 1.5,
  }), { uTime, liquid: [0.05, 0.75], holo: 1.0 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.95, 128, 96), coreMat);
  sys.add(core);
  const halo1 = glowSprite('#FFF4F8', 3.6, 0);
  const halo2 = glowSprite('#86A2FF', 9, 0);
  const halo3 = glowSprite('#3FC8FF', 20, 0);
  const rays = sprite(raysTex(), 8.5, 8.5, { color: '#EAF0FF', opacity: 0, blending: THREE.AdditiveBlending });
  const streak = sprite(dotTex(), 15, 0.26, { color: '#B4C6FF', opacity: 0, blending: THREE.AdditiveBlending });
  const flash = glowSprite('#FFFFFF', 15, 0);
  sys.add(halo3, halo2, halo1, rays, streak, flash);
  // The point of light we fly toward before the star ignites.
  const beacon = cloud(new Float32Array(3), new Float32Array([1, 0.93, 0.97]), new Float32Array([14]), new Float32Array([0.3]));
  sys.add(beacon);
  // A flat shockwave across the orbital plane when it ignites.
  const shockMat = new THREE.MeshBasicMaterial({
    map: ringTex(0.78, '200,215,255', 8), color: '#CFE0FF', transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const shock = new THREE.Mesh(new THREE.RingGeometry(0.78, 1, 160), shockMat);
  shock.rotation.x = -Math.PI / 2;
  sys.add(shock);
  const sun = new THREE.PointLight('#FFF0F4', 0, 0, 1.6);
  sys.add(sun);

  /* ---------- the planets, one per chapter ---------- */
  const DEFS = [
    {
      dot: '#7CC4FF', R: 2.55, size: 0.5, speed: 0.3, tilt: 0.05, from: [-7, 3.5, 1.2],
      tex: bandTex(['#A9C4F2', '#E9F2FF', '#C3D8FF', '#F8FBFF', '#B1CBF7'], { seed: 11, streaks: 0.5, caps: 'rgba(255,255,255,0.95)' }),
    },
    {
      dot: '#3FD08A', R: 3.45, size: 0.54, speed: 0.24, tilt: -0.06, from: [8, -2.5, 0.6],
      tex: bandTex(['#0F5131', '#2C9A62', '#8ED6AF', '#1C7A4B', '#C7EFD8'], { seed: 12, streaks: 0.4 }),
    },
    {
      dot: '#FF3B6B', R: 4.45, size: 0.56, speed: 0.19, tilt: 0.08, from: [-6.5, -4.5, 1.6],
      tex: bandTex(['#121219', '#1D1D29', '#0D0D13', '#24243A'], { seed: 13, streaks: 0.25 }),
      glow: bandTex(['#000000', '#000000'], { seed: 14, streaks: 0, glow: ['#FF3B6B', '#2BE3E8', '#FF7AA2'] }),
    },
    {
      dot: '#FF9F43', R: 5.7, size: 0.82, speed: 0.15, tilt: -0.04, from: [9.5, 4, 1],
      tex: bandTex(['#D9702F', '#FFC58E', '#A9512A', '#FF9F43', '#3B4757', '#F4B57D', '#C8622C'], { seed: 15, spots: 4, storm: [0.62, 0.62, '#B4492A'] }),
    },
    {
      dot: '#E9DFC8', R: 6.85, size: 0.52, speed: 0.12, tilt: 0.07, from: [-9.5, 1, -0.4],
      tex: bandTex(['#141F3A', '#22345E', '#1A2949', '#31467A', '#2A3D69', '#CFC6B0'], { seed: 16, streaks: 0.45 }),
    },
    {
      dot: '#2EC4B6', R: 7.85, size: 0.5, speed: 0.1, tilt: -0.05, from: [7.5, -5.5, 1.2],
      tex: bandTex(['#0F2A2C', '#17423F', '#1F5C57', '#2A8C82', '#2EC4B6', '#9BE8DF'], { seed: 18, streaks: 0.5 }),
    },
  ];
  const rP = rng(21);
  const planets = DEFS.map((d, i) => {
    const pivot = new THREE.Group(); // the orbit's plane
    pivot.rotation.set(d.tilt, 0, d.tilt * 0.6);
    sys.add(pivot);
    const body = new THREE.Group();
    pivot.add(body);
    const mat = new THREE.MeshStandardMaterial({ map: d.tex, roughness: 0.78, metalness: 0, envMapIntensity: 0.4 });
    if (d.glow) {
      mat.emissiveMap = d.glow;
      mat.emissive = new THREE.Color('#ffffff');
      mat.emissiveIntensity = 1.5;
    }
    const ball = new THREE.Mesh(new THREE.SphereGeometry(d.size, 72, 48), mat);
    ball.rotation.z = 0.4 * (rP() - 0.5);
    const spinner = new THREE.Group();
    spinner.add(ball);
    body.add(spinner);
    const atmo = atmosphere(d.size * 1.16, d.dot, 1.1, 2.6);
    body.add(atmo);
    const glow = glowSprite(d.dot, d.size * 4.6, 0.16);
    body.add(glow);
    const orbit = orbitLine(d.R, d.dot);
    pivot.add(orbit);
    const trail = ribbon(72, d.dot);
    scene.add(trail.mesh);
    return {
      ...d, i, pivot, body, ball, spinner, atmo, glow, orbit, trail, a: rP() * TAU, focus: 0, arrive: 0,
      from: new THREE.Vector3(...d.from),
    };
  });

  // Snowflake: a crystal moon and a thin ring of ice.
  const snow = crystal({ arm: 0.24, thick: 0.016 });
  planets[0].body.add(snow.group);
  const ice = new THREE.Mesh(
    new THREE.RingGeometry(0.66, 0.98, 128),
    new THREE.MeshBasicMaterial({ map: ringTex(0.66 / 0.98, '205,228,255', 4), transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
  );
  ice.rotation.x = -Math.PI / 2 + 0.32;
  planets[0].body.add(ice);
  // Interview Prepper: a ring of practice cards.
  const cardsN = 16;
  const cards = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.2, 0.14),
    new THREE.MeshBasicMaterial({ map: cardTex(), side: THREE.DoubleSide, toneMapped: false }),
    cardsN,
  );
  planets[1].body.add(cards);
  // TikTok: hearts rising off the planet.
  const heartGeo = new THREE.ShapeGeometry(heartShape(0.075));
  const hearts = [...Array(10)].map((_, k) => {
    const m = new THREE.Mesh(heartGeo, M.flat(k % 3 ? '#FF3B6B' : '#2BE3E8', { transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    m.userData.ph = k / 10;
    planets[2].body.add(m);
    return m;
  });
  // AWS: a ring, a λ moon, and a stream of events around it.
  const awsRing = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.6, 160),
    new THREE.MeshBasicMaterial({ map: ringTex(1.05 / 1.6, '255,196,140', 6), transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
  );
  awsRing.rotation.x = -Math.PI / 2 + 0.38;
  planets[3].body.add(awsRing);
  const lam = lambdaCube();
  lam.scale.setScalar(0.26);
  planets[3].body.add(lam);
  const evN = 120;
  const evPos = new Float32Array(evN * 3);
  const evCol = new Float32Array(evN * 3);
  const evSize = new Float32Array(evN).fill(3.2);
  const evPh = new Float32Array(evN);
  const evC = new THREE.Color('#FFC48A');
  for (let q = 0; q < evN; q++) {
    evCol.set([evC.r, evC.g, evC.b], q * 3);
    evPh[q] = q / evN;
  }
  const events = cloud(evPos, evCol, evSize, evPh, { attenuate: true, scale: 18, max: 8 });
  events.rotation.x = 0.38;
  planets[3].body.add(events);
  // Georgia Tech: a mortarboard moon. The gym: a dumbbell moon.
  const cap = gradCap();
  cap.group.traverse((o) => { if (o.material?.color?.getHexString?.() === 'f4d98b') o.material = M.satin('#E9DFC8', { roughness: 0.4 }); });
  cap.group.scale.setScalar(0.34);
  planets[4].body.add(cap.group);
  const bell = dumbbell({ color: '#FF6B5A' });
  bell.scale.setScalar(0.2);
  planets[5].body.add(bell);

  // The asteroid belt, between the Prepper and TikTok orbits.
  const AN = 320;
  const rocks = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, flatShading: true }),
    AN,
  );
  const rA = rng(33);
  const rockC = [new THREE.Color('#8C93A8'), new THREE.Color('#A99A8C'), new THREE.Color('#6F7790')];
  const rockData = [...Array(AN)].map((_, q) => {
    rocks.setColorAt(q, rockC[q % 3]);
    return { a: rA() * TAU, r: 3.95 + gauss(rA) * 0.32, y: gauss(rA) * 0.22, s: 0.018 + Math.pow(rA(), 3) * 0.075, spin: rA() * TAU, w: 0.8 + rA() * 0.4 };
  });
  rocks.instanceColor.needsUpdate = true;
  sys.add(rocks);

  // A focus ring that glides to whichever planet the headline is on.
  const reticleTex = canvasTex(512, 512, (g, w) => {
    const c = w / 2;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 7;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.arc(c, c, c - 12, (k / 4) * TAU + 0.18, ((k + 1) / 4) * TAU - 0.18);
      g.stroke();
    }
    g.lineWidth = 2.5;
    g.globalAlpha = 0.6;
    g.beginPath();
    g.arc(c, c, c - 40, 0, TAU);
    g.stroke();
  });
  const reticle = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: reticleTex, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }),
  );
  scene.add(reticle);

  // A paper-plane comet that crosses the system now and then.
  const comet = paperPlane({ color: '#ffffff', edge: '#7CC4FF' });
  comet.scale.setScalar(0.3);
  scene.add(comet);
  const cometTail = tail(40, '#BFD4FF', 0.22);
  scene.add(cometTail.pts);

  // Warp streaks while the camera dives.
  const WN = 520;
  const wPos = new Float32Array(WN * 6);
  const wCol = new Float32Array(WN * 6);
  const rW = rng(44);
  const wGeo = new THREE.BufferGeometry();
  wGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
  wGeo.setAttribute('color', new THREE.BufferAttribute(wCol, 3));
  const warp = new THREE.LineSegments(wGeo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  warp.frustumCulled = false;
  scene.add(warp);

  // The flight: from outside the galaxy, down through its disc, into the system.
  const back = camEnd.clone().sub(lookEnd).normalize();
  const S = camEnd.clone().addScaledVector(toGC, -210).addScaledVector(nGal, 225);
  const path = new THREE.CatmullRomCurve3([
    S,
    camEnd.clone().addScaledVector(toGC, -120).addScaledVector(nGal, 92),
    camEnd.clone().addScaledVector(back, 42).addScaledVector(nGal, 12),
    camEnd.clone().addScaledVector(back, 10).addScaledVector(nGal, 1.2),
    camEnd.clone(),
  ], false, 'centripetal');
  const pathLen = path.getLength();
  const wC = [new THREE.Color('#CFE0FF'), new THREE.Color('#FFD3E2'), new THREE.Color('#9EE8FF')];
  const warpStars = [...Array(WN)].map((_, k) => {
    const p = path.getPointAt(0.08 + rW() * 0.84);
    const off = new THREE.Vector3(gauss(rW), gauss(rW), gauss(rW)).normalize().multiplyScalar(4 + rW() * 30);
    const c = wC[k % 3];
    wCol.set([c.r, c.g, c.b, 0, 0, 0], k * 6);
    return p.add(off);
  });

  /* ---------- page wiring ---------- */
  let focus = Number.isInteger(window.__heroRole) ? window.__heroRole : -1;
  window.addEventListener('hero-role', (e) => { focus = Number.isInteger(e.detail) ? e.detail : -1; });
  let spinTarget = 0;
  window.addEventListener('hero-spin', (e) => { spinTarget = clamp(Number(e.detail) || 0); });
  let labelsOn = !!window.__heroLanded;
  window.addEventListener('hero-landed', () => { labelsOn = true; });
  const skip = window.__heroSkip || window.__heroRevealed ? FLIGHT + 2.5 : 0;
  let started = false;
  let arrived = false;
  const say = (name) => window.dispatchEvent(new CustomEvent(name, { detail: { flight: FLIGHT } }));

  let tg = null;
  let tags = [];
  // Where the headline's words actually are (so labels never sit on them).
  let textBoxes = [];
  const range = document.createRange();
  const measure = () => {
    if (!tg) return;
    const sr = tg.el.getBoundingClientRect();
    // Text by its glyphs; the reel and the buttons by their boxes.
    textBoxes = [...document.querySelectorAll('.hero__role, .hero__name .line, .iam__lead, .hero__facts, .reel, .hero__cta > *')].map((el) => {
      let r = el.getBoundingClientRect();
      if (el.matches('.line') && el.firstElementChild) {
        const a = el.firstElementChild.getBoundingClientRect();
        const z = el.lastElementChild.getBoundingClientRect();
        r = { left: a.left, top: Math.min(a.top, z.top), right: z.right, bottom: Math.max(a.bottom, z.bottom) };
      } else if (!el.matches('.reel, .hero__cta > *')) {
        range.selectNodeContents(el);
        r = range.getBoundingClientRect();
      }
      return { l: r.left - sr.left - 10, t: r.top - sr.top - 8, r: r.right - sr.left + 10, b: r.bottom - sr.top + 8 };
    }).filter((b) => b.r > b.l);
  };
  let measuredAt = 0;
  window.addEventListener('resize', () => {
    measure();
    tags.forEach((el) => { el.__w = 0; el.__h = 0; });
  });

  /* ---------- per-frame scratch ---------- */
  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const lookShift = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const P = new THREE.Vector3();
  const W = new THREE.Vector3();
  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const Cc = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const Wn = new THREE.Vector3();
  const side = new THREE.Vector3();
  const ex = new THREE.Vector3();
  const ey = new THREE.Vector3();
  const ez = new THREE.Vector3();
  const retPos = new THREE.Vector3();
  const retCol = new THREE.Color();
  let retSize = 1;
  let retOn = 0;
  let boost = 0;
  let px0 = 0;
  let py0 = 0;
  const bez = (out, a, c, b, u) => out.copy(a).multiplyScalar((1 - u) * (1 - u)).addScaledVector(c, 2 * (1 - u) * u).addScaledVector(b, u * u);

  return {
    scene,
    camera,
    posterT: 9,
    attach(t) {
      tg = t;
      tags = [...document.querySelectorAll('[data-orbit]')];
      measure();
      if (document.fonts?.ready) document.fonts.ready.then(measure);
    },
    update(s) {
      const t = s.t + skip;
      const dt = s.dt;
      shared.uTime.value = s.time;
      uTime.value = s.reduced ? 3.2 : s.time;
      if (!started) {
        started = true;
        window.__heroIntro = performance.now();
        say('hero-intro');
      }
      if (!arrived && (t >= ARRIVE || s.reduced)) {
        arrived = true;
        window.__heroArrived = true;
        say('hero-arrive');
      }

      // Framing: the system sits right of center on wide screens (the
      // headline is on the left), and in the top half on tall ones.
      const aspect = s.aspect || 1;
      const tall = aspect < 0.95;
      const f = clamp((t - 0.3) / (FLIGHT - 0.3));
      const e = f < 1 ? easeInOut(Math.pow(f, 0.9)) : 1;
      const fx = lerp(0.5, tall ? 0.5 : aspect > 1.45 ? 0.64 : 0.6, easeInOut(clamp((f - 0.45) / 0.55)));
      const fy = lerp(0.5, tall ? 0.33 : 0.5, easeInOut(clamp((f - 0.45) / 0.55)));
      camera.aspect = aspect;
      const fw = aspect * 1000;
      camera.setViewOffset(fw, 1000, -(fx - 0.5) * fw, (0.5 - fy) * 1000, fw, 1000);
      // Tall stages back the camera off so the inner orbits fit the width.
      const fit = tall ? Math.pow(0.95 / aspect, 0.88) : aspect < 1.3 ? Math.pow(1.3 / aspect, 0.6) : 1;

      // Camera: the dive, then a slow drift that follows the pointer.
      path.getPointAt(e, camPos);
      const k = easeInOut(clamp((f - 0.12) / 0.7));
      look.copy(GC).lerp(lookEnd, k);
      if (f >= 1) {
        px0 = damp(px0, s.gx * 1.3, 2, dt);
        py0 = damp(py0, s.gy * 0.8, 2, dt);
        const sp = clamp((s.progress - 0.5) / 0.5);
        camPos.copy(camEnd).addScaledVector(rEnd, px0).addScaledVector(uEnd, -py0 + sp * 3.5);
      }
      camPos.sub(lookEnd).multiplyScalar(lerp(1, fit, e)).add(lookEnd);
      const fp = focus >= 0 && labelsOn ? planets[focus % planets.length] : null;
      tmp.set(0, 0, 0);
      if (fp && f >= 1) fp.body.getWorldPosition(tmp).multiplyScalar(0.1);
      lookShift.lerp(tmp, 1 - Math.exp(-2 * dt));
      camera.position.copy(camPos);
      camera.up.set(0, 1, 0);
      camera.lookAt(look.add(lookShift));
      if (f < 1) camera.rotateZ((1 - k) * 0.28);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      camera.matrixWorld.extractBasis(ex, ey, ez);
      sky.position.copy(camera.position);
      milky.position.copy(camera.position);
      const inside = easeInOut(clamp((f - 0.7) / 0.3));
      milky.children.forEach((m) => {
        if (m.isPoints) m.material.uniforms.uOpacity.value = inside;
        else {
          m.material.opacity = m.userData.o * inside;
          // Keep the glow's long axis on the band as seen from here.
          A.copy(m.position).add(camera.position).project(camera);
          B.copy(m.position).applyAxisAngle(nGal, 0.05).add(camera.position).project(camera);
          m.material.rotation = Math.atan2(B.y - A.y, (B.x - A.x) * aspect);
        }
      });

      // Warp streaks, stretched along the camera's motion while it's fast.
      path.getTangentAt(Math.min(0.999, e), tan);
      const de = f < 1 ? (easeInOut(Math.pow(Math.min(1, f + 0.01), 0.9)) - e) / (0.01 * (FLIGHT - 0.3)) : 0;
      const speed = de * pathLen;
      const str = clamp(speed / 140) * (1 - clamp((f - 0.82) / 0.18));
      warp.material.opacity = s.reduced ? 0 : str;
      if (str > 0.01) {
        const len = Math.min(26, speed * 0.07);
        warpStars.forEach((p, q) => {
          wPos[q * 6] = p.x;
          wPos[q * 6 + 1] = p.y;
          wPos[q * 6 + 2] = p.z;
          wPos[q * 6 + 3] = p.x - tan.x * len;
          wPos[q * 6 + 4] = p.y - tan.y * len;
          wPos[q * 6 + 5] = p.z - tan.z * len;
        });
        wGeo.attributes.position.needsUpdate = true;
      }

      // The far universe fades in, drifts and twinkles.
      const fade = easeOut(seg(t, 0, 0.9));
      sky.material.uniforms.uOpacity.value = fade;
      // Once we're inside it, the galaxy's own stars step back for the band.
      gal.points.material.uniforms.uOpacity.value = fade * (1 - 0.72 * inside);
      gal.disc.material.opacity = 0.55 * fade * (1 - 0.6 * k) * (1 - inside);
      gal.bulge.material.opacity = 0.55 * fade;
      gal.group.rotateOnAxis(new THREE.Vector3(0, 1, 0), dt * 0.012);
      nebula.children.forEach((n, q) => { n.material.rotation += dt * 0.004 * (q % 2 ? 1 : -1); });

      // The star: a beacon, then ignition (flash, rays, shockwave).
      sys.rotation.x = 0.24 + clamp((s.progress - 0.5) / 0.5) * 0.3;
      sys.updateMatrixWorld(true);
      const ig = seg(t, IGNITE, 0.75);
      core.scale.setScalar(Math.max(0.0001, easeOutBack(ig, 1.7)));
      beacon.material.uniforms.uOpacity.value = s.reduced ? 0 : (1 - ig) * fade;
      beacon.geometry.attributes.aSize.array[0] = 10 + 10 * Math.sin(s.time * 5) ** 2 + easeOut(seg(t, 1.6, 0.9)) * 26;
      beacon.geometry.attributes.aSize.needsUpdate = true;
      const glowK = easeOut(ig);
      halo1.material.opacity = 0.75 * glowK;
      halo2.material.opacity = 0.3 * glowK;
      halo3.material.opacity = 0.09 * glowK;
      rays.material.opacity = 0.38 * glowK;
      rays.material.rotation = s.time * 0.03;
      streak.material.opacity = 0.32 * glowK;
      halo1.scale.setScalar(3.6 * (1 + Math.sin(s.time * 1.3) * 0.035));
      const fl = seg(t, IGNITE + 0.1, 0.9);
      flash.material.opacity = s.reduced ? 0 : Math.sin(Math.PI * Math.min(1, fl * 1.8)) * (1 - fl) * 0.95;
      flash.scale.setScalar(15 * (0.5 + fl));
      const sk = seg(t, IGNITE + 0.15, 1.7);
      shock.scale.setScalar(0.5 + easeOut(sk) * 13);
      shockMat.opacity = s.reduced || sk <= 0 ? 0 : (1 - sk) * (1 - sk) * 0.75;
      sun.intensity = 70 * glowK;

      // Planets swing in from beyond the screen's edges, then orbit. While
      // the headline's reel spins, they spin too.
      boost = damp(boost, spinTarget, 5, dt);
      planets.forEach((p, i) => {
        const on = fp === p;
        p.focus = damp(p.focus, on ? 1 : 0, 4, dt);
        p.a += p.speed * dt * (1 + boost * 7 * p.arrive) * (1 - p.focus * 0.7);
        P.set(Math.cos(p.a) * p.R, 0, Math.sin(p.a) * p.R);
        const u0 = s.reduced ? 1 : seg(t, IGNITE + 0.05 + i * 0.13, 1.55);
        p.arrive = u0;
        const u = easeOut(u0);
        p.body.visible = u0 > 0;
        if (u0 < 1) {
          // From a point beside the camera, on an arc, into the orbit.
          B.copy(P).applyMatrix4(p.pivot.matrixWorld);
          A.copy(camera.position).addScaledVector(ex, p.from.x).addScaledVector(ey, p.from.y).addScaledVector(ez, p.from.z);
          Cc.copy(A).lerp(B, 0.42).addScaledVector(ey, 2.2).addScaledVector(ez, -3);
          bez(W, A, Cc, B, u);
          p.body.position.copy(p.pivot.worldToLocal(W));
          // The ribbon follows the same arc.
          const tp = p.trail.pos;
          for (let q = 0; q < p.trail.n; q++) {
            const uq = Math.max(0, u - q * 0.0062);
            bez(tmp, A, Cc, B, uq);
            bez(Wn, A, Cc, B, Math.max(0, uq - 0.004));
            Wn.subVectors(tmp, Wn);
            side.subVectors(camera.position, tmp).cross(Wn).normalize()
              .multiplyScalar(p.size * 0.95 * Math.pow(1 - q / p.trail.n, 0.6));
            tp[q * 6] = tmp.x - side.x;
            tp[q * 6 + 1] = tmp.y - side.y;
            tp[q * 6 + 2] = tmp.z - side.z;
            tp[q * 6 + 3] = tmp.x + side.x;
            tp[q * 6 + 4] = tmp.y + side.y;
            tp[q * 6 + 5] = tmp.z + side.z;
          }
          p.trail.mesh.geometry.attributes.position.needsUpdate = true;
        } else {
          p.body.position.copy(P);
        }
        p.trail.mat.uniforms.uOpacity.value = s.reduced ? 0 : (u0 > 0 ? 1 - seg(u0, 0.7, 0.3) : 0);
        p.spinner.scale.setScalar(1 + p.focus * 0.3);
        p.ball.rotation.y += dt * (0.22 + i * 0.03);
        p.atmo.material.uniforms.uK.value = 1.0 + p.focus * 0.9;
        p.glow.material.opacity = 0.14 + p.focus * 0.3;
        p.orbit.material.uniforms.uA.value = p.a;
        p.orbit.material.uniforms.uOpacity.value = easeOut(seg(t, IGNITE + 0.5 + i * 0.1, 1.2)) * (0.75 + p.focus * 0.8) * (fp && !on ? 0.65 : 1);
      });

      // Chapter details.
      snow.group.rotation.z += dt * 0.8;
      snow.group.position.set(Math.cos(s.time * 0.9) * 0.82, 0.14, Math.sin(s.time * 0.9) * 0.82);
      for (let q = 0; q < cardsN; q++) {
        const a = (q / cardsN) * TAU + s.time * 0.5;
        setInst(cards, q, Math.cos(a) * 0.86, Math.sin(a * 2) * 0.04, Math.sin(a) * 0.86, 0, -a + Math.PI / 2, 0.12, 1);
      }
      cards.instanceMatrix.needsUpdate = true;
      hearts.forEach((h, q) => {
        const ph = (s.time * 0.22 + h.userData.ph) % 1;
        h.position.set(Math.cos(q * 2.4) * (0.5 + ph * 0.55), 0.25 + ph * 1.15, Math.sin(q * 2.4) * (0.5 + ph * 0.55));
        h.material.opacity = Math.sin(Math.PI * ph);
        h.scale.setScalar(0.7 + ph * 0.6);
        h.quaternion.copy(camera.quaternion);
      });
      for (let q = 0; q < evN; q++) {
        const a = (q / evN) * TAU + s.time * (q % 2 ? 0.55 : 0.4);
        const rr = 1.12 + (q % 5) * 0.08;
        evPos[q * 3] = Math.cos(a) * rr;
        evPos[q * 3 + 1] = Math.sin(a * 3 + q) * 0.02;
        evPos[q * 3 + 2] = Math.sin(a) * rr;
      }
      events.geometry.attributes.position.needsUpdate = true;
      lam.position.set(Math.cos(-s.time * 0.5 + 1) * 1.95, 0.35, Math.sin(-s.time * 0.5 + 1) * 1.95);
      lam.rotation.set(s.time * 0.4, s.time * 0.6, 0.2);
      cap.group.position.set(Math.cos(s.time * 0.7) * 0.9, 0.28, Math.sin(s.time * 0.7) * 0.9);
      cap.group.rotation.y = -s.time * 0.7;
      bell.position.set(Math.cos(-s.time * 0.8) * 0.86, 0.2, Math.sin(-s.time * 0.8) * 0.86);
      bell.rotation.set(s.time * 0.6, s.time * 0.4, 0.4);

      // The asteroid belt grows in with the shockwave.
      const belt = easeOut(seg(t, IGNITE + 0.3, 1.4));
      rockData.forEach((r0, q) => {
        const a = r0.a + s.time * 0.045 * r0.w * (1 + boost * 3);
        setInst(rocks, q, Math.cos(a) * r0.r, r0.y, Math.sin(a) * r0.r, r0.spin + s.time * 0.3, r0.spin, 0, Math.max(0.0001, r0.s * belt));
      });
      rocks.instanceMatrix.needsUpdate = true;

      // Focus ring.
      retOn = damp(retOn, fp ? 1 : 0, 4, dt);
      if (fp) {
        fp.body.getWorldPosition(tmp);
        if (retOn < 0.05) retPos.copy(tmp);
        retPos.lerp(tmp, 1 - Math.exp(-7 * dt));
        retSize = damp(retSize, fp.size * 3.3, 6, dt);
        retCol.lerp(new THREE.Color(fp.dot), 1 - Math.exp(-6 * dt));
      }
      reticle.position.copy(retPos);
      reticle.quaternion.copy(camera.quaternion);
      reticle.rotateZ(s.time * 0.4);
      reticle.scale.setScalar(retSize * (1 + (1 - retOn) * 0.4));
      reticle.material.color.copy(retCol);
      reticle.material.opacity = retOn * 0.85;

      // Comet: a long pass every 16 seconds.
      const ct = ((s.time + 5) % 16) / 16;
      const showComet = t > FLIGHT + 2 && !s.reduced && ct < 0.6;
      comet.visible = showComet;
      cometTail.pts.visible = showComet;
      if (showComet) {
        const cp = (c) => {
          const a = lerp(-0.9, 1.9, c / 0.6);
          return tmp.set(Math.cos(a) * 14, 4.2 - (c / 0.6) * 6.5, Math.sin(a) * 6 - 4);
        };
        comet.position.copy(cp(ct));
        comet.lookAt(cp(ct + 0.004));
        for (let q = 0; q < cometTail.n; q++) {
          cp(Math.max(0, ct - q * 0.0026));
          cometTail.pos.set([tmp.x, tmp.y, tmp.z], q * 3);
        }
        cometTail.pts.geometry.attributes.position.needsUpdate = true;
        cometTail.mat.uniforms.uOpacity.value = Math.sin(Math.PI * (ct / 0.6)) * 0.9;
      }

      // A shooting star every few seconds.
      if (!s.reduced && t > FLIGHT + 1) {
        if (s.time > shootAt + 1.2) {
          shootAt = s.time + 3 + rS() * 5;
          const az = (rS() - 0.5) * 1.6;
          const el = 0.15 + rS() * 0.4;
          shootA.copy(dEnd).addScaledVector(rEnd, az).addScaledVector(uEnd, el).normalize().multiplyScalar(600);
          shootB.copy(shootA).addScaledVector(rEnd, (rS() < 0.5 ? -1 : 1) * 110).addScaledVector(uEnd, -60);
        }
        const st = clamp((s.time - shootAt) / 0.7);
        const on = s.time >= shootAt && st < 1;
        shooting.material.opacity = on ? Math.sin(Math.PI * st) : 0;
        if (on) {
          W.copy(shootA).lerp(shootB, st).add(camera.position);
          tmp.copy(shootA).lerp(shootB, Math.max(0, st - 0.22)).add(camera.position);
          shootPos.set([W.x, W.y, W.z, tmp.x, tmp.y, tmp.z]);
          shootGeo.attributes.position.needsUpdate = true;
        }
      }

      // HTML labels ride along with their planets. The open one goes first;
      // any other label that would overlap one already placed stays hidden.
      if (tg && tags.length && tg.w) {
        // The headline's width changes with the reel's word; re-measure now and then.
        if (s.time - measuredAt > 0.5) {
          measuredAt = s.time;
          measure();
        }
        const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const order = planets.map((p, i) => {
          p.body.getWorldPosition(W);
          const dist = W.distanceTo(camera.position);
          W.project(camera);
          return { p, i, dist, x: (W.x * 0.5 + 0.5) * tg.w, y: (-W.y * 0.5 + 0.5) * tg.h, z: W.z };
        }).sort((a, b) => (b.p === fp) - (a.p === fp) || a.dist - b.dist);
        const placed = [];
        order.forEach(({ p, i, dist, x, y, z }) => {
          const el = tags[i];
          if (!el) return;
          const r = ((p.size * (1 + p.focus * 0.3)) / (dist * half)) * (tg.h / 2);
          let o = labelsOn && z < 1 && p.arrive >= 1 ? 1 : 0;
          if (o && (x < 0 || x > tg.w || y < 0 || y > tg.h)) o = 0;
          if (o) {
            el.__w = el.__w || el.firstElementChild?.offsetWidth || 150;
            el.__h = el.__h || el.firstElementChild?.offsetHeight || 40;
            const box = { l: x + r * 0.77 + 12, b: y - r * 0.64 - 10 };
            box.r = box.l + el.__w;
            box.t = box.b - el.__h;
            const hit = (q) => box.l < q.r && box.r > q.l && box.t < q.b && box.b > q.t;
            const off = box.r > tg.w - 8 || box.t < 64 || box.b > tg.h - 8;
            if (off || placed.some(hit) || textBoxes.some(hit)) o = 0;
            else placed.push(box);
          }
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
          el.style.setProperty('--r', `${r.toFixed(1)}px`);
          if (el.__o !== o) {
            el.__o = o;
            el.classList.toggle('is-shown', o === 1);
          }
        });
      }
    },
  };
}
