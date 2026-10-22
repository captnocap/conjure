import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const PALETTES = {
  imperial: ['#c8202a', '#e8b21e', '#f2d36b', '#8e1420'],
  jade: ['#1f9c84', '#3bb9c9', '#b6e0c4', '#136a6a'],
  peacock: ['#2440a8', '#1aa39a', '#c42a7c', '#e8a91c'],
  blossom: ['#e88aa6', '#f4c8cf', '#c85a86', '#f1e4c8'],
  raw: ['#efe7d2', '#e2d4b0', '#f6f1e2', '#d8c79a'],
  royal: ['#5a2a9c', '#8d4fc9', '#c9a227', '#2c1658'],
} as const;

function painted(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, alpha = false) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  if (!alpha) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); }
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    amount: score('How many bales are in the stack?', ['Three, one man\'s load', 'Six, a camel\'s worth', 'Ten, a small fortune piled high']),
    state: choice('What has happened to the load?', {
      sealed: 'Still fully corded and counted: only a torn corner shows a glint of what is inside.',
      slit: 'One bale has been slit open in front and bolts of silk spill from it.',
      displayed: 'Being shown to a buyer: long lengths unrolled side by side down the carpet.',
      plundered: 'Robbed: cords cut, bales tumbled, silk dragged out and left trailing.',
    }),
    silk: choice('What colours is the silk?', {
      imperial: 'Crimson and imperial gold.',
      jade: 'Jade green and turquoise, cool as water.',
      peacock: 'A peacock mix of blue, teal, magenta and saffron.',
      blossom: 'Soft pinks and creams, for a wedding.',
      raw: 'Undyed raw silk, ivory and pale straw.',
      royal: 'Deep purple shot with gold, fit for a court.',
    }),
    wrapper: choice('What are the bales wrapped in?', {
      felt: 'Thick grey felt, the steppe way.',
      hide: 'Brown oiled hide, stitched and weatherproof.',
      canvas: 'Pale canvas, salt-stained from long roads.',
      indigo: 'Dark indigo cloth, a rich house\'s livery.',
    }),
    mark: choice('How are the bales marked?', {
      none: 'Not at all.',
      seal: 'A red square seal stamped on each one.',
      brand: 'A black merchant\'s tamga: a ring with a cross through it.',
      tally: 'White chalk tally strokes.',
    }),
    carpet: choice('What is the stack standing on?', {
      red: 'A red tribal carpet with a pale border and medallions.',
      blue: 'A deep blue carpet with a gold lattice.',
      felt: 'A plain cream felt with a dark edge.',
      bare: 'Nothing, the bare ground.',
    }),
    top: choice('What rests on top of the stack?', {
      nothing: 'Nothing.',
      rope: 'A coil of spare rope.',
      box: 'A small red lacquer box.',
      folded: 'A folded length of the very best silk.',
      scale: 'A hand steelyard for weighing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const grey = new THREE.Color('#8f887c');
    const silks = PALETTES[a.silk].map((hex) => new THREE.Color(hex).lerp(grey, mix(0.3, 0, mood.cheer)));
    const silkMats = silks.map((colour) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.32, metalness: 0.12, emissive: colour, emissiveIntensity: 0.16, side: THREE.DoubleSide }));
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    const wrapColour = { felt: '#8d8980', hide: '#7a5435', canvas: '#cdbf9f', indigo: '#2d3558' }[a.wrapper];
    const speckle = painted(128, 128, (ctx) => {
      ctx.fillStyle = wrapColour; ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 500 + mood.wear * 900; i++) {
        ctx.fillStyle = random() < 0.5 ? `rgba(0,0,0,${0.05 + random() * 0.12})` : `rgba(255,255,255,${0.04 + random() * 0.08})`;
        ctx.fillRect(random() * 128, random() * 128, 1 + random() * 3, 1 + random() * 2);
      }
    });
    const wrap = new THREE.MeshStandardMaterial({ map: speckle, roughness: 1 });
    const cord = s.material(a.wrapper === 'hide' ? '#d6c49a' : '#4c3a26');
    const wood = s.material('#8a6540');
    const L = 0.86, H = 0.42, D = 0.56;
    const baleGeo = new RoundedBoxGeometry(L, H, D, 3, 0.09);
    const strapA = new RoundedBoxGeometry(0.035, H + 0.025, D + 0.025, 2, 0.05);
    const strapB = new RoundedBoxGeometry(L + 0.025, H + 0.025, 0.035, 2, 0.05);
    const markTexture = a.mark === 'none' ? null : painted(128, 128, (ctx) => {
      if (a.mark === 'seal') {
        ctx.fillStyle = '#c0251c'; ctx.fillRect(22, 22, 84, 84);
        ctx.strokeStyle = '#f3e3cf'; ctx.lineWidth = 7;
        ctx.strokeRect(34, 34, 60, 60);
        ctx.beginPath(); ctx.moveTo(64, 34); ctx.lineTo(64, 94); ctx.moveTo(44, 56); ctx.lineTo(84, 56); ctx.moveTo(48, 78); ctx.lineTo(80, 78); ctx.stroke();
      } else if (a.mark === 'brand') {
        ctx.strokeStyle = '#14110e'; ctx.lineWidth = 12;
        ctx.beginPath(); ctx.arc(64, 64, 38, 0, 7); ctx.moveTo(64, 10); ctx.lineTo(64, 118); ctx.moveTo(26, 64); ctx.lineTo(102, 64); ctx.stroke();
      } else {
        ctx.strokeStyle = '#f4f0e6'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        const strokes = 3 + Math.floor(random() * 3);
        for (let i = 0; i < strokes; i++) { ctx.beginPath(); ctx.moveTo(24 + i * 18, 30 + random() * 8); ctx.lineTo(28 + i * 18, 98 - random() * 8); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(14, 84); ctx.lineTo(24 + strokes * 18, 44); ctx.stroke();
      }
    }, true);
    const markMat = markTexture ? new THREE.MeshStandardMaterial({ map: markTexture, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }) : null;

    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    /** A closed bale, origin at the centre of its base. */
    const bale = (corded: boolean, torn: boolean) => {
      const g = new THREE.Group();
      put(g, baleGeo, wrap, 0, H / 2, 0);
      if (corded) {
        for (const x of [-0.22, 0.22]) put(g, strapA, cord, x + (random() - 0.5) * 0.04, H / 2, 0);
        put(g, strapB, cord, 0, H / 2, (random() - 0.5) * 0.08);
        put(g, new THREE.SphereGeometry(0.03, 8, 6), cord, 0.22, H + 0.02, 0);
      } else {
        // Cut cords lie slack over the top.
        for (const x of [-0.2, 0.24]) put(g, new THREE.BoxGeometry(0.03, 0.012, D * 0.7), cord, x, H + 0.008, 0.05).rotation.y = (random() - 0.5) * 0.8;
      }
      if (markMat) put(g, new THREE.PlaneGeometry(0.2, 0.2), markMat, (random() - 0.5) * 0.06, H * 0.5, D / 2 + 0.004).rotation.z = (random() - 0.5) * 0.25;
      if (torn) {
        const gash = put(g, new THREE.SphereGeometry(0.16, 10, 8), pick(silkMats), L / 2 - 0.16, H - 0.1, D / 2 - 0.12);
        gash.scale.set(1, 0.75, 0.9);
      }
      g.scale.set(mix(0.94, 1.04, random()), mix(0.9, 1.06, random()), mix(0.94, 1.04, random()));
      s.root.add(g);
      return g;
    };

    const bolt = (parent: THREE.Object3D, mat: THREE.Material, length: number, radius: number) => {
      const g = new THREE.Group();
      const roll = put(g, new THREE.CylinderGeometry(radius, radius, length, 16), mat);
      roll.rotation.z = Math.PI / 2;
      const core = put(g, new THREE.CylinderGeometry(radius * 0.3, radius * 0.3, length + 0.05, 8), wood);
      core.rotation.z = Math.PI / 2;
      parent.add(g);
      return g;
    };

    /** A length of cloth laid along a path, with soft ripples across it. */
    const ribbon = (path: [number, number, number][], width: number, mat: THREE.Material, ripple = 0.014) => {
      const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
      const N = 44, positions: number[] = [], index: number[] = [];
      const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(), lastSide = new THREE.Vector3(1, 0, 0);
      const phase = random() * 6;
      for (let i = 0; i <= N; i++) {
        const t = i / N, p = curve.getPoint(t), tangent = curve.getTangent(t);
        side.crossVectors(tangent, up);
        if (side.lengthSq() < 0.05) side.copy(lastSide); else lastSide.copy(side.normalize());
        if (side.dot(lastSide) < 0) side.negate();
        for (let j = 0; j <= 4; j++) {
          const u = j / 4 - 0.5;
          const wave = (Math.sin(i * 0.8 + phase + j * 1.1) + 1) * ripple * Math.min(1, t * 6);
          positions.push(p.x + side.x * u * width, p.y + wave, p.z + side.z * u * width);
        }
        if (i < N) for (let j = 0; j < 4; j++) { const k = i * 5 + j; index.push(k, k + 5, k + 1, k + 1, k + 5, k + 6); }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      return put(s.root, geometry, mat);
    };

    /** A bale cut open: the wrapper folded back flat and the bolts stacked in it. */
    const opened = (x: number, z: number, turn: number) => {
      const g = new THREE.Group();
      put(g, new RoundedBoxGeometry(L, 0.1, D, 2, 0.04), wrap, 0, 0.05, 0);
      for (const side of [-1, 1]) {
        const flap = put(g, new THREE.BoxGeometry(L * 0.96, 0.025, 0.3), wrap, 0, 0.1, side * (D / 2 + 0.11));
        flap.rotation.x = side * mix(0.25, 0.6, random());
      }
      const r = 0.062;
      let k = 0;
      for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
        const roll = bolt(g, silkMats[(k++ + Math.floor(random() * 2)) % silkMats.length], L * mix(0.78, 0.9, random()), r);
        roll.position.set((random() - 0.5) * 0.05, 0.1 + r + row * r * 1.75, (i - (3 - row) / 2) * r * 2.05);
        roll.rotation.y = (random() - 0.5) * 0.08;
      }
      g.position.set(x, 0, z);
      g.rotation.y = turn;
      s.root.add(g);
      return g;
    };

    const n = Math.max(3, Math.min(11, Math.round(mix(3, 10, a.amount) + (mood.density - 0.5) * 2)));
    const base = n <= 3 ? 2 : n <= 6 ? 3 : 4;
    const stackZ = a.state === 'sealed' ? 0 : -0.5;
    const tornAt = Math.floor(random() * Math.min(n, base));
    let placed = 0, topY = 0, topX = 0;
    const loose: THREE.Group[] = [];
    for (let row = 0; placed < n; row++) {
      const inRow = Math.min(base - row, n - placed);
      if (inRow <= 0) break;
      for (let i = 0; i < inRow; i++) {
        const fallen = a.state === 'plundered' && row > 0 && random() < 0.75;
        const g = bale(a.state !== 'plundered' || random() < 0.3, a.state === 'sealed' && placed === tornAt);
        if (fallen) loose.push(g);
        else {
          g.position.set((i - (inRow - 1) / 2) * (L + 0.04) + (random() - 0.5) * 0.05, row * (H * 0.97), stackZ + (random() - 0.5) * 0.06);
          g.rotation.y = (random() - 0.5) * 0.1;
          if (row * H + H > topY) { topY = (row + 1) * H * 0.97; topX = g.position.x; }
        }
        placed++;
      }
    }
    loose.forEach((g, index) => {
      const side = index % 2 ? 1 : -1;
      g.position.set(side * (base * L * 0.5 + 0.1 + random() * 0.3), 0, stackZ + 0.5 + random() * 0.8);
      g.rotation.set(random() < 0.5 ? Math.PI / 2 : 0, random() * Math.PI, 0);
      if (g.rotation.x) g.position.y = D / 2;
    });

    const reach = base * (L + 0.04) / 2;
    if (a.state === 'slit' || a.state === 'displayed') {
      opened(a.state === 'slit' ? (random() - 0.5) * 0.3 : -reach + L / 2, 0.38, (random() - 0.5) * 0.2);
      if (a.state === 'slit') {
        // A bolt has rolled off and run out across the carpet, and one length drapes over the edge.
        const x = (random() - 0.5) * 0.3;
        ribbon([[x - 0.1, 0.34, 0.42], [x - 0.08, 0.3, 0.7], [x - 0.04, 0.06, 0.82], [x + 0.1, 0.04, 1.15], [x + 0.02, 0.04, 1.5]], 0.5, silkMats[0]);
        const run = bolt(s.root, silkMats[1], 0.62, 0.05);
        run.position.set(x + 0.75, 0.07, 1.25); run.rotation.y = 0.5;
        ribbon([[x + 0.72, 0.11, 1.24], [x + 0.45, 0.04, 0.95], [x + 0.3, 0.04, 0.7]], 0.58, silkMats[1], 0.01);
        const stray = bolt(s.root, silkMats[2], 0.6, 0.06);
        stray.position.set(x - 0.7, 0.07, 0.95); stray.rotation.y = -0.4 + random() * 0.3;
      } else {
        const lanes = Math.min(silkMats.length, base + 1);
        for (let i = 0; i < lanes; i++) {
          const x = -reach + L + 0.45 + i * 0.5, far = 1.5 + random() * 0.5;
          const roll = bolt(s.root, silkMats[i], 0.44, 0.07 - i * 0.006);
          roll.position.set(x, 0.09, 0.12);
          ribbon([[x, 0.15, 0.12], [x, 0.05, 0.3], [x + (random() - 0.5) * 0.08, 0.04, 0.9], [x + (random() - 0.5) * 0.14, 0.04, far]], 0.42, silkMats[i], 0.012);
        }
      }
    }
    if (a.state === 'plundered') {
      opened(-0.2 + random() * 0.4, 0.45, (random() - 0.5) * 1.2);
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.7 + (random() - 0.5) * 0.3, bend = (random() - 0.5) * 1.6;
        ribbon([[x, 0.3, 0.4], [x + bend * 0.15, 0.06, 0.8], [x + bend * 0.4, 0.045, 1.2], [x + bend * 0.7, 0.045, 1.6 + random() * 0.3]], 0.36 + random() * 0.14, silkMats[i], 0.022);
      }
      for (let i = 0; i < 3; i++) {
        const stray = bolt(s.root, pick(silkMats), 0.6, 0.055);
        stray.position.set((random() - 0.5) * 2.2, 0.08, 0.8 + random() * 0.8); stray.rotation.y = random() * 3;
      }
    }

    if (a.carpet !== 'bare') {
      const w = reach * 2 + 0.9, front = a.state === 'sealed' ? 0.75 : 1.85, back = stackZ - 0.6;
      const [ground, edge, motif] = { red: ['#8b2620', '#e6d2a4', '#1f2b4a'], blue: ['#1f3463', '#d8a93a', '#a3312a'], felt: ['#d9cfb6', '#4a3a2a', '#d9cfb6'] }[a.carpet];
      const texture = painted(512, 512, (ctx) => {
        ctx.fillStyle = ground; ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = edge; ctx.lineWidth = 14; ctx.strokeRect(20, 20, 472, 472);
        if (a.carpet !== 'felt') {
          ctx.strokeStyle = motif; ctx.lineWidth = 8; ctx.strokeRect(44, 44, 424, 424);
          for (let ix = 0; ix < 4; ix++) for (let iy = 0; iy < 4; iy++) {
            const cx = 106 + ix * 100, cy = 106 + iy * 100;
            ctx.fillStyle = (ix + iy) % 2 ? edge : motif;
            ctx.beginPath(); ctx.moveTo(cx, cy - 36); ctx.lineTo(cx + 36, cy); ctx.lineTo(cx, cy + 36); ctx.lineTo(cx - 36, cy); ctx.fill();
            ctx.fillStyle = ground; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 7); ctx.fill();
          }
        }
        for (let i = 0; i < mood.wear * 40; i++) { ctx.fillStyle = 'rgba(120,105,85,0.35)'; ctx.beginPath(); ctx.ellipse(random() * 512, random() * 512, 10 + random() * 40, 6 + random() * 20, random() * 3, 0, 7); ctx.fill(); }
      });
      const rug = s.box([w, 0.025, front - back], [0, 0.0125, (front + back) / 2], new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 }));
      rug.rotation.y = (random() - 0.5) * 0.04;
      if (a.carpet !== 'felt') for (const z of [front + 0.04, back - 0.04]) s.box([w * 0.98, 0.008, 0.09], [0, 0.005, z], s.material('#e5dcc4'));
    }

    if (a.top !== 'nothing' && topY > 0) {
      const y = topY + 0.01;
      if (a.top === 'rope') for (let i = 0; i < 4; i++) { const ring = s.ring(0.17 - i * 0.012, 0.022, [topX, y + 0.022 + i * 0.036, stackZ], s.material('#b89a62')); ring.rotation.x = Math.PI / 2; }
      if (a.top === 'box') {
        s.box([0.34, 0.16, 0.22], [topX, y + 0.08, stackZ], s.material('#a31e1e', { roughness: 0.25 }));
        s.box([0.36, 0.03, 0.24], [topX, y + 0.17, stackZ], s.material('#7d1414', { roughness: 0.25 }));
        s.box([0.05, 0.07, 0.01], [topX, y + 0.12, stackZ + 0.115], s.material('#d9a93c', { metalness: 0.8, roughness: 0.3 }));
      }
      if (a.top === 'folded') for (let i = 0; i < 4; i++) put(s.root, new RoundedBoxGeometry(0.5 - i * 0.03, 0.035, 0.34 - i * 0.02, 2, 0.015), silkMats[i % silkMats.length], topX, y + 0.02 + i * 0.036, stackZ).rotation.y = (random() - 0.5) * 0.2;
      if (a.top === 'scale') {
        const iron = s.material('#3b3632', { metalness: 0.6, roughness: 0.5 });
        s.rod([topX - 0.3, y + 0.02, stackZ + 0.05], [topX + 0.3, y + 0.02, stackZ - 0.02], 0.012, iron);
        s.ball([0.05, 0.05, 0.05], [topX + 0.18, y + 0.05, stackZ - 0.005], s.material('#c99b3a', { metalness: 0.8, roughness: 0.35 }), 10);
        s.ring(0.03, 0.007, [topX - 0.24, y + 0.03, stackZ + 0.043], iron);
      }
    }
    return s.finish();
  },
});
