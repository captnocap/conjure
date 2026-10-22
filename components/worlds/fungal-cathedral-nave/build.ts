import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix, score } from '@conjure/kit';
import { type P3, bracket, cluster, domeGeometry, gillGeometry, glow, motes, mottle, mushroom, paint, put, strand, toadstoolGeometry } from './fungi';

const GLOWS = {
  ghost: 'Pale ghost green foxfire.',
  cyan: 'Cold cyan, like light under deep water.',
  amber: 'Warm amber, as if the candles never went out.',
  violet: 'Violet and strange, narcotic.',
  mixed: 'Every colour at once, a stained-glass garden.',
} as const;
const TINTS: Record<keyof typeof GLOWS, string[]> = {
  ghost: ['#9dff8a', '#c8ff9a'], cyan: ['#5fe9ff', '#8affea'], amber: ['#ffbf4d', '#ffd98a'], violet: ['#b987ff', '#e59aff'],
  mixed: ['#9dff8a', '#5fe9ff', '#ffbf4d', '#b987ff', '#ff8fb5'],
};

const HALF = 3.9, SPRING = 9, CROWN = 3.5, EAST = -23, WEST = 11;
const COLUMNS = [9, 4, -1, -6, -11, -16, -21];
const SLOTS: readonly (readonly [number, number])[] = [[0, 4], [-2.6, 0.6], [2.5, -0.9], [-2.4, -5.6], [2.6, -7.2]];
/** Height of the vault above a point across the nave. */
const vault = (x: number) => SPRING + CROWN * Math.sin(Math.acos(Math.max(-1, Math.min(1, -x / HALF)))) ** 0.85;

