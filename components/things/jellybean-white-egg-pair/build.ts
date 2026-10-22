import * as THREE from 'three';
import { choice, defineThing, mix, noul } from '@conjure/kit';
import { Bag, TAU, V, arc, blob, dewMaterial, field, finish, instances, leaf, matte, paint, tube, xf } from './bits';

const L = 0.013; // egg length, metres
const R = 0.0043; // egg radius

const SHELLS = {
  chalk: { colour: '#f6f4ef', glow: '#000000', glowing: 0, text: 'Flat chalk white, dry and powdery, like a pair of tiny sugared almonds.' },
  cream: { colour: '#f4ead6', glow: '#f3dcb4', glowing: 0.06, text: 'Warm cream white, soft as candle wax.' },
  translucent: { colour: '#f7e7df', glow: '#f2b9a0', glowing: 0.16, text: 'So thin the shell glows faintly pink where the light passes through to the yolk.' },
  dusky: { colour: '#d9d6cf', glow: '#000000', glowing: 0, text: 'Dull grey-white, chilled or old, the bloom gone from them.' },
} as const;

/** The egg as a body of revolution around y, nearly symmetric: a jellybean, not a hen's egg. */
const profile = (t: number) => {
  const a = t * Math.PI;
  return { r: Math.sin(a) * R * (1 + 0.07 * Math.cos(a)), y: -Math.cos(a) * L / 2 };
};

/** A point on the egg's surface for an angle round the axis and a run along it, lifted off the shell. */
function onShell(theta: number, t: number, lift = 0) {
  const { r, y } = profile(Math.min(0.995, Math.max(0.005, t)));
  const p = V(r * Math.sin(theta), y, r * Math.cos(theta));
  const n = V(p.x / (R * R), p.y / ((L / 2) * (L / 2)), p.z / (R * R)).normalize();
  return p.addScaledVector(n, lift);
}

