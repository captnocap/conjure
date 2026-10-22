import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const SLOGAN = { self: 'MOVE IT YOURSELF', price: '$19.95 A DAY', oneway: 'ONE WAY · ANY CITY', fresh: 'A FRESH START', none: '' } as const;

export default defineThing({
  questions: {
    livery: choice('What are the rental company colours?', {
      orange: 'White box with a broad orange band, the famous one.',
      yellow: 'Solid school-bus yellow from nose to tail.',
      green: 'White with a dark green stripe and green cab.',
      blue: 'Pale blue cab and a white box with a blue swoosh.',
      plain: 'Unmarked white with old decals peeled off: borrowed, or bought at auction.',
    }),
    mural: choice('What is painted along the side of the box?', {
      mountains: 'Snow peaks, pines and a low sun: the great outdoors, generically.',
      coast: 'A lighthouse over a curling blue wave.',
      desert: 'Red mesas, a saguaro and a huge orange sky.',
      skyline: 'A city skyline at dusk with lit windows.',
      space: 'A ringed planet and stars, somebody at head office had an idea.',
      price: 'No picture, only the day rate in numbers a storey high.',
      blank: 'Nothing at all, bare white panel.',
    }),
    slogan: choice('What is lettered over the cab?', {
      self: 'MOVE IT YOURSELF', price: '$19.95 A DAY', oneway: 'ONE WAY · ANY CITY', fresh: 'A FRESH START', none: 'Nothing.',
    }),
    door: choice('How is the rear roll-up door?', {
      open: 'Rolled all the way up.',
      half: 'Halfway, the load in shadow.',
      shut: 'Down and padlocked.',
    }),
    ramp: noul('Is the loading ramp pulled out and resting on the ground?'),
    cargo: choice('If the door is raised, what is in the back?', {
      household: 'A sofa on end, a mattress, a lamp and boxes: an ordinary home.',
      packed: 'Boxes wall to wall and floor to roof, packed like a puzzle.',
      armchair: 'One armchair and a floor lamp in an otherwise empty box.',
      piano: 'An upright piano under blankets, strapped to the wall.',
      office: 'Desks, swivel chairs and monitors from a business that closed.',
      empty: 'Only folded blankets and loose straps; it is all unloaded, or not loaded yet.',
    }),
    moment: choice('What is going on with the truck?', {
      arriving: 'Just pulled up: the driver\'s door hangs open.',
      loading: 'Mid-load: hazards blinking, boxes on the ground and on the ramp, a cone out.',
      stranded: 'Stuck: a flat tyre and a ticket under the wiper.',
      overnight: 'Parked and dark, everything closed up until morning.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const liv = {
      orange: { box: '#f2f0e8', band: '#e8742a', cab: '#f2f0e8' }, yellow: { box: '#f0c22a', band: '#1b1b1b', cab: '#f0c22a' },
      green: { box: '#f0efe6', band: '#2f6b4a', cab: '#2f6b4a' }, blue: { box: '#f2f3f0', band: '#3f78b5', cab: '#a8c8e0' }, plain: { box: '#e6e4da', band: '#d8d5c8', cab: '#e6e4da' },
    }[a.livery];
    const boxMat = s.material(liv.box, { roughness: 0.55 });
    const bandMat = s.material(liv.band, { roughness: 0.5 });
    const cabMat = s.material(liv.cab, { roughness: 0.4, metalness: 0.15 });
    const dark = s.material('#1c1e21', { roughness: 0.8 });
    const glass = s.material('#27333a', { roughness: 0.12, metalness: 0.4 });
    const alu = s.material('#c5cacb', { metalness: 0.8, roughness: 0.35 });
    const innerMat = s.material('#b9a47c', { roughness: 0.9 });

    const FL = 1.0, REAR = 2.0, FRONTW = -2.6, BW = 2.4, BH = 2.3, TOP = FL + BH;
    const L = REAR - FRONTW, ZC = (REAR + FRONTW) / 2;
    // ---- Chassis and wheels.
    s.box([0.95, 0.2, 6.5], [0, 0.72, -1.2], dark);
    const flatTyre = a.moment === 'stranded';
    const wheel = (x: number, z: number, wide: number, flat = false) => {
      const w = s.cylinder(0.44, 0.44, wide, [x, flat ? 0.4 : 0.44, z], dark, 22);
      w.rotation.z = Math.PI / 2;
      if (flat) w.scale.set(1, 1, 1.12), (w.scale.x = 0.9);
      const hub = s.cylinder(0.2, 0.2, wide + 0.02, [x, flat ? 0.4 : 0.44, z], s.material('#d9dcda', { metalness: 0.5 }), 12);
      hub.rotation.z = Math.PI / 2;
    };
    for (const x of [-1, 1]) { wheel(x * 0.95, -3.85, 0.3, flatTyre && x === 1); wheel(x * 0.9, 0.85, 0.55); }
    for (const x of [-1, 1]) s.box([0.5, 0.06, 1.1], [x * 0.95, 0.94, 0.85], dark);

    // ---- Cargo box, built hollow.
    s.box([BW, 0.1, L], [0, FL - 0.05, ZC], dark);
    s.box([BW - 0.1, 0.02, L - 0.1], [0, FL + 0.01, ZC], innerMat);
    for (const x of [-1, 1]) {
      s.box([0.05, BH, L], [x * (BW / 2 - 0.025), FL + BH / 2, ZC], boxMat);
      s.box([0.05, 1.05, 0.95], [x * (BW / 2 - 0.025), TOP - 0.525, FRONTW - 0.45], boxMat);
      s.box([0.02, BH - 0.1, L - 0.1], [x * (BW / 2 - 0.06), FL + BH / 2, ZC], innerMat);
      s.box([0.03, 0.34, L + 0.9], [x * (BW / 2 + 0.005), FL + 0.2, ZC - 0.45], bandMat);
    }
    s.box([BW, 0.06, L + 0.95], [0, TOP + 0.03, ZC - 0.475], boxMat);
    s.box([BW, 1.3, 0.05], [0, FL + 0.65, FRONTW], boxMat);
    s.box([BW, 0.05, 0.95], [0, TOP - 1.05, FRONTW - 0.45], boxMat);
    s.box([BW, 1.05, 0.05], [0, TOP - 0.525, FRONTW - 0.9], boxMat);
    if (a.slogan !== 'none') s.label(SLOGAN[a.slogan], 2.1, 0.5, [0, TOP - 0.5, FRONTW - 0.93], liv.band === '#d8d5c8' ? '#55585a' : liv.band, liv.box).rotation.y = Math.PI;
    // Rear frame, bumper step, lights.
    for (const x of [-1, 1]) s.box([0.1, BH, 0.08], [x * (BW / 2 - 0.05), FL + BH / 2, REAR], alu);
    s.box([BW, 0.14, 0.08], [0, TOP - 0.07, REAR], alu);
    s.box([BW, 0.1, 0.3], [0, 0.62, REAR + 0.12], alu);
    for (const x of [-1, 1]) s.box([0.08, 0.3, 0.06], [x * 0.9, 0.8, REAR + 0.02], dark);
    const hazard = new THREE.MeshStandardMaterial({ color: '#b3261e', emissive: '#ff3a20', emissiveIntensity: mix(0.15, 1.2, Math.max(0, mood.daylight - 0.5) * 2) });
    const amber = new THREE.MeshStandardMaterial({ color: '#c97a1a', emissive: '#ff9a20', emissiveIntensity: 0.2 });
    for (const x of [-1, 1]) { s.box([0.14, 0.2, 0.03], [x * 1.08, FL + 0.2, REAR + 0.045], hazard); s.box([0.14, 0.1, 0.03], [x * 1.08, FL + 0.38, REAR + 0.045], amber); }
    for (const x of [-0.3, 0, 0.3]) s.box([0.08, 0.04, 0.02], [x, TOP - 0.03, REAR + 0.045], amber);

    // ---- Mural on both flanks.
    if (a.mural !== 'blank' || a.livery !== 'plain') {
      const art = paint(768, 320, (ctx) => {
        const W = 768, H = 320;
        ctx.fillStyle = liv.box; ctx.fillRect(0, 0, W, H);
        const fade = mood.wear * 0.35;
        if (a.mural === 'mountains') {
          const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#7ec0e8'); g.addColorStop(1, '#f6e2b0'); ctx.fillStyle = g; ctx.fillRect(40, 20, W - 80, H - 40);
          ctx.fillStyle = '#f7d04a'; ctx.beginPath(); ctx.arc(560, 110, 46, 0, 7); ctx.fill();
          for (const [x, h, c] of [[160, 190, '#6f7fa0'], [330, 240, '#55678c'], [520, 170, '#7a8aa8']] as const) {
            ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - h * 1.1, 300); ctx.lineTo(x, 300 - h); ctx.lineTo(x + h * 1.1, 300); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - h * 0.28, 300 - h * 0.75); ctx.lineTo(x, 300 - h); ctx.lineTo(x + h * 0.28, 300 - h * 0.75); ctx.lineTo(x + h * 0.1, 300 - h * 0.66); ctx.lineTo(x - h * 0.08, 300 - h * 0.72); ctx.fill();
          }
          ctx.fillStyle = '#2f5a3c';
          for (let i = 0; i < 16; i++) { const x = 60 + i * 44 + random() * 16, h = 50 + random() * 50; ctx.beginPath(); ctx.moveTo(x - 16, 300); ctx.lineTo(x, 300 - h); ctx.lineTo(x + 16, 300); ctx.fill(); }
        } else if (a.mural === 'coast') {
          ctx.fillStyle = '#bfe2ef'; ctx.fillRect(40, 20, W - 80, H - 40);
          ctx.fillStyle = '#2f78b5'; ctx.beginPath(); ctx.moveTo(40, 300); ctx.lineTo(40, 200); ctx.bezierCurveTo(200, 120, 330, 60, 430, 130); ctx.bezierCurveTo(380, 120, 330, 160, 370, 210); ctx.bezierCurveTo(480, 250, 600, 200, 728, 220); ctx.lineTo(728, 300); ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(60, 200); ctx.bezierCurveTo(200, 125, 330, 70, 425, 132); ctx.stroke();
          ctx.fillStyle = '#f4f1e6'; ctx.beginPath(); ctx.moveTo(590, 220); ctx.lineTo(604, 80); ctx.lineTo(636, 80); ctx.lineTo(650, 220); ctx.fill();
          ctx.fillStyle = '#c8372e'; ctx.fillRect(600, 120, 40, 22); ctx.fillRect(598, 58, 44, 24); ctx.fillStyle = '#f7d04a'; ctx.fillRect(608, 62, 24, 16);
        } else if (a.mural === 'desert') {
          const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f2a03a'); g.addColorStop(1, '#f6d890'); ctx.fillStyle = g; ctx.fillRect(40, 20, W - 80, H - 40);
          ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.arc(380, 200, 70, 0, 7); ctx.fill();
          ctx.fillStyle = '#b5482c'; ctx.fillRect(90, 150, 170, 150); ctx.fillRect(130, 120, 90, 40); ctx.fillRect(480, 180, 220, 120); ctx.fillRect(540, 140, 60, 50);
          ctx.fillStyle = '#8a3a22'; ctx.fillRect(40, 262, W - 80, 38);
          ctx.fillStyle = '#2f6b4a'; ctx.fillRect(330, 150, 22, 130); ctx.fillRect(300, 180, 16, 50); ctx.fillRect(300, 220, 40, 14); ctx.fillRect(366, 170, 16, 46); ctx.fillRect(348, 204, 30, 14);
        } else if (a.mural === 'skyline') {
          const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3a3f78'); g.addColorStop(1, '#f08a5a'); ctx.fillStyle = g; ctx.fillRect(40, 20, W - 80, H - 40);
          for (let x = 50; x < 710; ) { const w = 30 + random() * 50, h = 70 + random() * 180; ctx.fillStyle = '#1d2238'; ctx.fillRect(x, 300 - h, w, h); ctx.fillStyle = '#f7d46a'; for (let yy = 300 - h + 10; yy < 290; yy += 16) for (let xx = x + 6; xx < x + w - 8; xx += 12) if (random() < 0.5) ctx.fillRect(xx, yy, 6, 8); x += w + 4; }
        } else if (a.mural === 'space') {
          ctx.fillStyle = '#161a36'; ctx.fillRect(40, 20, W - 80, H - 40);
          ctx.fillStyle = '#ffffff'; for (let i = 0; i < 90; i++) ctx.fillRect(44 + random() * 676, 24 + random() * 270, 2 + random() * 2, 2 + random() * 2);
          ctx.fillStyle = '#e8a04a'; ctx.beginPath(); ctx.arc(400, 160, 84, 0, 7); ctx.fill();
          ctx.strokeStyle = '#f2dca0'; ctx.lineWidth = 14; ctx.beginPath(); ctx.ellipse(400, 160, 170, 36, -0.3, 0, 7); ctx.stroke();
          ctx.fillStyle = '#e8a04a'; ctx.beginPath(); ctx.arc(400, 160, 84, Math.PI * 1.02, Math.PI * 1.9); ctx.fill();
        } else if (a.mural === 'price') {
          ctx.fillStyle = liv.band === '#d8d5c8' ? '#55585a' : liv.band; ctx.font = 'bold 200px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$19.95', W / 2, 150, 660);
          ctx.font = 'bold 44px sans-serif'; ctx.fillText('PER DAY PLUS MILEAGE', W / 2, 275, 640);
        }
        if (a.livery !== 'plain' && a.mural !== 'price') { ctx.fillStyle = liv.band === liv.box ? '#1b1b1b' : liv.band; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('RENT·A·MOVE', 52, 26); }
        if (a.livery === 'plain') { ctx.fillStyle = 'rgba(200,196,184,0.9)'; ctx.fillRect(250, 110, 270, 90); }
        // Sun fade and road grime rising from the bottom.
        ctx.fillStyle = `rgba(235,232,222,${fade})`; ctx.fillRect(0, 0, W, H);
        const d = ctx.createLinearGradient(0, H * 0.55, 0, H); d.addColorStop(0, 'rgba(90,80,64,0)'); d.addColorStop(1, `rgba(90,80,64,${mood.wear * 0.6})`); ctx.fillStyle = d; ctx.fillRect(0, 0, W, H);
      });
      for (const x of [-1, 1]) {
        const panel = s.mesh(new THREE.PlaneGeometry(L - 0.2, 1.8), new THREE.MeshStandardMaterial({ map: art, roughness: 0.6 }), [x * (BW / 2 + 0.004), FL + 1.32, ZC]);
        panel.rotation.y = x * Math.PI / 2;
        panel.castShadow = false;
      }
    }

    // ---- Roll-up door.
    const OW = BW - 0.2, OH = BH - 0.14;
    const raise = { open: 0.95, half: 0.5, shut: 0 }[a.door];
    const dh = OH * (1 - raise);
    const ribs = 26;
    const doorGeo = new THREE.PlaneGeometry(OW, dh, 1, Math.max(4, Math.round(ribs * (1 - raise)) * 2));
    const dp = doorGeo.attributes.position;
    for (let i = 0; i < dp.count; i++) dp.setZ(i, Math.round((dp.getY(i) + dh / 2) / (dh / Math.max(4, Math.round(ribs * (1 - raise)) * 2))) % 2 ? 0.02 : 0);
    doorGeo.computeVertexNormals();
    s.mesh(doorGeo, s.material('#dcdcd2', { roughness: 0.6, side: THREE.DoubleSide }), [0, FL + OH - dh / 2, REAR - 0.02]);
    s.box([OW, 0.06, 0.05], [0, FL + OH - dh + 0.03, REAR - 0.01], alu);
    if (a.door === 'shut') { s.box([0.18, 0.08, 0.03], [0.8, FL + 0.5, REAR + 0.02], alu); s.cylinder(0.05, 0.05, 0.03, [0.86, FL + 0.46, REAR + 0.05], s.material('#c2a14d', { metalness: 0.7 }), 14).rotation.x = Math.PI / 2; }
    else s.rod([0, FL + OH - dh, REAR], [0.05, FL + OH - dh - 0.45, REAR + 0.02], 0.012, s.material('#d9d3bd'));

    // ---- Cargo.
    const tone = (c: string) => s.material(c, { roughness: 0.9 });
    const card = tone('#b88f5c'), card2 = tone('#a67c4b'), pad = tone(mood.cheer > 0.5 ? '#3b5f9a' : '#34466a');
    const put = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material, turn = 0) => { const b = s.box([w, h, d], [x, FL + 0.02 + y + h / 2, z], m); b.rotation.y = turn; return b; };
    if (raise > 0) {
      const fill = mix(0.4, 1, mood.density);
      if (a.cargo === 'household') {
        const sofa = tone(mood.warmth > 0.5 ? '#9a4a3a' : '#4d6470');
        put(0.85, 1.9, 0.8, -0.65, 0, 1.2, sofa); put(0.7, 0.5, 0.12, -0.65, 0.3, 1.63, tone('#b56a55')); put(0.7, 0.5, 0.12, -0.65, 1.0, 1.63, tone('#b56a55'));
        put(1.4, 1.95, 0.22, 0.3, 0, 0.5, tone('#e2ddcc')).rotation.x = -0.08;
        s.rod([0.3, FL, 1.3], [0.3, FL + 1.45, 1.3], 0.02, tone('#8b7a4a')); s.cylinder(0.13, 0.22, 0.28, [0.3, FL + 1.55, 1.3], tone('#ecdcae'), 14);
        for (let i = 0; i < 3 + fill * 5; i++) put(0.48, 0.36, 0.42, 0.78 + (random() - 0.5) * 0.1, Math.floor(i / 2) * 0.37, 1.55 - (i % 2) * 0.46, i % 3 ? card : card2, (random() - 0.5) * 0.2);
        put(0.9, 0.75, 0.5, 0.5, 0, -0.6, tone('#6d5137'));
      } else if (a.cargo === 'packed') {
        for (let cx = -0.84; cx < 0.9; cx += 0.56) for (let y = 0; y < 2.0 * fill; ) { const h = 0.3 + random() * 0.2; put(0.53, h, 0.45, cx, y, 1.6 - random() * 0.08, random() < 0.3 ? card2 : card, (random() - 0.5) * 0.06); y += h + 0.005; }
        for (let cx = -0.84; cx < 0.9; cx += 0.56) put(0.53, 2.05, 0.45, cx, 0, 1.1, card2);
      } else if (a.cargo === 'armchair') {
        const chair = tone(mood.warmth > 0.5 ? '#8a5a3a' : '#5a6a5a');
        put(0.8, 0.42, 0.8, -0.2, 0, 0.9, chair); put(0.8, 0.6, 0.2, -0.2, 0.42, 0.6, chair); for (const x of [-0.52, 0.12]) put(0.16, 0.25, 0.8, x, 0.42, 0.9, chair);
        s.rod([0.6, FL, 0.6], [0.6, FL + 1.5, 0.6], 0.02, tone('#8b7a4a')); s.cylinder(0.12, 0.2, 0.26, [0.6, FL + 1.6, 0.6], tone('#ecdcae'), 14);
      } else if (a.cargo === 'piano') {
        put(1.5, 1.25, 0.55, 0.1, 0, 0.9, tone('#2a2a2e')); put(1.56, 0.9, 0.6, 0.1, 0.4, 0.9, pad);
        put(1.5, 0.1, 0.3, 0.1, 0.65, 1.3, tone('#2a2a2e')); put(1.3, 0.02, 0.14, 0.1, 0.76, 1.36, tone('#f1ede0'));
        s.box([2.2, 0.06, 0.01], [0, FL + 1.0, 1.21], s.material('#f0742a', { emissive: '#f0742a', emissiveIntensity: 0.15 }));
        for (let i = 0; i < fill * 4; i++) put(0.48, 0.36, 0.42, -0.8, i * 0.37, 1.6, card);
      } else if (a.cargo === 'office') {
        put(1.4, 0.05, 0.7, -0.3, 0.72, 1.2, tone('#c9b48a')); for (const x of [-0.95, 0.35]) put(0.05, 0.72, 0.65, x, 0, 1.2, tone('#55585a'));
        put(1.4, 0.05, 0.7, -0.3, 0.78, 1.2, tone('#c9b48a')).rotation.x = Math.PI;
        for (let i = 0; i < 2 + fill * 2; i++) { const x = 0.75 - (i % 2) * 0.1, z = 1.6 - i * 0.5; s.cylinder(0.26, 0.26, 0.05, [x, FL + 0.06, z], dark, 5); s.rod([x, FL + 0.06, z], [x, FL + 0.45, z], 0.03, alu); put(0.46, 0.08, 0.46, x, 0.42, z, tone('#30343a'), random()); put(0.44, 0.5, 0.07, x, 0.52, z - 0.2, tone('#30343a')); }
        for (let i = 0; i < 3; i++) { put(0.5, 0.32, 0.05, -0.75 + i * 0.5, 0.86, 1.25, tone('#1b1c1f')); put(0.2, 0.04, 0.16, -0.75 + i * 0.5, 0.83, 1.25, tone('#1b1c1f')); }
        put(0.45, 1.3, 0.6, -0.9, 0, 0.3, tone('#8c948f'));
      } else {
        for (let i = 0; i < 4; i++) put(0.7, 0.08, 0.6, -0.6 + (random() - 0.5) * 0.1, i * 0.085, 1.4, pad, (random() - 0.5) * 0.3);
        s.tube([[0.2, FL + 0.03, 1.7], [0.5, FL + 0.03, 1.2], [0.1, FL + 0.03, 0.9], [0.7, FL + 0.03, 0.6]], 0.015, s.material('#f0742a'));
      }
    }

    // ---- Ramp.
    if (a.ramp) {
      const len = 3.0, ang = Math.asin(0.98 / len);
      const g = new THREE.Group();
      const add = (m: THREE.Object3D) => { s.root.remove(m); g.add(m); };
      add(s.box([0.72, 0.04, len], [0, 0, len / 2], alu));
      for (const x of [-1, 1]) add(s.box([0.03, 0.09, len], [x * 0.36, 0.03, len / 2], alu));
      for (let z = 0.15; z < len; z += 0.22) add(s.box([0.68, 0.012, 0.03], [0, 0.026, z], s.material('#8f9597', { metalness: 0.6 })));
      g.position.set(0.1, 0.98, REAR + 0.22); g.rotation.x = ang;
      s.root.add(g);
    } else s.box([0.8, 0.07, 0.03], [0.1, 0.86, REAR + 0.02], dark);

    // ---- Cab.
    const CZ = FRONTW;
    s.box([2.1, 0.95, 2.1], [0, 1.08, CZ - 1.05], cabMat);
    s.box([2.0, 0.72, 1.15], [0, 1.9, CZ - 0.58], cabMat);
    const shield = s.box([1.86, 0.74, 0.05], [0, 1.87, CZ - 1.22], glass); shield.rotation.x = 0.32;
    for (const x of [-1, 1]) { s.box([0.03, 0.5, 0.8], [x * 1.0, 1.9, CZ - 0.6], glass); s.box([0.02, 0.9, 0.02], [x * 1.055, 1.1, CZ - 0.15], dark); }
    s.box([2.1, 0.28, 0.12], [0, 0.68, CZ - 2.12], dark);
    s.box([1.3, 0.34, 0.04], [0, 1.15, CZ - 2.11], dark);
    const headGlow = mix(0.1, 1.6, Math.max(0, mood.daylight - 0.55) * 2.2) * (a.moment === 'overnight' ? 0.1 : 1);
    const head = new THREE.MeshStandardMaterial({ color: '#f4f1e0', emissive: '#fff0c0', emissiveIntensity: headGlow });
    for (const x of [-1, 1]) s.box([0.3, 0.2, 0.04], [x * 0.84, 1.2, CZ - 2.11], head);
    const blinkers: THREE.MeshStandardMaterial[] = [hazard, amber];
    for (const x of [-1, 1]) { s.box([0.03, 0.24, 0.14], [x * 1.22, 1.85, CZ - 1.08], dark); s.rod([x * 1.0, 1.7, CZ - 1.05], [x * 1.22, 1.8, CZ - 1.08], 0.015, dark); }
    if (a.moment === 'arriving') {
      const door = new THREE.Group();
      const add = (m: THREE.Object3D) => { s.root.remove(m); door.add(m); };
      add(s.box([0.05, 0.9, 0.95], [0, 0, 0.475], cabMat)); add(s.box([0.04, 0.5, 0.8], [0, 0.72, 0.5], glass));
      door.position.set(1.06, 1.1, CZ - 1.2); door.rotation.y = 1.1;
      s.root.add(door);
      s.box([0.02, 0.9, 0.95], [1.03, 1.1, CZ - 0.72], dark);
    }
    if (a.moment === 'stranded') { const t = s.box([0.12, 0.004, 0.24], [0.4, 1.62, CZ - 1.33], s.material('#f08a2a', { emissive: '#f08a2a', emissiveIntensity: 0.2 })); t.rotation.x = 0.32; }
    if (a.moment === 'loading') {
      const coneMat = s.material('#f0742a', { emissive: '#f0742a', emissiveIntensity: 0.15 });
      const cx = -1.6, cz = REAR + 0.9;
      s.cylinder(0.03, 0.14, 0.5, [cx, 0.27, cz], coneMat, 12); s.box([0.34, 0.03, 0.34], [cx, 0.015, cz], coneMat); s.cylinder(0.075, 0.1, 0.1, [cx, 0.3, cz], s.material('#f4f2ea'), 12);
      for (let i = 0; i < 3 + mood.density * 3; i++) { const b = s.box([0.48, 0.36, 0.42], [1.0 + (i % 2) * 0.55 + random() * 0.1, 0.18 + Math.floor(i / 2) * 0.37, REAR + 1.0 + random() * 0.5], i % 2 ? card : card2); b.rotation.y = (random() - 0.5) * 0.6; }
      if (a.ramp) { const b = s.box([0.46, 0.34, 0.4], [0.1, 0.72, REAR + 1.5], card); b.rotation.x = Math.asin(0.98 / 3.0); }
    }
    // Dirt along the sills on a tired truck.
    if (mood.wear > 0.45) for (const x of [-1, 1]) s.box([0.012, 0.25 * mood.wear, L + 0.9], [x * (BW / 2 + 0.022), FL + 0.03, ZC - 0.45], s.material('#6a5f4c', { transparent: true, opacity: 0.5, depthWrite: false }));

    // Stand it three-quarter on: the open rear and the painted flank both toward the viewer.
    const turned = new THREE.Group();
    for (const child of [...s.root.children]) turned.add(child);
    turned.rotation.y = -0.74 + (random() - 0.5) * 0.15;
    s.root.add(turned);

    const flash = a.moment === 'loading';
    const rate = mix(1.2, 3, mood.energy);
    return s.finish({ update: flash ? (_dt, time) => { const on = Math.sin(time * rate * Math.PI) > 0 ? 1.8 : 0.1; for (const m of blinkers) m.emissiveIntensity = on; } : undefined });
  },
});
