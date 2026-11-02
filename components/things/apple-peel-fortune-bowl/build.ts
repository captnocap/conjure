import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, paint, paintHex, score } from '@conjure/kit';

type P2 = [number, number];

/** Each initial as one continuous stroke, as an unbroken peel would fall, in a unit box (x right, y up). */
const LETTERS: Record<string, P2[]> = {
  S: [[0.85, 0.85], [0.55, 1], [0.15, 0.85], [0.15, 0.6], [0.5, 0.5], [0.85, 0.38], [0.85, 0.12], [0.45, 0], [0.1, 0.15]],
  C: [[0.9, 0.82], [0.6, 1], [0.25, 0.92], [0.05, 0.6], [0.08, 0.3], [0.3, 0.05], [0.65, 0.02], [0.92, 0.2]],
  O: [[0.5, 1], [0.12, 0.85], [0.02, 0.5], [0.15, 0.12], [0.5, 0], [0.85, 0.15], [0.98, 0.5], [0.85, 0.85], [0.56, 0.98]],
  J: [[0.3, 1], [0.75, 1], [0.62, 0.95], [0.6, 0.6], [0.6, 0.25], [0.48, 0.04], [0.22, 0.04], [0.08, 0.25]],
  L: [[0.15, 1], [0.12, 0.7], [0.12, 0.35], [0.15, 0.08], [0.3, 0.02], [0.6, 0.03], [0.9, 0.05]],
  M: [[0.02, 0], [0.04, 0.5], [0.1, 1], [0.3, 0.6], [0.5, 0.35], [0.7, 0.6], [0.9, 1], [0.96, 0.5], [0.98, 0]],
  W: [[0.02, 1], [0.15, 0.4], [0.27, 0], [0.4, 0.4], [0.5, 0.75], [0.6, 0.4], [0.73, 0], [0.85, 0.4], [0.98, 1]],
  G: [[0.9, 0.85], [0.6, 1], [0.2, 0.9], [0.03, 0.5], [0.2, 0.08], [0.55, 0], [0.88, 0.15], [0.9, 0.45], [0.6, 0.45]],
};

