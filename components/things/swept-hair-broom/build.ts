import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];

const HAIR = {
  onehead: 'All one colour: a single head of dark hair, one customer’s worth.',
  many: 'Many heads mixed together: black, brown, blond, ginger and grey in one drift.',
  grey: 'Silver and white, fine as ash: an old man’s hair.',
  curls: 'A child’s first curls: a small scatter of soft golden ringlets.',
  ponytail: 'A long ponytail cut off whole, still in its elastic, lying on the clippings.',
  dyed: 'Bleached and dyed ends: pink, blue and acid green.',
} as const;
const PALETTE: Record<keyof typeof HAIR, string[]> = {
  onehead: ['#1b1512', '#231a15', '#2c1f17'],
  many: ['#16110f', '#3a2618', '#6b4526', '#c9a35c', '#a8502a', '#8f8d88', '#d9d6cf', '#221a16'],
  grey: ['#b9b8b3', '#dedcd5', '#8f8e8a', '#f0eee8', '#a3a29d'],
  curls: ['#d9b062', '#c99a4a', '#e6c684', '#b8853a'],
  ponytail: ['#1b1512', '#2c1f17', '#3a2618', '#231a15'],
  dyed: ['#f04a9a', '#2f8fe8', '#8fe02a', '#f2e6b8', '#1b1512', '#f04a9a'],
};

