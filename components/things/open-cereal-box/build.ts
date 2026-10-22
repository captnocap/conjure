import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

type G = CanvasRenderingContext2D;
const BOX = { red: '#d92b2b', yellow: '#f5c518', blue: '#1f6fd6', purple: '#7b3fc4', green: '#2fa84f', orange: '#f07f1c', pink: '#ee5fa0' } as const;
const CEREALS = {
  loops: { name: 'LOOPIES', tints: ['#e8433a', '#f5a623', '#f2d21f', '#59b84a', '#3a8fe0', '#9a55d0'], milk: '#f3d9e6' },
  oats: { name: 'OATIE-Os', tints: ['#d9a95c', '#cf9a4a', '#e0b56c'], milk: '#f4ecd8' },
  choc: { name: 'COCO BOMBS', tints: ['#5a321a', '#6b3d20', '#4a2814'], milk: '#c9a27c' },
  stars: { name: 'STAR BITS', tints: ['#f7b6d2', '#a8e0f0', '#fff3a0', '#c8f0b0', '#e0c0f8'], milk: '#eae6f6' },
  flakes: { name: 'SUGAR FLAKES', tints: ['#e9b84a', '#f0c860', '#dba63c'], milk: '#f6efd6' },
} as const;

function circle(g: G, x: number, y: number, r: number, fill: string, squash = 1) {
  g.fillStyle = fill;
  g.beginPath();
  g.ellipse(x, y, r, r * squash, 0, 0, Math.PI * 2);
  g.fill();
}
function eyes(g: G, x: number, y: number, gap: number, r: number) {
  for (const side of [-1, 1]) {
    circle(g, x + side * gap, y, r, '#ffffff', 1.2);
    circle(g, x + side * gap + r * 0.2, y + r * 0.2, r * 0.5, '#1a1a1a');
    circle(g, x + side * gap + r * 0.35, y - r * 0.1, r * 0.18, '#ffffff');
  }
}
function grin(g: G, x: number, y: number, w: number) {
  g.fillStyle = '#7a1420';
  g.beginPath();
  g.moveTo(x - w, y);
  g.quadraticCurveTo(x, y + w * 1.3, x + w, y);
  g.quadraticCurveTo(x, y + w * 0.3, x - w, y);
  g.fill();
  circle(g, x, y + w * 0.62, w * 0.36, '#f0707f', 0.6);
}

