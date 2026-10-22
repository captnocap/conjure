import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
interface Item { at: [number, number, number]; size: [number, number, number]; turn?: number; tilt?: number; roll?: number; colour: THREE.ColorRepresentation }
function instances(geometry: THREE.BufferGeometry, material: THREE.Material, items: readonly Item[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(items.length, 1));
  mesh.count = items.length;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  items.forEach((item, i) => {
    q.setFromEuler(e.set(item.tilt ?? 0, item.turn ?? 0, item.roll ?? 0, 'YXZ'));
    m.compose(new THREE.Vector3(...item.at), q, new THREE.Vector3(...item.size));
    mesh.setMatrixAt(i, m); mesh.setColorAt(i, new THREE.Color(item.colour));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export default defineThing({
  questions: {
    load: choice('What is on the pallet?', {
      cartons: 'Plain brown cardboard cartons, taped and stacked in tidy layers.',
      frozen: 'White frozen-food cartons printed with blue snowflakes, frost on the edges.',
      sacks: 'Fat paper sacks of rice or flour laid like bricks.',
      water: 'Shrink-wrapped cases of bottled water, blue and glinting, with card sheets between layers.',
      crates: 'Plastic milk crates in mixed colours, stacked in columns.',
      melons: 'A big octagonal cardboard bin heaped with watermelons.',
      empty: 'Nothing: a bare pallet, already unloaded.',
      none: 'No pallet at all, just the bare forks.',
    }),
    wrap: choice('If it is loaded, how is the load wrapped?', {
      wrapped: 'Bound tight in glossy stretch film, untouched since the truck.',
      torn: 'Film slashed open and peeled down, a box cutter left on top and one carton open.',
      strapped: 'No film, just two tight straps over the top.',
      bare: 'No wrap at all, the stack loose.',
    }),
    parked: choice('How has it been left?', {
      neat: 'Parked square with the handle upright, forks lowered, out of the way.',
      pulling: 'Mid-pull: the tiller tilted back as if a hand just let go.',
      abandoned: 'Abandoned in the way: handle dropped to the floor, the stack shifted and a box fallen.',
    }),
    colour: choice('What colour is the jack?', {
      yellow: 'Safety yellow.',
      red: 'Fire-engine red.',
      orange: 'Hire-shop orange.',
      blue: 'Royal blue.',
      green: 'Dark machine green.',
    }),
    pallet: choice('What kind of pallet is it?', {
      pine: 'Rough raw pine, splintered at the corners.',
      blue: 'A blue-painted rental pallet.',
      red: 'A red-painted rental pallet.',
      plastic: 'A moulded black plastic pallet.',
    }),
    paperwork: choice('What has been left with the load?', {
      nothing: 'Nothing.',
      invoice: 'A delivery note in a plastic pouch stuck to the side.',
      clipboard: 'A clipboard and pen lying on top.',
      hold: 'A big red HOLD tag taped across the front.',
      scanner: 'A handheld barcode scanner left on top, its screen still lit.',
      coffee: 'A paper coffee cup and a pair of work gloves.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const paintColour = { yellow: '#f2b81c', red: '#d02a22', orange: '#f0701c', blue: '#2452b8', green: '#2c6a3e' }[a.colour];
    const frame = s.material(paintColour, { metalness: 0.3, roughness: 0.42 });
    const steel = s.material('#aab2b6', { metalness: 0.85, roughness: 0.3 });
    const rubber = s.material('#26282c', { roughness: 0.8 });
    const poly = s.material('#e8dcc0', { roughness: 0.6 });
    const loaded = a.load !== 'none';
    const lift = a.parked === 'neat' ? 0 : 0.045;

    // Forks, head, pump and wheels. The jack runs along x with the tiller at -x.
    for (const side of [-1, 1]) {
      const z = side * 0.19;
      s.box([1.1, 0.05, 0.16], [0, 0.11 + lift, z], frame);
      for (const edge of [-1, 1]) s.box([1.1, 0.07, 0.012], [0, 0.095 + lift, z + edge * 0.074], frame);
      const tip = s.box([0.12, 0.035, 0.16], [0.6, 0.09 + lift, z], frame); tip.rotation.z = -0.3;
      s.cylinder(0.038, 0.038, 0.1, [0.42, 0.038, z], poly, 14).rotation.x = Math.PI / 2;
      s.rod([0.42, 0.04, z], [0.3, 0.1 + lift, z], 0.01, steel);
    }
    s.box([0.16, 0.36, 0.54], [-0.62, 0.27 + lift, 0], frame);
    s.box([0.05, 0.2, 0.54], [-0.53, 0.19 + lift, 0], frame);
    s.cylinder(0.055, 0.055, 0.4, [-0.78, 0.32, 0], steel, 16);
    s.cylinder(0.035, 0.035, 0.18, [-0.78, 0.58 + lift, 0], s.material('#e6eaec', { metalness: 0.95, roughness: 0.12 }), 12);
    s.cylinder(0.07, 0.075, 0.06, [-0.78, 0.15, 0], rubber, 16);
    for (const side of [-1, 1]) s.cylinder(0.09, 0.09, 0.055, [-0.78, 0.09, side * 0.085], poly, 20).rotation.x = Math.PI / 2;
    s.cylinder(0.02, 0.02, 0.26, [-0.78, 0.09, 0], steel, 10).rotation.x = Math.PI / 2;
    s.label('2500 KG', 0.3, 0.07, [-0.62, 0.36 + lift, 0.272], '#1c1c1e', '#f4f1e6');

    // Tiller.
    const tiller = new THREE.Group();
    const part = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; tiller.add(mesh); return mesh; };
    part(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.78, 12), frame)).position.y = 0.39;
    const loop = new THREE.CatmullRomCurve3([[0, 0.76, 0], [0, 0.78, -0.15], [0, 0.94, -0.17], [0, 0.98, 0], [0, 0.94, 0.17], [0, 0.78, 0.15]].map((p) => new THREE.Vector3(...p)), true, 'catmullrom', 0.3);
    part(new THREE.Mesh(new THREE.TubeGeometry(loop, 48, 0.019, 8, true), frame));
    for (const side of [-1, 1]) { const grip = part(new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.13, 10), rubber)); grip.position.set(0, 0.87, side * 0.168); }
    part(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.11), s.material('#c8201c'))).position.set(0.02, 0.86, 0);
    part(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.09), frame)).position.y = 0.02;
    tiller.position.set(-0.8, 0.5, 0);
    tiller.rotation.z = { neat: 0.04, pulling: 0.62 + random() * 0.25, abandoned: Math.PI / 2 + 0.56 }[a.parked];
    if (a.parked !== 'neat') tiller.rotation.y = (random() - 0.5) * 0.5;
    s.root.add(tiller);

    // Pallet.
    const PY = 0.165 + lift, P_TOP = PY + 0.075;
    if (loaded) {
      const plastic = a.pallet === 'plastic';
      const wood = s.material({ pine: '#c9a06a', blue: '#2a5cb0', red: '#b8342a', plastic: '#1e2024' }[a.pallet], { roughness: plastic ? 0.5 : 0.9 });
      const raw = plastic ? wood : s.material('#b89060', { roughness: 0.95 });
      for (const z of [-0.46, 0, 0.46]) for (const x of [-0.52, 0, 0.52]) s.box([0.14, 0.09, 0.09], [x, PY - 0.0, z], raw);
      for (const z of [-0.46, 0, 0.46]) s.box([1.2, 0.02, 0.1], [0, PY + 0.055, z], wood);
      const n = plastic ? 1 : 7;
      for (let i = 0; i < n; i++) {
        const broken = !plastic && a.pallet === 'pine' && mood.wear > 0.5 && i === 5;
        const board = s.box(plastic ? [1.2, 0.03, 1.0] : [0.12, 0.02, broken ? 0.6 : 1.0], [plastic ? 0 : -0.54 + i * 0.18 + (random() - 0.5) * 0.01, P_TOP - 0.01, broken ? -0.2 : 0], wood);
        if (!plastic) board.rotation.y = (random() - 0.5) * 0.015;
      }
      for (const x of [-0.52, 0, 0.52]) s.box([0.1, 0.02, 1.0], [x, PY - 0.055, 0], wood);
    }

    // The load.
    const boxes: Item[] = [], marks: Item[] = [], balls: Item[] = [], caps: Item[] = [];
    const layers = a.load === 'empty' || a.load === 'none' ? 0 : 2 + Math.round(mood.density * 3);
    const shear = a.parked === 'abandoned' ? 0.035 + mood.energy * 0.03 : mood.wear * 0.012;
    const torn = a.wrap === 'torn';
    let top = P_TOP, opened: [number, number, number] | null = null, fallen: Item | null = null;
    const card = ['#b88a54', '#c29660', '#ad8250'], frozenCard = ['#eef2f4', '#e6ecf0', '#f4f6f6'];
    const crateColours = ['#d02a22', '#2452b8', '#2c8a4a', '#f2b81c', '#26282c', '#e8e8e4'];
    if (a.load === 'melons') {
      const bin = s.mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.78, 8, 1, true), new THREE.MeshStandardMaterial({ color: '#b88a54', roughness: 0.9, side: THREE.DoubleSide }), [0, P_TOP + 0.39, 0]);
      bin.rotation.y = Math.PI / 8; bin.scale.set(1.08, 1, 0.9);
      const band = s.mesh(new THREE.CylinderGeometry(0.525, 0.525, 0.2, 8, 1, true), s.material('#2c8a4a', { side: THREE.DoubleSide }), [0, P_TOP + 0.5, 0]);
      band.rotation.y = Math.PI / 8; band.scale.set(1.08, 1, 0.9);
      s.label('MELONS', 0.4, 0.13, [0, P_TOP + 0.5, 0.445], '#f4f1e6', '#2c8a4a');
      const heap = mix(0.72, 0.88, mood.density);
      const count = 14 + Math.round(mood.density * 14);
      for (let i = 0; i < count; i++) {
        const t = random() * 6.28, r = Math.sqrt(random()) * 0.36, up = random();
        balls.push({ at: [Math.cos(t) * r * 1.08, P_TOP + heap - 0.1 + up * 0.14 * (1 - r), Math.sin(t) * r * 0.9], size: [0.15, 0.13, 0.13], turn: random() * 3, tilt: random() * 3, colour: pick(['#2f7a3a', '#3a8a40', '#256a34', '#4a9a48']) });
      }
      s.cylinder(0.5, 0.5, 0.02, [0, P_TOP + heap - 0.16, 0], s.material('#3a2a1c'), 8).scale.set(1.08, 1, 0.9);
      top = P_TOP + 0.78;
    } else if (layers > 0) {
      const sacks = a.load === 'sacks';
      const h = { cartons: 0.3, frozen: 0.24, sacks: 0.15, water: 0.27, crates: 0.29 }[a.load as 'cartons'];
      const count = sacks ? layers * 2 : layers, sackBrand = pick(['#c8281e', '#1f5fb8', '#2f8a4a']);
      for (let layer = 0; layer < count; layer++) {
        const flip = sacks && layer % 2 === 1;
        const nx = flip ? 2 : 3, nz = flip ? 3 : 2;
        const dx = 1.16 / nx, dz = 0.98 / nz, y = P_TOP + layer * h + h / 2, off = layer * shear * (sacks ? 0.5 : 1);
        const last = layer === count - 1;
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
          const x = (i + 0.5) * dx - 0.58 + off + (random() - 0.5) * 0.012, z = (j + 0.5) * dz - 0.49 + (random() - 0.5) * 0.012 + off * 0.5;
          if (last && (torn || a.wrap === 'bare') && random() < (torn ? 0.4 : mix(0.5, 0.1, mood.density))) { if (!opened && torn) opened = [x, y - h, z]; continue; }
          const turn = (random() - 0.5) * 0.04;
          if (sacks) {
            boxes.push({ at: [x, y, z], size: [dx * 0.86, h * 0.8, dz * 0.86], turn, colour: '#d8c8a2' });
            balls.push({ at: [x, y, z], size: [dx * 0.56, h * 0.6, dz * 0.56], turn, colour: pick(['#e6d8b8', '#dccca8', '#efe4c8']) });
            marks.push({ at: [x, y, z], size: [dx * 0.25, h * 0.84, dz * 0.87], turn, colour: sackBrand });
          } else if (a.load === 'crates') {
            const colour = crateColours[(i * nz + j + (mood.cheer > 0.5 ? layer : 0)) % crateColours.length];
            boxes.push({ at: [x, y, z], size: [dx - 0.03, h - 0.012, dz - 0.03], turn, colour });
            for (const band of [-0.22, 0.14]) { marks.push({ at: [x, y + band * h, z], size: [dx - 0.024, h * 0.2, dz * 0.74], turn, colour: '#16181a' }); marks.push({ at: [x, y + band * h, z], size: [dx * 0.74, h * 0.2, dz - 0.024], turn, colour: '#16181a' }); }
            if (last) marks.push({ at: [x, y + h / 2 - 0.006, z], size: [dx - 0.07, 0.006, dz - 0.07], turn, colour: '#16181a' });
          } else if (a.load === 'water') {
            boxes.push({ at: [x, y, z], size: [dx - 0.02, h - 0.02, dz - 0.02], turn, colour: pick(['#9cd0f0', '#a8d8f4', '#8ec6ea']) });
            marks.push({ at: [x, y - 0.02, z], size: [dx - 0.014, h * 0.3, dz - 0.014], turn, colour: '#1f5fb8' });
            if (last) for (let u = 0; u < 4; u++) for (let v = 0; v < 6; v++) caps.push({ at: [x + (u - 1.5) * (dx - 0.06) / 4, y + h / 2 - 0.005, z + (v - 2.5) * (dz - 0.06) / 6], size: [0.022, 0.02, 0.022], colour: '#f4f8fa' });
          } else {
            const colour = pick(a.load === 'frozen' ? frozenCard : card);
            boxes.push({ at: [x, y, z], size: [dx - 0.014, h - 0.008, dz - 0.014], turn, colour });
            marks.push({ at: [x, y + h / 2 - 0.003, z], size: [dx - 0.012, 0.004, 0.06], turn, colour: a.load === 'frozen' ? '#2a7ad0' : '#d8c8a0' });
            marks.push({ at: [x, y, z], size: [dx * 0.5, h * 0.42, dz - 0.008], turn, colour: a.load === 'frozen' ? '#2a7ad0' : pick(['#f4f1e6', '#c8281e', '#26282c']) });
            marks.push({ at: [x, y - h * 0.05, z], size: [dx - 0.008, h * 0.3, dz * 0.4], turn, colour: a.load === 'frozen' ? '#9ccaf0' : '#8a6a3c' });
          }
        }
        if (a.load === 'water' && !last) boxes.push({ at: [off, y + h / 2, off * 0.5], size: [1.18, 0.008, 1.0], colour: '#b88a54' });
        top = y + h / 2;
      }
      if (a.parked === 'abandoned') {
        const fx = (random() - 0.5) * 0.8, fz = 0.82 + random() * 0.2;
        if (sacks) balls.push({ at: [fx, 0.07, fz], size: [0.3, 0.075, 0.17], turn: random() * 3, colour: '#e6d8b8' });
        else { fallen = { at: [fx, 0.14, fz], size: [0.37, 0.28, 0.46], turn: random() * 3, roll: Math.PI / 2, colour: a.load === 'crates' ? pick(crateColours) : a.load === 'water' ? '#9cd0f0' : a.load === 'frozen' ? '#eef2f4' : '#b88a54' }; boxes.push(fallen); }
      }
    }
    const matte = () => new THREE.MeshStandardMaterial({ roughness: a.load === 'water' ? 0.15 : 0.8 });
    s.root.add(instances(new THREE.BoxGeometry(1, 1, 1), matte(), boxes), instances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), marks), instances(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ roughness: a.load === 'melons' ? 0.35 : 0.9 }), balls), instances(new THREE.CylinderGeometry(0.5, 0.5, 1, 10), matte(), caps));

    // An opened carton with its flaps up.
    if (opened && (a.load === 'cartons' || a.load === 'frozen')) {
      const [x, y, z] = opened, h = a.load === 'frozen' ? 0.24 : 0.3, colour = a.load === 'frozen' ? '#eef2f4' : '#b88a54';
      const flapMat = s.material(colour, { side: THREE.DoubleSide, roughness: 0.9 });
      s.box([0.37, h, 0.47], [x, y + h + h / 2 - 0.004, z], flapMat);
      for (const side of [-1, 1]) { const flap = s.box([0.37, 0.006, 0.23], [x, y + h * 2 + 0.07, z + side * 0.3], flapMat); flap.rotation.x = side * (0.7 + random() * 0.5); }
      s.box([0.33, 0.01, 0.43], [x, y + h * 2 - 0.02, z], s.material(pick(['#c8281e', '#f2b81c', '#2f8a4a'])));
    }

    // Wrap.
    const loadH = top - P_TOP;
    if (loadH > 0.1 && a.wrap !== 'bare') {
      const drift = (layers - 1) * shear;
      if (a.wrap === 'strapped') {
        const strap = s.material('#1a1c20', { roughness: 0.5 });
        for (const x of [-0.3, 0.3]) { s.box([0.035, 0.004, 1.02], [x + drift, top + 0.004, drift / 2], strap); for (const side of [-1, 1]) s.box([0.035, loadH + 0.1, 0.004], [x + drift / 2, P_TOP + loadH / 2 - 0.04, side * 0.505 + drift / 4], strap); }
      } else {
        const film = paint(64, 256, (ctx) => {
          ctx.clearRect(0, 0, 64, 256);
          for (let y = 0; y < 256; y += 2) { ctx.fillStyle = `rgba(245,250,255,${0.16 + random() * 0.3 + (y % 34 < 5 ? 0.3 : 0)})`; ctx.fillRect(0, y, 64, 2); }
          if (torn) { ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= 64; x += 4) ctx.lineTo(x, 20 + random() * 50); ctx.lineTo(64, 0); ctx.fill(); }
        });
        const wrapH = torn ? loadH * 0.7 : loadH + 0.05;
        const shell = s.mesh(new THREE.BoxGeometry(1.2 + drift, wrapH, 1.02 + drift / 2), new THREE.MeshPhysicalMaterial({ map: film, transparent: true, roughness: 0.08, depthWrite: false, side: THREE.DoubleSide, opacity: 0.9 }), [drift / 2, P_TOP + wrapH / 2 - 0.03, drift / 4]);
        shell.castShadow = false; shell.renderOrder = 2;
        if (torn) {
          const rag = new THREE.MeshPhysicalMaterial({ color: '#f2f8fc', transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
          for (let i = 0; i < 5; i++) { const strip = s.mesh(new THREE.PlaneGeometry(0.1 + random() * 0.2, 0.3 + random() * 0.4), rag, [(random() - 0.5) * 1.0, P_TOP + wrapH - 0.1, 0.53 + random() * 0.03]); strip.rotation.z = (random() - 0.5) * 0.5; strip.rotation.x = 0.1; strip.castShadow = false; }
          s.ball([0.16, 0.1, 0.14], [0.3 + random() * 0.4, 0.09, 0.8], new THREE.MeshPhysicalMaterial({ color: '#f4f8fb', transparent: true, opacity: 0.6, roughness: 0.15 }), 10);
          // The box cutter.
          const kx = (random() - 0.5) * 0.5, kz = (random() - 0.5) * 0.4, turn = random() * 3;
          const knife = s.box([0.15, 0.018, 0.035], [kx, top + 0.011, kz], s.material('#f0c41c')); knife.rotation.y = turn;
          const blade = s.box([0.05, 0.004, 0.02], [kx + Math.cos(turn) * 0.095, top + 0.011, kz - Math.sin(turn) * 0.095], steel); blade.rotation.y = turn;
        }
      }
    }

    // Left with the load.
    const flatTop = a.load !== 'melons' && a.load !== 'sacks';
    const deck = loadH > 0.1 && flatTop ? top : loaded ? P_TOP : 0.14 + lift;
    const dxTop = (layers - 1) * shear;
    if (a.paperwork === 'invoice' && loadH > 0.1) {
      const sheet = s.label('DELIVERY NOTE', 0.24, 0.3, [0.25, P_TOP + Math.min(loadH * 0.6, 0.6), 0.53], '#3a3a40', '#f8f6ee'); sheet.rotation.z = (random() - 0.5) * 0.12;
    } else if (a.paperwork === 'hold' && loadH > 0.1) {
      const tag = s.label('HOLD', 0.5, 0.26, [-0.1, P_TOP + Math.min(loadH * 0.62, 0.7), 0.535], '#ffffff', '#d0201c'); tag.rotation.z = (random() - 0.5) * 0.16;
    } else if (a.paperwork === 'clipboard') {
      const turn = random() * 3; const x = dxTop + 0.2, z = 0.1;
      s.box([0.24, 0.012, 0.33], [x, deck + 0.008, z], s.material('#7a5632')).rotation.y = turn;
      s.box([0.21, 0.004, 0.28], [x, deck + 0.017, z], s.material('#f8f6ee')).rotation.y = turn;
      s.box([0.1, 0.02, 0.03], [x - Math.sin(turn) * 0.14, deck + 0.02, z - Math.cos(turn) * 0.14], steel).rotation.y = turn;
    } else if (a.paperwork === 'scanner') {
      const x = dxTop - 0.15, z = 0.15, turn = random() * 3;
      s.box([0.08, 0.04, 0.19], [x, deck + 0.022, z], rubber).rotation.y = turn;
      s.box([0.06, 0.006, 0.07], [x + Math.sin(turn) * 0.04, deck + 0.045, z + Math.cos(turn) * 0.04], new THREE.MeshStandardMaterial({ color: '#8cf0a8', emissive: '#4ce080', emissiveIntensity: 1.2 })).rotation.y = turn;
      s.box([0.05, 0.03, 0.05], [x - Math.sin(turn) * 0.07, deck + 0.02, z - Math.cos(turn) * 0.07], s.material('#f0c41c')).rotation.y = turn;
    } else if (a.paperwork === 'coffee') {
      const x = dxTop + 0.25, z = -0.2;
      s.cylinder(0.042, 0.03, 0.11, [x, deck + 0.055, z], s.material('#f4f1e6'), 14);
      s.cylinder(0.045, 0.045, 0.012, [x, deck + 0.115, z], s.material('#3a2a20'), 14);
      s.cylinder(0.04, 0.036, 0.045, [x, deck + 0.05, z], s.material('#8a5a34'), 14);
      for (const side of [0, 1]) { const glove = s.ball([0.1, 0.02, 0.06], [x - 0.3 + side * 0.06, deck + 0.02 + side * 0.02, z + 0.2 + side * 0.07], s.material('#e8a81c', { roughness: 0.9 }), 10); glove.rotation.y = 0.6 + side * 0.7; }
    }
    return s.finish();
  },
});
