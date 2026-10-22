import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PAINT = {
  blue: 'Sky-blue enamel, the colour of half the stalls in the city.',
  green: 'Deep railway green with cream trim.',
  red: 'Loud signal red, sponsored by a tea brand.',
  yellow: 'Mustard yellow, sun-faded and friendly.',
  bare: 'Unpainted: bare wood and dull tin.',
} as const;
const PAINT_HEX: Record<keyof typeof PAINT, string> = { blue: '#3f8fc4', green: '#2f6b4c', red: '#c5352b', yellow: '#dba52c', bare: '#9a8468' };

const SIGNS = {
  chai: 'CHAI in fat hand-painted capitals.',
  tea: 'TEA STALL, official and stencilled.',
  cutting: 'CUTTING Rs 6, a price for a half glass.',
  irani: 'IRANI CHAI, an old cafe name.',
  hindi: 'Hand-brushed Devanagari lettering under its headline bar.',
  none: 'No words at all, just flaking paint.',
} as const;
const SIGN_TEXT: Record<keyof typeof SIGNS, string> = { chai: 'CHAI', tea: 'TEA STALL', cutting: 'CUTTING Rs 6', irani: 'IRANI CHAI', hindi: '', none: '' };

const SNACKS = {
  glucose: 'Pale rectangular glucose biscuits stacked on edge.',
  rusk: 'Brown twice-baked rusk toast in chunky slabs.',
  nankhatai: 'Round golden shortbread domes.',
  khari: 'Flaky puff-pastry sticks, tall and pale.',
  toffee: 'A jumble of bright wrapped sweets.',
} as const;