export default defineThing({
  questions: {
    mascot: choice('Who is the mascot on the box?', {
      tiger: 'A grinning orange tiger with black stripes.',
      rabbit: 'A manic white rabbit with long ears.',
      frog: 'A wide-mouthed green frog.',
      bear: 'A sleepy brown bear.',
      toucan: 'A bird with an enormous striped beak.',
      robot: 'A square-headed robot with an antenna.',
      wizard: 'A bearded wizard in a starry hat.',
      monster: 'A purple one-eyed monster with horns.',
    }),
    colour: choice('What colour is the box?', {
      red: 'Fire-engine red.', yellow: 'Sunshine yellow.', blue: 'Bright royal blue.', purple: 'Grape purple.',
      green: 'Lime green.', orange: 'Hot orange.', pink: 'Bubblegum pink.',
    }),
    cereal: choice('What cereal is it?', {
      loops: 'Rainbow fruit-flavoured loops.',
      oats: 'Plain toasted oat rings.',
      choc: 'Chocolate puffs that turn the milk brown.',
      stars: 'Pastel marshmallow stars.',
      flakes: 'Frosted golden flakes.',
    }),
    bowl: score('What state is the bowl in?', [
      'Dry: poured, no milk yet',
      'Fresh: crisp and heaped, milk just added',
      'Half eaten',
      'Soggy: swollen, pale and sinking',
      'Only sweet coloured milk left',
    ]),
    dish: choice('What is the bowl like?', {
      plastic: 'A bright plastic child’s bowl.',
      china: 'Plain white china.',
      stripe: 'White with blue bands.',
      tub: 'No bowl: it is being eaten from a plastic tub or mug, whatever was clean.',
    }),
    toppled: noul('Has the box been knocked over, pouring cereal across the table?'),
    spoon: choice('Where is the spoon?', {
      in: 'Standing in the bowl.',
      dropped: 'Dropped on the table in a small puddle of milk.',
      none: 'No spoon; eaten by hand, or not at all.',
    }),
    left: choice('What else has been left out?', {
      none: 'Nothing else.',
      toy: 'The plastic prize from the box, still in its cellophane.',
      milk: 'The milk, left out with its top off.',
      remote: 'A television remote control.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wobble = (amount: number) => (random() - 0.5) * 2 * amount;
    const W = 0.19, H = 0.275, D = 0.065;
    const cereal = CEREALS[a.cereal];
    const base = BOX[a.colour];
    const dark = `#${new THREE.Color(base).multiplyScalar(0.55).getHexString()}`;
    const fade = mood.wear * 0.18;

    const panel = (w: number, h: number, draw: (g: G, w: number, h: number) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const g = canvas.getContext('2d')!;
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      draw(g, w, h);
      if (fade > 0.02) { g.fillStyle = `rgba(225,215,195,${fade})`; g.fillRect(0, 0, w, h); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55 });
    };
    const piece = (g: G, x: number, y: number, r: number, tint: string) => {
      if (a.cereal === 'loops' || a.cereal === 'oats') { g.strokeStyle = tint; g.lineWidth = r * 0.7; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
      else if (a.cereal === 'stars') { g.fillStyle = tint; g.beginPath(); for (let i = 0; i < 10; i++) { const rad = i % 2 ? r * 0.6 : r * 1.4, an = (i / 10) * Math.PI * 2; g.lineTo(x + Math.sin(an) * rad, y - Math.cos(an) * rad); } g.fill(); }
      else circle(g, x, y, r * 1.1, tint, a.cereal === 'flakes' ? 0.6 : 1);
    };
    const front = panel(512, 740, (g, w, h) => {
      // Sunburst.
      g.fillStyle = 'rgba(255,255,255,0.16)';
      for (let i = 0; i < 16; i += 2) { g.beginPath(); g.moveTo(w / 2, h * 0.52); g.arc(w / 2, h * 0.52, 700, (i / 16) * Math.PI * 2, ((i + 1) / 16) * Math.PI * 2); g.fill(); }
      // Brand.
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '900 104px Impact, "Arial Black", sans-serif';
      g.lineJoin = 'round';
      g.save(); g.translate(w / 2, 96); g.rotate(-0.06);
      g.strokeStyle = dark; g.lineWidth = 22; g.strokeText(cereal.name, 0, 0, w - 50);
      g.fillStyle = a.colour === 'yellow' ? '#ffffff' : '#ffe53a'; g.fillText(cereal.name, 0, 0, w - 50);
      g.restore();
      // Mascot.
      const x = w / 2, y = 350;
      if (a.mascot === 'tiger') {
        for (const side of [-1, 1]) { circle(g, x + side * 100, y - 105, 42, '#f08a1c'); circle(g, x + side * 100, y - 105, 22, '#f7c9a0'); }
        circle(g, x, y, 135, '#f59a23'); circle(g, x, y + 50, 78, '#fff3df', 0.75);
        g.fillStyle = '#1c1410';
        for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x + side * 135, y - 50 + i * 42); g.lineTo(x + side * 70, y - 34 + i * 42); g.lineTo(x + side * 132, y - 22 + i * 42); g.fill(); }
        g.beginPath(); g.moveTo(x - 16, y - 132); g.lineTo(x, y - 82); g.lineTo(x + 16, y - 132); g.fill();
        eyes(g, x, y - 30, 48, 26); circle(g, x, y + 22, 18, '#3a1d12', 0.75); grin(g, x, y + 50, 52);
      } else if (a.mascot === 'rabbit') {
        for (const side of [-1, 1]) { g.save(); g.translate(x + side * 55, y - 170); g.rotate(side * 0.2); circle(g, 0, 0, 36, '#ffffff', 3); circle(g, 0, 8, 17, '#f7b4c4', 3.6); g.restore(); }
        circle(g, x, y + 10, 125, '#ffffff'); eyes(g, x, y - 20, 46, 28); circle(g, x, y + 30, 14, '#f0707f', 0.8); grin(g, x, y + 52, 46);
        g.fillStyle = '#fff'; g.fillRect(x - 15, y + 56, 30, 30); g.strokeStyle = '#999'; g.lineWidth = 2; g.strokeRect(x - 15, y + 56, 15, 30); g.strokeRect(x, y + 56, 15, 30);
      } else if (a.mascot === 'frog') {
        for (const side of [-1, 1]) circle(g, x + side * 72, y - 100, 52, '#49b03f');
        circle(g, x, y + 10, 140, '#57c24a', 0.82); eyes(g, x, y - 100, 72, 36);
        g.fillStyle = '#7a1420'; g.beginPath(); g.moveTo(x - 120, y + 10); g.quadraticCurveTo(x, y + 150, x + 120, y + 10); g.quadraticCurveTo(x, y + 44, x - 120, y + 10); g.fill();
        circle(g, x, y + 80, 34, '#f0707f', 0.6);
      } else if (a.mascot === 'bear') {
        for (const side of [-1, 1]) { circle(g, x + side * 100, y - 100, 46, '#8a5a2e'); circle(g, x + side * 100, y - 100, 24, '#d9a877'); }
        circle(g, x, y, 135, '#9a6a38'); circle(g, x, y + 45, 68, '#e6c49a', 0.8);
        g.strokeStyle = '#1a1a1a'; g.lineWidth = 9; for (const side of [-1, 1]) { g.beginPath(); g.arc(x + side * 50, y - 30, 20, 0.15, Math.PI - 0.15); g.stroke(); }
        circle(g, x, y + 20, 20, '#2a1810', 0.75); grin(g, x, y + 50, 38);
      } else if (a.mascot === 'toucan') {
        circle(g, x - 50, y, 115, '#16161c'); circle(g, x - 30, y + 10, 62, '#ffffff', 1.1);
        g.save(); g.translate(x + 20, y + 20);
        const stripes = ['#f5a623', '#e8433a', '#f2d21f', '#1c1c1c'];
        for (let i = 0; i < 4; i++) { g.fillStyle = stripes[i]; g.beginPath(); g.moveTo(i * 50, -52 + i * 9); g.quadraticCurveTo(i * 50 + 30, -62 + i * 12, (i + 1) * 50, -42 + i * 14); g.lineTo((i + 1) * 50, 46 - i * 6 + (i === 3 ? 30 : 0)); g.lineTo(i * 50, 50 - i * 6); g.fill(); }
        g.restore();
        eyes(g, x - 46, y - 40, 0, 28);
      } else if (a.mascot === 'robot') {
        g.fillStyle = '#9aa7b2'; g.fillRect(x - 6, y - 190, 12, 70); circle(g, x, y - 196, 20, '#ff4a3a');
        g.fillStyle = '#c3ccd4'; g.fillRect(x - 130, y - 120, 260, 230);
        g.fillStyle = '#9aa7b2'; g.fillRect(x - 155, y - 40, 25, 70); g.fillRect(x + 130, y - 40, 25, 70);
        circle(g, x - 58, y - 40, 38, '#ffe53a'); circle(g, x + 58, y - 40, 38, '#ffe53a'); circle(g, x - 58, y - 40, 14, '#1a1a1a'); circle(g, x + 58, y - 40, 14, '#1a1a1a');
        g.fillStyle = '#1a1a1a'; g.fillRect(x - 80, y + 40, 160, 38); g.fillStyle = '#7cf08a'; for (let i = 0; i < 6; i++) g.fillRect(x - 72 + i * 26, y + 46, 16, 26);
      } else if (a.mascot === 'wizard') {
        circle(g, x, y + 10, 100, '#f2c9a0'); 
        g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x - 100, y + 30); g.quadraticCurveTo(x, y + 280, x + 100, y + 30); g.quadraticCurveTo(x, y + 80, x - 100, y + 30); g.fill();
        g.fillStyle = '#2b3fb8'; g.beginPath(); g.moveTo(x - 135, y - 55); g.lineTo(x + 20, y - 250); g.lineTo(x + 135, y - 55); g.fill();
        circle(g, x, y - 55, 150, '#2b3fb8', 0.16);
        g.fillStyle = '#ffe53a'; for (const [dx, dy] of [[-40, -100], [30, -150], [50, -90], [0, -190]]) { g.beginPath(); for (let i = 0; i < 10; i++) { const rad = i % 2 ? 7 : 17, an = (i / 10) * Math.PI * 2; g.lineTo(x + dx + Math.sin(an) * rad, y + dy - Math.cos(an) * rad); } g.fill(); }
        eyes(g, x, y - 5, 40, 22); circle(g, x, y + 30, 16, '#e8a090');
      } else {
        g.fillStyle = '#f2e9c9'; for (const side of [-1, 1]) { g.beginPath(); g.moveTo(x + side * 60, y - 100); g.lineTo(x + side * 120, y - 190); g.lineTo(x + side * 105, y - 80); g.fill(); }
        circle(g, x, y, 135, '#8a4fd0'); circle(g, x, y - 35, 58, '#ffffff'); circle(g, x + 8, y - 28, 28, '#1a1a1a'); circle(g, x + 18, y - 38, 9, '#ffffff');
        grin(g, x, y + 45, 70);
        g.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x - 55 + i * 24, y + 50); g.lineTo(x - 43 + i * 24, y + 72); g.lineTo(x - 31 + i * 24, y + 50); g.fill(); }
      }
      // The bowl on the box.
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(w / 2, 620, 190, 46, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(w / 2 - 190, 620); g.quadraticCurveTo(w / 2, 860, w / 2 + 190, 620); g.fill();
      circle(g, w / 2, 618, 172, cereal.milk, 0.22);
      for (let i = 0; i < 26; i++) piece(g, w / 2 + wobble(150), 610 + wobble(26), 13, cereal.tints[i % cereal.tints.length]);
      // Flash.
      g.save(); g.translate(410, 215); g.rotate(0.25);
      g.fillStyle = '#ffffff'; g.beginPath(); for (let i = 0; i < 24; i++) { const rad = i % 2 ? 50 : 70, an = (i / 24) * Math.PI * 2; g.lineTo(Math.sin(an) * rad, Math.cos(an) * rad); } g.fill();
      g.fillStyle = '#d92b2b'; g.font = '900 24px Impact, sans-serif'; g.fillText('FREE', 0, -18); g.fillText('TOY', 0, 6); g.fillText('INSIDE!', 0, 30);
      g.restore();
    });
    const side = panel(128, 740, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(14, 150, w - 28, 430);
      g.fillStyle = '#1a1a1a'; g.fillRect(20, 160, w - 40, 14);
      for (let i = 0; i < 26; i++) g.fillRect(20, 190 + i * 14, (w - 40) * (0.5 + ((i * 7) % 5) / 10), 4);
      g.save(); g.translate(w / 2, 80); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillStyle = '#ffe53a'; g.font = '900 44px Impact, sans-serif'; g.fillText(cereal.name, 0, 12, 140); g.restore();
      for (let i = 0; i < 20; i++) g.fillRect(24 + i * 4, 640, i % 3 ? 2 : 3, 54);
    });
    const back = panel(512, 740, (g, w) => {
      g.fillStyle = '#ffffff'; g.fillRect(40, 150, w - 80, 500);
      g.textAlign = 'center'; g.fillStyle = '#ffe53a'; g.font = '900 60px Impact, sans-serif'; g.fillText('FUN MAZE!', w / 2, 100);
      g.strokeStyle = dark; g.lineWidth = 7;
      for (let i = 0; i < 60; i++) { const x = 60 + Math.floor(random() * 10) * 40, y = 170 + Math.floor(random() * 11) * 42; g.beginPath(); g.moveTo(x, y); if (random() > 0.5) g.lineTo(x + 40, y); else g.lineTo(x, y + 42); g.stroke(); }
    });
    const card = new THREE.MeshStandardMaterial({ color: '#b9a98a', roughness: 0.95, side: THREE.DoubleSide });
    const flapSkin = new THREE.MeshStandardMaterial({ color: new THREE.Color(base).lerp(new THREE.Color('#e1d7c3'), fade), roughness: 0.6, side: THREE.DoubleSide });

    const box = new Sculpture(context);
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [side, side, card, flapSkin, front, back]);
    body.position.y = H / 2;
    body.castShadow = body.receiveShadow = true;
    box.root.add(body);
    // Flaps: two short ones folded out, the back long flap up, the front one torn ragged.
    const flap = (w: number, d: number, at: [number, number, number], rx: number, rz: number, torn: boolean) => {
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2, 0);
      shape.lineTo(w / 2, 0);
      if (torn) { const steps = 9; for (let i = 0; i <= steps; i++) shape.lineTo(w / 2 - (w * i) / steps, d * (0.35 + random() * 0.6) * (i > 5 ? 0.5 : 1)); }
      else { shape.lineTo(w / 2 - 0.004, d); shape.lineTo(-w / 2 + 0.004, d); }
      shape.closePath();
      const hinge = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), flapSkin);
      mesh.castShadow = mesh.receiveShadow = true;
      hinge.add(mesh);
      hinge.position.set(...at);
      hinge.rotation.set(rx, 0, rz, 'ZXY');
      box.root.add(hinge);
      return hinge;
    };
    flap(W, D * 0.95, [0, H, D / 2], 0.35 + random() * 0.3, 0, true);
    flap(W, D * 0.95, [0, H, -D / 2], -0.2 - random() * 0.25, 0, false);
    for (const sx of [-1, 1]) {
      const hinge = flap(D, D * 0.55, [sx * W / 2, H, 0], 0, 0, false);
      hinge.rotation.set(0, sx * Math.PI / 2, 0);
      hinge.rotateX(0.5 + random() * 0.5);
    }
    // The inner bag, crumpled open.
    const bagGeometry = new THREE.IcosahedronGeometry(1, 2);
    const bagPosition = bagGeometry.getAttribute('position');
    for (let i = 0; i < bagPosition.count; i++) bagPosition.setXYZ(i, bagPosition.getX(i) * (1 + wobble(0.16)), Math.abs(bagPosition.getY(i)) * (1 + wobble(0.5)), bagPosition.getZ(i) * (1 + wobble(0.16)));
    bagGeometry.computeVertexNormals();
    const bag = box.mesh(bagGeometry, new THREE.MeshStandardMaterial({ color: '#f4f6f6', roughness: 0.25, flatShading: true, transparent: true, opacity: 0.86 }), [0, H - 0.004, 0]);
    bag.scale.set(W * 0.44, 0.045, D * 0.42);

    // Pieces.
    const kindGeometry = () => {
      if (a.cereal === 'loops' || a.cereal === 'oats') return new THREE.TorusGeometry(0.0062, 0.003, 6, 14).rotateX(Math.PI / 2);
      if (a.cereal === 'choc') return new THREE.IcosahedronGeometry(0.0075, 1);
      if (a.cereal === 'flakes') return new THREE.CylinderGeometry(0.0095, 0.008, 0.0022, 7).translate(0, 0.001, 0);
      const star = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const rad = i % 2 ? 0.0048 : 0.0105, an = (i / 10) * Math.PI * 2; if (i) star.lineTo(Math.sin(an) * rad, Math.cos(an) * rad); else star.moveTo(Math.sin(an) * rad, Math.cos(an) * rad); }
      return new THREE.ExtrudeGeometry(star, { depth: 0.005, bevelEnabled: false }).rotateX(-Math.PI / 2);
    };
    interface Bit { at: [number, number, number]; size: number; tilt: number; pale: number }
    const strew = (bits: Bit[]) => {
      if (!bits.length) return;
      const mesh = new THREE.InstancedMesh(kindGeometry(), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: a.cereal === 'choc' ? 0.8 : 0.5 }), bits.length);
      const dummy = new THREE.Object3D(), milk = new THREE.Color(cereal.milk);
      bits.forEach((bit, i) => {
        dummy.position.set(...bit.at);
        dummy.rotation.set(wobble(bit.tilt), random() * 6, wobble(bit.tilt));
        dummy.scale.setScalar(bit.size);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, new THREE.Color(cereal.tints[Math.floor(random() * cereal.tints.length)]).lerp(milk, bit.pale));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    };
    const loose: Bit[] = [];

    if (a.toppled) {
      const lay = new THREE.Group();
      lay.add(box.root);
      lay.rotation.y = 0.5 + wobble(0.2);
      lay.position.set(-0.05, 0, -0.09);
      // Rotate so the front faces up and the open top points along +x.
      box.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)));
      box.root.position.set(-H / 2 - 0.02, D / 2, -0.05);
      s.root.add(lay);
      const mouth = new THREE.Vector3(H / 2 - 0.02, 0, -0.05).applyAxisAngle(new THREE.Vector3(0, 1, 0), lay.rotation.y).add(lay.position);
      const amount = Math.round(mix(50, 150, mood.density));
      for (let i = 0; i < amount; i++) {
        const far = random() ** 1.6 * 0.17, spread = wobble(0.045 + far * 0.55);
        const dir = lay.rotation.y;
        const heap = Math.max(0, 0.022 - far * 0.22) * random();
        loose.push({ at: [mouth.x + Math.cos(dir) * far - Math.sin(dir) * spread * -1, 0.003 + heap, mouth.z - Math.sin(dir) * far + Math.cos(dir) * spread], size: 1, tilt: heap > 0.004 ? 1.2 : 0.2, pale: 0 });
      }
    } else {
      box.root.position.set(-0.06, 0, -0.07);
      box.root.rotation.y = 0.28 + wobble(0.12);
      s.root.add(box.root);
    }

    // Bowl.
    const bx = 0.085, bz = 0.075;
    const plasticTint = ['#3aa0e0', '#f2c230', '#58c060', '#f06a8a'][Math.floor(random() * 4)];
    const tub = a.dish === 'tub';
    const R = tub ? 0.055 : 0.078, BH = tub ? 0.07 : 0.055, foot = tub ? 0.045 : 0.034;
    const dishSkin = s.material(a.dish === 'plastic' ? plasticTint : tub ? '#e9ecea' : '#f6f4ee', { roughness: a.dish === 'plastic' || tub ? 0.45 : 0.25, side: THREE.DoubleSide });
    const wallAt = (y: number) => (tub ? mix(foot, R, y / BH) : foot + (R - foot) * Math.sin(Math.min(1, y / BH) * Math.PI / 2) ** 0.8);
    const bowlProfile: [number, number][] = [[0, 0.004], [foot * 0.9, 0.004], [foot, 0]];
    for (let i = 1; i <= 10; i++) bowlProfile.push([wallAt((i / 10) * BH), (i / 10) * BH]);
    bowlProfile.push([R - 0.004, BH]);
    for (let i = 9; i >= 1; i--) bowlProfile.push([wallAt((i / 10) * BH) - 0.004, (i / 10) * BH + 0.002]);
    bowlProfile.push([0, 0.007]);
    s.lathe(bowlProfile, dishSkin, [bx, 0, bz]);
    if (a.dish === 'stripe') for (const y of [BH * 0.55, BH * 0.78]) s.ring(wallAt(y) + 0.0005, 0.0022, [bx, y, bz], s.material('#2f61b5', { roughness: 0.3 })).rotation.x = Math.PI / 2;
    if (tub) s.ring(R, 0.003, [bx, BH, bz], dishSkin).rotation.x = Math.PI / 2;
    const wet = a.bowl > 0.12;
    const eaten = clamp01((a.bowl - 0.25) / 0.75);
    const soggy = clamp01((a.bowl - 0.4) / 0.45);
    const level = BH * (wet ? mix(0.72, 0.4, eaten) : 0.3);
    if (wet) {
      const tinted = new THREE.Color('#fbfaf4').lerp(new THREE.Color(cereal.milk), 0.25 + soggy * 0.75);
      s.cylinder(wallAt(level) - 0.0045, wallAt(level) - 0.0045, 0.002, [bx, level, bz], new THREE.MeshStandardMaterial({ color: tinted, roughness: 0.2 }), 32);
    }
    const afloat = a.bowl > 0.93 ? Math.round(random() * 3) : Math.round(mix(90, 14, eaten));
    for (let i = 0; i < afloat; i++) {
      const angle = random() * Math.PI * 2, rad = Math.sqrt(random()) * (wallAt(level) - 0.012);
      const heap = wet ? (1 - soggy) * (1 - eaten) * 0.022 * (1 - rad / R) * random() : 0.03 * (1 - rad / R) * random();
      loose.push({ at: [bx + Math.sin(angle) * rad, level + 0.002 + heap - soggy * 0.002, bz + Math.cos(angle) * rad], size: 1 + soggy * 0.3, tilt: heap > 0.003 ? 1.3 : 0.25 - soggy * 0.1, pale: soggy * 0.55 });
    }
    // Stray pieces on the table.
    const stray = Math.round(mix(4, 26, mood.density));
    for (let i = 0; i < stray; i++) loose.push({ at: [bx - 0.05 + wobble(0.13), 0.003, bz + wobble(0.09) + 0.04], size: 1, tilt: 0.15, pale: 0 });
    strew(loose);

    // Spoon.
    const steel = s.material('#d9dcdc', { metalness: 0.9, roughness: 0.22 });
    if (a.spoon !== 'none') {
      const spoon = new Sculpture(context);
      spoon.ball([0.017, 0.005, 0.024], [0, 0, 0], steel, 14);
      spoon.rod([0, 0.001, 0.02], [0, 0.004, 0.14], 0.0035, steel, 0.0028);
      spoon.ball([0.008, 0.003, 0.014], [0, 0.004, 0.142], steel, 10);
      if (a.spoon === 'in') {
        spoon.root.position.set(bx - 0.012, level + 0.004, bz + 0.008);
        spoon.root.rotation.set(-0.62, 1.1 + wobble(0.5), 0, 'YXZ');
      } else {
        spoon.root.position.set(bx + 0.05, 0.005, bz + 0.115);
        spoon.root.rotation.y = 1.2 + wobble(0.5);
        s.ball([0.03, 0.001, 0.022], [bx + 0.045, 0.0006, bz + 0.112], new THREE.MeshStandardMaterial({ color: cereal.milk, roughness: 0.15 }), 16);
      }
      s.root.add(spoon.root);
    }

    // Left out.
    const lx = -0.11, lz = 0.11;
    if (a.left === 'toy') {
      const toyTint = ['#39c26a', '#f04a8a', '#3a8fe0', '#f5a623'][Math.floor(random() * 4)];
      const toy = new Sculpture(context);
      const plastic = toy.material(toyTint, { roughness: 0.35 });
      // A little dinosaur.
      toy.ball([0.02, 0.014, 0.011], [0, 0.022, 0], plastic, 12);
      toy.rod([0.014, 0.026, 0], [0.03, 0.044, 0], 0.006, plastic, 0.005);
      toy.ball([0.01, 0.007, 0.007], [0.036, 0.047, 0], plastic, 10);
      toy.rod([-0.016, 0.022, 0], [-0.045, 0.01, 0], 0.007, plastic, 0.0015);
      for (const [x, z] of [[0.01, 0.007], [0.01, -0.007], [-0.01, 0.007], [-0.01, -0.007]]) toy.rod([x, 0.016, z], [x, 0, z], 0.004, plastic);
      toy.root.position.set(lx, 0.002, lz);
      toy.root.rotation.set(Math.PI / 2 - 0.1, 0, 0.6);
      toy.root.position.y = 0.013;
      s.root.add(toy.root);
      const wrap = s.box([0.1, 0.002, 0.07], [lx + 0.005, 0.001, lz + 0.012], new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, roughness: 0.05 }));
      wrap.rotation.y = 0.6;
      wrap.castShadow = false;
    } else if (a.left === 'milk') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#eef5f3', transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide });
      s.lathe([[0, 0.002], [0.034, 0.002], [0.036, 0.008], [0.036, 0.11], [0.02, 0.15], [0.02, 0.185], [0.023, 0.19]], glass, [lx - 0.02, 0, lz - 0.01]);
      const fillTop = mix(0.03, 0.105, random());
      s.cylinder(0.0335, 0.0335, fillTop, [lx - 0.02, 0.004 + fillTop / 2, lz - 0.01], s.material('#fbfaf4', { roughness: 0.3 }), 24);
      s.cylinder(0.024, 0.024, 0.003, [lx + 0.045, 0.0015, lz + 0.03], s.material(mood.cheer > 0.5 ? '#d9b84a' : '#c9ccce', { metalness: 0.8, roughness: 0.3 }), 16);
    } else if (a.left === 'remote') {
      const remote = new Sculpture(context);
      remote.box([0.05, 0.016, 0.16], [0, 0.008, 0], remote.material('#2a2b2f', { roughness: 0.5 }));
      remote.cylinder(0.006, 0.006, 0.002, [0.013, 0.017, -0.062], remote.material('#e0352b'), 10);
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) remote.box([0.009, 0.002, 0.009], [(c - 1) * 0.014, 0.017, -0.035 + r * 0.02], remote.material('#9a9da2'));
      remote.root.position.set(lx, 0, lz);
      remote.root.rotation.y = -0.5 + wobble(0.4);
      s.root.add(remote.root);
    }

    return s.finish();
  },
});
