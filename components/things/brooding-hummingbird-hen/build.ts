import * as THREE from 'three';
import { choice, defineThing, mix, noul } from '@conjure/kit';
import { Bag, TAU, V, arc, blob, dewMaterial, field, finish, instances, matte, paint, tube, xf } from './bits';
import { type Plumage, hummingbird, lichenFlake } from './bird';

const HENS: Record<string, Plumage & { text: string }> = {
  ruby: { text: 'Ruby-throated hen: bronze-green back, clean white throat and breast, white tips to the tail.', back: '#55803f', crown: '#5b7e45', belly: '#ecebe4', flank: '#d7cdb3', throat: '#f1efe8', gorget: null, gorgetFull: false, hood: false, wing: '#5f5862', tail: '#4d7140', tailBand: '#1e1d20', tailTip: '#f4f3ee', bill: '#1a1819', billTip: '#1a1819', eyeSpot: '#f3f1ea' },
  anna: { text: "Anna's hen: emerald back, smoky grey breast and a small rose-magenta spot glinting in the throat.", back: '#4c8148', crown: '#56884b', belly: '#b7b8ad', flank: '#9ba68c', throat: '#c9c6bd', gorget: '#c42a6e', gorgetFull: false, hood: false, wing: '#59525d', tail: '#4f6a48', tailBand: '#202022', tailTip: '#ecebe5', bill: '#161415', billTip: '#161415', eyeSpot: '#f0eee6' },
  rufous: { text: 'Rufous hen: green back with warm cinnamon flanks, an orange throat spot and a rust tail.', back: '#6c8e42', crown: '#6a8a40', belly: '#f2ece0', flank: '#d4884a', throat: '#f3ece2', gorget: '#e2632a', gorgetFull: false, hood: false, wing: '#5e5459', tail: '#c8692e', tailBand: '#252022', tailTip: '#f1ebe0', bill: '#171516', billTip: '#171516', eyeSpot: '#f3ede2' },
  'broad-billed': { text: 'Broad-billed hen: blue-green back, grey underparts, a white stripe behind the eye and a coral-red bill.', back: '#3f7c62', crown: '#467a5f', belly: '#a4a8a0', flank: '#8d978d', throat: '#b4b6ae', gorget: null, gorgetFull: false, hood: false, wing: '#4c4752', tail: '#2e4b55', tailBand: null, tailTip: '#cfd2d0', bill: '#d4472f', billTip: '#1b1718', eyeSpot: '#f2f2ee' },
  'violet-crowned': { text: 'Violet-crowned: snow-white below, dull bronze back, a violet cap and a red bill.', back: '#6c7451', crown: '#58507e', belly: '#f7f7f3', flank: '#ecebe5', throat: '#f8f8f4', gorget: null, gorgetFull: false, hood: false, wing: '#524d57', tail: '#6f7556', tailBand: null, tailTip: '#6f7556', bill: '#c94a33', billTip: '#2a2223', eyeSpot: null },
};
type Hen = 'ruby' | 'anna' | 'rufous' | 'broad-billed' | 'violet-crowned';

/** The nest cup's outer and inner wall as one lathe profile, metres. */
const CUP: [number, number][] = ([
  [0.0008, 0], [0.009, 0.0008], [0.0155, 0.004], [0.0195, 0.0105], [0.0213, 0.0175], [0.0214, 0.0235], [0.0203, 0.0275], [0.0184, 0.0293],
  [0.0163, 0.0283], [0.0154, 0.024], [0.0144, 0.018], [0.011, 0.0135], [0.005, 0.0118], [0.0005, 0.0115],
] as [number, number][]).map(([r, y]) => [r * 0.88, y * 0.88]);
const outerRadius = (y: number) => {
  for (let i = 0; i < 7; i++) {
    const [r0, y0] = CUP[i], [r1, y1] = CUP[i + 1];
    if (y >= y0 && y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1);
  }
  return 0.018;
};

