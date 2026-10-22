import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { glass, paint } from './lab';
import { cord, eyeTexture, headForm, makeEar, makeEye, mountEar } from './head';

const KINDS = {
  emerald: ['#3aa048', '#1a5a2a', '#ffd21c'],
  banded: ['#18181a', '#dba520', '#ff5a2a'],
  coral: ['#cf2a1e', '#f3ecd4', '#141414'],
  albino: ['#f1e8d2', '#e2b3a0', '#e0202a'],
} as const;

/** A tapering banded tube with a snake's head on the end, all one geometry. */
function snake(points: THREE.Vector3[], radius: number, a: THREE.Color, b: THREE.Color, eye: THREE.Color, o: { bands?: number; head?: boolean; taper?: number; stump?: THREE.Color } = {}) {
  const curve = new THREE.CatmullRomCurve3(points);
  const segs = Math.max(10, points.length * 5), around = 7;
  const frames = curve.computeFrenetFrames(segs, false);
  const position: number[] = [], normal: number[] = [], colour: number[] = [], index: number[] = [];
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  const bands = o.bands ?? 9, taper = o.taper ?? 0.5;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, p);
    const r = radius * (1 - taper * t) * (o.head === false && !o.stump && t > 0.9 ? (1 - t) * 10 : 1);
    const tint = o.stump && i === segs ? o.stump : Math.floor(t * bands * 2) % 2 ? b : a;
    for (let j = 0; j < around; j++) {
      const ang = (j / around) * Math.PI * 2;
      n.copy(frames.normals[i]).multiplyScalar(Math.cos(ang)).addScaledVector(frames.binormals[i], Math.sin(ang));
      position.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
      normal.push(n.x, n.y, n.z);
      colour.push(tint.r, tint.g, tint.b);
    }
  }
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < around; j++) {
      const p0 = i * around + j, p1 = i * around + ((j + 1) % around), q0 = p0 + around, q1 = p1 + around;
      index.push(p0, p1, q0, p1, q1, q0);
    }
  const body = new THREE.BufferGeometry();
  body.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  body.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  body.setAttribute('color', new THREE.Float32BufferAttribute(colour, 3));
  body.setIndex(index);
  const parts = [body];
  const paintAll = (geometry: THREE.BufferGeometry, tint: THREE.Color) => {
    const count = geometry.attributes.position.count, values = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) tint.toArray(values, i * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(values, 3));
    geometry.deleteAttribute('uv');
    return geometry;
  };
  const tipR = radius * (1 - taper);
  const frame = new THREE.Matrix4().makeBasis(frames.binormals[segs], frames.normals[segs], frames.tangents[segs]).setPosition(curve.getPointAt(1));
  if (o.head !== false) {
    const skull = paintAll(new THREE.SphereGeometry(1, 10, 8), a);
    skull.applyMatrix4(new THREE.Matrix4().makeScale(tipR * 1.75, tipR * 1.15, tipR * 2.5).setPosition(0, 0, tipR * 1.3));
    parts.push(skull.applyMatrix4(frame));
    for (const side of [-1, 1]) {
      const bead = paintAll(new THREE.SphereGeometry(tipR * 0.42, 6, 5), eye);
      bead.translate(side * tipR * 1.15, tipR * 0.75, tipR * 2.1);
      parts.push(bead.applyMatrix4(frame));
    }
  } else if (o.stump) {
    const cap = paintAll(new THREE.SphereGeometry(tipR, 7, 5), o.stump);
    cap.scale(1, 1, 0.4);
    parts.push(cap.applyMatrix4(frame));
  }
  const merged = mergeGeometries(parts.map((part) => (part.index ? part : part)), false)!;
  for (const part of parts) part.dispose();
  return merged;
}

