import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { Bag, type V3, aim, at, ball, lumpy, painted, taper, water } from './bits';

const SPECIES = {
  english: { depth: 0.72, text: 'English oak: a neat shallow cup of fine tight scales on a long thin stalk.' },
  red: { depth: 0.42, text: 'Red oak: a flat saucer like a beret, with broad smooth overlapping scales.' },
  bur: { depth: 1.05, text: 'Bur oak: a deep bowl with a shaggy mossy fringe around the rim.' },
  turkey: { depth: 0.85, text: 'Turkey oak: a cup bristling all over with long curling whiskers, like a sea urchin.' },
} as const;
type Species = keyof typeof SPECIES;
const LYING = {
  upturned: 'On its back, open to the sky like a bowl.',
  side: 'Tipped on its side, the hollow facing out like a cave mouth.',
  dome: 'Face down, a little domed roof with one edge propped up, something could shelter under it.',
  twin: 'Two cups still joined on one twig, both empty.',
} as const;
const HOLDS = {
  nothing: 'Nothing. It is simply empty.',
  rain: 'A bead of rainwater, brim-full and shining.',
  seedling: 'A pinch of soil and one seedling with two green leaves.',
  moss: 'A plug of bright green moss.',
  hoard: 'A tiny hoard of seeds and berries someone stashed.',
} as const;
const BESIDE = {
  none: 'Nothing: the acorn is gone without a trace.',
  gnawed: 'The nut, gnawed open, a ragged hole showing the pale kernel and shell crumbs around it.',
  whole: 'The whole glossy acorn, fallen out and lying intact.',
  halves: 'Two empty halves of the split shell, like little boats.',
  weevil: 'The nut with one neat round exit hole bored in it and a sprinkle of dust.',
} as const;

