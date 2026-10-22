import * as THREE from 'three';
import { choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Bag, type Tone, V, aim, arc, finish, matte, tube, xf } from './bits';

const PALETTES = {
  yellow: ['#f2c92e', '#f5d64a', '#e9b820'],
  orange: ['#f08a1c', '#e9701a', '#f5a030'],
  harvest: ['#f2c92e', '#e9701a', '#c9541c', '#f5d64a'],
  cream: ['#efe2b0', '#e6d596', '#f4ecc9'],
  acid: ['#d6e02a', '#b9d42a', '#e9e44a'],
  harlequin: ['#f2c92e', '#e9701a', '#7a5ac2', '#3f7fc9', '#d94a6a', '#efe2b0'],
} as const;
type Kind = 'spiked' | 'mesh' | 'winged' | 'ridged' | 'triangle';
const KINDS: Kind[] = ['spiked', 'spiked', 'mesh', 'mesh', 'ridged', 'triangle', 'winged'];

const fib = (i: number, n: number) => {
  const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), t = i * 2.39996;
  return V(Math.cos(t) * r, y, Math.sin(t) * r);
};

export default defineThing({
  questions: {
    arrangement: choice('How are the grains gathered?', {
      pile: 'A loose heap that has settled on the ground.',
      clump: 'One tight ball stuck together, like a bee\'s pollen pellet.',
      thread: 'Stuck in a row along a sagging thread of spider silk between two stems.',
      drift: 'Loose in the air, drifting apart like small planets.',
      anther: 'Still spilling from the split anther of a flower on its stalk.',
    }),
    kind: choice('What kind of grains are they?', {
      spiked: 'Spheres covered in sharp spikes, like sea mines or burrs.',
      mesh: 'Globes wrapped in a raised honeycomb net.',
      winged: 'Pine pollen: a body with two round air bladders, like a mouse head.',
      ridged: 'Rugby-ball grains with long ridges and furrows.',
      triangle: 'Flattened rounded triangles with a pore at each corner.',
      mixed: 'A hay-fever mixture of every kind at once.',
    }),
    colour: choice('What colour are they?', {
      yellow: 'Clear buttercup yellow.',
      orange: 'Deep orange, lily pollen that stains.',
      harvest: 'Yellow, orange and rust together.',
      cream: 'Pale cream, dusty.',
      acid: 'Sharp green-yellow, tree pollen in spring.',
      harlequin: 'Unlikely: yellow and orange among violet, blue and pink grains.',
    }),
    count: score('How many grains?', ['Three or four', 'A dozen', 'Dozens']),
    matched: noul('Are they all about the same size?'),
    sticky: noul('Are they glued to each other with glossy drops of pollen oil?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group(), cluster = new THREE.Group();
    const plant = new Bag(), silk = new Bag(), glue = new Bag();
    const tone = (c: Tone, lift = 0) => new THREE.Color(c).offsetHSL((mood.warmth - 0.5) * 0.04, (mood.cheer - 0.5) * 0.3, lift);
    const palette = PALETTES[a.colour];
    const skin = matte({ roughness: mix(0.55, 0.85, mood.wear) });
    root.add(cluster);

    /** One grain of radius 1, a single merged mesh so it can turn on its own. */
    const makeGrain = (kind: Kind, colour: THREE.Color, dent: THREE.Vector3 | null) => {
      const bag = new Bag(), light = colour.clone().offsetHSL(0, -0.05, 0.1), dark = colour.clone().multiplyScalar(0.6), pale = colour.clone().lerp(new THREE.Color('#fbf6e2'), 0.7);
      const cave = (p: THREE.Vector3) => { if (!dent) return p; const d = p.dot(dent) - 0.25; return d > 0 ? p.addScaledVector(dent, -d * 1.7) : p; };
      const dented = (geometry: THREE.BufferGeometry, warp?: (p: THREE.Vector3) => THREE.Vector3) => {
        const at = geometry.getAttribute('position'), p = V();
        for (let i = 0; i < at.count; i++) { p.fromBufferAttribute(at, i); if (warp) warp(p); cave(p); at.setXYZ(i, p.x, p.y, p.z); }
        geometry.computeVertexNormals();
        return geometry;
      };
      const kept = (d: THREE.Vector3) => !dent || d.dot(dent) < 0.2;
      if (kind === 'spiked') {
        bag.add(dented(new THREE.SphereGeometry(1, 20, 14)), colour);
        const n = 44;
        for (let i = 0; i < n; i++) { const d = fib(i, n); if (kept(d)) bag.add(new THREE.ConeGeometry(0.085, 0.3, 5), light, aim(d.clone().multiplyScalar(1.1), d.clone().multiplyScalar(2))); }
      } else if (kind === 'mesh') {
        bag.add(dented(new THREE.SphereGeometry(1, 20, 14)), dark);
        const ico = new THREE.IcosahedronGeometry(1, 1), edges = new THREE.EdgesGeometry(ico), at = edges.getAttribute('position');
        for (let i = 0; i < at.count; i += 2) {
          const p = V().fromBufferAttribute(at, i), q = V().fromBufferAttribute(at, i + 1), m = p.clone().add(q).normalize();
          if (!kept(m)) continue;
          bag.add(tube([p.multiplyScalar(1.03), m.multiplyScalar(1.04), q.multiplyScalar(1.03)], 0.045, { sides: 4 }), light);
        }
        ico.dispose(); edges.dispose();
      } else if (kind === 'winged') {
        bag.add(dented(new THREE.SphereGeometry(1, 20, 14), (p) => p.set(p.x * 0.95, p.y * 0.78, p.z * 0.85)), colour.clone().multiplyScalar(0.85));
        for (let i = 0; i < 30; i++) { const d = fib(i, 60); bag.add(new THREE.SphereGeometry(1, 5, 4), light, xf(V(d.x * 0.95, d.y * 0.78, d.z * 0.85), 0.07)); }
        for (const side of [-1, 1]) {
          const bladder = new THREE.SphereGeometry(1, 16, 12), at = bladder.getAttribute('position'), colours = new Float32Array(at.count * 3), tint = new THREE.Color();
          for (let i = 0; i < at.count; i++) { tint.copy(pale).lerp(colour, 0.35 + 0.35 * Math.sin(at.getX(i) * 14) * Math.sin(at.getY(i) * 14) * Math.sin(at.getZ(i) * 14)); colours.set([tint.r, tint.g, tint.b], i * 3); }
          bladder.setAttribute('color', new THREE.BufferAttribute(colours, 3));
          bag.add(bladder, null, xf(V(side * 0.82, -0.52, 0), V(0.72, 0.68, 0.66)));
        }
      } else if (kind === 'ridged') {
        const warp = (p: THREE.Vector3) => p.set(p.x * 0.78, p.y * 1.22, p.z * 0.78);
        bag.add(dented(new THREE.SphereGeometry(1, 20, 14), warp), colour);
        for (let k = 0; k < 12; k++) {
          const angle = (k / 12) * Math.PI * 2, furrow = k % 4 === 0;
          const points = Array.from({ length: 11 }, (_unused, i) => { const lat = mix(-1.35, 1.35, i / 10); return cave(warp(V(Math.cos(angle) * Math.cos(lat), Math.sin(lat), Math.sin(angle) * Math.cos(lat)).multiplyScalar(furrow ? 0.99 : 1.02))); });
          bag.add(tube(points, furrow ? 0.07 : 0.04, { sides: 4 }), furrow ? dark : light);
        }
      } else {
        const warp = (p: THREE.Vector3) => { const k = 1 + 0.13 * Math.cos(3 * Math.atan2(p.z, p.x)); return p.set(p.x * k, p.y * 0.8, p.z * k); };
        bag.add(dented(new THREE.SphereGeometry(1, 24, 14), warp), colour);
        for (let k = 0; k < 3; k++) {
          const angle = (k / 3) * Math.PI * 2, d = V(Math.cos(angle), 0, Math.sin(angle));
          if (!kept(d)) continue;
          bag.add(new THREE.SphereGeometry(1, 10, 8), light, xf(d.clone().multiplyScalar(1.13), V(0.26, 0.24, 0.26)));
          bag.add(new THREE.SphereGeometry(1, 8, 6), dark, xf(d.clone().multiplyScalar(1.33), 0.11));
        }
        for (let i = 0; i < 60; i++) { const d = fib(i, 60); if (kept(d)) bag.add(new THREE.SphereGeometry(1, 5, 4), i % 3 ? light : dark, xf(cave(warp(d.clone())), 0.055)); }
      }
      const holder = new THREE.Group();
      bag.into(holder, skin);
      return holder;
    };

    const count = Math.max(3, Math.round(mix(3, 34, a.count ** 1.4) * mix(0.85, 1.15, mood.density)));
    const sizes = Array.from({ length: count }, () => (a.matched ? mix(0.04, 0.046, random()) : mix(0.026, 0.062, random() ** 1.5)));
    if (!a.matched) sizes.sort((p, q) => q - p);
    const spots: { at: THREE.Vector3; r: number }[] = [];
    const clear = (p: THREE.Vector3, r: number, slack = 1.0) => spots.every((s) => s.at.distanceTo(p) >= (s.r + r) * slack);
    const reach = (r: number) => r * 1.22;

    const green = new THREE.Color('#6f9a45').lerp(new THREE.Color('#c2a865'), mood.wear * 0.7 + (1 - mood.cheer) * 0.12);
    const tuft = (x: number, z: number, n: number, high: number) => {
      for (let i = 0; i < n; i++) {
        const base = V(x + (random() - 0.5) * 0.05, 0, z + (random() - 0.5) * 0.05);
        plant.add(tube(arc(base, base.clone().add(V((random() - 0.5) * 0.12, high * (0.5 + random() * 0.5), (random() - 0.5) * 0.1)), V(0, 0.02, 0), 6), (t) => mix(0.008, 0.001, t), { sides: 5, flat: 0.2 }), green.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1));
      }
    };

    if (a.arrangement === 'pile') {
      const spread = 0.045 * Math.sqrt(count);
      for (const r0 of sizes) {
        const r = reach(r0), angle = random() * Math.PI * 2, d = spread * Math.sqrt(random());
        const x = Math.cos(angle) * d, z = Math.sin(angle) * d;
        let y = r;
        for (const s of spots) { const flat = Math.hypot(s.at.x - x, s.at.z - z), sum = (s.r + r) * 0.94; if (flat < sum) y = Math.max(y, s.at.y + Math.sqrt(sum * sum - flat * flat)); }
        spots.push({ at: V(x, y, z), r });
      }
    } else if (a.arrangement === 'clump' || a.arrangement === 'drift') {
      const slack = a.arrangement === 'drift' ? mix(1.2, 1.7, mood.energy) : 0.92;
      for (const r0 of sizes) {
        const r = reach(r0);
        if (!spots.length) { spots.push({ at: V(0, 0, 0), r }); continue; }
        // A clump takes the free spot nearest its middle; a drift takes the first that is clear.
        let best: THREE.Vector3 | null = null, last = V();
        for (let tries = 0; tries < 50; tries++) {
          const host = spots[Math.floor(random() * spots.length)];
          const d = V(random() - 0.5, (random() - 0.5) * (a.arrangement === 'drift' ? 0.8 : 1), random() - 0.5).normalize();
          const p = host.at.clone().addScaledVector(d, (host.r + r) * slack);
          last = p;
          if (!clear(p, r, slack * 0.98)) continue;
          if (!best || p.lengthSq() < best.lengthSq()) best = p;
          if (a.arrangement === 'drift') break;
        }
        spots.push({ at: best ?? last, r });
      }
    } else if (a.arrangement === 'thread') {
      const span = Math.min(0.3, 0.1 + count * 0.02);
      const posts = [-span, span].map((x) => { const lean = (random() - 0.5) * 0.04; return arc(V(x + lean, 0, 0), V(x, 0.33 + random() * 0.04, 0), V(lean * 0.4, 0, 0), 10); });
      for (const post of posts) { plant.add(tube(post, (t) => mix(0.007, 0.003, t), { sides: 6 }), green); tuft(post[0].x, 0, 4, 0.12); }
      const A = posts[0][8], B = posts[1][8], sag = 0.05 + count * 0.002;
      const curve = (t: number) => A.clone().lerp(B, t).add(V(0, -sag * 4 * t * (1 - t), 0));
      silk.add(tube(Array.from({ length: 21 }, (_unused, i) => curve(i / 20)), 0.0016, { sides: 5 }), '#8d9aa5');
      for (const r0 of sizes) {
        const r = reach(r0);
        for (let tries = 0; tries < 80; tries++) {
          const p = curve(0.07 + random() * 0.86).add(V(0, (random() - 0.6) * r * 0.9, (random() - 0.5) * r * (tries > 30 ? 2.4 : 0.8)));
          if (clear(p, r, tries > 60 ? 0.6 : 0.93)) { spots.push({ at: p, r }); break; }
        }
      }
    } else {
      // A flower's stamen: a filament and a split, dusty anther.
      const filament = arc(V(-0.05, 0, 0), V(0.02, 0.3, 0), V(-0.04, 0, 0.01), 12);
      plant.add(tube(filament, (t) => mix(0.007, 0.004, t), { sides: 6 }), tone('#dfe3b0'));
      const antherTone = tone('#7a3a2a').lerp(new THREE.Color('#5a2a4a'), mood.warmth < 0.4 ? 0.5 : 0);
      const top = filament[12], axis = V(0.95, 0.3, 0).normalize();
      for (const side of [-1, 1]) {
        const centre = top.clone().add(V(0, 0.02, side * 0.027));
        plant.add(tube([centre.clone().addScaledVector(axis, -0.14), centre, centre.clone().addScaledVector(axis, 0.14)], (t) => 0.008 + 0.03 * Math.sin(t * Math.PI) ** 0.6, { sides: 8, smooth: 10 }), antherTone);
      }
      for (const r0 of sizes) {
        const r = reach(r0) * 0.62;
        for (let tries = 0; tries < 60; tries++) {
          const fallen = random() < 0.3;
          const along = (random() - 0.5) * 0.27, around = random() * Math.PI * 2;
          const p = fallen ? V(0.03 + (random() - 0.5) * 0.24, r, (random() - 0.5) * 0.2) : top.clone().add(V(0, 0.02, 0)).addScaledVector(axis, along).add(V(0, Math.cos(around) * (0.045 + r * 0.7), Math.sin(around) * (0.07 + r * 0.7)));
          if (clear(p, r, 0.9) || tries === 59) { spots.push({ at: p, r }); break; }
        }
      }
    }

    // Build the grains at their spots.
    const spinners: { holder: THREE.Group; axis: THREE.Vector3; rate: number }[] = [];
    spots.forEach((spot, index) => {
      const kind = a.kind === 'mixed' ? KINDS[Math.floor(random() * KINDS.length)] : a.kind;
      const colour = tone(palette[Math.floor(random() * palette.length)], (random() - 0.5) * 0.06).lerp(new THREE.Color('#9a8f72'), mood.wear * 0.3);
      const dent = random() < mood.wear * 0.5 ? V(random() - 0.5, random() - 0.2, random() - 0.5).normalize() : null;
      const holder = makeGrain(kind, colour, dent);
      const fit = kind === 'spiked' ? 1 / 1.3 : kind === 'winged' ? 1 / 1.45 : kind === 'triangle' ? 1 / 1.3 : kind === 'ridged' ? 1 / 1.22 : 1 / 1.06;
      holder.scale.setScalar(spot.r * fit);
      holder.position.copy(spot.at);
      holder.rotation.set(random() * 6, random() * 6, random() * 6);
      cluster.add(holder);
      spinners.push({ holder, axis: V(random() - 0.5, random() - 0.5, random() - 0.5).normalize(), rate: (random() - 0.5) * 1.2 });
      if (a.sticky)
        for (let j = 0; j < index; j++) {
          const other = spots[j], gap = other.at.distanceTo(spot.at);
          if (gap < (other.r + spot.r) * 1.25) {
            const m = spot.at.clone().lerp(other.at, spot.r / (spot.r + other.r));
            glue.add(new THREE.SphereGeometry(1, 10, 8), null, aim(m, other.at, V(1, 1.5, 1).multiplyScalar(Math.min(spot.r, other.r) * 0.42)));
          }
        }
    });

    plant.into(root, matte({ roughness: 0.85 }));
    silk.into(root, matte({ roughness: 0.5, emissive: '#56626c', emissiveIntensity: 0.25 }));
    glue.into(cluster, new THREE.MeshStandardMaterial({ color: tone('#f0a030'), roughness: 0.12, emissive: tone('#a85a10'), emissiveIntensity: 0.35 }));

    const drift = a.arrangement === 'drift', pace = mix(0.05, 0.9, mood.energy);
    return finish(root, (dt) => {
      if (drift) for (const spinner of spinners) spinner.holder.rotateOnAxis(spinner.axis, dt * spinner.rate * pace);
    }, drift ? 0.15 : undefined);
  },
});
