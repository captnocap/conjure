import * as THREE from 'three';
import { Sculpture, choice, defineThing, noul } from '@conjure/kit';

type V3 = [number, number, number];
const ANIMALS = {
  pig: 'A pink pig: a long low box body, a flat square snout, a curly tail.',
  cow: 'A cow: a big patched body, a pink muzzle, stubby horns and an udder.',
  sheep: 'A sheep: a puffy wool box with a dark face and legs.',
  chicken: 'A chicken: a small white box on two thin yellow legs with a red comb and an orange beak.',
  horse: 'A horse: a tall body, a long neck and head, a dark mane and tail.',
} as const;
type Animal = keyof typeof ANIMALS;
type Coat = 'natural' | 'pale' | 'dark' | 'spotted' | 'dyed';
const COATS: Record<Animal, Record<Coat, [string, string | null]>> = {
  pig: { natural: ['#f2a9b6', null], pale: ['#f7d9d6', null], dark: ['#4b3a3c', null], spotted: ['#f2a9b6', '#4b3a3c'], dyed: ['#c9a3e6', null] },
  cow: { natural: ['#8a5a3a', null], pale: ['#e9dcc3', null], dark: ['#2d2a2a', null], spotted: ['#f1efe8', '#2d2a2a'], dyed: ['#7fb9e6', null] },
  sheep: { natural: ['#f0ece2', null], pale: ['#f8f4e6', null], dark: ['#3a3634', null], spotted: ['#f0ece2', '#9a948c'], dyed: ['#f29ac2', null] },
  chicken: { natural: ['#f4f2ec', null], pale: ['#e8d9bd', null], dark: ['#2f2c2c', null], spotted: ['#d9b27a', '#6b4a2e'], dyed: ['#7fd9d0', null] },
  horse: { natural: ['#9a5a30', null], pale: ['#e2c48a', null], dark: ['#2b2422', null], spotted: ['#f1ece2', '#8a5a3a'], dyed: ['#9b7bd8', null] },
};

