import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { drapeBox, paint } from './helpers';

const TAU = Math.PI * 2;
type P3 = [number, number, number];
const SCHEME = {
  blush: { cloth: '#f3ecdf', accent: '#e7b3b8', napkin: '#e7b3b8', blooms: ['#f3c6cc', '#fbeee6', '#e59aa8', '#d9788c'] },
  green: { cloth: '#f6f3ea', accent: '#8fa27e', napkin: '#dfe6d2', blooms: ['#fbf9f2', '#e4ecd6', '#fffdf5', '#cfdcb8'] },
  meadow: { cloth: '#a9b89b', accent: '#f3ecdf', napkin: '#f2d16b', blooms: ['#f1c232', '#d9548a', '#6f58c9', '#fbf9f2', '#4a90d9'] },
  navy: { cloth: '#2c3a5c', accent: '#d4ae52', napkin: '#f3ecdf', blooms: ['#fbf9f2', '#f1dfae', '#d4ae52', '#e9e3d0'] },
  burgundy: { cloth: '#6e1f30', accent: '#d9a05a', napkin: '#f0e2c8', blooms: ['#b5492a', '#d98e32', '#e7c27a', '#f0d9c8', '#4a1522'] },
  black: { cloth: '#222226', accent: '#b3202e', napkin: '#b3202e', blooms: ['#b3202e', '#7d1220', '#e9e3d0', '#d8344a'] },
} as const;

