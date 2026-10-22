import * as THREE from 'three';
import { Sculpture, type Placeable, choice, clamp01, defineWorld, disposeTree, mix, score, visibleBounds } from '@conjure/kit';

type V3 = readonly [number, number, number];
interface Dot { at: V3; size: number; color?: THREE.ColorRepresentation }

const STONES = {
  granite: { wall: '#a9a394', step: '#bfb8a7', trim: '#8c8678' },
  laterite: { wall: '#a8644a', step: '#bd8f76', trim: '#8a4e3a' },
  whitewash: { wall: '#e8e2d2', step: '#d2cbb9', trim: '#c9892e' },
  sandstone: { wall: '#c9a56c', step: '#d8bc8e', trim: '#a8854f' },
} as const;

// The stair, in metres: foot at +z, shrine at -z.
const SW = 2.1, RISE = 0.3, RUN = 0.4;
const LY = RISE * 7, TY = LY + RISE * 8;
const Z_FOOT = 5.8, Z_LAND = 3.0, Z_UP = -0.2, Z_TOP = -3.4, Z_BACK = -7.4, HALF = 6;
const SLOTS: readonly { at: V3; radius: number; height: number }[] = [
  { at: [0, LY, 1.45], radius: 1.6, height: 3.4 },
  { at: [-4.05, LY + 0.5, 1.35], radius: 1.15, height: 2.5 },
  { at: [4.2, 0, 5.5], radius: 1.25, height: 2.5 },
  { at: [4.0, TY, -4.6], radius: 1.1, height: 2.3 },
  { at: [-4.2, 0, 5.5], radius: 1.25, height: 2.5 },
  { at: [4.05, LY + 0.5, 1.2], radius: 1.15, height: 2.5 },
  { at: [-4.2, TY, -4.4], radius: 1.0, height: 2.1 },
];

