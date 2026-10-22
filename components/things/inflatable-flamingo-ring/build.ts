import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    type: choice('What kind of inflatable is it?', {
      flamingo: 'A hot-pink flamingo ring with a curved neck and a black-tipped beak.',
      swan: 'A white swan ring with raised wings and an orange beak, faintly glamorous.',
      doughnut: 'A giant doughnut with pink icing and coloured sprinkles.',
      crocodile: 'A long green crocodile to ride on, with teeth and googly eyes.',
      'inner-tube': 'A plain black rubber inner tube from a lorry tyre, no nonsense.',
    }),
    inflation: score('How inflated is it?', [
      'A sad flat puddle of vinyl',
      'Half down, sagging and wrinkled',
      'A bit soft',
      'Drum-taut and squeaky',
    ]),
    pose: choice('How is it resting?', {
      flat: 'Lying flat, ready to be sat in.',
      'on-edge': 'Stood up on its edge like a wheel, beached on its side.',
      tipped: 'Propped at a slant on a pile of plain swim rings, waiting its turn.',
    }),
    drink: noul('Is there a drink in its cup holder?'),
    finish: choice('What is the vinyl like?', {
      classic: 'Solid glossy colour, straight off the shelf.',
      gold: 'Metallic gold all over, a party novelty.',
      glitter: 'Translucent, with glitter and confetti sealed inside.',
    }),
    story: choice('What goes with it?', {
      nothing: 'Nothing at all.',
      sunglasses: 'A pair of sunglasses perched on it.',
      pump: 'A foot pump with its hose, mid-rescue.',
      tether: 'A rope tying it to a peg so it cannot drift away.',
      patch: 'Repair patches and a strip of tape over an old puncture.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const f = a.inflation;
    const soft = 1 - f;
    const croc = a.type === 'crocodile';
    const base = { flamingo: '#ff5fa2', swan: '#f6f4ee', doughnut: '#d9a35c', crocodile: '#3fae4a', 'inner-tube': '#1d1f22' }[a.type];
    const vinyl = (colour: string, extra: THREE.MeshStandardMaterialParameters = {}) => {
      if (a.finish === 'gold' && colour === base) return new THREE.MeshStandardMaterial({ color: '#e0b23a', metalness: 0.85, roughness: 0.25, ...extra });
      const material = new THREE.MeshStandardMaterial({ color: colour, roughness: a.type === 'inner-tube' ? 0.6 : mix(0.22, 0.5, mood.wear), ...extra });
      material.color.lerp(new THREE.Color('#bdb5a8'), mood.wear * 0.25);
      if (a.finish === 'glitter' && colour === base && a.type !== 'inner-tube') { material.transparent = true; material.opacity = 0.82; }
      return material;
    };
    const skin = vinyl(base);
    const black = vinyl('#17181a');
    const white = vinyl('#f8f6f0');

    // rig bobs; body carries the inflation squash.
    const rig = new THREE.Group(), body = new THREE.Group();
    rig.add(body); s.root.add(rig);
    const put = (mesh: THREE.Mesh, to: THREE.Object3D = body) => { to.add(mesh); return mesh; };
    const squash = mix(0.12, 1, Math.pow(f, 0.8));
    const spread = 1 + soft * 0.1;
    const R = 0.5, T = 0.17;
    let holder: [number, number, number];

    if (!croc) {
      const ring = put(s.mesh(new THREE.TorusGeometry(R, T, 18, 48), skin, [0, T, 0]));
      ring.rotation.x = Math.PI / 2;
      // Seam line round the outside.
      put(s.mesh(new THREE.TorusGeometry(R + T + 0.002, 0.008, 5, 48), vinyl(base, { roughness: 0.7 }), [0, T, 0])).rotation.x = Math.PI / 2;
      holder = [Math.sin(0.9) * R, T * 2 - 0.02, Math.cos(0.9) * R];
      if (a.type === 'flamingo' || a.type === 'swan') {
        const swan = a.type === 'swan';
        const neck = new THREE.Group();
        neck.position.set(0, T * 0.6, R);
        body.add(neck);
        const top: [number, number, number] = swan ? [0, 0.98, 0.16] : [0, 0.9, 0.2];
        const path: [number, number, number][] = swan
          ? [[0, 0, 0], [0, 0.3, 0.16], [0, 0.6, 0.06], [0, 0.86, -0.02], top]
          : [[0, 0, 0], [0, 0.26, 0.2], [0, 0.5, 0.02], [0, 0.78, 0.0], top];
        const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
        put(new THREE.Mesh(new THREE.TubeGeometry(curve, 28, swan ? 0.095 : 0.085, 12), skin), neck).castShadow = true;
        put(s.ball([0.14, 0.14, 0.14], [0, 0.02, 0], skin, 16), neck);
        put(s.ball([0.13, 0.125, 0.15], [top[0], top[1], top[2] + 0.03], skin, 18), neck);
        const beak = put(s.mesh(new THREE.ConeGeometry(0.075, 0.24, 14), swan ? vinyl('#f08a1c') : white, [0, top[1] - 0.05, top[2] + 0.22]), neck);
        beak.rotation.x = Math.PI / 2 + (swan ? 0.25 : 0.75);
        if (swan) put(s.ball([0.045, 0.04, 0.05], [0, top[1] + 0.02, top[2] + 0.15], black, 10), neck);
        else { const tip = put(s.mesh(new THREE.ConeGeometry(0.045, 0.14, 12), black, [0, top[1] - 0.14, top[2] + 0.27]), neck); tip.rotation.x = Math.PI / 2 + 1.25; }
        for (const sx of [-1, 1]) {
          put(s.ball([0.03, 0.03, 0.03], [sx * 0.1, top[1] + 0.035, top[2] + 0.1], black, 10), neck);
          put(s.ball([0.012, 0.012, 0.012], [sx * 0.115, top[1] + 0.045, top[2] + 0.12], white, 6), neck);
          const wing = put(s.ball(swan ? [0.07, 0.3, 0.42] : [0.07, 0.2, 0.36], [sx * (R + T * 0.55), T * 1.5 + (swan ? 0.12 : 0.02), -0.08], swan ? white : vinyl('#ff86b8'), 16));
          wing.rotation.set(-0.35, 0, -sx * (swan ? 0.3 : 0.5));
        }
        const tail = put(s.mesh(new THREE.ConeGeometry(0.12, 0.34, 12), swan ? white : vinyl('#ff86b8'), [0, T * 1.6, -(R + T * 0.7)]));
        tail.rotation.x = -0.9;
        // The neck is the first thing to go when the air leaves.
        neck.rotation.x = Math.pow(soft, 2.2) * 1.5;
        neck.rotation.z = soft * soft * (random() - 0.5) * 1.6;
        neck.scale.setScalar(1 - soft * 0.25);
      } else if (a.type === 'doughnut') {
        const icingColour = mood.cheer > 0.35 ? '#ff7fb6' : '#6b3d22';
        const icing = put(s.mesh(new THREE.TorusGeometry(R, T * 0.985, 18, 48), vinyl(icingColour), [0, T + 0.035, 0]));
        icing.rotation.x = Math.PI / 2;
        // Drips of icing down the outside.
        for (let i = 0; i < 9; i++) {
          const t = random() * Math.PI * 2, out = random() < 0.6 ? 1 : -1;
          const rr = R + out * T * 0.86;
          put(s.ball([0.07, 0.09 + random() * 0.06, 0.07], [Math.sin(t) * rr, T * 1.25, Math.cos(t) * rr], vinyl(icingColour), 10));
        }
        const colours = ['#ffe14a', '#4ac7ff', '#ffffff', '#ff4a4a', '#7be07a'];
        const count = 46;
        const sprinkle = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.014, 0.05, 3, 6), new THREE.MeshStandardMaterial({ roughness: 0.4 }), count);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
        for (let i = 0; i < count; i++) {
          const t = random() * Math.PI * 2, phi = (random() - 0.5) * 1.7;
          const rr = R + Math.sin(phi) * T, y = T + 0.035 + Math.cos(phi) * T * 0.985;
          q.setFromEuler(e.set(Math.PI / 2 + (random() - 0.5) * 0.4, random() * 6, phi * (random() < 0.5 ? 1 : -1) * 0.5));
          sprinkle.setMatrixAt(i, m.compose(new THREE.Vector3(Math.sin(t) * rr, y, Math.cos(t) * rr), q, new THREE.Vector3(1, 1, 1)));
          sprinkle.setColorAt(i, new THREE.Color(colours[i % colours.length]));
        }
        sprinkle.castShadow = true;
        body.add(sprinkle);
      } else {
        // Inner tube: a brass valve and moulded lettering ridge.
        const valve = put(s.cylinder(0.012, 0.016, 0.12, [0, T, -(R - T - 0.04)], s.material('#b9923a', { metalness: 0.8, roughness: 0.3 }), 8));
        valve.rotation.x = Math.PI / 2 - 0.3;
        put(s.mesh(new THREE.TorusGeometry(R, T + 0.004, 4, 48, Math.PI * 2), vinyl('#26292c', { roughness: 0.8 }), [0, T, 0])).rotation.set(Math.PI / 2, 0, 0);
      }
      // Valve stopper on every ring.
      if (a.type !== 'inner-tube') put(s.cylinder(0.022, 0.026, 0.035, [-(R + T * 0.7), T * 1.7, -0.2], white, 10));
    } else {
      // Crocodile: a long lilo with head, tail, legs and ridges.
      const belly = vinyl('#e9e27a');
      put(s.ball([0.36, 0.15, 0.85], [0, 0.15, 0], skin, 22));
      put(s.ball([0.3, 0.07, 0.75], [0, 0.07, 0], belly, 16));
      put(s.ball([0.24, 0.13, 0.36], [0, 0.17, 0.98], skin, 18));
      put(s.box([0.3, 0.1, 0.42], [0, 0.14, 1.34], skin));
      put(s.ball([0.16, 0.07, 0.1], [0, 0.15, 1.56], skin, 12));
      for (const sx of [-1, 1]) {
        put(s.ball([0.075, 0.085, 0.075], [sx * 0.13, 0.32, 0.96], white, 14));
        put(s.ball([0.035, 0.04, 0.03], [sx * 0.135, 0.335, 1.02], black, 8));
        put(s.ball([0.02, 0.015, 0.02], [sx * 0.07, 0.2, 1.54], black, 6));
        for (let i = 0; i < 6; i++) put(s.mesh(new THREE.ConeGeometry(0.018, 0.05, 5), white, [sx * 0.152, 0.085, 1.16 + i * 0.065])).rotation.x = Math.PI;
        for (const fz of [0.5, -0.45]) {
          const leg = put(s.ball([0.2, 0.07, 0.11], [sx * 0.42, 0.07, fz], skin, 12));
          leg.rotation.y = sx * 0.35;
        }
        put(s.ring(0.06, 0.014, [sx * 0.2, 0.28, 0.25], white, Math.PI)).rotation.y = Math.PI / 2;
      }
      const tailPath = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.15, -0.7), new THREE.Vector3(0.05, 0.15, -1.1), new THREE.Vector3(0.18, 0.2, -1.4), new THREE.Vector3(0.36, 0.3, -1.58)]);
      const tailGeometry = new THREE.TubeGeometry(tailPath, 20, 0.14, 10);
      // Taper the tail towards its tip.
      const pos = tailGeometry.attributes.position, centre = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        const u = Math.floor(i / 11) / 20;
        tailPath.getPointAt(Math.min(1, u), centre);
        const k = mix(1, 0.2, u);
        pos.setXYZ(i, centre.x + (pos.getX(i) - centre.x) * k, centre.y + (pos.getY(i) - centre.y) * k, centre.z + (pos.getZ(i) - centre.z) * k);
      }
      tailGeometry.computeVertexNormals();
      put(s.mesh(tailGeometry, skin));
      const dark = vinyl('#2a7d36');
      for (let i = 0; i < 9; i++) for (const sx of [-1, 1]) put(s.mesh(new THREE.ConeGeometry(0.045, 0.08, 4), dark, [sx * 0.1, 0.31 - Math.abs(i - 4) * 0.008, -0.6 + i * 0.16]));
      holder = [0, 0.3, -0.25];
    }

    // Glitter and confetti sealed inside the skin.
    if (a.finish === 'glitter' && a.type !== 'inner-tube') {
      const bits = 90;
      const confetti = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.016), new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.6, emissive: '#ffffff', emissiveIntensity: 0.25 }), bits);
      const m = new THREE.Matrix4(), tones = ['#ffe14a', '#ff4fa3', '#4ac7ff', '#ffffff', '#b47bff'];
      for (let i = 0; i < bits; i++) {
        const t = random() * Math.PI * 2, phi = random() * Math.PI * 2;
        const at = croc
          ? new THREE.Vector3(Math.cos(phi) * 0.36 * Math.sin(t * 0.5), 0.15 + Math.abs(Math.sin(phi)) * 0.15 * Math.sin(t * 0.5), Math.cos(t * 0.5) * 0.84)
          : new THREE.Vector3(Math.sin(t) * (R + Math.cos(phi) * T * 1.01), T + Math.sin(phi) * T * 1.01, Math.cos(t) * (R + Math.cos(phi) * T * 1.01));
        confetti.setMatrixAt(i, m.makeRotationY(random() * 3).setPosition(at));
        confetti.setColorAt(i, new THREE.Color(tones[i % tones.length]));
      }
      body.add(confetti);
    }

    // Cup holder and drink.
    const tipped = a.pose !== 'flat' && f >= 0.3;
    const cup = new THREE.Group();
    put(s.cylinder(0.062, 0.055, 0.03, holder, black, 16));
    if (a.drink) {
      const glass = new THREE.MeshStandardMaterial({ color: ['#ff8a1f', '#ff4f7b', '#7fd6e8', '#b6e04a'][Math.floor(random() * 4)], roughness: 0.15, emissive: '#402000', emissiveIntensity: 0.15 });
      const tumbler = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.15, 14), glass); tumbler.position.y = 0.075; tumbler.castShadow = true;
      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 6), new THREE.MeshStandardMaterial({ color: '#f4f1e8' })); straw.position.set(0.02, 0.15, 0); straw.rotation.z = -0.25;
      const brolly = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.035, 10), new THREE.MeshStandardMaterial({ color: '#ffd23f', side: THREE.DoubleSide })); brolly.position.set(-0.03, 0.2, 0.01); brolly.rotation.z = 0.3;
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.1, 5), new THREE.MeshStandardMaterial({ color: '#b98b54' })); stick.position.set(-0.025, 0.15, 0.01); stick.rotation.z = 0.3;
      const lime = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 12), new THREE.MeshStandardMaterial({ color: '#9bd13c' })); lime.position.set(0.045, 0.15, 0); lime.rotation.z = Math.PI / 2;
      cup.add(tumbler, straw, brolly, stick, lime);
    }

    // Story extras that ride on the float.
    const patchColour = a.type === 'inner-tube' ? '#c2452f' : '#e8e2d0';
    if (a.story === 'sunglasses') {
      const shades = new THREE.Group();
      const lens = new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.1, metalness: 0.4 });
      const rim = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#ffd23f' : '#d8322c', roughness: 0.4 });
      for (const sx of [-1, 1]) {
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.012, 16), lens); l.rotation.x = Math.PI / 2; l.position.x = sx * 0.065; l.castShadow = true;
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.01, 6, 18), rim); r.position.x = sx * 0.065;
        const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.16), rim); armMesh.position.set(sx * 0.12, 0.01, -0.08);
        shades.add(l, r, armMesh);
      }
      if (a.type === 'flamingo' || a.type === 'swan') {
        // On the bird's face; follows the neck when it droops.
        const neck = body.children.find((child) => (child as THREE.Group).isGroup) as THREE.Group;
        const y = a.type === 'swan' ? 0.98 : 0.9, z = a.type === 'swan' ? 0.16 : 0.2;
        shades.position.set(0, y + 0.045, z + 0.125); shades.scale.setScalar(0.95); shades.rotation.x = 0.15;
        neck.add(shades);
      } else if (croc) { shades.position.set(0, 0.36, 1.05); shades.scale.setScalar(1.35); shades.rotation.x = -0.2; body.add(shades); }
      else { shades.position.set(-Math.sin(0.7) * R, T * 2 + 0.035, Math.cos(0.7) * R); shades.rotation.set(-Math.PI / 2 + 0.2, 0, 0.6); body.add(shades); }
    } else if (a.story === 'patch') {
      const tape = s.material(patchColour, { roughness: 0.9 });
      if (croc) { put(s.box([0.16, 0.012, 0.16], [0.12, 0.292, 0.3], tape)).rotation.y = 0.5; put(s.box([0.3, 0.012, 0.06], [-0.14, 0.275, -0.2], s.material('#8d9396'))).rotation.y = -0.4; }
      else {
        for (let i = 0; i < 3; i++) {
          const t = -1.8 - i * 0.55 - random() * 0.2;
          const patch = put(s.cylinder(0.07 + random() * 0.03, 0.07, 0.01, [Math.sin(t) * (R + 0.02), T * 2 - 0.004, Math.cos(t) * (R + 0.02)], i === 1 ? s.material('#8d9396', { roughness: 0.6 }) : tape, i === 1 ? 4 : 14));
          patch.rotation.y = random() * 3;
        }
      }
    }

    // Pose and squash.
    body.scale.set(spread, squash, spread);
    if (a.drink && !tipped) { cup.position.set(holder[0] * spread, holder[1] * squash, holder[2] * spread); rig.add(cup); }
    if (tipped) {
      if (a.pose === 'on-edge') {
        body.rotation.z = croc ? Math.PI / 2 - 0.12 : Math.PI / 2 - 0.16;
        body.rotation.y = (random() - 0.5) * 0.5;
      } else {
        body.rotation.x = croc ? -0.2 : -0.4;
        const tints = ['#ffd23f', '#2f9be0', '#ff5a36', '#f4f1e8'];
        const start = Math.floor(random() * 4);
        for (let i = 0; i < 2; i++) {
          const spare = s.mesh(new THREE.TorusGeometry(0.3, 0.1, 12, 32), new THREE.MeshStandardMaterial({ color: tints[(start + i) % 4], roughness: 0.3 }), [(random() - 0.5) * 0.08, 0.1 + i * 0.19, -0.3 + (random() - 0.5) * 0.08]);
          spare.rotation.x = Math.PI / 2;
        }
      }
    }
    // Drop the posed body onto the ground.
    rig.updateMatrixWorld(true);
    const low = new THREE.Box3().setFromObject(body).min.y;
    body.position.y -= low;
    if (a.drink && tipped) {
      // The drink has gone over.
      cup.rotation.z = Math.PI / 2 - 0.05; cup.position.set(croc ? 0.6 : R + 0.6, 0.05, 0.45); cup.rotation.y = random() * 3;
      s.root.add(cup);
      const spill = s.cylinder(1, 1, 0.004, [cup.position.x + 0.2, 0.002, 0.42], new THREE.MeshStandardMaterial({ color: (cup.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material.color, transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.1 }), 18);
      spill.scale.set(0.24, 1, 0.16); spill.castShadow = false;
    }

    // Wrinkled skirt of slack vinyl when it has gone down.
    if (f < 0.45 && !tipped) {
      const slack = vinyl(base, { roughness: 0.75 });
      const reach = croc ? 0.6 : R + T;
      for (let i = 0; i < 7; i++) {
        const t = random() * Math.PI * 2;
        const fold = s.ball([0.16 + random() * 0.12, 0.012 + random() * 0.015, 0.07], [Math.sin(t) * reach * (0.9 + random() * 0.25), 0.012, Math.cos(t) * reach * (croc ? 1.6 : 1) * (0.9 + random() * 0.25)], slack, 10);
        fold.rotation.y = t + Math.PI / 2 + (random() - 0.5);
      }
    }

    // Story extras that stand on the ground.
    const edge = (croc ? 0.6 : R + T) + 0.3;
    if (a.story === 'pump') {
      const plastic = s.material(mood.cheer > 0.5 ? '#ffb11f' : '#3a6fb5', { roughness: 0.5 });
      const px = -edge - 0.15, pz = 0.3;
      s.box([0.24, 0.03, 0.3], [px, 0.015, pz], black);
      const bellows = s.cylinder(0.1, 0.11, 0.12, [px, 0.09, pz], plastic, 16);
      for (let i = 0; i < 4; i++) s.ring(0.108, 0.01, [px, 0.045 + i * 0.03, pz], black).rotation.x = Math.PI / 2;
      void bellows;
      s.box([0.22, 0.02, 0.28], [px, 0.165, pz], plastic).rotation.x = -0.12;
      s.tube([[px + 0.11, 0.05, pz], [px + 0.3, 0.02, pz + 0.25], [px + 0.5, 0.03, pz - 0.1], [-(croc ? 0.3 : R + T * 0.6) * spread, Math.max(0.04, T * 1.2 * squash), -0.18]], 0.012, black);
    } else if (a.story === 'tether') {
      const rope = s.material('#d9c79a', { roughness: 0.95 });
      const px = edge + 0.55, pz = -0.3 + random() * 0.6;
      s.cylinder(0.02, 0.012, 0.3, [px, 0.1, pz], s.material('#8d6b45'), 8).rotation.z = -0.3;
      s.tube([[(croc ? 0.3 : R + T * 0.8) * spread, Math.max(0.05, T * squash), 0], [edge + 0.1, 0.02, pz * 0.4 + 0.15], [edge + 0.35, 0.02, pz - 0.1], [px - 0.03, 0.16, pz]], 0.011, rope);
      s.ring(0.03, 0.01, [px - 0.03, 0.16, pz], rope);
    }

    const sway = mix(0.004, 0.07, mood.energy) * mix(0.25, 1, f);
    const phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        rig.rotation.z = Math.sin(time * 1.7 + phase) * sway;
        rig.rotation.x = Math.sin(time * 1.3 + phase * 2) * sway * 0.7;
        rig.position.y = (1 + Math.sin(time * 2.1 + phase)) * sway * 0.25;
      },
    });
  },
});
