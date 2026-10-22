import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const CATCH = {
  grouper: 'Fat red-orange groupers and snappers, the expensive banquet fish.',
  pomfret: 'Round flat silver pomfret laid out like coins.',
  mackerel: 'Slim blue-green mackerel in tight shining rows.',
  croaker: 'Golden-yellow croakers, a cheap family dinner.',
  ribbonfish: 'Long chrome ribbonfish draped across the ice like belts.',
  prawns: 'Heaps of grey-pink prawns with only a few fish at the edges.',
  mixed: 'A bit of everything, whatever the boats brought in.',
} as const;
type Kind = Exclude<keyof typeof CATCH, 'mixed' | 'prawns'>;
const FISH: Record<Kind, { length: number; tall: number; thick: number; colours: string[] }> = {
  grouper: { length: 0.42, tall: 1.25, thick: 1.3, colours: ['#d8452c', '#e56a2e', '#c2331f', '#e8855a'] },
  pomfret: { length: 0.27, tall: 2.1, thick: 0.8, colours: ['#cfd6da', '#b9c3ca', '#e3e8ea'] },
  mackerel: { length: 0.36, tall: 0.75, thick: 1, colours: ['#3f7f8c', '#2f6478', '#5a98a0'] },
  croaker: { length: 0.33, tall: 1, thick: 1, colours: ['#e0b63a', '#d49c2a', '#ecc85a'] },
  ribbonfish: { length: 0.95, tall: 0.42, thick: 0.6, colours: ['#d6dde2', '#c3ccd4', '#eef1f3'] },
};

function fishGeometry() {
  const body = new THREE.SphereGeometry(1, 14, 8).toNonIndexed();
  body.scale(0.4, 0.085, 0.16);
  body.translate(0.09, 0, 0);
  const position = body.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    if (x < 0.05) position.setZ(i, position.getZ(i) * mix(0.28, 1, (x + 0.31) / 0.36));
  }
  const fin = (points: [number, number][], depth: number) => {
    const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2).rotateX(Math.PI / 2);
  };
  const tail = fin([[-0.26, 0], [-0.5, 0.15], [-0.43, 0], [-0.5, -0.15]], 0.02);
  const dorsal = fin([[0.22, -0.13], [-0.02, -0.24], [-0.16, -0.1]], 0.014);
  const merged = mergeGeometries([body, tail, dorsal])!;
  merged.computeVertexNormals();
  const p = merged.getAttribute('position');
  const colours = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    // Lying on its side: back is -z, belly is +z. Belly pale, back and fins darker.
    const shade = p.getX(i) < -0.25 ? 0.6 : mix(0.62, 1.1, THREE.MathUtils.clamp((p.getZ(i) + 0.16) / 0.3, 0, 1));
    colours.set([shade, shade, shade], i * 3);
  }
  merged.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return merged;
}