export default defineThing({
  questions: {
    species: choice('What kind of acorn cup is it?', Object.fromEntries(Object.entries(SPECIES).map(([key, value]) => [key, value.text])) as Record<Species, string>),
    lying: choice('How is it lying?', LYING),
    holds: choice('What does it hold, or what has gathered at it?', HOLDS),
    beside: choice('What is left of the acorn that sat in it?', BESIDE),
    leaf: noul('Is it resting on a fallen oak leaf?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 9.5;
    const rough = s.material('#ffffff', { roughness: 0.92, side: THREE.DoubleSide });
    const smooth = s.material('#ffffff', { roughness: 0.6, side: THREE.DoubleSide });
    const matte = s.material('#ffffff', { roughness: 0.9 });
    const shell = new THREE.Color('#8a6a48').lerp(new THREE.Color('#8f8a80'), mood.wear * 0.7);
    const inner = new THREE.Color('#d2b58a').lerp(new THREE.Color('#b9b3a4'), mood.wear * 0.6);
    const wet = water();
    const green = new THREE.Color().setHSL(mix(0.31, 0.24, mood.warmth), mix(0.45, 0.75, mood.cheer), 0.42);

    const makeCap = (species: Species, radius: number) => {
      const group = new THREE.Group(), bag = new Bag();
      const depth = SPECIES[species].depth, thick = radius * 0.13, steps = 9;
      const outer: THREE.Vector2[] = [], lining: THREE.Vector2[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI / 2;
        outer.push(new THREE.Vector2(Math.max(0.01, radius * Math.sin(t)), radius * depth * (1 - Math.cos(t))));
        lining.push(new THREE.Vector2(Math.max(0.01, (radius - thick) * Math.sin(t)), thick + (radius * depth - thick) * (1 - Math.cos(t))));
      }
      outer.push(new THREE.Vector2(radius - thick, radius * depth));
      bag.add(rough, new THREE.LatheGeometry(outer, 24), undefined, shell);
      bag.add(smooth, new THREE.LatheGeometry(lining, 24), undefined, inner);
      bag.add(smooth, new THREE.CircleGeometry(radius * 0.3, 12), at([0, thick + 0.06, 0], [-Math.PI / 2, 0, 0]), inner.clone().multiplyScalar(0.78));
      // Scales in rows, each pointing toward the rim.
      const at3 = (t: number, phi: number, out = 0): V3 => [(radius + out) * Math.sin(t) * Math.cos(phi), radius * depth * (1 - Math.cos(t)) - out * Math.cos(t) * 0.6, (radius + out) * Math.sin(t) * Math.sin(phi)];
      const rows = species === 'english' ? 8 : species === 'red' ? 5 : 6;
      for (let row = 0; row < rows; row++) {
        const t = mix(0.28, 1.5, row / (rows - 1)), width = (radius * (Math.PI / 2 - 0.25)) / rows;
        const n = Math.max(5, Math.round((Math.PI * 2 * radius * Math.sin(t)) / (width * (species === 'red' ? 1.5 : 1.15))));
        for (let i = 0; i < n; i++) {
          const phi = ((i + (row % 2) * 0.5) / n) * Math.PI * 2 + (random() - 0.5) * 0.08;
          const tone = shell.clone().offsetHSL(0, 0, (random() - 0.35) * 0.14);
          if (species === 'turkey' || (species === 'bur' && row >= rows - 2)) {
            const reach = radius * (species === 'turkey' ? 0.55 : 0.5) * mix(0.6, 1.2, random()), curl = (random() - 0.5) * 0.9;
            bag.add(rough, taper([at3(t, phi, -0.2), at3(Math.min(1.7, t + 0.25), phi + curl * 0.15, reach * 0.55), at3(Math.min(1.9, t + (species === 'turkey' ? 0.1 : 0.55)), phi + curl * 0.4, reach)], (u) => mix(0.5, 0.12, u) * radius * 0.07 * 1.6, 5, 4), undefined, tone.offsetHSL(0, 0, 0.08));
          } else {
            const from = at3(t - 0.06, phi, 0.05), to = at3(t + 0.2, phi, radius * 0.07);
            bag.add(rough, new THREE.ConeGeometry(0.5, 1, 4), aim(from, to, [width * (species === 'red' ? 1.15 : 0.85), width * 1.55, width * 0.4]).multiply(at([0, 0.5, 0])), tone);
          }
        }
      }
      // The stalk it hung from.
      const stalk: V3[] = species === 'english' ? [[0, 0.3, 0], [radius * 0.15, -radius * 0.5, 0], [radius * 0.5, -radius * 0.95, radius * 0.1]] : [[0, 0.3, 0], [0.2, -radius * 0.14, 0], [0.5, -radius * 0.26, 0]];
      bag.add(rough, taper(stalk, (u) => radius * mix(0.11, 0.075, u), 6, 6), undefined, shell.clone().multiplyScalar(0.75));
      bag.flush(group);
      return { group, rim: radius * depth, floor: thick };
    };
    const ground = (object: THREE.Object3D, height = 0) => {
      object.updateMatrixWorld(true);
      object.position.y += height - new THREE.Box3().setFromObject(object).min.y;
      object.updateMatrixWorld(true);
    };

    const base = a.leaf ? 0.7 : 0;
    const open = a.lying === 'upturned' || a.lying === 'twin';
    const cap = makeCap(a.species, R);
    const depth = SPECIES[a.species].depth;
    const bag = new Bag();

    // Contents, built in the cup's own frame when it is open to the sky, otherwise on the ground beside it.
    const contents = new THREE.Group();
    const local = new Bag();
    const level = cap.rim * 0.82, levelR = (R * 0.87) * Math.sin(Math.acos(1 - Math.min(1, (level - cap.floor) / (cap.rim - cap.floor)))) ;
    const where: V3 = open ? [0, 0, 0] : [R * 1.15, 0, R * 1.2];
    const sprout = (x: number, y: number, z: number, tall: number) => {
      local.add(matte, taper([[x, y, z], [x + tall * 0.12, y + tall * 0.55, z], [x + tall * 0.05, y + tall, z + tall * 0.05]], (u) => mix(0.5, 0.36, u), 8, 5), undefined, '#c9d28a');
      for (const side of [-1, 1]) local.add(smooth, ball(1, 10), at([x + tall * 0.05 + side * tall * 0.3, y + tall * 1.03, z + tall * 0.05], [0, 0.3, side * 0.5], [tall * 0.34, tall * 0.045, tall * 0.2]), green);
      local.add(smooth, new THREE.ConeGeometry(tall * 0.05, tall * 0.2, 5), at([x + tall * 0.05, y + tall * 1.1, z + tall * 0.05]), green.clone().offsetHSL(0, 0, 0.12));
    };
    if (a.holds === 'rain') {
      if (open) {
        const pool = new THREE.Mesh(new THREE.SphereGeometry(levelR, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), wet);
        pool.scale.y = 0.16;
        pool.position.y = level;
        contents.add(pool);
        local.add(smooth, new THREE.CircleGeometry(levelR, 18), at([0, level - 0.05, 0], [-Math.PI / 2, 0, 0]), '#7d8f88');
        const glint = new THREE.Mesh(ball(0.7, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false }));
        glint.position.set(-levelR * 0.4, level + 0.9, levelR * 0.25);
        contents.add(glint);
      } else {
        local.add(s.material('#ffffff', { roughness: 0.08, metalness: 0.4 }), new THREE.CylinderGeometry(R * 0.75, R * 0.8, 0.12, 18), at([0, 0.06, 0], [0, 0, 0], [1.2, 1, 0.8]), '#7f9aa2');
        for (let i = 0; i < 5; i++) {
          const bead = new THREE.Mesh(ball(0.7 + random() * 0.8, 10), wet);
          bead.position.set((random() - 0.5) * R * 1.4 - where[0], 0.6 + random() * R * 0.6, (random() - 0.5) * R - where[2]);
          contents.add(bead);
        }
      }
    } else if (a.holds === 'seedling') {
      if (open) local.add(matte, lumpy(new THREE.SphereGeometry(levelR, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0.08, 1.2, 3), at([0, level - 1.2, 0], [0, 0, 0], [1, 0.25, 1]), '#3a2b1f');
      else local.add(matte, lumpy(ball(1, 12), 0.12, 3, 4), at([0, 0, 0], [0, 0, 0], [R * 0.5, 1.4, R * 0.5]), '#3a2b1f');
      sprout(0, open ? level - 0.8 : 0.8, 0, R * mix(0.85, 1.35, mood.cheer));
    } else if (a.holds === 'moss') {
      const y = open ? level - 1.4 : 0, r = open ? levelR : R * 0.6;
      local.add(matte, new THREE.SphereGeometry(r, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), at([0, y, 0], [0, 0, 0], [1, 0.4, 1]), green.clone().multiplyScalar(0.65));
      for (let i = 0; i < 110; i++) {
        const t = random() * 6.3, d = Math.sqrt(random()) * r * 0.95;
        local.add(smooth, new THREE.ConeGeometry(0.42, 2 + random() * 2, 4, 1, true), at([Math.cos(t) * d, y + r * 0.4 * Math.sqrt(1 - (d / r) ** 2) + 0.9, Math.sin(t) * d], [Math.sin(t) * d * 0.07, 0, -Math.cos(t) * d * 0.07]), green.clone().offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.16));
      }
    } else if (a.holds === 'hoard') {
      const pile = 7 + Math.floor(random() * 6);
      for (let i = 0; i < pile; i++) {
        const t = random() * 6.3, d = Math.sqrt(random()) * (open ? levelR * 0.7 : R * 0.6), berry = random() < 0.45;
        local.add(s.material('#ffffff', { roughness: 0.3 }), ball(1, 9), at([Math.cos(t) * d, (open ? level - 1.6 : 0.7) + random() * 1.4, Math.sin(t) * d], [random() * 3, random() * 3, 0], berry ? 1.25 : [0.9, 0.9, 1.7]), berry ? (random() < 0.5 ? '#b3261e' : '#3d2f6b') : '#c79a4e');
      }
    }
    local.flush(contents);

    const holder = new THREE.Group();
    holder.add(cap.group);
    if (open) holder.add(contents);
    else { contents.position.set(where[0], base, where[2]); s.root.add(contents); }
    s.root.add(holder);
    if (a.lying === 'upturned') holder.rotation.set((random() - 0.5) * 0.2, random() * 6.3, 0.14 + random() * 0.12);
    if (a.lying === 'side') holder.rotation.set(1.25, 0, 0.25, 'ZYX');
    if (a.lying === 'dome') holder.rotation.set(Math.PI - 0.38, random() * 0.6 - 0.3, 0);
    if (a.lying === 'twin') {
      holder.rotation.set(0.1, 0.4, 0.35);
      const second = makeCap(a.species, R * 0.8), other = new THREE.Group();
      other.add(second.group);
      other.rotation.set(-0.2, 2.2, 0.75);
      other.position.set(-R * 1.85, 0, R * 0.2);
      s.root.add(other);
      ground(other, base);
      const twig = new Bag();
      twig.add(rough, taper([[R * 0.2, base + 0.5, -R * 0.1], [-R * 0.9, base + R * 0.2, R * 0.4], [-R * 1.7, base + 0.6, R * 0.1], [-R * 3, base + 0.5, -R * 0.5]], (u) => mix(0.9, 0.6, u), 14, 6), undefined, shell.clone().multiplyScalar(0.7));
      twig.flush(s.root);
    }
    ground(holder, base);
    if (a.lying === 'dome') bag.add(matte, lumpy(ball(1.5, 8), 0.15, 2, 2), at([0, base + 1, R * 0.92]), '#7f8284');

    // What is left of the nut.
    if (a.beside !== 'none') {
      const r = R * 0.74, L = r * 2.5, nutAt: V3 = [-R * 0.2, base, R * 1.75];
      const profile = [[0.02, 0], [0.3 * r, 0.02 * L], [0.82 * r, 0.14 * L], [r, 0.4 * L], [0.95 * r, 0.64 * L], [0.6 * r, 0.87 * L], [0.16 * r, 0.96 * L], [0.04 * r, 1.03 * L]].map(([x, y]) => new THREE.Vector2(x, y));
      const fresh = new THREE.Color('#a8683a').lerp(new THREE.Color('#8d9a4a'), (1 - mood.wear) * (a.beside === 'whole' ? 0.5 : 0.1)).lerp(new THREE.Color('#6f6557'), mood.wear * 0.5);
      if (a.beside === 'halves') {
        for (const side of [0, 1]) {
          const half = new THREE.Mesh(new THREE.LatheGeometry(profile, 12, 0, Math.PI), s.material(fresh, { roughness: 0.5, side: THREE.DoubleSide }));
          half.rotation.set(0, 0, -Math.PI / 2 + (side ? 0.25 : -0.15), 'YXZ');
          half.rotation.y = side ? 0.5 : -0.3;
          half.position.set(nutAt[0] + (side ? R * 1.1 : -R * 1.3), base, nutAt[2] + (side ? -R * 0.3 : R * 0.2));
          half.castShadow = half.receiveShadow = true;
          const wrap = new THREE.Group();
          wrap.add(half);
          s.root.add(wrap);
          ground(wrap, base);
        }
      } else {
        const skin = painted(512, 256, (ctx, w, h) => {
          ctx.fillStyle = '#' + fresh.getHexString();
          ctx.fillRect(0, 0, w, h);
          for (let i = 0; i < 46; i++) {
            ctx.strokeStyle = random() < 0.5 ? 'rgba(60,30,12,0.35)' : 'rgba(240,200,140,0.22)';
            ctx.lineWidth = 1 + random() * 3;
            const x = random() * w;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + (random() - 0.5) * 8, h);
            ctx.stroke();
          }
          ctx.fillStyle = '#d9c39a';
          ctx.fillRect(0, h * 0.9, w, h * 0.1);
          const cx = w * 0.86, cy = h * 0.52;
          if (a.beside === 'gnawed') {
            ctx.fillStyle = '#3a2416';
            ctx.beginPath();
            for (let i = 0; i <= 26; i++) {
              const t = (i / 26) * Math.PI * 2, rr = 1 + (i % 2 ? 0.2 : -0.08) + random() * 0.12;
              ctx.lineTo(cx + Math.cos(t) * 60 * rr, cy + Math.sin(t) * 68 * rr);
            }
            ctx.fill();
            ctx.fillStyle = '#f0e2bd';
            ctx.beginPath();
            ctx.ellipse(cx, cy, 50, 58, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#c9ab78';
            ctx.lineWidth = 4;
            for (let i = 0; i < 9; i++) {
              const x = cx - 38 + i * 9.5;
              ctx.beginPath();
              ctx.moveTo(x, cy - 34 + random() * 16);
              ctx.lineTo(x + 3, cy + 20 + random() * 20);
              ctx.stroke();
            }
          } else if (a.beside === 'weevil') {
            ctx.fillStyle = '#120b07';
            ctx.beginPath();
            ctx.arc(cx, cy, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#d6b37e';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, 17, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
        skin.wrapS = skin.wrapT = THREE.ClampToEdgeWrapping;
        const nut = new THREE.Mesh(new THREE.LatheGeometry(profile, 28), s.material('#ffffff', { map: skin, roughness: mix(0.22, 0.6, mood.wear) }));
        nut.rotation.z = -Math.PI / 2;
        nut.position.x = -L / 2;
        nut.castShadow = nut.receiveShadow = true;
        const wrap = new THREE.Group();
        wrap.add(nut);
        wrap.rotation.y = 0.25 + (random() - 0.5) * 0.3;
        wrap.position.set(nutAt[0], 0, nutAt[2]);
        s.root.add(wrap);
        ground(wrap, base);
        const crumbs = a.beside === 'gnawed' ? 16 : a.beside === 'weevil' ? 22 : 0;
        for (let i = 0; i < crumbs; i++) {
          const t = random() * 6.3, d = random() * (a.beside === 'gnawed' ? R * 0.9 : R * 0.3);
          if (a.beside === 'gnawed') bag.add(matte, new THREE.TetrahedronGeometry(0.5 + random() * 0.9), at([nutAt[0] + L * 0.2 + Math.cos(t) * d, base + 0.3, nutAt[2] + r * 1.3 + Math.sin(t) * d * 0.6], [random() * 3, random() * 3, 0]), random() < 0.5 ? '#f0e2bd' : fresh);
          else bag.add(matte, ball(0.22 + random() * 0.2, 5), at([nutAt[0] + L * 0.2 + Math.cos(t) * d, base + 0.15, nutAt[2] + r * 1.15 + Math.sin(t) * d]), '#b08a5a');
        }
      }
    }

    if (a.leaf) {
      const Lf = R * 5.4, Wf = R * 1.9, outline: [number, number][] = [];
      const half = (y: number) => Wf * Math.sin(Math.PI * Math.pow(y, 0.75)) ** 0.8 * (0.5 + 0.5 * Math.abs(Math.sin(y * Math.PI * 4.5))) + 0.25;
      for (let i = 0; i <= 44; i++) outline.push([half(i / 44), (i / 44) * Lf]);
      const shape = new THREE.Shape();
      shape.moveTo(0, -1);
      for (const [x, y] of outline) shape.lineTo(x, y);
      for (const [x, y] of outline.slice().reverse()) shape.lineTo(-x * (0.9 + 0.2 * Math.sin(y)), y);
      const blade = new THREE.ShapeGeometry(shape, 4);
      const position = blade.getAttribute('position'), curl = 0.5 + random();
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i);
        position.setZ(i, (x / Wf) ** 2 * 1.8 * curl + Math.sin((y / Lf) * 5) * 0.5);
      }
      blade.computeVertexNormals();
      const leafColour = new THREE.Color('#8a5a30').lerp(new THREE.Color('#c08a2c'), mood.warmth * 0.7).lerp(new THREE.Color('#77705f'), mood.wear * 0.4);
      const turn = 0.6 + random() * 0.6;
      const pose = at([Math.sin(turn) * -Lf * 0.5, 0.25, Math.cos(turn) * -Lf * 0.5 + R * 0.5], [-Math.PI / 2, 0, turn + Math.PI]);
      bag.add(s.material('#ffffff', { roughness: 0.8, side: THREE.DoubleSide }), blade, pose, leafColour);
      bag.add(matte, taper([[0, -R * 1.2, 0.25], [0, Lf * 0.5, 0.45], [0, Lf, 0.3]], (u) => mix(0.5, 0.15, u), 10, 5), pose, leafColour.clone().offsetHSL(0, 0, 0.14));
      for (let i = 1; i < 9; i++) for (const side of [-1, 1]) {
        const y = ((i + 0.3) / 9.5) * Lf;
        bag.add(matte, taper([[0, y - 2, 0.4], [side * half(y / Lf + 0.03) * 0.5, y + 1, 0.45 + 0.3 * curl], [side * half(y / Lf + 0.05) * 0.9, y + 3, 0.6 + 1.2 * curl]], () => 0.14, 4, 4), pose, leafColour.clone().offsetHSL(0, 0, 0.1));
      }
    }
    // A few stray caps and crumbs when the scene is busy.
    for (let i = 0; i < Math.round(mood.density * 2.4 - 0.6); i++) {
      const stray = makeCap(a.species, R * (0.45 + random() * 0.2)), wrap = new THREE.Group();
      wrap.add(stray.group);
      wrap.rotation.set(random() * 6.3, random() * 6.3, random() * 6.3);
      wrap.position.set((i ? 1 : -1) * R * (2 + random() * 0.6), 0, -R * (0.9 + random() * 0.8));
      s.root.add(wrap);
      ground(wrap, 0);
    }
    bag.flush(s.root);

    s.root.scale.setScalar(0.003);
    return s.finish();
  },
});
