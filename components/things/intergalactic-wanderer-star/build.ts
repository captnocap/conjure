import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
type Dot = { at: P3; size: number; color: THREE.ColorRepresentation };
const STARS: Record<string, { surface: string; glow: string; deep: string; radius: number }> = {
  yellow: { surface: '#ffd04a', glow: '#f0a81e', deep: '#c97a10', radius: 0.55 },
  orange: { surface: '#f59a3a', glow: '#e2701e', deep: '#b04a12', radius: 0.5 },
  red: { surface: '#e0563a', glow: '#c63522', deep: '#8c1f18', radius: 0.36 },
  blue: { surface: '#8fb4ff', glow: '#4a7cf0', deep: '#2748b8', radius: 0.62 },
  white: { surface: '#e4ebff', glow: '#7f9ae8', deep: '#5068c0', radius: 0.27 },
};
const WORLDS: Record<string, [string, string]> = {
  ocean: ['#3f78c8', '#e8eef2'],
  rust: ['#b85a34', '#7a3a26'],
  ice: ['#cfe0ea', '#8fb0c8'],
  cinder: ['#4a4448', '#d8562e'],
};

export default defineThing({
  questions: {
    star: choice('What kind of star is it?', {
      yellow: 'An ordinary yellow star, the kind nobody would look at twice.',
      orange: 'A steady orange star, older and slower.',
      red: 'A small red dwarf, a banked ember that will outlast everything.',
      blue: 'A fierce blue-white runaway, flung out at enormous speed.',
      white: 'A tiny white dwarf, the cooling core of a star that already died.',
    }),
    dim: score('How dim is it?', ['Blazing with a wide glow', 'Bright', 'Subdued', 'Barely a glow, a pilot light']),
    surface: choice('If there is a planet, what is it like?', {
      ocean: 'Blue with white cloud, quietly alive.',
      rust: 'Dry rust red.',
      ice: 'Pale and frozen.',
      cinder: 'A dark cinder with glowing cracks.',
    }),
    planet: choice('Does it still have its planet?', {
      one: 'Yes: one small planet still circling.',
      moon: 'A planet with a moon of its own, a whole small household.',
      ringed: 'A banded giant with a ring, far too grand for its lonely star.',
      rubble: 'Only a ring of rubble where the planet used to be.',
      lost: 'It lost it: the orbit is an empty dashed line, and the planet drifts away on its own.',
    }),
    orbit: choice('What is the orbit like?', {
      close: 'Tight and close, huddled against the warmth.',
      wide: 'A wide, patient circle.',
      eccentric: 'A long lopsided ellipse, swinging far out and back.',
    }),
    trail: choice('Does anything show where it came from or where it is going?', {
      none: 'Nothing: no reference points at all.',
      home: 'A faint dotted trail leads back to a tiny distant galaxy, the home it was thrown out of.',
      bow: 'A curved bow wave ahead of it, from the speed of its flight.',
      wake: 'A long thin wake of gas streaming behind like a comet.',
    }),
    activity: choice('What is the star doing?', {
      calm: 'Burning calmly.',
      spotted: 'Freckled with dark starspots.',
      flaring: 'Throwing up looping flares and prominences.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const kind = STARS[a.star];
    const dots: Dot[] = [];
    const rubble: Dot[] = [];
    const gauss = () => (random() + random() + random() + random() - 2) / 1.2;
    const bright = 1 - a.dim;
    const glowOf = (colour: string, opacity: number) => new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false });
    const R = kind.radius;

    // The star.
    const surface = new THREE.Color(kind.surface).lerp(new THREE.Color(kind.deep), a.dim * 0.55);
    const star = s.ball([R, R, R], [0, 0, 0], new THREE.MeshStandardMaterial({ color: surface, emissive: surface, emissiveIntensity: mix(0.55, 1, bright), roughness: 0.7 }), 32);
    const shells: THREE.Mesh[] = [];
    const layers = 7, glowReach = mix(1.7, 3.6, bright);
    const reaches = Array.from({ length: layers }, (_unused, index) => mix(1.12, glowReach, (index / (layers - 1)) ** 1.4));
    for (const reach of reaches) {
      const shell = s.ball([R * reach, R * reach, R * reach], [0, 0, 0], glowOf(kind.glow, mix(0.1, 0.16, mood.cheer)), 24);
      shell.castShadow = false; shells.push(shell);
    }
    if (bright > 0.3) for (let k = 0; k < 12; k++) {
      const angle = k / 12 * Math.PI * 2 + random() * 0.2, lift = (random() - 0.5) * 1.2, reach = R * mix(1.5, 2.9, bright) * (k % 2 ? 0.7 : 1);
      const dir = new THREE.Vector3(Math.cos(angle) * Math.cos(lift), Math.sin(lift), Math.sin(angle) * Math.cos(lift));
      s.rod(dir.clone().multiplyScalar(R * 0.98).toArray() as P3, dir.clone().multiplyScalar(reach).toArray() as P3, R * 0.05, new THREE.MeshBasicMaterial({ color: kind.glow }), 0.003);
    }
    if (a.activity === 'spotted') for (let k = 0; k < 9; k++) {
      const dir = new THREE.Vector3(gauss(), gauss() * 0.6, gauss()).normalize();
      const spot = s.ball([R * (0.1 + random() * 0.1), R * (0.07 + random() * 0.06), R * 0.03], dir.clone().multiplyScalar(R * 0.99).toArray() as P3, new THREE.MeshStandardMaterial({ color: new THREE.Color(kind.deep).multiplyScalar(0.45), roughness: 0.9 }), 10);
      spot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    } else if (a.activity === 'flaring') for (let k = 0; k < 4; k++) {
      const loop = s.mesh(new THREE.TorusGeometry(R * (0.3 + random() * 0.28), R * 0.045, 6, 24, Math.PI * 1.15), new THREE.MeshBasicMaterial({ color: kind.glow }));
      const dir = new THREE.Vector3(gauss(), gauss(), gauss() * 0.5 + 0.4).normalize();
      loop.position.copy(dir.clone().multiplyScalar(R * 0.92));
      loop.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      loop.rotateZ(-0.1); loop.rotateY(random() * 3);
    }
    if (a.star === 'white') { const shell = s.mesh(new THREE.TorusGeometry(R * 3.4, R * 0.5, 8, 40), glowOf('#9fd8d0', 0.22)); shell.rotation.x = 1.2; shell.castShadow = false; }

    // The orbit: a hairline ellipse, tipped so it reads from above and from the side.
    const system = new THREE.Group();
    system.rotation.set(mix(0.2, 0.5, random()), random() * 6.28, mix(-0.25, 0.25, random()));
    s.root.add(system);
    const major = a.orbit === 'close' ? 1.15 : a.orbit === 'wide' ? 1.95 : 2.1;
    const minor = a.orbit === 'eccentric' ? 1.2 : major;
    const focus = a.orbit === 'eccentric' ? Math.sqrt(major * major - minor * minor) : 0;
    const onOrbit = (angle: number) => new THREE.Vector3(Math.cos(angle) * major - focus, 0, Math.sin(angle) * minor);
    const linePaint = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6a628f').lerp(new THREE.Color('#9a8a6a'), mood.warmth * 0.5), roughness: 0.7 });
    const dashes = a.planet === 'lost' ? 26 : 1;
    for (let k = 0; k < dashes; k++) {
      const from = k / dashes * Math.PI * 2, to = from + (dashes === 1 ? Math.PI * 2 : Math.PI * 2 / dashes * 0.5);
      const path: P3[] = [];
      const steps = dashes === 1 ? 72 : 3;
      for (let i = 0; i < (dashes === 1 ? steps : steps + 1); i++) path.push(onOrbit(mix(from, to, i / steps)).toArray() as P3);
      const line = s.tube(path, 0.018, linePaint, dashes === 1);
      system.add(line);
    }

    const [land, accent] = WORLDS[a.surface];
    const planet = new THREE.Group();
    system.add(planet);
    let planetAngle = random() * Math.PI * 2;
    const size = a.planet === 'ringed' ? 0.3 : 0.17;
    if (a.planet !== 'rubble') {
      const globe = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 16), s.material(land, { roughness: 0.7, emissive: a.surface === 'cinder' ? '#3a1408' : '#000000' }));
      globe.castShadow = true; planet.add(globe);
      const details = a.planet === 'ringed' ? 0 : 7;
      for (let k = 0; k < details; k++) {
        const dir = new THREE.Vector3(gauss(), gauss(), gauss()).normalize();
        const patch = new THREE.Mesh(new THREE.SphereGeometry(size * (0.22 + random() * 0.22), 10, 8), a.surface === 'cinder' ? new THREE.MeshBasicMaterial({ color: accent }) : s.material(accent, { roughness: 0.8 }));
        patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); patch.position.copy(dir.multiplyScalar(size * 0.86)); patch.scale.set(1, 0.5, 1);
        planet.add(patch);
      }
      if (a.planet === 'ringed') {
        for (let k = 0; k < 3; k++) { const band = new THREE.Mesh(new THREE.TorusGeometry(size * Math.cos((k - 1) * 0.5) * 1.005, size * 0.06, 6, 32), s.material(accent)); band.rotation.x = Math.PI / 2; band.position.y = size * Math.sin((k - 1) * 0.5); planet.add(band); }
        const ring = new THREE.Mesh(new THREE.RingGeometry(size * 1.4, size * 2.2, 48), new THREE.MeshStandardMaterial({ color: '#cdbb94', side: THREE.DoubleSide, roughness: 0.8 }));
        ring.rotation.x = Math.PI / 2 - 0.45; ring.castShadow = true; planet.add(ring);
      }
      if (a.planet === 'moon') {
        const moon = new THREE.Mesh(new THREE.SphereGeometry(size * 0.3, 14, 10), s.material('#b9b4ae'));
        moon.position.set(size * 2.3, size * 0.5, 0); moon.castShadow = true; planet.add(moon);
        const path = new THREE.Mesh(new THREE.TorusGeometry(size * 2.36, 0.008, 5, 40), linePaint); path.rotation.x = Math.PI / 2 - 0.21; planet.add(path);
      }
    } else {
      for (let i = 0; i < 260; i++) {
        const p = onOrbit(random() * Math.PI * 2).add(new THREE.Vector3(gauss() * 0.07, gauss() * 0.03, gauss() * 0.07));
        rubble.push({ at: p.toArray() as P3, size: 0.014 + random() * random() * 0.05, color: random() < 0.5 ? land : '#6f6a6a' });
      }
    }
    const placePlanet = () => {
      if (a.planet === 'lost') { planet.position.copy(onOrbit(planetAngle).multiplyScalar(1.55)); planet.position.y += 0.45; }
      else planet.position.copy(onOrbit(planetAngle));
    };
    placePlanet();

    // Where it came from, or how fast it is going.
    const heading = new THREE.Vector3(1, 0.12, 0.15).normalize();
    if (a.trail === 'home') {
      const reach = 3.4;
      for (let i = 0; i < 46; i++) { const u = (i + 1) / 47; const p = heading.clone().multiplyScalar(-(R * 2 + u * reach)); p.y += Math.sin(u * Math.PI) * 0.5; dots.push({ at: p.toArray() as P3, size: mix(0.04, 0.016, u), color: '#8a82a8' }); }
      const home = heading.clone().multiplyScalar(-(R * 2 + reach + 0.6));
      for (let i = 0; i < 300; i++) {
        const r = 0.05 + Math.pow(random(), 0.8) * 0.85, angle = (i % 2) * Math.PI + r * 6 + gauss() * 0.3;
        dots.push({ at: [home.x + Math.cos(angle) * r * 0.5, home.y + Math.sin(angle) * r, home.z + Math.cos(angle) * r * 0.6], size: 0.022 + random() * 0.03, color: ['#e2a528', '#c98016', '#8f7fd0', '#f0c858'][i % 4] });
      }
      s.ball([0.12, 0.12, 0.12], home.toArray() as P3, new THREE.MeshBasicMaterial({ color: '#f0c858' }), 12);
      s.ball([0.6, 0.9, 0.6], home.toArray() as P3, glowOf('#e2a528', 0.2), 14).castShadow = false;
    } else if (a.trail === 'bow') {
      // A paraboloid of points wrapped round the front of the star, open behind.
      const across = new THREE.Vector3().crossVectors(heading, new THREE.Vector3(0, 1, 0)).normalize(), upward = new THREE.Vector3().crossVectors(across, heading);
      const apex = R * 2.1 + 0.5;
      const profile = Array.from({ length: 14 }, (_unused, index) => { const r = index / 13 * 2.2; return new THREE.Vector2(r, -r * r * 0.42); });
      for (const [grow, opacity, colour] of [[1, 0.2, kind.glow], [1.18, 0.12, '#9a86d8']] as const) {
        const sheet = s.mesh(new THREE.LatheGeometry(profile, 40), new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
        sheet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), heading); sheet.position.copy(heading.clone().multiplyScalar(apex * grow)); sheet.scale.setScalar(grow); sheet.castShadow = false;
      }
      for (const r of [1.1, 2.2]) {
        const count = Math.round(r * 80);
        for (let i = 0; i < count; i++) {
          const turn = (i + random() * 0.6) / count * Math.PI * 2;
          const p = heading.clone().multiplyScalar(apex - r * r * 0.42).addScaledVector(across, Math.cos(turn) * r).addScaledVector(upward, Math.sin(turn) * r);
          dots.push({ at: p.toArray() as P3, size: 0.032, color: kind.glow });
        }
      }
      for (let i = 0; i < 40; i++) dots.push({ at: heading.clone().multiplyScalar(apex).add(new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(0.12)).toArray() as P3, size: 0.045, color: kind.glow });
    } else if (a.trail === 'wake') {
      for (let i = 0; i < 420; i++) {
        const u = Math.pow(random(), 0.7), p = heading.clone().multiplyScalar(-(R * 1.2 + u * 5));
        p.add(new THREE.Vector3(0, gauss(), gauss()).multiplyScalar(0.08 + u * 0.3)); p.y += Math.sin(u * 5) * 0.15;
        dots.push({ at: p.toArray() as P3, size: mix(0.045, 0.014, u), color: random() < 0.6 ? kind.glow : '#8f7fd0' });
      }
    }
    const dotPaint = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    if (dots.length) s.scatter(new THREE.IcosahedronGeometry(1, 0), dotPaint, dots).castShadow = false;
    if (rubble.length) { const ring = s.scatter(new THREE.IcosahedronGeometry(1, 0), dotPaint, rubble); system.add(ring); }

    const speed = mix(0.05, 0.5, mood.energy) * (a.orbit === 'close' ? 2 : 1);
    const wobble = random() * 10;
    return s.finish({
      update: (dt, time) => {
        if (a.planet !== 'lost') { planetAngle += dt * speed; placePlanet(); }
        planet.rotation.y += dt * 0.6;
        const beat = 1 + 0.04 * Math.sin(time * 1.7 + wobble);
        shells.forEach((shell, index) => shell.scale.setScalar(R * reaches[index] * beat));
        star.rotation.y += dt * 0.05;
      },
    });
  },
});
