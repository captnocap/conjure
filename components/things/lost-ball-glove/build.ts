import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { Batch, aged, paint } from './lib';

type V3 = [number, number, number];
type Kind = 'fielder' | 'catcher' | 'kid' | 'antique';

const LEATHERS = {
  tan: 'Classic saddle tan, honey where it has been oiled.',
  chestnut: 'Deep reddish chestnut brown.',
  blonde: 'Pale blonde leather with dark lacing.',
  black: 'Black leather with tan laces.',
  oxblood: 'Dark oxblood red.',
  blue: 'Bright blue vinyl, a cheap toy-store glove.',
} as const;
const LEATHER_TINT: Record<keyof typeof LEATHERS, string> = { tan: '#a8642c', chestnut: '#6b351b', blonde: '#c99a52', black: '#27221f', oxblood: '#7a2419', blue: '#2458b0' };

const NAMES = {
  tommy: 'TOMMY, in a child\'s block capitals.',
  katie: 'Katie, with a little star.',
  ruiz: 'J. RUIZ and a phone number.',
  seven: 'Just a big number 7.',
  dad: 'DAD.',
  faded: 'Something inked long ago and worn to an unreadable smudge.',
  none: 'Nothing: the strap is blank.',
} as const;
const NAME_TEXT: Record<keyof typeof NAMES, string> = { tommy: 'TOMMY', katie: 'Katie *', ruiz: 'J. RUIZ 555-0142', seven: '# 7', dad: 'DAD', faded: 'mmwvm', none: '' };

const add = (a: V3, d: V3, l: number): V3 => [a[0] + d[0] * l, a[1] + d[1] * l, a[2] + d[2] * l];
const lerp3 = (a: V3, b: V3, t: number): V3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const dir = (heading: number, pitch: number): V3 => [Math.sin(heading) * Math.cos(pitch), Math.sin(pitch), -Math.cos(heading) * Math.cos(pitch)];
/** A point a fraction of the way along a two-segment finger. */
const along = (a: V3, m: V3, t: V3, u: number): V3 => (u < 0.55 ? lerp3(a, m, u / 0.55) : lerp3(m, t, (u - 0.55) / 0.45));

interface GloveOptions { kind: Kind; leather: THREE.Color; dark: THREE.Color; lace: THREE.Color; curl: number; wear: number; random: () => number; topping: THREE.Color | null; cover: number }

