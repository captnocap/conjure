import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
interface Pigment { colour: string; metal?: boolean }

const P: Record<string, Pigment> = {
  lapis: { colour: '#1c3da6' }, azurite: { colour: '#2f66b8' }, vermilion: { colour: '#d5341c' }, minium: { colour: '#e2651f' },
  white: { colour: '#f1eee4' }, purple: { colour: '#6c2f77' }, gold: { colour: '#d6a628', metal: true },
  ochre: { colour: '#c99a38' }, redochre: { colour: '#a3462a' }, umber: { colour: '#5b3f28' }, greenearth: { colour: '#7d8d59' }, black: { colour: '#191716' },
  verdigris: { colour: '#3aa78d' }, malachite: { colour: '#2c8a4c' }, saffron: { colour: '#eab41c' }, madder: { colour: '#c4446b' }, indigo: { colour: '#2a3468' }, orpiment: { colour: '#e8c62a' },
};
const SETS: Record<string, string[]> = {
  royal: ['lapis', 'vermilion', 'gold', 'azurite', 'white', 'purple'],
  earth: ['ochre', 'redochre', 'umber', 'greenearth', 'black', 'white'],
  garden: ['verdigris', 'malachite', 'saffron', 'madder', 'indigo', 'orpiment'],
  full: ['lapis', 'vermilion', 'verdigris', 'saffron', 'madder', 'malachite', 'white', 'black', 'purple', 'minium', 'ochre', 'azurite'],
  plain: ['black', 'vermilion', 'white', 'minium'],
};

