import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    source: choice('Where does the water come from?', {
      bamboo: 'A split bamboo pipe on a bamboo post, trickling steadily.',
      dragon: 'A bronze dragon coiled on the rim, water pouring from its jaws.',
      lotus: 'A carved stone lotus bud in the middle, water welling over its petals.',
      spouts: 'A row of small bamboo spouts along a rail, one for each visitor.',
      none: 'Nothing: the pipe is gone and the trough is fed only by rain.',
    }),
    shelter: choice('What shelters the trough?', {
      pavilion: 'A four-post open pavilion under a broad gabled roof.',
      lean: 'A modest two-post lean-to roof.',
      open: 'No roof at all; the basin stands under the sky.',
    }),
    roof: choice('If there is a roof, what covers it?', {
      copper: 'Copper sheet weathered to pale green.',
      bark: 'Thick dark cypress bark, soft-edged.',
      tile: 'Grey ceramic tiles with a ridge of round end-caps.',
      moss: 'Old thatch gone to moss and seedlings.',
    }),
    basin: choice('What is the basin cut from?', {
      trough: 'A long rectangular granite trough on two stone feet.',
      boulder: 'A natural boulder with a hollow worn into its top.',
      round: 'A round drum of stone like a great millstone, with a carved rim.',
      coin: 'A low round basin with a square water hole, shaped like an old coin.',
    }),
    water: choice('What state is the water in?', {
      clear: 'Clear, cold and brim-full, rippling where the stream falls.',
      flowers: 'Covered edge to edge with floating flower heads, arranged by the priests.',
      ice: 'Frozen over, the ladles stuck fast in white ice.',
      leaves: 'Low and dark with a raft of fallen leaves.',
      algae: 'Green and still, furred with algae.',
      dry: 'Dry. Dust and a few leaves in the bottom.',
    }),
    ladles: choice('How have the ladles been left?', {
      row: 'Laid neatly in a row, cups down, handles all one way.',
      scattered: 'Left anyhow by a crowd, one fallen on the ground.',
      single: 'A single ladle.',
      none: 'No ladles at all.',
    }),
    cloths: noul('Do printed cotton towels or a cloth notice hang from the beam or a rail beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const stoneTone = new THREE.Color('#a3a39b').lerp(new THREE.Color('#77806a'), mood.wear * 0.5);
    const stone = s.material(stoneTone, { roughness: 0.95 });
    const stoneDark = s.material(stoneTone.clone().multiplyScalar(0.72), { roughness: 0.95 });
    const wood = s.material(new THREE.Color('#6d4a31').lerp(new THREE.Color('#8a857a'), mood.wear * 0.55), { roughness: 0.85 });
    const bamboo = s.material(new THREE.Color('#b8b05e').lerp(new THREE.Color('#8f8a6a'), mood.wear * 0.6), { roughness: 0.6 });
    const bambooDark = s.material('#5d6b35', { roughness: 0.6 });
    const moss = s.material(new THREE.Color().setHSL(mix(0.3, 0.24, mood.warmth), 0.55, 0.15), { roughness: 1 });
    const bronze = s.material('#5d7f6c', { metalness: 0.6, roughness: 0.5 });

    // Paved pad with a pebble drain bed.
    const sheltered = a.shelter !== 'open';
    const padW = a.shelter === 'pavilion' ? 3.0 : 2.4, padD = a.shelter === 'pavilion' ? 2.3 : 1.7;
    s.box([padW, 0.12, padD], [0, 0.06, 0], stone);
    s.box([padW - 0.5, 0.03, padD - 0.5], [0, 0.125, 0], stoneDark);
    const pebbles: { at: P; size: number; color: THREE.Color }[] = [];
    for (let i = 0; i < 160; i++) pebbles.push({
      at: [(random() - 0.5) * (padW - 0.6), 0.14, (random() - 0.5) * (padD - 0.6)], size: 0.6 + random() * 0.9,
      color: new THREE.Color().setHSL(0.1, 0.05, 0.25 + random() * 0.4),
    });
    const pebble = new THREE.SphereGeometry(0.035, 6, 4);
    pebble.scale(1, 0.5, 1);
    s.scatter(pebble, new THREE.MeshStandardMaterial({ roughness: 0.6 }), pebbles).castShadow = false;

    // Basin.
    let top = 0.72, waterW = 1.24, waterD = 0.5, round = false, waterR = 0.36;
    if (a.basin === 'trough') {
      for (const x of [-0.5, 0.5]) s.box([0.26, 0.2, 0.72], [x, 0.24, 0], stoneDark);
      s.box([1.6, 0.1, 0.86], [0, 0.39, 0], stone);
      s.box([1.6, 0.3, 0.16], [0, 0.57, 0.35], stone);
      s.box([1.6, 0.3, 0.16], [0, 0.57, -0.35], stone);
      s.box([0.16, 0.3, 0.54], [-0.72, 0.57, 0], stone);
      s.box([0.16, 0.3, 0.54], [0.72, 0.57, 0], stone);
    } else if (a.basin === 'boulder') {
      round = true; waterR = 0.34; top = 0.74;
      const geometry = new THREE.SphereGeometry(1, 14, 10);
      const at = geometry.attributes.position, k = random() * 9;
      for (let i = 0; i < at.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(at, i);
        const bump = 1 + 0.12 * Math.sin(v.x * 3 + k) * Math.cos(v.z * 2.6 + k) + 0.07 * Math.sin(v.y * 5 + k);
        at.setXYZ(i, v.x * bump * 0.72, Math.min(v.y * bump, 0.62) * 0.5 + 0.43, v.z * bump * 0.6);
      }
      geometry.computeVertexNormals();
      s.mesh(geometry, stone);
      s.ring(waterR + 0.03, 0.04, [0, 0.74, 0], stone).rotation.x = Math.PI / 2;
      for (let i = 0; i < 6; i++) { const g = random() * 6.28; s.ball([0.12, 0.04, 0.1], [Math.sin(g) * 0.55, 0.5 + random() * 0.15, Math.cos(g) * 0.48], moss, 8); }
    } else if (a.basin === 'round') {
      round = true; waterR = 0.42; top = 0.74;
      s.lathe([[0, 0.14], [0.42, 0.14], [0.46, 0.2], [0.56, 0.3], [0.58, 0.66], [0.54, 0.74], [0.44, 0.74], [0.42, 0.62], [0, 0.62]], stone);
      for (let i = 0; i < 12; i++) { const g = i / 12 * Math.PI * 2; s.box([0.05, 0.3, 0.02], [Math.sin(g) * 0.575, 0.48, Math.cos(g) * 0.575], stoneDark).rotation.y = g; }
    } else {
      round = false; waterW = 0.34; waterD = 0.34; top = 0.46;
      s.lathe([[0, 0.14], [0.6, 0.14], [0.66, 0.24], [0.66, 0.4], [0.6, 0.46], [0, 0.46]], stone);
      for (const [x, z, w, d] of [[0, 0.27, 0.54, 0.1], [0, -0.27, 0.54, 0.1], [0.27, 0, 0.1, 0.54], [-0.27, 0, 0.1, 0.54]]) s.box([w, 0.05, d], [x, 0.475, z], stoneDark);
      for (let i = 0; i < 4; i++) { const g = i * Math.PI / 2 + Math.PI / 4; s.box([0.1, 0.012, 0.1], [Math.sin(g) * 0.46, 0.468, Math.cos(g) * 0.46], stoneDark); }
    }

    // Water surface and what is on it.
    const level = top - (a.water === 'leaves' ? 0.14 : a.water === 'dry' ? 0.2 : 0.035);
    const waterColour = { clear: '#8fc6cf', flowers: '#7fb7c4', ice: '#eef4f7', leaves: '#3d4a44', algae: '#5f8a3c', dry: '#6f6a5f' }[a.water];
    const water = new THREE.MeshStandardMaterial({
      color: waterColour, roughness: a.water === 'clear' || a.water === 'flowers' ? 0.08 : a.water === 'ice' ? 0.5 : 0.8, metalness: a.water === 'clear' ? 0.25 : 0,
    });
    const surface = round ? s.cylinder(waterR, waterR, 0.02, [0, level, 0], water, 28) : s.box([waterW, 0.02, waterD], [0, level, 0], water);
    surface.castShadow = false;
    const inWater = (): P => {
      if (round) { const g = random() * Math.PI * 2, r = Math.sqrt(random()) * waterR * 0.92; return [Math.sin(g) * r, level + 0.016, Math.cos(g) * r]; }
      return [(random() - 0.5) * waterW * 0.94, level + 0.016, (random() - 0.5) * waterD * 0.9];
    };
    if (a.water === 'flowers') {
      const palette = mood.cheer > 0.5 ? ['#f26a8d', '#ffd23f', '#ff8c42', '#f7f3e8', '#c86bd6', '#e63946'] : ['#f7f3e8', '#c9b6e4', '#7fa7d9', '#e8a0b4', '#9d7fc4'];
      const blooms: { at: P; size: number; color: THREE.Color }[] = [];
      const area = round ? Math.PI * waterR * waterR : waterW * waterD;
      const n = Math.round(area / 0.006 * mix(0.6, 1, mood.density));
      for (let i = 0; i < n; i++) blooms.push({ at: inWater(), size: 0.7 + random() * 0.7, color: new THREE.Color(palette[Math.floor(random() * palette.length)]) });
      const bloom = new THREE.SphereGeometry(0.045, 8, 5);
      bloom.scale(1, 0.45, 1);
      s.scatter(bloom, new THREE.MeshStandardMaterial({ roughness: 0.7 }), blooms);
    } else if (a.water === 'leaves' || a.water === 'dry') {
      const leaves: { at: P; size: number; color: THREE.Color }[] = [];
      const n = a.water === 'dry' ? 14 : 40;
      for (let i = 0; i < n; i++) leaves.push({ at: inWater(), size: 0.6 + random() * 0.8, color: new THREE.Color().setHSL(0.03 + random() * 0.1, 0.7, 0.3 + random() * 0.2) });
      const leaf = new THREE.CircleGeometry(0.04, 5);
      leaf.rotateX(-Math.PI / 2);
      s.scatter(leaf, new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }), leaves).castShadow = false;
    } else if (a.water === 'ice') {
      const crack = s.material('#b9cdd6', { roughness: 0.5 });
      for (let i = 0; i < 6; i++) { const p = inWater(), q = inWater(); s.rod([p[0], level + 0.012, p[2]], [q[0], level + 0.012, q[2]], 0.004, crack).castShadow = false; }
    }

    // Water source.
    const flowing = a.water !== 'ice' && a.water !== 'dry' && a.source !== 'none';
    const streamMaterial = new THREE.MeshStandardMaterial({ color: '#d6f1f5', emissive: '#9fd8e2', emissiveIntensity: 0.35, roughness: 0.1 });
    const streams: THREE.Mesh[] = [];
    const stream = (x: number, y: number, z: number, r = 0.012) => {
      if (!flowing) return;
      const fall = s.cylinder(r, r * 1.4, y - level, [x, (y + level) / 2, z], streamMaterial, 6);
      fall.castShadow = false;
      streams.push(fall);
      const ripple = s.ring(0.05, 0.006, [x, level + 0.012, z], streamMaterial);
      ripple.rotation.x = Math.PI / 2;
      ripple.castShadow = false;
    };
    const backZ = round ? -(waterR + 0.22) : a.basin === 'coin' ? -0.75 : -0.56;
    if (a.source === 'bamboo' || (a.source === 'none')) {
      const h = top + 0.5;
      s.cylinder(0.04, 0.045, h, [0.1, h / 2, backZ], bamboo, 10);
      for (let y = 0.3; y < h; y += 0.28) s.cylinder(0.047, 0.047, 0.015, [0.1, y, backZ], bambooDark, 10);
      if (a.source === 'bamboo') {
        s.rod([0.1, h - 0.1, backZ - 0.08], [0.02, top + 0.22, -0.02], 0.028, bamboo);
        s.rod([0.16, h - 0.16, backZ + 0.02], [0.04, h - 0.16, backZ + 0.02], 0.012, bambooDark);
        stream(0.02, top + 0.21, -0.01);
      }
    } else if (a.source === 'dragon') {
      const neck: P[] = [[0.5, top - 0.02, backZ + 0.18], [0.42, top + 0.3, backZ + 0.14], [0.2, top + 0.46, backZ + 0.2], [0.02, top + 0.36, backZ + 0.34], [0, top + 0.28, backZ + 0.46]];
      s.tube(neck, 0.055, bronze);
      const end = neck[neck.length - 1];
      const head = new THREE.Group();
      const part = (geometry: THREE.BufferGeometry, at: P, rot: P = [0, 0, 0]) => { const m = new THREE.Mesh(geometry, bronze); m.position.set(...at); m.rotation.set(...rot); m.castShadow = true; head.add(m); };
      part(new THREE.BoxGeometry(0.13, 0.09, 0.14), [0, 0.02, 0]);
      part(new THREE.BoxGeometry(0.1, 0.045, 0.16), [0, 0.03, 0.14]);
      part(new THREE.BoxGeometry(0.09, 0.03, 0.14), [0, -0.035, 0.12], [0.3, 0, 0]);
      for (const side of [-1, 1]) {
        part(new THREE.ConeGeometry(0.014, 0.16, 5), [side * 0.045, 0.11, -0.06], [-0.7, 0, side * -0.3]);
        part(new THREE.SphereGeometry(0.02, 8, 6), [side * 0.055, 0.07, 0.04]);
        part(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 4), [side * 0.1, 0.01, 0.22], [1.0, 0, side * -0.8]);
      }
      head.position.set(end[0], end[1], end[2]);
      head.rotation.x = 0.35;
      s.root.add(head);
      for (let i = 0; i < 5; i++) { const t = i / 5; const p = neck[1], q = neck[2]; s.mesh(new THREE.ConeGeometry(0.025, 0.07, 4), bronze, [mix(p[0], q[0], t), mix(p[1], q[1], t) + 0.07, mix(p[2], q[2], t)]); }
      stream(end[0], end[1] - 0.03, end[2] + 0.2, 0.016);
    } else if (a.source === 'lotus') {
      s.cylinder(0.05, 0.07, level - 0.1 + 0.16, [0, (level + 0.26) / 2, 0], stone, 10);
      s.lathe([[0, 0], [0.06, 0.01], [0.1, 0.07], [0.07, 0.14], [0, 0.19]], stone, [0, level + 0.08, 0]);
      for (let i = 0; i < 8; i++) { const g = i / 8 * Math.PI * 2; const petal = s.ball([0.05, 0.012, 0.085], [Math.sin(g) * 0.11, level + 0.1, Math.cos(g) * 0.11], stone, 8); petal.rotation.set(-0.5, g, 0, 'YXZ'); }
      if (flowing) { const dome = s.ball([0.05, 0.03, 0.05], [0, level + 0.275, 0], streamMaterial, 10); dome.castShadow = false; streams.push(dome); }
    } else if (a.source === 'spouts') {
      const span = round ? waterR * 1.4 : waterW;
      const y = top + 0.34;
      s.rod([-span / 2 - 0.2, y, backZ + 0.2], [span / 2 + 0.2, y, backZ + 0.2], 0.035, bamboo);
      for (const x of [-span / 2 - 0.16, span / 2 + 0.16]) s.cylinder(0.035, 0.04, y, [x, y / 2, backZ + 0.2], bamboo, 8);
      const n = round ? 3 : 5;
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * span / n;
        s.rod([x, y, backZ + 0.2], [x, y - 0.1, backZ + 0.4], 0.016, bambooDark);
        stream(x, y - 0.1, Math.max(backZ + 0.41, -waterD / 2 + 0.04), 0.008);
      }
    }

    // Ladles on a bamboo rest.
    if (a.ladles !== 'none') {
      const span = round ? waterR * 2 + 0.2 : waterW + 0.3;
      const restZ = round ? 0.12 : 0.1;
      const y = top + 0.02;
      for (const z of [restZ - 0.14, restZ + 0.14]) s.rod([-span / 2, y, z], [span / 2, y, z], 0.016, bamboo);
      const n = a.ladles === 'single' ? 1 : Math.max(2, Math.round((round ? 3 : 5) * mix(0.6, 1.3, mood.density)));
      const ladleWood = s.material('#e3c77a', { roughness: 0.6 });
      const ladle = (at: P, yaw: number, tilt = 0) => {
        const g = new THREE.Group();
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 6), ladleWood);
        handle.rotation.x = Math.PI / 2;
        handle.position.z = 0.22;
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.09, 12), ladleWood);
        cup.position.y = -0.02;
        const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.063, 0.063, 0.014, 12), bambooDark);
        lip.position.y = 0.03;
        g.add(handle, cup, lip);
        g.position.set(...at);
        g.rotation.set(tilt, yaw, 0, 'YXZ');
        g.traverse((node) => { node.castShadow = true; });
        s.root.add(g);
      };
      for (let i = 0; i < n; i++) {
        const x = n === 1 ? 0.2 : (i - (n - 1) / 2) * (span - 0.3) / Math.max(n - 1, 1);
        const messy = a.ladles === 'scattered';
        ladle([x + (messy ? (random() - 0.5) * 0.12 : 0), y + 0.045, restZ - 0.2], messy ? (random() - 0.5) * 1.1 : (random() - 0.5) * 0.06);
      }
      if (a.ladles === 'scattered') ladle([padW / 2 - 0.5, 0.2, padD / 2 - 0.5], 2.2, 0);
    }

    // Shelter.
    const roofHex = { copper: '#7fb09a', bark: '#3d2f26', tile: '#6c7278', moss: '#6b6a3f' }[a.roof];
    const roofing = s.material(roofHex, { roughness: a.roof === 'tile' ? 0.45 : 0.95 });
    const beams: [number, number][] = [];
    if (a.shelter === 'pavilion') {
      const px = 1.2, pz = 0.85, h = 2.5;
      for (const x of [-px, px]) for (const z of [-pz, pz]) {
        const post = s.box([0.13, h, 0.13], [x * 1.02, h / 2, z * 1.02], wood);
        post.rotation.z = -x * 0.025;
        s.box([0.22, 0.1, 0.22], [x * 1.04, 0.17, z * 1.04], stoneDark);
      }
      for (const z of [-pz, pz]) { s.box([px * 2 + 0.5, 0.12, 0.1], [0, h - 0.06, z], wood); s.box([px * 2 + 0.2, 0.08, 0.07], [0, h - 0.4, z], wood); }
      for (const x of [-px, px]) s.box([0.1, 0.12, pz * 2 + 0.5], [x, h + 0.04, 0], wood);
      beams.push([h - 0.4, pz]);
      const depth = 2.5, width = 3.3, rise = 0.7;
      const profile = new THREE.Shape();
      profile.moveTo(-depth / 2, 0); profile.quadraticCurveTo(-depth / 4.5, rise * 0.5, 0, rise); profile.quadraticCurveTo(depth / 4.5, rise * 0.5, depth / 2, 0);
      profile.lineTo(depth / 2, 0.09); profile.quadraticCurveTo(depth / 4.5, rise * 0.5 + 0.12, 0, rise + 0.14); profile.quadraticCurveTo(-depth / 4.5, rise * 0.5 + 0.12, -depth / 2, 0.09);
      profile.closePath();
      const geometry = new THREE.ExtrudeGeometry(profile, { depth: width, bevelEnabled: false, curveSegments: 8 });
      geometry.translate(0, 0, -width / 2);
      geometry.rotateY(Math.PI / 2);
      s.mesh(geometry, roofing, [0, h + 0.06, 0]);
      s.box([width + 0.1, 0.12, 0.16], [0, h + rise + 0.24, 0], a.roof === 'tile' ? roofing : wood);
      const gable = new THREE.Shape();
      gable.moveTo(-pz - 0.05, 0); gable.lineTo(pz + 0.05, 0); gable.lineTo(0, rise * 0.72); gable.closePath();
      for (const x of [-px, px]) { const g = new THREE.ShapeGeometry(gable); g.rotateY(Math.PI / 2); s.mesh(g, new THREE.MeshStandardMaterial({ color: '#e9e2d0', roughness: 0.9, side: THREE.DoubleSide }), [x, h + 0.1, 0]); }
      const ribbing = s.material(new THREE.Color(roofHex).multiplyScalar(0.72), { roughness: 0.9 });
      const ribs = 13;
      for (let i = 0; i <= ribs; i++) {
        const x = -width / 2 + 0.02 + i * (width - 0.04) / ribs;
        for (const side of [-1, 1]) s.tube([[x, h + rise + 0.2, 0], [x, h + rise * 0.5 + 0.17, side * depth / 4.5 * 0.82], [x, h + 0.17, side * depth / 2]], a.roof === 'tile' ? 0.04 : 0.025, ribbing);
      }
      if (a.roof === 'moss') for (let i = 0; i < 26; i++) { const z = (random() - 0.5) * depth * 0.9; s.ball([0.16 + random() * 0.12, 0.05, 0.14], [(random() - 0.5) * width * 0.9, h + 0.2 + rise * (1 - Math.abs(z) / (depth / 2)) ** 0.8, z], moss, 7); }
    } else if (a.shelter === 'lean') {
      const px = 1.05, h = 2.1, z = -0.72;
      for (const x of [-px, px]) { s.box([0.12, h, 0.12], [x, h / 2, z], wood); s.rod([x, h - 0.5, z], [x, h + 0.02, z + 0.7], 0.035, wood); }
      s.box([px * 2 + 0.4, 0.1, 0.1], [0, h, z], wood);
      s.box([px * 2 + 0.2, 0.07, 0.07], [0, h - 0.4, z], wood);
      beams.push([h - 0.4, z]);
      const panel = s.box([2.9, 0.08, 1.9], [0, h + 0.12, 0], roofing);
      panel.rotation.x = 0.3;
      for (let i = 0; i <= 11; i++) s.box([0.035, 0.035, 1.92], [-1.42 + i * 0.258, h + 0.17, 0], s.material(new THREE.Color(roofHex).multiplyScalar(0.72), { roughness: 0.9 })).rotation.x = 0.3;
      if (a.roof === 'moss') for (let i = 0; i < 16; i++) { const zz = (random() - 0.5) * 1.6; s.ball([0.14 + random() * 0.1, 0.045, 0.13], [(random() - 0.5) * 2.6, h + 0.18 - zz * 0.3, zz], moss, 7); }
    }

    if (a.cloths) {
      const hues = ['#274b8f', '#f3efe4', '#b83228', '#e9e2d0', '#2f6b54'];
      const hang = (x: number, y: number, z: number, hue: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = hue; ctx.fillRect(0, 0, 64, 128);
        ctx.strokeStyle = hue === '#f3efe4' || hue === '#e9e2d0' ? '#1f2d55' : '#f5f1e6';
        ctx.lineWidth = 5; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) {
          const cy = 26 + i * 36, u = 32 + (random() - 0.5) * 30, v = cy + (random() - 0.5) * 24;
          ctx.beginPath();
          if (random() < 0.5) { ctx.moveTo(14, v); ctx.lineTo(50, v); } else { ctx.moveTo(u, cy - 14); ctx.lineTo(u, cy + 14); }
          ctx.stroke();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const cloth = s.mesh(new THREE.PlaneGeometry(0.3, 0.62), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide }), [x, y - 0.33, z]);
        cloth.rotation.x = (random() - 0.5) * 0.12;
        return cloth;
      };
      if (beams.length) {
        const [y, z] = beams[0];
        const n = 3 + Math.floor(random() * 3);
        for (let i = 0; i < n; i++) hang((i - (n - 1) / 2) * 0.38, y - 0.03, a.shelter === 'lean' ? z + 0.045 : z + 0.04, hues[Math.floor(random() * hues.length)]);
      } else {
        const x = padW / 2 - 0.25;
        for (const z of [-0.45, 0.45]) s.cylinder(0.025, 0.03, 1.3, [x, 0.65, z], bamboo, 8);
        s.rod([x, 1.25, -0.5], [x, 1.25, 0.5], 0.018, bamboo);
        for (let i = 0; i < 2; i++) hang(x, 1.23, -0.2 + i * 0.4, hues[Math.floor(random() * hues.length)]).rotation.y = Math.PI / 2;
      }
    }

    if (mood.wear > 0.45 || !sheltered) {
      const n = Math.round(mood.wear * 10) + (sheltered ? 0 : 3);
      for (let i = 0; i < n; i++) s.ball([0.1 + random() * 0.1, 0.035, 0.09 + random() * 0.08], [(random() < 0.5 ? -1 : 1) * (padW / 2 - random() * 0.2), 0.13, (random() - 0.5) * padD], moss, 7);
    }

    const speed = mix(3, 14, mood.energy);
    const widths = streams.map((fall) => fall.scale.x);
    return s.finish({
      update: streams.length ? (_dt, time) => { for (const [i, fall] of streams.entries()) fall.scale.x = fall.scale.z = widths[i] * (1 + 0.25 * Math.sin(time * speed + i * 1.7)); } : undefined,
    });
  },
});
