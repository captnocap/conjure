import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score, visibleBounds } from '@conjure/kit';

const MASKS = {
  bauta: 'The bauta: a stark white face with a jutting square jaw and no mouth, under a black tricorn.',
  doctor: 'The plague doctor: a long curved beak and round glass eyes.',
  colombina: 'The colombina: a gilded half-mask with upswept eyes and a spray of feathers.',
  jester: 'The jester: a grinning face in a collar of points and bells.',
  volto: 'The volto: a blank, beautiful full face with painted lips.',
  cat: 'The gatto: a cat face with pricked ears and whiskers.',
  moretta: 'The moretta: a small mute oval of black velvet.',
  sun: 'A golden sun face ringed with rays.',
} as const;
type MaskKind = keyof typeof MASKS;
const PALETTES = {
  'ivory-gold': 'Ivory white with gold leaf and a touch of red, the classic.',
  'black-red': 'Black lacquer and blood red, menacing.',
  peacock: 'Teal, violet and green with peacock feathers.',
  antique: 'Tea-stained and crackled, browns and old rose, like something inherited.',
  candy: 'Pink, turquoise and glitter for the tourists.',
} as const;
const TONES: Record<keyof typeof PALETTES, { base: string; accent: string; second: string; feathers: string[]; cloth: string }> = {
  'ivory-gold': { base: '#f4efe2', accent: '#dcae3a', second: '#b3202c', feathers: ['#fbf8ee', '#dcae3a', '#b3202c'], cloth: '#6a1826' },
  'black-red': { base: '#1f1c22', accent: '#c4182a', second: '#d9aa3a', feathers: ['#1a181c', '#c4182a', '#5a0c14'], cloth: '#2a2a30' },
  peacock: { base: '#f1ede2', accent: '#0f8f93', second: '#6a2fa0', feathers: ['#0f8f93', '#2fa05a', '#6a2fa0', '#1f4fb0'], cloth: '#1d2f4a' },
  antique: { base: '#d8c9a8', accent: '#8a6a3a', second: '#7a3038', feathers: ['#7a5a3a', '#b9a888', '#7a3038'], cloth: '#4a3a2c' },
  candy: { base: '#fbf4f6', accent: '#ff5fa2', second: '#3fc4e0', feathers: ['#ff5fa2', '#3fc4e0', '#ffd83a', '#b06aff'], cloth: '#5a2a6a' },
};