export default defineThing({
  questions: {
    hair: choice('Whose hair is in the pile?', HAIR),
    size: score('How much hair is there?', ['A few wisps', 'One haircut’s worth', 'A busy Saturday’s drift']),
    progress: choice('How far has the sweeping got?', {
      ring: 'Not started: the hair lies where it fell, in a ring around the bare circle where the chair stood.',
      trail: 'Mid-sweep: a long streak dragged across the floor into a growing pile.',
      mound: 'Done: everything gathered into one neat mound.',
      panned: 'Half of the mound is already in the dustpan.',
    }),
    broom: choice('What kind of broom is it?', {
      push: 'A wide push broom with stiff red bristles and a long handle.',
      horsehair: 'An old wooden push broom with soft black horsehair.',
      corn: 'A flat yellow corn-straw broom stitched with red thread.',
      grass: 'A short soft grass broom bound at the handle, the kind used squatting.',
    }),
    resting: choice('Where is the broom?', {
      standing: 'Standing on its bristles at the edge of the pile, as if just let go.',
      dropped: 'Dropped flat on the floor, abandoned mid-job.',
      wall: 'Propped against a strip of wall and skirting board, the job left for later.',
    }),
    pan: choice('What is the dustpan?', {
      metal: 'A dented steel dustpan with a short handle.',
      plastic: 'A bright plastic dustpan with a rubber lip.',
      lobby: 'An upright lobby dustpan on a long handle.',
      paper: 'No dustpan, just a folded sheet of newspaper.',
    }),
    found: choice('What turned up among the clippings?', {
      nothing: 'Nothing.',
      coin: 'A couple of dropped coins.',
      lollipop: 'A lollipop stick and a bright sticker from the children’s jar.',
      elastics: 'Hair elastics and a snapped comb.',
      ticket: 'A crumpled lottery ticket.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const palette = PALETTE[a.hair];
    const small = a.hair === 'curls';
    const amount = (small ? 0.22 : 1) * mix(0.12, 1, a.size) * mix(0.8, 1.2, mood.density);
    const N = Math.round(mix(50, 720, amount));
    const R = mix(0.16, 0.42, Math.sqrt(amount)), H = mix(0.03, 0.2, amount);
    const pile: V3 = [0.06, 0, 0.08];

    // Tufts: flattened curls, every one with its own turn and tint.
    const curlGeo = new THREE.TorusGeometry(1, small ? 0.2 : 0.16, 4, 9, small ? 4.6 : 2.6).scale(1, 1, small ? 0.9 : 0.5);
    const tufts: { at: V3; size: number }[] = [];
    const heap = (centre: V3, count: number, radius: number, height: number) => {
      for (let i = 0; i < count; i++) {
        const t = random() * 6.283, r = radius * Math.pow(random(), 0.65);
        const h = height * Math.exp(-((r / radius) ** 2) * 2.2);
        tufts.push({ at: [centre[0] + Math.cos(t) * r, centre[1] + 0.006 + h * (0.8 + random() * 0.35), centre[2] + Math.sin(t) * r], size: mix(0.018, 0.042, random()) * (small ? 1.2 : 1) });
      }
      if (height > 0.02) {
        s.ball([radius * 0.6, height * 0.62, radius * 0.6], [centre[0], centre[1], centre[2]], s.material(new THREE.Color(palette[0]).multiplyScalar(0.7), { roughness: 1 }), 16);
      }
    };
    const strays = (count: number, reach: number) => {
      for (let i = 0; i < count; i++) {
        const t = random() * 6.283, r = R + random() * reach;
        tufts.push({ at: [pile[0] + Math.cos(t) * r, 0.004, pile[2] + Math.sin(t) * r], size: mix(0.008, 0.02, random()) });
      }
    };
    const panAt: V3 = [0.5 + R * 0.5, 0, 0.3];
    let inPan = 0;
    if (a.progress === 'ring') {
      for (let i = 0; i < N; i++) {
        const t = random() * 6.283, r = 0.36 + Math.abs(random() + random() - 1) * 0.42;
        tufts.push({ at: [pile[0] + Math.cos(t) * r, 0.004 + random() * 0.012, pile[2] + Math.sin(t) * r * 0.9], size: mix(0.016, 0.036, random()) });
      }
      // The clean disc and four bolt marks where the chair base was.
      s.cylinder(0.33, 0.33, 0.003, [pile[0], 0.0015, pile[2]], s.material('#d9d4c6', { roughness: 0.5 }), 40);
      for (let i = 0; i < 4; i++) s.cylinder(0.014, 0.014, 0.006, [pile[0] + Math.cos(i * 1.571 + 0.6) * 0.24, 0.003, pile[2] + Math.sin(i * 1.571 + 0.6) * 0.24], s.material('#6c6a66', { metalness: 0.6 }), 8);
    } else if (a.progress === 'trail') {
      heap(pile, Math.round(N * 0.55), R * 0.8, H * 0.7);
      const streak = Math.round(N * 0.45);
      for (let i = 0; i < streak; i++) {
        const u = Math.pow(random(), 1.4), w = (random() - 0.5) * mix(0.34, 0.08, u);
        tufts.push({ at: [pile[0] - R * 0.5 - u * 0.95, 0.004 + random() * 0.008, pile[2] - u * 0.25 + w], size: mix(0.014, 0.03, random()) });
      }
      strays(Math.round(N * 0.05), 0.2);
    } else if (a.progress === 'panned') {
      heap(pile, Math.round(N * 0.5), R * 0.75, H * 0.65);
      inPan = Math.round(N * 0.4);
      strays(Math.round(N * 0.1), 0.25);
    } else {
      heap(pile, Math.round(N * 0.92), R, H);
      strays(Math.round(N * 0.08), 0.22);
    }

    // The broom, built head-at-origin with bristles down and the handle raked back.
    const broom = new THREE.Group();
    const put = <T extends THREE.Object3D>(group: THREE.Group, mesh: T) => { group.add(mesh); return mesh; };
    const wood = s.material('#b98a52', { roughness: 0.6 });
    let rake = 0.96, length = 1.4;
    if (a.broom === 'push' || a.broom === 'horsehair') {
      const old = a.broom === 'horsehair';
      const block = old ? s.material('#8a5a30', { roughness: 0.7 }) : s.material('#2a2c30', { roughness: 0.5 });
      const bristle = s.material(old ? '#1c1a19' : '#c42a2a', { roughness: 1 });
      put(broom, s.box([0.6, 0.05, 0.075], [0, 0, 0], block));
      const brush = new THREE.BoxGeometry(0.6, 0.1, 0.07, 30, 1, 1);
      const p = brush.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) { p.setZ(i, p.getZ(i) * 1.45 + Math.sin(p.getX(i) * 90) * 0.006); p.setX(i, p.getX(i) * 1.04); p.setY(i, p.getY(i) - Math.abs(Math.sin(p.getX(i) * 140)) * 0.008); }
      brush.computeVertexNormals();
      put(broom, s.mesh(brush, bristle, [0, -0.075, 0]));
      for (let i = 0; i < 14; i++) put(broom, s.box([0.004, 0.09, 0.076], [-0.28 + i * 0.043, -0.078, 0], s.material(old ? '#35302c' : '#8f1c1c', { roughness: 1 })));
      put(broom, s.box([0.07, 0.05, 0.05], [0, 0.04, -0.02], s.material('#8a8d90', { metalness: 0.7, roughness: 0.4 })));
    } else if (a.broom === 'corn') {
      rake = Math.PI / 2; length = 1.1;
      const straw = s.material('#d9b24a', { roughness: 1 });
      const fan = new THREE.Shape();
      fan.moveTo(-0.045, 0.02); fan.lineTo(0.045, 0.02); fan.lineTo(0.17, -0.3); fan.lineTo(0.15, -0.36); fan.lineTo(-0.15, -0.36); fan.lineTo(-0.17, -0.3); fan.closePath();
      put(broom, s.mesh(new THREE.ExtrudeGeometry(fan, { depth: 0.045, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }), straw, [0, 0, -0.022]));
      for (const [y, w] of [[-0.06, 0.16], [-0.11, 0.2], [-0.16, 0.24]] as const) put(broom, s.box([w, 0.008, 0.075], [0, y, 0], s.material('#b3232a', { roughness: 0.9 })));
      for (let i = 0; i < 9; i++) put(broom, s.box([0.004, 0.16, 0.072], [-0.12 + i * 0.03, -0.27, 0], s.material('#b08a2e', { roughness: 1 }))).rotation.z = (i - 4) * -0.06;
      put(broom, s.cylinder(0.03, 0.045, 0.07, [0, 0.05, 0], straw, 12));
    } else {
      rake = Math.PI / 2; length = 0.34;
      const grass = s.material('#c9b071', { roughness: 1 });
      for (let i = 0; i < 26; i++) {
        const fx = (random() - 0.5) * 0.5, fz = (random() - 0.5) * 0.08;
        put(broom, s.rod([fx * 0.1, 0, fz * 0.3], [fx, -0.5 - random() * 0.08, fz], 0.012, grass, 0.003));
      }
      put(broom, s.cylinder(0.034, 0.04, 0.3, [0, 0.15, 0], grass, 12));
      for (const y of [0.03, 0.14, 0.26]) put(broom, s.cylinder(0.042, 0.042, 0.02, [0, y, 0], s.material(['#b3232a', '#2f6fc0', '#2f7a4a'][Math.floor(random() * 3)], { roughness: 0.8 }), 12));
    }
    if (a.broom !== 'grass') {
      const dir: V3 = [0, Math.sin(rake) * length, -Math.cos(rake) * length];
      put(broom, s.rod([0, 0.02, 0], dir, 0.016, wood, 0.014));
      put(broom, s.ball([0.018, 0.018, 0.018], dir, wood, 10));
      if (a.broom === 'push' || a.broom === 'horsehair') put(broom, s.rod([0.2, 0.02, 0], [0, Math.sin(rake) * 0.4, -Math.cos(rake) * 0.4], 0.005, s.material('#8a8d90', { metalness: 0.7 })));
    }
    const reach = a.broom === 'grass' ? 0.3 : length;
    const elevation = a.resting === 'standing' ? (a.broom === 'push' || a.broom === 'horsehair' ? rake : 1.1) : a.resting === 'wall' ? 1.33 : -0.05;
    broom.rotation.order = 'YXZ';
    broom.rotation.x = elevation - rake;
    const heading = a.resting === 'dropped' ? 0.5 + random() * 1.4 : a.resting === 'wall' ? 0 : 1.0 + random() * 0.5;
    broom.rotation.y = heading;
    const edge = (a.progress === 'ring' ? 0.82 : R) + 0.12;
    if (a.resting === 'wall') broom.position.set(-0.55 - random() * 0.2, 0, -0.42);
    else if (a.progress === 'trail') broom.position.set(pile[0] - R * 0.5 - 1.05, 0, pile[2] - 0.3), (broom.rotation.y = 1.25);
    else broom.position.set(pile[0] - Math.sin(heading) * edge * 0.9 - 0.12, 0, pile[2] - Math.cos(heading) * edge * 0.4 + (a.resting === 'dropped' ? 0.45 : -0.1));
    if (a.resting === 'dropped' && a.broom === 'corn') broom.rotation.z = Math.PI / 2;
    s.root.add(broom);
    broom.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(broom);
    broom.position.y -= box.min.y;
    if (a.resting === 'wall') {
      const topZ = broom.position.z - Math.cos(1.33) * reach - (a.broom === 'grass' ? 0.06 : 0.03);
      const wallTint = ['#d9d2c0', '#a9c4b4', '#e6c9a0', '#c9d3d9'][Math.floor(random() * 4)];
      s.box([1.5, 1.05, 0.08], [-0.15, 0.525, topZ - 0.04], s.material(wallTint, { roughness: 0.9 }));
      s.box([1.5, 0.12, 0.02], [-0.15, 0.06, topZ + 0.01], s.material('#5a4634', { roughness: 0.7 }));
      const socket = s.box([0.08, 0.12, 0.012], [0.42, 0.34, topZ + 0.006], s.material('#f1ede2', { roughness: 0.4 }));
      socket.castShadow = false;
      for (const dy of [-0.02, 0.02]) s.box([0.012, 0.018, 0.004], [0.42, 0.34 + dy, topZ + 0.013], s.material('#2a2a2a'));
    }

    // Dustpan.
    const steel = s.material('#9ea3a5', { metalness: 0.75, roughness: mix(0.3, 0.6, mood.wear) });
    const pan = new THREE.Group();
    const panFloor = 0.012;
    if (a.pan === 'metal' || a.pan === 'plastic') {
      const mat = a.pan === 'metal' ? steel : s.material(['#2f8fe8', '#e8463a', '#f2c230', '#2fb58a'][Math.floor(random() * 4)], { roughness: 0.4 });
      put(pan, s.box([0.3, 0.006, 0.24], [0, 0.006, 0], mat)).rotation.x = 0.04;
      for (const sx of [-1, 1]) put(pan, s.box([0.006, 0.05, 0.24], [sx * 0.15, 0.03, 0], mat));
      put(pan, s.box([0.3, 0.07, 0.006], [0, 0.04, -0.12], mat));
      put(pan, s.box([0.3, 0.006, 0.07], [0, 0.072, -0.088], mat));
      put(pan, s.rod([0, 0.045, -0.12], [0, 0.07, -0.3], 0.014, a.pan === 'metal' ? s.material('#2a2c30') : mat));
      if (a.pan === 'plastic') put(pan, s.box([0.31, 0.006, 0.02], [0, 0.004, 0.125], s.material('#1c1c1d', { roughness: 0.9 })));
    } else if (a.pan === 'lobby') {
      const mat = s.material('#2a2c30', { roughness: 0.5 });
      put(pan, s.box([0.3, 0.006, 0.26], [0, 0.006, 0], mat));
      for (const sx of [-1, 1]) put(pan, s.box([0.006, 0.16, 0.26], [sx * 0.15, 0.08, 0], mat));
      put(pan, s.box([0.3, 0.16, 0.006], [0, 0.08, -0.13], mat));
      put(pan, s.box([0.3, 0.006, 0.14], [0, 0.16, -0.06], mat));
      put(pan, s.rod([0, 0.16, -0.06], [0, 0.92, -0.1], 0.012, steel));
      put(pan, s.cylinder(0.018, 0.018, 0.11, [0, 0.95, -0.1], s.material('#1c1c1d'), 10));
    } else {
      const sheet = put(pan, s.label('NEWS', 0.34, 0.27, [0, 0.004, 0], '#3a3a3a', '#ddd6c2'));
      sheet.rotation.x = -Math.PI / 2;
      put(pan, s.box([0.34, 0.003, 0.27], [0, 0.0015, 0], s.material('#d5cdb8', { roughness: 1 })));
    }
    const panTurn = -0.9 + random() * 0.4;
    pan.position.set(...panAt);
    pan.rotation.y = panTurn;
    s.root.add(pan);
    for (let i = 0; i < inPan; i++) {
      const lx = (random() - 0.5) * 0.24, lz = (random() - 0.5) * 0.17 - 0.01;
      const cx = Math.cos(panTurn), sn = Math.sin(panTurn);
      tufts.push({ at: [panAt[0] + lx * cx + lz * sn, panFloor + random() * mix(0.01, 0.05, amount), panAt[2] - lx * sn + lz * cx], size: mix(0.012, 0.026, random()) });
    }

    // All the tufts in one instanced draw.
    const hairMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
    const mesh = new THREE.InstancedMesh(curlGeo, hairMat, tufts.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), tint = new THREE.Color();
    tufts.forEach((tuft, i) => {
      e.set(Math.PI / 2 + (random() - 0.5) * 0.9, random() * 6.283, (random() - 0.5) * 0.9);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(...tuft.at), q, new THREE.Vector3(tuft.size, tuft.size, tuft.size));
      mesh.setMatrixAt(i, m);
      tint.set(palette[Math.floor(random() * palette.length)]).offsetHSL(0, 0, (random() - 0.5) * 0.08);
      mesh.setColorAt(i, tint);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true;
    s.root.add(mesh);

    // Ponytail, laid across the top of whatever has been gathered.
    if (a.hair === 'ponytail') {
      const [tailA, tailB] = [['#b5562a', '#cf7a3a'], ['#d9b062', '#ecd08a'], ['#7a4a26', '#99633a'], ['#c9c7c0', '#e6e4dc']][Math.floor(random() * 4)];
      const tail = s.material(tailA, { roughness: 0.75 });
      const top = a.progress === 'ring' ? 0.012 : H * 0.75 + 0.02;
      const x0 = pile[0] - 0.26, z0 = pile[2] + 0.02 + (a.progress === 'ring' ? 0.5 : 0);
      const bend = (random() - 0.5) * 0.3;
      for (let i = 0; i < 6; i++) {
        const off = (i - 2.5) * 0.011, flare = (i - 2.5) * 0.028;
        s.tube([[x0, top + 0.02, z0 + off], [x0 + 0.18, top + 0.04, z0 + off + bend * 0.3], [x0 + 0.38, top + 0.02, z0 + bend + flare], [x0 + 0.56 + random() * 0.06, Math.max(0.012, top - H * 0.6), z0 + bend * 1.6 + flare * 2.4]], 0.019, i % 2 ? tail : s.material(tailB, { roughness: 0.75 }));
      }
      s.ring(0.036, 0.01, [x0 + 0.04, top + 0.025, z0], s.material(['#f04a9a', '#2f8fe8', '#f2c230'][Math.floor(random() * 3)])).rotation.y = Math.PI / 2;
      s.ball([0.04, 0.034, 0.04], [x0 - 0.01, top + 0.022, z0], tail, 10);
    }
    if (small) {
      // One curl kept back on a square of tissue.
      const at: V3 = [pile[0] + R + 0.2, 0, pile[2] + 0.28];
      s.box([0.14, 0.003, 0.14], [at[0], 0.0015, at[2]], s.material('#fbf9f2', { roughness: 1 })).rotation.y = 0.3;
      s.ring(0.028, 0.008, [at[0], 0.012, at[2]], s.material(palette[0], { roughness: 0.9 }), 5).rotation.x = Math.PI / 2;
      s.box([0.05, 0.004, 0.012], [at[0] + 0.03, 0.012, at[2]], s.material('#7fb4e8')).rotation.y = 0.6;
    }

    // Finds.
    const fx = pile[0] + (a.progress === 'ring' ? 0.5 : R * 0.7), fz = pile[2] + (a.progress === 'ring' ? 0.5 : R * 0.9) + 0.05;
    if (a.found === 'coin') {
      for (let i = 0; i < 3; i++) s.cylinder(0.014, 0.014, 0.003, [fx + (random() - 0.5) * 0.14, 0.002, fz + (random() - 0.5) * 0.1], s.material(i ? '#c9b46a' : '#b9bcbc', { metalness: 0.85, roughness: 0.3 }), 14);
    } else if (a.found === 'lollipop') {
      s.rod([fx - 0.05, 0.004, fz], [fx + 0.05, 0.004, fz + 0.04], 0.004, s.material('#f8f6ee'));
      s.ball([0.02, 0.02, 0.02], [fx + 0.055, 0.02, fz + 0.045], s.material('#e8463a', { roughness: 0.2 }), 12);
      s.cylinder(0.03, 0.03, 0.002, [fx - 0.02, 0.001, fz + 0.1], s.material('#f2c230', { roughness: 0.4 }), 5);
    } else if (a.found === 'elastics') {
      for (let i = 0; i < 4; i++) s.ring(0.016, 0.004, [fx + (random() - 0.5) * 0.16, 0.004, fz + (random() - 0.5) * 0.12], s.material(['#f04a9a', '#2f8fe8', '#1c1c1d', '#f2c230'][i])).rotation.x = Math.PI / 2;
      s.box([0.1, 0.005, 0.026], [fx + 0.02, 0.003, fz + 0.1], s.material('#1c1c1d')).rotation.y = 0.5;
      s.box([0.045, 0.005, 0.026], [fx + 0.12, 0.003, fz + 0.14], s.material('#1c1c1d')).rotation.y = -0.4;
    } else if (a.found === 'ticket') {
      const ticket = s.label('LOTTO', 0.1, 0.06, [fx, 0.012, fz], '#b3232a', '#f6e9a8');
      ticket.rotation.set(-Math.PI / 2 + 0.2, 0, random() * 2);
    }
    return s.finish();
  },
});
