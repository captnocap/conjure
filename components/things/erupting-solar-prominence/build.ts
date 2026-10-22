import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { makeNoise, plasmaPaint, strand, vec } from './plasma';

const LIGHTS = {
  halpha: 'Deep hydrogen-alpha red, the colour of a prominence through a filter.',
  gold: 'Gold and orange visible light, white-hot at the base.',
  euv: 'Extreme-ultraviolet false colour: electric blue-white.',
  eclipse: 'Pale rose-pink, as prominences look to the eye at a total eclipse.',
} as const;
const TONES: Record<keyof typeof LIGHTS, { base: string; mid: string; crown: string; halo: string; foot: string }> = {
  halpha: { base: '#fff1e6', mid: '#ff7a4a', crown: '#b81606', halo: '#f0381a', foot: '#ffd9c4' },
  gold: { base: '#fffbe8', mid: '#ffb63a', crown: '#e24a00', halo: '#ff8a1c', foot: '#fff0c0' },
  euv: { base: '#f2f8ff', mid: '#6fb0ff', crown: '#1748d0', halo: '#4a93ff', foot: '#dcefff' },
  eclipse: { base: '#fff6f8', mid: '#f58ab0', crown: '#c23a70', halo: '#f07aa8', foot: '#ffe0ea' },
};

