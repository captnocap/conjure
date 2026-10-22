import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, disposeTree, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];

/** A lumpy ball: an icosphere pushed in and out by a few random sine lobes. */
function lump(radius: number, random: () => number, rough: number) {
  const geometry = new THREE.IcosahedronGeometry(radius, 3);
  const position = geometry.attributes.position;
  const lobes = Array.from({ length: 5 }, () => [random() * 6.28, random() * 6.28, random() * 6.28, 1.5 + random() * 3] as const);
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).normalize();
    let push = 1;
    for (const [a, b, c, f] of lobes) push += Math.sin(v.x * f + a) * Math.sin(v.y * f + b) * Math.sin(v.z * f + c) * rough;
    v.multiplyScalar(radius * push);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    shape: choice('What shape has the infant galaxy managed so far?', {
      tadpole: 'A tadpole: one bright swollen head trailing a thin tapering tail of smaller knots.',
      chain: 'A chain of clumps strung in a crooked line like beads on a wet thread.',
      knot: 'A single dense knot, one tight fist of clusters with a few strays.',
      crescent: 'A broken crescent, clumps curling halfway round an empty middle as if a disc were starting.',
      scatter: 'A loose handful of sparks thrown down with no order at all.',
    }),
    clumps: score('How many star clumps does it have?', ['Two or three', 'Five or six', 'A dozen', 'Twenty crowded knots']),
    reddening: score('How reddened by distance is its light?', ['Still hot blue-white', 'Lavender and rose', 'Amber orange', 'Deep ember red, almost out of sight']),
    merging: noul('Is it merging with a second, smaller blob?'),
    activity: choice('What is it doing right now?', {
      quiet: 'Quietly glowing, nothing much happening yet.',
      starburst: 'A starburst: one clump has flared and is throwing a fan of sparks outward.',
      feeding: 'Feeding: thin cold streams of gas are running into it from outside.',
      shredded: 'Being pulled apart, its clumps drifting away from each other in a long smear.',
    }),
    haze: choice('How is the gas around the clumps drawn?', {
      none: 'No haze, only hard bright knots.',
      veil: 'A thin shared veil wrapping the whole blob.',
      cocoons: 'Each clump sits in its own soft cocoon.',
    }),
    tilt: choice('How does it sit in the frame?', {
      level: 'Lying level, stretched side to side.',
      rising: 'Tilted up at one end like a comet climbing.',
      steep: 'Standing nearly on end.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const body = new THREE.Group();
    s.root.add(body);
    const put = (mesh: THREE.Object3D) => { body.add(mesh); return mesh; };

    const redden = clamp01(a.reddening * 0.9 + (mood.warmth - 0.5) * 0.25);
    const ramp = ['#4f9bff', '#9a86e8', '#e87a9a', '#f08a3c', '#c2341e'].map((c) => new THREE.Color(c));
    const tint = (shift: number) => {
      const t = clamp01(redden + shift) * (ramp.length - 1);
      const i = Math.min(ramp.length - 2, Math.floor(t));
      return ramp[i].clone().lerp(ramp[i + 1], t - i);
    };
    const glow = mix(0.55, 1.1, mood.cheer) * mix(1, 0.6, mood.wear);
    const count = Math.round(mix(2.6, 20, a.clumps ** 1.4));
    const stretch = a.activity === 'shredded' ? 1.7 : 1;

    // Where the clumps sit, in a flat-ish sheet about six units long.
    const spots: { at: P; r: number }[] = [];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1);
      const j = () => (random() - 0.5);
      let at: P, r = mix(0.22, 0.5, random());
      if (a.shape === 'tadpole') {
        at = [mix(-1.6, 3.2, t ** 0.8), Math.sin(t * 2.4) * 0.45 + j() * 0.25, j() * 0.4];
        r = i === 0 ? 0.95 : mix(0.5, 0.14, t) * mix(0.8, 1.2, random());
      } else if (a.shape === 'chain') {
        at = [mix(-2.6, 2.6, t), Math.sin(t * 5 + random()) * 0.5 + j() * 0.3, j() * 0.6];
        r = mix(0.3, 0.6, random());
      } else if (a.shape === 'knot') {
        const d = i === 0 ? 0 : 0.6 + random() ** 0.6 * 1.6, ang = random() * 6.28;
        at = [Math.cos(ang) * d * 1.3, Math.sin(ang) * d * 0.8, j() * 0.9];
        r = i === 0 ? 1.1 : mix(0.16, 0.42, random());
      } else if (a.shape === 'crescent') {
        const ang = mix(-0.5, 3.5, t) + j() * 0.2;
        at = [Math.cos(ang) * 2.1, Math.sin(ang) * 1.5 + j() * 0.2, j() * 0.5];
        r = mix(0.26, 0.6, Math.sin(t * Math.PI)) * mix(0.8, 1.2, random());
      } else {
        at = [j() * 5, j() * 2.6, j() * 1.4];
        r = mix(0.16, 0.6, random() ** 2);
      }
      at[0] *= stretch;
      if (a.activity === 'shredded') { at[1] += at[0] * at[0] * 0.07; r *= 0.8; }
      spots.push({ at, r });
    }

    const sparkGeometry = new THREE.IcosahedronGeometry(1, 0);
    const sparks: { at: P; size: number; color: THREE.Color }[] = [];
    const veil = (colour: THREE.Color, opacity: number) => new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false });
    const sprinkle = (centre: P, spread: number, n: number, shift: number, size = 0.05) => {
      for (let k = 0; k < n; k++) {
        const d = spread * random() ** 0.7, u = random() * 2 - 1, ang = random() * 6.28, q = Math.sqrt(1 - u * u);
        sparks.push({ at: [centre[0] + Math.cos(ang) * q * d, centre[1] + u * d * 0.8, centre[2] + Math.sin(ang) * q * d * 0.7], size: size * mix(0.5, 1.5, random()), color: tint(shift + (random() - 0.5) * 0.25) });
      }
    };

    // A four-point glint, the way a bright point spikes in a telescope image.
    const glintPaint = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
    const glint = (at: P, reach: number) => {
      for (const turn of [0, Math.PI / 2]) {
        const spike = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), glintPaint);
        spike.scale.set(reach, reach * 0.045, reach * 0.045);
        spike.rotation.z = turn + 0.5;
        spike.position.set(...at);
        put(spike);
      }
    };
    const perClump = Math.round(mix(8, 26, mood.density));
    spots.forEach(({ at, r }, index) => {
      const colour = tint((random() - 0.5) * 0.22 - (index === 0 ? 0.08 : 0));
      const clump = new THREE.Mesh(lump(r, random, 0.2), new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: glow, roughness: 0.75, flatShading: mood.wear > 0.7 }));
      clump.position.set(...at);
      clump.rotation.set(random() * 3, random() * 3, random() * 3);
      clump.castShadow = true;
      put(clump);
      // A hot pale core showing through one side.
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.55, 2), new THREE.MeshBasicMaterial({ color: colour.clone().lerp(new THREE.Color('#ffffff'), 0.8), toneMapped: false }));
      core.position.set(at[0] + r * 0.35, at[1] + r * 0.4, at[2] + r * 0.45);
      put(core);
      sprinkle(at, r * 2.6, perClump, 0, 0.065);
      if (r > 0.42 || index === 0) glint([at[0] + r * 0.35, at[1] + r * 0.4, at[2] + r * 0.45], r * 2.4);
      if (a.haze === 'cocoons') {
        const cocoon = new THREE.Mesh(new THREE.SphereGeometry(r * 1.9, 20, 12), veil(colour, 0.16));
        cocoon.position.set(...at);
        put(cocoon);
      }
    });

    // Threads of sparks join neighbours so it reads as one body, not a cluster of balls.
    for (let i = 1; i < spots.length; i++) {
      const from = spots[i - 1].at, to = spots[i].at;
      for (let k = 0; k < 9; k++) {
        const t = random();
        sprinkle([mix(from[0], to[0], t), mix(from[1], to[1], t), mix(from[2], to[2], t)], 0.22, 1, 0.1, 0.04);
      }
    }

    const box = new THREE.Box3();
    for (const { at, r } of spots) box.expandByPoint(new THREE.Vector3(...at).addScalar(r)).expandByPoint(new THREE.Vector3(...at).subScalar(r));
    const mid = box.getCenter(new THREE.Vector3()), span = box.getSize(new THREE.Vector3());
    if (a.haze === 'veil') {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), veil(tint(0.1), 0.14));
      shell.scale.set(span.x * 0.62 + 0.3, span.y * 0.62 + 0.4, span.z * 0.6 + 0.6);
      shell.position.copy(mid);
      put(shell);
      const inner = shell.clone();
      inner.scale.multiplyScalar(0.7);
      put(inner);
    }

    if (a.merging) {
      // The intruder: a smaller, redder knot off one end, tied on by a bridge of sparks.
      const side = random() < 0.5 ? -1 : 1;
      const at: P = [mid.x + side * (span.x / 2 + 1.1), mid.y + span.y / 2 + 0.5, mid.z + (random() - 0.5)];
      const colour = tint(0.3);
      for (let k = 0; k < 3; k++) {
        const r = mix(0.5, 0.22, k / 2);
        const piece = new THREE.Mesh(lump(r, random, 0.22), new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: glow, roughness: 0.75 }));
        piece.position.set(at[0] + side * k * 0.45, at[1] + k * 0.3, at[2] + (random() - 0.5) * 0.4);
        piece.castShadow = true;
        put(piece);
      }
      sprinkle(at, 1.1, 30, 0.3);
      const near = spots.reduce((best, spot) => (side * spot.at[0] > side * best.at[0] ? spot : best), spots[0]).at;
      for (let k = 0; k < 26; k++) {
        const t = k / 25, sag = Math.sin(t * Math.PI) * 0.5;
        sprinkle([mix(near[0], at[0], t), mix(near[1], at[1], t) - sag, mix(near[2], at[2], t)], 0.14, 2, 0.2, 0.045);
      }
    }

    if (a.activity === 'starburst') {
      const source = spots[Math.min(spots.length - 1, Math.floor(random() * spots.length))];
      const dir = new THREE.Vector3(random() - 0.5, 1, random() - 0.3).normalize();
      for (let k = 0; k < 70; k++) {
        const reach = source.r + random() ** 0.6 * 2.6, fan = reach * 0.42;
        sparks.push({ at: [source.at[0] + dir.x * reach + (random() - 0.5) * fan, source.at[1] + dir.y * reach + (random() - 0.5) * fan * 0.5, source.at[2] + dir.z * reach + (random() - 0.5) * fan], size: mix(0.09, 0.03, reach / 3.2), color: new THREE.Color('#ffffff').lerp(tint(-0.3), reach / 3) });
      }
      const flare = new THREE.Mesh(new THREE.IcosahedronGeometry(source.r * 0.8, 2), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }));
      flare.position.set(source.at[0] + dir.x * source.r * 0.6, source.at[1] + dir.y * source.r * 0.6, source.at[2] + dir.z * source.r * 0.6);
      put(flare);
    }
    if (a.activity === 'feeding') {
      // Cold grey streams running in from outside, drawn as strings of beads that thicken toward the galaxy.
      for (let k = 0; k < 3; k++) {
        const ang = k * 2.1 + random(), far = 2.2 + random() * 0.8;
        const end = new THREE.Vector3(mid.x + Math.cos(ang) * (span.x / 2 + far), mid.y + Math.sin(ang) * far * 0.6, mid.z + (random() - 0.5));
        const bend = end.clone().lerp(mid, 0.5).add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(1.3));
        const curve = new THREE.CatmullRomCurve3([end, bend, mid.clone()]);
        for (let n = 0; n < 34; n++) {
          const t = n / 33, at = curve.getPoint(t);
          sparks.push({ at: [at.x + (random() - 0.5) * 0.12, at.y + (random() - 0.5) * 0.12, at.z + (random() - 0.5) * 0.12], size: mix(0.035, 0.085, t), color: new THREE.Color('#7f8ea8').lerp(tint(0), t * 0.6) });
        }
      }
    }
    if (a.activity === 'shredded') sprinkle(mid.toArray() as P, span.x * 0.7, 60, 0.15, 0.04);

    const cloud = s.scatter(sparkGeometry, new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), sparks.map((p) => ({ at: p.at, size: p.size, color: p.color })));
    body.add(cloud);

    body.rotation.z = { level: 0.06, rising: 0.5, steep: 1.25 }[a.tilt] + (random() - 0.5) * 0.12;
    body.rotation.x = 0.25;
    const built = s.finish();
    const pivot = new THREE.Group();
    pivot.add(built.object);
    const speed = mix(0.0, 0.25, mood.energy);
    return {
      object: pivot,
      update: (dt) => { pivot.rotation.y += dt * speed; },
      dispose: () => disposeTree(pivot),
    };
  },
});
