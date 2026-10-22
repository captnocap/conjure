import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
const BROSELOW = ['#8f8f8f', '#e58ab0', '#c8362c', '#7a4bb0', '#e8c62a', '#f4f1e6', '#2f6fb0', '#e07a2a', '#3f9a5a'];

export default defineThing({
  questions: {
    state: choice('What has just happened to the cart?', {
      sealed: 'Nothing: sealed and ready, every drawer shut behind the lock bar, the seal tag intact.',
      checking: 'The nightly check: top drawer open, a checklist clipboard lying on the work surface.',
      code: 'A code is running: seal snapped, several drawers pulled, defibrillator leads trailing off the side.',
      aftermath: 'It is over: drawers left hanging open, wrappers, gloves and syringe caps scattered on the floor.',
    }),
    colour: choice('What colour is the trolley?', {
      red: 'Fire-engine red, the classic.',
      blue: 'Deep blue with pale drawers.',
      steel: 'Brushed steel carcass with red drawer fronts.',
      rainbow: 'A paediatric cart: every drawer a different colour-coded band.',
      yellow: 'Yellow, an isolation or difficult-airway trolley.',
    }),
    drawers: choice('How are the drawers arranged?', {
      four: 'Four deep drawers.',
      six: 'Six shallower drawers.',
      mixed: 'Three shallow drawers over two deep ones.',
    }),
    screen: choice('What does the defibrillator screen show?', {
      off: 'Dark: switched off.',
      ready: 'A calm standby screen with a battery bar.',
      rhythm: 'A steady green heartbeat trace.',
      chaos: 'A jagged, chaotic trace: fibrillation.',
      flat: 'A flat line.',
    }),
    sign: choice('What does the sign on the front say?', {
      crash: 'CRASH CART', code: 'CODE BLUE', resus: 'RESUS', emergency: 'EMERGENCY', paeds: 'PAEDIATRIC', none: 'No sign at all.',
    }),
    cylinder: choice('What oxygen cylinder rides on the side?', {
      green: 'A green cylinder with a white shoulder.',
      black: 'A black cylinder with a white shoulder.',
      missing: 'An empty bracket: somebody has taken it.',
    }),
    fitting: choice('What else is fitted to it?', {
      bare: 'Nothing more.',
      sharps: 'A yellow sharps bin on the side and glove boxes on top.',
      board: 'A hard cardiac board hung on the back.',
      pole: 'A drip pole rising from one corner with a bag already hung.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.74, D = 0.5, Y0 = 0.17, Y1 = 0.95;
    const bodyColour = { red: '#c4281f', blue: '#2a4f8f', steel: '#b4babd', rainbow: '#e6e3da', yellow: '#e4b921' }[a.colour];
    const body = s.material(bodyColour, { roughness: 0.42, metalness: a.colour === 'steel' ? 0.7 : 0.15 });
    const chrome = s.material('#d8dde0', { metalness: 0.9, roughness: 0.22 });
    const dark = s.material('#25282b', { roughness: 0.7 });
    const grey = s.material('#8e969b', { roughness: 0.6 });
    const disturbed = a.state === 'code' || a.state === 'aftermath';

    // ---- Carcass, top, bumpers, castors, push handle.
    s.box([W, Y1 - Y0, D], [0, (Y0 + Y1) / 2, 0], body);
    s.box([W + 0.04, 0.03, D + 0.04], [0, Y1 + 0.015, 0], s.material('#d9dcdc', { roughness: 0.5 }));
    s.box([W + 0.05, 0.05, D + 0.05], [0, Y0 + 0.01, 0], dark);
    // Gallery rail round three sides of the top.
    const RY = Y1 + 0.1;
    s.tube([[-W / 2, Y1 + 0.03, D / 2 - 0.03], [-W / 2, RY, D / 2 - 0.05], [-W / 2, RY, -D / 2 + 0.02], [-W / 2 + 0.02, RY, -D / 2], [W / 2 - 0.02, RY, -D / 2], [W / 2, RY, -D / 2 + 0.02], [W / 2, RY, D / 2 - 0.05], [W / 2, Y1 + 0.03, D / 2 - 0.03]], 0.009, chrome);
    for (const x of [-W / 2, 0, W / 2]) s.rod([x, Y1 + 0.03, -D / 2], [x, RY, -D / 2], 0.007, chrome);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      const c = new Sculpture(context);
      const w = c.cylinder(0.06, 0.06, 0.035, [0.03, 0.06, 0], dark, 18); w.rotation.x = Math.PI / 2;
      const h = c.cylinder(0.028, 0.028, 0.04, [0.03, 0.06, 0], grey, 10); h.rotation.x = Math.PI / 2;
      c.box([0.1, 0.02, 0.055], [0.015, 0.13, 0], chrome);
      for (const f of [-1, 1]) c.box([0.03, 0.08, 0.005], [0.025, 0.09, f * 0.024], chrome);
      if (z > 0) c.box([0.05, 0.015, 0.03], [0.085, 0.1, 0], s.material('#c8362c'));
      c.root.position.set(x * (W / 2 - 0.07), 0, z * (D / 2 - 0.06));
      c.root.rotation.y = (random() - 0.5) * mix(0.3, 3, mood.energy) + (x < 0 ? Math.PI : 0);
      s.root.add(c.root);
    }
    s.tube([[-W / 2, 0.8, -0.17], [-W / 2 - 0.1, 0.84, -0.17], [-W / 2 - 0.1, 0.84, 0.17], [-W / 2, 0.8, 0.17]], 0.014, chrome);

    // ---- Drawers.
    const heights = { four: [0.18, 0.18, 0.18, 0.18], six: [0.12, 0.12, 0.12, 0.12, 0.12, 0.12], mixed: [0.1, 0.1, 0.1, 0.21, 0.21] }[a.drawers];
    const FZ = D / 2;
    const litter: THREE.ColorRepresentation[] = [];
    let y = Y1 - 0.03;
    heights.forEach((h, index) => {
      const colour = a.colour === 'rainbow' ? BROSELOW[(index + Math.floor(context.seed % 3)) % BROSELOW.length] : a.colour === 'steel' ? '#c4281f' : a.colour === 'blue' ? '#dfe6ee' : bodyColour;
      const front = s.material(colour, { roughness: 0.42 });
      let pull = 0;
      if (a.state === 'checking' && index === 0) pull = mix(0.2, 0.32, random());
      if (a.state === 'code' && random() < 0.6) pull = mix(0.08, 0.34, random());
      if (a.state === 'aftermath' && random() < 0.8) pull = mix(0.04, 0.36, random());
      if (disturbed && index === 0 && pull === 0) pull = 0.25;
      const cy = y - h / 2;
      const d = new Sculpture(context);
      d.box([W - 0.1, h - 0.014, 0.022], [0, 0, 0.011], front);
      d.tube([[-0.13, 0.01, 0.022], [-0.12, 0.01, 0.05], [0.12, 0.01, 0.05], [0.13, 0.01, 0.022]], 0.008, chrome);
      const tag = d.label(['AIRWAY', 'BREATHING', 'IV ACCESS', 'DRUGS', 'FLUIDS', 'PROCEDURE'][index % 6], 0.2, 0.03, [-0.02, -h / 2 + 0.03, 0.0225], '#2b2f33', '#f6f4ec');
      tag.castShadow = false;
      if (pull > 0) {
        // The tray behind the front, with its sides and a jumble of supplies.
        d.box([W - 0.13, 0.008, pull], [0, -h / 2 + 0.02, -pull / 2], grey);
        for (const side of [-1, 1]) d.box([0.008, h - 0.04, pull], [side * (W / 2 - 0.065), -0.01, -pull / 2], grey);
        const n = Math.round(mix(3, 9, mood.density) * (a.state === 'aftermath' ? 0.6 : 1));
        for (let i = 0; i < n; i++) {
          const tint = ['#f4f6f6', '#3f7fc0', '#e8c62a', '#e2574c', '#8fcdb4', '#f4f6f6'][Math.floor(random() * 6)];
          const item = d.box([mix(0.05, 0.12, random()), mix(0.02, Math.min(0.07, h - 0.06), random()), mix(0.04, 0.09, random())], [mix(-0.27, 0.27, random()), -h / 2 + 0.05, -mix(0.04, Math.max(0.05, pull - 0.03), random())], s.material(tint, { roughness: 0.7 }));
          item.rotation.y = (random() - 0.5) * 1.2;
          litter.push(tint);
        }
      }
      d.root.position.set(-0.03, cy, FZ + pull);
      if (pull > 0.2 && a.state === 'aftermath') d.root.rotation.z = (random() - 0.5) * 0.03;
      s.root.add(d.root);
      y -= h;
    });
    // Lock bar down the right-hand edge of the drawers, with the seal at its foot.
    const barX = W / 2 - 0.035, barTop = Y1 - 0.04, barLen = heights.reduce((sum, h) => sum + h, 0) - 0.02;
    const sealColour = ['#f0d020', '#35b06a', '#2f8fe0', '#f07a2a'][Math.floor(random() * 4)];
    const seal = s.material(sealColour, { roughness: 0.5, emissive: sealColour, emissiveIntensity: 0.15 });
    const bar = new Sculpture(context);
    bar.box([0.035, barLen, 0.01], [0, -barLen / 2, 0.01], chrome);
    bar.box([0.05, 0.05, 0.03], [0, -0.03, 0.02], dark);
    bar.root.position.set(barX, barTop, FZ + 0.022);
    if (disturbed) { bar.root.rotation.z = -0.03; bar.root.rotation.y = -mix(1.3, 2.1, random()); bar.root.position.x += 0.02; }
    s.root.add(bar.root);
    if (!disturbed) {
      const sy = barTop - barLen + 0.06;
      s.ring(0.028, 0.006, [barX, sy, FZ + 0.045], seal);
      s.box([0.05, 0.028, 0.008], [barX, sy - 0.04, FZ + 0.045], seal);
      s.label(String(1000 + Math.floor(random() * 8999)), 0.045, 0.02, [barX, sy - 0.04, FZ + 0.0495], '#1b1d1f', sealColour).castShadow = false;
    } else {
      const piece = s.tube([[0.2, 0.006, FZ + 0.3], [0.24, 0.008, FZ + 0.34], [0.22, 0.006, FZ + 0.39], [0.17, 0.006, FZ + 0.37]], 0.006, seal);
      piece.position.x += (random() - 0.5) * 0.3;
    }
    const sign = { crash: 'CRASH CART', code: 'CODE BLUE', resus: 'RESUS', emergency: 'EMERGENCY', paeds: 'PAEDIATRIC', none: '' }[a.sign];
    if (sign) {
      s.label(sign, W - 0.06, 0.07, [-W / 2 - 0.001, 0.62, 0], '#ffffff', a.sign === 'code' ? '#1f4fa8' : '#b01f1a').rotation.y = -Math.PI / 2;
      s.label(sign, 0.4, 0.05, [0, Y1 + 0.165, -D / 2 - 0.012], '#ffffff', a.sign === 'code' ? '#1f4fa8' : '#b01f1a');
      s.box([0.42, 0.065, 0.01], [0, Y1 + 0.165, -D / 2 - 0.018], dark);
      for (const x of [-0.18, 0.18]) s.rod([x, RY, -D / 2], [x, Y1 + 0.14, -D / 2 - 0.016], 0.006, chrome);
    }

    // ---- Defibrillator.
    const dx = -0.14, dz = -0.04, dy = Y1 + 0.03;
    const shell = s.material('#3c4347', { roughness: 0.55 });
    const f = new Sculpture(context);
    f.box([0.34, 0.24, 0.24], [0, 0.12, 0], shell);
    f.box([0.36, 0.03, 0.26], [0, 0.015, 0], dark);
    f.tube([[-0.13, 0.24, 0], [-0.12, 0.3, 0], [0.12, 0.3, 0], [0.13, 0.24, 0]], 0.012, dark);
    const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = a.screen === 'off' ? '#14181a' : '#06140f'; ctx.fillRect(0, 0, 192, 128);
    const trace = a.screen === 'flat' ? '#ff4a3a' : a.screen === 'chaos' ? '#ffd23a' : '#5cf08a';
    if (a.screen !== 'off') {
      ctx.strokeStyle = '#123a2a'; ctx.lineWidth = 1;
      for (let i = 0; i < 192; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke(); }
      for (let i = 0; i < 128; i += 16) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(192, i); ctx.stroke(); }
      ctx.strokeStyle = trace; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(0, 74);
      if (a.screen === 'rhythm') for (let b = 0; b < 4; b++) { const x = b * 48; ctx.lineTo(x + 14, 74); ctx.lineTo(x + 18, 66); ctx.lineTo(x + 22, 74); ctx.lineTo(x + 26, 82); ctx.lineTo(x + 30, 26); ctx.lineTo(x + 34, 96); ctx.lineTo(x + 38, 74); ctx.lineTo(x + 48, 74); }
      else if (a.screen === 'chaos') for (let x = 0; x <= 192; x += 5) ctx.lineTo(x, 74 + Math.sin(x * 0.31 + random() * 2) * mix(8, 30, random()));
      else if (a.screen === 'flat') ctx.lineTo(192, 74);
      else { ctx.moveTo(0, 0); }
      ctx.stroke();
      ctx.fillStyle = trace; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'left';
      ctx.fillText({ ready: 'READY', rhythm: 'HR ' + (58 + Math.floor(random() * 50)), chaos: 'VF  SHOCK', flat: 'HR ---', off: '' }[a.screen], 8, 24);
      if (a.screen === 'ready') { ctx.strokeStyle = trace; ctx.strokeRect(52, 56, 88, 28); ctx.fillRect(56, 60, 60, 20); }
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.MeshStandardMaterial({ map: texture, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: a.screen === 'off' ? 0 : 1.2, roughness: 0.25 });
    f.mesh(new THREE.PlaneGeometry(0.17, 0.115), screen, [-0.065, 0.14, 0.1215]);
    f.box([0.185, 0.13, 0.006], [-0.065, 0.14, 0.119], dark);
    // Dial, shock and charge buttons.
    f.cylinder(0.028, 0.03, 0.02, [0.1, 0.17, 0.125], grey, 14).rotation.x = Math.PI / 2;
    const lampOn = a.screen !== 'off';
    const shock = new THREE.MeshStandardMaterial({ color: '#e2452f', emissive: '#ff3a20', emissiveIntensity: lampOn ? 0.9 : 0 });
    f.cylinder(0.02, 0.02, 0.014, [0.075, 0.09, 0.125], shock, 12).rotation.x = Math.PI / 2;
    f.cylinder(0.016, 0.016, 0.012, [0.125, 0.09, 0.125], s.material('#e8c62a'), 12).rotation.x = Math.PI / 2;
    f.box([0.12, 0.012, 0.005], [-0.065, 0.055, 0.122], s.material('#aeb6ba'));
    // Paddles docked on top, or pulled off and hanging by their coiled leads.
    const paddleMat = s.material('#c9ced1', { roughness: 0.45 });
    const coilTo = (from: P3, to: P3, turns: number) => {
      const points: P3[] = [];
      const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to), n = turns * 6;
      for (let i = 0; i <= n; i++) {
        const t = i / n, p = A.clone().lerp(B, t);
        p.y -= Math.sin(t * Math.PI) * 0.06;
        points.push([p.x + Math.cos(i * 1.05) * 0.012, p.y + Math.sin(i * 1.05) * 0.012, p.z + Math.sin(i * 1.05) * 0.008]);
      }
      return points;
    };
    f.root.position.set(dx, dy, dz);
    f.root.rotation.y = (random() - 0.5) * 0.3;
    s.root.add(f.root);
    const cable = s.material('#2c2f33', { roughness: 0.6 });
    for (const side of [-1, 1]) {
      const p = new Sculpture(context);
      p.box([0.085, 0.02, 0.11], [0, 0.01, 0], chrome);
      p.box([0.07, 0.04, 0.09], [0, 0.04, 0], paddleMat);
      p.tube([[0, 0.06, -0.035], [0, 0.1, -0.02], [0, 0.1, 0.02], [0, 0.06, 0.035]], 0.011, paddleMat);
      p.ball([0.008, 0.008, 0.008], [0, 0.11, 0], shock, 8);
      let at: P3, anchor: P3;
      if (a.state === 'code' || (a.state === 'aftermath' && side > 0)) {
        // Hanging off the handle side, or dropped on the floor.
        const floor = a.state === 'aftermath';
        at = floor ? [-W / 2 - 0.3 - random() * 0.15, 0.0, 0.25 + side * 0.1] : [-W / 2 - 0.16, 0.42 + side * 0.08, side * 0.12 + 0.05];
        p.root.rotation.set(floor ? 0 : Math.PI / 2 + 0.2, random() * 3, floor ? 0 : 0.3);
        anchor = [dx - 0.17, dy + 0.1, dz + side * 0.05];
      } else {
        at = [dx + side * 0.085, dy + 0.24, dz - 0.02];
        f.root.updateMatrix();
        const v = new THREE.Vector3(side * 0.085, 0.24, -0.02).applyMatrix4(f.root.matrix);
        at = [v.x, v.y, v.z];
        p.root.rotation.y = f.root.rotation.y;
        anchor = [dx + side * 0.16, dy + 0.08, dz - 0.1];
      }
      p.root.position.set(...at);
      s.root.add(p.root);
      s.tube(coilTo(anchor, [at[0], at[1] + 0.05, at[2]], a.state === 'sealed' || a.state === 'checking' ? 3 : 7), 0.005, cable);
    }

    // ---- Things on the work surface.
    const topY = Y1 + 0.03;
    if (a.state === 'checking') {
      const board = s.box([0.22, 0.012, 0.3], [0.2, topY + 0.006, 0.05], s.material('#7b5a3a')); board.rotation.y = (random() - 0.5) * 0.5;
      const sheet = s.label('CHECKLIST', 0.19, 0.27, [0.2, topY + 0.0135, 0.05], '#2f6fb0', '#f6f4ec'); sheet.rotation.x = -Math.PI / 2; sheet.rotation.z = board.rotation.y;
      const pen = s.cylinder(0.005, 0.005, 0.13, [0.2, topY + 0.02, 0.05], s.material('#2f6fb0'), 6); pen.rotation.set(Math.PI / 2, 0, 0.9);
    }
    if (a.fitting === 'sharps' || mood.density > 0.7) {
      for (let i = 0; i < 2; i++) {
        s.box([0.12, 0.07, 0.22], [0.2 + (random() - 0.5) * 0.02, topY + 0.035 + i * 0.07, -0.12], s.material(i ? '#7a5fb0' : '#3f7fc0', { roughness: 0.8 }));
      }
      s.ball([0.03, 0.02, 0.04], [0.2, topY + 0.15, -0.09], s.material('#5a8fd6', { roughness: 0.9 }), 8);
    }
    if (disturbed) {
      // A bag-valve mask left on the top.
      const bx = 0.2, bz = 0.1;
      const bvm = s.ball([0.06, 0.055, 0.1], [bx, topY + 0.055, bz], new THREE.MeshStandardMaterial({ color: '#b9d8e8', roughness: 0.3, transparent: true, opacity: 0.85 }), 14);
      bvm.rotation.y = random() * 3;
      s.cylinder(0.045, 0.06, 0.05, [bx + Math.sin(bvm.rotation.y) * 0.12, topY + 0.03, bz + Math.cos(bvm.rotation.y) * 0.12], new THREE.MeshStandardMaterial({ color: '#e8eef0', roughness: 0.3, transparent: true, opacity: 0.8 }), 14);
    }

    // ---- Oxygen cylinder on the right-hand side.
    const ox = W / 2 + 0.085, oz = -0.08;
    s.box([0.03, 0.03, 0.2], [W / 2 + 0.015, 0.3, oz], dark);
    s.box([0.16, 0.015, 0.16], [ox, 0.3, oz], dark);
    s.ring(0.075, 0.007, [ox, 0.7, oz], chrome).rotation.x = Math.PI / 2;
    if (a.cylinder !== 'missing') {
      const tank = s.material(a.cylinder === 'green' ? '#2f8a57' : '#1f2123', { metalness: 0.3, roughness: 0.4 });
      s.lathe([[0, 0], [0.062, 0.005], [0.068, 0.03], [0.068, 0.56], [0.05, 0.65], [0.02, 0.69], [0.02, 0.73]], tank, [ox, 0.31, oz]);
      s.lathe([[0.0685, 0.5], [0.0685, 0.56], [0.051, 0.65], [0.021, 0.69]], s.material('#f1f1ec', { side: THREE.DoubleSide }), [ox, 0.31, oz]);
      s.box([0.05, 0.05, 0.05], [ox, 1.06, oz], s.material('#b89a4a', { metalness: 0.8, roughness: 0.3 }));
      const gauge = s.cylinder(0.032, 0.032, 0.018, [ox, 1.07, oz + 0.035], s.material('#f4f4ee'), 16); gauge.rotation.x = Math.PI / 2;
      s.box([0.004, 0.022, 0.002], [ox + 0.006, 1.075, oz + 0.045], s.material('#c8362c')).rotation.z = mix(1, -1, random());
      // Green tubing coiled over the valve.
      const loop: P3[] = [];
      for (let i = 0; i <= 20; i++) loop.push([ox + 0.02 + Math.cos(i * 0.7) * 0.05, 0.98 - i * 0.004 - Math.abs(Math.sin(i * 0.7)) * 0.07, oz + 0.05 + Math.sin(i * 0.7) * 0.03]);
      s.tube(loop, 0.005, new THREE.MeshStandardMaterial({ color: '#8fd8a8', roughness: 0.3, transparent: true, opacity: 0.9 }));
    }
    if (a.fitting === 'sharps') {
      s.box([0.06, 0.22, 0.16], [W / 2 + 0.04, 0.56, 0.14], s.material('#e8c62a', { roughness: 0.5 }));
      s.box([0.065, 0.04, 0.165], [W / 2 + 0.04, 0.69, 0.14], s.material('#c8362c', { roughness: 0.5 }));
    }
    if (a.fitting === 'board') {
      const board = s.box([W - 0.12, 0.62, 0.02], [0, 0.55, -D / 2 - 0.03], s.material('#d98a2a', { roughness: 0.5 }));
      board.rotation.x = 0.04;
      for (const x of [-0.2, 0.2]) s.box([0.1, 0.035, 0.03], [x, 0.76, -D / 2 - 0.03], dark);
    }
    if (a.fitting === 'pole') {
      const px = W / 2 - 0.03, pz = -D / 2 - 0.02;
      s.rod([px, 0.6, pz], [px, 1.85, pz], 0.01, chrome);
      for (const d of [-1, 1]) s.tube([[px, 1.85, pz], [px + d * 0.06, 1.88, pz], [px + d * 0.09, 1.83, pz]], 0.005, chrome);
      const bag = s.mesh(new THREE.CapsuleGeometry(0.055, 0.12, 4, 12), new THREE.MeshStandardMaterial({ color: '#cfe6ee', roughness: 0.15, transparent: true, opacity: 0.8 }), [px - 0.09, 1.7, pz]);
      bag.scale.z = 0.4;
      s.tube([[px - 0.09, 1.58, pz], [px - 0.1, 1.35, pz + 0.05], [px - 0.2, 1.15, pz + 0.2], [px - 0.3, topY + 0.02, 0.0]], 0.004, new THREE.MeshStandardMaterial({ color: '#eef4f4', roughness: 0.3 }));
    }

    // ---- Aftermath on the floor.
    if (a.state === 'aftermath' || a.state === 'code') {
      const n = Math.round(mix(6, 26, mood.density) * (a.state === 'code' ? 0.4 : 1));
      for (let i = 0; i < n; i++) {
        const t = mix(-0.6, Math.PI + 0.6, random()), r = mix(0.38, 0.85, random());
        const x = Math.cos(t) * r * 1.1, z = Math.sin(t) * r * 0.75 + 0.12;
        const kind = random();
        if (kind < 0.55) {
          // Torn peel-pack wrappers, curled.
          const g = new THREE.PlaneGeometry(mix(0.06, 0.16, random()), mix(0.04, 0.09, random()), 4, 1);
          const p = g.attributes.position, curl = mix(4, 16, random());
          for (let k = 0; k < p.count; k++) p.setZ(k, Math.cos(p.getX(k) * curl) * 0.012);
          g.computeVertexNormals();
          const wrapper = s.mesh(g, s.material(random() < 0.5 ? '#f4f6f6' : litter[Math.floor(random() * litter.length)] ?? '#3f7fc0', { roughness: 0.7, side: THREE.DoubleSide }), [x, 0.014, z]);
          wrapper.rotation.set(-Math.PI / 2, 0, random() * 6.3);
        } else if (kind < 0.75) {
          const glove = s.ball([0.05, 0.008, 0.035], [x, 0.008, z], s.material('#5a8fd6', { roughness: 0.9 }), 8); glove.rotation.y = random() * 6.3;
          for (let k = 0; k < 4; k++) { const finger = s.ball([0.03, 0.006, 0.007], [x + Math.cos(glove.rotation.y) * 0.06, 0.008, z - Math.sin(glove.rotation.y) * 0.06 + (k - 1.5) * 0.014], s.material('#5a8fd6', { roughness: 0.9 }), 6); finger.rotation.y = glove.rotation.y + (k - 1.5) * 0.15; }
        } else if (kind < 0.9) {
          const cap = s.cylinder(0.007, 0.009, 0.035, [x, 0.009, z], s.material(random() < 0.5 ? '#f07a2a' : '#f4f6f6'), 8); cap.rotation.set(Math.PI / 2, 0, random() * 6.3);
        } else {
          const boxMesh = s.box([0.09, 0.035, 0.05], [x, 0.018, z], s.material('#f4f6f6', { roughness: 0.8 })); boxMesh.rotation.y = random() * 6.3;
        }
      }
    }

    const rate = mix(0.8, 3, mood.energy);
    return s.finish({
      footprint: disturbed ? 0.75 : 0.55,
      update: lampOn ? (_dt, time) => { shock.emissiveIntensity = a.screen === 'ready' ? 0.5 : (Math.sin(time * rate * Math.PI * 2) > 0.3 ? 1.6 : 0.3); } : undefined,
    });
  },
});
