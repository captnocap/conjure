import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const GLOWS = {
  blue: 'A cold blue-white glow, like deep glacier light.',
  green: 'A sickly green bioluminescent glow.',
  amber: 'A warm amber glow, like something still warm inside.',
  violet: 'An unnatural violet glow.',
  red: 'A dull red ember glow, a warning.',
  dark: 'It has gone dark: the core that used to glow is now dull black ice.',
} as const;
const GLOW_COLOUR: Record<keyof typeof GLOWS, string> = {
  blue: '#7fd4ff', green: '#7dff8a', amber: '#ffb648', violet: '#c07bff', red: '#ff4a3a', dark: '#15191d',
};
const BANDS = {
  ash: 'Thin grey and black bands of volcanic ash.',
  rust: 'Rust-red and ochre bands of mineral salts.',
  organic: 'Dark green-black smears and specks, something that was once alive.',
  milky: 'Milky white bands of trapped air bubbles in clear blue ice.',
  creature: 'Mostly clean ice, but one core holds a small dark curled shape with legs.',
} as const;
const BAND_INK: Record<keyof typeof BANDS, string[]> = {
  ash: ['#2b2e31', '#5a5f63', '#16181a'],
  rust: ['#a5492a', '#c9853a', '#6e2b1c'],
  organic: ['#1f3324', '#0e1a12', '#3f5a2c'],
  milky: ['#ffffff', '#eef7fb', '#d5e9f2'],
  creature: ['#8f9aa0', '#c5d2d8', '#6c777c'],
};

interface Spot { at: [number, number, number]; axis: 'x' | 'y'; length: number }

