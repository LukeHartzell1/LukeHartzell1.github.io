/* Shared toolkit for every 3D piece: palette, easing, materials, geometry
   helpers, text labels and soft shadows. Scenes stay small because the
   boring parts live here. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export { THREE };

export const C = {
  lilac: '#B9A5FF',
  lilac2: '#D9CCFF',
  violet: '#7254F0',
  deep: '#2B2160',
  pink: '#F7B6D8',
  rose: '#FF7EA5',
  sky: '#A6C8FF',
  mint: '#8FE2C6',
  peach: '#FFC6AC',
  butter: '#FFE8A6',
  cream: '#FFFDF9',
  white: '#FFFFFF',
  ink: '#1A1530',
  mist: '#ECE7FB',
  steel: '#C9C2E3',
};

/* ---------- math & easing ---------- */
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const seg = (t, start, dur) => clamp((t - start) / dur);
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t) => t * t * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t, s = 1.6) => (t <= 0 ? 0 : 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2));
export const bounce = (t) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
/* A repeating 0..1 phase with a hold, handy for looping vignettes. */
export const loop = (t, period) => ((t % period) + period) % period / period;
/* Deterministic pseudo-random so scenes look the same every visit. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* ---------- materials ---------- */
const white = new THREE.Color('#ffffff');
export const M = {
  ceramic: (color, o = {}) => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.4, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.18,
    sheen: 0.4, sheenRoughness: 0.5, sheenColor: white, ...o,
  }),
  gloss: (color, o = {}) => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, ...o,
  }),
  pearl: (color = '#ffffff', o = {}) => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.18, metalness: 0.06, iridescence: 1, iridescenceIOR: 1.5,
    iridescenceThicknessRange: [140, 560], clearcoat: 1, clearcoatRoughness: 0.06, ...o,
  }),
  chrome: (color = '#EFEBFF', o = {}) => new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.14, ...o }),
  satin: (color = '#EFEBFF', o = {}) => new THREE.MeshStandardMaterial({ color, metalness: 0.65, roughness: 0.32, ...o }),
  glass: (color = '#ffffff', o = {}) => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02,
    transparent: true, opacity: 0.2, depthWrite: false, iridescence: 0.5, envMapIntensity: 1.8, ...o,
  }),
  paper: (color = '#ffffff', o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, side: THREE.DoubleSide, ...o }),
  flat: (color, o = {}) => new THREE.MeshBasicMaterial({ color, toneMapped: false, ...o }),
  glow: (color, o = {}) => new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, ...o,
  }),
};

/* ---------- scene scaffold ---------- */
export function stage(envMap, { fov = 30, pos = [0, 0, 10], look = [0, 0, 0], env = 1, key = 1.5, hemi = 0.85 } = {}) {
  const scene = new THREE.Scene();
  scene.environment = envMap;
  scene.environmentIntensity = env;
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  camera.position.set(...pos);
  camera.lookAt(...look);
  camera.userData.look = new THREE.Vector3(...look);
  const h = new THREE.HemisphereLight('#ffffff', '#d8ccff', hemi);
  const k = new THREE.DirectionalLight('#ffffff', key);
  k.position.set(4, 7, 6);
  const r = new THREE.DirectionalLight('#c9b6ff', 0.9);
  r.position.set(-6, 3, -5);
  scene.add(h, k, r);
  return { scene, camera, lights: { hemi: h, key: k, rim: r } };
}

/* Gentle "look around" for any camera: orbit a little toward the pointer. */
export function parallax(camera, base, s, { x = 0.6, y = 0.35, lambda = 3 } = {}) {
  const ud = camera.userData;
  ud.px = damp(ud.px ?? 0, s.gx * x, lambda, s.dt);
  ud.py = damp(ud.py ?? 0, s.gy * y, lambda, s.dt);
  camera.position.set(base[0] + ud.px, base[1] - ud.py, base[2]);
  camera.lookAt(ud.look);
}

/* ---------- geometry helpers ---------- */
const boxes = new Map();
export function rbox(w, h, d, r, segments = 4) {
  const radius = Math.min(r ?? Math.min(w, h, d) * 0.22, Math.min(w, h, d) / 2 - 0.0005);
  const k = `${w}|${h}|${d}|${radius}|${segments}`;
  if (!boxes.has(k)) boxes.set(k, new RoundedBoxGeometry(w, h, d, segments, radius));
  return boxes.get(k);
}

