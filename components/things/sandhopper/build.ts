import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { SAND, bed, lump, rest, strew, type Speck } from './grains';

const COLOURS = {
  glass: 'Pale and glassy, grey-white, its dark gut showing through.',
  sand: 'Sandy buff, hard to see until it moves.',
  shrimp: 'Pinkish orange, like a tiny cooked shrimp.',
  olive: 'Olive green-brown, the colour of the rotting weed it eats.',
  moon: 'Blue-grey, as it looks by moonlight.',
} as const;
const TINT: Record<keyof typeof COLOURS, string> = { glass: '#dfe5e2', sand: '#d2b98c', shrimp: '#ee9a78', olive: '#8d9160', moon: '#93a7c4' };

const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

/** A limb that thins along its length: one tube, drawn in towards its own centreline. */
function taper(points: THREE.Vector3[], from: number, to: number, material: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points);
  const rings = Math.max(8, points.length * 5), around = 6;
  const g = new THREE.TubeGeometry(curve, rings, 1, around);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  for (let i = 0; i <= rings; i++) {
    const c = curve.getPointAt(i / rings), r = mix(from, to, i / rings);
    for (let j = 0; j <= around; j++) {
      const index = i * (around + 1) + j;
      p.fromBufferAttribute(pos, index).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(index, p.x, p.y, p.z);
    }
  }
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material);
  mesh.castShadow = true;
  return mesh;
}