export default defineThing({
  questions: {
    stall: choice('How is the stall built?', {
      cart: 'A wooden handcart on two bicycle wheels with a tin roof on thin posts.',
      kiosk: 'A painted tin box kiosk with a propped-up awning flap.',
      table: 'A folding table under a big faded umbrella, set up fresh each morning.',
      counter: 'A licensed stainless-steel railway counter with a lit signboard overhead.',
    }),
    paint: choice('What colour is it painted?', PAINT),
    sign: choice('What does the signboard say?', SIGNS),
    poured: score('How many glasses of tea stand poured and waiting?', ['None, the rack is empty and upturned', 'Two or three', 'Half the rack', 'A dozen, the whole rack steaming']),
    jars: choice('How many snack jars stand on the counter?', {
      none: 'No jars, tea only.',
      two: 'Two jars.',
      four: 'Four jars in a row.',
      six: 'Six jars crowding the back of the counter.',
    }),
    snack: choice('What is in the jars?', SNACKS),
    stove: choice('What is the stove doing?', {
      cold: 'Cold and unlit, the kettle set aside, before dawn or after the last train.',
      simmer: 'A low blue flame, the kettle breathing a thread of steam.',
      rolling: 'A roaring flame and a kettle boiling hard, steam billowing.',
    }),
    abandoned: noul('Has someone left a half-drunk glass on the edge of the counter when their train came?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => mix(lo, hi, random());
    const H = 0.86, W = 1.36, D = 0.62;

    const paintHex = PAINT_HEX[a.paint];
    const paint = s.material(paintHex, { roughness: 0.55 });
    const trim = s.material(a.paint === 'bare' ? '#6f5a41' : '#ece2c4');
    const wood = s.material('#8a6a45', { roughness: 0.85 });
    const darkWood = s.material('#57412b', { roughness: 0.9 });
    const tin = s.material('#aab0ad', { metalness: 0.55, roughness: 0.5 });
    const steel = s.material('#cfd4d4', { metalness: 0.8, roughness: 0.28 });
    const soot = s.material(new THREE.Color('#3a3733').lerp(new THREE.Color('#141312'), mood.wear), { metalness: 0.35, roughness: 0.7 });
    const brass = s.material('#b98a35', { metalness: 0.75, roughness: 0.35 });
    const rubber = s.material('#22201f', { roughness: 0.9 });
    const glass = new THREE.MeshStandardMaterial({ color: '#e9f4f2', transparent: true, opacity: 0.3, roughness: 0.08, depthWrite: false });
    const tea = s.material(new THREE.Color('#b0703a').lerp(new THREE.Color('#d39a5c'), mood.warmth * 0.6), { roughness: 0.3 });

    const canvasTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    // ---- signboard texture -------------------------------------------------
    const signInk = a.paint === 'yellow' || a.paint === 'bare' ? '#7a1f18' : '#fff3c9';
    const signPaper = a.paint === 'bare' ? '#d9cfae' : a.paint === 'yellow' ? '#f1d36a' : paintHex;
    const signTexture = canvasTexture(512, 128, (ctx) => {
      ctx.fillStyle = signPaper; ctx.fillRect(0, 0, 512, 128);
      ctx.strokeStyle = signInk; ctx.lineWidth = 6; ctx.strokeRect(8, 8, 496, 112);
      ctx.fillStyle = signInk; ctx.strokeStyle = signInk;
      if (a.sign === 'hindi') {
        // Faux Devanagari: a headline bar with stems, bowls and hooks hanging from it.
        ctx.lineWidth = 11; ctx.lineCap = 'round';
        let x = 110;
        for (let g = 0; g < 5; g++) {
          const w = 40 + random() * 22;
          ctx.beginPath(); ctx.moveTo(x - 6, 36); ctx.lineTo(x + w + 6, 36); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + w, 36); ctx.lineTo(x + w, 98); ctx.stroke();
          ctx.beginPath();
          if (g % 3 === 0) ctx.arc(x + w * 0.45, 68, w * 0.4, -0.4, Math.PI * 1.25);
          else if (g % 3 === 1) { ctx.moveTo(x + 4, 50); ctx.quadraticCurveTo(x + w, 60, x + 8, 96); }
          else { ctx.arc(x + w * 0.4, 60, w * 0.3, Math.PI * 0.5, Math.PI * 2.1); ctx.lineTo(x + 6, 98); }
          ctx.stroke();
          if (g === 1 || g === 3) { ctx.beginPath(); ctx.arc(x + w * 0.6, 22, 9, Math.PI, 0); ctx.stroke(); }
          x += w + 22;
        }
      } else if (a.sign !== 'none') {
        const text = SIGN_TEXT[a.sign];
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.min(84, 760 / text.length)}px sans-serif`;
        ctx.fillText(text, 256, 68, 470);
      }
      // Flaking and grime, by wear.
      for (let i = 0; i < 40 + mood.wear * 260; i++) {
        ctx.fillStyle = random() < 0.5 ? 'rgba(60,45,30,0.35)' : 'rgba(230,220,200,0.35)';
        ctx.fillRect(random() * 512, random() * 128, 2 + random() * 14 * mood.wear, 2 + random() * 6);
      }
    });
    const sign = (w: number, h: number, at: [number, number, number], tilt = 0) => {
      s.box([w + 0.04, h + 0.04, 0.03], [at[0], at[1], at[2] - 0.018], trim).rotation.x = tilt;
      const face = s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.8 }), at);
      face.rotation.x = tilt;
      return face;
    };

    // ---- the body ----------------------------------------------------------
    const top = (material: THREE.Material) => s.box([W + 0.06, 0.035, D + 0.06], [0, H - 0.018, 0], material);
    if (a.stall === 'cart') {
      top(darkWood);
      s.box([W, 0.36, D], [0, H - 0.21, 0], paint);
      for (let i = 0; i < 7; i++) s.box([0.012, 0.36, 0.006], [-W / 2 + 0.1 + i * (W - 0.2) / 6, H - 0.21, D / 2 + 0.003], darkWood);
      s.box([W - 0.06, 0.05, 0.02], [0, H - 0.07, D / 2 + 0.012], trim);
      // Axle, bicycle wheels with spokes, a front prop leg and push handles.
      s.rod([-W / 2 - 0.06, 0.33, 0.02], [W / 2 + 0.06, 0.33, 0.02], 0.014, soot);
      for (const side of [-1, 1]) {
        const x = side * (W / 2 + 0.05);
        const tyre = s.ring(0.31, 0.022, [x, 0.33, 0.02], rubber); tyre.rotation.y = Math.PI / 2;
        const rim = s.ring(0.285, 0.008, [x, 0.33, 0.02], steel); rim.rotation.y = Math.PI / 2;
        for (let k = 0; k < 10; k++) {
          const t = (k / 10) * Math.PI * 2;
          s.rod([x, 0.33, 0.02], [x, 0.33 + Math.sin(t) * 0.285, 0.02 + Math.cos(t) * 0.285], 0.003, steel);
        }
        s.cylinder(0.03, 0.03, 0.05, [x, 0.33, 0.02], soot, 10).rotation.z = Math.PI / 2;
        s.rod([side * (W / 2 - 0.12), H - 0.2, -D / 2], [side * (W / 2 - 0.12), H - 0.06, -D / 2 - 0.34], 0.016, wood);
      }
      s.rod([-W / 2 + 0.12, H - 0.06, -D / 2 - 0.34], [W / 2 - 0.12, H - 0.06, -D / 2 - 0.34], 0.016, wood);
      for (const x of [-0.42, 0.42]) s.box([0.05, H - 0.39, 0.05], [x, (H - 0.39) / 2, D / 2 - 0.06], darkWood);
      s.box([W - 0.2, 0.02, D - 0.12], [0, 0.44, 0], darkWood);
      // Tin roof on four thin posts.
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * (W / 2 - 0.03), H, z * (D / 2 - 0.03)], [x * (W / 2 - 0.03), 1.96 + (z < 0 ? 0 : 0.1), z * (D / 2 - 0.03)], 0.014, darkWood);
      const roof = s.box([W + 0.3, 0.018, D + 0.34], [0, 2.02, 0.02], tin); roof.rotation.x = -0.14;
      for (let i = 0; i < 12; i++) { const rib = s.box([0.03, 0.014, D + 0.34], [-W / 2 - 0.13 + i * (W + 0.26) / 11, 2.034, 0.02], tin); rib.rotation.x = -0.14; }
      sign(W * 0.82, 0.2, [0, 1.84, D / 2 + 0.2], 0);
      s.rod([-W * 0.38, 1.93, D / 2 + 0.19], [-W * 0.38, 2.0, D / 2 + 0.1], 0.006, soot);
      s.rod([W * 0.38, 1.93, D / 2 + 0.19], [W * 0.38, 2.0, D / 2 + 0.1], 0.006, soot);
    } else if (a.stall === 'kiosk') {
      top(tin);
      s.box([W, H - 0.05, D], [0, (H - 0.05) / 2, 0], paint);
      s.box([W + 0.02, 0.08, D + 0.02], [0, 0.04, 0], soot);
      for (const x of [-0.34, 0.34]) { s.box([0.56, 0.5, 0.012], [x, 0.44, D / 2 + 0.006], trim); s.box([0.5, 0.44, 0.012], [x, 0.44, D / 2 + 0.012], paint); }
      s.cylinder(0.02, 0.02, 0.012, [0.02, 0.5, D / 2 + 0.02], brass, 10).rotation.x = Math.PI / 2;
      // Tall back box with shelves and the awning flap propped on two rods.
      s.box([W, 1.1, 0.05], [0, H + 0.55, -D / 2 + 0.025], paint);
      for (const x of [-1, 1]) s.box([0.04, 1.1, D * 0.55], [x * (W / 2 - 0.02), H + 0.55, -D / 2 + D * 0.275], paint);
      s.box([W, 0.04, D * 0.6], [0, H + 1.1, -D / 2 + D * 0.3], paint);
      s.box([W - 0.1, 0.02, 0.16], [0, H + 0.62, -D / 2 + 0.12], trim);
      const flap = s.box([W, 0.025, 0.5], [0, H + 1.16, D / 2 + 0.05], paint); flap.rotation.x = -0.3;
      for (const x of [-1, 1]) s.rod([x * (W / 2 - 0.05), H + 0.02, D / 2 - 0.02], [x * (W / 2 - 0.05), H + 1.2, D / 2 + 0.24], 0.01, soot);
      sign(W * 0.86, 0.2, [0, H + 1.12, D / 2 + 0.3], 0);
    } else if (a.stall === 'table') {
      top(wood);
      s.box([W, 0.05, D], [0, H - 0.055, 0], darkWood);
      for (const x of [-1, 1]) {
        s.rod([x * (W / 2 - 0.1), 0, -D / 2 + 0.06], [x * (W / 2 - 0.1), H - 0.07, D / 2 - 0.06], 0.018, tin);
        s.rod([x * (W / 2 - 0.1), 0, D / 2 - 0.06], [x * (W / 2 - 0.1), H - 0.07, -D / 2 + 0.06], 0.018, tin);
      }
      s.rod([-W / 2 + 0.1, 0.42, 0], [W / 2 - 0.1, 0.42, 0], 0.012, tin);
      // A cloth over the front and the big umbrella on its pole.
      const cloth = s.box([W * 0.9, 0.34, 0.008], [0, H - 0.2, D / 2 + 0.035], paint);
      cloth.rotation.x = 0.03;
      s.rod([-0.52, 0, -0.36], [-0.46, 2.12, -0.2], 0.018, darkWood);
      const canopy = new THREE.Group();
      const panels = 8;
      for (let i = 0; i < panels; i++) {
        const t0 = (i / panels) * Math.PI * 2, t1 = ((i + 1) / panels) * Math.PI * 2, r = 0.98;
        const shape = new THREE.BufferGeometry();
        shape.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.3, 0, Math.sin(t0) * r, 0, Math.cos(t0) * r, Math.sin(t1) * r, 0, Math.cos(t1) * r], 3));
        shape.computeVertexNormals();
        const panel = new THREE.Mesh(shape, i % 2 ? paint : trim);
        (panel.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
        panel.castShadow = true;
        canopy.add(panel);
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.02, 5), soot);
        rib.position.set(Math.sin(t0) * r / 2, 0.15, Math.cos(t0) * r / 2);
        rib.lookAt(Math.sin(t0) * r, 0, Math.cos(t0) * r); rib.rotateX(Math.PI / 2);
        canopy.add(rib);
      }
      canopy.position.set(-0.46, 2.0, -0.2); canopy.rotation.set(0.1, random() * 0.6, -0.06);
      s.root.add(canopy);
      const board = sign(0.7, 0.2, [0.2, 0.3, D / 2 + 0.14], -0.3);
      board.position.y = 0.3;
    } else {
      top(steel);
      s.box([W, H - 0.05, D], [0, (H - 0.05) / 2, 0], steel);
      s.box([W - 0.08, 0.26, 0.012], [0, H - 0.22, D / 2 + 0.006], paint);
      s.box([W + 0.02, 0.1, D + 0.02], [0, 0.05, 0], soot);
      for (let i = 0; i < 3; i++) s.box([0.005, H - 0.2, 0.005], [-W / 4 + i * W / 4, H / 2, D / 2 + 0.004], soot);
      // Glass display front, two posts and an overhead lit board.
      const pane = new THREE.MeshStandardMaterial({ color: '#dff1ee', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false });
      s.box([0.62, 0.3, 0.01], [0.33, H + 0.15, D / 2 - 0.02], pane);
      s.box([0.64, 0.015, 0.2], [0.33, H + 0.305, D / 2 - 0.11], steel);
      for (const x of [-1, 1]) s.box([0.04, 1.28, 0.04], [x * (W / 2 - 0.02), H + 0.64, -D / 2 + 0.02], steel);
      s.box([W + 0.06, 0.3, 0.1], [0, H + 1.2, -D / 2 + 0.06], soot);
      const lit = sign(W, 0.24, [0, H + 1.2, -D / 2 + 0.115], 0);
      const lm = lit.material as THREE.MeshStandardMaterial;
      lm.emissive = new THREE.Color('#ffffff'); lm.emissiveMap = signTexture; lm.emissiveIntensity = mix(0.25, 0.75, mood.cheer);
      s.box([W - 0.1, 0.02, 0.18], [0, H + 0.72, -D / 2 + 0.12], steel);
    }

    // ---- the stove and kettle ----------------------------------------------
    const lit = a.stove !== 'cold';
    const sx = -0.36, sz = -0.04;
    s.lathe([[0, 0], [0.1, 0], [0.115, 0.02], [0.115, 0.075], [0.09, 0.1], [0.03, 0.11], [0.03, 0.17], [0, 0.17]], brass, [sx, H, sz]);
    s.cylinder(0.012, 0.012, 0.07, [sx + 0.12, H + 0.07, sz + 0.03], brass, 8).rotation.z = -0.7;
    for (let k = 0; k < 3; k++) {
      const t = (k / 3) * Math.PI * 2 + 0.5;
      s.rod([sx + Math.cos(t) * 0.11, H, sz + Math.sin(t) * 0.11], [sx + Math.cos(t) * 0.1, H + 0.235, sz + Math.sin(t) * 0.1], 0.007, soot);
      s.rod([sx + Math.cos(t) * 0.1, H + 0.235, sz + Math.sin(t) * 0.1], [sx + Math.cos(t) * 0.02, H + 0.235, sz + Math.sin(t) * 0.02], 0.006, soot);
    }
    s.cylinder(0.045, 0.035, 0.03, [sx, H + 0.185, sz], soot, 14);
    let flame: THREE.Mesh | null = null;
    if (lit) {
      flame = s.mesh(new THREE.ConeGeometry(0.05, a.stove === 'rolling' ? 0.075 : 0.04, 12), new THREE.MeshStandardMaterial({ color: '#4d8dff', emissive: '#3f7dff', emissiveIntensity: 2.2, transparent: true, opacity: 0.85, depthWrite: false }), [sx, H + 0.215, sz]);
      flame.castShadow = false;
    }
    // Kettle: on the stove, or set aside when the stove is cold.
    const kettle = new THREE.Group();
    const kb = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.105, 0], [0.135, 0.03], [0.14, 0.09], [0.115, 0.17], [0.07, 0.2], [0.065, 0.21], [0, 0.21]].map(([x, y]) => new THREE.Vector2(x, y)), 24), soot);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), soot);
    lid.position.y = 0.205; lid.scale.y = 0.45;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), brass); knob.position.y = 0.245;
    const spout = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.11, 0.05, 0), new THREE.Vector3(0.19, 0.1, 0), new THREE.Vector3(0.23, 0.19, 0), new THREE.Vector3(0.275, 0.215, 0)]), 16, 0.02, 8), soot);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.009, 6, 24, Math.PI), soot); handle.position.y = 0.2;
    kettle.add(kb, lid, knob, spout, handle);
    kettle.traverse((n) => { (n as THREE.Mesh).castShadow = true; });
    const ky = lit ? H + 0.24 : H;
    kettle.position.set(lit ? sx : sx + 0.3, ky, lit ? sz : sz + 0.08);
    kettle.rotation.y = lit ? -0.5 + rnd(-0.3, 0.3) : 0.9 + rnd(-0.4, 0.4);
    s.root.add(kettle);
    // A dented milk pan and a strainer beside the stove.
    s.cylinder(0.085, 0.07, 0.07, [sx - 0.02, H + 0.035, sz + 0.24], tin, 16);
    s.rod([sx + 0.06, H + 0.07, sz + 0.24], [sx + 0.22, H + 0.085, sz + 0.27], 0.007, soot);

    // ---- glasses -----------------------------------------------------------
    const glassGeo = new THREE.CylinderGeometry(0.036, 0.026, 0.1, 12, 1, true);
    const teaGeo = new THREE.CylinderGeometry(0.033, 0.025, 0.075, 12);
    const total = 12;
    const full = Math.round(a.poured * total);
    const spots: [number, number][] = [];
    // A wire carrier of six, then a second rank on a steel tray.
    for (let i = 0; i < 6; i++) spots.push([0.02 + (i % 3) * 0.085, D / 2 - 0.2 + Math.floor(i / 3) * 0.085]);
    for (let i = 0; i < 6; i++) spots.push([0.32 + (i % 3) * 0.085 + rnd(-0.006, 0.006), D / 2 - 0.2 + Math.floor(i / 3) * 0.085 + rnd(-0.006, 0.006)]);
    const steamAt: [number, number, number][] = [];
    const carrierY = H + 0.012;
    s.box([0.27, 0.008, 0.18], [0.105, H + 0.004, D / 2 - 0.1625], steel);
    for (const x of [-0.025, 0.235]) s.rod([x, H + 0.008, D / 2 - 0.1625], [x, H + 0.2, D / 2 - 0.1625], 0.004, steel);
    s.rod([-0.025, H + 0.2, D / 2 - 0.1625], [0.235, H + 0.2, D / 2 - 0.1625], 0.005, steel);
    s.box([0.28, 0.006, 0.19], [0.405, H + 0.003, D / 2 - 0.1625], tin);
    spots.forEach(([x, z], i) => {
      const filled = i < full;
      const g = s.mesh(glassGeo, glass, [x, carrierY + 0.05, z]);
      g.castShadow = false;
      if (filled) {
        s.mesh(teaGeo, tea, [x, carrierY + 0.04, z]);
        if (i % 2 === 0) steamAt.push([x, carrierY + 0.1, z]);
      } else {
        // Empty ones stand upturned, drying.
        g.rotation.x = Math.PI;
        s.cylinder(0.026, 0.026, 0.004, [x, carrierY + 0.1, z], steel, 10);
      }
    });
    if (a.abandoned) {
      const ax = -W / 2 + 0.09, az = D / 2 - 0.03;
      const lonely = s.mesh(glassGeo, glass, [ax, H + 0.05, az]); lonely.castShadow = false;
      s.mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.04, 12), tea, [ax, H + 0.022, az]);
      // A ring of spilt tea and a coin left in a hurry.
      s.cylinder(0.05, 0.05, 0.002, [ax + 0.02, H + 0.001, az - 0.01], s.material('#7a4c26', { roughness: 0.25 }), 16);
      s.cylinder(0.014, 0.014, 0.003, [ax + 0.1, H + 0.002, az - 0.02], brass, 10);
      s.cylinder(0.012, 0.012, 0.003, [ax + 0.125, H + 0.002, az + 0.005], steel, 10);
    }

    // ---- snack jars --------------------------------------------------------
    const jarCount = { none: 0, two: 2, four: 4, six: 6 }[a.jars];
    const lidRed = s.material('#c4372c', { roughness: 0.45 });
    const snackMaterial = {
      glucose: s.material('#e3c489'), rusk: s.material('#a86a34'), nankhatai: s.material('#dfae58'), khari: s.material('#e6cf9c'), toffee: s.material('#ffffff'),
    }[a.snack];
    const snackGeo: THREE.BufferGeometry = {
      glucose: new THREE.BoxGeometry(0.055, 0.04, 0.008), rusk: new THREE.BoxGeometry(0.07, 0.035, 0.018), nankhatai: new THREE.SphereGeometry(0.024, 8, 5),
      khari: new THREE.BoxGeometry(0.02, 0.085, 0.02), toffee: new THREE.OctahedronGeometry(0.016),
    }[a.snack];
    const sweets = ['#e23b3b', '#f2c230', '#3aa6d8', '#5fc04f', '#e86fb0', '#f08a2c'];
    const bits: { at: [number, number, number]; size: number; color?: string }[] = [];
    for (let j = 0; j < jarCount; j++) {
      const jx = W / 2 - 0.1 - j * 0.175, jz = -D / 2 + 0.12 + (j % 2) * 0.03;
      if (jx < sx + 0.24) break;
      const jh = 0.2 + (j % 3) * 0.02;
      const jar = s.cylinder(0.075, 0.075, jh, [jx, H + jh / 2, jz], glass, 16); jar.castShadow = false;
      s.cylinder(0.062, 0.07, 0.035, [jx, H + jh + 0.017, jz], lidRed, 16);
      s.ball([0.018, 0.012, 0.018], [jx, H + jh + 0.04, jz], lidRed, 8);
      const fill = mix(0.25, 0.95, mood.density) * rnd(0.7, 1);
      const n = Math.round(fill * 16);
      for (let k = 0; k < n; k++) {
        const t = random() * Math.PI * 2, r = random() * 0.042;
        bits.push({ at: [jx + Math.cos(t) * r, H + 0.03 + (k / 16) * (jh - 0.05), jz + Math.sin(t) * r], size: 1, color: a.snack === 'toffee' ? sweets[Math.floor(random() * sweets.length)] : undefined });
      }
    }
    if (bits.length) {
      const scattered = s.scatter(snackGeo, snackMaterial, bits);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
      bits.forEach((bit, i) => {
        q.setFromEuler(new THREE.Euler(a.snack === 'khari' ? rnd(-0.2, 0.2) : rnd(-0.5, 0.5), random() * Math.PI, a.snack === 'khari' ? rnd(-0.2, 0.2) : rnd(-0.6, 0.6)));
        scattered.setMatrixAt(i, m.compose(p.set(...bit.at), q, one));
      });
      scattered.instanceMatrix.needsUpdate = true;
    } else snackGeo.dispose();

    // ---- clutter by density, cheer and wear --------------------------------
    if (mood.density > 0.35) {
      // A stack of spare steel plates and a sugar tin.
      s.cylinder(0.06, 0.055, 0.11, [-W / 2 + 0.1, H + 0.055, -D / 2 + 0.1], s.material('#d9c23c', { metalness: 0.4 }), 14);
      s.cylinder(0.062, 0.062, 0.012, [-W / 2 + 0.1, H + 0.116, -D / 2 + 0.1], steel, 14);
    }
    if (mood.density > 0.6) {
      // A bucket of rinse water on the ground and a kerosene can.
      s.cylinder(0.15, 0.115, 0.26, [W / 2 + 0.24, 0.13, D / 2 - 0.05], s.material('#3c78b4', { roughness: 0.5 }), 16);
      s.cylinder(0.135, 0.135, 0.004, [W / 2 + 0.24, 0.235, D / 2 - 0.05], s.material('#8fa9a6', { roughness: 0.15 }), 16);
      s.box([0.17, 0.26, 0.11], [-W / 2 - 0.2, 0.13, -0.1], s.material('#7d8f3c', { metalness: 0.3 }));
      s.cylinder(0.02, 0.02, 0.04, [-W / 2 - 0.15, 0.28, -0.1], soot, 8);
    }
    if (mood.cheer > 0.55 && a.stall !== 'counter') {
      // A string of marigolds along the front edge.
      const marigold = ['#f59a1b', '#f7c21d', '#ee7a12'];
      const beads: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i <= 26; i++) {
        const u = i / 26;
        beads.push({ at: [(u - 0.5) * (W - 0.1), H - 0.06 - Math.sin(u * Math.PI) * 0.09, D / 2 + 0.045], size: 1, color: marigold[i % 3] });
      }
      s.scatter(new THREE.SphereGeometry(0.022, 7, 5), s.material('#ffffff'), beads);
    }

    // ---- steam -------------------------------------------------------------
    const steamMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, roughness: 1, depthWrite: false });
    const puffs: { mesh: THREE.Mesh; base: THREE.Vector3; phase: number; rise: number; size: number }[] = [];
    const puffGeo = new THREE.SphereGeometry(1, 10, 7);
    const addPlume = (at: [number, number, number], count: number, rise: number, size: number) => {
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(puffGeo, steamMaterial);
        s.root.add(mesh);
        puffs.push({ mesh, base: new THREE.Vector3(...at), phase: i / count + random() * 0.1, rise, size });
      }
    };
    if (lit) {
      const tip = new THREE.Vector3(0.28, 0.23, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), kettle.rotation.y).add(kettle.position);
      addPlume([tip.x, tip.y, tip.z], a.stove === 'rolling' ? 9 : 4, a.stove === 'rolling' ? 0.75 : 0.4, a.stove === 'rolling' ? 0.085 : 0.045);
    }
    for (const at of steamAt) addPlume(at, 2, 0.16, 0.022);
    const speed = mix(0.12, 0.5, mood.energy);
    const drift = (time: number) => {
      for (const puff of puffs) {
        const u = (puff.phase + time * speed) % 1;
        puff.mesh.position.set(puff.base.x + Math.sin(u * 5 + puff.phase * 20) * 0.05 * u, puff.base.y + u * puff.rise, puff.base.z + Math.cos(u * 4 + puff.phase * 9) * 0.04 * u);
        puff.mesh.scale.setScalar(puff.size * (0.4 + u * 1.3));
      }
      if (flame) flame.scale.set(1, 1 + Math.sin(time * 23) * 0.12 * (0.4 + mood.energy), 1);
    };
    drift(0);

    return s.finish({ update: (_dt, time) => drift(time) });
  },
});
