import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { Batch, sign } from './batch';

const STYLES = {
  saturn: 'Signal-red open lattice with a hammerhead crane on top: the moon-race umbilical tower.',
  redstone: 'Red and white banded lattice, squat and early, from the first crewed hops.',
  soviet: 'Olive-green riveted steel, tapering upward, heavy and utilitarian, a steppe cosmodrome.',
  shuttle: 'Battleship-grey fixed structure crowned with a tall white lightning spike.',
  commercial: 'Clean white and black, partly panelled in, minimal and new, a private launch company.',
  tropical: 'Orange and white bands with a blue cap, a newer national programme on a jungle coast.',
} as const;

export default defineThing({
  questions: {
    style: choice('Which era and nation built the tower?', STYLES),
    height: score('How tall is it?', ['A squat early gantry', 'Mid-sized', 'A towering moon-rocket tower']),
    arms: choice('What are the swing arms doing?', {
      extended: 'All reaching forward to a rocket, connected and ready.',
      retracted: 'All swung back flat against the side, as in the last seconds or between flights.',
      mixed: 'Some out, some back: mid-countdown, or nobody finished the job.',
      stripped: 'Arms cut away, only hinge stubs and dangling hoses remain.',
    }),
    armCount: score('How many swing arms does it carry?', ['Just the crew arm and one other', 'A handful', 'Nine or more, one per stage']),
    crew: choice('What is at the end of the top crew arm?', {
      'white-room': 'A boxy white room with a hatch and a lit window.',
      catwalk: 'An open railed catwalk with no shelter.',
      tarped: 'A white room wrapped in flapping tarpaulin.',
      none: 'Nothing: this tower only ever served cargo.',
    }),
    elevator: score('Where is the elevator car right now?', ['At the ground', 'Halfway up', 'At the top, at crew level']),
    marking: choice('If something is painted down the side, what is it?', {
      none: 'Bare steel, no markings.',
      usa: 'USA in tall stacked letters.',
      cccp: 'CCCP in tall stacked letters.',
      number: 'A big pad number.',
      chevrons: 'Black and yellow hazard chevrons.',
    }),
    state: choice('What is happening at the tower?', {
      countdown: 'Launch day: floodlights blazing, vapour bleeding from the umbilicals, beacons flashing.',
      standby: 'Between flights, quiet and maintained.',
      mothballed: 'Fenced off and sheeted, kept in case the programme comes back.',
      scrapped: 'Cut down: the top half lies toppled beside the stump.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const b = new Batch();
    const wear = a.state === 'scrapped' ? Math.max(mood.wear, 0.6) : mood.wear;
    const rust = new THREE.Color('#7a3d1f');
    const paint = (hex: string, chance = 1) => {
      const c = new THREE.Color(hex);
      if (random() < wear * 0.85 * chance) c.lerp(rust, mix(0.25, 0.95, random()) * wear);
      else c.offsetHSL(0, 0, (random() - 0.5) * 0.04);
      return c;
    };
    const base = { saturn: '#c9311f', redstone: '#c9311f', soviet: '#5f6f47', shuttle: '#8a9196', commercial: '#eceeed', tropical: '#e2792b' }[a.style];
    const band = { saturn: base, redstone: '#ecebe4', soviet: base, shuttle: base, commercial: base, tropical: '#ecebe4' }[a.style];
    const squat = a.style === 'redstone' ? 0.7 : 1;
    const H = Math.round(mix(52, 108, a.height) * squat / 7) * 7;
    const bays = H / 7;
    const W = a.style === 'soviet' ? 14 : 11.5;
    const topW = a.style === 'soviet' ? 7.5 : W;
    const cut = a.state === 'scrapped' ? Math.max(3, Math.round(bays * mix(0.35, 0.55, random()))) : bays;
    const colourOf = (bay: number) => paint(bay % 2 ? band : base);
    const skip = () => random() < Math.max(0, wear - 0.45) * 0.5;
    const widthAt = (y: number) => W + (topW - W) * (y / H);
    const concrete = '#b9b6aa', dark = '#343a3d', grey = '#8e9598';

    // Footing: a concrete plinth with a hazard edge and a stair up to the first deck.
    b.box([W + 6, 2.2, W + 6], [0, 1.1, 0], paint(concrete, 0.4));
    for (const side of [-1, 1]) {
      b.box([W + 6.2, 0.5, 0.9], [0, 2.05, side * (W / 2 + 2.7)], a.style === 'commercial' ? '#22272a' : '#d8b42a');
      b.box([0.9, 0.5, W + 6.2], [side * (W / 2 + 2.7), 2.05, 0], a.style === 'commercial' ? '#22272a' : '#d8b42a');
    }
    for (let i = 0; i < 8; i++) b.box([3, 0.28, 0.6], [-W / 2 - 1, 0.14 + i * 0.28, W / 2 + 3 + (8 - i) * 0.6], concrete);

    // The lattice itself, bay by bay, with a grating deck on each level.
    const tower = (from: number, to: number) => {
      const y0 = 2.4 + from * 7, y1 = 2.4 + to * 7;
      const span = to - from;
      const wa = widthAt(from * 7), wb = widthAt(to * 7);
      for (let bay = 0; bay < span; bay++) {
        const y = y0 + bay * 7, w0 = wa + (wb - wa) * (bay / span), w1 = wa + (wb - wa) * ((bay + 1) / span), h0 = w0 / 2, h1 = w1 / 2;
        const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const;
        corners.forEach(([x, z], index) => {
          const [nx, nz] = corners[(index + 1) % 4];
          const c = colourOf(from + bay);
          b.rod([x * h0, y, z * h0], [x * h1, y + 7, z * h1], 0.55, c, 0.55, 4);
          b.rod([x * h1, y + 7, z * h1], [nx * h1, y + 7, nz * h1], 0.4, c, 0.4, 4);
          if (!skip()) b.rod([x * h0, y, z * h0], [nx * h1, y + 7, nz * h1], 0.3, colourOf(from + bay), 0.3, 4);
          if (!skip()) b.rod([nx * h0, y, nz * h0], [x * h1, y + 7, z * h1], 0.3, colourOf(from + bay), 0.3, 4);
        });
        b.box([w1 - 0.6, 0.18, w1 - 0.6], [0, y + 7, 0], paint(dark, 0.5));
        if (a.style === 'commercial' && (from + bay) < bays * 0.6) for (const side of [-1, 1]) b.box([0.15, 6.6, w0 - 0.8], [side * (h0 + 0.05), y + 3.5, 0], paint((from + bay) % 3 ? '#eceeed' : '#262b2e', 0.6));
      }
      // Elevator shaft up the back, and a pipe run up one leg.
      b.box([3, y1 - y0, 3], [0, (y0 + y1) / 2, -Math.min(wa, wb) / 2 - 1.4], paint(grey, 0.6));
      for (let i = 0; i < 3; i++) b.rod([wa / 2 + 0.5, y0, -1 + i * 0.9], [wb / 2 + 0.5, y1, -1 + i * 0.9], 0.2, paint(['#d9d9d2', '#c9a43a', '#6f8ea8'][i], 0.7), 0.2, 6);
    };
    tower(0, cut);
    const topY = 2.4 + cut * 7;

    if (a.state === 'scrapped') {
      // The severed upper half lies where it fell, with a ragged cut on the stump.
      b.within([W * 1.4, widthAt(cut * 7) / 2 + 0.4, -W * 0.3 - (cut * 7 + 2.4) * 0], [Math.PI / 2 - 0.04, 0.35 + random() * 0.5, 0], () => {
        b.within([0, -(2.4 + cut * 7), 0], [0, 0, 0], () => tower(cut, bays));
      });
      for (let i = 0; i < 4; i++) b.rod([(i % 2 ? 1 : -1) * W / 2, topY, (i < 2 ? 1 : -1) * W / 2], [(i % 2 ? 1 : -1) * W / 2 + (random() - 0.5) * 3, topY + 2 + random() * 4, (i < 2 ? 1 : -1) * W / 2 + (random() - 0.5) * 3], 0.4, paint(base), 0.3, 4);
      for (let i = 0; i < 14; i++) b.rod([W * 0.8 + random() * W * 3, 0.2, (random() - 0.5) * W * 2], [W * 0.8 + random() * W * 3, 0.3 + random(), (random() - 0.5) * W * 2], 0.25, paint(base), 0.25, 4);
    }

    // Swing arms: box trusses hinged on the front face, top one for the crew.
    const count = Math.max(2, Math.min(cut - 1, Math.round(mix(2, 9, a.armCount))));
    const armLength = mix(19, 25, random());
    const plumes: THREE.Mesh[] = [];
    const vapour = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false, roughness: 1 });
    for (let i = 0; i < count; i++) {
      const top = i === count - 1;
      const y = 2.4 + 7 * Math.round(mix(Math.min(2, cut - 1), cut - 1, count === 1 ? 1 : i / (count - 1)));
      const w = widthAt(y - 2.4);
      const hinge: [number, number, number] = [w / 2 - 1.6, y + 0.3, w / 2 + 0.3];
      b.box([3.4, 3.6, 1.2], [hinge[0], y + 1.8, hinge[2]], paint(dark, 0.5));
      if (a.arms === 'stripped' || (a.state === 'scrapped' && random() < 0.5)) {
        for (let h = 0; h < 2; h++) b.rod([hinge[0] + h - 0.5, y + 1, hinge[2] + 0.6], [hinge[0] + h - 0.5 + (random() - 0.5) * 2, y - 4 - random() * 9, hinge[2] + 1.5 + random()], 0.16, '#1d2022', 0.12, 5);
        continue;
      }
      const back = a.arms === 'retracted' || (a.arms === 'mixed' && random() < 0.5);
      const angle = back ? mix(1.35, 1.5, random()) : (random() - 0.5) * 0.12;
      const length = armLength * (top ? 1 : mix(0.8, 1, random()));
      const c = paint(a.style === 'commercial' ? '#2a2f33' : base);
      b.within(hinge, [0, angle, 0], () => {
        for (const x of [-1.3, 1.3]) for (const yy of [0, 3]) b.rod([x, yy, 0], [x, yy, length], 0.2, c, 0.2, 4);
        const panels = 5;
        for (let p = 0; p <= panels; p++) {
          const z = (length * p) / panels;
          for (const x of [-1.3, 1.3]) b.rod([x, 0, z], [x, 3, z], 0.14, c, 0.14, 4);
          b.rod([-1.3, 3, z], [1.3, 3, z], 0.14, c, 0.14, 4);
          if (p < panels) for (const x of [-1.3, 1.3]) b.rod([x, p % 2 ? 3 : 0, z], [x, p % 2 ? 0 : 3, z + length / panels], 0.11, paint(base), 0.11, 4);
        }
        b.box([2.2, 0.14, length], [0, 0.1, length / 2], paint(dark, 0.4));
        if (top && a.crew !== 'none') {
          if (a.crew === 'catwalk') {
            b.box([4.4, 0.2, 4.4], [0, 0.1, length + 1.6], paint(dark, 0.4));
            for (const x of [-2.1, 2.1]) for (const z of [-0.5, 1.6, 3.7]) b.rod([x, 0.1, length + z], [x, 1.6, length + z], 0.1, '#d8b42a', 0.1, 4);
            for (const x of [-2.1, 2.1]) b.rod([x, 1.6, length - 0.5], [x, 1.6, length + 3.7], 0.09, '#d8b42a', 0.09, 4);
          } else {
            const tarp = a.crew === 'tarped';
            b.box([6.4, 5.6, 7], [0, 2.4, length + 3], tarp ? paint('#b7a98a', 0.3) : paint('#f3f3ee', 0.5));
            if (tarp) for (let f = 0; f < 5; f++) b.box([5.5, 0.12, 0.3], [0, 0.6 + f * 0.9, length + 2.2 + (random() - 0.5) * 5], '#6d6352', [0, 0, (random() - 0.5) * 0.3]);
            else { b.box([6.7, 0.4, 7.3], [0, 5.3, length + 3], '#c9c9c2'); b.box([0.12, 2.8, 1.6], [3.25, 1.8, length + 3], dark); b.box([0.12, 1.2, 1.2], [3.25, 3, length + 5.2], '#ffe9a0'); }
          }
        } else if (!top) {
          // Umbilical plate and hoses that droop from the tip.
          b.box([3, 3.4, 0.5], [0, 1.6, length + 0.2], paint('#d5d5cc', 0.6));
          for (let h = 0; h < 3; h++) b.rod([-0.9 + h * 0.9, 0.4, length * 0.5], [-0.9 + h * 0.9, back ? -3 - random() * 4 : -1.2, length - 0.4], 0.14, '#1d2022', 0.14, 5);
        }
      });
      if (a.state === 'countdown' && !top && !back && plumes.length < 5) {
        const tip = new THREE.Vector3(hinge[0] + Math.sin(angle) * length, y - 1, hinge[2] + Math.cos(angle) * length);
        for (let p = 0; p < 3; p++) {
          const puff = s.ball([1.6 + p, 1.2 + p * 0.5, 1.6 + p], [tip.x + p * 1.4, tip.y - p * 1.6, tip.z + 1 + p * 0.6], vapour, 10);
          puff.castShadow = false;
          puff.userData.home = puff.position.clone();
          puff.userData.phase = random() * 6;
          plumes.push(puff);
        }
      }
    }

    // Crown: each programme finishes the tower differently.
    if (a.state !== 'scrapped') {
      if (a.style === 'saturn' || a.style === 'redstone') {
        b.cyl(1.6, 2, 2.4, [0, topY + 1.2, 0], paint(dark, 0.5), 10);
        b.within([0, topY + 2.4, 0], [0, 0.5 + random() * 1.5, 0], () => {
          for (const x of [-1, 1]) { b.rod([x, 0.3, -9], [x, 0.3, 16], 0.3, paint(base), 0.3, 4); b.rod([x, 3, -6], [x, 0.3, 16], 0.2, paint(base), 0.2, 4); b.rod([x, 3, -6], [x, 0.3, -9], 0.2, paint(base), 0.2, 4); }
          for (let z = -8; z <= 16; z += 4) b.rod([-1, 0.3, z], [1, 0.3, z], 0.16, paint(base), 0.16, 4);
          b.box([3, 2.6, 3.4], [0, 1.6, -7], paint('#e8e6dc', 0.6));
          b.rod([0, 0.2, 14.5], [0, -mix(4, 14, random()), 14.5], 0.07, '#1d2022', 0.07, 4);
        });
      } else if (a.style === 'shuttle') {
        b.cyl(0.25, 1.1, 24, [0, topY + 12, 0], paint('#f1f1ec', 0.5), 8);
        b.cyl(0.05, 0.12, 6, [0, topY + 27, 0], dark, 5);
      } else if (a.style === 'soviet') {
        b.box([topW + 2, 0.5, topW + 2], [0, topY + 0.3, 0], paint(base));
        for (const x of [-1, 1]) for (const z of [-1, 1]) b.rod([x * (topW / 2 + 0.8), topY + 0.5, z * (topW / 2 + 0.8)], [x * (topW / 2 + 0.8), topY + 2, z * (topW / 2 + 0.8)], 0.12, paint(base), 0.12, 4);
        b.cyl(0.1, 0.18, 9, [topW / 2, topY + 5, -topW / 2], dark, 5);
      } else {
        b.box([W + 0.6, 3.2, W + 0.6], [0, topY + 1.6, 0], paint(a.style === 'tropical' ? '#2f67ac' : '#262b2e', 0.5));
        b.cyl(0.08, 0.2, 10, [0, topY + 8, 0], dark, 5);
      }
    }
    s.root.add(b.mesh({ metalness: 0.15 }));

    // Elevator car, glowing a little so it can be found.
    const lit = a.state === 'countdown' ? 1.6 : a.state === 'standby' ? 0.5 : 0;
    const carY = 2.4 + mix(1.6, Math.max(2, cut * 7 - 2.4), a.elevator);
    const back = -widthAt(carY - 2.4) / 2 - 1.4;
    s.box([3.3, 3.2, 3.3], [0, carY, back], s.material('#e8c53a', { emissive: '#ffcf4a', emissiveIntensity: lit * 0.5 }));

    // Markings down the side panel.
    if (a.marking !== 'none') {
      const tall = Math.min(cut * 7 - 4, 30);
      const y = 2.4 + cut * 7 - tall / 2 - 2;
      const w = widthAt(y - 2.4);
      const lines = { usa: ['U', 'S', 'A'], cccp: ['C', 'C', 'C', 'P'], number: [String(1 + Math.floor(random() * 41)), ['A', 'B', 'C'][Math.floor(random() * 3)]], chevrons: ['V', 'V', 'V', 'V', 'V', 'V'] }[a.marking];
      const chev = a.marking === 'chevrons';
      const panel = sign(lines, 5.5, tall, chev ? '#1c1d1f' : '#f4f2ea', chev ? '#e3bb25' : '#' + new THREE.Color(a.style === 'commercial' ? '#22272a' : base).lerp(rust, wear * 0.3).getHexString());
      panel.position.set(-w / 2 - 0.5, y, 0);
      panel.rotation.y = -Math.PI / 2;
      s.root.add(panel);
      const front = panel.clone();
      front.position.set(-w / 2 + 3.2, y, w / 2 + 0.5 + (a.arms === 'stripped' ? 0 : 0));
      front.rotation.y = 0;
      if (a.arms === 'stripped' || a.state === 'scrapped') s.root.add(front);
    }

    // State dressing.
    const beacons: THREE.Mesh[] = [];
    if (a.state === 'countdown' || a.state === 'standby') {
      const red = s.material('#ff3524', { emissive: '#ff2a18', emissiveIntensity: a.state === 'countdown' ? 2.2 : 0.9 });
      for (const [x, z] of [[-1, -1], [1, 1]] as const) beacons.push(s.ball([0.6, 0.6, 0.6], [x * topW / 2, topY + 0.8, z * topW / 2], red, 8));
    }
    if (a.state === 'countdown') {
      const lamp = s.material('#fff6d8', { emissive: '#fff0bd', emissiveIntensity: 2 });
      for (const [x, z] of [[-1, 1], [1, 1], [1, -1]] as const) {
        s.rod([x * (W / 2 + 2), 2.2, z * (W / 2 + 2)], [x * (W / 2 + 2), 9, z * (W / 2 + 2)], 0.2, s.material(dark));
        s.box([2.4, 1.3, 0.5], [x * (W / 2 + 2), 9.4, z * (W / 2 + 2)], lamp).rotation.set(-0.5, Math.atan2(x, z), 0, 'YXZ');
      }
    }
    if (a.state === 'mothballed') {
      const mesh = s.material('#8f9690', { transparent: true, opacity: 0.55, side: THREE.DoubleSide });
      const R = W / 2 + 6;
      for (let side = 0; side < 4; side++) {
        const fence = s.box([R * 2, 2.6, 0.08], [0, 1.3, 0], mesh);
        fence.position.set([0, R, 0, -R][side], 1.3, [R, 0, -R, 0][side]);
        fence.rotation.y = side % 2 ? Math.PI / 2 : 0;
        for (let p = 0; p <= 4; p++) s.rod([fence.position.x + (side % 2 ? 0 : (p / 4 - 0.5) * R * 2), 0, fence.position.z + (side % 2 ? (p / 4 - 0.5) * R * 2 : 0)], [fence.position.x + (side % 2 ? 0 : (p / 4 - 0.5) * R * 2), 2.9, fence.position.z + (side % 2 ? (p / 4 - 0.5) * R * 2 : 0)], 0.1, s.material(dark));
      }
      const notice = sign(['KEEP', 'OUT'], 3.4, 2.2, '#b3261a', '#f1ede0');
      notice.position.set(2, 1.5, R + 0.1);
      s.root.add(notice);
      const sheet = s.material('#b9ad92', { roughness: 0.95 });
      for (let i = 0; i < 3; i++) s.box([W + 0.8, 6.2, W + 0.8], [0, 2.4 + 7 * Math.floor(1 + random() * (cut - 1)) + 3.5, 0], sheet);
    }

    const energy = mix(0.3, 1.6, mood.energy);
    return s.finish({
      footprint: W / 2 + 5,
      update: (_dt, time) => {
        beacons.forEach((beacon, index) => {
          (beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = a.state === 'countdown' ? (Math.sin(time * 3 * energy + index * 2) > 0 ? 2.4 : 0.2) : 0.9;
        });
        for (const puff of plumes) {
          const home = puff.userData.home as THREE.Vector3;
          puff.position.x = home.x + Math.sin(time * energy + puff.userData.phase) * 0.7;
          puff.position.y = home.y + Math.sin(time * energy * 0.7 + puff.userData.phase) * 0.4;
        }
      },
    });
  },
});
