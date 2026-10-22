import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function rockGeometry(seed: number, flat = 0.6) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = 1 + 0.22 * Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 + seed * 1.3) + 0.14 * Math.sin(z * 5 + seed * 2.1);
    p.setXYZ(i, x * r, y * r * flat, z * r);
  }
  g.computeVertexNormals();
  return g;
}

export default defineThing({
  questions: {
    timber: choice('What colour has the sun turned the timber?', {
      honey: 'Fresh honey-gold larch, a barn rebuilt within living memory.',
      russet: 'Deep red-brown, baked by a century of summers.',
      black: 'Nearly black, tarred by sun, as old as the parish records.',
      silver: 'Bleached silver-grey, dry as driftwood on the shaded side.',
    }),
    logs: choice('How are the walls built?', {
      round: 'Whole round logs notched at the corners, ends sticking out.',
      squared: 'Squared beams stacked tight, crisp crossed corners.',
      stonefoot: 'A dry-stone lower half with a timber loft on top.',
    }),
    stilts: score('How high does it stand off the ground?', ['Resting on flat stones', 'Knee-high on staddles', 'Perched high on mushroom-shaped staddle stones against mice']),
    roof: choice('What covers the roof?', {
      shingle: 'Grey wooden shingles held down by poles and rows of rocks.',
      slab: 'Heavy overlapping slabs of split stone.',
      tin: 'Rust-streaked corrugated tin, a later repair, still weighted with rocks.',
      turf: 'Grass and flowers growing on a turf roof.',
    }),
    season: choice('What is happening at the barn right now?', {
      haying: 'Haymaking: the door is open and hay bulges out of it.',
      shut: 'Shut up and latched, nobody has come up yet this year.',
      ajar: 'The door hangs ajar on a dark interior, someone is inside or was.',
      loft: 'The door is shut but the loft hatch in the gable is open, stuffed with hay.',
    }),
    tool: choice('What hangs on the front wall?', {
      scythe: 'A long scythe with a curved steel blade.',
      rake: 'A wide wooden hay rake.',
      bell: 'A big cowbell on a leather strap.',
      ladder: 'A short ladder leaning against the logs.',
      nothing: 'Nothing but an empty peg.',
    }),
    beside: choice('What stands beside it?', {
      woodpile: 'Split firewood stacked under the eave.',
      hayrack: 'A wooden drying rack draped with hay.',
      churns: 'A bench with two milk churns.',
      bare: 'Nothing, just grass up to the stones.',
    }),
    flowers: noul('Is there a box of red geraniums at the front?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 3.6, D = 3.0, d = 0.2, rows = 9;
    const tone = new THREE.Color({ honey: '#b9853f', russet: '#6e3d22', black: '#2e221b', silver: '#8d8a82' }[a.timber]);
    tone.lerp(new THREE.Color('#7b766e'), mood.wear * 0.3).offsetHSL(0, 0, (mood.warmth - 0.5) * 0.04);
    const grain = paint(256, 64, (c) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 64);
      for (let i = 0; i < 90; i++) {
        c.fillStyle = `rgba(0,0,0,${0.05 + random() * 0.22})`;
        c.fillRect(random() * 256, random() * 64, 30 + random() * 120, 1 + random() * 2.5);
      }
      for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(random() * 256, 0, 2, 64); }
    });
    const wood = s.material(tone, { map: grain, roughness: 0.9 });
    const woodDark = s.material(tone.clone().multiplyScalar(0.62), { roughness: 0.95 });
    const endGrain = s.material(tone.clone().lerp(new THREE.Color('#c9a777'), 0.35), { roughness: 0.9 });
    const stone = s.material('#9a9a94', { roughness: 0.95, flatShading: true });
    const stoneDark = s.material('#74757a', { roughness: 0.95, flatShading: true });
    const iron = s.material('#3a3b3e', { metalness: 0.6, roughness: 0.5 });
    const steel = s.material('#c9d0d4', { metalness: 0.8, roughness: 0.3 });
    const hay = s.material(mix(0, 1, mood.wear) > 0.7 ? '#a8985d' : '#d6b84e', { roughness: 1 });
    const black = s.material('#15120f', { roughness: 1 });
    const rocks = [0, 1, 2].map((i) => rockGeometry(random() * 20 + i * 7));

    const y0 = mix(0.22, 0.95, a.stilts);
    // Staddles: a short post and a wide flat cap stone that mice cannot climb around.
    for (const x of [-1, 0, 1]) for (const z of [-1, 1]) {
      if (x === 0 && a.stilts < 0.25) continue;
      const px = x * (W / 2 - 0.25), pz = z * (D / 2 - 0.25);
      const cap = 0.12;
      if (y0 > 0.4) {
        s.cylinder(0.11, 0.19, y0 - cap, [px, (y0 - cap) / 2, pz], a.stilts > 0.7 ? stone : woodDark, 7);
        const m = s.mesh(rocks[(x + z + 3) % 3], stone, [px, y0 - cap / 2, pz]);
        m.scale.set(0.42 + random() * 0.08, 0.1, 0.42 + random() * 0.08); m.rotation.y = random() * 6;
      } else {
        const m = s.mesh(rocks[(x + z + 3) % 3], stone, [px, y0 / 2, pz]);
        m.scale.set(0.38, y0 * 0.85, 0.34); m.rotation.y = random() * 6;
      }
    }
    // Sill frame.
    for (const z of [-1, 1]) s.box([W + 0.6, 0.18, 0.22], [0, y0 + 0.09, z * D / 2], woodDark);
    for (const x of [-1, 1]) s.box([0.22, 0.18, D + 0.6], [x * W / 2, y0 + 0.11, 0], woodDark);
    s.box([W, 0.06, D], [0, y0 + 0.16, 0], woodDark);

    const base = y0 + 0.18;
    const wallH = rows * d;
    const stoneRows = a.logs === 'stonefoot' ? 4 : 0;
    const log = (len: number, at: [number, number, number], alongX: boolean) => {
      const r = d / 2 * (0.92 + random() * 0.16);
      const jitter = (random() - 0.5) * 0.14;
      if (a.logs === 'round') {
        const m = s.cylinder(r, r * (0.9 + random() * 0.15), len + jitter, at, wood, 9);
        if (alongX) m.rotation.z = Math.PI / 2; else m.rotation.x = Math.PI / 2;
        m.rotation.y = alongX ? 0 : 0;
      } else {
        s.box(alongX ? [len + jitter, d * 0.97, d * 0.8] : [d * 0.8, d * 0.97, len + jitter], at, wood);
      }
    };
    if (stoneRows) {
      const wallTex = paint(256, 128, (c) => {
        c.fillStyle = '#8f8f8a'; c.fillRect(0, 0, 256, 128);
        for (let row = 0; row < 6; row++) for (let x = -20 + (row % 2) * 18; x < 256;) {
          const w = 22 + random() * 34; const g = 120 + random() * 70;
          c.fillStyle = `rgb(${g},${g},${g - 6})`; c.fillRect(x + 2, row * 21 + 2, w - 3, 18); x += w;
        }
      });
      const wallMat = s.material('#ffffff', { map: wallTex, roughness: 1 });
      s.box([W + 0.25, stoneRows * d, D + 0.25], [0, base + stoneRows * d / 2, 0], wallMat);
    }
    for (let i = stoneRows; i < rows; i++) {
      const y = base + d / 2 + i * d;
      for (const z of [-1, 1]) log(W + 0.55, [0, y, z * D / 2], true);
      for (const x of [-1, 1]) log(D + 0.55, [x * W / 2, y + d / 2 - 0.02, 0], false);
    }
    // Gables.
    const pitch = a.roof === 'slab' || a.roof === 'turf' ? 0.42 : 0.5;
    const rise = (W / 2) * Math.tan(pitch);
    const top = base + wallH;
    for (let k = 0; (k + 0.5) * d < rise - 0.05; k++) {
      const len = W * (1 - (k + 0.7) * d / rise);
      for (const z of [-1, 1]) log(Math.max(len, 0.3), [0, top + d / 2 + k * d, z * D / 2], true);
    }
    // Purlins poking out under the roof.
    const ridgeY = top + rise + 0.12;
    for (const f of [0, 0.5, 1]) for (const side of [-1, 1]) {
      if (f === 0 && side === 1) continue;
      const m = s.cylinder(0.08, 0.08, D + 1.1, [side * f * (W / 2 + 0.05), ridgeY - 0.14 - f * rise, 0], woodDark, 8);
      m.rotation.x = Math.PI / 2;
    }
    // Roof slabs.
    const over = 0.6, L = (W / 2 + over) / Math.cos(pitch), roofD = D + 1.25;
    const roofTex = paint(256, 256, (c) => {
      const baseCol = { shingle: [150, 146, 138], slab: [118, 122, 128], tin: [128, 112, 104], turf: [108, 142, 70] }[a.roof];
      c.fillStyle = `rgb(${baseCol.join(',')})`; c.fillRect(0, 0, 256, 256);
      if (a.roof === 'tin') {
        for (let x = 0; x < 256; x += 16) { c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(x, 0, 6, 256); c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(x + 9, 0, 4, 256); }
        for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(${120 + random() * 50},${58 + random() * 30},28,0.4)`; c.fillRect(random() * 256, random() * 256, 8 + random() * 20, 30 + random() * 90); }
      } else if (a.roof === 'turf') {
        for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${60 + random() * 90},${110 + random() * 90},${30 + random() * 50},0.6)`; c.fillRect(random() * 256, random() * 256, 3, 6); }
      } else {
        const n = a.roof === 'slab' ? 6 : 12;
        for (let row = 0; row < n; row++) for (let x = -10 + (row % 2) * 9; x < 256;) {
          const w = (a.roof === 'slab' ? 30 : 12) + random() * (a.roof === 'slab' ? 30 : 12);
          const v = (random() - 0.5) * 60;
          c.fillStyle = `rgb(${baseCol[0] + v},${baseCol[1] + v},${baseCol[2] + v})`;
          c.fillRect(x + 1, row * 256 / n, w - 2, 256 / n - 3);
          c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x, row * 256 / n + 256 / n - 4, w, 4);
          x += w;
        }
      }
    });
    roofTex.center.set(0.5, 0.5); roofTex.rotation = Math.PI / 2;
    const roofMat = s.material('#ffffff', { map: roofTex, roughness: 0.95, metalness: a.roof === 'tin' ? 0.3 : 0 });
    const thick = { shingle: 0.08, slab: 0.14, tin: 0.04, turf: 0.2 }[a.roof];
    const sag = mood.wear * 0.05;
    for (const side of [-1, 1]) {
      const g = new THREE.BoxGeometry(roofD, thick, L);
      // UVs run so rows of shingles step down the slope.
      const m = s.mesh(g, roofMat, [side * (L / 2) * Math.cos(pitch), ridgeY - (L / 2) * Math.sin(pitch) + thick / 2, 0]);
      m.rotation.order = 'YXZ';
      m.rotation.y = side * Math.PI / 2;
      m.rotation.x = pitch + sag * side * (random() - 0.3);
      if (a.roof !== 'tin') {
        // Weight poles and rocks.
        for (const f of a.roof === 'slab' ? [0.85] : [0.38, 0.86]) {
          const px = side * f * L * Math.cos(pitch), py = ridgeY - f * L * Math.sin(pitch) + thick + 0.05;
          if (a.roof !== 'slab') { const pole = s.cylinder(0.045, 0.05, roofD - 0.1, [px, py, 0], woodDark, 7); pole.rotation.x = Math.PI / 2; }
          const n = 3 + Math.floor(random() * 3 + mood.density * 2);
          for (let i = 0; i < n; i++) {
            if (random() < mood.wear * 0.3) continue;
            const r = 0.13 + random() * 0.09;
            const rock = s.mesh(rocks[i % 3], i % 2 ? stone : stoneDark, [px - side * 0.06, py + r * 0.45, -roofD / 2 + 0.3 + (i + random() * 0.6) * (roofD - 0.6) / n]);
            rock.scale.set(r, r * 1.1, r * 1.25); rock.rotation.set(random() * 0.3, random() * 6, side * pitch);
          }
        }
      } else {
        for (let i = 0; i < 4; i++) {
          const f = 0.3 + random() * 0.55, r = 0.14 + random() * 0.08;
          const rock = s.mesh(rocks[i % 3], stone, [side * f * L * Math.cos(pitch), ridgeY - f * L * Math.sin(pitch) + thick + r * 0.5, (random() - 0.5) * (roofD - 0.5)]);
          rock.scale.set(r, r, r * 1.2); rock.rotation.y = random() * 6;
        }
      }
    }
    const cap = s.box([0.3, 0.07, roofD + 0.05], [0, ridgeY + thick + 0.03, 0], a.roof === 'turf' ? woodDark : a.roof === 'tin' ? iron : woodDark);
    cap.rotation.z = 0;
    if (a.roof === 'turf') {
      const tuft = new THREE.ConeGeometry(0.05, 0.28, 4);
      const pts: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 90; i++) {
        const side = random() < 0.5 ? -1 : 1, f = 0.05 + random() * 0.92;
        pts.push({ at: [side * f * L * Math.cos(pitch), ridgeY - f * L * Math.sin(pitch) + thick + 0.12, (random() - 0.5) * roofD * 0.95], size: 0.6 + random() * 0.9, color: random() < 0.2 ? ['#f2d43a', '#e9e6f2', '#d94a7a'][Math.floor(random() * 3)] : '#6f9a3d' });
      }
      s.scatter(tuft, new THREE.MeshStandardMaterial({ roughness: 1 }), pts);
    }

    // Front wall: door, loft hatch, tools.
    const zf = D / 2 + d / 2;
    const doorW = 0.95, doorH = 1.4, doorY = base + 0.12 + doorH / 2;
    const plankTex = paint(128, 128, (c) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, 128, 128);
      for (let x = 0; x < 128; x += 26) { c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(x, 0, 3, 128); }
      for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(0,0,0,${random() * 0.2})`; c.fillRect(random() * 128, random() * 128, 2, 20 + random() * 50); }
    });
    const plank = s.material(tone.clone().lerp(new THREE.Color('#8a7a66'), 0.35), { map: plankTex, roughness: 0.9 });
    s.box([doorW + 0.24, doorH + 0.2, 0.06], [0, doorY + 0.02, zf - 0.02], woodDark);
    const open = a.season === 'haying' ? 1.9 : a.season === 'ajar' ? 0.55 : 0;
    if (open) s.box([doorW, doorH, 0.03], [0, doorY, zf + 0.012], black);
    const door = new THREE.Group();
    door.position.set(-doorW / 2, doorY, zf + 0.04);
    door.rotation.y = -open;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.05), plank);
    leaf.position.x = doorW / 2; leaf.castShadow = leaf.receiveShadow = true;
    door.add(leaf);
    for (const y of [-0.45, 0.45]) { const strap = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.8, 0.06, 0.012), iron); strap.position.set(doorW * 0.42, y, 0.03); door.add(strap); }
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.03), iron); latch.position.set(doorW * 0.86, 0, 0.035); door.add(latch);
    s.root.add(door);
    if (a.season === 'haying') {
      for (let i = 0; i < 9; i++) s.ball([0.28 + random() * 0.2, 0.2 + random() * 0.16, 0.25 + random() * 0.15], [(random() - 0.5) * 0.7, base + 0.25 + random() * 0.9, zf + 0.05 + random() * 0.2], hay, 8);
      for (let i = 0; i < 5; i++) s.ball([0.3 + random() * 0.25, 0.1 + random() * 0.08, 0.3 + random() * 0.2], [(random() - 0.5) * 1.5, 0.08, zf + 0.5 + random() * 0.7], hay, 8);
    }
    const hatchY = top + rise * 0.38;
    if (a.season === 'loft') {
      s.box([0.72, 0.56, 0.04], [0, hatchY, zf], black);
      for (let i = 0; i < 6; i++) s.ball([0.2 + random() * 0.1, 0.14 + random() * 0.08, 0.16], [(random() - 0.5) * 0.45, hatchY - 0.12 + random() * 0.25, zf + 0.06 + random() * 0.08], hay, 8);
      const shut = s.box([0.36, 0.56, 0.04], [-0.56, hatchY, zf + 0.06], plank); shut.rotation.y = -0.5;
    } else {
      s.box([0.5, 0.42, 0.05], [0, hatchY, zf], plank);
      s.box([0.6, 0.05, 0.07], [0, hatchY - 0.24, zf + 0.01], woodDark);
    }
    // Step up to the door.
    const stepN = Math.max(1, Math.round((base + 0.1) / 0.3));
    for (let i = 0; i < stepN; i++) {
      const h = (base + 0.08) * (stepN - i) / stepN;
      const m = s.mesh(rocks[i % 3], i % 2 ? stoneDark : stone, [0.05 * (random() - 0.5), h / 2, zf + 0.22 + i * 0.3]);
      m.scale.set(0.6 - i * 0.03, h / 2 / 0.6, 0.24); m.rotation.y = (random() - 0.5) * 0.25;
    }

    const tx = -1.2, ty = base + 0.95, tz = zf + 0.07;
    if (a.tool !== 'ladder') s.cylinder(0.02, 0.02, 0.14, [tx, ty + 0.72, tz - 0.02], woodDark, 6).rotation.x = Math.PI / 2;
    if (a.tool === 'scythe') {
      const pale = s.material('#c8ab78', { roughness: 0.8 });
      s.tube([[tx + 0.1, ty - 0.85, tz], [tx + 0.03, ty - 0.2, tz + 0.02], [tx - 0.02, ty + 0.4, tz + 0.02], [tx, ty + 0.78, tz]], 0.022, pale);
      for (const y of [-0.25, 0.25]) s.rod([tx, ty + y, tz + 0.02], [tx + 0.02, ty + y + 0.02, tz + 0.2], 0.018, pale);
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.quadraticCurveTo(0.5, 0.2, 0.98, -0.06); shape.quadraticCurveTo(0.5, 0.07, 0.02, -0.12); shape.lineTo(0, 0);
      const blade = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false }), steel, [tx, ty + 0.8, tz]);
      blade.rotation.z = -0.1;
    } else if (a.tool === 'rake') {
      const pale = s.material('#d2b684', { roughness: 0.8 });
      s.rod([tx, ty - 0.85, tz], [tx, ty + 0.72, tz], 0.02, pale);
      s.box([0.72, 0.045, 0.045], [tx, ty + 0.74, tz], pale);
      for (let i = 0; i < 9; i++) s.cylinder(0.008, 0.012, 0.12, [tx - 0.32 + i * 0.08, ty + 0.74, tz + 0.07], pale, 5).rotation.x = Math.PI / 2;
      s.rod([tx - 0.22, ty + 0.74, tz], [tx, ty + 0.4, tz], 0.012, pale); s.rod([tx + 0.22, ty + 0.74, tz], [tx, ty + 0.4, tz], 0.012, pale);
    } else if (a.tool === 'bell') {
      const brass = s.material('#b98a2f', { metalness: 0.7, roughness: 0.35 });
      s.box([0.09, 0.42, 0.02], [tx, ty + 0.5, tz], s.material('#3b2416'));
      s.lathe([[0.001, 0.36], [0.1, 0.34], [0.13, 0.2], [0.17, 0.05], [0.2, 0]], brass, [tx, ty - 0.08, tz + 0.12]).scale.z = 0.75;
    } else if (a.tool === 'ladder') {
      const pale = s.material('#b99a6a', { roughness: 0.85 });
      for (const x of [-0.2, 0.2]) s.rod([tx + x, 0, zf + 0.75], [tx + x, base + 1.75, zf + 0.06], 0.03, pale);
      for (let i = 1; i < 7; i++) { const t = i / 7.4; s.rod([tx - 0.2, t * (base + 1.75), zf + 0.75 - t * 0.69], [tx + 0.2, t * (base + 1.75), zf + 0.75 - t * 0.69], 0.02, pale); }
    }

    // Beside the barn, on the right-hand eave side.
    const bx = W / 2 + 0.55;
    if (a.beside === 'woodpile') {
      const cut = s.material('#cfa970', { roughness: 0.9 });
      for (let row = 0; row < 5; row++) for (let i = 0; i < 9; i++) {
        if (row === 4 && random() < 0.5) continue;
        const m = s.cylinder(0.075, 0.075, 0.42, [bx - 0.15 + (random() - 0.5) * 0.03, 0.08 + row * 0.15, -1.1 + i * 0.155 + (row % 2) * 0.07], (i + row) % 3 ? cut : woodDark, 6);
        m.rotation.z = Math.PI / 2;
      }
    } else if (a.beside === 'hayrack') {
      const pale = s.material('#a58a62', { roughness: 0.9 });
      for (const z of [-0.9, 0.9]) { s.rod([bx + 0.25, 0, z], [bx + 0.25, 1.75, z], 0.04, pale); }
      for (let i = 0; i < 4; i++) { s.rod([bx + 0.25, 0.4 + i * 0.4, -1.05], [bx + 0.25, 0.4 + i * 0.4, 1.05], 0.025, pale);
        for (let j = 0; j < 5; j++) if (random() < 0.45 + mood.density * 0.5) s.ball([0.14, 0.2 + random() * 0.08, 0.2], [bx + 0.25, 0.33 + i * 0.4, -0.75 + j * 0.37 + random() * 0.05], hay, 8); }
    } else if (a.beside === 'churns') {
      s.box([0.4, 0.06, 1.3], [bx, 0.42, 0.2], wood);
      for (const z of [-0.35, 0.75]) s.box([0.36, 0.42, 0.07], [bx, 0.21, z], woodDark);
      const tin = s.material('#aeb4b6', { metalness: 0.75, roughness: 0.35 });
      for (const z of [0.9, 1.25]) s.lathe([[0.001, 0], [0.15, 0], [0.16, 0.36], [0.1, 0.46], [0.1, 0.54], [0.13, 0.56], [0.001, 0.58]], tin, [bx + 0.05 + random() * 0.1, 0, z + 0.25]);
    }
    if (a.flowers) {
      s.box([0.9, 0.14, 0.18], [1.15, base + 1.0, zf + 0.12], woodDark);
      const pts: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 26; i++) pts.push({ at: [0.75 + random() * 0.8, base + 1.1 + random() * 0.14, zf + 0.08 + random() * 0.12], size: 0.05 + random() * 0.035, color: random() < 0.3 ? '#3f7a34' : mood.cheer > 0.3 ? '#e3262d' : '#8a3a3a' });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), pts);
      s.box([0.7, 0.6, 0.04], [1.15, base + 1.42, zf - 0.03], plank);
    }
    // Nettles and tufts at the foot when crowded or neglected.
    const weeds = Math.round(mix(4, 26, Math.max(mood.density, mood.wear)));
    const pts: { at: [number, number, number]; size: number; color: string }[] = [];
    for (let i = 0; i < weeds; i++) {
      const ang = random() * Math.PI * 2;
      pts.push({ at: [Math.cos(ang) * (W / 2 + 0.3), 0.12, Math.sin(ang) * (D / 2 + 0.3)], size: 0.7 + random() * 0.9, color: random() < 0.15 ? '#e8d24a' : '#5d8b3a' });
    }
    s.scatter(new THREE.ConeGeometry(0.07, 0.3, 4), new THREE.MeshStandardMaterial({ roughness: 1 }), pts);
    return s.finish();
  },
});
