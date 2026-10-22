import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const BEHIND = {
  beach: 'A bright beach: blue sky, a band of sea, pale sand and a low sun.',
  corridor: 'A long institutional corridor shrinking to a far tiny door.',
  nothing: 'Bright blank nothing, a white glare with no detail at all.',
  same: 'The same door again, and another inside it, repeating inward.',
  night: 'A deep night sky with stars and a thin moon.',
  bricks: 'A bricked-up wall: there is no other side.',
  underwater: 'Green deep water with shafts of light, held back by nothing.',
  wallpaper: 'A remembered childhood room: striped wallpaper and a lit window.',
} as const;
const COLOURS = {
  red: 'Glossy front-door red.', blue: 'Seaside blue.', green: 'Dark bottle green.',
  white: 'Chalky white, almost the colour of the air.', black: 'Formal black.', yellow: 'Sunny yellow.', wood: 'Bare varnished wood.',
} as const;
const TINT: Record<keyof typeof COLOURS, string> = {
  red: '#b3332b', blue: '#3f7fa6', green: '#2f5a41', white: '#ece8dc', black: '#2a2b2e', yellow: '#e2b93a', wood: '#8a5a34',
};

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    behind: choice('What shows through the doorway?', BEHIND),
    ajar: score('How far open is the door?', ['Barely a crack of light', 'A hand-width', 'Half open', 'Swung wide']),
    style: choice('What kind of door is it?', {
      panelled: 'A four-panel house door with a round knob.',
      plank: 'A ledged plank door with strap hinges and a latch, from a shed or cottage.',
      glazed: 'A half-glazed door with a frosted window, like an office or a school.',
      porthole: 'A flush door with a round porthole and a kick plate, hospital or ship.',
      arched: 'A tall door with a rounded top, chapel-like.',
    }),
    colour: choice('What colour is the door painted?', COLOURS),
    threshold: choice('What waits at the threshold: does it invite or warn?', {
      mat: 'A welcome mat: it invites.',
      shoes: 'A pair of shoes left neatly outside: someone already went through.',
      tape: 'Striped hazard tape crossed over the opening: it warns.',
      chain: 'A door chain pulled taut, letting it open only so far.',
      suitcase: 'A small packed suitcase standing ready.',
      nothing: 'Nothing at all. It neither invites nor warns.',
    }),
    leaking: noul('Is the other place spilling across the threshold (sand, water, stars, light)?'),
    top: choice('What sits above the door?', {
      plain: 'A plain lintel.',
      pediment: 'A small triangular pediment, grand for no reason.',
      fanlight: 'A glowing semicircular fanlight.',
      number: 'A house number plate you almost recognise.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.9, H = a.style === 'arched' ? 2.25 : 2.05, J = 0.11, D = 0.16;
    const frameMat = s.material(a.colour === 'white' ? '#d9d2c0' : '#efe9da');
    const leafMat = s.material(TINT[a.colour], { roughness: a.colour === 'wood' ? 0.55 : 0.4 });
    const darker = s.material(new THREE.Color(TINT[a.colour]).multiplyScalar(0.72));
    const brass = s.material('#c9a24a', { metalness: 0.85, roughness: 0.3 });
    const dark = s.material('#2b2a28');
    const glowTint = { beach: '#fff0c2', corridor: '#dfe9d2', nothing: '#ffffff', same: '#f3e2c4', night: '#9fb4ff', bricks: '#c9a28d', underwater: '#8fe0c8', wallpaper: '#ffd9a0' }[a.behind];

    // The frame: sill, jambs, head and a stop bead.
    s.box([W + J * 2 + 0.1, 0.05, D + 0.14], [0, 0.025, 0], frameMat);
    for (const x of [-1, 1]) s.box([J, H, D], [x * (W + J) / 2, 0.05 + H / 2, 0], frameMat);
    s.box([W + J * 2 + 0.08, J, D + 0.03], [0, 0.05 + H + J / 2, 0], frameMat);
    const topY = 0.05 + H + J;
    if (a.top === 'pediment') {
      const shape = new THREE.Shape([new THREE.Vector2(-W / 2 - J - 0.1, 0), new THREE.Vector2(W / 2 + J + 0.1, 0), new THREE.Vector2(0, 0.34)]);
      const ped = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: D + 0.04, bevelEnabled: false }), frameMat, [0, topY, -(D + 0.04) / 2]);
      ped.name = 'pediment';
    } else if (a.top === 'fanlight') {
      const arc = new THREE.Shape(); arc.absarc(0, 0, W / 2 + J, 0, Math.PI); arc.lineTo(-W / 2 - J, 0);
      s.mesh(new THREE.ExtrudeGeometry(arc, { depth: D, bevelEnabled: false }), frameMat, [0, topY, -D / 2]);
      const fan = paint(256, 128, (ctx, w, h) => {
        ctx.fillStyle = glowTint; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#efe9da'; ctx.lineWidth = 9;
        for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(w / 2, h); ctx.lineTo(w / 2 + Math.cos(i * Math.PI / 6) * w, h - Math.sin(i * Math.PI / 6) * w); ctx.stroke(); }
      });
      const glass = s.mesh(new THREE.CircleGeometry(W / 2, 24, 0, Math.PI), new THREE.MeshStandardMaterial({ map: fan, emissive: '#ffffff', emissiveMap: fan, emissiveIntensity: 0.75, side: THREE.DoubleSide }), [0, topY + 0.02, D / 2 + 0.004]);
      glass.castShadow = false;
    } else if (a.top === 'number') {
      s.label(String(1 + Math.floor(random() * 98)), 0.26, 0.17, [0, topY + 0.12, D / 2 - 0.02], '#f4efe0', '#27303a');
      s.box([0.3, 0.21, 0.03], [0, topY + 0.12, D / 2 - 0.04], brass);
    }

    // The other place, painted on a glowing sheet that fills the opening.
    const view = paint(256, 512, (ctx, w, h) => {
      const grad = (stops: [number, string][], y0 = 0, y1 = h) => { const g = ctx.createLinearGradient(0, y0, 0, y1); for (const [t, c] of stops) g.addColorStop(t, c); return g; };
      if (a.behind === 'beach') {
        ctx.fillStyle = grad([[0, '#6db7e8'], [0.55, '#d4ecf5']]); ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(w * 0.68, h * 0.3, 26, 0, 7); ctx.fill();
        ctx.fillStyle = '#2f86ad'; ctx.fillRect(0, h * 0.55, w, h * 0.14);
        ctx.fillStyle = '#eaf7f8'; for (let i = 0; i < 5; i++) ctx.fillRect(random() * w * 0.7, h * (0.57 + i * 0.025), 60 + random() * 60, 3);
        ctx.fillStyle = grad([[0, '#f0dfae'], [1, '#d9bd7c']], h * 0.69, h); ctx.fillRect(0, h * 0.69, w, h);
      } else if (a.behind === 'corridor') {
        ctx.fillStyle = '#cfd6c2'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 9; i++) {
          const k = 1 - i / 9.5, x = w / 2 * (1 - k), y = h * 0.46 * (1 - k);
          ctx.fillStyle = i % 2 ? '#aeb89f' : '#dfe5d3'; ctx.fillRect(x, y, w * k, h * k * 0.55 + (h - y - h * k * 0.55 - (h * 0.2) * (1 - k)));
          ctx.strokeStyle = '#6f7a66'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w * k, h - y - h * 0.2 * (1 - k));
        }
        ctx.fillStyle = '#3a3f37'; ctx.fillRect(w / 2 - 7, h * 0.46 - 2, 14, 30);
        ctx.fillStyle = '#fffbe0'; for (let i = 0; i < 5; i++) { const k = 1 - i / 5.5; ctx.fillRect(w / 2 - 22 * k, h * 0.46 * (1 - k) + 6 * k, 44 * k, 7 * k); }
      } else if (a.behind === 'nothing') {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
      } else if (a.behind === 'same') {
        for (let i = 0; i < 6; i++) {
          const k = 0.74 ** i, x = (w - w * k) / 2, y = (h - h * k) * 0.8;
          ctx.fillStyle = i % 2 ? '#e9dcc0' : '#f6efdc'; ctx.fillRect(x, y, w * k, h * k);
          ctx.fillStyle = TINT[a.colour]; ctx.fillRect(x + w * k * 0.04, y + h * k * 0.03, w * k * 0.2, h * k * 0.97);
          ctx.strokeStyle = '#8a7f6a'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w * k, h * k);
        }
      } else if (a.behind === 'night') {
        ctx.fillStyle = grad([[0, '#0f1740'], [1, '#3a4f96']]); ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff'; for (let i = 0; i < 90; i++) { const r = random() < 0.12 ? 3 : 1.4; ctx.beginPath(); ctx.arc(random() * w, random() * h, r, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(w * 0.62, h * 0.24, 30, 0, 7); ctx.fill();
        ctx.fillStyle = '#17205a'; ctx.beginPath(); ctx.arc(w * 0.62 + 13, h * 0.24 - 6, 27, 0, 7); ctx.fill();
      } else if (a.behind === 'bricks') {
        ctx.fillStyle = '#b9b0a2'; ctx.fillRect(0, 0, w, h);
        for (let row = 0; row < 26; row++) for (let col = -1; col < 4; col++) {
          ctx.fillStyle = `hsl(${12 + random() * 10}, ${38 + random() * 15}%, ${38 + random() * 14}%)`;
          ctx.fillRect(col * 68 + (row % 2) * 34 + 2, row * 20 + 2, 64, 16);
        }
      } else if (a.behind === 'underwater') {
        ctx.fillStyle = grad([[0, '#7fe0cf'], [1, '#0d4a5c']]); ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 0.25; ctx.fillStyle = '#eafff6';
        for (let i = 0; i < 5; i++) { const x = random() * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x - 40, h); ctx.lineTo(x - 90, h); ctx.fill(); }
        ctx.globalAlpha = 0.8; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(random() * w, random() * h, 2 + random() * 5, 0, 7); ctx.strokeStyle = '#eafff6'; ctx.lineWidth = 1.5; ctx.stroke(); }
      } else {
        for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#e7c9a5' : '#c98f77'; ctx.fillRect(i * w / 8, 0, w / 8, h); }
        ctx.fillStyle = '#6b4a36'; ctx.fillRect(0, h * 0.8, w, h * 0.2); ctx.fillStyle = '#efe6d2'; ctx.fillRect(0, h * 0.77, w, h * 0.035);
        ctx.fillStyle = '#efe6d2'; ctx.fillRect(w * 0.24, h * 0.2, w * 0.52, h * 0.3);
        ctx.fillStyle = '#fff3b8'; ctx.fillRect(w * 0.28, h * 0.22, w * 0.2, h * 0.26); ctx.fillRect(w * 0.52, h * 0.22, w * 0.2, h * 0.26);
      }
    });
    const viewMat = new THREE.MeshStandardMaterial({ map: view, emissive: '#ffffff', emissiveMap: view, emissiveIntensity: a.behind === 'nothing' ? 1 : a.behind === 'bricks' ? 0.12 : mix(0.5, 0.8, mood.cheer), roughness: 0.9, side: THREE.DoubleSide });
    const sheet = s.mesh(new THREE.PlaneGeometry(W, H), viewMat, [0, 0.05 + H / 2, -D / 2 + 0.01]);
    sheet.castShadow = false;
    // A blank back so the far side is only a door-shaped board.
    s.box([W + 0.02, H, 0.012], [0, 0.05 + H / 2, -D / 2], frameMat);

    // The leaf, hinged on the left jamb and swinging toward the viewer.
    const chained = a.threshold === 'chain';
    const angle = chained ? mix(0.4, 0.55, a.ajar) : mix(0.5, 1.7, a.ajar);
    const hinge = new THREE.Group();
    hinge.position.set(-W / 2, 0.05, D / 2 - 0.02);
    hinge.rotation.y = -angle;
    s.root.add(hinge);
    const T = 0.045;
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; hinge.add(mesh);
      return mesh;
    };
    const LH = H - 0.01;
    if (a.style === 'arched') {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(W, 0); shape.lineTo(W, LH - W / 2); shape.absarc(W / 2, LH - W / 2, W / 2, 0, Math.PI); shape.lineTo(0, 0);
      add(new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false }), leafMat, 0, 0, -T / 2);
      // Fill the spandrels of the square opening so the arch reads.
      for (const x of [-1, 1]) {
        const sp = new THREE.Shape();
        sp.moveTo(0, 0); sp.lineTo(W / 2, 0); sp.absarc(W / 2, -W / 2, W / 2, Math.PI / 2, Math.PI); sp.lineTo(0, 0);
        const m = s.mesh(new THREE.ExtrudeGeometry(sp, { depth: D, bevelEnabled: false }), frameMat, [x * -W / 2, 0.05 + H, -D / 2]);
        m.scale.x = x;
      }
      for (let i = 1; i < 5; i++) add(new THREE.BoxGeometry(0.012, LH - W / 2, 0.01), darker, i * W / 5, (LH - W / 2) / 2, T / 2);
    } else {
      add(new THREE.BoxGeometry(W, LH, T), leafMat, W / 2, LH / 2, 0);
    }
    if (a.style === 'panelled') {
      for (const side of [1, -1]) for (const [px, py, pw, ph] of [[0.25, 0.48, 0.3, 0.62], [0.65, 0.48, 0.3, 0.62], [0.25, 1.4, 0.3, 0.9], [0.65, 1.4, 0.3, 0.9]])
        add(new THREE.BoxGeometry(pw, ph, 0.012), darker, px, py, side * T / 2);
    } else if (a.style === 'plank') {
      for (let i = 1; i < 6; i++) add(new THREE.BoxGeometry(0.012, LH, T + 0.006), darker, i * W / 6, LH / 2, 0);
      for (const y of [0.35, 1.05, 1.75]) add(new THREE.BoxGeometry(W - 0.06, 0.12, 0.03), leafMat, W / 2, y, T / 2 + 0.012);
      for (const y of [0.35, 1.75]) add(new THREE.BoxGeometry(W * 0.7, 0.05, 0.012), dark, W * 0.35, y, T / 2 + 0.032);
    } else if (a.style === 'glazed') {
      const frost = new THREE.MeshStandardMaterial({ color: '#eef3f0', emissive: glowTint, emissiveIntensity: 0.35, roughness: 0.3 });
      add(new THREE.BoxGeometry(W - 0.24, 0.85, T + 0.004), frost, W / 2, 1.45, 0);
      add(new THREE.BoxGeometry(0.02, 0.85, T + 0.012), leafMat, W / 2, 1.45, 0);
      add(new THREE.BoxGeometry(W - 0.24, 0.5, T + 0.012), darker, W / 2, 0.5, 0);
    } else if (a.style === 'porthole') {
      const frost = new THREE.MeshStandardMaterial({ color: '#eef3f0', emissive: glowTint, emissiveIntensity: 0.4, roughness: 0.3 });
      const glass = add(new THREE.CylinderGeometry(0.17, 0.17, T + 0.008, 28), frost, W / 2, 1.5, 0); glass.rotation.x = Math.PI / 2;
      for (const side of [1, -1]) add(new THREE.TorusGeometry(0.18, 0.02, 8, 32), brass, W / 2, 1.5, side * T / 2);
      add(new THREE.BoxGeometry(W - 0.04, 0.28, T + 0.01), s.material('#aeb3b3', { metalness: 0.7, roughness: 0.35 }), W / 2, 0.17, 0);
    }
    // Handle, keyhole and hinges.
    for (const side of [1, -1]) {
      if (a.style === 'plank') add(new THREE.BoxGeometry(0.16, 0.03, 0.03), dark, W - 0.12, 1.02, side * (T / 2 + 0.04));
      else {
        const stem = add(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 10), brass, W - 0.08, 1.02, side * (T / 2 + 0.03)); stem.rotation.x = Math.PI / 2;
        const knob = add(new THREE.SphereGeometry(0.035, 16, 12), brass, W - 0.08, 1.02, side * (T / 2 + 0.065)); knob.scale.z = 0.8;
        add(new THREE.BoxGeometry(0.05, 0.16, 0.006), brass, W - 0.08, 0.98, side * (T / 2 + 0.003));
      }
    }
    for (const y of [0.25, 1.05, 1.8]) s.cylinder(0.014, 0.014, 0.11, [-W / 2 - 0.004, 0.05 + y, D / 2 - 0.004], brass, 10);

    // Peeling paint and scuffs with wear.
    const flakes = Math.round(mood.wear * 26);
    const flakeMat = s.material('#b9ad98');
    for (let i = 0; i < flakes; i++) add(new THREE.BoxGeometry(0.03 + random() * 0.08, 0.03 + random() * 0.1, 0.004), flakeMat, 0.06 + random() * (W - 0.12), 0.05 + random() ** 1.6 * (H - W / 2 - 0.1), T / 2 + 0.008);

    // Light falling out of the gap onto the ground: a see-through wedge.
    const spill = new THREE.Shape();
    const reach = mix(0.9, 2.2, a.ajar) * (a.behind === 'bricks' ? 0.3 : 1);
    spill.moveTo(-W / 2 + 0.02, 0); spill.lineTo(W / 2, 0); spill.lineTo(W / 2 + reach * 0.45, reach); spill.lineTo(-W / 2 + W * (1 - Math.min(1, a.ajar * 1.5 + 0.2)) + 0.1, reach * 0.9);
    const wedge = s.mesh(new THREE.ShapeGeometry(spill), new THREE.MeshBasicMaterial({ color: glowTint, transparent: true, opacity: mix(0.25, 0.55, mood.cheer), depthWrite: false, side: THREE.DoubleSide }), [0, 0.012, D / 2 + 0.07]);
    wedge.rotation.x = Math.PI / 2; wedge.castShadow = wedge.receiveShadow = false;

    // What is leaking through.
    const drift: THREE.Object3D[] = [];
    if (a.leaking) {
      if (a.behind === 'beach' || a.behind === 'bricks' || a.behind === 'wallpaper' || a.behind === 'same') {
        const grit = s.material({ beach: '#e6cf96', bricks: '#a8604a', wallpaper: '#d9b48f', same: TINT[a.colour] }[a.behind]);
        if (a.behind === 'beach') { s.ball([0.5, 0.07, 0.42], [0.05, 0.03, 0.3], grit, 16); s.ball([0.28, 0.05, 0.3], [0.3, 0.02, 0.62], grit, 14); }
        const bit = a.behind === 'beach' ? new THREE.SphereGeometry(0.5, 6, 5) : new THREE.BoxGeometry(1, a.behind === 'bricks' ? 0.45 : 0.08, 0.6);
        s.scatter(bit, grit, Array.from({ length: a.behind === 'beach' ? 24 : 9 }, () => {
          const size = a.behind === 'beach' ? 0.03 + random() * 0.05 : 0.1 + random() * 0.1;
          return { at: [(random() - 0.5) * 0.9 + 0.15, size * 0.2, 0.15 + random() * 1.0] as const, size };
        }));
      } else if (a.behind === 'underwater' || a.behind === 'corridor') {
        const wet = s.material(a.behind === 'underwater' ? '#4fb3a8' : '#d5dccb', { roughness: 0.08, metalness: 0.2 });
        s.cylinder(0.55, 0.6, 0.012, [0.1, 0.008, 0.5], wet, 28).scale.z = 0.75;
        s.cylinder(0.2, 0.22, 0.012, [0.5, 0.008, 1.05], wet, 20);
        s.cylinder(0.12, 0.13, 0.012, [-0.3, 0.008, 1.0], wet, 16);
      } else {
        // Stars or motes of light drifting out.
        const mote = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: glowTint, emissiveIntensity: 1.2 });
        for (let i = 0; i < 12; i++) {
          const star = s.mesh(new THREE.OctahedronGeometry(0.025 + random() * 0.03), mote, [(random() - 0.3) * 0.9, 0.2 + random() * 1.7, 0.15 + random() * 0.9]);
          star.castShadow = false; drift.push(star);
        }
      }
    }

    // The thing at the threshold.
    if (a.threshold === 'mat') {
      s.box([0.72, 0.02, 0.44], [0.08, 0.01, 0.5], s.material(mood.cheer > 0.5 ? '#a9793f' : '#6f6250', { roughness: 1 }));
      const word = s.label(mood.cheer > 0.35 ? 'WELCOME' : 'GO BACK', 0.6, 0.16, [0.08, 0.022, 0.5], '#3a2a1a', mood.cheer > 0.5 ? '#a9793f' : '#6f6250');
      word.rotation.x = -Math.PI / 2;
    } else if (a.threshold === 'shoes') {
      const leather = s.material(mood.cheer > 0.5 ? '#b23a48' : '#3b2d26', { roughness: 0.4 });
      for (const x of [-0.07, 0.07]) {
        s.ball([0.05, 0.035, 0.13], [0.2 + x, 0.035, 0.42 + x * 0.2], leather, 14);
        s.cylinder(0.04, 0.045, 0.05, [0.2 + x, 0.06, 0.36 + x * 0.2], dark, 12);
      }
    } else if (a.threshold === 'tape') {
      const tape = paint(256, 32, (ctx, w, h) => {
        ctx.fillStyle = '#f2c81e'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#1d1d1d';
        for (let i = -1; i < 12; i++) { ctx.beginPath(); ctx.moveTo(i * 24, h); ctx.lineTo(i * 24 + 12, h); ctx.lineTo(i * 24 + 28, 0); ctx.lineTo(i * 24 + 16, 0); ctx.fill(); }
      });
      const tapeMat = new THREE.MeshStandardMaterial({ map: tape, side: THREE.DoubleSide, roughness: 0.6 });
      for (const tilt of [0.9, -0.75, 0.15 + random() * 0.2]) {
        const strip = s.mesh(new THREE.PlaneGeometry(1.55, 0.09), tapeMat, [0, 0.05 + H * (tilt > 0.5 ? 0.5 : tilt < 0 ? 0.55 : 0.38), D / 2 + 0.012]);
        strip.rotation.z = tilt;
        if (Math.abs(tilt) < 0.5) strip.scale.x = 0.75;
      }
    } else if (chained) {
      const tip = new THREE.Vector3(W - 0.06, 1.3, T / 2).applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle).add(hinge.position);
      s.rod([tip.x, tip.y + 0.05, tip.z], [W / 2 + 0.01, 0.05 + 1.3, D / 2], 0.008, s.material('#d8d8d2', { metalness: 0.9, roughness: 0.25 }));
      s.box([0.03, 0.09, 0.03], [W / 2 + 0.02, 0.05 + 1.3, D / 2 + 0.005], brass);
    } else if (a.threshold === 'suitcase') {
      const hide = s.material(mood.warmth > 0.5 ? '#8b5a36' : '#4d5d6b');
      s.box([0.5, 0.36, 0.17], [0.55, 0.19, 0.5], hide).rotation.y = -0.3;
      s.ring(0.06, 0.012, [0.55, 0.39, 0.5], dark, Math.PI).rotation.y = -0.3;
      for (const x of [-0.14, 0.14]) s.box([0.035, 0.37, 0.18], [0.55 + x * Math.cos(0.3), 0.19, 0.5 + x * Math.sin(0.3)], brass).rotation.y = -0.3;
    }

    const sway = mix(0, 0.05, mood.energy);
    return s.finish({
      footprint: 0.85,
      update: (_dt, time) => {
        hinge.rotation.y = -angle - Math.sin(time * mix(0.4, 1.6, mood.energy)) * sway * (chained ? 0.3 : 1);
        drift.forEach((star, index) => { star.position.y += Math.sin(time * 0.8 + index) * 0.0006; star.rotation.y = time * 0.5 + index; });
      },
    });
  },
});
