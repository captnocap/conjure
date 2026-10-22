import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const RANGES = {
  naturals: ['#17151a', '#231a17', '#3a2418', '#5a3520', '#7c4a26', '#a26a30', '#c79a4e', '#e6cf8e'],
  ombre: ['#b0122c', '#d9541c', '#e2a21e', '#2a9d74', '#2b62d6', '#7a3fc4', '#d43f9b', '#bfc3c7'],
  rainbow: ['#e3202f', '#f2701d', '#f6d21f', '#57c22b', '#18a7a0', '#2360e0', '#7c3ad6', '#f13fa5'],
  pastels: ['#f6b6cf', '#f8cdb0', '#f7e9a6', '#bfe8c2', '#aee0ea', '#b7c3f2', '#d6b9ef', '#f3f0ea'],
  silvers: ['#1d1d22', '#44454c', '#6f7178', '#9a9ca2', '#c4c6c9', '#e9e9e6', '#b9a3c9', '#6b4a84'],
  reds: ['#1f1416', '#4a1220', '#6e1428', '#8f1b2c', '#b22a22', '#c9521f', '#d97a2b', '#e3a24a'],
} as const;
const BRANDS = {
  gold: { name: 'ROYAL SILK', paper: '#15130f', ink: '#e5c15a', band: '#e5c15a' },
  pink: { name: 'QUEEN B', paper: '#f73f97', ink: '#ffffff', band: '#ffe45c' },
  bargain: { name: 'X-TRA BRAID', paper: '#f4d21c', ink: '#c2161f', band: '#c2161f' },
  natural: { name: 'NATURELLE', paper: '#f4f1e4', ink: '#256b3d', band: '#256b3d' },
} as const;
const SIGNS = { braids: 'BRAIDS', deal: '3 FOR 10', human: '100% HUMAN HAIR', kanekalon: 'KANEKALON', fresh: 'NEW COLOURS IN', none: '' } as const;

