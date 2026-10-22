import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = [number, number, number];

const SLIDES = {
  notes: 'A sheet of handwritten notes: an underlined heading and bullet points in marker pen.',
  graph: 'A graph with axes, a rising curve and a few coloured bars.',
  cell: 'A labelled biology diagram of a cell with its nucleus.',
  roll: 'A long acetate roll on cranked side rollers, dense with a week of notes.',
  hand: 'No slide: somebody is making a rabbit shadow puppet in the light.',
  keys: 'Keys, coins and a pair of scissors laid on the glass as hard black silhouettes.',
  blank: 'Nothing: bare glass and a plain empty square of light.',
} as const;

function drawSlide(g: CanvasRenderingContext2D, kind: keyof typeof SLIDES, S: number, random: () => number, inks: string[]) {
  const ink = () => inks[Math.floor(random() * inks.length)];
  g.lineCap = 'round'; g.lineJoin = 'round';
  const scribble = (x: number, y: number, w: number, colour: string, h = 10) => {
    g.strokeStyle = colour; g.lineWidth = S * 0.012; g.beginPath(); g.moveTo(x, y);
    for (let cx = x; cx < x + w; cx += S * 0.02) g.lineTo(cx + S * 0.02, y + (random() - 0.5) * h * 2);
    g.stroke();
  };
  if (kind === 'notes' || kind === 'roll') {
    const rows = kind === 'roll' ? 11 : 6, top = kind === 'roll' ? 0.1 : 0.3;
    if (kind === 'notes') { const c = ink(); scribble(S * 0.14, S * 0.16, S * 0.55, c, S * 0.03); g.lineWidth = S * 0.012; g.beginPath(); g.moveTo(S * 0.13, S * 0.215); g.lineTo(S * 0.72, S * 0.21); g.stroke(); }
    for (let i = 0; i < rows; i++) {
      const y = S * (top + i * (0.62 / rows) * 1.25), c = ink();
      g.fillStyle = c; g.beginPath(); g.arc(S * 0.13, y, S * 0.014, 0, 7); g.fill();
      let x = S * 0.19;
      while (x < S * (0.6 + random() * 0.25)) { const w = S * (0.05 + random() * 0.12); scribble(x, y, w, c, S * 0.012); x += w + S * 0.035; }
    }
  } else if (kind === 'graph') {
    g.strokeStyle = inks[0]; g.lineWidth = S * 0.014;
    g.beginPath(); g.moveTo(S * 0.17, S * 0.14); g.lineTo(S * 0.17, S * 0.82); g.lineTo(S * 0.88, S * 0.82); g.stroke();
    for (let i = 0; i < 5; i++) { g.fillStyle = ink(); const h = S * (0.1 + random() * 0.45); g.globalAlpha = 0.75; g.fillRect(S * (0.23 + i * 0.13), S * 0.82 - h, S * 0.08, h); }
    g.globalAlpha = 1; g.strokeStyle = inks[1 % inks.length]; g.lineWidth = S * 0.018; g.beginPath(); g.moveTo(S * 0.18, S * 0.76);
    g.bezierCurveTo(S * 0.45, S * 0.74, S * 0.6, S * 0.5, S * 0.86, S * (0.15 + random() * 0.2)); g.stroke();
  } else if (kind === 'cell') {
    g.strokeStyle = inks[0]; g.lineWidth = S * 0.016; g.beginPath(); g.ellipse(S * 0.45, S * 0.52, S * 0.3, S * 0.24, 0.2, 0, 7); g.stroke();
    g.fillStyle = inks[1 % inks.length]; g.globalAlpha = 0.7; g.beginPath(); g.arc(S * 0.5, S * 0.5, S * 0.08, 0, 7); g.fill(); g.globalAlpha = 1;
    for (let i = 0; i < 7; i++) { g.strokeStyle = ink(); g.lineWidth = S * 0.01; g.beginPath(); g.ellipse(S * (0.25 + random() * 0.4), S * (0.38 + random() * 0.3), S * 0.03, S * 0.014, random() * 3, 0, 7); g.stroke(); }
    for (const [x, y, tx, ty] of [[0.5, 0.5, 0.82, 0.2], [0.68, 0.66, 0.86, 0.84], [0.22, 0.42, 0.1, 0.16]]) {
      g.strokeStyle = inks[0]; g.lineWidth = S * 0.008; g.beginPath(); g.moveTo(S * x, S * y); g.lineTo(S * tx, S * ty); g.stroke();
      scribble(S * (tx - 0.06), S * (ty - 0.03), S * 0.14, inks[0], S * 0.01);
    }
  } else if (kind === 'hand') {
    g.fillStyle = '#16161a';
    g.beginPath(); g.ellipse(S * 0.5, S * 0.52, S * 0.17, S * 0.13, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(S * 0.36, S * 0.4, S * 0.1, S * 0.085, 0, 0, 7); g.fill();
    for (const [x, r] of [[0.33, -0.25], [0.41, 0.1]]) { g.save(); g.translate(S * x, S * 0.3); g.rotate(r); g.beginPath(); g.ellipse(0, -S * 0.08, S * 0.028, S * 0.13, 0, 0, 7); g.fill(); g.restore(); }
    g.beginPath(); g.moveTo(S * 0.55, S * 0.6); g.lineTo(S * 0.75, S); g.lineTo(S * 0.98, S); g.lineTo(S * 0.66, S * 0.5); g.fill();
    g.fillStyle = '#fffbe6'; g.beginPath(); g.arc(S * 0.33, S * 0.39, S * 0.012, 0, 7); g.fill();
  } else if (kind === 'keys') {
    g.fillStyle = g.strokeStyle = '#16161a';
    for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(S * (0.15 + random() * 0.7), S * (0.15 + random() * 0.7), S * (0.03 + random() * 0.025), 0, 7); g.fill(); }
    for (let i = 0; i < 2; i++) {
      g.save(); g.translate(S * (0.3 + i * 0.3), S * (0.35 + random() * 0.3)); g.rotate(random() * 6);
      g.lineWidth = S * 0.03; g.beginPath(); g.arc(0, 0, S * 0.045, 0, 7); g.stroke();
      g.fillRect(S * 0.04, -S * 0.012, S * 0.2, S * 0.024); g.fillRect(S * 0.18, 0, S * 0.02, S * 0.04); g.fillRect(S * 0.22, 0, S * 0.02, S * 0.03);
      g.restore();
    }
    g.save(); g.translate(S * 0.6, S * 0.7); g.rotate(-0.5); g.lineWidth = S * 0.025;
    for (const k of [-1, 1]) { g.beginPath(); g.ellipse(-S * 0.14, k * S * 0.045, S * 0.05, S * 0.035, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(-S * 0.09, k * S * 0.03); g.lineTo(S * 0.2, -k * S * 0.03); g.stroke(); }
    g.restore();
  }
}

export default defineThing({
  questions: {
    state: choice('What state is the projector in?', {
      lit: 'Switched on: the glass blazing and a bright square thrown across the room.',
      failing: 'On but failing: a dim amber lamp that flickers and buzzes.',
      idle: 'Set up and switched off, waiting for the lesson.',
      retired: 'Retired: arm folded down, thick with dust, pushed into a corner for good.',
      covered: 'Hidden under a fitted vinyl dust cover with a number stencilled on it.',
    }),
    slide: choice('What is on the glass?', SLIDES),
    screen: choice('What does it project onto?', {
      tripod: 'A white pull-up screen on a tripod stand.',
      leaning: 'A sheet of white card propped on a chair-high easel, a makeshift screen.',
      none: 'Nothing here: the beam goes off toward a wall out of view.',
    }),
    cart: choice('What does it stand on?', {
      steel: 'A grey steel AV trolley with lipped shelves.',
      wood: 'A varnished plywood trolley built in the school workshop.',
      tall: 'A tall black tube-frame cart with a power strip on the side.',
      table: 'A low folding table with crossed legs.',
    }),
    body: choice('What is the projector itself like?', {
      beige: 'Beige moulded plastic with brown trim, 1980s.',
      metal: 'Hammered blue-grey steel with a chunky chrome arm, 1960s.',
      black: 'A slim black portable with a folding arm.',
    }),
    cord: choice('What is the power cord doing?', {
      tangle: 'Lying in a tangle on the floor and trailing away.',
      coiled: 'Coiled neatly and hung on the side of the cart.',
      wrapped: 'Wrapped tightly round and round the arm.',
    }),
    shelf: choice('What is kept with it?', {
      pens: 'A box of acetate sheets, marker pens and a spray bottle with a cloth.',
      bulbs: 'Boxes of spare lamps, one opened.',
      books: 'A pile of lesson folders and a mug.',
      nothing: 'Nothing else.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const on = a.state === 'lit' || a.state === 'failing';
    const dusty = a.state === 'retired' ? 0.55 : mood.wear * 0.25;
    const dust = new THREE.Color('#9a9484');
    const tone = (c: string, extra = {}) => s.material(new THREE.Color(c).lerp(dust, dusty), { roughness: 0.55, ...extra });
    const bodyMat = tone({ beige: '#d8cba8', metal: '#6f8696', black: '#232528' }[a.body], { metalness: a.body === 'metal' ? 0.5 : 0 });
    const trimMat = tone({ beige: '#6a4a30', metal: '#2a3238', black: '#3a3d42' }[a.body]);
    const chrome = tone('#d5dadb', { metalness: 0.9, roughness: 0.25 });
    const dark = tone('#1c1d1f', { roughness: 0.7 });
    const lamp = new THREE.Color(a.state === 'failing' ? '#ffb45a' : '#fff6d8').lerp(new THREE.Color(mood.warmth > 0.5 ? '#ffe2a8' : '#eaf2ff'), Math.abs(mood.warmth - 0.5) * 0.5);
    const power = a.state === 'failing' ? 0.7 : 1.5;
    const inks = mood.cheer > 0.6 ? ['#1c3fa0', '#d8262c', '#1f8a4a', '#16161a'] : mood.cheer > 0.3 ? ['#1c3fa0', '#d8262c'] : ['#16161a', '#1c2f6a'];

    const picture = (lit: boolean) => {
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const g = c.getContext('2d')!;
      g.fillStyle = lit ? '#fffbe6' : '#dfe5e6';
      g.fillRect(0, 0, 512, 512);
      drawSlide(g, a.slide, 512, random, inks);
      if (lit) { const v = g.createRadialGradient(256, 256, 150, 256, 256, 380); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(120,90,20,0.35)'); g.fillStyle = v; g.fillRect(0, 0, 512, 512); }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const glowing: THREE.MeshStandardMaterial[] = [];

    // Cart.
    const T = { steel: 0.86, wood: 0.8, tall: 1.04, table: 0.7 }[a.cart];
    const cw = a.cart === 'table' ? 0.8 : 0.62, cd = a.cart === 'table' ? 0.55 : 0.46;
    let shelfY = 0;
    const castors = (inset: number) => { for (const x of [-1, 1]) for (const z of [-1, 1]) { s.cylinder(0.035, 0.035, 0.028, [x * (cw / 2 - inset), 0.035, z * (cd / 2 - inset)], dark, 12).rotation.z = Math.PI / 2; s.box([0.03, 0.04, 0.03], [x * (cw / 2 - inset), 0.085, z * (cd / 2 - inset)], dark); } };
    if (a.cart === 'steel') {
      const m = tone('#9aa3a6', { metalness: 0.55, roughness: 0.45 });
      castors(0.03);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.03, T - 0.1, 0.03], [x * (cw / 2 - 0.015), (T + 0.1) / 2, z * (cd / 2 - 0.015)], m);
      for (const y of [0.16, T * 0.55, T - 0.02]) { s.box([cw, 0.016, cd], [0, y, 0], m); for (const z of [-1, 1]) s.box([cw, 0.04, 0.01], [0, y + 0.02, z * (cd / 2 - 0.005)], m); for (const x of [-1, 1]) s.box([0.01, 0.04, cd], [x * (cw / 2 - 0.005), y + 0.02, 0], m); }
      shelfY = T * 0.55 + 0.008;
    } else if (a.cart === 'wood') {
      const m = tone('#b98a52');
      castors(0.06);
      for (const x of [-1, 1]) s.box([0.02, T - 0.1, cd], [x * (cw / 2 - 0.01), (T + 0.1) / 2, 0], m);
      for (const y of [0.12, T * 0.52, T - 0.01]) s.box([cw, 0.02, cd], [0, y, 0], m);
      s.box([cw, T * 0.4, 0.012], [0, T * 0.32, -cd / 2 + 0.006], m);
      const handle = s.cylinder(0.014, 0.014, cd - 0.06, [cw / 2 + 0.05, T - 0.06, 0], m, 10);
      handle.rotation.x = Math.PI / 2;
      for (const z of [-1, 1]) s.rod([cw / 2, T - 0.06, z * (cd / 2 - 0.05)], [cw / 2 + 0.05, T - 0.06, z * (cd / 2 - 0.05)], 0.01, m);
      shelfY = T * 0.52 + 0.01;
    } else if (a.cart === 'tall') {
      const m = tone('#1f2124', { metalness: 0.4, roughness: 0.5 });
      castors(0.02);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.014, 0.014, T - 0.1, [x * (cw / 2 - 0.014), (T + 0.1) / 2, z * (cd / 2 - 0.014)], m, 10);
      for (const y of [0.14, T - 0.02]) { s.box([cw, 0.014, cd], [0, y, 0], m); }
      for (const z of [-1, 1]) s.rod([-cw / 2, 0.14, z * (cd / 2 - 0.014)], [cw / 2, T * 0.6, z * (cd / 2 - 0.014)], 0.008, m);
      s.box([0.04, 0.36, 0.06], [cw / 2 + 0.01, T * 0.62, 0], tone('#e8e4d6'));
      for (let i = 0; i < 4; i++) s.box([0.01, 0.04, 0.035], [cw / 2 + 0.032, T * 0.62 - 0.13 + i * 0.085, 0], dark);
      s.ball([0.012, 0.012, 0.012], [cw / 2 + 0.032, T * 0.62 + 0.165, 0], new THREE.MeshStandardMaterial({ color: '#ff3a24', emissive: '#ff3a24', emissiveIntensity: on ? 2 : 0 }), 8);
      shelfY = 0.147;
    } else {
      const m = tone('#8d9698', { metalness: 0.6, roughness: 0.4 });
      s.box([cw, 0.025, cd], [0, T - 0.0125, 0], tone('#7a5a3a'));
      for (const z of [-1, 1]) { s.rod([-cw / 2 + 0.04, 0, z * (cd / 2 - 0.04)], [cw / 2 - 0.08, T - 0.03, z * (cd / 2 - 0.04)], 0.012, m); s.rod([cw / 2 - 0.04, 0, z * (cd / 2 - 0.04)], [-cw / 2 + 0.08, T - 0.03, z * (cd / 2 - 0.04)], 0.012, m); }
      for (const x of [-1, 1]) s.rod([x * (cw / 2 - 0.04), 0.012, -cd / 2 + 0.04], [x * (cw / 2 - 0.04), 0.012, cd / 2 - 0.04], 0.012, m);
    }

    // Projector: base with the stage, a post, and the head with its mirror.
    const bw = 0.37, bh = a.body === 'black' ? 0.11 : 0.22;
    const px = a.cart === 'table' ? -0.12 : 0, top = T + bh;
    const headY = a.state === 'retired' ? top + 0.1 : top + (a.body === 'black' ? 0.44 : 0.4);
    const head: P = [px, headY, 0];
    if (a.state === 'covered') {
      const vinyl = tone('#6f7a66', { roughness: 0.85 });
      const shroud = s.mesh(new THREE.CylinderGeometry(0.17, 0.3, 0.68, 4, 3), vinyl, [px, T + 0.34, 0]);
      shroud.rotation.y = Math.PI / 4;
      s.box([0.44, 0.03, 0.44], [px, T + 0.015, 0], vinyl);
      const tag = s.label('AV ' + (1 + Math.floor(random() * 12)), 0.2, 0.09, [px, T + 0.3, 0.172], '#e8e4d0', '#6f7a66');
      tag.rotation.x = -0.19;
      for (const x of [-1, 1]) s.box([0.02, 0.5, 0.004], [px + x * 0.09, T + 0.3, 0.173], tone('#5a6452')).rotation.x = -0.19;
    } else {
      s.box([bw, bh, bw], [px, T + bh / 2, 0], bodyMat);
      s.box([bw + 0.01, 0.025, bw + 0.01], [px, top - 0.0125, 0], trimMat);
      for (let i = 0; i < 6; i++) s.box([0.004, bh * 0.5, 0.012], [px + bw / 2 + 0.001, T + bh * 0.45, -0.09 + i * 0.036], dark);
      for (let i = 0; i < 6; i++) s.box([0.012, bh * 0.5, 0.004], [px - 0.09 + i * 0.036, T + bh * 0.45, bw / 2 + 0.001], dark);
      s.box([0.05, 0.03, 0.01], [px + 0.12, T + bh * 0.3, bw / 2 + 0.004], on ? new THREE.MeshStandardMaterial({ color: '#ff5a2a', emissive: '#ff5a2a', emissiveIntensity: 1.5 }) : tone('#7a2a1a'));
      // Stage.
      const stage = new THREE.MeshStandardMaterial({ map: picture(on), roughness: 0.2, emissive: on ? lamp : new THREE.Color('#000000'), emissiveMap: on ? undefined : null, emissiveIntensity: on ? power * 0.55 : 0 });
      if (a.state === 'retired') stage.color.lerp(dust, 0.5);
      if (on) glowing.push(stage);
      const glass = s.mesh(new THREE.PlaneGeometry(0.285, 0.285), stage, [px, top + 0.001, 0]);
      glass.rotation.x = -Math.PI / 2;
      if (a.slide === 'roll') {
        for (const x of [-1, 1]) {
          const roller = s.cylinder(0.028, 0.028, 0.3, [px + x * 0.215, top + 0.02, 0], tone('#cfe2ea', { roughness: 0.2 }), 14);
          roller.rotation.x = Math.PI / 2;
          s.box([0.02, 0.06, 0.012], [px + x * 0.215, top + 0.005, 0.158], chrome); s.box([0.02, 0.06, 0.012], [px + x * 0.215, top + 0.005, -0.158], chrome);
          s.rod([px + x * 0.215, top + 0.02, 0.16], [px + x * 0.215, top + 0.05, 0.19], 0.005, chrome);
          s.ball([0.01, 0.01, 0.01], [px + x * 0.215, top + 0.05, 0.19], dark, 8);
        }
      } else if (a.slide === 'keys') {
        const brass = tone('#b08a3c', { metalness: 0.8, roughness: 0.3 });
        for (let i = 0; i < 4; i++) s.cylinder(0.012, 0.012, 0.003, [px + (random() - 0.5) * 0.2, top + 0.004, (random() - 0.5) * 0.2], i % 2 ? brass : chrome, 12);
        s.ring(0.014, 0.004, [px - 0.04, top + 0.006, 0.03], brass).rotation.x = Math.PI / 2;
        s.box([0.06, 0.004, 0.008], [px + 0.0, top + 0.005, 0.03], brass);
      } else if (a.slide !== 'blank' && a.slide !== 'hand') {
        const sheet = s.box([0.3, 0.002, 0.32], [px + (random() - 0.5) * 0.02, top + 0.003, (random() - 0.5) * 0.02], new THREE.MeshStandardMaterial({ color: '#e8f4f6', transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.05 }));
        sheet.rotation.y = (random() - 0.5) * 0.25;
        sheet.castShadow = false;
      }
      // Post and head.
      const postX = px + bw / 2 - 0.035, postZ = -bw / 2 + 0.035;
      if (a.state === 'retired') {
        s.cylinder(0.014, 0.016, 0.12, [postX, top + 0.06, postZ], chrome, 10);
        s.rod([postX, top + 0.11, postZ], [px, headY, 0], 0.012, chrome);
      } else {
        s.cylinder(a.body === 'metal' ? 0.02 : 0.014, a.body === 'metal' ? 0.022 : 0.016, headY - top + 0.02, [postX, (headY + top) / 2 + 0.01, postZ], a.body === 'black' ? dark : chrome, 12);
        s.rod([postX, headY, postZ], [px + 0.04, headY, -0.03], 0.014, a.body === 'black' ? dark : chrome);
        const knob = s.cylinder(0.028, 0.028, 0.02, [postX + 0.03, headY - 0.07, postZ], dark, 14);
        knob.rotation.z = Math.PI / 2;
        s.box([0.04, 0.06, 0.04], [postX, headY - 0.07, postZ], trimMat);
      }
      s.box([0.13, 0.07, 0.13], head, bodyMat);
      s.cylinder(0.05, 0.045, 0.03, [px, headY - 0.05, 0], dark, 16);
      const lens = new THREE.MeshStandardMaterial({ color: '#bfe0f0', roughness: 0.1, metalness: 0.3, emissive: on ? lamp : new THREE.Color('#000000'), emissiveIntensity: on ? power : 0 });
      if (on) glowing.push(lens);
      s.cylinder(0.04, 0.04, 0.006, [px, headY - 0.067, 0], lens, 16);
      const mirror = new THREE.Group();
      mirror.position.set(px, headY + 0.035, 0.06);
      mirror.rotation.x = a.state === 'retired' ? 0 : -0.82;
      s.root.add(mirror);
      mirror.add(s.box([0.13, 0.008, 0.14], [0, 0.004, -0.07], trimMat));
      const silver = new THREE.MeshStandardMaterial({ color: '#e8eef2', metalness: 1, roughness: 0.08, emissive: on ? lamp : new THREE.Color('#000000'), emissiveIntensity: on ? power * 0.6 : 0 });
      if (on) glowing.push(silver);
      const face = s.box([0.11, 0.002, 0.12], [0, -0.002, -0.07], silver);
      face.castShadow = false;
      mirror.add(face);
    }

    // Screen and beam.
    const sz = -0.8, sy = 1.5, ss = 1.1;
    if (a.screen !== 'none') {
      const white = tone('#f1f1ec', { roughness: 0.95 });
      const cy = a.screen === 'tripod' ? sy : 0.95, size = a.screen === 'tripod' ? ss : 0.9;
      const tilt = a.screen === 'leaning' ? -0.16 : 0;
      const panel = new THREE.Group();
      panel.position.set(px, cy, sz);
      panel.rotation.x = tilt;
      s.root.add(panel);
      panel.add(s.box([size + 0.06, size + 0.06, 0.012], [0, 0, -0.008], a.screen === 'tripod' ? dark : white), s.box([size, size, 0.004], [0, 0, 0], white));
      if (on) {
        const img = new THREE.MeshStandardMaterial({ map: picture(true), emissive: lamp, emissiveMap: null, emissiveIntensity: power * 0.5, roughness: 1 });
        img.emissiveMap = img.map;
        glowing.push(img);
        // Keystoned: wider at the top, as overhead projectors always were.
        const q = size * 0.4, geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute([-q * 0.86, -q, 0, q * 0.86, -q, 0, q * 1.1, q, 0, -q * 1.1, q, 0], 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
        geo.setIndex([0, 1, 2, 0, 2, 3]);
        geo.computeVertexNormals();
        const lit = s.mesh(geo, img, [0, 0.02, 0.004]);
        lit.castShadow = false;
        panel.add(lit);
      }
      if (a.screen === 'tripod') {
        s.cylinder(0.014, 0.014, 2.15, [px, 1.075 + 0.02, sz - 0.04], chrome, 10);
        for (let i = 0; i < 3; i++) { const t = i / 3 * Math.PI * 2 + 0.5; s.rod([px, 0.5, sz - 0.04], [px + Math.sin(t) * 0.42, 0, sz - 0.04 + Math.cos(t) * 0.42], 0.011, chrome); }
        const roller = s.cylinder(0.035, 0.035, ss + 0.16, [px, sy - ss / 2 - 0.05, sz - 0.01], dark, 12);
        roller.rotation.z = Math.PI / 2;
        s.box([ss + 0.08, 0.03, 0.02], [px, sy + ss / 2 + 0.03, sz - 0.008], dark);
        s.tube([[px, sy + ss / 2 + 0.04, sz - 0.01], [px, sy + ss / 2 + 0.09, sz - 0.03], [px, 2.15, sz - 0.04]], 0.006, chrome);
      } else {
        for (const x of [-1, 1]) { s.rod([px + x * 0.3, 1.05, sz - 0.03], [px + x * 0.36, 0, sz + 0.12], 0.014, tone('#b98a52')); s.rod([px + x * 0.3, 1.05, sz - 0.03], [px + x * 0.3, 0, sz - 0.4], 0.014, tone('#b98a52')); }
        s.box([0.72, 0.03, 0.05], [px, 0.52, sz + 0.06], tone('#b98a52'));
      }
      if (on) {
        const q = size * 0.4, y0 = headY + 0.03;
        const corners: P[] = [[-q * 0.86, cy - q, sz + 0.02], [q * 0.86, cy - q, sz + 0.02], [q * 1.1, cy + q, sz + 0.02 + tilt * -0.4], [-q * 1.1, cy + q, sz + 0.02 + tilt * -0.4]];
        const verts: number[] = [];
        for (let i = 0; i < 4; i++) { const c0 = corners[i], c1 = corners[(i + 1) % 4]; verts.push(px, y0, 0, px + c0[0], c0[1], c0[2], px + c1[0], c1[1], c1[2]); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.computeVertexNormals();
        const beam = s.mesh(geo, new THREE.MeshBasicMaterial({ color: lamp, transparent: true, opacity: a.state === 'failing' ? 0.07 : 0.13, depthWrite: false, side: THREE.DoubleSide }));
        beam.castShadow = beam.receiveShadow = false;
      }
    } else if (on) {
      const y0 = headY + 0.03, verts: number[] = [];
      const far: P[] = [[-0.4, 1.3, -1.0], [0.4, 1.3, -1.0], [0.5, 2.1, -1.0], [-0.5, 2.1, -1.0]];
      for (let i = 0; i < 4; i++) { const c0 = far[i], c1 = far[(i + 1) % 4]; verts.push(px, y0, 0, px + c0[0], c0[1], c0[2], px + c1[0], c1[1], c1[2]); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.computeVertexNormals();
      const beam = s.mesh(geo, new THREE.MeshBasicMaterial({ color: lamp, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
      beam.castShadow = beam.receiveShadow = false;
    }
    if (on) {
      // The column of light from the glass up to the lens.
      const col = s.mesh(new THREE.CylinderGeometry(0.04, 0.2, headY - top - 0.07, 4, 1, true), new THREE.MeshBasicMaterial({ color: lamp, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }), [px, (headY + top - 0.07) / 2, 0]);
      col.rotation.y = Math.PI / 4;
      col.castShadow = col.receiveShadow = false;
    }

    // Cord.
    const rubber = tone(a.body === 'beige' ? '#e8e2cc' : '#1a1a1c', { roughness: 0.8 });
    const plug = (at: P, turn: number) => {
      const g = new THREE.Group();
      g.position.set(...at); g.rotation.y = turn;
      s.root.add(g);
      g.add(s.box([0.045, 0.03, 0.05], [0, 0, 0], rubber), s.box([0.004, 0.014, 0.02], [-0.012, 0, 0.034], chrome), s.box([0.004, 0.014, 0.02], [0.012, 0, 0.034], chrome));
    };
    const out: P = [px - bw / 2, T + 0.05, -0.1];
    if (a.cord === 'tangle') {
      const pts: P[] = [out, [px - bw / 2 - 0.08, T + 0.02, -0.1], [-cw / 2 - 0.1, T * 0.5, -0.05]];
      let x = -cw / 2 - 0.2, z = 0.05;
      const loops = 5 + Math.round(mood.energy * 4);
      for (let i = 0; i < loops; i++) { x += (random() - 0.6) * 0.22; z += (random() - 0.35) * 0.3; pts.push([Math.max(x, -cw / 2 - 0.75), 0.012 + (i % 3 === 1 ? 0.02 : 0), Math.min(z, 0.75)]); }
      s.tube(pts, 0.007, rubber);
      const end = pts[pts.length - 1];
      plug([end[0], 0.016, end[2] + 0.02], random() * 6);
    } else if (a.cord === 'coiled') {
      s.tube([out, [-cw / 2 - 0.03, T - 0.02, -0.08], [-cw / 2 - 0.03, T - 0.12, 0]], 0.007, rubber);
      s.rod([-cw / 2, T - 0.12, 0], [-cw / 2 - 0.06, T - 0.1, 0], 0.006, chrome);
      for (let i = 0; i < 4; i++) { const coil = s.ring(0.09 + i * 0.004, 0.008, [-cw / 2 - 0.03 - i * 0.008, T - 0.21, (i - 1.5) * 0.004], rubber); coil.rotation.y = Math.PI / 2; coil.scale.y = 1.25; }
      plug([-cw / 2 - 0.05, T - 0.34, 0.02], Math.PI / 2);
    } else {
      const pts: P[] = [out, [px - bw / 2 - 0.04, top + 0.03, -0.12], [px + bw / 2 - 0.06, top + 0.02, -bw / 2 - 0.01]];
      const postX = px + bw / 2 - 0.035, postZ = -bw / 2 + 0.035, turns = a.state === 'retired' || a.state === 'covered' ? 2 : 5;
      for (let i = 0; i <= turns * 6; i++) { const t = i / 6 * Math.PI * 2; pts.push([postX + Math.cos(t) * 0.03, top + 0.03 + i / (turns * 6) * (a.state === 'covered' ? 0.02 : Math.min(0.3, headY - top - 0.08)), postZ + Math.sin(t) * 0.03]); }
      if (a.state !== 'covered') s.tube(pts, 0.007, rubber);
      else { for (let i = 0; i < 3; i++) s.ring(0.33, 0.008, [px, T + 0.05 + i * 0.02, 0], rubber).rotation.set(Math.PI / 2, 0, i * 0.4); plug([px + 0.2, T + 0.09, 0.24], 0.4); }
    }

    // Kept with it.
    const sy0 = shelfY || T, shelfX = shelfY ? 0 : 0.24, shelfZ = shelfY ? 0 : 0.05;
    if (a.shelf === 'pens') {
      s.box([0.24, 0.05, 0.31], [shelfX - (shelfY ? 0.13 : -0.02), sy0 + 0.025, shelfZ], tone('#2f5fa8'));
      s.label('ACETATE', 0.2, 0.05, [shelfX - (shelfY ? 0.13 : -0.02), sy0 + 0.025, shelfZ + 0.156], '#ffffff', '#2f5fa8');
      for (let i = 0; i < Math.round(mix(2, 6, mood.density)); i++) s.cylinder(0.008, 0.008, 0.13, [shelfX + (shelfY ? 0.08 : 0.02) + i * 0.02, sy0 + (shelfY ? 0.008 : 0.058), shelfZ + (random() - 0.5) * 0.08], s.material(['#1c3fa0', '#d8262c', '#1f8a4a', '#16161a', '#e8822a', '#7a2a9a'][i]), 8).rotation.set(Math.PI / 2, 0, (random() - 0.5) * 0.6);
      if (shelfY) { s.cylinder(0.035, 0.04, 0.13, [0.22, sy0 + 0.065, -0.1], tone('#9ad0e8', { roughness: 0.2 }), 14); s.cylinder(0.014, 0.02, 0.05, [0.22, sy0 + 0.155, -0.1], tone('#e8e4d8'), 10); s.box([0.02, 0.02, 0.06], [0.22, sy0 + 0.18, -0.08], tone('#d8262c')); s.ball([0.07, 0.025, 0.06], [0.2, sy0 + 0.02, 0.1], tone('#e8d27a'), 10); }
    } else if (a.shelf === 'bulbs') {
      const n = Math.round(mix(2, 6, mood.density));
      for (let i = 0; i < n; i++) s.box([0.07, 0.09, 0.07], [shelfX - (shelfY ? 0.2 : 0.02) + (i % 3) * 0.085, sy0 + 0.045 + Math.floor(i / 3) * 0.09, shelfZ + (random() - 0.5) * 0.04], tone(i % 2 ? '#e8822a' : '#f1efe6'));
      s.cylinder(0.012, 0.012, 0.03, [shelfX + (shelfY ? 0.15 : 0.02), sy0 + 0.015, shelfZ + 0.12], chrome, 10);
      s.ball([0.022, 0.03, 0.022], [shelfX + (shelfY ? 0.15 : 0.02), sy0 + 0.05, shelfZ + 0.12], new THREE.MeshStandardMaterial({ color: '#f4f8fa', roughness: 0.05, metalness: 0.2 }), 12);
    } else if (a.shelf === 'books') {
      for (let i = 0; i < Math.round(mix(2, 6, mood.density)); i++) s.box([0.23, 0.03, 0.31], [shelfX - (shelfY ? 0.12 : -0.02), sy0 + 0.015 + i * 0.031, shelfZ], s.material(['#b8322e', '#2f5fa8', '#3f8f5a', '#d8b02a', '#6a3a8a', '#22262a'][i])).rotation.y = (random() - 0.5) * 0.25;
      if (shelfY) { s.cylinder(0.04, 0.035, 0.09, [0.18, sy0 + 0.045, 0.06], tone('#e8e2d0'), 14); s.ring(0.025, 0.007, [0.225, sy0 + 0.045, 0.06], tone('#e8e2d0')); }
    }

    // Dust and a cobweb for the retired.
    if (a.state === 'retired') {
      const web = s.material('#e8e8e2', { transparent: true, opacity: 0.5, depthWrite: false });
      for (let i = 0; i < 5; i++) s.rod([px + bw / 2 - 0.035, top + 0.1, -bw / 2 + 0.035], [px + (random() - 0.5) * 0.3, top + random() * 0.03, (random() - 0.5) * 0.3], 0.0015, web).castShadow = false;
    }

    const rate = mix(6, 30, mood.energy), base = glowing.map((m) => m.emissiveIntensity);
    return s.finish({
      update(_dt, time) {
        const k = a.state === 'failing' ? (Math.sin(time * rate) + Math.sin(time * rate * 2.3 + 1) > 0.3 ? 1 : 0.25) : 1 + Math.sin(time * rate * 3) * 0.03;
        glowing.forEach((m, i) => { m.emissiveIntensity = base[i] * k; });
      },
    });
  },
});
