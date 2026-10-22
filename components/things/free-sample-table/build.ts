import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
interface Item { at: P3; size: P3; turn?: number; tilt?: number; roll?: number; colour: THREE.ColorRepresentation }
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
const PRODUCT = {
  sausage: { name: 'SMOKED SAUSAGE', pack: '#8a2a1c', food: ['#8a4a2a', '#7a3a22', '#9a5a34'] },
  dumplings: { name: 'POT STICKERS', pack: '#c8281e', food: ['#ead8b0', '#e0c898', '#d8b070'] },
  cheese: { name: 'AGED CHEDDAR', pack: '#1f4fa8', food: ['#f0b428', '#f5c83a', '#e8a81c'] },
  pizza: { name: 'PIZZA BITES', pack: '#2c8a4a', food: ['#d8482a', '#e8b84a', '#c8381e'] },
  meatballs: { name: 'MEATBALLS', pack: '#5a2a1c', food: ['#6a3a22', '#7a4428', '#5a3018'] },
  juice: { name: 'FRESH JUICE', pack: '#f08a1c', food: ['#f09a1c', '#e8483a', '#8ac83a'] },
  mystery: { name: 'PLANT PROTEIN', pack: '#4a7a4a', food: ['#b8a888', '#a89878', '#c8b898'] },
} as const;

