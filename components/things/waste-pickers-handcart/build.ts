import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

export default defineThing({
  questions: {
    cart: choice('How is the cart built?', {
      flatbed: 'A plank flatbed on two bicycle wheels with long pulling shafts.',
      carroca: 'A tall slatted box cart on old car wheels, brightly hand-painted, pulled by a T-bar.',
      trolley: 'A supermarket trolley loaded far above its rim, sacks hung off every side.',
      trike: 'A cargo tricycle with a flatbed behind the saddle.',
    }),
    haul: choice('What has been collected?', {
      bottles: 'Plastic bottles, clear, green and blue, bulging in net sacks.',
      cardboard: 'Flattened cardboard tied in tall leaning stacks.',
      cans: 'Crushed drink cans glinting through the weave.',
      wire: 'Copper wire and cable, coiled and stripped.',
      mixed: 'A bit of everything, each kind in its own sack.',
    }),
    sacks: choice('What are the big sacks like?', {
      white: 'White woven polypropylene, grubby and patched.',
      plaid: 'Red, blue and white checked market bags.',
      blue: 'Blue tarpaulin bundles tied at the neck.',
      jute: 'Brown jute coffee sacks with faded stencils.',
    }),
    treasure: choice('What is the one thing kept for themselves, riding on top?', {
      photo: 'A framed portrait photograph of someone else’s family.',
      robot: 'A tin toy robot.',
      radio: 'A portable radio with its aerial up.',
      mirror: 'A gilt-framed oval mirror, catching the sky.',
      geranium: 'A red geranium growing in an oil tin.',
      none: 'Nothing: everything here is for sale.',
    }),
    owner: choice('Where is the owner?', {
      moving: 'Hauling it along, leaning into the weight.',
      resting: 'Sitting beside it on an upturned crate, taking a break.',
      asleep: 'Asleep on the ground in its shade, hat over face.',
      gone: 'Gone for a moment: only a hat on the handle and sandals on the ground.',
    }),
    flourish: choice('What has the owner added to make it theirs?', {
      none: 'Nothing extra.',
      parasol: 'A faded striped parasol lashed to one corner.',
      pinwheels: 'Bright pinwheels that spin in the wind.',
      sign: 'A hand-lettered sign: CASH FOR SCRAP.',
      lantern: 'A hurricane lantern hanging from a pole.',
    }),
    dog: noul('Does a dog keep the cart company?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const grime = new THREE.Color('#6b5a45');
    const worn = (hex: string, amount = 0.35) => new THREE.Color(hex).lerp(grime, mood.wear * amount);
    const wood = s.material(worn('#9a7650'), { roughness: 0.9 });
    const steel = s.material(worn('#8f9496', 0.5), { metalness: 0.6, roughness: 0.45 });
    const dark = s.material('#242527', { roughness: 0.85 });
    const rope = s.material('#c9b27c', { roughness: 1 });
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // Wheels.
    const wheels: THREE.Object3D[] = [];
    const bikeWheel = (x: number, y: number, z: number, r: number) => {
      const wheel = new THREE.Group();
      const tyre = s.ring(r, 0.025, [0, 0, 0], dark);
      tyre.rotation.y = Math.PI / 2;
      wheel.add(tyre);
      for (let i = 0; i < 6; i++) { const spoke = s.rod([0, -r, 0], [0, r, 0], 0.005, steel); spoke.rotation.x = i * Math.PI / 6; wheel.add(spoke); }
      const hub = s.cylinder(0.035, 0.035, 0.08, [0, 0, 0], steel, 8);
      hub.rotation.z = Math.PI / 2;
      wheel.add(hub);
      wheel.position.set(x, y, z);
      wheel.rotation.x = random() * 3;
      s.root.add(wheel);
      wheels.push(wheel);
    };
    const carWheel = (x: number, z: number) => {
      const wheel = new THREE.Group();
      const tyre = s.cylinder(0.28, 0.28, 0.17, [0, 0, 0], dark, 18), hub = s.cylinder(0.15, 0.15, 0.19, [0, 0, 0], steel, 10), nut = s.box([0.2, 0.05, 0.05], [0, 0, 0], dark);
      tyre.rotation.z = hub.rotation.z = Math.PI / 2;
      wheel.add(tyre, hub, nut);
      wheel.position.set(x, 0.28, z);
      s.root.add(wheel);
      wheels.push(wheel);
    };

    // The cart: each build leaves a deck to load and a handle to hold.
    let deckY = 0.62, deckW = 1.0, deckL = 1.6, deckZ = 0, handle: [number, number, number] = [0, 0.95, 1.9], wall = 0;
    if (a.cart === 'flatbed') {
      s.box([deckW, 0.05, deckL], [0, deckY - 0.025, 0], wood);
      for (let i = 0; i < 5; i++) s.box([0.005, 0.052, deckL], [-0.4 + i * 0.2, deckY - 0.024, 0], dark);
      for (const e of [-1, 1]) {
        bikeWheel(e * (deckW / 2 + 0.07), 0.34, -0.1, 0.34);
        s.rod([e * 0.42, deckY - 0.06, -deckL / 2], [e * 0.36, 0.98, 1.95], 0.028, wood);
        s.rod([e * 0.45, deckY, -0.7], [e * 0.47, deckY + 0.7, -0.75], 0.022, wood);
        s.rod([e * 0.45, deckY, 0.7], [e * 0.47, deckY + 0.55, 0.75], 0.022, wood);
      }
      s.rod([-0.36, 0.98, 1.9], [0.36, 0.98, 1.9], 0.025, wood);
      s.rod([0, deckY - 0.05, 0.75], [0, 0, 0.85], 0.025, wood);
      s.cylinder(0.02, 0.02, deckW + 0.2, [0, 0.34, -0.1], steel, 8).rotation.z = Math.PI / 2;
    } else if (a.cart === 'carroca') {
      deckY = 0.5; deckW = 1.15; deckL = 1.7; wall = 0.8; handle = [0, 0.9, 1.75];
      const paints = ['#d8452e', '#2f7fbf', '#e8b820', '#3a9a5c'].map((hex) => s.material(worn(hex, 0.5), { roughness: 0.8 }));
      s.box([deckW, 0.06, deckL], [0, deckY - 0.03, 0], wood);
      for (const e of [-1, 1]) {
        carWheel(e * (deckW / 2 + 0.11), -0.05);
        for (let i = 0; i < 4; i++) s.box([0.05, wall, 0.06], [e * (deckW / 2 - 0.025), deckY + wall / 2, -deckL / 2 + 0.05 + i * (deckL - 0.1) / 3], wood);
        for (let i = 0; i < 3; i++) s.box([0.03, 0.16, deckL], [e * (deckW / 2 + 0.01), deckY + 0.14 + i * 0.27, 0], paints[(i + (e > 0 ? 1 : 0)) % 4]);
        s.rod([e * 0.3, deckY - 0.05, deckL / 2], [0, 0.85, 1.55], 0.025, steel);
      }
      for (let i = 0; i < 3; i++) s.box([deckW, 0.16, 0.03], [0, deckY + 0.14 + i * 0.27, -deckL / 2], paints[(i + 2) % 4]);
      s.rod([0, 0.85, 1.55], [0, 0.9, 1.75], 0.025, steel);
      s.rod([-0.3, 0.9, 1.75], [0.3, 0.9, 1.75], 0.025, steel);
      s.rod([0, deckY - 0.05, 0.75], [0, 0, 0.8], 0.025, steel);
      s.cylinder(0.025, 0.025, deckW + 0.3, [0, 0.28, -0.05], steel, 8).rotation.z = Math.PI / 2;
    } else if (a.cart === 'trolley') {
      deckY = 0.42; deckW = 0.62; deckL = 0.95; wall = 0.55; handle = [0, 1.02, -0.62];
      const wire = s.material('#b9bec0', { metalness: 0.8, roughness: 0.3 });
      s.box([deckW, 0.02, deckL], [0, deckY, 0], wire);
      for (const y of [deckY, deckY + wall]) for (const e of [-1, 1]) { s.rod([e * deckW / 2, y, -deckL / 2], [e * deckW / 2 * (y > deckY ? 1.08 : 1), y, deckL / 2], 0.012, wire); s.rod([-deckW / 2, y, e * deckL / 2], [deckW / 2, y, e * deckL / 2], 0.012, wire); }
      for (let i = 0; i <= 6; i++) for (const e of [-1, 1]) s.rod([e * deckW / 2, deckY, -deckL / 2 + i * deckL / 6], [e * deckW / 2 * 1.06, deckY + wall, -deckL / 2 + i * deckL / 6], 0.006, wire);
      for (let i = 0; i <= 4; i++) for (const e of [-1, 1]) s.rod([-deckW / 2 + i * deckW / 4, deckY, e * deckL / 2], [-deckW / 2 + i * deckW / 4, deckY + wall, e * deckL / 2], 0.006, wire);
      for (const e of [-1, 1]) for (const z of [-0.4, 0.4]) {
        s.rod([e * 0.26, deckY, z], [e * 0.28, 0.12, z], 0.014, wire);
        const castor = s.cylinder(0.06, 0.06, 0.035, [e * 0.28, 0.06, z], dark, 10);
        castor.rotation.z = Math.PI / 2;
        s.rod([e * deckW / 2, deckY + wall, -deckL / 2], [e * 0.3, 1.02, -0.62], 0.014, wire);
      }
      s.rod([-0.3, 1.02, -0.62], [0.3, 1.02, -0.62], 0.02, s.material('#c8322a'));
      s.box([deckW - 0.05, 0.02, deckL - 0.1], [0, 0.2, 0], wire);
    } else {
      deckY = 0.6; deckW = 1.0; deckL = 1.35; deckZ = -0.75; handle = [0, 1.05, 1.0];
      const frame = s.material(worn(pick(['#2f6fae', '#b8322a', '#2f8a5a']), 0.5), { metalness: 0.3 });
      s.box([deckW, 0.05, deckL], [0, deckY - 0.025, deckZ], wood);
      for (const e of [-1, 1]) { bikeWheel(e * (deckW / 2 + 0.06), 0.33, deckZ - 0.1, 0.33); s.box([0.03, 0.22, deckL], [e * deckW / 2, deckY + 0.11, deckZ], frame); }
      s.box([deckW, 0.22, 0.03], [0, deckY + 0.11, deckZ - deckL / 2], frame);
      bikeWheel(0, 0.33, 1.25, 0.33);
      s.rod([0, 0.33, deckZ + 0.2], [0, 0.55, 0.9], 0.025, frame);
      s.rod([0, 0.33, 1.25], [0, 1.05, 0.95], 0.022, frame);
      s.rod([-0.28, 1.05, 1.0], [0.28, 1.05, 1.0], 0.018, steel);
      s.rod([0, 0.5, 0.2], [0, 0.9, 0.12], 0.022, frame);
      s.ball([0.11, 0.04, 0.15], [0, 0.93, 0.12], dark, 10);
      s.rod([-0.14, 0.3, 0.45], [0.14, 0.3, 0.45], 0.012, steel);
      s.cylinder(0.02, 0.02, deckW + 0.2, [0, 0.33, deckZ - 0.1], steel, 8).rotation.z = Math.PI / 2;
    }

    // Sack cloth, painted.
    const cloth = (style: typeof a.sacks, speck: readonly string[] | null) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = { white: '#e9e6d8', plaid: '#f1eee4', blue: '#3f77b8', jute: '#a8875a' }[style];
      ctx.fillRect(0, 0, 128, 128);
      if (style === 'plaid') for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(200,40,40,0.75)' : 'rgba(40,70,170,0.75)';
        ctx.fillRect(i * 32 + 4, 0, 12, 128); ctx.fillRect(0, i * 32 + 4, 128, 12);
      }
      if (style === 'white') { ctx.fillStyle = 'rgba(60,110,190,0.6)'; ctx.fillRect(0, 20, 128, 5); ctx.fillRect(0, 30, 128, 2); ctx.fillStyle = 'rgba(200,60,50,0.5)'; ctx.fillRect(0, 100, 128, 4); }
      if (style === 'jute') { ctx.fillStyle = 'rgba(60,40,20,0.5)'; ctx.font = 'bold 22px monospace'; ctx.fillText('CAFE 60KG', 4, 70); }
      for (let i = 0; i < 128; i += 4) { ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(i, 0, 1, 128); ctx.fillRect(0, i, 128, 1); }
      if (speck) for (let i = 0; i < 150; i++) { ctx.fillStyle = pick(speck); ctx.globalAlpha = 0.75; ctx.fillRect(random() * 128, random() * 128, 5 + random() * 5, 3 + random() * 4); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(90,70,45,${mood.wear * 0.3})`; ctx.fillRect(0, 0, 128, 128);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(3, 2);
      return new THREE.MeshStandardMaterial({ map, roughness: 0.9 });
    };
    const SPECK = { bottles: ['#bfe3d0', '#4fa86a', '#6ab0e0', '#f2f6f4'], cans: ['#c9cdd0', '#d0342c', '#e8e8ea', '#2f6fd0'], wire: ['#c8742e', '#8a4a20', '#2a2a2a'], cardboard: null } as const;
    const lump = new THREE.IcosahedronGeometry(1, 2);
    { const p = lump.getAttribute('position'), v = new THREE.Vector3(), seen = new Map<string, number>();
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`; let k = seen.get(key); if (k === undefined) { k = 0.88 + random() * 0.22; seen.set(key, k); } p.setXYZ(i, v.x * k, v.y * k, v.z * k); }
      lump.computeVertexNormals(); }
    const kinds = a.haul === 'mixed' ? (['bottles', 'cans', 'cardboard', 'wire'] as const) : ([a.haul] as const);
    const cloths = Object.fromEntries(kinds.map((kind) => [kind, cloth(a.sacks, SPECK[kind])])) as Record<string, THREE.MeshStandardMaterial>;
    const neck = s.material({ white: '#d8d4c4', plaid: '#d8d4c4', blue: '#356aa6', jute: '#93744a' }[a.sacks]);
    const copper = s.material('#c8742e', { metalness: 0.75, roughness: 0.35 });
    const card = s.material(worn('#b98d5a', 0.2), { roughness: 1 });
    const sack = (x: number, y: number, z: number, r: number, kind: string) => {
      const mesh = s.mesh(lump, cloths[kind] ?? cloths[kinds[0]], [x, y + r * 0.8, z]);
      mesh.scale.set(r * mix(0.95, 1.15, random()), r * 0.82, r * mix(0.95, 1.1, random()));
      mesh.rotation.y = random() * 6;
      s.cylinder(r * 0.1, r * 0.16, r * 0.22, [x + (random() - 0.5) * 0.1, y + r * 1.62, z], neck, 8).rotation.z = (random() - 0.5) * 0.6;
      return y + r * 1.6;
    };
    const stack = (x: number, y: number, z: number, w: number, d: number, h: number) => {
      const n = Math.max(3, Math.round(h / 0.07));
      for (let i = 0; i < n; i++) s.box([w * mix(0.85, 1, random()), 0.06, d * mix(0.85, 1, random())], [x + (random() - 0.5) * 0.05 + i * 0.006, y + 0.035 + i * (h / n), z + (random() - 0.5) * 0.05], card).rotation.y = (random() - 0.5) * 0.14;
      s.box([0.02, h + 0.02, d + 0.03], [x, y + h / 2, z], rope);
      s.box([w + 0.03, h + 0.02, 0.02], [x, y + h / 2, z], rope);
      return y + h;
    };
    const coils = (x: number, y: number, z: number, n: number) => {
      for (let i = 0; i < n; i++) s.ring(0.2 + random() * 0.08, 0.035 + random() * 0.02, [x + (random() - 0.5) * 0.1, y + 0.05 + i * 0.085, z + (random() - 0.5) * 0.1], i % 3 === 2 ? dark : copper).rotation.set(Math.PI / 2 + (random() - 0.5) * 0.25, 0, 0);
      return y + n * 0.085 + 0.05;
    };

    // Load the deck in layers until the day's haul is on.
    const full = mix(0.45, 1, mood.density);
    const base = deckY + (a.cart === 'trolley' ? 0.02 : 0);
    let top = base;
    const half = deckL / 2 - 0.3;
    const r0 = Math.min(deckW * 0.52, 0.55) * (a.cart === 'trolley' ? 1.05 : 1);
    if (a.haul === 'cardboard') {
      const h1 = mix(0.6, 1.5, full);
      top = Math.max(stack(0, base, deckZ - half * 0.5, deckW * 0.9, deckL * 0.45, h1), stack(0, base, deckZ + half * 0.75, deckW * 0.85, deckL * 0.42, h1 * mix(0.6, 0.95, random())));
      for (let i = 0; i < 3; i++) { const sheet = s.box([deckW * 0.8, mix(0.8, 1.2, random()), 0.03], [(random() - 0.5) * 0.1, base + 0.55, deckZ + 0.1 + i * 0.045], card); sheet.rotation.x = 0.12; }
      top = sack(0.05, top - 0.05, deckZ - half * 0.4, r0 * 0.75, 'cardboard');
    } else {
      const layers = Math.max(1, Math.round(full * (a.cart === 'trolley' ? 2 : 3)));
      for (let layer = 0; layer < layers; layer++) {
        const kind = kinds[layer % kinds.length], shrink = 1 - layer * 0.12;
        if (kind === 'cardboard') { top = stack(0, top - (layer ? 0.15 : 0), deckZ, deckW * 0.85, deckL * 0.6, 0.4); continue; }
        const y = top - (layer ? r0 * 0.5 : 0);
        if (layer === layers - 1 && layers > 1) top = sack((random() - 0.5) * 0.1, y, deckZ + (random() - 0.5) * 0.15, r0 * shrink, kind);
        else top = Math.max(sack((random() - 0.5) * 0.08, y, deckZ - half * 0.75, r0 * shrink, kind), sack((random() - 0.5) * 0.08, y, deckZ + half * 0.75, r0 * shrink * mix(0.85, 1, random()), kinds[(layer + 1) % kinds.length] === 'cardboard' ? kind : kinds[(layer + 1) % kinds.length]));
      }
    }
    // Side loads: what would not fit in a sack.
    const side = deckW / 2 + 0.22;
    if (a.haul === 'wire' || a.haul === 'mixed') { if (a.owner === 'moving') for (let i = 0; i < 3; i++) s.ring(0.2, 0.03, [deckW / 2 + 0.06, deckY + 0.35 + wall * 0.5, deckZ - 0.3 + i * 0.3], i === 1 ? dark : copper).rotation.y = Math.PI / 2; else coils(side + 0.12, 0, deckZ - 0.45, 4); for (let i = 0; i < 3; i++) s.ring(0.2, 0.03, [-(deckW / 2 + 0.06), deckY + 0.35 + wall * 0.5, deckZ - 0.3 + i * 0.3], i === 1 ? dark : copper).rotation.y = Math.PI / 2; }
    if (a.haul === 'bottles' || a.haul === 'mixed' || a.haul === 'cans') {
      const net = s.ball([0.28, 0.42, 0.3], [-(deckW / 2 + 0.2), deckY + 0.2 + wall * 0.4, deckZ + 0.25], new THREE.MeshStandardMaterial({ color: '#dfe9e6', roughness: 0.6, transparent: true, opacity: 0.45, depthWrite: false }), 10);
      net.castShadow = false;
      const bottle = a.haul === 'cans' ? ['#c9cdd0', '#d0342c', '#2f6fd0'] : ['#bfe3d0', '#4fa86a', '#6ab0e0', '#e9f2ee'];
      s.scatter(new THREE.CylinderGeometry(0.4, 0.4, a.haul === 'cans' ? 1.2 : 2.4, 7), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: a.haul === 'cans' ? 0.7 : 0.1 }), Array.from({ length: 34 }, () => {
        const t = random() * 6.28, u = random() * 2 - 1, r = Math.sqrt(1 - u * u) * random() ** 0.4;
        return { at: [-(deckW / 2 + 0.2) + Math.cos(t) * r * 0.2, deckY + 0.2 + wall * 0.4 + u * 0.33, deckZ + 0.25 + Math.sin(t) * r * 0.22] as const, size: 0.09 + random() * 0.03, color: pick(bottle) };
      }));
      s.rod([-(deckW / 2 + 0.2), deckY + 0.6 + wall * 0.4, deckZ + 0.25], [-(deckW / 2 - 0.1), top - 0.2, deckZ + 0.1], 0.01, rope);
    }
    for (const z of [-half * 0.6, half * 0.6]) {
      const rise = top - deckY;
      s.tube([[-deckW / 2, deckY, deckZ + z], [-deckW * 0.42, deckY + rise * 0.75, deckZ + z], [0, top + 0.03, deckZ + z], [deckW * 0.42, deckY + rise * 0.75, deckZ + z], [deckW / 2, deckY, deckZ + z]], 0.012, rope);
    }

    // The treasure.
    const prize = new Sculpture(context);
    let dial: THREE.MeshStandardMaterial | null = null;
    if (a.treasure === 'photo' || a.treasure === 'mirror') {
      const gilt = prize.material('#c9a23c', { metalness: 0.7, roughness: 0.35 });
      if (a.treasure === 'photo') {
        prize.box([0.36, 0.44, 0.03], [0, 0.22, 0], gilt);
        const canvas = document.createElement('canvas');
        canvas.width = 96; canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#d9c7a2'; ctx.fillRect(0, 0, 96, 128);
        ctx.fillStyle = '#6e563c';
        for (const [x, y, r] of [[34, 52, 15], [64, 46, 16], [49, 78, 10]] as const) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.ellipse(x, y + r * 2.6, r * 1.5, r * 1.9, 0, 0, 6.3); ctx.fill(); }
        const map = new THREE.CanvasTexture(canvas);
        map.colorSpace = THREE.SRGBColorSpace;
        prize.mesh(new THREE.PlaneGeometry(0.28, 0.36), new THREE.MeshStandardMaterial({ map, roughness: 0.5 }), [0, 0.22, 0.017]);
      } else {
        const rim = prize.cylinder(0.24, 0.24, 0.03, [0, 0.3, 0], gilt, 24);
        rim.rotation.x = Math.PI / 2; rim.scale.set(0.8, 1, 1.25);
        const face = prize.cylinder(0.2, 0.2, 0.034, [0, 0.3, 0], new THREE.MeshStandardMaterial({ color: '#cfe6f2', metalness: 1, roughness: 0.04, emissive: '#9cc6e0', emissiveIntensity: 0.25 }), 24);
        face.rotation.x = Math.PI / 2; face.scale.set(0.8, 1, 1.25);
        prize.ball([0.06, 0.05, 0.02], [0, 0.6, 0], gilt, 8);
      }
      prize.root.rotation.x = -0.3;
    } else if (a.treasure === 'robot') {
      const tin = prize.material('#3f86c2', { metalness: 0.5, roughness: 0.35 }), trim = prize.material('#d8352c', { metalness: 0.4, roughness: 0.4 });
      prize.box([0.2, 0.22, 0.13], [0, 0.26, 0], tin);
      prize.box([0.15, 0.13, 0.12], [0, 0.45, 0], tin);
      for (const e of [-1, 1]) { prize.box([0.06, 0.15, 0.08], [e * 0.055, 0.075, 0], trim); prize.box([0.045, 0.19, 0.06], [e * 0.13, 0.27, 0.02], trim).rotation.x = e * 0.5; prize.ball([0.022, 0.022, 0.012], [e * 0.035, 0.47, 0.062], prize.material('#ffe26a', { emissive: '#ffd000', emissiveIntensity: 1 }), 8); }
      prize.rod([0, 0.51, 0], [0, 0.6, 0], 0.006, trim);
      prize.ball([0.018, 0.018, 0.018], [0, 0.61, 0], trim, 8);
      prize.box([0.1, 0.05, 0.005], [0, 0.26, 0.068], prize.material('#f2e9c8'));
    } else if (a.treasure === 'radio') {
      prize.box([0.42, 0.25, 0.12], [0, 0.125, 0], prize.material('#b0623a', { roughness: 0.6 }));
      prize.cylinder(0.09, 0.09, 0.01, [-0.09, 0.125, 0.062], prize.material('#2a2623'), 16).rotation.x = Math.PI / 2;
      dial = prize.material('#f2d98a', { emissive: '#ffcf5a', emissiveIntensity: mix(0.2, 1.4, mood.cheer) });
      prize.box([0.14, 0.06, 0.01], [0.11, 0.17, 0.062], dial);
      for (const x of [0.07, 0.15]) prize.cylinder(0.022, 0.022, 0.02, [x, 0.07, 0.066], prize.material('#d8d2c0'), 10).rotation.x = Math.PI / 2;
      prize.ring(0.13, 0.01, [0, 0.25, 0], prize.material('#3a3632'), Math.PI);
      prize.rod([0.18, 0.25, -0.03], [0.34, 0.75, -0.08], 0.006, prize.material('#d6dadc', { metalness: 0.9, roughness: 0.2 }));
    } else if (a.treasure === 'geranium') {
      prize.cylinder(0.11, 0.11, 0.2, [0, 0.1, 0], prize.material(worn('#3f8a5a', 0.6), { metalness: 0.5 }), 12);
      prize.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), Array.from({ length: 26 }, (_u, i) => ({ at: [(random() - 0.5) * 0.3, 0.24 + random() * 0.26, (random() - 0.5) * 0.3] as const, size: 0.035 + random() * 0.03, color: i % 3 === 0 ? '#d92a34' : '#4f8f3c' })));
    } else prize.ring(0.14, 0.03, [0, 0.03, 0], rope).rotation.x = Math.PI / 2;
    prize.root.scale.setScalar(a.treasure === 'none' ? 1 : 1.35);
    prize.root.position.set(0, top - 0.03, deckZ + 0.05);
    prize.root.rotation.y = (random() - 0.5) * 0.5;
    s.root.add(prize.root);

    // Flourish.
    const spinners: THREE.Object3D[] = [];
    let flame: THREE.MeshStandardMaterial | null = null;
    const corner: [number, number, number] = [deckW / 2 - 0.03, deckY, deckZ - deckL / 2 + 0.05];
    if (a.flourish === 'parasol') {
      const h = top + 0.75;
      s.rod(corner, [corner[0] - 0.25, h, corner[2] + 0.4], 0.016, steel);
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 8;
      const ctx = canvas.getContext('2d')!;
      const pair = pick([['#d8452e', '#f1ead6'], ['#2f7fbf', '#f1ead6'], ['#e8b820', '#3a9a5c']] as const);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = pair[i % 2]; ctx.fillRect(i * 16, 0, 16, 8); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const canopy = s.mesh(new THREE.ConeGeometry(0.85, 0.32, 16, 1, true), new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide, color: worn('#ffffff', 0.5) }), [corner[0] - 0.25, h - 0.1, corner[2] + 0.4]);
      canopy.rotation.set(0.12, 0, -0.12);
    }
    if (a.flourish === 'pinwheels') for (let i = 0; i < 3; i++) {
      const at: [number, number, number] = [(i - 1) * deckW * 0.48, top + 0.25 + (i % 2) * 0.2, deckZ - deckL / 2 + 0.1 + i * 0.2];
      s.rod([at[0], deckY + 0.2, at[2]], at, 0.007, wood);
      const wheel = new THREE.Group();
      const hues = ['#e23a6a', '#f2c41f', '#3fa0d8', '#52b85a'];
      for (let k = 0; k < 4; k++) { const vane = s.mesh(new THREE.ConeGeometry(0.06, 0.16, 3), s.material(hues[(k + i) % 4], { side: THREE.DoubleSide, roughness: 0.5 }), [Math.cos(k * 1.57) * 0.08, Math.sin(k * 1.57) * 0.08, 0]); vane.rotation.z = k * 1.57 - 1.57; vane.scale.z = 0.25; wheel.add(vane); }
      wheel.position.set(at[0], at[1], at[2] + 0.03);
      s.root.add(wheel);
      spinners.push(wheel);
    }
    if (a.flourish === 'sign') {
      const board = s.label('CASH FOR SCRAP', 1.0, 0.3, [deckW / 2 + 0.05 + (a.cart === 'carroca' ? 0.03 : 0), deckY + 0.28, deckZ], '#22201c', '#e9dfbf');
      board.rotation.set(0, Math.PI / 2, (random() - 0.5) * 0.12);
    }
    if (a.flourish === 'lantern') {
      const h = top + 0.5;
      s.rod(corner, [corner[0] + 0.1, h, corner[2]], 0.014, wood);
      s.rod([corner[0] + 0.1, h, corner[2]], [corner[0] + 0.1, h, corner[2] + 0.3], 0.01, wood);
      flame = s.material('#ffd98a', { emissive: '#ffb84a', emissiveIntensity: mix(0.5, 2.6, 1 - Math.sin(mood.daylight * Math.PI)) });
      s.cylinder(0.05, 0.06, 0.13, [corner[0] + 0.1, h - 0.2, corner[2] + 0.3], flame, 10);
      for (const y of [-0.12, -0.28]) s.cylinder(0.065, 0.065, 0.03, [corner[0] + 0.1, h + y, corner[2] + 0.3], steel, 10);
      s.ring(0.05, 0.005, [corner[0] + 0.1, h - 0.06, corner[2] + 0.3], steel);
    }

    // The owner, or what stands in for them.
    const skin = s.material(pick(['#8a5a3a', '#b07a4e', '#6a4630', '#c99668']));
    const shirt = s.material(worn(pick(['#c9483a', '#3f6f9f', '#e9e2cf', '#4a8a5c', '#d8a42a']), 0.5), { roughness: 0.95 });
    const trousers = s.material(worn('#3a3f4a', 0.4), { roughness: 0.95 });
    const straw = s.material('#d8bd7a', { roughness: 1 });
    const hat = (rig: Sculpture, at: [number, number, number]) => { const brim = rig.mesh(new THREE.ConeGeometry(0.27, 0.13, 14), straw, at); return brim; };
    const person = (pose: 'lean' | 'push' | 'sit' | 'lie') => {
      const p = new Sculpture(context);
      if (pose === 'lean' || pose === 'push') {
        const f = pose === 'lean' ? 1 : 1;
        p.rod([-0.1, 0.85, 0], [-0.12, 0.04, 0.32 * f], 0.07, trousers);
        p.rod([0.1, 0.85, 0], [0.12, 0.04, -0.38 * f], 0.07, trousers);
        const torso = p.box([0.4, 0.6, 0.24], [0, 1.12, 0.12], shirt);
        torso.rotation.x = 0.4;
        p.ball([0.11, 0.125, 0.115], [0, 1.52, 0.3], skin, 12);
        hat(p, [0, 1.66, 0.3]).rotation.x = 0.3;
        for (const e of [-1, 1]) p.rod([e * 0.24, 1.33, 0.22], pose === 'lean' ? [e * 0.34, 0.98, -0.2] : [e * 0.28, 1.04, 0.6], 0.045, skin);
      } else if (pose === 'sit') {
        for (const e of [-1, 1]) { p.rod([e * 0.1, 0.42, 0], [e * 0.13, 0.46, 0.4], 0.07, trousers); p.rod([e * 0.13, 0.46, 0.4], [e * 0.13, 0.03, 0.44], 0.06, trousers); p.rod([e * 0.23, 0.92, 0.1], [e * 0.15, 0.5, 0.36], 0.045, skin); }
        p.box([0.4, 0.56, 0.24], [0, 0.72, 0.03], shirt).rotation.x = 0.28;
        p.ball([0.11, 0.125, 0.115], [0, 1.12, 0.17], skin, 12);
        hat(p, [0, 1.26, 0.17]).rotation.x = 0.2;
      } else {
        p.box([0.4, 0.22, 0.6], [0, 0.12, 0], shirt);
        p.rod([-0.1, 0.1, 0.3], [-0.12, 0.07, 1.1], 0.07, trousers);
        p.rod([0.1, 0.1, 0.3], [0.14, 0.42, 0.7], 0.07, trousers);
        p.rod([0.14, 0.42, 0.7], [0.14, 0.05, 1.0], 0.06, trousers);
        p.ball([0.11, 0.115, 0.125], [0, 0.13, -0.42], skin, 12);
        hat(p, [0, 0.25, -0.4]).rotation.x = -0.5;
        p.rod([0.22, 0.2, -0.2], [-0.05, 0.26, 0.05], 0.045, skin);
        p.rod([-0.24, 0.12, -0.2], [-0.4, 0.05, 0.25], 0.045, skin);
      }
      s.root.add(p.root);
      return p.root;
    };
    if (a.owner === 'moving') {
      if (a.cart === 'trolley') person('push').position.set(0, 0, handle[2] - 0.62);
      else if (a.cart === 'trike') person('sit').position.set(0, 0.5, 0.05);
      else person('lean').position.set(0, 0, handle[2] - 0.25);
    } else if (a.owner === 'resting') {
      const sx = deckW / 2 + 0.75;
      s.box([0.42, 0.34, 0.34], [sx, 0.17, 0.35], s.material(worn(pick(['#c8322a', '#2f6fae', '#e8b820']), 0.4), { roughness: 0.6 }));
      const body = person('sit');
      body.position.set(sx, -0.06, 0.35);
      body.rotation.y = 0.7;
      s.cylinder(0.035, 0.028, 0.08, [sx + 0.3, 0.04, 0.75], s.material('#f1eee4'), 10);
    } else if (a.owner === 'asleep') {
      const body = person('lie');
      body.position.set(deckW / 2 + 0.55, 0, deckZ - 0.1);
      body.rotation.y = 0.12;
      s.box([0.75, 0.02, 1.7], [deckW / 2 + 0.55, 0.01, deckZ + 0.2], card);
    } else {
      const hx = handle[0] + (a.cart === 'trike' ? 0.26 : 0.3), brim = hat(s, [hx, handle[1] + 0.08, handle[2]]);
      brim.rotation.z = -0.5;
      for (const e of [-1, 1]) s.box([0.09, 0.02, 0.24], [deckW / 2 + 0.4 + e * 0.07, 0.01, 0.9 + e * 0.04], s.material('#2f6fae')).rotation.y = e * 0.15;
    }

    // The dog.
    let tail: THREE.Object3D | null = null;
    if (a.dog) {
      const d = new Sculpture(context);
      const coat = d.material(pick(['#b98a52', '#3a3430', '#d9c9a8', '#7a5a3c']), { roughness: 1 });
      const lying = a.owner === 'asleep' || a.owner === 'gone';
      if (lying) {
        d.ball([0.3, 0.13, 0.17], [0, 0.12, 0], coat, 12);
        d.ball([0.1, 0.09, 0.1], [0.3, 0.1, 0.06], coat, 10);
        d.ball([0.07, 0.045, 0.05], [0.4, 0.08, 0.08], coat, 8);
        for (const e of [-1, 1]) { d.ball([0.03, 0.06, 0.04], [0.27, 0.17, 0.06 + e * 0.07], coat, 6); d.rod([0.2, 0.05, e * 0.1], [0.42, 0.03, e * 0.13 + 0.05], 0.03, coat); }
        tail = d.rod([-0.28, 0.1, 0], [-0.4, 0.05, 0.16], 0.025, coat, 0.012);
      } else {
        d.ball([0.27, 0.13, 0.12], [0, 0.42, 0], coat, 12);
        d.ball([0.1, 0.1, 0.09], [0.3, 0.56, 0], coat, 10);
        d.ball([0.08, 0.05, 0.05], [0.41, 0.53, 0], coat, 8);
        for (const e of [-1, 1]) { d.ball([0.03, 0.06, 0.035], [0.27, 0.66, e * 0.07], coat, 6); for (const x of [-0.19, 0.19]) d.rod([x, 0.36, e * 0.08], [x + 0.02, 0.02, e * 0.08], 0.03, coat, 0.022); }
        tail = d.rod([-0.26, 0.46, 0], [-0.4, 0.66, 0], 0.025, coat, 0.012);
      }
      d.root.position.set(lying ? -(deckW / 2 + 0.6) : -(deckW / 2 + 0.55), 0, lying ? deckZ + 0.3 : 0.9);
      d.root.rotation.y = lying ? -1.2 : -Math.PI / 2 + 0.2;
      s.root.add(d.root);
    }

    const roll = a.owner === 'moving' ? mix(0.6, 3, mood.energy) : 0, wind = mix(1, 14, mood.energy);
    return s.finish({
      update: (dt, time) => {
        for (const wheel of wheels) wheel.rotation.x += dt * roll;
        for (const [i, spinner] of spinners.entries()) spinner.rotation.z += dt * wind * (1 + i * 0.2);
        if (tail) tail.rotation.y = Math.sin(time * mix(1, 9, mood.cheer)) * 0.25;
        if (flame) flame.emissiveIntensity *= 1 + Math.sin(time * 13) * 0.004;
        if (dial) dial.emissiveIntensity = mix(0.2, 1.4, mood.cheer) * (1 + Math.sin(time * 5) * 0.15);
      },
    });
  },
});
