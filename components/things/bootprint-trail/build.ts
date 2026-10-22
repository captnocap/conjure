import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
type Step = { x: number; z: number; heading: number; size: number };

/** A boot sole outline, toe toward +z, as a flat slab. */
function soleGeometry(grow: number, thickness: number) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * Math.PI * 2, along = Math.sin(t);
    const waist = 1 - 0.26 * Math.exp(-(((along + 0.2) / 0.28) ** 2));
    const half = (along > 0 ? 0.074 : 0.062) * waist * grow;
    const x = Math.cos(t) * half, y = -(along * 0.165 * grow + 0.01);
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function treadGeometry() {
  const bars: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) bars.push(new THREE.BoxGeometry(0.108 - Math.abs(i - 2.2) * 0.012, 0.006, 0.014).translate(0, 0, 0.035 + i * 0.024));
  for (let i = 0; i < 3; i++) bars.push(new THREE.BoxGeometry(0.086 - Math.abs(i - 1) * 0.012, 0.006, 0.014).translate(0, 0, -0.085 - i * 0.024));
  const merged = mergeGeometries(bars)!;
  for (const bar of bars) bar.dispose();
  return merged;
}

export default defineThing({
  questions: {
    walkers: choice('How many people walked here?', {
      one: 'One person, alone.',
      pair: 'Two, side by side, keeping step.',
      follower: 'One, with a smaller set of prints keeping close beside them.',
      party: 'A whole party, their prints overlapping into a trodden path.',
    }),
    gait: choice('How were they moving?', {
      walk: 'A steady, unhurried walk.',
      hop: 'Long two-footed bounding hops, the low-gravity lope.',
      shuffle: 'A short tired shuffle, toes dragging grooves between the prints.',
      stagger: 'Staggering, weaving from side to side.',
      run: 'Running: long strides, toes dug in deep.',
    }),
    wander: score('How straight is the trail?', ['Arrow straight, someone who knew where they were going', 'A gentle curve', 'Meandering, stopping, turning']),
    ending: choice('Where does the trail end?', {
      stops: 'It simply stops, mid-stride, with nothing beyond.',
      glove: 'At a dropped glove lying in the dust.',
      kneel: 'At a place where someone knelt: knee hollows, handprints, a little scooped hole.',
      circle: 'In a tight trampled circle of pacing, round and round.',
      crater: 'At the rim of a small, fresh impact crater.',
      wheels: 'Where a pair of wheel tracks begins and carries on instead.',
      returns: 'It turns around and comes back the way it went.',
    }),
    dropped: choice('What was left along the way?', {
      nothing: 'Nothing but the prints.',
      bags: 'A few white sample bags, set down and never collected.',
      tether: 'A safety tether lying slack alongside the prints.',
      markers: 'Little orange route flags on wire stakes.',
      tool: 'A long-handled scoop, dropped across the trail.',
    }),
    dust: choice('What is the dust like?', {
      grey: 'Fine pale grey regolith, the colour of cement.',
      charcoal: 'Dark basalt dust, almost black.',
      rust: 'Red-ochre dust, a different world entirely.',
      frost: 'Powdery white frost over grey.',
      sand: 'Warm tan desert sand.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const base = new THREE.Color({ grey: '#a09c94', charcoal: '#5b5957', rust: '#b06f4c', frost: '#d4dade', sand: '#c9ad82' }[a.dust]);
    base.offsetHSL((mood.warmth - 0.5) * -0.02, 0, 0);
    const soften = mood.wear * 0.3; // old prints lose their contrast
    const shade = (amount: number) => base.clone().multiplyScalar(amount);
    const flat = (colour: THREE.Color) => new THREE.MeshStandardMaterial({ color: colour, roughness: 1 });
    const top = 0.04;

    // --- Walk the paths ------------------------------------------------------------------------
    const stride = { walk: 0.42, hop: 0.86, shuffle: 0.27, stagger: 0.36, run: 0.72 }[a.gait];
    const length = 3.5;
    const spine: { x: number; z: number; heading: number }[] = [];
    const steps: Step[] = [];
    const grooves: { from: P3; to: P3 }[] = [];
    const bend = mix(0.02, 0.5, a.wander), drift = (random() - 0.5) * mix(0.1, 0.9, a.wander);
    {
      let x = 0, z = -length / 2, heading = -drift * 0.5;
      for (let d = 0; d <= length; d += 0.1) {
        spine.push({ x, z, heading });
        heading += (drift * 0.1) / length * 2 + Math.sin(d * 1.7 + drift * 9) * bend * 0.06;
        x += Math.sin(heading) * 0.1; z += Math.cos(heading) * 0.1;
      }
    }
    const tip = spine[spine.length - 1];
    const walk = (offset: number, size: number, from: number, to: number, reverse = false) => {
      const count = Math.floor(((to - from) * length) / stride);
      let last: Step | null = null;
      for (let i = 0; i <= count; i++) {
        const d = from * length + i * stride + (random() - 0.5) * 0.04;
        const node = spine[Math.min(spine.length - 1, Math.max(0, Math.round(d / 0.1)))];
        const sway = a.gait === 'stagger' ? Math.sin(i * 0.9 + offset * 5) * 0.28 : 0;
        const across = offset + sway;
        const cx = node.x + Math.cos(node.heading) * across, cz = node.z - Math.sin(node.heading) * across;
        const heading = node.heading + (reverse ? Math.PI : 0) + (a.gait === 'stagger' ? Math.cos(i * 0.9 + offset * 5) * 0.5 : 0);
        const feet = a.gait === 'hop' ? [-1, 1] : [i % 2 ? 1 : -1];
        for (const foot of feet) {
          const gap = (a.gait === 'hop' ? 0.13 : 0.1) * size * foot;
          const step: Step = { x: cx + Math.cos(heading) * gap, z: cz - Math.sin(heading) * gap, heading: heading + foot * 0.09 + (random() - 0.5) * 0.12, size };
          steps.push(step);
          if (a.gait === 'shuffle' && last && feet.length === 1) grooves.push({ from: [last.x, top + 0.004, last.z], to: [step.x, top + 0.004, step.z] });
          if (feet.length === 1) last = step;
        }
      }
    };
    const reach = a.ending === 'returns' ? 0.8 : 0.94;
    if (a.walkers === 'one') walk(0, 1, 0, reach);
    else if (a.walkers === 'pair') { walk(-0.3, 1, 0, reach); walk(0.3, 0.94, 0.02, reach); }
    else if (a.walkers === 'follower') { walk(-0.2, 1.05, 0, reach); walk(0.26, 0.62, 0.03, reach - 0.02); }
    else for (let i = 0, n = 4 + Math.round(mood.density * 2); i < n; i++) walk((i / (n - 1) - 0.5) * 0.95, mix(0.85, 1.05, random()), random() * 0.06, reach - random() * 0.08);
    if (a.ending === 'returns') {
      // The turn: a few shuffled prints, then a second line heading home.
      for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI; const node = spine[Math.round(reach * length * 10)]; steps.push({ x: node.x + Math.cos(t) * 0.25 + 0.3, z: node.z + Math.sin(t) * 0.3, heading: node.heading + t, size: 1 }); }
      walk(0.62, 1, 0, reach, true);
    }

    // --- The end of the trail ---------------------------------------------------------------------
    const ahead = (forward: number, across = 0): P3 => [tip.x + Math.sin(tip.heading) * forward + Math.cos(tip.heading) * across, top, tip.z + Math.cos(tip.heading) * forward - Math.sin(tip.heading) * across];
    const patches: { x: number; z: number; r: number }[] = spine.filter((_node, i) => i % 3 === 0).map((node) => ({ x: node.x, z: node.z, r: mix(0.78, 1.0, random()) + (a.walkers === 'party' || a.ending === 'returns' ? 0.25 : a.walkers === 'one' ? 0 : 0.1) }));
    const dark = flat(shade(0.5 + soften * 0.3)), darker = flat(shade(0.34 + soften * 0.3)), pale = flat(base.clone().lerp(new THREE.Color('#ffffff'), 0.3 - soften * 0.15));
    let blink: THREE.MeshStandardMaterial | null = null;
    if (a.ending === 'glove') {
      const at = ahead(0.25, 0.12);
      const glove = new THREE.Group();
      const white = s.material('#ecebe5', { roughness: 0.7 }), rubber = s.material('#6f7780', { roughness: 0.8 });
      const part = (geometry: THREE.BufferGeometry, material: THREE.Material, position: P3, rotation: P3 = [0, 0, 0]) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position); mesh.rotation.set(...rotation); mesh.castShadow = true; glove.add(mesh); return mesh; };
      part(new THREE.BoxGeometry(0.13, 0.05, 0.14), white, [0, 0.03, 0]);
      for (let i = 0; i < 4; i++) {
        const curl = 0.25 + random() * 0.5;
        part(new THREE.CapsuleGeometry(0.017, 0.07, 3, 8), white, [-0.048 + i * 0.032, 0.035, 0.105], [Math.PI / 2 - curl * 0.5, 0, 0]);
        part(new THREE.CapsuleGeometry(0.016, 0.03, 3, 8), rubber, [-0.048 + i * 0.032, 0.035 - curl * 0.03, 0.165], [Math.PI / 2 + curl, 0, 0]);
      }
      part(new THREE.CapsuleGeometry(0.019, 0.06, 3, 8), white, [0.085, 0.03, 0.03], [Math.PI / 2, 0, -0.9]);
      part(new THREE.CylinderGeometry(0.075, 0.07, 0.11, 14), white, [0, 0.045, -0.12], [Math.PI / 2, 0, 0]);
      part(new THREE.TorusGeometry(0.076, 0.014, 8, 20), s.material(mood.cheer > 0.5 ? '#c7352b' : '#2f5fa8', { metalness: 0.6, roughness: 0.35 }), [0, 0.045, -0.18]);
      blink = new THREE.MeshStandardMaterial({ color: '#102a10', emissive: '#58ff7a', emissiveIntensity: 1 });
      part(new THREE.BoxGeometry(0.03, 0.012, 0.03), blink, [0.02, 0.06, -0.02]);
      glove.scale.setScalar(1.5);
      glove.position.set(at[0], top, at[2]);
      glove.rotation.y = tip.heading + 0.6 + random() * 1.2;
      s.root.add(glove);
    } else if (a.ending === 'kneel') {
      for (const side of [-1, 1]) {
        s.ball([0.09, 0.012, 0.13], ahead(0.2, side * 0.12), dark, 12).castShadow = false;
        const [hx, , hz] = ahead(0.62, side * 0.2);
        s.ball([0.055, 0.01, 0.06], [hx, top, hz], dark, 10).castShadow = false;
        for (let f = 0; f < 5; f++) { const t = tip.heading + (f - 2) * 0.32 * (f === 0 ? 1.5 : 1); s.ball([0.013, 0.008, 0.04], [hx + Math.sin(t) * 0.1, top, hz + Math.cos(t) * 0.1], dark, 6).rotation.y = t; }
      }
      const hole = ahead(0.95);
      s.cylinder(0.14, 0.14, 0.012, [hole[0], top + 0.002, hole[2]], darker, 16).castShadow = false;
      const spoil = ahead(1.0, 0.32);
      s.ball([0.16, 0.07, 0.13], [spoil[0], top, spoil[2]], pale, 12);
      patches.push({ x: hole[0], z: hole[2], r: 0.8 });
    } else if (a.ending === 'circle') {
      const centre = ahead(0.5);
      for (let lap = 0; lap < 2; lap++) for (let i = 0; i < 11; i++) {
        const t = (i / 11) * Math.PI * 2 + lap * 0.28, r = 0.46 + lap * 0.14 + (i % 2) * 0.1;
        steps.push({ x: centre[0] + Math.cos(t) * r, z: centre[2] + Math.sin(t) * r, heading: -t + (random() - 0.5) * 0.3, size: 1 });
      }
      patches.push({ x: centre[0], z: centre[2], r: 1.15 });
    } else if (a.ending === 'crater') {
      const centre = ahead(0.95);
      const rim = s.ring(0.5, 0.075, [centre[0], top - 0.01, centre[2]], pale);
      rim.rotation.x = Math.PI / 2; rim.scale.z = 0.8;
      s.cylinder(0.47, 0.47, 0.01, [centre[0], top + 0.002, centre[2]], darker, 24).castShadow = false;
      s.cylinder(0.2, 0.2, 0.012, [centre[0] + 0.04, top + 0.003, centre[2] - 0.03], flat(shade(0.2)), 16).castShadow = false;
      for (let i = 0; i < 14; i++) {
        const t = random() * Math.PI * 2, len = mix(0.3, 0.9, random());
        const ray = s.box([0.03, 0.006, len], [centre[0] + Math.sin(t) * (0.6 + len / 2), top + 0.002, centre[2] + Math.cos(t) * (0.6 + len / 2)], pale);
        ray.rotation.y = t; ray.castShadow = false;
      }
      patches.push({ x: centre[0], z: centre[2], r: 1.5 });
    } else if (a.ending === 'wheels') {
      const bars: { at: P3; turn: number }[] = [];
      for (let d = 0.35; d < 2.3; d += 0.075) for (const side of [-0.5, 0.5]) {
        const turn = tip.heading + 0.5 + d * 0.12;
        const p = ahead(0.2 + Math.cos(0.5 + d * 0.06) * d, side + Math.sin(0.5 + d * 0.06) * d);
        bars.push({ at: [p[0], top + 0.004, p[2]], turn });
        if (side > 0 && Math.round(d / 0.075) % 6 === 0) patches.push({ x: p[0] - 0.4, z: p[2], r: 1.05 });
      }
      const tracks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 0.008, 0.04), dark, bars.length);
      const matrix = new THREE.Matrix4();
      bars.forEach((bar, i) => tracks.setMatrixAt(i, matrix.makeRotationY(bar.turn + (i % 4 < 2 ? 0.35 : -0.35)).setPosition(...bar.at)));
      tracks.receiveShadow = true;
      s.root.add(tracks);
    }

    // --- Ground: overlapping pads of dust read as one soft-edged strip ------------------------------
    const ground = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1.03, top, 28), flat(base), patches.length);
    const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    patches.forEach((patch, i) => ground.setMatrixAt(i, matrix.makeScale(patch.r, 1, patch.r).setPosition(patch.x, top / 2, patch.z)));
    ground.receiveShadow = true;
    s.root.add(ground);

    // --- Prints ----------------------------------------------------------------------------------
    const deep = a.gait === 'run' ? 1.25 : 1;
    const layers: [THREE.BufferGeometry, THREE.Material, number][] = [
      [soleGeometry(1.2, 0.006), pale, 0.0005],
      [soleGeometry(1, 0.006), darker, 0.004],
      [treadGeometry(), flat(shade(0.66 + soften * 0.2)), 0.012],
    ];
    for (const [geometry, material, lift] of layers) {
      const mesh = new THREE.InstancedMesh(geometry, material, steps.length);
      steps.forEach((step, i) => mesh.setMatrixAt(i, matrix.compose(new THREE.Vector3(step.x, top + lift, step.z), turn.setFromAxisAngle(up, step.heading), new THREE.Vector3(step.size * 1.25, 1, step.size * deep * 1.25))));
      mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    for (const groove of grooves) s.rod(groove.from, groove.to, 0.012, dark).castShadow = false;

    // Pebbles, and the pocks of slow micrometeorite rain on old ground.
    const node = () => { const patch = patches[Math.floor(random() * patches.length)], t = random() * Math.PI * 2, r = Math.sqrt(random()) * patch.r * 0.92; return [patch.x + Math.cos(t) * r, patch.z + Math.sin(t) * r] as const; };
    s.scatter(new THREE.IcosahedronGeometry(1, 0), flat(shade(0.72)), Array.from({ length: Math.round(mix(14, 60, mood.density)) }, () => { const [x, z] = node(); const size = mix(0.012, 0.05, random() * random()); return { at: [x, top + size * 0.4, z] as P3, size }; }));
    if (mood.wear > 0.3) s.scatter(new THREE.CylinderGeometry(1, 1, 0.1, 10), dark, Array.from({ length: Math.round(mood.wear * 40) }, () => { const [x, z] = node(); return { at: [x, top, z] as P3, size: mix(0.015, 0.05, random()) }; })).castShadow = false;

    // --- Left along the way ------------------------------------------------------------------------
    const beside = (fraction: number, across: number): P3 => { const p = spine[Math.round(fraction * (spine.length - 1))]; return [p.x + Math.cos(p.heading) * across, top, p.z - Math.sin(p.heading) * across]; };
    if (a.dropped === 'bags') {
      const cloth = s.material('#eeece4', { roughness: 0.8 }), label = s.material('#d9532c');
      for (let i = 0, n = 2 + Math.round(mood.density * 3); i < n; i++) {
        const p = beside(mix(0.2, 0.85, random()), (random() < 0.5 ? -1 : 1) * mix(0.45, 0.65, random()));
        const bag = s.ball([0.07, 0.035, 0.1], [p[0], top + 0.03, p[2]], cloth, 10);
        bag.rotation.y = random() * 3;
        s.box([0.05, 0.004, 0.03], [p[0], top + 0.066, p[2]], label).rotation.y = bag.rotation.y;
      }
    } else if (a.dropped === 'tether') {
      const side = random() < 0.5 ? -0.55 : 0.55, points: P3[] = [];
      for (let f = 0.02; f <= 0.9; f += 0.06) { const p = beside(f, side + Math.sin(f * 21) * 0.1); points.push([p[0], top + 0.012, p[2]]); }
      s.tube(points, 0.012, s.material('#e8a21c', { roughness: 0.6 }));
      const end = points[points.length - 1];
      const hook = s.ring(0.035, 0.008, [end[0], top + 0.012, end[2]], s.material('#c9ccce', { metalness: 0.8, roughness: 0.3 }));
      hook.rotation.x = Math.PI / 2;
    } else if (a.dropped === 'markers') {
      const wire = s.material('#c9ccce', { metalness: 0.7, roughness: 0.4 }), pennant = s.material('#f0641e', { side: THREE.DoubleSide });
      for (let i = 0, n = 3 + Math.round(mood.density * 2); i < n; i++) {
        const p = beside(0.08 + (i / n) * 0.84, (i % 2 ? -1 : 1) * 0.55);
        const lean = (random() - 0.5) * mix(0.1, 0.7, mood.wear);
        s.rod([p[0], 0, p[2]], [p[0] + lean * 0.4, 0.42, p[2]], 0.005, wire);
        const tab = s.box([0.11, 0.075, 0.003], [p[0] + lean * 0.4 + 0.055, 0.385, p[2]], pennant);
        tab.rotation.z = -lean * 0.5;
      }
    } else if (a.dropped === 'tool') {
      const p = beside(mix(0.35, 0.6, random()), 0.1), t = random() * Math.PI;
      const metal = s.material('#c9ccce', { metalness: 0.7, roughness: 0.4 });
      s.rod([p[0] - Math.cos(t) * 0.5, top + 0.014, p[2] - Math.sin(t) * 0.5], [p[0] + Math.cos(t) * 0.5, top + 0.014, p[2] + Math.sin(t) * 0.5], 0.012, metal);
      const scoop = s.box([0.1, 0.03, 0.15], [p[0] + Math.cos(t) * 0.56, top + 0.02, p[2] + Math.sin(t) * 0.56], metal);
      scoop.rotation.y = Math.PI / 2 - t;
      s.rod([p[0] - Math.cos(t) * 0.5, top + 0.014, p[2] - Math.sin(t) * 0.5], [p[0] - Math.cos(t) * 0.36, top + 0.014, p[2] - Math.sin(t) * 0.36], 0.018, s.material('#b8552d'));
    }

    return s.finish({ footprint: 2, update: (_dt, time) => { if (blink) blink.emissiveIntensity = Math.sin(time * mix(1, 5, mood.energy)) > 0.7 ? 2.4 : 0.1; } });
  },
});
