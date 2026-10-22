import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const SIGNS = {
  pickup: 'PICK UP',
  dropoff: 'DROP OFF',
  consult: 'CONSULTATION',
  rx: 'PRESCRIPTIONS',
  farmacia: 'FARMACIA',
} as const;

export default defineThing({
  questions: {
    sign: choice('What does the overhead sign say?', {
      pickup: 'PICK UP: where you collect what is ready.',
      dropoff: 'DROP OFF: where you hand over the slip and are told twenty minutes.',
      consult: 'CONSULTATION: a quiet word with the pharmacist.',
      rx: 'PRESCRIPTIONS, plain and general.',
      farmacia: 'FARMACIA, with a cross.',
    }),
    state: choice('Is the window open?', {
      open: 'Open and lit, the shelves in full view.',
      closing: 'The roll-down grille is half lowered: closing, or just opening.',
      shut: 'Shut: the grille is pulled all the way down to the counter and the light is off.',
      away: 'Open but unattended, with a BACK IN 15 MINUTES card propped on the counter.',
    }),
    style: choice('What is the counter built like?', {
      chain: 'A white laminate chain-store counter with a bold colour stripe.',
      wood: 'Dark panelled wood with a brass rail, an old apothecary.',
      clinic: 'Pale green and white with a glass sneeze screen, a European pharmacy or clinic.',
      steel: 'Brushed steel and grey, a hospital dispensary hatch.',
    }),
    bell: choice('How do you get attention?', {
      none: 'You wait.',
      bell: 'A domed brass desk bell on the counter.',
      card: 'A bell with a RING FOR SERVICE card beside it.',
      buzzer: 'A red push-button buzzer on a little box.',
    }),
    floor: choice('What marks the queue on the floor in front?', {
      none: 'Nothing.',
      tape: 'A strip of striped tape and the words WAIT HERE, for privacy.',
      feet: 'Two footprint stickers where you are meant to stand.',
      belt: 'Two stanchion posts with a retractable belt.',
    }),
    waiting: choice('What is sitting on the counter?', {
      nothing: 'Nothing; it is wiped clean.',
      bag: 'A white stapled prescription bag, ready for someone.',
      clipboard: 'A clipboard and a pen on a chain.',
      stack: 'A queue of several bags lined up, a busy afternoon.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const palette = {
      chain: { body: '#f1f1ec', accent: mood.cheer > 0.5 ? '#d8322f' : '#1f4f9a', top: '#d8d9d6', post: '#e6e6e0' },
      wood: { body: '#5a341c', accent: '#b8923a', top: '#3a2212', post: '#4a2a16' },
      clinic: { body: '#f4f7f3', accent: '#1f9a55', top: '#e9eee9', post: '#dfe8e0' },
      steel: { body: '#aab1b5', accent: '#3a4046', top: '#c9ced1', post: '#8f979c' },
    }[a.style];
    const body = s.material(palette.body, { roughness: a.style === 'steel' ? 0.35 : 0.55, metalness: a.style === 'steel' ? 0.6 : 0 });
    const accent = s.material(palette.accent, { roughness: 0.45, metalness: a.style === 'wood' ? 0.8 : 0 });
    const post = s.material(palette.post, { roughness: 0.55, metalness: a.style === 'steel' ? 0.5 : 0 });
    const dark = s.material('#23272b', { roughness: 0.6 });
    const steel = s.material('#c5cacc', { metalness: 0.85, roughness: 0.3 });
    const lit = a.state !== 'shut';

    const W = 2.3, raise = 0.16, counterY = 1.08, headY = 2.12;
    // The raised dispensary floor and a back wall of shelving.
    s.box([W, raise, 1.25], [0, raise / 2, -0.55], s.material(a.style === 'wood' ? '#4a2a16' : '#b9bdb8', { roughness: 0.8 }));
    s.box([W, 2.3, 0.06], [0, 1.15 + raise, -1.15], post);
    const shelfZ = -1.0;
    const shelfLevels = [0.55, 0.9, 1.25, 1.6, 1.95];
    for (const y of shelfLevels) s.box([W - 0.12, 0.025, 0.26], [0, y + raise, shelfZ], a.style === 'wood' ? post : s.material('#eceee9'));
    for (const x of [-W / 2 + 0.05, -W / 6, W / 6, W / 2 - 0.05]) s.box([0.03, 1.75, 0.26], [x, 1.25 + raise, shelfZ], a.style === 'wood' ? post : s.material('#dfe2dc'));
    // Bottles: one instanced lathe, white with the odd amber or brown one.
    const bottleProfile = new THREE.LatheGeometry([[0, 0], [0.032, 0], [0.034, 0.01], [0.034, 0.075], [0.02, 0.092], [0.02, 0.1], [0.024, 0.1], [0.024, 0.118], [0, 0.118]].map(([r, y]) => new THREE.Vector2(r, y)), 10);
    const stock = mix(0.45, 1, mood.density) * mix(1, 0.7, mood.wear);
    const places: { at: THREE.Vector3; size: number; colour: THREE.Color }[] = [];
    for (const y of shelfLevels) for (let x = -W / 2 + 0.12; x < W / 2 - 0.1; x += 0.082) for (const row of [0, 1]) {
      if (random() > stock) continue;
      const jitter = a.style === 'wood' ? 1.25 : 1;
      const tint = a.style === 'wood' ? ['#6a3a1c', '#2f5a8a', '#3a6a4a', '#e8e2d0', '#8a5a2a'][Math.floor(random() * 5)] : random() < 0.82 ? '#f6f6f2' : random() < 0.5 ? '#d9822a' : '#c9d8e6';
      places.push({ at: new THREE.Vector3(x + (random() - 0.5) * 0.012, y + raise + 0.0125, shelfZ + 0.06 - row * 0.085), size: mix(0.8, 1.25, random()) * jitter, colour: new THREE.Color(tint) });
    }
    const bottles = new THREE.InstancedMesh(bottleProfile, new THREE.MeshStandardMaterial({ roughness: 0.4 }), places.length);
    const m = new THREE.Matrix4();
    places.forEach((place, index) => {
      m.makeScale(place.size, place.size, place.size).setPosition(place.at);
      bottles.setMatrixAt(index, m);
      bottles.setColorAt(index, place.colour);
    });
    bottles.instanceMatrix.needsUpdate = true;
    if (bottles.instanceColor) bottles.instanceColor.needsUpdate = true;
    bottles.castShadow = bottles.receiveShadow = true;
    s.root.add(bottles);
    // Label bands painted as one strip per shelf row, in front of the bottles.
    if (a.style !== 'wood') for (const y of shelfLevels) s.box([W - 0.14, 0.02, 0.004], [0, y + raise - 0.005, shelfZ + 0.132], accent);

    // The counter: a tall front panel, a worktop, a lower hand-over ledge.
    const cz = 0.1;
    s.box([W, counterY, 0.5], [0, counterY / 2, cz], body);
    s.box([W + 0.04, 0.045, 0.6], [0, counterY + 0.0225, cz + 0.02], s.material(palette.top, { roughness: 0.35 }));
    s.box([W, 0.1, 0.02], [0, 0.05, cz + 0.256], dark);
    if (a.style === 'chain') { s.box([W, 0.16, 0.012], [0, 0.82, cz + 0.254], accent); s.box([W, 0.035, 0.012], [0, 0.68, cz + 0.254], accent); }
    else if (a.style === 'wood') {
      for (let i = 0; i < 4; i++) { s.box([W / 4 - 0.1, 0.7, 0.015], [-W / 2 + (i + 0.5) * W / 4, 0.55, cz + 0.255], post); s.box([W / 4 - 0.18, 0.6, 0.012], [-W / 2 + (i + 0.5) * W / 4, 0.55, cz + 0.264], body); }
      s.rod([-W / 2 + 0.08, 0.22, cz + 0.36], [W / 2 - 0.08, 0.22, cz + 0.36], 0.018, accent);
      for (const x of [-W / 2 + 0.1, 0, W / 2 - 0.1]) s.rod([x, 0.22, cz + 0.26], [x, 0.22, cz + 0.36], 0.012, accent);
    } else if (a.style === 'clinic') {
      s.box([W, 0.05, 0.012], [0, 0.95, cz + 0.254], accent);
      const cross = s.material('#1f9a55', { emissive: '#19c060', emissiveIntensity: lit ? 0.5 : 0.05 });
      s.box([0.1, 0.32, 0.012], [0, 0.55, cz + 0.256], cross); s.box([0.32, 0.1, 0.012], [0, 0.55, cz + 0.256], cross);
    } else for (let i = 1; i < 5; i++) s.box([0.006, counterY - 0.14, 0.006], [-W / 2 + i * W / 5, counterY / 2 + 0.05, cz + 0.254], dark);

    // Posts, header and sign.
    for (const x of [-1, 1]) s.box([0.1, 2.5, 0.14], [x * (W / 2 - 0.05), 1.25, cz + 0.12], post);
    s.box([W, 0.4, 0.2], [0, headY + 0.2, cz + 0.12], post);
    const signMap = paint(768, 128, (c, w, h) => {
      c.fillStyle = a.style === 'wood' ? '#2a160c' : palette.accent;
      c.fillRect(0, 0, w, h);
      c.fillStyle = a.style === 'wood' ? '#e2c36a' : '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `bold 84px ${a.style === 'wood' ? 'serif' : 'sans-serif'}`;
      c.fillText(SIGNS[a.sign], w / 2 + (a.sign === 'farmacia' ? 50 : 0), h / 2 + 4, w - 150);
      if (a.sign === 'farmacia') { c.fillStyle = a.style === 'wood' ? '#e2c36a' : '#ffffff'; c.fillRect(96, 22, 28, 84); c.fillRect(68, 50, 84, 28); }
    });
    s.mesh(new THREE.PlaneGeometry(W - 0.4, 0.28), new THREE.MeshStandardMaterial({ map: signMap, roughness: 0.5, emissive: '#ffffff', emissiveMap: signMap, emissiveIntensity: lit ? mix(0.3, 0.75, 1 - Math.abs(mood.daylight - 0.5) * 0 ) * 0.8 : 0.04 }), [0, headY + 0.2, cz + 0.222]);
    // Under-header light strip.
    const strip = s.material('#fff8dc', { emissive: '#fff4c4', emissiveIntensity: lit ? 1.1 : 0 });
    s.box([W - 0.3, 0.025, 0.1], [0, headY - 0.013, cz + 0.1], strip);

    // Privacy dividers: frosted wings standing forward from the counter.
    const frosted = new THREE.MeshStandardMaterial({ color: a.style === 'wood' ? '#6a4024' : '#dfeef0', roughness: 0.6, transparent: a.style !== 'wood', opacity: a.style === 'wood' ? 1 : 0.72 });
    const bay = W / 2 - 0.42;
    for (const x of [-bay, bay]) {
      s.box([0.03, 0.62, 0.55], [x, counterY + 0.355, cz + 0.3], frosted);
      s.box([0.045, 0.03, 0.57], [x, counterY + 0.68, cz + 0.3], a.style === 'wood' ? accent : steel);
      s.box([0.045, 0.045, 0.57], [x, counterY + 0.045 + 0.0225, cz + 0.3], a.style === 'wood' ? accent : steel);
    }
    if (a.style === 'clinic') s.box([bay * 2, 0.7, 0.012], [0, counterY + 0.5, cz + 0.05], new THREE.MeshStandardMaterial({ color: '#e6f6f4', transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false }));

    // A terminal on the working side, so somebody plainly works here.
    s.box([0.34, 0.26, 0.03], [bay + 0.2, counterY + 0.24, cz - 0.1], dark).rotation.y = -0.3;
    s.box([0.08, 0.1, 0.06], [bay + 0.2, counterY + 0.08, cz - 0.12], dark);

    // The grille.
    const drop = { open: 0, away: 0, closing: mix(0.4, 0.6, random()), shut: 1 }[a.state];
    const gz = cz + 0.2;
    s.cylinder(0.07, 0.07, W - 0.22, [0, headY - 0.02, gz - 0.09], steel, 14).rotation.z = Math.PI / 2;
    if (drop > 0) {
      const fall = (headY - counterY - 0.045) * drop;
      const slatPitch = 0.07;
      const slatCount = Math.floor(fall / slatPitch);
      const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(W - 0.22, 0.022, 0.014), new THREE.MeshStandardMaterial({ color: '#aeb4b8', metalness: 0.7, roughness: 0.4 }), Math.max(1, slatCount));
      for (let i = 0; i < slatCount; i++) { m.makeTranslation(0, headY - 0.05 - i * slatPitch, gz); slats.setMatrixAt(i, m); }
      const linkCount = Math.round((W - 0.22) / 0.11);
      const links = new THREE.InstancedMesh(new THREE.BoxGeometry(0.014, slatPitch, 0.01), slats.material, Math.max(1, slatCount * linkCount));
      let k = 0;
      for (let i = 0; i < slatCount; i++) for (let j = 0; j < linkCount; j++) {
        m.makeTranslation(-(W - 0.22) / 2 + 0.055 + j * 0.11 + (i % 2) * 0.055 - 0.027, headY - 0.05 - i * slatPitch - slatPitch / 2, gz);
        links.setMatrixAt(k++, m);
      }
      for (const mesh of [slats, links]) { mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = true; s.root.add(mesh); }
      s.box([W - 0.2, 0.05, 0.03], [0, headY - 0.05 - slatCount * slatPitch, gz], steel);
      if (a.state === 'shut') {
        s.box([0.05, 0.07, 0.03], [0, counterY + 0.085, gz + 0.02], s.material('#b8923a', { metalness: 0.8, roughness: 0.3 }));
        s.ring(0.022, 0.006, [0, counterY + 0.13, gz + 0.02], steel, Math.PI);
        const closed = s.label('CLOSED', 0.5, 0.16, [0, counterY + 0.62, gz + 0.012], '#ffffff', '#b01c1c');
        closed.rotation.z = (random() - 0.5) * 0.08;
      }
    }

    // On the counter.
    const top = counterY + 0.045;
    const fz = cz + 0.2;
    const paper = s.material('#f6f4ec', { roughness: 0.95 });
    const bag = (x: number, z: number, size: number) => {
      const g = new Sculpture(context);
      g.box([0.14, 0.2, 0.07], [0, 0.1, 0], paper);
      g.box([0.14, 0.04, 0.02], [0, 0.215, 0.005], paper).rotation.x = 0.25;
      g.box([0.1, 0.055, 0.002], [0, 0.11, 0.0365], s.material('#ffffff'));
      g.box([0.1, 0.012, 0.003], [0, 0.132, 0.0368], accent);
      g.box([0.04, 0.13, 0.002], [0.035, 0.14, 0.04], s.material('#fbfaf4')).rotation.z = (random() - 0.5) * 0.2;
      g.root.position.set(x, top, z);
      g.root.rotation.y = (random() - 0.5) * 0.5;
      g.root.scale.setScalar(size);
      s.root.add(g.root);
    };
    if (a.waiting === 'bag') bag(-0.15 + (random() - 0.5) * 0.3, fz, 1.3);
    else if (a.waiting === 'stack') { const n = 3 + Math.round(mix(0, 3, mood.density)); for (let i = 0; i < n; i++) bag(-0.5 + i * 0.2 + (random() - 0.5) * 0.04, fz - 0.05 + (random() - 0.5) * 0.08, mix(1, 1.35, random())); }
    else if (a.waiting === 'clipboard') {
      const board = s.box([0.24, 0.012, 0.33], [-0.2, top + 0.006, fz], s.material('#7a5a34', { roughness: 0.7 }));
      board.rotation.y = 0.25;
      s.box([0.21, 0.004, 0.28], [-0.2, top + 0.014, fz + 0.01], paper).rotation.y = 0.25;
      s.box([0.1, 0.02, 0.03], [-0.235, top + 0.022, fz - 0.14], steel).rotation.y = 0.25;
      s.tube([[-0.1, top + 0.01, fz - 0.16], [0.02, top + 0.02, fz - 0.1], [0.1, top + 0.008, fz + 0.02], [0.16, top + 0.012, fz + 0.08]], 0.003, steel);
      s.rod([0.1, top + 0.008, fz + 0.04], [0.22, top + 0.008, fz + 0.1], 0.006, s.material('#1f4f9a'));
    }
    const bx = 0.45;
    if (a.bell === 'bell' || a.bell === 'card') {
      const brass = s.material('#c9a23f', { metalness: 0.85, roughness: 0.25 });
      s.cylinder(0.075, 0.08, 0.015, [bx, top + 0.0075, fz], dark, 20);
      s.ball([0.068, 0.05, 0.068], [bx, top + 0.015, fz], brass, 20);
      s.cylinder(0.008, 0.008, 0.03, [bx, top + 0.075, fz], brass, 8);
      s.ball([0.014, 0.008, 0.014], [bx, top + 0.092, fz], dark, 10);
      if (a.bell === 'card') { const card = s.label('RING FOR SERVICE', 0.3, 0.1, [bx + 0.05, top + 0.06, fz - 0.14], '#1c2026', '#f6f1df'); card.rotation.x = -0.25; }
    } else if (a.bell === 'buzzer') {
      s.box([0.12, 0.05, 0.1], [bx, top + 0.025, fz], dark);
      s.cylinder(0.03, 0.03, 0.02, [bx, top + 0.06, fz], s.material('#d8322f', { emissive: '#ff2a1a', emissiveIntensity: lit ? 0.6 : 0.1 }), 16);
    }
    if (a.state === 'away') {
      const card = s.label('BACK IN 15 MIN', 0.42, 0.2, [0.05, top + 0.1, cz - 0.02], '#b01c1c', '#fbf7e6');
      card.rotation.x = -0.2;
      s.box([0.42, 0.01, 0.1], [0.05, top + 0.005, cz - 0.05], dark);
    }

    // Queue marks on the floor in front.
    const qz = cz + 1.25;
    if (a.floor === 'tape') {
      const map = paint(512, 96, (c, w, h) => {
        c.fillStyle = '#f2c81e';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#1c1c1c';
        for (let x = -h; x < w; x += 56) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 26, h); c.lineTo(x + 26 + 30, h - 30); c.lineTo(x + 30, h - 30); c.fill(); }
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = 'bold 50px sans-serif';
        c.fillText('WAIT HERE', w / 2, 36);
      });
      const tape = s.mesh(new THREE.BoxGeometry(1.5, 0.004, 0.28), [dark, dark, new THREE.MeshStandardMaterial({ map, roughness: 0.8 }), dark, dark, dark] as unknown as THREE.Material, [0, 0.002, qz]);
      tape.rotation.y = (random() - 0.5) * mood.wear * 0.12;
    } else if (a.floor === 'feet') {
      const sole = s.material(palette.accent === '#3a4046' ? '#2a7fc0' : palette.accent, { roughness: 0.8 });
      for (const dx of [-0.11, 0.11]) {
        s.ball([0.055, 0.003, 0.1], [dx, 0.003, qz - 0.04], sole, 14).rotation.y = -dx * 1.2;
        s.ball([0.045, 0.003, 0.045], [dx * 1.1, 0.003, qz + 0.1], sole, 12);
      }
      s.cylinder(0.3, 0.3, 0.003, [0, 0.0015, qz], s.material('#f4f4ee', { roughness: 0.8 }), 32);
    } else if (a.floor === 'belt') {
      for (const x of [-0.75, 0.75]) {
        s.cylinder(0.16, 0.17, 0.03, [x, 0.015, qz], dark, 20);
        s.cylinder(0.03, 0.03, 0.95, [x, 0.5, qz], steel, 14);
        s.cylinder(0.045, 0.045, 0.09, [x, 0.98, qz], dark, 14);
      }
      const sag = mix(0.0, 0.05, mood.wear);
      s.tube([[-0.75, 0.97, qz], [0, 0.97 - sag, qz + 0.005], [0.75, 0.97, qz]], 0.006, accent).scale.set(1, 1, 1);
      s.box([1.46, 0.055, 0.004], [0, 0.965 - sag / 2, qz], s.material(palette.accent === '#3a4046' ? '#2a4f9a' : palette.accent, { roughness: 0.8 }));
    }

    const flicker = mood.wear > 0.6 && lit;
    return s.finish({
      footprint: 1.25,
      update: (_dt, time) => {
        if (flicker) strip.emissiveIntensity = Math.sin(time * 23) * Math.sin(time * 5.1) > 0.6 ? 0.25 : 1.1;
      },
    });
  },
});