export default defineThing({
  questions: {
    hen: choice('What kind of hummingbird hen is she?', Object.fromEntries(Object.entries(HENS).map(([key, value]) => [key, value.text])) as Record<Hen, string>),
    cup: choice('What is she sitting in?', {
      lichen: 'Her own walnut-sized cup of plant down bound with spider silk and shingled with grey-green lichen flakes.',
      mossy: 'A cup felted from green moss and down, soft and dark.',
      cottony: 'A pale fluffy cup of thistle and cottonwood down, almost white.',
      teacup: 'A porcelain espresso cup on a shelf, lined with down: she chose a strange, domestic place.',
      lining: 'Only a pad of plant down under her, as if sunk deep in a larger nest that is not shown.',
    }),
    posture: choice('How is she settled?', {
      low: 'Sunk low and flat, only her back, head, bill and tail clear of the rim.',
      puffed: 'Feathers fluffed out against the cold, round as a ball.',
      rising: 'Half standing, lifting off the eggs to turn them or to leave.',
    }),
    gaze: choice('Where is she looking?', {
      ahead: 'Straight ahead, bill level, calm.',
      sky: 'Bill tipped up at the sky, listening for something overhead.',
      side: 'Head snapped round to one side, watching something close.',
      down: 'Peering down over the rim of the nest.',
      dozing: 'Eyes shut, head drawn in, dozing or in cold-night torpor.',
    }),
    carrying: choice('Is she holding anything in her bill?', {
      nothing: 'Nothing: she is only sitting.',
      down: 'A wisp of pale plant down, to tuck into the lining.',
      silk: 'A long thread of spider silk trailing from her bill to the rim.',
      lichen: 'A single flake of lichen, to add to the outside of the cup.',
    }),
    under: choice('Is anything showing from under her?', {
      nothing: 'Nothing: she covers it all.',
      eggs: 'The curve of two tiny white eggs peeking out at her side.',
      chick: 'A tiny dark nestling beak poking up beside her breast.',
    }),
    wet: noul('Is she beaded with dew or rain?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const noise = field(random);
    const plumage = HENS[a.hen];

    // ---- The cup.
    let seat = 0.0238; // height of her body centre
    let rim = 0.0258;
    const cupBag = new Bag();
    const fibreBag = new Bag();
    const flakes: { matrix: THREE.Matrix4; colour: string }[] = [];
    const shoots: { matrix: THREE.Matrix4; colour: string }[] = [];
    const down = new THREE.Color('#e9e0cc'), downShade = new THREE.Color('#bfb29a');
    const fray = mix(0.4, 1.6, mood.wear);
    const rimFibres = (radius: number, height: number, count: number, tone: () => string) => {
      for (let i = 0; i < count; i++) {
        const angle = random() * TAU;
        const from = V(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        const out = V(Math.cos(angle + (random() - 0.5)), (random() - 0.2) * 0.8, Math.sin(angle + (random() - 0.5))).multiplyScalar((0.002 + random() * 0.004) * fray);
        fibreBag.add(tube(arc(from, from.clone().add(out), V(0, 0.001 * random(), 0), 4), 0.00011, { sides: 3 }), tone());
      }
    };
    if (a.cup === 'lichen' || a.cup === 'mossy' || a.cup === 'cottony') {
      const g = new THREE.LatheGeometry(CUP.map(([r, y]) => new THREE.Vector2(r, y)), 44);
      const pos = g.getAttribute('position');
      const p = V();
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i);
        const push = 1 + noise(p, 260) * 0.05;
        pos.setXYZ(i, p.x * push, p.y, p.z * push);
      }
      g.computeVertexNormals();
      const wall = a.cup === 'mossy' ? new THREE.Color('#4f6a2c') : a.cup === 'cottony' ? new THREE.Color('#e6dcc6') : new THREE.Color('#7d7866');
      paint(g, (q, n) => {
        const radial = (q.x * n.x + q.z * n.z) / (Math.hypot(q.x, q.z) || 1);
        // Inside faces point inward: the down lining. Outside: the wall material.
        const inside = radial < -0.1 || (q.y > 0.024 && n.y > 0.6);
        return inside ? down.clone().lerp(downShade, Math.max(0, 0.6 - n.y) * 0.5) : wall.clone().lerp(new THREE.Color('#5d574b'), Math.max(0, -n.y) * 0.5);
      });
      cupBag.add(g);
      if (a.cup === 'lichen' || a.cup === 'cottony') {
        const palette = a.cup === 'lichen'
          ? ['#8fae9a', '#7a9c8a', '#a3b896', '#5f8577', '#b0bfa0', '#7f97a0'].map((c) => new THREE.Color(c).lerp(new THREE.Color('#a8a08a'), mood.wear * 0.4).getStyle())
          : ['#a9b8a2', '#c3c8b2'];
        const count = a.cup === 'lichen' ? Math.round(mix(110, 170, mood.density)) : 18;
        for (let i = 0; i < count; i++) {
          const y = 0.0025 + random() * 0.0215, angle = random() * TAU, r = outerRadius(y) + 0.0003;
          const n = V(Math.cos(angle), 0.25 + (y < 0.007 ? -0.4 : 0), Math.sin(angle)).normalize();
          const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), random() * TAU));
          const size = 0.0018 + random() * 0.0022;
          flakes.push({ matrix: new THREE.Matrix4().compose(V(Math.cos(angle) * r, y, Math.sin(angle) * r), q, V(size, size, size)), colour: palette[Math.floor(random() * palette.length)] });
        }
      }
      if (a.cup === 'mossy')
        for (let i = 0; i < 320; i++) {
          const y = 0.002 + random() * 0.023, angle = random() * TAU, r = outerRadius(y);
          const n = V(Math.cos(angle), 0.3, Math.sin(angle)).normalize();
          const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n);
          shoots.push({ matrix: new THREE.Matrix4().compose(V(Math.cos(angle) * r, y, Math.sin(angle) * r), q, V(0.0006, 0.0016 + random() * 0.0012, 0.0006)), colour: new THREE.Color('#5f8a2a').lerp(new THREE.Color('#a7b648'), random() * 0.6).lerp(new THREE.Color('#8a7a3a'), mood.wear * 0.4).getStyle() });
        }
      if (a.cup === 'cottony')
        for (let i = 0; i < 140; i++) {
          const y = 0.002 + random() * 0.023, angle = random() * TAU, r = outerRadius(y);
          const from = V(Math.cos(angle) * r, y, Math.sin(angle) * r);
          const to = from.clone().add(V(Math.cos(angle + 1.2) * 0.004, (random() - 0.5) * 0.003, Math.sin(angle + 1.2) * 0.004));
          fibreBag.add(tube(arc(from, to, V(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(0.0012), 4), 0.00014, { sides: 3 }), random() < 0.5 ? '#f3ecdc' : '#ddd2bb');
        }
      // Spider silk binding the walls.
      const silk = new Bag();
      for (let i = 0; i < (a.cup === 'mossy' ? 3 : 6); i++) {
        const y0 = 0.004 + random() * 0.017, tilt = (random() - 0.5) * 0.012, phase = random() * TAU, sweep = 2.5 + random() * 3.5;
        const pts: THREE.Vector3[] = [];
        for (let k = 0; k <= 30; k++) {
          const angle = phase + (k / 30) * sweep, y = y0 + Math.sin(angle) * tilt * 0.5;
          const r = outerRadius(Math.min(0.024, Math.max(0.002, y))) + 0.0012;
          pts.push(V(Math.cos(angle) * r, y, Math.sin(angle) * r));
        }
        silk.add(tube(pts, 0.00012, { sides: 3 }), '#ffffff');
      }
      silk.into(root, matte({ emissive: '#f4f4ff', emissiveIntensity: 0.35, roughness: 0.3 }));
      rimFibres(0.0154, 0.0253, Math.round(40 * fray), () => (random() < 0.5 ? '#f2ebd9' : '#dccfb6'));
    } else if (a.cup === 'teacup') {
      // An espresso cup on its saucer, lined with down to just below the lip.
      const cup = new THREE.LatheGeometry([
        [0.0005, 0.004], [0.017, 0.004], [0.0185, 0.006], [0.0245, 0.018], [0.0285, 0.033], [0.0298, 0.0365], [0.0288, 0.0368], [0.0272, 0.033], [0.0232, 0.018], [0.0005, 0.0075],
      ].map(([r, y]) => new THREE.Vector2(r, y)), 48);
      const band = new THREE.Color(mood.cheer > 0.5 ? '#2f5f9e' : '#6a3e4c');
      paint(cup, (q) => (q.y > 0.0335 && q.y < 0.0362 && Math.hypot(q.x, q.z) > 0.0285 ? band : new THREE.Color('#f6f4ef')));
      cupBag.add(cup);
      const saucer = new THREE.LatheGeometry([[0.0005, 0], [0.03, 0], [0.042, 0.003], [0.046, 0.0055], [0.0445, 0.0058], [0.03, 0.0045], [0.019, 0.0042], [0.0005, 0.0042]].map(([r, y]) => new THREE.Vector2(r, y)), 48);
      paint(saucer, (q) => (Math.hypot(q.x, q.z) > 0.043 ? band : new THREE.Color('#f3f1ec')));
      cupBag.add(saucer);
      const handle = new THREE.TorusGeometry(0.0075, 0.0018, 8, 20, Math.PI * 1.25);
      cupBag.add(handle, '#f4f2ed', xf(V(0.0305, 0.022, 0), 1, new THREE.Euler(0, 0, -Math.PI * 0.62)));
      cupBag.add(paint(blob(V(0.026, 0.004, 0.026), noise, 0.12, 3, 26, 10), () => '#e6dcc7'), null, xf(V(0, 0.03, 0)));
      rimFibres(0.024, 0.033, Math.round(36 * fray), () => (random() < 0.5 ? '#efe7d5' : '#d4c7ad'));
      seat = 0.0345; rim = 0.0368;
    } else {
      // A shallow dish of down with a soft raised rim, so she sits down into it.
      const dish = new THREE.LatheGeometry([[0.0005, 0.0025], [0.012, 0.0032], [0.0185, 0.0068], [0.0218, 0.0092], [0.0242, 0.0074], [0.0255, 0.0035], [0.0245, 0], [0.0005, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 40);
      const dp = dish.getAttribute('position'), q = V();
      for (let i = 0; i < dp.count; i++) {
        q.fromBufferAttribute(dp, i);
        const push = 1 + noise(q, 240) * 0.08;
        dp.setXYZ(i, q.x * push, q.y * (1 + noise(q, 300) * 0.15), q.z * push);
      }
      dish.computeVertexNormals();
      cupBag.add(paint(dish, (_q, n) => down.clone().lerp(downShade, Math.max(0, 0.7 - n.y) * 0.6)));
      rimFibres(0.022, 0.0085, Math.round(50 * fray), () => (random() < 0.5 ? '#efe6d2' : '#d2c4a8'));
      seat = 0.0112; rim = 0.0092;
    }
    cupBag.into(root, matte({ roughness: a.cup === 'teacup' ? 0.35 : 0.95 }));
    fibreBag.into(root, matte({ roughness: 1, emissive: '#fff6e6', emissiveIntensity: 0.1 }));
    const flakeMesh = instances(root, lichenFlake(random), matte({ side: THREE.DoubleSide, roughness: 0.95 }), flakes);
    void flakeMesh;
    const cone = new THREE.ConeGeometry(1, 1, 4);
    cone.translate(0, 0.5, 0);
    instances(root, cone, matte(), shoots);

    // ---- The hen.
    const posture = { low: { lift: 0, puff: 1, pitch: -0.1, tail: 0.5 }, puffed: { lift: 0.0018, puff: 1.2, pitch: -0.05, tail: 0.42 }, rising: { lift: 0.0055, puff: 1, pitch: -0.28, tail: 0.3 } }[a.posture];
    const side = random() < 0.5 ? -1 : 1;
    const gaze = {
      ahead: { turn: 0, nod: -0.08 },
      sky: { turn: side * 0.15, nod: -0.62 },
      side: { turn: side * 1.05, nod: 0.05 },
      down: { turn: side * 0.35, nod: 0.55 },
      dozing: { turn: side * 0.1, nod: 0.3 },
    }[a.gaze];
    const bird = hummingbird({
      plumage, wings: 'folded', pitch: posture.pitch, puff: posture.puff, tailSpread: 0.12, tailLift: posture.tail,
      billLength: a.hen === 'broad-billed' ? 0.0175 : 0.0185, headTurn: gaze.turn, headNod: gaze.nod, flash: mix(0.1, 0.9, mood.cheer), warmth: mood.warmth,
      random, closedEyes: a.gaze === 'dozing',
    });
    bird.root.position.set(0, seat + posture.lift, -0.001);
    if (a.gaze === 'dozing') bird.head.position.add(V(0, -0.0015, -0.0022));
    root.add(bird.root);

    // ---- What she carries.
    const held = new Bag();
    const tip = bird.billTip.clone();
    if (a.carrying === 'down') {
      for (let i = 0; i < 9; i++) {
        const end = tip.clone().add(V((random() - 0.5) * 0.008, -0.002 - random() * 0.005, 0.002 + random() * 0.004));
        held.add(tube(arc(tip, end, V((random() - 0.5) * 0.002, 0.0015, 0), 6), 0.0001, { sides: 3 }), '#f6f0e2');
      }
      held.add(paint(blob(V(0.0018, 0.0014, 0.0018), noise, 0.2, 5, 10, 6), () => '#f1e9d8'), null, xf(tip.clone().add(V(0, -0.001, 0.0008))));
    } else if (a.carrying === 'silk') {
      const end = tip.clone().add(V(0.012, -0.022, -0.004));
      held.add(tube(arc(tip, end, V(0, -0.004, 0.003), 12), 0.00009, { sides: 3 }), '#ffffff');
    } else if (a.carrying === 'lichen') {
      const flake = lichenFlake(random);
      flake.scale(0.0026, 0.0026, 0.0026);
      held.add(paint(flake, () => '#9ab6a2'), null, xf(tip.clone().add(V(0, -0.0006, 0.0006)), 1, new THREE.Euler(1.2, 0.3, 0)));
    }
    held.into(bird.head, matte({ side: THREE.DoubleSide, roughness: 0.9, emissive: '#ffffff', emissiveIntensity: a.carrying === 'silk' ? 0.4 : 0.06 }));

    // ---- What shows from under her.
    const under = new Bag();
    const sx = side * -1;
    if (a.under === 'eggs') {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 16; i++) {
        const t = (i / 16) * Math.PI;
        pts.push(new THREE.Vector2(Math.max(1e-5, Math.sin(t) * 0.0043), -Math.cos(t) * 0.0065));
      }
      for (const k of [0, 1]) {
        const egg = new THREE.LatheGeometry(pts, 20);
        under.add(egg, '#f4f2ec', xf(V(sx * (0.0108 + k * 0.0012), seat - 0.0045 + k * 0.0004, 0.006 - k * 0.0082), 1, new THREE.Euler(Math.PI / 2 + 0.2, 0, 0.15 * sx)));
      }
    } else if (a.under === 'chick') {
      const at = V(sx * 0.0088, seat + 0.003, 0.0105);
      under.add(paint(blob(V(0.0032, 0.003, 0.0034), null), () => '#4a4044'), null, xf(at));
      under.add(new THREE.SphereGeometry(0.0007, 8, 6), '#2a2326', xf(at.clone().add(V(sx * 0.0024, 0.001, 0.0012))));
      under.add(tube([at.clone().add(V(0, 0.0012, 0.002)), at.clone().add(V(0, 0.0055, 0.0042))], (t) => mix(0.0013, 0.0003, t), { sides: 6 }), '#e8c55a');
      under.add(tube([at.clone().add(V(0, 0.0005, 0.0024)), at.clone().add(V(0, 0.0042, 0.0058))], (t) => mix(0.0011, 0.0003, t), { sides: 6 }), '#e0b246');
    }
    under.into(root, matte({ roughness: 0.75 }));

    // ---- Dew.
    if (a.wet) {
      const beads: { matrix: THREE.Matrix4 }[] = [];
      for (let i = 0; i < 26; i++) {
        const onBird = i < 12;
        const size = 0.0004 + random() * (onBird ? 0.0006 : 0.0009);
        const at = onBird
          ? V((random() - 0.5) * 0.009, seat + posture.lift + 0.0075 * posture.puff, (random() - 0.5) * 0.02)
          : (() => { const angle = random() * TAU; return V(Math.cos(angle) * rim * 0.62, rim + 0.0004, Math.sin(angle) * rim * 0.62); })();
        beads.push({ matrix: xf(at, V(size, size * 0.85, size)) });
      }
      instances(root, new THREE.SphereGeometry(1, 14, 10), dewMaterial('#dfe9ee', '#7f8f72', 0.45), beads);
    }

    // ---- Motion: quick watchful head turns and a soft breath.
    const turns = Array.from({ length: 12 }, () => (random() - 0.5) * 1.6);
    const period = mix(3.4, 0.9, mood.energy), reach = mix(0.25, 1, mood.energy) * (a.gaze === 'dozing' ? 0.15 : 1);
    let turn = gaze.turn;
    return finish(root, (dt, time) => {
      const target = gaze.turn + turns[Math.floor(time / period) % turns.length] * reach;
      turn += (target - turn) * Math.min(1, dt * 12);
      bird.head.rotation.y = turn;
      bird.body.scale.y = 1 + Math.sin(time * mix(3, 9, mood.energy)) * 0.012;
    });
  },
});
