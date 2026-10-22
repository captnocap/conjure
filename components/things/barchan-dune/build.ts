import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { rippleTexture, sandGround, sandTone } from './sand';

type P3 = readonly [number, number, number];

const SANDS = {
  gold: 'Classic golden Saharan sand.',
  cream: 'Pale cream, almost white at noon.',
  red: 'Deep apricot-red, like the old dunes of the Namib.',
  gypsum: 'Blinding white gypsum.',
  black: 'Black volcanic sand, a dune of ash.',
  rust: 'Dusty rust-brown, a dune on another planet.',
} as const;
const SAND: Record<keyof typeof SANDS, string> = { gold: '#e2bb78', cream: '#eedcb4', red: '#d98a55', gypsum: '#e9e4d6', black: '#4a4642', rust: '#b06a48' };
const GROUNDS = {
  gravel: 'A dark pan of wind-polished gravel, the dune sharply pale against it.',
  hardpan: 'Pale cracked clay hardpan.',
  sand: 'More sand, rippled, the same colour as the dune.',
  salt: 'A flat white crust of salt.',
} as const;

interface Crescent { a: number; bL: number; bR: number; kL: number; kR: number; H: number; cx: number; cz: number }
const SLIP = Math.tan((33 * Math.PI) / 180);

export default defineThing({
  questions: {
    form: choice('What shape has the wind given it?', {
      classic: 'A textbook crescent with two even horns.',
      longhorn: 'A lean crescent with long thin horns drawn far downwind.',
      stubby: 'A fat young mound with only the start of horns, barely a crescent yet.',
      lopsided: 'One horn much longer than the other, as if it is being pulled sideways.',
      twin: 'Two crescents joined at the shoulder, a big one and a smaller follower.',
    }),
    sand: choice('What is the sand?', SANDS),
    height: score('How big is the dune?', ['A low whaleback you could step over the crest of', 'House high', 'A towering slip face']),
    surface: choice('What marks its surface?', {
      ripples: 'Nothing but even wind ripples across the whole windward back.',
      smooth: 'Almost nothing: a swept, unmarked skin.',
      footprints: 'A single line of footprints climbing the back to the crest.',
      tyres: 'Twin tyre tracks carved straight up and over by someone showing off.',
      slumps: 'Fresh avalanche tongues down the slip face, with lobes of slid sand at its foot.',
    }),
    path: choice('What lies in its path or its wake?', {
      nothing: 'Nothing. It crosses empty ground.',
      palm: 'A date palm at the foot of the slip face, buried to its crown.',
      hut: 'A flat-roofed mud hut being swallowed from behind, sand through the door.',
      poles: 'A line of telegraph poles walking into the dune and out the other side.',
      tent: 'A small tent pitched in the shelter between the horns.',
      skeleton: 'A bleached camel skeleton uncovered on the upwind side, where the dune has moved on.',
    }),
    ground: choice('What bare ground does it cross?', GROUNDS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const sand = sandTone(SAND[a.sand], a.sand === 'gypsum' || a.sand === 'black' ? 0.5 + (mood.warmth - 0.5) * 0.3 : mood.warmth);
    const H = mix(2.2, 7.5, a.height) * mix(0.92, 1.08, random());
    const B = 17 * mix(0.8, 1.15, a.height) * mix(0.94, 1.06, random());
    const shapes: Record<typeof a.form, Omit<Crescent, 'H' | 'cx' | 'cz'>> = {
      classic: { a: B * 1.1, bL: B, bR: B, kL: 0.85 / B, kR: 0.85 / B },
      longhorn: { a: B * 0.95, bL: B * 1.1, bR: B * 1.1, kL: 1.45 / (B * 1.1), kR: 1.45 / (B * 1.1) },
      stubby: { a: B * 1.05, bL: B * 0.8, bR: B * 0.8, kL: 0.4 / (B * 0.8), kR: 0.4 / (B * 0.8) },
      lopsided: { a: B, bL: B * 1.35, bR: B * 0.75, kL: 1.3 / (B * 1.35), kR: 0.55 / (B * 0.75) },
      twin: { a: B, bL: B * 0.9, bR: B * 0.9, kL: 0.9 / (B * 0.9), kR: 0.9 / (B * 0.9) },
    };
    if (a.form === 'lopsided' && random() < 0.5) {
      const f = shapes.lopsided;
      [f.bL, f.bR, f.kL, f.kR] = [f.bR, f.bL, f.kR, f.kL];
    }
    const main: Crescent = { ...shapes[a.form], H, cx: 0, cz: 0 };
    const dunes = [main];
    if (a.form === 'twin') dunes.push({ a: main.a * 0.68, bL: main.bL * 0.66, bR: main.bR * 0.66, kL: main.kL / 0.66, kR: main.kR / 0.66, H: H * 0.62, cx: main.bR * 1.2, cz: main.a * 0.42 });

    const brinkAt = (d: Crescent) => 0.1 * d.a;
    const dome = (d: Crescent, up: number, v: number) => {
      const q = 1 - (up / d.a) ** 2 - (v / (v < 0 ? d.bL : d.bR)) ** 2;
      return q >= 0 ? d.H * q ** 1.5 : -Math.min(0.5, -q * 2);
    };
    const heightOf = (d: Crescent, x: number, z: number) => {
      const v = x - d.cx, up = z - d.cz - (v < 0 ? d.kL : d.kR) * v * v, ub = brinkAt(d);
      if (up <= ub) return dome(d, up, v);
      const hb = dome(d, ub, v);
      return hb <= 0 ? hb : Math.max(-0.3, hb - SLIP * (up - ub));
    };
    // Centre the whole assembly on the origin.
    const box = new THREE.Box2();
    for (const d of dunes) {
      box.expandByPoint(new THREE.Vector2(d.cx - d.bL, d.cz - d.a));
      box.expandByPoint(new THREE.Vector2(d.cx + d.bR, d.cz + brinkAt(d) + Math.max(d.kL * d.bL ** 2, d.kR * d.bR ** 2)));
    }
    const mid = box.getCenter(new THREE.Vector2()), span = box.getSize(new THREE.Vector2());
    for (const d of dunes) { d.cx -= mid.x; d.cz -= mid.y; }
    const radius = Math.max(span.x, span.y) * 0.6;
    const duneHeight = (x: number, z: number) => Math.max(0, ...dunes.map((d) => heightOf(d, x, z)));

    // Ground.
    const groundColour = { gravel: new THREE.Color('#84786b'), hardpan: new THREE.Color('#c4b497'), sand: sand.clone().multiplyScalar(0.9).lerp(new THREE.Color('#b9a58a'), 0.15), salt: new THREE.Color('#dcdad0') }[a.ground];
    if (a.ground !== 'sand') groundColour.lerp(sand, 0.12);
    const ground = sandGround({ radius, colour: groundColour, random, dome: 0.04, ripple: a.ground === 'sand' ? 0.9 : 0.12, rows: a.ground === 'sand' ? 46 : 24 });
    s.root.add(ground.mesh);
    const surfaceY = (x: number, z: number) => Math.max(ground.y(x, z), duneHeight(x, z));
    const on = (x: number, z: number, lift = 0): P3 => [x, surfaceY(x, z) + lift, z];
    if (a.ground === 'gravel' || a.ground === 'hardpan') {
      s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material(a.ground === 'gravel' ? '#5f554c' : '#a5957c', { flatShading: true }), Array.from({ length: Math.round(mix(120, 520, mood.density)) }, () => {
        const angle = random() * 6.28, r = radius * Math.sqrt(random()) * 0.93;
        const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
        return { at: [x, duneHeight(x, z) > 0.02 ? -1 : ground.y(x, z) + 0.02, z] as P3, size: 0.08 + random() * 0.16 };
      }));
    }
    if (a.ground === 'hardpan' || a.ground === 'salt') {
      // Crack lines painted straight onto the ground map.
      const image = ground.material.map!.image as HTMLCanvasElement;
      const g = image.getContext('2d')!;
      g.strokeStyle = a.ground === 'salt' ? '#b9b5a8' : '#9c8c70';
      g.globalAlpha = 0.7;
      g.lineWidth = 1.6;
      for (let i = 0; i < 150; i++) {
        let x = random() * 512, y = random() * 512;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 3; k++) { x += (random() - 0.5) * 50; y += (random() - 0.5) * 50; g.lineTo(x, y); }
        g.stroke();
      }
      ground.material.map!.needsUpdate = true;
    }

    // Dune surfaces. The windward back and the slip face are separate meshes so the crest stays a true edge.
    const rippleStrength = { ripples: 1, smooth: 0.12, footprints: 0.55, tyres: 0.5, slumps: 0.8 }[a.surface];
    const backMap = rippleTexture(random, sand, rippleStrength, 12);
    backMap.wrapS = backMap.wrapT = THREE.RepeatWrapping;
    const backMaterial = new THREE.MeshStandardMaterial({ map: backMap, bumpMap: backMap, bumpScale: 2.5, roughness: 1 });
    const slipCanvas = document.createElement('canvas');
    slipCanvas.width = 512; slipCanvas.height = 128;
    const sg = slipCanvas.getContext('2d')!;
    const slipTone = sand.clone().multiplyScalar(0.62).lerp(new THREE.Color('#6a5a66'), 0.14);
    sg.fillStyle = `#${slipTone.getHexString()}`;
    sg.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 90; i++) {
      sg.globalAlpha = 0.06 + random() * 0.1;
      sg.fillStyle = random() < 0.5 ? `#${sand.getHexString()}` : `#${sand.clone().multiplyScalar(0.4).getHexString()}`;
      sg.fillRect(random() * 512, 0, 1 + random() * 5, 128);
    }
    const slumps: number[] = [];
    if (a.surface === 'slumps') for (let i = 0; i < 6 + Math.round(mood.wear * 6); i++) {
      const x = 80 + random() * 352, w = 10 + random() * 22;
      slumps.push(x / 512);
      sg.globalAlpha = 0.5;
      sg.fillStyle = `#${sand.clone().multiplyScalar(0.42).getHexString()}`;
      sg.beginPath(); sg.moveTo(x - w * 0.25, 0); sg.lineTo(x + w * 0.25, 0); sg.lineTo(x + w, 128); sg.lineTo(x - w, 128); sg.closePath(); sg.fill();
    }
    const slipMap = new THREE.CanvasTexture(slipCanvas);
    slipMap.colorSpace = THREE.SRGBColorSpace;
    const slipMaterial = new THREE.MeshStandardMaterial({ map: slipMap, roughness: 1 });

    const crests: THREE.Vector3[] = [];
    for (const d of dunes) {
      const NV = 80, NU = 44, ub = brinkAt(d);
      const vOf = (j: number) => { const t = (j / NV) * 2 - 1; return t < 0 ? t * d.bL : t * d.bR; };
      const kOf = (v: number) => (v < 0 ? d.kL : d.kR);
      const grid = (rows: number, point: (i: number, j: number) => [number, number, number, number, number]) => {
        const positions: number[] = [], uvs: number[] = [], index: number[] = [];
        for (let i = 0; i <= rows; i++) for (let j = 0; j <= NV; j++) { const [x, y, z, u, w] = point(i, j); positions.push(x, y, z); uvs.push(u, w); }
        for (let i = 0; i < rows; i++) for (let j = 0; j < NV; j++) {
          const p = i * (NV + 1) + j, q = p + NV + 1;
          index.push(p, q, p + 1, q, q + 1, p + 1);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(index);
        geometry.computeVertexNormals();
        return geometry;
      };
      const tile = Math.max(7, d.a * 0.5);
      s.mesh(grid(NU, (i, j) => {
        const v = vOf(j), up = mix(-d.a * 1.03, ub, (i / NU) ** 0.8);
        return [d.cx + v, dome(d, up, v), d.cz + up + kOf(v) * v * v, v / tile, up / tile];
      }), backMaterial);
      s.mesh(grid(3, (i, j) => {
        const v = vOf(j), hb = dome(d, ub, v), t = i / 3;
        const up = ub + (Math.max(hb, 0) / SLIP) * t;
        return [d.cx + v, hb > 0 ? hb * (1 - t) - 0.04 * t : hb, d.cz + up + kOf(v) * v * v, j / NV, 1 - t];
      }), slipMaterial);
      for (let j = 0; j <= NV; j++) {
        const v = vOf(j), hb = dome(d, ub, v);
        if (hb > 0.25) crests.push(new THREE.Vector3(d.cx + v, hb, d.cz + ub + kOf(v) * v * v));
      }
      if (a.surface === 'slumps') {
        const lobe = s.material(sand.clone().multiplyScalar(0.9), { roughness: 1 });
        for (const t of d === main ? slumps : []) {
          const v = vOf(t * NV), hb = dome(d, ub, v);
          if (hb < 0.6) continue;
          const z = d.cz + ub + hb / SLIP + kOf(v) * v * v;
          s.ball([hb * 0.22 + 0.4, 0.12 + hb * 0.03, hb * 0.2 + 0.4], [d.cx + v, 0.04, z + 0.1], lobe, 12);
        }
      }
    }

    // Marks on the back.
    const dent = new THREE.MeshStandardMaterial({ color: sand.clone().multiplyScalar(0.55), roughness: 1 });
    const trail = (points: [number, number][], spacing: number, size: number, stagger: number) => {
      const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
      const steps = Math.round(curve.getLength() / spacing);
      return Array.from({ length: steps }, (_unused, i) => {
        const p = curve.getPointAt(i / steps), t = curve.getTangentAt(i / steps), side = (i % 2 ? 1 : -1) * stagger;
        return { at: on(p.x + t.z * side, p.z - t.x * side, -size * 0.45), size };
      });
    };
    const crestMid = new THREE.Vector3(main.cx, main.H, main.cz + brinkAt(main));
    if (a.surface === 'footprints') {
      const x0 = main.cx + (random() - 0.5) * main.bR;
      s.scatter(new THREE.SphereGeometry(1, 6, 4), dent, trail([[x0, main.cz - main.a * 1.15], [x0 * 0.6 + 2, main.cz - main.a * 0.6], [x0 * 0.3 - 1.5, main.cz - main.a * 0.25], [main.cx + 0.5, crestMid.z - 0.2]], 0.75, 0.2, 0.22)).castShadow = false;
    } else if (a.surface === 'tyres') {
      const x0 = main.cx + (random() - 0.5) * main.bR * 0.8, x1 = main.cx + (random() - 0.5) * 4;
      const marks = [-0.85, 0.85].flatMap((offset) => trail([[x0 + offset, main.cz - main.a * 1.15], [mix(x0, x1, 0.5) + offset, main.cz - main.a * 0.55], [x1 + offset, crestMid.z - 0.1]], 0.3, 0.2, 0));
      s.scatter(new THREE.SphereGeometry(1, 6, 4), dent, marks).castShadow = false;
    }

    // What is in its path.
    const foot = (v: number, share: number) => {
      const hb = dome(main, brinkAt(main), v);
      return [main.cx + v, main.cz + brinkAt(main) + (Math.max(hb, 0) / SLIP) * share + (v < 0 ? main.kL : main.kR) * v * v] as const;
    };
    if (a.path === 'palm') {
      const [x, z] = foot((random() - 0.5) * main.bR * 0.5, 0.72);
      const y = surfaceY(x, z);
      const bark = s.material('#6f5a44', { roughness: 1 });
      const leaf = s.material(mood.wear > 0.6 ? '#8f8a52' : '#5f7a3c', { roughness: 0.9, side: THREE.DoubleSide });
      s.rod([x, 0, z], [x + 0.25, y + 1.1, z + 0.2], 0.24, bark, 0.2);
      s.ball([0.4, 0.35, 0.4], [x + 0.25, y + 1.15, z + 0.2], bark, 10);
      for (let i = 0; i < 13; i++) {
        const angle = (i / 13) * 6.28 + random() * 0.3, reach = 2.2 + random() * 1.2, droop = 0.3 + random() * 1.4;
        const frond = new THREE.PlaneGeometry(0.55, reach, 1, 6);
        frond.translate(0, reach / 2, 0);
        const p = frond.attributes.position;
        for (let k = 0; k < p.count; k++) { const t = p.getY(k) / reach; p.setZ(k, -droop * t * t); p.setX(k, p.getX(k) * (1 - t * 0.85)); }
        frond.computeVertexNormals();
        const mesh = s.mesh(frond, leaf, [x + 0.25, y + 1.3, z + 0.2]);
        mesh.rotation.set(Math.PI / 2 - 0.75, angle, 0, 'YXZ');
      }
    } else if (a.path === 'hut') {
      const [x, z0] = foot((random() - 0.5) * main.bR * 0.4, 1);
      const z = z0 - 0.4;
      const mud = s.material('#b58f66', { roughness: 1 });
      s.box([4.6, 2.9, 3.8], [x, 1.45, z], mud);
      s.box([4.9, 0.25, 4.1], [x, 2.95, z], s.material('#a17d58', { roughness: 1 }));
      s.box([0.9, 1.8, 0.1], [x - 0.8, 0.9, z + 1.9], s.material('#241a14'));
      s.box([0.6, 0.6, 0.1], [x + 1.2, 1.7, z + 1.9], s.material('#241a14'));
      for (let i = 0; i < 5; i++) s.rod([x - 1.8 + i * 0.9, 2.7, z + 1.9], [x - 1.8 + i * 0.9, 2.7, z + 2.3], 0.07, s.material('#5d4734'));
      s.ball([1.1, 0.35, 0.9], [x - 0.8, 0.05, z + 2.3], s.material(sand, { roughness: 1 }), 12);
    } else if (a.path === 'poles') {
      const wood = s.material('#5d4a3a', { roughness: 1 });
      const x0 = main.cx - main.bL * 0.9, x1 = main.cx + main.bR * 0.9, z0 = main.cz - main.a * 0.75, z1 = main.cz + brinkAt(main) + main.H / SLIP + 6;
      const tops: THREE.Vector3[] = [];
      for (let i = 0; i < 6; i++) {
        const t = i / 5, x = mix(x0, x1, t) + (random() - 0.5), z = mix(z0, z1, t), lean = (random() - 0.5) * 0.5 * mood.wear;
        const top = new THREE.Vector3(x + lean, 6.6, z);
        s.rod([x, 0, z], [top.x, top.y, top.z], 0.13, wood, 0.1);
        s.box([1.5, 0.12, 0.12], [top.x, 6.1, top.z], wood).rotation.y = Math.atan2(x1 - x0, z1 - z0);
        tops.push(top.clone().setY(6.15));
      }
      const wire = s.material('#2b2622');
      for (let i = 0; i < 5; i++) if (mood.wear < 0.7 || random() < 0.5) {
        const from = tops[i], to = tops[i + 1], midpoint = from.clone().lerp(to, 0.5).setY(5.5);
        s.tube([from.toArray() as unknown as P3, midpoint.toArray() as unknown as P3, to.toArray() as unknown as P3], 0.025, wire);
      }
    } else if (a.path === 'tent') {
      const x = main.cx + (random() - 0.5) * 3, z = main.cz + brinkAt(main) + main.H / SLIP + 2.5 + random() * 2;
      const canvasMaterial = s.material(mood.cheer > 0.6 ? '#d9703a' : '#b9a57a', { roughness: 1, side: THREE.DoubleSide });
      const prism = new THREE.CylinderGeometry(1.25, 1.25, 2.8, 3, 1);
      prism.rotateZ(Math.PI / 2);
      prism.rotateX(Math.PI / 2 + Math.PI);
      const tent = s.mesh(prism, canvasMaterial, [x, 0.6, z]);
      tent.rotation.y = 0.6 + random();
      tent.scale.y = 0.95;
      s.box([0.5, 0.35, 0.5], [x + 2.2, 0.2, z + 0.6], s.material('#4a5a6a'));
      s.cylinder(0.25, 0.3, 0.12, [x - 0.4, 0.08, z + 2.2], s.material('#2a2420'), 10);
      s.ball([0.14, 0.2, 0.14], [x - 0.4, 0.25, z + 2.2], new THREE.MeshStandardMaterial({ color: '#ff9a3c', emissive: '#ff7a1c', emissiveIntensity: 1.6 }), 8);
    } else if (a.path === 'skeleton') {
      const bone = s.material('#efe8d6', { roughness: 0.85 });
      const x = main.cx + (random() - 0.5) * main.bR, z = main.cz - main.a * 1.12, turn = random() * 6.28;
      const group = new THREE.Group();
      for (let i = 0; i < 9; i++) group.add(s.ring(0.42 - Math.abs(i - 4) * 0.035, 0.035, [0, 0.05, -0.9 + i * 0.22], bone, Math.PI));
      group.add(s.rod([0, 0.42, -1.1], [0, 0.4, 1.0], 0.05, bone), s.rod([0, 0.4, 1.0], [0.3, 0.12, 1.9], 0.045, bone));
      const skull = s.ball([0.16, 0.14, 0.3], [0.4, 0.12, 2.15], bone, 10);
      group.add(skull);
      for (const [lx, lz] of [[0.5, -0.9], [-0.55, -0.8], [0.6, 0.8], [-0.5, 0.9]]) group.add(s.rod([lx * 0.5, 0.06, lz], [lx * 2.2, 0.05, lz + (random() - 0.5)], 0.045, bone));
      group.position.set(x, ground.y(x, z) + 0.02, z);
      group.rotation.y = turn;
      group.scale.setScalar(1.25);
      s.root.add(group);
    }
    // A few shrubs on the bare ground where the scene is busy.
    const twig = s.material('#7c7350', { roughness: 1 });
    for (let i = 0; i < Math.round(mood.density * 7); i++) {
      const angle = random() * 6.28, r = radius * (0.5 + random() * 0.4), x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      if (duneHeight(x, z) > 0.02) continue;
      for (let k = 0; k < 6; k++) { const ta = random() * 6.28; s.rod([x, 0, z], [x + Math.cos(ta) * 0.5, 0.5 + random() * 0.5, z + Math.sin(ta) * 0.5], 0.035, twig, 0.01); }
    }

    // Sand smoking off the lip: a faint veil and a stream of grains, both blown downwind.
    const gust = mix(0.25, 1, mood.energy);
    const reach = mix(1, 4.5, mood.energy) * (0.6 + main.H / 9);
    if (crests.length > 2) {
      const positions: number[] = [], index: number[] = [];
      crests.forEach((c, i) => {
        for (let row = 0; row < 4; row++) { const t = row / 3; positions.push(c.x, c.y + 0.9 * t * gust - 0.5 * t * t, c.z + reach * t * mix(0.6, 1, (Math.sin(i * 0.7) + 1) / 2)); }
        if (i < crests.length - 1 && crests[i + 1].distanceTo(c) < 3) for (let row = 0; row < 3; row++) { const p = i * 4 + row; index.push(p, p + 1, p + 4, p + 1, p + 5, p + 4); }
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      const veil = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: sand.clone().lerp(new THREE.Color('#fff4dc'), 0.4), transparent: true, opacity: mix(0.05, 0.24, mood.energy), depthWrite: false, side: THREE.DoubleSide, roughness: 1 }));
      s.root.add(veil);
    }
    const count = Math.round(mix(60, 520, mood.energy));
    const grains = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: sand.clone().lerp(new THREE.Color('#fff4dc'), 0.25), roughness: 1 }), count);
    const seeds = Array.from({ length: count }, () => ({ crest: crests[Math.floor(random() * crests.length)] ?? crestMid, phase: random(), speed: 0.25 + random() * 0.5, lift: random(), side: (random() - 0.5) * 1.2, size: 0.1 + random() * 0.16 }));
    const matrix = new THREE.Matrix4();
    const blow = (time: number) => {
      seeds.forEach((seed, i) => {
        const t = (seed.phase + time * seed.speed * gust) % 1;
        const size = seed.size * (1 - t * 0.6);
        matrix.makeScale(size, size, size).setPosition(seed.crest.x + seed.side * t, seed.crest.y + 0.1 + seed.lift * 1.6 * t - 1.6 * t * t * (1.2 - seed.lift), seed.crest.z + reach * 1.6 * t);
        grains.setMatrixAt(i, matrix);
      });
      grains.instanceMatrix.needsUpdate = true;
    };
    blow(0);
    grains.frustumCulled = false;
    s.root.add(grains);
    backMap.repeat.set(1, 1);

    return s.finish({ footprint: radius * 0.85, update: (_dt, time) => blow(time) });
  },
});
