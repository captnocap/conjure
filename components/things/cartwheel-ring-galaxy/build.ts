import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

const RINGS = {
  blue: 'Electric blue-white, a ring of furious newborn stars.',
  rose: 'Blue studded with hot pink star-forming knots, a jewelled band.',
  white: 'Burnt-out pale silver, the fire mostly spent.',
  violet: 'Violet and teal, an unfamiliar sky.',
  verdigris: 'Green-blue like old copper, an heirloom brooch.',
  ember: 'Red-orange, a ring of coals or a branding mark.',
} as const;
const RING_PALETTE: Record<keyof typeof RINGS, [string, string]> = {
  blue: ['#2c6ee6', '#7cc2ff'],
  rose: ['#3a78e0', '#ff5fa2'],
  white: ['#9aa6bd', '#dfe6f2'],
  violet: ['#7a45d6', '#36c9c2'],
  verdigris: ['#2f9a8a', '#8fd6b6'],
  ember: ['#d2452a', '#ffa64a'],
};

/** A torus whose thickness and colour change around the ring. */
function lumpyTorus(radius: (angle: number) => number, tube: (angle: number) => number, colour: (angle: number) => THREE.Color, from = 0, to = Math.PI * 2, steps = 160, sides = 10) {
  const positions: number[] = [], colours: number[] = [], index: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = mix(from, to, i / steps), R = radius(angle), ends = to - from < 6.2 ? Math.min(1, Math.sin((i / steps) * Math.PI) * 6) : 1;
    const r = tube(angle) * Math.max(0.08, ends), tint = colour(angle);
    for (let j = 0; j < sides; j++) {
      const around = (j / sides) * Math.PI * 2, out = R + Math.cos(around) * r;
      positions.push(Math.cos(angle) * out, Math.sin(angle) * out, Math.sin(around) * r * 0.8);
      colours.push(tint.r, tint.g, tint.b);
    }
  }
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j, b = i * sides + ((j + 1) % sides), c = a + sides, d = b + sides;
      index.push(a, b, c, b, d, c);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    ring: choice('What colour is the outer ring?', RINGS),
    lumps: score('How lumpy is the ring?', ['A smooth even band', 'Gently beaded', 'Knotted with bright clumps', 'A ragged chain of separate blobs']),
    spokes: choice('Are there spokes between the hub and the ring?', {
      none: 'None: an empty hoop around a lonely hub, a target with nothing in it.',
      faint: 'A few faint curved wisps, barely there.',
      wheel: 'Many clear spokes, unmistakably a cartwheel.',
      swirl: 'Spokes swept into a pinwheel, the old spiral still showing through.',
    }),
    hub: score('How large is the yellow hub?', ['A tiny bright bead', 'A modest yolk', 'A big golden boss that nearly fills the ring']),
    bullet: choice('Is the galaxy that punched through still nearby?', {
      gone: 'No: long gone, only the ring remembers.',
      near: 'Yes, a small blue galaxy hangs just off to one side, looking innocent.',
      through: 'It is caught in the act, sitting on the axis right in front of the hole with a thread of gas trailing back.',
      pair: 'Two small companions loiter beside it, and nobody knows which one did it.',
    }),
    wave: choice('What state is the ring in?', {
      whole: 'A single complete ring.',
      double: 'A second, smaller inner ring too: ripple after ripple.',
      broken: 'Broken open on one side, a horseshoe.',
      offcentre: 'Whole, but the hub sits well off-centre: a glancing blow.',
    }),
    lean: choice('How does it stand?', {
      upright: 'Upright like a wheel on its rim or a brooch pinned to a lapel.',
      tilted: 'Leaning back, an oval seen at an angle.',
      flat: 'Lying nearly flat like a dropped hoop.',
    }),
    membrane: noul('Is the space inside the ring filled with a faint glassy haze of old stars?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const gauss = () => (random() + random() + random() - 1.5) * 0.82;
    const [base, accent] = RING_PALETTE[a.ring].map((hex) => new THREE.Color(hex).offsetHSL((mood.warmth - 0.5) * -0.03, (mood.cheer - 0.5) * 0.2, (mood.cheer - 0.5) * 0.07));
    const gold = new THREE.Color('#f2b63c').lerp(new THREE.Color('#e9742e'), mood.warmth * 0.35);
    const glow = mix(0.2, 0.75, mood.cheer);
    const wheel = new THREE.Group();
    s.root.add(wheel);
    const add = (mesh: THREE.Mesh) => {
      mesh.castShadow = mesh.receiveShadow = true;
      wheel.add(mesh);
      return mesh;
    };

    const R = 2.1, lump = mix(0.05, 1, a.lumps);
    const phases = Array.from({ length: 5 }, () => random() * Math.PI * 2);
    const noise = (angle: number) => (Math.sin(angle * 3 + phases[0]) + Math.sin(angle * 7 + phases[1]) * 0.8 + Math.sin(angle * 13 + phases[2]) * 0.6 + Math.sin(angle * 23 + phases[3]) * 0.35) / 2.75;
    const oval = 1 + (random() - 0.5) * 0.12;
    const radius = (angle: number) => R * (1 + 0.05 * Math.sin(angle * 2 + phases[4])) * (Math.abs(Math.cos(angle)) * (oval - 1) + 1);
    const gapAt = random() * Math.PI * 2, gap = a.wave === 'broken' ? mix(0.7, 1.3, random()) : 0;
    const body = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: base, emissiveIntensity: glow * 0.4 });
    const tube = (angle: number) => 0.2 * Math.max(0.12, 1 - lump * 0.55 + noise(angle) * lump * 1.15);
    const tint = (angle: number) => base.clone().lerp(accent, clamp01(0.5 + noise(angle) * 1.6));
    add(new THREE.Mesh(lumpyTorus(radius, tube, tint, gapAt + gap / 2, gapAt + Math.PI * 2 - gap / 2), body));
    if (a.wave === 'double') add(new THREE.Mesh(lumpyTorus((angle) => radius(angle + 1) * 0.5, (angle) => tube(angle + 2) * 0.55, (angle) => gold.clone().lerp(accent, clamp01(0.3 + noise(angle)))), body));

    // Knots of star formation sit on the lumps, and loose stars sheath the whole ring.
    const stars: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    const inGap = (angle: number) => gap > 0 && Math.abs(((angle - gapAt + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < gap / 2;
    const knots = Math.round(mix(4, 22, a.lumps));
    for (let i = 0; i < knots; i++) {
      const angle = (i / knots) * Math.PI * 2 + random() * 0.25;
      if (inGap(angle) || noise(angle) < -0.15) continue;
      const size = mix(0.1, 0.3, lump) * mix(0.5, 1, random()), r = radius(angle) + gauss() * 0.05;
      const colour = (i % 3 ? accent : base).clone().offsetHSL(0, 0, 0.08);
      const knot = add(new THREE.Mesh(new THREE.SphereGeometry(size, 12, 8), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.45, emissive: colour, emissiveIntensity: glow })));
      knot.position.set(Math.cos(angle) * r, Math.sin(angle) * r, gauss() * 0.05);
    }
    const count = Math.round(mix(300, 900, mood.density));
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2;
      if (inGap(angle)) continue;
      const r = radius(angle) + gauss() * mix(0.16, 0.34, lump) + Math.abs(gauss()) * 0.12;
      stars.push({ at: [Math.cos(angle) * r, Math.sin(angle) * r, gauss() * 0.14], size: mix(0.018, 0.05, random() * random()), color: (i % 4 ? base : accent).clone().offsetHSL(0, 0, (random() - 0.3) * 0.25) });
    }

    // Hub.
    const hubSize = mix(0.22, 0.95, a.hub);
    const off = a.wave === 'offcentre' ? new THREE.Vector3(mix(0.5, 0.9, random()), mix(-0.6, 0.6, random()), 0) : new THREE.Vector3(gauss() * 0.1, gauss() * 0.1, 0);
    const hub = add(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), new THREE.MeshStandardMaterial({ color: gold, roughness: 0.5, emissive: gold, emissiveIntensity: glow * 0.8 })));
    hub.scale.set(hubSize, hubSize * 0.92, hubSize * 0.5);
    hub.position.copy(off);
    const collar = add(new THREE.Mesh(lumpyTorus(() => hubSize * 1.25, () => hubSize * 0.045, () => gold.clone().lerp(new THREE.Color('#b3452a'), 0.45), 0, Math.PI * 2, 60, 8), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 })));
    collar.position.copy(off);
    for (let i = 0; i < 90; i++) {
      const angle = random() * Math.PI * 2, r = hubSize * mix(1, 1.9, random());
      stars.push({ at: [off.x + Math.cos(angle) * r, off.y + Math.sin(angle) * r, gauss() * 0.1], size: mix(0.02, 0.045, random()), color: gold.clone().offsetHSL(0, 0, (random() - 0.5) * 0.2) });
    }

    // Spokes.
    const spokeCount = { none: 0, faint: 4 + Math.floor(random() * 2), wheel: 9 + Math.floor(random() * 5), swirl: 7 + Math.floor(random() * 3) }[a.spokes];
    const spokeTint = base.clone().lerp(new THREE.Color('#ffffff'), 0.45);
    const spokeMaterial = new THREE.MeshStandardMaterial({ color: spokeTint, roughness: 0.8, emissive: spokeTint, emissiveIntensity: glow * 0.3 });
    const twist = a.spokes === 'swirl' ? 1.5 : a.spokes === 'faint' ? 0.5 : 0.22;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2 + random() * 0.3;
      if (a.spokes === 'faint' && inGap(angle + twist)) continue;
      const points = Array.from({ length: 12 }, (_unused, k) => {
        const t = k / 11, theta = angle + twist * t + Math.sin(t * 4 + i) * 0.05, edge = radius(theta) - 0.1;
        const p = new THREE.Vector3(Math.cos(theta) * edge, Math.sin(theta) * edge, 0);
        const inner = off.clone().add(new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(hubSize * 1.2));
        return inner.lerp(p, t);
      });
      const curve = new THREE.CatmullRomCurve3(points);
      add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, a.spokes === 'faint' ? 0.02 : 0.035, 6), spokeMaterial));
      for (let k = 0; k < (a.spokes === 'faint' ? 10 : 18); k++) {
        const p = curve.getPoint(random());
        stars.push({ at: [p.x + gauss() * 0.08, p.y + gauss() * 0.08, gauss() * 0.06], size: mix(0.018, 0.04, random()), color: spokeTint.clone().lerp(accent, random() * 0.4) });
      }
    }

    if (a.membrane) {
      const haze = new THREE.Mesh(new THREE.CircleGeometry(R * 0.97, 64), new THREE.MeshBasicMaterial({ color: base.clone().lerp(gold, 0.35), transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
      wheel.add(haze);
    }

    // The bullet.
    const companion = (at: THREE.Vector3, size: number, colour: THREE.Color, turn: number) => {
      const group = new THREE.Group();
      group.position.copy(at);
      group.rotation.set(0.5 + turn, turn * 2, turn);
      const bulge = new THREE.Mesh(new THREE.SphereGeometry(size * 0.45, 16, 10), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.5, emissive: colour, emissiveIntensity: glow * 0.7 }));
      bulge.scale.z = 0.6;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(size, size, size * 0.08, 28), new THREE.MeshStandardMaterial({ color: colour.clone().lerp(new THREE.Color('#ffffff'), 0.25), roughness: 0.8, emissive: colour, emissiveIntensity: glow * 0.25 }));
      disc.rotation.x = Math.PI / 2;
      const arm = new THREE.Mesh(new THREE.TorusGeometry(size * 0.68, size * 0.07, 6, 30, 4.2), new THREE.MeshStandardMaterial({ color: colour.clone().offsetHSL(0, 0, -0.15), roughness: 0.8 }));
      arm.position.z = size * 0.04;
      for (const mesh of [bulge, disc, arm]) { mesh.castShadow = true; group.add(mesh); }
      wheel.add(group);
    };
    const bulletBlue = new THREE.Color('#3f82e8'), bulletGold = new THREE.Color('#e8a53a');
    if (a.bullet === 'near' || a.bullet === 'pair') companion(new THREE.Vector3(-R * 1.25, R * mix(0.55, 0.95, random()), 0.2), 0.42, bulletBlue, random());
    if (a.bullet === 'pair') companion(new THREE.Vector3(-R * 0.75, R * 1.35, -0.1), 0.3, bulletGold, random() + 1);
    if (a.bullet === 'through') {
      const at = new THREE.Vector3(off.x + 0.25, off.y + 0.2, 1.7);
      companion(at, 0.46, bulletBlue, 0.3);
      const trail = new THREE.CatmullRomCurve3([off.clone().setZ(hubSize * 0.4), new THREE.Vector3(off.x + 0.3, off.y - 0.1, 0.9), at]);
      add(new THREE.Mesh(new THREE.TubeGeometry(trail, 20, 0.035, 6), spokeMaterial));
      for (let i = 0; i < 60; i++) {
        const p = trail.getPoint(random());
        stars.push({ at: [p.x + gauss() * 0.12, p.y + gauss() * 0.12, p.z + gauss() * 0.1], size: mix(0.02, 0.05, random()), color: i % 3 ? bulletBlue : accent });
      }
    }

    const flock = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), stars.length);
    const matrix = new THREE.Matrix4();
    stars.forEach((star, i) => {
      matrix.makeScale(star.size, star.size, star.size).setPosition(...star.at);
      flock.setMatrixAt(i, matrix);
      flock.setColorAt(i, star.color);
    });
    wheel.add(flock);

    wheel.rotation.x = { upright: -0.12, tilted: -0.7, flat: -1.25 }[a.lean];
    wheel.rotation.y = (random() - 0.5) * 0.5;
    const turning = mix(0.0, 0.12, mood.energy);
    return s.finish({
      footprint: a.lean === 'flat' ? 2.3 : 1.5,
      update(dt, time) {
        hub.scale.set(hubSize, hubSize * 0.92, hubSize * 0.5).multiplyScalar(1 + Math.sin(time * 1.3) * 0.02 * (0.5 + mood.energy));
        flock.rotation.z += dt * turning;
      },
    });
  },
});
