import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Profile = readonly (readonly [number, number])[]; // [half-width, height above the church floor], bottom to top
interface Piece { profile: Profile; sides: number; material: THREE.Material; x?: number; z?: number; main?: boolean; cap?: boolean }

const CLIP = -0.9;

function clipProfile(profile: Profile, low: number, high: number) {
  const out: [number, number][] = [];
  for (let i = 0; i < profile.length; i++) {
    const [r, y] = profile[i];
    if (i > 0) {
      const [pr, py] = profile[i - 1];
      for (const edge of [low, high]) if ((py < edge && y > edge) || (py > edge && y < edge)) { const t = (edge - py) / (y - py); out.push([mix(pr, r, t), edge]); }
    }
    if (y >= low && y <= high) out.push([r, y]);
  }
  return out;
}

function clipPolygon(points: readonly (readonly [number, number])[], low: number) {
  const out: [number, number][] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    if (a[1] >= low) out.push([a[0], a[1]]);
    if ((a[1] < low) !== (b[1] < low)) { const t = (low - a[1]) / (b[1] - a[1]); out.push([mix(a[0], b[0], t), low]); }
  }
  return out;
}

export default defineThing({
  questions: {
    exposed: score('How much of the church stands out of the water?', ['Only the cross and the last metre of the spire', 'The spire, the belfry just awash', 'The whole bell stage and some tower', 'The tower and the whole nave roof, in a drought']),
    style: choice('What kind of church was it?', {
      gothic: 'An English-looking parish church: grey stone, a tall slate needle spire, corner pinnacles, a weathercock.',
      romanesque: 'An Alpine Romanesque tower: rough pale stone, twin-arched bell openings, a steep four-sided red spire.',
      baroque: 'A Catholic village tower in ochre plaster with a green copper onion helm.',
      orthodox: 'A whitewashed Orthodox belfry with an onion dome and a three-barred cross.',
      wooden: 'A white clapboard meeting-house steeple with louvres and a shingled spike.',
    }),
    bell: noul('If the belfry shows, is the bell still hanging in it?'),
    clings: choice('What clings to it?', {
      nothing: 'Nothing. Bare stone and its tide lines.',
      weed: 'Waterweed, mussels and a floating mat of green at the waterline.',
      birds: 'Gulls: perched on every ledge and turning overhead.',
      boat: 'A rowing boat, tied up to the stonework by someone who has climbed inside.',
      offerings: 'Offerings: a wreath hung on the wall and candles set floating on the water.',
    }),
    water: choice('What is the water like?', {
      still: 'Dark and glass-still.',
      choppy: 'Grey, with rings of chop spreading from the walls.',
      ice: 'Frozen white; you could walk out to it.',
      mudflat: 'So low that a cracked mud bank has surfaced around the walls.',
    }),
    lean: score('Does it stand straight?', ['Perfectly plumb', 'A little off true', 'Leaning as though it will go this winter']),
    light: noul('If the belfry shows, is a light burning in it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const TOP = { gothic: 34, romanesque: 31, baroque: 30.2, orthodox: 28.8, wooden: 31 }[a.style];
    const W = mix(TOP - 0.9, 8.5, a.exposed);          // water level in church heights
    const naveOut = W < 13.6;
    const R = naveOut ? 11.5 : mix(5.5, 8, a.exposed);

    const wallTone = { gothic: '#a49c8a', romanesque: '#c2b8a4', baroque: '#dcc188', orthodox: '#e9e6dc', wooden: '#ecebe4' }[a.style];
    const roofTone = { gothic: '#55616b', romanesque: '#a2553d', baroque: '#5f9c86', orthodox: mood.cheer > 0.45 ? '#d6a935' : '#3f6fa3', wooden: '#4d463f' }[a.style];
    const flat = (color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) => {
      const tint = new THREE.Color(color).lerp(new THREE.Color('#7d7868'), mood.wear * 0.3);
      return new THREE.MeshStandardMaterial({ color: tint, roughness: 0.9, side: THREE.DoubleSide, ...extra });
    };
    const wall = flat(wallTone), roof = flat(roofTone, a.style === 'orthodox' || a.style === 'baroque' ? { metalness: 0.35, roughness: 0.5 } : {});
    const trim = flat(new THREE.Color(wallTone).multiplyScalar(0.86));
    const gold = flat('#d2a53a', { metalness: 0.5, roughness: 0.4 });
    const dark = flat('#23282b');
    const wetStain = flat('#3d4a3a', { roughness: 1 }), paleStain = flat('#e6e0cc', { roughness: 1 }), brownStain = flat('#6f6650', { roughness: 1 });

    const church = new THREE.Group();
    church.rotation.z = (a.lean * 0.11 + 0.004) * (random() > 0.5 ? 1 : -1);
    if (naveOut) { church.rotation.y = 0.75; church.position.set(4.2 * Math.sin(0.75), 0, 4.2 * Math.cos(0.75)); }
    s.root.add(church);

    const emit = (piece: Piece, low = W + CLIP, high = 99, grow = 0) => {
      const cut = clipProfile(piece.profile, low, high);
      if (cut.length < 2) return null;
      const stretch = piece.sides <= 8 ? 1 / Math.cos(Math.PI / piece.sides) : 1;
      const points = cut.map(([r, y]) => new THREE.Vector2((r + grow) * stretch, y - W));
      if (piece.cap !== false && grow === 0) points.push(new THREE.Vector2(0, points[points.length - 1].y));
      let geometry: THREE.BufferGeometry = new THREE.LatheGeometry(points, piece.sides);
      if (piece.sides <= 8) { geometry = geometry.toNonIndexed(); geometry.computeVertexNormals(); geometry.rotateY(Math.PI / piece.sides); }
      const mesh = new THREE.Mesh(geometry, grow ? piece.material : piece.material);
      mesh.position.set(piece.x ?? 0, 0, piece.z ?? 0);
      mesh.castShadow = mesh.receiveShadow = true;
      church.add(mesh);
      return mesh;
    };

    // Tower, bell stage and spire as stacked prisms measured from the church floor.
    const hw = a.style === 'wooden' ? 2.2 : 2.5;
    const pieces: Piece[] = [
      { profile: [[hw, 0], [hw, 16]], sides: 4, material: wall, main: true },
      { profile: [[hw + 0.2, 16], [hw + 0.2, 16.3]], sides: 4, material: trim, main: true },
      { profile: [[hw, 19.3], [hw, 20]], sides: 4, material: wall, main: true },
      { profile: [[hw + 0.3, 20], [hw + 0.3, 20.3]], sides: 4, material: trim, main: true },
    ];
    for (const x of [-1, 1]) for (const z of [-1, 1]) pieces.push({ profile: [[0.5, 16.3], [0.5, 19.3]], sides: 4, material: wall, x: x * (hw - 0.5), z: z * (hw - 0.5) });
    if (a.style === 'romanesque' || a.style === 'baroque') for (const [x, z] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) pieces.push({ profile: [[0.13, 16.3], [0.13, 19.3]], sides: 8, material: trim, x: x * (hw - 0.15), z: z * (hw - 0.15) });
    if (a.style === 'gothic') {
      pieces.push({ profile: [[2.7, 20.3], [0.08, TOP]], sides: 8, material: roof, main: true });
      for (const x of [-1, 1]) for (const z of [-1, 1]) pieces.push({ profile: [[0.42, 20.3], [0.42, 21.6], [0, 23.6]], sides: 4, material: trim, x: x * 2.3, z: z * 2.3 });
    } else if (a.style === 'romanesque') {
      pieces.push({ profile: [[2.8, 20.3], [0.05, TOP]], sides: 4, material: roof, main: true });
    } else if (a.style === 'baroque') {
      pieces.push({ profile: [[2.7, 20.3], [3, 21.2], [2.7, 22.5], [1.4, 23.5], [1.05, 24.2]], sides: 8, material: roof, main: true });
      pieces.push({ profile: [[0.95, 24.2], [0.95, 25.5]], sides: 8, material: wall, main: true });
      pieces.push({ profile: [[1.2, 25.5], [1.45, 26.2], [1.1, 27.1], [0.35, 28.2], [0.08, TOP]], sides: 8, material: roof, main: true });
    } else if (a.style === 'orthodox') {
      pieces.push({ profile: [[1.8, 20.3], [1.8, 22.4]], sides: 8, material: wall, main: true });
      pieces.push({ profile: [[1.9, 22.4], [2.6, 23.4], [2.55, 24.5], [1.7, 25.9], [0.6, 27.2], [0.08, TOP]], sides: 24, material: roof, main: true });
    } else {
      pieces.push({ profile: [[1.6, 20.3], [1.6, 22.6]], sides: 4, material: wall, main: true });
      pieces.push({ profile: [[1.75, 22.6], [1.75, 22.85]], sides: 4, material: trim, main: true });
      pieces.push({ profile: [[1.55, 22.85], [0.05, TOP]], sides: 8, material: roof, main: true });
    }
    for (const piece of pieces) emit(piece);

    // Tide lines: a wet band at the surface and paler rings from higher levels.
    const bands: [number, number, THREE.Material][] = [[-0.5, 0.55, wetStain], [0.55, 0.75, brownStain], [1.5, 1.72, paleStain], [2.9, 3.05, paleStain]];
    if (mood.wear > 0.4) bands.push([4.3, 4.42, brownStain]);
    for (const [low, high, material] of bands)
      for (const piece of pieces) if (piece.main) emit({ ...piece, material, cap: false }, W + low, W + high, 0.035);
    const widthAt = (height: number) => {
      let best = { r: 0.1, sides: 8 };
      for (const piece of pieces) {
        if (!piece.main) continue;
        const cut = clipProfile(piece.profile, height - 0.01, height + 0.01);
        if (cut.length && cut[0][0] > best.r) best = { r: cut[0][0], sides: piece.sides };
      }
      return best;
    };
    const shore = widthAt(W);
    const onWall = (height: number, out = 0.05): [number, number, number, number] => {
      const here = widthAt(W + height);
      const face = Math.floor(random() * 4), along = (random() - 0.5) * 2 * here.r * (here.sides === 4 ? 0.9 : 0.4);
      const [nx, nz] = [[0, 1], [1, 0], [0, -1], [-1, 0]][face];
      return [nx * (here.r + out) + nz * along, height, nz * (here.r + out) + nx * along, Math.atan2(nx, nz)];
    };

    // Louvres and slit windows.
    const slat = (x: number, y: number, z: number, w: number, h: number, turn: number) => {
      if (y - W < 0.1) return;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), dark);
      mesh.position.set(x, y - W, z); mesh.rotation.y = turn; mesh.castShadow = true; church.add(mesh);
    };
    for (const [nx, nz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const turn = Math.atan2(nx, nz);
      if (a.style === 'gothic' || a.style === 'wooden') for (let i = 0; i < 5; i++) slat(nx * (hw - 0.12), 16.75 + i * 0.55, nz * (hw - 0.12), (hw - 1) * 2, 0.1, turn);
      slat(nx * (hw + 0.01), 12.6, nz * (hw + 0.01), 0.5, 2.2, turn);
      slat(nx * (hw + 0.01), 8, nz * (hw + 0.01), 0.5, 1.8, turn);
    }

    // The bell and the light.
    if (a.bell && 18.7 - W > 0.6) {
      emit({ profile: [[0.85, 17], [0.78, 17.25], [0.55, 17.7], [0.45, 18.3], [0.25, 18.6]], sides: 16, material: flat('#8f7038', { metalness: 0.5, roughness: 0.45 }) });
      const stock = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 - 0.4, 0.3, 0.3), flat('#4b3a28'));
      stock.position.y = 18.8 - W; church.add(stock);
    }
    const flames: THREE.MeshStandardMaterial[] = [];
    if (a.light && 17.6 - W > 0.3) {
      const glow = new THREE.MeshStandardMaterial({ color: '#fff0b0', emissive: '#ffb640', emissiveIntensity: 2.2 });
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), glow);
      lamp.position.set(hw - 1.1, 17.6 - W, hw - 0.9); church.add(lamp);
      flames.push(glow);
    }

    // The nave behind the tower, when the water is low enough to show it.
    if (naveOut) {
      const prism = (points: readonly (readonly [number, number])[], material: THREE.Material, length: number, z: number) => {
        const cut = clipPolygon(points, W + CLIP);
        if (cut.length < 3) return;
        const shape = new THREE.Shape(cut.map(([x, y]) => new THREE.Vector2(x, y - W)));
        const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false }), material);
        mesh.position.z = z; mesh.castShadow = mesh.receiveShadow = true; church.add(mesh);
      };
      prism([[-4.5, 0], [-4.5, 9], [0, 13.2], [4.5, 9], [4.5, 0]], wall, 10, -hw - 10);
      prism([[-4.9, 8.7], [0, 13.6], [4.9, 8.7], [4.9, 9], [0, 13.95], [-4.9, 9]], roof, 10.4, -hw - 10.2);
      prism([[-2.6, 0], [-2.6, 7], [0, 9.6], [2.6, 7], [2.6, 0]], wall, 3, -hw - 13);
      if (W + 0.55 < 9) for (const x of [-1, 1]) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 10), wetStain); band.position.set(x * 4.53, 0.25, -hw - 5); church.add(band); }
    }

    // What crowns it.
    const crown = new THREE.Group();
    crown.position.y = TOP - W - 0.1;
    crown.rotation.z = (random() - 0.5) * mood.wear * 0.5;
    church.add(crown);
    const bar = (w: number, h: number, y: number, material: THREE.Material, tilt = 0) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.09), material); mesh.position.y = y; mesh.rotation.z = tilt; mesh.castShadow = true; crown.add(mesh); return mesh; };
    const iron = a.style === 'orthodox' || a.style === 'baroque' ? gold : dark;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), gold); ball.position.y = 0.2; crown.add(ball);
    if (a.style === 'orthodox') { bar(0.1, 2.5, 1.5, iron); bar(0.5, 0.1, 2.35, iron); bar(1.1, 0.1, 1.95, iron); bar(0.7, 0.1, 1.2, iron, 0.4); }
    else if (a.style === 'baroque') { bar(0.1, 2.3, 1.4, iron); bar(1, 0.1, 1.9, iron); bar(0.6, 0.1, 1.45, iron); }
    else if (a.style === 'wooden') { bar(0.07, 2, 1.2, iron); const arrow = bar(1.4, 0.08, 1.9, iron); arrow.rotation.y = random() * 3; }
    else {
      bar(0.08, a.style === 'gothic' ? 1.7 : 2.2, a.style === 'gothic' ? 1 : 1.3, iron);
      if (a.style === 'romanesque') bar(1, 0.1, 1.5, iron);
      else { bar(1, 0.05, 1.05, iron); bar(1, 0.05, 1.05, iron).rotation.y = Math.PI / 2; }
      const outline: [number, number][] = [[-0.35, 0.1], [-0.55, 0.5], [-0.44, 0.56], [-0.3, 0.32], [-0.05, 0.24], [0.12, 0.32], [0.2, 0.58], [0.3, 0.66], [0.36, 0.52], [0.48, 0.47], [0.35, 0.42], [0.3, 0.2], [0.15, 0.02], [-0.15, 0]];
      const cock = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.05, bevelEnabled: false }), gold);
      cock.scale.setScalar(1.25); cock.position.y = a.style === 'gothic' ? 1.8 : 2.35; cock.rotation.y = random() * 1.4 - 0.7; cock.castShadow = true; crown.add(cock);
    }

    // Water.
    const tone = { still: new THREE.Color().setHSL(mix(0.59, 0.5, mood.warmth), 0.42, 0.15), choppy: new THREE.Color().setHSL(mix(0.58, 0.52, mood.warmth), 0.2, 0.4), ice: new THREE.Color('#e7eef1'), mudflat: new THREE.Color().setHSL(mix(0.56, 0.48, mood.warmth), 0.3, 0.34) }[a.water];
    s.cylinder(R, R, 1, [0, -0.5, 0], new THREE.MeshStandardMaterial({ color: tone, roughness: a.water === 'still' ? 0.08 : 0.5, metalness: 0.1 }), 48);
    const reach = shore.r * 1.45 + (naveOut ? 5 : 0);
    const rings: THREE.Mesh[] = [];
    if (a.water === 'choppy') {
      const light = new THREE.MeshStandardMaterial({ color: tone.clone().offsetHSL(0, 0, 0.22), roughness: 0.4 });
      for (let i = 0; i < 4; i++) { const r = shore.r * 1.5 + 0.5 + i * (R - shore.r * 1.5 - 0.8) / 4; if (r > R - 0.2) break; const ring = s.ring(r, 0.05, [0, 0.01, 0], light); ring.rotation.x = Math.PI / 2; rings.push(ring); }
    } else if (a.water === 'ice') {
      const crack = new THREE.MeshStandardMaterial({ color: '#8ea4b1', roughness: 0.6 });
      for (let i = 0; i < 8; i++) { const angle = random() * 6.28, r0 = shore.r * 1.5, r1 = mix(r0, R - 0.3, 0.5 + random() * 0.5); s.rod([Math.sin(angle) * r0, 0.01, Math.cos(angle) * r0], [Math.sin(angle + (random() - 0.5) * 0.4) * r1, 0.01, Math.cos(angle) * r1], 0.04, crack); }
      const snow = new THREE.MeshStandardMaterial({ color: '#f7fafb', roughness: 0.9 });
      for (let i = 0; i < 5; i++) { const angle = random() * 6.28, r = R * (0.45 + random() * 0.45); s.ball([0.9 + random(), 0.06, 0.6 + random() * 0.6], [Math.sin(angle) * r, 0, Math.cos(angle) * r], snow, 8); }
    } else if (a.water === 'mudflat') {
      const mud = new THREE.MeshStandardMaterial({ color: '#8a775c', roughness: 1 }), crack = new THREE.MeshStandardMaterial({ color: '#4d4132', roughness: 1 });
      const bank = naveOut ? R - 1.2 : Math.min(R - 1, reach + 1.6);
      const flatMud = s.cylinder(bank, bank + 0.5, 0.12, [0, 0.06, 0], mud, 28);
      flatMud.scale.z = 1;
      for (let i = 0; i < 16; i++) { const angle = random() * 6.28, r0 = bank * (0.35 + random() * 0.3), r1 = bank * (0.7 + random() * 0.25); s.rod([Math.sin(angle) * r0, 0.125, Math.cos(angle) * r0], [Math.sin(angle + (random() - 0.5) * 0.7) * r1, 0.125, Math.cos(angle + (random() - 0.5) * 0.3) * r1], 0.035, crack); }
    }

    // What clings.
    const flock = new THREE.Group();
    s.root.add(flock);
    if (a.clings === 'weed') {
      const weed = new THREE.MeshStandardMaterial({ color: '#4f6a34', roughness: 1 }), shell = new THREE.MeshStandardMaterial({ color: '#22262b', roughness: 0.6 });
      const strands = Array.from({ length: 34 }, () => { const [x, y, z] = onWall(0.1 + random() * 0.7, 0.07); return { at: [x, y, z] as const, size: 0.7 + random() * 0.9 }; });
      const hung = s.scatter(new THREE.ConeGeometry(0.1, 0.55, 5).rotateX(Math.PI), weed, strands); church.add(hung);
      const mussels = Array.from({ length: 50 }, () => { const [x, y, z] = onWall(random() * 1.1, 0.04); return { at: [x, y, z] as const, size: 0.05 + random() * 0.05 }; });
      church.add(s.scatter(new THREE.IcosahedronGeometry(1, 0), shell, mussels));
      for (let i = 0; i < 7; i++) { const angle = random() * 6.28, r = shore.r * 1.5 + 0.4 + random() * 1.6; const pad = s.cylinder(0.5 + random() * 0.6, 0.5, 0.03, [Math.sin(angle) * r, 0.01, Math.cos(angle) * r + church.position.z * 0], weed, 10); pad.scale.z = 0.5 + random() * 0.4; pad.rotation.y = angle; }
    } else if (a.clings === 'birds') {
      const white = new THREE.MeshStandardMaterial({ color: '#f4f4ee', roughness: 0.7 }), grey = new THREE.MeshStandardMaterial({ color: '#9aa3a8', roughness: 0.7 });
      const ledges = [20.3, 16.3, 23.6, 22.6].filter((height) => height - W > 0.2);
      const perched: { at: readonly [number, number, number]; size: number }[] = [];
      for (const height of ledges) for (let i = 0; i < 5; i++) { const [x, , z] = onWall(height - W, -0.12); perched.push({ at: [x, height - W + 0.16, z], size: 0.2 + random() * 0.06 }); }
      if (!perched.length) perched.push({ at: [0.3, TOP - W + 0.9, 0], size: 0.2 });
      church.add(s.scatter(new THREE.SphereGeometry(1, 8, 6).scale(0.7, 0.8, 1.2), white, perched));
      for (let i = 0; i < 7; i++) {
        const angle = random() * 6.28, r = shore.r + 1.5 + random() * 2.5;
        const bird = new THREE.Group();
        for (const side of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.24), side > 0 ? white : grey); wing.position.x = side * 0.32; wing.rotation.z = side * 0.35; wing.castShadow = true; bird.add(wing); }
        bird.position.set(Math.sin(angle) * r, 2 + random() * Math.max(2, TOP - W), Math.cos(angle) * r);
        bird.rotation.y = angle + Math.PI / 2; bird.scale.setScalar(1.4);
        flock.add(bird);
      }
      flock.position.copy(church.position);
    } else if (a.clings === 'boat') {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#3f7fa8' : '#6a5a48', roughness: 0.7, side: THREE.DoubleSide }));
      hull.scale.set(0.7, 0.45, 1.9); hull.position.y = 0.38; hull.castShadow = true;
      const wood = new THREE.MeshStandardMaterial({ color: '#c6ae82', roughness: 0.8 });
      for (const z of [-0.6, 0.5]) { const thwart = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.06, 0.26), wood); thwart.position.set(0, 0.36, z); boat.add(thwart); }
      for (const side of [-1, 1]) { const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 6), wood); oar.position.set(side * 0.25, 0.42, 0); oar.rotation.x = Math.PI / 2; oar.rotation.z = side * 0.08; boat.add(oar); }
      boat.add(hull);
      const bx = church.position.x + shore.r + 1.2, bz = church.position.z + 0.6;
      boat.position.set(bx, a.water === 'ice' ? 0.06 : a.water === 'mudflat' ? 0.12 : -0.05, bz); boat.rotation.y = 0.25 + random() * 0.4;
      if (a.water === 'mudflat') boat.rotation.z = 0.25;
      s.root.add(boat);
      s.rod([church.position.x + shore.r * 0.9, 1.3, church.position.z + 0.2], [bx - 0.2, 0.42, bz + 1.4], 0.025, new THREE.MeshStandardMaterial({ color: '#d8c9a0' }));
    } else if (a.clings === 'offerings') {
      const leaf = new THREE.MeshStandardMaterial({ color: mood.wear > 0.6 ? '#6c6444' : '#3d6a3a', roughness: 0.9 });
      const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.14, 8, 20), leaf);
      const hang = widthAt(W + 1.9);
      wreath.position.set(0, 1.9, hang.r + 0.16); wreath.castShadow = true; church.add(wreath);
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.03), new THREE.MeshStandardMaterial({ color: '#b3262b' })); ribbon.position.set(0.2, 1.35, hang.r + 0.2); ribbon.rotation.z = 0.2; church.add(ribbon);
      const wax = new THREE.MeshStandardMaterial({ color: '#f4efdc', roughness: 0.6 });
      const count = Math.round(mix(5, 22, mood.density));
      for (let i = 0; i < count; i++) {
        const angle = -1.3 + random() * 2.6, r = shore.r * 1.45 + 0.6 + random() * Math.max(0.8, R - shore.r * 1.45 - 1.4);
        const x = Math.sin(angle) * r + church.position.x, z = Math.min(Math.cos(angle) * r + church.position.z, R - 0.6);
        if (Math.hypot(x, z) > R - 0.4) continue;
        s.cylinder(0.14, 0.14, 0.05, [x, 0.03, z], wax, 8);
        const flame = new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffa531', emissiveIntensity: 2 });
        s.ball([0.07, 0.12, 0.07], [x, 0.16, z], flame, 6);
        flames.push(flame);
      }
    }

    const speed = mix(0.04, 0.5, mood.energy);
    return s.finish({
      footprint: R,
      update: (dt, time) => {
        flock.rotation.y += dt * speed;
        rings.forEach((ring, index) => ring.scale.setScalar(1 + 0.03 * Math.sin(time * (0.5 + speed * 3) - index)));
        flames.forEach((flame, index) => { flame.emissiveIntensity = 2 + Math.sin(time * 7 + index * 1.7) * 0.5 * (0.3 + mood.energy); });
      },
    });
  },
});
