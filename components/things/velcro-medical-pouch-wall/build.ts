import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type G = CanvasRenderingContext2D;
type P = [number, number, number];
function paint(width: number, height: number, draw: (g: G, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
const CODES = {
  red: { pouch: '#f0efe8', tape: '#d8262c', drawer: '#e8e8e2', note: 'Red cross on white: the classic medical kit.' },
  blue: { pouch: '#2f5a9a', tape: '#b8c0c8', drawer: '#d8dce0', note: 'Blue nylon pouches with grey tape, the ISS crew kit.' },
  orange: { pouch: '#f07a1a', tape: '#1d1d1f', drawer: '#f0e0c0', note: 'Orange and black: an emergency rescue kit.' },
  green: { pouch: '#3f7a4a', tape: '#f0efe8', drawer: '#dfe6d8', note: 'Green and white, a field medic set.' },
  mixed: { pouch: '#9a9a90', tape: '#d8262c', drawer: '#e8e8e2', note: 'Every colour, nothing matching: restocked by five different people.' },
} as const;

export default defineThing({
  questions: {
    code: choice('How are the pouches colour-coded?', Object.fromEntries(Object.entries(CODES).map(([key, value]) => [key, value.note])) as Record<keyof typeof CODES, string>),
    open: score('How many pouches hang open?', ['All closed and strapped flat', 'One or two unzipped', 'Half of them open, contents showing', 'Everything ripped open']),
    state: choice('What has happened here?', {
      tidy: 'Freshly restocked: every strap flat, every drawer shut, the inventory card signed.',
      used: 'Mid-shift: one drawer pulled out, a glove dropped by the foot rail, a cup velcroed to the wall.',
      emergency: 'After an emergency: the defibrillator lid open with its pads pulled out, wrappers drifting, a strap floating loose.',
      stripped: 'Stripped: half the pouches gone, pale velcro squares left behind, drawers open and empty.',
    }),
    oxygen: choice('What about the oxygen?', {
      green: 'One green oxygen bottle stowed in straps.',
      white: 'A white bottle with a blue valve cap.',
      two: 'Two bottles side by side.',
      none: 'No bottle: just the empty straps where one should be.',
    }),
    label: choice('What does the big label at the top say?', {
      medkit: 'MED KIT', emergency: 'EMERGENCY', firstaid: 'FIRST AID', crew: 'CREW HEALTH', trauma: 'TRAUMA', pharmacy: 'PHARMACY',
    }),
    drawers: choice('How many labelled drawers?', {
      few: 'A bank of three wide drawers.',
      many: 'Six small drawers in two columns.',
    }),
    alarm: noul('Is the red alarm light on the panel lit?'),
    tubing: noul('Is a tangle of clear tubing hanging out of a pouch?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const code = CODES[a.code];
    const W = 1.6, H = 2.0, T = 0.12;
    const stripped = a.state === 'stripped', emergency = a.state === 'emergency', used = a.state === 'used';

    // ---- the wall panel ----
    const panelMap = paint(256, 256, (g, w, h) => {
      g.fillStyle = '#dfe2e0'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(0,0,0,0.14)'; g.lineWidth = 3;
      for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 1200; i++) g.fillRect(random() * w, random() * h, 1.5, 1.5);
      for (let i = 0; i < mood.wear * 20; i++) { g.fillStyle = 'rgba(60,50,40,0.12)'; g.beginPath(); g.ellipse(random() * w, random() * h, 4 + random() * 10, 3 + random() * 6, random() * 3, 0, 7); g.fill(); }
    });
    panelMap.wrapS = panelMap.wrapT = THREE.RepeatWrapping; panelMap.repeat.set(2.5, 3);
    s.mesh(new THREE.BoxGeometry(W, H, T), new THREE.MeshStandardMaterial({ map: panelMap, roughness: 0.9 }), [0, H / 2, -T / 2]);
    const steel = s.material('#a9aeb4', { metalness: 0.6, roughness: 0.4 });
    const dark = s.material('#2a2d33', { roughness: 0.6 });
    for (const x of [-W / 2 + 0.02, W / 2 - 0.02]) s.box([0.04, H, 0.03], [x, H / 2, 0.01], steel);
    s.box([W, 0.04, 0.03], [0, H - 0.02, 0.01], steel);
    s.box([W, 0.05, 0.08], [0, 0.025, 0.03], steel);

    // ---- the header: label and a cross, plus the alarm light ----
    const header = paint(512, 96, (g, w, h) => {
      g.fillStyle = code.tape; g.fillRect(0, 0, w, h);
      g.fillStyle = a.code === 'orange' ? '#f07a1a' : a.code === 'green' || a.code === 'blue' ? '#1f3a5a' : '#ffffff';
      g.fillRect(28, 20, 16, 56); g.fillRect(8, 40, 56, 16);
      g.font = 'bold 54px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText({ medkit: 'MED KIT', emergency: 'EMERGENCY', firstaid: 'FIRST AID', crew: 'CREW HEALTH', trauma: 'TRAUMA', pharmacy: 'PHARMACY' }[a.label], w / 2 + 30, h / 2, 400);
    });
    s.mesh(new THREE.PlaneGeometry(W - 0.2, 0.16), new THREE.MeshStandardMaterial({ map: header, roughness: 0.8 }), [0, H - 0.14, 0.004]);
    const alarmGlow = a.alarm ? mix(1.6, 2.6, mood.energy) : 0.05;
    const alarm = s.mesh(new THREE.SphereGeometry(0.04, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: a.alarm ? '#ff3a2a' : '#7a2a24', emissive: '#ff2a1a', emissiveIntensity: alarmGlow, roughness: 0.3 }), [W / 2 - 0.12, H - 0.14, 0.03]);
    alarm.rotation.x = Math.PI / 2;
    s.cylinder(0.045, 0.045, 0.02, [W / 2 - 0.12, H - 0.14, 0.01], dark, 14).rotation.x = Math.PI / 2;

    // ---- pouches ----
    const pouchColours = a.code === 'mixed' ? ['#2f5a9a', '#f07a1a', '#3f7a4a', '#f0efe8', '#8a2a8a', '#d8262c'] : [code.pouch];
    const tapeColours = a.code === 'mixed' ? ['#ffffff', '#1d1d1f', '#d8262c', '#f0d020'] : [code.tape];
    const velcro = s.material('#c9c4b4', { roughness: 1 });
    const contentsMat = [s.material('#ffffff', { roughness: 0.8 }), s.material('#e8d8c0', { roughness: 0.9 }), s.material('#4a8ad8', { roughness: 0.5 }), s.material('#d8262c', { roughness: 0.5 })];
    interface Pouch { x: number; y: number; w: number; h: number; d: number; }
    const pouches: Pouch[] = [];
    for (let i = 0; i < 4; i++) pouches.push({ x: -W / 2 + 0.26 + i * 0.36, y: H - 0.42, w: 0.3, h: 0.24, d: 0.1 });
    for (let i = 0; i < 4; i++) pouches.push({ x: -W / 2 + 0.26 + i * 0.36, y: H - 0.74, w: 0.3, h: 0.22, d: 0.09 });
    pouches.push({ x: -W / 2 + 0.3, y: 0.44, w: 0.4, h: 0.34, d: 0.13 });
    pouches.push({ x: -W / 2 + 0.3, y: 0.14 + 0.05, w: 0.4, h: 0.16, d: 0.08 });
    const openCount = Math.round(a.open * pouches.length);
    const order = pouches.map((_pouch, index) => index).sort(() => random() - 0.5);
    const opened = new Set(order.slice(0, openCount));
    const gone = new Set(stripped ? order.slice(openCount, openCount + Math.ceil(pouches.length / 2)) : []);
    const flaps: { mesh: THREE.Mesh; rest: number }[] = [];
    pouches.forEach((pouch, index) => {
      if (gone.has(index)) {
        // Pale velcro squares where it used to hang.
        s.box([pouch.w * 0.8, 0.03, 0.004], [pouch.x, pouch.y + pouch.h * 0.35, 0.002], velcro);
        s.box([pouch.w * 0.8, 0.03, 0.004], [pouch.x, pouch.y - pouch.h * 0.35, 0.002], velcro);
        return;
      }
      const fabric = s.material(pick(pouchColours), { roughness: 0.95 });
      const tape = s.material(pick(tapeColours), { roughness: 0.7 });
      const isOpen = opened.has(index);
      const body = s.box([pouch.w, pouch.h, pouch.d], [pouch.x, pouch.y, pouch.d / 2], fabric);
      void body;
      // Straps over the body, a tape stripe, a pull tab and the flap.
      for (const dx of [-pouch.w * 0.3, pouch.w * 0.3]) s.box([0.035, pouch.h + 0.02, pouch.d + 0.012], [pouch.x + dx, pouch.y, pouch.d / 2], tape);
      s.box([pouch.w * 0.5, 0.035, 0.004], [pouch.x, pouch.y - pouch.h * 0.2, pouch.d + 0.002], s.material('#ffffff', { roughness: 0.6 }));
      const flap = s.box([pouch.w, 0.016, pouch.d + 0.02], [pouch.x, pouch.y + pouch.h / 2 + 0.008, (pouch.d + 0.02) / 2 - 0.01], fabric);
      if (isOpen) {
        // The flap swings up and the contents push out of the mouth.
        flap.geometry.translate(0, 0, (pouch.d + 0.02) / 2);
        flap.position.set(pouch.x, pouch.y + pouch.h / 2 + 0.008, -0.01);
        flap.rotation.x = -mix(1.4, 2.4, random());
        flaps.push({ mesh: flap, rest: flap.rotation.x });
        const items = 2 + Math.floor(random() * 3);
        for (let i = 0; i < items; i++) {
          const kind = Math.floor(random() * 3);
          const at: P = [pouch.x + (random() - 0.5) * pouch.w * 0.6, pouch.y + pouch.h / 2 - 0.02 + random() * 0.05, pouch.d * 0.5 + (random() - 0.5) * pouch.d * 0.5];
          if (kind === 0) s.box([0.06, 0.09, 0.02], at, pick(contentsMat)).rotation.z = (random() - 0.5) * 0.6;
          else if (kind === 1) s.cylinder(0.012, 0.012, 0.08, at, pick(contentsMat), 10).rotation.z = (random() - 0.5) * 0.8;
          else s.box([0.05, 0.05, 0.05], at, s.material('#f0efe8', { roughness: 0.9 }));
        }
      }
    });
    if (a.tubing) {
      const host = pouches[opened.size ? [...opened][0] : 1];
      const clear = new THREE.MeshStandardMaterial({ color: '#dff0f8', transparent: true, opacity: 0.85, roughness: 0.2 });
      const start: P = [host.x, host.y + host.h * 0.3, host.d];
      const points: P[] = [start];
      let x = start[0], y = start[1], z = start[2];
      for (let i = 0; i < 7; i++) { x += (random() - 0.5) * 0.25; y -= 0.06 + random() * 0.1; z += (random() - 0.3) * 0.12; points.push([x, Math.max(0.03, y), Math.max(0.02, z)]); }
      s.tube(points, 0.007, clear);
      s.tube(points.slice(0, 4).map(([px, py, pz]) => [px + 0.03, py + 0.02, pz + 0.01] as P), 0.006, clear);
    }

    // ---- the drawer bank with labels ----
    const drawerLabels = ['GAUZE', 'TAPE', 'MEDS', 'SUTURE', 'GLOVES', 'SYRINGE', 'PAIN', 'BURNS', 'SPLINT', 'ANTISEPTIC', 'IV', 'EYE WASH'];
    const drawerMat = s.material(code.drawer, { roughness: 0.6 });
    const bankX = -W / 2 + 0.56, bankTop = 0.95;
    const drawerRows = a.drawers === 'few' ? 3 : 3;
    const drawerCols = a.drawers === 'few' ? 1 : 2;
    const dw = a.drawers === 'few' ? 0.52 : 0.25, dh = 0.13, dd = 0.16;
    s.box([0.58, drawerRows * (dh + 0.015) + 0.03, dd], [bankX, bankTop - (drawerRows * (dh + 0.015)) / 2, dd / 2], dark);
    const pulled = used ? [Math.floor(random() * drawerRows * drawerCols)] : stripped || emergency ? [0, 2, 4].slice(0, drawerRows * drawerCols) : [];
    for (let r = 0; r < drawerRows; r++) for (let c = 0; c < drawerCols; c++) {
      const index = r * drawerCols + c;
      const x = bankX + (c - (drawerCols - 1) / 2) * (dw + 0.02), y = bankTop - 0.02 - dh / 2 - r * (dh + 0.015);
      const out = pulled.includes(index) ? mix(0.05, 0.1, random()) : 0;
      s.box([dw, dh, dd], [x, y, dd / 2 + out], drawerMat);
      s.box([dw * 0.4, 0.016, 0.02], [x, y - dh * 0.28, dd + out + 0.01], steel);
      s.label(drawerLabels[(index + Math.floor(random() * 3)) % drawerLabels.length], dw * 0.7, 0.04, [x, y + dh * 0.15, dd + out + 0.002], '#2a2d33', '#f4f1e6');
      if (out && !stripped) for (let i = 0; i < 2; i++) s.box([dw * 0.25, 0.03, 0.06], [x + (i - 0.5) * dw * 0.3, y + dh / 2 + 0.015, dd + out - 0.06], pick(contentsMat));
    }

    // ---- the defibrillator ----
    const defX = W / 2 - 0.34, defY = 0.9;
    const orange = s.material('#f0861c', { roughness: 0.45 });
    s.box([0.34, 0.28, 0.12], [defX, defY, 0.06], orange);
    const face = paint(256, 192, (g, w, h) => {
      g.fillStyle = '#f0861c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w * 0.3, h * 0.5, 48, 0, 7); g.fill();
      g.fillStyle = '#d8262c'; g.beginPath(); g.moveTo(w * 0.3, h * 0.5 + 34); g.bezierCurveTo(w * 0.3 - 50, h * 0.5 - 10, w * 0.3 - 20, h * 0.5 - 40, w * 0.3, h * 0.5 - 14); g.bezierCurveTo(w * 0.3 + 20, h * 0.5 - 40, w * 0.3 + 50, h * 0.5 - 10, w * 0.3, h * 0.5 + 34); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(w * 0.3 + 6, h * 0.5 - 20); g.lineTo(w * 0.3 - 10, h * 0.5 + 4); g.lineTo(w * 0.3 + 2, h * 0.5 + 4); g.lineTo(w * 0.3 - 6, h * 0.5 + 26); g.lineTo(w * 0.3 + 12, h * 0.5 - 2); g.lineTo(w * 0.3, h * 0.5 - 2); g.closePath(); g.fill();
      g.fillStyle = '#1d1d1f'; g.font = 'bold 34px monospace'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('AED', w * 0.56, h * 0.42); g.font = '20px monospace'; g.fillText('PULL TO OPEN', w * 0.56, h * 0.66);
    });
    const lid = s.mesh(new THREE.BoxGeometry(0.34, 0.28, 0.012), new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 }), [defX, defY, 0.126]);
    void lid;
    if (emergency) {
      // Lid swung down, pads and their leads pulled out, wrappers everywhere.
      lid.geometry.translate(0, -0.14, 0);
      lid.position.set(defX, defY - 0.14, 0.126);
      lid.rotation.x = 1.3;
      const pad = s.material('#f0efe8', { roughness: 0.8 });
      const wire = s.material('#2a2d33', { roughness: 0.6 });
      for (const side of [-1, 1]) {
        const end: P = [defX + side * 0.2 + (random() - 0.5) * 0.1, defY - 0.3 - random() * 0.25, 0.18 + random() * 0.1];
        s.tube([[defX, defY, 0.1], [defX + side * 0.08, defY - 0.12, 0.2], end], 0.004, wire);
        s.box([0.1, 0.13, 0.008], end, pad).rotation.set(-0.4, side * 0.3, side * 0.4);
      }
      for (let i = 0; i < 6; i++) { const wrap = s.box([0.07, 0.09, 0.003], [(random() - 0.5) * (W - 0.3), 0.08 + random() * 0.5, 0.1 + random() * 0.2], pick(contentsMat)); wrap.rotation.set(random() * 2, random() * 2, random() * 2); }
      const loose = s.box([0.035, 0.5, 0.006], [W / 2 - 0.3, 1.4, 0.16], s.material(code.tape, { roughness: 0.7 }));
      loose.rotation.set(0.3, 0, -0.5);
    }
    s.box([0.04, 0.34, 0.14], [defX - 0.2, defY, 0.07], s.material(code.tape, { roughness: 0.7 }));
    s.box([0.04, 0.34, 0.14], [defX + 0.2, defY, 0.07], s.material(code.tape, { roughness: 0.7 }));

    // ---- the oxygen bottle(s) in straps at the bottom right ----
    const bottleX = W / 2 - 0.24, strap = s.material('#4a4e55', { roughness: 0.9 });
    const bottles = a.oxygen === 'two' ? [bottleX - 0.1, bottleX + 0.1] : a.oxygen === 'none' ? [] : [bottleX];
    const bottleColour = a.oxygen === 'white' ? '#f2f2ee' : '#2e8a4a';
    for (const x of bottles) {
      const bottle = s.material(bottleColour, { metalness: 0.3, roughness: 0.4 });
      s.cylinder(0.065, 0.065, 0.54, [x, 0.37, 0.1], bottle, 18);
      s.ball([0.065, 0.05, 0.065], [x, 0.64, 0.1], bottle, 14);
      s.cylinder(0.02, 0.02, 0.07, [x, 0.71, 0.1], steel, 10);
      s.box([0.06, 0.02, 0.02], [x + 0.03, 0.74, 0.1], a.oxygen === 'white' ? s.material('#2f5a9a') : steel);
      s.label('O2', 0.09, 0.05, [x, 0.42, 0.166], '#ffffff', bottleColour);
    }
    for (const y of [0.2, 0.52]) s.box([a.oxygen === 'two' ? 0.4 : 0.22, 0.04, bottles.length ? 0.2 : 0.06], [bottleX, y, bottles.length ? 0.1 : 0.03], strap);
    if (!bottles.length) s.label('O2 STOW', 0.18, 0.045, [bottleX, 0.36, 0.004], '#ffffff', '#2e8a4a');

    // ---- state dressing: a glove, a cup, a clipboard ----
    if (used) {
      s.box([0.1, 0.004, 0.14], [-0.1 + random() * 0.4, 0.052, 0.12], s.material('#dfe4ec', { roughness: 0.9 })).rotation.y = random() * 2;
      s.cylinder(0.035, 0.03, 0.09, [W / 2 - 0.1, 1.4, 0.05], s.material('#e8e4dc', { roughness: 0.7 }), 12);
    }
    if (a.state === 'tidy') {
      const card = paint(96, 128, (g, w, h) => { g.fillStyle = '#f4f1e6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a9aa8'; g.lineWidth = 2; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(10, 20 + i * 15); g.lineTo(w - 10, 20 + i * 15); g.stroke(); } g.strokeStyle = '#2a4a8a'; g.lineWidth = 3; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(w - 26, 14 + i * 15); g.lineTo(w - 20, 19 + i * 15); g.lineTo(w - 12, 8 + i * 15); g.stroke(); } });
      s.mesh(new THREE.PlaneGeometry(0.12, 0.16), new THREE.MeshStandardMaterial({ map: card, roughness: 0.9 }), [W / 2 - 0.16, 1.35, 0.004]);
    }

    const energy = mood.energy;
    const alarmMat = alarm.material as THREE.MeshStandardMaterial;
    return s.finish({
      update(_dt, time) {
        if (a.alarm) alarmMat.emissiveIntensity = alarmGlow * (0.55 + 0.45 * Math.max(0, Math.sin(time * mix(2, 6, energy))));
        for (const { mesh, rest } of flaps) mesh.rotation.x = rest + Math.sin(time * 1.3 + rest) * 0.08 * (0.2 + energy);
      },
    });
  },
});