export function heartShape(s = 1) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -0.9 * s);
  sh.bezierCurveTo(-0.2 * s, -0.7 * s, -1.05 * s, -0.2 * s, -1.05 * s, 0.3 * s);
  sh.bezierCurveTo(-1.05 * s, 0.85 * s, -0.4 * s, 1.05 * s, 0, 0.55 * s);
  sh.bezierCurveTo(0.4 * s, 1.05 * s, 1.05 * s, 0.85 * s, 1.05 * s, 0.3 * s);
  sh.bezierCurveTo(1.05 * s, -0.2 * s, 0.2 * s, -0.7 * s, 0, -0.9 * s);
  return sh;
}

export function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* ---------- textures ---------- */
export const FONT = '"Geist", "Inter", system-ui, sans-serif';
export const MONO = '"Geist Mono", ui-monospace, monospace';

export function canvasTex(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function textTex(lines, {
  w = 512, h = 160, size = 64, weight = 600, mono = false, color = C.ink, bg = null, radius = 0,
  align = 'center', pad = 28, lineHeight = 1.18, border = null,
} = {}) {
  const arr = Array.isArray(lines) ? lines : [lines];
  return canvasTex(w, h, (g) => {
    if (bg) {
      g.fillStyle = bg;
      roundRectPath(g, 0, 0, w, h, radius);
      g.fill();
    }
    if (border) {
      g.strokeStyle = border;
      g.lineWidth = 4;
      roundRectPath(g, 2, 2, w - 4, h - 4, Math.max(0, radius - 2));
      g.stroke();
    }
    g.fillStyle = color;
    g.font = `${weight} ${size}px ${mono ? MONO : FONT}`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    const x = align === 'center' ? w / 2 : align === 'left' ? pad : w - pad;
    const total = arr.length * size * lineHeight;
    arr.forEach((ln, i) => g.fillText(ln, x, h / 2 - total / 2 + size * lineHeight * (i + 0.5) + size * 0.04));
  });
}

/* A flat label that floats in 3D (always crisp, never tone-mapped). */
export function label(tex, w, h, o = {}) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false, ...o }),
  );
  return m;
}

export function sprite(tex, w, h, o = {}) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false, ...o }));
  s.scale.set(w, h, 1);
  return s;
}

let shadowAlpha = null;
export function shadow(w = 3, h = w, opacity = 0.32, color = '#5a46b8') {
  if (!shadowAlpha) {
    shadowAlpha = canvasTex(128, 128, (g) => {
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(0.45, '#7a7a7a');
      grd.addColorStop(1, '#000000');
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
    }, { srgb: false });
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color, alphaMap: shadowAlpha, transparent: true, opacity, depthWrite: false, toneMapped: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = -1;
  return m;
}

let dot = null;
export function dotTex() {
  if (!dot) {
    dot = canvasTex(64, 64, (g) => {
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.35, 'rgba(255,255,255,0.65)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
    });
  }
  return dot;
}

/* Soft twinkling dust around an object. */
export function sparkles(n = 60, radius = 3, { color = C.violet, size = 0.07, opacity = 0.7, seed = 7, flat = false } = {}) {
  const r = rng(seed);
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const b = Math.acos(2 * r() - 1);
    const rr = radius * (0.55 + 0.45 * r());
    pos[i * 3] = Math.sin(b) * Math.cos(a) * rr;
    pos[i * 3 + 1] = Math.cos(b) * rr * (flat ? 0.45 : 1);
    pos[i * 3 + 2] = Math.sin(b) * Math.sin(a) * rr;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size, map: dotTex(), color, transparent: true, opacity, depthWrite: false, sizeAttenuation: true, toneMapped: false,
  });
  return new THREE.Points(geo, mat);
}

/* Instanced helper: compose matrices without allocating. */
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _e = new THREE.Euler();
export function setInst(mesh, i, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _p.set(x, y, z);
  _q.setFromEuler(_e.set(rx, ry, rz));
  _s.set(sx, sy, sz);
  _m.compose(_p, _q, _s);
  mesh.setMatrixAt(i, _m);
}
export function setInstQ(mesh, i, pos, quat, sx = 1, sy = sx, sz = sx) {
  _s.set(sx, sy, sz);
  _m.compose(pos, quat, _s);
  mesh.setMatrixAt(i, _m);
}

