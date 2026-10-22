import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const smooth = (from: number, to: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

function noiseOf(seed: number) {
  const lattice = (x: number, y: number, z: number) => {
    let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683) + seed) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = x - xi, fy = y - yi, fz = z - zi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const edge = (dy: number, dz: number) => lattice(xi, yi + dy, zi + dz) * (1 - u) + lattice(xi + 1, yi + dy, zi + dz) * u;
    return (edge(0, 0) * (1 - v) + edge(1, 0) * v) * (1 - w) + (edge(0, 1) * (1 - v) + edge(1, 1) * v) * w;
  };
  return (x: number, y: number, z: number, octaves = 4) => {
    let total = 0, weight = 0.5, scale = 1;
    for (let i = 0; i < octaves; i++) {
      total += noise(x * scale + i * 7.3, y * scale, z * scale) * weight;
      weight *= 0.5; scale *= 2.03;
    }
    return total / (1 - 0.5 ** octaves);
  };
}

const COLOURS = {
  'ember-ice': 'A red-orange star with an ice-white partner: fire and frost.',
  'gold-white': 'A golden star with a pure white partner, warm and bright.',
  'blue-violet': 'A blue star with a pale violet partner, cold and electric.',
  'rose-teal': 'A rose-pink star with a sea-green partner, tender and odd.',
  'ash-coal': 'A faded brown star with a bone-pale partner, tired, nearly spent.',
} as const;
const TINTS: Record<keyof typeof COLOURS, [string, string, string, string]> = {
  'ember-ice': ['#7a1e12', '#f0642a', '#dff1ff', '#ffa652'],
  'gold-white': ['#9a5a10', '#ffc23a', '#ffffff', '#f5a623'],
  'blue-violet': ['#27408f', '#7fb4ff', '#ead8ff', '#a98cff'],
  'rose-teal': ['#8a2748', '#f27a9a', '#9cf0e2', '#ff9fb8'],
  'ash-coal': ['#3a2a28', '#a86a55', '#f4e9d8', '#c99a80'],
};

