import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix } from '@conjure/kit';
import { type Bit, limb, many, mottled, paint, put, shade } from './grave';

type Curve = (t: number) => number;

export default defineThing({
  questions: {
    vegetable: choice('What has been hollowed out?', {
      turnip: 'A small white turnip with a purple crown, the oldest kind.',
      swede: 'A big knobbly yellow swede with bruised purple shoulders, the Scottish tumshie.',
      beet: 'A long dark-red mangel beet, a punkie, with a trailing root.',
      pumpkin: 'A ribbed orange pumpkin: the later American cousin, bigger and friendlier.',
    }),
    expression: choice('What face is carved in it?', {
      snarl: 'Slanted eyes and a jagged zigzag snarl.',
      grin: 'Triangle eyes and a wide gap-toothed grin.',
      howl: 'Tall hollow eyes and a round howling mouth.',
      sorrow: 'Drooping eyes and a thin downturned mouth, a mourner.',
      skull: 'Round sockets, a nose slit and a row of tombstone teeth, like a little skull.',
    }),
    candle: choice('What is the light inside doing?', {
      bright: 'A fresh candle burning steady and gold.',
      low: 'A stub burned down to a sullen red ember.',
      guttered: 'Gone out: dark holes and a thread of smoke from the lid.',
      corpse: 'Burning an unnatural pale green, a corpse light.',
    }),
    carried: choice('How is it carried or placed?', {
      string: 'Hanging by a loop of twine from a bent iron hook.',
      stick: 'Spiked on top of a stick driven into the ground.',
      ledge: 'Set down on a mossy stone ledge.',
      heap: 'Sitting on the ground among a few uncarved roots.',
    }),
    extras: choice('Has anything been added to the face?', {
      none: 'Nothing, just the carving.',
      teeth: 'Stuck-on teeth: pale pegs pushed in around the mouth.',
      straw: 'A wild shock of straw hair pushed in under the lid.',
      horns: 'Two parsnip horns pegged on above the eyes.',
      cap: 'A scrap of rag tied on as a headscarf.',
    }),
    lid: choice('What became of the lid?', {
      on: 'Sitting neatly back on top with its stalks.',
      askew: 'Tipped askew so light leaks out of the top.',
      off: 'Missing: the top is open and glowing.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const L = new THREE.Group(); // the lantern itself, origin at the base of the body
    root.add(L);
    const wear = mood.wear;

    const kind = {
      turnip: { r: 0.078, h: 0.15, pow: 0.6, skew: 1, ribs: 0, low: '#efe9d6', high: '#8a4a8f', flesh: '#f4ecc8' },
      swede: { r: 0.098, h: 0.17, pow: 0.5, skew: 0.92, ribs: 0, low: '#d9b45a', high: '#6a3d6f', flesh: '#f0d68a' },
      beet: { r: 0.07, h: 0.19, pow: 0.75, skew: 0.72, ribs: 0, low: '#8a2438', high: '#5a1830', flesh: '#c8425a' },
      pumpkin: { r: 0.14, h: 0.2, pow: 0.42, skew: 1, ribs: 0.06, low: '#e8821e', high: '#d96a14', flesh: '#f4c060' },
    }[a.vegetable];
    const sat = a.carried === 'ledge' || a.carried === 'heap';
    const u0 = sat ? 0.07 : 0.0, u1 = 0.86;
    const shrivel = wear * 0.5 + 0.08;
    const k = [random() * 6, random() * 6, random() * 6];
    const radius = (yaw: number, u: number) => {
      const base = Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(Math.min(1, Math.max(0, u * 0.96 + 0.02)), kind.skew))), kind.pow);
      const rib = kind.ribs ? 1 - kind.ribs * Math.abs(Math.sin(yaw * 5)) ** 0.6 : 1;
      const wrinkle = 1 - shrivel * 0.2 * (0.5 + 0.5 * Math.sin(yaw * 11 + Math.sin(u * 7 + k[0]) * 1.5 + k[1])) * (0.4 + 0.6 * Math.sin(Math.PI * u));
      const lump = 1 + 0.05 * Math.sin(yaw * 3 + k[2]) * Math.sin(u * 5 + k[0]);
      return kind.r * base * rib * wrinkle * lump;
    };
    const height = kind.h * (1 - wear * 0.14);
    const sag = (yaw: number, u: number) => u * height + Math.sin(yaw * 2 + k[1]) * wear * 0.006;
    const point = (yaw: number, u: number, f = 1): [number, number, number] => {
      const r = radius(yaw, u) * f;
      return [Math.sin(yaw) * r, sag(yaw, u), Math.cos(yaw) * r];
    };

    // Body: a parametric surface so the carvings can sit exactly on it.
    const NU = 22, NY = 44;
    const body = new THREE.BufferGeometry();
    const P: number[] = [], UV: number[] = [], I: number[] = [];
    for (let j = 0; j <= NU; j++) for (let i = 0; i <= NY; i++) {
      const u = u0 + (u1 - u0) * j / NU, yaw = i / NY * Math.PI * 2;
      P.push(...point(yaw, u));
      UV.push(i / NY * 3, j / NU);
    }
    for (let j = 0; j < NU; j++) for (let i = 0; i < NY; i++) {
      const p = j * (NY + 1) + i, q = p + NY + 1;
      I.push(p, p + 1, q, p + 1, q + 1, q);
    }
    body.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    body.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    body.setIndex(I);
    body.computeVertexNormals();
    // Skin: root colour below, bruised crown above, speckle and mould.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 128, 0, 0);
    const low = shade(kind.low, '#7a6a4a', wear * 0.4), high = shade(kind.high, '#4a3a3a', wear * 0.4);
    gradient.addColorStop(0, `#${low.getHexString()}`);
    gradient.addColorStop(0.5, `#${low.getHexString()}`);
    gradient.addColorStop(a.vegetable === 'pumpkin' ? 1 : 0.82, `#${high.getHexString()}`);
    gradient.addColorStop(1, `#${high.getHexString()}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const speck = (color: string, count: number, size: number, alpha: number) => {
      ctx.fillStyle = color;
      for (let i = 0; i < count; i++) { ctx.globalAlpha = alpha * (0.4 + random() * 0.6); ctx.beginPath(); ctx.ellipse(random() * 128, random() * 128, size * (0.4 + random()), size * (0.3 + random() * 0.6), random() * 3, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    };
    speck('#5a4630', 40, 2.2, 0.5);
    speck('#3d4a2c', Math.round(wear * 26), 9, 0.55);
    speck('#d8e0d0', Math.round(wear * 14), 5, 0.5);
    speck('#2a2018', Math.round(wear * 12), 6, 0.5);
    const skinMap = new THREE.CanvasTexture(canvas);
    skinMap.colorSpace = THREE.SRGBColorSpace;
    skinMap.wrapS = THREE.RepeatWrapping;
    const skin = paint('#ffffff', { map: skinMap, roughness: 0.75, side: THREE.DoubleSide });
    put(L, body, skin);
    const fleshTone = shade(kind.flesh, '#6a5030', wear * 0.5);
    const flesh = paint(fleshTone, { roughness: 0.8, side: THREE.DoubleSide });

    // The light inside.
    const flame = { bright: '#ffb82e', low: '#e0401a', guttered: '#241812', corpse: '#8dffb0' }[a.candle];
    const power = { bright: 2.4, low: 1.0, guttered: 0, corpse: 2.0 }[a.candle] * mix(0.8, 1.25, mood.energy);
    const glow = new THREE.MeshStandardMaterial({ color: a.candle === 'guttered' ? '#1c130e' : flame, emissive: flame, emissiveIntensity: power, roughness: 1, side: THREE.DoubleSide });

    // A carved opening: a ribbon lying on the surface between two curves, with a rim of cut flesh.
    const carve = (yawA: number, yawB: number, topU: Curve, bottomU: Curve, material: THREE.Material, f: number, grow = 0, n = 28) => {
      const g = new THREE.BufferGeometry();
      const v: number[] = [], idx: number[] = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, yaw = mix(yawA, yawB, t) + (t - 0.5) * grow * 6 * Math.sign(yawB - yawA);
        const top = topU(t) + grow, bottom = bottomU(t) - grow;
        v.push(...point(yaw, Math.max(top, bottom), f), ...point(yaw, Math.min(top, bottom), f));
        if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      const mesh = put(L, g, material);
      mesh.castShadow = false;
      return mesh;
    };
    const hole = (yawA: number, yawB: number, top: Curve, bottom: Curve, n = 28) => {
      carve(yawA, yawB, top, bottom, flesh, 1.012, 0.014, n);
      carve(yawA, yawB, top, bottom, glow, 1.03, 0, n);
    };
    const arc = (t: number) => Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
    const bow = (t: number) => (2 * t - 1) ** 2;
    const zig = (t: number, n: number) => Math.abs(((t * n) % 1) - 0.5) * 2;
    const droop = wear * 0.02;

    // Eyes: t runs from the inner corner outward.
    for (const s of [-1, 1]) {
      const inner = s * 0.16, outer = s * 0.62;
      if (a.expression === 'snarl') hole(inner, outer, (t) => 0.6 + 0.15 * t - droop, (t) => 0.575 + 0.03 * t - droop);
      else if (a.expression === 'grin') hole(inner, outer, (t) => 0.58 + 0.15 * (1 - Math.abs(2 * t - 1)), () => 0.575);
      else if (a.expression === 'howl') hole(s * 0.2, s * 0.56, (t) => 0.65 + 0.1 * arc(t), (t) => 0.65 - 0.1 * arc(t) - droop);
      else if (a.expression === 'sorrow') hole(inner, s * 0.66, (t) => 0.715 - 0.1 * t, (t) => 0.66 - 0.13 * t - droop * (1 - t) - 0.02 * arc(t));
      else hole(s * 0.16, s * 0.6, (t) => 0.645 + 0.085 * arc(t), (t) => 0.645 - 0.085 * arc(t));
    }
    // Nose.
    if (a.expression === 'skull') for (const s of [-1, 1]) hole(s * 0.015, s * 0.1, (t) => 0.52 - 0.02 * t, (t) => 0.52 - 0.09 * t, 6);
    else if (a.expression !== 'howl') hole(-0.1, 0.1, (t) => 0.45 + 0.07 * (1 - Math.abs(2 * t - 1)), () => 0.445, 8);
    // Mouth.
    const teeth: { t: number; up: boolean }[] = [];
    let mouthTop: Curve, mouthBottom: Curve, mouthHalf = 0.8;
    if (a.expression === 'snarl') {
      const mid: Curve = (t) => 0.31 - 0.08 * bow(t);
      mouthTop = (t) => mid(t) + (0.012 + 0.05 * zig(t, 7)) * arc(t) ** 0.5;
      mouthBottom = (t) => mid(t) - (0.012 + 0.05 * zig(t + 0.07, 7)) * arc(t) ** 0.5;
    } else if (a.expression === 'grin') {
      const mid: Curve = (t) => 0.24 + 0.13 * bow(t);
      mouthTop = (t) => mid(t) + 0.055 * arc(t);
      mouthBottom = (t) => mid(t) - 0.03 * arc(t);
      for (const t of [0.2 + random() * 0.08, 0.5 + (random() - 0.5) * 0.1, 0.74 + random() * 0.08]) teeth.push({ t, up: random() < 0.6 });
      teeth.push({ t: 0.35 + random() * 0.05, up: false });
    } else if (a.expression === 'howl') {
      mouthHalf = 0.36;
      mouthTop = (t) => 0.29 + 0.12 * arc(t);
      mouthBottom = (t) => 0.29 - 0.13 * arc(t);
    } else if (a.expression === 'sorrow') {
      const mid: Curve = (t) => 0.33 - 0.11 * bow(t);
      mouthTop = (t) => mid(t) + 0.022 * arc(t) + 0.006;
      mouthBottom = (t) => mid(t) - 0.022 * arc(t) - 0.006;
      mouthHalf = 0.66;
    } else {
      mouthTop = (t) => 0.34 - 0.03 * bow(t) + 0.0 * t;
      mouthBottom = (t) => 0.23 + 0.03 * bow(t);
      mouthHalf = 0.7;
      for (let i = 1; i < 8; i++) teeth.push({ t: i / 8, up: true }, { t: i / 8, up: false });
    }
    hole(-mouthHalf, mouthHalf, mouthTop, (t) => mouthBottom(t) - droop * arc(t), 56);
    // Uncarved teeth left standing in the mouth.
    for (const tooth of teeth) {
      const w = a.expression === 'skull' ? 0.022 : 0.05, yaw = mix(-mouthHalf, mouthHalf, tooth.t);
      const top = mouthTop(tooth.t), bottom = mouthBottom(tooth.t), half = (top - bottom) * (a.expression === 'skull' ? 0.5 : 0.55);
      carve(yaw - w, yaw + w, () => (tooth.up ? top + 0.01 : bottom + half), () => (tooth.up ? top - half : bottom - 0.01), flesh, 1.045, 0, 2);
    }

    // The cut top, the hollow and the lid.
    const topY = u1 * height, topR = radius(0, u1);
    put(L, new THREE.CircleGeometry(topR * 0.86, 24), a.lid === 'on' ? flesh : glow, [0, topY - 0.004, 0], [-Math.PI / 2, 0, 0]).castShadow = false;
    put(L, new THREE.TorusGeometry(topR * 0.93, topR * 0.09, 6, 28), flesh, [0, topY, 0], [Math.PI / 2, 0, 0]);
    const lid = new THREE.Group();
    const stalk = paint(shade(a.vegetable === 'pumpkin' ? '#6a6a34' : '#8aa058', '#5a4a30', wear * 0.7));
    if (a.lid !== 'off') {
      lid.position.set(a.lid === 'askew' ? topR * 0.45 : 0, topY + 0.004 + (a.lid === 'askew' ? topR * 0.2 : 0), a.lid === 'askew' ? -topR * 0.2 : 0);
      lid.rotation.set(a.lid === 'askew' ? -0.25 : (random() - 0.5) * 0.1, random() * 6, a.lid === 'askew' ? -0.5 : (random() - 0.5) * 0.1);
      L.add(lid);
      put(lid, new THREE.SphereGeometry(1, 22, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(high, { roughness: 0.75 }), [0, 0, 0], [0, 0, 0], [topR * 1.02, kind.h * 0.15, topR * 1.02]);
      put(lid, new THREE.CircleGeometry(topR, 22), flesh, [0, 0, 0], [Math.PI / 2, 0, 0]);
      if (a.vegetable === 'pumpkin') limb(lid, [0, kind.h * 0.13, 0], [0.012, kind.h * 0.13 + 0.05, 0.006], 0.016, 0.01, stalk, 6);
      else for (let i = 0; i < 5; i++) {
        const t = i * 1.3;
        limb(lid, [Math.cos(t) * 0.012, kind.h * 0.12, Math.sin(t) * 0.012], [Math.cos(t) * 0.03, kind.h * 0.12 + 0.03 + random() * 0.03, Math.sin(t) * 0.03], 0.008, 0.005, stalk, 5);
      }
    }
    // Scorch on the lid rim and a candle stub seen through the top.
    put(L, new THREE.CylinderGeometry(0.012, 0.014, 0.03, 8), paint('#efe6c8'), [0, u0 * height + 0.02, 0]);

    // Root tail.
    if (!sat) {
      const tail = a.vegetable === 'beet' ? 0.11 : 0.05;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.012, 0), new THREE.Vector3(0.006, -tail * 0.5, 0.004), new THREE.Vector3((random() - 0.5) * 0.05, -tail, (random() - 0.5) * 0.03)]);
      const g = new THREE.TubeGeometry(curve, 10, 0.012, 6);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const t = Math.min(1, Math.max(0, (0.012 - pos.getY(i)) / (tail + 0.012)));
        const c = curve.getPoint(t);
        pos.setXYZ(i, c.x + (pos.getX(i) - c.x) * (1 - t * 0.9), pos.getY(i), c.z + (pos.getZ(i) - c.z) * (1 - t * 0.9));
      }
      g.computeVertexNormals();
      if (a.carried !== 'stick') put(L, g, paint(low, { roughness: 0.8 }));
    }

    // Extras.
    if (a.extras === 'teeth') {
      const peg = paint('#f0ead2', { roughness: 0.4 });
      for (let i = 0; i < 9; i++) {
        const t = 0.1 + 0.8 * i / 8, up = i % 2 === 0;
        const yaw = mix(-mouthHalf, mouthHalf, t), u = up ? mouthTop(t) + 0.012 : mouthBottom(t) - 0.012;
        const p = point(yaw, u, 1.0);
        const cone = put(L, new THREE.ConeGeometry(0.0065, 0.03 + random() * 0.012, 5), peg, p);
        cone.lookAt(p[0] * 2.2, p[1] + (up ? -0.09 : 0.09), p[2] * 2.2);
        cone.rotateX(Math.PI / 2);
      }
    } else if (a.extras === 'straw') {
      const bits: Bit[] = [];
      for (let i = 0; i < 70; i++) {
        const yaw = random() * Math.PI * 2, tip = 0.5 + random() * 0.7, len = (0.07 + random() * 0.09) * (kind.r / 0.08);
        bits.push({ p: [Math.sin(yaw) * topR * 0.85, topY, Math.cos(yaw) * topR * 0.85], r: [tip * Math.cos(yaw), 0, -tip * Math.sin(yaw)], s: [0.0035, len, 0.0035], c: ['#e3c462', '#cfa844', '#f0dc8c'][i % 3] });
      }
      const straw = new THREE.CylinderGeometry(0.6, 1, 1, 4);
      straw.translate(0, 0.5, 0);
      many(L, straw, paint('#ffffff', { roughness: 0.8 }), bits);
    } else if (a.extras === 'horns') {
      for (const s of [-1, 1]) {
        const p = point(s * 0.55, 0.8, 0.95);
        const horn = put(L, new THREE.ConeGeometry(kind.r * 0.2, kind.r * 1.1, 8), paint('#e9dfb8', { roughness: 0.7 }), [p[0], p[1] + kind.r * 0.35, p[2]], [0.15, 0, -s * 0.5]);
        horn.castShadow = true;
      }
    } else if (a.extras === 'cap') {
      const rag = paint(shade(mood.cheer > 0.5 ? '#b83a3a' : '#4a5a6a', '#5a4a3a', wear * 0.5), { side: THREE.DoubleSide, roughness: 0.95 });
      const g = new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, 1.05);
      put(L, g, rag, [0, height * 0.52, -kind.r * 0.12], [-0.35, 0, 0], [kind.r * 1.1, height * 0.56, kind.r * 1.12]);
      const knot = point(0, 0.12, 1.02);
      put(L, new THREE.SphereGeometry(0.014, 8, 6), rag, [knot[0], knot[1], knot[2] + 0.004]);
      for (const s of [-1, 1]) {
        limb(L, point(s * 1.25, 0.5, 1.05), [knot[0], knot[1], knot[2] + 0.004], 0.008, 0.006, rag, 5);
        limb(L, [knot[0], knot[1], knot[2] + 0.004], [s * 0.03, knot[1] - 0.045, knot[2] + 0.012], 0.007, 0.012, rag, 5);
      }
    }

    // How it is carried.
    const iron = paint(shade('#3a3a3e', '#6a4a30', wear * 0.6), { metalness: 0.6, roughness: 0.6 });
    const wood = paint(shade('#8a6a44', '#4a3c2c', wear * 0.5), { flatShading: true });
    const twine = paint('#b89a5a');
    const stone = paint(shade('#9a9a92', '#6a7058', wear * 0.6), { roughness: 1 });
    const smokeAt = new THREE.Vector3(0, topY, 0);
    if (a.carried === 'string') {
      const hang = 0.34, tail = a.vegetable === 'beet' ? 0.11 : 0.05;
      L.position.set(0.16, tail + 0.03, 0);
      L.rotation.z = (random() - 0.5) * 0.12;
      const px = 0.16 - kind.r - 0.06;
      const top = L.position.y + topY + 0.07 + kind.r * 0.4;
      for (const s of [-1, 1]) limb(L, point(s * Math.PI / 2, 0.74, 1.0), [0, topY + 0.07 + kind.r * 0.4 - 0.01, 0], 0.003, 0.003, twine, 4);
      const crook = new THREE.CatmullRomCurve3([new THREE.Vector3(px, -0.12, 0), new THREE.Vector3(px, top * 0.6, 0), new THREE.Vector3(px + 0.01, top + 0.03, 0), new THREE.Vector3((px + 0.16) / 2, top + 0.07, 0), new THREE.Vector3(0.14, top + 0.045, 0), new THREE.Vector3(0.165, top, 0), new THREE.Vector3(0.14, top - 0.025, 0)]);
      put(root, new THREE.TubeGeometry(crook, 40, 0.009, 6), iron);
      put(root, new THREE.CylinderGeometry(0.02, 0.03, 0.02, 10), iron, [px, 0.01, 0]);
      void hang;
    } else if (a.carried === 'stick') {
      const tall = 0.2 + random() * 0.08;
      L.position.set(0, tall, 0);
      L.rotation.set(0.06, 0, (random() - 0.5) * 0.25);
      limb(root, [0.01, -0.1, 0], [0, tall + height * 0.2, 0], 0.014, 0.011, wood, 6);
      limb(root, [0, tall * 0.5, 0], [0.05, tall * 0.62, 0.01], 0.006, 0.003, wood, 5);
    } else if (a.carried === 'ledge') {
      const w = kind.r * 3.1;
      put(root, new THREE.BoxGeometry(w, 0.07, kind.r * 2.5), stone, [0, 0.035, 0]);
      put(root, new THREE.BoxGeometry(w * 0.9, 0.05, kind.r * 2.2), stone, [0, -0.02, 0]);
      L.position.set(-w * 0.1, 0.07 - u0 * height, 0);
      const moss: Bit[] = [];
      for (let i = 0; i < Math.round(mix(6, 40, wear)); i++) moss.push({ p: [(random() - 0.5) * w, 0.07, (random() - 0.5) * kind.r * 2.3], s: [0.01 + random() * 0.02, 0.006, 0.01 + random() * 0.02], c: ['#5a7a3a', '#7a8a40', '#4a6030'][i % 3] });
      many(root, new THREE.SphereGeometry(1, 6, 4), paint('#ffffff', { roughness: 1 }), moss);
      // Wax and a coin or two left for the dead.
      put(root, new THREE.CylinderGeometry(0.014, 0.014, 0.003, 12), paint('#b08a3a', { metalness: 0.8, roughness: 0.35 }), [w * 0.36, 0.072, 0.04]);
      put(root, new THREE.CylinderGeometry(0.012, 0.012, 0.003, 12), paint('#b08a3a', { metalness: 0.8, roughness: 0.35 }), [w * 0.4, 0.072, -0.02]);
    } else {
      L.position.set(0, -u0 * height, 0);
      const spare = 2 + Math.round(mood.density * 3);
      for (let i = 0; i < spare; i++) {
        const t = 2.2 + i * 0.9 + random() * 0.3, d = kind.r * (1.7 + random() * 0.5), r = kind.r * (0.4 + random() * 0.25);
        const veg = new THREE.Group();
        veg.position.set(Math.cos(t) * d, r * 0.85, -Math.sin(t) * d);
        veg.rotation.set(random() * 1.5, random() * 6, random() * 1.5);
        root.add(veg);
        put(veg, new THREE.SphereGeometry(1, 14, 10), skin, [0, 0, 0], [0, 0, 0], [r, r * 0.95, r]);
        put(veg, new THREE.ConeGeometry(r * 0.25, r * 0.9, 6), paint(low), [0, -r * 1.2, 0], [Math.PI, 0, 0]);
        for (let j = 0; j < 3; j++) limb(veg, [0, r * 0.9, 0], [(j - 1) * r * 0.5, r * 1.9, (random() - 0.5) * r], r * 0.1, r * 0.05, stalk, 4);
      }
      // The scooped-out flesh and the spoon that did it.
      for (let i = 0; i < 9; i++) put(root, new THREE.SphereGeometry(1, 6, 4), flesh, [kind.r * 1.5 + random() * 0.06, 0.006, (random() - 0.3) * 0.12], [0, random() * 3, 0], [0.012 + random() * 0.012, 0.006, 0.01]);
    }
    L.updateMatrixWorld(true);
    smokeAt.applyMatrix4(L.matrixWorld);

    let smoke: THREE.Mesh | null = null;
    if (a.candle === 'guttered') {
      const path = new THREE.CatmullRomCurve3([smokeAt.clone(), smokeAt.clone().add(new THREE.Vector3(0.012, 0.05, 0)), smokeAt.clone().add(new THREE.Vector3(-0.014, 0.1, 0.008)), smokeAt.clone().add(new THREE.Vector3(0.02, 0.16, 0))]);
      smoke = put(root, new THREE.TubeGeometry(path, 16, 0.006, 5), new THREE.MeshStandardMaterial({ color: '#9a9a9a', transparent: true, opacity: 0.4, depthWrite: false }));
      smoke.castShadow = false;
    }

    const energy = mood.energy;
    const swing = a.carried === 'string';
    const restZ = L.rotation.z;
    return {
      object: root,
      update(_dt, time) {
        if (power > 0) glow.emissiveIntensity = power * (0.82 + 0.18 * Math.sin(time * (5 + energy * 14)) * Math.sin(time * 2.3 + 1) * (0.4 + energy));
        if (swing) L.rotation.z = restZ + Math.sin(time * (1 + energy * 2)) * 0.05 * (0.3 + energy);
        if (smoke) (smoke.material as THREE.MeshStandardMaterial).opacity = 0.3 + 0.12 * Math.sin(time * 1.3);
      },
      dispose: () => disposeTree(root),
    };
  },
});
