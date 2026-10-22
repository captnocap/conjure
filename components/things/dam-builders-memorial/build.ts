import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { plate } from './util';

type XY = readonly [number, number];
interface Pose { foot: [XY, XY]; knee: [XY, XY]; hip: [XY, XY]; shoulder: [XY, XY]; elbow: [XY, XY]; hand: [XY, XY]; head: XY; tool: 'drill' | 'shovel' | 'hammer' }
const POSES: Pose[] = [
  { foot: [[-0.32, 0], [0.16, 0]], knee: [[-0.22, 0.5], [0.2, 0.5]], hip: [[-0.12, 0.98], [0.1, 0.98]], shoulder: [[-0.16, 1.55], [0.22, 1.5]], elbow: [[0.04, 1.2], [0.42, 1.22]], hand: [[0.36, 1], [0.4, 0.98]], head: [0.12, 1.78], tool: 'drill' },
  { foot: [[-0.16, 0], [0.16, 0]], knee: [[-0.15, 0.5], [0.15, 0.5]], hip: [[-0.11, 1], [0.11, 1]], shoulder: [[-0.25, 1.6], [0.25, 1.6]], elbow: [[-0.34, 1.25], [0.42, 1.3]], hand: [[-0.3, 0.95], [0.28, 1.5]], head: [0, 1.86], tool: 'shovel' },
  { foot: [[-0.36, 0], [0.3, 0]], knee: [[-0.2, 0.5], [0.24, 0.52]], hip: [[-0.1, 1], [0.1, 1]], shoulder: [[-0.23, 1.58], [0.23, 1.6]], elbow: [[-0.44, 1.35], [0.44, 1.86]], hand: [[-0.62, 1.5], [0.38, 2.2]], head: [0.02, 1.85], tool: 'hammer' },
];
const SURNAMES = ['HANSEN', 'MORENO', 'KOWALSKI', 'OKAFOR', 'PETROV', 'SINGH', 'MURPHY', 'NAKAI', 'BEGAY', 'ROSSI', 'NOVAK', 'JENSEN', 'DIAZ', 'COOPER', 'IVANOV', 'YAZZIE', 'LARSEN', 'BROWN', 'SCHMIDT', 'TANAKA'];
const WORDS = {
  english: ['TO THE MEN WHO BUILT THIS DAM', '1931 – 1936'],
  count: ['IN MEMORY OF THE 96', 'WHO DID NOT GO HOME'],
  cyrillic: ['СЛАВА СТРОИТЕЛЯМ ГЭС', '1952 – 1957'],
  desert: ['THEY DIED TO MAKE', 'THE DESERT BLOOM'],
  spanish: ['A LOS OBREROS DE LA PRESA', 'EL PUEBLO AGRADECIDO'],
} as const;

