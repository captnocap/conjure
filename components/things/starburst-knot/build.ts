import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

const COLOURS = {
  pink: 'Hot hydrogen pink, flushed and feverish.',
  blue: 'Blue-white: the newborn stars outshine their own gas.',
  crimson: 'Deep crimson and ember red, a banked furnace.',
  gold: 'Gold and peach, a boom town at sunset.',
  violet: 'Violet and magenta, bruised and electric.',
} as const;
const PALETTE: Record<keyof typeof COLOURS, [string, string, string]> = {
  pink: ['#ee4f95', '#ff9fc3', '#b82f7a'],
  blue: ['#4f8df0', '#a9d4ff', '#e0569a'],
  crimson: ['#c9283e', '#ff7b5c', '#7d1830'],
  gold: ['#eea23a', '#ffd58a', '#e8617a'],
  violet: ['#8b45d8', '#e06fe0', '#4b2a9a'],
};

/** A lumpy cloud: a sphere pushed in and out by a few waves. */
function cloud(random: () => number, bumpiness: number) {
  const geometry = new THREE.SphereGeometry(1, 30, 20);
  const p = Array.from({ length: 6 }, () => random() * 6.28);
  const position = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).normalize();
    const d = 1 + bumpiness * (Math.sin(v.x * 4 + p[0]) * Math.sin(v.y * 4 + p[1]) * 0.5 + Math.sin(v.z * 5 + p[2] + v.x * 3) * 0.3 + Math.sin(v.y * 9 + p[3]) * Math.sin(v.x * 8 + p[4]) * 0.2);
    position.setXYZ(i, v.x * d, v.y * d, v.z * d);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A tube that tapers from one radius to another. */