/** A 32 × 32 painted coat: base colour, pixel noise and optional patches, nearest-filtered. */
function coat(random: () => number, base: string, spots: string | null, woolly: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const b = new THREE.Color(base);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const c = b.clone().offsetHSL(0, 0, (random() - 0.5) * (woolly ? 0.12 : 0.05));
      ctx.fillStyle = '#' + c.getHexString();
      ctx.fillRect(x, y, 1, 1);
    }
  if (spots) {
    ctx.fillStyle = spots;
    for (let i = 0; i < 6 + Math.round(random() * 5); i++) {
      const x = Math.floor(random() * 28), y = Math.floor(random() * 28), w = 3 + Math.floor(random() * 8), h = 3 + Math.floor(random() * 7);
      ctx.fillRect(x, y, w, h);
      if (random() < 0.6) ctx.fillRect(x + Math.floor(random() * w), y - 2, 3, 3);
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = map.minFilter = THREE.NearestFilter;
  map.generateMipmaps = false;
  return map;
}

export default defineThing({
  questions: {
    animal: choice('What animal is it?', ANIMALS),
    coat: choice('What is its coat like?', {
      natural: 'The usual colour for its kind.',
      pale: 'Pale, cream and washed out.',
      dark: 'Dark, nearly black.',
      spotted: 'Patched and spotted in a second colour.',
      dyed: 'Dyed an unnatural candy colour, a joke someone played.',
    }),
    pose: choice('What is it doing?', {
      grazing: 'Head down, nosing the grass.',
      looking: 'Head up, looking straight at you.',
      walking: 'Mid-step, legs swinging, wandering off.',
      sleeping: 'Lying down with its legs folded under, eyes shut.',
    }),
    tack: choice('What is on it?', {
      nothing: 'Nothing, a wild free animal.',
      saddle: 'A leather saddle with stirrups, ready to ride.',
      leash: 'A rope lead tied to a fence post beside it.',
      bell: 'A collar with a small brass bell.',
      flowers: 'A crown of flowers somebody put on its head.',
    }),
    baby: noul('Does a baby one stand beside it?'),
    beside: choice('What is next to it?', {
      nothing: 'Nothing but ground.',
      trough: 'A wooden feed trough full of grain.',
      hay: 'A strapped yellow hay bale.',
      mud: 'A square mud puddle it has been wallowing in.',
      carrots: 'A row of carrots growing in a strip of tilled dirt.',
      eggs: 'A few eggs laid on the ground.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [base, spots] = COATS[a.animal][a.coat];
    const map = coat(random, base, spots, a.animal === 'sheep');
    const hide = s.material('#ffffff', { map, roughness: 0.9 });
    const dark = s.material(a.animal === 'sheep' && a.coat === 'dark' ? '#d8d2c8' : '#2a2320', { roughness: 0.8 });
    const eye = s.material('#17120f', { roughness: 0.3 });
    const heads: THREE.Group[] = [];
    const tails: THREE.Object3D[] = [];
    const legGroups: THREE.Group[][] = [];
    const pose = a.pose;

    /** Builds one animal of a given scale, standing at (x, 0, z) and turned by `turn`. */
    const creature = (k: number, at: [number, number], turn: number, sleeping: boolean) => {
      const g = new THREE.Group();
      const add = (size: V3, pos: V3, m: THREE.Material, parent: THREE.Object3D = g) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0] * k, size[1] * k, size[2] * k), m);
        mesh.position.set(pos[0] * k, pos[1] * k, pos[2] * k);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
      };
      const spec = {
        pig: { body: [0.5, 0.5, 0.95] as V3, legH: 0.26, legW: 0.16, head: [0.42, 0.42, 0.4] as V3, lift: -0.02, snout: [0.24, 0.16, 0.06] as V3, snoutColour: '#e07f98' },
        cow: { body: [0.64, 0.72, 1.3] as V3, legH: 0.5, legW: 0.2, head: [0.46, 0.5, 0.5] as V3, lift: 0.08, snout: [0.3, 0.2, 0.06] as V3, snoutColour: '#e6a6b2' },
        sheep: { body: [0.68, 0.62, 1.0] as V3, legH: 0.36, legW: 0.15, head: [0.36, 0.38, 0.4] as V3, lift: 0.02, snout: [0.2, 0.14, 0.04] as V3, snoutColour: '#9a8f88' },
        chicken: { body: [0.3, 0.3, 0.44] as V3, legH: 0.18, legW: 0.05, head: [0.2, 0.28, 0.2] as V3, lift: 0.16, snout: null, snoutColour: '' },
        horse: { body: [0.56, 0.68, 1.4] as V3, legH: 0.74, legW: 0.18, head: [0.3, 0.3, 0.58] as V3, lift: 0.5, snout: null, snoutColour: '' },
      }[a.animal];
      const [bw, bh, bl] = spec.body;
      const legH = sleeping ? spec.legH * 0.3 : spec.legH;
      const bodyY = legH + bh / 2;
      const bodyMat = hide;
      add([bw, bh, bl], [0, bodyY, 0], bodyMat);
      // Legs.
      const legs: THREE.Group[] = [];
      const legSpots: [number, number][] = a.animal === 'chicken' ? [[-0.07, 0.02], [0.07, 0.02]] : [[-bw / 2 + spec.legW / 2 + 0.02, bl / 2 - spec.legW / 2 - 0.05], [bw / 2 - spec.legW / 2 - 0.02, bl / 2 - spec.legW / 2 - 0.05], [-bw / 2 + spec.legW / 2 + 0.02, -bl / 2 + spec.legW / 2 + 0.05], [bw / 2 - spec.legW / 2 - 0.02, -bl / 2 + spec.legW / 2 + 0.05]];
      const legMat = a.animal === 'chicken' ? s.material('#e8a53a') : a.animal === 'sheep' ? dark : bodyMat;
      if (!sleeping)
        for (const [lx, lz] of legSpots) {
          const leg = new THREE.Group();
          leg.position.set(lx * k, (legH + 0.02) * k, lz * k);
          add([spec.legW, legH + 0.02, spec.legW], [0, -(legH + 0.02) / 2, 0], legMat, leg);
          if (a.animal === 'chicken') add([0.1, 0.02, 0.1], [0, -legH - 0.01, 0.03], legMat, leg);
          g.add(leg);
          legs.push(leg);
        }
      legGroups.push(legs);
      // Head on a pivot at the front of the body, so it can graze or look up.
      const head = new THREE.Group();
      const [hw, hh, hl] = spec.head;
      head.position.set(0, (bodyY + bh / 2 - 0.1) * k, (bl / 2) * k);
      g.add(head);
      heads.push(head);
      const face = s.material(a.animal === 'sheep' ? (a.coat === 'dark' ? '#d8d2c8' : '#3a3330') : '#ffffff', a.animal === 'sheep' ? {} : { map, roughness: 0.9 });
      if (a.animal === 'horse') {
        // Neck rising forward, head at its top pointing ahead.
        const neck = add([0.3, 0.62, 0.34], [0, 0.18, 0.1], face, head);
        neck.rotation.x = -0.5;
        add([0.1, 0.62, 0.1], [0, 0.3, -0.08], dark, head).rotation.x = -0.5;
        const headBox = add([hw, hh, hl], [0, spec.lift, 0.36], face, head);
        void headBox;
        add([0.3, 0.1, 0.1], [0, spec.lift - 0.12, 0.66], s.material('#3d2a22'), head);
        for (const side of [-1, 1]) {
          add([0.06, 0.12, 0.06], [side * 0.1, spec.lift + 0.2, 0.2], face, head);
          add([0.04, 0.04, 0.04], [side * 0.16, spec.lift + 0.06, 0.5], eye, head);
        }
      } else if (a.animal === 'chicken') {
        add([0.12, 0.2, 0.12], [0, 0.1, 0.1], face, head);
        add([hw, hh, hl], [0, spec.lift + 0.1, 0.12], face, head);
        add([0.08, 0.06, 0.1], [0, spec.lift + 0.06, 0.26], s.material('#f0892a'), head);
        add([0.05, 0.12, 0.16], [0, spec.lift + 0.28, 0.1], s.material('#d8302a'), head);
        add([0.06, 0.1, 0.05], [0, spec.lift - 0.03, 0.2], s.material('#d8302a'), head);
        for (const side of [-1, 1]) add([0.03, 0.03, 0.03], [side * 0.1, spec.lift + 0.14, 0.17], eye, head);
      } else {
        add([hw, hh, hl], [0, spec.lift, hl / 2 - 0.08], face, head);
        if (spec.snout) add(spec.snout, [0, spec.lift - hh * 0.2, hl - 0.08 + spec.snout[2] / 2 - 0.005], s.material(spec.snoutColour), head);
        for (const side of [-1, 1]) {
          add([0.05, 0.05, 0.02], [side * hw * 0.28, spec.lift + hh * 0.18, hl - 0.08 + 0.008], eye, head);
          if (spec.snout) add([0.03, 0.03, 0.02], [side * spec.snout[0] * 0.25, spec.lift - hh * 0.2, hl - 0.08 + spec.snout[2] + 0.005], dark, head);
        }
        if (a.animal === 'pig') for (const side of [-1, 1]) add([0.1, 0.14, 0.05], [side * hw * 0.35, spec.lift + hh / 2 + 0.03, hl / 2 - 0.1], face, head);
        if (a.animal === 'cow') {
          for (const side of [-1, 1]) {
            add([0.14, 0.08, 0.06], [side * (hw / 2 + 0.06), spec.lift + hh * 0.3, hl / 2 - 0.08], face, head);
            add([0.07, 0.07, 0.16], [side * (hw / 2 - 0.04), spec.lift + hh / 2 + 0.04, hl / 2 - 0.08], s.material('#e9e2cf'), head);
          }
        }
        if (a.animal === 'sheep') add([hw + 0.06, 0.14, hl - 0.04], [0, spec.lift + hh / 2 + 0.04, hl / 2 - 0.1], bodyMat, head);
      }
      // Tails, udders and wings.
      if (a.animal === 'pig') {
        const tail = new THREE.Group();
        tail.position.set(0, (bodyY + bh * 0.3) * k, (-bl / 2) * k);
        add([0.05, 0.05, 0.12], [0, 0, -0.06], face, tail);
        add([0.05, 0.12, 0.05], [0, 0.06, -0.12], face, tail);
        g.add(tail);
        tails.push(tail);
      }
      if (a.animal === 'cow' || a.animal === 'horse') {
        const tail = new THREE.Group();
        tail.position.set(0, (bodyY + bh * 0.35) * k, (-bl / 2) * k);
        add([0.1, a.animal === 'horse' ? 0.6 : 0.45, 0.1], [0, a.animal === 'horse' ? -0.3 : -0.22, -0.05], a.animal === 'horse' ? dark : face, tail);
        if (a.animal === 'cow') add([0.14, 0.14, 0.14], [0, -0.5, -0.05], dark, tail);
        g.add(tail);
        tails.push(tail);
        if (a.animal === 'cow') add([0.3, 0.18, 0.3], [0, bodyY - bh / 2 - 0.05, -bl * 0.2], s.material('#e6a6b2'));
      }
      if (a.animal === 'sheep') add([0.1, 0.16, 0.08], [0, bodyY + bh * 0.2, -bl / 2 - 0.03], bodyMat);
      if (a.animal === 'chicken') {
        for (const side of [-1, 1]) add([0.03, 0.2, 0.3], [side * (bw / 2 + 0.01), bodyY + 0.02, -0.02], face);
        add([0.12, 0.16, 0.08], [0, bodyY + bh / 2 + 0.02, -bl / 2 + 0.02], face).rotation.x = 0.4;
      }
      // Tack on the full-size animal only.
      if (k === 1 && a.tack === 'saddle') {
        const leather = s.material('#7a4a26', { roughness: 0.5 });
        add([bw + 0.1, 0.06, bl * 0.42], [0, bodyY + bh / 2 + 0.02, -bl * 0.05], s.material('#c23b3b'));
        add([bw * 0.7, 0.12, bl * 0.3], [0, bodyY + bh / 2 + 0.1, -bl * 0.05], leather);
        add([bw * 0.5, 0.14, 0.08], [0, bodyY + bh / 2 + 0.2, -bl * 0.05 - bl * 0.13], leather);
        for (const side of [-1, 1]) {
          add([0.03, bh * 0.5, 0.05], [side * (bw / 2 + 0.03), bodyY + 0.05, -bl * 0.05], leather);
          add([0.08, 0.06, 0.1], [side * (bw / 2 + 0.03), bodyY - bh * 0.2, -bl * 0.05], s.material('#9ea3a8', { metalness: 0.6, roughness: 0.4 }));
        }
      }
      if (k === 1 && (a.tack === 'leash' || a.tack === 'bell')) {
        const neckY = a.animal === 'horse' ? bodyY + bh / 2 + 0.2 : bodyY + bh * 0.1;
        const neckZ = a.animal === 'horse' ? bl / 2 + 0.1 : bl / 2 + 0.02;
        add([Math.min(hw, bw) + 0.1, 0.07, 0.07], [0, neckY, neckZ], s.material(a.tack === 'bell' ? '#c23b3b' : '#5a3a22'));
        if (a.tack === 'bell') add([0.1, 0.1, 0.1], [0, neckY - 0.08, neckZ + 0.03], s.material('#e3b53a', { metalness: 0.7, roughness: 0.35 }));
      }
      if (k === 1 && a.tack === 'flowers') {
        const topY = a.animal === 'horse' ? spec.lift + hh / 2 + 0.03 : a.animal === 'chicken' ? spec.lift + 0.1 + hh / 2 : spec.lift + hh / 2 + (a.animal === 'sheep' ? 0.1 : 0.03);
        const z = a.animal === 'horse' ? 0.36 : a.animal === 'chicken' ? 0.12 : hl / 2 - 0.08;
        add([hw * 0.9, 0.05, hl * 0.6], [0, topY, z], s.material('#3f8d2a'), head);
        for (let i = 0; i < 5; i++) add([0.07, 0.07, 0.07], [(random() - 0.5) * hw * 0.8, topY + 0.05, z + (random() - 0.5) * hl * 0.5], s.material(['#e23b3b', '#f4d53a', '#f08ac0', '#ffffff'][i % 4]), head);
      }
      g.position.set(at[0], 0, at[1]);
      g.rotation.y = turn;
      s.root.add(g);
      return { head, legs };
    };

    const sleeping = pose === 'sleeping';
    const big = creature(1, [0, 0], 0, sleeping);
    const bodyW = { pig: 0.5, cow: 0.64, sheep: 0.68, chicken: 0.3, horse: 0.56 }[a.animal];
    if (a.baby) creature(0.5, [(random() < 0.5 ? -1 : 1) * (bodyW + 0.3), (random() - 0.5) * 0.6], (random() - 0.5) * 0.8, false);
    // Head pitch for the pose: grazing noses the ground, looking lifts the head to meet you.
    const graze = { pig: 0.9, cow: 0.85, sheep: 0.9, chicken: 0.7, horse: 1.0 }[a.animal];
    for (const head of heads) head.rotation.x = pose === 'grazing' ? graze : pose === 'looking' ? -0.25 : pose === 'sleeping' ? 0.5 : 0.15;
    if (pose === 'walking') for (const legs of legGroups) legs.forEach((leg, i) => (leg.rotation.x = (i % 2 ? 1 : -1) * (i < 2 ? 0.35 : -0.35)));
    if (a.tack === 'leash') {
      const post = s.box([0.14, 1.0, 0.14], [bodyW + 0.9, 0.5, 0.5], s.material('#6b4a2e'));
      void post;
      s.box([0.6, 0.08, 0.08], [bodyW + 0.6, 0.8, 0.5], s.material('#6b4a2e'));
      const neckY = a.animal === 'horse' ? 1.5 : a.animal === 'chicken' ? 0.4 : 0.7;
      s.tube([[0, neckY, 0.6], [bodyW * 0.5 + 0.2, neckY * 0.6, 0.6], [bodyW + 0.9, 0.9, 0.5]], 0.018, s.material('#c9b88a'));
    }
    // Beside it.
    const side = a.tack === 'leash' ? -1 : a.baby ? 1 : (random() < 0.5 ? -1 : 1);
    const bx = side * (bodyW + 0.75);
    if (a.beside === 'trough') {
      const wood = s.material('#8a5a32');
      s.box([0.5, 0.3, 1.0], [bx, 0.15, 0], wood);
      s.box([0.4, 0.06, 0.9], [bx, 0.3, 0], s.material('#d9b24a'));
      for (let i = 0; i < 12; i++) s.box([0.08, 0.05, 0.08], [bx + (random() - 0.5) * 0.32, 0.34, (random() - 0.5) * 0.82], s.material('#e8c75a'));
    }
    if (a.beside === 'hay') {
      s.box([0.6, 0.5, 0.9], [bx, 0.25, 0], s.material('#d9b85a', { map: coat(random, '#d9b85a', null, true) }));
      for (const z of [-0.25, 0.25]) s.box([0.62, 0.52, 0.06], [bx, 0.25, z], s.material('#7a5a2a'));
    }
    if (a.beside === 'mud') {
      const bl = { pig: 0.95, cow: 1.3, sheep: 1.0, chicken: 0.44, horse: 1.4 }[a.animal];
      s.box([bodyW + 0.5, 0.05, bl + 0.4], [0, 0.02, 0.05], s.material('#5e4530', { roughness: 1 }));
      for (let i = 0; i < 4; i++) s.box([0.12, 0.03, 0.12], [(random() - 0.5) * (bodyW + 0.4), 0.05, (random() - 0.5) * (bl + 0.3)], s.material('#7a5a3a'));
    }
    if (a.beside === 'carrots') {
      s.box([0.5, 0.08, 1.2], [bx, 0.04, 0], s.material('#5a3d26'));
      for (let i = 0; i < 4; i++) {
        s.box([0.1, 0.1, 0.1], [bx, 0.1, -0.45 + i * 0.3], s.material('#f08a2a'));
        s.box([0.04, 0.2, 0.04], [bx, 0.22, -0.45 + i * 0.3], s.material('#3f8d2a'));
      }
    }
    if (a.beside === 'eggs') for (let i = 0; i < 3 + Math.round(random() * 3); i++) s.box([0.1, 0.12, 0.1], [bx * 0.6 + (random() - 0.5) * 0.6, 0.06, (random() - 0.5) * 1.0], s.material('#f3ead4'));

    const energy = mood.energy;
    const phase = random() * 6;
    const headRest = heads.map((h) => h.rotation.x);
    return s.finish({
      update: (_dt, time) => {
        heads.forEach((head, i) => { head.rotation.x = headRest[i] + Math.sin(time * (1.5 + energy * 2) + phase + i) * (pose === 'grazing' ? 0.08 : 0.03) * (0.3 + energy); });
        for (const tail of tails) tail.rotation.y = Math.sin(time * (3 + energy * 4) + phase) * 0.35 * (0.2 + energy);
        if (pose === 'walking') legGroups.forEach((legs) => legs.forEach((leg, i) => { leg.rotation.x = Math.sin(time * (2 + energy * 3) + (i % 2 ? Math.PI : 0) + (i < 2 ? 0 : Math.PI)) * 0.35; }));
        void big;
      },
    });
  },
});
