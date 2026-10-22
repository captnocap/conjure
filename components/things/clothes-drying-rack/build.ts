import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(w: number, h: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface Rail { x0: number; x1: number; y0: number; y1: number; z: number }
type P = readonly [number, number];

/** Half outlines, from the neck outward and down to the hem; mirrored to make the garment. Metres. */
const OUTLINES: Record<string, { half: P[]; dip: number; pegs: number }> = {
  shirt: { half: [[0.05, 0], [0.21, -0.045], [0.33, -0.5], [0.26, -0.53], [0.185, -0.2], [0.195, -0.68]], dip: 0.06, pegs: 0.15 },
  tee: { half: [[0.07, 0], [0.2, -0.03], [0.3, -0.15], [0.24, -0.21], [0.185, -0.14], [0.19, -0.52]], dip: 0.04, pegs: 0.15 },
  vest: { half: [[0.06, 0], [0.15, -0.01], [0.16, -0.2], [0.2, -0.26], [0.2, -0.54]], dip: 0.14, pegs: 0.11 },
  dress: { half: [[0.045, 0], [0.12, -0.015], [0.135, -0.19], [0.105, -0.33], [0.2, -0.6], [0.27, -0.84]], dip: 0.09, pegs: 0.09 },
  onesie: { half: [[0.035, 0], [0.09, -0.012], [0.15, -0.065], [0.12, -0.105], [0.088, -0.075], [0.09, -0.2], [0.035, -0.275]], dip: 0.025, pegs: 0.07 },
  shorts: { half: [[0.0, 0], [0.17, 0], [0.2, -0.3], [0.04, -0.3], [0.0, -0.14]], dip: 0, pegs: 0.13 },
  bib: { half: [[0.03, 0], [0.075, -0.01], [0.095, -0.1], [0.06, -0.17]], dip: 0.06, pegs: 0.05 },
};

function garmentShape(key: string, scale: number) {
  const { half, dip } = OUTLINES[key];
  const shape = new THREE.Shape();
  shape.moveTo(0, -dip * scale);
  for (const [x, y] of half) shape.lineTo(x * scale, y * scale);
  for (const [x, y] of [...half].reverse()) if (x > 0) shape.lineTo(-x * scale, y * scale);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

const PALETTES = {
  darks: ['#23262c', '#2a3352', '#4a4f57', '#3d2f3d', '#5c2b2b'],
  brights: ['#d8402c', '#f2b632', '#2f8fd8', '#3aa86b', '#e36aa8', '#7a4fc8'],
  pastels: ['#f3c6cf', '#cfe3f3', '#f6ecc0', '#d3ecd3', '#e3d3f1'],
  whites: ['#f1efe8', '#e7e3d6', '#dfe4e8', '#efe6d8'],
  greys: ['#9a9a98', '#b9b7b0', '#7d8086', '#c9c4b6', '#8d8577'],
} as const;

export default defineThing({
  questions: {
    frame: choice('What kind of airer is it?', {
      winged: 'A white wire airer with two fold-out wings, the kind every flat has.',
      tower: 'A tall three-tier tower on castors, chrome tubes.',
      wooden: 'An old wooden A-frame clothes horse with dowel rails.',
    }),
    load: choice('What is drying on it?', {
      mixed: 'One person’s wash: socks, a work shirt on a hanger and a single towel.',
      uniform: 'The same work uniform three times over, ready for the week’s shifts.',
      baby: 'Rows of tiny babygrows, bibs, muslins and impossibly small socks.',
      dress: 'One dress on a hanger and nothing else.',
      sports: 'A football kit: matching shirts, shorts and long socks.',
      linen: 'Bed sheets and towels draped over the whole frame like a tent.',
      empty: 'Nothing: bare rails and a few pegs left clipped on.',
    }),
    wet: score('How wet is the washing?', ['Bone dry and stiff, forgotten for days', 'Nearly dry', 'Damp and heavy', 'Dripping steadily onto the floor']),
    amount: score('How much is hung on it?', ['A few lonely items', 'Half the rails', 'Every rail used', 'Overloaded, things doubled up']),
    palette: choice('What colours are the clothes?', {
      darks: 'Blacks, navies and charcoal.',
      brights: 'Loud primary colours.',
      pastels: 'Soft washed pastels.',
      whites: 'Whites and creams.',
      greys: 'Greyed-out, over-washed neutrals.',
    }),
    under: choice('What sits under or beside it?', {
      basket: 'A plastic laundry basket with more wet washing waiting.',
      towel: 'An old towel spread on the floor to catch the drips.',
      dehumidifier: 'A humming white dehumidifier pointed at the clothes.',
      pegs: 'A tub of clothes pegs, some spilled.',
      nothing: 'Nothing.',
    }),
    fallen: noul('Has something slipped off and landed on the floor?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const wet = a.wet, stiff = Math.max(0, 0.35 - wet) / 0.35;
    const sat = mix(0.6, 1.1, mood.cheer);
    const cloth = (hex: string, extra: THREE.MeshStandardMaterialParameters = {}) => {
      const c = new THREE.Color(hex);
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      c.setHSL(hsl.h, Math.min(1, hsl.s * sat * mix(1, 0.6, mood.wear)), hsl.l * mix(1.04, 0.74, wet));
      return new THREE.MeshStandardMaterial({ color: c, roughness: mix(0.98, 0.6, wet), side: THREE.DoubleSide, ...extra });
    };
    const colours = PALETTES[a.palette];
    const yAt = (r: Rail, x: number) => r.y0 + (r.y1 - r.y0) * (x - r.x0) / (r.x1 - r.x0 || 1);

    // ----- Frame -----
    const rust = mood.wear;
    const rails: Rail[] = [];
    let hang: { rail: Rail; x: number };
    let halfSpan = 0.5, depth = 0.3;
    if (a.frame === 'winged') {
      const steel = s.material(new THREE.Color(pick(['#9fadb8', '#b4bcc2', '#8fa3b5'])).lerp(new THREE.Color('#a8714a'), rust * 0.35), { roughness: 0.4, metalness: 0.45 });
      const joint = s.material(pick(['#2f6fc8', '#8a8f96', '#d8402c', '#3aa86b']), { roughness: 0.5 });
      const H = 0.9, L = 0.5, Dz = 0.27, wing = 0.44, ang = mix(0.3, 0.5, random());
      const n = 7;
      for (let i = 0; i < n; i++) {
        const z = -Dz + i * (2 * Dz) / (n - 1);
        rails.push({ x0: -L, x1: L, y0: H, y1: H, z });
        for (const k of [-1, 1]) rails.push({ x0: k * L, x1: k * (L + wing * Math.cos(ang)), y0: H, y1: H + wing * Math.sin(ang), z });
      }
      for (const r of rails) s.rod([r.x0, r.y0, r.z], [r.x1, r.y1, r.z], 0.006, steel);
      for (const k of [-1, 1]) {
        s.rod([k * L, H, -Dz], [k * L, H, Dz], 0.01, steel);
        const tipX = k * (L + wing * Math.cos(ang)), tipY = H + wing * Math.sin(ang);
        s.rod([tipX, tipY, -Dz], [tipX, tipY, Dz], 0.009, steel);
        for (const z of [-Dz, Dz]) { s.ball([0.014, 0.014, 0.014], [k * L, H, z], joint, 8); s.rod([k * (L + wing * 0.55 * Math.cos(ang)), H + wing * 0.55 * Math.sin(ang), z], [k * 0.37, H - 0.22, z * 0.55], 0.004, steel); }
        // Crossed legs.
        const lx = k * 0.37;
        s.rod([lx, 0.01, -0.3], [lx, H, 0.2], 0.012, steel);
        s.rod([lx, 0.01, 0.3], [lx, H, -0.2], 0.012, steel);
        s.ball([0.013, 0.013, 0.013], [lx, H * 0.6, 0], joint, 8);
      }
      for (const z of [-0.3, 0.3]) { s.rod([-0.37, 0.01, z], [0.37, 0.01, z], 0.012, steel); for (const k of [-1, 1]) s.ball([0.016, 0.012, 0.016], [k * 0.37, 0.012, z], joint, 8); }
      const front = rails.filter((r) => r.x0 === L && r.z === Dz)[0];
      hang = { rail: front, x: front.x1 - 0.14 };
      halfSpan = L + wing; depth = 0.3;
    } else if (a.frame === 'tower') {
      const chrome = s.material(new THREE.Color('#d5d9dc').lerp(new THREE.Color('#9a6a48'), rust * 0.35), { roughness: 0.25, metalness: 0.8 });
      const W = 0.36, Dz = 0.2;
      for (const x of [-W, W]) for (const z of [-Dz, Dz]) { s.rod([x, 0.05, z], [x, 1.3, z], 0.009, chrome); s.ball([0.022, 0.025, 0.022], [x, 0.025, z], s.material('#2a2c30'), 10); s.ball([0.013, 0.013, 0.013], [x, 1.3, z], s.material('#2a2c30'), 8); }
      for (const y of [0.45, 0.85, 1.25]) {
        for (const x of [-W, W]) s.rod([x, y, -Dz], [x, y, Dz], 0.006, chrome);
        for (let i = 0; i < 5; i++) { const z = -Dz + i * Dz / 2; rails.push({ x0: -W, x1: W, y0: y, y1: y, z }); s.rod([-W, y, z], [W, y, z], 0.004, chrome); }
      }
      hang = { rail: rails[rails.length - 1], x: 0.12 };
      halfSpan = W; depth = Dz;
    } else {
      const wood = s.material(new THREE.Color('#c9a56c').lerp(new THREE.Color('#8a7358'), rust * 0.6), { roughness: 0.85 });
      const W = 0.38, H = 1.05, B = 0.33;
      for (const x of [-W, W]) for (const k of [-1, 1]) s.rod([x, 0, k * B], [x, H + 0.03, -k * 0.015], 0.013, wood);
      for (const h of [0.3, 0.56, 0.82]) for (const k of [-1, 1]) { const z = k * B * (1 - h / H); rails.push({ x0: -W, x1: W, y0: h, y1: h, z }); s.rod([-W - 0.02, h, z], [W + 0.02, h, z], 0.008, wood); }
      rails.push({ x0: -W, x1: W, y0: H, y1: H, z: 0 });
      s.rod([-W - 0.02, H, 0], [W + 0.02, H, 0], 0.009, wood);
      for (const x of [-W, W]) s.rod([x, 0.2, -B * 0.8], [x, 0.2, B * 0.8], 0.003, s.material('#e9e2cc'));
      hang = { rail: rails[rails.length - 1], x: 0.1 };
      halfSpan = W; depth = B;
    }
    const lowest = (r: Rail) => Math.min(r.y0, r.y1) - 0.035;

    // ----- Ways of hanging things -----
    const pegPoints: { at: [number, number, number]; size: number; color: THREE.ColorRepresentation }[] = [];
    const pegColours = ['#d8402c', '#f2b632', '#2f8fd8', '#3aa86b', '#e9e2cc'];
    const hems: [number, number, number][] = [];
    const swing: THREE.Object3D[] = [];
    const peg = (x: number, y: number, z: number) => pegPoints.push({ at: [x, y + 0.012, z], size: 1, color: pick(pegColours) });

    const drape = (rail: Rail, xc: number, w: number, front: number, back: number, material: THREE.Material) => {
      const reach = lowest(rail);
      const Lf = Math.min(front, reach), Lb = Math.min(back, reach);
      const g = new THREE.PlaneGeometry(w, Lf + Lb, Math.max(2, Math.round(w * 30)), 14);
      const p = g.attributes.position;
      const phase = random() * 6, flare = stiff * (0.08 + random() * 0.1);
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i), run = p.getY(i) + (Lf + Lb) / 2 - Lb;
        const side = Math.max(-1, Math.min(1, run / 0.012));
        const fall = Math.abs(run);
        p.setXYZ(i, xc + u, yAt(rail, xc + u) + 0.007 - fall,
          rail.z + side * (0.007 + flare * fall) + Math.sin(u * 38 + phase) * 0.009 * Math.min(1, fall / 0.12) * mix(1.3, 0.5, wet));
      }
      g.computeVertexNormals();
      s.mesh(g, material);
      hems.push([xc + (random() - 0.5) * w * 0.8, yAt(rail, xc) - Lf, rail.z + 0.01]);
    };

    const hung = (rail: Rail, xc: number, key: string, scale: number, material: THREE.Material, hanger = false) => {
      const reach = lowest(rail) - (hanger ? 0.1 : 0);
      const bottom = -Math.min(...OUTLINES[key].half.map((q) => q[1]));
      const k = Math.min(scale, reach / bottom);
      const pivot = new THREE.Group();
      pivot.position.set(xc, yAt(rail, xc), rail.z + 0.006);
      pivot.rotation.x = stiff * (random() - 0.3) * 0.25;
      pivot.rotation.y = (random() - 0.5) * 0.12;
      s.root.add(pivot);
      const mesh = new THREE.Mesh(garmentShape(key, k), material);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.position.y = hanger ? -0.09 : -0.004;
      pivot.add(mesh);
      const reachX = OUTLINES[key].pegs * k;
      if (hanger) {
        const wire = s.material('#8d9298', { metalness: 0.7, roughness: 0.3 });
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.003, 6, 16, Math.PI * 1.4), wire);
        hook.position.y = -0.016; hook.rotation.z = -0.4; pivot.add(hook);
        for (const sgn of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 6), wire);
          const from = new THREE.Vector3(0, -0.04, 0), to = new THREE.Vector3(sgn * reachX * 1.25, -0.105, 0);
          arm.position.copy(from).add(to).multiplyScalar(0.5);
          arm.scale.y = from.distanceTo(to);
          arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
          pivot.add(arm);
        }
      } else for (const sgn of [-1, 1]) peg(xc + sgn * reachX * 0.8, yAt(rail, xc), rail.z + 0.006);
      swing.push(pivot);
      hems.push([xc + (random() - 0.5) * reachX, yAt(rail, xc) - bottom * k - (hanger ? 0.09 : 0), rail.z + 0.01]);
      return { mesh, k };
    };
    const trim = (parent: THREE.Object3D, w: number, h: number, x: number, y: number, hex: string, emissive = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6, side: THREE.DoubleSide, emissive: hex, emissiveIntensity: emissive }));
      m.position.set(x, y, 0.002);
      parent.add(m);
      const twin = m.clone(); twin.position.z = -0.002; parent.add(twin);
    };
    const towelCloth = (hex: string) => cloth('#ffffff', {
      map: paint(64, 256, (ctx, w, h) => {
        ctx.fillStyle = hex; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        for (const y of [18, 30, h - 36, h - 24]) ctx.fillRect(0, y, w, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < 40; i++) ctx.fillRect(0, i * 6.4, w, 1);
      }),
    });

    // ----- What goes on it -----
    type Kind = 'sock' | 'longsock' | 'towel' | 'tea' | 'trousers' | 'pants' | 'tee' | 'uniform' | 'onesie' | 'bib' | 'babysock' | 'muslin' | 'kit' | 'shorts' | 'sheet';
    const LOADS: Record<string, Kind[]> = {
      mixed: ['sock', 'sock', 'sock', 'tee', 'pants', 'sock', 'tea', 'trousers', 'sock'],
      uniform: ['uniform', 'trousers', 'sock', 'uniform', 'sock'],
      baby: ['onesie', 'onesie', 'bib', 'babysock', 'babysock', 'muslin', 'onesie'],
      dress: [],
      sports: ['kit', 'shorts', 'longsock', 'longsock', 'kit'],
      linen: ['towel', 'tea', 'tea', 'towel', 'sheet'],
      empty: [],
    };
    const WIDTH: Record<Kind, number> = { sock: 0.08, longsock: 0.09, towel: 0.46, tea: 0.3, trousers: 0.34, pants: 0.2, tee: 0.5, uniform: 0.5, onesie: 0.3, bib: 0.2, babysock: 0.045, muslin: 0.3, kit: 0.5, shorts: 0.38, sheet: 0.7 };
    const team = pick(['#c8202a', '#1f5fc8', '#f2c21a', '#1a8a4a', '#101014', '#7a2fc8']);
    const uniformStyle = pick(['hivis', 'polo', 'scrubs'] as const);
    const uniformColour = uniformStyle === 'hivis' ? '#e6f21a' : uniformStyle === 'scrubs' ? pick(['#2f9aa0', '#3f6fb5', '#7a4f8a']) : pick(['#1f2f5a', '#7a1f24', '#1f5a3a', '#23262c']);
    let lastSock: string | null = null;
    const place = (rail: Rail, x: number, kind: Kind) => {
      if (kind === 'sock' || kind === 'longsock' || kind === 'babysock') {
        const hex: string = lastSock ?? (a.load === 'sports' ? team : a.load === 'uniform' ? '#1c1d21' : pick(colours));
        lastSock = lastSock ? null : hex;
        const long = kind === 'longsock', tiny = kind === 'babysock';
        drape(rail, x, WIDTH[kind] * 0.85, tiny ? 0.07 : long ? 0.36 : 0.2 + random() * 0.04, tiny ? 0.04 : long ? 0.2 : 0.1, cloth(hex));
      } else if (kind === 'towel') drape(rail, x, 0.42, 0.42 + random() * 0.1, 0.3 + random() * 0.1, towelCloth(pick(colours)));
      else if (kind === 'tea') drape(rail, x, 0.27, 0.26 + random() * 0.05, 0.2, towelCloth(a.load === 'linen' ? '#f1efe8' : pick(colours)));
      else if (kind === 'muslin') drape(rail, x, 0.27, 0.24, 0.22, cloth('#f3f0e4'));
      else if (kind === 'sheet') drape(rail, x, Math.min(0.66, rail.x1 - rail.x0 - 0.04), 0.62, 0.55, cloth(pick(['#f1efe8', '#dfe6ee', '#efe2e2'])));
      else if (kind === 'pants') drape(rail, x, 0.17, 0.11, 0.11, cloth(pick(colours)));
      else if (kind === 'trousers') {
        const m = cloth(a.load === 'uniform' ? (uniformStyle === 'scrubs' ? uniformColour : '#1c1d21') : pick(['#2a3352', '#23262c', '#6f7f96', '#5a5347']));
        for (const k of [-1, 1]) drape(rail, x + k * 0.085, 0.15, 0.55, 0.42, m);
      } else if (kind === 'tee') hung(rail, x, 'tee', 0.85, cloth(pick(colours)));
      else if (kind === 'onesie') {
        const { mesh, k } = hung(rail, x, 'onesie', 1, cloth(pick(colours)));
        if (random() < 0.6) trim(mesh, 0.05 * k, 0.05 * k, 0, -0.12 * k, pick(['#f2b632', '#ffffff', '#e36aa8', '#2f8fd8']));
      } else if (kind === 'bib') hung(rail, x, 'bib', 1, cloth(pick(colours)));
      else if (kind === 'shorts') { const { mesh, k } = hung(rail, x, 'shorts', 0.95, cloth(random() < 0.5 ? '#f1efe8' : '#16171b')); trim(mesh, 0.012 * k, 0.28 * k, 0.17 * k, -0.15 * k, team); }
      else if (kind === 'kit') {
        const { mesh, k } = hung(rail, x, 'tee', 0.88, cloth(team));
        const numbers = s.label(String(1 + Math.floor(random() * 23)), 0.16 * k, 0.2 * k, [0, 0, 0], '#ffffff', team);
        s.root.remove(numbers); numbers.position.set(0, -0.28 * k, 0.003); mesh.add(numbers);
        trim(mesh, 0.36 * k, 0.02 * k, 0, -0.5 * k, '#ffffff');
      } else if (kind === 'uniform') {
        const { mesh, k } = hung(rail, x, uniformStyle === 'hivis' ? 'vest' : 'tee', 0.88, cloth(uniformColour, uniformStyle === 'hivis' ? { emissive: '#8a9200', emissiveIntensity: 0.35 } : {}));
        if (uniformStyle === 'hivis') { for (const y of [-0.3, -0.42]) trim(mesh, 0.39 * k, 0.035 * k, 0, y * k, '#d9dde0'); for (const sx of [-1, 1]) trim(mesh, 0.035 * k, 0.26 * k, sx * 0.11 * k, -0.14 * k, '#d9dde0'); }
        else if (uniformStyle === 'polo') { trim(mesh, 0.07 * k, 0.045 * k, 0.1 * k, -0.15 * k, '#f2c21a'); trim(mesh, 0.025 * k, 0.12 * k, 0, -0.09 * k, '#f1efe8'); }
        else trim(mesh, 0.09 * k, 0.08 * k, -0.09 * k, -0.36 * k, new THREE.Color(uniformColour).multiplyScalar(0.8).getStyle());
      }
    };

    // Front rails are filled first so the wash faces the viewer.
    const order = rails.map((r, i) => ({ r, i, key: r.z * 2 + Math.max(r.y0, r.y1) * 0.4 + random() * 0.25 })).sort((p, q) => q.key - p.key);
    const kinds = LOADS[a.load];
    const budget = kinds.length ? Math.round(mix(3, 26, a.amount) + mood.density * 4) : 0;
    let placed = 0;
    const occupied = new Map<Rail, [number, number][]>();
    if (a.load === 'mixed') {
      // The one towel always gets the best rail.
      const best = order.find((o) => o.r.x1 - o.r.x0 > 0.6 && o.r.y0 === o.r.y1)!.r;
      const tx = mix(best.x0 + 0.25, best.x1 - 0.25, random());
      place(best, tx, 'towel');
      occupied.set(best, [[tx - 0.26, tx + 0.26]]);
    }
    const density = mix(0.35, 0.95, a.amount);
    for (const { r } of order) {
      if (placed >= budget) break;
      const lo = Math.min(r.x0, r.x1) + 0.03, hi = Math.max(r.x0, r.x1) - 0.03;
      let x = lo + random() * 0.06;
      const taken = occupied.get(r) ?? [];
      while (x < hi && placed < budget) {
        if (random() > density) { x += 0.1 + random() * 0.15; continue; }
        let kind = lastSock ? (a.load === 'sports' ? 'longsock' : a.load === 'baby' ? 'babysock' : 'sock') as Kind : pick(kinds);
        if (lowest(r) < 0.4 && (kind === 'trousers' || kind === 'towel' || kind === 'sheet')) kind = kinds.includes('tea') ? 'tea' : kinds[0];
        const w = WIDTH[kind];
        if (x + w > hi) { if (w > 0.12) { x += 0.08; lastSock = null; continue; } break; }
        const cx = x + w / 2;
        if (!taken.some(([p, q]) => cx + w / 2 > p && cx - w / 2 < q)) { place(r, cx, kind); placed++; }
        x += w + 0.012 + random() * 0.03 * (1.4 - a.amount);
      }
      lastSock = null;
    }
    if (a.load === 'mixed') {
      const { mesh, k } = hung(hang.rail, hang.x, 'shirt', 0.92, cloth(pick(['#dfe8f3', '#f1efe8', '#bcd0ea', '#e9d9df'])), true);
      trim(mesh, 0.012 * k, 0.6 * k, 0, -0.38 * k, '#c3c9d2');
      for (const sx of [-1, 1]) trim(mesh, 0.07 * k, 0.05 * k, sx * 0.055 * k, -0.045 * k, '#ffffff');
      trim(mesh, 0.07 * k, 0.08 * k, 0.1 * k, -0.24 * k, '#cdd6e2');
    } else if (a.load === 'dress') {
      const tone = pick(colours);
      const { mesh, k } = hung(hang.rail, a.frame === 'winged' ? hang.x : 0, 'dress', 0.95, cloth(tone), true);
      trim(mesh, 0.22 * k, 0.025 * k, 0, -0.335 * k, new THREE.Color(tone).offsetHSL(0, 0, -0.18).getStyle());
    }
    // Spare pegs left clipped along the rails.
    const spare = a.load === 'empty' ? 6 + Math.floor(random() * 8) : a.load === 'dress' ? 3 : Math.floor(random() * 4);
    for (let i = 0; i < spare; i++) { const r = pick(rails); const x = mix(r.x0, r.x1, 0.1 + random() * 0.8); peg(x, yAt(r, x) - 0.024, r.z); }
    if (pegPoints.length) s.scatter(new THREE.BoxGeometry(0.011, 0.055, 0.014), new THREE.MeshStandardMaterial({ roughness: 0.6 }), pegPoints);

    // ----- Drips and puddles -----
    const drops: { x: number; z: number; top: number; phase: number }[] = [];
    let rain: THREE.InstancedMesh | null = null;
    if (wet > 0.62 && hems.length) {
      const strength = (wet - 0.62) / 0.38;
      const water = new THREE.MeshStandardMaterial({ color: '#7fa9c9', roughness: 0.05, transparent: true, opacity: 0.55, depthWrite: false });
      const count = Math.min(hems.length, 4 + Math.floor(strength * 14));
      for (let i = 0; i < count; i++) {
        const [x, y, z] = hems[Math.floor(random() * hems.length)];
        drops.push({ x, z, top: Math.max(0.08, y), phase: random() });
        const pool = new THREE.Mesh(new THREE.CircleGeometry(0.03 + random() * 0.05 * (0.4 + strength), 16), water);
        pool.rotation.x = -Math.PI / 2; pool.position.set(x + (random() - 0.5) * 0.03, 0.002, z + (random() - 0.5) * 0.03); pool.scale.y = 0.6 + random() * 0.6;
        s.root.add(pool);
      }
      rain = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 6, 6), new THREE.MeshStandardMaterial({ color: '#a9cde6', roughness: 0.05, emissive: '#5f8fb5', emissiveIntensity: 0.4 }), drops.length);
      s.root.add(rain);
    }
    const matrix = new THREE.Matrix4();
    const fall = (time: number) => {
      if (!rain) return;
      drops.forEach((d, i) => {
        const u = (time * mix(0.35, 1.2, mood.energy) + d.phase) % 1;
        matrix.makeScale(1, 2.2, 1).setPosition(d.x, d.top * (1 - u * u), d.z);
        rain!.setMatrixAt(i, matrix);
      });
      rain.instanceMatrix.needsUpdate = true;
    };
    fall(0);

    // ----- Underneath -----
    const side = random() < 0.5 ? -1 : 1;
    const ux = side * Math.min(halfSpan - 0.1, 0.62), uz = depth + 0.3;
    if (a.under === 'basket') {
      const plastic = s.material(pick(['#e9e7e0', '#8fb7d9', '#d98fa8', '#6f7f8a']), { roughness: 0.5, side: THREE.DoubleSide });
      s.mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.3, 20, 1, true), plastic, [ux, 0.15, uz]).scale.z = 0.72;
      s.cylinder(0.2, 0.2, 0.012, [ux, 0.006, uz], plastic, 20).scale.z = 0.72;
      s.ring(0.262, 0.012, [ux, 0.3, uz], plastic).rotation.x = Math.PI / 2;
      (s.root.children[s.root.children.length - 1] as THREE.Mesh).scale.y = 0.72;
      for (let i = 0; i < 5 + Math.floor(a.amount * 3); i++) {
        const lump = s.ball([0.1 + random() * 0.05, 0.05 + random() * 0.03, 0.09], [ux + (random() - 0.5) * 0.24, 0.25 + random() * 0.08, uz + (random() - 0.5) * 0.14], cloth(pick(colours)), 10);
        lump.rotation.set(random(), random() * 3, random());
      }
    } else if (a.under === 'towel') {
      const mat = s.box([Math.min(halfSpan * 1.5, 1.1), 0.012, 0.5], [0, 0.006, 0.02], towelCloth(pick(['#b9a98a', '#8a9aa8', '#c9a0a0', '#9aa08a'])));
      mat.rotation.y = (random() - 0.5) * 0.3;
    } else if (a.under === 'dehumidifier') {
      const shell = s.material('#eceae4', { roughness: 0.45 });
      s.box([0.3, 0.5, 0.2], [ux, 0.27, uz], shell);
      for (const x of [-1, 1]) s.cylinder(0.02, 0.02, 0.02, [ux + x * 0.11, 0.01, uz], s.material('#2a2c30'), 10);
      for (let i = 0; i < 7; i++) s.box([0.24, 0.008, 0.004], [ux, 0.36 + i * 0.018, uz - side * 0 + 0.101], s.material('#9aa0a6'));
      s.box([0.2, 0.14, 0.004], [ux, 0.14, uz + 0.101], s.material('#b9d3e3', { transparent: true, opacity: 0.75, roughness: 0.1 }));
      s.box([0.2, 0.14 * mix(0.2, 0.9, wet), 0.005], [ux, 0.07 + 0.07 * mix(0.2, 0.9, wet), uz + 0.1012], s.material('#6fa6cc', { roughness: 0.1 }));
      s.box([0.03, 0.012, 0.012], [ux + 0.1, 0.5, uz + 0.09], s.material('#2fd0ff', { emissive: '#2fd0ff', emissiveIntensity: 1.2 }));
      s.tube([[ux, 0.05, uz - 0.1], [ux + side * 0.1, 0.01, uz - 0.2], [ux + side * 0.3, 0.008, uz - 0.15], [ux + side * 0.42, 0.008, uz - 0.3]], 0.005, s.material('#eceae4'));
    } else if (a.under === 'pegs') {
      s.mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.1, 18, 1, true), s.material('#f2b632', { side: THREE.DoubleSide }), [ux, 0.05, uz]);
      const spilled = Array.from({ length: 16 + Math.floor(mood.density * 12) }, (_unused, i) => {
        const inTub = i < 9, ang = random() * 6.28, r = inTub ? random() * 0.06 : 0.12 + random() * 0.2;
        return { at: [ux + Math.cos(ang) * r, inTub ? 0.05 + random() * 0.05 : 0.008, uz + Math.sin(ang) * r * 0.7] as [number, number, number], size: 1, color: pick(pegColours) };
      });
      const loose = s.scatter(new THREE.BoxGeometry(0.055, 0.012, 0.012), new THREE.MeshStandardMaterial({ roughness: 0.6 }), spilled);
      loose.frustumCulled = false;
    }
    if (a.fallen) {
      const fx = -side * (0.15 + random() * 0.3), fz = depth + 0.12 + random() * 0.15;
      const heap = s.ball([0.13, 0.025, 0.09], [fx, 0.02, fz], cloth(a.load === 'sports' ? team : a.load === 'uniform' ? uniformColour : pick(colours)), 12);
      heap.rotation.y = random() * 3;
      const fold = s.ball([0.07, 0.03, 0.06], [fx + 0.05, 0.035, fz - 0.02], heap.material as THREE.Material, 10);
      fold.rotation.y = random() * 3;
    }

    const breeze = mix(0.004, 0.05, mood.energy) * mix(1.2, 0.5, wet);
    const base = swing.map((p) => p.rotation.x);
    return s.finish({
      update: (_dt, time) => {
        swing.forEach((p, i) => { p.rotation.x = base[i] + Math.sin(time * 1.3 + i * 1.7) * breeze; });
        fall(time);
      },
    });
  },
});
