import * as THREE from 'three';
import { choice, defineThing, mix, noul } from '@conjure/kit';
import { Bag, TAU, V, arc, blob, field, finish, leaf, matte, paint, tube, xf } from './bits';
import { type Plumage, hummingbird } from './bird';

const BIRDS: Record<string, Plumage & { text: string; reach: number; size: number }> = {
  ruby: { text: 'Ruby-throated male: emerald back, white collar and a gorget of ruby red.', reach: 0.0175, size: 1, back: '#3f8a3a', crown: '#3f8a3a', belly: '#e9e8e0', flank: '#8c9a72', throat: '#e9e8e0', gorget: '#d8183a', gorgetFull: true, hood: false, wing: '#5a5560', tail: '#33402f', tailBand: null, tailTip: '#33402f', bill: '#151314', billTip: '#151314', eyeSpot: '#f0eee6' },
  anna: { text: "Anna's male: green body, the whole head and throat hooded in rose-magenta.", reach: 0.017, size: 1.05, back: '#4c8a4a', crown: '#4c8a4a', belly: '#a9aca2', flank: '#8a9a7a', throat: '#a9aca2', gorget: '#d42a72', gorgetFull: true, hood: true, wing: '#5a5560', tail: '#4a5a46', tailBand: null, tailTip: '#4a5a46', bill: '#151314', billTip: '#151314', eyeSpot: '#f0eee6' },
  rufous: { text: 'Rufous male: blazing orange-cinnamon body and a copper-scarlet gorget, fierce and small.', reach: 0.016, size: 0.95, back: '#c96a2e', crown: '#8e7c3a', belly: '#f2ebe0', flank: '#d8803c', throat: '#f2ebe0', gorget: '#e8482a', gorgetFull: true, hood: false, wing: '#5f5258', tail: '#c4652c', tailBand: '#2b2224', tailTip: '#c4652c', bill: '#151314', billTip: '#151314', eyeSpot: null },
  sabrewing: { text: 'Violet sabrewing: a big tropical hummingbird, deep violet all over, white tail corners and a curved bill.', reach: 0.024, size: 1.35, back: '#5b3f92', crown: '#5b3f92', belly: '#4a3672', flank: '#4d3a78', throat: '#4a3672', gorget: '#7a46c6', gorgetFull: true, hood: true, wing: '#3a3340', tail: '#2a2430', tailBand: null, tailTip: '#f2f2ee', bill: '#151314', billTip: '#151314', eyeSpot: null },
  hen: { text: 'A plain hen: bronze-green above, clean white below, no gorget, white tail tips.', reach: 0.0185, size: 1, back: '#55803f', crown: '#5b7e45', belly: '#ecebe4', flank: '#d7cdb3', throat: '#f1efe8', gorget: null, gorgetFull: false, hood: false, wing: '#5f5862', tail: '#4d7140', tailBand: '#1e1d20', tailTip: '#f4f3ee', bill: '#1a1819', billTip: '#1a1819', eyeSpot: '#f3f1ea' },
};
type Kind = 'ruby' | 'anna' | 'rufous' | 'sabrewing' | 'hen';

