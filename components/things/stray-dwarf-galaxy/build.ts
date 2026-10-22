import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
type Dot = { at: P3; size: number; color: THREE.ColorRepresentation };
const CAST: Record<string, { stars: string[]; fuzz: string }> = {
  blue: { stars: ['#4f7fdc', '#7aa6ea', '#3a5fc0', '#b7cdf2'], fuzz: '#6f9be6' },
  red: { stars: ['#b9603a', '#d28b52', '#964630', '#e0ab72'], fuzz: '#c9805a' },
  green: { stars: ['#3fa46a', '#7cc68a', '#2c7f58', '#b9dca0'], fuzz: '#5cb884' },
  ghost: { stars: ['#8f86ac', '#a9a2c0', '#77708f', '#c2bdd2'], fuzz: '#9c94b8' },
};

export default defineThing({
  questions: {
    shape: choice('What shape is it?', {
      smudge: 'A lopsided smudge of two or three overlapping lumps.',
      cigar: 'A bent cigar, long and slightly crooked.',
      tadpole: 'A tadpole: a bright crowded head and a long thinning tail.',
      comma: 'A curled comma, as if it started to become a spiral and gave up.',
      dumbbell: 'Two small lumps joined by a thin bridge of stars.',
    }),
    nurseries: score('How many pink star-forming patches does it have?', ['None: it has stopped making stars', 'One or two', 'A handful', 'Riddled with them, more nursery than galaxy']),
    cast: choice('What colour cast does it have?', {
      blue: 'Blue-white: young, gassy and busy.',
      red: 'Dull red: starved of gas and quietly ageing.',
      green: 'Pea green, a strange compact burst of glowing gas.',
      ghost: 'Ghostly grey-violet, so spread out it is barely there.',
    }),
    fate: choice('What is happening to it?', {
      alone: 'Nothing at all: it drifts intact and unnoticed.',
      stream: 'It is being pulled apart: thin streams of stars trail off from both ends in an S.',
      stripped: 'Its gas is being blown out behind it in long tentacles, like a jellyfish.',
      swallowed: 'It is already being absorbed: one side dissolves into the curved golden edge of a far larger galaxy.',
    }),
    heart: choice('Does it have any kind of centre?', {
      none: 'No centre at all.',
      bar: 'A faint stubby bar of older stars.',
      cluster: 'One absurdly bright star cluster, far too big for it.',
    }),
    companion: noul('Does an even smaller clump tag along beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const gauss = () => (random() + random() + random() + random() - 2) / 1.2;
    const body = new THREE.Group();
    s.root.add(body);
    const cast = CAST[a.cast];
    const grey = new THREE.Color('#77717f');
    const tint = (list: string[]) => new THREE.Color(list[Math.floor(random() * list.length)]).lerp(grey, (1 - mood.cheer) * 0.2 + mood.wear * 0.15);
    const ragged = mix(0.75, 1.4, mood.wear);
    const thin = 0.38;
    const dots: Dot[] = [];
    const count = Math.round(mix(520, 1100, mood.density) * (a.cast === 'ghost' ? 0.55 : 1));
    const bloat = a.cast === 'ghost' ? 1.35 : a.cast === 'green' ? 0.8 : 1;

    /** A point on the galaxy's spine, t in 0..1, and how wide the body is there. */
    const lumps = [0, 1, 2].map(() => ({ x: (random() - 0.5) * 1.5, z: (random() - 0.5) * 0.9, r: 0.45 + random() * 0.45 }));
    const bend = (random() - 0.5) * 1.2;
    const sample = (): [number, number, number] => {
      const t = random();
      if (a.shape === 'smudge') { const lump = lumps[Math.floor(random() * lumps.length)]; return [lump.x, lump.z, lump.r]; }
      if (a.shape === 'cigar') { const x = (t - 0.5) * 3; return [x, bend * (x / 1.5) ** 2 * 0.5, 0.2 + 0.26 * Math.sin(Math.PI * t)]; }
      if (a.shape === 'tadpole') { const u = Math.pow(t, 1.9); return [-1.1 + u * 3.2, Math.sin(u * 2.6) * 0.5 * (bend > 0 ? 1 : -1), mix(0.5, 0.07, Math.pow(u, 0.6))]; }
      if (a.shape === 'comma') { const angle = t * 3.6, radius = 0.25 + t * 0.95; return [Math.cos(angle) * radius, Math.sin(angle) * radius, mix(0.42, 0.12, t)]; }
      const u = t < 0.42 ? 0 : t < 0.84 ? 1 : (t - 0.84) / 0.16;
      return [-1.05 + u * 2.1, Math.sin(u * Math.PI) * 0.2, u === 0 ? 0.5 : u === 1 ? 0.38 : 0.08];
    };
    for (let i = 0; i < count; i++) {
      const [x, z, r] = sample();
      const spread = r * bloat * ragged;
      dots.push({ at: [x + gauss() * spread, gauss() * spread * thin, z + gauss() * spread], size: (0.034 + random() * random() * 0.085) * (a.cast === 'ghost' ? 1.2 : 1), color: tint(cast.stars) });
    }
    const fuzzPaint = new THREE.MeshBasicMaterial({ color: cast.fuzz, transparent: true, opacity: a.cast === 'ghost' ? 0.08 : 0.1, depthWrite: false });
    for (let i = 0; i < 6; i++) {
      const [x, z, r] = sample();
      const fuzz = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), fuzzPaint);
      fuzz.position.set(x, 0, z); fuzz.scale.set(r * 1.7 * bloat * mix(0.8, 1.3, random()), r * 1.7 * bloat * thin * 1.3, r * 1.7 * bloat * mix(0.8, 1.3, random()));
      body.add(fuzz);
    }

    // Pink nurseries: a glowing knot, a halo and a spray of new blue-white stars.
    const pinkPaint = new THREE.MeshStandardMaterial({ color: '#f0679a', emissive: '#e23d7e', emissiveIntensity: mix(0.5, 1, mood.cheer), roughness: 0.5 });
    const pinkHalo = new THREE.MeshBasicMaterial({ color: '#f47aa8', transparent: true, opacity: 0.32, depthWrite: false });
    const nurseries = Math.round(mix(0, 8, a.nurseries));
    for (let i = 0; i < nurseries; i++) {
      const [x, z, r] = sample();
      const at = new THREE.Vector3(x + gauss() * r * 0.7, gauss() * r * 0.2 + 0.05, z + gauss() * r * 0.7);
      const size = 0.09 + random() * 0.1;
      const knot = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), pinkPaint);
      knot.position.copy(at); knot.scale.set(size * mix(1, 1.5, random()), size, size * mix(1, 1.4, random())); knot.castShadow = true;
      const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), pinkHalo);
      halo.position.copy(at); halo.scale.setScalar(size * 2.3);
      body.add(knot, halo);
      for (let k = 0; k < 9; k++) dots.push({ at: [at.x + gauss() * size * 2, at.y + gauss() * size, at.z + gauss() * size * 2], size: 0.03 + random() * 0.025, color: random() < 0.5 ? '#eaf2ff' : '#6fa0f0' });
    }

    if (a.heart === 'bar') {
      const [x, z] = sample();
      const bar = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), new THREE.MeshStandardMaterial({ color: '#e7c069', emissive: '#c98f2c', emissiveIntensity: 0.5, roughness: 0.6 }));
      bar.position.set(a.shape === 'smudge' ? x : a.shape === 'tadpole' ? -1.05 : 0, 0, a.shape === 'smudge' ? z : 0);
      bar.scale.set(0.42, 0.11, 0.14); bar.rotation.y = random() * 3; bar.castShadow = true;
      body.add(bar);
    } else if (a.heart === 'cluster') {
      const [x, z] = sample();
      const at: P3 = [x, 0.08, z];
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), new THREE.MeshBasicMaterial({ color: '#fffbe8' }));
      star.position.set(...at);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshBasicMaterial({ color: '#bcd4ff', transparent: true, opacity: 0.4, depthWrite: false }));
      halo.position.set(...at);
      body.add(star, halo);
      for (let k = 0; k < 4; k++) { const angle = k * Math.PI / 2 + 0.5; const spike = s.rod(at, [at[0] + Math.cos(angle) * 0.7, at[1], at[2] + Math.sin(angle) * 0.7], 0.03, new THREE.MeshBasicMaterial({ color: '#fffbe8' }), 0.002); body.add(spike); }
    }

    if (a.fate === 'stream') {
      for (const side of [-1, 1]) for (let i = 0; i < 190; i++) {
        const u = Math.pow(random(), 0.8), reach = 2.6;
        const x = side * (1.1 + u * reach), z = side * (0.25 + Math.sin(u * 1.9) * 1.3);
        dots.push({ at: [x + gauss() * (0.16 - u * 0.09), gauss() * 0.07, z + gauss() * (0.16 - u * 0.09)], size: (0.024 + random() * 0.03) * (1.1 - u * 0.5), color: tint(cast.stars) });
      }
    } else if (a.fate === 'stripped') {
      const gasPaint = new THREE.MeshBasicMaterial({ color: a.cast === 'red' ? '#d86a8a' : '#5f8ff0' });
      const tentacles = 5 + Math.floor(random() * 3);
      for (let k = 0; k < tentacles; k++) {
        const z0 = (k / (tentacles - 1) - 0.5) * 1.5, reach = 1.6 + random() * 1.6, wave = random() * 6;
        const path: P3[] = [];
        for (let i = 0; i <= 6; i++) { const u = i / 6; path.push([0.5 + u * reach, Math.sin(u * 3 + wave) * 0.1, z0 * (1 + u * 0.4) + Math.sin(u * 4 + wave) * 0.16]); }
        const tube = s.tube(path, 0.035, gasPaint); body.add(tube);
        for (let i = 0; i < 4; i++) { const p = path[2 + i]; const knot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05 + random() * 0.04, 1), pinkPaint); knot.position.set(p[0], p[1], p[2]); knot.castShadow = true; body.add(knot); }
      }
      // A compressed bright leading edge where it ploughs into the wind.
      for (let i = 0; i < 120; i++) { const angle = Math.PI + (random() - 0.5) * 1.9; dots.push({ at: [Math.cos(angle) * 1.25 + 0.2 + gauss() * 0.04, gauss() * 0.12, Math.sin(angle) * 1.0 + gauss() * 0.04], size: 0.03 + random() * 0.03, color: '#eaf2ff' }); }
    } else if (a.fate === 'swallowed') {
      // The rim of something enormous, of which we only see a curved fragment.
      const centre = new THREE.Vector3(7.6, 0, 0.6), big = 5.6;
      const gold = ['#e2a528', '#c98016', '#f0c858', '#b06c12'];
      for (let i = 0; i < 620; i++) {
        const angle = Math.PI + (random() - 0.5) * 0.95, radius = big + Math.abs(gauss()) * 0.9;
        dots.push({ at: [centre.x + Math.cos(angle) * radius, gauss() * 0.14, centre.z + Math.sin(angle) * radius * 0.9], size: 0.03 + random() * 0.04, color: tint(gold) });
      }
      for (let i = 0; i < 200; i++) { const u = random(); dots.push({ at: [0.6 + u * 1.5 + gauss() * 0.14, gauss() * 0.08, 0.3 * u + gauss() * (0.3 - u * 0.15)], size: 0.024 + random() * 0.03, color: tint(u > 0.6 ? gold : cast.stars) }); }
      const rim = new THREE.Mesh(new THREE.TorusGeometry(big + 0.35, 0.45, 8, 40, 1), new THREE.MeshBasicMaterial({ color: '#e8b040', transparent: true, opacity: 0.22, depthWrite: false }));
      rim.rotation.x = Math.PI / 2; rim.rotation.z = Math.PI - 0.5; rim.position.copy(centre); rim.scale.y = 0.9;
      body.add(rim);
    }

    if (a.companion) {
      const home = new THREE.Vector3(-1.9 - random() * 0.5, 0.2, (random() < 0.5 ? -1 : 1) * (0.9 + random() * 0.5));
      for (let i = 0; i < 70; i++) dots.push({ at: [home.x + gauss() * 0.2, home.y + gauss() * 0.1, home.z + gauss() * 0.16], size: 0.024 + random() * 0.03, color: tint(cast.stars) });
      const fuzz = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), fuzzPaint); fuzz.position.copy(home); fuzz.scale.y = 0.5; body.add(fuzz);
    }

    const cloud = s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), dots);
    cloud.castShadow = false;
    body.add(cloud);
    // Tipped up so its face shows, like a specimen on a stand.
    body.rotation.x = mix(0.5, 0.8, random());
    body.rotation.z = (random() - 0.5) * 0.5;

    const speed = mix(0, 0.1, mood.energy);
    const pivot = new THREE.Vector3();
    const thing = s.finish({ update: (dt) => { body.rotateOnAxis(pivot.set(0, 1, 0), dt * speed); } });
    return thing;
  },
});
