import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const PAPER = {
  green: ['#f1f3e6', '#7fb58a'], pink: ['#f8ecea', '#e59a94'], blue: ['#edf1f4', '#7fa3c9'], plain: ['#efe6cc', '#c9bb93'],
} as const;
const BODY = { grey: '#8d9698', cream: '#e3dabd', eau: '#b9cfba', black: '#2b2d30', wood: '#6e4526' } as const;
const SUBJECT = { none: '', seismic: 'SEISMIC', core: 'CORE TEMP', heart: 'PULSE', truth: 'POLYGRAPH', pressure: 'PRESSURE', signal: 'DEEP SPACE' } as const;
const BEAT: [number, number][] = [[0, 0], [0.06, -0.12], [0.1, 0.95], [0.14, -0.35], [0.19, 0], [0.4, 0], [0.48, 0.22], [0.56, 0], [1, 0]];
const beat = (p: number) => {
  for (let i = 1; i < BEAT.length; i++) if (p <= BEAT[i][0]) { const [x0, y0] = BEAT[i - 1], [x1, y1] = BEAT[i]; return y0 + (y1 - y0) * (p - x0) / (x1 - x0); }
  return 0;
};

export default defineThing({
  questions: {
    trace: choice('What shape is the line the pen has drawn?', {
      flat: 'Flat calm: a straight quiet line with the faintest tremor. Nothing is happening.',
      rhythm: 'A steady rhythm: an even repeating pulse, a heartbeat or a turning machine.',
      spike: 'A long calm line and then a sudden violent burst of spikes, right now.',
      stops: 'A steady rhythm that abruptly stops and runs on as a dead flat line.',
      climbing: 'A slow relentless climb that has reached the edge of the paper and pinned there.',
      chaos: 'Wild jagged scribble from edge to edge the whole way, nothing but noise.',
    }),
    form: choice('What kind of recorder is it?', {
      console: 'A waist-high steel cabinet with a sloped chart deck under a pen bar.',
      trolley: 'A portable instrument on a wheeled trolley, as in a clinic or interrogation room.',
      drum: 'A seismograph: a horizontal paper-wrapped drum on a pier with a long pen arm, line after line around it.',
    }),
    pens: choice('If it uses a paper strip, how many pens trace it?', {
      one: 'One pen, one line.',
      two: 'Two pens side by side.',
      four: 'Four pens, four channels.',
    }),
    ink: choice('What colour is the ink?', {
      red: 'Red ink.',
      black: 'Blue-black ink.',
      green: 'Green ink.',
      multi: 'Each pen a different colour.',
    }),
    spill: score('If it uses a paper strip, how much paper has run out of it?', ['Just what is under the pens, torn off neatly', 'A short tongue hanging down the front', 'A long curl reaching the floor', 'Yards of it run out across the floor, nobody tearing it off']),
    paper: choice('What is the chart paper like?', {
      green: 'White with a fine green grid.',
      pink: 'Pinkish medical grid paper.',
      blue: 'Cool blue engineering grid.',
      plain: 'Yellowed paper with faint ruled lines.',
    }),
    body: choice('What is the case finished in?', {
      grey: 'Hammered grey paint.', cream: 'Cream enamel.', eau: 'Pale green enamel.', black: 'Black crackle paint.', wood: 'Varnished dark wood with brass, an old observatory instrument.',
    }),
    subject: choice('What does its nameplate say it records?', {
      none: 'Nothing: no nameplate.',
      seismic: 'SEISMIC: the ground itself.',
      core: 'CORE TEMP: a reactor.',
      heart: 'PULSE: a body.',
      truth: 'POLYGRAPH: a lie detector.',
      pressure: 'PRESSURE: a boiler or a weather front.',
      signal: 'DEEP SPACE: a radio telescope listening.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const body = s.material(BODY[a.body], { roughness: a.body === 'wood' ? 0.4 : 0.5, metalness: a.body === 'wood' ? 0 : 0.15 });
    const dark = s.material('#1d2022', { roughness: 0.6 });
    const chrome = a.body === 'wood' ? s.material('#b8913f', { metalness: 0.85, roughness: 0.3 }) : s.material('#d2d6d7', { metalness: 0.85, roughness: 0.25 });
    const [paperHex, gridHex] = PAPER[a.paper];
    const inks = a.ink === 'multi' ? ['#c9241b', '#1b2f7a', '#1f8a45', '#1b1b1f'] : [{ red: '#c9241b', black: '#182250', green: '#1b7a3d' }[a.ink]];
    const penCount = a.form === 'drum' ? 1 : { one: 1, two: 2, four: 4 }[a.pens];
    const alarmed = a.trace === 'spike' || a.trace === 'climbing' || a.trace === 'chaos';

    // The trace as a function of time (0 oldest, 1 now); null where the pen is off the paper.
    const walk = [0, 0, 0, 0];
    const value = (t: number, pen: number, cycles: number): number => {
      const tremor = (random() - 0.5) * 0.05;
      const phase = (t * cycles + pen * 0.37) % 1;
      const rhythm = pen % 2 === 0 ? beat(phase) * 0.8 - 0.2 : Math.sin(phase * 6.283) * 0.55;
      if (a.trace === 'flat') return tremor;
      if (a.trace === 'rhythm') return rhythm + tremor * 0.4;
      if (a.trace === 'spike') return t < 0.72 ? tremor : (random() - 0.5) * 2 * Math.max(0.12, 1 - Math.abs(t - 0.8) * 5) + tremor;
      if (a.trace === 'stops') return t < 0.58 ? rhythm + tremor * 0.4 : pen % 2 === 0 ? -0.2 : 0;
      if (a.trace === 'climbing') return Math.min(0.97, -0.85 + t * 2.2 + Math.sin(t * 40 + pen) * 0.04 + tremor);
      walk[pen] = Math.max(-1, Math.min(1, walk[pen] * 0.5 + (random() - 0.5) * 2.2));
      return walk[pen];
    };
    const drawGrid = (c: CanvasRenderingContext2D, w: number, h: number, step: number) => {
      c.fillStyle = paperHex; c.fillRect(0, 0, w, h);
      c.strokeStyle = gridHex;
      for (let x = 0, i = 0; x <= w; x += step, i++) { c.globalAlpha = i % 5 === 0 ? 0.9 : 0.4; c.lineWidth = i % 5 === 0 ? 2 : 1; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      for (let y = 0, i = 0; y <= h; y += step, i++) { c.globalAlpha = i % 5 === 0 ? 0.9 : 0.4; c.lineWidth = i % 5 === 0 ? 2 : 1; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.globalAlpha = 1;
      for (let i = 0; i < mood.wear * 16; i++) { c.fillStyle = `rgba(120,90,40,${0.06 + random() * 0.1})`; c.beginPath(); c.ellipse(random() * w, random() * h, 10 + random() * 50, 10 + random() * 60, 0, 0, 7); c.fill(); }
    };
    const toTexture = (canvas: HTMLCanvasElement) => { const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8; return texture; };
    const pilot = (x: number, y: number, z: number) => {
      const hex = alarmed ? '#ff3324' : a.trace === 'stops' ? '#ffab1f' : '#35e070';
      return s.ball([0.022, 0.022, 0.022], [x, y, z], new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 1.1, roughness: 0.4 }), 10);
    };
    const pens: { node: THREE.Object3D; home: number; live: boolean; axis: 'x' }[] = [];
    let spin: THREE.Object3D | null = null;

    if (a.form === 'drum') {
      // Pier, base and cradle.
      const pier = a.body === 'wood' ? s.material('#8a8578', { roughness: 0.95 }) : s.material('#a7a59a', { roughness: 0.95 });
      s.box([1.1, 0.7, 0.62], [0, 0.35, 0], pier);
      s.box([1.18, 0.06, 0.7], [0, 0.03, 0], pier);
      s.box([1.0, 0.05, 0.54], [0, 0.725, 0], body);
      const dy = 1.0, R = 0.19, L = 0.62;
      for (const side of [-1, 1]) { s.box([0.04, 0.3, 0.14], [side * (L / 2 + 0.05), 0.89, 0], chrome); }
      const lines = 13;
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 512;
      const c = canvas.getContext('2d')!;
      drawGrid(c, 1024, 512, 512 / lines / 2);
      c.strokeStyle = inks[0]; c.lineWidth = 5; c.lineJoin = 'round';
      const band = 512 / lines;
      for (let k = 0; k < lines; k++) {
        c.beginPath();
        for (let x = 0; x <= 1024; x += 4) {
          const t = (k + x / 1024) / lines;
          const y = (k + 0.5) * band - value(t, 0, lines * 7) * band * (a.trace === 'spike' || a.trace === 'chaos' ? 2.6 : 0.9);
          if (x) c.lineTo(x, y); else c.moveTo(x, y);
        }
        c.stroke();
      }
      const drum = s.mesh(new THREE.CylinderGeometry(R, R, L, 48, 1), new THREE.MeshStandardMaterial({ map: toTexture(canvas), roughness: 0.85 }), [0, dy, 0]);
      drum.rotation.z = Math.PI / 2;
      drum.rotation.x = random() * 6;
      spin = drum;
      for (const side of [-1, 1]) s.cylinder(R + 0.012, R + 0.012, 0.02, [side * (L / 2 + 0.01), dy, 0], chrome, 40).rotation.z = Math.PI / 2;
      s.rod([-L / 2 - 0.12, dy, 0], [L / 2 + 0.3, dy, 0], 0.016, chrome);
      // Clock drive at the right-hand end.
      s.box([0.2, 0.24, 0.24], [L / 2 + 0.24, 0.87, 0], body);
      s.cylinder(0.09, 0.09, 0.02, [L / 2 + 0.13, dy, 0], chrome, 28).rotation.z = Math.PI / 2;
      s.cylinder(0.07, 0.07, 0.012, [L / 2 + 0.24, 0.9, 0.126], s.material('#f1ecdc'), 24).rotation.x = Math.PI / 2;
      s.box([0.006, 0.05, 0.004], [L / 2 + 0.24, 0.92, 0.134], dark).rotation.z = random() * 6;
      // Pen arm on a lead screw across the front.
      s.rod([-L / 2 - 0.05, 0.84, 0.3], [L / 2 + 0.05, 0.84, 0.3], 0.01, chrome);
      for (const side of [-1, 1]) s.box([0.03, 0.12, 0.04], [side * (L / 2 + 0.05), 0.8, 0.3], chrome);
      const arm = new THREE.Group();
      const px = -L / 2 + L * (0.15 + random() * 0.7);
      arm.position.set(px, 0.84, 0.3);
      arm.add(s.box([0.06, 0.05, 0.06], [0, 0, 0], dark), s.rod([0, 0.02, 0], [0, dy + R * 0.82 - 0.84, -0.3 + R * 0.6], 0.006, chrome), s.ball([0.016, 0.016, 0.016], [0, dy + R * 0.82 - 0.84, -0.3 + R * 0.6], s.material(inks[0]), 8));
      s.root.add(arm);
      pens.push({ node: arm, home: px, live: a.trace !== 'flat' && a.trace !== 'stops', axis: 'x' });
      pilot(L / 2 + 0.24, 1.0, 0.1);
      if (a.subject !== 'none') s.label(SUBJECT[a.subject], 0.5, 0.08, [0, 0.52, 0.312], '#1d2022', '#d9c98f');
      // A weight on a spring frame beside it: the thing that stays still while the earth moves.
      s.box([0.03, 0.5, 0.03], [-L / 2 - 0.2, 0.98, -0.1], chrome);
      s.box([0.2, 0.03, 0.03], [-L / 2 - 0.12, 1.22, -0.1], chrome);
      s.rod([-L / 2 - 0.05, 1.22, -0.1], [-L / 2 - 0.05, 1.02, -0.1], 0.004, dark);
      s.cylinder(0.05, 0.05, 0.1, [-L / 2 - 0.05, 0.97, -0.1], s.material('#6d7173', { metalness: 0.7, roughness: 0.4 }), 16);
    } else {
      const console_ = a.form === 'console';
      const W = console_ ? 0.84 : 0.6, PWd = console_ ? 0.46 : 0.36;
      // Deck endpoints (z, y): the paper comes from the top roll and runs down toward the operator.
      const top: [number, number] = console_ ? [-0.2, 1.16] : [-0.2, 1.1];
      const lip: [number, number] = console_ ? [0.24, 0.84] : [0.24, 0.95];
      const base = console_ ? 0 : 0.8;
      const profile: [number, number][] = [[0.3, base], [0.3, lip[1] - 0.03], [lip[0], lip[1] - 0.012], [top[0], top[1] - 0.012], [-0.3, top[1] - 0.012], [-0.3, base]];
      const shape = new THREE.Shape();
      profile.forEach(([z, y], i) => (i ? shape.lineTo(z, y) : shape.moveTo(z, y)));
      const shell = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false });
      shell.rotateY(-Math.PI / 2); shell.translate(W / 2, 0, 0);
      s.mesh(shell, body);
      if (console_) {
        s.box([W - 0.04, 0.06, 0.56], [0, 0.03, 0], dark).scale.y = 1;
        s.box([W - 0.1, 0.56, 0.012], [0, 0.4, 0.302], s.material(BODY[a.body], { roughness: 0.65 }));
        for (let i = 0; i < 6; i++) s.box([W - 0.3, 0.012, 0.012], [0, 0.16 + i * 0.03, 0.31], dark);
        s.box([0.02, 0.12, 0.03], [W / 2 - 0.1, 0.5, 0.315], chrome);
      } else {
        const top_ = 0.8;
        s.box([W + 0.1, 0.03, 0.72], [0, top_ - 0.015, 0], chrome);
        s.box([W + 0.06, 0.02, 0.68], [0, 0.3, 0], chrome);
        for (const x of [-1, 1]) for (const z of [-1, 1]) {
          s.rod([x * (W / 2 + 0.03), top_ - 0.03, z * 0.33], [x * (W / 2 + 0.03), 0.08, z * 0.33], 0.014, chrome);
          s.cylinder(0.04, 0.04, 0.03, [x * (W / 2 + 0.03), 0.04, z * 0.33], dark, 14).rotation.z = Math.PI / 2;
        }
        s.rod([-W / 2 - 0.03, top_ + 0.12, -0.4], [W / 2 + 0.03, top_ + 0.12, -0.4], 0.012, chrome);
        for (const x of [-1, 1]) s.rod([x * (W / 2 + 0.03), top_ - 0.03, -0.33], [x * (W / 2 + 0.03), top_ + 0.12, -0.4], 0.012, chrome);
        // Leads and a cuff on the lower shelf.
        const lead = s.material(a.subject === 'heart' ? '#c9241b' : '#26292b', { roughness: 0.5 });
        s.tube([[W / 2, 0.9, 0.1], [W / 2 + 0.12, 0.8, 0.2], [W / 2 + 0.1, 0.5, 0.25], [0.1, 0.33, 0.2], [-0.1, 0.33, 0.1]], 0.007, lead);
        s.ring(0.06, 0.02, [-0.12, 0.33, 0.05], s.material('#3b4a5c', { roughness: 0.8 })).rotation.x = Math.PI / 2;
        s.box([0.22, 0.1, 0.16], [0.12, 0.36, -0.12], s.material('#59483a', { roughness: 0.8 }));
      }

      // Paper path: deck, lip, drop and run across the floor.
      const n: THREE.Vector3[] = [];
      const off = 0.008;
      const deckLength = Math.hypot(lip[0] - top[0], lip[1] - top[1]);
      const nz = (top[1] - lip[1]) / deckLength, ny = (lip[0] - top[0]) / deckLength;
      for (let i = 0; i <= 8; i++) n.push(new THREE.Vector3(0, mix(top[1], lip[1], i / 8) + ny * off, mix(top[0], lip[0], i / 8) + nz * off));
      const drift = (random() - 0.5) * 0.3;
      if (a.spill > 0.15) {
        const hang = a.spill < 0.5 ? mix(0.12, lip[1] - 0.25, (a.spill - 0.15) / 0.35) : lip[1] - 0.02;
        const dropZ = console_ ? 0.32 : 0.41;
        n.push(new THREE.Vector3(0, lip[1] - 0.015, dropZ - 0.02));
        const drops = 6;
        for (let i = 1; i <= drops; i++) n.push(new THREE.Vector3(drift * 0.1 * i / drops, lip[1] - 0.02 - hang * i / drops, dropZ + Math.sin(i * 1.3) * 0.012));
        if (a.spill >= 0.5) {
          const run = mix(0.25, 1.5, (a.spill - 0.5) * 2);
          const folds = Math.round(run / 0.11);
          for (let i = 1; i <= folds; i++) {
            const u = i / folds;
            n.push(new THREE.Vector3(drift * (0.1 + u) + Math.sin(i * 0.9) * 0.03, 0.006 + (i % 2 ? 0.02 + random() * 0.07 * (1 - u * 0.6) : 0), dropZ + 0.04 + u * run));
          }
          n.push(new THREE.Vector3(drift * 1.15, 0.05, dropZ + run + 0.1), new THREE.Vector3(drift * 1.15, 0.1, dropZ + run + 0.06));
        }
      }
      const curve = new THREE.CatmullRomCurve3(n, false, 'catmullrom', 0.3);
      const steps = Math.max(40, n.length * 10);
      const points = curve.getSpacedPoints(steps);
      const total = curve.getLength();
      const positions: number[] = [], uvs: number[] = [], index: number[] = [];
      points.forEach((p, i) => {
        positions.push(p.x - PWd / 2, p.y, p.z, p.x + PWd / 2, p.y, p.z);
        uvs.push(0, 1 - i / steps, 1, 1 - i / steps);
        if (i) index.push(i * 2 - 2, i * 2, i * 2 - 1, i * 2 - 1, i * 2, i * 2 + 1);
      });
      const ribbon = new THREE.BufferGeometry();
      ribbon.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      ribbon.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      ribbon.setIndex(index);
      ribbon.computeVertexNormals();

      const cw = 256, ch = Math.min(4096, Math.max(512, Math.round(256 * total / PWd)));
      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      const c = canvas.getContext('2d')!;
      drawGrid(c, cw, ch, 12.8);
      c.fillStyle = gridHex; for (let y = 6; y < ch; y += 25.6) { c.fillRect(3, y, 5, 5); c.fillRect(cw - 8, y, 5, 5); }
      const now: number[] = [];
      const half = (cw - 28) / penCount / 2;
      const cycles = total * 7;
      for (let pen = 0; pen < penCount; pen++) {
        const centre = 14 + (pen * 2 + 1) * half;
        c.strokeStyle = inks[pen % inks.length]; c.lineWidth = 5; c.lineJoin = 'round';
        c.beginPath();
        let last = 0;
        for (let y = ch; y >= 0; y -= 3) {
          last = value(1 - y / ch, pen, cycles);
          const x = Math.max(4, Math.min(cw - 4, centre + last * half * (penCount > 1 && (a.trace === 'spike' || a.trace === 'chaos') ? 1.5 : 0.92)));
          if (y === ch) c.moveTo(x, y); else c.lineTo(x, y);
          if (y < 3) now[pen] = (x / cw - 0.5) * PWd;
        }
        c.stroke();
        if (now[pen] === undefined) now[pen] = (centre / cw - 0.5) * PWd;
      }
      const sheet = s.mesh(ribbon, new THREE.MeshStandardMaterial({ map: toTexture(canvas), roughness: 0.9, side: THREE.DoubleSide }));
      sheet.receiveShadow = true;

      // Deck fittings in the deck's own tilted frame.
      const deck = new THREE.Group();
      deck.position.set(0, top[1], top[0]);
      deck.rotation.x = Math.atan2(top[1] - lip[1], lip[0] - top[0]);
      s.root.add(deck);
      const on = <T extends THREE.Object3D>(child: T) => { deck.add(child); return child; };
      for (const side of [-1, 1]) on(s.box([0.02, 0.03, deckLength], [side * (PWd / 2 + 0.014), 0.012, deckLength / 2], chrome));
      on(s.cylinder(0.05, 0.05, PWd + 0.04, [0, 0.03, -0.03], s.material(paperHex, { roughness: 0.9 }), 20)).rotation.z = Math.PI / 2;
      on(s.box([PWd + 0.1, 0.09, 0.14], [0, 0.05, -0.05], body));
      on(s.box([PWd + 0.08, 0.014, 0.02], [0, 0.03, deckLength - 0.004], chrome));
      const barZ = 0.085;
      on(s.rod([-PWd / 2 - 0.03, 0.06, barZ], [PWd / 2 + 0.03, 0.06, barZ], 0.008, chrome));
      on(s.rod([-PWd / 2 - 0.03, 0.06, barZ + 0.035], [PWd / 2 + 0.03, 0.06, barZ + 0.035], 0.008, chrome));
      for (const side of [-1, 1]) on(s.box([0.03, 0.07, 0.07], [side * (PWd / 2 + 0.03), 0.04, barZ + 0.018], dark));
      for (let pen = 0; pen < penCount; pen++) {
        const holder = new THREE.Group();
        holder.position.set(now[pen], 0.03, barZ + 0.018);
        const tint = s.material(inks[pen % inks.length], { roughness: 0.4 });
        holder.add(s.box([0.034, 0.045, 0.06], [0, 0.02, 0], dark), s.cylinder(0.012, 0.012, 0.045, [0, 0.055, 0], tint, 10), s.rod([0, 0.01, 0.02], [0, -0.014, 0.05], 0.004, chrome));
        on(holder);
        pens.push({ node: holder, home: now[pen], live: a.trace !== 'flat' && a.trace !== 'stops', axis: 'x' });
      }
      // Side strips: nameplate, range knob, pilot lamp, ink bottles.
      const strip = (W - PWd) / 2 - 0.03, sx = PWd / 2 + 0.03 + strip / 2;
      on(pilot(sx, 0.02, 0.1));
      const knob = on(s.cylinder(0.03, 0.036, 0.03, [sx, 0.022, 0.22], dark, 16));
      knob.rotation.y = random() * 3;
      on(s.box([0.008, 0.008, 0.03], [sx, 0.04, 0.21], s.material('#f1ecdc')));
      if (console_) on(s.cylinder(0.03, 0.036, 0.03, [sx, 0.022, 0.34], dark, 16));
      for (let i = 0; i < Math.min(penCount, console_ ? 4 : 2); i++) on(s.cylinder(0.02, 0.022, 0.05, [-sx, 0.03, 0.1 + i * 0.065], new THREE.MeshStandardMaterial({ color: inks[i % inks.length], roughness: 0.2, transparent: true, opacity: 0.85 }), 12));
      if (a.subject !== 'none') {
        const plate = console_ ? s.label(SUBJECT[a.subject], W - 0.2, 0.085, [0, 0.74, 0.309], '#f0ead6', '#1d2022') : s.label(SUBJECT[a.subject], W - 0.12, 0.07, [0, 0.865, 0.302], '#f0ead6', '#1d2022');
        plate.castShadow = false;
      }
      // Clutter of a long watch: spent chart rolls.
      const rolls = Math.round(mood.density * 4);
      for (let i = 0; i < rolls; i++) {
        const roll = s.cylinder(0.05, 0.05, PWd, [-(W / 2 + 0.16 + (i % 2) * 0.12), 0.05 + Math.floor(i / 2) * 0.095, -0.1 + (random() - 0.5) * 0.1], s.material(paperHex, { roughness: 0.9 }), 14);
        roll.rotation.x = Math.PI / 2; roll.rotation.z = (random() - 0.5) * 0.3;
      }
    }

    const jitter = (a.trace === 'chaos' || a.trace === 'spike' ? 0.05 : 0.012) * (0.4 + mood.energy);
    const rate = mix(2, 14, mood.energy);
    return s.finish({
      update: (dt, time) => {
        pens.forEach((pen, i) => { if (pen.live) pen.node.position.x = pen.home + Math.sin(time * rate + i * 2.1) * jitter * (a.form === 'drum' ? 0.2 : 1); });
        if (spin) spin.rotation.x += dt * mix(0.02, 0.25, mood.energy);
      },
    });
  },
});
