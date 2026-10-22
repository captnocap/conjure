import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

const W = 8, D = 7, KNEE = 1.3, RIDGE = 4.1, BACK = -3.4, LEFT = -3.9;
const PPM = 128;
const SLOTS: [number, number][] = [[0.3, 0.9], [-1.9, 2.0], [2.3, 1.8], [1.9, -1.0], [-0.5, -1.4], [0.4, 2.9]];
type Point = [number, number, number];

const DECADES = {
  '1890s': { paper: '#8f7f72', stripe: '#6f4a48', frieze: '#d9cdb0', animal: '#5d3b3a', iron: '#23211f', beast: 'lamb' },
  '1920s': { paper: '#a9bccb', stripe: '#8ea6b9', frieze: '#e9e3d0', animal: '#7c6a55', iron: '#e6e1d4', beast: 'rabbit' },
  '1940s': { paper: '#c2b79c', stripe: '#a89b7c', frieze: '#e2d9bd', animal: '#6d7a5a', iron: '#5b6457', beast: 'duck' },
  '1970s': { paper: '#c99a5c', stripe: '#a8683a', frieze: '#ead9b0', animal: '#7a4426', iron: '#d9d2c2', beast: 'elephant' },
} as const;

export default defineWorld({
  questions: {
    decade: choice('In which decade was the nursery shut up and left?', {
      '1890s': 'The 1890s: dark striped paper with a frieze of lambs, black iron, an oil lamp, a hoop and stick.',
      '1920s': 'The 1920s: pale blue paper with a frieze of rabbits, white enamel, a tin drum.',
      '1940s': 'The 1940s: wartime cream and khaki with a frieze of ducks, a blackout curtain half over the window, a labelled evacuee suitcase.',
      '1970s': 'The 1970s: orange and brown paper with a frieze of elephants, a mushroom lamp, a bouncing hopper ball.',
    }),
    moves: choice('What still moves by itself?', {
      nothing: 'Nothing. It is perfectly still.',
      'rocking-chair': 'The rocking chair, its dust sheet slid to the floor.',
      ball: 'A ball, rolling slowly to and fro and leaving a clean track in the dust.',
      top: 'A humming top that has not stopped spinning.',
      'chest-lid': 'The lid of the toy chest, lifting a little and settling again.',
    }),
    state: choice('How dusty, or how strangely tidy, is it?', {
      'thick-dust': 'Thick with dust: cobwebs in every corner, everything under sheets, small footprints across the floor.',
      ransacked: 'Ransacked: the toy chest tipped out and toys thrown about.',
      tidy: 'Strangely tidy: no dust at all, the cot made, the toys lined up along the wall by size.',
      'half-packed': 'Half packed up: tea chests, a trunk and the rug rolled, a move that was never finished.',
    }),
    presence: choice('Whose presence lingers?', {
      'no-one': 'No one in particular; only the room.',
      child: 'A lonely child: chalk drawings low on the wall, a tea party set for two, a small shadow.',
      nanny: 'A watchful nanny: her chair turned to the cot, her knitting, a tall shadow in a long dress.',
      pretender: 'Something that only pretends: pairs of eyes in the dark places and a shadow with too many fingers.',
    }),
    window: choice('What is at the round window?', {
      'full-moon': 'A full moon, throwing a bright crossed patch on the floor.',
      crescent: 'A thin crescent in a deep blue sky; the patch is faint.',
      storm: 'Rain on the glass and lightning now and then.',
      boarded: 'It has been boarded over; moonlight comes through in slats.',
    }),
    cot: choice('How has the iron cot been left?', {
      made: 'Made up neatly with a folded blanket and a pillow.',
      rumpled: 'Rumpled, the blanket thrown back as if someone just got out.',
      stripped: 'Stripped to the bare springs.',
      shape: 'The sheet is drawn right up over a small shape.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const era = DECADES[a.decade];
    const wear = mood.wear;
    const dusty = a.state === 'thick-dust', tidy = a.state === 'tidy';
    const { art: s, world } = diorama(context, { background: '#9aa7ba', floor: '#6d6357', width: W, depth: D, maxHeight: 2.3, radius: 1.15, pitch: 28, yaw: 30, slots: SLOTS });
    const root = s.root;
    const group = (at: Point = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...at); root.add(g); return g; };
    const into = <T extends THREE.Object3D>(parent: THREE.Object3D, child: T) => { parent.attach(child); return child; };
    const flat = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...options });
    const textureOf = (canvas: HTMLCanvasElement) => { const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; return texture; };
    const clear = (x: number, z: number, gap = 1.35) => SLOTS.every(([sx, sz]) => Math.hypot(x - sx, z - sz) > gap);

    // ---- light: cool moon, one warm lamp ----------------------------------------------------
    root.traverse((child) => {
      if (child instanceof THREE.HemisphereLight) { child.color.set('#c3d0ea'); child.groundColor.set('#58606e'); child.intensity = mix(0.95, 1.15, mood.cheer); }
    });
    const key = world.keyLight!;
    const moonPower = { 'full-moon': 2.5, crescent: 1.7, storm: 1.5, boarded: 1.4 }[a.window];
    key.color.set('#d5e0ff');
    key.intensity = moonPower;

    // ---- wallpaper ------------------------------------------------------------------------------
    const paper = document.createElement('canvas');
    paper.width = 1024; paper.height = 512;
    const p = paper.getContext('2d')!;
    const py = (y: number) => 512 - y / RIDGE * 512, px = (x: number) => (x + W / 2) / W * 1024;
    const tone = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#8d949e'), 0.18 + wear * 0.22).lerp(new THREE.Color('#ffffff'), mood.cheer * 0.08).getStyle();
    p.fillStyle = tone(era.paper); p.fillRect(0, 0, 1024, 512);
    p.fillStyle = tone(era.stripe);
    if (a.decade === '1970s') { for (let x = 0; x < 1024; x += 44) for (let y = 0; y < 512; y += 44) { p.beginPath(); p.arc(x + ((y / 44) % 2) * 22, y, 15, 0, 7); p.fill(); } }
    else for (let x = 0; x < 1024; x += 26) p.fillRect(x, 0, a.decade === '1890s' ? 10 : 5, 512);
    // The frieze of animals just under knee-wall height.
    const f0 = py(1.28), f1 = py(0.82);
    p.fillStyle = tone(era.frieze); p.fillRect(0, f0, 1024, f1 - f0);
    p.fillStyle = tone(era.animal); p.fillRect(0, f0, 1024, 4); p.fillRect(0, f1 - 4, 1024, 4);
    const beast = (x: number, y: number, k: number) => {
      const e = (ox: number, oy: number, rx: number, ry: number, turn = 0) => { p.beginPath(); p.ellipse(x + ox * k, y + oy * k, rx * k, ry * k, turn, 0, 7); p.fill(); };
      if (era.beast === 'rabbit') { e(0, 0, 13, 9); e(13, -8, 7, 6); e(12, -20, 2.6, 9, 0.2); e(17, -19, 2.6, 9, 0.5); e(-13, -3, 4, 4); }
      if (era.beast === 'lamb') { for (const [ox, oy] of [[-8, -2], [0, -5], [8, -2], [-4, 4], [5, 4]]) e(ox, oy, 8, 7); e(16, -6, 5.5, 5); p.fillRect(x - 9 * k, y + 6 * k, 3 * k, 9 * k); p.fillRect(x + 7 * k, y + 6 * k, 3 * k, 9 * k); }
      if (era.beast === 'duck') { e(0, 0, 13, 8); e(11, -10, 6, 6); p.beginPath(); p.moveTo(x + 16 * k, y - 12 * k); p.lineTo(x + 25 * k, y - 9 * k); p.lineTo(x + 16 * k, y - 6 * k); p.fill(); e(-12, -4, 6, 3, -0.6); }
      if (era.beast === 'elephant') { e(0, 0, 15, 11); e(15, -5, 9, 9); e(11, -6, 6, 9); p.fillRect(x + 20 * k, y - 4 * k, 4 * k, 16 * k); p.fillRect(x - 11 * k, y + 6 * k, 6 * k, 9 * k); p.fillRect(x + 4 * k, y + 6 * k, 6 * k, 9 * k); }
    };
    for (let x = 30; x < 1024; x += 64) beast(x, (f0 + f1) / 2 + 2, 1.05);
    // Dado rail, damp, and paper that has let go of the wall.
    p.fillStyle = 'rgba(40,34,30,0.55)'; p.fillRect(0, py(0.14), 1024, 512);
    for (let i = 0; i < mix(2, 12, wear); i++) {
      const x = random() * 1024, r = mix(40, 130, random());
      const damp = p.createRadialGradient(x, 0, 0, x, 0, r * 2.4);
      damp.addColorStop(0, 'rgba(66,56,40,0.6)'); damp.addColorStop(1, 'rgba(66,56,40,0)');
      p.fillStyle = damp; p.fillRect(x - r * 2.4, 0, r * 4.8, r * 2.4);
    }
    const tears: [number, number][] = [];
    for (let i = 0; i < mix(tidy ? 1 : 3, 15, wear) + (a.state === 'ransacked' ? 4 : 0); i++) {
      const x = random() * 1024, y = mix(py(3.4), py(0.5), random()), w = mix(26, 80, random()), h = mix(40, 150, random());
      p.fillStyle = '#b7b0a2';
      p.beginPath();
      p.moveTo(x - w / 2, y - h / 2);
      for (let k = 1; k <= 6; k++) p.lineTo(x - w / 2 + (k / 6) * w, y - h / 2 + (random() - 0.5) * 16);
      for (let k = 1; k <= 6; k++) p.lineTo(x + w / 2 + (random() - 0.5) * 14, y - h / 2 + (k / 6) * h);
      for (let k = 1; k <= 6; k++) p.lineTo(x + w / 2 - (k / 6) * w, y + h / 2 + (random() - 0.5) * 18);
      p.closePath(); p.fill();
      p.fillStyle = 'rgba(70,60,48,0.5)';
      for (let ly = y - h / 2 + 8; ly < y + h / 2 - 6; ly += 9) p.fillRect(x - w / 2 + 5, ly, w - 10, 2.5);
      tears.push([x, y + h / 2]);
    }
    if (a.presence === 'child') {
      p.strokeStyle = 'rgba(245,242,230,0.9)'; p.lineWidth = 3; p.lineCap = 'round';
      const stick = (x: number, y: number, k: number, hair: boolean) => {
        p.beginPath(); p.arc(x, y - 30 * k, 9 * k, 0, 7); p.moveTo(x, y - 21 * k); p.lineTo(x, y); p.moveTo(x - 12 * k, y - 12 * k); p.lineTo(x + 12 * k, y - 12 * k); p.moveTo(x, y); p.lineTo(x - 9 * k, y + 16 * k); p.moveTo(x, y); p.lineTo(x + 9 * k, y + 16 * k);
        if (hair) { p.moveTo(x - 9 * k, y - 34 * k); p.lineTo(x - 15 * k, y - 20 * k); p.moveTo(x + 9 * k, y - 34 * k); p.lineTo(x + 15 * k, y - 20 * k); }
        p.stroke();
      };
      for (const base of [px(0.4), px(-3.2), px(2.9)]) {
        stick(base, py(0.42), 1, true); stick(base + 44, py(0.4), 1.5, false);
        p.beginPath(); p.arc(base + 100, py(0.62), 13, 0, 7); for (let k = 0; k < 8; k++) { p.moveTo(base + 100 + Math.cos(k * 0.785) * 17, py(0.62) + Math.sin(k * 0.785) * 17); p.lineTo(base + 100 + Math.cos(k * 0.785) * 25, py(0.62) + Math.sin(k * 0.785) * 25); } p.stroke();
        p.strokeRect(base - 40, py(0.3), 20, 20); p.beginPath(); p.moveTo(base - 43, py(0.3)); p.lineTo(base - 30, py(0.42)); p.lineTo(base - 17, py(0.3)); p.stroke();
      }
    }
    const wallpaper = new THREE.MeshStandardMaterial({ map: textureOf(paper), roughness: 0.95, side: THREE.DoubleSide });
    const plaster = flat(new THREE.Color('#b9bcc0').lerp(new THREE.Color('#8d8a82'), wear * 0.4), { side: THREE.DoubleSide });
    const beam = s.material('#4e4238', { roughness: 0.9 });
    const board = s.material('#6a5a49', { roughness: 0.9 });

    // ---- shell: gable, knee wall, sloped ceiling ------------------------------------------------
    const gable = new THREE.Shape();
    ([[-W / 2, 0], [W / 2, 0], [W / 2, KNEE], [0, RIDGE], [-W / 2, KNEE]] as const).forEach(([x, y], k) => (k ? gable.lineTo(x, y) : gable.moveTo(x, y)));
    const gableGeometry = new THREE.ShapeGeometry(gable);
    const guv = gableGeometry.attributes.uv, gpos = gableGeometry.attributes.position;
    for (let i = 0; i < guv.count; i++) guv.setXY(i, gpos.getX(i) / W + 0.5, gpos.getY(i) / RIDGE);
    s.mesh(gableGeometry, wallpaper, [0, 0, BACK]);
    const kneeGeometry = new THREE.PlaneGeometry(D, KNEE);
    const kuv = kneeGeometry.attributes.uv;
    for (let i = 0; i < kuv.count; i++) kuv.setXY(i, kuv.getX(i) * (D / W), kuv.getY(i) * (KNEE / RIDGE));
    s.mesh(kneeGeometry, wallpaper, [LEFT, KNEE / 2, 0]).rotation.y = Math.PI / 2;
    const SLOPE = THREE.MathUtils.degToRad(35), RUN = 3.1;
    const ceiling = s.mesh(new THREE.PlaneGeometry(D, RUN), plaster, [LEFT + Math.cos(SLOPE) * RUN / 2, KNEE + Math.sin(SLOPE) * RUN / 2, 0]);
    ceiling.rotation.set(0, Math.PI / 2, -(Math.PI / 2 - SLOPE), 'ZYX');
    for (const z of [-3.2, -1.6, 0, 1.6, 3.2]) s.box([RUN + 0.1, 0.13, 0.11], [LEFT + Math.cos(SLOPE) * RUN / 2 + 0.05, KNEE + Math.sin(SLOPE) * RUN / 2 - 0.07, z], beam).rotation.z = SLOPE;
    s.box([0.12, 0.12, D], [LEFT + 0.06, KNEE + 0.02, 0], beam);
    s.box([0.07, 0.16, D], [LEFT + 0.04, 0.08, 0], board);
    s.box([W, 0.16, 0.07], [0, 0.08, BACK + 0.04], board);
    for (const side of [-1, 1]) s.box([Math.hypot(W / 2, RIDGE - KNEE) + 0.2, 0.14, 0.12], [side * W / 4, (KNEE + RIDGE) / 2, BACK + 0.07], beam).rotation.z = -side * Math.atan2(RIDGE - KNEE, W / 2);
    // Strips of paper hanging off the wall where it has peeled.
    const curlPaper = flat(tone(era.paper), { side: THREE.DoubleSide });
    for (const [tx, ty] of tears.slice(0, 7)) {
      const x = tx / 1024 * W - W / 2, y = (512 - ty) / 512 * RIDGE;
      if (y < 0.4 || y > KNEE + (W / 2 - Math.abs(x)) * (RIDGE - KNEE) / (W / 2) - 0.3) continue;
      const strip = s.mesh(new THREE.CylinderGeometry(0.09, 0.09, mix(0.2, 0.42, random()), 8, 1, true, 0, Math.PI * 1.1), curlPaper, [x, y - 0.03, BACK + 0.09]);
      strip.rotation.z = Math.PI / 2;
    }

    // ---- the round window ---------------------------------------------------------------------
    const WY = 2.72, WR = 0.62;
    const pane = document.createElement('canvas');
    pane.width = pane.height = 256;
    const g = pane.getContext('2d')!;
    const sky = g.createRadialGradient(150, 96, 10, 128, 128, 170);
    if (a.window === 'full-moon') { sky.addColorStop(0, '#ffffff'); sky.addColorStop(0.3, '#dfe9ff'); sky.addColorStop(1, '#8fa6d0'); }
    else if (a.window === 'crescent') { sky.addColorStop(0, '#5a74b0'); sky.addColorStop(1, '#2b3b68'); }
    else { sky.addColorStop(0, '#8a96aa'); sky.addColorStop(1, '#4b566a'); }
    g.fillStyle = sky; g.fillRect(0, 0, 256, 256);
    if (a.window === 'full-moon') { g.fillStyle = '#fffdf2'; g.beginPath(); g.arc(150, 96, 44, 0, 7); g.fill(); g.fillStyle = 'rgba(190,200,220,0.5)'; for (const [mx, my, mr] of [[140, 84, 9], [164, 104, 7], [150, 116, 5]]) { g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill(); } }
    if (a.window === 'crescent') { g.fillStyle = '#f6f2dc'; g.beginPath(); g.arc(140, 100, 40, 0, 7); g.fill(); g.fillStyle = '#3d528a'; g.beginPath(); g.arc(158, 92, 36, 0, 7); g.fill(); g.fillStyle = '#e9edf8'; for (let k = 0; k < 14; k++) g.fillRect(random() * 256, random() * 256, 2.5, 2.5); }
    if (a.window === 'storm') { g.strokeStyle = 'rgba(220,230,245,0.7)'; g.lineWidth = 2; for (let k = 0; k < 46; k++) { const x = random() * 256, y = random() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 7, y + mix(14, 34, random())); g.stroke(); } }
    if (a.presence === 'child') { g.fillStyle = 'rgba(240,244,250,0.75)'; for (const [hx, hy] of [[84, 196], [124, 204]]) { g.beginPath(); g.ellipse(hx, hy, 11, 12, 0, 0, 7); g.fill(); for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(hx - 9 + k * 6, hy - 18, 2.8, 8, (k - 1.5) * 0.15, 0, 7); g.fill(); } } }
    const glassMap = textureOf(pane);
    const glass = new THREE.MeshStandardMaterial({ map: glassMap, emissive: '#ffffff', emissiveMap: glassMap, emissiveIntensity: { 'full-moon': 1.1, crescent: 0.8, storm: 0.55, boarded: 0.6 }[a.window], roughness: 0.2 });
    s.mesh(new THREE.CircleGeometry(WR, 40), glass, [0, WY, BACK + 0.02]);
    const sash = s.material(era.iron === '#23211f' ? '#3b3029' : '#d9d5c8', { roughness: 0.6 });
    s.ring(WR + 0.03, 0.075, [0, WY, BACK + 0.05], sash);
    s.box([WR * 2, 0.05, 0.05], [0, WY, BACK + 0.05], sash);
    s.box([0.05, WR * 2, 0.05], [0, WY, BACK + 0.05], sash);
    if (a.window === 'boarded') for (const [dy, turn] of [[0.36, 0.06], [0.02, -0.09], [-0.34, 0.04]]) s.box([WR * 2.5, 0.2, 0.04], [0, WY + dy, BACK + 0.11], board).rotation.z = turn;
    if (a.decade === '1940s') {
      const blackout = flat('#17181c', { side: THREE.DoubleSide, roughness: 1 });
      s.box([WR * 2.6, 0.05, 0.05], [0, WY + WR + 0.16, BACK + 0.1], beam);
      const drop = s.box([WR * 1.35, WR * 1.7, 0.03], [-WR * 0.62, WY + WR + 0.14 - WR * 0.85, BACK + 0.12], blackout);
      drop.rotation.z = 0.04;
    }
    // Moonlight on the floor: the window's shape, crossed by its glazing bars.
    const patch = document.createElement('canvas');
    patch.width = patch.height = 256;
    const m = patch.getContext('2d')!;
    const pool = m.createRadialGradient(128, 128, 20, 128, 128, 124);
    pool.addColorStop(0, 'rgba(232,240,255,1)'); pool.addColorStop(0.8, 'rgba(214,226,255,0.85)'); pool.addColorStop(1, 'rgba(214,226,255,0)');
    m.fillStyle = pool; m.beginPath(); m.arc(128, 128, 126, 0, 7); m.fill();
    m.globalCompositeOperation = 'destination-out';
    m.fillStyle = 'rgba(0,0,0,0.85)';
    m.fillRect(120, 0, 16, 256); m.fillRect(0, 120, 256, 16);
    if (a.window === 'boarded') for (const y of [10, 96, 180]) m.fillRect(0, y, 256, 62);
    if (a.decade === '1940s') m.fillRect(0, 0, 118, 256);
    const patchMap = textureOf(patch);
    const moonPatch = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: patchMap, emissive: '#cfdcff', emissiveMap: patchMap, emissiveIntensity: { 'full-moon': 0.9, crescent: 0.4, storm: 0.3, boarded: 0.6 }[a.window], transparent: true, opacity: { 'full-moon': 0.85, crescent: 0.5, storm: 0.4, boarded: 0.7 }[a.window], depthWrite: false }));
    moonPatch.rotation.x = -Math.PI / 2;
    moonPatch.position.set(SLOTS[0][0], 0.03, SLOTS[0][1] + 0.1);
    moonPatch.scale.set(2.5, 3.3, 1);
    root.add(moonPatch);
    const shaftFrom = new THREE.Vector3(0, WY, BACK + 0.1), shaftTo = new THREE.Vector3(SLOTS[0][0], 0.05, SLOTS[0][1] + 0.1);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(WR * 0.95, 1.35, shaftFrom.distanceTo(shaftTo), 24, 1, true), new THREE.MeshBasicMaterial({ color: '#dfe8ff', transparent: true, opacity: { 'full-moon': 0.1, crescent: 0.045, storm: 0.03, boarded: 0.05 }[a.window], depthWrite: false, side: THREE.DoubleSide }));
    shaft.position.copy(shaftFrom).add(shaftTo).multiplyScalar(0.5);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shaftFrom.clone().sub(shaftTo).normalize());
    root.add(shaft);
    const motes: { at: Point; size: number }[] = [];
    for (let i = 0; i < mix(10, 60, mood.energy * 0.5 + wear * 0.5); i++) { const t = random(), spread = mix(0.5, 1.2, 1 - t); motes.push({ at: [mix(shaftTo.x, shaftFrom.x, t) + (random() - 0.5) * spread, mix(shaftTo.y, shaftFrom.y, t) + (random() - 0.5) * 0.5, mix(shaftTo.z, shaftFrom.z, t) + (random() - 0.5) * spread], size: mix(0.008, 0.02, random()) }); }
    const dust = s.scatter(new THREE.SphereGeometry(1, 5, 4), new THREE.MeshStandardMaterial({ color: '#f4f6ff', emissive: '#dfe8ff', emissiveIntensity: 1 }), motes);
    dust.castShadow = false;

    // ---- floorboards, dust and tracks ---------------------------------------------------------
    const floor = document.createElement('canvas');
    floor.width = W * PPM; floor.height = D * PPM;
    const fl = floor.getContext('2d')!;
    const fx = (x: number) => (x + W / 2) * PPM, fz = (z: number) => (z + D / 2) * PPM;
    for (let x = 0; x < floor.width; x += 24) {
      const shade = mix(0.82, 1.08, random());
      fl.fillStyle = new THREE.Color('#77695a').multiplyScalar(shade).lerp(new THREE.Color('#8a8f98'), dusty ? 0.42 : tidy ? 0 : 0.18).getStyle();
      fl.fillRect(x, 0, 24, floor.height);
      fl.fillStyle = 'rgba(30,24,20,0.7)'; fl.fillRect(x, 0, 2, floor.height);
      for (let k = 0; k < 3; k++) fl.fillRect(x, random() * floor.height, 24, 2);
    }
    if (tidy) { const shine = fl.createLinearGradient(0, 0, floor.width, floor.height); shine.addColorStop(0, 'rgba(255,255,255,0)'); shine.addColorStop(0.5, 'rgba(230,236,255,0.16)'); shine.addColorStop(1, 'rgba(255,255,255,0)'); fl.fillStyle = shine; fl.fillRect(0, 0, floor.width, floor.height); }
    const clean = 'rgba(52,42,34,0.6)';
    if (dusty || a.presence === 'child' || a.presence === 'pretender') {
      const from: [number, number] = [-2.2, -1.6], to: [number, number] = [SLOTS[0][0] - 0.5, SLOTS[0][1] - 0.2];
      const steps = 11, heading = Math.atan2(to[1] - from[1], to[0] - from[0]);
      for (let k = 0; k < steps; k++) {
        const t = k / (steps - 1), side = k % 2 ? 1 : -1;
        const x = fx(mix(from[0], to[0], t) - Math.sin(heading) * side * 0.09), z = fz(mix(from[1], to[1], t) + Math.cos(heading) * side * 0.09);
        fl.save(); fl.translate(x, z); fl.rotate(heading + Math.PI / 2 + side * 0.15);
        fl.fillStyle = clean;
        const long = a.presence === 'pretender' ? 2.1 : 1;
        fl.beginPath(); fl.ellipse(0, 0, 6, 12 * long, 0, 0, 7); fl.fill();
        for (let toe = 0; toe < (a.presence === 'pretender' ? 3 : 5); toe++) { fl.beginPath(); fl.ellipse((toe - (a.presence === 'pretender' ? 1 : 2)) * (a.presence === 'pretender' ? 5 : 3), -14 * long - (a.presence === 'pretender' ? 6 : 0), a.presence === 'pretender' ? 1.8 : 1.8, a.presence === 'pretender' ? 8 : 2.4, 0, 0, 7); fl.fill(); }
        fl.restore();
      }
    }
    const BALL_Z = 2.75, BALL_X: [number, number] = [-3.3, -1.6];
    if (a.moves === 'ball') { fl.strokeStyle = clean; fl.lineWidth = 16; fl.lineCap = 'round'; fl.beginPath(); fl.moveTo(fx(BALL_X[0]), fz(BALL_Z)); fl.lineTo(fx(BALL_X[1]), fz(BALL_Z)); fl.stroke(); }
    for (let i = 0; i < mix(1, 7, wear); i++) { const x = random() * floor.width, z = random() * floor.height, r = mix(30, 90, random()); const stain = fl.createRadialGradient(x, z, r * 0.3, x, z, r); stain.addColorStop(0, 'rgba(40,34,30,0.1)'); stain.addColorStop(0.85, 'rgba(40,34,30,0.16)'); stain.addColorStop(1, 'rgba(40,34,30,0)'); fl.fillStyle = stain; fl.fillRect(x - r, z - r, r * 2, r * 2); }
    const ground = world.ground as THREE.Mesh;
    (ground.material as THREE.Material).dispose();
    const top = new THREE.MeshStandardMaterial({ map: textureOf(floor), roughness: tidy ? 0.45 : 0.92 });
    const edge = flat('#4b4239');
    ground.material = [edge, edge, top, edge, edge, edge];

    // ---- rug ----------------------------------------------------------------------------------
    const rugTones = ['#7a3d3a', '#c9b88f', '#3f5a6b', '#a98250', '#5b6b4a'].map((hex) => new THREE.Color(hex).lerp(new THREE.Color('#8b8f96'), 0.25 + wear * 0.3).getStyle());
    if (a.state === 'half-packed') {
      const roll = s.cylinder(0.19, 0.19, 2.6, [-0.3, 0.19, 3.15], flat(rugTones[0]), 18);
      roll.rotation.z = Math.PI / 2; roll.rotation.y = 0.06;
      for (const x of [-1.3, 0.7]) s.ring(0.2, 0.012, [x, 0.19, 3.15], flat('#c9bfa6')).rotation.y = Math.PI / 2;
    } else {
      const braid = document.createElement('canvas');
      braid.width = braid.height = 256;
      const b = braid.getContext('2d')!;
      for (let k = 0; k < 13; k++) { b.fillStyle = rugTones[k % rugTones.length]; b.beginPath(); b.arc(128, 128, 128 - k * 10, 0, 7); b.fill(); }
      const rug = s.mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshStandardMaterial({ map: textureOf(braid), roughness: 1 }), [0.35, 0.014, 1.05]);
      rug.rotation.set(-Math.PI / 2, 0, 0.12);
      rug.scale.set(2.5, 1.75, 1);
      rug.castShadow = false;
    }

    // ---- iron cot -------------------------------------------------------------------------------
    const iron = s.material(era.iron, { metalness: 0.45, roughness: 0.5 });
    const brass = s.material('#b9954a', { metalness: 0.85, roughness: 0.3 });
    const linen = flat(new THREE.Color('#e6e3d8').lerp(new THREE.Color('#9d9a90'), wear * 0.5 + (dusty ? 0.15 : 0)));
    const CX = -2.45, CZ = -2.5, CL = 1.6, CW2 = 0.82, BEDY = 0.52;
    for (const end of [-1, 1]) {
      const x = CX + end * CL / 2, tall = end < 0 ? 1.32 : 1.08;
      for (const z of [-1, 1]) { s.rod([x, 0.05, CZ + z * CW2 / 2], [x, tall, CZ + z * CW2 / 2], 0.024, iron); s.ball([0.045, 0.045, 0.045], [x, tall + 0.04, CZ + z * CW2 / 2], brass, 10); s.cylinder(0.035, 0.035, 0.03, [x, 0.035, CZ + z * CW2 / 2], flat('#1c1a19'), 10).rotation.x = Math.PI / 2; }
      s.tube([[x, tall - 0.08, CZ - CW2 / 2], [x, tall + 0.1, CZ], [x, tall - 0.08, CZ + CW2 / 2]], 0.018, iron);
      s.rod([x, BEDY - 0.08, CZ - CW2 / 2], [x, BEDY - 0.08, CZ + CW2 / 2], 0.016, iron);
      for (let k = -2; k <= 2; k++) s.rod([x, BEDY - 0.08, CZ + k * 0.13], [x, tall + 0.07 - Math.abs(k) * 0.07, CZ + k * 0.13], 0.009, iron);
    }
    for (const z of [-1, 1]) {
      s.rod([CX - CL / 2, BEDY - 0.08, CZ + z * CW2 / 2], [CX + CL / 2, BEDY - 0.08, CZ + z * CW2 / 2], 0.018, iron);
      const railY = z > 0 && a.cot === 'rumpled' ? BEDY + 0.12 : BEDY + 0.48;
      s.rod([CX - CL / 2, railY, CZ + z * CW2 / 2], [CX + CL / 2, railY, CZ + z * CW2 / 2], 0.014, iron);
      for (let k = 1; k < 10; k++) s.rod([CX - CL / 2 + k * CL / 10, railY - 0.42, CZ + z * CW2 / 2], [CX - CL / 2 + k * CL / 10, railY, CZ + z * CW2 / 2], 0.007, iron);
    }
    if (a.cot === 'stripped') {
      for (let k = 0; k <= 8; k++) s.rod([CX - CL / 2, BEDY - 0.07, CZ - CW2 / 2 + k * CW2 / 8], [CX + CL / 2, BEDY - 0.07, CZ - CW2 / 2 + k * CW2 / 8], 0.006, flat('#7a756c', { metalness: 0.6 }));
      for (let k = 0; k <= 10; k++) s.rod([CX - CL / 2 + k * CL / 10, BEDY - 0.065, CZ - CW2 / 2], [CX - CL / 2 + k * CL / 10, BEDY - 0.065, CZ + CW2 / 2], 0.006, flat('#7a756c', { metalness: 0.6 }));
      const rolled = s.cylinder(0.15, 0.15, CW2 - 0.1, [CX + CL / 2 - 0.2, BEDY + 0.1, CZ], flat('#a9a08a'), 14);
      rolled.rotation.x = Math.PI / 2;
    } else {
      s.box([CL - 0.06, 0.13, CW2 - 0.06], [CX, BEDY, CZ], flat('#cfc8b4'));
      const blanket = flat(new THREE.Color(a.decade === '1970s' ? '#b8642c' : a.decade === '1940s' ? '#6f745e' : a.decade === '1920s' ? '#8fa7c2' : '#7a3b3e').lerp(new THREE.Color('#8c9098'), 0.2 + wear * 0.3));
      s.ball([0.2, 0.07, 0.26], [CX - CL / 2 + 0.26, BEDY + 0.1, CZ], linen, 14);
      if (a.cot === 'made') { s.box([CL * 0.62, 0.05, CW2 - 0.04], [CX + CL * 0.16, BEDY + 0.085, CZ], blanket); s.box([0.16, 0.03, CW2 - 0.04], [CX - CL * 0.13, BEDY + 0.1, CZ], linen); }
      if (a.cot === 'rumpled') { for (let k = 0; k < 7; k++) s.ball([mix(0.16, 0.3, random()), mix(0.06, 0.13, random()), mix(0.14, 0.26, random())], [CX + mix(0.05, 0.62, random()), BEDY + 0.1, CZ + mix(-0.22, 0.3, random())], blanket, 12); s.ball([0.3, 0.05, 0.2], [CX + 0.4, BEDY + 0.02, CZ + CW2 / 2 + 0.06], blanket, 12).rotation.x = 0.9; s.ball([0.13, 0.03, 0.1], [CX - CL / 2 + 0.26, BEDY + 0.16, CZ], flat('#b8b4a8'), 10); }
      if (a.cot === 'shape') { s.box([CL - 0.08, 0.04, CW2 - 0.04], [CX, BEDY + 0.08, CZ], linen); s.ball([0.5, 0.15, 0.2], [CX + 0.1, BEDY + 0.1, CZ], linen, 16); s.ball([0.14, 0.14, 0.14], [CX - CL / 2 + 0.3, BEDY + 0.13, CZ], linen, 14); s.ball([0.1, 0.1, 0.12], [CX + 0.56, BEDY + 0.12, CZ], linen, 12); }
    }

    // ---- night-light on its little table -------------------------------------------------------
    const NX = -1.25, NZ = -2.85;
    s.cylinder(0.3, 0.3, 0.04, [NX, 0.62, NZ], board, 18);
    s.cylinder(0.035, 0.05, 0.6, [NX, 0.3, NZ], board, 10);
    for (let k = 0; k < 3; k++) s.rod([NX, 0.12, NZ], [NX + Math.cos(k * 2.09) * 0.24, 0.02, NZ + Math.sin(k * 2.09) * 0.24], 0.022, board);
    const warm = new THREE.Color().setHSL(mix(0.11, 0.06, mood.warmth), 0.95, 0.62);
    const lampPower = mix(0.7, 1.6, mood.warmth);
    const flame = new THREE.MeshStandardMaterial({ color: warm, emissive: warm, emissiveIntensity: 2.2 * lampPower, roughness: 0.5 });
    if (a.decade === '1970s') { s.cylinder(0.05, 0.08, 0.16, [NX, 0.72, NZ], flat('#e9e2d0'), 14); const cap = s.ball([0.17, 0.11, 0.17], [NX, 0.84, NZ], flame, 16); cap.castShadow = false; }
    else if (a.decade === '1940s') { s.cylinder(0.07, 0.09, 0.03, [NX, 0.655, NZ], iron, 14); s.cylinder(0.012, 0.012, 0.2, [NX, 0.76, NZ], iron, 8); const shade = s.cylinder(0.07, 0.14, 0.14, [NX, 0.9, NZ], flame, 16); shade.castShadow = false; }
    else { s.lathe([[0.001, 0], [0.085, 0], [0.09, 0.03], [0.05, 0.06], [0.03, 0.1], [0.045, 0.12]], brass, [NX, 0.64, NZ]); const chimney = s.lathe([[0.04, 0], [0.06, 0.05], [0.055, 0.12], [0.03, 0.2], [0.03, 0.26]], flame, [NX, 0.76, NZ]); chimney.castShadow = false; }
    const lamp = new THREE.PointLight(warm, 5 * lampPower, 6, 1.7);
    lamp.position.set(NX + 0.1, 1.05, NZ + 0.2);
    root.add(lamp);

    // ---- toy chest ----------------------------------------------------------------------------
    const toyColours = ['#b5392f', '#d2a53a', '#3f6f9a', '#4f8a5b', '#e6dfc8', '#7a4a8a'].map((hex) => new THREE.Color(hex).lerp(new THREE.Color('#8b9099'), 0.22 + wear * 0.35 - mood.cheer * 0.12));
    const toy = (k: number) => flat(toyColours[k % toyColours.length], { roughness: 0.6 });
    const chest = group([2.75, 0, -2.85]);
    const chestPaint = s.material(a.decade === '1920s' ? '#8fa7c2' : a.decade === '1970s' ? '#c9702c' : a.decade === '1940s' ? '#6d7459' : '#5b3b2c', { roughness: 0.7 });
    const tipped = a.state === 'ransacked';
    for (const [size, at] of [[[1.2, 0.05, 0.6], [0, 0.03, 0]], [[1.2, 0.5, 0.05], [0, 0.28, 0.275]], [[1.2, 0.5, 0.05], [0, 0.28, -0.275]], [[0.05, 0.5, 0.6], [0.575, 0.28, 0]], [[0.05, 0.5, 0.6], [-0.575, 0.28, 0]]] as [Point, Point][]) into(chest, s.box(size, [2.75 + at[0], at[1], -2.85 + at[2]], chestPaint));
    for (const x of [-0.45, 0.45]) into(chest, s.box([0.06, 0.52, 0.62], [2.75 + x, 0.28, -2.85], brass));
    into(chest, s.box([1.1, 0.42, 0.5], [2.75, 0.27, -2.85], flat('#191513')));
    const lid = group([2.75, 0.54, -2.85 - 0.3]);
    chest.attach(lid);
    into(lid, s.box([1.24, 0.06, 0.64], [2.75, 0.57, -2.85], chestPaint));
    const lidRest = tipped ? -1.9 : a.moves === 'chest-lid' ? -0.28 : a.presence === 'child' || a.presence === 'pretender' ? -0.5 : tidy ? 0 : -1.25;
    lid.rotation.x = lidRest;
    if (lidRest < -0.2 && !tipped) { into(chest, s.ball([0.17, 0.17, 0.17], [2.45, 0.52, -2.85], toy(0), 14)); into(chest, s.box([0.2, 0.2, 0.2], [3.0, 0.52, -2.8], toy(2))).rotation.y = 0.5; into(chest, s.ball([0.1, 0.1, 0.08], [2.8, 0.6, -2.95], flat('#9a6a34'), 10)); }
    if (tipped) { chest.rotation.x = Math.PI / 2 - 0.05; chest.position.set(2.75, 0.3, -2.75); }
    const eyes: Point[] = [];

    // ---- rocking chair, under its sheet unless something is using it ----------------------------
    const shroud = (w: number, h: number, d: number, at: Point, lumps = 5) => {
      const geometry = new THREE.LatheGeometry([[0.001, 1], [0.35, 0.98], [0.62, 0.9], [0.78, 0.72], [0.86, 0.45], [1, 0.12], [1.18, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
      const position = geometry.attributes.position, phase = random() * 6;
      for (let i = 0; i < position.count; i++) { const y = position.getY(i), angle = Math.atan2(position.getZ(i), position.getX(i)); const fold = 1 + Math.sin(angle * lumps + phase) * 0.1 * (1 - y) + Math.sin(angle * 2 + phase) * 0.12; position.setX(i, position.getX(i) * fold); position.setZ(i, position.getZ(i) * fold); }
      geometry.computeVertexNormals();
      const mesh = s.mesh(geometry, linen, at);
      mesh.scale.set(w, h, d);
      return mesh;
    };
    const chairUsed = a.moves === 'rocking-chair' || a.presence === 'nanny';
    const CHX = 3.25, CHZ = -0.75;
    const rocker = group([CHX, 0, CHZ]);
    if (chairUsed) {
      const chairWood = s.material('#5a4131', { roughness: 0.6 });
      const part = (mesh: THREE.Mesh) => into(rocker, mesh);
      part(s.box([0.56, 0.05, 0.52], [CHX, 0.46, CHZ], chairWood));
      for (const x of [-1, 1]) {
        part(s.rod([CHX + x * 0.25, 0.08, CHZ + 0.22], [CHX + x * 0.25, 0.7, CHZ + 0.22], 0.022, chairWood));
        part(s.rod([CHX + x * 0.25, 0.08, CHZ - 0.22], [CHX + x * 0.27, 1.32, CHZ - 0.34], 0.024, chairWood));
        part(s.box([0.05, 0.035, 0.52], [CHX + x * 0.27, 0.7, CHZ], chairWood));
        const arc: Point[] = [];
        for (let k = 0; k <= 8; k++) { const t = mix(-0.5, 0.56, k / 8); arc.push([CHX + x * 0.25, 0.03 + (1 - Math.cos(t)) * 1.1, CHZ + Math.sin(t) * 1.1]); }
        part(s.tube(arc, 0.022, chairWood));
      }
      for (let k = -2; k <= 2; k++) part(s.rod([CHX + k * 0.1, 0.48, CHZ - 0.23], [CHX + k * 0.105, 1.26, CHZ - 0.33], 0.012, chairWood));
      part(s.box([0.62, 0.09, 0.04], [CHX, 1.3, CHZ - 0.34], chairWood)).rotation.x = -0.14;
      part(s.box([0.5, 0.05, 0.46], [CHX, 0.5, CHZ], flat(rugTones[2])));
      rocker.rotation.y = -Math.PI / 2 + 0.5;
      if (a.moves === 'rocking-chair') { const fallen = s.ball([0.55, 0.06, 0.42], [CHX - 0.25, 0.05, CHZ + 0.95], linen, 16); fallen.rotation.y = 0.4; for (let k = 0; k < 4; k++) s.ball([0.2, 0.09, 0.16], [CHX - 0.25 + (random() - 0.5) * 0.6, 0.08, CHZ + 0.95 + (random() - 0.5) * 0.4], linen, 10); }
      if (a.presence === 'nanny') {
        s.cylinder(0.2, 0.15, 0.2, [CHX - 0.6, 0.1, CHZ + 0.75], flat('#a98a58'), 14);
        for (let k = 0; k < 3; k++) s.ball([0.09, 0.09, 0.09], [CHX - 0.6 + (k - 1) * 0.1, 0.24, CHZ + 0.75 + (k % 2) * 0.06], flat(['#7a3b3e', '#3f5a6b', '#c9b88f'][k]), 10);
        s.rod([CHX - 0.7, 0.22, CHZ + 0.7], [CHX - 0.42, 0.5, CHZ + 0.86], 0.008, flat('#d9d5c8', { metalness: 0.6 }));
        s.rod([CHX - 0.5, 0.22, CHZ + 0.68], [CHX - 0.74, 0.52, CHZ + 0.8], 0.008, flat('#d9d5c8', { metalness: 0.6 }));
        // Her cap and apron on a hook.
        s.box([0.5, 0.06, 0.04], [2.2, 1.72, BACK + 0.06], board);
        s.box([0.4, 0.95, 0.03], [2.2, 1.2, BACK + 0.09], flat('#e9e6dc'));
        s.ball([0.14, 0.1, 0.06], [2.2, 1.78, BACK + 0.1], flat('#f1eee4'), 12);
      }
    } else shroud(0.5, 1.3, 0.55, [CHX, 0, CHZ]);

    // ---- what the decade left behind -----------------------------------------------------------
    if (a.decade === '1890s') {
      const hoop = s.ring(0.42, 0.014, [-3.72, 0.44, 1.5], board); hoop.rotation.set(0, Math.PI / 2, 0); hoop.rotation.z = 0.2;
      s.rod([-3.7, 0.02, 2.2], [-3.82, 0.75, 2.05], 0.012, board);
      s.box([0.34, 0.26, 0.02], [0.75, 0.15, BACK + 0.14], flat('#2b2d30')).rotation.x = -0.25;
    }
    if (a.decade === '1920s') {
      const dx = -3.3, dz = 1.7;
      s.cylinder(0.22, 0.22, 0.22, [dx, 0.11, dz], toy(0), 20);
      for (const y of [0.01, 0.21]) s.cylinder(0.235, 0.235, 0.025, [dx, y + 0.01, dz], toy(1), 20);
      for (let k = 0; k < 8; k++) { const angle = k * 0.785; s.rod([dx + Math.cos(angle) * 0.225, 0.03, dz + Math.sin(angle) * 0.225], [dx + Math.cos(angle + 0.39) * 0.225, 0.2, dz + Math.sin(angle + 0.39) * 0.225], 0.005, flat('#e6dfc8')); }
      for (const side of [-1, 1]) s.rod([dx + side * 0.05, 0.245, dz - 0.1], [dx + side * 0.2, 0.26, dz + 0.24], 0.01, board);
    }
    if (a.decade === '1940s') {
      const cx = 0.85, cz = BACK + 0.42;
      s.box([0.62, 0.4, 0.2], [cx, 0.2, cz], flat('#6b4f36')).rotation.y = 0.08;
      s.ring(0.06, 0.01, [cx, 0.43, cz], flat('#2a221c'), Math.PI);
      s.label('E. HOLT · 114', 0.24, 0.1, [cx - 0.08, 0.24, cz + 0.105], '#2a221c', '#d9c9a0').rotation.set(0, 0.08, -0.05);
      s.box([0.2, 0.2, 0.14], [CX + CL / 2 + 0.02, 0.9, CZ + CW2 / 2 + 0.09], flat('#a58b5e'));
      s.rod([CX + CL / 2, 1.1, CZ + CW2 / 2], [CX + CL / 2 + 0.02, 0.98, CZ + CW2 / 2 + 0.09], 0.006, flat('#d9d2c0'));
    }
    if (a.decade === '1970s') {
      const hx = -3.2, hz = 1.75;
      const hopper = s.ball([0.34, 0.31, 0.34], [hx, 0.31, hz], flat(new THREE.Color('#d9621c').lerp(new THREE.Color('#8b9099'), wear * 0.3), { roughness: 0.4 }), 20);
      hopper.rotation.y = 0.9;
      for (const side of [-1, 1]) { s.tube([[hx + side * 0.1, 0.58, hz], [hx + side * 0.17, 0.76, hz + 0.02], [hx + side * 0.12, 0.85, hz + 0.03]], 0.024, flat('#c9571a', { roughness: 0.4 })); s.ball([0.03, 0.045, 0.02], [hx + 0.28 + side * 0.0, 0.4, hz + side * 0.11], flat('#18130f'), 8); }
    }

    // ---- clutter, by state ----------------------------------------------------------------------
    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    const blocks: { at: Point; size: number; color: THREE.Color }[] = [];
    const blockCount = Math.round(mix(4, 16, mood.density));
    if (tidy) {
      // Lined up along the back wall, smallest to largest, every face turned to the room.
      let x = -0.7;
      for (let k = 0; k < Math.min(blockCount, 7); k++) { const size = 0.1 + k * 0.022; blocks.push({ at: [x, size / 2, BACK + 0.4], size, color: toyColours[k % 6] }); x += size + 0.07; }
      s.ball([0.16, 0.16, 0.16], [x + 0.12, 0.16, BACK + 0.4], toy(0), 14);
      s.ball([0.21, 0.21, 0.21], [x + 0.55, 0.21, BACK + 0.4], toy(2), 14);
      for (let k = 0; k < 5; k++) blocks.push({ at: [-3.3, 0.07 + k * 0.14, 2.6], size: 0.14, color: toyColours[(k + 2) % 6] });
    } else {
      const spill = a.state === 'ransacked';
      let placed = 0;
      for (let tries = 0; placed < blockCount + (spill ? 8 : 0) && tries < 200; tries++) {
        const x = spill ? mix(0.6, 3.6, random()) : mix(-3.5, 3.6, random()), z = spill ? mix(-2.9, -0.2, random()) : mix(-2.9, 3.2, random());
        if (!clear(x, z, 1.3) || (Math.abs(x - CX) < 1.0 && Math.abs(z - CZ) < 0.6)) continue;
        const size = mix(0.1, 0.16, random());
        blocks.push({ at: [x, size / 2, z], size, color: toyColours[placed % 6] });
        placed++;
      }
      if (spill) { for (let k = 0; k < 4; k++) { const x = mix(1.2, 3.5, random()), z = mix(-2.4, -1.9, random()); s.ball([0.13 + k * 0.02, 0.13 + k * 0.02, 0.13 + k * 0.02], [x, 0.13 + k * 0.02, z], toy(k + 1), 12); } const stool = s.cylinder(0.2, 0.2, 0.04, [-0.9, 0.2, 2.95], board, 14); stool.rotation.z = Math.PI / 2; for (let k = 0; k < 3; k++) s.rod([-0.9, 0.2 + Math.cos(k * 2.09) * 0.14, 2.95 + Math.sin(k * 2.09) * 0.14], [-0.5, 0.2 + Math.cos(k * 2.09) * 0.2, 2.95 + Math.sin(k * 2.09) * 0.2], 0.018, board); }
    }
    if (blocks.length) {
      const pile = new THREE.InstancedMesh(blockGeometry, new THREE.MeshStandardMaterial({ roughness: 0.65 }), blocks.length);
      const matrix = new THREE.Matrix4(), spin = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      blocks.forEach((block, k) => { spin.setFromAxisAngle(up, tidy ? 0 : random() * 3); matrix.compose(new THREE.Vector3(...block.at), spin, new THREE.Vector3(block.size, block.size, block.size)); pile.setMatrixAt(k, matrix); pile.setColorAt(k, block.color); });
      pile.castShadow = pile.receiveShadow = true;
      root.add(pile);
    }
    if (dusty || a.state === 'half-packed') {
      shroud(0.42, 1.75, 0.3, [-3.35, 0, -0.6], 4);
      shroud(0.7, 0.7, 0.45, [-3.2, 0, 0.55], 6);
      if (dusty) shroud(0.36, 1.0, 0.36, [3.5, 0, 2.9], 5);
    }
    if (a.state === 'half-packed') {
      const crate = s.material('#a58f6a', { roughness: 0.95 });
      for (const [x, y, z, size] of [[2.9, 0.3, 3.0, 0.6], [3.45, 0.26, 2.5, 0.52], [3.0, 0.83, 2.95, 0.46]] as const) {
        s.box([size, size, size], [x, y, z], crate).rotation.y = (random() - 0.5) * 0.3;
        s.box([size + 0.02, 0.035, size + 0.02], [x, y + size / 2 - 0.02, z], brass);
      }
      s.box([0.9, 0.45, 0.5], [-2.9, 0.23, 3.0], flat('#4a3324')).rotation.y = 0.2;
      for (const x of [-0.3, 0.3]) s.box([0.05, 0.47, 0.52], [-2.9 + x, 0.23, 3.0 + x * 0.2], flat('#2a1f18')).rotation.y = 0.2;
      for (let k = 0; k < 4; k++) s.ball([0.14, 0.11, 0.12], [2.2 + (random() - 0.5) * 0.5, 0.1, 3.15 + (random() - 0.5) * 0.2], flat('#c9c2ad'), 8);
    }
    if (dusty || (!tidy && wear > 0.55)) {
      const web = document.createElement('canvas');
      web.width = web.height = 128;
      const w2 = web.getContext('2d')!;
      w2.strokeStyle = 'rgba(236,240,246,0.9)'; w2.lineWidth = 1.4;
      for (let k = 0; k <= 6; k++) { const angle = k / 6 * Math.PI / 2; w2.beginPath(); w2.moveTo(0, 0); w2.lineTo(Math.cos(angle) * 128, Math.sin(angle) * 128); w2.stroke(); }
      for (let ring = 1; ring <= 6; ring++) { w2.beginPath(); for (let k = 0; k <= 6; k++) { const angle = k / 6 * Math.PI / 2, r = ring * 19 * (k % 2 ? 0.93 : 1); w2.lineTo(Math.cos(angle) * r, Math.sin(angle) * r); } w2.stroke(); }
      const webMaterial = new THREE.MeshBasicMaterial({ map: textureOf(web), transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide });
      const hang = (at: Point, size: number, rx: number, ry: number, rz: number) => { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), webMaterial); mesh.position.set(...at); mesh.rotation.set(rx, ry, rz); root.add(mesh); };
      hang([LEFT + 0.55, KNEE - 0.35, BACK + 0.06], 1.1, 0, 0, 0);
      hang([CX - CL / 2 + 0.3, 1.02, CZ - CW2 / 2 + 0.02], 0.6, 0, 0, -Math.PI / 2);
      hang([W / 2 - 0.5, KNEE - 0.4, BACK + 0.06], 1.0, 0, 0, Math.PI / 2);
      hang([LEFT + 0.06, KNEE - 0.45, 2.9], 0.9, 0, Math.PI / 2, 0);
      hang([-0.45, WY + 0.25, BACK + 0.15], 0.7, 0, 0, Math.PI);
    }

    // ---- whoever is still here ------------------------------------------------------------------
    if (a.presence !== 'no-one') {
      const shade = document.createElement('canvas');
      shade.width = 256; shade.height = 512;
      const h = shade.getContext('2d')!;
      h.fillStyle = 'rgba(14,16,26,1)'; h.strokeStyle = 'rgba(14,16,26,1)'; h.lineCap = 'round';
      if (a.presence === 'child') {
        h.beginPath(); h.arc(120, 250, 34, 0, 7); h.fill();
        h.beginPath(); h.moveTo(100, 280); h.lineTo(140, 280); h.lineTo(178, 440); h.lineTo(62, 440); h.fill();
        h.fillRect(96, 440, 16, 72); h.fillRect(128, 440, 16, 72);
        h.lineWidth = 13; h.beginPath(); h.moveTo(136, 300); h.lineTo(196, 250); h.stroke(); h.beginPath(); h.moveTo(104, 300); h.lineTo(70, 370); h.stroke();
        h.lineWidth = 3; h.beginPath(); h.moveTo(196, 250); h.lineTo(206, 120); h.stroke();
        h.beginPath(); h.ellipse(208, 82, 32, 40, 0, 0, 7); h.fill();
      }
      if (a.presence === 'nanny') {
        h.beginPath(); h.arc(128, 70, 36, 0, 7); h.fill(); h.beginPath(); h.arc(150, 38, 20, 0, 7); h.fill();
        h.beginPath(); h.moveTo(82, 112); h.lineTo(174, 112); h.lineTo(196, 250); h.lineTo(232, 512); h.lineTo(24, 512); h.lineTo(60, 250); h.fill();
        h.lineWidth = 22; h.beginPath(); h.moveTo(88, 130); h.lineTo(66, 240); h.lineTo(110, 270); h.stroke(); h.beginPath(); h.moveTo(170, 130); h.lineTo(190, 240); h.lineTo(146, 270); h.stroke();
      }
      if (a.presence === 'pretender') {
        h.beginPath(); h.ellipse(150, 60, 26, 40, 0.5, 0, 7); h.fill();
        h.lineWidth = 26; h.beginPath(); h.moveTo(140, 96); h.quadraticCurveTo(96, 250, 128, 512); h.stroke();
        h.lineWidth = 9;
        for (const [sx, ex, ey] of [[122, 30, 330], [140, 232, 300]] as const) {
          h.beginPath(); h.moveTo(sx, 130); h.quadraticCurveTo((sx + ex) / 2 + (ex < 128 ? -40 : 40), 190, ex, ey); h.stroke();
          h.lineWidth = 5;
          for (let k = 0; k < 7; k++) { h.beginPath(); h.moveTo(ex, ey); h.lineTo(ex + (k - 3) * 13, ey + 90 + Math.abs(k - 3) * -9); h.stroke(); }
          h.lineWidth = 9;
        }
        for (const [ex2, ey2] of [[140, 52], [160, 64]]) { h.globalCompositeOperation = 'destination-out'; h.beginPath(); h.arc(ex2, ey2, 5, 0, 7); h.fill(); h.globalCompositeOperation = 'source-over'; }
      }
      const tall = a.presence === 'child' ? 2.0 : a.presence === 'nanny' ? 2.7 : 3.0;
      const cast = new THREE.Mesh(new THREE.PlaneGeometry(tall / 2, tall), new THREE.MeshBasicMaterial({ map: textureOf(shade), transparent: true, opacity: mix(0.34, 0.5, 1 - mood.cheer), depthWrite: false }));
      cast.position.set(a.presence === 'pretender' ? 1.45 : 1.55, tall / 2 + 0.02, BACK + 0.03);
      root.add(cast);
    }
    if (a.presence === 'child') {
      const tx = -2.3, tz = 0.35, china = flat('#e9e6dc', { roughness: 0.3 });
      s.cylinder(0.3, 0.3, 0.02, [tx, 0.012, tz], flat(rugTones[1]), 20);
      s.lathe([[0.001, 0], [0.05, 0], [0.075, 0.05], [0.06, 0.1], [0.03, 0.12]], china, [tx, 0.022, tz]);
      s.rod([tx + 0.06, 0.07, tz], [tx + 0.13, 0.11, tz], 0.01, china);
      for (const side of [-1, 1]) { s.cylinder(0.035, 0.025, 0.04, [tx + side * 0.17, 0.045, tz + 0.12], china, 12); s.cylinder(0.055, 0.055, 0.008, [tx + side * 0.17, 0.026, tz + 0.12], china, 12); }
      s.ball([0.1, 0.12, 0.09], [tx - 0.42, 0.12, tz + 0.1], flat('#9a6a34'), 12); s.ball([0.075, 0.075, 0.07], [tx - 0.42, 0.28, tz + 0.1], flat('#9a6a34'), 12);
      for (const side of [-1, 1]) s.ball([0.03, 0.03, 0.015], [tx - 0.42 + side * 0.055, 0.345, tz + 0.1], flat('#9a6a34'), 8);
    }
    if (a.presence === 'pretender') eyes.push([CX - 0.35, 0.2, CZ + 0.1], [CX + 0.4, 0.26, CZ - 0.05], [LEFT + 0.45, 1.0, BACK + 0.4], [CHX + 0.1, 0.25, CHZ + 0.3]);
    if (a.presence === 'pretender' || a.moves === 'chest-lid') eyes.push([2.6, 0.5, -2.62]);
    const eyeGlow = new THREE.MeshStandardMaterial({ color: '#ffe9b0', emissive: a.presence === 'pretender' ? '#ffd24a' : '#ff5a2a', emissiveIntensity: 2.6 });
    if (eyes.length) { const pairs = eyes.flatMap(([x, y, z]) => [{ at: [x - 0.05, y, z] as Point, size: 0.022 }, { at: [x + 0.05, y, z] as Point, size: 0.022 }]); s.scatter(new THREE.SphereGeometry(1, 8, 6), eyeGlow, pairs).castShadow = false; }

    // ---- things that move -----------------------------------------------------------------------
    let ball: THREE.Mesh | null = null, spinTop: THREE.Group | null = null;
    if (a.moves === 'ball') {
      const stripes = document.createElement('canvas'); stripes.width = 64; stripes.height = 32;
      const c = stripes.getContext('2d')!;
      ['#b5392f', '#e6dfc8', '#3f6f9a', '#e6dfc8'].forEach((hex, k) => { c.fillStyle = hex; c.fillRect(k * 16, 0, 16, 32); });
      ball = s.mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshStandardMaterial({ map: textureOf(stripes), roughness: 0.45 }), [mix(BALL_X[0], BALL_X[1], 0.6), 0.2, BALL_Z]);
    }
    if (a.moves === 'top') {
      spinTop = group([2.9, 0, 0.55]);
      into(spinTop, s.lathe([[0.001, 0], [0.03, 0.05], [0.16, 0.16], [0.18, 0.2], [0.15, 0.25], [0.04, 0.3], [0.02, 0.31], [0.02, 0.44], [0.035, 0.46], [0.001, 0.47]], flat(toyColours[0], { metalness: 0.5, roughness: 0.3 }), [2.9, 0, 0.55]));
      for (const [y, r] of [[0.16, 0.162], [0.2, 0.182], [0.25, 0.152]]) into(spinTop, s.ring(r, 0.008, [2.9, y, 0.55], flat(toyColours[1], { metalness: 0.5, roughness: 0.3 }))).rotation.x = Math.PI / 2;
    }

    // ---- placing the cast -------------------------------------------------------------------------
    const settle = world.place.bind(world);
    world.place = (items) => {
      settle(items);
      // Toys keep their character but not their true size, so a doll's head and a rocking horse can share the rug.
      for (const item of items) {
        const natural = Math.max(item.height, item.radius * 2, 0.05);
        const shown = Math.min(1.15 * natural ** 0.4, 2.3) * (item.hero ? 1.2 : 1);
        item.holder.scale.setScalar(Math.min(shown / natural, 1.25 / Math.max(item.radius, 0.05)));
        item.holder.updateMatrixWorld(true);
      }
    };

    const energy = mood.energy, basePower = key.intensity, lampBase = lamp.intensity;
    world.update = (_dt, time) => {
      lamp.intensity = lampBase * (1 + Math.sin(time * 9) * 0.05 * energy + Math.sin(time * 23) * 0.04 * energy);
      if (a.window === 'storm') { const beat = (time * 0.31 + 0.5) % 1; key.intensity = basePower + (beat < 0.04 || (beat > 0.09 && beat < 0.11) ? 4.5 : 0); }
      if (a.moves === 'rocking-chair') rocker.rotation.z = Math.sin(time * mix(1.0, 2.4, energy)) * mix(0.05, 0.16, energy);
      if (ball) { const t = 0.5 + Math.sin(time * mix(0.3, 1.1, energy)) * 0.5; ball.position.x = mix(BALL_X[0] + 0.2, BALL_X[1] - 0.2, t); ball.rotation.z = -ball.position.x / 0.2; }
      if (spinTop) { spinTop.rotation.y = time * mix(6, 20, energy); spinTop.rotation.z = Math.sin(time * 1.3) * 0.07; }
      if (a.moves === 'chest-lid') lid.rotation.x = lidRest - Math.max(0, Math.sin(time * mix(0.6, 1.8, energy))) * 0.35;
      eyeGlow.emissiveIntensity = 2.2 + Math.sin(time * 2.3) * 0.6;
    };
    return world;
  },
});
