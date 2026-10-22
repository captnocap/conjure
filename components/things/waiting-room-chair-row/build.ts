import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];
const SHADES = {
  teal: 'Hospital teal.',
  orange: 'Burnt orange, a 1970s outpatient department.',
  navy: 'Navy blue.',
  grey: 'Pale grey, anonymous.',
  green: 'Pale mint green.',
  mixed: 'Each seat a different faded colour, replaced one at a time over the years.',
} as const;
const SHADE_TINT: Record<Exclude<keyof typeof SHADES, 'mixed'>, string> = { teal: '#2f8f8f', orange: '#cf6a2c', navy: '#2c3f6e', grey: '#b9bfc2', green: '#9fcdb2' };

export default defineThing({
  questions: {
    seats: choice('How many seats are on the beam?', {
      three: 'Three seats: a short row in a corner.',
      four: 'Four seats.',
      five: 'Five seats, a long row.',
    }),
    shell: choice('What are the seats made of?', {
      plastic: 'One-piece moulded plastic scoops.',
      steel: 'Perforated steel, airport style, cold to sit on.',
      padded: 'Wipe-clean vinyl pads on a dark shell.',
      ply: 'Bent plywood shells, honey coloured and old.',
    }),
    shade: choice('What colour are the seats (or their pads)?', SHADES),
    arms: noul('Are there armrests between the seats, so nobody can lie down?'),
    table: choice('Where is the low table?', {
      end: 'A square table fixed to the end of the beam.',
      middle: 'A table fixed to the beam in the middle, splitting the row.',
      front: 'A separate low coffee table standing in front of the seats.',
      none: 'There is no table.',
    }),
    reading: choice('If there is a table, what is on it?', {
      stack: 'A squared-up stack of magazines nobody has touched.',
      fanned: 'Dog-eared magazines spread and slipping, months out of date.',
      leaflets: 'A box of tissues and a rack of health leaflets.',
      toys: 'A children’s bead-maze toy on a wooden base.',
    }),
    left: choice('What has been left on the seats?', {
      empty: 'Nothing: every seat is empty.',
      coat: 'A coat draped over a seat-back and a paper cup on the next seat: someone will be right back.',
      toy: 'A soft toy rabbit sitting on a seat with wooden blocks on the floor below.',
      vigil: 'A blanket and pillow across two seats, an overnight bag underneath, several cold paper cups: someone has been here all night.',
      paper: 'A folded newspaper and an umbrella leaning at the end.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = { three: 3, four: 4, five: 5 }[a.seats];
    const PITCH = 0.56, SW = 0.5;
    const tableSlot = a.table === 'end' ? n : a.table === 'middle' ? Math.floor(n / 2) : -1;
    const slots = n + (tableSlot >= 0 ? 1 : 0);
    const xAt = (slot: number) => (slot - (slots - 1) / 2) * PITCH;
    const steel = s.material('#aeb5b9', { metalness: 0.75, roughness: 0.35 });
    const dark = s.material('#2a2d30', { roughness: 0.7 });
    const palette = Object.values(SHADE_TINT);
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // ---- Beam and legs.
    const span = slots * PITCH;
    s.box([span - 0.06, 0.05, 0.09], [0, 0.34, -0.02], steel);
    for (const end of [-1, 1]) {
      const x = end * (span / 2 - (slots > 4 ? 0.45 : 0.3));
      s.box([0.05, 0.3, 0.07], [x, 0.18, -0.02], steel);
      s.box([0.06, 0.035, 0.56], [x, 0.03, -0.01], steel);
      for (const z of [-0.26, 0.24]) s.cylinder(0.022, 0.026, 0.014, [x, 0.007, z], dark, 10);
    }

    // ---- Seat shells: one curved surface from front lip to the top of the back.
    const side = new THREE.CatmullRomCurve3(([[0.235, 0.385], [0.2, 0.425], [0.06, 0.41], [-0.1, 0.415], [-0.19, 0.45], [-0.235, 0.58], [-0.26, 0.72], [-0.28, 0.84]] as const).map(([z, y]) => new THREE.Vector3(0, y, z)));
    const shellGeometry = () => {
      const g = new THREE.PlaneGeometry(1, 1, 10, 22);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) * 2, v = p.getY(i) + 0.5;
        const at = side.getPoint(v);
        const taper = 1 - 0.16 * Math.abs(2 * v - 1) ** 4 - (v > 0.8 ? (v - 0.8) * 0.35 : 0);
        const back = Math.min(1, Math.max(0, (v - 0.45) / 0.2));
        p.setXYZ(i, u * SW / 2 * taper, at.y + (1 - back) * 0.035 * u * u, at.z + back * 0.045 * u * u);
      }
      g.computeVertexNormals();
      return g;
    };
    const dots = (() => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#c4cacd'; ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#4a5054';
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { ctx.beginPath(); ctx.arc(x * 8 + (y % 2 ? 6 : 2), y * 8 + 4, 2.1, 0, 6.3); ctx.fill(); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(3, 5);
      return texture;
    })();
    const seatX: number[] = [];
    const missing = mood.wear > 0.72 ? Math.floor(random() * n) : -1;
    let seatIndex = 0;
    for (let slot = 0; slot < slots; slot++) {
      const x = xAt(slot);
      if (slot === tableSlot) continue;
      const index = seatIndex++;
      s.box([0.2, 0.035, 0.16], [x, 0.378, -0.02], dark);
      if (index === missing) { seatX.push(NaN); for (const dx of [-0.07, 0.07]) s.cylinder(0.008, 0.008, 0.03, [x + dx, 0.42, -0.02], steel, 6); continue; }
      seatX.push(x);
      const tint = new THREE.Color(a.shade === 'mixed' ? palette[(index * 2 + Math.floor(context.seed % 5)) % palette.length] : SHADE_TINT[a.shade]);
      tint.lerp(new THREE.Color('#a8a8a0'), mood.wear * 0.3 + (1 - mood.cheer) * 0.12);
      const material = a.shell === 'steel' ? new THREE.MeshStandardMaterial({ map: dots, metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide })
        : a.shell === 'ply' ? s.material('#c99a5a', { roughness: 0.55, side: THREE.DoubleSide })
        : a.shell === 'padded' ? s.material('#34383c', { roughness: 0.6, side: THREE.DoubleSide })
        : s.material(tint, { roughness: 0.45, side: THREE.DoubleSide });
      const shell = s.mesh(shellGeometry(), material, [x, 0, 0]);
      shell.rotation.y = (random() - 0.5) * 0.03;
      if (a.shell === 'padded') {
        const pad = s.material(tint, { roughness: 0.5 });
        s.ball([0.21, 0.035, 0.19], [x, 0.44, 0.03], pad, 16);
        const backPad = s.ball([0.2, 0.13, 0.03], [x, 0.68, -0.235], pad, 16); backPad.rotation.x = -0.2;
      }
      if (a.shell === 'ply') for (const dz of [-0.04, 0.08]) for (const dx of [-0.1, 0.1]) s.cylinder(0.012, 0.012, 0.006, [x + dx, 0.424, dz], steel, 8);
      if (mood.wear > 0.5 && random() < mood.wear * 0.6) {
        const tape = s.box([0.16, 0.004, 0.05], [x + (random() - 0.5) * 0.15, 0.428, 0.12], s.material('#9aa0a2', { metalness: 0.5, roughness: 0.4 })); tape.rotation.y = (random() - 0.5);
      }
    }
    // Armrests: thin loops at the row ends and between seats.
    if (a.arms) for (let slot = 0; slot <= slots; slot++) {
      if (slot === tableSlot || slot - 1 === tableSlot && tableSlot === slots - 1) continue;
      const x = -span / 2 + slot * PITCH + (slot === 0 ? 0.02 : slot === slots ? -0.02 : 0);
      s.tube([[x, 0.36, -0.03], [x, 0.6, -0.16], [x, 0.63, -0.12], [x, 0.63, 0.14], [x, 0.6, 0.17], [x, 0.36, 0.02]], 0.012, steel);
      s.box([0.04, 0.02, 0.24], [x, 0.645, 0.01], dark);
    }

    // ---- Table.
    const laminate = s.material(a.shell === 'ply' ? '#b98a50' : '#d9d4c4', { roughness: 0.5 });
    let tableAt: P3 | null = null, tableSize: [number, number] = [0.5, 0.5];
    if (tableSlot >= 0) {
      tableAt = [xAt(tableSlot), 0.43, 0.0];
      s.box([0.5, 0.03, 0.5], [tableAt[0], 0.415, 0], laminate);
      s.box([0.51, 0.012, 0.51], [tableAt[0], 0.4, 0], dark);
      s.box([0.12, 0.04, 0.12], [tableAt[0], 0.38, -0.02], dark);
    } else if (a.table === 'front') {
      const tx = (random() - 0.5) * 0.5, tz = 0.82;
      tableAt = [tx, 0.4, tz]; tableSize = [0.95, 0.46];
      s.box([0.95, 0.03, 0.46], [tx, 0.385, tz], laminate);
      for (const dx of [-0.42, 0.42]) for (const dz of [-0.18, 0.18]) s.cylinder(0.014, 0.014, 0.37, [tx + dx, 0.185, tz + dz], steel, 8);
      s.box([0.84, 0.012, 0.36], [tx, 0.14, tz], s.material('#8d9498', { metalness: 0.6, roughness: 0.4 }));
    }
    const cover = (tint: string) => {
      const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = tint; ctx.fillRect(0, 0, 96, 128);
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillRect(8, 8, 80, 16);
      ctx.fillStyle = pick(['#e0b070', '#7fa8c4', '#d8c8a0', '#c08a70']); ctx.beginPath(); ctx.arc(48, 70, 24, 0, 6.3); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; for (let i = 0; i < 3; i++) ctx.fillRect(10, 108 + i * 6, 30 + random() * 50, 3);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, color: new THREE.Color('#ffffff').lerp(new THREE.Color('#cfc6a8'), mood.wear * 0.6) });
    };
    const covers = ['#c8362c', '#2f6fb0', '#e0a92a', '#3f8a5f', '#7a4bb0', '#1f2a36'].map(cover);
    const pages = s.material('#ece6d2');
    const magazine = (x: number, y: number, z: number, turn: number) => {
      s.box([0.21, 0.008, 0.28], [x, y + 0.004, z], pages).rotation.y = turn;
      const top = s.mesh(new THREE.PlaneGeometry(0.21, 0.28), pick(covers), [x, y + 0.0085, z]);
      top.rotation.set(-Math.PI / 2, 0, turn); top.castShadow = false;
    };
    if (tableAt) {
      const [tx, ty, tz] = tableAt;
      if (a.reading === 'stack') {
        const count = Math.round(mix(3, 10, mood.density));
        for (let i = 0; i < count; i++) magazine(tx + (random() - 0.5) * 0.008, ty + i * 0.009, tz + (random() - 0.5) * 0.008, (random() - 0.5) * 0.04);
      } else if (a.reading === 'fanned') {
        const count = Math.round(mix(4, 11, mood.density));
        for (let i = 0; i < count; i++) magazine(tx + (random() - 0.5) * (tableSize[0] - 0.28), ty + i * 0.009, tz + (random() - 0.5) * (tableSize[1] - 0.3), (random() - 0.5) * 2.2);
        // One has slid to the floor.
        magazine(tx + (random() - 0.5) * 0.3, 0.0, tz + tableSize[1] / 2 + 0.2 + random() * 0.1, random() * 3);
      } else if (a.reading === 'leaflets') {
        s.box([0.24, 0.08, 0.12], [tx - 0.08, ty + 0.04, tz + 0.08], s.material('#8fb4d6'));
        s.ball([0.05, 0.035, 0.02], [tx - 0.08, ty + 0.09, tz + 0.08], s.material('#f8f8f4'), 8);
        const rack = new Sculpture(context);
        rack.box([0.3, 0.02, 0.1], [0, 0.01, 0], dark);
        for (let i = 0; i < 3; i++) for (let k = 0; k < 2 + Math.floor(random() * 3); k++) {
          const leaf = rack.box([0.09, 0.19, 0.004], [(i - 1) * 0.1, 0.1, -0.03 + k * 0.012], s.material(['#3f8a5f', '#e0a92a', '#2f6fb0', '#c8362c', '#7a4bb0'][(i + k) % 5])); leaf.rotation.x = -0.25;
        }
        rack.root.position.set(tx + 0.06, ty, tz - 0.12); rack.root.rotation.y = (random() - 0.5) * 0.4;
        s.root.add(rack.root);
      } else {
        // Bead maze: bright wires looping over a wooden base.
        s.box([0.3, 0.03, 0.2], [tx, ty + 0.015, tz], s.material('#c99a5a'));
        const wires = ['#e2452f', '#2f8fe0', '#f0c82a', '#3fa35c'];
        wires.forEach((tint, i) => {
          const z = tz - 0.06 + i * 0.04, h = 0.14 + random() * 0.12;
          const pts: P3[] = [[tx - 0.12, ty + 0.03, z], [tx - 0.1, ty + h, z + 0.03], [tx - 0.02 + random() * 0.04, ty + h * (0.5 + random() * 0.6), z - 0.03], [tx + 0.08, ty + h * 0.9, z + 0.02], [tx + 0.12, ty + 0.03, z]];
          const mat = s.material(tint, { roughness: 0.4 });
          s.tube(pts, 0.005, mat);
          const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
          for (let b = 0; b < 3; b++) { const at = curve.getPoint(0.2 + random() * 0.6); s.ball([0.016, 0.016, 0.016], [at.x, at.y, at.z], s.material(wires[(i + b + 1) % 4], { roughness: 0.4 }), 10); }
        });
      }
    }

    // ---- What people left.
    const free = seatX.map((x, i) => ({ x, i })).filter(({ x }) => !Number.isNaN(x));
    const cup = (x: number, y: number, z: number, tipped = false) => {
      const c = new Sculpture(context);
      c.cylinder(0.04, 0.028, 0.1, [0, 0.05, 0], s.material('#f4f1e6', { roughness: 0.8 }), 14);
      c.cylinder(0.039, 0.033, 0.045, [0, 0.055, 0], s.material('#a9794a', { roughness: 0.9 }), 14);
      if (random() < 0.6) c.cylinder(0.042, 0.042, 0.012, [0, 0.105, 0], s.material(random() < 0.5 ? '#f8f8f4' : '#2a2d30'), 14);
      c.root.position.set(x, y, z);
      if (tipped) { c.root.rotation.z = Math.PI / 2; c.root.position.y += 0.04; c.root.rotation.y = random() * 6; }
      s.root.add(c.root);
    };
    const SEAT_Y = 0.418;
    if (a.left === 'coat' && free.length) {
      const seat = free[Math.floor(random() * free.length)];
      const coat = s.material(pick(['#5b3f34', '#3d4a3c', '#40455c', '#8a2f36', '#c2a878', '#22252a']), { roughness: 0.95, side: THREE.DoubleSide });
      // Over the back: down the front to the seat, over the top, down behind.
      const g = new THREE.PlaneGeometry(1, 1, 12, 20);
      const p = g.attributes.position, ph = random() * 6, lean = (random() - 0.5) * 0.1;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) * 2, v = p.getY(i) + 0.5;
        let y: number, z: number;
        if (v < 0.5) { const t = v / 0.5; const at = side.getPoint(mix(0.5, 1, t)); y = at.y + 0.012; z = at.z + 0.03 + (1 - t) * 0.03; }
        else { const t = (v - 0.5) / 0.5; y = 0.86 - t * 0.55 - Math.sin(t * Math.PI) * -0.02; z = -0.3 - Math.sin(Math.min(1, t * 3) * Math.PI / 2) * 0.03 - t * 0.02; }
        const hang = Math.abs(v - 0.5) * 2;
        p.setXYZ(i, seat.x + lean + u * (0.22 + hang * 0.06) + Math.sin(v * 9 + ph) * 0.01, y + (v > 0.48 && v < 0.52 ? 0.01 : 0) - Math.abs(u) * 0.03 * (1 - hang), z + Math.sin(u * 7 + ph) * 0.018 * hang);
      }
      g.computeVertexNormals();
      s.mesh(g, coat);
      // Sleeves hanging at either side.
      for (const d of [-1, 1]) s.tube([[seat.x + lean + d * 0.2, 0.83, -0.29], [seat.x + lean + d * 0.27, 0.7, -0.31], [seat.x + lean + d * 0.28, 0.45 + random() * 0.08, -0.3 + random() * 0.04]], 0.04, coat);
      const next = free.find(({ i }) => Math.abs(i - seat.i) === 1) ?? seat;
      if (next !== seat) cup(next.x + (random() - 0.5) * 0.15, SEAT_Y, 0.06);
      else cup(seat.x + 0.2, 0, 0.4);
    }
    if (a.left === 'toy' && free.length) {
      const seat = free[Math.floor(random() * free.length)];
      const fur = s.material(pick(['#e8d9c0', '#c9a06a', '#d9b7c2', '#b9c4d6']), { roughness: 1 });
      const t = new Sculpture(context);
      t.ball([0.065, 0.075, 0.06], [0, 0.075, 0], fur, 14);
      t.ball([0.055, 0.05, 0.05], [0, 0.185, 0.01], fur, 14);
      for (const d of [-1, 1]) {
        const ear = t.ball([0.018, 0.07, 0.012], [d * 0.025, 0.28, 0], fur, 8); ear.rotation.z = -d * (0.15 + random() * 0.5);
        t.ball([0.025, 0.025, 0.05], [d * 0.045, 0.03, 0.07], fur, 8);
        t.ball([0.02, 0.045, 0.02], [d * 0.07, 0.09, 0.02], fur, 8).rotation.z = d * 0.5;
        t.ball([0.007, 0.007, 0.005], [d * 0.02, 0.2, 0.055], dark, 6);
      }
      t.ball([0.01, 0.008, 0.008], [0, 0.18, 0.06], s.material('#d98a9a'), 6);
      t.root.position.set(seat.x + (random() - 0.5) * 0.1, SEAT_Y, 0.0);
      t.root.rotation.set(-0.15, (random() - 0.5) * 0.8, (random() - 0.5) * 0.3);
      s.root.add(t.root);
      const blocks = Math.round(mix(3, 9, mood.density));
      for (let i = 0; i < blocks; i++) {
        const stacked = i > 0 && random() < 0.3;
        const b = s.box([0.05, 0.05, 0.05], [seat.x + (random() - 0.5) * 0.5, stacked ? 0.075 : 0.025, 0.42 + random() * 0.3], s.material(pick(['#e2452f', '#2f8fe0', '#f0c82a', '#3fa35c', '#e8d9c0']), { roughness: 0.6 }));
        b.rotation.y = random() * 3;
        if (stacked) { const below = s.box([0.05, 0.05, 0.05], [b.position.x, 0.025, b.position.z], s.material(pick(['#e2452f', '#2f8fe0', '#f0c82a']), { roughness: 0.6 })); below.rotation.y = random() * 3; }
      }
    }
    if (a.left === 'vigil' && free.length) {
      // Two neighbouring seats if there are any.
      const pair = free.find(({ i }, k) => free[k + 1]?.i === i + 1);
      const x0 = pair ? pair.x : free[0].x, x1 = pair ? pair.x + PITCH : free[0].x;
      const wool = s.material(new THREE.Color(pick(['#8fb4d6', '#c98a8a', '#8a8d90', '#b9a36a', '#7d9a8a'])).lerp(new THREE.Color('#9a9c9c'), (1 - mood.cheer) * 0.3), { roughness: 1, side: THREE.DoubleSide });
      const g = new THREE.PlaneGeometry(1, 1, 26, 14);
      const p = g.attributes.position, ph = random() * 6, w = x1 - x0 + 0.5;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5; // v: 0 back of seat .. 1 hanging over the front
        const x = x0 - 0.25 + u * w;
        const z = -0.14 + Math.min(v, 0.62) * 0.62 + Math.max(0, v - 0.62) * 0.08;
        const drop = Math.max(0, v - 0.62) * mix(0.5, 0.95, 0.5 + 0.5 * Math.sin(u * 5 + ph));
        const lump = Math.sin(u * 11 + ph) * 0.018 + Math.sin(v * 9 + u * 6 + ph) * 0.016 + Math.exp(-((u - 0.6) ** 2) / 0.03) * 0.05 * (1 - v);
        p.setXYZ(i, x, SEAT_Y + 0.05 + lump - drop, z + Math.sin(u * 14 + ph) * 0.015 * Math.max(0, v - 0.6) * 3);
      }
      g.computeVertexNormals();
      s.mesh(g, wool);
      const pillow = s.ball([0.19, 0.06, 0.13], [x0 - 0.02, SEAT_Y + 0.14, -0.08], s.material('#f1f0ea', { roughness: 0.95 }), 16);
      pillow.rotation.set(-0.5, (random() - 0.5) * 0.4, 0.1);
      const bagTint = s.material(pick(['#3f4f6f', '#6f3f3f', '#3f5f4a', '#2a2d30']), { roughness: 0.9 });
      const bag = s.mesh(new THREE.CapsuleGeometry(0.13, 0.3, 6, 14), bagTint, [x1 + (pair ? 0 : 0.5) - 0.1, 0.13, 0.12]);
      bag.rotation.z = Math.PI / 2; bag.rotation.y = (random() - 0.5) * 0.5;
      s.tube([[bag.position.x - 0.12, 0.25, 0.12], [bag.position.x, 0.33, 0.14], [bag.position.x + 0.12, 0.25, 0.12]], 0.01, dark);
      const cups = Math.round(mix(2, 6, mood.density));
      for (let i = 0; i < cups; i++) {
        if (tableAt && i % 2 === 0) cup(tableAt[0] + (random() - 0.5) * (tableSize[0] - 0.12), tableAt[1], tableAt[2] + (random() - 0.5) * (tableSize[1] - 0.12));
        else cup(x0 + (random() - 0.5) * 0.9, 0, 0.36 + random() * 0.2, random() < 0.35);
      }
      // A phone charger trailing to nowhere.
      s.tube([[x1 + 0.1, SEAT_Y + 0.07, 0.1], [x1 + 0.2, 0.3, 0.26], [x1 + 0.25, 0.01, 0.34], [x1 + 0.1, 0.006, 0.5], [x1 + 0.3, 0.006, 0.56]], 0.004, s.material('#f4f4f0'));
    }
    if (a.left === 'paper' && free.length) {
      const seat = free[Math.floor(random() * free.length)];
      const turn = (random() - 0.5) * 0.7;
      s.box([0.3, 0.018, 0.2], [seat.x, SEAT_Y + 0.012, 0.05], s.material('#dcd8c8')).rotation.y = turn;
      const head = s.label('THE NIGHT EDITION', 0.28, 0.05, [seat.x, SEAT_Y + 0.0225, 0.05], '#1b1d1f', '#dcd8c8');
      head.rotation.set(-Math.PI / 2, 0, turn); head.castShadow = false;
      const ux = span / 2 + 0.06;
      const fabric = s.material(pick(['#1f2226', '#2c3f6e', '#8a2f36', '#3d6b55']), { roughness: 0.7 });
      const u = new Sculpture(context);
      u.cylinder(0.035, 0.012, 0.6, [0, 0.36, 0], fabric, 10);
      u.cylinder(0.006, 0.006, 0.9, [0, 0.45, 0], steel, 6);
      u.ring(0.03, 0.008, [0.03, 0.9, 0], s.material('#7b5a3a'), Math.PI).rotation.z = 0;
      u.root.position.set(ux, 0, 0.12); u.root.rotation.z = 0.2; u.root.rotation.x = -0.12;
      s.root.add(u.root);
      if (mood.daylight < 0.4 || mood.cheer < 0.4) s.cylinder(0.09, 0.11, 0.003, [ux + 0.03, 0.002, 0.14], new THREE.MeshStandardMaterial({ color: '#8fa3ad', roughness: 0.1, transparent: true, opacity: 0.5 }), 16);
    }

    return s.finish();
  },
});
