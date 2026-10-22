import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { sandGround, sandTone } from './sand';

type P3 = readonly [number, number, number];

const LIVERIES = {
  works: 'White with sweeping blue and red stripes: a factory team car, once immaculate.',
  yellow: 'Loud yellow with a black lower half and big black numbers: a privateer.',
  gulf: 'Powder blue with an orange stripe along its flank.',
  desert: 'Matt sand-khaki with hand-painted numbers: a low-budget expedition.',
  banger: 'A cheap old car hand-painted pink with daisies and a slogan: a charity banger rally.',
} as const;
const BASE: Record<keyof typeof LIVERIES, string> = { works: '#edeeea', yellow: '#e8b81c', gulf: '#9ccadd', desert: '#b5a276', banger: '#e2709c' };
const NUMBERS = {
  seven: '7, the lucky number.',
  thirteen: '13, which nobody else would take.',
  fourOhFour: '404: not found.',
  one: '1, the favourite.',
  ninetyNine: '99, the backmarker.',
} as const;
const DIGITS: Record<keyof typeof NUMBERS, string> = { seven: '7', thirteen: '13', fourOhFour: '404', one: '1', ninetyNine: '99' };

interface Spec { zf: number; zr: number; y0: number; yb: number; yr: number; zs: number; zrf: number; zrr: number; zc: number; W: number; rw: number; zw: number; open?: boolean }
const SPECS = {
  hatch: { zf: 1.85, zr: -1.8, y0: 0.32, yb: 0.9, yr: 1.38, zs: 0.7, zrf: 0.2, zrr: -1.45, zc: -1.74, W: 1.66, rw: 0.31, zw: 1.2 },
  wagon: { zf: 2.3, zr: -2.3, y0: 0.52, yb: 1.16, yr: 1.86, zs: 0.95, zrf: 0.6, zrr: -2.1, zc: -2.24, W: 1.8, rw: 0.4, zw: 1.45 },
  saloon: { zf: 2.25, zr: -2.25, y0: 0.3, yb: 0.88, yr: 1.38, zs: 0.8, zrf: 0.3, zrr: -0.8, zc: -1.3, W: 1.68, rw: 0.31, zw: 1.35 },
  buggy: { zf: 1.7, zr: -1.7, y0: 0.38, yb: 0.8, yr: 1.5, zs: 0.55, zrf: 0.2, zrr: -0.75, zc: -0.75, W: 1.6, rw: 0.36, zw: 1.15, open: true },
} satisfies Record<string, Spec>;

