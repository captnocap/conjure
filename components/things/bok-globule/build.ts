import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';
import { blob, glow, hazePaint, hull, limb, makeNoise, rimPaint, star, tint, vec } from './cosmos';

const GASES = {
  teal: 'Bright teal-green gas, cool and aquatic.',
  amber: 'Glowing amber gas, like lamplight through honey.',
  rose: 'Hot rose-pink hydrogen.',
  pearl: 'Pale pearly blue-white, clean and cold.',
} as const;
const GAS: Record<keyof typeof GASES, string> = { teal: '#2fd0bd', amber: '#ffab3d', rose: '#ff6b8e', pearl: '#a9cfff' };

const gauss = (t: number, centre: number, width: number) => Math.exp(-(((t - centre) / width) ** 2));

export default defineThing({
  questions: {
    shape: choice('What shape is the blob?', {
      bean: 'A plump kidney bean, curled slightly around itself.',
      tadpole: 'A round head with a long wavering tail streaming behind it.',
      rag: 'A flat torn rag with lobes and ragged flaps, like a scrap of burnt paper.',
      drop: 'A perfect smooth teardrop, pointed at the top.',
      chain: 'A string of three or four beads of shrinking size joined by thin necks.',
    }),
    fray: score('How frayed is its edge?', ['Knife-sharp, like cut black paper', 'Slightly fuzzy', 'Fringed with fibrils', 'Dissolving into threads and shreds']),
    inside: choice('What can be seen inside it?', {
      nothing: 'Nothing at all: perfectly opaque, giving nothing away.',
      ember: 'A faint warm blush where a star is beginning to form deep inside.',
      twins: 'Two faint blushes side by side: twins forming.',
      breaking: 'A hot point of light burning through the skin, about to break out.',
    }),
    gas: choice('What colour is the bright gas behind it that lights its rim?', GASES),
    doing: choice('What is happening to it?', {
      drifting: 'Just drifting, intact and patient.',
      evaporating: 'Its sunward face is steaming away in pale plumes.',
      splitting: 'It is pinching in the middle, about to divide in two.',
      curling: 'It is curling tighter around whatever it holds, like a fist.',
    }),
    litter: noul('Does a litter of smaller droplets travel with it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const noise = makeNoise(context.seed);
    const fray = clamp01(a.fray * 0.85 + mood.wear * 0.15);
    const gas = new THREE.Color(GAS[a.gas]).lerp(new THREE.Color('#ffffff'), mix(0, 0.2, mood.cheer));
    const ink = new THREE.Color('#07070f').lerp(new THREE.Color('#120806'), mood.warmth);
    const soot = new THREE.Color('#23233a').lerp(new THREE.Color('#3a2218'), mood.warmth);
    const blush = new THREE.Color('#ff6a1f');
    const side = random() < 0.5 ? -1 : 1;
    const sun = vec(-side * 0.75, 0.6, 0.25).normalize();
    const lee = sun.clone().multiplyScalar(-1);
    const dust = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, emissive: gas, emissiveIntensity: 0.012 });
    const rim = rimPaint(gas);
    const halo = hazePaint(gas, 0.16, THREE.BackSide);
    const shade = new THREE.Color();
    const warmSpots: { at: THREE.Vector3; reach: number }[] = [];
    const wobble = (amount: number) => (random() - 0.5) * amount;
    const amp = mix(0.04, 0.2, fray);
    const size = 1.15;

    const dress = (geometry: THREE.BufferGeometry, width: number, parent: THREE.Object3D = s.root, warm = false) => {
      tint(geometry, (p) => {
        shade.copy(ink).lerp(soot, clamp01(0.4 + 0.6 * noise(p.x * 1.5, p.y * 1.5, p.z * 1.5, 3)));
        if (warm) for (const spot of warmSpots) shade.lerp(blush, 0.7 * Math.exp(-((p.distanceTo(spot.at) / spot.reach) ** 2)));
        return shade;
      });
      const body = new THREE.Mesh(geometry, dust);
      body.castShadow = body.receiveShadow = true;
      // The rim is fattest where the body faces the bright gas, so it reads as a lit crescent.
      const edge = new THREE.Mesh(hull(geometry, (_p, n) => width * (0.35 + 1.5 * Math.max(0, n.dot(sun)) ** 1.5)), rim);
      const mist = new THREE.Mesh(hull(geometry, (_p, n) => width * (1.6 + 4 * Math.max(0, n.dot(sun)))), halo);
      parent.add(body, edge, mist);
    };
    const waist = (x: number) => (a.doing === 'splitting' ? 1 - 0.62 * gauss(x, 0.05, 0.3) : 1);
    const lump = (radius: number, shape: (d: THREE.Vector3) => number, warp?: (p: THREE.Vector3) => void) => {
      const offset = random() * 30;
      const geometry = blob(radius, (d) => shape(d) * (1 + amp * noise(d.x * 2.1 + offset, d.y * 2.1, d.z * 2.1, 4) + amp * 0.15 * noise(d.x * 5 + offset, d.y * 5, d.z * 5, 2)), 18);
      if (warp) {
        const position = geometry.getAttribute('position') as THREE.BufferAttribute;
        const p = new THREE.Vector3();
        for (let i = 0; i < position.count; i++) {
          warp(p.fromBufferAttribute(position, i));
          position.setXYZ(i, p.x, p.y, p.z);
        }
        geometry.computeVertexNormals();
      }
      return geometry;
    };

    // Each body is noted so glows, fibrils and plumes can find its surface.
    const bodies: { at: THREE.Vector3; r: number }[] = [];
    const pending: { geometry: THREE.BufferGeometry; width: number }[] = [];
    const curl = a.doing === 'curling' ? 1.9 : 1;
    if (a.shape === 'bean') {
      pending.push({ width: 0.07, geometry: lump(size, (d) => waist(d.x), (p) => { p.x *= 1.55; p.y = p.y * 0.86 + 0.3 * curl * p.x * p.x * 0.42; p.z *= 0.82; }) });
      bodies.push({ at: vec(-0.75, 0.05, 0), r: size * 0.8 }, { at: vec(0.75, 0.05, 0), r: size * 0.8 });
    } else if (a.shape === 'drop') {
      pending.push({ width: 0.07, geometry: lump(size, (d) => (d.y > 0 ? 1 + 1.45 * d.y ** 4 : 1) * (a.doing === 'splitting' ? 1 - 0.55 * gauss(d.y, 0.55, 0.25) : 1), (p) => { p.x += curl > 1 ? 0.25 * p.y * p.y * side : 0; }) });
      bodies.push({ at: vec(0, 0, 0), r: size });
    } else if (a.shape === 'rag') {
      pending.push({ width: 0.06, geometry: lump(size * 1.25, (d) => waist(d.x) * (1 + 0.5 * noise(d.x * 1.3 + 5, d.y * 1.3, d.z * 0.3, 2) + 0.18 * noise(d.x * 3, d.y * 3 + 8, 0, 2)), (p) => { p.z = p.z * 0.2 + 0.22 * curl * Math.sin(p.x * 1.6) + 0.12 * Math.sin(p.y * 2.3); p.x *= 1.15; }) });
      bodies.push({ at: vec(-0.5, 0.1, 0), r: size * 0.7 }, { at: vec(0.55, -0.1, 0), r: size * 0.7 });
      for (let i = 0; i < 4; i++) {
        const from = vec(wobble(2), wobble(1.6), 0);
        const out = vec(wobble(2), wobble(2) - 0.4, wobble(0.6)).normalize();
        const flap = limb([from, from.clone().addScaledVector(out, 0.8).add(vec(0, 0, wobble(0.4))), from.clone().addScaledVector(out, mix(1.3, 2, random()))], { rings: 18, sides: 10, radius: (t) => 0.3 * (1 - t) ** 0.6 + 0.01, rough: (p) => 1 + 0.4 * noise(p.x * 3, p.y * 3, p.z * 3, 2) });
        pending.push({ geometry: flap, width: 0.04 });
      }
    } else if (a.shape === 'tadpole') {
      const head = lump(size * 0.95, (d) => waist(d.x) * (1 + 0.25 * Math.max(0, d.x * side) ** 2));
      pending.push({ geometry: head, width: 0.07 });
      bodies.push({ at: vec(0, 0, 0), r: size * 0.95 });
      const reach = 3.4, wave = mix(0.25, 0.6, mood.energy) * curl;
      const points = [0, 0.25, 0.5, 0.75, 1].map((t) => vec(side * (0.3 + reach * t), 0.15 * t + wave * Math.sin(t * 5 + random()) * t, wave * 0.6 * Math.cos(t * 4) * t));
      const tail = limb(points, { rings: 40, sides: 16, radius: (t) => size * (0.78 * (1 - t) ** 1.4 + 0.02) * (a.doing === 'splitting' ? 1 - 0.7 * gauss(t, 0.3, 0.1) : 1), rough: (p) => 1 + amp * 1.3 * noise(p.x * 2.5, p.y * 2.5, p.z * 2.5, 3) });
      pending.push({ geometry: tail, width: 0.05 });
    } else {
      const beads = 3 + Math.floor(random() * 2);
      let x = 0, y = 0, r = size * 0.85;
      const centres: THREE.Vector3[] = [];
      for (let i = 0; i < beads; i++) {
        const at = vec(x, y, wobble(0.3));
        const bead = lump(r, () => 1);
        bead.translate(at.x, at.y, at.z);
        pending.push({ geometry: bead, width: 0.06 });
        bodies.push({ at, r });
        centres.push(at);
        const gap = a.doing === 'splitting' ? 1.75 : 1.3;
        x += side * r * gap * 1.35;
        y += r * 0.5 * curl + wobble(0.2);
        r *= mix(0.62, 0.78, random());
      }
      if (a.doing !== 'splitting' || beads > 3) pending.push({ width: 0.04, geometry: limb(centres, { rings: 40, sides: 10, radius: (t) => size * mix(0.3, 0.1, t), rough: (p) => 1 + 0.3 * noise(p.x * 3, p.y * 3, p.z * 3, 2) }) });
    }

    // Where the forming star shows through, facing the usual viewpoint.
    const main = bodies[0];
    const toward = vec(0.25 * side, 0.2, 1).normalize();
    const glows: THREE.Object3D[] = [];
    const lantern = (body: { at: THREE.Vector3; r: number }, offset: THREE.Vector3, strength: number) => {
      const at = body.at.clone().addScaledVector(offset, body.r * (a.shape === 'rag' ? 0.3 : 0.86));
      warmSpots.push({ at, reach: body.r * 0.34 });
      const bloom = glow(body.r * 0.5, '#ff7a2a', strength, 4);
      bloom.position.copy(at);
      s.root.add(bloom);
      glows.push(bloom);
      return at;
    };
    if (a.inside === 'ember') lantern(main, toward, 1.1);
    if (a.inside === 'twins') {
      lantern(main, toward.clone().add(vec(-0.42, 0.05, 0)).normalize(), 1);
      lantern(main, toward.clone().add(vec(0.42, -0.08, 0)).normalize(), 0.9);
    }
    if (a.inside === 'breaking') {
      const at = lantern(main, toward, 1.5);
      const spark = star(main.r * 0.13, '#ffb23d', 3.5, 1.4, 6);
      spark.position.copy(at).addScaledVector(toward, main.r * 0.08);
      s.root.add(spark);
      glows.push(spark);
    }
    for (const part of pending) dress(part.geometry, part.width, s.root, true);

    // Fibrils and shreds trail from the side sheltered from the light.
    const fibrils = Math.round(fray * fray * 22);
    for (let i = 0; i < fibrils; i++) {
      const body = bodies[i % bodies.length];
      const out = lee.clone().add(vec(wobble(1.5), wobble(1.5), wobble(1.5))).normalize();
      const from = body.at.clone().addScaledVector(out, body.r * 0.7);
      const reach = body.r * mix(0.5, 1.3, random()) * fray;
      const girth = body.r * mix(0.05, 0.11, random());
      const thread = limb([from, from.clone().addScaledVector(out, reach * 0.6).add(vec(wobble(0.2), wobble(0.2), wobble(0.2))), from.clone().addScaledVector(out, reach).addScaledVector(lee, reach * 0.4)], { rings: 12, sides: 7, radius: (t) => girth * (1 - t) ** 0.7 + 0.004 });
      dress(thread, 0.02);
      if (fray > 0.6 && i % 2 === 0) {
        const shred = blob(girth * mix(0.9, 1.8, random()), (d) => 1 + 0.35 * noise(d.x * 2 + i, d.y * 2, d.z * 2, 2), 5);
        const at = from.clone().addScaledVector(out, reach * 1.25).addScaledVector(lee, reach * mix(0.5, 1.1, random()));
        shred.translate(at.x, at.y, at.z);
        dress(shred, 0.02);
      }
    }

    const drifters: { node: THREE.Object3D; home: THREE.Vector3; phase: number }[] = [];
    if (a.litter) {
      const count = 4 + Math.floor(random() * 3 + mood.density * 4);
      for (let i = 0; i < count; i++) {
        const r = size * mix(0.1, 0.3, random() ** 2);
        const drop = blob(r, (d) => (1 + amp * noise(d.x * 2 + i * 3, d.y * 2, d.z * 2, 2)) * (1 + 0.6 * Math.max(0, d.dot(lee)) ** 3), 10);
        const node = new THREE.Group();
        const angle = random() * Math.PI * 2, distance = size * mix(1.6, 2.6, random());
        node.position.set(Math.cos(angle) * distance + (a.shape === 'tadpole' || a.shape === 'chain' ? side * 1.2 : 0), wobble(2.2), Math.sin(angle) * distance * 0.7);
        dress(drop, 0.035, node);
        s.root.add(node);
        drifters.push({ node, home: node.position.clone(), phase: random() * 6.28 });
      }
    }

    const plumes: { node: THREE.Object3D; phase: number }[] = [];
    if (a.doing === 'evaporating') {
      const paint = hazePaint(gas.clone().lerp(new THREE.Color('#ffffff'), 0.25), 0.4);
      for (let i = 0; i < 9; i++) {
        const body = bodies[i % bodies.length];
        const out = sun.clone().add(vec(wobble(1.3), wobble(1.3), wobble(1.3))).normalize();
        const reach = body.r * mix(0.7, 1.5, random()) * mix(0.8, 1.3, mood.energy);
        const girth = body.r * mix(0.1, 0.2, random());
        const geometry = limb([vec(0, 0, 0), out.clone().multiplyScalar(reach * 0.5), out.clone().multiplyScalar(reach * 0.8).addScaledVector(lee, reach * 0.25).add(vec(0, reach * 0.2, 0)), out.clone().multiplyScalar(reach * 0.9).addScaledVector(lee, reach * 0.8).add(vec(0, reach * 0.45, 0))], { rings: 18, sides: 8, radius: (t) => girth * Math.sin(Math.PI * Math.min(1, t * 1.02)) ** 0.6 * (1 - t * 0.5) + 0.004 });
        const node = new THREE.Group();
        node.add(new THREE.Mesh(geometry, paint));
        node.position.copy(body.at).addScaledVector(out, body.r * 0.75);
        s.root.add(node);
        plumes.push({ node, phase: random() * 6.28 });
      }
    }

    // The bright gas it floats in front of: a soft cloud set behind and to the lit side.
    const cloud = glow(size * 2.5, gas, mix(0.55, 0.95, mood.cheer), 5);
    cloud.position.copy(sun).multiplyScalar(size * 1.2).add(vec(0, 0, -size * 1.1));
    s.root.add(cloud);

    const pace = mix(0.3, 1.8, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const [index, bloom] of glows.entries()) bloom.scale.setScalar(1 + 0.08 * Math.sin(time * pace * 1.3 + index * 2));
        for (const drift of drifters) drift.node.position.y = drift.home.y + 0.07 * Math.sin(time * pace * 0.7 + drift.phase);
        for (const plume of plumes) {
          plume.node.rotation.z = 0.14 * Math.sin(time * pace + plume.phase);
          plume.node.rotation.x = 0.1 * Math.cos(time * pace * 0.8 + plume.phase);
        }
      },
    });
  },
});
