import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const FOAM = {
  red: 'Tomato red foam.',
  blue: 'Royal blue foam.',
  yellow: 'Canary yellow foam.',
  pink: 'Hot pink foam.',
  green: 'Lime green foam.',
  black: 'Plain black foam, the serious one.',
  bare: 'No foam at all: a bare dented chrome grille.',
} as const;
const FOAM_TINT: Record<keyof typeof FOAM, string> = { red: '#e23a2e', blue: '#2a5fd8', yellow: '#f4cc22', pink: '#f0509a', green: '#6fcf3a', black: '#26272b', bare: '#b8bec4' };

export default defineThing({
  questions: {
    state: choice('Where are the two microphones?', {
      docked: 'Both home in their places, charged and waiting for the next booking.',
      oneMissing: 'One is home; the other is simply gone, its place empty.',
      oneLive: 'One is home; the other lies on its side where it was dropped, still switched on.',
      bothDropped: 'Both lie abandoned and crossed over each other, the session ended mid-song.',
      duet: 'Both stand upright side by side on their ends, set down together between verses.',
    }),
    holder: choice('What do they live in?', {
      charger: 'A twin-cup desktop charging cradle with status lights and a trailing cable.',
      basket: 'The slatted plastic basket the front desk hands over with your room number.',
      tray: 'A small non-slip tray, nothing more.',
    }),
    foamA: choice('What colour is the first windscreen?', FOAM),
    foamB: choice('What colour is the second windscreen?', FOAM),
    body: choice('What are the microphone bodies like?', {
      black: 'Matte black plastic with a silver collar.',
      gold: 'Champagne gold, the premium-room pair.',
      silver: 'Brushed silver, heavy and cold.',
      glitter: 'White with pink sparkle bands, an idol microphone.',
    }),
    hygiene: choice('What about hygiene covers?', {
      none: 'None. The foam is as the last singer left it.',
      capped: 'A fresh white disposable cap stretched over each head.',
      bagged: 'Each microphone sealed in a clear sleeve with a paper SANITIZED band.',
      discarded: 'Used caps pulled off and left crumpled beside them.',
    }),
    tag: noul('Is a numbered room tag attached?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const bodyMat = {
      black: s.material('#1e2024', { roughness: 0.55 }),
      gold: s.material('#c9a45a', { metalness: 0.8, roughness: 0.3 }),
      silver: s.material('#b4bac0', { metalness: 0.85, roughness: 0.35 }),
      glitter: s.material('#f4f0f2', { roughness: 0.3 }),
    }[a.body];
    const collar = s.material(a.body === 'glitter' ? '#f060a8' : '#c8ccd2', { metalness: 0.8, roughness: 0.25 });
    const dark = s.material('#17181b', { roughness: 0.6 });
    const chrome = s.material('#b8bec4', { metalness: 0.9, roughness: 0.3 });
    const white = s.material('#f6f6f2', { roughness: 0.9 });
    const glow = (colour: string, power = 1.3) => new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: power, roughness: 0.4 });
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number] = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const leds: THREE.MeshStandardMaterial[] = [];
    const makeMic = (foam: keyof typeof FOAM, live: boolean) => {
      const g = new THREE.Group();
      const profile = [[0, 0], [0.019, 0], [0.021, 0.006], [0.02, 0.03], [0.0175, 0.09], [0.019, 0.165], [0.023, 0.175], [0.023, 0.185], [0.012, 0.19]].map(([x, y]) => new THREE.Vector2(x, y));
      add(g, new THREE.LatheGeometry(profile, 24), bodyMat);
      add(g, new THREE.CylinderGeometry(0.0215, 0.0215, 0.012, 24), s.material(FOAM_TINT[foam]), [0, 0.012, 0]);
      add(g, new THREE.CylinderGeometry(0.0235, 0.0235, 0.01, 24), collar, [0, 0.172, 0]);
      if (a.body === 'glitter') for (const y of [0.06, 0.11]) add(g, new THREE.CylinderGeometry(0.0195, 0.0195, 0.01, 24), collar, [0, y, 0]);
      // Little display and power light.
      add(g, new THREE.BoxGeometry(0.018, 0.026, 0.004), live ? glow('#7fe8ff', 1.1) : dark, [0, 0.125, 0.0185]);
      const lamp = live ? glow('#3dff6a', 1.8) : s.material('#40443f');
      if (live) leds.push(lamp);
      add(g, new THREE.SphereGeometry(0.0045, 8, 6), lamp, [0, 0.148, 0.019]);
      add(g, new THREE.BoxGeometry(0.01, 0.016, 0.006), s.material('#d83a2e'), [0, 0.095, 0.0175]);
      // Head: grille, then foam.
      const head = add(g, new THREE.SphereGeometry(0.027, 20, 14), chrome, [0, 0.212, 0]);
      add(g, new THREE.TorusGeometry(0.0272, 0.003, 6, 24), collar, [0, 0.212, 0]).rotation.x = Math.PI / 2;
      if (foam === 'bare') {
        head.scale.set(1, 1.05, 1);
        if (mood.wear > 0.5) head.scale.set(1, 0.93, 0.9);
      } else {
        const f = add(g, new THREE.SphereGeometry(0.039, 22, 16), s.material(FOAM_TINT[foam], { roughness: 1 }), [0, 0.218, 0]);
        f.scale.set(1, 1.12, 1);
        // Worn foam has bites out of it.
        const bites = Math.round(mix(-1, 4, mood.wear) * random());
        for (let i = 0; i < bites; i++) {
          const th = random() * 6.28, ph = random() * 1.4;
          add(g, new THREE.SphereGeometry(0.011, 8, 6), chrome, [Math.sin(th) * Math.cos(ph) * 0.031, 0.218 + Math.sin(ph) * 0.034, Math.cos(th) * Math.cos(ph) * 0.031]);
        }
      }
      if (a.hygiene === 'capped') {
        const cap = add(g, new THREE.SphereGeometry(0.0445, 18, 12, 0, 6.3, 0, 2.1), white, [0, 0.22, 0]);
        cap.scale.set(1, 1.12, 1);
        add(g, new THREE.TorusGeometry(0.036, 0.005, 6, 20), white, [0, 0.193, 0]).rotation.x = Math.PI / 2;
      } else if (a.hygiene === 'bagged') {
        const bag = add(g, new THREE.CylinderGeometry(0.048, 0.03, 0.29, 14), new THREE.MeshPhysicalMaterial({ color: '#eaf6ff', transparent: true, opacity: 0.2, roughness: 0.08, depthWrite: false }), [0, 0.135, 0]);
        bag.castShadow = false;
        add(g, new THREE.CylinderGeometry(0.0265, 0.024, 0.03, 20), white, [0, 0.07, 0]);
        add(g, new THREE.CylinderGeometry(0.027, 0.0245, 0.01, 20), s.material('#2a8ad8'), [0, 0.07, 0]);
      }
      return g;
    };

    const lay = (g: THREE.Group, x: number, z: number, yaw: number, ground = 0) => {
      g.rotation.order = 'YXZ';
      g.rotation.z = Math.PI / 2 - 0.1;
      g.rotation.y = yaw;
      g.rotation.x = random() * 6.28;
      g.position.set(x, ground + 0.022, z);
      s.root.add(g);
    };

    // The holder.
    const homes: ((g: THREE.Group) => void)[] = [];
    const tint = mood.cheer > 0.6 ? '#f06a9a' : mood.cheer > 0.3 ? '#3a8ac8' : '#5a6068';
    let floor = 0;
    if (a.holder === 'charger') {
      const shape = new THREE.Shape();
      const hw = 0.11, hd = 0.062, r = 0.03;
      shape.moveTo(-hw + r, -hd); shape.lineTo(hw - r, -hd); shape.quadraticCurveTo(hw, -hd, hw, -hd + r); shape.lineTo(hw, hd - r);
      shape.quadraticCurveTo(hw, hd, hw - r, hd); shape.lineTo(-hw + r, hd); shape.quadraticCurveTo(-hw, hd, -hw, hd - r); shape.lineTo(-hw, -hd + r); shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
      const base = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 3 }), dark);
      base.rotation.x = -Math.PI / 2; base.position.y = 0.006;
      for (const [i, x] of [-0.052, 0.052].entries()) {
        s.mesh(new THREE.CylinderGeometry(0.031, 0.034, 0.06, 24, 1, true), s.material('#2a2c31', { side: THREE.DoubleSide }), [x, 0.08, 0]);
        s.ring(0.031, 0.004, [x, 0.11, 0], collar).rotation.x = Math.PI / 2;
        s.cylinder(0.03, 0.03, 0.004, [x, 0.054, 0], s.material('#0c0c0e'), 20);
        homes.push((g) => { g.position.set(x, 0.056, 0); g.rotation.y = (random() - 0.5) * 1.2; g.rotation.z = (random() - 0.5) * 0.06; s.root.add(g); });
        void i;
      }
      s.label('CHARGE', 0.07, 0.014, [0, 0.03, 0.0695], '#c8ccd2', '#17181b');
      s.tube([[0, 0.02, -0.065], [0.02, 0.006, -0.1], [0.1, 0.005, -0.13], [0.17, 0.005, -0.08], [0.2, 0.005, 0.0]], 0.004, dark);
      s.box([0.03, 0.022, 0.04], [0.2, 0.011, 0.02], dark);
    } else if (a.holder === 'basket') {
      const plastic = s.material(tint, { roughness: 0.5 });
      const bw = 0.34, bd = 0.22, bh = 0.085;
      s.box([bw - 0.02, 0.006, bd - 0.02], [0, 0.003, 0], plastic);
      floor = 0.006;
      for (const z of [-1, 1]) {
        s.box([bw, 0.012, 0.012], [0, bh, z * bd / 2], plastic);
        for (let i = 0; i <= 12; i++) s.box([0.012, bh, 0.005], [-bw / 2 + 0.01 + i * (bw - 0.02) / 12, bh / 2, z * (bd / 2 - 0.004)], plastic);
      }
      for (const x of [-1, 1]) {
        s.box([0.012, 0.012, bd], [x * bw / 2, bh, 0], plastic);
        for (let i = 0; i <= 7; i++) s.box([0.005, bh, 0.012], [x * (bw / 2 - 0.004), bh / 2, -bd / 2 + 0.012 + i * (bd - 0.024) / 7], plastic);
      }
      for (const z of [-0.05, 0.05])
        homes.push((g) => {
          g.rotation.order = 'YXZ';
          g.rotation.z = -(Math.PI / 2 - 0.36);
          g.rotation.y = (random() - 0.5) * 0.3;
          g.position.set(-bw / 2 + 0.04, floor + 0.022, z + (random() - 0.5) * 0.02);
          s.root.add(g);
        });
    } else {
      s.box([0.36, 0.012, 0.2], [0, 0.006, 0], s.material('#3a3d42'));
      for (const z of [-1, 1]) s.box([0.36, 0.014, 0.008], [0, 0.015, z * 0.1], s.material('#2a2c30'));
      for (const x of [-1, 1]) s.box([0.008, 0.014, 0.208], [x * 0.18, 0.015, 0], s.material('#2a2c30'));
      s.box([0.33, 0.003, 0.17], [0, 0.0135, 0], s.material(tint, { roughness: 1 }));
      floor = 0.015;
      for (const z of [-0.042, 0.042]) homes.push((g) => lay(g, 0.11, z, (random() - 0.5) * 0.15, floor));
    }

    const wantHome = { docked: [true, true], oneMissing: [true, false], oneLive: [true, false], bothDropped: [false, false], duet: [false, false] }[a.state];
    const swap = random() < 0.5;
    const foams = swap ? [a.foamB, a.foamA] : [a.foamA, a.foamB];
    const loose: THREE.Vector3[] = [];
    const rings: THREE.Mesh[] = [];
    foams.forEach((foam, i) => {
      if (a.state === 'oneMissing' && i === 1) return;
      const live = (a.state === 'oneLive' && i === 1) || (a.state === 'bothDropped' && i === 0 && mood.energy > 0.4) || a.state === 'duet';
      const g = makeMic(foam, live);
      if (wantHome[i]) homes[i](g);
      else if (a.state === 'duet') {
        g.position.set(-0.03 + i * 0.075 + (a.holder === 'basket' ? 0 : -0.01), 0, 0.17 + (random() - 0.5) * 0.02);
        g.rotation.y = (random() - 0.5) * 2;
        s.root.add(g);
      } else if (a.state === 'bothDropped') {
        lay(g, 0.09 + i * 0.03, 0.2 + i * 0.012, i ? 0.9 + random() * 0.4 : -0.5 - random() * 0.4, i ? 0.03 : 0);
        loose.push(new THREE.Vector3(g.position.x, 0, g.position.z));
      } else {
        const yaw = -0.6 + random() * 1.2;
        lay(g, 0.12, 0.2, yaw);
        // Sound still coming out of the live one.
        const hx = 0.12 - Math.cos(yaw) * 0.215, hz = 0.2 + Math.sin(yaw) * 0.215;
        for (let k = 0; k < 3; k++) {
          const ring = s.ring(0.05, 0.0035, [hx, 0.05, hz], new THREE.MeshBasicMaterial({ color: '#3dff9a', transparent: true, opacity: 0.6, depthWrite: false }));
          ring.rotation.y = yaw + Math.PI / 2;
          ring.castShadow = ring.receiveShadow = false;
          ring.userData = { k, hx, hz, yaw };
          rings.push(ring);
        }
      }
    });

    // Charger status lights: green for a seated mic, red for an empty cup.
    if (a.holder === 'charger')
      for (const [i, x] of [-0.052, 0.052].entries()) {
        const seated = wantHome[i];
        const m = glow(seated ? '#3dff6a' : '#ff3a2a', 1.6);
        if (!seated) leds.push(m);
        s.ball([0.006, 0.006, 0.004], [x, 0.036, 0.069], m, 8);
      }

    if (a.hygiene === 'discarded') {
      const n = 2 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) {
        const blob = s.mesh(new THREE.IcosahedronGeometry(0.03, 0), white, [-0.2 + random() * 0.1, 0.014, 0.12 + random() * 0.12]);
        blob.scale.set(1 + random() * 0.4, 0.45, 0.8 + random() * 0.4);
        blob.rotation.y = random() * 6;
      }
    }
    if (a.tag) {
      const n = String(1 + Math.floor(random() * 28));
      const fob = new THREE.Group();
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.006, 0.11), s.material(['#f2d02a', '#f07a2a', '#3ab8a0', '#f2f2ee'][Math.floor(random() * 4)], { roughness: 0.35 }));
      plate.castShadow = true;
      fob.add(plate);
      fob.position.set(-0.19, 0.004, -0.02 + random() * 0.06);
      fob.rotation.y = 0.3 + random() * 0.5;
      s.root.add(fob);
      const num = s.label(n, 0.055, 0.06, [0, 0, 0], '#1a1a1a', '#fffdf2');
      num.rotation.x = -Math.PI / 2; num.position.set(0, 0.0036, 0.01);
      fob.add(num);
      s.tube([[-0.18, 0.006, -0.05], [-0.14, 0.012, -0.09], [-0.09, 0.01, -0.07], [-0.1, 0.02, -0.02]], 0.0022, chrome);
    }

    const pace = mix(0.5, 2.2, mood.energy);
    const pulse = (t: number) => {
      for (const ring of rings) {
        const { k, hx, hz, yaw } = ring.userData as { k: number; hx: number; hz: number; yaw: number };
        const p = (t * 0.5 + k / 3) % 1;
        ring.scale.setScalar(0.5 + p * 1.6);
        ring.position.set(hx - Math.cos(yaw) * p * 0.09, 0.05, hz + Math.sin(yaw) * p * 0.09);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - p);
      }
    };
    let clock = random() * 3;
    pulse(clock);
    void loose;
    return s.finish({
      update: (dt) => {
        clock += dt * pace;
        pulse(clock);
        for (const m of leds) m.emissiveIntensity = 0.9 + Math.sin(clock * 6) * 0.9;
      },
    });
  },
});