export default defineThing({
  questions: {
    pair: choice('Who are the two partners?', {
      'giant-dwarf': 'A big swollen star and a tiny dense white one, a tenth its size.',
      twins: 'Two stars of nearly the same size, well matched.',
      unseen: 'One visible star and something invisible: a small black sphere known only by the bright disc around it.',
      dwarfs: 'Two small stars, both compact, spinning round each other quickly.',
    }),
    feeding: choice('Is one feeding on the other?', {
      none: 'No. They simply circle, each keeping to itself.',
      sipping: 'A thin thread of gas crosses between them into a small faint disc.',
      feeding: 'A thick bright stream pours across into a wide swirling disc.',
      devouring: 'The larger one is being pulled out of shape, emptying into a huge blazing disc that shoots jets from its poles.',
    }),
    colours: choice('What colours are they?', COLOURS),
    closeness: score('How close are they?', ['A wide, formal distance', 'Within reach', 'Nearly touching', 'Pressed together, sharing one skin']),
    fate: choice('Where is this heading?', {
      steady: 'Nowhere: a stable waltz that could go on for ever.',
      spiralling: 'They are spiralling together, flinging a wide spiral of lost gas out behind them.',
      eruption: 'The small one has taken too much and is flaring, about to blow.',
      parting: 'One is being flung away: its path opens out and it trails a long arc behind it.',
    }),
    paths: choice('Are their orbits drawn?', {
      none: 'No, only the stars themselves.',
      rings: 'Two fine rings mark the circles they trace, like a dance diagram.',
      dashes: 'Dashed tracks, like footprints in a dance manual.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fbm = noiseOf(context.seed ^ Math.floor(random() * 1e9));
    const [deepHex, brightHex, partnerHex, streamHex] = TINTS[a.colours];
    const shift = new THREE.Color(mood.warmth > 0.5 ? '#ff8a3c' : '#5aa8ff'), lean = Math.abs(mood.warmth - 0.5) * 0.3;
    const deep = new THREE.Color(deepHex).lerp(shift, lean), bright = new THREE.Color(brightHex).lerp(shift, lean);
    const partner = new THREE.Color(partnerHex), stream = new THREE.Color(streamHex).lerp(shift, lean);
    const glow = mix(0.6, 1, mood.cheer);

    const [r1, r2] = { 'giant-dwarf': [1.15, 0.2], twins: [0.9, 0.78], unseen: [1, 0.2], dwarfs: [0.55, 0.42] }[a.pair];
    const amount = { none: 0, sipping: 0.35, feeding: 0.7, devouring: 1 }[a.feeding];
    const discRadius = amount ? Math.max(r2 * 1.6, mix(0.4, 1.05, amount) * (a.pair === 'dwarfs' ? 0.7 : 1)) : 0;
    const pull = amount * 0.3 + a.closeness * 0.12;
    const gap = mix(1.9, 0.12, a.closeness) + (amount ? discRadius * 0.55 : 0);
    const distance = r1 * (1 + pull) + gap + Math.max(r2, discRadius * 0.45);
    const share = a.pair === 'giant-dwarf' || a.pair === 'unseen' ? 0.4 : r2 / (r1 + r2);
    const x1 = -distance * share, x2 = distance * (1 - share);
    const level = r1 * 1.02;

    const paintStar = (low: THREE.Color, high: THREE.Color, grain: number) => {
      const width = 384, height = 192;
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!, data = ctx.createImageData(width, height);
      const salt = random() * 40;
      for (let py = 0; py < height; py++) {
        const theta = ((py + 0.5) / height) * Math.PI, dy = Math.cos(theta), ring = Math.sin(theta);
        for (let px = 0; px < width; px++) {
          const phi = ((px + 0.5) / width) * Math.PI * 2, dx = -Math.cos(phi) * ring, dz = Math.sin(phi) * ring;
          const cell = smooth(0.34, 0.66, fbm(dx * grain + salt, dy * grain, dz * grain, 4));
          const spot = smooth(0.34 - mood.wear * 0.08, 0.26 - mood.wear * 0.08, fbm(dx * 2.2 + salt, dy * 2.2 + 7, dz * 2.2, 3));
          const at = (py * width + px) * 4, k = cell * (1 - spot * 0.85);
          data.data[at] = (low.r + (high.r - low.r) * k) * 255 * (1 - spot * 0.5);
          data.data[at + 1] = (low.g + (high.g - low.g) * k) * 255 * (1 - spot * 0.5);
          data.data[at + 2] = (low.b + (high.b - low.b) * k) * 255 * (1 - spot * 0.5);
          data.data[at + 3] = 255;
        }
      }
      ctx.putImageData(data, 0, 0);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: glow * 0.85, roughness: 1 });
    };

    const system = new THREE.Group();
    system.position.y = level;
    s.root.add(system);

    // The donor: a star drawn out into a teardrop that points at its partner.
    const donorGeometry = new THREE.SphereGeometry(1, 64, 40);
    const at = donorGeometry.attributes.position, d = new THREE.Vector3();
    for (let i = 0; i < at.count; i++) {
      d.fromBufferAttribute(at, i).normalize();
      const reach = r1 * (1 + pull * Math.max(0, d.x) ** 3 * 1.6 - pull * 0.12 * (1 - Math.abs(d.x)));
      at.setXYZ(i, d.x * reach, d.y * reach, d.z * reach);
    }
    donorGeometry.computeVertexNormals();
    const donor = new THREE.Mesh(donorGeometry, paintStar(deep, bright, a.pair === 'dwarfs' ? 5 : 3.2));
    donor.position.x = x1;
    donor.castShadow = true;
    const donorHaze = new THREE.Mesh(new THREE.SphereGeometry(r1 * 1.1, 32, 20), new THREE.MeshBasicMaterial({ color: bright, transparent: true, opacity: 0.14, depthWrite: false }));
    donorHaze.position.x = x1;
    system.add(donor, donorHaze);
    const tip = new THREE.Vector3(x1 + r1 * (1 + pull * 1.6) * 0.98, 0, 0);

    // The partner.
    const taker = new THREE.Group();
    taker.position.x = x2;
    system.add(taker);
    let takerPaint: THREE.MeshStandardMaterial;
    if (a.pair === 'unseen') {
      takerPaint = new THREE.MeshStandardMaterial({ color: '#0b0a10', roughness: 0.4 });
      taker.add(new THREE.Mesh(new THREE.SphereGeometry(r2, 28, 18), takerPaint));
      const lensing = new THREE.Mesh(new THREE.TorusGeometry(r2 * 1.22, r2 * 0.09, 8, 48), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: stream, emissiveIntensity: 1.2 }));
      lensing.rotation.x = Math.PI / 2;
      taker.add(lensing);
    } else if (a.pair === 'twins' || a.pair === 'dwarfs') {
      takerPaint = paintStar(deep.clone().offsetHSL(0.04, 0, 0.05), partner.clone().lerp(bright, 0.45), a.pair === 'dwarfs' ? 5 : 3.6);
      taker.add(new THREE.Mesh(new THREE.SphereGeometry(r2, 48, 30), takerPaint));
    } else {
      takerPaint = new THREE.MeshStandardMaterial({ color: partner, emissive: partner, emissiveIntensity: glow * 1.1, roughness: 0.6 });
      taker.add(new THREE.Mesh(new THREE.SphereGeometry(r2, 28, 18), takerPaint));
    }
    taker.children[0].castShadow = true;
    const takerHalo = new THREE.Mesh(new THREE.SphereGeometry(r2 * 1.5, 24, 16), new THREE.MeshBasicMaterial({ color: a.pair === 'unseen' ? stream : partner, transparent: true, opacity: 0.25, depthWrite: false }));
    taker.add(takerHalo);

    // The disc and the stream that feeds it.
    const disc = new THREE.Group();
    taker.add(disc);
    if (amount) {
      const size = 384, canvas = document.createElement('canvas'), lightCanvas = document.createElement('canvas');
      canvas.width = canvas.height = lightCanvas.width = lightCanvas.height = size;
      const ctx = canvas.getContext('2d')!, lctx = lightCanvas.getContext('2d')!;
      const data = ctx.createImageData(size, size), ldata = lctx.createImageData(size, size);
      const inner = Math.min(0.5, (r2 * 1.25) / discRadius), white = new THREE.Color('#fffaf0');
      for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
        const x = (px + 0.5) / size * 2 - 1, y = (py + 0.5) / size * 2 - 1, r = Math.hypot(x, y), angle = Math.atan2(y, x);
        const wind = angle + r * 7.5;
        const streak = fbm(Math.cos(wind) * 2.6 + 20, Math.sin(wind) * 2.6, r * 5, 3);
        const k = smooth(inner, 1, r);
        const tone = white.clone().lerp(stream, smooth(0, 0.45, k)).lerp(deep.clone().lerp(bright, 0.4), smooth(0.45, 1, k));
        const shade = 0.55 + streak * 0.75;
        const rim = 1 - (streak - 0.5) * 0.35;
        const solid = r > inner && r < rim * 0.97 && streak > 0.22 + k * mix(0.28, 0.1, amount);
        const index = (py * size + px) * 4;
        data.data[index] = tone.r * 255 * shade; data.data[index + 1] = tone.g * 255 * shade; data.data[index + 2] = tone.b * 255 * shade; data.data[index + 3] = solid ? 255 : 0;
        const heat = (1 - k * 0.75) * shade;
        ldata.data[index] = tone.r * 255 * heat; ldata.data[index + 1] = tone.g * 255 * heat; ldata.data[index + 2] = tone.b * 255 * heat; ldata.data[index + 3] = 255;
      }
      ctx.putImageData(data, 0, 0);
      lctx.putImageData(ldata, 0, 0);
      const map = new THREE.CanvasTexture(canvas), emissiveMap = new THREE.CanvasTexture(lightCanvas);
      map.colorSpace = emissiveMap.colorSpace = THREE.SRGBColorSpace;
      const plate = new THREE.Mesh(new THREE.RingGeometry(0.001, discRadius, 72, 1), new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: '#ffffff', emissiveIntensity: glow, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }));
      plate.rotation.x = -Math.PI / 2;
      plate.castShadow = true;
      disc.add(plate);

      // The stream leaves the teardrop's tip, bends with the orbit and wraps onto the disc's rim.
      const entry = Math.PI - 0.95;
      const edge = (angle: number, scale = 0.94) => new THREE.Vector3(x2 + Math.cos(angle) * discRadius * scale, 0, Math.sin(angle) * discRadius * scale);
      const first = edge(entry);
      const path = new THREE.CatmullRomCurve3([
        tip.clone().add(new THREE.Vector3(-r1 * 0.12, 0, 0)), tip, tip.clone().lerp(first, 0.5).add(new THREE.Vector3(0, 0, first.distanceTo(tip) * 0.16)),
        first, edge(entry - 0.5, 0.9), edge(entry - 1.0, 0.82), edge(entry - 1.5, 0.72),
      ]);
      const girth = mix(0.05, 0.17, amount) * (a.pair === 'dwarfs' ? 0.6 : 1);
      const beads = Array.from({ length: 64 }, (_unused, i) => {
        const t = i / 63, p = path.getPoint(t);
        return { at: [p.x, p.y + (random() - 0.5) * girth * 0.25, p.z] as [number, number, number], size: girth * mix(1.25, 0.4, t) * (0.9 + random() * 0.2), color: stream.clone().lerp(deep, 0.25 * (1 - t)).lerp(new THREE.Color('#ffffff'), t * 0.3) };
      });
      const flow = s.scatter(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: stream, emissiveIntensity: glow * 0.45, roughness: 0.7 }), beads);
      system.add(flow);
      const splash = new THREE.Mesh(new THREE.SphereGeometry(girth * 1.5, 14, 10), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff2d0', emissiveIntensity: 1.3 }));
      splash.position.copy(first);
      system.add(splash);

      if (a.feeding === 'devouring' || (a.pair === 'unseen' && a.feeding === 'feeding')) {
        for (const side of [-1, 1]) {
          const jet = new THREE.Mesh(new THREE.ConeGeometry(discRadius * 0.14, discRadius * 2.4, 14, 1, true), new THREE.MeshBasicMaterial({ color: partner.clone().lerp(stream, 0.3), transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
          jet.position.y = side * discRadius * 1.2;
          if (side < 0) jet.rotation.x = Math.PI;
          const core = new THREE.Mesh(new THREE.ConeGeometry(discRadius * 0.035, discRadius * 1.5, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: partner, emissiveIntensity: 1.1 }));
          core.position.y = side * discRadius * 0.75;
          if (side < 0) core.rotation.x = Math.PI;
          taker.add(jet, core);
        }
      }
    }

    // Where this is heading.
    const flat = (points: THREE.Vector3[], widths: number[], colour: THREE.Color, opacity: number) => {
      const positions: number[] = [], indices: number[] = [];
      points.forEach((p, i) => {
        const outward = new THREE.Vector3(p.x, 0, p.z).normalize().multiplyScalar(widths[i] / 2);
        positions.push(p.x - outward.x, p.y, p.z - outward.z, p.x + outward.x, p.y, p.z + outward.z);
        if (i < points.length - 1) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
    };
    if (a.fate === 'spiralling') for (const arm of [0, 1]) {
      const from = arm ? Math.abs(x1) + r1 * 0.9 : x2 + Math.max(r2, discRadius) * 0.9, start = arm ? Math.PI : 0;
      const points: THREE.Vector3[] = [], widths: number[] = [];
      for (let i = 0; i <= 70; i++) {
        const t = i / 70, angle = start + t * Math.PI * 2.1, r = from + t * 1.9;
        points.push(new THREE.Vector3(Math.cos(angle) * r, Math.sin(t * 7 + arm) * 0.05, Math.sin(angle) * r));
        widths.push(0.42 * smooth(0, 0.1, t) * (1 - t * 0.75));
      }
      system.add(flat(points, widths, stream.clone().lerp(deep, 0.25), 0.42));
    }
    const flare: THREE.Mesh[] = [];
    if (a.fate === 'eruption') {
      const rays = 14;
      for (let i = 0; i < rays; i++) {
        const ray = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.5 + random() * 0.7, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: partner, emissiveIntensity: 1.3 }));
        const y = random() * 2 - 1, t = random() * Math.PI * 2, w = Math.sqrt(1 - y * y), out = new THREE.Vector3(Math.cos(t) * w, y, Math.sin(t) * w);
        ray.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out);
        ray.position.copy(out).multiplyScalar(r2 + (ray.geometry as THREE.ConeGeometry).parameters.height / 2);
        taker.add(ray);
      }
      for (const scale of [2.6, 4]) {
        const shock = new THREE.Mesh(new THREE.SphereGeometry(Math.max(r2, 0.3) * scale, 28, 18), new THREE.MeshBasicMaterial({ color: partner.clone().lerp(stream, 0.5), transparent: true, opacity: 0.16, depthWrite: false }));
        taker.add(shock);
        flare.push(shock);
      }
    }
    if (a.fate === 'parting') {
      const points: THREE.Vector3[] = [], widths: number[] = [];
      for (let i = 0; i <= 50; i++) {
        const t = i / 50, angle = t * 2.4, r = x2 * (1 + (1 - t) * 0.02) * (1 + (1 - t) ** 2 * 0 + t * 0);
        points.push(new THREE.Vector3(Math.cos(angle) * r * (1 - t * 0.35), 0, Math.sin(angle) * r * (1 - t * 0.35)));
        widths.push(r2 * 1.6 * (1 - t));
      }
      system.add(flat(points, widths, partner.clone().lerp(stream, 0.5), 0.45));
      taker.position.x = x2 * 1.0;
    }

    if (a.paths !== 'none') {
      const line = s.material('#8c8f9a', { roughness: 0.8 });
      for (const radius of [Math.abs(x1), Math.abs(x2)]) {
        if (radius < 0.15) continue;
        if (a.paths === 'rings') {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.014, 6, 120), line);
          ring.rotation.x = Math.PI / 2;
          s.root.add(ring);
          ring.position.y = level;
        } else {
          const count = Math.max(10, Math.round(radius * 16));
          const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.02, 0.035), line, count);
          const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion();
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            turn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle + Math.PI / 2);
            matrix.compose(new THREE.Vector3(Math.cos(angle) * radius, level, Math.sin(angle) * radius), turn, new THREE.Vector3(1, 1, 1));
            dash.setMatrixAt(i, matrix);
          }
          s.root.add(dash);
        }
      }
    }

    system.rotation.y = random() * Math.PI * 2;
    const orbit = mix(0.06, 0.5, mood.energy) * mix(0.7, 1.6, a.closeness) * (a.pair === 'dwarfs' ? 1.8 : 1);
    return s.finish({
      update: (dt, time) => {
        system.rotation.y += dt * orbit;
        disc.rotation.y += dt * orbit * 5;
        donor.rotation.x = Math.sin(time * 0.4) * 0.02;
        if (a.fate === 'eruption') {
          const beat = 0.5 + 0.5 * Math.sin(time * mix(2, 7, mood.energy));
          takerPaint.emissiveIntensity = glow * (0.9 + beat * 0.9);
          flare.forEach((shock, index) => shock.scale.setScalar(1 + beat * 0.12 * (index + 1)));
        }
      },
    });
  },
});