export default defineThing({
  questions: {
    bird: choice('Which hummingbird is it?', Object.fromEntries(Object.entries(BIRDS).map(([key, value]) => [key, value.text])) as Record<Kind, string>),
    feeding: choice('What is it feeding from?', {
      trumpet: 'A long red-orange trumpet-vine flower on a leafy stem.',
      fuchsia: 'A hanging fuchsia, pink sepals flared over a purple skirt, the bird reaching up into it from below.',
      salvia: 'A tall spike of scarlet salvia with tubular flowers all round.',
      feeder: 'A red plastic saucer feeder on a pole, yellow flower ports and red sugar water.',
      nestling: 'Its own chick: bill pushed down into the gaping mouth of a nestling in a tiny nest on a twig.',
    }),
    wings: choice('How are the wings caught?', {
      blur: 'A blur: two translucent discs of motion, only the ends of the stroke showing.',
      up: 'Frozen by a flash at the top of the beat, wings raised in a sharp V.',
      down: 'Frozen at the bottom of the beat, wings swept forward and down.',
    }),
    approach: choice('What is it doing in the air?', {
      sipping: 'Holding steady with the bill deep in, drinking.',
      braking: 'Pulling back hard, tail fanned wide as a brake, bill just out.',
      watching: 'Hovering a little way off, head turned to look at us.',
    }),
    flash: noul('Is the throat catching the light and blazing?'),
    pollen: noul('Is its forehead dusted with yellow pollen?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const noise = field(random);
    const kind = BIRDS[a.bird];
    const plant = new Bag();
    const petals = new Bag();
    const glassy = new Bag();
    const leafTone = (t: number, s: number) => new THREE.Color('#4f7f32').lerp(new THREE.Color('#87a84a'), Math.abs(s) * 0.25 + t * 0.2).lerp(new THREE.Color('#9a8a42'), mood.wear * 0.4);

    // ---- The food source. `sip` is where the bill goes; `axis` points out of the opening toward the bird.
    let sip = V(), axis = V(-1, 0, 0);
    if (a.feeding === 'trumpet') {
      const stem = [V(0.03, -0.002, -0.004), V(0.032, 0.03, -0.002), V(0.026, 0.06, 0), V(0.022, 0.075, 0.002)];
      plant.add(tube(stem, (t) => mix(0.0022, 0.0014, t), { sides: 8, smooth: 20 }), '#5f6e34');
      for (const [t, turn] of [[0.35, 0.6], [0.55, 2.6], [0.75, -0.6]] as const) {
        const at = new THREE.CatmullRomCurve3(stem).getPointAt(t);
        plant.add(leaf(0.034, 0.016, { fold: 0.3, droop: 0.25, colour: leafTone }), null, xf(at, 1, new THREE.Euler(-0.4, turn, 0)));
      }
      // The trumpet: a long tube flaring to five lobes, angled up and out toward the bird.
      const base = V(0.022, 0.075, 0.002);
      const dir = V(-0.85, 0.42, 0.18).normalize();
      const profile: THREE.Vector2[] = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        profile.push(new THREE.Vector2(0.0022 + 0.0025 * t + 0.0075 * Math.pow(t, 6), t * 0.048));
      }
      const trumpet = new THREE.LatheGeometry(profile, 20);
      paint(trumpet, (q) => new THREE.Color('#d8582a').lerp(new THREE.Color('#e9342a'), Math.min(1, q.y / 0.048)).lerp(new THREE.Color('#f2b33a'), q.y > 0.045 ? 0.35 : 0));
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir);
      petals.add(trumpet, null, new THREE.Matrix4().compose(base, q, V(1, 1, 1)));
      petals.add(paint(blob(V(0.003, 0.004, 0.003), null), () => '#7a8a3a'), null, xf(base));
      sip = base.clone().addScaledVector(dir, 0.044);
      axis = dir;
    } else if (a.feeding === 'fuchsia') {
      const stem = [V(0.035, -0.002, -0.006), V(0.034, 0.05, -0.004), V(0.025, 0.098, 0), V(0.008, 0.11, 0.002), V(-0.003, 0.104, 0.003)];
      plant.add(tube(stem, (t) => mix(0.002, 0.0011, t), { sides: 8, smooth: 24 }), '#6a3b3e');
      for (const [t, turn] of [[0.3, 0.4], [0.5, 2.8], [0.7, -0.8]] as const) {
        const at = new THREE.CatmullRomCurve3(stem).getPointAt(t);
        plant.add(leaf(0.028, 0.013, { fold: 0.25, droop: 0.3, colour: leafTone }), null, xf(at, 1, new THREE.Euler(-0.3, turn, 0)));
      }
      const hang = V(-0.003, 0.104, 0.003);
      const top = hang.clone().add(V(-0.001, -0.012, 0));
      plant.add(tube([hang, hang.clone().add(V(-0.001, -0.006, 0)), top], 0.0006, { sides: 5 }), '#8a3b46');
      // Ovary, four flared pink sepals, a purple skirt, and long stamens below.
      petals.add(paint(blob(V(0.0022, 0.003, 0.0022), null), () => '#5f2a3a'), null, xf(top));
      const tubeTop = top.clone().add(V(0, -0.002, 0)), skirtTop = tubeTop.clone().add(V(0, -0.009, 0));
      petals.add(tube([tubeTop, skirtTop], (t) => mix(0.0022, 0.003, t), { sides: 10 }), '#e0427a');
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * TAU + 0.4;
        const out = V(Math.cos(angle), 0.55, Math.sin(angle)).normalize();
        petals.add(leaf(0.017, 0.0055, { fold: 0.3, droop: -0.3, colour: (t) => new THREE.Color('#e3417a').lerp(new THREE.Color('#f07aa0'), t) }), null, new THREE.Matrix4().compose(skirtTop, new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), out), V(1, 1, 1)));
      }
      petals.add(paint(blob(V(0.0055, 0.0065, 0.0055), noise, 0.12, 5, 16, 10), (q) => new THREE.Color('#5b2a86').lerp(new THREE.Color('#7b3fa8'), Math.max(0, q.y / 0.0065))), null, xf(skirtTop.clone().add(V(0, -0.005, 0))));
      for (let i = 0; i < 6; i++) {
        const from = skirtTop.clone().add(V(0, -0.008, 0));
        const to = from.clone().add(V((random() - 0.5) * 0.006, -0.014 - random() * 0.004, (random() - 0.5) * 0.006));
        petals.add(tube(arc(from, to, V(0, 0, 0.001), 4), 0.00025, { sides: 4 }), '#e0427a');
        petals.add(new THREE.SphereGeometry(0.0007, 6, 4), '#f2e0c0', xf(to));
      }
      sip = skirtTop.clone().add(V(0, -0.009, 0));
      axis = V(-0.35, -1, 0.15).normalize();
    } else if (a.feeding === 'salvia') {
      const stem = [V(0.02, -0.002, 0), V(0.021, 0.05, 0), V(0.019, 0.11, 0.001)];
      plant.add(tube(stem, (t) => mix(0.0022, 0.0012, t), { sides: 4, smooth: 16 }), '#4f6a30');
      for (const [y, turn] of [[0.018, 0.2], [0.034, 1.8], [0.05, 0.9]] as const)
        for (const s of [0, Math.PI]) plant.add(leaf(0.026, 0.012, { fold: 0.2, droop: 0.2, colour: leafTone }), null, xf(V(0.02, y, 0), 1, new THREE.Euler(-0.45, turn + s, 0)));
      // Whorls of scarlet tubular flowers up the spike.
      let chosen: { at: THREE.Vector3; dir: THREE.Vector3 } | null = null;
      for (let w = 0; w < 6; w++) {
        const y = 0.062 + w * 0.008;
        for (let k = 0; k < 4; k++) {
          const angle = (k / 4) * TAU + w * 0.8;
          const dir = V(Math.cos(angle), 0.35 - w * 0.03, Math.sin(angle)).normalize();
          const at = V(0.02, y, 0.0005);
          const length = 0.018 - w * 0.0015;
          const tip = at.clone().addScaledVector(dir, length);
          petals.add(tube([at, at.clone().addScaledVector(dir, length * 0.6), tip.clone().add(V(0, -0.002, 0))], (t) => mix(0.0012, 0.0024, t * t), { sides: 7 }), '#e0262a');
          petals.add(paint(blob(V(0.0016, 0.001, 0.0024), null), () => '#c41e24'), null, xf(at.clone().addScaledVector(dir, 0.003)));
          if (w === 1 && !chosen && Math.cos(angle) < -0.2) chosen = { at: tip, dir };
        }
      }
      plant.add(tube([V(0.019, 0.11, 0.001), V(0.019, 0.125, 0.001)], (t) => mix(0.0012, 0.0004, t), { sides: 5 }), '#a3242a');
      const pick = chosen ?? { at: V(0.005, 0.07, 0), dir: V(-1, 0.3, 0).normalize() };
      sip = pick.at.clone();
      axis = pick.dir.clone();
    } else if (a.feeding === 'feeder') {
      // A pole and a saucer feeder: clear dish of red nectar under a red lid with yellow ports.
      plant.add(tube([V(0.03, -0.002, 0), V(0.03, 0.05, 0)], 0.0028, { sides: 10 }), '#2b2e2c');
      const lid = new THREE.LatheGeometry([[0.0005, 0.073], [0.03, 0.071], [0.042, 0.066], [0.045, 0.063], [0.044, 0.061], [0.0005, 0.061]].map(([r, y]) => new THREE.Vector2(r, y)), 40);
      petals.add(lid, '#d0212e', xf(V(0.03, 0, 0)));
      const dish = new THREE.LatheGeometry([[0.0005, 0.05], [0.025, 0.051], [0.038, 0.056], [0.043, 0.061], [0.0005, 0.061]].map(([r, y]) => new THREE.Vector2(r, y)), 40);
      glassy.add(dish, '#e04a5a', xf(V(0.03, 0, 0)));
      for (let k = 0; k < 4; k++) {
        const angle = (k / 4) * TAU + Math.PI / 4;
        const at = V(0.03 + Math.cos(angle) * 0.033, 0.0702, Math.sin(angle) * 0.033);
        for (let p = 0; p < 5; p++) {
          const petal = (p / 5) * TAU;
          petals.add(paint(blob(V(0.0028, 0.0006, 0.0018), null), () => '#f5d22a'), null, xf(at.clone().add(V(Math.cos(petal) * 0.0026, 0, Math.sin(petal) * 0.0026)), 1, new THREE.Euler(0, -petal, 0)));
        }
        petals.add(new THREE.SphereGeometry(0.0013, 8, 6), '#e6a91c', xf(at));
      }
      const port = (k: number) => { const angle = (k / 4) * TAU + Math.PI / 4; return V(0.03 + Math.cos(angle) * 0.033, 0.0708, Math.sin(angle) * 0.033); };
      sip = port(2);
      axis = V(-0.55, 1, 0.2).normalize();
    } else {
      // A forked twig post holding a tiny nest, a chick gaping up out of it.
      const post = [V(0.022, -0.002, 0), V(0.02, 0.03, 0.001), V(0.022, 0.05, 0)];
      plant.add(tube(post, (t) => mix(0.0026, 0.0018, t), { sides: 8, smooth: 12 }), '#6d5d4b');
      plant.add(tube([V(0.021, 0.04, 0.001), V(0.03, 0.054, -0.004)], (t) => mix(0.0015, 0.0008, t), { sides: 6 }), '#6d5d4b');
      const cup = new THREE.LatheGeometry([[0.0008, 0], [0.008, 0.001], [0.0135, 0.004], [0.0158, 0.0095], [0.0156, 0.0145], [0.0142, 0.0168], [0.0124, 0.016], [0.0116, 0.012], [0.008, 0.0085], [0.0005, 0.008]].map(([r, y]) => new THREE.Vector2(r, y)), 32);
      paint(cup, (q, n) => ((q.x * n.x + q.z * n.z) / (Math.hypot(q.x, q.z) || 1) < -0.1 ? '#e6dcc7' : new THREE.Color('#8fa392').lerp(new THREE.Color('#b9c2a8'), Math.max(0, Math.sin(q.y * 900 + Math.atan2(q.x, q.z) * 7)))));
      plant.add(cup, null, xf(V(0.022, 0.048, 0)));
      const chick = V(0.022, 0.06, 0.001);
      petals.add(paint(blob(V(0.0045, 0.004, 0.005), noise, 0.05, 4), () => '#4b4146'), null, xf(chick));
      const head = chick.clone().add(V(-0.001, 0.0065, 0.0005));
      petals.add(tube([chick.clone().add(V(0, 0.002, 0)), head], 0.0022, { sides: 8 }), '#4b4146');
      petals.add(paint(blob(V(0.0034, 0.0032, 0.0034), null), () => '#4b4146'), null, xf(head));
      for (const s of [-1, 1]) {
        petals.add(tube([head.clone().add(V(-0.001, 0.002, 0)), head.clone().add(V(-0.003, 0.0065, s * 0.0016))], (t) => mix(0.0016, 0.0003, t), { sides: 6 }), '#e9cf6a');
      }
      petals.add(paint(blob(V(0.0017, 0.0022, 0.0017), null), () => '#f29a2e'), null, xf(head.clone().add(V(-0.0012, 0.0028, 0))));
      sip = head.clone().add(V(-0.0016, 0.0036, 0));
      axis = V(-0.3, 1, 0.1).normalize();
    }
    plant.into(root, matte({ roughness: 0.75, side: THREE.DoubleSide }));
    petals.into(root, matte({ roughness: 0.55, side: THREE.DoubleSide, emissive: '#ff3a2a', emissiveIntensity: mix(0.0, 0.08, mood.cheer) }));
    glassy.into(root, new THREE.MeshStandardMaterial({ roughness: 0.15, transparent: true, opacity: 0.75, depthWrite: true }));

    // ---- The bird, posed, then moved so its bill tip lands on the sip point.
    const approach = a.approach;
    const pitch = a.feeding === 'fuchsia' ? -1.05 : a.feeding === 'feeder' || a.feeding === 'nestling' ? -0.5 : -0.78;
    // The bill should run back along `axis` into the opening; elevation of the bill below or above level.
    const billDir = axis.clone().multiplyScalar(-1);
    const elevation = Math.asin(Math.max(-1, Math.min(1, billDir.y)));
    const nod = Math.max(-1.1, Math.min(1.6, -pitch - elevation - 0.12));
    const bird = hummingbird({
      plumage: kind, wings: a.wings === 'blur' ? 'blur' : a.wings, pitch: approach === 'braking' ? pitch - 0.3 : pitch, puff: 0.95,
      tailSpread: approach === 'braking' ? 0.95 : 0.35, tailLift: approach === 'braking' ? 0.3 : -0.25,
      billLength: kind.reach, headTurn: approach === 'watching' ? 0.9 : 0, headNod: approach === 'watching' ? 0.15 : nod,
      flash: a.flash ? mix(0.75, 1, mood.cheer) : 0.05, warmth: mood.warmth, random, feet: true,
    });
    bird.root.scale.setScalar(kind.size);
    // Face the flower: turn so the bird's forward runs along the bill direction in plan.
    bird.root.rotation.y = Math.atan2(billDir.x, billDir.z);
    if (a.pollen) {
      const dust = new Bag();
      for (let i = 0; i < 14; i++) dust.add(new THREE.SphereGeometry(0.00045, 6, 4), '#f2c62a', xf(V((random() - 0.5) * 0.004, 0.0085 + random() * 0.0012, 0.008 + random() * 0.003)));
      dust.into(bird.head, matte({ emissive: '#f2c62a', emissiveIntensity: 0.3 }));
    }
    root.add(bird.root);
    root.updateMatrixWorld(true);
    const tip = bird.head.localToWorld(bird.billTip.clone());
    const offset = sip.clone().sub(tip);
    // Braking and watching hang back from the flower.
    if (approach === 'braking') offset.addScaledVector(axis, 0.006);
    if (approach === 'watching') offset.addScaledVector(axis, 0.016).add(V(0, 0.004, 0.006));
    else offset.addScaledVector(axis, -0.0045);
    bird.root.position.add(offset);
    const home = bird.root.position.clone();

    // ---- Motion: the body bobs on its wingbeats, the blur flickers.
    const bob = mix(0.0004, 0.0022, mood.energy);
    const rate = mix(3, 9, mood.energy);
    return finish(root, (_dt, time) => {
      bird.root.position.set(home.x + Math.sin(time * rate * 0.5) * bob * 0.6, home.y + Math.sin(time * rate) * bob, home.z + Math.cos(time * rate * 0.7) * bob * 0.4);
      for (const wing of bird.wings) wing.rotation.y = Math.sin(time * 60) * 0.06;
    });
  },
});
