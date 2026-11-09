/* About: the character-select pedestal the trading card stands on. A dark
   glossy platform with a lit rim and slowly turning HUD rings, a soft column
   of light, motes drifting up, and the card's five energy types orbiting it
   as glowing orbs. The card itself is HTML, laid over the middle. */
import {
  THREE, M, stage, rig, damp, easeOut, easeOutBack, seg, shadow, dotTex, sprite, canvasTex, rng,
} from '../kit.js';

const CYAN = '#59E3FF';
// The card's energy types: build, grow, code, lift, shield.
const ENERGY = ['#D9DCE4', '#FF8460', '#6C84FF', '#7EDCBC', '#9A9AA6'];

export function profile(env) {
  const { scene, camera } = stage(env, { fov: 30, env: 0.9, key: 1.2, hemi: 0.5 });
  const cam = rig(camera, { pos: [0, 2.9, 11.4], look: [0, 2.15, 0], px: 0.3, py: 0.18, fit: 0.7 });
  const root = new THREE.Group();
  scene.add(root);

  // Platform and its lit edge.
  const plat = new THREE.Mesh(
    new THREE.CylinderGeometry(2.25, 2.4, 0.28, 120),
    M.gloss('#141B3A', { roughness: 0.22, clearcoatRoughness: 0.08, envMapIntensity: 1.2 }),
  );
  plat.position.y = -0.14;
  root.add(plat);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.27, 0.022, 8, 240), M.glow(CYAN, { opacity: 0.95 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.005;
  root.add(rim);

  // HUD rings on the platform face: one solid, one dashed, turning opposite ways.
  const hud = new THREE.Group();
  hud.position.y = 0.012;
  root.add(hud);
  const ring1 = new THREE.Mesh(new THREE.RingGeometry(1.62, 1.645, 160), M.glow(CYAN, { opacity: 0.45, side: THREE.DoubleSide }));
  ring1.rotation.x = -Math.PI / 2;
  hud.add(ring1);
  const dashTex = canvasTex(1024, 32, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 18, h);
  }, { srgb: false });
  dashTex.wrapS = THREE.RepeatWrapping;
  dashTex.repeat.set(3, 1);
  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(1.92, 1.99, 160, 1),
    new THREE.MeshBasicMaterial({ color: CYAN, alphaMap: dashTex, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
  );
  ring2.rotation.x = -Math.PI / 2;
  // Make the dash texture run around the ring rather than across it.
  const uv = ring2.geometry.attributes.uv;
  const pos = ring2.geometry.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r = Math.hypot(x, y);
    uv.setXY(i, (Math.atan2(y, x) / (Math.PI * 2) + 0.5) * 8, (r - 1.92) / 0.07);
  }
  hud.add(ring2);
  const ring3 = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.07, 120), M.glow(CYAN, { opacity: 0.3, side: THREE.DoubleSide }));
  ring3.rotation.x = -Math.PI / 2;
  hud.add(ring3);

  // A soft column of light rising out of the platform.
  // alphaMap reads brightness, so the fade is drawn white-to-black.
  const beamTex = canvasTex(8, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, h, 0, 0);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.3, '#5a5a5a');
    grd.addColorStop(1, '#000000');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  }, { srgb: false });
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 2.2, 5.2, 72, 1, true),
    new THREE.MeshBasicMaterial({
      color: CYAN, alphaMap: beamTex, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    }),
  );
  beam.position.y = 2.6;
  root.add(beam);

  // The five energies, as glowing pearls on tilted orbits around the card.
  const orbs = ENERGY.map((hex, i) => {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 40, 28), M.pearl(hex, { roughness: 0.12, iridescence: 0.6 }));
    const halo = sprite(dotTex(), 1.0, 1.0, { color: hex, opacity: 0.75, blending: THREE.AdditiveBlending });
    g.add(halo, ball);
    root.add(g);
    return { g, a0: (i / ENERGY.length) * Math.PI * 2, y: 1.2 + (i % 3) * 0.75, r: 2.25 + (i % 2) * 0.35, tilt: 0.18 + i * 0.05 };
  });

  // Motes drifting upward through the light.
  const N = 70;
  const r = rng(11);
  const motes = new Float32Array(N * 3);
  const speeds = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2;
    const rr = 0.4 + r() * 1.9;
    motes[i * 3] = Math.cos(a) * rr;
    motes[i * 3 + 1] = r() * 5;
    motes[i * 3 + 2] = Math.sin(a) * rr;
    speeds[i] = 0.18 + r() * 0.4;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motes, 3));
  const moteMat = new THREE.PointsMaterial({
    size: 0.07, map: dotTex(), color: '#BFF4FF', transparent: true, opacity: 0.8, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
  root.add(new THREE.Points(moteGeo, moteMat));

  const floor = shadow(7, 2.4, 0.5, '#000000');
  floor.position.y = -0.3;
  scene.add(floor);

  let spin = 0;
  return {
    scene,
    camera,
    posterT: 6,
    update(s) {
      cam(s);
      const { t, dt } = s;
      const k = easeOut(seg(t, 0, 1.2));
      const ki = easeOutBack(seg(t, 0.1, 1.0), 1.3);
      plat.scale.set(ki, 1, ki);
      rim.scale.setScalar(Math.max(0.0001, ki));
      hud.scale.setScalar(Math.max(0.0001, ki));
      beam.scale.set(1, Math.max(0.0001, k), 1);
      beam.position.y = 2.6 * k;
      spin = damp(spin, s.hover ? 1.8 : 1, 2, dt);
      ring2.rotation.z += dt * 0.12 * spin;
      ring3.rotation.z -= dt * 0.2 * spin;
      beam.material.opacity = 0.09 + Math.sin(s.time * 1.2) * 0.02;
      orbs.forEach((o, i) => {
        const a = o.a0 + s.time * 0.32 * spin;
        const show = easeOutBack(seg(t, 0.5 + i * 0.12, 0.7));
        o.g.position.set(Math.cos(a) * o.r, o.y + Math.sin(a * 2 + i) * 0.18 + Math.sin(a) * o.tilt, Math.sin(a) * o.r * 0.55);
        o.g.scale.setScalar(Math.max(0.0001, show));
      });
      if (!s.reduced) {
        for (let i = 0; i < N; i++) {
          let y = motes[i * 3 + 1] + speeds[i] * dt;
          if (y > 5) y -= 5;
          motes[i * 3 + 1] = y;
        }
        moteGeo.attributes.position.needsUpdate = true;
      }
      root.rotation.y = s.px * 0.12;
    },
  };
}