export default defineThing({
  questions: {
    moment: choice('What moment of the meal is it?', {
      laid: 'Laid and waiting: folded napkins on clean plates, empty glasses, every chair tucked in.',
      feast: 'Mid-feast: food on the plates, wine poured, bottles and bread on the table, chairs pulled in close.',
      speeches: 'Just after the speeches: chairs pushed back, cue cards and a microphone left on the cloth, a napkin dropped on the floor.',
      'small-hours': 'The small hours: empties, tipped glasses, candles burnt to stubs, a jacket over a chair and one chair on its back.',
    }),
    places: score('How many places are laid?', ['A sweetheart table for two', 'Four', 'Six', 'Eight', 'Ten, the whole wedding party']),
    detail: choice('Is there one telling detail?', {
      none: 'No, nothing out of the ordinary.',
      photo: 'One place kept empty, with a framed photograph, a single flower and a candle where the plate would be.',
      swapped: 'A place card has been swapped: a different coloured card sits askew and the original lies torn on the floor.',
      colouring: "A child's place: an open colouring book, crayons, a plastic cup and a booster cushion on the chair.",
      bouquet: 'The bouquet has been laid down on the table, its ribbons trailing over the edge.',
      laptop: 'An open laptop propped at the end of the table with a face on a video call.',
    }),
    centrepiece: choice('What runs down the middle of the table?', {
      garland: 'A low garland of foliage and blooms threaded with pillar candles.',
      candelabra: 'Tall gilt candelabra with bowls of roses between them.',
      jars: 'A ragged row of jam jars and bud vases with a few stems in each.',
      harvest: 'Pillar candles of every height among pears, grapes and pomegranates.',
      tapers: 'Only a strict row of thin taper candles in brass holders.',
    }),
    scheme: choice('What is the colour scheme?', {
      blush: 'Ivory linen with blush pink.',
      green: 'White linen with white flowers and green foliage.',
      meadow: 'Sage linen with bright meadow flowers and yellow napkins.',
      navy: 'Midnight navy linen with gold and cream.',
      burgundy: 'Deep burgundy linen with rust and ochre.',
      black: 'Black linen with blood-red roses.',
    }),
    chairs: choice('What are the chairs?', {
      gilt: 'Gilt chiavari banquet chairs with ivory seat pads.',
      sash: 'White slatted chairs each tied with a coloured sash and bow.',
      crossback: 'Dark wooden cross-back farmhouse chairs with rush seats.',
      ghost: 'Clear acrylic ghost chairs.',
    }),
    backdrop: choice('What stands behind the table?', {
      none: 'Nothing; the table stands alone.',
      lights: 'A curtain of fairy lights over sheer voile.',
      letters: 'Giant light-up letters spelling LOVE.',
      hedge: 'A clipped green hedge wall with a glowing neon phrase.',
    }),
    swags: noul('Is the front of the table hung with swags of fabric?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const scheme = SCHEME[a.scheme];
    const N = 2 + 2 * Math.round(a.places * 4);
    const pitch = 0.58, L = N * pitch + 0.3, D = 0.86, T = 0.756;
    const late = a.moment === 'small-hours', laid = a.moment === 'laid', feast = a.moment === 'feast', after = a.moment === 'speeches';
    const pick = <V,>(list: readonly V[]) => list[Math.floor(random() * list.length)];

    // Batched parts: every box, cylinder and ball of a kind is one instanced mesh.
    const GEO: Record<string, () => THREE.BufferGeometry> = {
      box: () => new THREE.BoxGeometry(1, 1, 1),
      cyl: () => new THREE.CylinderGeometry(1, 1, 1, 10),
      ball: () => new THREE.SphereGeometry(1, 10, 7),
      leaf: () => { const g = new THREE.SphereGeometry(1, 6, 4); g.scale(1, 0.18, 0.5); return g; },
      bloom: () => new THREE.IcosahedronGeometry(1, 1),
      plate: () => new THREE.LatheGeometry([[0, 0.004], [0.085, 0], [0.13, 0.014], [0.132, 0.018], [0.085, 0.008], [0, 0.008]].map(([x, y]) => new THREE.Vector2(x, y)), 20),
      wine: () => new THREE.LatheGeometry([[0, 0.002], [0.032, 0], [0.032, 0.003], [0.005, 0.008], [0.004, 0.09], [0.02, 0.1], [0.038, 0.13], [0.04, 0.16], [0.034, 0.2]].map(([x, y]) => new THREE.Vector2(x, y)), 12),
      wineFill: () => new THREE.LatheGeometry([[0, 0.1], [0.019, 0.1], [0.036, 0.13], [0.038, 0.15], [0, 0.15]].map(([x, y]) => new THREE.Vector2(x, y)), 12),
      flute: () => new THREE.LatheGeometry([[0, 0.002], [0.03, 0], [0.004, 0.008], [0.004, 0.1], [0.015, 0.12], [0.026, 0.18], [0.025, 0.24]].map(([x, y]) => new THREE.Vector2(x, y)), 12),
      fluteFill: () => new THREE.LatheGeometry([[0, 0.115], [0.012, 0.115], [0.025, 0.18], [0.0245, 0.215], [0, 0.215]].map(([x, y]) => new THREE.Vector2(x, y)), 12),
      bottle: () => new THREE.LatheGeometry([[0, 0], [0.036, 0], [0.038, 0.01], [0.038, 0.16], [0.03, 0.2], [0.014, 0.24], [0.013, 0.3], [0, 0.3]].map(([x, y]) => new THREE.Vector2(x, y)), 12),
    };
    const flame = new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: new THREE.Color().setHSL(mix(0.13, 0.07, mood.warmth), 1, 0.55), emissiveIntensity: 1.8 });
    const bulb = new THREE.MeshStandardMaterial({ color: '#fff1c9', emissive: new THREE.Color().setHSL(mix(0.14, 0.09, mood.warmth), 0.9, 0.6), emissiveIntensity: mix(0.9, 2.2, mood.cheer) });
    const MAT: Record<string, () => THREE.Material> = {
      matte: () => new THREE.MeshStandardMaterial({ roughness: 0.78 + mood.wear * 0.15 }),
      metal: () => new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.8 }),
      china: () => new THREE.MeshStandardMaterial({ roughness: 0.25 }),
      glass: () => new THREE.MeshStandardMaterial({ color: '#e6f2f6', transparent: true, opacity: 0.38, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }),
      ghost: () => new THREE.MeshStandardMaterial({ color: '#cfe3ea', transparent: true, opacity: 0.55, roughness: 0.05 }),
      wet: () => new THREE.MeshStandardMaterial({ roughness: 0.15 }),
      flame: () => flame,
      bulb: () => bulb,
    };
    const batches = new Map<string, { geo: string; mat: string; m: THREE.Matrix4[]; c: THREE.Color[] }>();
    const put = (geo: string, mat: string, m: THREE.Matrix4, color: THREE.ColorRepresentation = '#ffffff') => {
      const key = `${geo}|${mat}`;
      if (!batches.has(key)) batches.set(key, { geo, mat, m: [], c: [] });
      const b = batches.get(key)!;
      b.m.push(m); b.c.push(new THREE.Color(color));
    };
    const M = (p: P3, sc: P3 | number = 1, r: P3 = [0, 0, 0]) => new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], 'YXZ')), typeof sc === 'number' ? new THREE.Vector3(sc, sc, sc) : new THREE.Vector3(...sc));
    const I = new THREE.Matrix4();
    const on = (parent: THREE.Matrix4, local: THREE.Matrix4) => parent.clone().multiply(local);
    const box = (parent: THREE.Matrix4, mat: string, size: P3, p: P3, color: THREE.ColorRepresentation, r: P3 = [0, 0, 0]) => put('box', mat, on(parent, M(p, size, r)), color);
    const cyl = (parent: THREE.Matrix4, mat: string, radius: number, h: number, p: P3, color: THREE.ColorRepresentation, r: P3 = [0, 0, 0]) => put('cyl', mat, on(parent, M(p, [radius, h, radius], r)), color);
    const ball = (parent: THREE.Matrix4, mat: string, size: P3 | number, p: P3, color: THREE.ColorRepresentation) => put('ball', mat, on(parent, M(p, size)), color);

    // The table.
    const cloth = s.material(scheme.cloth, { roughness: 0.85 });
    s.mesh(drapeBox(L, T, D, 0.02, 0.21), cloth, [0, T / 2, 0]);
    box(I, 'matte', [L - 0.2, 0.004, 0.34], [0, T + 0.002, 0.2], scheme.accent);
    if (a.swags) {
      const n = Math.max(1, Math.round(L / 1.0)), seg = 14, verts: number[] = [], index: number[] = [];
      for (let k = 0; k <= n * seg; k++) {
        const f = (k % seg) / seg, x = -L / 2 + k / (n * seg) * L;
        verts.push(x, T - 0.01, D / 2 + 0.05, x, T - 0.1 - 0.24 * Math.sin(f * Math.PI), D / 2 + 0.05 + 0.03 * Math.sin(f * Math.PI));
        if (k < n * seg) index.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setIndex(index);
      geo.computeVertexNormals();
      s.mesh(geo, s.material(scheme.accent, { side: THREE.DoubleSide, roughness: 0.8 }));
      for (let k = 0; k <= n; k++) {
        const x = -L / 2 + k / n * L;
        for (let j = 0; j < 5; j++) put('bloom', 'matte', M([x + (random() - 0.5) * 0.12, T - 0.06 - random() * 0.1, D / 2 + 0.08], 0.035 + random() * 0.025), pick(scheme.blooms));
        box(I, 'matte', [0.05, 0.4, 0.01], [x, T - 0.28, D / 2 + 0.06], scheme.accent);
      }
    }

    // Chairs.
    const chairCol = { gilt: '#c9a13f', sash: '#f4f2ea', crossback: '#7a5230', ghost: '#ffffff' }[a.chairs];
    const chair = (C: THREE.Matrix4, couple: boolean) => {
      const mat = a.chairs === 'gilt' ? 'metal' : a.chairs === 'ghost' ? 'ghost' : 'matte';
      for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) cyl(C, mat, 0.017, 0.46, [x, 0.23, z], chairCol);
      box(C, mat, [0.42, 0.03, 0.42], [0, 0.47, 0], chairCol);
      for (const x of [-0.18, 0.18]) cyl(C, mat, 0.017, 0.5, [x, 0.72, -0.2], chairCol);
      box(C, mat, [0.4, 0.04, 0.03], [0, 0.96, -0.2], chairCol);
      if (a.chairs === 'gilt') {
        box(C, 'matte', [0.37, 0.04, 0.37], [0, 0.505, 0], '#f1ead8');
        box(C, mat, [0.4, 0.03, 0.025], [0, 0.87, -0.2], chairCol);
        box(C, mat, [0.4, 0.03, 0.025], [0, 0.6, -0.2], chairCol);
        for (let k = 0; k < 5; k++) cyl(C, mat, 0.008, 0.26, [-0.12 + k * 0.06, 0.735, -0.2], chairCol);
        for (const z of [-0.18, 0.18]) box(C, mat, [0.36, 0.015, 0.015], [0, 0.2, z], chairCol);
      } else if (a.chairs === 'sash') {
        for (const y of [0.62, 0.74, 0.86]) box(C, mat, [0.38, 0.06, 0.02], [0, y, -0.2], chairCol);
        box(C, 'matte', [0.44, 0.14, 0.06], [0, 0.8, -0.2], scheme.accent);
        ball(C, 'matte', [0.08, 0.06, 0.04], [0, 0.8, -0.25], scheme.accent);
        for (const x of [-0.04, 0.04]) box(C, 'matte', [0.05, 0.3, 0.01], [x, 0.63, -0.25], scheme.accent, [0, 0, x * 3]);
      } else if (a.chairs === 'crossback') {
        box(C, 'matte', [0.38, 0.02, 0.38], [0, 0.49, 0], '#c8a868');
        for (const sgn of [-1, 1]) box(C, mat, [0.5, 0.03, 0.02], [0, 0.74, -0.2], chairCol, [0, 0, sgn * 0.85]);
        for (const z of [-0.18, 0.18]) box(C, mat, [0.36, 0.02, 0.02], [0, 0.2, z], chairCol);
      } else box(C, mat, [0.38, 0.4, 0.02], [0, 0.74, -0.2], chairCol);
      if (couple) for (let j = 0; j < 9; j++) {
        put('bloom', 'matte', on(C, M([-0.16 + j * 0.04 + (random() - 0.5) * 0.03, 0.98 + Math.sin(j / 8 * Math.PI) * 0.03, -0.22], 0.035 + random() * 0.02)), pick(scheme.blooms));
        put('leaf', 'matte', on(C, M([-0.18 + j * 0.045, 0.95, -0.24], 0.07, [random() * 3, random() * 3, 0])), '#5c8046');
      }
    };

    // One glass, standing or tipped, with or without wine.
    const glass = (x: number, z: number, kind: 'wine' | 'flute', fill: boolean, tipped: boolean, colour: string) => {
      const m = tipped ? M([x, T + (kind === 'wine' ? 0.04 : 0.028), z], 1, [0, random() * TAU, Math.PI / 2]) : M([x, T, z]);
      put(kind, 'glass', m);
      if (fill && !tipped) put(kind === 'wine' ? 'wineFill' : 'fluteFill', 'wet', m, colour);
      if (tipped && random() < 0.7) cyl(I, 'wet', 0.05 + random() * 0.04, 0.002, [x + 0.08, T + 0.001, z + 0.03], new THREE.Color(colour).lerp(new THREE.Color(scheme.cloth), 0.55));
    };
    const wines = ['#7a1528', '#f0dc8c', '#f0dc8c', '#e9a79c'];

    // Places.
    const special = a.detail === 'photo' || a.detail === 'swapped' || a.detail === 'colouring' ? (N > 2 ? pick([0, 1, N - 2, N - 1].filter((k) => k !== N / 2 && k !== N / 2 - 1)) : 1) : -1;
    const tippedChair = late ? Math.floor(random() * N) : -1;
    const silver = '#d9dcdc';
    for (let k = 0; k < N; k++) {
      const x = (k - (N - 1) / 2) * pitch;
      const couple = k === N / 2 || k === N / 2 - 1;
      const photo = k === special && a.detail === 'photo', child = k === special && a.detail === 'colouring', swap = k === special && a.detail === 'swapped';
      // Chair behind the place.
      let back = 0.62, yaw = (random() - 0.5) * 0.08, slide = 0;
      if (feast) { back = 0.66 + random() * 0.08; yaw = (random() - 0.5) * 0.3; }
      if (after || late) { back = 0.72 + random() * 0.4; yaw = (random() - 0.5) * 1.1; slide = (random() - 0.5) * 0.2; }
      if (photo) { back = 0.62; yaw = 0; slide = 0; }
      if (swap) { back = 0.95; yaw = 0.5; }
      const C = k === tippedChair && !photo ? M([x + slide, 0.2, -back - 0.75], 1, [-Math.PI / 2 + 0.04, yaw, 0]) : M([x + slide, 0, -back], 1, [0, yaw, 0]);
      chair(C, couple);
      if (child) { box(C, 'matte', [0.34, 0.12, 0.34], [0, 0.57, 0], '#3f9ad6'); ball(C, 'matte', [0.09, 0.1, 0.08], [0.05, 0.72, 0], '#b98a5a'); ball(C, 'matte', 0.065, [0.05, 0.85, 0], '#b98a5a'); for (const ex of [-1, 1]) ball(C, 'matte', 0.028, [0.05 + ex * 0.05, 0.91, 0], '#b98a5a'); }
      if (late && k !== tippedChair && random() < 0.3) { box(C, 'matte', [0.46, 0.4, 0.08], [0, 0.82, -0.21], pick(['#1d1d22', '#3b4a6b', '#55585c'])); for (const ex of [-1, 1]) box(C, 'matte', [0.1, 0.5, 0.07], [ex * 0.24, 0.7, -0.2], '#1d1d22', [0, 0, ex * 0.12]); }
      if ((feast || after) && random() < 0.25) box(C, 'matte', [0.2, 0.03, 0.24], [0.03, 0.535, 0.02], scheme.napkin, [0, random(), 0]);

      // Setting.
      const P = M([x, T, -0.2]);
      if (photo) {
        const portrait = paint(96, 128, (ctx, w, h) => {
          ctx.fillStyle = '#cbb894'; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#6b5a45'; ctx.beginPath(); ctx.arc(w / 2, h * 0.4, 20, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(w / 2, h * 0.98, 36, 40, 0, 0, TAU); ctx.fill();
        });
        const frame = s.box([0.19, 0.25, 0.02], [x, T + 0.12, -0.14], s.material('#b8923a', { metalness: 0.6, roughness: 0.35 }));
        frame.rotation.x = -0.22;
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.21), new THREE.MeshStandardMaterial({ map: portrait, roughness: 0.6 }));
        pic.position.z = 0.011;
        frame.add(pic);
        cyl(I, 'china', 0.03, 0.05, [x + 0.16, T + 0.025, -0.08], '#f7f0df');
        ball(I, 'flame', [0.008, 0.018, 0.008], [x + 0.16, T + 0.065, -0.08], '#ffffff');
        box(I, 'matte', [0.006, 0.006, 0.22], [x - 0.15, T + 0.006, -0.1], '#4a6e3c', [0, 0.3, 0]);
        put('bloom', 'matte', M([x - 0.18, T + 0.025, 0.0], 0.035), a.scheme === 'black' ? '#f4f1e6' : '#b3202e');
      } else if (child) {
        const page = paint(256, 180, (ctx, w, h) => {
          ctx.fillStyle = '#fdfcf6'; ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, w - 4, h - 4);
          ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
          ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(60, 60, 30, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#e2475a'; ctx.fillRect(30, 110, 70, 45); ctx.strokeRect(30, 110, 70, 45);
          ctx.beginPath(); ctx.arc(190, 90, 44, 0, TAU); ctx.stroke();
          ctx.strokeStyle = '#3a8fd9'; ctx.lineWidth = 7; ctx.beginPath();
          for (let j = 0; j < 9; j++) ctx.lineTo(150 + (j % 2) * 80, 55 + j * 9);
          ctx.stroke();
        });
        const book = s.mesh(new THREE.PlaneGeometry(0.36, 0.25), new THREE.MeshStandardMaterial({ map: page, roughness: 0.9 }), [x, T + 0.006, -0.2]);
        book.rotation.set(-Math.PI / 2, 0, 0.15);
        ['#e23b3b', '#f2c230', '#3a8fd9', '#3fae5a', '#8a4fd0', '#f28a30'].forEach((c, j) => cyl(I, 'matte', 0.007, 0.08, [x - 0.12 + j * 0.05 + random() * 0.02, T + 0.008, 0.0 + random() * 0.07], c, [Math.PI / 2, random() * 3, 0]));
        cyl(I, 'matte', 0.035, 0.1, [x + 0.22, T + 0.05, -0.12], '#ff6fa8');
        cyl(I, 'matte', 0.004, 0.16, [x + 0.23, T + 0.13, -0.12], '#ffffff', [0, 0, -0.3]);
      } else {
        if (laid || feast) put('plate', 'metal', on(P, M([0, 0, 0], [1.2, 0.6, 1.2])), a.chairs === 'gilt' || a.scheme === 'navy' ? '#d4ae52' : silver);
        const cleared = (after && random() < 0.6) || (late && random() < 0.7);
        if (!cleared) {
          put('plate', 'china', on(P, M([0, 0.008, 0])), '#fbfaf5');
          if (laid) box(P, 'matte', [0.09, 0.022, 0.17], [0, 0.03, 0], scheme.napkin, [0, (random() - 0.5) * 0.1, 0]);
          if (feast) for (let j = 0; j < 3; j++) ball(P, 'matte', [0.035 + random() * 0.02, 0.014, 0.03 + random() * 0.02], [(random() - 0.5) * 0.11, 0.024, (random() - 0.5) * 0.11], pick(['#6f9a4a', '#8a4a2a', '#e8cf7a', '#c9623a', '#e9e2c8']));
          if (after || late) for (let j = 0; j < 4; j++) ball(P, 'matte', 0.008 + random() * 0.008, [(random() - 0.5) * 0.14, 0.022, (random() - 0.5) * 0.14], pick(['#e8cf9a', '#5a3524', '#f3e9d0']));
        }
        if (!laid && random() < 0.75) ball(I, 'matte', [0.05 + random() * 0.02, 0.03, 0.05], [x + (random() - 0.5) * 0.3, T + 0.03, -0.32 + random() * 0.25], scheme.napkin);
        for (const side of [-1, 1]) if (laid || random() < 0.6) box(P, 'metal', [0.014, 0.004, 0.19], [side * 0.165 + (laid ? 0 : (random() - 0.5) * 0.03), 0.003, laid ? 0 : (random() - 0.5) * 0.05], silver, [0, laid ? 0 : (random() - 0.5) * 0.8, 0]);
        const drunk = late ? 0.25 : after ? 0.6 : feast ? 0.9 : 0;
        glass(x - 0.17, 0.0, 'wine', random() < drunk, late && random() < 0.35, pick(wines));
        glass(x - 0.24, -0.09, 'flute', random() < drunk || after, (late || after) && random() < 0.15, '#f1d98c');
        // Place card and favour.
        const cardY = swap ? 0.035 : 0.03;
        if (!late || random() < 0.5) box(I, 'matte', [0.1, 0.06, 0.012], [x + 0.03, T + cardY, 0.02], '#fbf7ea', [-0.2, laid ? 0 : (random() - 0.5) * 0.7, 0]);
        if (!late || random() < 0.5) box(I, 'matte', [0.06, 0.008, 0.002], [x + 0.03, T + cardY, 0.03], '#3a3a3a', [-0.2, 0, 0]);
        if (swap) {
          box(I, 'matte', [0.13, 0.08, 0.012], [x + 0.06, T + 0.045, 0.06], '#ff5c8a', [-0.25, 0.5, 0.12]);
          box(I, 'matte', [0.06, 0.003, 0.06], [x - 0.1, 0.004, D / 2 + 0.35], '#fbf7ea', [0, 0.4, 0]);
          box(I, 'matte', [0.05, 0.003, 0.06], [x + 0.05, 0.004, D / 2 + 0.5], '#fbf7ea', [0, -0.7, 0]);
        }
        const opened = !laid && random() < (late ? 0.8 : 0.4);
        const F = M([x + 0.2, T, -0.03], 1, [0, random() * 0.8, 0]);
        if (!opened) { box(F, 'matte', [0.065, 0.065, 0.065], [0, 0.033, 0], scheme.accent); box(F, 'matte', [0.068, 0.068, 0.014], [0, 0.033, 0], '#ffffff'); box(F, 'matte', [0.014, 0.068, 0.068], [0, 0.033, 0], '#ffffff'); ball(F, 'matte', 0.014, [0, 0.074, 0], '#ffffff'); }
        else { box(F, 'matte', [0.065, 0.03, 0.065], [0, 0.015, 0], scheme.accent); box(F, 'matte', [0.07, 0.004, 0.07], [0.07, 0.003, 0.03], scheme.accent, [0, 0.6, 0]); }
      }
    }

    // Centrepiece run.
    const cz = 0.2, run = L - 0.5;
    const stub = late ? 0.3 : after ? 0.7 : 1;
    const candle = (x: number, z: number, y: number, radius: number, h: number, lit = true) => {
      cyl(I, 'china', radius, h * stub, [x, y + h * stub / 2, z], '#f7f0df');
      if (lit && !(late && random() < 0.4)) ball(I, 'flame', [radius * 0.45 + 0.003, 0.02, radius * 0.45 + 0.003], [x, y + h * stub + 0.022, z], '#ffffff');
      if (late || mood.wear > 0.6) ball(I, 'china', [radius * 1.6, 0.008, radius * 1.6], [x, y + 0.004, z], '#f7f0df');
    };
    const posy = (x: number, z: number, y: number, r: number, count: number) => {
      for (let j = 0; j < count; j++) {
        const th = random() * TAU, rr = random() * r;
        put('bloom', 'matte', M([x + Math.sin(th) * rr, y + (r - rr) * 0.7 + random() * 0.02, z + Math.cos(th) * rr], 0.03 + random() * 0.025, [random() * 3, random() * 3, 0]), pick(scheme.blooms));
        if (j % 2 === 0) put('leaf', 'matte', M([x + Math.sin(th) * r, y + 0.01, z + Math.cos(th) * r], 0.07, [random() * 0.5, th, random() * 0.5]), pick(['#5c8046', '#4a6e3c', '#7c9a58']));
      }
    };
    if (a.centrepiece === 'garland') {
      const count = Math.round(run * mix(26, 46, mood.density));
      for (let j = 0; j < count; j++) {
        const x = -run / 2 + random() * run, z = cz + (random() - 0.5) * 0.2 + Math.sin(x * 4) * 0.04;
        put('leaf', 'matte', M([x, T + 0.02 + random() * 0.03, z], 0.06 + random() * 0.05, [random() * 0.6, random() * TAU, random() * 0.6]), pick(['#5c8046', '#4a6e3c', '#7c9a58', '#3f5f38']));
        if (j % 3 === 0) put('bloom', 'matte', M([x, T + 0.04 + random() * 0.03, z], 0.03 + random() * 0.03), pick(scheme.blooms));
      }
      for (let x = -run / 2 + 0.2; x < run / 2; x += 0.55) candle(x + (random() - 0.5) * 0.1, cz, T, 0.03, 0.12 + random() * 0.14);
    } else if (a.centrepiece === 'candelabra') {
      const n = Math.max(1, Math.round(run / 1.5));
      for (let j = 0; j < n; j++) {
        const x = n === 1 ? 0 : -run / 2 + 0.35 + j * (run - 0.7) / (n - 1), gold = '#c9a13f';
        cyl(I, 'metal', 0.08, 0.02, [x, T + 0.01, cz], gold); cyl(I, 'metal', 0.014, 0.5, [x, T + 0.26, cz], gold); ball(I, 'metal', 0.03, [x, T + 0.25, cz], gold);
        candle(x, cz, T + 0.52, 0.012, 0.22);
        for (const ex of [-1, 1]) for (const r of [0.13, 0.25]) {
          box(I, 'metal', [0.012, 0.012, 0.012], [x + ex * r, T + 0.5 - r * 0.5, cz], gold);
          box(I, 'metal', [Math.hypot(r, 0.07), 0.012, 0.012], [x + ex * r / 2, T + 0.47 - r * 0.25, cz], gold, [0, 0, ex * -0.3]);
          cyl(I, 'metal', 0.02, 0.015, [x + ex * r, T + 0.5 - r * 0.5, cz], gold);
          candle(x + ex * r, cz, T + 0.51 - r * 0.5, 0.012, 0.2);
        }
        if (j < n - 1 || n === 1) { const bx = n === 1 ? 0.5 : x + (run - 0.7) / (n - 1) / 2; cyl(I, 'metal', 0.1, 0.05, [bx, T + 0.025, cz], gold); posy(bx, cz, T + 0.05, 0.12, 16); }
      }
    } else if (a.centrepiece === 'jars') {
      for (let x = -run / 2; x < run / 2; x += 0.2 + random() * 0.22) {
        const h = 0.08 + random() * 0.1, r = 0.025 + random() * 0.02, z = cz + (random() - 0.5) * 0.16;
        cyl(I, 'glass', r, h, [x, T + h / 2, z], '#ffffff');
        if (late && random() < 0.3) continue;
        for (let j = 0; j < 1 + Math.floor(random() * 3); j++) {
          const lean: P3 = [(random() - 0.5) * 0.08, h + 0.08 + random() * 0.14, (random() - 0.5) * 0.08];
          box(I, 'matte', [0.004, lean[1], 0.004], [x + lean[0] / 2, T + lean[1] / 2, z + lean[2] / 2], '#4a6e3c', [lean[2] * 2, 0, -lean[0] * 2]);
          put('bloom', 'matte', M([x + lean[0], T + lean[1], z + lean[2]], 0.022 + random() * 0.022), pick(scheme.blooms));
        }
      }
    } else if (a.centrepiece === 'harvest') {
      for (let x = -run / 2; x < run / 2; x += 0.16 + random() * 0.14) {
        const z = cz + (random() - 0.5) * 0.18, roll = random();
        if (roll < 0.35) candle(x, z, T, 0.03 + random() * 0.015, 0.08 + random() * 0.26);
        else if (roll < 0.55) { ball(I, 'matte', [0.035, 0.045, 0.035], [x, T + 0.04, z], pick(['#b9c45a', '#d9b84a'])); ball(I, 'matte', 0.022, [x, T + 0.085, z], '#b9c45a'); }
        else if (roll < 0.75) ball(I, 'wet', 0.045, [x, T + 0.045, z], pick(['#8a1a2a', '#a8323a']));
        else for (let j = 0; j < 9; j++) ball(I, 'wet', 0.014, [x + (random() - 0.5) * 0.08, T + 0.014 + random() * 0.02, z + (random() - 0.5) * 0.06], pick(['#4b2458', '#3a1c48', '#9db54a']));
        if (random() < 0.5) put('leaf', 'matte', M([x + 0.05, T + 0.008, z + 0.06], 0.07, [0, random() * TAU, 0]), pick(['#b5492a', '#d98e32', '#7c9a58']));
      }
    } else {
      for (let x = -run / 2; x <= run / 2 + 0.01; x += 0.22) { cyl(I, 'metal', 0.035, 0.012, [x, T + 0.006, cz], '#b8923a'); cyl(I, 'metal', 0.014, 0.05, [x, T + 0.035, cz], '#b8923a'); candle(x, cz, T + 0.06, 0.013, 0.3); }
    }

    // Shared clutter of the meal.
    const bottle = (x: number, z: number, lying: boolean) => {
      const col = pick(['#1e3a27', '#2a2118', '#1e3a27', '#e8d9a8']);
      put('bottle', 'wet', lying ? M([x, T + 0.038, z], 1, [0, random() * TAU, Math.PI / 2]) : M([x, T, z]), col);
    };
    if (feast || after || late) {
      const n = Math.round(N * mix(0.3, 0.7, mood.density));
      for (let j = 0; j < n; j++) bottle((random() - 0.5) * (L - 0.6), -0.02 + random() * 0.1, late && random() < 0.4);
    }
    if (feast) for (let x = -L / 2 + 0.6; x < L / 2 - 0.4; x += 1.4) { cyl(I, 'matte', 0.09, 0.05, [x, T + 0.025, 0.02], '#b08a52'); for (let j = 0; j < 4; j++) ball(I, 'matte', [0.04, 0.03, 0.035], [x + (random() - 0.5) * 0.1, T + 0.06, 0.02 + (random() - 0.5) * 0.1], '#d9a860'); }
    if (after) {
      const cx = (N / 2 - 0.5 - (N - 1) / 2) * pitch + pitch;
      for (let j = 0; j < 5; j++) box(I, 'matte', [0.1, 0.002, 0.15], [cx + j * 0.035 - 0.07, T + 0.004 + j * 0.002, -0.05 + random() * 0.03], '#fdfbf2', [0, -0.4 + j * 0.2, 0]);
      box(I, 'matte', [0.1, 0.002, 0.15], [cx + 0.1, 0.004, D / 2 + 0.3], '#fdfbf2', [0, 0.7, 0]);
      cyl(I, 'matte', 0.018, 0.16, [cx - 0.25, T + 0.02, 0.0], '#2a2a2e', [0, 0.6, Math.PI / 2]);
      ball(I, 'metal', 0.03, [cx - 0.33, T + 0.03, 0.055], '#8a8f94');
      // The dropped napkin.
      const nx = (random() - 0.5) * (L - 1);
      ball(I, 'matte', [0.14, 0.025, 0.11], [nx, 0.02, D / 2 + 0.45], scheme.napkin);
      ball(I, 'matte', [0.07, 0.045, 0.06], [nx + 0.05, 0.04, D / 2 + 0.47], scheme.napkin);
    }
    if (late) {
      const sx = (random() - 0.5) * (L - 1), col = pick(['#c9a13f', '#b3202e', '#1d1d22', '#e9e3d0']);
      for (const ex of [0, 1]) { box(I, 'matte', [0.08, 0.02, 0.22], [sx + ex * 0.2, 0.05 + ex * 0.02, D / 2 + 0.3 + ex * 0.15], col, [ex ? 0 : -0.25, 0.4 + ex * 1.2, ex ? Math.PI / 2 : 0]); cyl(I, 'matte', 0.008, 0.09, [sx + ex * 0.2 - 0.03, 0.045, D / 2 + 0.22 + ex * 0.2], col, [0, 0, ex ? Math.PI / 2 : 0]); }
      const confetti = Math.round(mix(40, 140, mood.density));
      for (let j = 0; j < confetti; j++) { const onTable = random() < 0.5; box(I, 'matte', [0.02, 0.002, 0.02], [(random() - 0.5) * (L + 0.6), onTable ? T + 0.003 : 0.003, onTable ? (random() - 0.5) * D : D / 2 + random() * 0.8], pick([...scheme.blooms, '#d4ae52', '#ffffff']), [0, random() * 3, 0]); }
    }
    if (a.detail === 'bouquet') {
      const bx = (random() - 0.5) * 0.8;
      for (let j = 0; j < 26; j++) { const th = random() * TAU, rr = random() * 0.11; put('bloom', 'matte', M([bx + Math.sin(th) * rr, T + 0.07 + (0.11 - rr) * 0.4, 0.3 + Math.cos(th) * rr * 0.8], 0.035 + random() * 0.025), pick(scheme.blooms)); }
      for (let j = 0; j < 8; j++) put('leaf', 'matte', M([bx + (random() - 0.5) * 0.3, T + 0.04, 0.3 + (random() - 0.5) * 0.24], 0.09, [random(), random() * TAU, random()]), '#4a6e3c');
      cyl(I, 'matte', 0.022, 0.2, [bx - 0.17, T + 0.03, 0.3], '#f6f3ea', [0, 0, Math.PI / 2]);
      for (const ez of [-1, 1]) box(I, 'matte', [0.03, 0.42, 0.004], [bx - 0.2 + ez * 0.05, T - 0.2, D / 2 + 0.06], scheme.accent, [0, 0, ez * 0.08]);
    }
    if (a.detail === 'laptop') {
      const screen = paint(160, 100, (ctx, w, h) => {
        ctx.fillStyle = '#28405c'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#e3b48e'; ctx.beginPath(); ctx.arc(w / 2, h * 0.42, 24, 0, TAU); ctx.fill();
        ctx.fillStyle = '#c8553d'; ctx.beginPath(); ctx.ellipse(w / 2, h * 1.02, 44, 32, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#3d2a1e'; ctx.beginPath(); ctx.arc(w / 2, h * 0.34, 25, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = '#d93a3a'; ctx.fillRect(w - 26, h - 16, 18, 8);
      });
      const lap = new THREE.Group();
      const shell = s.material('#b9bdc2', { metalness: 0.6, roughness: 0.35 });
      lap.add(s.box([0.34, 0.016, 0.24], [0, 0.008, 0], shell));
      const lid = s.box([0.34, 0.23, 0.012], [0, 0.125, -0.14], shell);
      lid.rotation.x = -0.25;
      const view = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.2), new THREE.MeshStandardMaterial({ map: screen, emissiveMap: screen, emissive: '#ffffff', emissiveIntensity: 0.7 }));
      view.position.z = 0.007;
      lid.add(view);
      lap.add(lid);
      lap.position.set(L / 2 - 0.3, T + 0.001, 0.12);
      lap.rotation.y = -0.75;
      s.root.add(lap);
    }

    // Backdrop.
    const bz = -1.75;
    if (a.backdrop === 'lights') {
      const W = L + 0.4, pole = s.material('#3a3a3d', { metalness: 0.5 });
      for (const ex of [-1, 1]) { s.cylinder(0.025, 0.025, 2.5, [ex * W / 2, 1.25, bz], pole, 8); s.cylinder(0.16, 0.18, 0.03, [ex * W / 2, 0.015, bz], pole, 12); }
      s.cylinder(0.02, 0.02, W, [0, 2.5, bz], pole, 8).rotation.z = Math.PI / 2;
      const voile = s.mesh(new THREE.PlaneGeometry(W, 2.45, Math.round(W / 0.1), 1), new THREE.MeshStandardMaterial({ color: '#fbf8f0', transparent: true, opacity: 0.6, side: THREE.DoubleSide, roughness: 0.9 }), [0, 1.27, bz - 0.03]);
      const p = voile.geometry.attributes.position;
      for (let j = 0; j < p.count; j++) p.setZ(j, Math.sin(p.getX(j) * 16) * 0.04);
      voile.geometry.computeVertexNormals();
      for (let x = -W / 2 + 0.1; x < W / 2; x += 0.15) { const len = 1.9 + random() * 0.45; for (let y = 0; y < len; y += 0.15) ball(I, 'bulb', 0.014, [x, 2.45 - y, bz + 0.05], '#ffffff'); }
    }
    if (a.backdrop === 'letters') {
      const k = Math.min(1, Math.max(0.5, L / 4.6)), white = '#f4f1e6';
      const strokes: Record<string, number[][]> = {
        L: [[0.1, 0, 0.1, 1.5], [0.0, 0.1, 0.8, 0.1]],
        O: [[0.1, 0, 0.1, 1.5], [0.7, 0, 0.7, 1.5], [0.0, 0.1, 0.8, 0.1], [0.0, 1.4, 0.8, 1.4]],
        V: [[0.02, 1.5, 0.4, 0], [0.78, 1.5, 0.4, 0]],
        E: [[0.1, 0, 0.1, 1.5], [0.0, 0.1, 0.78, 0.1], [0.1, 0.75, 0.62, 0.75], [0.0, 1.4, 0.78, 1.4]],
      };
      'LOVE'.split('').forEach((ch, idx) => {
        const G = M([(idx - 1.5) * 1.08 * k - 0.4 * k, 0, bz + 0.1], k, [0, (random() - 0.5) * 0.12, 0]);
        for (const [x1, y1, x2, y2] of strokes[ch]) {
          const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
          box(G, 'matte', [len, 0.2, 0.2], [(x1 + x2) / 2, (y1 + y2) / 2, 0], white, [0, 0, ang]);
          for (let d = 0.12; d < len - 0.05; d += 0.17) ball(G, 'bulb', 0.03, [x1 + Math.cos(ang) * d, y1 + Math.sin(ang) * d, 0.11], '#ffffff');
        }
      });
    }
    if (a.backdrop === 'hedge') {
      const W = L + 0.5;
      const leafy = paint(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#3f6a35'; ctx.fillRect(0, 0, w, h);
        for (let j = 0; j < 1400; j++) { ctx.fillStyle = pick(['#4f7f3f', '#35592c', '#5d9048', '#2c4a26']); ctx.beginPath(); ctx.arc(random() * w, random() * h, 2 + random() * 4, 0, TAU); ctx.fill(); }
      });
      leafy.wrapS = leafy.wrapT = THREE.RepeatWrapping;
      leafy.repeat.set(W / 1.5, 1.6);
      s.box([W, 2.4, 0.3], [0, 1.2, bz - 0.1], new THREE.MeshStandardMaterial({ map: leafy, roughness: 0.95 }));
      const phrase = pick(['BETTER TOGETHER', 'JUST MARRIED', 'TIL DEATH', 'HAPPILY EVER AFTER', 'LOVE WINS']);
      const neon = paint(512, 128, (ctx, w, h) => {
        ctx.fillStyle = '#35592c'; ctx.fillRect(0, 0, w, h);
        ctx.font = `italic bold ${Math.min(74, 760 / phrase.length)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ff7fb0'; ctx.shadowBlur = 16; ctx.fillStyle = '#fff0f6';
        ctx.fillText(phrase, w / 2, h / 2); ctx.fillText(phrase, w / 2, h / 2);
      });
      const sw = Math.min(W - 0.3, 3.4);
      const signMat = new THREE.MeshStandardMaterial({ map: neon, emissiveMap: neon, emissive: '#ffffff', emissiveIntensity: mix(0.5, 1.3, mood.cheer) });
      s.mesh(new THREE.PlaneGeometry(sw, sw / 4), signMat, [0, 1.85, bz + 0.06]);
    }

    // Emit the batches.
    for (const b of batches.values()) {
      const mesh = new THREE.InstancedMesh(GEO[b.geo](), MAT[b.mat](), b.m.length);
      b.m.forEach((m, k) => { mesh.setMatrixAt(k, m); mesh.setColorAt(k, b.c[k]); });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
      mesh.castShadow = b.mat !== 'flame' && b.mat !== 'bulb' && b.mat !== 'glass';
      mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    return s.finish({
      update: (_dt, time) => {
        flame.emissiveIntensity = 1.8 + Math.sin(time * 9) * Math.sin(time * 5.3) * 0.7 * mood.energy;
        bulb.emissiveIntensity = mix(0.9, 2.2, mood.cheer) * (1 + Math.sin(time * 2.1) * 0.2 * mood.energy);
      },
    });
  },
});