const hex = (color: THREE.Color, alpha: number) => {
  const value = color.getHex();
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha.toFixed(3)})`;
};

export default defineThing({
  questions: {
    form: choice('What form has the prominence taken?', {
      curtain: 'A broad hanging curtain of plasma threads, folded like drapery.',
      hedgerow: 'A long low ragged hedgerow of fire along the limb.',
      spire: 'A narrow spire shooting straight up.',
      loop: 'An arched loop prominence, a bundle of threads bowing away from the surface over a dark cavity.',
      rope: 'A twisted helical rope, strands winding round each other as they rise.',
    }),
    light: choice('What light is it seen in?', LIGHTS),
    top: choice('What is coming away at the top?', {
      blob: 'One bright knot pinched off and drifting upward, trailing threads.',
      string: 'A string of smaller blobs trailing up like beads.',
      shreds: 'Ragged shreds and filaments peeling away in every direction.',
      arc: 'A flung arc of plasma curling over and back toward the surface.',
      intact: 'Nothing yet: the top is still whole, straining.',
    }),
    base: choice('What anchors it on the limb?', {
      footpoints: 'Two blazing white footpoints.',
      channel: 'A dark filament channel beneath it, a shadow on the surface.',
      spicules: 'A fringe of short bright spicules, grass made of fire.',
      sea: 'A patch of boiling granulated surface it rises straight out of.',
    }),
    width: score('How wide is it?', ['A thin jet', 'A few spans across', 'A wall across the whole limb']),
    rain: noul('Is cooled plasma falling back down beside it as coronal rain?'),
    threads: noul('Are bright field-line threads drawn across its face?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random, seed } = context;
    const tone = TONES[a.light];
    const noise = makeNoise(seed);
    const energy = mood.energy;
    /** How far the eruption has lifted: the mood's energy, not a question. */
    const lift = mix(0.08, 1, energy);
    const formW = { curtain: 1, hedgerow: 1.4, spire: 0.42, loop: 1.1, rope: 0.5 }[a.form];
    const W = mix(1.3, 4.0, a.width) * formW;
    const H = { curtain: 1.0, hedgerow: 0.42, spire: 2.2, loop: 0.9, rope: 1.7 }[a.form] * Math.max(W, 1.5) * mix(0.7, 1.2, lift);
    const materials: THREE.ShaderMaterial[] = [];
    const paint = (options: Parameters<typeof plasmaPaint>[0]) => {
      const material = plasmaPaint(options);
      materials.push(material);
      return material;
    };
    const glow = mix(1.0, 1.2, mood.cheer);
    const dull = new THREE.Color('#4a2a1a');
    const crown = new THREE.Color(tone.crown).lerp(dull, mood.wear * 0.25);
    const mid = new THREE.Color(tone.mid).lerp(dull, mood.wear * 0.15);
    const base = new THREE.Color(tone.base);
    const shimmer = mix(0.06, 0.28, energy), speed = mix(0.05, 0.5, energy);

    // ---- Painted thread curtains: hundreds of fine strands of plasma on a canvas. ----
    const textures: THREE.CanvasTexture[] = [];
    const curtainTexture = (threads: number, ragged: number, shift: number, sway: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 512;
      const g = canvas.getContext('2d')!;
      g.lineCap = 'round';
      const topAt = (x: number) => 1 - ragged * (0.5 + 0.5 * noise(x * 4 + shift, 1.7, shift));
      for (let i = 0; i < threads; i++) {
        const x = 0.04 + random() * 0.92;
        const reach = topAt(x) * mix(0.55, 1, random() ** 0.6);
        const bright = random();
        const gradient = g.createLinearGradient(0, 512, 0, 512 * (1 - reach));
        gradient.addColorStop(0, hex(base, 0.95));
        gradient.addColorStop(0.18, hex(bright > 0.7 ? base : mid, 0.85));
        gradient.addColorStop(0.6, hex(bright > 0.85 ? mid : crown, 0.8));
        gradient.addColorStop(1, hex(crown, 0));
        g.strokeStyle = gradient;
        g.lineWidth = mix(1.2, 6, random() ** 2);
        g.beginPath();
        const phase = random() * 6.28, frequency = mix(2, 7, random()), lean = (random() - 0.5) * 60 * sway;
        g.moveTo(x * 256, 512);
        for (let k = 1; k <= 14; k++) {
          const t = k / 14;
          g.lineTo(x * 256 + lean * t * t + Math.sin(t * frequency + phase) * 7 * sway, 512 * (1 - reach * t));
        }
        g.stroke();
      }
      // A white-hot seam where it leaves the surface.
      const foot = g.createLinearGradient(0, 512, 0, 430);
      foot.addColorStop(0, hex(base, 0.9));
      foot.addColorStop(1, hex(base, 0));
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = foot;
      g.fillRect(0, 380, 256, 132);
      // Soft sides.
      g.globalCompositeOperation = 'destination-in';
      const sides = g.createLinearGradient(0, 0, 256, 0);
      sides.addColorStop(0, 'rgba(0,0,0,0)');
      sides.addColorStop(0.12, 'rgba(0,0,0,1)');
      sides.addColorStop(0.88, 'rgba(0,0,0,1)');
      sides.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = sides;
      g.fillRect(0, 0, 256, 512);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      return texture;
    };
    const sheet = (shape: (u: number, v: number) => [number, number, number], sx: number, sy: number) => {
      const geometry = new THREE.PlaneGeometry(1, 1, sx, sy);
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const u = position.getX(i) + 0.5, v = position.getY(i) + 0.5;
        position.setXYZ(i, ...shape(u, v));
      }
      geometry.computeVertexNormals();
      return geometry;
    };
    const sheets: THREE.Mesh[] = [];
    if (a.form !== 'loop') {
      const layers = 3 + Math.round(mood.density * 2);
      const ragged = { curtain: 0.35, hedgerow: 0.7, spire: 0.25, rope: 0.3, loop: 0 }[a.form];
      const narrow = a.form === 'spire' ? 0.6 : a.form === 'rope' ? 0.45 : 0.1;
      for (let layer = 0; layer < layers; layer++) {
        const depth = (layer - (layers - 1) / 2) * W * 0.07 + (random() - 0.5) * W * 0.03;
        const k = layer === 0 ? 1 : mix(0.75, 1.05, random());
        const swayPhase = random() * 6.28;
        const geometry = sheet((u, v) => {
          const fold = Math.sin(u * 8 + swayPhase + v * 2) * W * 0.035 + noise(u * 4, v * 3, layer) * W * 0.05;
          const pinch = 1 - narrow * v * v;
          return [(u - 0.5) * W * k * pinch + fold * 0.4, v * H * k, depth + fold + Math.sin(u * 5 + swayPhase) * W * 0.03];
        }, 24, 20);
        const front = layer === 0;
        const material = new THREE.MeshBasicMaterial({
          map: curtainTexture(Math.round(mix(70, 160, mood.density) * (a.form === 'hedgerow' ? 1.4 : 1)), ragged, layer * 3.1, a.form === 'spire' ? 0.6 : 1),
          transparent: true, side: THREE.DoubleSide, depthWrite: front, alphaTest: front ? 0.08 : 0, opacity: front ? 1 : 0.75,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = front;
        s.root.add(mesh);
        sheets.push(mesh);
      }
    }

    // ---- Lathe-turned cores: the dense bright body inside the curtain. ----
    const corePaint = paint({ base: tone.base, crown, vertical: true, gamma: 0.6, glow: glow * 1.05, shimmer, waves: 1.2, speed, phase: random() * 6.28 });
    /** A plume: a narrow neck at the surface swelling into a lumpy body that closes over at the top. */
    const plume = (radius: number, height: number, at: readonly [number, number, number], lean = 0, flat = 1, swell = 0.6) => {
      const profile: [number, number][] = [[0, 0], [radius * 1.1, 0]];
      const steps = 12;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        // A flame: swelling from the surface, widest low down, then drawn up to a ragged point.
        const widest = 0.25 + swell * 0.15;
        const body = t < widest ? mix(0.6, 1, t / widest) : (1 - (t - widest) / (1 - widest)) ** 0.75;
        profile.push([Math.max(radius * 0.04, radius * body * (1 + noise(t * 7, at[0] * 3, 2) * 0.3)), height * t]);
      }
      profile.push([0, height]);
      const mesh = s.lathe(profile, corePaint, at);
      mesh.scale.z = flat;
      mesh.rotation.z = lean;
      return mesh;
    };
    const tops: THREE.Vector3[] = [];
    if (a.form === 'curtain') {
      const count = 2 + Math.round(random());
      for (let i = 0; i < count; i++) {
        const x = (i / Math.max(1, count - 1) - 0.5) * W * 0.5 + (random() - 0.5) * W * 0.08;
        const h = H * mix(0.55, 0.8, random());
        plume(W * 0.09, h, [x, 0, 0], (random() - 0.5) * 0.15, 0.45);
        tops.push(vec(x, h, 0));
      }
      tops.push(vec((random() - 0.5) * W * 0.2, H * 0.92, 0));
    } else if (a.form === 'hedgerow') {
      const count = 5 + Math.round(random() * 2);
      for (let i = 0; i < count; i++) {
        const x = (i / (count - 1) - 0.5) * W * 0.8 + (random() - 0.5) * W * 0.05;
        const h = H * mix(0.5, 1.05, random());
        plume(W * 0.04, h, [x, 0, (random() - 0.5) * W * 0.05], (random() - 0.5) * 0.35, 0.6);
        tops.push(vec(x, h, 0));
      }
    } else if (a.form === 'spire') {
      plume(W * 0.15, H * 0.9, [0, 0, 0], (random() - 0.5) * 0.06, 0.8, 1.4);
      tops.push(vec(0, H * 0.9, 0));
    } else if (a.form === 'loop') {
      // A bundle of threads bowing over a cavity, with two plume legs.
      const R = W * 0.44;
      const bundle: THREE.BufferGeometry[] = [];
      const threads = 9 + Math.round(mood.density * 6);
      for (let k = 0; k < threads; k++) {
        const offset = (random() - 0.5) * 2, depth = (random() - 0.5) * W * 0.12, phase = random() * 6.28;
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 16; i++) {
          const t = i / 16, angle = Math.PI * t;
          const r = R * (1 + offset * 0.09) + noise(t * 3, k, 5) * W * 0.03;
          points.push(vec(-r * Math.cos(angle), H * (1 + offset * 0.1) * Math.sin(angle) ** 0.9, depth + Math.sin(angle * 2 + phase) * W * 0.03));
        }
        bundle.push(strand(points, { radius: (t) => W * mix(0.006, 0.016, random() * 0.3 + 0.7 * Math.sin(Math.PI * t)), rings: 40, sides: 6 }));
      }
      for (const geometry of bundle) {
        const mesh = new THREE.Mesh(geometry, paint({ base: tone.base, crown, arch: 1, gamma: 0.55, glow, shimmer, waves: 2, speed, phase: random() * 6.28 }));
        mesh.castShadow = true;
        s.root.add(mesh);
      }
      // A soft glowing body behind the threads, and the dark cavity under the arch.
      const band = sheet((u, v) => {
        const angle = Math.PI * u, rr = mix(0.62, 1.08, v);
        return [-R * Math.cos(angle) * rr, H * Math.sin(angle) * rr, -W * 0.05 + noise(u * 3, v * 3, 4) * W * 0.04];
      }, 36, 6);
      s.root.add(new THREE.Mesh(band, paint({ base: tone.halo, crown, arch: 1, gamma: 0.7, glow, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide, edge: [0.5, 0.5] })));
      const cavity = new THREE.Mesh(new THREE.CircleGeometry(1, 40, 0, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(tone.crown).lerp(new THREE.Color('#1a0c08'), 0.75), transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
      cavity.scale.set(R * 0.6, H * 0.6, 1);
      cavity.position.z = -W * 0.08;
      s.root.add(cavity);
      for (const side of [-1, 1]) plume(W * 0.06, H * 0.42, [side * R, 0, 0], side * 0.22, 0.8);
      tops.push(vec(0, H * 1.05, 0));
    } else {
      plume(W * 0.12, H * 0.9, [0, 0, 0], 0, 1, 1.2);
      // Three strands wound round the core.
      const ropePaint = paint({ base: '#ffffff', crown: tone.halo, glow: 1.2, gamma: 0.7, shimmer: 0.2, waves: 5, speed: speed * 1.5 });
      for (let k = 0; k < 3; k++) {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 40; i++) {
          const t = i / 40, angle = t * Math.PI * 2 * 2.2 + k * (Math.PI * 2 / 3);
          const r = W * 0.2 * (1 - t * 0.35);
          points.push(vec(Math.cos(angle) * r, t * H * 0.92, Math.sin(angle) * r));
        }
        s.root.add(new THREE.Mesh(strand(points, { radius: () => W * 0.03, rings: 80, sides: 8 }), ropePaint));
      }
      tops.push(vec(0, H * 0.92, 0));
    }

    // ---- What has torn free at the top. ----
    const blobPaint = paint({ base: tone.base, crown, vertical: true, gamma: 0.7, glow, shimmer: shimmer * 0.5, waves: 1, speed });
    /** A teardrop knot, its tail pointing back down to where it tore from. */
    const knot = (radius: number, at: THREE.Vector3) => {
      const profile: [number, number][] = [[0, -radius * 2.2]];
      for (let i = 1; i < 14; i++) {
        const t = i / 14;
        const y = mix(-radius * 2.2, radius, t);
        const round = y > 0 ? Math.sqrt(Math.max(0, 1 - (y / radius) ** 2)) : (1 + y / (radius * 2.2)) ** 1.4;
        profile.push([Math.max(radius * 0.04, radius * round * (1 + noise(t * 6 + at.y, at.x, 9) * 0.22)), y]);
      }
      profile.push([0, radius]);
      const mesh = s.lathe(profile, blobPaint, at.toArray() as [number, number, number]);
      mesh.scale.set(1.15, 1, 0.85);
      mesh.rotation.z = (random() - 0.5) * 0.4;
      return mesh;
    };
    const tear = paint({ base: tone.base, crown: tone.halo, opacity: 0.85, fade: [0, 0.35], depthWrite: false, glow: 1.1 });
    const floaters: { mesh: THREE.Object3D; home: THREE.Vector3; phase: number }[] = [];
    const main = tops.reduce((best, top) => (top.y > best.y ? top : best), tops[0]);
    const gap = H * mix(0.06, 0.65, lift);
    const neck = (from: THREE.Vector3, to: THREE.Vector3, count: number, spread: number) => {
      for (let i = 0; i < count; i++) {
        const middle = from.clone().lerp(to, 0.5).add(vec((random() - 0.5) * spread, (random() - 0.5) * spread * 0.4, (random() - 0.5) * spread));
        const points = [from.clone().add(vec((random() - 0.5) * spread, 0, 0)), middle, to.clone().add(vec((random() - 0.5) * spread * 0.4, 0, (random() - 0.5) * spread * 0.4))];
        s.root.add(new THREE.Mesh(strand(points, { radius: (t) => W * 0.012 * (1 - t * 0.5), rings: 14, sides: 6 }), tear));
      }
    };
    if (a.top === 'blob') {
      const at = main.clone().add(vec((random() - 0.5) * W * 0.1, gap + W * 0.2, 0));
      const mesh = knot(W * 0.13, at);
      floaters.push({ mesh, home: at.clone(), phase: random() * 6 });
      neck(main, at.clone().add(vec(0, -W * 0.22, 0)), 5, W * 0.22);
    } else if (a.top === 'string') {
      let at = main.clone();
      const beads = 3 + Math.round(random() * 2);
      for (let i = 0; i < beads; i++) {
        const next = at.clone().add(vec((random() - 0.5) * W * 0.18, gap / beads + W * 0.16, (random() - 0.5) * W * 0.1));
        const mesh = knot(W * mix(0.08, 0.045, i / beads), next);
        floaters.push({ mesh, home: next.clone(), phase: random() * 6 });
        neck(at, next.clone().add(vec(0, -W * 0.1, 0)), 2, W * 0.08);
        at = next;
      }
    } else if (a.top === 'shreds') {
      const count = 9 + Math.round(random() * 5);
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, reach = W * mix(0.18, 0.45, random()) + gap * 0.6;
        const away = vec(Math.cos(angle) * 0.7, 0.75 + random() * 0.5, Math.sin(angle) * 0.35).normalize();
        const points = [main.clone(), main.clone().addScaledVector(away, reach * 0.5).add(vec(0, reach * 0.12, 0)), main.clone().addScaledVector(away, reach).add(vec((random() - 0.5) * W * 0.2, 0, 0))];
        s.root.add(new THREE.Mesh(strand(points, { radius: (t) => W * 0.022 * (1 - t * 0.7), rings: 16, sides: 6 }), tear));
      }
      const mesh = knot(W * 0.07, main.clone().add(vec(0, gap * 0.5 + W * 0.15, 0)));
      floaters.push({ mesh, home: mesh.position.clone(), phase: random() * 6 });
    } else if (a.top === 'arc') {
      const side = random() < 0.5 ? -1 : 1;
      const points: THREE.Vector3[] = [];
      const reach = W * 0.5 + gap * 0.5;
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        points.push(main.clone().add(vec(side * t * reach, Math.sin(t * Math.PI) * (gap + W * 0.25) - t * t * main.y * 0.8, (random() - 0.5) * W * 0.03)));
      }
      s.root.add(new THREE.Mesh(strand(points, { radius: (t) => W * 0.045 * (1 - t * 0.6), rings: 48, sides: 10 }), paint({ base: tone.base, crown: tone.halo, gamma: 0.8, glow, shimmer, waves: 3, speed })));
      for (let i = 0; i < 4; i++) {
        const offset = vec((random() - 0.5) * W * 0.06, (random() - 0.5) * W * 0.06, (random() - 0.5) * W * 0.06);
        s.root.add(new THREE.Mesh(strand(points.map((point, k) => point.clone().addScaledVector(offset, Math.sin(Math.PI * k / 12) * 2)), { radius: () => W * 0.008, rings: 36, sides: 5 }), tear));
      }
    } else {
      // Intact: a strained, swollen cap with a few tight threads over it.
      const cap = s.ball([W * 0.16, W * 0.09, W * 0.1], main.clone().add(vec(0, -W * 0.02, 0)).toArray() as [number, number, number], blobPaint, 18);
      cap.castShadow = true;
      neck(main.clone().add(vec(-W * 0.12, -H * 0.15, 0)), main.clone().add(vec(W * 0.12, -H * 0.15, 0)).add(vec(0, 0, 0)), 3, W * 0.1);
    }

    // ---- The base on the limb. ----
    const plage = new THREE.MeshBasicMaterial({ color: new THREE.Color(tone.foot) });
    const footGlow = paint({ base: tone.halo, crown: tone.foot, vertical: true, opacity: 0.5, rim: 1, rimPower: 1.2, depthWrite: false });
    const flat = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, z: number, y = 0.01) => {
      const mesh = s.mesh(geometry, material, [x, y, z]);
      mesh.rotation.x = -Math.PI / 2;
      mesh.castShadow = false;
      return mesh;
    };
    if (a.base === 'footpoints') {
      for (const side of [-1, 1]) {
        const x = side * W * (a.form === 'spire' || a.form === 'rope' ? 0.25 : a.form === 'loop' ? 0.44 : 0.38);
        flat(new THREE.CircleGeometry(W * 0.1, 24), plage, x, 0);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(W * 0.16, 20, 14), footGlow);
        ball.position.set(x, 0.01, 0);
        ball.scale.y = 0.35;
        s.root.add(ball);
      }
    } else if (a.base === 'channel') {
      const dark = s.material('#3a2218', { roughness: 0.95 });
      const channel = flat(new THREE.CircleGeometry(1, 32), dark, 0, W * 0.1, 0.008);
      channel.scale.set(W * 0.55, W * 0.13, 1);
      channel.rotation.z = (random() - 0.5) * 0.2;
      const fringe = s.material('#7a3a1a', { roughness: 0.9, emissive: '#5a2008', emissiveIntensity: 0.3 });
      const outer = flat(new THREE.RingGeometry(1, 1.5, 32), fringe, 0, W * 0.1, 0.006);
      outer.scale.set(W * 0.55, W * 0.13, 1);
    } else if (a.base === 'spicules') {
      const count = Math.round(mix(50, 110, mood.density));
      const spicule = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(tone.foot).lerp(new THREE.Color(tone.halo), 0.45) }), count);
      const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        const x = (random() - 0.5) * W * 1.15, z = (random() - 0.5) * W * 0.4;
        const h = W * mix(0.05, 0.13, random());
        quaternion.setFromEuler(new THREE.Euler((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5));
        spicule.setMatrixAt(i, matrix.compose(vec(x, h / 2, z), quaternion, scale.set(W * 0.01, h, W * 0.01)));
      }
      spicule.castShadow = false;
      s.root.add(spicule);
    } else {
      // Granulation: a disc of bright cells divided by darker lanes.
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const g = canvas.getContext('2d')!;
      const cell = new THREE.Color(tone.foot), lane = new THREE.Color(tone.halo).lerp(new THREE.Color(tone.foot), 0.35);
      g.fillStyle = hex(lane, 1);
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) {
        const x = random() * 256, y = random() * 256, r = mix(2.5, 5.5, random());
        g.fillStyle = hex(cell.clone().lerp(lane, random() * 0.45), 0.9);
        g.beginPath();
        g.ellipse(x, y, r, r * mix(0.7, 1, random()), random() * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.globalCompositeOperation = 'destination-in';
      const round = g.createRadialGradient(128, 128, 60, 128, 128, 128);
      round.addColorStop(0, 'rgba(0,0,0,1)');
      round.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = round;
      g.fillRect(0, 0, 256, 256);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const patch = flat(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }), 0, 0, 0.006);
      patch.scale.set(W * 0.7, W * 0.32, 1);
    }

    // ---- Coronal rain and face threads. ----
    let rain: THREE.InstancedMesh | null = null;
    const drops: { x: number; z: number; top: number; phase: number }[] = [];
    if (a.rain) {
      const count = 40;
      rain = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(tone.crown).lerp(new THREE.Color('#ffffff'), 0.15) }), count);
      for (let i = 0; i < count; i++) drops.push({ x: (random() < 0.5 ? -1 : 1) * W * mix(0.3, 0.6, random()), z: (random() - 0.5) * W * 0.3, top: H * mix(0.5, 0.95, random()), phase: random() });
      rain.castShadow = false;
      s.root.add(rain);
    }
    if (a.threads && a.form !== 'loop') {
      const thread = paint({ base: '#ffffff', crown: tone.halo, opacity: 0.8, fade: [0.15, 0.25], depthWrite: false, glow: 1.15 });
      const count = 5 + Math.round(random() * 4);
      for (let i = 0; i < count; i++) {
        const x0 = (random() - 0.5) * W * 0.9, x1 = x0 + (random() - 0.5) * W * 0.4;
        const points = [vec(x0, 0.02, W * 0.1), vec((x0 + x1) / 2 + (random() - 0.5) * W * 0.12, H * mix(0.3, 0.55, random()), W * 0.13), vec(x1, H * mix(0.6, 0.95, random()), W * 0.1)];
        s.root.add(new THREE.Mesh(strand(points, { radius: () => W * 0.007, rings: 20, sides: 5 }), thread));
      }
    }

    const matrix = new THREE.Matrix4();
    const pace = mix(0.1, 0.5, energy);
    return s.finish({
      footprint: W * 0.5,
      update: (_dt, time) => {
        for (const material of materials) material.uniforms.time.value = time;
        sheets.forEach((mesh, index) => { mesh.rotation.y = Math.sin(time * 0.3 * pace + index) * 0.04; });
        for (const texture of textures) texture.offset.x = Math.sin(time * 0.2 * pace) * 0.01;
        for (const floater of floaters) {
          floater.mesh.position.copy(floater.home).add(vec(Math.sin(time * 0.4 + floater.phase) * W * 0.01, Math.sin(time * 0.6 + floater.phase) * W * 0.02 + ((time * pace * 0.1 + floater.phase) % 1) * W * 0.05, 0));
        }
        if (rain) {
          drops.forEach((drop, i) => {
            const fall = (time * pace * 0.4 + drop.phase) % 1;
            const r = W * 0.012;
            rain!.setMatrixAt(i, matrix.makeScale(r, r * 2.2, r).setPosition(drop.x + Math.sin(fall * 6) * W * 0.02, drop.top * (1 - fall * fall), drop.z));
          });
          rain.instanceMatrix.needsUpdate = true;
        }
      },
    });
  },
});
