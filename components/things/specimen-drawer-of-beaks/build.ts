import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type P3, canvasTexture, taper } from './lib';

type Sort = 'finch' | 'bill' | 'raptor' | 'hummer' | 'wader';

export default defineThing({
  questions: {
    fills: choice('What fills the drawer?', {
      finches: 'Small brown and black finch skins in rows, their beaks graded from needle-fine to nutcracker-heavy.',
      bills: 'Big loose bills: toucan orange and yellow, hornbill ivory with a casque on top.',
      raptors: 'Hawk, eagle and owl heads, each a feathered knob with a dark hooked beak and yellow cere.',
      hummingbirds: 'Dozens of tiny hummingbird skins like jewels, needle bills all pointing the same way.',
      waders: 'Long-billed shore birds: down-curved curlew, upturned avocet, straight snipe, a spoonbill.',
      mixed: 'A jumble of everything, the drawer nobody has sorted.',
    }),
    order: score('How orderly is it?', ['Ruled rows, everything parallel', 'Mostly in rows, a few turned', 'Shuffled about', 'A disturbed heap pushed to one end']),
    tags: choice('What labels do the specimens carry?', {
      copperplate: 'Cream cards in faded brown copperplate handwriting.',
      typed: 'Crisp white typed labels.',
      red: 'Red-bordered TYPE labels: these are the name-bearing specimens.',
      mixed: 'A century of different labels, some specimens carrying two or three.',
      none: 'None. The tags are gone and with them what these birds were.',
    }),
    gap: noul('Is there one empty labelled space where an extinct species should be?'),
    tool: choice('What has been left lying on top?', {
      nothing: 'Nothing.',
      lens: 'A brass-rimmed hand lens.',
      tweezers: 'A pair of long steel tweezers.',
      calipers: 'Sliding brass calipers, half open.',
      pencil: 'A pencil and a slip of ruled paper with measurements.',
      mothballs: 'A scatter of white naphthalene balls.',
    }),
    cabinet: choice('What does the drawer slide out of?', {
      mahogany: 'A dark mahogany cabinet with brass card-holders and ring pulls.',
      steel: 'A grey enamelled steel museum unit with chrome handles.',
      chest: 'A battered wooden field chest with rope handles and stencilled lettering.',
    }),
    pulled: score('How far is the drawer pulled out?', ['A little over half out', 'Most of the way', 'Right out to the stops, sagging on its runners']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.82, D = 0.52, drawerH = 0.075, wall = 0.014;
    const style = a.cabinet;
    const carcass = s.material({ mahogany: '#4a2616', steel: '#8f979a', chest: '#7a6243' }[style], { roughness: style === 'steel' ? 0.4 : 0.55, metalness: style === 'steel' ? 0.4 : 0 });
    const front = s.material({ mahogany: '#5a2d1a', steel: '#a3abad', chest: '#8a7150' }[style], { roughness: style === 'steel' ? 0.35 : 0.5, metalness: style === 'steel' ? 0.4 : 0 });
    const metal = s.material(style === 'steel' ? '#d5d9da' : style === 'chest' ? '#4c4a46' : '#b9944a', { metalness: 0.85, roughness: 0.3 });
    const drawers = 3;
    const bodyH = drawers * (drawerH + 0.012) + 0.05, bodyD = D + 0.05, bodyW = W + 0.06;
    const openIndex = drawers - 1; // the top drawer is the one pulled out
    const out = mix(0.58, 0.95, a.pulled) * D;

    // Cabinet carcass, hollow enough at the top to read as a slot.
    s.box([bodyW, bodyH, bodyD], [0, bodyH / 2, -bodyD / 2], carcass);
    s.box([bodyW + 0.03, 0.02, bodyD + 0.02], [0, bodyH + 0.01, -bodyD / 2], carcass);
    if (style !== 'steel') s.box([bodyW + 0.03, 0.03, bodyD + 0.02], [0, 0.015, -bodyD / 2], carcass);
    const labelMap = canvasTexture(128, 48, (ctx, w, h) => {
      ctx.fillStyle = '#eee4c8'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#3a2c1c'; ctx.font = 'italic 20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(['Fringillidae', 'Aves 14', 'Rostra', 'Trochilidae'][Math.floor(random() * 4)], w / 2, h / 2);
    });
    const labelPaint = new THREE.MeshStandardMaterial({ map: labelMap, roughness: 0.9 });
    for (let i = 0; i < drawers; i++) {
      const y = 0.035 + i * (drawerH + 0.012) + drawerH / 2;
      const z = i === openIndex ? out : 0;
      s.box([W + 0.02, drawerH, 0.018], [0, y, z + 0.009], front);
      if (style === 'mahogany') {
        s.box([0.13, 0.04, 0.004], [0, y + 0.006, z + 0.02], metal);
        s.mesh(new THREE.PlaneGeometry(0.115, 0.03), labelPaint, [0, y + 0.006, z + 0.0225]);
        for (const x of [-1, 1]) s.ring(0.014, 0.003, [x * 0.26, y - 0.004, z + 0.022], metal);
      } else if (style === 'steel') {
        s.box([0.3, 0.012, 0.016], [0, y + 0.012, z + 0.026], metal);
        s.mesh(new THREE.PlaneGeometry(0.1, 0.026), labelPaint, [0.3, y, z + 0.0185]);
      } else {
        for (const x of [-1, 1]) s.tube([[x * 0.3 - 0.05, y, z + 0.018], [x * 0.3 - 0.03, y - 0.02, z + 0.04], [x * 0.3 + 0.03, y - 0.02, z + 0.04], [x * 0.3 + 0.05, y, z + 0.018]], 0.005, s.material('#b7a274', { roughness: 1 }));
        s.mesh(new THREE.PlaneGeometry(0.115, 0.03), labelPaint, [0, y + 0.004, z + 0.0185]);
      }
    }
    if (style === 'chest') {
      for (const x of [-1, 1]) { s.box([0.02, bodyH + 0.02, 0.02], [x * (bodyW / 2), bodyH / 2, 0.002], metal); s.box([0.02, 0.02, bodyD], [x * (bodyW / 2), bodyH + 0.012, -bodyD / 2], metal); }
    }

    // The open drawer: a tray with a cotton bed.
    const tray = new THREE.Group();
    const floorY = 0.035 + openIndex * (drawerH + 0.012) + 0.012;
    tray.position.set(0, floorY, out - D / 2);
    s.root.add(tray);
    const put = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = tray) => { parent.add(node); return node; };
    const inner = style === 'steel' ? s.material('#9aa2a4', { metalness: 0.4, roughness: 0.4 }) : s.material('#9c7a50', { roughness: 0.8 });
    put(s.box([W, 0.008, D], [0, -0.004, 0], inner));
    for (const x of [-1, 1]) put(s.box([wall, drawerH - 0.012, D], [x * (W / 2 - wall / 2), (drawerH - 0.012) / 2 - 0.008, 0], inner));
    put(s.box([W, drawerH - 0.012, wall], [0, (drawerH - 0.012) / 2 - 0.008, -D / 2 + wall / 2], inner));
    // Runners.
    for (const x of [-1, 1]) s.box([0.012, 0.012, out], [x * (W / 2 + 0.004), floorY + 0.01, out / 2 - 0.01], metal);
    const cottonMap = canvasTexture(256, 256, (ctx, w, h) => {
      const tone = new THREE.Color('#f3f0e6').lerp(new THREE.Color('#c9bc98'), mood.wear * 0.6);
      ctx.fillStyle = `#${tone.getHexString()}`; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { ctx.strokeStyle = `rgba(${random() > 0.5 ? '255,255,255' : '150,140,115'},${0.08 + random() * 0.14})`; const x = random() * w, y = random() * h; ctx.beginPath(); ctx.arc(x, y, 3 + random() * 9, random() * 6, random() * 6 + 2); ctx.stroke(); }
      for (let i = 0; i < mood.wear * 30; i++) { ctx.fillStyle = `rgba(110,85,45,${0.1 + random() * 0.2})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 4 + random() * 16, 3 + random() * 10, random() * 3, 0, 7); ctx.fill(); }
    });
    const bedY = 0.012;
    put(s.box([W - wall * 2 - 0.004, bedY, D - wall - 0.006], [0, bedY / 2, wall / 2 - 0.004], new THREE.MeshStandardMaterial({ map: cottonMap, roughness: 1 })));

    // ---- Specimen builders: each lies on the cotton with its beak toward −x ------------------
    const ball = new THREE.SphereGeometry(1, 12, 8);
    const eyePaint = s.material('#f6f3ea', { roughness: 1 });
    const dullness = mood.wear * 0.35;
    const paint = (hex: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color('#8d8576'), dullness), roughness: 0.8, ...extra });
    const blob = (parent: THREE.Object3D, size: P3, at: P3, material: THREE.Material) => { const mesh = new THREE.Mesh(ball, material); mesh.scale.set(...size); mesh.position.set(...at); mesh.castShadow = true; parent.add(mesh); return mesh; };
    const horn = paint('#2a2622', { roughness: 0.45 });
    const builders: Record<Sort, (t: number) => { node: THREE.Group; length: number; width: number }> = {
      finch(t) {
        const node = new THREE.Group();
        const r = 0.011 + t * 0.006;
        const feather = paint(['#5b4633', '#2c2724', '#6f6a45', '#7a5a3a'][Math.floor(random() * 4)]);
        blob(node, [0.03 + t * 0.008, r * 0.95, r * 1.15], [0.03, r, 0], feather);
        blob(node, [r, r, r], [-0.005, r, 0], feather);
        blob(node, [0.02, 0.004, 0.008], [0.068 + t * 0.008, r * 0.7, 0], feather);
        // The beak is the point: deep and heavy at one end of the series, a thin pick at the other.
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.0035 + t * 0.0075, 0.012 + t * 0.011, 8), t > 0.5 ? horn : paint('#b08a5a', { roughness: 0.45 }));
        beak.rotation.z = Math.PI / 2; beak.scale.z = 0.75;
        beak.position.set(-r - (0.012 + t * 0.011) / 2 + 0.004, r * 0.95, 0);
        beak.castShadow = true; node.add(beak);
        blob(node, [0.0025, 0.0025, 0.0025], [-0.007, r * 1.5, r * 0.75], eyePaint);
        return { node, length: 0.11, width: 0.034 };
      },
      bill(t) {
        const node = new THREE.Group();
        const hornbill = t > 0.55;
        const length = 0.15 + random() * 0.06, deep = 0.024 + random() * 0.008;
        const map = canvasTexture(32, 128, (ctx, w, h) => {
          const g = ctx.createLinearGradient(0, h, 0, 0);
          if (hornbill) { g.addColorStop(0, '#d6452a'); g.addColorStop(0.25, '#f0d27a'); g.addColorStop(1, '#f6ecc0'); }
          else { const hue = random(); g.addColorStop(0, '#1a1716'); g.addColorStop(0.08, '#1a1716'); g.addColorStop(0.12, hue > 0.5 ? '#f2c230' : '#9ad13a'); g.addColorStop(0.6, hue > 0.5 ? '#f08a1c' : '#f2c230'); g.addColorStop(0.86, '#d9361e'); g.addColorStop(1, '#1a1716'); }
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        });
        const material = new THREE.MeshStandardMaterial({ map, roughness: 0.4 });
        const upper = new THREE.Mesh(taper([[0, deep, 0], [-length * 0.4, deep * 1.1, 0.012], [-length * 0.8, deep * 0.8, 0.03], [-length, deep * 0.5, 0.05]], (v) => deep * (1 - v * 0.75), { segments: 20, sides: 10, flat: 0.6 }), material);
        upper.castShadow = true; node.add(upper);
        if (hornbill) {
          const casque = new THREE.Mesh(taper([[0.01, deep, -0.02], [-length * 0.3, deep * 1.2, -0.03], [-length * 0.62, deep, -0.012]], (v) => deep * 0.6 * Math.sin(Math.min(1, v + 0.2) * Math.PI) + 0.003, { segments: 12, sides: 8, flat: 0.7 }), paint('#e8b33c', { roughness: 0.4 }));
          casque.castShadow = true; node.add(casque);
        }
        blob(node, [deep * 1.1, deep, deep * 1.2], [deep * 0.7, deep, 0], paint('#17130f'));
        if (!hornbill) blob(node, [deep * 0.6, deep * 0.5, deep * 0.3], [deep * 0.5, deep * 1.3, deep * 0.9], paint('#f2f0e6'));
        return { node, length: length + deep * 2.4, width: 0.085 };
      },
      raptor(t) {
        const node = new THREE.Group();
        const r = 0.02 + t * 0.014;
        const owl = t < 0.3;
        const feather = paint(owl ? '#b59a72' : t > 0.75 ? '#efece2' : ['#5a4330', '#3b3029', '#7a5c3e'][Math.floor(random() * 3)]);
        blob(node, [r, r * 0.9, r * 1.05], [0, r * 0.9, 0], feather);
        blob(node, [r * 1.3, r * 0.75, r * 0.9], [r * 1.3, r * 0.75, 0], feather);
        blob(node, [r * 0.34, r * 0.3, r * 0.3], [-r * 0.85, r * 1.0, 0], paint('#e6b422', { roughness: 0.4 }));
        const hook = new THREE.Mesh(taper([[-r * 0.9, r * 1.0, 0], [-r * 1.5, r * 0.95, r * 0.25], [-r * 1.75, r * 0.7, r * 0.75], [-r * 1.45, r * 0.6, r * 1.15]], (v) => r * 0.3 * (1 - v * 0.9), { segments: 12, sides: 8 }), horn);
        hook.castShadow = true; node.add(hook);
        blob(node, [r * 0.16, r * 0.16, r * 0.16], [-r * 0.45, r * 1.55, r * 0.5], owl ? paint('#f0a020', { emissive: '#804000', emissiveIntensity: 0.3 }) : eyePaint);
        return { node, length: r * 5.6, width: r * 3 };
      },
      hummer() {
        const node = new THREE.Group();
        const hue = [0.33, 0.45, 0.55, 0.78, 0.92, 0.08][Math.floor(random() * 6)];
        const gem = new THREE.Color().setHSL(hue, 0.85, 0.42);
        const shine = new THREE.MeshStandardMaterial({ color: gem.clone().lerp(new THREE.Color('#8d8576'), dullness), roughness: 0.25, metalness: 0.55, emissive: gem, emissiveIntensity: mix(0.12, 0.4, mood.cheer) * (1 - dullness) });
        blob(node, [0.019, 0.0075, 0.0085], [0.014, 0.0075, 0], shine);
        blob(node, [0.007, 0.0068, 0.007], [-0.006, 0.0075, 0], shine);
        blob(node, [0.006, 0.004, 0.006], [-0.002, 0.006, 0.005], new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL((hue + 0.45) % 1, 0.9, 0.5), roughness: 0.2, metalness: 0.5, emissive: new THREE.Color().setHSL((hue + 0.45) % 1, 0.9, 0.3), emissiveIntensity: 0.4 }));
        const bill = new THREE.Mesh(new THREE.CylinderGeometry(0.0004, 0.0011, 0.022 + random() * 0.014, 5), horn);
        bill.rotation.z = Math.PI / 2 + (random() - 0.5) * 0.12;
        bill.position.set(-0.012 - bill.geometry.parameters.height / 2, 0.0075, 0);
        bill.castShadow = true; node.add(bill);
        return { node, length: 0.085, width: 0.022 };
      },
      wader(t) {
        const node = new THREE.Group();
        const r = 0.013;
        const feather = paint(['#8a7556', '#a59a86', '#e9e6dc', '#5a5046'][Math.floor(t * 3.99)]);
        blob(node, [0.045, r * 0.9, r * 1.3], [0.045, r, 0], feather);
        blob(node, [r, r, r], [-0.004, r, 0], feather);
        const length = 0.09 + random() * 0.06;
        const bend = t < 0.25 ? 0.035 : t < 0.5 ? -0.03 : 0; // curlew down-curve, avocet upturn, snipe straight
        const bill = new THREE.Mesh(taper([[-r * 0.8, r, 0], [-r - length * 0.5, r, bend * 0.25], [-r - length, r * 0.7, bend]], (v) => 0.0032 * (1 - v * 0.7), { segments: 14, sides: 6 }), horn);
        bill.castShadow = true; node.add(bill);
        if (t >= 0.75) blob(node, [0.012, 0.002, 0.009], [-r - length, r * 0.7, 0], horn); // spoonbill
        blob(node, [0.0025, 0.0025, 0.0025], [-0.006, r * 1.55, r * 0.7], eyePaint);
        return { node, length: 0.1 + length + 0.02, width: 0.04 };
      },
    };

    // ---- Lay them out ------------------------------------------------------------------------
    const plan: Record<typeof a.fills, { sorts: Sort[]; columns: number; rows: number }> = {
      finches: { sorts: ['finch'], columns: 5, rows: 6 }, bills: { sorts: ['bill'], columns: 3, rows: 3 }, raptors: { sorts: ['raptor'], columns: 4, rows: 3 },
      hummingbirds: { sorts: ['hummer'], columns: 6, rows: 7 }, waders: { sorts: ['wader'], columns: 3, rows: 5 }, mixed: { sorts: ['finch', 'bill', 'raptor', 'hummer', 'wader'], columns: 4, rows: 4 },
    };
    const { sorts, columns, rows } = plan[a.fills];
    const usableW = W - wall * 2 - 0.05, fullD = D - wall - 0.04;
    // Only the part of the tray that has cleared the cabinet is laid out, so nothing hides inside.
    const usableD = Math.min(fullD, out - 0.05), offsetZ = (fullD - usableD) / 2;
    const mess = a.order;
    const gapAt = a.gap ? Math.floor(random() * columns * rows * 0.6 + columns * rows * 0.2) : -1;
    const tagPoints: { at: P3; turn: number }[] = [];
    const fill = Math.round(columns * rows * mix(0.55, 1, mood.density));
    let gapSpot: P3 | null = null;
    for (let index = 0; index < columns * rows; index++) {
      const column = index % columns, row = Math.floor(index / columns);
      let x = (column + 0.5) / columns * usableW - usableW / 2, z = offsetZ + usableD / 2 - (row + 0.5) / rows * usableD;
      if (index === gapAt) { gapSpot = [x, bedY + 0.001, z]; continue; }
      if (index >= fill && index !== gapAt) continue;
      const t = sorts.length > 1 ? random() : (index + random() * 0.5) / (columns * rows);
      const sort = sorts[Math.floor(random() * sorts.length)];
      const made = builders[sort](sort === 'finch' ? (column * rows + row) / (columns * rows) : t);
      const fit = Math.min(1.4, (usableW / columns) * 0.94 / made.length, (usableD / rows) * 1.25 / made.width);
      // Disorder: slide, spin, and at the far end of the scale shove everything toward one corner.
      const shove = Math.max(0, mess - 0.6) / 0.4;
      x = mix(x, x * 0.45 + usableW * 0.22, shove) + (random() - 0.5) * mess * 0.07;
      z = mix(z, offsetZ + (z - offsetZ) * 0.5 + usableD * 0.1, shove) + (random() - 0.5) * mess * 0.06;
      made.node.scale.setScalar(fit * (sort === 'hummer' ? 1.25 : 1));
      made.node.position.set(x - made.length * fit * 0.2, bedY + shove * random() * 0.02, z);
      made.node.rotation.y = (random() - 0.5) * mess * mess * 4 + (mess > 0.3 && random() < mess * 0.4 ? Math.PI : 0);
      if (shove > 0.3) made.node.rotation.x = (random() - 0.5) * 0.5;
      tray.add(made.node);
      if (a.tags !== 'none' && (random() > mess * 0.35)) {
        tagPoints.push({ at: [x + made.length * fit * 0.42, bedY + 0.0025 + random() * 0.002, z + (usableD / rows) * 0.26], turn: (random() - 0.5) * (0.25 + mess * 2) });
        if (a.tags === 'mixed' && random() > 0.5) tagPoints.push({ at: [x + made.length * fit * 0.3, bedY + 0.005, z + (usableD / rows) * 0.3], turn: (random() - 0.5) * 1.2 });
      }
    }

    // Tags: one instanced sheet of little cards.
    if (tagPoints.length) {
      const tagW = Math.min(0.05, (usableW / columns) * 0.36), tagH = tagW * 0.42;
      const red = a.tags === 'red', typed = a.tags === 'typed';
      const tagMap = canvasTexture(128, 54, (ctx, w, h) => {
        ctx.fillStyle = typed ? '#fbfaf5' : red ? '#f5ebe0' : '#e6d6ad'; ctx.fillRect(0, 0, w, h);
        if (red) { ctx.strokeStyle = '#b3202a'; ctx.lineWidth = 7; ctx.strokeRect(3, 3, w - 6, h - 6); ctx.fillStyle = '#b3202a'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TYPE', w / 2, h / 2 + 7); }
        else { ctx.strokeStyle = typed ? '#22201e' : '#6a4a28'; ctx.lineWidth = typed ? 2 : 1.6; for (let line = 0; line < 3; line++) { ctx.beginPath(); let x = 16; ctx.moveTo(x, 14 + line * 13); while (x < w - 12 - line * 18) { x += 3 + random() * 5; ctx.lineTo(x, 14 + line * 13 + (typed ? 0 : (random() - 0.5) * 5)); if (random() > 0.75) { x += 5; ctx.moveTo(x, 14 + line * 13); } } ctx.stroke(); } }
        ctx.fillStyle = '#3a2c1c'; ctx.beginPath(); ctx.arc(8, h / 2, 3, 0, 7); ctx.fill();
      });
      const cards = new THREE.InstancedMesh(new THREE.PlaneGeometry(tagW, tagH), new THREE.MeshStandardMaterial({ map: tagMap, roughness: 0.9, side: THREE.DoubleSide }), tagPoints.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      tagPoints.forEach((tag, i) => { q.setFromEuler(e.set(-Math.PI / 2, 0, tag.turn, 'YXZ')); e.set(-Math.PI / 2, tag.turn, 0, 'YXZ'); q.setFromEuler(e); m.compose(new THREE.Vector3(...tag.at), q, new THREE.Vector3(1, 1, 1)); cards.setMatrixAt(i, m); if (a.tags === 'mixed') cards.setColorAt(i, new THREE.Color(['#ffffff', '#e8d8a8', '#f2c9c0', '#d9e2ea'][Math.floor(random() * 4)])); });
      cards.receiveShadow = true;
      tray.add(cards);
    }

    // The gap: a dent in the cotton, a pencilled outline and a black-edged label.
    if (gapSpot) {
      const cell = usableW / columns;
      const outline = put(s.ring(Math.min(cell * 0.3, 0.05), 0.0012, [gapSpot[0] - cell * 0.08, gapSpot[1] + 0.001, gapSpot[2]], s.material('#8b8576')));
      outline.rotation.x = Math.PI / 2; outline.scale.y = 0.45;
      put(s.ball([Math.min(cell * 0.28, 0.045), 0.0015, Math.min(cell * 0.28, 0.045) * 0.42], [gapSpot[0] - cell * 0.08, gapSpot[1], gapSpot[2]], s.material('#cfc8b2', { roughness: 1 }), 12));
      const w = Math.min(cell * 0.5, 0.07);
      const lost = put(new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.45), new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTexture(128, 58, (ctx, cw, ch) => { ctx.fillStyle = '#f1ead6'; ctx.fillRect(0, 0, cw, ch); ctx.strokeStyle = '#111'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, cw - 8, ch - 8); ctx.fillStyle = '#111'; ctx.font = 'bold 22px serif'; ctx.textAlign = 'center'; ctx.fillText('EXTINCT', cw / 2, ch / 2 + 8); }) })));
      lost.rotation.x = -Math.PI / 2;
      lost.position.set(gapSpot[0] + cell * 0.2, gapSpot[1] + 0.003, gapSpot[2] + 0.004);
      lost.rotation.z = (random() - 0.5) * 0.3;
    }

    // A tool left on top, near the front edge.
    const tx = (random() - 0.5) * usableW * 0.5, tz = fullD / 2 - 0.04, ty = bedY + 0.03;
    const steel = s.material('#c9ccce', { metalness: 0.9, roughness: 0.25 });
    const brass = s.material('#b9944a', { metalness: 0.8, roughness: 0.3 });
    const tool = new THREE.Group();
    tool.position.set(tx, ty, tz);
    tool.rotation.y = (random() - 0.5) * 1.2;
    tray.add(tool);
    if (a.tool === 'lens') {
      put(s.ring(0.045, 0.005, [0, 0, 0], brass), tool).rotation.x = Math.PI / 2;
      put(s.cylinder(0.044, 0.044, 0.004, [0, 0, 0], new THREE.MeshPhysicalMaterial({ color: '#dff2f5', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }), 24), tool);
      put(s.rod([0.048, 0, 0], [0.15, 0, 0.01], 0.008, s.material('#2a1a12', { roughness: 0.4 }), 0.01), tool);
      put(s.cylinder(0.009, 0.009, 0.012, [0.052, 0, 0], brass, 10), tool).rotation.z = Math.PI / 2;
    } else if (a.tool === 'tweezers') {
      for (const side of [-1, 1]) put(s.rod([-0.09, 0, 0], [0.09, 0, side * 0.012], 0.0028, steel, 0.0012), tool);
      put(s.ball([0.006, 0.004, 0.006], [-0.09, 0, 0], steel, 8), tool);
    } else if (a.tool === 'calipers') {
      put(s.box([0.2, 0.004, 0.014], [0, 0, 0], brass), tool);
      for (const x of [-0.09, -0.02]) { put(s.box([0.008, 0.004, 0.07], [x, 0, 0.03], brass), tool); put(s.box([0.02, 0.008, 0.02], [x, 0.002, 0], brass), tool); }
    } else if (a.tool === 'pencil') {
      const slip = put(new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.09), new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide, map: canvasTexture(128, 82, (ctx, w, h) => { ctx.fillStyle = '#f6f2e4'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#9db4c8'; for (let y = 12; y < h; y += 10) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); } ctx.fillStyle = '#333'; ctx.font = '9px monospace'; for (let i = 0; i < 6; i++) ctx.fillText(`${(8 + random() * 14).toFixed(1)}  ${(4 + random() * 9).toFixed(1)}  ${(3 + random() * 8).toFixed(1)}`, 8, 20 + i * 10); }) })), tool);
      slip.rotation.x = -Math.PI / 2; slip.position.y = -0.008;
      put(s.rod([-0.05, 0, 0.03], [0.09, 0, 0.0], 0.0035, s.material('#d9a521')), tool);
      put(s.rod([-0.05, 0, 0.03], [-0.062, 0, 0.0325], 0.0035, s.material('#d8b98c'), 0.0005), tool);
    } else if (a.tool === 'mothballs') {
      tool.position.set(0, bedY + 0.008, 0); tool.rotation.y = 0;
      for (let i = 0; i < 12; i++) blob(tool, [0.008, 0.008, 0.008], [(random() - 0.5) * usableW, 0, offsetZ + (random() - 0.5) * usableD], s.material('#f8f8f4', { roughness: 0.6 }));
    }

    // Frass and shed feathers when things have gone badly.
    if (mood.wear > 0.55) {
      const bits = Array.from({ length: Math.round(mood.wear * 70) }, () => ({ at: [(random() - 0.5) * usableW, bedY + 0.002, offsetZ + (random() - 0.5) * usableD] as P3, size: 0.4 + random(), color: random() > 0.5 ? '#3a2c20' : '#8a7556' }));
      tray.add(s.scatter(new THREE.BoxGeometry(0.004, 0.0015, 0.0025), s.material('#ffffff', { roughness: 1 }), bits));
    }

    return s.finish();
  },
});
