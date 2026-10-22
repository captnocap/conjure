import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, mix, visibleBounds } from '@conjure/kit';
import { type P3, ball, box, card, eye, eyeMaterial, furMaterial, group, limb, part, plaque, taper, woodMaterial } from './parts';

const WALL_W = 6.4, WALL_H = 4.3, BENCH_Y = 0.9, BENCH_X0 = -2.3, BENCH_X1 = 1.3, BENCH_D = 0.76;
/** Where the cast goes: on a bracket shelf on the wall, on the bench top, or on the floor. */
const SLOTS: { x: number; y: number; z: number; on: 'wall' | 'bench' | 'floor'; maxH: number; maxR: number }[] = [
  { x: 0.1, y: 1.3, z: 0, on: 'wall', maxH: 0.95, maxR: 0.5 },
  { x: -1.08, y: BENCH_Y, z: 0.42, on: 'bench', maxH: 0.58, maxR: 0.34 },
  { x: 1.02, y: 1.95, z: 0, on: 'wall', maxH: 0.62, maxR: 0.33 },
  { x: 1.5, y: 0, z: 1.1, on: 'floor', maxH: 1.05, maxR: 0.45 },
  { x: -0.8, y: 1.98, z: 0, on: 'wall', maxH: 0.6, maxR: 0.33 },
  { x: 0.88, y: BENCH_Y, z: 0.44, on: 'bench', maxH: 0.5, maxR: 0.3 },
];

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(...repeat); }
  return map;
}
const hex = (c: THREE.Color) => `#${c.getHexString()}`;

