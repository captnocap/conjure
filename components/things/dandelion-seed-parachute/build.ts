import * as THREE from 'three';
import { choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Bag, type Tone, V, aim, arc, dewMaterial, finish, matte, tube, xf } from './bits';

const SEED_TONES = { olive: '#7d7144', rust: '#9a5a30', straw: '#c9b47c', black: '#2f2a25' } as const;
type Canopy = 'full' | 'cupped' | 'flat' | 'ragged' | 'closed';

export default defineThing({
  questions: {
    moment: choice('Where is the seed in its journey?', {
      drifting: 'In the air, tilted, sailing over the grass tips.',
      leaving: 'Just lifting off the bald flower head, the last few others still attached behind it.',
      snagged: 'Caught by its down on a thread of spider silk between two stems.',
      weighed: 'Grounded by one fat dew drop sitting in the middle of its umbrella, the spokes bowed.',
      planted: 'Landed and stood upright with its seed tip in a crumb of soil, ready.',
    }),
    canopy: choice('What shape is its umbrella of down?', {
      full: 'A full round parasol, gently domed.',
      cupped: 'Swept up into a shuttlecock.',
      flat: 'A wide flat wheel of spokes.',
      ragged: 'Ragged: half the spokes are missing or bent.',
      closed: 'Damp and folded shut into a narrow brush.',
    }),
    spokes: score('How many spokes does the umbrella have?', ['A sparse dozen', 'A good wheel', 'A dense soft disc']),
    beak: score('How long is the stalk between seed and umbrella?', ['Short and stubby', 'Ordinary', 'Very long and hair thin']),
    seed: choice('What colour is the seed itself?', {
      olive: 'Olive brown, the usual.',
      rust: 'Rusty red-brown.',
      straw: 'Pale straw, unripe or bleached.',
      black: 'Nearly black.',
    }),
    company: noul('Are other seeds travelling with it?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const tone = (c: Tone, lift = 0) => new THREE.Color(c).offsetHSL((mood.warmth - 0.5) * 0.03, (mood.cheer - 0.5) * 0.2, lift);
    const downTone = tone('#8f958f', mix(-0.04, 0.06, mood.cheer)), seedTone = tone(SEED_TONES[a.seed]);
    const downMaterial = () => matte({ roughness: 0.7, emissive: '#6d726c', emissiveIntensity: 0.25 });
    const bodyMaterial = () => matte({ roughness: 0.8 });

    /** One seed standing on its tip at the origin. Returns the group and where the hub of the umbrella is. */
    const makeSeed = (canopy: Canopy, spokes: number, beakLength: number, bowed: number) => {
      const group = new THREE.Group(), body = new Bag(), down = new Bag();
      const L = 0.07;
      const spindle = Array.from({ length: 12 }, (_unused, i) => V(Math.sin(i * 0.5) * 0.001, (i / 11) * L, 0));
      body.add(tube(spindle, (t) => 0.002 + 0.0125 * Math.sin(Math.min(1, t * 1.25) ** 0.9 * Math.PI) ** 0.8, { sides: 8 }), seedTone);
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 + random(), y = L * (0.62 + (i % 3) * 0.08), r = 0.009;
        body.add(new THREE.ConeGeometry(0.0022, 0.012, 4), seedTone.clone().offsetHSL(0, 0, 0.08), aim(V(Math.cos(angle) * r, y, Math.sin(angle) * r), V(Math.cos(angle) * r * 2.2, y + 0.014, Math.sin(angle) * r * 2.2)));
      }
      const hub = V((random() - 0.5) * 0.02, L + beakLength, (random() - 0.5) * 0.02);
      body.add(tube(arc(V(0, L * 0.95, 0), hub, V(hub.x * 0.5, 0, hub.z * 0.5), 6), (t) => mix(0.003, 0.0016, t), { sides: 5 }), seedTone.clone().lerp(new THREE.Color('#c9c2a4'), 0.45));
      down.add(new THREE.SphereGeometry(1, 8, 6), downTone, xf(hub, V(0.005, 0.004, 0.005)));
      const R = 0.115;
      const rise = { full: 0.32, cupped: 0.75, flat: 0.06, ragged: 0.3, closed: 1.32 }[canopy] - bowed * 0.5;
      const gapAt = random() * Math.PI * 2;
      for (let i = 0; i < spokes; i++) {
        const angle = (i / spokes) * Math.PI * 2 + (random() - 0.5) * 0.12;
        const inGap = Math.abs(Math.atan2(Math.sin(angle - gapAt), Math.cos(angle - gapAt))) < 1.5;
        if (canopy === 'ragged' && inGap && random() < 0.75) continue;
        if (random() < mood.wear * 0.25) continue;
        const bent = canopy === 'ragged' && random() < 0.25;
        const length = R * (0.85 + random() * 0.2) * (bent ? 0.6 : 1), lift = rise + (random() - 0.5) * 0.14;
        const points: THREE.Vector3[] = [];
        for (let k = 0; k <= 4; k++) {
          const t = k / 4, e = lift - (canopy === 'closed' ? -0.05 : 0.38) * t * t - bowed * t - (bent && t > 0.5 ? 1.2 : 0);
          const prev: THREE.Vector3 = k ? points[k - 1] : hub;
          points.push(k ? prev.clone().add(V(Math.cos(angle) * Math.cos(e), Math.sin(e), Math.sin(angle) * Math.cos(e)).multiplyScalar(length / 4)) : hub.clone());
        }
        down.add(tube(points, (t) => mix(0.0012, 0.0007, t), { sides: 3 }), downTone.clone().offsetHSL(0, 0, (random() - 0.5) * 0.08));
        // Each spoke ends in a faint tuft.
        const tip = points[4];
        down.add(new THREE.SphereGeometry(1, 5, 4), downTone.clone().offsetHSL(0, 0, 0.06), xf(tip, 0.0019));
      }
      body.into(group, bodyMaterial());
      down.into(group, downMaterial());
      return { group, hub };
    };

    const spokes = Math.round(mix(14, 90, a.spokes));
    const beak = mix(0.07, 0.2, a.beak);
    const plant = new Bag(), silk = new Bag(), dew = new Bag();
    const green = new THREE.Color('#6f9a45').lerp(new THREE.Color('#c2a865'), mood.wear * 0.7 + (1 - mood.cheer) * 0.12);
    const tuft = (x: number, z: number, n: number, high: number) => {
      for (let i = 0; i < n; i++) {
        const base = V(x + (random() - 0.5) * 0.05, 0, z + (random() - 0.5) * 0.05);
        plant.add(tube(arc(base, base.clone().add(V((random() - 0.5) * 0.12, high * (0.5 + random() * 0.5), (random() - 0.5) * 0.1)), V(0, 0.02, 0), 6), (t) => mix(0.008, 0.001, t), { sides: 5, flat: 0.2 }), green.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1));
      }
    };
    const hero = makeSeed(a.canopy, spokes, beak, a.moment === 'weighed' ? 0.55 : 0);
    const carrier = new THREE.Group();
    carrier.add(hero.group);
    root.add(carrier);
    const drifters: { group: THREE.Group; home: THREE.Vector3; phase: number }[] = [];
    let float = 0, sway = 0.04;

    if (a.moment === 'drifting') {
      tuft(-0.03, 0, 6, 0.1);
      tuft(0.07, 0.03, 3, 0.07);
      carrier.position.set(0, 0.13, 0);
      hero.group.rotation.set(0.12, random() * 6, 0.42);
      float = 1;
    } else if (a.moment === 'leaving') {
      // A hollow stalk, the bald pitted head, turned-down bracts and the last few seeds.
      const head = V(0, 0.2, 0);
      plant.add(tube(arc(V(0.03, 0, 0), head, V(-0.02, 0, 0), 10), (t) => mix(0.009, 0.007, t), { sides: 8 }), tone('#b9c08a').lerp(new THREE.Color('#b9788a'), 0.2 + mood.warmth * 0.2));
      plant.add(new THREE.SphereGeometry(1, 18, 12), tone('#e3dfc9'), xf(head.clone().add(V(0, 0.012, 0)), V(0.034, 0.024, 0.034)));
      for (let i = 0; i < 26; i++) {
        const y = 1 - (i + 0.5) / 26 * 1.1, r = Math.sqrt(Math.max(0, 1 - y * y)), angle = i * 2.4;
        plant.add(new THREE.SphereGeometry(1, 5, 4), tone('#8f866a'), xf(head.clone().add(V(Math.cos(angle) * r * 0.034, 0.012 + y * 0.024, Math.sin(angle) * r * 0.034)), 0.003));
      }
      for (let i = 0; i < 11; i++) {
        const angle = (i / 11) * Math.PI * 2, from = head.clone().add(V(Math.cos(angle) * 0.02, 0, Math.sin(angle) * 0.02));
        plant.add(tube(arc(from, from.clone().add(V(Math.cos(angle) * 0.035, -0.055, Math.sin(angle) * 0.035)), V(Math.cos(angle) * 0.018, 0, Math.sin(angle) * 0.018), 6), (t) => mix(0.007, 0.001, t), { sides: 5, flat: 0.2, up: V(Math.cos(angle), 0.4, Math.sin(angle)) }), green);
      }
      tuft(0.03, 0, 5, 0.1);
      const left = 2 + Math.floor(random() * 3 + mood.density * 3);
      for (let i = 0; i < left; i++) {
        const other = makeSeed(a.canopy === 'ragged' ? 'full' : a.canopy, Math.round(spokes * 0.6), beak * 0.8, 0);
        const angle = random() * Math.PI * 2, tip = 0.5 + random() * 0.9;
        other.group.scale.setScalar(0.62);
        other.group.position.copy(head).add(V(Math.cos(angle) * Math.sin(tip) * 0.03, 0.012 + Math.cos(tip) * 0.02, Math.sin(angle) * Math.sin(tip) * 0.03));
        other.group.quaternion.setFromUnitVectors(V(0, 1, 0), V(Math.cos(angle) * Math.sin(tip), Math.cos(tip), Math.sin(angle) * Math.sin(tip)).normalize());
        root.add(other.group);
      }
      hero.group.scale.setScalar(0.72);
      carrier.position.copy(head).add(V(0.02, 0.085, 0.01));
      hero.group.rotation.set(0.1, random() * 6, -0.3);
      float = 0.6;
    } else if (a.moment === 'snagged') {
      const posts = [-0.17, 0.17].map((x) => { const lean = (random() - 0.5) * 0.04; return arc(V(x + lean, 0, 0), V(x, 0.34 + random() * 0.04, 0), V(lean * 0.4, 0, 0), 10); });
      for (const post of posts) { plant.add(tube(post, (t) => mix(0.007, 0.003, t), { sides: 6 }), green); tuft(post[0].x, 0, 4, 0.12); }
      const hold = V(0.01, 0.07 + beak + 0.045, 0.005);
      const A = posts[0][8], B = posts[1][9];
      silk.add(tube([A, hold, B], 0.0013, { sides: 4 }), '#8d9aa5');
      silk.add(tube([posts[0][6], hold.clone().add(V(0.02, -0.01, 0)), posts[1][5]], 0.001, { sides: 4 }), '#8d9aa5');
      for (let i = 0; i < 7; i++) { const t = random(), from = t < 0.5 ? A : B; dew.add(new THREE.SphereGeometry(1, 8, 6), null, xf(from.clone().lerp(hold, 0.2 + random() * 0.7).add(V(0, -0.002, 0)), 0.003 + random() * 0.004)); }
      // It hangs from its hub with the seed swinging free below.
      hero.group.position.copy(hero.hub).multiplyScalar(-1);
      const tilt = new THREE.Group();
      tilt.add(hero.group);
      tilt.rotation.set(0.25, random() * 6, 0.55);
      carrier.add(tilt);
      carrier.position.copy(hold);
      sway = 0.12;
    } else if (a.moment === 'weighed') {
      hero.group.rotation.set(0, random() * 6, 0.5);
      hero.group.updateMatrixWorld(true);
      const at = hero.hub.clone().applyMatrix4(hero.group.matrixWorld);
      dew.add(new THREE.SphereGeometry(1, 20, 14), null, xf(at.clone().add(V(0, 0.026, 0)), V(0.04, 0.036, 0.04)));
      for (let i = 0; i < 6; i++) dew.add(new THREE.SphereGeometry(1, 8, 6), null, xf(at.clone().add(V((random() - 0.5) * 0.14, -0.01 - random() * 0.03, (random() - 0.5) * 0.14)), 0.004 + random() * 0.005));
      tuft(-0.1, -0.03, 3, 0.07);
      sway = 0.015;
    } else {
      const soil = tone('#5b4a3a');
      plant.add(new THREE.SphereGeometry(1, 14, 8), soil, xf(V(0, 0, 0), V(0.07, 0.013, 0.06)));
      for (let i = 0; i < 26; i++) plant.add(new THREE.DodecahedronGeometry(1, 0), soil.clone().offsetHSL(0, 0, (random() - 0.5) * 0.12), xf(V((random() - 0.5) * 0.2, 0.003, (random() - 0.5) * 0.18), 0.003 + random() * 0.005, new THREE.Euler(random() * 3, random() * 3, 0)));
      carrier.position.set(0, -0.016, 0);
      hero.group.rotation.set(0.05, random() * 6, 0.14);
    }

    if (a.company) {
      const n = 2 + Math.round(mood.density * 3);
      for (let i = 0; i < n; i++) {
        const other = makeSeed(a.canopy === 'closed' ? 'cupped' : 'full', Math.round(mix(14, 40, a.spokes)), beak * 0.9, 0);
        const angle = random() * Math.PI * 2, distance = 0.2 + random() * 0.12;
        const home = V(Math.cos(angle) * distance, 0.05 + random() * 0.3, Math.sin(angle) * distance * 0.7 - 0.05);
        other.group.scale.setScalar(0.4 + random() * 0.2);
        other.group.rotation.set((random() - 0.5) * 0.8, random() * 6, (random() - 0.5) * 0.9);
        other.group.position.copy(home);
        root.add(other.group);
        drifters.push({ group: other.group, home, phase: random() * 6 });
      }
    }

    plant.into(root, matte({ roughness: 0.85 }));
    silk.into(root, matte({ roughness: 0.5, emissive: '#56626c', emissiveIntensity: 0.25 }));
    dew.into(a.moment === 'weighed' ? carrier : root, dewMaterial('#cfe6f5', '#7d9c8c', mix(0.2, 0.4, mood.cheer)));

    const base = carrier.position.clone(), pace = mix(0.3, 2.2, mood.energy), wind = mix(0.2, 1, mood.energy);
    return finish(root, (_dt, time) => {
      carrier.position.y = base.y + Math.sin(time * pace * 0.8) * 0.012 * float * wind;
      carrier.position.x = base.x + Math.sin(time * pace * 0.5) * 0.015 * float * wind;
      carrier.rotation.z = Math.sin(time * pace) * sway * wind * 1.5;
      carrier.rotation.x = Math.cos(time * pace * 0.7) * sway * wind;
      for (const drifter of drifters) {
        drifter.group.position.y = drifter.home.y + Math.sin(time * pace * 0.6 + drifter.phase) * 0.015 * wind;
        drifter.group.rotation.y += 0.004 * wind;
      }
    }, 0.14);
  },
});
