import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const TAGS = {
  none: 'No tag at all, anonymous.',
  harmless: 'HARMLESS WEATHER INSTRUMENT',
  reward: 'REWARD IF FOUND',
  'return': 'PLEASE RETURN TO SENDER',
  serial: 'A bare serial number, No. 4471.',
  secret: 'PROPERTY OF — the rest torn away.',
} as const;
const TAG_TEXT: Record<keyof typeof TAGS, string> = {
  none: '', harmless: 'HARMLESS', reward: 'REWARD', 'return': 'RETURN', serial: 'No. 4471', secret: 'PROPERTY OF',
};

export default defineThing({
  questions: {
    size: score('How big is the balloon?', ['Small and limp, barely filled', 'Launch size, a taut teardrop', 'Stretched wide and thin', 'Swollen huge, about to burst']),
    state: choice('What is happening to it right now?', {
      rising: 'Rising free: balloon above, parachute folded on the line, box swinging underneath.',
      filling: 'Still on the ground being filled from a gas cylinder, tied down to a sandbag, the box waiting beside it.',
      burst: 'Burst: the balloon is rags, the parachute has opened and the box is coming down under it.',
      landed: 'Landed: the box lies in the grass with the parachute collapsed and shreds of latex beside it.',
    }),
    instrument: choice('What kind of instrument box does it carry?', {
      foam: 'A white foam box with a sensor boom sticking out and a wire antenna.',
      vintage: 'A 1940s cardboard box with a louvred vent and a round dial.',
      dongle: 'A tiny modern grey sensor no bigger than a paper cup, with a long whip antenna.',
      foil: 'A homemade lunchbox wrapped in crinkled foil with a camera lens poking out.',
      reflector: 'A foil radar reflector of three crossed squares above a small box.',
    }),
    tag: choice('If the box has a tag, what does it say?', TAGS),
    latex: choice('What colour is the balloon?', {
      cream: 'Pale cream natural latex, the standard.',
      white: 'Chalk white, almost lost against the sky.',
      red: 'A small red pilot balloon colour, easy to track by eye.',
      black: 'Black, for absorbing sunlight on a night launch.',
      amber: 'Translucent amber, like old rubber held to the light.',
    }),
    chute: choice('What colour is the parachute?', {
      orange: 'Safety orange.',
      red: 'Red and white panels.',
      white: 'Plain white, like a handkerchief.',
      blue: 'Faded blue plastic.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const train = new THREE.Group();
    s.root.add(train);
    const put = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = train) => { parent.add(node); return node; };

    const R = mix(0.42, 1.5, a.size);
    const taper = mix(0.6, 0.08, a.size);
    const latexTint = { cream: '#e9dcb8', white: '#f1f0e8', red: '#cf3a2b', black: '#2b2b30', amber: '#d9a04a' }[a.latex];
    const latex = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(latexTint).lerp(new THREE.Color('#ffffff'), a.size * 0.25), roughness: mix(0.55, 0.22, a.size), clearcoat: 0.5 });
    const chuteTint = { orange: '#f07a1c', red: '#d63a2e', white: '#efece2', blue: '#6f93b8' }[a.chute];
    const cloth = s.material(chuteTint, { roughness: 0.8, side: THREE.DoubleSide });
    const cloth2 = s.material(a.chute === 'red' ? '#f1ede2' : chuteTint, { roughness: 0.8, side: THREE.DoubleSide });
    const twine = s.material('#c9b98f', { roughness: 1 });
    const line = 0.012;

    // ----- the instrument box, built at the origin with its base on y = 0
    const box = new THREE.Group();
    let boxTop = 0.5;
    {
      const grime = mood.wear;
      const foam = s.material('#f2f1ea'), card = s.material('#a8855a'), grey = s.material('#8f979c'), dark = s.material('#2b2f33');
      const foil = s.material('#c9cdd2', { metalness: 0.9, roughness: mix(0.25, 0.5, grime), flatShading: true });
      const wire = s.material('#3a3d40', { metalness: 0.6 });
      if (a.instrument === 'foam') {
        put(s.box([0.42, 0.5, 0.32], [0, 0.25, 0], foam), box);
        put(s.box([0.44, 0.06, 0.34], [0, 0.4, 0], s.material('#3f7fc4')), box);
        put(s.rod([0.2, 0.42, 0], [0.62, 0.62, 0], 0.014, grey), box);
        put(s.box([0.1, 0.02, 0.05], [0.66, 0.64, 0], s.material('#d8c060', { metalness: 0.6 })), box);
        put(s.rod([-0.1, 0, 0.05], [-0.14, -0.55, 0.08], 0.006, wire), box);
      } else if (a.instrument === 'vintage') {
        put(s.box([0.46, 0.56, 0.36], [0, 0.28, 0], card), box);
        for (let i = 0; i < 5; i++) put(s.box([0.3, 0.018, 0.02], [0, 0.12 + i * 0.045, 0.185], dark), box);
        put(s.cylinder(0.085, 0.085, 0.02, [0, 0.43, 0.185], s.material('#efe6cc'), 20), box).rotation.x = Math.PI / 2;
        put(s.box([0.008, 0.07, 0.008], [0.015, 0.45, 0.2], dark), box).rotation.z = -0.6;
        put(s.rod([0.12, 0.56, 0], [0.12, 0.95, 0], 0.008, wire), box);
        put(s.box([0.48, 0.04, 0.38], [0, 0.56, 0], s.material('#8a6a44')), box);
        boxTop = 0.58;
      } else if (a.instrument === 'dongle') {
        put(s.cylinder(0.1, 0.085, 0.3, [0, 0.15, 0], s.material('#dfe2e2'), 16), box);
        put(s.cylinder(0.103, 0.103, 0.05, [0, 0.2, 0], s.material('#d24a2a'), 16), box);
        put(s.rod([0.04, 0.3, 0], [0.34, 0.5, 0], 0.008, grey), box);
        put(s.ball([0.025, 0.025, 0.025], [0.35, 0.51, 0], s.material('#e9e9e9'), 8), box);
        put(s.rod([0, 0, 0], [0.03, -0.7, 0.02], 0.005, wire), box);
        boxTop = 0.3;
      } else if (a.instrument === 'foil') {
        const wrap = put(s.mesh(new THREE.IcosahedronGeometry(0.34, 1), foil, [0, 0.26, 0]), box);
        wrap.scale.set(0.82, 0.76, 0.6);
        put(s.cylinder(0.07, 0.07, 0.08, [0, 0.24, 0.2], dark, 16), box).rotation.x = Math.PI / 2;
        put(s.cylinder(0.045, 0.045, 0.09, [0, 0.24, 0.21], s.material('#5577aa', { metalness: 0.5, roughness: 0.1 }), 16), box).rotation.x = Math.PI / 2;
        for (const x of [-1, 1]) put(s.box([0.03, 0.56, 0.01], [x * 0.2, 0.27, 0.19], s.material('#c8b23a')), box).rotation.z = x * 0.08;
        boxTop = 0.52;
      } else {
        put(s.box([0.26, 0.2, 0.2], [0, 0.1, 0], foam), box);
        const panel = new THREE.MeshStandardMaterial({ color: '#d2d6da', metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide });
        for (const turn of [[0, 0, 0], [Math.PI / 2, 0, 0], [0, Math.PI / 2, 0]] as const) {
          const square = put(s.mesh(new THREE.PlaneGeometry(0.62, 0.62), panel, [0, 0.72, 0]), box);
          square.rotation.set(turn[0], turn[1], Math.PI / 4);
        }
        put(s.rod([0, 0.2, 0], [0, 0.3, 0], 0.006, wire), box);
        boxTop = 1.16;
      }
      if (a.tag !== 'none') {
        const paper = mood.wear > 0.6 ? '#d9cfae' : '#f4efd9';
        const label = put(s.label(TAG_TEXT[a.tag], 0.34, 0.11, [0, a.instrument === 'reflector' ? 0.1 : a.instrument === 'dongle' ? -0.22 : 0.2, a.instrument === 'reflector' ? 0.103 : a.instrument === 'dongle' ? 0.02 : a.instrument === 'foil' ? 0.24 : a.instrument === 'vintage' ? 0.19 : 0.163], '#7a1f16', paper), box);
        label.rotation.z = (random() - 0.5) * 0.16;
        if (a.instrument === 'dongle') put(s.rod([0, 0, 0.02], [0, -0.17, 0.02], 0.004, twine), box);
        if (a.instrument === 'foil') label.position.y = 0.44, label.position.z = 0.17;
      }
    }

    box.scale.setScalar(1.45);
    boxTop *= 1.45;

    // ----- parts
    const balloon = () => {
      const profile: [number, number][] = [[0.001, -R * (1 + taper) - 0.2], [0.07, -R * (1 + taper) - 0.2], [0.05, -R * (1 + taper) - 0.1], [0.06, -R * (1 + taper) - 0.02]];
      const steps = 26;
      for (let i = 1; i <= steps; i++) {
        const angle = (i / steps) * Math.PI;
        const lower = angle < Math.PI / 2;
        profile.push([Math.max(0.001, R * Math.pow(Math.sin(angle), lower ? 1 + taper * 1.6 : 1)), -Math.cos(angle) * R * (lower ? 1 + taper : 1)]);
      }
      const group = new THREE.Group();
      put(s.lathe(profile, latex), group);
      put(s.ring(0.062, 0.014, [0, -R * (1 + taper) - 0.1, 0], twine), group).rotation.x = Math.PI / 2;
      return { group, neck: R * (1 + taper) + 0.2 };
    };
    const canopy = (radius: number, open: number) => {
      const group = new THREE.Group();
      const gores = 8;
      for (let i = 0; i < gores; i++) {
        const dome = new THREE.SphereGeometry(radius, 5, 10, (i / gores) * Math.PI * 2, (Math.PI * 2) / gores, 0, mix(0.35, 1.25, open));
        const gore = put(s.mesh(dome, i % 2 ? cloth : cloth2), group);
        gore.scale.set(mix(0.22, 1, open), mix(1.7, 0.75, open), mix(0.22, 1, open));
      }
      const rim = Math.sin(mix(0.35, 1.25, open)) * radius * mix(0.22, 1, open);
      const drop = radius * mix(1.7, 0.75, open) * Math.cos(mix(0.35, 1.25, open));
      const knot = drop - mix(0.7, 1.75, open) * radius;
      for (let i = 0; i < gores; i++) {
        const angle = (i / gores) * Math.PI * 2;
        put(s.rod([Math.cos(angle) * rim, drop, Math.sin(angle) * rim], [0, knot, 0], 0.006, twine), group);
      }
      return { group, top: radius * mix(1.7, 0.75, open), knot };
    };
    const rags = (count: number, length: number) => {
      const group = new THREE.Group();
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, lean = mix(0.15, 0.7, random());
        const points: [number, number, number][] = [];
        for (let k = 0; k < 5; k++) {
          const t = k / 4;
          points.push([Math.cos(angle) * lean * t * length + Math.sin(k * 2 + i) * 0.06, t * length * mix(0.6, 1, random()), Math.sin(angle) * lean * t * length]);
        }
        const strip = put(s.tube(points, mix(0.03, 0.07, random()), latex), group);
        strip.scale.z = 0.5;
      }
      put(s.cylinder(0.05, 0.065, 0.14, [0, 0, 0], latex, 10), group);
      return group;
    };

    const lean = mix(0.04, 0.36, mood.energy) * (random() < 0.5 ? -1 : 1);
    let sway: THREE.Object3D | null = null;

    if (a.state === 'rising') {
      const L = 3.4;
      const at = (t: number): [number, number, number] => [lean * L * Math.pow(t, 1.5), boxTop + 0.25 + t * L, 0];
      put(box).position.y = 0.25;
      box.rotation.z = -lean * 0.6;
      put(s.tube([[0, boxTop + 0.2, 0], at(0.1), at(0.25), at(0.5), at(0.75), at(1)], line, twine));
      const chute = canopy(0.8, 0.2);
      const where = at(0.42);
      put(chute.group).position.set(where[0], where[1] - chute.top + 0.75, 0);
      chute.group.rotation.z = -lean * 0.8;
      const b = balloon();
      const neck = at(1);
      put(b.group).position.set(neck[0], neck[1] + b.neck, 0);
      b.group.rotation.z = -lean * 0.5;
      sway = train;
    } else if (a.state === 'filling') {
      const b = balloon();
      const neckY = 1.05;
      put(b.group).position.set(0, neckY + b.neck, 0);
      b.group.rotation.z = lean * 0.4;
      sway = b.group;
      // Sandbag tether, gas cylinder with regulator and hose, the box and its coiled line waiting.
      const canvas = s.material('#9b8a66', { roughness: 1 });
      put(s.ball([0.26, 0.15, 0.2], [0.05, 0.14, 0.3], canvas, 12));
      put(s.rod([0.05, 0.28, 0.3], [0, neckY, 0], line, twine));
      const tank = s.material(mood.cheer > 0.5 ? '#b5532f' : '#59626b', { metalness: 0.5, roughness: 0.45 });
      const tx = -(R * 0.5 + 0.55);
      put(s.cylinder(0.15, 0.15, 1.15, [tx, 0.575, 0], tank, 18));
      put(s.ball([0.15, 0.1, 0.15], [tx, 1.15, 0], tank, 16));
      put(s.cylinder(0.04, 0.05, 0.12, [tx, 1.28, 0], s.material('#c2a64a', { metalness: 0.8, roughness: 0.3 }), 10));
      put(s.cylinder(0.055, 0.055, 0.025, [tx + 0.07, 1.31, 0.03], s.material('#f3f1e6'), 14)).rotation.x = Math.PI / 2;
      put(s.tube([[tx, 1.34, 0], [tx * 0.7, 1.5, 0.1], [tx * 0.3, 0.75, 0.12], [0, neckY - 0.02, 0]], 0.018, s.material('#2c2c2e')));
      put(box).position.set(R * 0.5 + 0.6, 0, 0.15);
      box.rotation.y = -0.4;
      for (let i = 0; i < 5; i++) put(s.ring(0.16 - i * 0.008, 0.012, [R * 0.5 + 0.55, 0.015 + i * 0.022, 0.7], twine)).rotation.x = Math.PI / 2;
      const chute = canopy(0.6, 0.05);
      put(chute.group).position.set(R * 0.5 + 1.0, 0.1, 0.55);
      chute.group.rotation.set(0, 0.5, Math.PI / 2 - 0.12);
    } else if (a.state === 'burst') {
      put(box).position.y = 0.2;
      box.rotation.z = lean * 1.3 + 0.15;
      const chute = canopy(1.05, 1);
      const knotY = boxTop + 0.5;
      put(s.rod([0, boxTop + 0.15, 0], [lean * 0.5, knotY, 0], line, twine));
      put(chute.group).position.set(lean * 0.5, knotY - chute.knot, 0);
      chute.group.rotation.z = -lean * 0.5;
      const apex = knotY - chute.knot + chute.top;
      put(s.tube([[lean * 0.5, apex - 0.02, 0], [lean * 0.5 + 0.12, apex + 0.5, 0.05], [lean * 0.5 - 0.1, apex + 0.95, 0], [lean * 0.5 + 0.05, apex + 1.35, 0]], line, twine));
      const tatters = rags(6 + Math.floor(a.size * 5), mix(0.6, 1.5, a.size));
      put(tatters).position.set(lean * 0.5 + 0.05, apex + 1.35, 0);
      sway = train;
    } else {
      const grass = s.material(new THREE.Color('#7f9a4c').lerp(new THREE.Color('#a79b62'), mood.wear), { roughness: 1 });
      const tufts = Array.from({ length: 46 }, () => ({ at: [(random() - 0.5) * 4.2, 0.1, (random() - 0.5) * 2.0] as [number, number, number], size: mix(0.6, 1.5, random()) }));
      s.scatter(new THREE.ConeGeometry(0.035, 0.24, 4), grass, tufts);
      put(box).position.set(0, 0.16, 0.1);
      box.rotation.set(0.2, 0.5, 1.15);
      const chute = canopy(1.0, 1);
      put(chute.group).position.set(1.55, -0.02, -0.25);
      chute.group.scale.set(1, 0.3, 0.8);
      chute.group.rotation.z = -0.25;
      put(s.tube([[0.25, 0.25, 0.1], [0.6, 0.08, 0.3], [1.0, 0.05, -0.1], [1.4, 0.1, -0.2]], line, twine));
      put(s.tube([[-0.25, 0.2, 0.1], [-0.6, 0.03, 0.45], [-0.95, 0.03, -0.25], [-1.35, 0.03, 0.3], [-1.75, 0.05, 0.05]], line, twine));
      const tatters = rags(5 + Math.floor(a.size * 5), mix(0.5, 1.2, a.size));
      put(tatters).position.set(-1.8, 0.06, 0.05);
      tatters.rotation.z = 1.35;
      tatters.scale.set(1, 1, 0.6);
    }

    const pace = mix(0.3, 1.6, mood.energy);
    const rest = sway ? sway.rotation.z : 0;
    return s.finish({
      footprint: a.state === 'landed' ? 2 : 0.9,
      update(_dt, time) {
        if (sway) sway.rotation.z = rest + Math.sin(time * pace) * 0.035 * (0.4 + mood.energy);
      },
    });
  },
});