export default defineThing({
  questions: {
    model: choice('What kind of car was it?', {
      hatch: 'A boxy little hatchback, an 80s rally special.',
      wagon: 'A tall, long four-wheel-drive station wagon built for raids.',
      saloon: 'An old three-box family saloon that had no business being here.',
      buggy: 'An open tube-frame dune buggy with a roll cage and no roof.',
    }),
    livery: choice('What was its livery?', LIVERIES),
    number: choice('What race number does it carry?', NUMBERS),
    burial: score('How far has the sand taken it?', ['Standing on the surface, sand only inside it', 'Sunk to the sills with a drift up one side', 'Drowned to the windows']),
    wheel: choice('What became of the missing wheel?', {
      gone: 'Simply gone: the bare hub rests on a flat stone.',
      nearby: 'It lies flat in the sand a few metres off, half buried.',
      leaning: 'It leans against the car beside a jack, a repair that was never finished.',
      broken: 'Still attached but folded flat under the car on a snapped suspension arm.',
    }),
    story: choice('What does the wreck tell you happened afterwards?', {
      stripped: 'It was stripped: seats, lamps and a door gone, wires hanging.',
      camp: 'Someone waited here: a tarp is rigged from the roof, with a jerrycan and a dead fire.',
      rolled: 'It rolled: the roof is crushed sideways and pieces are scattered round it.',
      stuck: 'They tried: sand ladders and a shovel are still dug in at the wheels, with deep ruts behind.',
      shrine: 'It became a landmark: stones piled on it, names scratched in the paint, a rag flying from the aerial.',
    }),
    roof: choice('What does it carry on top?', {
      bare: 'Nothing: a bare roof with the race number painted on it.',
      rack: 'A roof rack with a spare tyre and a jerrycan.',
      lamps: 'A bar of big round rally spotlights.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const spec: Spec = SPECS[a.model];
    const { zf, zr, y0, yb, zs, zrf, zrr, zc, W, rw, zw } = spec;
    const rolled = a.story === 'rolled', stripped = a.story === 'stripped';
    const yr = spec.yr - (rolled ? 0.26 : 0), skew = rolled ? 0.24 : 0;
    const sand = sandTone('#dfbd84', mood.warmth);
    const faded = mix(0.1, 0.6, mood.wear);
    const base = new THREE.Color(BASE[a.livery]).lerp(new THREE.Color('#cdbfa6'), faded * 0.55);
    const hex = (c: THREE.Color) => `#${c.getHexString()}`;
    const paint = new THREE.MeshStandardMaterial({ color: base, roughness: mix(0.35, 0.95, mood.wear), metalness: 0.15 });
    const dark = s.material('#25262a', { roughness: 0.8 });
    const steel = s.material('#8e8d88', { metalness: 0.6, roughness: 0.5 });
    const rust = s.material('#7c4a2e', { roughness: 1 });
    const rubber = s.material('#1d1c1c', { roughness: 0.95 });
    const sandMaterial = s.material(sand.clone().multiplyScalar(0.97), { roughness: 1 });
    const digits = DIGITS[a.number];

    const car = new THREE.Group();
    const add = <T extends THREE.Object3D>(mesh: T) => { car.add(mesh); return mesh; };

    // Lower body: a side profile with wheel arches, extruded across the width.
    const ra = rw + 0.09;
    const profile = new THREE.Shape();
    profile.moveTo(zr, y0 + 0.1);
    profile.lineTo(zr + 0.06, y0);
    profile.lineTo(-zw - ra, y0); profile.absarc(-zw, y0 - 0.02, ra, Math.PI, 0, true);
    profile.lineTo(zw - ra, y0); profile.absarc(zw, y0 - 0.02, ra, Math.PI, 0, true);
    profile.lineTo(zf - 0.06, y0); profile.lineTo(zf, y0 + 0.12);
    profile.lineTo(zf, yb - 0.3); profile.lineTo(zf - 0.1, yb - 0.2); profile.lineTo(zs, yb - 0.2); profile.lineTo(zs, yb);
    profile.lineTo(zc, yb); profile.lineTo(zr, yb - (spec.open ? 0.2 : 0.06)); profile.lineTo(zr, y0 + 0.1);
    const bevel = 0.04;
    const shell = new THREE.ExtrudeGeometry(profile, { depth: W - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: 0.03, bevelSegments: 2, curveSegments: 10 });
    shell.translate(0, 0, -(W - bevel * 2) / 2);
    shell.rotateY(-Math.PI / 2);
    add(s.mesh(shell, paint));
    for (const side of [-1, 1]) add(s.box([0.2, 0.2, zf - zs - 0.06], [side * (W / 2 - 0.1), yb - 0.1, (zf + zs) / 2 - 0.03], paint));

    // Livery, painted once and worn by the wind, laid on both flanks in the exact outline of the body.
    const flank = (() => {
      const canvas = document.createElement('canvas');
      const CW = (canvas.width = 1024), CH = (canvas.height = 192);
      const g = canvas.getContext('2d')!;
      const U = (z: number) => ((z - zr) / (zf - zr)) * CW;
      g.fillStyle = hex(base); g.fillRect(0, 0, CW, CH);
      if (a.livery === 'works') {
        for (const [colour, shift] of [['#1f4fa8', 0], ['#c8322c', 90]] as const) {
          g.fillStyle = colour; g.globalAlpha = 1 - faded * 0.5;
          g.beginPath(); g.moveTo(120 + shift, CH); g.lineTo(190 + shift, CH); g.lineTo(760 + shift, 0); g.lineTo(690 + shift, 0); g.closePath(); g.fill();
        }
      } else if (a.livery === 'yellow') { g.fillStyle = '#1c1b1a'; g.globalAlpha = 1 - faded * 0.4; g.fillRect(0, CH * 0.58, CW, CH); }
      else if (a.livery === 'gulf') { g.globalAlpha = 1 - faded * 0.4; g.fillStyle = '#e8762a'; g.fillRect(0, CH * 0.3, CW, CH * 0.2); g.fillStyle = '#1d2d5a'; g.fillRect(0, CH * 0.5, CW, 7); }
      else if (a.livery === 'banger') {
        for (let i = 0; i < 16; i++) {
          const x = random() * CW, y = random() * CH, r = 12 + random() * 12;
          g.globalAlpha = 0.9 - faded * 0.4; g.fillStyle = '#f7f3ea';
          for (let p = 0; p < 6; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.05) * r, y + Math.sin(p * 1.05) * r, r * 0.55, 0, 7); g.fill(); }
          g.fillStyle = '#f0c22c'; g.beginPath(); g.arc(x, y, r * 0.5, 0, 7); g.fill();
        }
      }
      g.globalAlpha = 1;
      // Number roundel on the door.
      const cx = U((zs + zc) / 2 + (spec.open ? 0.5 : 0.25)), cy = CH * 0.5, R = CH * 0.42;
      g.fillStyle = a.livery === 'desert' ? hex(base) : '#f6f3ea';
      if (a.livery !== 'desert') { g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); }
      g.fillStyle = '#17171a'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `${a.livery === 'desert' || a.livery === 'banger' ? 'italic ' : ''}bold ${digits.length > 2 ? R * 0.95 : R * 1.4}px sans-serif`;
      g.fillText(digits, cx, cy + 4);
      // Sponsor patches, all invented.
      const patches: [string, string, string][] = [['SAHEL OIL', '#d93a2c', '#fff'], ['PNEUS ATLAS', '#1d2d5a', '#f4d21f'], ['RADIO ERG', '#f4d21f', '#1c1b1a'], ['KOLA', '#2a7a3c', '#fff'], ['TURBO', '#1c1b1a', '#fff']];
      const slots: [number, number][] = [[U(zs + (zf - zs) * 0.45), CH * 0.35], [U(zc - 0.02 + (zr - zc) * 0.3) + 60, CH * 0.3], [cx + R * 2.1, CH * 0.26], [cx - R * 2.2, CH * 0.3]];
      if (a.livery === 'banger') {
        g.fillStyle = '#17171a'; g.font = 'italic bold 30px sans-serif';
        g.fillText('TOMBOUCTOU', cx + R * 2.9, CH * 0.24); g.fillText('OU RIEN !', cx + R * 2.9, CH * 0.44);
      } else if (a.livery !== 'desert') slots.forEach(([x, y], i) => {
        const [text, bg, fg] = patches[(i + Math.floor(random() * 5)) % 5];
        g.globalAlpha = 1 - faded * 0.5;
        g.fillStyle = bg; g.fillRect(x - 62, y - 17, 124, 34);
        g.fillStyle = fg; g.font = 'bold 19px sans-serif'; g.fillText(text, x, y + 1, 112);
      });
      g.globalAlpha = 1;
      // Shut lines and handles.
      g.strokeStyle = 'rgba(20,20,22,0.75)'; g.lineWidth = 3;
      const doors = spec.open ? [] : a.model === 'hatch' ? [zs - 0.05, -0.45] : [zs - 0.05, (zs + zc) / 2 + 0.2, zc + 0.35];
      for (const z of doors) { g.beginPath(); g.moveTo(U(z), 0); g.lineTo(U(z), CH * 0.86); g.stroke(); g.fillStyle = '#3a3a3c'; g.fillRect(U(z) - 46, CH * 0.12, 30, 7); }
      g.fillStyle = 'rgba(20,20,22,0.8)'; g.fillRect(0, CH * 0.9, CW, CH * 0.1);
      if (a.story === 'shrine') {
        g.fillStyle = 'rgba(30,30,32,0.85)';
        for (const [text, x, y, turn] of [['ALI + S.', 0.2, 0.7, -0.08], ['2019', 0.62, 0.78, 0.05], ['ICI', 0.82, 0.66, -0.12], ['MERCI', 0.36, 0.2, 0.06], ['K.M. 03', 0.08, 0.3, 0.1]] as const) {
          g.save(); g.translate(x * CW, y * CH); g.rotate(turn); g.font = `italic ${18 + random() * 10}px sans-serif`; g.fillText(text, 0, 0); g.restore();
        }
      }
      // Rust, sandblast and a tide line of dust.
      for (let i = 0; i < 26 * mood.wear; i++) { g.globalAlpha = 0.5 + random() * 0.4; g.fillStyle = random() < 0.5 ? '#7c4a2e' : '#5d3a26'; g.beginPath(); g.ellipse(random() * CW, CH * (0.45 + random() * 0.55), 6 + random() * 26, 4 + random() * 12, 0, 0, 7); g.fill(); }
      for (let i = 0; i < 520 * faded; i++) { g.globalAlpha = 0.2 + random() * 0.45; g.fillStyle = random() < 0.6 ? '#d9cdb6' : '#a39a8c'; const length = 30 + random() * 160; g.fillRect(random() * CW - length / 2, random() * CH, length, 1 + random() * 4); }
      const tide = g.createLinearGradient(0, CH * (0.9 - a.burial * 0.55), 0, CH);
      tide.addColorStop(0, 'rgba(0,0,0,0)'); tide.addColorStop(1, hex(sand));
      g.globalAlpha = 0.85; g.fillStyle = tide; g.fillRect(0, 0, CW, CH);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, roughness: mix(0.4, 0.95, mood.wear), metalness: 0.1, side: THREE.DoubleSide });
    })();
    const missingDoor = stripped && !spec.open;
    for (const side of [-1, 1]) {
      const geometry = new THREE.ShapeGeometry(profile, 10);
      const p = geometry.attributes.position, uv = geometry.attributes.uv;
      for (let i = 0; i < p.count; i++) { const u = (p.getX(i) - zr) / (zf - zr); uv.setXY(i, side < 0 ? u : 1 - u, (p.getY(i) - y0) / (yb - y0)); }
      geometry.rotateY(-Math.PI / 2);
      const decal = add(s.mesh(geometry, flank, [side * (W / 2 + 0.004), 0, 0]));
      decal.castShadow = false;
    }
    if (missingDoor) add(s.box([0.03, yb - y0 - 0.14, zs - 0.25 - (a.model === 'hatch' ? -0.45 : (zs + zc) / 2 + 0.2)], [W / 2 + 0.006, (yb + y0) / 2 + 0.02, (zs - 0.05 + (a.model === 'hatch' ? -0.45 : (zs + zc) / 2 + 0.2)) / 2], new THREE.MeshStandardMaterial({ color: '#191715', roughness: 1 })));

    // Engine bay and the bonnet standing open.
    const bayZ = (zs + zf) / 2;
    if (!spec.open) {
      add(s.box([W * 0.42, 0.26, (zf - zs) * 0.5], [-0.05, yb - 0.1, bayZ - 0.05], stripped ? rust : dark));
      if (!stripped) { add(s.cylinder(0.14, 0.14, 0.09, [0.3, yb + 0.02, bayZ + 0.1], s.material('#b5372c'), 14)); add(s.box([0.24, 0.18, 0.16], [-W * 0.3, yb - 0.1, zs + 0.2], dark)); }
      add(s.box([W * 0.62, 0.3, 0.05], [0, yb - 0.12, zf - 0.16], steel));
      for (let i = 0; i < 3; i++) add(s.tube([[(-0.3 + i * 0.25), yb - 0.05, bayZ], [(-0.4 + i * 0.3), yb + 0.08 + random() * 0.1, bayZ + 0.25], [(-0.5 + i * 0.4), yb - 0.1, zf - 0.2]], 0.012, dark));
    }
    add(s.ball([W * 0.34, 0.1 + a.burial * 0.16, (zf - zs) * 0.4], [0.1, yb - 0.2, bayZ], sandMaterial, 12));
    const hood = new THREE.Group();
    const hoodLength = zf - zs - 0.04;
    const lid = s.box([W - 0.06, 0.035, hoodLength], [0, 0, hoodLength / 2], paint);
    hood.add(lid, s.box([W - 0.3, 0.02, hoodLength - 0.2], [0, -0.025, hoodLength / 2], dark));
    hood.position.set(0, yb + 0.02, zs + 0.02);
    const lift = spec.open ? 0.25 : mix(0.75, 1.2, random());
    hood.rotation.x = -lift;
    add(hood);
    if (!spec.open) add(s.rod([W / 2 - 0.16, yb - 0.05, zf - 0.3], [W / 2 - 0.2, yb + Math.sin(lift) * hoodLength * 0.72, zs + Math.cos(lift) * hoodLength * 0.72], 0.012, steel));

    // Cabin: bare pillars and a roof, or a roll cage. No glass is left.
    const post = (from: P3, to: P3, radius = 0.045) => add(s.rod(from, to, radius, spec.open ? steel : paint));
    const zB = spec.open ? zrr : a.model === 'hatch' ? -0.45 : (zs + zc) / 2 + 0.15;
    const topX = (side: number) => side * (W / 2 - 0.16) + skew;
    for (const side of [-1, 1]) {
      const x = side * (W / 2 - 0.07);
      post([x, yb - 0.02, zs], [topX(side), yr, zrf]);
      post([x, yb - 0.02, zB], [topX(side), yr, spec.open ? zrr : zB + 0.03]);
      if (!spec.open) post([x, yb - 0.02, zc], [topX(side), yr, zrr], 0.06);
      if (a.model === 'wagon') post([x, yb - 0.02, zc * 0.5], [topX(side), yr, zrr * 0.52]);
      post([topX(side), yr, zrf], [topX(side), yr, zrr], 0.04);
      if (spec.open) { post([x, yb - 0.02, zB], [x, yb + 0.25, zr + 0.2]); post([topX(side), yr, zrr], [x, yb + 0.25, zr + 0.2]); }
    }
    post([topX(-1), yr, zrf], [topX(1), yr, zrf], 0.04);
    post([topX(-1), yr, zrr], [topX(1), yr, zrr], 0.04);
    if (spec.open) post([topX(-1), yr, zrr], [topX(1), yb, zrr], 0.035);
    const roofLength = zrf - zrr + 0.08, roofZ = (zrf + zrr) / 2;
    if (!spec.open) {
      add(s.box([W - 0.26, 0.05, roofLength], [skew, yr + 0.02, roofZ], paint)).rotation.z = rolled ? 0.07 : 0;
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = Math.round((256 * roofLength) / (W - 0.3));
      const g = canvas.getContext('2d')!;
      g.fillStyle = hex(base); g.fillRect(0, 0, 256, canvas.height);
      if (a.livery === 'works') { g.fillStyle = '#1f4fa8'; g.fillRect(96, 0, 28, canvas.height); g.fillStyle = '#c8322c'; g.fillRect(132, 0, 28, canvas.height); }
      if (a.livery === 'gulf') { g.fillStyle = '#e8762a'; g.fillRect(104, 0, 48, canvas.height); }
      g.fillStyle = '#f6f3ea'; g.fillRect(58, canvas.height * 0.5 - 62, 140, 124);
      g.fillStyle = '#17171a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold ${digits.length > 2 ? 62 : 96}px sans-serif`;
      g.fillText(digits, 128, canvas.height * 0.5 + 4);
      for (let i = 0; i < 300 * faded; i++) { g.globalAlpha = 0.3 + random() * 0.4; g.fillStyle = '#d9cdb6'; g.fillRect(random() * 256, random() * canvas.height, 2 + random() * 5, 14 + random() * 60); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const top = add(s.mesh(new THREE.PlaneGeometry(W - 0.3, roofLength - 0.04), new THREE.MeshStandardMaterial({ map, roughness: 0.8 }), [skew, yr + 0.048, roofZ]));
      top.rotation.set(-Math.PI / 2, 0, Math.PI);
      top.castShadow = false;
    }
    // Inside: seats, wheel, cage, and the sand that got in.
    const seatMaterial = s.material(mood.cheer > 0.5 ? '#b5372c' : '#2c2d33', { roughness: 0.9 });
    if (!stripped) for (const side of [-1, 1]) {
      add(s.box([0.44, 0.16, 0.5], [side * 0.37, yb + 0.02, zB + 0.45], seatMaterial));
      add(s.box([0.44, 0.62, 0.12], [side * 0.37, yb + 0.36, zB + 0.16], seatMaterial)).rotation.x = -0.15;
    }
    add(s.ring(0.17, 0.02, [0.37, yb + 0.26, zs - 0.28], dark)).rotation.x = -0.5;
    add(s.rod([0.37, yb + 0.26, zs - 0.28], [0.37, yb + 0.08, zs - 0.02], 0.02, dark));
    add(s.box([W - 0.3, 0.2, 0.2], [0, yb + 0.08, zs - 0.06], dark));
    if (!spec.open) for (const side of [-1, 1]) add(s.rod([side * (W / 2 - 0.2), yb, zB - 0.1], [-side * (W / 2 - 0.26) + skew, yr - 0.08, zB - 0.1], 0.028, steel));
    const fill = add(s.ball([W / 2 - 0.1, 0.12 + a.burial * 0.34 + mood.wear * 0.1, (zs - zc) / 2 + 0.1], [-0.12, yb - 0.03, (zs + zc) / 2], sandMaterial, 16));
    fill.rotation.z = 0.12;

    // Nose and tail.
    add(s.box([W * 0.5, 0.16, 0.04], [0, yb - 0.42, zf + 0.012], dark));
    for (const side of [-1, 1]) {
      const lit = !stripped && !(side > 0 && mood.wear > 0.4);
      add(s.cylinder(0.09, 0.09, 0.05, [side * W * 0.36, yb - 0.42, zf + 0.01], lit ? s.material('#e9ecdf', { roughness: 0.2 }) : dark, 14)).rotation.x = Math.PI / 2;
      add(s.box([0.2, 0.1, 0.04], [side * W * 0.36, yb - 0.3, zr - 0.005], s.material('#a8261f', { roughness: 0.4 })));
    }
    const bumper = add(s.box([W + 0.04, 0.1, 0.1], [0, y0 + 0.08, zf + 0.05], spec.open ? steel : dark));
    if (mood.wear > 0.5 || rolled) { bumper.rotation.z = 0.16; bumper.position.y -= 0.1; }
    add(s.box([W + 0.04, 0.1, 0.1], [0, y0 + 0.1, zr - 0.04], spec.open ? steel : dark));
    if (!stripped) for (const side of [-0.5, 0.5]) {
      const lamp = add(s.cylinder(0.11, 0.09, 0.09, [side * 0.55, y0 + 0.26, zf + 0.12], steel, 14));
      lamp.rotation.x = Math.PI / 2;
      add(s.cylinder(0.105, 0.105, 0.012, [side * 0.55, y0 + 0.26, zf + 0.17], s.material('#f3f1e6'), 14)).rotation.x = Math.PI / 2;
    }
    if (spec.open) {
      add(s.box([0.6, 0.4, 0.6], [0, yb + 0.12, zr + 0.45], dark));
      for (const side of [-1, 1]) add(s.rod([side * 0.2, yb + 0.3, zr + 0.4], [side * 0.28, yb + 0.55, zr - 0.1], 0.04, rust));
    } else add(s.rod([W * 0.3, y0 + 0.02, zr + 0.3], [W * 0.3, y0 - 0.02, zr - 0.12], 0.03, rust));
    // Aerial.
    const mast: P3 = [topX(-1) + 0.05, spec.open ? yr : yr + 0.04, zrr + 0.1];
    const tip: P3 = [mast[0] - 0.12, mast[1] + 1.25, mast[2] - 0.3];
    add(s.rod(mast, tip, 0.008, dark, 0.004));

    // Roof load.
    if (a.roof === 'lamps') {
      const count = spec.open ? 4 : 5, y = yr + 0.16, z = zrf - 0.05;
      add(s.rod([topX(-1), yr + 0.05, z], [topX(1), yr + 0.05, z], 0.02, dark));
      for (let i = 0; i < count; i++) {
        const x = skew + (i - (count - 1) / 2) * 0.27;
        if (stripped && i % 2) continue;
        add(s.cylinder(0.12, 0.09, 0.1, [x, y, z], dark, 14)).rotation.x = Math.PI / 2;
        add(s.cylinder(0.115, 0.115, 0.012, [x, y, z + 0.055], s.material(i === 1 && mood.wear > 0.5 ? '#3a3a3c' : '#f3f1e6', { roughness: 0.3 }), 14)).rotation.x = Math.PI / 2;
      }
    } else if (a.roof === 'rack') {
      const y = yr + 0.14, x0 = topX(-1) + 0.04, x1 = topX(1) - 0.04, z0 = zrr + 0.1, z1 = spec.open ? zrf : zrf - 0.15;
      for (const [from, to] of [[[x0, y, z0], [x1, y, z0]], [[x0, y, z1], [x1, y, z1]], [[x0, y, z0], [x0, y, z1]], [[x1, y, z0], [x1, y, z1]]] as [P3, P3][]) add(s.rod(from, to, 0.02, dark));
      for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) add(s.rod([x, y, z], [x, yr + 0.02, z], 0.015, dark));
      for (let i = 1; i < 4; i++) add(s.rod([x0, y, mix(z0, z1, i / 4)], [x1, y, mix(z0, z1, i / 4)], 0.012, dark));
      if (!stripped) {
        const spare = add(s.mesh(new THREE.TorusGeometry(rw - 0.09, 0.1, 10, 22), rubber, [skew + 0.1, y + 0.11, mix(z0, z1, 0.35)]));
        spare.rotation.x = Math.PI / 2;
        add(s.box([0.18, 0.42, 0.3], [skew - 0.45, y + 0.11, mix(z0, z1, 0.8)], s.material('#59663c'))).rotation.z = Math.PI / 2;
      }
    }

    // Wheels: one corner has lost its own.
    const corner = [random() < 0.7 ? 1 : -1, random() < 0.6 ? 1 : -1] as const;
    const makeWheel = (flat: number) => {
      const group = new THREE.Group();
      const tyre = s.cylinder(rw, rw, 0.2, [0, 0, 0], rubber, 22);
      tyre.rotation.z = Math.PI / 2;
      const rim = s.cylinder(rw * 0.58, rw * 0.58, 0.215, [0, 0, 0], a.livery === 'works' ? s.material('#e9e7df') : steel, 14);
      rim.rotation.z = Math.PI / 2;
      const hub = s.cylinder(rw * 0.2, rw * 0.2, 0.24, [0, 0, 0], dark, 8);
      hub.rotation.z = Math.PI / 2;
      group.add(tyre, rim, hub);
      group.scale.y = 1 - flat * 0.16;
      return group;
    };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * (W / 2 - 0.1), z = sz * zw;
      const lost = sx === corner[0] && sz === corner[1];
      if (!lost && !(stripped && sx === -corner[0] && sz === -corner[1])) {
        const flat = random() < mood.wear ? 1 : 0;
        const wheel = add(makeWheel(flat));
        wheel.position.set(x, rw * (1 - flat * 0.16), z);
        if (sz > 0) wheel.rotation.y = 0.3 * (random() - 0.3);
        continue;
      }
      add(s.cylinder(0.14, 0.14, 0.03, [x - sx * 0.02, rw, z], rust, 16)).rotation.z = Math.PI / 2;
      add(s.rod([x - sx * 0.02, rw, z], [x - sx * 0.4, rw + 0.12, z], 0.035, dark));
      if (lost && a.wheel === 'broken') {
        const wheel = add(makeWheel(1));
        wheel.position.set(x - sx * 0.12, 0.13, z + 0.1);
        wheel.rotation.z = sx * 1.35;
      }
    }

    // Set the car into the ground: sunk, and heeled toward its missing corner.
    const sink = a.burial * 0.26 + (a.wheel === 'gone' ? 0.03 : 0.1);
    const level = 0.07 + a.burial * 0.15;
    const drift = mix(0.2, yb + 0.15, a.burial), windward = -corner[0];
    const radius = zf + 1.15;
    const ground = sandGround({
      radius, colour: sand, random, rows: 28, dome: level,
      height: (x, z) => drift * Math.exp(-(((x - windward * (W / 2 + 0.5)) / 0.95) ** 2)) * Math.exp(-((z / (zf * 1.05)) ** 2)) + 0.03 * Math.sin(x * 1.7 + z * 0.9),
    });
    s.root.add(ground.mesh);
    const on = (x: number, z: number, lift = 0): P3 => [x, ground.y(x, z) + lift, z];
    const heel = (a.wheel === 'broken' ? 0.11 : 0.07) + (rolled ? 0.1 : 0);
    car.position.y = level - sink + 0.02;
    car.rotation.set(corner[1] * heel * 0.6, (random() - 0.5) * 0.2, -corner[0] * heel, 'YXZ');
    s.root.add(car);
    car.updateMatrixWorld(true);
    const out = (x: number, y: number, z: number) => car.localToWorld(new THREE.Vector3(x, y, z));

    const lostAt = out(corner[0] * (W / 2 - 0.1), rw, corner[1] * zw);
    const stone = s.material('#7a6e62', { flatShading: true, roughness: 1 });
    if (a.wheel === 'gone') {
      const slab = s.mesh(new THREE.DodecahedronGeometry(0.3, 0), stone, [lostAt.x, Math.max(0.04, lostAt.y - 0.3), lostAt.z]);
      slab.scale.set(1.1, 0.45, 0.9);
    } else if (a.wheel === 'nearby') {
      const wheel = makeWheel(0);
      const wx = lostAt.x + corner[0] * 0.95, wz = lostAt.z + corner[1] * 0.5;
      wheel.position.set(wx, ground.y(wx, wz) + 0.04, wz);
      wheel.rotation.set(0.12, random() * 3, Math.PI / 2 - 0.1);
      s.root.add(wheel);
    } else if (a.wheel === 'leaning') {
      const wheel = makeWheel(1);
      wheel.position.set(lostAt.x + corner[0] * 0.34, ground.y(lostAt.x + corner[0] * 0.3, lostAt.z) + rw * 0.9, lostAt.z - corner[1] * 0.75);
      wheel.rotation.z = -corner[0] * 0.3;
      s.root.add(wheel);
      s.box([0.14, 0.34, 0.14], [lostAt.x - corner[0] * 0.1, Math.max(0.17, lostAt.y - 0.3), lostAt.z], s.material('#b5372c'));
      const wrench = s.rod(on(lostAt.x + corner[0] * 0.7, lostAt.z + 0.2, 0.02), on(lostAt.x + corner[0] * 1.05, lostAt.z + 0.45, 0.02), 0.015, steel);
      void wrench;
    }

    // Afterwards.
    let flag: THREE.Mesh | null = null;
    const side = corner[0];
    if (a.story === 'stripped') {
      if (!spec.open) {
        const door = s.box([zs - zB - 0.1, 0.03, yb - y0 - 0.1], on(side * (W / 2 + 0.9), 0.6, 0.05), paint);
        door.rotation.set(0.1, 0.5 + random(), 0.05);
      }
      for (let i = 0; i < 3; i++) { const from = out(-0.3 + i * 0.3, yb + 0.2, zs - 0.1), to = out(-0.35 + i * 0.35, yb - 0.25 + random() * 0.2, zs - 0.25); s.tube([from.toArray() as unknown as P3, [from.x, from.y - 0.1, from.z - 0.08], to.toArray() as unknown as P3], 0.01, random() < 0.5 ? s.material('#b5372c') : dark); }
      const seat = s.box([0.44, 0.5, 0.12], on(-side * (W / 2 + 0.75), -1.0, 0.1), seatMaterial);
      seat.rotation.set(1.3, random() * 3, 0.2);
    } else if (a.story === 'camp') {
      const cloth = s.material(mood.cheer > 0.5 ? '#d8763a' : '#4f6a7a', { roughness: 1, side: THREE.DoubleSide });
      const e0 = out(side * (W / 2 - 0.16), spec.yr + 0.05, zrf), e1 = out(side * (W / 2 - 0.16), spec.yr + 0.05, zrr);
      const reach = 1.7, poleHeight = 1.35;
      const p0 = new THREE.Vector3(e0.x + side * reach, poleHeight, e0.z + 0.2), p1 = new THREE.Vector3(e1.x + side * reach, poleHeight - 0.1, e1.z - 0.2);
      const geometry = new THREE.PlaneGeometry(1, 1, 6, 6);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5;
        const near = e0.clone().lerp(e1, v), far = p0.clone().lerp(p1, v), at = near.lerp(far, u);
        at.y -= Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.28;
        p.setXYZ(i, at.x, at.y, at.z);
      }
      geometry.computeVertexNormals();
      s.mesh(geometry, cloth);
      for (const pole of [p0, p1]) {
        s.rod(on(pole.x, pole.z, -0.05), [pole.x, pole.y + 0.08, pole.z], 0.03, s.material('#8a6b4a'));
        s.rod([pole.x, pole.y, pole.z], on(pole.x + side * 0.8, pole.z + (pole === p0 ? 0.6 : -0.6), 0), 0.006, dark);
      }
      const cx = (p0.x + e0.x) / 2, cz = (e0.z + e1.z) / 2;
      s.box([0.34, 0.46, 0.18], on(cx + side * 0.3, cz - 0.5, 0.22), s.material('#59663c'));
      const bed = s.cylinder(0.13, 0.13, 0.8, on(cx - side * 0.2, cz + 0.4, 0.13), s.material('#7a5a4a'), 12);
      bed.rotation.x = Math.PI / 2;
      const fx = p0.x + side * 0.1, fz = e0.z + 1.0;
      for (let i = 0; i < 7; i++) s.mesh(new THREE.DodecahedronGeometry(0.09, 0), stone, on(fx + Math.cos(i * 0.9) * 0.3, fz + Math.sin(i * 0.9) * 0.3, 0.04));
      s.cylinder(0.24, 0.26, 0.03, on(fx, fz, 0.015), s.material('#2a2623', { roughness: 1 }), 14);
      for (let i = 0; i < 3; i++) s.rod(on(fx - 0.2, fz + (i - 1) * 0.1, 0.05), on(fx + 0.2, fz + (1 - i) * 0.12, 0.05), 0.02, s.material('#3a2f28'));
    } else if (a.story === 'rolled') {
      const crumbs = Array.from({ length: 70 }, () => { const angle = random() * 6.28, r = 1 + random() * 1.1; return { at: on(Math.cos(angle) * r, Math.sin(angle) * r * 1.5, 0.01), size: 0.02 + random() * 0.03 }; });
      s.scatter(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#bfe0e0', roughness: 0.15 }), crumbs);
      const panel = s.box([0.9, 0.03, 0.5], on(side * (W / 2 + 0.85), zf * 0.6, 0.05), paint);
      panel.rotation.set(0.2, random() * 3, 0.1);
      const lamp = s.cylinder(0.11, 0.09, 0.09, on(-side * (W / 2 + 0.9), zf + 0.5, 0.08), steel, 12);
      lamp.rotation.set(0.6, 0.4, 0.9);
    } else if (a.story === 'stuck') {
      const ladderMaterial = s.material('#c9772c', { roughness: 0.7 });
      for (const sx of [-1, 1]) {
        const lx = sx * (W / 2 - 0.1), lz = -zw - 0.95;
        const ladder = new THREE.Group();
        ladder.add(s.box([0.34, 0.035, 1.3], [0, 0, 0], ladderMaterial));
        for (let i = 0; i < 6; i++) ladder.add(s.box([0.2, 0.04, 0.08], [0, 0.004, -0.5 + i * 0.2], dark));
        ladder.position.set(...on(lx, lz, 0.06));
        ladder.rotation.set(-0.16, (random() - 0.5) * 0.3, 0);
        s.root.add(ladder);
      }
      const sx = side * (W / 2 + 0.7), sz = -zw + 0.2;
      s.rod(on(sx, sz, -0.1), on(sx + side * 0.18, sz, 1.05), 0.022, s.material('#8a6b4a'));
      s.box([0.22, 0.28, 0.02], on(sx, sz, 0.08), steel).rotation.z = -side * 0.17;
      const ruts: { at: P3; size: number }[] = [];
      for (const rx of [-1, 1]) for (let i = 0; i < 34; i++) { const z = -zw - 0.4 - i * 0.09, x = rx * (W / 2 - 0.1) + Math.sin(i * 0.2) * 0.12; if (ground.y(x, z) > 0.04) ruts.push({ at: on(x, z, -0.08), size: 0.14 }); }
      s.scatter(new THREE.SphereGeometry(1, 8, 5), new THREE.MeshStandardMaterial({ color: sand.clone().multiplyScalar(0.55), roughness: 1 }), ruts).castShadow = false;
    } else {
      for (let i = 0; i < 9; i++) {
        const at = spec.open || i > 5 ? out((random() - 0.5) * (W - 0.4), yb + Math.sin(lift) * 0.1 + 0.08, zr + 0.3 + random() * 0.4) : out(skew + (random() - 0.5) * (W - 0.6), yr + 0.1, mix(zrr, zrf, random()));
        const rock = s.mesh(new THREE.DodecahedronGeometry(0.08 + random() * 0.06, 0), stone, [at.x, at.y, at.z]);
        rock.rotation.set(random() * 3, random() * 3, 0);
      }
      const cx = -side * (W / 2 + 0.75), cz = zf * 0.5;
      for (let i = 0; i < 12; i++) {
        const layer = i < 6 ? 0 : i < 10 ? 1 : 2, spread = [0.3, 0.17, 0.05][layer], angle = random() * 6.28;
        s.mesh(new THREE.DodecahedronGeometry(0.13 + random() * 0.05, 0), stone, [cx + Math.cos(angle) * spread, ground.y(cx, cz) + 0.08 + layer * 0.17, cz + Math.sin(angle) * spread]).rotation.set(random() * 3, random() * 3, 0);
      }
      const top = out(tip[0], tip[1], tip[2]);
      const geometry = new THREE.PlaneGeometry(0.6, 0.26, 8, 1);
      geometry.translate(0.3, -0.13, 0);
      flag = s.mesh(geometry, s.material(mood.cheer > 0.5 ? '#d83a2c' : '#2c3566', { side: THREE.DoubleSide, roughness: 1 }), [top.x, top.y, top.z]);
    }
    // Small stones and scrub.
    s.scatter(new THREE.DodecahedronGeometry(1, 0), stone, Array.from({ length: 6 + Math.round(mood.density * 22) }, () => {
      const angle = random() * 6.28, r = radius * (0.55 + random() * 0.38);
      return { at: on(Math.cos(angle) * r, Math.sin(angle) * r, 0.01), size: 0.03 + random() * 0.06 };
    }));

    const flutter = mix(2, 9, mood.energy);
    const rest = flag ? Float32Array.from(flag.geometry.attributes.position.array) : null;
    const hoodRest = hood.rotation.x;
    return s.finish({
      footprint: radius * 0.85,
      update: (_dt, time) => {
        hood.rotation.x = hoodRest + Math.sin(time * 1.7) * 0.012 * mood.energy;
        if (flag && rest) {
          const p = flag.geometry.attributes.position;
          for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(rest[i * 3] * 11 - time * flutter) * 0.1 * rest[i * 3]);
          p.needsUpdate = true;
          flag.geometry.computeVertexNormals();
        }
      },
    });
  },
});