export default defineThing({
  questions: {
    sample: choice('What is being sampled?', {
      sausage: 'Coins of smoked sausage browning in the skillet.',
      dumplings: 'Pan-fried pot stickers, pale crescents with a golden side.',
      cheese: 'Cubes of orange cheddar, no cooking needed, the skillet sitting idle.',
      pizza: 'Pizza bites cut into tiny squares.',
      meatballs: 'Meatballs rolling in red sauce.',
      juice: 'Thimbles of bright juice and smoothie poured from a jug.',
      mystery: 'Beige cubes of a new plant-based protein nobody asked for.',
    }),
    state: choice('What is going on at the stand?', {
      sizzling: 'Attended a second ago: steam rising, tongs in the pan, the indicator light on.',
      justleft: 'The demonstrator has stepped away: apron thrown over the corner, pan still warm.',
      cold: 'Deserted for hours: the skillet off, the samples congealed and dull.',
      packed: 'Being packed up: lid on, cord wound, cups stacked, a supply box open on the table.',
    }),
    sign: choice('What does the sign on the table say?', {
      free: 'FREE SAMPLES',
      tryme: 'TRY ME!',
      fresh: 'NEW! with a starburst.',
      one: 'ONE PER CUSTOMER PLEASE',
      back: 'BACK IN 5 MIN',
      today: 'TODAY ONLY and a price.',
    }),
    left: score('How much is left on the sample tray?', ['Picked clean: empty cups and stray toothpicks', 'A last few', 'About half', 'Freshly loaded, every cup full']),
    skirt: choice('What is the table skirt like?', {
      red: 'Pleated red cloth, cheerful and cheap.',
      gingham: 'Red and white gingham, a picnic pretending.',
      black: 'Black cloth, a smarter store.',
      green: 'Grocer green with a white band.',
      white: 'A white paper tablecloth taped at the corners.',
    }),
    beside: choice('What stands on the floor beside the table?', {
      nothing: 'Nothing.',
      stack: 'A pyramid of the product for sale on a cardboard case.',
      cooler: 'A plastic cooler chest holding the stock.',
      bin: 'A swing-top bin for the used cups.',
    }),
    mess: noul('Are used cups and toothpicks littered over the table and floor?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const product = PRODUCT[a.sample];
    const W = 1.22, D = 0.62, TOP = 0.76;
    const steel = s.material('#c2c8cc', { metalness: 0.85, roughness: 0.28 });
    const black = s.material('#1c1c20', { roughness: 0.45 });
    const white = s.material('#f4f2ea', { roughness: 0.7 });
    const cold = a.state === 'cold', hot = a.state === 'sizzling' || a.state === 'justleft', packed = a.state === 'packed';
    const dull = (colour: string) => { const c = new THREE.Color(colour); if (cold) c.lerp(new THREE.Color('#8a8272'), 0.45).multiplyScalar(0.85); return c; };

    // Table: top, folding legs, pleated skirt on three sides.
    s.box([W, 0.03, D], [0, TOP - 0.015, 0], white);
    for (const x of [-1, 1]) { for (const z of [-1, 1]) s.rod([x * (W / 2 - 0.1), TOP - 0.03, z * (D / 2 - 0.06)], [x * (W / 2 - 0.1), 0, z * (D / 2 - 0.06)], 0.014, steel); s.rod([x * (W / 2 - 0.1), 0.2, -D / 2 + 0.06], [x * (W / 2 - 0.1), 0.2, D / 2 - 0.06], 0.01, steel); }
    const skirtBase = { red: '#c8281e', gingham: '#f4f2ea', black: '#1e1e22', green: '#2c7a44', white: '#f6f4ec' }[a.skirt];
    const skirtArt = paint(512, 256, (ctx) => {
      ctx.fillStyle = skirtBase; ctx.fillRect(0, 0, 512, 256);
      if (a.skirt === 'gingham') { ctx.fillStyle = 'rgba(200,40,30,0.55)'; for (let i = 0; i < 16; i += 2) { ctx.fillRect(i * 32, 0, 32, 256); ctx.fillRect(0, i * 32, 512, 32); } }
      if (a.skirt === 'green') { ctx.fillStyle = '#f4f2ea'; ctx.fillRect(0, 200, 512, 22); }
      // Pleat shading.
      if (a.skirt !== 'white') for (let x = 0; x < 512; x += 16) { const g = ctx.createLinearGradient(x, 0, x + 16, 0); g.addColorStop(0, 'rgba(0,0,0,0.22)'); g.addColorStop(0.5, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.22)'); ctx.fillStyle = g; ctx.fillRect(x, 0, 16, 256); }
      for (let i = 0; i < mood.wear * 14; i++) { ctx.fillStyle = `rgba(70,50,30,${0.1 + random() * 0.2})`; ctx.beginPath(); ctx.ellipse(random() * 512, 60 + random() * 190, 8 + random() * 26, 6 + random() * 16, random() * 3, 0, 7); ctx.fill(); }
    });
    const cloth = new THREE.MeshStandardMaterial({ map: skirtArt, roughness: 0.95, side: THREE.DoubleSide });
    const drape = (width: number, at: P3, turn: number) => {
      const segs = Math.round(width * 52), h = TOP - 0.04;
      const g = new THREE.PlaneGeometry(width, h, segs, 1);
      const pos = g.attributes.position;
      if (a.skirt !== 'white') for (let i = 0; i < pos.count; i++) pos.setZ(i, (i % 2 ? 0.012 : -0.012) * (pos.getY(i) < 0 ? 1.5 : 0.6));
      g.computeVertexNormals();
      const mesh = s.mesh(g, cloth, [at[0], h / 2 + 0.015, at[2]]); mesh.rotation.y = turn; return mesh;
    };
    drape(W + 0.02, [0, 0, D / 2 + 0.012], 0);
    drape(D + 0.02, [W / 2 + 0.012, 0, 0], Math.PI / 2); drape(D + 0.02, [-W / 2 - 0.012, 0, 0], -Math.PI / 2);
    s.box([W + 0.05, 0.035, D + 0.05], [0, TOP - 0.02, 0], s.material(a.skirt === 'gingham' ? '#c8281e' : skirtBase, { roughness: 0.9 }));
    s.box([W - 0.02, 0.006, D - 0.02], [0, TOP + 0.001, 0], a.skirt === 'white' ? s.material('#f6f4ec') : white);
    // Banner on the front of the skirt.
    const banner = paint(512, 128, (ctx) => { ctx.fillStyle = '#fff6d0'; ctx.fillRect(0, 0, 512, 128); ctx.fillStyle = product.pack; ctx.fillRect(0, 0, 512, 14); ctx.fillRect(0, 114, 512, 14); ctx.font = 'italic 900 58px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(product.name, 256, 66, 480); });
    const bannerMesh = s.mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshStandardMaterial({ map: banner, roughness: 0.8 }), [0, 0.48, D / 2 + 0.034]);
    bannerMesh.rotation.z = (random() - 0.5) * 0.05 * (1 + mood.wear * 2); bannerMesh.castShadow = false;

    const boxes: Item[] = [], balls: Item[] = [], cups: Item[] = [], picks: Item[] = [];
    const foodBit = (x: number, y: number, z: number, scale = 1) => {
      const colour = dull(pick(product.food)), turn = random() * 3;
      if (a.sample === 'sausage') cups.push({ at: [x, y + 0.006 * scale, z], size: [0.024 * scale, 0.012 * scale, 0.024 * scale], turn, tilt: (random() - 0.5) * 0.5, colour });
      else if (a.sample === 'dumplings') balls.push({ at: [x, y + 0.008 * scale, z], size: [0.022 * scale, 0.011 * scale, 0.012 * scale], turn, colour });
      else if (a.sample === 'meatballs') balls.push({ at: [x, y + 0.012 * scale, z], size: [0.013 * scale, 0.013 * scale, 0.013 * scale], colour });
      else if (a.sample === 'pizza') { boxes.push({ at: [x, y + 0.004 * scale, z], size: [0.024 * scale, 0.008 * scale, 0.024 * scale], turn, colour: dull('#d8a85a') }); boxes.push({ at: [x, y + 0.009 * scale, z], size: [0.02 * scale, 0.003 * scale, 0.02 * scale], turn, colour }); }
      else boxes.push({ at: [x, y + 0.008 * scale, z], size: [0.016 * scale, 0.016 * scale, 0.016 * scale], turn, tilt: (random() - 0.5) * 0.4, colour });
    };

    // Electric skillet (or the juice jug).
    const sx = -0.34, sz = -0.02;
    if (a.sample === 'juice') {
      const jug = new THREE.MeshPhysicalMaterial({ color: '#eef6fa', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false });
      for (const [i, colour] of [product.food[0], product.food[1]].entries()) {
        const x = sx - 0.08 + i * 0.2, level = mix(0.04, 0.2, random());
        s.cylinder(0.062, 0.055, 0.24, [x, TOP + 0.12, sz], jug, 20).castShadow = false;
        s.cylinder(0.056, 0.052, level, [x, TOP + 0.012 + level / 2, sz], s.material(dull(colour), { roughness: 0.2 }), 20);
        s.cylinder(0.064, 0.064, 0.012, [x, TOP + 0.246, sz], white, 20);
        s.ring(0.045, 0.008, [x + 0.075, TOP + 0.14, sz], white, Math.PI).rotation.z = -Math.PI / 2;
      }
    } else {
      const py = TOP + 0.03;
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.014, 0.014, 0.03, [sx + x * 0.12, TOP + 0.015, sz + z * 0.12], black, 8);
      s.box([0.32, 0.06, 0.32], [sx, py + 0.03, sz], black);
      s.box([0.29, 0.01, 0.29], [sx, py + 0.057, sz], s.material(a.sample === 'meatballs' ? dull('#a8281c') : '#3a3a3e', { roughness: a.sample === 'meatballs' ? 0.25 : 0.4 }));
      for (const side of [-1, 1]) s.box([0.05, 0.02, 0.1], [sx + side * 0.185, py + 0.045, sz], black);
      s.box([0.07, 0.035, 0.05], [sx + 0.03, py + 0.03, sz - 0.185], s.material('#3a3a3e'));
      s.cylinder(0.008, 0.008, 0.006, [sx + 0.05, py + 0.05, sz - 0.19], new THREE.MeshStandardMaterial({ color: hot ? '#ff4a2a' : '#4a1c1c', emissive: hot ? '#ff3a1a' : '#000000', emissiveIntensity: 2 }), 10);
      if (!packed) s.tube([[sx + 0.03, py + 0.03, sz - 0.21], [sx + 0.06, TOP + 0.012, sz - 0.27], [sx + 0.1, TOP - 0.05, -D / 2 - 0.03], [sx + 0.12, 0.3, -D / 2 - 0.05], [sx + 0.2, 0.012, -D / 2 - 0.12], [sx + 0.5, 0.012, -D / 2 - 0.22]], 0.006, black);
      else s.ring(0.05, 0.007, [sx + 0.26, TOP + 0.012, sz + 0.18], black).rotation.x = Math.PI / 2;
      const inPan = a.sample === 'cheese' ? 0 : cold ? 5 + Math.floor(random() * 5) : packed ? 0 : Math.round(mix(8, 22, mood.density));
      for (let i = 0; i < inPan; i++) foodBit(sx + (random() - 0.5) * 0.24, py + 0.06, sz + (random() - 0.5) * 0.24, 1.25);
      if (cold && a.sample !== 'cheese') s.cylinder(0.09, 0.09, 0.002, [sx + 0.03, py + 0.063, sz - 0.02], s.material('#d8d0b8', { roughness: 0.3, transparent: true, opacity: 0.6 }), 16).castShadow = false;
      // Lid.
      const lidGlass = new THREE.MeshPhysicalMaterial({ color: '#e8f2f6', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false });
      const lid = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.material !== lidGlass; lid.add(mesh); };
      add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.3), lidGlass));
      for (const side of [-1, 1]) { const x = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.014, 0.012), steel); x.position.z = side * 0.15; add(x); const z = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.31), steel); z.position.x = side * 0.15; add(z); }
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.016, 0.03, 12), black); knob.position.y = 0.02; add(knob);
      if (packed || (cold && random() < 0.5) || a.sample === 'cheese') lid.position.set(sx, py + 0.07, sz);
      else { lid.position.set(sx - 0.2, TOP + 0.15, sz - 0.03); lid.rotation.z = Math.PI / 2 - 0.25; }
      s.root.add(lid);
      if (hot) {
        // Tongs resting on the rim.
        for (const side of [-1, 1]) s.rod([sx + 0.05, py + 0.07, sz + 0.05], [sx + 0.2 + side * 0.012, py + 0.1, sz + 0.26 + side * 0.012], 0.006, steel);
      }
    }

    // Sample tray with its tiny paper cups.
    const tx = 0.2, tz = 0.1, trayY = TOP + 0.004;
    s.box([0.46, 0.012, 0.32], [tx, trayY + 0.006, tz], s.material(pick(['#c2c8cc', '#c8281e', '#2a2a2e', '#e8d8b0']), { metalness: 0.3, roughness: 0.4 }));
    for (const side of [-1, 1]) { s.box([0.46, 0.02, 0.012], [tx, trayY + 0.012, tz + side * 0.16], steel); s.box([0.012, 0.02, 0.32], [tx + side * 0.23, trayY + 0.012, tz], steel); }
    const cupY = trayY + 0.012;
    const full = packed ? 0 : a.left;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
      const x = tx - 0.18 + i * 0.072 + (random() - 0.5) * 0.012, z = tz - 0.11 + j * 0.073 + (random() - 0.5) * 0.012;
      const has = random() < full * 1.05 - 0.02;
      if (!has && (packed || random() > 0.22)) continue;
      const knocked = !has && random() < 0.5;
      cups.push({ at: [x, cupY + (knocked ? 0.02 : 0.016), z], size: [0.027, 0.032, 0.027], colour: '#fbfaf4', roll: knocked ? Math.PI / 2 : 0, turn: random() * 3 });
      if (!has) continue;
      if (a.sample === 'juice') cups.push({ at: [x, cupY + 0.024, z], size: [0.024, 0.016, 0.024], colour: dull(pick(product.food)) });
      else { foodBit(x, cupY + 0.016, z); picks.push({ at: [x + 0.004, cupY + 0.05, z], size: [0.0014, 0.065, 0.0014], tilt: (random() - 0.5) * 0.5, roll: (random() - 0.5) * 0.5, colour: '#e0c890' }); }
    }
    // Toothpick cup and napkins.
    const kx = 0.5, kz = -0.2;
    s.cylinder(0.035, 0.028, 0.07, [kx, TOP + 0.04, kz], s.material(pick(['#c8281e', '#f4f2ea', '#2a62c8'])), 16);
    if (a.sample !== 'juice') for (let i = 0; i < 26; i++) picks.push({ at: [kx + (random() - 0.5) * 0.04, TOP + 0.075, kz + (random() - 0.5) * 0.04], size: [0.0014, 0.07, 0.0014], tilt: (random() - 0.5) * 0.45, roll: (random() - 0.5) * 0.45, colour: '#e0c890' });
    else for (let i = 0; i < 5; i++) cups.push({ at: [kx, TOP + 0.09 + i * 0.008, kz], size: [0.027, 0.032, 0.027], colour: '#fbfaf4' });
    for (let i = 0; i < 5; i++) boxes.push({ at: [0.5, TOP + 0.008 + i * 0.006, 0.19], size: [0.11, 0.006, 0.11], turn: (random() - 0.5) * 0.3, colour: '#fbfaf4' });

    // The sign on an easel stand.
    const text = { free: ['FREE', 'SAMPLES'], tryme: ['TRY', 'ME!'], fresh: ['NEW!', product.name], one: ['ONE PER', 'CUSTOMER', 'PLEASE'], back: ['BACK IN', '5 MIN'], today: ['TODAY ONLY', pick(['$3.99', '$5.49', '2 FOR $7'])] }[a.sign];
    const signArt = paint(320, 256, (ctx) => {
      const hand = a.sign === 'back' || a.sign === 'one';
      ctx.fillStyle = hand ? '#fbfaf2' : a.sign === 'fresh' ? '#ffe21c' : '#fff6d0'; ctx.fillRect(0, 0, 320, 256);
      if (!hand) { ctx.strokeStyle = product.pack; ctx.lineWidth = 12; ctx.strokeRect(6, 6, 308, 244); }
      if (a.sign === 'fresh') { ctx.fillStyle = '#e8201c'; ctx.beginPath(); for (let i = 0; i < 28; i++) { const t = i * Math.PI / 14, r = i % 2 ? 118 : 88; ctx.lineTo(160 + Math.cos(t) * r * 1.2, 96 + Math.sin(t) * r * 0.78); } ctx.fill(); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      text.forEach((line, i) => {
        const size = text.length === 3 ? 50 : i === 0 || a.sign === 'tryme' || a.sign === 'free' || a.sign === 'back' ? 78 : 40;
        const y = text.length === 3 ? 62 + i * 66 : a.sign === 'fresh' || a.sign === 'today' ? [98, 206][i] : 82 + i * 92;
        ctx.save(); ctx.translate(160, y); if (hand) ctx.rotate((random() - 0.5) * 0.08);
        ctx.fillStyle = a.sign === 'fresh' && i === 0 ? '#fff6b0' : hand ? '#1c2a8a' : i === 0 ? '#e8201c' : '#1c1c20'; ctx.font = `${hand ? 'italic ' : ''}900 ${size}px sans-serif`; ctx.fillText(line, 0, 0, 290); ctx.restore();
      });
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.368, 0.008), [white, white, white, white, new THREE.MeshStandardMaterial({ map: signArt, roughness: 0.75 }), white]);
    sign.castShadow = true;
    if (packed) { sign.position.set(0.05, TOP + 0.01, -0.2); sign.rotation.x = -Math.PI / 2; sign.rotation.z = 0.3; }
    else { sign.position.set(0.02, TOP + 0.4, -0.23); sign.rotation.x = -0.14; sign.rotation.z = (random() - 0.5) * 0.06; s.rod([0.02, TOP, -0.2], [0.02, TOP + 0.3, -0.245], 0.008, steel); s.box([0.16, 0.012, 0.1], [0.02, TOP + 0.008, -0.21], black); }
    s.root.add(sign);

    // State dressing.
    const steam: THREE.Mesh[] = [];
    if (a.state === 'sizzling' && a.sample !== 'juice' && a.sample !== 'cheese') {
      const mist = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false });
      for (let i = 0; i < 7; i++) { const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mist); puff.position.set(sx + (random() - 0.5) * 0.16, TOP + 0.16 + i * 0.07, sz + (random() - 0.5) * 0.12); puff.scale.setScalar(0.04 + i * 0.012); puff.userData.base = puff.position.y; s.root.add(puff); steam.push(puff); }
    }
    if (a.state === 'justleft') {
      const apron = s.material(pick(['#c8281e', '#2c7a44', '#1f4fa8', '#1c1c20']), { roughness: 0.95, side: THREE.DoubleSide });
      const ax = -W / 2 + 0.22;
      s.box([0.3, 0.008, 0.2], [ax, TOP + 0.012, D / 2 - 0.09], apron);
      const fall = s.box([0.3, 0.4, 0.008], [ax, TOP - 0.19, D / 2 + 0.045], apron); fall.rotation.z = 0.04;
      s.box([0.14, 0.12, 0.01], [ax, TOP - 0.24, D / 2 + 0.05], s.material('#f4f2ea'));
      for (const side of [-1, 1]) s.tube([[ax + side * 0.15, TOP - 0.05, D / 2 + 0.05], [ax + side * 0.22, TOP - 0.3, D / 2 + 0.07], [ax + side * 0.2, TOP - 0.5, D / 2 + 0.06]], 0.006, apron);
      // A pair of food-service gloves.
      for (let i = 0; i < 2; i++) s.ball([0.05, 0.008, 0.035], [-0.08 + i * 0.05, TOP + 0.012 + i * 0.006, 0.22], s.material('#a8d0f0', { roughness: 0.4 }), 10).rotation.y = i * 0.7;
    }
    if (packed) {
      const card = s.material('#b88a54', { roughness: 0.9, side: THREE.DoubleSide });
      s.box([0.34, 0.22, 0.26], [0.22, TOP + 0.115, 0.08], card);
      for (const side of [-1, 1]) { const flap = s.box([0.34, 0.006, 0.13], [0.22, TOP + 0.26, 0.08 + side * 0.18], card); flap.rotation.x = side * 0.9; }
      for (let i = 0; i < 14; i++) cups.push({ at: [0.14, TOP + 0.24 + i * 0.008, 0.05], size: [0.027, 0.032, 0.027], colour: '#fbfaf4' });
      boxes.push({ at: [0.3, TOP + 0.25, 0.1], size: [0.09, 0.07, 0.13], turn: 0.3, colour: product.pack });
    }
    // Litter.
    if (a.mess) for (let i = 0; i < 16; i++) {
      const onFloor = i > 5, x = onFloor ? (random() - 0.5) * 1.8 : (random() - 0.5) * 1.0, z = onFloor ? D / 2 + 0.1 + random() * 0.45 : (random() - 0.5) * 0.5, y = onFloor ? 0 : TOP + 0.004;
      if (i % 3) cups.push({ at: [x, y + 0.02, z], size: [0.027, 0.032, 0.027], roll: Math.PI / 2, turn: random() * 6, colour: i % 2 ? '#fbfaf4' : '#efe6d0' });
      else picks.push({ at: [x, y + 0.003, z], size: [0.0016, 0.065, 0.0016], roll: Math.PI / 2, turn: random() * 6, colour: '#e0c890' });
      if (onFloor && i % 5 === 0) boxes.push({ at: [x + 0.1, 0.003, z + 0.05], size: [0.11, 0.004, 0.11], turn: random() * 3, colour: '#fbfaf4' });
    }

    // Beside the table.
    const fx = W / 2 + 0.42;
    if (a.beside === 'stack') {
      s.box([0.5, 0.36, 0.4], [fx, 0.18, 0], s.material('#b88a54', { roughness: 0.9 }));
      s.label(product.name, 0.4, 0.1, [fx, 0.2, 0.202], '#3a2a1c', '#c9a06a');
      const rows = 1 + Math.round(mood.density * 2);
      for (let row = 0; row <= rows; row++) for (let i = 0; i < rows + 1 - row; i++) {
        if (row === rows && random() < 0.3) continue;
        const x = fx + (i - (rows - row) / 2) * 0.15, y = 0.36 + row * 0.2 + 0.1;
        boxes.push({ at: [x, y, 0], size: [0.14, 0.2, 0.06], turn: (random() - 0.5) * 0.12, colour: product.pack });
        boxes.push({ at: [x, y + 0.05, 0.031], size: [0.12, 0.05, 0.003], colour: '#fff6d0' });
        balls.push({ at: [x, y - 0.035, 0.031], size: [0.04, 0.04, 0.003], colour: product.food[0] });
      }
    } else if (a.beside === 'cooler') {
      s.box([0.56, 0.34, 0.34], [fx, 0.17, 0], s.material(pick(['#2a62c8', '#c8281e', '#2c8a8a']), { roughness: 0.5 }));
      const top = s.box([0.58, 0.06, 0.36], [fx, 0.37, 0], white); if (hot) { top.rotation.x = -0.9; top.position.set(fx, 0.5, -0.2); }
      for (const side of [-1, 1]) s.box([0.02, 0.04, 0.14], [fx + side * 0.29, 0.26, 0], white);
      if (hot) for (let i = 0; i < 4; i++) boxes.push({ at: [fx - 0.18 + i * 0.12, 0.33, (random() - 0.5) * 0.1], size: [0.1, 0.1, 0.2], turn: (random() - 0.5) * 0.4, tilt: 0.2, colour: product.pack });
    } else if (a.beside === 'bin') {
      s.cylinder(0.17, 0.14, 0.5, [fx - 0.1, 0.25, 0.05], s.material(pick(['#3a3e44', '#c2c8cc', '#2c7a44']), { metalness: 0.3, roughness: 0.5 }), 20);
      s.ring(0.172, 0.012, [fx - 0.1, 0.5, 0.05], black).rotation.x = Math.PI / 2;
      const heap = a.mess ? 16 : 5;
      for (let i = 0; i < heap; i++) cups.push({ at: [fx - 0.1 + (random() - 0.5) * 0.24, 0.5 + random() * (a.mess ? 0.1 : 0.03), 0.05 + (random() - 0.5) * 0.24], size: [0.027, 0.032, 0.027], roll: random() * 3, tilt: random() * 3, colour: i % 2 ? '#fbfaf4' : '#efe6d0' });
    }

    const plain = () => new THREE.MeshStandardMaterial({ roughness: cold ? 0.4 : 0.65 });
    s.root.add(instances(new THREE.BoxGeometry(1, 1, 1), plain(), boxes), instances(new THREE.SphereGeometry(1, 12, 8), plain(), balls), instances(new THREE.CylinderGeometry(1, 0.72, 1, 12), plain(), cups), instances(new THREE.CylinderGeometry(1, 1, 1, 5), plain(), picks));

    const pace = mix(0.3, 1.6, mood.energy);
    return s.finish({
      update(_dt, time) {
        steam.forEach((puff, i) => { const phase = (time * 0.25 * pace + i / steam.length) % 1; puff.position.y = TOP + 0.14 + phase * 0.5; puff.scale.setScalar(0.035 + phase * 0.09); puff.position.x += Math.sin(time * 1.3 + i) * 0.0003; });
      },
    });
  },
});
