import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, score } from '@conjure/kit';

type P3 = readonly [number, number, number];
const rad = (degrees: number) => (degrees * Math.PI) / 180;
/** The room is described in polar terms: angle in degrees (x = cos, z = sin) and distance from the centre. */
const polar = (angle: number, r: number, y = 0) => new THREE.Vector3(Math.cos(rad(angle)) * r, y, Math.sin(rad(angle)) * r);
/** The turn about y that makes local +z point at the centre of the room. */
const facing = (angle: number) => Math.atan2(-Math.cos(rad(angle)), -Math.sin(rad(angle)));
const frame = (angle: number, r: number, y = 0) =>
  new THREE.Matrix4().compose(polar(angle, r, y), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, facing(angle), 0)), new THREE.Vector3(1, 1, 1));

/** Many boxes (or any unit geometry) in one draw call, each with its own colour. */
class Batch {
  private readonly matrices: THREE.Matrix4[] = [];
  private readonly colours: THREE.Color[] = [];
  add(size: P3, at: P3, colour: THREE.ColorRepresentation, parent?: THREE.Matrix4, turn: P3 = [0, 0, 0]) {
    const local = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn)), new THREE.Vector3(...size));
    this.matrices.push(parent ? parent.clone().multiply(local) : local);
    this.colours.push(new THREE.Color(colour));
  }
  build(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) {
    if (!this.matrices.length) { geometry.dispose(); material.dispose(); return null; }
    const mesh = new THREE.InstancedMesh(geometry, material, this.matrices.length);
    this.matrices.forEach((matrix, index) => { mesh.setMatrixAt(index, matrix); mesh.setColorAt(index, this.colours[index]); });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}

const paint = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const STONE = { granite: '#a09f99', sandstone: '#c4a97e', basalt: '#66656f', mossy: '#8f957f', whitewash: '#dcd8ca' } as const;
const HATCH: P3 = [polar(75, 3).x, 0, polar(75, 3).z];
const FLOOR_R = 4.8, ROOM_R = 4.3, WALL_H = 3.36, A0 = 152, A1 = 332;

