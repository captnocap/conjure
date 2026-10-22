import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];
type Cut = { kind: 'rect' | 'pill' | 'disc'; x: number; z: number; w: number; d: number; rot?: number };

// Inner foam tray of the base, metres, centred on the case.
const FW = 0.47, FD = 0.34;
const CW = 512, CD = Math.round(CW * FD / FW);
const PPM = CW / FW;

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const RIFLE: Cut[] = [
  { kind: 'pill', x: -0.03, z: -0.112, w: 0.35, d: 0.03 },
  { kind: 'rect', x: -0.07, z: -0.042, w: 0.175, d: 0.06 },
  { kind: 'rect', x: 0.115, z: -0.042, w: 0.165, d: 0.078 },
  { kind: 'pill', x: -0.06, z: 0.034, w: 0.175, d: 0.042 },
  { kind: 'rect', x: 0.1, z: 0.055, w: 0.036, d: 0.112 },
  { kind: 'rect', x: 0.15, z: 0.055, w: 0.036, d: 0.112 },
  { kind: 'pill', x: -0.095, z: 0.112, w: 0.155, d: 0.036 },
  ...[0, 1, 2, 3, 4, 5].map((i): Cut => ({ kind: 'disc', x: 0.01 + i * 0.017, z: 0.112, w: 0.013, d: 0.013 })),
];
const SYRINGE: Cut[] = [
  { kind: 'pill', x: -0.06, z: -0.095, w: 0.22, d: 0.032 },
  ...[0, 1, 2, 3, 4].map((i): Cut => ({ kind: 'disc', x: -0.13 + i * 0.05, z: 0.03, w: 0.03, d: 0.03 })),
  { kind: 'rect', x: 0.11, z: 0.095, w: 0.1, d: 0.06 },
  { kind: 'rect', x: -0.08, z: 0.1, w: 0.12, d: 0.045 },
];
const VIOLIN_ROT = 0.5;
const VIOLIN: Cut[] = [
  { kind: 'rect', x: -0.04, z: 0.02, w: 0.19, d: 0.12, rot: VIOLIN_ROT },
  { kind: 'pill', x: 0.1, z: -0.056, w: 0.19, d: 0.03, rot: VIOLIN_ROT },
  { kind: 'pill', x: 0.02, z: 0.105, w: 0.36, d: 0.022, rot: VIOLIN_ROT },
  { kind: 'disc', x: -0.15, z: -0.1, w: 0.05, d: 0.05 },
];
const CAMERA: Cut[] = [
  { kind: 'rect', x: -0.1, z: -0.045, w: 0.155, d: 0.1 },
  { kind: 'disc', x: 0.055, z: -0.06, w: 0.072, d: 0.072 },
  { kind: 'disc', x: 0.14, z: -0.06, w: 0.06, d: 0.06 },
  { kind: 'rect', x: 0.11, z: 0.075, w: 0.095, d: 0.055 },
  { kind: 'rect', x: -0.08, z: 0.09, w: 0.09, d: 0.045 },
  { kind: 'rect', x: 0.0, z: 0.09, w: 0.045, d: 0.045 },
];
const CASH: Cut[] = [{ kind: 'rect', x: 0, z: 0, w: 0.405, d: 0.29 }];

