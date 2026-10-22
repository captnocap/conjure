import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { paint } from './lab';
import { type Surf, cord, eyeTexture, headForm, makeEar, makeEye, mountEar, ticks } from './head';

const TONES = {
  classic: ['#8fa878', '#b4c296', '#6f8c6c', '#4f5a48'],
  pallid: ['#b7c0c6', '#dbcfbd', '#93a2b0', '#5d6470'],
  mixed: ['#c99f80', '#6d4832', '#e6c8b6', '#6a4a44'],
  jaundiced: ['#cdbb68', '#e0d6a0', '#a3964c', '#6b6232'],
  bruised: ['#a596b4', '#c9bccd', '#7a6c96', '#514463'],
} as const;

/** Points along a surface path at an even spacing. */
function walk(at: (t: number) => Surf, spacing: number) {
  const out: Surf[] = [];
  let last: THREE.Vector3 | null = null;
  for (let i = 0; i <= 500; i++) {
    const point = at(i / 500);
    if (!last || point.p.distanceTo(last) >= spacing) { out.push(point); last = point.p; }
  }
  return out;
}

export default defineThing({
  questions: {
    tones: choice('What colours are the patches of skin?', {
      classic: 'Matinee-monster grey-green with paler green patches.',
      pallid: 'Corpse-pale blue-grey with one warmer, newer patch.',
      mixed: 'Plainly several different people: brown, pink and olive side by side.',
      jaundiced: 'Waxy yellows, preserved too long.',
      bruised: 'Lilac and violet, everything bruised.',
    }),
    fastenings: choice('What holds the seams together?', {
      stitches: 'Coarse black surgical thread in big uneven stitches.',
      staples: 'Rows of steel staples.',
      clamps: 'Chunky brass clamps biting across each seam.',
      zip: 'A metal zip fastener, with its pull tab hanging at the temple.',
    }),
    terminals: choice('How does the current get in?', {
      bolts: 'Two thick bolts through the neck.',
      electrodes: 'Brass electrodes on ceramic studs at the temples, trailing wire.',
      none: 'Nothing: just scars where something was removed.',
    }),
    awake: noul('Is it awake?'),
    eyes: choice('If it is awake, what are its eyes like?', {
      heavy: 'Both half open under heavy lids, dull and patient.',
      one: 'One eye open, the other still shut.',
      mismatched: 'A mismatched pair: one large and yellow, one small and blue.',
      tear: 'Open and wet, with a tear running down one cheek.',
      staring: 'Wide open and staring, newly alive.',
    }),
    expression: choice('What is its expression?', {
      blank: 'Blank and slack, nobody home yet.',
      gentle: 'Gentle, a small uncertain smile.',
      anguished: 'Anguished: brows lifted, mouth open in a groan.',
      enraged: 'Enraged: brows down, teeth bared.',
    }),
    hair: choice('What hair does it have?', {
      fringe: 'A flat black cap of hair with a straight fringe.',
      bald: 'None: a bare scarred scalp.',
      tufts: 'A few sparse tufts that survived.',
      shock: 'A tall swept-up shock of dark hair with white lightning streaks.',
    }),
    wears: choice('What is it wearing?', {
      nothing: 'Nothing at all.',
      flower: 'A daisy tucked behind one ear.',
      bandage: 'A stained bandage wound round the brow.',
      collar: 'A stiff white collar and black tie, far too big for the neck.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [toneA, toneB, toneC, lipTone] = TONES[a.tones];
    const head = headForm({ w: 0.085, h: 0.125, d: 0.1, jaw: -0.3, flat: 1, brow: 1.1, nose: 1.0, socket: 0.85, cheek: 0.5, chin: 0.65, lips: 0.6 });
    const j1 = random() * 6, j2 = random() * 6;
    const seamTheta = (az: number) => 1.0 + 0.035 * Math.sin(az * 3 + j1) + 0.02 * Math.sin(az * 7 + j2);
    const side = random() < 0.5 ? 1 : -1;
    const patch: [number, number][] = [[0.3 * side, -0.14], [0.7 * side, -0.06], [0.74 * side, -0.52], [0.4 * side, -0.62]];
    const patchAt = (t: number): [number, number] => {
      const k = Math.min(3.9999, t * 4), i = Math.floor(k), f = k - i;
      const p = patch[i], q = patch[(i + 1) % 4];
      return [mix(p[0], q[0], f), mix(p[1], q[1], f)];
    };

    // Skin: three people's worth, painted straight onto the head's own map.
    const skinMap = paint(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = toneA;
      ctx.fillRect(0, 0, w, h);
      const seamLine = () => { ctx.beginPath(); for (let x = 0; x <= w; x += 8) { const y = (seamTheta((x / w - 0.5) * Math.PI * 2) / Math.PI) * h; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } };
      seamLine(); ctx.lineTo(w, 0); ctx.lineTo(0, 0); ctx.closePath();
      ctx.fillStyle = toneB; ctx.fill();
      const patchLine = () => { ctx.beginPath(); for (let i = 0; i <= 64; i++) { const [x, y] = patchAt(i / 64); const [u, v] = head.uv(x, y); if (i === 0) ctx.moveTo(u * w, v * h); else ctx.lineTo(u * w, v * h); } ctx.closePath(); };
      patchLine(); ctx.fillStyle = toneC; ctx.fill();
      ctx.fillStyle = toneC; ctx.fillRect(0, h * 0.8, w, h * 0.2);
      // Mottling, sunken sockets and bruising along every join.
      for (let i = 0; i < 60 + mood.wear * 160; i++) {
        const x = random() * w, y = random() * h, r = 8 + random() * 30;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, random() < 0.5 ? `rgba(40,50,30,${0.06 + mood.wear * 0.14})` : 'rgba(255,255,240,0.05)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (const ex of [-0.36, 0.36]) {
        const [u, v] = head.uv(ex, 0.06);
        const g = ctx.createRadialGradient(u * w, v * h, 4, u * w, v * h, 46);
        g.addColorStop(0, 'rgba(45,25,50,0.6)'); g.addColorStop(1, 'rgba(45,25,50,0)');
        ctx.fillStyle = g; ctx.fillRect(u * w - 50, v * h - 50, 100, 100);
      }
      ctx.lineJoin = 'round';
      for (const [width, colour] of [[16, 'rgba(120,40,70,0.28)'], [4, 'rgba(90,20,30,0.75)']] as const) {
        ctx.lineWidth = width; ctx.strokeStyle = colour;
        seamLine(); ctx.stroke(); patchLine(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, h * 0.8); ctx.lineTo(w, h * 0.8); ctx.stroke();
      }
    });
    const skin = new THREE.MeshStandardMaterial({ map: skinMap, roughness: mix(0.6, 0.85, mood.wear) });
    const flat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.7, ...options });

    const skull = new THREE.Group();
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = skull) => {
      node.traverse((child) => { if ((child as THREE.Mesh).isMesh) child.castShadow = child.receiveShadow = true; });
      parent.add(node);
      return node;
    };
    add(new THREE.Mesh(head.grid(), skin));

    // Seams and whatever closes them.
    const forehead = (t: number) => { const az = mix(-2.5, 2.5, t); return head.surf(az, seamTheta(az)); };
    const cheek = (t: number) => { const [x, y] = patchAt(t); return head.face(x, y); };
    const steel = flat('#c9ced0', { metalness: 0.85, roughness: 0.3 });
    const brass = flat('#b98d36', { metalness: 0.85, roughness: 0.35 });
    const thread = flat('#14110f', { roughness: 0.9 });
    for (const seam of [forehead, cheek]) {
      if (a.fastenings === 'stitches') {
        add(ticks(walk(seam, 0.011), thread, [0.017, 0.0026, 0.0026], 0.0012, 0.35));
      } else if (a.fastenings === 'staples') {
        add(ticks(walk(seam, 0.012), steel, [0.016, 0.0034, 0.0032], 0.0012));
      } else if (a.fastenings === 'clamps') {
        add(ticks(walk(seam, 0.026), brass, [0.024, 0.009, 0.01], 0.003));
        add(ticks(walk(seam, 0.026), flat('#5c4416', { metalness: 0.6 }), [0.006, 0.012, 0.005], 0.003));
      } else {
        add(ticks(walk(seam, 0.0042), flat('#2a2622', { roughness: 0.95 }), [0.022, 0.0016, 0.0046], 0.0006));
        add(ticks(walk(seam, 0.0042), steel, [0.0075, 0.0034, 0.0024], 0.0016));
      }
    }
    if (a.fastenings === 'zip') {
      const end = forehead(0.5 + side * 0.24);
      const tab = add(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.026, 0.0028), steel));
      tab.position.copy(end.p).addScaledVector(end.n, 0.004).add(new THREE.Vector3(0, -0.014, 0));
      tab.lookAt(tab.position.clone().add(end.n));
      const slider = add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.006), steel));
      slider.position.copy(end.p).addScaledVector(end.n, 0.003);
      slider.lookAt(slider.position.clone().add(end.n));
    }

    // Expression.
    const awake = a.awake;
    const mouthCurve = { blank: -0.15, gentle: 0.75, anguished: -0.9, enraged: -0.55 }[a.expression];
    const mouthGap = { blank: awake ? 0 : 0.05, gentle: 0, anguished: 0.24, enraged: 0.15 }[a.expression];
    const browTilt = { blank: 0, gentle: -0.05, anguished: -0.16, enraged: 0.14 }[a.expression];
    const half = 0.34;
    const lipY = (x: number, sign: number) => -0.485 + mouthCurve * 0.09 * (x / half) ** 2 + sign * (0.012 + mouthGap * 0.5 * (1 - (x / half) ** 2));
    const lipPath = (sign: number, lift: number) => Array.from({ length: 13 }, (_u, i) => { const x = mix(-half, half, i / 12); return head.face(x, lipY(x, sign), lift); });
    const lips = flat(new THREE.Color(lipTone), { roughness: 0.55 });
    add(cord(lipPath(1, 0.001), 0.006, lips));
    add(cord(lipPath(-1, 0.001), 0.007, lips));
    if (mouthGap > 0.02) {
      const xOf = (az: number) => THREE.MathUtils.clamp(Math.sin(az) * 0.86, -half, half);
      add(new THREE.Mesh(head.grid({ az: [-0.42, 0.42], nu: 16, nv: 4, lift: 0.0006, top: (az) => Math.acos(lipY(xOf(az), 1)), bottom: (az) => Math.acos(lipY(xOf(az), -1)) }), flat('#1c0c10')));
      const teeth = flat('#e2d9b8', { roughness: 0.4 });
      const row = (sign: number) => walk((t) => { const x = mix(-half * 0.72, half * 0.72, t); return head.face(x, lipY(x, sign) - sign * 0.045, 0.0012); }, 0.0105);
      if (a.expression === 'enraged') { add(ticks(row(1), teeth, [0.017, 0.004, 0.009])); add(ticks(row(-1), teeth, [0.015, 0.004, 0.009])); }
      else add(ticks(row(1), teeth, [0.011, 0.004, 0.009]));
    }
    const hairTone = a.hair === 'shock' ? '#17141a' : '#111013';
    const hair = flat(hairTone, { roughness: 0.85 });
    for (const sx of [-1, 1]) {
      const browPath = [0.13, 0.27, 0.42, 0.56].map((x, i) => head.face(sx * x, 0.215 + browTilt * (1 - i / 3) - (i === 3 ? 0.035 : 0), 0.003));
      add(cord(browPath, 0.0062, hair));
    }

    // Eyes under heavy lids.
    const lidMaterial = flat(new THREE.Color(toneA).multiplyScalar(0.9));
    const blood = mix(0.2, 0.9, mood.wear * 0.5 + mood.energy * 0.5);
    const dull = eyeTexture('round', '#b9b08a', '#6f6a45', blood, random, '#e9e2c6');
    const yellow = eyeTexture('round', '#ffe36a', '#b9820e', blood, random, '#efe6c0');
    const blue = eyeTexture('round', '#a9d6f5', '#2f6fb8', blood, random);
    const base = { blank: 0.42, gentle: 0.5, anguished: 0.62, enraged: 0.6 }[a.expression];
    const openBy = { heavy: [base * 0.85, base * 0.85], one: [0, base + 0.15], mismatched: [base + 0.25, base + 0.05], tear: [base, base], staring: [0.95, 0.95] }[a.eyes];
    const maps = { heavy: [dull, dull], one: [dull, dull], mismatched: [yellow, blue], tear: [blue, blue], staring: [yellow, yellow] }[a.eyes];
    const sizes = a.eyes === 'mismatched' ? [0.026, 0.018] : [0.022, 0.022];
    const eyes = [-1, 1].map((sx, index) => {
      const k = side > 0 ? index : 1 - index;
      const open = awake ? openBy[k] : 0;
      const spot = head.face(sx * 0.36, 0.06);
      const eye = makeEye(sizes[k], maps[k], lidMaterial, open, awake && a.eyes === 'staring' ? 0.45 : 0.18);
      eye.group.position.copy(spot.p).addScaledVector(spot.n, -sizes[k] * 0.45);
      eye.group.rotation.y = sx * 0.16;
      add(eye.group);
      return { ...eye, open };
    });
    if (a.eyes === 'tear') {
      const wet = new THREE.MeshStandardMaterial({ color: '#cfeaff', roughness: 0.05, emissive: '#9fd0ff', emissiveIntensity: 0.5 });
      const path = [0.03, -0.06, -0.16, -0.27].map((y, i) => head.face(-side * (0.4 + i * 0.012), y, 0.0015));
      add(cord(path, 0.0022, wet));
      const drop = add(new THREE.Mesh(new THREE.SphereGeometry(0.0062, 10, 8), wet));
      drop.position.copy(path[3].p); drop.scale.y = 1.4;
    }

    // Ears from two more donors.
    const earTones = [toneC, toneB];
    [-1, 1].forEach((sx, i) => {
      const spot = head.surf(sx * 1.58, 1.52);
      const ear = makeEar(0.062 * (i ? 1 : 1.12), flat(earTones[i]), flat(new THREE.Color(earTones[i]).multiplyScalar(0.6)));
      add(mountEar(ear, spot.p.addScaledVector(spot.n, -0.004), sx, 0.5));
      add(ticks(walk((t) => head.surf(sx * 1.36, mix(1.25, 1.8, t)), 0.012), a.fastenings === 'staples' ? steel : thread, [0.013, 0.0024, 0.0024], 0.001, 0.3));
    });

    // Hair.
    const ringlets: THREE.Object3D[] = [];
    if (a.hair === 'fringe') {
      const jag = Array.from({ length: 24 }, () => random());
      add(new THREE.Mesh(head.grid({ nv: 14, lift: 0.005, bottom: (az) => { const k = Math.min(1, Math.max(0, (Math.abs(az) - 1.05) / 0.3)); return mix(0.74 + jag[Math.floor(((az + Math.PI) / (Math.PI * 2)) * 80) % 24] * 0.07, 1.5, k * k * (3 - 2 * k)); } }), hair));
    } else if (a.hair === 'tufts') {
      const tuft = new THREE.ConeGeometry(0.0045, 0.04, 5);
      tuft.translate(0, 0.02, 0);
      for (let i = 0; i < 26; i++) {
        const spot = head.surf((random() - 0.5) * 5.5, 0.15 + random() * 0.8);
        const mesh = add(new THREE.Mesh(tuft, hair));
        mesh.position.copy(spot.p);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spot.n.add(new THREE.Vector3((random() - 0.5) * 0.5, 0.1, (random() - 0.5) * 0.5)).normalize());
        mesh.scale.setScalar(0.7 + random() * 0.9);
      }
    } else if (a.hair === 'shock') {
      const strands = paint(512, 256, (ctx, w, h) => {
        ctx.fillStyle = hairTone; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 220; i++) { ctx.strokeStyle = `rgba(${90 + random() * 60},${80 + random() * 50},${100 + random() * 60},0.35)`; ctx.lineWidth = 1 + random() * 2; const x = random() * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (random() - 0.5) * 30, h); ctx.stroke(); }
        ctx.strokeStyle = '#f2f0ea'; ctx.lineWidth = 15; ctx.lineJoin = 'miter';
        for (const u of [0.25 - 0.085, 0.25 + 0.085]) { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const x = u * w + (i % 2 ? 11 : -11), y = (i / 8) * h * 0.82; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
      });
      const tower = add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshStandardMaterial({ map: strands, roughness: 0.8 })));
      tower.scale.set(0.083, 0.135, 0.092);
      tower.position.set(0, 0.125, -0.012);
      add(new THREE.Mesh(head.grid({ nv: 10, lift: 0.004, bottom: (az) => mix(0.72, 1.5, Math.min(1, Math.max(0, (Math.abs(az) - 1.1) / 0.3))) }), hair));
    } else {
      // A bare scalp shows where the lid of the skull was lifted off.
      add(ticks(walk((t) => head.surf(0.02, mix(0.05, 0.95, t)), 0.013), a.fastenings === 'staples' || a.fastenings === 'zip' ? steel : thread, [0.016, 0.0026, 0.0028], 0.001, 0.25));
    }

    // Things worn.
    if (a.wears === 'bandage') {
      const lint = paint(512, 64, (ctx, w, h) => {
        ctx.fillStyle = '#e6dfcc'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(120,110,90,0.5)'; ctx.lineWidth = 1;
        for (let y = 4; y < h; y += 7) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + 3); ctx.stroke(); }
        const x = w * (0.5 + side * 0.07), g = ctx.createRadialGradient(x, h / 2, 2, x, h / 2, 40);
        g.addColorStop(0, 'rgba(120,20,20,0.9)'); g.addColorStop(1, 'rgba(140,60,20,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 50, 0, 100, h);
      });
      const tilt = (az: number) => 0.74 + 0.16 * Math.sin(az + side * 0.6);
      add(new THREE.Mesh(head.grid({ nv: 3, lift: 0.0075, top: (az) => tilt(az), bottom: (az) => tilt(az) + 0.27 }), new THREE.MeshStandardMaterial({ map: lint, roughness: 0.95, side: THREE.DoubleSide })));
      const tail = add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.002), flat('#e6dfcc', { roughness: 0.95 })));
      const knot = head.surf(-side * 1.9, 0.95, 0.01);
      tail.position.copy(knot.p).add(new THREE.Vector3(0, -0.035, 0)); tail.rotation.z = side * 0.25;
      ringlets.push(tail);
    } else if (a.wears === 'flower') {
      const spot = head.surf(side * 1.3, 1.22, 0.012);
      const daisy = add(new THREE.Group());
      daisy.position.copy(spot.p);
      daisy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), spot.n.clone().add(new THREE.Vector3(0, 0.2, 0.9)).normalize());
      const petal = new THREE.SphereGeometry(1, 8, 6), white = flat(mood.cheer > 0.35 ? '#fbf6ea' : '#d8cfc0'), heart = flat('#e9b21c');
      for (let i = 0; i < 11; i++) { const p = add(new THREE.Mesh(petal, white), daisy); const ang = (i / 11) * Math.PI * 2; p.scale.set(0.0085, 0.02, 0.003); p.position.set(Math.cos(ang) * 0.02, Math.sin(ang) * 0.02, 0); p.rotation.z = ang - Math.PI / 2; }
      const centre = add(new THREE.Mesh(petal, heart), daisy); centre.scale.set(0.011, 0.011, 0.006);
      const stem = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.07, 6), flat('#4d7a34')), daisy);
      stem.position.set(0.004, -0.036, -0.006); stem.rotation.z = 0.15;
      ringlets.push(daisy);
    }

    // Neck, terminals, mount.
    const baseH = 0.016, headY = baseH + 0.2;
    skull.position.set(0, headY, 0);
    s.root.add(skull);
    const iron = s.material('#3a3c40', { metalness: 0.6, roughness: 0.5 });
    s.lathe([[0, 0], [0.082, 0], [0.086, 0.006], [0.078, baseH], [0, baseH]], iron);
    const neck = s.lathe([[0.058, baseH], [0.05, baseH + 0.03], [0.049, baseH + 0.1], [0.05, baseH + 0.13]], flat(toneC), [0, 0, -0.012]);
    neck.scale.z = 1.1;
    s.ring(0.051, 0.0022, [0, baseH + 0.062, -0.012], flat('#6a1c22')).rotation.x = Math.PI / 2;
    const neckSeam = Array.from({ length: 22 }, (_u, i): Surf => { const ang = (i / 22) * Math.PI * 2; const n = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang)); return { p: new THREE.Vector3(n.x * 0.051, baseH + 0.062, n.z * 0.056 - 0.012), n }; });
    neckSeam.push(neckSeam[0]);
    add(ticks(neckSeam, a.fastenings === 'staples' ? steel : thread, [0.015, 0.0026, 0.0026], 0.001, 0.3), s.root);

    const sparks: THREE.Mesh[] = [];
    const glowBall = (at: THREE.Vector3, parent: THREE.Object3D) => {
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.9, depthWrite: false }));
      spark.position.copy(at); parent.add(spark); sparks.push(spark);
    };
    if (a.terminals === 'bolts') {
      for (const sx of [-1, 1]) {
        s.rod([sx * 0.04, baseH + 0.095, -0.012], [sx * 0.085, baseH + 0.095, -0.012], 0.0075, steel);
        const nut = s.cylinder(0.015, 0.015, 0.012, [sx * 0.088, baseH + 0.095, -0.012], steel, 6); nut.rotation.z = Math.PI / 2;
        const washer = s.cylinder(0.019, 0.019, 0.003, [sx * 0.055, baseH + 0.095, -0.012], iron, 16); washer.rotation.z = Math.PI / 2;
        if (awake) glowBall(new THREE.Vector3(sx * 0.098, baseH + 0.095, -0.012), s.root);
      }
    } else if (a.terminals === 'electrodes') {
      for (const sx of [-1, 1]) {
        const spot = head.surf(sx * 1.2, 1.2);
        const stud = add(new THREE.Group());
        stud.position.copy(spot.p); stud.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spot.n);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.012, 14), flat('#e9e4d6', { roughness: 0.3 })), stud).position.y = 0.006;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 10), brass), stud).position.y = 0.02;
        add(new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), brass), stud).position.y = 0.032;
        if (awake) glowBall(new THREE.Vector3(0, 0.044, 0), stud);
        const tip = spot.p.clone().addScaledVector(spot.n, 0.03).add(skull.position);
        const wire = Array.from({ length: 30 }, (_u, i) => { const t = i / 29; return new THREE.Vector3(mix(tip.x, sx * 0.075, t) + Math.sin(t * 40) * 0.006 * Math.sin(t * Math.PI), mix(tip.y, 0.012, t * t), mix(tip.z, -0.03, t) + Math.cos(t * 40) * 0.006 * Math.sin(t * Math.PI) - Math.sin(t * Math.PI) * 0.03); });
        s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wire), 80, 0.0016, 5), flat('#8a2f1f', { roughness: 0.5 }));
      }
    } else {
      for (const sx of [-1, 1]) s.cylinder(0.009, 0.009, 0.003, [sx * 0.05, baseH + 0.095, -0.012], flat('#5a2026')).rotation.z = Math.PI / 2;
    }
    if (a.wears === 'collar') {
      const linen = s.material('#efe9da', { roughness: 0.8, side: THREE.DoubleSide });
      const band = s.mesh(new THREE.CylinderGeometry(0.072, 0.066, 0.042, 28, 1, true, 0.22, Math.PI * 2 - 0.44), linen, [0, baseH + 0.03, -0.008]);
      band.rotation.x = 0.1; band.rotation.z = 0.07 * side;
      for (const sx of [-1, 1]) { const wing = s.box([0.03, 0.022, 0.002], [sx * 0.026, baseH + 0.044, 0.066], linen); wing.rotation.set(-0.5, sx * 0.4, sx * 0.5); }
      const black = s.material('#16161a');
      s.box([0.022, 0.02, 0.012], [0.004 * side, baseH + 0.02, 0.064], black);
      s.box([0.03, 0.03, 0.006], [0.006 * side, baseH + 0.004, 0.07], black).rotation.x = -0.9;
    }

    // Asleep it nods forward; awake it sits level and looks about.
    const rest = awake ? 0 : 0.2;
    skull.rotation.set(rest, 0, awake ? 0 : 0.07 * side);
    skull.position.z = awake ? 0 : 0.012;
    const energy = mix(0.2, 1, mood.energy);
    const blinkPhase = random() * 5;
    return s.finish({
      update(_dt, time) {
        skull.rotation.x = rest + Math.sin(time * (awake ? 0.9 : 0.6)) * (awake ? 0.012 : 0.02) * (awake ? energy : 1);
        if (awake) {
          skull.rotation.y = Math.sin(time * 0.37) * 0.07 * energy;
          const blink = Math.pow(Math.max(0, Math.sin(time * mix(0.7, 2.2, mood.energy) + blinkPhase)), 40);
          for (const eye of eyes) {
            if (eye.open > 0.05) eye.upper.rotation.x = eye.openAngle(eye.open * (1 - blink));
            eye.globe.rotation.y = Math.sin(time * 0.5 + blinkPhase) * 0.25 * energy;
          }
        }
        sparks.forEach((spark, i) => { const k = Math.max(0, Math.sin(time * 23 + i * 2.1) * Math.sin(time * 7.3 + i)) * energy; spark.scale.setScalar(0.3 + k * 2.2); });
        for (const item of ringlets) item.rotation.z += Math.sin(time * 1.3) * 0.0006 * energy;
      },
    });
  },
});