export default defineThing({
  questions: {
    style: choice('What kind of memorial is it?', {
      deco: 'Art deco: two seated bronze figures with tall blade-like wings flanking a fluted stele.',
      socialist: 'Socialist realist: a massive slab with a bronze relief of three muscular workers and a star above.',
      names: 'A plain polished wall carrying nothing but columns of names.',
      section: 'Modernist: a slab cut to the cross-section of the dam itself, one bronze worker set into it.',
    }),
    stone: choice('What stone is it made of?', {
      'red-granite': 'Polished red granite.',
      'grey-granite': 'Grey granite.',
      black: 'Black diorite, mirror dark.',
      concrete: 'The same raw concrete as the dam.',
      marble: 'White marble.',
    }),
    state: choice('What has happened to the bronze?', {
      kept: 'Nothing: an even brown patina, dutifully maintained.',
      touched: 'Polished bright in patches where decades of hands have touched it.',
      verdigris: 'Gone green and streaked, staining the stone below.',
      graffiti: 'Sprayed over with paint.',
      robbed: 'Stolen for scrap: bolt holes and a pale ghost where it hung.',
    }),
    inscription: choice('What does the inscription say?', {
      english: 'A plain dedication to the men who built the dam, with the years.',
      count: 'A count of the dead who did not go home.',
      cyrillic: 'Glory to the builders of the hydro station, in Russian.',
      desert: 'That they died to make the desert bloom.',
      spanish: 'A grateful town, in Spanish.',
    }),
    wreaths: choice('What lies at its foot?', {
      none: 'Nothing but swept stone.',
      one: 'A single fresh wreath on a stand.',
      anniversary: 'A bank of fresh wreaths, loose flowers and candles: it is the anniversary.',
      dried: 'One wreath, brown and brittle, months old.',
      plastic: 'Faded plastic flowers that nobody has changed in years.',
    }),
    flame: noul('Does an eternal flame burn in front of it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const stoneTone = { 'red-granite': '#94625a', 'grey-granite': '#9e9d98', black: '#3b3d42', concrete: '#b9b5a7', marble: '#e3e0d7' }[a.stone];
    const polished = a.stone === 'black' || a.stone === 'red-granite';
    const stone = s.material(stoneTone, { roughness: polished ? 0.35 : 0.9 });
    const paving = s.material(new THREE.Color(stoneTone).lerp(new THREE.Color('#b5b1a6'), 0.6), { roughness: 0.95 });
    const robbed = a.state === 'robbed';
    const bronzeTone = new THREE.Color(a.state === 'verdigris' ? '#5f8f7c' : '#7b5a35').lerp(new THREE.Color('#4b5a4a'), a.state === 'verdigris' ? 0 : mood.wear * 0.3);
    const bronze = new THREE.MeshStandardMaterial({ color: bronzeTone, metalness: 0.45, roughness: 0.5 });
    const bright = a.state === 'touched' ? new THREE.MeshStandardMaterial({ color: '#dcae4c', metalness: 0.6, roughness: 0.25 }) : bronze;
    const dark = s.material('#26292b', { roughness: 0.7 });
    const lettering = a.stone === 'marble' || a.stone === 'concrete' ? '#3a3226' : '#e6c67a';
    const inscribe = (width: number, height: number, at: [number, number, number]) => {
      const sign = plate(WORDS[a.inscription], width, height, { paper: stoneTone, ink: lettering, font: 'serif', sizes: [1, 0.8] });
      sign.position.set(...at); s.root.add(sign); return sign;
    };

    /** A worker modelled in the flat of the panel, standing at x on the ledge y. */
    const figure = (pose: Pose, x: number, y: number, z: number, scale: number, depth: number, headless = false) => {
      const f = new Sculpture(context);
      const p = ([px, py]: XY): [number, number, number] => [px, py, 0];
      for (const i of [0, 1] as const) {
        f.rod(p(pose.foot[i]), p(pose.knee[i]), 0.085, bronze, 0.1);
        f.rod(p(pose.knee[i]), p(pose.hip[i]), 0.1, bronze, 0.12);
        f.box([0.26, 0.1, 0.2], [pose.foot[i][0] + 0.06, 0.05, 0.04], bright);
        f.rod(p(pose.shoulder[i]), p(pose.elbow[i]), 0.085, bronze, 0.075);
        f.rod(p(pose.elbow[i]), p(pose.hand[i]), 0.075, bronze, 0.06);
        f.ball([0.075, 0.075, 0.075], p(pose.hand[i]), bright, 8);
      }
      const hips: XY = [(pose.hip[0][0] + pose.hip[1][0]) / 2, 0.98], chest: XY = [(pose.shoulder[0][0] + pose.shoulder[1][0]) / 2, (pose.shoulder[0][1] + pose.shoulder[1][1]) / 2 + 0.04];
      f.rod(p(hips), p(chest), 0.19, bronze, 0.3);
      if (!headless) { f.ball([0.13, 0.15, 0.14], p(pose.head), bright, 12); f.cylinder(0.16, 0.17, 0.05, [pose.head[0] + 0.02, pose.head[1] + 0.11, 0.03], bronze, 12); }
      else f.cylinder(0.07, 0.08, 0.06, [chest[0], chest[1] + 0.12, 0], new THREE.MeshStandardMaterial({ color: '#c9a66a', metalness: 0.3 }), 8);
      const [hx, hy] = pose.hand[1];
      if (pose.tool === 'drill') { f.rod([hx, hy + 0.05, 0.05], [hx + 0.16, 0, 0.05], 0.05, bright, 0.03); f.box([0.2, 0.4, 0.18], [hx + 0.03, hy - 0.2, 0.05], bronze); f.box([0.5, 0.06, 0.06], [hx, hy + 0.06, 0.05], bronze); }
      else if (pose.tool === 'shovel') { f.rod([hx - 0.25, hy - 0.5, 0.06], [hx + 0.3, hy + 0.72, 0.06], 0.03, bronze); const blade = f.box([0.3, 0.38, 0.04], [hx + 0.37, hy + 0.88, 0.06], bright); blade.rotation.z = -0.42; }
      else { f.rod([hx, hy - 0.1, 0.05], [hx - 0.1, hy + 0.4, 0.05], 0.03, bronze); const head = f.box([0.36, 0.16, 0.16], [hx - 0.11, hy + 0.42, 0.05], bright); head.rotation.z = 0.2; }
      f.root.position.set(x, y, z);
      f.root.scale.set(scale, scale, scale * depth);
      s.root.add(f.root);
    };
    const ghost = (width: number, height: number, at: [number, number, number]) => {
      s.box([width, height, 0.02], at, s.material(new THREE.Color(stoneTone).lerp(new THREE.Color('#f0ece0'), 0.45), { roughness: 1 }));
      for (const x of [-1, 1]) for (const y of [-1, 1]) {
        s.cylinder(0.05, 0.05, 0.04, [at[0] + x * (width / 2 - 0.15), at[1] + y * (height / 2 - 0.15), at[2] + 0.01], dark, 8).rotation.x = Math.PI / 2;
        s.box([0.05, 0.5 + random() * 0.5, 0.012], [at[0] + x * (width / 2 - 0.15), at[1] + y * (height / 2 - 0.15) - 0.35, at[2] + 0.012], s.material('#7a4a2c', { roughness: 1 }));
      }
    };
    const drips = (x0: number, x1: number, top: number, z: number) => {
      if (a.state !== 'verdigris') return;
      const green = new THREE.MeshStandardMaterial({ color: '#6fa58e', roughness: 1 });
      for (let i = 0; i < 9; i++) { const h = 0.3 + random() * 0.9; s.box([0.04 + random() * 0.08, h, 0.012], [mix(x0, x1, random()), top - h / 2, z], green); }
    };

    let frontZ = 0.4, wide = 5;
    if (a.style === 'socialist') {
      s.box([5.4, 0.2, 3], [0, 0.1, 0.3], paving);
      s.box([4.6, 0.25, 2], [0, 0.325, 0], stone);
      const outline = new THREE.Shape([[-2, 0], [2, 0], [2, 3.9], [-2, 4.7]].map(([x, y]) => new THREE.Vector2(x, y)));
      s.mesh(new THREE.ExtrudeGeometry(outline, { depth: 0.8, bevelEnabled: false }), stone, [0, 0.45, -0.4]);
      if (robbed) ghost(3.3, 2.75, [0, 2.75, 0.41]);
      else {
        s.box([3.4, 2.85, 0.1], [0, 2.75, 0.43], bronze);
        s.box([3.4, 0.12, 0.3], [0, 1.38, 0.5], bronze);
        POSES.forEach((pose, index) => figure(pose, (index - 1) * 1.08 - 0.05, 1.44, 0.52, 1, 0.55, a.state === 'graffiti' && index === 2 && mood.wear > 0.6));
        drips(-1.6, 1.6, 1.32, 0.412);
      }
      const points: THREE.Vector2[] = [];
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.16 : 0.4, angle = (i / 10) * Math.PI * 2; points.push(new THREE.Vector2(Math.sin(angle) * r, Math.cos(angle) * r)); }
      if (!robbed) s.mesh(new THREE.ExtrudeGeometry(new THREE.Shape(points), { depth: 0.08, bevelEnabled: false }), a.state === 'verdigris' ? bronze : s.material('#b32b25', { metalness: 0.3 }), [-1.3, 4.52, 0.4]);
      inscribe(3.5, 0.62, [0, 0.9, 0.412]);
      frontZ = 1.15; wide = 4.2;
    } else if (a.style === 'deco') {
      s.box([6, 0.2, 3.2], [0, 0.1, 0.2], paving);
      s.box([5.2, 0.8, 1.9], [0, 0.6, -0.2], stone);
      s.box([1, 5.2, 0.7], [0, 3.6, -0.5], stone);
      for (let i = 0; i < 4; i++) s.box([0.1, 4.8, 0.06], [-0.33 + i * 0.22, 3.6, -0.13], s.material(new THREE.Color(stoneTone).multiplyScalar(0.8), { roughness: 0.6 }));
      s.box([1.3, 0.25, 0.9], [0, 6.3, -0.5], stone);
      for (const side of [-1, 1]) {
        const cx = side * 1.65;
        s.box([1, 0.9, 1], [cx, 1.45, -0.45], stone);
        if (robbed && side > 0) { for (const x of [-0.14, 0.14]) s.cylinder(0.09, 0.1, 0.25, [cx + x, 1.1, 0.35], bronze, 8); s.box([0.5, 0.03, 0.5], [cx, 1.915, -0.45], s.material('#7a4a2c', { roughness: 1 })); continue; }
        const f = new Sculpture(context);
        f.rod([0, 0.95, 0], [0, 1.7, 0], 0.2, bronze, 0.3);
        f.ball([0.14, 0.17, 0.15], [0, 1.98, 0.02], bright, 12);
        for (const x of [-1, 1]) {
          f.rod([x * 0.14, 0.98, 0], [x * 0.14, 1, 0.55], 0.12, bronze, 0.1);
          f.rod([x * 0.14, 1, 0.55], [x * 0.14, 0.2, 0.62], 0.1, bronze, 0.08);
          f.box([0.16, 0.1, 0.3], [x * 0.14, 0.15, 0.72], bright);
          f.rod([x * 0.27, 1.66, 0], [x * 0.36, 2.9, -0.08], 0.085, bronze, 0.06);
          const wing = new THREE.Shape([[0.16, 1.3], [0.78, 1.75], [0.7, 4.6], [0.5, 5], [0.3, 2.8]].map(([wx, wy]) => new THREE.Vector2(x * wx, wy)));
          f.mesh(new THREE.ExtrudeGeometry(wing, { depth: 0.12, bevelEnabled: false }), bronze, [0, 0, -0.26]).rotation.x = -0.06;
        }
        f.root.position.set(cx, 0.95, -0.45);
        s.root.add(f.root);
        drips(cx - 0.4, cx + 0.4, 1.9, 0.06);
      }
      inscribe(4.6, 0.56, [0, 0.62, 0.762]);
      frontZ = 1.2; wide = 4.6;
    } else if (a.style === 'names') {
      s.box([6, 0.2, 2.6], [0, 0.1, 0.3], paving);
      s.box([5.2, 0.3, 0.9], [0, 0.35, -0.2], stone);
      s.box([4.8, 2.5, 0.5], [0, 1.75, -0.2], stone);
      const count = 44 + Math.floor(random() * 12);
      const wall = plate([], 4.5, 2.2, { paper: stoneTone, paint: (ctx, W, H) => {
        ctx.fillStyle = lettering; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 21px serif'; ctx.fillText(WORDS[a.inscription][0], W / 2, 24, W * 0.9);
        ctx.font = '15px serif'; ctx.fillText(WORDS[a.inscription][1], W / 2, 48, W * 0.9);
        ctx.fillRect(W * 0.2, 62, W * 0.6, 2);
        ctx.font = '11.5px serif'; ctx.textAlign = 'left';
        const rows = Math.ceil(count / 4);
        for (let i = 0; i < count; i++) {
          const gone = robbed && random() > 0.6;
          ctx.globalAlpha = gone ? 0.2 : mix(1, 0.7, mood.wear * random());
          ctx.fillText(`${'ABCDEFGHJKLMNPRSTVW'[Math.floor(random() * 19)]}. ${SURNAMES[Math.floor(random() * SURNAMES.length)]}`, W * (0.07 + 0.225 * Math.floor(i / rows)), 80 + (i % rows) * ((H - 96) / rows));
        }
        ctx.globalAlpha = 1;
      } });
      wall.position.set(0, 1.78, 0.052); s.root.add(wall);
      if (robbed) ghost(0.9, 0.5, [0, 3.4, 0.06]);
      s.box([1.5, 0.8, 0.5], [0, 3.4, -0.2], stone);
      if (robbed) { /* ghost drawn above */ } else { s.box([1, 0.6, 0.08], [0, 3.4, 0.07], bronze); for (const turn of [-0.7, 0.7]) { const tool = s.box([0.07, 0.7, 0.05], [0, 3.4, 0.13], bright); tool.rotation.z = turn; } drips(-0.4, 0.4, 3, 0.055); }
      frontZ = 0.75; wide = 4.6;
    } else {
      s.box([6.2, 0.2, 2.8], [0, 0.1, 0.3], paving);
      const dam = new THREE.Shape([[-0.7, 0], [-0.7, 4.5], [-0.1, 4.5], [0.15, 3.7], [2.5, 0]].map(([x, y]) => new THREE.Vector2(x, y)));
      s.mesh(new THREE.ExtrudeGeometry(dam, { depth: 0.7, bevelEnabled: false }), stone, [0, 0.2, -0.45]);
      s.box([1.8, 3.8, 0.5], [-1.6, 2.1, -0.35], s.material(mood.warmth > 0.5 ? '#4f8f9a' : '#3f6f96', { roughness: 0.25, metalness: 0.2 }));
      for (let i = 0; i < 5; i++) s.box([1.8, 0.03, 0.02], [-1.6, 1 + i * 0.65, -0.09], s.material('#9fc4d1'));
      if (robbed) ghost(1, 2.3, [0.42, 1.5, 0.26]);
      else { s.box([1.05, 2.4, 0.08], [0.42, 1.5, 0.28], bronze); figure(POSES[Math.floor(random() * 3)], 0.4, 0.4, 0.35, 0.95, 0.55); drips(0, 0.85, 0.3, 0.26); }
      const sign = inscribe(2.6, 0.5, [-0.9, 0.5, 0.36]);
      s.box([2.8, 0.6, 0.4], [-0.9, 0.5, 0.15], stone);
      void sign;
      frontZ = 1; wide = 4.8;
    }

    if (a.state === 'graffiti') {
      const spray = plate([], 3.4, 1.7, { paper: 'rgba(0,0,0,0)', paint: (ctx, W, H) => {
        ctx.clearRect(0, 0, W, H); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const inks = ['#e8368f', '#2a6fdb', '#111111', '#f2e33a'];
        for (let i = 0; i < 4; i++) {
          ctx.strokeStyle = inks[Math.floor(random() * 4)]; ctx.lineWidth = 9 + random() * 8; ctx.beginPath();
          let x = W * (0.08 + random() * 0.6), y = H * (0.2 + random() * 0.6); ctx.moveTo(x, y);
          for (let j = 0; j < 6; j++) { x += (random() - 0.3) * 80; y += (random() - 0.5) * 110; ctx.lineTo(Math.min(W - 10, Math.max(10, x)), Math.min(H - 10, Math.max(10, y))); }
          ctx.stroke();
        }
        ctx.fillStyle = inks[Math.floor(random() * 3)]; ctx.font = 'italic bold 70px cursive'; ctx.textAlign = 'center'; ctx.fillText(['ZEK', 'DAM!', 'NO', '♥ 1999'][Math.floor(random() * 4)], W * 0.62, H * 0.6);
      } });
      (spray.material as THREE.MeshStandardMaterial).alphaTest = 0.3;
      const [gx, gy, gz] = a.style === 'socialist' ? [0.2, 1.7, 0.7] : a.style === 'deco' ? [0.3, 0.95, 0.775] : a.style === 'names' ? [0.4, 1.5, 0.06] : [0.3, 1.2, 0.262];
      spray.position.set(gx, gy, gz); spray.castShadow = false;
      if (a.style === 'deco') spray.scale.set(1, 0.42, 1);
      if (a.style === 'socialist') spray.scale.set(0.7, 0.6, 1);
      s.root.add(spray);
    }

    // Wreaths, flowers and candles.
    const flames: THREE.Mesh[] = [];
    const wreath = (x: number, z: number, kind: 'fresh' | 'dried' | 'plastic', standing: boolean) => {
      const g = new Sculpture(context);
      const leaf = g.material({ fresh: '#356b38', dried: '#7b6a45', plastic: '#7fa08a' }[kind], { roughness: 0.9 });
      const petals = { fresh: mood.cheer > 0.5 ? ['#f2f0e6', '#e9c53a', '#d4372f'] : ['#c2261f', '#f2f0e6', '#8f1d1a'], dried: ['#8b6b4a', '#9a8358', '#6c5338'], plastic: ['#e3b3bd', '#b9c8e0', '#e8dfb0'] }[kind];
      g.ring(0.36, 0.1, [0, 0, 0], leaf);
      for (let i = 0; i < 9; i++) { const angle = (i / 9) * 6.28 + random(); g.ball([0.075, 0.075, 0.06], [Math.cos(angle) * 0.36, Math.sin(angle) * 0.36, 0.09], g.material(petals[i % 3], { roughness: 0.8 }), 6); }
      const ribbon = g.material(kind === 'dried' ? '#6f3a34' : kind === 'plastic' ? '#c9a3a0' : '#b3201f');
      for (const side of [-1, 1]) g.box([0.11, 0.62, 0.02], [side * 0.1, -0.52, 0.1], ribbon).rotation.z = side * 0.22;
      if (standing) {
        for (const leg of [[-0.3, 0.12], [0.3, 0.12], [0, -0.5]]) g.rod([0, 0.2, -0.06], [leg[0], -0.86, leg[1] - 0.1], 0.014, dark);
        g.root.position.set(x, 0.98, z); g.root.rotation.set(-0.22, (random() - 0.5) * 0.4, (random() - 0.5) * 0.1);
      } else { g.root.position.set(x, 0.33, z); g.root.rotation.set(-1.25, 0, random() * 6); }
      s.root.add(g.root);
    };
    if (a.wreaths === 'one') wreath(-wide * 0.22, frontZ, 'fresh', true);
    else if (a.wreaths === 'dried') wreath(wide * 0.18, frontZ, 'dried', random() > 0.5);
    else if (a.wreaths === 'plastic') { wreath(-wide * 0.25, frontZ, 'plastic', true); wreath(wide * 0.2, frontZ + 0.15, 'plastic', false); }
    else if (a.wreaths === 'anniversary') {
      const n = 4 + Math.round(mood.density * 3);
      for (let i = 0; i < n; i++) wreath(mix(-wide / 2 + 0.4, wide / 2 - 0.4, i / (n - 1)) * 0.95, frontZ + (i % 2) * 0.3, 'fresh', i % 3 !== 1);
      const loose = Array.from({ length: 26 }, () => ({ at: [(random() - 0.5) * wide, 0.24, frontZ + 0.45 + random() * 0.4] as const, size: 0.05 + random() * 0.03, color: ['#c2261f', '#f2f0e6', '#e9c53a'][Math.floor(random() * 3)] }));
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), loose);
      for (let i = 0; i < 7; i++) {
        const x = (random() - 0.5) * wide * 0.9, z = frontZ + 0.5 + random() * 0.3;
        s.cylinder(0.05, 0.05, 0.16, [x, 0.28, z], s.material(random() > 0.5 ? '#b3201f' : '#f1ead6'), 8);
        flames.push(s.ball([0.03, 0.06, 0.03], [x, 0.4, z], new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffa531', emissiveIntensity: 2.5 }), 6));
      }
    }

    if (a.flame) {
      const fz = frontZ + (a.wreaths === 'none' ? 0.1 : 0.75);
      s.cylinder(0.55, 0.62, 0.3, [0, 0.35, fz], stone, 5);
      s.mesh(new THREE.LatheGeometry([[0.12, 0], [0.4, 0.12], [0.46, 0.2], [0.4, 0.2], [0, 0.12]].map(([x, y]) => new THREE.Vector2(x, y)), 20), new THREE.MeshStandardMaterial({ color: bronzeTone, metalness: 0.45, roughness: 0.5, side: THREE.DoubleSide }), [0, 0.5, fz]);
      const outer = s.mesh(new THREE.ConeGeometry(0.2, 0.7, 8).translate(0, 0.35, 0), new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff6a12', emissiveIntensity: 2 }), [0, 0.62, fz]);
      const inner = s.mesh(new THREE.ConeGeometry(0.1, 0.42, 8).translate(0, 0.21, 0), new THREE.MeshStandardMaterial({ color: '#fff0a8', emissive: '#ffd24a', emissiveIntensity: 3 }), [0, 0.64, fz + 0.02]);
      flames.push(outer, inner);
    }

    const speed = mix(4, 16, mood.energy);
    const bases = flames.map((flame) => flame.scale.clone());
    return s.finish({
      update: (_dt, time) => flames.forEach((flame, index) => { const base = bases[index]; flame.scale.y = base.y * (1 + 0.22 * Math.sin(time * speed + index * 2.1)); flame.scale.x = base.x * (1 + 0.1 * Math.sin(time * speed * 1.3 + index)); }),
    });
  },
});
