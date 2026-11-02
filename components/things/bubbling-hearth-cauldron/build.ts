import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, paint, paintHex, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    brew: paint('What colour is the brew?', ['olive', 'green', 'lime', 'purple', 'orange', 'crimson', 'cream', 'turquoise']),
    floating: choice('What floats in the brew or pokes out of it?', {
      nothing: 'Nothing: just the heaving liquid.',
      bone: 'A ladle carved from a long bone, its knobbed handle sticking up out of the pot.',
      toad: 'A fat warty toad sitting half submerged, eyes just above the surface.',
      mushrooms: 'Red-capped toadstools and pale mushrooms bobbing in a cluster.',
      apples: 'Whole red apples rolling in the boil.',
      paddle: 'A long wooden stirring paddle standing up in the pot, leaning on the rim.',
      eyeballs: 'A clutch of pale eyeballs bobbing, irises staring upward.',
    }),
    setting: choice('How is the cauldron set over the fire?', {
      legs: 'Standing on its own three stubby legs right in the coals of the hearth.',
      crane: 'Hanging from the chain of a swinging iron hearth crane, a fire beneath.',
      tripod: 'Hanging from three lashed wooden poles over a ring of stones outdoors.',
      sunk: 'Bedded straight into a glowing heap of embers, no legs to be seen.',
    }),
    boilOver: noul('Is it boiling over, froth spilling down the sides and pooling on the ground?'),
    size: score('How big is the cauldron?', ['A small pot for one charm', 'A household cauldron', 'A big coven pot', 'A vast vat a child could hide in']),
    beside: choice('What lies beside it?', {
      nothing: 'Nothing: the cauldron alone.',
      firewood: 'A small stack of split firewood.',
      jars: 'A couple of stoppered bottles and a stone mortar of crushed herbs.',
      pumpkin: 'A squat orange pumpkin waiting its turn.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const k = mix(0.75, 1.6, a.size);
    const brewHex = paintHex(a.brew);
    const glow = mix(0.35, 1.5, 0.6 * mood.energy + 0.4 * (1 - mood.cheer));
    const iron = s.material('#1c1b1d', { roughness: 0.75, metalness: 0.45, side: THREE.DoubleSide });
    const rust = s.material('#3a2a22', { roughness: 0.95 });
    const brew = s.material(brewHex, { emissive: brewHex, emissiveIntensity: glow, roughness: 0.25 });
    const froth = s.material(new THREE.Color(brewHex).lerp(new THREE.Color('#ffffff'), 0.45), { emissive: brewHex, emissiveIntensity: glow * 0.5, roughness: 0.5 });
    const wood = s.material('#5a3a22', { roughness: 0.9 });
    const charred = s.material('#231a14', { roughness: 1 });
    const flameOuter = new THREE.MeshStandardMaterial({ color: '#ff7a1a', emissive: '#ff5a0a', emissiveIntensity: mix(1.2, 2.6, mood.energy), transparent: true, opacity: 0.85, depthWrite: false });
    const flameInner = new THREE.MeshStandardMaterial({ color: '#ffd45a', emissive: '#ffc23a', emissiveIntensity: mix(1.5, 3, mood.energy), transparent: true, opacity: 0.9, depthWrite: false });
    const ember = s.material('#ff5a14', { emissive: '#ff3a00', emissiveIntensity: mix(0.8, 2.2, mood.energy) });
    const stone = s.material('#77706a', { roughness: 0.95 });

    // Height of the cauldron's belly bottom above the ground, by how it is set.
    const lift = { legs: 0.17, crane: 0.36, tripod: 0.4, sunk: 0.05 }[a.setting] * k;
    const R = 0.36 * k;
    const profile: [number, number][] = [
      [0.001, 0], [0.12, 0.004], [0.22, 0.03], [0.3, 0.09], [0.35, 0.17], [0.36, 0.26], [0.345, 0.34], [0.31, 0.41],
      [0.28, 0.455], [0.285, 0.475], [0.31, 0.49], [0.315, 0.505], [0.29, 0.51], [0.27, 0.49],
    ];
    s.lathe(profile.map(([r, y]) => [r * k, y * k] as [number, number]), iron, [0, lift, 0]);
    const rimY = lift + 0.5 * k;
    const surfaceY = lift + 0.45 * k;
    // A cast seam and two lugs on the belly.
    s.ring(0.358 * k, 0.008 * k, [0, lift + 0.26 * k, 0], iron).rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      const lug = s.ring(0.045 * k, 0.012 * k, [side * 0.33 * k, lift + 0.43 * k, 0], iron);
      lug.rotation.y = Math.PI / 2;
    }
    // The brew: a glowing disc filling the mouth.
    s.cylinder(0.282 * k, 0.282 * k, 0.02 * k, [0, surfaceY, 0], brew, 32);

    // Bail handle: upright when hung, flopped back when it stands.
    const hung = a.setting === 'crane' || a.setting === 'tripod';
    const bail = s.ring(0.33 * k, 0.011 * k, [0, lift + 0.43 * k, 0], iron, Math.PI);
    if (!hung) bail.rotation.x = -1.25;

    // Legs.
    if (a.setting === 'legs') {
      for (let i = 0; i < 3; i++) {
        const t = i * Math.PI * 2 / 3 + Math.PI / 6;
        s.rod([Math.sin(t) * 0.2 * k, lift + 0.05 * k, Math.cos(t) * 0.2 * k], [Math.sin(t) * 0.25 * k, 0, Math.cos(t) * 0.25 * k], 0.03 * k, iron, 0.02 * k);
      }
    }

    // The fire beneath.
    const flames: THREE.Mesh[] = [];
    const fireTop = Math.max(0.12 * k, lift * 0.9);
    const addFlame = (x: number, z: number, h: number, r: number) => {
      const outer = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), flameOuter);
      outer.position.set(x, h / 2 + 0.03 * k, z);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, h * 0.65, 8), flameInner);
      inner.position.set(x, h * 0.33 + 0.03 * k, z);
      s.root.add(outer, inner);
      flames.push(outer, inner);
    };
    const flameCount = Math.round(mix(4, 9, mood.energy));
    for (let i = 0; i < flameCount; i++) {
      const t = random() * Math.PI * 2, d = random() * 0.17 * k;
      const h = Math.min(fireTop, mix(0.09, lift > 0.3 * k ? 0.42 : 0.3, random()) * k * mix(0.7, 1.3, mood.energy));
      addFlame(Math.sin(t) * d, Math.cos(t) * d, Math.max(0.05 * k, h), mix(0.035, 0.06, random()) * k);
    }
    // Logs crossed under the pot.
    for (let i = 0; i < 4; i++) {
      const t = i * Math.PI / 2 + random() * 0.4;
      const reach = (a.setting === 'legs' ? 0.36 : 0.32) * k;
      s.rod([Math.sin(t) * reach, 0.03 * k, Math.cos(t) * reach], [Math.sin(t) * 0.04 * k, 0.07 * k, Math.cos(t) * 0.04 * k], 0.035 * k, i % 2 ? wood : charred);
    }
    const hot: { at: P3; size: number }[] = [], cold: { at: P3; size: number }[] = [];
    for (let i = 0; i < (a.setting === 'sunk' ? 110 : 40); i++) {
      const t = random() * Math.PI * 2, d = Math.sqrt(random()) * (a.setting === 'sunk' ? 0.5 : 0.3) * k;
      const heap = a.setting === 'sunk' ? Math.max(0, 0.16 * k - d * 0.32) * random() : 0;
      const coal = { at: [Math.sin(t) * d, 0.012 * k + heap, Math.cos(t) * d] as P3, size: mix(0.014, 0.03, random()) * k };
      (random() < mix(0.25, 0.6, mood.energy) && d < 0.4 * k ? hot : cold).push(coal);
    }
    const lump = new THREE.DodecahedronGeometry(1, 0);
    if (hot.length) s.scatter(lump, ember, hot);
    if (cold.length) s.scatter(lump.clone(), s.material('#2a2220', { roughness: 1 }), cold);
    if (a.setting === 'legs' || a.setting === 'sunk') s.cylinder(0.62 * k, 0.64 * k, 0.03 * k, [0, -0.005, 0], stone, 9);
    if (a.setting === 'tripod') {
      for (let i = 0; i < 11; i++) {
        const t = i / 11 * Math.PI * 2;
        s.ball([0.08 * k, 0.06 * k, 0.07 * k], [Math.sin(t) * 0.42 * k, 0.04 * k, Math.cos(t) * 0.42 * k], stone, 7).rotation.y = random() * 3;
      }
    }

    // Hanging gear: a chain from above to the top of the bail.
    const bailTop = lift + 0.43 * k + 0.33 * k;
    const chain = (top: number) => {
      const links = Math.max(2, Math.round((top - bailTop) / (0.05 * k)));
      for (let i = 0; i < links; i++) {
        const link = s.ring(0.022 * k, 0.006 * k, [0, bailTop + (i + 0.5) * (top - bailTop) / links, 0], iron);
        link.rotation.set(0, i % 2 ? Math.PI / 2 : 0, Math.PI / 2);
      }
    };
    if (a.setting === 'crane') {
      const top = bailTop + 0.45 * k;
      const px = -0.62 * k;
      s.cylinder(0.03 * k, 0.03 * k, top + 0.15 * k, [px, (top + 0.15 * k) / 2, 0], iron, 10);
      s.rod([px, top, 0], [0.06 * k, top, 0], 0.022 * k, iron);
      s.rod([px, top - 0.4 * k, 0], [px * 0.35, top, 0], 0.016 * k, iron);
      s.ring(0.04 * k, 0.012 * k, [px, top - 0.45 * k, 0], iron).rotation.x = Math.PI / 2;
      s.ring(0.04 * k, 0.012 * k, [px, top + 0.05 * k, 0], iron).rotation.x = Math.PI / 2;
      s.box([0.1 * k, 0.04 * k, 0.1 * k], [px, 0.02 * k, 0], stone);
      chain(top);
    }
    if (a.setting === 'tripod') {
      const apex: P3 = [0, bailTop + 0.55 * k, 0];
      for (let i = 0; i < 3; i++) {
        const t = i * Math.PI * 2 / 3 + 0.4;
        const foot: P3 = [Math.sin(t) * 0.75 * k, 0, Math.cos(t) * 0.75 * k];
        const over: P3 = [apex[0] - Math.sin(t) * 0.1 * k, apex[1] + 0.12 * k, apex[2] - Math.cos(t) * 0.1 * k];
        s.rod(foot, over, 0.03 * k, wood, 0.024 * k);
      }
      s.ring(0.045 * k, 0.018 * k, [0, apex[1], 0], s.material('#8a7a5a')).rotation.x = Math.PI / 2;
      chain(apex[1]);
    }

    // What floats in it.
    const bob: { mesh: THREE.Object3D; base: number; phase: number }[] = [];
    const float = (mesh: THREE.Object3D) => { bob.push({ mesh, base: mesh.position.y, phase: random() * 6 }); return mesh; };
    if (a.floating === 'bone') {
      const bone = s.material('#e8dcc0', { roughness: 0.7 });
      const from: P3 = [0.08 * k, surfaceY - 0.05 * k, 0.04 * k], to: P3 = [-0.24 * k, rimY + 0.38 * k, -0.1 * k];
      s.rod(from, to, 0.022 * k, bone);
      s.ball([0.035 * k, 0.03 * k, 0.03 * k], [to[0] - 0.02 * k, to[1], to[2] + 0.015 * k], bone, 10);
      s.ball([0.035 * k, 0.03 * k, 0.03 * k], [to[0] + 0.02 * k, to[1] + 0.01 * k, to[2] - 0.015 * k], bone, 10);
    }
    if (a.floating === 'paddle') {
      const from: P3 = [0.06 * k, surfaceY - 0.1 * k, 0.05 * k], to: P3 = [-0.3 * k, rimY + 0.75 * k, -0.18 * k];
      s.rod(from, to, 0.02 * k, wood);
      const blade = s.box([0.09 * k, 0.16 * k, 0.02 * k], [0.05 * k, surfaceY + 0.01 * k, 0.04 * k], wood);
      blade.lookAt(new THREE.Vector3(...to));
    }
    if (a.floating === 'toad') {
      const skin = s.material('#5d6a2c', { roughness: 0.8 });
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.075 * k, 14, 10), skin);
      body.scale.set(1.15, 0.65, 1);
      g.add(body);
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024 * k, 10, 8), s.material('#c9a227', { emissive: '#7a5a00', emissiveIntensity: 0.4 }));
        eye.position.set(side * 0.04 * k, 0.045 * k, 0.04 * k);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.011 * k, 8, 6), s.material('#111111'));
        pupil.position.set(side * 0.042 * k, 0.05 * k, 0.06 * k);
        g.add(eye, pupil);
      }
      for (let i = 0; i < 9; i++) {
        const wart = new THREE.Mesh(new THREE.SphereGeometry(0.01 * k, 6, 4), s.material('#7d7a3a'));
        const t = random() * Math.PI * 2;
        wart.position.set(Math.sin(t) * 0.06 * k, 0.035 * k, Math.cos(t) * 0.05 * k - 0.01 * k);
        g.add(wart);
      }
      g.scale.setScalar(1.45);
      g.position.set(0.06 * k, surfaceY + 0.015 * k, 0.08 * k);
      g.traverse((child) => { child.castShadow = true; });
      s.root.add(g);
      float(g);
    }
    if (a.floating === 'mushrooms' || a.floating === 'apples' || a.floating === 'eyeballs') {
      const n = 3 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) {
        const t = i / n * Math.PI * 2 + random() * 0.6, d = mix(0.06, 0.19, random()) * k;
        const x = Math.sin(t) * d, z = Math.cos(t) * d;
        const g = new THREE.Group();
        if (a.floating === 'mushrooms') {
          const red = i % 2 === 0;
          const cap = new THREE.Mesh(new THREE.SphereGeometry(0.05 * k, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), s.material(red ? '#b81e1e' : '#d9c7a4'));
          cap.scale.y = 0.7;
          g.add(cap);
          if (red) for (let j = 0; j < 5; j++) {
            const dot = new THREE.Mesh(new THREE.SphereGeometry(0.008 * k, 6, 4), s.material('#f4efe2'));
            const u = random() * Math.PI * 2;
            dot.position.set(Math.sin(u) * 0.03 * k, 0.026 * k, Math.cos(u) * 0.03 * k);
            g.add(dot);
          }
          g.rotation.set((random() - 0.5) * 0.6, 0, (random() - 0.5) * 0.6);
        } else if (a.floating === 'apples') {
          const apple = new THREE.Mesh(new THREE.SphereGeometry(0.055 * k, 14, 10), s.material(i % 3 === 2 ? '#7f9a2a' : '#a8231c', { roughness: 0.4 }));
          apple.scale.y = 0.9;
          const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.004 * k, 0.004 * k, 0.03 * k, 5), wood);
          stalk.position.y = 0.055 * k;
          g.add(apple, stalk);
        } else {
          const ball = new THREE.Mesh(new THREE.SphereGeometry(0.04 * k, 14, 10), s.material('#f1ece0', { roughness: 0.3 }));
          const iris = new THREE.Mesh(new THREE.SphereGeometry(0.018 * k, 10, 8), s.material(['#2f7a4a', '#3a6ab0', '#8a5a1a'][i % 3]));
          iris.position.set(0, 0.03 * k, 0.012 * k);
          iris.scale.y = 0.5;
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.008 * k, 8, 6), s.material('#0c0c0c'));
          pupil.position.set(0, 0.038 * k, 0.014 * k);
          g.add(ball, iris, pupil);
          g.rotation.set(0.3 * (random() - 0.5), random() * 6, 0.3 * (random() - 0.5));
        }
        g.position.set(x, surfaceY + 0.01 * k, z);
        g.traverse((child) => { child.castShadow = true; });
        s.root.add(g);
        float(g);
      }
    }

    // Boiling over: froth on the lip, runs down the belly and puddles below.
    if (a.boilOver) {
      s.ring(0.3 * k, 0.03 * k, [0, rimY + 0.005 * k, 0], froth).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) s.ball([0.07 * k, 0.04 * k, 0.07 * k], [Math.sin(i * 2.1) * 0.18 * k, rimY + 0.02 * k, Math.cos(i * 2.1) * 0.18 * k], froth, 10);
      const runs = 4 + Math.floor(random() * 3);
      for (let i = 0; i < runs; i++) {
        const t = i / runs * Math.PI * 2 + random() * 0.5;
        const at = (r: number, y: number): P3 => [Math.sin(t) * r * k, lift + y * k, Math.cos(t) * r * k];
        const end = mix(0.12, 0.3, random());
        s.tube([at(0.31, 0.51), at(0.335, 0.44), at(0.37, 0.34), at(0.375, end + 0.05), at(0.37, end)], 0.018 * k, froth);
        s.ball([0.022 * k, 0.03 * k, 0.022 * k], at(0.37, end - 0.01), froth, 8);
      }
      for (let i = 0; i < 3; i++) {
        const t = random() * Math.PI * 2;
        s.cylinder(mix(0.1, 0.18, random()) * k, mix(0.1, 0.18, random()) * k, 0.008 * k, [Math.sin(t) * 0.45 * k, 0.006, Math.cos(t) * 0.45 * k], brew, 16);
      }
    }

    // Beside it.
    const sx = 0.7 * k * (random() < 0.5 ? -1 : 1);
    if (a.beside === 'firewood') {
      for (let row = 0; row < 3; row++) for (let i = 0; i < 3 - row; i++) {
        const log = s.cylinder(0.05 * k, 0.05 * k, 0.4 * k, [sx, 0.05 * k + row * 0.088 * k, 0.2 * k + (i - (2 - row) / 2) * 0.1 * k], i % 2 ? wood : s.material('#7a5536'), 8);
        log.rotation.z = Math.PI / 2;
      }
    }
    if (a.beside === 'jars') {
      const glass = (hex: string, h: number, x: number, z: number) => {
        s.lathe([[0.001, 0], [0.05 * k, 0], [0.055 * k, h * 0.6], [0.02 * k, h * 0.8], [0.018 * k, h], [0.001, h]], s.material(hex, { roughness: 0.2, emissive: hex, emissiveIntensity: 0.15 }), [x, 0, z]);
        s.cylinder(0.02 * k, 0.017 * k, 0.04 * k, [x, h + 0.015 * k, z], s.material('#8a6a4a'), 8);
      };
      glass('#2f5a3a', 0.22 * k, sx, 0.25 * k);
      glass('#5a2a6a', 0.16 * k, sx + 0.12 * k * Math.sign(sx), 0.08 * k);
      s.lathe([[0.001, 0], [0.08 * k, 0], [0.095 * k, 0.07 * k], [0.09 * k, 0.1 * k], [0.075 * k, 0.1 * k], [0.07 * k, 0.04 * k], [0.001, 0.04 * k]], stone, [sx - 0.05 * k * Math.sign(sx), 0, 0.45 * k]);
      s.cylinder(0.072 * k, 0.072 * k, 0.01 * k, [sx - 0.05 * k * Math.sign(sx), 0.085 * k, 0.45 * k], s.material('#5a7a3a'), 14);
      s.rod([sx - 0.05 * k * Math.sign(sx), 0.06 * k, 0.45 * k], [sx - 0.1 * k * Math.sign(sx), 0.2 * k, 0.4 * k], 0.014 * k, stone);
    }
    if (a.beside === 'pumpkin') {
      const orange = s.material('#d8661a', { roughness: 0.55 });
      for (let i = 0; i < 8; i++) {
        const t = i / 8 * Math.PI * 2;
        const lobe = s.ball([0.08 * k, 0.15 * k, 0.08 * k], [sx + Math.sin(t) * 0.11 * k, 0.15 * k, 0.25 * k + Math.cos(t) * 0.11 * k], orange, 14);
        lobe.rotation.y = t;
      }
      s.rod([sx, 0.27 * k, 0.25 * k], [sx + 0.03 * k, 0.36 * k, 0.24 * k], 0.022 * k, s.material('#4a5a2a'), 0.015 * k);
    }
    void rust;

    // Bubbles: domes that swell and burst across the surface.
    const bubbleCount = Math.round(mix(5, 22, mood.energy));
    const bubbleGeo = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const bubbles = new THREE.InstancedMesh(bubbleGeo, froth, bubbleCount);
    bubbles.castShadow = true;
    s.root.add(bubbles);
    const seeds = Array.from({ length: bubbleCount }, () => ({ t: random() * Math.PI * 2, d: Math.sqrt(random()) * 0.24 * k, phase: random(), size: mix(0.02, 0.055, random()) * k, speed: mix(0.6, 1.4, random()) }));
    const matrix = new THREE.Matrix4();
    const setBubbles = (time: number) => {
      seeds.forEach((b, i) => {
        const p = (b.phase + time * b.speed * mix(0.25, 1.4, mood.energy)) % 1;
        const r = b.size * Math.sin(p * Math.PI) + 0.0001;
        matrix.makeScale(r, r * 0.8, r).setPosition(Math.sin(b.t) * b.d, surfaceY + 0.008 * k, Math.cos(b.t) * b.d);
        bubbles.setMatrixAt(i, matrix);
      });
      bubbles.instanceMatrix.needsUpdate = true;
    };
    setBubbles(0);

    // Steam: soft translucent puffs that rise and fade.
    const steamMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f2f0ea').lerp(new THREE.Color(brewHex), 0.25), transparent: true, opacity: mix(0.16, 0.3, mood.energy), depthWrite: false, roughness: 1 });
    const puffs = Array.from({ length: Math.round(mix(4, 9, mood.energy)) }, (_u, i) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), steamMat);
      s.root.add(puff);
      return { puff, phase: i / 9 + random() * 0.1, x: (random() - 0.5) * 0.25 * k, z: (random() - 0.5) * 0.25 * k };
    });
    const rise = 0.75 * k;
    const setSteam = (time: number) => {
      for (const p of puffs) {
        const t = (p.phase + time * mix(0.05, 0.3, mood.energy)) % 1;
        p.puff.position.set(p.x * (1 + t), rimY + 0.05 * k + t * rise, p.z * (1 + t));
        p.puff.scale.setScalar((0.06 + t * 0.12) * k);
      }
    };
    setSteam(0);

    const flameBase = flames.map((f) => f.scale.y);
    return s.finish({
      update: (_dt, time) => {
        setBubbles(time);
        setSteam(time);
        flames.forEach((f, i) => { f.scale.y = flameBase[i] * (0.85 + 0.25 * Math.sin(time * mix(4, 14, mood.energy) + i * 1.7)); });
        for (const b of bob) b.mesh.position.y = b.base + Math.sin(time * mix(1, 4, mood.energy) + b.phase) * 0.01 * k;
      },
    });
  },
});
