import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
const COLOURS: Record<string, [string, string, string]> = {
  blue: ['#3f7bff', '#8fb6ff', '#1f49c8'],
  white: ['#f0b83a', '#ffe9a6', '#c98a1a'],
  red: ['#d9502c', '#f09a62', '#9c2f1c'],
  green: ['#2fbf86', '#8fe6b8', '#17805c'],
};

export default defineThing({
  questions: {
    cone: score('How wide do the cones of light open?', ['Pencil-thin beams', 'Narrow searchlights', 'Broad funnels', 'A wide hourglass that floods half the sky']),
    colour: choice('What colour is its light?', {
      blue: 'Hard electric blue, unfiltered and merciless.',
      white: 'White-gold, like a furnace door.',
      red: 'Reddened by dust, a deep ember seen through smoke.',
      green: 'Ionised green, the eerie glow of gas it has lit from within.',
    }),
    pulse: choice('What is the light doing?', {
      steady: 'Burning steadily, as it has for a hundred million years.',
      flickering: 'Flickering: rings of earlier outbursts ripple outward through the host.',
      flaring: 'Flaring: a sudden outburst, bigger and spikier than ever.',
      dying: 'Dying: the point has shrunk to an ember and the cones are a fading echo that no longer reaches it.',
    }),
    host: score('How much of the host galaxy can be seen?', ['None: the glare has erased it', 'A faint smudge', 'Dim spiral arms', 'A whole galaxy, clearly still there']),
    dust: choice('What surrounds the central point?', {
      bare: 'Nothing: it is naked and blinding.',
      doughnut: 'A thick dark doughnut of dust that pinches the light into its two cones.',
      warped: 'A thin warped disc of dust, tilted like a hat brim.',
    }),
    lean: choice('How does it stand?', {
      upright: 'Upright, cones straight up and down like a lighthouse.',
      leaning: 'Leaning, the beam sweeping off at an angle.',
      toward: 'Tipped well forward so one cone sweeps out toward us.',
    }),
    jet: noul('Does a thin knotted jet shoot down the middle of each cone?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [main, pale, deep] = COLOURS[a.colour];
    const body = new THREE.Group();
    s.root.add(body);
    const add = <T extends THREE.Object3D>(node: T) => { body.add(node); return node; };
    const basic = (color: string, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side: opacity < 1 ? THREE.DoubleSide : THREE.FrontSide });
    const dying = a.pulse === 'dying', flaring = a.pulse === 'flaring';
    const power = dying ? 0.45 : flaring ? 1.35 : 1;
    const direction = () => { const v = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5); return v.lengthSq() ? v.normalize() : v.set(0, 1, 0); };

    // Host galaxy: a dim spiral of points that the glare mostly hides.
    const hostDots: { at: P3; size: number; color: THREE.ColorRepresentation }[] = [];
    const hostCount = Math.round(mix(40, 1500, a.host) * mix(0.8, 1.2, mood.density));
    const hostTints = ['#b9a27a', '#c9b48c', '#9d92b8', '#a7896a'].map((colour) => new THREE.Color(colour).lerp(new THREE.Color('#77717f'), mood.wear * 0.3));
    for (let i = 0; i < hostCount; i++) {
      const radius = 0.5 + Math.pow(random(), 0.75) * mix(1.4, 3, a.host);
      const angle = (i % 2) * Math.PI + radius * 1.25 + (random() - 0.5) * mix(1.6, 0.7, a.host);
      hostDots.push({ at: [Math.cos(angle) * radius, (random() - 0.5) * 0.16, Math.sin(angle) * radius], size: 0.024 + random() * 0.034, color: hostTints[i % hostTints.length] });
    }
    if (hostDots.length) { const dots = s.scatter(new THREE.IcosahedronGeometry(1, 0), basic('#ffffff'), hostDots); dots.castShadow = false; add(dots); }
    if (a.host > 0.2) { const fuzz = add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), basic('#b9a27a', 0.1 + a.host * 0.1))); fuzz.scale.set(mix(1.4, 3, a.host), 0.2, mix(1.4, 3, a.host)); }

    // Ionisation cones with solid rays inside so the beam survives every capture pass.
    const half = mix(0.11, 0.72, a.cone);
    const length = 3.4;
    const start = dying ? 1.1 : 0;
    const conePaint = basic(main, dying ? 0.14 : 0.24), rimPaint = basic(pale, dying ? 0.16 : 0.3);
    const rayPaint = new THREE.MeshBasicMaterial({ color: dying ? deep : main });
    const rayCount = Math.round(mix(7, 16, a.cone));
    const clumps: { at: P3; size: number; color: THREE.ColorRepresentation }[] = [];
    for (const up of [-1, 1]) {
      const cone = add(new THREE.Mesh(new THREE.ConeGeometry(Math.tan(half) * length, length, 40, 1, true), conePaint));
      cone.position.y = up * length / 2;
      cone.rotation.x = up > 0 ? Math.PI : 0;
      if (dying) { cone.scale.setScalar(1); const mask = add(new THREE.Mesh(new THREE.ConeGeometry(Math.tan(half) * start, start, 24, 1, true), basic('#f4f1ea', 0.0))); mask.visible = false; }
      const rim = add(new THREE.Mesh(new THREE.TorusGeometry(Math.tan(half) * length, 0.03, 6, 48), rimPaint));
      rim.rotation.x = Math.PI / 2; rim.position.y = up * length;
      for (let k = 0; k < rayCount; k++) {
        const around = k / rayCount * Math.PI * 2 + random() * 0.3, off = half * (k % 3 === 0 ? 0.45 : 0.97), reach = length * mix(0.8, 1, random());
        const dir = new THREE.Vector3(Math.sin(off) * Math.cos(around), up * Math.cos(off), Math.sin(off) * Math.sin(around));
        const from = dir.clone().multiplyScalar(Math.max(start, 0.32)), to = dir.clone().multiplyScalar(reach);
        add(s.rod(from.toArray() as P3, to.toArray() as P3, dying ? 0.012 : 0.03, rayPaint, 0.008));
      }
      for (let k = 0; k < mix(30, 110, mood.density); k++) {
        const u = mix(Math.max(start, 0.5), length, random()), spread = Math.tan(half) * u * Math.sqrt(random()), around = random() * 6.28;
        clumps.push({ at: [Math.cos(around) * spread, up * u, Math.sin(around) * spread], size: 0.03 + random() * 0.05, color: random() < 0.5 ? main : pale });
      }
      if (a.jet) {
        add(s.rod([0, up * 0.2, 0], [0, up * (length + 0.5), 0], 0.045, basic('#fffdf0'), 0.012));
        for (let k = 1; k <= 4; k++) add(s.ball([0.09, 0.15, 0.09], [0, up * (k * 0.8 + random() * 0.3), 0], basic(pale), 10));
      }
    }
    add(s.scatter(new THREE.IcosahedronGeometry(1, 0), basic('#ffffff'), clumps)).castShadow = false;

    // The point itself, its glare and its diffraction spikes.
    const core = add(s.ball([1, 1, 1], [0, 0, 0], basic(dying ? pale : '#fffef6'), 20));
    const coreSize = 0.3 * power;
    core.scale.setScalar(coreSize);
    const glare: THREE.Mesh[] = [];
    for (const [radius, opacity] of [[0.55, 0.72], [0.95, 0.34], [1.5, 0.16]] as const) {
      const shell = add(s.ball([1, 1, 1], [0, 0, 0], basic(main, opacity * (dying ? 0.5 : 1)), 20));
      shell.scale.setScalar(radius * power); shell.castShadow = false; glare.push(shell);
    }
    const spikes = flaring ? 8 : 4;
    if (!dying) for (let k = 0; k < spikes; k++) {
      const angle = k / spikes * Math.PI * 2 + 0.4, reach = (k % 2 ? 1.5 : 2.4) * power;
      add(s.rod([0, 0, 0], [Math.cos(angle) * reach, 0, Math.sin(angle) * reach], 0.06, basic(deep), 0.004));
    }
    if (a.pulse === 'flickering' || flaring) for (let k = 0; k < (flaring ? 2 : 4); k++) {
      const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.9 + k * 0.55 + random() * 0.2, 0.022, 6, 64, Math.PI * mix(1.2, 2, random())), basic(k % 2 ? pale : main)));
      ring.rotation.x = Math.PI / 2; ring.rotation.z = random() * 6.28;
    }

    if (a.dust === 'doughnut') {
      const torus = add(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.27, 14, 40), new THREE.MeshStandardMaterial({ color: '#4b3a36', roughness: 0.95 })));
      torus.rotation.x = Math.PI / 2; torus.castShadow = true;
    } else if (a.dust === 'warped') {
      for (let k = 0; k < 3; k++) {
        const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.6 + k * 0.22, 0.05, 6, 48), new THREE.MeshStandardMaterial({ color: '#5a4338', roughness: 0.95 })));
        ring.scale.z = 0.4; ring.rotation.x = Math.PI / 2 + 0.12 + k * 0.1; ring.rotation.y = k * 0.25; ring.castShadow = true;
      }
    }

    body.rotation.z = a.lean === 'leaning' ? (random() < 0.5 ? -1 : 1) * mix(0.35, 0.6, random()) : 0;
    body.rotation.x = a.lean === 'toward' ? 0.78 : (random() - 0.5) * 0.12;

    const rate = mix(0.5, 4, mood.energy), depth = a.pulse === 'flickering' ? 0.3 : a.pulse === 'steady' ? 0.04 : 0.14;
    const wobble = random() * 10;
    return s.finish({
      update: (_dt, time) => {
        const beat = 1 + depth * (Math.sin(time * rate * 3.1 + wobble) * 0.6 + Math.sin(time * rate * 7.7) * 0.4);
        core.scale.setScalar(coreSize * beat);
        glare.forEach((shell, index) => shell.scale.setScalar([0.55, 0.95, 1.5][index] * power * beat));
      },
    });
  },
});
