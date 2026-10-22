import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const COLOURS = {
  rust: 'Burnt rust orange, the colour of the decade.',
  avocado: 'Avocado green, slightly sickly, completely sincere.',
  'harvest-gold': 'Harvest gold, a mustard yellow that matched the kitchen.',
  chocolate: 'Deep chocolate brown that hides every stain.',
  burgundy: 'Dark burgundy wine, a little formal, a little lodge-hall.',
  'powder-blue': 'Powder blue, grandmotherly and pale.',
} as const;
const TINT: Record<keyof typeof COLOURS, string> = {
  rust: '#b4532a', avocado: '#7d8438', 'harvest-gold': '#c9952c', chocolate: '#5b3a26', burgundy: '#74242e', 'powder-blue': '#8aa6bd',
};

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A cloth hanging over a horizontal roll that runs along z: up one side, over the top, down the other. */
function drape(radius: number, width: number, dropA: number, dropB: number, ripple: number) {
  const total = dropA + Math.PI * radius + dropB;
  const geometry = new THREE.PlaneGeometry(width, total, 10, 36);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const along = position.getX(i);
    const t = position.getY(i) + total / 2;
    let x: number, y: number;
    if (t < dropA) { x = -radius; y = t - dropA; }
    else if (t < dropA + Math.PI * radius) { const angle = Math.PI - (t - dropA) / radius; x = Math.cos(angle) * radius; y = Math.sin(angle) * radius; }
    else { x = radius; y = -(t - dropA - Math.PI * radius); }
    const hang = y < 0 ? Math.min(1, -y / 0.08) : 0;
    x += Math.sin(along * 34 + t * 9) * ripple * hang * Math.sign(x);
    position.setXYZ(i, x, y, along);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    recline: choice('How far back is the chair reclined?', {
      upright: 'Bolt upright with the footrest tucked away, as if nobody is home.',
      halfway: 'Tipped halfway back with the footrest angled out, watching the set.',
      'full-back': 'Cranked all the way back, footrest flat out, asleep by the second quarter.',
    }),
    colour: choice('What colour is the velour?', COLOURS),
    left: choice('Who or what was left in the chair?', {
      nobody: 'Nobody and nothing: an empty seat with a dent in it.',
      newspaper: 'A newspaper left tented open on the seat.',
      afghan: 'A zigzag crocheted afghan thrown over the arm and bunched in the seat.',
      cat: 'A cat curled asleep in the warm spot.',
      cardigan: 'A grey cardigan hung over the top of the back.',
    }),
    upholstery: choice('How is the back upholstered?', {
      channels: 'Three fat horizontal rolls, like a stack of bolsters.',
      buttons: 'One deep slab pulled in by rows of covered buttons.',
      pillows: 'Two loose overstuffed pillows, a body cushion and a headrest.',
    }),
    base: choice('What does it stand on?', {
      skirt: 'A pleated fabric skirt that hides the works.',
      feet: 'Four stubby turned wooden feet.',
      swivel: 'A round swivel-rocker disc so it can turn to face the room.',
    }),
    covers: noul('Are there lace covers pinned over the arms and headrest?'),
    plump: score('How overstuffed is it?', ['Trim and firm', 'Comfortably padded', 'Enormous, swallowing whoever sits in it']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = new THREE.Color(TINT[a.colour]).lerp(new THREE.Color('#9b9082'), mood.wear * 0.16);
    const light = tint.clone().lerp(new THREE.Color('#ffffff'), 0.22), dark = tint.clone().multiplyScalar(0.62);
    const nap = paint(256, 256, (ctx, w, h) => {
      ctx.fillStyle = `#${tint.getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        ctx.strokeStyle = `#${(random() < 0.5 ? light : dark).getHexString()}`;
        ctx.globalAlpha = 0.1 + random() * 0.16;
        const x = random() * w, y = random() * h;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 3, y + 5 + random() * 12); ctx.stroke();
      }
      // Crushed, shiny patches where hands and heads have rubbed the pile flat.
      ctx.globalAlpha = 0.06 + mood.wear * 0.1;
      ctx.fillStyle = `#${light.getHexString()}`;
      for (let i = 0; i < 3 + mood.wear * 7; i++) { ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 14 + random() * 30, 8 + random() * 18, random() * 3, 0, 7); ctx.fill(); }
    });
    nap.wrapS = nap.wrapT = THREE.RepeatWrapping;
    const fabric = new THREE.MeshStandardMaterial({ map: nap, roughness: 0.96 });
    const seam = new THREE.MeshStandardMaterial({ color: dark, roughness: 0.95 });
    const wood = s.material('#5a3a22', { roughness: 0.5 });
    const steel = s.material('#8d9092', { metalness: 0.8, roughness: 0.35 });
    const lace = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f1ead8').lerp(new THREE.Color('#b9a98a'), mood.wear * 0.5), roughness: 0.9, side: THREE.DoubleSide });

    const plump = mix(0.86, 1.18, a.plump);
    const pad = (size: [number, number, number], at: [number, number, number], parent: THREE.Object3D = s.root, material: THREE.Material = fabric) => {
      const mesh = s.mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 5, Math.min(size[0], size[1], size[2]) * 0.42), material, at);
      parent.add(mesh);
      return mesh;
    };
    const lift = a.base === 'skirt' ? 0 : 0.05;
    const armR = 0.105 * plump, armX = 0.3 + armR + 0.02, armTop = 0.56 + lift;

    // Frame, arms and seat.
    s.box([0.62, 0.3, 0.8], [0, 0.27 + lift, 0], seam);
    for (const side of [-1, 1]) {
      pad([armR * 2, 0.5, 0.86], [side * armX, 0.33 + lift, 0]);
      const roll = s.mesh(new THREE.CapsuleGeometry(armR * 1.08, 0.7, 6, 16), fabric, [side * armX, armTop, 0.02]);
      roll.rotation.x = Math.PI / 2;
      // A piped front panel on each arm.
      s.mesh(new THREE.TorusGeometry(armR * 0.8, 0.012, 6, 24), seam, [side * armX, armTop - 0.02, 0.432]);
    }
    const sag = mix(1, 0.72, mood.wear);
    const seat = pad([0.6, 0.2 * plump, 0.64], [0, 0.42 + lift + 0.1 * plump * sag, 0.08]);
    seat.scale.y = sag;
    const seatTop = 0.42 + lift + 0.2 * plump * sag;
    pad([0.6, 0.06, 0.06], [0, 0.43 + lift, 0.4], s.root, seam);

    // The back tips on a hinge at the rear of the seat.
    const angle = { upright: 0.16, halfway: 0.5, 'full-back': 0.92 }[a.recline] + (random() - 0.5) * 0.06;
    const back = new THREE.Group();
    back.position.set(0, 0.4 + lift, -0.3);
    back.rotation.x = -angle;
    s.root.add(back);
    pad([0.66, 0.84, 0.1], [0, 0.4, -0.1], back, seam);
    const thick = 0.2 * plump;
    if (a.upholstery === 'channels') {
      for (let i = 0; i < 3; i++) pad([0.62 + (i === 2 ? 0.05 : 0), 0.27, thick + (i === 2 ? 0.04 : 0)], [0, 0.14 + i * 0.26, 0.02], back);
    } else if (a.upholstery === 'buttons') {
      pad([0.64, 0.8, thick], [0, 0.42, 0.02], back);
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
        const button = s.ball([0.022, 0.022, 0.012], [(col - 1) * 0.19, 0.2 + row * 0.22, 0.02 + thick / 2 - 0.004], seam, 10);
        back.add(button);
        const dimple = s.mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 16), seam, [(col - 1) * 0.19, 0.2 + row * 0.22, 0.02 + thick / 2 - 0.012]);
        back.add(dimple);
      }
    } else {
      pad([0.62, 0.5, thick * 1.15], [0, 0.26, 0.03], back).rotation.x = 0.06;
      pad([0.56, 0.3, thick * 1.3], [0, 0.66, 0.05], back).rotation.x = -0.1;
    }
    const backTop = 0.82;

    // Footrest on its scissor arms.
    const out = { upright: 0, halfway: 0.62, 'full-back': 1 }[a.recline];
    const rest = new THREE.Group();
    rest.position.set(0, 0.26 + lift + out * 0.2, 0.44 + out * 0.42);
    rest.rotation.x = -out * Math.PI / 2;
    s.root.add(rest);
    pad([0.58, 0.3, 0.09 * plump], [0, 0, 0], rest);
    pad([0.5, 0.2, 0.02], [0, 0, 0.05 * plump], rest, seam).visible = a.upholstery === 'buttons';
    if (out > 0) for (const side of [-1, 1]) {
      const x = side * 0.24, z0 = 0.4, z1 = rest.position.z - 0.02, y1 = rest.position.y - 0.03;
      s.rod([x, 0.2 + lift, z0], [x, y1, z1], 0.012, steel);
      s.rod([x, 0.36 + lift, z0], [x, y1 - 0.1, mix(z0, z1, 0.6)], 0.012, steel);
      s.rod([x, 0.2 + lift, mix(z0, z1, 0.45)], [x, y1, mix(z0, z1, 0.55)], 0.01, steel);
    }

    // The lever, on the right-hand side as you sit.
    const leverX = -(armX + armR + 0.02), throwBack = mix(0.1, -0.16, out);
    s.rod([leverX, 0.3 + lift, 0.12], [leverX - 0.03, 0.5 + lift, 0.12 + throwBack], 0.014, steel);
    const grip = s.mesh(new THREE.CapsuleGeometry(0.024, 0.08, 4, 10), wood, [leverX - 0.036, 0.54 + lift, 0.12 + throwBack * 1.2]);
    grip.rotation.x = -throwBack * 1.4;
    s.box([0.02, 0.08, 0.1], [leverX + 0.012, 0.3 + lift, 0.12], steel);

    // Base.
    if (a.base === 'skirt') {
      s.box([armX * 2 + armR * 2 - 0.02, 0.13, 0.84], [0, 0.065, 0], seam);
      const pleats: { at: [number, number, number]; size: number }[] = [];
      const half = armX + armR;
      for (let x = -half; x <= half + 0.001; x += 0.05) { pleats.push({ at: [x, 0.065, 0.425], size: 1 }); pleats.push({ at: [x, 0.065, -0.425], size: 1 }); }
      for (let z = -0.4; z <= 0.401; z += 0.05) { pleats.push({ at: [half - 0.006, 0.065, z], size: 1 }); pleats.push({ at: [-half + 0.006, 0.065, z], size: 1 }); }
      s.scatter(new THREE.CylinderGeometry(0.017, 0.02, 0.13, 6), fabric, pleats);
    } else if (a.base === 'feet') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.lathe([[0, 0], [0.028, 0], [0.04, 0.05], [0.03, 0.09], [0.045, 0.13], [0, 0.13]], wood, [x * armX, 0, z * 0.36]);
    } else {
      s.cylinder(0.36, 0.38, 0.035, [0, 0.0175, 0], wood, 36);
      s.cylinder(0.06, 0.09, 0.12, [0, 0.09, 0], steel, 16);
      s.cylinder(0.3, 0.3, 0.02, [0, 0.14, 0], steel, 28);
    }

    // Lace covers.
    if (a.covers) {
      for (const side of [-1, 1]) s.mesh(drape(armR * 1.08 + 0.006, 0.3, 0.1, 0.07, 0.004), lace, [side * armX, armTop, 0.2]);
      const head = new THREE.Mesh(drape(thick * 0.5 + 0.03, 0.36, 0.2, 0.16, 0.004), lace);
      head.rotation.y = Math.PI / 2;
      head.position.set(0, backTop - thick * 0.5 + 0.02, 0.02);
      head.castShadow = true;
      back.add(head);
    }

    // What was left behind.
    let breathing: THREE.Object3D | null = null;
    if (a.left === 'newspaper') {
      const page = paint(256, 384, (ctx, w, h) => {
        ctx.fillStyle = mood.wear > 0.5 ? '#d9cfae' : '#e9e4d2';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#2b2a28';
        ctx.fillRect(14, 12, w - 28, 26);
        ctx.fillRect(14, 48, w - 28, 3);
        ctx.fillStyle = '#6f6c66';
        ctx.fillRect(18, 64, 104, 82);
        for (let col = 0; col < 3; col++) for (let y = col === 0 ? 160 : 64; y < h - 14; y += 7) ctx.fillRect(18 + col * 78, y, col === 0 ? 100 : 66, 3);
        ctx.fillStyle = '#e9e4d2';
        ctx.fillRect(122, 60, 6, h);
      });
      const paper = new THREE.MeshStandardMaterial({ map: page, roughness: 0.9, side: THREE.DoubleSide });
      const tent = new THREE.Group();
      for (const side of [-1, 1]) {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.004, 0.42), paper);
        leaf.geometry.translate(side * 0.15, 0, 0);
        leaf.rotation.z = side * -0.55;
        leaf.castShadow = leaf.receiveShadow = true;
        tent.add(leaf);
      }
      tent.position.set((random() - 0.5) * 0.08, seatTop + 0.165, 0.12);
      tent.rotation.y = (random() - 0.5) * 0.7;
      s.root.add(tent);
    } else if (a.left === 'afghan') {
      const zigzag = paint(256, 256, (ctx, w, h) => {
        const yarn = ['#d9772b', '#f0e3c0', '#6b3d1e', '#8a8a2e', '#f0e3c0', '#b33a22', '#e2b23a', '#3d5a4c'];
        for (let band = -2; band < 18; band++) {
          ctx.fillStyle = yarn[(band + 16) % yarn.length];
          ctx.beginPath();
          for (let x = 0; x <= w; x += 16) ctx.lineTo(x, band * 16 + ((x / 16) % 2 ? 0 : 14));
          for (let x = w; x >= 0; x -= 16) ctx.lineTo(x, (band + 1) * 16 + ((x / 16) % 2 ? 0 : 14) + 1);
          ctx.fill();
        }
      });
      zigzag.wrapS = zigzag.wrapT = THREE.RepeatWrapping;
      const wool = new THREE.MeshStandardMaterial({ map: zigzag, roughness: 1, side: THREE.DoubleSide });
      const side = random() < 0.5 ? -1 : 1;
      s.mesh(drape(armR * 1.08 + 0.012, 0.6, 0.44, 0.17, 0.012), wool, [side * armX, armTop, 0.05]).scale.x = side;
      const fold = pad([0.3, 0.05, 0.34], [side * 0.13, seatTop + 0.02, 0.1], s.root, wool);
      fold.rotation.y = (random() - 0.5) * 0.4;
      pad([0.26, 0.045, 0.2], [side * 0.15, seatTop + 0.06, 0.05], s.root, wool).rotation.y = (random() - 0.5) * 0.6;
    } else if (a.left === 'cat') {
      const coat = ['#c9762e', '#55524f', '#1e1c1b', '#e8dfcf'][Math.floor(random() * 4)];
      const fur = new THREE.MeshStandardMaterial({ color: coat, roughness: 1 });
      const cat = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { cat.add(mesh); return mesh; };
      add(s.ball([0.15, 0.085, 0.12], [0, 0.07, 0], fur, 20));
      add(s.ball([0.09, 0.08, 0.09], [-0.1, 0.07, 0.03], fur, 16));
      add(s.ball([0.055, 0.05, 0.055], [0.1, 0.06, 0.1], fur, 16));
      for (const ear of [-1, 1]) {
        const cone = add(s.mesh(new THREE.ConeGeometry(0.02, 0.035, 4), fur, [0.1 + ear * 0.03, 0.115, 0.1]));
        cone.rotation.z = -ear * 0.25;
      }
      add(s.tube([[-0.17, 0.04, 0.0], [-0.18, 0.035, 0.1], [-0.08, 0.03, 0.17], [0.03, 0.03, 0.17]], 0.018, fur));
      cat.position.set((random() - 0.5) * 0.2, seatTop - 0.01, 0.1 + (random() - 0.5) * 0.1);
      cat.rotation.y = random() * Math.PI * 2;
      cat.scale.setScalar(1.25);
      s.root.add(cat);
      breathing = cat.children[0];
    } else if (a.left === 'cardigan') {
      const knit = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.6 ? '#b06a3a' : '#74746d', roughness: 1, side: THREE.DoubleSide });
      const body = new THREE.Mesh(drape(thick * 0.5 + 0.04, 0.5, 0.5, 0.34, 0.01), knit);
      body.rotation.y = Math.PI / 2;
      body.position.set((random() - 0.5) * 0.12, backTop - thick * 0.5 + 0.03, 0.02);
      body.castShadow = true;
      back.add(body);
      for (const side of [-1, 1]) {
        const sleeve = s.mesh(new THREE.CapsuleGeometry(0.04, 0.4, 4, 10), knit, [body.position.x + side * 0.27, backTop - 0.2, 0.02 + thick / 2 + 0.07]);
        sleeve.rotation.z = side * 0.18;
        back.add(sleeve);
      }
    }

    // Wear: a duct-tape repair on one arm and stuffing coming out of a split seam.
    if (mood.wear > 0.55) {
      const tape = s.mesh(drape(armR * 1.08 + 0.004, 0.07, 0.12, 0.1, 0), new THREE.MeshStandardMaterial({ color: '#a9adad', roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide }), [armX, armTop, -0.1 + random() * 0.2]);
      tape.rotation.y = 0.15;
    }
    if (mood.wear > 0.8) for (let i = 0; i < 4; i++) s.ball([0.03, 0.025, 0.03], [-armX + (random() - 0.5) * 0.05, armTop - 0.08 - random() * 0.05, 0.43 + random() * 0.02], lace, 8);

    const rate = mix(0.8, 2.2, mood.energy);
    return s.finish({ update: (_dt, time) => { if (breathing) breathing.scale.y = 0.085 * (1 + Math.sin(time * rate) * 0.06); } });
  },
});
