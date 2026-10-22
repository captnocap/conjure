import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const COLOURS = {
  classic: 'The classic: vivid green rising into a magenta-violet fringe.',
  crimson: 'Deep blood red from top to bottom, the rare great-storm aurora that people once took for war or fire.',
  violet: 'Blue-violet and hot pink, strange and electric.',
  ghost: 'Pale white-green, faint as breath, the way the eye really sees a weak display.',
  citrus: 'Yellow-green with a sharp pink lower hem.',
  teal: 'Cold teal and deep blue, like light under ice.',
} as const;
const FORMS = {
  arc: 'One quiet smooth bow from horizon to horizon.',
  drapery: 'Deep folded drapery, a theatre curtain in a draught.',
  spiral: 'A coiling spiral, the corona seen from right underneath.',
  rays: 'Separate tall rays like a picket fence of searchlights.',
  oval: 'A closed glowing ring, the whole auroral oval.',
} as const;
const HEIGHTS = ['A low band hugging the horizon', 'Tall curtains', 'Towering pillars that fill the sky'] as const;
const ACTS = {
  steady: 'Glowing steadily, patient and even.',
  flaring: 'Flaring up at one end, a bright surge racing along it.',
  breaking: 'Breaking up into torn patches and tatters, the storm at its peak.',
  fading: 'Thinning and fading out as dawn comes.',
} as const;
const VIEWS = {
  snow: 'From a snowy ridge with black spruce.',
  lake: 'Over a still dark lake that catches the colour.',
  ice: 'Over broken pack ice and pressure ridges.',
  orbit: 'From orbit: the curtain stands on the curved night side of the planet.',
  bare: 'No ground at all: only the light.',
} as const;
const WITNESSES = {
  nobody: 'Nobody. It performs for no one.',
  figure: 'One small figure standing with a camera on a tripod.',
  tent: 'A glowing tent.',
  cabin: 'A cabin with one lit window and chimney smoke.',
  sled: 'A dog sled and team stopped on the trail.',
} as const;
const PALETTES: Record<keyof typeof COLOURS, [string, string, string, string]> = {
  classic: ['#c8ffd8', '#1fdc64', '#22c0a0', '#c436dc'],
  crimson: ['#ffb8a0', '#f5362c', '#d01c3c', '#701058'],
  violet: ['#dcd0ff', '#6f58f8', '#b044e0', '#ff58b0'],
  ghost: ['#e6fff0', '#84dcaa', '#7cc4bc', '#aaa0de'],
  citrus: ['#ff5aa0', '#c4ee32', '#4cdc6c', '#2cacc0'],
  teal: ['#ccfff4', '#14d2c4', '#2892e4', '#4648d4'],
};

