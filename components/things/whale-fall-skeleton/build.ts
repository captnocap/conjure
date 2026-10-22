import * as THREE from 'three';
import { choice, clamp01, defineThing, disposeTree, mix, noul, score, visibleBounds } from '@conjure/kit';
import { displace, instances, mat, mesh, noise, paint, range, rod, tube, type Spot, type V3 } from './lib';

// total length m, skull share, cranium [w,h,l], rostrum [w,h,l] in skull-length units, crest, narrow jaw
const WHALE = {
  baleen: { length: 12, skull: 0.3, cranium: [0.52, 0.24, 0.36], rostrum: [0.46, 0.09, 0.8], crest: false, narrow: false },
  sperm: { length: 11, skull: 0.32, cranium: [0.56, 0.42, 0.3], rostrum: [0.5, 0.1, 0.78], crest: true, narrow: true },
  beaked: { length: 5.5, skull: 0.24, cranium: [0.5, 0.36, 0.42], rostrum: [0.16, 0.07, 0.7], crest: false, narrow: true },
  calf: { length: 4.2, skull: 0.32, cranium: [0.56, 0.28, 0.38], rostrum: [0.44, 0.09, 0.72], crest: false, narrow: false },
} as const;
const STAGE = {
  fresh: { bone: '#e8d3c4', stain: '#b98a84', keep: 1 },
  picked: { bone: '#efe9d8', stain: '#d6ccb0', keep: 0.95 },
  sulphur: { bone: '#d9c98a', stain: '#4a4436', keep: 0.72 },
  reef: { bone: '#a9ad9c', stain: '#5d6a5c', keep: 0.45 },
} as const;