/** A glove lying palm up at the origin, fingers toward -z, heel and strap toward +z. Returns where the pocket is. */
function glove(b: Batch, o: GloveOptions) {
  const { leather, dark, lace, curl: c, random } = o;
  const tops: V3[] = [];
  let pocket: V3 = [0, 0.066, -0.012];
  let strapZ = 0.1;
  if (o.kind === 'catcher') {
    b.ball([0.125, 0.04, 0.135], [0, 0.04, 0], leather, 18);
    const rim = new THREE.TorusGeometry(0.098, 0.036, 8, 26, Math.PI * 1.6);
    rim.rotateZ(Math.PI * 0.55);
    b.add(rim, leather, [0, 0.058, 0], [Math.PI / 2, 0, 0], [1.05, 1.2, 0.85]);
    b.ball([0.07, 0.016, 0.08], [0, 0.07, 0], dark, 14);
    b.ball([0.045, 0.04, 0.066], [0.118, 0.06, -0.01], leather, 12, [0, 0.3, 0]);
    b.box([0.07, 0.02, 0.085], [0.074, 0.074, -0.08], dark, [0, -0.75, 0]);
    for (let i = 0; i < 4; i++) b.box([0.075, 0.006, 0.006], [0.062 + i * 0.012, 0.086, -0.1 + i * 0.016], lace, [0, -0.75, 0]);
    b.ball([0.034, 0.034, 0.034], [-0.03, 0.058, -0.125], leather, 10);
    for (let i = 0; i < 16; i++) { const t = 0.6 + i / 16 * 5.3; b.box([0.014, 0.005, 0.005], [Math.cos(t) * 0.105, 0.093, Math.sin(t) * 0.124], lace, [0, -t, 0]); tops.push([Math.cos(t) * 0.105, 0.096, Math.sin(t) * 0.124]); }
    pocket = [0, 0.078, 0];
    strapZ = 0.128;
    b.rod([-0.08, 0.04, 0.115], [0.07, 0.04, 0.118], 0.03, leather, 8);
  } else {
    const fat = o.kind === 'kid' ? 1.22 : o.kind === 'antique' ? 1.12 : 1;
    const long = o.kind === 'kid' ? 0.86 : o.kind === 'antique' ? 0.8 : 1;
    const fan = o.kind === 'antique' ? 1.55 : 1;
    const spec = [{ x: -0.082, h: -0.38, l: 0.13, r: 0.021 }, { x: -0.04, h: -0.16, l: 0.155, r: 0.022 }, { x: 0.003, h: 0.02, l: 0.16, r: 0.022 }, { x: 0.046, h: 0.2, l: 0.15, r: 0.022 }];
    const fingers = spec.map((f) => {
      const floppy = (random() - 0.5) * o.wear * 0.5;
      const p1 = 0.12 + 0.55 * c + floppy, p2 = p1 + 0.2 + 0.7 * c + floppy;
      const a: V3 = [f.x, 0.04, -0.072 + Math.abs(f.x) * 0.25];
      const m = add(a, dir(f.h * fan, p1), f.l * long * 0.55), t = add(m, dir(f.h * fan, p2), f.l * long * 0.45);
      return { a, m, t, r: f.r * fat };
    });
    const th = 0.95 - 0.35 * c, tp = 0.1 + 0.45 * c;
    const ta: V3 = [0.088, 0.04, 0.035], tm = add(ta, dir(th, tp), 0.072), tt = add(tm, dir(th - 0.25 * c, tp + 0.15 + 0.5 * c), 0.058);
    const thumb = { a: ta, m: tm, t: tt, r: 0.027 * fat };
    for (const f of [...fingers, thumb]) {
      b.rod(f.a, f.m, f.r, leather, 10);
      b.rod(f.m, f.t, f.r, leather, 10, f.r * 0.86);
      b.ball([f.r, f.r, f.r], f.m, leather, 10);
      b.ball([f.r * 0.86, f.r * 0.86, f.r * 0.86], f.t, leather, 10);
      // Welting seam down the back of each finger and a lace knot at the tip.
      b.ball([0.007, 0.007, 0.007], add(f.t, [0, 1, 0], f.r * 0.8), lace, 6);
      tops.push(add(f.m, [0, 1, 0], f.r), add(f.t, [0, 1, 0], f.r * 0.86));
    }
    b.ball([0.098, 0.034, 0.1], [-0.012, 0.036, 0], leather, 18);
    b.ball([0.058, 0.012, 0.062], [0, 0.061, -0.012], dark, 14);
    b.ball([0.04, 0.032, 0.05], [0.075, 0.04, 0.045], leather, 12);
    b.rod([-0.095, 0.04, 0.082], [0.07, 0.04, 0.095], 0.031, leather, 10);
    b.ball([0.031, 0.031, 0.031], [-0.095, 0.04, 0.082], leather, 10);
    b.ball([0.031, 0.031, 0.031], [0.07, 0.04, 0.095], leather, 10);
    // Laces tying neighbouring fingers together.
    for (let i = 0; i < 3; i++) for (const u of [0.55, 0.92]) {
      const p = add(along(fingers[i].a, fingers[i].m, fingers[i].t, u), [0, 1, 0], fingers[i].r * 0.9);
      const q = add(along(fingers[i + 1].a, fingers[i + 1].m, fingers[i + 1].t, u), [0, 1, 0], fingers[i + 1].r * 0.9);
      b.rod(p, q, 0.004, lace, 4);
    }
    for (let i = 0; i < 7; i++) b.box([0.013, 0.005, 0.005], [-0.085 + i * 0.024, 0.069, 0.062 + i * 0.002], lace, [0, 0.5, 0]);
    // The web between forefinger and thumb.
    const index = fingers[3];
    if (o.kind === 'antique') b.rod(add(index.m, [0, 1, 0], 0.005), add(thumb.m, [0, 1, 0], 0.005), 0.005, lace, 5);
    else {
      const rungs = [0.18, 0.36, 0.54, 0.72, 0.9, 1].map((u) => [add(along(index.a, index.m, index.t, u), [0.6, 0.5, 0.2], index.r * 0.6), add(along(thumb.a, thumb.m, thumb.t, u), [-0.5, 0.5, -0.5], thumb.r * 0.6)] as const);
      rungs.forEach(([p, q], i) => b.rod(p, q, i === rungs.length - 1 ? 0.012 : 0.0085, dark, 6));
      for (const s of [0.3, 0.7]) for (let i = 0; i < rungs.length - 1; i++) b.rod(lerp3(rungs[i][0], rungs[i][1], s), lerp3(rungs[i + 1][0], rungs[i + 1][1], s), 0.0075, dark, 6);
      b.rod(lerp3(rungs[0][0], rungs[0][1], 0.3), [0.045, 0.05, -0.03], 0.0075, dark, 6);
      b.rod(lerp3(rungs[0][0], rungs[0][1], 0.7), [0.07, 0.05, 0.0], 0.0075, dark, 6);
      for (const [p, q] of rungs) { b.ball([0.006, 0.006, 0.006], p, lace, 5); b.ball([0.006, 0.006, 0.006], q, lace, 5); }
    }
  }
  // Wrist strap with a little round maker's patch.
  b.box([0.125, 0.008, 0.042], [-0.02, 0.066, strapZ], dark, [0.55, 0, 0]);
  b.cyl(0.013, 0.013, 0.005, [0.06, 0.07, strapZ - 0.012], '#b3261e', 10, [0.55, 0, 0]);
  // A lace worked loose and trailing on the ground.
  if (o.wear > 0.35) {
    const side = random() < 0.5 ? -1 : 1;
    let p: V3 = [side * 0.09, 0.05, strapZ - 0.01];
    for (let i = 0; i < 4; i++) { const q: V3 = [p[0] + side * (0.02 + random() * 0.03), i === 0 ? 0.004 : 0.004, p[2] + 0.02 + random() * 0.03]; b.rod(p, q, 0.0035, lace, 4); p = q; }
  }
  if (o.topping) {
    for (const p of tops) if (random() < o.cover) b.ball([0.022 + random() * 0.012, 0.007 + random() * 0.006, 0.024 + random() * 0.014], p, o.topping, 8);
    for (let i = 0; i < 5; i++) if (random() < o.cover) b.ball([0.03, 0.009, 0.022], [-0.085 + i * 0.04, 0.073, strapZ - 0.03 + (random() - 0.5) * 0.015], o.topping, 8);
  }
  return { pocket, strapZ };
}

