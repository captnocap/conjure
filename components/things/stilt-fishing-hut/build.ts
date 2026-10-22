import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, score, visibleBounds } from '@conjure/kit';

type P3 = readonly [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat); }
  return texture;
}

const WALLS = {
  bare: 'Unpainted planks gone silver-grey in the salt.',
  turquoise: 'Bright turquoise, the colour of a boat.',
  salmon: 'Sun-faded salmon pink.',
  blue: 'Deep cobalt blue with white trim.',
  yellow: 'Mustard yellow, cheerful against the mud.',
  tar: 'Tarred black against the rot.',
} as const;
const WALL_COLOURS: Record<keyof typeof WALLS, string> = { bare: '#a39a8a', turquoise: '#2fb0a6', salmon: '#e89a82', blue: '#2a57a8', yellow: '#dcae32', tar: '#2c2a28' };
const ROOFS = {
  thatch: 'Thick shaggy palm thatch with a ragged fringe at the eaves.',
  tin: 'Corrugated tin sheets, streaked with rust.',
  tarp: 'A blue tarpaulin lashed over poles and weighted with old tyres.',
  nipa: 'Overlapping rows of dried nipa-palm shingles, neat and brown.',
} as const;

export default defineThing({
  questions: {
    roof: choice('What is the roof made of?', ROOFS),
    wall: choice('What colour are the walls?', WALLS),
    life: choice('Is anyone living here?', {
      home: 'Someone is home: door open, lamp lit, a cooking pot on the porch.',
      away: 'Out fishing: door shut, everything stowed, waiting.',
      resting: 'A hammock is slung across the porch with somebody asleep in it.',
      deserted: 'Abandoned: roof holed, planks missing, door hanging off, ladder broken.',
    }),
    hanging: choice('What hangs outside under the eaves?', {
      nets: 'A fishing net draped to dry, edged with floats.',
      washing: 'A line of washing in mismatched colours.',
      fish: 'A row of split fish drying in the sun.',
      pots: 'Nothing on the line, but woven crab pots are stacked on the porch.',
      nothing: 'Nothing at all.',
    }),
    stilts: score('How high does it stand above the water?', ['Floor almost touching the tide', 'Head height', 'Teetering on tall spindly poles']),
    comfort: choice('What small comfort has been added?', {
      none: 'None.',
      solar: 'A little solar panel and a bent aerial on the roof.',
      barrel: 'A blue plastic rain barrel fed by a split-bamboo gutter.',
      plants: 'Herbs and flowers growing in old paint tins along the porch rail.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const house = new THREE.Group();
    root.add(house);
    const deserted = a.life === 'deserted';
    const wear = Math.min(1, mood.wear + (deserted ? 0.35 : 0));
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    const mat = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color('#8b8478'), wear * 0.22), roughness: 0.75, ...options });
    const put = <T extends THREE.Object3D>(parent: THREE.Object3D, node: T, at: P3 = [0, 0, 0]) => {
      node.position.set(...at);
      node.traverse((child) => { child.castShadow = child.receiveShadow = true; });
      parent.add(node);
      return node;
    };
    const rod = (parent: THREE.Object3D, from: P3, to: P3, r0: number, r1: number, material: THREE.Material, sides = 7) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), span = q.clone().sub(p);
      const mesh = put(parent, new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, span.length(), sides), material), p.add(q).multiplyScalar(0.5).toArray() as [number, number, number]);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.normalize());
      return mesh;
    };
    const box = (parent: THREE.Object3D, size: P3, at: P3, material: THREE.Material) => put(parent, new THREE.Mesh(new THREE.BoxGeometry(...size), material), at);

    const HF = mix(0.9, 3.3, a.stilts), W = 3.0, WALL = 1.9;
    const back = -1.5, front = 0.9, porch = 1.95;
    const timber = mat('#6b5644'), paleTimber = mat('#9c8468'), rope = mat('#cdb98a');
    const wallColour = WALL_COLOURS[a.wall];
    const planks = paint(256, 256, (ctx) => {
      for (let x = 0; x < 256; x += 20) {
        const tone = new THREE.Color(wallColour).multiplyScalar(mix(0.8, 1.08, random()));
        if (a.wall !== 'bare' && random() < wear * 0.5) tone.lerp(new THREE.Color('#9a9080'), 0.75);
        ctx.fillStyle = `#${tone.getHexString()}`;
        ctx.fillRect(x, 0, 20, 256);
        ctx.fillStyle = 'rgba(20,14,10,0.55)';
        ctx.fillRect(x, 0, 2, 256);
        if (random() < 0.4) { ctx.fillStyle = 'rgba(20,14,10,0.35)'; ctx.fillRect(x + 6 + random() * 8, random() * 240, 3, 3); }
      }
      // A flattened-tin patch nailed over a hole.
      if (wear > 0.3) { ctx.fillStyle = '#9aa3a2'; ctx.fillRect(150, 150, 52, 38); ctx.fillStyle = '#b5673a'; ctx.fillRect(150, 180, 52, 8); }
    });
    const wallPaint = new THREE.MeshStandardMaterial({ map: planks, roughness: 0.85 });
    const trim = mat(a.wall === 'blue' || a.wall === 'tar' ? '#ece6d6' : '#5c4a3a');
    const dark = mat('#1a1512', { roughness: 1 });
    const lit = a.life === 'home' || a.life === 'resting';
    const windowGlow = new THREE.MeshStandardMaterial({ color: lit ? '#ffcf7a' : '#1a1512', emissive: lit ? '#ffab40' : '#000000', emissiveIntensity: lit ? mix(0.25, 1.5, dusk) : 0, roughness: 1 });

    // Stilts: crooked poles with a kink, cross-braced.
    const poles: P3[] = [];
    for (const x of [-1.45, 0, 1.45]) for (const z of [back + 0.1, (back + porch) / 2, porch - 0.1]) if (!(x === 0 && z !== back + 0.1 && a.stilts < 0.3)) poles.push([x, 0, z]);
    const ripple = new THREE.MeshStandardMaterial({ color: '#9a9878', roughness: 0.2 });
    const weedPaint = mat('#3f4a34');
    poles.forEach(([x, , z]) => {
      const lean = () => (random() - 0.5) * 0.22 * (0.5 + wear);
      const foot: P3 = [x + lean() * 1.4, -0.4, z + lean() * 1.4], knee: P3 = [x + lean(), HF * 0.5, z + lean()], top: P3 = [x, HF + (Math.abs(x) > 1 && z > front ? 0 : 0.02), z];
      rod(root, foot, knee, 0.085, 0.07, timber);
      rod(root, knee, top, 0.07, 0.06, timber);
      const wx = foot[0] + (knee[0] - foot[0]) * 0.45, wz = foot[2] + (knee[2] - foot[2]) * 0.45;
      put(root, new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.095, 0.3, 7), weedPaint), [wx, 0.12, wz]);
      put(root, new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 4, 20), ripple), [wx, 0.006, wz]).rotation.x = Math.PI / 2;
    });
    if (HF > 1.3) {
      for (const x of [-1.45, 1.45]) { rod(root, [x, HF * 0.2, back + 0.1], [x, HF * 0.9, (back + porch) / 2], 0.04, 0.035, paleTimber); rod(root, [x, HF * 0.9, (back + porch) / 2], [x, HF * 0.2, porch - 0.1], 0.04, 0.035, paleTimber); }
      rod(root, [-1.45, HF * 0.25, porch - 0.1], [1.45, HF * 0.85, porch - 0.1], 0.04, 0.035, paleTimber);
    }

    // Deck planks, some lost.
    const deckPaint = mat('#8d775c');
    const boards = 17;
    for (let i = 0; i < boards; i++) {
      const z = mix(back - 0.1, porch + 0.05, (i + 0.5) / boards);
      if (deserted && z > front && random() < 0.4) continue;
      const short = z > front && random() < wear * 0.3 ? random() * 0.8 : 0;
      box(house, [W + 0.5 - short, 0.05, (porch - back + 0.15) / boards - 0.015], [short / 2, HF + 0.025 + (random() - 0.5) * 0.012, z], deckPaint).rotation.y = (random() - 0.5) * 0.02;
    }
    for (const x of [-1.45, 0, 1.45]) box(house, [0.1, 0.12, porch - back + 0.1], [x, HF - 0.06, (back + porch) / 2], timber);

    // The room.
    const top = HF + 0.05 + WALL;
    box(house, [W, WALL, front - back], [0, HF + 0.05 + WALL / 2, (back + front) / 2], wallPaint);
    const ridgeZ = (back + front) / 2, ridgeY = top + 1.05, eaveBack = back - 0.4, eaveFront = front + 0.6;
    const slope = (z: number) => z < ridgeZ ? mix(ridgeY, top - 0.12, (ridgeZ - z) / (ridgeZ - eaveBack)) : mix(ridgeY, top - 0.02, (z - ridgeZ) / (eaveFront - ridgeZ));
    for (const e of [-1, 1]) {
      const gable = new THREE.Shape();
      gable.moveTo(back, top - 0.02); gable.lineTo(back, slope(back) - 0.02); gable.lineTo(ridgeZ, ridgeY - 0.04); gable.lineTo(front, slope(front) - 0.02); gable.lineTo(front, top - 0.02);
      const end = put(house, new THREE.Mesh(new THREE.ShapeGeometry(gable), new THREE.MeshStandardMaterial({ color: new THREE.Color(wallColour).multiplyScalar(0.85), roughness: 0.9, side: THREE.DoubleSide })), [e * (W / 2 - 0.01), 0, 0]);
      end.rotation.y = -Math.PI / 2;
    }
    // Door and window.
    const doorX = -0.45;
    box(house, [0.86, 1.62, 0.04], [doorX, HF + 0.05 + 0.81, front + 0.012], a.life === 'away' ? trim : windowGlow);
    box(house, [0.98, 0.08, 0.06], [doorX, HF + 0.05 + 1.66, front + 0.02], trim);
    if (a.life === 'away') {
      for (const y of [0.35, 1.25]) box(house, [0.8, 0.07, 0.03], [doorX, HF + 0.05 + y, front + 0.045], timber);
      box(house, [0.07, 0.1, 0.05], [doorX + 0.36, HF + 0.9, front + 0.05], mat('#c9a53a', { metalness: 0.7, roughness: 0.3 }));
    } else {
      const leaf = box(house, [0.84, 1.6, 0.04], [doorX - 0.43, HF + 0.05 + 0.8, front + 0.03], trim);
      leaf.geometry.translate(-0.42, 0, 0);
      leaf.rotation.y = deserted ? -0.5 : -1.35;
      if (deserted) leaf.rotation.z = 0.16;
    }
    const sill = HF + 1.0;
    box(house, [0.03, 0.62, 0.72], [W / 2 + 0.008, sill + 0.3, -0.35], windowGlow);
    const shutter = box(house, [0.03, 0.62, 0.74], [W / 2 + 0.03, sill + 0.61, -0.35], trim);
    shutter.geometry.translate(0, -0.31, 0);
    shutter.rotation.z = deserted ? 0.1 : 1.1;
    rod(house, [W / 2 + 0.03, sill + 0.02, -0.1], [W / 2 + 0.5, sill + 0.36, -0.1], 0.012, 0.012, timber);
    box(house, [0.6, 0.5, 0.03], [0.85, sill + 0.35, front + 0.01], windowGlow);
    for (const x of [0.85]) { box(house, [0.04, 0.5, 0.04], [x, sill + 0.35, front + 0.03], trim); box(house, [0.66, 0.05, 0.05], [x, sill + 0.08, front + 0.03], trim); }

    // Roof.
    const roofTexture = paint(256, 256, (ctx) => {
      if (a.roof === 'thatch' || a.roof === 'nipa') {
        const base = a.roof === 'thatch' ? '#b89a58' : '#8a6a44';
        ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 1400; i++) {
          ctx.strokeStyle = `#${new THREE.Color(base).multiplyScalar(mix(0.55, 1.25, random())).getHexString()}`;
          ctx.lineWidth = 1.5;
          const x = random() * 256, y = random() * 256;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 6, y + 14 + random() * 16); ctx.stroke();
        }
        if (a.roof === 'nipa') { ctx.fillStyle = 'rgba(30,20,10,0.5)'; for (let y = 0; y < 256; y += 43) ctx.fillRect(0, y, 256, 5); }
      } else if (a.roof === 'tin') {
        for (let x = 0; x < 256; x += 8) { ctx.fillStyle = (x / 8) % 2 ? '#aab1b0' : '#7f8887'; ctx.fillRect(x, 0, 8, 256); }
        for (let i = 0; i < 3 + wear * 22; i++) { ctx.fillStyle = `rgba(${120 + random() * 40},${62 + random() * 24},34,${0.3 + random() * 0.4})`; ctx.fillRect(random() * 256, random() * 256, 6 + random() * 18, 20 + random() * 80); }
        ctx.fillStyle = 'rgba(20,20,20,0.5)'; ctx.fillRect(0, 126, 256, 3);
      } else {
        ctx.fillStyle = '#2f6fc4'; ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
        for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(random() * 256, 0); ctx.lineTo(random() * 256, 256); ctx.stroke(); }
        ctx.fillStyle = '#d9dcd4'; ctx.fillRect(60, 90, 50, 40); ctx.fillStyle = '#e07a2a'; ctx.fillRect(170, 30, 40, 44);
      }
    });
    const roofPaint = new THREE.MeshStandardMaterial({ map: roofTexture, roughness: a.roof === 'tin' ? 0.45 : a.roof === 'tarp' ? 0.5 : 0.95, metalness: a.roof === 'tin' ? 0.5 : 0, side: THREE.DoubleSide });
    const thick = { thatch: 0.26, tin: 0.03, tarp: 0.025, nipa: 0.1 }[a.roof];
    const span = W + 0.9;
    const slab = (z0: number, z1: number) => {
      const y0 = slope(z0 + (z0 < ridgeZ ? 0.001 : -0.001)), y1 = slope(z1);
      const run = Math.hypot(z1 - z0, y1 - y0);
      const mesh = box(house, [span, thick, run], [0, (y0 + y1) / 2 + thick / 2, (z0 + z1) / 2], roofPaint);
      mesh.rotation.x = Math.atan2(y0 - y1, z1 - z0);
      return mesh;
    };
    slab(ridgeZ, eaveBack);
    slab(ridgeZ, eaveFront);
    if (a.roof === 'nipa') for (let k = 1; k < 4; k++) for (const z of [mix(ridgeZ, eaveBack, k / 4), mix(ridgeZ, eaveFront, k / 4)]) {
      const lap = box(house, [span + 0.04, 0.05, 0.36], [0, slope(z) + 0.13, z], roofPaint);
      lap.rotation.x = Math.atan2(z < ridgeZ ? -1 : 1, 1.6) * 0.75;
    }
    rod(house, [-span / 2 - 0.05, ridgeY + thick + 0.02, ridgeZ], [span / 2 + 0.05, ridgeY + thick + 0.02, ridgeZ], a.roof === 'thatch' ? 0.11 : 0.05, a.roof === 'thatch' ? 0.11 : 0.05, a.roof === 'tin' ? mat('#8f9796', { metalness: 0.5 }) : a.roof === 'tarp' ? paleTimber : roofPaint, 8);
    if (a.roof === 'thatch') {
      const fringe: THREE.Matrix4[] = [];
      for (const z of [eaveBack, eaveFront]) for (let i = 0; i < 44; i++) fringe.push(new THREE.Matrix4().compose(new THREE.Vector3(mix(-span / 2, span / 2, (i + random()) / 44), slope(z) - 0.02, z + (z < 0 ? -0.02 : 0.02)), new THREE.Quaternion().setFromEuler(new THREE.Euler((z < 0 ? -1 : 1) * 0.4, 0, (random() - 0.5) * 0.4)), new THREE.Vector3(0.07, mix(0.2, 0.42, random()), 0.05)));
      const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5).rotateX(Math.PI), new THREE.MeshStandardMaterial({ color: '#a88a4c', roughness: 1 }), fringe.length);
      fringe.forEach((m, i) => tufts.setMatrixAt(i, m));
      put(house, tufts);
    } else if (a.roof === 'tarp') {
      const tyre = mat('#1c1c1e', { roughness: 0.7 });
      for (let i = 0; i < 4; i++) {
        const z = i < 2 ? mix(ridgeZ, eaveFront, 0.35 + i * 0.35) : mix(ridgeZ, eaveBack, 0.5), x = (random() - 0.5) * span * 0.7;
        const ring = put(house, new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.085, 7, 16), tyre), [x, slope(z) + 0.1, z]);
        ring.rotation.x = Math.PI / 2 + Math.atan2(z < ridgeZ ? -1 : 1, 2) * 0.8;
      }
      for (const x of [-span / 2 + 0.1, span / 2 - 0.1]) rod(house, [x, slope(eaveFront), eaveFront], [x * 0.98, HF + 0.1, porch + 0.02], 0.01, 0.01, rope);
    }
    if (deserted) {
      const z = mix(ridgeZ, eaveFront, 0.4);
      const hole = box(house, [0.9, 0.02, 0.8], [0.55, slope(z) + thick + 0.012, z], dark);
      hole.rotation.x = Math.atan2(1, 2.3);
      hole.rotation.z = 0.2;
      for (let i = 0; i < 3; i++) rod(house, [0.2 + i * 0.3, slope(z) + thick, z - 0.4], [0.3 + i * 0.3, slope(z + 0.4) + thick + 0.05, z + 0.45], 0.02, 0.02, timber);
    }
    // Porch posts and rail.
    for (const x of [-W / 2 - 0.1, W / 2 + 0.1]) rod(house, [x, HF, porch - 0.1], [x, slope(eaveFront) + 0.02, eaveFront - 0.05], 0.05, 0.045, timber);
    const railY = HF + 0.75;
    rod(house, [-W / 2 - 0.1, railY, porch - 0.1], [-0.2, railY, porch - 0.1], 0.03, 0.03, paleTimber);
    for (const x of [-W / 2 - 0.1, -W / 2 - 0.1]) rod(house, [x, railY, porch - 0.1], [x, railY, front], 0.03, 0.03, paleTimber);

    // Ladder up to the gap in the rail.
    const ladderX = 0.85, feet = porch + 0.25 + HF * 0.28;
    const rungs = Math.max(3, Math.round(HF / 0.33));
    for (const e of [-1, 1]) rod(root, [ladderX + e * 0.24, -0.25, feet], [ladderX + e * 0.24, HF + 0.55, porch + 0.04], 0.035, 0.03, paleTimber);
    for (let i = 1; i <= rungs; i++) {
      if (deserted && random() < 0.4) continue;
      const k = i / (rungs + 0.6), y = mix(0, HF + 0.55, k) * 1, z = mix(feet, porch + 0.04, (y + 0.25) / (HF + 0.8));
      rod(root, [ladderX - 0.28, y, z], [ladderX + 0.28, y + (deserted ? (random() - 0.5) * 0.15 : 0), z], 0.022, 0.022, paleTimber);
    }

    // The lantern on a hook under the eave.
    const swingers: { node: THREE.Object3D; phase: number; amount: number }[] = [];
    const lampOn = lit;
    const lamp = new THREE.Group();
    const tin = mat('#5d6664', { metalness: 0.6, roughness: 0.4 });
    put(lamp, new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 4), tin), [0, -0.15, 0]);
    put(lamp, new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.08, 10), tin), [0, -0.32, 0]);
    put(lamp, new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.2, 10), new THREE.MeshStandardMaterial({ color: lampOn ? '#ffe0a0' : '#8a8f86', emissive: lampOn ? '#ffb040' : '#000000', emissiveIntensity: lampOn ? mix(0.6, 2.2, dusk) : 0, roughness: 0.2 })), [0, -0.46, 0]);
    put(lamp, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.035, 10), tin), [0, -0.575, 0]);
    const lampZ = eaveFront - 0.12;
    put(house, lamp, [-W / 2 + 0.35, slope(lampZ) - 0.02, lampZ]);
    if (deserted) lamp.rotation.z = 0.5;
    swingers.push({ node: lamp, phase: 0, amount: 0.1 });

    // What hangs outside.
    const lineY = slope(eaveFront) - 0.1, lineZ = eaveFront + 0.04;
    const x0 = -W / 2 - 0.1, x1 = W / 2 + 0.1;
    if (a.hanging === 'nets' || a.hanging === 'washing' || a.hanging === 'fish') {
      rod(house, [x0, lineY, lineZ], [x1, lineY, lineZ], 0.008, 0.008, rope, 5);
      const hung = new THREE.Group();
      put(house, hung, [0, lineY, lineZ]);
      swingers.push({ node: hung, phase: 1, amount: 0.05 });
      if (a.hanging === 'nets') {
        const mesh = paint(64, 64, (ctx) => {
          ctx.strokeStyle = '#2f7f74'; ctx.lineWidth = 5;
          for (let k = -1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(k * 32, 0); ctx.lineTo(k * 32 + 64, 64); ctx.moveTo(k * 32 + 64, 0); ctx.lineTo(k * 32, 64); ctx.stroke(); }
        }, [14, 6]);
        const plane = new THREE.PlaneGeometry(2.3, 1.25, 16, 4);
        const pos = plane.attributes.position;
        for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setXYZ(i, x, y - 0.62 - (Math.abs(Math.sin(x * 2.7)) * 0.22) * (0.3 + (0.62 - y)), Math.sin(x * 5) * 0.06); }
        plane.computeVertexNormals();
        put(hung, new THREE.Mesh(plane, new THREE.MeshStandardMaterial({ map: mesh, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 })), [-0.4, 0, 0]);
        const cork = mat(mood.cheer > 0.5 ? '#f0892a' : '#e6dfcc');
        for (let i = 0; i < 9; i++) { const x = -1.5 + i * 0.275; put(hung, new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), cork), [x, -1.3 - Math.abs(Math.sin((x + 0.4) * 2.7)) * 0.3, Math.sin((x + 0.4) * 5) * 0.06]); }
      } else if (a.hanging === 'washing') {
        const dyes = ['#e8443a', '#f2c230', '#f4f1e8', '#3f8fd0', '#e86aa6', '#48a868', '#f08a2a'];
        let x = x0 + 0.25;
        while (x < 0.1) {
          const w = mix(0.3, 0.5, random()), h = mix(0.4, 0.75, random());
          const cloth = new THREE.PlaneGeometry(w, h, 4, 3);
          const pos = cloth.attributes.position;
          for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 14 + x * 9) * 0.03 * (0.5 - pos.getY(i) / h));
          cloth.computeVertexNormals();
          put(hung, new THREE.Mesh(cloth, new THREE.MeshStandardMaterial({ color: new THREE.Color(dyes[Math.floor(random() * dyes.length)]).lerp(new THREE.Color('#b9b2a4'), wear * 0.4), side: THREE.DoubleSide, roughness: 0.9 })), [x + w / 2, -h / 2 - 0.01, 0]);
          x += w + 0.07;
        }
      } else {
        const flesh = new THREE.MeshStandardMaterial({ color: '#d9b98a', roughness: 0.6 }), skin = new THREE.MeshStandardMaterial({ color: '#8f9aa0', metalness: 0.4, roughness: 0.4 });
        for (let i = 0; i < 9; i++) {
          const x = x0 + 0.25 + i * 0.19;
          const fish = put(hung, new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), i % 3 ? flesh : skin), [x, -0.2, 0]);
          fish.scale.set(0.055, 0.17, 0.012);
          const tail = put(hung, new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.07, 4), skin), [x, -0.03, 0]);
          tail.scale.z = 0.2;
          tail.rotation.z = Math.PI;
        }
      }
    } else if (a.hanging === 'pots') {
      const weave = paint(64, 64, (ctx) => {
        ctx.strokeStyle = '#c9a45c'; ctx.lineWidth = 7;
        for (let k = -1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(k * 32, 0); ctx.lineTo(k * 32 + 64, 64); ctx.moveTo(k * 32 + 64, 0); ctx.lineTo(k * 32, 64); ctx.stroke(); }
      }, [9, 3]);
      const cane = new THREE.MeshStandardMaterial({ map: weave, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 });
      const n = 2 + Math.round(mood.density * 2);
      for (let i = 0; i < n; i++) {
        const at: P3 = [-W / 2 + 0.35 + (i % 2) * 0.1, HF + 0.07 + i * 0.2, front + 0.5 + (i % 2) * 0.06];
        const dome = put(house, new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 6, 0, Math.PI * 2, 0.3, Math.PI / 2 - 0.3), cane), at);
        dome.scale.y = 0.75;
        put(house, new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.016, 5, 18), mat('#8f6c2f')), at).rotation.x = Math.PI / 2;
      }
    }

    // Signs of life.
    if (a.life === 'home') {
      const potAt: P3 = [0.45, HF + 0.05, front + 0.55];
      put(house, new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.14, 10), mat('#3a3633')), [potAt[0], potAt[1] + 0.07, potAt[2]]);
      put(house, new THREE.Mesh(new THREE.LatheGeometry([[0.1, 0], [0.15, 0.08], [0.13, 0.17], [0.15, 0.19]].map(([x, y]) => new THREE.Vector2(x, y)), 12), mat('#22201e', { metalness: 0.4, side: THREE.DoubleSide })), [potAt[0], potAt[1] + 0.14, potAt[2]]);
      put(house, new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: '#ff8a30', emissive: '#ff5a10', emissiveIntensity: 1.4 })), [potAt[0], potAt[1] + 0.1, potAt[2]]).scale.y = 0.5;
      box(house, [0.3, 0.26, 0.3], [-1.2, HF + 0.18, front + 0.35], paleTimber);
    } else if (a.life === 'resting') {
      const cloth = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#e8a23a' : '#7d8f9a', side: THREE.DoubleSide, roughness: 0.9 });
      const sag = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
      const hammock = put(house, new THREE.Mesh(sag, cloth), [-0.72, HF + 1.0, porch - 0.42]);
      hammock.scale.set(0.95, 0.5, 0.3);
      const sleeper = put(house, new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.9, 4, 10), mat('#c9bfa8')), [-0.72, HF + 0.8, porch - 0.42]);
      sleeper.rotation.z = Math.PI / 2;
      put(house, new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.12, 14), mat('#d9c078')), [-1.25, HF + 1.0, porch - 0.42]).rotation.z = 0.5;
      rod(house, [-1.67, HF + 1.5, porch - 0.14], [-1.62, HF + 1.0, porch - 0.42], 0.01, 0.01, rope);
      rod(house, [0.2, HF + 1.6, front + 0.05], [0.18, HF + 1.0, porch - 0.42], 0.01, 0.01, rope);
    }
    if (a.comfort === 'solar') {
      const z = mix(ridgeZ, eaveBack, 0.45);
      const panel = box(house, [0.9, 0.04, 0.6], [0.7, slope(z) + thick + 0.1, z], mat('#1d2f55', { metalness: 0.6, roughness: 0.2 }));
      panel.rotation.x = -0.6;
      box(house, [0.94, 0.03, 0.64], [0.7, slope(z) + thick + 0.08, z], mat('#c9ccc8', { metalness: 0.7 })).rotation.x = -0.6;
      rod(house, [-1.3, ridgeY + thick, ridgeZ], [-1.38, ridgeY + thick + 1.3, ridgeZ - 0.1], 0.015, 0.012, tin);
      for (let i = 0; i < 4; i++) rod(house, [-1.6, ridgeY + thick + 0.8 + i * 0.14, ridgeZ - 0.08], [-1.12 + i * 0.03, ridgeY + thick + 0.86 + i * 0.14, ridgeZ - 0.08], 0.008, 0.008, tin, 4);
    } else if (a.comfort === 'barrel') {
      put(house, new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.85, 14), mat('#2f6fc4', { roughness: 0.4 })), [W / 2 + 0.02, HF + 0.48, front + 0.5]);
      for (const y of [0.3, 0.65]) put(house, new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 5, 18), mat('#2a5fa8')), [W / 2 + 0.02, HF + y, front + 0.5]).rotation.x = Math.PI / 2;
      rod(house, [W / 2 + 0.3, slope(eaveFront) - 0.05, eaveFront - 0.02], [W / 2 + 0.05, HF + 0.95, front + 0.52], 0.035, 0.035, mat('#b9a45c'));
    } else if (a.comfort === 'plants') {
      const tins = ['#d9443a', '#e6e2d4', '#3a8fc9', '#e8b830'];
      for (let i = 0; i < 4; i++) {
        const x = -W / 2 + 0.1 + i * 0.36;
        put(house, new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.16, 10), mat(tins[i])), [x, railY + 0.11, porch - 0.1]);
        const leaves = put(house, new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), new THREE.MeshStandardMaterial({ color: '#4f8f3a', flatShading: true, roughness: 0.8 })), [x, railY + 0.3, porch - 0.1]);
        leaves.scale.y = mix(0.8, 1.5, random());
        if (i % 2 === 0) put(house, new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), new THREE.MeshStandardMaterial({ color: i ? '#f04a7a' : '#f6c12a', emissive: i ? '#f04a7a' : '#f6c12a', emissiveIntensity: 0.3 })), [x + 0.05, railY + 0.42, porch - 0.05]);
      }
    }

    // A sagging old hut leans; the water it stands in.
    house.rotation.z = (random() < 0.5 ? -1 : 1) * wear * 0.05;
    house.rotation.x = wear * 0.025;
    const tea = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6a5334').lerp(new THREE.Color('#7f8f86'), 0.3), roughness: 0.06, metalness: 0.35 });
    const sheet = put(root, new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.01, 44), tea), [0, -0.003, 0.35]);
    sheet.scale.z = 1.05;
    root.rotation.y = 0.12;
    root.updateMatrixWorld(true);
    const centre = visibleBounds(root).getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    holder.add(root);
    root.position.set(-centre.x, 0, -centre.z);
    const energy = mix(0.2, 1.6, mood.energy);
    return {
      object: holder,
      footprint: 2.6,
      update: (_dt, time) => { for (const swing of swingers) swing.node.rotation.x = Math.sin(time * 1.3 * energy + swing.phase) * swing.amount * energy; },
      dispose: () => disposeTree(holder),
    };
  },
});
