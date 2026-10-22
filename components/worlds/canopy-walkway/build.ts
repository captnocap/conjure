import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix, score, visibleBounds } from '@conjure/kit';
import { type Blob, type V, beam, clump, fuse, instances, limb, v } from './parts';

type XZ = readonly [number, number];
const insidePolygon = (poly: readonly XZ[], x: number, z: number) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
};

export default defineWorld({
  questions: {
    mist: choice('How much mist lies in the forest?', {
      pools: 'Mist pooled in the hollows between ridges of crowns, the classic early morning.',
      sea: 'A white sea: only the nearest crowns and the tallest giants stand out of it like islands.',
      clear: 'Burned off: crown after crown sharp to a far blue line of hills.',
      rain: 'Grey rain crossing in veils, the far forest washed out.',
    }),
    season: choice('What is the forest doing?', {
      evergreen: 'Unbroken deep greens, a hundred shades of it.',
      mast: 'A mass flowering: whole crowns turned cream, pink and orange.',
      flush: 'New leaf flush: scattered crowns in bronze and wine red.',
      dry: 'A dry spell: some crowns yellowing, a few bare and grey.',
    }),
    structure: choice('Who built the walkway, and of what?', {
      research: 'Scientists: pale timber decks, steel cable rails, aluminium ladder spans and bright orange rope.',
      tourist: 'A park: sturdy dark hardwood boardwalks with solid handrails and painted posts.',
      makeshift: 'Honey hunters: lashed yellow bamboo, liana rope, everything a little crooked.',
      ancient: 'Nobody remembers: grey mossy timbers with carved post tops and bridges of living root.',
    }),
    state: choice('What state is the place in this morning?', {
      inuse: 'In use: lanterns still lit, a kettle steaming, crates and washing about.',
      empty: 'Empty and tidy, waiting for the first footsteps.',
      storm: 'After a storm: one span snapped and hanging, a torn branch across the deck.',
      overgrown: 'Long unvisited: moss and ferns on the boards, creepers trailing from the ropes, planks gone.',
    }),
    life: choice('What moves in the open air?', {
      nothing: 'Nothing: the air is empty.',
      hornbills: 'A few big dark birds rowing across above the mist.',
      bats: 'A long straggling stream of flying foxes heading home to roost.',
      swiftlets: 'A loose cloud of small quick birds hawking insects.',
      gibbon: 'A long-armed ape hanging at ease from a bough of the next tree.',
      butterflies: 'Bright butterflies drifting round the platform.',
    }),
    view: choice('Where is the viewer standing?', {
      across: 'On a neighbouring platform, looking across and slightly down.',
      vertigo: 'High on a ladder above, looking steeply down through the walkway into the crowns and mist.',
      wide: 'Well back along the walkway: the platforms small, the forest enormous.',
    }),
    giants: score('How many giant trees stand above the canopy?', ['None: one even roof of crowns', 'Two or three', 'A whole scattered company of them']),
  },

  build(a, context) {
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const root = new THREE.Group();
    const d = mood.daylight;
    const worn = Math.min(1, mood.wear + (a.state === 'overgrown' ? 0.4 : a.state === 'storm' ? 0.15 : 0));

    // Air: peach at dawn, pale green-white at noon, a mid-tone mauve at dusk.
    const dawn = new THREE.Color('#f1dcc6'), noon = new THREE.Color('#dde8e1'), dusk = new THREE.Color('#c7bdcf');
    const air = (d < 0.5 ? dawn.clone().lerp(noon, d * 2) : noon.clone().lerp(dusk, (d - 0.5) * 2)).lerp(new THREE.Color('#f2e3cf'), (mood.warmth - 0.5) * 0.3 + 0.0);
    if (a.mist === 'rain') air.lerp(new THREE.Color('#b4bfc2'), 0.65);
    air.lerp(new THREE.Color('#ffffff'), mood.cheer * 0.12);
    const background = air.clone();

    root.add(new THREE.HemisphereLight(air.clone().lerp(new THREE.Color('#ffffff'), 0.4), '#3f5d49', 1.05));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.6, 0.08, mood.warmth), 0.45, 0.86), a.mist === 'rain' ? 1.4 : 2.3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#dfe9ff', 0.45);
    fill.position.set(-10, 12, 30);
    root.add(fill);

    // Where the roof of the forest lies: it rolls, and falls away from the viewer.
    const p1 = rnd(0, 6.28), p2 = rnd(0, 6.28);
    const surf = (x: number, z: number) => { const far = Math.max(0, -z - 4); return -7.5 - 0.075 * far + (2.2 + Math.min(4, far * 0.03)) * Math.sin(x * 0.04 + p1) * Math.cos(z * 0.034 + p2) + 1.2 * Math.sin(x * 0.13 - z * 0.11 + p2); };
    const mistLevel = { pools: -22, sea: -13.5, clear: -42, rain: -20 }[a.mist];
    const haze = { pools: 0.9, sea: 1.15, clear: 0.5, rain: 1.4 }[a.mist];

    // Leaf colours.
    const hue = mix(0.39, 0.29, mood.warmth);
    const greenAt = () => new THREE.Color().setHSL(hue + rnd(-0.045, 0.035), mix(0.45, 0.68, mood.cheer) + rnd(-0.08, 0.08), mix(0.085, 0.14, mood.cheer) + rnd(-0.02, 0.045));
    const special = () => {
      const r = random();
      if (a.season === 'mast' && r < 0.15) return new THREE.Color(['#cfc48c', '#c98f8c', '#c97a30', '#d9c9a0'][Math.floor(random() * 4)]).offsetHSL(0, 0, rnd(-0.05, 0.03));
      if (a.season === 'flush' && r < 0.12) return new THREE.Color(['#8a4632', '#a3653e', '#7a3a34'][Math.floor(random() * 3)]).offsetHSL(0, 0, rnd(-0.04, 0.04));
      if (a.season === 'dry' && r < 0.17) return new THREE.Color(r < 0.05 ? '#7d7566' : '#8a8438').offsetHSL(0, 0, rnd(-0.04, 0.04));
      return greenAt();
    };
    const fade = (colour: THREE.Color, x: number, y: number, z: number) => {
      const far = Math.hypot(x, z + 10);
      const f = THREE.MathUtils.clamp(THREE.MathUtils.smoothstep(far, 30, 330) * haze + THREE.MathUtils.clamp((mistLevel + 8 - y) / 9, 0, 1) * 0.45, 0, 0.95);
      return colour.lerp(air, f);
    };

    // The sea of crowns.
    const leafMaterial = new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true });
    const nearCrowns: Blob[] = [], farCrowns: Blob[] = [], hazeCrowns: Blob[] = [], underCrowns: Blob[] = [];
    const structureAt: XZ[] = [[0, -1.8], [-10.4, -8.6], [12, -12.4]];
    const dense = mix(0.85, 1.12, mood.density);
    for (let z = 36; z > -340; ) {
      // Only the wedge of forest the lens can see is planted, widening with distance.
      const far = Math.max(0, -z), pitchZ = (5.0 + far * 0.05) / dense, mid = far < 6 ? 0 : -7 + (30 + far) * 0.31, half = far < 6 ? 46 : (45 + far) * 0.33 + 12;
      for (let x = mid - half + rnd(0, pitchZ); x < mid + half; x += pitchZ * rnd(0.85, 1.25)) {
        const px = x, pz = z + rnd(-0.4, 0.4) * pitchZ, r = pitchZ * rnd(0.62, 0.92);
        const y = surf(px, pz) + rnd(-1.6, 1.4);
        if (y + r * 0.6 < mistLevel - 2) continue;
        const blob: Blob = { at: v(px, y, pz), size: v(r, r * rnd(0.55, 0.8), r), color: fade(special(), px, y, pz), turn: rnd(0, 6.28) };
        (pz > 6 ? nearCrowns : far < 120 ? farCrowns : hazeCrowns).push(blob);
        if (far < 45 && random() < 0.55) underCrowns.push({ at: v(px + pitchZ * 0.5, y - rnd(4, 6.5), pz + pitchZ * 0.5), size: v(r * 1.15, r * 0.6, r * 1.15), color: fade(greenAt().multiplyScalar(0.55), px, y - 5, pz), turn: rnd(0, 6.28) });
      }
      z -= pitchZ * 0.82;
    }
    const nearMesh = instances(clump(2, 0.2), leafMaterial, nearCrowns);
    const farMesh = instances(clump(1, 0.22), leafMaterial, farCrowns);
    const underMesh = instances(clump(1, 0.22), leafMaterial, underCrowns);
    // The roof of the forest is far below the decks: it neither casts nor takes their shadows.
    for (const m of [nearMesh, farMesh, underMesh]) m.castShadow = m.receiveShadow = false;
    root.add(nearMesh, farMesh, underMesh);
    if (hazeCrowns.length) { const m = instances(clump(0, 0.1), leafMaterial, hazeCrowns); m.castShadow = m.receiveShadow = false; root.add(m); }

    // Giants standing clear of the roof.
    const barkPale = new THREE.MeshStandardMaterial({ color: new THREE.Color('#b8b09c').lerp(air, 0.15), roughness: 0.9 });
    const giantCrowns: Blob[] = [], giantWood: THREE.BufferGeometry[] = [], giantWoodFar: THREE.BufferGeometry[] = [];
    const giants = Math.round(mix(0, 9, a.giants) + (a.giants > 0.1 ? rnd(0, 1.5) : 0));
    for (let i = 0; i < giants; i++) {
      const z = -rnd(30, 190), x = -7 + (30 - z) * 0.31 + rnd(-1, 1) * (8 + -z * 0.3) + (Math.abs(z) < 60 ? (random() < 0.5 ? -15 : 15) : 0);
      const base = surf(x, z) - 3, tall = rnd(13, 21), top = base + tall, spread = tall * rnd(0.42, 0.6);
      const lean = rnd(-1.5, 1.5);
      const fadeAmount = fade(new THREE.Color('#000000'), x, top, z).r / Math.max(air.r, 0.01);
      (fadeAmount > 0.45 ? giantWoodFar : giantWood).push(limb([v(x, base - 6, z), v(x + lean * 0.4, base + tall * 0.5, z), v(x + lean, top - spread * 0.25, z)], 0.9, 0.5, 7));
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * 6.28 + rnd(-0.3, 0.3), out = k === 0 ? 0 : spread * rnd(0.45, 0.8), r = spread * rnd(0.4, 0.55);
        const end = v(x + lean + Math.cos(ang) * out, top - spread * 0.12 + (k === 0 ? spread * 0.14 : rnd(-0.5, 0.5)), z + Math.sin(ang) * out);
        if (k) (fadeAmount > 0.45 ? giantWoodFar : giantWood).push(limb([v(x + lean, top - spread * 0.3, z), end.clone().lerp(v(x + lean, top - spread * 0.3, z), 0.45).add(v(0, spread * 0.06, 0)), end.clone().add(v(0, -r * 0.2, 0))], 0.34, 0.12, 5));
        giantCrowns.push({ at: end, size: v(r, r * 0.42, r), color: fade(special(), x, top, z), turn: rnd(0, 6.28) });
      }
    }
    if (giantWood.length) root.add(new THREE.Mesh(fuse(giantWood), barkPale));
    if (giantWoodFar.length) root.add(new THREE.Mesh(fuse(giantWoodFar), new THREE.MeshStandardMaterial({ color: new THREE.Color('#b8b09c').lerp(air, 0.62), roughness: 1 })));
    if (giantCrowns.length) { const m = instances(clump(1, 0.22), leafMaterial, giantCrowns); m.castShadow = m.receiveShadow = false; root.add(m); }

    // Mist: a level sea the far forest sinks under, soft layers above it, and pools drifting in the hollows.
    const veilMaterial = (opacity: number) => new THREE.MeshBasicMaterial({ color: air, transparent: true, opacity, depthWrite: false });
    const seaFloor = new THREE.Mesh(new THREE.CircleGeometry(900, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: air }));
    seaFloor.position.set(0, mistLevel, -200);
    root.add(seaFloor);
    for (const [lift, opacity] of [[2.4, 0.42]] as const) {
      const layer = new THREE.Mesh(new THREE.CircleGeometry(900, 40).rotateX(-Math.PI / 2), veilMaterial(opacity * Math.min(1, haze)));
      layer.position.set(0, mistLevel + lift, -200);
      root.add(layer);
    }
    const drift = new THREE.Group();
    root.add(drift);
    const pools: Blob[] = [];
    const poolCount = { pools: 10, sea: 6, clear: 2, rain: 8 }[a.mist];
    for (let i = 0; i < poolCount; i++) {
      const z = -rnd(24, 260), x = -7 + (30 - z) * 0.31 + rnd(-1, 1) * (20 + -z * 0.35);
      pools.push({ at: v(x, surf(x, z) + rnd(-3.5, 0.5), z), size: v(rnd(22, 50) * (1 + -z / 140), rnd(2.2, 4.2), rnd(7, 13) * (1 + -z / 170)), color: air });
    }
    if (pools.length) { const m = instances(new THREE.SphereGeometry(1, 14, 7), veilMaterial(0.42), pools); m.castShadow = m.receiveShadow = false; drift.add(m); }
    // Far hills, layered paler and paler.
    for (let i = 0; i < 4; i++) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue + 0.12, 0.25, 0.42).lerp(air, THREE.MathUtils.clamp((a.mist === 'clear' ? 0.62 : 0.84) + i * 0.045, 0, 0.97)) }));
      hill.scale.set(rnd(200, 340), rnd(26, 46) + i * 9, 60);
      hill.position.set(100 + rnd(-1, 1) * 260, mistLevel - 4, -420 - i * 80);
      root.add(hill);
    }
    // A low sun burning through.
    if (Math.abs(d - 0.5) > 0.2 && a.mist !== 'rain') {
      const sun = new THREE.Mesh(new THREE.CircleGeometry(15, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6d8').lerp(new THREE.Color('#ffd0a0'), Math.abs(d - 0.5) * 1.4) }));
      sun.position.set(d < 0.5 ? 20 : 260, mix(70, 22, Math.abs(d - 0.5) * 2), -620);
      root.add(sun);
    }

    // The built thing. Colours and joinery change with whoever made it.
    const style = {
      research: { deck: '#c2a57a', frame: '#8f7450', rail: '#9aa3a6', rope: '#ef5a2c', post: '#8f7450' },
      tourist: { deck: '#7d5637', frame: '#5b3d28', rail: '#5b3d28', rope: '#d8cfb4', post: '#b4452f' },
      makeshift: { deck: '#cdb46a', frame: '#b89c52', rail: '#a58a52', rope: '#8a7a52', post: '#cdb46a' },
      ancient: { deck: '#8b8576', frame: '#6f6a5c', rail: '#7b725e', rope: '#6b6450', post: '#8b8576' },
    }[a.structure];
    const tone = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#7f8272'), worn * 0.45).lerp(new THREE.Color('#a8885e'), (mood.warmth - 0.5) * 0.15);
    const deckMat = new THREE.MeshStandardMaterial({ color: tone(style.deck), roughness: 0.85 });
    const frameMat = new THREE.MeshStandardMaterial({ color: tone(style.frame), roughness: 0.9 });
    const railMat = new THREE.MeshStandardMaterial({ color: tone(style.rail), roughness: a.structure === 'research' ? 0.4 : 0.9, metalness: a.structure === 'research' ? 0.6 : 0 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: tone(style.rope), roughness: 0.8 });
    const postMat = new THREE.MeshStandardMaterial({ color: tone(style.post), roughness: 0.85 });
    const bark = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6b5d4c').lerp(new THREE.Color('#84694a'), mood.warmth * 0.4), roughness: 0.95 });
    const mossMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
    const add = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = root, shadow = true) => { const mesh = new THREE.Mesh(g, m); mesh.castShadow = mesh.receiveShadow = shadow; parent.add(mesh); return mesh; };

    // Trees that carry the decks. The main one fills the left of the frame and reaches a limb to the right.
    const trunks: THREE.BufferGeometry[] = [];
    trunks.push(limb([v(0.3, -34, -1.8), v(0, -8, -1.8), v(0, 6, -1.8), v(-0.4, 30, -2.2)], 1.3, 0.95, 14));
    trunks.push(limb([v(-10.9, -34, -9), v(-10.4, -8, -9), v(-10.4, 6, -9), v(-10.9, 28, -9.3)], 0.85, 0.6, 10));
    trunks.push(limb([v(12.4, -34, -12.8), v(12, -8, -12.8), v(12, 4, -12.8), v(12.5, 26, -13)], 0.9, 0.62, 10));
    const limbLine = [v(0.6, 2.7, -1.8), v(3.6, 3.35, -1.6), v(7.6, 3.55, -1.15), v(11.5, 4.3, -0.5), v(14.5, 5.8, 0.2)];
    trunks.push(limb(limbLine, 0.82, 0.3, 10, 4));
    const limbTop = 3.55 + 0.6;
    trunks.push(limb([v(11.2, 4.2, -0.5), v(12.6, 5.9, -1.6), v(13.4, 8, -2.4)], 0.3, 0.1, 6), limb([v(-0.5, 9, -2), v(-3.5, 11.5, -0.5), v(-7, 12.6, 1.5)], 0.6, 0.2, 8), limb([v(0.3, 12, -2), v(4, 14.5, -3.5), v(8, 15.4, -5)], 0.55, 0.18, 8));
    add(fuse(trunks), bark);
    // Their own foliage, kept high and to the sides so the view stays open.
    const ownLeaves: Blob[] = [];
    const bunch = (x: number, y: number, z: number, n: number, r: number) => { for (let i = 0; i < n; i++) { const s = r * rnd(0.6, 1.1); ownLeaves.push({ at: v(x + rnd(-1, 1) * r * 1.5, y + rnd(-0.5, 0.8) * r, z + rnd(-1, 1) * r * 1.5), size: v(s, s * 0.6, s), color: greenAt().offsetHSL(0, 0, -0.02), turn: rnd(0, 6.28) }); } };
    bunch(-7, 13.2, 1.5, 6, 2.1); bunch(7.5, 16, -5, 6, 2.2); bunch(0, 19, -2, 7, 2.6);
    bunch(-10.6, 14.5, -9, 8, 2.4); bunch(12.2, 13.5, -12.8, 8, 2.4); bunch(13.6, 8.2, -2.4, 4, 1.3); bunch(15, 6.2, 0.4, 3, 1.1);
    const ownMesh = instances(clump(2, 0.2), leafMaterial, ownLeaves);
    root.add(ownMesh);

    // Decks.
    const mainPoly: XZ[] = [[-3.9, 4.3], [3.9, 4.3], [4.5, 0.4], [3.5, -4.3], [0, -5.8], [-3.5, -4.3], [-4.5, 0.4]];
    const leftPoly: XZ[] = Array.from({ length: 8 }, (_u, i) => [-10.3 + Math.cos((i / 8) * 6.28 + 0.39) * 3.0, -7.5 + Math.sin((i / 8) * 6.28 + 0.39) * 3.0] as const);
    const rightPoly: XZ[] = Array.from({ length: 8 }, (_u, i) => [11.9 + Math.cos((i / 8) * 6.28 + 0.39) * 3.0, -11.2 + Math.sin((i / 8) * 6.28 + 0.39) * 3.0] as const);
    const boards: THREE.BufferGeometry[] = [], frame: THREE.BufferGeometry[] = [], rails: THREE.BufferGeometry[] = [], posts: THREE.BufferGeometry[] = [], ropes: THREE.BufferGeometry[] = [];
    const finials: Blob[] = [], moss: Blob[] = [];
    const lanternAt: V[] = [];
    const plankLoss = a.state === 'overgrown' ? 0.12 : worn * 0.06;
    const layDeck = (poly: readonly XZ[], y: number, trunk: XZ, trunkR: number, open: readonly number[], protectedSpot?: readonly [number, number, number]) => {
      const xs = poly.map((p) => p[0]), zs = poly.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
      for (let z = z0 + 0.13; z < z1; z += 0.27) {
        let start: number | null = null;
        for (let x = x0 - 0.1; x <= x1 + 0.2; x += 0.06) {
          const ok = insidePolygon(poly, x, z) && Math.hypot(x - trunk[0], z - trunk[1]) > trunkR;
          if (ok && start === null) start = x;
          if (!ok && start !== null) {
            const safe = protectedSpot && Math.hypot((x + start) / 2 - protectedSpot[0], z - protectedSpot[1]) < protectedSpot[2];
            if (x - start > 0.3 && (safe || random() > plankLoss)) boards.push(new THREE.BoxGeometry(x - start + rnd(-0.05, 0.05), 0.07, 0.24).translate((x + start) / 2, y - 0.035 + rnd(-0.008, 0.008), z));
            start = null;
          }
        }
      }
      const cx = xs.reduce((s, x) => s + x, 0) / xs.length, cz = zs.reduce((s, z) => s + z, 0) / zs.length;
      poly.forEach(([x, z], i) => {
        // Joist and knee brace back to the trunk.
        const inner = v(trunk[0] + (x - trunk[0]) * 0.15, y - 0.16, trunk[1] + (z - trunk[1]) * 0.15);
        frame.push(beam(inner, v(x, y - 0.16, z), 0.16, 0.18));
        frame.push(beam(v(trunk[0] + (x - trunk[0]) * 0.2, y - 2.6, trunk[1] + (z - trunk[1]) * 0.2), v(trunk[0] + (x - trunk[0]) * 0.78, y - 0.25, trunk[1] + (z - trunk[1]) * 0.78), 0.13, 0.13));
        const [nx, nz] = poly[(i + 1) % poly.length];
        frame.push(beam(v(x, y - 0.16, z), v(nx, y - 0.16, nz), 0.14, 0.18));
        if (open.includes(i)) return;
        // A rail along this edge.
        const lean = () => rnd(-1, 1) * 0.04 * (1 + worn * 3);
        const steps = Math.max(1, Math.round(Math.hypot(nx - x, nz - z) / 2.1));
        const tops: V[] = [];
        for (let k = 0; k <= steps; k++) {
          const px = mix(x, nx, k / steps), pz = mix(z, nz, k / steps), tall = 1.1 + (a.structure === 'makeshift' ? rnd(-0.05, 0.25) : 0);
          const top = v(px + (cx - px) * 0.03 + lean(), y + tall, pz + (cz - pz) * 0.03 + lean());
          posts.push(a.structure === 'makeshift' ? limb([v(px, y - 0.3, pz), top], 0.05, 0.045, 6, 1) : beam(v(px, y - 0.3, pz), top, 0.12, 0.12));
          tops.push(top);
          if (a.structure === 'ancient' || a.structure === 'tourist') finials.push({ at: top.clone().add(v(0, 0.07, 0)), size: v(0.11, a.structure === 'ancient' ? 0.2 : 0.1, 0.11), color: tone(style.post) });
          if (k === 0 && i % 2 === 0) lanternAt.push(top.clone());
        }
        for (const drop of a.structure === 'tourist' ? [0.05, 0.4, 0.75] : [0.06, 0.55]) {
          for (let k = 0; k < steps; k++) {
            const p0 = tops[k].clone().add(v(0, -drop, 0)), p1 = tops[k + 1].clone().add(v(0, -drop, 0));
            if (a.structure === 'tourist') rails.push(beam(p0, p1, 0.07, 0.1));
            else rails.push(limb([p0, p0.clone().lerp(p1, 0.5).add(v(0, a.structure === 'research' ? -0.02 : -0.1, 0)), p1], a.structure === 'ancient' ? 0.05 : 0.025, a.structure === 'ancient' ? 0.04 : 0.025, 5));
          }
        }
      });
    };
    const leftY = 0.9, rightY = -1.4;
    layDeck(mainPoly, 0, [0, -1.8], 1.25, [0, 2, 6], [0.3, 1.9, 3]);
    layDeck(leftPoly, leftY, [-10.4, -9], 0.9, [7, 0], [-10.2, -7.0, 2]);
    layDeck(rightPoly, rightY, [12, -12.8], 0.92, [2, 3], [11.7, -10.4, 2]);
    // A plank pad lashed on top of the big limb.
    for (let i = 0; i < 8; i++) boards.push(new THREE.BoxGeometry(0.26, 0.06, 2.3 + rnd(-0.1, 0.1)).translate(6.55 + i * 0.3, limbTop + 0.04, -1.2));
    frame.push(beam(v(6.4, limbTop - 0.02, -0.25), v(8.9, limbTop - 0.02, -0.25), 0.1, 0.1), beam(v(6.4, limbTop - 0.02, -2.15), v(8.9, limbTop - 0.02, -2.15), 0.1, 0.1));
    for (const x of [6.7, 8.6]) { const ring = new THREE.TorusGeometry(0.68, 0.045, 6, 20).rotateY(Math.PI / 2).translate(x, 3.55, -1.18); ropes.push(ring); }
    const ground = add(fuse(boards), deckMat);

    // Rope walkways between the trees.
    const sway: { group: THREE.Group; axis: V; phase: number }[] = [];
    const walkway = (from: V, to: V, broken: boolean) => {
      const group = new THREE.Group();
      group.position.copy(from);
      root.add(group);
      const span = to.clone().sub(from), length = span.length(), flat = span.clone().setY(0).normalize(), side = v(-flat.z, 0, flat.x);
      const sag = length * rnd(0.08, 0.12);
      const planks: THREE.BufferGeometry[] = [], lines: THREE.BufferGeometry[] = [], net: THREE.BufferGeometry[] = [], metal: THREE.BufferGeometry[] = [];
      const runs = broken ? [[0, 0.42, 0], [1, 0.6, 1]] : [[0, 1, -1]];
      for (const [t0, t1, hangFrom] of runs) {
        const count = Math.max(4, Math.round((Math.abs(t1 - t0) * length) / 0.36));
        const pts: { p: V; tan: V }[] = [];
        for (let i = 0; i <= count; i++) {
          const t = mix(t0, t1, i / count);
          let p = span.clone().multiplyScalar(t).add(v(0, -sag * 4 * t * (1 - t), 0));
          if (hangFrom >= 0) {
            // A severed half swings down and hangs from the end that still holds.
            const s = Math.abs(t - hangFrom) * length, swing = 1.8 * (1 - Math.exp(-s / 1.5));
            p = span.clone().multiplyScalar(hangFrom).addScaledVector(flat, (hangFrom ? -1 : 1) * swing).add(v(0, -Math.max(0, s - swing * 0.8), 0));
          }
          pts.push({ p, tan: v(0, 0, 0) });
        }
        pts.forEach((q, i) => q.tan.copy(pts[Math.min(count, i + 1)].p).sub(pts[Math.max(0, i - 1)].p).normalize());
        const up = (q: { tan: V }) => v(0, 1, 0).addScaledVector(q.tan, -q.tan.y).normalize();
        const high = hangFrom >= 0 ? 0.45 : 1.08;
        pts.forEach((q, i) => {
          if (i === 0 || i === count) return;
          const u = up(q);
          if (a.structure === 'research') metal.push(beam(q.p.clone().addScaledVector(side, -0.42), q.p.clone().addScaledVector(side, 0.42), 0.04, 0.04));
          if (random() < plankLoss * 1.6 + (broken ? 0.12 : 0)) return;
          if (a.structure === 'ancient') return;
          planks.push(beam(q.p.clone().addScaledVector(side, -0.5).addScaledVector(u, 0.03), q.p.clone().addScaledVector(side, 0.5).addScaledVector(u, 0.03), 0.06, a.structure === 'research' ? 0.3 : 0.27));
        });
        const every = pts.filter((_q, i) => i % 2 === 0 || i === count);
        for (const z of [-1, 1]) {
          (a.structure === 'research' ? metal : lines).push(limb(every.map((q) => q.p.clone().addScaledVector(side, z * 0.5)), a.structure === 'ancient' ? 0.11 : 0.04, a.structure === 'ancient' ? 0.11 : 0.04, 5, 2));
          lines.push(limb(every.map((q) => q.p.clone().addScaledVector(side, z * 0.62).addScaledVector(up(q), high)), a.structure === 'ancient' ? 0.07 : 0.04, a.structure === 'ancient' ? 0.07 : 0.04, 5, 2));
          for (let i = 0; i + 2 <= count; i += 2) {
            const f = pts[i], g = pts[i + 2], m = pts[i + 1];
            const top0 = f.p.clone().addScaledVector(side, z * 0.62).addScaledVector(up(f), high), top1 = g.p.clone().addScaledVector(side, z * 0.62).addScaledVector(up(g), high);
            const low0 = f.p.clone().addScaledVector(side, z * 0.5), low1 = g.p.clone().addScaledVector(side, z * 0.5);
            const midP = m.p.clone().addScaledVector(side, z * 0.56).addScaledVector(up(m), high * 0.5);
            if (a.structure === 'ancient') { net.push(limb([top0, midP, low1], 0.035, 0.03, 4, 2)); if (i % 4 === 0) net.push(limb([low0, midP, top1], 0.03, 0.025, 4, 2)); }
            else if (a.structure === 'tourist') net.push(beam(top0, low0, 0.03, 0.03), beam(m.p.clone().addScaledVector(side, z * 0.62).addScaledVector(up(m), high), m.p.clone().addScaledVector(side, z * 0.5), 0.03, 0.03));
            else net.push(beam(top0, midP, 0.022, 0.022), beam(midP, low1, 0.022, 0.022), beam(low0, midP, 0.022, 0.022), beam(midP, top1, 0.022, 0.022));
          }
        }
        if (a.structure === 'ancient') {
          // A living-root bridge: a mat of woven roots instead of boards.
          for (const off of [-0.3, -0.1, 0.1, 0.3]) lines.push(limb(every.map((q, i) => q.p.clone().addScaledVector(side, off + Math.sin(i * 1.7 + off * 9) * 0.07)), 0.085, 0.085, 5, 2));
        }
        if (a.state === 'overgrown' || mood.density > 0.75)
          for (let i = 2; i < count - 1; i += 3) if (random() < 0.6) { const q = pts[i].p.clone().addScaledVector(side, rnd(-0.5, 0.5)), len = rnd(0.6, 2.2); net.push(limb([q, q.clone().add(v(rnd(-0.1, 0.1), -len * 0.5, 0)), q.clone().add(v(rnd(-0.2, 0.2), -len, 0))], 0.025, 0.012, 4, 2)); }
      }
      if (planks.length) add(fuse(planks), deckMat, group);
      if (lines.length) add(fuse(lines), a.structure === 'ancient' ? frameMat : ropeMat, group);
      if (metal.length) add(fuse(metal), railMat, group);
      if (net.length) add(fuse(net), a.structure === 'research' ? ropeMat : frameMat, group);
      if (!broken) sway.push({ group, axis: span.clone().normalize(), phase: rnd(0, 6) });
    };
    walkway(v(-4.5, 0, -1.2), v(-7.75, leftY, -6.2), false);
    walkway(v(4.0, 0, -2.4), v(9.6, rightY, -9.1), a.state === 'storm');
    // The route goes on out of frame: a third span leaves the left platform into the leaves.
    walkway(v(-12.9, leftY, -8.6), v(-27, leftY + 1.5, -15), false);

    // Epiphytes: the limb and every fork carry gardens.
    const fernBlobs: Blob[] = [];
    const mossy = Math.round(mix(8, 26, mood.density) + (a.state === 'overgrown' ? 16 : 0) + (a.structure === 'ancient' ? 8 : 0));
    const limbCurve = new THREE.CatmullRomCurve3(limbLine);
    for (let i = 0; i < mossy; i++) {
      const t = rnd(0.08, 0.95), p = limbCurve.getPointAt(t), r = mix(0.82, 0.32, t);
      if (p.x > 6.2 && p.x < 9.1 && i % 3) continue;
      const s = rnd(0.25, 0.5);
      moss.push({ at: p.clone().add(v(0, r * 0.75, rnd(-0.5, 0.5) * r)), size: v(s * 1.5, s * 0.5, s), color: new THREE.Color().setHSL(hue - 0.06, 0.55, rnd(0.2, 0.3)), turn: rnd(0, 6) });
      if (i % 3 === 0 && !(p.x > 5.6 && p.x < 9.6)) fernBlobs.push({ at: p.clone().add(v(0, r + 0.25, rnd(-0.3, 0.3))), size: v(0.6, 0.5, 0.6), color: new THREE.Color().setHSL(hue - 0.09, 0.6, rnd(0.3, 0.38)), turn: rnd(0, 6) });
    }
    if (a.state === 'overgrown' || a.structure === 'ancient')
      for (const poly of [mainPoly, leftPoly, rightPoly]) poly.forEach(([x, z], i) => { if (random() < 0.75) { const s = rnd(0.3, 0.6), y = poly === mainPoly ? 0 : poly === leftPoly ? leftY : rightY; if (poly === mainPoly && (i === 0 || i === 1)) return; moss.push({ at: v(x * 0.97, y + 0.05, z * 0.97), size: v(s * 1.4, s * 0.45, s * 1.2), color: new THREE.Color().setHSL(hue - 0.05, 0.5, rnd(0.2, 0.3)), turn: rnd(0, 6) }); } });
    for (const [x, y, z, r] of [[0, 6.2, -1.8, 1.1], [-10.4, 5.4, -9, 0.75], [12, 4.2, -12.8, 0.8], [0, -5.5, -1.8, 1.3]] as const) fernBlobs.push({ at: v(x + r * 0.7, y, z + r * 0.75), size: v(0.9, 0.7, 0.9), color: new THREE.Color().setHSL(hue - 0.09, 0.6, rnd(0.3, 0.38)), turn: rnd(0, 6) });
    if (moss.length) root.add(instances(clump(1, 0.25), mossMat, moss));
    if (fernBlobs.length) root.add(instances(new THREE.ConeGeometry(1, 1.3, 8, 1, true).rotateX(Math.PI), new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide, flatShading: true }), fernBlobs));
    // Lianas looping down from the high boughs into the drop.
    const lianas: THREE.BufferGeometry[] = [];
    for (let i = 0; i < Math.round(mix(3, 9, mood.density)); i++) {
      const from = [v(-6.5, 12.4, 1.2), v(7.5, 15, -5), v(-10.6, 13, -9.5), v(12.4, 12.5, -13), v(13.6, 6.4, -0.2)][i % 5].clone().add(v(rnd(-1.5, 1.5), 0, rnd(-1, 1))), drop = rnd(8, 26);
      lianas.push(limb([from, from.clone().add(v(rnd(-0.5, 0.5), -drop * 0.5, rnd(-0.5, 0.5))), from.clone().add(v(rnd(-1.2, 1.2), -drop, rnd(-1, 1)))], 0.06, 0.035, 5));
    }
    frame.push(...lianas);

    // What the morning has left on the decks. Everything stays off the standing spots.
    const glows: THREE.MeshStandardMaterial[] = [];
    const steam = new THREE.Group();
    root.add(steam);
    const small: THREE.BufferGeometry[] = [], bright: THREE.BufferGeometry[] = [];
    if (a.state === 'inuse') {
      const glow = new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#ffb347', emissiveIntensity: mix(1.2, 2.6, Math.abs(d - 0.5) * 2), roughness: 0.4 });
      glows.push(glow);
      const lamps: Blob[] = [];
      lanternAt.forEach((p, i) => { if (i % 2 === 0) { lamps.push({ at: p.clone().add(v(0, -0.32, 0.16)), size: v(0.09, 0.13, 0.09), color: '#ffffff' }); small.push(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 8).translate(p.x, p.y - 0.18, p.z + 0.16), new THREE.CylinderGeometry(0.11, 0.11, 0.03, 8).translate(p.x, p.y - 0.46, p.z + 0.16)); } });
      if (lamps.length) root.add(instances(new THREE.CylinderGeometry(1, 1, 2, 8), glow, lamps));
      // Crates, a stove and a kettle at the back right of the main deck.
      small.push(new THREE.BoxGeometry(0.8, 0.5, 0.6).translate(2.6, 0.25, -3.3), new THREE.BoxGeometry(0.7, 0.45, 0.55).rotateY(0.3).translate(2.5, 0.73, -3.3), new THREE.BoxGeometry(0.5, 0.35, 0.5).translate(3.3, 0.18, -2.5));
      bright.push(new THREE.CylinderGeometry(0.16, 0.19, 0.24, 10).translate(3.3, 0.47, -2.5), new THREE.TorusGeometry(0.3, 0.035, 6, 18).rotateX(Math.PI / 2).translate(1.9, 0.05, -4.2), new THREE.TorusGeometry(0.26, 0.035, 6, 18).rotateX(Math.PI / 2).translate(1.9, 0.11, -4.2));
      const puffs: Blob[] = [];
      for (let i = 0; i < 6; i++) puffs.push({ at: v(3.35 + i * 0.08, 0.8 + i * 0.32, -2.5), size: v(0.1 + i * 0.05, 0.12 + i * 0.05, 0.1 + i * 0.05), color: '#ffffff' });
      const puffMesh = instances(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }), puffs);
      puffMesh.castShadow = false;
      steam.add(puffMesh);
      // Washing on a line across the back of the left platform.
      const l0 = v(-12.6, leftY + 2.2, -9.6), l1 = v(-8.4, leftY + 2.3, -9.9);
      ropes.push(limb([l0, l0.clone().lerp(l1, 0.5).add(v(0, -0.15, 0)), l1], 0.012, 0.012, 4));
      const cloths = ['#d8442b', '#f1ece0', '#3f8f8a', '#e3b21c', '#4f6f8f'];
      const cloth: Blob[] = [];
      for (let i = 0; i < 5; i++) { const p = l0.clone().lerp(l1, 0.15 + i * 0.17); cloth.push({ at: p.add(v(0, -0.45, 0)), size: v(0.5, 0.62 + (i % 2) * 0.2, 0.03), color: mood.cheer > 0.3 ? cloths[i] : '#c9c4b6' }); }
      root.add(instances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9 }), cloth));
      frame.push(beam(v(-12.6, leftY, -9.6), l0, 0.05, 0.05), beam(v(-8.4, leftY, -9.9), l1, 0.05, 0.05));
    }
    if (a.state === 'storm') {
      // A torn bough lies across the back of the main deck, still in leaf.
      const torn = [limb([v(1.2, 0.35, -4.9), v(2.6, 0.5, -3.6), v(3.9, 0.4, -2.2), v(5.6, 1.1, -0.9)], 0.24, 0.07, 7)];
      for (let i = 0; i < 4; i++) torn.push(limb([v(2.2 + i * 0.8, 0.45, -4 + i * 0.75), v(2.6 + i * 0.8 + rnd(-0.6, 0.6), 1.1 + rnd(0, 0.5), -3.4 + i * 0.75 + rnd(-0.8, 0.8))], 0.08, 0.02, 5));
      add(fuse(torn), bark);
      const tornLeaves: Blob[] = [];
      for (let i = 0; i < 6; i++) { const size = rnd(0.45, 0.8); tornLeaves.push({ at: v(2.4 + i * 0.6 + rnd(-0.3, 0.3), 0.8 + rnd(0, 0.5), -3.9 + i * 0.6 + rnd(-0.5, 0.5)), size: v(size, size * 0.55, size), color: greenAt(), turn: rnd(0, 6.28) }); }
      root.add(instances(clump(1, 0.25), leafMaterial, tornLeaves));
      // Leaves blown across the boards.
      const litter: Blob[] = [];
      for (let i = 0; i < 60; i++) { const x = rnd(-3.6, 3.6), z = rnd(-4, 4); litter.push({ at: v(x, 0.02, z), size: v(0.13, 0.01, 0.06), color: random() < 0.5 ? '#6f8a3c' : '#9a7a3a', turn: rnd(0, 6.28) }); }
      root.add(instances(new THREE.OctahedronGeometry(1, 0), mossMat, litter));
    }
    if (a.structure === 'research') {
      // The scientists' orange rope, off the limb and down into the green.
      bright.push(limb([v(10.4, 3.9, -0.3), v(10.5, -6, -0.2), v(10.3, -20, -0.3)], 0.035, 0.035, 5));
      bright.push(new THREE.TorusGeometry(0.42, 0.03, 6, 20).rotateY(Math.PI / 2).translate(10.4, 4.15, -0.55));
    }
    if (a.structure === 'tourist') {
      // A painted fingerpost at the head of the left span.
      small.push(new THREE.BoxGeometry(0.1, 2.3, 0.1).translate(-3.9, 1.15, 0.9));
      bright.push(new THREE.BoxGeometry(0.9, 0.2, 0.04).rotateY(0.9).translate(-3.9, 2.05, 0.9), new THREE.BoxGeometry(0.75, 0.2, 0.04).rotateY(-0.5).translate(-3.9, 1.75, 0.9));
    }
    add(fuse(frame), frameMat);
    add(fuse(posts), postMat);
    if (rails.length) add(fuse(rails), railMat);
    if (ropes.length) add(fuse(ropes), ropeMat);
    if (small.length) add(fuse(small), frameMat);
    if (bright.length) add(fuse(bright), new THREE.MeshStandardMaterial({ color: a.structure === 'tourist' ? '#e9d9a0' : '#ef5a2c', roughness: 0.7, emissive: a.structure === 'tourist' ? '#000000' : '#ef5a2c', emissiveIntensity: 0.15 }));
    if (finials.length) root.add(instances(a.structure === 'ancient' ? new THREE.OctahedronGeometry(1, 0) : new THREE.SphereGeometry(1, 8, 6), postMat, finials));

    // Rain.
    if (a.mist === 'rain') {
      const streaks: Blob[] = [];
      for (let i = 0; i < 300; i++) streaks.push({ at: v(rnd(-34, 34), rnd(-10, 20), rnd(-40, 16)), size: v(0.018, rnd(0.6, 1.4), 0.018), color: '#ffffff', tilt: new THREE.Euler(0, 0, 0.16) });
      const rainMesh = instances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#f4f7f8', transparent: true, opacity: 0.5, depthWrite: false }), streaks);
      rainMesh.castShadow = false;
      rainMesh.name = 'rain';
      root.add(rainMesh);
    }

    // Things in the air.
    const fliers = new THREE.Group();
    root.add(fliers);
    const wingers: { mesh: THREE.Object3D; rate: number }[] = [];
    const darkMat = new THREE.MeshStandardMaterial({ color: '#1c1d20', roughness: 0.9, side: THREE.DoubleSide });
    const birdShape = (span: number, body: number) => fuse([
      new THREE.SphereGeometry(1, 8, 6).scale(body, body * 0.28, body * 0.28),
      new THREE.BoxGeometry(span * 0.32, 0.02 * span, span * 0.5).translate(0, 0, span * 0.25).rotateX(-0.3),
      new THREE.BoxGeometry(span * 0.32, 0.02 * span, span * 0.5).translate(0, 0, -span * 0.25).rotateX(0.3),
      new THREE.BoxGeometry(body * 0.9, 0.02 * span, body * 0.25).translate(-body * 1.1, 0, 0),
    ]);
    const flock = (count: number, span: number, body: number, spread: V, centre: V, colour = darkMat) => {
      const geo = birdShape(span, body);
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(geo, colour);
        m.position.set(centre.x + rnd(-1, 1) * spread.x, centre.y + rnd(-1, 1) * spread.y, centre.z + rnd(-1, 1) * spread.z);
        m.rotation.set(rnd(-0.3, 0.3), rnd(-0.3, 0.3), rnd(-0.15, 0.15));
        fliers.add(m);
        wingers.push({ mesh: m, rate: rnd(0.7, 1.3) });
      }
    };
    if (a.life === 'hornbills') flock(3, 1.7, 0.55, v(7, 2, 5), v(-14, 7, -24));
    if (a.life === 'bats') flock(26, 1.2, 0.3, v(34, 4, 10), v(4, 15, -46));
    if (a.life === 'swiftlets') flock(34, 0.45, 0.14, v(11, 5, 7), v(9, 8, -6));
    if (a.life === 'butterflies') {
      const colours = ['#f0b429', '#3aa0d8', '#f1ece0', '#e0562c'];
      for (let i = 0; i < 4; i++) flock(5, 0.34, 0.06, v(6, 2.2, 4), v(1 + i, 2.6, 0.5), new THREE.MeshStandardMaterial({ color: colours[i], roughness: 0.6, side: THREE.DoubleSide, emissive: colours[i], emissiveIntensity: 0.25 }) as never);
    }
    let swinger: THREE.Group | null = null;
    if (a.life === 'gibbon') {
      // Hanging one-armed from the bough that reaches over the left platform.
      const g = new THREE.Group();
      g.position.set(-5.2, 12.1, 0.6);
      const fur = new THREE.MeshStandardMaterial({ color: '#2a2422', roughness: 1 });
      add(fuse([
        limb([v(0, 0, 0), v(0.05, -0.55, 0), v(0.12, -1.05, 0)], 0.055, 0.06, 6),
        new THREE.SphereGeometry(1, 10, 8).scale(0.2, 0.3, 0.17).translate(0.2, -1.4, 0),
        new THREE.SphereGeometry(0.13, 10, 8).translate(0.24, -1.02, 0.03),
        limb([v(0.3, -1.15, 0), v(0.55, -1.45, 0.1), v(0.5, -1.95, 0.1)], 0.05, 0.045, 6),
        limb([v(0.15, -1.65, -0.05), v(0.4, -1.9, 0), v(0.25, -2.25, 0)], 0.06, 0.045, 6),
        limb([v(0.25, -1.65, 0.05), v(0.05, -2.0, 0.1), v(0.2, -2.3, 0.15)], 0.06, 0.045, 6),
      ]), fur, g);
      add(new THREE.SphereGeometry(0.075, 8, 6).scale(1, 1.1, 0.5).translate(0.27, -1.03, 0.13), new THREE.MeshStandardMaterial({ color: '#d9c7a8' }), g);
      g.scale.setScalar(1.25);
      root.add(g);
      swinger = g;
    }

    // Camera. Leaves close to the lens hang into the top of the frame: we are inside the canopy.
    const camera = new THREE.PerspectiveCamera(31, 1, 0.5, 1400);
    const eye = { across: v(-6.5, 6.7, 23), vertigo: v(-5.5, 19, 21), wide: v(-13, 9.5, 42) }[a.view].add(v(rnd(-0.6, 0.6), rnd(-0.3, 0.3), 0));
    const aim = { across: v(1.6, 1.9, -2), vertigo: v(1.4, 0.6, -2.5), wide: v(1.5, 2.6, -5) }[a.view];
    camera.position.copy(eye);
    camera.lookAt(aim);
    root.add(camera);
    const frameLeaves: Blob[] = [];
    for (let i = 0; i < Math.round(mix(7, 13, mood.density)); i++) {
      const sideX = i % 2 ? 1 : -1, s = rnd(0.45, 0.8);
      frameLeaves.push({ at: v(sideX * rnd(1.9, 3.3), rnd(2.3, 2.95), -rnd(7.5, 9.5)), size: v(s * 1.3, s * 0.55, s), color: greenAt().multiplyScalar(0.7), turn: rnd(0, 6.28) });
    }
    const frameMesh = instances(clump(2, 0.22), leafMaterial, frameLeaves);
    frameMesh.castShadow = frameMesh.receiveShadow = false;
    const framing = new THREE.Group();
    framing.add(frameMesh);
    const strands: THREE.BufferGeometry[] = [];
    for (const sx of [-2.75, 2.8, -2.2]) { const len = rnd(1.2, 2.6); strands.push(limb([v(sx, 2.6, -8.5), v(sx + rnd(-0.1, 0.1), 2.6 - len * 0.5, -8.5), v(sx + rnd(-0.2, 0.2), 2.6 - len, -8.5)], 0.022, 0.012, 5)); }
    add(fuse(strands), bark, framing, false);
    camera.add(framing);

    // Standing places.
    interface Slot { at: V; height: number; radius: number }
    const slots: Slot[] = [
      { at: v(0.3, 0, 1.9), height: 5, radius: 2.5 },
      { at: v(-10.2, leftY, -7.0), height: 3.3, radius: 1.7 },
      { at: v(7.7, limbTop + 0.08, -1.2), height: 2.7, radius: 1.15 },
      { at: v(11.7, rightY, -10.4), height: 3.3, radius: 1.7 },
      { at: v(-2.7, 0, -3.0), height: 2.0, radius: 0.85 },
    ];
    const farHero: Slot = { at: v(3.5, surf(3.5, -31) - 3, -31), height: 24, radius: 15 };
    const farSlots: Slot[] = [{ at: v(-25, surf(-25, -44) - 3, -44), height: 17, radius: 11 }, { at: v(24, surf(24, -58) - 3, -58), height: 19, radius: 12 }, { at: v(-6, surf(-6, -80) - 3, -80), height: 22, radius: 14 }, { at: v(40, surf(40, -90) - 3, -90), height: 22, radius: 14 }];

    const energy = mood.energy;
    const place = (items: readonly Placeable[]) => {
      let next = 1, nextFar = 0;
      const focus: THREE.Box3[] = [new THREE.Box3(new THREE.Vector3(-12, -1.5, -10), new THREE.Vector3(13, 5, 4.4))];
      items.forEach((item, index) => {
        const big = item.height > 13 || item.radius > 10;
        let slot: Slot;
        if (index === 0) slot = big ? farHero : slots[0];
        else if (big && nextFar < farSlots.length) slot = farSlots[nextFar++];
        else slot = slots[next++] ?? farSlots[nextFar++ % farSlots.length];
        const scale = Math.min(slot.height / Math.max(item.height, 0.05), slot.radius / Math.max(item.radius, 0.05)) * (item.hero ? 1 : 0.92);
        item.holder.scale.setScalar(scale);
        item.holder.position.copy(slot.at);
        item.holder.rotation.y = Math.atan2(eye.x - slot.at.x, eye.z - slot.at.z) * 0.7 + (context.random() - 0.5) * 0.4;
        item.holder.updateMatrixWorld(true);
        if (slot === farHero || slots.includes(slot)) { const box = visibleBounds(item.holder); if (!box.isEmpty()) { box.min.y = Math.max(box.min.y, slot.at.y); focus.push(box); } }
      });
      // Keep the composition, but step back until everything that matters is inside the frame.
      const back = eye.clone().sub(aim).normalize();
      camera.position.copy(eye);
      const corner = new THREE.Vector3();
      for (let step = 0; step < 24; step++) {
        camera.lookAt(aim);
        camera.updateMatrixWorld(true);
        let out = false;
        for (const box of focus)
          for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
            corner.set(x, y, z).project(camera);
            if (Math.abs(corner.x) > 0.95 || corner.y > 0.9 || corner.y < -0.97) out = true;
          }
        if (!out) break;
        camera.position.addScaledVector(back, 1.6);
      }
      camera.updateProjectionMatrix();
      // Sun: low from the left at dawn, high at noon, low from the right at dusk.
      const centre = v(0, 0, -4);
      const sunDir = v(mix(-0.9, 0.9, d), mix(0.42, 1.1, 1 - Math.abs(d - 0.5) * 2), 0.5).normalize();
      key.target.position.copy(centre);
      key.position.copy(centre).addScaledVector(sunDir, 90);
      const shadow = key.shadow.camera;
      const reach = focus.length > 1 && focus.some((box) => box.max.z < -20 || box.max.y > 12) ? 44 : 27;
      shadow.left = shadow.bottom = -reach;
      shadow.right = shadow.top = reach;
      shadow.near = 1;
      shadow.far = 240;
      shadow.updateProjectionMatrix();
    };

    return {
      object: root,
      camera,
      background,
      capacity: 5,
      ground,
      keyLight: key,
      place,
      update(dt, time) {
        for (const s of sway) s.group.quaternion.setFromAxisAngle(s.axis, Math.sin(time * 0.9 + s.phase) * mix(0.004, 0.05, energy));
        drift.position.x = Math.sin(time * 0.05) * 8;
        fliers.position.x = Math.sin(time * mix(0.03, 0.14, energy)) * 9;
        for (const w of wingers) w.mesh.rotation.x = Math.sin(time * mix(1.5, 7, energy) * w.rate) * 0.35;
        steam.position.y = (time * 0.15) % 0.3;
        for (const glow of glows) glow.emissiveIntensity = mix(1.2, 2.6, Math.abs(d - 0.5) * 2) * (1 + Math.sin(time * 8) * 0.08 * energy);
        if (swinger) swinger.rotation.z = Math.sin(time * 1.1) * mix(0.03, 0.3, energy);
        framing.rotation.z = Math.sin(time * 0.5) * 0.004 * (1 + energy * 3);
        void dt;
      },
      dispose() {
        key.shadow.map?.dispose();
        disposeTree(root);
      },
    };
  },
});