export default defineThing({
  questions: {
    hatching: choice('How far along is the hatching?', {
      whole: 'Both eggs whole and smooth, nothing has happened yet: pure waiting.',
      hairline: 'A single dark hairline crack zigzags across one egg.',
      chipped: 'The crack has lifted a tiny chip of shell like a trapdoor, a dark hole beneath.',
      pipped: 'A minute grey beak tip with a white egg tooth is pushing out through the hole.',
      both: 'Both eggs are cracking at once, one with its chip already lifted.',
    }),
    bed: choice('What are the eggs lying on?', {
      down: 'A soft pad of pale plant down, the lining of a hummingbird nest.',
      lichen: 'A torn fragment of nest: grey felt shingled with blue-green lichen flakes.',
      leaf: 'One broad green leaf folded up around them like cupped hands.',
      moss: 'A cushion of bright green moss.',
      cotton: 'Cotton wool in the tray of a small cardboard box: a rescue, kept warm by hand.',
      bare: 'Nothing: they lie on the bare surface, exposed.',
    }),
    lie: choice('How do the two eggs lie together?', {
      parallel: 'Side by side and touching along their whole length, a matched pair.',
      spooned: 'Nested at an angle, one tucked into the curve of the other.',
      apart: 'A small gap between them, one rolled a little away on its own.',
      propped: 'One leaning up against the other, resting on its shoulder.',
    }),
    shell: choice('What is the shell like?', Object.fromEntries(Object.entries(SHELLS).map(([key, value]) => [key, value.text])) as Record<keyof typeof SHELLS, string>),
    dew: noul('Are the shells beaded with dew?'),
    clinging: choice('Is anything clinging to the eggs?', {
      nothing: 'Nothing: two clean shells.',
      wisp: 'A wisp of plant down caught across one of them.',
      feather: 'A tiny shed green body feather from the mother, lying over them.',
      flake: 'A single flake of grey-green lichen stuck to a shell.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const noise = field(random);
    const shell = SHELLS[a.shell];

    // ---- The bed. Each one sets how deep the eggs sink and what the down fibres look like.
    const bedBag = new Bag();
    const fibreBag = new Bag();
    let floor = 0; // height of the bed surface under the eggs
    let sink = 0.0006;
    const greenSoft = new THREE.Color('#6f9a3e').lerp(new THREE.Color('#a28a3c'), mood.wear * 0.5);
    if (a.bed === 'down') {
      const pad = paint(blob(V(0.02, 0.0045, 0.017), noise, 0.16, 3, 28, 14), (p, n) => new THREE.Color('#e3d5bb').lerp(new THREE.Color('#a8977a'), Math.max(0, -n.y) * 0.7 + Math.max(0, noise(p, 300)) * 0.35));
      bedBag.add(pad, null, xf(V(0, 0.0025, 0)));
      for (let i = 0; i < 70; i++) {
        const angle = random() * TAU, reach = mix(0.008, 0.021, random());
        const from = V(Math.cos(angle) * reach * 0.8, 0.003 + random() * 0.003, Math.sin(angle) * reach * 0.7);
        const to = from.clone().add(V(Math.cos(angle) * 0.006 * random(), (random() - 0.3) * 0.004, Math.sin(angle) * 0.006 * random()));
        fibreBag.add(tube(arc(from, to, V(0, 0.0015 * random(), 0), 5), 0.00012, { sides: 3 }), random() < 0.5 ? '#efe6d2' : '#d2c4a8');
      }
      floor = 0.0055; sink = 0.0022;
    } else if (a.bed === 'lichen') {
      bedBag.add(paint(blob(V(0.021, 0.004, 0.017), noise, 0.2, 2.5, 24, 12), (_p, n) => new THREE.Color('#7a705f').lerp(new THREE.Color('#4d463b'), Math.max(0, -n.y))), null, xf(V(0, 0.002, 0)));
      bedBag.add(paint(blob(V(0.012, 0.0022, 0.01), noise, 0.15, 3, 18, 10), () => '#dccdb0'), null, xf(V(0, 0.0045, 0)));
      const flakes: { matrix: THREE.Matrix4; colour: string }[] = [];
      for (let i = 0; i < 55; i++) {
        const angle = random() * TAU, reach = mix(0.011, 0.021, Math.sqrt(random()));
        const x = Math.cos(angle) * reach, z = Math.sin(angle) * reach * 0.82;
        const tilt = new THREE.Euler(-0.3 + random() * 0.6, random() * TAU, -0.4 + random() * 0.8);
        flakes.push({ matrix: xf(V(x, 0.0035 + random() * 0.0015, z), V(0.0028 + random() * 0.0022, 1, 0.002 + random() * 0.0018), tilt), colour: ['#6d9e8c', '#93b67f', '#4f8576', '#adc492', '#7ea777', '#8796a0'][Math.floor(random() * 6)] });
      }
      const flake = new THREE.CircleGeometry(1, 7);
      flake.rotateX(-Math.PI / 2);
      instances(root, flake, matte({ side: THREE.DoubleSide, roughness: 0.95 }), flakes);
      floor = 0.0062; sink = 0.0012;
    } else if (a.bed === 'leaf') {
      const vein = new THREE.Color('#a9c873'), edge = greenSoft.clone().multiplyScalar(0.75);
      bedBag.add(leaf(0.05, 0.03, { fold: 0.55, droop: 0.04, colour: (t, s) => (Math.abs(s) < 0.08 ? vein : greenSoft.clone().lerp(edge, Math.abs(s) * 0.7 + t * 0.2)) }), null, xf(V(0, 0.0005, -0.025), 1, new THREE.Euler(0, 0, 0)));
      bedBag.add(tube([V(0, 0.0005, -0.025), V(0, -0.0005, -0.033), V(0.001, -0.001, -0.038)], 0.0007, { sides: 5, smooth: 8 }), '#7c8f43');
      floor = 0.0016; sink = 0.0004;
    } else if (a.bed === 'moss') {
      bedBag.add(paint(blob(V(0.022, 0.0055, 0.018), noise, 0.12, 2.5, 26, 12), () => '#56702f'), null, xf(V(0, 0.002, 0)));
      const shoots: { matrix: THREE.Matrix4; colour: string }[] = [];
      for (let i = 0; i < 260; i++) {
        const angle = random() * TAU, reach = Math.sqrt(random());
        const x = Math.cos(angle) * reach * 0.021, z = Math.sin(angle) * reach * 0.017;
        const y = 0.002 + 0.0055 * Math.sqrt(Math.max(0, 1 - reach * reach)) * 0.9;
        shoots.push({ matrix: xf(V(x, y, z), V(0.0007, 0.0018 + random() * 0.0012, 0.0007), new THREE.Euler((random() - 0.5) * 0.6, random() * TAU, (random() - 0.5) * 0.6)), colour: new THREE.Color('#6f9a2e').lerp(new THREE.Color('#b8c64a'), random() * 0.6).lerp(new THREE.Color('#8a7a3a'), mood.wear * 0.5).getStyle() });
      }
      const cone = new THREE.ConeGeometry(1, 1, 4);
      cone.translate(0, 0.5, 0);
      instances(root, cone, matte(), shoots);
      floor = 0.0072; sink = 0.0024;
    } else if (a.bed === 'cotton') {
      const card = new THREE.Color('#c79c62');
      const W = 0.044, D = 0.034, H = 0.009, T = 0.0008;
      bedBag.add(new THREE.BoxGeometry(W, T, D), card, xf(V(0, T / 2, 0)));
      for (const side of [-1, 1]) {
        bedBag.add(new THREE.BoxGeometry(W, H, T), card, xf(V(0, H / 2, side * (D / 2 - T / 2))));
        bedBag.add(new THREE.BoxGeometry(T, H, D), card, xf(V(side * (W / 2 - T / 2), H / 2, 0)));
      }
      for (let i = 0; i < 9; i++) {
        const x = (random() - 0.5) * (W - 0.022), z = (random() - 0.5) * (D - 0.02);
        bedBag.add(paint(blob(V(0.0075, 0.0035, 0.0065), noise, 0.25, 4, 14, 8), (_p, n) => new THREE.Color('#f4f6f8').lerp(new THREE.Color('#b9c0c8'), Math.max(0, -n.y) * 0.8)), null, xf(V(x, 0.003, z), 1, new THREE.Euler(0, random() * TAU, 0)));
      }
      floor = 0.0055; sink = 0.0016;
    }
    const bedMat = matte({ roughness: 0.95, side: a.bed === 'leaf' ? THREE.DoubleSide : THREE.FrontSide });
    bedBag.into(root, bedMat);
    fibreBag.into(root, matte({ roughness: 1, emissive: '#fff8ea', emissiveIntensity: 0.12 }));

    // ---- The eggs.
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const { r, y } = profile(i / 24);
      pts.push(new THREE.Vector2(Math.max(r, 1e-5), y));
    }
    const eggGeometry = new THREE.LatheGeometry(pts, 36);
    // A little shade on the underside so a white egg on a pale bed still has a form.
    paint(eggGeometry, (p) => new THREE.Color('#ffffff').multiplyScalar(1 - 0.3 * Math.max(0, p.x / R) ** 1.5));
    const tint = new THREE.Color(shell.colour).lerp(new THREE.Color(mood.warmth > 0.5 ? '#f3d9b8' : '#dfe7ef'), Math.abs(mood.warmth - 0.5) * 0.25);
    const stainMap = (seed: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 128);
      // Fine porous mottling, then nest stains that come with wear.
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = `rgba(150,140,125,${0.05 + random() * 0.06})`;
        ctx.fillRect(random() * 128, random() * 128, 1 + random() * 2, 1 + random() * 2);
      }
      const stains = Math.round(mood.wear * 9 + seed);
      for (let i = 0; i < stains; i++) {
        ctx.fillStyle = `rgba(${120 + random() * 40},${95 + random() * 30},${60 + random() * 20},${0.12 + mood.wear * 0.25})`;
        ctx.beginPath();
        ctx.ellipse(random() * 128, random() * 128, 3 + random() * 10, 2 + random() * 6, random() * 3, 0, TAU);
        ctx.fill();
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return map;
    };

    const crackMat = matte({ color: '#2a2220', roughness: 0.9 });
    const holeMat = matte({ color: '#4a3b36', roughness: 0.7 });
    const eggs: THREE.Group[] = [];
    const layouts = {
      parallel: [{ x: -0.0004, z: -R * 1.02, turn: 0.06, roll: 0 }, { x: 0.0005, z: R * 1.02, turn: -0.04, roll: 0 }],
      spooned: [{ x: -0.001, z: -R * 0.95, turn: 0.38, roll: 0 }, { x: 0.0018, z: R * 1.08, turn: -0.12, roll: 0 }],
      apart: [{ x: -0.0035, z: -R * 1.5, turn: 0.2, roll: 0 }, { x: 0.004, z: R * 1.6, turn: -0.5, roll: 0 }],
      propped: [{ x: 0, z: -R * 1.0, turn: 0.05, roll: 0 }, { x: 0.0006, z: R * 0.72, turn: -0.08, roll: 0.42 }],
    }[a.lie];
    const cracked = a.hatching === 'whole' ? [] : a.hatching === 'both' ? [0, 1] : [1];
    const dewList: { matrix: THREE.Matrix4 }[] = [];

    layouts.forEach((layout, index) => {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: tint, map: stainMap(index), roughness: 0.88, vertexColors: true, emissive: shell.glow, emissiveIntensity: shell.glowing });
      const egg = new THREE.Mesh(eggGeometry.clone(), mat);
      egg.castShadow = egg.receiveShadow = true;
      // Lay the egg down: its axis along x, then rotate it round to rest naturally.
      const body = new THREE.Group();
      body.add(egg);
      body.rotation.z = -Math.PI / 2;
      group.add(body);
      const lift = layout.roll ? R * 0.7 : 0;
      group.position.set(layout.x, floor + R - sink + lift, layout.z);
      group.rotation.set(layout.roll, layout.turn + (random() - 0.5) * 0.12, 0);
      root.add(group);
      eggs.push(group);

      if (cracked.includes(index)) {
        const mainEgg = index === 1 || a.hatching !== 'both';
        // A hatching crack runs round the blunt end, zigzagging, with a short branch.
        const theta0 = -Math.PI * 0.32 + (random() - 0.5) * 0.3, t0 = 0.64 + (random() - 0.5) * 0.06;
        const span = mainEgg ? 1.25 : 0.7;
        const path: THREE.Vector3[] = [];
        const steps = 26;
        for (let k = 0; k <= steps; k++) {
          const s = k / steps;
          const zig = (k % 2 ? 1 : -1) * (0.012 + random() * 0.018);
          path.push(onShell(theta0 - span / 2 + span * s, t0 + zig + Math.sin(s * 5) * 0.02, 0.00006));
        }
        const crackBag = new Bag();
        crackBag.add(tube(path, 0.00015, { sides: 4 }), '#ffffff');
        const branch: THREE.Vector3[] = [];
        for (let k = 0; k <= 8; k++) branch.push(onShell(theta0 + span * 0.15 + (k % 2 ? 0.05 : -0.03), t0 - k * 0.022, 0.00006));
        crackBag.add(tube(branch, 0.00011, { sides: 4 }), '#ffffff');
        crackBag.into(body, crackMat);

        const chip = mainEgg && (a.hatching === 'chipped' || a.hatching === 'pipped' || a.hatching === 'both');
        if (chip) {
          // The hole: a dark patch on the shell where the chip came away.
          const du = 0.32, dv = 0.07;
          const patch = (lift: number, shrink: number) => {
            const pos: number[] = [], index: number[] = [];
            const n = 6;
            for (let i = 0; i <= n; i++)
              for (let j = 0; j <= n; j++) {
                const u = (i / n - 0.5) * du * shrink, v = (j / n - 0.5) * dv * shrink;
                // Round the corners off so the patch reads as a ragged chip, not a tile.
                const round = 1 - 0.35 * Math.pow(Math.abs((i / n - 0.5) * 2) * Math.abs((j / n - 0.5) * 2), 1.5);
                const p = onShell(theta0 + u * round, t0 + 0.035 + v * round, lift);
                pos.push(p.x, p.y, p.z);
              }
            for (let i = 0; i < n; i++)
              for (let j = 0; j < n; j++) {
                const q = i * (n + 1) + j;
                index.push(q, q + 1, q + n + 1, q + 1, q + n + 2, q + n + 1);
              }
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            g.setIndex(index);
            g.computeVertexNormals();
            return g;
          };
          const hole = new THREE.Mesh(patch(0.00004, 0.9), holeMat);
          body.add(hole);
          // The chip itself, hinged on its lower edge and lifted outward.
          const hinge = onShell(theta0, t0 + 0.035 - dv * 0.45, 0);
          const out = onShell(theta0, t0 + 0.035, 0.001).sub(onShell(theta0, t0 + 0.035, 0)).normalize();
          const along = onShell(theta0 + 0.1, t0, 0).sub(onShell(theta0 - 0.1, t0, 0)).normalize();
          const chipGeometry = patch(0.00012, 1.0);
          chipGeometry.translate(-hinge.x, -hinge.y, -hinge.z);
          const chipMesh = new THREE.Mesh(chipGeometry, new THREE.MeshStandardMaterial({ color: tint, roughness: 0.9, side: THREE.DoubleSide }));
          chipMesh.position.copy(hinge).addScaledVector(out, 0.0002);
          chipMesh.quaternion.setFromAxisAngle(along, -0.75 - random() * 0.3);
          chipMesh.castShadow = true;
          body.add(chipMesh);
          if (a.hatching === 'pipped') {
            // A beak tip and its white egg tooth breaking through.
            const base = onShell(theta0, t0 + 0.035, -0.0006);
            const tip = onShell(theta0, t0 + 0.05, 0.0021);
            const beak = new Bag();
            beak.add(tube([base, base.clone().lerp(tip, 0.6), tip], (t) => mix(0.00075, 0.00012, t), { sides: 7 }), '#6e6266');
            beak.add(new THREE.SphereGeometry(0.00028, 8, 6), '#fbf7ee', xf(tip.clone().lerp(base, 0.12)));
            beak.into(body, matte({ roughness: 0.5 }));
          }
        }
      }

      if (a.dew) {
        for (let i = 0; i < 9; i++) {
          const theta = -Math.PI / 2 + (random() - 0.5) * 2.2, t = 0.15 + random() * 0.7;
          const p = onShell(theta, t, 0.0001);
          const size = 0.00035 + random() * 0.00055;
          // Into the egg group's frame (body is turned a quarter round z).
          const q = p.clone().applyAxisAngle(V(0, 0, 1), -Math.PI / 2);
          q.applyEuler(group.rotation).add(group.position);
          dewList.push({ matrix: xf(q, V(size, size * 0.8, size)) });
        }
      }
    });

    eggGeometry.dispose();

    // ---- Something clinging.
    const extra = new Bag();
    if (a.clinging === 'wisp') {
      const from = eggs[0].position.clone().add(V(-0.006, R * 0.9, 0));
      for (let i = 0; i < 6; i++) {
        const start = from.clone().add(V(random() * 0.002, random() * 0.0008, (random() - 0.5) * 0.002));
        const end = start.clone().add(V(0.01 + random() * 0.006, -0.002 - random() * 0.003, R * 2 * (0.4 + random() * 0.5)));
        extra.add(tube(arc(start, end, V(0, 0.0025, 0), 8), 0.00009, { sides: 3 }), '#fbf6ea');
      }
    } else if (a.clinging === 'feather') {
      const centre = V(0.002, floor + R * 2 - sink + 0.0006, 0.001);
      const vane = leaf(0.009, 0.0042, { fold: -0.1, droop: 0.1, tip: 0.7, colour: (t) => new THREE.Color('#2f6d4a').lerp(new THREE.Color('#9bb39a'), Math.max(0, 0.35 - t) * 2.4) });
      extra.add(vane, null, xf(centre, 1, new THREE.Euler(0.05, 0.9, 0.1)));
      extra.add(tube([centre.clone().add(V(-0.002, 0, -0.002)), centre.clone().add(V(0.004, 0.0003, 0.004))], 0.00008, { sides: 3 }), '#d8d2c0');
    } else if (a.clinging === 'flake') {
      const p = eggs[0].position.clone().add(V(0.002, R * 0.95, -0.0005));
      extra.add(paint(new THREE.CircleGeometry(0.0018, 7), () => '#9cb8a6'), null, xf(p, V(1, 0.8, 1), new THREE.Euler(-Math.PI / 2 + 0.25, 0, 0.3)));
    }
    extra.into(root, matte({ side: THREE.DoubleSide, roughness: 0.9, metalness: a.clinging === 'feather' ? 0.35 : 0 }));

    if (a.dew) {
      // Dew on the bed too, where there is one.
      if (a.bed !== 'bare')
        for (let i = 0; i < 12; i++) {
          const angle = random() * TAU, reach = 0.012 + random() * 0.008;
          const size = 0.0004 + random() * 0.0007;
          dewList.push({ matrix: xf(V(Math.cos(angle) * reach, floor * 0.85 + size * 0.5, Math.sin(angle) * reach * 0.8), V(size, size * 0.85, size)) });
        }
      instances(root, new THREE.SphereGeometry(1, 14, 10), dewMaterial('#e8eef2', '#8b9b7c', 0.4), dewList);
    }

    // The cracked egg rocks now and then, harder the more energetic the moment.
    const rocking = cracked.length ? eggs.filter((_egg, index) => cracked.includes(index)) : [];
    const rest = rocking.map((egg) => egg.rotation.x);
    const strength = mix(0.015, 0.09, mood.energy);
    return finish(root, rocking.length ? (_dt, time) => {
      rocking.forEach((egg, index) => {
        const burst = Math.max(0, Math.sin(time * 0.8 + index * 2.1));
        egg.rotation.x = rest[index] + Math.sin(time * 11) * strength * burst * burst;
      });
    } : undefined);
  },
});
