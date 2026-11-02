import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type V3 = THREE.Vector3;
interface Item { matrix: THREE.Matrix4; color?: THREE.Color | string }
const UP = new THREE.Vector3(0, 1, 0);
const along = (from: V3, direction: V3, length: number, radius: number) =>
  new THREE.Matrix4().compose(from.clone().addScaledVector(direction, length / 2), new THREE.Quaternion().setFromUnitVectors(UP, direction), new THREE.Vector3(radius, length, radius));

function instanced(root: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, items: readonly Item[]) {
  if (!items.length) { geometry.dispose(); return; }
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  items.forEach((item, index) => {
    mesh.setMatrixAt(index, item.matrix);
    if (item.color !== undefined) mesh.setColorAt(index, new THREE.Color(item.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
}

const LISTS = {
  autumn: ['#8a3b1e', '#c0622a', '#d99a2b', '#6e6a2a', '#4b3a26', '#a8442f', '#e0b65a', '#7b5a2e', '#b5532a', '#55602c'],
  pastel: ['#f2a9bd', '#a9d3ef', '#f7e58e', '#b0dfb2', '#d3b5ea', '#fbc296', '#f3ecd9', '#9fd9d2'],
  mono: ['#151517', '#f4f1e8', '#8d8f92', '#3a3b3f', '#d9d6cc', '#5e6064', '#1f1f22', '#c2c0b8'],
  reds: ['#c8202b', '#e0527a', '#8e1626', '#f08aa6', '#d83a4e', '#b02a5c', '#f4b6c4', '#a31a1f'],
  sea: ['#16365f', '#2c6fa6', '#4fa3c7', '#2f8f8a', '#8fd0d6', '#1d4f7a', '#bfe3ea', '#3d5f9c'],
} as const;

export default defineThing({
  questions: {
    form: choice('What kind of rack is it?', {
      steps: 'A stepped wooden block of three tiers with upright pegs, home-made.',
      carousel: 'A round two-tier turntable with a turned knob, from a shop counter.',
      easel: 'A slanted peg board on fold-out legs, spools ranked in rows like a choir.',
    }),
    size: score('How big is the rack?', ['A handful of pegs', 'A household\'s worth', 'A dressmaker\'s full range']),
    palette: choice('What colours are the threads?', {
      rainbow: 'The full spectrum, every hue at full strength.',
      autumn: 'Rusts, mustards, olives and browns.',
      pastel: 'Baby pinks, blues, lemon and mint.',
      mono: 'Only black, white and greys, a tailor\'s sober stock.',
      reds: 'Nothing but reds, crimsons and pinks.',
      sea: 'Blues, teals and navies.',
    }),
    order: choice('How are the colours arranged?', {
      sorted: 'Ranged in careful order, shade melting into shade.',
      grouped: 'Roughly grouped, with strays.',
      jumbled: 'No order at all, put back wherever there was a peg.',
    }),
    full: score('How full are the pegs?', ['Nearly bare, a few spools left', 'Half the pegs empty', 'A few gaps', 'Every peg taken']),
    spools: choice('What are the spools like?', {
      wooden: 'Old waisted wooden reels with paper labels on the ends.',
      plastic: 'Modern straight plastic spools with white ends.',
      cones: 'Tall industrial cones for an overlocker.',
      mixed: 'A mixture gathered over decades.',
    }),
    state: choice('What has just happened to it?', {
      tidy: 'Nothing: every spool wound tight and squared away.',
      trailing: 'One loose end has unwound and trails down across the table.',
      fallen: 'Several spools have been knocked off and rolled away, unravelling.',
      spent: 'It has been worked hard: many reels are down to bare wood or a few last turns.',
    }),
    threadSurface: choice('What is the thread wound from?', {
      cotton: 'Soft matte cotton with closely wound turns.',
      silk: 'Smooth lustrous thread that catches a narrow highlight.',
      metallic: 'Metallic embroidery thread with bright reflective turns.',
      variegated: 'Variegated thread whose shade changes along the winding.',
    }),
    pegTips: choice('How are the spool pegs finished?', {
      plain: 'Plain wooden dowels.',
      brass: 'Brass pegs instead of wood.',
      capped: 'Small round brass caps finish the exposed peg tips.',
      tall: 'Long wooden pegs with dark flattened tips.',
    }),
    catalogue: choice('How is the thread stock identified?', {
      none: 'No extra catalogue.',
      numbers: 'A numbered stock card lists the occupied thread slots.',
      samples: 'A swatch card carries six real short thread samples.',
      weights: 'A thread-weight chart distinguishes fine, general and heavy thread.',
    }),
    winding: choice('What winding equipment accompanies the rack?', {
      none: 'No winding equipment.',
      hand: 'A small hand-cranked bobbin winder.',
      spindle: 'A vertical spare winding spindle on a broad base.',
      swift: 'A small crossed-arm skein holder on a spindle.',
    }),
    supply: choice('What supplies lie at the rack’s foot?', {
      none: 'No extra supplies.',
      bobbins: 'A little open box of wound machine bobbins.',
      cards: 'Two flat thread winding cards.',
      empty: 'An open box of empty wooden reels.',
    }),
    cover: choice('How is the stock protected while it waits?', {
      none: 'The rack is uncovered.',
      hood: 'A clear open-front hood surrounds the rack.',
      cloth: 'A small cloth canopy hangs over the rear of the rack.',
      screen: 'A low clear screen protects the front row from dust.',
    }),
    snips: noul('Is a small pair of thread snips left at its foot?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wood = s.material(mood.warmth > 0.5 ? '#b98a56' : '#a98a64', { roughness: 0.6 });
    const darkWood = s.material('#7b5632', { roughness: 0.6 });
    const big = a.size;
    const scale = a.spools === 'cones' ? 1.3 : 1;

    // Where the pegs stand.
    const slots: { at: V3; direction: V3 }[] = [];
    let front = 0.1, halfWidth = 0.1;
    if (a.form === 'easel') {
      const cols = Math.round(mix(4, 9, big)), rows = Math.round(mix(3, 5, big));
      const px = 0.044 * scale, py = 0.06 * scale, tilt = 0.22;
      const width = cols * px + 0.02, height = rows * py + 0.02;
      const u = new THREE.Vector3(0, Math.cos(tilt), -Math.sin(tilt)), n = new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt));
      const board = s.box([width, height, 0.014], [0, 0, 0], wood);
      board.position.copy(u.clone().multiplyScalar(height / 2 + 0.008));
      board.rotation.x = -tilt;
      for (const edge of [0.008, height + 0.008]) {
        const rail = s.box([width + 0.012, 0.014, 0.022], [0, 0, 0], darkWood);
        rail.position.copy(u.clone().multiplyScalar(edge));
        rail.rotation.x = -tilt;
      }
      const top = u.clone().multiplyScalar(height * 0.86);
      for (const x of [-1, 1]) s.rod([x * width * 0.36, top.y, top.z - 0.008], [x * width * 0.36, 0, top.z - 0.012 - height * 0.45], 0.006, darkWood);
      s.rod([-width * 0.36, top.y * 0.4, top.z - 0.012 - height * 0.45 * 0.6], [width * 0.36, top.y * 0.4, top.z - 0.012 - height * 0.45 * 0.6], 0.004, darkWood);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
        slots.push({ at: u.clone().multiplyScalar(0.03 + r * py).add(new THREE.Vector3((c - (cols - 1) / 2) * px, 0, 0)).addScaledVector(n, 0.007), direction: n.clone().addScaledVector(u, 0.12).normalize() });
      front = 0.085;
      halfWidth = width / 2;
    } else if (a.form === 'steps') {
      const cols = Math.round(mix(3, 8, big)), tiers = 3;
      const px = 0.044 * scale, depth = 0.046 * scale, rise = 0.034;
      const width = cols * px + 0.016;
      for (let t = 0; t < tiers; t++) {
        const z = (1 - t) * depth;
        s.box([width, rise * (t + 1), depth], [0, rise * (t + 1) / 2, z], t % 2 ? darkWood : wood);
        for (let c = 0; c < cols; c++) slots.push({ at: new THREE.Vector3((c - (cols - 1) / 2) * px, rise * (t + 1), z), direction: UP.clone() });
      }
      for (const x of [-1, 1]) s.box([0.008, rise * tiers + 0.006, depth * 3 + 0.006], [x * (width / 2 + 0.004), (rise * tiers + 0.006) / 2, 0], darkWood);
      front = depth * 1.5 + 0.01;
      halfWidth = width / 2;
    } else {
      const lower = Math.round(mix(7, 14, big)), upper = Math.round(mix(4, 8, big));
      const r1 = Math.max(0.06, lower * 0.044 * scale / (Math.PI * 2)), r2 = Math.max(0.03, upper * 0.044 * scale / (Math.PI * 2));
      s.cylinder(r1 + 0.026, r1 + 0.03, 0.012, [0, 0.006, 0], wood, 40);
      s.cylinder(r2 + 0.024, r2 + 0.024, 0.01, [0, 0.07 * scale, 0], wood, 32);
      s.cylinder(0.009, 0.012, 0.15 * scale, [0, 0.075 * scale, 0], darkWood, 14);
      s.ball([0.014, 0.014, 0.014], [0, 0.15 * scale + 0.01, 0], darkWood, 14);
      const spin = random() * 6;
      for (let i = 0; i < lower; i++) slots.push({ at: new THREE.Vector3(Math.cos(spin + i / lower * Math.PI * 2) * r1, 0.012, Math.sin(spin + i / lower * Math.PI * 2) * r1), direction: UP.clone() });
      for (let i = 0; i < upper; i++) slots.push({ at: new THREE.Vector3(Math.cos(spin + i / upper * Math.PI * 2) * r2, 0.07 * scale + 0.005, Math.sin(spin + i / upper * Math.PI * 2) * r2), direction: UP.clone() });
      front = r1 + 0.04;
      halfWidth = r1 + 0.03;
    }

    s.root.updateMatrixWorld(true);
    const rackBounds = new THREE.Box3().setFromObject(s.root);

    // Colours for every peg, then shuffled according to how carefully they were put back.
    const fade = mix(0, 0.2, mood.wear), vivid = mix(0.75, 1.1, mood.cheer);
    const tints = slots.map((_slot, index) => {
      const t = index / Math.max(1, slots.length);
      const tint = new THREE.Color();
      if (a.palette === 'rainbow') tint.setHSL((t * 0.92 + 0.98) % 1, Math.min(1, 0.78 * vivid), 0.48);
      else {
        const list = LISTS[a.palette];
        tint.set(list[Math.floor(t * list.length) % list.length]);
        const hsl = { h: 0, s: 0, l: 0 };
        tint.getHSL(hsl);
        tint.setHSL(hsl.h, Math.min(1, hsl.s * vivid), Math.min(0.95, Math.max(0.05, hsl.l + (random() - 0.5) * 0.08)));
      }
      return tint.lerp(new THREE.Color('#a39c8e'), fade);
    });
    const swaps = a.order === 'sorted' ? 0 : a.order === 'grouped' ? Math.ceil(slots.length * 0.18) : slots.length * 3;
    for (let i = 0; i < swaps; i++) {
      const p = Math.floor(random() * tints.length), q = Math.floor(random() * tints.length);
      [tints[p], tints[q]] = [tints[q], tints[p]];
    }

    const pegs: Item[] = [], thread: Item[] = [], cone: Item[] = [], low: Item[] = [], high: Item[] = [], cores: Item[] = [], labels: Item[] = [];
    const woodTint = '#d6b98a', plasticTint = '#f1efe8';
    const kinds = ['wooden', 'plastic', 'cones'] as const;
    const spool = (from: V3, direction: V3, tint: THREE.Color, amount: number) => {
      const kind = a.spools === 'mixed' ? kinds[Math.floor(random() * (a.form === 'easel' ? 2.4 : 2.2))] : a.spools;
      if (kind === 'cones') {
        const h = 0.062;
        low.push({ matrix: along(from, direction, 0.004, 0.021), color: plasticTint });
        cores.push({ matrix: along(from, direction, h + 0.008, 0.006), color: plasticTint });
        cone.push({ matrix: along(from.clone().addScaledVector(direction, 0.004), direction, h * mix(0.55, 1, amount), mix(0.01, 0.02, amount)), color: tint });
        return { height: h, radius: 0.021 };
      }
      const wooden = kind === 'wooden';
      const h = wooden ? 0.038 : 0.044, R = wooden ? 0.0155 : 0.0125, f = wooden ? 0.005 : 0.002;
      const endTint = wooden ? woodTint : plasticTint;
      low.push({ matrix: along(from, direction, f, R), color: endTint });
      high.push({ matrix: along(from.clone().addScaledVector(direction, h - f), direction, f, R), color: endTint });
      cores.push({ matrix: along(from, direction, h, 0.0062), color: endTint });
      thread.push({ matrix: along(from.clone().addScaledVector(direction, f), direction, h - f * 2, mix(0.0068, R * (wooden ? 0.95 : 1.04), amount)), color: tint });
      if (wooden) labels.push({ matrix: along(from.clone().addScaledVector(direction, h), direction, 0.0006, R * 0.72), color: tint.clone().lerp(new THREE.Color('#f0e8d0'), 0.15) });
      return { height: h, radius: R };
    };

    const fill = mix(0.22, 1, a.full) * mix(1, 0.85, mood.wear * (1 - a.full));
    const spent = a.state === 'spent';
    const taken: { at: V3; direction: V3; tint: THREE.Color; height: number; radius: number }[] = [];
    const knocked: THREE.Color[] = [];
    slots.forEach((slot, index) => {
      const pegLength = (a.pegTips === 'tall' ? 0.073 : 0.05) * scale;
      pegs.push({ matrix: along(slot.at, slot.direction, pegLength, 0.0032) });
      if (a.pegTips === 'capped' || a.pegTips === 'tall') {
        const tip = slot.at.clone().addScaledVector(slot.direction, pegLength);
        const cap = s.ball([0.004, 0.004, 0.004], [tip.x, tip.y, tip.z], s.material(a.pegTips === 'capped' ? '#c5a04f' : '#574736', { metalness: a.pegTips === 'capped' ? 0.75 : 0 }), 8);
        if (a.pegTips === 'tall') cap.scale.y *= 0.5;
      }
      const keep = random() < fill || (index === 0 && fill > 0.2);
      if (!keep) return;
      if (a.state === 'fallen' && random() < 0.2 && knocked.length < 6) { knocked.push(tints[index]); return; }
      const amount = spent ? (random() < 0.45 ? 0.02 + random() * 0.2 : random()) : mix(0.7, 1, random());
      const made = spool(slot.at.clone().addScaledVector(slot.direction, 0.0005), slot.direction, tints[index], amount);
      taken.push({ ...slot, tint: tints[index], ...made });
    });
    if (a.state === 'fallen' && knocked.length < 2 && tints.length) knocked.push(tints[Math.floor(random() * tints.length)], tints[0]);

    const threadMats: THREE.Material[] = [];
    const trail = (from: V3, tint: THREE.Color, heading: number, length: number) => {
      const points: [number, number, number][] = [[from.x, from.y, from.z]];
      let x = from.x, z = Math.max(from.z + 0.02, front + 0.012), turn = heading;
      if (from.y > 0.02) points.push([x, from.y * 0.5, (from.z + z) / 2 + 0.006]);
      points.push([x, 0.0012, z]);
      for (let i = 0; i < length; i++) {
        turn += (random() - 0.5) * 1.9;
        x = THREE.MathUtils.clamp(x + Math.cos(turn) * 0.02, -halfWidth - 0.05, halfWidth + 0.05);
        z += Math.abs(Math.sin(turn)) * 0.012 + 0.003;
        points.push([x, 0.0012, z]);
      }
      const material = s.material(tint, { roughness: 0.9 });
      threadMats.push(material);
      s.tube(points, 0.001, material);
    };

    if (a.state === 'trailing' && taken.length) {
      const pick = taken[Math.floor(random() * taken.length)];
      const side = pick.at.clone().addScaledVector(pick.direction, pick.height * 0.5).add(new THREE.Vector3(0, 0, pick.radius * 0.9));
      trail(side, pick.tint, random() * 3, 9 + Math.floor(random() * 5));
    }
    knocked.forEach((tint, index) => {
      const angle = random() * Math.PI;
      const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle) * 0.6).normalize();
      const at = new THREE.Vector3((random() - 0.5) * 2 * (halfWidth + 0.02), 0.0158 * (a.spools === 'cones' ? 1.35 : 1), front + 0.03 + random() * 0.07 + index * 0.004);
      const made = spool(at, direction, tint, mix(0.4, 1, random()));
      if (index < 3) trail(at.clone().addScaledVector(direction, made.height / 2).setY(made.radius * 0.3), tint, random() * 3, 5 + Math.floor(random() * 5));
    });

    const solid = (tint: string) => s.material(tint, { roughness: 0.7 });
    instanced(s.root, new THREE.CylinderGeometry(1, 1, 1, 8), a.pegTips === 'brass' ? s.material('#b99a56', { metalness: 0.75, roughness: 0.3 }) : wood, pegs);
    const windingCanvas = document.createElement('canvas'); windingCanvas.width = 64; windingCanvas.height = 128;
    const wc = windingCanvas.getContext('2d')!; wc.fillStyle = '#ffffff'; wc.fillRect(0, 0, 64, 128);
    for (let y = 0; y < 128; y += 4) { wc.fillStyle = a.threadSurface === 'variegated' ? `rgb(${150 + Math.round(90 * (0.5 + 0.5 * Math.sin(y * 0.11)))},${155 + Math.round(90 * (0.5 + 0.5 * Math.sin(y * 0.11)))},255)` : '#dededc'; wc.fillRect(0, y, 64, a.threadSurface === 'variegated' ? 4 : 1); }
    const windingMap = new THREE.CanvasTexture(windingCanvas); windingMap.colorSpace = THREE.SRGBColorSpace;
    const threadMaterial = s.material('#ffffff', { map: windingMap, metalness: a.threadSurface === 'metallic' ? 0.85 : 0, roughness: a.threadSurface === 'cotton' || a.threadSurface === 'variegated' ? 0.9 : 0.23 });
    instanced(s.root, new THREE.CylinderGeometry(1, 1, 1, 18), threadMaterial, thread);
    instanced(s.root, new THREE.CylinderGeometry(0.42, 1, 1, 18), threadMaterial, cone);
    instanced(s.root, new THREE.CylinderGeometry(0.66, 1, 1, 18), solid('#ffffff'), low);
    instanced(s.root, new THREE.CylinderGeometry(1, 0.66, 1, 18), solid('#ffffff'), high);
    instanced(s.root, new THREE.CylinderGeometry(1, 1, 1, 10), solid('#ffffff'), cores);
    instanced(s.root, new THREE.CylinderGeometry(1, 1, 1, 14), solid('#ffffff'), labels);

    if (a.snips) {
      const steel = s.material('#c9cdd0', { metalness: 0.85, roughness: 0.3 });
      const snips = new THREE.Group();
      for (const side of [-1, 1]) {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.05, 4), steel);
        blade.rotation.z = -Math.PI / 2;
        blade.scale.z = 0.35;
        blade.position.set(0.03, 0, side * 0.0012);
        blade.rotation.y = side * 0.12;
        const bow = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0016, 6, 18), steel);
        bow.rotation.x = Math.PI / 2;
        bow.position.set(-0.012, 0, side * 0.0085);
        snips.add(blade, bow);
      }
      snips.traverse((node) => { node.castShadow = true; });
      snips.position.set(-halfWidth * 0.6, 0.0025, front + 0.035);
      snips.rotation.y = random() * 2 - 1;
      s.root.add(snips);
    }

    if (a.catalogue !== 'none') {
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240;
      const c = canvas.getContext('2d')!; c.fillStyle = '#f0e7d1'; c.fillRect(0, 0, 320, 240); c.fillStyle = '#4b4031'; c.font = 'bold 26px sans-serif';
      c.fillText(a.catalogue === 'weights' ? 'THREAD WEIGHTS' : a.catalogue === 'samples' ? 'THREAD SAMPLES' : 'STOCK NUMBERS', 12, 34);
      c.font = '22px monospace';
      for (let k = 0; k < 6; k++) c.fillText(a.catalogue === 'weights' ? ['80 FINE', '60 LIGHT', '50 SEW', '40 QUILT', '30 TOP', '12 HEAVY'][k] : String(k + 1).padStart(2, '0'), 16, 67 + k * 28);
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      const paper = s.material('#f0e7d1'), face = s.material('#ffffff', { map });
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.002, 0.085), [paper, paper, face, paper, paper, paper]); card.position.set(-halfWidth - 0.075, 0.001, front); card.castShadow = true; s.root.add(card);
      if (a.catalogue === 'samples') for (let k = 0; k < 6; k++) s.rod([-halfWidth - 0.08, 0.0024, front - 0.024 + k * 0.009], [-halfWidth - 0.035, 0.0024, front - 0.024 + k * 0.009], 0.001, s.material(tints[k % tints.length]));
    }
    if (a.winding !== 'none') {
      const x = halfWidth + 0.065, z = 0;
      const metal = s.material('#b9c3c6', { metalness: 0.7, roughness: 0.3 });
      s.box([0.09, 0.012, 0.075], [x, 0.006, z], wood);
      const H = a.winding === 'hand' ? 0.065 : 0.14;
      s.rod([x, 0.012, z], [x, H, z], 0.005, darkWood);
      if (a.winding === 'hand') {
        s.rod([x - 0.022, H, z], [x + 0.028, H, z], 0.003, metal);
        s.cylinder(0.017, 0.017, 0.025, [x - 0.012, H, z], s.material(tints[0]), 20).rotation.z = Math.PI / 2;
        s.rod([x + 0.028, H, z], [x + 0.028, H - 0.018, z], 0.0025, metal);
        s.rod([x + 0.028, H - 0.018, z], [x + 0.042, H - 0.018, z], 0.0035, darkWood);
      } else if (a.winding === 'swift') {
        for (const alongX of [true, false]) {
          s.box([alongX ? 0.11 : 0.006, 0.006, alongX ? 0.006 : 0.11], [x, H, z], wood);
          for (const side of [-1, 1]) s.rod([x + (alongX ? side * 0.05 : 0), H, z + (alongX ? 0 : side * 0.05)], [x + (alongX ? side * 0.05 : 0), H + 0.025, z + (alongX ? 0 : side * 0.05)], 0.003, darkWood);
        }
        s.tube([[x - 0.05, H + 0.014, z], [x, H + 0.014, z - 0.05], [x + 0.05, H + 0.014, z], [x, H + 0.014, z + 0.05], [x - 0.05, H + 0.014, z]], 0.003, s.material(tints[0]));
      }
    }
    if (a.supply !== 'none') {
      const x = halfWidth * 0.55, z = front + 0.09;
      const paper = s.material('#e5d7bc');
      if (a.supply === 'cards') for (let k = 0; k < 2; k++) {
        s.box([0.035, 0.002, 0.055], [x + k * 0.04, 0.001, z], paper);
        s.box([0.036, 0.004, 0.033], [x + k * 0.04, 0.003, z], s.material(tints[k % tints.length]));
      } else {
        s.box([0.1, 0.003, 0.065], [x, 0.0015, z], wood);
        for (const side of [-1, 1]) { s.box([0.1, 0.015, 0.003], [x, 0.009, z + side * 0.031], wood); s.box([0.003, 0.015, 0.065], [x + side * 0.049, 0.009, z], wood); }
        for (let k = 0; k < 6; k++) {
          const cx = x - 0.03 + k % 3 * 0.03, cz = z - 0.014 + Math.floor(k / 3) * 0.028, H = a.supply === 'bobbins' ? 0.01 : 0.022;
          for (const y of [0.005, H + 0.003]) s.cylinder(0.011, 0.011, 0.003, [cx, y, cz], paper, 14);
          s.cylinder(a.supply === 'bobbins' ? 0.009 : 0.004, a.supply === 'bobbins' ? 0.009 : 0.004, H, [cx, H / 2 + 0.004, cz], a.supply === 'bobbins' ? s.material(tints[k % tints.length]) : wood, 14);
        }
      }
    }
    if (a.cover !== 'none') {
      const top = Math.max(rackBounds.max.y, ...slots.map(p => p.at.y + (a.spools === 'cones' ? 0.08 : 0.055))) + 0.025;
      const zBack = Math.min(rackBounds.min.z, ...slots.map(p => p.at.z)) - 0.045, zFront = Math.max(front, rackBounds.max.z) + 0.005;
      const transparent = s.material('#c3d6d9', { transparent: true, opacity: 0.17, depthWrite: false, roughness: 0.16 });
      if (a.cover === 'screen') {
        s.box([halfWidth * 2 + 0.04, top * 0.45, 0.002], [0, top * 0.225, zFront], transparent);
        for (const side of [-1, 1]) s.box([0.018, 0.01, 0.035], [side * halfWidth, 0.005, zFront], darkWood);
      } else {
        for (const x of [-halfWidth - 0.02, halfWidth + 0.02]) for (const z of [zBack, zFront]) s.rod([x, 0, z], [x, top, z], 0.003, darkWood);
        const width = halfWidth * 2 + 0.04, depth = zFront - zBack;
        if (a.cover === 'hood') {
          s.box([width, 0.002, depth], [0, top, (zBack + zFront) / 2], transparent);
          s.box([width, top, 0.002], [0, top / 2, zBack], transparent);
          for (const x of [-width / 2, width / 2]) s.box([0.002, top, depth], [x, top / 2, (zBack + zFront) / 2], transparent);
        } else {
          s.rod([-width / 2, top, zBack], [width / 2, top, zBack], 0.003, darkWood);
          s.rod([-width / 2, top, zBack + depth * 0.6], [width / 2, top, zBack + depth * 0.6], 0.003, darkWood);
          for (const side of [-1, 1]) s.rod([side * width / 2, top, zBack], [side * width / 2, top, zFront], 0.003, darkWood);
          s.drape({ size: [width, depth * 0.6], at: [0, top, zBack + depth * 0.3], hang: 'corners', floor: null, stiffness: 0.6, rumple: 0.15, detail: 14 }, s.material('#e3dac7', { side: THREE.DoubleSide }));
        }
      }
    }

    return s.finish();
  },
});
