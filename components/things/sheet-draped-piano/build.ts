import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A sheet of cloth described point by point. */
function cloth(nu: number, nv: number, at: (u: number, v: number) => readonly [number, number, number]) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { positions.push(...at(i / nu, j / nv)); uvs.push(i / nu, j / nv); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const k = j * (nu + 1) + i;
    indices.push(k, k + nu + 1, k + 1, k + 1, k + nu + 1, k + nu + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default defineThing({
  questions: {
    cover: choice('What is it covered with?', {
      sheet: 'A white cotton dust sheet, a ghost of furniture.',
      blanket: 'A quilted blue moving blanket with zigzag stitching.',
      dropcloth: 'A painter\'s canvas drop cloth, spattered.',
      plastic: 'Clear plastic sheeting, the piano dim inside it.',
      floral: 'An old floral bedsheet from the house it came out of.',
    }),
    slipped: score('How far has the cover slipped?', ['Covering everything, only a shape', 'One corner lifted off the keys', 'Half off, the keyboard bare', 'Fallen in a heap on the floor']),
    finish: choice('What is the piano itself like?', {
      ebony: 'Polished black, a serious instrument.',
      walnut: 'Dark walnut with turned legs, a family parlour piano.',
      white: 'Painted white, chipped, a bar or a church hall.',
      oak: 'Honey oak, a school practice room.',
    }),
    bench: choice('Where is the bench?', {
      tucked: 'Pushed in under the keys.',
      out: 'Pulled out and angled, as if someone just stood up.',
      tipped: 'Knocked over on its side.',
      gone: 'There is no bench.',
    }),
    ontop: choice('What has been left on top of it?', {
      nothing: 'Nothing.',
      metronome: 'A wooden metronome.',
      photo: 'A framed photograph, facing out.',
      music: 'A slumped stack of sheet music.',
      flowers: 'A vase of dried flowers.',
      boxes: 'Two cardboard boxes, because it was a flat surface.',
    }),
    tag: choice('What is attached to it?', {
      none: 'Nothing.',
      free: 'A sheet of paper taped on: FREE.',
      lot: 'A yellow auction lot sticker with a number.',
      hold: 'A mover\'s tag on string: DO NOT MOVE.',
      name: 'A luggage label with a family name.',
    }),
    keys: choice('If the keys show, what state are they in?', {
      whole: 'Complete and even.',
      gaps: 'A few keys missing or stuck down.',
      playing: 'A chord held down, as if hands were on it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 1.5, H = 1.26, BACK = -0.3, FRONT = 0.08, KEY = 0.4;
    const tint = { ebony: '#1b1b1e', walnut: '#4f3020', white: '#e6e1d4', oak: '#b98a4e' }[a.finish];
    const wood = s.material(tint, { roughness: a.finish === 'ebony' ? 0.18 : mix(0.4, 0.8, mood.wear), metalness: a.finish === 'ebony' ? 0.15 : 0 });
    const woodDark = s.material(new THREE.Color(tint).multiplyScalar(0.7), { roughness: 0.6 });
    const brass = s.material('#c2a14d', { metalness: 0.8, roughness: 0.3 });

    // ---- The piano.
    s.box([W, H, FRONT - BACK], [0, H / 2, (FRONT + BACK) / 2], wood);
    s.box([W + 0.06, 0.04, FRONT - BACK + 0.05], [0, H + 0.02, (FRONT + BACK) / 2 + 0.01], wood);
    s.box([W - 0.16, 0.36, 0.02], [0, 1.0, FRONT + 0.01], woodDark);
    s.box([W - 0.5, 0.2, 0.015], [0, 0.98, FRONT + 0.05], wood).rotation.x = -0.25;
    s.box([W - 0.5, 0.02, 0.05], [0, 0.875, FRONT + 0.06], wood);
    s.box([W, 0.09, KEY - FRONT], [0, 0.7, (KEY + FRONT) / 2], wood);
    for (const x of [-1, 1]) {
      s.box([0.07, 0.17, KEY - FRONT + 0.02], [x * (W / 2 - 0.035), 0.82, (KEY + FRONT) / 2 + 0.01], wood);
      if (a.finish === 'walnut') s.lathe([[0.03, 0], [0.045, 0.05], [0.03, 0.12], [0.05, 0.3], [0.035, 0.5], [0.05, 0.6], [0.04, 0.655]], wood, [x * (W / 2 - 0.06), 0, KEY - 0.07]);
      else s.box([0.07, 0.655, 0.07], [x * (W / 2 - 0.035), 0.3275, KEY - 0.045], wood);
      s.box([0.08, 0.1, KEY - BACK], [x * (W / 2 - 0.04), 0.05, (KEY + BACK) / 2], wood);
    }
    s.box([W - 0.16, 0.5, 0.02], [0, 0.36, FRONT + 0.01], woodDark);
    for (const x of [-0.12, 0, 0.12]) s.box([0.035, 0.012, 0.11], [x, 0.045, FRONT + 0.07], brass);
    // Keys: one painted strip, and a black-key relief row.
    const keyW = W - 0.16;
    const missing = new Set<number>(), down = new Set<number>();
    if (a.keys === 'gaps') for (let i = 0; i < 3 + mood.wear * 6; i++) missing.add(Math.floor(random() * 52));
    if (a.keys === 'playing') { const root = 14 + Math.floor(random() * 20); for (const k of [0, 2, 4, 7]) down.add(root + k); }
    const ivory = new THREE.Color('#f4f1e6').lerp(new THREE.Color('#d9c48e'), mood.wear * 0.7);
    const keyMap = paint(1040, 64, (ctx) => {
      for (let i = 0; i < 52; i++) {
        ctx.fillStyle = missing.has(i) ? '#3a2a1c' : down.has(i) ? '#b9b4a4' : `#${ivory.clone().offsetHSL(0, 0, (random() - 0.5) * 0.06 * mood.wear).getHexString()}`;
        ctx.fillRect(i * 20, 0, 19, 64);
        ctx.fillStyle = '#5a554a'; ctx.fillRect(i * 20 + 19, 0, 1, 64);
      }
    });
    const keys = s.mesh(new THREE.PlaneGeometry(keyW, 0.15), new THREE.MeshStandardMaterial({ map: keyMap, roughness: 0.35 }), [0, 0.752, KEY - 0.085]);
    keys.rotation.x = -Math.PI / 2;
    s.box([keyW, 0.02, 0.012], [0, 0.742, KEY - 0.005], s.material(`#${ivory.getHexString()}`));
    const blacks: { at: [number, number, number]; size: number }[] = [];
    for (let i = 0; i < 51; i++) if (![2, 6].includes((i + 5) % 7) && !missing.has(i)) blacks.push({ at: [-keyW / 2 + (i + 1) * (keyW / 52), 0.762, KEY - 0.115], size: 1 });
    s.scatter(new THREE.BoxGeometry(keyW / 52 * 0.55, 0.018, 0.09), s.material('#151517', { roughness: 0.3 }), blacks);
    s.box([keyW, 0.06, 0.015], [0, 0.785, KEY - 0.165], woodDark);

    // ---- The cover.
    const slip = a.slipped;
    const onPiano = slip < 0.86;
    const X = W / 2 + 0.05, TOP = H + 0.05;
    const edge = mix(-X - 0.4, X - 0.25, Math.min(1, slip / 0.86)); // everything left of this is bare
    const phase = random() * 6, phase2 = random() * 6;
    const fabric = (() => {
      if (a.cover === 'plastic') return new THREE.MeshPhysicalMaterial({ color: '#dfe8ea', transparent: true, opacity: 0.42, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false });
      const map = paint(256, 256, (ctx) => {
        const base = { sheet: '#ecebe4', blanket: mood.cheer > 0.5 ? '#3b5f9a' : '#34466a', dropcloth: '#cdbf9f', floral: '#e9dcc8' }[a.cover as 'sheet'];
        ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
        if (a.cover === 'blanket') {
          ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
          for (let y = 0; y < 256; y += 32) { ctx.beginPath(); for (let x = 0; x <= 256; x += 16) ctx.lineTo(x, y + ((x / 16) % 2 ? 12 : 0)); ctx.stroke(); }
          ctx.fillStyle = '#1b2233'; ctx.fillRect(0, 0, 256, 8);
        } else if (a.cover === 'dropcloth') {
          for (let i = 0; i < 90; i++) { ctx.fillStyle = ['#f4f2ea', '#7fa6b5', '#c9584a', '#e8cf6a', '#4a6a55'][Math.floor(random() * 5)]; ctx.beginPath(); ctx.arc(random() * 256, random() * 256, 1 + random() * 6, 0, Math.PI * 2); ctx.fill(); }
        } else if (a.cover === 'floral') {
          for (let i = 0; i < 40; i++) {
            const x = (i % 7) * 38 + 14 + random() * 8, y = Math.floor(i / 7) * 44 + 18 + random() * 8;
            ctx.fillStyle = ['#c9697a', '#d9a34a', '#8a6aa8'][i % 3];
            for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.257) * 7, y + Math.sin(k * 1.257) * 7, 5, 0, Math.PI * 2); ctx.fill(); }
            ctx.fillStyle = '#6f8a55'; ctx.fillRect(x - 1, y + 9, 3, 12);
          }
        } else {
          for (let i = 0; i < 12; i++) { ctx.fillStyle = `rgba(120,115,100,${0.04 + mood.wear * 0.1})`; ctx.fillRect(random() * 256, 0, 6 + random() * 20, 256); }
        }
      });
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      return new THREE.MeshStandardMaterial({ map, roughness: 1, side: THREE.DoubleSide });
    })();
    const piece = (geometry: THREE.BufferGeometry, repeatless = false) => { const m = s.mesh(geometry, fabric); void repeatless; return m; };
    const frontZ = (y: number) => (y > 0.84 ? mix(KEY + 0.03, FRONT + 0.06, (y - 0.84) / (TOP - 0.84)) : KEY + 0.03 + (0.84 - y) * 0.06);
    const fold = (t: number, y: number, ph: number) => (Math.sin(t * 11 + ph) * 0.03 + Math.sin(t * 23 + ph * 2) * 0.012) * smooth(TOP, TOP - 0.5, y);
    const bare = (x: number) => smooth(edge + 0.3, edge - 0.05, x); // 1 where uncovered
    const frontHem = (x: number) => mix(0.5 + Math.sin(x * 4 + phase) * 0.05, TOP, bare(x));
    const backHem = (x: number) => mix(0.14 + Math.sin(x * 5 + phase2) * 0.06, TOP, bare(x));
    if (onPiano) {
      const x0 = Math.max(-X, edge - 0.05);
      // Top, with the bare end's edge hanging in a diagonal.
      piece(cloth(10, 4, (u, v) => { const x = mix(x0, X, u); return [x, TOP + Math.sin(u * 9 + phase) * 0.004, mix(BACK - 0.04, FRONT + 0.06, v)]; }));
      // Front and back falls.
      piece(cloth(36, 10, (u, v) => { const x = mix(-X, X, u); const y = mix(TOP, frontHem(x), v); return [x, y, frontZ(y) + fold(x, y, phase) * Math.sin(u * Math.PI)]; }));
      piece(cloth(30, 8, (u, v) => { const x = mix(-X, X, u); const y = mix(TOP, backHem(x), v); return [x, y, BACK - 0.04 - Math.abs(fold(x, y, phase2)) * Math.sin(u * Math.PI)]; }));
      // Ends.
      for (const side of [-1, 1]) {
        const lifted = bare(side * X);
        if (lifted > 0.98) continue;
        piece(cloth(12, 10, (u, v) => {
          const hem = mix(mix(backHem(side * X), frontHem(side * X), u * u), TOP, lifted);
          const y = mix(TOP, hem, v);
          return [side * (X + Math.abs(fold(u * 0.7, y, phase + side)) * Math.sin(u * Math.PI)), y, mix(BACK - 0.04, frontZ(y), u)];
        }));
      }
    }
    if (slip > 0.45) {
      // What has come off lies in a heap at the bare end.
      const heap = Math.min(1, (slip - 0.45) / 0.4);
      const hx = onPiano ? -X - 0.25 : -0.2 + random() * 0.4, hz = onPiano ? 0.1 : KEY + 0.75;
      for (let i = 0; i < 5 + heap * 4; i++) {
        const r = (0.18 + random() * 0.2) * (0.6 + heap * 0.5);
        const lump = s.ball([r * 1.3, r * (0.3 + random() * 0.35), r], [hx + (random() - 0.5) * 0.5, r * 0.15, hz + (random() - 0.5) * 0.5], fabric, 12);
        lump.rotation.y = random() * 3;
      }
    }

    // ---- Bench.
    if (a.bench !== 'gone') {
      const bench = new THREE.Group();
      const add = (m: THREE.Object3D) => { s.root.remove(m); bench.add(m); };
      add(s.box([0.74, 0.05, 0.34], [0, 0.45, 0], wood));
      add(s.box([0.7, 0.04, 0.3], [0, 0.49, 0], s.material(mood.warmth > 0.5 ? '#6d2a2a' : '#2a2a30', { roughness: 0.8 })));
      for (const x of [-0.32, 0.32]) for (const z of [-0.13, 0.13]) add(s.box([0.045, 0.43, 0.045], [x, 0.215, z], wood));
      add(s.box([0.62, 0.05, 0.02], [0, 0.4, 0.13], wood));
      if (a.bench === 'tucked') bench.position.set(0, 0, KEY + 0.1);
      else if (a.bench === 'out') { bench.position.set(0.12, 0, KEY + 0.55); bench.rotation.y = 0.35 + random() * 0.3; }
      else { bench.position.set(0.2, 0.17, KEY + 0.65); bench.rotation.set(Math.PI / 2, 0, 0.3 + random() * 0.5); }
      s.root.add(bench);
    }

    // ---- Left on top, at the covered end.
    const ty = TOP + 0.012, tx = 0.3 + random() * 0.2, tz = -0.1;
    if (a.ontop === 'metronome') {
      const g = s.mesh(new THREE.CylinderGeometry(0.03, 0.075, 0.22, 4), s.material('#6a4326', { roughness: 0.4 }), [tx, ty + 0.11, tz]);
      g.rotation.y = Math.PI / 4;
      s.rod([tx, ty + 0.04, tz + 0.045], [tx + 0.03, ty + 0.2, tz + 0.03], 0.004, brass);
    } else if (a.ontop === 'photo') {
      const f = s.box([0.2, 0.26, 0.015], [tx, ty + 0.125, tz], brass); f.rotation.x = -0.18;
      const p = s.box([0.15, 0.2, 0.004], [tx, ty + 0.127, tz + 0.01], s.material(mood.warmth > 0.5 ? '#c9b99a' : '#aab2b4', { roughness: 0.4 })); p.rotation.x = -0.18;
      const h = s.ball([0.035, 0.045, 0.004], [tx, ty + 0.14, tz + 0.012], s.material('#4a4038')); h.rotation.x = -0.18;
    } else if (a.ontop === 'music') {
      for (let i = 0; i < 7; i++) { const b = s.box([0.23, 0.008, 0.3], [tx + (random() - 0.5) * 0.05, ty + i * 0.009, tz + 0.02 + (random() - 0.5) * 0.04], s.material(i % 3 ? '#efe9d6' : '#dccfa8')); b.rotation.y = (random() - 0.5) * 0.5; }
    } else if (a.ontop === 'flowers') {
      s.lathe([[0.001, 0], [0.05, 0], [0.07, 0.08], [0.03, 0.17], [0.04, 0.2]], s.material('#5d7f8a', { roughness: 0.25 }), [tx, ty, tz]);
      const dry = s.material('#8a7446', { roughness: 1 });
      for (let i = 0; i < 8; i++) { const ex = tx + (random() - 0.5) * 0.22, ey = ty + 0.33 + random() * 0.14, ez = tz + (random() - 0.5) * 0.18; s.rod([tx, ty + 0.18, tz], [ex, ey, ez], 0.003, dry); s.ball([0.022, 0.022, 0.022], [ex, ey, ez], s.material(['#a8684a', '#b99a5a', '#7a5a6a'][i % 3], { roughness: 1 }), 8); }
    } else if (a.ontop === 'boxes') {
      const card = s.material('#b88f5c', { roughness: 0.9 });
      s.box([0.42, 0.28, 0.32], [tx - 0.05, ty + 0.14, tz + 0.01], card).rotation.y = 0.1;
      s.box([0.32, 0.22, 0.28], [tx - 0.02, ty + 0.39, tz + 0.01], s.material('#a67c4b', { roughness: 0.9 })).rotation.y = -0.25;
      s.box([0.05, 0.004, 0.33], [tx - 0.05, ty + 0.282, tz + 0.01], s.material('#d9cfae')).rotation.y = 0.1;
    }

    // ---- Tag.
    const fz = (onPiano ? frontZ(1.0) : FRONT) + 0.05;
    if (a.tag === 'free') { const l = s.label('FREE', 0.3, 0.2, [0.35, 1.0, fz], '#1b1b1b', '#f6f4ea'); l.rotation.set(onPiano ? -0.4 : 0, 0, (random() - 0.5) * 0.15); }
    else if (a.tag === 'lot') { const l = s.label(`LOT ${10 + Math.floor(random() * 480)}`, 0.24, 0.12, [0.4, 1.02, fz], '#1b1b1b', '#f0d23a'); l.rotation.set(onPiano ? -0.4 : 0, 0, (random() - 0.5) * 0.3); }
    else if (a.tag === 'hold' || a.tag === 'name') {
      const lx = W / 2 + 0.07, text = a.tag === 'hold' ? 'DO NOT MOVE' : ['OKAFOR', 'LINDQVIST', 'MORALES', 'HALLORAN', 'NAKAMURA'][Math.floor(random() * 5)];
      s.rod([lx - 0.02, TOP, 0.05], [lx + 0.02, TOP - 0.22, 0.12], 0.003, s.material('#cdbb8c'));
      const l = s.label(text, 0.22, 0.1, [lx + 0.025, TOP - 0.27, 0.12], '#1b1b1b', a.tag === 'hold' ? '#e8742a' : '#e9dcc0');
      l.rotation.y = Math.PI / 2; l.rotation.x = (random() - 0.5) * 0.3;
    }
    // Castors.
    for (const x of [-1, 1]) for (const z of [BACK + 0.05, KEY - 0.06]) s.ball([0.025, 0.025, 0.025], [x * (W / 2 - 0.04), 0.0, z], brass, 8);

    return s.finish();
  },
});
