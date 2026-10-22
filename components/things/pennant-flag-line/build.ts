import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const PALETTES = {
  rainbow: ['#e3342f', '#ffcf1f', '#2f9e44', '#1f6fd8', '#ff7a1a', '#b146c2'],
  patriotic: ['#d22b2b', '#f5f2ea', '#22459c'],
  hotrod: ['#e3342f', '#ffcf1f'],
  checkered: ['#17181b', '#f5f2ea'],
  candy: ['#ff5fa8', '#35c6d6', '#fff07a', '#f5f2ea'],
  green: ['#1f8f4a', '#f5f2ea', '#f2c218'],
} as const;

type Path = (t: number) => THREE.Vector3;

export default defineThing({
  questions: {
    palette: choice('What colours are the pennants?', {
      rainbow: 'Every colour in turn: red, yellow, green, blue, orange, purple.',
      patriotic: 'Red, white and blue.',
      hotrod: 'Alternating red and yellow, loud as a clearance sale.',
      checkered: 'Black and white, like a racing flag.',
      candy: 'Pink, turquoise and pale yellow, a birthday or ice-cream stand.',
      green: 'Green, white and gold, money colours.',
    }),
    shape: choice('What shape are the flags?', {
      triangle: 'Classic long triangles pointing down.',
      swallowtail: 'Forked swallowtail pennants.',
      square: 'Small square flags.',
      streamer: 'Long narrow ribbons that trail and twist.',
    }),
    rigging: choice('How are the lines strung?', {
      single: 'One line sagging between the two pole tops.',
      double: 'Two lines, one high and one sagging low beneath it.',
      cross: 'Lines from each pole top running down to stakes on the ground, crossing like a tent.',
      web: 'A dense fan of lines from both poles, a canopy of flags.',
    }),
    fringe: choice('Is there metallic fringe?', {
      none: 'No fringe, flags only.',
      silver: 'A line of shimmering silver foil fringe.',
      gold: 'A line of gold foil fringe.',
      holo: 'Rainbow holographic tinsel.',
    }),
    state: choice('What has happened to it?', {
      crisp: 'Hung this morning: every flag present, lines taut.',
      seasoned: 'Up for a few summers: a few flags missing, some curled.',
      snapped: 'One line has snapped and hangs down a pole to the ground.',
      shredded: 'Wind-shredded to threads: gaps, tatters and bare cord.',
    }),
    poles: choice('What are the poles?', {
      steel: 'Plain galvanised steel poles bolted to plates.',
      tyre: 'Pipes set in concrete-filled tyres, movable and makeshift.',
      wood: 'Weathered wooden posts, leaning a little.',
      striped: 'Red-and-white striped poles with gold ball finials.',
    }),
    topper: choice('What is at the top of the poles?', {
      nothing: 'Nothing but the line.',
      balloons: 'Bunches of balloons.',
      floods: 'Lot floodlights on short arms.',
      flags: 'A small flag on each.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const half = 2.7, height = 4.0;
    const fade = (a.state === 'shredded' ? 0.35 : a.state === 'seasoned' ? 0.15 : 0) + mood.wear * 0.2;
    const colours = PALETTES[a.palette].map((hex) => {
      const c = new THREE.Color(hex);
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      return c.setHSL(hsl.h, hsl.s * mix(0.8, 1, mood.cheer) * (1 - fade * 0.55), mix(hsl.l, 0.74, fade * 0.45));
    });
    const steel = s.material('#aeb4b6', { metalness: 0.7, roughness: 0.4 });
    const dark = s.material('#1d1e20', { roughness: 0.9 });

    // ---- poles ----------------------------------------------------------------
    const tops: THREE.Vector3[] = [];
    for (const side of [-1, 1]) {
      const lean = a.poles === 'wood' ? (random() - 0.5) * 0.14 : a.poles === 'tyre' ? (random() - 0.5) * 0.06 : 0;
      const x = side * half;
      const top = new THREE.Vector3(x + Math.sin(lean) * height, Math.cos(lean) * height, 0);
      tops.push(top);
      if (a.poles === 'striped') {
        const bands = 10;
        for (let i = 0; i < bands; i++) s.cylinder(0.055, 0.055, height / bands, [x, (i + 0.5) * height / bands, 0], s.material(i % 2 ? '#f5f2ea' : '#d22b2b'), 12);
        s.ball([0.11, 0.11, 0.11], [x, height + 0.08, 0], s.material('#e0b22a', { metalness: 0.8, roughness: 0.3 }), 14);
        s.cylinder(0.2, 0.24, 0.08, [x, 0.04, 0], steel, 16);
      } else {
        const material = a.poles === 'wood' ? s.material('#8a6a48', { roughness: 0.95 }) : steel;
        s.rod([x, 0, 0], top.toArray() as [number, number, number], a.poles === 'wood' ? 0.075 : 0.045, material, a.poles === 'wood' ? 0.06 : 0.04);
        if (a.poles === 'tyre') {
          const tyre = s.ring(0.25, 0.1, [x, 0.1, 0], dark);
          tyre.rotation.x = Math.PI / 2;
          s.cylinder(0.24, 0.24, 0.16, [x, 0.09, 0], s.material('#b5b1a6', { roughness: 1 }), 16);
        } else if (a.poles === 'steel') {
          s.box([0.34, 0.03, 0.34], [x, 0.015, 0], steel);
          for (const bx of [-1, 1]) for (const bz of [-1, 1]) s.cylinder(0.02, 0.02, 0.03, [x + bx * 0.12, 0.04, bz * 0.12], dark, 6);
        }
      }
      if (a.topper === 'balloons') {
        const n = 3 + Math.floor(random() * 3);
        for (let i = 0; i < n; i++) {
          const at: [number, number, number] = [top.x + (random() - 0.5) * 0.5, top.y + 0.25 + random() * 0.55, (random() - 0.5) * 0.5];
          s.ball([0.15, 0.19, 0.15], at, new THREE.MeshStandardMaterial({ color: colours[i % colours.length], roughness: 0.25, emissive: colours[i % colours.length], emissiveIntensity: 0.12 }), 12);
          s.rod(top.toArray() as [number, number, number], [at[0], at[1] - 0.18, at[2]], 0.004, dark);
        }
      } else if (a.topper === 'floods') {
        s.rod(top.toArray() as [number, number, number], [top.x - side * 0.45, top.y + 0.1, 0.1], 0.025, steel);
        const lamp = s.box([0.34, 0.2, 0.14], [top.x - side * 0.5, top.y + 0.05, 0.14], dark);
        lamp.rotation.x = 0.6;
        const glass = s.box([0.3, 0.16, 0.02], [top.x - side * 0.5, top.y + 0.01, 0.2], s.material('#fff6cf', { emissive: '#ffefb0', emissiveIntensity: mix(1.4, 0.2, Math.sin(mood.daylight * Math.PI)) }));
        glass.rotation.x = 0.6;
      } else if (a.topper === 'flags') {
        s.rod(top.toArray() as [number, number, number], [top.x, top.y + 0.5, 0], 0.012, steel);
        const flag = s.box([0.42, 0.26, 0.008], [top.x + 0.22, top.y + 0.36, 0], new THREE.MeshStandardMaterial({ color: colours[0], roughness: 0.7, side: THREE.DoubleSide }));
        flag.rotation.y = (random() - 0.5) * 0.8;
      }
    }

    // ---- lines ----------------------------------------------------------------
    const sagLine = (from: THREE.Vector3, to: THREE.Vector3, sag: number): Path => (t) =>
      from.clone().lerp(to, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0));
    const lines: { path: Path; length: number; fringe?: boolean; broken?: boolean }[] = [];
    const [left, right] = tops;
    const down = (v: THREE.Vector3, dy: number) => v.clone().add(new THREE.Vector3(0, -dy, 0));
    const stake = (x: number, z: number) => new THREE.Vector3(x, 0.03, z);
    const span = left.distanceTo(right);
    if (a.rigging === 'single' || a.rigging === 'double' || a.rigging === 'web') lines.push({ path: sagLine(down(left, 0.08), down(right, 0.08), 0.75), length: span * 1.05 });
    if (a.rigging === 'double' || a.rigging === 'web') lines.push({ path: sagLine(down(left, 0.7), down(right, 0.7), 1.25), length: span * 1.1 });
    if (a.rigging === 'cross' || a.rigging === 'web') {
      for (const [from, sx] of [[left, 1], [right, -1]] as const) {
        for (const z of a.rigging === 'web' ? [-1.5, 1.5] : [1.3, -1.3]) {
          const end = stake(sx * (a.rigging === 'web' ? half * 0.25 : half * 0.75), z * sx * (a.rigging === 'web' ? 1 : 1));
          lines.push({ path: sagLine(down(from, 0.12), end, 0.3), length: from.distanceTo(end) });
          s.rod([end.x, 0, end.z], [end.x + (random() - 0.5) * 0.06, 0.16, end.z], 0.015, steel);
        }
      }
      if (a.rigging === 'cross') lines.push({ path: sagLine(down(left, 0.08), down(right, 0.08), 0.6), length: span * 1.04 });
    }
    if (a.fringe !== 'none') {
      const target = lines.find((line) => line.length > span) ?? lines[0];
      lines.push({ path: sagLine(down(left, 0.4), down(right, 0.4), a.rigging === 'single' ? 1.3 : 0.95), length: target.length, fringe: true });
    }
    if (a.state === 'snapped' || (a.state === 'shredded' && random() < 0.6)) {
      // the first full span lets go at the right pole and hangs down the left one
      const victim = lines[0];
      const drop = down(left, 0.08);
      const foot = new THREE.Vector3(left.x + 0.25, 0.04, 0.2);
      const trail = new THREE.Vector3(left.x + 1.2 + random() * 0.8, 0.03, 0.5 + random() * 0.6);
      victim.path = (t) => (t < 0.7 ? drop.clone().lerp(foot, t / 0.7).add(new THREE.Vector3(Math.sin(t * 9) * 0.06, 0, Math.sin(t * 5) * 0.08)) : foot.clone().lerp(trail, (t - 0.7) / 0.3));
      victim.broken = true;
      // a short tail still tied to the other pole
      const stub = down(right, 0.08);
      lines.push({ path: (t) => stub.clone().add(new THREE.Vector3(-0.1 * t, -1.1 * t, 0.05 * t)), length: 1.1, broken: true });
    }

    const cord = s.material('#e8e4d8', { roughness: 0.9 });
    for (const line of lines) {
      const pts = Array.from({ length: 17 }, (_unused, i) => line.path(i / 16).toArray() as [number, number, number]);
      s.tube(pts, 0.016, cord);
    }

    // ---- flags, instanced -------------------------------------------------------
    const w = a.shape === 'square' ? 0.46 : a.shape === 'streamer' ? 0.14 : 0.5;
    const h = a.shape === 'square' ? 0.46 : a.shape === 'streamer' ? 1.05 : 0.78;
    const outline = new THREE.Shape();
    outline.moveTo(-w / 2, 0);
    outline.lineTo(w / 2, 0);
    if (a.shape === 'triangle') outline.lineTo(0, -h);
    else if (a.shape === 'swallowtail') { outline.lineTo(w / 2, -h); outline.lineTo(0, -h * 0.62); outline.lineTo(-w / 2, -h); }
    else { outline.lineTo(w / 2, -h); outline.lineTo(-w / 2, -h); }
    const flagGeometry = new THREE.ShapeGeometry(outline);
    const stripGeometry = new THREE.PlaneGeometry(0.045, 0.4).translate(0, -0.2, 0);
    const flagMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.0 });
    const foil = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide });

    type Leaf = { at: THREE.Vector3; yaw: number; tilt: number; phase: number; sx: number; sy: number; colour: THREE.Color; gain: number };
    const flags: Leaf[] = [], strips: Leaf[] = [];
    const missing = a.state === 'crisp' ? 0 : a.state === 'seasoned' ? 0.14 : a.state === 'snapped' ? 0.1 : 0.45;
    const spacing = (a.shape === 'streamer' ? 0.27 : 0.55) * mix(1.25, 0.92, mood.density);
    let counter = Math.floor(random() * 6);
    for (const line of lines) {
      const tangentAt = (t: number) => line.path(Math.min(1, t + 0.01)).sub(line.path(Math.max(0, t - 0.01)));
      if (line.fringe) {
        const n = Math.floor(line.length / 0.045);
        const holo = ['#ff5fa8', '#35c6d6', '#fff07a', '#9d6bff', '#7dff9a'];
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          if (a.state === 'shredded' && random() < 0.5) continue;
          const tangent = tangentAt(t);
          strips.push({ at: line.path(t), yaw: Math.atan2(-tangent.z, tangent.x), tilt: (random() - 0.5) * 0.5, phase: random() * 6.28, sx: 1, sy: 0.7 + random() * 0.6,
            colour: new THREE.Color(a.fringe === 'silver' ? '#e4e8ec' : a.fringe === 'gold' ? '#e9bb35' : holo[Math.floor(random() * holo.length)]), gain: 1.5 });
        }
        continue;
      }
      const n = Math.max(2, Math.floor(line.length / spacing));
      for (let i = 0; i < n; i++) {
        const colour = colours[counter++ % colours.length];
        if (random() < missing) continue;
        const t = (i + 0.5) / n;
        const tangent = tangentAt(t);
        const steep = Math.abs(tangent.y) / Math.max(tangent.length(), 1e-6);
        const tattered = a.state === 'shredded' && random() < 0.6;
        flags.push({ at: line.path(t), yaw: Math.atan2(-tangent.z, tangent.x) + (line.broken ? random() * 3 : 0), tilt: (random() - 0.5) * mix(0.3, 0.9, mood.energy) + (a.state === 'seasoned' ? (random() - 0.5) * 0.5 : 0), phase: random() * 6.28,
          sx: (tattered ? 0.2 + random() * 0.4 : 1) * mix(1, 0.7, steep), sy: tattered ? 0.4 + random() * 0.5 : 1, colour, gain: 1 });
        if (tattered) for (let k = 0; k < 2; k++) strips.push({ at: line.path(t).add(new THREE.Vector3((random() - 0.5) * 0.1, 0, 0)), yaw: random() * 3, tilt: (random() - 0.5), phase: random() * 6.28, sx: 0.4, sy: 0.6 + random(), colour, gain: 1.6 });
      }
    }

    const dummy = new THREE.Object3D();
    dummy.rotation.order = 'YXZ';
    const amplitude = mix(0.05, 0.55, mood.energy);
    const speed = mix(1, 7, mood.energy);
    const makeSet = (leaves: Leaf[], geometry: THREE.BufferGeometry, material: THREE.Material) => {
      if (!leaves.length) { geometry.dispose(); material.dispose(); return () => {}; }
      const mesh = new THREE.InstancedMesh(geometry, material, leaves.length);
      mesh.castShadow = true;
      leaves.forEach((leaf, index) => mesh.setColorAt(index, leaf.colour));
      const pose = (time: number) => {
        leaves.forEach((leaf, index) => {
          dummy.position.copy(leaf.at);
          dummy.rotation.set(leaf.tilt + Math.sin(time * speed + leaf.phase) * amplitude * leaf.gain, leaf.yaw + Math.cos(time * speed * 0.7 + leaf.phase) * amplitude * 0.4, 0);
          dummy.scale.set(leaf.sx, leaf.sy, 1);
          dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      };
      pose(0);
      mesh.frustumCulled = false;
      s.root.add(mesh);
      return pose;
    };
    const poseFlags = makeSet(flags, flagGeometry, flagMaterial);
    const poseStrips = makeSet(strips, stripGeometry, a.fringe === 'none' ? flagMaterial.clone() : foil);
    if (a.fringe === 'none') foil.dispose();

    // fallen flags on the ground for the damaged states
    if (a.state === 'shredded' || a.state === 'snapped') {
      const litter = s.material('#ffffff', { side: THREE.DoubleSide });
      const fallen = 2 + Math.floor(random() * 4);
      for (let i = 0; i < fallen; i++) {
        const scrap = s.mesh(flagGeometry.clone(), litter.clone(), [(random() - 0.5) * half * 1.6, 0.012 + i * 0.002, (random() - 0.5) * 1.6]);
        (scrap.material as THREE.MeshStandardMaterial).color.copy(colours[i % colours.length]);
        scrap.rotation.set(-Math.PI / 2, 0, random() * 6.28);
      }
      litter.dispose();
    }

    return s.finish({ footprint: half + 0.3, update: (_dt, time) => { poseFlags(time); poseStrips(time); } });
  },
});