export default defineThing({
  questions: {
    dominant: choice('Which mask dominates the display?', MASKS),
    palette: choice('What is the palette of the masks?', PALETTES),
    stand: choice('What kind of stand are they shown on?', {
      easel: 'A tilted wooden board on an A-frame, a street stall.',
      tree: 'A turned wooden post with arms, masks hanging like fruit, one set on top like a head.',
      tiers: 'Stepped wooden shelves with the masks propped in rows.',
      panel: 'An upright framed panel backed in velvet, a shop-window piece.',
    }),
    stock: score('How many masks are on it?', ['Three or four choice pieces', 'A comfortable spread', 'Crammed, overlapping, every peg taken']),
    finery: score('How dressed are the masks?', ['Bare painted faces', 'A few ribbons', 'Dripping with ribbons, feathers and bells']),
    absent: choice('Is anything out of place?', {
      nothing: 'No, every mask is on its peg.',
      'empty-peg': 'One peg is empty, its ribbon still hanging: a mask has been sold, or taken.',
      'face-down': 'One mask lies face down on the ground in front of the stand.',
      turned: 'One mask has been hung backwards, showing its hollow inside.',
    }),
    sign: choice('What sign is on the stand?', {
      none: 'None.',
      handmade: 'A hand-lettered card: FATTO A MANO.',
      price: 'A price card: 25 EURO.',
      nophoto: 'A curt card: NO FOTO.',
      carnival: 'A painted board: CARNEVALE.',
    }),
    watching: noul('Do the eyes of the main mask glow faintly, as if someone is behind it?'),
    displaySize: score('What is the overall scale of the display?', ['A compact stall of small masks', 'A street display at chest height', 'A tall display with large theatrical masks']),
    ornament: choice('What small ornament marks the brows of the masks?', {
      plain: 'The existing painted face is left clear.', pearls: 'Three small pearl beads over the brow.',
      diamond: 'A single raised diamond at the forehead.', curls: 'Two fine gold scrolls frame the brow.',
    }),
    tieEnds: choice('If ribbons are present, how are their ends finished?', {
      plain: 'Plain ribbon ends.', beads: 'A small bead weights each ribbon end.',
      tassels: 'Short tassels hang at the ends of the ribbons.', forked: 'Two narrow tails split from the end of each ribbon.',
    }),
    header: choice('What rises above the display?', {
      open: 'The stand has no header.', banner: 'A narrow fabric banner between two rear uprights.',
      awning: 'A shallow rear awning with a flat fabric top.', valance: 'A shallow awning with a scalloped front valance.',
    }),
    packing: choice('What packing supplies wait beside the stand?', {
      clear: 'No packing supplies.', box: 'An open wooden packing box.',
      wrapped: 'A low crate holds two tied paper parcels.', tissue: 'A divided box carries folded paper and ribbon rolls.',
    }),
    footing: choice('What is the stand set on?', {
      boards: 'A small timber platform.', stone: 'A pale stone paving slab.',
      checker: 'A dark and pale tiled apron.', rug: 'A thin cloth rug with a stitched border.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tone = TONES[a.palette];
    const cache = new Map<string, THREE.MeshStandardMaterial>();
    const lacquer = (colour: string, extra?: THREE.MeshStandardMaterialParameters) => {
      if (extra) return s.material(colour, { roughness: 0.32, ...extra });
      if (!cache.has(colour)) cache.set(colour, s.material(colour, { roughness: 0.32 }));
      return cache.get(colour)!;
    };
    const gold = lacquer(a.palette === 'black-red' ? tone.second : a.palette === 'candy' ? '#f2d24a' : '#dcae3a', { metalness: 0.3, emissive: '#a87a1a', emissiveIntensity: mix(0.1, 0.3, mood.cheer) });
    const black = lacquer('#141318');
    const wood = s.material('#7a5232'), darkWood = s.material('#4a3020');
    const swaying: { node: THREE.Object3D; phase: number }[] = [];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    const makeMask = (kind: MaskKind, main: boolean) => {
      const g = new THREE.Group();
      const G = <T extends THREE.Object3D>(node: T) => { g.add(node); return node; };
      const swap = !main && random() < 0.3;
      const baseColour = kind === 'moretta' ? '#17151a' : kind === 'sun' ? '#e2b33c' : kind === 'colombina' ? (a.palette === 'black-red' ? '#1f1c22' : '#dcae3a') : swap ? tone.accent : tone.base;
      const face = lacquer(baseColour, kind === 'sun' || kind === 'colombina' ? { metalness: 0.25, emissive: '#7a5a10', emissiveIntensity: 0.15 } : {});
      const trim = lacquer(swap ? tone.base : tone.accent), second = lacquer(tone.second);
      const eyeMat = main && a.watching ? new THREE.MeshStandardMaterial({ color: '#ffb040', emissive: '#ff9a20', emissiveIntensity: 2.2 }) : black;
      const eyes = (y: number, spread: number, w = 0.03, h = 0.016, z = 0.052, tilt = 0) => { for (const side of [-1, 1]) G(s.ball([w, h, 0.012], [side * spread, y, z], eyeMat, 10)).rotation.z = side * tilt; };
      if (kind === 'colombina') {
        G(s.ball([0.115, 0.05, 0.045], [0, 0.03, 0.01], face, 16));
        for (const side of [-1, 1]) { G(s.cylinder(0, 0.035, 0.1, [side * 0.115, 0.075, 0.012], face, 8)).rotation.z = -side * 0.9; G(s.ball([0.012, 0.012, 0.012], [side * 0.075, 0.055, 0.05], second, 6)); }
        G(s.cylinder(0.014, 0.03, 0.06, [0, -0.005, 0.045], face, 8)).rotation.x = -0.3;
        eyes(0.03, 0.05, 0.032, 0.016, 0.045, 0.25);
        G(s.ball([0.02, 0.02, 0.02], [0, 0.07, 0.045], second, 8));
      } else {
        const small = kind === 'moretta' || kind === 'cat';
        G(s.ball([small ? 0.085 : 0.1, small ? 0.105 : 0.135, 0.06], [0, 0, 0], face, 18));
        G(s.cylinder(0.008, 0.022, 0.07, [0, -0.005, 0.06], face, 8)).rotation.x = -0.35;
        if (kind === 'bauta') {
          const jaw = G(s.box([0.15, 0.11, 0.12], [0, -0.085, 0.055], face)); jaw.rotation.x = 0.55;
          G(s.box([0.19, 0.022, 0.03], [0, 0.058, 0.05], face));
          eyes(0.03, 0.045, 0.032, 0.016, 0.054);
          const hat = new THREE.Shape(); hat.moveTo(-0.2, 0); hat.lineTo(0.2, 0); hat.lineTo(0.08, 0.1); hat.lineTo(0, 0.07); hat.lineTo(-0.08, 0.1); hat.closePath();
          G(s.mesh(new THREE.ExtrudeGeometry(hat, { depth: 0.1, bevelEnabled: false }), black, [0, 0.09, -0.04]));
          G(s.box([0.4, 0.012, 0.012], [0, 0.094, 0.062], gold));
          G(s.box([0.24, 0.2, 0.02], [0, -0.03, -0.03], black));
        } else if (kind === 'doctor') {
          const beak = G(s.mesh(new THREE.ConeGeometry(0.055, 0.34, 12), face, [0, -0.045, 0.2])); beak.rotation.x = Math.PI / 2 + 0.28;
          for (const side of [-1, 1]) { G(s.ring(0.032, 0.008, [side * 0.045, 0.045, 0.056], lacquer('#7a6a3a', { metalness: 0.4 }))); G(s.ball([0.028, 0.028, 0.008], [side * 0.045, 0.045, 0.054], main && a.watching ? eyeMat : lacquer('#2a3a3f', { roughness: 0.1 }), 10)); }
          for (let i = 0; i < 4; i++) G(s.ball([0.006, 0.006, 0.006], [0.02, -0.03 - i * 0.012, 0.1 + i * 0.045], black, 6));
          G(s.box([0.21, 0.02, 0.02], [0, 0.1, 0.035], lacquer('#3a2a20')));
        } else if (kind === 'jester') {
          eyes(0.035, 0.042, 0.03, 0.018, 0.054, 0.3);
          G(s.ring(0.04, 0.008, [0, -0.045, 0.05], second, Math.PI)).rotation.z = Math.PI;
          for (let i = 0; i < 7; i++) {
            const angle = -1.25 + i * 0.417, colour = i % 2 ? trim : second;
            const point = G(s.cylinder(0, 0.04, 0.16, [Math.sin(angle) * 0.17, 0.03 + Math.cos(angle) * 0.2, 0], colour, 4)); point.rotation.z = -angle; point.scale.z = 0.35;
            G(s.ball([0.02, 0.02, 0.02], [Math.sin(angle) * 0.25, 0.03 + Math.cos(angle) * 0.29, 0], gold, 8));
          }
          for (const side of [-1, 1]) G(s.ball([0.022, 0.014, 0.008], [side * 0.05, -0.02, 0.05], lacquer('#e8607a'), 8));
        } else if (kind === 'volto') {
          eyes(0.03, 0.042, 0.03, 0.014, 0.054, 0.12);
          G(s.ball([0.026, 0.01, 0.01], [0, -0.065, 0.048], second, 8));
          G(s.ring(0.035, 0.006, [0.045, 0.075, 0.045], gold, Math.PI * 1.3));
          G(s.ring(0.022, 0.005, [-0.05, -0.03, 0.05], gold, Math.PI * 1.5)).rotation.z = 2;
          G(s.ball([0.012, 0.018, 0.008], [0.048, -0.01, 0.052], trim, 6));
        } else if (kind === 'cat') {
          eyes(0.025, 0.038, 0.028, 0.02, 0.05, 0.4);
          for (const side of [-1, 1]) { G(s.cylinder(0, 0.04, 0.09, [side * 0.055, 0.115, 0], face, 4)).rotation.z = -side * 0.25; G(s.cylinder(0, 0.02, 0.05, [side * 0.055, 0.108, 0.012], trim, 4)).rotation.z = -side * 0.25; for (const up of [-0.012, 0.012]) G(s.rod([side * 0.02, -0.03, 0.058], [side * 0.13, -0.03 + up * 2.5, 0.05], 0.003, trim)); }
          G(s.ball([0.014, 0.01, 0.01], [0, -0.022, 0.085], second, 6));
        } else if (kind === 'moretta') {
          eyes(0.025, 0.036, 0.024, 0.016, 0.05);
        } else {
          eyes(0.03, 0.042, 0.03, 0.012, 0.054, -0.15);
          G(s.ring(0.03, 0.006, [0, -0.045, 0.05], lacquer('#a8721a'), Math.PI)).rotation.z = Math.PI;
          for (let i = 0; i < 12; i++) { const angle = i * Math.PI / 6; const ray = G(s.cylinder(0, 0.03, i % 2 ? 0.1 : 0.15, [Math.sin(angle) * 0.17, Math.cos(angle) * 0.19, -0.01], i % 2 ? face : gold, 4)); ray.rotation.z = -angle; ray.scale.z = 0.3; }
        }
      }
      if (a.ornament === 'pearls') for (const x of [-0.034, 0, 0.034]) G(s.ball([0.013, 0.013, 0.01], [x, 0.078, 0.056], lacquer('#eee4ca'), 8));
      else if (a.ornament === 'diamond') G(s.box([0.04, 0.04, 0.012], [0, 0.077, 0.059], gold)).rotation.z = Math.PI / 4;
      else if (a.ornament === 'curls') for (const side of [-1, 1]) G(s.ring(0.022, 0.004, [side * 0.03, 0.076, 0.057], gold, Math.PI * 1.6)).rotation.z = side * 0.4;
      // Dressing: feathers on top, ribbons at the temples, all by how fine the display is.
      const dress = a.finery * (main ? 1.3 : 0.7 + random() * 0.5);
      const plumes = kind === 'colombina' ? 2 + Math.round(dress * 5) : kind === 'bauta' || kind === 'sun' || kind === 'jester' || kind === 'doctor' ? 0 : Math.round(dress * 3 - 0.6);
      const side = random() < 0.5 ? -1 : 1;
      for (let i = 0; i < plumes; i++) {
        const angle = side * (0.15 + i * 0.22) + (random() - 0.5) * 0.1, len = 0.16 + random() * 0.12;
        const plume = G(s.ball([0.026, len / 2, 0.006], [side * 0.07 + Math.sin(angle) * len / 2, 0.07 + Math.cos(angle) * len / 2, -0.005 - i * 0.004], lacquer(pick(tone.feathers), { roughness: 0.8 }), 8));
        plume.rotation.z = -angle;
      }
      if (dress > 0.25) for (const rs of [-1, 1]) {
        const strands = dress > 0.7 ? 2 : 1;
        for (let k = 0; k < strands; k++) {
          const hold = new THREE.Group();
          hold.position.set(rs * (kind === 'colombina' ? 0.11 : 0.09), 0.01, 0);
          const ribbon = s.box([0.016, 0.26 + random() * 0.2, 0.003], [0, 0, 0], lacquer(k ? tone.second : tone.accent, { roughness: 0.6, side: THREE.DoubleSide }));
          ribbon.position.y = -(ribbon.geometry as THREE.BoxGeometry).parameters.height / 2;
          hold.add(ribbon);
          const endY = -(ribbon.geometry as THREE.BoxGeometry).parameters.height;
          if (a.tieEnds === 'beads') hold.add(s.ball([0.018, 0.022, 0.012], [0, endY - 0.012, 0], gold, 8));
          else if (a.tieEnds === 'tassels') {
            hold.add(s.ball([0.016, 0.018, 0.012], [0, endY - 0.01, 0], gold, 8));
            for (let strand = 0; strand < 3; strand++) hold.add(s.rod([(strand - 1) * 0.009, endY - 0.02, 0], [(strand - 1) * 0.016, endY - 0.09, 0], 0.005, trim));
          } else if (a.tieEnds === 'forked') for (const side of [-1, 1]) hold.add(s.rod([0, endY, 0], [side * 0.025, endY - 0.1, 0], 0.005, second));
          hold.rotation.z = rs * (0.12 + k * 0.2);
          g.add(hold);
          swaying.push({ node: hold, phase: random() * 6 });
        }
      }
      return g;
    };

    // Stands and their slots.
    type Slot = { at: [number, number, number]; rx?: number; ry?: number; size?: number };
    const slots: Slot[] = [];
    const mount = new THREE.Group();
    s.root.add(mount);
    const M = <T extends THREE.Object3D>(node: T) => { mount.add(node); return node; };
    let signAt: { at: [number, number, number]; holder: THREE.Object3D } = { at: [0, 0, 0], holder: s.root };
    if (a.stand === 'easel' || a.stand === 'panel') {
      const tilt = a.stand === 'easel' ? -0.2 : 0;
      mount.rotation.x = tilt;
      const cloth = s.material(a.stand === 'panel' ? tone.cloth : '#b89468', { roughness: 0.95 });
      M(s.box([1.36, 1.5, 0.04], [0, 1.15, 0], cloth));
      if (a.stand === 'panel') {
        for (const x of [-0.7, 0.7]) M(s.box([0.07, 1.64, 0.08], [x, 1.15, 0.01], gold));
        for (const y of [0.37, 1.93]) M(s.box([1.47, 0.07, 0.08], [0, y, 0.01], gold));
        for (const x of [-0.55, 0.55]) { M(s.box([0.07, 0.36, 0.07], [x, 0.18, 0], darkWood)); M(s.box([0.1, 0.05, 0.6], [x, 0.025, 0], darkWood)); }
        M(s.ball([0.1, 0.07, 0.04], [0, 2.0, 0.02], gold, 12));
      } else {
        for (let i = 0; i < 6; i++) M(s.box([1.36, 0.008, 0.045], [0, 0.52 + i * 0.25, 0.002], darkWood));
        const tilted = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyEuler(mount.rotation).toArray() as [number, number, number];
        for (const x of [-0.62, 0.62]) s.rod([x, 0.035, 0.12], tilted(x, 1.98, -0.04), 0.035, wood);
        s.rod([0, 0.035, -0.95], tilted(0, 1.86, -0.06), 0.035, wood);
        for (const x of [-0.3, 0.3]) s.rod(tilted(x, 0.6, -0.04), [0, 0.6, -0.77], 0.012, darkWood);
        for (const [x, z] of [[-0.62, 0.12], [0.62, 0.12], [0, -0.95]]) s.box([0.11, 0.05, 0.11], [x, 0.025, z], darkWood);
      }
      slots.push({ at: [0, 1.56, 0.07], size: 1.55 });
      for (const [x, y] of [[-0.44, 1.62], [0.44, 1.62], [-0.44, 1.14], [0.44, 1.14], [0, 1.04], [-0.44, 0.68], [0.44, 0.68], [0, 0.62], [-0.22, 1.32], [0.22, 0.86]]) slots.push({ at: [x + (random() - 0.5) * 0.04, y + (random() - 0.5) * 0.04, 0.07] });
      signAt = { at: [0, a.stand === 'panel' ? 0.3 : 2.0, 0.06], holder: mount };
    } else if (a.stand === 'tree') {
      M(s.lathe([[0.05, 0], [0.06, 0.25], [0.035, 0.4], [0.045, 0.9], [0.03, 1.2], [0.04, 1.5], [0.028, 1.7]], wood));
      for (const angle of [0, Math.PI / 2]) M(s.box([0.9, 0.06, 0.09], [0, 0.03, 0], darkWood)).rotation.y = angle;
      M(s.ball([0.07, 0.09, 0.07], [0, 1.74, 0], wood, 12));
      slots.push({ at: [0, 1.76, 0.04], size: 1.6 });
      const arms: [number, number, number][] = [[1.38, -55, 0.5], [1.38, 55, 0.5], [1.02, -20, 0.52], [1.02, 95, 0.5], [1.02, -100, 0.5], [0.68, 30, 0.55], [0.68, -65, 0.52], [1.38, 150, 0.45], [0.68, 130, 0.5], [1.2, 5, 0.42]];
      for (const [y, degrees, reach] of arms) {
        const angle = degrees * Math.PI / 180, x = Math.sin(angle) * reach, z = Math.cos(angle) * reach;
        M(s.rod([0, y + 0.12, 0], [x * 0.92, y + 0.14, z * 0.92], 0.014, wood));
        M(s.ball([0.022, 0.022, 0.022], [x * 0.92, y + 0.14, z * 0.92], darkWood, 8));
        slots.push({ at: [x, y, z], ry: angle });
      }
      signAt = { at: [0.02, 0.42, 0.07], holder: mount };
    } else {
      const levels: [number, number][] = [[0.42, 0.42], [0.82, 0.12], [1.22, -0.18]];
      for (const [y, z] of levels) {
        M(s.box([1.5, 0.04, 0.32], [0, y, z], wood));
        M(s.box([1.5, 0.3, 0.02], [0, y + 0.16, z - 0.15], darkWood));
        for (const x of [-0.72, 0.72]) M(s.box([0.05, y, 0.3], [x, y / 2, z], darkWood));
      }
      M(s.box([1.5, 0.05, 0.06], [0, 0.03, 0.55], darkWood));
      slots.push({ at: [0, 1.48, -0.16], rx: -0.22, size: 1.5 });
      for (const [level, x] of [[1, -0.42], [1, 0.42], [2, -0.5], [2, 0.5], [0, 0], [0, -0.5], [0, 0.5], [1, 0], [0, -0.25], [0, 0.25]] as const) slots.push({ at: [x + (random() - 0.5) * 0.05, levels[level][0] + 0.17, levels[level][1] - 0.06], rx: -0.3 });
      signAt = { at: [0, 0.2, 0.585], holder: mount };
    }

    const others = (Object.keys(MASKS) as MaskKind[]).filter((kind) => kind !== a.dominant);
    const wanted = Math.min(slots.length, Math.round(mix(4, slots.length, a.stock * 0.75 + mood.density * 0.25)));
    const odd = a.absent === 'nothing' ? -1 : 1 + Math.floor(random() * Math.max(1, Math.min(wanted, 5) - 1));
    for (let i = 0; i < wanted; i++) {
      const slot = slots[i], kind = i === 0 ? a.dominant : others[(i - 1 + Math.floor(random() * 2)) % others.length];
      const [x, y, z] = slot.at, scale = 1.35 * (slot.size ?? 1) * (0.92 + random() * 0.16);
      const peg = new THREE.Group();
      peg.position.set(x, y, z);
      peg.rotation.set(slot.rx ?? 0, slot.ry ?? 0, 0);
      mount.add(peg);
      if (i === odd && (a.absent === 'empty-peg' || a.absent === 'face-down')) {
        peg.add(s.cylinder(0.012, 0.012, 0.06, [0, 0.12, 0.0], darkWood, 6));
        (peg.children[0] as THREE.Mesh).rotation.x = Math.PI / 2;
        if (a.absent === 'empty-peg') {
          const hold = new THREE.Group(); hold.position.set(0, 0.12, 0.03);
          hold.add(s.box([0.018, 0.34, 0.003], [-0.02, -0.17, 0], lacquer(tone.accent, { side: THREE.DoubleSide })), s.box([0.018, 0.26, 0.003], [0.02, -0.13, 0], lacquer(tone.accent, { side: THREE.DoubleSide })));
          hold.children.forEach((child, n) => { child.rotation.z = n ? 0.12 : -0.1; });
          peg.add(hold); swaying.push({ node: hold, phase: random() * 6 });
          const mark = s.ball([0.12, 0.15, 0.004], [0, 0, -0.01], s.material('#2a2018', { transparent: true, opacity: 0.25, depthWrite: false }), 12); mark.castShadow = false; peg.add(mark);
        } else {
          const fallen = makeMask(kind, false);
          fallen.scale.setScalar(scale);
          fallen.rotation.set(Math.PI / 2, 0, random() * 6);
          fallen.rotation.order = 'ZXY';
          fallen.position.set((random() - 0.5) * 0.7, 0.085 * scale, a.stand === 'tiers' ? 0.9 : 0.75);
          s.root.add(fallen);
          for (const child of [...fallen.children]) if ((child as THREE.Group).isGroup) { fallen.remove(child); const at = swaying.findIndex((entry) => entry.node === child); if (at >= 0) swaying.splice(at, 1); }
          fallen.updateMatrixWorld(true);
          fallen.position.y -= new THREE.Box3().setFromObject(fallen, true).min.y;
          s.box([0.02, 0.004, 0.5], [fallen.position.x + 0.2, 0.004, fallen.position.z + 0.12], lacquer(tone.accent)).rotation.y = random() * 3;
        }
        continue;
      }
      const mask = makeMask(kind, i === 0);
      mask.scale.setScalar(scale);
      mask.rotation.z = (random() - 0.5) * 0.16 * (1 + mood.wear);
      if (i === odd && a.absent === 'turned') {
        mask.rotation.y = Math.PI;
        const hollow = s.ball([0.085, 0.115, 0.02], [0, 0, -0.035], s.material('#b9a47c', { roughness: 1 }), 12);
        mask.add(hollow);
      }
      peg.add(mask);
    }

    if (a.sign !== 'none') {
      const text = { handmade: 'FATTO A MANO', price: '25 EURO', nophoto: 'NO FOTO', carnival: 'CARNEVALE' }[a.sign];
      const big = a.sign === 'carnival';
      const card = s.label(text, big ? 1.0 : 0.5, big ? 0.2 : 0.16, signAt.at, big ? '#f6e7b0' : '#2a2018', big ? tone.cloth : '#f4eddc');
      card.rotation.z = big ? 0 : (random() - 0.5) * 0.16;
      if (a.stand === 'tree') { card.position.set(0.05, 0.5, 0.075); card.scale.setScalar(0.8); }
      signAt.holder.add(card);
    }
    // Shed feathers and confetti at the foot when the mood is crowded or festive.
    for (let i = 0; i < Math.round(mood.density * 8 + mood.cheer * 10); i++) s.box([0.03, 0.003, 0.03], [(random() - 0.5) * 1.5, 0.002, 0.3 + random() * 0.6], lacquer(pick([...tone.feathers, tone.accent, tone.second]))).rotation.y = random() * 3;

    if (a.header !== 'open') {
      const top = Math.max(2.2, visibleBounds(s.root).max.y + 0.14), rear = -0.73;
      for (const x of [-0.88, 0.88]) {
        s.box([0.2, 0.07, 0.32], [x, 0.035, rear], darkWood);
        s.rod([x, 0.07, rear], [x, top, rear], 0.035, wood);
      }
      s.rod([-0.88, top, rear], [0.88, top, rear], 0.035, wood);
      if (a.header === 'banner') s.box([1.75, 0.27, 0.015], [0, top - 0.14, rear + 0.02], s.material(tone.cloth));
      else {
        s.box([1.9, 0.035, 0.46], [0, top + 0.01, rear + 0.15], s.material(tone.cloth));
        for (const x of [-0.88, 0.88]) s.rod([x, top - 0.28, rear], [x, top, rear + 0.36], 0.025, wood);
        if (a.header === 'valance') for (let i = 0; i < 9; i++) {
          const x = (i - 4) * 0.2;
          s.box([0.2, 0.11, 0.015], [x, top - 0.05, rear + 0.38], s.material(tone.cloth));
          s.ball([0.1, 0.07, 0.009], [x, top - 0.1, rear + 0.38], s.material(tone.cloth), 10);
        }
      }
    }
    if (a.packing !== 'clear') {
      const x = visibleBounds(s.root).min.x - 0.34, z = 0.4, paper = s.material('#e1d5ba');
      s.box([0.52, 0.055, 0.58], [x, 0.0275, z], wood);
      for (const dx of [-0.24, 0.24]) s.box([0.04, 0.27, 0.58], [x + dx, 0.19, z], wood);
      for (const dz of [-0.27, 0.27]) s.box([0.52, 0.27, 0.04], [x, 0.19, z + dz], wood);
      if (a.packing === 'wrapped') for (const dz of [-0.13, 0.13]) {
        s.box([0.38, 0.24, 0.23], [x, 0.175, z + dz], paper);
        s.box([0.025, 0.245, 0.235], [x, 0.175, z + dz], darkWood);
      } else if (a.packing === 'tissue') {
        s.box([0.035, 0.27, 0.54], [x, 0.19, z], wood);
        for (let i = 0; i < 6; i++) s.box([0.18, 0.016, 0.4], [x - 0.12, 0.063 + i * 0.016, z], paper);
        for (let i = 0; i < 3; i++) s.cylinder(0.06, 0.06, 0.14, [x + 0.12, 0.125, z + (i - 1) * 0.16], lacquer(tone.accent), 12);
      }
    }
    // Lift the complete grounded display onto a sized apron, keeping loose pieces supported.
    const bounds = visibleBounds(s.root), size = bounds.getSize(new THREE.Vector3()), centre = bounds.getCenter(new THREE.Vector3());
    const platform = a.footing === 'rug' ? 0.014 : a.footing === 'stone' ? 0.09 : 0.06, width = size.x + 0.24, depth = size.z + 0.24;
    const display = new THREE.Group(); for (const child of [...s.root.children]) display.add(child); s.root.add(display); display.position.y = platform - bounds.min.y;
    if (a.footing === 'checker') for (let row = 0; row < 6; row++) for (let col = 0; col < 8; col++) s.box([width / 8 - 0.007, platform, depth / 6 - 0.007], [centre.x - width / 2 + (col + 0.5) * width / 8, platform / 2, centre.z - depth / 2 + (row + 0.5) * depth / 6], s.material((row + col) % 2 ? '#57564f' : '#d5cbb3'));
    else {
      s.box([width, platform, depth], [centre.x, platform / 2, centre.z], a.footing === 'stone' ? s.material('#c4bdab') : a.footing === 'rug' ? s.material(tone.cloth) : wood);
      if (a.footing === 'boards') for (let i = 1; i < 9; i++) s.box([0.008, 0.002, depth], [centre.x - width / 2 + width * i / 9, platform + 0.001, centre.z], darkWood);
      if (a.footing === 'rug') for (const side of [-1, 1]) {
        s.box([width - 0.08, 0.002, 0.025], [centre.x, platform + 0.001, centre.z + side * (depth / 2 - 0.04)], gold);
        s.box([0.025, 0.002, depth - 0.08], [centre.x + side * (width / 2 - 0.04), platform + 0.001, centre.z], gold);
      }
    }
    s.root.scale.setScalar(mix(0.82, 1.22, a.displaySize));

    const energy = mix(0.2, 1.6, mood.energy);
    const rest = swaying.map(({ node }) => node.rotation.z);
    const update = (_dt: number, time: number) => swaying.forEach(({ node, phase }, i) => {
      node.rotation.z = rest[i] + Math.sin(time * 1.6 * energy + phase) * 0.12 * energy;
      node.rotation.x = Math.sin(time * 1.1 * energy + phase * 2) * 0.1 * energy;
    });
    return s.finish({ update });
  },
});
