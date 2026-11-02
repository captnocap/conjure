import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
const UP = new THREE.Vector3(0, 1, 0);

export default defineThing({
  questions: {
    state: choice('Where is the broom and what is it doing?', {
      propped: 'Propped against an old plank cottage door, waiting by the threshold.',
      lying: 'Dropped flat on the floor where somebody left it in a hurry.',
      hovering: 'Hovering level at hip height on its own, ready to mount, autumn leaves whirling up beneath it.',
      store: 'A modern plastic store broom with bright angled bristles propped by the door, as a joke.',
    }),
    bristles: choice('What is the brush made of?', {
      twig: 'A wild splaying bundle of grey-brown birch twigs.',
      straw: 'A tight golden bundle of straw, neat and full.',
      broomcorn: 'Flat sewn broomcorn, tan and orange, stitched in bands like a Shaker broom.',
    }),
    tied: choice('What is tied to the broom?', {
      nothing: 'Nothing: a bare broom.',
      ribbon: 'A long red ribbon knotted below the head, its tails trailing.',
      lantern: 'A small iron lantern hanging from the handle on a cord.',
      basket: 'A little wicker basket slung from the handle, the kind a cat could ride in.',
      charms: 'A string of charms: a bone, a bell, a few beads and feathers.',
    }),
    wood: choice('What is the handle made of?', {
      ash: 'Pale smooth ash, honey blond.',
      oak: 'Warm brown oak, polished by hands.',
      blackthorn: 'Near-black knobbly blackthorn.',
      hazel: 'A crooked hazel branch with its bark still on.',
      birch: 'Silvery white birch with dark marks.',
    }),
    gnarl: score('How gnarled is the handle?', ['Turned dead straight', 'A gentle bend', 'Knotted and crooked', 'Wildly twisted like an old root']),
    length: score('How long is the broom?', ['A short hand besom', 'A household broom', 'A tall witch\'s broom', 'A huge besom for a giantess']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const store = a.state === 'store';
    const L = mix(0.95, 1.9, a.length);
    const woodHex = { ash: '#c9b48a', oak: '#8a6038', blackthorn: '#2e2420', hazel: '#6b4a33', birch: '#ddd6c8' }[a.wood];
    const wood = s.material(store ? '#2f6fd8' : woodHex, { roughness: store ? 0.35 : 0.7 });
    const knotMat = s.material(new THREE.Color(woodHex).multiplyScalar(0.6), { roughness: 0.85 });
    const broom = new THREE.Group();
    const put = <T extends THREE.Object3D>(o: T) => { o.traverse((c) => { c.castShadow = c.receiveShadow = true; }); broom.add(o); return o; };

    // The bristle head, built along +y with its tips at y = 0.
    const head = store ? 0.3 : mix(0.32, 0.52, a.length);
    const neck = head * 0.85;
    if (store) {
      const plastic = s.material('#e8452a', { roughness: 0.5 });
      const block = put(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.07), s.material('#2f6fd8', { roughness: 0.35 })));
      block.position.set(0, 0.2, 0); block.rotation.z = 0.2;
      const fan = put(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.05), plastic));
      fan.position.set(0.01, 0.09, 0); fan.rotation.z = 0.2;
      for (let i = 0; i < 9; i++) {
        const tuft = put(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.05), s.material('#f2c230')));
        tuft.position.set(-0.13 + i * 0.033 + 0.0, 0.025 + i * 0.0066, 0); tuft.rotation.z = 0.2;
      }
    } else if (a.bristles === 'twig') {
      const n = 150;
      const twig = new THREE.CylinderGeometry(0.0025, 0.004, 1, 4).translate(0, -0.5, 0);
      const inst = new THREE.InstancedMesh(twig, s.material('#6f5f4f', { roughness: 0.9 }), n);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      const tint = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const t = random() * Math.PI * 2, r0 = Math.sqrt(random()) * 0.045, spread = mix(0.08, 0.17, random()) * mix(0.8, 1.3, mood.wear);
        const from = new THREE.Vector3(Math.cos(t) * r0, neck, Math.sin(t) * r0);
        const to = new THREE.Vector3(Math.cos(t) * (r0 + spread) + (random() - 0.5) * 0.04, mix(-0.02, 0.04, random()), Math.sin(t) * (r0 + spread) + (random() - 0.5) * 0.04);
        const dir = from.clone().sub(to);
        q.setFromUnitVectors(UP, dir.clone().normalize());
        m.compose(from, q, new THREE.Vector3(1, dir.length(), 1));
        inst.setMatrixAt(i, m);
        inst.setColorAt(i, tint.setHSL(0.07 + random() * 0.04, 0.2 + random() * 0.2, 0.2 + random() * 0.25));
      }
      put(inst);
    } else if (a.bristles === 'straw') {
      const straw = s.material('#d9b45a', { roughness: 0.85 });
      put(new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.1, 0.0], [0.12, 0.03], [0.1, neck * 0.5], [0.055, neck * 0.9], [0.045, neck + 0.03], [0.001, neck + 0.04]].map(([x, y]) => new THREE.Vector2(x, y)), 24), straw));
      const n = 70;
      const strand = new THREE.CylinderGeometry(0.003, 0.003, 1, 4).translate(0, -0.5, 0);
      const inst = new THREE.InstancedMesh(strand, s.material('#c8a040', { roughness: 0.9 }), n);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < n; i++) {
        const t = random() * Math.PI * 2;
        const from = new THREE.Vector3(Math.cos(t) * 0.06, neck * 0.7, Math.sin(t) * 0.06);
        const to = new THREE.Vector3(Math.cos(t) * (0.12 + random() * 0.03), -0.01 + random() * 0.03, Math.sin(t) * (0.12 + random() * 0.03));
        const dir = from.clone().sub(to);
        q.setFromUnitVectors(UP, dir.clone().normalize());
        m.compose(from, q, new THREE.Vector3(1, dir.length(), 1));
        inst.setMatrixAt(i, m);
      }
      put(inst);
    } else {
      const corn = s.material('#c9893e', { roughness: 0.8 });
      const shape = new THREE.Shape();
      shape.moveTo(-0.16, 0); shape.lineTo(0.16, 0); shape.quadraticCurveTo(0.15, neck * 0.5, 0.05, neck); shape.lineTo(-0.05, neck); shape.quadraticCurveTo(-0.15, neck * 0.5, -0.16, 0);
      const fan = put(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 }), corn));
      fan.position.z = -0.025;
      const thread = s.material('#8a2a22');
      for (const f of [0.55, 0.7, 0.85]) {
        const w = mix(0.3, 0.1, f);
        const band = put(new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.012, 0.075), thread));
        band.position.set(0, neck * f, 0);
      }
      for (let i = 0; i < 14; i++) {
        const fray = put(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.06, 0.04), s.material('#b07a35')));
        fray.position.set(-0.15 + i * 0.023, 0.01, 0); fray.rotation.z = (random() - 0.5) * 0.3;
      }
    }
    // Withy bindings at the neck.
    if (!store) {
      const withy = s.material('#7a6440', { roughness: 0.9 });
      const bands = a.bristles === 'broomcorn' ? 0 : 3;
      for (let i = 0; i < bands; i++) {
        const ring = put(new THREE.Mesh(new THREE.TorusGeometry(a.bristles === 'straw' ? 0.06 - i * 0.004 : 0.05, 0.009, 6, 20), withy));
        ring.position.y = neck * (0.62 + i * 0.13); ring.rotation.x = Math.PI / 2;
      }
    }

    // The staff, gnarled by a few sideways wanders and knots.
    const staffFrom = store ? 0.2 : neck * 0.5;
    const top = L;
    const wobble = store ? 0 : mix(0.004, 0.06, a.gnarl);
    const pts: THREE.Vector3[] = [];
    const segs = 7;
    for (let i = 0; i <= segs; i++) {
      const f = i / segs;
      const w = i === 0 ? 0 : wobble;
      pts.push(new THREE.Vector3((random() - 0.5) * 2 * w, mix(staffFrom, top, f), (random() - 0.5) * 2 * w));
    }
    if (!store && a.gnarl > 0.5) pts[segs].x += 0.05 * a.gnarl; // a crook at the top
    const staffCurve = new THREE.CatmullRomCurve3(pts);
    put(new THREE.Mesh(new THREE.TubeGeometry(staffCurve, 48, store ? 0.014 : mix(0.022, 0.032, a.length), 8), wood));
    put(new THREE.Mesh(new THREE.SphereGeometry(store ? 0.014 : 0.024, 10, 8), store ? s.material('#e8452a') : wood)).position.copy(pts[segs]);
    if (!store) {
      const knots = Math.round(mix(1, 7, a.gnarl));
      for (let i = 0; i < knots; i++) {
        const f = mix(0.35, 0.95, random());
        const at = staffCurve.getPoint(f);
        const knot = put(new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), knotMat));
        const t = random() * Math.PI * 2;
        knot.position.set(at.x + Math.cos(t) * 0.017, at.y, at.z + Math.sin(t) * 0.017);
        knot.scale.set(1, 1.6, 1);
      }
    }

    // What is tied to it.
    const along = (f: number) => staffCurve.getPoint(f);
    const hangFrom = along(a.state === 'hovering' ? 0.72 : 0.62);
    const extras: THREE.Object3D[] = [];
    if (a.tied === 'ribbon') {
      const red = s.material('#b81c2a', { roughness: 0.5, side: THREE.DoubleSide });
      const at = along(0.05);
      put(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 16), red)).position.copy(at).setY(at.y).add(new THREE.Vector3(0, 0, 0));
      broom.children[broom.children.length - 1].rotation.x = Math.PI / 2;
      for (const side of [-1, 1]) {
        const path = new THREE.CatmullRomCurve3([at.clone(), at.clone().add(new THREE.Vector3(side * 0.06, 0.12, 0.04)), at.clone().add(new THREE.Vector3(side * 0.03, 0.3, -0.02)), at.clone().add(new THREE.Vector3(side * 0.08, 0.42 + side * 0.05, 0.03))]);
        const tail = put(new THREE.Mesh(new THREE.TubeGeometry(path, 24, 0.008, 4), red));
        tail.scale.z = 1;
        extras.push(tail);
      }
    }
    // Hanging pieces are built in the broom's frame but must hang straight down in the world,
    // so they are placed after the broom is oriented.
    const hangers: { build: (g: THREE.Group) => void; at: THREE.Vector3; drop: number }[] = [];
    if (a.tied === 'lantern') hangers.push({
      at: hangFrom, drop: 0.14, build: (g) => {
        const iron = s.material('#1f1d1c', { metalness: 0.5, roughness: 0.5 });
        const flame = s.material('#ffcf6a', { emissive: '#ffa42a', emissiveIntensity: mix(0.6, 2.4, mood.energy * 0.5 + mood.daylight * 0.5) });
        const glass = new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#ffb040', emissiveIntensity: mix(0.6, 1.6, mood.energy * 0.5 + mood.daylight * 0.5), transparent: true, opacity: 0.55, depthWrite: false });
        const add = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = true; g.add(m); return m; };
        add(new THREE.CylinderGeometry(0.05, 0.055, 0.015, 8), iron, -0.22);
        add(new THREE.CylinderGeometry(0.045, 0.045, 0.11, 8, 1, true), glass, -0.16);
        add(new THREE.SphereGeometry(0.026, 8, 6), flame, -0.165).scale.y = 1.5;
        g.scale.setScalar(1.4);
        add(new THREE.ConeGeometry(0.06, 0.05, 8), iron, -0.08);
        for (let i = 0; i < 4; i++) { const bar = add(new THREE.BoxGeometry(0.006, 0.11, 0.006), iron, -0.16); bar.position.x = Math.cos(i * Math.PI / 2) * 0.047; bar.position.z = Math.sin(i * Math.PI / 2) * 0.047; }
        add(new THREE.TorusGeometry(0.018, 0.004, 6, 12), iron, -0.04);
        add(new THREE.CylinderGeometry(0.002, 0.002, 0.04, 4), s.material('#5a4a35'), -0.02);
      },
    });
    if (a.tied === 'basket') hangers.push({
      at: hangFrom, drop: 0.12, build: (g) => {
        const wicker = s.material('#a8803e', { roughness: 0.9, side: THREE.DoubleSide });
        const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0.001, -0.3], [0.1, -0.3], [0.13, -0.24], [0.14, -0.17], [0.135, -0.165]].map(([x, y]) => new THREE.Vector2(x, y)), 16), wicker);
        bowl.castShadow = true; g.add(bowl);
        for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.12 + i * 0.006, 0.006, 4, 20), wicker); r.position.y = -0.28 + i * 0.035; r.rotation.x = Math.PI / 2; g.add(r); }
        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.008, 6, 20, Math.PI), wicker);
        handle.position.y = -0.17; handle.scale.y = 1.15; g.add(handle);
      },
    });
    if (a.tied === 'charms') hangers.push({
      at: hangFrom, drop: 0, build: (g) => {
        const cord = s.material('#3a2a20');
        const items: [THREE.BufferGeometry, string, number][] = [
          [new THREE.SphereGeometry(0.02, 8, 6), '#d4a537', -0.12], [new THREE.CylinderGeometry(0.008, 0.008, 0.07, 6), '#e8dcc0', -0.1],
          [new THREE.ConeGeometry(0.015, 0.1, 5), '#2a2a30', -0.14], [new THREE.SphereGeometry(0.012, 8, 6), '#7a1f8a', -0.08],
        ];
        items.forEach(([geo, hex, y], i) => {
          const x = (i - 1.5) * 0.035;
          const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, -y, 4), cord); c.position.set(x, y / 2, 0); g.add(c);
          const m = new THREE.Mesh(geo, s.material(hex, { metalness: hex === '#d4a537' ? 0.7 : 0 })); m.position.set(x, y - 0.015, 0); m.castShadow = true; g.add(m);
        });
      },
    });
    void extras;

    // Orient the broom for its state.
    let doorZ = 0;
    if (a.state === 'propped' || store) {
      broom.rotation.x = -0.2;
      broom.rotation.y = 0.15;
      broom.position.set(0, 0, 0.12);
      doorZ = -0.12 - Math.sin(0.2) * L * 0.9;
    } else if (a.state === 'lying') {
      broom.rotation.set(0, 0.3, Math.PI / 2 + 0.03);
      broom.position.set(L / 2, 0.05, 0);
    } else {
      broom.rotation.set(0, 0, Math.PI / 2 - 0.06);
      broom.position.set(L / 2, 0.85, 0);
    }
    const rig = new THREE.Group();
    rig.add(broom);
    s.root.add(rig);
    broom.updateMatrixWorld(true);
    for (const h of hangers) {
      const g = new THREE.Group();
      h.build(g);
      const world = h.at.clone().applyMatrix4(broom.matrixWorld);
      g.position.copy(world);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, Math.max(0.02, h.drop), 4), s.material('#4a3a28'));
      cord.position.y = -h.drop / 2; g.add(cord);
      g.children.forEach((c) => { if (c !== cord) c.position.y -= h.drop; });
      g.traverse((c) => { c.castShadow = true; });
      rig.add(g);
      if (a.state === 'lying') {
        // Lying flat, the hanging piece has tipped onto the floor beside it.
        cord.visible = false;
        g.remove(cord);
        g.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(g);
        g.position.y -= box.min.y;
        g.position.z += 0.16;
      }
    }

    // A cottage door behind a propped broom.
    if (a.state === 'propped' || store) {
      const plank = s.material('#4a3424', { roughness: 0.85 });
      const frame = s.material('#33251a', { roughness: 0.9 });
      const iron = s.material('#1c1b1a', { metalness: 0.4, roughness: 0.6 });
      const w = 0.9, H = Math.max(1.95, L + 0.2);
      for (let i = 0; i < 5; i++) s.box([w / 5 - 0.006, H, 0.05], [-w / 2 + (i + 0.5) * w / 5 + 0.2, H / 2, doorZ - 0.05], plank);
      s.box([0.08, H + 0.08, 0.09], [-w / 2 + 0.2 - 0.04, (H + 0.08) / 2, doorZ - 0.06], frame);
      s.box([0.08, H + 0.08, 0.09], [w / 2 + 0.2 + 0.04, (H + 0.08) / 2, doorZ - 0.06], frame);
      s.box([w + 0.16, 0.09, 0.1], [0.2, H + 0.08, doorZ - 0.06], frame);
      for (const y of [0.3, H - 0.3]) s.box([w * 0.75, 0.05, 0.012], [0.2 - w * 0.12, y, doorZ - 0.02], iron);
      s.ring(0.045, 0.008, [w / 2 + 0.05, H * 0.5, doorZ - 0.015], iron);
      s.box([w + 0.3, 0.05, 0.3], [0.2, 0.025, doorZ + 0.05], s.material('#7a746c'));
      if (a.tied === 'basket') {
        /* the basket also hangs from the propped handle */
      }
    }
    // Leaves whirl up beneath a hovering broom.
    const whirl: THREE.InstancedMesh | null = a.state === 'hovering' ? (() => {
      const n = 46;
      const leaf = new THREE.CircleGeometry(0.035, 5);
      leaf.scale(1, 1.6, 1);
      const inst = new THREE.InstancedMesh(leaf, s.material('#c8641e', { side: THREE.DoubleSide, roughness: 0.8 }), n);
      const colours = ['#c8641e', '#a8341a', '#d8a030', '#7a4a22'];
      for (let i = 0; i < n; i++) inst.setColorAt(i, new THREE.Color(colours[i % 4]));
      inst.castShadow = true;
      s.root.add(inst);
      return inst;
    })() : null;
    const seeds = Array.from({ length: 46 }, (_u, i) => ({ f: i / 46, t: random() * Math.PI * 2, spin: random() * 6 }));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const setWhirl = (time: number) => {
      if (!whirl) return;
      seeds.forEach((sd, i) => {
        const y = sd.f * 0.78;
        const r = mix(0.38, 0.12, sd.f);
        const t = sd.t + sd.f * 9 + time * mix(0.3, 2.5, mood.energy);
        q.setFromEuler(e.set(sd.spin + time, sd.spin * 2, t));
        m.compose(new THREE.Vector3(Math.cos(t) * r, y + 0.01, Math.sin(t) * r), q, new THREE.Vector3(1, 1, 1));
        whirl.setMatrixAt(i, m);
      });
      whirl.instanceMatrix.needsUpdate = true;
    };
    setWhirl(0);
    if (a.state === 'hovering') {
      s.cylinder(0.35, 0.35, 0.004, [0, 0.002, 0], new THREE.MeshStandardMaterial({ color: '#000000', transparent: true, opacity: 0.18, depthWrite: false }), 24);
      for (let i = 0; i < 8; i++) {
        const t = random() * Math.PI * 2, r = random() * 0.45;
        s.mesh(new THREE.CircleGeometry(0.035, 5), s.material(['#c8641e', '#a8341a', '#d8a030'][i % 3], { side: THREE.DoubleSide }), [Math.cos(t) * r, 0.004, Math.sin(t) * r]).rotation.x = -Math.PI / 2;
      }
    }

    const baseY = rig.position.y;
    return s.finish({
      update: (_dt, time) => {
        setWhirl(time);
        if (a.state === 'hovering') rig.position.y = baseY + Math.sin(time * mix(0.8, 2.5, mood.energy)) * 0.03;
      },
    });
  },
});
