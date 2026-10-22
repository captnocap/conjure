import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Batch, blend, field, paint, smooth, taperTube, waves, type P3 } from './tundra';

export default defineThing({
  questions: {
    tusk: choice('What exactly is coming out of the bank?', {
      single: 'One great tusk in a long spiral curve.',
      pair: 'Two tusks still set in a domed skull, the whole head emerging.',
      broken: 'A thick tusk snapped off short, its end splintered.',
      young: 'A small slender tusk from a young animal.',
    }),
    exposure: score('How much of it is showing?', ['Only the tip pokes from the mud', 'About half is free', 'Nearly the whole length lies exposed']),
    ivory: choice('What colour has the ground stained it?', {
      cream: 'Clean cream ivory, as if it were new.',
      mahogany: 'Deep reddish brown, like old polished wood.',
      blue: 'Blue-black mineral stain with pale streaks.',
      bleached: 'Chalky grey-white, cracked and flaking.',
    }),
    bank: choice('What is the bank made of?', {
      mud: 'Dark thawed mud, slumping in wet lobes.',
      ice: 'Frozen silt with bands of clean blue-grey ground ice.',
      gravel: 'A river bank of grey gravel and sand.',
      peat: 'Black peat under a thick mat of rusty sedge.',
    }),
    tools: choice('What did the finders bring?', {
      spade: 'A spade stuck in the mud and a blue tarp.',
      hose: 'A motor pump and a hose to wash the bank away.',
      ropes: 'Ropes round the tusk and a plank sled to drag it out.',
      none: 'Nothing. Nobody has seen it yet.',
    }),
    story: choice('How far along is the dig?', {
      fresh: 'Just uncovered; the mud around it is still smooth.',
      digging: 'Mid-dig, with a heap of fresh spoil and a bucket.',
      wrapped: 'Wrapped in tarp and tied, ready to carry away.',
      abandoned: 'Abandoned: the hole has filled with dark water.',
    }),
    bones: noul('Are other bones showing in the bank as well?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const noise = waves(random, 5), blotch = waves(random, 3);
    const H = mix(1.7, 2.3, random());
    const lobes = Array.from({ length: 6 }, () => ({ x: (random() - 0.5) * 4.6, z: 0.4 + random() * 1.3, sx: 0.5 + random() * 0.5, sz: 0.4 + random() * 0.4, h: 0.2 + random() * 0.35 }));
    const tone = {
      mud: { face: '#4b3e34', wet: '#33291f', top: '#a8742f', band: '#5a4a3c' },
      ice: { face: '#5d5449', wet: '#3f3a34', top: '#a8742f', band: '#9fbcc7' },
      gravel: { face: '#8b877c', wet: '#6b675e', top: '#9a8a4e', band: '#b3ae9f' },
      peat: { face: '#2a211b', wet: '#1c1612', top: '#b0612a', band: '#3d2f24' },
    }[a.bank];
    const colours = { face: new THREE.Color(tone.face), wet: new THREE.Color(tone.wet), top: blend(tone.top, '#7a6a48', mood.wear * 0.4), band: new THREE.Color(tone.band) };
    const notch = { x: -1.0, z: -0.3 };
    const height = (x: number, z: number) => {
      const edge = smooth(1.0, 0.72, Math.hypot(x / 3.2, (z + 0.05) / 2.45) + (noise(x * 1.3 + 9, z * 1.3) - 0.5) * 0.22);
      const wall = smooth(0.7, -0.75, z + (noise(x * 0.8, 3) - 0.5) * 0.9);
      let y = H * wall * (0.7 + 0.3 * smooth(3.0, 1.2, Math.abs(x)));
      for (const l of lobes) y += l.h * Math.exp(-(((x - l.x) / l.sx) ** 2 + ((z - l.z) / l.sz) ** 2));
      y -= 0.55 * Math.exp(-(((x - notch.x) / 0.7) ** 2 + ((z - notch.z) / 0.55) ** 2)) * wall;
      y += (noise(x * 2.2, z * 2.2) - 0.5) * 0.22;
      return y * edge - (1 - edge) * 0.2;
    };
    const bank = field(-3.2, 3.2, -2.5, 2.4, 46, 36, (x, z) => {
      const y = height(x, z);
      const wall = smooth(0.7, -0.75, z);
      const c = colours.face.clone().lerp(colours.wet, blotch(x * 1.5, z * 1.5));
      if (a.bank === 'ice' && wall > 0.15 && wall < 0.95 && Math.sin(y * 7 + noise(x, z) * 3) > 0.25) c.lerp(colours.band, 0.8).lerp(new THREE.Color('#e8f1f2'), noise(x * 3, y * 3) * 0.3);
      if (a.bank === 'gravel') c.lerp(colours.band, noise(x * 9, z * 9 + y * 5));
      if (y > H * 0.68 && wall > 0.93) c.copy(colours.top).offsetHSL((noise(x * 4, z * 4) - 0.5) * 0.06, 0, (blotch(x * 5, z * 5) - 0.5) * 0.18);
      return { y, c };
    });
    s.mesh(bank, paint(0, { flatShading: true, roughness: a.bank === 'gravel' ? 0.95 : 0.7 }));

    const parts = new Batch();
    // Sedge fringe along the top of the bank.
    for (let i = 0; i < 70; i++) {
      const x = (random() - 0.5) * 5.2, z = -0.9 - random() * 1.0, y = height(x, z);
      if (y < H * 0.6) continue;
      const lean = (random() - 0.5) * 0.25;
      parts.rod([x, y - 0.05, z], [x + lean, y + 0.18 + random() * 0.22, z + (random() - 0.5) * 0.2], 0.05, 0.004, blend('#b9782c', '#8a8a3c', random()), 4);
    }

    // The tusk: a spiral that leaves the bank at the notch and sweeps round toward the viewer.
    const ivory = {
      cream: ['#ead9b0', '#f3e8c8', '#b89a68'], mahogany: ['#7a4426', '#a4683a', '#3f2416'], blue: ['#39424f', '#c9c2a8', '#1f2630'], bleached: ['#cfcabb', '#e6e2d6', '#8d8779'],
    }[a.ivory].map((hex) => new THREE.Color(hex));
    const size = a.tusk === 'young' ? 0.8 : a.tusk === 'pair' ? 1.1 : 1.35;
    const out = mix(-1.25, 0.25, a.exposure);
    const course = (side: number): P3[] => ([[-1.5, 1.0, -1.5], [-0.75, 0.72, -0.5], [0.15, 0.42, 0.45], [1.05, 0.5, 0.85], [1.6, 0.98, 0.6], [1.62, 1.5, 0.15], [1.3, 1.8, -0.1]] as P3[])
      .map(([x, y, z]) => [notch.x + ((x + 0.75) * size + out * 0.7) * side + (side < 0 ? -0.5 : 0), 0.3 + (y - 0.3) * size + Math.max(0, -out) * 0.1, notch.z + (z + 0.5) * size + out * 0.7] as P3);
    const cut = a.tusk === 'broken' ? 0.62 : 1;
    const tuskPaths: P3[][] = [];
    for (const side of a.tusk === 'pair' ? [1, -1] : [1]) {
      let full = course(side);
      // Keep the root inside the bank instead of poking out of its far side.
      while (full.length > 4 && (full[1][2] < -1.0 || Math.abs(full[1][0]) > 2.2)) full = full.slice(1);
      const path = cut < 1 ? full.slice(0, 5) : full;
      tuskPaths.push(path);
      const steps = 40, radial = 9;
      const g = taperTube(path, (t) => 0.14 * size * (cut < 1 ? 1.15 - t * 0.25 : Math.max(0.12, 1 - t ** 1.7 * 0.92)), radial, steps);
      const col = new Float32Array(g.getAttribute('position').count * 3);
      for (let i = 0; i < g.getAttribute('position').count; i++) {
        const t = Math.min(1, Math.floor(i / radial) / steps), ring = i % radial;
        const c = ivory[0].clone().lerp(ivory[1], smooth(0.2, 0.9, t)).lerp(ivory[2], (Math.sin(t * 60) > 0.75 ? 0.35 : 0) + (ring % 4 === 0 ? 0.25 + mood.wear * 0.3 : 0));
        c.toArray(col, i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      parts.adopt(g.toNonIndexed());
      g.dispose();
      if (cut < 1) {
        const end = path[path.length - 1];
        for (let i = 0; i < 7; i++) parts.rod(end, [end[0] + 0.18 + random() * 0.2, end[1] + (random() - 0.3) * 0.3, end[2] + (random() - 0.6) * 0.3], 0.05, 0.004, ivory[1], 4);
      }
    }
    if (a.tusk === 'pair') {
      const bone = blend('#9a8260', '#5c4a38', 0.3 + mood.wear * 0.3);
      const at: P3 = [notch.x - 0.25 + out * 0.2, 0.95, notch.z - 0.35 + out * 0.6];
      parts.ball([0.55, 0.62, 0.5], at, bone, [0.3, 0, 0], 12);
      parts.ball([0.3, 0.4, 0.3], [at[0], at[1] - 0.45, at[2] + 0.4], bone, undefined, 10);
      for (const dx of [-0.24, 0.24]) parts.ball([0.11, 0.13, 0.08], [at[0] + dx, at[1] + 0.05, at[2] + 0.45], '#1d1712', undefined, 8);
      parts.ball([0.16, 0.2, 0.08], [at[0], at[1] - 0.2, at[2] + 0.52], '#1d1712', undefined, 8);
    }
    const mid = tuskPaths[0][3];

    if (a.bones) {
      const bone = blend('#b39a72', '#5c4a38', 0.25 + mood.wear * 0.35);
      for (let i = 0; i < 5; i++) {
        const x = 1.0 + i * 0.32, y = 0.9 + random() * 0.3, z = -0.45 + (noise(x, 1) - 0.5) * 0.5;
        parts.tube([[x, y + 0.5, z - 0.5], [x + 0.05, y + 0.25, z + 0.25], [x + 0.1, y - 0.3, z + 0.55], [x + 0.12, y - 0.7, z + 0.35]], (t) => 0.04 - t * 0.012, bone, 5, 12);
      }
      for (let i = 0; i < 3; i++) parts.ball([0.13, 0.1, 0.13], [-2.0 + i * 0.3, height(-2.0 + i * 0.3, 0.2) + 0.04, 0.2], bone, [random(), random(), 0], 7);
      parts.rod([-2.3, 0.2, 1.3], [-1.5, 0.28, 1.6], 0.07, 0.06, bone, 7);
      for (const p of [[-2.3, 0.2, 1.3], [-1.5, 0.28, 1.6]] as P3[]) parts.ball([0.12, 0.1, 0.11], p, bone, undefined, 7);
    }

    // Tools and the state of the dig.
    const tarp = (wrapAround: boolean) => {
      if (wrapAround) {
        const path = tuskPaths[0].slice(1, 5);
        parts.tube(path, () => 0.2 * size, '#2f6ea8', 8, 20);
        for (const t of [1, 2]) parts.add(new THREE.TorusGeometry(0.21 * size, 0.025, 5, 12), '#e0d3aa', new THREE.Matrix4().makeRotationY(t === 1 ? 0.9 : 0.1).setPosition(...path[t]));
        return;
      }
      const g = new THREE.PlaneGeometry(1.9, 1.4, 9, 7);
      g.rotateX(-Math.PI / 2);
      const pos = g.getAttribute('position');
      for (let i = 0; i < pos.count; i++) pos.setY(i, 0.04 + noise(pos.getX(i) * 4, pos.getZ(i) * 4) * 0.14 + (random() - 0.5) * 0.03);
      g.rotateY(0.4);
      g.translate(1.6, height(1.6, 1.75), 1.75);
      g.computeVertexNormals();
      s.mesh(g, new THREE.MeshStandardMaterial({ color: blend('#2f6ea8', '#6d7f8c', mood.wear * 0.6), roughness: 0.55, flatShading: true, side: THREE.DoubleSide }));
    };
    const spade = (x: number, z: number, fallen: boolean) => {
      const y = height(x, z);
      if (fallen) {
        parts.rod([x, y + 0.05, z], [x + 1.15, y + 0.07, z + 0.3], 0.025, 0.025, '#b08a56', 6);
        parts.box([0.3, 0.02, 0.22], [x + 1.3, y + 0.05, z + 0.34], '#70757a', [0, -0.25, 0]);
      } else {
        parts.rod([x, y + 0.2, z], [x + 0.22, y + 1.3, z - 0.1], 0.025, 0.025, '#b08a56', 6);
        parts.rod([x + 0.14, y + 1.3, z - 0.1], [x + 0.3, y + 1.3, z - 0.1], 0.022, 0.022, '#b08a56', 5);
        parts.box([0.24, 0.34, 0.02], [x - 0.02, y + 0.1, z + 0.01], '#70757a', [0, 0, -0.19]);
      }
    };
    if (a.story === 'wrapped' && a.tools !== 'none') tarp(true);
    if (a.tools === 'spade') {
      spade(-1.6, 1.25, a.story === 'abandoned');
      if (a.story !== 'wrapped') tarp(false);
    } else if (a.tools === 'hose') {
      const px = 2.2, pz = 1.6, py = height(px, pz);
      parts.box([0.7, 0.35, 0.45], [px, py + 0.3, pz], '#d9732b');
      parts.drum(0.14, 0.3, [px + 0.1, py + 0.6, pz], '#2e2c2a', undefined, 8);
      parts.box([0.8, 0.05, 0.55], [px, py + 0.1, pz], '#2e2c2a');
      parts.drum(0.06, 0.3, [px - 0.25, py + 0.6, pz], '#8d9093', undefined, 6);
      const hose: P3[] = [[px - 0.35, py + 0.3, pz], [1.3, 0.25, 1.9], [0.2, 0.2, 1.6], [-0.6, 0.3, 1.9], [-1.3, 0.45, 1.2], [-1.2, 0.75, 0.5]];
      parts.tube(hose, () => 0.045, '#c9a227', 6, 36);
      parts.rod([-1.2, 0.75, 0.5], [-1.05, 0.88, 0.22], 0.05, 0.025, '#3a3a3a', 6);
      spade(-2.0, 1.0, a.story === 'abandoned');
    } else if (a.tools === 'ropes') {
      for (const t of [2, 3]) parts.add(new THREE.TorusGeometry(0.17 * size, 0.03, 5, 12), '#e0d3aa', new THREE.Matrix4().makeRotationY(t === 2 ? 0.9 : 0.1).setPosition(...tuskPaths[0][t]));
      parts.tube([mid, [mid[0] + 0.5, 0.2, mid[2] + 0.5], [1.5, 0.12, 1.9], [2.2, 0.2, 1.7]], () => 0.022, '#e0d3aa', 5, 20);
      const sy = height(2.2, 1.5);
      parts.box([1.6, 0.05, 0.6], [2.1, sy + 0.14, 1.5], '#b08a56', [0, 0.5, 0]);
      for (const dz of [-0.22, 0.22]) parts.box([1.7, 0.1, 0.06], [2.1 + dz * 0.5, sy + 0.06, 1.5 + dz], '#8a6a44', [0, 0.5, 0]);
    }
    if (a.story === 'digging') {
      const mudTint = colours.wet.clone().lerp(colours.face, 0.5);
      parts.add(new THREE.ConeGeometry(0.75, 0.6, 9), mudTint, new THREE.Matrix4().makeTranslation(-0.2, height(-0.2, 1.75) + 0.25, 1.75));
      parts.add(new THREE.ConeGeometry(0.45, 0.4, 8), mudTint, new THREE.Matrix4().makeTranslation(0.45, height(0.45, 1.9) + 0.15, 1.9));
      parts.drum(0.13, 0.28, [0.95, height(0.95, 1.55) + 0.16, 1.55], '#b8322a', undefined, 9, 0.16);
    }
    s.root.add(parts.mesh(paint(mood.wear * 0.5, { side: THREE.DoubleSide })));
    if (a.story === 'abandoned') {
      const water = s.mesh(new THREE.CircleGeometry(1.25, 22), new THREE.MeshStandardMaterial({ color: '#33434c', roughness: 0.12, metalness: 0.35 }), [0.4, 0.33, 0.75]);
      water.rotation.x = -Math.PI / 2;
      water.scale.set(1.25, 0.8, 1);
    }
    const thing = s.finish();
    // The skirt of the bank dips below the ground on purpose so its outline is irregular.
    thing.object.position.y = 0;
    return thing;
  },
});
