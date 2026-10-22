import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    stock: choice('What is the main stock?', {
      lifebuoys: 'Lifebuoys and lifejackets: a wall of orange rings with ships\' names on them.',
      brass: 'Brass: clocks, portholes, lanterns, a ship\'s wheel and an engine telegraph.',
      furniture: 'Furniture: wheelhouse chairs, a cabin door, mattresses from the crew bunks.',
      crockery: 'Crockery: tall stacks of white plates with a blue line crest, cups, kettles.',
      mixed: 'A little of everything, piled wherever it fits.',
    }),
    stall: choice('What is the stall built from?', {
      bamboo: 'Bamboo poles under a sagging tarpaulin.',
      tin: 'A timber frame with corrugated tin roof and back wall.',
      container: 'The cut-off end of a shipping container, doors swung wide.',
    }),
    sign: choice('What is the signboard lettered in?', {
      english: 'Hand-painted English capitals: MARINE STORE.',
      rounded: 'Rounded looping letters in the manner of Gujarati sign-painting.',
      barred: 'Letters hanging from a top bar, in the manner of Bengali sign-painting.',
      flowing: 'A flowing right-to-left hand with dots, in the manner of Urdu calligraphy.',
      stencil: 'No sign of its own: a stencilled plate from a ship, MUSTER STATION, nailed up instead.',
      none: 'No sign at all.',
    }),
    unsold: choice('What is the one object nobody will buy?', {
      bell: 'The ship\'s bell, with her name and launch year cast into it.',
      photo: 'A framed photograph of somebody\'s family, found in a cabin.',
      lifejacket: 'A child\'s lifejacket, very small.',
      nameboard: 'The carved and gilded nameboard from the bridge wing.',
      telegraph: 'An engine telegraph stuck for ever on FINISHED WITH ENGINES.',
      logbook: 'The deck logbook, open at its last entry.',
    }),
    keeper: choice('Who is minding the stall?', {
      keeper: 'The owner, seated in a wheelhouse chair with a glass of tea.',
      child: 'A child sitting on the counter, swinging their legs.',
      asleep: 'Someone asleep on a rope bed beside it.',
      nobody: 'Nobody: an empty chair and a slate saying back soon.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <X,>(list: readonly X[]) => list[Math.floor(random() * list.length)];
    const brass = s.material('#c79a3a', { metalness: 0.6, roughness: 0.35 });
    const timber = s.material('#8a6540', { roughness: 0.95 });
    const dark = s.material('#2a2c30');
    const bamboo = s.material('#c9a85c');
    const white = s.material('#eeeade', { roughness: 0.4 });
    const lit = mood.daylight < 0.22 || mood.daylight > 0.78;
    const paint = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const SHIPS = ['STELLA MARIS', 'OCEAN PROMISE', 'GOLDEN HARVEST', 'NORTHERN STAR', 'PACIFIC TRADER'];
    const ship = pick(SHIPS);

    // Structure.
    const W = 4.3, D = 2.5, back = -D / 2, eave = 2.55;
    const corrugated = (colour: string) => {
      const texture = paint(256, 64, (ctx) => {
        for (let x = 0; x < 256; x += 16) { const g = ctx.createLinearGradient(x, 0, x + 16, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#9a9a9a'); g.addColorStop(1, '#ffffff'); ctx.fillStyle = g; ctx.fillRect(x, 0, 16, 64); }
        for (let i = 0; i < 20 + mood.wear * 60; i++) { ctx.fillStyle = `rgba(120,62,30,${0.2 + random() * 0.4})`; ctx.fillRect(random() * 256, random() * 64, 4 + random() * 22, 6 + random() * 30); }
      });
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.set(2, 1);
      return new THREE.MeshStandardMaterial({ map: texture, color: colour, roughness: 0.75, metalness: 0.3, side: THREE.DoubleSide });
    };
    const frontZ = a.stall === 'container' ? back + 0.8 : 0.55, eaveB = eave - 0.15;
    const hiF = a.stall === 'container' ? 2.5 : 3.05;
    const slope = Math.atan2(hiF - eaveB, frontZ - back + 0.15), run = Math.hypot(hiF - eaveB, frontZ - back + 0.15) + 0.35;
    if (a.stall === 'bamboo') {
      for (const x of [-W / 2, 0, W / 2]) { s.rod([x, 0, back], [x + (random() - 0.5) * 0.06, eaveB + 0.05, back], 0.04, bamboo); if (x) s.rod([x, 0, frontZ], [x + (random() - 0.5) * 0.06, hiF + 0.05, frontZ], 0.04, bamboo); }
      s.rod([-W / 2 - 0.2, eaveB, back], [W / 2 + 0.2, eaveB, back], 0.035, bamboo);
      s.rod([-W / 2 - 0.2, hiF, frontZ], [W / 2 + 0.2, hiF, frontZ], 0.035, bamboo);
      const geometry = new THREE.PlaneGeometry(W + 0.5, run, 8, 6);
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { const u = pos.getX(i) / (W + 0.5); pos.setZ(i, -0.12 * Math.cos(u * Math.PI * 4) * (1 - Math.abs(pos.getY(i)) / run) - 0.03); }
      geometry.computeVertexNormals();
      const tarp = s.mesh(geometry, s.material(pick(['#2f6fc0', '#3d7a5a', '#c9a23a', '#b9532f']), { side: THREE.DoubleSide, roughness: 0.9 }), [0, (hiF + eaveB) / 2 + 0.06, (frontZ + back) / 2 - 0.05]);
      tarp.rotation.x = -Math.PI / 2 + slope;
      s.box([W, 2.0, 0.03], [0, 1.2, back - 0.02], s.material('#b9a06a', { roughness: 1 }));
    } else if (a.stall === 'tin') {
      for (const x of [-W / 2, W / 2]) { s.box([0.09, eaveB, 0.09], [x, eaveB / 2, back], timber); s.box([0.09, hiF, 0.09], [x, hiF / 2, frontZ], timber); }
      s.box([W + 0.1, 0.09, 0.09], [0, hiF, frontZ], timber);
      const roof = s.box([W + 0.5, 0.03, run], [0, (hiF + eaveB) / 2 + 0.08, (frontZ + back) / 2 - 0.05], corrugated('#b9bcc0'));
      roof.rotation.x = slope;
      s.box([W, eaveB, 0.03], [0, eaveB / 2, back - 0.02], corrugated(pick(['#8fa6b0', '#b9bcc0', '#7d9a84'])));
      s.box([0.03, 1.5, D * 0.5], [-W / 2, 0.75, back + D * 0.25], corrugated('#a5a8aa'));
    } else {
      const colour = pick(['#a8452f', '#2f5d8a', '#3d7a5a', '#c9882a']);
      const steel = corrugated(colour), frame = s.material(colour, { metalness: 0.3 });
      s.box([W, 2.5, 0.05], [0, 1.25, back], steel);
      // Side walls torch-cut on a ragged diagonal, so the stall stands open.
      for (const side of [-1, 1]) {
        const shape = new THREE.Shape(([[0, 0], [D + 0.9, 0], [D + 0.9, 0.5 + random() * 0.3], [D * 0.62, 0.95 + random() * 0.3], [D * 0.36, 1.9 + random() * 0.3], [0.7, 2.5], [0, 2.5]] as [number, number][]).map(([x, y]) => new THREE.Vector2(x, y)));
        const wall = s.mesh(new THREE.ShapeGeometry(shape), s.material(colour, { side: THREE.DoubleSide, metalness: 0.3, roughness: 0.7 }), [side * W / 2, 0, back]);
        wall.rotation.y = -Math.PI / 2;
        for (let k = 0; k < 7; k++) s.box([0.03, k < 2 ? 2.4 : k < 4 ? 1.7 : 0.75, 0.05], [side * (W / 2 + 0.02), (k < 2 ? 2.4 : k < 4 ? 1.7 : 0.75) / 2, back + 0.2 + k * 0.42], frame);
      }
      s.box([W + 0.1, 0.08, 0.9], [0, 2.54, back + 0.4], frame);
      for (const x of [-W / 2, W / 2]) s.box([0.14, 2.5, 0.14], [x, 1.25, back], frame);
    }
    // Counter and shelves.
    const cz = 0.4, cy = 0.82;
    s.box([3.5, 0.05, 0.75], [0, cy - 0.025, cz], timber);
    for (const x of [-1.6, 0, 1.6]) for (const z of [cz - 0.3, cz + 0.3]) s.box([0.07, cy - 0.05, 0.07], [x, (cy - 0.05) / 2, z], timber);
    s.box([3.5, 0.5, 0.02], [0, 0.5, cz + 0.36], s.material(pick(['#c2452f', '#3d6fa3', '#d8b23a', '#3f8a5a']), { roughness: 1 }));
    const shelfY = [1.05, 1.55];
    for (const y of shelfY) s.box([W - 0.5, 0.04, 0.32], [0, y, back + 0.2], timber);

    // Stock makers.
    const buoyTexture = paint(256, 32, (ctx) => {
      ctx.fillStyle = '#e8621c'; ctx.fillRect(0, 0, 256, 32);
      ctx.fillStyle = '#f2efe6'; for (let k = 0; k < 4; k++) ctx.fillRect(k * 64 + 22, 0, 20, 32);
    });
    const buoyMaterial = new THREE.MeshStandardMaterial({ map: buoyTexture, roughness: mix(0.5, 0.9, mood.wear) });
    const buoy = (at: P3, tilt = 0, flat = false) => {
      const ring = s.mesh(new THREE.TorusGeometry(0.27, 0.075, 10, 28), buoyMaterial, at);
      ring.rotation.set(flat ? Math.PI / 2 : tilt, 0, random() * 2);
      return ring;
    };
    const clockTexture = paint(128, 128, (ctx) => {
      ctx.fillStyle = '#f4f0e2'; ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#1c1d20'; ctx.lineWidth = 4;
      for (let k = 0; k < 12; k++) { const t = (k * Math.PI) / 6; ctx.beginPath(); ctx.moveTo(64 + Math.cos(t) * 48, 64 + Math.sin(t) * 48); ctx.lineTo(64 + Math.cos(t) * 58, 64 + Math.sin(t) * 58); ctx.stroke(); }
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + 26, 64 - 18); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 - 12, 64 - 44); ctx.stroke();
    });
    const faceMaterial = new THREE.MeshStandardMaterial({ map: clockTexture, roughness: 0.3 });
    const clock = (at: P3, r = 0.15) => {
      s.cylinder(r, r * 1.08, 0.08, at, brass, 20).rotation.x = Math.PI / 2;
      const face = s.mesh(new THREE.CircleGeometry(r * 0.84, 20), faceMaterial, [at[0], at[1], at[2] + 0.042]);
      face.rotation.z = random() * 6;
      face.castShadow = false;
    };
    const glass = new THREE.MeshStandardMaterial({ color: '#27404a', roughness: 0.1, metalness: 0.3 });
    const porthole = (at: P3, r = 0.2) => {
      s.mesh(new THREE.TorusGeometry(r, r * 0.22, 8, 22), brass, at);
      s.mesh(new THREE.CircleGeometry(r, 18), glass, [at[0], at[1], at[2] + 0.005]).castShadow = false;
    };
    const lantern = (at: P3) => {
      const colour = pick(['#c8281f', '#2f8a4a', '#f1e6b8']);
      s.cylinder(0.075, 0.09, 0.03, at, brass, 12);
      s.cylinder(0.065, 0.065, 0.16, [at[0], at[1] + 0.095, at[2]], new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: lit ? 0.9 : 0.15, roughness: 0.2 }), 12);
      s.cylinder(0.03, 0.085, 0.07, [at[0], at[1] + 0.21, at[2]], brass, 12);
      s.ring(0.045, 0.008, [at[0], at[1] + 0.28, at[2]], brass);
    };
    const plateProfile = [[0.001, 0], [0.07, 0], [0.13, 0.016], [0.13, 0.022], [0.001, 0.012]].map(([x, y]) => new THREE.Vector2(x, y));
    const platePoints: { at: P3; size: number; color?: string }[] = [];
    const plates = (at: P3, n: number) => { for (let i = 0; i < n; i++) platePoints.push({ at: [at[0] + (random() - 0.5) * 0.012, at[1] + i * 0.016, at[2] + (random() - 0.5) * 0.012], size: 1 }); };
    const crest = paint(128, 128, (ctx) => {
      ctx.fillStyle = '#f4f1e6'; ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#1f3f72'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(64, 64, 56, 0, 7); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(64, 64, 46, 0, 7); ctx.stroke();
      ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(64, 38); ctx.lineTo(64, 86); ctx.moveTo(52, 48); ctx.lineTo(76, 48); ctx.stroke();
      ctx.beginPath(); ctx.arc(64, 66, 20, 0.15, Math.PI - 0.15); ctx.stroke();
      ctx.beginPath(); ctx.arc(64, 34, 5, 0, 7); ctx.stroke();
    });
    const crestMaterial = new THREE.MeshStandardMaterial({ map: crest, roughness: 0.3 });
    const displayPlate = (at: P3) => {
      const plate = s.cylinder(0.15, 0.15, 0.015, at, white, 24);
      plate.rotation.x = Math.PI / 2 - 0.25;
      const face = s.mesh(new THREE.CircleGeometry(0.145, 24), crestMaterial, [at[0], at[1] + 0.002, at[2] + 0.009]);
      face.rotation.x = -0.25;
      face.castShadow = false;
    };
    const cups = (at: P3, n: number) => { for (let i = 0; i < n; i++) s.cylinder(0.04, 0.03, 0.07, [at[0] + (i % 4) * 0.095 - 0.14, at[1] + 0.035, at[2] + Math.floor(i / 4) * 0.1], white, 10); };
    const kettle = (at: P3) => {
      const steel = s.material('#aeb2b4', { metalness: 0.6, roughness: 0.3 });
      s.lathe([[0.001, 0], [0.11, 0], [0.13, 0.09], [0.09, 0.18], [0.03, 0.2]], steel, at);
      s.rod([at[0] + 0.1, at[1] + 0.08, at[2]], [at[0] + 0.22, at[1] + 0.18, at[2]], 0.014, steel);
      s.ring(0.07, 0.008, [at[0], at[1] + 0.22, at[2]], dark, Math.PI);
    };
    const chair = (at: P3, turn: number, colour = pick(['#3a2c26', '#6b4a30', '#1f3f52', '#7a2f2a'])) => {
      const group = new THREE.Group();
      const leather = s.material(colour, { roughness: 0.6 }), steel = s.material('#8f9296', { metalness: 0.6, roughness: 0.4 });
      const put = (mesh: THREE.Mesh) => { group.add(mesh); return mesh; };
      put(s.cylinder(0.26, 0.3, 0.04, [0, 0.02, 0], steel, 18));
      put(s.cylinder(0.05, 0.06, 0.5, [0, 0.27, 0], steel, 10));
      put(s.box([0.5, 0.1, 0.48], [0, 0.57, 0], leather));
      put(s.box([0.5, 0.62, 0.1], [0, 0.9, -0.22], leather)).rotation.x = -0.12;
      for (const x of [-0.27, 0.27]) { put(s.box([0.05, 0.05, 0.4], [x, 0.78, 0], steel)); put(s.box([0.04, 0.2, 0.04], [x, 0.68, 0.16], steel)); }
      put(s.ring(0.2, 0.012, [0, 0.2, 0], steel)).rotation.x = Math.PI / 2;
      group.position.set(...at);
      group.rotation.y = turn;
      s.root.add(group);
    };
    const wheel = (at: P3, r = 0.42) => {
      const wood = s.material('#7a4a2c', { roughness: 0.6 });
      s.mesh(new THREE.TorusGeometry(r, 0.035, 8, 28), wood, at);
      for (let k = 0; k < 4; k++) { const spoke = s.cylinder(0.018, 0.018, r * 2.6, at, wood, 6); spoke.rotation.z = (k * Math.PI) / 4 + 0.2; }
      s.cylinder(0.08, 0.08, 0.07, at, brass, 14).rotation.x = Math.PI / 2;
    };
    const telegraphFace = (label: string) => paint(128, 128, (ctx) => {
      ctx.fillStyle = '#f4f0e2'; ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#1c1d20'; ctx.lineWidth = 2;
      for (let k = 0; k < 10; k++) { const t = (k * Math.PI) / 5; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.cos(t) * 62, 64 + Math.sin(t) * 62); ctx.stroke(); }
      ctx.fillStyle = '#b3261f'; ctx.beginPath(); ctx.moveTo(64, 64); ctx.arc(64, 64, 62, Math.PI / 2 - 0.31, Math.PI / 2 + 0.31); ctx.fill();
      ctx.fillStyle = '#f4f0e2'; ctx.beginPath(); ctx.arc(64, 64, 26, 0, 7); ctx.fill();
      ctx.fillStyle = '#1c1d20'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label, 64, 68);
    });
    const telegraph = (at: P3, label = 'STOP', leverAngle = 0.6) => {
      s.lathe([[0.001, 0], [0.17, 0], [0.16, 0.05], [0.07, 0.12], [0.06, 0.75], [0.09, 0.82]], brass, at);
      const head = s.cylinder(0.2, 0.2, 0.16, [at[0], at[1] + 0.98, at[2]], brass, 24);
      head.rotation.z = Math.PI / 2; head.rotation.y = Math.PI / 2;
      const face = s.mesh(new THREE.CircleGeometry(0.18, 24), new THREE.MeshStandardMaterial({ map: telegraphFace(label), roughness: 0.3 }), [at[0], at[1] + 0.98, at[2] + 0.085]);
      face.castShadow = false;
      s.rod([at[0], at[1] + 0.98, at[2] + 0.1], [at[0] + Math.sin(leverAngle) * 0.3, at[1] + 0.98 - Math.cos(leverAngle) * 0.3, at[2] + 0.1], 0.014, brass);
      s.ball([0.03, 0.03, 0.03], [at[0] + Math.sin(leverAngle) * 0.3, at[1] + 0.98 - Math.cos(leverAngle) * 0.3, at[2] + 0.1], s.material('#3a2c26'), 8);
    };
    const bell = (at: P3, r = 0.14) => {
      s.lathe([[0.001, r * 1.5], [r * 0.3, r * 1.5], [r * 0.55, r * 1.25], [r * 0.68, r * 0.5], [r * 0.9, r * 0.12], [r, 0], [r * 0.93, 0]], s.material('#c79a3a', { metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide }), at);
      s.ball([r * 0.14, r * 0.14, r * 0.14], [at[0], at[1] - r * 0.05, at[2]], dark, 8);
      s.rod([at[0], at[1] - r * 0.05, at[2]], [at[0] + r * 0.2, at[1] - r * 0.9, at[2] + r * 0.2], 0.008, s.material('#d8cfae'));
      s.ring(r * 0.2, r * 0.05, [at[0], at[1] + r * 1.62, at[2]], brass);
    };
    const jacket = (at: P3, size = 1, colour = '#e8621c') => {
      const fabric = s.material(colour, { roughness: 1 });
      for (const dx of [-0.11, 0.11]) s.box([0.18 * size, 0.44 * size, 0.09 * size], [at[0] + dx * size, at[1], at[2]], fabric);
      s.box([0.34 * size, 0.12 * size, 0.1 * size], [at[0], at[1] + 0.25 * size, at[2] - 0.02], fabric);
      s.box([0.42 * size, 0.035 * size, 0.1 * size], [at[0], at[1] - 0.06 * size, at[2] + 0.005], s.material('#d9dde0'));
    };
    const rope = (at: P3) => { const hemp = s.material('#b89f6a', { roughness: 1 }); for (let i = 0; i < 4; i++) s.ring(0.17 - i * 0.012, 0.035, [at[0], at[1] + 0.035 + i * 0.062, at[2]], hemp).rotation.x = Math.PI / 2; };
    const mattresses = (at: P3) => { for (let i = 0; i < 3 + Math.floor(mood.density * 3); i++) s.box([0.85, 0.13, 1.6], [at[0] + (random() - 0.5) * 0.06, at[1] + 0.065 + i * 0.132, at[2]], s.material(i % 2 ? '#c9d2dc' : '#e2d8c2', { roughness: 1 })).rotation.y = (random() - 0.5) * 0.1; };
    const door = (at: P3) => {
      const leaf = s.box([0.72, 1.9, 0.05], [at[0], at[1] + 0.93, at[2]], s.material(pick(['#9aa6a0', '#c9c2a8', '#5a7a8a']), { roughness: 0.6 }));
      leaf.rotation.x = -0.16; leaf.rotation.y = 0.2;
      const plate = s.label(pick(['CREW MESS', 'CHIEF ENG', 'GALLEY', 'MASTER']), 0.46, 0.11, [at[0] - 0.01, at[1] + 1.45, at[2] - 0.2], '#1c1d20', '#d8c98a');
      plate.rotation.x = -0.16; plate.rotation.y = 0.2;
      const port = s.mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 18), brass, [at[0] + 0.01, at[1] + 1.12, at[2] - 0.14]);
      port.rotation.x = -0.16; port.rotation.y = 0.2;
    };

    // Lay the stock out by kind.
    const full = mix(0.55, 1, mood.density);
    const keep = () => random() < full;
    const wallX = [-1.6, -0.8, 0, 0.8, 1.6];
    const wallZ = back + 0.09, shelfZ = back + 0.22;
    const counterX = [-1.45, -0.87, -0.29, 0.29, 0.87, 1.45];
    const kind = a.stock;
    const kinds = ['lifebuoys', 'brass', 'furniture', 'crockery'] as const;
    const theme = (i: number) => (kind === 'mixed' ? kinds[(i + Math.floor(random() * 4)) % 4] : random() < 0.82 ? kind : pick(kinds));
    // Back wall, upper band.
    wallX.forEach((x, i) => {
      if (!keep() && i !== 2) return;
      const t = theme(i), at: P3 = [x, 1.97, wallZ];
      if (i === 2 && (kind === 'brass' || kind === 'mixed')) wheel([x, 1.98, wallZ + 0.03], 0.36);
      else if (t === 'lifebuoys') buoy([x, 1.97, wallZ + 0.04]);
      else if (t === 'brass') (random() < 0.5 ? clock(at, 0.17) : porthole(at, 0.2));
      else if (t === 'crockery') displayPlate([x, 1.74, shelfZ]);
      else jacket([x, 1.92, wallZ + 0.03], 0.85, pick(['#e8621c', '#e8621c', '#d9b21e']));
    });
    // Shelves.
    for (const y of shelfY) wallX.forEach((x, i) => {
      for (const dx of [-0.2, 0.2]) {
        if (!keep()) continue;
        const t = theme(i), at: P3 = [x + dx, y + 0.02, shelfZ];
        if (t === 'crockery') (random() < 0.6 ? plates(at, 4 + Math.floor(random() * 14)) : random() < 0.5 ? cups([at[0], at[1], at[2] - 0.05], 4) : kettle(at));
        else if (t === 'brass') (random() < 0.5 ? lantern(at) : clock([at[0], at[1] + 0.15, at[2]], 0.13));
        else if (t === 'lifebuoys') (y === shelfY[0] ? buoy([at[0], at[1] + 0.3, at[2] + 0.05], -0.2) : rope(at));
        else (random() < 0.5 ? rope(at) : lantern(at));
      }
    });
    // Counter.
    counterX.forEach((x, i) => {
      if (!keep()) return;
      const t = theme(i), at: P3 = [x, cy, cz];
      if (t === 'crockery') { plates([x - 0.14, cy, cz - 0.1], 6 + Math.floor(random() * 22)); plates([x + 0.14, cy, cz - 0.12], 4 + Math.floor(random() * 16)); cups([x, cy, cz + 0.15], 4 + Math.floor(random() * 4)); }
      else if (t === 'brass') { if (random() < 0.4) { porthole([x, cy + 0.24, cz], 0.2); } else if (random() < 0.5) { lantern([x - 0.12, cy, cz]); lantern([x + 0.12, cy, cz + 0.1]); } else clock([x, cy + 0.17, cz], 0.16); }
      else if (t === 'lifebuoys') { const n = 1 + Math.floor(random() * 4); for (let k = 0; k < n; k++) buoy([x + (random() - 0.5) * 0.03, cy + 0.075 + k * 0.15, cz], 0, true); }
      else (random() < 0.5 ? rope(at) : kettle(at));
    });
    // Hanging from the front beam.
    const beamY = a.stall === 'container' ? 2.5 : hiF - 0.03, beamZ = frontZ + 0.02;
    [-1.7, -0.85, 0.85, 1.7].forEach((x, i) => {
      if (!keep()) return;
      const t = theme(i), drop = a.stall === 'container' ? 0.08 : 0.35 + random() * 0.2;
      s.rod([x, beamY, beamZ], [x, beamY - drop, beamZ], 0.006, dark);
      if (t === 'lifebuoys') buoy([x, beamY - drop - 0.33, beamZ]);
      else if (t === 'brass') lantern([x, beamY - drop - 0.3, beamZ]);
      else if (t === 'crockery') kettle([x, beamY - drop - 0.24, beamZ]);
      else jacket([x, beamY - drop - 0.3, beamZ]);
    });
    // On the ground at the left.
    const groundLeft: P3 = [-W / 2 - 0.75, 0, 0.7];
    if (kind === 'furniture' || kind === 'mixed') {
      chair([-W / 2 - 0.5, 0, 1.25], 0.5);
      if (kind === 'furniture') { chair([-0.6, 0, 1.75], -0.2); chair([-1.5, 0, 1.9], 0.3); mattresses([W / 2 + 0.75, 0, -0.3]); }
      door([-W / 2 - 0.55, 0, 0.05]);
    } else if (kind === 'brass') { telegraph([groundLeft[0], 0, 1.1], 'HALF', 1.3); porthole([-W / 2 - 0.5, 0.22, 0.3], 0.22); }
    else if (kind === 'lifebuoys') { for (let k = 0; k < 4 + Math.floor(mood.density * 5); k++) buoy([groundLeft[0] + (random() - 0.5) * 0.05, 0.075 + k * 0.15, 1.0], 0, true); for (const dx of [-0.25, 0.25]) jacket([groundLeft[0] + dx, 0.24, 0.3], 1, '#e8621c'); }
    else { s.box([0.7, 0.4, 0.5], [groundLeft[0], 0.2, 1.0], timber); plates([groundLeft[0] - 0.15, 0.4, 1.0], 20); plates([groundLeft[0] + 0.15, 0.4, 1.05], 12); kettle([groundLeft[0], 0, 0.35]); }
    if (platePoints.length) {
      const stack = s.scatter(new THREE.LatheGeometry(plateProfile, 16), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 }), platePoints.map((p, i) => ({ ...p, color: i % 9 === 4 ? '#c9d6ea' : '#f1eee4' })));
      void stack;
    }
    // Signal flags across the eave.
    if (mood.density > 0.35 || mood.cheer > 0.6) {
      const flagColours = [['#f6c62a', '#1f3f72'], ['#c8281f', '#f4f1e6'], ['#1f3f72', '#f4f1e6'], ['#f6c62a', '#c8281f'], ['#1c1d20', '#f6c62a']];
      for (let i = 0; i < 9; i++) {
        const x = -W / 2 + 0.3 + i * ((W - 0.6) / 8), [c1, c2] = pick(flagColours);
        const y = beamY + 0.42 - Math.sin((i / 8) * Math.PI) * 0.12 + (a.sign === 'none' ? -0.25 : 0.42);
        s.box([0.26, 0.2, 0.008], [x, y, beamZ + 0.12], s.material(c1, { side: THREE.DoubleSide, roughness: 1 }));
        s.box([0.13, 0.2, 0.01], [x + 0.065, y, beamZ + 0.12], s.material(c2, { roughness: 1 }));
      }
    }

    // Signboard.
    if (a.sign !== 'none') {
      const palette = pick([['#1f3f72', '#f6f1dc', '#f6c62a'], ['#f2c82a', '#b3261f', '#1c1d20'], ['#1f6a4a', '#f6f1dc', '#f2c82a'], ['#b3261f', '#f6f1dc', '#f6c62a']]);
      const texture = paint(768, 144, (ctx) => {
        const stencil = a.sign === 'stencil';
        ctx.fillStyle = stencil ? '#e9e4d2' : palette[0]; ctx.fillRect(0, 0, 768, 144);
        ctx.strokeStyle = stencil ? '#b3261f' : palette[2]; ctx.lineWidth = 8; ctx.strokeRect(8, 8, 752, 128);
        ctx.fillStyle = ctx.strokeStyle = stencil ? '#1e6a3a' : palette[1];
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (a.sign === 'english' || stencil) {
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = `${stencil ? 'bold 64px monospace' : 'bold 78px serif'}`;
          ctx.fillText(stencil ? 'MUSTER STATION' : pick(['MARINE STORE', 'SHIP ITEMS', 'SHIP STORE', 'ALL SHIP GOODS']), 384, 76, 700);
          if (stencil) { ctx.fillStyle = '#e9e4d2'; for (let x = 60; x < 720; x += 23) ctx.fillRect(x, 30, 3, 90); }
        } else {
          // Pseudo-lettering: strokes with the rhythm of a script, not legible words.
          const words = 2 + Math.floor(random() * 2);
          let x = a.sign === 'flowing' ? 700 : 60;
          const dir = a.sign === 'flowing' ? -1 : 1;
          for (let w = 0; w < words; w++) {
            const glyphs = 3 + Math.floor(random() * 3), start = x;
            for (let g = 0; g < glyphs; g++) {
              ctx.lineWidth = a.sign === 'flowing' ? 9 : 10;
              ctx.beginPath();
              if (a.sign === 'rounded') {
                const r = 20 + random() * 8, cy0 = 76 + (random() - 0.5) * 10, open = random() * 6;
                ctx.arc(x + r, cy0, r, open, open + 4.3 + random());
                ctx.stroke(); ctx.beginPath();
                if (random() < 0.6) ctx.arc(x + r * 1.6, cy0 - r * 0.2, r * 0.5, 1, 5.5); else { ctx.moveTo(x + r, cy0 - r); ctx.quadraticCurveTo(x + r * 2.2, cy0 - r * 1.6, x + r * 2, cy0 + r * 0.6); }
                ctx.stroke();
                if (random() < 0.4) { ctx.beginPath(); ctx.arc(x + r, cy0 - r - 16, 9, 3.4, 6); ctx.stroke(); }
                x += r * 2.5 + 10;
              } else if (a.sign === 'barred') {
                const gw = 38 + random() * 14;
                ctx.moveTo(x + gw * 0.7, 44); ctx.lineTo(x + gw * 0.7, 112); ctx.stroke(); ctx.beginPath();
                if (random() < 0.5) { ctx.arc(x + gw * 0.36, 82, gw * 0.3, 0.4, 5.6); } else { ctx.moveTo(x + gw * 0.7, 70); ctx.quadraticCurveTo(x, 60, x + gw * 0.1, 96); ctx.quadraticCurveTo(x + gw * 0.3, 118, x + gw * 0.5, 96); }
                ctx.stroke();
                if (random() < 0.35) { ctx.beginPath(); ctx.moveTo(x + gw * 0.7, 44); ctx.quadraticCurveTo(x + gw * 0.3, 14, x + gw * 0.1, 30); ctx.stroke(); }
                x += gw + 6;
              } else {
                const gw = 44 + random() * 26, tall = random() < 0.4;
                ctx.moveTo(x, 86 + random() * 8); ctx.quadraticCurveTo(x - gw * 0.5, 122 - random() * 16, x - gw, 84 + random() * 10);
                if (tall) ctx.lineTo(x - gw - 4, 28 + random() * 14);
                ctx.stroke();
                const dots = Math.floor(random() * 3);
                for (let d = 0; d < dots; d++) { ctx.beginPath(); ctx.arc(x - gw * 0.5 + d * 14 - 7, random() < 0.5 ? 60 : 126, 5.5, 0, 7); ctx.fill(); }
                x -= gw + 4;
              }
            }
            if (a.sign === 'barred') { ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(start - 6, 44); ctx.lineTo(x - 2, 44); ctx.stroke(); }
            x += dir * 34;
          }
        }
        for (let i = 0; i < mood.wear * 50; i++) { ctx.fillStyle = `rgba(120,90,60,${0.15 + random() * 0.3})`; ctx.fillRect(random() * 768, random() * 144, 6 + random() * 40, 3 + random() * 10); }
      });
      const board = s.mesh(new THREE.BoxGeometry(3.3, 0.62, 0.04), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }), [0, beamY + 0.36, beamZ + 0.06]);
      board.rotation.x = -0.06;
      board.rotation.z = (random() - 0.5) * 0.04 * (1 + mood.wear * 2);
      for (const x of [-1.4, 1.4]) s.rod([x, beamY - 0.05, beamZ + 0.02], [x, beamY + 0.6, beamZ + 0.02], 0.025, timber);
    } else buoy([0, beamY + 0.2, beamZ + 0.08]);
    // A bare bulb.
    s.rod([0.2, beamY, beamZ - 0.5], [0.2, beamY - 0.35, beamZ - 0.5], 0.005, dark);
    s.ball([0.05, 0.065, 0.05], [0.2, beamY - 0.41, beamZ - 0.5], new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd77a', emissiveIntensity: lit ? 2.2 : 0.1 }), 10);

    // The one thing nobody buys, set apart on a crate out front.
    const ux = 0.75, uz = 1.6;
    s.box([0.62, 0.42, 0.5], [ux, 0.21, uz], s.material('#9a7a52', { roughness: 1 })).rotation.y = 0.12;
    for (const y of [0.1, 0.32]) s.box([0.64, 0.03, 0.52], [ux, y, uz], timber).rotation.y = 0.12;
    const top = 0.42;
    if (a.unsold === 'bell') {
      for (const dx of [-0.24, 0.24]) s.box([0.04, 0.5, 0.05], [ux + dx, top + 0.25, uz], timber);
      s.box([0.56, 0.04, 0.06], [ux, top + 0.5, uz], timber);
      bell([ux, top + 0.14, uz], 0.17);
      s.label(`${ship.split(' ')[0]} ${1968 + Math.floor(random() * 25)}`, 0.5, 0.09, [ux, top + 0.05, uz + 0.2], '#3a2c14', '#c79a3a').rotation.x = -0.5;
    } else if (a.unsold === 'photo') {
      const photo = paint(128, 96, (ctx) => {
        ctx.fillStyle = '#cdb88e'; ctx.fillRect(0, 0, 128, 96);
        ctx.fillStyle = '#8a744e'; ctx.fillRect(0, 62, 128, 34);
        ctx.fillStyle = '#4a3a28';
        for (const [x, h] of [[34, 40], [56, 46], [78, 38], [98, 26]] as const) { ctx.beginPath(); ctx.arc(x, 76 - h, 8, 0, 7); ctx.fill(); ctx.fillRect(x - 9, 84 - h, 18, h); }
        ctx.fillStyle = 'rgba(240,230,200,0.25)'; ctx.fillRect(0, 0, 128, 96);
      });
      const frame = s.box([0.5, 0.4, 0.04], [ux, top + 0.2, uz], s.material('#3a2c26'));
      frame.rotation.x = -0.28;
      const picture = s.mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshStandardMaterial({ map: photo, roughness: 0.4 }), [ux, top + 0.205, uz + 0.024]);
      picture.rotation.x = -0.28;
      picture.castShadow = false;
    } else if (a.unsold === 'lifejacket') {
      jacket([ux, top + 0.2, uz], 0.62, '#e8843c');
      s.cylinder(0.012, 0.012, 0.05, [ux + 0.12, top + 0.02, uz + 0.14], s.material('#f1eee4'), 6).rotation.z = 1.2;
    } else if (a.unsold === 'nameboard') {
      const board = s.label(ship, 1.3, 0.24, [ux, top + 0.2, uz + 0.03], '#d8b23a', '#3a2418');
      board.rotation.x = -0.3;
      s.box([1.36, 0.3, 0.04], [ux, top + 0.2, uz], s.material('#5a3a22')).rotation.x = -0.3;
    } else if (a.unsold === 'telegraph') {
      telegraph([ux, top, uz], 'FINISHED', 0);
    } else {
      const page = s.material('#efe7cf', { roughness: 1 });
      for (const side of [-1, 1]) { const leaf = s.box([0.26, 0.012, 0.36], [ux + side * 0.13, top + 0.035, uz], page); leaf.rotation.z = side * 0.14; }
      s.box([0.56, 0.02, 0.38], [ux, top + 0.012, uz], s.material('#27344a'));
      for (let i = 0; i < 7; i++) s.box([0.2, 0.002, 0.008], [ux - 0.13, top + 0.052, uz - 0.14 + i * 0.045], s.material('#2a3a6a')).rotation.z = -0.14;
      for (let i = 0; i < 2; i++) s.box([0.14 + i * 0.05, 0.002, 0.008], [ux + 0.12, top + 0.052, uz - 0.14 + i * 0.045], s.material('#2a3a6a')).rotation.z = 0.14;
      s.rod([ux + 0.2, top + 0.06, uz + 0.1], [ux + 0.08, top + 0.06, uz + 0.16], 0.008, s.material('#1c1d20'));
    }
    const tag = s.label('?', 0.09, 0.06, [ux + 0.33, 0.3, uz + 0.27], '#b3261f', '#f1eee4');
    tag.rotation.y = 0.12;

    // Who is minding it.
    const skin = s.material('#7a5038');
    const kx = W / 2 + 0.6, kz = 1.0;
    if (a.keeper === 'keeper' || a.keeper === 'nobody') {
      chair([kx, 0, kz], -0.5, '#3a2c26');
      if (a.keeper === 'keeper') {
        const cloth = s.material(pick(['#e8e2d0', '#3d6fa3', '#5a8f6b', '#b8452f']));
        const g = new THREE.Group();
        const put = (mesh: THREE.Mesh) => { g.add(mesh); return mesh; };
        put(s.box([0.38, 0.16, 0.48], [0, 0.7, 0.1], s.material('#8a8a7a')));
        put(s.box([0.3, 0.55, 0.14], [0, 0.34, 0.36], s.material('#8a8a7a')));
        put(s.box([0.42, 0.56, 0.24], [0, 1.02, -0.06], cloth));
        put(s.ball([0.11, 0.125, 0.115], [0, 1.45, -0.04], skin, 10));
        put(s.rod([0.2, 1.15, 0], [0.24, 0.92, 0.3], 0.045, skin));
        put(s.cylinder(0.03, 0.024, 0.08, [0.24, 0.96, 0.33], new THREE.MeshStandardMaterial({ color: '#c98a4a', roughness: 0.2 }), 8));
        if (mood.warmth > 0.4) put(s.cylinder(0.12, 0.125, 0.05, [0, 1.56, -0.04], s.material('#f1eee4'), 12));
        g.position.set(kx, 0, kz);
        g.rotation.y = -0.5;
        s.root.add(g);
      } else {
        s.label('BACK SOON', 0.4, 0.26, [kx - 0.1, 0.78, kz + 0.14], '#f1eee4', '#2a2c30').rotation.set(-0.3, -0.5, 0);
      }
    } else if (a.keeper === 'child') {
      const x = 1.2, cloth = s.material(pick(['#d8b23a', '#c2452f', '#3d6fa3']));
      s.box([0.26, 0.1, 0.3], [x, cy + 0.05, cz + 0.28], s.material('#4a5a7a'));
      s.box([0.22, 0.34, 0.1], [x, cy - 0.15, cz + 0.42], skin).rotation.x = 0.25;
      s.box([0.28, 0.36, 0.18], [x, cy + 0.28, cz + 0.2], cloth);
      s.ball([0.1, 0.11, 0.1], [x, cy + 0.57, cz + 0.2], skin, 10);
    } else {
      const bx = kx + 0.3, bz = 0.3;
      for (const dx of [-0.38, 0.38]) for (const dz of [-0.9, 0.9]) s.cylinder(0.035, 0.035, 0.45, [bx + dx, 0.225, bz + dz], timber, 8);
      s.box([0.84, 0.05, 1.9], [bx, 0.45, bz], s.material('#c9b88a', { roughness: 1 }));
      s.box([0.36, 0.2, 1.1], [bx, 0.57, bz - 0.1], s.material(pick(['#e8e2d0', '#3d6fa3', '#8a6a9a'])));
      s.box([0.3, 0.16, 0.5], [bx, 0.55, bz + 0.65], s.material('#8a8a7a'));
      s.ball([0.11, 0.11, 0.125], [bx, 0.58, bz - 0.78], skin, 10);
      s.box([0.3, 0.08, 0.22], [bx, 0.5, bz - 0.82], s.material('#b8452f', { roughness: 1 }));
    }
    return s.finish({ footprint: 2.9 });
  },
});
