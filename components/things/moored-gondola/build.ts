import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const TRIMS = {
  crimson: 'Crimson damask and red carpet, the postcard gondola.',
  blue: 'Deep royal blue velvet with silver thread, cool and formal.',
  gold: 'Old gold brocade and brass everywhere, a showpiece for weddings.',
  emerald: 'Dark emerald green, a private family boat.',
  mourning: 'All black with a thin violet edge, a funeral boat.',
  ivory: 'Ivory white cushions with pale ribbons, bridal and fragile.',
} as const;
const TRIM: Record<keyof typeof TRIMS, [string, string]> = {
  crimson: ['#b3202c', '#e2b64a'], blue: ['#23408f', '#cfd6e2'], gold: ['#c9962b', '#f1d67a'],
  emerald: ['#1f6b4a', '#d9b65a'], mourning: ['#26222b', '#7a55a8'], ivory: ['#efe6d2', '#d9b9a8'],
};

type P3 = [number, number, number];

function loft(rows: P3[][], material: THREE.Material) {
  const cols = rows[0].length;
  const position: number[] = [], index: number[] = [];
  for (const row of rows) for (const p of row) position.push(...p);
  for (let i = 0; i < rows.length - 1; i++)
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function damask(base: string, thread: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = thread;
  ctx.fillStyle = thread;
  ctx.lineWidth = 3;
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      const cx = x * 32 + (y % 2 ? 16 : 0) + 8, cy = y * 32 + 16;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 7, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
    }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

export default defineThing({
  questions: {
    trim: choice('What colour are the seat, carpet and trim?', TRIMS),
    state: choice('Is the gondola ready for a passenger or put away?', {
      ready: 'Open and ready: seat plumped, carpet laid, waiting at the steps.',
      half: 'Half uncovered: the tarp rolled back off the seat, someone is coming or has just left.',
      tarped: 'Fully covered with a lashed tarp, put to bed for the night or the season.',
      stripped: 'Stripped bare: no seat or carpet, just the black hull, laid up or abandoned.',
    }),
    left: choice('What lies on the seat (or on the deck, if it is covered)?', {
      nothing: 'Nothing at all.',
      rose: 'A single long-stemmed red rose.',
      hat: "The gondolier's straw boater with its ribbon.",
      lantern: 'A small brass lantern, glowing.',
      blanket: 'A folded travelling blanket.',
      letter: 'A sealed white envelope.',
      mask: 'A white carnival mask, face up.',
    }),
    oar: choice('Where is the single oar?', {
      forcola: 'Resting in the carved oarlock, blade trailing in the water, ready to push off.',
      stowed: 'Laid flat along the hull, shipped for the day.',
      missing: 'Gone: the oarlock stands empty.',
    }),
    ferro: choice('What is the iron prow like?', {
      classic: 'The classic polished steel ferro: a broad blade over six forward teeth.',
      gilded: 'A gilded ceremonial ferro, bright as a coin.',
      plain: 'A plain curved iron blade without teeth, an older working boat.',
    }),
    mooring: choice('How is it moored?', {
      post: 'Tied by the bow to a bare weathered post.',
      adrift: 'The bow rope trails loose in the water: it has slipped its mooring.',
      none: 'No rope or post in sight.',
    }),
    finery: score('How dressed-up is the boat?', ['A bare working boat', 'A few brass fittings', 'Brass sea-horses, tassels and a gilded deck carving']),
    hullLength: score('How long is the gondola?', ['A compact canal boat', 'A full-size gondola', 'A long ceremonial hull']),
    beam: score('How broad is its passenger well?', ['A narrow, nimble hull', 'A standard passenger well', 'A broad, steady hull']),
    floorboards: choice('How is the visible well floor laid?', {
      plain: 'A plain dark well floor.', lengthwise: 'Narrow lengthwise timber battens.',
      ribs: 'A sequence of transverse floor ribs.', herringbone: 'Alternating diagonal battens across the well.',
    }),
    gunwale: choice('What extra edging follows the open well?', {
      plain: 'Only the original slim gunwale.', raised: 'A second low rail on short uprights.',
      rope: 'A pale rope rail suspended between low pins.', moulded: 'A thick dark moulding with a narrow brass inlay.',
    }),
    fenders: choice('What protects the hull beside the seat?', {
      none: 'No hanging fenders.', rope: 'Rounded rope fenders on short lines.',
      timber: 'Narrow timber rubbing blocks.', cushions: 'Small fabric-covered fender cushions.',
    }),
    canopy: choice('If the passenger well is uncovered, what canopy is fitted?', {
      open: 'Open air above the passengers.', hoops: 'Three bare curved canopy hoops.',
      short: 'A short fabric shade over the rear seat.', felze: 'A long arched black passenger canopy with open ends.',
    }),
    deckCargo: choice('What load rests on a tray on the foredeck?', {
      clear: 'An empty foredeck without a tray.', case: 'A strapped travelling case.',
      parcels: 'Two wrapped parcels tied with narrow cord.', flowers: 'A shallow flower basket with upright stems.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const boat = new THREE.Group();
    s.root.add(boat);
    const B = <T extends THREE.Object3D>(node: T) => { boat.add(node); return node; };
    const [cloth, thread] = TRIM[a.trim];

    const black = new THREE.MeshStandardMaterial({ color: new THREE.Color('#17181d').lerp(new THREE.Color('#5a5750'), mood.wear * 0.45), roughness: mix(0.22, 0.75, mood.wear), metalness: 0.25, side: THREE.DoubleSide });
    const inner = s.material('#3b2a20', { side: THREE.DoubleSide });
    const gold = s.material(thread, { metalness: 0.3, roughness: 0.35, emissive: thread, emissiveIntensity: 0.12 });
    const brocade = new THREE.MeshStandardMaterial({ map: damask(cloth, thread), roughness: 0.8 });
    const plainCloth = s.material(cloth, { roughness: 0.85, side: THREE.DoubleSide });
    const wood = s.material('#6a4426');

    // Hull: lofted cross-sections from stern (u = -1) to bow (u = 1), waterline at y = 0.
    const L = mix(8.0, 10.4, a.hullLength), beam = mix(.74, 1.0, a.beam), stations = 44;
    const rise = (u: number) => (u > 0 ? 0.78 * u ** 3 : 0.98 * (-u) ** 3.2);
    const half = (u: number) => beam * (1 - Math.abs(u) ** 2.3) ** 0.75;
    const sheer = (u: number) => 0.46 + rise(u);
    const keel = (u: number) => sheer(u) - (0.62 * (1 - Math.abs(u) ** 3) + 0.1);
    const X = (u: number) => (u * L) / 2;
    const us = Array.from({ length: stations + 1 }, (_n, i) => -1 + (2 * i) / stations);
    B(loft(us.map((u) => {
      const w = half(u), g = sheer(u), k = keel(u), d = g - k;
      return [[-w, g], [-w * 0.9, g - d * 0.55], [-w * 0.5, k + 0.04], [0, k], [w * 0.5, k + 0.04], [w * 0.9, g - d * 0.55], [w, g]].map(([z, y]) => [X(u), y, z] as P3);
    }), black));
    // Fore and aft decks, the open well floor and the gunwale rails.
    for (const range of [[-1, -0.5], [0.52, 1]])
      B(loft(us.filter((u) => u >= range[0] - 1e-6 && u <= range[1] + 1e-6).map((u) => [[X(u), sheer(u), -half(u)], [X(u), sheer(u) + half(u) * 0.12, 0], [X(u), sheer(u), half(u)]] as P3[]), black));
    B(loft(us.filter((u) => Math.abs(u) <= 0.56).map((u) => [[X(u), keel(u) + 0.16, -half(u) * 0.72], [X(u), keel(u) + 0.16, half(u) * 0.72]] as P3[]), inner));
    for (const side of [-1, 1]) B(s.tube(us.filter((_u, i) => i % 2 === 0).map((u) => [X(u), sheer(u) + 0.015, side * half(u)] as P3), 0.022, a.finery > 0.3 ? gold : black));
    if (a.finery > 0.66) for (const u of [0.6, 0.68, 0.76]) B(s.ring(half(u) * 0.45, 0.02, [X(u), sheer(u) + half(u) * 0.09, 0], gold)).rotation.x = Math.PI / 2;

    if (a.floorboards === 'lengthwise') for (const fraction of [-.55, -.27, 0, .27, .55]) B(s.tube(us.filter(u => Math.abs(u) < .52).map(u => [X(u), keel(u) + .174, half(u) * fraction] as P3), .018, wood));
    else if (a.floorboards === 'ribs') for (let i = 0; i < 14; i++) { const u = -.48 + i * .96 / 13; B(s.rod([X(u), keel(u) + .18, -half(u) * .7], [X(u), keel(u) + .18, half(u) * .7], .026, wood)); }
    else if (a.floorboards === 'herringbone') for (let i = 0; i < 13; i++) for (const side of [-1, 1]) { const u = -.46 + i * .072, to = u + .05; B(s.rod([X(u), keel(u) + .174, 0], [X(to), keel(to) + .174, side * half(to) * .68], .018, wood)); }
    for (const side of [-1, 1]) {
      const strip = us.filter(u => Math.abs(u) < .52);
      if (a.gunwale === 'moulded') { B(s.tube(strip.map(u => [X(u), sheer(u) + .035, side * half(u)] as P3), .055, black)); B(s.tube(strip.map(u => [X(u), sheer(u) + .085, side * half(u)] as P3), .012, gold)); }
      else if (a.gunwale === 'raised' || a.gunwale === 'rope') {
        for (const u of [-.48, -.24, 0, .24, .48]) B(s.rod([X(u), sheer(u), side * half(u)], [X(u), sheer(u) + .18, side * half(u)], .018, gold));
        B(s.tube(strip.map(u => [X(u), sheer(u) + .18, side * half(u)] as P3), a.gunwale === 'rope' ? .023 : .018, a.gunwale === 'rope' ? s.material('#d1be91') : gold));
      }
      if (a.fenders !== 'none') for (const u of [-.25, .18]) {
        const x = X(u), z = side * (half(u) + .13), y = sheer(u) - .15;
        B(s.rod([x, sheer(u) + .02, side * half(u)], [x, y + .12, z], .012, s.material('#c6b48e')));
        if (a.fenders === 'timber') B(s.box([.13, .52, .14], [x, y - .14, z], wood));
        else if (a.fenders === 'cushions') B(s.ball([.16, .26, .12], [x, y - .12, z], plainCloth, 14));
        else { B(s.cylinder(.085, .085, .35, [x, y - .1, z], s.material('#c6b48e'), 14)); for (const yy of [y - .275, y + .075]) B(s.ball([.085, .06, .085], [x, yy, z], s.material('#c6b48e'), 10)); }
      }
    }

    // The ferro at the bow and the small curled risso at the stern.
    const iron = a.ferro === 'gilded' ? s.material('#e6b84a', { metalness: 0.3, roughness: 0.3, emissive: '#e6b84a', emissiveIntensity: 0.15 }) : s.material('#dfe3e8', { metalness: 0.3, roughness: 0.3 });
    const bowX = X(1) - 0.12, bowY = sheer(1);
    const blade = new THREE.Shape();
    blade.moveTo(-0.12, -0.45);
    blade.lineTo(0.02, -0.45);
    blade.quadraticCurveTo(0.14, 0.1, 0.12, 0.55);
    blade.quadraticCurveTo(0.5, 0.6, 0.52, 0.86);
    blade.quadraticCurveTo(0.5, 1.12, 0.14, 1.1);
    blade.quadraticCurveTo(-0.1, 1.05, -0.08, 0.7);
    blade.quadraticCurveTo(-0.02, 0.2, -0.12, -0.45);
    const prow = new THREE.Group();
    prow.position.set(bowX, bowY, 0);
    prow.scale.setScalar(a.ferro === 'plain' ? 1.15 : 1.45);
    B(prow);
    prow.add(s.mesh(new THREE.ExtrudeGeometry(blade, { depth: 0.035, bevelEnabled: false }), iron, [0, 0, -0.0175]));
    if (a.ferro !== 'plain') {
      for (let tooth = 0; tooth < 6; tooth++) prow.add(s.box([0.36, 0.05, 0.035], [0.26, -0.02 + tooth * 0.092, 0], iron));
      prow.add(s.box([0.22, 0.05, 0.035], [-0.16, 0.3, 0], iron));
    }
    const risso = B(s.ring(0.16, 0.03, [X(-1) + 0.1, sheer(-1) + 0.14, 0], iron, Math.PI * 1.5));
    risso.rotation.z = Math.PI * 0.4;

    // Seat, carpet and brass.
    const seatX = -0.9, floorY = keel(-0.17) + 0.16;
    const covered = a.state === 'tarped', dressed = a.state === 'ready' || a.state === 'half';
    if (dressed) {
      B(s.box([2.6, 0.02, 0.8], [0.2, floorY + 0.012, 0], plainCloth));
      B(s.box([0.72, 0.3, 0.92], [seatX, floorY + 0.15, 0], black));
      B(s.box([0.66, 0.12, 0.86], [seatX + 0.02, floorY + 0.36, 0], brocade));
      B(s.box([0.14, 0.8, 1.02], [seatX - 0.37, floorY + 0.58, 0], brocade)).rotation.z = 0.16;
      const crest = B(s.cylinder(0.48, 0.48, 0.14, [seatX - 0.44, floorY + 0.97, 0], brocade, 24));
      crest.rotation.z = Math.PI / 2 + 0.16;
      crest.scale.set(0.5, 1, 1.06);
      for (const side of [-1, 1]) {
        B(s.box([0.4, 0.26, 0.2], [seatX + 0.75, floorY + 0.13, side * 0.36], black));
        B(s.box([0.38, 0.06, 0.2], [seatX + 0.75, floorY + 0.29, side * 0.36], brocade));
        if (a.finery > 0.45) {
          // Brass sea-horses on the gunwale either side of the seat.
          const y = sheer(-0.05) + 0.02, z = side * half(-0.05);
          B(s.tube([[seatX + 0.55, y, z], [seatX + 0.62, y + 0.14, z], [seatX + 0.55, y + 0.26, z], [seatX + 0.66, y + 0.3, z]], 0.028, gold));
        }
        if (a.finery > 0.75) B(s.rod([seatX - 0.36, floorY + 0.78, side * 0.5], [seatX - 0.36, floorY + 0.5, side * 0.52], 0.03, gold, 0.012));
      }
    }

    if (dressed && a.canopy !== 'open') {
      const left = -.39, right = a.canopy === 'short' ? -.12 : .23, top = 1.65;
      const arch = (u: number, t: number): P3 => [X(u), sheer(u) + Math.sin(t) * (top - sheer(u)), Math.cos(t) * half(u)];
      for (const u of [left, (left + right) / 2, right]) B(s.tube(Array.from({length: 25}, (_, i) => arch(u, i * Math.PI / 24)), .025, gold));
      if (a.canopy !== 'hoops') {
        const rows: P3[][] = [];
        for (let j = 0; j <= 20; j++) { const u = mix(left, right, j / 20); rows.push(Array.from({length: 25}, (_, i) => arch(u, i * Math.PI / 24))); }
        B(loft(rows, a.canopy === 'felze' ? black : plainCloth));
      }
    }

    // Tarp over the well.
    if (covered || a.state === 'half') {
      const tarp = s.material(new THREE.Color('#3f74a6').lerp(new THREE.Color('#5d7a62'), mood.wear * 0.7), { roughness: 0.9, side: THREE.DoubleSide });
      const from = covered ? -0.6 : 0.08, to = 0.58;
      const span = us.filter((u) => u >= from - 1e-6 && u <= to + 1e-6);
      const lump = span.map(() => random() * 0.06);
      B(loft(span.map((u, i) => {
        const w = half(u) + 0.03, g = sheer(u);
        const hump = (covered && Math.abs(u + 0.17) < 0.1 ? 0.5 : 0.24) * Math.sin(Math.PI * Math.min(1, Math.max(0, (u - from) / (to - from)))) ** 0.4 + lump[i];
        return [[-w, g - 0.16], [-w, g + 0.03], [-w * 0.5, g + hump * 0.8], [0, g + hump], [w * 0.5, g + hump * 0.8], [w, g + 0.03], [w, g - 0.16]].map(([z, y]) => [X(u), y, z] as P3);
      }), tarp));
      const rope = s.material('#d8cba6');
      for (let i = 2; i < span.length - 1; i += 3) {
        const u = span[i], w = half(u) + 0.045, g = sheer(u);
        B(s.tube([[X(u), g - 0.14, -w], [X(u), g + 0.2, -w * 0.5], [X(u), g + 0.28, 0], [X(u), g + 0.2, w * 0.5], [X(u), g - 0.14, w]], 0.014, rope));
      }
      if (!covered) B(s.cylinder(0.13, 0.13, 1.3, [X(from) - 0.05, sheer(from) + 0.1, 0], tarp, 14)).rotation.x = Math.PI / 2;
    }

    // What was left behind.
    const at: P3 = dressed ? [seatX + 0.02, floorY + 0.42, 0.05] : covered ? [X(0.68), sheer(0.68) + half(0.68) * 0.12, 0] : [seatX, floorY + 0.01, 0];
    const item = new THREE.Group();
    item.position.set(...at);
    item.rotation.y = (random() - 0.5) * 1.2;
    B(item);
    const I = <T extends THREE.Object3D>(node: T) => { item.add(node); return node; };
    if (a.left === 'rose') {
      const red = s.material('#d4162f', { emissive: '#7a0012', emissiveIntensity: 0.35 }), green = s.material('#2f6b34');
      I(s.rod([-0.3, 0.025, 0], [0.22, 0.03, 0], 0.012, green));
      I(s.ball([0.075, 0.065, 0.075], [0.27, 0.06, 0], red, 10));
      I(s.ball([0.05, 0.05, 0.05], [0.3, 0.085, 0.01], red, 8));
      I(s.ball([0.06, 0.012, 0.03], [0.02, 0.035, 0.04], green, 8));
    } else if (a.left === 'hat') {
      const straw = s.material('#e8d39a');
      I(s.cylinder(0.21, 0.21, 0.018, [0, 0.012, 0], straw, 24));
      I(s.cylinder(0.115, 0.12, 0.09, [0, 0.06, 0], straw, 24));
      I(s.cylinder(0.123, 0.125, 0.035, [0, 0.036, 0], s.material(a.trim === 'ivory' ? '#b3202c' : cloth), 24));
      I(s.box([0.04, 0.006, 0.3], [-0.12, 0.024, 0.18], s.material(a.trim === 'ivory' ? '#b3202c' : cloth))).rotation.y = 0.4;
    } else if (a.left === 'lantern') {
      I(s.cylinder(0.07, 0.08, 0.03, [0, 0.015, 0], gold, 12));
      I(s.cylinder(0.055, 0.055, 0.14, [0, 0.1, 0], s.material('#ffd98a', { emissive: '#ffb030', emissiveIntensity: mix(1.2, 2.4, 1 - mood.daylight * 0.5) }), 12));
      I(s.cylinder(0.02, 0.075, 0.06, [0, 0.2, 0], gold, 12));
      I(s.ring(0.04, 0.008, [0, 0.26, 0], gold));
    } else if (a.left === 'blanket') {
      const plaid = s.material(a.trim === 'crimson' ? '#44608a' : '#8a3d34');
      I(s.box([0.42, 0.07, 0.5], [0, 0.035, 0], plaid));
      I(s.box([0.4, 0.06, 0.46], [0.01, 0.1, 0.01], plaid));
      I(s.box([0.43, 0.012, 0.06], [0, 0.135, 0.1], s.material('#e8dcc0')));
    } else if (a.left === 'letter') {
      I(s.box([0.3, 0.008, 0.2], [0, 0.006, 0], s.material('#f6f1e4', { emissive: '#f6f1e4', emissiveIntensity: 0.12 })));
      I(s.cylinder(0.028, 0.028, 0.008, [0, 0.014, 0], s.material('#a3121f'), 12));
    } else if (a.left === 'mask') {
      const face = I(s.ball([0.11, 0.06, 0.15], [0, 0.03, 0], s.material('#f4efe6'), 16));
      face.rotation.y = Math.PI / 2;
      for (const side of [-1, 1]) I(s.ball([0.03, 0.012, 0.022], [0.035, 0.082, side * 0.045], s.material('#16151a'), 8));
      I(s.box([0.02, 0.004, 0.45], [0, 0.01, 0], s.material(cloth)));
    }

    // Keep a travelling load level on a tray with short legs on the actual foredeck.
    if (a.deckCargo !== 'clear') {
      const x = X(.66), depth = Math.min(.62, half(.66) * 1.4), width = .75;
      const deckAt = (xx: number, zz: number) => { const u = xx / (L / 2), w = half(u); return sheer(u) + .12 * Math.max(0, w - Math.abs(zz)); };
      const trayY = Math.max(...[-width / 2, width / 2].flatMap(dx => [-depth / 2, depth / 2].map(dz => deckAt(x + dx, dz)))) + .055;
      for (const dx of [-width * .4, width * .4]) for (const dz of [-depth * .4, depth * .4]) B(s.rod([x + dx, deckAt(x + dx, dz), dz], [x + dx, trayY - .035, dz], .02, wood));
      B(s.box([width, .035, depth], [x, trayY - .0175, 0], wood));
      const paper = s.material('#d5c5a3');
      if (a.deckCargo === 'case') {
        B(s.box([.61, .28, depth * .8], [x, trayY + .14, 0], s.material('#76573e')));
        for (const dx of [-.2, .2]) B(s.box([.04, .285, depth * .81], [x + dx, trayY + .14, 0], gold));
        B(s.ring(.065, .012, [x, trayY + .29, 0], wood, Math.PI));
      } else if (a.deckCargo === 'parcels') for (const dx of [-.18, .18]) {
        B(s.box([.31, .22, depth * .8], [x + dx, trayY + .11, 0], paper)); B(s.box([.018, .225, depth * .81], [x + dx, trayY + .11, 0], wood));
      } else {
        B(s.box([.58, .14, depth * .8], [x, trayY + .07, 0], paper));
        for (let i = 0; i < 7; i++) { const xx = x + (i % 4 - 1.5) * .12, z = (Math.floor(i / 4) - .5) * .14, y = trayY + .3 + (i % 3) * .06; B(s.rod([xx, trayY + .14, z], [xx, y, z], .008, s.material('#59734b'))); B(s.ball([.055, .05, .055], [xx, y, z], i % 2 ? plainCloth : paper, 10)); }
      }
    }

    // Forcola (oarlock) and oar.
    const fx = X(-.58), fz = half(-0.51) - 0.06, fy = sheer(-0.51);
    B(s.tube([[fx, fy - 0.2, fz], [fx + 0.03, fy + 0.2, fz + 0.03], [fx - 0.08, fy + 0.36, fz + 0.06], [fx + 0.05, fy + 0.5, fz + 0.02], [fx - 0.02, fy + 0.6, fz]], 0.05, wood));
    if (a.oar !== 'missing') {
      const oar = new THREE.Group();
      const shaft = s.cylinder(0.026, 0.03, 3.1, [0, 0.55, 0], s.material('#b98b52'), 10);
      const paddle = s.box([0.16, 1.3, 0.03], [0, -1.55, 0], s.material('#b98b52'));
      const band = s.box([0.165, 0.18, 0.034], [0, -1.6, 0], s.material(cloth));
      oar.add(shaft, paddle, band);
      if (a.oar === 'forcola') {
        const top = new THREE.Vector3(fx + 1.25, fy + 1.05, fz - 0.42), tip = new THREE.Vector3(fx - 1.9, -0.12, fz + 0.72);
        oar.position.lerpVectors(top, tip, 0.48);
        oar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(tip).normalize());
      } else {
        oar.position.set(0.3, sheer(0.1) + 0.05, -half(0.1) + 0.12);
        oar.rotation.z = Math.PI / 2 - 0.02;
        oar.rotation.x = 0.2;
      }
      B(oar);
    }

    // Mooring: a rope from the bow, a post, and a patch of canal.
    const rope = s.material('#cdbf98');
    if (a.mooring === 'post') {
      const px = X(0.78), pz = -1.25, lean = (random() - 0.5) * 0.12;
      const post = s.cylinder(0.09, 0.12, 2.6, [px, 0.9, pz], s.material('#6b5a48'), 12);
      post.rotation.z = lean;
      s.cylinder(0.125, 0.13, 0.35, [px, 0.1, pz], s.material('#3f5a35'), 12).rotation.z = lean;
      s.ring(0.11, 0.025, [px, 1.25, pz], rope).rotation.x = Math.PI / 2;
      B(s.tube([[X(0.82), sheer(0.82) + 0.04, -0.1], [X(0.81), sheer(0.82) - 0.1, -0.5], [px + 0.1, 0.95, pz + 0.5], [px, 1.25, pz + 0.1]], 0.02, rope));
    } else if (a.mooring === 'adrift') {
      B(s.tube([[X(0.82), sheer(0.82) + 0.04, 0.1], [X(0.83), 0.5, 0.75], [X(0.86), 0.03, 0.95]], 0.02, rope));
      B(s.tube([[X(0.86), 0.03, 0.95], [X(0.95), 0.03, 1.35], [X(0.8), 0.03, 1.6], [X(0.7), 0.03, 1.3]], 0.02, rope));
    }
    const water = new THREE.MeshStandardMaterial({ color: new THREE.Color('#4f8372').lerp(new THREE.Color('#6c7f58'), mood.wear * 0.6), roughness: 0.24, metalness: 0.12 });
    const pond = s.cylinder(1, 1, .9, [0, -.45, 0], water, 48);
    pond.scale.set(L * .67, 1, 2.3);
    pond.castShadow = false;
    const rippleMaterial = new THREE.MeshBasicMaterial({ color: '#d9ece2', transparent: true, opacity: 0.55, depthWrite: false });
    const ripples = [0, 1, 2].map((n) => {
      const ring = s.ring(1, 0.012, [0, 0.014, 0], rippleMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.castShadow = false;
      ring.userData.phase = n / 3;
      return ring;
    });

    // The solid canal section supplies a stable base while an untied hull rocks gently.
    const energy = mix(0.25, 1.3, mood.energy), phase = random() * 6;
    const update = (_dt: number, time: number) => {
      const t = time + phase;
      boat.position.y = a.mooring === 'post' ? 0 : Math.sin(t * 1.1 * energy) * 0.035 * energy;
      boat.rotation.x = a.mooring === 'post' ? 0 : Math.sin(t * 0.8 * energy) * 0.03 * energy;
      boat.rotation.z = a.mooring === 'post' ? 0 : Math.sin(t * 0.55 * energy + 1) * 0.008 * energy;
      for (const ring of ripples) {
        const f = (t * 0.12 * energy + ring.userData.phase) % 1;
        ring.scale.set(L * (.49 + f * .12), 0.9 + f * 1, 1);
      }
    };
    update(0, 0);
    return s.finish({ footprint: L * .67, update });
  },
});
