import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const paint = (size: number, draw: (ctx: Ctx, size: number) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

const QUILTS = {
  asanoha: 'Deep indigo with a white hemp-leaf star lattice, traditional and sober.',
  kiku: 'Crimson scattered with big white and pink chrysanthemums, a grandmother\'s best quilt.',
  plaid: 'Brown, orange and cream tartan check, a 1970s department-store set.',
  karakusa: 'Moss green with curling white arabesque vines, like a wrapping cloth.',
  patchwork: 'Hand-pieced patchwork squares in many leftover fabrics.',
  stripe: 'Broad mustard, rust and navy stripes, cheerful and a little loud.',
} as const;

const TOPS = {
  mikan: 'A wooden bowl of mandarins and a curl of peel.',
  tea: 'A small teapot on a tray with cups of green tea.',
  nabe: 'A clay hot pot simmering on a portable gas burner, with little bowls set out.',
  cards: 'Flower cards spread mid-game, some face up, some in a draw pile.',
  homework: 'An open exercise book, pencils and an eraser, someone studying in the warm.',
  newspaper: 'A folded newspaper, reading glasses and the television remote.',
  bare: 'Wiped clean and empty, nobody home yet.',
} as const;

export default defineThing({
  questions: {
    quilt: choice('What is the quilt skirt like?', QUILTS),
    top: choice('What is on the table top?', TOPS),
    places: choice('How many places around it are taken?', {
      none: 'Nobody: the cushions are put away and the table waits.',
      one: 'One cushion, one cup: somebody sitting alone.',
      two: 'Two places, a couple or a grandparent and a child.',
      three: 'Three places, one side left open toward the television.',
      four: 'All four sides taken, the whole family wedged in.',
    }),
    board: choice('What is the table top made of?', {
      keyaki: 'Dark red-brown zelkova with a strong grain, an heirloom.',
      pale: 'Pale blond cedar, new and plain.',
      laminate: 'Glossy wood-print laminate with a cream edge, bought with the television.',
      felt: 'Flipped to its green felt side for mah-jong and cards.',
    }),
    flap: noul('Is one corner of the quilt thrown back onto the top, letting the heater glow show?'),
    cat: noul('Is a cat asleep on the quilt?'),
    cord: noul('Does a power cord with a switch trail out from under the quilt?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fade = new THREE.Color('#ffffff').lerp(new THREE.Color('#b9b2a4'), mood.wear * 0.55);

    // --- Quilt pattern -------------------------------------------------------------------
    const quiltMap = paint(256, (c, n) => {
      const fill = (colour: string) => { c.fillStyle = colour; c.fillRect(0, 0, n, n); };
      if (a.quilt === 'asanoha') {
        fill('#23366b');
        c.strokeStyle = '#e9ecf2'; c.lineWidth = 2.2;
        const step = n / 4, hh = step * 0.5;
        for (let i = -1; i < 5; i++) for (let j = -1; j < 9; j++) {
          const x = i * step + (j % 2 ? hh : 0), y = j * hh;
          c.beginPath();
          for (const [dx, dy] of [[hh, 0], [-hh, 0], [hh * 0.5, hh], [-hh * 0.5, hh], [hh * 0.5, -hh], [-hh * 0.5, -hh]]) { c.moveTo(x, y); c.lineTo(x + dx, y + dy); }
          c.stroke();
        }
      } else if (a.quilt === 'kiku') {
        fill('#a8242c');
        for (let k = 0; k < 9; k++) {
          const x = random() * n, y = random() * n, r = 18 + random() * 20;
          for (const [ox, oy] of [[0, 0], [n, 0], [-n, 0], [0, n], [0, -n]]) {
            c.fillStyle = k % 3 ? '#f6ece2' : '#f2a9b4';
            for (let p = 0; p < 14; p++) { c.beginPath(); c.ellipse(x + ox + Math.cos(p * 0.449) * r * 0.6, y + oy + Math.sin(p * 0.449) * r * 0.6, r * 0.45, r * 0.16, p * 0.449, 0, 7); c.fill(); }
            c.fillStyle = '#e0a52c'; c.beginPath(); c.arc(x + ox, y + oy, r * 0.2, 0, 7); c.fill();
          }
        }
      } else if (a.quilt === 'plaid') {
        fill('#e8d8b4');
        for (const [colour, at, w] of [['#8a4a26', 0, 40], ['#d9822b', 64, 22], ['#8a4a26', 128, 40], ['#5d6b3a', 200, 14]] as const) {
          c.globalAlpha = 0.62; c.fillStyle = colour;
          c.fillRect(at, 0, w, n); c.fillRect(0, at, n, w);
        }
        c.globalAlpha = 1;
      } else if (a.quilt === 'karakusa') {
        fill('#3f6b45');
        c.strokeStyle = '#eef0e2'; c.lineWidth = 5; c.lineCap = 'round';
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
          const x = i * 128 + 64 + (j ? 64 : 0), y = j * 128 + 64;
          for (const [ox, oy] of [[0, 0], [-n, 0], [n, 0]]) {
            c.beginPath();
            for (let t = 0; t < 60; t++) { const ang = t * 0.2, r = 4 + t * 0.75; c.lineTo(x + ox + Math.cos(ang) * r, y + oy + Math.sin(ang) * r); }
            c.stroke();
            c.beginPath(); c.arc(x + ox + 50, y + oy - 38, 9, 0, 7); c.stroke();
          }
        }
      } else if (a.quilt === 'patchwork') {
        const scraps = ['#a8242c', '#23366b', '#e0a52c', '#3f6b45', '#e8d8b4', '#c96f8c', '#5a4a7a', '#d9822b', '#7fa7b8'];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          c.fillStyle = scraps[Math.floor(random() * scraps.length)]; c.fillRect(i * 64, j * 64, 64, 64);
          c.fillStyle = 'rgba(255,255,255,0.35)';
          if (random() < 0.5) for (let d = 0; d < 9; d++) { c.beginPath(); c.arc(i * 64 + 10 + (d % 3) * 22, j * 64 + 10 + Math.floor(d / 3) * 22, 4, 0, 7); c.fill(); }
          else for (let d = 0; d < 4; d++) c.fillRect(i * 64 + d * 16 + 4, j * 64, 5, 64);
        }
        c.strokeStyle = '#f4efe2'; c.lineWidth = 2; c.setLineDash([5, 4]);
        for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, n); c.moveTo(0, i * 64); c.lineTo(n, i * 64); c.stroke(); }
      } else {
        const bands = ['#d7a52c', '#a44a2a', '#243a66', '#efe3c4'];
        for (let i = 0; i < 8; i++) { c.fillStyle = bands[i % 4]; c.fillRect(i * 32, 0, 32, n); }
      }
    });
    const quilt = new THREE.MeshStandardMaterial({ map: quiltMap, color: fade, roughness: 0.95, side: THREE.DoubleSide });

    // --- Quilt skirt: a rounded square that falls off the frame and pools on the floor ------
    const N = 144, M = 16, corner = Math.PI * 0.25;
    const folds = 15 + Math.floor(random() * 6), phase = random() * 6, phase2 = random() * 6;
    const positions: number[] = [], uvs: number[] = [], index: number[] = [];
    const smooth = (x: number) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
    for (let j = 0; j <= M; j++) {
      const t = j / M;
      for (let i = 0; i <= N; i++) {
        const theta = (i / N) * Math.PI * 2;
        let half: number, y: number;
        if (t < 0.15) { half = mix(0.3, 0.435, t / 0.15); y = 0.362; }
        else if (t < 0.62) { const k = (t - 0.15) / 0.47; half = 0.435 + 0.2 * k ** 0.75; y = mix(0.362, 0.035, smooth(k * 1.05)); }
        else { const k = (t - 0.62) / 0.38; half = 0.635 + 0.2 * k; y = 0.035 - 0.02 * k + 0.012 * k * (1 + Math.sin(theta * folds * 0.5 + phase2)); }
        const power = mix(7, 2.7, smooth(t));
        const ripple = smooth((t - 0.15) / 0.6) * (0.028 * Math.sin(theta * folds + phase) + 0.014 * Math.sin(theta * folds * 2.3 + phase2));
        let d = ((theta - corner + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        const w = a.flap ? smooth(1 - Math.abs(d) / 0.7) : 0;
        if (w > 0 && t >= 0.15) {
          let halfUp: number, yUp: number;
          if (t < 0.32) { const k = (t - 0.15) / 0.17; halfUp = 0.435 + 0.03 * Math.sin(k * Math.PI); yUp = mix(0.362, 0.43, k); }
          else { const k = (t - 0.32) / 0.68; halfUp = mix(0.43, 0.17, k); yUp = 0.43 + 0.022 * Math.sin(k * Math.PI) + 0.006 * Math.sin(theta * 40); }
          half = mix(half, halfUp, w); y = mix(y, yUp, w);
        }
        const c = Math.abs(Math.cos(theta)), sn = Math.abs(Math.sin(theta));
        const r = half / (c ** power + sn ** power) ** (1 / power) + ripple * (1 - w);
        positions.push(Math.cos(theta) * r, y, Math.sin(theta) * r);
        uvs.push((i / N) * 8, t * 2.4);
        if (j < M && i < N) { const p = j * (N + 1) + i; index.push(p, p + 1, p + N + 1, p + 1, p + N + 2, p + N + 1); }
      }
    }
    const skirt = new THREE.BufferGeometry();
    skirt.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    skirt.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    skirt.setIndex(index);
    skirt.computeVertexNormals();
    s.mesh(skirt, quilt);

    // --- Frame, heater and top ----------------------------------------------------------------
    const boardColour = { keyaki: '#7a3f24', pale: '#d9b98a', laminate: '#a86a3c', felt: '#2f6b47' }[a.board];
    const grain = paint(256, (c, n) => {
      c.fillStyle = boardColour; c.fillRect(0, 0, n, n);
      if (a.board === 'felt') return;
      for (let k = 0; k < 46; k++) {
        c.strokeStyle = `rgba(${a.board === 'pale' ? '120,80,40' : '40,18,8'},${0.12 + random() * 0.25})`;
        c.lineWidth = 0.6 + random() * 2.2;
        const y0 = random() * n, bend = (random() - 0.5) * 30;
        c.beginPath(); c.moveTo(0, y0); c.bezierCurveTo(n * 0.3, y0 + bend, n * 0.7, y0 - bend, n, y0 + bend * 0.3); c.stroke();
      }
    });
    const wood = s.material(a.board === 'pale' ? '#c9a878' : '#5e3220', { roughness: 0.6 });
    const topMaterial = new THREE.MeshStandardMaterial({ map: grain, color: fade, roughness: a.board === 'laminate' ? 0.22 : a.board === 'felt' ? 1 : 0.5 });
    const edge = s.material(a.board === 'laminate' ? '#eadfc6' : a.board === 'pale' ? '#c9a878' : '#4a2618', { roughness: 0.5 });
    const T = 0.402;
    s.box([0.84, 0.03, 0.84], [0, T - 0.017, 0], edge);
    s.box([0.8, 0.012, 0.8], [0, T - 0.005, 0], topMaterial);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.05, 0.36, 0.05], [x * 0.34, 0.18, z * 0.34], wood);
    const heat = mix(0.5, 2.6, mood.warmth);
    const element = new THREE.MeshStandardMaterial({ color: '#ff8a3a', emissive: '#ff6a1c', emissiveIntensity: heat, roughness: 0.6 });
    s.box([0.3, 0.05, 0.3], [0, 0.325, 0], s.material('#3a3632', { metalness: 0.4 }));
    s.box([0.24, 0.012, 0.24], [0, 0.296, 0], element);
    for (let k = 0; k < 6; k++) s.box([0.26, 0.006, 0.006], [0, 0.288, -0.1 + k * 0.04], s.material('#2a2623', { metalness: 0.6 }));
    // The light that leaks out along the hem.
    const halo = new THREE.MeshBasicMaterial({ color: '#ff8b3d', transparent: true, opacity: mix(0.2, 0.7, mood.warmth), depthWrite: false });
    halo.alphaMap = paint(128, (c, n) => {
      const g = c.createRadialGradient(n / 2, n / 2, n * 0.2, n / 2, n / 2, n / 2);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#b0b0b0'); g.addColorStop(1, '#000000');
      c.fillStyle = g; c.fillRect(0, 0, n, n);
    });
    const haloMesh = s.mesh(new THREE.PlaneGeometry(2.5, 2.5), halo, [0, 0.004, 0]);
    haloMesh.rotation.x = -Math.PI / 2;
    haloMesh.castShadow = haloMesh.receiveShadow = false;
    if (a.flap) {
    }

    // --- Places: cushions and cups -----------------------------------------------------------
    const porcelain = s.material('#eef0ea', { roughness: 0.35 });
    const teaGreen = s.material('#9aa63a', { roughness: 0.3 });
    const cup = (x: number, z: number, glaze: THREE.Material = porcelain) => {
      s.cylinder(0.034, 0.027, 0.062, [x, T + 0.031, z], glaze, 16);
      s.cylinder(0.029, 0.029, 0.004, [x, T + 0.058, z], teaGreen, 16);
    };
    const steamAt: [number, number, number][] = [];
    const cushionColours = ['#7b2d3a', '#2f4a7a', '#8a6a2c', '#3f6b45', '#6a4a7a'];
    const cushionBase = cushionColours[Math.floor(random() * cushionColours.length)];
    const taken = { none: 0, one: 1, two: 2, three: 3, four: 4 }[a.places];
    const sides = [0, 1, 2, 3].map((k) => ({ k, order: random() })).sort((p, q) => p.order - q.order).slice(0, taken).map((p) => p.k);
    if (a.flap) for (let k = 0; k < sides.length; k++) if (sides[k] === 0 && taken < 4) sides[k] = [1, 2, 3].find((side) => !sides.includes(side)) ?? 0;
    for (const side of sides) {
      const angle = side * Math.PI / 2 + Math.PI / 2; // side 0 faces +z
      const out = (distance: number, across: number): [number, number] => [Math.cos(angle) * distance - Math.sin(angle) * across, Math.sin(angle) * distance + Math.cos(angle) * across];
      const geometry = new THREE.BoxGeometry(0.56, 0.15, 0.56, 10, 2, 10);
      const p = geometry.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const reach = Math.max(Math.abs(p.getX(v)), Math.abs(p.getZ(v))) / 0.28;
        const centre = Math.hypot(p.getX(v), p.getZ(v)) / 0.28;
        p.setY(v, p.getY(v) * (1 - 0.6 * reach ** 3) * (1 - 0.35 * Math.max(0, 1 - centre * 2.4)));
      }
      geometry.computeVertexNormals();
      const [cx, cz] = out(0.98 + random() * 0.08, (random() - 0.5) * 0.14);
      const colour = mood.density > 0.6 ? cushionColours[Math.floor(random() * cushionColours.length)] : cushionBase;
      const cushion = s.mesh(geometry, s.material(colour, { roughness: 0.95 }), [cx, 0.078, cz]);
      cushion.rotation.y = -angle + (random() - 0.5) * 0.35;
      s.ball([0.022, 0.012, 0.022], [cx, 0.132, cz], s.material('#e9dcc0'), 8);
      if (a.top !== 'bare') {
        const [ux, uz] = out(0.3, (random() - 0.5) * 0.3 + 0.12);
        cup(ux, uz, s.material(['#eef0ea', '#3f5f8a', '#8a5a3a', '#c9d2c0'][Math.floor(random() * 4)], { roughness: 0.4 }));
        steamAt.push([ux, T + 0.1, uz]);
      }
    }
    if (taken === 0) {
      // Cushions stacked out of the way.
      for (let k = 0; k < 3; k++) {
        const stack = s.box([0.54, 0.075, 0.54], [-0.78, 0.04 + k * 0.078, -0.82], s.material(k === 1 ? '#e9dcc0' : cushionBase, { roughness: 0.95 }));
        stack.rotation.y = (random() - 0.5) * 0.3;
      }
    }

    // --- What is on top -----------------------------------------------------------------------
    const orange = s.material('#f08a1c', { roughness: 0.55 });
    if (a.top === 'mikan') {
      s.lathe([[0, 0.012], [0.07, 0.012], [0.15, 0.06], [0.155, 0.064], [0.14, 0.05], [0.06, 0.02], [0, 0.02]], s.material('#6b3a22', { roughness: 0.4, side: THREE.DoubleSide }), [0, T, 0]);
      const fruit = 4 + Math.floor(random() * 3 + mood.density * 4);
      for (let k = 0; k < fruit; k++) {
        const ring = k < 5 ? 0.075 : 0.03, ang = k * 1.3 + random();
        s.ball([0.036, 0.03, 0.036], [Math.cos(ang) * ring, T + (k < 5 ? 0.058 : 0.105), Math.sin(ang) * ring], orange, 12);
      }
      for (let k = 0; k < 5; k++) { const petal = s.ball([0.034, 0.004, 0.018], [0.25 + Math.cos(k * 1.257) * 0.036, T + 0.005, 0.2 + Math.sin(k * 1.257) * 0.036], orange, 8); petal.rotation.y = -k * 1.257; }
    } else if (a.top === 'tea') {
      s.cylinder(0.2, 0.2, 0.012, [0, T + 0.006, 0], s.material('#2a1c18', { roughness: 0.3 }), 32);
      const clay = s.material('#7a3626', { roughness: 0.5 });
      s.ball([0.07, 0.055, 0.07], [-0.04, T + 0.068, 0], clay, 18);
      s.cylinder(0.03, 0.036, 0.012, [-0.04, T + 0.122, 0], clay, 14);
      s.ball([0.012, 0.012, 0.012], [-0.04, T + 0.136, 0], clay, 8);
      s.rod([-0.04, T + 0.07, 0.05], [-0.04, T + 0.1, 0.15], 0.014, clay, 0.017);
      s.rod([-0.1, T + 0.075, 0], [-0.15, T + 0.1, 0], 0.016, clay, 0.008);
      cup(0.09, 0.06); cup(0.1, -0.07);
      steamAt.push([-0.15, T + 0.14, 0], [0.09, T + 0.1, 0.06]);
    } else if (a.top === 'nabe') {
      s.box([0.34, 0.07, 0.26], [0, T + 0.035, 0], s.material('#b9bcb8', { metalness: 0.6, roughness: 0.35 }));
      s.cylinder(0.02, 0.02, 0.016, [0.13, T + 0.04, 0.132], s.material('#22201e'), 12).rotation.x = Math.PI / 2;
      s.cylinder(0.075, 0.075, 0.006, [0, T + 0.074, 0], new THREE.MeshStandardMaterial({ color: '#4a6aff', emissive: '#3a66ff', emissiveIntensity: mix(0.6, 2, mood.energy) }), 20);
      const pot = s.material('#5a4a3c', { roughness: 0.7 });
      s.lathe([[0, 0.08], [0.09, 0.08], [0.15, 0.11], [0.165, 0.16], [0.17, 0.17]], pot, [0, T, 0]);
      s.lathe([[0.168, 0.17], [0.12, 0.195], [0.04, 0.21], [0, 0.21]], s.material('#e9e2d0', { roughness: 0.6 }), [0, T, 0]);
      s.cylinder(0.03, 0.022, 0.022, [0, T + 0.22, 0], pot, 14);
      for (const x of [-1, 1]) s.box([0.035, 0.016, 0.05], [x * 0.18, T + 0.155, 0], pot);
      for (let k = 0; k < 3; k++) s.lathe([[0, 0.004], [0.03, 0.004], [0.05, 0.035]], s.material('#eef0ea', { side: THREE.DoubleSide }), [-0.26 + k * 0.26, T, 0.27 + random() * 0.04]);
      for (let k = 0; k < 2; k++) s.rod([0.2 + k * 0.012, T + 0.006, 0.2], [0.33 + k * 0.012, T + 0.006, 0.3], 0.004, s.material('#3a2218'));
      steamAt.push([0.05, T + 0.26, 0], [-0.06, T + 0.3, 0.03], [0, T + 0.36, -0.03]);
    } else if (a.top === 'cards') {
      const backs = [s.material('#1a1a1c'), s.material('#b0242c')];
      const faces = ['#f3ead2', '#e8c9cf', '#d9e0c0', '#f0d9a0'].map((colour) => s.material(colour));
      const dots = ['#b0242c', '#3f6b45', '#23366b', '#e0a52c'].map((colour) => s.material(colour));
      for (let k = 0; k < 8; k++) s.box([0.036, 0.004, 0.056], [-0.24, T + 0.002 + k * 0.004, -0.2], backs[0]).rotation.y = 0.2;
      for (let k = 0; k < 16; k++) {
        const x = -0.18 + (k % 4) * 0.11 + (random() - 0.5) * 0.04, z = -0.16 + Math.floor(k / 4) * 0.1 + (random() - 0.5) * 0.03;
        const up = random() < 0.75, turn = (random() - 0.5) * 0.7;
        s.box([0.036, 0.004, 0.056], [x, T + 0.003, z], up ? faces[k % 4] : backs[1]).rotation.y = turn;
        if (up) s.cylinder(0.011, 0.011, 0.005, [x, T + 0.004, z], dots[Math.floor(random() * 4)], 10);
      }
    } else if (a.top === 'homework') {
      const page = s.material('#f4f1e6');
      for (const x of [-1, 1]) {
        s.box([0.17, 0.008, 0.25], [x * 0.087, T + 0.004, 0.08], page).rotation.z = -x * 0.03;
        for (let k = 0; k < 7; k++) s.box([0.13 * (0.5 + random() * 0.5), 0.001, 0.004], [x * 0.087, T + 0.0095, -0.01 + k * 0.028], s.material('#56606e'));
      }
      for (const [colour, x, z, turn] of [['#e0b22c', 0.25, 0.1, 0.5], ['#b0242c', 0.3, 0.02, -0.3], ['#2f4a7a', -0.26, 0.2, 1.2]] as const) {
        const pencil = s.cylinder(0.005, 0.005, 0.17, [x, T + 0.005, z], s.material(colour), 6);
        pencil.rotation.set(Math.PI / 2, 0, turn + random() * 0.3);
      }
      s.box([0.045, 0.015, 0.022], [0.22, T + 0.0075, 0.22], s.material('#f1f1ee'));
      s.box([0.2, 0.03, 0.07], [-0.05, T + 0.015, -0.2], s.material('#c96f8c', { roughness: 0.5 })).rotation.y = 0.15;
    } else if (a.top === 'newspaper') {
      const newsMap = paint(256, (c, n) => {
        c.fillStyle = '#dcd6c4'; c.fillRect(0, 0, n, n);
        c.fillStyle = '#2a2a2a'; c.fillRect(196, 12, 44, 110);
        c.fillStyle = '#8f8a7c'; c.fillRect(110, 140, 76, 96);
        c.fillStyle = '#55524a';
        for (let col = 0; col < 14; col++) { if (col > 5 && col < 11) c.fillRect(14 + col * 13, 12, 6, 116); else if (col < 11) c.fillRect(14 + col * 13, 12, 6, 224); else c.fillRect(14 + col * 13, 134, 6, 102); }
      });
      const news = s.mesh(new THREE.PlaneGeometry(0.34, 0.26), new THREE.MeshStandardMaterial({ map: newsMap, roughness: 0.9 }), [0.02, T + 0.011, 0.05]);
      news.rotation.set(-Math.PI / 2, 0, 0.12);
      s.box([0.34, 0.01, 0.26], [0.02, T + 0.005, 0.05], s.material('#d5cfbd')).rotation.y = 0.12;
      const frame = s.material('#2a2018', { metalness: 0.3 });
      for (const x of [-1, 1]) s.ring(0.022, 0.003, [0.24 + x * 0.027, T + 0.004, -0.2], frame).rotation.x = Math.PI / 2;
      s.box([0.045, 0.022, 0.17], [-0.26, T + 0.011, -0.12], s.material('#22201e')).rotation.y = -0.4;
    } else {
      s.box([0.16, 0.004, 0.12], [0.2, T + 0.002, 0.18], s.material('#e9e4d2')).rotation.y = 0.4;
    }
    if (mood.density > 0.55 && a.top !== 'bare') {
      s.box([0.12, 0.07, 0.24], [-0.27, T + 0.035, 0.22], s.material('#9cc3d8', { roughness: 0.6 })).rotation.y = 0.25;
      s.box([0.05, 0.012, 0.09], [-0.27, T + 0.076, 0.22], s.material('#f6f6f2')).rotation.y = 0.25;
    }

    // --- Cat and cord ----------------------------------------------------------------------------
    if (a.cat) {
      const coat = ['#e8dfd0', '#d98a3a', '#3a3632', '#9a9690'][Math.floor(random() * 4)];
      const fur = s.material(coat, { roughness: 1 });
      const cx = -0.6, cz = 0.42;
      s.ball([0.17, 0.085, 0.13], [cx, 0.1, cz], fur, 18).rotation.y = 0.5;
      s.ball([0.062, 0.056, 0.06], [cx + 0.13, 0.085, cz + 0.07], fur, 14);
      for (const side of [-1, 1]) { const ear = s.mesh(new THREE.ConeGeometry(0.02, 0.04, 4), fur, [cx + 0.135 + side * 0.03, 0.14, cz + 0.07 - side * 0.025]); ear.rotation.y = 0.6; }
      s.tube([[cx - 0.14, 0.05, cz - 0.03], [cx - 0.17, 0.045, cz + 0.08], [cx - 0.07, 0.045, cz + 0.15], [cx + 0.07, 0.045, cz + 0.15]], 0.016, fur);
    }
    if (a.cord) {
      const flex = s.material('#2a2623', { roughness: 0.8 });
      const bend = (random() - 0.5) * 0.3;
      s.tube([[-0.45, 0.02, -0.6], [-0.62, 0.012, -0.82], [-0.78 + bend, 0.012, -0.95], [-0.98, 0.012, -0.98 + bend], [-1.1, 0.012, -1.12]], 0.007, flex);
      s.box([0.09, 0.025, 0.04], [-0.72, 0.02, -0.9], s.material('#e9e4d2', { roughness: 0.4 })).rotation.y = 0.6;
      s.box([0.02, 0.008, 0.012], [-0.72, 0.036, -0.9], new THREE.MeshStandardMaterial({ color: '#ff5a2c', emissive: '#ff4a1c', emissiveIntensity: heat }));
    }

    // --- Steam -----------------------------------------------------------------------------------
    const vapour = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false });
    const puffs = steamAt.map(([x, y, z], k) => {
      const puff = s.ball([0.022, 0.03, 0.022], [x, y, z], vapour, 8);
      puff.castShadow = puff.receiveShadow = false;
      return { puff, x, y, z, offset: k * 0.37 + random() };
    });
    const pace = mix(0.15, 0.7, mood.energy);
    return s.finish({
      update(_dt, time) {
        halo.opacity = mix(0.2, 0.7, mood.warmth) * (0.9 + 0.1 * Math.sin(time * 1.7));
        element.emissiveIntensity = heat * (0.92 + 0.08 * Math.sin(time * 2.3));
        for (const { puff, x, y, z, offset } of puffs) {
          const k = (time * pace + offset) % 1;
          puff.position.set(x + Math.sin(k * 6 + offset) * 0.015, y + k * 0.12, z);
          puff.scale.setScalar(0.022 * (1 + k * 1.6));
        }
      },
    });
  },
});
