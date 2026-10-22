import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Xf = { p: [number, number, number]; r: [number, number, number]; s?: [number, number, number]; c: THREE.Color };

function instances(root: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, list: Xf[]) {
  if (!list.length) { geometry.dispose(); material.dispose(); return; }
  const mesh = new THREE.InstancedMesh(geometry, material, list.length);
  const d = new THREE.Object3D();
  d.rotation.order = 'YXZ';
  list.forEach((it, i) => {
    d.position.set(...it.p);
    d.rotation.set(...it.r);
    d.scale.set(...(it.s ?? [1, 1, 1]));
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
    mesh.setColorAt(i, it.c);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
}

export default defineThing({
  questions: {
    arrangement: choice('How is the turf set out to dry?', {
      footed: 'Small pyramids of five or six sods leaned on end against each other, the classic footings.',
      spread: 'Freshly cut sods laid flat in neat rows on the ground, not yet turned.',
      rickles: 'Bigger loose heaps, knee high, the second stage of drying.',
      clamp: 'One long built stack with sloped sides, ridged like a roof, ready for winter.',
      mixed: 'Some still in footings, some already gathered into a heap: work half done.',
    }),
    amount: score('How much turf has been won?', ['A few sods, an evening’s cutting', 'A modest bank’s worth', 'A whole winter of fuel']),
    stage: choice('How dry is the turf?', {
      wet: 'Just cut: fat, black, wet and glistening.',
      curing: 'Skinned over chocolate brown, still heavy.',
      dry: 'Shrunken, pale brown and crumbling at the corners, light as cork.',
    }),
    bank: choice('What does the cut bank behind it look like?', {
      stepped: 'A staircase of three clean spade-cut steps going down into black peat.',
      single: 'One sheer waist-high face, sliced straight, with heather overhanging the lip.',
      flooded: 'A deep face with a strip of black water standing at its foot.',
      old: 'An old cutting, slumped and rounded, with grass and rushes growing over it.',
      none: 'No bank in view: only the drying ground.',
    }),
    spade: choice('Where is the turf spade?', {
      leaning: 'A winged slean leaning against the bank, waiting for tomorrow.',
      planted: 'Driven upright into the ground with a jacket hung over the handle.',
      dropped: 'Lying where it was dropped among the sods.',
      pair: 'Two spades crossed against each other: a team was working here.',
      none: 'No spade: the cutters took their tools home.',
    }),
    left: choice('What else has been left at the bank?', {
      nothing: 'Nothing but turf.',
      creel: 'A wicker creel half filled with sods.',
      sacks: 'A row of plump fertiliser sacks filled with dry turf and tied at the neck.',
      barrow: 'A flat wooden bog barrow with a single wheel, loaded.',
      tea: 'A blackened kettle, a tin mug and a bottle in the lee of a footing: someone is on a break.',
      forgotten: 'Rushes growing up through the sods: nobody came back for this turf.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => lo + (hi - lo) * random();
    const forgotten = a.left === 'forgotten';
    const base = new THREE.Color({ wet: '#3a2a20', curing: '#5a3d2a', dry: '#8a6644' }[a.stage]);
    base.lerp(new THREE.Color('#8a5a30'), (mood.warmth - 0.5) * 0.25 + 0.05);
    const shrink = { wet: 1.1, curing: 1, dry: 0.86 }[a.stage];
    const L = 0.44 * shrink, W = 0.16 * shrink, H = 0.135 * shrink;
    const sodColour = () => {
      const c = base.clone().offsetHSL(rr(-0.012, 0.012), rr(-0.05, 0.05), rr(-0.045, 0.06));
      if (forgotten && random() < 0.4) c.lerp(new THREE.Color('#5d6b2e'), 0.55);
      return c;
    };
    const sods: Xf[] = [];
    const flat = (x: number, y: number, z: number, yaw: number, tilt = 0) =>
      sods.push({ p: [x, y + H / 2, z], r: [tilt, yaw, rr(-0.06, 0.06)], c: sodColour() });

    const footing = (cx: number, cz: number, fallen: boolean) => {
      const n = 5 + Math.floor(random() * 2);
      const tilt = rr(0.3, 0.4), r = 0.22 * shrink, start = random() * 6.28;
      for (let i = 0; i < n; i++) {
        const th = start + (i / n) * Math.PI * 2 + rr(-0.12, 0.12);
        if (fallen && random() < 0.55) { flat(cx + Math.cos(th) * rr(0.2, 0.45), 0, cz + Math.sin(th) * rr(0.2, 0.45), random() * 3.14); continue; }
        const k = r - (L / 2) * Math.sin(tilt);
        sods.push({ p: [cx + k * Math.cos(th), (L / 2) * Math.cos(tilt), cz + k * Math.sin(th)], r: [0, Math.PI - th, Math.PI / 2 - tilt], c: sodColour() });
      }
      if (!fallen) flat(cx, L * Math.cos(tilt) - H * 0.35, cz, random() * 3.14);
    };
    const rickle = (cx: number, cz: number, size: number) => {
      const layers = Math.round(mix(4, 7, size));
      for (let k = 0; k < layers; k++) {
        const radius = mix(0.5, 0.08, k / (layers - 1)) * mix(0.8, 1.15, size);
        const count = Math.max(1, Math.round((radius * 6.28) / (W * 1.6)));
        for (let i = 0; i < count; i++) {
          const th = (i / count) * 6.28 + k * 0.7 + rr(-0.15, 0.15);
          sods.push({ p: [cx + Math.cos(th) * radius * rr(0.6, 1), H / 2 + k * H * 0.95, cz + Math.sin(th) * radius * rr(0.6, 1)], r: [rr(-0.25, 0.25), -th + rr(-0.5, 0.5), rr(-0.25, 0.25)], c: sodColour() });
        }
      }
    };

    // The drying ground: a low pad of cutaway peat so the sods have somewhere to stand.
    const padColour = new THREE.Color('#2b211b').lerp(new THREE.Color('#4b4a2a'), forgotten ? 0.5 : 0.12);
    const pad = s.cylinder(1.6, 1.7, 0.05, [0, 0.025, 0.2], s.material(padColour, { roughness: 1 }), 28);
    pad.scale.z = 0.82;

    const amount = Math.min(1, a.amount * mix(0.75, 1.25, mood.density));
    const hasBank = a.bank !== 'none';
    const zMin = hasBank ? -0.2 : -0.9, zMax = 1.3;
    const spots: [number, number][] = [];
    const pick = (gap: number, tries = 40) => {
      for (let t = 0; t < tries; t++) {
        const x = rr(-1.3, 1.3), z = rr(zMin, zMax);
        if (Math.hypot(x / 1.4, (z - 0.2) / 1.2) > 1) continue;
        if (spots.some(([px, pz]) => Math.hypot(px - x, pz - z) < gap)) continue;
        spots.push([x, z]);
        return [x, z] as const;
      }
      return null;
    };
    const collapse = mix(0.02, 0.5, mood.wear) + (forgotten ? 0.3 : 0);

    let leanTarget: [number, number, number] | null = null; // something a spade can lean on when there is no bank
    if (a.arrangement === 'clamp') {
      const len = mix(1.0, 2.0, amount), rows = Math.round(mix(4, 7, amount));
      const along = Math.floor(len / (W * 1.08));
      for (let k = 0; k < rows; k++) {
        const across = Math.max(1, Math.round((rows - k) * 0.6));
        for (let j = 0; j < across; j++)
          for (let i = 0; i < along; i++) {
            if (k === rows - 1 && random() < collapse * 0.6) continue;
            sods.push({ p: [(i - (along - 1) / 2) * W * 1.08 + rr(-0.01, 0.01), H / 2 + k * H * 1.02, 0.55 + (j - (across - 1) / 2) * L * 0.92 + rr(-0.02, 0.02)], r: [rr(-0.04, 0.04), Math.PI / 2 + rr(-0.07, 0.07), rr(-0.04, 0.04)], c: sodColour() });
          }
      }
      spots.push([0, 0.55], [-0.7, 0.55], [0.7, 0.55]);
      leanTarget = [len / 2 + 0.05, rows * H * 0.8, 0.55];
      for (let i = 0; i < 3 + Math.round(collapse * 10); i++) { const at = pick(0.25); if (at) flat(at[0], 0.04, at[1], random() * 3.14); }
    } else if (a.arrangement === 'spread') {
      const rows = Math.round(mix(1, 3, amount)), cols = Math.round(mix(3, 7, amount));
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          if (random() < 0.06) continue;
          flat((c - (cols - 1) / 2) * W * 2.2 + rr(-0.015, 0.015), 0.04, zMin + 0.35 + r * L * 1.25 + rr(-0.02, 0.02), Math.PI / 2 + rr(-0.12, 0.12) + (random() < collapse * 0.3 ? rr(-1, 1) : 0));
        }
      // A few already turned up on edge, showing which way the work is going.
      for (let i = 0; i < 3; i++) footing(mix(-0.9, 0.9, i / 2) + rr(-0.1, 0.1), zMax - 0.25 + rr(-0.1, 0.1), false);
      leanTarget = [0.9, 0.33, zMax - 0.25];
    } else {
      const heaps = a.arrangement === 'rickles' ? Math.round(mix(1, 4, amount)) : a.arrangement === 'mixed' ? 1 + Math.round(amount) : 0;
      for (let i = 0; i < heaps; i++) {
        const at = pick(1.0);
        if (!at) continue;
        rickle(at[0], at[1], mix(0.3, 1, amount) * rr(0.8, 1));
        leanTarget ??= [at[0] + 0.35, 0.5, at[1]];
      }
      const feet = a.arrangement === 'rickles' ? Math.round(mix(0, 3, amount)) : Math.round(mix(3, 9, amount));
      for (let i = 0; i < feet; i++) {
        const at = pick(0.62);
        if (!at) continue;
        footing(at[0], at[1], random() < collapse);
        leanTarget ??= [at[0] + 0.12, 0.28, at[1]];
      }
    }
    // Crumbs and stray sods.
    for (let i = 0; i < Math.round(mix(2, 10, mood.wear)); i++) flat(rr(-1.2, 1.2), 0.035, rr(zMin, zMax - 0.2), random() * 3.14, rr(-0.1, 0.1));

    const sodGeometry = new THREE.BoxGeometry(L, H, W, 2, 1, 1);
    {
      // Slightly swollen sods read as cut earth rather than bricks.
      const p = sodGeometry.attributes.position;
      for (let i = 0; i < p.count; i++) if (Math.abs(p.getX(i)) < 0.01) { p.setY(i, p.getY(i) * 1.12); p.setZ(i, p.getZ(i) * 1.1); }
      sodGeometry.computeVertexNormals();
    }
    instances(s.root, sodGeometry, new THREE.MeshStandardMaterial({ roughness: a.stage === 'wet' ? 0.45 : 0.95, flatShading: true }), sods);

    // The cut bank.
    const W2 = 2.7;
    let faceZ = -0.5, faceTop = 0;
    if (hasBank) {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 128;
      const g = canvas.getContext('2d')!;
      const grad = g.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, '#4a3524'); grad.addColorStop(0.25, '#2c1f18'); grad.addColorStop(1, '#17110e');
      g.fillStyle = grad; g.fillRect(0, 0, 512, 128);
      for (let x = 0; x < 512; x += 20) { g.fillStyle = `rgba(${random() < 0.5 ? '120,90,60' : '0,0,0'},${rr(0.2, 0.5)})`; g.fillRect(x + rr(-2, 2), 0, 2, 128); }
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(150,115,80,${rr(0.05, 0.25)})`; g.fillRect(rr(0, 512), rr(0, 128), rr(4, 30), 1.5); }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const peat = new THREE.MeshStandardMaterial({ map: tex, roughness: a.bank === 'old' ? 0.95 : 0.5 });
      const wetTop = s.material('#2a1f19', { roughness: 0.55 });
      const steps = a.bank === 'stepped' ? 3 : 1;
      const rise = { stepped: 0.3, single: 0.85, flooded: 1.0, old: 0.6 }[a.bank];
      const tread = a.bank === 'stepped' ? 0.34 : 0.8;
      for (let i = 0; i < steps; i++) {
        const h = rise * (i + 1);
        const depth = i === steps - 1 ? 0.8 : tread;
        const z = faceZ - i * tread - depth / 2;
        const block = s.box([W2, h, depth], [0, h / 2, z], peat);
        if (a.bank === 'old') { block.rotation.x = -0.22; block.position.z -= 0.08; }
        if (i < steps - 1) {
          s.box([W2, 0.012, tread], [0, h + 0.006, z], wetTop);
          // Sods just thrown up onto the step.
          if (a.arrangement !== 'clamp') for (let k = 0; k < 4; k++) if (random() < 0.6) s.box([W, H, L], [rr(-1.4, 1.4), h + H / 2, z + rr(-0.05, 0.05)], s.material(new THREE.Color('#231915'), { roughness: 0.45 })).rotation.y = rr(-0.3, 0.3);
        }
        faceTop = h;
      }
      const backZ = faceZ - (steps - 1) * tread - 0.4;
      // The living skin: heather and moss over the lip.
      const bloom = mood.cheer;
      const heath = new THREE.Color('#4a3a28').lerp(new THREE.Color('#5a3345'), bloom * 0.7);
      const cap = s.box([W2 + 0.08, 0.1, 0.88], [0, faceTop + 0.03, backZ - 0.01], new THREE.MeshStandardMaterial({ color: heath, roughness: 1 }));
      if (a.bank === 'old') { cap.rotation.x = -0.22; cap.position.z -= 0.2; }
      const tufts: Xf[] = [];
      const palette = ['#5e4229', '#5c2f3c', '#4c5527', '#73582f', '#43342a', bloom > 0.6 ? '#8a4a70' : '#522b38', '#5c2f3c', '#3d2f26'].map((c) => new THREE.Color(c));
      const nt = Math.round(mix(110, 170, mood.density));
      for (let i = 0; i < nt; i++) {
        const z = backZ + rr(-0.4, 0.45), front = z > backZ + 0.34;
        const size = rr(0.08, 0.17);
        tufts.push({ p: [rr(-W2 / 2, W2 / 2), faceTop + 0.06 + size * 0.3 - (front ? 0.05 : 0) - (a.bank === 'old' ? (z - backZ) * 0.22 + 0.02 : 0), z + (front ? 0.04 : 0)], r: [rr(-0.3, 0.3), random() * 6.28, rr(-0.3, 0.3)], s: [size, size * rr(0.7, 1.3), size], c: palette[Math.floor(random() * palette.length)].clone().offsetHSL(0, 0, rr(-0.04, 0.04)) });
      }
      if (a.bank === 'old' || forgotten) {
        // Grass and rushes creeping down the old face.
        for (let i = 0; i < 40; i++) { const size = rr(0.06, 0.13); tufts.push({ p: [rr(-W2 / 2, W2 / 2), rr(0.02, faceTop), faceZ + 0.04 - (a.bank === 'old' ? rr(0, 0.12) : 0)], r: [0.3, random() * 6.28, 0], s: [size, size, size], c: new THREE.Color('#5c6a30').offsetHSL(0, 0, rr(-0.05, 0.05)) }); }
      }
      instances(s.root, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), tufts);
      if (a.bank === 'flooded') {
        const pool = s.box([W2 * 0.96, 0.02, 0.4], [0, 0.056, faceZ + 0.21], new THREE.MeshStandardMaterial({ color: '#0d1113', roughness: 0.08, metalness: 0.4 }));
        pool.castShadow = false;
        s.box([W2, 0.07, 0.07], [0, 0.06, faceZ + 0.44], s.material('#2b211b'));
      }
    }

    // Spades.
    const wood = s.material('#a58a5e', { roughness: 0.7 });
    const steel = s.material(new THREE.Color('#9aa0a0').lerp(new THREE.Color('#7a4a2c'), mood.wear * 0.6), { metalness: 0.6, roughness: 0.4 });
    const slean = (wing: boolean) => {
      const g = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
        const m = new THREE.Mesh(geometry, material);
        m.position.set(x, y, z);
        m.castShadow = true;
        g.add(m);
        return m;
      };
      add(new THREE.CylinderGeometry(0.019, 0.022, 1.05, 8), wood, 0, 0.9, 0);
      add(new THREE.CylinderGeometry(0.017, 0.017, 0.16, 8), wood, 0, 1.43, 0).rotation.z = Math.PI / 2;
      add(new THREE.BoxGeometry(0.115, 0.4, 0.014), steel, 0, 0.2, 0);
      add(new THREE.CylinderGeometry(0.026, 0.03, 0.1, 8), steel, 0, 0.42, 0);
      if (wing) add(new THREE.BoxGeometry(0.014, 0.34, 0.1), steel, 0.057, 0.2, 0.05);
      s.root.add(g);
      return g;
    };
    const leanAgainst = (tool: THREE.Group, x: number, topY: number, topZ: number, side = 0) => {
      // Foot out in front, handle resting on the support.
      const run = 0.45;
      const reach = Math.min(1.25, Math.max(0.5, Math.hypot(topY, run)));
      tool.position.set(x, 0.03, topZ + run);
      tool.rotation.set(-Math.atan2(run, Math.max(topY, 0.2)) - (reach < 0.6 ? 0.4 : 0), 0, side);
    };
    if (a.spade !== 'none') {
      const tool = slean(true);
      const support: [number, number, number] | null = hasBank ? [rr(0.5, 0.95), faceTop, faceZ] : leanTarget;
      if (a.spade === 'dropped' || (!support && a.spade !== 'planted')) {
        tool.rotation.set(Math.PI / 2 - 0.03, 0, rr(-0.7, 0.7));
        tool.position.set(rr(0.3, 0.7), 0.07, zMax - 0.8);
        tool.rotation.order = 'ZXY';
        if (a.spade === 'pair') { const other = slean(false); other.rotation.order = 'ZXY'; other.rotation.set(Math.PI / 2 - 0.03, 0, rr(1.2, 1.9)); other.position.set(0.2, 0.09, zMax - 0.7); }
      } else if (a.spade === 'planted') {
        tool.position.set(1.05, -0.2, hasBank ? 0.0 : -0.2);
        tool.rotation.set(rr(-0.08, 0.02), rr(-0.6, 0.6), rr(-0.08, 0.08));
        // The jacket.
        const coat = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8, 0, 6.28, 0, 1.9), s.material(mood.cheer > 0.55 ? '#40587a' : '#3b3d38', { roughness: 1, side: THREE.DoubleSide }));
        coat.scale.set(0.17, 0.3, 0.1);
        coat.position.set(0, 1.2, 0);
        coat.castShadow = true;
        tool.add(coat);
        for (const sx of [-1, 1]) { const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.42, 7), coat.material); sleeve.position.set(sx * 0.15, 1.06, 0.02); sleeve.rotation.z = sx * 0.2; sleeve.castShadow = true; tool.add(sleeve); }
      } else if (support) {
        leanAgainst(tool, support[0], support[1], support[2], rr(-0.08, 0.08));
        if (a.spade === 'pair') { const other = slean(false); leanAgainst(other, support[0] + 0.2, support[1], support[2], -0.32); }
      }
    }

    // What was left behind.
    const lx = -0.95, lz = hasBank ? 0.75 : 0.5;
    if (a.left === 'creel') {
      const wicker = s.material('#9a7a45', { roughness: 0.9, side: THREE.DoubleSide });
      const basket = s.mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.42, 14, 4, true), wicker, [lx, 0.26, lz]);
      basket.scale.z = 0.75;
      for (let i = 0; i < 4; i++) { const hoop = s.ring(mix(0.215, 0.3, i / 3), 0.012, [lx, 0.07 + i * 0.135, lz], s.material('#7a5c30')); hoop.rotation.x = Math.PI / 2; hoop.scale.y = 0.75; }
      s.cylinder(0.2, 0.2, 0.02, [lx, 0.06, lz], wicker, 14).scale.z = 0.75;
      for (let i = 0; i < 7; i++) s.box([W, H, L], [lx + rr(-0.12, 0.12), 0.36 + rr(0, 0.12), lz + rr(-0.06, 0.06)], s.material(sodColour(), { roughness: 0.95 })).rotation.set(rr(-0.7, 0.7), rr(0, 3), rr(-0.7, 0.7));
    } else if (a.left === 'sacks') {
      const n = 3 + Math.round(amount * 3);
      for (let i = 0; i < n; i++) {
        const tint = [mood.cheer > 0.5 ? '#e9e4d2' : '#cfcabb', '#d8e0d0', '#c9d6e6'][i % 3];
        const x = lx - 0.2 + i * 0.36, z = lz + 0.3 + rr(-0.06, 0.06);
        const profile: [number, number][] = [[0, 0], [0.15, 0.01], [0.17, 0.2], [0.16, 0.45], [0.06, 0.56], [0.035, 0.6], [0.07, 0.68]];
        const sack = s.lathe(profile, s.material(tint, { roughness: 0.8 }), [x, 0.04, z]);
        sack.scale.set(1, rr(0.9, 1.05), 0.8);
        sack.rotation.z = rr(-0.1, 0.1);
        s.box([0.2, 0.12, 0.005], [x, 0.32, z + 0.135], s.material(['#3a6d4d', '#b8482e', '#2f4f8a'][i % 3]));
      }
    } else if (a.left === 'barrow') {
      const g = new THREE.Group();
      g.position.set(lx + 0.05, 0, lz + 0.05);
      g.rotation.y = rr(0.3, 0.9);
      g.scale.setScalar(0.85);
      s.root.add(g);
      const plank = s.material('#8b7350', { roughness: 0.9 });
      const part = (m: THREE.Mesh) => { s.root.remove(m); g.add(m); return m; };
      part(s.box([0.62, 0.035, 0.95], [0, 0.36, 0], plank));
      part(s.box([0.62, 0.3, 0.035], [0, 0.52, -0.47], plank));
      for (const x of [-1, 1]) {
        part(s.rod([x * 0.27, 0.34, -0.6], [x * 0.33, 0.42, 0.95], 0.022, plank));
        part(s.rod([x * 0.27, 0.35, 0.3], [x * 0.27, 0, 0.32], 0.022, plank));
      }
      const wheel = part(s.cylinder(0.2, 0.2, 0.05, [0, 0.2, -0.66], s.material('#5b4a35'), 16));
      wheel.rotation.z = Math.PI / 2;
      for (let i = 0; i < 14; i++) part(s.box([L, H, W], [rr(-0.14, 0.14), 0.43 + (i % 3) * H, -0.3 + Math.floor(i / 3) * 0.16], s.material(sodColour(), { roughness: 0.95 }))).rotation.y = rr(-0.15, 0.15);
    } else if (a.left === 'tea') {
      const soot = s.material('#1c1b1a', { roughness: 0.6, metalness: 0.3 });
      s.lathe([[0, 0], [0.1, 0], [0.12, 0.08], [0.1, 0.17], [0.04, 0.19], [0, 0.19]], soot, [lx, 0.05, lz]);
      s.tube([[lx + 0.1, 0.13, lz], [lx + 0.19, 0.17, lz], [lx + 0.22, 0.23, lz]], 0.014, soot);
      s.ring(0.09, 0.007, [lx, 0.24, lz], soot, Math.PI);
      s.cylinder(0.04, 0.035, 0.08, [lx + 0.3, 0.09, lz + 0.18], s.material('#d9dde0', { metalness: 0.5, roughness: 0.35 }), 12);
      s.cylinder(0.035, 0.04, 0.2, [lx - 0.25, 0.15, lz + 0.1], s.material('#496b4a', { roughness: 0.2 }), 10);
      s.cylinder(0.014, 0.02, 0.07, [lx - 0.25, 0.28, lz + 0.1], s.material('#496b4a', { roughness: 0.2 }), 8);
      // Ashes of a small fire.
      s.cylinder(0.16, 0.18, 0.015, [lx + 0.05, 0.055, lz - 0.02], s.material('#8d8a84', { roughness: 1 }), 12);
      const cloth = s.box([0.3, 0.02, 0.3], [lx + 0.05, 0.062, lz + 0.42], s.material(mood.cheer > 0.5 ? '#c44a3a' : '#8b8676'));
      cloth.rotation.y = 0.4;
      s.ball([0.08, 0.05, 0.07], [lx + 0.05, 0.1, lz + 0.42], s.material('#b98a4e'), 10);
    }
    if (forgotten || mood.wear > 0.75) {
      const rush = s.material('#56682f', { roughness: 0.9 });
      const blades: Xf[] = [];
      for (let c = 0; c < (forgotten ? 16 : 5); c++) {
        const cx = rr(-1.3, 1.3), cz = rr(zMin, zMax);
        for (let i = 0; i < 7; i++) blades.push({ p: [cx + rr(-0.06, 0.06), 0.03, cz + rr(-0.06, 0.06)], r: [rr(-0.3, 0.3), random() * 6.28, rr(-0.3, 0.3)], s: [1, rr(0.6, 1.3), 1], c: new THREE.Color('#ffffff').offsetHSL(0, 0, rr(-0.25, 0)) });
      }
      const blade = new THREE.ConeGeometry(0.012, 0.55, 4);
      blade.translate(0, 0.275, 0);
      instances(s.root, blade, rush, blades);
    }

    return s.finish();
  },
});
