import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';

type Rnd = () => number;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const lines = (ctx: CanvasRenderingContext2D, rnd: Rnd, x: number, y: number, w: number, count: number, gap: number, ink: string, h = 3) => {
  ctx.fillStyle = ink;
  for (let i = 0; i < count; i++) ctx.fillRect(x, y + i * gap, w * mix(0.55, 1, rnd()), h);
};
const hue = (rnd: Rnd, s: number, l: number) => `hsl(${Math.floor(rnd() * 360)},${s}%,${l}%)`;

/** One monitor's worth of page, 256 × 160. */
const PAGES = {
  encyclopedia: (ctx: CanvasRenderingContext2D, rnd: Rnd) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#f6f6f6';
    ctx.fillRect(0, 0, 40, 160);
    lines(ctx, rnd, 6, 14, 28, 9, 12, '#9aa0a6', 2);
    ctx.fillStyle = '#202122';
    ctx.fillRect(50, 10, 90 + rnd() * 60, 8);
    ctx.fillStyle = '#a2a9b1';
    ctx.fillRect(50, 22, 196, 1);
    for (let i = 0; i < 14; i++) {
      lines(ctx, rnd, 50, 30 + i * 9, 120, 1, 9, '#333');
      if (rnd() < 0.5) { ctx.fillStyle = '#3366cc'; ctx.fillRect(50 + rnd() * 100, 30 + i * 9, 14 + rnd() * 20, 3); }
    }
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(182, 28, 66, 84);
    ctx.strokeStyle = '#a2a9b1';
    ctx.strokeRect(182.5, 28.5, 65, 83);
    ctx.fillStyle = hue(rnd, 30, 55);
    ctx.fillRect(188, 34, 54, 36);
    lines(ctx, rnd, 188, 76, 54, 4, 8, '#444', 2);
  },
  code: (ctx: CanvasRenderingContext2D, rnd: Rnd) => {
    ctx.fillStyle = '#1e1e28';
    ctx.fillRect(0, 0, 256, 160);
    const tokens = ['#c586c0', '#569cd6', '#ce9178', '#4ec9b0', '#dcdcaa', '#9cdcfe', '#6a9955'];
    for (let i = 0; i < 17; i++) {
      ctx.fillStyle = '#5a5a66';
      ctx.fillRect(4, 6 + i * 9, 10, 3);
      let x = 20 + Math.floor(rnd() * 4) * 10;
      const parts = 2 + Math.floor(rnd() * 5);
      for (let k = 0; k < parts && x < 240; k++) {
        const w = 8 + rnd() * 30;
        ctx.fillStyle = tokens[Math.floor(rnd() * tokens.length)];
        ctx.fillRect(x, 6 + i * 9, w, 3);
        x += w + 5;
      }
    }
  },
  maps: (ctx: CanvasRenderingContext2D, rnd: Rnd) => {
    ctx.fillStyle = '#e8e4d8';
    ctx.fillRect(0, 0, 256, 160);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = rnd() < 0.5 ? '#bfe0b0' : '#a8cfe8';
      ctx.beginPath();
      ctx.ellipse(rnd() * 256, rnd() * 160, 20 + rnd() * 40, 14 + rnd() * 30, rnd() * 3, 0, 7);
      ctx.fill();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      if (rnd() < 0.5) { const y = rnd() * 160; ctx.moveTo(0, y); ctx.lineTo(256, y + (rnd() - 0.5) * 50); }
      else { const x = rnd() * 256; ctx.moveTo(x, 0); ctx.lineTo(x + (rnd() - 0.5) * 50, 160); }
      ctx.stroke();
    }
    ctx.strokeStyle = '#f2c14e';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 60 + rnd() * 40); ctx.lineTo(256, 60 + rnd() * 40); ctx.stroke();
    ctx.fillStyle = '#e03a3a';
    ctx.beginPath(); ctx.arc(100 + rnd() * 60, 60 + rnd() * 40, 7, 0, 7); ctx.fill();
  },
  news: (ctx: CanvasRenderingContext2D, rnd: Rnd) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#b3141c';
    ctx.fillRect(0, 0, 256, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 6, 50, 6);
    ctx.fillStyle = hue(rnd, 35, 45);
    ctx.fillRect(8, 26, 110, 70);
    ctx.fillStyle = '#111';
    ctx.fillRect(126, 28, 110, 9);
    ctx.fillRect(126, 42, 80 + rnd() * 30, 9);
    lines(ctx, rnd, 126, 60, 110, 5, 7, '#555', 2);
    lines(ctx, rnd, 8, 104, 230, 4, 8, '#444', 2);
    ctx.fillStyle = '#b3141c';
    ctx.fillRect(0, 144, 256, 16);
    ctx.fillStyle = '#ffd400';
    ctx.fillRect(0, 144, 46, 16);
    ctx.fillStyle = '#ffffff';
    let x = 52;
    while (x < 250) { const w = 10 + rnd() * 24; ctx.fillRect(x, 150, w, 4); x += w + 6; }
  },
  cameras: (ctx: CanvasRenderingContext2D, rnd: Rnd) => {
    ctx.fillStyle = '#0a0c0c';
    ctx.fillRect(0, 0, 256, 160);
    for (let i = 0; i < 4; i++) {
      const x = (i % 2) * 128 + 3, y = Math.floor(i / 2) * 80 + 3;
      const g = ctx.createLinearGradient(x, y, x, y + 74);
      const tone = 60 + rnd() * 60;
      g.addColorStop(0, `rgb(${tone * 0.9},${tone},${tone * 0.95})`);
      g.addColorStop(1, `rgb(${tone * 0.4},${tone * 0.45},${tone * 0.42})`);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, 122, 74);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let k = 0; k < 3; k++) ctx.fillRect(x + rnd() * 90, y + 20 + rnd() * 40, 10 + rnd() * 30, 14 + rnd() * 30);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let k = 0; k < 74; k += 3) ctx.fillRect(x, y + k, 122, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 4, y + 4, 34, 4);
      ctx.fillStyle = '#ff3030';
      ctx.beginPath(); ctx.arc(x + 114, y + 7, 3, 0, 7); ctx.fill();
    }
  },
  forum: (ctx: CanvasRenderingContext2D, rnd: Rnd) => {
    ctx.fillStyle = '#f0f0f3';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#2b3a55';
    ctx.fillRect(0, 0, 256, 14);
    for (let i = 0; i < 7; i++) {
      const y = 18 + i * 20;
      ctx.fillStyle = i % 2 ? '#ffffff' : '#e6e6ea';
      ctx.fillRect(4, y, 248, 18);
      ctx.fillStyle = hue(rnd, 55, 50);
      ctx.fillRect(8, y + 3, 12, 12);
      ctx.fillStyle = '#1a4a8a';
      ctx.fillRect(26, y + 4, 40 + rnd() * 60, 4);
      lines(ctx, rnd, 26, y + 11, 200, 1, 6, '#666', 2);
    }
  },
} as const;

