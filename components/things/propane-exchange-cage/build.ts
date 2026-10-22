import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { grime, painted, scrawl, write } from './paint';

const BRAND = { blue: '#1b5fb4', orange: '#e2571c', green: '#2c7a47', yellow: '#edb516', black: '#22262a' } as const;
const WORDS = { exchange: ['PROPANE', 'EXCHANGE'], lp: ['LP GAS', 'TANKS'], grill: ['GRILL GAS', 'SWAP HERE'], price: ['PROPANE', '$21.99'], heat: ['HEATER', 'FUEL'] } as const;

export default defineThing({
  questions: {
    size: choice('How big is the cage?', {
      single: 'One bay, three tanks wide, chest high plus a header.',
      double: 'A long double-bay cage with two doors, the full supermarket set-up.',
      tall: 'A tall narrow locker two tanks wide and four shelves high.',
    }),
    stock: score('How many tanks remain?', ['Empty shelves', 'A lonely two or three', 'About half', 'Freshly delivered, every slot filled']),
    brand: choice('What colour is the brand on the header and the tank sleeves?', {
      blue: 'Corporate blue with a white flame.',
      orange: 'Hot orange and red.',
      green: 'Farm co-op green.',
      yellow: 'Hardware-store yellow and black.',
      black: 'Matte black with a thin gold flame, the premium brand.',
    }),
    wording: choice('What does the header say?', {
      exchange: 'PROPANE EXCHANGE.',
      lp: 'LP GAS TANKS.',
      grill: 'GRILL GAS — SWAP HERE.',
      price: 'PROPANE with a price, $21.99.',
      heat: 'HEATER FUEL, for winter.',
    }),
    signmaker: choice('Who made the sign?', {
      printed: 'A crisp printed corporate panel.',
      handpainted: 'Hand-repainted on plywood by the owner, letters a little uneven.',
      backlit: 'A glowing backlit plastic lightbox.',
    }),
    door: choice('What state is the door in?', {
      locked: 'Shut and padlocked.',
      open: 'Swung open with the key still hanging in the padlock.',
      outside: 'Ajar, with one tank set down on the ground outside, mid-exchange.',
      chained: 'Wrapped shut with a heavy chain after somebody tried to break in.',
    }),
    beside: choice('What is stacked beside it?', {
      nothing: 'Nothing.',
      jugs: 'Blue jugs of windshield-washer fluid on a low rack.',
      firewood: 'Bundles of firewood.',
      salt: 'A slumped stack of rock-salt bags.',
      empties: 'A huddle of returned, rusty empties, one tipped over.',
    }),
    guard: choice('What protects it from cars?', {
      none: 'Nothing.',
      bollards: 'Two yellow steel bollards.',
      kerb: 'A concrete wheel stop.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const across = { single: 3, double: 6, tall: 2 }[a.size];
    const shelves = a.size === 'tall' ? 4 : 3;
    const pitch = 0.335, rise = 0.56;
    const W = across * pitch + 0.1, D = 0.76, base = 0.14, H = base + shelves * rise + 0.04;
    const brand = BRAND[a.brand];
    const frame = s.material(mix(0, 1, wear) > 0.6 ? '#7d7a72' : '#9aa0a2', { metalness: 0.6, roughness: 0.5 });
    const dark = s.material('#1f2326', { roughness: 0.7 });
    const steel = s.material('#b9bfc1', { metalness: 0.85, roughness: 0.3 });
    const yellow = s.material('#e7b512', { roughness: 0.55 });
    const night = Math.abs(mood.daylight - 0.5) * 2;

    // Frame.
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.05, H, 0.05], [x * (W / 2 - 0.025), H / 2, z * (D / 2 - 0.025)], frame);
    if (a.size === 'double') for (const z of [-1, 1]) s.box([0.05, H, 0.05], [0, H / 2, z * (D / 2 - 0.025)], frame);
    for (let i = 0; i <= shelves; i++) {
      const y = i === shelves ? H - 0.02 : base + i * rise;
      s.box([W, 0.035, D], [0, y - 0.018, 0], i === shelves ? frame : s.material('#8a9092', { metalness: 0.5, roughness: 0.6 }));
    }
    const roof = s.box([W + 0.14, 0.03, D + 0.16], [0, H + 0.03, 0.02], frame); roof.rotation.x = 0.06;
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.09, 0.02, 0.09], [x * (W / 2 - 0.025), 0.01, z * (D / 2 - 0.025)], dark);

    const mesh = (w: number, h: number) => painted(w, h, (ctx, cw, ch) => {
      ctx.strokeStyle = wear > 0.6 ? '#6f6a60' : '#7f8587'; ctx.lineWidth = Math.max(2.4, cw * 0.012);
      const step = (0.075 / w) * cw;
      for (let x = -ch; x < cw + ch; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + ch, ch); ctx.moveTo(x, 0); ctx.lineTo(x - ch, ch); ctx.stroke(); }
      ctx.lineWidth = cw * 0.02; ctx.strokeRect(0, 0, cw, ch);
    }, { px: 320, cutout: true, roughness: 0.5 });
    const back = mesh(W - 0.06, H - base); back.position.set(0, (H + base) / 2, -D / 2 + 0.02); s.root.add(back);
    for (const x of [-1, 1]) { const side = mesh(D - 0.06, H - base); side.position.set(x * (W / 2 - 0.02), (H + base) / 2, 0); side.rotation.y = Math.PI / 2; s.root.add(side); }

    // Placards.
    const noSmoking = (size: number) => painted(size, size, (ctx, w, h) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(w * 0.26, h * 0.4, w * 0.4, h * 0.09); ctx.fillStyle = '#d98a2a'; ctx.fillRect(w * 0.66, h * 0.4, w * 0.09, h * 0.09);
      ctx.strokeStyle = '#d2201c'; ctx.lineWidth = w * 0.085; ctx.beginPath(); ctx.arc(w / 2, h * 0.44, w * 0.32, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w * 0.28, h * 0.22); ctx.lineTo(w * 0.72, h * 0.66); ctx.stroke();
      write(ctx, 'NO SMOKING', w / 2, h * 0.9, h * 0.12, '#d2201c', { max: w * 0.92 });
      grime(ctx, w, h, random, wear * 0.6);
    }, { px: 192 });
    const danger = (w0: number, h0: number) => painted(w0, h0, (ctx, w, h) => {
      ctx.fillStyle = '#d2201c'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#ffffff'; ctx.fillRect(w * 0.04, h * 0.44, w * 0.92, h * 0.5);
      write(ctx, 'DANGER', w / 2, h * 0.24, h * 0.32, '#ffffff', { max: w * 0.9 });
      write(ctx, 'FLAMMABLE GAS', w / 2, h * 0.69, h * 0.22, '#1a1a1a', { max: w * 0.86 });
      grime(ctx, w, h, random, wear * 0.6);
    }, { px: 256 });
    const sidePlacard = noSmoking(0.36); sidePlacard.position.set(W / 2 + 0.006, H * 0.62, 0); sidePlacard.rotation.y = Math.PI / 2; s.root.add(sidePlacard);
    const otherSide = danger(0.44, 0.24); otherSide.position.set(-W / 2 - 0.006, H * 0.62, 0); otherSide.rotation.y = -Math.PI / 2; s.root.add(otherSide);

    // Header sign.
    const headH = 0.36, lines = WORDS[a.wording];
    const hand = a.signmaker === 'handpainted', backlit = a.signmaker === 'backlit';
    const paper = hand ? '#d8c9a0' : a.brand === 'yellow' ? '#edb516' : brand;
    const ink = hand ? brand : a.brand === 'yellow' ? '#16181a' : '#ffffff';
    s.box([W + 0.04, headH + 0.04, backlit ? 0.14 : 0.04], [0, H + 0.08 + headH / 2, D / 2 - 0.08], backlit ? dark : frame);
    const header = painted(W, headH, (ctx, w, h) => {
      ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
      if (hand) { ctx.strokeStyle = '#b9a67a'; ctx.lineWidth = 2; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(0, h * random()); ctx.bezierCurveTo(w * 0.3, h * random(), w * 0.6, h * random(), w, h * random()); ctx.stroke(); } }
      // Flame.
      const fx = h * 0.5, fy = h * 0.52, fr = h * 0.36;
      const flame = (r: number, colour: string) => { ctx.fillStyle = colour; ctx.beginPath(); ctx.moveTo(fx, fy - r * 1.25); ctx.bezierCurveTo(fx + r * 1.3, fy - r * 0.1, fx + r * 0.9, fy + r, fx, fy + r); ctx.bezierCurveTo(fx - r * 0.9, fy + r, fx - r * 1.1, fy + r * 0.1, fx - r * 0.35, fy - r * 0.35); ctx.bezierCurveTo(fx - r * 0.2, fy - r * 0.1, fx + r * 0.1, fy - r * 0.6, fx, fy - r * 1.25); ctx.fill(); };
      flame(fr, a.brand === 'black' ? '#d8b04a' : hand ? '#d2441c' : a.brand === 'yellow' ? '#d2201c' : '#ffffff');
      flame(fr * 0.5, a.brand === 'orange' || hand ? '#ffd23f' : a.brand === 'black' ? '#22262a' : a.brand === 'yellow' ? '#edb516' : '#ffb52e');
      const tx = (w + h) / 2;
      if (hand) { ctx.save(); ctx.translate(h * 0.9, 0); scrawl(ctx, lines, w - h, h, ink, random); ctx.restore(); }
      else { write(ctx, lines[0], tx, h * 0.33, h * 0.4, ink, { max: (w - h) * 0.94 }); write(ctx, lines[1], tx, h * 0.74, h * 0.3, a.brand === 'black' ? '#d8b04a' : ink, { max: (w - h) * 0.94 }); }
      ctx.fillStyle = `rgba(214,206,184,${wear * 0.45})`; ctx.fillRect(0, 0, w, h);
      grime(ctx, w, h, random, wear * 0.55);
    }, { px: 640, glow: backlit ? mix(0.35, 1, night) : 0, roughness: backlit ? 0.3 : 0.75 });
    header.position.set(0, H + 0.08 + headH / 2, D / 2 - 0.08 + (backlit ? 0.072 : 0.022)); header.rotation.z = hand ? (random() - 0.5) * 0.04 : 0; s.root.add(header);

    // Tanks: every slot, shuffled, then keep as many as the stock says.
    const slots: [number, number, number][] = [];
    for (let shelf = 0; shelf < shelves; shelf++) for (let i = 0; i < across; i++) for (let j = 0; j < 2; j++)
      slots.push([(i - (across - 1) / 2) * pitch, base + shelf * rise, (j - 0.5) * 0.34 - 0.01]);
    for (let i = slots.length - 1; i > 0; i--) { const k = Math.floor(random() * (i + 1)); [slots[i], slots[k]] = [slots[k], slots[i]]; }
    const keep = Math.round(slots.length * Math.min(1, a.stock * mix(0.9, 1.08, random())));
    const stray: { at: [number, number, number]; tip: boolean; rusty: boolean }[] = [];
    const bays = a.size === 'double' ? 2 : 1, doorW = (W - 0.06) / bays, doorH = H - base - 0.06;
    const swing = { locked: 0, open: 1.75, outside: 0.75, chained: 0 }[a.door] * mix(0.9, 1.1, random());
    if (a.door === 'outside') stray.push({ at: [W / 2 - doorW * 0.5 + (random() - 0.5) * 0.2, 0, D / 2 + 0.42 + random() * 0.15], tip: false, rusty: false });
    if (a.beside === 'empties') { const n = 3 + Math.floor(random() * 3); for (let i = 0; i < n; i++) stray.push({ at: [-W / 2 - 0.3 - (i % 2) * 0.36 - random() * 0.05, 0, -0.18 + Math.floor(i / 2) * 0.36 + random() * 0.05], tip: i === n - 1, rusty: true }); }

    const profile = [[0.1, 0], [0.106, 0], [0.106, 0.04], [0.1, 0.045], [0.15, 0.055], [0.152, 0.3], [0.14, 0.345], [0.105, 0.385], [0.055, 0.4], [0.105, 0.4], [0.108, 0.47], [0.1, 0.47]].map(([x, y]) => new THREE.Vector2(x, y));
    const total = keep + stray.length;
    const tanks = new THREE.InstancedMesh(new THREE.LatheGeometry(profile, 18), s.material('#ffffff', { roughness: 0.42 }), Math.max(total, 1));
    const sleeves = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1535, 0.1535, 0.15, 18, 1, true), s.material(brand, { roughness: 0.5 }), Math.max(total, 1));
    const valves = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.028, 0.07, 8), s.material('#c9a13a', { metalness: 0.8, roughness: 0.35 }), Math.max(total, 1));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    const put = (index: number, at: [number, number, number], tip: boolean, rusty: boolean) => {
      q.setFromEuler(new THREE.Euler(tip ? Math.PI / 2 : 0, random() * 6, tip ? random() * 2 : 0, 'YXZ'));
      const origin = new THREE.Vector3(at[0], at[1] + (tip ? 0.153 : 0), at[2]);
      tanks.setMatrixAt(index, m.compose(origin, q, one));
      sleeves.setMatrixAt(index, m.compose(v.set(0, 0.2, 0).applyQuaternion(q).add(origin), q, one));
      valves.setMatrixAt(index, m.compose(v.set(0, 0.43, 0).applyQuaternion(q).add(origin), q, one));
      const age = rusty ? 0.5 + random() * 0.5 : random() * wear;
      tanks.setColorAt(index, new THREE.Color('#f4f2ea').lerp(new THREE.Color(random() < 0.5 ? '#a8734a' : '#b9b3a2'), age * 0.7));
      sleeves.setColorAt(index, new THREE.Color('#ffffff').lerp(new THREE.Color('#bdb6a4'), rusty ? 0.7 : wear * 0.4));
      valves.setColorAt(index, new THREE.Color('#ffffff'));
    };
    for (let i = 0; i < keep; i++) put(i, [slots[i][0] + (random() - 0.5) * 0.015, slots[i][1], slots[i][2] + (random() - 0.5) * 0.015], false, false);
    stray.forEach((item, index) => put(keep + index, item.at, item.tip, item.rusty));
    for (const inst of [tanks, sleeves, valves]) {
      inst.count = total; inst.castShadow = inst.receiveShadow = true; inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      if (total) s.root.add(inst); else { inst.geometry.dispose(); }
    }

    // Doors.
    const swingers: THREE.Object3D[] = [];
    for (let bay = 0; bay < bays; bay++) {
      const side = bays === 1 ? 1 : bay === 0 ? -1 : 1;
      const hinge = new THREE.Group();
      hinge.position.set(side * (W / 2 - 0.03), base + 0.03 + doorH / 2, D / 2 + 0.005);
      const opens = bays === 1 || bay === 1;
      hinge.rotation.y = opens ? side * swing : 0;
      s.root.add(hinge);
      const cx = -side * doorW / 2;
      const bar = (size: [number, number, number], at: [number, number, number]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(...size), frame); b.position.set(...at); b.castShadow = true; hinge.add(b); };
      bar([doorW, 0.04, 0.03], [cx, doorH / 2 - 0.02, 0]); bar([doorW, 0.04, 0.03], [cx, -doorH / 2 + 0.02, 0]); bar([doorW, 0.03, 0.03], [cx, 0, 0]);
      bar([0.04, doorH, 0.03], [cx - doorW / 2 + 0.02, 0, 0]); bar([0.04, doorH, 0.03], [cx + doorW / 2 - 0.02, 0, 0]);
      const wire = mesh(doorW - 0.04, doorH - 0.04); wire.position.set(cx, 0, 0.004); hinge.add(wire);
      const placard = bay % 2 === 0 ? noSmoking(0.3) : danger(0.42, 0.22);
      placard.position.set(cx + (bays === 1 ? -0.12 : 0), doorH * 0.24, 0.02); hinge.add(placard);
      if (bays === 1) { const second = danger(0.4, 0.2); second.position.set(cx + 0.1, -doorH * 0.2, 0.02); hinge.add(second); }
      // Hasp on the free edge.
      const hx = -side * (doorW - 0.03);
      bar([0.1, 0.05, 0.02], [hx, 0.02, 0.022]);
      const lock = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.065, 0.032), s.material(a.door === 'chained' ? '#3a3d40' : '#c9a13a', { metalness: 0.8, roughness: 0.35 })); body.position.y = -0.055; body.castShadow = true;
      const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.007, 6, 14, Math.PI), steel); shackle.position.y = -0.022;
      lock.add(body, shackle);
      if (a.door === 'open' || a.door === 'outside') {
        if (opens) {
          lock.rotation.z = 0.25;
          const key = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.004), steel); key.position.set(0, -0.11, 0.01); lock.add(key);
          const fob = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.006), s.material('#d2201c')); fob.position.set(0.01, -0.17, 0.012); fob.rotation.z = 0.3; lock.add(fob);
          swingers.push(lock);
        }
      }
      lock.position.set(hx, 0.02, 0.045); hinge.add(lock);
      if (a.door === 'chained') {
        const chain = s.material('#4a4e52', { metalness: 0.8, roughness: 0.45 });
        const y0 = base + 0.03 + doorH / 2;
        const x0 = side * (W / 2 - 0.03) + hx;
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([x0 - 0.16 + t * 0.32, y0 + 0.14 - Math.sin(t * Math.PI) * 0.2 - t * 0.2, D / 2 + 0.05 + Math.sin(t * Math.PI) * 0.02]); }
        s.scatter(new THREE.TorusGeometry(0.022, 0.007, 5, 10), chain, pts.map((at) => ({ at, size: 1, color: '#ffffff' })));
        s.tube(pts, 0.008, chain);
      }
    }

    // Beside it.
    const bx = -W / 2 - 0.36;
    if (a.beside === 'jugs') {
      const rows = 2 + Math.floor(random() * 2);
      s.box([0.5, 0.06, 0.66], [bx, 0.03, 0], dark);
      const jug = new THREE.BoxGeometry(0.19, 0.3, 0.14), cap = new THREE.CylinderGeometry(0.022, 0.022, 0.04, 8);
      const body: { at: [number, number, number]; size: number; color: string }[] = [], caps: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let r = 0; r < rows; r++) for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) {
        if (r === rows - 1 && random() < 0.3) continue;
        const at: [number, number, number] = [bx - 0.11 + i * 0.22, 0.21 + r * 0.31, -0.24 + j * 0.16];
        body.push({ at, size: 1, color: random() < 0.85 ? '#2f8fe0' : '#e8762a' }); caps.push({ at: [at[0] - 0.04, at[1] + 0.17, at[2]], size: 1, color: '#ffffff' });
      }
      s.scatter(jug, s.material('#ffffff', { roughness: 0.3, emissive: '#16467a', emissiveIntensity: 0.25 }), body);
      s.scatter(cap, s.material('#f2f2ee'), caps);
    } else if (a.beside === 'firewood') {
      const bark = s.material('#6d4a2f', { roughness: 0.95 }), cut = s.material('#d9b784', { roughness: 0.9 }), band = s.material('#f1ede2', { roughness: 0.4, transparent: true, opacity: 0.85 });
      const stack = 3 + Math.floor(random() * 3);
      for (let b = 0; b < stack; b++) {
        const group = new THREE.Group();
        const row = Math.floor(b / 2);
        group.position.set(bx + 0.08 + (random() - 0.5) * 0.04, 0.15 + row * 0.28, (b % 2 ? 0.17 : -0.17) + (row % 2) * 0.08); group.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.25; s.root.add(group);
        for (let i = 0; i < 6; i++) {
          const t = (i / 6) * Math.PI * 2, r = i === 0 ? 0 : 0.085;
          const log = new THREE.Mesh(new THREE.CylinderGeometry(0.055 + random() * 0.012, 0.055, 0.42, 7), bark); log.rotation.x = Math.PI / 2; log.position.set(Math.cos(t) * r, Math.sin(t) * r, 0); log.castShadow = true; group.add(log);
          for (const z of [-1, 1]) { const end = new THREE.Mesh(new THREE.CircleGeometry(0.05, 7), cut); end.position.set(Math.cos(t) * r, Math.sin(t) * r, z * 0.212); end.rotation.y = z < 0 ? Math.PI : 0; group.add(end); }
        }
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.2, 12), band); wrap.rotation.x = Math.PI / 2; group.add(wrap);
      }
    } else if (a.beside === 'salt') {
      const n = 4 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) {
        const bag = s.ball([0.3, 0.07, 0.2], [bx + (random() - 0.5) * 0.06, 0.07 + i * 0.115, (random() - 0.5) * 0.08], s.material(i % 3 === 0 ? '#e9c53a' : '#f2efe6', { roughness: 0.6 }), 12);
        bag.rotation.y = (random() - 0.5) * 0.4; bag.rotation.z = (random() - 0.5) * 0.1;
        const stripe = s.box([0.3, 0.012, 0.12], [bag.position.x, bag.position.y + 0.062, bag.position.z], s.material('#1f5fb0')); stripe.rotation.y = bag.rotation.y;
      }
    }

    if (a.guard === 'bollards') for (const x of [-1, 1]) {
      s.cylinder(0.07, 0.07, 0.95, [x * (W / 2 - 0.1), 0.475, D / 2 + 0.75], yellow, 16);
      s.ball([0.07, 0.04, 0.07], [x * (W / 2 - 0.1), 0.95, D / 2 + 0.75], yellow, 14);
      s.cylinder(0.073, 0.073, 0.09, [x * (W / 2 - 0.1), 0.72, D / 2 + 0.75], dark, 16);
    } else if (a.guard === 'kerb') {
      const kerb = s.box([Math.min(W, 1.7), 0.13, 0.2], [0, 0.065, D / 2 + 0.8], s.material('#b3afa3', { roughness: 0.95 }));
      kerb.rotation.y = (random() - 0.5) * 0.12;
      s.box([Math.min(W, 1.7) * 0.5, 0.005, 0.16], [0, 0.133, D / 2 + 0.8], yellow).rotation.y = kerb.rotation.y;
    }

    const sway = mix(0.03, 0.22, mood.energy);
    return s.finish({ update: (_dt, time) => { for (const item of swingers) item.rotation.z = 0.25 + Math.sin(time * 2.3) * sway; } });
  },
});
