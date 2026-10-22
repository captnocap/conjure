import * as THREE from 'three';
import { choice, defineThing, mix, score } from '@conjure/kit';
import { Bag, type Tone, V, WOOL, crimp, finish, flake, flakeArm, flakePlan, ice, matte, tube, xf } from './bits';

const ICES: Record<string, readonly [string, string, string, string]> = {
  clear: ['#2f6fb0', '#5f9fd6', '#a6d0ef', '#285f9c'],
  frosted: ['#6f8fab', '#9db8cf', '#d3e2ee', '#5b7b98'],
  dusk: ['#5f50ad', '#9479cc', '#d6aede', '#4a4093'],
  lamplit: ['#b4772a', '#d9a352', '#f2d595', '#986020'],
  prism: ['#3f7fc0', '#6fa9dc', '#b0d6f0', '#2f6aa8'],
};

export default defineThing({
  questions: {
    form: choice('What kind of snow crystal is it?', {
      fern: 'A fern-like stellar dendrite: six arms thick with side branches and twigs, the Christmas-card flake.',
      stellar: 'A simple six-pointed star with a few short side arms, clean and legible.',
      sector: 'Six broad ridged blades like the petals of a glass flower.',
      plated: 'Thin spokes that each end in a small hexagonal plate, like a snowflake holding six coins.',
      spiked: 'Six bare needles from a tiny hub, severe as a compass rose.',
      twelve: 'A rare twelve-armed flake, two crystals fused, long arms alternating with short.',
    }),
    lushness: score('How elaborately branched are its arms?', ['Bare spokes', 'A few side arms', 'Feathered', 'A dense fern of ice']),
    state: choice('What has happened to it?', {
      crisp: 'Nothing yet: freshly landed, every point sharp.',
      rimed: 'Rimed: studded all over with frozen cloud droplets like sugar.',
      broken: 'One arm has snapped off and lies beside it.',
      melting: 'Starting to go: beads of water swell at the tips and the hub.',
      lopsided: 'It grew unevenly, arms of different lengths, an imperfect one.',
    }),
    rest: choice('How is it resting?', {
      upright: 'Standing on two arm tips in a pinch of snow, facing you like a star on display.',
      leaning: 'Tilted back at an angle, as if caught on a sleeve and held up to look at.',
      flat: 'Lying flat where it landed.',
    }),
    ice: choice('What is the ice like?', {
      clear: 'Clear blue glass ice.',
      frosted: 'Opaque sugar white with blue-grey shadow.',
      prism: 'Clear ice breaking the light: each arm glints a different rainbow colour.',
      dusk: 'Violet and rose, lit by the last of the day.',
      lamplit: 'Amber gold, caught in lamplight or a street light.',
    }),
    company: choice('What is with it?', {
      alone: 'Nothing. One flake.',
      dust: 'A scatter of diamond dust and broken tips around it.',
      fibres: 'A few dark wool fibres that caught it.',
      sibling: 'A second, much smaller flake close by.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group(), turner = new THREE.Group();
    const crystal = new Bag(), white = new Bag(), water = new Bag(), dark = new Bag(), still = new Bag();
    const R = 0.2, palette = ICES[a.ice];
    const warmShift = (mood.warmth - 0.5) * 0.05;
    const tone = (depth: number, arm: number): Tone => {
      const c = new THREE.Color(palette[depth]).offsetHSL(warmShift, 0, 0);
      return a.ice === 'prism' ? c.offsetHSL(arm / 6, 0.15, 0.02) : c;
    };
    const lush = Math.min(1, Math.max(0, a.lushness * 0.8 + mood.density * 0.25));
    const plan = flakePlan(a.form, lush, random);
    const rough = a.state === 'lopsided' ? 0.9 : mood.wear * 0.45;
    const brokenArm = a.state === 'broken' ? 1 + Math.floor(random() * 2) : undefined;
    const stub = 0.28 + random() * 0.15;
    const thick = a.form === 'sector' || a.form === 'plated' ? 0.045 : 0.05;
    // Two tips down when it stands, so it reads as balanced rather than impaled.
    const spin = plan.arms === 6 ? Math.PI / 6 : Math.PI / 12;
    const local = new THREE.Matrix4().makeRotationZ(spin).scale(V(R, R, R));
    const { anchors, tips } = flake(crystal, plan, { matrix: local, tone, thick, random, rough, broken: brokenArm, stub });

    if (a.state === 'rimed') {
      const beads = Math.round(mix(50, 130, lush));
      for (let i = 0; i < beads; i++) {
        const p = anchors[Math.floor(random() * anchors.length)].clone().multiplyScalar(0.55 + random() * 0.45);
        white.add(new THREE.IcosahedronGeometry(1, 0), '#f4f9fd', xf(p.add(V((random() - 0.5) * 0.012, (random() - 0.5) * 0.012, (random() - 0.5) * 0.014)), R * (0.02 + random() * 0.035)));
      }
    }
    if (a.state === 'melting' || mood.warmth > 0.85) {
      for (const tip of tips) water.add(new THREE.SphereGeometry(1, 12, 8), '#bfe0f4', xf(tip.clone().multiplyScalar(0.97), R * (0.03 + random() * 0.03)));
      water.add(new THREE.SphereGeometry(1, 14, 10), '#bfe0f4', xf(V(0, 0, R * 0.03), V(R * 0.15, R * 0.15, R * 0.09)));
    }

    const lowest = Math.min(...tips.map((tip) => tip.y));
    const iceMat = ice(mix(0.03, 0.16, mood.cheer), a.ice === 'frosted' ? { roughness: 0.6, clearcoat: 0.05, emissive: '#8fa6bb' } : a.ice === 'lamplit' ? { emissive: '#e0a040' } : a.ice === 'dusk' ? { emissive: '#9a7fd0' } : {});
    crystal.into(turner, iceMat);
    white.into(turner, matte({ roughness: 0.9, emissive: '#b9cbdc', emissiveIntensity: 0.25 }));
    water.into(turner, new THREE.MeshPhysicalMaterial({ roughness: 0.03, clearcoat: 1, emissive: '#5f9fd0', emissiveIntensity: 0.15, color: '#d6ecfa' }));

    let lift = 0;
    if (a.rest === 'upright') { turner.rotation.x = -0.14; lift = -lowest + 0.012; }
    else if (a.rest === 'leaning') { turner.rotation.x = -0.95; lift = -lowest * Math.cos(0.95) + 0.02; }
    else { turner.rotation.x = -Math.PI / 2; lift = thick * R + 0.004; }
    turner.position.y = lift;
    root.add(turner);

    // What it stands in or against.
    const snow = '#e9f1f8';
    if (a.rest === 'upright') {
      still.add(new THREE.SphereGeometry(1, 18, 10), snow, xf(V(0, -0.012, 0), V(R * 0.95, 0.034, R * 0.42)));
      for (let i = 0; i < 9; i++) still.add(new THREE.IcosahedronGeometry(1, 1), snow, xf(V((random() - 0.5) * R * 1.7, 0.006, (random() - 0.5) * R * 0.7), 0.008 + random() * 0.014));
    } else if (a.rest === 'leaning' && a.company !== 'fibres') {
      still.add(new THREE.SphereGeometry(1, 18, 10), snow, xf(V(0, 0, -R * 0.5), V(R * 0.5, R * 0.3, R * 0.3)));
    }
    if (a.company === 'dust') {
      for (let i = 0; i < 26; i++) {
        const angle = random() * Math.PI * 2, d = R * (0.5 + random() * 0.9);
        still.add(i % 3 ? new THREE.OctahedronGeometry(1, 0) : new THREE.CylinderGeometry(1, 1, 0.5, 6), i % 2 ? '#cfe6f6' : '#8fbfe4', xf(V(Math.cos(angle) * d, 0.004, Math.sin(angle) * d * 0.8 + R * 0.25), V(0.008, 0.003, 0.008).multiplyScalar(0.6 + random() * 1.4), new THREE.Euler(0, random() * 3, 0)));
      }
    }
    if (a.company === 'fibres') {
      const dye = new THREE.Color(Object.values(WOOL)[Math.floor(random() * 4)]);
      const fibres = 5 + Math.round(mood.density * 4);
      for (let i = 0; i < fibres; i++) {
        const x = (random() - 0.5) * R * 1.6, back = a.rest === 'flat' ? (random() - 0.5) * R : -R * (0.25 + random() * 0.5);
        const top = a.rest === 'flat' ? 0.03 + random() * 0.03 : lift * (0.5 + random() * 0.75);
        dark.add(tube(crimp(V(x + (random() - 0.5) * 0.1, 0, back - 0.05 + random() * 0.14), V(x, top, a.rest === 'flat' ? back : back * 0.6), 0.008, 3 + random() * 3, random, 0.1), (t) => mix(0.0045, 0.002, t), { sides: 5 }), dye.clone().offsetHSL(0, 0, (random() - 0.5) * 0.08));
      }
    }
    if (a.company === 'sibling') {
      const small = flakePlan(a.form === 'fern' ? 'stellar' : 'fern', 0.4, random), r = R * 0.34;
      const m = xf(V(R * 0.95, thick * r + 0.003, R * 0.55), r, new THREE.Euler(-Math.PI / 2, 0, random() * 2));
      flake(crystal, small, { matrix: m, tone, thick: 0.06, random });
      crystal.into(root, iceMat);
    }
    if (brokenArm !== undefined) {
      // The snapped arm lies where it fell, pointing away.
      const m = xf(V(-R * 0.75, thick * R * 0.6 + 0.003, R * 0.75), R, new THREE.Euler(-Math.PI / 2, 0, 1.9 + random() * 0.8)).multiply(new THREE.Matrix4().makeTranslation(0, -0.65, 0));
      flakeArm(crystal, plan, stub + 0.04, 1, m, (depth) => tone(depth, brokenArm), thick, () => 1, []);
      crystal.into(root, iceMat);
      for (let i = 0; i < 5; i++) still.add(new THREE.OctahedronGeometry(1, 0), '#a9d0ec', xf(V(-R * (0.3 + random() * 0.4), 0.004, R * (0.3 + random() * 0.4)), 0.004 + random() * 0.006));
    }
    still.into(root, matte({ roughness: 0.85, emissive: '#aebfd0', emissiveIntensity: 0.2, flatShading: true }));
    dark.into(root, matte({ roughness: 0.95 }));

    const pace = mix(0.2, 1.6, mood.energy), swing = mix(0.02, 0.3, mood.energy);
    return finish(root, (_dt, time) => {
      if (a.rest === 'flat') turner.rotation.z = Math.sin(time * pace * 0.5) * swing * 0.4;
      else turner.rotation.y = Math.sin(time * pace) * swing;
    }, R * 0.9);
  },
});

