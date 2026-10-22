import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix } from '@conjure/kit';

type P3 = [number, number, number];
interface Inst { at: P3; scale: P3; turn?: number; color?: THREE.ColorRepresentation }

const SCHOOLS = {
  victorian: 'An old board school: very high ceiling, cream walls over a bottle-green glazed-brick dado, dark varnished doors and tall sash windows.',
  sixties: 'A 1960s secondary modern: pale grey-blue walls, steel-framed windows, mustard doors, low and plain.',
  primary: 'A cheerful primary school: sunny yellow walls, every door a different bright colour, everything at child height.',
  highschool: 'A big comprehensive or high school: beige walls with a maroon stripe, heavy wooden doors with wired glass.',
} as const;
const PALETTE: Record<keyof typeof SCHOOLS, { wall: string; dado: string; floor: string; floor2: string; door: string[]; frame: string; window: string; ceiling: string; height: number; sill: number; head: number }> = {
  victorian: { wall: '#e6dcc0', dado: '#55785a', floor: '#b08a58', floor2: '#96703f', door: ['#4f3220'], frame: '#3f2a1c', window: '#efe9d8', ceiling: '#e9e3cf', height: 3.9, sill: 1.15, head: 3.35 },
  sixties: { wall: '#d6dee0', dado: '#a3bcc6', floor: '#b9b29a', floor2: '#8f9a94', door: ['#d2a03c'], frame: '#eceae2', window: '#8f989c', ceiling: '#e3e6e2', height: 3.1, sill: 0.9, head: 2.75 },
  primary: { wall: '#f1e4b4', dado: '#e8c765', floor: '#c2b494', floor2: '#9fb0a0', door: ['#d8453a', '#2f7fc8', '#3f9f5a', '#e08a2a'], frame: '#f6f3e8', window: '#f6f3e8', ceiling: '#f0ead4', height: 3.05, sill: 0.8, head: 2.6 },
  highschool: { wall: '#ddd7c6', dado: '#8a3434', floor: '#b5ad98', floor2: '#8c8676', door: ['#7d5a38'], frame: '#5a4028', window: '#e9e6dc', ceiling: '#dedccf', height: 3.3, sill: 0.95, head: 2.95 },
};