function taper(curve: THREE.Curve<THREE.Vector3>, from: number, to: number, steps = 40, sides = 7) {
  const frames = curve.computeFrenetFrames(steps, false);
  const positions: number[] = [], index: number[] = [];
  const point = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, r = mix(from, to, t);
    curve.getPointAt(t, point);
    for (let j = 0; j < sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      const n = frames.normals[i].clone().multiplyScalar(Math.cos(angle) * r).addScaledVector(frames.binormals[i], Math.sin(angle) * r);
      positions.push(point.x + n.x, point.y + n.y, point.z + n.z);
    }
  }
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j, b = i * sides + ((j + 1) % sides), c = a + sides, d = b + sides;
      index.push(a, c, b, b, c, d);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    colour: choice('What colour dominates the burst?', COLOURS),
    violence: score('How violent is it?', ['A soft glow, smouldering', 'A steady blaze', 'Erupting, throwing sparks and rays', 'A detonation tearing itself apart']),
    dust: choice('What pattern does the dark dust make?', {
      lanes: 'Parallel dark lanes banded across its face, like bars or furrows.',
      cobweb: 'A fine cobweb of thin threads, snagging everything.',
      fist: 'Thick fingers curled round it from below: a clenched fist holding a coal.',
      shreds: 'Only a few torn shreds are left, blown to the edges.',
      none: 'No dust at all: nothing hides it.',
    }),
    wind: choice('Is a superwind blowing out of it?', {
      none: 'No: all the heat is still held inside.',
      chimney: 'A single tall chimney of red filaments rises from the top, like smoke from a forge.',
      horns: 'Two flaring plumes splay up and outward like horns or a letter V.',
      fountain: 'A wide fountain that rises and rains back down around it.',
    }),
    stage: choice('How far along is the burst?', {
      igniting: 'Just igniting: mostly dark cloud, with the first lights breaking through cracks.',
      peak: 'At full blaze: bright gas packed with brilliant clusters.',
      hollowed: 'Hollowed out: the clusters have blown a cavity and sit in an open shell.',
      spent: 'Nearly spent: a loose scatter of fading clusters and a few rags of gas.',
    }),
    clusters: score('How many super star clusters shine in it?', ['Two or three', 'A handful', 'A dozen', 'Swarming with them']),
    shape: choice('What is its overall shape?', {
      round: 'A round clenched ball.',
      bar: 'Stretched into a long bar or ridge where the two clouds met edge on.',
      twin: 'Two lobes pressed together, with the brightest point at the seam.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const gauss = () => (random() + random() + random() - 1.5) * 0.82;
    const palette = PALETTE[a.colour].map((hex) => new THREE.Color(hex).offsetHSL((mood.warmth - 0.5) * -0.03, (mood.cheer - 0.5) * 0.2, (mood.cheer - 0.5) * 0.08));
    const dustColour = new THREE.Color('#33222a').lerp(new THREE.Color('#5a3b33'), mood.warmth * 0.6);
    const starBlue = new THREE.Color('#7fb6ff'), starWhite = new THREE.Color('#e9f2ff');
    const glow = mix(0.25, 0.8, mood.cheer);
    const fury = a.violence, stage = a.stage;
    const stretch = a.shape === 'bar' ? new THREE.Vector3(1.45, 0.78, 0.85) : new THREE.Vector3(1, 1, 1);
    const core = new THREE.Vector3(0, 0, 0);
    const lobe = (i: number) => (a.shape === 'twin' ? (i % 2 ? 0.95 : -0.95) : 0);

    // Gas: overlapping lumps. Their spread and tint tell the stage.
    const lumps = Math.round(mix(6, 13, mood.density) * { igniting: 1, peak: 1, hollowed: 1.2, spent: 0.5 }[stage]);
    const spread = { igniting: 0.6, peak: 0.7, hollowed: 1.3, spent: 1.5 }[stage] * mix(0.95, 1.15, fury);
    const gas: THREE.Mesh[] = [];
    for (let i = 0; i < lumps; i++) {
      const direction = new THREE.Vector3(gauss(), gauss() * 0.8, gauss()).normalize();
      const distance = stage === 'hollowed' ? spread * mix(0.85, 1.1, random()) : spread * Math.pow(random(), 0.6);
      if (stage === 'hollowed' && direction.z > 0.35 && direction.y > -0.2) direction.z *= -1; // leave the shell open toward the viewer
      const size = { igniting: 1.0, peak: 1.0, hollowed: 0.78, spent: 0.5 }[stage] * mix(0.6, 1.15, random());
      const dark = stage === 'igniting' ? random() < 0.6 : stage === 'spent' ? random() < 0.3 : random() < 0.1;
      const tint = dark ? dustColour.clone().lerp(palette[2], 0.3) : palette[i % 3 === 2 ? 2 : i % 2].clone().offsetHSL(0, 0, (random() - 0.5) * 0.08);
      const lump = s.mesh(cloud(random, mix(0.22, 0.42, fury)), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.85, flatShading: false, emissive: tint, emissiveIntensity: dark ? 0.05 : glow * 0.3 }));
      lump.position.set((direction.x * distance + lobe(i)) * stretch.x, direction.y * distance * stretch.y, direction.z * distance * stretch.z);
      lump.scale.set(size * mix(0.85, 1.25, random()), size * mix(0.8, 1.1, random()), size * mix(0.85, 1.2, random()));
      lump.rotation.set(random() * 6, random() * 6, random() * 6);
      gas.push(lump);
    }
    const reach = spread + 0.9;

    // Super star clusters: hard bright beads with a swarm of stars round each.
    const stars: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    const clusterCount = Math.round(mix(2, 20, a.clusters));
    const clusterSpread = { igniting: 1.15, peak: 1.3, hollowed: 0.7, spent: 1.4 }[stage];
    const beads: THREE.Mesh[] = [];
    for (let i = 0; i < clusterCount; i++) {
      const direction = new THREE.Vector3(gauss(), gauss() * 0.8, gauss() * 0.6 + 0.5).normalize();
      const distance = clusterSpread * mix(stage === 'hollowed' ? 0 : 0.75, 1.15, random());
      const at = new THREE.Vector3((direction.x * distance + lobe(i) * 0.6) * stretch.x, direction.y * distance * stretch.y + 0.05, direction.z * distance * stretch.z);
      const size = mix(0.13, 0.26, random()) * (stage === 'igniting' ? 0.75 : stage === 'spent' ? 0.8 : 1) * (i === 0 ? 1.5 : 1);
      const tint = (a.colour === 'blue' ? (i % 3 ? starWhite : palette[2]) : i % 4 === 3 ? starWhite : starBlue).clone();
      if (stage === 'spent') tint.lerp(new THREE.Color('#e9c88a'), 0.5);
      beads.push(s.ball([size, size, size], at.toArray(), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.35, emissive: tint, emissiveIntensity: glow * 1.1 }), 14));
      const halo = new THREE.Mesh(new THREE.SphereGeometry(1.22, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.BackSide }));
      beads.at(-1)!.add(halo);
      for (let k = 0; k < 16; k++) stars.push({ at: at.clone().add(new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(size * 2.4)).toArray(), size: size * mix(0.12, 0.34, random()), color: tint.clone().offsetHSL(0, 0, (random() - 0.5) * 0.2) });
    }

    // Rays and sparks: how hard it is going off.
    const rays = Math.round(Math.max(0, fury - 0.3) * 22);
    const rayMaterial = new THREE.MeshStandardMaterial({ color: palette[1], roughness: 0.6, emissive: palette[1], emissiveIntensity: glow * 0.8 });
    for (let i = 0; i < rays; i++) {
      const direction = new THREE.Vector3(gauss(), gauss() * 0.7 + 0.15, gauss()).normalize();
      const from = direction.clone().multiply(stretch).multiplyScalar(reach * 0.55), to = direction.clone().multiply(stretch).multiplyScalar(reach * mix(1.0, 1.5, random()) * mix(0.8, 1.15, fury));
      s.rod(from.toArray(), to.toArray(), mix(0.03, 0.065, random()), rayMaterial, 0.004);
    }
    const sparks = Math.round(mix(120, 520, fury) * mix(0.6, 1.2, mood.density));
    for (let i = 0; i < sparks; i++) {
      const direction = new THREE.Vector3(gauss(), gauss() * 0.85, gauss()).normalize();
      const distance = reach * mix(0.7, mix(1.05, 1.5, fury), Math.pow(random(), 1.6));
      stars.push({ at: direction.multiply(stretch).multiplyScalar(distance).toArray(), size: mix(0.018, 0.06, random() * random()), color: (i % 3 === 0 ? starBlue : palette[i % 2]).clone().offsetHSL(0, 0, (random() - 0.4) * 0.2) });
    }

    // Dust.
    const dustMaterial = new THREE.MeshStandardMaterial({ color: dustColour, roughness: 0.95 });
    const onSurface = (lon: number, lat: number, lift = 1) => new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)).multiply(stretch).multiplyScalar((spread + 0.75) * lift);
    if (a.dust === 'lanes') {
      const count = 3 + Math.floor(random() * 2), slant = (random() - 0.5) * 0.9;
      for (let i = 0; i < count; i++) {
        const lat0 = mix(-0.75, 0.75, (i + 0.5) / count), wobble = random() * 6;
        const points = Array.from({ length: 16 }, (_unused, k) => {
          const lon = mix(-1.7, 1.7, k / 15);
          return onSurface(lon, lat0 + slant * Math.sin(lon) * 0.5 + Math.sin(lon * 3 + wobble) * 0.08, 1.02 + Math.sin(k * 0.9 + wobble) * 0.03);
        });
        s.mesh(taper(new THREE.CatmullRomCurve3(points), mix(0.07, 0.15, random()), 0.03, 60, 7), dustMaterial).scale.set(1, 1, 1);
      }
    } else if (a.dust === 'cobweb') {
      const nodes = Array.from({ length: 11 }, () => onSurface(mix(-2.2, 2.2, random()), mix(-1.1, 1.1, random()), mix(1.0, 1.2, random())));
      nodes.forEach((node, i) => {
        const others = nodes.map((other, j) => ({ j, d: other.distanceTo(node) })).filter((o) => o.j !== i).sort((x, y) => x.d - y.d).slice(0, 2);
        for (const { j } of others) {
          if (j < i && random() < 0.5) continue;
          const middle = node.clone().add(nodes[j]).multiplyScalar(0.5).multiplyScalar(mix(0.9, 1.12, random()));
          s.mesh(taper(new THREE.CatmullRomCurve3([node, middle, nodes[j]]), 0.028, 0.02, 24, 5), dustMaterial);
        }
        const out = node.clone().multiplyScalar(mix(1.2, 1.5, random())).add(new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(0.3));
        s.mesh(taper(new THREE.CatmullRomCurve3([node, node.clone().lerp(out, 0.5).add(new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(0.15)), out]), 0.03, 0.006, 24, 5), dustMaterial);
      });
    } else if (a.dust === 'fist') {
      const fingers = 4 + Math.floor(random() * 2);
      for (let i = 0; i < fingers; i++) {
        const lon = mix(-1.5, 1.5, (i + 0.5) / fingers) + gauss() * 0.1, curl = mix(0.5, 1.15, random());
        const points = Array.from({ length: 10 }, (_unused, k) => {
          const t = k / 9;
          return onSurface(lon + Math.sin(t * 3) * 0.12, mix(-1.45, curl, t), mix(1.12, 0.98, t));
        });
        s.mesh(taper(new THREE.CatmullRomCurve3(points), mix(0.24, 0.32, random()), 0.09, 50, 9), dustMaterial);
      }
      const wrist = s.mesh(cloud(random, 0.3), dustMaterial, [0, -(spread + 0.75) * stretch.y * 1.05, 0]);
      wrist.scale.set(0.95 * stretch.x, 0.5, 0.85);
    } else if (a.dust === 'shreds') {
      for (let i = 0; i < 6; i++) {
        const lon = random() * 6.28, lat = mix(-0.9, 0.9, random());
        const points = Array.from({ length: 5 }, (_unused, k) => onSurface(lon + k * 0.13, lat + Math.sin(k + i) * 0.1, mix(1.08, 1.25, random())));
        s.mesh(taper(new THREE.CatmullRomCurve3(points), 0.02, mix(0.07, 0.12, random()), 24, 6), dustMaterial);
      }
    }

    // Superwind.
    const windColour = new THREE.Color('#e0354f').lerp(palette[0], 0.35);
    const windMaterial = new THREE.MeshStandardMaterial({ color: windColour, roughness: 0.7, emissive: windColour, emissiveIntensity: glow * 0.6 });
    const streams: THREE.CatmullRomCurve3[] = [];
    const top = (spread + 0.3) * stretch.y;
    const plume = (lean: number, height: number, flare: number, strands: number, droop: number) => {
      for (let i = 0; i < strands; i++) {
        const angle = (i / strands) * Math.PI * 2 + random() * 0.5, wob = random() * 6;
        const points = Array.from({ length: 9 }, (_unused, k) => {
          const t = k / 8, r = 0.25 + flare * Math.pow(t, 1.5) * mix(0.7, 1.2, random());
          const y = top * 0.5 + height * (t - droop * t * t);
          return new THREE.Vector3(Math.cos(angle + Math.sin(t * 3 + wob) * 0.3) * r + lean * height * t, y, Math.sin(angle + Math.sin(t * 3 + wob) * 0.3) * r * 0.8);
        });
        const curve = new THREE.CatmullRomCurve3(points);
        streams.push(curve);
        s.mesh(taper(curve, mix(0.07, 0.11, random()), 0.012, 40, 6), windMaterial);
      }
    };
    const windHeight = mix(2.4, 4.2, fury);
    if (a.wind === 'chimney') plume((random() - 0.5) * 0.2, windHeight * 1.15, 0.75, 9, 0);
    if (a.wind === 'horns') { plume(-0.5, windHeight * 0.9, 0.55, 6, 0); plume(0.5, windHeight * 0.9, 0.55, 6, 0); }
    if (a.wind === 'fountain') plume(0, windHeight * 1.3, 1.7, 13, 0.6);

    const flock = s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), stars);
    flock.castShadow = false;
    const riders = streams.flatMap((curve) => Array.from({ length: 7 }, () => ({ curve, t: random(), size: mix(0.03, 0.06, random()) })));
    const embers = riders.length ? s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: palette[1] }), riders.map((r) => ({ at: r.curve.getPoint(r.t).toArray(), size: r.size }))) : null;
    if (embers) embers.castShadow = false;
    void core;

    const matrix = new THREE.Matrix4(), point = new THREE.Vector3();
    const pace = mix(0.03, 0.3, mood.energy) * mix(0.6, 1.4, fury);
    const sizes = beads.map((bead) => bead.scale.x);
    return s.finish({
      footprint: 1.8,
      update(dt, time) {
        beads.forEach((bead, i) => bead.scale.setScalar(sizes[i] * (1 + Math.sin(time * (2 + i * 0.37) + i) * 0.08 * (0.3 + mood.energy))));
        if (!embers) return;
        riders.forEach((rider, i) => {
          rider.t = (rider.t + dt * pace) % 1;
          rider.curve.getPoint(rider.t, point);
          const size = rider.size * Math.sin(rider.t * Math.PI);
          matrix.makeScale(size, size, size).setPosition(point);
          embers.setMatrixAt(i, matrix);
        });
        embers.instanceMatrix.needsUpdate = true;
      },
    });
  },
});
