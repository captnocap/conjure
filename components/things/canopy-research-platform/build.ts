import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type Blob, type V, beam, clump, fuse, instances, limb, v } from './parts';

const TARPS = {
  blue: 'A bright blue poly tarp, the universal field-camp roof.',
  orange: 'A faded orange expedition fly.',
  green: 'A dark olive army tarp that vanishes into the leaves.',
  canvas: 'Bleached, mildew-spotted canvas.',
  silver: 'A crinkled silver space blanket, catching the light.',
} as const;
const TARP_COLOURS: Record<keyof typeof TARPS, string> = { blue: '#2f72c4', orange: '#e0762c', green: '#55633a', canvas: '#d6cdb0', silver: '#c9d0d4' };

export default defineThing({
  questions: {
    deck: choice('How is the deck built?', {
      ring: 'A full ring of boards right round the trunk.',
      half: 'A half-moon deck on one side of the trunk only.',
      jetty: 'A square deck jutting out to one side on long diagonal struts.',
      tiers: 'Two levels: a main ring and a small crow\'s-nest above, joined by a ladder.',
    }),
    roof: choice('How is the tarp rigged?', {
      lean: 'A lean-to: high at the trunk, sloping down to the outer rail.',
      ridge: 'Pitched over a ridge line like a tent fly.',
      torn: 'Torn by a storm: half of it hanging in a flapping strip.',
      none: 'No roof left: only the cords it was tied with.',
    }),
    tarp: choice('What is the tarp made of?', TARPS),
    study: choice('What is being studied from here?', {
      jars: 'Specimens: a crate of sample jars, labelled, some with things in them.',
      sound: 'Sound: a parabolic microphone on a stand, aimed out into the leaves.',
      camera: 'Behaviour: a long-lens camera on a tripod trained on one spot.',
      weather: 'The air itself: a mast with spinning anemometer cups and a little solar panel.',
      moths: 'Night insects: a white sheet hung up with a lamp behind it.',
    }),
    presence: choice('Where is the researcher?', {
      away: 'Gone down for the day: an empty stool and an open notebook.',
      watching: 'Sitting very still on a stool with binoculars up.',
      hammock: 'Asleep in a hammock slung across the deck.',
      climbing: 'Halfway up the rope, on the way in.',
      abandoned: 'Long gone: the project ended, things tipped over and creepers moving in.',
    }),
    lantern: noul('Is the lantern lit?'),
    drop: score('How much of the drop below the deck is shown?', ['Just a stub of trunk under the deck', 'A few metres of trunk and rope', 'A long dizzy drop of trunk with the rope trailing all the way down']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const abandoned = a.presence === 'abandoned';
    const wear = Math.min(1, mood.wear + (abandoned ? 0.35 : 0));

    const Y = mix(1.3, 4.6, a.drop) * rnd(0.93, 1.07);
    const rT = 0.42;
    const R = a.deck === 'jetty' ? 1.4 : rnd(1.95, 2.2);
    const cx = a.deck === 'jetty' ? rT + 1.25 : 0;

    const woodTone = new THREE.Color('#a8845a').lerp(new THREE.Color('#b98a52'), mood.warmth * 0.5).lerp(new THREE.Color('#84806f'), wear * 0.6);
    const wood = s.material(woodTone, { roughness: 0.85 });
    const darkWood = s.material(woodTone.clone().multiplyScalar(0.7), { roughness: 0.9 });
    const bark = s.material(new THREE.Color('#6f6253').lerp(new THREE.Color('#84694a'), mood.warmth * 0.4), { roughness: 0.95 });
    const steel = s.material('#8e979b', { metalness: 0.6, roughness: 0.4 });
    const black = s.material('#26282a', { roughness: 0.6 });
    const ropeColour = mood.cheer > 0.45 ? '#f0562d' : '#d9c23a';
    const rope = s.material(ropeColour, { roughness: 0.7, emissive: ropeColour, emissiveIntensity: 0.15 });
    const cord = s.material('#d8d2bf', { roughness: 0.9 });
    const hue = mix(0.36, 0.27, mood.warmth);
    const leafTone = new THREE.Color().setHSL(hue, 0.5, mix(0.17, 0.27, mood.cheer));
    const leafMaterial = new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true });
    const leaves: Blob[] = [];
    const tuft = (p: V, size: number, flat = 0.6) => leaves.push({ at: p, size: v(size, size * flat, size), color: leafTone.clone().offsetHSL(rnd(-0.02, 0.02), 0, rnd(-0.04, 0.05)), turn: rnd(0, 6) });

    // The tree.
    const topY = Y + (a.deck === 'tiers' ? 5.3 : 3.5);
    s.mesh(limb([v(rnd(-0.1, 0.1), -0.5, rnd(-0.1, 0.1)), v(0, Y * 0.5, 0), v(0, Y + 1, 0), v(rnd(-0.15, 0.15), topY, rnd(-0.15, 0.15))], rT * 1.25, rT * 0.72, 12), bark);
    const boughs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI + (i / 4) * 6.28 + rnd(-0.4, 0.4), from = v(0, topY - rnd(0.1, 0.5), 0), out = rnd(0.8, 1.3);
      const end = from.clone().add(v(Math.cos(ang) * out, rnd(0.4, 0.8), Math.sin(ang) * out));
      boughs.push(limb([from, from.clone().lerp(end, 0.5).add(v(0, 0.2, 0)), end], 0.13, 0.04, 6));
      for (let k = 0; k < 1 + Math.round(mood.density); k++) tuft(end.clone().add(v(rnd(-0.3, 0.3), rnd(0, 0.4), rnd(-0.3, 0.3))), rnd(0.45, 0.65));
    }
    tuft(v(0, topY + 0.35, 0), 0.7);
    s.mesh(fuse(boughs), bark);

    // Deck boards, joists and braces.
    const boards: THREE.BufferGeometry[] = [], frame: THREE.BufferGeometry[] = [], lines: THREE.BufferGeometry[] = [];
    const inside = (x: number, z: number, level = 0) => {
      if (level === 1) return Math.hypot(x, z) < 1.2 && x > -0.15;
      if (a.deck === 'jetty') return Math.abs(x - cx) < R && Math.abs(z) < R;
      if (a.deck === 'half') return Math.hypot(x, z) < R && x > -0.25;
      return Math.hypot(x, z) < R;
    };
    const layDeck = (y: number, level: number, reach: number) => {
      for (let z = -reach + 0.1; z < reach; z += 0.215) {
        // Walk along x and emit runs of deck, breaking at the trunk.
        let start: number | null = null;
        for (let x = -reach - 0.3 + (a.deck === 'jetty' ? cx : 0); x <= reach + 0.35 + (a.deck === 'jetty' ? cx : 0); x += 0.05) {
          const ok = inside(x, z, level) && Math.hypot(x, z) > rT * 0.95;
          if (ok && start === null) start = x;
          if (!ok && start !== null) {
            if (x - start > 0.25 && random() > wear * 0.14) {
              const jig = rnd(-0.04, 0.04);
              boards.push(new THREE.BoxGeometry(x - start + jig, 0.045, 0.19).translate((x + start) / 2, y + rnd(-0.006, 0.006) + (random() < wear * 0.1 ? -0.05 : 0), z));
            }
            start = null;
          }
        }
      }
    };
    layDeck(Y, 0, R);
    const edge = (ang: number, k = 1): V => (a.deck === 'jetty' ? v(cx + Math.sign(Math.cos(ang)) * R * k * Math.min(1, Math.abs(Math.cos(ang)) * 1.5), 0, Math.sign(Math.sin(ang)) * R * k * Math.min(1, Math.abs(Math.sin(ang)) * 1.5)) : v(Math.cos(ang) * R * k, 0, Math.sin(ang) * R * k));
    const span = a.deck === 'half' ? [-1.4, 1.4] : a.deck === 'jetty' ? [0.25, 6.03] : [0, 6.28];
    const postAngles: number[] = [];
    const posts = a.deck === 'jetty' ? 8 : a.deck === 'half' ? 6 : 9;
    for (let i = 0; i < posts; i++) postAngles.push(a.deck === 'jetty' ? Math.PI / 4 + (i / posts) * 6.28 : mix(span[0], span[1], a.deck === 'half' ? i / (posts - 1) : i / posts) + (a.deck === 'ring' || a.deck === 'tiers' ? 0.3 : 0));
    // Joists run out from the trunk like spokes, each on a knee brace.
    postAngles.forEach((ang) => {
      const out = edge(ang, 0.97).setY(Y - 0.07), dir = out.clone().setY(0).normalize();
      const root = a.deck === 'jetty' ? v(rT * 0.8, Y - 0.07, out.z * 0.25) : dir.clone().multiplyScalar(rT * 0.85).setY(Y - 0.07);
      frame.push(beam(root, out, 0.09, 0.1));
      const foot = a.deck === 'jetty' ? v(rT * 0.9, Y - 1.7, out.z * 0.2) : dir.clone().multiplyScalar(rT * 1.02).setY(Y - 1.25);
      frame.push(beam(foot, root.clone().lerp(out, 0.72).setY(Y - 0.12), 0.07, 0.07));
    });
    for (const dy of [-1.3, -0.2]) s.ring(rT * 1.1, 0.05, [0, Y + dy + (a.deck === 'jetty' ? -0.4 : 0), 0], steel).rotation.x = Math.PI / 2;

    // Rail posts and a rope rail, with a gap where the climbing rope comes up.
    const gate = a.deck === 'jetty' ? 2 : a.deck === 'half' ? 2 : 1;
    const railTops: V[] = [];
    postAngles.forEach((ang, i) => {
      const p = edge(ang, 0.95).setY(Y);
      const tall = 1.0 + rnd(-0.03, 0.03), tip = abandoned && random() < 0.3 ? rnd(-0.3, 0.3) : rnd(-0.03, 0.03);
      const topPt = p.clone().add(v(tip, tall, tip));
      frame.push(beam(p.clone().setY(Y - 0.1), topPt, 0.07, 0.07));
      railTops.push(topPt);
      void i;
    });
    for (let i = 0; i < railTops.length; i++) {
      const j = (i + 1) % railTops.length;
      if (a.deck === 'half' && j === 0) continue;
      if (i === gate) continue;
      for (const drop of [0.04, 0.5]) {
        const p0 = railTops[i].clone().add(v(0, -drop, 0)), p1 = railTops[j].clone().add(v(0, -drop, 0));
        lines.push(limb([p0, p0.clone().lerp(p1, 0.5).add(v(0, -0.07, 0)), p1], 0.018, 0.018, 5));
      }
    }

    let upperY = 0;
    if (a.deck === 'tiers') {
      upperY = Y + 2.5;
      layDeck(upperY, 1, 1.2);
      for (const ang of [-1.1, 0, 1.1]) {
        const out = v(Math.cos(ang) * 1.15, upperY - 0.07, Math.sin(ang) * 1.15);
        frame.push(beam(v(Math.cos(ang) * rT * 0.8, upperY - 0.07, Math.sin(ang) * rT * 0.8), out, 0.08, 0.09), beam(v(Math.cos(ang) * rT, upperY - 0.95, Math.sin(ang) * rT), out.clone().multiplyScalar(0.75).setY(upperY - 0.12), 0.06, 0.06));
        frame.push(beam(out.clone().setY(upperY), out.clone().setY(upperY + 0.9), 0.05, 0.05));
      }
      lines.push(limb([-1.1, 0, 1.1].map((ang) => v(Math.cos(ang) * 1.15, upperY + 0.88, Math.sin(ang) * 1.15)), 0.018, 0.018, 5));
      // The ladder between the two levels.
      const base = v(0.55, Y, -1.0), head = v(0.5, upperY + 0.25, -0.62);
      for (const dx of [-0.2, 0.2]) frame.push(beam(base.clone().add(v(dx, 0, 0)), head.clone().add(v(dx, 0, 0)), 0.045, 0.045));
      for (let k = 1; k < 8; k++) frame.push(beam(base.clone().lerp(head, k / 8.5).add(v(-0.2, 0, 0)), base.clone().lerp(head, k / 8.5).add(v(0.2, 0, 0)), 0.03, 0.03));
    }
    s.mesh(fuse(boards), wood);
    s.mesh(fuse(frame), darkWood);

    // The tarp.
    const deckCentre = v(a.deck === 'jetty' ? cx : a.deck === 'half' ? 0.75 : 0.55, 0, 0.35);
    const tarpColour = new THREE.Color(TARP_COLOURS[a.tarp]).lerp(new THREE.Color('#9a968a'), wear * 0.35);
    const tarpMat = new THREE.MeshStandardMaterial({ color: tarpColour, roughness: a.tarp === 'silver' ? 0.3 : 0.7, metalness: a.tarp === 'silver' ? 0.6 : 0, side: THREE.DoubleSide, flatShading: a.tarp === 'silver' });
    const sheets: { geo: THREE.BufferGeometry; base: Float32Array }[] = [];
    const sheet = (c00: V, c10: V, c01: V, c11: V, sag: number, holes = 0) => {
      const n = 8, geo = new THREE.PlaneGeometry(1, 1, n, n), p = geo.attributes.position;
      for (let i = 0; i <= n; i++)
        for (let j = 0; j <= n; j++) {
          const u = j / n, w = i / n;
          const q = c00.clone().lerp(c10, u).lerp(c01.clone().lerp(c11, u), w);
          q.y -= sag * Math.sin(Math.PI * u) * Math.sin(Math.PI * w) + rnd(0, 0.03);
          p.setXYZ(i * (n + 1) + j, q.x, q.y, q.z);
        }
      if (holes) {
        const index = geo.index!, keep: number[] = [];
        for (let t = 0; t < index.count; t += 6) if (random() > holes) for (let k = 0; k < 6; k++) keep.push(index.getX(t + k));
        geo.setIndex(keep);
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, tarpMat);
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      sheets.push({ geo, base: Float32Array.from(p.array as Float32Array) });
    };
    const roofY = (upperY || Y) + 2.35;
    const hi0 = v(-rT * 0.6, roofY + 0.1, -1.6), hi1 = v(-rT * 0.6, roofY + 0.2, 1.8);
    const lowX = deckCentre.x + (a.deck === 'jetty' ? R + 0.25 : R * 0.72), lo0 = v(lowX, roofY - 0.85, -1.7), lo1 = v(lowX + 0.1, roofY - 0.75, 1.9);
    const guy = (from: V, to: V) => lines.push(limb([from, from.clone().lerp(to, 0.5).add(v(0, -0.04, 0)), to], 0.012, 0.012, 4));
    const polePoints: V[] = [];
    // Two outer poles carry the low edge.
    for (const z of [-1.35, 1.5]) {
      const poleTop = v(lowX, roofY - 0.8, z);
      polePoints.push(poleTop);
      const footX = Math.min(lowX - 0.15, (a.deck === 'jetty' ? cx + R : R) * 0.93) * (upperY ? 0.55 : 1);
      s.mesh(beam(v(footX, upperY || Y, z * (upperY ? 0.6 : 0.8)), poleTop, 0.05, 0.05), darkWood);
    }
    if (a.roof === 'lean') sheet(hi0, lo0, hi1, lo1, rnd(0.12, 0.3) + wear * 0.15);
    if (a.roof === 'ridge') {
      const r0 = v(-rT * 0.6, roofY + 0.35, 0.1), r1 = v(lowX + 0.3, roofY + 0.15, 0.15);
      sheet(r0, r1, v(-rT * 0.6, roofY - 0.6, -1.8), lo0.clone().setY(roofY - 0.8), 0.1);
      sheet(r0, r1, v(-rT * 0.6, roofY - 0.6, 2.0), lo1.clone().setY(roofY - 0.8), 0.1);
      guy(r1, r1.clone().add(v(0.9, -0.5, 0)));
    }
    if (a.roof === 'torn') {
      const mid0 = hi0.clone().lerp(lo0, 0.55), mid1 = hi1.clone().lerp(lo1, 0.45);
      sheet(hi0, mid0, hi1, mid1, 0.15, 0.12);
      sheet(mid1, mid1.clone().add(v(0.25, -1.5, 0.2)), mid1.clone().lerp(hi1, 0.5), mid1.clone().lerp(hi1, 0.4).add(v(0.3, -1.25, 0.25)), 0.05, 0.1);
      guy(lo0, mid0);
    }
    if (a.roof === 'none') { guy(hi0, lo0); guy(hi1, lo1); guy(lo0, lo1); }
    else { guy(lo0, lo0.clone().add(v(0.5, -0.5, -0.4))); guy(lo1, lo1.clone().add(v(0.5, -0.5, 0.4))); }

    // The climbing rope: off a branch stub above the gate, down past the deck to the ground.
    const gateAt = railTops.length > gate + 1 ? railTops[gate].clone().lerp(railTops[(gate + 1) % railTops.length], 0.5) : edge(1, 1);
    const ropeX = gateAt.x * 1.12, ropeZ = gateAt.z * 1.12, ropeTop = Y + 2.9;
    s.mesh(limb([v(0, ropeTop - 0.3, 0), v(ropeX * 0.5, ropeTop + 0.05, ropeZ * 0.5), v(ropeX * 1.05, ropeTop + 0.1, ropeZ * 1.05)], 0.11, 0.05, 6), bark);
    const ropeGroup = new THREE.Group();
    ropeGroup.position.set(ropeX, ropeTop, ropeZ);
    s.root.add(ropeGroup);
    const ropeMesh = new THREE.Mesh(limb([v(0, 0, 0), v(0.02, -ropeTop * 0.5, 0), v(0, -ropeTop + 0.05, 0)], 0.022, 0.022, 5), rope);
    ropeMesh.castShadow = true;
    ropeGroup.add(ropeMesh);
    for (let i = 0; i < 3; i++) s.ring(0.2 - i * 0.02, 0.022, [ropeX + 0.1, 0.03 + i * 0.04, ropeZ + 0.05], rope).rotation.x = Math.PI / 2;
    if (mood.density > 0.4 && a.presence !== 'climbing') {
      const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.55, 10), s.material('#c9402c'));
      bag.position.set(0, -ropeTop + Y * rnd(0.3, 0.6), 0);
      bag.castShadow = true;
      ropeGroup.add(bag);
    }

    // Things on the deck. Everything is placed relative to a spot on the boards in front of the trunk.
    const spot = (dx: number, dz: number) => v(deckCentre.x + dx, Y + 0.025, deckCentre.z + dz);
    const tip = (mesh: THREE.Object3D) => { if (abandoned && random() < 0.6) { mesh.rotation.z += rnd(0.9, 1.5); mesh.position.y -= 0.02; } return mesh; };
    // Lantern.
    const lp = spot(0.1, -0.85);
    const lamp = s.material(a.lantern ? '#ffe2a0' : '#b7b29b', { emissive: a.lantern ? '#ffb347' : '#000000', emissiveIntensity: a.lantern ? 2 : 0, roughness: 0.4 });
    const hang = a.roof !== 'none' && !abandoned;
    const ly = hang ? roofY - 1.15 : Y + 0.2;
    if (hang) s.rod([lp.x, roofY - 0.45, lp.z], [lp.x, ly + 0.22, lp.z], 0.008, black);
    s.cylinder(0.075, 0.09, 0.2, [lp.x, ly, lp.z], lamp, 10);
    s.cylinder(0.11, 0.11, 0.035, [lp.x, ly - 0.115, lp.z], black, 10);
    s.cylinder(0.04, 0.11, 0.07, [lp.x, ly + 0.135, lp.z], black, 10);
    s.ring(0.07, 0.008, [lp.x, ly + 0.2, lp.z], black);

    // Crate of jars is always there: it is what the place is for.
    const crateAt = spot(0.55, 0.75);
    const crate = new THREE.Group();
    crate.position.copy(crateAt);
    crate.rotation.y = rnd(-0.4, 0.4);
    s.root.add(crate);
    const cAdd = (g: THREE.BufferGeometry, m: THREE.Material) => { const mesh = new THREE.Mesh(g, m); mesh.castShadow = mesh.receiveShadow = true; crate.add(mesh); return mesh; };
    const slats: THREE.BufferGeometry[] = [new THREE.BoxGeometry(0.62, 0.03, 0.42).translate(0, 0.015, 0)];
    for (const y of [0.1, 0.24]) slats.push(new THREE.BoxGeometry(0.64, 0.085, 0.025).translate(0, y, 0.21), new THREE.BoxGeometry(0.64, 0.085, 0.025).translate(0, y, -0.21), new THREE.BoxGeometry(0.025, 0.085, 0.42).translate(0.31, y, 0), new THREE.BoxGeometry(0.025, 0.085, 0.42).translate(-0.31, y, 0));
    cAdd(fuse(slats), wood);
    const jarCount = a.study === 'jars' ? 8 : 4;
    const glass = new THREE.MeshStandardMaterial({ color: '#dff0ee', roughness: 0.15, metalness: 0.1 });
    const jars: Blob[] = [], lids: Blob[] = [];
    for (let i = 0; i < jarCount; i++) {
      const x = -0.22 + (i % 4) * 0.147, z = i < 4 ? -0.09 : 0.09;
      jars.push({ at: v(x, 0.17, z), size: v(0.055, 0.13, 0.055), color: ['#cfe3a0', '#e6c36a', '#b9dfe0', '#d6a07a', '#eeeadb'][Math.floor(random() * 5)] });
      lids.push({ at: v(x, 0.31, z), size: v(0.058, 0.018, 0.058), color: mood.cheer > 0.5 ? '#d8442b' : '#8e979b' });
    }
    crate.add(instances(new THREE.CylinderGeometry(1, 1, 2, 10), glass, jars), instances(new THREE.CylinderGeometry(1, 1, 2, 10), new THREE.MeshStandardMaterial({ roughness: 0.5 }), lids));
    if (a.study === 'jars') for (let i = 0; i < 3; i++) { const jp = spot(1.0 + i * 0.16, 0.3 + rnd(-0.1, 0.1)); tip(s.cylinder(0.055, 0.055, 0.2, [jp.x, jp.y + 0.1, jp.z], s.material('#cfe3a0', { roughness: 0.2 }), 10)); s.cylinder(0.058, 0.058, 0.03, [jp.x, jp.y + 0.215, jp.z], s.material('#d8442b'), 10); }

    let spinner: THREE.Object3D | null = null;
    const kitAt = spot(1.05, -0.45);
    const tripod = (h: number) => { for (let i = 0; i < 3; i++) { const ang = i * 2.09 + 0.4; s.rod([kitAt.x + Math.cos(ang) * 0.35, kitAt.y, kitAt.z + Math.sin(ang) * 0.35], [kitAt.x, kitAt.y + h, kitAt.z], 0.018, black); } };
    if (a.study === 'sound') {
      tripod(1.15);
      const dish = s.mesh(new THREE.SphereGeometry(0.38, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshStandardMaterial({ color: '#e9edf0', roughness: 0.3, side: THREE.DoubleSide, transparent: false }), [kitAt.x + 0.02, kitAt.y + 1.25, kitAt.z]);
      dish.rotation.z = Math.PI / 2 + 0.25;
      dish.position.x += 0.3;
      s.rod([kitAt.x, kitAt.y + 1.2, kitAt.z], [kitAt.x + 0.26, kitAt.y + 1.27, kitAt.z], 0.02, black);
      s.box([0.22, 0.08, 0.16], [kitAt.x - 0.35, kitAt.y + 0.05, kitAt.z + 0.3], black);
    } else if (a.study === 'camera') {
      tripod(1.2);
      s.box([0.2, 0.15, 0.13], [kitAt.x, kitAt.y + 1.28, kitAt.z], black);
      const lens = s.cylinder(0.075, 0.055, 0.55, [kitAt.x + 0.37, kitAt.y + 1.28, kitAt.z], s.material('#e6e4dc', { roughness: 0.4 }), 12);
      lens.rotation.z = Math.PI / 2;
      const hood = s.cylinder(0.085, 0.085, 0.1, [kitAt.x + 0.68, kitAt.y + 1.28, kitAt.z], black, 12);
      hood.rotation.z = Math.PI / 2;
    } else if (a.study === 'weather') {
      const mx = railTops[railTops.length - 1].x, mz = railTops[railTops.length - 1].z, mh = Y + 3.1;
      s.rod([mx, Y, mz], [mx, mh, mz], 0.022, steel);
      const cups = new THREE.Group();
      cups.position.set(mx, mh, mz);
      for (let i = 0; i < 3; i++) {
        const ang = i * 2.09;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 5).rotateZ(Math.PI / 2).translate(0.13, 0, 0).rotateY(ang), steel);
        const cup = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 6, 0, Math.PI).translate(0.26, 0, 0).rotateY(ang), new THREE.MeshStandardMaterial({ color: '#f1f1ee', side: THREE.DoubleSide }));
        cup.castShadow = arm.castShadow = true;
        cups.add(arm, cup);
      }
      s.root.add(cups);
      spinner = cups;
      const panel = s.box([0.5, 0.03, 0.36], [mx, Y + 2.2, mz + 0.12], s.material('#1f2f55', { metalness: 0.5, roughness: 0.25 }));
      panel.rotation.x = 0.6;
      s.box([0.16, 0.2, 0.12], [mx, Y + 1.6, mz], s.material('#eeeeea'));
    } else if (a.study === 'moths') {
      const p0 = railTops[railTops.length - 1].clone().add(v(0, 0.75, 0)), p1 = railTops[Math.max(0, railTops.length - 2)].clone().add(v(0, 0.75, 0));
      s.mesh(beam(railTops[railTops.length - 1], p0, 0.035, 0.035), darkWood);
      s.mesh(beam(railTops[Math.max(0, railTops.length - 2)], p1, 0.035, 0.035), darkWood);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#f4f3ea', emissive: a.lantern ? '#cfd8ff' : '#000000', emissiveIntensity: a.lantern ? 0.7 : 0, side: THREE.DoubleSide, roughness: 0.9 }));
      const mid = p0.clone().lerp(p1, 0.5);
      cloth.scale.set(p0.distanceTo(p1), 1.4, 1);
      cloth.position.set(mid.x, mid.y - 0.7, mid.z);
      cloth.rotation.y = -Math.atan2(p1.z - p0.z, p1.x - p0.x);
      cloth.castShadow = true;
      s.root.add(cloth);
      const moths: Blob[] = [];
      for (let i = 0; i < 26; i++) { const t = rnd(0.05, 0.95), q = p0.clone().lerp(p1, t); const sz = rnd(0.025, 0.06); moths.push({ at: v(q.x * 0.985, q.y - rnd(0.1, 1.3), q.z * 0.985), size: v(sz, sz, sz * 0.4), color: ['#5a4634', '#c9b98a', '#2b2a28', '#8fae6a'][Math.floor(random() * 4)], tilt: new THREE.Euler(0, cloth.rotation.y, rnd(0, 6)) }); }
      s.root.add(instances(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), moths));
    }

    // The researcher, or what they left.
    const coat = s.material(mood.cheer > 0.5 ? '#3f8f8a' : '#5a6248'), trousers = s.material('#4a4438'), skin = s.material('#c99a72'), hat = s.material('#d9c48a');
    const stoolAt = spot(0.25, 0.05);
    if (a.presence !== 'hammock' && a.presence !== 'climbing') {
      const stool = new THREE.Group();
      stool.position.copy(stoolAt);
      s.root.add(stool);
      const parts: THREE.BufferGeometry[] = [new THREE.BoxGeometry(0.34, 0.03, 0.3).translate(0, 0.42, 0)];
      for (const dx of [-1, 1]) parts.push(beam(v(dx * 0.15, 0, -0.13), v(-dx * 0.15, 0.42, -0.13), 0.025, 0.025), beam(v(dx * 0.15, 0, 0.13), v(-dx * 0.15, 0.42, 0.13), 0.025, 0.025));
      const sm = new THREE.Mesh(fuse(parts), s.material('#4f6f8f'));
      sm.castShadow = true;
      stool.add(sm);
      if (abandoned) { stool.rotation.z = 1.45; stool.position.y += 0.15; }
    }
    if (a.presence === 'away' || abandoned) {
      const nb = spot(0.25, 0.55);
      s.box([0.3, 0.02, 0.22], [nb.x, nb.y + 0.01, nb.z], s.material(abandoned ? '#b9b08f' : '#f4f1e6')).rotation.y = 0.4;
      s.box([0.012, 0.024, 0.22], [nb.x, nb.y + 0.012, nb.z], black).rotation.y = 0.4;
      s.rod([nb.x + 0.2, nb.y + 0.015, nb.z + 0.1], [nb.x + 0.33, nb.y + 0.015, nb.z + 0.03], 0.008, s.material('#e3b21c'));
      tip(s.cylinder(0.04, 0.035, 0.1, [nb.x - 0.3, nb.y + 0.05, nb.z + 0.15], s.material('#d8d8d2', { metalness: 0.5 }), 10));
    }
    if (a.presence === 'watching') {
      const p = stoolAt.clone().add(v(0, 0.45, 0));
      s.box([0.26, 0.5, 0.36], [p.x, p.y + 0.27, p.z], coat);
      s.ball([0.12, 0.14, 0.12], [p.x + 0.03, p.y + 0.67, p.z], skin, 12);
      s.cylinder(0.2, 0.22, 0.04, [p.x + 0.03, p.y + 0.78, p.z], hat, 14);
      s.cylinder(0.11, 0.12, 0.1, [p.x + 0.03, p.y + 0.83, p.z], hat, 12);
      for (const z of [-0.12, 0.12]) {
        s.rod([p.x + 0.05, p.y + 0.04, p.z + z], [p.x + 0.45, p.y + 0.02, p.z + z], 0.07, trousers);
        s.rod([p.x + 0.45, p.y + 0.02, p.z + z], [p.x + 0.5, p.y - 0.43, p.z + z], 0.06, trousers);
        s.rod([p.x + 0.02, p.y + 0.46, p.z + z * 1.5], [p.x + 0.2, p.y + 0.36, p.z + z * 1.6], 0.045, coat);
        s.rod([p.x + 0.2, p.y + 0.36, p.z + z * 1.6], [p.x + 0.2, p.y + 0.66, p.z + z * 0.6], 0.04, coat);
        const barrel = s.cylinder(0.035, 0.04, 0.14, [p.x + 0.22, p.y + 0.68, p.z + z * 0.33], black, 8);
        barrel.rotation.z = Math.PI / 2;
      }
    }
    if (a.presence === 'hammock') {
      const h0 = v(rT * 0.95, Y + 1.25, 0.25), h1 = (railTops[0] ?? v(R, Y + 1, 0)).clone().add(v(0, 0.1, 0));
      const midH = h0.clone().lerp(h1, 0.5).add(v(0, -0.6, 0));
      const dir = h1.clone().sub(h0).setY(0).normalize(), side = v(-dir.z, 0, dir.x);
      const cloth = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
      const bed = s.mesh(cloth, new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#d9a02e' : '#7d8a6a', side: THREE.DoubleSide, roughness: 0.9 }), [midH.x, midH.y + 0.38, midH.z]);
      bed.scale.set(h0.distanceTo(h1) * 0.36, 0.42, 0.34);
      bed.rotation.y = -Math.atan2(dir.z, dir.x);
      guy(h0, midH.clone().addScaledVector(dir, -h0.distanceTo(h1) * 0.34).add(v(0, 0.36, 0)));
      guy(h1, midH.clone().addScaledVector(dir, h0.distanceTo(h1) * 0.34).add(v(0, 0.36, 0)));
      const body = s.ball([0.5, 0.16, 0.2], [midH.x, midH.y + 0.24, midH.z], coat, 12);
      body.rotation.y = bed.rotation.y;
      s.cylinder(0.2, 0.22, 0.04, [midH.x - dir.x * 0.5, midH.y + 0.42, midH.z - dir.z * 0.5], hat, 14).rotation.z = 0.3;
      const leg = s.rod([midH.x + dir.x * 0.3 + side.x * 0.2, midH.y + 0.3, midH.z + dir.z * 0.3 + side.z * 0.2], [midH.x + dir.x * 0.35 + side.x * 0.42, midH.y - 0.2, midH.z + dir.z * 0.35 + side.z * 0.42], 0.055, trousers);
      void leg;
    }
    if (a.presence === 'climbing') {
      const y = -ropeTop + Y * rnd(0.3, 0.6) + 0.4;
      const fig = new THREE.Group();
      fig.position.set(0.16, y, 0);
      ropeGroup.add(fig);
      const fAdd = (g: THREE.BufferGeometry, m: THREE.Material) => { const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; fig.add(mesh); };
      fAdd(new THREE.BoxGeometry(0.26, 0.5, 0.34).translate(0, 0.25, 0), coat);
      fAdd(new THREE.SphereGeometry(0.13, 12, 8).translate(0.02, 0.65, 0), skin);
      fAdd(new THREE.SphereGeometry(0.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0.02, 0.68, 0), s.material('#f1dc54'));
      fAdd(fuse([limb([v(0, 0.02, -0.1), v(-0.05, -0.3, -0.12), v(-0.16, -0.5, -0.05)], 0.07, 0.055, 6), limb([v(0, 0.02, 0.1), v(0.12, -0.2, 0.12), v(-0.1, -0.32, 0.05)], 0.07, 0.055, 6)]), trousers);
      fAdd(fuse([limb([v(0, 0.45, -0.17), v(-0.1, 0.75, -0.1), v(-0.16, 0.95, 0)], 0.05, 0.04, 6), limb([v(0, 0.45, 0.17), v(-0.1, 0.5, 0.1), v(-0.16, 0.6, 0)], 0.05, 0.04, 6)]), coat);
      fAdd(new THREE.BoxGeometry(0.2, 0.42, 0.3).translate(0.23, 0.28, 0), s.material('#c9402c'));
    }
    if (abandoned) {
      // Creepers and moss move in; a few leaves drift onto the boards.
      const vines: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 9; i++) {
        const ang = rnd(0, 6.28), p0 = v(Math.cos(ang) * rT * 1.05, Y + rnd(1.2, 2.6), Math.sin(ang) * rT * 1.05);
        const p2 = edge(ang + rnd(-0.5, 0.5), rnd(0.6, 1.05)).setY(Y + rnd(-1.4, 0.2));
        vines.push(limb([p0, p0.clone().lerp(p2, 0.4).setY(Y + 0.1), p2.clone().setY(Y + 0.06), p2], 0.025, 0.012, 5));
        tuft(p2.clone().setY(Y + 0.1), rnd(0.18, 0.3), 0.5);
      }
      s.mesh(fuse(vines), s.material('#55683a'));
    }
    for (let i = 0; i < Math.round(mood.density * 4); i++) {
      // Clutter: dry bags and a line of washing.
      const p = spot(rnd(-0.1, 0.9), rnd(-1.0, -0.3));
      tip(s.cylinder(0.14, 0.16, 0.42, [p.x, p.y + 0.21, p.z], s.material(['#e3b21c', '#3f8f8a', '#c9402c', '#4f6f8f'][i % 4]), 10));
    }
    if (leaves.length) s.root.add(instances(clump(), leafMaterial, leaves));
    s.mesh(fuse(lines), cord);

    const energy = mood.energy, flap = mix(0.004, 0.06, energy) * (a.roof === 'torn' ? 1.8 : 1);
    return s.finish({
      footprint: 1.2,
      update: (dt, time) => {
        ropeGroup.rotation.z = Math.sin(time * 0.8) * mix(0.004, 0.04, energy);
        if (spinner) spinner.rotation.y += dt * mix(0.6, 9, energy);
        if (a.lantern) lamp.emissiveIntensity = 1.9 + Math.sin(time * 7) * 0.2 * energy;
        for (const { geo, base } of sheets) {
          const p = geo.attributes.position;
          for (let i = 0; i < p.count; i++) p.setY(i, base[i * 3 + 1] + Math.sin(time * 3.1 + base[i * 3] * 2.3 + base[i * 3 + 2] * 1.7) * flap * ((i % 9) / 8 + 0.2));
          p.needsUpdate = true;
        }
      },
    });
  },
});
