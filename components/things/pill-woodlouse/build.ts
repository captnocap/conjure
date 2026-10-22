import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';
import { Bag, type V3, at, ball, lumpy, taper } from './bits';

const POSES = {
  walking: 'Stretched out and trundling along on fourteen legs, antennae tapping ahead.',
  peeking: 'Almost a ball, but cracked open a little, antennae poking out to test whether it is safe.',
  half: 'Lying on its side in a loose C, half curled, pale legs bunched in the hollow.',
  ball: 'Rolled into a perfect, sealed, plated ball.',
  upturned: 'Flipped on its back, legs pedalling the air, helpless.',
} as const;
const COATS = {
  slate: { main: '#5d646c', rim: '#a3abb0', blotch: '', text: 'Plain slate grey with pale plate edges.' },
  mottled: { main: '#5e4c3c', rim: '#b0946a', blotch: '#d9b65a', text: 'Brown, with two rows of yellow flecks down the back.' },
  zebra: { main: '#24272c', rim: '#f1efe6', blotch: '', text: 'Black with a crisp white band on every plate.' },
  orange: { main: '#dd7a2a', rim: '#f4bd7c', blotch: '', text: 'A startling orange all over.' },
  dairy: { main: '#ece8dc', rim: '#fbf9f2', blotch: '#1d1d20', text: 'White with black blotches, like a tiny dairy cow.' },
  violet: { main: '#5b58b4', rim: '#a4a2e6', blotch: '', text: 'An eerie, unhealthy blue-violet.' },
} as const;
type Coat = keyof typeof COATS;
const SHELTERS = {
  none: 'Nothing: it is out in the open.',
  stone: 'A flat stone has just been lifted and tipped back, leaving a dark damp patch where it lay.',
  bark: 'A curl of loose bark arches over it like a tunnel.',
  leaf: 'A dead brown leaf lies under it.',
} as const;
const COMPANY = {
  alone: 'Alone.',
  pair: 'A second, smaller one keeps it company.',
  brood: 'A trail of tiny pale young follows behind it.',
} as const;

const SEGMENTS = [0.8, 1, 1, 1, 1, 1, 1, 1, 0.34, 0.34, 0.34, 0.34, 0.6];
const TOTAL = SEGMENTS.reduce((sum, value) => sum + value, 0);
const SHAPES = {
  walking: { arc: 0.75, a: 2.5, w: 3.3, c: 17.5, taper: 1 },
  peeking: { arc: 5.05, a: 2.9, w: 2.95, c: 0.2, taper: 0.2 },
  half: { arc: 3.3, a: 2.6, w: 3.1, c: 1.95, taper: 0.7 },
  ball: { arc: 6.16, a: 3, w: 3, c: 0, taper: 0 },
  upturned: { arc: 1.3, a: 2.5, w: 3.2, c: 9, taper: 1 },
} as const;
const P = (x: number, rho: number, phi: number): V3 => [x, rho * Math.cos(phi), -rho * Math.sin(phi)];