export default defineWorld({
  questions: {
    shrine: choice('What stands at the top of the stairs?', {
      stupa: 'A whitewashed stupa dome with painted eyes on a gilded cube and a ringed golden spire.',
      gopuram: 'A stepped stone gopuram tower, tier on tier of carved granite with a barrel cap.',
      prang: 'A dark red Khmer prang, a corn-cob tower of laterite with small porches.',
      pagoda: 'A brick pagoda temple with three tiled roofs stacked under a gilt pinnacle.',
    }),
    guardians: choice('What guards the balustrades?', {
      lions: 'Pairs of stone lions seated on the piers, manes curled, mouths open.',
      nagas: 'Naga serpents: scaled bodies run down the balustrades and rear up in many-headed hoods at the foot.',
      bells: 'Plain piers, each carrying a brass bell under a small arch.',
    }),
    dressing: choice('What has been strung up?', {
      flags: 'Lines of five-coloured prayer flags running from the spire to poles.',
      garlands: 'Swags of marigold garlands across the stairs and along the rails.',
      both: 'Flags overhead and marigolds below: everything at once.',
      bare: 'Nothing: bare stone.',
    }),
    state: choice('What kind of day is it at the temple?', {
      festival: 'A festival morning: oil lamps on every step, petals underfoot, fresh colour everywhere.',
      ordinary: 'An ordinary hot day, a few offerings, the usual dust.',
      monsoon: 'After monsoon rain: dark wet stone, puddles on the landing, moss creeping up the walls.',
      abandoned: 'Abandoned: banyan roots have split the masonry, grass grows in the treads, nobody sweeps.',
    }),
    fixture: choice('What stands on the mid landing against the wall?', {
      bells: 'A frame of hanging brass bells for pilgrims to ring.',
      wheels: 'A red wall of brass prayer wheels.',
      lamp: 'A tall stone lamp pillar ringed with oil cups.',
      stall: 'An offering stall under a parasol: baskets of marigolds, bananas and coconuts.',
    }),
    troop: score('How many monkeys are sitting on the walls and roofs?', ['None in sight', 'A watchful few', 'A troop on every ledge', 'Swarming: they own the place']),
    stone: choice('What is it all built of?', {
      granite: 'Grey-tan granite blocks.',
      laterite: 'Red-brown laterite and brick.',
      whitewash: 'Whitewashed masonry with ochre trim.',
      sandstone: 'Honey-gold sandstone.',
    }),
    view: choice('Where is the camera?', {
      model: 'A three-quarter view from above, the whole climb laid out like a model.',
      foot: 'Low near the foot of the stairs, looking up at the shrine.',
      high: 'High overhead, steps and landings like a diagram.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const art = new Sculpture(context);
    const root = art.root;
    const wet = a.state === 'monsoon', festival = a.state === 'festival', abandoned = a.state === 'abandoned';
    const over = clamp01(mood.wear * 0.7 + (abandoned ? 0.55 : 0) + (wet ? 0.15 : 0));
    const crowd = clamp01(mood.density * 0.7 + (festival ? 0.45 : 0) - (abandoned ? 0.3 : 0));
    const palette = STONES[a.stone];
    const damp = (hex: string) => new THREE.Color(hex).multiplyScalar(wet ? 0.74 : 1).lerp(new THREE.Color('#6f7458'), over * 0.22);
    const rough = wet ? 0.45 : 0.9;

    // Sky, sun.
    const background = new THREE.Color('#dde6ea').lerp(new THREE.Color('#f1e4c6'), mood.warmth).lerp(new THREE.Color('#c9d0d1'), wet ? 0.6 : 0).lerp(new THREE.Color('#f0c9a0'), Math.abs(mood.daylight - 0.5) * 0.5);
    root.add(new THREE.HemisphereLight('#fff6e4', '#8a7a66', wet ? 1.5 : 1.15));
    const key = new THREE.DirectionalLight(new THREE.Color('#fff3dc').lerp(new THREE.Color('#ffd49a'), mood.warmth * 0.6 + Math.abs(mood.daylight - 0.5) * 0.6), wet ? 2.2 : 3.3);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0003;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#d9e6ff', 0.5);
    fill.position.set(8, 5, -6);
    root.add(fill);

    // Masonry texture.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const wallColour = damp(palette.wall);
    ctx.fillStyle = `#${wallColour.clone().offsetHSL(0, 0, -0.07).getHexString()}`;
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 5; row++) {
      let x = row % 2 ? -30 : 0;
      while (x < 256) {
        const w = 44 + random() * 46;
        const shade = wallColour.clone().offsetHSL(0, 0, (random() - 0.5) * 0.05);
        ctx.fillStyle = `#${shade.getHexString()}`;
        ctx.fillRect(x + 1, row * 51.2 + 1, w - 2, 49.2);
        if (random() < over * 0.6) {
          ctx.fillStyle = 'rgba(70,90,45,0.45)';
          ctx.fillRect(x + 2, row * 51.2 + 30 + random() * 10, w - 4, 12);
        }
        x += w;
      }
    }
    if (a.stone === 'whitewash') {
      ctx.fillStyle = `#${damp(palette.trim).getHexString()}`;
      ctx.fillRect(0, 0, 256, 8);
    }
    const masonry = new THREE.CanvasTexture(canvas);
    masonry.colorSpace = THREE.SRGBColorSpace;
    masonry.wrapS = masonry.wrapT = THREE.RepeatWrapping;
    const wallMat = new THREE.MeshStandardMaterial({ map: masonry, roughness: rough });
    const stepMat = new THREE.MeshStandardMaterial({ color: damp(palette.step), roughness: rough });
    const stepMat2 = new THREE.MeshStandardMaterial({ color: damp(palette.step).offsetHSL(0, 0, -0.045), roughness: rough });
    const trimMat = new THREE.MeshStandardMaterial({ color: damp(palette.trim), roughness: rough });
    const gold = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9a737').lerp(new THREE.Color('#8f8356'), over * 0.5), metalness: 0.8, roughness: 0.3 + over * 0.3, emissive: '#6b4a08', emissiveIntensity: 0.3 });
    const brass = new THREE.MeshStandardMaterial({ color: '#c0922f', metalness: 0.85, roughness: 0.35, emissive: '#3d2a05', emissiveIntensity: 0.4 });
    const dark = new THREE.MeshStandardMaterial({ color: '#2a2320', roughness: 1 });
    const white = new THREE.MeshStandardMaterial({ color: damp('#f1ede2'), roughness: rough });
    const flameMat = new THREE.MeshStandardMaterial({ color: '#ffd76a', emissive: '#ff9a1c', emissiveIntensity: 2 });
    /** A masonry block whose courses stay 0.4 m tall whatever its size. */
    const wall = (size: V3, at: V3) => {
      const geometry = new THREE.BoxGeometry(...size);
      const uv = geometry.attributes.uv;
      const dims = [[size[2], size[1]], [size[2], size[1]], [size[0], size[2]], [size[0], size[2]], [size[0], size[1]], [size[0], size[1]]];
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * dims[Math.floor(i / 4)][0] / 2, uv.getY(i) * dims[Math.floor(i / 4)][1] / 2);
      return art.mesh(geometry, wallMat, at);
    };

    // Ground, hill terraces and the two flights.
    const ground = art.box([HALF * 2 + 0.6, 0.3, 15.4], [0, -0.15, 0], new THREE.MeshStandardMaterial({ color: damp('#b9a98c'), roughness: 1 }));
    wall([HALF * 2, LY, Z_LAND - Z_BACK], [0, LY / 2, (Z_LAND + Z_BACK) / 2]);
    wall([HALF * 2, TY - LY, Z_TOP - Z_BACK], [0, (TY + LY) / 2, (Z_TOP + Z_BACK) / 2]);
    art.box([HALF * 2, 0.04, Z_LAND - Z_TOP], [0, LY - 0.018, (Z_LAND + Z_TOP) / 2], stepMat);
    art.box([HALF * 2, 0.04, Z_TOP - Z_BACK], [0, TY - 0.018, (Z_TOP + Z_BACK) / 2], stepMat);
    art.box([HALF * 2 + 0.16, 0.1, 0.5], [0, LY - 0.05, Z_LAND - 0.17], trimMat);
    art.box([HALF * 2 + 0.16, 0.1, 0.5], [0, TY - 0.05, Z_TOP - 0.17], trimMat);
    const flight = (z0: number, y0: number, steps: number) => {
      for (let i = 0; i < steps; i++) {
        const loose = random() < over * 0.35;
        const step = art.box([SW * 2, RISE * (i + 1), RUN], [loose ? (random() - 0.5) * 0.12 : 0, y0 + RISE * (i + 1) / 2 - (loose ? 0.03 : 0), z0 - RUN * i - RUN / 2], i % 2 ? stepMat : stepMat2);
        if (loose) step.rotation.z = (random() - 0.5) * 0.03;
      }
    };
    flight(Z_FOOT, 0, 7);
    flight(Z_UP, LY, 8);
    /** A balustrade wall in side profile, following the slope. */
    const stringer = (x: number, z0: number, y0: number, z1: number, y1: number, height: number) => {
      const shape = new THREE.Shape([new THREE.Vector2(-z0, 0), new THREE.Vector2(-z1, 0), new THREE.Vector2(-z1, y1 - y0 + height), new THREE.Vector2(-z0, height)]);
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.36, bevelEnabled: false });
      geometry.rotateY(Math.PI / 2);
      return art.mesh(geometry, trimMat, [x - 0.18, y0, 0]);
    };
    const railHeight = a.guardians === 'nagas' ? 0.32 : 0.6;
    const piers: { at: V3; top: number; big: boolean; foot: boolean }[] = [];
    for (const side of [-1, 1]) {
      const x = side * (SW + 0.18);
      stringer(x, Z_FOOT + 0.1, 0, Z_LAND, LY, railHeight);
      stringer(x, Z_UP + 0.1, LY, Z_TOP, TY, railHeight);
      for (const [z, y, h, big, foot] of [[Z_FOOT + 0.42, 0, 1.15, true, true], [Z_LAND - 0.38, LY, 0.95, false, false], [Z_UP + 0.42, LY, 1.05, false, true], [Z_TOP - 0.38, TY, 0.95, false, false]] as const) {
        const px = side * (SW + 0.36);
        wall([0.78, h, 0.78], [px, y + h / 2, z]);
        art.box([0.9, 0.1, 0.9], [px, y + h + 0.05, z], trimMat);
        piers.push({ at: [px, y + h + 0.1, z], top: y + h + 0.1, big, foot });
      }
    }
    // Slot plinths on the landing.
    for (const x of [-4.05, 4.05]) {
      wall([2.3, 0.5, 2.3], [x, LY + 0.25, x < 0 ? 1.35 : 1.2]);
      art.box([2.42, 0.08, 2.42], [x, LY + 0.5 - 0.04, x < 0 ? 1.35 : 1.2], trimMat);
    }
    // Worn-off blocks at the foot.
    for (let i = 0; i < Math.round(over * 7); i++) {
      const block = art.box([0.3 + random() * 0.3, 0.2 + random() * 0.15, 0.25 + random() * 0.2], [(random() < 0.5 ? -1 : 1) * (2.9 + random() * 2.6), 0.1, 3.6 + random() * 3.4], trimMat);
      block.rotation.set((random() - 0.5) * 0.5, random() * 3, (random() - 0.5) * 0.4);
    }

    // Guardians.
    const bells: THREE.Object3D[] = [];
    const bellProfile = [[0, 0.3], [0.05, 0.3], [0.085, 0.24], [0.1, 0.1], [0.16, 0], [0.13, 0], [0.08, 0.1], [0, 0.22]].map(([x, y]) => new THREE.Vector2(x, y));
    const bellGeometry = new THREE.LatheGeometry(bellProfile, 16);
    bellGeometry.translate(0, -0.3, 0);
    const bell = (at: V3, size: number) => {
      const b = new THREE.Mesh(bellGeometry, brass);
      b.position.set(...at);
      b.scale.setScalar(size);
      b.castShadow = true;
      b.userData.phase = random() * 6;
      root.add(b);
      bells.push(b);
      return b;
    };
    if (a.guardians === 'lions') {
      const stone = new THREE.MeshStandardMaterial({ color: damp(palette.trim).offsetHSL(0, 0, 0.08), roughness: rough });
      for (const pier of piers.filter((p) => p.foot)) {
        const g = new Sculpture(context);
        g.ball([0.26, 0.28, 0.34], [0, 0.28, -0.06], stone, 14);
        g.ball([0.22, 0.32, 0.2], [0, 0.46, 0.14], stone, 14);
        for (const side of [-1, 1]) {
          g.cylinder(0.07, 0.085, 0.5, [side * 0.14, 0.25, 0.27], stone, 10);
          g.ball([0.1, 0.06, 0.13], [side * 0.14, 0.05, 0.32], stone, 8);
          g.ball([0.05, 0.05, 0.04], [side * 0.1, 0.9, 0.42], white, 8);
          g.ball([0.025, 0.025, 0.02], [side * 0.1, 0.9, 0.455], dark, 6);
          g.ball([0.06, 0.08, 0.04], [side * 0.2, 1.04, 0.2], stone, 8);
        }
        g.ball([0.24, 0.24, 0.24], [0, 0.84, 0.22], stone, 14);
        g.ball([0.16, 0.12, 0.14], [0, 0.76, 0.42], stone, 10);
        g.box([0.2, 0.07, 0.06], [0, 0.71, 0.5], dark);
        g.box([0.2, 0.025, 0.03], [0, 0.745, 0.535], white);
        const curls: Dot[] = [];
        for (let i = 0; i < 11; i++) {
          const t = (i / 11) * Math.PI * 2;
          curls.push({ at: [Math.sin(t) * 0.27, 0.84 + Math.cos(t) * 0.27, 0.12], size: 0.1 });
          curls.push({ at: [Math.sin(t + 0.3) * 0.2, 0.6 + Math.cos(t + 0.3) * 0.2 * 0.6, -0.02], size: 0.09 });
        }
        g.scatter(new THREE.IcosahedronGeometry(1, 1), stone, curls);
        g.tube([[0, 0.2, -0.38], [0, 0.5, -0.5], [0, 0.82, -0.4], [0, 0.9, -0.24]], 0.045, stone);
        if (festival || crowd > 0.6) g.ball([0.05, 0.08, 0.03], [0, 0.97, 0.43], new THREE.MeshStandardMaterial({ color: '#e8261c', emissive: '#b01208', emissiveIntensity: 0.5 }), 8);
        g.root.position.set(pier.at[0], pier.top, pier.at[2]);
        g.root.scale.setScalar(pier.big ? 1.45 : 1.1);
        root.add(g.root);
      }
    } else if (a.guardians === 'nagas') {
      const scale = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3f8a5c').lerp(new THREE.Color('#77786a'), over * 0.6), roughness: 0.5, metalness: 0.2 });
      for (const side of [-1, 1]) for (const [z0, y0, z1, y1, big] of [[Z_FOOT + 0.42, 0, Z_LAND, LY, true], [Z_UP + 0.42, LY, Z_TOP, TY, false]] as const) {
        const x = side * (SW + 0.18), k = big ? 1.3 : 1;
        art.tube([[x, y1 + 0.55, z1 - 0.5], [x, y1 + 0.5, z1 - 0.1], [x, mix(y0, y1, 0.5) + 0.5, mix(z0, z1, 0.55)], [x, y0 + 0.62, z0 - 0.45], [side * (SW + 0.36), y0 + 1.3 * k, z0 - 0.1], [side * (SW + 0.36), y0 + 1.9 * k, z0 + 0.05]], 0.17, scale);
        const hood = new Sculpture(context);
        hood.ball([0.62, 0.7, 0.07], [0, 0.35, -0.06], gold, 14);
        for (let i = -2; i <= 2; i++) {
          const t = i * 0.42;
          hood.ball([0.1, 0.14, 0.12], [Math.sin(t) * 0.5, 0.25 + Math.cos(t) * 0.55, 0.06], scale, 10);
          hood.ball([0.03, 0.03, 0.03], [Math.sin(t) * 0.5 - 0.04, 0.29 + Math.cos(t) * 0.55, 0.16], gold, 6);
          hood.ball([0.03, 0.03, 0.03], [Math.sin(t) * 0.5 + 0.04, 0.29 + Math.cos(t) * 0.55, 0.16], gold, 6);
          hood.box([0.03, 0.14, 0.02], [Math.sin(t) * 0.5, 0.14 + Math.cos(t) * 0.55, 0.19], new THREE.MeshStandardMaterial({ color: '#c62828' }));
        }
        hood.root.position.set(side * (SW + 0.36), y0 + 1.75 * k, z0 + 0.08);
        hood.root.scale.setScalar(k);
        root.add(hood.root);
      }
    } else {
      for (const pier of piers) {
        for (const dx of [-0.3, 0.3]) art.rod([pier.at[0] + dx, pier.top, pier.at[2]], [pier.at[0] + dx, pier.top + 0.8, pier.at[2]], 0.045, trimMat);
        art.box([0.78, 0.1, 0.16], [pier.at[0], pier.top + 0.82, pier.at[2]], trimMat);
        bell([pier.at[0], pier.top + 0.77, pier.at[2]], pier.big ? 1.5 : 1.25);
      }
    }

    // The shrine.
    const shrine = new Sculpture(context);
    let spire = 5;
    if (a.shrine === 'stupa') {
      wall([3.9, 0.5, 3.3], [0, 0.25, 0]);
      const top = root.children[root.children.length - 1];
      root.remove(top);
      shrine.root.add(top);
      shrine.box([3.3, 0.3, 2.9], [0, 0.65, 0], white);
      const dome = shrine.mesh(new THREE.SphereGeometry(1.35, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), white, [0, 0.8, 0]);
      dome.scale.y = 1.05;
      const eyes = document.createElement('canvas');
      eyes.width = eyes.height = 128;
      const e = eyes.getContext('2d')!;
      e.fillStyle = '#d9a737';
      e.fillRect(0, 0, 128, 128);
      e.strokeStyle = '#1b2a6b';
      e.lineWidth = 6;
      for (const cx of [38, 90]) {
        e.fillStyle = '#ffffff';
        e.beginPath();
        e.ellipse(cx, 56, 24, 11, 0, 0, Math.PI * 2);
        e.fill();
        e.stroke();
        e.fillStyle = '#12163a';
        e.beginPath();
        e.arc(cx, 54, 9, 0, Math.PI * 2);
        e.fill();
        e.beginPath();
        e.moveTo(cx - 26, 36);
        e.quadraticCurveTo(cx, 22, cx + 26, 36);
        e.stroke();
      }
      e.strokeStyle = '#b01208';
      e.beginPath();
      e.arc(64, 96, 9, Math.PI * 0.2, Math.PI * 1.6);
      e.stroke();
      e.fillStyle = '#b01208';
      e.beginPath();
      e.arc(64, 24, 6, 0, Math.PI * 2);
      e.fill();
      const eyeTexture = new THREE.CanvasTexture(eyes);
      eyeTexture.colorSpace = THREE.SRGBColorSpace;
      const eyeMat = new THREE.MeshStandardMaterial({ map: eyeTexture, roughness: 0.5, metalness: 0.3, emissive: '#3a2804', emissiveIntensity: 0.4 });
      shrine.mesh(new THREE.BoxGeometry(0.95, 0.8, 0.95), [eyeMat, eyeMat, gold, gold, eyeMat, eyeMat] as unknown as THREE.Material, [0, 2.6, 0]);
      const rings: [number, number][] = [[0, 0]];
      for (let i = 0; i < 13; i++) {
        const y = i * 0.13, w = 0.52 - i * 0.032;
        rings.push([w, y], [w, y + 0.07], [w - 0.07, y + 0.08], [w - 0.07, y + 0.13]);
      }
      rings.push([0, 13 * 0.13]);
      shrine.lathe(rings, gold, [0, 3.0, 0]);
      shrine.lathe([[0, 0], [0.34, 0], [0.3, 0.08], [0.06, 0.14], [0.1, 0.24], [0.02, 0.5], [0, 0.56]], gold, [0, 4.72, 0]);
      spire = 5.25;
    } else if (a.shrine === 'gopuram') {
      const granite = new THREE.MeshStandardMaterial({ color: damp(palette.wall).offsetHSL(0, 0, 0.03), roughness: rough });
      const cornice = trimMat;
      shrine.box([3.6, 1.4, 2.5], [0, 0.7, 0], granite);
      shrine.box([0.95, 1.05, 0.1], [0, 0.55, 1.22], dark);
      for (const x of [-1.5, -0.75, 0.75, 1.5]) shrine.box([0.2, 1.4, 0.12], [x, 0.7, 1.26], cornice);
      const niches: Dot[] = [];
      let y = 1.4, w = 3.5, d = 2.4;
      for (let tier = 0; tier < 4; tier++) {
        shrine.box([w + 0.2, 0.12, d + 0.2], [0, y + 0.06, 0], cornice);
        shrine.box([w, 0.6, d], [0, y + 0.42, 0], granite);
        for (let i = 0; i < 5 - tier; i++) niches.push({ at: [(i - (4 - tier) / 2) * (w / (5.6 - tier)), y + 0.42, d / 2 + 0.02], size: 0.2 });
        y += 0.72;
        w *= 0.8;
        d *= 0.8;
      }
      shrine.scatter(new THREE.BoxGeometry(1, 1.7, 0.4), cornice, niches);
      shrine.box([w + 0.5, 0.12, d + 0.4], [0, y + 0.06, 0], cornice);
      const barrel = shrine.mesh(new THREE.CylinderGeometry(d * 0.55, d * 0.55, w + 0.3, 20, 1, false, 0, Math.PI), granite, [0, y + 0.1, 0]);
      barrel.rotation.set(0, 0, Math.PI / 2);
      barrel.rotation.x = Math.PI / 2;
      for (let i = -2; i <= 2; i++) shrine.lathe([[0, 0], [0.07, 0], [0.1, 0.08], [0.03, 0.16], [0.05, 0.22], [0, 0.34]], gold, [i * (w / 5), y + 0.1 + d * 0.53, 0]);
      spire = y + 0.5 + d * 0.55;
    } else if (a.shrine === 'prang') {
      const laterite = new THREE.MeshStandardMaterial({ color: damp('#8f4f3c').lerp(new THREE.Color('#5d5a4c'), over * 0.3), roughness: 1, flatShading: true });
      shrine.box([3.6, 0.5, 3.2], [0, 0.25, 0], laterite);
      shrine.box([3.0, 0.4, 2.7], [0, 0.7, 0], laterite);
      const profile: [number, number][] = [[0, 0], [1.2, 0], [1.2, 1.1]];
      for (let i = 0; i < 6; i++) {
        const y = 1.1 + i * 0.5, w = 1.22 - i * 0.16 - i * i * 0.012;
        profile.push([w + 0.1, y], [w + 0.1, y + 0.12], [w, y + 0.16], [w - 0.05, y + 0.5]);
      }
      profile.push([0.2, 4.2], [0.26, 4.4], [0, 4.85]);
      shrine.mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 12), laterite, [0, 0.9, 0]);
      for (let i = 0; i < 4; i++) {
        const porch = new Sculpture(context);
        porch.box([0.9, 1.1, 0.5], [0, 0.55, 1.25], laterite);
        porch.box([0.5, 0.8, 0.06], [0, 0.42, 1.5], dark);
        const pediment = porch.mesh(new THREE.ConeGeometry(0.62, 0.6, 3), laterite, [0, 1.4, 1.3]);
        pediment.scale.z = 0.4;
        pediment.rotation.y = Math.PI;
        porch.root.position.y = 0.9;
        porch.root.rotation.y = (i * Math.PI) / 2;
        shrine.root.add(porch.root);
      }
      spire = 5.75;
    } else {
      const brick = new THREE.MeshStandardMaterial({ color: damp('#a8553c'), roughness: rough });
      const tile = new THREE.MeshStandardMaterial({ color: damp('#6b3a2c').lerp(new THREE.Color('#55604a'), over * 0.4), roughness: 0.9, flatShading: true });
      const timber = new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 0.8 });
      shrine.box([3.5, 0.4, 3.1], [0, 0.2, 0], trimMat);
      let y = 0.4;
      for (const [body, height, eave] of [[2.3, 1.5, 2.55], [1.5, 0.8, 1.8], [0.9, 0.6, 1.2]] as const) {
        shrine.box([body, height, body], [0, y + height / 2, 0], brick);
        shrine.box([body + 0.12, 0.14, body + 0.12], [0, y + height - 0.07, 0], timber);
        const roof = shrine.mesh(new THREE.ConeGeometry(eave, 0.75, 4), tile, [0, y + height + 0.36, 0]);
        roof.rotation.y = Math.PI / 4;
        for (let i = 0; i < 4; i++) {
          const t = (i * Math.PI) / 2 + Math.PI / 4, r0 = body * 0.7, r1 = eave * 0.9;
          shrine.rod([Math.sin(t) * r0, y + height * 0.55, Math.cos(t) * r0], [Math.sin(t) * r1, y + height + 0.03, Math.cos(t) * r1], 0.05, timber);
        }
        y += height + 0.5;
      }
      shrine.box([0.8, 1.05, 0.1], [0, 0.95, 1.16], dark);
      shrine.ring(0.5, 0.07, [0, 1.42, 1.2], gold, Math.PI);
      for (const side of [-1, 1]) shrine.box([0.14, 1.05, 0.14], [side * 0.5, 0.95, 1.2], gold);
      shrine.lathe([[0, 0], [0.2, 0], [0.26, 0.12], [0.08, 0.26], [0.14, 0.4], [0.04, 0.56], [0.03, 0.9], [0, 0.95]], gold, [0, y + 0.1, 0]);
      spire = y + 1.05;
    }
    shrine.root.position.set(0, TY, -5.65);
    root.add(shrine.root);
    const apex: V3 = [0, TY + spire, -5.65];

    // Landing fixtures, back against the terrace wall.
    const spinners: THREE.Object3D[] = [];
    const flames: Dot[] = [];
    const fx = -4.1, fz = -2.35;
    const petals: Dot[] = [], pompoms: Dot[] = [];
    if (a.fixture === 'bells') {
      for (const dx of [-1.4, 1.4]) art.box([0.2, 2.0, 0.2], [fx + dx, LY + 1.0, fz], trimMat);
      art.box([3.3, 0.2, 0.26], [fx, LY + 2.05, fz], trimMat);
      art.box([3.6, 0.1, 0.4], [fx, LY + 2.2, fz], new THREE.MeshStandardMaterial({ color: damp('#a8322a'), roughness: 0.7 }));
      for (let i = 0; i < 5; i++) {
        art.rod([fx - 1 + i * 0.5, LY + 1.95, fz], [fx - 1 + i * 0.5, LY + 1.72, fz], 0.012, dark);
        bell([fx - 1 + i * 0.5, LY + 1.74, fz], i === 2 ? 1.9 : 1.2 + (i % 2) * 0.25);
      }
    } else if (a.fixture === 'wheels') {
      const red = new THREE.MeshStandardMaterial({ color: damp('#a8322a'), roughness: 0.8 });
      art.box([3.6, 0.5, 0.7], [fx, LY + 0.25, fz], red);
      art.box([3.6, 0.28, 0.7], [fx, LY + 1.55, fz], red);
      art.box([3.8, 0.1, 0.9], [fx, LY + 1.74, fz], gold);
      for (const dx of [-1.7, 1.7]) art.box([0.2, 1.4, 0.7], [fx + dx, LY + 0.9, fz], red);
      for (let i = 0; i < 5; i++) {
        const wheel = new THREE.Group();
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.62, 16), brass);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.12, 16), new THREE.MeshStandardMaterial({ color: '#7a2a1c', roughness: 0.6 }));
        const knob = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.08), gold);
        knob.position.set(0.24, 0, 0);
        wheel.add(drum, band, knob);
        wheel.position.set(fx - 1.28 + i * 0.64, LY + 0.96, fz + 0.08);
        wheel.traverse((n) => { n.castShadow = true; });
        root.add(wheel);
        spinners.push(wheel);
      }
    } else if (a.fixture === 'lamp') {
      art.box([1.1, 0.4, 1.1], [fx, LY + 0.2, fz], trimMat);
      art.cylinder(0.2, 0.34, 3.2, [fx, LY + 2.0, fz], trimMat, 8);
      for (let tier = 0; tier < 6; tier++) {
        const y = LY + 0.85 + tier * 0.5, ringR = 0.55 - tier * 0.05;
        art.cylinder(ringR, ringR - 0.08, 0.07, [fx, y, fz], trimMat, 8);
        for (let i = 0; i < 8; i++) flames.push({ at: [fx + Math.cos(i * 0.785) * ringR, y + 0.09, fz + Math.sin(i * 0.785) * ringR], size: 1 });
      }
      art.lathe([[0, 0], [0.26, 0], [0.3, 0.1], [0.1, 0.2], [0, 0.42]], gold, [fx, LY + 3.6, fz]);
    } else {
      const wood = new THREE.MeshStandardMaterial({ color: '#8a6238', roughness: 0.9 });
      art.box([2.4, 0.08, 1.1], [fx, LY + 0.8, fz + 0.2], wood);
      for (const dx of [-1.1, 1.1]) for (const dz of [-0.25, 0.65]) art.box([0.08, 0.8, 0.08], [fx + dx, LY + 0.4, fz + dz], wood);
      art.rod([fx - 0.2, LY, fz - 0.4], [fx - 0.1, LY + 2.5, fz - 0.1], 0.04, wood);
      const shade = art.mesh(new THREE.ConeGeometry(1.5, 0.5, 10), new THREE.MeshStandardMaterial({ color: new THREE.Color(['#d9251d', '#f0b414', '#2f8f6a'][Math.floor(random() * 3)]).lerp(new THREE.Color('#a39a88'), over * 0.5), roughness: 0.8, flatShading: true }), [fx - 0.1, LY + 2.6, fz - 0.05]);
      shade.rotation.z = 0.08;
      for (const [dx, hue] of [[-0.8, 0], [0, 1], [0.8, 2]] as const) {
        art.cylinder(0.32, 0.24, 0.2, [fx + dx, LY + 0.94, fz + 0.2], new THREE.MeshStandardMaterial({ color: '#b98b54', roughness: 1 }), 12);
        for (let i = 0; i < 16; i++) {
          const t = random() * 6.28, d = Math.sqrt(random()) * 0.25;
          pompoms.push({ at: [fx + dx + Math.cos(t) * d, LY + 1.07 + (0.25 - d) * 0.4, fz + 0.2 + Math.sin(t) * d], size: 0.085, color: hue === 0 ? '#f58a0c' : hue === 1 ? '#f1c232' : i % 3 ? '#6b4a2c' : '#f4f1e6' });
        }
      }
    }
    // A wayside niche on the other side: an orange idol under a red flag.
    {
      const nx = 4.2, nz = -2.6;
      wall([1.5, 1.7, 1.0], [nx, LY + 0.85, nz]);
      art.box([0.8, 1.0, 0.1], [nx, LY + 0.85, nz + 0.47], dark);
      const sindoor = new THREE.MeshStandardMaterial({ color: '#f0651a', roughness: 0.7, emissive: '#a83a05', emissiveIntensity: 0.35 });
      art.ball([0.24, 0.34, 0.14], [nx, LY + 0.72, nz + 0.5], sindoor, 12);
      art.ball([0.17, 0.17, 0.13], [nx, LY + 1.14, nz + 0.52], sindoor, 12);
      const cap = art.mesh(new THREE.ConeGeometry(1.15, 0.7, 4), trimMat, [nx, LY + 2.05, nz]);
      cap.rotation.y = Math.PI / 4;
      art.rod([nx, LY + 2.3, nz], [nx, LY + 3.5, nz], 0.025, dark);
      const pennant = art.mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.45, 0), new THREE.Vector3(0.75, -0.22, 0)]), new THREE.MeshStandardMaterial({ color: '#e8361c', side: THREE.DoubleSide, emissive: '#8a1505', emissiveIntensity: 0.3 }), [nx, LY + 3.5, nz]);
      pennant.geometry.computeVertexNormals();
    }

    // Banyan and its roots.
    const leaf = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3f6b35').lerp(new THREE.Color('#6f7a3a'), mood.warmth * 0.4).multiplyScalar(wet ? 0.85 : 1), roughness: 1, flatShading: true });
    const bark = new THREE.MeshStandardMaterial({ color: damp('#8b7d68'), roughness: 1 });
    const bx = -5.0, bz = -6.4;
    for (let i = 0; i < 5; i++) {
      const t = i * 1.26, lean = 0.25 + random() * 0.2;
      art.tube([[bx + Math.cos(t) * 0.45, TY - 0.1, bz + Math.sin(t) * 0.45], [bx + Math.cos(t) * 0.2, TY + 1.2, bz + Math.sin(t) * 0.2], [bx + Math.cos(t + 1) * lean, TY + 2.4, bz + Math.sin(t + 1) * lean], [bx + Math.cos(t) * 1.1, TY + 3.5, bz + Math.sin(t) * 1.1]], 0.2 - i * 0.015, bark);
    }
    const crowns: [number, number, number, number][] = [[bx, 4.3, bz, 1.7], [bx + 1.5, 3.8, bz + 0.3, 1.2], [bx - 0.6, 3.9, bz + 1.5, 1.25], [bx + 0.6, 5.0, bz - 0.6, 1.2], [5.8, 2.6, -6.7, 1.5], [6.3, 1.2, -4.6, 1.2], [4.6, 3.4, -7.3, 1.1], [-6.2, 0.6, -2.4, 1.15]];
    for (const [x, y, z, size] of crowns) {
      const blob = art.mesh(new THREE.IcosahedronGeometry(size, 1), leaf, [x, TY + y, z]);
      blob.scale.y = 0.75;
      blob.rotation.set(random() * 3, random() * 3, 0);
    }
    art.tube([[5.9, LY - 0.2, -6.6], [5.8, TY + 1, -6.8], [5.7, TY + 2.4, -6.8]], 0.22, bark);
    const rootCount = abandoned ? 7 : Math.round(over * 4) + 1;
    for (let i = 0; i < rootCount; i++) {
      const x0 = bx + 0.3 + random() * 0.6, x1 = mix(-5.6, -2.6, random()), x2 = x1 + (random() - 0.5) * 1.6;
      const reach = i < 2 || over > 0.5 ? 1 : 0;
      const path: V3[] = [[x0, TY + 0.25, bz + 0.4], [mix(x0, x1, 0.5), TY + 0.07, mix(bz, Z_TOP, 0.6)], [x1, TY + 0.05, Z_TOP + 0.02], [x1 + 0.1, mix(TY, LY, 0.5), Z_TOP + 0.1], [x1, LY + 0.06, Z_TOP + 0.3]];
      if (reach) path.push([x2, LY + 0.05, mix(Z_TOP, Z_LAND, 0.5 + random() * 0.3)]);
      if (reach && over > 0.45 && Math.abs(x2) > SW + 1) path.push([x2 - 0.2, LY + 0.05, Z_LAND + 0.05], [x2 - 0.25, LY * 0.4, Z_LAND + 0.12], [x2 - 0.5, 0.04, Z_LAND + 0.7]);
      art.tube(path, 0.07 + random() * 0.07, bark);
    }
    // Aerial roots.
    for (let i = 0; i < 6 + Math.round(over * 8); i++) {
      const x = bx - 1 + random() * 3.2, z = bz - 0.6 + random() * 2.6;
      art.rod([x, TY + 3.3 + random() * 0.6, z], [x + (random() - 0.5) * 0.2, TY + (z > Z_TOP ? LY - TY : 0) + 0.02 + (random() < 0.4 ? 1 + random() : 0), z], 0.022, bark);
    }
    // Grass and moss where nobody sweeps.
    const tuftDots: Dot[] = [];
    for (let i = 0; i < Math.round(over * 150); i++) {
      const upper = random() < 0.5, step = Math.floor(random() * (upper ? 8 : 7));
      const onStep = random() < 0.6;
      const x = onStep ? (random() - 0.5) * SW * 2 : (random() - 0.5) * HALF * 2;
      if (onStep) tuftDots.push({ at: [x, (upper ? LY : 0) + RISE * (step + 1) + 0.03, (upper ? Z_UP : Z_FOOT) - RUN * (step + 1) + 0.04], size: 0.06 + random() * 0.07, color: random() < 0.5 ? '#6f8f3a' : '#557a30' });
      else if (Math.abs(x) > SW + 0.8) tuftDots.push({ at: [x, random() < 0.5 ? LY + 0.03 : 0.03, random() < 0.5 ? Z_TOP + 0.08 + random() * 0.2 : Z_LAND + 0.1 + random() * 0.2], size: 0.08 + random() * 0.1, color: random() < 0.5 ? '#6f8f3a' : '#557a30' });
    }
    if (tuftDots.length) art.scatter(new THREE.ConeGeometry(0.6, 2.2, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), tuftDots);
    if (wet) for (let i = 0; i < 6; i++) {
      const puddle = art.mesh(new THREE.CircleGeometry(0.5 + random() * 0.5, 20), new THREE.MeshStandardMaterial({ color: '#8fa3a8', roughness: 0.05, metalness: 0.5 }), [(random() < 0.5 ? -1 : 1) * (2.6 + random() * 2.6), (i % 2 ? LY : 0) + 0.012, i % 2 ? -1.6 + random() * 1.8 : 4 + random() * 2.8]);
      puddle.rotation.x = -Math.PI / 2;
      puddle.scale.y = 0.6;
      puddle.castShadow = false;
    }

    // Prayer flags.
    const poles: V3[] = [[-5.6, LY + 3.0, 2.7], [5.6, LY + 3.0, 2.7], [-5.7, 3.4, 7.2], [5.7, 3.4, 7.2]];
    let flags: THREE.InstancedMesh | null = null;
    const flagBase: THREE.Matrix4[] = [];
    if (a.dressing === 'flags' || a.dressing === 'both') {
      const lines = abandoned ? 2 : crowd > 0.5 ? 4 : 3;
      const hues = ['#2a62c9', '#f4f1e6', '#d9251d', '#2f9a4f', '#f0c419'];
      const list: { m: THREE.Matrix4; c: THREE.Color }[] = [];
      poles.slice(0, lines).forEach((pole, index) => {
        art.rod([pole[0], pole[1] - (index < 2 ? 3.0 : 3.4), pole[2]], pole, 0.045, dark);
        const points: V3[] = [];
        const count = 16;
        for (let i = 0; i <= count; i++) {
          const t = i / count;
          points.push([mix(apex[0], pole[0], t), mix(apex[1] - 0.25, pole[1], t) - Math.sin(t * Math.PI) * 1.1, mix(apex[2], pole[2], t)]);
        }
        art.tube(points, 0.012, dark);
        const facing = Math.atan2(pole[0] - apex[0], pole[2] - apex[2]) + Math.PI / 2;
        for (let i = 1; i < count; i++) {
          if (random() < over * 0.45) continue;
          const m = new THREE.Matrix4().compose(new THREE.Vector3(...points[i]), new THREE.Quaternion().setFromEuler(new THREE.Euler((random() - 0.5) * 0.3, facing, (random() - 0.5) * 0.2)), new THREE.Vector3(1, 1 - random() * over * 0.5, 1));
          list.push({ m, c: new THREE.Color(hues[(i + index) % 5]).lerp(new THREE.Color('#b9b2a2'), over * 0.55 + (1 - mood.cheer) * 0.15) });
        }
      });
      const geometry = new THREE.PlaneGeometry(0.42, 0.5);
      geometry.translate(0, -0.25, 0);
      flags = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.9 }), list.length);
      list.forEach((flag, i) => {
        flags!.setMatrixAt(i, flag.m);
        flags!.setColorAt(i, flag.c);
        flagBase.push(flag.m);
      });
      flags.castShadow = true;
      root.add(flags);
    }
    // Marigolds.
    const swag = (from: V3, to: V3, sag: number, beads: number) => {
      for (let i = 0; i <= beads; i++) {
        const t = i / beads;
        pompoms.push({ at: [mix(from[0], to[0], t), mix(from[1], to[1], t) - Math.sin(t * Math.PI) * sag, mix(from[2], to[2], t)], size: 0.085, color: i % 4 === 0 ? '#ffc21c' : '#f58a0c' });
      }
    };
    if (a.dressing === 'garlands' || a.dressing === 'both') {
      for (let i = 0; i < piers.length / 2; i++) {
        const left = piers[i], right = piers[i + piers.length / 2];
        if (i % 2 === 0 || crowd > 0.4) swag([left.at[0], left.top + 0.05, left.at[2]], [right.at[0], right.top + 0.05, right.at[2]], 0.55, 30);
      }
      for (const side of [-1, 1]) {
        const x = side * (SW + 0.4);
        for (let k = 0; k < 4; k++) swag([x, mix(0, LY, k / 4) + railHeight + 0.5, mix(Z_FOOT, Z_LAND, k / 4)], [x, mix(0, LY, (k + 1) / 4) + railHeight + 0.5, mix(Z_FOOT, Z_LAND, (k + 1) / 4)], 0.25, 9);
      }
      swag([-1.6, TY + 1.5, -4.2], [1.6, TY + 1.5, -4.2], 0.5, 22);
      for (const x of [-1.6, 1.6]) art.rod([x, TY, -4.2], [x, TY + 1.55, -4.2], 0.035, dark);
    }
    // Lamps, petals and litter on the steps.
    const stepSpots = (count: number, visit: (x: number, y: number, z: number) => void) => {
      for (let i = 0; i < count; i++) {
        const upper = random() < 0.5, step = Math.floor(random() * (upper ? 8 : 7));
        visit((random() - 0.5) * SW * 1.9, (upper ? LY : 0) + RISE * (step + 1), (upper ? Z_UP : Z_FOOT) - RUN * step - 0.05 - random() * 0.3);
      }
    };
    if (festival || crowd > 0.75) {
      for (const [z0, y0, steps] of [[Z_FOOT, 0, 7], [Z_UP, LY, 8]] as const) for (let i = 0; i < steps; i++) for (const side of [-1, 1]) flames.push({ at: [side * (SW - 0.2), y0 + RISE * (i + 1) + 0.03, z0 - RUN * i - 0.2], size: 1 });
    }
    stepSpots(Math.round(crowd * 130), (x, y, z) => petals.push({ at: [x, y + 0.012, z], size: 0.05 + random() * 0.03, color: random() < 0.25 ? '#e8463a' : random() < 0.5 ? '#ffc21c' : '#f58a0c' }));
    for (let i = 0; i < Math.round(crowd * 60); i++) petals.push({ at: [(random() - 0.5) * 3.4, LY + 0.012, Z_UP + 0.3 + random() * 2.6], size: 0.05 + random() * 0.03, color: random() < 0.5 ? '#ffc21c' : '#f58a0c' });
    stepSpots(Math.round(over * 50), (x, y, z) => petals.push({ at: [x, y + 0.012, z], size: 0.07 + random() * 0.05, color: random() < 0.5 ? '#8a6a3a' : '#6f6a3a' }));
    stepSpots(Math.round((1 - over) * mood.density * 10 + 3), (x, y, z) => petals.push({ at: [x, y + 0.012, z], size: 0.09, color: '#f1c232' }));
    if (petals.length) art.scatter(new THREE.CylinderGeometry(1, 1, 0.2, 7), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), petals).castShadow = false;
    if (pompoms.length) art.scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, emissive: '#b04a00', emissiveIntensity: 0.12 + mood.cheer * 0.25 }), pompoms);
    let flameMesh: THREE.InstancedMesh | null = null;
    if (flames.length) {
      art.scatter(new THREE.CylinderGeometry(0.07, 0.045, 0.05, 8), new THREE.MeshStandardMaterial({ color: '#a8553c', roughness: 0.9 }), flames.map((f) => ({ at: f.at, size: 1 })));
      if (!abandoned) flameMesh = art.scatter(new THREE.ConeGeometry(0.035, 0.13, 6), flameMat, flames.map((f) => ({ at: [f.at[0], f.at[1] + 0.09, f.at[2]] as V3, size: 1 })));
      if (flameMesh) flameMesh.castShadow = false;
    }

    // The resident troop: small seated monkeys on every wall that is not a standing place.
    const perches: { at: V3; yaw: number }[] = [];
    for (const side of [-1, 1]) {
      for (let k = 1; k < 6; k++) {
        perches.push({ at: [side * (SW + 0.18), mix(0, LY, k / 6) + railHeight, mix(Z_FOOT, Z_LAND, k / 6)], yaw: side * 1.2 });
        perches.push({ at: [side * (SW + 0.18), mix(LY, TY, k / 6) + railHeight, mix(Z_UP, Z_TOP, k / 6)], yaw: side * 1.2 });
      }
      for (let k = 0; k < 5; k++) {
        perches.push({ at: [side * (2.9 + k * 0.62), TY, Z_TOP - 0.05], yaw: 0 });
        perches.push({ at: [side * (2.9 + k * 0.7), LY, Z_LAND - 0.05], yaw: 0 });
      }
      perches.push({ at: [side * 1.5, TY + 0.5, -4.1], yaw: side * 0.4 }, { at: [side * 1.2, TY + (a.shrine === 'stupa' ? 0.8 : 0.5), -4.25], yaw: 0 });
      perches.push({ at: [side * 5.4, LY, 0.2 - random() * 1.5], yaw: -side * 0.8 }, { at: [side * 5.5, 0, 4.2 + random() * 2], yaw: -side * 0.6 });
    }
    perches.push({ at: [4.2, LY + 1.72, -2.3], yaw: 0.3 }, { at: [0.6, LY, -0.6 + 1.0], yaw: 0.4 }, { at: [-1.3, RISE * 3, Z_FOOT - RUN * 2 - 0.2], yaw: -0.3 }, { at: [1.2, LY + RISE * 5, Z_UP - RUN * 4 - 0.2], yaw: 0.5 });
    const troopCount = Math.min(perches.length, Math.round(a.troop * (14 + mood.density * 22)));
    const chosen = perches.map((p) => ({ p, k: random() })).sort((x, y) => x.k - y.k).slice(0, troopCount).map((x) => x.p);
    if (chosen.length) {
      const furMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
      const body = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), furMat, chosen.length * 2);
      const faces = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#dd8a7a', roughness: 0.8 }), chosen.length * 3);
      const tails = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.02, 0.5, 5), furMat, chosen.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), tint = new THREE.Color();
      chosen.forEach((perch, i) => {
        const size = 1.05 + random() * 0.55, yaw = perch.yaw + (random() - 0.5) * 1.2;
        const [x, y, z] = perch.at;
        const fx2 = Math.sin(yaw), fz2 = Math.cos(yaw);
        q.setFromEuler(new THREE.Euler(0, yaw, 0));
        tint.set('#8a7250').offsetHSL(0, 0, (random() - 0.5) * 0.12);
        body.setMatrixAt(i * 2, m.compose(new THREE.Vector3(x, y + 0.24 * size, z), q, new THREE.Vector3(0.17 * size, 0.27 * size, 0.19 * size)));
        body.setMatrixAt(i * 2 + 1, m.compose(new THREE.Vector3(x + fx2 * 0.07 * size, y + 0.56 * size, z + fz2 * 0.07 * size), q, new THREE.Vector3(0.14 * size, 0.135 * size, 0.14 * size)));
        body.setColorAt(i * 2, tint);
        body.setColorAt(i * 2 + 1, tint);
        faces.setMatrixAt(i * 3, m.compose(new THREE.Vector3(x + fx2 * 0.17 * size, y + 0.54 * size, z + fz2 * 0.17 * size), q, new THREE.Vector3(0.085 * size, 0.09 * size, 0.06 * size)));
        for (const side of [-1, 1]) faces.setMatrixAt(i * 3 + (side + 3) / 2, m.compose(new THREE.Vector3(x + fx2 * 0.05 * size + side * fz2 * 0.14 * size, y + 0.59 * size, z + fz2 * 0.05 * size - side * fx2 * 0.14 * size), q, new THREE.Vector3(0.035 * size, 0.06 * size, 0.05 * size)));
        tails.setMatrixAt(i, m.compose(new THREE.Vector3(x - fx2 * 0.22 * size, y + 0.02, z - fz2 * 0.22 * size), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - 0.2, yaw, 0, 'YXZ')), new THREE.Vector3(size, size, size)));
      });
      for (const mesh of [body, faces, tails]) {
        mesh.castShadow = mesh.receiveShadow = true;
        root.add(mesh);
      }
    }

    // Camera and placement.
    const camera = new THREE.OrthographicCamera(-9, 9, 9, -9, 0.1, 300);
    const yaw = THREE.MathUtils.degToRad(31), pitch = THREE.MathUtils.degToRad({ model: 27, foot: 15, high: 42 }[a.view]);
    const frame = new THREE.Box3(new THREE.Vector3(-HALF - 0.3, -0.3, Z_BACK - 0.1), new THREE.Vector3(HALF + 0.3, TY + spire + 0.1, 7.7));
    const place = (items: readonly Placeable[]) => {
      const boxes: THREE.Box3[] = [frame.clone()];
      items.forEach((item, index) => {
        const slot = SLOTS[index % SLOTS.length];
        const scale = Math.min(slot.height / Math.max(item.height, 0.05), slot.radius / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(...slot.at);
        item.holder.rotation.y = yaw * 0.6 + (context.random() - 0.5) * 0.35;
        item.holder.updateMatrixWorld(true);
        boxes.push(visibleBounds(item.holder));
      });
      const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
      const centre = bounds.getCenter(new THREE.Vector3());
      const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      camera.position.copy(centre).addScaledVector(direction, 90);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const projection = new THREE.Box2();
      for (const box of boxes)
        for (const x of [box.min.x, box.max.x])
          for (const y of [box.min.y, box.max.y])
            for (const z of [box.min.z, box.max.z]) {
              const p = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
              projection.expandByPoint(new THREE.Vector2(p.x, p.y));
            }
      const middle = projection.getCenter(new THREE.Vector2()), size = projection.getSize(new THREE.Vector2());
      const extent = Math.max(size.x, size.y) * 0.52;
      camera.translateX(middle.x);
      camera.translateY(middle.y);
      camera.left = camera.bottom = -extent;
      camera.right = camera.top = extent;
      camera.updateProjectionMatrix();
      const span = bounds.getSize(new THREE.Vector3()).length();
      const low = Math.abs(mood.daylight - 0.5) * 2;
      key.target.position.copy(centre);
      key.position.copy(centre).add(new THREE.Vector3(-9 + mood.daylight * 15, 13 - low * 7, 8).normalize().multiplyScalar(span * 1.4));
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -span * 0.6;
      shadow.right = shadow.top = span * 0.6;
      shadow.near = 0.1;
      shadow.far = span * 4;
      shadow.updateProjectionMatrix();
    };

    const pace = mix(0.3, 2.5, mood.energy);
    const scratch = new THREE.Matrix4(), sway = new THREE.Matrix4();
    return {
      object: root, camera, background, ground, keyLight: key, capacity: SLOTS.length, place,
      update(_dt: number, time: number) {
        for (const b of bells) b.rotation.z = Math.sin(time * pace * 2 + (b.userData.phase as number)) * 0.3 * mood.energy;
        spinners.forEach((wheel, i) => { wheel.rotation.y = time * pace * (0.6 + (i % 3) * 0.3) * mood.energy; });
        if (flags) {
          flagBase.forEach((base, i) => {
            sway.makeRotationX(Math.sin(time * pace * 2.2 + i * 0.9) * 0.5 * (0.2 + mood.energy));
            flags!.setMatrixAt(i, scratch.multiplyMatrices(base, sway));
          });
          flags.instanceMatrix.needsUpdate = true;
        }
        flameMat.emissiveIntensity = 1.8 + Math.sin(time * 9) * 0.3;
      },
      dispose() {
        key.shadow.map?.dispose();
        disposeTree(root);
      },
    };
  },
});