function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    range: choice('What colours run across the hooks?', {
      naturals: 'Natural shades graded from jet black through browns to honey blonde, numbered 1 to 613.',
      ombre: 'Two-tone ombre packs: dark roots dipping into bright tips.',
      rainbow: 'The full neon spectrum, red to violet, festival loud.',
      pastels: 'Soft pastel candy shades, pink, mint and lilac.',
      silvers: 'Greys, silvers and white with a smoky plum at the end.',
      reds: 'Burgundy, wine and copper warming to ginger.',
    }),
    pack: choice('What kind of packs hang there?', {
      jumbo: 'Long folded jumbo braid hanks with a rubber band round the middle.',
      curly: 'Short puffy packs of crochet curls.',
      boxed: 'Flat window boxes of weave bundles.',
      loose: 'Unpackaged ponytails of bulk hair, banded at the top and tapering.',
    }),
    picked: score('How picked-over is the board?', ['Fully stocked, every hook heavy', 'A few packs gone', 'Half the hooks thin or empty', 'Nearly bare, the last few packs']),
    mismatch: noul('Does one hook hold a single mismatched pack in the wrong colour?'),
    brand: choice('What do the card headers look like?', {
      gold: 'Black and gold, pretending to be luxury.',
      pink: 'Hot pink with a yellow flash, loud and girlish.',
      bargain: 'Yellow and red, bargain-bin bold.',
      natural: 'Cream and green, earnest and natural.',
    }),
    board: choice('What is the panel?', {
      masonite: 'Classic brown perforated hardboard.',
      white: 'White pegboard in a clean modern shop.',
      slatwall: 'Grey slatwall with horizontal grooves.',
      grid: 'A black wire gridwall panel you can see through.',
    }),
    story: choice('What has just happened here?', {
      tidy: 'Staff have just faced it up: every pack square.',
      rummaged: 'Someone has rummaged: packs askew and a couple dropped on the floor.',
      restock: 'A delivery: an open carton of new packs sits at its foot.',
      sale: 'A sale: yellow starburst price stars stuck among the hooks.',
    }),
    sign: choice('What does the sign across the top say?', {
      braids: 'BRAIDS', deal: '3 FOR 10', human: '100% HUMAN HAIR', kanekalon: 'KANEKALON', fresh: 'NEW COLOURS IN', none: 'There is no sign.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const spec = {
      jumbo: { cols: 8, rows: 2, len: 0.57, wid: 0.125 },
      curly: { cols: 7, rows: 3, len: 0.35, wid: 0.15 },
      boxed: { cols: 6, rows: 3, len: 0.38, wid: 0.175 },
      loose: { cols: 10, rows: 2, len: 0.57, wid: 0.095 },
    }[a.pack];
    const BW = 1.24, BH = 1.3, BY = 0.42; // board width, height and bottom edge
    const top = BY + BH;

    // ---- frame and board
    const steel = s.material(a.board === 'grid' ? '#18181b' : '#8d9296', { metalness: 0.7, roughness: 0.4 });
    for (const x of [-1, 1]) {
      s.box([0.035, top + 0.02, 0.035], [x * (BW / 2 + 0.018), (top + 0.02) / 2, -0.03], steel);
      s.box([0.05, 0.03, 0.5], [x * (BW / 2 + 0.018), 0.015, 0.02], steel);
    }
    s.box([BW, 0.03, 0.03], [0, 0.2, -0.03], steel);
    const grime = mood.wear;
    if (a.board === 'grid') {
      const bars = [];
      for (let i = 0; i <= 16; i++) bars.push({ pos: [-BW / 2 + i * BW / 16, BY + BH / 2, -0.03], size: [0.006, BH, 0.006] });
      for (let j = 0; j <= 17; j++) bars.push({ pos: [0, BY + j * BH / 17, -0.026], size: [BW, 0.006, 0.006] });
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), steel, bars.length);
      const m = new THREE.Matrix4();
      bars.forEach((bar, i) => mesh.setMatrixAt(i, m.makeScale(bar.size[0], bar.size[1], bar.size[2]).setPosition(bar.pos[0], bar.pos[1], bar.pos[2])));
      mesh.castShadow = true;
      s.root.add(mesh);
    } else {
      const base = { masonite: '#9b6b3f', white: '#ecebe4', slatwall: '#b9bbb8' }[a.board];
      const map = canvasTexture(512, 512, (ctx) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 40 + grime * 160; i++) {
          ctx.fillStyle = `rgba(60,45,30,${0.03 + random() * 0.07 * (0.3 + grime)})`;
          ctx.beginPath();
          ctx.ellipse(random() * 512, random() * 512, 10 + random() * 60, 6 + random() * 30, random() * 3, 0, 7);
          ctx.fill();
        }
        if (a.board === 'slatwall') {
          for (let y = 0; y < 512; y += 30) { ctx.fillStyle = '#5d605e'; ctx.fillRect(0, y, 512, 5); ctx.fillStyle = '#d7d9d6'; ctx.fillRect(0, y + 5, 512, 2); }
        } else {
          ctx.fillStyle = a.board === 'white' ? '#8f8d85' : '#3b2512';
          for (let x = 8; x < 512; x += 16) for (let y = 8; y < 512; y += 16) { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); }
        }
      });
      s.box([BW, BH, 0.02], [0, BY + BH / 2, -0.03], s.material('#ffffff', { map, roughness: 0.85 }));
    }
    if (a.sign !== 'none') {
      const brand = BRANDS[a.brand];
      s.box([BW + 0.07, 0.17, 0.03], [0, top + 0.095, -0.03], s.material(brand.paper));
      s.label(SIGNS[a.sign], BW, 0.14, [0, top + 0.095, -0.013], brand.ink, brand.paper);
    }

    // ---- hair colours
    const range = RANGES[a.range];
    const hooks = spec.cols * spec.rows;
    const shadeAt = (f: number) => {
      const p = Math.min(0.9999, Math.max(0, f)) * (range.length - 1);
      const colour = new THREE.Color(range[Math.floor(p)]).lerp(new THREE.Color(range[Math.floor(p) + 1]), p % 1);
      const hsl = { h: 0, s: 0, l: 0 };
      colour.getHSL(hsl);
      return colour.setHSL(hsl.h, hsl.s * mix(0.65, 1.1, mood.cheer), hsl.l).lerp(new THREE.Color('#8d8576'), mood.wear * 0.2);
    };
    const odd = new THREE.Color({ naturals: '#39e04f', ombre: '#f3f0ea', rainbow: '#17151a', pastels: '#17151a', silvers: '#ff3f6f', reds: '#2aa6e8' }[a.range]);

    // ---- packs, collected as instance matrices
    type Pack = { matrix: THREE.Matrix4; colour: THREE.Color };
    const packs: Pack[] = [];
    const dummy = new THREE.Object3D();
    const addPack = (x: number, y: number, z: number, rx: number, ry: number, rz: number, colour: THREE.Color) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(rx, ry, rz);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      packs.push({ matrix: dummy.matrix.clone(), colour });
    };
    const pitchX = BW / spec.cols, pitchY = (BH - 0.06) / spec.rows;
    const emptiness = Math.min(1, a.picked * 0.85 + (1 - mood.density) * 0.25);
    const messy = a.story === 'rummaged' ? 1 : 0.15;
    const hookPoints: { at: readonly [number, number, number]; size: number }[] = [];
    const oddHook = a.mismatch ? Math.floor(random() * hooks) : -1;
    let oddPlaced = false;
    for (let row = 0; row < spec.rows; row++) for (let col = 0; col < spec.cols; col++) {
      const index = row * spec.cols + col;
      const x = -BW / 2 + pitchX * (col + 0.5), y = top - 0.07 - row * pitchY;
      hookPoints.push({ at: [x, y, 0.06], size: 1 });
      let depth = Math.round(mix(5, 0, emptiness) + jitter(1.4 + emptiness * 1.5));
      depth = Math.max(0, Math.min(5, depth));
      if (a.picked < 0.15 && depth < 3) depth = 3;
      const shade = shadeAt((index + 0.5) / hooks);
      for (let k = 0; k < depth; k++) addPack(x + jitter(0.006 * (1 + messy * 3)), y, 0.006 + k * 0.03, 0, jitter(0.05 * messy), jitter(0.03 + messy * 0.16), shade.clone().multiplyScalar(mix(0.92, 1.06, random())));
      if (index === oddHook) {
        addPack(x + jitter(0.01), y, 0.006 + depth * 0.03, 0, jitter(0.1), 0.12 + jitter(0.1), odd);
        oddPlaced = true;
      }
    }
    if (!packs.length) addPack(-BW / 2 + pitchX * 0.5, top - 0.07, 0.004, 0, 0, 0.1, a.mismatch ? odd : shadeAt(0.5));
    void oddPlaced;
    if (a.story === 'rummaged') {
      for (let i = 0; i < 2 + Math.round(random() * 2); i++) addPack(jitter(BW * 0.4), 0.014, 0.2 + random() * 0.12 + spec.len * 0.25, -Math.PI / 2, 0, jitter(1.5), shadeAt(random()));
    }
    if (a.story === 'restock') {
      const cx = jitter(0.3), card = s.material('#b58a56', { roughness: 0.95 });
      s.box([0.5, 0.26, 0.34], [cx, 0.13, 0.3], card);
      s.box([0.46, 0.012, 0.3], [cx, 0.2, 0.3], s.material('#3a2a18'));
      for (const side of [-1, 1]) s.box([0.5, 0.012, 0.17], [cx, 0.26 + 0.05, 0.3 + side * 0.24], card).rotation.x = side * 0.65;
      s.box([0.2, 0.05, 0.004], [cx, 0.14, 0.472], s.material('#f1ead6'));
      const n = 5 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) addPack(cx - 0.19 + i * 0.38 / (n - 1), 0.3 + spec.len * 0.55 + jitter(0.03), 0.3 + jitter(0.07), jitter(0.2), 0, jitter(0.22), shadeAt((i + 0.5) / n));
    }

    // Hooks: one prong and an upturned tip each.
    s.scatter(new THREE.CylinderGeometry(0.0035, 0.0035, 0.19, 6).rotateX(Math.PI / 2), steel, hookPoints);
    s.scatter(new THREE.CylinderGeometry(0.0035, 0.0035, 0.02, 6).translate(0, 0.01, 0.095), steel, hookPoints);

    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, tinted: boolean, offset = new THREE.Matrix4()) => {
      const mesh = new THREE.InstancedMesh(geometry, material, packs.length);
      const m = new THREE.Matrix4();
      packs.forEach((pack, i) => {
        mesh.setMatrixAt(i, m.multiplyMatrices(pack.matrix, offset));
        if (tinted) mesh.setColorAt(i, pack.colour);
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const hairMap = canvasTexture(64, 256, (ctx) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      if (a.range === 'ombre') { gradient.addColorStop(0, '#24201f'); gradient.addColorStop(0.42, '#2c2624'); gradient.addColorStop(0.62, '#f2f2f2'); gradient.addColorStop(1, '#ffffff'); }
      else { gradient.addColorStop(0, '#e8e8e8'); gradient.addColorStop(1, '#ffffff'); }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 256);
      for (let i = 0; i < 46; i++) {
        ctx.strokeStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},${0.08 + random() * 0.14})`;
        ctx.lineWidth = 0.5 + random() * 1.5;
        const x = random() * 64;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + jitter(4), 256); ctx.stroke();
      }
    });
    const hairMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', map: hairMap, roughness: 0.38 + mood.wear * 0.35 });
    const brand = BRANDS[a.brand];
    const headerMap = canvasTexture(256, 128, (ctx) => {
      ctx.fillStyle = brand.paper; ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = brand.band; ctx.fillRect(0, 92, 256, 14);
      ctx.fillStyle = brand.ink; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(brand.name, 128, 56, 236);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(128, 14, 8, 0, 7); ctx.fill();
    });
    const headerMaterial = new THREE.MeshStandardMaterial({ map: headerMap, roughness: 0.6, side: THREE.DoubleSide });
    headerMaterial.color.lerp(new THREE.Color('#b9ad98'), mood.wear * 0.45);
    const shift = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
    const { len, wid } = spec;

    if (a.pack === 'jumbo') {
      instanced(new THREE.CapsuleGeometry(wid / 2, len - wid, 4, 14).scale(1, 1, 0.34), hairMaterial, true, shift(0, -0.05 - len / 2, 0));
      instanced(new THREE.BoxGeometry(wid + 0.006, 0.014, wid * 0.36), new THREE.MeshStandardMaterial({ color: '#f1ede2', roughness: 0.7 }), false, shift(0, -0.05 - len * 0.42, 0));
      instanced(new THREE.PlaneGeometry(wid + 0.01, 0.075), headerMaterial, false, shift(0, -0.022, 0.012));
    } else if (a.pack === 'curly') {
      const lump = new THREE.SphereGeometry(1, 8, 6);
      const curls = new THREE.InstancedMesh(lump, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), packs.length * 6);
      const m = new THREE.Matrix4(), local = new THREE.Matrix4();
      packs.forEach((pack, i) => {
        for (let k = 0; k < 6; k++) {
          const r = wid * mix(0.3, 0.42, random());
          local.makeScale(r, r, r * 0.42).setPosition((k % 2 ? 1 : -1) * wid * 0.17 + jitter(0.01), -0.09 - Math.floor(k / 2) * (len - 0.1) / 3 - jitter(0.012), 0);
          curls.setMatrixAt(i * 6 + k, m.multiplyMatrices(pack.matrix, local));
          curls.setColorAt(i * 6 + k, pack.colour.clone().multiplyScalar(mix(0.82, 1.1, random())));
        }
      });
      curls.castShadow = true;
      s.root.add(curls);
      instanced(new THREE.PlaneGeometry(wid + 0.01, 0.08), headerMaterial, false, shift(0, -0.022, 0.012));
    } else if (a.pack === 'boxed') {
      instanced(new THREE.BoxGeometry(wid, len, 0.018), new THREE.MeshStandardMaterial({ color: brand.paper, roughness: 0.5 }), false, shift(0, -len / 2 + 0.02, 0));
      instanced(new THREE.BoxGeometry(wid * 0.72, len * 0.6, 0.004), hairMaterial, true, shift(0, -len * 0.58 + 0.02, 0.0095));
      instanced(new THREE.PlaneGeometry(wid * 0.92, 0.058), headerMaterial, false, shift(0, -0.024, 0.0096));
    } else {
      instanced(new THREE.CylinderGeometry(wid * 0.48, wid * 0.14, len, 12, 1).scale(1, 1, 0.55), hairMaterial, true, shift(0, -0.03 - len / 2, 0));
      instanced(new THREE.CylinderGeometry(wid * 0.5, wid * 0.5, 0.022, 12).scale(1, 1, 0.6), new THREE.MeshStandardMaterial({ color: brand.band, roughness: 0.6 }), false, shift(0, -0.05, 0));
      instanced(new THREE.TorusGeometry(0.014, 0.0025, 5, 14), new THREE.MeshStandardMaterial({ color: '#e9e4d6', roughness: 0.7 }), false, shift(0, -0.016, 0));
    }

    // ---- sale stars sway a little on their strings
    const stars: THREE.Object3D[] = [];
    if (a.story === 'sale') {
      const yellow = s.material('#ffe21f', { emissive: '#ffd400', emissiveIntensity: 0.25, side: THREE.DoubleSide });
      const shape = new THREE.Shape();
      for (let i = 0; i < 24; i++) {
        const r = i % 2 ? 0.07 : 0.1, t = i / 24 * Math.PI * 2;
        if (i === 0) shape.moveTo(Math.cos(t) * r, Math.sin(t) * r); else shape.lineTo(Math.cos(t) * r, Math.sin(t) * r);
      }
      const texts = ['SALE', '2 FOR 5', '1.99', 'HALF PRICE', '3 FOR 10'];
      for (let i = 0; i < 2 + Math.round(random() * 2); i++) {
        const star = new THREE.Group();
        const burst = s.mesh(new THREE.ShapeGeometry(shape), yellow);
        star.add(burst);
        star.add(s.label(texts[Math.floor(random() * texts.length)], 0.11, 0.045, [0, 0, 0.002], '#c2161f', '#ffe21f'));
        star.position.set(jitter(BW * 0.42), BY + 0.15 + random() * (BH - 0.25), 0.15 + random() * 0.02);
        star.rotation.z = jitter(0.3);
        s.root.add(star);
        stars.push(star);
      }
    }
    const sway = mix(0.01, 0.16, mood.energy), phase = stars.map(() => random() * 6), rest = stars.map((star) => star.rotation.z);
    return s.finish({ update: (_dt, time) => stars.forEach((star, i) => { star.rotation.z = rest[i] + Math.sin(time * 1.4 + phase[i]) * sway; }) });
  },
});
