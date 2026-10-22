import * as THREE from 'three';
import { choice, defineThing, mix, score } from '@conjure/kit';
import { Bag, type Tone, V, aim, arc, dewMaterial, finish, matte, tube, xf } from './bits';

const PREY = {
  housefly: { thorax: '#55514d', abdomen: '#9a8962', band: '#3d3832', eye: '#7c2c20', metal: 0.1 },
  bluebottle: { thorax: '#27314e', abdomen: '#2456a8', band: '#16305f', eye: '#742c22', metal: 0.75 },
  greenbottle: { thorax: '#2f8a4c', abdomen: '#3aa55a', band: '#1d6a3a', eye: '#8c3a22', metal: 0.75 },
  hoverfly: { thorax: '#3d3024', abdomen: '#f0b92a', band: '#1f1a16', eye: '#5c2b1c', metal: 0.05 },
  fruitfly: { thorax: '#b8884c', abdomen: '#c99a58', band: '#5a4026', eye: '#c9281a', metal: 0.05 },
} as const;

export default defineThing({
  questions: {
    wrapping: score('How thoroughly is it wrapped?', ['A few loops of silk: still plainly a fly', 'Half bound, wings pinned', 'A tight white mummy, only a shape']),
    free: choice('What part is still free?', {
      wing: 'One wing sticks out of the shroud at a bad angle.',
      leg: 'A single leg pokes out, hooked at the air.',
      head: 'The head is left bare, the big eyes looking out.',
      wings: 'Both wings splay out like a broken fan.',
      nothing: 'Nothing: it is sealed in completely.',
    }),
    prey: choice('What kind of fly was it?', {
      housefly: 'A grey housefly with brick-red eyes.',
      bluebottle: 'A fat metallic bluebottle.',
      greenbottle: 'A glittering greenbottle.',
      hoverfly: 'A hoverfly in wasp stripes of yellow and black, harmless after all.',
      fruitfly: 'A small tan fruit fly with bright red eyes.',
    }),
    hang: choice('How is it kept?', {
      thread: 'Hanging alone on one thread from the tip of a bent grass stem.',
      web: 'Pinned in a scrap of web between two stems, guyed by several threads.',
      larder: 'One of a row of bundles hung along a stem at different heights: a larder.',
      fallen: 'Cut loose and lying on a leaf on the ground, its thread trailing.',
    }),
    state: choice('What is happening to it now?', {
      struggling: 'Still fighting: the free part buzzes and the bundle swings.',
      still: 'Quiet. It has stopped moving.',
      husk: 'Long since drained: a shrunken, dented, grey husk.',
      dewy: 'Left overnight: the shroud is beaded with dew.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group(), pend = new THREE.Group(), bundle = new THREE.Group(), flap = new THREE.Group();
    const plant = new Bag(), silk = new Bag(), dew = new Bag(), body = new Bag(), wing = new Bag(), loose = new Bag(), looseWing = new Bag();
    const tone = (c: Tone, lift = 0) => new THREE.Color(c).offsetHSL((mood.warmth - 0.5) * 0.03, (mood.cheer - 0.5) * 0.2, lift);
    const husk = a.state === 'husk', prey = PREY[a.prey];
    const fade = (c: Tone) => (husk ? tone(c).lerp(new THREE.Color('#6d655a'), 0.55) : tone(c));
    const s = 0.036 * (a.prey === 'fruitfly' ? 0.85 : 1);
    const c = a.wrapping;
    const silkTone = new THREE.Color('#ecebe4').lerp(new THREE.Color('#cdbf96'), mood.wear * 0.6 + (husk ? 0.3 : 0));
    const silkShade = silkTone.clone().multiplyScalar(0.72);
    const shrouded = c > 0.25;
    const headFree = a.free === 'head';
    const top = shrouded ? (a.free === 'nothing' ? 2.5 : Math.min(mix(0.3, 2.5, (c - 0.25) / 0.75), headFree ? 1.0 : 9)) : 1.2;
    const thin = husk ? 0.8 : 1;

    // The fly, in units of its thorax radius. The head is at +y, its back faces +z.
    const thoraxTone = fade(prey.thorax), bandTone = fade(prey.band);
    body.add(new THREE.SphereGeometry(1, 18, 12), thoraxTone, xf(V(0, 0, 0), V(1 * thin, 1.15, 0.95 * thin)));
    for (const x of [-0.35, 0.35]) body.add(new THREE.SphereGeometry(1, 8, 6), bandTone, xf(V(x, 0, 0.72 * thin), V(0.1, 0.9, 0.3)));
    body.add(new THREE.SphereGeometry(1, 14, 10), thoraxTone.clone().offsetHSL(0, 0, -0.04), xf(V(0, 1.5, 0), V(0.72, 0.62, 0.66)));
    for (const side of [-1, 1]) {
      body.add(new THREE.SphereGeometry(1, 14, 10), fade(prey.eye), xf(V(side * 0.45, 1.62, 0.12), V(0.46, 0.56, 0.52)));
      body.add(tube([V(side * 0.12, 2.05, 0.2), V(side * 0.18, 2.3, 0.35)], 0.05, { sides: 4 }), bandTone);
    }
    body.add(tube([V(0, 1.9, -0.3), V(0, 2.25, -0.55), V(0, 2.3, -0.8)], (t) => mix(0.12, 0.2, t), { sides: 6 }), bandTone);
    const abdomen = new THREE.SphereGeometry(1, 22, 16);
    {
      const p = abdomen.getAttribute('position'), colours = new Float32Array(p.count * 3), tint = new THREE.Color();
      const base = fade(prey.abdomen);
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i), x = p.getX(i), z = p.getZ(i);
        const banded = Math.sin(y * 9 + 1) > (a.prey === 'hoverfly' ? 0.1 : 0.72);
        tint.copy(base);
        if (banded || (a.prey === 'housefly' && Math.abs(x) < 0.12 && z > 0)) tint.copy(bandTone);
        colours.set([tint.r, tint.g, tint.b], i * 3);
        if (husk) p.setXYZ(i, x * (1 - 0.2 * Math.sin(y * 7) ** 2), y, z * (1 - 0.25 * Math.sin(y * 5 + 1) ** 2));
      }
      abdomen.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      abdomen.computeVertexNormals();
    }
    body.add(abdomen, null, xf(V(0, -2.2, 0), V(0.95 * thin, 1.5, 0.85 * thin)));

    // Wings and legs: pinned flat, hidden by the shroud, or left sticking out.
    const wingTone = tone('#a9b8bf'), vein = tone('#4f575b');
    const addWing = (bag: Bag, side: number, splay: number, liftZ: number) => {
      const turn = new THREE.Euler(liftZ * side * 0 - liftZ, 0, side * splay);
      const base = V(side * 0.5, 0.45, 0.78 + liftZ * 0.3);
      const blade = new THREE.SphereGeometry(1, 14, 8);
      blade.translate(0, -1, 0);
      bag.add(blade, wingTone, xf(base, V(0.62, 1.75, 0.025), turn));
      for (const offset of [-0.25, 0.05, 0.3]) {
        const line = tube([V(0, 0, 0.04), V(offset * 0.6, -1.6, 0.05), V(offset, -3.1, 0.04)], 0.045, { sides: 4, smooth: 6 });
        bag.add(line, vein, xf(base, 1, turn));
      }
    };
    const legPath = (side: number, i: number, out: boolean) => {
      const y = 0.5 - i * 0.5, start = V(side * 0.6, y, -0.55);
      if (out) return [start, V(side * 1.9, y + 0.7, -1.0), V(side * 2.9, y + 0.1, -0.7), V(side * 3.4, y - 0.8, -0.9), V(side * 3.25, y - 1.1, -1.1)];
      return [start, V(side * 1.25, y + 0.25, -1.0), V(side * 0.75, y - 0.5, -1.25), V(side * 0.3, y - 0.75, -1.05)];
    };
    const freeSide = random() < 0.5 ? -1 : 1;
    for (const side of [-1, 1]) {
      const out = (a.free === 'wing' && side === freeSide) || a.free === 'wings';
      if (out) addWing(looseWing, side, -(0.95 + random() * 0.5), 0.45);
      else if (!shrouded || top < 0.2) addWing(wing, side, -0.14, 0);
      for (let i = 0; i < 3; i++) {
        const legOut = a.free === 'leg' && side === freeSide && i === 1;
        if (!legOut && shrouded) continue;
        (legOut ? loose : body).add(tube(legPath(side, i, legOut), (t) => mix(0.1, 0.04, t), { sides: 5 }), bandTone);
      }
    }

    // The shroud: a lumpy cocoon wound on the diagonal, and raised turns of thread over it.
    const bottom = -3.95, mid = (top + bottom) / 2, half = (top - bottom) / 2;
    const girth = (y: number) => {
      const t = Math.min(1, Math.abs((y - mid) / half));
      return Math.sqrt(Math.max(0.03, 1 - t * t)) * (1 - 0.12 * Math.exp(-(((y + 0.95) / 0.45) ** 2)));
    };
    if (shrouded) {
      const cocoon = new THREE.SphereGeometry(1, 28, 20);
      const p = cocoon.getAttribute('position'), colours = new Float32Array(p.count * 3), tint = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ly = mid + y * half, around = Math.atan2(z, x);
        const lump = 1 + (husk ? 0.1 : 0.04) * Math.sin(ly * 4 + around * 2) - 0.12 * Math.exp(-(((ly + 0.95) / 0.45) ** 2));
        p.setXYZ(i, x * 1.32 * thin * lump, ly, z * 1.26 * thin * lump);
        tint.copy(silkTone).lerp(silkShade, 0.5 + 0.5 * Math.sin(ly * 14 + around * 5));
        colours.set([tint.r, tint.g, tint.b], i * 3);
      }
      cocoon.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      cocoon.computeVertexNormals();
      silk.add(cocoon, null);
    }
    const loops = Math.round(mix(4, 15, c)), steps = loops * 14, wind: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, y = mix(bottom + 0.3, top - 0.15, t), angle = t * loops * Math.PI * 2;
      const r = (shrouded ? 1.34 * girth(y) : 1.08 * Math.max(0.5, girth(y))) * thin + 0.03;
      wind.push(V(Math.cos(angle) * r * 1.02, y, Math.sin(angle) * r));
    }
    silk.add(tube(wind, 0.04, { sides: 4 }), silkShade.clone().lerp(silkTone, 0.3));
    const back: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i += 2) {
      const t = i / steps, y = mix(top - 0.3, bottom + 0.5, t), angle = -t * loops * 0.45 * Math.PI * 2;
      const r = (shrouded ? 1.35 * girth(y) : 1.09 * Math.max(0.5, girth(y))) * thin + 0.03;
      back.push(V(Math.cos(angle) * r * 1.02, y, Math.sin(angle) * r));
    }
    silk.add(tube(back, 0.035, { sides: 4 }), silkShade);
    if (a.state === 'dewy') for (let i = 0; i < 26; i++) {
      const y = mix(bottom + 0.4, top - 0.2, random()), angle = random() * Math.PI * 2, r = 1.36 * girth(y) * thin;
      dew.add(new THREE.SphereGeometry(1, 8, 6), null, xf(V(Math.cos(angle) * r, y, Math.sin(angle) * r), 0.09 + random() ** 2 * 0.16));
    }

    const flyMaterial = matte({ roughness: mix(0.45, 0.75, mood.wear), metalness: husk ? 0 : prey.metal });
    body.into(bundle, flyMaterial);
    wing.into(bundle, matte({ roughness: 0.3, transparent: true, opacity: 0.7 }));
    const silkMaterial = () => matte({ roughness: 0.6, emissive: '#5c5a52', emissiveIntensity: 0.2 });
    silk.into(bundle, silkMaterial());
    const glass = dewMaterial('#cfe6f5', '#7d9c8c', 0.3);
    dew.into(bundle, glass);
    loose.into(flap, flyMaterial.clone());
    looseWing.into(flap, matte({ roughness: 0.3, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    bundle.add(flap);
    bundle.scale.setScalar(s);

    // How it is kept.
    const threads = new Bag();
    const green = new THREE.Color('#6f9a45').lerp(new THREE.Color('#c2a865'), mood.wear * 0.8 + (1 - mood.cheer) * 0.12);
    const line = '#8d9aa5', thread = 0.0014;
    const tuft = (x: number, z = 0) => {
      for (let i = 0; i < 4; i++) {
        const base = V(x + (random() - 0.5) * 0.03, 0, z + (random() - 0.5) * 0.03);
        plant.add(tube(arc(base, base.clone().add(V((random() - 0.5) * 0.12, 0.05 + random() * 0.09, (random() - 0.5) * 0.1)), V(0, 0.02, 0), 6), (t) => mix(0.008, 0.001, t), { sides: 5, flat: 0.2 }), green.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1));
      }
    };
    const tail = bottom * s;
    let swing = 0;
    if (a.hang === 'fallen') {
      const leafTone = tone('#7d9a4a').lerp(new THREE.Color('#a8703a'), mood.wear * 0.8);
      const leaf = arc(V(-0.21, 0.004, 0.02), V(0.23, 0.012, -0.03), V(0, 0.006, 0), 12);
      plant.add(tube(leaf, (t) => 0.004 + 0.12 * Math.sin(Math.min(1, t * 1.08) * Math.PI) ** 0.75, { sides: 10, flat: 0.06, up: V(0, 1, 0) }), leafTone);
      plant.add(tube(leaf.map((p) => p.clone().add(V(0, 0.005, 0))), 0.002, { sides: 4 }), leafTone.clone().offsetHSL(0, 0, -0.1));
      plant.add(tube([V(-0.21, 0.004, 0.02), V(-0.27, 0.008, 0.03)], 0.003, { sides: 5 }), leafTone.clone().offsetHSL(0, 0, -0.1));
      bundle.position.set(0.02, 1.3 * s + 0.014, 0);
      bundle.rotation.set(0.25, 0.3, Math.PI / 2 + 0.15);
      root.add(bundle);
      threads.add(tube([V(0.02 + tail * -1, 0.02, 0), V(0.2, 0.014, 0.05), V(0.17, 0.012, 0.11), V(0.24, 0.006, 0.12)], thread, { sides: 4, smooth: 14 }), line);
    } else {
      let anchor: THREE.Vector3;
      const drop = a.hang === 'web' ? 0 : mix(0.035, 0.06, random());
      if (a.hang === 'web') {
        anchor = V(0, 0.3, 0);
        const posts = [-0.17, 0.17].map((x) => { const lean = (random() - 0.5) * 0.04; return arc(V(x + lean, 0, 0), V(x, 0.47 + random() * 0.04, 0), V(lean * 0.4, 0, 0), 10); });
        for (const post of posts) { plant.add(tube(post, (t) => mix(0.007, 0.003, t), { sides: 6 }), green); tuft(post[0].x); }
        const hold = anchor.clone().add(V(0, -1.3 * s, 0));
        for (const post of posts) for (const i of [3, 5, 7, 9]) threads.add(tube([post[i], hold.clone().add(V(0, (i - 6) * 0.03, 0))], thread, { sides: 4 }), line);
        for (const i of [4, 6, 8]) threads.add(tube([posts[0][i], posts[0][i].clone().lerp(posts[1][i + 1], 0.5).add(V(0, -0.012, 0)), posts[1][i + 1]], thread * 0.8, { sides: 4, smooth: 10 }), line);
      } else {
        const lean = a.hang === 'larder' ? 0.24 : 0.16;
        const stem = [V(-lean, 0, 0), V(-lean * 0.95, 0.23, 0), V(-lean * 0.7, 0.42, 0), V(-lean * 0.25, 0.51, 0), V(lean * 0.3, 0.51, 0), V(lean * 0.75, 0.45, 0), V(lean * 1.0, 0.38, 0)];
        const curve = new THREE.CatmullRomCurve3(stem).getPoints(28);
        plant.add(tube(curve, (t) => mix(0.008, 0.0028, t), { sides: 6 }), green);
        tuft(-lean);
        plant.add(tube(arc(curve[7], curve[7].clone().add(V(-0.1, 0.08, 0.03)), V(0, 0.03, 0), 8), (t) => mix(0.009, 0.001, t), { sides: 5, flat: 0.18 }), green);
        anchor = curve[a.hang === 'larder' ? 17 : 19].clone();
        if (a.hang === 'larder') {
          // Older bundles further along: plain cocoons, yellowed.
          const old = silkTone.clone().lerp(new THREE.Color('#bda974'), 0.45);
          [[12, 0.12, 1.5], [23, 0.05, 1.25], [27, 0.12, 1.0]].slice(0, 2 + Math.round(mood.density)).forEach(([index, fall, size]) => {
            const from = curve[index], at = from.clone().add(V(0, -fall - 0.03, 0));
            threads.add(tube([from, at], thread, { sides: 4 }), line);
            const lump = new THREE.SphereGeometry(1, 14, 10);
            threads.add(lump, old.clone().offsetHSL(0, 0, (random() - 0.5) * 0.08), xf(at.clone().add(V(0, -0.03 * size, 0)), V(0.021 * size, 0.04 * size, 0.02 * size), new THREE.Euler(0, 0, (random() - 0.5) * 0.5)));
            for (let k = 0; k < 4; k++) threads.add(new THREE.TorusGeometry(0.021 * size * Math.sin(((k + 1) / 5) * Math.PI) + 0.001, 0.0012, 4, 12), old.clone().multiplyScalar(0.75), xf(at.clone().add(V(0, -0.03 * size + (k - 1.5) * 0.016 * size, 0)), 1, new THREE.Euler(Math.PI / 2 + 0.25, 0, 0.2)));
          });
        }
      }
      // Head down on its thread, turned a little.
      pend.position.copy(anchor);
      bundle.position.set(0, -drop + tail, 0);
      bundle.rotation.set(0, random() * 6.28, Math.PI);
      const tilt = new THREE.Group();
      tilt.rotation.z = (random() - 0.5) * 0.5;
      tilt.add(bundle);
      if (a.hang !== 'web') {
        const cord = new Bag().add(tube([V(0, 0, 0), V(0, -drop - 0.006, 0)], thread, { sides: 4 }), line);
        pend.add(tilt);
        cord.into(pend, silkMaterial());
        tilt.rotation.z *= 0.4;
      } else pend.add(tilt);
      root.add(pend);
      swing = a.hang === 'web' ? 0.02 : 0.1;
    }
    // Worn silk frays into loose ends.
    for (let i = 0; i < Math.round(mood.wear * 3 + mood.density); i++) {
      const from = V((random() - 0.5) * 0.9, mix(bottom, top, random()), 1.2), reach = V((random() - 0.5) * 3, -1 - random() * 2, 1 + random());
      silk.add(tube([from, from.clone().addScaledVector(reach, 0.5).add(V(0.3, 0, 0)), from.clone().add(reach)], 0.03, { sides: 4, smooth: 8 }), silkShade);
    }
    silk.into(bundle, silkMaterial());
    plant.into(root, matte({ roughness: 0.85 }));
    threads.into(root, silkMaterial());

    const alive = a.state === 'struggling' ? 1 : 0;
    const pace = mix(0.4, 2.4, mood.energy) * (alive ? 1.6 : 1), reach = swing * mix(0.25, 1, mood.energy) * (alive ? 1.6 : 0.6);
    return finish(root, (_dt, time) => {
      pend.rotation.z = Math.sin(time * pace) * reach;
      pend.rotation.x = Math.cos(time * pace * 0.7) * reach * 0.5;
      if (alive) {
        const burst = Math.sin(time * 1.3) > 0.2 ? 1 : 0;
        flap.rotation.y = Math.sin(time * 70) * 0.12 * burst;
        flap.rotation.x = Math.sin(time * 53) * 0.05 * burst;
      }
    }, 0.2);
  },
});
