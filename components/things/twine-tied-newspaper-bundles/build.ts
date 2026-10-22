import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
const HEADLINES = {
  triumph: 'Triumph: WAR IS OVER in the biggest type the paper owns.',
  disaster: 'Disaster: LINER SINKS, hundreds feared lost.',
  scandal: 'Scandal: MAYOR RESIGNS.',
  moon: 'Wonder: MEN WALK ON MOON.',
  election: 'Election morning: LANDSLIDE.',
  trivia: 'Local trivia: PRIZE PUMPKIN STOLEN.',
  extra: 'A rushed special: EXTRA! EXTRA!',
  final: 'The last issue ever, black-bordered: GOODBYE.',
} as const;
const WORDS: Record<keyof typeof HEADLINES, string[]> = {
  triumph: ['WAR IS', 'OVER'], disaster: ['LINER', 'SINKS'], scandal: ['MAYOR', 'RESIGNS'], moon: ['MEN WALK', 'ON MOON'], election: ['LAND-', 'SLIDE'], trivia: ['PRIZE', 'PUMPKIN', 'STOLEN'], extra: ['EXTRA!', 'EXTRA!'], final: ['GOOD-', 'BYE'],
};
const TITLES = {
  herald: 'THE DAILY HERALD, a sober morning broadsheet on white newsprint.',
  star: 'EVENING STAR, a loud city tabloid with a red masthead.',
  gazette: 'THE GAZETTE, a small-town weekly.',
  pink: 'SPORTING PINK, the late sports final on pink paper.',
  courier: 'THE COURIER, old and yellowed stock, a paper past its best days.',
} as const;
const TITLE_TEXT: Record<keyof typeof TITLES, [string, string, string]> = {
  herald: ['The Daily Herald', '#f1eee2', '#17181a'], star: ['EVENING STAR', '#f3f0e6', '#c2261c'], gazette: ['The Gazette', '#efece0', '#17181a'], pink: ['SPORTING PINK', '#f2c3c6', '#17181a'], courier: ['The Courier', '#e6d9ad', '#2a2418'],
};

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export default defineThing({
  questions: {
    headline: choice('What is the front-page headline?', HEADLINES),
    photo: choice('What is the front-page photograph?', {
      none: 'No picture: solid grey columns of type.',
      portrait: 'A head-and-shoulders portrait.',
      crowd: 'A cheering crowd with flags.',
      ship: 'A ship going down by the bow.',
      skyline: 'A city skyline.',
      smoke: 'A column of smoke.',
      pumpkin: 'An enormous vegetable with a rosette.',
    }),
    title: choice('Which newspaper is it?', TITLES),
    amount: score('How many bundles are there?', ['One bundle', 'A small stack', 'A full load', 'A wall of them']),
    carrier: choice('What are they stacked on?', {
      floor: 'Dropped straight on the pavement.',
      truck: 'A two-wheeled hand truck.',
      cart: 'A flat four-wheeled cart with a push handle.',
      pallet: 'A wooden pallet.',
    }),
    state: choice('What state are the bundles in?', {
      fresh: 'Square, tight and just tied, ink still wet.',
      opened: 'One has been cut open and its copies are fanned out loose.',
      tumbled: 'One has been thrown and landed on its side, as if off the back of a truck.',
      returns: 'Unsold returns, slumped and tagged to go back for pulping.',
    }),
    shown: choice('How is the front page shown off?', {
      flat: 'Only lying flat on top of the bundles.',
      propped: 'One copy is propped upright against the stack.',
      bill: 'A news bill poster on a wire stand shouts the headline beside them.',
    }),
    tie: choice('What ties the bundles?', {
      twine: 'Rough hemp twine with a knot on top.',
      wire: 'Thin baling wire, twisted.',
      strap: 'Flat yellow plastic strapping.',
      red: 'Red string, a small paper\'s habit.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [masthead, stock, mastInk] = TITLE_TEXT[a.title];
    const paperTone = new THREE.Color(stock).lerp(new THREE.Color('#cdb880'), Math.max(0, mood.wear - 0.5) * 0.7 + (a.state === 'returns' ? 0.25 : 0));
    const tone = `#${paperTone.getHexString()}`;
    const ink = '#1b1b1d';
    const words = WORDS[a.headline];

    const drawPhoto = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      g.save();
      g.beginPath(); g.rect(x, y, w, h); g.clip();
      g.fillStyle = '#8f8f8c';
      g.fillRect(x, y, w, h);
      g.fillStyle = '#2d2d2f';
      const cx = x + w / 2, by = y + h;
      if (a.photo === 'portrait') {
        g.beginPath(); g.arc(cx, y + h * 0.4, h * 0.22, 0, 7); g.fill();
        g.beginPath(); g.ellipse(cx, by, w * 0.36, h * 0.34, 0, 0, 7); g.fill();
      } else if (a.photo === 'crowd') {
        for (let i = 0; i < 26; i++) { const px = x + random() * w, py = y + h * (0.55 + random() * 0.4); g.beginPath(); g.arc(px, py, h * 0.07, 0, 7); g.fill(); g.fillRect(px - h * 0.07, py, h * 0.14, h); }
        g.fillStyle = '#e9e9e4';
        for (let i = 0; i < 5; i++) { const px = x + w * (0.1 + i * 0.2), py = y + h * (0.12 + random() * 0.2); g.fillRect(px, py, w * 0.11, h * 0.14); g.fillStyle = '#2d2d2f'; g.fillRect(px - 3, py, 3, h * 0.5); g.fillStyle = '#e9e9e4'; }
      } else if (a.photo === 'ship') {
        g.fillStyle = '#5a5a5c'; g.fillRect(x, y + h * 0.7, w, h * 0.3);
        g.fillStyle = '#2d2d2f';
        g.translate(cx, y + h * 0.66); g.rotate(-0.42);
        g.fillRect(-w * 0.34, -h * 0.1, w * 0.68, h * 0.18);
        for (let i = 0; i < 3; i++) g.fillRect(-w * 0.2 + i * w * 0.16, -h * 0.3, w * 0.07, h * 0.22);
      } else if (a.photo === 'skyline') {
        for (let i = 0; i < 9; i++) { const bw = w / 9, bh = h * (0.3 + random() * 0.55); g.fillRect(x + i * bw, by - bh, bw - 2, bh); }
      } else if (a.photo === 'smoke') {
        g.fillRect(x, y + h * 0.82, w, h * 0.2);
        for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(cx + (random() - 0.5) * w * (0.15 + i * 0.05), by - h * 0.2 - i * h * 0.065, h * (0.08 + i * 0.016), 0, 7); g.fill(); }
      } else if (a.photo === 'pumpkin') {
        g.beginPath(); g.ellipse(cx, y + h * 0.62, w * 0.34, h * 0.3, 0, 0, 7); g.fill();
        g.fillRect(cx - 5, y + h * 0.2, 10, h * 0.16);
        g.fillStyle = '#e9e9e4'; g.beginPath(); g.arc(cx + w * 0.22, y + h * 0.42, h * 0.1, 0, 7); g.fill();
      }
      g.restore();
    };
    const columns = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, count: number) => {
      g.fillStyle = '#6a6a6c';
      const cw = w / count;
      for (let c = 0; c < count; c++) for (let ly = y; ly < y + h; ly += 9) g.fillRect(x + c * cw + 4, ly, (cw - 10) * (random() < 0.12 ? 0.6 : 1), 4);
    };
    const pageTexture = paint(384, 512, (g) => {
      g.fillStyle = tone;
      g.fillRect(0, 0, 384, 512);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = mastInk;
      g.font = `900 ${a.title === 'star' || a.title === 'pink' ? 44 : 46}px ${a.title === 'star' || a.title === 'pink' ? 'sans-serif' : 'serif'}`;
      g.fillText(masthead, 192, 40, 350);
      g.fillStyle = ink;
      g.fillRect(14, 70, 356, 4);
      g.fillRect(14, 86, 356, 2);
      const size = Math.min(words.length > 2 ? 78 : 112, 640 / Math.max(...words.map((word) => word.length)));
      g.font = `900 ${size}px sans-serif`;
      words.forEach((word, index) => g.fillText(word, 192, 96 + size * 0.55 + index * size * 0.95, 350));
      const below = 104 + words.length * size * 0.95;
      g.fillRect(14, below, 356, 3);
      if (a.photo === 'none') columns(g, 14, below + 14, 356, 500 - below - 14, 5);
      else { drawPhoto(g, 14, below + 12, 220, 500 - below - 14); columns(g, 244, below + 14, 126, 500 - below - 14, 2); }
      if (a.headline === 'final') { g.strokeStyle = ink; g.lineWidth = 16; g.strokeRect(8, 8, 368, 496); }
    });
    const edgeTexture = paint(64, 128, (g) => {
      g.fillStyle = tone;
      g.fillRect(0, 0, 64, 128);
      for (let y = 0; y < 128; y += 3) { g.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.1)'; g.fillRect(0, y, 64, 1); }
    });
    const pageMaterial = new THREE.MeshStandardMaterial({ map: pageTexture, roughness: 0.92 });
    const edgeMaterial = new THREE.MeshStandardMaterial({ map: edgeTexture, roughness: 0.95 });
    const plain = new THREE.MeshStandardMaterial({ color: tone, roughness: 0.95 });
    const BW = 0.3, BD = 0.4;

    // Carrier and the slots bundles can occupy, bottom layer first.
    const slots: { at: P3; lean: number }[] = [];
    const steel = s.material('#5d6668', { metalness: 0.5, roughness: 0.45 });
    const rubber = s.material('#1c1d1f', { roughness: 0.8 });
    const wood = s.material('#a8824f', { roughness: 0.9 });
    const maxLayers = Math.round(mix(1, 4.4, a.amount));
    let baseY = 0, frontZ = 0.25, sideX = 0.25;
    const grid = (cols: number, rows: number, layers: number) => {
      for (let layer = 0; layer < layers; layer++) for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++)
        slots.push({ at: [(col - (cols - 1) / 2) * (BW + 0.03), layer, (row - (rows - 1) / 2) * (BD + 0.03)], lean: 0 });
      frontZ = rows * (BD + 0.03) / 2;
      sideX = cols * (BW + 0.03) / 2;
    };
    if (a.carrier === 'floor') grid(a.amount > 0.6 ? 3 : 2, a.amount > 0.8 ? 2 : 1, maxLayers);
    else if (a.carrier === 'truck') {
      baseY = 0.02;
      grid(1, 1, Math.min(5, maxLayers + 1));
      s.box([0.36, 0.012, 0.3], [0, 0.012, 0.02], steel);
      for (const side of [-1, 1]) {
        s.rod([side * 0.17, 0.02, -0.23], [side * 0.17, 1.2, -0.3], 0.014, steel);
        const wheel = s.cylinder(0.11, 0.11, 0.045, [side * 0.23, 0.11, -0.3], rubber, 20);
        wheel.rotation.z = Math.PI / 2;
        s.cylinder(0.04, 0.04, 0.05, [side * 0.23, 0.11, -0.3], steel, 12).rotation.z = Math.PI / 2;
      }
      for (const y of [0.35, 0.7, 1.05]) s.rod([-0.17, y, -0.23 - y * 0.06], [0.17, y, -0.23 - y * 0.06], 0.01, steel);
      s.tube([[-0.17, 1.2, -0.3], [-0.15, 1.3, -0.36], [0, 1.33, -0.38], [0.15, 1.3, -0.36], [0.17, 1.2, -0.3]], 0.014, steel);
      s.rod([-0.23, 0.11, -0.3], [0.23, 0.11, -0.3], 0.012, steel);
    } else if (a.carrier === 'cart') {
      baseY = 0.25;
      grid(2, 2, Math.min(4, maxLayers));
      s.box([0.76, 0.05, 1.0], [0, 0.225, 0], wood);
      s.box([0.8, 0.03, 1.04], [0, 0.19, 0], steel);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        s.cylinder(0.085, 0.085, 0.04, [sx * 0.3, 0.085, sz * 0.38], rubber, 18).rotation.z = Math.PI / 2;
        s.box([0.02, 0.1, 0.03], [sx * 0.3, 0.14, sz * 0.38], steel);
      }
      s.tube([[-0.34, 0.2, -0.5], [-0.34, 0.9, -0.56], [-0.3, 0.98, -0.57], [0.3, 0.98, -0.57], [0.34, 0.9, -0.56], [0.34, 0.2, -0.5]], 0.016, steel);
      frontZ = 0.52; sideX = 0.4;
    } else {
      baseY = 0.14;
      grid(3, 2, Math.min(4, maxLayers));
      for (let i = 0; i < 7; i++) s.box([0.13, 0.022, 0.96], [-0.48 + i * 0.16, 0.129, 0], wood);
      for (const z of [-0.42, 0, 0.42]) s.box([1.1, 0.09, 0.09], [0, 0.07, z], wood);
      for (let i = 0; i < 3; i++) s.box([0.13, 0.022, 0.96], [-0.44 + i * 0.44, 0.012, 0], wood);
      frontZ = 0.5; sideX = 0.56;
    }
    const total = Math.max(1, Math.min(slots.length, Math.round(slots.length * mix(0.55, 1, a.amount) - random() * 1.2)));

    // Bundles and their ties, instanced.
    const bundleGeometry = new THREE.BoxGeometry(BW, 1, BD);
    const bundles = new THREE.InstancedMesh(bundleGeometry, [edgeMaterial, edgeMaterial, pageMaterial, plain, edgeMaterial, edgeMaterial], total + 1);
    const tieColour = { twine: '#b9955a', wire: '#8a9092', strap: '#f0c419', red: '#c2261c' }[a.tie];
    const tieMaterial = s.material(tieColour, { roughness: a.tie === 'wire' ? 0.3 : 0.9, metalness: a.tie === 'wire' ? 0.8 : 0 });
    const tieWidth = a.tie === 'strap' ? 0.016 : a.tie === 'wire' ? 0.004 : 0.007;
    const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), tieMaterial, (total + 1) * 6);
    const knots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.012, 8, 6), tieMaterial, total + 1);
    let tieCount = 0, bundleCount = 0;
    const matrix = new THREE.Matrix4(), local = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const heights: number[] = [];
    const columnTop = new Map<string, number>();
    const tags: { at: THREE.Vector3; turn: number }[] = [];
    const place = (position: THREE.Vector3, rotation: THREE.Euler, h: number, tied: boolean) => {
      q.setFromEuler(rotation);
      matrix.compose(position, q, new THREE.Vector3(1, h, 1));
      bundles.setMatrixAt(bundleCount, matrix);
      const frame = new THREE.Matrix4().compose(position, q, new THREE.Vector3(1, 1, 1));
      if (tied) {
        const t = tieWidth, g = 0.004;
        const segments: [P3, P3][] = [
          [[BW + g * 2, t * 0.5, t], [0, h / 2 + g, 0.04]], [[t * 0.5, h + g * 2, t], [BW / 2 + g, 0, 0.04]], [[t * 0.5, h + g * 2, t], [-BW / 2 - g, 0, 0.04]],
          [[t, t * 0.5, BD + g * 2], [-0.02, h / 2 + g, 0]], [[t, h + g * 2, t * 0.5], [-0.02, 0, BD / 2 + g]], [[t, h + g * 2, t * 0.5], [-0.02, 0, -BD / 2 - g]],
        ];
        for (const [size, at] of segments) {
          local.compose(new THREE.Vector3(...at), new THREE.Quaternion(), new THREE.Vector3(...size));
          ties.setMatrixAt(tieCount++, local.premultiply(frame));
        }
        local.makeTranslation(-0.02, h / 2 + 0.01, 0.04);
        knots.setMatrixAt(bundleCount, local.premultiply(frame));
      } else knots.setMatrixAt(bundleCount, new THREE.Matrix4().makeScale(0, 0, 0));
      bundleCount++;
    };
    const slump = a.state === 'returns' ? 0.2 : mix(0.03, 0.1, mood.energy);
    let topSpot = new THREE.Vector3(0, baseY, 0), topHeight = 0.2;
    for (let i = 0; i < total; i++) {
      const slot = slots[i];
      const key = `${slot.at[0].toFixed(2)}:${slot.at[2].toFixed(2)}`;
      const y0 = columnTop.get(key) ?? baseY;
      const h = (a.state === 'returns' ? 0.15 : 0.19) + random() * 0.07;
      const position = new THREE.Vector3(slot.at[0] + (random() - 0.5) * 0.03, y0 + h / 2 + 0.004, slot.at[2] + (random() - 0.5) * 0.03);
      const rotation = new THREE.Euler((random() - 0.5) * slump * 0.3, (random() - 0.5) * slump * 2.5, (random() - 0.5) * slump * 0.3);
      const last = i === total - 1;
      if (last && a.state === 'tumbled' && total > 1) {
        position.set(sideX + 0.32 + random() * 0.1, BW / 2 + 0.004, frontZ * 0.4 + random() * 0.2);
        rotation.set(0.1, 0.5 + random(), Math.PI / 2);
        place(position, rotation, h, true);
      } else if (last && a.state === 'opened') {
        place(position, rotation, h * 0.55, false);
        topSpot = position.clone(); topHeight = h * 0.55;
        columnTop.set(key, y0 + h * 0.55 + 0.004);
      } else {
        place(position, rotation, h, true);
        columnTop.set(key, y0 + h + 0.008);
        if (a.state === 'returns') tags.push({ at: position.clone().add(new THREE.Vector3(0.06, h / 2 + 0.012, 0.1)), turn: rotation.y + (random() - 0.5) });
        topSpot = position.clone(); topHeight = h;
      }
      heights.push(h);
    }
    bundles.count = bundleCount;
    knots.count = bundleCount;
    ties.count = tieCount;
    for (const mesh of [bundles, ties, knots]) { mesh.castShadow = mesh.receiveShadow = true; mesh.instanceMatrix.needsUpdate = true; s.root.add(mesh); }
    if (a.tie !== 'twine' && a.tie !== 'red') knots.visible = false;

    const multi = (geometry: THREE.BufferGeometry, materials: THREE.Material[], at: P3) => {
      const mesh = new THREE.Mesh(geometry, materials);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    // Loose copies from a cut bundle.
    const copyGeometry = new THREE.BoxGeometry(BW, 0.008, BD);
    const copyMaterials = [plain, plain, pageMaterial, plain, plain, plain];
    let flutter: THREE.Object3D | null = null;
    if (a.state === 'opened') {
      for (let i = 0; i < 5; i++) {
        const copy = multi(copyGeometry, copyMaterials, [topSpot.x + (random() - 0.5) * 0.05 + i * 0.012, topSpot.y + topHeight / 2 + 0.006 + i * 0.009, topSpot.z + i * 0.03]);
        copy.rotation.y = (random() - 0.5) * 0.5 + i * 0.08;
        flutter = copy;
      }
      s.tube([[topSpot.x - 0.2, 0.006, topSpot.z + 0.3], [topSpot.x - 0.1, 0.03, topSpot.z + 0.34], [topSpot.x, 0.006, topSpot.z + 0.31], [topSpot.x + 0.12, 0.02, topSpot.z + 0.36]].map(([x, y, z]) => [x, Math.max(y, 0.006), Math.max(z, frontZ + 0.08)] as P3), tieWidth * 0.5, tieMaterial);
    }
    for (const tag of tags.slice(-4)) {
      const label = s.label('RETURN', 0.13, 0.05, [tag.at.x, tag.at.y, tag.at.z], '#17181a', '#f0c419');
      label.rotation.x = -Math.PI / 2;
      label.rotation.z = tag.turn;
    }

    // A copy propped up, or a news bill on a wire stand.
    if (a.shown === 'propped') {
      const lean = 0.3;
      const upright = new THREE.BoxGeometry(BW * 1.5, BD * 1.5, 0.012);
      const copy = multi(upright, [plain, plain, plain, plain, pageMaterial, plain], [-sideX * 0.3, BD * 0.75 * Math.cos(lean) + 0.004, frontZ + 0.09 + BD * 0.75 * Math.sin(lean)]);
      copy.rotation.x = -lean;
      copy.rotation.y = (random() - 0.5) * 0.3;
    } else if (a.shown === 'bill') {
      const bx = sideX + 0.42, bz = frontZ * 0.5;
      const bill = paint(256, 384, (g) => {
        g.fillStyle = a.headline === 'final' ? '#17181a' : '#f6f2e4';
        g.fillRect(0, 0, 256, 384);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = a.headline === 'final' ? '#f6f2e4' : mastInk === '#c2261c' ? mastInk : '#c2261c';
        g.font = '900 30px sans-serif';
        g.fillText(masthead.toUpperCase(), 128, 34, 236);
        g.fillRect(12, 58, 232, 5);
        g.fillStyle = a.headline === 'final' ? '#f6f2e4' : '#17181a';
        const size = Math.min(words.length > 2 ? 86 : 118, 430 / Math.max(...words.map((word) => word.length)));
        g.font = `900 ${size}px sans-serif`;
        words.forEach((word, index) => g.fillText(word, 128, 210 + (index - (words.length - 1) / 2) * size * 1.05, 236));
      });
      const frame = new THREE.Group();
      frame.position.set(bx, 0, bz);
      frame.rotation.y = -0.35 + (random() - 0.5) * 0.2;
      s.root.add(frame);
      const board = multi(new THREE.BoxGeometry(0.5, 0.75, 0.012), [plain, plain, plain, plain, new THREE.MeshStandardMaterial({ map: bill, roughness: 0.9 }), plain], [0, 0.5, 0]);
      board.rotation.x = -0.22;
      frame.add(board);
      for (const side of [-1, 1]) {
        frame.add(s.rod([side * 0.26, 0, 0.11], [side * 0.26, 0.9, -0.09], 0.008, steel));
        frame.add(s.rod([side * 0.26, 0.86, -0.08], [side * 0.26, 0, -0.34], 0.008, steel));
      }
      frame.add(s.rod([-0.26, 0.9, -0.09], [0.26, 0.9, -0.09], 0.008, steel));
      frame.add(s.rod([-0.26, 0.12, 0.085], [0.26, 0.12, 0.085], 0.008, steel));
    }
    // Scraps of cut twine and a stray sheet when things are busy.
    const scraps = Math.round(mood.density * 4);
    for (let i = 0; i < scraps; i++) {
      const sheet = s.box([BW, 0.002, BD], [(random() - 0.5) * (sideX * 2 + 0.2), 0.003 + i * 0.002, frontZ + 0.16 + random() * 0.18], plain);
      sheet.rotation.y = random() * 3;
    }

    const rest = flutter ? flutter.rotation.z : 0;
    const wind = mix(0, 0.05, mood.energy);
    return s.finish({ update: (_dt, time) => { if (flutter) flutter.rotation.z = rest + Math.max(0, Math.sin(time * 2.1)) * wind; } });
  },
});