export default defineThing({
  questions: {
    colour: choice('What colour is the aurora?', COLOURS),
    form: choice('What shape does the light take?', FORMS),
    height: score('How high does it reach?', HEIGHTS),
    act: choice('What is the display doing right now?', ACTS),
    view: choice('Where is it seen from?', VIEWS),
    witness: choice('If it is seen from the ground, who is beneath it?', WITNESSES),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const WIDTH = 30, DEPTH = 11;
    const orbit = a.view === 'orbit';
    const tall = mix(6, 22, a.height) * (orbit ? 0.42 : 1);
    const lift = a.view === 'bare' ? 0 : orbit ? 3.7 : mix(4.6, 5.8, a.height);
    const palette = PALETTES[a.colour].map((tint) => new THREE.Color(tint));
    const layers = Math.round(mix(2, 6, mood.density)) + (a.form === 'spiral' || a.form === 'oval' ? -1 : 0);
    const agitation = mix(0.35, 1.5, mood.energy) * { steady: 0.7, flaring: 1.1, breaking: 1.6, fading: 0.5 }[a.act];
    const strength = { steady: 0.92, flaring: 0.95, breaking: 0.9, fading: 0.55 }[a.act] * (a.colour === 'ghost' ? 0.85 : 1);
    const light = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, alphaTest: 0.03 });

    // Smooth 1D value noise for ray heights and gaps.
    const table = Array.from({ length: 256 }, () => random());
    const noise = (x: number) => {
      const i = Math.floor(x), f = x - i, t = f * f * (3 - 2 * f);
      return table[i & 255] * (1 - t) + table[(i + 1) & 255] * t;
    };

    const COLUMNS = 150, ROWS = 9;
    const ribbons: { position: THREE.BufferAttribute; base: Float32Array; phase: number; speed: number; reach: number }[] = [];
    for (let layer = 0; layer < Math.max(1, layers); layer++) {
      const back = layers > 1 ? layer / (layers - 1) : 0.5;
      const seed = random() * 100, phase = random() * 6;
      const shrink = 1 - back * 0.3;
      const folds = { arc: 0.5, drapery: 2.4, spiral: 0, rays: 0.8, oval: 0.3 }[a.form] * agitation;
      const path = (u: number): [number, number] => {
        if (a.form === 'spiral') {
          const angle = u * Math.PI * 2 * 1.6 + phase, radius = (1.5 + u * (WIDTH * 0.42 - layer * 1.4));
          return [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.55];
        }
        if (a.form === 'oval') {
          const angle = u * Math.PI * 2, radius = WIDTH * 0.42 - layer * 2.2 + Math.sin(angle * 5 + phase) * 0.6 * agitation;
          return [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.5];
        }
        const x = (u - 0.5) * WIDTH * shrink;
        const bow = a.form === 'arc' ? -Math.cos((u - 0.5) * Math.PI) * 3 : 0;
        return [x, (0.5 - back) * DEPTH * 0.8 + bow + Math.sin(u * 9 + phase) * folds + Math.sin(u * 23 + seed) * folds * 0.35];
      };
      const positions = new Float32Array((COLUMNS + 1) * (ROWS + 1) * 3);
      const colours = new Float32Array((COLUMNS + 1) * (ROWS + 1) * 4);
      const tint = new THREE.Color();
      for (let column = 0; column <= COLUMNS; column++) {
        const u = column / COLUMNS;
        const [x, z] = path(u);
        const edge = a.form === 'oval' ? 1 : Math.min(1, Math.min(u, 1 - u) * (a.form === 'spiral' ? 14 : 7));
        const ray = 0.55 + 0.45 * noise(u * 70 + seed);
        let presence = edge;
        if (a.form === 'rays') presence *= THREE.MathUtils.smoothstep(noise(u * 16 + seed * 3), 0.42, 0.6);
        if (a.act === 'breaking') presence *= THREE.MathUtils.smoothstep(noise(u * 7 + seed * 5), 0.3, 0.55);
        if (a.act === 'flaring') presence *= mix(0.45, 1.25, THREE.MathUtils.smoothstep(u, 0.25, 0.85));
        const height = tall * (0.5 + 0.5 * noise(u * 11 + seed * 2)) * (1 - back * 0.35) * (a.form === 'rays' ? 1.2 : 1) * (a.act === 'flaring' ? mix(0.7, 1.2, u) : 1);
        const hem = lift + Math.sin(u * 13 + seed) * 0.4 * agitation + back * 1.2;
        for (let row = 0; row <= ROWS; row++) {
          const v = row / ROWS, index = column * (ROWS + 1) + row;
          positions.set([x, hem + height * v ** 1.25, z], index * 3);
          if (v < 0.12) tint.copy(palette[0]).lerp(palette[1], v / 0.12);
          else if (v < 0.5) tint.copy(palette[1]).lerp(palette[2], (v - 0.12) / 0.38);
          else tint.copy(palette[2]).lerp(palette[3], (v - 0.5) / 0.5);
          tint.multiplyScalar(0.8 + 0.2 * ray);
          const alpha = Math.min(1, v * 14) * (1 - v) ** 1.15 * 1.25 * ray * presence * strength * (1 - back * 0.25);
          colours.set([tint.r, tint.g, tint.b, row === ROWS ? 0 : Math.min(0.96, alpha)], index * 4);
        }
      }
      const index: number[] = [];
      for (let column = 0; column < COLUMNS; column++) for (let row = 0; row < ROWS; row++) {
        const p = column * (ROWS + 1) + row, q = p + ROWS + 1;
        index.push(p, q, p + 1, q, q + 1, p + 1);
      }
      const geometry = new THREE.BufferGeometry();
      const position = new THREE.BufferAttribute(positions, 3);
      geometry.setAttribute('position', position);
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 4));
      geometry.setIndex(index);
      const ribbon = s.mesh(geometry, light);
      ribbon.castShadow = ribbon.receiveShadow = false;
      ribbon.renderOrder = layer;
      ribbons.push({ position, base: positions.slice(), phase, speed: 0.5 + random() * 0.6, reach: (a.form === 'spiral' || a.form === 'oval' ? 0.25 : 0.7) * agitation });
    }

    // Whatever it is seen from. The ground takes a little of the sky's colour.
    const cast = palette[1].clone().multiplyScalar(0.5);
    const groundGlow = mix(0.12, 0.3, mood.cheer);
    const dark = new THREE.MeshStandardMaterial({ color: '#11161a', roughness: 0.9 });
    const surface = (x: number, z: number) => {
      const r = Math.hypot(x / 17, z / 9.5);
      return a.view === 'snow' ? 0.9 + 2.3 * Math.max(0, 1 - r * r) : a.view === 'ice' ? 1.0 : 0.9;
    };
    if (a.view === 'snow') {
      const hill = s.lathe([[17.3, 0], [17, 0.9], [14, 1.6], [10, 2.4], [5, 3.0], [0, 3.2]], new THREE.MeshStandardMaterial({ color: '#dfe8f0', roughness: 0.9, emissive: cast, emissiveIntensity: groundGlow }));
      hill.scale.z = 0.56;
      const trees = Math.round(mix(8, 46, mood.density));
      const cone = new THREE.ConeGeometry(0.42, 1, 7).translate(0, 0.5, 0);
      s.scatter(cone, new THREE.MeshStandardMaterial({ color: '#16241f', roughness: 1 }), Array.from({ length: trees }, () => {
        const angle = random() * Math.PI * 2, r = 0.45 + random() * 0.5;
        const x = Math.cos(angle) * 17 * r, z = Math.sin(angle) * 9.5 * r - 1;
        return { at: [x, surface(x, z) - 0.1, z] as [number, number, number], size: 1.6 + random() * 2.2 };
      }));
    } else if (a.view === 'lake') {
      const water = s.cylinder(17, 17, 0.9, [0, 0.45, 0], new THREE.MeshStandardMaterial({ color: '#14202c', roughness: 0.2, metalness: 0.3, emissive: cast, emissiveIntensity: groundGlow * 0.5 }), 48);
      water.scale.z = 0.56;
      const shore = s.ring(17, 0.4, [0, 0.9, 0], dark);
      shore.rotation.x = Math.PI / 2;
      shore.scale.y = 0.56;
      // Streaks of reflected light lying on the water.
      for (let i = 0; i < 12; i++) {
        const streak = s.box([0.35 + random() * 0.5, 0.02, 3 + random() * 4], [(random() - 0.5) * 24, 0.92, (random() - 0.3) * 6], new THREE.MeshBasicMaterial({ color: palette[i % 3 + 1], transparent: true, opacity: 0.6 * strength, depthWrite: false }));
        streak.castShadow = false;
      }
    } else if (a.view === 'ice') {
      const floe = new THREE.MeshStandardMaterial({ color: '#e6eef4', roughness: 0.7, emissive: cast, emissiveIntensity: groundGlow, flatShading: true });
      const sea = s.cylinder(17, 17, 0.8, [0, 0.4, 0], new THREE.MeshStandardMaterial({ color: '#122028', roughness: 0.3 }), 40);
      sea.scale.z = 0.56;
      for (let i = 0; i < 26; i++) {
        const angle = random() * Math.PI * 2, r = Math.sqrt(random()) * 0.92;
        const slab = s.cylinder(1.2 + random() * 2.4, 1.4 + random() * 2.4, 0.2 + random() * 0.2, [Math.cos(angle) * 17 * r, 0.9, Math.sin(angle) * 9.5 * r], floe, 5 + Math.floor(random() * 3));
        slab.rotation.y = random() * 3;
      }
      for (let i = 0; i < 9; i++) {
        const shard = s.mesh(new THREE.ConeGeometry(0.5 + random() * 0.6, 1 + random() * 1.8, 4), floe, [(random() - 0.5) * 22, 1.5, (random() - 0.5) * 9]);
        shard.rotation.set((random() - 0.5) * 0.9, random() * 3, (random() - 0.5) * 0.9);
      }
    } else if (orbit) {
      // A cap of the night side: dark ocean, a scatter of city lights and a thin lit limb.
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#16233c'; c.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(${40 + random() * 30},${60 + random() * 40},${70 + random() * 30},0.5)`; c.beginPath(); c.ellipse(random() * 512, random() * 512, 20 + random() * 70, 10 + random() * 40, random() * 3, 0, 7); c.fill(); }
      for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(220,230,240,${0.08 + random() * 0.14})`; c.beginPath(); c.ellipse(random() * 512, random() * 512, 16 + random() * 60, 5 + random() * 14, random() * 3, 0, 7); c.fill(); }
      for (let cluster = 0; cluster < 14; cluster++) {
        const cx = random() * 512, cy = random() * 512;
        for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(255,${190 + random() * 50},110,${0.5 + random() * 0.5})`; c.fillRect(cx + (random() - 0.5) * 50 * random(), cy + (random() - 0.5) * 50 * random(), 2, 2); }
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const cap = s.lathe(Array.from({ length: 14 }, (_unused, i) => { const t = i / 13; return [17.5 * t, i === 13 ? 0 : 0.8 + 2.6 * Math.cos(t * Math.PI / 2) ** 0.9] as const; }).reverse(), new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 0.8 }));
      cap.scale.z = 0.62;
      const limb = s.ring(17.3, 0.2, [0, 0.85, 0], new THREE.MeshBasicMaterial({ color: '#7fd0ff' }));
      limb.rotation.x = Math.PI / 2;
      limb.scale.y = 0.62;
    } else {
      // Only the light: a faint pool of its own glow keeps it standing on something.
      const pool = s.cylinder(15, 15, 0.05, [0, 0.025, 0], new THREE.MeshStandardMaterial({ color: palette[1].clone().lerp(new THREE.Color('#101820'), 0.7), roughness: 0.6, emissive: cast, emissiveIntensity: 0.4 }), 48);
      pool.scale.z = 0.5;
    }

    const grounded = a.view === 'snow' || a.view === 'lake' || a.view === 'ice';
    if (grounded && a.witness !== 'nobody') {
      const x = (random() - 0.5) * 8, z = a.view === 'lake' ? 8.4 : 5 + random() * 2.5;
      const y = surface(x, z);
      const warm = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb04a', emissiveIntensity: mix(1, 2.4, mood.cheer) });
      if (a.witness === 'figure') {
        s.cylinder(0.22, 0.3, 1.5, [x, y + 0.75, z], dark, 10);
        s.ball([0.24, 0.26, 0.24], [x, y + 1.72, z], dark, 10);
        for (const [dx, dz] of [[-0.35, 0.3], [0.35, 0.3], [0, -0.4]] as const) s.rod([x + 1.2 + dx, y, z + dz], [x + 1.2, y + 1.3, z], 0.035, dark);
        s.box([0.38, 0.26, 0.3], [x + 1.2, y + 1.42, z], dark);
      } else if (a.witness === 'tent') {
        const tent = s.mesh(new THREE.ConeGeometry(1.5, 1.7, 4), warm, [x, y + 0.8, z]);
        tent.rotation.y = Math.PI / 4;
        tent.scale.x = 1.5;
        s.rod([x - 1.8, y, z + 0.6], [x - 0.6, y + 1.3, z], 0.02, dark);
      } else if (a.witness === 'cabin') {
        s.box([3.2, 1.7, 2.4], [x, y + 0.8, z], new THREE.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.9 }));
        const roof = s.mesh(new THREE.CylinderGeometry(0.01, 1.9, 1.2, 4), new THREE.MeshStandardMaterial({ color: '#e8eef2', roughness: 0.9 }), [x, y + 2.25, z]);
        roof.rotation.y = Math.PI / 4;
        roof.scale.x = 1.35;
        s.box([0.7, 0.6, 0.06], [x - 0.6, y + 0.95, z + 1.21], warm);
        s.box([0.4, 0.9, 0.4], [x + 0.9, y + 2.4, z - 0.3], dark);
        for (let i = 0; i < 4; i++) s.ball([0.3 + i * 0.12, 0.3 + i * 0.1, 0.3 + i * 0.12], [x + 0.9 + i * 0.25, y + 3.1 + i * 0.6, z - 0.3], new THREE.MeshStandardMaterial({ color: '#c8ccd0', transparent: true, opacity: 0.5, depthWrite: false }), 8).castShadow = false;
      } else {
        s.box([2.2, 0.35, 0.7], [x, y + 0.35, z], new THREE.MeshStandardMaterial({ color: '#6b4a30', roughness: 0.9 }));
        s.rod([x - 1.1, y + 0.1, z - 0.35], [x + 1.3, y + 0.1, z - 0.35], 0.04, dark);
        s.rod([x - 1.1, y + 0.1, z + 0.35], [x + 1.3, y + 0.1, z + 0.35], 0.04, dark);
        s.cylinder(0.2, 0.26, 1.3, [x - 1.3, y + 0.65, z], dark, 8);
        s.ball([0.22, 0.24, 0.22], [x - 1.3, y + 1.5, z], dark, 8);
        for (let i = 0; i < 4; i++) {
          const dx = x + 2.2 + i * 0.9, dz = z + (i % 2 ? 0.3 : -0.3);
          s.ball([0.42, 0.24, 0.2], [dx, y + 0.4, dz], dark, 8);
          s.ball([0.16, 0.16, 0.15], [dx + 0.42, y + 0.55, dz], dark, 8);
        }
        s.rod([x + 1.1, y + 0.4, z], [x + 5.2, y + 0.4, z], 0.015, dark);
      }
    }
    if (orbit && a.witness !== 'nobody') {
      // From orbit the only witness is a speck of a station passing over.
      s.box([1.6, 0.12, 0.5], [6, tall + lift + 2.2, 2], new THREE.MeshStandardMaterial({ color: '#2a4a9a', emissive: '#1a3a8a', emissiveIntensity: 0.4 }));
      s.cylinder(0.2, 0.2, 1.4, [6, tall + lift + 2.2, 2], new THREE.MeshStandardMaterial({ color: '#e8e8e2' }), 10).rotation.x = Math.PI / 2;
    }

    return s.finish({
      update: (_dt, time) => {
        for (const ribbon of ribbons) {
          const { position, base } = ribbon;
          const array = position.array as Float32Array;
          for (let column = 0; column <= COLUMNS; column++) {
            const u = column / COLUMNS;
            const drift = Math.sin(time * ribbon.speed * agitation + u * 11 + ribbon.phase) * ribbon.reach + Math.sin(time * ribbon.speed * 0.6 * agitation + u * 27) * ribbon.reach * 0.35;
            for (let row = 0; row <= ROWS; row++) {
              const index = (column * (ROWS + 1) + row) * 3;
              array[index + 2] = base[index + 2] + drift * (0.4 + 0.6 * row / ROWS);
            }
          }
          position.needsUpdate = true;
        }
      },
    });
  },
});
