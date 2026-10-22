import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { flood } from './flood';

type V3 = readonly [number, number, number];
const PAINTS = {
  saffron: 'Saffron orange with red trim.',
  whitewash: 'Thick whitewash with sky-blue trim.',
  pink: 'Sugar pink with yellow trim, repainted every festival.',
  green: 'Sea green with white trim.',
  tiled: 'Faced with glossy white bathroom tiles, easy to wash down.',
  bare: 'Bare grey cement blackened by years of lamp soot.',
} as const;
const BODY: Record<keyof typeof PAINTS, [string, string]> = {
  saffron: ['#e58a2a', '#b3261f'], whitewash: ['#ece9df', '#3f8fd0'], pink: ['#e79ab0', '#edc531'], green: ['#4fa58c', '#f0ede2'], tiled: ['#eef0ee', '#2f6fa8'], bare: ['#8f8d86', '#5a5852'],
};

export default defineThing({
  questions: {
    form: choice('What form does the shrine take?', {
      niche: 'A waist-wide masonry pillar with an arched niche cut into its face.',
      temple: 'A tiny temple on a plinth, with a curved spire, a finial and a pennant.',
      tree: 'A tree-trunk altar: a ringed masonry platform round an old tree, threads tied round the bark and a little box shrine against it.',
      post: 'A glass-fronted wooden box with a tin roof, mounted on a steel post.',
      dome: 'A small whitewashed cube under a dome, with a latticed arch and corner turrets.',
    }),
    paint: choice('How is it painted?', PAINTS),
    enshrined: choice('What is inside the shrine?', {
      stone: 'A rounded stone smeared with vermilion, with two silver eyes.',
      picture: 'A framed, faded calendar picture with a gilt border.',
      figure: 'A small seated brass figure.',
      trident: 'An iron trident hung with a red cloth and lemons.',
      cloth: 'Nothing figurative: a folded green and gold cloth strewn with petals.',
    }),
    flame: choice('What is the lamp doing?', {
      steady: 'A single clay lamp burning steadily.',
      guttering: 'One small flame guttering, almost out.',
      row: 'A whole row of clay lamps lit along the sill.',
      out: 'Gone out a moment ago, a thread of smoke still rising.',
      bulb: 'No oil lamp: a bare red electric bulb on a wire, still somehow lit.',
    }),
    garlands: choice('What are the garlands like?', {
      fresh: 'Fresh marigolds, fat orange and yellow strings hung this morning.',
      wilted: 'Wilted and browning, sagging low, heads dropping into the water.',
      jasmine: 'White jasmine strings with red roses knotted in.',
      tinsel: 'Shiny plastic tinsel garlands in gold and magenta that never fade.',
      none: 'No garlands at all, only a few old threads.',
    }),
    offerings: choice('What offerings have been left?', {
      none: 'None.',
      coconut: 'A coconut and a hand of bananas on a leaf.',
      incense: 'A bundle of incense sticks smoking in a holder.',
      coins: 'A steel plate of coins and a few folded notes.',
      sweets: 'An open box of yellow sweets.',
      floating: 'Leaf boats with tiny lamps set adrift on the floodwater around it.',
    }),
    waterline: score('How high has the water risen on the shrine?', ['Only around its foot', 'Halfway up the base', 'Lapping just under the lamp sill']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [bodyTint, trimTint] = BODY[a.paint];
    let body: THREE.Material = s.material(bodyTint, { roughness: a.paint === 'tiled' ? 0.25 : 0.85 });
    if (a.paint === 'tiled') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#b9bdb9'; ctx.fillRect(0, 0, 128, 128);
      for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) { ctx.fillStyle = (x + y) % 5 === 0 ? '#bcd6ea' : '#f1f3f0'; ctx.fillRect(x * 32 + 1.5, y * 32 + 1.5, 29, 29); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1.5, 1.5);
      body = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.25 });
    }
    const trim = s.material(trimTint, { roughness: 0.7 });
    const dark = s.material('#1c1815', { roughness: 1 });
    const brass = s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 });
    const stone = s.material('#9d978a', { roughness: 0.95 });
    const sphere = new THREE.SphereGeometry(1, 14, 10);

    // Each form reports where its sill is, how wide the opening is and where garlands can hang from.
    let sill: V3 = [0, 1, 0.3], open = 0.44, hang: [V3, V3] = [[-0.3, 1.6, 0.32], [0.3, 1.6, 0.32]], reach = 0.9, peak = 2;
    const archedRecess = (x: number, y: number, z: number, w: number, h: number) => {
      s.box([w, h - w / 2, 0.02], [x, y + (h - w / 2) / 2, z], dark);
      const head = s.cylinder(w / 2, w / 2, 0.02, [x, y + h - w / 2, z], dark, 20);
      head.rotation.x = Math.PI / 2;
      const arch = s.ring(w / 2 + 0.025, 0.028, [x, y + h - w / 2, z + 0.012], trim, Math.PI);
      arch.scale.z = 0.5;
      for (const side of [-1, 1]) s.box([0.05, h - w / 2, 0.03], [x + side * (w / 2 + 0.025), y + (h - w / 2) / 2, z + 0.012], trim);
    };
    if (a.form === 'niche') {
      s.box([0.78, 1.72, 0.6], [0, 0.86, 0], body);
      s.box([0.9, 0.08, 0.72], [0, 1.76, 0], trim);
      s.box([0.66, 0.12, 0.5], [0, 1.86, 0], body);
      const cap = s.mesh(new THREE.ConeGeometry(0.34, 0.3, 4), body, [0, 2.07, 0]);
      cap.rotation.y = Math.PI / 4;
      s.ball([0.05, 0.07, 0.05], [0, 2.26, 0], brass, 10);
      s.box([0.86, 0.1, 0.68], [0, 0.42, 0], trim);
      archedRecess(0, 1.0, 0.301, 0.46, 0.6);
      s.box([0.62, 0.05, 0.2], [0, 0.975, 0.36], trim);
      sill = [0, 1.0, 0.38]; open = 0.46; hang = [[-0.36, 1.7, 0.33], [0.36, 1.7, 0.33]]; reach = 0.72; peak = 2.3;
    } else if (a.form === 'temple') {
      s.box([1.05, 0.78, 1.05], [0, 0.39, 0], body);
      s.box([1.14, 0.07, 1.14], [0, 0.78, 0], trim);
      for (let i = 0; i < 3; i++) s.box([0.6, 0.2, 0.24], [0, 0.1 + i * 0.2, 0.64 + (2 - i) * 0.22], stone);
      s.box([0.72, 0.6, 0.66], [0, 1.115, -0.1], body);
      archedRecess(0, 0.83, 0.232, 0.38, 0.5);
      s.box([0.9, 0.06, 0.84], [0, 1.44, -0.1], trim);
      const spire = s.lathe([[0.4, 0], [0.36, 0.2], [0.27, 0.45], [0.16, 0.66], [0.1, 0.76], [0.12, 0.8], [0, 0.82]], body, [0, 1.47, -0.1]);
      spire.geometry.dispose();
      spire.geometry = new THREE.LatheGeometry([[0.44, 0], [0.4, 0.2], [0.3, 0.45], [0.18, 0.66], [0.11, 0.76], [0.13, 0.8], [0, 0.82]].map(([x, y]) => new THREE.Vector2(x, y)), 4);
      spire.rotation.y = Math.PI / 4;
      for (const y of [1.7, 1.93, 2.14]) { const band = s.mesh(new THREE.TorusGeometry(mix(0.4, 0.17, (y - 1.7) / 0.44), 0.016, 5, 4), trim, [0, y, -0.1]); band.rotation.set(Math.PI / 2, 0, Math.PI / 4); }
      s.cylinder(0.14, 0.14, 0.06, [0, 2.32, -0.1], trim, 12);
      s.lathe([[0, 0], [0.07, 0.02], [0.085, 0.08], [0.03, 0.14], [0.045, 0.17], [0, 0.26]], brass, [0, 2.35, -0.1]);
      s.rod([0.1, 2.3, -0.1], [0.14, 2.95, -0.1], 0.008, brass);
      const pennant = new THREE.Shape();
      pennant.moveTo(0, 0); pennant.lineTo(0.34, -0.09); pennant.lineTo(0, -0.2); pennant.closePath();
      s.mesh(new THREE.ShapeGeometry(pennant), s.material(a.paint === 'saffron' ? '#b3261f' : '#e58a2a', { side: THREE.DoubleSide }), [0.14, 2.93, -0.1]).rotation.y = -0.4;
      sill = [0, 0.82, 0.4]; open = 0.38; hang = [[-0.4, 1.42, 0.34], [0.4, 1.42, 0.34]]; reach = 0.6; peak = 2.95;
    } else if (a.form === 'tree') {
      const bark = s.material('#5d4a38', { roughness: 1 });
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 32;
      const ctx = canvas.getContext('2d')!;
      for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? (a.paint === 'bare' ? '#8f8d86' : a.paint === 'tiled' ? '#eef0ee' : '#ece9df') : trimTint; ctx.fillRect(i * 16, 0, 16, 32); }
      const stripes = new THREE.CanvasTexture(canvas);
      stripes.colorSpace = THREE.SRGBColorSpace;
      s.cylinder(0.92, 0.96, 0.72, [0, 0.36, 0], new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.85 }), 28);
      s.cylinder(0.97, 0.97, 0.06, [0, 0.74, 0], s.material(bodyTint === '#8f8d86' ? '#9d978a' : bodyTint), 28);
      const lean = (random() - 0.5) * 0.3;
      s.tube([[0, 0.6, -0.15], [lean * 0.3, 1.5, -0.18], [lean, 2.5, -0.12], [lean * 1.6, 3.2, -0.05]], 0.27, bark);
      s.cylinder(0.3, 0.5, 0.5, [0, 0.98, -0.15], bark, 12);
      const leafy = [s.material('#4f7a3a', { roughness: 0.9 }), s.material('#3f6a34', { roughness: 0.9 }), s.material('#6a8f42', { roughness: 0.9 })];
      for (let i = 0; i < 4; i++) {
        const angle = i * 1.6 + random(), out = 0.7 + random() * 0.4, y = 2.5 + random() * 0.5;
        s.rod([lean, y - 0.3, -0.12], [lean + Math.cos(angle) * out, y + 0.25, -0.12 + Math.sin(angle) * out], 0.09, bark, 0.04);
        for (let j = 0; j < 3; j++) s.ball([0.5 + random() * 0.25, 0.3 + random() * 0.12, 0.5 + random() * 0.25], [lean + Math.cos(angle) * (out + j * 0.2 - 0.2) + (random() - 0.5) * 0.3, y + 0.35 + random() * 0.4, -0.12 + Math.sin(angle) * (out + j * 0.2 - 0.2) + (random() - 0.5) * 0.3], leafy[(i + j) % 3], 10);
      }
      s.ball([0.75, 0.42, 0.75], [lean * 1.6, 3.45, -0.05], leafy[0], 12);
      for (let i = 0; i < 5; i++) { const thread = s.ring(0.262 + i * 0.002, 0.012, [lean * 0.25, 1.35 + i * 0.07, -0.175], s.material(i % 2 ? '#d8261c' : '#edc531', { roughness: 0.9 })); thread.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.12, 0, 0); }
      s.box([0.5, 0.56, 0.3], [0, 1.05, 0.28], body);
      const roof = s.mesh(new THREE.ConeGeometry(0.42, 0.22, 4), trim, [0, 1.44, 0.28]);
      roof.rotation.y = Math.PI / 4;
      archedRecess(0, 0.82, 0.432, 0.36, 0.44);
      for (let i = 0; i < 3; i++) s.ball([0.1, 0.085, 0.09], [-0.52 + i * 0.16, 0.84, 0.42 + (i % 2) * 0.1], s.material(i === 1 ? '#c7361f' : '#6a665e', { roughness: 0.9 }), 10);
      for (let i = 0; i < 2; i++) { s.rod([0.55 + i * 0.16, 2.05, 0.25], [0.55 + i * 0.16, 1.75 - i * 0.1, 0.25], 0.004, dark); s.cylinder(0.012, 0.05, 0.08, [0.55 + i * 0.16, 1.71 - i * 0.1, 0.25], brass, 10); }
      s.rod([lean * 0.6, 2.0, -0.1], [0.8, 2.08, 0.3], 0.03, bark);
      sill = [0, 0.8, 0.52]; open = 0.36; hang = [[-0.3, 1.36, 0.45], [0.3, 1.36, 0.45]]; reach = 1.0; peak = 3.8;
    } else if (a.form === 'post') {
      const steel = s.material('#6d7478', { metalness: 0.6, roughness: 0.5 });
      s.cylinder(0.05, 0.05, 1.3, [0, 0.65, 0], steel, 10);
      for (const side of [-1, 1]) s.rod([0, 0.95, 0], [side * 0.26, 1.28, 0], 0.016, steel);
      s.box([0.72, 0.05, 0.56], [0, 1.3, 0.04], trim);
      s.box([0.62, 0.62, 0.42], [0, 1.63, -0.02], body);
      s.box([0.5, 0.5, 0.02], [0, 1.62, 0.192], dark);
      for (const side of [-1, 1]) s.box([0.05, 0.56, 0.04], [side * 0.27, 1.62, 0.2], trim);
      s.box([0.58, 0.05, 0.04], [0, 1.89, 0.2], trim);
      const gable = new THREE.Shape();
      gable.moveTo(-0.42, 0); gable.lineTo(0.42, 0); gable.lineTo(0, 0.26); gable.closePath();
      s.mesh(new THREE.ExtrudeGeometry(gable, { depth: 0.62, bevelEnabled: false }), s.material('#8e969a', { metalness: 0.5, roughness: 0.5 }), [0, 1.93, -0.3]);
      s.ball([0.03, 0.05, 0.03], [0, 2.23, 0.3], brass, 8);
      s.box([0.2, 0.26, 0.16], [0, 0.82, 0.1], s.material('#3a4a5a', { metalness: 0.5 }));
      s.box([0.1, 0.012, 0.02], [0, 0.9, 0.185], dark);
      s.ball([0.03, 0.035, 0.02], [0, 0.78, 0.19], brass, 8);
      sill = [0, 1.33, 0.25]; open = 0.5; hang = [[-0.33, 1.9, 0.24], [0.33, 1.9, 0.24]]; reach = 0.6; peak = 2.25;
    } else {
      s.box([0.96, 1.0, 0.96], [0, 0.5, 0], body);
      s.box([1.04, 0.09, 1.04], [0, 1.02, 0], trim);
      s.box([1.02, 0.12, 1.02], [0, 0.3, 0], trim);
      const dome = s.mesh(new THREE.SphereGeometry(0.42, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), body, [0, 1.14, 0]);
      dome.scale.y = 1.15;
      s.cylinder(0.43, 0.45, 0.1, [0, 1.11, 0], body, 22);
      s.lathe([[0, 0], [0.05, 0.02], [0.07, 0.08], [0.02, 0.14], [0.04, 0.18], [0, 0.3]], brass, [0, 1.6, 0]);
      for (const x of [-1, 1]) for (const z of [-1, 1]) { s.cylinder(0.055, 0.065, 0.22, [x * 0.45, 1.17, z * 0.45], body, 10); s.ball([0.07, 0.08, 0.07], [x * 0.45, 1.31, z * 0.45], trim, 10); }
      archedRecess(0, 0.42, 0.481, 0.42, 0.52);
      for (let i = -1; i <= 1; i++) s.box([0.012, 0.3, 0.012], [i * 0.1, 0.78, 0.49], trim);
      for (let i = 0; i < 2; i++) s.box([0.4, 0.012, 0.012], [0, 0.72 + i * 0.1, 0.49], trim);
      s.box([0.6, 0.05, 0.16], [0, 0.4, 0.55], trim);
      sill = [0, 0.425, 0.56]; open = 0.42; hang = [[-0.44, 1.05, 0.5], [0.44, 1.05, 0.5]]; reach = 0.72; peak = 1.9;
    }

    // ---- what is enshrined, set back inside the opening ----
    const [sx, sy, sz] = sill;
    const inside: V3 = [sx, sy, sz - 0.17];
    if (a.enshrined === 'stone') {
      s.ball([0.1, 0.13, 0.08], [inside[0], inside[1] + 0.12, inside[2]], s.material('#d1401c', { roughness: 0.7 }), 14);
      for (const side of [-1, 1]) s.ball([0.022, 0.016, 0.01], [inside[0] + side * 0.04, inside[1] + 0.16, inside[2] + 0.075], s.material('#e9eef0', { metalness: 0.7, roughness: 0.2 }), 8);
    } else if (a.enshrined === 'picture') {
      const canvas = document.createElement('canvas');
      canvas.width = 96; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const sky = ctx.createRadialGradient(48, 52, 4, 48, 60, 80);
      sky.addColorStop(0, '#fff3b0'); sky.addColorStop(0.45, mood.cheer > 0.5 ? '#f08a3a' : '#c9824a'); sky.addColorStop(1, '#2f5f9a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 96, 128);
      ctx.fillStyle = '#b3261f'; ctx.beginPath(); ctx.ellipse(48, 86, 22, 30, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#e9c98a'; ctx.beginPath(); ctx.arc(48, 46, 13, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#d9b23a'; ctx.lineWidth = 9; ctx.strokeRect(4, 4, 88, 120);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const frame = s.mesh(new THREE.PlaneGeometry(0.22, 0.3), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5 }), [inside[0], inside[1] + 0.17, inside[2] + 0.02]);
      frame.rotation.x = -0.14;
    } else if (a.enshrined === 'figure') {
      s.lathe([[0, 0], [0.1, 0], [0.11, 0.03], [0.07, 0.07], [0.075, 0.14], [0.045, 0.19], [0.02, 0.2]], brass, [inside[0], inside[1] + 0.01, inside[2]]);
      s.ball([0.04, 0.045, 0.04], [inside[0], inside[1] + 0.245, inside[2]], brass, 10);
      s.mesh(new THREE.ConeGeometry(0.03, 0.06, 8), brass, [inside[0], inside[1] + 0.31, inside[2]]);
      const aura = s.ring(0.09, 0.008, [inside[0], inside[1] + 0.22, inside[2] - 0.03], brass);
      aura.scale.z = 0.5;
    } else if (a.enshrined === 'trident') {
      const iron = s.material('#3a3d40', { metalness: 0.7, roughness: 0.45 });
      s.rod([inside[0], inside[1], inside[2]], [inside[0], inside[1] + 0.3, inside[2]], 0.01, iron);
      s.ring(0.05, 0.008, [inside[0], inside[1] + 0.3, inside[2]], iron, Math.PI).rotation.z = Math.PI;
      for (const x of [-0.05, 0, 0.05]) s.mesh(new THREE.ConeGeometry(0.012, 0.09, 6), iron, [inside[0] + x, inside[1] + 0.34 + (x === 0 ? 0.02 : 0), inside[2]]);
      s.box([0.1, 0.12, 0.008], [inside[0] + 0.03, inside[1] + 0.2, inside[2] + 0.012], s.material('#c7261f', { side: THREE.DoubleSide })).rotation.z = 0.2;
      for (let i = 0; i < 3; i++) s.ball([0.022, 0.028, 0.022], [inside[0] - 0.04, inside[1] + 0.2 - i * 0.045, inside[2] + 0.015], s.material(i === 1 ? '#3f8a3a' : '#e6d23a'), 8);
    } else {
      s.box([open * 0.75, 0.07, 0.12], [inside[0], inside[1] + 0.035, inside[2]], s.material('#1f7a4a', { roughness: 0.9 }));
      s.box([open * 0.76, 0.012, 0.121], [inside[0], inside[1] + 0.05, inside[2]], brass);
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }), Array.from({ length: 9 }, () => ({ at: [inside[0] + (random() - 0.5) * open * 0.6, inside[1] + 0.078, inside[2] + (random() - 0.5) * 0.08] as [number, number, number], size: 0.012, color: random() < 0.5 ? '#d8436a' : '#f4f0e6' })));
    }

    // ---- lamps ----
    const flames: THREE.Mesh[] = [];
    const clay = s.material('#a5522f', { roughness: 0.9 });
    const fire = new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffa63a', emissiveIntensity: 2.4, roughness: 0.4 });
    const halo = new THREE.MeshBasicMaterial({ color: '#ffc267', transparent: true, opacity: 0.2, depthWrite: false });
    const lamp = (x: number, y: number, z: number, size: number, lit: boolean) => {
      s.cylinder(0.045, 0.025, 0.028, [x, y + 0.014, z], clay, 12);
      if (!lit) return;
      flames.push(s.ball([0.016 * size, 0.04 * size, 0.016 * size], [x + 0.02, y + 0.035 + 0.035 * size, z], fire, 8));
      s.ball([0.1 * size, 0.1 * size, 0.1 * size], [x + 0.02, y + 0.06, z], halo, 10).castShadow = false;
    };
    const smoke = (x: number, y: number, z: number, height: number) => {
      const wisp = new THREE.MeshBasicMaterial({ color: '#8d8f90', transparent: true, opacity: 0.18, depthWrite: false });
      for (let i = 0; i < 6; i++) s.ball([0.012 + i * 0.006, 0.03, 0.012 + i * 0.006], [x + Math.sin(i * 1.3) * 0.02 * i * 0.4, y + (i / 5) * height, z], wisp, 6).castShadow = false;
    };
    const lx = sx + open * 0.3, lz = sz - 0.06;
    if (a.flame === 'steady') lamp(lx, sy, lz, 1.15, true);
    else if (a.flame === 'guttering') lamp(lx, sy, lz, 0.5, true);
    else if (a.flame === 'row') for (let i = 0; i < 5; i++) lamp(sx + (i - 2) * open * 0.26, sy, lz + 0.02, 0.9 + random() * 0.3, true);
    else if (a.flame === 'out') { lamp(lx, sy, lz, 1, false); smoke(lx + 0.02, sy + 0.04, lz, 0.4); }
    else {
      const glow = s.material('#ff4a3a', { emissive: '#ff2a1a', emissiveIntensity: 2.2, roughness: 0.3 });
      s.rod([sx + 0.05, sy + 0.42, sz - 0.04], [sx + 0.05, sy + 0.3, sz - 0.04], 0.004, dark);
      flames.push(s.ball([0.035, 0.045, 0.035], [sx + 0.05, sy + 0.27, sz - 0.04], glow, 10));
      s.ball([0.12, 0.12, 0.12], [sx + 0.05, sy + 0.27, sz - 0.04], new THREE.MeshBasicMaterial({ color: '#ff5a3a', transparent: true, opacity: 0.2, depthWrite: false }), 10).castShadow = false;
      s.tube([[sx + 0.05, sy + 0.42, sz - 0.04], [hang[1][0], hang[1][1] + 0.05, hang[1][2] - 0.05], [hang[1][0] + 0.3, hang[1][1] + 0.5, hang[1][2] - 0.3]], 0.006, dark);
    }
    // Soot above the lamp when the scene is worn.
    if (mood.wear > 0.3 && a.flame !== 'bulb') { const soot = s.mesh(new THREE.CircleGeometry(0.16, 12), new THREE.MeshBasicMaterial({ color: '#1a1512', transparent: true, opacity: 0.12 + mood.wear * 0.18, depthWrite: false }), [sx, hang[0][1] - 0.12, hang[0][2] + 0.002]); soot.scale.set(1.3, 0.8, 1); soot.castShadow = false; }

    // ---- water ----
    const level = mix(0.16, sy - 0.07, a.waterline);
    const f = flood(s, reach + 0.75, reach + 0.75, level);
    f.ripple(0, 0, a.form === 'post' ? 0.14 : a.form === 'tree' ? 1.08 : reach * 0.78, 2);

    // ---- garlands: beads strung along sagging curves ----
    const beads: { at: [number, number, number]; size: number; color: string }[] = [];
    const palette = { fresh: ['#f29a1c', '#f6c21f', '#ef8414'], wilted: ['#a8742a', '#8a5a26', '#c08a2a', '#6f4a22'], jasmine: ['#f5f2e6', '#f5f2e6', '#f5f2e6', '#c7263a'], tinsel: ['#e9c23a', '#d8368a', '#e9c23a', '#3fb0c9'], none: ['#b3261f'] }[a.garlands];
    const string = (from: V3, to: V3, sag: number, size: number) => {
      const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) + sag * 1.3;
      const n = Math.max(3, Math.round(length / (size * 1.45)));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        if (a.garlands === 'wilted' && random() < 0.16) continue;
        const y = mix(from[1], to[1], t) - Math.sin(t * Math.PI) * sag;
        if (y < level + 0.01) continue;
        beads.push({ at: [mix(from[0], to[0], t), y, mix(from[2], to[2], t) + Math.sin(t * Math.PI) * 0.03], size: size * mix(0.85, 1.15, random()), color: palette[a.garlands === 'jasmine' ? (i % 7 === 3 ? 3 : 0) : Math.floor(random() * palette.length)] });
      }
    };
    if (a.garlands !== 'none') {
      const droop = a.garlands === 'wilted' ? 1.5 : 1;
      const bead = a.garlands === 'jasmine' ? 0.021 : a.garlands === 'tinsel' ? 0.024 : 0.03;
      const [L, Rr] = hang;
      string(L, Rr, 0.2 * droop, bead);
      string([L[0], L[1], L[2] + 0.02], [Rr[0], Rr[1], Rr[2] + 0.02], 0.38 * droop, bead);
      for (const end of hang) string([end[0], end[1], end[2]], [end[0] + Math.sign(end[0]) * 0.03, end[1] - 0.5 * droop, end[2] + 0.02], 0, bead);
      if (a.form === 'temple' || a.form === 'dome' || a.form === 'niche') string([L[0], L[1] + 0.02, L[2] - 0.5], [L[0] - 0.02, L[1] + 0.02, L[2]], 0.16 * droop, bead);
      if (a.form === 'tree') for (let i = 0; i < 26; i++) { const t = (i / 26) * Math.PI * 2; beads.push({ at: [Math.cos(t) * 0.3, 1.78 + Math.sin(t) * 0.06, -0.17 + Math.sin(t) * 0.3], size: bead, color: palette[Math.floor(random() * palette.length)] }); }
      if (a.garlands === 'wilted') for (let i = 0; i < 12; i++) { const t = random() * 6.28, r = reach * (0.5 + random() * 0.7); beads.push({ at: [Math.cos(t) * r, level + 0.012, Math.sin(t) * r * 0.9 + 0.2], size: 0.028, color: palette[Math.floor(random() * palette.length)] }); }
    } else {
      string(hang[0], hang[1], 0.05, 0.008);
    }
    if (beads.length) {
      const flowers = s.scatter(new THREE.IcosahedronGeometry(1, a.garlands === 'tinsel' ? 0 : 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: a.garlands === 'tinsel' ? 0.25 : 0.85, metalness: a.garlands === 'tinsel' ? 0.6 : 0, flatShading: true }), beads);
      flowers.castShadow = true;
    }

    // ---- offerings ----
    const ox = sx - open * 0.32, oz = sz - 0.05;
    if (a.offerings === 'coconut') {
      s.box([0.24, 0.006, 0.16], [ox, sy + 0.003, oz], s.material('#3f7a3a', { roughness: 0.8 }));
      s.ball([0.055, 0.065, 0.055], [ox - 0.04, sy + 0.065, oz], s.material('#7a5a3a', { roughness: 1 }), 10);
      for (let i = 0; i < 4; i++) { const banana = s.ring(0.05, 0.014, [ox + 0.06, sy + 0.02 + i * 0.004, oz - 0.02 + i * 0.02], s.material('#e9cf3a', { roughness: 0.7 }), 1.6); banana.rotation.set(Math.PI / 2, 0, 0.6); }
    } else if (a.offerings === 'incense') {
      s.cylinder(0.03, 0.035, 0.03, [ox, sy + 0.015, oz], brass, 10);
      for (let i = 0; i < 5; i++) s.rod([ox, sy + 0.03, oz], [ox + (i - 2) * 0.02, sy + 0.24, oz + (random() - 0.5) * 0.04], 0.0035, s.material('#4a3526'));
      smoke(ox, sy + 0.26, oz, 0.5);
    } else if (a.offerings === 'coins') {
      s.cylinder(0.085, 0.07, 0.016, [ox, sy + 0.008, oz], s.material('#c9cdd0', { metalness: 0.85, roughness: 0.25 }), 16);
      for (let i = 0; i < 7; i++) s.cylinder(0.014, 0.014, 0.004, [ox + (random() - 0.5) * 0.09, sy + 0.02 + i * 0.001, oz + (random() - 0.5) * 0.09], i % 2 ? brass : s.material('#b9bec2', { metalness: 0.8, roughness: 0.3 }), 8);
      s.box([0.07, 0.006, 0.035], [ox + 0.01, sy + 0.028, oz], s.material('#7fa88a')).rotation.y = 0.5;
    } else if (a.offerings === 'sweets') {
      s.box([0.18, 0.03, 0.13], [ox, sy + 0.015, oz], s.material('#c9302a'));
      for (let i = 0; i < 6; i++) s.ball([0.022, 0.022, 0.022], [ox - 0.05 + (i % 3) * 0.05, sy + 0.04, oz - 0.025 + Math.floor(i / 3) * 0.05], s.material('#e9b02a', { roughness: 0.8 }), 8);
    } else if (a.offerings === 'floating') {
      const count = 4 + Math.round(mood.density * 4);
      for (let i = 0; i < count; i++) {
        const t = -0.4 + (i / (count - 1)) * (Math.PI + 0.8) + (random() - 0.5) * 0.3, r = (a.form === 'tree' ? 1.1 : reach * 0.78) + 0.25 + random() * 0.2;
        const x = Math.cos(t) * r, z = Math.sin(t) * r;
        const leaf = s.cylinder(0.07, 0.045, 0.03, [x, level + 0.016, z], s.material('#4f8a3a', { roughness: 0.8 }), 8);
        leaf.scale.z = 0.8;
        flames.push(s.ball([0.012, 0.03, 0.012], [x, level + 0.06, z], fire, 6));
        s.ball([0.07, 0.07, 0.07], [x, level + 0.06, z], halo, 8).castShadow = false;
        f.ripple(x, z, 0.09, 1);
      }
    }
    void peak;

    const energy = mix(0.25, 1, mood.energy);
    const bases = flames.map((flame) => flame.scale.clone());
    return s.finish({
      footprint: reach + 0.6,
      update: (dt, time) => {
        f.update(dt, time);
        flames.forEach((flame, index) => {
          const flicker = 1 + Math.sin(time * 11 + index * 2.1) * 0.12 * energy + Math.sin(time * 23 + index) * 0.06 * energy;
          flame.scale.set(bases[index].x, bases[index].y * flicker, bases[index].z);
        });
        fire.emissiveIntensity = 2.4 + Math.sin(time * 13) * 0.4 * energy;
      },
    });
  },
});