export default defineThing({
  questions: {
    snakes: choice('What are the snakes doing?', {
      writhing: 'Writhing outward in every direction, heads raised and tasting the air.',
      asleep: 'Asleep: draped limp down the sides of her head like heavy hair.',
      stone: 'Half of them already turned to grey stone, stiff among the living ones.',
      cut: 'Several hacked off short, leaving raw stumps among the survivors.',
    }),
    kind: choice('What kind of snakes are they?', {
      emerald: 'Bright emerald tree vipers with gold eyes.',
      banded: 'Black snakes ringed with gold.',
      coral: 'Red and cream coral snakes, a warning.',
      albino: 'Pale albino snakes with red eyes.',
    }),
    eyes: choice('What about her eyes?', {
      glowing: 'Open and glowing, slit-pupilled: the gaze that kills.',
      shut: 'Closed, lids lowered.',
      blindfold: 'Bound with a cloth blindfold for everyone\'s safety.',
      glasses: 'Hidden behind small round mirrored glasses.',
    }),
    expression: choice('What is her expression?', {
      fury: 'Fury: brows down, mouth open, fangs showing.',
      grief: 'Grief: brows lifted, mouth turned down, a tear track.',
      boredom: 'Boredom: a flat mouth and a tilted head, centuries of this.',
      sly: 'Sly: one brow raised and a crooked half smile.',
    }),
    skin: choice('What is she made of?', {
      living: 'Living flesh, pale green with scales at the edges.',
      bronze: 'Cast bronze gone green with verdigris, snakes and all.',
      marble: 'White veined marble, a carved warning.',
    }),
    kept: choice('How is she kept?', {
      pedestal: 'As a classical bust with shoulders, on a turned pedestal.',
      dish: 'Severed, upright on a silver platter.',
      cloche: 'Under a tall glass cloche on a wooden base, a collector\'s piece.',
      free: 'Free: her neck runs down into her own coiled serpent body.',
    }),
    beside: choice('What lies beside her?', {
      nothing: 'Nothing.',
      sparrow: 'A small bird turned to stone mid-hop.',
      mirror: 'A cracked hand mirror.',
      sword: 'A short bronze sword left leaning against the base.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const sculpture = a.skin !== 'living';
    const baseTone = { living: '#a9c08f', bronze: '#7d5a34', marble: '#ebe7de' }[a.skin];
    const metal = a.skin === 'bronze' ? 0.7 : 0;
    const rough = { living: 0.6, bronze: 0.42, marble: 0.38 }[a.skin];
    const head = headForm({ w: 0.07, h: 0.105, d: 0.085, jaw: 0.6, brow: 0.3, nose: 0.6, socket: 0.55, cheek: 0.65, chin: 0.5, lips: 0.8 });

    const skinMap = paint(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = baseTone; ctx.fillRect(0, 0, w, h);
      if (a.skin === 'living') {
        // Scales creep in from the hairline, jaw and neck.
        ctx.strokeStyle = 'rgba(40,90,50,0.55)'; ctx.lineWidth = 2;
        for (let i = 0; i < 520; i++) {
          const x = random() * w, y = random() * h, fx = Math.abs(x / w - 0.5) * 2;
          const edge = Math.max(fx * 1.5 - 0.2, 1 - y / (h * 0.3), (y - h * 0.68) / (h * 0.2));
          if (random() > edge) continue;
          ctx.beginPath(); ctx.arc(x, y, 7, 0.1, Math.PI - 0.1); ctx.stroke();
        }
        for (const ex of [-0.36, 0.36]) {
          const [u, v] = head.uv(ex, 0.07);
          const g = ctx.createRadialGradient(u * w, v * h, 3, u * w, v * h, 42);
          g.addColorStop(0, 'rgba(50,30,80,0.7)'); g.addColorStop(1, 'rgba(50,30,80,0)');
          ctx.fillStyle = g; ctx.fillRect(u * w - 44, v * h - 44, 88, 88);
        }
      } else if (a.skin === 'bronze') {
        for (let i = 0; i < 150 + mood.wear * 260; i++) {
          const x = random() * w, y = random() * h, r = 6 + random() * 28;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, `rgba(96,190,160,${0.25 + mood.wear * 0.4})`); g.addColorStop(1, 'rgba(96,190,160,0)');
          ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
      } else {
        ctx.strokeStyle = 'rgba(120,125,135,0.5)';
        for (let i = 0; i < 14; i++) {
          let x = random() * w, y = random() * h;
          ctx.lineWidth = 1 + random() * 2; ctx.beginPath(); ctx.moveTo(x, y);
          for (let k = 0; k < 9; k++) { x += (random() - 0.3) * 60; y += (random() - 0.5) * 50; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
    });
    const skin = new THREE.MeshStandardMaterial({ map: skinMap, roughness: rough, metalness: metal });
    const tone = (factor: number, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(baseTone).multiplyScalar(factor), roughness: rough, metalness: metal, ...options });
    const flat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6, ...options });

    const skull = new THREE.Group();
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = skull) => {
      node.traverse((child) => { if ((child as THREE.Mesh).isMesh) child.castShadow = child.receiveShadow = true; });
      parent.add(node);
      return node;
    };
    add(new THREE.Mesh(head.grid(), skin));

    // Face.
    const curve = { fury: -0.5, grief: -0.9, boredom: -0.05, sly: 0.5 }[a.expression];
    const gap = a.expression === 'fury' ? 0.2 : 0;
    const half = 0.27;
    const skew = a.expression === 'sly' ? 0.045 : 0;
    const lipY = (x: number, sign: number) => -0.5 + curve * 0.08 * (x / half) ** 2 + skew * (x / half) + sign * (0.014 + gap * 0.5 * (1 - (x / half) ** 2));
    const lipPath = (sign: number) => Array.from({ length: 11 }, (_u, i) => { const x = mix(-half, half, i / 10); return head.face(x, lipY(x, sign), 0.001); });
    const lips = sculpture ? tone(0.72) : flat('#6a2440', { roughness: 0.4 });
    add(cord(lipPath(1), 0.0048, lips));
    add(cord(lipPath(-1), 0.0056, lips));
    if (gap) {
      const xOf = (az: number) => THREE.MathUtils.clamp(Math.sin(az) * 0.86, -half, half);
      add(new THREE.Mesh(head.grid({ az: [-0.33, 0.33], nu: 12, nv: 3, lift: 0.0006, top: (az) => Math.acos(lipY(xOf(az), 1)), bottom: (az) => Math.acos(lipY(xOf(az), -1)) }), sculpture ? tone(0.3) : flat('#240a12')));
      for (const sx of [-1, 1]) {
        const root = head.face(sx * 0.13, lipY(sx * 0.13, 1) - 0.02, 0.002);
        const fang = add(new THREE.Mesh(new THREE.ConeGeometry(0.0042, 0.022, 6), sculpture ? tone(1.15) : flat('#f4efdc', { roughness: 0.3 })));
        fang.position.copy(root.p).add(new THREE.Vector3(0, -0.009, 0)); fang.rotation.x = Math.PI;
      }
    }
    const browTone = sculpture ? tone(0.7) : flat('#22331f');
    const tilt = { fury: 0.13, grief: -0.15, boredom: 0, sly: 0 }[a.expression];
    [-1, 1].forEach((sx) => {
      const raise = a.expression === 'sly' && sx > 0 ? 0.09 : 0;
      add(cord([0.14, 0.28, 0.42, 0.55].map((x, i) => head.face(sx * x, 0.23 + raise + tilt * (1 - i / 3) + Math.sin((i / 3) * Math.PI) * 0.04 - (i === 3 ? 0.03 : 0), 0.002)), 0.0036, browTone));
    });
    const lidMaterial = sculpture ? tone(0.92) : flat('#7f9a78');
    const slit = sculpture ? null : eyeTexture('slit', '#f6ff9a', '#b6d81c', 0.2, random, '#f0f2c8');
    const openness = a.eyes === 'glowing' ? ({ fury: 0.95, grief: 0.6, boredom: 0.42, sly: 0.6 }[a.expression]) : 0;
    const eyes = a.eyes === 'blindfold' ? [] : [-1, 1].map((sx) => {
      const spot = head.face(sx * 0.36, 0.07);
      const eye = makeEye(0.0165, a.eyes === 'glowing' ? slit : null, lidMaterial, openness * (a.expression === 'sly' && sx < 0 ? 0.7 : 1), a.eyes === 'glowing' ? (sculpture ? 0 : 1.3) : 0, sculpture ? new THREE.Color(baseTone).multiplyScalar(1.1) : '#efe9da');
      if (sculpture && a.eyes === 'glowing') { const m = eye.globe.material as THREE.MeshStandardMaterial; m.emissive.set(a.skin === 'bronze' ? '#b8ff5a' : '#ffe9a0'); m.emissiveIntensity = 0.9; }
      eye.group.position.copy(spot.p).addScaledVector(spot.n, -0.0085);
      eye.group.rotation.y = sx * 0.14;
      add(eye.group);
      return eye;
    });
    if (a.eyes === 'blindfold') {
      const cloth = flat(mood.cheer > 0.6 ? '#b83a4a' : '#5a1a26', { roughness: 0.9, side: THREE.DoubleSide });
      add(new THREE.Mesh(head.grid({ nv: 3, lift: 0.004, top: () => 1.36, bottom: () => 1.64 }), cloth));
      for (let i = 0; i < 2; i++) { const tail = add(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.07 + i * 0.02, 0.002), cloth)); const knot = head.surf(Math.PI - 0.15 + i * 0.3, 1.5, 0.006); tail.position.copy(knot.p).add(new THREE.Vector3(0, -0.04, 0)); tail.rotation.z = (i - 0.5) * 0.5; }
    } else if (a.eyes === 'glasses') {
      const mirror = new THREE.MeshStandardMaterial({ color: '#dfe9f2', metalness: 1, roughness: 0.06, emissive: '#7fa6c8', emissiveIntensity: 0.35 });
      const wire = flat('#c9a23a', { metalness: 0.9, roughness: 0.3 });
      const lensAt = [-1, 1].map((sx) => {
        const spot = head.face(sx * 0.36, 0.07, 0.014);
        const lens = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.002, 24), mirror));
        lens.position.copy(spot.p); lens.position.z = head.face(0.36, 0.07, 0.016).p.z; lens.rotation.x = Math.PI / 2;
        const rim = add(new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0016, 6, 28), wire)); rim.position.copy(lens.position);
        const hinge = head.surf(sx * 1.45, 1.42, 0.004);
        add(cord([{ p: lens.position.clone().add(new THREE.Vector3(sx * 0.02, 0, 0)), n: spot.n }, hinge], 0.0012, wire));
        return lens.position;
      });
      add(cord([{ p: lensAt[0].clone().add(new THREE.Vector3(0.02, 0.004, 0)), n: new THREE.Vector3(0, 0, 1) }, { p: new THREE.Vector3(0, lensAt[0].y + 0.01, lensAt[0].z + 0.004), n: new THREE.Vector3(0, 0, 1) }, { p: lensAt[1].clone().add(new THREE.Vector3(-0.02, 0.004, 0)), n: new THREE.Vector3(0, 0, 1) }], 0.0013, wire));
    }
    if (a.expression === 'grief' && a.eyes !== 'glasses') {
      const wet = sculpture ? tone(0.6) : new THREE.MeshStandardMaterial({ color: '#d6efff', roughness: 0.05, emissive: '#9fd0ff', emissiveIntensity: 0.5 });
      const path = [-0.02, -0.12, -0.24, -0.36].map((y, i) => head.face(0.4 + i * 0.012, y, 0.0012));
      add(cord(path, 0.002, wet));
      add(new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), wet)).position.copy(path[3].p);
    }
    for (const sx of [-1, 1]) {
      const spot = head.surf(sx * 1.58, 1.5);
      add(mountEar(makeEar(0.05, tone(1), tone(0.6), sculpture ? 0 : 0.35), spot.p.addScaledVector(spot.n, -0.004), sx, 0.5));
    }

    // The nest of snakes.
    const stone = [new THREE.Color('#a3a39c'), new THREE.Color('#85857f'), new THREE.Color('#6b6b66')];
    const kind = a.skin === 'bronze' ? ['#7d5a34', '#58b09a', '#c9a23a'] : a.skin === 'marble' ? ['#ebe7de', '#cbc5b9', '#b9b3a6'] : KINDS[a.kind];
    const live = kind.map((value) => new THREE.Color(value));
    const scaly = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: sculpture ? rough : 0.4, metalness: metal });
    const hairline = (az: number) => mix(0.82, 1.5, Math.min(1, Math.max(0, (Math.abs(az) - 0.95) / 0.35)));
    add(new THREE.Mesh(head.grid({ nv: 10, lift: 0.003, bottom: hairline }), flat(live[0].clone().multiplyScalar(0.55), { roughness: rough, metalness: metal })));
    const reach = a.kept === 'cloche' ? 0.62 : 1;
    const count = Math.round(mix(15, 28, mood.density));
    const nest: { group: THREE.Group; amp: number; phase: number; speed: number }[] = [];
    const inside = new THREE.Vector3();
    const pieces: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const az = ((i + random()) / count - 0.5) * Math.PI * 2;
      const theta = mix(0.15, hairline(az) - 0.06, Math.sqrt(random()));
      const root = head.surf(az, theta);
      const petrified = a.snakes === 'stone' && i % 2 === 0;
      const stump = a.snakes === 'cut' && i % 5 < 2;
      const limp = a.snakes === 'asleep';
      const length = (stump ? 0.03 + random() * 0.025 : mix(0.11, 0.19, random())) * reach * (limp ? 0.95 : 1);
      const steps = stump ? 3 : 8;
      const dir = root.n.clone(), pos = root.p.clone().addScaledVector(root.n, -0.008);
      const points = [new THREE.Vector3(0, 0, 0).addScaledVector(root.n, -0.008)];
      const perp = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).cross(root.n).normalize();
      const phase = random() * 6, wiggle = petrified ? 0.25 : limp ? 0.35 : 0.9;
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        dir.addScaledVector(perp, Math.sin(k * 1.5 + phase) * wiggle);
        if (limp) dir.y -= 0.95; else if (petrified) dir.addScaledVector(root.n, 0.6); else { dir.y += t > 0.6 ? 0.55 : -0.1; dir.addScaledVector(root.n, 0.35); if (Math.abs(az) < 1.2) dir.z += 0.25; }
        dir.normalize();
        pos.addScaledVector(dir, length / steps);
        // Keep clear of her face and skull.
        inside.set(pos.x / 0.07, pos.y / 0.105, pos.z / 0.085);
        const depth = inside.length();
        const clear = 1.14 + (pos.z > 0 && pos.y < 0.03 ? 0.1 : 0);
        if (depth < clear) { pos.set(inside.x * 0.07, inside.y * 0.105, inside.z * 0.085).multiplyScalar(clear / depth); }
        if (limp && pos.z > 0.02 && pos.y < 0.045) pos.x += Math.sign(pos.x || 1) * 0.012;
        points.push(pos.clone().sub(root.p));
      }
      const palette = petrified ? stone : live;
      const geometry = snake(points, (0.0098 + random() * 0.004) * (petrified ? 1.05 : 1), palette[0], palette[1], palette[2], stump ? { head: false, stump: sculpture ? palette[1] : new THREE.Color('#b01c22'), taper: 0.1, bands: 2 } : { bands: Math.round(length * 60) });
      const group = add(new THREE.Group());
      group.position.copy(root.p);
      add(new THREE.Mesh(geometry, scaly), group);
      const amp = petrified || sculpture ? 0 : stump ? 0.3 : limp ? 0.035 : 0.2;
      nest.push({ group, amp, phase, speed: 0.8 + random() * 1.2 });
      if (stump) pieces.push(new THREE.Vector3((random() - 0.5) * 0.24, 0, 0.1 + random() * 0.06));
    }

    // How she is kept.
    let headY = 0.3, floor = 0;
    const stoneTone = s.material('#d8d2c4', { roughness: 0.6 });
    const cut = sculpture ? tone(0.8) : flat('#8e1820', { roughness: 0.35 });
    const stumpNeck = (y: number) => {
      const neck = s.lathe([[0.03, 0], [0.036, 0.004], [0.032, 0.03], [0.031, 0.09]], tone(1), [0, y, -0.01]);
      s.cylinder(0.035, 0.037, 0.005, [0, y + 0.002, -0.01], cut, 14);
      return neck;
    };
    if (a.kept === 'pedestal') {
      s.box([0.17, 0.022, 0.15], [0, 0.011, 0], stoneTone);
      s.lathe([[0, 0.022], [0.062, 0.022], [0.066, 0.034], [0.04, 0.046], [0.036, 0.075], [0.052, 0.09], [0, 0.09]], stoneTone);
      const bust = s.lathe([[0, 0], [0.05, 0], [0.082, 0.03], [0.098, 0.075], [0.086, 0.1], [0.044, 0.118], [0.033, 0.135], [0.031, 0.2]], tone(1), [0, 0.088, -0.008]);
      bust.scale.set(1.25, 1, 0.74);
      const robe = s.lathe([[0.084, 0.03], [0.1, 0.075], [0.089, 0.101], [0.05, 0.117]], sculpture ? tone(0.85) : flat('#5b2f6b', { roughness: 0.8, side: THREE.DoubleSide }), [0, 0.089, -0.008]);
      robe.scale.set(1.27, 1, 0.76);
      headY = 0.088 + 0.2 + 0.062; floor = 0.022;
    } else if (a.kept === 'dish') {
      s.lathe([[0, 0], [0.07, 0], [0.085, 0.012], [0.16, 0.022], [0.172, 0.03], [0.16, 0.027], [0.08, 0.018], [0, 0.018]], s.material('#cfd3d6', { metalness: 0.9, roughness: 0.25 }));
      const pool = s.cylinder(0.075, 0.08, 0.003, [0.012, 0.0195, 0.005], cut, 20); pool.scale.set(1.2, 1, 0.9);
      stumpNeck(0.019);
      headY = 0.019 + 0.045 + 0.085; floor = 0.02;
    } else if (a.kept === 'cloche') {
      const wood = s.material('#4a2f1e', { roughness: 0.5 });
      s.lathe([[0, 0], [0.17, 0], [0.176, 0.012], [0.16, 0.02], [0.156, 0.03], [0, 0.03]], wood);
      s.cylinder(0.02, 0.045, 0.012, [0, 0.036, -0.01], s.material('#b58a35', { metalness: 0.85, roughness: 0.35 }));
      s.cylinder(0.006, 0.006, 0.06, [0, 0.07, -0.01], s.material('#b58a35', { metalness: 0.85, roughness: 0.35 }));
      stumpNeck(0.095);
      headY = 0.095 + 0.045 + 0.085; floor = 0.03;
      const top = headY + 0.25;
      const dome = Array.from({ length: 12 }, (_u, i): [number, number] => { const t = (i / 11) * Math.PI / 2; return [Math.cos(t) * 0.152, top - 0.152 + Math.sin(t) * 0.152]; });
      s.lathe([[0.152, 0.03], ...dome], glass('#e4f4ea', 0.16));
      s.ball([0.018, 0.018, 0.018], [0, top + 0.014, 0], new THREE.MeshStandardMaterial({ color: '#cfe6dc', roughness: 0.1 }), 14);
      const shine = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
      for (const [angle, width] of [[-0.8, 0.14], [-0.6, 0.04], [0.9, 0.06]] as const) s.mesh(new THREE.CylinderGeometry(0.153, 0.153, top - 0.2, 6, 1, true, angle, width), shine, [0, 0.03 + (top - 0.2) / 2, 0]);
    } else {
      const coil: THREE.Vector3[] = [new THREE.Vector3(0, 0.36 - 0.07, -0.01), new THREE.Vector3(0, 0.22, -0.03), new THREE.Vector3(0.02, 0.13, -0.02)];
      for (let i = 0; i <= 22; i++) { const t = i / 22, ang = t * Math.PI * 4.4 + 1.2, r = mix(0.05, 0.15, t); coil.push(new THREE.Vector3(Math.sin(ang) * r, mix(0.075, 0.016, Math.min(1, t * 2.2)), Math.cos(ang) * r * 0.85)); }
      s.mesh(snake(coil, 0.036, new THREE.Color(sculpture ? baseTone : '#86a86c').multiplyScalar(sculpture ? 0.8 : 1), new THREE.Color(sculpture ? baseTone : '#4f7d44'), live[2], { head: false, taper: 0.82, bands: 34 }), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal }));
      headY = 0.36;
    }
    skull.position.y = headY;
    const lean = a.expression === 'boredom' ? 0.16 : a.kept === 'dish' ? -0.08 : 0;
    skull.rotation.z = lean;
    s.root.add(skull);

    // Severed pieces and what was left behind.
    pieces.slice(0, 4).forEach((at) => {
      const pts = Array.from({ length: 5 }, (_u, k) => new THREE.Vector3((k - 2) * 0.016, 0.008, Math.sin(k * 1.4 + at.x * 30) * 0.012));
      const piece = s.mesh(snake(pts, 0.008, live[0], live[1], live[2], { bands: 4 }), scaly);
      const out = a.kept === 'cloche' ? 0.6 : 1;
      piece.position.set(at.x * out, floor, (a.kept === 'pedestal' ? 0.11 : at.z) * out); piece.rotation.y = at.x * 20;
    });
    const sideX = (random() < 0.5 ? -1 : 1) * (a.kept === 'cloche' ? 0.09 : a.kept === 'dish' ? 0.115 : 0.15);
    const itemY = a.kept === 'pedestal' || a.kept === 'free' ? 0 : floor;
    if (a.beside === 'sparrow') {
      const grey = s.material('#9c9c96', { roughness: 0.8 });
      s.ball([0.014, 0.012, 0.02], [sideX, itemY + 0.016, 0.07], grey, 12);
      s.ball([0.009, 0.009, 0.009], [sideX, itemY + 0.03, 0.084], grey, 10);
      s.mesh(new THREE.ConeGeometry(0.003, 0.009, 5), grey, [sideX, itemY + 0.03, 0.096]).rotation.x = Math.PI / 2;
      s.box([0.008, 0.002, 0.022], [sideX, itemY + 0.02, 0.048], grey).rotation.x = -0.4;
      for (const dx of [-0.004, 0.004]) s.rod([sideX + dx, itemY, 0.072], [sideX + dx, itemY + 0.01, 0.072], 0.001, grey);
    } else if (a.beside === 'mirror') {
      const gilt = s.material('#b98d36', { metalness: 0.85, roughness: 0.35 });
      const mirror = new THREE.Group();
      mirror.position.set(sideX, itemY + 0.004, 0.08); mirror.rotation.set(0, sideX > 0 ? -0.6 : 0.6, 0);
      s.root.add(mirror);
      const part = (mesh: THREE.Mesh) => { mesh.castShadow = true; mirror.add(mesh); return mesh; };
      part(new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.005, 24), gilt));
      part(new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.006, 24), new THREE.MeshStandardMaterial({ color: '#dfeaf2', metalness: 1, roughness: 0.05, emissive: '#8fb2cf', emissiveIntensity: 0.3 })));
      part(new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.005, 0.05), gilt)).position.z = 0.056;
      for (let i = 0; i < 5; i++) { const crack = part(new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.0066, 0.028), flat('#20262c'))); crack.rotation.y = i * 1.3 + random(); crack.position.set(Math.sin(crack.rotation.y) * 0.012, 0, Math.cos(crack.rotation.y) * 0.012); }
    } else if (a.beside === 'sword') {
      const bronze = s.material('#a8762c', { metalness: 0.85, roughness: 0.35 });
      const sword = new THREE.Group();
      const part = (mesh: THREE.Mesh, y: number) => { mesh.castShadow = true; mesh.position.y = y; sword.add(mesh); };
      part(new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.19, 4), bronze), 0.095);
      part(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.01), bronze), 0.195);
      part(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 8), s.material('#3a2618')), 0.224);
      part(new THREE.Mesh(new THREE.SphereGeometry(0.01, 10, 8), bronze), 0.254);
      sword.children[0].scale.z = 0.3; sword.children[0].rotation.x = Math.PI;
      sword.position.set(sideX * 1.15, itemY, 0.09); sword.rotation.set(-0.32, 0, -Math.sign(sideX) * 0.3);
      s.root.add(sword);
    }

    const energy = mix(0.25, 1, mood.energy);
    return s.finish({
      update(_dt, time) {
        for (const one of nest) {
          if (!one.amp) continue;
          one.group.rotation.x = Math.sin(time * one.speed * energy * 1.6 + one.phase) * one.amp * energy;
          one.group.rotation.z = Math.cos(time * one.speed * energy * 1.3 + one.phase * 2) * one.amp * energy;
        }
        if (!sculpture) {
          skull.rotation.y = Math.sin(time * 0.4) * 0.06 * energy;
          for (const eye of eyes) if (openness > 0) eye.upper.rotation.x = eye.openAngle(openness * (1 - Math.pow(Math.max(0, Math.sin(time * 0.9)), 60)));
        }
      },
    });
  },
});
