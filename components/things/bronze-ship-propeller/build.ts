import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

export default defineThing({
  questions: {
    blades: choice('How many blades does it have?', {
      three: 'Three broad blades, from a tug or a trawler.',
      four: 'Four blades, the ordinary cargo-ship wheel.',
      five: 'Five long swept blades, from a fast container ship.',
      six: 'Six narrow scimitar blades, something naval or expensive.',
    }),
    size: score('How big is it?', ['Chest high, from a coaster', 'Taller than a person', 'Twice a person, from an ocean ship', 'As tall as a house']),
    pose: choice('How is it resting?', {
      propped: 'Stood upright on two blade tips, leaning back on a timber frame like a monument.',
      flat: 'Lying flat on timber baulks, boss cap pointing at the sky.',
      sunk: 'Tipped over and half sunk in the ground where it was dropped.',
    }),
    surface: score('How much metal sheen shows through the fouling?', [
      'Ground bright: golden bronze, ready for the smelter',
      'Dull brown bronze with bright scrapes',
      'Green and grey with verdigris, a few barnacles',
      'Crusted solid with barnacles and weed',
    ]),
    damage: choice('Is it whole?', {
      intact: 'Whole and perfect, every blade sound.',
      cut: 'One blade has been torch-cut off and lies beside it.',
      bent: 'The tips are curled and chewed from the last grounding.',
      butchered: 'Only the hub and two blades are left; the rest are stumps.',
    }),
    chalk: choice('What is chalked on the upper blade?', {
      weight: 'Its weight in tonnes, underlined twice.',
      price: 'A price per kilo and a total, in a careful hand.',
      sold: 'SOLD, and a dealer\'s initials.',
      name: 'The name of the ship it came from.',
      tally: 'Tally strokes and a cross: counted, not yet sold.',
      none: 'Nothing. Nobody has claimed it.',
    }),
    cap: choice('What is on the end of the hub?', {
      cone: 'The smooth boss cone, still bolted on.',
      bare: 'The cone is gone: a dark tapered bore with a keyway.',
      shaft: 'A stub of cut tail-shaft still jammed in the bore.',
    }),
    company: choice('Who is beside it?', {
      nobody: 'Nobody.',
      standing: 'A man standing with one hand on a blade, dwarfed.',
      sitting: 'Someone sitting on the timber in its shade.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const N = { three: 3, four: 4, five: 5, six: 6 }[a.blades];
    const D = mix(2.3, 7.5, a.size), R = D / 2, hubR = D * 0.095, hubL = D * 0.26;
    const pitch = D * mix(0.75, 1.05, random());
    const chordMax = ((Math.PI * 2) / N) * (N >= 5 ? 0.6 : 0.68);
    const skewAmount = { three: 0.1, four: 0.25, five: 0.55, six: 0.8 }[a.blades];
    const fouling = clamp01(a.surface * 0.85 + mood.wear * 0.2 - 0.05);

    const bronze = new THREE.Color('#f0b855').lerp(new THREE.Color('#a8733c'), clamp01(a.surface * 2));
    const crust = [new THREE.Color('#5f8f7e'), new THREE.Color('#6b6453'), new THREE.Color('#9aa08a')];
    const black = new THREE.Color('#1d1815');
    const phase = [random() * 6, random() * 6, random() * 6];
    const tint = (rho: number, t: number, blade: number) => {
      const n = 0.5 + 0.5 * Math.sin(rho * 7 + phase[0] + blade * 1.7) * Math.sin(t * 3.1 + phase[1] + blade) + (random() - 0.5) * 0.35;
      const f = clamp01(fouling * 1.9 - 0.45 + (n - 0.5) * 1.1 + rho * 0.15);
      return bronze.clone().lerp(crust[(blade + Math.floor(clamp01(n) * 2.99)) % 3], f);
    };

    const chalkCanvas = document.createElement('canvas');
    chalkCanvas.width = 512; chalkCanvas.height = 512;
    {
      const ctx = chalkCanvas.getContext('2d')!;
      ctx.fillStyle = '#b4b4b4';
      ctx.fillRect(0, 0, 512, 512);
      const lines: string[] = {
        weight: [`${(D ** 3 * 0.055).toFixed(1)} T`, '———'],
        price: ['₹ 410 /KG', `= ${(D ** 3 * 0.225).toFixed(1)} L`],
        sold: ['SOLD', ['R.K.', 'M.A.S', 'H & CO'][Math.floor(random() * 3)]],
        name: ['M.V.', ['STELLA', 'HARVEST', 'PROMISE'][Math.floor(random() * 3)]],
        tally: ['|||| ||', '✕'],
        none: [],
      }[a.chalk];
      ctx.fillStyle = ['#fbfbf4', '#f6e27a', '#f4b8c4'][Math.floor(random() * 3)];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lines.forEach((line, i) => {
        ctx.save();
        ctx.translate(128, 512 * (0.4 + i * 0.14));
        ctx.rotate((random() - 0.5) * 0.2);
        ctx.font = `bold ${Math.min(78, 400 / Math.max(3, line.length))}px sans-serif`;
        ctx.fillText(line, 0, 0, 210);
        ctx.restore();
      });
    }
    const chalk = new THREE.CanvasTexture(chalkCanvas);
    chalk.colorSpace = THREE.SRGBColorSpace;
    const metal = { roughness: mix(0.28, 0.9, fouling), metalness: mix(0.55, 0.15, fouling), vertexColors: true, side: THREE.DoubleSide } as const;
    const plain = new THREE.MeshStandardMaterial({ ...metal, color: '#b4b4b4' });
    const marked = new THREE.MeshStandardMaterial({ ...metal, map: chalk });

    const chord = (rho: number) => chordMax * (0.42 + 0.58 * Math.sin(Math.PI * Math.pow(rho, 0.8) * 0.62)) * Math.sqrt(1 - Math.pow(rho, 6));
    const surface = (rho: number, t: number, face: number, curl: number) => {
      const r = mix(hubR * 0.85, R, rho);
      const angle = -skewAmount * rho * rho + (t * chord(rho)) / 2;
      const thick = D * 0.034 * (1 - 0.82 * rho) * Math.sqrt(Math.max(0, 1 - t * t));
      const bend = curl * Math.pow(Math.max(0, rho - 0.72) / 0.28, 2) * D * 0.11;
      return new THREE.Vector3(r * Math.sin(angle), r * Math.cos(angle) - Math.abs(bend) * 0.5, (pitch / (Math.PI * 2)) * angle + (face * thick) / 2 + bend);
    };
    const bladeGeometry = (from: number, to: number, blade: number, curl: number, burntEnd: 'tip' | 'root' | null) => {
      const NR = 16, NT = 10, positions: number[] = [], colours: number[] = [], uvs: number[] = [], index: number[] = [];
      for (const face of [1, -1])
        for (let i = 0; i <= NR; i++)
          for (let j = 0; j <= NT; j++) {
            const rho = mix(from, to, i / NR), t = -1 + (2 * j) / NT;
            const p = surface(rho, t, face, curl);
            positions.push(p.x, p.y, p.z);
            const c = (burntEnd === 'tip' && i === NR) || (burntEnd === 'root' && i === 0) ? black : tint(rho, t, blade);
            colours.push(c.r, c.g, c.b);
            uvs.push(face > 0 ? 0.03 + (0.44 * j) / NT : 0.75, rho);
          }
      const row = NT + 1, side = (NR + 1) * row;
      for (let i = 0; i < NR; i++)
        for (let j = 0; j < NT; j++) {
          const p = i * row + j;
          index.push(p, p + 1, p + row, p + 1, p + row + 1, p + row);
          index.push(side + p, side + p + row, side + p + 1, side + p + 1, side + p + row, side + p + row + 1);
        }
      for (const i of [0, NR]) for (let j = 0; j < NT; j++) { const p = i * row + j; index.push(p, p + 1, side + p, p + 1, side + p + 1, side + p); }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      return geometry;
    };

    const wheel = new THREE.Group();
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = wheel) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const lost = a.damage === 'cut' ? [N > 3 ? 1 : 2] : a.damage === 'butchered' ? Array.from({ length: N - 2 }, (_u, i) => i + (N > 3 ? 2 : 1)).filter((i) => i < N) : [];
    const barnaclePoints: THREE.Matrix4[] = [];
    for (let blade = 0; blade < N; blade++) {
      const gone = lost.includes(blade);
      const curl = a.damage === 'bent' ? (random() - 0.35) * 1.6 : 0;
      const mesh = part(bladeGeometry(0, gone ? 0.2 + random() * 0.12 : 1, blade, curl, gone ? 'tip' : null), blade === 0 ? marked : plain);
      mesh.rotation.z = (-blade * Math.PI * 2) / N;
      if (gone) continue;
      const count = Math.floor(fouling * fouling * 70);
      for (let k = 0; k < count; k++) {
        const rho = 0.15 + random() * 0.8, t = (random() - 0.5) * 1.7, face = random() < 0.5 ? 1 : -1;
        const p = surface(rho, t, face, curl).applyAxisAngle(new THREE.Vector3(0, 0, 1), mesh.rotation.z);
        const size = D * (0.006 + random() * 0.012);
        barnaclePoints.push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(face * Math.PI / 2 + (random() - 0.5), 0, random())), new THREE.Vector3(size, size * 0.8, size)));
      }
    }
    if (barnaclePoints.length) {
      const barnacles = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1.2, 6), new THREE.MeshStandardMaterial({ color: '#d8d4c2', roughness: 0.95 }), barnaclePoints.length);
      barnaclePoints.forEach((matrix, i) => barnacles.setMatrixAt(i, matrix));
      barnacles.castShadow = true;
      wheel.add(barnacles);
    }
    // Hub: a barrel on the shaft axis (local z), cone cap aft.
    const hubProfile: [number, number][] = [[0.001, -hubL / 2], [hubR * 0.9, -hubL / 2], [hubR * 1.08, -hubL * 0.1], [hubR * 1.05, hubL * 0.3], [hubR * 0.92, hubL / 2], [0.001, hubL / 2]];
    const hubGeometry = new THREE.LatheGeometry(hubProfile.map(([x, y]) => new THREE.Vector2(x, y)), 28);
    const hubColours: number[] = [];
    for (let i = 0; i < hubGeometry.attributes.position.count; i++) { const c = tint(0.1, random() * 2 - 1, i % 3); hubColours.push(c.r, c.g, c.b); }
    hubGeometry.setAttribute('color', new THREE.Float32BufferAttribute(hubColours, 3));
    part(hubGeometry, plain).rotation.x = Math.PI / 2;
    const flat = (colour: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) => s.material(colour, extra);
    if (a.cap === 'cone') {
      const cone = part(new THREE.LatheGeometry([[hubR * 0.9, 0], [hubR * 0.82, hubL * 0.18], [hubR * 0.5, hubL * 0.42], [0.001, hubL * 0.55]].map(([x, y]) => new THREE.Vector2(x, y)), 24), flat(bronze, { metalness: 0.5, roughness: mix(0.3, 0.85, fouling) }));
      cone.rotation.x = Math.PI / 2;
      cone.position.z = hubL / 2;
      for (let i = 0; i < 8; i++) part(new THREE.CylinderGeometry(hubR * 0.07, hubR * 0.07, hubR * 0.1, 6), flat('#3a332c')).position.set(Math.cos(i * 0.785) * hubR * 0.72, Math.sin(i * 0.785) * hubR * 0.72, hubL / 2 + hubR * 0.14);
    } else {
      const bore = part(new THREE.CylinderGeometry(hubR * 0.5, hubR * 0.5, 0.02, 20), flat('#14110f'));
      bore.rotation.x = Math.PI / 2;
      bore.position.z = hubL / 2 + 0.012;
      part(new THREE.BoxGeometry(hubR * 0.16, hubR * 0.2, 0.03), flat('#14110f')).position.set(0, hubR * 0.55, hubL / 2 + 0.012);
      if (a.cap === 'shaft') {
        const shaft = part(new THREE.CylinderGeometry(hubR * 0.46, hubR * 0.48, hubL * 0.9, 18), flat('#6f6a66', { metalness: 0.5, roughness: 0.5 }));
        shaft.rotation.x = Math.PI / 2;
        shaft.position.z = -hubL * 0.9;
        const end = part(new THREE.CylinderGeometry(hubR * 0.47, hubR * 0.47, 0.03, 18), flat('#231d1a'));
        end.rotation.x = Math.PI / 2;
        end.position.z = -hubL * 1.36;
      }
    }

    // Pose, then stand it on its timber.
    const timber = s.material('#7a5a3c', { roughness: 0.95 });
    const baulk = D * 0.07 + 0.08;
    wheel.rotation.z = N % 2 === 0 ? Math.PI / N : 0;
    const posed = new THREE.Group();
    posed.add(wheel);
    s.root.add(posed);
    if (a.pose === 'propped') posed.rotation.x = -0.26 - random() * 0.1;
    else if (a.pose === 'flat') { posed.rotation.x = -Math.PI / 2; posed.rotation.y = random(); }
    else { posed.rotation.set(-1.05 - random() * 0.2, random() * 0.6, (random() - 0.5) * 0.5); }
    posed.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(posed);
    const sink = a.pose === 'sunk' ? D * 0.16 : 0;
    posed.position.y = (a.pose === 'sunk' ? 0 : baulk) - box.min.y - sink;
    if (a.pose === 'propped') {
      const zLow = (box.min.z + box.max.z) / 2 + R * 0.24;
      for (const dz of [-1, 1]) s.box([D * 0.95, baulk, baulk * 1.3], [0, baulk / 2, zLow + dz * baulk * 0.9 - R * 0.05], timber).rotation.y = (random() - 0.5) * 0.08;
      const hubY = posed.position.y, back = box.min.z - D * 0.22;
      for (const side of [-1, 1]) s.rod([side * D * 0.3, 0, back], [side * hubR * 0.6, hubY + hubR * 0.4, -hubL * 0.5], baulk * 0.45, timber);
      s.box([D * 0.75, baulk * 0.8, baulk * 0.8], [0, baulk * 0.4, back], timber);
    } else if (a.pose === 'flat') {
      for (const dx of [-1, 0, 1]) s.box([baulk * 1.3, baulk, D * (dx ? 0.7 : 0.95)], [dx * R * 0.55, baulk / 2, 0], timber).rotation.y = posed.rotation.y * 0.3 + (random() - 0.5) * 0.1;
    }
    if (a.damage === 'cut') {
      const off = part(bladeGeometry(0.3, 1, 1, 0, 'root'), plain, s.root);
      off.rotation.set(-Math.PI / 2 + 0.08, 0, 1.2 + random());
      off.position.set(R * 0.95, D * 0.05, R * 0.75);
    }
    // Chains or strops left from the lift.
    const chainMaterial = s.material('#3a3632', { metalness: 0.4 });
    if (a.pose !== 'sunk' && mood.density > 0.4) s.ring(hubR * 1.25, D * 0.008 + 0.012, [-R * 0.9, D * 0.012 + 0.012, R * 0.6], chainMaterial).rotation.x = Math.PI / 2;

    if (a.company !== 'nobody') {
      const sit = a.company === 'sitting';
      const x = a.pose === 'flat' ? R * 0.8 : -R * 0.62 - 0.35, z = a.pose === 'flat' ? R * 0.95 : R * 0.42 + 0.35;
      const y = sit ? 0.1 : 0;
      const skin = s.material('#7a5038'), cloth = s.material(['#3d6fa3', '#b8452f', '#e8e2d0', '#5a8f6b'][Math.floor(random() * 4)]);
      if (sit) { s.box([0.3, 0.2, 0.75], [x, y + 0.42, z + 0.3], s.material('#3b3f45')); s.box([0.9, y + 0.32, 0.4], [x, (y + 0.32) / 2, z], timber); }
      else s.box([0.3, 0.82, 0.22], [x, 0.41, z], s.material('#3b3f45'));
      const top = sit ? y + 0.5 : 0.82;
      s.box([0.42, 0.6, 0.25], [x, top + 0.3, z], cloth);
      s.ball([0.115, 0.13, 0.12], [x, top + 0.75, z], skin, 10);
      if (!sit) s.rod([x + 0.2, top + 0.52, z], [x + 0.62, top + 0.62, z - 0.2], 0.05, skin);
      if (mood.cheer < 0.6) s.cylinder(0.15, 0.17, 0.07, [x, top + 0.86, z], s.material('#e3c53a'), 10);
    }
    return s.finish({ footprint: R * 1.05 });
  },
});