export default defineThing({
  questions: {
    screens: choice('How many screens?', {
      six: 'Six monitors, two rows of three.',
      nine: 'Nine monitors, a full three-by-three wall.',
    }),
    showing: choice('What do the screens show?', {
      encyclopedia: 'Encyclopedia articles: white pages, blue links, an infobox on the right.',
      code: 'Code editors, dark with coloured syntax.',
      maps: 'Street maps with a red pin and a yellow route.',
      news: 'News sites with a red ticker running along the bottom.',
      cameras: 'A grid of grey security camera feeds, a red dot on each.',
      forum: 'Forum threads, rows of posts with little avatars.',
      mixed: 'A bit of everything: an article, a map, a feed, a terminal.',
    }),
    fault: choice('Is any screen out?', {
      none: 'All of them lit.',
      dark: 'One screen is dark, switched off.',
      bluescreen: 'One screen has crashed to a blue error screen.',
    }),
    reader: choice('Who is at the desk?', {
      nobody: 'Nobody: the chair pushed back, the screens reading to themselves.',
      chin: 'A seated reader with their chin resting in one hand.',
      leaning: 'A reader leaning in close with both elbows on the desk.',
      asleep: 'A reader slumped forward, head down on the desk.',
    }),
    notes: noul('Do sticky notes frame the screens?'),
    desk: choice('What is the desk?', {
      white: 'A white flat-pack desk with pale legs.',
      wood: 'A heavy dark wooden desk.',
      folding: 'A grey folding table.',
      black: 'A black gaming desk with a red stripe.',
    }),
    leftovers: choice('What else has collected on the desk?', {
      cans: 'A row of empty energy drink cans, a night\'s worth.',
      noodles: 'A cup of noodles with chopsticks standing in it.',
      notebook: 'An open notebook of scribbles and arrows.',
      printouts: 'Stacks of printouts, some highlighted.',
      tidy: 'Nothing else: just the keyboard and the one can.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const DW = 1.6, DD = 0.7, DH = 0.74;
    const deskColour = { white: '#f1f1ee', wood: '#5a3b26', folding: '#8a8d90', black: '#1d1e22' }[a.desk];
    const deskMat = s.material(deskColour, { roughness: a.desk === 'wood' ? 0.55 : 0.7 });
    const legMat = s.material({ white: '#d8d8d4', wood: '#4a301e', folding: '#6a6d70', black: '#202226' }[a.desk], { metalness: a.desk === 'folding' ? 0.6 : 0.2 });
    s.box([DW, 0.035, DD], [0, DH - 0.0175, 0], deskMat);
    if (a.desk === 'black') s.box([DW - 0.1, 0.004, 0.03], [0, DH + 0.002, DD / 2 - 0.03], s.material('#d82a2a', { emissive: '#ff2020', emissiveIntensity: 0.4 }));
    if (a.desk === 'folding') for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.012, 0.012, DH - 0.04, [x * (DW / 2 - 0.08), (DH - 0.04) / 2, z * (DD / 2 - 0.08)], legMat, 8);
    else for (const x of [-1, 1]) s.box([0.04, DH - 0.035, DD - 0.1], [x * (DW / 2 - 0.03), (DH - 0.035) / 2, 0], legMat);
    if (a.desk !== 'folding') s.box([DW - 0.1, DH * 0.5, 0.025], [0, DH * 0.42, -DD / 2 + 0.06], legMat);

    // The monitor wall: a pole per column, an arm per screen.
    const cols = 3, rows = a.screens === 'nine' ? 3 : 2;
    const MW = 0.55, MH = 0.32, PITCH_X = 0.58, PITCH_Y = 0.35, BASE_Y = DH + 0.2;
    const pole = s.material('#2c2e33', { metalness: 0.6, roughness: 0.4 });
    const bezel = s.material('#1a1b1f', { roughness: 0.4 });
    const topY = BASE_Y + (rows - 1) * PITCH_Y + MH / 2 + 0.04;
    for (let c = 0; c < cols; c++) {
      const x = (c - 1) * PITCH_X;
      s.cylinder(0.018, 0.018, topY - DH, [x, DH + (topY - DH) / 2, -DD / 2 + 0.1], pole, 12);
      s.box([0.07, 0.03, 0.1], [x, DH + 0.015, -DD / 2 + 0.1], pole);
    }
    const seedBase = Math.floor(random() * 1e6);
    const kinds = Object.keys(PAGES) as (keyof typeof PAGES)[];
    const faulty = a.fault === 'none' ? -1 : Math.floor(random() * rows * cols);
    const screenMats: THREE.MeshStandardMaterial[] = [];
    const glow = mix(0.5, 1.1, mood.cheer);
    let index = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = (c - 1) * PITCH_X, y = BASE_Y + r * PITCH_Y;
      const monitor = new THREE.Group();
      monitor.position.set(x, y, -DD / 2 + 0.17);
      monitor.rotation.y = (c - 1) * -0.22;
      monitor.rotation.x = r === rows - 1 && rows > 1 ? 0.12 : r === 0 ? -0.05 : 0;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(MW, MH, 0.03), bezel);
      frame.castShadow = frame.receiveShadow = true;
      monitor.add(frame);
      const kind: keyof typeof PAGES = a.showing === 'mixed' ? kinds[(index * 5 + Math.floor(random() * 2)) % kinds.length] : a.showing;
      let state = (seedBase + index * 7919) >>> 0;
      const rnd = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
      let map: THREE.Texture;
      if (index === faulty && a.fault === 'dark') map = paint(8, 8, (ctx) => { ctx.fillStyle = '#08090b'; ctx.fillRect(0, 0, 8, 8); });
      else if (index === faulty) map = paint(256, 160, (ctx) => {
        ctx.fillStyle = '#0a46c8'; ctx.fillRect(0, 0, 256, 160);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 44px monospace'; ctx.fillText(':(', 24, 60);
        lines(ctx, rnd, 24, 80, 180, 5, 10, '#ffffff', 4);
      });
      else map = paint(256, 160, (ctx) => PAGES[kind](ctx, rnd));
      const dark = index === faulty && a.fault === 'dark';
      const material = new THREE.MeshStandardMaterial({ map, emissive: dark ? '#000000' : '#ffffff', emissiveMap: dark ? null : map, emissiveIntensity: dark ? 0 : glow, roughness: 0.25 });
      screenMats.push(material);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(MW - 0.03, MH - 0.03), material);
      screen.position.z = 0.016;
      monitor.add(screen);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.12), pole);
      arm.position.set(0, 0, -0.07);
      monitor.add(arm);
      if (a.notes) {
        const note = s.material(['#f5e46a', '#ff9fc2', '#9fe5ff', '#b8f59a'][Math.floor(random() * 4)], { roughness: 0.9 });
        const n = 1 + Math.floor(random() * 3);
        for (let k = 0; k < n; k++) {
          const sticky = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), note);
          const side = random() < 0.5 ? -1 : 1;
          sticky.position.set(random() < 0.6 ? side * (MW / 2 - 0.04 + random() * 0.03) : (random() - 0.5) * MW * 0.8, random() < 0.6 ? MH / 2 - 0.02 + random() * 0.03 : (random() - 0.5) * MH * 0.6, 0.02);
          sticky.rotation.z = (random() - 0.5) * 0.4;
          sticky.castShadow = true;
          monitor.add(sticky);
        }
      }
      s.root.add(monitor);
      index++;
    }

    // Keyboard, mouse, the can, the headphones on their hook.
    const keys = paint(128, 48, (ctx) => {
      ctx.fillStyle = '#2a2b30'; ctx.fillRect(0, 0, 128, 48);
      ctx.fillStyle = '#44464c';
      for (let y = 4; y < 44; y += 9) for (let x = 3; x < 124; x += 8) ctx.fillRect(x, y, 6, 7);
    });
    s.mesh(new THREE.BoxGeometry(0.44, 0.018, 0.15), new THREE.MeshStandardMaterial({ map: keys, roughness: 0.7 }), [-0.05, DH + 0.009, 0.14]);
    s.box([0.06, 0.03, 0.1], [0.3, DH + 0.015, 0.12], s.material('#2a2b30', { roughness: 0.4 }));
    const canMat = s.material(['#1b1b1d', '#24a84a', '#2050d8', '#d81a4a'][Math.floor(random() * 4)], { metalness: 0.7, roughness: 0.3 });
    const canAt = (x: number, z: number, lean = 0) => {
      const can = s.cylinder(0.027, 0.027, 0.16, [x, DH + 0.08, z], canMat, 16);
      s.cylinder(0.025, 0.027, 0.012, [x, DH + 0.165, z], s.material('#c9cdd0', { metalness: 0.9, roughness: 0.3 }), 16);
      s.box([0.03, 0.05, 0.001], [x, DH + 0.09, z + 0.0275], s.material('#f2f2ea', { emissive: '#ffffff', emissiveIntensity: 0.1 }));
      can.rotation.z = lean;
      return can;
    };
    canAt(0.5, 0.2);
    const hookX = DW / 2 + 0.02;
    s.box([0.03, 0.06, 0.03], [hookX, DH - 0.03, 0.25], s.material('#4a4c52', { metalness: 0.6 }));
    const headband = s.ring(0.095, 0.012, [hookX + 0.015, DH - 0.14, 0.25], s.material('#202226'), Math.PI);
    headband.rotation.z = 0;
    for (const dz of [-0.095, 0.095]) s.cylinder(0.045, 0.045, 0.03, [hookX + 0.015, DH - 0.16, 0.25 + dz], s.material('#2a2c31', { roughness: 0.5 }), 16).rotation.x = Math.PI / 2;

    if (a.leftovers === 'cans') for (let i = 0; i < 5 + Math.round(mood.density * 4); i++) canAt(-DW / 2 + 0.12 + i * 0.075, -0.2 + (random() - 0.5) * 0.08, random() < 0.2 ? 0.3 : 0);
    if (a.leftovers === 'noodles') {
      s.cylinder(0.05, 0.04, 0.09, [-0.5, DH + 0.045, 0.12], s.material('#f1eadb', { roughness: 0.8 }), 16);
      s.cylinder(0.05, 0.05, 0.004, [-0.5, DH + 0.088, 0.12], s.material('#e8c070'), 16);
      for (const dx of [-0.01, 0.01]) s.rod([-0.5 + dx, DH + 0.07, 0.12], [-0.46 + dx * 3, DH + 0.24, 0.05], 0.003, s.material('#d9b382'));
    }
    if (a.leftovers === 'notebook') {
      const page = paint(128, 96, (ctx) => {
        ctx.fillStyle = '#f7f3e6'; ctx.fillRect(0, 0, 128, 96);
        ctx.strokeStyle = '#2a3a6a'; ctx.lineWidth = 1.2;
        for (let i = 0; i < 24; i++) { ctx.beginPath(); ctx.moveTo(random() * 128, random() * 96); ctx.lineTo(random() * 128, random() * 96); ctx.stroke(); }
        for (let i = 0; i < 9; i++) { ctx.fillStyle = `rgba(40,50,90,${0.5 + random() * 0.4})`; ctx.fillRect(8 + random() * 60, 6 + i * 10, 20 + random() * 50, 2); }
      });
      s.mesh(new THREE.BoxGeometry(0.3, 0.012, 0.22), new THREE.MeshStandardMaterial({ map: page, roughness: 0.9 }), [-0.5, DH + 0.006, 0.15]).rotation.y = 0.25;
    }
    if (a.leftovers === 'printouts') {
      for (let i = 0; i < 3; i++) s.box([0.21, 0.015 + random() * 0.02, 0.3], [-0.55 + i * 0.08, DH + 0.012 + i * 0.01, -0.1 + i * 0.12], s.material('#f4f1e8')).rotation.y = (random() - 0.5) * 0.5;
      s.box([0.1, 0.003, 0.012], [-0.5, DH + 0.06, 0.05], s.material('#f5e46a', { emissive: '#f5e46a', emissiveIntensity: 0.3 }));
    }

    // The chair, and whoever is in it.
    let person: ReturnType<typeof figure> | null = null;
    const chairMat = s.material('#26272b', { roughness: 0.6 });
    const chairX = 0.05, chairZ = a.reader === 'nobody' ? 0.95 : 0.62;
    const seatH = 0.47;
    if (a.reader !== 'nobody') {
      const skin = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0'][Math.floor(random() * 4)];
      const top = ['#5b6a7a', '#3a3f4a', '#7a3a3a', '#2f5a4a'][Math.floor(random() * 4)];
      person = figure(s, { height: 1.7, style: 'doll', pose: 'sitting', hair: ['short', 'long', 'bun', 'cap'][Math.floor(random() * 4)] as 'short', gaze: a.reader === 'asleep' ? 'down' : 'ahead', skin, top, bottom: '#2a2d33', shoes: '#1c1c1e', sleeves: random() < 0.5 ? 'long' : 'short' });
      const { joints } = person;
      if (a.reader === 'chin') {
        joints.spine.rotation.x = 0.22;
        joints.shoulders.right.rotation.x = -1.15;
        joints.shoulders.right.rotation.z = 0.25;
        joints.elbows.right.rotation.set(-2.35, -0.35, 0);
        joints.shoulders.left.rotation.x = -0.9;
        joints.elbows.left.rotation.x = -0.6;
        joints.neck.rotation.set(0.12, -0.15, 0.18);
      } else if (a.reader === 'leaning') {
        joints.spine.rotation.x = 0.45;
        for (const side of ['left', 'right'] as const) {
          joints.shoulders[side].rotation.x = -1.0;
          joints.elbows[side].rotation.set(-1.6, 0, 0);
        }
        joints.neck.rotation.x = -0.2;
      } else {
        joints.spine.rotation.x = 1.05;
        joints.neck.rotation.x = 0.5;
        for (const side of ['left', 'right'] as const) {
          joints.shoulders[side].rotation.x = -1.5;
          joints.shoulders[side].rotation.z = side === 'left' ? 0.35 : -0.35;
          joints.elbows[side].rotation.set(-0.5, 0, 0);
        }
      }
      person.settle();
      const holder = new THREE.Group();
      holder.add(person.root);
      holder.position.set(chairX, 0, chairZ);
      holder.rotation.y = Math.PI;
      s.root.add(holder);
      holder.updateMatrixWorld(true);
    }
    const hips = person ? person.pelvis.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(chairX, seatH, chairZ);
    const seatY = person ? Math.max(0.3, person.hipHeight - 0.05) : seatH;
    s.box([0.46, 0.06, 0.44], [hips.x, seatY - 0.03, hips.z], chairMat);
    s.box([0.44, 0.5, 0.06], [hips.x, seatY + 0.27, hips.z + 0.2], chairMat);
    s.cylinder(0.03, 0.03, seatY - 0.08, [hips.x, (seatY - 0.08) / 2 + 0.02, hips.z], s.material('#6a6d72', { metalness: 0.7 }), 10);
    for (let k = 0; k < 5; k++) {
      const angle = (k / 5) * Math.PI * 2;
      s.rod([hips.x, 0.04, hips.z], [hips.x + Math.cos(angle) * 0.3, 0.025, hips.z + Math.sin(angle) * 0.3], 0.014, chairMat);
      s.ball([0.025, 0.025, 0.025], [hips.x + Math.cos(angle) * 0.3, 0.025, hips.z + Math.sin(angle) * 0.3], chairMat, 8);
    }

    const pace = mix(0.2, 1.4, mood.energy);
    return s.finish({
      update(dt, time) {
        screenMats.forEach((material, i) => { if (material.emissiveIntensity > 0) material.emissiveIntensity = glow * (0.96 + 0.04 * Math.sin(time * 9 * pace + i)); });
        person?.update(dt, time);
      },
    });
  },
});
