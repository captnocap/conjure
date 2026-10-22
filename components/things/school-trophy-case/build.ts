import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const ERAS = {
  victorian: 'Tall ornate silver cups with lids and handles in a dark mahogany case with a pediment; sepia team photographs.',
  midcentury: 'Plain silver cups and oak shields with little plates in a honey oak case; black and white photographs.',
  seventies: 'Gold plastic figurines on marble blocks and columns in a teak-veneer case with an aluminium frame; orange-tinted colour photographs.',
  modern: 'Acrylic stars, glass blocks and ribboned medals in a white laminate case; bright colour photographs.',
} as const;
const WOOD: Record<keyof typeof ERAS, { wood: string; trim: string }> = {
  victorian: { wood: '#55291a', trim: '#b8923a' },
  midcentury: { wood: '#a87a42', trim: '#c9b06a' },
  seventies: { wood: '#8a5730', trim: '#c2c6c8' },
  modern: { wood: '#e6e4dc', trim: '#8d9499' },
};
const LINING = { baize: '#3f6f52', velvet: '#7a2430', cream: '#d9cfb4', blue: '#2f4f7f', mirror: '#b9c6cc' } as const;

export default defineThing({
  questions: {
    era: choice('Which era are the trophies and the cabinet from?', ERAS),
    fullness: score('How full is the case?', ['Nearly bare: two or three lonely pieces', 'Sparse', 'Comfortably filled', 'Crammed, trophies shoulder to shoulder']),
    gap: choice('Does one shelf have a conspicuous gap?', {
      none: 'No; nothing is obviously missing.',
      ring: 'A clean circle in the dust where the biggest cup stood, with its little card still in place.',
      stand: 'An empty wooden stand with a brass plate, waiting for something that never came back.',
      shelf: 'One whole shelf has been cleared, the rest left alone.',
      facedown: 'A photograph frame lying face down among the cups.',
    }),
    lining: choice('What is the case lined with?', {
      baize: 'Green baize, like a billiard table.',
      velvet: 'Dark red velvet.',
      cream: 'Cream painted board, plain and bright.',
      blue: 'Royal blue felt, the school colour.',
      mirror: 'Mirror glass that doubles every cup.',
    }),
    light: choice('What is the case light doing?', {
      steady: 'On, a steady warm glow behind the glass.',
      flicker: 'A failing tube that flickers and catches.',
      off: 'Switched off; the trophies sit in shadow.',
    }),
    pennant: choice('What does the faded pennant say, if there is one?', {
      none: 'There is no pennant.',
      champions: 'CHAMPIONS',
      year: 'A year, such as 1974.',
      house: 'HOUSE CUP',
      sports: 'SPORTS DAY',
    }),
    width: score('How wide is the cabinet?', ['A narrow single bay', 'Two bays', 'A long three-bay case']),
    top: choice('What sits on top of the cabinet?', {
      nothing: 'Nothing.',
      bell: 'The old brass hand bell.',
      globe: 'A classroom globe.',
      box: 'A cardboard box of trophies that no longer fit.',
      shield: 'A big dusty shield leaning against the wall.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const style = WOOD[a.era];
    const bays = a.width < 0.34 ? 1 : a.width < 0.75 ? 2 : 3;
    const W = bays === 1 ? 0.95 : bays === 2 ? 1.6 : 2.3;
    const D = 0.42, BASE = a.era === 'modern' ? 0.45 : 0.62, H = 2.0, T = 0.035;
    const wood = s.material(style.wood, { roughness: a.era === 'modern' ? 0.35 : 0.5 });
    const trim = s.material(style.trim, { metalness: a.era === 'modern' ? 0.3 : 0.8, roughness: 0.3 });
    const frameMat = a.era === 'seventies' ? trim : wood;
    const lit = a.light !== 'off';
    const glow = lit ? mix(0.25, 0.55, mood.cheer) : 0;
    const textures: THREE.Texture[] = [];
    const glowing: { material: THREE.MeshStandardMaterial; base: number }[] = [];
    const lamp = (material: THREE.MeshStandardMaterial) => { glowing.push({ material, base: material.emissiveIntensity }); return material; };

    const liningColour = new THREE.Color(LINING[a.lining]);
    const lining = lamp(new THREE.MeshStandardMaterial({ color: liningColour, roughness: a.lining === 'mirror' ? 0.08 : 0.95, metalness: a.lining === 'mirror' ? 0.9 : 0, emissive: liningColour, emissiveIntensity: glow * 0.9 }));
    const metal = (hex: string, rough = 0.25) => lamp(new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color('#6f6a5a'), wear * 0.35), metalness: 0.9, roughness: rough + wear * 0.3, emissive: hex, emissiveIntensity: glow * 0.35 }));
    const silver = metal('#d5d9da'), gold = metal('#e8a820'), bronze = metal('#a8703a', 0.4);
    const matte = (hex: string) => lamp(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.8, emissive: hex, emissiveIntensity: glow * 0.25 }));
    const black = matte('#1d1d1f'), marble = matte(a.era === 'seventies' ? '#e9e6dc' : '#3a2a22');

    // Base cupboard.
    s.box([W, BASE - 0.06, D], [0, 0.06 + (BASE - 0.06) / 2, 0], wood);
    s.box([W - 0.06, 0.06, D - 0.06], [0, 0.03, 0], s.material('#2a2320'));
    const doors = bays * 2;
    for (let i = 0; i < doors; i++) {
      const dw = (W - 0.06) / doors, x = -W / 2 + 0.03 + dw * (i + 0.5);
      s.box([dw - 0.03, BASE - 0.16, 0.012], [x, 0.06 + (BASE - 0.06) / 2, D / 2 + 0.006], s.material(new THREE.Color(style.wood).multiplyScalar(a.era === 'modern' ? 0.94 : 0.82), { roughness: 0.5 }));
      if (a.era !== 'modern') s.box([dw - 0.12, BASE - 0.26, 0.008], [x, 0.06 + (BASE - 0.06) / 2, D / 2 + 0.014], wood);
      s.ball([0.014, 0.014, 0.014], [x + (i % 2 ? -1 : 1) * (dw / 2 - 0.05), 0.06 + (BASE - 0.06) / 2 + 0.03, D / 2 + 0.024], trim, 10);
    }
    // Upper showcase: back, sides, top, mullions and rails.
    const top = H, uh = top - BASE;
    s.box([W, uh, 0.02], [0, BASE + uh / 2, -D / 2 + 0.01], wood);
    s.box([W - 2 * T, uh - T, 0.006], [0, BASE + uh / 2, -D / 2 + 0.024], lining);
    for (const side of [-1, 1]) s.box([T, uh, D], [side * (W / 2 - T / 2), BASE + uh / 2, 0], wood).visible = a.era === 'victorian' || a.era === 'midcentury';
    if (a.era === 'seventies' || a.era === 'modern') for (const side of [-1, 1]) for (const z of [-1, 1]) s.box([T, uh, T], [side * (W / 2 - T / 2), BASE + uh / 2, z * (D / 2 - T / 2)], frameMat);
    s.box([W + 0.02, T * 1.6, D + 0.02], [0, top - T * 0.8, 0], wood);
    s.box([W, T, D], [0, BASE + T / 2, 0], wood);
    for (let b = 0; b <= bays; b++) s.box([T, uh, T], [-W / 2 + T / 2 + b * (W - T) / bays, BASE + uh / 2, D / 2 - T / 2], frameMat);
    s.box([W, T * 1.4, T], [0, top - T * 2.2, D / 2 - T / 2], frameMat);
    if (a.era === 'victorian') {
      s.box([W + 0.1, 0.06, D + 0.08], [0, top + 0.03, 0], wood);
      const ped = new THREE.Shape(); ped.moveTo(-W / 2 - 0.03, 0); ped.lineTo(0, 0.22); ped.lineTo(W / 2 + 0.03, 0); ped.closePath();
      s.mesh(new THREE.ExtrudeGeometry(ped, { depth: 0.06, bevelEnabled: false }), wood, [0, top + 0.06, D / 2 - 0.05]);
      s.ball([0.05, 0.05, 0.05], [0, top + 0.31, D / 2 - 0.02], trim, 12);
    } else if (a.era === 'midcentury') s.box([W + 0.06, 0.04, D + 0.05], [0, top + 0.02, 0], wood);
    // Glass, dustier with wear, and the light strip.
    const glass = new THREE.MeshStandardMaterial({ color: '#dff0f0', transparent: true, opacity: 0.08 + wear * 0.08, roughness: 0.05, depthWrite: false });
    s.box([W - 2 * T, uh - T * 2, 0.005], [0, BASE + uh / 2, D / 2 - T / 2], glass).castShadow = false;
    if (a.era === 'seventies' || a.era === 'modern') for (const side of [-1, 1]) s.box([0.005, uh - T * 2, D - 2 * T], [side * (W / 2 - T / 2), BASE + uh / 2, 0], glass).castShadow = false;
    const tube = new THREE.MeshStandardMaterial({ color: '#fff3d2', emissive: '#ffe9b0', emissiveIntensity: lit ? 1.6 : 0, roughness: 0.4 });
    glowing.push({ material: tube, base: tube.emissiveIntensity });
    s.box([W - 0.2, 0.025, 0.04], [0, top - T * 1.6 - 0.02, D / 2 - 0.09], tube).castShadow = false;
    if (wear > 0.75) { const crack = new THREE.MeshBasicMaterial({ color: '#cfd8d8' }); const cx = (random() - 0.5) * W * 0.5, cy = BASE + uh * 0.4; for (let i = 0; i < 5; i++) { const t = random() * 6.3, l = 0.08 + random() * 0.14; s.rod([cx, cy, D / 2 - 0.01], [cx + Math.cos(t) * l, cy + Math.sin(t) * l, D / 2 - 0.01], 0.0015, crack).castShadow = false; } }

    // Shelves.
    const shelfCount = 3;
    const usable = uh - T * 4;
    const shelfY = Array.from({ length: shelfCount }, (_unused, i) => BASE + T + i * (usable / shelfCount));
    const glassShelf = new THREE.MeshStandardMaterial({ color: '#bfe0d8', transparent: true, opacity: 0.45, roughness: 0.1 });
    for (let i = 1; i < shelfCount; i++) s.box([W - 2 * T, 0.014, D - 0.08], [0, shelfY[i] - 0.007, 0], a.era === 'seventies' || a.era === 'modern' ? glassShelf : wood);
    const gapH = usable / shelfCount - 0.05;

    // The pieces.
    const cup = (x: number, y: number, z: number, h: number, mat: THREE.Material, lid: boolean, handles: boolean) => {
      const p: [number, number][] = [[0.001, 0], [0.2, 0], [0.2, 0.05], [0.07, 0.09], [0.04, 0.3], [0.07, 0.42], [0.2, 0.58], [0.27, 0.82], [0.29, 1], [0.26, 1], [0.2, 0.7], [0.001, 0.56]];
      const body = h * (lid ? 0.78 : 1);
      s.box([body * 0.5, body * 0.12, body * 0.5], [x, y + body * 0.06, z], black);
      const m = s.lathe(p.map(([r, v]) => [r * body * 0.8, v * body * 0.88] as const), mat, [x, y + body * 0.12, z]);
      (m.material as THREE.Material).side = THREE.DoubleSide;
      if (handles) for (const side of [-1, 1]) s.ring(body * 0.12, body * 0.018, [x + side * body * 0.27, y + body * 0.78, z], mat).scale.set(0.8, 1.3, 1);
      if (lid) { s.lathe([[0.001, 0.3], [0.08, 0.26], [0.2, 0.1], [0.3, 0]].map(([r, v]) => [r * body * 0.8, v * body * 0.8] as const), mat, [x, y + body, z]); s.ball([body * 0.04, body * 0.06, body * 0.04], [x, y + body * 1.27, z], mat, 8); }
    };
    const figurine = (x: number, y: number, z: number, h: number) => {
      const tiers = h > 0.26 ? 2 : 1;
      s.box([h * 0.42, h * 0.1, h * 0.3], [x, y + h * 0.05, z], marble);
      let top2 = y + h * 0.1;
      if (tiers === 2) { for (const side of [-1, 1]) s.cylinder(h * 0.035, h * 0.035, h * 0.34, [x + side * h * 0.13, top2 + h * 0.17, z], gold, 10); top2 += h * 0.34; s.box([h * 0.38, h * 0.06, h * 0.26], [x, top2 + h * 0.03, z], marble); top2 += h * 0.06; }
      const fh = y + h - top2;
      s.cylinder(fh * 0.13, fh * 0.18, fh * 0.6, [x, top2 + fh * 0.3, z], gold, 8);
      s.ball([fh * 0.1, fh * 0.1, fh * 0.1], [x, top2 + fh * 0.72, z], gold, 8);
      s.rod([x, top2 + fh * 0.52, z], [x + fh * 0.22, top2 + fh * 0.95, z], fh * 0.04, gold);
      s.ball([fh * 0.08, fh * 0.08, fh * 0.08], [x + fh * 0.24, top2 + fh * 0.98, z], gold, 8);
    };
    const acrylic = lamp(new THREE.MeshStandardMaterial({ color: '#7fd4ea', transparent: true, opacity: 0.8, roughness: 0.08, emissive: '#7fd4ea', emissiveIntensity: glow * 0.5 }));
    const star = (x: number, y: number, z: number, h: number) => {
      s.box([h * 0.45, h * 0.14, h * 0.25], [x, y + h * 0.07, z], black);
      const shape = new THREE.Shape();
      const block = random() < 0.35;
      if (block) { shape.moveTo(-0.3, 0); shape.lineTo(0.3, 0); shape.lineTo(0.22, 0.86); shape.lineTo(-0.12, 0.7); shape.closePath(); }
      else for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.19 : 0.43, t = k * Math.PI / 5; const px = Math.sin(t) * r, py = 0.43 + Math.cos(t) * r; if (k === 0) shape.moveTo(px, py); else shape.lineTo(px, py); }
      const m = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false }), acrylic, [x, y + h * 0.14, z - h * 0.04]);
      m.scale.setScalar(h);
    };
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(-0.4, 1); shieldShape.lineTo(0.4, 1); shieldShape.lineTo(0.4, 0.5); shieldShape.quadraticCurveTo(0.38, 0.15, 0, 0); shieldShape.quadraticCurveTo(-0.38, 0.15, -0.4, 0.5); shieldShape.closePath();
    const shieldWood = matte(a.era === 'victorian' ? '#3f2014' : '#7a4f2a');
    const shield = (x: number, y: number, z: number, h: number) => {
      const g = new THREE.Group();
      g.position.set(x, y, z); g.rotation.x = -0.18; g.scale.setScalar(h);
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale = 1) => { const m = new THREE.Mesh(geometry, material); m.position.set(...at); m.scale.setScalar(scale); m.castShadow = true; g.add(m); };
      add(new THREE.ExtrudeGeometry(shieldShape, { depth: 0.06, bevelEnabled: false }), shieldWood, [0, 0, 0]);
      add(new THREE.ExtrudeGeometry(shieldShape, { depth: 0.03, bevelEnabled: false }), silver, [0, 0.3, 0.05], 0.42);
      const plates = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.07, 0.02), silver, 8);
      const mtx = new THREE.Matrix4();
      [[-0.27, 0.86], [0, 0.88], [0.27, 0.86], [-0.3, 0.62], [0.3, 0.62], [-0.27, 0.4], [0.27, 0.4], [0, 0.14]].forEach(([px, py], i) => plates.setMatrixAt(i, mtx.makeTranslation(px, py, 0.065)));
      g.add(plates);
      s.root.add(g);
    };
    const photoTexture = () => {
      const c = document.createElement('canvas'); c.width = 192; c.height = 144;
      const g = c.getContext('2d')!;
      const mono = a.era === 'victorian' || a.era === 'midcentury';
      const kit = ['#b8302c', '#2f5fa8', '#e0b020', '#2f8a4a', '#f2f0ea'][Math.floor(random() * 5)];
      g.fillStyle = a.era === 'seventies' ? '#c9a878' : '#a9c4d8'; g.fillRect(0, 0, 192, 144);
      g.fillStyle = a.era === 'seventies' ? '#7a8a3a' : '#5f9a52'; g.fillRect(0, 86, 192, 58);
      const n = 5 + Math.floor(random() * 3);
      for (let row = 0; row < 2; row++) for (let i = 0; i < n - row; i++) {
        const x = 96 + (i - (n - row - 1) / 2) * 24, y = row ? 78 : 52;
        g.fillStyle = kit; g.fillRect(x - 9, y, 18, row ? 26 : 32);
        g.fillStyle = '#f4f1e8'; g.fillRect(x - 9, y + (row ? 20 : 26), 18, 8);
        g.fillStyle = ['#e8c4a0', '#c99a72', '#8a5a3a', '#f0d4b4'][Math.floor(random() * 4)]; g.beginPath(); g.arc(x, y - 7, 7, 0, 7); g.fill();
        g.fillStyle = ['#2a1c14', '#5a3a1c', '#c9a040', '#1a1a1a'][Math.floor(random() * 4)]; g.beginPath(); g.arc(x, y - 9, 7, Math.PI, 0); g.fill();
      }
      g.fillStyle = '#f4f1e8'; g.beginPath(); g.arc(96, 112, 8, 0, 7); g.fill();
      if (mono) { const img = g.getImageData(0, 0, 192, 144); const sep = a.era === 'victorian'; for (let i = 0; i < img.data.length; i += 4) { const v = img.data[i] * 0.3 + img.data[i + 1] * 0.55 + img.data[i + 2] * 0.15; img.data[i] = sep ? v * 1.05 : v; img.data[i + 1] = sep ? v * 0.9 : v; img.data[i + 2] = sep ? v * 0.68 : v; } g.putImageData(img, 0, 0); }
      g.fillStyle = `rgba(232,222,196,${wear * 0.55})`; g.fillRect(0, 0, 192, 144);
      g.fillStyle = '#f1ecdc'; g.fillRect(0, 124, 192, 20);
      g.fillStyle = '#2a2a2a'; g.font = 'bold 12px monospace'; g.textAlign = 'center';
      const year = { victorian: 1890, midcentury: 1950, seventies: 1970, modern: 2004 }[a.era] + Math.floor(random() * 14);
      g.fillText(`${['1st XI', 'NETBALL', 'ATHLETICS', 'HOCKEY', 'U14 CUP'][Math.floor(random() * 5)]} ${year}`, 96, 138);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; textures.push(t);
      return t;
    };
    const frameWood = matte(a.era === 'modern' ? '#22252a' : a.era === 'seventies' ? '#b8923a' : '#3a2416');
    const photo = (x: number, y: number, z: number, h: number, facedown: boolean) => {
      const g = new THREE.Group();
      const w = h * 1.33;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, h + 0.03, 0.015), frameWood); frame.castShadow = true; g.add(frame);
      const picture = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lamp(new THREE.MeshStandardMaterial({ map: photoTexture(), roughness: 0.5, emissive: '#ffffff', emissiveIntensity: glow * 0.18 })));
      (picture.material as THREE.MeshStandardMaterial).emissiveMap = (picture.material as THREE.MeshStandardMaterial).map;
      picture.position.z = 0.009; g.add(picture);
      if (facedown) { g.position.set(x, y + 0.012, z + 0.02); g.rotation.set(Math.PI / 2, 0, (random() - 0.5) * 0.6); const stand = new THREE.Mesh(new THREE.BoxGeometry(0.03, h * 0.7, 0.006), black); stand.position.set(0, -0.02, -0.012); stand.rotation.x = 0.1; g.add(stand); }
      else { g.position.set(x, y + (h + 0.03) / 2, z - 0.03); g.rotation.x = -0.2; }
      s.root.add(g);
    };
    const medals = (x: number, y: number, z: number) => {
      const ribbons = ['#c8302c', '#2f5fa8', '#e0b020', '#2f8a4a'];
      for (let i = 0; i < 3; i++) {
        const mx = x + (i - 1) * 0.07, col = matte(ribbons[Math.floor(random() * ribbons.length)]);
        s.box([0.03, 0.16, 0.004], [mx, y + 0.14, z - 0.05 + 0.0], col).rotation.x = -0.25;
        const disc = s.cylinder(0.03, 0.03, 0.006, [mx, y + 0.05, z - 0.02], [gold, silver, bronze][i], 14); disc.rotation.x = Math.PI / 2 - 0.25;
      }
    };
    const football = (x: number, y: number, z: number) => {
      const old = a.era === 'victorian' || a.era === 'midcentury';
      s.ball([0.105, 0.105, 0.105], [x, y + 0.105, z], matte(old ? '#8a5a30' : '#f1eee4'), 16);
      if (old) s.box([0.012, 0.09, 0.02], [x, y + 0.13, z + 0.098], matte('#d9c9a0')); else for (let i = 0; i < 4; i++) s.ball([0.03, 0.03, 0.012], [x + Math.cos(i * 1.6) * 0.055, y + 0.105 + Math.sin(i * 1.6) * 0.055, z + 0.085], black, 6);
    };

    const fill = mix(0.16, 1, a.fullness);
    const slotW = mix(0.36, 0.23, a.fullness);
    const perShelf = Math.max(2, Math.floor((W - 0.16) / slotW));
    const gapShelf = 1, gapSlot = Math.floor(perShelf / 2);
    const metals = a.era === 'victorian' ? [silver, silver, silver, gold] : a.era === 'midcentury' ? [silver, silver, gold, bronze] : [gold, gold, silver];
    for (let sh = 0; sh < shelfCount; sh++) for (let i = 0; i < perShelf; i++) {
      const x = (i - (perShelf - 1) / 2) * ((W - 0.18) / perShelf), y = shelfY[sh], z = (random() - 0.5) * 0.08;
      const isGap = sh === gapShelf && i === gapSlot;
      const nearGap = sh === gapShelf && Math.abs(i - gapSlot) === 1;
      if (a.gap === 'shelf' && sh === gapShelf) {
        if (i % 2 === 0) s.cylinder(0.07, 0.07, 0.002, [x, y + 0.002, z], matte(new THREE.Color(style.wood).offsetHSL(0, 0, 0.12).getStyle()), 16).castShadow = false;
        continue;
      }
      if (isGap && a.gap !== 'none') {
        if (a.gap === 'ring') {
          const ring = s.ring(0.085, 0.012, [x, y + 0.002, 0], matte('#e9e4d2')); ring.rotation.x = Math.PI / 2; ring.scale.z = 0.15; ring.castShadow = false;
          const card = s.box([0.09, 0.05, 0.003], [x, y + 0.027, 0.13], matte('#f4f0e2')); card.rotation.x = -0.4;
          s.box([0.06, 0.006, 0.001], [x, y + 0.03, 0.133], black).rotation.x = -0.4;
        } else if (a.gap === 'stand') {
          s.box([0.2, 0.06, 0.18], [x, y + 0.03, 0], matte('#3a2416'));
          s.box([0.15, 0.03, 0.14], [x, y + 0.075, 0], matte('#3a2416'));
          s.box([0.11, 0.03, 0.004], [x, y + 0.03, 0.092], gold);
        } else if (a.gap === 'facedown') photo(x, y, 0, 0.17, true);
        continue;
      }
      const forced = (nearGap && a.gap !== 'none') || (sh === 0 && i === 0) || (sh === 2 && i === perShelf - 1);
      if (!forced && random() > fill) continue;
      const big = forced || random() < 0.35;
      const h = Math.min(gapH, big ? mix(0.3, 0.42, random()) : mix(0.19, 0.28, random()));
      const roll = forced ? 0.9 : random();
      const mat = metals[Math.floor(random() * metals.length)];
      if (roll < 0.14) photo(x, y, -0.08, Math.min(0.2, gapH * 0.6), false);
      else if (roll < 0.26 && a.era !== 'modern') shield(x, y, -0.06, Math.min(gapH, 0.3));
      else if (roll < 0.3) football(x, y, z);
      else if (a.era === 'seventies') { if (random() < 0.75) figurine(x, y, z, h); else cup(x, y, z, h, mat, false, true); }
      else if (a.era === 'modern') { if (roll < 0.5) medals(x, y, z); else if (random() < 0.7) star(x, y, z, h * 0.8); else cup(x, y, z, h, mat, false, true); }
      else cup(x, y, z, h, mat, a.era === 'victorian' && big, a.era === 'victorian' || random() < 0.6);
    }

    // The pennant hangs across the back of the top shelf.
    if (a.pennant !== 'none') {
      const c = document.createElement('canvas'); c.width = 384; c.height = 128;
      const g = c.getContext('2d')!;
      const pairs = [['#7a1f2c', '#e8c860'], ['#1f3f7a', '#f1eee2'], ['#1f5f3a', '#f0d040'], ['#c8601c', '#1d1d1f']];
      const [felt, ink] = pairs[Math.floor(random() * pairs.length)];
      const faded = `#${new THREE.Color(felt).lerp(new THREE.Color('#c9c0a8'), 0.25 + wear * 0.45).getHexString()}`;
      g.fillStyle = faded; g.beginPath(); g.moveTo(0, 0); g.lineTo(384, 64); g.lineTo(0, 128); g.closePath(); g.fill();
      g.fillStyle = ink; g.fillRect(0, 0, 22, 128);
      g.font = 'bold 44px monospace'; g.textBaseline = 'middle';
      const text = { champions: 'CHAMPIONS', year: String({ victorian: 1898, midcentury: 1954, seventies: 1974, modern: 2006 }[a.era] + Math.floor(random() * 5)), house: 'HOUSE CUP', sports: 'SPORTS DAY' }[a.pennant];
      g.save(); g.beginPath(); g.moveTo(0, 0); g.lineTo(384, 64); g.lineTo(0, 128); g.closePath(); g.clip();
      g.fillText(text, 34, 66, 250); g.restore();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; textures.push(t);
      const len = Math.min(0.75, W - 0.25);
      const pennant = s.mesh(new THREE.PlaneGeometry(len, len / 3), lamp(new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, roughness: 0.95, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: glow * 0.2 })), [(random() - 0.5) * (W - len - 0.2), shelfY[2] + gapH - len / 6 - 0.06, -D / 2 + 0.035]);
      pennant.rotation.z = (random() - 0.5) * 0.3;
      pennant.castShadow = false;
    }

    // On top.
    const ty = a.era === 'victorian' ? top + 0.06 : a.era === 'midcentury' ? top + 0.04 : top;
    const tx = (a.era === 'victorian' ? -1 : 1) * W * 0.26 * (random() < 0.5 ? 1 : -1) * (a.era === 'victorian' ? -1 : 1);
    if (a.top === 'bell') {
      const brass = s.material('#c9a23a', { metalness: 0.85, roughness: 0.3 });
      s.lathe([[0.085, 0], [0.075, 0.02], [0.055, 0.07], [0.045, 0.12], [0.03, 0.15], [0.001, 0.155]], brass, [tx, ty, -0.02]);
      s.cylinder(0.012, 0.016, 0.13, [tx, ty + 0.215, -0.02], s.material('#2a1c14'), 10);
    } else if (a.top === 'globe') {
      s.cylinder(0.09, 0.1, 0.02, [tx, ty + 0.01, -0.02], s.material('#3a2416'), 16);
      s.cylinder(0.01, 0.01, 0.08, [tx, ty + 0.05, -0.02], trim, 8);
      const globe = s.ball([0.14, 0.14, 0.14], [tx, ty + 0.22, -0.02], s.material('#4f8fc0', { roughness: 0.4 }), 20);
      globe.rotation.z = 0.4;
      for (let i = 0; i < 6; i++) { const t1 = random() * 6.3, p1 = (random() - 0.5) * 2; s.ball([0.05 + random() * 0.03, 0.04 + random() * 0.03, 0.015], [tx + Math.cos(p1) * Math.sin(t1) * 0.13, ty + 0.22 + Math.sin(p1) * 0.13, -0.02 + Math.cos(p1) * Math.cos(t1) * 0.13], s.material('#8aa85a'), 8).lookAt(tx, ty + 0.22, -0.02); }
      s.ring(0.155, 0.006, [tx, ty + 0.22, -0.02], trim, Math.PI).rotation.z = -Math.PI / 2 + 0.4;
    } else if (a.top === 'box') {
      const card = s.material('#b98f5a', { roughness: 0.95 });
      s.box([0.44, 0.22, 0.3], [tx, ty + 0.11, -0.02], card).rotation.y = (random() - 0.5) * 0.3;
      cup(tx - 0.1, ty + 0.14, -0.02, 0.2, silver, false, true);
      figurine(tx + 0.1, ty + 0.16, 0.02, 0.2);
    } else if (a.top === 'shield') {
      const g = new THREE.Group();
      g.position.set(tx, ty, -0.12); g.rotation.x = -0.12; g.scale.setScalar(0.5);
      const wd = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape, { depth: 0.06, bevelEnabled: false }), s.material('#4a2a18')); wd.castShadow = true; g.add(wd);
      const boss = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape, { depth: 0.03, bevelEnabled: false }), s.material('#b9bdbe', { metalness: 0.8, roughness: 0.4 })); boss.position.set(0, 0.3, 0.05); boss.scale.setScalar(0.45); g.add(boss);
      s.root.add(g);
    }

    const speed = mix(0.6, 2, mood.energy);
    const thing = s.finish({
      update: a.light === 'flicker' ? (_dt, time) => {
        const on = Math.sin(time * 11 * speed) * Math.sin(time * 3.3 * speed + 1) > -0.25 ? 1 : 0.12;
        for (const item of glowing) item.material.emissiveIntensity = item.base * on;
      } : undefined,
    });
    const dispose = thing.dispose;
    return { ...thing, dispose: () => { for (const t of textures) t.dispose(); dispose(); } };
  },
});
