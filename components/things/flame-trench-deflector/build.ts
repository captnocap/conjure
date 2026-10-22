import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Batch, sign } from './batch';

/** A painted masonry surface with a soot fan burnt into it from one point. */
function masonry(random: () => number, w: number, h: number, cols: number, rows: number, base: string, mortar: string, scorch: number, spall: number, cx: number, cy: number, rx: number, ry: number, patch = false) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = mortar;
  ctx.fillRect(0, 0, w, h);
  const bw = w / cols, bh = h / rows, tint = new THREE.Color();
  for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) {
    const x = (c + (r % 2) * 0.5) * bw, y = r * bh;
    tint.set(base).offsetHSL((random() - 0.5) * 0.02, (random() - 0.5) * 0.1, (random() - 0.5) * 0.12);
    const near = Math.hypot((x / w - cx) / rx, (y / h - cy) / ry);
    const gone = random() < spall * (near < 1 ? 1.6 : 0.5);
    if (patch && Math.abs(x / w - 0.3) < 0.09 && y / h > 0.25) tint.set('#eadfc4');
    ctx.fillStyle = gone ? '#2b221d' : '#' + tint.getHexString();
    ctx.fillRect(x + 0.6, y + 0.6, bw - 1.2, bh - 1.2);
  }
  if (scorch > 0.02) {
    ctx.save();
    ctx.translate(cx * w, cy * h);
    ctx.scale(rx * w, ry * h);
    const soot = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    soot.addColorStop(0, `rgba(12,11,10,${Math.min(0.97, scorch * 1.25)})`);
    soot.addColorStop(0.5, `rgba(16,14,12,${scorch * 0.75})`);
    soot.addColorStop(1, 'rgba(20,16,12,0)');
    ctx.fillStyle = soot;
    ctx.fillRect(-1.2, -1.2, 2.4, 2.4);
    ctx.restore();
    ctx.strokeStyle = `rgba(14,12,10,${scorch * 0.55})`;
    for (let i = 0; i < 30; i++) {
      const angle = random() * Math.PI * 2, reach = 0.5 + random() * 0.9;
      ctx.lineWidth = 1 + random() * 3;
      ctx.beginPath();
      ctx.moveTo(cx * w, cy * h);
      ctx.lineTo(cx * w + Math.cos(angle) * rx * w * reach, cy * h + Math.sin(angle) * ry * h * reach);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.92 });
}

