import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix, noul } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
type P3 = readonly [number, number, number];

const RUG = { w: 1.72, d: 1.46, x: 0, z: 0.3, top: 0.012 };
// Where the cast stands: on the rug, hero in the middle of the sun patch.
const SLOTS = [
  { x: 0.05, z: 0.3, r: 0.3, h: 0.5 },
  { x: -0.6, z: 0.0, r: 0.24, h: 0.42 },
  { x: 0.66, z: 0.02, r: 0.24, h: 0.42 },
  { x: 0.26, z: -0.56, r: 0.2, h: 0.36 },
  { x: -0.42, z: 0.67, r: 0.15, h: 0.28 },
] as const;

export default defineWorld({
  questions: {
    view: choice('How low is the eye that is looking?', {
      cheek: 'Cheek on the carpet: nearly level with the floor, toys looming like buildings.',
      crawl: 'On hands and knees, looking a little down across the rug.',
      standing: 'A small child standing over the game, looking down into it.',
    }),
    rug: choice('What is printed on the play rug?', {
      town: 'A green town map: looping grey roads, a roundabout, a pond, a hospital and a fire station seen from above.',
      racetrack: 'A racing circuit with red and white kerbs, a chequered start line and grandstands.',
      seaside: 'A seaside town: blue sea and a boat along the top, a beach, a pier and a lighthouse.',
    }),
    room: choice('Whose room is this now?', {
      inuse: 'A child\'s, today: toy cars left mid-journey on the roads, a sock, an open picture book.',
      tidy: 'A child\'s, just tidied by an adult: cars parked in a row, slippers paired by the bed.',
      packing: 'Being packed up: taped cardboard boxes stacked against the wall, the child moving on.',
      abandoned: 'Nobody\'s for years: nothing moved, dust in the light, the rug faded.',
    }),
    light: choice('How does the sun come through the window?', {
      slats: 'Through open blinds: broad stripes of light and shadow across the rug.',
      slivers: 'Through nearly closed blinds: thin bright slivers in a dim room.',
      panes: 'Through a plain window: a block of light divided by the shadow of the glazing bars.',
      dapple: 'Through a tree outside: shifting dappled leaf-light.',
    }),
    bed: choice('What is the bed behind like?', {
      made: 'Made, with a bright patterned quilt tucked in.',
      trailing: 'Unmade, a blanket sliding off and trailing onto the floor.',
      bare: 'Stripped to a bare striped mattress.',
      boxes: 'Stripped bare, with cardboard boxes stacked on the mattress.',
    }),
    wall: choice('How is the wall decorated?', {
      clouds: 'Pale sky blue with painted white clouds.',
      stripes: 'Cream and mint striped wallpaper.',
      stars: 'Soft yellow scattered with small stars.',
      plain: 'Plain off-white paint.',
    }),
    marks: noul('Are there pencilled height marks and crayon scribbles on the wall?'),
    floor: choice('What are the floorboards like?', {
      pine: 'Honey-coloured pine boards.',
      dark: 'Dark varnished old boards.',
      painted: 'Boards painted pale grey-white.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const jit = (range: number) => (random() - 0.5) * 2 * range;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const abandoned = a.room === 'abandoned';
    const fade = Math.min(1, mood.wear * 0.7 + (abandoned ? 0.35 : 0));

    const paint = (width: number, height: number, draw: (g: Ctx) => void, repeat?: readonly [number, number]) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      draw(canvas.getContext('2d')!);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 8;
      if (repeat) { map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(...repeat); }
      return map;
    };
    const std = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => {
      const tint = new THREE.Color(color).lerp(new THREE.Color('#9a9488'), fade * 0.22);
      return new THREE.MeshStandardMaterial({ color: tint, roughness: 0.85, ...options });
    };
    const put = <T extends THREE.Object3D>(node: T, at: P3 = [0, 0, 0], parent: THREE.Object3D = root) => {
      node.position.set(...at);
      node.traverse((child) => { child.castShadow = child.receiveShadow = true; });
      parent.add(node);
      return node;
    };
    const box = (size: P3, at: P3, material: THREE.Material | THREE.Material[], parent: THREE.Object3D = root) => put(new THREE.Mesh(new THREE.BoxGeometry(...size), material), at, parent);

    // ---- Light: a low sun from the right, cut into shape by a window that is out of frame ------
    const noon = 1 - Math.abs(mood.daylight * 2 - 1);
    const sun = new THREE.Color().setHSL(mix(0.045, 0.12, noon) + (mood.daylight < 0.5 ? 0.02 : 0) * (1 - noon), mix(0.9, 0.42, noon) * mix(0.55, 1, mood.warmth), mix(0.7, 0.9, noon));
    const dim = a.light === 'slivers' ? 0.82 : 1;
    root.add(new THREE.HemisphereLight(new THREE.Color('#f4f1ea').lerp(sun, 0.18), '#8a7c6a', mix(0.68, 0.92, mood.cheer) * dim));
    const fill = new THREE.DirectionalLight(new THREE.Color('#dfe6f2').lerp(sun, 0.2), mix(0.3, 0.5, mood.cheer) * dim);
    fill.position.set(-2, 3, 6);
    root.add(fill);
    const key = new THREE.DirectionalLight(sun, a.light === 'slivers' ? 7.5 : 5.6);
    const elevation = THREE.MathUtils.degToRad(mix(17, 37, noon)), swing = THREE.MathUtils.degToRad(mood.daylight < 0.5 ? 14 : 26);
    const travel = new THREE.Vector3(-Math.cos(elevation) * Math.cos(swing), -Math.sin(elevation), -Math.cos(elevation) * Math.sin(swing));
    const aim = new THREE.Vector3(0.08, 0, 0.3);
    key.target.position.copy(aim);
    key.position.copy(aim).addScaledVector(travel, -7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const shade = key.shadow.camera;
    shade.left = shade.bottom = -2.5;
    shade.right = shade.top = 2.5;
    shade.near = 0.5;
    shade.far = 12;
    shade.updateProjectionMatrix();
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.012;
    key.shadow.radius = 1.3;
    root.add(key, key.target);

    const across = new THREE.Vector3().crossVectors(travel, new THREE.Vector3(0, 1, 0)).normalize();
    const rise = new THREE.Vector3().crossVectors(across, travel).normalize();
    const windowAt = aim.clone().addScaledVector(travel, -3.6);
    const frame = new THREE.Group();
    frame.position.copy(windowAt);
    frame.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across, rise, new THREE.Vector3().crossVectors(across, rise)));
    root.add(frame);
    // Shadow-only geometry: it is never in view and writes no colour, it only shapes the sunlight.
    const unseen = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
    const caster = (size: P3, at: P3, parent: THREE.Object3D = frame) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), unseen);
      mesh.position.set(...at);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const halfU = 0.62, halfV = a.light === 'panes' ? 0.3 : 0.34;
    caster([7, 14, 0.02], [-(halfU + 3.5), 0, 0]);
    caster([7, 14, 0.02], [halfU + 3.5, 0, 0]);
    caster([halfU * 2 + 0.02, 7, 0.02], [0, halfV + 3.5, 0]);
    caster([halfU * 2 + 0.02, 7, 0.02], [0, -(halfV + 3.5), 0]);
    const blind = new THREE.Group();
    frame.add(blind);
    if (a.light === 'slats' || a.light === 'slivers') {
      const count = 11, pitch = (halfV * 2) / count, cover = a.light === 'slats' ? 0.5 : 0.84;
      for (let i = 0; i < count; i++) {
        const slat = caster([halfU * 2, pitch * cover, 0.004], [0, -halfV + (i + 0.5) * pitch, 0], blind);
        // One or two slats hang crooked in a neglected room.
        if (random() < fade * 0.3) slat.rotation.z = jit(0.12);
      }
      for (const x of [-halfU * 0.6, halfU * 0.6]) caster([0.012, halfV * 2, 0.004], [x, 0, 0], blind);
    } else if (a.light === 'panes') {
      caster([0.05, halfV * 2, 0.01], [0, 0, 0], blind);
      caster([halfU * 2, 0.045, 0.01], [0, halfV * 0.15, 0], blind);
    } else {
      for (let i = 0; i < 90; i++) {
        const leaf = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.004, 9), unseen);
        leaf.rotation.x = Math.PI / 2;
        leaf.scale.set(0.035 + random() * 0.06, 1, 0.03 + random() * 0.05);
        leaf.position.set(jit(halfU * 1.05), jit(halfV * 1.1), jit(0.2));
        leaf.castShadow = true;
        blind.add(leaf);
      }
    }

    // ---- Floorboards ------------------------------------------------------------------------------
    const boardTone = { pine: ['#d2a565', '#b98848'], dark: ['#7d5536', '#5e3d26'], painted: ['#d9d8d0', '#bcbbb2'] }[a.floor];
    const boards = paint(512, 512, (g) => {
      g.fillStyle = boardTone[0];
      g.fillRect(0, 0, 512, 512);
      for (let plank = 0; plank < 8; plank++) {
        const x = plank * 64;
        g.fillStyle = `rgba(${a.floor === 'painted' ? '90,90,85' : '70,40,15'},${random() * 0.16})`;
        g.fillRect(x, 0, 64, 512);
        g.strokeStyle = `rgba(${a.floor === 'painted' ? '120,118,110' : '80,48,20'},0.22)`;
        g.lineWidth = 1;
        for (let i = 0; i < 7; i++) { const gx = x + 5 + random() * 54; g.beginPath(); g.moveTo(gx, 0); g.bezierCurveTo(gx + jit(5), 170, gx + jit(5), 340, gx + jit(3), 512); g.stroke(); }
        if (random() < 0.6) { g.fillStyle = boardTone[1]; g.beginPath(); g.ellipse(x + 14 + random() * 36, random() * 512, 4 + random() * 3, 7 + random() * 5, 0, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = 'rgba(30,18,8,0.7)';
        g.fillRect(x, 0, 2, 512);
        g.fillRect(x, Math.floor(random() * 500), 64, 2);
      }
      g.fillStyle = `rgba(120,112,100,${fade * 0.3})`;
      g.fillRect(0, 0, 512, 512);
    }, [5, 4]);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.8), new THREE.MeshStandardMaterial({ map: boards, roughness: a.floor === 'dark' ? 0.5 : 0.75 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 1.4);
    floor.receiveShadow = true;
    root.add(floor);

    // ---- The rug ----------------------------------------------------------------------------------
    const W = 1024, H = 716;
    const road = (g: Ctx, trace: () => void, width: number, kerb = false) => {
      g.lineCap = 'butt';
      g.lineJoin = 'round';
      g.setLineDash([]);
      if (kerb) {
        g.strokeStyle = '#f4f1e8'; g.lineWidth = width + 18; trace(); g.stroke();
        g.strokeStyle = '#cf2f28'; g.setLineDash([22, 22]); trace(); g.stroke();
        g.setLineDash([]);
      }
      g.strokeStyle = '#646a72'; g.lineWidth = width; trace(); g.stroke();
      g.strokeStyle = '#f6f3e6'; g.lineWidth = 5; g.setLineDash([22, 18]); trace(); g.stroke();
      g.setLineDash([]);
    };
    const house = (g: Ctx, x: number, y: number, w: number, h: number, roof: string) => {
      g.fillStyle = 'rgba(20,40,20,0.25)'; g.fillRect(x + 5, y + 5, w, h);
      g.fillStyle = roof; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x, y, w, h / 2);
      g.strokeStyle = 'rgba(40,20,10,0.6)'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
      g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
    };
    const tree = (g: Ctx, x: number, y: number, r: number) => {
      g.fillStyle = '#2f7a3c'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#58a85a'; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.25, r * 0.55, 0, Math.PI * 2); g.fill();
    };
    const rugMap = paint(W, H, (g) => {
      if (a.rug === 'town') {
        g.fillStyle = '#74b45c';
        g.fillRect(0, 0, W, H);
        for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(160,210,120,0.3)'; g.beginPath(); g.ellipse(random() * W, random() * H, 20 + random() * 50, 12 + random() * 30, random() * 3, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#4c9fd6'; g.beginPath(); g.ellipse(250, 250, 78, 50, 0.2, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#bfe4f6'; g.lineWidth = 5; g.beginPath(); g.ellipse(250, 250, 60, 36, 0.2, 0.3, 2.4); g.stroke();
        road(g, () => { g.beginPath(); g.roundRect(84, 84, W - 168, H - 168, 96); }, 66);
        road(g, () => { g.beginPath(); g.moveTo(410, 84); g.lineTo(410, H - 84); }, 66);
        road(g, () => { g.beginPath(); g.moveTo(84, 388); g.lineTo(W - 84, 388); }, 66);
        g.fillStyle = '#646a72'; g.beginPath(); g.arc(410, 388, 78, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#f6f3e6'; g.lineWidth = 5; g.beginPath(); g.arc(410, 388, 56, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#74b45c'; g.beginPath(); g.arc(410, 388, 36, 0, Math.PI * 2); g.fill();
        for (let i = 0; i < 6; i++) { g.fillStyle = pick(['#f2d23c', '#e85a70', '#ffffff']); g.beginPath(); g.arc(410 + Math.cos(i) * 18, 388 + Math.sin(i) * 18, 6, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#f6f3e6';
        for (let i = 0; i < 6; i++) g.fillRect(690, 358 + i * 11, 44, 6);
        house(g, 520, 150, 150, 110, '#f1eee6');
        g.fillStyle = '#d3271f'; g.fillRect(578, 172, 34, 66); g.fillRect(562, 188, 66, 34);
        g.fillStyle = '#8d939a'; g.fillRect(700, 150, 150, 110);
        g.strokeStyle = '#f6f3e6'; g.lineWidth = 3;
        for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(700 + i * 25, 150); g.lineTo(700 + i * 25, 200); g.stroke(); }
        house(g, 520, 470, 170, 100, '#c9302c');
        g.fillStyle = '#f2d23c'; for (let i = 0; i < 3; i++) g.fillRect(536 + i * 52, 540, 36, 30);
        for (let i = 0; i < 3; i++) house(g, 730 + i * 62, 470 + (i % 2) * 40, 48, 54, pick(['#b9512f', '#3f6a9a', '#8a5a34']));
        house(g, 170, 470, 150, 96, '#e08a2c');
        g.strokeStyle = '#f6f3e6'; g.lineWidth = 4; g.beginPath(); g.arc(250, 600, 0, 0, 0); g.stroke();
        for (const [x, y, r] of [[150, 170, 22], [200, 150, 16], [330, 180, 20], [340, 300, 16], [150, 330, 18], [880, 320, 20], [840, 300, 14], [180, 600, 18], [330, 590, 22], [880, 610, 18]]) tree(g, x, y, r);
      } else if (a.rug === 'racetrack') {
        g.fillStyle = '#4e9a56';
        g.fillRect(0, 0, W, H);
        for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(120,190,110,0.3)'; g.beginPath(); g.ellipse(random() * W, random() * H, 30 + random() * 50, 14 + random() * 30, random() * 3, 0, Math.PI * 2); g.fill(); }
        const circuit = () => {
          g.beginPath();
          g.moveTo(170, 560); g.lineTo(760, 560);
          g.bezierCurveTo(960, 560, 960, 300, 800, 300);
          g.bezierCurveTo(690, 300, 700, 420, 590, 420);
          g.bezierCurveTo(470, 420, 520, 150, 360, 150);
          g.bezierCurveTo(60, 150, 40, 560, 170, 560);
          g.closePath();
        };
        road(g, circuit, 84, true);
        for (let row = 0; row < 7; row++) for (let column = 0; column < 2; column++) { g.fillStyle = (row + column) % 2 ? '#111' : '#f6f3e6'; g.fillRect(430 + column * 12, 518 + row * 12, 12, 12); }
        g.fillStyle = '#f6f3e6';
        for (let i = 0; i < 4; i++) g.fillRect(300 + i * 34, 528 + (i % 2) * 30, 22, 6);
        house(g, 250, 620, 420, 46, '#2f5f9a');
        g.fillStyle = '#f2d23c'; for (let i = 0; i < 12; i++) g.fillRect(262 + i * 34, 630, 20, 8);
        g.fillStyle = '#8d939a'; g.fillRect(250, 250, 170, 80);
        g.fillStyle = '#4c9fd6'; g.beginPath(); g.ellipse(790, 430, 60, 34, 0, 0, Math.PI * 2); g.fill();
        for (let i = 0; i < 9; i++) { g.fillStyle = '#1b1b1d'; g.beginPath(); g.arc(610 + (i % 3) * 16, 250 + Math.floor(i / 3) * 16, 7, 0, Math.PI * 2); g.fill(); }
        for (const [x, y, r] of [[120, 110, 22], [880, 120, 24], [930, 620, 20], [80, 640, 22], [700, 180, 18]]) tree(g, x, y, r);
      } else {
        g.fillStyle = '#7fbf68';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#3f93d0';
        g.fillRect(0, 0, W, 230);
        g.strokeStyle = '#cdeaf8'; g.lineWidth = 4;
        for (let i = 0; i < 26; i++) { const x = random() * W, y = 20 + random() * 190; g.beginPath(); g.arc(x, y, 14, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
        g.fillStyle = '#efd78a';
        g.beginPath(); g.moveTo(0, 230); for (let x = 0; x <= W; x += 64) g.lineTo(x, 222 + Math.sin(x / 70) * 12); g.lineTo(W, 310); g.lineTo(0, 310); g.fill();
        for (let i = 0; i < 6; i++) { const x = 90 + i * 150 + jit(20); g.fillStyle = pick(['#d3271f', '#f2d23c', '#2f6fb8', '#ee82a8']); g.beginPath(); g.arc(x, 270, 20, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 20, 270); g.lineTo(x + 20, 270); g.moveTo(x, 250); g.lineTo(x, 290); g.stroke(); }
        g.fillStyle = '#8a5a34'; g.fillRect(640, 60, 46, 200);
        g.strokeStyle = '#5a3a20'; g.lineWidth = 2; for (let y = 70; y < 260; y += 14) { g.beginPath(); g.moveTo(640, y); g.lineTo(686, y); g.stroke(); }
        for (const [r, hex] of [[40, '#d3271f'], [28, '#ffffff'], [16, '#d3271f'], [7, '#f2d23c']] as const) { g.fillStyle = hex; g.beginPath(); g.arc(663, 56, r, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#f6f3e6'; g.beginPath(); g.moveTo(240, 110); g.lineTo(370, 110); g.lineTo(340, 150); g.lineTo(262, 150); g.fill();
        g.fillStyle = '#d3271f'; g.fillRect(286, 88, 44, 22);
        road(g, () => { g.beginPath(); g.moveTo(0, 350); g.lineTo(W, 350); }, 62);
        road(g, () => { g.beginPath(); g.moveTo(240, 350); g.lineTo(240, 620); g.lineTo(790, 620); g.lineTo(790, 350); }, 62);
        for (let i = 0; i < 4; i++) house(g, 310 + i * 110, 420 + (i % 2) * 20, 70, 62, pick(['#c9302c', '#3f6a9a', '#e08a2c', '#f1eee6']));
        house(g, 60, 430, 110, 90, '#e85a70');
        house(g, 860, 430, 110, 120, '#f1eee6');
        for (const [x, y, r] of [[120, 620, 20], [900, 640, 22], [520, 540, 16], [420, 550, 18], [960, 400, 14]]) tree(g, x, y, r);
      }
      g.strokeStyle = '#7a2a26'; g.lineWidth = 22; g.strokeRect(0, 0, W, H);
      g.strokeStyle = '#f0dfae'; g.lineWidth = 3; g.strokeRect(15, 15, W - 30, H - 30);
      // Sun-fade, dust and the grey of years.
      g.fillStyle = `rgba(190,184,170,${fade * 0.5})`;
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < Math.round(mood.wear * 10); i++) { g.fillStyle = 'rgba(90,70,50,0.14)'; g.beginPath(); g.ellipse(random() * W, random() * H, 30 + random() * 60, 20 + random() * 40, random() * 3, 0, Math.PI * 2); g.fill(); }
    });
    const pile = std('#7a2a26', { roughness: 1 });
    const rug = box([RUG.w, RUG.top, RUG.d], [RUG.x, RUG.top / 2, RUG.z], [pile, pile, new THREE.MeshStandardMaterial({ map: rugMap, roughness: 1 }), pile, pile, pile]);
    const tassel = std('#efe2bd', { roughness: 1 });
    for (const end of [-1, 1]) for (let i = 0; i < 30; i++) box([0.045, 0.004, 0.012], [RUG.x + end * (RUG.w / 2 + 0.02), 0.003, RUG.z - RUG.d / 2 + 0.03 + i * (RUG.d - 0.06) / 29], tassel).rotation.y = jit(0.25);
    void rug;

    // ---- Wall and skirting ------------------------------------------------------------------------
    const wallMap = paint(1024, 512, (g) => {
      const base = { clouds: '#bcd9ee', stripes: '#f1ead6', stars: '#f5e5a8', plain: '#ece7dc' }[a.wall];
      g.fillStyle = base;
      g.fillRect(0, 0, 1024, 512);
      if (a.wall === 'clouds') {
        g.fillStyle = '#f8fbfd';
        for (let i = 0; i < 9; i++) { const x = 40 + i * 118 + jit(30), y = 60 + random() * 300; for (const [dx, dy, r] of [[-34, 8, 26], [0, -8, 36], [38, 8, 28], [0, 14, 30]]) { g.beginPath(); g.ellipse(x + dx, y + dy, r * 1.2, r * 0.7, 0, 0, Math.PI * 2); g.fill(); } }
      } else if (a.wall === 'stripes') {
        g.fillStyle = '#bfdccc';
        for (let x = 0; x < 1024; x += 44) g.fillRect(x, 0, 20, 512);
      } else if (a.wall === 'stars') {
        g.fillStyle = '#e9a93a';
        for (let i = 0; i < 60; i++) {
          const x = random() * 1024, y = random() * 512, r = 5 + random() * 8;
          g.beginPath();
          for (let k = 0; k < 10; k++) { const angle = -Math.PI / 2 + (k / 10) * Math.PI * 2, rr = k % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(angle) * rr, y + Math.sin(angle) * rr); }
          g.fill();
        }
      }
      if (a.marks) {
        // The wall is 1.7 m tall over 512 px: marks climb from knee height to the top of the frame.
        g.strokeStyle = 'rgba(60,60,70,0.75)'; g.fillStyle = 'rgba(60,60,70,0.75)'; g.lineWidth = 2;
        g.font = '15px Georgia, serif';
        const x = 690;
        for (let i = 0; i < 7; i++) { const y = 400 - i * 28 - random() * 8; g.beginPath(); g.moveTo(x, y + jit(2)); g.lineTo(x + 40 + random() * 16, y + jit(2)); g.stroke(); g.fillText(`${i + 3}`, x + 62, y + 5); }
        g.lineCap = 'round';
        for (let pass = 0; pass < 3; pass++) {
          g.strokeStyle = pick(['rgba(214,52,43,0.8)', 'rgba(45,98,196,0.8)', 'rgba(61,156,70,0.8)', 'rgba(238,127,28,0.8)']);
          g.lineWidth = 4;
          let px = 420 + pass * 60 + jit(30), py = 420 + jit(20), heading = random() * 6;
          g.beginPath(); g.moveTo(px, py);
          for (let i = 0; i < 26; i++) { heading += 0.6 + random() * 1.1; px += Math.cos(heading) * (14 + random() * 26); py = Math.min(462, Math.max(380, py + Math.sin(heading) * (10 + random() * 18))); g.lineTo(px, py); }
          g.stroke();
        }
      }
      g.fillStyle = `rgba(150,140,120,${fade * 0.28})`;
      g.fillRect(0, 0, 1024, 512);
    });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.95 }));
    wallMap.wrapS = wallMap.wrapT = THREE.RepeatWrapping;
    wallMap.repeat.set(6 / 3.4, 3 / 1.7);
    wall.position.set(0, 1.5, -1);
    wall.receiveShadow = true;
    root.add(wall);
    const gloss = std('#f1eee4', { roughness: 0.5 });
    box([6, 0.13, 0.024], [0, 0.065, -0.988], gloss);
    box([6, 0.014, 0.034], [0, 0.137, -0.983], gloss);
    box([0.086, 0.086, 0.008], [0.62, 0.31, -0.996], gloss);
    const glowing = mood.daylight > 0.7 || mood.daylight < 0.22;
    const lamp = new THREE.MeshStandardMaterial({ color: glowing ? '#ffd27a' : '#f3ead2', emissive: '#ffb347', emissiveIntensity: glowing ? 1.6 : 0.05, roughness: 0.6 });
    const night = put(new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 12), lamp), [0.62, 0.3, -0.976]);
    night.scale.set(1, 1.15, 0.7);

    // ---- The bed, back left: we see its foot, one leg and the dark underneath --------------------
    const timber = std(a.floor === 'dark' ? '#c9a878' : '#8d5f3a', { roughness: 0.6 });
    const bedX = -1.35, bedFoot = -0.32, bedFront = -0.44, bedTop = 0.34;
    const bedLength = 2.0, bedDepth = -bedFront - 0.985 + 1.985 - 1;
    void bedDepth;
    const depth = 0.54;
    for (const z of [bedFront - 0.03, -0.955]) {
      const leg = put(new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.024, 0], [0.03, 0.03], [0.02, 0.07], [0.034, 0.13], [0.03, 0.2], [0.036, 0.26], [0.036, bedTop]].map(([r, y]) => new THREE.Vector2(r, y)), 16), timber), [bedFoot - 0.035, 0, z]);
      void leg;
    }
    box([bedLength, 0.1, 0.035], [bedX, bedTop - 0.02, bedFront - 0.03], timber);
    box([0.04, 0.36, depth], [bedFoot - 0.035, bedTop + 0.14, bedFront - depth / 2], timber);
    box([0.05, 0.03, depth + 0.04], [bedFoot - 0.035, bedTop + 0.33, bedFront - depth / 2], timber);
    const ticking = paint(256, 64, (g) => { g.fillStyle = '#ece6d6'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#7f95b3'; for (let x = 0; x < 256; x += 16) g.fillRect(x, 0, 5, 64); g.fillStyle = `rgba(150,130,90,${0.1 + fade * 0.3})`; for (let i = 0; i < 8; i++) g.fillRect(random() * 256, random() * 64, 30 + random() * 40, 10 + random() * 20); }, [4, 1]);
    box([bedLength - 0.06, 0.15, depth - 0.02], [bedX - 0.03, bedTop + 0.1, bedFront - depth / 2 - 0.01], new THREE.MeshStandardMaterial({ map: ticking, roughness: 1 }));
    const quiltColours = mood.cheer > 0.5 ? ['#e2574c', '#f2c230', '#3f8fd0', '#58a85a', '#f1eee6'] : ['#6f7f9a', '#9a8f86', '#b9b2a4', '#56607a', '#d9d3c4'];
    const quilt = new THREE.MeshStandardMaterial({ roughness: 1, map: paint(256, 128, (g) => { for (let row = 0; row < 4; row++) for (let column = 0; column < 8; column++) { g.fillStyle = pick(quiltColours); g.fillRect(column * 32, row * 32, 32, 32); } g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 128); g.stroke(); } for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(256, i * 32); g.stroke(); } }, [3, 1]) });
    if (a.bed === 'made') {
      box([bedLength - 0.04, 0.05, depth + 0.02], [bedX - 0.03, bedTop + 0.2, bedFront - depth / 2], quilt);
      box([bedLength - 0.3, 0.2, 0.014], [bedX - 0.1, bedTop + 0.1, bedFront + 0.006], quilt);
    } else if (a.bed === 'trailing') {
      box([bedLength - 0.3, 0.05, depth], [bedX - 0.16, bedTop + 0.2, bedFront - depth / 2], quilt).rotation.z = 0.03;
      const drape = new THREE.PlaneGeometry(0.62, 0.6, 12, 12);
      const drapePosition = drape.getAttribute('position');
      for (let i = 0; i < drapePosition.count; i++) {
        const u = drapePosition.getX(i) / 0.62 + 0.5, v = 0.5 - drapePosition.getY(i) / 0.6;
        // Hangs from the mattress edge, then pools forward across the floor.
        const hang = Math.min(v / 0.55, 1), pool = Math.max(0, v - 0.55) / 0.45;
        drapePosition.setXYZ(i, (u - 0.5) * 0.62 * (1 + pool * 0.3), (bedTop + 0.2) * (1 - hang) + 0.012 + Math.sin(u * 14 + v * 5) * 0.012 * (0.3 + pool), hang * 0.05 + pool * 0.3 + Math.sin(u * 9) * 0.02);
      }
      drape.computeVertexNormals();
      const fallen = new THREE.MeshStandardMaterial({ map: quilt.map, roughness: 1, side: THREE.DoubleSide });
      put(new THREE.Mesh(drape, fallen), [bedFoot - 0.42, 0, bedFront + 0.005]);
    } else if (a.bed === 'boxes') {
      const card = std('#b98f5e');
      for (const [x, w, h] of [[-0.3, 0.34, 0.26], [-0.72, 0.4, 0.2], [-0.66, 0.3, 0.2]] as const) {
        const crate = box([w, h, 0.36], [bedFoot + x, bedTop + 0.175 + h / 2 + (x === -0.66 ? 0.2 : 0), bedFront - 0.24], card);
        crate.rotation.y = jit(0.2);
        box([w + 0.004, 0.003, 0.05], [crate.position.x, crate.position.y + h / 2 + 0.001, crate.position.z], std('#d9c9a0')).rotation.y = crate.rotation.y;
      }
    }
    const gloom = new THREE.Mesh(new THREE.PlaneGeometry(bedLength, depth + 0.1), new THREE.MeshBasicMaterial({ color: '#1c1410', transparent: true, opacity: 0.42, depthWrite: false }));
    gloom.rotation.x = -Math.PI / 2;
    gloom.position.set(bedX - 0.03, 0.003, bedFront - depth / 2);
    root.add(gloom);
    const backing = new THREE.Mesh(new THREE.PlaneGeometry(bedLength, bedTop), new THREE.MeshBasicMaterial({ color: '#1c1410', transparent: true, opacity: 0.35, depthWrite: false }));
    backing.position.set(bedX - 0.03, bedTop / 2, -0.97);
    root.add(backing);

    // ---- What the room's state leaves lying about -------------------------------------------------
    const car = (x: number, z: number, yaw: number) => {
      const group = put(new THREE.Group(), [x, RUG.top, z]);
      const coat = std(pick(['#d3271f', '#2f6fb8', '#f2c230', '#3d9c46', '#f1eee6', '#ee7f1c']), { roughness: 0.35, metalness: 0.2 });
      const dark = std('#1f2024');
      box([0.085, 0.02, 0.042], [0, 0.019, 0], coat, group);
      box([0.044, 0.018, 0.036], [-0.006, 0.037, 0], coat, group);
      box([0.046, 0.011, 0.037], [-0.006, 0.037, 0], std('#9cc3dd', { roughness: 0.2 }), group);
      for (const wx of [-0.026, 0.026]) for (const wz of [-1, 1]) put(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.008, 12), dark), [wx, 0.011, wz * 0.021], group).rotation.x = Math.PI / 2;
      group.rotation.y = yaw;
      return group;
    };
    const ball = (x: number, z: number, r: number) => {
      const map = paint(128, 64, (g) => { const hues = ['#d3271f', '#f6f3e6', '#2f6fb8', '#f2c230', '#3d9c46', '#f6f3e6']; for (let i = 0; i < 6; i++) { g.fillStyle = hues[i]; g.fillRect(i * 21.4, 0, 22, 64); } });
      const mesh = put(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshStandardMaterial({ map, roughness: 0.5 })), [x, r, z]);
      mesh.rotation.set(random() * 3, random() * 3, random() * 3);
    };
    const cardboard = (x: number, y: number, z: number, w: number, h: number, d: number, label: string | null) => {
      const card = std('#b98f5e');
      const crate = box([w, h, d], [x, y + h / 2, z], card);
      crate.rotation.y = jit(0.12);
      const tape = box([w + 0.003, 0.003, 0.05], [0, h / 2 + 0.001, 0], std('#d9c9a0', { roughness: 0.4 }), crate);
      void tape;
      box([0.05, h * 0.35, d + 0.003], [0, h * 0.33, 0], std('#d9c9a0', { roughness: 0.4 }), crate);
      if (label) {
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.6, h * 0.36), new THREE.MeshStandardMaterial({ roughness: 0.9, map: paint(256, 128, (g) => { g.fillStyle = '#b98f5e'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#2a2622'; g.font = 'bold 76px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.save(); g.translate(128, 66); g.rotate(jit(0.06)); g.fillText(label, 0, 0, 236); g.restore(); }) }));
        sign.position.set(0, -h * 0.08, d / 2 + 0.002);
        crate.add(sign);
      }
      return crate;
    };
    const slipper = (x: number, z: number, yaw: number) => {
      const group = put(new THREE.Group(), [x, 0, z]);
      const felt = std(mood.cheer > 0.5 ? '#3f6a9a' : '#6b6259', { roughness: 1 });
      const sole = put(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), felt), [0, 0.012, 0], group);
      sole.scale.set(0.038, 0.012, 0.085);
      const toe = put(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), felt), [0, 0.012, 0.03], group);
      toe.scale.set(0.038, 0.034, 0.05);
      group.rotation.y = yaw;
    };

    if (a.room === 'inuse') {
      car(0.42, 0.63, 0.2 + jit(0.3));
      car(-0.08, -0.26, 1.2 + jit(0.4));
      if (mood.density > 0.35) car(-0.72, 0.42, 1.7 + jit(0.3)).rotation.z = mood.energy > 0.7 ? Math.PI / 2 : 0;
      ball(-0.85, -0.7, 0.085);
      const sock = put(new THREE.Group(), [0.98, 0, 0.1]);
      const wool = std('#e9e4d6', { roughness: 1 });
      put(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), wool), [0, 0.012, 0], sock).scale.set(0.035, 0.012, 0.085);
      put(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), wool), [0.035, 0.012, 0.07], sock).scale.set(0.05, 0.012, 0.03);
      put(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), std('#d3271f', { roughness: 1 })), [0.07, 0.012, 0.07], sock).scale.set(0.016, 0.0125, 0.03);
      sock.rotation.y = jit(1.5);
      const book = put(new THREE.Group(), [0.9, 0, -0.62]);
      for (const side of [-1, 1]) {
        const leaf = box([0.16, 0.012, 0.21], [side * 0.08, 0.012, 0], std(pick(['#d3271f', '#2f6fb8', '#3d9c46'])), book);
        leaf.rotation.z = side * 0.14;
        box([0.15, 0.004, 0.2], [side * 0.08, 0.02, 0], std('#f6f1e0'), book).rotation.z = side * 0.14;
        box([0.11, 0.0045, 0.1], [side * 0.08, 0.0215, -0.03], std(pick(['#f2c230', '#63b8e6', '#ee82a8'])), book).rotation.z = side * 0.14;
      }
      book.rotation.y = -0.4 + jit(0.3);
    } else if (a.room === 'tidy') {
      for (let i = 0; i < 4; i++) car(0.34 + i * 0.075, 0.67, Math.PI / 2 + jit(0.03));
      slipper(-0.12, -0.6, 0.1);
      slipper(-0.03, -0.6, 0.06);
      const chest = box([0.5, 0.26, 0.3], [0.84, 0.13, -0.8], std('#3f6a9a', { roughness: 0.6 }));
      box([0.52, 0.03, 0.32], [0, 0.145, 0], std('#f2c230', { roughness: 0.6 }), chest);
    } else if (a.room === 'packing') {
      cardboard(0.84, 0, -0.76, 0.46, 0.3, 0.34, 'TOYS');
      cardboard(0.88, 0.3, -0.78, 0.36, 0.24, 0.3, mood.cheer < 0.35 ? 'CHARITY' : 'KEEP');
      if (mood.density > 0.4) cardboard(-0.02, 0, -0.74, 0.3, 0.22, 0.26, 'BOOKS');
      const roll = put(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 20), std('#d9c9a0', { roughness: 0.4 })), [0.6, 0.025, -0.5]);
      void roll;
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.052, 16), std('#5a4630')), [0.6, 0.025, -0.5]);
    } else {
      ball(-0.72, -0.72, 0.08);
      // Dust bunnies along the skirting.
      const fluff = std('#b8b2a6', { roughness: 1 });
      for (let i = 0; i < 9; i++) { const bunny = put(new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), fluff), [-0.1 + i * 0.16 + jit(0.06), 0.01, -0.94 + random() * 0.05]); bunny.scale.set(0.02 + random() * 0.03, 0.012, 0.015 + random() * 0.02); }
    }

    // ---- Dust in the beam ----------------------------------------------------------------------------
    const moteCount = Math.round(mix(14, 90, Math.min(1, mood.density * 0.4 + fade * 0.8)));
    const motes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6dc').lerp(sun, 0.3), transparent: true, opacity: 0.8, depthWrite: false }), moteCount);
    const seeds = Array.from({ length: moteCount }, () => {
      const start = windowAt.clone().addScaledVector(across, jit(halfU * 0.95)).addScaledVector(rise, jit(halfV * 0.95));
      const height = 0.05 + random() * 0.75;
      return { at: start.addScaledVector(travel, (start.y - height) / Math.sin(elevation)), size: 0.0025 + random() * 0.004, phase: random() * 6.28 };
    });
    const moteMatrix = new THREE.Matrix4();
    const drift = (time: number) => {
      seeds.forEach((seed, index) => {
        const s = seed.size;
        moteMatrix.makeScale(s, s, s).setPosition(seed.at.x + Math.sin(time * 0.21 + seed.phase) * 0.03, seed.at.y + Math.sin(time * 0.13 + seed.phase * 2) * 0.03, seed.at.z + Math.cos(time * 0.17 + seed.phase) * 0.03);
        motes.setMatrixAt(index, moteMatrix);
      });
      motes.instanceMatrix.needsUpdate = true;
    };
    drift(0);
    motes.frustumCulled = false;
    root.add(motes);

    // ---- Camera: fixed, low, close ---------------------------------------------------------------------
    const view = { cheek: { pitch: 5, reach: 2.3, fov: 33 }, crawl: { pitch: 14, reach: 2.6, fov: 33 }, standing: { pitch: 27, reach: 2.75, fov: 34 } }[a.view];
    const camera = new THREE.PerspectiveCamera(view.fov, 1, 0.2, 40);
    const focus = new THREE.Vector3(-0.02, a.view === 'cheek' ? 0.25 : 0.16, a.view === 'standing' ? 0.08 : 0.16);
    const yaw = THREE.MathUtils.degToRad(7), pitch = THREE.MathUtils.degToRad(view.pitch);
    camera.position.copy(focus).add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(view.reach));
    camera.lookAt(focus);

    const sway = mix(0, 0.006, mood.energy) * (a.light === 'dapple' ? 3 : 1);
    return {
      object: root,
      camera,
      background: new THREE.Color('#e4e0d4').lerp(sun, 0.1),
      capacity: SLOTS.length,
      ground: floor,
      keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, index) => {
          const slot = SLOTS[index % SLOTS.length];
          const scale = Math.min(slot.h / Math.max(item.height, 0.03), slot.r / Math.max(item.radius, 0.03));
          item.holder.scale.setScalar(scale);
          item.holder.position.set(slot.x, RUG.top, slot.z);
          item.holder.rotation.y = Math.atan2(camera.position.x - slot.x, camera.position.z - slot.z) * 0.6 + (context.random() - 0.5) * 0.5;
          item.holder.updateMatrixWorld(true);
        });
      },
      update(_dt: number, time: number) {
        blind.position.y = Math.sin(time * 0.7) * sway;
        blind.position.x = Math.cos(time * 0.45) * sway * (a.light === 'dapple' ? 2 : 0);
        drift(time * mix(0.4, 2, mood.energy));
      },
      dispose() {
        key.shadow.map?.dispose();
        disposeTree(root);
      },
    };
  },
});
