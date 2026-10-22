import * as THREE from 'three';
import { choice, defineThing, mix, noul, score } from '@conjure/kit';
import { canvasTexture, grounded, mesh, range, smooth } from './lib';

const GLOWS = {
  blue: { say: 'Electric pale blue, the colour of ionised carbon monoxide.', color: '#3f74e6', emissive: '#2f62e8' },
  cyan: { say: 'Cyan shading to green near the head.', color: '#1fa7bd', emissive: '#14a0b8' },
  violet: { say: 'Violet blue, deep and eerie.', color: '#6c4fe0', emissive: '#5a3ee8' },
  white: { say: 'Ghostly blue-white, barely tinted.', color: '#9fb8ee', emissive: '#7e9ef0' },
} as const;

/** Soft across its width, streaked along its length, tiling along u so it can flow. */
function strandTexture(random: () => number) {
  const texture = canvasTexture(256, 64, (ctx, w, h) => {
    const image = ctx.createImageData(w, h);
    const rays = Array.from({ length: 9 }, () => [random() * h, 1 + random() * 3, 0.3 + random() * 0.7, Math.floor(1 + random() * 3), random() * 6] as const);
    for (let y = 0; y < h; y++) {
      const across = 1 - Math.abs((y + 0.5) / h * 2 - 1);
      for (let x = 0; x < w; x++) {
        let v = smooth(0, 0.6, across) * 0.55;
        for (const [ry, width, k, f, phase] of rays) v += Math.exp(-(((y - ry) / width) ** 2)) * k * (0.55 + 0.45 * Math.sin((x / w) * Math.PI * 2 * f + phase)) * smooth(0, 0.3, across);
        const o = (y * w + x) * 4, g = Math.min(255, v * 255);
        image.data[o] = image.data[o + 1] = image.data[o + 2] = g;
        image.data[o + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, false);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    bend: choice('How is the tail bent?', {
      straight: 'Nearly straight, a taut ray across the sky.',
      kinked: 'Kinked sharply in two places where gusts of solar wind struck it.',
      wavy: 'Rippling in long slow waves like a flag.',
      corkscrew: 'Twisted into a slow corkscrew, strands winding round each other.',
    }),
    fate: choice('What is happening to it?', {
      whole: 'Whole and unbroken from head to tip.',
      pinching: 'Pinching off: a bright knot where it is about to tear.',
      torn: 'Torn away: a severed piece drifting off beyond a dark gap.',
      regrowing: 'Regrowing: a short new tail, the ghost of the old one far behind.',
    }),
    strands: choice('How many strands make it up?', {
      single: 'One clean ribbon.',
      braided: 'Three or four braided strands.',
      rays: 'Many fine rays fanning out from the head.',
    }),
    glow: choice('What colour does it glow?', Object.fromEntries(Object.entries(GLOWS).map(([k, v]) => [k, v.say])) as Record<keyof typeof GLOWS, string>),
    head: choice('What is at its head?', {
      coma: 'A bright round coma glowing at its root.',
      green: 'A green-glowing coma like a ship lantern.',
      hidden: 'Nothing visible: the head is below the horizon, only the tail rises.',
    }),
    dust: noul('Is a broad pale curved dust tail fanning out beside it?'),
    rise: score('How steeply does it rise from the horizon?', ['Low along the horizon', 'Climbing at a slant', 'Standing almost upright']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const glow = GLOWS[a.glow];
    const L = range(random, 820, 980);
    const alpha = THREE.MathUtils.degToRad(mix(9, 68, a.rise));
    const dir = new THREE.Vector3(Math.cos(alpha), Math.sin(alpha), 0), perp = new THREE.Vector3(-Math.sin(alpha), Math.cos(alpha), 0), out = new THREE.Vector3(0, 0, 1);
    const comaR = L * 0.016;
    const origin = new THREE.Vector3(0, a.head === 'hidden' ? 0 : comaR * 1.05, 0);
    const kinks = [range(random, 0.25, 0.4), range(random, 0.55, 0.75)], kinkSize = [range(random, 0.05, 0.09), -range(random, 0.04, 0.08)];
    const gapT = range(random, 0.42, 0.6);
    const bendAt = (t: number, phase: number) => {
      switch (a.bend) {
        case 'kinked': return L * (Math.max(0, t - kinks[0]) * kinkSize[0] * 3 + Math.max(0, t - kinks[1]) * kinkSize[1] * 4) + Math.sin(t * 9 + phase) * L * 0.004;
        case 'wavy': return Math.sin(t * Math.PI * 3.2 + phase) * L * 0.045 * t;
        case 'corkscrew': return Math.sin(t * Math.PI * 7 + phase) * L * 0.02 * (0.3 + t);
        default: return t * t * L * 0.05 + Math.sin(t * 6 + phase) * L * 0.004;
      }
    };
    const outAt = (t: number, phase: number) => a.bend === 'corkscrew' ? Math.cos(t * Math.PI * 7 + phase) * L * 0.02 * (0.3 + t) : Math.sin(t * 4 + phase) * L * 0.01 * t;
    // The severed piece drifts sideways from the rest.
    const drift = (t: number) => a.fate === 'torn' ? smooth(gapT, gapT + 0.08, t) * L * 0.06 : a.fate === 'regrowing' ? smooth(0.4, 0.6, t) * L * 0.04 : 0;
    const pointAt = (t: number, phase: number, spread: number, target = new THREE.Vector3()) =>
      target.copy(origin).addScaledVector(dir, t * L).addScaledVector(perp, bendAt(t, phase) + drift(t) + spread * t * L).addScaledVector(out, outAt(t, phase));
    // How dense the tail is along its length: a gap, a pinch, or a ghost.
    const density = (t: number) => {
      let d = smooth(0, 0.05, t) * (1 - smooth(0.7, 1, t));
      if (a.fate === 'pinching') d *= 1 - 0.75 * Math.exp(-(((t - gapT) / 0.03) ** 2));
      if (a.fate === 'torn') d *= smooth(0.03, 0.09, Math.abs(t - gapT - 0.03)) * (t > gapT ? 0.75 : 1);
      if (a.fate === 'regrowing') d *= t < 0.38 ? 1 : t < 0.55 ? 0 : 0.35;
      return d;
    };
    const widthAt = (t: number) => mix(L * 0.018, L * 0.15, t ** 0.75) * (a.fate === 'pinching' ? 1 - 0.7 * Math.exp(-(((t - gapT) / 0.04) ** 2)) : 1);

    // ---- Strands: camera-facing ribbons along the curve ----
    const texture = strandTexture(random);
    const strandCount = { single: 1, braided: 4, rays: 7 }[a.strands];
    const flows: THREE.Texture[] = [];
    const strandMats: THREE.MeshStandardMaterial[] = [];
    const SAMPLES = 120;
    const ribbon = (phase: number, spread: number, scale: number, opacity: number, colour: string, emissive: string, curl = 0) => {
      const positions = new Float32Array((SAMPLES + 1) * 2 * 3), colours = new Float32Array((SAMPLES + 1) * 2 * 4), uvs = new Float32Array((SAMPLES + 1) * 2 * 2);
      const index: number[] = [];
      const p = new THREE.Vector3(), q = new THREE.Vector3(), tangent = new THREE.Vector3(), side = new THREE.Vector3();
      for (let i = 0; i <= SAMPLES; i++) {
        const t = i / SAMPLES;
        pointAt(t, phase, spread, p);
        pointAt(Math.min(1, t + 0.01), phase, spread, q);
        if (t >= 0.99) { pointAt(t - 0.01, phase, spread, q); tangent.subVectors(p, q); } else tangent.subVectors(q, p);
        if (curl) p.addScaledVector(perp, curl * t * t * L);
        tangent.normalize();
        side.crossVectors(tangent, out).normalize();
        const w = widthAt(t) * scale;
        for (const [k, s] of [[0, -1], [1, 1]] as const) {
          const o = (i * 2 + k);
          positions[o * 3] = p.x + side.x * w * s * 0.5; positions[o * 3 + 1] = p.y + side.y * w * s * 0.5; positions[o * 3 + 2] = p.z + side.z * w * s * 0.5;
          colours[o * 4] = colours[o * 4 + 1] = colours[o * 4 + 2] = 1; colours[o * 4 + 3] = density(t);
          uvs[o * 2] = t * 3; uvs[o * 2 + 1] = k;
        }
        if (i) index.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      g.setAttribute('color', new THREE.BufferAttribute(colours, 4));
      g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      g.setIndex(index);
      g.computeVertexNormals();
      const alphaMap = texture.clone();
      alphaMap.needsUpdate = true;
      alphaMap.offset.x = random();
      flows.push(alphaMap);
      const material = new THREE.MeshStandardMaterial({ color: colour, emissive, emissiveIntensity: mix(0.45, 0.9, mood.cheer), alphaMap, vertexColors: true, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, roughness: 1 });
      strandMats.push(material);
      const m = mesh(root, g, material, [0, 0, 0], 1, [0, 0, 0], false);
      m.renderOrder = 5;
      return m;
    };
    if (a.dust) ribbon(random() * 6, 0, 2.2, 0.55, '#e0bf82', '#a8834a', -0.18);
    for (let i = 0; i < strandCount; i++) {
      const spread = strandCount === 1 ? 0 : a.strands === 'rays' ? (i / (strandCount - 1) - 0.5) * 0.16 : (i / (strandCount - 1) - 0.5) * 0.035;
      ribbon(random() * 6 + i, spread, strandCount === 1 ? 1 : a.strands === 'rays' ? 0.35 : 0.55, strandCount === 1 ? 0.95 : 0.8, glow.color, glow.emissive);
    }

    // ---- A bright solid filament down the middle: the tail's spine, and what it measures as ----
    const coreMat = new THREE.MeshStandardMaterial({ color: glow.color, emissive: glow.emissive, emissiveIntensity: mix(0.9, 1.5, mood.cheer), roughness: 1 });
    const pieces: [number, number][] = a.fate === 'torn' ? [[0.02, gapT - 0.03], [gapT + 0.1, 0.8]] : a.fate === 'regrowing' ? [[0.02, 0.36], [0.6, 0.8]] : [[0.02, 0.82]];
    for (const [t0, t1] of pieces) {
      const pts = Array.from({ length: 40 }, (_, i) => pointAt(t0 + (t1 - t0) * (i / 39), 0, 0));
      const radius = L * (a.fate === 'regrowing' && t0 > 0.5 ? 0.0015 : 0.003);
      mesh(root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, radius, 6), coreMat, [0, 0, 0], 1, [0, 0, 0], false);
    }
    // The disconnection knot: a twisted bright tangle at the pinch or the tear.
    let knot: THREE.Mesh | null = null;
    if (a.fate === 'pinching' || a.fate === 'torn') {
      knot = mesh(root, new THREE.TorusKnotGeometry(L * 0.02, L * 0.005, 64, 8, 2, 3), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: glow.emissive, emissiveIntensity: 2.2, roughness: 1 }), pointAt(gapT + (a.fate === 'torn' ? 0.1 : 0), 0, 0).toArray() as [number, number, number], [1, 1, 0.5], [0, 0, alpha], false);
    }

    // ---- The head ----
    let halo: THREE.Mesh | null = null;
    if (a.head !== 'hidden') {
      const green = a.head === 'green';
      mesh(root, new THREE.SphereGeometry(comaR, 24, 16), new THREE.MeshStandardMaterial({ color: green ? '#d8ffd8' : '#ffffff', emissive: green ? '#5cff8a' : '#fff4dc', emissiveIntensity: 1.6, roughness: 1 }), origin.toArray() as [number, number, number], 1, [0, 0, 0], false);
      halo = mesh(root, new THREE.SphereGeometry(comaR * 3, 24, 16), new THREE.MeshStandardMaterial({ color: green ? '#a8ffc0' : glow.color, emissive: green ? '#3fe070' : glow.emissive, emissiveIntensity: 0.8, transparent: true, opacity: 0.22, depthWrite: false, roughness: 1 }), origin.toArray() as [number, number, number], 1, [0, 0, 0], false);
    } else {
      // A small solid foot where the tail rises from below the horizon.
      mesh(root, new THREE.SphereGeometry(L * 0.006, 12, 8), coreMat, origin.toArray() as [number, number, number], 1, [0, 0, 0], false);
    }

    // ---- Motion: the striations stream outward, the glow breathes, the knot twists ----
    const pace = mix(0.05, 0.5, mood.energy);
    const update = (dt: number, time: number) => {
      flows.forEach((map, i) => { map.offset.x -= dt * pace * (0.4 + (i % 3) * 0.12); });
      const breath = 1 + Math.sin(time * pace * 3) * 0.12;
      for (const m of strandMats) m.emissiveIntensity = mix(0.45, 0.9, mood.cheer) * breath;
      if (knot) knot.rotation.x += dt * pace * 2;
      if (halo) halo.scale.setScalar(1 + Math.sin(time * pace * 2) * 0.06);
    };
    return grounded(root, { update });
  },
});
