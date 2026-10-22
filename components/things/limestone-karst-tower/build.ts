import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
interface Crag { at(theta: number, t: number, out?: number): P3; R: number; H: number }

const SHAPES = {
  sugarloaf: { a: 2.6, b: 0.6, wide: 1, tall: 1 },
  needle: { a: 2.3, b: 0.62, wide: 0.52, tall: 1.3 },
  table: { a: 9, b: 0.32, wide: 1.15, tall: 0.72 },
  camel: { a: 2.4, b: 0.62, wide: 0.85, tall: 0.9 },
  leaning: { a: 2.2, b: 0.6, wide: 0.82, tall: 1.1 },
  cluster: { a: 2.6, b: 0.62, wide: 0.8, tall: 1.05 },
} as const;

export default defineThing({
  questions: {
    shape: choice('What is the silhouette of the peak?', {
      sugarloaf: 'One rounded sugarloaf dome with sheer sides, the classic scroll mountain.',
      needle: 'A thin, tall spire like a brush standing on end.',
      table: 'A squat block with cliffs all round and a flat wooded top.',
      camel: 'Two humps joined at the waist, like a kneeling camel.',
      leaning: 'A tower that tilts and overhangs to one side, as if about to bow.',
      cluster: 'A main tower with two smaller companions crowding its foot.',
    }),
    rock: choice('What is the stone like?', {
      pale: 'Pale dove-grey limestone, dry and bright.',
      wet: 'Dark, rain-soaked grey with heavy black streaks.',
      ochre: 'Grey stained with rust and ochre seeps.',
      ink: 'Near-monochrome, like dilute ink on silk.',
      mossy: 'Grey-green, furred with moss and lichen.',
    }),
    scrub: score('How much vegetation clings to it?', ['Bare stone', 'Tufts on the ledges', 'A shaggy green cap', 'Smothered in jungle']),
    cave: choice('Is there a cave in the face?', {
      none: 'No cave: unbroken cliff.',
      mouth: 'A dark cave mouth partway up, black and unexplained.',
      shrine: 'A cave with a small red shrine and a lamp burning inside.',
      waterline: 'A low wide cavern at the foot, where a river could slip inside.',
    }),
    built: choice('What have people left on it?', {
      nothing: 'Nothing: no one has ever climbed it.',
      pavilion: 'A tiny pavilion on the summit with a thread of stairs winding up to it.',
      hut: 'A hermit\'s hut wedged on a ledge.',
      inscription: 'Huge red characters carved into the cliff face.',
      pine: 'A single wind-bent pine on the very top.',
    }),
    foot: choice('What lies at its foot?', {
      water: 'Still jade water right up to the cliff.',
      paddies: 'A patchwork of flooded rice paddies.',
      scree: 'Fallen boulders and rough ground.',
      mist: 'Nothing visible: the base is lost in mist.',
    }),
    now: choice('What is happening on it right now?', {
      still: 'Nothing at all. It has stood like this for a million years.',
      birds: 'White egrets circle the upper cliffs.',
      waterfall: 'A white thread of waterfall, the rain just ended.',
      smoke: 'A thin line of smoke rises from someone\'s fire.',
      cloud: 'A band of cloud has snagged around its waist.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const shape = SHAPES[a.shape];
    const tones = {
      pale: ['#a3a59e', '#c9cac1', '#3a3d3b'], wet: ['#6c7371', '#8d9390', '#1b2022'], ochre: ['#a39c8c', '#c4bba6', '#75451f'],
      ink: ['#85888a', '#c3c5c2', '#1f2224'], mossy: ['#87907a', '#aab19b', '#34402f'],
    }[a.rock];
    const warmShift = new THREE.Color().setHSL(mix(0.6, 0.08, mood.warmth), 0.35, 0.6);
    const base = new THREE.Color(tones[0]).lerp(warmShift, 0.1);
    const pale = new THREE.Color(tones[1]).lerp(warmShift, 0.1);
    const dark = new THREE.Color(tones[2]);
    const green = new THREE.Color(a.rock === 'ink' ? '#55665a' : '#4f7a3a').lerp(new THREE.Color('#8a8a4a'), mood.wear * 0.3);
    const streaky = mix(0.45, 1, mood.wear) * (a.rock === 'wet' ? 1.25 : 1);
    const scrub = clamp01(a.scrub * mix(0.75, 1.2, mood.density));
    const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.9 });
    const tufts: { at: P3; size: number; color: THREE.Color }[] = [];

    const crag = (o: { x: number; z: number; R: number; H: number; lean: number; ph: number; a?: number; b?: number }): Crag => {
      const SEG = 96, RINGS = 40;
      const p2 = random() * 6.28, p3 = random() * 6.28;
      const pa = o.a ?? shape.a, pb = o.b ?? shape.b;
      const ledges = 4 + Math.floor(random() * 4);
      const ledge = (th: number, t: number) => (((t * ledges + 0.55 * Math.sin(th * 1.3 + o.ph) + 0.3 * Math.sin(th * 3.1 + p2) + 0.2 * Math.sin(th * 7 + p3)) % 1) + 1) % 1;
      const rad = (th: number, t: number) => {
        const prof = Math.pow(Math.max(0, 1 - Math.pow(t, pa)), pb) + 0.16 * Math.pow(1 - t, 4);
        const lump = 1 + 0.15 * Math.sin(2 * th + o.ph + t * 1.3) + 0.1 * Math.sin(3 * th + p2 + t * 3.2) + 0.06 * Math.sin(5 * th + p3 - t * 7) + 0.035 * Math.sin(9 * th + p2 * 2 + t * 13) * Math.sin(t * 9 + p3);
        return o.R * prof * lump * (1 + 0.07 * (1 - ledge(th, t)));
      };
      const at = (th: number, t: number, out = 0): P3 => {
        const r = rad(th, t) + out;
        return [o.x + Math.sin(th) * r + o.lean * o.H * t * t, t * o.H, o.z + Math.cos(th) * r];
      };
      const positions: number[] = [], colours: number[] = [], index: number[] = [];
      const c = new THREE.Color();
      const jitter: number[] = [];
      for (let j = 0; j <= RINGS; j++) {
        const t = j / RINGS;
        for (let i = 0; i <= SEG; i++) {
          const th = (i / SEG) * Math.PI * 2;
          const jit = i === SEG ? jitter[j * SEG] : (jitter[j * SEG + i] = (random() - 0.5) * o.R * 0.05 * (t > 0.97 ? 0 : 1));
          positions.push(...at(th, t, jit));
          const w = th + Math.sin(t * 7 + p2) * 0.03;
          const streak = Math.pow(Math.max(0, Math.sin(w * 9 + o.ph)), 3) * (0.6 + 0.4 * Math.sin(t * 6 + th * 4)) + Math.pow(Math.max(0, Math.sin(w * 14 + p2)), 5) * 0.9 + Math.pow(Math.max(0, Math.sin(w * 23 + p3)), 8) * 0.7;
          c.copy(base).lerp(pale, clamp01(t * 0.5 + 0.2 * Math.sin(th * 3 + t * 9 + p3)));
          c.lerp(dark, clamp01(streak * streaky) * (1 - t * 0.35));
          const f = ledge(th, t);
          const cap = clamp01((t - mix(0.99, 0.7, scrub)) * 6) + (f > 0.84 ? scrub * 0.9 : 0);
          c.lerp(green, clamp01(cap) * clamp01(scrub * 2.2));
          if (t < 0.04) c.lerp(dark, 0.35);
          colours.push(c.r, c.g, c.b);
        }
      }
      for (let j = 0; j < RINGS; j++) for (let i = 0; i < SEG; i++) {
        const p = j * (SEG + 1) + i, q = p + SEG + 1;
        index.push(p, p + 1, q, p + 1, q + 1, q);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      s.mesh(geometry, rockMat);
      const count = Math.round(scrub * 190 * (o.R / 40) + (scrub > 0.05 ? 8 : 0));
      for (let n = 0; n < count; n++) {
        const t = clamp01(1 - Math.pow(random(), 1.4) * mix(0.35, 0.95, scrub));
        const p = at(random() * Math.PI * 2, Math.min(t, 0.985), o.R * 0.01);
        tufts.push({ at: p, size: o.R * mix(0.05, 0.11, random()) * mix(0.8, 1.3, scrub), color: green.clone().offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.14) });
      }
      return { at, R: o.R, H: o.H };
    };

    const H = mix(105, 140, random()) * shape.tall, R = mix(34, 42, random()) * shape.wide;
    const ph = random() * 6.28;
    const lean = a.shape === 'leaning' ? mix(0.3, 0.42, random()) * (random() < 0.5 ? -1 : 1) : (random() - 0.5) * 0.08;
    const main = crag({ x: 0, z: 0, R, H, lean, ph });
    if (a.shape === 'camel') crag({ x: R * 1.25, z: -R * 0.15, R: R * 0.85, H: H * mix(0.62, 0.78, random()), lean: 0.03, ph: ph + 2 });
    if (a.shape === 'cluster') {
      crag({ x: -R * 1.45, z: R * 0.35, R: R * 0.55, H: H * mix(0.4, 0.55, random()), lean: -0.05, ph: ph + 1, a: 2.2, b: 0.7 });
      crag({ x: R * 1.3, z: -R * 0.6, R: R * 0.62, H: H * mix(0.55, 0.7, random()), lean: 0.06, ph: ph + 4, a: 2.0, b: 0.75 });
    }

    // Cave: a black hollow pressed into the face, with a pale lip so it reads as a mouth.
    const caveTheta = 0.35 + (random() - 0.5) * 0.3;
    const caveT = a.cave === 'waterline' ? 0.045 : mix(0.36, 0.5, random());
    const black = new THREE.MeshStandardMaterial({ color: '#0d0f10', roughness: 1 });
    if (a.cave !== 'none') {
      const p = main.at(caveTheta, caveT, -R * 0.06);
      const w = a.cave === 'waterline' ? R * 0.34 : R * 0.17, h = a.cave === 'waterline' ? H * 0.06 : H * 0.075;
      const hole = s.ball([w, h, R * 0.14], p, black, 18);
      hole.rotation.y = caveTheta;
      const lip = s.ring(w * 0.98, R * 0.022, [p[0] + Math.sin(caveTheta) * R * 0.05, p[1], p[2] + Math.cos(caveTheta) * R * 0.05], new THREE.MeshStandardMaterial({ color: pale, roughness: 0.95, flatShading: true }), Math.PI);
      lip.scale.y = h / w;
      lip.rotation.y = caveTheta;
      if (a.cave === 'shrine') {
        const glow = clamp01(Math.abs(mood.daylight - 0.5) * 2 + 0.35);
        const q = main.at(caveTheta, caveT - 0.035, R * 0.02);
        const red = s.material('#b3271e', { emissive: '#7a1108', emissiveIntensity: 0.3 });
        const shrine = s.box([w * 0.8, h * 0.5, R * 0.08], [q[0], q[1] + h * 0.3, q[2]], red);
        shrine.rotation.y = caveTheta;
        const roof = s.box([w * 1.05, h * 0.12, R * 0.11], [q[0], q[1] + h * 0.6, q[2]], s.material('#2e2a27'));
        roof.rotation.y = caveTheta;
        s.ball([w * 0.16, w * 0.16, w * 0.16], [q[0] + Math.sin(caveTheta) * R * 0.06, q[1] + h * 0.3, q[2] + Math.cos(caveTheta) * R * 0.06], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb347', emissiveIntensity: 1 + glow * 2 }), 10);
      }
    }

    const wood = s.material('#5a3f2c'), tile = s.material('#34383a'), plaster = s.material('#d9d2bf');
    if (a.built === 'pavilion') {
      const top = main.at(0, 0.985);
      const u = H * 0.035;
      const cx = lean * H, cz = 0;
      s.cylinder(u * 1.5, u * 1.7, u * 0.5, [cx, top[1] + u * 0.1, cz], plaster, 8);
      for (let k = 0; k < 4; k++) s.cylinder(u * 0.1, u * 0.1, u * 1.5, [cx + Math.cos(k * 1.57 + 0.78) * u, top[1] + u * 1.1, cz + Math.sin(k * 1.57 + 0.78) * u], s.material('#9c2f22'), 6);
      const roof = s.mesh(new THREE.ConeGeometry(u * 2.1, u * 1.2, 4), tile, [cx, top[1] + u * 2.4, cz]);
      roof.rotation.y = Math.PI / 4;
      s.ball([u * 0.18, u * 0.3, u * 0.18], [cx, top[1] + u * 3.1, cz], s.material('#c9a13a'), 8);
      const steps: { at: P3; size: number }[] = [];
      for (let k = 0; k < 150; k++) {
        const t = 0.02 + (k / 150) * 0.95;
        steps.push({ at: main.at(0.9 + t * 7.5, t, R * 0.015), size: R * 0.035 });
      }
      s.scatter(new THREE.BoxGeometry(1, 0.5, 1), s.material('#e6dfcb'), steps);
    }
    if (a.built === 'hut') {
      const th = -0.75 + (random() - 0.5) * 0.3, t = mix(0.42, 0.56, random());
      const p = main.at(th, t, R * 0.03);
      const u = H * 0.03;
      const g = new THREE.Group();
      g.position.set(...p); g.rotation.y = th; s.root.add(g);
      const add = (m: THREE.Mesh) => { m.removeFromParent(); g.add(m); return m; };
      add(s.box([u * 3.4, u * 0.3, u * 2.4], [0, -u * 0.15, 0], wood));
      for (const x of [-1.4, 1.4]) add(s.rod([x * u, -u * 0.2, u * 0.9], [x * u * 0.5, -u * 2.6, -u * 0.9], u * 0.09, wood));
      add(s.box([u * 2.2, u * 1.3, u * 1.5], [0, u * 0.65, -u * 0.2], plaster));
      add(s.box([u * 0.45, u * 0.8, u * 0.06], [-u * 0.3, u * 0.4, u * 0.57], black));
      const roof = add(s.mesh(new THREE.CylinderGeometry(u * 1.25, u * 1.25, u * 2.9, 3), s.material('#8a7a4e'), [0, u * 1.6, -u * 0.2]));
      roof.rotation.z = Math.PI / 2; roof.scale.set(0.7, 1, 1);
    }
    if (a.built === 'pine') {
      const top = main.at(0, 0.99);
      const cx = lean * H, u = H * 0.05;
      s.tube([[cx, top[1] - u * 0.3, 0], [cx + u * 0.3, top[1] + u * 1.2, 0], [cx + u * 1.2, top[1] + u * 2.1, u * 0.2], [cx + u * 2.4, top[1] + u * 2.5, u * 0.3]], u * 0.12, s.material('#4a352a'));
      const pineGreen = s.material('#2f5a3a', { flatShading: true });
      for (const [dx, dy, r] of [[2.3, 2.7, 1.1], [1.1, 2.4, 0.9], [3.1, 2.3, 0.7], [0.2, 1.7, 0.6]] as const) s.ball([u * r, u * r * 0.28, u * r * 0.8], [cx + u * dx, top[1] + u * dy, u * 0.25], pineGreen, 8);
    }
    if (a.built === 'inscription') {
      const th = -0.3 + (random() - 0.5) * 0.3, t = mix(0.3, 0.42, random());
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.strokeStyle = '#b81f17'; ctx.lineCap = 'round';
      for (let g = 0; g < 4; g++) {
        const oy = g * 128 + 14;
        for (let k = 0; k < 7; k++) {
          ctx.lineWidth = 9 + random() * 6;
          const x0 = 18 + random() * 92, y0 = oy + random() * 100;
          const kind = random();
          ctx.beginPath(); ctx.moveTo(x0, y0);
          if (kind < 0.4) ctx.lineTo(18 + random() * 92, y0 + (random() - 0.5) * 10);
          else if (kind < 0.75) ctx.lineTo(x0 + (random() - 0.5) * 10, oy + random() * 100);
          else ctx.lineTo(x0 + (random() - 0.5) * 60, y0 + 30 + random() * 30);
          ctx.stroke();
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const hgt = H * 0.3;
      const plane = s.mesh(new THREE.PlaneGeometry(hgt / 4, hgt), new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.4, transparent: true, roughness: 0.9, emissive: '#5a0c08', emissiveIntensity: 0.4, side: THREE.DoubleSide }), main.at(th, t, R * 0.07));
      const lo = main.at(th, t - 0.13, 0), hi = main.at(th, t + 0.13, 0);
      plane.rotation.order = 'YXZ';
      plane.rotation.y = th;
      plane.rotation.x = -Math.atan2(Math.hypot(lo[0] - hi[0], lo[2] - hi[2]) * (Math.hypot(lo[0], lo[2]) > Math.hypot(hi[0], hi[2]) ? 1 : -1), hi[1] - lo[1]);
    }

    // Foot.
    const span = (a.shape === 'camel' || a.shape === 'cluster' ? 2.5 : 1.75) * R;
    if (a.foot === 'water') {
      s.cylinder(span, span, 1.2, [a.shape === 'camel' ? R * 0.6 : 0, 0.2, 0], new THREE.MeshStandardMaterial({ color: new THREE.Color('#5f9c8a').lerp(warmShift, 0.15), roughness: 0.25, metalness: 0.2 }), 48);
    } else if (a.foot === 'paddies') {
      const cx = a.shape === 'camel' ? R * 0.6 : 0;
      const fills = ['#8fbf4a', '#9fb8b0', '#6fa83e', '#b5c7b9', '#c2b25a', '#7db552'];
      s.cylinder(span, span, 1.2, [cx, 0.2, 0], s.material('#6b5a40'), 48);
      let ang = random() * 6;
      while (ang < 12.2) {
        const arc = mix(0.35, 0.9, random());
        for (const [r0, r1] of [[0.55, 0.76], [0.78, 0.98]] as const) {
          const field = s.mesh(new THREE.RingGeometry(span * r0, span * r1, 12, 1, ang, arc - 0.05), s.material(fills[Math.floor(random() * fills.length)], { roughness: 0.4 }), [cx, 0.95, 0]);
          field.rotation.x = -Math.PI / 2;
        }
        ang += arc;
      }
    } else if (a.foot === 'scree') {
      s.cylinder(span * 0.95, span, 1.2, [a.shape === 'camel' ? R * 0.6 : 0, 0.2, 0], s.material('#7f8368'), 40);
      const rocks = [];
      for (let k = 0; k < 40 + mood.wear * 50; k++) {
        const th = random() * 6.28, d = R * mix(1.0, 1.65, random());
        rocks.push({ at: [Math.sin(th) * d, 1 + random() * 2, Math.cos(th) * d] as P3, size: R * mix(0.03, 0.1, random()), color: base.clone().offsetHSL(0, 0, (random() - 0.5) * 0.12) });
      }
      s.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1 }), rocks);
    }
    const mistMat = new THREE.MeshStandardMaterial({ color: '#f4f5f0', transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 });
    const puffs: THREE.Mesh[] = [];
    const mistBand = (y: number, reach: number, n: number) => {
      for (let k = 0; k < n; k++) {
        const th = (k / n) * 6.28 + random();
        const d = reach * mix(0.85, 1.15, random());
        puffs.push(s.ball([R * mix(0.45, 0.8, random()), R * mix(0.1, 0.18, random()), R * mix(0.35, 0.6, random())], [Math.sin(th) * d + lean * y * y / H, y + (random() - 0.5) * R * 0.15, Math.cos(th) * d], mistMat, 12));
      }
    };
    if (a.foot === 'mist') { s.cylinder(span * 0.9, span * 0.9, 0.6, [0, 0, 0], s.material('#cfd3cb'), 40); mistBand(R * 0.22, R * 1.2, 11); }
    if (a.now === 'cloud') mistBand(H * mix(0.45, 0.6, random()), R * 0.95, 9);

    if (tufts.length) s.scatter(new THREE.IcosahedronGeometry(1, 0), leafMat, tufts);

    let flock: THREE.Group | null = null;
    if (a.now === 'birds') {
      flock = new THREE.Group();
      flock.position.set(lean * H * 0.5, H * 0.78, 0);
      const white = new THREE.MeshStandardMaterial({ color: '#fbfbf6', roughness: 0.7, emissive: '#666660', side: THREE.DoubleSide });
      const wing = new THREE.BufferGeometry();
      const u = H * 0.03;
      wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, u * 0.5, -u * 1.6, u * 0.5, -u * 0.3, 0, 0, -u * 0.4, 0, 0, u * 0.5, 0, 0, -u * 0.4, u * 1.6, u * 0.5, -u * 0.3], 3));
      wing.computeVertexNormals();
      const n = 5 + Math.floor(random() * 6);
      for (let k = 0; k < n; k++) {
        const bird = new THREE.Mesh(wing, white);
        const th = (k / n) * 6.28 + random() * 0.6, d = R * mix(0.95, 1.3, random());
        bird.position.set(Math.sin(th) * d, (random() - 0.5) * H * 0.18, Math.cos(th) * d);
        bird.rotation.y = th + Math.PI / 2;
        bird.castShadow = true;
        flock.add(bird);
      }
      s.root.add(flock);
    }
    if (a.now === 'waterfall') {
      const th = caveTheta - 0.9, top = mix(0.6, 0.78, random());
      const pts: P3[] = [];
      for (let k = 0; k <= 12; k++) pts.push(main.at(th + Math.sin(k) * 0.015, top * (1 - k / 12) + 0.005, R * 0.025));
      s.tube(pts, R * 0.028, new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#c9d6d8', emissiveIntensity: 0.6, roughness: 0.3 }));
      const foot = main.at(th, 0.01, R * 0.08);
      s.ball([R * 0.14, R * 0.05, R * 0.14], foot, new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false }), 10);
    }
    if (a.now === 'smoke') {
      const from = a.built === 'hut' || a.cave === 'none' ? main.at(-0.75, 0.6, R * 0.05) : main.at(caveTheta, caveT + 0.04, R * 0.05);
      for (let k = 0; k < 9; k++) puffs.push(s.ball([R * (0.035 + k * 0.012), R * 0.06, R * (0.035 + k * 0.012)], [from[0] + Math.sin(k * 0.7) * R * 0.04 + k * R * 0.03, from[1] + k * R * 0.14, from[2]], new THREE.MeshStandardMaterial({ color: '#e9e6df', transparent: true, opacity: 0.55 - k * 0.04, depthWrite: false }), 8));
    }

    const speed = mix(0.02, 0.35, mood.energy);
    const home = puffs.map((p) => p.position.x);
    return s.finish({
      footprint: span,
      update: (_dt, time) => {
        if (flock) flock.rotation.y = time * speed;
        puffs.forEach((p, i) => { p.position.x = home[i] + Math.sin(time * speed * 0.6 + i) * R * 0.05; });
      },
    });
  },
});
