import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    whose: choice('Whose things are these?', {
      child: "A child's: a small red shoe, a teddy bear, crayons, a picture book.",
      soldier: "A soldier's: a heavy boot, dog tags, a bundle of letters, a toy car carried for someone.",
      couple: "An old couple's: slippers, reading glasses, knitting, a wedding photograph.",
      musician: "A musician's: a harmonica, drumsticks, loose sheet music, a scuffed stage shoe.",
    }),
    luggage: choice('What did they spill from?', {
      leather: 'A brown leather suitcase with straps and brass corners.',
      shell: 'A bright hard-shell cabin case.',
      cardboard: 'A cardboard box tied with string.',
      trunk: 'A dented tin trunk covered in travel stickers.',
    }),
    front: choice('Which object drifts nearest to us?', {
      shoe: 'The shoe.',
      photo: 'The photograph.',
      mug: 'The tin mug.',
      toy: "The child's toy.",
      book: 'The paperback.',
    }),
    photograph: choice('How is the photograph turned?', {
      facing: 'Facing us: the people in it can be seen.',
      away: 'Turned away: only the back, with a line of handwriting.',
      torn: 'Facing us but torn in half, one piece drifting off.',
      framed: 'Still in its frame, the glass cracked.',
    }),
    lid: choice('How is the case?', {
      wide: 'Flung wide open and empty.',
      ajar: 'Half open, a few clothes still caught inside.',
      broken: 'Broken: the lid has come off and drifts separately.',
    }),
    scattered: score('How far have the things scattered?', ['Still huddled close around the case', 'Loosely spread', 'Strewn far apart']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const cloud = new THREE.Group();
    s.root.add(cloud);
    const drifting: { node: THREE.Object3D; axis: THREE.Vector3; rate: number }[] = [];
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: V3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const fade = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#9a958a'), (1 - mood.cheer) * 0.25);
    const mat = (hex: string, extra: THREE.MeshStandardMaterialParameters = {}) => s.material(fade(hex), { roughness: 0.8, ...extra });
    const brass = s.material('#b8963e', { metalness: 0.85, roughness: 0.35 });
    const steel = s.material('#aab0b6', { metalness: 0.85, roughness: 0.3 });
    const dark = mat('#26272b');
    const paper = mat('#efe9d8');
    const canvasTexture = (width: number, height: number, draw: (g: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const cloth = (parent: THREE.Object3D, width: number, height: number, hex: string, at: V3, stripes = false) => {
      const geometry = new THREE.PlaneGeometry(width, height, 12, 8);
      const p = geometry.attributes.position, f1 = 6 + random() * 8, f2 = 5 + random() * 8, ph = random() * 6;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * f1 / width + ph) * width * 0.09 + Math.cos(p.getY(i) * f2 / height + ph) * height * 0.08);
      geometry.computeVertexNormals();
      const map = stripes ? canvasTexture(64, 64, (g) => { g.fillStyle = fade(hex).getStyle(); g.fillRect(0, 0, 64, 64); g.fillStyle = 'rgba(255,255,255,0.75)'; for (let y = 4; y < 64; y += 16) g.fillRect(0, y, 64, 6); }) : null;
      return add(parent, geometry, new THREE.MeshStandardMaterial({ color: map ? '#ffffff' : fade(hex), map, roughness: 0.95, side: THREE.DoubleSide }), at);
    };

    // ---- the five named things ----
    const shoe = () => {
      const g = new THREE.Group();
      const kind = a.whose;
      const scale = kind === 'child' ? 0.62 : 1;
      const upper = mat({ child: '#cf3b33', soldier: '#3a2c22', couple: '#7b3441', musician: '#1d1d21' }[kind], { roughness: kind === 'musician' ? 0.3 : 0.8 });
      const sole = mat({ child: '#f1ede2', soldier: '#17140f', couple: '#b8a98a', musician: '#e8e2d2' }[kind]);
      add(g, new THREE.BoxGeometry(0.1, 0.022, 0.28), sole, [0, 0.011, 0]);
      add(g, new THREE.SphereGeometry(0.052, 14, 10), upper, [0, 0.05, 0.07]).scale.set(1, 0.72, 1.45);
      if (kind === 'couple') {
        add(g, new THREE.SphereGeometry(0.052, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), upper, [0, 0.022, -0.05]).scale.set(1, 0.5, 1.6);
        add(g, new THREE.SphereGeometry(0.022, 10, 8), mat('#e7dcc0'), [0, 0.085, 0.09]);
      } else {
        const tall = kind === 'soldier' ? 0.2 : 0.07;
        add(g, new THREE.CylinderGeometry(0.046, 0.05, tall, 14, 1, true), new THREE.MeshStandardMaterial({ color: upper.color, roughness: 0.8, side: THREE.DoubleSide }), [0, 0.04 + tall / 2, -0.075]);
        add(g, new THREE.BoxGeometry(0.094, 0.05, 0.12), upper, [0, 0.045, -0.06]);
        const lace = kind === 'musician' ? mat('#e8e2d2') : kind === 'child' ? mat('#f1ede2') : mat('#8a6a3a');
        for (let i = 0; i < (kind === 'soldier' ? 6 : 4); i++) add(g, new THREE.BoxGeometry(0.05, 0.006, 0.008), lace, [0, 0.083 + (kind === 'soldier' && i > 2 ? (i - 2) * 0.035 : 0), 0.06 - Math.min(i, 3) * 0.028 - (i > 2 ? 0.02 : 0)]);
        // One lace has come undone.
        add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.02, 0.09, -0.03), new THREE.Vector3(0.08, 0.12, 0), new THREE.Vector3(0.12, 0.07 + random() * 0.08, 0.06), new THREE.Vector3(0.1, 0.13, 0.13)]), 16, 0.004, 4), lace);
        if (kind === 'musician') add(g, new THREE.SphereGeometry(0.0525, 14, 10, 0, Math.PI * 2, 0, 1.1), mat('#e8e2d2', { roughness: 0.3 }), [0, 0.05, 0.1]).scale.set(1, 0.72, 1.2);
      }
      g.scale.setScalar(scale * 1.15);
      return g;
    };

    const people = { child: [[36, 60, '#3b4a6a'], [64, 56, '#a34a52'], [50, 30, '#d9a441']], soldier: [[50, 66, '#7a4a5a']], couple: [[40, 64, '#2c2c34'], [62, 60, '#f1ede2']], musician: [[22, 56, '#2c2c34'], [42, 60, '#a34a52'], [60, 58, '#3b6a5a'], [80, 54, '#c9973a']] }[a.whose] as [number, number, string][];
    const picture = canvasTexture(200, 240, (g) => {
      g.fillStyle = '#f4efe2'; g.fillRect(0, 0, 200, 240);
      const sepia = mood.wear > 0.5 || a.whose === 'couple' || a.whose === 'soldier';
      g.fillStyle = sepia ? '#c9ae84' : '#8fb7d6'; g.fillRect(14, 14, 172, 178);
      g.fillStyle = sepia ? '#96774e' : '#6c9a62'; g.fillRect(14, 150, 172, 42);
      if (a.whose === 'child') { g.fillStyle = sepia ? '#7a5c3a' : '#b5553c'; g.fillRect(118, 78, 60, 74); g.beginPath(); g.moveTo(110, 80); g.lineTo(148, 48); g.lineTo(186, 80); g.fill(); }
      for (const [x, h, colour] of people) {
        const px = 14 + x * 1.72, base = 178, tall = h * 1.5;
        g.fillStyle = sepia ? '#4a3523' : colour;
        g.beginPath(); g.moveTo(px - 17, base); g.lineTo(px - 13, base - tall + 24); g.lineTo(px + 13, base - tall + 24); g.lineTo(px + 17, base); g.fill();
        g.fillStyle = sepia ? '#e6d2ac' : '#e7c3a1'; g.beginPath(); g.arc(px, base - tall + 10, 12, 0, Math.PI * 2); g.fill();
        g.fillStyle = sepia ? '#3a2a1c' : '#3b2a22'; g.beginPath(); g.arc(px, base - tall + 6, 12, Math.PI, 0); g.fill();
      }
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2;
      for (let i = 0; i < mood.wear * 5; i++) { g.beginPath(); g.moveTo(random() * 200, 0); g.lineTo(random() * 200, 240); g.stroke(); }
    });
    const back = canvasTexture(200, 240, (g) => {
      g.fillStyle = '#e9e2cf'; g.fillRect(0, 0, 200, 240);
      g.strokeStyle = '#3b4a7a'; g.lineWidth = 3; g.lineCap = 'round';
      for (let line = 0; line < 2; line++) { g.beginPath(); let x = 30; const y = 150 + line * 34; g.moveTo(x, y); while (x < (line ? 120 : 170)) { x += 6 + random() * 8; g.lineTo(x, y + (random() - 0.5) * 14); } g.stroke(); }
    });
    const photo = () => {
      const g = new THREE.Group();
      const front = new THREE.MeshStandardMaterial({ map: picture, roughness: 0.55 });
      const rear = new THREE.MeshStandardMaterial({ map: back, roughness: 0.9 });
      const edge = paper;
      const W = 0.2, Hh = 0.24;
      if (a.photograph === 'torn') {
        for (const side of [-1, 1]) {
          const part = new THREE.Group();
          const geometry = new THREE.BoxGeometry(W / 2, Hh, 0.004);
          const uv = geometry.attributes.uv;
          for (let i = 0; i < uv.count; i++) uv.setX(i, side < 0 ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5);
          add(part, geometry, [edge, edge, edge, edge, front, rear]);
          for (let i = 0; i < 6; i++) add(part, new THREE.BoxGeometry(0.012, Hh / 6, 0.0042), paper, [-side * (W / 4 + (i % 2) * 0.005), -Hh / 2 + (i + 0.5) * (Hh / 6), 0]);
          part.position.set(side * (W / 4 + 0.03), side * 0.03, side * 0.03);
          part.rotation.set(side * 0.3, side * 0.5, side * 0.25);
          g.add(part);
        }
      } else {
        add(g, new THREE.BoxGeometry(W, Hh, 0.004), [edge, edge, edge, edge, front, rear]);
        if (a.photograph === 'framed') {
          const wood = mat('#6a4528');
          for (const side of [-1, 1]) { add(g, new THREE.BoxGeometry(0.025, Hh + 0.05, 0.02), wood, [side * (W / 2 + 0.0125), 0, 0]); add(g, new THREE.BoxGeometry(W + 0.05, 0.025, 0.02), wood, [0, side * (Hh / 2 + 0.0125), 0]); }
          const crack = s.material('#ffffff', { roughness: 0.2 });
          for (let i = 0; i < 5; i++) { const ang = random() * Math.PI * 2; const shard = add(g, new THREE.BoxGeometry(0.1 + random() * 0.08, 0.003, 0.001), crack, [Math.cos(ang) * 0.04 - 0.02, Math.sin(ang) * 0.04 + 0.03, 0.004]); shard.rotation.z = ang; }
        }
        if (a.photograph === 'away') g.rotation.y = Math.PI;
      }
      g.scale.setScalar(1.25);
      return g;
    };

    const mug = () => {
      const g = new THREE.Group();
      const enamel = mat({ child: '#f2efe6', soldier: '#5f6a4a', couple: '#f2efe6', musician: '#b7332f' }[a.whose], { roughness: 0.35, metalness: 0.2 });
      const profile = [[0, 0], [0.045, 0], [0.047, 0.09], [0.043, 0.09], [0.041, 0.006], [0, 0.006]].map(([x, y]) => new THREE.Vector2(x, y));
      add(g, new THREE.LatheGeometry(profile, 24), enamel);
      add(g, new THREE.TorusGeometry(0.047, 0.0035, 6, 24), mat('#2b3f6e'), [0, 0.09, 0]).rotation.x = Math.PI / 2;
      add(g, new THREE.TorusGeometry(0.028, 0.006, 6, 16, Math.PI), enamel, [0.047, 0.047, 0]).rotation.z = -Math.PI / 2;
      for (let i = 0; i < Math.round(mood.wear * 4); i++) { const ang = random() * Math.PI * 2; add(g, new THREE.SphereGeometry(0.008 + random() * 0.006, 6, 4), dark, [Math.cos(ang) * 0.0455, 0.02 + random() * 0.06, Math.sin(ang) * 0.0455]).scale.z = 0.3; }
      // A last few drops of tea that left with it.
      const tea = new THREE.MeshStandardMaterial({ color: '#8a5a2a', roughness: 0.2 });
      for (let i = 0; i < 3; i++) add(g, new THREE.SphereGeometry(0.008 + random() * 0.008, 8, 6), tea, [(random() - 0.5) * 0.08, 0.13 + i * 0.045, (random() - 0.5) * 0.08]);
      g.scale.setScalar(1.5);
      return g;
    };

    const toy = () => {
      const g = new THREE.Group();
      if (a.whose === 'child') {
        const fur = mat('#b98a52', { roughness: 1 }), pale = mat('#e3caa0', { roughness: 1 });
        add(g, new THREE.SphereGeometry(0.075, 14, 10), fur, [0, 0.08, 0]).scale.set(1, 1.15, 0.9);
        add(g, new THREE.SphereGeometry(0.06, 14, 10), fur, [0, 0.2, 0]);
        add(g, new THREE.SphereGeometry(0.028, 10, 8), pale, [0, 0.19, 0.05]);
        add(g, new THREE.SphereGeometry(0.04, 10, 8), pale, [0, 0.08, 0.05]).scale.z = 0.5;
        for (const side of [-1, 1]) {
          add(g, new THREE.SphereGeometry(0.024, 10, 8), fur, [side * 0.045, 0.25, 0]);
          add(g, new THREE.SphereGeometry(0.008, 6, 4), dark, [side * 0.022, 0.215, 0.052]);
          add(g, new THREE.CapsuleGeometry(0.025, 0.06, 4, 8), fur, [side * 0.085, 0.11, 0.01]).rotation.z = side * 0.9;
          add(g, new THREE.CapsuleGeometry(0.028, 0.05, 4, 8), fur, [side * 0.045, 0.005, 0.035]).rotation.x = -1.1;
        }
        add(g, new THREE.SphereGeometry(0.009, 6, 4), dark, [0, 0.195, 0.077]);
        if (mood.wear > 0.5) add(g, new THREE.BoxGeometry(0.03, 0.03, 0.004), mat('#4a6a8a'), [0.03, 0.08, 0.066]);
      } else if (a.whose === 'soldier') {
        const body = mat('#2f6fb3', { roughness: 0.35, metalness: 0.3 });
        add(g, new THREE.BoxGeometry(0.2, 0.04, 0.09), body, [0, 0.045, 0]);
        add(g, new THREE.BoxGeometry(0.1, 0.04, 0.08), body, [-0.01, 0.083, 0]);
        add(g, new THREE.BoxGeometry(0.09, 0.03, 0.082), mat('#bcd6e8', { roughness: 0.2 }), [-0.01, 0.083, 0]);
        for (const x of [-0.065, 0.065]) for (const z of [-0.048, 0.048]) add(g, new THREE.CylinderGeometry(0.024, 0.024, 0.016, 12), dark, [x, 0.028, z]).rotation.x = Math.PI / 2;
      } else if (a.whose === 'couple') {
        const wood = mat('#c9453a', { roughness: 0.4 });
        add(g, new THREE.ConeGeometry(0.07, 0.11, 18), wood, [0, 0.055, 0]).rotation.x = Math.PI;
        add(g, new THREE.CylinderGeometry(0.07, 0.07, 0.025, 18), mat('#e8c23c'), [0, 0.122, 0]);
        add(g, new THREE.CylinderGeometry(0.045, 0.07, 0.03, 18), mat('#2f7d8c'), [0, 0.15, 0]);
        add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.07, 8), mat('#6a4528'), [0, 0.2, 0]);
      } else {
        const yellow = mat('#f0c62e', { roughness: 0.35 });
        add(g, new THREE.SphereGeometry(0.07, 14, 10), yellow, [0, 0.06, 0]).scale.set(0.9, 0.75, 1.25);
        add(g, new THREE.SphereGeometry(0.045, 12, 8), yellow, [0, 0.13, 0.05]);
        add(g, new THREE.ConeGeometry(0.03, 0.06, 4), yellow, [0, 0.085, -0.09]).rotation.x = -1.2;
        add(g, new THREE.BoxGeometry(0.035, 0.012, 0.04), mat('#e2702a'), [0, 0.125, 0.1]);
        for (const side of [-1, 1]) add(g, new THREE.SphereGeometry(0.007, 6, 4), dark, [side * 0.022, 0.145, 0.085]);
      }
      g.scale.setScalar(1.25);
      return g;
    };

    const book = () => {
      const g = new THREE.Group();
      const hue = { child: '#e8b12e', soldier: '#7a2f2f', couple: '#3f6b4f', musician: '#3a3f8a' }[a.whose];
      const title = { child: ['THE MOON', 'AND ME'], soldier: ['LETTERS', 'HOME'], couple: ['GARDEN', 'YEARS'], musician: ['BLUE', 'NOTES'] }[a.whose];
      const cover = canvasTexture(128, 190, (c) => {
        c.fillStyle = fade(hue).getStyle(); c.fillRect(0, 0, 128, 190);
        c.fillStyle = '#f2ecd8'; c.fillRect(12, 96, 104, 70);
        c.fillStyle = fade(hue).multiplyScalar(0.6).getStyle(); c.beginPath(); c.arc(64, 130, 24, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#f7f2e2'; c.font = 'bold 21px sans-serif'; c.textAlign = 'center';
        title.forEach((line, i) => c.fillText(line, 64, 38 + i * 26));
        c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 2; c.beginPath(); c.moveTo(8, 0); c.lineTo(8, 190); c.stroke();
      });
      const jacket = mat(hue), pages = paper;
      add(g, new THREE.BoxGeometry(0.108, 0.17, 0.024), [pages, jacket, pages, pages, new THREE.MeshStandardMaterial({ map: cover, roughness: 0.7 }), jacket]);
      // The front cover has lifted and a few pages fan out.
      for (let i = 0; i < 4; i++) { const leaf = new THREE.Group(); leaf.position.set(-0.054, 0, 0.012); leaf.rotation.y = -0.25 - i * 0.22 - random() * 0.1; add(leaf, new THREE.BoxGeometry(0.104, 0.166, 0.0015), i === 3 ? jacket : pages, [0.052, 0, 0]); g.add(leaf); }
      g.scale.setScalar(1.35);
      return g;
    };

    // ---- things that only this owner would have packed ----
    const extras: (() => THREE.Group)[] = [];
    if (a.whose === 'child') {
      extras.push(() => { const g = new THREE.Group(); ['#d9342b', '#2f6fb3', '#e8b12e', '#3f8f4f'].forEach((hex, i) => { const c = new THREE.Group(); add(c, new THREE.CylinderGeometry(0.008, 0.008, 0.08, 8), mat(hex)); add(c, new THREE.ConeGeometry(0.008, 0.018, 8), mat(hex), [0, 0.049, 0]); c.position.set((i - 1.5) * 0.05, (random() - 0.5) * 0.08, (random() - 0.5) * 0.06); c.rotation.set(random() * 3, 0, random() * 3); g.add(c); }); g.scale.setScalar(1.5); return g; });
      extras.push(() => { const g = new THREE.Group(); cloth(g, 0.09, 0.2, '#e58aa2', [0, 0, 0], true); return g; });
    } else if (a.whose === 'soldier') {
      extras.push(() => { const g = new THREE.Group(); add(g, new THREE.TorusGeometry(0.07, 0.003, 4, 28), steel).scale.set(0.8, 1.3, 1); for (const side of [-1, 1]) { const tag = add(g, new THREE.BoxGeometry(0.045, 0.028, 0.002), steel, [side * 0.014, -0.1, side * 0.006]); tag.rotation.z = side * 0.25; } g.scale.setScalar(1.4); return g; });
      extras.push(() => { const g = new THREE.Group(); for (let i = 0; i < 6; i++) add(g, new THREE.BoxGeometry(0.15, 0.003, 0.09), i % 2 ? paper : mat('#dcd2b8'), [(random() - 0.5) * 0.008, i * 0.004, (random() - 0.5) * 0.008]).rotation.y = (random() - 0.5) * 0.1; add(g, new THREE.BoxGeometry(0.154, 0.028, 0.006), mat('#b03a30'), [0, 0.01, 0]); add(g, new THREE.BoxGeometry(0.006, 0.028, 0.094), mat('#b03a30'), [0, 0.01, 0]); g.scale.setScalar(1.3); return g; });
    } else if (a.whose === 'couple') {
      extras.push(() => { const g = new THREE.Group(); const rim = mat('#5a4630', { roughness: 0.4 }); for (const side of [-1, 1]) { add(g, new THREE.TorusGeometry(0.026, 0.004, 6, 20), rim, [side * 0.032, 0, 0]); const arm = add(g, new THREE.CylinderGeometry(0.0025, 0.0025, 0.12, 5), rim, [side * 0.06, 0, -0.058]); arm.rotation.set(Math.PI / 2, 0, side * (random() < 0.5 ? 0.2 : 0.9)); } add(g, new THREE.BoxGeometry(0.014, 0.004, 0.004), rim, [0, 0.006, 0]); g.scale.setScalar(1.5); return g; });
      extras.push(() => { const g = new THREE.Group(); const wool = mat('#5d7fa8', { roughness: 1 }); add(g, new THREE.SphereGeometry(0.055, 12, 8), wool); for (let i = 0; i < 5; i++) add(g, new THREE.TorusGeometry(0.056, 0.004, 4, 20), mat('#7a9cc4', { roughness: 1 })).rotation.set(random() * 3, random() * 3, 0); for (const side of [-1, 1]) { const needle = add(g, new THREE.CylinderGeometry(0.003, 0.003, 0.24, 6), steel, [side * 0.01, 0.02, 0]); needle.rotation.z = side * 0.5 + 0.2; } add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, 0, 0), new THREE.Vector3(0.12, 0.05, 0.03), new THREE.Vector3(0.16, -0.04, 0.08), new THREE.Vector3(0.24, 0.02, 0.05)]), 20, 0.004, 4), wool); g.scale.setScalar(1.3); return g; });
    } else {
      extras.push(() => { const g = new THREE.Group(); add(g, new THREE.BoxGeometry(0.13, 0.022, 0.032), steel); add(g, new THREE.BoxGeometry(0.12, 0.012, 0.034), mat('#7a2f2f')); for (let i = 0; i < 10; i++) add(g, new THREE.BoxGeometry(0.007, 0.007, 0.002), dark, [-0.054 + i * 0.012, 0, 0.0165]); g.scale.setScalar(1.5); return g; });
      extras.push(() => { const g = new THREE.Group(); for (const side of [-1, 1]) { const stick = new THREE.Group(); add(stick, new THREE.CylinderGeometry(0.006, 0.009, 0.36, 8), mat('#d9b98a')); add(stick, new THREE.SphereGeometry(0.01, 8, 6), mat('#d9b98a'), [0, 0.185, 0]).scale.y = 1.5; stick.rotation.z = side * 0.35; stick.position.x = side * 0.04; g.add(stick); } g.scale.setScalar(1.2); return g; });
      const score2 = canvasTexture(128, 170, (c) => { c.fillStyle = '#f4efe2'; c.fillRect(0, 0, 128, 170); c.strokeStyle = '#30343a'; c.lineWidth = 1; for (let st = 0; st < 5; st++) { for (let l = 0; l < 5; l++) { c.beginPath(); c.moveTo(10, 18 + st * 30 + l * 4); c.lineTo(118, 18 + st * 30 + l * 4); c.stroke(); } c.fillStyle = '#30343a'; for (let n = 0; n < 7; n++) { const x = 18 + n * 14, y = 18 + st * 30 + Math.floor(random() * 5) * 4; c.beginPath(); c.ellipse(x, y, 3.4, 2.6, -0.4, 0, Math.PI * 2); c.fill(); c.fillRect(x + 2.6, y - 13, 1.2, 13); } } });
      const sheetMat = new THREE.MeshStandardMaterial({ map: score2, roughness: 0.9, side: THREE.DoubleSide });
      for (let i = 0; i < 2 + Math.round(mood.density * 3); i++) extras.push(() => { const g = new THREE.Group(); const geometry = new THREE.PlaneGeometry(0.21, 0.28, 8, 1); const p = geometry.attributes.position; const curl = 4 + random() * 8; for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin(p.getX(k) * curl) * 0.02); geometry.computeVertexNormals(); add(g, geometry, sheetMat); return g; });
    }
    // Everyone packs a sock or two.
    for (let i = 0; i < 1 + Math.round(mood.density * 2); i++) extras.push(() => { const g = new THREE.Group(); cloth(g, 0.1, 0.24, ['#d9d2bd', '#4a6a8a', '#8a4a52', '#5f7a52'][Math.floor(random() * 4)], [0, 0, 0], random() < 0.5); return g; });

    // ---- the case ----
    const shellHue = { leather: '#7a4a28', shell: mood.cheer > 0.5 ? '#e0563a' : '#2d7f8f', cardboard: '#b89465', trunk: '#4f6f6a' }[a.luggage];
    const skin = mat(shellHue, a.luggage === 'shell' ? { roughness: 0.3 } : a.luggage === 'trunk' ? { metalness: 0.6, roughness: 0.5 } : { roughness: 0.85 });
    const lining = mat({ leather: '#b03a4a', shell: '#2b2e33', cardboard: '#a5834f', trunk: '#d9c9a0' }[a.luggage], { roughness: 1 });
    const CW = 0.66, CD = 0.44, CH = a.luggage === 'cardboard' ? 0.3 : a.luggage === 'trunk' ? 0.2 : 0.11;
    const tray = (isLid: boolean) => {
      const g = new THREE.Group();
      const depthOf = isLid && a.luggage === 'cardboard' ? 0.02 : isLid && a.luggage === 'trunk' ? 0.1 : CH;
      add(g, new THREE.BoxGeometry(CW, 0.014, CD), skin, [0, 0.007, 0]);
      add(g, new THREE.BoxGeometry(CW - 0.03, 0.004, CD - 0.03), lining, [0, 0.016, 0]);
      for (const side of [-1, 1]) {
        add(g, new THREE.BoxGeometry(0.014, depthOf, CD), skin, [side * (CW / 2 - 0.007), depthOf / 2, 0]);
        add(g, new THREE.BoxGeometry(CW, depthOf, 0.014), skin, [0, depthOf / 2, side * (CD / 2 - 0.007)]);
      }
      if (a.luggage === 'leather') {
        for (const x of [-1, 1]) for (const z of [-1, 1]) add(g, new THREE.BoxGeometry(0.06, depthOf + 0.004, 0.06), brass, [x * (CW / 2 - 0.028), depthOf / 2, z * (CD / 2 - 0.028)]);
        for (const x of [-0.17, 0.17]) add(g, new THREE.BoxGeometry(0.045, 0.006, CD + 0.012), mat('#4a2c18'), [x, -0.002, 0]);
      } else if (a.luggage === 'shell') {
        for (let i = 0; i < 5; i++) add(g, new THREE.BoxGeometry(CW * 0.84, 0.008, 0.03), mat(shellHue, { roughness: 0.25 }), [0, -0.003, -0.15 + i * 0.075]);
      } else if (a.luggage === 'trunk') {
        for (const x of [-0.2, 0.2]) add(g, new THREE.BoxGeometry(0.03, 0.01, CD + 0.02), brass, [x, -0.003, 0]);
        if (isLid) ['#d9342b', '#e8b12e', '#f2efe6', '#2f6fb3'].forEach((hex, i) => { const sticker = add(g, i % 2 ? new THREE.CylinderGeometry(0.045, 0.045, 0.003, 16) : new THREE.BoxGeometry(0.11, 0.003, 0.07), mat(hex), [-0.2 + i * 0.13 + (random() - 0.5) * 0.04, -0.002, (random() - 0.5) * 0.22]); sticker.rotation.y = random() * 2; });
      } else if (!isLid) {
        add(g, new THREE.BoxGeometry(CW + 0.006, 0.006, 0.006), paper, [0, depthOf * 0.5, CD / 2 + 0.002]);
        add(g, new THREE.BoxGeometry(0.006, 0.006, CD + 0.006), paper, [0, -0.002, 0]);
        g.add(s.label('FRAGILE', 0.3, 0.09, [0.1, depthOf * 0.5, CD / 2 + 0.006], '#b03a30', '#c2a070'));
      }
      return g;
    };
    const luggage = new THREE.Group();
    luggage.add(tray(false));
    const hinge = new THREE.Group();
    hinge.position.set(0, CH, -CD / 2);
    const lidTray = tray(true);
    lidTray.rotation.x = Math.PI;
    lidTray.position.set(0, a.luggage === 'cardboard' ? 0.02 : a.luggage === 'trunk' ? 0.1 : CH, CD / 2);
    hinge.add(lidTray);
    const openBy = a.lid === 'wide' ? 2.5 + random() * 0.4 : 1.15 + random() * 0.3;
    hinge.rotation.x = -openBy;
    if (a.luggage !== 'cardboard') {
      const grip = add(luggage, new THREE.TorusGeometry(0.06, 0.012, 6, 16, Math.PI), dark, [0, CH * 0.5, CD / 2 + 0.008]);
      grip.rotation.x = Math.PI / 2 - 0.4;
      for (const x of [-0.2, 0.2]) add(luggage, new THREE.BoxGeometry(0.04, 0.035, 0.012), brass, [x, CH - 0.02, CD / 2 + 0.006]);
    }
    if (a.lid === 'ajar') {
      cloth(luggage, 0.34, 0.3, '#d9d2bd', [-0.12, CH + 0.02, 0.1]).rotation.set(-1.2, 0.2, 0.1);
      cloth(luggage, 0.26, 0.4, '#4a6a8a', [0.16, CH * 0.8, 0.22], true).rotation.set(-0.5, 0.1, -0.2);
    }
    luggage.position.set(0, -CH / 2, 0);
    const caseHolder = new THREE.Group();
    caseHolder.add(luggage);
    if (a.lid === 'broken') {
      const loose = new THREE.Group();
      hinge.position.set(0, 0, 0); hinge.rotation.x = 0; lidTray.position.set(0, 0, 0);
      loose.add(hinge);
      loose.position.set(-0.5, 0.42, -0.3);
      loose.rotation.set(0.9 + random(), random() * 2, 0.6);
      cloud.add(loose);
      drifting.push({ node: loose, axis: new THREE.Vector3(0.3, 1, 0.5).normalize(), rate: 0.5 });
    } else luggage.add(hinge);
    caseHolder.position.set(-0.12, 0, -0.28);
    caseHolder.rotation.set(0.5 + (random() - 0.5) * 0.3, 0.5 + (random() - 0.5) * 0.5, -0.25 + (random() - 0.5) * 0.3);
    cloud.add(caseHolder);
    drifting.push({ node: caseHolder, axis: new THREE.Vector3(0.2, 1, 0.1).normalize(), rate: 0.25 });

    // ---- set everything adrift ----
    const spread = mix(0.5, 1.15, a.scattered);
    const named: Record<typeof a.front, () => THREE.Group> = { shoe, photo, mug, toy, book };
    const order = (Object.keys(named) as (typeof a.front)[]).filter((key) => key !== a.front);
    const places: V3[] = [[0.62, 0.42, 0.18], [-0.66, 0.2, 0.42], [0.36, 0.86, -0.14], [-0.3, 0.8, 0.3], [0.72, -0.1, -0.42], [-0.82, 0.62, -0.2], [0.05, 1.05, 0.22], [0.5, 0.1, 0.62], [-0.45, -0.12, 0.7], [0.9, 0.72, 0.3], [-0.1, 0.5, -0.8], [0.2, -0.2, 0.9]];
    const put = (node: THREE.Group, at: V3, turn = true) => {
      node.position.set(at[0] * spread + (random() - 0.5) * 0.1, at[1] * spread * 0.85 + (random() - 0.5) * 0.1, at[2] * spread + (random() - 0.5) * 0.1);
      if (turn) node.rotation.set(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2);
      cloud.add(node);
      drifting.push({ node, axis: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(), rate: 0.4 + random() * 0.8 });
    };
    // The nearest object: forward, a little larger, and turned so it can be read.
    const hero = named[a.front]();
    hero.scale.multiplyScalar(1.45);
    hero.position.set(0.16, 0.32 * spread, 0.5 + spread * 0.32);
    hero.rotation.set(a.front === 'photo' || a.front === 'book' ? -0.25 : 0.35, (a.front === 'photo' && a.photograph === 'away' ? Math.PI : 0) + 0.5 + (random() - 0.5) * 0.4, (random() - 0.5) * 0.7);
    cloud.add(hero);
    drifting.push({ node: hero, axis: new THREE.Vector3(0, 1, 0), rate: 0.15 });
    order.forEach((key, index) => {
      const node = named[key]();
      // The photograph keeps its chosen side toward us even when it is not the nearest thing.
      if (key === 'photo') { put(node, places[index], false); node.rotation.set(-0.2, (a.photograph === 'away' ? Math.PI : 0) + 0.55 + (random() - 0.5) * 0.5, (random() - 0.5) * 0.8); drifting[drifting.length - 1].rate = 0.1; drifting[drifting.length - 1].axis.set(0, 1, 0); }
      else put(node, places[index]);
    });
    extras.forEach((make, index) => put(make(), places[(order.length + index) % places.length]));

    const speed = mix(0.02, 0.5, mood.energy);
    const centreSpin = mix(0.01, 0.1, mood.energy);
    return s.finish({
      update: (dt) => {
        cloud.rotation.y += dt * centreSpin;
        for (const item of drifting) item.node.rotateOnAxis(item.axis, dt * speed * item.rate);
      },
    });
  },
});
