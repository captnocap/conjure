import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type P = [number, number, number];

const ERAS = {
  lauscha: { wall: '#d8cbb0', wood: '#5b3c25', trim: '#3f2a1b', metal: '#b58a3a', knob: '#c9a23f', frame: '#4a3423', card: '#efe3c4', ink: '#3a2a1c', title: 'AUGENPROTHESEN' },
  clinic: { wall: '#cddbd0', wood: '#e9e2cc', trim: '#b9c4b2', metal: '#c8ccd0', knob: '#c8ccd0', frame: '#f1ede0', card: '#f4efe0', ink: '#2c3a36', title: 'IRIS SHADE CARD' },
  hospital: { wall: '#e6eaec', wood: '#f1f2f0', trim: '#aab4ba', metal: '#c5cace', knob: '#2f7fc4', frame: '#d7dcdf', card: '#ffffff', ink: '#1f2c38', title: 'OCULAR PROSTHETICS' },
} as const;
const FELT = { baize: '#4f7a5a', charcoal: '#6a6d70', oxblood: '#8a3d40', dove: '#b3b1a6', surgical: '#7fa9bf' } as const;
const STOCK: Record<string, string[]> = {
  blues: ['#a9cbe6', '#7fb0dc', '#5b93cb', '#3f77b4', '#2c5c98', '#8aa6b8'],
  browns: ['#c9944e', '#a8702f', '#86511f', '#683a16', '#4a2810', '#33190a'],
  greens: ['#a9b56a', '#7f9a4a', '#5d8440', '#8e9a8c', '#6f8088', '#9a8a3c'],
  mixed: ['#5b93cb', '#86511f', '#5d8440', '#8e9a9c', '#a8702f', '#2c5c98', '#33190a', '#9a8a3c'],
  animal: ['#f2c21c', '#e8861c', '#b8d42a', '#f0e04a', '#d9541c', '#7fc0a0'],
};

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineWorld({
  questions: {
    era: choice('When and where is this workshop?', {
      lauscha: 'Lauscha, Thuringia, about 1900: dark wood, brass, plaster walls, a family trade in an upstairs room.',
      clinic: 'A mid-century eye clinic: cream enamel, pale green walls, chrome fittings, everything wiped down.',
      hospital: 'A hospital prosthetics room today: white laminate, grey steel, blue plastic handles, an LED ring on the magnifier.',
    }),
    felt: choice('What covers the bench?', {
      baize: 'Green baize, like a card table.',
      charcoal: 'Charcoal felt that shows every white eye.',
      oxblood: 'Oxblood red felt, worn where the wrists rest.',
      dove: 'Pale dove-grey felt.',
      surgical: 'A surgical-blue mat.',
    }),
    state: choice('What is happening at the bench?', {
      working: 'Work in progress: the flame is lit, a rod is in it with a glowing tip, pigments open, a brush laid down a moment ago.',
      closed: 'Shut for the night: flame out, a cloth over the unfinished eyes, tools squared away.',
      fitting: 'A fitting day: a hand mirror, an order card and a small ribboned box waiting for a patient.',
      abandoned: 'Abandoned: drawers left gaping, eyes spilled across the felt, a cracked pane, the flame long dead.',
    }),
    stock: choice('What irises fill the drawers?', {
      blues: 'Blues, graded from ice to ink.',
      browns: 'Browns, amber through to nearly black.',
      greens: 'Greens, hazels and greys.',
      mixed: 'Every human colour mixed together.',
      animal: 'Taxidermy eyes: yellow and orange with slit pupils, owl, cat and fox.',
    }),
    view: choice('What is outside the north window?', {
      rooftops: 'Slate rooftops and smoking chimneys.',
      pines: 'Snowy hills and dark pines.',
      wards: 'The brick block opposite, rows of ward windows.',
      fog: 'Nothing but white fog and a pale sun.',
    }),
    wall: choice('What hangs on the wall beside the window?', {
      card: 'A sample card of painted eyes in numbered rows.',
      chart: 'An optician’s letter chart.',
      diagram: 'An anatomical diagram of the eye in cross-section.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const era = ERAS[a.era];
    const W = 13, D = 9.5;
    const { art: s, world } = diorama(context, {
      background: a.era === 'lauscha' ? '#e7e1d2' : a.era === 'clinic' ? '#e3e8e0' : '#e6e9ea',
      floor: FELT[a.felt], width: W, depth: D, maxHeight: 2.6, radius: 1.25, pitch: 31, yaw: 25,
      slots: [[0, 1.0], [-3.9, -0.2], [4.1, 0.5], [-3.5, 3.1], [3.6, 3.3]],
    });
    const lit = a.state === 'working';
    const derelict = a.state === 'abandoned';
    const dust = Math.min(1, mood.wear + (derelict ? 0.4 : 0));
    const wood = s.material(era.wood), trim = s.material(era.trim);
    const metal = s.material(era.metal, { metalness: 0.75, roughness: 0.32 });
    const dark = s.material('#26221f', { roughness: 0.6 });
    const plaster = s.material(era.wall, { roughness: 0.95 });
    const colours = STOCK[a.stock];
    const slit = a.stock === 'animal';

    // The room: back wall with the north window, a side wall with a shelf, a wooden lip round the bench.
    s.box([W + 0.22, 7.6, 0.22], [-0.11, 3.56, -D / 2 - 0.11], plaster);
    s.box([0.22, 7.6, D], [-W / 2 - 0.11, 3.56, 0], plaster);
    s.box([W, 0.5, 0.12], [0, 0.25, -D / 2 + 0.06], trim);
    s.box([0.12, 0.5, D], [-W / 2 + 0.06, 0.25, 0], trim);
    s.box([W + 0.3, 0.3, 0.3], [0, -0.09, D / 2 + 0.15], wood);
    s.box([0.3, 0.3, D + 0.3], [W / 2 + 0.15, -0.09, 0], wood);

    const day = Math.sin(mood.daylight * Math.PI);
    const sky = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const top = new THREE.Color('#f3b98a').lerp(new THREE.Color('#bcd6ea'), day), low = new THREE.Color('#f8dcc0').lerp(new THREE.Color('#eef4f6'), day);
      const fall = ctx.createLinearGradient(0, 0, 0, h);
      fall.addColorStop(0, `#${top.getHexString()}`);
      fall.addColorStop(1, `#${low.getHexString()}`);
      ctx.fillStyle = fall;
      ctx.fillRect(0, 0, w, h);
    };
    const outside = paint(384, 384, (ctx) => {
      const w = 384, h = 384;
      sky(ctx, w, h);
      if (a.view === 'rooftops') {
        for (let row = 0; row < 3; row++) {
          const y = h * (0.55 + row * 0.15);
          for (let x = -40 + row * 23; x < w; x += 90 + random() * 40) {
            const wide = 80 + random() * 50, tall = 40 + random() * 30;
            ctx.fillStyle = ['#8c97a0', '#6f7a84', '#56606a'][row];
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + wide / 2, y - tall); ctx.lineTo(x + wide, y); ctx.lineTo(x + wide, h); ctx.lineTo(x, h); ctx.fill();
            ctx.fillStyle = '#7a4a3a';
            ctx.fillRect(x + wide * 0.65, y - tall * 0.9, 12, tall * 0.7);
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            for (let puff = 0; puff < 4; puff++) { ctx.beginPath(); ctx.arc(x + wide * 0.65 + 6 + puff * 9, y - tall * 0.9 - 12 - puff * 16, 7 + puff * 3, 0, 7); ctx.fill(); }
          }
        }
      } else if (a.view === 'pines') {
        ctx.fillStyle = '#f7fafb';
        ctx.beginPath(); ctx.moveTo(0, h * 0.6);
        for (let x = 0; x <= w; x += 32) ctx.lineTo(x, h * (0.55 + Math.sin(x * 0.02 + random()) * 0.06));
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
        for (let i = 0; i < 22; i++) {
          const x = random() * w, y = h * (0.6 + random() * 0.4), tall = 50 + (y / h) * 70;
          ctx.fillStyle = '#27473a';
          for (let tier = 0; tier < 3; tier++) { ctx.beginPath(); ctx.moveTo(x, y - tall + tier * tall * 0.22); ctx.lineTo(x + tall * (0.16 + tier * 0.07), y - tall * 0.5 + tier * tall * 0.24); ctx.lineTo(x - tall * (0.16 + tier * 0.07), y - tall * 0.5 + tier * tall * 0.24); ctx.fill(); }
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.moveTo(x, y - tall); ctx.lineTo(x + tall * 0.07, y - tall * 0.78); ctx.lineTo(x - tall * 0.07, y - tall * 0.78); ctx.fill();
        }
      } else if (a.view === 'wards') {
        ctx.fillStyle = '#9a5f4c';
        ctx.fillRect(30, h * 0.2, w - 60, h);
        for (let row = 0; row < 5; row++) for (let col = 0; col < 6; col++) {
          ctx.fillStyle = random() < 0.25 + (1 - day) * 0.5 ? '#ffe69a' : '#51616c';
          ctx.fillRect(52 + col * 50, h * 0.27 + row * 54, 30, 36);
        }
        ctx.fillStyle = '#7d4a3a';
        ctx.fillRect(22, h * 0.18, w - 44, 10);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillRect(0, 0, w, h);
        const sun = ctx.createRadialGradient(w * 0.62, h * 0.35, 4, w * 0.62, h * 0.35, 70);
        sun.addColorStop(0, 'rgba(255,250,225,1)'); sun.addColorStop(1, 'rgba(255,250,225,0)');
        ctx.fillStyle = sun;
        ctx.fillRect(0, 0, w, h);
      }
      if (dust > 0.55) {
        ctx.fillStyle = `rgba(120,110,90,${(dust - 0.55) * 0.5})`;
        ctx.fillRect(0, 0, w, h);
      }
      if (derelict || mood.wear > 0.8) {
        ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(250, 384); ctx.lineTo(280, 300); ctx.lineTo(262, 250); ctx.lineTo(310, 200); ctx.moveTo(280, 300); ctx.lineTo(340, 290); ctx.stroke();
      }
    });
    const winX = -1.7, winY = 4.55, winW = 5.2, winH = 4.6, back = -D / 2;
    s.mesh(new THREE.PlaneGeometry(winW, winH), new THREE.MeshStandardMaterial({ map: outside, emissiveMap: outside, emissive: '#ffffff', emissiveIntensity: mix(0.35, 0.7, mood.cheer), roughness: 0.3 }), [winX, winY, back + 0.02]);
    const frame = s.material(era.frame, { roughness: 0.6 });
    for (const side of [-1, 1]) {
      s.box([0.24, winH + 0.48, 0.2], [winX + side * (winW / 2 + 0.12), winY, back + 0.1], frame);
      s.box([winW + 0.48, 0.24, 0.2], [winX, winY + side * (winH / 2 + 0.12), back + 0.1], frame);
    }
    s.box([0.12, winH, 0.12], [winX, winY, back + 0.08], frame);
    for (const y of [-0.5, 0.9]) s.box([winW, 0.1, 0.12], [winX, winY + y, back + 0.08], frame);
    s.box([winW + 0.9, 0.16, 0.6], [winX, winY - winH / 2 - 0.3, back + 0.3], frame);

    // What hangs beside the window.
    const hung = paint(384, 288, (ctx) => {
      const w = 384, h = 288;
      ctx.fillStyle = era.card;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = era.ink;
      ctx.textAlign = 'center';
      if (a.wall === 'card') {
        ctx.font = 'bold 24px serif';
        ctx.fillText(era.title, w / 2, 34);
        ctx.font = '11px monospace';
        for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
          const x = 46 + col * 73, y = 86 + row * 74;
          ctx.fillStyle = '#fbf9f2'; ctx.strokeStyle = era.ink; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(x, y, 29, 20, 0, 0, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = colours[(row * 5 + col) % colours.length];
          ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
          ctx.fillStyle = '#0a0a0a';
          ctx.beginPath(); ctx.ellipse(x, y, slit ? 2.5 : 6, slit ? 12 : 6, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 7, y - 8, 4, 4);
          ctx.fillStyle = era.ink; ctx.fillText(`No ${row * 5 + col + 101}`, x, y + 36);
        }
      } else if (a.wall === 'chart') {
        const rows = ['E', 'F P', 'T O Z', 'L P E D', 'P E C F D', 'E D F C Z P', 'F E L O P Z D'];
        let y = 58;
        rows.forEach((row, index) => {
          const size = 62 - index * 8.5;
          ctx.font = `bold ${Math.max(10, size)}px monospace`;
          ctx.fillText(row, w / 2, y);
          y += Math.max(18, size * 0.72);
        });
        ctx.fillStyle = '#c0392b'; ctx.fillRect(40, y - 26, w - 80, 3);
      } else {
        ctx.font = 'bold 20px serif';
        ctx.fillText(a.era === 'lauscha' ? 'DAS AUGE' : 'THE EYE', w / 2, 30);
        ctx.lineWidth = 4; ctx.strokeStyle = era.ink;
        ctx.fillStyle = '#f6efe2';
        ctx.beginPath(); ctx.arc(190, 160, 92, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#d7e7ee';
        ctx.beginPath(); ctx.ellipse(104, 160, 26, 52, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = colours[1];
        ctx.fillRect(116, 104, 8, 38); ctx.fillRect(116, 178, 8, 38);
        ctx.fillStyle = '#e8cfa0';
        ctx.beginPath(); ctx.ellipse(138, 160, 13, 30, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e2c090';
        ctx.fillRect(278, 148, 90, 26); ctx.strokeRect(278, 148, 90, 26);
        ctx.strokeStyle = '#b3221f'; ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(280, 160); ctx.quadraticCurveTo(250, 110 + i * 20, 200 + random() * 30, 90 + i * 28); ctx.stroke(); }
        ctx.strokeStyle = era.ink; ctx.lineWidth = 1; ctx.font = '10px monospace'; ctx.fillStyle = era.ink;
        for (const [x, y, word] of [[104, 100, 'cornea'], [138, 228, 'lens'], [200, 262, 'retina'], [330, 138, 'nerve']] as const) ctx.fillText(word, x, y);
      }
      if (dust > 0.4) { ctx.fillStyle = `rgba(110,95,70,${(dust - 0.4) * 0.45})`; ctx.fillRect(0, 0, w, h); }
    });
    const cardAt: P = [3.75, 5.2, back + 0.08];
    s.box([3.5, 2.7, 0.1], [cardAt[0], cardAt[1], back + 0.04], frame);
    const card = s.mesh(new THREE.PlaneGeometry(3.25, 2.44), new THREE.MeshStandardMaterial({ map: hung, roughness: 0.85 }), [cardAt[0], cardAt[1], back + 0.1]);
    card.rotation.z = derelict ? -0.06 : (random() - 0.5) * 0.02;

    // Side-wall shelf of pigment jars.
    s.box([0.9, 0.1, 5.2], [-W / 2 + 0.45, 4.3, -1.1], wood);
    for (const z of [-3.4, 1.2]) s.box([0.7, 0.5, 0.08], [-W / 2 + 0.36, 4.0, z], trim);
    const jars = 4 + Math.round(mood.density * 5);
    for (let i = 0; i < jars; i++) {
      const z = -3.3 + (i / Math.max(1, jars - 1)) * 4.4 + (random() - 0.5) * 0.12, r = 0.2 + random() * 0.06, tall = 0.5 + random() * 0.3;
      const fallen = derelict && random() < 0.3;
      const jar = s.cylinder(r, r, tall, [-W / 2 + 0.45, 4.35 + (fallen ? r : tall / 2), z], s.material(['#f1ecdf', ...colours][Math.floor(random() * (colours.length + 1))], { roughness: 0.3 }), 14);
      if (fallen) jar.rotation.x = Math.PI / 2;
      else s.cylinder(r * 1.06, r * 1.06, 0.08, [-W / 2 + 0.45, 4.39 + tall, z], dark, 14);
    }

    // Little glass eyes, instanced: whites, irises and pupils.
    const eyeSpots: { at: THREE.Vector3; aim: THREE.Vector3; r: number; colour: string }[] = [];
    const setEyes = () => {
      const whites = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: '#f5f2ea', roughness: 0.12 }), eyeSpots.length);
      const irises = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 }), eyeSpots.length);
      const pupils = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.15 }), eyeSpots.length);
      const turn = new THREE.Quaternion(), forward = new THREE.Vector3(0, 0, 1), matrix = new THREE.Matrix4();
      eyeSpots.forEach(({ at, aim, r, colour }, index) => {
        aim.normalize();
        turn.setFromUnitVectors(forward, aim);
        whites.setMatrixAt(index, matrix.compose(at, turn, new THREE.Vector3(r, r, r)));
        irises.setMatrixAt(index, matrix.compose(at.clone().addScaledVector(aim, r * 0.8), turn, new THREE.Vector3(r * 0.56, r * 0.56, r * 0.26)));
        irises.setColorAt(index, new THREE.Color(colour));
        pupils.setMatrixAt(index, matrix.compose(at.clone().addScaledVector(aim, r * 0.94), turn, new THREE.Vector3(r * (slit ? 0.1 : 0.25), r * (slit ? 0.42 : 0.25), r * 0.16)));
      });
      whites.castShadow = whites.receiveShadow = true;
      s.root.add(whites, irises, pupils);
    };
    const upward = () => new THREE.Vector3((random() - 0.5) * 0.7 + 0.25, 1, (random() - 0.5) * 0.7 + 0.45);

    // The drawer cabinet along the back, lower drawers pulled further so every tray shows.
    const cx = 3.7, cw = 4.9, ch = 2.4, cd = 1.9, cz = back + 0.2 + cd / 2, front = cz + cd / 2;
    const cabinet = a.era === 'lauscha' ? wood : s.material(a.era === 'clinic' ? '#ece6d2' : '#d9dde0', { roughness: 0.45 });
    const velvet = s.material(a.felt === 'oxblood' ? '#27324f' : '#5c1f2c', { roughness: 0.98 });
    s.box([cw, ch, cd], [cx, ch / 2, cz], cabinet);
    s.box([cw + 0.16, 0.1, cd + 0.12], [cx, ch + 0.05, cz], trim);
    const drawers = 5, dh = (ch - 0.2) / drawers;
    const knob = s.material(era.knob, { metalness: a.era === 'hospital' ? 0 : 0.75, roughness: 0.35 });
    for (let i = 0; i < drawers; i++) {
      const fromTop = i;
      let pull = derelict ? 0.3 + random() * 0.9 + fromTop * 0.12 : [0, 0.55, 0, 0.95, 1.35][fromTop] * (0.6 + mood.density * 0.4);
      if (a.state === 'closed' && fromTop !== 3) pull = 0;
      const y = ch - 0.1 - (fromTop + 0.5) * dh;
      s.box([cw - 0.2, dh - 0.07, 0.09], [cx, y, front + pull + 0.045], cabinet);
      if (a.era === 'hospital') s.box([1.3, 0.09, 0.1], [cx, y + 0.02, front + pull + 0.13], knob);
      else for (const side of [-1, 1]) s.ball([0.075, 0.075, 0.075], [cx + side * 1.3, y, front + pull + 0.14], knob, 10);
      if (a.era !== 'lauscha') s.box([0.7, 0.2, 0.02], [cx - 1.6, y, front + pull + 0.1], s.material('#fbfaf4'));
      if (pull < 0.1) continue;
      s.box([cw - 0.3, 0.05, pull], [cx, y - dh / 2 + 0.09, front + pull / 2], velvet);
      for (const side of [-1, 1]) s.box([0.06, dh - 0.12, pull], [cx + side * (cw / 2 - 0.16), y - 0.02, front + pull / 2], cabinet);
      const rows = Math.floor(pull / 0.3), cols = 13;
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        if (random() < (derelict ? 0.4 : 0.06 + (1 - mood.density) * 0.12)) continue;
        const shadeIndex = a.stock === 'mixed' || a.stock === 'animal' ? Math.floor(random() * colours.length) : Math.min(colours.length - 1, Math.floor((col / cols) * colours.length));
        eyeSpots.push({ at: new THREE.Vector3(cx - (cw - 0.7) / 2 + (col / (cols - 1)) * (cw - 0.7), y - dh / 2 + 0.24, front + pull - 0.17 - row * 0.3), aim: upward(), r: 0.125, colour: colours[shadeIndex] });
      }
    }
    // A tray lifted out and set on top of the cabinet.
    const trayY = ch + 0.1;
    s.box([3.3, 0.14, 1.5], [cx - 0.5, trayY + 0.07, cz], cabinet);
    s.box([3.1, 0.05, 1.3], [cx - 0.5, trayY + 0.15, cz], velvet);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 9; col++) {
      if (random() < (derelict ? 0.5 : 0.08)) continue;
      const shadeIndex = a.stock === 'mixed' || a.stock === 'animal' ? Math.floor(random() * colours.length) : Math.min(colours.length - 1, Math.floor((col / 9) * colours.length));
      eyeSpots.push({ at: new THREE.Vector3(cx - 0.5 - 1.3 + col * 0.325, trayY + 0.32, cz - 0.48 + row * 0.32), aim: upward(), r: 0.14, colour: colours[shadeIndex] });
    }
    if (derelict) for (let i = 0; i < 16; i++) eyeSpots.push({ at: new THREE.Vector3(mix(-5.5, 6, random()), 0.13, mix(-2.2, 4.4, random())), aim: new THREE.Vector3(random() - 0.5, random(), random() - 0.5), r: 0.13, colour: colours[Math.floor(random() * colours.length)] });

    // Blowlamp, hose and flame.
    const bx = -4.9, bz = -3.1;
    s.lathe([[0, 0], [0.55, 0], [0.55, 0.12], [0.2, 0.3], [0.14, 0.4], [0.14, 1.1], [0, 1.1]], metal, [bx, 0, bz]);
    s.rod([bx, 1.0, bz], [bx + 0.75, 1.5, bz + 0.1], 0.12, metal, 0.09);
    s.ring(0.16, 0.05, [bx, 0.55, bz], dark).rotation.x = Math.PI / 2;
    s.tube([[bx - 0.14, 0.5, bz], [bx - 0.7, 0.12, bz - 0.2], [bx - 0.9, 0.08, bz - 1.0], [bx - 0.3, 0.08, bz - 1.5]], 0.06, s.material(a.era === 'hospital' ? '#d9772a' : '#6a2a22', { roughness: 0.7 }));
    const flames: THREE.Mesh[] = [];
    if (lit) {
      const hot = new THREE.Color().setHSL(mix(0.58, 0.07, mood.warmth), 0.9, 0.6);
      for (const [size, colour, opaque] of [[1, hot, false], [0.5, new THREE.Color('#ffffff'), true]] as const) {
        const flame = s.mesh(new THREE.ConeGeometry(0.16 * size + 0.03, 1.5 * size, 12), new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 1.4, transparent: !opaque, opacity: opaque ? 1 : 0.7, depthWrite: opaque }), [bx + 0.75 + 0.62 * size, 1.5 + 0.41 * size, bz + 0.1 + 0.08 * size]);
        flame.rotation.z = -Math.PI / 2 + 0.59;
        flame.castShadow = false;
        flames.push(flame);
      }
      // A rod held in the flame on a rest, its end glowing.
      s.rod([bx + 3.3, 0.9, bz + 1.4], [bx + 1.75, 2.02, bz + 0.3], 0.05, s.material('#eef2f2', { roughness: 0.1 }));
      s.ball([0.17, 0.17, 0.17], [bx + 1.75, 2.02, bz + 0.3], new THREE.MeshStandardMaterial({ color: '#ffb060', emissive: '#ff7a1c', emissiveIntensity: 1.6 }), 12);
      s.box([0.1, 0.95, 0.1], [bx + 3.2, 0.47, bz + 1.33], metal);
      s.box([0.5, 0.08, 0.4], [bx + 3.2, 0.04, bz + 1.33], metal);
    }

    // Glass rods on a rack and standing in a jar.
    const rodColours = ['#f4f6f6', '#f4f6f6', ...colours, '#c4352b', '#141414'];
    const rackX = -3.0, rackZ = back + 0.7;
    for (const side of [-1, 1]) s.box([0.12, 0.7, 0.7], [rackX + side * 1.1, 0.35, rackZ], wood);
    const rods = 5 + Math.round(mood.density * 8);
    for (let i = 0; i < rods; i++) {
      const row = Math.floor(i / 5), col = i % 5;
      const rod = s.cylinder(0.055, 0.055, 2.9 + random() * 0.5, [rackX + (random() - 0.5) * 0.2, 0.76 + row * 0.115, rackZ - 0.24 + col * 0.12 + (row % 2) * 0.06], s.material(rodColours[Math.floor(random() * rodColours.length)], { roughness: 0.12 }), 8);
      rod.rotation.z = Math.PI / 2;
    }
    s.cylinder(0.3, 0.26, 0.8, [-5.75, 0.4, back + 0.65], s.material('#b9c9c6', { roughness: 0.15 }), 16);
    for (let i = 0; i < 6; i++) {
      const lean = (random() - 0.5) * 0.4, turn = random() * 6.3;
      s.rod([-5.75, 0.1, back + 0.65], [-5.75 + Math.cos(turn) * lean, 2.2 + random() * 0.7, back + 0.65 + Math.sin(turn) * lean * 0.5], 0.045, s.material(rodColours[Math.floor(random() * rodColours.length)], { roughness: 0.12 }));
    }

    // Half-made eyes cooling on their stems.
    const stemX = -0.2, stemZ = back + 0.75;
    s.box([2.4, 0.3, 0.6], [stemX, 0.15, stemZ], wood);
    const watchers: { group: THREE.Group; phase: number }[] = [];
    if (a.state === 'closed') {
      const cloth = s.ball([1.4, 0.8, 0.5], [stemX, 0.5, stemZ], s.material('#e9e4d6', { roughness: 0.95 }), 20);
      cloth.rotation.z = 0.04;
    } else {
      const glass = s.material('#eef2f2', { roughness: 0.1 });
      for (let i = 0; i < 5; i++) {
        const x = stemX - 0.92 + i * 0.46, tall = 1.0 + random() * 0.5;
        if (derelict && random() < 0.4) continue;
        s.rod([x, 0.3, stemZ], [x, 0.3 + tall, stemZ], 0.04, glass);
        const group = new THREE.Group();
        group.position.set(x, 0.3 + tall + 0.2, stemZ);
        const white = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), new THREE.MeshStandardMaterial({ color: '#f5f2ea', roughness: 0.1 }));
        white.castShadow = true;
        group.add(white);
        if (i < 4 || !lit) {
          const iris = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), new THREE.MeshStandardMaterial({ color: colours[Math.floor(random() * colours.length)], roughness: 0.2 }));
          iris.scale.set(0.135, 0.135, 0.06);
          iris.position.z = 0.195;
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.15 }));
          pupil.scale.set(slit ? 0.025 : 0.06, slit ? 0.1 : 0.06, 0.04);
          pupil.position.z = 0.23;
          group.add(iris, pupil);
        }
        group.rotation.set(-0.35, 0.4 + (random() - 0.5) * 0.5, 0, 'YXZ');
        s.root.add(group);
        watchers.push({ group, phase: random() * 6 });
      }
    }

    // The magnifier on its arm, hanging over the hero's place.
    const mx = -1.6, mz = -1.7;
    s.lathe([[0, 0], [0.6, 0], [0.6, 0.14], [0.16, 0.26], [0, 0.26]], a.era === 'lauscha' ? dark : metal, [mx, 0, mz]);
    s.rod([mx, 0.2, mz], [mx, 3.5, mz], 0.07, metal);
    s.ball([0.14, 0.14, 0.14], [mx, 3.5, mz], dark, 10);
    const lensAt: P = [-0.35, 4.55, 0.3];
    s.rod([mx, 3.5, mz], [mx + 0.5, 4.9, mz + 0.9], 0.06, metal);
    s.ball([0.12, 0.12, 0.12], [mx + 0.5, 4.9, mz + 0.9], dark, 10);
    s.rod([mx + 0.5, 4.9, mz + 0.9], [lensAt[0] - 0.55, lensAt[1] + 0.15, lensAt[2] - 0.75], 0.05, metal);
    const rim = s.ring(1.0, a.era === 'hospital' ? 0.14 : 0.08, lensAt, a.era === 'hospital' ? new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#eaf6ff', emissiveIntensity: derelict ? 0 : 1.1 }) : metal);
    rim.rotation.set(-1.05, 0.3, 0, 'YXZ');
    const lens = s.mesh(new THREE.CircleGeometry(1.0, 36), new THREE.MeshPhysicalMaterial({ color: '#dff1f6', transparent: true, opacity: 0.16, roughness: 0.03, depthWrite: false, side: THREE.DoubleSide }), lensAt);
    lens.rotation.copy(rim.rotation);
    lens.castShadow = false;

    // Small tools along the front of the bench.
    const tidy = a.state === 'closed' ? 0 : derelict ? 1 : 0.35;
    const dishes = 3 + Math.round(mood.density * 3);
    for (let i = 0; i < dishes; i++) {
      const x = -1.9 + i * 0.52 + (random() - 0.5) * 0.3 * tidy, z = 4.05 + (random() - 0.5) * 0.4 * tidy;
      s.lathe([[0, 0], [0.16, 0], [0.22, 0.09], [0.2, 0.09], [0.15, 0.03], [0, 0.03]], s.material('#f4f2ea', { roughness: 0.2, side: THREE.DoubleSide }), [x, 0, z]);
      if (a.state !== 'closed') s.cylinder(0.14, 0.14, 0.03, [x, 0.05, z], s.material(colours[i % colours.length], { roughness: 0.5 }), 12);
    }
    const lay = (from: P, length: number, turn: number, radius: number, paintOf: THREE.Material, end = radius) => s.rod(from, [from[0] + Math.cos(turn) * length, from[1], from[2] + Math.sin(turn) * length], radius, paintOf, end);
    const brushTurn = -0.2 + (random() - 0.5) * 1.2 * tidy;
    lay([1.3, 0.05, 4.1], 1.3, brushTurn, 0.04, wood);
    lay([1.3 + Math.cos(brushTurn) * 1.3, 0.05, 4.1 + Math.sin(brushTurn) * 1.3], 0.25, brushTurn, 0.035, dark, 0.005);
    const steel = s.material('#c5c9cf', { metalness: 0.8, roughness: 0.25 });
    const tw = 0.5 + (random() - 0.5) * 1.5 * tidy;
    for (const side of [-1, 1]) lay([-2.6, 0.04, 4.25], 1.1, tw + side * 0.035, 0.035, steel, 0.012);
    if (a.state === 'fitting') {
      // Hand mirror, order card and a ribboned box, set out for the patient.
      s.cylinder(0.5, 0.5, 0.06, [0.6, 0.03, 3.75], metal, 28);
      s.cylinder(0.44, 0.44, 0.02, [0.6, 0.07, 3.75], s.material('#cfe2e8', { roughness: 0.05 }), 28);
      lay([1.05, 0.04, 3.9], 0.75, 0.35, 0.07, metal);
      const order = s.label('Rx  LEFT  No 114', 1.3, 0.8, [-0.6, 0.012, 3.3], era.ink, era.card);
      order.rotation.set(-Math.PI / 2, 0, 0.2);
      s.box([0.7, 0.4, 0.7], [1.9, 0.2, 2.9], s.material('#f1ede2'));
      s.box([0.72, 0.42, 0.1], [1.9, 0.2, 2.9], s.material('#a8233f'));
      s.box([0.1, 0.42, 0.72], [1.9, 0.2, 2.9], s.material('#a8233f'));
    }
    // Dust, stains and wear on the felt.
    const marks = Math.round(dust * 12);
    for (let i = 0; i < marks; i++) {
      const size = 0.15 + random() * 0.5;
      s.cylinder(size, size, 0.008, [mix(-6, 6, random()), 0.005, mix(-4.2, 4.4, random())], s.material(random() < 0.5 ? '#3a352c' : '#cfc8b4', { roughness: 1, transparent: true, opacity: 0.06 + random() * 0.07, depthWrite: false }), 14).castShadow = false;
    }
    setEyes();

    const pace = mix(0.2, 1.4, mood.energy);
    world.update = (_dt, time) => {
      flames.forEach((flame, index) => {
        const lick = 1 + Math.sin(time * (17 + index * 9) * (0.5 + pace)) * 0.06 + Math.sin(time * 5.3 * pace + index) * 0.05;
        flame.scale.set(1, lick, 1);
      });
      for (const { group, phase } of watchers) group.rotation.y = 0.4 + Math.sin(time * pace * 0.5 + phase) * 0.35;
    };
    return world;
  },
});
