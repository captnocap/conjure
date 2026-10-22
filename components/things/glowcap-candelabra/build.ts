import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type P3, cluster, domeGeometry, glow, mottle, mushroom, paint, toadstoolGeometry } from './fungi';

const COLOURS = {
  foxfire: 'Ghostly foxfire green.',
  cyan: 'Cold cyan-blue, like gas flame.',
  amber: 'Warm amber, almost still candlelight.',
  violet: 'Deep violet with a pink edge.',
  rose: 'Soft rose pink.',
  mixed: 'Every cap a different colour, like votive glasses.',
} as const;
const TINTS: Record<Exclude<keyof typeof COLOURS, 'mixed'>, string> = { foxfire: '#4fe03c', cyan: '#1fb8e6', amber: '#f59a1c', violet: '#8a48ee', rose: '#f04f8c' };

export default defineThing({
  questions: {
    form: choice('What kind of candle stand is it?', {
      branched: 'A seven-branched stand, arms rising in a flat fan like a menorah.',
      corona: 'A hoop of lights on a tall stem, a small standing corona.',
      rack: 'A stepped votive rack, rows of sockets on a slanted iron table.',
      paschal: 'A single massive paschal candlestick carrying one great cap.',
    }),
    lit: score('How many of the mushrooms are still lit?', ['None: all dark and slumped', 'One last glow', 'About half', 'Every one blazing']),
    colour: choice('What colour do the lit ones glow?', COLOURS),
    species: choice('What kind of mushroom stands in for the candles?', {
      bonnet: 'Slender bonnets with pointed bell caps on thin stems, like candle flames.',
      parasol: 'Wide flat parasols, each a little glowing dish.',
      button: 'Fat round buttons on stubby stalks, like melted candle ends.',
      inkcap: 'Tall shaggy inkcaps dissolving into black drips.',
      tuft: 'Tufts of several small caps crowding every socket.',
    }),
    drip: score('How much wax and gill-slime hangs from it?', ['Clean, barely a drip', 'Short beards under each pan', 'Long stalactites reaching for the floor']),
    story: choice('What has happened around it?', {
      vigil: 'Someone still keeps vigil: a snuffer on a pole leans against it and a box of tapers sits at its foot.',
      overrun: 'The growth has escaped: mushrooms climb the stem and ring the feet.',
      votive: 'Pilgrims leave tokens: ribbons tied to the arms and coins at its foot.',
      fallen: 'It has begun to fail: caps have dropped off and lie fading on the floor.',
      alone: 'Nothing. It simply stands and glows.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const iron = s.material(new THREE.Color('#2b2a2d').lerp(new THREE.Color('#7a4a2e'), mood.wear * 0.55), { metalness: 0.65, roughness: 0.5 });
    const waxColour = new THREE.Color('#efe4c4').lerp(new THREE.Color('#c9b98a'), mood.wear * 0.6);
    const wax = paint(waxColour, { roughness: 0.5 });
    const stalkMat = paint('#f0e8d2');
    const deadCap = paint('#ffffff', { map: mottle(random, '#8a7d6a', ['#4e463c', '#8a7f6c', '#3c4a3a'], 60, 64), side: THREE.DoubleSide });
    const deadGill = paint('#6a5f50', { side: THREE.DoubleSide });
    const level = mix(0.45, 0.95, mood.cheer) * mix(1.2, 0.85, Math.sin(mood.daylight * Math.PI));
    const names = Object.keys(TINTS) as (keyof typeof TINTS)[];
    const shift = (hex: string) => new THREE.Color(hex).offsetHSL((mood.warmth - 0.5) * 0.05, 0, 0);
    // a handful of shared glowing materials, so flicker is cheap
    const lights = names.map((name) => ({ cap: glow(shift(TINTS[name]), level, { side: THREE.DoubleSide }), gill: glow(shift(TINTS[name]).lerp(new THREE.Color('#ffffff'), 0.25), level * 1.25, { side: THREE.DoubleSide }), tint: TINTS[name] }));
    const lightFor = (index: number) => (a.colour === 'mixed' ? lights[index % lights.length] : lights[names.indexOf(a.colour)]);

    // ---- the stand and its sockets
    const sockets: { at: P3; size: number }[] = [];
    const foot = (radius: number, y = 0) => {
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + Math.PI;
        const x = Math.sin(angle), z = Math.cos(angle);
        s.tube([[x * 0.04, y + 0.32, z * 0.04], [x * radius * 0.5, y + 0.26, z * radius * 0.5], [x * radius * 0.9, y + 0.06, z * radius * 0.9], [x * radius, y + 0.03, z * radius], [x * radius * 1.08, y + 0.09, z * radius * 1.08]], 0.022, iron);
        s.ball([0.04, 0.03, 0.04], [x * radius, y + 0.03, z * radius], iron, 8);
      }
    };
    const shaft = (height: number, radius: number) => {
      s.cylinder(radius, radius * 1.3, height - 0.28, [0, 0.28 + (height - 0.28) / 2, 0], iron, 10);
      for (const t of [0.3, 0.55, 0.8]) s.ball([radius * 2.4, radius * 1.6, radius * 2.4], [0, height * t, 0], iron, 10);
    };
    let top = 1.9;
    if (a.form === 'branched') {
      foot(0.46);
      shaft(1.55, 0.028);
      sockets.push({ at: [0, 1.62, 0], size: 1.15 });
      for (let i = 1; i <= 3; i++)
        for (const side of [-1, 1]) {
          const x = side * i * 0.3, y = 1.56 - i * 0.07, root = 1.42 - i * 0.2;
          s.tube([[0, root, 0], [x * 0.45, root - 0.08, 0], [x * 0.92, root + 0.06, 0], [x, y - 0.12, 0], [x, y, 0]], 0.018, iron);
          s.ring(0.05, 0.01, [x * 0.5, root + 0.03, 0], iron);
          sockets.push({ at: [x, y, 0], size: 1 });
        }
      top = 1.62;
    } else if (a.form === 'corona') {
      foot(0.44);
      shaft(1.7, 0.028);
      const radius = 0.5, y = 1.45;
      s.ring(radius, 0.02, [0, y, 0], iron).rotation.x = Math.PI / 2;
      s.ring(radius * 0.99, 0.012, [0, y - 0.1, 0], iron).rotation.x = Math.PI / 2;
      const n = 8;
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + 0.2;
        const x = Math.sin(angle) * radius, z = Math.cos(angle) * radius;
        sockets.push({ at: [x, y + 0.08, z], size: 0.95 });
        s.rod([x, y - 0.1, z], [x, y + 0.08, z], 0.012, iron);
        if (i % 2 === 0) s.rod([0, 1.72, 0], [x, y, z], 0.008, iron);
      }
      sockets.push({ at: [0, 1.76, 0], size: 1.2 });
      top = 1.76;
    } else if (a.form === 'rack') {
      const width = 1.3;
      for (const x of [-1, 1]) {
        s.rod([x * width / 2, 0, 0.3], [x * width / 2, 0.82, 0.3], 0.02, iron);
        s.rod([x * width / 2, 0, -0.3], [x * width / 2, 1.3, -0.3], 0.02, iron);
        s.rod([x * width / 2, 0.82, 0.3], [x * width / 2, 1.3, -0.3], 0.018, iron);
        s.rod([x * width / 2, 0.3, 0.3], [x * width / 2, 0.3, -0.3], 0.012, iron);
        s.ball([0.035, 0.05, 0.035], [x * width / 2, 1.33, -0.3], iron, 8);
      }
      s.box([width, 0.03, 0.2], [0, 0.4, 0.36], iron);
      for (let row = 0; row < 3; row++) {
        const y = 0.84 + row * 0.2, z = 0.28 - row * 0.25;
        s.box([width, 0.025, 0.16], [0, y, z], iron);
        const n = 5 - (row % 2);
        for (let i = 0; i < n; i++) sockets.push({ at: [(i - (n - 1) / 2) * 0.25, y + 0.02, z], size: 0.82 });
      }
      top = 1.3;
    } else {
      s.lathe([[0.001, 0], [0.3, 0], [0.3, 0.05], [0.2, 0.09], [0.09, 0.16], [0.06, 0.3], [0.1, 0.36], [0.05, 0.44], [0.045, 0.9], [0.1, 0.96], [0.05, 1.03], [0.045, 1.2], [0.12, 1.27], [0.2, 1.3], [0.2, 1.32]], iron);
      for (let i = 0; i < 3; i++) s.ball([0.07, 0.05, 0.07], [Math.sin(i * 2.09) * 0.27, 0.02, Math.cos(i * 2.09) * 0.27], iron, 8);
      sockets.push({ at: [0, 1.32, 0], size: 2.6 });
      top = 1.32;
    }

    // ---- candles become mushrooms
    const order = sockets.map((_unused, index) => index).sort(() => random() - 0.5);
    const litCount = a.lit < 0.1 ? 0 : Math.max(1, Math.round(a.lit * sockets.length));
    const litSet = new Set(order.slice(0, litCount));
    const dropped = a.story === 'fallen' ? new Set(order.slice(litCount).filter(() => random() < 0.6)) : new Set<number>();
    const pans: { at: P3; size: P3 }[] = [], stubs: { at: P3; size: P3 }[] = [];
    const waxDrips: { at: P3; size: P3 }[] = [], glowDrips: { at: P3; size: P3; color: string }[] = [];
    const dripAmount = mix(0.05, 1, a.drip) * mix(0.8, 1.2, mood.wear);
    const kind = a.species;
    sockets.forEach((socket, index) => {
      const [x, y, z] = socket.at, k = socket.size;
      const pan = 0.085 * k;
      pans.push({ at: [x, y, z], size: [pan, 0.03 * k, pan] });
      const stub = (0.05 + random() * 0.09) * k;
      stubs.push({ at: [x, y + stub / 2, z], size: [0.032 * k, stub, 0.032 * k] });
      const drips = Math.round((1 + random() * 4) * dripAmount * 2);
      for (let i = 0; i < drips; i++) {
        const angle = random() * Math.PI * 2, length = (0.05 + random() ** 2 * 0.75 * dripAmount) * Math.sqrt(k);
        waxDrips.push({ at: [x + Math.sin(angle) * pan * 0.9, y - length / 2, z + Math.cos(angle) * pan * 0.9], size: [0.011 * k, length, 0.011 * k] });
      }
      if (dropped.has(index)) return;
      const lit = litSet.has(index);
      const light = lightFor(index);
      const capMat = lit ? light.cap : deadCap, gillMat = lit ? light.gill : deadGill;
      const slump: [number, number] = lit ? [(random() - 0.5) * 0.25, (random() - 0.5) * 0.25] : [(random() - 0.5) * 1.1, (random() - 0.5) * 1.1];
      const base: P3 = [x, y + stub, z];
      const one = (at: P3, scale: number, lean: [number, number]) => {
        const spec = {
          bonnet: { height: 0.3, cap: 0.085, capHeight: 0.17, shape: 2, stalk: 0.014 },
          parasol: { height: 0.26, cap: 0.16, capHeight: 0.06, shape: 0.35, stalk: 0.02 },
          button: { height: 0.13, cap: 0.11, capHeight: 0.11, shape: 1, stalk: 0.045 },
          inkcap: { height: 0.2, cap: 0.075, capHeight: 0.25, shape: 1.75, stalk: 0.02 },
          tuft: { height: 0.2, cap: 0.065, capHeight: 0.06, shape: 1, stalk: 0.012 },
        }[kind];
        const grow = scale * (1.15 + random() * 0.4);
        mushroom(s.root, { at, height: spec.height * grow, cap: spec.cap * grow, capHeight: spec.capHeight * grow, shape: spec.shape, stalk: spec.stalk * grow, lean, capMat, gillMat, stalkMat });
        const hang = Math.round((kind === 'inkcap' ? 5 : 2) * dripAmount * 2);
        for (let i = 0; i < hang && lit; i++) {
          const angle = random() * Math.PI * 2, length = (0.03 + random() * 0.16 * dripAmount) * grow;
          const rim = spec.cap * grow * 0.88, rimY = at[1] + (spec.height - spec.capHeight * 0.45) * grow;
          glowDrips.push({ at: [at[0] + Math.sin(angle) * rim, rimY - length / 2, at[2] + Math.cos(angle) * rim], size: [0.008 * grow, length, 0.008 * grow], color: kind === 'inkcap' ? '#16131a' : light.tint });
        }
      };
      if (kind === 'tuft') for (let i = 0; i < 4; i++) one([base[0], base[1] - 0.02, base[2]], k * (0.8 + i * 0.12), [(random() - 0.5) * 1.3, (random() - 0.5) * 1.3]);
      else one(base, k, slump);
    });
    cluster(s.root, new THREE.LatheGeometry([[0.001, -0.6], [0.35, -0.6], [0.3, -0.2], [0.9, 0.15], [1, 0.4], [0.92, 0.4], [0.5, 0], [0.001, 0]].map(([px, py]) => new THREE.Vector2(px, py)), 14), iron, pans);
    cluster(s.root, new THREE.CylinderGeometry(1, 1.15, 1, 10), wax, stubs);
    const dripGeometry = new THREE.CylinderGeometry(1, 0.25, 1, 6);
    if (waxDrips.length) cluster(s.root, dripGeometry, wax, waxDrips);
    if (glowDrips.length) cluster(s.root, dripGeometry.clone(), paint('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.25, roughness: 0.3 }), glowDrips);
    if (a.drip > 0.55) {
      const pool = Array.from({ length: 5 }, () => ({ at: [(random() - 0.5) * 0.7, 0, (random() - 0.5) * 0.5] as P3, size: [0.08 + random() * 0.14, 0.012, 0.08 + random() * 0.14] as P3 }));
      cluster(s.root, new THREE.SphereGeometry(1, 10, 6), wax, pool);
    }

    // ---- what has happened around it
    const reach = a.form === 'rack' ? 0.75 : 0.5;
    if (a.story === 'vigil') {
      s.rod([reach + 0.12, 0, 0.2], [reach * 0.5, top * 0.95, 0.05], 0.014, s.material('#6b4a30'));
      const cone = s.mesh(new THREE.ConeGeometry(0.05, 0.11, 10, 1, true), paint('#b08a3c', { metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }), [reach * 0.5 - 0.06, top * 0.95 - 0.02, 0.05]);
      cone.rotation.z = 0.5;
      s.box([0.24, 0.07, 0.11], [-reach, 0.035, 0.35], s.material('#8c6d48')).rotation.y = 0.4;
      for (let i = 0; i < 5; i++) s.rod([-reach - 0.1, 0.085, 0.3 + i * 0.022], [-reach + 0.14, 0.085, 0.36 + i * 0.022], 0.008, wax);
    }
    if (a.story === 'votive') {
      const ribbonTints = ['#b8323c', '#e4c35a', '#3f6fae', '#f1ece0', '#7c4a9c'];
      sockets.slice(0, 9).forEach((socket, index) => {
        if (random() < 0.25) return;
        const length = 0.18 + random() * 0.3;
        const ribbon = s.box([0.025, length, 0.004], [socket.at[0] + 0.02, socket.at[1] - 0.05 - length / 2, socket.at[2] + 0.03], paint(ribbonTints[index % ribbonTints.length], { side: THREE.DoubleSide }));
        ribbon.rotation.z = (random() - 0.5) * 0.4;
      });
      cluster(s.root, new THREE.CylinderGeometry(1, 1, 1, 10), paint('#c9a54a', { metalness: 0.8, roughness: 0.35 }), Array.from({ length: 14 }, () => {
        const angle = random() * Math.PI * 2, r = 0.15 + random() * 0.4;
        return { at: [Math.sin(angle) * r, 0.006, Math.cos(angle) * r + 0.1] as P3, size: [0.022, 0.006, 0.022] as P3 };
      }));
    }
    if (a.story === 'overrun' || mood.density > 0.8) {
      const light = lightFor(1);
      const n = Math.round(mix(10, 26, mood.density));
      cluster(s.root, toadstoolGeometry(kind === 'bonnet' || kind === 'inkcap' ? 2 : 1), paint('#ffffff', { emissive: light.tint, emissiveIntensity: a.lit < 0.1 ? 0 : level * 0.35 }), Array.from({ length: n }, (_unused, i) => {
        const onStem = i < n * 0.4 && a.form !== 'rack';
        const angle = random() * Math.PI * 2, r = onStem ? 0.04 : 0.15 + random() * reach;
        const size = onStem ? 0.09 + random() * 0.08 : 0.07 + random() * 0.16;
        return { at: [Math.sin(angle) * r, onStem ? 0.3 + random() * (top - 0.5) : 0, Math.cos(angle) * r] as P3, size: [size, size, size] as P3, color: a.lit < 0.1 ? '#8a7f6c' : new THREE.Color(light.tint).lerp(new THREE.Color('#ffffff'), 0.25).getStyle(), turn: onStem ? [Math.sin(angle + 1.57) * -0.9, 0, Math.cos(angle + 1.57) * -0.9] as P3 : [(random() - 0.5) * 0.4, 0, (random() - 0.5) * 0.4] as P3 };
      }));
    }
    if (a.story === 'fallen') {
      const caps = Array.from({ length: Math.max(3, dropped.size + 2) }, () => {
        const angle = random() * Math.PI * 2, r = 0.2 + random() * reach, size = 0.06 + random() * 0.04;
        return { at: [Math.sin(angle) * r, size * 0.3, Math.cos(angle) * r] as P3, size: [size, size, size] as P3, turn: [random() * 3, random() * 3, random() * 3] as P3, color: random() < 0.3 ? lightFor(0).tint : '#6f6558' };
      });
      cluster(s.root, domeGeometry(1, 0.8, kind === 'bonnet' ? 2 : 1, 12), paint('#ffffff', { side: THREE.DoubleSide }), caps);
    }

    const speed = mix(0.4, 5, mood.energy), depth = mix(0.03, 0.3, mood.energy);
    const phases = lights.map(() => random() * 6.28);
    return s.finish({
      update: (_dt, time) => {
        lights.forEach((light, index) => {
          const pulse = 1 + depth * Math.sin(time * speed * (1 + index * 0.13) + phases[index]);
          light.cap.emissiveIntensity = level * pulse;
          light.gill.emissiveIntensity = level * 1.25 * pulse;
        });
      },
    });
  },
});
