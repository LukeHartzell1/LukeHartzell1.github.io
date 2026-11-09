/* Hero: a liquid-pearl core with tiny versions of everything below it in orbit
   (the snowflake, the phone with my face, the dumbbell, a record, the grad cap,
   a paper plane). Scrolling away spreads the system apart. */
import {
  THREE, C, M, stage, damp, clamp, easeOut, easeOutBack, seg, sparkles, shadow, enhance,
} from '../kit.js';
import { crystal, phone, dumbbell, vinyl, gradCap, paperPlane } from './builders.js';



export function hero(env) {
  const base = [0, 0.25, 13.5];
  const { scene, camera } = stage(env, { fov: 27, pos: base, look: [0, -0.05, 0] });
  const root = new THREE.Group();
  scene.add(root);

  const uTime = { value: 0 };
  const coreMat = enhance(M.pearl('#E7DFFF', {
    roughness: 0.06, iridescenceIOR: 1.8, iridescenceThicknessRange: [100, 820], metalness: 0.18,
  }), { uTime, liquid: [0.045, 0.75], holo: 0.85 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.15, 160, 120), coreMat);
  root.add(core);

  const rings = [
    { R: 2.5, rot: new THREE.Euler(1.2, 0.0, -0.34), speed: 0.17 },
    { R: 3.3, rot: new THREE.Euler(1.34, 0.0, 0.46), speed: -0.115 },
  ];
  const orbitMat = M.chrome('#d6ccff', { transparent: true, opacity: 0.5 });
  for (const r of rings) {
    const torus = new THREE.Mesh(new THREE.TorusGeometry(r.R, 0.008, 8, 300), orbitMat);
    torus.rotation.copy(r.rot);
    root.add(torus);
    r.mesh = torus;
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
  const vin = vinyl({ r: 0.42, t: 0.03 });
  const minis = [
    { g: holder(crystal({ arm: 0.6, thick: 0.032 }).group, 1), ring: 0, a0: 0.4, spin: [0, 0, 0.5] },
    { g: holder(phone().group, 0.3, [0, -0.35, 0.08]), ring: 0, a0: 2.5, spin: [0, 0.45, 0] },
    { g: holder(dumbbell(), 0.36, [0.4, 0.2, 0.6]), ring: 0, a0: 4.55, spin: [0.35, 0.5, 0] },
    { g: holder(vin, 1, [1.1, 0, 0.2]), ring: 1, a0: 1.0, spin: [0, 0, 0], spinSelf: true },
    { g: holder(gradCap().group, 0.5, [0.25, 0.3, 0]), ring: 1, a0: 3.15, spin: [0, 0.6, 0] },
    { g: holder(paperPlane(), 0.42, [0.25, 0.9, 0.2]), ring: 1, a0: 5.25, spin: [0, 0, 0] },
  ];

  const dust = sparkles(80, 4.6, { color: C.violet, size: 0.055, opacity: 0.5, seed: 3 });
  root.add(dust);
  const floor = shadow(6.5, 2.6, 0.13);
  floor.position.y = -2.75;
  scene.add(floor);

  const P = new THREE.Vector3();
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

      minis.forEach((m, i) => {
        const r = rings[m.ring];
        const k = easeOut(seg(t, 0.25 + i * 0.09, 1.25));
        m.a = (m.a ?? m.a0) + r.speed * speed * dt;
        const R = r.R * spread * (1 + (1 - k) * 1.6);
        P.set(Math.cos(m.a) * R, Math.sin(m.a) * R, 0).applyEuler(r.rot);
        m.g.position.copy(P);
        m.g.scale.setScalar(m.g.userData.s * Math.max(0.0001, k));
        const o = m.g.children[0];
        o.rotation.x += m.spin[0] * dt;
        o.rotation.y += m.spin[1] * dt;
        o.rotation.z += m.spin[2] * dt;
        if (m.spinSelf) o.rotateY(dt * 1.6);
      });
      for (const r of rings) r.mesh.scale.setScalar(spread);
      dust.rotation.y = s.time * 0.03;
    },
  };
}
