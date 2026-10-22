import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const FILLS = {
  gumballs: { colours: ['#e23a3a', '#f2c81e', '#2f7fe0', '#3fae4a', '#f08a1c', '#f4f1ea', '#e86aa8'], size: 0.015, count: 230 },
  bouncy: { colours: ['#ff3fa4', '#22d3c5', '#b8f01e', '#ff8a00', '#7a3cf0', '#101418'], size: 0.021, count: 110 },
  capsules: { colours: ['#f6d24a', '#59b8e8', '#f08fb4', '#8fd18a', '#f2f2ee', '#c8a2f0'], size: 0.03, count: 44 },
  peanuts: { colours: ['#c79a5b', '#b8864a', '#d4aa6c', '#a87840'], size: 0.011, count: 420 },
} as const;

export default defineThing({
  questions: {
    contents: choice('What is inside the globe?', {
      gumballs: 'Small glossy gumballs in every primary colour.',
      bouncy: 'Larger neon rubber bouncy balls, a few of them black.',
      capsules: 'Big pastel capsules, each hiding a tiny toy.',
      peanuts: 'Salted peanuts, a brown heap behind the glass in a bar or a garage.',
    }),
    fill: score('How full is the globe?', ['Three stragglers on the bottom', 'A third left', 'Half', 'Brimming to the lid']),
    stand: choice('How does it stand?', {
      counter: 'No stand: it sits on rubber feet on a counter or a table.',
      pipe: 'One head on a chrome pipe with a flared cast foot.',
      pair: 'Two heads side by side on a forked stand.',
      triple: 'Three heads in a row on a wide stand, a small candy bank.',
    }),
    body: choice('What colour is the cast body?', {
      red: 'Fire-engine red enamel, the classic.',
      chrome: 'Polished chrome all over.',
      mint: 'Mint green with cream trim, a 1950s diner piece.',
      yellow: 'Taxi yellow.',
      black: 'Black crackle enamel, a barroom machine.',
    }),
    price: choice('What does the price plate say?', { one: '1¢', five: '5¢', quarter: '25¢', half: '50¢', free: 'FREE' }),
    coin: noul('Has someone left a coin sitting in the slot?'),
    story: choice('What has happened to it?', {
      tended: 'Nothing: it is stocked and working.',
      spilled: 'It paid out too much and balls have rolled across the floor around its foot.',
      'out-of-order': 'A handwritten OUT OF ORDER note is taped over the coin plate.',
      cracked: 'The globe is cracked and held with a strip of tape.',
      jammed: 'The chute door hangs open with one ball stuck in it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fillKind = FILLS[a.contents];
    const tone = { red: '#c8201f', chrome: '#d5dadc', mint: '#8fcdb4', yellow: '#eeb812', black: '#1d1d20' }[a.body];
    const body = s.material(tone, { metalness: a.body === 'chrome' ? 0.9 : 0.25, roughness: a.body === 'chrome' ? 0.22 : 0.38 });
    const chrome = s.material('#dfe3e4', { metalness: 0.9, roughness: 0.22 });
    const dark = s.material('#1b1c1e', { roughness: 0.7 });
    const rust = s.material('#7a4a2a', { roughness: 0.95 });
    const glass = new THREE.MeshPhysicalMaterial({ color: mood.wear > 0.6 ? '#e6dfc4' : '#f4fbff', transparent: true, opacity: mix(0.16, 0.36, mood.wear), roughness: mix(0.03, 0.5, mood.wear), depthWrite: false });
    const priceText = { one: '1¢', five: '5¢', quarter: '25¢', half: '50¢', free: 'FREE' }[a.price];
    const R = 0.135;

    const head = (x: number, y: number, index: number) => {
      const g = new THREE.Group();
      g.position.set(x, y, 0);
      g.rotation.y = (random() - 0.5) * 0.12;
      if (a.stand !== 'counter') g.scale.setScalar(1.22);
      s.root.add(g);
      // Cast body, collar and lid.
      g.add(s.lathe([[0, 0], [0.105, 0], [0.11, 0.015], [0.098, 0.04], [0.095, 0.15], [0.112, 0.175], [0.112, 0.195], [0.085, 0.2], [0, 0.2]], body));
      const cy = 0.2 + R * 0.86;
      g.add(s.ball([R, R, R], [0, cy, 0], glass, 28));
      const collar = s.ring(R * 0.5, 0.008, [0, cy + R * 0.87, 0], chrome);
      collar.rotation.x = Math.PI / 2;
      g.add(collar);
      g.add(s.lathe([[0, 0.06], [0.03, 0.055], [0.062, 0.03], [0.078, 0.008], [0.08, 0], [0, 0]], body, [0, cy + R * 0.86, 0]));
      g.add(s.ball([0.014, 0.014, 0.014], [0, cy + R * 0.86 + 0.068, 0], chrome, 10));
      // Coin mechanism: plate, slot, turn handle, chute.
      g.add(s.box([0.1, 0.105, 0.03], [0, 0.105, 0.092], chrome));
      g.add(s.box([0.036, 0.006, 0.01], [0, 0.142, 0.109], dark));
      const knob = s.cylinder(0.026, 0.03, 0.022, [0, 0.1, 0.116], chrome, 18);
      knob.rotation.x = Math.PI / 2;
      g.add(knob);
      const grip = s.box([0.062, 0.016, 0.016], [0, 0.1, 0.134], chrome);
      grip.rotation.z = random() * Math.PI;
      g.add(grip);
      const plate = s.label(priceText, 0.05, 0.026, [0.0, 0.066, 0.1085], '#1b1c1e', '#f1ead2');
      g.add(plate);
      const jam = a.story === 'jammed' && index === 0;
      g.add(s.box([0.062, 0.05, 0.035], [0, 0.03, 0.108], dark));
      const door = s.box([0.066, 0.05, 0.006], [0, jam ? 0.058 : 0.03, jam ? 0.146 : 0.128], chrome);
      if (jam) door.rotation.x = -1.2;
      g.add(door);
      if (a.coin && index === 0) {
        const coin = s.cylinder(0.012, 0.012, 0.002, [0.004, 0.15, 0.112], s.material('#c9a23c', { metalness: 0.85, roughness: 0.3 }), 16);
        coin.rotation.z = Math.PI / 2;
        g.add(coin);
      }
      // The contents, heaped against the glass up to the fill line.
      const amount = Math.max(0.012, a.fill * mix(0.8, 1, random()));
      const n = Math.max(3, Math.round(fillKind.count * amount));
      const reach = R - fillKind.size - 0.004;
      const top = -reach + 2 * reach * Math.pow(amount, 0.8);
      const points: { at: [number, number, number]; size: number; color: string }[] = [];
      let guard = 0;
      while (points.length < n && guard++ < 6000) {
        const px = (random() * 2 - 1) * reach, py = -reach + random() * (top + reach), pz = (random() * 2 - 1) * reach;
        const d = Math.hypot(px, py, pz);
        if (d > reach || (d < reach * 0.55 && random() < 0.8)) continue;
        points.push({ at: [px, cy + py, pz], size: fillKind.size * mix(0.9, 1.08, random()), color: fillKind.colours[Math.floor(random() * fillKind.colours.length)] });
      }
      if (jam) points.push({ at: [0, 0.03, 0.12], size: fillKind.size, color: fillKind.colours[0] });
      const geometry = new THREE.SphereGeometry(1, 9, 7);
      if (a.contents === 'peanuts') geometry.scale(1, 0.62, 0.62);
      g.add(s.scatter(geometry, s.material('#ffffff', { roughness: a.contents === 'peanuts' ? 0.9 : 0.25, emissive: '#ffffff', emissiveIntensity: mix(0.0, 0.08, mood.cheer) }), points));
      if (a.contents === 'capsules') {
        // A clear cap on every capsule reads as a band of lighter plastic.
        g.add(s.scatter(new THREE.SphereGeometry(1.03, 9, 5, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), s.material('#fbfbf6', { roughness: 0.2 }), points.map((p) => ({ at: p.at, size: p.size }))));
      }
      if (a.story === 'cracked' && index === 0) {
        const crack: [number, number, number][] = [];
        let lat = 0.9, lon = 0.5;
        for (let i = 0; i < 7; i++) {
          crack.push([Math.cos(lat) * Math.sin(lon) * R * 1.005, cy + Math.sin(lat) * R * 1.005, Math.cos(lat) * Math.cos(lon) * R * 1.005]);
          lat -= 0.16 + random() * 0.12; lon += (random() - 0.5) * 0.5;
        }
        g.add(s.tube(crack, 0.0022, dark));
        const tape = s.box([0.075, 0.03, 0.004], crack[3], s.material('#d9cba0', { roughness: 0.9 }));
        tape.lookAt(new THREE.Vector3(crack[3][0] * 3, (crack[3][1] - cy) * 3 + cy, crack[3][2] * 3));
        tape.rotation.z += 0.5;
        g.add(tape);
      }
      if (a.story === 'out-of-order' && index === 0) {
        const note = s.label('OUT OF ORDER', 0.15, 0.085, [0.005, 0.115, 0.146], '#b3261e', '#f6f0d8');
        note.rotation.z = (random() - 0.5) * 0.3;
        g.add(note);
      }
      // Chipped enamel and rust blooms come with wear.
      const chips = Math.round(mood.wear * 9);
      for (let i = 0; i < chips; i++) {
        const angle = random() * Math.PI * 2, h = 0.02 + random() * 0.15;
        const chip = s.ball([0.012 + random() * 0.012, 0.008 + random() * 0.012, 0.004], [Math.sin(angle) * 0.097, h, Math.cos(angle) * 0.097], rust, 8);
        chip.rotation.y = angle;
        g.add(chip);
      }
    };

    const headY = a.stand === 'counter' ? 0.012 : mix(0.74, 0.8, random());
    if (a.stand === 'counter') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.014, 0.016, 0.014, [x * 0.065, 0.007, z * 0.065], dark, 10);
      head(0, headY, 0);
    } else {
      const xs = { pipe: [0], pair: [-0.17, 0.17], triple: [-0.31, 0, 0.31] }[a.stand];
      const footR = a.stand === 'pipe' ? 0.19 : a.stand === 'pair' ? 0.24 : 0.3;
      s.lathe([[0, 0], [footR, 0], [footR, 0.012], [footR * 0.82, 0.03], [footR * 0.32, 0.055], [0.04, 0.085], [0.03, 0.1], [0, 0.1]], a.body === 'chrome' ? chrome : dark);
      const barY = headY - 0.09;
      s.cylinder(0.021, 0.021, (xs.length > 1 ? barY : headY) - 0.09, [0, ((xs.length > 1 ? barY : headY) + 0.09) / 2, 0], chrome, 16);
      if (xs.length > 1) {
        s.rod([xs[0], barY, 0], [xs[xs.length - 1], barY, 0], 0.019, chrome);
        for (const x of xs) s.cylinder(0.019, 0.019, 0.09, [x, barY + 0.045, 0], chrome, 12);
      }
      xs.forEach((x, index) => {
        s.cylinder(0.07, 0.03, 0.02, [x, headY - 0.01, 0], chrome, 18);
        head(x, headY, index);
      });
    }

    if (a.story === 'spilled') {
      const loose = 8 + Math.floor(random() * 14 * mix(0.6, 1.4, mood.density));
      const geometry = new THREE.SphereGeometry(1, 9, 7);
      if (a.contents === 'peanuts') geometry.scale(1, 0.62, 0.62);
      s.scatter(geometry, s.material('#ffffff', { roughness: 0.3 }), Array.from({ length: loose }, () => {
        const angle = random() * Math.PI * 2, d = 0.1 + random() * 0.33;
        return { at: [Math.sin(angle) * d, fillKind.size * (a.contents === 'peanuts' ? 0.62 : 1), Math.cos(angle) * d * 0.8 + 0.08] as [number, number, number], size: fillKind.size, color: fillKind.colours[Math.floor(random() * fillKind.colours.length)] };
      }));
    }
    return s.finish();
  },
});
