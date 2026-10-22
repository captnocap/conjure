import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Batch } from './batch';

type P = [number, number, number];

export default defineThing({
  questions: {
    count: choice('How many masts stand around the pad?', {
      three: 'Three, in a triangle.',
      four: 'Four, at the corners of a square.',
      six: 'Six, a full ring like a cage.',
      two: 'Only two, with a single wire between them.',
    }),
    event: choice('What is happening to the array?', {
      calm: 'Nothing: a still day, wires barely moving.',
      strike: 'A lightning bolt is hitting one mast tip right now.',
      corona: 'A storm is building: blue-violet corona glows at every tip.',
      snapped: 'After a strike: one tip burnt black and a wire snapped, hanging loose.',
      fallen: 'One mast has toppled and lies across the ground, dragging its wires down.',
    }),
    lights: choice('What warning lights do the masts carry?', {
      red: 'Steady red aviation lights at the top and halfway up.',
      strobe: 'White strobes flashing in sequence.',
      failing: 'Red lights, but several have burnt out.',
      none: 'No lights at all.',
    }),
    mast: choice('What are the masts made of?', {
      banded: 'Lattice painted in red and white aviation bands with a white fibreglass tip.',
      galvanised: 'Bare galvanised grey lattice with a white tip.',
      white: 'All white lattice, clean and new.',
      pole: 'Slim tapering tubular poles steadied by guy wires.',
    }),
    wires: choice('How are the wires strung?', {
      ring: 'A catenary from each tip to the next, sagging gently.',
      web: 'Tip to tip and also crossing over the middle.',
      downleads: 'Tip to tip, plus long down-conductors sloping out to ground anchors.',
    }),
    markers: noul('Do orange marker balls hang on the wires?'),
    centre: choice('What stands in the middle of the array?', {
      nothing: 'Nothing, just open ground.',
      pad: 'A bare concrete pad with a scorch star.',
      rocket: 'A white rocket standing on its mount, the thing being protected.',
    }),
    height: score('How tall are the masts?', ['Tall', 'Very tall', 'Dizzyingly tall and thin']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const b = new Batch();
    const wear = mood.wear;
    const rust = new THREE.Color('#84441f');
    const paint = (hex: string) => {
      const c = new THREE.Color(hex);
      if (random() < wear * 0.75) c.lerp(rust, mix(0.2, 0.85, random()) * wear);
      return c;
    };
    const n = { three: 3, four: 4, six: 6, two: 2 }[a.count];
    const H = Math.round(mix(84, 150, a.height));
    const RR = mix(30, 40, random()) + (n === 6 ? 6 : 0);
    const wire = '#2c3134';
    const start = random() * Math.PI * 2;
    const down = a.event === 'fallen' ? Math.floor(random() * n) : -1;
    const hit = a.event === 'strike' || a.event === 'snapped' ? Math.floor(random() * n) : -1;
    const tips: THREE.Vector3[] = [];
    const lamps: THREE.Mesh[] = [];
    const glow = (hex: string, power: number) => s.material(hex, { emissive: hex, emissiveIntensity: power });
    const redOn = glow('#ff3524', 1.8), redOff = s.material('#4a1a16'), white = glow('#f4f8ff', 2.2), corona = new THREE.MeshBasicMaterial({ color: '#9f8cff', transparent: true, opacity: 0.55, depthWrite: false });

    for (let i = 0; i < n; i++) {
      const angle = start + (i / n) * Math.PI * 2 + (random() - 0.5) * 0.08;
      const x = Math.sin(angle) * RR, z = Math.cos(angle) * RR;
      const fallen = i === down;
      const lean: P = fallen ? [Math.PI / 2 - 0.02, angle + 0.5 + random() * 0.6, 0] : [(random() - 0.5) * 0.02 * (1 + wear * 3), 0, (random() - 0.5) * 0.02 * (1 + wear * 3)];
      const lift = fallen ? 1.6 : 0;
      b.box([6, 1.4, 6], [x, 0.7, z], '#aeaba0');
      if (fallen) for (let k = 0; k < 4; k++) b.rod([x + (k % 2 ? 1.6 : -1.6), 1.4, z + (k < 2 ? 1.6 : -1.6)], [x + (k % 2 ? 1.6 : -1.6) + (random() - 0.5) * 3, 3 + random() * 4, z + (k < 2 ? 1.6 : -1.6) + (random() - 0.5) * 3], 0.35, paint('#c9311f'), 0.3, 4);
      const frame = new THREE.Matrix4().compose(new THREE.Vector3(x, 1.4 + lift, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(lean[0], lean[1], lean[2], 'YXZ')), new THREE.Vector3(1, 1, 1));
      b.within([x, 1.4 + lift, z], lean, () => {
        const body = H * 0.82;
        if (a.mast === 'pole') {
          b.cyl(0.5, 1.5, body, [0, body / 2, 0], paint('#e9e9e3'), 10);
          for (let band = 1; band < 6; band += 2) b.cyl(0.5 + (1 - (band + 0.5) / 6) * 1.02, 0.5 + (1 - band / 6) * 1.02, body / 12, [0, (band / 6) * body + body / 24, 0], paint('#c9311f'), 10);
        } else {
          const bays = 12;
          b.lattice(6.4, 0, body, bays, 0.42, (bay) => paint(a.mast === 'banded' ? (Math.floor(bay / 2) % 2 ? '#ecebe4' : '#c9311f') : a.mast === 'white' ? '#ecebe4' : '#8f9698'), () => random() < Math.max(0, wear - 0.5) * 0.35, 2);
        }
        const burnt = i === hit && a.event === 'snapped';
        b.cyl(0.18, 0.85, H - body, [0, body + (H - body) / 2, 0], burnt ? '#1a1817' : '#f4f4ee', 8);
        b.cyl(1.5, 1.5, 0.5, [0, body, 0], '#4a4f52', 8);
      });
      tips.push(new THREE.Vector3(0, H - 0.5, 0).applyMatrix4(frame));
      // Lights at two heights.
      if (a.lights !== 'none') for (const level of [0.82, 0.42]) {
        const dead = fallen || (a.lights === 'failing' && random() < 0.55);
        const at = new THREE.Vector3(0.9, H * level + 0.8, 0.9).applyMatrix4(frame);
        const lamp = s.ball([0.95, 0.95, 0.95], at.toArray() as P, dead ? redOff : a.lights === 'strobe' ? white.clone() : redOn, 8);
        if (!dead && a.lights === 'strobe') lamps.push(lamp);
      }
      if (a.event === 'corona' && !fallen) { const halo = s.ball([3.4, 5, 3.4], tips[i].toArray() as P, corona, 10); halo.castShadow = false; lamps.push(halo); }
      if (a.mast === 'pole' && !fallen) for (let g = 0; g < 3; g++) {
        const t = angle + (g / 3) * Math.PI * 2 + 0.5;
        b.rod([x, H * 0.62, z], [x + Math.sin(t) * H * 0.2, 0.5, z + Math.cos(t) * H * 0.2], 0.16, wire, 0.16, 4);
        b.box([1.6, 1, 1.6], [x + Math.sin(t) * H * 0.2, 0.5, z + Math.cos(t) * H * 0.2], '#aeaba0');
      }
      if (a.wires === 'downleads' && !fallen) {
        const far: P = [Math.sin(angle) * (RR + H * 0.26), 0.6, Math.cos(angle) * (RR + H * 0.26)];
        span(tips[i].toArray() as P, far, 0.03, false);
        b.box([3, 1.2, 3], far, '#aeaba0');
      }
    }

    // Catenary wires, sagging between tips, with optional marker balls.
    function span(from: P, to: P, sag: number, balls: boolean, cutAt = -1) {
      const p0 = new THREE.Vector3(...from), p1 = new THREE.Vector3(...to), length = p0.distanceTo(p1), steps = 10;
      let last = p0.clone();
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        const here = p0.clone().lerp(p1, t);
        here.y -= Math.sin(t * Math.PI) * length * sag;
        here.y = Math.max(here.y, 0.3);
        if (cutAt < 0) b.rod(last.toArray() as P, here.toArray() as P, 0.24, wire, 0.24, 4);
        if (balls && cutAt < 0 && k % 2 === 0 && k < steps) b.ball(1.5, here.toArray() as P, k % 4 ? '#f07a22' : '#f3f1ea', [1, 1, 1], 8);
        last = here;
      }
      if (cutAt >= 0) {
        // A parted wire: each half hangs straight down from its tip and trails on the ground.
        for (const end of [p0, p1]) {
          const reach = Math.min(end.y - 0.3, length * 0.5);
          const foot = end.clone().lerp(end === p0 ? p1 : p0, 0.06).setY(Math.max(0.3, end.y - reach));
          const mid = end.clone().lerp(foot, 0.5).add(new THREE.Vector3((random() - 0.5) * 5, 0, (random() - 0.5) * 5));
          b.rod(end.toArray() as P, mid.toArray() as P, 0.24, wire, 0.24, 4);
          b.rod(mid.toArray() as P, foot.toArray() as P, 0.24, wire, 0.24, 4);
          if (foot.y < 1) b.rod(foot.toArray() as P, [foot.x + (random() - 0.5) * 14, 0.3, foot.z + (random() - 0.5) * 14], 0.24, wire, 0.24, 4);
        }
      }
    }
    const sag = mix(0.07, 0.13, random());
    const pairs: [number, number][] = [];
    for (let i = 0; i < (n === 2 ? 1 : n); i++) pairs.push([i, (i + 1) % n]);
    if (a.wires === 'web' && n > 3) for (let i = 0; i < n / 2; i++) pairs.push([i, (i + n / 2) % n]);
    const snappedPair = a.event === 'snapped' ? pairs.findIndex(([p, q]) => p === hit || q === hit) : -1;
    pairs.forEach(([p, q], index) => {
      const lying = p === down || q === down;
      span(tips[p].toArray() as P, tips[q].toArray() as P, lying ? 0.02 : sag, a.markers && !lying, index === snappedPair ? 1 : -1);
    });

    // Centre.
    if (a.centre !== 'nothing') {
      b.cyl(15, 15.6, 1, [0, 0.5, 0], '#b3afa2', 28);
      for (let ray = 0; ray < 12; ray++) { const t = (ray / 12) * Math.PI * 2 + random() * 0.3, long = 5 + random() * 9; b.box([1.2 + random(), 0.06, long], [Math.sin(t) * long * 0.5, 1.02, Math.cos(t) * long * 0.5], '#2a2623', [0, t, 0]); }
      b.cyl(3.5, 3.5, 0.08, [0, 1.03, 0], '#1d1a18', 16);
    }
    if (a.centre === 'rocket') {
      const RH = Math.min(H * 0.5, 58);
      b.cyl(4.5, 5.2, 3, [0, 2.5, 0], '#6d7274', 12);
      b.cyl(2.7, 2.7, RH * 0.7, [0, 4 + RH * 0.35, 0], '#f3f3ee', 18);
      b.cyl(2.72, 2.72, RH * 0.06, [0, 4 + RH * 0.45, 0], '#1f2224', 18);
      b.cyl(1.7, 2.7, RH * 0.08, [0, 4 + RH * 0.74, 0], '#1f2224', 18);
      b.cyl(1.7, 1.7, RH * 0.12, [0, 4 + RH * 0.84, 0], '#f3f3ee', 18);
      b.cyl(0.1, 1.7, RH * 0.1, [0, 4 + RH * 0.95, 0], '#f3f3ee', 18);
      for (let f = 0; f < 4; f++) b.box([0.25, RH * 0.1, 2.6], [Math.sin(f * Math.PI / 2 + 0.6) * 3.6, 4 + RH * 0.06, Math.cos(f * Math.PI / 2 + 0.6) * 3.6], '#c9311f', [0, f * Math.PI / 2 + 0.6, 0]);
    }
    s.root.add(b.mesh({ metalness: 0.15 }));

    // The bolt: a jagged bright path from far overhead into one tip, with a fork.
    let bolt: THREE.Mesh | null = null;
    if (a.event === 'strike') {
      const flash = new THREE.MeshBasicMaterial({ color: '#ffd426', transparent: true, opacity: 0.98, depthWrite: false });
      const jag = new Batch();
      const walk = (from: THREE.Vector3, rise: number, steps: number, radius: number) => {
        let here = from.clone();
        for (let k = 0; k < steps; k++) {
          const next = here.clone().add(new THREE.Vector3((random() - 0.5) * 16, rise / steps, (random() - 0.5) * 16));
          jag.rod(here.toArray() as P, next.toArray() as P, radius, '#ffffff', radius * 0.9, 5);
          here = next;
        }
        return here;
      };
      const top = walk(tips[hit], H * 0.5, 7, 1.1);
      walk(tips[hit].clone().lerp(top, 0.5).add(new THREE.Vector3(4, 0, 4)), H * 0.22, 4, 0.6);
      bolt = jag.mesh();
      (bolt.material as THREE.Material).dispose();
      bolt.material = flash;
      bolt.castShadow = bolt.receiveShadow = false;
      s.root.add(bolt);
      const flare = s.ball([4.5, 4.5, 4.5], tips[hit].toArray() as P, new THREE.MeshBasicMaterial({ color: '#fff3a8', transparent: true, opacity: 0.9, depthWrite: false }), 10);
      flare.castShadow = false;
    }

    const energy = mix(0.4, 1.8, mood.energy);
    return s.finish({
      footprint: RR + 6,
      update: (_dt, time) => {
        lamps.forEach((lamp, index) => {
          if (a.event === 'corona' && lamp.material === corona) lamp.scale.set(3.4, 5, 3.4).multiplyScalar(1 + Math.sin(time * 9 * energy + index) * 0.12);
          else (lamp.material as THREE.MeshStandardMaterial).emissiveIntensity = (Math.floor(time * 2.5 * energy) + index) % 4 === 0 ? 3 : 0.25;
        });
        if (bolt) (bolt.material as THREE.MeshBasicMaterial).opacity = Math.sin(time * 23 * energy) > -0.55 ? 0.98 : 0.55;
      },
    });
  },
});