export default defineThing({
  questions: {
    letter: choice('Which initial has the thrown peel curled into?', {
      S: 'An S, a swooping double curve.',
      C: 'A C, an open crescent.',
      O: 'An O, a ring that almost closes.',
      J: 'A J, a hook with a cap.',
      L: 'An L, a long stroke with a foot.',
      M: 'An M, a looping zigzag with two peaks.',
      W: 'A W, a zigzag with two valleys.',
      G: 'A G, a crescent that turns in on itself.',
    }),
    apples: paint('What colour are the apples?', ['red', 'crimson', 'green', 'lime', 'rust', 'yellow']),
    remaining: score('How many apples are left in the bowl?', ['None: the last one has just been peeled', 'Two or three', 'Half a bowlful', 'Heaped full']),
    surface: choice('Where is it laid out?', {
      table: 'On a scrubbed wooden table board.',
      hearth: 'On the flat slate hearthstone by the fire.',
      cloth: 'On an embroidered linen cloth.',
    }),
    candle: noul('Does a lit candle stand beside the bowl for the midnight fortune?'),
    nuts: noul('Are pairs of hazelnuts set out to roast, to see which lovers stay together and which burst apart?'),
    game: choice('Is an apple game set up nearby?', {
      none: 'No game: just the bowl and the peel.',
      bobbing: 'A wooden tub of water with apples bobbing in it, ready to be caught with the teeth.',
      snap: 'Snap-apple: a stick hung from a cord with an apple at one end and a candle at the other.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const skinHex = paintHex(a.apples);
    const skin = s.material(skinHex, { roughness: 0.38 });
    const skin2 = s.material(new THREE.Color(skinHex).lerp(new THREE.Color('#e8c040'), 0.25), { roughness: 0.4 });
    const flesh = s.material('#f2e6c4', { roughness: 0.6 });
    const wood = s.material('#8a5e36', { roughness: 0.7 });
    const stalkMat = s.material('#4a3420');
    const leafMat = s.material('#4a7a2a', { side: THREE.DoubleSide });
    const flameMat = s.material('#ffd070', { emissive: '#ffa030', emissiveIntensity: mix(1, 3, mood.energy * 0.5 + mood.daylight * 0.5) });
    const wax = s.material('#efe6cf', { roughness: 0.5 });

    // The surface it is laid out on.
    let top = 0;
    if (a.surface === 'table') {
      top = 0.05;
      for (let i = 0; i < 3; i++) s.box([0.95, 0.05, 0.198], [0, 0.025, -0.2 + i * 0.2], s.material(i % 2 ? '#b08a5c' : '#a8825a', { roughness: 0.8 }));
    } else if (a.surface === 'hearth') {
      top = 0.06;
      s.box([1.0, 0.06, 0.62], [0, 0.03, 0], s.material('#4a4c50', { roughness: 0.9 }));
      s.box([0.98, 0.002, 0.2], [0, 0.061, -0.2], s.material('#8a8580', { roughness: 1 }));
    } else {
      top = 0.004;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ece4d2'; ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#a0281e'; ctx.lineWidth = 3; ctx.strokeRect(8, 8, 112, 112);
      for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? '#a0281e' : '#2a4a2a'; ctx.beginPath(); ctx.arc(14 + i * 7.7, 16, 2.4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(14 + i * 7.7, 112, 2.4, 0, 7); ctx.fill(); }
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      s.mesh(new THREE.PlaneGeometry(0.95, 0.65), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), [0, 0.002, 0]).rotation.x = -Math.PI / 2;
    }

    const apple = (r: number, at: THREE.Vector3, mat: THREE.Material, tilt = 0) => {
      const g = new THREE.Group();
      const prof: P2[] = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14 * Math.PI;
        const rr = Math.sin(t) * (1 + 0.12 * Math.sin(t * 0.8 - 0.3));
        prof.push([Math.max(0.001, rr * r), -Math.cos(t) * r * 0.9 + (i === 0 ? r * 0.12 : i === 14 ? -r * 0.15 : 0)]);
      }
      const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 18), mat);
      body.castShadow = body.receiveShadow = true;
      g.add(body);
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, r * 0.6, 5), stalkMat);
      stalk.position.set(0.004, r * 0.85, 0); stalk.rotation.z = -0.25; g.add(stalk);
      if (random() < 0.35) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), leafMat);
        leaf.scale.set(r * 0.28, 0.002, r * 0.12); leaf.position.set(r * 0.2, r * 0.95, 0); leaf.rotation.y = random() * 3; g.add(leaf);
      }
      g.position.copy(at).add(new THREE.Vector3(0, r * 0.9, 0));
      g.rotation.set(tilt * (random() - 0.5), random() * 6, tilt * (random() - 0.5));
      s.root.add(g);
      return g;
    };

    // The wooden bowl and the apples left in it.
    const bx = -0.2, bz = -0.08;
    const bowlR = 0.17;
    s.lathe([[0.001, 0], [0.08, 0], [0.09, 0.012], [0.14, 0.04], [bowlR, 0.09], [bowlR + 0.012, 0.095], [bowlR - 0.01, 0.1], [0.12, 0.05], [0.001, 0.035]], s.material('#7a4e2a', { roughness: 0.6, side: THREE.DoubleSide }), [bx, top, bz]);
    const left = Math.round(mix(0, 9, a.remaining));
    const ar = 0.042;
    const spots: THREE.Vector3[] = [];
    for (let i = 0; i < Math.min(left, 5); i++) { const t = i / Math.min(left, 5) * Math.PI * 2 + random(); const d = left === 1 ? 0 : 0.075; spots.push(new THREE.Vector3(bx + Math.cos(t) * d, top + 0.04, bz + Math.sin(t) * d)); }
    for (let i = 5; i < left; i++) { const t = i * 2.1; spots.push(new THREE.Vector3(bx + Math.cos(t) * 0.04, top + 0.1, bz + Math.sin(t) * 0.04)); }
    spots.forEach((p, i) => apple(ar * mix(0.9, 1.1, random()), p, i % 3 === 2 ? skin2 : skin, 0.5));

    // The peeled apple, the knife, and the long peel curled into an initial.
    const px = 0.04, pz = 0.14;
    const peeled = apple(ar * 0.95, new THREE.Vector3(px - 0.04, top, pz - 0.12), flesh, 0.1);
    void peeled;
    const knife = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.002, 0.016), s.material('#c9ccd1', { metalness: 0.85, roughness: 0.25 }));
    blade.position.x = 0.04;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.014, 0.018), s.material('#3a2618'));
    handle.position.x = -0.035;
    knife.add(blade, handle);
    knife.traverse((c) => { c.castShadow = true; });
    knife.position.set(px + 0.03, top + 0.008, pz - 0.2);
    knife.rotation.y = 0.5;
    s.root.add(knife);

    const size = 0.32;
    const curve = new THREE.CatmullRomCurve3(LETTERS[a.letter].map(([x, y]) => new THREE.Vector3(px + 0.05 + (x - 0.5) * size * (a.letter === 'M' || a.letter === 'W' ? 1.2 : 0.85), top, pz + 0.06 - (y - 0.5) * size)));
    const N = 200, W = 0.026;
    const pos: number[] = [], col: number[] = [], idx: number[] = [];
    const skinC = new THREE.Color(skinHex), fleshC = new THREE.Color('#f2e6c4');
    const P = new THREE.Vector3(), T = new THREE.Vector3(), side = new THREE.Vector3();
    const twistPhase = random() * 6;
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      curve.getPoint(f, P); curve.getTangent(f, T);
      side.set(-T.z, 0, T.x).normalize();
      const twist = Math.sin(f * 26 + twistPhase);
      const w = W * (0.7 + 0.3 * Math.abs(twist)) * (f < 0.03 || f > 0.97 ? 0.6 : 1);
      const lift = 0.003 + 0.006 * (1 - Math.abs(twist));
      for (const sgn of [-1, 1]) {
        pos.push(P.x + side.x * w * sgn * 0.5, P.y + lift + sgn * 0.004 * (1 - Math.abs(twist)), P.z + side.z * w * sgn * 0.5);
        const c = twist > 0 ? skinC : fleshC;
        col.push(c.r, c.g, c.b);
      }
      if (i < N) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const peelGeo = new THREE.BufferGeometry();
    peelGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    peelGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    peelGeo.setIndex(idx);
    peelGeo.computeVertexNormals();
    s.mesh(peelGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, side: THREE.DoubleSide }));
    // A strip of peel still trails from the peeled apple to the start of the letter.
    const start = curve.getPoint(0);
    s.tube([[px - 0.04, top + 0.03, pz - 0.1], [(px - 0.04 + start.x) / 2, top + 0.01, (pz - 0.1 + start.z) / 2 - 0.02], [start.x, top + 0.006, start.z]], 0.004, skin);

    // A candle in a tin holder.
    const flames: THREE.Mesh[] = [];
    const candle = (x: number, y: number, z: number, h: number) => {
      s.cylinder(0.05, 0.055, 0.012, [x, y + 0.006, z], s.material('#3a3836', { metalness: 0.5, roughness: 0.5 }), 16);
      s.cylinder(0.018, 0.02, h, [x, y + 0.012 + h / 2, z], wax, 12);
      for (let i = 0; i < 3; i++) s.ball([0.006, 0.014, 0.006], [x + Math.cos(i * 2) * 0.019, y + h - 0.01 * i, z + Math.sin(i * 2) * 0.019], wax, 6);
      const flame = s.ball([0.008, 0.02, 0.008], [x, y + 0.012 + h + 0.022, z], flameMat, 8);
      flames.push(flame);
    };
    if (a.candle) candle(0.32, top, -0.15, mix(0.08, 0.16, random()));

    // Hazelnuts in pairs roasting on the stone; some have burst apart.
    if (a.nuts) {
      const nut = s.material('#8a5a2e', { roughness: 0.55 });
      const pairs = 3;
      for (let i = 0; i < pairs; i++) {
        const cx = 0.3 + (random() - 0.5) * 0.08, cz = 0.04 + i * 0.09;
        const burst = random() < 0.4;
        for (const sgn of [-1, 1]) {
          const off = burst ? 0.04 + random() * 0.03 : 0.013;
          const n = s.ball([0.012, 0.011, 0.014], [cx + sgn * off, top + 0.011, cz + (burst ? (random() - 0.5) * 0.04 : 0)], nut, 10);
          n.rotation.y = random() * 3;
          s.ball([0.009, 0.004, 0.011], [n.position.x, top + 0.004, n.position.z], s.material('#c8b080'), 8);
        }
      }
    }

    // The game set up nearby.
    const swing: THREE.Object3D[] = [];
    if (a.game === 'bobbing') {
      const tx = 0.05, tz = -0.74, R = 0.3;
      const stave = s.material('#6b4a2a', { roughness: 0.85 });
      s.lathe([[0.001, 0], [R - 0.02, 0], [R, 0.04], [R + 0.02, 0.24], [R + 0.03, 0.27], [R, 0.27], [R - 0.02, 0.05], [0.001, 0.04]], s.material('#6b4a2a', { roughness: 0.85, side: THREE.DoubleSide }), [tx, 0, tz]);
      for (const y of [0.06, 0.22]) s.ring(R + 0.017, 0.008, [tx, y, tz], s.material('#2a2826', { metalness: 0.5 })).rotation.x = Math.PI / 2;
      void stave;
      s.cylinder(R + 0.005, R + 0.005, 0.01, [tx, 0.22, tz], new THREE.MeshStandardMaterial({ color: '#4a6a7a', transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false }), 24);
      for (let i = 0; i < 5; i++) {
        const t = random() * Math.PI * 2, d = random() * 0.2;
        const g = apple(ar * 1.05, new THREE.Vector3(tx + Math.cos(t) * d, 0.18, tz + Math.sin(t) * d), i % 2 ? skin2 : skin, 1.2);
        swing.push(g);
      }
      s.cylinder(R + 0.12, R + 0.12, 0.003, [tx, 0.0015, tz + 0.05], new THREE.MeshStandardMaterial({ color: '#2a3a44', transparent: true, opacity: 0.3, depthWrite: false }), 20);
    }
    if (a.game === 'snap') {
      const sx = 0.05, sz = -0.58;
      const postH = 1.05;
      s.box([0.36, 0.04, 0.36], [sx - 0.36, 0.02, sz], wood);
      s.cylinder(0.025, 0.03, postH, [sx - 0.36, postH / 2, sz], wood, 10);
      s.rod([sx - 0.36, postH - 0.02, sz], [sx + 0.05, postH - 0.02, sz], 0.02, wood);
      const rig = new THREE.Group();
      rig.position.set(sx, postH - 0.03, sz);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.3, 4), s.material('#b49a6a'));
      cord.position.y = -0.15; rig.add(cord);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.46, 6), wood);
      stick.rotation.z = Math.PI / 2; stick.position.y = -0.3; rig.add(stick);
      rig.traverse((c) => { c.castShadow = true; });
      s.root.add(rig);
      const ap = apple(ar, new THREE.Vector3(0.22, -0.3 - ar * 0.9 - 0.04, 0), skin, 0);
      s.root.remove(ap); rig.add(ap);
      const c = new THREE.Group();
      const cBody = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.015, 0.07, 10), wax); cBody.position.y = 0.035; c.add(cBody);
      const cFlame = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), flameMat); cFlame.scale.set(0.007, 0.017, 0.007); cFlame.position.y = 0.088; c.add(cFlame);
      c.position.set(-0.22, -0.3, 0); rig.add(c);
      flames.push(cFlame);
      swing.push(rig);
    }

    const flameBase = flames.map((f) => f.scale.y);
    const spin = mix(0.1, 1.4, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        flames.forEach((f, i) => { f.scale.y = flameBase[i] * (0.85 + 0.2 * Math.sin(time * 9 + i * 2)); });
        if (a.game === 'snap') swing[0].rotation.y = time * spin;
        if (a.game === 'bobbing') swing.forEach((g, i) => { g.position.y += Math.sin(time * 2 * spin + i) * 0.0004; });
      },
    });
  },
});
