import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const SIGNS = {
  readers: 'READERS 9.99',
  two: '2 FOR 15',
  sun: 'SUN SHOP',
  see: 'SEE CLEARLY',
  strengths: '+1.00 TO +3.50',
} as const;
const FRAMES = {
  sober: ['#1b1c1f', '#5a3a22', '#23324f', '#6f7277', '#7a1f26'],
  candy: ['#e23b3b', '#19b3b0', '#f06aa8', '#f2c21c', '#7b46c9', '#3aa64a'],
  wire: ['#c9a548', '#c8ccd0', '#5b5e63', '#b87745'],
} as const;

export default defineThing({
  questions: {
    stock: choice('What is the rack stocked with?', {
      readers: 'Reading glasses only: clear lenses in small rectangular and round frames.',
      sunglasses: 'Sunglasses only: dark lenses, a beach-town or airport rack.',
      both: 'Readers on some sides and sunglasses on the others.',
    }),
    picked: score('How picked-over is it?', ['Freshly stocked, every hook full', 'A few gaps', 'Half empty', 'Nearly bare, a handful of rejects']),
    tower: choice('What shape is the revolving tower?', {
      three: 'A slim three-sided tower.',
      four: 'A square four-sided tower, the usual drugstore spinner.',
      six: 'A fat six-sided carousel as wide as a person.',
    }),
    frames: choice('What do the frames look like?', {
      sober: 'Black, tortoiseshell and navy plastic: sensible and anonymous.',
      candy: 'Bright candy colours: red, turquoise, pink, yellow.',
      wire: 'Thin gold and silver wire frames, a little old-fashioned.',
      mixed: 'Everything at once, no two alike.',
    }),
    ledge: choice('What has been left on the little mirror ledge?', {
      nothing: 'Nothing.',
      pair: 'One pair, unfolded and abandoned after being tried on.',
      own: 'Somebody\'s own old scratched glasses, forgotten when they bought new ones.',
      tags: 'A small pile of torn-off price tags.',
    }),
    sign: choice('What does the sign on top say?', SIGNS),
    fallen: noul('Has a pair fallen to the floor at its foot?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const sides = { three: 3, four: 4, six: 6 }[a.tower];
    const faceWidth = 0.31;
    const apothem = faceWidth / 2 / Math.tan(Math.PI / sides);
    const steel = s.material('#c5cacc', { metalness: 0.85, roughness: 0.3 });
    const dark = s.material('#24272a', { roughness: 0.6 });
    const panel = s.material(new THREE.Color('#f3f1ea').lerp(new THREE.Color('#d9cfa8'), mood.wear * 0.6), { roughness: 0.6 });
    const accent = s.material(a.stock === 'sunglasses' ? '#f0a02a' : mood.cheer > 0.5 ? '#2a7fc0' : '#3a5a78', { roughness: 0.5 });

    // Fixed foot and pole.
    s.lathe([[0, 0], [0.25, 0], [0.26, 0.02], [0.23, 0.05], [0.08, 0.075], [0.04, 0.11], [0, 0.11]], dark);
    s.cylinder(0.022, 0.022, 0.45, [0, 0.3, 0], steel, 14);

    // Everything above the pole turns.
    const spin = new Sculpture(context);
    s.root.add(spin.root);
    const bottom = 0.5, topY = 1.52, bodyHeight = topY - bottom;
    const column = spin.mesh(new THREE.CylinderGeometry(apothem / Math.cos(Math.PI / sides), apothem / Math.cos(Math.PI / sides), bodyHeight, sides), panel, [0, bottom + bodyHeight / 2, 0]);
    column.rotation.y = Math.PI / sides;
    const capRadius = apothem / Math.cos(Math.PI / sides) + 0.03;
    for (const y of [bottom - 0.015, topY + 0.015]) spin.mesh(new THREE.CylinderGeometry(capRadius, capRadius, 0.03, sides), accent, [0, y, 0]).rotation.y = Math.PI / sides;

    // Glasses: instanced rims, lenses, bridges and the dark slots they hang in.
    const rows = 9, pitch = bodyHeight / (rows + 0.4);
    const palette: readonly string[] = a.frames === 'mixed' ? [...FRAMES.sober, ...FRAMES.candy, ...FRAMES.wire] : FRAMES[a.frames];
    const empty = mix(0.02, 0.9, a.picked);
    interface Pair { matrix: THREE.Matrix4; colour: THREE.Color; shades: boolean; round: boolean }
    const pairs: Pair[] = [];
    const slots: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let side = 0; side < sides; side++) {
      const angle = (side / sides) * Math.PI * 2;
      const shades = a.stock === 'sunglasses' || (a.stock === 'both' && side % 2 === 1);
      for (let row = 0; row < rows; row++) for (const column of [-1, 1]) {
        const y = topY - pitch * (row + 0.75);
        const local = new THREE.Vector3(column * 0.077, y, apothem + 0.012);
        const position = local.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        e.set(0, angle, 0);
        slots.push(new THREE.Matrix4().compose(position.clone().add(new THREE.Vector3(0, 0.022, 0)).sub(new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(0.01)), new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(1, 1, 1)));
        // Lower rows and one unlucky side empty out first.
        if (random() < empty * mix(0.75, 1.25, row / rows)) continue;
        e.set(-0.12 + (random() - 0.5) * 0.1, angle, (random() - 0.5) * mix(0.05, 0.45, Math.max(mood.wear, mood.energy * 0.6)), 'YXZ');
        q.setFromEuler(e);
        pairs.push({ matrix: new THREE.Matrix4().compose(position, q, new THREE.Vector3(1, 1, 1)), colour: new THREE.Color(palette[Math.floor(random() * palette.length)]), shades, round: random() < 0.4 });
      }
    }
    const thin = a.frames === 'wire' ? 0.0028 : 0.0048;
    const rimGeometry = new THREE.TorusGeometry(0.027, thin, 6, 18);
    const rims = new THREE.InstancedMesh(rimGeometry, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: a.frames === 'wire' ? 0.8 : 0.05 }), Math.max(1, pairs.length * 2));
    const bridges = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.006, 0.006), rims.material, Math.max(1, pairs.length));
    const shadeCount = pairs.filter((pair) => pair.shades).length;
    const lenses = new THREE.InstancedMesh(new THREE.CircleGeometry(0.026, 16), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.15, metalness: 0.4 }), Math.max(1, shadeCount * 2));
    const glint = new THREE.InstancedMesh(new THREE.CircleGeometry(0.025, 16), new THREE.MeshStandardMaterial({ color: '#dff1ff', roughness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }), Math.max(1, (pairs.length - shadeCount) * 2));
    rims.count = pairs.length * 2; bridges.count = pairs.length; lenses.count = shadeCount * 2; glint.count = (pairs.length - shadeCount) * 2;
    let lensIndex = 0, glintIndex = 0;
    const shadeTints = ['#16181c', '#3a2414', '#1d3a2a', '#5a2f6a', '#2a4a7a'];
    pairs.forEach((pair, index) => {
      const squash = pair.round ? 1 : 0.72;
      for (const [k, dx] of [-0.034, 0.034].entries()) {
        m.makeScale(pair.round ? 1 : 1.12, squash, 1).setPosition(dx, 0, 0).premultiply(pair.matrix);
        rims.setMatrixAt(index * 2 + k, m);
        rims.setColorAt(index * 2 + k, pair.colour);
        if (pair.shades) {
          lenses.setMatrixAt(lensIndex, m);
          lenses.setColorAt(lensIndex++, new THREE.Color(shadeTints[(index + Math.floor(pair.colour.r * 9)) % shadeTints.length]));
        } else glint.setMatrixAt(glintIndex++, m);
      }
      m.makeTranslation(0, 0.008, 0).premultiply(pair.matrix);
      bridges.setMatrixAt(index, m);
      bridges.setColorAt(index, pair.colour);
    });
    const slotMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.012, 0.004), dark, slots.length);
    slots.forEach((matrix, index) => slotMesh.setMatrixAt(index, matrix));
    for (const mesh of [rims, bridges, lenses, glint, slotMesh]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh !== glint;
      spin.root.add(mesh);
    }

    // Head: a sign, a mirror with a ledge, and the strength chart beside it.
    const headY = topY + 0.03;
    spin.box([0.5, 0.36, 0.035], [0, headY + 0.2, 0], accent);
    const mirrorMap = paint(128, 160, (c, w, h) => {
      const sky = c.createLinearGradient(0, 0, w, h);
      sky.addColorStop(0, '#f4fbff'); sky.addColorStop(0.45, '#a9c6d6'); sky.addColorStop(1, '#6f8fa3');
      c.fillStyle = sky;
      c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.beginPath(); c.moveTo(20, h); c.lineTo(70, 0); c.lineTo(92, 0); c.lineTo(42, h); c.fill();
      c.beginPath(); c.moveTo(60, h); c.lineTo(110, 0); c.lineTo(116, 0); c.lineTo(66, h); c.fill();
    });
    const chartMap = paint(128, 160, (c, w, h) => {
      c.fillStyle = '#fbf9f0';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#1e2226';
      c.textBaseline = 'middle';
      let y = 16;
      for (const [index, power] of ['+1.00', '+1.50', '+2.00', '+2.50', '+3.00', '+3.50'].entries()) {
        const size = 9 + index * 3.4;
        c.font = `bold ${size}px sans-serif`;
        c.fillText(power, 6, y);
        c.fillRect(6 + size * 3.1, y - size * 0.25, w - 14 - size * 3.1, Math.max(2, size * 0.36));
        y += size * 1.05 + 6;
      }
    });
    for (const face of [1, -1]) {
      const z = face * 0.019;
      const turn = face > 0 ? 0 : Math.PI;
      spin.mesh(new THREE.PlaneGeometry(0.2, 0.25), new THREE.MeshStandardMaterial({ map: mirrorMap, roughness: 0.15, metalness: 0.3, emissive: '#ffffff', emissiveMap: mirrorMap, emissiveIntensity: 0.25 }), [-0.125 * face, headY + 0.165, z]).rotation.y = turn;
      spin.mesh(new THREE.PlaneGeometry(0.2, 0.25), new THREE.MeshStandardMaterial({ map: chartMap, roughness: 0.8 }), [0.125 * face, headY + 0.165, z]).rotation.y = turn;
      spin.label(SIGNS[a.sign], 0.46, 0.075, [0, headY + 0.335, z + face * 0.001], '#ffffff', a.stock === 'sunglasses' ? '#c2412b' : '#1f3f66').rotation.y = turn;
    }
    spin.box([0.24, 0.012, 0.09], [-0.125, headY + 0.03, 0.05], steel);
    spin.box([0.24, 0.02, 0.006], [-0.125, headY + 0.04, 0.094], steel);

    // One hand-built pair, for the ledge and the floor.
    const loosePair = (target: Sculpture, colour: string, shades: boolean, open: boolean) => {
      const g = new Sculpture(context);
      const frame = s.material(colour, { roughness: 0.35 });
      for (const dx of [-0.034, 0.034]) {
        g.mesh(new THREE.TorusGeometry(0.027, 0.005, 6, 18), frame, [dx, 0, 0]);
        if (shades) g.mesh(new THREE.CircleGeometry(0.026, 16), s.material('#17191d', { roughness: 0.15, side: THREE.DoubleSide }), [dx, 0, 0]);
        const side = Math.sign(dx);
        if (open) g.rod([dx + side * 0.028, 0.004, 0], [dx + side * 0.03, 0.0, -0.13], 0.004, frame);
        else g.rod([dx + side * 0.028, 0.004, -0.006], [-dx, 0.002, -0.014], 0.004, frame);
      }
      g.box([0.02, 0.006, 0.006], [0, 0.008, 0], frame);
      target.root.add(g.root);
      return g.root;
    };
    if (a.ledge === 'pair' || a.ledge === 'own') {
      const colour = a.ledge === 'own' ? '#7b6a4a' : palette[Math.floor(random() * palette.length)];
      const left = loosePair(spin, colour, a.ledge === 'pair' && a.stock === 'sunglasses', true);
      left.scale.setScalar(1.35);
      left.position.set(-0.125 + (random() - 0.5) * 0.06, headY + 0.076, 0.085);
      left.rotation.set(-0.05, (random() - 0.5) * 0.5, 0);
      if (a.ledge === 'pair') spin.box([0.03, 0.045, 0.002], [left.position.x + 0.09, headY + 0.045, 0.1], s.material('#fff6c9'));
    } else if (a.ledge === 'tags') {
      for (let i = 0; i < 6; i++) {
        const tag = spin.box([0.03, 0.002, 0.045], [-0.2 + random() * 0.16, headY + 0.038 + i * 0.002, 0.04 + random() * 0.03], s.material(i % 2 ? '#fff6c9' : '#ffffff'));
        tag.rotation.y = random() * 3;
      }
    }
    if (a.fallen) {
      const dropped = loosePair(s, palette[Math.floor(random() * palette.length)], a.stock !== 'readers', false);
      dropped.scale.setScalar(1.5);
      const angle = random() * Math.PI - Math.PI / 2;
      dropped.position.set(Math.sin(angle) * 0.4, 0.045, Math.cos(angle) * 0.4);
      dropped.rotation.set(-Math.PI / 2, 0, random() * 6);
      dropped.position.y = 0.008;
    }

    spin.root.rotation.y = (random() - 0.5) * 0.7 + (sides === 3 ? Math.PI / 3 : 0) * 0;
    s.root.rotation.z = (random() - 0.5) * mood.wear * 0.05;
    const speed = mix(0.02, 0.9, mood.energy * mood.energy);
    return s.finish({
      footprint: 0.36,
      update: (dt, time) => { spin.root.rotation.y += dt * speed * (0.75 + 0.25 * Math.sin(time * 0.7)); },
    });
  },
});
