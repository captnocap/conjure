import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const SCHEMES = {
  rainbow: 'Sorted into a rainbow that runs across the wall column by column.',
  yellow: 'Almost all the classic Fez yellow, the colour a babouche is supposed to be.',
  jewel: 'A random scatter of saturated jewel colours, no two neighbours alike.',
  earth: 'Natural leathers: tan, chestnut, oxblood and cream.',
  bridal: 'White, cream and gold, for weddings.',
  redblack: 'Only red and black, severe and smart.',
} as const;
const JEWEL = ['#d42a3a', '#1f6fd0', '#16a070', '#e8b81e', '#c22a8c', '#f07a1a', '#6a35b8', '#19a6c4', '#f2efe4'];
const EARTH = ['#b88752', '#7a4526', '#6e1f1c', '#e3d2ad', '#96623a', '#4a2c1c'];
const BRIDAL = ['#f4f1e8', '#ecdcae', '#d9b34a', '#fbf8f0'];

/** One slipper: toe toward +y, sole flat against z = 0, upper bulging toward +z. */
function slipper(round: boolean) {
  const half: [number, number][] = [[0, -0.13], [0.03, -0.124], [0.043, -0.09], [0.046, -0.03], [0.05, 0.03], [0.045, 0.08], round ? [0.036, 0.118] : [0.024, 0.115], round ? [0.016, 0.136] : [0, 0.142]];
  const outline = new THREE.Shape();
  outline.moveTo(...half[0]);
  for (const [x, y] of half.slice(1)) outline.lineTo(x, y);
  for (const [x, y] of half.slice(0, -1).reverse()) outline.lineTo(-x, y);
  const sole = new THREE.ExtrudeGeometry(outline, { depth: 0.012, bevelEnabled: false }).toNonIndexed();
  const upper = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  upper.rotateX(Math.PI / 2);
  upper.scale(0.052, 0.088, 0.042);
  upper.translate(0, 0.052, 0.012);
  const at = upper.getAttribute('position');
  for (let i = 0; i < at.count; i++) {
    const t = Math.min(1, Math.max(0, (at.getY(i) + 0.036) / 0.176));
    at.setX(i, at.getX(i) * (1 - (round ? 0.45 : 0.82) * t * t));
    at.setZ(i, 0.012 + (at.getZ(i) - 0.012) * (1 - 0.45 * t));
  }
  upper.computeVertexNormals();
  const flat = upper.toNonIndexed();
  const shade = (geometry: THREE.BufferGeometry, value: number) => {
    const count = geometry.getAttribute('position').count;
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3).fill(value), 3));
  };
  shade(sole, 0.5); shade(flat, 1);
  const merged = mergeGeometries([sole, flat])!;
  sole.dispose(); upper.dispose(); flat.dispose();
  return merged;
}

