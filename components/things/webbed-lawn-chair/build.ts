import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P = readonly [number, number, number];

const WEBS = {
  'green-white': 'Kelly green and white, the hardware-store classic.',
  'harvest': 'Brown, orange and gold, straight out of 1974.',
  'blue-white': 'Pool blue and white, lakeside and clean.',
  'patriotic': 'Red, white and blue for the Fourth of July.',
  'rainbow': 'Mismatched re-webbing in every colour the store had left.',
  'pink-turquoise': 'Flamingo pink and turquoise, Florida retirement.',
} as const;
const WEB_COLOURS: Record<keyof typeof WEBS, string[]> = {
  'green-white': ['#2f8a4b', '#f1eedd'],
  harvest: ['#7a4a26', '#d9812a', '#e2b93b'],
  'blue-white': ['#2f7fc4', '#f1eedd'],
  patriotic: ['#c2342f', '#f1eedd', '#2c4f9e'],
  rainbow: ['#c2342f', '#e2b93b', '#2f8a4b', '#2f7fc4', '#8a4fa8', '#d9812a'],
  'pink-turquoise': ['#e8679a', '#35b5ac'],
};

export default defineThing({
  questions: {
    webbing: choice('What colours is the webbing?', WEBS),
    state: choice('What is the chair doing right now?', {
      waiting: 'Set out square and empty, waiting for the evening.',
      'just-left': 'Someone just got up: the seat still sags, their things are where they left them.',
      tipped: 'Blown over on its side by the wind, the can spilled.',
      broken: 'One seat strap has snapped and hangs down; nobody has fixed it.',
    }),
    build: choice('What kind of lawn chair is it?', {
      upright: 'The standard upright folding chair with flat plastic arms.',
      low: 'A low-slung beach chair that sits close to the ground.',
      highback: 'A tall high-backed chair for an old man who sits all day.',
    }),
    beside: choice('What sits beside it?', {
      'can-and-ashtray': 'A cinder block side table with a can and a full ashtray.',
      cooler: 'A red picnic cooler with a white lid, a can on top.',
      radio: 'A transistor radio with its antenna pulled out, tuned to the ball game.',
      empties: 'A drift of crushed empty cans on the ground.',
      nothing: 'Nothing at all, just the chair.',
    }),
    drink: choice('If there is a can, what is in it?', {
      beer: 'Cheap domestic beer in a silver and blue can.',
      cola: 'A red cola can.',
      'lemon-lime': 'A green lemon-lime soda.',
      generic: 'A plain white generic can that just says BEER.',
    }),
    left: choice('What was left on or over the chair?', {
      nothing: 'Nothing.',
      towel: 'A striped beach towel draped over the back.',
      newspaper: 'A folded newspaper on the seat.',
      hat: 'A straw hat on the seat.',
      swatter: 'A fly swatter leaning against the arm.',
    }),
    company: noul('Is a second chair pulled up next to it, angled for conversation?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const colours = WEB_COLOURS[a.webbing];
    const fade = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#d9d2c0'), mood.wear * mood.wear * 0.4).getStyle();
    const alu = s.material('#c9ced0', { metalness: 0.85, roughness: mix(0.25, 0.6, mood.wear) });
    const plastic = s.material('#ece7d6', { roughness: 0.5 });
    const canTint = { beer: '#c8ccd2', cola: '#c4302b', 'lemon-lime': '#3f9a4a', generic: '#f0efe8' }[a.drink];
    const canBand = { beer: '#2c4f9e', cola: '#f4f1e6', 'lemon-lime': '#e8d94a', generic: '#222222' }[a.drink];
    const swingers: { node: THREE.Object3D; phase: number }[] = [];

    const weave = (across: number, along: number, missing: number, offset: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const c = canvas.getContext('2d')!;
      const strap = (horizontal: boolean, index: number, count: number, colour: string) => {
        const pitch = 256 / count, width = pitch * 0.88, start = index * pitch + (pitch - width) / 2;
        c.fillStyle = fade(colour);
        if (horizontal) c.fillRect(0, start, 256, width); else c.fillRect(start, 0, width, 256);
        c.strokeStyle = 'rgba(0,0,0,0.22)';
        c.lineWidth = 1;
        for (let rib = 1; rib < 5; rib++) {
          c.beginPath();
          const at = start + width * rib / 5;
          if (horizontal) { c.moveTo(0, at); c.lineTo(256, at); } else { c.moveTo(at, 0); c.lineTo(at, 256); }
          c.stroke();
        }
      };
      for (let i = 0; i < along; i++) strap(false, i, along, colours[(i + offset) % colours.length]);
      for (let j = 0; j < across; j++) {
        if (j === missing) continue;
        strap(true, j, across, colours[(j + offset + 1) % colours.length]);
        // Weave: let every other crossing show the lengthwise strap on top.
        for (let i = (j % 2); i < along; i += 2) {
          const px = 256 / along, py = 256 / across;
          c.save();
          c.beginPath();
          c.rect(i * px, j * py, px, py);
          c.clip();
          strap(false, i, along, colours[(i + offset) % colours.length]);
          c.restore();
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 });
    };

    const can = (to: Sculpture, at: P, lying = false, crushed = false) => {
      const group = new THREE.Group();
      const h = crushed ? 0.06 : 0.122;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, h, 14), s.material(canTint, { metalness: 0.6, roughness: 0.35 }));
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0335, 0.0335, h * 0.4, 14), s.material(canBand, { roughness: 0.5 }));
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.033, 0.008, 14), alu);
      top.position.y = h / 2 + 0.003;
      body.castShadow = band.castShadow = true;
      group.add(body, band, top);
      group.position.set(at[0], at[1] + (lying ? 0.033 : h / 2), at[2]);
      if (lying) { group.rotation.z = Math.PI / 2; group.rotation.y = random() * Math.PI; }
      to.root.add(group);
    };

    const chair = (seed: number, primary: boolean) => {
      const c = new Sculpture(context);
      const W = 0.27;
      const seatY = { upright: 0.4, low: 0.22, highback: 0.42 }[a.build];
      const backTop = { upright: 0.88, low: 0.72, highback: 1.12 }[a.build];
      const armY = seatY + 0.2;
      const front = 0.26, rear = -0.2, lean = a.build === 'low' ? 0.26 : 0.16;
      const pipe = (points: P[], r = 0.014) => {
        for (let i = 0; i + 1 < points.length; i++) c.rod(points[i], points[i + 1], r, alu);
        for (const point of points.slice(1, -1)) c.ball([r, r, r], point, alu, 8);
      };
      pipe([[-W, seatY, rear], [-W, seatY + 0.01, front], [W, seatY + 0.01, front], [W, seatY, rear]]);
      pipe([[-W, seatY, rear], [-W, backTop, rear - lean], [W, backTop, rear - lean], [W, seatY, rear]]);
      const X = W + 0.024;
      // Two crossed U-shaped legs, each running along the ground from side to side.
      pipe([[-X, armY, rear - 0.02], [-X, 0.012, front + 0.05], [X, 0.012, front + 0.05], [X, armY, rear - 0.02]]);
      pipe([[-X, armY, front - 0.04], [-X, 0.012, rear - 0.14], [X, 0.012, rear - 0.14], [X, armY, front - 0.04]]);
      for (const x of [-X, X]) {
        const arm = c.box([0.05, 0.02, front - rear + 0.1], [x, armY + 0.012, (front + rear) / 2 - 0.03], plastic);
        arm.geometry.translate(0, 0, 0);
        c.rod([x, armY, rear - 0.06], [x * 0.96, seatY + (backTop - seatY) * 0.45, rear - lean * 0.45], 0.008, alu);
      }

      const brokenIndex = primary && a.state === 'broken' ? 1 + Math.floor(random() * 3) : -1;
      const sag = (primary && a.state === 'just-left' ? 0.05 : 0.02) + mood.wear * 0.02;
      const seatDepth = front - rear;
      const seatGeometry = new THREE.PlaneGeometry(W * 2, seatDepth, 8, 8);
      const position = seatGeometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const u = position.getX(i) / W, v = position.getY(i) / (seatDepth / 2);
        position.setZ(i, -sag * Math.cos(u * Math.PI / 2) * Math.cos(v * Math.PI / 2));
      }
      seatGeometry.computeVertexNormals();
      const seat = c.mesh(seatGeometry, weave(6, 6, brokenIndex, seed), [0, seatY + 0.012, (front + rear) / 2]);
      seat.rotation.x = -Math.PI / 2;
      const backLength = Math.hypot(backTop - seatY, lean);
      const rows = Math.round(backLength / 0.09);
      const back = c.mesh(new THREE.PlaneGeometry(W * 2, backLength - 0.04), weave(rows, 6, mood.wear > 0.8 ? rows - 2 : -1, seed + 1), [0, (seatY + backTop) / 2, rear - lean / 2 + 0.012]);
      back.rotation.x = -Math.atan2(lean, backTop - seatY);

      if (brokenIndex >= 0) {
        // The snapped strap: one half dangles from each rail.
        const z = rear + seatDepth * (1 - (brokenIndex + 0.5) / 6);
        const strapColour = s.material(fade(colours[(brokenIndex + seed + 1) % colours.length]), { side: THREE.DoubleSide });
        for (const side of [-1, 1]) {
          const pivot = new THREE.Group();
          pivot.position.set(side * W, seatY, z);
          const length = side < 0 ? 0.3 : 0.16;
          const strap = new THREE.Mesh(new THREE.BoxGeometry(0.004, length, 0.058), strapColour);
          strap.position.y = -length / 2;
          strap.castShadow = true;
          pivot.add(strap);
          pivot.rotation.z = side * -0.12;
          c.root.add(pivot);
          swingers.push({ node: pivot, phase: random() * 6 });
        }
      }

      if (primary && a.left === 'towel') {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const g = canvas.getContext('2d')!;
        const stripes = mood.cheer > 0.5 ? ['#f2c230', '#e8572f', '#f4f1e6', '#2aa6b8'] : ['#6f7f8f', '#d8d4c6', '#40506a', '#d8d4c6'];
        for (let i = 0; i < 8; i++) { g.fillStyle = stripes[i % stripes.length]; g.fillRect(i * 8, 0, 8, 64); }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const cloth = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 });
        const tilt = -Math.atan2(lean, backTop - seatY);
        const frontFlap = c.box([W * 1.5, 0.34, 0.012], [0.03, backTop - 0.16, rear - lean + 0.07], cloth);
        frontFlap.rotation.x = tilt;
        const rearFlap = c.box([W * 1.5, 0.5, 0.012], [0.03, backTop - 0.25, rear - lean - 0.03], cloth);
        rearFlap.rotation.x = 0.04;
        c.box([W * 1.5, 0.02, 0.05], [0.03, backTop + 0.012, rear - lean], cloth);
      }
      if (primary && a.left === 'newspaper') {
        const paper = c.label('DAILY NEWS', 0.3, 0.22, [0.02, seatY + 0.03 - sag * 0.6, 0.04], '#33312c', '#e6e0cc');
        paper.rotation.x = -Math.PI / 2;
        paper.rotation.z = (random() - 0.5) * 0.8;
        c.box([0.3, 0.012, 0.22], [0.02, seatY + 0.022 - sag * 0.6, 0.04], c.material('#ddd6c0')).rotation.y = paper.rotation.z;
      }
      if (primary && a.left === 'hat') {
        const straw = c.material('#d9bd7a', { roughness: 0.9, side: THREE.DoubleSide });
        c.lathe([[0, 0.1], [0.07, 0.095], [0.09, 0.06], [0.095, 0.012], [0.2, 0], [0.205, 0.008]], straw, [0, seatY + 0.02 - sag * 0.5, 0.03]);
        c.cylinder(0.097, 0.097, 0.025, [0, seatY + 0.045 - sag * 0.5, 0.03], c.material(mood.cheer > 0.5 ? '#b23a48' : '#3a3530'), 20);
      }
      if (primary && a.left === 'swatter') {
        c.rod([X + 0.03, 0.01, front + 0.12], [X + 0.012, armY + 0.12, front - 0.02], 0.004, c.material('#8d9396', { metalness: 0.6 }));
        const head = c.box([0.004, 0.12, 0.1], [X + 0.01, armY + 0.18, front - 0.03], c.material(mood.cheer > 0.5 ? '#e8572f' : '#3f7a5a'));
        head.rotation.x = -0.25;
      }
      return c.root;
    };

    const main = chair(0, true);
    const tipped = a.state === 'tipped';
    if (tipped) {
      // On its side, resting on one arm and the edge of the back.
      main.rotation.z = Math.PI / 2 - 0.08;
      main.rotation.y = 0.5 + random() * 0.6;
      main.position.y = 0.3;
    } else main.rotation.y = (random() - 0.5) * 0.3;
    s.root.add(main);
    if (a.company) {
      const friend = chair(1 + Math.floor(random() * 3), false);
      friend.position.set(-0.95, 0, -0.1);
      friend.rotation.y = 0.5 + random() * 0.3;
      s.root.add(friend);
    }

    const side = 0.62;
    const litter = Math.round(mix(0, 5, mood.density));
    if (a.beside === 'can-and-ashtray') {
      const block = s.material('#9a9a94', { roughness: 0.95 });
      s.box([0.4, 0.19, 0.2], [side, 0.095, 0.05], block);
      for (const x of [-0.09, 0.09]) s.box([0.13, 0.192, 0.13], [side + x, 0.096, 0.05], s.material('#5d5d59', { roughness: 1 }));
      if (tipped) can(s, [side + 0.1, 0, 0.32], true); else can(s, [side - 0.1, 0.19, 0.05]);
      const glass = s.material('#b8762a', { roughness: 0.2, metalness: 0.1 });
      s.lathe([[0, 0.006], [0.06, 0.006], [0.07, 0.03], [0.062, 0.03], [0.052, 0.012], [0, 0.012]], glass, [side + 0.09, 0.19, 0.05]);
      const butts = 2 + Math.round(mood.density * 6 + mood.wear * 3);
      for (let i = 0; i < butts; i++) {
        const angle = random() * Math.PI * 2, reach = random() * 0.04;
        const from: P = [side + 0.09 + Math.cos(angle) * reach, 0.21 + random() * 0.012, 0.05 + Math.sin(angle) * reach];
        s.rod(from, [from[0] + (random() - 0.5) * 0.05, from[1] + random() * 0.012, from[2] + (random() - 0.5) * 0.05], 0.004, s.material(i % 3 ? '#e9e3d2' : '#c98a3c'));
      }
      if (a.state === 'just-left') {
        // One still burning, balanced on the rim.
        s.rod([side + 0.15, 0.222, 0.05], [side + 0.2, 0.232, 0.07], 0.004, s.material('#f1ede0'));
        s.ball([0.005, 0.005, 0.005], [side + 0.202, 0.2325, 0.071], new THREE.MeshStandardMaterial({ color: '#ff5a1e', emissive: '#ff4a10', emissiveIntensity: 2 }), 8);
      }
    } else if (a.beside === 'cooler') {
      const red = s.material(mood.cheer > 0.4 ? '#c8352f' : '#3d6a8a', { roughness: 0.45 });
      s.box([0.5, 0.3, 0.32], [side + 0.05, 0.15, 0.02], red);
      const lid = s.box([0.52, 0.06, 0.34], [side + 0.05, 0.33, 0.02], s.material('#f1eee2', { roughness: 0.4 }));
      if (a.state === 'just-left') { lid.rotation.z = 0.5; lid.position.set(side + 0.3, 0.42, 0.02); s.box([0.44, 0.02, 0.26], [side + 0.05, 0.29, 0.02], s.material('#dff2fa', { roughness: 0.15 })); }
      s.tube([[side - 0.2, 0.25, 0.02], [side - 0.2, 0.44, 0.02], [side + 0.3, 0.44, 0.02], [side + 0.3, 0.25, 0.02]], 0.008, s.material('#e9e6da')).visible = a.state !== 'just-left';
      if (tipped) can(s, [side - 0.1, 0, 0.36], true); else can(s, [side - 0.08, a.state === 'just-left' ? 0.3 : 0.36, 0.05]);
    } else if (a.beside === 'radio') {
      s.box([0.26, 0.16, 0.08], [side, 0.08, 0.05], s.material('#2c2c2e', { roughness: 0.5 }));
      s.box([0.25, 0.05, 0.085], [side, 0.135, 0.05], s.material('#c9ced0', { metalness: 0.8, roughness: 0.3 }));
      s.cylinder(0.05, 0.05, 0.006, [side - 0.055, 0.065, 0.092], s.material('#55585c', { metalness: 0.5 }), 20).rotation.x = Math.PI / 2;
      s.label('AM 1080', 0.1, 0.035, [side + 0.06, 0.135, 0.094], '#b3261e', '#efe9d2');
      s.rod([side + 0.11, 0.16, 0.03], [side + 0.3, 0.62, 0.0], 0.003, alu);
      s.tube([[side - 0.11, 0.16, 0.05], [side - 0.05, 0.23, 0.05], [side + 0.05, 0.23, 0.05], [side + 0.11, 0.16, 0.05]], 0.006, alu);
    } else if (a.beside === 'empties') {
      for (let i = 0; i < 5 + litter * 2; i++) can(s, [side - 0.1 + random() * 0.4, 0, -0.2 + random() * 0.5], true, random() < 0.5);
    }
    if (a.beside !== 'empties') for (let i = 0; i < litter - 1; i++) can(s, [(random() - 0.3) * 1.0, 0, 0.42 + random() * 0.2], true, true);

    const sway = mix(0.03, 0.3, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const { node, phase } of swingers) node.rotation.x = Math.sin(time * 1.7 + phase) * sway;
      },
    });
  },
});
