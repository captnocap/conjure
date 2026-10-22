import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, mix } from '@conjure/kit';

type P3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;
type GodKind = 'human' | 'goddess' | 'jackal' | 'falcon' | 'ibis' | 'osiris';

const GROUNDS = { yellow: '#ddab3c', white: '#eadfc2', blue: '#9db4bd', unfinished: '#e2d6b6' } as const;

export default defineWorld({
  questions: {
    style: choice('In what manner are the walls painted?', {
      yellow: 'A golden-yellow ground with a few large, solemn figures: a hurried royal burial.',
      white: 'A white ground crowded with lively colour, the work of a craftsman painting his own tomb.',
      blue: 'A cool blue-grey ground with slender, exquisitely finished figures.',
      unfinished: 'Unfinished: red guide-grids and outline sketches still show where the painters stopped.',
    }),
    subject: choice('What is painted on the great back wall?', {
      gods: 'A procession of animal-headed gods leading the dead before Osiris in his shrine.',
      weighing: 'The weighing of the heart: scales, a feather, the jackal god and a monster waiting.',
      barque: 'The sun god\'s boat crossing the night with its crew of gods.',
      baboons: 'A grid of seated baboons, the hours of the night.',
      fields: 'The fields of the blessed: canals, ploughing, tall wheat and fruit trees.',
    }),
    ceiling: choice('What is on the ceiling where it curves over the walls?', {
      stars: 'Deep blue sown with rows of yellow five-pointed stars.',
      vultures: 'Great vultures with spread wings on a yellow ground.',
      pattern: 'A woven-mat pattern of coloured squares, rosettes and zigzags.',
      bare: 'Bare chiselled rock; nobody got that far.',
    }),
    entrance: choice('How does one enter the chamber?', {
      sealed: 'Through a doorway walled up and plastered over, stamped with rows of seals.',
      open: 'Through an open doorway with a stair climbing away into the dark.',
      crawl: 'Through a low hole at floor level, its blocking stones stacked to one side.',
      shaft: 'Down a rope ladder hanging from a square shaft in the ceiling.',
    }),
    lamp: choice('Where does the light come from?', {
      stands: 'Two tall lamp stands with burning bowls, flanking the burial.',
      brackets: 'Torches burning in brackets on the back wall.',
      floor: 'One small oil lamp set down near the burial, the rest falling away into shadow.',
      lantern: 'An excavator\'s hurricane lantern on a crate and a lamp on a tripod.',
    }),
    furnishing: choice('What stands along the walls?', {
      treasure: 'Burial goods: chests, alabaster jars, a chariot wheel, bundles of staves.',
      provisions: 'Provisions for eternity: ranks of big sealed storage jars and baskets.',
      niches: 'Almost nothing: four small niches cut in the walls, each with a guardian figure.',
      excavation: 'An excavation in progress: packing crates, a ladder, a striped survey rod, numbered cards.',
      bare: 'Nothing at all; an empty painted room.',
    }),
    floor: choice('What lies on the floor?', {
      swept: 'Nothing: swept clean by the last priest to leave.',
      garlands: 'Flower garlands and collars dropped by the funeral party.',
      footprints: 'A single line of footprints in the dust, from the entrance to the burial.',
      drifts: 'Drifts of sand and fallen chips along the walls.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const wear = mood.wear, ransacked = wear > 0.6, pristine = wear < 0.3;
    const warm = new THREE.Color().setHSL(mix(0.11, 0.07, mood.warmth), 0.55, mix(0.8, 0.74, mood.warmth));
    const { art: s, world } = diorama(context, {
      background: '#' + new THREE.Color('#e7dfca').lerp(new THREE.Color('#e3cfa6'), mood.warmth * 0.7).getHexString(),
      floor: '#b39a70', width: 10.6, depth: 8.6, maxHeight: 2.3, radius: 1.05, pitch: 27, yaw: 30,
      slots: [[0.2, 0.2, 0.18], [-2.5, -1.3], [2.7, -1.2], [-2.3, 2.1], [2.6, 2.0]],
    });
    const root = s.root;
    for (const child of root.children) if ((child as THREE.HemisphereLight).isHemisphereLight) { const hemi = child as THREE.HemisphereLight; hemi.color.set('#ffe6c2'); hemi.groundColor.set('#7a6244'); hemi.intensity = 0.62; }
    if (world.keyLight) { world.keyLight.color.copy(warm); world.keyLight.intensity = 1.25; }

    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0], parent: THREE.Object3D = root) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    const lathe = (pts: [number, number][], seg = 16) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
    const fade = (c: string, k = 1) => '#' + new THREE.Color(c).lerp(new THREE.Color(GROUNDS[a.style]), (wear * 0.32 + (1 - mood.cheer) * 0.12) * k).getHexString();
    const RED = fade('#a8432a'), BLU = fade('#2d5fa8'), GRN = fade('#3d8a5a'), BLK = fade('#1b1917', 0.5), WHT = fade('#f5f0df'), YEL = fade(a.style === 'yellow' ? '#f3da8a' : '#e2b53e');
    const ROCK = '#a98d62', CUT = '#86693f';
    const rock = s.material(ROCK, { roughness: 1 }), cut = s.material(CUT, { roughness: 1 });

    // ================= wall paintings =================
    let outline = false;
    const mural = (W: number, H: number, scene: (c: Ctx) => void) => {
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
      const c = canvas.getContext('2d')!;
      c.fillStyle = GROUNDS[a.style]; c.fillRect(0, 0, W, H);
      if (a.style === 'unfinished') { c.strokeStyle = 'rgba(178,58,42,0.35)'; c.lineWidth = 1; for (let x = 0; x < W; x += 26) { c.beginPath(); c.moveTo(x, 46); c.lineTo(x, 356); c.stroke(); } for (let y = 46; y < 356; y += 26) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } }
      scene(c);
      outline = false;
      // frieze of kheker ornaments and the dado
      c.fillStyle = BLK; c.fillRect(0, 0, W, 5); c.fillRect(0, 44, W, 4);
      for (let x = 0, i = 0; x < W; x += 22, i++) { c.fillStyle = [BLU, RED, GRN][i % 3]; c.beginPath(); c.moveTo(x + 2, 44); c.lineTo(x + 5, 22); c.lineTo(x + 11, 7); c.lineTo(x + 17, 22); c.lineTo(x + 20, 44); c.fill(); c.fillStyle = YEL; c.beginPath(); c.arc(x + 11, 37, 4, 0, 7); c.fill(); }
      c.fillStyle = BLK; c.fillRect(0, 356, W, 60); c.fillStyle = YEL; c.fillRect(0, 366, W, 9); c.fillStyle = RED; c.fillRect(0, 379, W, 9);
      // age: fallen plaster, cracks, grime
      c.fillStyle = `rgba(64,46,28,${wear * 0.2})`; c.fillRect(0, 0, W, H);
      for (let i = 0; i < Math.floor(wear ** 1.4 * W / 40); i++) {
        const x = random() * W, y = 40 + random() ** 0.7 * (H - 40), r = 12 + random() * 46 * wear;
        c.fillStyle = random() < 0.7 ? ROCK : '#b29c74'; c.strokeStyle = 'rgba(90,70,45,0.6)'; c.lineWidth = 2; c.beginPath();
        for (let k = 0; k < 9; k++) { const an = k / 9 * Math.PI * 2, rr = r * (0.6 + random() * 0.6); c[k ? 'lineTo' : 'moveTo'](x + Math.cos(an) * rr * 1.3, y + Math.sin(an) * rr); }
        c.closePath(); c.fill(); c.stroke();
      }
      c.strokeStyle = 'rgba(50,36,22,0.7)'; c.lineWidth = 1.5;
      for (let i = 0; i < wear * 7; i++) { let x = random() * W, y = 0; c.beginPath(); c.moveTo(x, y); while (y < H) { x += (random() - 0.5) * 34; y += 16 + random() * 30; c.lineTo(x, y); } c.stroke(); }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.92 });
    };
    const sk = (c: Ctx, col: string) => { if (outline) { c.strokeStyle = '#b23a2a'; c.lineWidth = 1.6; c.stroke(); } else { c.fillStyle = col; c.fill(); } };
    const R = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => { c.beginPath(); c.rect(x, y, w, h); sk(c, col); };
    const E = (c: Ctx, x: number, y: number, rx: number, ry: number, col: string, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); sk(c, col); };
    const Pg = (c: Ctx, pts: number[], col: string) => { c.beginPath(); for (let i = 0; i < pts.length; i += 2) c[i ? 'lineTo' : 'moveTo'](pts[i], pts[i + 1]); c.closePath(); sk(c, col); };
    const L = (c: Ctx, pts: number[], col: string, w: number) => { c.beginPath(); for (let i = 0; i < pts.length; i += 2) c[i ? 'lineTo' : 'moveTo'](pts[i], pts[i + 1]); c.strokeStyle = outline ? '#b23a2a' : col; c.lineWidth = outline ? 1.6 : w; c.stroke(); };
    const glyphs = (c: Ctx, x: number, y: number, cols: number, rows: number, z = 13) => {
      for (let i = 0; i < cols; i++) { L(c, [x + i * (z + 5) - 3, y - 4, x + i * (z + 5) - 3, y + rows * (z + 3)], RED, 1.5); for (let j = 0; j < rows; j++) { const gx = x + i * (z + 5) + z / 2, gy = y + j * (z + 3) + z / 2, k = random(), col = [BLK, BLU, GRN, RED][Math.floor(random() * 4)]; if (k < 0.25) E(c, gx, gy, z * 0.38, z * 0.38, col); else if (k < 0.5) R(c, gx - z * 0.4, gy - z * 0.15, z * 0.8, z * 0.32, col); else if (k < 0.75) { E(c, gx, gy, z * 0.42, z * 0.22, col, -0.4); R(c, gx + z * 0.15, gy - z * 0.5, z * 0.16, z * 0.4, col); } else { R(c, gx - z * 0.1, gy - z * 0.45, z * 0.2, z * 0.9, col); R(c, gx - z * 0.35, gy - z * 0.45, z * 0.7, z * 0.18, col); } } }
    };
    const god = (c: Ctx, x: number, base: number, h: number, kind: GodKind, f: number, staff = true) => {
      const u = h / 10, skin = kind === 'goddess' ? fade('#e3b65c') : kind === 'osiris' ? GRN : RED, hy = base - 8.9 * u;
      if (kind === 'osiris') {
        R(c, x - 1.7 * u, base - 0.5 * u, 3.4 * u, 0.5 * u, BLU);
        Pg(c, [x - 0.8 * u, base - 0.5 * u, x + 0.8 * u, base - 0.5 * u, x + 1.05 * u, base - 7.8 * u, x - 1.05 * u, base - 7.8 * u], WHT);
        R(c, x - 1.05 * u, base - 7.9 * u, 2.1 * u, 0.5 * u, BLU); R(c, x - 1.0 * u, base - 7.35 * u, 2.0 * u, 0.22 * u, RED);
        R(c, x - 0.1 * u, base - 6.7 * u, f * 1.1 * u, 0.45 * u, GRN); R(c, x - 0.1 * u, base - 6.0 * u, f * 1.1 * u, 0.45 * u, GRN);
        L(c, [x + f * 1.0 * u, base - 5.2 * u, x + f * 1.25 * u, base - 8.8 * u, x + f * 1.7 * u, base - 8.9 * u, x + f * 1.75 * u, base - 8.3 * u], YEL, 0.24 * u);
        L(c, [x + f * 1.0 * u, base - 5.6 * u, x + f * 0.5 * u, base - 8.6 * u, x + f * 0.0 * u, base - 7.6 * u], BLU, 0.2 * u);
        R(c, x - 0.25 * u, base - 8.4 * u, 0.5 * u, 0.6 * u, GRN); E(c, x + f * 0.1 * u, hy, 0.6 * u, 0.62 * u, GRN);
        R(c, x + f * 0.5 * u - 0.12 * u, hy + 0.35 * u, 0.24 * u, 0.9 * u, BLK);
        E(c, x, hy - 1.4 * u, 0.48 * u, 1.3 * u, WHT); E(c, x - 0.62 * u, hy - 1.2 * u, 0.2 * u, 0.9 * u, GRN); E(c, x + 0.62 * u, hy - 1.2 * u, 0.2 * u, 0.9 * u, GRN);
        if (!outline) { c.fillStyle = BLK; c.fillRect(x + f * 0.25 * u, hy - 0.12 * u, f * 0.3 * u, 0.1 * u); }
        return;
      }
      if (kind === 'goddess') {
        Pg(c, [x - 0.8 * u, base - 7.0 * u, x + 0.8 * u, base - 7.0 * u, x + 0.62 * u, base - 0.6 * u, x - 0.62 * u, base - 0.6 * u], random() < 0.5 ? RED : GRN);
        R(c, x - 0.5 * u, base - 0.6 * u, 1.0 * u + f * 0.5 * u, 0.6 * u, skin);
      } else {
        R(c, x - f * 0.8 * u - 0.32 * u, base - 4.6 * u, 0.64 * u, 4.6 * u, skin); R(c, x + f * 0.6 * u - 0.32 * u, base - 4.6 * u, 0.64 * u, 4.6 * u, skin);
        R(c, x - f * 0.8 * u - 0.32 * u, base - 0.4 * u, 0.64 * u + f * 0.6 * u, 0.4 * u, skin); R(c, x + f * 0.6 * u - 0.32 * u, base - 0.4 * u, 0.64 * u + f * 0.6 * u, 0.4 * u, skin);
        Pg(c, [x - 0.85 * u, base - 6.1 * u, x + 0.85 * u, base - 6.1 * u, x + 1.15 * u + f * 0.3 * u, base - 4.1 * u, x - 1.15 * u + f * 0.3 * u, base - 4.1 * u], WHT);
        Pg(c, [x + f * 0.1 * u, base - 6.0 * u, x + f * 1.3 * u, base - 4.1 * u, x + f * 0.5 * u, base - 4.1 * u], YEL);
        R(c, x - 0.85 * u, base - 6.25 * u, 1.7 * u, 0.3 * u, BLU);
      }
      Pg(c, [x - 1.15 * u, base - 7.9 * u, x + 1.15 * u, base - 7.9 * u, x + 0.72 * u, base - 6.1 * u, x - 0.72 * u, base - 6.1 * u], skin);
      R(c, x - 1.0 * u, base - 8.0 * u, 2.0 * u, 0.42 * u, BLU); R(c, x - 0.9 * u, base - 7.6 * u, 1.8 * u, 0.18 * u, YEL);
      R(c, x + f * 0.9 * u, base - 7.75 * u, f * 1.75 * u, 0.4 * u, skin);
      if (staff) { R(c, x + f * 2.5 * u - 0.09 * u, base - 9.2 * u, 0.18 * u, 9.2 * u, kind === 'goddess' ? GRN : BLK); Pg(c, [x + f * 2.5 * u, base - 9.2 * u, x + f * 3.1 * u, base - 9.7 * u, x + f * 3.0 * u, base - 9.1 * u], kind === 'goddess' ? GRN : BLK); }
      R(c, x - f * 1.15 * u - 0.2 * u, base - 7.85 * u, 0.4 * u, 3.1 * u, skin);
      E(c, x - f * 1.15 * u, base - 4.25 * u, 0.22 * u, 0.3 * u, BLU); R(c, x - f * 1.15 * u - 0.07 * u, base - 4.0 * u, 0.14 * u, 0.7 * u, BLU); R(c, x - f * 1.15 * u - 0.3 * u, base - 3.9 * u, 0.6 * u, 0.14 * u, BLU);
      R(c, x - 0.26 * u, base - 8.45 * u, 0.52 * u, 0.6 * u, skin);
      if (kind === 'human' || kind === 'goddess') {
        E(c, x - f * 0.14 * u, hy - 0.06 * u, 0.7 * u, 0.7 * u, BLK); R(c, x - f * 0.55 * u - 0.28 * u, hy, 0.56 * u, 1.35 * u, BLK);
        E(c, x + f * 0.2 * u, hy + 0.05 * u, 0.5 * u, 0.55 * u, skin);
        if (!outline) { c.fillStyle = BLK; c.fillRect(x + f * 0.2 * u, hy - 0.08 * u, f * 0.32 * u, 0.1 * u); }
        if (kind === 'goddess') { E(c, x, hy - 1.35 * u, 0.5 * u, 0.5 * u, RED); L(c, [x - 0.75 * u, hy - 1.9 * u, x - 0.6 * u, hy - 0.95 * u, x + 0.6 * u, hy - 0.95 * u, x + 0.75 * u, hy - 1.9 * u], BLK, 0.16 * u); }
        else { R(c, x - 0.62 * u, hy - 0.72 * u, 1.24 * u, 0.22 * u, YEL); }
      } else {
        R(c, x - f * 0.5 * u - 0.32 * u, hy - 0.35 * u, 0.64 * u, 1.65 * u, BLU); R(c, x + f * 0.35 * u - 0.2 * u, hy + 0.3 * u, 0.4 * u, 0.95 * u, BLU);
        if (kind === 'jackal') {
          E(c, x, hy, 0.6 * u, 0.52 * u, BLK); Pg(c, [x + f * 0.3 * u, hy - 0.34 * u, x + f * 1.6 * u, hy + 0.02 * u, x + f * 1.55 * u, hy + 0.3 * u, x + f * 0.3 * u, hy + 0.4 * u], BLK);
          Pg(c, [x - f * 0.5 * u, hy - 0.25 * u, x - f * 0.38 * u, hy - 1.65 * u, x - f * 0.02 * u, hy - 0.42 * u], BLK); Pg(c, [x - f * 0.1 * u, hy - 0.35 * u, x + f * 0.08 * u, hy - 1.7 * u, x + f * 0.42 * u, hy - 0.35 * u], BLK);
        } else if (kind === 'falcon') {
          E(c, x + f * 0.05 * u, hy, 0.56 * u, 0.54 * u, WHT); Pg(c, [x + f * 0.42 * u, hy - 0.2 * u, x + f * 1.0 * u, hy + 0.12 * u, x + f * 0.5 * u, hy + 0.34 * u], BLK);
          if (!outline) { c.fillStyle = BLK; c.beginPath(); c.arc(x + f * 0.2 * u, hy - 0.1 * u, 0.12 * u, 0, 7); c.fill(); c.fillRect(x + f * 0.14 * u, hy, 0.1 * u, 0.4 * u); }
          E(c, x, hy - 1.3 * u, 0.62 * u, 0.62 * u, RED); L(c, [x - 0.62 * u, hy - 0.7 * u, x + 0.62 * u, hy - 0.7 * u], YEL, 0.16 * u);
        } else {
          E(c, x + f * 0.1 * u, hy, 0.42 * u, 0.42 * u, BLK);
          c.beginPath(); c.moveTo(x + f * 0.4 * u, hy - 0.05 * u); c.quadraticCurveTo(x + f * 1.5 * u, hy - 0.1 * u, x + f * 1.7 * u, hy + 1.0 * u); c.strokeStyle = outline ? '#b23a2a' : BLK; c.lineWidth = outline ? 1.6 : 0.2 * u; c.stroke();
          E(c, x, hy - 1.15 * u, 0.5 * u, 0.5 * u, YEL); L(c, [x - 0.6 * u, hy - 0.95 * u, x, hy - 0.6 * u, x + 0.6 * u, hy - 0.95 * u], YEL, 0.16 * u);
        }
      }
    };
    const kiosk = (c: Ctx, x: number, base: number, h: number, f: number) => {
      const w = h * 0.52;
      R(c, x - w / 2, base - h * 1.22, w, h * 0.08, YEL); R(c, x - w / 2 - 6, base - h * 1.28, w + 12, h * 0.06, RED);
      for (let i = 0; i < 9; i++) R(c, x - w / 2 + i * w / 9, base - h * 1.36, w / 9 - 2, h * 0.08, [BLU, GRN, RED][i % 3]);
      R(c, x - w / 2, base - h * 1.15, 8, h * 1.15, GRN); R(c, x + w / 2 - 8, base - h * 1.15, 8, h * 1.15, GRN);
      god(c, x + f * 4, base, h, 'osiris', f);
    };
    const kinds: GodKind[] = ['jackal', 'falcon', 'ibis', 'goddess', 'human'];
    const shuffled = kinds.map((k) => [random(), k] as const).sort((p, q) => p[0] - q[0]).map(([, k]) => k);
    const BASE = 350;
    const backScene = (c: Ctx) => {
      const sketchFrom = a.style === 'unfinished' ? 430 : 1e9, big = a.style === 'yellow' ? 262 : 232;
      const fig = (x: number, kind: GodKind, f: number, h = big, staff = true) => { outline = x > sketchFrom; god(c, x, BASE, h, kind, f, staff); outline = false; if (x <= sketchFrom && h > 150) glyphs(c, x - 26, 58, 3, a.style === 'white' ? 3 : 2); };
      if (a.subject === 'gods') {
        const n = a.style === 'yellow' ? 4 : 5;
        for (let i = 0; i < n; i++) fig(110 + i * (760 / (n - 1)) * 0.98, i === n - 1 ? 'human' : shuffled[i], 1);
        outline = 980 > sketchFrom; kiosk(c, 990, BASE, 220, -1); outline = false;
      } else if (a.subject === 'weighing') {
        fig(100, 'human', 1, big, false); fig(270, 'jackal', 1, big, false);
        outline = 470 > sketchFrom;
        R(c, 466, BASE - 230, 10, 230, BLK); R(c, 440, BASE - 12, 62, 12, BLK); R(c, 360, BASE - 226, 222, 8, RED);
        for (const sx of [-1, 1]) { L(c, [471 + sx * 104, BASE - 222, 471 + sx * 130, BASE - 110, 471 + sx * 78, BASE - 110, 471 + sx * 104, BASE - 222], BLK, 2); R(c, 471 + sx * 104 - 34, BASE - 110, 68, 8, YEL); }
        E(c, 367, BASE - 126, 14, 17, RED); Pg(c, [575, BASE - 112, 566, BASE - 170, 575, BASE - 190, 584, BASE - 170], WHT);
        E(c, 640, BASE - 46, 62, 30, GRN); Pg(c, [690, BASE - 70, 770, BASE - 56, 768, BASE - 40, 690, BASE - 30], GRN); E(c, 600, BASE - 50, 36, 34, YEL); R(c, 590, BASE - 20, 16, 20, YEL); R(c, 660, BASE - 20, 16, 20, GRN); R(c, 560, BASE - 6, 190, 6, BLK);
        outline = false;
        fig(860, 'ibis', -1, big, false); outline = 1000 > sketchFrom; kiosk(c, 1010, BASE, 215, -1); outline = false;
      } else if (a.subject === 'barque') {
        R(c, 30, BASE - 34, 1060, 34, BLU); if (!outline) { c.strokeStyle = WHT; c.lineWidth = 2; for (let row = 0; row < 3; row++) { c.beginPath(); for (let x = 30; x <= 1090; x += 12) c[x === 30 ? 'moveTo' : 'lineTo'](x, BASE - 28 + row * 10 + ((x / 12) % 2 ? 3 : -3)); c.stroke(); } }
        const deck = (x: number) => BASE - 108 + 74 * (1 - ((x - 560) / 430) ** 2);
        outline = a.style === 'unfinished';
        c.beginPath(); c.moveTo(110, BASE - 150); c.quadraticCurveTo(560, BASE + 62, 1010, BASE - 150); c.lineTo(1030, BASE - 172); c.quadraticCurveTo(560, BASE + 14, 90, BASE - 172); c.closePath(); sk(c, GRN);
        E(c, 96, BASE - 186, 16, 26, YEL, -0.4); E(c, 1024, BASE - 186, 16, 26, YEL, 0.4);
        R(c, 480, deck(560) - 190, 160, 8, RED); R(c, 480, deck(560) - 182, 8, 182, YEL); R(c, 632, deck(560) - 182, 8, 182, YEL);
        god(c, 556, deck(560), 158, 'falcon', 1, true);
        [210, 340, 770, 890].forEach((x, i) => god(c, x, deck(x), 140, shuffled[i], 1, false));
        L(c, [950, deck(950) - 120, 1040, BASE - 4], BLK, 5); L(c, [985, deck(985) - 120, 1070, BASE - 4], BLK, 5);
        outline = false; E(c, 300, 96, 34, 34, RED); glyphs(c, 660, 60, 5, 3);
      } else if (a.subject === 'baboons') {
        const cw = 146, ch = 146;
        for (let row = 0; row < 2; row++) for (let col = 0; col < 7; col++) {
          const x = 40 + col * cw, y = 56 + row * ch; outline = a.style === 'unfinished' && col > 2;
          if (!outline) { c.fillStyle = (row + col) % 2 ? 'rgba(255,255,255,0.14)' : 'rgba(120,80,30,0.12)'; c.fillRect(x, y, cw, ch); } c.strokeStyle = RED; c.lineWidth = 3; c.strokeRect(x, y, cw, ch);
          const bx = x + cw / 2, by = y + ch - 12, fur = (row + col) % 3 === 0 ? BLU : fade('#7d8c68');
          if (col === 0 && row === 0) { E(c, bx, by - 50, 30, 40, BLK); for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) L(c, [bx + sx * 26, by - 70 + k * 22, bx + sx * 48, by - 80 + k * 24], BLK, 4); E(c, bx, by - 110, 16, 16, RED); continue; }
          E(c, bx - 8, by - 44, 34, 44, fur); E(c, bx - 2, by - 96, 26, 24, fur); Pg(c, [bx + 12, by - 106, bx + 50, by - 96, bx + 50, by - 80, bx + 12, by - 78], fade('#c59873'));
          R(c, bx + 6, by - 58, 40, 10, fur); R(c, bx + 2, by - 18, 46, 12, fur); R(c, bx + 40, by - 60, 10, 46, fur);
          c.beginPath(); c.moveTo(bx - 36, by - 14); c.quadraticCurveTo(bx - 64, by - 30, bx - 52, by - 78); c.strokeStyle = outline ? '#b23a2a' : fur; c.lineWidth = outline ? 1.6 : 8; c.stroke();
        }
        outline = false;
      } else {
        for (const y of [150, 252]) R(c, 30, y, 1060, 11, BLU); R(c, 30, 52, 9, 300, BLU); R(c, 1081, 52, 9, 300, BLU); R(c, 30, BASE - 4, 1060, 8, BLU);
        outline = a.style === 'unfinished';
        god(c, 110, 148, 86, 'human', 1, false); god(c, 190, 148, 82, 'goddess', 1, false); for (let i = 0; i < 3; i++) god(c, 420 + i * 110, 148, 86, shuffled[i], -1, false); glyphs(c, 760, 62, 12, 4, 12);
        for (let x = 60; x < 520; x += 9) { L(c, [x, 250, x + (random() - 0.5) * 6, 176], YEL, 3); E(c, x, 174, 3, 9, YEL); }
        god(c, 560, 250, 84, 'human', -1, false);
        for (const ox of [700, 800]) { E(c, ox, 222, 44, 20, ox === 700 ? RED : WHT); R(c, ox - 34, 232, 9, 18, BLK); R(c, ox + 24, 232, 9, 18, BLK); E(c, ox + 48, 208, 14, 11, ox === 700 ? RED : WHT); L(c, [ox + 44, 198, ox + 40, 184, ox + 58, 186], BLK, 3); }
        L(c, [640, 240, 900, 226], BLK, 3); god(c, 950, 250, 84, 'human', -1, false);
        for (let i = 0; i < 9; i++) { const x = 90 + i * 118; if (i % 2) { R(c, x - 5, BASE - 76, 10, 72, fade('#7a4f2a')); E(c, x, BASE - 78, 34, 26, GRN); if (!outline) for (let k = 0; k < 6; k++) { c.fillStyle = RED; c.beginPath(); c.arc(x - 22 + k * 9, BASE - 82 + (k % 2) * 12, 3, 0, 7); c.fill(); } } else { R(c, x - 4, BASE - 84, 8, 80, fade('#7a4f2a')); for (let k = -3; k <= 3; k++) L(c, [x, BASE - 84, x + k * 12, BASE - 92 + Math.abs(k) * 9], GRN, 5); E(c, x, BASE - 78, 7, 5, RED); } }
        outline = false;
      }
      glyphs(c, 1322, 70, 3, 14, 14);
    };
    const leftScene = (c: Ctx) => {
      const h = a.style === 'yellow' ? 250 : 224, order = [...shuffled].reverse();
      for (let i = 0; i < 4; i++) { const x = 120 + i * 205; outline = a.style === 'unfinished' && i === 0; god(c, x, BASE, h, order[i], 1); outline = false; glyphs(c, x - 26, 58, 3, 2); }
      god(c, 940, BASE, h, 'goddess', -1, false); glyphs(c, 1010, 64, 3, 14, 14);
    };
    const WH = 3.0, RC = 1.5, TH = 58 * Math.PI / 180;
    const back = put(new THREE.PlaneGeometry(9, WH), mural(1408, 416, backScene), [0, WH / 2, -3.488]); back.castShadow = false;
    const left = put(new THREE.PlaneGeometry(7, WH), mural(1088, 416, leftScene), [-4.488, WH / 2, 0]); left.rotation.y = Math.PI / 2; left.castShadow = false;

    // ================= ceiling cove =================
    const cc = document.createElement('canvas'); cc.width = 512; cc.height = 192; const k = cc.getContext('2d')!;
    const star = (x: number, y: number, r: number) => { k.beginPath(); for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.4 : r; k[i ? 'lineTo' : 'moveTo'](x + Math.cos(an) * rr, y + Math.sin(an) * rr); } k.closePath(); k.fill(); };
    if (a.ceiling === 'stars') { k.fillStyle = fade('#1e3d7c', 0.6); k.fillRect(0, 0, 512, 192); k.fillStyle = fade('#f0d060', 0.5); for (let row = 0; row < 5; row++) for (let i = 0; i < 12; i++) star(22 + i * 42.6 + (row % 2) * 21, 20 + row * 32, 11); }
    else if (a.ceiling === 'vultures') { k.fillStyle = fade('#e6bd52'); k.fillRect(0, 0, 512, 192); for (let i = 0; i < 2; i++) { const x = 128 + i * 256, y = 84; for (const sx of [-1, 1]) for (let f = 0; f < 9; f++) { k.save(); k.translate(x + sx * 12, y); k.rotate(sx * mix(-0.5, 0.4, f / 8)); k.fillStyle = [BLU, RED, GRN][f % 3]; k.beginPath(); k.ellipse(sx * 58, 0, 56, 7, 0, 0, 7); k.fill(); k.restore(); } k.fillStyle = WHT; k.beginPath(); k.ellipse(x, y + 8, 14, 30, 0, 0, 7); k.fill(); k.beginPath(); k.arc(x, y - 30, 10, 0, 7); k.fill(); k.fillStyle = BLK; k.fillRect(x - 2, y - 46, 4, 10); } }
    else if (a.ceiling === 'pattern') { for (let x = 0; x < 16; x++) for (let y = 0; y < 6; y++) { k.fillStyle = [BLU, YEL, RED, GRN][(x + y * 2) % 4]; k.fillRect(x * 32, y * 32, 32, 32); k.fillStyle = [WHT, BLK, YEL, WHT][(x + y) % 4]; k.beginPath(); k.arc(x * 32 + 16, y * 32 + 16, 9, 0, 7); k.fill(); k.strokeStyle = BLK; k.lineWidth = 2; k.strokeRect(x * 32, y * 32, 32, 32); } }
    else { k.fillStyle = ROCK; k.fillRect(0, 0, 512, 192); k.strokeStyle = 'rgba(120,98,66,0.7)'; k.lineWidth = 2; for (let i = 0; i < 260; i++) { const x = random() * 512, y = random() * 192; k.beginPath(); k.moveTo(x, y); k.lineTo(x + 9, y + 12); k.stroke(); } }
    if (a.ceiling !== 'bare') { k.fillStyle = RED; k.fillRect(0, 176, 512, 8); k.fillStyle = YEL; k.fillRect(0, 184, 512, 8); for (let i = 0; i < wear * 16; i++) { k.fillStyle = ROCK; k.beginPath(); k.ellipse(random() * 512, random() * 192, 8 + random() * 30, 6 + random() * 18, random() * 3, 0, 7); k.fill(); } k.fillStyle = `rgba(40,28,18,${wear * 0.25 + 0.05})`; k.fillRect(0, 0, 512, 192); }
    const cmap = new THREE.CanvasTexture(cc); cmap.colorSpace = THREE.SRGBColorSpace; cmap.wrapS = THREE.RepeatWrapping; cmap.repeat.set(3, 1);
    const coveMat = new THREE.MeshStandardMaterial({ map: cmap, roughness: 0.95, side: THREE.DoubleSide });
    const cove = (len: number, place: (p: number, y: number, out: number) => P3) => {
      const g = new THREE.PlaneGeometry(len, 1, 1, 12), pos = g.getAttribute('position'), uv = g.getAttribute('uv');
      for (let i = 0; i < pos.count; i++) { const th = uv.getY(i) * TH; pos.setXYZ(i, ...place(pos.getX(i), WH + RC * Math.sin(th), RC * (1 - Math.cos(th)) + 0.012)); }
      g.computeVertexNormals(); const m = put(g, coveMat); m.castShadow = false; return m;
    };
    cove(9, (p, y, out) => [p, y, -3.5 + out]);
    cove(7, (p, y, out) => [-4.5 + out, y, -p]);
    // the living rock the room is cut from, sliced open on the near sides
    const TOP = WH + RC * Math.sin(TH) + 0.14;
    const section = (m: number) => { const pts: [number, number][] = [[0, -0.24], [0, WH]]; for (let i = 1; i <= 10; i++) { const th = i / 10 * TH; pts.push([-RC * (1 - Math.cos(th)) * m, WH + RC * Math.sin(th)]); } pts.push([-RC * (1 - Math.cos(TH)) * m, TOP], [0.8 * m, TOP], [0.8 * m, -0.24]); if (m < 0) pts.reverse(); const sh = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); return sh; };
    const backRock = new THREE.ExtrudeGeometry(section(1), { depth: 9.8, bevelEnabled: false }); backRock.rotateY(Math.PI / 2); backRock.translate(-5.3, 0, 0); backRock.scale(1, 1, 1);
    // after rotateY(90deg) the profile's x runs toward -z: mirror it so the face sits at z = -3.5
    backRock.translate(0, 0, -3.5);
    put(backRock, [cut, rock] as unknown as THREE.Material);
    const leftRock = new THREE.ExtrudeGeometry(section(-1), { depth: 7.8, bevelEnabled: false }); leftRock.translate(-4.5, 0, -4.3);
    put(leftRock, [cut, rock] as unknown as THREE.Material);
    put(new THREE.BoxGeometry(0.5, 0.32, 8.3), cut, [4.75, 0.16, 0.15]); put(new THREE.BoxGeometry(10.3, 0.32, 0.5), cut, [-0.15, 0.16, 3.75]);

    // ================= burial dais =================
    const stone = s.material('#cdbb92', { roughness: 0.85 });
    put(new THREE.BoxGeometry(3.1, 0.18, 2.3), stone, [0.2, 0.09, 0.2]); put(new THREE.BoxGeometry(3.3, 0.06, 2.5), s.material('#a8936a', { roughness: 0.9 }), [0.2, 0.03, 0.2]);

    // ================= entrance, far right of the back wall =================
    const EX = 3.15, dark = s.material('#17110d', { roughness: 1 });
    const frame = (w: number, h: number) => { for (const sx of [-1, 1]) put(new THREE.BoxGeometry(0.16, h, 0.12), stone, [EX + sx * (w / 2 + 0.08), h / 2, -3.44]); put(new THREE.BoxGeometry(w + 0.5, 0.2, 0.16), stone, [EX, h + 0.1, -3.42]); };
    let entry: P3 = [EX, 0, -3.0];
    if (a.entrance === 'sealed') {
      const ec = document.createElement('canvas'); ec.width = 128; ec.height = 200; const e = ec.getContext('2d')!;
      e.fillStyle = '#d6c9a8'; e.fillRect(0, 0, 128, 200); e.strokeStyle = 'rgba(120,96,64,0.75)'; e.lineWidth = 2;
      for (let row = 0; row < 8; row++) for (let col = 0; col < 4; col++) { e.beginPath(); e.ellipse(18 + col * 31 + (row % 2) * 6, 18 + row * 24, 11, 8, 0, 0, 7); e.stroke(); e.fillStyle = 'rgba(120,96,64,0.5)'; e.fillRect(12 + col * 31 + (row % 2) * 6, 15 + row * 24, 12, 3); }
      if (ransacked) { e.fillStyle = '#17110d'; e.beginPath(); for (let i = 0; i < 11; i++) { const an = i / 11 * Math.PI * 2, r = 26 + random() * 20; e[i ? 'lineTo' : 'moveTo'](36 + Math.cos(an) * r, 44 + Math.sin(an) * r * 1.2); } e.fill(); }
      const em = new THREE.CanvasTexture(ec); em.colorSpace = THREE.SRGBColorSpace;
      put(new THREE.BoxGeometry(1.2, 1.9, 0.06), new THREE.MeshStandardMaterial({ map: em, roughness: 0.95 }), [EX, 0.95, -3.46]); frame(1.2, 1.9);
      if (!ransacked) { put(new THREE.SphereGeometry(0.07, 10, 8), s.material('#8d7358', { roughness: 1 }), [EX, 1.0, -3.41]).scale.z = 0.5; const cord = put(new THREE.CylinderGeometry(0.012, 0.012, 1.5, 6), s.material('#b99a5a'), [EX, 1.0, -3.42]); cord.rotation.z = Math.PI / 2; }
    } else if (a.entrance === 'open') {
      const ec = document.createElement('canvas'); ec.width = 96; ec.height = 160; const e = ec.getContext('2d')!;
      e.fillStyle = '#17110d'; e.fillRect(0, 0, 96, 160); for (let i = 0; i < 6; i++) { e.fillStyle = `rgba(${150 + i * 12},${120 + i * 12},${84 + i * 10},${0.5 + i * 0.07})`; e.fillRect(14 + i * 3, 150 - i * 20, 68 - i * 6, 7); }
      const light = mix(0.05, 0.55, Math.sin(mood.daylight * Math.PI)); e.fillStyle = `rgba(220,230,255,${light})`; e.beginPath(); e.moveTo(30, 0); e.lineTo(66, 0); e.lineTo(74, 46); e.lineTo(22, 46); e.fill();
      const em = new THREE.CanvasTexture(ec); em.colorSpace = THREE.SRGBColorSpace;
      put(new THREE.PlaneGeometry(1.2, 1.9), new THREE.MeshStandardMaterial({ map: em, roughness: 1, emissive: '#ffffff', emissiveMap: em, emissiveIntensity: 0.25 }), [EX, 0.95, -3.476]).castShadow = false; frame(1.2, 1.9);
      put(new THREE.BoxGeometry(1.2, 0.12, 0.3), stone, [EX, 0.06, -3.33]);
      const pool = put(new THREE.PlaneGeometry(1.3, 2.2), new THREE.MeshStandardMaterial({ color: '#f2efe2', transparent: true, opacity: light * 0.4, depthWrite: false, roughness: 1 }), [EX, 0.004, -2.3]); pool.rotation.x = -Math.PI / 2; pool.castShadow = false;
    } else if (a.entrance === 'crawl') {
      const hole = new THREE.Shape(); for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI, r = 0.42 + random() * 0.12; hole[i ? 'lineTo' : 'moveTo'](Math.cos(an) * r * 1.15, Math.sin(an) * r * 1.3); }
      put(new THREE.ShapeGeometry(hole), dark, [EX, 0, -3.474]).castShadow = false;
      for (let i = 0; i < 9; i++) { const an = i / 8 * Math.PI, m = put(new THREE.DodecahedronGeometry(0.11 + random() * 0.06, 0), rock, [EX + Math.cos(an) * 0.58, Math.sin(an) * 0.62 + 0.04, -3.44]); m.rotation.set(random() * 3, random() * 3, 0); }
      for (let i = 0; i < 7; i++) put(new THREE.BoxGeometry(0.34, 0.2, 0.26), stone, [EX + 0.95 + (i % 2) * 0.05, 0.1 + Math.floor(i / 2) * 0.2, -3.2 + (i % 2) * 0.3 - (i > 5 ? 0.15 : 0)]).rotation.y = (random() - 0.5) * 0.3;
    } else {
      put(new THREE.PlaneGeometry(1.0, 0.7), dark, [EX, WH + RC * Math.sin(TH * 0.72), -3.5 + RC * (1 - Math.cos(TH * 0.72)) + 0.03]).rotation.x = TH * 0.72;
      const ropeMat = s.material('#b99a5a', { roughness: 1 }), topY = WH + RC * Math.sin(TH * 0.72), topZ = -3.5 + RC * (1 - Math.cos(TH * 0.72)) + 0.06;
      for (const sx of [-1, 1]) s.rod([EX + sx * 0.2, topY, topZ], [EX + sx * 0.2, 0.05, -2.75], 0.018, ropeMat);
      for (let i = 1; i < 12; i++) { const t = i / 12; s.rod([EX - 0.24, mix(topY, 0.05, t), mix(topZ, -2.75, t)], [EX + 0.24, mix(topY, 0.05, t), mix(topZ, -2.75, t)], 0.016, s.material('#8a6238')); }
      entry = [EX, 0, -2.6];
    }

    // ================= the breach =================
    const blocked: [number, number][] = [];
    if (ransacked) {
      const BZ = 1.25, hole = new THREE.Shape();
      for (let i = 0; i < 14; i++) { const an = -0.25 + i / 13 * (Math.PI + 0.5), r = 0.6 + random() * 0.22; hole[i ? 'lineTo' : 'moveTo'](Math.cos(an) * r * 1.1, Math.max(0, Math.sin(an) * r * 1.6 + 0.2)); }
      const gap = put(new THREE.ShapeGeometry(hole), dark, [-4.476, 0, BZ]); gap.rotation.y = Math.PI / 2; gap.castShadow = false;
      for (let i = 0; i < 12; i++) { const an = i / 11 * Math.PI, m = put(new THREE.DodecahedronGeometry(0.12 + random() * 0.1, 0), rock, [-4.42, Math.sin(an) * 1.22 + 0.1, BZ - Math.cos(an) * 0.8]); m.rotation.set(random() * 3, random() * 3, 0); }
      const spill = Array.from({ length: 46 }, () => { const d = random() ** 1.6 * 1.25, w = (random() - 0.5) * (1.5 - d * 0.5), size = 0.05 + random() * 0.13 * (1 - d * 0.4); return { at: [-4.4 + d, size * 0.55 + (1 - d / 1.25) * 0.22 * random(), BZ + w] as P3, size }; });
      const rubble = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), rock, spill.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      spill.forEach((sp, i) => { q.setFromEuler(new THREE.Euler(random() * 3, random() * 3, random() * 3)); m4.compose(new THREE.Vector3(...sp.at), q, new THREE.Vector3(sp.size, sp.size * 0.75, sp.size)); rubble.setMatrixAt(i, m4); });
      rubble.castShadow = rubble.receiveShadow = true; root.add(rubble);
      put(new THREE.SphereGeometry(1, 16, 8), s.material('#bda97f', { roughness: 1 }), [-4.25, 0, BZ]).scale.set(0.75, 0.2, 0.9);
      const glow = mix(0.1, 0.45, Math.sin(mood.daylight * Math.PI));
      const shaft = put(new THREE.PlaneGeometry(1.7, 1.2), new THREE.MeshStandardMaterial({ color: '#eef0e6', transparent: true, opacity: glow * 0.5, depthWrite: false, roughness: 1 }), [-3.3, 0.005, BZ]); shaft.rotation.x = -Math.PI / 2; shaft.castShadow = false;
      blocked.push([0.2, 2.3]);
    }

    // ================= lamps =================
    const flames: THREE.Mesh[] = [], lights: THREE.PointLight[] = [];
    const flameMat = new THREE.MeshStandardMaterial({ color: '#ffc04a', emissive: '#ff8f20', emissiveIntensity: mix(1.2, 2.4, mood.warmth), roughness: 1 });
    const flame = (at: P3, size: number, power: number) => {
      const f = put(new THREE.ConeGeometry(size * 0.45, size * 1.5, 8), flameMat, [at[0], at[1] + size * 0.75, at[2]]); f.castShadow = false; f.userData.phase = flames.length * 2.1; flames.push(f);
      put(new THREE.SphereGeometry(size * 0.42, 8, 6), flameMat, at).castShadow = false;
      if (lights.length < 2) { const l = new THREE.PointLight('#ffa64a', power * 1.7, 16, 1.5); l.position.set(at[0], at[1] + size, at[2]); l.userData.power = power * 1.7; root.add(l); lights.push(l); }
    };
    const bronze = s.material('#a8763a', { metalness: 0.5, roughness: 0.45 });
    if (a.lamp === 'stands') for (const [x, z] of [[-1.25, -2.2], [1.55, -2.2]] as const) { put(lathe([[0.2, 0], [0.21, 0.03], [0.05, 0.12], [0.035, 1.15], [0.07, 1.22], [0.17, 1.34], [0.18, 1.36], [0.12, 1.3], [0, 1.3]]), new THREE.MeshStandardMaterial({ color: '#a8763a', metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide }), [x, 0, z]); flame([x, 1.38, z], 0.16, 16); }
    else if (a.lamp === 'brackets') for (const x of [-2.4, 0.9]) { s.rod([x, 1.55, -3.48], [x, 1.75, -3.2], 0.03, bronze); put(new THREE.ConeGeometry(0.07, 0.34, 8), s.material('#b99a5a', { roughness: 1 }), [x, 1.9, -3.14]).rotation.x = Math.PI - 0.5; flame([x, 2.08, -2.9], 0.2, 8); }
    else if (a.lamp === 'floor') { put(lathe([[0, 0], [0.06, 0], [0.12, 0.04], [0.125, 0.05], [0.09, 0.02], [0, 0.02]]), s.material('#a9603d', { roughness: 0.85 }), [1.45, 0.18, 1.05]); flame([1.52, 0.25, 1.05], 0.09, 13); }
    else {
      put(new THREE.BoxGeometry(0.7, 0.5, 0.5), s.material('#b08a55', { roughness: 0.9 }), [1.6, 0.25, -2.4]); for (const y of [0.1, 0.4]) put(new THREE.BoxGeometry(0.72, 0.05, 0.52), s.material('#8a6a40'), [1.6, y, -2.4]);
      put(new THREE.CylinderGeometry(0.09, 0.11, 0.08, 12), s.material('#4a5560', { metalness: 0.6, roughness: 0.4 }), [1.6, 0.54, -2.4]); put(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 12), new THREE.MeshStandardMaterial({ color: '#fff2c8', emissive: '#ffb648', emissiveIntensity: 1.6, transparent: true, opacity: 0.9 }), [1.6, 0.68, -2.4]).castShadow = false;
      put(new THREE.CylinderGeometry(0.05, 0.09, 0.07, 12), s.material('#4a5560', { metalness: 0.6, roughness: 0.4 }), [1.6, 0.81, -2.4]); put(new THREE.TorusGeometry(0.11, 0.008, 5, 16, Math.PI), s.material('#4a5560'), [1.6, 0.82, -2.4]);
      flame([1.6, 0.66, -2.4], 0.05, 15);
      for (let i = 0; i < 3; i++) { const an = i * 2.09 + 0.4; s.rod([-1.3, 1.5, -2.2], [-1.3 + Math.cos(an) * 0.45, 0, -2.2 + Math.sin(an) * 0.45], 0.018, s.material('#6a4f30')); }
      put(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshStandardMaterial({ color: '#fff6da', emissive: '#ffd27a', emissiveIntensity: 1.8 }), [-1.3, 1.62, -2.2]).castShadow = false;
      put(new THREE.ConeGeometry(0.22, 0.16, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#3d4a44', side: THREE.DoubleSide, metalness: 0.4 }), [-1.3, 1.74, -2.2]);
      const l = new THREE.PointLight('#ffd08a', 16, 14, 1.6); l.position.set(-1.3, 1.6, -2.0); l.userData.power = 16; root.add(l); lights.push(l);
    }

    // ================= furnishings along the walls =================
    const spots: [number, number, number][] = [];
    for (let x = -4.0; x <= 2.05; x += 0.86) spots.push([x, -3.02, 0]);
    for (let z = -2.2; z <= 3.05; z += 0.86) if (!blocked.some(([z0, z1]) => z > z0 && z < z1)) spots.push([-4.02, z, Math.PI / 2]);
    for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    const count = a.furnishing === 'bare' ? 0 : a.furnishing === 'niches' ? 0 : Math.min(spots.length, Math.round(mix(2, 14, mood.density)));
    const goldM = s.material(pristine ? '#e2b33c' : '#c79d3c', { metalness: mix(0.65, 0.25, wear), roughness: mix(0.3, 0.6, wear) });
    const alab = s.material('#eadfc2', { roughness: 0.4 }), clay = s.material('#aa6340', { roughness: 0.85 }), mudM = s.material('#7c7268', { roughness: 1 }), woodM = s.material('#7d5632', { roughness: 0.8 });
    const tip = (g: THREE.Group, h: number) => { if (random() < (wear - 0.45) * 1.4) { g.rotation.z = Math.PI / 2 * (random() < 0.5 ? 1 : -1) * 0.95; g.position.y += h * 0.32; g.position.z += 0.25 + random() * 0.3; return true; } return false; };
    const chest = (g: THREE.Group) => {
      const w = 0.62 + random() * 0.25, h = 0.36 + random() * 0.14, d = 0.42, style = Math.floor(random() * 3), body = style === 0 ? goldM : style === 1 ? s.material('#efe6cd') : s.material('#3a2c22', { roughness: 0.5 }), trim = style === 0 ? s.material('#27509f') : goldM;
      put(new THREE.BoxGeometry(w, h, d), body, [0, h / 2 + 0.05, 0], g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(new THREE.BoxGeometry(0.05, 0.05, 0.05), body, [sx * (w / 2 - 0.03), 0.025, sz * (d / 2 - 0.03)], g);
      put(new THREE.BoxGeometry(w + 0.01, 0.04, d + 0.01), trim, [0, h * 0.75 + 0.05, 0], g); put(new THREE.BoxGeometry(w + 0.01, 0.03, d + 0.01), trim, [0, 0.11, 0], g);
      const lid = new THREE.Group(); const roof = put(new THREE.CylinderGeometry(d * 0.58, d * 0.58, w + 0.04, 3), body, [0, 0.06, 0], lid); roof.rotation.set(0, 0, Math.PI / 2); roof.rotation.x = Math.PI / 6 + Math.PI / 2; roof.scale.set(0.36, 1, 1);
      put(new THREE.BoxGeometry(w + 0.04, 0.04, d + 0.04), body, [0, 0, 0], lid); put(new THREE.SphereGeometry(0.03, 8, 6), trim, [0, 0.05, d / 2 + 0.03], lid);
      lid.position.set(0, h + 0.07, 0); if (wear > 0.5 && random() < 0.7) { lid.position.set(0.1, h + 0.1, 0.16); lid.rotation.set(0.5, 0.2, 0.1); } g.add(lid);
      return h + 0.25;
    };
    const tallJar = (g: THREE.Group, mat: THREE.Material, stopper: boolean) => { const h = 0.62 + random() * 0.25; put(lathe([[0, 0], [0.06, 0], [0.17, h * 0.4], [0.18, h * 0.62], [0.09, h * 0.9], [0.1, h], [0.07, h]]), mat, [0, 0, 0], g); if (stopper) put(lathe([[0, h - 0.02], [0.11, h - 0.02], [0.08, h + 0.1], [0, h + 0.14]], 12), mudM, [0, 0, 0], g); return h; };
    const builders: Record<string, ((g: THREE.Group, i: number) => void)[]> = {
      treasure: [
        (g) => { const h = chest(g); if (mood.density > 0.6 && !ransacked && random() < 0.6) { const up = new THREE.Group(); up.position.y = h - 0.2; up.rotation.y = (random() - 0.5) * 0.3; up.scale.setScalar(0.8); chest(up); g.add(up); } },
        (g) => { for (let j = 0; j < 2; j++) { const jar = new THREE.Group(); jar.position.x = (j - 0.5) * 0.4; tallJar(jar, alab, false); tip(jar, 0.6); g.add(jar); } },
        (g) => { const wheel = new THREE.Group(); put(new THREE.TorusGeometry(0.46, 0.035, 8, 28), goldM, [0, 0, 0], wheel); put(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 10), goldM, [0, 0, 0], wheel).rotation.x = Math.PI / 2; for (let k = 0; k < 6; k++) { const sp = put(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 6), woodM, [0, 0, 0], wheel); sp.rotation.z = k * Math.PI / 6; } wheel.position.set(0, 0.47, 0.1); wheel.rotation.x = -0.22; g.add(wheel); },
        (g) => { for (let j = 0; j < 5; j++) { const st = put(new THREE.CylinderGeometry(0.014, 0.018, 1.5 + random() * 0.4, 6), j % 2 ? goldM : woodM, [(j - 2) * 0.09, 0.78, 0.12], g); st.rotation.set(-0.2, 0, (random() - 0.5) * 0.12); } },
        (g) => { put(new THREE.BoxGeometry(0.5, 0.04, 0.4), goldM, [0, 0.4, 0.05], g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(new THREE.CylinderGeometry(0.02, 0.028, 0.4, 6), goldM, [sx * 0.21, 0.2, 0.05 + sz * 0.16], g); put(new THREE.BoxGeometry(0.5, 0.5, 0.03), goldM, [0, 0.66, -0.15], g).rotation.x = -0.12; },
      ],
      provisions: [
        (g) => { for (let j = 0; j < 2; j++) { const jar = new THREE.Group(); jar.position.set((j - 0.5) * 0.42, 0, (random() - 0.5) * 0.1); tallJar(jar, clay, true); tip(jar, 0.6); g.add(jar); } },
        (g) => { put(lathe([[0, 0], [0.2, 0], [0.27, 0.3], [0.25, 0.34]]), new THREE.MeshStandardMaterial({ color: '#c2a35a', roughness: 1, side: THREE.DoubleSide }), [0, 0, 0], g); put(lathe([[0, 0.42], [0.14, 0.4], [0.27, 0.34]]), s.material('#b3934c', { roughness: 1 }), [0, 0, 0], g); },
        (g) => { for (let j = 0; j < 3; j++) { const jar = new THREE.Group(); jar.position.set((j - 1) * 0.28, 0, j % 2 ? 0.2 : 0); jar.scale.setScalar(0.62); tallJar(jar, j % 2 ? alab : clay, true); g.add(jar); } },
        (g) => { for (let j = 0; j < 3; j++) put(new THREE.SphereGeometry(1, 12, 8), s.material('#efe6cd', { roughness: 0.9 }), [(j - 1) * 0.26, 0.11 + (j === 1 ? 0.18 : 0), j === 1 ? 0 : 0.05], g).scale.set(0.2, 0.11, 0.14); },
      ],
      excavation: [
        (g) => { const w = 0.7, h = 0.45; put(new THREE.BoxGeometry(w, h, 0.5), s.material('#b89360', { roughness: 0.95 }), [0, h / 2, 0], g); for (const y of [0.08, h - 0.08]) put(new THREE.BoxGeometry(w + 0.02, 0.06, 0.52), s.material('#94703f'), [0, y, 0], g); },
        (g) => { for (const sx of [-1, 1]) { const rail = put(new THREE.BoxGeometry(0.05, 2.3, 0.04), woodM, [sx * 0.22, 1.1, 0.2], g); rail.rotation.x = -0.24; } for (let j = 0; j < 7; j++) put(new THREE.BoxGeometry(0.44, 0.035, 0.04), woodM, [0, 0.25 + j * 0.3, 0.42 - (0.25 + j * 0.3) * 0.245], g); },
        (g) => { for (let j = 0; j < 8; j++) { const seg = put(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8), s.material(j % 2 ? '#c8372c' : '#f2efe6'), [0, 0, 0], g); seg.position.set(0, 0.125 + j * 0.25, 0.26 - (0.125 + j * 0.25) * 0.12); seg.rotation.x = -0.12; } },
        (g) => { put(new THREE.CylinderGeometry(0.28, 0.28, 0.07, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#8a6a40', side: THREE.DoubleSide }), [0, 0.3, 0.1], g).rotation.x = -0.9; put(new THREE.BoxGeometry(0.45, 0.3, 0.32), s.material('#5b6b58', { roughness: 0.9 }), [0.05, 0.15, -0.05], g); },
      ],
    };
    const made = builders[a.furnishing] ?? [];
    for (let i = 0; i < count && made.length; i++) { const [x, z, yaw] = spots[i]; const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw + (random() - 0.5) * (0.15 + wear * 0.5); made[(i + Math.floor(random() * 2)) % made.length](g, i); root.add(g); }
    if (a.furnishing === 'niches') {
      const spotsN: [P3, number][] = [[[-2.9, 1.0, -3.47], 0], [[1.3, 1.0, -3.47], 0], [[-4.47, 1.0, -1.9], Math.PI / 2], [[-4.47, 1.0, ransacked ? -0.4 : 2.4], Math.PI / 2]];
      spotsN.forEach(([at, yaw], i) => { const g = new THREE.Group(); g.position.set(...at); g.rotation.y = yaw; put(new THREE.BoxGeometry(0.5, 0.6, 0.02), dark, [0, 0, 0], g).castShadow = false; put(new THREE.BoxGeometry(0.6, 0.06, 0.14), stone, [0, -0.33, 0.05], g); if (!(ransacked && i % 2)) { put(lathe([[0, 0], [0.06, 0], [0.05, 0.1], [0.085, 0.3], [0.04, 0.34], [0.06, 0.4], [0, 0.45]], 10), i % 2 ? goldM : s.material('#2b8fb0', { roughness: 0.3 }), [0, -0.3, 0.07], g).scale.z = 0.7; } root.add(g); });
      if (a.furnishing === 'niches' && mood.density > 0.5) for (const x of [-3.4, -1.4]) put(new THREE.BoxGeometry(1.4, 0.015, 0.7), s.material('#c9ad66', { roughness: 1 }), [x, 0.008, -2.95]);
    }
    if (a.furnishing === 'excavation') for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) { const card = s.label(String(10 + Math.floor(random() * 89)), 0.22, 0.13, [-3.3 + random() * 6, 0.07, -2.3 + random() * 0.4 + (i % 2) * 4.6], '#222', '#f6f3ea'); card.rotation.x = -0.9; }

    // ================= what lies on the floor =================
    if (a.floor === 'garlands') for (let i = 0; i < 4 + Math.round(mood.density * 5); i++) { const an = random() * 6.3, r = 2.0 + random() * 0.5, x = 0.2 + Math.cos(an) * r * 1.15, z = 0.2 + Math.sin(an) * r * 0.85; if (Math.abs(x) > 4 || Math.abs(z) > 3.1) continue; const g = put(new THREE.TorusGeometry(0.2 + random() * 0.08, 0.035, 6, 20, Math.PI * (1.2 + random() * 0.8)), s.material(wear > 0.5 ? '#8a8358' : '#5f8a48', { roughness: 1 }), [x, 0.03, z]); g.rotation.set(Math.PI / 2, 0, random() * 6); for (let k = 0; k < 5; k++) put(new THREE.SphereGeometry(0.035, 6, 5), s.material(k % 2 ? '#5b84cf' : '#ece6d2'), [x + Math.cos(k * 1.2 + an) * 0.22, 0.05, z + Math.sin(k * 1.2 + an) * 0.22]); }
    if (a.floor === 'footprints') { const dust = new THREE.MeshStandardMaterial({ color: '#9c8a68', roughness: 1 }); const from = new THREE.Vector3(entry[0], 0, entry[2] + 0.2), to = new THREE.Vector3(1.6, 0, -0.9), n = 9; for (let i = 0; i < n; i++) { const t = i / (n - 1), p = from.clone().lerp(to, t), dir = to.clone().sub(from).normalize(); p.add(new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar(i % 2 ? 0.11 : -0.11)); const print = put(new THREE.CylinderGeometry(1, 1, 0.004, 12), dust, [p.x, 0.003, p.z]); print.scale.set(0.06, 1, 0.14); print.rotation.y = Math.atan2(dir.x, dir.z); print.castShadow = false; } }
    if (a.floor === 'drifts' || ransacked) { const sand = s.material('#cbb78c', { roughness: 1 }); for (let i = 0; i < (a.floor === 'drifts' ? 7 : 3); i++) { const alongBack = i % 2 === 0; const x = alongBack ? -4 + random() * 6 : -4.25, z = alongBack ? -3.3 : -3 + random() * 6; const d = put(new THREE.SphereGeometry(1, 14, 8), sand, [x, 0, z]); d.scale.set(alongBack ? 0.7 + random() * 0.5 : 0.3, 0.1 + random() * 0.1, alongBack ? 0.3 : 0.7 + random() * 0.5); }
      const chips = Array.from({ length: 30 + Math.round(wear * 50) }, () => { const alongBack = random() < 0.5; return { at: [alongBack ? -4.3 + random() * 8.4 : -4.3 + random() * 0.7, 0.012, alongBack ? -3.35 + random() * 0.6 : -3.3 + random() * 6.5] as P3, size: 0.015 + random() * 0.035, color: random() < 0.3 ? GROUNDS[a.style] : ROCK }; });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), chips); }
    if (pristine && mood.density > 0.55 && a.furnishing !== 'bare') { const glint = Array.from({ length: 24 }, () => ({ at: [-3.9 + random() * 6, 0.02, -2.75 + random() * 0.4] as P3, size: 0.02 + random() * 0.025, color: random() < 0.7 ? '#e2b33c' : '#2f6fc0' })); s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.3 }), glint); }

    // ================= placement and life =================
    const basePlace = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      basePlace(items);
      for (const item of items) { const cap = item.hero ? 2.0 : 1.7; if (item.holder.scale.x > cap) item.holder.scale.setScalar(cap); }
    };
    const speed = mix(4, 15, mood.energy), depth = mix(0.05, 0.22, mood.energy);
    world.update = (_dt: number, time: number) => {
      lights.forEach((l, i) => { l.intensity = l.userData.power * (1 - depth + depth * Math.sin(time * speed + i * 1.9) * Math.sin(time * speed * 0.37 + i)); });
      for (const f of flames) { f.scale.y = 0.9 + 0.2 * Math.sin(time * speed * 0.8 + f.userData.phase); f.rotation.z = 0.1 * Math.sin(time * speed * 0.5 + f.userData.phase); }
    };
    return world;
  },
});
