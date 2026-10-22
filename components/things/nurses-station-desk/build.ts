import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];
const CZ = -0.75, R = 1.45, HALF = 58 * Math.PI / 180;
const SIGNS = { station: 'NURSES’ STATION', ward: 'WARD 4', maternity: 'MATERNITY', icu: 'INTENSIVE CARE', children: 'CHILDREN’S WARD', reception: 'RECEPTION', none: '' } as const;

export default defineThing({
  questions: {
    state: choice('What is happening at the station?', {
      deserted: 'Deserted: one chair tucked in, a lamp left on, a "back soon" card on the counter.',
      busy: 'Busy: charts pulled and open, mugs everywhere, the phone off its hook, chairs shoved back.',
      handover: 'Mid-handover: three chairs drawn into a huddle, printed sheets and pens laid out, a row of mugs.',
      emergency: 'Abandoned in a rush: a chair tipped over, the handset dangling by its cord, papers on the floor.',
    }),
    finish: choice('What is the counter front like?', {
      oak: 'Honey oak laminate with a dark kick-plate.',
      white: 'Clean white with a teal band.',
      navy: 'Deep navy with a pale top, corporate.',
      pink: 'Soft pink and cream, a maternity unit.',
      beige: 'Beige with brown trim, unchanged since the 1980s.',
    }),
    sign: choice('What does the sign on the counter front say?', {
      station: 'NURSES’ STATION', ward: 'WARD 4', maternity: 'MATERNITY', icu: 'INTENSIVE CARE', children: 'CHILDREN’S WARD', reception: 'RECEPTION', none: 'No sign.',
    }),
    board: choice('What is on the board behind the desk?', {
      sparse: 'A whiteboard grid of bed numbers, mostly empty: a quiet night.',
      full: 'A whiteboard crammed with names, coloured magnets and scrawled notes: every bed taken.',
      doodle: 'A bed board with a hand-drawn smiley and a birthday message in the corner.',
      cork: 'A cork noticeboard of rotas, memos and thank-you cards instead of a whiteboard.',
    }),
    screens: choice('What do the monitors show?', {
      vitals: 'Rows of green and yellow heartbeat traces from the beds.',
      records: 'Pale blue-white patient record forms.',
      saver: 'A dark screensaver with one drifting logo.',
      off: 'Nothing: the screens are dark.',
    }),
    treat: choice('What has been left out on the counter top?', {
      biscuits: 'An open tin of biscuits, lid beside it.',
      chocolates: 'A box of chocolates from a grateful family, half eaten.',
      fruit: 'A bowl of fruit nobody has had time for.',
      gel: 'Nothing but a pump bottle of hand gel.',
    }),
    thanks: noul('Are there thank-you cards and a vase of flowers on the counter?'),
    call: noul('Is a patient call light flashing on the wall panel?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dusk = Math.min(1, Math.abs(mood.daylight - 0.5) * 2 + 0.35);
    const at = (r: number, theta: number, y: number): P3 => [r * Math.sin(theta), y, CZ + r * Math.cos(theta)];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const fin = {
      oak: { front: '#c79a5c', band: '#8a5f34', top: '#e6e0d0', kick: '#3a3632' },
      white: { front: '#eceee9', band: '#2f8f8f', top: '#d9dedc', kick: '#5a6468' },
      navy: { front: '#26365e', band: '#c9cfd6', top: '#e4e6e2', kick: '#1c2233' },
      pink: { front: '#e7c3c6', band: '#f3ead8', top: '#f3ead8', kick: '#8a6a6e' },
      beige: { front: '#d6c7a4', band: '#6e4f34', top: '#cbbf9f', kick: '#5a4532' },
    }[a.finish];
    const front = s.material(fin.front, { roughness: 0.5, side: THREE.DoubleSide });
    const band = s.material(fin.band, { roughness: 0.5, side: THREE.DoubleSide });
    const top = s.material(fin.top, { roughness: 0.4 });
    const kick = s.material(fin.kick, { roughness: 0.7, side: THREE.DoubleSide });
    const dark = s.material('#25282b', { roughness: 0.6 });
    const steel = s.material('#b4babd', { metalness: 0.8, roughness: 0.3 });
    const white = s.material('#f4f4ee', { roughness: 0.7 });

    const wall = (r: number, y0: number, y1: number, material: THREE.Material, half = HALF) =>
      s.mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 48, 1, true, -half, half * 2), material, [0, (y0 + y1) / 2, CZ]);
    const slab = (r0: number, r1: number, y: number, thick: number, material: THREE.Material, half = HALF) => {
      const shape = new THREE.Shape();
      const steps = 40;
      for (let i = steps; i >= 0; i--) { const t = mix(-half, half, i / steps); const x = r1 * Math.sin(t), v = -r1 * Math.cos(t); if (i === steps) shape.moveTo(x, v); else shape.lineTo(x, v); }
      for (let i = 0; i <= steps; i++) { const t = mix(-half, half, i / steps); shape.lineTo(r0 * Math.sin(t), -r0 * Math.cos(t)); }
      const mesh = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 4 }), material, [0, y, CZ]);
      mesh.rotation.x = -Math.PI / 2;
      return mesh;
    };

    // ---- The counter: curved front, kick-plate, band, high ledge and inner worktop.
    wall(R, 0.1, 1.1, front);
    wall(R - 0.05, 0, 0.1, kick);
    wall(R + 0.004, 0.8, 0.9, band);
    wall(R - 0.5, 0, 0.74, front);
    slab(R - 0.2, R + 0.09, 1.1, 0.04, top);
    slab(R - 0.55, R - 0.02, 0.72, 0.035, top);
    for (const side of [-1, 1]) {
      // End panels closing the curve.
      const [x, , z] = at(R - 0.25, side * HALF, 0);
      const end = s.box([0.04, 1.1, 0.52], [x, 0.55, z], front); end.rotation.y = side * HALF;
    }
    // A strip of light tucked under the ledge, washing the front.
    const glowStrip = new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: new THREE.Color().setHSL(mix(0.55, 0.1, mood.warmth), 0.7, 0.7), emissiveIntensity: mix(0.5, 2.2, dusk) });
    wall(R + 0.03, 1.065, 1.09, glowStrip, HALF * 0.96);
    const sign = SIGNS[a.sign];
    if (sign) {
      const plate = s.label(sign, 1.1, 0.16, at(R + 0.012, 0, 0.55), a.finish === 'navy' ? '#ffffff' : '#22303a', a.finish === 'navy' ? '#26365e' : '#f4f1e4');
      plate.castShadow = false;
      plate.geometry.dispose(); plate.geometry = new THREE.PlaneGeometry(1.1, 0.16, 20, 1);
      const p = plate.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { const t = p.getX(i) / (R + 0.012); p.setX(i, (R + 0.012) * Math.sin(t)); p.setZ(i, (R + 0.012) * (Math.cos(t) - 1)); }
      plate.geometry.computeVertexNormals();
    }

    // ---- Back unit: low cupboards, a tall panel with the board, a wall monitor and chart pockets.
    const BZ = CZ - 0.32, BW = 2.5;
    s.box([BW, 0.9, 0.42], [0, 0.45, BZ], front);
    s.box([BW + 0.04, 0.035, 0.46], [0, 0.915, BZ], top);
    for (let i = 0; i < 5; i++) { s.box([0.004, 0.8, 0.004], [-BW / 2 + (i + 0.5) * BW / 5 - BW / 10, 0.45, BZ + 0.212], kick); s.box([0.012, 0.12, 0.014], [-BW / 2 + (i + 0.5) * BW / 5 - BW / 10 + 0.05, 0.62, BZ + 0.218], steel); }
    const panel = s.material(a.finish === 'navy' ? '#d9dee2' : a.finish === 'pink' ? '#f1e3df' : '#dfe3dc', { roughness: 0.85 });
    s.box([BW, 1.15, 0.07], [0, 1.5, BZ - 0.17], panel);
    s.box([BW + 0.04, 0.05, 0.1], [0, 2.09, BZ - 0.17], band);
    const PZ = BZ - 0.132;

    // The board.
    const board = document.createElement('canvas'); board.width = 512; board.height = 352;
    const ctx = board.getContext('2d')!;
    const inks = ['#1f3f9a', '#b8241f', '#1c7a3c', '#1b1d1f'];
    if (a.board === 'cork') {
      ctx.fillStyle = '#b98a55'; ctx.fillRect(0, 0, 512, 352);
      for (let i = 0; i < 900; i++) { ctx.fillStyle = random() < 0.5 ? '#a87a48' : '#c99a64'; ctx.fillRect(random() * 512, random() * 352, 3, 3); }
      const papers = Math.round(mix(6, 16, mood.density));
      for (let i = 0; i < papers; i++) {
        const w = mix(60, 130, random()), h = mix(70, 150, random()), x = random() * (500 - w), y = random() * (340 - h);
        ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate((random() - 0.5) * 0.25);
        ctx.fillStyle = pick(['#f6f4ec', '#f6f4ec', '#f7e59a', '#f2c6cf', '#cfe4f2', '#d6efd0']); ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = 'rgba(40,50,60,0.55)'; for (let l = 0; l < h / 12 - 2; l++) ctx.fillRect(-w / 2 + 8, -h / 2 + 12 + l * 11, (w - 16) * mix(0.4, 1, random()), 3);
        ctx.fillStyle = pick(['#c8362c', '#2f6fb0', '#e0a92a']); ctx.beginPath(); ctx.arc(0, -h / 2 + 7, 5, 0, 6.3); ctx.fill();
        ctx.restore();
      }
    } else {
      ctx.fillStyle = '#f8f8f4'; ctx.fillRect(0, 0, 512, 352);
      ctx.fillStyle = '#2f6fb0'; ctx.fillRect(0, 0, 512, 40);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px monospace'; ctx.textBaseline = 'middle';
      ctx.fillText('BED   PATIENT      NURSE   NOTES', 12, 21);
      ctx.strokeStyle = '#9aa4aa'; ctx.lineWidth = 2;
      const rows = 8, rh = 39;
      for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, 40 + r * rh); ctx.lineTo(512, 40 + r * rh); ctx.stroke(); }
      for (const x of [70, 250, 350]) { ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, 352); ctx.stroke(); }
      const taken = a.board === 'full' ? 0.95 : a.board === 'sparse' ? 0.3 : 0.6;
      const first = 1 + Math.floor(random() * 20);
      for (let r = 0; r < rows; r++) {
        const y = 40 + r * rh + rh / 2;
        ctx.fillStyle = '#1b1d1f'; ctx.font = 'bold 26px monospace'; ctx.fillText(String(first + r), 16, y);
        if (random() > taken) continue;
        ctx.strokeStyle = pick(inks); ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (const [x0, x1] of [[82, 240], [262, 340], [362, 500]] as const) {
          if (x0 > 300 && random() < (a.board === 'full' ? 0.2 : 0.6)) continue;
          ctx.beginPath(); let x = x0; ctx.moveTo(x, y);
          const end = mix(x0 + 40, x1, random());
          while (x < end) { x += 5 + random() * 5; ctx.lineTo(x, y + (random() - 0.5) * 13); }
          ctx.stroke();
        }
        if (a.board === 'full' || random() < 0.4) { ctx.fillStyle = pick(['#c8362c', '#e0a92a', '#3fa35c', '#2f6fb0', '#7a4bb0']); ctx.beginPath(); ctx.arc(58, y, 8, 0, 6.3); ctx.fill(); }
      }
      if (a.board === 'doodle') {
        ctx.fillStyle = '#f8f8f4'; ctx.fillRect(352, 236, 158, 114);
        ctx.strokeStyle = '#b8241f'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(430, 300, 34, 0, 6.3); ctx.stroke();
        ctx.beginPath(); ctx.arc(430, 302, 20, 0.3, Math.PI - 0.3); ctx.stroke();
        ctx.fillStyle = '#b8241f'; for (const dx of [-12, 12]) { ctx.beginPath(); ctx.arc(430 + dx, 290, 4, 0, 6.3); ctx.fill(); }
        ctx.fillStyle = '#1c7a3c'; ctx.font = 'bold 20px monospace'; ctx.fillText('HAPPY BDAY!', 362, 250);
      }
    }
    const boardMap = new THREE.CanvasTexture(board); boardMap.colorSpace = THREE.SRGBColorSpace;
    const BX = -0.5;
    s.box([1.3, 0.92, 0.02], [BX, 1.52, PZ + 0.005], steel);
    s.mesh(new THREE.PlaneGeometry(1.24, 0.86), new THREE.MeshStandardMaterial({ map: boardMap, roughness: 0.5, emissive: '#ffffff', emissiveMap: boardMap, emissiveIntensity: 0.12 }), [BX, 1.52, PZ + 0.017]).castShadow = false;
    if (a.board !== 'cork') {
      s.box([1.0, 0.02, 0.05], [BX, 1.05, PZ + 0.035], steel);
      for (let i = 0; i < 3; i++) s.cylinder(0.008, 0.008, 0.1, [BX - 0.3 + i * 0.14 + random() * 0.05, 1.07, PZ + 0.04], s.material(inks[i]), 6).rotation.z = Math.PI / 2 + (random() - 0.5) * 0.3;
    }

    // Wall monitor and desk monitor share one screen texture.
    const screen = document.createElement('canvas'); screen.width = 256; screen.height = 160;
    const sx = screen.getContext('2d')!;
    sx.fillStyle = a.screens === 'records' ? '#dbe8f4' : a.screens === 'off' ? '#15181b' : '#07110f'; sx.fillRect(0, 0, 256, 160);
    if (a.screens === 'vitals') {
      for (let row = 0; row < 4; row++) {
        const y = 24 + row * 38, tint = ['#5cf08a', '#ffe14a', '#5cd0f0', '#5cf08a'][row];
        sx.strokeStyle = tint; sx.lineWidth = 2.5; sx.beginPath(); sx.moveTo(0, y);
        const beat = 26 + random() * 22;
        for (let x = 0; x < 190; x += 2) { const ph = (x % beat) / beat; sx.lineTo(x, y + (ph > 0.42 && ph < 0.5 ? -16 : ph >= 0.5 && ph < 0.56 ? 9 : Math.sin(x * 0.4) * 1.2)); }
        sx.stroke();
        sx.fillStyle = tint; sx.font = 'bold 26px monospace'; sx.fillText(String(52 + Math.floor(random() * 60)), 200, y + 9);
      }
    } else if (a.screens === 'records') {
      sx.fillStyle = '#2f6fb0'; sx.fillRect(0, 0, 256, 20);
      for (let i = 0; i < 9; i++) { sx.fillStyle = i % 2 ? '#c4d6e8' : '#f4f8fb'; sx.fillRect(8, 28 + i * 14, 240, 12); sx.fillStyle = '#44586a'; sx.fillRect(12, 32 + i * 14, 40 + random() * 150, 4); }
    } else if (a.screens === 'saver') {
      sx.fillStyle = pick(['#5cd0f0', '#f08a5c', '#b88af0']); sx.beginPath(); sx.arc(60 + random() * 130, 40 + random() * 80, 16, 0, 6.3); sx.fill();
    }
    const screenMap = new THREE.CanvasTexture(screen); screenMap.colorSpace = THREE.SRGBColorSpace;
    const screenMat = new THREE.MeshStandardMaterial({ map: screenMap, emissive: '#ffffff', emissiveMap: screenMap, emissiveIntensity: a.screens === 'off' ? 0 : mix(0.9, 1.5, dusk), roughness: 0.3 });
    const monitor = (parent: Sculpture, w: number, h: number, y: number) => {
      parent.box([w + 0.04, h + 0.04, 0.035], [0, y, 0], dark);
      parent.mesh(new THREE.PlaneGeometry(w, h), screenMat, [0, y, 0.0185]).castShadow = false;
    };
    const wm = new Sculpture(context);
    monitor(wm, 0.62, 0.38, 0);
    wm.root.position.set(0.72, 1.68, PZ + 0.05); wm.root.rotation.x = 0.08;
    s.root.add(wm.root);
    // Call panel: a row of small lamps, one of which may be flashing.
    s.box([0.5, 0.1, 0.02], [0.72, 1.32, PZ + 0.01], white);
    const callMat = new THREE.MeshStandardMaterial({ color: '#ff5a3a', emissive: '#ff3a1a', emissiveIntensity: 2.2 });
    const idle = s.material('#8e969b');
    const lit = a.call ? Math.floor(random() * 6) : -1;
    for (let i = 0; i < 6; i++) s.ball([0.022, 0.022, 0.012], [0.72 - 0.19 + i * 0.076, 1.32, PZ + 0.022], i === lit ? callMat : idle, 10);
    // Wall clock.
    const clock = s.cylinder(0.13, 0.13, 0.03, [0.72 + 0.42, 2.0 - 0.05, PZ + 0.02], white, 24); clock.rotation.x = Math.PI / 2; clock.position.set(-BW / 2 + 0.17, 1.9 - 0.9 + 0.95, PZ + 0.02);
    const hour = mood.daylight < 0.5 ? 3 + random() * 2 : 1 + random() * 3;
    for (const [len, angle, wide] of [[0.06, hour / 12 * 6.283, 0.012], [0.095, random() * 6.283, 0.008]] as const) {
      const hand = s.box([wide, len, 0.004], [clock.position.x + Math.sin(angle) * len / 2, clock.position.y + Math.cos(angle) * len / 2, PZ + 0.038], dark); hand.rotation.z = -angle;
    }
    // Chart pockets on the cupboard top: colour-tabbed binders leaning in a rack.
    const tabs = ['#c8362c', '#2f6fb0', '#e0a92a', '#3fa35c', '#7a4bb0', '#e07a2a'];
    const pulled = a.state === 'busy' ? 4 : a.state === 'handover' ? 2 : a.state === 'emergency' ? 1 : 0;
    const binderCount = 12;
    s.box([binderCount * 0.065 + 0.06, 0.03, 0.26], [0.55, 0.945, BZ + 0.02], dark);
    const gone = new Set<number>(); while (gone.size < pulled) gone.add(Math.floor(random() * binderCount));
    for (let i = 0; i < binderCount; i++) {
      if (gone.has(i)) continue;
      const x = 0.55 + (i - (binderCount - 1) / 2) * 0.065;
      const lean = (random() - 0.5) * 0.08 + (gone.has(i + 1) ? 0.22 : 0);
      const b = s.box([0.05, 0.3, 0.23], [x + lean * 0.15, 1.11, BZ + 0.02], s.material('#e9ecec', { roughness: 0.6 })); b.rotation.z = -lean;
      const tab = s.box([0.052, 0.07, 0.006], [x + lean * 0.2, 1.17, BZ + 0.137], s.material(tabs[i % tabs.length])); tab.rotation.z = -lean;
    }

    // ---- On the worktop: desk monitor, keyboard, phone, lamp.
    const WY = 0.755, LY = 1.14;
    const dm = new Sculpture(context);
    monitor(dm, 0.46, 0.28, 0.27);
    dm.box([0.05, 0.14, 0.03], [0, 0.07, -0.02], dark); dm.box([0.2, 0.012, 0.14], [0, 0.006, -0.02], dark);
    dm.box([0.38, 0.015, 0.13], [0.0, 0.008, 0.25], s.material('#d9dcd8'));
    const dmAt = at(R - 0.32, -0.62, WY);
    dm.root.position.set(...dmAt); dm.root.rotation.y = Math.PI / 2 - 0.25 + (random() - 0.5) * 0.2;
    s.root.add(dm.root);
    // Phone.
    const phone = new Sculpture(context);
    phone.box([0.2, 0.05, 0.22], [0, 0.025, 0], s.material('#3a3f44', { roughness: 0.5 })).rotation.x = 0.12;
    phone.box([0.1, 0.004, 0.1], [0.03, 0.058, 0.02], s.material('#aeb6ba')).rotation.x = 0.12;
    const lampOn = a.state !== 'deserted' || a.call;
    const phoneLamp = new THREE.MeshStandardMaterial({ color: '#ff5a3a', emissive: '#ff3a1a', emissiveIntensity: lampOn ? 1.5 : 0 });
    phone.box([0.02, 0.008, 0.012], [0.07, 0.07, -0.08], phoneLamp);
    const phoneAt = at(R - 0.3, 0.38, WY);
    phone.root.position.set(...phoneAt); phone.root.rotation.y = 0.38 + Math.PI + (random() - 0.5) * 0.3;
    s.root.add(phone.root);
    const handsetMat = s.material('#2c3034', { roughness: 0.5 });
    const coil = (from: P3, to: P3, sag: number) => {
      const pts: P3[] = [], A = new THREE.Vector3(...from), B = new THREE.Vector3(...to);
      for (let i = 0; i <= 40; i++) { const t = i / 40, p = A.clone().lerp(B, t); p.y -= Math.sin(t * Math.PI) * sag; pts.push([p.x + Math.cos(i * 1.2) * 0.01, p.y + Math.sin(i * 1.2) * 0.01, p.z]); }
      return s.tube(pts, 0.004, handsetMat);
    };
    const handset = new Sculpture(context);
    handset.box([0.05, 0.03, 0.2], [0, 0, 0], handsetMat);
    for (const e of [-1, 1]) handset.ball([0.03, 0.022, 0.035], [0, -0.01, e * 0.085], handsetMat, 10);
    if (a.state === 'emergency') {
      // Dangling over the public side of the counter.
      const h = at(R + 0.14, 0.42, mix(0.25, 0.55, random()));
      handset.root.position.set(...h); handset.root.rotation.set(Math.PI / 2 + 0.2, 0, (random() - 0.5) * 0.6);
      const ledge = at(R + 0.07, 0.4, LY);
      s.tube([[phoneAt[0], WY + 0.05, phoneAt[2]], at(R - 0.12, 0.39, LY + 0.03), ledge, [h[0], h[1] + 0.1, h[2]]], 0.005, handsetMat);
    } else if (a.state === 'busy') {
      const h = at(R - 0.38, 0.18, WY + 0.02);
      handset.root.position.set(...h); handset.root.rotation.y = random() * 3;
      coil([phoneAt[0], WY + 0.03, phoneAt[2]], h, 0.0);
    } else {
      handset.root.position.set(...at(R - 0.3 + 0.07, 0.38 + 0.045, WY + 0.075)); handset.root.rotation.y = phone.root.rotation.y;
    }
    s.root.add(handset.root);
    // Desk lamp throwing the one warm pool.
    const lampAt = at(R - 0.3, 0.72, WY);
    const lampGlow = new THREE.MeshStandardMaterial({ color: '#fff0c4', emissive: new THREE.Color().setHSL(mix(0.14, 0.09, mood.warmth), 0.9, 0.68), emissiveIntensity: mix(0.8, 2.6, dusk) });
    s.cylinder(0.07, 0.08, 0.02, [lampAt[0], WY + 0.01, lampAt[2]], dark, 16);
    s.tube([[lampAt[0], WY + 0.02, lampAt[2]], [lampAt[0] + 0.02, WY + 0.25, lampAt[2] - 0.03], [lampAt[0] - 0.08, WY + 0.4, lampAt[2] - 0.02], [lampAt[0] - 0.2, WY + 0.36, lampAt[2]]], 0.01, steel);
    const shade = s.mesh(new THREE.ConeGeometry(0.09, 0.11, 16, 1, true), s.material('#2f6f5a', { side: THREE.DoubleSide, roughness: 0.4 }), [lampAt[0] - 0.22, WY + 0.33, lampAt[2]]);
    shade.rotation.z = 0.5;
    s.ball([0.045, 0.045, 0.045], [lampAt[0] - 0.235, WY + 0.305, lampAt[2]], lampGlow, 10);
    const pool = s.cylinder(0.3, 0.3, 0.002, [lampAt[0] - 0.3, WY + 0.002, lampAt[2] - 0.02], new THREE.MeshBasicMaterial({ color: '#ffe9b0', transparent: true, opacity: mix(0.12, 0.45, dusk), depthWrite: false }), 24);
    pool.castShadow = false;

    // Papers, charts and mugs according to what is going on.
    const mug = (p: P3) => {
      const tint = pick(['#f4f1e6', '#2f6fb0', '#c8362c', '#e0a92a', '#3d6b55', '#e7b7c2']);
      s.cylinder(0.04, 0.036, 0.09, [p[0], p[1] + 0.045, p[2]], s.material(tint, { roughness: 0.4 }), 14);
      s.cylinder(0.034, 0.034, 0.004, [p[0], p[1] + 0.085, p[2]], s.material('#4a2f1c', { roughness: 0.3 }), 12);
      const handle = s.ring(0.024, 0.007, [p[0] + 0.045, p[1] + 0.045, p[2]], s.material(tint, { roughness: 0.4 })); handle.rotation.y = random() * 3;
      handle.position.set(p[0] + Math.cos(-handle.rotation.y) * 0.045, p[1] + 0.045, p[2] + Math.sin(-handle.rotation.y) * 0.045);
    };
    const paper = (p: P3, tint = '#f6f4ec') => { const m = s.box([0.21, 0.004, 0.297], [p[0], p[1] + 0.003, p[2]], s.material(tint, { roughness: 0.9 })); m.rotation.y = random() * 3; m.castShadow = false; return m; };
    const openChart = (p: P3) => {
      const turn = random() * 3;
      const cover = s.box([0.46, 0.012, 0.31], [p[0], p[1] + 0.006, p[2]], s.material(pick(tabs), { roughness: 0.6 })); cover.rotation.y = turn;
      for (const d of [-1, 1]) { const page = s.box([0.2, 0.012, 0.28], [p[0] + Math.cos(turn) * d * 0.11, p[1] + 0.016, p[2] - Math.sin(turn) * d * 0.11], white); page.rotation.y = turn; }
    };
    const density = mix(0.6, 1.4, mood.density);
    if (a.state === 'busy') {
      for (let i = 0; i < Math.round(3 * density); i++) openChart(at(R - 0.3 + (random() - 0.5) * 0.2, mix(-0.4, 0.3, random()), WY + i * 0.012));
      for (let i = 0; i < Math.round(4 * density); i++) mug(i % 2 ? at(R - 0.06, mix(-0.85, 0.85, random()), LY) : at(R - 0.3, mix(-0.3, 0.9, random()), WY));
      for (let i = 0; i < Math.round(5 * density); i++) paper(at(R - 0.06, mix(-0.8, 0.8, random()), LY + i * 0.002));
    } else if (a.state === 'handover') {
      for (let i = 0; i < 3; i++) paper(at(R - 0.33, -0.25 + i * 0.22, WY));
      for (let i = 0; i < 3; i++) { const p = at(R - 0.33, -0.2 + i * 0.22, WY + 0.012); s.cylinder(0.005, 0.005, 0.14, p, s.material(inks[i]), 6).rotation.set(Math.PI / 2, 0, random() * 3); }
      for (let i = 0; i < Math.round(3 * density) + 1; i++) mug(at(R - 0.06, -0.35 + i * 0.12, LY));
      const clip = s.box([0.23, 0.012, 0.32], at(R - 0.06, 0.5, LY + 0.006), s.material('#7b5a3a')); clip.rotation.y = 0.5 + Math.PI / 2;
    } else if (a.state === 'emergency') {
      openChart(at(R - 0.3, -0.1, WY));
      for (let i = 0; i < Math.round(6 * density); i++) { const t = mix(-0.6, 0.6, random()), r = R + mix(0.2, 0.75, random()); const sheet = paper([r * Math.sin(t), 0, CZ + r * Math.cos(t)]); sheet.position.y = 0.004; }
      mug(at(R - 0.3, 0.1, WY));
      const spill = s.cylinder(0.11, 0.13, 0.003, at(R - 0.06, -0.3, LY + 0.002), new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.15, transparent: true, opacity: 0.8 }), 16); spill.scale.z = 0.6;
      const fallen = s.cylinder(0.04, 0.036, 0.09, at(R - 0.06, -0.38, LY + 0.04), s.material('#f4f1e6'), 14); fallen.rotation.z = Math.PI / 2;
    } else {
      const card = new Sculpture(context);
      const face = card.label('BACK SOON', 0.2, 0.09, [0, 0.05, 0.02], '#22303a', '#f6f4ec'); face.rotation.x = -0.35;
      card.box([0.2, 0.09, 0.004], [0, 0.05, -0.02], white).rotation.x = 0.35;
      const p = at(R - 0.04, -0.2, LY); card.root.position.set(...p); card.root.rotation.y = -0.2;
      s.root.add(card.root);
      mug(at(R - 0.3, 0.1, WY));
    }

    // ---- Treats and thanks on the high ledge.
    const tp = at(R - 0.05, 0.62, LY);
    if (a.treat === 'biscuits') {
      const tin = s.material(pick(['#b02a2a', '#1f4f8a', '#2f6f4a', '#c9a23a']), { metalness: 0.5, roughness: 0.35 });
      s.cylinder(0.13, 0.13, 0.08, [tp[0], tp[1] + 0.04, tp[2]], tin, 24);
      s.cylinder(0.118, 0.118, 0.004, [tp[0], tp[1] + 0.07, tp[2]], s.material('#2a2018'), 20);
      const left = Math.round(mix(9, 2, mood.wear * 0.5 + (a.state === 'busy' ? 0.4 : 0)));
      for (let i = 0; i < left; i++) { const t = random() * 6.3, r = random() * 0.08; s.cylinder(0.03, 0.03, 0.012, [tp[0] + Math.cos(t) * r, tp[1] + 0.078 + i * 0.002, tp[2] + Math.sin(t) * r], s.material(pick(['#c99a5a', '#b07a3a', '#5a3a22', '#e0c08a']), { roughness: 0.9 }), 10).rotation.x = (random() - 0.5) * 0.5; }
      const lid = s.cylinder(0.135, 0.135, 0.02, [tp[0] - 0.24, tp[1] + 0.01, tp[2] - 0.08], tin, 24);
      const lab = s.label('BISCUITS', 0.16, 0.05, [lid.position.x, tp[1] + 0.021, lid.position.z], '#f6f0d8', '#' + tin.color.getHexString()); lab.rotation.x = -Math.PI / 2; lab.castShadow = false;
    } else if (a.treat === 'chocolates') {
      const boxTint = s.material(pick(['#6b2531', '#3a2a6b', '#b8862a']), { roughness: 0.5 });
      const b = s.box([0.3, 0.03, 0.2], [tp[0], tp[1] + 0.015, tp[2]], boxTint); b.rotation.y = 0.62 + (random() - 0.5) * 0.4;
      s.box([0.28, 0.006, 0.18], [tp[0], tp[1] + 0.031, tp[2]], s.material('#c9a94a', { metalness: 0.6, roughness: 0.4 })).rotation.y = b.rotation.y;
      for (let i = 0; i < 12; i++) if (random() < mix(0.9, 0.3, mood.wear)) {
        const lx = ((i % 4) - 1.5) * 0.06, lz = (Math.floor(i / 4) - 1) * 0.055, c = Math.cos(b.rotation.y), sn = Math.sin(b.rotation.y);
        s.ball([0.02, 0.014, 0.02], [tp[0] + lx * c + lz * sn, tp[1] + 0.042, tp[2] - lx * sn + lz * c], s.material(pick(['#4a2a1a', '#6b3f24', '#e8d9c0']), { roughness: 0.4 }), 8);
      }
      const lidMesh = s.box([0.3, 0.02, 0.2], [tp[0] - 0.3, tp[1] + 0.01, tp[2] - 0.12], boxTint); lidMesh.rotation.y = b.rotation.y + 0.4;
    } else if (a.treat === 'fruit') {
      s.lathe([[0, 0], [0.06, 0], [0.09, 0.02], [0.14, 0.07], [0.15, 0.075], [0.135, 0.06], [0.08, 0.015], [0, 0.012]], s.material('#e8e2d2', { roughness: 0.3, side: THREE.DoubleSide }), tp);
      for (let i = 0; i < 5; i++) { const t = i * 1.3 + random(), r = i ? 0.06 : 0; s.ball([0.038, 0.036, 0.038], [tp[0] + Math.cos(t) * r, tp[1] + 0.06 + (i ? 0 : 0.035), tp[2] + Math.sin(t) * r], s.material(pick(['#e07a2a', '#c8362c', '#8fb83a', '#e0c02a']), { roughness: 0.6 }), 10); }
      s.tube([[tp[0] - 0.05, tp[1] + 0.1, tp[2] + 0.06], [tp[0], tp[1] + 0.13, tp[2] + 0.1], [tp[0] + 0.08, tp[1] + 0.1, tp[2] + 0.08]], 0.016, s.material('#e8cf3a', { roughness: 0.6 }));
    }
    const gelAt = at(R - 0.03, -0.75, LY);
    s.cylinder(0.035, 0.038, 0.13, [gelAt[0], gelAt[1] + 0.065, gelAt[2]], new THREE.MeshStandardMaterial({ color: '#bfe4ef', roughness: 0.2, transparent: true, opacity: 0.85 }), 12);
    s.cylinder(0.012, 0.012, 0.05, [gelAt[0], gelAt[1] + 0.155, gelAt[2]], white, 8);
    s.box([0.05, 0.012, 0.016], [gelAt[0], gelAt[1] + 0.18, gelAt[2] + 0.015], white);
    if (a.thanks) {
      const cards = Math.round(mix(2, 6, mood.density));
      for (let i = 0; i < cards; i++) {
        const p = at(R - 0.02 - random() * 0.06, -0.48 + i * 0.13 + (random() - 0.5) * 0.03, LY);
        const c = new Sculpture(context);
        const tint = pick(['#f2c6cf', '#cfe4f2', '#f7e59a', '#d6efd0', '#f6f4ec', '#e2cff2']);
        for (const d of [-1, 1]) { const leaf = c.box([0.11, 0.15, 0.003], [d * 0.03, 0.075, 0.0], s.material(tint, { roughness: 0.8 })); leaf.rotation.y = d * 0.45; }
        c.ball([0.022, 0.022, 0.004], [0.035, 0.09, 0.022], s.material(pick(['#c8362c', '#e0a92a', '#7a4bb0']), { roughness: 0.6 }), 8).rotation.y = 0.45;
        c.root.position.set(...p); c.root.rotation.y = Math.atan2(p[0], p[2] - CZ) + (random() - 0.5) * 0.5;
        s.root.add(c.root);
      }
      const v = at(R - 0.03, 0.2, LY);
      s.lathe([[0, 0], [0.035, 0], [0.045, 0.06], [0.03, 0.13], [0.04, 0.17]], new THREE.MeshStandardMaterial({ color: '#b9dbe8', roughness: 0.15, transparent: true, opacity: 0.8, side: THREE.DoubleSide }), v);
      const droop = mix(0, 0.12, mood.wear);
      for (let i = 0; i < 7; i++) {
        const t = random() * 6.3, lean = 0.05 + random() * 0.08, h = 0.3 + random() * 0.12 - droop;
        const head: P3 = [v[0] + Math.cos(t) * lean, v[1] + h, v[2] + Math.sin(t) * lean];
        s.tube([[v[0], v[1] + 0.02, v[2]], [v[0] + Math.cos(t) * lean * 0.4, v[1] + h * 0.7, v[2] + Math.sin(t) * lean * 0.4], head], 0.004, s.material('#4f8a52'));
        s.ball([0.032, 0.026, 0.032], head, s.material(new THREE.Color(pick(['#e2574c', '#f0b03a', '#e98aa8', '#f4f1e6', '#a06fc0'])).lerp(new THREE.Color('#8a7a5a'), mood.wear * 0.5), { roughness: 0.8 }), 8);
      }
    }

    // ---- Chairs behind the counter.
    const chair = (x: number, z: number, turn: number, tipped = false) => {
      const c = new Sculpture(context);
      const fabric = s.material(pick(['#2f4f7a', '#3a3f44', '#5a2f3a', '#2f5f55']), { roughness: 0.9 });
      for (let i = 0; i < 5; i++) { const t = i / 5 * 6.283; c.rod([0, 0.08, 0], [Math.cos(t) * 0.28, 0.05, Math.sin(t) * 0.28], 0.016, dark); c.ball([0.025, 0.025, 0.025], [Math.cos(t) * 0.28, 0.025, Math.sin(t) * 0.28], dark, 8); }
      c.cylinder(0.02, 0.025, 0.36, [0, 0.26, 0], steel, 10);
      c.ball([0.23, 0.045, 0.22], [0, 0.47, 0], fabric, 16);
      c.rod([0, 0.45, -0.18], [0, 0.72, -0.24], 0.014, dark);
      const back = c.ball([0.2, 0.17, 0.035], [0, 0.82, -0.24], fabric, 16); back.rotation.x = -0.12;
      c.root.position.set(x, 0, z); c.root.rotation.y = turn;
      if (tipped) { c.root.rotation.z = Math.PI / 2 - 0.08; c.root.position.y = 0.26; }
      s.root.add(c.root);
    };
    const seatR = R - 0.85;
    if (a.state === 'deserted') chair(...[at(seatR + 0.12, -0.5, 0)].map(([x, , z]) => [x, z] as const)[0], -0.5);
    else if (a.state === 'busy') { for (const t of [-0.6, 0.5]) { const [x, , z] = at(seatR - random() * 0.2, t, 0); chair(x, z, t + (random() - 0.5) * 2.4); } }
    else if (a.state === 'handover') { for (const t of [-0.75, 0, 0.75]) { const [x, , z] = at(seatR + 0.05, t * 0.8, 0); chair(x, z, t * 0.8 + (random() - 0.5) * 0.5); } }
    else { const [x, , z] = at(seatR - 0.1, 0.3, 0); chair(x, z, random() * 6, true); const [x2, , z2] = at(seatR, -0.7, 0); chair(x2, z2, random() * 6); }

    const rate = mix(1, 3.5, mood.energy);
    return s.finish({
      footprint: 1.45,
      update: a.call ? (_dt, time) => { const on = Math.sin(time * rate * Math.PI) > 0; callMat.emissiveIntensity = on ? 2.6 : 0.2; phoneLamp.emissiveIntensity = on ? 1.6 : 0.1; } : undefined,
    });
  },
});