function card(lines: string[], paper: string, ink: string, slash: boolean, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 160; canvas.height = 120;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper; ctx.fillRect(0, 0, 160, 120);
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineCap = 'round';
  // Brush marks standing in for the name of the fish.
  ctx.lineWidth = 5;
  for (let g = 0; g < 3; g++) for (let k = 0; k < 4; k++) {
    const x = 22 + g * 44, y = 8;
    ctx.beginPath(); ctx.moveTo(x + random() * 30, y + random() * 30); ctx.lineTo(x + random() * 30, y + random() * 30); ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${lines[0].length > 4 ? 44 : 62}px sans-serif`;
  ctx.save(); ctx.translate(80, 82); ctx.rotate((random() - 0.5) * 0.14); ctx.fillText(lines[0], 0, 0, 150);
  if (slash) { ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-66, 14); ctx.lineTo(66, -16); ctx.stroke(); }
  ctx.restore();
  if (lines[1]) { ctx.font = '900 30px sans-serif'; ctx.fillStyle = '#12161a'; ctx.fillText(lines[1], 118, 104, 80); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    catch: choice('What is the catch on the ice today?', CATCH),
    sold: score('How much has already sold?', ['Just laid out, every row full', 'A few gaps', 'Half gone', 'Picked over, the dregs', 'Nearly bare ice at closing']),
    lamps: choice('How many red lamps hang over the counter?', {
      two: 'Two lamps, a small family pitch.',
      three: 'Three lamps, an ordinary stall.',
      four: 'Four lamps, a proud bright counter.',
      six: 'Six lamps crowded together, a blaze of red glare.',
    }),
    flapping: noul('Is one fish still alive and flapping on the ice?'),
    tank: choice('What holds the live fish beside the counter?', {
      glass: 'A glass aquarium on a steel stand, bubbling, fish circling.',
      tub: 'A big blue plastic tub on the floor with an air hose.',
      foam: 'A white polystyrene box of water propped on a crate.',
      none: 'Nothing: everything here is already on ice.',
    }),
    cards: choice('What do the price cards stuck in the ice say?', {
      cheap: 'Low prices in fat red marker on white foam card.',
      dear: 'High prices on fluorescent yellow card, take it or leave it.',
      slashed: 'Prices crossed out and rewritten lower, end of the morning.',
      none: 'No cards. You ask, she tells you, the price depends on you.',
    }),
    now: choice('What is happening at the stall right now?', {
      waiting: 'Nothing yet: everything arranged and untouched, waiting for the first customer.',
      cutting: 'A fish has just been cut: a board with a halved fish and blood running into the ice.',
      hosing: 'The counter is being hosed down, water sheeting off the front and pooling on the floor.',
      sold: 'A sale just made: a red bag tied and waiting on the edge, coins in a tin.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const W = 2.2, SLOPE = 0.25, D = 0.92;
    const steel = s.material('#c3cacc', { metalness: 0.7, roughness: mix(0.25, 0.55, mood.wear) });
    const dark = s.material('#3b4144', { metalness: 0.4, roughness: 0.6 });
    const red = s.material('#d3202a', { roughness: 0.4, emissive: '#b0141c', emissiveIntensity: mix(0.25, 0.6, mood.cheer), side: THREE.DoubleSide });
    const hoseGreen = s.material('#3f9a5a', { roughness: 0.5 });
    const wet = new THREE.MeshStandardMaterial({ color: '#7d959c', roughness: 0.08, metalness: 0.5, transparent: true, opacity: 0.4, depthWrite: false });
    const blood = s.material('#8e1a1e', { roughness: 0.3 });

    // Frame: four legs, a front apron, a gutter and a bucket under the drain.
    for (const x of [-1, 1]) {
      s.box([0.05, 0.98, 0.05], [x * (W / 2 - 0.04), 0.49, -D / 2 + 0.04], steel);
      s.box([0.05, 0.76, 0.05], [x * (W / 2 - 0.04), 0.38, D / 2 - 0.04], steel);
      s.box([0.04, 0.04, D - 0.1], [x * (W / 2 - 0.04), 0.25, 0], steel);
    }
    s.box([W - 0.1, 0.04, 0.04], [0, 0.25, -D / 2 + 0.04], steel);
    s.box([W, 0.2, 0.02], [0, 0.66, D / 2 - 0.01], steel);
    s.box([W, 0.05, 0.08], [0, 0.735, D / 2 + 0.04], dark);
    s.cylinder(0.14, 0.11, 0.26, [W / 2 - 0.3, 0.13, D / 2 - 0.16], s.material(pick(['#2b6fb0', '#c2412e', '#e7e2d2'])), 16);

    const tray = new THREE.Group();
    tray.position.set(0, 0.9, 0);
    tray.rotation.x = SLOPE;
    s.root.add(tray);
    const put = <T extends THREE.Object3D>(object: T) => { tray.add(object); return object; };
    put(s.box([W, 0.03, D + 0.06], [0, -0.015, 0], steel));
    put(s.box([W, 0.1, 0.025], [0, 0.04, -D / 2 - 0.02], steel));
    for (const x of [-1, 1]) put(s.box([0.025, 0.1, D + 0.06], [x * W / 2, 0.04, 0], steel));
    put(s.box([W, 0.05, 0.025], [0, 0.02, D / 2 + 0.02], steel));

    // Crushed ice: a slab that slumps as the morning goes, and loose chunks over it.
    const melt = Math.max(a.sold * 0.6, a.now === 'hosing' ? 0.4 : 0);
    const iceTop = mix(0.075, 0.03, melt);
    const ice = s.material('#eef6f8', { roughness: 0.35, emissive: '#ff6a5a', emissiveIntensity: 0.06 });
    put(s.box([W - 0.04, iceTop, D], [0, iceTop / 2, 0], ice));
    const chunks: { at: [number, number, number]; size: number; color: string }[] = [];
    for (let i = 0; i < 300; i++) chunks.push({ at: [(random() - 0.5) * (W - 0.1), iceTop + random() * 0.012, (random() - 0.5) * (D - 0.06)], size: mix(0.014, 0.034, random()) * mix(1, 0.6, melt), color: pick(['#ffffff', '#e3f0f4', '#f6fbfc', '#d6e8ee']) });
    put(s.scatter(new THREE.IcosahedronGeometry(1, 0), ice, chunks));

    // The catch.
    const geometry = fishGeometry();
    const keep = mix(1, 0.06, a.sold) * mix(0.85, 1, mood.density);
    const kinds = Object.keys(FISH) as Kind[];
    const lie: { kind: Kind; x: number; z: number; turn: number; size: number }[] = [];
    const boardAt = a.now === 'cutting' ? -W / 2 + 0.3 : null;
    const row = (kind: Kind, z: number, from: number, to: number) => {
      const f = FISH[kind];
      const pitch = kind === 'ribbonfish' ? f.length * 0.95 : f.length * f.tall * 0.4 + 0.035;
      for (let x = from + pitch / 2; x < to - pitch / 2 + 0.001; x += pitch) {
        if (random() > keep) continue;
        if (boardAt !== null && x < boardAt + 0.28 && z > -0.1) continue;
        lie.push({ kind, x: x + (random() - 0.5) * 0.02, z: z + (random() - 0.5) * 0.03, turn: (kind === 'ribbonfish' ? Math.PI : -Math.PI / 2) + (random() - 0.5) * mix(0.12, 0.5, a.sold), size: mix(0.88, 1.12, random()) });
      }
    };
    const span = W / 2 - 0.06;
    if (a.catch === 'ribbonfish') for (let i = 0; i < 9; i++) row('ribbonfish', -0.38 + i * 0.095, -span, span);
    else if (a.catch === 'mixed') {
      const blocks = [-span, -span * 0.45, span * 0.1, span * 0.55, span];
      for (let b = 0; b < 4; b++) {
        const kind = pick(kinds.filter((k) => k !== 'ribbonfish'));
        for (const z of FISH[kind].length < 0.3 ? [-0.3, -0.02, 0.26] : [-0.22, 0.2]) row(kind, z, blocks[b] + 0.03, blocks[b + 1] - 0.03);
      }
    } else if (a.catch === 'prawns') {
      row(pick(['croaker', 'mackerel'] as const), -0.24, -span, -span * 0.45);
      row('pomfret', 0.22, span * 0.5, span);
    } else for (const z of FISH[a.catch].length < 0.3 ? [-0.3, -0.02, 0.26] : [-0.22, 0.2]) row(a.catch, z, -span, span);
    if (lie.length === 0 && a.catch !== 'prawns') lie.push({ kind: a.catch === 'mixed' ? 'croaker' : a.catch, x: span * (random() - 0.5), z: 0.15, turn: -1.2, size: 1 });

    const skin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.35 });
    const fish = new THREE.InstancedMesh(geometry, skin, Math.max(lie.length, 1));
    const eyes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#15181a', roughness: 0.2 }), Math.max(lie.length, 1));
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), eye = new THREE.Vector3();
    fish.count = eyes.count = lie.length;
    lie.forEach((one, index) => {
      const f = FISH[one.kind], length = f.length * one.size;
      q.setFromEuler(new THREE.Euler((random() - 0.5) * 0.12, one.turn, 0));
      matrix.compose(new THREE.Vector3(one.x, iceTop + 0.085 * length * f.thick * 0.8, one.z), q, new THREE.Vector3(length, length * f.thick, length * f.tall));
      fish.setMatrixAt(index, matrix);
      fish.setColorAt(index, new THREE.Color(pick(f.colours)).offsetHSL(0, 0, (random() - 0.5) * 0.06));
      eye.set(0.37, 0.075, -0.03).applyMatrix4(matrix);
      eyes.setMatrixAt(index, new THREE.Matrix4().makeScale(0.011, 0.011, 0.011).setPosition(eye));
    });
    fish.castShadow = fish.receiveShadow = true;
    put(fish); put(eyes);

    if (a.catch === 'prawns') {
      const curl = new THREE.TorusGeometry(0.03, 0.011, 5, 8, Math.PI * 1.25);
      const pink = new THREE.MeshStandardMaterial({ roughness: 0.4 });
      const heaps = [-0.35, 0.25, 0.75].filter(() => random() < keep + 0.25);
      const total = Math.round(heaps.length * 90 * Math.max(keep, 0.15));
      const prawns = new THREE.InstancedMesh(curl, pink, Math.max(total, 1));
      prawns.count = total;
      for (let i = 0; i < total; i++) {
        const heap = heaps[i % heaps.length], r = Math.sqrt(random()) * 0.24, t = random() * Math.PI * 2;
        q.setFromEuler(new THREE.Euler(random() * 3, random() * 6, random() * 3));
        matrix.compose(new THREE.Vector3(heap + Math.cos(t) * r, iceTop + 0.02 + (0.24 - r) * 0.42 * Math.max(keep, 0.3), Math.sin(t) * r * 1.2), q, new THREE.Vector3(1, 1, 1));
        prawns.setMatrixAt(i, matrix);
        prawns.setColorAt(i, new THREE.Color(pick(['#d9a79a', '#b7a6a2', '#e7b8a4', '#9fa3a6', '#f0c4b0'])));
      }
      prawns.castShadow = true;
      put(prawns);
    }

    // One still alive.
    let flapper: THREE.Mesh | null = null;
    if (a.flapping) {
      const kind = a.catch === 'mixed' || a.catch === 'prawns' || a.catch === 'ribbonfish' ? 'grouper' : a.catch;
      const f = FISH[kind];
      flapper = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, color: f.colours[0], roughness: 0.2, metalness: 0.35 }));
      const length = f.length * 1.2;
      flapper.scale.set(length, length * f.thick, length * f.tall);
      flapper.position.set(mix(-0.5, 0.5, random()), iceTop + 0.1, D / 2 - 0.12);
      flapper.rotation.set(0, 0.3 + random() * 0.5, 0.35);
      flapper.castShadow = true;
      put(flapper);
      put(s.ball([0.013, 0.013, 0.013], [0, 0, 0], eyes.material as THREE.Material, 8)).position.copy(eye.set(0.37, 0.075, -0.03).applyMatrix4(flapper.updateMatrix() ?? flapper.matrix));
      const spray = Array.from({ length: 14 }, () => ({ at: [flapper!.position.x + (random() - 0.5) * 0.5, 0.012, D / 2 + 0.08 + random() * 0.16] as [number, number, number], size: 0.02 + random() * 0.015 }));
      s.scatter(new THREE.IcosahedronGeometry(1, 0), ice, spray);
    }

    // Price cards on sticks.
    if (a.cards !== 'none') {
      const count = a.catch === 'mixed' ? 4 : 2 + Math.floor(random() * 2);
      for (let i = 0; i < count; i++) {
        const price = a.cards === 'dear' ? pick(['$128', '$168', '$220', '$98']) : a.cards === 'slashed' ? pick(['$60', '$45', '$80']) : pick(['$18', '$25', '$3x10', '$32']);
        const second = a.cards === 'slashed' ? pick(['$30', '$20', '$38']) : '';
        const map = card([price, second], a.cards === 'dear' ? '#f3ee3a' : pick(['#f7f5ee', '#f3e9c8']), a.cards === 'dear' ? '#16181c' : '#d01f26', a.cards === 'slashed', random);
        const x = mix(-span + 0.2, span - 0.2, (i + 0.5) / count) + (random() - 0.5) * 0.1;
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.012), [0, 1, 2, 3, 4, 5].map((face) => new THREE.MeshStandardMaterial(face === 4 ? { map, roughness: 0.8 } : { color: '#efece2', roughness: 0.9 })));
        sign.position.set(x, iceTop + 0.2, -0.36 + random() * 0.08);
        sign.rotation.set(-SLOPE - 0.12, (random() - 0.5) * 0.3, (random() - 0.5) * 0.2);
        sign.castShadow = true;
        put(sign);
        put(s.rod([x, iceTop, sign.position.z], [x, iceTop + 0.14, sign.position.z - 0.01], 0.006, s.material('#b9966a')));
      }
    }

    // The red lamps on a pipe rail.
    const railY = 2.05, railZ = 0.08;
    for (const x of [-1, 1]) {
      s.box([0.045, railY - 0.9, 0.045], [x * (W / 2 - 0.04), (railY + 0.98) / 2 + 0.04, -D / 2 + 0.04], steel);
      s.rod([x * (W / 2 - 0.04), railY, -D / 2 + 0.04], [x * (W / 2 - 0.04), railY, railZ], 0.018, steel);
    }
    s.rod([-W / 2 + 0.04, railY, railZ], [W / 2 - 0.04, railY, railZ], 0.018, steel);
    const lampCount = { two: 2, three: 3, four: 4, six: 6 }[a.lamps];
    const dead = mood.wear > 0.6 ? Math.floor(random() * lampCount) : -1;
    const glow = new THREE.Color().setHSL(mix(0.11, 0.05, mood.warmth), 1, 0.62);
    const lamps: { group: THREE.Group; phase: number }[] = [];
    const shade = new THREE.LatheGeometry([[0.035, 0.17], [0.05, 0.16], [0.09, 0.1], [0.2, 0], [0.205, -0.012]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
    for (let i = 0; i < lampCount; i++) {
      const x = mix(-W / 2 + 0.28, W / 2 - 0.28, lampCount === 1 ? 0.5 : i / (lampCount - 1)) + (random() - 0.5) * 0.06;
      const drop = mix(0.38, 0.55, random());
      const group = new THREE.Group();
      group.position.set(x, railY, railZ);
      const add = (mesh: THREE.Mesh, y: number) => { mesh.position.y = y; mesh.castShadow = true; group.add(mesh); };
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, drop, 6), dark), -drop / 2);
      add(new THREE.Mesh(shade, red), -drop - 0.17);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.06, 10), dark), -drop - 0.02);
      const lit = i !== dead;
      add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), new THREE.MeshStandardMaterial({ color: lit ? '#fff3d0' : '#8e8a80', emissive: lit ? glow : new THREE.Color('#000000'), emissiveIntensity: mix(1.6, 3, mood.cheer), roughness: 0.3 })), -drop - 0.15);
      if (lit) {
        const pool = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), new THREE.MeshBasicMaterial({ color: '#ff5a3c', transparent: true, opacity: 0.11, depthWrite: false }));
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(x, iceTop + 0.05, railZ - 0.05);
        put(pool);
      }
      group.rotation.z = (random() - 0.5) * 0.08;
      s.root.add(group);
      lamps.push({ group, phase: random() * 6 });
    }
    // A bunch of red carrier bags on the left post.
    for (let i = 0; i < 4; i++) s.ball([0.07, 0.16, 0.035], [-W / 2 - 0.02 + i * 0.012, 1.42 - i * 0.02, -D / 2 + 0.1 + i * 0.03], s.material(pick(['#d9262e', '#e23a36', '#c81e28']), { roughness: 0.35 }), 10).rotation.z = (random() - 0.5) * 0.3;

    // Live tank to the right.
    const tx = W / 2 + 0.48;
    const bubbles: THREE.Mesh[] = [];
    const water = new THREE.MeshStandardMaterial({ color: '#4fa6a6', roughness: 0.1, transparent: true, opacity: 0.5, depthWrite: false });
    const swimmer = (x: number, y: number, z: number, length: number, turn: number, flat = false) => {
      const mesh = s.mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, color: pick(['#5b6468', '#8a4a36', '#6f7a5a', '#3f4a50']), roughness: 0.4 }), [x, y, z]);
      mesh.scale.setScalar(length);
      mesh.rotation.set(flat ? 0 : -Math.PI / 2, turn, 0);
      return mesh;
    };
    const bubbleColumn = (x: number, y0: number, y1: number, z: number) => {
      for (let i = 0; i < 6; i++) {
        const bubble = s.ball([0.012, 0.012, 0.012], [x + (random() - 0.5) * 0.03, mix(y0, y1, random()), z], s.material('#f4fbfb', { roughness: 0.1 }), 6);
        bubble.userData = { y0, y1, speed: mix(0.15, 0.3, random()) };
        bubbles.push(bubble);
      }
    };
    if (a.tank === 'glass') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.035, 0.62, 0.035], [tx + x * 0.3, 0.31, z * 0.2], steel);
      s.box([0.68, 0.03, 0.46], [tx, 0.63, 0], steel);
      s.box([0.66, 0.44, 0.44], [tx, 0.87, 0], new THREE.MeshStandardMaterial({ color: '#dff0f0', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false }));
      s.box([0.64, 0.36, 0.42], [tx, 0.83, 0], water);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.025, 0.46, 0.025], [tx + x * 0.33, 0.87, z * 0.22], dark);
      for (const y of [0.655, 1.09]) { for (const z of [-1, 1]) s.box([0.68, 0.025, 0.025], [tx, y, z * 0.22], dark); for (const x of [-1, 1]) s.box([0.025, 0.025, 0.46], [tx + x * 0.33, y, 0], dark); }
      for (let i = 0; i < 3 + Math.floor(random() * 3); i++) swimmer(tx + (random() - 0.5) * 0.36, 0.72 + random() * 0.22, (random() - 0.5) * 0.24, 0.2 + random() * 0.08, random() < 0.5 ? 0 : Math.PI);
      bubbleColumn(tx + 0.24, 0.68, 1.0, -0.12);
      s.tube([[tx + 0.24, 0.68, -0.12], [tx + 0.26, 1.12, -0.2], [tx + 0.3, 0.9, -0.3], [tx + 0.3, 0.05, -0.3]], 0.008, hoseGreen);
    } else if (a.tank === 'tub') {
      s.lathe([[0.3, 0], [0.38, 0.34], [0.4, 0.36], [0.36, 0.34], [0.29, 0.03], [0, 0.03]], s.material('#2a72c4', { roughness: 0.4, side: THREE.DoubleSide }), [tx, 0, 0.1]);
      const surface = s.cylinder(0.355, 0.355, 0.01, [tx, 0.27, 0.1], water, 24);
      surface.castShadow = false;
      for (let i = 0; i < 4; i++) swimmer(tx + (random() - 0.5) * 0.36, 0.265, 0.1 + (random() - 0.5) * 0.36, 0.24, random() * 6, true);
      bubbleColumn(tx - 0.15, 0.27, 0.3, 0.0);
      s.tube([[tx - 0.15, 0.25, 0], [tx - 0.3, 0.42, -0.2], [tx - 0.4, 0.2, -0.36], [tx - 0.45, 0.02, -0.4]], 0.008, hoseGreen);
    } else if (a.tank === 'foam') {
      const crate = s.material(pick(['#c9372c', '#2f6fb3', '#e0a52a']), { roughness: 0.6 });
      s.box([0.56, 0.3, 0.4], [tx, 0.15, 0], crate);
      for (let i = 0; i < 5; i++) s.box([0.57, 0.02, 0.41], [tx, 0.04 + i * 0.055, 0], dark).scale.set(1, 0.4, 1);
      const foam = s.material('#f3f3ee', { roughness: 0.95 });
      s.box([0.66, 0.3, 0.46], [tx, 0.45, 0], foam);
      s.box([0.58, 0.02, 0.38], [tx, 0.6, 0], s.material('#3d8f95', { roughness: 0.1 }));
      for (let i = 0; i < 3; i++) swimmer(tx + (random() - 0.5) * 0.3, 0.612, (random() - 0.5) * 0.2, 0.22, random() * 6, true);
      const lid = s.box([0.66, 0.04, 0.46], [tx + 0.36, 0.3, -0.12], foam);
      lid.rotation.z = -1.25;
      bubbleColumn(tx + 0.2, 0.61, 0.64, 0.1);
    }

    // What is going on right now.
    const tapX = -W / 2 - 0.05;
    if (a.now === 'hosing') {
      s.tube([[tapX, 1.3, -D / 2], [tapX - 0.1, 0.9, -0.2], [tapX + 0.1, 1.05, 0.2], [-0.7, 1.02, 0.3], [-0.5, 0.95, 0.2]], 0.016, hoseGreen);
      const sheet = s.box([W * 0.8, 0.012, 0.6], [0, 0.4, D / 2 + 0.06], wet);
      sheet.rotation.x = Math.PI / 2; sheet.castShadow = false;
      const puddle = s.cylinder(1, 1, 0.006, [0.1, 0.004, D / 2 + 0.35], wet, 28);
      puddle.scale.set(1.1, 1, 0.45); puddle.castShadow = false;
    } else {
      for (let i = 0; i < 4; i++) s.ring(0.13 + (i % 2) * 0.012, 0.016, [tapX - 0.02 - i * 0.022, 1.2, -D / 2 + 0.04], hoseGreen).rotation.y = Math.PI / 2;
      s.rod([tapX - 0.06, 1.1, -D / 2 + 0.04], [tapX - 0.07, 0.7, -D / 2 + 0.1], 0.016, hoseGreen);
      s.cylinder(0.014, 0.02, 0.07, [tapX - 0.07, 0.67, -D / 2 + 0.1], s.material('#d0a030', { metalness: 0.6 }), 8);
    }
    if (a.now === 'cutting') {
      const bx = boardAt!;
      put(s.box([0.42, 0.045, 0.3], [bx, iceTop + 0.03, 0.2], s.material('#c9a06a', { roughness: 0.8 })));
      const flesh = s.material('#e9a79a', { roughness: 0.5 });
      const head = put(s.ball([0.08, 0.035, 0.06], [bx - 0.08, iceTop + 0.08, 0.2], s.material('#c2331f', { roughness: 0.3 }), 12));
      put(s.cylinder(0.055, 0.055, 0.012, [bx - 0.02, iceTop + 0.075, 0.2], flesh, 12)).rotation.z = Math.PI / 2;
      put(s.ball([0.1, 0.03, 0.055], [bx + 0.09, iceTop + 0.075, 0.24], flesh, 12));
      head.rotation.y = 0.2;
      const cleaver = put(s.box([0.2, 0.004, 0.09], [bx + 0.05, iceTop + 0.06, 0.08], steel));
      cleaver.rotation.y = 0.5;
      put(s.rod([bx + 0.13, iceTop + 0.06, 0.02], [bx + 0.22, iceTop + 0.06, -0.03], 0.014, s.material('#5a3d28')));
      put(s.cylinder(0.14, 0.17, 0.004, [bx + 0.12, iceTop + 0.004, 0.42], blood, 14)).scale.set(1.4, 1, 0.5);
      for (let i = 0; i < 5; i++) put(s.ball([0.02 + random() * 0.03, 0.003, 0.02 + random() * 0.02], [bx + (random() - 0.3) * 0.5, iceTop + 0.012, 0.1 + random() * 0.34], blood, 8));
      s.rod([bx + 0.1, 0.74, D / 2 + 0.03], [bx + 0.1, 0.58, D / 2 + 0.012], 0.01, blood, 0.004);
    }
    if (a.now === 'sold') {
      const bx = W / 2 - 0.5;
      const bag = s.ball([0.11, 0.1, 0.09], [bx, 0.84, D / 2 + 0.02], s.material('#dc2a30', { roughness: 0.3, transparent: true, opacity: 0.92 }), 14);
      bag.rotation.z = 0.15;
      for (const side of [-1, 1]) s.rod([bx + side * 0.02, 0.92, D / 2 + 0.02], [bx + side * 0.05, 1.0, D / 2 + 0.02], 0.012, s.material('#dc2a30'), 0.004);
      s.cylinder(0.06, 0.06, 0.07, [bx - 0.35, 0.8, D / 2 + 0.04], s.material('#b9b3a2', { metalness: 0.6, roughness: 0.4 }), 12);
    }
    // Meltwater under the stall grows through the morning.
    const drip = s.cylinder(1, 1, 0.005, [-0.2, 0.003, 0.1], wet, 24);
    drip.scale.set(mix(0.4, 1.2, melt), 1, mix(0.2, 0.55, melt)); drip.castShadow = false;

    const energy = mood.energy;
    return s.finish({
      update(dt, time) {
        for (const lamp of lamps) lamp.group.rotation.x = Math.sin(time * 1.3 + lamp.phase) * 0.035 * mix(0.3, 1.5, energy);
        for (const bubble of bubbles) {
          const { y0, y1, speed } = bubble.userData as { y0: number; y1: number; speed: number };
          bubble.position.y += dt * speed * mix(0.5, 1.6, energy);
          if (bubble.position.y > y1) bubble.position.y = y0;
        }
        if (flapper) {
          const burst = Math.max(0, Math.sin(time * mix(0.9, 2.2, energy)));
          flapper.rotation.z = 0.35 + Math.sin(time * 26) * 0.5 * burst;
          flapper.position.y = iceTop + 0.1 + Math.abs(Math.sin(time * 26)) * 0.04 * burst;
        }
      },
    });
  },
});
