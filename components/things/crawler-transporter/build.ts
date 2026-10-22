import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { Batch, sign } from './batch';

export default defineThing({
  questions: {
    load: choice('What is it carrying?', {
      empty: 'Nothing: a bare steel deck with four pickup pedestals.',
      platform: 'A mobile launch platform: a thick grey slab with square flame holes.',
      rocket: 'A launch platform with a white rocket and its umbilical tower standing on it.',
      tarped: 'Something lumpy lashed under tarpaulins.',
      stripped: 'Nothing, and the deck plates are gone too: open ribs, salvaged for scrap.',
    }),
    doing: choice('What is it doing right now?', {
      crawling: 'Creeping forward at walking pace, dust rising from the treads, beacons turning.',
      parked: 'Parked level and shut down.',
      jacked: 'Jacked high on its cylinders, lifting or lowering its load.',
      'thrown-track': 'Stopped dead with one tread belt broken and unspooled on the gravel.',
    }),
    livery: choice('What colour is it painted?', {
      agency: 'Pale grey with yellow handrails and black treads: a government space agency.',
      olive: 'Flat olive drab with white stencils, military and anonymous.',
      primer: 'Red-oxide primer, never given its top coat.',
      company: 'Gloss white with a blue stripe: a private launch company bought it.',
      hazard: 'Safety yellow with black chevrons at the corners.',
    }),
    cab: choice('What is the corner control cab like?', {
      lit: 'A glazed box with a warm lit window and a driver inside.',
      dark: 'Glazed but dark and empty.',
      boarded: 'Windows plated over with sheet steel.',
      twin: 'Two lit cabs on opposite corners, one for each direction.',
    }),
    stencil: choice('What is stencilled on its flank?', {
      'ct-1': 'CT-1', 'ct-2': 'CT-2', hans: 'HANS', franz: 'FRANZ', mph: 'MAX SPEED 1 MPH', surplus: 'SURPLUS LOT 44',
    }),
    stacks: score('How much machinery rises above the deck edge?', ['A clean flat edge', 'A few exhaust stacks', 'A clutter of stacks, tanks and ducts']),
    crew: choice('Who or what is on and around it?', {
      nobody: 'Nobody.',
      walkers: 'A few tiny figures in hard hats walking alongside.',
      bunting: 'Flags and bunting along the rails for a ceremonial rollout.',
      nests: 'Bird nests and weeds in the corners.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const b = new Batch();
    const wear = a.load === 'stripped' ? Math.max(mood.wear, 0.55) : mood.wear;
    const rust = new THREE.Color('#7b4023');
    const paint = (hex: string, chance = 1) => {
      const c = new THREE.Color(hex);
      if (random() < wear * 0.8 * chance) c.lerp(rust, mix(0.2, 0.9, random()) * wear);
      else c.offsetHSL(0, 0, (random() - 0.5) * 0.05);
      return c;
    };
    const body = { agency: '#b4b9b6', olive: '#69724d', primer: '#a04a35', company: '#f0f1ef', hazard: '#e2b521' }[a.livery];
    const rail = { agency: '#e5bd27', olive: '#3d4330', primer: '#5a2d22', company: '#2a62b5', hazard: '#1e2022' }[a.livery];
    const tread = '#2b2d2e';
    const LX = 40, LZ = 35;
    const jack = a.doing === 'jacked' ? 3.2 : a.load === 'empty' || a.load === 'stripped' ? 0 : 0.9;
    const deckY = 5.2 + jack;

    // Four trucks, each a pair of tread belts round a frame, with a jacking column up to the chassis.
    const thrown = a.doing === 'thrown-track' ? Math.floor(random() * 4) : -1;
    const dusts: THREE.Mesh[] = [];
    const dust = new THREE.MeshStandardMaterial({ color: '#d8cfba', transparent: true, opacity: 0.38, depthWrite: false, roughness: 1 });
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], index) => {
      const cx = sx * 16, cz = sz * 12.5;
      const missing = a.load === 'stripped' && index === 2;
      b.cyl(1.5, 1.9, deckY - 2.6, [cx, 2.6 + (deckY - 2.6) / 2, cz], paint('#8d9292'), 12);
      b.cyl(2.6, 2.6, 0.7, [cx, deckY - 0.4, cz], paint(body), 12);
      if (missing) {
        // The truck is gone; the corner sits on cribbing timbers.
        for (let layer = 0; layer < 7; layer++) for (let k = -1; k <= 1; k++) b.box(layer % 2 ? [5, 0.5, 0.6] : [0.6, 0.5, 5], [cx + (layer % 2 ? 0 : k * 2), 0.25 + layer * 0.5, cz + (layer % 2 ? k * 2 : 0)], paint('#7a6044', 0.3));
        return;
      }
      b.box([4.2, 2.2, 9.5], [cx, 2.2, cz], paint(body));
      for (const side of [-1, 1]) {
        const x = cx + side * 3.4;
        const broken = index === thrown && side === sx;
        b.box([2.1, 2.2, 9.6], [x, 1.7, cz], paint('#55595a', 0.6));
        for (const end of [-1, 1]) b.cyl(1.55, 1.55, 2.2, [x, 1.7, cz + end * 4.8], '#3c4041', 14, [0, 0, Math.PI / 2]);
        for (let r = 0; r < 6; r++) b.cyl(0.55, 0.55, 2.5, [x, 0.75, cz - 4 + r * 1.6], paint('#6b7071', 0.5), 8, [0, 0, Math.PI / 2]);
        if (broken) {
          // The belt has run off the front and lies in a loose snake ahead of the truck.
          let px = x, pz = cz + 6.5, heading = (random() - 0.5) * 0.5;
          for (let shoe = 0; shoe < 34; shoe++) {
            b.box([2.6, 0.32, 0.7], [px, 0.16, pz], paint(tread, 0.8), [0, heading, 0]);
            heading += (random() - 0.5) * 0.35;
            px += Math.sin(heading) * 0.82; pz += Math.cos(heading) * 0.82;
          }
          for (let shoe = 0; shoe < 8; shoe++) b.box([2.6, 0.32, 0.7], [x, 0.16, cz - 3 + shoe * 0.82], paint(tread, 0.8));
          continue;
        }
        // Shoes along the top and bottom runs and round both ends.
        for (let shoe = 0; shoe < 12; shoe++) for (const y of [0.16, 3.25]) b.box([2.6, 0.32, 0.7], [x, y, cz - 4.5 + shoe * 0.82], paint(tread, 0.8));
        for (const end of [-1, 1]) for (let k = 0; k < 6; k++) {
          const t = ((k + 0.5) / 6) * Math.PI;
          b.box([2.6, 0.32, 0.7], [x, 1.7 - Math.cos(t) * 1.55, cz + end * (4.8 + Math.sin(t) * 1.55)], paint(tread, 0.8), [end * (t - Math.PI) + Math.PI, 0, 0]);
        }
      }
      if (a.doing === 'crawling') for (let p = 0; p < 3; p++) {
        const puff = s.ball([2.6 + p * 1.2, 1.3 + p * 0.5, 2.6 + p * 1.2], [cx + (random() - 0.5) * 5, 1 + p * 0.5, cz - 7.5 - p * 2.6], dust, 10);
        puff.castShadow = false;
        puff.userData.home = puff.position.clone();
        puff.userData.phase = random() * 6;
        dusts.push(puff);
      }
    });

    // Chassis: a thick deck with chamfered ends, side louvres and a handrail all round.
    const ribs = a.load === 'stripped';
    if (ribs) {
      for (let i = 0; i <= 10; i++) b.box([0.7, 2.6, LZ], [-LX / 2 + (i * LX) / 10, deckY + 1.3, 0], paint(body));
      for (let k = 0; k <= 5; k++) b.box([LX, 2.6, 0.7], [0, deckY + 1.3, -LZ / 2 + (k * LZ) / 5], paint(body));
      for (let i = 0; i < 10; i++) for (let k = 0; k < 5; k++) if (random() < 0.3) b.box([LX / 10 - 0.6, 0.25, LZ / 5 - 0.6], [-LX / 2 + ((i + 0.5) * LX) / 10, deckY + 2.5, -LZ / 2 + ((k + 0.5) * LZ) / 5], paint(body), [0, 0, (random() - 0.5) * 0.12]);
    } else {
      b.box([LX, 2.8, LZ], [0, deckY + 1.4, 0], paint(body, 0.3));
      for (let i = 0; i < 8; i++) for (let k = 0; k < 7; k++) b.box([LX / 8 - 0.25, 0.12, LZ / 7 - 0.25], [-LX / 2 + ((i + 0.5) * LX) / 8, deckY + 2.82, -LZ / 2 + ((k + 0.5) * LZ) / 7], paint(body));
      for (const sx of [-1, 1]) for (let v = 0; v < 6; v++) b.box([0.2, 1.5, 3.2], [sx * (LX / 2 + 0.05), deckY + 1.4, -11 + v * 4.4], v % 2 ? '#2f3335' : paint(body));
    }
    if (a.livery === 'company') for (const sz of [-1, 1]) b.box([LX + 0.1, 0.8, 0.2], [0, deckY + 1.5, sz * (LZ / 2 + 0.05)], '#2a62b5');
    if (a.livery === 'hazard') for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let k = 0; k < 3; k++) b.box([0.9, 2.9, 0.25], [sx * (LX / 2 - 1.2 - k * 1.9), deckY + 1.4, sz * (LZ / 2 + 0.05)], '#1e2022', [0, 0, sx * sz * 0.5]);
    const deckTop = deckY + 2.9;
    for (let i = 0; i <= 12; i++) for (const sz of [-1, 1]) b.rod([-LX / 2 + (i * LX) / 12, deckTop, sz * LZ / 2], [-LX / 2 + (i * LX) / 12, deckTop + 1.3, sz * LZ / 2], 0.1, rail, 0.1, 4);
    for (let k = 0; k <= 10; k++) for (const sx of [-1, 1]) b.rod([sx * LX / 2, deckTop, -LZ / 2 + (k * LZ) / 10], [sx * LX / 2, deckTop + 1.3, -LZ / 2 + (k * LZ) / 10], 0.1, rail, 0.1, 4);
    for (const sz of [-1, 1]) b.rod([-LX / 2, deckTop + 1.3, sz * LZ / 2], [LX / 2, deckTop + 1.3, sz * LZ / 2], 0.1, rail, 0.1, 4);
    for (const sx of [-1, 1]) b.rod([sx * LX / 2, deckTop + 1.3, -LZ / 2], [sx * LX / 2, deckTop + 1.3, LZ / 2], 0.1, rail, 0.1, 4);
    // Pickup pedestals and a stair down one side.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box([3, 1, 3], [sx * 13.5, deckTop + 0.5, sz * 10.5], paint('#6f7576', 0.6));
    for (let i = 0; i < 12; i++) b.box([0.8, 0.2, 2], [LX / 2 + 0.6 + i * 0.55, deckTop - 0.2 - i * ((deckTop - 0.2) / 12), 4], paint('#8d9292', 0.5));

    // Machinery above the deck edge.
    const clutter = Math.round(mix(0, 9, a.stacks));
    for (let i = 0; i < clutter; i++) {
      const x = (random() - 0.5) * 20, z = -LZ / 2 + 2 + random() * 3;
      const kind = Math.floor(random() * 3);
      if (kind === 0) { b.cyl(0.35, 0.35, 3 + random() * 2.5, [x, deckTop + 2, z], paint('#3a3d3e', 0.6), 8); }
      else if (kind === 1) b.cyl(1, 1, 3.4, [x, deckTop + 1.1, z + 1], paint('#d8d8d0'), 10, [0, 0, Math.PI / 2]);
      else b.box([2.6, 1.8, 2], [x, deckTop + 0.9, z + 0.5], paint(rail === '#1e2022' ? '#55595a' : rail, 0.6));
    }

    // Load.
    let top = deckTop;
    if (a.load === 'platform' || a.load === 'rocket') {
      const py = deckTop + 1;
      b.box([41, 5.5, 34], [0, py + 2.75, 0], paint('#9fa3a0', 0.4));
      b.box([41.4, 0.5, 34.4], [0, py + 5.5, 0], paint('#7f8482', 0.4));
      for (let h = -1; h <= 1; h++) b.box([8, 0.3, 8], [h * 11 - 4, py + 5.7, 2], '#191b1c');
      top = py + 5.8;
      b.lattice(5, top, top + (a.load === 'rocket' ? 62 : 14), a.load === 'rocket' ? 10 : 3, 0.4, () => paint('#c7331f'), () => false);
      if (a.load === 'rocket') {
        const rx = -15, rz = 2;
        b.cyl(4, 4, 34, [rx, top + 19, rz], paint('#f2f2ee', 0.3), 20);
        b.cyl(2.6, 4, 5, [rx, top + 38.5, rz], '#232628', 20);
        b.cyl(2.6, 2.6, 13, [rx, top + 47.5, rz], paint('#f2f2ee', 0.3), 20);
        b.cyl(0.3, 2.6, 6, [rx, top + 57, rz], paint('#f2f2ee', 0.3), 20);
        b.cyl(0.12, 0.12, 5, [rx, top + 62, rz], '#c7331f', 6);
        b.cyl(4.05, 4.05, 3, [rx, top + 12, rz], '#232628', 20);
        for (let f = 0; f < 4; f++) b.box([0.3, 5, 3.2], [rx + Math.cos(f * Math.PI / 2 + 0.78) * 5, top + 4.5, rz + Math.sin(f * Math.PI / 2 + 0.78) * 5], '#232628', [0, -f * Math.PI / 2 - 0.78 + Math.PI / 2, 0]);
        for (let f = 0; f < 4; f++) b.cyl(1.2, 1.7, 2, [rx + Math.cos(f * Math.PI / 2) * 2.2, top + 1, rz + Math.sin(f * Math.PI / 2) * 2.2], '#3c4041', 10);
        for (let arm = 0; arm < 4; arm++) b.box([13, 1.2, 1.6], [-7.5, top + 14 + arm * 13, 1], paint('#c7331f'));
      }
    } else if (a.load === 'tarped') {
      for (let lump = 0; lump < 5; lump++) b.ball(1, [(random() - 0.5) * 22, deckTop + 1.5, (random() - 0.5) * 16], paint('#8f8468', 0.3), [6 + random() * 5, 3 + random() * 4, 5 + random() * 5], 12);
      for (let rope = 0; rope < 6; rope++) { const x = -15 + rope * 6; b.rod([x, deckTop, -LZ / 2], [x + (random() - 0.5) * 3, deckTop + 6, 0], 0.09, '#3b352a', 0.09, 4); b.rod([x, deckTop, LZ / 2], [x + (random() - 0.5) * 3, deckTop + 6, 0], 0.09, '#3b352a', 0.09, 4); }
    }

    // Crew and leftovers.
    if (a.crew === 'walkers') for (let p = 0; p < 7; p++) {
      const x = (random() < 0.5 ? -1 : 1) * (LX / 2 + 3 + random() * 4), z = (random() - 0.5) * 34;
      b.cyl(0.28, 0.24, 1.3, [x, 0.65, z], ['#e8742a', '#2f4f7a', '#e9e7df'][p % 3], 6);
      b.ball(0.26, [x, 1.55, z], ['#f3f1ea', '#e5bd27'][p % 2], [1, 1, 1], 8);
    }
    if (a.crew === 'bunting') {
      const hues = ['#d6382b', '#f3f1ea', '#2a62b5', '#e5bd27'];
      for (const sz of [-1, 1]) for (let f = 0; f < 26; f++) b.box([0.9, 1.1, 0.06], [-LX / 2 + 0.8 + f * 1.53, deckTop + 0.75, sz * (LZ / 2 + 0.12)], hues[f % 4], [0, 0, Math.PI / 4]);
      for (const sx of [-1, 1]) { b.rod([sx * (LX / 2 - 0.5), deckTop, LZ / 2 - 0.5], [sx * (LX / 2 - 0.5), deckTop + 7, LZ / 2 - 0.5], 0.12, '#d9d9d2', 0.12, 5); b.box([3.4, 2, 0.08], [sx * (LX / 2 - 0.5) + 1.8, deckTop + 5.9, LZ / 2 - 0.5], hues[sx > 0 ? 0 : 2]); }
    }
    if (a.crew === 'nests') {
      for (let n = 0; n < 5; n++) { const x = (random() < 0.5 ? -1 : 1) * (LX / 2 - 1.5 - random() * 3), z = (random() < 0.5 ? -1 : 1) * (LZ / 2 - 1.5 - random() * 3); b.cyl(1.1, 0.7, 0.6, [x, deckTop + 0.3, z], '#6b5536', 9); for (let e = 0; e < 3; e++) b.ball(0.2, [x + (e - 1) * 0.3, deckTop + 0.65, z], '#e7e2d2', [1, 1.2, 1], 6); }
      for (let w = 0; w < 40; w++) { const x = (random() - 0.5) * LX * 1.1, z = (random() - 0.5) * LZ * 1.1; b.rod([x, 0, z], [x + (random() - 0.5), 1 + random() * 1.8, z + (random() - 0.5)], 0.12, ['#6f8a45', '#8b9a52', '#a39b5a'][w % 3], 0.02, 4); }
    }
    s.root.add(b.mesh({ metalness: 0.2 }));

    // Control cabs hang off the corners below deck level.
    const cabLit = a.cab === 'lit' || a.cab === 'twin';
    const glow = cabLit ? mix(0.8, 1.8, Math.abs(mood.daylight - 0.5) * 2) : 0;
    const glass = s.material(a.cab === 'boarded' ? '#6d7170' : cabLit ? '#ffe7a3' : '#2c3a44', { emissive: cabLit ? '#ffd676' : '#000000', emissiveIntensity: glow, roughness: 0.3 });
    const cabs: [number, number][] = a.cab === 'twin' ? [[-1, 1], [1, -1]] : [[-1, 1]];
    for (const [sx, sz] of cabs) {
      const x = sx * (LX / 2 + 1.6), z = sz * (LZ / 2 - 2.4);
      s.box([3.4, 3.4, 4.4], [x, deckY + 1.5, z], s.material(new THREE.Color(body).lerp(rust, wear * 0.35), { metalness: 0.2 }));
      s.box([3.5, 1.5, 3.6], [x + sx * 0.05, deckY + 2.1, z + sz * 0.5], glass);
      s.box([3.9, 0.3, 4.9], [x, deckY + 3.3, z], s.material('#3c4041'));
    }
    const text = { 'ct-1': 'CT-1', 'ct-2': 'CT-2', hans: 'HANS', franz: 'FRANZ', mph: 'MAX SPEED 1 MPH', surplus: 'SURPLUS LOT 44' }[a.stencil];
    const dark = a.livery === 'agency' || a.livery === 'company' || a.livery === 'hazard';
    const paper = '#' + new THREE.Color(body).lerp(rust, wear * 0.25).getHexString();
    const front = sign([text], 15, 2.3, dark ? '#1e2022' : '#f1efe6', paper);
    front.position.set(2, deckY + 1.4, LZ / 2 + 0.12);
    const flank = sign([text], 15, 2.3, dark ? '#1e2022' : '#f1efe6', paper);
    flank.position.set(LX / 2 + 0.18, deckY + 1.4, -8);
    flank.rotation.y = Math.PI / 2;
    if (!ribs) s.root.add(front, flank);

    const beacons: THREE.Mesh[] = [];
    if (a.doing === 'crawling' || a.doing === 'jacked') {
      const amber = s.material('#ffb020', { emissive: '#ff9a10', emissiveIntensity: 2 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) beacons.push(s.ball([0.5, 0.5, 0.5], [sx * LX / 2, deckTop + 1.7, sz * LZ / 2], amber, 8));
    }
    const energy = mix(0.3, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        beacons.forEach((beacon, index) => { (beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(time * 4 * energy + index * 1.6) > 0 ? 2.4 : 0.3; });
        for (const puff of dusts) {
          const home = puff.userData.home as THREE.Vector3;
          puff.position.y = home.y + Math.sin(time * energy + puff.userData.phase) * 0.35;
          puff.position.z = home.z + Math.sin(time * energy * 0.6 + puff.userData.phase) * 0.8;
        }
      },
    });
  },
});