/** Half a mussel: a tapered bowl, opening up, long axis along z with the pointed hinge at +z. */
function musselGeometry() {
  const geometry = new THREE.SphereGeometry(1, 22, 9, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i);
    const taper = mix(1, 0.34, Math.pow((z + 1) / 2, 1.4));
    p.setX(i, p.getX(i) * taper + (z + 1) * 0.06);
    p.setY(i, p.getY(i) * mix(1, 0.6, (z + 1) / 2));
  }
  geometry.computeVertexNormals();
  return geometry;
}
function poolGeometry(level: number) {
  // The cross-section of the bowl at a given depth (level in -1..0).
  const r = Math.sqrt(1 - level * level) * 0.97;
  const geometry = new THREE.CircleGeometry(r, 22);
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i);
    const zc = Math.max(-1, Math.min(1, z));
    const taper = mix(1, 0.34, Math.pow((zc + 1) / 2, 1.4));
    const depthHere = mix(1, 0.6, (zc + 1) / 2);
    const fits = Math.abs(level) < depthHere ? Math.sqrt(1 - (level / depthHere) ** 2) / Math.max(0.2, Math.sqrt(1 - level * level)) : 0;
    p.setX(i, p.getX(i) * taper * Math.min(1, fits) + (zc + 1) * 0.06);
    p.setY(i, level);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    colours: choice('Which colours are on the tray?', {
      royal: 'The costly set: lapis blue, vermilion, shell gold, purple.',
      earth: 'Cheap honest earths: ochres, umber, green earth, bone black.',
      garden: 'Sharp greens and yellows: verdigris, malachite, saffron, rose madder.',
      full: 'Everything: a dozen shells, the whole rainbow of the workshop.',
      plain: "A rubricator's bare set: black, red, white and orange lead.",
    }),
    tray: choice('What are the shells set out on?', {
      oak: 'A shallow oak tray with a raised rim.',
      slate: 'A bare slab of dark slate.',
      pewter: 'A round pewter dish, shells in a ring.',
      box: 'A compartmented colour box with its lid standing open.',
    }),
    shells: score('How many shells of colour?', ['Three', 'Half a dozen', 'A crowded dozen']),
    state: choice('What state is the palette in?', {
      fresh: 'Freshly tempered: every pool wet, full and glistening, brushes clean.',
      working: 'Mid-painting: loaded brushes lying in the tray, colours dragged and mixed, dabs everywhere.',
      dried: 'Dried out: colour shrunk to cracked cakes at the bottom of each shell.',
      spilled: 'An accident: a shell overturned and the most precious colour running across the tray.',
      grinding: 'Colour-making: a lump of raw stone, a slab and muller, powder half ground.',
    }),
    gold: choice('What gold is there?', {
      booklet: 'A closed booklet of gold leaf between paper, with an agate burnisher.',
      leaf: 'The booklet open and one leaf of gold lifting, trembling in the air.',
      scraps: 'Only scraps: torn gold crumbs and an empty booklet.',
      none: 'No gold at all.',
    }),
    brushes: score('How many brushes?', ['One fine brush', 'A few', 'A whole sheaf in a pot']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const vivid = mix(0.72, 1.08, mood.cheer);
    const pigmentColour = (name: string) => {
      const c = new THREE.Color(P[name].colour);
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      return c.setHSL(hsl.h, Math.min(1, hsl.s * vivid), hsl.l * (a.state === 'dried' ? 0.92 : 1));
    };
    const pigmentMaterial = (name: string, wet = a.state !== 'dried') =>
      new THREE.MeshStandardMaterial({
        color: pigmentColour(name), roughness: wet ? 0.16 : 0.95, metalness: P[name].metal ? 0.85 : 0,
        emissive: pigmentColour(name), emissiveIntensity: P[name].metal ? 0.18 : wet ? 0.2 : 0.06,
      });
    const oakTone = new THREE.Color('#8f6b3f').lerp(new THREE.Color('#4c3826'), mood.wear * 0.7);
    const oak = (shift = 0) => s.material(oakTone.clone().offsetHSL(0, 0, shift), { roughness: 0.8 });
    const outside = new THREE.MeshStandardMaterial({ color: '#20243a', roughness: 0.45 });
    const nacre = new THREE.MeshStandardMaterial({ color: '#dcd8e6', roughness: 0.22, metalness: 0.25, side: THREE.BackSide });
    const shellOut = musselGeometry();

    // ---- the tray ----
    const names = SETS[a.colours];
    const wanted = Math.max(3, Math.min(a.colours === 'plain' ? 6 : 12, Math.round(mix(3, 12, a.shells))));
    const TW = 0.44, TD = 0.3;
    let surface = 0.016;
    const spots: { x: number; z: number; turn: number }[] = [];
    if (a.tray === 'pewter') {
      const pewter = s.material('#a9adb0', { metalness: 0.75, roughness: 0.38 });
      s.lathe([[0, 0.006], [0.15, 0.006], [0.2, 0.024], [0.215, 0.026], [0.215, 0.02], [0.15, 0], [0, 0]], pewter);
      surface = 0.008;
      const inner = wanted > 7 ? wanted - 7 : 0;
      const outer = wanted - inner;
      for (let i = 0; i < outer; i++) { const angle = (i / outer) * Math.PI * 2 + 0.3; spots.push({ x: Math.cos(angle) * 0.125, z: Math.sin(angle) * 0.125, turn: -angle + Math.PI / 2 }); }
      for (let i = 0; i < inner; i++) { const angle = (i / Math.max(inner, 1)) * Math.PI * 2; spots.push({ x: Math.cos(angle) * (inner > 1 ? 0.048 : 0), z: Math.sin(angle) * (inner > 1 ? 0.048 : 0), turn: -angle + Math.PI / 2 }); }
    } else {
      if (a.tray === 'oak') {
        s.box([TW, 0.016, TD], [0, 0.008, 0], oak(0.03));
        for (const z of [-1, 1]) s.box([TW + 0.02, 0.034, 0.014], [0, 0.017, z * (TD / 2 + 0.003)], oak(-0.04));
        for (const x of [-1, 1]) s.box([0.014, 0.034, TD + 0.02], [x * (TW / 2 + 0.003), 0.017, 0], oak(-0.04));
      } else if (a.tray === 'slate') {
        const slab = s.box([TW + 0.02, 0.016, TD + 0.02], [0, 0.008, 0], s.material('#3c4248', { roughness: 0.75 }));
        slab.rotation.y = (random() - 0.5) * 0.04;
      } else {
        const wood = oak(-0.02);
        s.box([TW + 0.02, 0.05, TD + 0.02], [0, 0.025, 0], wood);
        s.box([TW, 0.004, TD], [0, 0.0505, 0], s.material('#3a2b20'));
        surface = 0.026;
        // Sunk well: the floor shows dark inside a raised frame.
        for (const z of [-1, 1]) s.box([TW + 0.02, 0.022, 0.012], [0, 0.058, z * (TD / 2 + 0.004)], wood);
        for (const x of [-1, 1]) s.box([0.012, 0.022, TD + 0.02], [x * (TW / 2 + 0.004), 0.058, 0], wood);
        surface = 0.052;
        const lid = new Sculpture(context);
        lid.box([TW + 0.02, 0.022, TD + 0.02], [0, 0.011, -(TD + 0.02) / 2], oak(0.02));
        lid.box([TW - 0.06, 0.004, TD - 0.06], [0, -0.001, -(TD + 0.02) / 2], s.material('#7a2a25'));
        lid.root.position.set(0, 0.069, -(TD / 2 + 0.01));
        lid.root.rotation.x = 1.75 + random() * 0.2;
        s.root.add(lid.root);
        for (const x of [-1, 1]) s.box([0.03, 0.02, 0.006], [x * TW * 0.3, 0.06, -(TD / 2 + 0.014)], s.material('#b8892c', { metalness: 0.7, roughness: 0.35 }));
      }
      const zoneW = TW * 0.66, cols = Math.ceil(Math.sqrt(wanted * 1.4)), rows = Math.ceil(wanted / cols);
      for (let i = 0; i < wanted; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        spots.push({
          x: -TW / 2 + 0.045 + (cols === 1 ? zoneW / 2 : (col / (cols - 1)) * (zoneW - 0.04)) + (row % 2 ? 0.012 : 0),
          z: rows === 1 ? 0 : mix(-TD / 2 + 0.06, TD / 2 - 0.06, row / (rows - 1)),
          turn: (random() - 0.5) * 0.9,
        });
      }
      if (a.tray === 'box') {
        for (let c = 1; c < cols; c++) s.box([0.005, 0.016, TD], [-TW / 2 + 0.045 + ((c - 0.5) / (cols - 1)) * (zoneW - 0.04), surface + 0.008, 0], oak(-0.05));
        s.box([0.005, 0.016, TD], [-TW / 2 + zoneW + 0.035, surface + 0.008, 0], oak(-0.05));
      }
    }

    // ---- shells ----
    const baseSize = spots.length > 8 ? 0.03 : spots.length > 5 ? 0.034 : 0.04;
    const spillIndex = a.state === 'spilled' ? 0 : -1;
    const heights: number[] = [];
    spots.forEach((spot, i) => {
      const name = names[i % names.length];
      const size = baseSize * mix(0.86, 1.14, random());
      const h = new THREE.Group();
      const outer = new THREE.Mesh(shellOut, outside);
      const inner = new THREE.Mesh(shellOut, nacre);
      inner.scale.setScalar(0.94);
      outer.castShadow = inner.receiveShadow = true;
      h.add(outer, inner);
      const level = a.state === 'dried' ? mix(-0.86, -0.7, random()) : mix(-0.62, -0.3, random()) + (mood.density - 0.5) * 0.12;
      if (i !== spillIndex) {
        const pool = new THREE.Mesh(poolGeometry(Math.max(-0.9, Math.min(-0.2, level))), pigmentMaterial(name));
        pool.scale.setScalar(0.94);
        h.add(pool);
        if (a.state === 'dried') {
          // A tide ring where the wet colour once stood.
          const ring = new THREE.Mesh(poolGeometry(-0.5), new THREE.MeshStandardMaterial({ color: pigmentColour(name).multiplyScalar(0.8), roughness: 1, transparent: true, opacity: 0.45, depthWrite: false }));
          ring.scale.setScalar(0.93);
          h.add(ring);
        } else if (a.state === 'working' && random() < 0.55) {
          // A second colour dragged into the first.
          const other = names[(i + 1 + Math.floor(random() * (names.length - 1))) % names.length];
          const swirl = new THREE.Mesh(new THREE.CircleGeometry(0.3 + random() * 0.2, 12), pigmentMaterial(other));
          swirl.rotation.x = -Math.PI / 2;
          swirl.scale.set(1, 0.5 + random() * 0.4, 1);
          swirl.position.set((random() - 0.5) * 0.3, Math.max(-0.9, Math.min(-0.2, level)) * 0.94 + 0.01, -0.3 + random() * 0.3);
          h.add(swirl);
        }
      }
      h.scale.set(size, size * 0.62, size * 1.55);
      const rest = surface + size * 0.62;
      h.position.set(spot.x, rest, spot.z);
      h.rotation.set((random() - 0.5) * 0.12, spot.turn, (random() - 0.5) * 0.16);
      heights.push(rest);
      if (i === spillIndex) {
        // Overturned: dark back up, colour escaping underneath.
        h.rotation.set(Math.PI - 0.25, spot.turn, 0.1);
        h.position.y = surface + size * 0.42;
        const material = pigmentMaterial(name);
        const run = new THREE.Shape();
        const reach = 0.16 + random() * 0.08;
        for (let k = 0; k <= 40; k++) {
          const angle = (k / 40) * Math.PI * 2;
          const r = (0.045 + 0.012 * Math.sin(angle * 5 + 1) + 0.008 * Math.sin(angle * 9)) * (1 + Math.max(0, Math.cos(angle - 0.5)) ** 3 * (reach / 0.045));
          if (k === 0) run.moveTo(Math.cos(angle) * r, Math.sin(angle) * r); else run.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        const puddle = s.mesh(new THREE.ShapeGeometry(run), material, [spot.x, surface + 0.0015, spot.z]);
        puddle.rotation.x = -Math.PI / 2;
        puddle.rotation.z = a.tray === 'pewter' ? Math.atan2(spot.z, -spot.x) : -0.2;
        for (let k = 0; k < 7; k++) s.cylinder(0.004 + random() * 0.006, 0.004, 0.002, [spot.x + 0.05 + random() * 0.14, surface + 0.002, spot.z + (random() - 0.2) * 0.12], material, 8);
      }
      s.root.add(h);
    });

    // ---- brushes ----
    const brushCount = Math.max(1, Math.round(mix(1, 9, a.brushes)));
    const brush = (tip: THREE.Material) => {
      const b = new Sculpture(context);
      const len = 0.15 + random() * 0.05;
      b.rod([0, 0, 0], [0, len, 0], 0.0035, s.material(random() < 0.5 ? '#e8dcbc' : '#7a5a38', { roughness: 0.5 }), 0.0028);
      b.rod([0, len, 0], [0, len + 0.014, 0], 0.0036, s.material('#cdbf9a'));
      b.rod([0, len + 0.014, 0], [0, len + 0.04, 0], 0.0034, s.material('#3a2c22'), 0.0008);
      b.rod([0, len + 0.026, 0], [0, len + 0.041, 0], 0.0026, tip, 0.0007);
      return { root: b.root, len: len + 0.04 };
    };
    const tipFor = (i: number) => (a.state === 'fresh' || a.state === 'dried' ? s.material('#3a2c22') : pigmentMaterial(names[i % names.length], true));
    const side = a.tray === 'pewter' ? 0.3 : TW / 2 - 0.05;
    const loose = a.brushes > 0.7 ? 2 : brushCount;
    for (let i = 0; i < Math.min(loose, 4); i++) {
      const b = brush(tipFor(i));
      // Laid with the ferrule propped on the rim so the hair stays off the wood.
      const propped = a.tray === 'oak' || a.tray === 'box';
      b.root.rotation.set(0, 0, 0);
      const holder = new THREE.Group();
      holder.add(b.root);
      b.root.rotation.x = Math.PI / 2 - (propped ? 0.12 : 0);
      holder.rotation.y = Math.PI + (random() - 0.5) * 0.5;
      holder.position.set(side - 0.025 + i * 0.028, (a.tray === 'pewter' ? 0 : surface) + 0.006 + (propped ? 0.022 : 0), (a.tray === 'pewter' ? 0.05 : TD / 2 - 0.02) + random() * 0.03);
      s.root.add(holder);
    }
    if (a.brushes > 0.7) {
      const px = a.tray === 'pewter' ? -0.29 : -TW / 2 - 0.09, pz = -0.06;
      s.lathe([[0, 0], [0.034, 0], [0.042, 0.03], [0.036, 0.075], [0.04, 0.085], [0.034, 0.085], [0.03, 0.01], [0, 0.01]], s.material('#9a6a48', { roughness: 0.7 }), [px, 0, pz]);
      for (let i = 0; i < brushCount - 2; i++) {
        const b = brush(tipFor(i + 2));
        b.root.position.set(px + (random() - 0.5) * 0.03, 0.012, pz + (random() - 0.5) * 0.03);
        b.root.rotation.set((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5);
        s.root.add(b.root);
      }
    }

    // ---- gold ----
    const goldLeaf = new THREE.MeshStandardMaterial({ color: '#e2b53a', metalness: 0.95, roughness: 0.22, emissive: '#c98a12', emissiveIntensity: 0.3, side: THREE.DoubleSide });
    const gx = a.tray === 'pewter' ? 0.3 : TW / 2 - 0.075, gz = a.tray === 'pewter' ? -0.09 : -TD / 2 + 0.085;
    const gy = a.tray === 'pewter' ? 0 : surface;
    let flutter: THREE.Mesh | null = null;
    if (a.gold !== 'none') {
      const paper = s.material('#e9dfc8', { roughness: 0.95 });
      const turn = (random() - 0.5) * 0.5;
      const book = new Sculpture(context);
      book.root.position.set(gx, gy, gz);
      book.root.rotation.y = turn;
      s.root.add(book.root);
      book.box([0.095, 0.012, 0.095], [0, 0.006, 0], paper);
      book.box([0.1, 0.002, 0.1], [0, 0.001, 0], s.material('#8a2f28'));
      if (a.gold === 'booklet') {
        book.box([0.1, 0.002, 0.1], [0, 0.013, 0], s.material('#8a2f28'));
        book.box([0.096, 0.002, 0.004], [0, 0.007, 0.0485], goldLeaf);
      } else if (a.gold === 'leaf') {
        book.box([0.086, 0.0006, 0.086], [0, 0.0126, 0], goldLeaf);
        const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.085, 8, 8), goldLeaf);
        const p = sheet.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) { const u = p.getX(i) / 0.085 + 0.5; p.setZ(i, u * u * 0.05 + Math.sin(p.getY(i) * 90 + u * 5) * 0.004 * u); }
        sheet.geometry.computeVertexNormals();
        sheet.rotation.x = -Math.PI / 2;
        sheet.position.set(0.012, 0.016, 0.004);
        sheet.castShadow = true;
        book.root.add(sheet);
        flutter = sheet;
      } else {
        for (let i = 0; i < 9; i++) {
          const crumb = book.box([0.008 + random() * 0.02, 0.0006, 0.006 + random() * 0.016], [(random() - 0.5) * 0.14, 0.0135 * (random() < 0.5 ? 1 : 0.1), (random() - 0.5) * 0.14], goldLeaf);
          crumb.rotation.set(random() * 0.6, random() * 3, random() * 0.6);
        }
      }
      // Burnisher: a polished tooth of agate on a stick.
      const bz = gz + 0.085;
      s.rod([gx - 0.06, gy + 0.006, bz], [gx + 0.04, gy + 0.006, bz + 0.02], 0.005, oak(0.06), 0.004);
      s.rod([gx + 0.04, gy + 0.006, bz + 0.02], [gx + 0.07, gy + 0.008, bz + 0.026], 0.005, s.material('#a8432c', { roughness: 0.12 }), 0.002);
    }

    // ---- state extras ----
    if (a.state === 'working') {
      for (let i = 0; i < 14; i++) {
        const dab = s.cylinder(0.004 + random() * 0.009, 0.004, 0.0016, [(random() - 0.5) * (a.tray === 'pewter' ? 0.22 : TW * 0.9), surface + 0.001, (random() - 0.5) * (a.tray === 'pewter' ? 0.22 : TD * 0.9)], pigmentMaterial(names[Math.floor(random() * names.length)]), 8);
        dab.scale.x = 1 + random() * 2;
        dab.rotation.y = random() * 3;
      }
    }
    if (a.state === 'grinding' || mood.density > 0.75) {
      const stone = names[0];
      const sx = a.tray === 'pewter' ? -0.02 : 0, sz = (a.tray === 'pewter' ? 0.215 : TD / 2) + 0.13;
      s.box([0.2, 0.022, 0.16], [sx, 0.011, sz], s.material('#5a3038', { roughness: 0.3 })).rotation.y = (random() - 0.5) * 0.3;
      s.lathe([[0, 0], [0.034, 0], [0.038, 0.012], [0.024, 0.05], [0.028, 0.075], [0.018, 0.09], [0, 0.092]], s.material('#6a6d72', { roughness: 0.35 }), [sx + 0.04, 0.022, sz + 0.01]);
      const powder = pigmentMaterial(stone, false);
      const heap = s.mesh(new THREE.ConeGeometry(0.032, 0.018, 14), powder, [sx - 0.045, 0.031, sz - 0.01]);
      heap.scale.z = 0.8;
      s.cylinder(0.05, 0.055, 0.0015, [sx - 0.02, 0.0228, sz], powder, 16).scale.z = 0.7;
      for (let i = 0; i < 3; i++) {
        const lump = s.mesh(new THREE.IcosahedronGeometry(0.014 + random() * 0.012, 0), new THREE.MeshStandardMaterial({ color: pigmentColour(stone).multiplyScalar(0.75), roughness: 0.6, flatShading: true }), [sx - 0.15 - random() * 0.04, 0.016, sz - 0.05 + i * 0.045]);
        lump.rotation.set(random() * 3, random() * 3, random() * 3);
      }
    }
    if (mood.density > 0.35) {
      // A water pot, cloudy with rinsings.
      const wx = a.tray === 'pewter' ? 0.27 : TW / 2 + 0.085, wz = 0.07;
      s.lathe([[0, 0], [0.03, 0], [0.04, 0.025], [0.036, 0.055], [0.04, 0.06], [0.034, 0.06], [0.03, 0.008], [0, 0.008]], s.material('#a56e4c', { roughness: 0.6 }), [wx, 0, wz]);
      s.cylinder(0.033, 0.033, 0.002, [wx, 0.048, wz], pigmentMaterial(a.state === 'fresh' ? 'white' : names[1 % names.length]), 16);
    }
    if (mood.density > 0.55) {
      const rag = s.ball([0.05, 0.012, 0.04], [a.tray === 'pewter' ? -0.26 : -TW / 2 - 0.08, 0.01, 0.1], s.material('#d6d0bd', { roughness: 1 }), 10);
      rag.rotation.y = random() * 3;
      s.ball([0.018, 0.006, 0.014], [rag.position.x + 0.01, 0.02, rag.position.z], pigmentMaterial(names[0], false), 8);
    }

    const energy = mood.energy;
    return s.finish({
      update: (_dt, time) => {
        if (flutter) flutter.rotation.y = Math.sin(time * mix(1.2, 5, energy)) * mix(0.03, 0.14, energy);
      },
    });
  },
});
