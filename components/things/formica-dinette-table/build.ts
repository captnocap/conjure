import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const LAMINATE = {
  turquoise: { base: '#8fd0c8', a: '#f4efe2', b: '#3f6f73', vinyl: '#2f9c95' },
  butter: { base: '#f0dc8a', a: '#fff8e0', b: '#b9762c', vinyl: '#e0b12e' },
  cherry: { base: '#d95246', a: '#f6e7d8', b: '#6b1d1b', vinyl: '#c22f2a' },
  dove: { base: '#c9cdcb', a: '#f3f3ee', b: '#5a6a7a', vinyl: '#6f7f8f' },
  blush: { base: '#eab6b0', a: '#fbf1ea', b: '#8a5560', vinyl: '#d77f86' },
} as const;

type V3 = readonly [number, number, number];

export default defineThing({
  questions: {
    setting: choice('How is the table set right now?', {
      one: 'Set for one: a single plate, knife, fork and glass at one end, the other chair untouched.',
      crowd: 'Set for a crowd: plates all the way round, a big pot in the middle, bread, extra chairs squeezed in.',
      cup: 'Cleared and wiped, with one cup and saucer left on it.',
      talk: 'Two cups, an ashtray, an opened envelope and papers spread out: a serious conversation.',
      after: 'After the meal: stacked dirty plates, crumpled napkins and a crumb-strewn top.',
      bare: 'Completely bare, nothing on it at all.',
    }),
    colour: choice('What colour is the laminate and the vinyl?', {
      turquoise: 'Turquoise with cream and teal boomerangs, optimistic and atomic-age.',
      butter: 'Butter yellow with tan boomerangs, sunny and warm.',
      cherry: 'Cherry red with cream boomerangs, diner-bright.',
      dove: 'Dove grey with blue-grey boomerangs, quiet and practical.',
      blush: 'Powder pink with plum boomerangs, sweet and a little faded.',
    }),
    shape: choice('What shape is the table top?', {
      rectangle: 'A rectangle with generously rounded corners.',
      oval: 'A long oval.',
      round: 'A small round table for a narrow kitchen.',
    }),
    cover: choice('What covers the top?', {
      bare: 'Nothing: the patterned laminate shows, ringed by its ribbed chrome edge.',
      check: 'A checked oilcloth hanging stiffly over the edge.',
      floral: 'A flowered oilcloth, wipe-clean and slightly sticky.',
      runner: 'A lace runner down the middle with the laminate showing either side.',
    }),
    chairs: choice('How have the chairs been left?', {
      tucked: 'Both tucked in square, the kitchen tidied for the night.',
      pulled: 'Both pulled out at an angle, as if people just stood up.',
      turned: 'One tucked in and one pushed far back and turned away.',
      tipped: 'One chair tipped over on its back on the floor.',
    }),
    centre: choice('What stands in the middle of the table?', {
      nothing: 'Nothing.',
      condiments: 'A chrome napkin holder with salt and pepper shakers.',
      flowers: 'A small vase of plastic flowers.',
      fruit: 'A bowl of fruit.',
      sugar: 'A lidded sugar bowl and a bottle of milk.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const palette = LAMINATE[a.colour];
    const group = (parent: THREE.Object3D = s.root) => { const g = new THREE.Group(); parent.add(g); return g; };
    const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: V3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const pipe = (parent: THREE.Object3D, points: readonly V3[], radius: number, material: THREE.Material) =>
      part(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.12), points.length * 8, radius, 8), material);
    const lathe = (parent: THREE.Object3D, profile: readonly (readonly [number, number])[], material: THREE.Material, at: V3) =>
      part(parent, new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 24), material, at);
    const paint = (size: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      return texture;
    };

    const chrome = new THREE.MeshStandardMaterial({ color: '#d5dadd', metalness: 0.9, roughness: 0.18 + mood.wear * 0.3 });
    const rubber = s.material('#1d1d1f', { roughness: 0.8 });
    const china = s.material('#f4f0e6', { roughness: 0.35 });
    const vinyl = s.material(palette.vinyl, { roughness: 0.42 });
    const piping = s.material('#f3ecdc', { roughness: 0.5 });

    // ---- top ----------------------------------------------------------------------------
    const L = a.shape === 'round' ? 0.95 : a.shape === 'oval' ? 1.3 : 1.15;
    const W = a.shape === 'round' ? 0.95 : 0.78;
    const topY = 0.76;
    const outline = (grow: number) => {
      const shape = new THREE.Shape();
      const l = L / 2 + grow, w = W / 2 + grow;
      if (a.shape === 'rectangle') {
        const r = 0.13 + grow;
        shape.moveTo(-l + r, -w); shape.lineTo(l - r, -w); shape.absarc(l - r, -w + r, r, -Math.PI / 2, 0, false);
        shape.lineTo(l, w - r); shape.absarc(l - r, w - r, r, 0, Math.PI / 2, false);
        shape.lineTo(-l + r, w); shape.absarc(-l + r, w - r, r, Math.PI / 2, Math.PI, false);
        shape.lineTo(-l, -w + r); shape.absarc(-l + r, -w + r, r, Math.PI, Math.PI * 1.5, false);
      } else shape.absellipse(0, 0, l, w, 0, Math.PI * 2, false, 0);
      return shape;
    };
    const laminate = paint(512, (ctx) => {
      ctx.fillStyle = palette.base; ctx.fillRect(0, 0, 512, 512);
      const boomerang = (x: number, y: number, size: number, turn: number, colour: string) => {
        for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) {
          ctx.save(); ctx.translate(x + dx, y + dy); ctx.rotate(turn);
          ctx.fillStyle = colour;
          ctx.beginPath(); ctx.moveTo(-size, size * 0.5);
          ctx.quadraticCurveTo(0, -size * 1.1, size, size * 0.5);
          ctx.quadraticCurveTo(size * 0.72, size * 0.78, size * 0.5, size * 0.55);
          ctx.quadraticCurveTo(0, -size * 0.25, -size * 0.5, size * 0.55);
          ctx.quadraticCurveTo(-size * 0.72, size * 0.78, -size, size * 0.5);
          ctx.fill(); ctx.restore();
        }
      };
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const x = i * 128 + 40 + random() * 48, y = j * 128 + 40 + random() * 48;
        boomerang(x, y, 44 + random() * 14, random() * 6.3, (i + j) % 2 ? palette.a : palette.b);
        ctx.fillStyle = (i + j) % 2 ? palette.b : palette.a;
        ctx.beginPath(); ctx.arc(x + 62, y + 56, 7, 0, 7); ctx.fill();
      }
    });
    laminate.repeat.set(1.25, 1.25);
    const stains = paint(512, (ctx) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < Math.round(mood.wear * 9); i++) {
        ctx.strokeStyle = `rgba(110,70,30,${0.25 + random() * 0.4})`; ctx.lineWidth = 3 + random() * 4;
        ctx.beginPath(); ctx.arc(random() * 512, random() * 512, 16 + random() * 14, 0, 5 + random() * 2); ctx.stroke();
      }
      for (let i = 0; i < Math.round(mood.wear * 5); i++) { ctx.fillStyle = 'rgba(40,25,15,0.7)'; ctx.beginPath(); ctx.ellipse(random() * 512, random() * 512, 9, 4, random() * 3, 0, 7); ctx.fill(); }
    });
    stains.repeat.set(0.9, 0.9);
    const slab = new THREE.ExtrudeGeometry(outline(0), { depth: 0.034, bevelEnabled: false, curveSegments: 20 });
    // a second UV set is not needed: the stains ride as a light map multiplied over the laminate
    const topMaterial = new THREE.MeshStandardMaterial({ map: laminate, roughness: 0.3 + mood.wear * 0.3 });
    const top = part(s.root, slab, [topMaterial, chrome], [0, topY, 0]);
    top.rotation.x = Math.PI / 2;
    if (mood.wear > 0.15 && a.cover === 'bare') {
      const film = part(s.root, new THREE.ShapeGeometry(outline(-0.012), 20), new THREE.MeshStandardMaterial({ map: stains, transparent: true, opacity: 0.9, blending: THREE.MultiplyBlending, depthWrite: false, premultipliedAlpha: true }), [0, topY + 0.0012, 0]);
      film.rotation.x = -Math.PI / 2; film.castShadow = false;
    }
    // ribbed chrome edge
    for (const dy of [-0.008, -0.017, -0.026]) {
      const rib = part(s.root, new THREE.ExtrudeGeometry(outline(0.004), { depth: 0.004, bevelEnabled: false, curveSegments: 20 }), chrome, [0, topY + dy + 0.002, 0]);
      rib.rotation.x = Math.PI / 2;
    }
    // apron and legs
    const legX = L / 2 - (a.shape === 'rectangle' ? 0.17 : 0.3), legZ = W / 2 - (a.shape === 'rectangle' ? 0.14 : 0.24);
    part(s.root, new THREE.BoxGeometry(legX * 2 + 0.06, 0.07, legZ * 2 + 0.06), s.material('#e7e2d5', { roughness: 0.5 }), [0, topY - 0.07, 0]);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      // each leg is a pair of chrome tubes that splay outward to a single black foot
      const foot: V3 = [x * (legX + 0.1), 0.02, z * (legZ + 0.08)];
      pipe(s.root, [[x * legX, topY - 0.04, z * (legZ - 0.03)], [x * (legX + 0.03), 0.4, z * (legZ + 0.005)], foot], 0.014, chrome);
      pipe(s.root, [[x * (legX - 0.05), topY - 0.04, z * legZ], [x * (legX + 0.01), 0.4, z * (legZ + 0.035)], foot], 0.014, chrome);
      part(s.root, new THREE.CylinderGeometry(0.02, 0.024, 0.03, 12), rubber, [foot[0], 0.015, foot[2]]);
    }

    // ---- oilcloth -----------------------------------------------------------------------
    let surface = topY;
    if (a.cover === 'check' || a.cover === 'floral') {
      const cloth = paint(512, (ctx) => {
        if (a.cover === 'check') {
          ctx.fillStyle = '#f6f1e4'; ctx.fillRect(0, 0, 512, 512);
          ctx.fillStyle = mood.cheer > 0.45 ? 'rgba(205,52,46,0.55)' : 'rgba(58,92,150,0.55)';
          for (let i = 0; i < 8; i++) { ctx.fillRect(i * 64, 0, 32, 512); ctx.fillRect(0, i * 64, 512, 32); }
        } else {
          ctx.fillStyle = mood.cheer > 0.45 ? '#f4e9c4' : '#dfe6dc'; ctx.fillRect(0, 0, 512, 512);
          ctx.scale(2, 2);
          for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
            const x = i * 128 + 64 + (j % 2) * 64, y = j * 128 + 64;
            ctx.fillStyle = '#5f9a56';
            for (const t of [0.6, 2.6, 4.4]) { ctx.beginPath(); ctx.ellipse((x + Math.cos(t) * 34) % 256, y + Math.sin(t) * 34, 20, 9, t, 0, 7); ctx.fill(); }
            ctx.fillStyle = (i + j) % 2 ? '#d8544c' : '#e28aa0';
            for (let p = 0; p < 6; p++) { ctx.beginPath(); ctx.arc((x + Math.cos(p * 1.047) * 17) % 256, y + Math.sin(p * 1.047) * 17, 13, 0, 7); ctx.fill(); }
            ctx.fillStyle = '#f2c84a'; ctx.beginPath(); ctx.arc(x % 256, y, 9, 0, 7); ctx.fill();
          }
        }
      });
      cloth.repeat.set(a.cover === 'check' ? 2.4 : 2, a.cover === 'check' ? 2.4 : 2);
      const clothMaterial = new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.38 });
      const drape = part(s.root, new THREE.ExtrudeGeometry(outline(0.012), { depth: 0.15 + random() * 0.05, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 20 }), clothMaterial, [0, topY + 0.01, 0]);
      drape.rotation.x = Math.PI / 2;
      surface = topY + 0.016;
    } else if (a.cover === 'runner') {
      const lace = paint(256, (ctx) => {
        ctx.fillStyle = '#f7f2e6'; ctx.fillRect(0, 0, 256, 256);
        ctx.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { ctx.beginPath(); ctx.arc(i * 32 + 16, j * 32 + 16, (i + j) % 2 ? 9 : 5, 0, 7); ctx.fill(); }
      });
      lace.repeat.set(1, 4);
      const runner = part(s.root, new THREE.PlaneGeometry(0.3, L + 0.2, 1, 1), new THREE.MeshStandardMaterial({ map: lace, alphaTest: 0.5, roughness: 0.95, side: THREE.DoubleSide }), [0, topY + 0.002, 0]);
      runner.rotation.set(-Math.PI / 2, 0, Math.PI / 2); runner.castShadow = false;
      for (const x of [-1, 1]) {
        const fall = part(s.root, new THREE.PlaneGeometry(0.3, 0.1), new THREE.MeshStandardMaterial({ map: lace, alphaTest: 0.5, roughness: 0.95, side: THREE.DoubleSide }), [x * (L / 2 + 0.006), topY - 0.048, 0]);
        fall.rotation.y = Math.PI / 2; fall.castShadow = false;
      }
      runner.scale.y = L / (L + 0.2);
    }

    // ---- chairs -------------------------------------------------------------------------
    const cushion = (w: number, d: number, thick: number) => {
      const shape = new THREE.Shape(), r = 0.05, x = w / 2, y = d / 2;
      shape.moveTo(-x + r, -y); shape.lineTo(x - r, -y); shape.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
      shape.lineTo(x, y - r); shape.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
      shape.lineTo(-x + r, y); shape.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
      shape.lineTo(-x, -y + r); shape.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelSize: 0.014, bevelThickness: 0.014, bevelSegments: 3, curveSegments: 8 });
      geometry.translate(0, 0, -thick / 2);
      return geometry;
    };
    const chair = (kind: 'vinyl' | 'stool' = 'vinyl') => {
      const g = group();
      if (kind === 'stool') {
        const wood = s.material('#9c6b3f', { roughness: 0.7 });
        part(g, new THREE.CylinderGeometry(0.17, 0.17, 0.035, 24), wood, [0, 0.47, 0]);
        for (let i = 0; i < 3; i++) { const t = i * 2.094 + 0.4; pipe(g, [[Math.cos(t) * 0.1, 0.46, Math.sin(t) * 0.1], [Math.cos(t) * 0.19, 0, Math.sin(t) * 0.19]], 0.017, wood); }
        return g;
      }
      const seat = part(g, cushion(0.4, 0.4, 0.05), vinyl, [0, 0.47, 0]);
      seat.rotation.x = Math.PI / 2;
      part(g, new THREE.BoxGeometry(0.41, 0.012, 0.41), piping, [0, 0.47, 0]);
      const back = part(g, cushion(0.38, 0.27, 0.04), vinyl, [0, 0.8, -0.215]);
      back.rotation.x = -0.12;
      const stripe = part(g, new THREE.BoxGeometry(0.1, 0.27, 0.074), piping, [0, 0.8, -0.215]);
      stripe.rotation.x = -0.12;
      for (const x of [-1, 1]) {
        pipe(g, [[x * 0.2, 0.012, 0.2], [x * 0.19, 0.43, 0.17], [x * 0.19, 0.43, -0.17], [x * 0.175, 0.62, -0.215], [x * 0.16, 0.9, -0.25]], 0.011, chrome);
        pipe(g, [[x * 0.19, 0.43, -0.12], [x * 0.2, 0.012, -0.22]], 0.011, chrome);
        for (const z of [0.2, -0.22]) part(g, new THREE.CylinderGeometry(0.014, 0.016, 0.02, 10), rubber, [x * 0.2, 0.01, z]);
      }
      pipe(g, [[-0.19, 0.2, 0.185], [0.19, 0.2, 0.185]], 0.008, chrome);
      if (mood.wear > 0.55 && random() < 0.8) {
        // a split in the vinyl mended with tape
        const tape = part(g, new THREE.BoxGeometry(0.16, 0.004, 0.05), s.material('#8f9498', { roughness: 0.6 }), [0.07 * (random() - 0.5), 0.512, 0.1 * (random() - 0.2)]);
        tape.rotation.y = random() * 1.5;
      }
      return g;
    };
    const seatAt = (g: THREE.Group, x: number, z: number, facing: number, out: number, skew = 0) => {
      g.position.set(x - Math.sin(facing) * out, 0, z - Math.cos(facing) * out);
      g.rotation.y = facing + skew;
    };
    const left = chair(), right = chair();
    const reach = L / 2 + 0.02;
    const wobble = () => (random() - 0.5) * 0.12;
    if (a.chairs === 'tucked') { seatAt(left, -reach, 0, Math.PI / 2, 0.02, wobble() * 0.3); seatAt(right, reach, 0, -Math.PI / 2, 0.02, wobble() * 0.3); }
    else if (a.chairs === 'pulled') { seatAt(left, -reach, 0.05, Math.PI / 2, 0.28, 0.35 + wobble()); seatAt(right, reach, -0.05, -Math.PI / 2, 0.24, -0.3 + wobble()); }
    else if (a.chairs === 'turned') { seatAt(left, -reach, 0, Math.PI / 2, 0.03, wobble() * 0.3); seatAt(right, reach, 0.1, -Math.PI / 2, 0.5, 1.5 + wobble() * 3); }
    else {
      seatAt(left, -reach, 0, Math.PI / 2, 0.14, wobble());
      seatAt(right, reach, 0.1, -Math.PI / 2, 0.38, wobble() * 3);
      right.rotation.order = 'YXZ'; right.rotation.x = -Math.PI / 2 - 0.04; right.position.y = 0.26;
    }
    const extra: THREE.Group[] = [];
    if (a.setting === 'crowd') {
      const places: [number, number, number][] = a.shape === 'round' ? [[0, -W / 2 - 0.02, 0], [0, W / 2 + 0.02, Math.PI]] : [[-L * 0.22, -W / 2 - 0.02, 0], [L * 0.22, -W / 2 - 0.02, 0], [-L * 0.22, W / 2 + 0.02, Math.PI], [L * 0.22, W / 2 + 0.02, Math.PI]];
      places.forEach(([x, z, facing], index) => {
        const g = chair(index === places.length - 1 ? 'stool' : 'vinyl');
        seatAt(g, x, z, facing, 0.2 + random() * 0.1, wobble());
        extra.push(g);
      });
    }

    // ---- things on the table ------------------------------------------------------------
    const table = group();
    table.position.y = surface;
    const plate = (x: number, z: number, y = 0, dirty = false) => {
      lathe(table, [[0, 0], [0.07, 0.003], [0.11, 0.016], [0.108, 0.019], [0.07, 0.008], [0, 0.006]], china, [x, y, z]);
      if (dirty) part(table, new THREE.CircleGeometry(0.06, 12), s.material('#b9783a', { roughness: 0.6 }), [x, y + 0.0085, z]).rotation.x = -Math.PI / 2;
    };
    const cutlery = (x: number, z: number, facing: number) => {
      for (const side of [-1, 1]) {
        const g = group(table);
        g.position.set(x + Math.cos(facing) * side * 0.14, 0.003, z - Math.sin(facing) * side * 0.14);
        g.rotation.y = facing + (random() - 0.5) * 0.2;
        part(g, new THREE.BoxGeometry(0.014, 0.003, 0.19), chrome);
        if (side < 0) part(g, new THREE.BoxGeometry(0.024, 0.003, 0.05), chrome, [0, 0, -0.08]);
      }
    };
    const glass = (x: number, z: number) => lathe(table, [[0, 0], [0.028, 0], [0.034, 0.1], [0.031, 0.1], [0.026, 0.006], [0, 0.006]], new THREE.MeshStandardMaterial({ color: '#cfe4ea', roughness: 0.1, metalness: 0.1 }), [x, 0, z]);
    const cup = (x: number, z: number, full = true) => {
      lathe(table, [[0, 0], [0.065, 0.004], [0.075, 0.013], [0.072, 0.014], [0.04, 0.007], [0, 0.007]], china, [x, 0, z]);
      lathe(table, [[0, 0.008], [0.022, 0.008], [0.027, 0.016], [0.042, 0.064], [0.039, 0.064], [0.024, 0.02], [0, 0.016]], china, [x, 0, z]);
      const ear = part(table, new THREE.TorusGeometry(0.017, 0.0045, 6, 14), china, [x + 0.05, 0.04, z]);
      ear.rotation.y = random() * 0.5;
      if (full) part(table, new THREE.CircleGeometry(0.037, 16), s.material('#5b3118', { roughness: 0.2 }), [x, 0.055, z]).rotation.x = -Math.PI / 2;
    };
    const napkin = (x: number, z: number) => {
      const wad = part(table, new THREE.IcosahedronGeometry(0.035, 0), s.material('#f3efe6', { roughness: 0.95 }), [x, 0.018, z]);
      wad.scale.set(1.2, 0.55, 1); wad.rotation.set(random(), random() * 3, random());
    };
    // places round the table: ends first, then the long sides
    const seats: [number, number, number][] = [[-L / 2 + 0.2, 0, Math.PI / 2], [L / 2 - 0.2, 0, -Math.PI / 2]];
    if (a.shape === 'round') seats.push([0, -W / 2 + 0.2, 0], [0, W / 2 - 0.2, Math.PI]);
    else seats.push([-L * 0.22, -W / 2 + 0.17, 0], [L * 0.22, -W / 2 + 0.17, 0], [-L * 0.22, W / 2 - 0.17, Math.PI], [L * 0.22, W / 2 - 0.17, Math.PI]);
    const centreFree = a.setting !== 'crowd';

    if (a.setting === 'one') {
      const [x, z, f] = seats[0];
      plate(x, z); cutlery(x, z, f); glass(x + 0.14, z - 0.16);
      part(table, new THREE.BoxGeometry(0.12, 0.004, 0.12), s.material(mood.cheer > 0.5 ? '#d8544c' : '#8a97a8', { roughness: 0.9 }), [x + 0.02, 0.002, z + 0.21]).rotation.y = 0.2;
    } else if (a.setting === 'crowd') {
      seats.forEach(([x, z, f], index) => { plate(x, z); cutlery(x, z, f); if (index % 3 !== 2) glass(x + Math.sin(f) * 0.13 + 0.05, z + Math.cos(f) * 0.13); });
      // the pot, a ladle and bread
      const pot = s.material(mood.cheer > 0.5 ? '#d8544c' : '#39506b', { roughness: 0.35 });
      lathe(table, [[0, 0], [0.11, 0], [0.12, 0.01], [0.12, 0.12], [0.112, 0.12], [0.112, 0.012], [0, 0.012]], pot, [0, 0, 0]);
      part(table, new THREE.CylinderGeometry(0.112, 0.112, 0.004, 24), s.material('#b8552a', { roughness: 0.4 }), [0, 0.1, 0]);
      for (const x of [-1, 1]) part(table, new THREE.TorusGeometry(0.022, 0.006, 6, 12, Math.PI), pot, [x * 0.125, 0.1, 0]).rotation.set(Math.PI / 2, 0, x * Math.PI / 2 + Math.PI / 2);
      pipe(table, [[0.04, 0.1, 0.02], [0.13, 0.17, 0.09], [0.19, 0.22, 0.14]], 0.006, chrome);
      const loaf = part(table, new THREE.SphereGeometry(0.07, 14, 10), s.material('#c48a45', { roughness: 0.9 }), [a.shape === 'round' ? 0.2 : -0.3, 0.04, a.shape === 'round' ? 0.2 : 0.02]);
      loaf.scale.set(1.5, 0.6, 0.9); loaf.rotation.y = random();
      part(table, new THREE.BoxGeometry(0.26, 0.012, 0.17), s.material('#a9794a', { roughness: 0.8 }), [loaf.position.x, 0.006, loaf.position.z]).rotation.y = loaf.rotation.y;
      if (a.shape !== 'round') { const jug = lathe(table, [[0, 0], [0.04, 0], [0.055, 0.06], [0.035, 0.14], [0.04, 0.16], [0.036, 0.16], [0.03, 0.14], [0, 0.13]], china, [0.3, 0, -0.04]); jug.rotation.y = random(); }
    } else if (a.setting === 'cup') {
      const [x, z] = seats[random() < 0.5 ? 0 : 1];
      cup(x * 0.85, z + (random() - 0.5) * 0.2);
      part(table, new THREE.BoxGeometry(0.004, 0.002, 0.11), chrome, [x * 0.85 + 0.06, 0.016, z + 0.03]).rotation.y = 0.6;
    } else if (a.setting === 'talk') {
      cup(seats[0][0] + 0.02, 0.12); cup(seats[1][0] - 0.04, -0.1, random() < 0.5);
      const paper = s.material('#f3eedf', { roughness: 0.9 });
      const sheets = 3 + Math.round(mood.density * 5);
      for (let i = 0; i < sheets; i++) {
        const sheet = part(table, new THREE.BoxGeometry(0.21, 0.0012, 0.297), i % 3 === 1 ? s.material('#e8d9a8', { roughness: 0.9 }) : paper, [(random() - 0.5) * L * 0.42, 0.002 + i * 0.0014, (random() - 0.5) * W * 0.4]);
        sheet.rotation.y = random() * 3;
      }
      const envelope = part(table, new THREE.BoxGeometry(0.22, 0.003, 0.11), s.material('#d8c59a', { roughness: 0.9 }), [L * 0.1, 0.014, W * 0.2]);
      envelope.rotation.y = 0.5 + random();
      // ashtray with a cigarette, and reading glasses
      lathe(table, [[0, 0], [0.055, 0], [0.06, 0.022], [0.05, 0.022], [0.045, 0.008], [0, 0.008]], new THREE.MeshStandardMaterial({ color: '#b8793a', roughness: 0.15, metalness: 0.2 }), [-0.02, 0, -W * 0.22]);
      part(table, new THREE.CylinderGeometry(0.004, 0.004, 0.08, 8), paper, [0.01, 0.024, -W * 0.22]).rotation.set(Math.PI / 2, 0, 0.9);
      const specs = group(table);
      specs.position.set(-L * 0.16, 0.012, W * 0.24); specs.rotation.y = random() * 2;
      for (const x of [-1, 1]) part(specs, new THREE.TorusGeometry(0.022, 0.003, 6, 16), rubber, [x * 0.028, 0.012, 0]);
      part(specs, new THREE.BoxGeometry(0.012, 0.003, 0.003), rubber, [0, 0.016, 0]);
      for (const x of [-1, 1]) part(specs, new THREE.BoxGeometry(0.003, 0.003, 0.12), rubber, [x * 0.05, 0.014, -0.06]);
    } else if (a.setting === 'after') {
      const stack = 3 + Math.floor(random() * 4);
      for (let i = 0; i < stack; i++) plate(L * 0.14 + (random() - 0.5) * 0.02, (random() - 0.5) * 0.02 + 0.05, i * 0.014, i === stack - 1);
      cutlery(L * 0.14, 0.05, 0.9);
      for (let i = 0; i < 3 + Math.round(mood.density * 4); i++) napkin((random() - 0.5) * L * 0.6, (random() - 0.5) * W * 0.55);
      glass(-L * 0.2, -0.15); glass(-L * 0.1, 0.2).rotation.set(Math.PI / 2, 0, random() * 3);
      table.children[table.children.length - 1].position.y = 0.032;
      plate(-L * 0.3, 0.02, 0, true);
      s.root.updateMatrixWorld(true);
      const crumbs = Array.from({ length: 70 }, () => ({ at: [(random() - 0.5) * L * 0.7, surface + 0.003, (random() - 0.5) * W * 0.65] as [number, number, number], size: 0.003 + random() * 0.004 }));
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#b98a4a', { roughness: 0.9 }), crumbs);
    }

    if (a.centre !== 'nothing') {
      const cx = centreFree ? 0 : a.shape === 'round' ? -0.2 : 0.02, cz = centreFree ? 0 : a.shape === 'round' ? -0.2 : W * 0.27;
      if (a.centre === 'condiments') {
        part(table, new THREE.BoxGeometry(0.13, 0.012, 0.05), chrome, [cx, 0.006, cz]);
        for (const z of [-1, 1]) part(table, new THREE.CylinderGeometry(0.075, 0.075, 0.004, 20, 1, false, 0, Math.PI), chrome, [cx, 0.012, cz + z * 0.02]).rotation.set(0, 0, Math.PI / 2);
        part(table, new THREE.BoxGeometry(0.11, 0.07, 0.03), s.material('#f6f3ea', { roughness: 0.95 }), [cx, 0.05, cz]);
        for (const [dx, cap] of [[-0.11, '#d5dadd'], [0.11, '#2a2a2c']] as const) {
          lathe(table, [[0, 0], [0.02, 0], [0.024, 0.02], [0.016, 0.06], [0, 0.06]], new THREE.MeshStandardMaterial({ color: '#e8f0f0', roughness: 0.15 }), [cx + dx, 0, cz + 0.03]);
          part(table, new THREE.CylinderGeometry(0.014, 0.017, 0.016, 12), s.material(cap, { metalness: 0.6, roughness: 0.3 }), [cx + dx, 0.068, cz + 0.03]);
        }
      } else if (a.centre === 'flowers') {
        lathe(table, [[0, 0], [0.03, 0], [0.045, 0.04], [0.022, 0.1], [0.028, 0.13], [0.024, 0.13], [0, 0.1]], s.material(mood.cheer > 0.5 ? '#3f7fb8' : '#8f9a8a', { roughness: 0.3 }), [cx, 0, cz]);
        const petals = ['#e2483f', '#f2c63a', '#f08ab0', '#f4f0e6', '#9a5fc0'];
        for (let i = 0; i < 5 + Math.round(mood.density * 4); i++) {
          const t = random() * 6.3, lean = 0.05 + random() * 0.1, h = 0.22 + random() * 0.1;
          const tipX = cx + Math.cos(t) * lean, tipZ = cz + Math.sin(t) * lean;
          pipe(table, [[cx, 0.1, cz], [(cx + tipX) / 2, 0.1 + (h - 0.1) * 0.6, (cz + tipZ) / 2], [tipX, h, tipZ]], 0.003, s.material('#3f8a4a'));
          const bloom = part(table, new THREE.SphereGeometry(0.026, 10, 8), s.material(petals[Math.floor(random() * petals.length)], { roughness: 0.5 }), [tipX, h, tipZ]);
          bloom.scale.y = 0.6;
          part(table, new THREE.SphereGeometry(0.01, 8, 6), s.material('#e8b93c'), [tipX, h + 0.012, tipZ]);
        }
      } else if (a.centre === 'fruit') {
        lathe(table, [[0, 0], [0.05, 0], [0.06, 0.012], [0.13, 0.07], [0.125, 0.074], [0.055, 0.02], [0, 0.018]], s.material('#e9e2cf', { roughness: 0.35 }), [cx, 0, cz]);
        const fruit = ['#d8402f', '#e8b52c', '#e07f2c', '#7fae3a', '#b8322c'];
        for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) {
          const t = i * 2.4, r = i === 0 ? 0 : 0.05 + (i % 2) * 0.02;
          part(table, new THREE.SphereGeometry(0.036 + random() * 0.008, 14, 10), s.material(fruit[i % fruit.length], { roughness: 0.5 }), [cx + Math.cos(t) * r, 0.06 + (i > 4 ? 0.04 : 0) + (i === 0 ? 0.03 : 0), cz + Math.sin(t) * r]);
        }
      } else {
        lathe(table, [[0, 0], [0.035, 0], [0.055, 0.03], [0.05, 0.07], [0.03, 0.082], [0.008, 0.09], [0.012, 0.1], [0, 0.102]], china, [cx - 0.07, 0, cz]);
        for (const x of [-1, 1]) part(table, new THREE.TorusGeometry(0.014, 0.004, 6, 12), china, [cx - 0.07 + x * 0.055, 0.045, cz]);
        lathe(table, [[0, 0], [0.04, 0], [0.042, 0.13], [0.022, 0.18], [0.022, 0.21], [0.026, 0.215], [0, 0.215]], new THREE.MeshStandardMaterial({ color: '#f7f6f0', roughness: 0.2 }), [cx + 0.08, 0, cz - 0.02]);
        part(table, new THREE.CylinderGeometry(0.025, 0.025, 0.006, 14), s.material(mood.cheer > 0.5 ? '#d8b23a' : '#b9bcc0', { metalness: 0.7, roughness: 0.3 }), [cx + 0.08, 0.218, cz - 0.02]);
      }
    }

    return s.finish();
  },
});