export default defineThing({
  questions: {
    aftermath: choice('What state is the trench in right now?', {
      steaming: 'Minutes after a launch: steam boiling out of both ends, the deflector still glowing dull orange.',
      cold: 'Cold, swept and waiting for the next rocket.',
      flooded: 'Flooded with still green rainwater, the wedge poking out like an island.',
      overgrown: 'Weeds, scrub and a young tree growing between the bricks.',
      repair: 'Under repair: scaffolding against one wall, a fresh patch of pale bricks, pallets on the rim.',
    }),
    lining: choice('What lines the trench walls?', {
      firebrick: 'Orange-red firebrick, laid in thousands of courses.',
      buff: 'Pale buff refractory brick, almost sand coloured.',
      concrete: 'Grey poured refractory concrete in big panels.',
      steel: 'Blue-black water-cooled steel plate.',
    }),
    deflector: choice('What shape is the flame deflector?', {
      wedge: 'A two-sided inverted V that splits the flame down both ends of the trench.',
      ramp: 'A single curved ramp that throws everything out one end.',
      pyramid: 'A four-sided spike under the engine.',
      missing: 'Gone: only its rails and anchor bolts remain on the floor.',
    }),
    launches: score('How many launches has it taken?', ['Never fired, clean brick', 'A few, a grey soot fan', 'Dozens, black to the rim', 'Hundreds, burnt and glazed']),
    length: score('How long is the trench?', ['A short test-stand pit', 'A typical pad', 'A long moon-rocket canyon']),
    rim: choice('What stands along the rim of the pad?', {
      bare: 'Nothing but concrete and expansion joints.',
      pipes: 'Fat water pipes with upturned nozzles to drown the sound.',
      rails: 'Steel rails and a bridge where the launch mount rolls over the trench.',
      hazard: 'Yellow and black hazard stripes and a DANGER BLAST AREA sign.',
    }),
    debris: noul('Have bricks been blown out of the walls and scattered beyond the trench mouth?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const b = new Batch();
    const wear = mood.wear;
    const L = Math.round(mix(40, 84, a.length)), W = 56, T = 16, H = 11, slope = 9;
    const scorch = a.aftermath === 'repair' ? a.launches * 0.6 : a.launches;
    const spall = (0.015 + wear * 0.09) * (0.4 + scorch) * (a.debris ? 1.6 : 1);
    const base = { firebrick: '#b9573a', buff: '#d6bf93', concrete: '#a9a79d', steel: '#4f5f6e' }[a.lining];
    const mortar = { firebrick: '#8f8474', buff: '#9c9280', concrete: '#7f7d75', steel: '#27303a' }[a.lining];
    const big = a.lining === 'concrete' || a.lining === 'steel';
    const concrete = s.material('#a7a396', { roughness: 0.95 });

    // Two halves of the raised pad, sloping away on their outer sides.
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape();
      shape.moveTo(side * W / 2, 0);
      shape.lineTo(side * (W / 2 - slope), H);
      shape.lineTo(side * T / 2, H);
      shape.lineTo(side * T / 2, 0);
      shape.closePath();
      const half = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false }), concrete, [0, 0, -L / 2]);
      half.userData.side = side;
      // Pad top, with its own soot stain creeping out from the trench.
      const topW = W / 2 - slope - T / 2;
      const top = s.mesh(new THREE.PlaneGeometry(topW, L), masonry(random, 256, 512, 3, 8, '#b3afa1', '#817e73', scorch * 0.7, 0, side > 0 ? 0 : 1, 0.5, 0.75, 0.3), [side * (T / 2 + topW / 2), H + 0.04, 0]);
      top.rotation.x = -Math.PI / 2;
      top.castShadow = false;
      // Lined wall.
      const wall = s.mesh(new THREE.PlaneGeometry(L, H), masonry(random, 1024, 192, big ? 10 : Math.round(L * 0.9), big ? 3 : 20, base, mortar, scorch, spall, 0.5, 0.75, 0.42, 1.2, a.aftermath === 'repair' && side < 0), [side * (T / 2 - 0.06), H / 2, 0]);
      wall.rotation.y = -side * Math.PI / 2;
      wall.castShadow = false;
      b.box([1.1, 0.5, L], [side * (T / 2 + 0.3), H + 0.25, 0], '#8f8c80');
    }
    // Floor: lined inside the trench, running out as a scorched apron at both mouths.
    const apron = 14;
    const floor = s.mesh(new THREE.PlaneGeometry(T, L + apron * 2), masonry(random, 192, 1024, big ? 2 : 14, big ? 12 : Math.round((L + apron * 2) * 1.2), base, mortar, scorch, spall * 0.6, 0.5, 0.5, 1.1, 0.5), [0, 0.12, 0]);
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;
    b.box([T + 1, 0.1, L + apron * 2 + 1], [0, 0.03, 0], '#9d9a8e');

    // The deflector.
    const steel = new THREE.Color('#6d737a').lerp(new THREE.Color('#141312'), Math.min(0.78, 0.2 + scorch * 0.6));
    const hot = a.aftermath === 'steaming';
    const metal = new THREE.MeshStandardMaterial({ color: steel, roughness: 0.55, metalness: 0.5, emissive: hot ? '#ff5a1c' : '#000000', emissiveIntensity: hot ? 0.9 : 0 });
    const DW = T - 1.6, DH = H * 0.78;
    if (a.deflector === 'wedge' || a.deflector === 'ramp') {
      const shape = new THREE.Shape();
      const reach = a.deflector === 'wedge' ? 11 : 17;
      shape.moveTo(-reach, 0);
      shape.quadraticCurveTo(-reach * 0.25, DH * 0.12, 0, DH);
      if (a.deflector === 'wedge') shape.quadraticCurveTo(reach * 0.25, DH * 0.12, reach, 0);
      else { shape.lineTo(2.2, DH); shape.lineTo(2.2, 0); }
      shape.closePath();
      const wedge = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: DW, bevelEnabled: false, curveSegments: 10 }), metal);
      wedge.rotation.y = Math.PI / 2;
      wedge.position.set(-DW / 2, 0.1, a.deflector === 'ramp' ? -5 : 0);
      b.box([DW + 0.4, 0.5, 0.9], [0, DH + 0.2, a.deflector === 'ramp' ? -3.9 : 0], '#a9afb3');
      for (let rib = 0; rib < 5; rib++) b.box([0.3, DH * 0.9, 0.5], [-DW / 2 + 1 + rib * (DW - 2) / 4, DH * 0.45, a.deflector === 'ramp' ? -7.4 : 0], steel);
    } else if (a.deflector === 'pyramid') {
      const spike = s.mesh(new THREE.ConeGeometry(DW * 0.7, DH, 4), metal, [0, DH / 2 + 0.1, 0]);
      spike.rotation.y = Math.PI / 4;
    } else {
      for (const x of [-4, 4]) b.box([0.4, 0.4, 26], [x, 0.3, 0], '#4a4e52');
      for (const x of [-4, 4]) for (let k = -3; k <= 3; k++) b.cyl(0.35, 0.35, 0.9, [x + (k % 2 ? 0.9 : -0.9), 0.45, k * 3.5], '#7b4023', 6);
      b.box([10, 0.06, 20], [0, 0.17, 0], '#b3ab98');
    }

    // Blown-out bricks.
    const loose = Math.round((a.debris ? 70 : 8) * (0.3 + wear) * (0.3 + scorch));
    for (let i = 0; i < loose; i++) {
      const end = random() < 0.5 ? -1 : 1;
      const z = end * (random() < 0.6 ? L / 2 + random() * apron * 1.3 : random() * L / 2);
      const tint = new THREE.Color(base).lerp(new THREE.Color('#1a1614'), random() * scorch);
      b.box([1.1, 0.5, 0.6], [(random() - 0.5) * (T - 2) * (Math.abs(z) > L / 2 ? 1.8 : 1), 0.3 + random() * 0.2, z], tint, [random() * 0.6, random() * 3, random() * 0.6]);
    }

    // Rim dressing.
    if (a.rim === 'pipes') {
      for (const side of [-1, 1]) {
        b.rod([side * (T / 2 + 2.6), H + 0.9, -L / 2 + 2], [side * (T / 2 + 2.6), H + 0.9, L / 2 - 2], 0.8, '#d9dbd6', 0.8, 10);
        for (let n = 0; n < 6; n++) {
          const z = -L / 2 + 5 + n * (L - 10) / 5;
          b.rod([side * (T / 2 + 2.6), H + 0.9, z], [side * (T / 2 + 1.2), H + 3.4, z], 0.5, '#d9dbd6', 0.5, 8);
          b.cyl(0.9, 0.5, 0.9, [side * (T / 2 + 1.1), H + 3.7, z], '#c0392b', 8);
        }
      }
    } else if (a.rim === 'rails') {
      for (const side of [-1, 1]) for (const off of [3, 5.4]) b.box([0.35, 0.4, L], [side * (T / 2 + off), H + 0.2, 0], '#4a4e52');
      for (const z of [-5, 5]) { b.box([T + 12, 1.6, 1.6], [0, H + 0.8, z], '#8a3a2a'); }
      for (let k = -3; k <= 3; k++) b.rod([k * 3.6, H + 0.8, -5], [k * 3.6 + 1.8, H + 0.8, 5], 0.3, '#8a3a2a', 0.3, 4);
    } else if (a.rim === 'hazard') {
      for (const side of [-1, 1]) for (let k = 0; k < Math.floor(L / 2.4); k++) b.box([1.2, 0.08, 1.2], [side * (T / 2 + 1.6), H + 0.1, -L / 2 + 1.2 + k * 2.4], k % 2 ? '#1c1d1f' : '#e5bd27');
      const board = sign(['DANGER', 'BLAST AREA'], 9, 4.2, '#f4f1e6', '#b3261a');
      board.position.set(T / 2 + 9, H + 4.4, L / 2 - 4);
      board.rotation.y = 0.25;
      s.root.add(board);
      for (const dx of [-3.5, 3.5]) b.rod([T / 2 + 9 + dx, H, L / 2 - 4 - dx * 0.25], [T / 2 + 9 + dx, H + 2.4, L / 2 - 4 - dx * 0.25], 0.18, '#4a4e52', 0.18, 5);
    }
    for (let j = 0; j < 14; j++) { const side = random() < 0.5 ? -1 : 1; b.box([0.14, 0.03, 0.5 + random() * 2], [side * (W / 2 - slope / 2 - 1), H * 0.5, (random() - 0.5) * L], '#8d8a7f'); }

    // What is happening in it now.
    const puffs: THREE.Mesh[] = [];
    if (a.aftermath === 'steaming') {
      const steam = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.36, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 16; i++) {
        const end = i % 2 ? -1 : 1, t = random();
        const r = mix(3.5, 9, t);
        const puff = s.ball([r, r * 0.8, r], [(random() - 0.5) * 8, mix(3, 16, t) + random() * 3, end * mix(6, L / 2 + 14, t)], steam, 10);
        puff.castShadow = false;
        puff.userData.home = puff.position.clone();
        puff.userData.phase = random() * 6;
        puffs.push(puff);
      }
    } else if (a.aftermath === 'flooded') {
      const level = mix(2.5, 6.5, random());
      s.box([T - 0.2, 0.2, L - 0.2], [0, level, 0], new THREE.MeshStandardMaterial({ color: new THREE.Color('#3f6f63').lerp(new THREE.Color('#5b6a3a'), wear), roughness: 0.12, metalness: 0.25 }));
      for (let i = 0; i < 22; i++) b.cyl(0.6 + random() * 1.4, 0.6 + random() * 1.4, 0.06, [(random() - 0.5) * (T - 3), level + 0.12, (random() - 0.5) * (L - 3)], ['#7fa04a', '#93ad56', '#5f8a3e'][i % 3], 8);
      b.box([5, 0.5, 1.6], [2, level + 0.3, L * 0.3], '#7a5a3a', [0, 0.6, 0.08]);
    } else if (a.aftermath === 'overgrown') {
      const greens = ['#5f7f3a', '#7a9447', '#4c6b34', '#93a35a'];
      for (let i = 0; i < 60; i++) {
        const inside = random() < 0.65;
        const x = inside ? (random() - 0.5) * (T - 2) : (random() < 0.5 ? -1 : 1) * (T / 2 + 1 + random() * 12), z = (random() - 0.5) * (L + (inside ? 18 : 0)), y = inside ? 0 : H;
        const r = 0.7 + random() * 1.8;
        b.ball(r, [x, y + r * 0.6, z], greens[i % 4], [1, 0.75 + random() * 0.5, 1], 7);
      }
      const tx = (random() - 0.5) * 6, tz = (random() - 0.5) * L * 0.6;
      b.rod([tx, 0, tz], [tx + 0.6, 8, tz + 0.4], 0.5, '#5d4630', 0.25, 6);
      for (let c = 0; c < 5; c++) b.ball(2.4 + random() * 1.4, [tx + (random() - 0.5) * 4, 8 + random() * 3, tz + (random() - 0.5) * 4], greens[c % 4], [1, 0.8, 1], 8);
      for (let v = 0; v < 12; v++) { const side = random() < 0.5 ? -1 : 1, z = (random() - 0.5) * L; b.rod([side * (T / 2 - 0.2), H, z], [side * (T / 2 - 0.25), H - 2 - random() * 7, z + (random() - 0.5) * 2], 0.22, greens[v % 4], 0.08, 4); }
    } else if (a.aftermath === 'repair') {
      b.within([-T / 2 + 1.6, 0, -L * 0.2], [0, 0, 0], () => {
        b.lattice(2.4, 0, H, 4, 0.12, () => '#c9c9c2');
        for (let d = 1; d <= 4; d++) b.box([2.6, 0.12, 9], [0, (d * H) / 4, 0], '#b08a4a');
        for (const z of [-4.4, 4.4]) for (const x of [-1.2, 1.2]) b.rod([x, 0, z], [x, H, z], 0.1, '#c9c9c2', 0.1, 4);
      });
      for (let p = 0; p < 4; p++) { const x = -T / 2 - 3 - random() * 5, z = -L * 0.2 + (p - 1.5) * 3.4; b.box([2.4, 0.25, 2.4], [x, H + 0.13, z], '#a07a45'); b.box([2.1, 1 + random() * 1.2, 2.1], [x, H + 0.9, z], '#eadfc4'); }
      b.box([3, 2.4, 6], [T / 2 + 6, H + 1.2, L * 0.2], '#e9a13a');
      for (let c = 0; c < 5; c++) b.cyl(0.35, 0.5, 1.1, [T / 2 + 2.5, H + 0.55, -6 + c * 3], '#f07a22', 8);
    }
    s.root.add(b.mesh());

    const energy = mix(0.3, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (hot) metal.emissiveIntensity = 0.8 + Math.sin(time * 1.3 * energy) * 0.25;
        for (const puff of puffs) {
          const home = puff.userData.home as THREE.Vector3;
          puff.position.y = home.y + Math.sin(time * 0.6 * energy + puff.userData.phase) * 1.2;
          puff.position.x = home.x + Math.cos(time * 0.4 * energy + puff.userData.phase) * 0.9;
        }
      },
    });
  },
});
