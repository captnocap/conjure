import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

const CURVES = {
  arc: 'A gentle open arc, a single calm sweep like a scarf let go.',
  hook: 'A shepherd\'s crook: it runs out straight-ish, then curls sharply back on itself at the tip.',
  loop: 'A full loop that swings right round and almost closes, a lasso.',
  whip: 'An S-bend that changes its mind halfway, a cracked whip or a windblown lock of hair.',
  corkscrew: 'A rising corkscrew of two turns, a spring pulled out of a watch.',
} as const;
const COLOURS = {
  blue: 'Young blue-white stars: cold, fresh, newly made.',
  gold: 'Old amber and ivory stars: a thread of something ancient pulled loose.',
  rose: 'Rose and magenta star-forming gas, flushed and tender.',
  violet: 'Violet fading to teal, strange and dreamlike.',
  ash: 'Grey-lilac embers, most of the light already gone out.',
} as const;
const PALETTE: Record<keyof typeof COLOURS, [string, string, string]> = {
  blue: ['#2f6fe0', '#6fb4ff', '#1c3f9c'],
  gold: ['#e0962a', '#f4cf6a', '#a8551c'],
  rose: ['#e2468a', '#ff9cc0', '#a02a78'],
  violet: ['#7a48d8', '#3fc4c0', '#4a2a98'],
  ash: ['#7d7896', '#b3aec4', '#4d4a66'],
};

