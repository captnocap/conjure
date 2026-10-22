import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

/** A sheet settled over a lying figure: head at -x, feet at +x, resting on y = 0. */
function shroud(length: number, width: number, bulk: number, random: () => number) {
  const nu = 60, nv = 22, k = length / 1.78;
  // The body under the sheet as ellipsoid domes: [along, across, radius along, radius across, height].
  const turn = (random() - 0.5) * 0.06;
  const body: number[][] = [
    [0.13, turn, 0.115, 0.095, 0.21], [0.47, 0, 0.27, 0.2 * bulk, 0.2 * bulk], [0.78, 0, 0.24, 0.18 * bulk, 0.17 * bulk + 0.03 * random()],
    [1.2, 0.09, 0.46, 0.08, 0.13], [1.2, -0.09, 0.46, 0.08, 0.13], [1.67, 0.09 + turn, 0.055, 0.055, 0.25], [1.67, -0.09, 0.055, 0.055, 0.24],
    [0.62, 0.23 * bulk, 0.3, 0.05, 0.1], [0.62, -0.23 * bulk, 0.3, 0.05, 0.1],
  ];
  const at = (i: number, j: number) => i * (nv + 1) + j;
  const solid = new Float32Array((nu + 1) * (nv + 1));
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const x = (i / nu) * 1.78, z = ((j / nv) * 2 - 1) * (width / 2) / k;
      let h = 0;
      for (const [cx, cz, rx, rz, top] of body) h = Math.max(h, top * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2 - ((z - cz) / rz) ** 2)));
      solid[at(i, j)] = h;
    }
  // Cloth: relax a tent over the solid so the sheet spans the hollows instead of clinging.
  let cloth = Float32Array.from(solid);
  for (let pass = 0; pass < 7; pass++) {
    const next = new Float32Array(cloth.length);
    for (let i = 0; i <= nu; i++)
      for (let j = 0; j <= nv; j++) {
        const rim = i === 0 || j === 0 || i === nu || j === nv;
        const mean = rim ? 0 : (cloth[at(i - 1, j)] + cloth[at(i + 1, j)] + cloth[at(i, j - 1)] + cloth[at(i, j + 1)]) / 4;
        next[at(i, j)] = rim ? 0 : Math.max(solid[at(i, j)], mean);
      }
    cloth = next;
  }
  const positions: number[] = [], index: number[] = [];
  const phase = random() * 6;
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const t = i / nu, v = (j / nv) * 2 - 1;
      const rim = i === 0 || j === 0 || i === nu || j === nv;
      positions.push((t - 0.5) * length, cloth[at(i, j)] * k + (rim ? 0 : 0.012 + 0.004 * Math.sin(t * 23 + v * 7 + phase)), (v * width) / 2);
    }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = at(i, j), b = a + nv + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    style: choice('What kind of table is it?', {
      pedestal: 'A modern stainless top on one thick central pedestal with a wide foot.',
      downdraft: 'A ventilated stainless table on two pedestals with a slotted grid surface and a deep sink at the foot.',
      porcelain: 'A thick white porcelain top on black cast-iron legs, a pre-war hospital.',
      stone: 'A grooved marble slab on stone piers, an old anatomy theatre or a Victorian dead-house.',
      trestle: 'A thin steel top on tubular legs with castors, cheap and temporary, a field morgue.',
    }),
    load: choice('What is on the table right now?', {
      bare: 'Nothing. Scrubbed bare and dry, waiting.',
      wet: 'Nothing but water: just hosed down, puddles shining and running to the drain.',
      instruments: 'A tray of instruments laid out in a row: scalpels, scissors, forceps, a saw.',
      draped: 'A form lying under a white sheet from head to foot.',
      examination: 'A draped form with an instrument tray on a bridge stand across its legs, work about to begin.',
      evidence: 'A few small things only: paper evidence bags, a clipboard and a pair of folded gloves.',
    }),
    finish: choice('How is it lit and finished?', {
      clinical: 'Bright, pale and polished, a modern clean laboratory.',
      dull: 'Flat grey and matt from decades of scrubbing.',
      noir: 'Dark gunmetal with hard glints, a detective story at 3 a.m.',
    }),
    headrest: choice('What kind of headrest sits at the head end?', {
      block: 'A dark rubber block with a notch for the neck.',
      cradle: 'A curved steel cradle on a short post.',
      wood: 'A worn wooden block, the old way.',
      none: 'No headrest.',
    }),
    hose: choice('Where is the hose?', {
      coiled: 'Coiled neatly on a hook at the foot end.',
      trailing: 'Left trailing off the table and across the floor.',
      none: 'There is no hose.',
    }),
    sink: noul('Does the foot end have a sink with a tall gooseneck tap?'),
    beside: choice('What stands under or beside it?', {
      nothing: 'Nothing.',
      bucket: 'A steel bucket under the drain.',
      stool: 'A round steel stool, somebody sits with their work.',
      boots: 'A pair of white rubber boots left by the pedestal.',
      scale: 'A low step with a clipboard chart hanging from the table end.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const L = 2.1, W = 0.76, H = a.style === 'stone' ? 0.8 : 0.86;
    const tone = { clinical: ['#cfd6d7', 0.5, 0.25], dull: ['#a9afae', 0.3, 0.6], noir: ['#6d777c', 0.65, 0.3] } as const;
    const [steelColour, metal, rough] = tone[a.finish];
    const steel = s.material(steelColour, { metalness: metal, roughness: rough });
    const bright = s.material('#e6eaea', { metalness: 0.7, roughness: 0.2 });
    const dark = s.material('#1f2526', { roughness: 0.8 });
    const topPaint = a.style === 'porcelain' ? s.material(a.finish === 'noir' ? '#c9cdc6' : '#f1f1ea', { roughness: 0.25 })
      : a.style === 'stone' ? s.material(a.finish === 'noir' ? '#8f918c' : '#cfcdc4', { roughness: 0.55 }) : steel;
    const bed = a.style === 'porcelain' || a.style === 'stone' ? topPaint : s.material(new THREE.Color(steelColour).multiplyScalar(0.9), { metalness: metal, roughness: rough + 0.1 });
    const thick = a.style === 'porcelain' ? 0.1 : a.style === 'stone' ? 0.14 : 0.05;
    const top = H - thick / 2, surface = H - 0.035;

    // Top: a bed inside a raised rim, with a drain at the foot (+x) end.
    s.box([L, thick, W], [0, top - 0.02, 0], bed);
    for (const z of [-1, 1]) s.box([L, thick + 0.03, 0.045], [0, top, z * (W / 2 - 0.022)], topPaint);
    for (const x of [-1, 1]) s.box([0.045, thick + 0.03, W], [x * (L / 2 - 0.022), top, 0], topPaint);
    s.cylinder(0.04, 0.04, 0.006, [L / 2 - 0.16, surface + 0.004, 0], dark, 16);
    if (a.style === 'downdraft') for (let i = 0; i < 16; i++) s.box([0.012, 0.004, W - 0.2], [-L / 2 + 0.2 + i * 0.105, surface + 0.003, 0], dark);
    if (a.style === 'stone') {
      for (const z of [-0.2, 0.2]) s.box([L - 0.3, 0.004, 0.02], [0, surface + 0.003, z], dark);
      s.box([0.02, 0.004, 0.42], [L / 2 - 0.16, surface + 0.003, 0], dark);
    }

    // Understructure.
    if (a.style === 'pedestal') {
      s.box([0.42, H - thick - 0.06, 0.32], [0, (H - thick + 0.02) / 2, 0], steel);
      s.box([1.1, 0.06, 0.62], [0, 0.03, 0], steel);
      s.box([0.7, 0.05, 0.4], [0, H - thick - 0.045, 0], steel);
      s.cylinder(0.05, 0.05, 0.12, [0.29, 0.1, 0.2], dark, 12).rotation.z = Math.PI / 2;
    } else if (a.style === 'downdraft') {
      for (const x of [-0.6, 0.6]) {
        s.box([0.3, H - thick - 0.02, 0.5], [x, (H - thick) / 2, 0], steel);
        s.box([0.4, 0.05, 0.6], [x, 0.025, 0], steel);
      }
      s.box([0.9, 0.2, 0.3], [0, H - thick - 0.16, 0], steel);
      for (let i = 0; i < 6; i++) s.box([0.012, 0.14, 0.004], [-0.6 + (i - 2.5) * 0.04, 0.45, 0.252], dark);
    } else if (a.style === 'porcelain') {
      const iron = s.material('#22272a', { roughness: 0.6, metalness: 0.3 });
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.rod([x * 0.85, 0, z * 0.33], [x * 0.78, H - thick, z * 0.27], 0.04, iron, 0.028);
        s.cylinder(0.06, 0.07, 0.03, [x * 0.85, 0.015, z * 0.33], iron, 12);
      }
      for (const z of [-0.3, 0.3]) s.rod([-0.83, 0.25, z], [0.83, 0.25, z], 0.016, iron);
      for (const x of [-0.83, 0.83]) s.rod([x, 0.25, -0.3], [x, 0.25, 0.3], 0.016, iron);
      s.rod([L / 2 - 0.16, H - thick, 0], [L / 2 - 0.16, 0.3, 0], 0.03, iron);
    } else if (a.style === 'stone') {
      const stone = s.material('#b3b0a5', { roughness: 0.9 });
      for (const x of [-0.65, 0.65]) {
        s.box([0.3, H - thick - 0.1, 0.6], [x, (H - thick - 0.1) / 2 + 0.1, 0], stone);
        s.box([0.42, 0.1, 0.7], [x, 0.05, 0], stone);
      }
    } else {
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.rod([x * 0.92, 0.1, z * 0.3], [x * 0.92, H - thick, z * 0.3], 0.02, steel);
        s.cylinder(0.05, 0.05, 0.03, [x * 0.92, 0.05, z * 0.3], dark, 12).rotation.x = Math.PI / 2;
      }
      for (const z of [-0.3, 0.3]) s.rod([-0.92, 0.3, z], [0.92, 0.3, z], 0.012, steel);
      s.box([1.84, 0.015, 0.6], [0, 0.3, 0], steel);
    }

    // Headrest at the head (-x) end.
    const hx = -L / 2 + 0.22;
    if (a.headrest === 'block' || a.headrest === 'wood') {
      const paint = a.headrest === 'block' ? dark : s.material('#8a6540', { roughness: 0.8 });
      for (const z of [-0.085, 0.085]) s.box([0.13, 0.11, 0.07], [hx, surface + 0.055, z], paint);
      s.box([0.13, 0.05, 0.1], [hx, surface + 0.025, 0], paint);
    } else if (a.headrest === 'cradle') {
      s.cylinder(0.014, 0.014, 0.07, [hx, surface + 0.035, 0], bright, 8);
      const cradle = s.ring(0.09, 0.016, [hx, surface + 0.16, 0], bright, Math.PI);
      cradle.rotation.set(0, Math.PI / 2, Math.PI);
    }

    // What is on it.
    const paper = s.material('#c9a878', { roughness: 0.95 });
    const tray = (x: number, y: number, z: number) => {
      s.box([0.5, 0.012, 0.32], [x, y, z], bright);
      for (const side of [-1, 1]) s.box([0.5, 0.03, 0.01], [x, y + 0.012, z + side * 0.16], bright);
      for (const side of [-1, 1]) s.box([0.01, 0.03, 0.32], [x + side * 0.25, y + 0.012, z], bright);
      const cloth = s.box([0.44, 0.004, 0.27], [x, y + 0.009, z], s.material(mood.cheer < 0.35 ? '#5f8f86' : '#7fb3a6', { roughness: 0.95 }));
      cloth.castShadow = false;
      const n = 5 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) {
        const tx = x - 0.19 + (i * 0.38) / (n - 1), len = 0.14 + random() * 0.09;
        const tool = s.box([0.012, 0.008, len], [tx, y + 0.016, z + (random() - 0.5) * 0.03], bright);
        tool.rotation.y = (random() - 0.5) * 0.2 * (0.3 + mood.energy);
        if (i % 3 === 0) for (const side of [-1, 1]) s.ring(0.014, 0.004, [tx + side * 0.014, y + 0.016, tool.position.z + len / 2 + 0.01], bright).rotation.x = Math.PI / 2;
        if (i % 3 === 1) s.box([0.04, 0.006, len * 0.5], [tx, y + 0.017, tool.position.z - len * 0.2], steel);
      }
    };
    if (a.load === 'instruments') tray(mix(-0.3, 0.3, random()), surface + 0.012, 0);
    if (a.load === 'draped' || a.load === 'examination') {
      const sheet = s.mesh(shroud(1.82, W - 0.14, mix(0.85, 1.2, random()), random), new THREE.MeshStandardMaterial({ color: a.finish === 'noir' ? '#d9dcd8' : '#f4f4ef', roughness: 0.92, side: THREE.DoubleSide }), [0.03, surface + 0.002, 0]);
      sheet.castShadow = true;
      if (a.load === 'examination') {
        for (const z of [-1, 1]) s.rod([0.45, surface, z * (W / 2 - 0.03)], [0.45, surface + 0.33, z * (W / 2 - 0.03)], 0.012, bright);
        tray(0.45, surface + 0.335, 0);
      }
    }
    if (a.load === 'evidence') {
      for (let i = 0; i < 3; i++) {
        const bag = s.box([0.16, 0.2 + random() * 0.06, 0.07], [-0.5 + i * 0.26 + random() * 0.05, surface + 0.11, -0.1 + random() * 0.15], paper);
        bag.rotation.y = (random() - 0.5) * 0.6;
        s.box([0.165, 0.03, 0.075], [bag.position.x, surface + 0.2, bag.position.z], s.material('#b3261e')).rotation.y = bag.rotation.y;
      }
      const board = s.box([0.24, 0.012, 0.33], [0.45, surface + 0.008, 0.05], s.material('#6b4b2c'));
      board.rotation.y = 0.3;
      s.box([0.21, 0.004, 0.29], [0.45, surface + 0.016, 0.05], s.material('#f3f1e6')).rotation.y = 0.3;
      s.box([0.1, 0.025, 0.2], [0.78, surface + 0.014, -0.12], s.material('#8fc1d6', { roughness: 0.7 })).rotation.y = -0.4;
    }
    if (a.load === 'wet' || mood.wear > 0.75) {
      const water = new THREE.MeshStandardMaterial({ color: a.load === 'wet' ? '#bcd9e0' : '#7b5a44', transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2 });
      for (let i = 0; i < 7; i++) {
        const r = 0.05 + random() * 0.11;
        const pool = s.cylinder(r, r, 0.004, [-0.8 + random() * 1.6, surface + 0.004, (random() - 0.5) * (W - 0.3)], water, 18);
        pool.scale.x = 1 + random() * 1.4;
        pool.castShadow = false;
      }
      const run = s.box([0.9, 0.004, 0.03], [L / 2 - 0.6, surface + 0.004, 0], water);
      run.castShadow = false;
    }

    // Foot end: sink, hose and whatever stands nearby.
    const fx = L / 2;
    if (a.sink || a.style === 'downdraft') {
      s.box([0.36, 0.26, W * 0.8], [fx + 0.18, H - 0.13, 0], steel);
      s.box([0.28, 0.01, W * 0.8 - 0.08], [fx + 0.18, H + 0.002, 0], dark);
      s.tube([[fx + 0.3, H, -0.2], [fx + 0.3, H + 0.3, -0.2], [fx + 0.25, H + 0.38, -0.15], [fx + 0.18, H + 0.3, -0.08]], 0.014, bright);
      for (const z of [-0.28, -0.12]) s.box([0.05, 0.02, 0.014], [fx + 0.3, H + 0.03, z], bright);
    }
    const rubber = s.material(a.finish === 'noir' ? '#3a2a22' : '#3f6f5c', { roughness: 0.8 });
    const hoseX = fx + (a.sink || a.style === 'downdraft' ? 0.37 : 0.012);
    if (a.hose === 'coiled') {
      s.rod([hoseX - 0.01, H - 0.12, 0.18], [hoseX + 0.08, H - 0.12, 0.18], 0.012, bright);
      for (let i = 0; i < 4; i++) s.ring(0.13, 0.016, [hoseX + 0.025 + i * 0.016, H - 0.25, 0.18], rubber).rotation.y = Math.PI / 2;
      s.cylinder(0.012, 0.02, 0.09, [hoseX + 0.06, H - 0.42, 0.2], bright, 8);
    }
    if (a.hose === 'trailing') {
      const sway = random() - 0.5;
      s.tube([[fx - 0.35, surface + 0.02, 0.1], [fx - 0.1, surface + 0.03, 0.3], [fx - 0.05, H + 0.01, W / 2 + 0.02], [fx - 0.02, 0.45, W / 2 + 0.1], [fx + 0.1, 0.03, W / 2 + 0.3], [fx - 0.3 + sway * 0.4, 0.02, W / 2 + 0.55], [fx - 0.9, 0.02, W / 2 + 0.4 + sway * 0.2], [fx - 1.3, 0.02, W / 2 + 0.6]], 0.016, rubber);
      s.cylinder(0.012, 0.02, 0.09, [fx - 0.39, surface + 0.02, 0.07], bright, 8).rotation.z = Math.PI / 2;
    }
    if (a.beside === 'bucket') {
      s.lathe([[0.001, 0], [0.11, 0], [0.14, 0.26], [0.15, 0.26], [0.125, 0.012], [0.001, 0.012]], steel, [fx - 0.16, 0, 0.02]).material.side = THREE.DoubleSide;
      s.ring(0.14, 0.006, [fx - 0.16, 0.27, 0.02], bright, Math.PI).rotation.y = 0.5;
    }
    if (a.beside === 'stool') {
      const x = -0.3, z = W / 2 + 0.38;
      s.cylinder(0.17, 0.17, 0.05, [x, 0.52, z], dark, 20);
      s.cylinder(0.02, 0.02, 0.48, [x, 0.27, z], bright, 10);
      for (let i = 0; i < 5; i++) s.rod([x, 0.06, z], [x + Math.cos(i * 1.257) * 0.22, 0.03, z + Math.sin(i * 1.257) * 0.22], 0.014, bright);
      s.ring(0.13, 0.008, [x, 0.2, z], bright).rotation.x = Math.PI / 2;
    }
    if (a.beside === 'boots') {
      const white = s.material('#eceee8', { roughness: 0.5 });
      for (const x of [0.42, 0.6]) {
        const z = W / 2 + 0.22 + random() * 0.08;
        s.cylinder(0.07, 0.06, 0.36, [x, 0.2, z], white, 12);
        s.box([0.12, 0.08, 0.3], [x, 0.04, z + 0.09], white);
        s.cylinder(0.072, 0.072, 0.02, [x, 0.38, z], dark, 12);
      }
    }
    if (a.beside === 'scale') {
      s.box([0.5, 0.18, 0.34], [-L / 2 + 0.3, 0.09, W / 2 + 0.3], steel);
      s.box([0.012, 0.3, 0.22], [-L / 2 - 0.012, H - 0.22, 0], s.material('#6b4b2c'));
      s.box([0.004, 0.25, 0.18], [-L / 2 - 0.02, H - 0.23, 0], s.material('#f3f1e6'));
    }
    return s.finish();
  },
});