export default defineWorld({
  questions: {
    work: choice('What state is the study in?', {
      orderly: 'Orderly: books shelved, a few notes squared on the desk, everything in its place.',
      obsessed: 'Deep in an obsession: paper all over the floor, books in stacks, a great chart pinned to the wall.',
      abandoned: 'Abandoned for years: cobwebs in the rafters, dust over everything, a stool on its side.',
      ransacked: 'Ransacked: shelves emptied onto the floor, pages torn out and thrown about.',
      scorched: 'Just after a spell went wrong: a black star-burst scorched into the middle of the floor, smoke still rising.',
    }),
    hearth: choice('What is in the hearth?', {
      roaring: 'A roaring orange fire.',
      embers: 'Low red embers.',
      cold: 'Cold grey ash.',
      witchfire: 'An unnatural green and violet flame that gives no warmth.',
    }),
    hatch: choice('What about the stair hatch in the floor?', {
      open: 'Open on a dark spiral stair, the trapdoor thrown back.',
      lit: 'Open, with warm lamplight rising from below: someone is coming up.',
      barred: 'Shut and barred with iron: nobody is to come up, or nothing is to get out.',
    }),
    rug: choice('What is on the floor in the middle of the room?', {
      persian: 'A red patterned rug with a pale track worn across it by pacing.',
      stars: 'A round midnight-blue rug woven with gold stars and constellations.',
      pelt: 'A shaggy brown bearskin.',
      bare: 'Bare boards, with a pale path worn into the wood by years of pacing.',
    }),
    hanging: choice('Besides drying herbs, what hangs from the rafters?', {
      herbs: 'Only herbs: many bunches of sage, lavender and dried flowers.',
      crocodile: 'A stuffed crocodile on two cords.',
      lanterns: 'Glowing glass lanterns.',
      stars: 'A mobile of gold stars and a crescent moon.',
    }),
    roof: choice('How much of the roof is shown above the rafters?', {
      rafters: 'None: bare rafters meeting at a point, open to the sky.',
      cone: 'The back half of a steep conical roof.',
      broken: 'Broken remnants of a roof with gaps between them.',
    }),
    stone: choice('What are the walls built of?', {
      granite: 'Cool grey granite blocks.',
      sandstone: 'Warm honey sandstone.',
      basalt: 'Dark blue-black basalt.',
      mossy: 'Damp grey-green stone with moss in the joints.',
      whitewash: 'Whitewashed stone, pale and chalky.',
    }),
    slits: choice('What comes in through the arrow slits?', {
      beams: 'Hard shafts of light through dusty air.',
      moon: 'Cold blue moonlight.',
      storm: 'Flickers of lightning from a storm outside.',
      ivy: 'Ivy, creeping in and down the inside of the wall.',
      shuttered: 'Nothing: the slits are boarded shut.',
    }),
    lean: score('How crooked is the tower?', ['Perfectly plumb', 'A little off true', 'Visibly crooked', 'Leaning alarmingly, roof askew']),
  },

  build(a, context) {
    const { mood, random } = context;
    const evening = Math.min(1, Math.abs(mood.daylight - 0.5) * 2);
    const sky = new THREE.Color('#e3dfd0').lerp(new THREE.Color('#9a94b2'), evening).lerp(new THREE.Color(mood.warmth > 0.5 ? '#d9b89a' : '#a9b8c8'), 0.18);
    const { art: s, world } = diorama(context, {
      background: `#${sky.getHexString()}`, floor: null, width: 9.6, depth: 9.6, maxHeight: 2.6, radius: 1.2, pitch: 32, yaw: 28,
      slots: [[0, 0.3], [-2.4, 0.5], [polar(318, 3.75).x, polar(318, 3.75).z, 0.83, 0.42], [2.6, 0.4], [-0.5, -2.2], [-1.6, 2.5]],
    });
    const root = s.root;
    for (const child of root.children) if ((child as THREE.HemisphereLight).isHemisphereLight) (child as THREE.HemisphereLight).intensity = mix(1.45, 1.0, evening);
    const jit = (amount: number) => (random() - 0.5) * 2 * amount;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const station = (angle: number, r: number, y = 0) => {
      const group = new THREE.Group();
      group.position.copy(polar(angle, r, y));
      group.rotation.y = facing(angle);
      root.add(group);
      return group;
    };
    const rodBetween = (parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material, endRadius = radius) => {
      const direction = to.clone().sub(from);
      const mesh = add(parent, new THREE.CylinderGeometry(endRadius, radius, direction.length(), 8), material);
      mesh.position.copy(from).add(to).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      return mesh;
    };
    const glow = (hex: string, intensity: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: intensity, roughness: 0.6, ...extra });
    const haze = (hex: string, opacity: number, intensity = 0.6) =>
      new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: intensity, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });

    const stoneHex = STONE[a.stone];
    const stone = s.material(stoneHex, { roughness: 0.95 });
    const stoneDark = s.material(new THREE.Color(stoneHex).multiplyScalar(0.62).getStyle(), { roughness: 1 });
    const oak = s.material('#6b4a30');
    const oakDark = s.material('#46301f');
    const iron = s.material('#2f2f35', { metalness: 0.55, roughness: 0.5 });
    const white = () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
    const abandoned = a.work === 'abandoned';
    const flames: { mesh: THREE.Object3D; base: number; phase: number }[] = [];

    // ---- Floor: boards, cut through for the stair hatch, painted with the room's history.
    const toPx = (x: number, z: number): [number, number] => [(x / (FLOOR_R * 2) + 0.5) * 1024, (z / (FLOOR_R * 2) + 0.5) * 1024];
    const px = (metres: number) => (metres / (FLOOR_R * 2)) * 1024;
    const floorMap = paint(1024, 1024, (ctx) => {
      ctx.fillStyle = '#8f6f4c';
      ctx.fillRect(0, 0, 1024, 1024);
      for (let row = 0; row < 40; row++) {
        const tone = 0.85 + random() * 0.28;
        ctx.fillStyle = `rgb(${Math.round(143 * tone)},${Math.round(111 * tone)},${Math.round(76 * tone)})`;
        ctx.fillRect(0, row * 25.6, 1024, 25.6);
        ctx.fillStyle = 'rgba(40,26,14,0.75)';
        ctx.fillRect(0, row * 25.6, 1024, 2);
        for (let joint = random() * 300; joint < 1024; joint += 180 + random() * 260) ctx.fillRect(joint, row * 25.6, 2, 25.6);
      }
      if (a.rug === 'bare') {
        ctx.strokeStyle = 'rgba(214,190,150,0.22)';
        ctx.lineCap = 'round';
        for (const width of [0.75, 0.5, 0.28]) {
          ctx.lineWidth = px(width);
          ctx.beginPath();
          ctx.ellipse(...toPx(0, 0.3), px(2.3), px(0.85), -0.25, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if (abandoned) { ctx.fillStyle = 'rgba(200,196,186,0.42)'; ctx.fillRect(0, 0, 1024, 1024); }
      if (a.work === 'scorched') {
        const [cx, cy] = toPx(0, 0.3);
        ctx.fillStyle = 'rgba(14,10,10,0.9)';
        ctx.beginPath();
        const spikes = 22;
        for (let i = 0; i <= spikes * 2; i++) {
          const t = (i / (spikes * 2)) * Math.PI * 2, r = px(i % 2 ? 1.2 + random() * 0.4 : 2.0 + random() * 1.2);
          if (i === 0) ctx.moveTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); else ctx.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r);
        }
        ctx.fill();
        const burn = ctx.createRadialGradient(cx, cy, px(0.3), cx, cy, px(3.2));
        burn.addColorStop(0, 'rgba(10,8,8,0.85)');
        burn.addColorStop(1, 'rgba(10,8,8,0)');
        ctx.fillStyle = burn;
        ctx.fillRect(0, 0, 1024, 1024);
      }
    });
    floorMap.repeat.set(1 / (FLOOR_R * 2), 1 / (FLOOR_R * 2));
    floorMap.offset.set(0.5, 0.5);
    const disc = new THREE.Shape();
    disc.absarc(0, 0, FLOOR_R, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(HATCH[0], -HATCH[2], 0.78, 0, Math.PI * 2, true);
    disc.holes.push(hole);
    const floorGeometry = new THREE.ExtrudeGeometry(disc, { depth: 0.3, bevelEnabled: false, curveSegments: 40 });
    floorGeometry.rotateX(-Math.PI / 2);
    floorGeometry.translate(0, -0.3, 0);
    const floor = new THREE.Mesh(floorGeometry, [new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.85 }), oakDark]);
    floor.receiveShadow = true;
    root.add(floor);
    world.ground = floor;

    // ---- The tower below, leaning as crooked as asked.
    const masonry = paint(512, 256, (ctx) => {
      const base = new THREE.Color(stoneHex);
      ctx.fillStyle = `#${base.clone().multiplyScalar(0.5).getHexString()}`;
      ctx.fillRect(0, 0, 512, 256);
      for (let row = 0; row < 5; row++)
        for (let col = -1; col < 9; col++) {
          ctx.fillStyle = `#${base.clone().multiplyScalar(0.82 + random() * 0.26).getHexString()}`;
          ctx.fillRect(col * 64 + (row % 2) * 32 + 2, row * 51.2 + 2, 60, 47.2);
        }
    });
    masonry.wrapS = THREE.RepeatWrapping;
    masonry.repeat.set(5, 1);
    const drum = new THREE.CylinderGeometry(FLOOR_R + 0.02, FLOOR_R - 0.12, 1.5, 44, 5, true);
    const drumAt = drum.getAttribute('position');
    for (let i = 0; i < drumAt.count; i++) {
      const drop = (0.75 - drumAt.getY(i)) / 1.5;
      drumAt.setX(i, drumAt.getX(i) - drop * a.lean * 0.75);
      drumAt.setZ(i, drumAt.getZ(i) + drop * a.lean * 0.2);
    }
    drum.computeVertexNormals();
    add(root, drum, new THREE.MeshStandardMaterial({ map: masonry, roughness: 0.95, side: THREE.DoubleSide }), [0, -1.05, 0]);
    add(root, new THREE.CylinderGeometry(FLOOR_R + 0.16, FLOOR_R, 0.22, 44), stoneDark, [0, -0.41, 0]);

    // ---- The curved wall: the far half only, stepping down at the cut ends.
    const blocks = new Batch();
    const COLS = 36, ROWS = 8, BH = WALL_H / ROWS;
    const base = new THREE.Color(stoneHex), moss = new THREE.Color('#5f7a3c');
    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++) {
        const end = Math.min(col, COLS - 1 - col);
        if (row >= Math.min(ROWS, 2 + Math.floor(end * 1.5 + random() * 1.3))) continue;
        if (row === ROWS - 1 && random() < mood.wear * 0.45) continue;
        const angle = A0 + (col + 0.5 + (row % 2 ? 0.5 : 0)) * ((A1 - A0) / COLS);
        const tint = base.clone().multiplyScalar(0.84 + random() * 0.24);
        if (a.stone === 'mossy' && random() < 0.3) tint.lerp(moss, 0.25 + random() * 0.4);
        blocks.add([0.43, BH + 0.004, 0.5], [0, 0, 0], tint, frame(angle, ROOM_R + 0.25 + jit(0.025), row * BH + BH / 2));
      }
    blocks.build(root, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.96 }));

    // ---- Arrow slits.
    const slitHex = { beams: evening > 0.5 ? '#ffd9a0' : '#fff6d8', moon: '#bcd4ff', storm: '#8f8fc0', ivy: '#dff0c8', shuttered: '#000000' }[a.slits];
    const slitGlow = glow(slitHex, a.slits === 'storm' ? 1.0 : 1.6);
    const wood = new Batch();
    const leaves = new Batch();
    for (const angle of [174, 232, 314]) {
      const g = station(angle, ROOM_R - 0.02, 0);
      add(g, new THREE.BoxGeometry(0.62, 1.7, 0.06), stoneDark, [0, 2.05, 0]);
      if (a.slits === 'shuttered') {
        for (let i = 0; i < 3; i++) wood.add([0.13, 1.3, 0.04], [(i - 1) * 0.14, 2.05, 0.05], pick(['#5a4028', '#6b4a30', '#4c3520']), g.matrix.clone().compose(g.position, g.quaternion, g.scale));
        for (const y of [1.65, 2.45]) wood.add([0.48, 0.08, 0.05], [0, y, 0.08], '#3a2a1a', new THREE.Matrix4().compose(g.position, g.quaternion, g.scale));
        continue;
      }
      add(g, new THREE.BoxGeometry(0.2, 1.46, 0.07), slitGlow, [0, 2.05, 0.01]);
      add(g, new THREE.BoxGeometry(0.46, 0.16, 0.07), slitGlow, [0, 2.25, 0.01]);
      if (a.slits === 'beams' || a.slits === 'moon') {
        const from = polar(angle, ROOM_R - 0.1, 2.1), to = polar(angle + 14, ROOM_R - 3.1, 0.05);
        const shaft = rodBetween(root, from, to, 0.1, haze(slitHex, a.slits === 'moon' ? 0.13 : 0.2), 0.5);
        shaft.castShadow = shaft.receiveShadow = false;
        const pool = add(root, new THREE.CircleGeometry(0.62, 20), haze(slitHex, 0.3), [to.x, 0.03, to.z]);
        pool.rotation.x = -Math.PI / 2;
        pool.scale.y = 1.6;
        pool.rotation.z = -rad(angle);
        pool.castShadow = false;
      }
      if (a.slits === 'ivy') {
        const at = new THREE.Matrix4().compose(g.position, g.quaternion, g.scale);
        for (let i = 0; i < 46; i++) {
          const fall = random(), size = mix(0.07, 0.14, random());
          leaves.add([size, size, size * 0.35], [jit(0.25 + fall * 0.55), 2.75 - fall * 2.6 * mix(0.5, 1, random()), 0.05 + random() * 0.05], pick(['#3f6b33', '#4f7d3a', '#2f5528', '#6b8a3c']), at, [jit(0.5), jit(0.8), jit(1.5)]);
        }
      }
    }
    leaves.build(root, new THREE.IcosahedronGeometry(0.6, 0), white());

    // ---- Hearth, built out from the wall on the left.
    const fire = { roaring: 1, embers: 0.35, cold: 0, witchfire: 0.8 }[a.hearth];
    const fireHex = a.hearth === 'witchfire' ? '#59e08a' : a.hearth === 'embers' ? '#ff5a1e' : '#ff9a2a';
    {
      const g = station(210, ROOM_R, 0);
      add(g, new THREE.BoxGeometry(2.5, 0.1, 1.3), stoneDark, [0, 0.05, 0.6]);
      add(g, new THREE.BoxGeometry(2.1, 1.5, 0.3), stone, [0, 0.75, 0.1]);
      add(g, new THREE.BoxGeometry(1.3, 1.1, 0.1), s.material('#1a1614'), [0, 0.6, 0.27]);
      for (const side of [-1, 1]) add(g, new THREE.BoxGeometry(0.38, 1.35, 0.75), stone, [side * 0.85, 0.675, 0.42]);
      add(g, new THREE.BoxGeometry(2.2, 0.3, 0.85), stone, [0, 1.5, 0.44]);
      add(g, new THREE.BoxGeometry(2.4, 0.08, 0.98), oakDark, [0, 1.69, 0.48]);
      const hood = add(g, new THREE.CylinderGeometry(0.5, 1.5, 1.62, 4), stone, [0, 2.54, 0.3]);
      hood.rotation.y = Math.PI / 4;
      hood.scale.z = 0.52;
      const bark = s.material('#4a3526');
      for (let i = 0; i < 3; i++) add(g, new THREE.CylinderGeometry(0.07, 0.08, 0.95, 8), bark, [jit(0.08), 0.17 + (i === 2 ? 0.12 : 0), 0.5 + (i - 1) * 0.16 * (i === 2 ? 0 : 1)]).rotation.z = Math.PI / 2 + jit(0.25);
      if (a.hearth === 'cold') add(g, new THREE.SphereGeometry(0.42, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), s.material('#9a968f', { roughness: 1 }), [0, 0.1, 0.5]).scale.y = 0.35;
      else {
        const hot = glow(fireHex, 2.2, { roughness: 0.4 });
        const core = glow(a.hearth === 'witchfire' ? '#b98cff' : '#ffe08a', 2.6);
        add(g, new THREE.SphereGeometry(0.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), hot, [0, 0.1, 0.5]).scale.y = 0.4;
        const tongues = a.hearth === 'embers' ? 2 : 6;
        for (let i = 0; i < tongues; i++) {
          const height = (a.hearth === 'embers' ? 0.16 : mix(0.35, 0.85, random())) * mix(0.8, 1.15, mood.energy);
          const tongue = add(g, new THREE.ConeGeometry(mix(0.09, 0.17, random()), height, 7), i % 3 === 0 ? core : hot, [(i - (tongues - 1) / 2) * 0.17 + jit(0.04), 0.26 + height / 2, 0.5 + jit(0.12)]);
          tongue.castShadow = false;
          flames.push({ mesh: tongue, base: 1, phase: random() * 6.3 });
        }
        const light = new THREE.PointLight(fireHex, 26 * fire * mix(0.6, 1.3, evening), 9, 2);
        light.position.set(0, 0.8, 1.1);
        g.add(light);
      }
      // Mantel: candles and a skull or a row of jars.
      for (const x of [-0.95, 0.9]) candle(g, [x, 1.73, 0.6], mix(0.14, 0.3, random()));
      add(g, new THREE.SphereGeometry(0.13, 12, 9), s.material('#e4dcc6'), [0.2 + jit(0.2), 1.85, 0.55]).scale.set(0.9, 1, 1.15);
      for (let i = 0; i < 3; i++) add(g, new THREE.CylinderGeometry(0.06, 0.07, 0.2 + i * 0.05, 10), s.material(pick(['#6b8f7a', '#8a6b9a', '#a58a4a', '#4a6f8f']), { roughness: 0.3 }), [-0.55 + i * 0.19, 1.83 + i * 0.025, 0.5]);
    }

    function candle(parent: THREE.Object3D, at: P3, height: number) {
      add(parent, new THREE.CylinderGeometry(0.035, 0.04, height, 8), s.material('#ece2c4'), [at[0], at[1] + height / 2, at[2]]);
      const flame = add(parent, new THREE.SphereGeometry(0.04, 8, 6), glow('#ffcf6a', mix(1.2, 2.6, evening)), [at[0], at[1] + height + 0.06, at[2]]);
      flame.scale.set(0.8, 1.7, 0.8);
      flame.castShadow = false;
      flames.push({ mesh: flame, base: 1, phase: random() * 6.3 });
    }

    // ---- Bookcases curving round the back, and the books in or out of them.
    const books = new Batch();
    const paper = new Batch();
    const BOOK = ['#7a2e2a', '#2f4a6b', '#3f5a3a', '#6b4a2a', '#4a3560', '#8a7a4a', '#2a2a30', '#9a5a2a', '#7d2f52', '#c9b98a'];
    const bookColour = () => { const tint = new THREE.Color(pick(BOOK)); return abandoned ? tint.lerp(new THREE.Color('#9a968c'), 0.5) : tint; };
    const fill = { orderly: 0.96, obsessed: 0.6, abandoned: 0.8, ransacked: 0.16, scorched: 0.75 }[a.work] * mix(0.75, 1, mood.density);
    for (let unit = 0; unit < 5; unit++) {
      const at = frame(247 + unit * 10.6, ROOM_R - 0.25);
      wood.add([0.78, 2.1, 0.04], [0, 1.05, -0.17], '#4a3320', at);
      for (const x of [-0.37, 0.37]) wood.add([0.04, 2.1, 0.36], [x, 1.05, 0], '#5c4029', at);
      for (const y of [0.05, 0.55, 1.04, 1.53, 2.08]) wood.add([0.78, 0.045, 0.36], [0, y, 0], '#6b4a30', at);
      for (let shelf = 0; shelf < 4; shelf++) {
        const y = [0.05, 0.55, 1.04, 1.53][shelf] + 0.025;
        let x = -0.34;
        while (x < 0.3) {
          const thick = mix(0.035, 0.085, random()), tall = mix(0.26, 0.42, random());
          if (random() < fill) {
            const lean = random() < 0.1 ? 0.25 : 0;
            books.add([thick, tall, 0.24], [x + thick / 2 + lean * 0.05, y + tall / 2, 0.02], bookColour(), at, [0, 0, -lean]);
          } else if (random() < 0.3) x += 0.08;
          x += thick + 0.004;
        }
      }
      if (random() < 0.7) for (let i = 0; i < 3; i++) wood.add([0.07, 0.07, 0.5], [jit(0.1), 2.14 + (i === 2 ? 0.065 : 0), (i - 0.5) * (i === 2 ? 0 : 0.09)], '#e6dcc0', at, [0, Math.PI / 2 + jit(0.2), 0]);
    }
    const hatchClear = (x: number, z: number) => Math.hypot(x - HATCH[0], z - HATCH[2]) > 1.05;
    const stackSpots: [number, number][] = [[168, 3.8], [232, 3.55], [296, 3.4], [20, 3.9], [135, 4.0], [48, 3.9]];
    const stacks = a.work === 'obsessed' ? 6 : a.work === 'orderly' ? 1 : a.work === 'ransacked' ? 0 : 2;
    for (let i = 0; i < stacks; i++) {
      const at = polar(stackSpots[i][0], stackSpots[i][1]);
      const tall = 2 + Math.floor(random() * (a.work === 'obsessed' ? 8 : 4));
      let y = 0;
      for (let k = 0; k < tall; k++) {
        const thick = mix(0.04, 0.09, random());
        books.add([mix(0.24, 0.32, random()), thick, mix(0.3, 0.4, random())], [at.x + jit(0.03), y + thick / 2, at.z + jit(0.03)], bookColour(), undefined, [0, jit(0.5), 0]);
        y += thick;
      }
    }
    if (a.work === 'ransacked')
      for (let i = 0; i < 46; i++) {
        const at = polar(mix(236, 300, random()), mix(1.9, 3.7, random()));
        const open = random() < 0.25;
        books.add([mix(0.24, 0.3, random()) * (open ? 1.8 : 1), mix(0.04, 0.08, random()) * (open ? 0.5 : 1), 0.34], [at.x, 0.03 + random() * 0.06, at.z], open ? '#e2d8bc' : bookColour(), undefined, [jit(0.15), random() * 6.3, jit(0.15)]);
      }
    const sheets = Math.round({ orderly: 0, obsessed: mix(50, 130, mood.density), abandoned: 10, ransacked: mix(40, 80, mood.density), scorched: 26 }[a.work]);
    for (let i = 0; i < sheets; i++) {
      const at = polar(random() * 360, Math.sqrt(random()) * 4.0);
      if (!hatchClear(at.x, at.z)) continue;
      const tone = a.work === 'scorched' && random() < 0.6 ? '#4a4038' : abandoned ? '#c9c2a8' : pick(['#efe6cc', '#e6dcc0', '#f4eeda']);
      paper.add([0.24, 0.004, 0.32], [at.x, 0.008 + i * 0.0004, at.z], tone, undefined, [0, random() * 6.3, 0]);
    }

    // ---- Writing desk under the right-hand slit, with a clear top for something small.
    {
      const at = frame(318, 3.75);
      wood.add([1.6, 0.07, 0.86], [0, 0.785, 0], '#6b4a30', at);
      for (const x of [-0.72, 0.72]) for (const z of [-0.36, 0.36]) wood.add([0.08, 0.76, 0.08], [x, 0.38, z], '#4a3320', at);
      wood.add([1.44, 0.14, 0.04], [0, 0.68, 0.38], '#5c4029', at);
      for (let i = 0; i < 4; i++) paper.add([0.22, 0.004, 0.3], [0.56 + jit(0.04), 0.825 + i * 0.004, jit(0.06)], '#efe6cc', at, [0, jit(0.4), 0]);
      const g = station(318, 3.75, 0);
      candle(g, [-0.66, 0.82, -0.26], 0.2);
      add(g, new THREE.CylinderGeometry(0.035, 0.045, 0.07, 8), s.material('#22222a'), [0.58, 0.855, -0.3]);
      const quill = add(g, new THREE.ConeGeometry(0.02, 0.34, 5), s.material('#e8e2d2'), [0.6, 1.02, -0.3]);
      quill.rotation.z = -0.35;
      const stool = new THREE.Group();
      add(stool, new THREE.CylinderGeometry(0.2, 0.2, 0.05, 14), oak, [0, 0.48, 0]);
      for (let i = 0; i < 3; i++) add(stool, new THREE.CylinderGeometry(0.02, 0.028, 0.48, 6), oakDark, [Math.cos(i * 2.094) * 0.14, 0.24, Math.sin(i * 2.094) * 0.14]);
      stool.position.copy(polar(318, 2.72));
      if (abandoned || a.work === 'ransacked' || a.work === 'scorched') { stool.rotation.z = Math.PI / 2; stool.rotation.y = random() * 6.3; stool.position.y = 0.2; }
      root.add(stool);
    }

    // ---- The stair hatch.
    {
      const [hx, , hz] = HATCH;
      const lit = a.hatch === 'lit';
      const shaftMaterial = lit ? glow('#c9772e', 0.55, { side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 1, side: THREE.DoubleSide });
      add(root, new THREE.CylinderGeometry(0.775, 0.775, 1.5, 24, 1, true), shaftMaterial, [hx, -1.05, hz]);
      for (let i = 0; i < 5; i++) {
        const turn = rad(168 + i * 36);
        wood.add([0.62, 0.07, 0.3], [hx + Math.cos(turn) * 0.44, -0.1 - i * 0.2, hz + Math.sin(turn) * 0.44], lit ? '#c98a4a' : '#8a8478', undefined, [0, -turn, 0]);
      }
      add(root, new THREE.TorusGeometry(0.81, 0.045, 6, 30), stoneDark, [hx, 0.01, hz]).rotation.x = Math.PI / 2;
      const lid = new THREE.Group();
      lid.position.set(hx + 0.84, 0.035, hz);
      for (let i = 0; i < 5; i++) add(lid, new THREE.BoxGeometry(1.68, 0.06, 0.33), i % 2 ? oak : oakDark, [-0.84, 0, (i - 2) * 0.335]);
      for (const z of [-0.5, 0.5]) add(lid, new THREE.BoxGeometry(1.6, 0.02, 0.09), iron, [-0.84, 0.04, z]);
      add(lid, new THREE.TorusGeometry(0.09, 0.016, 6, 14), iron, [-1.4, 0.06, 0]).rotation.x = Math.PI / 2;
      root.add(lid);
      if (a.hatch === 'barred') {
        add(root, new THREE.BoxGeometry(0.1, 0.07, 2.1), iron, [hx - 0.2, 0.11, hz]);
        for (const z of [-1, 1]) add(root, new THREE.BoxGeometry(0.2, 0.14, 0.12), iron, [hx - 0.2, 0.07, hz + z * 0.98]);
        add(root, new THREE.BoxGeometry(0.16, 0.2, 0.08), s.material('#8a7a3a', { metalness: 0.6, roughness: 0.4 }), [hx - 0.2, 0.12, hz + 0.84]);
      } else {
        lid.rotation.z = -rad(112 + jit(6));
        add(root, new THREE.CylinderGeometry(0.06, 0.07, 2.4, 10), oakDark, [hx, -0.3, hz]);
        add(root, new THREE.SphereGeometry(0.1, 12, 8), oak, [hx, 0.95, hz]);
        if (lit) {
          const up = add(root, new THREE.CylinderGeometry(1.0, 0.72, 1.3, 20, 1, true), haze('#ffb45a', 0.16, 0.9), [hx, 0.65, hz]);
          up.castShadow = false;
          const lamp = new THREE.PointLight('#ffa64a', 9, 5, 2);
          lamp.position.set(hx, 0.5, hz);
          root.add(lamp);
        }
      }
    }

    // ---- Rug.
    const wornBand = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.strokeStyle = 'rgba(214,196,160,0.55)';
      ctx.lineCap = 'round';
      for (const w of [0.2, 0.12]) { ctx.lineWidth = height * w; ctx.beginPath(); ctx.moveTo(width * 0.06, height * 0.56); ctx.bezierCurveTo(width * 0.35, height * 0.44, width * 0.65, height * 0.6, width * 0.94, height * 0.47); ctx.stroke(); }
    };
    const burnt = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      if (a.work !== 'scorched') return;
      const burn = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.min(width, height) * 0.5);
      burn.addColorStop(0, 'rgba(8,6,6,1)'); burn.addColorStop(0.7, 'rgba(12,8,8,0.85)'); burn.addColorStop(1, 'rgba(12,8,8,0)');
      ctx.fillStyle = burn;
      ctx.fillRect(0, 0, width, height);
    };
    if (a.rug === 'persian') {
      const field = mood.cheer > 0.4 ? '#9a2e2a' : '#6f2a35';
      const map = paint(768, 512, (ctx) => {
        ctx.fillStyle = '#e0cfa0'; ctx.fillRect(0, 0, 768, 512);
        for (let x = 4; x < 768; x += 8) ctx.clearRect(x, 0, 2, 512);
        ctx.fillStyle = '#e0cfa0'; ctx.fillRect(0, 0, 768, 512);
        ctx.fillStyle = '#2a2f55'; ctx.fillRect(22, 14, 724, 484);
        ctx.fillStyle = '#d9b560'; ctx.fillRect(48, 40, 672, 432);
        ctx.fillStyle = field; ctx.fillRect(66, 58, 636, 396);
        ctx.fillStyle = '#d9b560';
        for (let i = 0; i < 14; i++) for (const y of [27, 485]) { ctx.beginPath(); ctx.arc(60 + i * 50, y, 7, 0, 6.3); ctx.fill(); }
        ctx.fillStyle = '#2a2f55'; ctx.beginPath(); ctx.ellipse(384, 256, 150, 105, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#d9b560'; ctx.beginPath(); ctx.ellipse(384, 256, 112, 74, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = field; ctx.beginPath(); ctx.ellipse(384, 256, 70, 44, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#e8d9a8';
        for (const [x, y] of [[130, 110], [638, 110], [130, 402], [638, 402]]) { ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x + 30, y); ctx.lineTo(x, y + 34); ctx.lineTo(x - 30, y); ctx.fill(); }
        wornBand(ctx, 768, 512);
        burnt(ctx, 768, 512);
      });
      const rug = add(root, new THREE.PlaneGeometry(3.9, 2.6), new THREE.MeshStandardMaterial({ map, roughness: 0.95 }), [0, 0.014, 0.3]);
      rug.rotation.set(-Math.PI / 2, 0, 0.2 + jit(0.12));
      rug.castShadow = false;
    } else if (a.rug === 'stars') {
      const map = paint(512, 512, (ctx) => {
        ctx.fillStyle = '#1f2a5c'; ctx.beginPath(); ctx.arc(256, 256, 256, 0, 6.3); ctx.fill();
        ctx.strokeStyle = '#e0bf5a'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(256, 256, 236, 0, 6.3); ctx.stroke();
        ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(256, 256, 196, 0, 6.3); ctx.stroke();
        for (let i = 0; i < 24; i++) { const t = (i / 24) * 6.283; ctx.beginPath(); ctx.moveTo(256 + Math.cos(t) * 200, 256 + Math.sin(t) * 200); ctx.lineTo(256 + Math.cos(t) * 232, 256 + Math.sin(t) * 232); ctx.stroke(); }
        ctx.fillStyle = '#f2d878'; ctx.lineWidth = 2.5;
        let last: [number, number] | null = null;
        for (let i = 0; i < 26; i++) {
          const t = random() * 6.3, r = Math.sqrt(random()) * 175, x = 256 + Math.cos(t) * r, y = 256 + Math.sin(t) * r, size = 4 + random() * 9;
          ctx.beginPath();
          for (let k = 0; k < 8; k++) { const q = (k / 8) * 6.283, d = k % 2 ? size * 0.35 : size; ctx.lineTo(x + Math.cos(q) * d, y + Math.sin(q) * d); }
          ctx.fill();
          if (last && i % 4 !== 0) { ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(x, y); ctx.stroke(); }
          last = [x, y];
        }
        wornBand(ctx, 512, 512);
        burnt(ctx, 512, 512);
      });
      const rug = add(root, new THREE.CircleGeometry(1.95, 48), new THREE.MeshStandardMaterial({ map, roughness: 0.95 }), [0, 0.014, 0.3]);
      rug.rotation.set(-Math.PI / 2, 0, random() * 6.3);
      rug.castShadow = false;
    } else if (a.rug === 'pelt') {
      const fur = s.material(a.work === 'scorched' ? '#2e2420' : '#6a4a30', { roughness: 1 });
      const hide = new THREE.Shape();
      for (let i = 0; i <= 48; i++) {
        const t = (i / 48) * Math.PI * 2;
        const legs = Math.pow(Math.abs(Math.sin(t * 2)), 6) * 0.55;
        const r = 1.0 + legs + Math.sin(t * 9) * 0.03;
        const x = Math.cos(t) * r * 1.45, y = Math.sin(t) * r * 0.95;
        if (i === 0) hide.moveTo(x, y); else hide.lineTo(x, y);
      }
      const pelt = new THREE.Group();
      const flat = add(pelt, new THREE.ExtrudeGeometry(hide, { depth: 0.03, bevelEnabled: false }), fur);
      flat.rotation.x = -Math.PI / 2;
      add(pelt, new THREE.SphereGeometry(0.3, 14, 10), fur, [1.62, 0.1, 0]).scale.set(1.25, 0.55, 1);
      add(pelt, new THREE.SphereGeometry(0.13, 10, 8), s.material('#3a2a1e'), [1.98, 0.09, 0]).scale.set(1.2, 0.6, 0.9);
      for (const z of [-1, 1]) add(pelt, new THREE.SphereGeometry(0.08, 8, 6), fur, [1.5, 0.22, z * 0.22]);
      pelt.position.set(-0.15, 0.005, 0.3);
      pelt.rotation.y = 0.35 + jit(0.3);
      root.add(pelt);
    }

    // ---- Rafters, tie beam and what hangs from them.
    const roof = new THREE.Group();
    roof.position.y = WALL_H;
    roof.rotation.set(a.lean * 0.05, 0, a.lean * 0.13);
    root.add(roof);
    const APEX = 2.15;
    for (let angle = A0; angle <= A1; angle += 30) rodBetween(roof, polar(angle, ROOM_R + 0.4, 0.02), new THREE.Vector3(0, APEX, 0), 0.085, oakDark, 0.06);
    add(roof, new THREE.CylinderGeometry(0.09, 0.09, 1.0, 8), oakDark, [0, APEX - 0.25, 0]);
    add(roof, new THREE.SphereGeometry(0.14, 10, 8), oak, [0, APEX - 0.8, 0]);
    if (a.roof !== 'rafters') {
      const boards = paint(512, 256, (ctx) => {
        ctx.fillStyle = '#4b4f5c'; ctx.fillRect(0, 0, 512, 256);
        for (let row = 0; row < 9; row++) {
          for (let col = 0; col < 32; col++) { ctx.fillStyle = `rgb(${70 + random() * 26},${74 + random() * 26},${88 + random() * 28})`; ctx.fillRect(col * 16 + (row % 2) * 8, row * 28.5, 15, 27); }
          ctx.fillStyle = 'rgba(20,20,26,0.8)'; ctx.fillRect(0, row * 28.5, 512, 2.5);
        }
      });
      const slate = new THREE.MeshStandardMaterial({ map: boards, roughness: 0.85, side: THREE.DoubleSide });
      const arcs: [number, number][] = a.roof === 'cone' ? [[172, 312]] : [[178, 206 + random() * 12], [240 + random() * 10, 268], [284, 312 - random() * 14]];
      for (const [from, to] of arcs) add(roof, new THREE.ConeGeometry(ROOM_R + 0.75, APEX + 0.12, Math.max(6, Math.round((to - from) / 5)), 1, true, rad(90 - to), rad(to - from)), slate, [0, (APEX + 0.12) / 2 - 0.02, 0]);
    }
    const beamEnd = polar(A1, ROOM_R + 0.2, WALL_H + 0.1);
    const tie = add(root, new THREE.BoxGeometry((ROOM_R + 0.2) * 2, 0.22, 0.22), oakDark, [0, WALL_H + 0.1, 0]);
    tie.rotation.y = -rad(A1);
    const along = (t: number, drop = 0) => new THREE.Vector3(beamEnd.x * t, WALL_H - 0.01 - drop, beamEnd.z * t);
    const cords = new Batch();
    const bunches = new Batch();
    const hang = (t: number, drop: number) => { const top = along(t), at = along(t, drop); cords.add([0.012, drop, 0.012], [top.x, top.y - drop / 2, top.z], '#c9b88a'); return at; };
    const herbCount = Math.round(mix(4, 9, mood.density)) + (a.hanging === 'herbs' ? 5 : 0);
    const HERB = abandoned ? ['#8a8468', '#9a8a5a', '#7a7a6a'] : ['#7c9a62', '#8a78b4', '#b89a52', '#a5673a', '#5f8a55', '#c9a0b0'];
    for (let i = 0; i < herbCount; i++) {
      const side = i % 2 ? 1 : -1, t = side * mix(0.2, 0.93, (Math.floor(i / 2) + random() * 0.7) / Math.ceil(herbCount / 2));
      const at = hang(t, mix(0.15, 0.4, random()));
      const size = mix(0.8, 1.3, random());
      bunches.add([0.13 * size, 0.42 * size, 0.13 * size], [at.x, at.y - 0.2 * size, at.z], pick(HERB), undefined, [jit(0.12), random() * 6.3, jit(0.12)]);
    }
    const swingers: THREE.Object3D[] = [];
    if (a.hanging === 'crocodile') {
      const croc = new THREE.Group();
      const hide = s.material('#6f7a45'), belly = s.material('#c9c08a');
      add(croc, new THREE.SphereGeometry(1, 16, 10), hide).scale.set(0.62, 0.13, 0.17);
      add(croc, new THREE.SphereGeometry(1, 12, 8), belly, [0, -0.04, 0]).scale.set(0.55, 0.1, 0.14);
      const tail = add(croc, new THREE.ConeGeometry(0.11, 0.85, 8), hide, [-0.92, 0.0, 0]);
      tail.rotation.z = Math.PI / 2;
      tail.scale.z = 0.7;
      add(croc, new THREE.BoxGeometry(0.42, 0.06, 0.15), hide, [0.78, 0.03, 0]);
      add(croc, new THREE.BoxGeometry(0.4, 0.035, 0.13), belly, [0.76, -0.045, 0]).rotation.z = -0.16;
      for (const z of [-1, 1]) {
        add(croc, new THREE.SphereGeometry(0.03, 8, 6), glow('#f2d24a', 0.5), [0.56, 0.1, z * 0.07]);
        for (const x of [0.32, -0.36]) add(croc, new THREE.BoxGeometry(0.08, 0.05, 0.22), hide, [x, -0.07, z * 0.22]).rotation.x = z * 0.5;
      }
      for (let i = 0; i < 9; i++) add(croc, new THREE.ConeGeometry(0.03, 0.07, 4), hide, [-0.75 + i * 0.16, 0.13 - Math.abs(i - 5) * 0.012, 0]);
      const mid = hang(-0.52, 0.55);
      hang(-0.62, 0.5); hang(-0.42, 0.5);
      croc.position.copy(mid).add(new THREE.Vector3(0, -0.08, 0));
      croc.rotation.y = -rad(A1) + Math.PI;
      croc.scale.setScalar(1.25);
      root.add(croc);
    } else if (a.hanging === 'lanterns') {
      const glassHex = mood.cheer > 0.35 ? '#ffc864' : '#9fe0b0';
      for (const t of [-0.72, -0.38, 0.36, 0.7]) {
        const at = hang(t, mix(0.3, 0.6, random()));
        const lantern = new THREE.Group();
        add(lantern, new THREE.ConeGeometry(0.15, 0.12, 6), iron, [0, -0.06, 0]);
        add(lantern, new THREE.CylinderGeometry(0.1, 0.085, 0.24, 6), glow(glassHex, mix(1.2, 2.4, evening), { roughness: 0.2 }), [0, -0.24, 0]).castShadow = false;
        add(lantern, new THREE.CylinderGeometry(0.11, 0.11, 0.03, 6), iron, [0, -0.375, 0]);
        lantern.position.copy(at);
        root.add(lantern);
        swingers.push(lantern);
      }
    } else if (a.hanging === 'stars') {
      const gold = glow('#f2cf5a', 0.9, { metalness: 0.4, roughness: 0.35 });
      for (const t of [-0.78, -0.6, -0.42, -0.26, 0.27, 0.44, 0.62, 0.8]) {
        const at = hang(t, mix(0.25, 0.75, random()));
        const star = add(root, new THREE.OctahedronGeometry(mix(0.07, 0.12, random()), 0), gold, [at.x, at.y - 0.1, at.z]);
        star.scale.y = 1.5;
        swingers.push(star);
      }
      const at = hang(0.53, 0.5);
      const moon = add(root, new THREE.TorusGeometry(0.17, 0.045, 8, 20, Math.PI * 1.2), glow('#f4ecc8', 0.9), [at.x, at.y - 0.2, at.z]);
      moon.rotation.set(0, -rad(A1), 0.9);
    }
    cords.build(root, new THREE.CylinderGeometry(1, 1, 1, 5), white());
    bunches.build(root, new THREE.ConeGeometry(1, 1, 7), white());

    // ---- State of the place.
    if (a.work === 'obsessed') {
      const chart = paint(384, 512, (ctx) => {
        ctx.fillStyle = '#e8dcba'; ctx.fillRect(0, 0, 384, 512);
        ctx.strokeStyle = '#3a2a22'; ctx.lineWidth = 4;
        for (const r of [150, 105, 58]) { ctx.beginPath(); ctx.arc(192, 220, r, 0, 6.3); ctx.stroke(); }
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const t = (i * 2 * 6.283) / 5; ctx.lineTo(192 + Math.cos(t - 1.57) * 150, 220 + Math.sin(t - 1.57) * 150); }
        ctx.stroke();
        ctx.strokeStyle = '#a0281e'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(192 + 80, 220 - 60, 26, 0, 6.3); ctx.stroke();
        ctx.fillStyle = '#3a2a22';
        for (let row = 0; row < 5; row++) for (let x = 30; x < 350; x += 14 + random() * 30) ctx.fillRect(x, 400 + row * 20, 8 + random() * 22, 5);
      });
      const g = station(189.5, ROOM_R - 0.03, 0);
      add(g, new THREE.PlaneGeometry(1.1, 1.45), new THREE.MeshStandardMaterial({ map: chart, roughness: 0.9, side: THREE.DoubleSide }), [0, 1.75, 0.02]).rotation.z = jit(0.06);
      const at = new THREE.Matrix4().compose(g.position, g.quaternion, g.scale);
      for (let i = 0; i < 7; i++) paper.add([0.24, 0.3, 0.006], [jit(0.75), 0.75 + random() * 1.9, 0.03 + i * 0.004], pick(['#efe6cc', '#e6dcc0', '#f4eeda']), at, [0, 0, jit(0.3)]);
    }
    if (abandoned) {
      const web = new THREE.MeshStandardMaterial({ color: '#f4f4f0', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, roughness: 1 });
      const spots: [THREE.Vector3, number][] = [[along(-0.92, 0), 0], [along(0.9, 0), 2.6], [along(-0.3, 0), 1.2], [along(0.35, 0), 4], [polar(215, 3.6, 2.9), 0.5], [polar(270, 3.9, 2.2), 1.9], [polar(318, 3.6, 0.8), 3], [polar(170, 4.0, 1.5), 5]];
      for (const [at, turn] of spots) {
        const fan = add(root, new THREE.CircleGeometry(mix(0.6, 1.1, random()), 5, 0, Math.PI * 0.6), web, [at.x, at.y, at.z]);
        fan.rotation.set(Math.PI, turn + jit(0.4), jit(0.3));
        fan.castShadow = false;
      }
    }
    const smoke: THREE.Mesh[] = [];
    if (a.work === 'scorched') {
      const grey = haze('#5a5560', 0.3, 0.05);
      for (let i = 0; i < 5; i++) {
        const t = (i / 5) * 6.283 + random(), r = mix(1.2, 1.9, random());
        const curve = new THREE.CatmullRomCurve3([0, 0.5, 1.1, 1.8].map((y) => new THREE.Vector3(jit(0.15), y, jit(0.15))));
        const wisp = add(root, new THREE.TubeGeometry(curve, 14, mix(0.04, 0.09, random()), 6), grey, [Math.cos(t) * r, 0.02, 0.3 + Math.sin(t) * r]);
        wisp.castShadow = false;
        smoke.push(wisp);
      }
    }

    // ---- Candle stands near the wall; more of them lit as the room fills.
    const stands: [number, number][] = [[160, 3.9], [300, 3.75], [226, 3.7]];
    for (let i = 0; i < Math.round(mix(1, 3, mood.density)); i++) {
      const g = station(stands[i][0], stands[i][1], 0);
      add(g, new THREE.CylinderGeometry(0.03, 0.03, 1.3, 8), iron, [0, 0.65, 0]);
      add(g, new THREE.CylinderGeometry(0.05, 0.2, 0.08, 10), iron, [0, 0.04, 0]);
      add(g, new THREE.BoxGeometry(0.62, 0.03, 0.04), iron, [0, 1.3, 0]);
      for (const x of [-0.28, 0, 0.28]) { add(g, new THREE.CylinderGeometry(0.06, 0.03, 0.04, 8), iron, [x, 1.33, 0]); candle(g, [x, 1.34, 0], mix(0.1, 0.26, random())); }
    }

    wood.build(root, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }));
    books.build(root, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 }));
    paper.build(root, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }));

    const speed = mix(0.5, 2.2, mood.energy);
    let flash = 0;
    world.update = (dt, time) => {
      const t = time * speed;
      for (const flame of flames) {
        const f = 1 + Math.sin(t * 9 + flame.phase) * 0.14 + Math.sin(t * 23 + flame.phase * 2) * 0.08;
        flame.mesh.scale.y = (flame.mesh.userData.y ??= flame.mesh.scale.y) * f;
      }
      swingers.forEach((item, index) => { item.rotation.z = Math.sin(t * 0.9 + index * 1.7) * 0.08; item.rotation.y += dt * 0.2 * speed; });
      smoke.forEach((wisp, index) => { wisp.rotation.y = t * 0.3 + index; });
      if (a.slits === 'storm') {
        flash = Math.max(0, flash - dt * 5);
        if (Math.sin(t * 1.7) * Math.sin(t * 0.61 + 1) > 0.86) flash = 1;
        slitGlow.emissiveIntensity = 0.5 + flash * 3.5;
      }
    };
    // A round room fills less of the frame than its bounding box suggests: close in.
    const fit = world.place;
    world.place = (items) => {
      fit(items);
      const camera = world.camera as THREE.OrthographicCamera;
      for (const edge of ['left', 'right', 'top', 'bottom'] as const) camera[edge] *= 0.8;
      camera.updateProjectionMatrix();
    };
    return world;
  },
});