/** A tube whose radius changes along its length, flattened into a ribbon. */
function ribbon(curve: THREE.Curve<THREE.Vector3>, radius: (t: number) => number, colour: (t: number) => THREE.Color, flat = 0.4, steps = 120, sides = 8) {
  const frames = curve.computeFrenetFrames(steps, false);
  const positions: number[] = [], colours: number[] = [], index: number[] = [];
  const point = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    curve.getPointAt(t, point);
    const r = radius(t), tint = colour(t);
    for (let j = 0; j < sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      const n = frames.normals[i].clone().multiplyScalar(Math.cos(angle) * r).addScaledVector(frames.binormals[i], Math.sin(angle) * r * flat);
      positions.push(point.x + n.x, point.y + n.y, point.z + n.z);
      colours.push(tint.r, tint.g, tint.b);
    }
  }
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j, b = i * sides + ((j + 1) % sides), c = a + sides, d = b + sides;
      index.push(a, c, b, b, c, d);
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
    curve: choice('What curve does the tail take?', CURVES),
    colour: choice('What colour are its stars?', COLOURS),
    beads: choice('Is it beaded with star clusters?', {
      smooth: 'Smooth and unbroken, a single brushstroke with no knots in it.',
      pearls: 'Many small evenly spaced clusters, a string of pearls.',
      knots: 'A few big bright lumps, knots tied in a rope.',
      tipped: 'Smooth, but ending in one large glowing clump at the very tip, a dwarf galaxy being born.',
    }),
    unravelled: score('How far has it unravelled?', ['A tight clean cord', 'Loosening', 'Splitting into strands', 'Frayed to separate threads and scattered dust']),
    length: score('How long is it?', ['A short stub just pulling free', 'A long streamer', 'Enormous, many times the galaxy it left']),
    origin: choice('What is at the thick end, where it came from?', {
      galaxy: 'Still joined to the bright disc of the galaxy it is leaving.',
      remnant: 'Only a small dim core is left: the tail is now bigger than its parent.',
      severed: 'Nothing: it has been cut loose and the thick end is a ragged stump.',
      held: 'A second, smaller galaxy grips the far end too, so it is a rope pulled taut between two.',
    }),
    story: choice('What is it doing right now?', {
      flung: 'Still being flung outward, stars streaming toward the tip.',
      falling: 'Past its peak and raining back toward where it came from.',
      frozen: 'Hanging still, a long-finished gesture.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const gauss = () => (random() + random() + random() - 1.5) * 0.82;
    const palette = PALETTE[a.colour].map((hex) => new THREE.Color(hex).offsetHSL((mood.warmth - 0.5) * -0.035, (mood.cheer - 0.5) * 0.25, (mood.cheer - 0.5) * 0.08));
    const core = new THREE.Color('#f0b445').offsetHSL(0, 0, (mood.cheer - 0.5) * 0.1);
    const fray = clamp01(a.unravelled * 0.85 + mood.wear * 0.25);
    const reach = mix(0.55, 1.5, a.length);

    // The path, in the tail's own plane (u right, v up), winding out from a galaxy at the origin.
    const shape = {
      arc: { sweep: 1.9, grow: 3.4, curl: 0, wave: 0, rise: 0.15 },
      hook: { sweep: 1.3, grow: 3.6, curl: 3.0, wave: 0, rise: 0.1 },
      loop: { sweep: 5.6, grow: 1.5, curl: 0.5, wave: 0, rise: 0.25 },
      whip: { sweep: 1.2, grow: 3.8, curl: 0, wave: 1.25, rise: 0.1 },
      corkscrew: { sweep: 10.5, grow: 1.5, curl: 0, wave: 0, rise: 1.0 },
    }[a.curve];
    const start = 0.75;
    const jitter = (random() - 0.5) * 0.5;
    const tilt = a.curve === 'corkscrew' ? 0.25 : mix(0.95, 1.2, random());
    const at = (t: number) => {
      const theta = -0.5 + jitter + shape.sweep * t + shape.curl * t * t * t + shape.wave * Math.sin(t * Math.PI * 2);
      const r = start + shape.grow * reach * Math.pow(t, a.curve === 'hook' ? 0.8 : 1) * (a.curve === 'hook' ? 1 - 0.35 * t * t * t : 1);
      const u = Math.cos(theta) * r, v = Math.sin(theta) * r;
      const w = shape.rise * (a.curve === 'corkscrew' ? mix(0.8, 1.25, a.length) * t : reach * t * Math.sin(t * 2.4));
      // Stand the plane up so the curve faces the viewer; w is depth out of the plane.
      return new THREE.Vector3(u, v * Math.sin(tilt) + w * Math.cos(tilt) * (a.curve === 'corkscrew' ? 4 : 1), -v * Math.cos(tilt) + w * Math.sin(tilt));
    };
    const samples = Array.from({ length: 60 }, (_unused, i) => at(i / 59));
    const path = new THREE.CatmullRomCurve3(samples);
    const frames = path.computeFrenetFrames(200, false);
    const width = (t: number) => mix(0.34, 0.2, fray) * Math.pow(1 - t, 0.75) + 0.03;
    const tint = (t: number) => core.clone().lerp(palette[0], clamp01(t * 3.2)).lerp(palette[1], clamp01((t - 0.55) * 1.4));
    const glow = mix(0.25, 0.75, mood.cheer);
    const cord = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, emissive: palette[0], emissiveIntensity: glow * 0.35 });

    // The main cord thins as it unravels; loose strands peel away from it toward the tip.
    const keep = mix(1, 0.45, fray);
    s.mesh(ribbon(path, (t) => width(t) * (t > keep ? Math.max(0.12, 1 - (t - keep) * 6) : 1), tint), cord);
    const strands = Math.round(fray * 6);
    const offsetAt = (t: number, du: number, dv: number) => {
      const i = Math.min(200, Math.round(t * 200));
      return path.getPointAt(t).addScaledVector(frames.normals[i], du).addScaledVector(frames.binormals[i], dv);
    };
    for (let strand = 0; strand < strands; strand++) {
      const from = mix(0.15, 0.6, random()) * mix(1, 0.6, fray), angle = random() * Math.PI * 2, spread = mix(0.25, 1.1, fray) * mix(0.6, 1.3, random());
      const wobble = random() * 6, to = mix(0.8, 1, random());
      const points = Array.from({ length: 24 }, (_unused, i) => {
        const t = mix(from, to, i / 23), away = Math.pow((t - from) / (1 - from), 1.6) * spread;
        return offsetAt(t, Math.cos(angle + Math.sin(t * 5 + wobble) * 0.6) * away, Math.sin(angle) * away * 0.6);
      });
      const thread = new THREE.CatmullRomCurve3(points);
      s.mesh(ribbon(thread, (t) => mix(0.05, 0.012, t) * mix(0.8, 1.3, random()), (t) => palette[strand % 2 ? 1 : 0].clone().lerp(palette[2], t * 0.5), 0.8, 40, 6), cord);
    }

    // Stars: a sheath around the cord, widening where it has come apart.
    const total = Math.round(mix(500, 1500, mood.density) * mix(0.7, 1.2, a.length));
    const stars: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    for (let i = 0; i < total; i++) {
      const t = Math.pow(random(), 0.85);
      const loose = width(t) * 1.5 + fray * t * 0.9 + 0.05;
      const p = offsetAt(t, gauss() * loose, gauss() * loose * 0.5);
      stars.push({ at: p.toArray(), size: mix(0.02, 0.055, random() * random()) * mix(1.25, 0.8, t), color: (t < 0.12 ? core : palette[i % 3]).clone().offsetHSL(0, 0, (random() - 0.5) * 0.18) });
    }

    // Clusters strung along it.
    const bead = (t: number, size: number, colour: THREE.Color) => {
      const centre = offsetAt(t, gauss() * 0.06, 0);
      s.ball([size, size, size], centre.toArray(), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.5, emissive: colour, emissiveIntensity: glow }), 14);
      for (let i = 0; i < 14; i++) {
        const d = new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(size * 2.2);
        stars.push({ at: centre.clone().add(d).toArray(), size: size * mix(0.15, 0.4, random()), color: colour.clone().offsetHSL(0, 0, 0.12) });
      }
    };
    const knotColour = a.colour === 'rose' ? new THREE.Color('#4f8ff0') : a.colour === 'ash' ? new THREE.Color('#d8d4e8') : new THREE.Color('#ff6fa8');
    if (a.beads === 'pearls') {
      const n = Math.round(mix(7, 13, a.length));
      for (let i = 0; i < n; i++) bead(mix(0.14, 0.97, i / (n - 1)), mix(0.1, 0.055, i / n), i % 3 === 1 ? knotColour : palette[1]);
    } else if (a.beads === 'knots') {
      const n = 3 + Math.floor(random() * 2);
      for (let i = 0; i < n; i++) bead(mix(0.22, 0.9, (i + random() * 0.5) / n), mix(0.2, 0.13, random()), i % 2 ? knotColour : palette[1]);
    } else if (a.beads === 'tipped') {
      bead(0.985, 0.3, palette[1]);
      bead(0.93, 0.11, knotColour);
    }

    // The thick end.
    const rootAt = at(0), away = at(0.02).sub(rootAt).normalize();
    const plane = new THREE.Group();
    plane.rotation.x = Math.PI / 2 - tilt;
    s.root.add(plane);
    const galaxy = (group: THREE.Object3D, radius: number, colour: THREE.Color, dim: number) => {
      const bulge = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6, emissive: colour, emissiveIntensity: glow * dim }));
      bulge.scale.set(radius * 0.42, radius * 0.42, radius * 0.26);
      bulge.castShadow = true;
      group.add(bulge);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.96, radius * 0.07, 40), new THREE.MeshStandardMaterial({ color: colour.clone().lerp(palette[0], 0.45), roughness: 0.85, emissive: colour, emissiveIntensity: glow * dim * 0.3 }));
      disc.rotation.x = Math.PI / 2;
      disc.castShadow = true;
      group.add(disc);
      const lane = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.7, radius * 0.045, 6, 48), new THREE.MeshStandardMaterial({ color: '#3b2a33', roughness: 0.9 }));
      lane.scale.z = 0.5;
      lane.position.z = radius * 0.03;
      group.add(lane);
    };
    if (a.origin === 'galaxy' || a.origin === 'held') galaxy(plane, 0.95, core, 1);
    else if (a.origin === 'remnant') galaxy(plane, 0.42, core.clone().lerp(new THREE.Color('#8a7f8f'), 0.5), 0.4);
    else for (let i = 0; i < 40; i++) stars.push({ at: rootAt.clone().addScaledVector(away, -random() * 0.7).add(new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(0.3)).toArray(), size: mix(0.02, 0.07, random()), color: palette[2] });
    if (a.origin === 'held') {
      const far = new THREE.Group();
      far.position.copy(at(1));
      far.rotation.set(Math.PI / 2 - tilt + 0.5, 0.6, 0);
      s.root.add(far);
      galaxy(far, 0.55, palette[1].clone().lerp(new THREE.Color('#ffffff'), 0.2), 0.8);
    }

    const flock = s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), stars);
    flock.castShadow = false;

    // Drifters travel along the tail: outward if it is still being flung, back if it is falling.
    const direction = { flung: 1, falling: -1, frozen: 0 }[a.story];
    const drifters = Array.from({ length: direction ? 90 : 0 }, () => ({ t: random(), du: gauss() * 0.25, dv: gauss() * 0.12, size: mix(0.03, 0.06, random()), speed: mix(0.6, 1.4, random()) }));
    const motes = drifters.length ? s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: palette[1].clone().offsetHSL(0, 0, 0.1) }), drifters.map((d) => ({ at: offsetAt(d.t, d.du, d.dv).toArray(), size: d.size }))) : null;
    if (motes) motes.castShadow = false;
    const matrix = new THREE.Matrix4();
    const pace = mix(0.01, 0.07, mood.energy) * direction;

    return s.finish({
      footprint: 1.6,
      update(dt) {
        if (!motes) return;
        drifters.forEach((d, i) => {
          d.t = (d.t + dt * pace * d.speed + 1) % 1;
          const fade = Math.sin(d.t * Math.PI);
          const p = offsetAt(d.t, d.du * (0.4 + d.t), d.dv);
          matrix.makeScale(d.size * fade, d.size * fade, d.size * fade).setPosition(p);
          motes.setMatrixAt(i, matrix);
        });
        motes.instanceMatrix.needsUpdate = true;
      },
    });
  },
});
