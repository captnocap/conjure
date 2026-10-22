import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, figure, mix } from '@conjure/kit';
import { POSITIONS, chessTable, placePieces } from './chess';
import { ironFence, lampPost, litterBin, parkBench } from './park';
import { hipsAt, joints, pick, poseArm, reachTo, seat, skinTones } from './pose';

type Ctx = CanvasRenderingContext2D;
const paint = (w: number, h: number, draw: (c: Ctx) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const W = 16, D = 13;
const TABLE_Z = 0.4;
const TABLE_X = [1.5, -1.5, 4.6, -4.6];
const LEAF = { yellow: '#d9b23a', ochre: '#c98a2a', brown: '#8a5a2a', rust: '#a84a2a', green: '#5a8a3a', olive: '#7a8a3a' };

export default defineWorld({
  questions: {
    season: choice('What season is it in the park?', {
      autumn: 'Autumn: the plane trees yellow and ochre, leaves down everywhere.',
      bare: 'Late winter: bare branches, brown leaf litter, long shadows.',
      green: 'Early summer: full green crowns, dappled shade, clean paths.',
    }),
    tables: choice('What are the chess tables like?', {
      stone: 'Concrete pedestals with inlaid stone boards and fixed concrete benches.',
      metal: 'Green-painted steel tables with inlaid boards and steel stools.',
      plywood: 'Painted plywood boards on oil drums with crates for seats, the improvised kind.',
    }),
    games: choice('How many games are going on at the tables behind?', {
      none: 'None: the tables stand empty.',
      one: 'One game at the far table.',
      most: 'Most of the tables have a pair hunched over them.',
      all: 'Every table taken, a game at each.',
    }),
    time: choice('What time of day is it?', {
      dawn: 'Dawn solitude: cold pink-grey light, the lamp still on, nobody about.',
      lunch: 'A lunchtime crowd: office workers on the path, watchers at the tables, bright light.',
      dusk: 'Dusk with the regulars: the lamp just coming on, orange sky, long shadows.',
    }),
    path: choice('What is the path made of?', {
      asphalt: 'Dark asphalt with a painted edge.',
      gravel: 'Pale crushed gravel.',
      flagstones: 'Grey flagstones with grass in the joints.',
    }),
    extras: choice('What else stands in this corner?', {
      bench: 'A slatted park bench by the path with a bin beside it.',
      fountain: 'A small drinking fountain on a stone post.',
      noticeboard: 'A glass-fronted park noticeboard with a few faded notices.',
      nothing: 'Just the tables, the lamp and the fence.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const dusk = a.time === 'dusk', dawn = a.time === 'dawn';
    const sky = new THREE.Color(dusk ? '#e9c9a0' : dawn ? '#dcd6e0' : '#dde6ea').lerp(new THREE.Color('#f0dcc4'), mood.warmth * 0.35).lerp(new THREE.Color('#cfd0cc'), (1 - mood.cheer) * 0.25);
    const slots: [number, number, number?, number?][] = [[TABLE_X[0], TABLE_Z - 0.8], [TABLE_X[1], TABLE_Z - 0.8], [TABLE_X[2], TABLE_Z - 0.8], [TABLE_X[3], TABLE_Z - 0.8], [2.4, 3.7, 0, 0.9], [-2.9, 3.5, 0, 0.9]];
    const { art: s, world } = diorama(context, {
      background: `#${sky.getHexString()}`, floor: null, width: W, depth: D, pitch: 31, yaw: 24, maxHeight: 3.2, radius: 1.5, scale: [0.8, 1.35], slots,
    });
    const leafy = a.season === 'autumn' ? 1 : a.season === 'bare' ? 0.8 : 0.08;

    // ---- the ground: grass and leaf litter, a paved apron for the tables, the path curving off behind
    const toU = (x: number) => ((x + W / 2) / W) * 1024, toV = (z: number) => ((z + D / 2) / D) * 832;
    const pathPoints: [number, number][] = [[7.5, 5.8], [3.5, 3.9], [0, 3.6], [-3.5, 3.1], [-6.2, 1.2], [-7.6, -1.5], [-8.5, -3.5]];
    const groundMap = paint(1024, 832, (c) => {
      const grass = a.season === 'green' ? '#7a9a52' : a.season === 'autumn' ? '#8f9460' : '#8a865a';
      c.fillStyle = grass; c.fillRect(0, 0, 1024, 832);
      for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '40,60,20' : '220,220,160'},${0.05 + random() * 0.12})`; c.fillRect(random() * 1024, random() * 832, 1 + random() * 3, 1 + random() * 3); }
      // Paved apron under the row of tables.
      c.fillStyle = a.tables === 'plywood' ? '#9a9484' : '#b9b5a8';
      c.fillRect(toU(-7), toV(-1.4), toU(7) - toU(-7), toV(1.9) - toV(-1.4));
      c.strokeStyle = 'rgba(60,60,55,0.35)'; c.lineWidth = 1.5;
      for (let x = -7; x <= 7; x += 1) { c.beginPath(); c.moveTo(toU(x), toV(-1.4)); c.lineTo(toU(x), toV(1.9)); c.stroke(); }
      for (let z = -1.4; z <= 1.9; z += 1.1) { c.beginPath(); c.moveTo(toU(-7), toV(z)); c.lineTo(toU(7), toV(z)); c.stroke(); }
      for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(0,0,0,${0.04 + random() * 0.08})`; c.fillRect(toU(-7) + random() * (toU(7) - toU(-7)), toV(-1.4) + random() * (toV(1.9) - toV(-1.4)), 2 + random() * 6, 2 + random() * 4); }
      // The path.
      const pathColour = { asphalt: '#4a4a48', gravel: '#c9bea0', flagstones: '#8e8a80' }[a.path];
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = pathColour; c.lineWidth = toU(2.2) - toU(0);
      c.beginPath(); c.moveTo(toU(pathPoints[0][0]), toV(pathPoints[0][1]));
      for (let i = 1; i < pathPoints.length - 1; i++) {
        const [x0, z0] = pathPoints[i], [x1, z1] = pathPoints[i + 1];
        c.quadraticCurveTo(toU(x0), toV(z0), (toU(x0) + toU(x1)) / 2, (toV(z0) + toV(z1)) / 2);
      }
      c.stroke();
      if (a.path === 'asphalt') { c.strokeStyle = '#d8d2c0'; c.lineWidth = 3; c.setLineDash([]); c.beginPath(); c.moveTo(toU(pathPoints[0][0]), toV(pathPoints[0][1])); for (let i = 1; i < pathPoints.length - 1; i++) { const [x0, z0] = pathPoints[i], [x1, z1] = pathPoints[i + 1]; c.quadraticCurveTo(toU(x0), toV(z0), (toU(x0) + toU(x1)) / 2, (toV(z0) + toV(z1)) / 2); } c.lineWidth = toU(2.2) - toU(0) + 4; c.globalAlpha = 0.5; c.stroke(); c.globalAlpha = 1; }
      if (a.path === 'flagstones') for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '60,60,55' : '200,200,190'},0.25)`; const t = random(); const idx = Math.min(pathPoints.length - 2, Math.floor(t * (pathPoints.length - 1))); const f = t * (pathPoints.length - 1) - idx; const x = mix(pathPoints[idx][0], pathPoints[idx + 1][0], f), z = mix(pathPoints[idx][1], pathPoints[idx + 1][1], f); c.fillRect(toU(x + (random() - 0.5) * 1.8) - 12, toV(z + (random() - 0.5) * 1.8) - 8, 22, 14); }
      if (a.path === 'gravel') for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '120,110,90' : '240,235,220'},0.4)`; const t = random(); const idx = Math.min(pathPoints.length - 2, Math.floor(t * (pathPoints.length - 1))); const f = t * (pathPoints.length - 1) - idx; const x = mix(pathPoints[idx][0], pathPoints[idx + 1][0], f), z = mix(pathPoints[idx][1], pathPoints[idx + 1][1], f); c.fillRect(toU(x + (random() - 0.5) * 2), toV(z + (random() - 0.5) * 2), 2, 2); }
      // Leaf litter: flecks of yellow, ochre and brown, thickest at the back under the trees.
      const flecks = Math.round(5000 * leafy);
      for (let i = 0; i < flecks; i++) {
        const z = -D / 2 + random() ** 1.6 * D;
        c.fillStyle = pick(random, a.season === 'green' ? ['#6a8a3a', '#a89a4a'] : a.season === 'bare' ? ['#6b4a2a', '#8a6a3a', '#5a3a1a'] : ['#d9b23a', '#c98a2a', '#8a5a2a', '#e0c050', '#a84a2a']);
        c.globalAlpha = 0.5 + random() * 0.5;
        c.beginPath(); c.ellipse(random() * 1024, toV(z), 3 + random() * 3, 2 + random() * 2, random() * 3, 0, 7); c.fill();
      }
      c.globalAlpha = 1;
      if (mood.wear > 0.5) for (let i = 0; i < Math.round((mood.wear - 0.5) * 60); i++) { c.fillStyle = `rgba(40,30,20,${0.15 + random() * 0.2})`; c.beginPath(); c.ellipse(random() * 1024, random() * 832, 8 + random() * 20, 5 + random() * 10, random() * 3, 0, 7); c.fill(); }
    });
    const ground = s.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: groundMap, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.castShadow = false;
    world.ground = ground;
    s.box([W, 0.3, D], [0, -0.16, 0], s.material('#6b5a44')).castShadow = false;

    // ---- the row of chess tables, each in its own group so a cast thing can replace it
    const tableGroups: { group: THREE.Group; x: number; z: number }[] = [];
    const gamesAt = { none: [] as number[], one: [3], most: [1, 2, 3], all: [0, 1, 2, 3] }[a.games];
    const players: ReturnType<typeof figure>[] = [];
    const seatY = a.tables === 'plywood' ? 0.42 : 0.44;
    TABLE_X.forEach((x, index) => {
      const before = s.root.children.length;
      const board = chessTable(s, { x, z: TABLE_Z, kind: a.tables, seat: seatY, benches: ['near', 'far'], benchGap: 0.8 });
      const playing = gamesAt.includes(index);
      placePieces(s, board, playing ? pick(random, [POSITIONS.middlegame, POSITIONS.scramble, POSITIONS.opening]) : random() < 0.3 ? POSITIONS.start : [], { white: '#ece4cf', black: '#2a2320' }, 0.003);
      if (playing) for (const side of [-1, 1]) {
        const Hp = mix(1.6, 1.8, random());
        const player = figure(s, {
          height: Hp, build: random() < 0.4 ? 'heavy' : 'average', style: 'doll', pose: 'sitting', gaze: 'down', skin: pick(random, skinTones), sleeves: 'long',
          hair: pick(random, ['short', 'cap', 'hat', 'hood', 'none'] as const), hairColor: pick(random, ['#1f1a18', '#3b2a22', '#6b6456', '#b8b0a4', '#d8d4cc']),
          top: pick(random, ['#4a5a6a', '#6b4f33', '#2d3a2d', '#8a8a84', '#b89a6a', '#2a5a8a', '#5a4a5a']), bottom: pick(random, ['#2e3440', '#4a4238', '#3a3a3a']), shoes: '#2a211b',
        });
        s.root.add(player.root);
        hipsAt(player, x + (random() - 0.5) * 0.06, TABLE_Z - side * 0.62, side > 0 ? 0 : Math.PI);
        const pj = joints(player, 'left');
        pj.spine.rotation.x = 0.3 + random() * 0.3;
        pj.neck.rotation.x = 0.3;
        seat(player, seatY + 0.045 * Hp);
        if (random() < 0.5) {
          reachTo(player, 'left', board.top + 0.045, { out: 10, bend: 90, across: -60 }, 'elbow', [10, 100]);
          reachTo(player, 'right', board.top + 0.045, { out: 10, bend: 90, across: -60 }, 'elbow', [10, 100]);
        } else {
          poseArm(player, 'left', { forward: 38, out: -2, bend: 118, inward: 68 });
          poseArm(player, 'right', { forward: 30, out: -2, bend: 112, inward: 62 });
        }
        players.push(player);
      }
      const group = new THREE.Group();
      group.add(...s.root.children.slice(before));
      s.root.add(group);
      tableGroups.push({ group, x, z: TABLE_Z });
    });

    // ---- plane trees along the back: mottled trunks, branches, crowns by season
    const barkMap = paint(128, 256, (c) => {
      c.fillStyle = '#9a9078'; c.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 90; i++) { c.fillStyle = pick(random, ['#c9c0a4', '#7a7a5a', '#b0a888', '#5a5a44', '#d8d0b8']); c.beginPath(); c.ellipse(random() * 128, random() * 256, 6 + random() * 14, 10 + random() * 24, random() * 3, 0, 7); c.fill(); }
    });
    barkMap.wrapS = barkMap.wrapT = THREE.RepeatWrapping;
    const bark = new THREE.MeshStandardMaterial({ map: barkMap, roughness: 0.95 });
    const branchMat = s.material('#8a8068', { roughness: 0.95 });
    const crownColours = a.season === 'green' ? ['#5a8a3a', '#6a9a42', '#4a7a32', '#7aa04a'] : ['#d9b23a', '#c98a2a', '#e0c050', '#b8862a', '#a87a3a'];
    const crowns: THREE.Object3D[] = [];
    const treeSpots: [number, number][] = [[-5.6, -3.0], [-1.9, -3.3], [1.9, -3.1], [5.7, -3.2]];
    for (const [tx, tz] of treeSpots) {
      const h = 2.6 + random() * 0.6;
      const trunk = s.mesh(new THREE.CylinderGeometry(0.16, 0.24, h, 10), bark, [tx, h / 2, tz]);
      trunk.rotation.z = (random() - 0.5) * 0.08;
      const top = new THREE.Vector3(tx, h, tz);
      const crown = new THREE.Group();
      crown.position.copy(top);
      s.root.add(crown);
      crowns.push(crown);
      const limbs = a.season === 'bare' ? 9 : 6;
      for (let i = 0; i < limbs; i++) {
        const angle = (i / limbs) * Math.PI * 2 + random() * 0.5;
        const reach = 1.3 + random() * 1.0, rise = 1.0 + random() * 1.1;
        const end = new THREE.Vector3(Math.sin(angle) * reach, rise, Math.cos(angle) * reach);
        const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.09, end.length(), 6), branchMat);
        limb.position.copy(end).multiplyScalar(0.5);
        limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().normalize());
        limb.castShadow = true;
        crown.add(limb);
        if (a.season === 'bare') for (let t = 0; t < 2; t++) {
          const twigEnd = end.clone().add(new THREE.Vector3((random() - 0.5) * 1.4, 0.5 + random() * 0.8, (random() - 0.5) * 1.4));
          const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, twigEnd.distanceTo(end), 5), branchMat);
          twig.position.copy(end).lerp(twigEnd, 0.5);
          twig.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), twigEnd.clone().sub(end).normalize());
          crown.add(twig);
        }
      }
      if (a.season !== 'bare') {
        const balls = 5 + Math.floor(random() * 2);
        for (let i = 0; i < balls; i++) {
          const angle = (i / balls) * Math.PI * 2 + random();
          const r = i === 0 ? 0 : 0.9 + random() * 0.6;
          const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), s.material(pick(random, crownColours), { roughness: 0.95 }));
          ball.position.set(Math.sin(angle) * r, 1.4 + random() * 0.7 + (i === 0 ? 0.3 : 0), Math.cos(angle) * r);
          ball.scale.set(1.1 + random() * 0.5, 0.8 + random() * 0.3, 1.1 + random() * 0.5);
          ball.castShadow = ball.receiveShadow = true;
          crown.add(ball);
        }
      }
    }

    // ---- the low iron fence along the back, and leaves drifted against it
    ironFence(s, [-W / 2, -4.4], [W / 2, -4.4], { height: 0.75, colour: '#2a2e2c' });
    const leafGeometry = new THREE.CircleGeometry(1, 6);
    leafGeometry.rotateX(-Math.PI / 2);
    const leafCount = Math.round(mix(60, 520, leafy)) + Math.round(mood.density * 120 * leafy);
    const leaves = new THREE.InstancedMesh(leafGeometry, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, side: THREE.DoubleSide }), leafCount + 14);
    const leafPalette = a.season === 'green' ? [LEAF.green, LEAF.olive] : a.season === 'bare' ? [LEAF.brown, LEAF.rust, '#6b4a2a'] : [LEAF.yellow, LEAF.ochre, LEAF.brown, LEAF.rust, '#e0c050'];
    const matrix = new THREE.Matrix4();
    const place = (i: number, x: number, y: number, z: number, size: number) => {
      matrix.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((random() - 0.5) * 0.5, random() * Math.PI * 2, (random() - 0.5) * 0.5)), new THREE.Vector3(size, size, size * 1.3));
      leaves.setMatrixAt(i, matrix);
      leaves.setColorAt(i, new THREE.Color(pick(random, leafPalette)));
    };
    for (let i = 0; i < leafCount; i++) {
      const againstFence = random() < 0.35;
      const x = (random() - 0.5) * W;
      const z = againstFence ? -4.4 + 0.1 + random() ** 2 * 0.9 : -D / 2 + random() ** 1.3 * D;
      const y = againstFence ? random() * 0.12 : 0.004 + random() * 0.01;
      place(i, x, y, z, 0.045 + random() * 0.035);
    }
    const drifting: { x: number; y: number; z: number; phase: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const spot = { x: (random() - 0.5) * W * 0.9, y: 0.3 + random() * 2.2, z: -4 + random() * 7, phase: random() * Math.PI * 2 };
      drifting.push(spot);
      place(leafCount + i, spot.x, spot.y, spot.z, leafy > 0.5 ? 0.05 : 0.0001);
    }
    leaves.instanceMatrix.needsUpdate = true;
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    s.root.add(leaves);

    // ---- the lamp post just coming on, the bin, the extras
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const glow = dusk ? 1 : dawn ? 0.75 : mix(0.05, 0.4, lowSun);
    const lamp = lampPost(s, [5.4, -1.9], { height: 3.7, glow, warmth: mood.warmth });
    litterBin(s, [-6.3, 1.9], a.tables === 'metal' ? '#2f4a3a' : '#3a3a3a', mood.wear);
    if (a.extras === 'bench') {
      parkBench(s, { x: -6.0, z: -1.0, length: 1.7, wood: pick(random, ['#4a6a4a', '#8a6a44']), iron: '#2a2e2c', yaw: 0.35 });
    } else if (a.extras === 'fountain') {
      const stone = s.material('#9a9484', { roughness: 0.95 });
      s.box([0.36, 0.95, 0.36], [-6.2, 0.475, -0.8], stone);
      s.lathe([[0.05, 0], [0.2, 0], [0.22, 0.04], [0.16, 0.06], [0.05, 0.05]], stone, [-6.2, 0.95, -0.8]);
      s.cylinder(0.012, 0.012, 0.1, [-6.2, 1.02, -0.8], s.material('#b9bcbd', { metalness: 0.7, roughness: 0.35 }), 8);
    } else if (a.extras === 'noticeboard') {
      const frame = s.material('#2f4a3a', { roughness: 0.6 });
      for (const dx of [-0.6, 0.6]) s.cylinder(0.04, 0.04, 2.0, [-6.4 + dx, 1.0, -1.2], frame, 8);
      s.box([1.5, 1.0, 0.08], [-6.4, 1.55, -1.2], frame);
      s.box([1.38, 0.88, 0.02], [-6.4, 1.55, -1.15], s.material('#d8d2c0', { roughness: 0.9 }));
      for (let i = 0; i < 4; i++) s.box([0.28, 0.36, 0.005], [-6.9 + i * 0.34, 1.55 + (random() - 0.5) * 0.3, -1.135], s.material(pick(random, ['#f1efe6', '#f2c21c', '#9ec8ff', '#e8b8c0']), { roughness: 0.9 })).rotation.z = (random() - 0.5) * 0.15;
      s.box([1.5, 0.08, 0.3], [-6.4, 2.1, -1.2], frame);
    }

    // ---- the crowd: walkers and watchers by time of day
    const crowd: ReturnType<typeof figure>[] = [];
    const walker = (x: number, z: number, yaw: number, pose: 'walking' | 'standing' | 'arms-crossed') => {
      const Hw = mix(1.55, 1.82, random());
      const person = figure(s, {
        height: Hw, build: random() < 0.3 ? 'slight' : random() < 0.3 ? 'heavy' : 'average', style: 'doll', pose, gaze: pose === 'walking' ? 'ahead' : 'down', skin: pick(random, skinTones), sleeves: 'long',
        hair: pick(random, ['short', 'long', 'bun', 'cap', 'hat', 'none'] as const), hairColor: pick(random, ['#1f1a18', '#3b2a22', '#6b4a2e', '#b8884a', '#8a8680']),
        top: pick(random, ['#2a2a30', '#4a5a6a', '#b89a6a', '#8a1f2a', '#2d4a3a', '#8a8a84', '#c2a070']), bottom: pick(random, ['#2a2a30', '#3a3a40', '#4a4238', '#1f1f22']), shoes: '#2a211b',
      });
      s.root.add(person.root);
      hipsAt(person, x, z, yaw);
      person.root.position.y = 0;
      crowd.push(person);
      return person;
    };
    if (a.time === 'lunch') {
      walker(6.2, 5.0, -2.2, 'walking');
      walker(-5.2, 2.2, 2.4, 'walking');
      walker(-7.0, -0.2, 2.8, 'walking');
      if (gamesAt.length) {
        const index = gamesAt[gamesAt.length - 1];
        const watcher = walker(TABLE_X[index] + 0.95, TABLE_Z - 0.3, -1.4, 'arms-crossed');
        joints(watcher, 'left').neck.rotation.x = 0.35;
      }
    } else if (dusk && gamesAt.length) {
      const index = gamesAt[0];
      const watcher = walker(TABLE_X[index] - 0.95, TABLE_Z - 0.35, 1.3, 'standing');
      joints(watcher, 'left').spine.rotation.x = 0.2;
      joints(watcher, 'left').neck.rotation.x = 0.4;
    }

    const energy = mood.energy;
    const basePlace = world.place;
    return {
      ...world,
      place(items: readonly Placeable[]) {
        basePlace.call(world, items);
        // A cast thing that brings its own table takes the place of the park's table at that slot.
        for (const item of items) {
          const radius = item.radius * item.holder.scale.x;
          if (radius < 0.62) continue;
          for (const table of tableGroups) if (Math.hypot(table.x - item.holder.position.x, table.z - item.holder.position.z) < 1.4) table.group.visible = false;
        }
      },
      update(_dt: number, time: number) {
        for (const player of players) player.update(_dt, time);
        for (const person of crowd) person.update(_dt, time);
        for (const [i, crown] of crowns.entries()) crown.rotation.z = Math.sin(time * 0.7 + i) * 0.012 * energy;
        if (leafy > 0.5) {
          drifting.forEach((spot, i) => {
            const t = time * mix(0.15, 0.6, energy) + spot.phase;
            const x = spot.x + Math.sin(t * 0.7) * 0.8, y = spot.y + Math.sin(t * 1.3) * 0.25, z = spot.z + Math.cos(t * 0.5) * 0.5;
            matrix.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(t * 1.1, t * 0.7, t * 0.4)), new THREE.Vector3(0.05, 0.05, 0.065));
            leaves.setMatrixAt(leafCount + i, matrix);
          });
          leaves.instanceMatrix.needsUpdate = true;
        }
        (lamp.lantern as THREE.MeshStandardMaterial).emissiveIntensity = mix(0.08, 1.6, glow) * (1 + Math.sin(time * 11) * 0.03 * energy);
      },
    };
  },
});