export default defineThing({
  questions: {
    place: choice('Where has the glove been left?', {
      grass: 'Lying in the outfield grass.',
      dirt: 'On the infield dirt beside a chalk line.',
      post: 'Balanced on top of a wooden fence post so its owner would see it.',
      bench: 'On the end of a dugout bench plank.',
      bucket: 'On an upturned ball bucket with a few loose balls around it.',
    }),
    kind: choice('What kind of glove is it?', {
      fielder: 'A classic fielder\'s glove: four laced fingers, a thumb and a basket web.',
      catcher: 'A fat round catcher\'s mitt, one thick padded ring with a deep pocket.',
      kid: 'A small child\'s first glove with stubby puffy fingers.',
      antique: 'A grandfather\'s glove: short splayed fingers, hardly any web, one lace to the thumb.',
    }),
    leather: choice('What is the leather like?', LEATHERS),
    ball: choice('What is sitting in the pocket?', {
      scuffed: 'A grass-stained, scuffed baseball with red stitches.',
      fresh: 'A bright white new baseball.',
      softball: 'A big yellow softball.',
      tennis: 'A fuzzy green tennis ball, the kind used for a first game of catch.',
      sodden: 'A waterlogged brown ball that has been out for months.',
      empty: 'Nothing: the pocket is empty.',
    }),
    name: choice('What is inked on the wrist strap?', NAMES),
    story: choice('What does the scene around it say about how it was left?', {
      just: 'Dropped a minute ago, a ball cap tossed down beside it: called in for supper.',
      pair: 'Two gloves side by side, a big one and this one: a father and a kid.',
      autumn: 'Left since summer: dry leaves have blown over it.',
      snow: 'Still there in winter under a dusting of snow.',
      overgrown: 'Forgotten for years: grass and daisies growing up through the fingers, moss on the leather.',
      memorial: 'Laid there on purpose with flowers and a candle in a jar.',
    }),
    open: score('How does the glove lie?', ['Curled nearly shut around the pocket', 'Half open', 'Splayed flat and open']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const G = 0.02;
    const snow = a.story === 'snow', overgrown = a.story === 'overgrown';
    const age = Math.min(1, mood.wear * 0.7 + (overgrown ? 0.4 : a.story === 'autumn' || snow ? 0.15 : 0));
    const white = new THREE.Color('#f4f6f8');
    const snowy = (color: THREE.ColorRepresentation) => new THREE.Color(color).lerp(white, snow ? 0.85 : 0);
    const tones = (base: string, kind: Kind) => {
      const leather = aged(base, age * 0.45, a.leather === 'blue' && kind !== 'antique' ? '#7f8ea6' : '#4a3626');
      const dark = new THREE.Color(leather).multiplyScalar(0.62);
      const lace = aged(a.leather === 'blonde' ? '#4b2f1c' : a.leather === 'blue' ? '#f0e9d8' : '#d1a567', age * 0.4, '#6a5a48');
      return { leather, dark, lace };
    };
    const topping = snow ? white : overgrown ? new THREE.Color('#5d7a35') : null;
    const curl = mix(0.85, 0.08, a.open);

    // ----- what it rests on -----
    const set = new Batch();
    const grassTint = () => snowy(new THREE.Color().setHSL(mix(0.2, 0.3, random()), mix(0.4, 0.62, mood.cheer), mix(0.16, 0.25, random())));
    const turf = snowy(new THREE.Color().setHSL(0.27, mix(0.38, 0.58, mood.cheer), 0.2));
    const dirt = snowy(aged('#96552f', mood.wear * 0.2, '#7d6a56'));
    const timber = aged('#8a6a48', 0.25 + mood.wear * 0.5, '#8d8a82');
    let rest: V3 = [0, G, 0];
    let floorR = 0.4, floorZ = 0.75;
    let raised = false;
    const floor = (tint: THREE.Color) => set.add(new THREE.CylinderGeometry(floorR, floorR, G, 28), tint, [0, G / 2, 0], [0, 0, 0], [1, 1, floorZ]);
    if (a.place === 'grass') floor(turf);
    else if (a.place === 'dirt') {
      floor(dirt);
      if (!snow) set.box([0.06, 0.004, 0.5], [-0.2, G + 0.002, -0.02], '#f3f0e6', [0, 0.35, 0]);
      for (let i = 0; i < 9; i++) set.box([0.05, 0.003, 0.012], [(random() - 0.5) * 0.5, G + 0.001, (random() - 0.5) * 0.36], new THREE.Color(dirt).multiplyScalar(0.82), [0, random() * 3, 0]);
    } else if (a.place === 'post') {
      floorR = 0.34; floorZ = 1;
      floor(turf);
      const h = 0.8;
      set.cyl(0.085, 0.095, h, [0, h / 2 + G, 0], timber, 9);
      set.cyl(0.1, 0.085, 0.03, [0, h + G - 0.012, 0], timber, 9);
      for (const y of [0.3, 0.6]) for (const side of [-1, 1]) set.rod([0, y + G, 0], [side * (0.27 + random() * 0.05), y + G + (random() - 0.5) * 0.03, -0.02], 0.034, aged('#8a6a48', 0.4 + mood.wear * 0.4, '#8d8a82'), 6, 0.03);
      rest = [0, h + G, 0.01];
      raised = true;
    } else if (a.place === 'bench') {
      floorR = 0.46; floorZ = 0.62;
      floor(dirt);
      const paintTint = aged(mood.cheer > 0.5 ? '#2f6a4a' : '#6f7479', 0.2 + mood.wear * 0.5, '#8a7a62');
      for (const z of [-0.075, 0.08]) set.box([0.66, 0.04, 0.145], [0, 0.3 + G, z], paintTint, [0, 0, (random() - 0.5) * 0.01]);
      for (const x of [-0.24, 0.24]) { set.box([0.05, 0.28, 0.26], [x, 0.14 + G, 0], '#5e6367'); set.box([0.07, 0.02, 0.32], [x, G + 0.01, 0], '#5e6367'); }
      const seeds = Math.round(mix(4, 40, mood.density));
      for (let i = 0; i < seeds; i++) set.box([0.012, 0.003, 0.006], [(random() - 0.5) * 0.7, G + 0.002, (random() - 0.5) * 0.4 + 0.08], random() < 0.5 ? '#e7e0c8' : '#3a3530', [0, random() * 3, 0]);
      rest = [a.story === 'pair' ? 0 : a.story === 'snow' || a.story === 'autumn' || a.story === 'overgrown' ? 0 : -0.1, 0.32 + G, 0];
    } else {
      floorR = 0.36; floorZ = 1;
      floor(a.kind === 'catcher' ? dirt : turf);
      const plastic = aged('#e6e3d6', mood.wear * 0.3, '#9b9484');
      set.cyl(0.135, 0.155, 0.36, [0, 0.18 + G, 0], plastic, 18);
      set.cyl(0.162, 0.162, 0.025, [0, 0.03 + G, 0], plastic, 18);
      set.cyl(0.146, 0.151, 0.09, [0, 0.19 + G, 0], aged(mood.cheer > 0.5 ? '#c7372b' : '#28508f', mood.wear * 0.3, '#8f8674'), 18);
      set.add(new THREE.TorusGeometry(0.17, 0.004, 4, 16, Math.PI), '#6b7072', [0, 0.05 + G, 0], [1.25, 0, 0]);
      const loose = 1 + Math.round(mood.density * 4);
      for (let i = 0; i < loose; i++) { const t = random() * 6.283, r = 0.22 + random() * 0.09; set.ball([0.0365, 0.0365, 0.0365], [Math.cos(t) * r, G + 0.0365, Math.sin(t) * r], snowy(aged('#efeadc', mood.wear * 0.4 * random(), '#8a7a5a')), 10); }
      rest = [0, 0.36 + G, 0];
      raised = true;
    }
    set.into(s.root, { roughness: 0.92 });

    // ----- the glove -----
    const scale = { fielder: 1, catcher: 1.04, kid: 0.8, antique: 0.9 }[a.kind];
    const put = (kind: Kind, base: string, at: V3, turn: number, size: number, c: number) => {
      const group = new THREE.Group();
      const b = new Batch();
      const info = glove(b, { kind, ...tones(base, kind), curl: c, wear: age, random, topping, cover: snow ? 0.85 : 0.3 });
      b.into(group, { roughness: mix(0.5, 0.85, age) });
      group.position.set(...at);
      group.rotation.y = turn;
      group.scale.setScalar(size);
      s.root.add(group);
      return { group, ...info };
    };
    const pairOnSame = a.story === 'pair' && !raised;
    const mainAt: V3 = [rest[0] + (pairOnSame ? -0.13 : 0), rest[1], rest[2]];
    const main = put(a.kind, LEATHER_TINT[a.leather], mainAt, (random() - 0.5) * 0.7, scale, curl);

    // The name on the strap.
    if (a.name !== 'none') {
      const ink = a.leather === 'black' ? '#d9d9d2' : '#14182b';
      const backing = '#' + tones(LEATHER_TINT[a.leather], a.kind).dark.getHexString(THREE.SRGBColorSpace);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.108, 0.034), new THREE.MeshStandardMaterial({ roughness: 0.85, map: paint(320, 100, (ctx, w, h) => {
        ctx.fillStyle = backing; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = ink; ctx.globalAlpha = a.name === 'faded' ? 0.3 : mix(0.95, 0.6, age);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold ${a.name === 'ruiz' ? 40 : 64}px "Comic Sans MS", "Marker Felt", cursive`;
        ctx.translate(w / 2, h / 2); ctx.rotate((random() - 0.5) * 0.08);
        ctx.fillText(NAME_TEXT[a.name], 0, 4, w - 20);
      }) }));
      label.position.set(-0.03, 0.066 + 0.0048 * 0.85, main.strapZ + 0.0048 * 0.52);
      label.rotation.x = -(Math.PI / 2 - 0.55);
      main.group.add(label);
    }

    // The ball in the pocket.
    if (a.ball !== 'empty') {
      const r = { scuffed: 0.0365, fresh: 0.0365, softball: 0.047, tennis: 0.033, sodden: 0.0365 }[a.ball];
      const cover = { scuffed: '#e9e3d2', fresh: '#f6f3ea', softball: '#d9dc3a', tennis: '#c3d939', sodden: '#8c7350' }[a.ball];
      const seam = a.ball === 'tennis' ? '#f3f3ea' : a.ball === 'sodden' ? '#5a2a20' : '#c0261c';
      const scuffs = a.ball === 'scuffed' ? 26 : a.ball === 'sodden' ? 40 : a.ball === 'fresh' ? 0 : 8;
      const texture = paint(512, 256, (ctx, w, h) => {
        ctx.fillStyle = cover; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < scuffs; i++) {
          ctx.fillStyle = random() < 0.5 ? 'rgba(92,110,48,0.35)' : 'rgba(96,66,40,0.4)';
          ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 8 + random() * 30, 4 + random() * 12, random() * 3, 0, 6.3); ctx.fill();
        }
        const y = (x: number) => h / 2 - Math.sin((x / w) * Math.PI * 4) * h * 0.27;
        ctx.strokeStyle = seam; ctx.lineWidth = a.ball === 'tennis' ? 9 : 2;
        ctx.beginPath(); for (let x = 0; x <= w; x += 4) ctx.lineTo(x, y(x)); ctx.stroke();
        if (a.ball !== 'tennis') { ctx.lineWidth = 3.5; for (let x = 0; x < w; x += 9) { const slope = (y(x + 2) - y(x - 2)) / 4, n = Math.hypot(1, slope); for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y(x)); ctx.lineTo(x + (-slope / n) * 9 * side + 4 / n, y(x) + (1 / n) * 9 * side + (4 * slope) / n); ctx.stroke(); } } }
      });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshStandardMaterial({ map: texture, roughness: a.ball === 'tennis' ? 1 : 0.7 }));
      ball.castShadow = ball.receiveShadow = true;
      ball.position.set(main.pocket[0], main.pocket[1] + r * 0.82, main.pocket[2]);
      ball.rotation.set(random() * 6, random() * 6, random() * 6);
      main.group.add(ball);
      if (snow) { const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.8, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: white, roughness: 1 })); cap.position.copy(ball.position).y += r * 0.45; cap.scale.y = 0.6; cap.castShadow = true; main.group.add(cap); }
    }

    // ----- the story around it -----
    const extra = new Batch();
    const sideY = raised ? G : rest[1];
    const spot = (side: number): V3 => raised ? [side * 0.2, G, 0.17] : [rest[0] + (a.place === 'bench' ? 0.3 : side * 0.25), sideY, rest[2] + 0.02];
    let flame: THREE.MeshStandardMaterial | null = null;
    if (a.story === 'just') {
      const [x, y, z] = spot(-1);
      const team = new THREE.Color().setHSL([0.0, 0.6, 0.35, 0.08][Math.floor(random() * 4)], mix(0.35, 0.75, mood.cheer), 0.3);
      const crown = new THREE.SphereGeometry(0.085, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const turn = 0.6 + random() * 0.8;
      extra.add(crown, team, [x, y, z], [0, turn, 0], [1, 0.82, 1.05]);
      extra.add(new THREE.CylinderGeometry(0.075, 0.075, 0.007, 14), new THREE.Color(team).multiplyScalar(0.75), [x + Math.sin(turn) * 0.085, y + 0.006, z + Math.cos(turn) * 0.085], [0, turn, 0], [1, 1, 0.95]);
      extra.ball([0.012, 0.008, 0.012], [x, y + 0.071, z], '#f1ede0', 6);
      extra.box([0.03, 0.03, 0.004], [x + Math.sin(turn) * 0.082, y + 0.035, z + Math.cos(turn) * 0.082], '#f1ede0', [-0.35, turn, 0]);
    } else if (a.story === 'pair') {
      const at: V3 = raised ? [0.02, G, 0.2] : [rest[0] + 0.29, rest[1], rest[2] - 0.01];
      const other = a.leather === 'chestnut' ? LEATHER_TINT.tan : LEATHER_TINT.chestnut;
      put(a.kind === 'kid' || a.kind === 'antique' ? 'fielder' : a.kind === 'catcher' ? 'fielder' : 'antique', other, at, -0.3 + (random() - 0.5) * 0.4, a.kind === 'kid' ? 1.08 : 1.12, mix(0.1, 0.5, random()));
      if (a.kind !== 'kid') main.group.scale.multiplyScalar(0.84);
    } else if (a.story === 'memorial') {
      const [x, y, z] = spot(-1);
      extra.cyl(0.032, 0.03, 0.085, [x, y + 0.0425, z], '#a3261c', 12);
      extra.cyl(0.034, 0.034, 0.008, [x, y + 0.085, z], '#d7d2c2', 12);
      const flameMesh = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), (flame = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb648', emissiveIntensity: 2.4 })));
      flameMesh.scale.y = 1.8; flameMesh.position.set(x, y + 0.108, z);
      s.root.add(flameMesh);
      const [fx, fy, fz] = spot(1);
      const petals = ['#f3efe2', '#e8c33a', '#d9698a', '#f3efe2', '#b85ad1'];
      for (let i = 0; i < 6; i++) {
        const lean = (i - 2.5) * 0.14, len = 0.19 + random() * 0.05;
        const head: V3 = [fx + Math.sin(lean) * len * 0.6 - 0.02, fy + 0.03 + random() * 0.025, fz - Math.cos(lean) * len + 0.12];
        extra.rod([fx, fy + 0.012, fz + 0.12], head, 0.004, '#4c7a3a', 4);
        extra.ball([0.022, 0.014, 0.022], head, petals[i % petals.length], 8);
        extra.ball([0.008, 0.012, 0.008], head, '#e8c33a', 6);
      }
      extra.add(new THREE.ConeGeometry(0.035, 0.11, 8, 1, true), '#e9e4d2', [fx, fy + 0.02, fz + 0.09], [Math.PI / 2 - 0.1, 0, 0]);
      extra.box([0.06, 0.002, 0.045], [fx - 0.06, fy + 0.002, fz + 0.02], '#f4f1e6', [0, 0.3, 0]);
    } else if (a.story === 'autumn') {
      const leaves = Math.round(mix(10, 34, mood.density));
      const shades = ['#b5521c', '#c98a1e', '#7a3a1a', '#a12f1a', '#d0a23a'];
      for (let i = 0; i < leaves; i++) {
        const onGlove = i < 3 && !raised;
        const t = random() * 6.283, r = Math.sqrt(random()) * (floorR - 0.05);
        const at: V3 = onGlove ? [mainAt[0] + (random() - 0.5) * 0.16, mainAt[1] + 0.072 * scale, mainAt[2] + 0.07 * scale + (random() - 0.5) * 0.03] : [Math.cos(t) * r, (a.place === 'bench' && Math.abs(Math.sin(t) * r * floorZ) < 0.14 && Math.abs(Math.cos(t) * r) < 0.32 ? rest[1] : G) + 0.004 + random() * 0.006, Math.sin(t) * r * floorZ];
        extra.add(new THREE.OctahedronGeometry(1, 0), shades[Math.floor(random() * shades.length)], at, [(random() - 0.5) * 0.5, random() * 6, (random() - 0.5) * 0.5], [0.028 + random() * 0.018, 0.0025, 0.018 + random() * 0.012]);
      }
    } else if (snow) {
      for (let i = 0; i < 9; i++) { const t = random() * 6.283, r = Math.sqrt(random()) * (floorR - 0.08); extra.ball([0.05 + random() * 0.06, 0.012, 0.05 + random() * 0.05], [Math.cos(t) * r, G, Math.sin(t) * r * floorZ], white, 8); }
      if (a.place === 'bench') extra.box([0.64, 0.012, 0.29], [0, rest[1] + 0.004 - 0.02, 0], white);
      if (a.place === 'post') extra.ball([0.1, 0.02, 0.1], [0, rest[1] - 0.004, 0], white, 10);
    } else if (overgrown) {
      for (let i = 0; i < 7; i++) {
        const t = random() * 6.283, r = 0.14 + random() * (floorR - 0.19), h = 0.05 + random() * 0.05;
        const foot: V3 = [Math.cos(t) * r, G, Math.sin(t) * r * floorZ];
        extra.rod(foot, [foot[0], G + h, foot[2]], 0.003, '#4c7a3a', 4);
        extra.cyl(0.018, 0.018, 0.004, [foot[0], G + h, foot[2]], '#f4f1e6', 8, [0.3, 0, 0.2]);
        extra.ball([0.007, 0.005, 0.007], [foot[0], G + h + 0.003, foot[2]], '#e8c33a', 6);
      }
    }
    extra.into(s.root, { roughness: 0.9 });

    // ----- grass -----
    const grassy = a.place === 'grass' || a.place === 'post' || (a.place === 'bucket' && a.kind !== 'catcher');
    const tufts = Math.round((grassy ? mix(30, 85, mood.density) : mood.wear * 10) * (overgrown ? 1.5 : 1) + (overgrown ? 24 : 0));
    if (tufts) {
      const blade = new THREE.ConeGeometry(0.007, 0.06, 4);
      blade.translate(0, 0.03, 0);
      s.scatter(blade, new THREE.MeshStandardMaterial({ roughness: 0.9 }), Array.from({ length: tufts }, (_unused, i) => {
        const through = overgrown && !raised && i < 5;
        const t = random() * 6.283, r = through ? 0.05 + random() * 0.1 : Math.sqrt(random()) * (floorR - 0.02);
        const at: V3 = through ? [mainAt[0] + Math.cos(t) * r, G, mainAt[2] + Math.sin(t) * r - 0.07] : [Math.cos(t) * r, G, Math.sin(t) * r * floorZ];
        return { at, size: (through ? 1.2 : 0.4) + random() * (overgrown ? 1.1 : 0.6), color: grassTint() };
      }));
    }

    const flicker = mix(0.3, 1, mood.energy);
    return s.finish({
      footprint: floorR,
      update: flame ? (_dt, time) => { flame!.emissiveIntensity = 2.2 + Math.sin(time * 11 * flicker) * 0.5 + Math.sin(time * 27 * flicker) * 0.3; } : undefined,
    });
  },
});