export default defineWorld({
  questions: {
    breach: choice('Where does the daylight get in?', {
      left: 'Through a broken clerestory high on the left, in long slanting shafts.',
      right: 'Through a broken clerestory high on the right, in long slanting shafts.',
      roof: 'Straight down through a hole in the crown of the vault, one great column of light.',
      east: 'Only through the east end, low and level down the length of the nave.',
    }),
    glow: choice('What colour is the fungal glow?', GLOWS),
    columns: choice('What have the columns become?', {
      stalk: 'Smooth swollen pale stalks with skirted rings, hardly stone any more.',
      clustered: 'Still gothic clustered stone piers, but spiralled with shelf fungi and bound in threads.',
      giant: 'Colossal mushrooms: each column carries a wide cap with glowing gills beneath.',
    }),
    east: choice('What stands at the east end, where the altar was?', {
      rose: 'A great round window still glowing with colour.',
      breach: 'A ragged hole in the wall, open to the bright air, with one giant mushroom beyond.',
      altar: 'A towering cluster of luminous fruiting bodies growing from the altar.',
      sealed: 'A wall grown shut with tier on tier of shelf fungus and three dim slits.',
    }),
    congregation: choice('What remains of the congregation?', {
      pews: 'Rows of empty pews, still straight.',
      toppled: 'Pews overturned and sinking into moss.',
      mushrooms: 'Person-high mushrooms standing in the pew rows like worshippers.',
      bare: 'Nothing: bare flagstones and moss.',
    }),
    hanging: choice('What hangs from the vault?', {
      threads: 'Long hanging threads of mycelium.',
      lamps: 'Glowing pods on threads, like sanctuary lamps.',
      banners: 'Rotted processional banners on poles along the walls.',
      none: 'Nothing, the height is clear.',
    }),
    state: choice('What is the fungus doing right now?', {
      sporing: 'Sporing: clouds of motes lift off every cap.',
      fruiting: 'Fruiting: fresh caps crowd every crack in the floor.',
      feeding: 'Feeding: glowing veins of mycelium run across the flagstones toward the middle.',
      dormant: 'Resting: dry, pale and nearly dark, waiting for rain.',
    }),
    haze: score('How thick is the spore haze?', ['Clear air, crisp edges', 'A soft golden veil', 'Thick drifting fog, the far end lost']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const tints = TINTS[a.glow];
    const tintOf = () => tints[Math.floor(random() * tints.length)];
    const dormant = a.state === 'dormant';
    const level = mix(0.55, 1.25, mood.cheer) * (dormant ? 0.35 : 1);
    const side = a.breach === 'right' ? 1 : -1;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    /** Architecture that should not throw the whole nave into its own shadow. */
    const shell = <T extends THREE.Object3D>(node: T) => { node.traverse((child) => { child.castShadow = false; }); return node; };

    // ---- palette: a luminous mid-tone, never black
    const hazeColour = new THREE.Color().setHSL(mix(0.42, 0.13, mood.warmth), mix(0.14, 0.3, mood.cheer), mix(0.66, 0.8, mood.cheer)).lerp(new THREE.Color(tints[0]), 0.1);
    const background = hazeColour.clone();
    const stoneTex = mottle(random, '#8f8e7b', ['#75865e', '#aeab98', '#6b6a5e', '#5f744a'], Math.round(mix(120, 320, mood.wear)), 256);
    stoneTex.repeat.set(2, 3);
    const stone = paint('#ffffff', { map: stoneTex, roughness: 0.95, side: THREE.DoubleSide });
    const darkStone = paint('#a3a192', { map: stoneTex, roughness: 0.95, side: THREE.DoubleSide });
    const paleTex = mottle(random, '#e6dcc2', ['#cdbf9c', '#f4eedc', '#b7a983', '#d9e0c2'], 160, 256);
    const pale = paint('#ffffff', { map: paleTex, roughness: 0.85, side: THREE.DoubleSide, emissive: tints[0], emissiveIntensity: 0.05 * level });
    const moss = paint('#ffffff', { map: mottle(random, '#6f8a4e', ['#56733c', '#8aa35e', '#a8b56a', '#4c6238'], 160), roughness: 1 });
    const thread = paint('#f1ecda', { roughness: 0.9, emissive: tints[0], emissiveIntensity: 0.12 * level });
    const glowMats = tints.map((tint) => glow(tint, level, { side: THREE.DoubleSide }));

    // ---- light
    root.add(new THREE.HemisphereLight(hazeColour.clone().lerp(new THREE.Color('#ffffff'), 0.5), new THREE.Color('#6f7a5c'), mix(1.1, 1.45, mood.cheer)));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.45, 0.86), a.breach === 'east' ? 2.1 : 2.7);
    key.castShadow = true;
    key.shadow.mapSize.set(1536, 1536);
    key.shadow.normalBias = 0.06;
    key.shadow.bias = -0.0004;
    const lean = mix(-5, 5, mood.daylight);
    key.position.copy({ left: new THREE.Vector3(-11, 17, -4 + lean), right: new THREE.Vector3(11, 17, -4 + lean), roof: new THREE.Vector3(1.5 + lean * 0.3, 22, -1), east: new THREE.Vector3(lean * 0.5, 11, -30) }[a.breach]);
    key.target.position.set(0, 0, a.breach === 'east' ? 4 : 1);
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#dfe8ff', 0.55);
    fill.position.set(2, 6, 20);
    root.add(fill);
    const eastGlow = new THREE.PointLight(tints[0], 60 * level, 24, 1.5);
    eastGlow.position.set(0, 4.5, EAST + 3.5);
    root.add(eastGlow);

    // ---- floor
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = floorCanvas.height = 512;
    const ctx = floorCanvas.getContext('2d')!;
    ctx.fillStyle = '#a19e8c';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++) {
        const tone = 138 + Math.floor(random() * 40);
        ctx.fillStyle = `rgb(${tone + 8},${tone + 6},${tone - 10})`;
        ctx.fillRect(i * 64 + 2, j * 64 + ((i % 2) * 32) - 32 + 2, 60, 60);
      }
    for (let i = 0; i < mix(40, 170, mood.wear * 0.6 + mood.density * 0.4); i++) {
      ctx.globalAlpha = 0.3 + random() * 0.5;
      ctx.fillStyle = pick(['#6f8a4e', '#56733c', '#8aa35e', '#7d8f5a']);
      ctx.beginPath();
      ctx.arc(random() * 512, random() * 512, 6 + random() ** 2 * 46, 0, 6.3);
      ctx.fill();
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.colorSpace = THREE.SRGBColorSpace;
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(4, 9);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 36), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, (EAST + WEST) / 2);
    floor.receiveShadow = true;
    root.add(floor);
    // chancel step
    put(root, new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, 0.3, 5.5), stone), [0, 0.15, EAST + 2.75]);
    put(root, new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 - 1, 0.3, 4.5), stone), [0, 0.45, EAST + 2.25]);

    // ---- columns
    const columnProfile = (a.columns === 'stalk'
      ? [[1.05, 0], [0.95, 0.25], [0.66, 0.9], [0.56, 2.4], [0.6, 3.3], [0.9, 3.42], [0.6, 3.55], [0.5, 4.9], [0.6, 5.4], [1.0, 5.75], [1.05, 5.95], [0.3, 5.95]]
      : a.columns === 'giant'
        ? [[1.25, 0], [1.1, 0.3], [0.72, 1.1], [0.6, 3], [0.55, 5], [0.6, 5.6], [0.3, 5.95]]
        : [[0.85, 0], [0.85, 0.4], [0.62, 0.55], [0.6, 5.3], [0.75, 5.45], [0.95, 5.75], [0.95, 5.95], [0.3, 5.95]]
    ).map(([x, y]) => new THREE.Vector2(x, y));
    const columnGeometry = new THREE.LatheGeometry(columnProfile, a.columns === 'clustered' ? 8 : 18);
    const capGeometry = domeGeometry(1.5, 0.7, 0.75, 22), underGeometry = gillGeometry(1.5, 0.7, 0.6, 22);
    const shaftGeometry = new THREE.CylinderGeometry(0.16, 0.2, SPRING - 5.9, 7);
    const capBrown = paint('#ffffff', { map: mottle(random, '#a5674a', ['#8a4f38', '#c58a5e', '#e2d6b8'], 90), side: THREE.DoubleSide });
    const bandColours = ['#efe6c8', '#f6efda', '#7a5236', '#c08a52', '#5d6a5a', '#a66e40'];
    const columnBases: P3[] = [];
    for (const z of COLUMNS)
      for (const sx of [-1, 1]) {
        const x = sx * HALF;
        columnBases.push([x, 0, z]);
        const column = put(root, new THREE.Mesh(columnGeometry, a.columns === 'clustered' ? stone : pale), [x, 0, z]);
        column.rotation.y = random() * 6;
        column.scale.x = column.scale.z = 0.94 + random() * 0.14;
        shell(put(root, new THREE.Mesh(shaftGeometry, a.columns === 'clustered' ? stone : pale), [x - sx * 0.3, (SPRING + 5.9) / 2, z]));
        if (a.columns === 'giant') {
          put(root, new THREE.Mesh(capGeometry, capBrown), [x, 5.45, z]).rotation.y = random() * 6;
          put(root, new THREE.Mesh(underGeometry, pick(glowMats)), [x, 5.45, z]);
        } else if (a.columns === 'clustered') {
          for (let k = 0; k < 4; k++) put(root, new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 5, 6), stone), [x + Math.sin(k * 1.57 + 0.78) * 0.6, 2.9, z + Math.cos(k * 1.57 + 0.78) * 0.6]);
        }
        // shelf fungi climbing the column
        const climbers = a.columns === 'clustered' ? 5 + Math.floor(random() * 3) : Math.round(mix(1, 4, mood.density));
        const start = random() * 6;
        for (let k = 0; k < climbers; k++) {
          const angle = start + k * 0.9 + random() * 0.4, radius = 0.45 + random() * 0.5, y = 0.9 + (k / climbers) * 4 + random() * 0.4;
          bracket(root, { at: [x + Math.sin(angle) * 0.5, y, z + Math.cos(angle) * 0.5], radius, thick: radius * 0.3, yaw: angle, colours: bandColours, phase: random() * 6, material: { emissive: tints[0], emissiveIntensity: 0.08 * level } });
        }
        for (let k = 0; k < 2; k++) {
          const band = put(root, new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.035, 5, 18), thread), [x, 1.6 + random() * 3.4, z]);
          band.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5);
        }
      }

    // ---- arcade, gallery wall with clerestory windows, aisles
    const BAY = 5;
    const spandrelShape = new THREE.Shape();
    spandrelShape.moveTo(0, 5.5);
    spandrelShape.lineTo(0.5, 5.5);
    spandrelShape.quadraticCurveTo(0.7, 6.35, BAY / 2, 6.65);
    spandrelShape.quadraticCurveTo(BAY - 0.7, 6.35, BAY - 0.5, 5.5);
    spandrelShape.lineTo(BAY, 5.5);
    spandrelShape.lineTo(BAY, 6.95);
    spandrelShape.lineTo(0, 6.95);
    const spandrelGeometry = new THREE.ExtrudeGeometry(spandrelShape, { depth: 0.6, bevelEnabled: false, curveSegments: 8 });
    const wallGeometry = new THREE.BoxGeometry(0.6, SPRING + 0.9 - 6.95, BAY);
    const windowGlow = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: hazeColour.clone().lerp(new THREE.Color('#ffffff'), 0.55), emissiveIntensity: 0.95, roughness: 0.4 });
    const lancetShape = new THREE.Shape();
    lancetShape.moveTo(-0.45, 0);
    lancetShape.lineTo(0.45, 0);
    lancetShape.lineTo(0.45, 1.3);
    lancetShape.quadraticCurveTo(0.4, 1.8, 0, 2.1);
    lancetShape.quadraticCurveTo(-0.4, 1.8, -0.45, 1.3);
    const lancetGeometry = new THREE.ShapeGeometry(lancetShape, 6);
    const broken = new Set<string>();
    if (a.breach === 'left' || a.breach === 'right') {
      broken.add(`${side}:1`).add(`${side}:2`);
      if (mood.wear > 0.6) broken.add(`${side}:3`);
      if (mood.wear > 0.85) broken.add(`${-side}:3`);
    }
    const rubbleSpots: P3[] = [];
    for (let bay = 0; bay < COLUMNS.length - 1; bay++)
      for (const sx of [-1, 1]) {
        const z0 = COLUMNS[bay], mid = z0 - BAY / 2;
        const spandrel = shell(put(root, new THREE.Mesh(spandrelGeometry, stone), [sx * HALF - 0.3, 0, z0]));
        spandrel.rotation.y = Math.PI / 2;
        if (broken.has(`${sx}:${bay}`)) {
          // ragged stumps where the wall has gone
          for (const [dz, h] of [[-2.2, 1.6 + random()], [2.2, 0.9 + random() * 1.4], [-1.4 + random() * 2.6, 0.3 + random() * 0.5]] as const) {
            const stump = shell(put(root, new THREE.Mesh(new THREE.BoxGeometry(0.6, h, 0.7 + random() * 0.7), stone), [sx * HALF, 6.95 + h / 2, mid + dz]));
            stump.rotation.z = (random() - 0.5) * 0.12;
          }
          for (let k = 0; k < 4; k++) rubbleSpots.push([sx * (HALF - 0.9 - random() * 1.6), 0, mid + (random() - 0.5) * 4]);
        } else {
          shell(put(root, new THREE.Mesh(wallGeometry, stone), [sx * HALF, (6.95 + SPRING + 0.9) / 2, mid]));
          for (const dz of [-0.85, 0.85]) {
            const lancet = shell(put(root, new THREE.Mesh(lancetGeometry, windowGlow), [sx * (HALF - 0.31), 7.25, mid + dz]));
            lancet.rotation.y = -sx * Math.PI / 2;
          }
        }
        // galleries of shelf fungus under the windows
        const shelves = 1 + Math.floor(random() * 2 + mood.density);
        for (let k = 0; k < shelves; k++) {
          const radius = 1.0 + random() * 0.9;
          bracket(root, { at: [sx * (HALF - 0.25), 6.75 + random() * 0.5, mid + (random() - 0.5) * 3.4], radius, thick: 0.28 + random() * 0.2, yaw: -sx * Math.PI / 2, tilt: (random() - 0.5) * 0.12, colours: bandColours, phase: random() * 6, material: { emissive: pick(tints), emissiveIntensity: 0.14 * level } });
        }
      }
    const length = WEST - EAST;
    for (const sx of [-1, 1]) {
      shell(put(root, new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.2, length), darkStone), [sx * 7.6, 3.6, (EAST + WEST) / 2]));
      const roof = shell(put(root, new THREE.Mesh(new THREE.PlaneGeometry(3.9, length), darkStone), [sx * 5.72, 6.75, (EAST + WEST) / 2]));
      roof.rotation.set(Math.PI / 2, sx * 0.2, 0);
      for (let bay = 1; bay < COLUMNS.length - 1; bay++) {
        const lancet = shell(put(root, new THREE.Mesh(lancetGeometry, windowGlow), [sx * 7.34, 2.2, COLUMNS[bay] - BAY / 2]));
        lancet.rotation.y = -sx * Math.PI / 2;
        lancet.scale.set(1.2, 1.5, 1);
      }
    }

    // ---- vault: webs of ceiling between ribs
    const ceiling = (z0: number, z1: number, u0: number, u1: number) => {
      const geometry = new THREE.PlaneGeometry(1, 1, 12, 1);
      const position = geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        const u = mix(u0, u1, position.getX(i) + 0.5) * Math.PI, x = -HALF * Math.cos(u);
        position.setXYZ(i, x, vault(x), mix(z0, z1, position.getY(i) + 0.5));
      }
      geometry.computeVertexNormals();
      shell(put(root, new THREE.Mesh(geometry, darkStone)));
    };
    const open = a.breach === 'roof';
    ceiling(WEST, open ? COLUMNS[1] : EAST, 0, 1);
    if (open) {
      ceiling(COLUMNS[1], COLUMNS[3], 0, 0.27);
      ceiling(COLUMNS[1], COLUMNS[3], 0.73, 1);
      ceiling(COLUMNS[3], EAST, 0, 1);
    }
    const ribPoints = (z0: number, z1: number) => Array.from({ length: 13 }, (_unused, i) => { const x = -HALF * Math.cos((i / 12) * Math.PI); return new THREE.Vector3(x, vault(x) - 0.08, mix(z0, z1, i / 12)); });
    const rib = (z0: number, z1: number, radius: number) => shell(put(root, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribPoints(z0, z1)), 24, radius, 6), a.columns === 'clustered' ? stone : pale)));
    COLUMNS.forEach((z, index) => {
      rib(z, z, 0.2);
      if (index < COLUMNS.length - 1 && !(open && (index === 1 || index === 2))) { rib(z, COLUMNS[index + 1], 0.13); rib(COLUMNS[index + 1], z, 0.13); }
    });
    const webs = Math.round(mix(8, 26, mood.density));
    for (let i = 0; i < webs; i++) {
      const z = mix(4, EAST + 2, random()), x1 = (random() - 0.5) * 7, x2 = x1 + (random() - 0.5) * 5;
      const from: P3 = [x1, vault(x1) - 0.1, z], to: P3 = [Math.max(-3.7, Math.min(3.7, x2)), 0, z - random() * 6];
      strand(root, from, [to[0], vault(to[0]) - 0.1, to[2]], 0.5 + random() * 2.2, 0.02 + random() * 0.025, thread, random).castShadow = false;
    }

    // ---- the east end
    const eastZ = EAST;
    const lights: THREE.MeshStandardMaterial[] = [];
    if (a.east === 'breach') {
      const blocks: { at: P3; size: P3; color: string }[] = [];
      for (let row = 0; row < 26; row++)
        for (let x = -HALF - 0.3 + (row % 2) * 0.4; x <= HALF + 0.3; x += 0.8) {
          const y = row * 0.5 + 0.25;
          const inside = (x / (2.5 + random() * 0.5)) ** 2 + ((y - 5.2) / (4.6 + random() * 0.6)) ** 2 < 1;
          if (inside) continue;
          const tone = 0.8 + random() * 0.2;
          blocks.push({ at: [x, y, eastZ], size: [0.78, 0.48, 0.6], color: `rgb(${Math.round(tone * 255)},${Math.round(tone * 252)},${Math.round(tone * 240)})` });
        }
      shell(cluster(root, new THREE.BoxGeometry(1, 1, 1), stone, blocks));
      const far = paint(hazeColour.clone().multiplyScalar(0.62));
      shell(put(root, new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 7.6, 12), far), [0.5, 3.8, eastZ - 7]));
      shell(put(root, new THREE.Mesh(domeGeometry(3.6, 1.7, 0.9, 24), far), [0.5, 7.3, eastZ - 7]));
      shell(put(root, new THREE.Mesh(gillGeometry(3.6, 1.7, 0.6, 24), glow(tints[0], level * 0.5, { side: THREE.DoubleSide })), [0.5, 7.3, eastZ - 7]));
      for (let k = 0; k < 9; k++) rubbleSpots.push([(random() - 0.5) * 5, 0.6, eastZ + 1 + random() * 3]);
    } else {
      shell(put(root, new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + 0.6, SPRING + CROWN + 0.2, 0.6), stone), [0, (SPRING + CROWN + 0.2) / 2, eastZ]));
      if (a.east === 'rose') {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 512;
        const c = canvas.getContext('2d')!;
        c.fillStyle = '#5a584e';
        c.fillRect(0, 0, 512, 512);
        const palette = [...tints, '#ffe9a8', '#ff8f6a', '#7ab8ff'];
        for (let ring = 0; ring < 2; ring++)
          for (let i = 0; i < 12; i++) {
            const lost = random() < mood.wear * 0.4;
            c.fillStyle = lost ? '#c9d2a8' : pick(palette);
            c.beginPath();
            const r0 = ring ? 150 : 62, r1 = ring ? 240 : 140, a0 = (i / 12) * 6.283 + 0.03, a1 = ((i + 1) / 12) * 6.283 - 0.03;
            c.arc(256, 256, r1, a0, a1);
            c.arc(256, 256, r0, a1, a0, true);
            c.fill();
          }
        c.fillStyle = pick(palette);
        c.beginPath(); c.arc(256, 256, 50, 0, 6.3); c.fill();
        const roseTex = new THREE.CanvasTexture(canvas);
        roseTex.colorSpace = THREE.SRGBColorSpace;
        const roseMat = new THREE.MeshStandardMaterial({ map: roseTex, emissive: '#ffffff', emissiveMap: roseTex, emissiveIntensity: mix(0.8, 1.15, mood.cheer), roughness: 0.4 });
        lights.push(roseMat);
        shell(put(root, new THREE.Mesh(new THREE.CircleGeometry(2.7, 40), roseMat), [0, 7.6, eastZ + 0.32]));
        shell(put(root, new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.2, 8, 40), stone), [0, 7.6, eastZ + 0.34]));
        put(root, new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 1.1), stone), [0, 1.15, eastZ + 1.6]);
        bracket(root, { at: [0, 1.7, eastZ + 1.9], radius: 1.4, thick: 0.3, colours: bandColours, material: { emissive: tints[0], emissiveIntensity: 0.2 * level } });
      } else if (a.east === 'altar') {
        put(root, new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1.3), stone), [0, 1.1, eastZ + 2]);
        const count = 7 + Math.floor(random() * 4);
        for (let i = 0; i < count; i++) {
          const height = i === 0 ? 7.2 : 2 + random() * 4.2, x = i === 0 ? 0 : (random() - 0.5) * 5;
          const gills = pick(glowMats);
          mushroom(root, { at: [x, 0.6, eastZ + 1.2 + random() * 2.2], height, cap: height * mix(0.2, 0.32, random()), stalk: height * 0.035 + 0.05, shape: 0.6 + random() * 0.9, lean: [(random() - 0.3) * 0.2, (random() - 0.5) * 0.3], capMat: i % 3 === 1 ? capBrown : gills, gillMat: gills, stalkMat: pale });
        }
      } else {
        for (let i = 0; i < 16; i++) {
          const radius = 0.8 + random() * 1.1;
          bracket(root, { at: [(random() - 0.5) * 6.4, 1 + (i / 16) * 10 + random() * 0.5, eastZ + 0.3], radius, thick: radius * 0.28, colours: bandColours, phase: random() * 6, material: { emissive: pick(tints), emissiveIntensity: 0.16 * level } });
        }
        for (const x of [-1.6, 0, 1.6]) shell(put(root, new THREE.Mesh(lancetGeometry, windowGlow), [x, 3.2, eastZ + 0.32])).scale.set(0.5, 2.6, 1);
      }
    }

    // ---- the congregation
    const pewRows = [-10, -12, -14, -16];
    const blocked = (x: number, z: number) => SLOTS.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 2) || (Math.abs(x) < 1.5 && z > -9);
    if (a.congregation === 'pews' || a.congregation === 'toppled') {
      const oak = paint('#ffffff', { map: mottle(random, '#6b4a33', ['#4d3524', '#86633f', '#6f8a4e', '#9aa56a'], Math.round(mix(40, 160, mood.wear))) });
      const box = new THREE.BoxGeometry(1, 1, 1);
      for (const z of pewRows)
        for (const sx of [-1, 1]) {
          const pew = new THREE.Group();
          const part = (size: P3, at: P3) => { put(pew, new THREE.Mesh(box, oak), at).scale.set(...size); };
          part([2.1, 0.08, 0.5], [0, 0.46, 0]);
          part([2.1, 0.95, 0.08], [0, 0.72, -0.26]);
          part([0.1, 1.1, 0.6], [-1.05, 0.55, 0]);
          part([0.1, 1.1, 0.6], [1.05, 0.55, 0]);
          put(root, pew, [sx * 2.25, 0, z]);
          if (a.congregation === 'toppled') {
            pew.position.x += (random() - 0.5) * 0.8;
            pew.position.y = -random() * 0.3;
            pew.rotation.set(random() < 0.5 ? -1.45 + random() * 0.3 : (random() - 0.5) * 0.4, (random() - 0.5) * 1.1, (random() - 0.5) * 0.5);
            put(root, new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), moss), [pew.position.x + (random() - 0.5), 0, z]).scale.set(1.1, 0.3, 0.8);
          }
        }
    } else if (a.congregation === 'mushrooms') {
      cluster(root, toadstoolGeometry(1.5), paint('#ffffff', { emissive: tints[0], emissiveIntensity: 0.3 * level }), pewRows.flatMap((z) => [-1, 1].flatMap((sx) => Array.from({ length: 3 + Math.floor(random() * 2) }, (_unused, i) => ({
        at: [sx * (1.45 + i * 0.6 + (random() - 0.5) * 0.15), 0, z + (random() - 0.5) * 0.3] as P3, size: [1.1, 1.25 + random() * 0.6, 1.1] as P3, turn: [(random() - 0.5) * 0.14 + 0.1, random() * 6, (random() - 0.5) * 0.14] as P3, color: pick(['#f1e8d0', '#e2d6b8', '#d9c9a0', ...tints]),
      })))));
    }

    // ---- growth on the floor
    const fresh = a.state === 'fruiting' ? 2.1 : dormant ? 0.6 : 1;
    const caps: { at: P3; size: number | P3; color: string; turn: P3 }[] = [];
    const wanted = Math.round(mix(40, 190, mood.density) * fresh);
    for (let tries = 0; caps.length < wanted && tries < wanted * 4; tries++) {
      let x: number, z: number;
      if (random() < 0.5) { const base = pick(columnBases), angle = random() * 6.28, reach = 1.0 + random() * 1.3; x = base[0] + Math.sin(angle) * reach; z = base[2] + Math.cos(angle) * reach; }
      else { x = (random() - 0.5) * 14; z = mix(EAST + 1, 7.5, random()); }
      if (blocked(x, z) || z > 8) continue;
      const size = 0.14 + random() ** 2.2 * (a.state === 'fruiting' ? 1.1 : 0.75);
      caps.push({ at: [x, 0, z], size: [size, size * (0.8 + random() * 0.7), size], color: random() < 0.55 ? pick(tints) : pick(['#f1e8d0', '#d9a070', '#c96a4a', '#efe0b0']), turn: [(random() - 0.5) * 0.3, random() * 6, (random() - 0.5) * 0.3] });
    }
    cluster(root, toadstoolGeometry(1.2), paint('#ffffff', { emissive: tints[0], emissiveIntensity: 0.4 * level, roughness: 0.6 }), caps);
    const mounds: { at: P3; size: P3; turn: P3 }[] = [];
    for (const base of columnBases) for (let k = 0; k < 3; k++) { const angle = random() * 6.28; mounds.push({ at: [base[0] + Math.sin(angle) * 0.9, 0, base[2] + Math.cos(angle) * 0.9], size: [0.6 + random() * 0.7, 0.18 + random() * 0.25, 0.5 + random() * 0.6], turn: [0, random() * 3, 0] }); }
    for (let i = 0; i < mix(10, 40, mood.wear); i++) { const x = (random() - 0.5) * 14, z = mix(EAST + 1, 7, random()); if (!blocked(x, z)) mounds.push({ at: [x, 0, z], size: [0.5 + random() * 1.1, 0.1 + random() * 0.2, 0.4 + random() * 0.9], turn: [0, random() * 3, 0] }); }
    cluster(root, new THREE.SphereGeometry(1, 10, 6), moss, mounds).castShadow = false;
    for (let i = 0; i < mix(0, 10, mood.wear); i++) rubbleSpots.push([(random() < 0.5 ? -1 : 1) * (2 + random() * 4.5), 0, mix(EAST + 2, 6, random())]);
    cluster(root, new THREE.BoxGeometry(1, 1, 1), stone, rubbleSpots.filter((p) => !blocked(p[0], p[2])).map((p) => { const size = 0.3 + random() * 0.5; return { at: [p[0], p[1] + size * 0.3, p[2]] as P3, size: [size * 1.5, size, size] as P3, turn: [random() * 0.5, random() * 3, random() * 0.5] as P3 }; }));

    // feeding veins across the flagstones
    const veinMat = glow(tints[0], level * 0.9);
    if (a.state === 'feeding') {
      lights.push(veinMat);
      for (const base of columnBases.filter((p) => p[2] < 8 && p[2] > -20)) {
        for (let k = 0; k < 3; k++) {
          const target: P3 = [(random() - 0.5) * 1.6, 0.03, base[2] + (random() - 0.5) * 5 + 2];
          const bend: P3 = [base[0] * 0.5 + (random() - 0.5), 0.03, (base[2] + target[2]) / 2 + (random() - 0.5) * 2];
          const vein = put(root, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(base[0] * 0.8, 0.03, base[2]), new THREE.Vector3(...bend), new THREE.Vector3(...target)]), 16, 0.03 + random() * 0.025, 5), veinMat));
          vein.castShadow = false;
          vein.scale.y = 0.4;
        }
      }
    }

    // ---- what hangs
    if (a.hanging === 'threads' || a.hanging === 'lamps') {
      const drops = Array.from({ length: Math.round(mix(14, 40, mood.density)) }, () => {
        const x = (random() - 0.5) * 6.4, z = mix(2, EAST + 2, random()), top = vault(x), drop = mix(1.5, top - 5.2, random() ** 1.5);
        return { x, z, top, drop };
      });
      cluster(root, new THREE.CylinderGeometry(1, 1, 1, 5), thread, drops.map((d) => ({ at: [d.x, d.top - d.drop / 2, d.z] as P3, size: [0.022, d.drop, 0.022] as P3 }))).castShadow = false;
      if (a.hanging === 'lamps') {
        const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(dormant ? 0.6 : 1) });
        cluster(root, new THREE.SphereGeometry(1, 10, 8), lampMat, drops.map((d) => { const size = 0.16 + random() * 0.16; return { at: [d.x, d.top - d.drop - size * 0.8, d.z] as P3, size: [size, size * 1.3, size] as P3, color: pick(tints) }; }));
      }
    } else if (a.hanging === 'banners') {
      const cloths = ['#8a3340', '#39508a', '#a8842e', '#4f6f4a'].map((colour) => paint('#ffffff', { map: mottle(random, colour, ['#8b9a72', '#d9d2b8', '#3a3a34'], Math.round(mix(40, 150, mood.wear))), side: THREE.DoubleSide }));
      for (let bay = 1; bay < COLUMNS.length - 1; bay++)
        for (const sx of [-1, 1]) {
          const z = COLUMNS[bay] + 0.4, drop = 2.2 + random() * 1.6;
          const pole = put(root, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.1, 6), paint('#4a3a2c')), [sx * (HALF - 1.5), 6.3, z]);
          pole.rotation.z = Math.PI / 2 - sx * 0.12;
          const geometry = new THREE.PlaneGeometry(1.3, drop, 4, 6);
          const position = geometry.getAttribute('position');
          for (let i = 0; i < position.count; i++) {
            const low = 0.5 - position.getY(i) / drop;
            position.setZ(i, Math.sin(position.getX(i) * 4 + bay) * 0.12 * low);
            if (low > 0.99) position.setY(i, position.getY(i) + random() * mix(0.2, 1.2, mood.wear));
          }
          geometry.computeVertexNormals();
          put(root, new THREE.Mesh(geometry, pick(cloths)), [sx * (HALF - 1.7), 6.25 - drop / 2, z]).rotation.z = (random() - 0.5) * 0.08;
        }
    }

    // ---- shafts of light and the haze they show up in
    const shaftColour = new THREE.Color().setHSL(mix(0.5, 0.12, mood.warmth), 0.55, 0.9);
    const shaftMat = new THREE.MeshBasicMaterial({ color: shaftColour, transparent: true, opacity: mix(0.1, 0.26, a.haze), depthWrite: false, side: THREE.DoubleSide });
    const poolMat = new THREE.MeshBasicMaterial({ color: shaftColour, transparent: true, opacity: 0.3, depthWrite: false });
    const shaft = (top: [P3, P3, P3, P3], drift: P3) => {
      const corners = [...top, ...top.map((p) => { const t = p[1] / -drift[1]; return [p[0] + drift[0] * t, 0.02, p[2] + drift[2] * t] as P3; })];
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners.flat(), 3));
      geometry.setIndex([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
      const beam = new THREE.Mesh(geometry, shaftMat);
      beam.renderOrder = 3;
      root.add(beam);
      const pool = new THREE.BufferGeometry();
      pool.setAttribute('position', new THREE.Float32BufferAttribute(corners.slice(4).flat(), 3));
      pool.setIndex([0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]);
      const patch = new THREE.Mesh(pool, poolMat);
      patch.renderOrder = 2;
      root.add(patch);
    };
    const slant = lean * 0.5;
    if (a.breach === 'left' || a.breach === 'right') {
      for (const name of broken) {
        const [sxText, bayText] = name.split(':'), sx = Number(sxText), z0 = COLUMNS[Number(bayText)];
        for (const [from, to] of [[0.3, 2.0], [2.9, 4.6]] as const) {
          const x = sx * (HALF - 0.1);
          shaft([[x, 9.5, z0 - from], [x, 9.5, z0 - to], [x, 7.3, z0 - to], [x, 7.3, z0 - from]], [-sx * 5.2, -9.5, 2.4 + slant]);
        }
      }
    } else if (a.breach === 'roof') {
      const y = SPRING + CROWN - 0.3;
      shaft([[-1.7, y, 3.2], [1.7, y, 3.2], [1.7, y, -0.6], [-1.7, y, -0.6]], [0.5 + slant * 0.3, -y, 2.2]);
      shaft([[-1.2, y, -2], [1.2, y, -2], [1.2, y, -5], [-1.2, y, -5]], [0.5 + slant * 0.3, -y, 2.2]);
    } else {
      for (const x of [-1.5, 0, 1.5]) shaft([[x - 0.45, 9.4, eastZ + 0.5], [x + 0.45, 9.4, eastZ + 0.5], [x + 0.45, 5.8, eastZ + 0.5], [x - 0.45, 5.8, eastZ + 0.5]], [x * 0.25 + slant * 0.2, -9.4, 24]);
    }
    const veilMat = new THREE.MeshBasicMaterial({ color: hazeColour, transparent: true, opacity: mix(0.04, 0.3, a.haze), depthWrite: false });
    for (const z of [-4, -11, -18]) {
      const veil = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), veilMat);
      veil.position.set(0, 7, z);
      veil.renderOrder = 4;
      root.add(veil);
    }
    const sporing = a.state === 'sporing';
    const seeds = Array.from({ length: Math.round(mix(70, 360, a.haze) * (sporing ? 1.9 : dormant ? 0.5 : 1)) }, () => ({ x: (random() - 0.5) * 7.2, y: random() * 9.5, z: mix(EAST + 1, 9, random() ** 0.8), size: 0.02 + random() ** 2 * 0.06, phase: random() * 6.28 }));
    const cloud = motes(root, new THREE.Color(tints[0]).lerp(new THREE.Color('#ffffff'), 0.45), seeds.map((seed) => ({ at: [seed.x, seed.y, seed.z] as P3, size: seed.size })), 0.8);
    cloud.frustumCulled = false;

    // ---- camera and cast
    const camera = new THREE.PerspectiveCamera(46, 1, 0.3, 120);
    camera.position.set(0.6, 2.6, 15);
    camera.lookAt(0, 4.0, -6);
    camera.updateMatrixWorld(true);
    const place = (items: readonly Placeable[]) => {
      items.forEach((item, index) => {
        const [x, z] = SLOTS[index % SLOTS.length];
        const scale = Math.min((item.hero ? 3.6 : 3.0) / Math.max(item.height, 0.05), (item.hero ? 1.6 : 1.25) / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, 0, z);
        item.holder.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z) * 0.7 + (context.random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
      });
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -15;
      shadow.right = shadow.top = 15;
      shadow.near = 0.5;
      shadow.far = 70;
      shadow.updateProjectionMatrix();
    };

    const matrix = new THREE.Matrix4();
    const drift = mix(0.02, 0.35, mood.energy) * (sporing ? 1.6 : 1);
    const base = lights.map((material) => material.emissiveIntensity);
    return {
      object: root, camera, background, capacity: SLOTS.length, ground: floor, keyLight: key, place,
      update(_dt: number, time: number) {
        seeds.forEach((seed, index) => {
          const y = (((seed.y + (sporing ? 1 : -0.35) * time * drift) % 9.5) + 9.5) % 9.5;
          matrix.makeScale(seed.size, seed.size, seed.size).setPosition(seed.x + Math.sin(time * drift * 2 + seed.phase) * 0.3, y, seed.z + Math.cos(time * drift * 1.3 + seed.phase) * 0.3);
          cloud.setMatrixAt(index, matrix);
        });
        cloud.instanceMatrix.needsUpdate = true;
        const pulse = 1 + mix(0.03, 0.3, mood.energy) * Math.sin(time * mix(0.5, 2.6, mood.energy));
        lights.forEach((material, index) => { material.emissiveIntensity = base[index] * pulse; });
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