/* Photo of me, loaded once and shared. */
let photo = null;
export function photoTex() {
  if (!photo) {
    photo = new THREE.TextureLoader().load(new URL('../images/opt/luke.webp', import.meta.url).href);
    photo.colorSpace = THREE.SRGBColorSpace;
    photo.anisotropy = 8;
  }
  return photo;
}

/* ---------- shader garnish ---------- */
export const SNOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 Cn=vec2(1.0/6.0,1.0/3.0);
  const vec4 Dn=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,Cn.yyy));
  vec3 x0=v-i+dot(i,Cn.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+Cn.xxx;
  vec3 x2=x0-i2+Cn.yyy;
  vec3 x3=x0-Dn.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*Dn.wyz-Dn.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 xx=x_*ns.x+ns.yyyy;
  vec4 yy=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(xx)-abs(yy);
  vec4 b0=vec4(xx.xy,yy.xy);
  vec4 b1=vec4(xx.zw,yy.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

/* Adds optional "liquid" vertex breathing and a holographic pastel thin-film
   sheen (fresnel-weighted) to any lit material. */
export function enhance(mat, { uTime = { value: 0 }, liquid = null, holo = 0 } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    if (liquid) {
      const [amp, freq] = liquid;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float uTime;\n${SNOISE}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float nz = snoise(position * ${freq.toFixed(3)} + vec3(0.0, uTime * 0.22, uTime * 0.17));
          transformed += objectNormal * nz * ${amp.toFixed(3)};`);
    }
    if (holo > 0) {
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform float uTime;`)
        .replace('#include <opaque_fragment>', `#include <opaque_fragment>
          {
            vec3 vdir = normalize(vViewPosition);
            float fr = pow(1.0 - clamp(dot(normal, vdir), 0.0, 1.0), 1.6);
            float h = normal.x * 0.35 + normal.y * 0.5 + fr * 0.6 + uTime * 0.04;
            vec3 c1 = vec3(0.55, 0.42, 1.0);
            vec3 c2 = vec3(1.0, 0.45, 0.72);
            vec3 c3 = vec3(0.40, 0.62, 1.0);
            float k1 = 0.5 + 0.5 * sin(6.28318 * h);
            float k2 = 0.5 + 0.5 * sin(6.28318 * (h + 0.37));
            vec3 pastel = mix(mix(c1, c2, k1), c3, k2 * 0.65);
            float w = clamp(fr * ${holo.toFixed(3)} * 1.25, 0.0, 0.92);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.5 + pastel * 0.85, w);
          }`);
    }
  };
  mat.customProgramCacheKey = () => `enh-${liquid ? liquid.join('-') : 'x'}-${holo}`;
  return mat;
}

/* Camera rig: keeps the subject framed at any aspect ratio (backs off on tall
   stages) and leans gently toward the pointer. */
export function rig(camera, { pos, look = [0, 0, 0], px = 0.45, py = 0.28, fit = 0.95 } = {}) {
  const L = new THREE.Vector3(...look);
  const dir = new THREE.Vector3(...pos).sub(L);
  const d0 = dir.length();
  dir.normalize();
  let ox = 0;
  let oy = 0;
  camera.position.copy(L).addScaledVector(dir, d0);
  camera.lookAt(L);
  return (s) => {
    const k = s.aspect < fit ? Math.pow(fit / s.aspect, 0.92) : 1;
    ox = damp(ox, (s.gx * 0.55 + s.px * 0.45) * px, 3, s.dt);
    oy = damp(oy, (s.gy * 0.55 + s.py * 0.45) * py, 3, s.dt);
    camera.position.copy(L).addScaledVector(dir, d0 * k);
    camera.position.x += ox * k;
    camera.position.y -= oy * k;
    camera.lookAt(L);
  };
}

/* Mono caption that floats in the scene (e.g. "on-call"). */
export function tag(text, { w = 512, h = 128, size = 44, color = C.violet, bg = 'rgba(255,255,255,0.92)', mono = true, weight = 500, scale = 1 } = {}) {
  const t = textTex(text, { w, h, size, color, bg, radius: h / 2, mono, weight, border: 'rgba(114,84,240,0.18)' });
  return sprite(t, (w / h) * 0.42 * scale, 0.42 * scale);
}