export default defineWorld({
  questions: {
    wall: choice('What is the back wall made of?', {
      pine: 'Honey-coloured knotty pine boards, varnished decades ago.',
      whitewash: 'Whitewashed boards gone grey at the seams.',
      barn: 'Dark creosoted barn boards, almost black-brown.',
      green: 'Tongue-and-groove painted institutional green, chipped.',
      paper: 'Faded striped wallpaper over plaster, peeling at the top.',
    }),
    window: choice('What shows in the one window?', {
      dusk: 'Deep blue late evening with a line of black trees.',
      night: 'Full night: black glass and the reflection of the bulb.',
      sunset: 'A low orange sunset behind bare trees.',
      snow: 'Grey afternoon snow coming down.',
      blind: 'Nothing: a yellowed roller blind pulled down.',
    }),
    trophies: choice('What crowds the wall above the work?', {
      antlers: 'Rows of antlers on shield plaques, every season accounted for.',
      fish: 'Mounted fish on ovals, bass and pike with mouths open.',
      menagerie: 'A mixed menagerie: antlers, fish, horned skulls and odd small heads.',
      waiting: 'Mostly empty plaques with brass plates, waiting for their animals.',
      prizes: 'Prize rosettes and framed certificates between the mounts.',
    }),
    bench: choice('What state is the bench in?', {
      tidy: 'Tidy: tools laid parallel, jars in a row, a folded cloth.',
      midjob: 'Mid-job chaos: clay, open jars, pins, wire offcuts and a foam form.',
      dustsheet: 'Abandoned: a dust sheet drawn over whatever was being worked on.',
      lunch: 'Paused for supper: a thermos, a lunch pail and a radio among the tools.',
    }),
    sign: choice('What hand-painted sign hangs high on the wall?', {
      none: 'There is no sign.',
      stuff: 'YOU SNUFF EM, WE STUFF EM.',
      credit: 'NO CREDIT. NO REFUNDS. NO EXCEPTIONS.',
      pets: 'PETS PRESERVED WITH DIGNITY.',
      closed: 'CLOSED FOR DEER SEASON.',
    }),
    floor: choice('What is the floor?', {
      boards: 'Worn floorboards with sawdust in the cracks.',
      concrete: 'Bare poured concrete with a drain.',
      lino: 'Checkerboard linoleum, curling at the edges.',
    }),
    company: choice('Who or what keeps the taxidermist company?', {
      nobody: 'Nobody: just an empty stool.',
      owl: 'A stuffed owl on a tall perch, watching the work.',
      cat: 'A live cat asleep on the stool, unbothered by the audience.',
      apron: 'An apron and cap left on the stool: stepped out for a moment.',
      bear: 'A moth-eaten bear cub mount standing in the corner with a tray.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const s = new Sculpture(context);
    const root = s.root, wear = mood.wear, dense = mood.density;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // ---- Light -------------------------------------------------------------------------------
    const dayness = a.window === 'sunset' ? 0.7 : a.window === 'snow' ? 0.9 : a.window === 'dusk' ? 0.45 : 0.25;
    root.add(new THREE.HemisphereLight('#fff3df', '#5b4f42', mix(0.7, 1.1, dayness)));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.6, 0.09, mood.warmth), 0.45, 0.86), 2.1);
    key.position.set(mix(-3.2, 2.2, mood.daylight), 5.4, 6);
    key.target.position.set(0, 1.3, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.03; key.shadow.bias = -0.0003;
    const sc = key.shadow.camera;
    sc.left = -4; sc.right = 4; sc.bottom = -3.2; sc.top = 3.6; sc.near = 0.5; sc.far = 18;
    sc.updateProjectionMatrix();
    root.add(key, key.target);
    const bulbColour = new THREE.Color().setHSL(mix(0.14, 0.085, mood.warmth), 0.9, 0.72);
    const lamp = new THREE.PointLight(bulbColour, mix(14, 7, dayness), 7, 1.5);
    const camera = new THREE.PerspectiveCamera(33, 1, 0.5, 60);
    camera.position.set(0.4, 1.8, 8.3);
    camera.lookAt(0.03, 1.78, 0);

    // ---- Wall and floor ------------------------------------------------------------------------
    const tone = (c: string, amount = 0.25) => new THREE.Color(c).lerp(new THREE.Color('#6f6658'), wear * amount);
    const wallBase = { pine: '#d0a05e', whitewash: '#dedacd', barn: '#6e5642', green: '#8fa98d', paper: '#d9cba6' }[a.wall];
    const wallTex = paint(1024, 512, (ctx) => {
      const base = tone(wallBase);
      ctx.fillStyle = hex(base); ctx.fillRect(0, 0, 1024, 512);
      if (a.wall === 'paper') {
        for (let x = 0; x < 1024; x += 64) { ctx.fillStyle = 'rgba(126,72,58,0.35)'; ctx.fillRect(x, 0, 20, 512); ctx.fillStyle = 'rgba(126,72,58,0.2)'; ctx.fillRect(x + 36, 0, 5, 512); }
        for (let i = 0; i < 16; i++) { ctx.fillStyle = `rgba(90,70,40,${0.05 + wear * 0.12})`; ctx.beginPath(); ctx.ellipse(random() * 1024, random() * 512, 30 + random() * 90, 20 + random() * 50, 0, 0, 7); ctx.fill(); }
        return;
      }
      const boardW = a.wall === 'green' ? 43 : 85.33;
      for (let x = 0; x < 1024; x += boardW) {
        ctx.fillStyle = hex(base.clone().offsetHSL(0, 0, (random() - 0.5) * 0.07)); ctx.fillRect(x, 0, boardW, 512);
        for (let i = 0; i < 14; i++) { ctx.strokeStyle = `rgba(70,40,15,${0.05 + random() * 0.1})`; ctx.lineWidth = 1 + random() * 2; const gx = x + random() * boardW; ctx.beginPath(); ctx.moveTo(gx, 0); ctx.bezierCurveTo(gx + 6, 170, gx - 6, 340, gx + 2, 512); ctx.stroke(); }
        if (a.wall !== 'green' && a.wall !== 'whitewash') for (let i = 0; i < 2; i++) if (random() < 0.7) { const kx = x + boardW * mix(0.25, 0.75, random()), ky = random() * 512; ctx.fillStyle = 'rgba(70,38,14,0.75)'; ctx.beginPath(); ctx.ellipse(kx, ky, 5 + random() * 5, 8 + random() * 8, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(70,38,14,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(kx, ky, 12, 22, 0, 0, 7); ctx.stroke(); }
        ctx.fillStyle = 'rgba(30,20,10,0.55)'; ctx.fillRect(x, 0, 2.5, 512);
      }
      if (a.wall === 'green' || a.wall === 'whitewash') for (let i = 0; i < 40 + wear * 160; i++) { ctx.fillStyle = a.wall === 'green' ? 'rgba(190,170,130,0.8)' : 'rgba(120,96,70,0.6)'; ctx.fillRect(random() * 1024, random() * 512, 2 + random() * 9, 2 + random() * 14); }
    });
    box(root, [WALL_W, WALL_H, 0.2], [0, WALL_H / 2, -0.1], new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.82 }));
    const trim = s.material(a.wall === 'barn' ? '#4a3a2c' : a.wall === 'pine' ? '#8c5f33' : '#6f5a45');
    box(root, [WALL_W, 0.16, 0.03], [0, 0.08, 0.015], trim);
    if (a.wall === 'paper') { box(root, [WALL_W, 1.0, 0.025], [0, 0.5, 0.012], s.material('#7a5c40')); box(root, [WALL_W, 0.06, 0.04], [0, 1.02, 0.02], trim); }

    const floorTex = paint(512, 512, (ctx) => {
      if (a.floor === 'lino') {
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { ctx.fillStyle = hex(tone((i + j) % 2 ? '#d9d2bd' : mood.cheer > 0.5 ? '#9a4038' : '#57605a', 0.4)); ctx.fillRect(i * 64, j * 64, 64, 64); }
      } else if (a.floor === 'concrete') {
        ctx.fillStyle = hex(tone('#a9a69c')); ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '40,36,30'},${random() * 0.09})`; ctx.fillRect(random() * 512, random() * 512, 2 + random() * 6, 2 + random() * 6); }
        for (let i = 0; i < 4; i++) { ctx.strokeStyle = 'rgba(50,44,36,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); let x = random() * 512, y = random() * 512; ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (random() - 0.5) * 120; y += (random() - 0.5) * 120; ctx.lineTo(x, y); } ctx.stroke(); }
      } else {
        const base = tone('#a57c50', 0.4);
        for (let x = 0; x < 512; x += 64) { ctx.fillStyle = hex(base.clone().offsetHSL(0, 0, (random() - 0.5) * 0.08)); ctx.fillRect(x, 0, 64, 512); ctx.fillStyle = 'rgba(30,18,8,0.6)'; ctx.fillRect(x, 0, 3, 512); const y = random() * 512; ctx.fillRect(x, y, 64, 3); for (let i = 0; i < 9; i++) { ctx.strokeStyle = 'rgba(60,34,12,0.14)'; ctx.beginPath(); const gx = x + random() * 64; ctx.moveTo(gx, 0); ctx.lineTo(gx + 4, 512); ctx.stroke(); } }
      }
      for (let i = 0; i < wear * 26; i++) { ctx.fillStyle = `rgba(40,30,20,${0.06 + random() * 0.1})`; ctx.beginPath(); ctx.ellipse(random() * 512, random() * 512, 12 + random() * 46, 10 + random() * 30, random() * 3, 0, 7); ctx.fill(); }
    }, a.floor === 'lino' ? [3, 2] : [2.4, 1.6]);
    const floor = box(root, [WALL_W, 0.2, 5.4], [0, -0.1, 2.6], new THREE.MeshStandardMaterial({ map: floorTex, roughness: a.floor === 'lino' ? 0.5 : 0.9 }));
    floor.castShadow = false;
    if (a.floor === 'concrete') { part(root, new THREE.CylinderGeometry(0.11, 0.11, 0.006, 20), s.material('#5c5f60', { metalness: 0.6, roughness: 0.5 }), [0.5, 0.003, 1.9]); }

    // ---- Bench -----------------------------------------------------------------------------------
    const benchWood = woodMaterial(random, hex(tone('#8a6238', 0.4)), 0.2);
    const benchDark = woodMaterial(random, hex(tone('#5e452c', 0.4)), 0.1);
    const bw = BENCH_X1 - BENCH_X0, bcx = (BENCH_X0 + BENCH_X1) / 2;
    box(root, [bw, 0.07, BENCH_D], [bcx, BENCH_Y - 0.035, BENCH_D / 2 + 0.02], benchWood);
    box(root, [bw - 0.1, 0.16, 0.03], [bcx, BENCH_Y - 0.15, BENCH_D - 0.02], benchDark);
    for (const x of [BENCH_X0 + 0.08, bcx, BENCH_X1 - 0.08]) for (const z of [0.1, BENCH_D - 0.06]) box(root, [0.08, BENCH_Y - 0.07, 0.08], [x, (BENCH_Y - 0.07) / 2, z], benchDark);
    box(root, [bw - 0.12, 0.03, BENCH_D - 0.14], [bcx, 0.27, BENCH_D / 2 + 0.02], benchDark);
    const brass = s.material('#b9973f', { metalness: 0.7, roughness: 0.4 });
    for (const x of [-1.75, -0.5, 0.75]) { box(root, [0.7, 0.11, 0.012], [x, BENCH_Y - 0.15, BENCH_D - 0.002], benchWood); ball(root, [0.022, 0.022, 0.018], [x, BENCH_Y - 0.15, BENCH_D + 0.012], brass, [0, 0, 0], 10); }
    // Under the bench: crates, a borax sack, a rolled hide.
    const under = Math.round(mix(1, 5, dense));
    for (let i = 0; i < under; i++) {
      const x = mix(BENCH_X0 + 0.4, BENCH_X1 - 0.4, (i + random() * 0.6) / under), kind = i % 3;
      if (kind === 0) { const h = mix(0.22, 0.36, random()); box(root, [0.45, h, 0.4], [x, 0.285 + h / 2, 0.36], woodMaterial(random, hex(tone('#b08a55', 0.4)), 0), [0, (random() - 0.5) * 0.3, 0]); }
      else if (kind === 1) { ball(root, [0.2, 0.17, 0.16], [x, 0.285 + 0.15, 0.36], s.material('#d8cfb4', { roughness: 1 }), [0, random(), 0.1]); card(root, ['BORAX'], 0.2, 0.07, [x, 0.45, 0.525], { paper: '#d8cfb4', ink: '#7a2a1e' }); }
      else { const m = furMaterial(random, pick(['#8a6a48', '#5a4634', '#b9b0a0']), { dust: wear }); part(root, new THREE.CylinderGeometry(0.09, 0.09, 0.5, 14), m, [x, 0.285 + 0.09, 0.36], 1, [0, random() * 0.6, Math.PI / 2]); }
    }

    // Jars along the back of the bench.
    const glass = new THREE.MeshStandardMaterial({ color: '#dfeae6', transparent: true, opacity: 0.35, roughness: 0.08, depthWrite: false });
    const jarCount = Math.round(mix(3, 11, dense));
    for (let i = 0; i < jarCount; i++) {
      const x = mix(BENCH_X0 + 0.15, BENCH_X1 - 0.15, (i + 0.2 + random() * 0.6) / jarCount);
      if (Math.abs(x - 0.1) < 0.02) continue;
      const h = mix(0.12, 0.26, random()), r = mix(0.04, 0.065, random()), fill = mix(0.3, 0.9, random());
      const stuff = pick(['#f2efe6', '#c9a43a', '#7d8f4a', '#8a4a2e', '#2b2420', '#d9c7a2']);
      part(root, new THREE.CylinderGeometry(r, r, h, 14), glass, [x, BENCH_Y + h / 2, 0.12]);
      part(root, new THREE.CylinderGeometry(r * 0.9, r * 0.9, h * fill, 14), s.material(stuff, { roughness: 0.6 }), [x, BENCH_Y + (h * fill) / 2 + 0.004, 0.12]);
      part(root, new THREE.CylinderGeometry(r * 1.03, r * 1.03, 0.018, 14), s.material(pick(['#8a2f2a', '#c9b98a', '#3d4a54']), { metalness: 0.4, roughness: 0.5 }), [x, BENCH_Y + h + 0.009, 0.12]);
    }
    // What the bench is in the middle of. Decor keeps to the two free zones between the cast.
    const steel = s.material('#aeb3b6', { metalness: 0.8, roughness: 0.32 });
    const clay = s.material('#8f5f43', { roughness: 0.9 });
    const handle = s.material('#b3271f', { roughness: 0.5 });
    const tool = (x: number, z: number, yaw: number, len: number, kind: number) => {
      const T = group(root, [x, BENCH_Y + 0.008, z], [0, yaw, 0]);
      limb(T, [0, 0, 0], [0, 0, len * 0.45], 0.011, 0.01, kind % 2 ? handle : benchDark);
      if (kind === 0) box(T, [0.014, 0.003, len * 0.55], [0, 0, len * 0.72], steel);
      else if (kind === 1) limb(T, [0, 0, len * 0.45], [0, 0, len], 0.004, 0.0015, steel);
      else if (kind === 2) { box(T, [0.05, 0.03, 0.09], [0, 0.01, len * 0.5], steel); }
      else { for (const sx of [-1, 1]) limb(T, [0, 0, len * 0.4], [sx * 0.02, 0, len], 0.004, 0.002, steel); }
    };
    const zones: [number, number][] = [[-2.15, -1.58], [-0.6, 0.45]];
    if (a.bench === 'tidy') {
      for (const [x0, x1] of zones) { const n = Math.floor((x1 - x0) / 0.1); for (let i = 0; i < n; i++) tool(x0 + 0.05 + i * 0.1, 0.36, 0, mix(0.16, 0.26, random()), i % 4); }
      box(root, [0.24, 0.03, 0.18], [0.25, BENCH_Y + 0.015, 0.25], s.material('#d9d3c2', { roughness: 1 }));
    } else if (a.bench === 'midjob') {
      for (const [x0, x1] of zones) for (let i = 0; i < 5; i++) tool(mix(x0, x1, random()), mix(0.26, 0.62, random()), random() * 6, mix(0.16, 0.26, random()), Math.floor(random() * 4));
      ball(root, [0.1, 0.06, 0.08], [-0.3, BENCH_Y + 0.05, 0.4], clay, [0.2, 0.3, 0.2], 10);
      ball(root, [0.045, 0.03, 0.04], [-0.12, BENCH_Y + 0.025, 0.52], clay, [0, 0, 0], 8);
      // A bare foam form on a post, waiting its turn.
      const foam = s.material('#eadfae', { roughness: 0.95 });
      limb(root, [-1.86, BENCH_Y, 0.4], [-1.86, BENCH_Y + 0.2, 0.4], 0.008, 0.008, steel);
      ball(root, [0.075, 0.085, 0.09], [-1.86, BENCH_Y + 0.27, 0.42], foam);
      limb(root, [-1.86, BENCH_Y + 0.26, 0.47], [-1.86, BENCH_Y + 0.2, 0.62], 0.05, 0.028, foam, 0.85);
      const coil = new THREE.TorusGeometry(0.06, 0.006, 6, 20);
      part(root, coil, steel, [0.3, BENCH_Y + 0.01, 0.52], 1, [Math.PI / 2, 0, 0]);
      part(root, coil, steel, [0.31, BENCH_Y + 0.022, 0.53], 0.9, [Math.PI / 2 + 0.1, 0, 0]);
      s.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ roughness: 0.3 }), Array.from({ length: 30 }, () => ({ at: [mix(-0.6, 0.45, random()), BENCH_Y + 0.006, mix(0.25, 0.68, random())] as [number, number, number], size: 0.007, color: pick(['#e23b2e', '#f4d23a', '#f2f2ee', '#2f6fd0']) })));
    } else if (a.bench === 'dustsheet') {
      const sheet = s.material('#d9d6c9', { roughness: 1 });
      ball(root, [0.36, 0.3, 0.26], [-0.1, BENCH_Y + 0.1, 0.42], sheet, [0, 0.2, 0], 14);
      ball(root, [0.18, 0.22, 0.18], [-0.2, BENCH_Y + 0.26, 0.4], sheet, [0, 0, 0.2], 12);
      box(root, [0.6, 0.01, 0.4], [-1.86, BENCH_Y + 0.005, 0.38], sheet, [0, 0.1, 0]);
      ball(root, [0.2, 0.12, 0.16], [-1.86, BENCH_Y + 0.05, 0.38], sheet, [0, 0, 0], 12);
    } else {
      const T = group(root, [-0.38, BENCH_Y, 0.42], [0, 0.2, 0]);
      part(T, new THREE.CylinderGeometry(0.04, 0.045, 0.26, 14), s.material(mood.cheer > 0.5 ? '#b3271f' : '#35523f', { roughness: 0.4 }), [0, 0.13, 0]);
      part(T, new THREE.CylinderGeometry(0.035, 0.04, 0.05, 14), steel, [0, 0.285, 0]);
      box(root, [0.26, 0.16, 0.16], [0.02, BENCH_Y + 0.08, 0.36], s.material('#4f6f8a', { metalness: 0.5, roughness: 0.4 }), [0, -0.2, 0]);
      part(root, new THREE.CylinderGeometry(0.13, 0.13, 0.16, 14, 1, false, 0, Math.PI), s.material('#4f6f8a', { metalness: 0.5, roughness: 0.4 }), [0.02, BENCH_Y + 0.16, 0.36], [1, 0.5, 1], [0, Math.PI / 2 - 0.2, Math.PI / 2]);
      const R = group(root, [-1.86, BENCH_Y, 0.36], [0, 0.3, 0]);
      box(R, [0.3, 0.18, 0.1], [0, 0.09, 0], s.material('#7a5236', { roughness: 0.5 }));
      box(R, [0.15, 0.12, 0.004], [-0.06, 0.09, 0.052], s.material('#d8c9a0'));
      part(R, new THREE.CylinderGeometry(0.03, 0.03, 0.012, 14), s.material('#e9e2cc'), [0.09, 0.1, 0.055], 1, [Math.PI / 2, 0, 0]);
      limb(R, [0.13, 0.18, -0.02], [0.3, 0.52, -0.06], 0.003, 0.002, steel);
      ball(R, [0.008, 0.008, 0.008], [0.3, 0.52, -0.06], new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff9a2e', emissiveIntensity: 1.5 }), [0, 0, 0], 8);
      tool(0.3, 0.5, 1.2, 0.2, 1); tool(-2.05, 0.6, 2, 0.22, 0);
    }

    // ---- Pegboard ----------------------------------------------------------------------------------
    const pegTex = paint(256, 256, (ctx) => {
      ctx.fillStyle = hex(tone('#b99a6b', 0.4)); ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = 'rgba(40,26,12,0.7)';
      for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { ctx.beginPath(); ctx.arc(i * 16 + 8, j * 16 + 8, 1.8, 0, 7); ctx.fill(); }
    });
    const PB: P3 = [-1.68, 1.78, 0.02];
    box(root, [0.92, 1.0, 0.03], PB, new THREE.MeshStandardMaterial({ map: pegTex, roughness: 0.9 }));
    for (const dy of [-0.5, 0.5]) box(root, [0.96, 0.035, 0.045], [PB[0], PB[1] + dy, 0.025], trim);
    const P = group(root, [PB[0], PB[1], 0.045]);
    const hung = (x: number, y: number, kind: string, tilt = 0) => {
      const T = group(P, [x, y, 0], [0, 0, tilt + (random() - 0.5) * (0.05 + wear * 0.3)]);
      part(T, new THREE.CylinderGeometry(0.004, 0.004, 0.03, 6), steel, [0, 0, 0.005], 1, [Math.PI / 2, 0, 0]);
      if (kind === 'hammer') { box(T, [0.022, 0.26, 0.018], [0, -0.14, 0.012], benchDark); box(T, [0.11, 0.04, 0.035], [0, -0.01, 0.012], steel); }
      else if (kind === 'saw') { part(T, new THREE.TorusGeometry(0.07, 0.006, 5, 12, Math.PI), steel, [0, -0.1, 0.01], [1.5, 0.9, 1], [0, 0, Math.PI]); box(T, [0.21, 0.008, 0.003], [0, -0.1, 0.01], steel); box(T, [0.03, 0.09, 0.02], [-0.12, -0.11, 0.01], handle); }
      else if (kind === 'pliers') { for (const sx of [-1, 1]) { limb(T, [0, -0.06, 0.01], [sx * 0.03, -0.2, 0.01], 0.008, 0.007, handle); limb(T, [0, -0.06, 0.01], [sx * 0.006, 0, 0.01], 0.006, 0.003, steel); } }
      else if (kind === 'scissors') { for (const sx of [-1, 1]) { part(T, new THREE.TorusGeometry(0.02, 0.005, 5, 12), steel, [sx * 0.022, -0.02, 0.01]); limb(T, [sx * 0.012, -0.04, 0.01], [-sx * 0.012, -0.2, 0.01], 0.005, 0.002, steel); } }
      else if (kind === 'wire') { part(T, new THREE.TorusGeometry(0.07, 0.012, 6, 20), s.material('#6a7074', { metalness: 0.7, roughness: 0.4 }), [0, -0.075, 0.015]); }
      else if (kind === 'brush') { box(T, [0.02, 0.14, 0.014], [0, -0.07, 0.01], benchWood); box(T, [0.06, 0.06, 0.016], [0, -0.17, 0.01], s.material('#2b2420')); }
      else if (kind === 'knife') { box(T, [0.02, 0.1, 0.014], [0, -0.05, 0.01], benchDark); box(T, [0.016, 0.14, 0.003], [0, -0.17, 0.01], steel); }
      else { part(T, new THREE.TorusGeometry(0.05, 0.004, 5, 14, Math.PI * 1.3), steel, [0, -0.05, 0.01]); }
    };
    const kinds = ['hammer', 'saw', 'pliers', 'scissors', 'wire', 'brush', 'knife', 'hook', 'pliers', 'knife', 'brush', 'scissors'];
    const pegN = Math.round(mix(4, 12, dense));
    for (let i = 0; i < pegN; i++) hung(-0.33 + (i % 4) * 0.22, 0.42 - Math.floor(i / 4) * 0.31, kinds[i]);
    if (wear > 0.55) for (let i = pegN; i < Math.min(12, pegN + 3); i++) { // Painted outlines where a tool is missing.
      const o = new THREE.MeshStandardMaterial({ color: '#2b2420', transparent: true, opacity: 0.3, depthWrite: false });
      part(P, new THREE.PlaneGeometry(0.05, 0.2), o, [-0.33 + (i % 4) * 0.22, 0.42 - Math.floor(i / 4) * 0.31 - 0.1, 0.004]);
    }

    // ---- Window --------------------------------------------------------------------------------------
    const WX = 1.82, WY = 1.98, WW = 0.7, WH = 1.02;
    const sky = paint(128, 160, (ctx) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 160);
      const stops = { dusk: ['#1f2f5c', '#4a5f96', '#8a7fa0'], night: ['#0c1018', '#141a28', '#1b2233'], sunset: ['#5a5f8a', '#e8884a', '#ffd08a'], snow: ['#aab3bb', '#c5ccd2', '#d9dde0'], blind: ['#cdbf8f', '#c9b987', '#bfae7c'] }[a.window];
      stops.forEach((c, i) => grad.addColorStop(i / 2, c));
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 160);
      if (a.window === 'blind') { ctx.strokeStyle = 'rgba(90,70,30,0.35)'; for (let y = 20; y < 160; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); } return; }
      ctx.fillStyle = a.window === 'snow' ? '#5b5f60' : '#0b0d12';
      ctx.fillRect(0, 128, 128, 32);
      for (let i = 0; i < 9; i++) { const x = random() * 128, h = 30 + random() * 60; ctx.beginPath(); ctx.moveTo(x - 9, 130); ctx.lineTo(x, 130 - h); ctx.lineTo(x + 9, 130); ctx.fill(); }
      if (a.window === 'snow') { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 90; i++) { ctx.beginPath(); ctx.arc(random() * 128, random() * 160, 0.8 + random() * 1.4, 0, 7); ctx.fill(); } ctx.fillStyle = '#eef1f2'; ctx.fillRect(0, 148, 128, 12); }
      if (a.window === 'night') { ctx.fillStyle = 'rgba(255,214,150,0.9)'; ctx.beginPath(); ctx.arc(40, 46, 5, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,214,150,0.18)'; ctx.beginPath(); ctx.arc(40, 46, 20, 0, 7); ctx.fill(); }
      if (a.window === 'dusk') { ctx.fillStyle = '#f2ecd2'; ctx.beginPath(); ctx.arc(92, 34, 7, 0, 7); ctx.fill(); }
    });
    part(root, new THREE.PlaneGeometry(WW, WH), new THREE.MeshStandardMaterial({ map: sky, emissive: '#ffffff', emissiveMap: sky, emissiveIntensity: a.window === 'blind' ? 0.25 : a.window === 'night' ? 0.5 : 0.85, roughness: 0.3 }), [WX, WY, 0.012]);
    const frame = s.material(a.wall === 'whitewash' || a.wall === 'paper' ? '#6f5a45' : '#e6dfcc', { roughness: 0.7 });
    for (const dx of [-1, 1]) box(root, [0.07, WH + 0.14, 0.06], [WX + dx * (WW / 2 + 0.035), WY, 0.03], frame);
    for (const dy of [-1, 1]) box(root, [WW + 0.14, 0.07, 0.06], [WX, WY + dy * (WH / 2 + 0.035), 0.03], frame);
    box(root, [WW + 0.26, 0.04, 0.14], [WX, WY - WH / 2 - 0.07, 0.07], frame);
    if (a.window !== 'blind') { box(root, [0.03, WH, 0.03], [WX, WY, 0.025], frame); box(root, [WW, 0.03, 0.03], [WX, WY + 0.02, 0.025], frame); }
    else { limb(root, [WX, WY - WH / 2 + 0.02, 0.03], [WX, WY - WH / 2 - 0.16, 0.03], 0.002, 0.002, s.material('#e9e2cc')); part(root, new THREE.TorusGeometry(0.018, 0.004, 5, 12), s.material('#e9e2cc'), [WX, WY - WH / 2 - 0.18, 0.03]); }
    if (dense > 0.4) for (let i = 0; i < 3; i++) { const h = mix(0.08, 0.18, random()); part(root, new THREE.CylinderGeometry(0.035, 0.035, h, 10), i === 1 ? s.material('#6d7f4a', { roughness: 0.3 }) : glass, [WX - 0.25 + i * 0.22, WY - WH / 2 - 0.05 + h / 2, 0.08]); }

    // ---- Sign ---------------------------------------------------------------------------------------------
    const signLines = { none: [], stuff: ['YOU SNUFF EM', 'WE STUFF EM'], credit: ['NO CREDIT', 'NO REFUNDS'], pets: ['PETS PRESERVED', 'WITH DIGNITY'], closed: ['CLOSED FOR', 'DEER SEASON'] }[a.sign];
    if (signLines.length) {
      const SG = group(root, [0.1, 3.42, 0.03], [0, 0, (random() - 0.5) * (0.02 + wear * 0.12)]);
      box(SG, [1.36, 0.46, 0.03], [0, 0, 0], benchDark);
      card(SG, signLines, 1.28, 0.38, [0, 0, 0.017], { paper: mood.cheer > 0.5 ? '#f0e2b0' : '#d9d0b8', ink: a.sign === 'credit' || a.sign === 'closed' ? '#8a1f1a' : '#24352c', border: true });
    }

    // ---- The crowd of old work on the wall ---------------------------------------------------------------------
    const plaqueWood = () => woodMaterial(random, hex(tone(pick(['#6b4428', '#7d5231', '#4f3523']), 0.4)), 0.7 * (1 - wear));
    const bone = s.material('#e4d9bd', { roughness: 0.7 });
    const hornMat = s.material('#c9b287', { roughness: 0.55 });
    const crooked = () => (random() - 0.5) * (0.04 + wear * 0.5);
    const antlerMount = (x: number, y: number, k: number) => {
      const M = group(root, [x, y, 0.005], [0, 0, crooked()]);
      plaque(M, 'shield', 0.26 * k, 0.32 * k, plaqueWood(), 0.025);
      ball(M, [0.05 * k, 0.035 * k, 0.03], [0, 0.02 * k, 0.03], s.material(pick(['#7a2f2a', '#3e5a3a', '#4a3a2c']), { roughness: 1 }));
      const points = 1 + Math.floor(random() * 3), snapped = wear > 0.7 && random() < 0.4 ? (random() < 0.5 ? -1 : 1) : 0;
      for (const sx of [-1, 1]) {
        const cut = snapped === sx;
        const beam: P3[] = [[sx * 0.02 * k, 0.03 * k, 0.04], [sx * 0.08 * k, 0.12 * k, 0.07], [sx * 0.2 * k, 0.24 * k, 0.12], [sx * 0.23 * k, 0.4 * k, 0.2]];
        const { curve } = taper(M, cut ? beam.slice(0, 3) : beam, 0.016 * k, cut ? 0.011 * k : 0.004, hornMat, 6);
        if (!cut) for (let i = 0; i < points; i++) { const o = curve.getPointAt(0.3 + i * 0.22); taper(M, [[o.x, o.y, o.z], [o.x - sx * 0.01, o.y + 0.07 * k, o.z + 0.03], [o.x - sx * 0.02 * k, o.y + 0.14 * k, o.z + 0.05]], 0.01 * k, 0.003, hornMat, 5); }
      }
    };
    const fishMount = (x: number, y: number, k: number) => {
      const M = group(root, [x, y, 0.005], [0, 0, crooked()]);
      plaque(M, 'oval', 0.56 * k, 0.24 * k, plaqueWood(), 0.022);
      const colour = pick(['#6f8a52', '#8a9aa0', '#a8823c', '#5d7a86']);
      const skin = s.material(colour, { roughness: wear > 0.6 ? 0.8 : 0.25, metalness: 0.2 });
      const F = group(M, [0, 0.01, 0.06], [0, 0, (random() - 0.5) * 0.3]);
      const flip = random() < 0.5 ? -1 : 1;
      F.scale.set(flip * k, k, 1);
      ball(F, [0.2, 0.065, 0.035], [0, 0, 0], skin);
      ball(F, [0.17, 0.035, 0.03], [0, -0.03, 0.004], s.material('#e6dcc0', { roughness: 0.4 }));
      part(F, new THREE.ConeGeometry(0.075, 0.11, 4), skin, [0.24, 0, 0], [1, 1, 0.15], [0, 0, Math.PI / 2]);
      part(F, new THREE.ConeGeometry(0.05, 0.08, 4), skin, [0.02, 0.075, 0], [1, 1, 0.15]);
      ball(F, [0.012, 0.012, 0.008], [-0.14, 0.015, 0.03], s.material('#f1d77a', { roughness: 0.1 }), [0, 0, 0], 8);
      ball(F, [0.03, 0.022, 0.02], [-0.19, -0.012, 0.004], s.material('#7a2a2e'));
    };
    const skullMount = (x: number, y: number, k: number) => {
      const M = group(root, [x, y, 0.005], [0, 0, crooked()]);
      plaque(M, 'arch', 0.22 * k, 0.34 * k, plaqueWood(), 0.022);
      ball(M, [0.05 * k, 0.05 * k, 0.045], [0, 0.04 * k, 0.05], bone);
      limb(M, [0, 0.02 * k, 0.06], [0, -0.1 * k, 0.07], 0.035 * k, 0.018 * k, bone, 0.85);
      for (const sx of [-1, 1]) { ball(M, [0.014 * k, 0.014 * k, 0.01], [sx * 0.026 * k, 0.03 * k, 0.085], s.material('#17120f')); taper(M, [[sx * 0.04 * k, 0.07 * k, 0.04], [sx * 0.14 * k, 0.1 * k, 0.07], [sx * 0.2 * k, 0.2 * k, 0.1]], 0.016 * k, 0.004, s.material('#5b5248', { roughness: 0.6 }), 6); }
    };
    const smallHead = (x: number, y: number, k: number) => {
      const M = group(root, [x, y, 0.005], [0, 0, crooked()]);
      plaque(M, 'round', 0.26 * k, 0.26 * k, plaqueWood(), 0.022);
      const fur = furMaterial(random, pick(['#c2622a', '#86817b', '#5a4634', '#d9cdb8']), { dust: wear, bald: Math.max(0, wear - 0.5) * 1.6 });
      ball(M, [0.055 * k, 0.055 * k, 0.06], [0, 0, 0.07], fur);
      limb(M, [0, -0.01 * k, 0.1], [0, -0.035 * k, 0.19], 0.032 * k, 0.014 * k, fur, 0.9);
      ball(M, [0.012 * k, 0.01 * k, 0.01], [0, -0.035 * k, 0.205], s.material('#17120f', { roughness: 0.3 }), [0, 0, 0], 8);
      const iris = eyeMaterial(pick(['#d07a1c', '#c2ad3c', '#3a230f']), 'round');
      for (const sx of [-1, 1]) { eye(M, [sx * 0.03 * k, 0.012 * k, 0.115], 0.011 * k, iris, [sx * 0.4 + (wear > 0.6 ? (random() - 0.5) * 1.2 : 0), 0]); part(M, new THREE.ConeGeometry(0.024 * k, 0.07 * k, 6), fur, [sx * 0.04 * k, 0.07 * k, 0.06], [1, 1, 0.35], [0, 0, -sx * (0.25 + (wear > 0.6 && sx > 0 ? 1.1 : 0))]); }
    };
    const blank = (x: number, y: number, k: number) => {
      const M = group(root, [x, y, 0.005], [0, 0, crooked()]);
      plaque(M, pick(['shield', 'oval', 'arch'] as const), 0.26 * k, 0.32 * k, plaqueWood(), 0.022);
      card(M, [pick(['RESERVED', 'NEXT YEAR', '________', 'THE BIG ONE'])], 0.13 * k, 0.04 * k, [0, -0.09 * k, 0.024], { paper: '#c8a24a', ink: '#2e210c', metal: true });
      part(M, new THREE.TorusGeometry(0.012, 0.003, 5, 10, Math.PI), steel, [0, 0.03 * k, 0.03], 1, [0, 0, Math.PI]);
    };
    const prize = (x: number, y: number, k: number) => {
      if (random() < 0.5) {
        const colour = s.material(pick(mood.cheer > 0.4 ? ['#2449b0', '#b3271f', '#d9a520'] : ['#a3261f', '#e9e2cc', '#6a5a8a']), { roughness: 0.6 });
        const R = group(root, [x, y + 0.05, 0.012], [0, 0, crooked()]);
        for (let i = 0; i < 12; i++) ball(R, [0.022 * k, 0.045 * k, 0.006], [Math.sin(i * 0.5236) * 0.05 * k, Math.cos(i * 0.5236) * 0.05 * k, 0], colour, [0, 0, -i * 0.5236], 8);
        part(R, new THREE.CylinderGeometry(0.04 * k, 0.04 * k, 0.01, 16), s.material('#f0d35a', { metalness: 0.6, roughness: 0.35 }), [0, 0, 0.008], 1, [Math.PI / 2, 0, 0]);
        for (const sx of [-1, 1]) box(R, [0.036 * k, 0.2 * k, 0.004], [sx * 0.024 * k, -0.13 * k, 0], colour, [0, 0, sx * 0.12]);
      } else {
        const F = group(root, [x, y, 0.01], [0, 0, crooked()]);
        box(F, [0.3 * k, 0.24 * k, 0.02], [0, 0, 0], s.material('#2b2420'));
        card(F, [pick(['1st PLACE', 'BEST IN SHOW', 'STATE CHAMPION', '2nd PLACE']), pick(['GAME HEAD', 'FISH', 'LIFE-SIZE', 'NOVICE']), `${1958 + Math.floor(random() * 40)}`], 0.26 * k, 0.2 * k, [0, 0, 0.012], { paper: wear > 0.6 ? '#d6c8a0' : '#f2ecd8', ink: '#2b2420', font: 'italic', border: true });
      }
    };
    const makers = { antlers: [antlerMount, antlerMount, antlerMount, skullMount], fish: [fishMount, fishMount, fishMount, antlerMount], menagerie: [antlerMount, fishMount, skullMount, smallHead, smallHead], waiting: [blank, blank, blank, antlerMount], prizes: [prize, prize, antlerMount, fishMount, smallHead] }[a.trophies];
    const spots: [number, number, number][] = [
      [-2.02, 3.3, 1], [-1.45, 2.95, 1.05], [-0.95, 3.4, 0.95], [1.2, 3.42, 1], [1.72, 2.98, 1.05], [2.12, 3.45, 0.9],
      [-2.05, 2.72, 0.75], [-0.38, 2.7, 0.72], [0.56, 2.7, 0.72], [1.9, 1.05, 0.8], [-0.95, 2.82, 0.6], [1.15, 2.86, 0.6],
    ];
    if (!signLines.length) spots.push([-0.35, 3.4, 1], [0.6, 3.35, 1.05]);
    const count = Math.round(mix(3, spots.length, Math.min(1, dense * 1.15)));
    const order = spots.map((p) => ({ p, k: random() })).sort((p, q) => p.k - q.k).slice(0, count);
    order.forEach(({ p }, i) => makers[i % makers.length](p[0], p[1], p[2] * mix(0.9, 1.12, random())));
    // A pale ghost on the wall where something used to hang.
    if (wear > 0.55) { const g = spots[spots.length - 1 - order.length] ?? [0.56, 2.7, 0.7]; if (!order.some((o) => o.p === g)) { const ghost = new THREE.MeshStandardMaterial({ color: '#fff6e0', transparent: true, opacity: 0.2, depthWrite: false }); part(root, new THREE.CircleGeometry(0.15, 20), ghost, [g[0], g[1], 0.004], [1, 1.25, 1]); part(root, new THREE.CylinderGeometry(0.006, 0.006, 0.03, 6), steel, [g[0], g[1] + 0.12, 0.012], 1, [Math.PI / 2, 0, 0]); } }
    if (wear > 0.6) { const web = new THREE.MeshStandardMaterial({ color: '#efece2', transparent: true, opacity: 0.4, depthWrite: false }); for (let i = 0; i < 9; i++) { const c: [number, number] = pick([[-2.25, 3.8], [2.3, 3.8], [1.4, 2.55]]); s.rod([c[0], c[1], 0.02], [c[0] + (random() - 0.5) * 1.1, c[1] - random() * 0.9, 0.03 + random() * 0.2], 0.002, web); } }

    // ---- Stool and company ----------------------------------------------------------------------------------------------
    const ST: P3 = [-0.25, 0, 1.55];
    const stool = group(root, ST, [0, random() * 2, 0]);
    part(stool, new THREE.CylinderGeometry(0.17, 0.17, 0.04, 18), benchWood, [0, 0.6, 0]);
    for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI * 2 + 0.4; limb(stool, [Math.cos(t) * 0.11, 0.59, Math.sin(t) * 0.11], [Math.cos(t) * 0.2, 0, Math.sin(t) * 0.2], 0.017, 0.015, benchDark); }
    part(stool, new THREE.TorusGeometry(0.16, 0.008, 5, 20), steel, [0, 0.22, 0], 1, [Math.PI / 2, 0, 0]);
    let breathe: THREE.Object3D | null = null;
    if (a.company === 'cat') {
      const fur = furMaterial(random, pick(['#e08a2e', '#3a3632', '#8f8a84', '#e9e2d6']), {});
      const C = group(root, [ST[0], 0.62, ST[2]], [0, random() * 6, 0]);
      breathe = ball(C, [0.14, 0.07, 0.11], [0, 0.06, 0], fur);
      ball(C, [0.055, 0.05, 0.055], [0.1, 0.06, 0.07], fur);
      for (const sx of [-1, 1]) part(C, new THREE.ConeGeometry(0.02, 0.04, 4), fur, [0.1 + sx * 0.03, 0.11, 0.07]);
      taper(C, [[-0.12, 0.03, 0], [-0.14, 0.03, 0.09], [-0.04, 0.03, 0.14], [0.07, 0.03, 0.13]], 0.02, 0.012, fur, 7);
    } else if (a.company === 'apron') {
      const cloth = s.material(mood.cheer > 0.5 ? '#35523f' : '#6a5f52', { roughness: 1 });
      box(root, [0.3, 0.02, 0.34], [ST[0], 0.63, ST[2]], cloth, [0, 0.4, 0]);
      box(root, [0.3, 0.42, 0.02], [ST[0] + 0.07, 0.42, ST[2] + 0.17], cloth, [0.08, 0.4, 0]);
      part(root, new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), s.material('#b3271f'), [ST[0], 0.64, ST[2]], [1, 0.75, 1]);
      box(root, [0.15, 0.01, 0.1], [ST[0] + 0.05, 0.645, ST[2] + 0.13], s.material('#b3271f'), [0.1, 0.4, 0]);
    } else if (a.company === 'owl') {
      const O = group(root, [-1.8, 0, 1.0], [0, 0.5, 0]);
      part(O, new THREE.CylinderGeometry(0.16, 0.2, 0.05, 14), benchDark, [0, 0.025, 0]);
      limb(O, [0, 0.05, 0], [0, 1.32, 0], 0.022, 0.018, benchDark);
      limb(O, [-0.2, 1.32, 0], [0.2, 1.32, 0], 0.02, 0.02, benchWood);
      const fur = furMaterial(random, '#8a6f4e', { dust: wear, streak: 0.3 });
      ball(O, [0.11, 0.17, 0.1], [0, 1.5, 0], fur);
      ball(O, [0.1, 0.085, 0.09], [0, 1.69, 0.01], fur);
      ball(O, [0.085, 0.07, 0.03], [0, 1.69, 0.075], furMaterial(random, '#d9c7a2', {}));
      const iris = eyeMaterial('#f0a91e', 'round');
      for (const sx of [-1, 1]) { eye(O, [sx * 0.04, 1.7, 0.09], 0.028, iris, [wear > 0.6 && sx > 0 ? 0.7 : 0, 0]); part(O, new THREE.ConeGeometry(0.02, 0.06, 4), fur, [sx * 0.065, 1.78, 0], 1, [0, 0, -sx * 0.4]); }
      part(O, new THREE.ConeGeometry(0.014, 0.035, 4), s.material('#3a3028'), [0, 1.665, 0.105], 1, [Math.PI * 0.9, 0, 0]);
    } else if (a.company === 'bear') {
      const B = group(root, [-1.72, 0, 1.05], [0, 0.55, 0]);
      const fur = furMaterial(random, '#4a3626', { dust: wear, bald: 0.3 + wear * 0.6 });
      part(B, new THREE.CylinderGeometry(0.3, 0.32, 0.06, 16), benchDark, [0, 0.03, 0]);
      ball(B, [0.22, 0.33, 0.19], [0, 0.55, 0], fur);
      for (const sx of [-1, 1]) { limb(B, [sx * 0.11, 0.3, 0.02], [sx * 0.13, 0.06, 0.04], 0.085, 0.075, fur); limb(B, [sx * 0.19, 0.72, 0.04], [sx * 0.15, 0.6, 0.27], 0.06, 0.05, fur); ball(B, [0.045, 0.045, 0.02], [sx * 0.1, 1.12, 0], fur); }
      ball(B, [0.15, 0.14, 0.14], [0, 0.98, 0.03], fur);
      limb(B, [0, 0.95, 0.12], [0, 0.93, 0.21], 0.06, 0.04, furMaterial(random, '#a88a62', { dust: wear }));
      ball(B, [0.022, 0.016, 0.014], [0, 0.945, 0.25], s.material('#17120f', { roughness: 0.3 }));
      const iris = eyeMaterial('#5a3414', 'round');
      for (const sx of [-1, 1]) eye(B, [sx * 0.06, 1.02, 0.15], 0.016, iris, [sx * 0.2 + (sx > 0 ? wear * 0.8 : 0), 0]);
      part(B, new THREE.CylinderGeometry(0.19, 0.19, 0.015, 18), brass, [0, 0.63, 0.3]);
      card(B, ['PLEASE', 'PAY HERE'], 0.2, 0.1, [0, 0.72, 0.3], { paper: '#efe6cc', ink: '#8a1f1a', rot: [-0.3, 0, 0] });
    }
    // Floor litter: sawdust, tufts of fur, wood wool.
    const litter = Math.round(mix(0, 90, wear) * mix(0.4, 1, dense));
    if (litter > 0) s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#d9c08a', { roughness: 1 }), Array.from({ length: litter }, () => ({ at: [(random() - 0.5) * 5.6, 0.008, 0.2 + random() * 2.6] as [number, number, number], size: mix(0.012, 0.04, random()), color: pick(['#d9c08a', '#c9ab70', '#8a6a48', '#b9b0a0', '#5a4634']) })));

    // ---- The bare bulb ------------------------------------------------------------------------------------------------------
    const swing = group(root, [0.1, WALL_H + 0.3, 1.0]);
    const drop = WALL_H + 0.3 - 2.66;
    limb(swing, [0, 0, 0], [0, -drop + 0.1, 0], 0.006, 0.006, s.material('#2b2420'));
    part(swing, new THREE.CylinderGeometry(0.03, 0.036, 0.09, 12), s.material('#3a332c', { metalness: 0.4 }), [0, -drop + 0.06, 0]);
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff3cf', emissive: bulbColour, emissiveIntensity: 2.4, roughness: 0.2 });
    ball(swing, [0.06, 0.075, 0.06], [0, -drop - 0.05, 0], bulbMat).castShadow = false;
    const halo = part(swing, new THREE.SphereGeometry(0.3, 16, 10), new THREE.MeshBasicMaterial({ color: bulbColour, transparent: true, opacity: 0.14, depthWrite: false }), [0, -drop - 0.05, 0]);
    halo.castShadow = halo.receiveShadow = false;
    lamp.position.set(0, -drop - 0.05, 0);
    swing.add(lamp);
    const moth = mood.energy > 0.35 ? part(root, new THREE.ConeGeometry(0.02, 0.03, 3), s.material('#d9d0b8', { side: THREE.DoubleSide }), [0.1, 2.6, 1]) : null;

    // ---- Bracket shelves for whatever hangs on the wall ------------------------------------------------------------------------------
    const shelves = SLOTS.map((slot) => {
      if (slot.on !== 'wall') return null;
      const g = new THREE.Group();
      const slab = box(g, [1, 1, 1], [0, 0, 0], benchWood), left = box(g, [1, 1, 1], [0, 0, 0], benchDark), right = box(g, [1, 1, 1], [0, 0, 0], benchDark);
      g.visible = false;
      root.add(g);
      return { g, slab, left, right };
    });

    const baseLamp = lamp.intensity, flicker = Math.max(0, wear - 0.55) * 1.6, sway = mix(0.004, 0.06, mood.energy);
    return {
      object: root, camera, background: new THREE.Color(tone(wallBase).lerp(new THREE.Color('#d8d2c2'), 0.35)), ground: floor, keyLight: key, capacity: SLOTS.length,
      place(items: readonly Placeable[]) {
        for (const shelf of shelves) if (shelf) shelf.g.visible = false;
        items.slice(0, SLOTS.length).forEach((item, index) => {
          const slot = SLOTS[index], holder = item.holder;
          let scale = Math.min(slot.maxH / Math.max(item.height, 0.05), slot.maxR / Math.max(item.radius, 0.05));
          const measure = () => { holder.scale.setScalar(scale); holder.position.set(0, 0, 0); holder.rotation.set(0, slot.on === 'wall' ? 0 : (context.random() - 0.5) * 0.5, 0); holder.updateMatrixWorld(true); return visibleBounds(holder); };
          let b = measure();
          if (slot.on === 'wall') {
            const depth = b.max.z - b.min.z;
            if (depth > 0.62) { scale *= 0.62 / depth; b = measure(); }
            const d = b.max.z - b.min.z + 0.05, w = b.max.x - b.min.x + 0.14;
            holder.position.set(slot.x - (b.min.x + b.max.x) / 2, slot.y, 0.012 - b.min.z);
            const shelf = shelves[index]!;
            shelf.g.visible = true;
            shelf.g.position.set(slot.x, slot.y, 0);
            shelf.slab.scale.set(w, 0.035, d); shelf.slab.position.set(0, -0.0175, d / 2);
            for (const [bracket, sx] of [[shelf.left, -1], [shelf.right, 1]] as const) { bracket.scale.set(0.035, 0.2, d * 0.7); bracket.position.set(sx * (w / 2 - 0.07), -0.135, d * 0.35); }
          } else holder.position.set(slot.x, slot.y, slot.z);
          holder.updateMatrixWorld(true);
        });
      },
      update(_dt, time) {
        swing.rotation.z = Math.sin(time * 1.3) * sway;
        swing.rotation.x = Math.sin(time * 0.9 + 1) * sway * 0.5;
        const dip = flicker > 0 && Math.sin(time * 23) * Math.sin(time * 7.3) > 0.82 ? 1 - flicker * 0.6 : 1;
        lamp.intensity = baseLamp * dip; bulbMat.emissiveIntensity = 2.4 * dip;
        if (moth) { const t = time * mix(2, 7, mood.energy); moth.position.set(0.1 + Math.cos(t) * 0.28, 2.62 + Math.sin(t * 1.7) * 0.12, 1 + Math.sin(t) * 0.28); moth.rotation.set(t * 3, t, 0); }
        if (breathe) breathe.scale.y = 0.07 * (1 + Math.sin(time * 1.6) * 0.06);
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