export default defineThing({
  questions: {
    scheme: choice('What is the colour scheme of the slippers?', SCHEMES),
    style: choice('What kind of babouche are they?', {
      pointed: 'Plain and sharply pointed, the city slipper.',
      round: 'Round-toed and sturdy, the Berber country slipper.',
      pompom: 'Pointed, with a bright wool pom-pom on every toe.',
      embroidered: 'Pointed, with a gold stitched medallion on each vamp.',
    }),
    tidy: score('How tidy is the display?', ['Picked over: gaps, crooked shoes, some dropped at the foot of the wall', 'Used but orderly', 'Immaculate ranks, every pair straight']),
    odd: choice('Is there one thing out of place?', {
      none: 'No, every pair is present.',
      missing: 'One pair is gone, leaving two bare pegs and a clean patch.',
      single: 'One shoe hangs alone in the wrong colour, its partner lost.',
      tried: 'One pair has been taken down, tried on and left on the ground in front.',
    }),
    backing: choice('What are they hung on?', {
      plaster: 'A section of ochre plastered wall with a green tiled cap.',
      board: 'A dark wooden board propped on legs.',
      reed: 'A pale reed mat stretched on a pole frame.',
    }),
    sign: choice('What does the little hanging sign say, if there is one?', {
      none: 'No sign at all.', fixed: 'PRIX FIXE', price: '100 DH', leather: 'CUIR VERITABLE', hand: 'FAIT MAIN',
    }),
    stool: noul('Is the seller\'s low stool standing in front, empty?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const cols = 5 + Math.round(mood.density * 4), rows = 4 + Math.round(mood.density * 2);
    const pitchX = 0.29, pitchY = 0.39, baseY = 0.48;
    const width = cols * pitchX + 0.22, height = baseY + rows * pitchY + 0.12;

    if (a.backing === 'plaster') {
      s.box([width + 0.2, height, 0.24], [0, height / 2, -0.12], s.material(mood.warmth > 0.4 ? '#d9a868' : '#d8d0bd', { roughness: 0.95 }));
      s.box([width + 0.3, 0.07, 0.34], [0, height + 0.035, -0.12], s.material('#2f7d5c', { roughness: 0.4 }));
      s.box([width + 0.22, 0.3, 0.26], [0, 0.15, -0.12], s.material('#b9844e', { roughness: 0.95 }));
    } else if (a.backing === 'board') {
      const wood = s.material('#5a3a24', { roughness: 0.85 });
      s.box([width, height - 0.2, 0.04], [0, height / 2 + 0.1, -0.02], wood);
      for (const x of [-1, 1]) {
        s.box([0.07, height, 0.06], [x * (width / 2 - 0.04), height / 2, -0.07], wood);
        s.rod([x * (width / 2 - 0.04), height * 0.8, -0.1], [x * (width / 2 - 0.04), 0, -0.75], 0.025, wood);
      }
    } else {
      const pole = s.material('#b89a5e');
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const g = canvas.getContext('2d')!;
      g.fillStyle = '#d6c08a'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#9c8450'; g.lineWidth = 1.5;
      for (let i = 0; i < 52; i++) { g.beginPath(); g.moveTo(i * 5, 0); g.lineTo(i * 5 + random() * 2, 256); g.stroke(); }
      g.strokeStyle = '#6a5630'; g.lineWidth = 3;
      for (const y of [30, 128, 226]) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      s.mesh(new THREE.BoxGeometry(width - 0.06, height - 0.3, 0.02), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }), [0, height / 2 + 0.12, -0.012]);
      for (const x of [-1, 1]) {
        s.rod([x * width / 2, 0, -0.03], [x * width / 2, height + 0.1, -0.03], 0.028, pole);
        s.rod([x * width / 2, height * 0.85, -0.05], [x * width / 2, 0, -0.8], 0.022, pole);
      }
      s.rod([-width / 2 - 0.1, height, -0.03], [width / 2 + 0.1, height, -0.03], 0.025, pole);
    }
    const rail = s.material('#4a3222');
    for (let r = 0; r < rows; r++) s.box([width - 0.1, 0.018, 0.02], [0, baseY + r * pitchY - 0.19, 0.01], rail);

    const round = a.style === 'round';
    const tint = (col: number, row: number) => {
      const c = new THREE.Color();
      if (a.scheme === 'rainbow') c.setHSL((col / cols) * 0.85, 0.9, 0.46 + (row % 2) * 0.06);
      else if (a.scheme === 'yellow') c.set(random() < 0.08 ? '#f2efe4' : '#e8b81e').offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.1);
      else if (a.scheme === 'jewel') c.set(JEWEL[Math.floor(random() * JEWEL.length)]);
      else if (a.scheme === 'earth') c.set(EARTH[Math.floor(random() * EARTH.length)]);
      else if (a.scheme === 'bridal') c.set(BRIDAL[Math.floor(random() * BRIDAL.length)]);
      else c.set(random() < 0.5 ? '#c4202c' : '#1d1b1e');
      return c.lerp(new THREE.Color('#8b7a66'), mood.wear * 0.25);
    };

    type Shoe = { matrix: THREE.Matrix4; colour: THREE.Color };
    const shoes: Shoe[] = [];
    const mess = 1 - a.tidy;
    const hung = (x: number, y: number, tilt: number, colour: THREE.Color, size = 1.3) => {
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, y, 0.022), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, 0, tilt)), new THREE.Vector3(size, size, size));
      shoes.push({ matrix, colour });
    };
    const dropped = (x: number, z: number, colour: THREE.Color, upturned = false) => {
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, upturned ? 0.065 : 0.002, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(upturned ? Math.PI / 2 : -Math.PI / 2, random() * 6.28, upturned ? 0.5 : 0, 'YXZ')), new THREE.Vector3(1.3, 1.3, 1.3));
      shoes.push({ matrix, colour });
    };
    const oddCol = Math.floor(random() * cols), oddRow = 1 + Math.floor(random() * (rows - 2));
    const pegs = s.material('#2b2420', { metalness: 0.5 });
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * pitchX, y = baseY + r * pitchY;
      const colour = tint(c, r);
      const special = c === oddCol && r === oddRow ? a.odd : 'none';
      if (special === 'missing' || special === 'tried') {
        s.box([0.27, 0.36, 0.004], [x, y, 0.003], s.material('#efe6d0', { roughness: 1 }));
        for (const side of [-1, 1]) s.rod([x + side * 0.055, y + 0.1, 0], [x + side * 0.055, y + 0.1, 0.05], 0.006, pegs);
        if (special === 'tried') {
          dropped(x - 0.08, 0.62, colour);
          dropped(x + 0.14, 0.78, colour, true);
        }
        continue;
      }
      if (special === 'single') {
        s.box([0.27, 0.36, 0.004], [x, y, 0.003], s.material('#efe6d0', { roughness: 1 }));
        const clash = new THREE.Color(a.scheme === 'redblack' || a.scheme === 'earth' ? '#22c4d6' : a.scheme === 'bridal' ? '#c4202c' : '#17161a');
        hung(x - 0.03, y - 0.02, 0.5, clash, 1.5);
        continue;
      }
      const tilt = -0.2 + (random() - 0.5) * mess * 0.9;
      for (const side of [-1, 1]) {
        if (random() < mess * mess * 0.3) {
          if (random() < 0.45) dropped((random() - 0.5) * width * 0.9, 0.15 + random() * 0.4, colour, random() < 0.3);
          continue;
        }
        hung(x + side * 0.066, y + (random() - 0.5) * mess * 0.06, tilt + (random() - 0.5) * mess * 0.5, colour);
      }
    }

    const geometry = slipper(round);
    const leather = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.5, 0.85, mood.wear) });
    const wall = new THREE.InstancedMesh(geometry, leather, shoes.length);
    const deco: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    shoes.forEach((shoe, index) => {
      wall.setMatrixAt(index, shoe.matrix);
      wall.setColorAt(index, shoe.colour);
      if (a.style === 'pompom' || a.style === 'embroidered') {
        const p = new THREE.Vector3(0, a.style === 'pompom' ? 0.085 : 0.05, a.style === 'pompom' ? 0.05 : 0.049).applyMatrix4(shoe.matrix);
        const hsl = { h: 0, s: 0, l: 0 };
        shoe.colour.getHSL(hsl);
        deco.push({ at: [p.x, p.y, p.z], size: 1, color: a.style === 'pompom' ? new THREE.Color().setHSL((hsl.h + 0.45) % 1, 0.8, hsl.l > 0.6 ? 0.45 : 0.62) : new THREE.Color('#e9c244') });
      }
    });
    wall.instanceMatrix.needsUpdate = true;
    if (wall.instanceColor) wall.instanceColor.needsUpdate = true;
    wall.castShadow = wall.receiveShadow = true;
    s.root.add(wall);
    if (deco.length) {
      const shape = a.style === 'pompom' ? new THREE.SphereGeometry(0.024, 8, 6) : new THREE.SphereGeometry(0.022, 4, 2).scale(1, 1.3, 0.35);
      s.scatter(shape, s.material('#ffffff', { roughness: 1, metalness: a.style === 'embroidered' ? 0.5 : 0 }), deco);
    }

    if (a.sign !== 'none') {
      const text = { fixed: 'PRIX FIXE', price: '100 DH', leather: 'CUIR VERITABLE', hand: 'FAIT MAIN' }[a.sign];
      const board = s.label(text, 0.62, 0.17, [width / 2 - 0.4, height + (a.backing === 'plaster' ? -0.13 : 0.02), 0.06], '#f5ecd2', '#7a2a1e');
      board.rotation.z = (random() - 0.5) * 0.12;
    }
    if (a.stool) {
      const wood = s.material('#8a5a32');
      const sx = -width / 2 + 0.25 + random() * 0.3, sz = 0.75;
      s.cylinder(0.17, 0.17, 0.035, [sx, 0.3, sz], wood, 16);
      s.cylinder(0.16, 0.16, 0.02, [sx, 0.325, sz], s.material('#b43a2a'), 16);
      for (let k = 0; k < 3; k++) s.rod([sx + Math.cos(k * 2.1) * 0.08, 0.29, sz + Math.sin(k * 2.1) * 0.08], [sx + Math.cos(k * 2.1) * 0.16, 0, sz + Math.sin(k * 2.1) * 0.16], 0.018, wood);
    }
    return s.finish();
  },
});
