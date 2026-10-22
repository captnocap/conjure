import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const SEGMENTS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
};
function sevenSegment(c: CanvasRenderingContext2D, digit: string, x: number, y: number, w: number, h: number, on: string, off: string) {
  const t = w * 0.17;
  const half = h / 2;
  const bars: Record<string, [number, number, number, number]> = {
    a: [x + t, y, w - 2 * t, t], b: [x + w - t, y + t * 0.6, t, half - t], c: [x + w - t, y + half + t * 0.4, t, half - t],
    d: [x + t, y + h - t, w - 2 * t, t], e: [x, y + half + t * 0.4, t, half - t], f: [x, y + t * 0.6, t, half - t],
    g: [x + t, y + half - t / 2, w - 2 * t, t],
  };
  for (const [key, bar] of Object.entries(bars)) {
    c.fillStyle = SEGMENTS[digit].includes(key) ? on : off;
    c.fillRect(...bar);
  }
}

const SIGNS = {
  take: 'TAKE A NUMBER',
  wait: 'PLEASE WAIT',
  deli: 'DELI: NUMBERS ONLY',
  rx: 'PHARMACY QUEUE',
  french: 'PRENEZ UN NUMERO',
  none: 'No sign at all; everybody is expected to know.',
} as const;

export default defineThing({
  questions: {
    mount: choice('How is the dispenser mounted?', {
      post: 'On a head-high steel post with a weighted round foot, standing alone on the shop floor.',
      counter: 'On a short stubby pole meant to sit on a counter top beside the till.',
      board: 'Screwed to a freestanding notice-board panel on two feet, with the display above it.',
    }),
    gap: score('How far is the hanging ticket from the number now being served?', [
      'You are next',
      'Three or four ahead of you',
      'A couple of dozen ahead',
      'Hopeless: most of the roll away',
    ]),
    display: choice('What kind of NOW SERVING display is above it?', {
      flip: 'Mechanical flip cards: white numerals on black leaves with a split line, clacking over.',
      led: 'Red seven-segment LED digits glowing in a black box.',
      dots: 'An amber dot-matrix panel, 1990s office.',
      card: 'No machine: a hand-written number on a card hung from two hooks.',
      dead: 'A dark, unpowered display showing nothing; nobody knows who is next.',
    }),
    ticket: choice('What is coming out of the snail right now?', {
      one: 'One neat ticket hanging from the mouth, waiting to be torn off.',
      streamer: 'A long strip of several tickets pulled out by a child, curling toward the floor.',
      empty: 'Nothing: the roll has run out and a note is taped over the mouth.',
    }),
    litter: score('How many torn tickets lie around its foot?', ['None, swept clean', 'One or two', 'A scatter', 'A drift of abandoned numbers']),
    colour: choice('What colour is the snail?', {
      red: 'The classic glossy fire red.',
      blue: 'Institutional blue, a clinic or tax office.',
      green: 'Pharmacy green.',
      cream: 'Sun-yellowed cream plastic that used to be white.',
    }),
    sign: choice('What does the sign beside it say?', SIGNS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const served = 3 + Math.floor(random() * 90);
    const gap = Math.max(1, Math.round(1 + a.gap * a.gap * 68 + random() * a.gap * 9));
    const ticketNumber = (served + gap) % 100;
    const two = (n: number) => String(n).padStart(2, '0');

    const steel = s.material('#c3c8ca', { metalness: 0.85, roughness: 0.3 });
    const dark = s.material('#23272b', { roughness: 0.55 });
    const shellColour = { red: '#cf1f2a', blue: '#2259a8', green: '#1f8a55', cream: '#e3d6a8' }[a.colour];
    const shell = s.material(shellColour, { roughness: 0.3, metalness: 0.05 });
    const ridge = s.material(new THREE.Color(shellColour).multiplyScalar(0.62), { roughness: 0.4 });
    const paperTint = mix(0.0, 0.1, mood.wear);
    const ticketPaper = new THREE.Color('#f29ab4').lerp(new THREE.Color('#d8c7a0'), paperTint * 4);

    // Where the two heads sit depends on the mount.
    const snailY = { post: 1.12, counter: 0.3, board: 0.95 }[a.mount];
    const displayY = { post: 1.64, counter: 0.66, board: 1.5 }[a.mount];
    const front = 0.075;
    if (a.mount === 'post') {
      s.lathe([[0, 0], [0.22, 0], [0.23, 0.02], [0.2, 0.045], [0.05, 0.07], [0.035, 0.12], [0, 0.12]], dark);
      s.cylinder(0.028, 0.028, 1.74, [0, 0.93, 0], steel, 16);
      s.ring(0.03, 0.008, [0, 0.13, 0], steel).rotation.x = Math.PI / 2;
    } else if (a.mount === 'counter') {
      s.box([0.34, 0.025, 0.24], [0, 0.0125, 0], steel);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.012, 0.012, 0.008, [x * 0.14, 0.029, z * 0.09], dark, 8);
      s.cylinder(0.018, 0.018, 0.78, [0, 0.4, 0], steel, 16);
    } else {
      const board = s.material(mix(0.5, 1, mood.cheer) > 0.75 ? '#e9e4d2' : '#cfc9b8', { roughness: 0.85 });
      s.box([0.72, 1.55, 0.035], [0, 1.0, 0], board);
      for (const x of [-0.33, 0.33]) {
        s.box([0.04, 1.8, 0.04], [x, 0.9, -0.03], steel);
        s.box([0.05, 0.03, 0.5], [x, 0.015, 0], dark);
      }
      s.box([0.76, 0.04, 0.05], [0, 1.79, 0], steel);
    }

    const h = new Sculpture(context);
    h.root.position.set(0, snailY, front);
    h.root.scale.setScalar(1.3);
    s.root.add(h.root);
    // The snail: a fat disc with a spiral shell ridge, a hub and a snout the ticket comes out of.
    const disc = h.cylinder(0.155, 0.155, 0.1, [0, 0, 0], shell, 40);
    disc.rotation.x = Math.PI / 2;
    h.ring(0.14, 0.03, [0, 0, 0.035], shell);
    const spiral: [number, number, number][] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const angle = -0.6 + t * Math.PI * 4.2;
      const r = 0.125 * (1 - t * 0.86);
      spiral.push([Math.cos(angle) * r, Math.sin(angle) * r, 0.055 + t * 0.012]);
    }
    h.tube(spiral, 0.013, ridge);
    h.ball([0.026, 0.026, 0.018], [0, 0, 0.07], steel, 14);
    const snout = h.box([0.2, 0.085, 0.085], [0.14, -0.105, 0], shell);
    snout.rotation.z = -0.62;
    const mouth = new THREE.Vector3(0.215, -0.165, 0);
    const lip = h.box([0.012, 0.09, 0.09], [mouth.x + 0.006, mouth.y - 0.004, 0], dark);
    lip.rotation.z = -0.62;
    // Two little eye stalks make it read as a snail from across the room.
    for (const dz of [-0.022, 0.022]) {
      h.rod([0.2, -0.1, dz], [0.265, -0.04, dz * 1.6], 0.007, shell);
      h.ball([0.013, 0.013, 0.013], [0.268, -0.036, dz * 1.6], dark, 10);
    }

    // The ticket, or the lack of one.
    const sway = new THREE.Group();
    sway.position.copy(mouth);
    h.root.add(sway);
    const ticketFace = (n: number) => new THREE.MeshStandardMaterial({
      roughness: 0.9, side: THREE.DoubleSide,
      map: paint(128, 192, (c, w, h) => {
        c.fillStyle = `#${ticketPaper.getHexString()}`;
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#2b2530';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = 'bold 92px monospace';
        c.fillText(two(n), w / 2, h * 0.52);
        c.font = 'bold 15px sans-serif';
        c.fillText('YOUR NUMBER', w / 2, 22);
        c.setLineDash([6, 6]);
        c.strokeStyle = '#2b2530';
        c.beginPath(); c.moveTo(0, 3); c.lineTo(w, 3); c.stroke();
      }),
    });
    if (a.ticket !== 'empty') {
      const count = a.ticket === 'streamer' ? 4 + Math.floor(random() * 3) : 1;
      let hang = sway as THREE.Object3D;
      for (let i = 0; i < count; i++) {
        const link = new THREE.Group();
        link.position.y = i === 0 ? 0 : -0.1;
        link.rotation.x = i === 0 ? 0.08 : (random() - 0.35) * 0.5;
        link.rotation.z = i === 0 ? 0 : (random() - 0.5) * 0.25;
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.1), ticketFace(ticketNumber + i));
        leaf.position.y = -0.05;
        leaf.castShadow = true;
        link.add(leaf);
        hang.add(link);
        hang = link;
      }
    } else {
      const note = h.label('NO TICKETS', 0.2, 0.075, [0.12, -0.15, 0.05], '#a01818', '#f4efd9');
      note.rotation.z = -0.1 + (random() - 0.5) * 0.2;
      for (const x of [-0.09, 0.09]) h.box([0.035, 0.02, 0.002], [0.12 + x, -0.118 - x * 0.1, 0.052], s.material('#d8cfa2', { transparent: true, opacity: 0.8 }));
    }

    // NOW SERVING.
    const lit = a.display === 'led' || a.display === 'dots';
    let glow: THREE.MeshStandardMaterial | null = null;
    if (a.display === 'card') {
      s.box([0.34, 0.02, 0.03], [0, displayY + 0.14, 0.03], steel);
      for (const x of [-0.1, 0.1]) s.rod([x, displayY + 0.14, 0.04], [x, displayY + 0.1, 0.05], 0.004, steel);
      const card = s.mesh(new THREE.PlaneGeometry(0.3, 0.26), new THREE.MeshStandardMaterial({
        roughness: 0.9, side: THREE.DoubleSide,
        map: paint(300, 260, (c, w, h) => {
          c.fillStyle = '#f3eedc';
          c.fillRect(0, 0, w, h);
          c.fillStyle = '#1d2a5c';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.font = 'bold 26px sans-serif';
          c.fillText('NOW SERVING', w / 2, 34);
          c.translate(w / 2, h * 0.6);
          c.rotate((random() - 0.5) * 0.16);
          c.font = 'italic bold 170px serif';
          c.fillText(two(served), 0, 0);
        }),
      }), [0, displayY - 0.03, 0.052]);
      card.rotation.z = (random() - 0.5) * 0.08;
    } else {
      s.box([0.5, 0.3, 0.1], [0, displayY, 0.03], dark);
      s.box([0.52, 0.03, 0.12], [0, displayY + 0.16, 0.03], steel);
      const map = paint(480, 280, (c, w, h) => {
        c.fillStyle = a.display === 'flip' ? '#2f3336' : '#0c0d0f';
        c.fillRect(0, 0, w, h);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = 'bold 34px sans-serif';
        c.fillStyle = a.display === 'flip' ? '#f1ede0' : a.display === 'dead' ? '#55585c' : a.display === 'led' ? '#ff5a4a' : '#ffb640';
        c.fillText('NOW SERVING', w / 2, 36);
        const digits = two(served);
        if (a.display === 'flip') {
          for (let i = 0; i < 2; i++) {
            const x = 70 + i * 180;
            c.fillStyle = '#101214';
            c.fillRect(x, 70, 160, 190);
            c.fillStyle = '#f4f1e6';
            c.font = 'bold 190px sans-serif';
            c.fillText(digits[i], x + 80, 172);
            c.fillStyle = '#2f3336';
            c.fillRect(x, 163, 160, 5);
            c.fillStyle = '#8a8f93';
            c.fillRect(x - 6, 155, 8, 20);
            c.fillRect(x + 158, 155, 8, 20);
          }
        } else if (a.display === 'led' || a.display === 'dead') {
          const on = a.display === 'led' ? '#ff3a2a' : '#1b1c1f';
          for (let i = 0; i < 2; i++) sevenSegment(c, digits[i], 100 + i * 165, 74, 118, 186, on, '#1b1c1f');
        } else {
          // Dot matrix: draw the digits small, then sample them into round amber dots.
          const cols = 30, rows = 13;
          const probe = document.createElement('canvas');
          probe.width = cols;
          probe.height = rows;
          const p = probe.getContext('2d')!;
          p.fillStyle = '#fff';
          p.textAlign = 'center';
          p.textBaseline = 'middle';
          p.font = 'bold 15px monospace';
          p.fillText(digits, cols / 2, rows / 2 + 1);
          const data = p.getImageData(0, 0, cols, rows).data;
          for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            c.fillStyle = data[(y * cols + x) * 4 + 3] > 90 ? '#ffb030' : '#2a2114';
            c.beginPath();
            c.arc(30 + x * 14.5, 78 + y * 14.5, 5.4, 0, Math.PI * 2);
            c.fill();
          }
        }
      });
      const face = new THREE.MeshStandardMaterial({ map, roughness: 0.5 });
      if (lit) {
        face.emissive = new THREE.Color('#ffffff');
        face.emissiveMap = map;
        face.emissiveIntensity = 0.9;
        glow = face;
      }
      s.mesh(new THREE.PlaneGeometry(0.46, 0.268), face, [0, displayY, 0.082]);
    }

    if (a.sign !== 'none') {
      const signY = a.mount === 'counter' ? displayY - 0.2 : snailY + 0.31;
      const plate = s.label(SIGNS[a.sign].replace(': ', ' '), 0.42, 0.085, [0, signY, 0.045], '#ffffff', shellColour === '#e3d6a8' ? '#7a2a22' : shellColour);
      plate.rotation.z = (random() - 0.5) * mood.wear * 0.12;
      s.box([0.44, 0.1, 0.012], [0, signY, 0.036], steel);
    }

    // Abandoned numbers on the floor.
    const fallen = Math.round(a.litter * a.litter * mix(8, 34, mood.density) + (a.litter > 0.2 ? 1 : 0));
    if (fallen > 0) {
      const leaves = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.0015, 0.1), new THREE.MeshStandardMaterial({ color: ticketPaper, roughness: 0.95 }), fallen);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      const reach = a.mount === 'counter' ? 0.26 : 0.42;
      for (let i = 0; i < fallen; i++) {
        const angle = random() * Math.PI * 2;
        const r = 0.1 + Math.sqrt(random()) * reach;
        const curl = random() < 0.3;
        e.set(curl ? (random() - 0.5) * 0.7 : 0, random() * Math.PI, curl ? (random() - 0.5) * 0.6 : 0);
        q.setFromEuler(e);
        m.compose(new THREE.Vector3(Math.cos(angle) * r, 0.003 + i * 0.0006 + (curl ? 0.015 : 0), Math.sin(angle) * r * 0.8 + 0.12), q, new THREE.Vector3(1, 1, random() < 0.25 ? 0.5 : 1));
        leaves.setMatrixAt(i, m);
      }
      leaves.castShadow = leaves.receiveShadow = true;
      s.root.add(leaves);
    }

    s.root.rotation.z = (random() - 0.5) * mood.wear * 0.07;
    const flicker = mood.wear > 0.55 ? mood.wear : 0;
    return s.finish({
      footprint: a.mount === 'counter' ? 0.3 : 0.4,
      update: (_dt, time) => {
        sway.rotation.z = Math.sin(time * mix(0.6, 3.2, mood.energy)) * mix(0.02, 0.22, mood.energy);
        sway.rotation.x = Math.sin(time * mix(0.4, 2.1, mood.energy) + 1) * mix(0.02, 0.16, mood.energy);
        if (glow) glow.emissiveIntensity = 0.9 - (flicker && Math.sin(time * 31) * Math.sin(time * 7.3) > 0.55 ? flicker * 0.7 : 0);
      },
    });
  },
});