export default defineThing({
  questions: {
    pose: choice('What is the woodlouse doing?', POSES),
    coat: choice('What does its armour look like?', Object.fromEntries(Object.entries(COATS).map(([key, value]) => [key, value.text])) as Record<Coat, string>),
    shelter: choice('What was it hiding under?', SHELTERS),
    company: choice('Is it alone?', COMPANY),
    size: score('How big is it?', ['A small pale juvenile', 'An ordinary adult', 'A big old tank of a pill bug']),
    moult: noul('Is it halfway through a moult, the back half new and ghost-pale?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const armour = s.material('#ffffff', { roughness: mix(0.28, 0.6, mood.wear), metalness: 0.15, side: THREE.DoubleSide });
    const soft = s.material('#ffffff', { roughness: 0.7 });

    const makeBug = (pose: keyof typeof POSES, coat: (typeof COATS)[Coat], pale: number, moult: boolean) => {
      const bug = new THREE.Group(), bag = new Bag();
      const { arc, a: arch, w: wide, c, taper: tp } = SHAPES[pose];
      const white = new THREE.Color('#e9e2d2');
      const main = new THREE.Color(coat.main).lerp(white, pale), rim = new THREE.Color(coat.rim).lerp(white, pale);
      const legColour = new THREE.Color('#c9c2b0').lerp(main, 0.35);
      const envelope = (t: number) => mix(1, 0.3 + 0.7 * Math.sqrt(Math.sin(Math.PI * clamp01(0.07 + 0.86 * t))), tp);
      let cursor = 0;
      SEGMENTS.forEach((weight, index) => {
        const t0 = cursor / TOTAL, t1 = (cursor + weight) / TOTAL, tm = (t0 + t1) / 2;
        cursor += weight;
        const phi0 = -arc / 2 + arc * t0, phi1 = -arc / 2 + arc * (t1 + (index < SEGMENTS.length - 1 ? 0.2 * weight / TOTAL : 0));
        const e = envelope(tm) * (index === 0 ? mix(1, 0.85, tp) : 1);
        const fresh = moult && index >= 5;
        const plateMain = fresh ? main.clone().lerp(white, 0.75) : main.clone().offsetHSL(0, 0, (random() - 0.5) * 0.04);
        const plateRim = fresh ? white : rim;
        const nu = 14, nv = 3, positions: number[] = [], colours: number[] = [], indices: number[] = [];
        const blotchAt = coat.blotch && !fresh ? (coat === COATS.dairy ? 2 + Math.floor(random() * 10) : 4) : -1;
        const blotch = new THREE.Color(coat.blotch || '#000000');
        for (let v = 0; v <= nv; v++) {
          const phi = mix(phi0, phi1, v / nv), grow = mix(0.95, 1.05, v / nv);
          for (let u = 0; u <= nu; u++) {
            const angle = mix(-1.5, 1.5, u / nu);
            positions.push(...P(wide * e * grow * Math.sin(angle), c + arch * e * grow * Math.cos(angle), phi));
            let colour = v === nv ? plateRim : u === 0 || u === nu ? main.clone().lerp(plateRim, 0.6) : plateMain;
            if (coat === COATS.zebra && v >= nv - 1 && !fresh) colour = plateRim;
            if (blotchAt >= 0 && v > 0 && v < nv && index > 0 && index < 8) {
              const hit = coat === COATS.dairy ? Math.abs(u - blotchAt) <= 1 && random() < 0.8 : u === blotchAt || u === nu - blotchAt;
              if (hit) colour = blotch;
            }
            colours.push(colour.r, colour.g, colour.b);
          }
        }
        for (let v = 0; v < nv; v++)
          for (let u = 0; u < nu; u++) {
            const i = v * (nu + 1) + u;
            indices.push(i, i + 1, i + nu + 1, i + 1, i + nu + 2, i + nu + 1);
          }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        bag.add(armour, geometry);

        const phiMid = (phi0 + phi1) / 2;
        if (index === 0) {
          // Eyes and antennae on the head plate.
          for (const side of [-1, 1]) {
            bag.add(soft, ball(0.3, 8), at(P(side * wide * e * Math.sin(1.0), c + arch * e * Math.cos(1.0) + 0.05, phiMid)), '#0e0e10');
            if (pose !== 'ball') {
              const reach = (pose === 'peeking' ? 0.55 : 1) / (c + arch), lift = pose === 'walking' ? 0.5 : 0.8;
              bag.add(soft, taper([P(side * wide * e * 0.45, c + arch * 0.45, phi0 + 0.3 * reach), P(side * wide * e * 0.95, c + arch * lift, phi0 - 2.4 * reach), P(side * wide * e * (1.25 + random() * 0.2), c + arch * (lift - 0.35), phi0 - (4.4 + random()) * reach)], (t) => mix(0.2, 0.08, t), 12, 5), undefined, main.clone().lerp(rim, 0.3));
            }
          }
        }
        if (index >= 1 && index <= 7 && pose !== 'ball' && pose !== 'peeking') {
          for (const side of [-1, 1]) {
            const base = P(side * wide * e * 0.4, c + arch * 0.25, phiMid);
            let path: V3[];
            if (pose === 'walking') {
              const stride = (index - 4) * 0.25 + (random() - 0.5) * 0.9, reach = wide * e + 0.9;
              path = [base, [side * (wide * e + 0.2), base[1] - 0.2, base[2] + stride * 0.5], [side * reach, c - 1.15, base[2] + stride]];
            } else if (pose === 'half') {
              const wave = (random() - 0.5) * 0.25;
              path = [base, P(side * wide * 0.55, Math.max(0.2, c - 0.7), phiMid + wave), P(side * wide * 0.2, Math.max(0.15, c - 1.7), phiMid + wave * 2)];
            } else {
              const wave = (random() - 0.5) * 0.16;
              path = [base, P(side * wide * e * 0.95, c - 1.3, phiMid + wave), P(side * wide * e * (0.4 + random() * 0.5), c - 3.1, phiMid + wave * 2.2)];
            }
            bag.add(soft, taper(path, (t) => mix(0.24, 0.09, t), 8, 5), undefined, legColour);
          }
        }
      });
      // Pale soft underside, seen when it is curled or on its back.
      if (pose !== 'ball' && pose !== 'peeking') {
        const belly = new THREE.Color('#d8d0bc').lerp(main, 0.25);
        for (let i = 0; i < 9; i++) {
          const phi = -arc / 2 + arc * (0.08 + 0.84 * (i / 8));
          bag.add(soft, ball(1, 8), at(P(0, c + arch * 0.12, phi), [0, 0, 0], [wide * 0.62 * envelope(0.08 + 0.84 * (i / 8)), 0.5, 0.9]), belly);
        }
      }
      bag.flush(bug);
      if (pose === 'half') bug.rotation.set(0, 0.5, Math.PI / 2 - 0.12);
      if (pose === 'ball') bug.rotation.x = -1.95 + random() * 0.5;
      if (pose === 'peeking') bug.rotation.x = -1.75 + random() * 0.3;
      if (pose === 'upturned') bug.rotation.set(0, 0, Math.PI + (random() - 0.5) * 0.25);
      return bug;
    };
    const ground = (bug: THREE.Group, height = 0) => {
      bug.updateMatrixWorld(true);
      bug.position.y += height - new THREE.Box3().setFromObject(bug).min.y;
      bug.updateMatrixWorld(true);
    };

    const coat = COATS[a.coat];
    const hero = makeBug(a.pose, coat, mix(0.3, 0, clamp01(a.size * 2)), a.moult);
    const holder = new THREE.Group();
    holder.add(hero);
    s.root.add(holder);
    const lift = a.shelter === 'leaf' ? 0.45 : a.shelter === 'stone' ? 0.1 : 0;
    ground(hero, lift);
    const extras: THREE.Group[] = [];
    if (a.company === 'pair') {
      const other = makeBug(a.pose === 'ball' || a.pose === 'peeking' ? 'walking' : random() < 0.5 ? 'ball' : 'peeking', coat, 0.12, false);
      other.scale.setScalar(0.72);
      const wrap = new THREE.Group();
      wrap.add(other);
      wrap.position.set(6.5 + random() * 1.5, 0, -2 + random() * 3);
      wrap.rotation.y = -0.9 + random() * 0.6;
      s.root.add(wrap);
      ground(other, lift);
      extras.push(wrap);
    }
    if (a.company === 'brood') {
      const young = 4 + Math.floor(random() * 3 + mood.density * 3);
      for (let i = 0; i < young; i++) {
        const baby = makeBug(random() < 0.75 ? 'walking' : 'ball', coat, 0.7, false);
        baby.scale.setScalar(0.2 + random() * 0.06);
        const wrap = new THREE.Group();
        wrap.add(baby);
        wrap.position.set((random() - 0.5) * 7 + (i % 2 ? 4.5 : -4.5), 0, -5 - i * 1.6 + random() * 2);
        wrap.rotation.y = (random() - 0.5) * 0.9;
        s.root.add(wrap);
        ground(baby, lift * 0.3);
        extras.push(wrap);
      }
    }

    const bag = new Bag(), matte = s.material('#ffffff', { roughness: 0.92 });
    if (a.shelter === 'stone') {
      bag.add(matte, new THREE.CylinderGeometry(9, 9.4, 0.1, 22), at([0, 0.05, 0], [0, 0, 0], [1.15, 1, 0.85]), '#2e241c');
      bag.add(s.material('#ffffff', { roughness: 0.8 }), lumpy(ball(1, 18), 0.09, 2.6, random() * 9), at([1.5, 4.4, -13.6], [0.3, 0.2, 0], [10.5, 2.6, 7.5]), '#8a8d8e');
      for (let i = 0; i < 12; i++) bag.add(matte, new THREE.DodecahedronGeometry(0.4 + random() * 0.6), at([(random() - 0.5) * 17, 0.3, (random() - 0.5) * 12]), '#4a3a2c');
    } else if (a.shelter === 'bark') {
      const curl = new THREE.CylinderGeometry(7.5, 8.5, 19, 14, 3, true, -Math.PI / 2, Math.PI * 0.95);
      bag.add(s.material('#ffffff', { roughness: 0.95, side: THREE.DoubleSide }), lumpy(curl, 0.04, 0.8, random() * 9), at([0, 0, -4.5], [0, 0, Math.PI / 2 + 0.05], [1, 1, 0.8]), '#5a4433');
      for (let i = 0; i < 7; i++) bag.add(matte, new THREE.BoxGeometry(17, 0.5, 0.45), at([0, 7.6 * Math.cos(-0.6 + i * 0.2) + 0.2, -4.5 - 6.2 * Math.sin(-0.6 + i * 0.2) * 0.8 - 0.3], [(-0.6 + i * 0.2), 0, 0]), '#3c2c20');
    } else if (a.shelter === 'leaf') {
      const leaf = new THREE.CircleGeometry(10, 28);
      const position = leaf.getAttribute('position'), wobble = random() * 6;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), r = Math.hypot(x, y) / 10, t = Math.atan2(y, x);
        const k = 1 + 0.22 * Math.sin(t * 6 + wobble) * r;
        position.setXYZ(i, x * k * 1.3, y * k * 0.85, r * r * r * 2.2 * Math.max(0, Math.sin(t * 2 + wobble)) + 0.2);
      }
      leaf.computeVertexNormals();
      bag.add(s.material('#ffffff', { roughness: 0.8, side: THREE.DoubleSide }), leaf, at([0, 0.1, 0], [-Math.PI / 2, 0, 0.4]), new THREE.Color('#8a5a30').lerp(new THREE.Color('#b9772e'), mood.warmth * 0.6));
      bag.add(matte, taper([[-12, 0.4, 5], [0, 0.5, 0], [12, 0.4, -5]], () => 0.22, 6, 4), undefined, '#c59a62');
    }
    bag.flush(s.root);

    s.root.scale.setScalar(mix(0.0045, 0.0062, a.size));
    const pace = mix(0.6, 5, mood.energy), amount = mix(0.01, 0.07, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (a.pose === 'upturned') holder.rotation.z = Math.sin(time * pace) * amount * 2.2;
        else if (a.pose === 'walking') holder.rotation.y = Math.sin(time * pace * 0.6) * amount;
        else if (a.pose === 'peeking') holder.rotation.x = Math.sin(time * pace * 0.4) * amount * 0.6;
        extras.forEach((wrap, index) => { wrap.rotation.y += Math.sin(time * pace * 0.5 + index) * amount * 0.01; });
      },
    });
  },
});
