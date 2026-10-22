import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type P2, blend, bump, paint, relief, stain, trace } from './relief';

const TONE = { porcelain: '#f3d6c6', honey: '#deaa86', olive: '#bd8a62', deep: '#74462f' } as const;
const SHADOW = {
  browns: ['#d2a888', '#5a3622'], blue: ['#9fd0f4', '#1f4fb0'], green: ['#a8dc98', '#256e42'], violet: ['#d2aef0', '#5e2796'], metallic: ['#f6e19a', '#b07f1e'],
} as const;

export default defineThing({
  questions: {
    look: choice('What look is being painted?', {
      clean: 'Clean daytime: a soft wash of colour and a thin line.',
      cat: 'A sharp black cat-eye wing flicking up at the outer corner.',
      smoky: 'Smoky: dark colour smudged all the way round the eye.',
      sixties: 'A 1960s cut crease: pale lid, a dark arc drawn above it, lower lashes painted on.',
      drag: 'Drag: colour blazing up to an overdrawn brow, glitter, a huge wing.',
    }),
    state: choice('What state is the make-up in?', {
      crisp: 'Crisp and freshly done.',
      crying: 'Smudged by crying: black mascara running down in streaks.',
      slept: 'Slept in: grey smears under the eye, the line broken and patchy.',
      half: 'Only half done: the inner half painted, the outer half still bare.',
    }),
    shadow: choice('What colour is the eyeshadow?', {
      browns: 'Soft browns and taupe.',
      blue: 'Bright blue.',
      green: 'Green.',
      violet: 'Violet.',
      metallic: 'Metallic gold.',
    }),
    lashes: score('How long are the lashes?', ['Short and stubby', 'Natural', 'Long', 'Enormous false lashes']),
    lid: choice('How open is the eye?', {
      open: 'Wide open, looking straight out.',
      half: 'Half closed, lowered for the mascara wand.',
      shut: 'Shut, showing the whole painted lid.',
    }),
    tone: choice('What is the skin tone?', {
      porcelain: 'Pale porcelain pink.',
      honey: 'Warm honey beige.',
      olive: 'Olive tan.',
      deep: 'Deep brown.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tone = TONE[a.tone];
    const [pale, deep] = SHADOW[a.shadow];
    const A = 0.052, Y0 = -0.01;
    const open = { open: 1, half: 0.42, shut: 0 }[a.lid];
    const arch = (x: number) => Math.max(0, 1 - (x / A) ** 2);
    const lower = (x: number) => Y0 - 0.0085 * arch(x) ** 0.9;
    const upper = (x: number) => lower(x) + open * 0.034 * arch(x + 0.004) ** 0.75 * (Math.abs(x) < A ? 1 : 0);
    const crease = (x: number) => Y0 + 0.031 * Math.max(0, 1 - (x / (A * 1.18)) ** 2) ** 0.7;
    const browLift = a.look === 'drag' ? 0.012 : 0;
    const brow = (x: number) => Y0 + 0.052 + browLift - (a.look === 'drag' ? 9 : 4.5) * (x - 0.012) ** 2 + (x > 0.012 ? -3 * (x - 0.012) ** 2 : 0);
    const W = 0.21, H = 0.16;
    const skinZ = (x: number, y: number) => -1.3 * x * x - 1.0 * y * y + 0.007 * bump(y - brow(x) + browLift, 0.012) - 0.006 * bump(Math.hypot(x + 0.04, y - Y0 - 0.028), 0.022);
    const ball = (x: number, y: number) => 0.017 * bump(Math.hypot(x, (y - Y0 - 0.004) * 1.15), 0.05);
    const lidZ = (x: number, y: number) => skinZ(x, y) + ball(x, y) + 0.002 * bump(y - upper(x), 0.004) * open;
    const gap = (x: number, y: number) => (Math.abs(x) < A ? Math.min(upper(x) - y, y - lower(x)) : -(Math.abs(x) - A));
    const rim = (x: number, y: number) => (1 - Math.abs(x / 0.1) ** 2.5 - Math.abs((y - 0.008) / 0.072) ** 2.5) * 0.03;
    const outline = (x: number, y: number) => (open > 0 ? Math.min(rim(x, y), -gap(x, y)) : rim(x, y));
    const plaque = relief(W, H, 128, (x, y) => (outline(x, y) > 0 ? lidZ(x, y) : null), (x, y) => skinZ(x, y) - 0.014, outline);

    const band = (from: (x: number) => number, to: (x: number) => number, x0: number, x1: number): P2[] => {
      const points: P2[] = [];
      for (let i = 0; i <= 30; i++) { const x = mix(x0, x1, i / 30); points.push([x, from(x)]); }
      for (let i = 30; i >= 0; i--) { const x = mix(x0, x1, i / 30); points.push([x, to(x)]); }
      return points;
    };
    const lash = (x: number) => (open > 0 ? upper(x) : lower(x));
    const done = a.state === 'half' ? 0.004 + (random() - 0.5) * 0.012 : 1;
    const wing: P2 = a.look === 'drag' ? [A + 0.034, Y0 + 0.03] : a.look === 'cat' ? [A + 0.024, Y0 + 0.019] : [A + 0.01, Y0 + 0.006];
    const map = paint(W, H, 768, (ctx) => {
      ctx.fillStyle = tone;
      ctx.fillRect(-W, -H, W * 2, H * 2);
      for (let i = 0; i < 50; i++) stain(ctx, (random() - 0.5) * W, (random() - 0.5) * H, 0.012, 0.012, random() < 0.5 ? blend(tone, '#a8483c', 0.5) : blend(tone, '#fff3e4', 0.5), 0.07);
      stain(ctx, -0.045, Y0 + 0.02, 0.02, 0.02, '#4a2a2a', 0.18);
      stain(ctx, 0, Y0 - 0.022, 0.05, 0.012, '#5a3040', a.state === 'slept' ? 0.35 : 0.12);
      ctx.save();
      if (done < 1) { ctx.beginPath(); ctx.rect(-W, -H, W + done, H * 2); ctx.clip(); }
      const top = a.look === 'drag' ? (x: number) => brow(x) - 0.006 : a.look === 'smoky' ? (x: number) => crease(x) + 0.008 : crease;
      // Shadow on the lid.
      trace(ctx, band(lash, top, -A * 1.05, a.look === 'drag' ? wing[0] - 0.006 : A * 1.12));
      if (a.look === 'sixties') { ctx.fillStyle = blend(pale, '#ffffff', 0.6); ctx.globalAlpha = 0.95; ctx.fill(); }
      else {
        const gradient = ctx.createLinearGradient(0, Y0 - 0.005, 0, Y0 + (a.look === 'drag' ? 0.062 : 0.04));
        gradient.addColorStop(0, a.look === 'clean' ? blend(pale, deep, 0.3) : deep);
        gradient.addColorStop(a.look === 'smoky' ? 0.8 : 0.55, a.look === 'smoky' ? blend(deep, '#1a1418', 0.3) : pale);
        gradient.addColorStop(1, a.look === 'drag' ? blend(pale, '#ffffff', 0.5) : pale);
        ctx.fillStyle = gradient; ctx.globalAlpha = a.look === 'clean' ? 0.6 : 0.92; ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (a.look === 'smoky') { stain(ctx, 0, Y0 + 0.008, 0.085, 0.05, blend(deep, '#120e12', 0.5), 0.55); trace(ctx, band((x) => lower(x) - 0.009, lower, -A, A * 1.1)); ctx.fillStyle = blend(deep, '#120e12', 0.5); ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1; }
      if (a.look === 'drag') { trace(ctx, band((x) => lower(x) - 0.006, lower, -A * 0.6, A * 1.1)); ctx.fillStyle = deep; ctx.fill(); }
      if (a.look === 'sixties') {
        ctx.strokeStyle = blend(deep, '#150f12', 0.55); ctx.lineWidth = 0.0036; ctx.lineCap = 'round';
        ctx.beginPath(); for (let i = 0; i <= 30; i++) { const x = mix(-A * 0.95, A * 1.2, i / 30); if (i) ctx.lineTo(x, crease(x) + 0.002); else ctx.moveTo(x, crease(x) + 0.002); } ctx.stroke();
        ctx.strokeStyle = '#141014'; ctx.lineWidth = 0.0013;
        for (let i = 0; i < 9; i++) { const x = mix(-A * 0.6, A * 0.9, i / 8); ctx.beginPath(); ctx.moveTo(x, lower(x) - 0.001); ctx.lineTo(x * 1.12 + 0.001, lower(x) - 0.012 - 0.004 * Math.sin(i * 0.4 + 0.6)); ctx.stroke(); }
      }
      if (a.shadow === 'metallic' || a.look === 'drag') for (let i = 0; i < 520; i++) {
        const x = (random() - 0.5) * 0.15, y = mix(lash(x), top(x), random());
        ctx.fillStyle = ['#ffffff', '#fff2b0', '#ffd0f0', '#bff3ff'][i % 4]; ctx.fillRect(x, y, 0.0009, 0.0009);
      }
      // Liner and wing.
      const weight = { clean: 0.0014, cat: 0.004, smoky: 0.0034, sixties: 0.0036, drag: 0.0046 }[a.look];
      ctx.strokeStyle = ctx.fillStyle = a.look === 'clean' ? '#3a2620' : '#0f0c10'; ctx.lineWidth = weight; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const patchy = a.state === 'slept';
      for (let i = 0; i < 30; i++) {
        if (patchy && random() < 0.3) continue;
        const x0 = mix(-A * 0.98, A, i / 30), x1 = mix(-A * 0.98, A, (i + 1) / 30);
        ctx.lineWidth = weight * mix(0.5, 1.15, i / 30);
        ctx.beginPath(); ctx.moveTo(x0, lash(x0) + weight * 0.4); ctx.lineTo(x1, lash(x1) + weight * 0.4); ctx.stroke();
      }
      if (a.look !== 'clean') { ctx.beginPath(); ctx.moveTo(A * 0.8, lash(A * 0.8)); ctx.lineTo(wing[0], wing[1]); ctx.lineTo(A * 0.97, lash(A) - weight * 0.3); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      // The brow, hair by hair.
      ctx.lineCap = 'round';
      const browInk = a.look === 'drag' ? '#1a1014' : blend(tone, '#1c120e', 0.82);
      for (let i = 0; i < 150; i++) {
        const t = random(), x = mix(-0.05, 0.078, t), thick = (a.look === 'drag' ? 0.0045 : 0.0075) * (1 - t * 0.75);
        const y = brow(x) + (random() - 0.5) * thick;
        ctx.strokeStyle = browInk; ctx.globalAlpha = 0.55 + random() * 0.4; ctx.lineWidth = 0.0009;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.007, y + 0.004 * (1 - t * 1.8)); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (a.state === 'crying') {
        stain(ctx, 0, Y0 - 0.02, 0.06, 0.016, '#18141a', 0.4);
        ctx.strokeStyle = 'rgba(16,12,18,0.82)';
        for (let i = 0; i < 5; i++) {
          let x = mix(-A * 0.7, A * 0.85, random()), y = lower(x) - 0.002;
          ctx.lineWidth = 0.0012 + random() * 0.0018; ctx.beginPath(); ctx.moveTo(x, y);
          const reach = 0.02 + random() * 0.045;
          while (y > lower(x) - reach) { x += (random() - 0.5) * 0.003; y -= 0.004; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
      if (a.state === 'slept') {
        for (let i = 0; i < 14; i++) stain(ctx, mix(-A, A * 1.3, random()), lower(0) - 0.006 - random() * 0.014, 0.011, 0.006, '#17131a', 0.4);
        stain(ctx, A + 0.016, Y0 + 0.004, 0.018, 0.012, '#17131a', 0.5);
      }
      for (let i = 0; i < 45 * mood.wear; i++) stain(ctx, (random() - 0.5) * W, (random() - 0.5) * H, 0.006, 0.006, '#6f675a', 0.2);
    });
    const form = new THREE.Group();
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = form) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    add(plaque.front, new THREE.MeshStandardMaterial({ map, roughness: 0.62 }));
    add(plaque.shell, s.material(blend(tone, '#4a2c24', 0.4), { roughness: 0.85 }));

    // The eyeball, glossy, tucked behind the lids.
    if (open > 0) {
      const EW = A * 2 + 0.016, EH = 0.056, EY = Y0 + 0.008;
      const iris = [['#6b4423', '#2c1608'], ['#4f86c6', '#1d3f73'], ['#5d9a5a', '#234a2a'], ['#8a7a3a', '#3c2c12']][Math.floor(random() * 4)];
      const gaze = (random() - 0.5) * 0.012, irisY = Y0 + (a.lid === 'half' ? -0.002 : 0.005);
      const eye = relief(EW, EH, 70, (x, y) => (gap(x, y + EY) > -0.004 ? skinZ(x, y + EY) + ball(x, y + EY) - 0.0035 : null), undefined, (x, y) => gap(x, y + EY) + 0.004);
      const eyeMap = paint(EW, EH, 512, (ctx) => {
        ctx.translate(0, -EY);
        ctx.fillStyle = blend('#f7f4ee', '#e8b8b0', a.state === 'crying' || a.state === 'slept' ? 0.45 : 0.05);
        ctx.fillRect(-EW, -1, EW * 2, 2);
        for (const sx of [-1, 1]) stain(ctx, sx * A * 0.95, Y0, 0.014, 0.012, '#d8707a', a.state === 'crying' ? 0.7 : 0.35);
        if (a.state === 'crying' || a.state === 'slept') { ctx.strokeStyle = 'rgba(200,40,50,0.55)'; ctx.lineWidth = 0.0005; for (let i = 0; i < 14; i++) { const sx = random() < 0.5 ? -1 : 1; ctx.beginPath(); ctx.moveTo(sx * A, Y0 + (random() - 0.5) * 0.01); ctx.lineTo(sx * A * 0.4, Y0 + (random() - 0.3) * 0.03); ctx.stroke(); } }
        const gradient = ctx.createRadialGradient(gaze, irisY, 0.003, gaze, irisY, 0.0145);
        gradient.addColorStop(0, iris[0]); gradient.addColorStop(0.8, iris[0]); gradient.addColorStop(1, iris[1]);
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(gaze, irisY, 0.0145, 0, 7); ctx.fill();
        ctx.strokeStyle = iris[1]; ctx.lineWidth = 0.0005;
        for (let i = 0; i < 40; i++) { const t = i * 0.157; ctx.beginPath(); ctx.moveTo(gaze + Math.cos(t) * 0.006, irisY + Math.sin(t) * 0.006); ctx.lineTo(gaze + Math.cos(t) * 0.0135, irisY + Math.sin(t) * 0.0135); ctx.stroke(); }
        ctx.fillStyle = '#080608'; ctx.beginPath(); ctx.arc(gaze, irisY, mix(0.0038, 0.0068, 1 - mood.daylight * 0.5), 0, 7); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(gaze - 0.005, irisY + 0.005, 0.0026, 0, 7); ctx.fill();
        trace(ctx, band((x) => upper(x) - 0.006, (x) => upper(x) + 0.004, -A, A)); ctx.fillStyle = 'rgba(30,14,20,0.4)'; ctx.fill();
      });
      add(eye.front, new THREE.MeshPhysicalMaterial({ map: eyeMap, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 })).position.y = EY;
    }

    // Lashes: real hairs, curled, thick with mascara where it has been applied.
    const length = mix(0.007, 0.03, a.lashes);
    const coated: THREE.BufferGeometry[] = [], bare: THREE.BufferGeometry[] = [];
    const hair = (x: number, y: number, tip: THREE.Vector3, bow: THREE.Vector3, radius: number, into: THREE.BufferGeometry[]) => {
      const base = new THREE.Vector3(x, y, lidZ(x, y) + 0.0005);
      const curve = new THREE.QuadraticBezierCurve3(base, base.clone().add(bow), base.clone().add(tip));
      into.push(new THREE.TubeGeometry(curve, 5, radius, 4, false));
    };
    const count = a.state === 'slept' ? 15 : 30;
    for (let i = 0; i < count; i++) {
      const x = mix(-A * 0.9, A * 0.97, (i + random() * 0.6) / count), fan = x / A;
      const mascara = x < done && a.state !== 'half' ? true : x < done;
      const l = length * mix(0.55, 1.15, (fan + 1) / 2) * (mascara ? 1 : 0.6) * mix(0.85, 1.1, random());
      const up = mix(-0.55, 0.95, open), mid = mix(-0.15, 0.3, open);
      hair(x, lash(x), new THREE.Vector3(fan * 0.55 * l + (random() - 0.5) * 0.002, up * l, 0.85 * l), new THREE.Vector3(fan * 0.2 * l, mid * l, 0.75 * l), mascara ? (a.state === 'slept' ? 0.0013 : 0.00095) : 0.0005, mascara ? coated : bare);
    }
    if (open > 0) for (let i = 0; i < 13; i++) {
      const x = mix(-A * 0.7, A * 0.9, i / 12), l = length * 0.33;
      hair(x, lower(x), new THREE.Vector3((x / A) * 0.5 * l, -0.8 * l, 0.6 * l), new THREE.Vector3(0, -0.2 * l, 0.6 * l), 0.0006, x < done ? coated : bare);
    }
    if (coated.length) add(mergeGeometries(coated)!, s.material('#0d0b0e', { roughness: 0.5 }));
    if (bare.length) add(mergeGeometries(bare)!, s.material(blend(tone, '#3a2416', 0.75), { roughness: 0.7 }));
    for (const geometry of [...coated, ...bare]) geometry.dispose();

    const tears: THREE.Mesh[] = [];
    if (a.state === 'crying') {
      const water = new THREE.MeshPhysicalMaterial({ color: '#dff2ff', roughness: 0.05, clearcoat: 1, emissive: '#9fc8e8', emissiveIntensity: 0.25 });
      for (let i = 0; i < 2 + Math.floor(random() * 2); i++) {
        const x = mix(-A * 0.6, A * 0.7, random()), y = lower(x) - 0.006 - random() * 0.03;
        const drop = add(new THREE.SphereGeometry(0.0042, 12, 8), water);
        drop.scale.set(1, 1.5, 0.8);
        drop.position.set(x, y, lidZ(x, y) + 0.002);
        tears.push(drop);
      }
    }
    if (a.look === 'drag') {
      for (let i = 0; i < 5; i++) {
        const x = mix(A * 0.2, A + 0.03, i / 4), y = brow(x) - 0.012 - (i % 2) * 0.004;
        const gem = add(new THREE.OctahedronGeometry(0.003, 0), new THREE.MeshPhysicalMaterial({ color: '#ffffff', emissive: pale, emissiveIntensity: 0.6, roughness: 0.05, flatShading: true }));
        gem.position.set(x, y, lidZ(x, y) + 0.002);
      }
    }

    // The wand, mid-stroke at the lashes.
    const wand = new THREE.Group();
    const stick = new Sculpture(context);
    const black = s.material('#141218', { roughness: 0.35 });
    const gold = s.material('#d9ae52', { metalness: 0.9, roughness: 0.25 });
    stick.rod([-0.017, 0, 0], [0.017, 0, 0], 0.0026, black, 0.0042);
    const bristles: { at: [number, number, number]; size: number }[] = [];
    for (let i = 0; i < 90; i++) { const t = i / 90, turn = i * 0.9, r = mix(0.0045, 0.0062, t); bristles.push({ at: [mix(-0.017, 0.017, t), Math.cos(turn) * r, Math.sin(turn) * r], size: 0.0011 }); }
    stick.scatter(new THREE.SphereGeometry(1, 6, 4), black, bristles);
    stick.rod([0.017, 0, 0], [0.05, 0, 0], 0.0013, s.material('#c9cdd2', { metalness: 0.8, roughness: 0.3 }));
    stick.rod([0.05, 0, 0], [0.058, 0, 0], 0.0062, gold);
    stick.rod([0.058, 0, 0], [0.135, 0, 0], 0.0062, black, 0.0055);
    wand.add(stick.root);
    const wx = a.state === 'half' ? done + 0.012 : A * 0.35;
    const lashTip = new THREE.Vector3(wx, lash(wx) + mix(-0.4, 0.55, open) * length, lidZ(wx, lash(wx)) + 0.8 * length + 0.006);
    wand.position.copy(lashTip);
    wand.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0.82, -0.2, 0.53).normalize());
    form.add(wand);

    form.position.set(0, 0.142, 0);
    form.rotation.x = -0.3;
    s.root.add(form);

    s.lathe([[0, 0], [0.058, 0], [0.058, 0.006], [0.05, 0.012], [0.014, 0.016], [0.008, 0.03], [0, 0.03]], gold, [0, 0, -0.03]);
    s.rod([0, 0.02, -0.03], [0, 0.125, -0.03], 0.005, gold);
    s.rod([0, 0.125, -0.03], [0, 0.132, -0.008], 0.004, gold);
    // The mascara tube the wand came out of, standing open on the counter.
    const tx = -0.062, tz = 0.05;
    s.cylinder(0.0085, 0.0085, 0.085, [tx, 0.0425, tz], s.material(mood.cheer > 0.5 ? '#e23c97' : '#141218', { roughness: 0.3 }), 18);
    s.cylinder(0.0088, 0.0088, 0.008, [tx, 0.016, tz], gold, 18);
    s.cylinder(0.005, 0.0075, 0.008, [tx, 0.089, tz], gold, 14);
    if (a.state === 'crying' || mood.density > 0.6) {
      const wad = s.ball([0.02, 0.013, 0.018], [0.05 + random() * 0.02, 0.012, 0.06], s.material('#f7f4ec', { roughness: 1 }), 7);
      wad.rotation.set(random(), random() * 3, random());
      if (a.state === 'crying') s.ball([0.007, 0.004, 0.006], [wad.position.x - 0.004, 0.022, wad.position.z + 0.006], s.material('#221c24', { roughness: 1 }), 6);
    }

    const pace = mix(0.4, 3, mood.energy);
    const home = wand.position.clone(), fall = tears.map((drop) => drop.position.y);
    return s.finish({
      update: (_dt, time) => {
        wand.position.y = home.y + Math.sin(time * pace) * 0.004 * (0.3 + mood.energy);
        tears.forEach((drop, i) => { drop.position.y = fall[i] - ((time * pace * 0.003 + i * 0.004) % 0.012); });
      },
    });
  },
});