export default defineThing({
  questions: {
    whale: choice('What kind of whale was it?', {
      baleen: 'A great baleen whale: a long flat arched upper jaw and two huge bowed jawbones.',
      sperm: 'A sperm whale: a massive basin of a skull with a tall crest and a thin toothed lower jaw.',
      beaked: 'A small beaked whale with a narrow snout, rarely seen alive.',
      calf: 'A calf, small enough to be heartbreaking.',
    }),
    stage: choice('How long has it been down here?', {
      fresh: 'Months: scraps of grey flesh still drape the bones and scavengers are busy.',
      picked: 'A year or two: clean pale bone, stripped and newly colonised.',
      sulphur: 'Decades: bones stained yellow and black, seeping sulphide, crusted with life.',
      reef: 'A century: ribs fallen, bone crumbling into a low mineral reef.',
    }),
    feeders: choice('What is feeding on it?', {
      osedax: 'Bone-eating worms: a red fuzz of tiny plumes along every bone.',
      crabs: 'Pale crabs and squat lobsters picking over it.',
      hagfish: 'Hagfish coiled through the ribs like grey ribbons.',
      mats: 'White and orange bacterial mats spreading over the silt around it.',
      anemones: 'White anemones sitting on the skull and vertebrae like candles.',
      nothing: 'Nothing visible; it lies alone.',
    }),
    buried: score('How buried is it?', ['Resting on top of the ooze', 'Settled ankle-deep', 'Half sunk', 'Only the rib tips and the crown of the skull show']),
    pose: choice('How does it lie?', {
      straight: 'Laid out straight, as it landed.',
      curled: 'Curved in a long arc, as if asleep.',
      scattered: 'Pulled apart: ribs and vertebrae strewn by scavengers and current.',
    }),
    marker: noul('Did an earlier expedition leave a numbered marker beside it?'),
    flipper: noul('Are the finger bones of a flipper still laid out beside the ribs?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group(), bones = new THREE.Group();
    root.add(bones);
    const n = noise(random);
    const spec = WHALE[a.whale], stage = STAGE[a.stage];
    const L = spec.length * range(random, 0.92, 1.08);
    const skullL = L * spec.skull, spineL = L - skullL;
    const boneColour = new THREE.Color(stage.bone), stain = new THREE.Color(stage.stain);
    const bone = mat('#ffffff', { vertexColors: true, roughness: 0.78 });
    const flat = mat(boneColour.clone().lerp(stain, 0.25), { roughness: 0.8 });
    const tint = (p: THREE.Vector3, c: THREE.Color) => { c.copy(boneColour).lerp(stain, clamp01(n(p.x, p.y, p.z, 2.5) * 0.6 + 0.35 + (a.stage === 'sulphur' ? 0.15 : 0))); };
    const ribR = L * 0.125, spineY = ribR * 0.9;
    const scattered = a.pose === 'scattered';
    const sink = a.buried * (scattered ? L * 0.012 : spineY * 0.6);
    const keep = stage.keep * (1 - mood.wear * 0.25) * (scattered ? 0.85 : 1);
    const curl = a.pose === 'curled' ? range(random, 0.9, 1.4) * (random() < 0.5 ? -1 : 1) : range(random, -0.12, 0.12);
    const samples: THREE.Vector3[] = [];

    /** The spine's path from the back of the skull (t = 0) to the tail tip (t = 1). */
    const spine = (t: number) => {
      const angle = t * curl, straight = Math.abs(curl) < 0.02, R = straight ? 0 : spineL / curl;
      const x = straight ? 0 : R * (1 - Math.cos(angle)), z = straight ? -t * spineL : -R * Math.sin(angle);
      const y = spineY * (1 - Math.pow(clamp01((t - 0.5) / 0.45), 1.4) * 0.93) * (scattered ? 0.35 : 1);
      return new THREE.Vector3(x + n(t * 3, 0, 0) * L * 0.006, y, z + spineL / 2 - skullL / 2);
    };
    const heading = (t: number) => -t * curl;

    // Vertebrae with spinous and transverse processes.
    const discs: Spot[] = [], blades: Spot[] = [], wings: Spot[] = [];
    const count = Math.round(26 + L);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      if (random() > keep + 0.25) continue;
      const p = spine(t), yaw = heading(t) + (scattered ? range(random, -1.2, 1.2) : range(random, -0.05, 0.05));
      if (scattered) { p.x += range(random, -1, 1) * L * 0.05; p.z += range(random, -1, 1) * L * 0.03; p.y = L * 0.012; }
      const r = L * mix(0.027, 0.008, Math.pow(t, 1.3)) * (t < 0.08 ? 0.8 : 1);
      const tilt = scattered ? range(random, -0.9, 0.9) : 0;
      discs.push({ at: [p.x, p.y, p.z], scale: [r, spineL / count * 0.8, r], rot: [Math.PI / 2 + tilt, 0, -yaw], color: boneColour.clone().lerp(stain, random() * 0.6) });
      samples.push(p.clone().add(new THREE.Vector3(0, r, 0)));
      if (t < 0.8 && !scattered) {
        const h = r * mix(2.6, 1.2, t);
        blades.push({ at: [p.x, p.y + r + h * 0.4, p.z - r * 0.4], scale: [r * 0.22, h, r * 0.9], rot: [-0.35, yaw, 0], color: boneColour.clone().lerp(stain, random() * 0.5) });
        if (t > 0.52) wings.push({ at: [p.x, p.y, p.z], scale: [r * mix(5.5, 2, (t - 0.52) / 0.3), r * 0.28, r * 0.9], rot: [0, yaw, 0], color: boneColour.clone().lerp(stain, random() * 0.5) });
      }
    }
    const lit = mat('#ffffff', { roughness: 0.78 });
    instances(bones, new THREE.CylinderGeometry(1, 1, 1, 12), lit, discs);
    instances(bones, new THREE.BoxGeometry(1, 1, 1), lit, blades);
    instances(bones, new THREE.BoxGeometry(1, 1, 1), lit, wings);

    // Ribs: arcs from the spine down to the silt on either side.
    const pairs = a.whale === 'beaked' || a.whale === 'calf' ? 10 : 13;
    for (let i = 0; i < pairs; i++) {
      const t = 0.04 + (i / (pairs - 1)) * 0.46;
      const centre = spine(t), yaw = heading(t);
      const size = ribR * (0.72 + 0.28 * Math.sin((i / (pairs - 1)) * Math.PI * 0.85 + 0.35)) * (1 - (i / pairs) * 0.18);
      for (const side of [-1, 1]) {
        const alive = random() < keep;
        const reach = alive ? 1 : range(random, 0.15, 0.5);
        const points: V3[] = [];
        const sweep = -size * 0.35;
        for (let k = 0; k <= 7; k++) {
          const u = (k / 7) * reach, angle = u * Math.PI * 0.62;
          points.push([side * (size * 0.08 + Math.sin(angle) * size * 1.02) * (1 - u * u * 0.12), -(1 - Math.cos(angle)) * size * 0.95 - u * size * 0.12, sweep * u]);
        }
        const thickness = L * 0.0085 * (1 + 0.25 * Math.sin(i));
        const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((q) => new THREE.Vector3(...q))), 16, thickness, 7);
        paint(geometry, (p, c) => { tint(p.clone().add(centre), c); });
        const rib = mesh(bones, geometry, bone);
        if (scattered) {
          rib.position.set(centre.x + range(random, -1, 1) * L * 0.12, L * 0.006, centre.z + range(random, -1, 1) * L * 0.08);
          rib.rotation.set(side * Math.PI / 2 + range(random, -0.15, 0.15), random() * 6.283, 0);
        } else {
          rib.position.copy(centre);
          rib.rotation.set(range(random, -0.06, 0.06), yaw, side * range(random, -0.02, 0.1));
        }
        rib.updateMatrixWorld(true);
        for (const k of [2, 4, 6]) if (k / 7 <= reach) samples.push(rib.localToWorld(new THREE.Vector3(...points[k])));
        if (!alive && !scattered) {
          // The broken length lies where it fell.
          const fallen = rod(bones, [0, 0, -size * 0.5], [0, 0, size * 0.5], thickness, flat, thickness * 0.6, 6);
          fallen.position.set(centre.x + side * size * range(random, 0.7, 1.4), sink + thickness * 0.6, centre.z + range(random, -1, 1) * size * 0.4);
          fallen.rotation.y = random() * 6.283;
        }
      }
    }

    // Skull.
    const skull = new THREE.Group();
    const [cw, ch, cl] = spec.cranium.map((v) => v * skullL), [rw, rh, rl] = spec.rostrum.map((v) => v * skullL);
    const cranium = displace(new THREE.SphereGeometry(1, 28, 18), (p) => n(p.x, p.y, p.z, 2) * 0.06 - (Math.abs(p.x) > 0.55 && p.y < 0.3 && p.z > -0.2 ? 0.12 : 0));
    paint(cranium, tint);
    mesh(skull, cranium, bone, [0, ch * 0.45, -cl * 0.1], [cw * 0.5, ch * 0.5, cl * 0.6]);
    // Rostrum: a long tapering arched blade.
    const rost = new THREE.SphereGeometry(1, 24, 14);
    const rp = rost.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const z = rp.getZ(i), u = (z + 1) / 2, taper = Math.pow(1 - u, spec.narrow && !spec.crest ? 0.45 : 0.75) * 0.9 + 0.1;
      rp.setXYZ(i, rp.getX(i) * taper * Math.max(rw, cw * 0.8) * 0.5 * (1 + (spec.crest ? 0 : 0.12 * Math.sin(u * 3))), rp.getY(i) * rh * 0.5 * (0.6 + taper * 0.6) + Math.sin(u * Math.PI) * rh * 0.6, (z + 1) * (rl + cl * 0.45) * 0.5);
    }
    rost.computeVertexNormals();
    paint(rost, tint);
    mesh(skull, rost, bone, [0, ch * 0.3, -cl * 0.25]);
    if (spec.crest) {
      // Sperm whale: the amphitheatre wall behind the basin.
      const wall = new THREE.CylinderGeometry(cw * 0.55, cw * 0.5, ch * 0.9, 20, 1, true, Math.PI * 0.5, Math.PI);
      paint(wall, tint);
      const crest = mesh(skull, wall, bone, [0, ch * 0.75, cl * 0.05]);
      (crest.material as THREE.Material) = mat('#ffffff', { vertexColors: true, roughness: 0.78, side: THREE.DoubleSide });
    }
    const socket = mat('#4a4038', { roughness: 1 });
    for (const side of [-1, 1]) mesh(skull, new THREE.SphereGeometry(1, 12, 8), socket, [side * cw * 0.45, ch * 0.34, cl * 0.12], [cw * 0.05, ch * 0.13, cl * 0.13]);
    for (const side of [-1, 1]) mesh(skull, new THREE.SphereGeometry(1, 10, 6), socket, [side * rw * 0.07, ch * 0.32 + rh * 1.05, cl * 0.2 + rl * 0.12], [rw * 0.035, rh * 0.25, rl * 0.07]);
    // Jawbones.
    if (spec.narrow) {
      const jaw: V3[] = [[0, rh * 0.5, rl * 0.98 + cl * 0.2], [0, rh * 0.4, rl * 0.4 + cl * 0.2]];
      const j = tube(skull, jaw, rw * 0.09 + skullL * 0.012, flat, 6);
      j.position.x = cw * range(random, 0.2, 0.5); j.rotation.y = range(random, 0.1, 0.4);
      for (const side of [-1, 1]) tube(skull, [[0, rh * 0.4, rl * 0.4 + cl * 0.2], [side * cw * 0.25, rh * 0.5, cl * 0.2], [side * cw * 0.42, ch * 0.3, -cl * 0.1]], skullL * 0.014, flat, 6).position.copy(j.position);
      if (spec.crest) {
        const teeth: Spot[] = [];
        for (let k = 0; k < 12; k++) for (const side of [-1, 1]) teeth.push({ at: [j.position.x + side * skullL * 0.012 + (rl * (0.42 + k * 0.045)) * Math.sin(j.rotation.y), rh * 0.55 + skullL * 0.02, cl * 0.2 + rl * (0.42 + k * 0.045) * Math.cos(j.rotation.y)], scale: [skullL * 0.008, skullL * 0.03, skullL * 0.008] });
        instances(skull, new THREE.ConeGeometry(1, 1, 6), mat('#f4efdc', { roughness: 0.4 }), teeth);
      }
    } else for (const side of [-1, 1]) {
      const drift = side * range(random, 0.05, 0.3) * skullL;
      tube(skull, [[side * cw * 0.5 + drift, skullL * 0.03, -cl * 0.2], [side * (rw * 0.9 + cw * 0.25) + drift, skullL * 0.035, rl * 0.3], [side * rw * 0.75 + drift, skullL * 0.03, rl * 0.75], [side * rw * 0.1 + drift * 0.6, skullL * 0.025, rl * 1.08 + cl * 0.2]], skullL * 0.028, flat, 7);
    }
    const head = spine(0);
    skull.position.set(head.x + (scattered ? range(random, -1, 1) * L * 0.06 : 0), 0, head.z + cl * 0.55);
    skull.rotation.set(range(random, -0.03, 0.06), heading(0) + (scattered ? range(random, -0.9, 0.9) : range(random, -0.12, 0.12)), range(random, -0.12, 0.12) + (scattered ? 0.4 : 0));
    bones.add(skull);
    skull.traverse((node) => { if ((node as THREE.Mesh).isMesh) node.castShadow = node.receiveShadow = true; });
    skull.updateMatrixWorld(true);
    for (let k = 0; k < 10; k++) samples.push(skull.localToWorld(new THREE.Vector3(range(random, -0.3, 0.3) * cw, ch * range(random, 0.75, 0.98), range(random, -0.2, 0.3) * cl)));
    for (let k = 0; k < 6; k++) samples.push(skull.localToWorld(new THREE.Vector3(range(random, -0.2, 0.2) * rw, ch * 0.32 + rh * 1.0, cl * 0.2 + rl * range(random, 0.15, 0.8))));

    if (a.flipper) {
      const origin = spine(0.1), side = random() < 0.5 ? -1 : 1, yaw = heading(0.1) + side * range(random, 0.9, 1.3);
      const g = new THREE.Group(), u = L * 0.012;
      rod(g, [0, 0, 0], [0, 0, u * 6], u * 1.1, flat, u * 0.9, 7);
      for (const off of [-1, 1]) rod(g, [off * u * 0.9, 0, u * 6.6], [off * u * 1.4, 0, u * 11], u * 0.7, flat, u * 0.6, 6);
      for (let f = 0; f < 4; f++) for (let k = 0; k < 4 - Math.abs(f - 1.5) * 0.9; k++) {
        const spreadAngle = (f - 1.5) * 0.2;
        rod(g, [Math.sin(spreadAngle) * (u * 12 + k * u * 3.2) + (f - 1.5) * u, 0, u * 12 + Math.cos(spreadAngle) * k * u * 3.2], [Math.sin(spreadAngle) * (u * 14.4 + k * u * 3.2) + (f - 1.5) * u, 0, u * 12 + Math.cos(spreadAngle) * (k * u * 3.2 + u * 2.4)], u * 0.42, flat, u * 0.34, 5);
      }
      g.position.set(origin.x + side * ribR * 0.9, sink + u * 0.8, origin.z);
      g.rotation.y = yaw + (side > 0 ? 0 : Math.PI) * 0 + (side > 0 ? 0.6 : -0.6);
      bones.add(g);
      g.traverse((node) => { if ((node as THREE.Mesh).isMesh) node.castShadow = node.receiveShadow = true; });
    }

    // Fresh: the last of the body, sagging over the rear ribs.
    if (a.stage === 'fresh' && !scattered) {
      const flesh = mat('#8d7f86', { roughness: 0.55 });
      for (const t of [0.2, 0.36, 0.5]) {
        const p = spine(t), s = ribR * mix(0.72, 0.5, (t - 0.2) / 0.3);
        const blob = displace(new THREE.SphereGeometry(1, 20, 12), (q) => n(q.x + t * 9, q.y, q.z, 2.2) * 0.22);
        paint(blob, (q, c) => { c.set('#6f6470').lerp(new THREE.Color('#a8787c'), clamp01(n(q.x, q.y + t * 5, q.z, 3) + 0.2)); });
        mesh(bones, blob, mat('#ffffff', { vertexColors: true, roughness: 0.5 }), [p.x, p.y * 0.3, p.z], [s, Math.max(p.y, ribR * 0.3) * 0.5, L * 0.085], [0, heading(t), 0]);
      }
      flesh.dispose();
    }

    bones.position.y = -sink;
    bones.updateMatrixWorld(true);
    const lifted = samples.map((p) => p.clone().setY(p.y - sink)).filter((p) => p.y > 0.03);

    // The ooze it lies in: a low drifted mound that swallows whatever has sunk.
    const box = visibleBounds(bones), centre = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const ooze = displace(new THREE.SphereGeometry(1, 40, 14, 0, 6.2832, 0, Math.PI / 2), (p) => n(p.x, p.y, p.z, 2.6) * 0.07);
    paint(ooze, (p, c) => { c.set('#9a9c9c').lerp(new THREE.Color(a.stage === 'sulphur' ? '#3c3a34' : '#6f7479'), clamp01(1.1 - Math.hypot(p.x, p.z) * 1.2 + n(p.x, 0, p.z, 4) * 0.25) * (a.stage === 'sulphur' || a.stage === 'fresh' ? 0.8 : 0.3)); });
    mesh(root, ooze, mat('#ffffff', { vertexColors: true, roughness: 1 }), [centre.x, -0.02, centre.z], [size.x * 0.5 + L * 0.03, L * 0.01 + sink * 0.12, size.z * 0.5 + L * 0.03]);
    const onSilt = (): V3 => { const angle = random() * 6.283, d = Math.sqrt(random()) * 0.9; return [centre.x + Math.cos(angle) * d * (size.x * 0.5 + L * 0.02), L * 0.012, centre.z + Math.sin(angle) * d * (size.z * 0.5 + L * 0.02)]; };
    const crowd = mix(0.45, 1.5, mood.density);

    // Feeders.
    const movers: { object: THREE.Object3D; phase: number }[] = [];
    if (a.feeders === 'osedax') {
      const tufts: Spot[] = [];
      for (const p of lifted) for (let k = 0; k < Math.round(7 * crowd); k++) {
        const s = L * range(random, 0.0022, 0.0045);
        tufts.push({ at: [p.x + range(random, -1, 1) * L * 0.012, p.y + s * 1.5, p.z + range(random, -1, 1) * L * 0.012], scale: [s * 0.7, s * 2.4, s * 0.7], rot: [range(random, -0.5, 0.5), 0, range(random, -0.5, 0.5)], color: random() < 0.75 ? '#d7262f' : '#ff7a6a' });
      }
      instances(root, new THREE.SphereGeometry(1, 6, 5), mat('#ffffff', { roughness: 0.6, emissive: '#5a0a0e', emissiveIntensity: 0.6 }), tufts);
    } else if (a.feeders === 'crabs') {
      const shells: Spot[] = [], legs: Spot[] = [];
      const total = Math.round(16 * crowd);
      for (let k = 0; k < total; k++) {
        const on = k % 3 === 0 && lifted.length ? lifted[Math.floor(random() * lifted.length)] : null;
        const at = on ? [on.x, on.y + L * 0.006, on.z] as const : onSilt(), s = L * range(random, 0.011, 0.018), yaw = random() * 6.283;
        shells.push({ at, scale: [s, s * 0.5, s * 0.8], rot: [0, yaw, 0] });
        for (const side of [-1, 1]) for (const f of [-0.6, 0, 0.6]) legs.push({ at: [at[0] + Math.cos(yaw) * side * s * 1.3 + Math.sin(yaw) * f * s, at[1] - s * 0.1, at[2] - Math.sin(yaw) * side * s * 1.3 + Math.cos(yaw) * f * s], scale: [s * 0.75, s * 0.14, s * 0.14], rot: [0, yaw + f * side * 0.5, side * -0.5] });
      }
      instances(root, new THREE.SphereGeometry(1, 10, 8), mat('#f3e8da', { roughness: 0.45 }), shells);
      instances(root, new THREE.BoxGeometry(2, 1, 1), mat('#e8c9b6', { roughness: 0.5 }), legs);
    } else if (a.feeders === 'hagfish') {
      const slime = mat('#b99aa6', { roughness: 0.35 });
      for (let k = 0; k < Math.round(5 * crowd) + 1; k++) {
        const t = range(random, 0.05, 0.5), p = spine(t), side = random() < 0.5 ? -1 : 1, len = L * range(random, 0.07, 0.11);
        const points: V3[] = [];
        const yaw = random() * 6.283;
        for (let j = 0; j <= 6; j++) { const u = j / 6; points.push([p.x + side * ribR * 0.5 + Math.cos(yaw + u * 2.4) * len * u * 0.6, Math.max(L * 0.016, (p.y - sink) * 0.5 * Math.sin(u * Math.PI) * range(random, 0.3, 1)), p.z + Math.sin(yaw + u * 2.4) * len * u * 0.6]); }
        const eel = tube(root, points, L * 0.0065, slime, 7, 24);
        movers.push({ object: eel, phase: random() * 6 });
      }
    } else if (a.feeders === 'mats') {
      const patches: Spot[] = [];
      for (let k = 0; k < Math.round(34 * crowd); k++) {
        const at = onSilt(), s = L * range(random, 0.02, 0.06);
        patches.push({ at: [at[0], L * 0.012, at[2]], scale: [s, L * 0.004, s * range(random, 0.5, 1)], rot: [0, random() * 3, 0], color: random() < 0.3 ? '#e9a13a' : '#f4f2e6' });
      }
      instances(root, new THREE.SphereGeometry(1, 10, 6), mat('#ffffff', { roughness: 1 }), patches);
    } else if (a.feeders === 'anemones') {
      const stalks: Spot[] = [], crowns: Spot[] = [];
      for (const p of lifted.filter(() => random() < 0.5 * crowd)) {
        const s = L * range(random, 0.007, 0.013);
        stalks.push({ at: [p.x, p.y + s * 1.2, p.z], scale: [s, s * 2.6, s] });
        crowns.push({ at: [p.x, p.y + s * 2.7, p.z], scale: [s * 2.1, s * 0.8, s * 2.1], rot: [0, random() * 3, 0] });
      }
      instances(root, new THREE.CylinderGeometry(0.8, 1, 1, 8), mat('#f3efe6', { roughness: 0.6 }), stalks);
      instances(root, new THREE.ConeGeometry(1, 1, 10, 1, true).rotateX(Math.PI), mat('#fff6ee', { roughness: 0.6, side: THREE.DoubleSide, emissive: '#6a5a50', emissiveIntensity: 0.4 }), crowns);
    }

    if (a.marker) {
      const at = onSilt(), h = Math.min(1.1, L * 0.09);
      const post = new THREE.Group();
      rod(post, [0, 0, 0], [0, h, 0], h * 0.02, mat('#d8d8d2', { metalness: 0.5, roughness: 0.4 }));
      mesh(post, new THREE.SphereGeometry(h * 0.13, 14, 10), mat('#f2b417', { roughness: 0.4, emissive: '#6a4a00', emissiveIntensity: 0.4 }), [0, h, 0]);
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#f4f1e4'; ctx.fillRect(0, 0, 128, 64); ctx.fillStyle = '#1c2a33'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`WF${10 + Math.floor(random() * 89)}`, 64, 34);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      mesh(post, new THREE.BoxGeometry(h * 0.34, h * 0.17, h * 0.015), [mat('#f4f1e4'), mat('#f4f1e4'), mat('#f4f1e4'), mat('#f4f1e4'), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 })] as unknown as THREE.Material, [0, h * 0.62, 0]);
      post.position.set(centre.x + size.x * 0.5 + L * 0.03, 0, centre.z + range(random, -0.2, 0.3) * size.z);
      post.rotation.set(range(random, -0.12, 0.12), range(random, -0.5, 0.5), range(random, -0.12, 0.12));
      root.add(post);
    }

    // Centre on the origin without lifting: what has sunk stays under y = 0.
    const all = visibleBounds(root), mid = all.getCenter(new THREE.Vector3());
    root.position.set(-mid.x, 0, -mid.z);
    const energy = mix(0.2, 1.5, mood.energy);
    return {
      object: root,
      update: movers.length ? (_dt, time) => { for (const m of movers) { m.object.position.y = Math.sin(time * energy + m.phase) * L * 0.002; m.object.rotation.y = Math.sin(time * 0.6 * energy + m.phase) * 0.03; } } : undefined,
      dispose: () => disposeTree(root),
    };
  },
});