export default defineThing({
  questions: {
    pose: choice('What is it doing?', {
      resting: 'Standing arched on its legs, antennae testing the air.',
      curled: 'Curled into a tight comma on its side, playing dead or dead.',
      sprung: 'Flicked into the air mid-jump, body snapped straight, sand spraying behind.',
      burrowing: 'Head down, digging itself into the sand, only its back half showing.',
    }),
    colour: choice('What colour is it?', COLOURS),
    marking: choice('How is its armour marked?', {
      plain: 'Unmarked.',
      stripe: 'A dark line down the middle of its back.',
      banded: 'Each plate edged with a darker band.',
      speckled: 'Freckled with dark pigment spots.',
    }),
    antennae: score('How long are its antennae?', ['Short stubs', 'As long as its head and shoulders', 'Sweeping whips longer than half its body']),
    company: choice('What is with it?', {
      alone: 'Nothing.',
      sand: 'A patch of sand grains as big as its head.',
      kelp: 'A patch of sand and a scrap of ruffled brown seaweed, its food and roof.',
      swarm: 'A patch of sand with several smaller hoppers scattered across it.',
      burrows: 'A patch of damp sand pocked with round burrow holes.',
    }),
    eye: choice('What is its eye like?', {
      bead: 'A small black bead.',
      big: 'A large dark kidney-shaped eye, wide for night.',
      pale: 'A milky pale eye.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    s.root.scale.setScalar(0.03); // modelled in millimetres (it is about 15 mm long), shown magnified
    const tint = new THREE.Color(TINT[a.colour]).offsetHSL((mood.warmth - 0.5) * 0.02, 0, mix(-0.04, 0.03, mood.cheer));
    const glassy = a.colour === 'glass';
    const armour = (shade: number) => new THREE.MeshStandardMaterial({ color: tint.clone().multiplyScalar(shade), roughness: mix(0.18, 0.5, mood.wear), transparent: glassy, opacity: glassy ? 0.82 : 1, emissive: tint, emissiveIntensity: glassy ? 0.12 : 0.04 });
    const plateA = armour(1), plateB = armour(a.marking === 'banded' ? 0.62 : 0.9);
    const limbPaint = armour(0.86);
    const ink = new THREE.MeshStandardMaterial({ color: tint.clone().multiplyScalar(0.28), roughness: 0.6 });

    const arc = {
      resting: { R: 3, from: 60, to: 140, turn: 0 },
      curled: { R: 0.78, from: -70, to: 262, turn: 0 },
      sprung: { R: 3.6, from: 55, to: 124, turn: 0.5 },
      burrowing: { R: 1.3, from: 12, to: 205, turn: -1.75 },
    }[a.pose];
    const rad = Math.PI / 180;
    // Head, seven thorax plates, three abdomen plates, three small tail plates.
    const lengths = [1.05, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.9, 0.9, 0.9, 0.55, 0.45, 0.4];
    const heights = [0.3, 0.33, 0.36, 0.38, 0.4, 0.4, 0.4, 0.39, 0.4, 0.37, 0.32, 0.22, 0.17, 0.12];
    const total = lengths.reduce((sum, value) => sum + value, 0);
    const at = (phi: number, out = 0, z = 0) => V(Math.cos(phi) * (arc.R + out), Math.sin(phi) * (arc.R + out), z);
    const hopper = new THREE.Group();
    const ball = new THREE.SphereGeometry(1, 18, 12);
    const segmentArc = ((arc.to - arc.from) * rad * arc.R) / total;
    const frames: { phi: number; h: number }[] = [];
    let run = 0;
    lengths.forEach((length, i) => {
      const phi = (arc.from + ((run + length / 2) / total) * (arc.to - arc.from)) * rad;
      run += length;
      const h = heights[i];
      frames.push({ phi, h });
      const plate = new THREE.Mesh(ball, i % 2 ? plateB : plateA);
      plate.position.copy(at(phi));
      plate.rotation.z = phi + Math.PI / 2;
      plate.scale.set(length * segmentArc * 0.66, h, h * 0.62);
      plate.castShadow = plate.receiveShadow = true;
      hopper.add(plate);
      if (a.marking === 'stripe' && i > 0) {
        const stripe = new THREE.Mesh(ball, ink);
        stripe.position.copy(at(phi, h * 0.93));
        stripe.rotation.z = plate.rotation.z;
        stripe.scale.set(length * segmentArc * 0.6, h * 0.12, h * 0.16);
        hopper.add(stripe);
      }
      if (a.marking === 'speckled') for (let k = 0; k < 5; k++) for (const side of [-1, 1]) {
        const spot = new THREE.Mesh(ball, ink);
        const u = (random() - 0.5) * 0.9, w = random() * 0.8 - 0.1;
        spot.position.copy(at(phi + (u * length * segmentArc * 0.5) / arc.R, h * w, side * h * 0.62 * Math.sqrt(Math.max(0.05, 1 - w * w - u * u * 0.5))));
        spot.scale.setScalar(0.035 + random() * 0.03);
        hopper.add(spot);
      }
      // Side plates hang below the thorax like the skirts of a coat of armour.
      if (i >= 1 && i <= 7) for (const side of [-1, 1]) {
        const skirt = new THREE.Mesh(ball, i % 2 ? plateA : plateB);
        skirt.position.copy(at(phi, -h * 0.8, side * h * 0.5));
        skirt.rotation.z = plate.rotation.z;
        skirt.scale.set(length * segmentArc * 0.5, h * 0.48, h * 0.16);
        skirt.castShadow = true;
        hopper.add(skirt);
      }
    });
    if (glassy) {
      const gut = taper(frames.slice(1, 12).map((f) => at(f.phi, -f.h * 0.15)), 0.1, 0.05, new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 0.8 }));
      gut.renderOrder = -1;
      hopper.add(gut);
    }

    // Head: eyes and two pairs of antennae on a pivot so they can twitch.
    const head = frames[0];
    const tangent = (phi: number) => V(Math.sin(phi), -Math.cos(phi)); // towards the head
    const outward = (phi: number) => V(Math.cos(phi), Math.sin(phi));
    const eyeSize = { bead: 0.085, big: 0.15, pale: 0.11 }[a.eye];
    const eyePaint = new THREE.MeshStandardMaterial({ color: a.eye === 'pale' ? '#e9ecec' : '#141414', roughness: 0.15 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(ball, eyePaint);
      eye.position.copy(at(head.phi, 0.06, side * 0.17)).addScaledVector(tangent(head.phi), 0.17);
      eye.scale.set(eyeSize, eyeSize * (a.eye === 'big' ? 1.35 : 1), eyeSize * 0.6);
      eye.rotation.z = head.phi;
      hopper.add(eye);
    }
    const feelers: THREE.Group[] = [];
    const snout = at(head.phi).addScaledVector(tangent(head.phi), 0.36);
    const whip = mix(0.7, 3.4, a.antennae) * (a.pose === 'curled' ? 0.7 : 1);
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.copy(snout).add(V(0, 0, side * 0.1));
      const f = tangent(head.phi), o = outward(head.phi);
      const sweep = a.pose === 'sprung' ? -0.35 : a.pose === 'curled' ? -0.9 : 0.25;
      // Second antennae: a stout stalk, then a long jointed whip.
      const long = [V(0, 0, 0), f.clone().multiplyScalar(whip * 0.28).addScaledVector(o, whip * 0.1), f.clone().multiplyScalar(whip * 0.62).addScaledVector(o, whip * (0.1 + sweep * 0.2)), f.clone().multiplyScalar(whip * 0.95).addScaledVector(o, whip * (sweep * 0.55 - 0.1))];
      long.forEach((p, i) => { p.z = side * i * whip * 0.09; });
      pivot.add(taper(long, 0.085, 0.012, limbPaint));
      const short = [V(0, 0, 0), f.clone().multiplyScalar(0.25).addScaledVector(o, 0.2), f.clone().multiplyScalar(0.5).addScaledVector(o, 0.32)];
      short.forEach((p, i) => { p.z = side * i * 0.03; });
      pivot.add(taper(short, 0.05, 0.012, limbPaint));
      hopper.add(pivot);
      feelers.push(pivot);
    }

    // Legs. Standing, they reach for the ground; otherwise they fold in under the belly.
    const ground = arc.R * Math.sin(arc.to * rad) - 0.42;
    const stand = a.pose === 'resting';
    for (let i = 1; i <= 7; i++) for (const side of [-1, 1]) {
      const { phi, h } = frames[i];
      const start = at(phi, -h * 0.95, side * h * 0.42);
      const fwd = tangent(phi), inward = outward(phi).multiplyScalar(-1);
      const back = i >= 5 ? -1 : 1, grasp = i <= 2;
      let knee: THREE.Vector3, foot: THREE.Vector3;
      if (stand) {
        const footX = start.x + (grasp ? 0.3 : back * 0.25 - 0.1) + (random() - 0.5) * 0.15;
        foot = V(footX, grasp ? ground + 0.35 : ground, side * (0.4 + (i >= 5 ? 0.25 : 0.1)));
        knee = start.clone().lerp(foot, 0.5).add(V(back * (grasp ? 0.1 : -0.22), 0.08, side * 0.22));
      } else {
        const len = (grasp ? 0.4 : i >= 5 ? 0.95 : 0.65) * (a.pose === 'curled' ? 0.62 : 1);
        const trail = a.pose === 'sprung' ? -0.75 : back * 0.3;
        knee = start.clone().addScaledVector(inward, len * 0.5).addScaledVector(fwd, len * trail * 0.5).add(V(0, 0, side * 0.12));
        foot = knee.clone().addScaledVector(inward, len * (a.pose === 'sprung' ? 0.15 : 0.4)).addScaledVector(fwd, len * (a.pose === 'sprung' ? -0.8 : -back * 0.35));
      }
      hopper.add(taper([start, knee, foot], grasp ? 0.07 : 0.06, 0.016, limbPaint));
      if (grasp) { const claw = new THREE.Mesh(ball, limbPaint); claw.position.copy(foot); claw.scale.set(0.1, 0.075, 0.05); hopper.add(claw); }
    }
    // Swimmerets under the abdomen and the forked springing tail.
    for (let i = 8; i <= 10; i++) for (const side of [-1, 1]) {
      const { phi, h } = frames[i];
      const start = at(phi, -h * 0.9, side * 0.1);
      hopper.add(taper([start, start.clone().addScaledVector(outward(phi), -0.3).addScaledVector(tangent(phi), -0.12), start.clone().addScaledVector(outward(phi), -0.48).addScaledVector(tangent(phi), -0.3)], 0.045, 0.01, limbPaint));
    }
    const tail = frames[13];
    for (const side of [-1, 1]) for (const spread of [0.25, -0.25]) {
      const start = at(tail.phi, 0, side * 0.05);
      const away = tangent(tail.phi).multiplyScalar(-1);
      hopper.add(taper([start, start.clone().addScaledVector(away, 0.3).addScaledVector(outward(tail.phi), spread * 0.5), start.clone().addScaledVector(away, 0.62).addScaledVector(outward(tail.phi), spread)], 0.05, 0.014, limbPaint));
    }

    hopper.rotation.z = arc.turn;
    const pivot = new THREE.Group();
    pivot.add(hopper);
    if (a.pose === 'curled') pivot.rotation.x = -1.25;
    s.root.add(pivot);
    const tall = rest(pivot);
    if (a.pose === 'sprung') pivot.position.y += 1.0;
    if (a.pose === 'burrowing') pivot.position.y -= tall * 0.4;
    pivot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(pivot, true);
    const centre = box.getCenter(V(0, 0));
    pivot.position.x -= centre.x;
    pivot.position.z -= centre.z;
    const reach = Math.max(1.9, Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.5 + 0.5);

    const loose: Speck[] = [];
    const palette = SAND.tan;
    const pick = () => palette[Math.floor(random() * palette.length)];
    const damp = a.company === 'burrows' ? 0.6 : 0;
    if (a.company !== 'alone' || a.pose === 'burrowing' || a.pose === 'sprung')
      s.root.add(bed(random, { radius: reach, grain: 0.22, count: 300 + Math.round(mood.density * 260), palette, specks: SAND.dark, speckShare: 0.06, wet: damp }));
    if (a.pose === 'burrowing') {
      // The spoil heap round the hole, and grains kicked out behind.
      for (let i = 0; i < 46; i++) { const t = random() * 6.283, r = 0.35 + random() * 0.55; loose.push({ x: Math.cos(t) * r - centre.x * 0.3, y: 0.12 + random() * 0.12 * (1.2 - r), z: Math.sin(t) * r * 0.8, size: 0.1 + random() * 0.08, color: pick() }); }
      for (let i = 0; i < 12 + Math.round(mood.energy * 16); i++) { const d = 0.7 + random() * 1.1; loose.push({ x: -d, y: 0.2 + Math.sin((d - 0.7) * 2.6) * (0.5 + mood.energy), z: (random() - 0.5) * 0.7, size: 0.06 + random() * 0.05, color: pick() }); }
    }
    if (a.pose === 'sprung') {
      // A launch crater and the plume of sand it kicked up, rising to meet its tail.
      const tx = box.min.x - centre.x + 0.5, top = box.min.y + 0.25;
      for (let i = 0; i < 30; i++) { const t = random() * 6.283; loose.push({ x: Math.cos(t) * 0.5 + tx + 0.3, y: 0.12, z: Math.sin(t) * 0.45, size: 0.11 + random() * 0.07, color: pick() }); }
      for (let i = 0; i < 30 + Math.round(mood.energy * 26); i++) { const k = random(); loose.push({ x: tx + 0.3 - k * 0.3 + (random() - 0.5) * (0.25 + k * 0.6), y: 0.15 + k * top, z: (random() - 0.5) * (0.25 + k * 0.6), size: 0.13 - k * 0.06, color: pick() }); }
    }
    if (a.company === 'swarm') {
      const n = 3 + Math.round(mood.density * 5);
      for (let i = 0; i < n; i++) {
        const t = i * (6.283 / n) + random() * 0.6 + 0.5, r = reach * (0.68 + random() * 0.2), turn = random() * 6.283;
        for (let k = 0; k < 7; k++) { const q = (k / 6) * 3.3 + 0.3; loose.push({ x: Math.cos(t) * r + Math.cos(turn) * Math.cos(q) * 0.2, y: 0.12 + Math.sin(q) * 0.2 + 0.05, z: Math.sin(t) * r + Math.sin(turn) * Math.cos(q) * 0.2, size: 0.1 - Math.abs(k - 2.5) * 0.012, color: tint, flat: 0.9 }); }
      }
    }
    if (loose.length) s.root.add(strew(random, loose, lump(random, { detail: 1, amp: 0.25, chips: 1 }), new THREE.MeshStandardMaterial({ roughness: 0.5 })));
    if (a.company === 'burrows') {
      const dark = new THREE.MeshStandardMaterial({ color: '#2a2520', roughness: 1 });
      const rim = new THREE.MeshStandardMaterial({ color: '#b39a72', roughness: 0.8 });
      const n = 4 + Math.round(mood.density * 5);
      for (let i = 0; i < n; i++) {
        const t = i * (6.283 / n) + random() * 0.5, r = reach * (0.6 + random() * 0.25), x = Math.cos(t) * r, z = Math.sin(t) * r, size = 0.14 + random() * 0.08;
        const y = -(1 - Math.sqrt(Math.max(0, 1 - (r / reach) ** 2))) * 0.2;
        s.cylinder(size, size, 0.02, [x, y + 0.08, z], dark, 14).castShadow = false;
        s.ring(size * 1.25, size * 0.4, [x, y + 0.03, z], rim).rotation.x = Math.PI / 2;
      }
    }
    if (a.company === 'kelp') {
      const weed = new THREE.MeshStandardMaterial({ color: new THREE.Color('#5e5326').lerp(new THREE.Color('#2f2a18'), mood.wear * 0.6), roughness: 0.35, side: THREE.DoubleSide });
      const g = new THREE.PlaneGeometry(reach * 1.5, 0.8, 30, 6);
      g.rotateX(-Math.PI / 2);
      const pos = g.attributes.position as THREE.BufferAttribute;
      const k = random() * 6;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), edge = Math.abs(z) / 0.4;
        pos.setXYZ(i, x, 0.1 + 0.07 * Math.sin(x * 2.2 + k) + edge * edge * 0.16 * Math.sin(x * 7 + k + z * 3), z + 0.25 * Math.sin(x * 1.3 + k));
      }
      g.computeVertexNormals();
      const frond = s.mesh(g, weed, [0, 0, -reach * 0.5]);
      frond.rotation.y = 0.25;
      for (let i = 0; i < 3; i++) s.ball([0.16, 0.13, 0.13], [-reach * 0.5 + i * 0.5 + random() * 0.2, 0.2, -reach * 0.5 + 0.15 + (random() - 0.5) * 0.3], weed, 12);
    }

    const base = pivot.position.y;
    const twitch = mix(0.6, 9, mood.energy);
    return s.finish({
      footprint: reach * 0.03 * 0.75,
      update: (_dt, time) => {
        feelers.forEach((feeler, i) => { feeler.rotation.z = Math.sin(time * twitch + i * 1.7) * 0.1 * (0.4 + mood.energy); });
        if (a.pose === 'sprung') pivot.position.y = base + Math.sin(time * (1 + mood.energy * 2)) * 0.12;
      },
    });
  },
});