export default defineThing({
  questions: {
    contents: choice('What do the foam cutouts hold?', {
      rifle: 'A rifle broken into parts: barrel, receiver, stock, scope, two magazines, a suppressor and a row of rounds.',
      cash: 'Stacks of banded cash packed edge to edge.',
      syringe: 'A syringe, a row of glass vials and a small zipped pouch.',
      empty: 'Nothing: only the dark empty silhouettes of what was taken out.',
      violin: 'A small violin and its bow, laid on the diagonal.',
      camera: 'A camera body, two spare lenses, a flash and batteries.',
    }),
    lid: choice('How far is the lid open?', {
      open: 'Stood upright, leaning a little back.',
      half: 'Half open, tilted like a hand about to close it.',
      wide: 'Thrown fully back so both halves lie flat.',
    }),
    rests: choice('What does the case lie on?', {
      bed: 'The tight white cover of a hotel bed.',
      desk: 'A dark wooden desk.',
      floor: 'The floor, on a patch of hotel carpet.',
    }),
    shell: choice('What is the shell like?', {
      black: 'Matte black polycarbonate, anonymous.',
      aluminium: 'Brushed silver aluminium with ribbed panels.',
      leather: 'Tan leather over a hard frame, worn at the corners.',
      olive: 'Olive drab military-style composite.',
      burgundy: 'Deep burgundy with brass fittings, an older gentleman\'s case.',
    }),
    glove: noul('Does a black leather glove rest inside, dropped on the foam?'),
    extra: choice('What small thing tells the rest of the story?', {
      none: 'Nothing else.',
      tag: 'A paper airline tag hanging from the handle.',
      passport: 'A passport tucked under the elastic in the lid.',
      note: 'A folded note dropped on the foam.',
      key: 'A small key left in the lock.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    // ---- surface ------------------------------------------------------------------------
    let top = 0.012;
    if (a.rests === 'bed') {
      s.box([0.95, 0.36, 0.74], [0, 0.18, 0], s.material('#4b4642', { roughness: 0.9 }));
      s.box([0.99, 0.09, 0.78], [0, 0.405, 0], s.material('#f1efe8', { roughness: 0.95 }));
      s.box([0.99, 0.012, 0.18], [0, 0.456, -0.12], s.material('#e6e3da', { roughness: 0.95 }));
      const pillow = s.box([0.4, 0.1, 0.24], [-0.27, 0.5, -0.26], s.material('#f6f4ef', { roughness: 0.95 }));
      pillow.rotation.y = (random() - 0.5) * 0.2;
      top = 0.45;
    } else if (a.rests === 'desk') {
      const wood = s.material('#4a3526', { roughness: 0.45 });
      s.box([0.84, 0.03, 0.64], [0, 0.705, 0], wood);
      for (const x of [-0.405, 0.405]) s.box([0.03, 0.69, 0.58], [x, 0.345, 0], wood);
      s.box([0.79, 0.2, 0.02], [0, 0.58, -0.29], wood);
      top = 0.72;
    } else {
      const carpet = paint(256, 256, (g, w, h) => {
        g.fillStyle = '#5a4a52'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(190,150,110,0.55)'; g.lineWidth = 3;
        for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { g.beginPath(); g.arc(i * 43 + 21, j * 43 + 21, 13, 0, 7); g.stroke(); g.strokeRect(i * 43 + 4, j * 43 + 4, 34, 34); }
      });
      carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping; carpet.repeat.set(2.6, 2);
      s.box([0.8, 0.012, 0.62], [0, 0.006, 0], new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }));
    }

    // ---- case base ----------------------------------------------------------------------
    const kase = new THREE.Group();
    kase.position.set(a.rests === 'bed' ? 0.1 : 0, top, 0.04);
    kase.rotation.y = (random() - 0.5) * 0.16;
    s.root.add(kase);
    const add = (mesh: THREE.Object3D, parent: THREE.Object3D = kase) => { parent.add(mesh); return mesh; };
    const shellColour = { black: '#1e1e21', aluminium: '#b9bdc1', leather: '#8a5a33', olive: '#4b5238', burgundy: '#5c2029' }[a.shell];
    const shell = s.material(shellColour, { metalness: a.shell === 'aluminium' ? 0.8 : 0.15, roughness: a.shell === 'aluminium' ? 0.3 : a.shell === 'leather' ? 0.7 : 0.5 });
    const trim = s.material(a.shell === 'burgundy' || a.shell === 'leather' ? '#c9a24a' : '#b8bcc0', { metalness: 0.85, roughness: 0.3 });
    const W = 0.5, D = 0.37, BH = 0.09, LH = 0.06, T = 0.012;
    // The base is a real tray: a slab and four walls, so the foam sits inside it.
    add(s.box([W, 0.01, D], [0, 0.005, 0], shell));
    for (const z of [-1, 1]) add(s.box([W, BH, T], [0, BH / 2, z * (D / 2 - T / 2)], shell));
    for (const x of [-1, 1]) add(s.box([T, BH, D - T * 2], [x * (W / 2 - T / 2), BH / 2, 0], shell));
    if (a.shell === 'aluminium') for (let i = 0; i < 5; i++) add(s.box([W + 0.004, 0.006, 0.26], [0, 0.015 + i * 0.015, 0], trim));
    for (const x of [-1, 1]) for (const z of [-1, 1]) add(s.box([0.028, BH + 0.004, 0.028], [x * (W / 2 - 0.012), BH / 2, z * (D / 2 - 0.012)], trim));
    // Latches, handle and hinge on the front and back edges.
    for (const x of [-0.15, 0.15]) add(s.box([0.04, 0.022, 0.012], [x, BH - 0.018, D / 2 + 0.005], trim));
    add(s.tube([[-0.065, BH - 0.03, D / 2], [-0.065, BH - 0.03, D / 2 + 0.03], [0, BH - 0.025, D / 2 + 0.045], [0.065, BH - 0.03, D / 2 + 0.03], [0.065, BH - 0.03, D / 2]], 0.008, s.material('#1a1a1c', { roughness: 0.6 })));
    add(s.cylinder(0.008, 0.008, W - 0.04, [0, BH, -D / 2], trim, 10)).rotation.z = Math.PI / 2;
    if (a.extra === 'key') add(s.box([0.006, 0.02, 0.016], [-0.15, BH - 0.018, D / 2 + 0.018], trim));

    // ---- the foam tray and its cutouts --------------------------------------------------
    const cuts = { rifle: RIFLE, cash: CASH, syringe: SYRINGE, empty: random() < 0.35 ? VIOLIN : RIFLE, violin: VIOLIN, camera: CAMERA }[a.contents];
    const foamTone = a.contents === 'cash' || a.contents === 'syringe' || a.contents === 'violin' ? '#4e5054' : '#9a9c9f';
    const foamMap = paint(CW, CD, (g, w, h) => {
      g.fillStyle = foamTone; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { g.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.12)'; g.fillRect(random() * w, random() * h, 2, 2); }
      const shape = (cut: Cut, inset: number) => {
        g.save();
        g.translate((cut.x + FW / 2) * PPM, (cut.z + FD / 2) * PPM);
        g.rotate(cut.rot ?? 0);
        const cw = cut.w * PPM - inset * 2, cd = cut.d * PPM - inset * 2;
        g.beginPath();
        if (cut.kind === 'disc') g.ellipse(0, 0, cw / 2, cd / 2, 0, 0, Math.PI * 2);
        else g.roundRect(-cw / 2, -cd / 2, cw, cd, cut.kind === 'pill' ? Math.min(cw, cd) / 2 : 4);
        g.restore();
      };
      for (const cut of cuts) {
        shape(cut, 0); g.fillStyle = '#1b1c1e'; g.fill();
        shape(cut, 3); g.fillStyle = '#2a2b2e'; g.fill();
        shape(cut, 0); g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2; g.stroke();
      }
    });
    const foamY = BH - T;
    const foam = add(s.mesh(new THREE.PlaneGeometry(FW, FD), new THREE.MeshStandardMaterial({ map: foamMap, roughness: 1 }), [0, foamY, 0]));
    foam.rotation.x = -Math.PI / 2;
    const bed = foamY - 0.012; // floor of a cutout: contents stand proud of the foam

    // ---- what the cutouts hold -----------------------------------------------------------
    const gun = s.material('#2f3236', { metalness: 0.65, roughness: 0.42 });
    const black = s.material('#17181a', { roughness: 0.55 });
    const brass = s.material('#c8a24a', { metalness: 0.8, roughness: 0.3 });
    const glass = new THREE.MeshStandardMaterial({ color: '#dfe9ea', transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false });
    const lay = (mesh: THREE.Mesh, height: number) => { mesh.position.y = bed + height / 2; return add(mesh); };
    if (a.contents === 'rifle') {
      lay(s.cylinder(0.013, 0.013, 0.34, [-0.03, 0, -0.112], gun, 12), 0.026).rotation.z = Math.PI / 2;
      lay(s.cylinder(0.016, 0.016, 0.05, [-0.19, 0, -0.112], gun, 12), 0.032).rotation.z = Math.PI / 2;
      lay(s.box([0.17, 0.034, 0.054], [-0.07, 0, -0.042], gun), 0.034);
      add(s.box([0.09, 0.008, 0.014], [-0.06, bed + 0.038, -0.042], black));
      add(s.box([0.02, 0.012, 0.03], [-0.13, bed + 0.036, -0.042], black));
      lay(s.box([0.16, 0.034, 0.07], [0.115, 0, -0.042], s.material(a.shell === 'leather' ? '#5a3a22' : '#26282b', { roughness: 0.5 })), 0.034);
      add(s.box([0.012, 0.036, 0.074], [0.195, bed + 0.018, -0.042], black));
      lay(s.cylinder(0.015, 0.015, 0.16, [-0.06, 0, 0.034], black, 14), 0.03).rotation.z = Math.PI / 2;
      for (const x of [-0.135, 0.015]) lay(s.cylinder(0.02, 0.02, 0.028, [x, 0, 0.034], black, 14), 0.04).rotation.z = Math.PI / 2;
      for (const x of [0.1, 0.15]) lay(s.box([0.028, 0.03, 0.1], [x, 0, 0.055], gun), 0.03);
      lay(s.cylinder(0.014, 0.014, 0.145, [-0.095, 0, 0.112], black, 12), 0.028).rotation.z = Math.PI / 2;
      for (let i = 0; i < 6; i++) if (random() < 0.85) lay(s.cylinder(0.005, 0.005, 0.03, [0.01 + i * 0.017, 0, 0.112], brass, 8), 0.03);
    } else if (a.contents === 'cash') {
      const bands = ['#7b8f74', '#6f8470', '#8a9a7e', '#c9c3a8'];
      for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) {
        if (random() < 0.12) continue;
        const h = mix(0.035, 0.05, random());
        const x = -0.16 + i * 0.08 + (random() - 0.5) * 0.006, z = -0.073 + j * 0.146 + (random() - 0.5) * 0.006;
        const bundle = lay(s.box([0.064, h, 0.138], [x, 0, z], s.material(bands[Math.floor(random() * 3)], { roughness: 0.85 })), h);
        bundle.rotation.y = (random() - 0.5) * 0.08;
        add(s.box([0.068, h * 0.5, 0.032], [x, bed + h / 2, z], s.material(random() < 0.3 ? '#d9b14a' : '#efe6d2', { roughness: 0.8 })));
      }
    } else if (a.contents === 'syringe') {
      lay(s.cylinder(0.0085, 0.0085, 0.11, [-0.09, 0, -0.095], glass, 12), 0.017).rotation.z = Math.PI / 2;
      lay(s.cylinder(0.0045, 0.0045, 0.085, [0.0, 0, -0.095], s.material('#e9ecef'), 8), 0.017).rotation.z = Math.PI / 2;
      lay(s.cylinder(0.012, 0.012, 0.012, [0.045, 0, -0.095], s.material('#e9ecef'), 10), 0.024).rotation.z = Math.PI / 2;
      lay(s.cylinder(0.0015, 0.0015, 0.045, [-0.165, 0, -0.095], trim, 6), 0.004).rotation.z = Math.PI / 2;
      for (let i = 0; i < 5; i++) {
        const x = -0.13 + i * 0.05;
        const tint = random() < 0.5 ? '#d9a63a' : '#dfe9ea';
        lay(s.cylinder(0.012, 0.012, 0.042, [x, 0, 0.03], new THREE.MeshStandardMaterial({ color: tint, transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false }), 12), 0.042);
        add(s.cylinder(0.0125, 0.0125, 0.009, [x, bed + 0.046, 0.03], trim, 12));
      }
      lay(s.box([0.09, 0.022, 0.05], [0.11, 0, 0.095], black), 0.022);
      add(s.box([0.09, 0.004, 0.004], [0.11, bed + 0.024, 0.095], trim));
      lay(s.box([0.11, 0.012, 0.035], [-0.08, 0, 0.1], s.material('#d8742a', { roughness: 0.7 })), 0.012);
    } else if (a.contents === 'violin') {
      const wood = s.material('#8f4a24', { roughness: 0.3 });
      const ebony = s.material('#1c1a18', { roughness: 0.4 });
      const violin = new THREE.Group();
      violin.position.set(0, bed, 0); violin.rotation.y = -VIOLIN_ROT;
      add(violin);
      const put = (mesh: THREE.Mesh) => { violin.add(mesh); return mesh; };
      put(s.ball([0.06, 0.015, 0.068], [-0.1, 0.015, 0.0], wood, 18));
      put(s.ball([0.052, 0.015, 0.058], [-0.0, 0.015, 0.0], wood, 18));
      put(s.box([0.07, 0.028, 0.072], [-0.05, 0.015, 0], wood));
      put(s.box([0.16, 0.01, 0.02], [0.1, 0.02, 0], wood));
      put(s.box([0.2, 0.006, 0.018], [0.06, 0.03, 0], ebony));
      put(s.ball([0.013, 0.013, 0.013], [0.19, 0.025, 0], wood, 10));
      put(s.box([0.03, 0.014, 0.03], [-0.13, 0.03, 0], ebony));
      put(s.box([0.004, 0.012, 0.03], [-0.03, 0.033, 0], s.material('#e4cf9a')));
      const bow = put(s.cylinder(0.003, 0.003, 0.36, [0.02, 0.008, 0.1], ebony, 8));
      bow.rotation.z = Math.PI / 2;
      put(s.box([0.33, 0.003, 0.004], [0.02, 0.008, 0.106], s.material('#f1ead8')));
      put(s.box([0.012, 0.012, 0.014], [-0.16, 0.008, 0.1], ebony));
      lay(s.cylinder(0.02, 0.02, 0.02, [-0.15, 0, -0.1], s.material('#3b2d22'), 14), 0.02);
    } else if (a.contents === 'camera') {
      const lens = (x: number, z: number, r: number) => {
        lay(s.cylinder(r, r, 0.05, [x, 0, z], black, 20), 0.05);
        add(s.cylinder(r * 0.8, r * 0.8, 0.004, [x, bed + 0.052, z], s.material('#1a2a4a', { metalness: 0.3, roughness: 0.1 }), 18));
        add(s.cylinder(r * 1.02, r * 1.02, 0.006, [x, bed + 0.028, z], trim, 20));
      };
      lay(s.box([0.145, 0.045, 0.09], [-0.1, 0, -0.045], black), 0.045);
      add(s.box([0.05, 0.02, 0.035], [-0.1, bed + 0.055, -0.06], black));
      add(s.cylinder(0.027, 0.027, 0.03, [-0.1, bed + 0.06, -0.025], black, 18));
      add(s.cylinder(0.02, 0.02, 0.004, [-0.1, bed + 0.077, -0.025], s.material('#1a2a4a', { metalness: 0.3, roughness: 0.1 }), 16));
      add(s.box([0.14, 0.004, 0.012], [-0.1, bed + 0.047, -0.085], trim));
      lens(0.055, -0.06, 0.033); lens(0.14, -0.06, 0.027);
      lay(s.box([0.085, 0.04, 0.045], [0.11, 0, 0.075], black), 0.04);
      add(s.box([0.05, 0.03, 0.004], [0.11, bed + 0.03, 0.098], s.material('#e8e4d6', { emissive: '#fff4d0', emissiveIntensity: 0.2 })));
      for (let i = 0; i < 2; i++) lay(s.box([0.035, 0.02, 0.038], [-0.1 + i * 0.04, 0, 0.09], s.material('#3a3e44')), 0.02);
      lay(s.box([0.035, 0.004, 0.028], [0, 0, 0.09], s.material('#2a6fd0')), 0.004);
    }

    // ---- lid ------------------------------------------------------------------------------
    const lid = new THREE.Group();
    lid.position.set(0, BH, -D / 2);
    lid.rotation.x = -{ open: 100, half: 40, wide: 168 }[a.lid] * Math.PI / 180;
    add(lid);
    const inLid = (mesh: THREE.Mesh) => { lid.add(mesh); return mesh; };
    inLid(s.box([W, LH, D], [0, LH / 2 + 0.01, D / 2], shell));
    for (const x of [-1, 1]) for (const z of [0, 1]) inLid(s.box([0.028, LH + 0.004, 0.028], [x * (W / 2 - 0.012), LH / 2 + 0.01, z === 0 ? 0.014 : D - 0.014], trim));
    if (a.shell === 'aluminium') for (let i = 0; i < 3; i++) inLid(s.box([W + 0.004, 0.006, 0.26], [0, 0.025 + i * 0.015, D / 2], trim));
    const crate = paint(256, 192, (g, w, h) => {
      g.fillStyle = foamTone; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 12; i++) for (let j = 0; j < 9; j++) {
        const x = i * 21.3 + 10 + (j % 2) * 10.5, y = j * 21.3 + 10;
        const r = g.createRadialGradient(x - 2, y - 3, 1, x, y, 11);
        r.addColorStop(0, 'rgba(255,255,255,0.22)'); r.addColorStop(0.6, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,0.3)');
        g.fillStyle = r; g.fillRect(x - 11, y - 11, 22, 22);
      }
    });
    const lidFoam = inLid(s.mesh(new THREE.PlaneGeometry(FW, FD), new THREE.MeshStandardMaterial({ map: crate, roughness: 1 }), [0, 0.0095, D / 2]));
    lidFoam.rotation.x = Math.PI / 2;
    if (a.extra === 'passport') {
      inLid(s.box([0.09, 0.012, 0.125], [0.12, 0.003, 0.19], s.material(random() < 0.5 ? '#5a1a2a' : '#1d2a4e', { roughness: 0.5 })));
      inLid(s.box([0.1, 0.014, 0.012], [0.12, 0.002, 0.19], black));
      inLid(s.box([0.03, 0.001, 0.03], [0.12, -0.0035, 0.2], trim));
    }

    // ---- small stories ------------------------------------------------------------------
    if (a.glove) {
      const leather = s.material('#141416', { roughness: 0.5 });
      const glove = new THREE.Group();
      glove.position.set(mix(-0.1, 0.12, random()), foamY + 0.012, 0.06 + random() * 0.05);
      glove.rotation.y = mix(-0.6, 0.6, random());
      add(glove);
      const palm = s.box([0.085, 0.016, 0.1], [0, 0.008, 0], leather); glove.add(palm);
      for (let i = 0; i < 4; i++) { const finger = s.box([0.017, 0.014, 0.075], [-0.031 + i * 0.021, 0.007, 0.08], leather); finger.rotation.x = -0.15 + i * 0.05; glove.add(finger); }
      const thumb = s.box([0.016, 0.014, 0.06], [0.055, 0.007, 0.02], leather); thumb.rotation.y = -0.6; glove.add(thumb);
      glove.add(s.box([0.09, 0.02, 0.03], [0, 0.009, -0.06], leather));
    }
    if (a.extra === 'tag') {
      const tag = s.box([0.03, 0.055, 0.002], [0.03, BH - 0.05, D / 2 + 0.04], s.material('#efe7cf', { roughness: 0.9 }));
      tag.rotation.z = 0.25; add(tag);
      add(s.box([0.022, 0.006, 0.0025], [0.028, BH - 0.058, D / 2 + 0.04], s.material('#c9302c')));
      add(s.rod([0.02, BH - 0.025, D / 2 + 0.045], [0.034, BH - 0.025, D / 2 + 0.04], 0.0015, s.material('#e9e6dd')));
    }
    if (a.extra === 'note') {
      const note = s.box([0.07, 0.006, 0.05], [mix(-0.14, -0.08, random()), foamY + 0.012, mix(0.05, 0.1, random())], s.material('#f1ecdc', { roughness: 0.9 }));
      note.rotation.y = (random() - 0.5) * 0.8; add(note);
    }

    return s.finish();
  },
});