export default defineThing({
  questions: {
    rack: choice('What kind of rack holds the cores?', {
      ladder: 'A slanted ladder rack: cores lie on rungs, one above the other, leaning back.',
      upright: 'A stand where the cores stand upright in two rows, like giant test tubes.',
      crate: 'An open insulated transport crate with its lid propped up, cores lying in foam grooves.',
      trestle: 'A long logging bench on two trestles, the cores laid end to end as one drilled column.',
    }),
    fill: score('How many cores are in the rack?', ['Just two or three', 'Half the places empty', 'Nearly full', 'Every place filled']),
    bands: choice('What is trapped in the dark layers of the cores?', BANDS),
    glow: choice('One core glows faintly. What colour is its light?', GLOWS),
    frame: choice('What is the rack made of?', {
      aluminium: 'Bare aluminium tube, light expedition gear.',
      timber: 'Rough timber, knocked together on site.',
      orange: 'Bright orange plastic, a hi-vis field kit.',
      steel: 'White enamelled steel, a clean laboratory fixture.',
    }),
    labels: choice('How are the cores labelled?', {
      depth: 'Paper tags giving the depth each core came from.',
      dates: 'Paper tags giving the age of each layer in years.',
      flags: 'Small coloured flags, one colour per core, no words.',
      warning: 'Yellow and black warning tags on every core.',
      none: 'No labels at all: unmarked and anonymous.',
    }),
    state: choice('What has happened to the samples?', {
      pristine: 'Freshly cut and perfectly kept.',
      melting: 'They are melting: drips hang from them and puddles spread underneath.',
      shattered: 'One core has been dropped and lies in broken pieces on the ground.',
      missing: 'One core has been taken, leaving an empty place and a dangling tag.',
      frosted: 'Furred over with thick white frost, long forgotten in the cold.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const frameColour = { aluminium: '#b6bcc0', timber: '#8a6845', orange: '#f26a1b', steel: '#eef0ee' }[a.frame];
    const frame = s.material(frameColour, { metalness: a.frame === 'aluminium' ? 0.8 : a.frame === 'steel' ? 0.3 : 0, roughness: a.frame === 'timber' ? 0.9 : 0.4 });
    const dark = s.material('#2a2f33', { roughness: 0.8 });
    const R = 0.085;
    const thick = a.frame === 'timber' ? 0.03 : 0.018;

    // Where cores can sit, per rack type.
    const spots: Spot[] = [];
    if (a.rack === 'ladder') {
      const rows = 5;
      for (let k = 0; k < rows; k++) {
        const y = 0.26 + k * 0.27, z = 0.42 - k * 0.16;
        spots.push({ at: [0, y + R, z], axis: 'x', length: 1.25 });
        for (const x of [-0.7, 0.7]) { s.box([0.04, 0.03, 0.2], [x, y - 0.015, z], frame); s.box([0.04, 0.09, 0.02], [x, y + 0.03, z + 0.09], frame); }
        s.rod([-0.7, y - 0.02, z - 0.07], [0.7, y - 0.02, z - 0.07], thick * 0.6, frame);
      }
      for (const x of [-0.7, 0.7]) {
        s.rod([x, 0, 0.62], [x, 1.62, -0.4], thick, frame);
        s.rod([x, 1.62, -0.4], [x, 0, -0.85], thick, frame);
        s.rod([x, 0.12, 0.49], [x, 0.12, -0.77], thick * 0.7, frame);
      }
      s.rod([-0.7, 1.62, -0.4], [0.7, 1.62, -0.4], thick, frame);
      s.rod([-0.7, 0.5, -0.63], [0.7, 0.5, -0.63], thick * 0.7, frame);
    } else if (a.rack === 'upright') {
      s.box([1.5, 0.1, 0.7], [0, 0.05, 0], frame);
      s.box([1.5, 0.03, 0.7], [0, 0.62, 0], frame);
      for (const x of [-0.72, 0.72]) for (const z of [-0.33, 0.33]) s.rod([x, 0, z], [x, 0.95, z], thick, frame);
      s.rod([-0.72, 0.95, -0.33], [0.72, 0.95, -0.33], thick, frame);
      s.rod([-0.72, 0.95, 0.33], [0.72, 0.95, 0.33], thick, frame);
      for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
        const x = -0.56 + i * 0.28, z = row ? -0.17 : 0.17;
        s.ring(R + 0.012, 0.01, [x, 0.64, z], dark).rotation.x = Math.PI / 2;
        spots.push({ at: [x, 0.1 + (row ? 0.62 : 0.52), z], axis: 'y', length: row ? 1.24 : 1.04 });
      }
    } else if (a.rack === 'crate') {
      s.box([1.6, 0.34, 0.9], [0, 0.17, 0], frame);
      s.box([1.5, 0.04, 0.8], [0, 0.345, 0], dark);
      for (const x of [-0.6, 0.6]) for (const z of [-0.455, 0.455]) s.box([0.08, 0.06, 0.02], [x, 0.24, z], dark);
      const lid = s.box([1.6, 0.07, 0.9], [0, 0.72, -0.62], frame);
      lid.rotation.x = -1.15;
      s.box([1.5, 0.03, 0.8], [0, 0.73, -0.585], dark).rotation.x = -1.15;
      for (const x of [-0.78, 0.78]) s.rod([x, 0.34, -0.2], [x, 0.78, -0.56], 0.01, dark);
      for (let i = 0; i < 4; i++) spots.push({ at: [0, 0.36 + R * 0.8, 0.3 - i * 0.2], axis: 'x', length: 1.36 });
    } else {
      for (const x of [-0.95, 0.95]) {
        for (const z of [-0.32, 0.32]) s.rod([x, 0, z], [x, 0.82, z * 0.25], thick, frame);
        s.rod([x, 0.3, -0.25], [x, 0.3, 0.25], thick * 0.7, frame);
      }
      s.box([2.4, 0.035, 0.46], [0, 0.835, 0], frame);
      for (const z of [-0.23, 0, 0.23]) s.box([2.4, 0.07, 0.015], [0, 0.885, z], frame);
      for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++)
        spots.push({ at: [-0.92 + i * 0.46, 0.855 + R, row ? -0.115 : 0.115], axis: 'x', length: 0.42 });
      // A ruler strip along the bench: this is one column, read left to right.
      s.label('0 m  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  DEEP', 2.3, 0.08, [0, 0.8, 0.235], '#20262a', '#e9e4cf');
    }

    const wanted = Math.max(3, Math.round(mix(0.2, 1, a.fill) * spots.length));
    const order = spots.map((_spot, index) => index);
    if (a.rack !== 'trestle') for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const present = new Set(order.slice(0, wanted));
    const kept = [...present].sort((p, q) => p - q);
    const glowIndex = kept[Math.floor(random() * kept.length)];
    let special = kept[Math.floor(random() * kept.length)];
    if (special === glowIndex) special = kept[(kept.indexOf(special) + 1) % kept.length];

    const inks = BAND_INK[a.bands];
    const paint = (glowing: boolean, creature: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const base = ctx.createLinearGradient(0, 0, 0, 256);
      const tintA = a.bands === 'milky' ? '#6fb2d6' : '#a9d6ea', tintB = a.bands === 'milky' ? '#4a94c0' : '#7fbcd8';
      base.addColorStop(0, tintA); base.addColorStop(0.5 + random() * 0.3, tintB); base.addColorStop(1, tintA);
      ctx.fillStyle = base; ctx.fillRect(0, 0, 64, 256);
      const count = creature ? 3 : 7 + Math.floor(random() * 8);
      for (let i = 0; i < count; i++) {
        ctx.globalAlpha = 0.8 + random() * 0.2;
        ctx.fillStyle = inks[Math.floor(random() * inks.length)];
        const y = random() * 250, h = 3 + random() * random() * 26;
        ctx.fillRect(0, y, 64, h);
        if (a.bands === 'organic') for (let d = 0; d < 14; d++) ctx.fillRect(random() * 64, y + (random() - 0.5) * 40, 2 + random() * 5, 2 + random() * 4);
      }
      ctx.globalAlpha = 1;
      if (creature) {
        ctx.fillStyle = '#14100e'; ctx.strokeStyle = '#14100e'; ctx.lineWidth = 2.5;
        for (const cx of [16, 48]) {
          ctx.beginPath(); ctx.ellipse(cx, 128, 9, 26, 0, 0, Math.PI * 2); ctx.fill();
          for (let leg = 0; leg < 5; leg++) for (const side of [-1, 1]) {
            ctx.beginPath(); ctx.moveTo(cx, 108 + leg * 10); ctx.quadraticCurveTo(cx + side * 12, 100 + leg * 10, cx + side * 15, 116 + leg * 10); ctx.stroke();
          }
        }
      }
      if (glowing && a.glow !== 'dark') {
        const g = ctx.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, GLOW_COLOUR[a.glow]); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 0.55; ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 256); ctx.globalAlpha = 1;
      }
      if (glowing && a.glow === 'dark') { ctx.globalAlpha = 0.8; ctx.fillStyle = '#15191d'; ctx.fillRect(0, 0, 64, 256); ctx.globalAlpha = 1; }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const tagText = (index: number) => a.labels === 'depth' ? `${(index + 1) * (40 + Math.floor(random() * 50))} m`
      : a.labels === 'dates' ? `${((index + 1) * (3 + Math.floor(random() * 9)))}k yr` : a.labels === 'warning' ? '! ! !' : '';
    const flagColours = ['#e23b3b', '#f2c230', '#2f8fd8', '#3db46d', '#f27c1f', '#b455c9'];
    const tag = (index: number, at: [number, number, number]) => {
      if (a.labels === 'none') return;
      if (a.labels === 'flags') {
        s.rod(at, [at[0], at[1] + 0.16, at[2]], 0.004, dark);
        const flag = s.box([0.09, 0.055, 0.004], [at[0] + 0.045, at[1] + 0.135, at[2]], s.material(flagColours[index % flagColours.length], { emissive: flagColours[index % flagColours.length], emissiveIntensity: 0.15 }));
        flag.rotation.y = (random() - 0.5) * 0.6;
        return;
      }
      const label = s.label(tagText(index), 0.17, 0.085, at, '#1d2226', a.labels === 'warning' ? '#f4c81e' : '#f3eedb');
      label.rotation.z = (random() - 0.5) * 0.25;
    };

    let glowMaterial: THREE.MeshStandardMaterial | null = null;
    const frost = s.material('#f4fbff', { roughness: 1 });
    const frostPoints: { at: [number, number, number]; size: number }[] = [];
    const water = new THREE.MeshStandardMaterial({ color: '#7fb2c8', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.75 });

    spots.forEach((spot, index) => {
      const here = present.has(index);
      const removed = (a.state === 'missing' || a.state === 'shattered') && index === special;
      if (!here || removed) {
        if (removed && a.state === 'missing' && a.labels !== 'none') {
          const [x, y, z] = spot.at;
          s.rod([x, y, z + 0.06], [x + 0.02, y - 0.16, z + 0.07], 0.003, dark);
          s.label('TAKEN', 0.13, 0.06, [x + 0.02, y - 0.19, z + 0.072], '#ffffff', '#b3261e').rotation.z = 0.2;
        }
        return;
      }
      const glowing = index === glowIndex;
      const texture = paint(glowing, a.bands === 'creature' && (index === special || glowing));
      const lit = glowing && a.glow !== 'dark';
      const material = new THREE.MeshStandardMaterial({
        map: texture, roughness: 0.22, metalness: 0.05,
        emissive: lit ? GLOW_COLOUR[a.glow] : '#9fd0e6', emissiveMap: lit ? null : texture, emissiveIntensity: lit ? mix(1.1, 1.8, mood.cheer) : 0.1,
      });
      if (lit) glowMaterial = material;
      const haloAt = lit ? spot : null;
      const shrink = a.state === 'melting' ? mix(0.72, 0.95, random()) : 1;
      const length = spot.length * (spot.axis === 'x' && a.rack !== 'trestle' ? mix(0.82, 1, random()) : 1);
      const core = s.cylinder(R * shrink, R * shrink * (a.state === 'melting' ? 1.12 : 1), length, spot.at, material, 20);
      if (spot.axis === 'x') { core.rotation.z = Math.PI / 2; core.rotation.x = random() * 6; core.position.y -= R * (1 - shrink); }
      else core.rotation.y = random() * 6;
      if (haloAt) {
        const halo = new THREE.Mesh(new THREE.CylinderGeometry(R * 2, R * 2, length * 1.04, 20), new THREE.MeshStandardMaterial({ color: GLOW_COLOUR[a.glow], emissive: GLOW_COLOUR[a.glow], emissiveIntensity: 1.2, transparent: true, opacity: 0.22, depthWrite: false }));
        halo.position.copy(core.position); halo.rotation.copy(core.rotation); s.root.add(halo);
      }
      // Tag hangs at the near end of the core.
      if (spot.axis === 'x') tag(index, [spot.at[0] + (a.rack === 'trestle' ? 0 : length / 2 - 0.12), spot.at[1] + (a.labels === 'flags' ? R : 0.012), spot.at[2] + (a.labels === 'flags' ? 0 : R + 0.006)]);
      else tag(index, [spot.at[0], a.labels === 'flags' ? spot.at[1] + length / 2 : 0.8, spot.at[2] + (a.labels === 'flags' ? 0 : R + 0.006)]);
      if (a.state === 'frosted') for (let f = 0; f < 22; f++) {
        const t = (random() - 0.5) * length, angle = random() * Math.PI;
        frostPoints.push({ at: spot.axis === 'x' ? [spot.at[0] + t, spot.at[1] + Math.sin(angle) * R, spot.at[2] + Math.cos(angle) * R] : [spot.at[0] + Math.cos(angle * 2) * R, spot.at[1] + t, spot.at[2] + Math.sin(angle * 2) * R], size: 0.012 + random() * 0.022 });
      }
      if (a.state === 'melting') {
        const drips = 1 + Math.floor(random() * 3);
        for (let d = 0; d < drips; d++) {
          const x = spot.at[0] + (spot.axis === 'x' ? (random() - 0.5) * length * 0.8 : 0);
          const top = spot.axis === 'x' ? spot.at[1] - R : spot.at[1] - length / 2 + 0.05;
          s.rod([x, top, spot.at[2]], [x, top - 0.04 - random() * 0.08, spot.at[2]], 0.007, water, 0.002);
          const puddle = s.cylinder(0.07 + random() * 0.14, 0.09 + random() * 0.14, 0.006, [x + (random() - 0.5) * 0.1, 0.004, spot.at[2] + (random() - 0.5) * 0.1 + (a.rack === 'crate' ? 0.55 : 0)], water, 18);
          puddle.scale.z = 0.6 + random() * 0.6;
        }
      }
    });

    if (a.state === 'frosted') {
      for (let f = 0; f < 60; f++) frostPoints.push({ at: [(random() - 0.5) * (a.rack === 'trestle' ? 2.3 : 1.5), 0.01 + random() * 0.03, (random() - 0.5) * 1.1], size: 0.02 + random() * 0.04 });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), frost, frostPoints);
    }
    if (a.state === 'shattered') {
      const texture = paint(false, false);
      const broken = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.25, emissive: '#9fd0e6', emissiveIntensity: 0.1 });
      const cx = a.rack === 'trestle' ? 0.4 : 0.25, cz = a.rack === 'ladder' ? 0.95 : 0.75;
      for (let piece = 0; piece < 5; piece++) {
        const length = 0.1 + random() * 0.22;
        const chunk = s.cylinder(R, R, length, [cx + (piece - 2) * 0.24 + (random() - 0.5) * 0.1, R, cz + (random() - 0.5) * 0.3], broken, 14);
        chunk.rotation.z = Math.PI / 2; chunk.rotation.y = (random() - 0.5) * 1.6;
      }
      const shards = Array.from({ length: 26 }, () => ({ at: [cx + (random() - 0.5) * 1.3, 0.012, cz + (random() - 0.5) * 0.55] as [number, number, number], size: 0.012 + random() * 0.03 }));
      s.scatter(new THREE.TetrahedronGeometry(1, 0), s.material('#d9eef6', { roughness: 0.2 }), shards);
    }
    // Field kit on the ground, more of it when the scene is busy.
    if (mood.density > 0.45 && a.rack !== 'crate') {
      const sx = a.rack === 'trestle' ? 0.2 : -0.35;
      s.box([0.34, 0.2, 0.24], [sx, 0.1, a.rack === 'ladder' ? -0.3 : 0], s.material('#3d6f8e'));
      s.box([0.36, 0.03, 0.26], [sx, 0.215, a.rack === 'ladder' ? -0.3 : 0], dark);
    }

    const glow = glowMaterial as THREE.MeshStandardMaterial | null;
    const base = glow ? glow.emissiveIntensity : 0;
    const pulse = mix(0.6, 3.2, mood.energy);
    return s.finish({ update: (_dt, time) => { if (glow) glow.emissiveIntensity = base * (0.82 + 0.18 * Math.sin(time * pulse)); } });
  },
});