export default defineWorld({
  questions: {
    school: choice('What kind of school is it?', SCHOOLS),
    floor: choice('What is the waxed floor?', {
      lino: 'Plain polished linoleum with a darker border along each wall.',
      checker: 'Two-tone vinyl tiles in a chequerboard.',
      parquet: 'Herringbone parquet, honey coloured and worn pale down the middle.',
      terrazzo: 'Speckled terrazzo divided by thin brass strips.',
    }),
    doors: choice('How have the classroom doors been left?', {
      propped: 'Every door propped wide open with a wedge, rooms airing.',
      mixed: 'Some open, some ajar, some shut.',
      one: 'All shut except one standing open, light spilling from it.',
      shut: 'Every door shut and locked.',
    }),
    boards: choice('What is left on the noticeboards?', {
      stripped: 'Nothing: stripped to staples, drawing pins and torn paper corners.',
      summer: 'One sheet still up: HAVE A GREAT SUMMER.',
      paintings: 'A few children’s paintings, curling at the corners.',
      timetable: 'A timetable grid and a list of results nobody will read now.',
      backing: 'Bright backing paper and a border with the heading OUR WORK, and no work under it.',
      missing: 'A single MISSING poster with a photograph.',
    }),
    end: choice('What is at the far end of the corridor?', {
      doors: 'Glazed double doors blazing with daylight.',
      window: 'One tall window, a white rectangle of sky.',
      hall: 'The open doors of the hall, with towers of stacked chairs beyond.',
      dark: 'A dim stairwell with a green exit sign, the one unlit place.',
    }),
    lining: choice('What runs along the wall between the classrooms?', {
      pegs: 'A rail of coat pegs over a low bench, with one or two things still hanging.',
      lockers: 'A run of steel lockers.',
      cubbies: 'Wooden pigeonholes with a few plastic trays left in them.',
      bare: 'Nothing; bare painted wall.',
    }),
    left: choice('What has been left behind in the corridor?', {
      nothing: 'Nothing at all.',
      cleaner: 'A floor polisher and a yellow wet-floor sign: the caretaker is somewhere near.',
      aeroplanes: 'Paper aeroplanes lying where they landed on the last day.',
      balloons: 'Leavers’ party balloons, sagging on the floor, one still against the ceiling.',
      banner: 'A paper GOODBYE banner strung across the corridor, one end fallen.',
      boxes: 'Packing boxes stacked against the wall: a teacher has cleared a classroom.',
      bag: 'A single school bag and one shoe in the middle of the floor.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const wear = mood.wear;
    const pal = PALETTE[a.school];
    const root = new THREE.Group();
    const HW = 1.9, H = pal.height, SILL = pal.sill, HEAD = pal.head, Z0 = 10, Z1 = -21, L = Z0 - Z1, ZM = (Z0 + Z1) / 2;
    const PITCH = 3.6, WW = 2.2, DOOR_W = 1.0, DOOR_H = 2.1, DADO = Math.min(SILL, 1.1);
    const CAM: P3 = [-0.8, 1.5, 8.6];
    const windows: number[] = []; for (let z = 9; z > Z1 + 1; z -= PITCH) windows.push(z);
    const doorZ = [-3.2, -10.4, -17.6];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const grey = new THREE.Color('#8b8275');
    const worn = (tint: THREE.ColorRepresentation) => new THREE.Color(tint).lerp(grey, wear * 0.22);
    const add = <T extends THREE.Object3D>(object: T, parent: THREE.Object3D = root) => { parent.add(object); return object; };
    const std = (tint: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: worn(tint), roughness: 0.8, ...options });
    const basic = (tint: THREE.ColorRepresentation, options: THREE.MeshBasicMaterialParameters = {}) => new THREE.MeshBasicMaterial({ color: tint, ...options });
    const box = (size: P3, at: P3, material: THREE.Material, shadow = true, parent: THREE.Object3D = root) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...at); mesh.castShadow = shadow; mesh.receiveShadow = true;
      return add(mesh, parent);
    };
    const instances = (geometry: THREE.BufferGeometry, material: THREE.Material, list: Inst[], shadow = true) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      list.forEach((item, i) => {
        m.compose(new THREE.Vector3(...item.at), q.setFromAxisAngle(up, item.turn ?? 0), new THREE.Vector3(...item.scale));
        mesh.setMatrixAt(i, m);
        if (item.color !== undefined) mesh.setColorAt(i, new THREE.Color(item.color));
      });
      mesh.count = list.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = shadow; mesh.receiveShadow = true; mesh.frustumCulled = false;
      return add(mesh);
    };
    const cube = () => new THREE.BoxGeometry(1, 1, 1);
    const paint = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
      return texture;
    };
    const css = (c: THREE.Color) => `#${c.getHexString()}`;

    // ---- The sun: low summer light through the left-hand windows.
    const noon = 1 - Math.abs(mood.daylight - 0.5) * 2;
    const elevation = THREE.MathUtils.degToRad(mix(21, 36, noon));
    const travel = new THREE.Vector3(Math.cos(elevation), -Math.sin(elevation), mix(-0.3, 0.3, mood.daylight)).normalize();
    const sunTint = new THREE.Color().setHSL(mix(0.13, 0.07, (1 - noon) * 0.6 + mood.warmth * 0.4), mix(0.35, 0.8, (1 - noon) * 0.5 + mood.warmth * 0.5), mix(0.86, 0.78, 1 - noon));
    const hemi = add(new THREE.HemisphereLight(new THREE.Color('#fff6e4').lerp(new THREE.Color('#dfe9ff'), 1 - mood.warmth), worn(pal.floor), mix(0.1, 0.24, mood.cheer)));
    void hemi;
    const key = new THREE.DirectionalLight(sunTint, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0006; key.shadow.normalBias = 0.03;
    key.target.position.set(0, 1.2, ZM);
    key.position.copy(key.target.position).addScaledVector(travel, -30);
    const shadow = key.shadow.camera;
    shadow.left = -L / 2 - 2; shadow.right = L / 2 + 2; shadow.top = 8; shadow.bottom = -8; shadow.near = 1; shadow.far = 60;
    shadow.updateProjectionMatrix();
    add(key); add(key.target);
    const fill = add(new THREE.DirectionalLight('#fff4de', 0.08)); fill.position.set(-2, 3, 12);

    // ---- Floor: painted wax, reflections of the windows and of the far end.
    const PX = 48;
    const fx = (x: number) => (x + HW) * PX, fz = (z: number) => (z - Z1) * PX;
    const reflect = (x: number, y: number, z: number): [number, number] => { const t = CAM[1] / (CAM[1] + y); return [fx(CAM[0] + (x - CAM[0]) * t), fz(CAM[2] + (z - CAM[2]) * t)]; };
    const floorMap = paint(Math.round(HW * 2 * PX), Math.round(L * PX), (g) => {
      const W = g.canvas.width, LL = g.canvas.height;
      const c1 = worn(pal.floor), c2 = worn(pal.floor2);
      g.fillStyle = css(c1); g.fillRect(0, 0, W, LL);
      if (a.floor === 'lino') {
        g.fillStyle = css(c2); g.fillRect(0, 0, 0.3 * PX, LL); g.fillRect(W - 0.3 * PX, 0, 0.3 * PX, LL);
        g.fillStyle = 'rgba(255,255,255,0.08)'; for (let z = 0; z < LL; z += 1.8 * PX) g.fillRect(0, z, W, 1.5);
      } else if (a.floor === 'checker') {
        const t = 0.38 * PX;
        for (let i = 0; i * t < W; i++) for (let j = 0; j * t < LL; j++) { g.fillStyle = css((i + j) % 2 ? c2.clone().offsetHSL(0, 0, (random() - 0.5) * 0.03) : c1.clone().offsetHSL(0, 0, (random() - 0.5) * 0.03)); g.fillRect(i * t + 0.5, j * t + 0.5, t - 1, t - 1); }
      } else if (a.floor === 'parquet') {
        const wood = new THREE.Color('#b98a4e').lerp(grey, wear * 0.2), bl = 0.32 * PX, bw = 0.08 * PX;
        for (let j = -2; j * bw * 1.414 < LL + 40; j++) for (let i = -1; i * bl * 1.414 < W + 40; i++) {
          g.save(); g.translate(i * bl * 1.414 + (j % 2 ? bl * 0.707 : 0), j * bw * 1.414); g.rotate(j % 2 ? Math.PI / 4 : -Math.PI / 4);
          g.fillStyle = css(wood.clone().offsetHSL((random() - 0.5) * 0.015, 0, (random() - 0.5) * 0.09)); g.fillRect(0, 0, bl - 0.6, bw - 0.6); g.restore();
        }
        const pale = g.createLinearGradient(0, 0, W, 0); pale.addColorStop(0.15, 'rgba(240,228,200,0)'); pale.addColorStop(0.5, `rgba(240,228,200,${0.12 + wear * 0.3})`); pale.addColorStop(0.85, 'rgba(240,228,200,0)');
        g.fillStyle = pale; g.fillRect(0, 0, W, LL);
      } else {
        const chips = ['#6f6a5c', '#e6dfcc', '#8a5a4a', '#4f5a58', '#c9a86a'];
        for (let i = 0; i < 9000; i++) { g.fillStyle = pick(chips); g.globalAlpha = 0.5; g.fillRect(random() * W, random() * LL, 1 + random() * 2.2, 1 + random() * 2.2); }
        g.globalAlpha = 1; g.fillStyle = '#b8964a';
        for (let z = 0; z < LL; z += 1.8 * PX) g.fillRect(0, z, W, 1.6);
        g.fillRect(0.3 * PX, 0, 1.6, LL); g.fillRect(W - 0.3 * PX, 0, 1.6, LL);
      }
      // Scuffs and trolley lines.
      g.strokeStyle = 'rgba(40,34,26,0.14)';
      for (let i = 0; i < wear * 140; i++) { g.lineWidth = 0.5 + random() * 1.5; const x = random() * W, z = random() * LL; g.beginPath(); g.moveTo(x, z); g.lineTo(x + (random() - 0.5) * 14, z + (random() - 0.5) * 80); g.stroke(); }
      // The wax: each window mirrored in the floor as the camera would see it.
      const shine = mix(0.34, 0.12, wear);
      g.fillStyle = `rgba(255,250,232,${shine})`;
      for (const wz of windows) for (let pane = 0; pane < 3; pane++) {
        const za = wz - WW / 2 + 0.06 + pane * (WW / 3), zb = za + WW / 3 - 0.1;
        const q = [reflect(-HW, SILL + 0.08, za), reflect(-HW, SILL + 0.08, zb), reflect(-HW, HEAD - 0.06, zb), reflect(-HW, HEAD - 0.06, za)];
        g.beginPath(); q.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z))); g.closePath(); g.fill();
      }
      // The far end mirrored as a long pale streak.
      if (a.end !== 'dark') {
        const q = [reflect(-1.15, 0, Z1), reflect(1.15, 0, Z1), reflect(1.15, 2.4, Z1), reflect(-1.15, 2.4, Z1)];
        const grad = g.createLinearGradient(0, q[0][1], 0, q[2][1]);
        grad.addColorStop(0, `rgba(255,250,230,${shine * 1.2})`); grad.addColorStop(1, 'rgba(255,250,230,0)');
        g.fillStyle = grad; g.beginPath(); q.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z))); g.closePath(); g.fill();
      }
      // A general sheen that brightens toward the window side.
      const sheen = g.createLinearGradient(0, 0, W, 0); sheen.addColorStop(0, `rgba(255,252,240,${shine * 0.35})`); sheen.addColorStop(0.6, 'rgba(255,252,240,0)');
      g.fillStyle = sheen; g.fillRect(0, 0, W, LL);
    });
    const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, L), new THREE.MeshStandardMaterial({ map: floorMap, roughness: mix(0.3, 0.62, wear), metalness: 0.04 })));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, ZM); floor.receiveShadow = true;

    // ---- Shell: window wall with real openings, door wall with real openings, ceiling.
    const wallMat = std(pal.wall, { roughness: 0.9 }), dadoMat = std(pal.dado, { roughness: a.school === 'victorian' ? 0.3 : 0.75 }), trimMat = std(pal.frame, { roughness: 0.6 });
    const ceilingMat = std(pal.ceiling, { roughness: 0.95 });
    box([0.3, SILL, L], [-HW - 0.15, SILL / 2, ZM], wallMat);
    box([0.3, H - HEAD, L], [-HW - 0.15, (H + HEAD) / 2, ZM], wallMat);
    box([0.02, DADO, L], [-HW + 0.01, DADO / 2, ZM], dadoMat, false);
    box([0.04, 0.12, L], [-HW + 0.02, 0.06, ZM], trimMat, false);
    const piers: Inst[] = [], pierDado: Inst[] = [], frames: Inst[] = [], ledges: Inst[] = [], ribs: Inst[] = [];
    const WH = HEAD - SILL;
    for (const wz of windows) {
      piers.push({ at: [-HW - 0.15, (SILL + HEAD) / 2, wz - PITCH / 2], scale: [0.3, WH, PITCH - WW] });
      if (DADO > SILL) pierDado.push({ at: [-HW + 0.01, (SILL + DADO) / 2, wz - PITCH / 2], scale: [0.02, DADO - SILL, PITCH - WW] });
      ledges.push({ at: [-HW + 0.05, SILL + 0.02, wz], scale: [0.2, 0.05, WW + 0.12] });
      for (const dz of [-WW / 2 + 0.03, WW / 2 - 0.03]) frames.push({ at: [-HW - 0.12, (SILL + HEAD) / 2, wz + dz], scale: [0.07, WH, 0.07] });
      for (const dz of [-WW / 6, WW / 6]) frames.push({ at: [-HW - 0.12, (SILL + HEAD) / 2, wz + dz], scale: [0.05, WH, 0.045] });
      for (const y of [SILL + 0.03, HEAD - 0.03]) frames.push({ at: [-HW - 0.12, y, wz], scale: [0.07, 0.07, WW] });
      frames.push({ at: [-HW - 0.12, SILL + WH * (a.school === 'victorian' ? 0.5 : 0.68), wz], scale: [0.05, 0.05, WW] });
      if (a.school === 'victorian') frames.push({ at: [-HW - 0.12, SILL + WH * 0.75, wz], scale: [0.04, 0.035, WW] }, { at: [-HW - 0.12, SILL + WH * 0.25, wz], scale: [0.04, 0.035, WW] });
      for (let i = 0; i < 13; i++) ribs.push({ at: [-HW + 0.1, 0.44, wz - 0.6 + i * 0.1], scale: [0.11, 0.62, 0.055] });
    }
    piers.push({ at: [-HW - 0.15, (SILL + HEAD) / 2, windows[0] + PITCH / 2], scale: [0.3, WH, PITCH - WW] });
    instances(cube(), wallMat, piers);
    if (pierDado.length) instances(cube(), dadoMat, pierDado, false);
    instances(cube(), std(pal.window, { roughness: 0.5 }), frames);
    instances(cube(), std('#f1ede0', { roughness: 0.5 }), ledges);
    instances(cube(), std(a.school === 'victorian' ? '#6f6a5c' : '#e9e4d4', { roughness: 0.5, metalness: 0.2 }), ribs);
    // Outside: a bright, soft nothing of sky and summer trees.
    const outside = add(new THREE.Mesh(new THREE.PlaneGeometry(L + 8, 9), basic('#ffffff', { map: paint(256, 128, (g) => {
      const sky = g.createLinearGradient(0, 0, 0, 128); sky.addColorStop(0, '#f4f8fb'); sky.addColorStop(0.5, '#fbfaf0'); sky.addColorStop(1, '#e3ecc6');
      g.fillStyle = sky; g.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${150 + random() * 40},${190 + random() * 30},${120 + random() * 30},${0.3 + random() * 0.3})`; g.beginPath(); g.ellipse(random() * 256, 78 + random() * 26, 10 + random() * 18, 9 + random() * 14, 0, 0, 7); g.fill(); }
    }) })));
    outside.rotation.y = Math.PI / 2; outside.position.set(-HW - 2.2, 3.2, ZM);

    const doors = doorZ.map((z, index) => {
      const open = a.doors === 'propped' ? true : a.doors === 'shut' ? false : a.doors === 'one' ? index === 0 : random() < 0.6;
      const angle = open ? mix(1.4, 1.75, random()) : a.doors === 'mixed' && random() < 0.5 ? mix(0.25, 0.6, random()) : 0;
      return { z, open, angle, colour: pal.door[index % pal.door.length] };
    });
    const segs: Inst[] = [], segDado: Inst[] = [], skirt: Inst[] = [];
    const edges = [Z0, ...doorZ.flatMap((z) => [z + DOOR_W / 2, z - DOOR_W / 2]), Z1];
    for (let i = 0; i < edges.length; i += 2) {
      const len = edges[i] - edges[i + 1], mid = (edges[i] + edges[i + 1]) / 2;
      segs.push({ at: [HW + 0.15, H / 2, mid], scale: [0.3, H, len] });
      segDado.push({ at: [HW - 0.01, DADO / 2, mid], scale: [0.02, DADO, len] });
      skirt.push({ at: [HW - 0.02, 0.06, mid], scale: [0.04, 0.12, len] });
    }
    for (const z of doorZ) segs.push({ at: [HW + 0.15, (DOOR_H + H) / 2, z], scale: [0.3, H - DOOR_H, DOOR_W] });
    instances(cube(), wallMat, segs);
    instances(cube(), dadoMat, segDado, false);
    instances(cube(), trimMat, skirt, false);
    box([HW * 2 + 6.2, 0.2, L + 0.6], [2.5, H + 0.1, ZM], ceilingMat);
    box([HW * 2 + 0.6, H, 0.3], [0, H / 2, Z0 + 0.15], wallMat);
    box([HW * 2 + 0.6, H, 0.3], [0, H / 2, Z1 - 0.15], wallMat);
    if (a.school === 'highschool') { box([0.02, 0.12, L], [-HW + 0.012, H - 0.5, ZM], dadoMat, false); box([0.02, 0.12, L], [HW - 0.012, H - 0.5, ZM], dadoMat, false); }

    // Classrooms behind the doors: pale boxes with a blazing far window and desks with chairs up.
    const roomMat = new THREE.MeshStandardMaterial({ color: worn(pal.wall).offsetHSL(0, 0, 0.03), roughness: 0.9, side: THREE.BackSide });
    const rooms: Inst[] = [], glows: Inst[] = [], desks: Inst[] = [], frameBits: Inst[] = [];
    for (const door of doors) {
      rooms.push({ at: [HW + 0.3 + 2.4, H / 2 + 0.002, door.z - 1.2], scale: [4.8, H, 6.4] });
      glows.push({ at: [HW + 5.05, 1.9, door.z - 1.2], scale: [0.02, 1.9, 5.4] });
      for (let i = 0; i < 3; i++) desks.push({ at: [HW + 1.5 + i * 1.1, 0.36, door.z - 0.4 - (i % 2) * 1.3], scale: [0.6, 0.72, 1.1] }, { at: [HW + 1.5 + i * 1.1, 0.95, door.z - 0.4 - (i % 2) * 1.3], scale: [0.4, 0.46, 0.9] });
      for (const dz of [-DOOR_W / 2 - 0.04, DOOR_W / 2 + 0.04]) frameBits.push({ at: [HW - 0.02, DOOR_H / 2 + 0.04, door.z + dz], scale: [0.1, DOOR_H + 0.08, 0.09] });
      frameBits.push({ at: [HW - 0.02, DOOR_H + 0.045, door.z], scale: [0.1, 0.09, DOOR_W + 0.17] });
    }
    instances(cube(), roomMat, rooms, false);
    instances(cube(), basic('#fff8de'), glows, false);
    instances(cube(), std('#8a8170', { roughness: 0.9 }), desks);
    instances(cube(), trimMat, frameBits);
    const glassMat = new THREE.MeshStandardMaterial({ color: '#dfeef0', roughness: 0.15, emissive: '#cfe6ea', emissiveIntensity: 0.35 });
    const steelMat = std('#b9bdbe', { metalness: 0.7, roughness: 0.35 });
    for (const door of doors) {
      const hinge = add(new THREE.Group());
      hinge.position.set(HW - 0.03, 0, door.z - DOOR_W / 2);
      const leafMat = std(door.colour, { roughness: 0.55 });
      box([0.045, DOOR_H - 0.02, DOOR_W - 0.02], [0, DOOR_H / 2, DOOR_W / 2], leafMat, true, hinge);
      box([0.052, a.school === 'primary' ? 0.5 : 0.75, a.school === 'victorian' ? 0.5 : 0.2], [0, 1.5, a.school === 'victorian' ? DOOR_W / 2 : DOOR_W * 0.72], glassMat, false, hinge);
      box([0.052, 0.24, DOOR_W - 0.06], [0, 0.14, DOOR_W / 2], steelMat, false, hinge);
      box([0.11, 0.03, 0.12], [0, 1.02, DOOR_W - 0.12], steelMat, false, hinge);
      hinge.rotation.y = -door.angle;
      if (door.open) {
        // The wedge that has held it all summer.
        const tip = new THREE.Vector3(-Math.sin(door.angle), 0, Math.cos(door.angle)).multiplyScalar(DOOR_W * 0.8);
        const wedge = box([0.06, 0.035, 0.14], [HW - 0.03 + tip.x, 0.018, door.z - DOOR_W / 2 + tip.z - 0.05], std('#6a4a2c'), true);
        wedge.rotation.y = -door.angle;
      }
      // Room number plate beside the frame.
      box([0.012, 0.11, 0.2], [HW - 0.008, 1.6, door.z + DOOR_W / 2 + 0.3], std('#f4f1e6', { roughness: 0.5 }), false);
    }

    // ---- Ceiling fittings, all switched off, and a stopped clock.
    const fittings: Inst[] = [];
    for (let z = 5.4; z > Z1 + 1; z -= PITCH) fittings.push({ at: [0, H - 0.04, z], scale: [0.26, 0.07, 1.3] });
    instances(cube(), std('#e6e6de', { roughness: 0.5 }), fittings, false);
    const uneasy = mood.cheer < 0.35;
    const strayTube = uneasy ? box([0.2, 0.03, 1.2], [0, H - 0.085, 5.4 - PITCH * 5], basic('#f2fff4'), false) : null;
    const clock = add(new THREE.Group()); clock.position.set(0.25, H - 0.62, -6.6);
    const clockFace = paint(128, 128, (g) => {
      g.fillStyle = '#f6f3e8'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
      g.strokeStyle = '#1d1d1f'; g.lineWidth = 4; for (let i = 0; i < 12; i++) { const t = i * Math.PI / 6; g.beginPath(); g.moveTo(64 + Math.sin(t) * 50, 64 - Math.cos(t) * 50); g.lineTo(64 + Math.sin(t) * 58, 64 - Math.cos(t) * 58); g.stroke(); }
      const hour = random() * 6.3, minute = random() * 6.3;
      g.lineCap = 'round'; g.lineWidth = 7; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.sin(hour) * 30, 64 - Math.cos(hour) * 30); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.sin(minute) * 46, 64 - Math.cos(minute) * 46); g.stroke();
    });
    const drum = add(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 28), std('#2a2c2e', { roughness: 0.5 })), clock); drum.rotation.x = Math.PI / 2; drum.castShadow = true;
    const dial = add(new THREE.Mesh(new THREE.CircleGeometry(0.22, 28), new THREE.MeshStandardMaterial({ map: clockFace, roughness: 0.5, emissive: '#ffffff', emissiveMap: clockFace, emissiveIntensity: 0.25 })), clock); dial.position.z = 0.052;
    box([0.03, 0.4, 0.03], [0, 0.42, 0], std('#2a2c2e'), false, clock);

    // ---- The far end.
    const endMap = paint(256, 256, (g) => {
      const frame = css(worn(pal.frame));
      if (a.end === 'doors') {
        g.fillStyle = css(worn(pal.door[0])); g.fillRect(0, 0, 256, 256);
        g.fillStyle = '#fffbe6'; g.fillRect(22, 70, 96, 150); g.fillRect(138, 70, 96, 150); g.fillRect(22, 10, 212, 40);
        g.fillStyle = 'rgba(190,220,150,0.5)'; g.fillRect(22, 150, 96, 70); g.fillRect(138, 150, 96, 70);
        g.fillStyle = frame; g.fillRect(124, 56, 8, 200); g.fillRect(0, 54, 256, 8); g.fillRect(124, 0, 8, 56);
        g.fillStyle = '#c2c6c8'; g.fillRect(96, 150, 24, 8); g.fillRect(136, 150, 24, 8);
      } else if (a.end === 'window') {
        const sky = g.createLinearGradient(0, 0, 0, 256); sky.addColorStop(0, '#ffffff'); sky.addColorStop(0.7, '#fffbe8'); sky.addColorStop(1, '#e6efc8');
        g.fillStyle = sky; g.fillRect(0, 0, 256, 256);
        g.fillStyle = 'rgba(150,190,120,0.55)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(random() * 256, 215 + random() * 30, 40, 34, 0, 0, 7); g.fill(); }
        g.fillStyle = css(worn(pal.window)); for (const x of [0, 82, 168, 248]) g.fillRect(x, 0, 8, 256); for (const y of [0, 84, 170, 248]) g.fillRect(0, y, 256, 8);
      } else if (a.end === 'hall') {
        g.fillStyle = '#f3ecd2'; g.fillRect(0, 0, 256, 256);
        g.fillStyle = '#fffdf0'; for (const x of [30, 110, 190]) g.fillRect(x, 16, 44, 80);
        g.fillStyle = '#d9c08a'; g.fillRect(0, 190, 256, 66);
        const tones = ['#b8502c', '#3f5f8f', '#6a6f72'];
        for (let i = 0; i < 6; i++) { const x = 18 + i * 40 + random() * 8, h = 50 + random() * 60; g.fillStyle = pick(tones); for (let y = 0; y < h; y += 7) g.fillRect(x, 200 - y, 26, 5); g.fillRect(x + 20, 200 - h - 22, 6, 24); g.fillStyle = '#3a3a3c'; g.fillRect(x, 200, 3, 16); g.fillRect(x + 23, 200, 3, 16); }
        g.fillStyle = frame; g.fillRect(0, 0, 10, 256); g.fillRect(246, 0, 10, 256); g.fillRect(0, 0, 256, 10);
      } else {
        const dim = g.createLinearGradient(0, 0, 0, 256); dim.addColorStop(0, '#59626a'); dim.addColorStop(1, '#343b42');
        g.fillStyle = dim; g.fillRect(0, 0, 256, 256);
        g.strokeStyle = '#6f7a80'; g.lineWidth = 5; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(40 + i * 26, 250 - i * 24); g.lineTo(66 + i * 26, 250 - i * 24); g.lineTo(66 + i * 26, 226 - i * 24); g.stroke(); }
        g.lineWidth = 6; g.beginPath(); g.moveTo(30, 180); g.lineTo(216, 20); g.stroke();
        g.fillStyle = '#2fd27a'; g.fillRect(84, 14, 88, 34); g.fillStyle = '#eafff2'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('EXIT', 128, 41);
      }
    });
    const endH = Math.min(H - 0.5, 2.7);
    const endPanel = add(new THREE.Mesh(new THREE.PlaneGeometry(2.5, endH), basic('#ffffff', { map: endMap }))); endPanel.position.set(0, endH / 2 + (a.end === 'window' ? 0.45 : 0), Z1 + 0.012);
    box([2.7, 0.1, 0.08], [0, endH + 0.05 + (a.end === 'window' ? 0.45 : 0), Z1 + 0.04], trimMat, false);
    for (const side of [-1, 1]) box([0.1, endH, 0.08], [side * 1.3, endH / 2 + (a.end === 'window' ? 0.45 : 0), Z1 + 0.04], trimMat, false);

    // ---- Noticeboards: cork, staples, torn corners and whatever is still pinned up.
    const boardMaterials: THREE.Material[] = [];
    const board = (z: number, width: number, first: boolean) => {
      const hgt = 1.25, px = 200;
      const map = paint(Math.round(width * px), Math.round(hgt * px), (g) => {
        const W = g.canvas.width, Hh = g.canvas.height;
        const backing = a.boards === 'backing';
        g.fillStyle = backing ? css(worn(pick(['#3f7fd0', '#d84a3a', '#3f9f5a', '#f0b82a']))) : css(worn('#c49a62')); g.fillRect(0, 0, W, Hh);
        if (!backing) for (let i = 0; i < 2600; i++) { g.fillStyle = random() < 0.5 ? 'rgba(90,60,30,0.25)' : 'rgba(240,215,170,0.25)'; g.fillRect(random() * W, random() * Hh, 2, 2); }
        // Unfaded rectangles where things hung all year.
        for (let i = 0; i < 5; i++) { g.fillStyle = backing ? 'rgba(0,0,0,0.1)' : 'rgba(120,80,40,0.22)'; const w = 50 + random() * 70, h = 60 + random() * 70; g.fillRect(14 + random() * (W - w - 28), 18 + random() * (Hh - h - 30), w, h); }
        if (backing) {
          g.fillStyle = '#f6e27a'; for (let x = 0; x < W; x += 22) { g.beginPath(); g.arc(x + 11, 0, 13, 0, 7); g.fill(); g.beginPath(); g.arc(x + 11, Hh, 13, 0, 7); g.fill(); } for (let y = 0; y < Hh; y += 22) { g.beginPath(); g.arc(0, y + 11, 13, 0, 7); g.fill(); g.beginPath(); g.arc(W, y + 11, 13, 0, 7); g.fill(); }
          g.fillStyle = '#fdfbf0'; g.font = `bold ${Math.min(52, W / 6)}px sans-serif`; g.textAlign = 'center'; g.fillText('OUR WORK', W / 2, 62);
        }
        // Paper corners and scraps, each still held by its staple.
        const papers = ['#fbf8ee', '#fbf8ee', '#f7e59a', '#cfe4f2', '#f2c6cf', '#d6efd0'];
        for (let i = 0; i < 16 + mood.density * 14; i++) {
          const x = 10 + random() * (W - 20), y = (backing ? 80 : 10) + random() * (Hh - (backing ? 100 : 20)), sz = 7 + random() * 15;
          g.save(); g.translate(x, y); g.rotate(random() * 6.3); g.fillStyle = pick(papers);
          g.beginPath(); g.moveTo(0, 0); g.lineTo(sz, 0); g.lineTo(sz * random() * 0.6, sz * (0.4 + random() * 0.6)); g.closePath(); g.fill();
          g.fillStyle = '#7a7f84'; g.fillRect(1, 1, 5, 1.5); g.restore();
        }
        for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(110,116,122,0.9)'; g.save(); g.translate(random() * W, random() * Hh); g.rotate(random() * 3); g.fillRect(0, 0, 5, 1.3); g.restore(); }
        for (let i = 0; i < 12; i++) { g.fillStyle = pick(['#d8352c', '#2c66c8', '#f0c020', '#2f9a52', '#f4f1e6']); g.beginPath(); g.arc(random() * W, random() * Hh, 2.6, 0, 7); g.fill(); }
        if (!first) return;
        const sheet = (x: number, y: number, w: number, h: number, tilt: number, tint: string, draw: () => void) => { g.save(); g.translate(x, y); g.rotate(tilt); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(-w / 2 + 3, -h / 2 + 4, w, h); g.fillStyle = tint; g.fillRect(-w / 2, -h / 2, w, h); draw(); g.restore(); };
        if (a.boards === 'summer') sheet(W * 0.5, Hh * 0.52, 250, 150, -0.05, '#fbf8ee', () => { g.fillStyle = '#d8452f'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.fillText('HAVE A GREAT', 0, -18); g.fillStyle = '#2c66c8'; g.font = 'bold 50px sans-serif'; g.fillText('SUMMER!', 0, 36); g.fillStyle = '#f0c020'; g.beginPath(); g.arc(-98, -48, 14, 0, 7); g.fill(); });
        if (a.boards === 'paintings') for (let i = 0; i < 3; i++) sheet(W * (0.2 + i * 0.3), Hh * (0.5 + (random() - 0.5) * 0.15), 104, 132, (random() - 0.5) * 0.25, '#fbf8ee', () => {
          g.fillStyle = pick(['#f0c020', '#f08a2a']); g.beginPath(); g.arc(-28, -40, 14, 0, 7); g.fill();
          g.fillStyle = pick(['#d8352c', '#2c66c8', '#8a4fc8']); g.fillRect(-22, -4, 42, 36); g.fillStyle = '#3f9f5a'; g.fillRect(-52, 34, 104, 16);
          g.fillStyle = pick(['#2c66c8', '#d8352c']); g.beginPath(); g.moveTo(-28, -4); g.lineTo(-1, -30); g.lineTo(26, -4); g.fill();
        });
        if (a.boards === 'timetable') { sheet(W * 0.34, Hh * 0.5, 190, 160, 0.02, '#fbf8ee', () => { g.strokeStyle = '#3a3a3a'; g.lineWidth = 1.5; for (let i = 0; i <= 6; i++) { g.beginPath(); g.moveTo(-85 + i * 28.3, -68); g.lineTo(-85 + i * 28.3, 68); g.stroke(); } for (let j = 0; j <= 6; j++) { g.beginPath(); g.moveTo(-85, -68 + j * 22.6); g.lineTo(85, -68 + j * 22.6); g.stroke(); } for (let i = 0; i < 14; i++) { g.fillStyle = pick(['#f7e59a', '#cfe4f2', '#f2c6cf', '#d6efd0']); g.fillRect(-84 + Math.floor(random() * 6) * 28.3, -67 + Math.floor(random() * 6) * 22.6, 27, 21); } }); sheet(W * 0.76, Hh * 0.5, 110, 170, -0.04, '#fbf8ee', () => { g.fillStyle = '#2a2a2a'; g.fillRect(-40, -72, 80, 9); for (let i = 0; i < 12; i++) g.fillRect(-42, -52 + i * 10, 40 + random() * 44, 3); }); }
        if (a.boards === 'missing') sheet(W * 0.55, Hh * 0.5, 130, 180, 0.06, '#fbf8ee', () => { g.fillStyle = '#c8281f'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('MISSING', 0, -58); g.fillStyle = '#8f8a80'; g.fillRect(-42, -44, 84, 74); g.fillStyle = '#3a3632'; g.beginPath(); g.ellipse(0, 6, 22, 18, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(-20, -6); g.lineTo(-14, -26); g.lineTo(-4, -8); g.fill(); g.beginPath(); g.moveTo(20, -6); g.lineTo(14, -26); g.lineTo(4, -8); g.fill(); g.fillStyle = '#2a2a2a'; for (let i = 0; i < 4; i++) g.fillRect(-46, 42 + i * 10, 60 + random() * 30, 3); });
      });
      const material = new THREE.MeshStandardMaterial({ map, roughness: 0.9 });
      boardMaterials.push(material);
      const plane = add(new THREE.Mesh(new THREE.PlaneGeometry(width, hgt), material));
      plane.rotation.y = -Math.PI / 2; plane.position.set(HW - 0.03, 1.6, z); plane.receiveShadow = true;
      const wood = std('#8a6a44', { roughness: 0.6 });
      for (const y of [1.6 - hgt / 2 - 0.025, 1.6 + hgt / 2 + 0.025]) box([0.04, 0.05, width + 0.1], [HW - 0.02, y, z], wood, false);
      for (const dz of [-width / 2 - 0.025, width / 2 + 0.025]) box([0.04, hgt + 0.1, 0.05], [HW - 0.02, 1.6, z + dz], wood, false);
    };
    board(0.75, 2.5, true);
    board(-8.6, 1.9, false);
    board(-15.8, 1.9, false);

    // ---- What lines the wall between classrooms.
    for (const zc of [-5.9, -13.1]) {
      const len = 2.8;
      if (a.lining === 'pegs') {
        const wood = std('#a9814e', { roughness: 0.6 });
        const pegY = a.school === 'primary' ? 1.05 : 1.45;
        box([0.04, 0.12, len], [HW - 0.03, pegY, zc], wood, false);
        const pegs: Inst[] = [], tags: Inst[] = [];
        for (let i = 0; i < 11; i++) { const z = zc - len / 2 + 0.15 + i * 0.25; pegs.push({ at: [HW - 0.09, pegY - 0.01, z], scale: [0.1, 0.025, 0.025] }); tags.push({ at: [HW - 0.008, pegY + 0.14, z], scale: [0.01, 0.06, 0.12], color: pick(['#fbf8ee', '#f7e59a', '#cfe4f2', '#f2c6cf']) }); }
        instances(cube(), steelMat, pegs, false); instances(cube(), std('#ffffff'), tags, false);
        box([0.34, 0.04, len], [HW - 0.19, 0.4, zc], wood); for (const dz of [-len / 2 + 0.1, 0, len / 2 - 0.1]) box([0.3, 0.38, 0.05], [HW - 0.19, 0.19, zc + dz], wood);
        const hang = 1 + Math.floor(random() * 2 + mood.density * 2);
        for (let i = 0; i < hang; i++) {
          const z = zc - len / 2 + 0.15 + Math.floor(random() * 11) * 0.25, tint = std(pick(['#c8402c', '#2f5fa8', '#3f8f5a', '#e0a82a', '#6a3f8a']), { roughness: 0.9 });
          if (random() < 0.5) { const bag = add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), tint)); bag.scale.set(0.09, 0.2, 0.15); bag.position.set(HW - 0.14, pegY - 0.26, z); bag.castShadow = true; }
          else { box([0.1, 0.62, 0.34], [HW - 0.1, pegY - 0.36, z], tint); box([0.08, 0.5, 0.09], [HW - 0.1, pegY - 0.36, z - 0.2], tint); }
        }
        box([0.1, 0.07, 0.24], [HW - 0.3, 0.035, zc + 0.6], std('#2a2a2c'));
      } else if (a.lining === 'lockers') {
        const tones = a.school === 'primary' ? ['#d8453a', '#2f7fc8', '#3f9f5a', '#e0a82a'] : a.school === 'highschool' ? ['#8a3434'] : a.school === 'sixties' ? ['#6f8fa8'] : ['#6f7a70'];
        const bodies: Inst[] = [], vents: Inst[] = [], plates: Inst[] = [];
        const n = Math.round(len / 0.31);
        const ajar = Math.floor(random() * n);
        for (let i = 0; i < n; i++) {
          const z = zc - len / 2 + 0.155 + i * 0.31;
          bodies.push({ at: [HW - 0.2, 0.95, z], scale: [0.4, 1.8, 0.3], color: worn(tones[i % tones.length]).offsetHSL(0, 0, (random() - 0.5) * 0.04) });
          for (const y of [1.6, 1.65, 1.7, 0.25, 0.3]) vents.push({ at: [HW - 0.402, y, z], scale: [0.01, 0.022, 0.2] });
          plates.push({ at: [HW - 0.402, 1.45, z], scale: [0.01, 0.045, 0.09] });
          if (i === ajar && wear + random() > 0.6) { const leaf = box([0.012, 1.74, 0.29], [HW - 0.41 - 0.12, 0.95, z - 0.1], std(tones[i % tones.length], { metalness: 0.2 })); leaf.rotation.y = -0.9; }
        }
        instances(cube(), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.25, roughness: 0.5 }), bodies);
        instances(cube(), std('#1c1d1f'), vents, false); instances(cube(), std('#e9e4d2'), plates, false);
        box([0.4, 0.05, len + 0.02], [HW - 0.2, 0.025, zc], std('#2a2a2c'), false);
      } else if (a.lining === 'cubbies') {
        const wood = std('#c9a468', { roughness: 0.6 });
        const hgt = a.school === 'primary' ? 1.0 : 1.3, rows = Math.round(hgt / 0.26), cols = 8;
        box([0.02, hgt, len], [HW - 0.02, hgt / 2 + 0.06, zc], wood, false);
        for (let r = 0; r <= rows; r++) box([0.36, 0.02, len], [HW - 0.19, 0.06 + r * hgt / rows, zc], wood);
        for (let c = 0; c <= cols; c++) box([0.36, hgt, 0.02], [HW - 0.19, hgt / 2 + 0.06, zc - len / 2 + c * len / cols], wood);
        const trays: Inst[] = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (random() < mix(0.12, 0.5, mood.density)) trays.push({ at: [HW - 0.2, 0.06 + (r + 0.32) * hgt / rows, zc - len / 2 + (c + 0.5) * len / cols], scale: [0.34, hgt / rows * 0.55, len / cols - 0.05], color: pick(['#d8453a', '#2f7fc8', '#3f9f5a', '#e0a82a', '#8f969a']) });
        if (trays.length) instances(cube(), std('#ffffff', { roughness: 0.4 }), trays);
      }
    }

    // ---- Left behind.
    const paper = std('#fbf8ee', { roughness: 0.8, side: THREE.DoubleSide });
    const balloons: THREE.Mesh[] = [];
    if (a.left === 'cleaner') {
      const yellow = std('#f0c020', { roughness: 0.5, side: THREE.DoubleSide });
      for (const lean of [-1, 1]) { const leaf = box([0.3, 0.62, 0.012], [-1.05, 0.3, 3.3 + lean * 0.09], yellow); leaf.rotation.x = -lean * 0.3; leaf.rotation.y = 0.3; }
      const px2 = -0.95, pz2 = -6.9;
      const disc = add(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.14, 24), std('#5f6a72', { metalness: 0.4, roughness: 0.4 }))); disc.position.set(px2, 0.09, pz2); disc.castShadow = true;
      box([0.2, 0.16, 0.2], [px2, 0.24, pz2 + 0.02], std('#c8402c', { roughness: 0.5 }));
      const pole = box([0.035, 1.05, 0.035], [px2, 0.75, pz2 + 0.2], steelMat); pole.rotation.x = 0.35;
      box([0.42, 0.035, 0.035], [px2, 1.24, pz2 + 0.38], std('#1d1d1f'));
      const bucket = add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 18), std('#3f6fb0', { roughness: 0.5 }))); bucket.position.set(0.9, 0.15, -8.2); bucket.castShadow = true;
      const mop = box([0.03, 1.3, 0.03], [0.98, 0.72, -8.2], std('#c9a468')); mop.rotation.z = -0.22;
    } else if (a.left === 'aeroplanes') {
      const shape = new THREE.BufferGeometry();
      shape.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.012, 0.16, -0.09, 0.04, -0.12, 0, 0, -0.1, 0, 0.012, 0.16, 0, 0, -0.1, 0.09, 0.04, -0.12, 0, 0.012, 0.16, 0, 0, -0.1, 0, -0.03, -0.1], 3));
      shape.computeVertexNormals();
      const spots: [number, number][] = [[-0.95, 3.2], [0.95, 3.0], [-0.5, -3.0], [0.2, -7.5], [1.3, -5.0], [-1.2, -9.5]];
      const planes = add(new THREE.InstancedMesh(shape, paper, spots.length));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      spots.forEach(([x, z], i) => { m.compose(new THREE.Vector3(x + (random() - 0.5) * 0.3, 0.035, z + (random() - 0.5) * 0.5), q.setFromEuler(new THREE.Euler((random() - 0.5) * 0.2, random() * 6.3, (random() - 0.5) * 0.5)), new THREE.Vector3(1.7, 1.7, 1.7)); planes.setMatrixAt(i, m); });
      planes.castShadow = true; planes.frustumCulled = false;
    } else if (a.left === 'balloons') {
      const tints = ['#e2382c', '#f2c21c', '#2f8fd8', '#3fb65a', '#e85aa0', '#f3f1e8'];
      const spots: P3[] = [[-1.2, 0.17, 3.3], [-0.6, 0.15, 3.9], [1.25, 0.16, 2.2], [-1.35, 0.16, -1.2], [0.5, 0.15, -4.6], [0.55, H - 0.2, -1.6], [-0.9, 0.15, -8]];
      spots.forEach(([x, y, z], i) => {
        const high = y > 1, sag = high ? 1 : mix(0.95, 0.6, wear);
        const balloon = add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), std(tints[i % tints.length], { roughness: 0.3 })));
        balloon.scale.set(sag, high ? 1.15 : sag * 0.95, sag); balloon.position.set(x + (random() - 0.5) * 0.2, high ? y : 0.16 * sag * 0.95, z + (random() - 0.5) * 0.3); balloon.castShadow = true;
        if (high) { balloons.push(balloon); box([0.006, 1.1, 0.006], [balloon.position.x, y - 0.73, balloon.position.z], paper, false); }
        else box([0.5, 0.004, 0.008], [balloon.position.x + 0.3, 0.004, balloon.position.z + 0.05], paper, false).rotation.y = random() * 3;
      });
    } else if (a.left === 'banner') {
      const text = pick(['GOODBYE YEAR 6', 'HAPPY HOLIDAYS', 'GOOD LUCK LEAVERS', 'SEE YOU IN SEPTEMBER']);
      const map = paint(1024, 128, (g) => {
        g.fillStyle = '#fbf8ee'; g.fillRect(0, 0, 1024, 128);
        const inks = ['#d8352c', '#2c66c8', '#2f9a52', '#e07a1c', '#8a3fb0'];
        g.font = 'bold 86px sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
        const step = 980 / text.length;
        [...text].forEach((ch, i) => { g.fillStyle = inks[i % inks.length]; g.fillText(ch, 22 + step * (i + 0.5), 66 + Math.sin(i * 1.7) * 6, step); });
      });
      const geo = new THREE.PlaneGeometry(3.9, 0.42, 24, 1);
      const pos = geo.attributes.position;
      // Left end still tied high; the right end has come down to the floor.
      for (let i = 0; i < pos.count; i++) { const u = (pos.getX(i) + 1.95) / 3.9; pos.setY(i, pos.getY(i) + (H - 0.55) * (1 - u ** 1.7) + 0.24 * u - Math.sin(u * Math.PI) * 0.35); pos.setZ(i, Math.sin(u * 9) * 0.05 - u * 0.5); pos.setX(i, -1.95 + u * 3.55); }
      geo.computeVertexNormals();
      const banner = add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide }))); banner.position.set(0.05, 0, -2.4); banner.castShadow = true;
    } else if (a.left === 'boxes') {
      const card = std('#b98f5a', { roughness: 0.95 }), tape = std('#d9c9a0', { roughness: 0.5 });
      const stack = (x: number, z: number, n: number) => { let y = 0; for (let i = 0; i < n; i++) { const w = 0.42 + random() * 0.14, h = 0.3 + random() * 0.14, turn = (random() - 0.5) * 0.4; const b = box([w, h, w * 0.85], [x, y + h / 2, z], card); b.rotation.y = turn; const t = box([w + 0.004, h + 0.004, 0.06], [x, y + h / 2, z], tape, false); t.rotation.y = turn; y += h; } return y; };
      const top = stack(1.5, 1.5, 2); stack(1.45, 0.75, 1); stack(1.5, -0.05, 2); stack(-1.4, 3.3, 2);
      box([0.3, 0.2, 0.3], [1.5, top + 0.1, 1.5], std('#4f8f5a')); const leafBall = add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), std('#5a9a4a'))); leafBall.position.set(1.5, top + 0.4, 1.5); leafBall.scale.y = 0.8; leafBall.castShadow = true;
    } else if (a.left === 'bag') {
      const tint = std(mood.cheer > 0.5 ? '#d8453a' : '#2f4f8a', { roughness: 0.8 });
      const bag = box([0.36, 0.3, 0.16], [-0.75, 0.15, 3.1], tint); bag.rotation.set(-0.25, 0.5, 0);
      box([0.3, 0.14, 0.05], [-0.7, 0.13, 3.2], std('#f0c020')).rotation.set(-0.25, 0.5, 0);
      box([0.09, 0.07, 0.24], [-0.1, 0.035, -2.6], std('#1d1d1f')).rotation.y = 0.9;
    }

    // ---- Sun shafts and the dust in them.
    const shaftMat = basic(sunTint.clone().lerp(new THREE.Color('#ffffff'), 0.4), { transparent: true, opacity: mix(0.05, 0.085, wear * 0.6 + (1 - noon) * 0.4), depthWrite: false, side: THREE.DoubleSide });
    const reach = (y: number) => Math.min(y / -travel.y, (2 * HW) / travel.x);
    const shaftVerts: number[] = [];
    for (const wz of windows) if (wz < 6 && wz > -6) for (const dz of [-WW / 2 + 0.3, 0, WW / 2 - 0.3]) {
      const A = new THREE.Vector3(-HW, SILL + 0.06, wz + dz), B = new THREE.Vector3(-HW, HEAD - 0.06, wz + dz);
      const A2 = A.clone().addScaledVector(travel, reach(A.y)), B2 = B.clone().addScaledVector(travel, reach(B.y));
      for (const p of [A, B, B2, A, B2, A2]) shaftVerts.push(p.x, p.y, p.z);
    }
    const shaftGeo = new THREE.BufferGeometry(); shaftGeo.setAttribute('position', new THREE.Float32BufferAttribute(shaftVerts, 3));
    add(new THREE.Mesh(shaftGeo, shaftMat)).frustumCulled = false;
    const moteCount = Math.round(mix(160, 520, wear * 0.5 + mood.density * 0.5));
    const motes = add(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 4), basic('#fffbe6', { transparent: true, opacity: 0.85, depthWrite: false }), moteCount));
    motes.frustumCulled = false;
    const moteAt: { p: THREE.Vector3; phase: number; size: number }[] = [];
    const near = windows.filter((wz) => wz < 6 && wz > -9);
    for (let i = 0; i < moteCount; i++) {
      const wz = pick(near), start = new THREE.Vector3(-HW, mix(SILL + 0.1, HEAD - 0.1, random()), wz + (random() - 0.5) * (WW - 0.2));
      moteAt.push({ p: start.addScaledVector(travel, random() * reach(start.y)), phase: random() * 6.3, size: mix(0.004, 0.011, random() ** 2) });
    }
    const moteM = new THREE.Matrix4();
    const drift = mix(0.15, 0.7, mood.energy);
    const setMotes = (time: number) => {
      moteAt.forEach((mote, i) => {
        const t = time * drift + mote.phase;
        moteM.makeScale(mote.size, mote.size, mote.size).setPosition(mote.p.x + Math.sin(t * 0.7) * 0.06, mote.p.y + Math.sin(t * 0.43 + 1) * 0.08, mote.p.z + Math.cos(t * 0.6) * 0.06);
        motes.setMatrixAt(i, moteM);
      });
      motes.instanceMatrix.needsUpdate = true;
    };
    setMotes(0);
    // Distance haze: warm air thick with dust, not fog.
    const hazeTint = new THREE.Color(pal.wall).lerp(new THREE.Color('#fff6dc'), 0.6);
    for (const z of [-5, -10, -15]) { const veil = add(new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, H), basic(hazeTint, { transparent: true, opacity: mix(0.04, 0.08, wear), depthWrite: false }))); veil.position.set(0, H / 2, z); }

    // ---- Camera and where the cast stands.
    const camera = new THREE.PerspectiveCamera(38, 1, 0.25, 90);
    const heroX = 0.55;
    const heroZ = windows[2] + (heroX + HW) * (travel.z / travel.x);
    const slots: { x: number; z: number; turn: number; reach: number; wall: number }[] = [
      { x: heroX, z: heroZ, turn: -0.3, reach: 0.85, wall: 0 },
      { x: 1, z: -1.5, turn: -0.85, reach: 0.72, wall: 1 },
      { x: -1, z: -3.6, turn: 0.75, reach: 0.6, wall: -1 },
      { x: 0.45, z: windows[4] + (0.45 + HW) * (travel.z / travel.x), turn: -0.2, reach: 0.7, wall: 0 },
      { x: -1, z: -10.8, turn: 0.7, reach: 0.7, wall: -1 },
    ];
    const place = (items: readonly Placeable[]) => {
      let heroTop = 1.6;
      items.forEach((item, index) => {
        const slot = slots[index % slots.length];
        // True sizes, with small things lifted toward visibility and giants held under the ceiling.
        const natural = Math.max(item.height, item.radius * 1.5, 0.05);
        const shown = natural < 0.9 ? 0.9 * (natural / 0.9) ** 0.45 : natural > 2.3 ? 2.3 * (natural / 2.3) ** 0.2 : natural;
        const scale = Math.min(shown / natural, slot.reach / Math.max(item.radius, 0.05), (H - 0.4) / Math.max(item.height, 0.05));
        item.holder.scale.setScalar(scale);
        const r = item.radius * scale;
        const x = slot.wall ? slot.wall * (HW - 0.12 - Math.min(r, 0.8)) : slot.x;
        item.holder.position.set(x, 0, slot.z);
        item.holder.rotation.y = slot.turn + (random() - 0.5) * 0.25;
        item.holder.updateMatrixWorld(true);
        if (index === 0) heroTop = Math.max(1.2, item.height * scale);
      });
      camera.position.set(...CAM);
      camera.lookAt(0.1, mix(0.95, 1.35, Math.min(1, heroTop / 2.4)), -5.5);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    };
    place([]);

    const background = new THREE.Color(pal.wall).lerp(new THREE.Color('#ffffff'), 0.25);
    const speed = mix(0.6, 2, mood.energy);
    return {
      object: root, camera, background, capacity: slots.length, ground: floor, keyLight: key, place,
      update: (_dt, time) => {
        setMotes(time);
        if (strayTube) (strayTube.material as THREE.MeshBasicMaterial).color.set(Math.sin(time * 9 * speed) * Math.sin(time * 3.7 * speed + 1) > 0.15 ? '#f2fff4' : '#8f9a94');
        for (const balloon of balloons) balloon.position.y = H - 0.2 + Math.sin(time * 0.8) * 0.008;
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
