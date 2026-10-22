import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type Item = { p: [number, number, number]; sc?: [number, number, number]; r?: [number, number, number]; c?: THREE.ColorRepresentation };

const FLAVOUR = {
  mainstreet: { wall: '#d9cfb2', wood: '#8a6238', trim: '#2f4f3f', stock: ['#b98f5c', '#a67c4a', '#35506b', '#8a2f25', '#d9d2bd', '#3f5f4a', '#c9a56a'] },
  kanamono: { wall: '#cbbd9c', wood: '#4d3828', trim: '#27344f', stock: ['#9a7448', '#b98f5c', '#27344f', '#e9e4d2', '#6f6a5c', '#8a2f25', '#c9a56a'] },
  farm: { wall: '#b08a5c', wood: '#8f6a40', trim: '#8a2a22', stock: ['#c9b48a', '#b99a63', '#8a2a22', '#3f5f4a', '#d9d2bd', '#9aa3a6', '#e8b62a'] },
  city: { wall: '#cdd5cc', wood: '#8f9a9c', trim: '#c8322a', stock: ['#e23b2e', '#2f7fd6', '#f2c81e', '#2fa85a', '#f4f4ee', '#ff7a1a', '#7a4fc9', '#33c1d6'] },
} as const;

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineWorld({
  questions: {
    flavour: choice('What kind of hardware store is it?', {
      mainstreet: 'An American main-street store: oak fixtures, green trim, gold lettering on the window glass.',
      kanamono: 'A Japanese kanamono-ya: dark timber, an open shopfront under a noren curtain, saws, kettles and buckets hung outside.',
      farm: 'A farm and feed supply: raw board walls, galvanised pails, sacks, a wide barn door.',
      city: 'A tiny city shop that sells everything: steel shelving, bright plastic, goods hanging from every inch of ceiling.',
    }),
    season: choice('What seasonal stock is out front?', {
      spring: 'Spring: a seed-packet rack, trays of seedlings, watering cans.',
      summer: 'Summer: box fans, coiled garden hoses, a kettle barbecue.',
      autumn: 'Autumn: leaf rakes, stovepipe, firewood and pumpkins.',
      winter: 'Winter: snow shovels, a sled, bags of salt and strings of coloured lights.',
    }),
    state: choice('What state is the business in?', {
      open: 'Open and doing well: door propped, shelves full, lamps on.',
      quiet: 'Open but quiet: a slow afternoon, nobody in.',
      closing: 'Closing down: sale banners, half-empty shelves, the end of something.',
      shut: 'Shut: blinds down, dust sheets over the counter, lamps off.',
    }),
    heart: choice('What is the heart of the shop?', {
      stove: 'A potbelly stove with two chairs and a checkerboard on a barrel, where the old men sit.',
      till: 'An ornate brass cash register and jars on the counter.',
      kegs: 'A row of open nail kegs with a scoop and a hanging scale.',
      bench: 'A repair bench with a vise and a lamp, where things get fixed.',
    }),
    sign: choice('What does the lettering say?', {
      hardware: 'HARDWARE', ironmonger: 'IRONMONGER', tools: 'TOOLS & PAINT', feed: 'FEED & SEED', general: 'GENERAL STORE', est: 'EST. 1908',
    }),
    floor: choice('What is the floor?', {
      planks: 'Wide creaking planks, worn pale down the middle of the aisle.',
      checker: 'Checkerboard linoleum, scuffed.',
      concrete: 'Oiled concrete with cracks.',
      earth: 'Packed earth and flagstones, swept.',
    }),
    ceiling: choice('What is overhead?', {
      tin: 'Pressed tin painted white.',
      verdigris: 'Pressed tin in old green paint.',
      boards: 'Dark bare boards and joists.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const F = FLAVOUR[a.flavour];
    const W = a.flavour === 'city' ? 6 : 7, Dp = 12, H = 3.9, hx = W / 2, hz = Dp / 2;
    const dusk = Math.abs(mood.daylight - 0.5) * 2; // 0 noon … 1 dawn or dusk
    const sky = new THREE.Color().setHSL(mix(0.58, 0.08, mood.warmth * 0.6 + dusk * 0.4), mix(0.25, 0.6, dusk), mix(0.9, 0.78, dusk));
    const bg = new THREE.Color('#e6e4d8').lerp(sky, 0.25);
    const counterX = hx - 1.25;
    const { art: s, world } = diorama(context, {
      background: '#' + bg.getHexString(), floor: '#6f5a44', width: W, depth: Dp, maxHeight: 2.5, radius: 1.05, pitch: 31, yaw: 30,
      slots: [[0.1, 1.3], [-1.3, -1.7], [counterX, 0.4, 1.04, 0.42], [-1.1, 4.2], [1.2, 4.6, 0, 0.8]],
    });
    const root = s.root;
    const wall = s.material(F.wall, { roughness: 0.95 });
    const wood = s.material(F.wood);
    const woodDark = s.material(new THREE.Color(F.wood).multiplyScalar(0.62));
    const trim = s.material(F.trim, { roughness: 0.55 });
    const iron = s.material('#2a2b2d', { metalness: 0.5, roughness: 0.55 });
    const brass = s.material('#c9a14a', { metalness: 0.8, roughness: 0.35 });
    const galv = s.material('#aab2b6', { metalness: 0.65, roughness: 0.4 });
    const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 });
    const stockLevel = (a.state === 'closing' ? 0.35 : 0.72) * mix(0.75, 1.25, mood.density) * mix(1, 0.8, mood.wear);
    const lampsOn = a.state !== 'shut';
    const dummy = new THREE.Object3D();
    const inst = (geometry: THREE.BufferGeometry, material: THREE.Material, items: Item[]) => {
      if (!items.length) return null;
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      const colour = new THREE.Color();
      items.forEach((item, index) => {
        dummy.position.set(...item.p); dummy.rotation.set(...(item.r ?? [0, 0, 0])); dummy.scale.set(...(item.sc ?? [1, 1, 1]));
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        if (item.c !== undefined) mesh.setColorAt(index, colour.set(item.c));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };
    const pickStock = () => new THREE.Color(F.stock[Math.floor(random() * F.stock.length)]).lerp(new THREE.Color('#8a8272'), mood.wear * 0.4);
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const panels: THREE.Mesh[] = [];
    const spinners: THREE.Group[] = [];
    const tube = new THREE.CylinderGeometry(1, 1, 1, 14);

    // ---- Floor ----
    const floorTexture = canvasTexture(512, 1024, (ctx) => {
      if (a.floor === 'planks') {
        const boards = Math.round(W / 0.16);
        for (let i = 0; i < boards; i++) {
          const x0 = i / boards * 512, w = 512 / boards;
          let y = -random() * 300;
          while (y < 1024) {
            const len = 180 + random() * 320;
            const tone = 0.8 + random() * 0.35;
            ctx.fillStyle = `rgb(${Math.round(126 * tone)},${Math.round(96 * tone)},${Math.round(64 * tone)})`;
            ctx.fillRect(x0, y, w, len);
            ctx.fillStyle = 'rgba(30,18,8,0.55)'; ctx.fillRect(x0, y + len - 2, w, 2);
            ctx.fillStyle = 'rgba(20,12,6,0.6)'; ctx.fillRect(x0 + 3, y + 6, 2, 2); ctx.fillRect(x0 + w - 5, y + 6, 2, 2);
            y += len;
          }
          ctx.fillStyle = 'rgba(30,18,8,0.5)'; ctx.fillRect(x0, 0, 1.5, 1024);
        }
        // The path worn by a century of boots.
        const worn = ctx.createLinearGradient(0, 0, 512, 0);
        worn.addColorStop(0.25, 'rgba(225,200,160,0)'); worn.addColorStop(0.5, 'rgba(225,200,160,0.36)'); worn.addColorStop(0.72, 'rgba(225,200,160,0)');
        ctx.fillStyle = worn; ctx.fillRect(0, 0, 512, 1024);
      } else if (a.floor === 'checker') {
        const tile = 512 / Math.round(W / 0.35);
        for (let x = 0; x * tile < 512; x++) for (let y = 0; y * tile < 1024; y++) {
          const dark = (x + y) % 2 === 0;
          const tone = 0.9 + random() * 0.15;
          ctx.fillStyle = dark ? `rgb(${Math.round(70 * tone)},${Math.round(82 * tone)},${Math.round(74 * tone)})` : `rgb(${Math.round(216 * tone)},${Math.round(206 * tone)},${Math.round(178 * tone)})`;
          ctx.fillRect(x * tile, y * tile, tile - 0.6, tile - 0.6);
        }
        ctx.fillStyle = 'rgba(120,100,70,0.22)'; ctx.fillRect(170, 0, 170, 1024);
      } else if (a.floor === 'concrete') {
        ctx.fillStyle = '#8f8c82'; ctx.fillRect(0, 0, 512, 1024);
        for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(40,36,30,${0.04 + random() * 0.08})`; ctx.beginPath(); ctx.ellipse(random() * 512, random() * 1024, 20 + random() * 80, 20 + random() * 60, random() * 3, 0, 7); ctx.fill(); }
        ctx.strokeStyle = 'rgba(30,28,24,0.6)'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) { let x = random() * 512, y = random() * 1024; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 9; k++) { x += (random() - 0.5) * 90; y += random() * 70; ctx.lineTo(x, y); } ctx.stroke(); }
      } else {
        ctx.fillStyle = '#8a745a'; ctx.fillRect(0, 0, 512, 1024);
        for (let i = 0; i < 80; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '60,45,30' : '170,150,120'},${0.05 + random() * 0.08})`; ctx.beginPath(); ctx.ellipse(random() * 512, random() * 1024, 15 + random() * 60, 15 + random() * 50, random() * 3, 0, 7); ctx.fill(); }
        for (let i = 0; i < 9; i++) {
          const x = 200 + (random() - 0.5) * 60, y = 40 + i * 112, w = 90 + random() * 50, h = 70 + random() * 30;
          ctx.fillStyle = `rgb(${128 + Math.round(random() * 16)},${116 + Math.round(random() * 14)},${98 + Math.round(random() * 14)})`;
          ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 12); ctx.fill();
          ctx.strokeStyle = 'rgba(40,34,26,0.5)'; ctx.lineWidth = 2; ctx.stroke();
        }
      }
      if (mood.wear > 0.3) { ctx.fillStyle = `rgba(60,52,40,${(mood.wear - 0.3) * 0.3})`; ctx.fillRect(0, 0, 512, 1024); }
    });
    const floor = s.mesh(new THREE.PlaneGeometry(W, Dp), new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.85 }), [0, 0.004, 0]);
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;

    // ---- Walls ----
    const wallTexture = a.flavour === 'farm' ? canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = F.wall; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 16; i++) { ctx.fillStyle = `rgba(60,36,16,${0.05 + random() * 0.18})`; ctx.fillRect(i * 16, 0, 16, 256); ctx.fillStyle = 'rgba(40,24,10,0.6)'; ctx.fillRect(i * 16, 0, 1.5, 256); }
    }) : null;
    if (wallTexture) { wallTexture.wrapS = THREE.RepeatWrapping; wallTexture.repeat.set(5, 1); }
    const sideWall = wallTexture ? new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.95 }) : wall;
    s.box([0.2, H, Dp + 0.2], [-hx - 0.1, H / 2, -0.1], sideWall);
    s.box([0.06, 0.16, Dp], [-hx + 0.03, 0.08, 0], woodDark);

    // ---- Shopfront at the back (we stand inside, looking toward the street) ----
    const outside = new THREE.Color().setHSL(mix(0.58, 0.07, dusk * 0.8 + mood.warmth * 0.2), mix(0.3, 0.85, dusk), mix(0.93, 0.74, dusk));
    const glass = new THREE.MeshStandardMaterial({ color: outside, emissive: outside, emissiveIntensity: a.state === 'shut' ? 0.25 : mix(0.75, 0.5, dusk), roughness: 0.2 });
    const blind = s.material('#b3a47c', { roughness: 0.95 });
    const signText = { hardware: 'HARDWARE', ironmonger: 'IRONMONGER', tools: 'TOOLS & PAINT', feed: 'FEED & SEED', general: 'GENERAL STORE', est: 'EST. 1908' }[a.sign];
    const zb = -hz;
    const doorW = a.flavour === 'farm' ? 2.2 : 1.1;
    if (a.flavour === 'kanamono') {
      // Open front: posts, a heavy lintel, a plastered gable with a signboard, noren, and the street beyond.
      for (const x of [-hx + 0.12, -1.35, 1.35, hx - 0.12]) s.box([0.22, H, 0.22], [x, H / 2, zb], woodDark);
      s.box([W, 0.3, 0.26], [0, 2.75, zb], woodDark);
      s.box([W, H - 2.9, 0.14], [0, (H + 2.9) / 2, zb - 0.02], wall);
      s.box([2.6, 0.62, 0.08], [0, 3.35, zb + 0.08], wood);
      const board = s.label(signText, 2.4, 0.46, [0, 3.35, zb + 0.125], '#1d1712', F.wood);
      void board;
      // Noren with a house crest.
      const crest = canvasTexture(128, 128, (ctx) => {
        ctx.fillStyle = F.trim; ctx.fillRect(0, 0, 128, 128);
        ctx.strokeStyle = '#f1ecdc'; ctx.fillStyle = '#f1ecdc'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(64, 60, 34, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(64, 36); ctx.lineTo(84, 70); ctx.lineTo(44, 70); ctx.closePath(); ctx.fill();
        ctx.fillRect(42, 76, 44, 7);
      });
      const cloth = new THREE.MeshStandardMaterial({ map: crest, roughness: 0.95, side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) {
        const panel = s.mesh(new THREE.PlaneGeometry(0.62, 0.86), cloth, [-0.98 + i * 0.655, 2.17, zb + 0.02]);
        panel.rotation.x = (random() - 0.5) * mix(0.05, 0.3, mood.energy);
        panels.push(panel);
      }
      s.rod([-1.35, 2.6, zb + 0.02], [1.35, 2.6, zb + 0.02], 0.018, wood);
      // Street: pavement, and goods hung and stacked outside.
      s.box([W + 0.4, 0.2, 2.0], [0, -0.1, zb - 1.0], s.material('#a7a59c'));
      const hang: Item[] = [], pails: Item[] = [];
      for (const side of [-1, 1]) {
        const x0 = side * 1.5, x1 = side * (hx - 0.3);
        s.rod([x0, 2.55, zb - 0.25], [x1, 2.55, zb - 0.25], 0.02, wood);
        const n = 5 + Math.round(mood.density * 3);
        for (let i = 0; i < n; i++) {
          const x = mix(x0, x1, (i + 0.5) / n), kind = Math.floor(random() * 4), drop = mix(0.15, 0.4, random());
          s.rod([x, 2.55, zb - 0.25], [x, 2.55 - drop, zb - 0.25], 0.004, iron);
          const y = 2.55 - drop;
          if (kind === 0) { hang.push({ p: [x, y - 0.3, zb - 0.25], sc: [0.13, 0.5, 0.006], c: '#b9bec2' }); hang.push({ p: [x, y - 0.03, zb - 0.25], sc: [0.15, 0.1, 0.03], c: '#9a7448' }); }
          else if (kind === 1) pails.push({ p: [x, y - 0.16, zb - 0.25], sc: [0.15, 0.28, 0.15], c: random() < 0.5 ? '#aab2b6' : '#2f5f8a' });
          else if (kind === 2) { hang.push({ p: [x, y - 0.4, zb - 0.25], sc: [0.03, 0.8, 0.03], c: '#c9a56a' }); hang.push({ p: [x, y - 0.86, zb - 0.25], sc: [0.26, 0.18, 0.05], c: '#b98f5c' }); }
          else pails.push({ p: [x, y - 0.11, zb - 0.25], sc: [0.13, 0.17, 0.13], c: random() < 0.5 ? '#2a2b2d' : '#c9a14a' });
        }
        // Crates of stock on the pavement.
        for (let i = 0; i < 3; i++) for (let k = 0; k < 2 - (i % 2); k++) hang.push({ p: [side * (1.9 + i * 0.52), 0.2 + k * 0.4, zb - 0.8], sc: [0.48, 0.38, 0.5], c: pickStock() });
      }
      inst(unit, white, hang);
      inst(new THREE.CylinderGeometry(1, 0.78, 1, 14), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.4, roughness: 0.5 }), pails);
      if (a.state === 'shut') for (const x of [-2.4, 0, 2.4]) s.box([x === 0 ? 2.5 : W / 2 - 1.5, 2.6, 0.06], [x * (W / 7), 1.3, zb - 0.05], s.material('#6b5a44'));
    } else {
      const sill = 0.75, head = a.flavour === 'city' ? 2.5 : 2.8;
      const frontMat = a.flavour === 'farm' ? sideWall : wall;
      s.box([W, H - head - 0.5, 0.2], [0, (H + head + 0.5) / 2, zb - 0.1], frontMat);
      s.box([W, 0.12, 0.26], [0, head + 0.5, zb - 0.07], trim);
      for (const side of [-1, 1]) {
        const x0 = side * (doorW / 2 + 0.18), x1 = side * (hx - 0.18), cx = (x0 + x1) / 2, ww = Math.abs(x1 - x0);
        s.box([ww + 0.36, sill, 0.2], [cx, sill / 2, zb - 0.1], a.flavour === 'city' ? trim : frontMat === wall ? woodDark : frontMat);
        s.box([ww, head - sill, 0.04], [cx, (head + sill) / 2, zb - 0.1], glass);
        s.box([ww, 0.44, 0.04], [cx, head + 0.25, zb - 0.1], glass);
        s.box([ww + 0.2, 0.08, 0.14], [cx, head, zb - 0.06], trim);
        s.box([ww + 0.2, 0.1, 0.3], [cx, sill, zb + 0.02], wood);
        for (const x of [x0, x1]) s.box([0.14, head + 0.5, 0.2], [x, (head + 0.5) / 2, zb - 0.07], trim);
        const mullions = a.flavour === 'city' ? 0 : a.flavour === 'farm' ? 3 : 1;
        for (let i = 1; i <= mullions; i++) s.box([0.05, head - sill, 0.08], [mix(x0, x1, i / (mullions + 1)), (head + sill) / 2, zb - 0.07], trim);
        if (a.flavour === 'farm') s.box([ww, 0.05, 0.08], [cx, (head + sill) / 2, zb - 0.07], trim);
        for (let i = 1; i < 5; i++) s.box([0.035, 0.44, 0.07], [mix(x0, x1, i / 5), head + 0.25, zb - 0.07], trim);
        if (a.state === 'shut') s.box([ww, (head - sill) * mix(0.7, 0.95, random()), 0.03], [cx, head - (head - sill) * 0.42, zb - 0.02], blind);
        else if (mood.wear > 0.5) s.box([ww, (head - sill) * 0.25, 0.03], [cx, head - (head - sill) * 0.125, zb - 0.02], blind);
        // Lettering on the glass, read from the street, so mirrored from in here.
        if (a.state !== 'shut') {
          const letters = canvasTexture(512, 128, (ctx) => {
            ctx.translate(512, 0); ctx.scale(-1, 1);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 84px serif';
            ctx.lineWidth = 9; ctx.strokeStyle = '#1b140c'; ctx.strokeText(side < 0 ? signText : a.state === 'closing' ? 'SALE' : 'KEYS CUT', 256, 66, 490);
            ctx.fillStyle = a.flavour === 'city' ? '#f4f1e6' : '#d8ad3c'; ctx.fillText(side < 0 ? signText : a.state === 'closing' ? 'SALE' : 'KEYS CUT', 256, 66, 490);
          });
          const lettering = s.mesh(new THREE.PlaneGeometry(Math.min(ww * 0.9, 2.4), Math.min(ww * 0.9, 2.4) / 4), new THREE.MeshStandardMaterial({ map: letters, transparent: true, alphaTest: 0.4, roughness: 0.5 }), [cx, head - 0.45, zb - 0.07]);
          lettering.castShadow = false;
        }
      }
      // Door.
      s.box([doorW + 0.36, H - head - 0.5 + 0.5, 0.2], [0, head + 0.25, zb - 0.1], frontMat);
      s.box([doorW * 0.9, 0.36, 0.04], [0, head + 0.25, zb - 0.06], glass);
      const door = new THREE.Group();
      door.position.set(-doorW / 2, 0, zb - 0.06);
      const leaf = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z = 0) => {
        const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; door.add(mesh); return mesh;
      };
      if (a.flavour === 'farm') {
        leaf(new THREE.BoxGeometry(doorW * 0.62, head, 0.07), s.material(F.trim), doorW * 0.31, head / 2);
        for (const turn of [-1, 1]) leaf(new THREE.BoxGeometry(0.1, head * 1.1, 0.08), s.material('#e9e2cc'), doorW * 0.31, head / 2, 0.01).rotation.z = turn * 0.36;
        s.box([doorW * 0.45, head, 0.03], [doorW * 0.27, head / 2, zb - 0.14], glass);
        s.box([doorW + 1.6, 0.07, 0.07], [0, head + 0.05, zb + 0.02], iron);
        door.position.x = a.state === 'shut' ? -doorW / 2 + doorW * 0.2 : -doorW / 2 - doorW * 0.25;
      } else {
        leaf(new THREE.BoxGeometry(doorW, head, 0.06), trim, doorW / 2, head / 2);
        leaf(new THREE.BoxGeometry(doorW * 0.72, head * 0.5, 0.07), a.state === 'shut' ? blind : glass, doorW / 2, head * 0.66);
        leaf(new THREE.SphereGeometry(0.045, 10, 8), brass, doorW * 0.88, 1.02, 0.07);
        const card = s.label(a.state === 'shut' ? 'CLOSED' : 'OPEN', 0.42, 0.16, [0, 0, 0], a.state === 'shut' ? '#f3ead0' : '#f3ead0', a.state === 'shut' ? '#8a2a22' : '#2f5f3f');
        root.remove(card); card.position.set(doorW / 2, head * 0.7, 0.045); door.add(card);
        door.rotation.y = a.state === 'open' ? -mix(0.7, 1.3, random()) : a.state === 'quiet' ? -0.12 : 0;
        if (a.state === 'open') s.box([doorW * 0.6, head, 0.02], [0.1, head / 2, zb - 0.16], glass);
        else s.box([0.01, 0.01, 0.01], [0, 0.1, zb - 0.1], trim);
      }
      root.add(door);
      if (a.state === 'closing') {
        const banner = s.label('CLOSING DOWN  ·  EVERYTHING MUST GO', W * 0.82, 0.42, [0, head + 0.95 > H - 0.25 ? H - 0.3 : head + 0.95, zb + 0.03], '#fff3c4', '#b3261e');
        banner.rotation.z = -0.02;
      }
    }

    // ---- Light through the front, and dust in it ----
    const motes: THREE.Mesh[] = [];
    if (a.state !== 'shut') {
      const shaftColour = new THREE.Color().setHSL(mix(0.13, 0.07, dusk), 0.8, 0.8);
      const shaftMat = new THREE.MeshBasicMaterial({ color: shaftColour, transparent: true, opacity: mix(0.07, 0.17, dusk) * mix(0.7, 1.2, mood.wear), depthWrite: false, side: THREE.DoubleSide });
      const reach = mix(2.4, 5.2, dusk);
      for (const x of a.flavour === 'kanamono' ? [-2.2, 0, 2.2] : [-(doorW / 2 + hx) / 2, (doorW / 2 + hx) / 2]) {
        const geometry = new THREE.BufferGeometry();
        const w = a.flavour === 'kanamono' ? 0.9 : (hx - doorW / 2) / 2 - 0.2, skew = (mood.daylight - 0.5) * 2.2;
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([x - w, 2.7, zb, x + w, 2.7, zb, x + w + skew, 0.02, zb + reach, x - w + skew, 0.02, zb + reach], 3));
        geometry.setIndex([0, 1, 2, 0, 2, 3]);
        const shaft = new THREE.Mesh(geometry, shaftMat);
        root.add(shaft);
        // The pale patch where it lands.
        const patch = new THREE.Mesh(new THREE.PlaneGeometry(w * 2, reach * 0.55), new THREE.MeshBasicMaterial({ color: shaftColour, transparent: true, opacity: 0.2, depthWrite: false }));
        patch.rotation.x = -Math.PI / 2; patch.position.set(x + skew * 0.8, 0.012, zb + reach * 0.72);
        root.add(patch);
        const moteMat = new THREE.MeshBasicMaterial({ color: '#fff3cf', transparent: true, opacity: 0.75, depthWrite: false });
        for (let i = 0; i < 9 + mood.wear * 10; i++) {
          const t = random();
          const mote = new THREE.Mesh(new THREE.SphereGeometry(0.014, 5, 4), moteMat);
          mote.position.set(x + (random() - 0.5) * w * 2 + skew * t, mix(2.6, 0.2, t) + (random() - 0.5) * 0.3, zb + reach * t);
          mote.userData = { y: mote.position.y, x: mote.position.x, phase: random() * 6 };
          root.add(mote); motes.push(mote);
        }
      }
    }

    // ---- Wall of drawers and shelves along the left, with rail and ladder ----
    const shelfD = 0.46, sx = -hx + shelfD / 2, sFront = -hx + shelfD;
    const steelShelves = a.flavour === 'city';
    const upright = steelShelves ? s.material('#7f8a8e', { metalness: 0.5, roughness: 0.5 }) : wood;
    const zStart = -hz + 0.5, zEnd = hz - 0.3, bays = 8, bayL = (zEnd - zStart) / bays;
    const shelfTop = H - 0.5, drawerTop = steelShelves ? 0.16 : 1.05;
    for (let i = 0; i <= bays; i++) s.box([shelfD, shelfTop, 0.06], [sx, shelfTop / 2, zStart + i * bayL], upright);
    s.box([0.03, shelfTop, zEnd - zStart], [-hx + 0.02, shelfTop / 2, (zStart + zEnd) / 2], steelShelves ? upright : woodDark);
    s.box([shelfD + 0.1, 0.12, zEnd - zStart + 0.14], [sx + 0.03, shelfTop + 0.06, (zStart + zEnd) / 2], steelShelves ? upright : woodDark);
    if (!steelShelves) s.box([shelfD + 0.08, 0.05, zEnd - zStart + 0.06], [sx + 0.03, drawerTop + 0.025, (zStart + zEnd) / 2], woodDark);
    const levels = steelShelves ? 7 : 5;
    const gap = (shelfTop - drawerTop - 0.05) / levels;
    const boards: Item[] = [], boxes: Item[] = [], cans: Item[] = [], fronts: Item[] = [], pulls: Item[] = [], tags: Item[] = [];
    for (let level = 0; level < levels; level++) {
      const y = drawerTop + 0.05 + level * gap;
      if (level > 0 || steelShelves) boards.push({ p: [sx, y, (zStart + zEnd) / 2], sc: [shelfD - 0.02, 0.03, zEnd - zStart] });
      for (let b = 0; b < bays; b++) {
        let z = zStart + b * bayL + 0.06;
        const z1 = z + bayL - 0.12;
        const round = random() < 0.3;
        while (z < z1) {
          if (random() > stockLevel) { z += mix(0.15, 0.45, random()); continue; }
          if (round) {
            const r = mix(0.07, 0.11, random()), h = mix(0.16, 0.26, random());
            if (z + r * 2 > z1) break;
            const n = random() < 0.5 && h * 2 < gap - 0.06 ? 2 : 1;
            for (let k = 0; k < n; k++) cans.push({ p: [sFront - 0.14, y + 0.015 + h / 2 + k * h, z + r], sc: [r, h, r], c: pickStock() });
            z += r * 2 + 0.02;
          } else {
            const l = mix(0.14, 0.42, random()), h = mix(0.1, gap - 0.08, random());
            if (z + l > z1) break;
            const colour = pickStock();
            boxes.push({ p: [sFront - 0.17, y + 0.015 + h / 2, z + l / 2], sc: [0.3, h, l - 0.012], c: colour });
            if (random() < 0.55) tags.push({ p: [sFront - 0.019, y + 0.015 + h / 2, z + l / 2], sc: [1, h * 0.45, l * 0.5], c: '#efe8d2' });
            z += l + mix(0.005, 0.05, random());
          }
        }
      }
    }
    if (!steelShelves) {
      const rows = 4, per = 4, dh = (drawerTop - 0.14) / rows, dl = (bayL - 0.08) / per;
      for (let b = 0; b < bays; b++) for (let r = 0; r < rows; r++) for (let c = 0; c < per; c++) {
        const z = zStart + b * bayL + 0.04 + dl * (c + 0.5), y = 0.13 + dh * (r + 0.5);
        const out = random() < mix(0.01, 0.06, mood.energy) ? mix(0.08, 0.25, random()) : 0;
        fronts.push({ p: [sFront + out, y, z], sc: [0.024, dh - 0.016, dl - 0.016], c: new THREE.Color(F.wood).multiplyScalar(mix(0.9, 1.15, random())) });
        pulls.push({ p: [sFront + out + 0.02, y, z] });
        if (out) boxes.push({ p: [sFront + out / 2 - 0.01, y, z], sc: [out, dh - 0.04, dl - 0.04], c: new THREE.Color(F.wood).multiplyScalar(0.55) });
      }
      s.box([shelfD, 0.12, zEnd - zStart], [sx, 0.06, (zStart + zEnd) / 2], woodDark);
    }
    inst(unit, upright, boards);
    inst(unit, white, boxes);
    inst(tube, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45, metalness: 0.25 }), cans);
    inst(unit, white, fronts);
    inst(new THREE.BoxGeometry(0.03, 0.025, 0.09), brass, pulls);
    inst(new THREE.BoxGeometry(0.004, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), tags);
    // Rail and ladder.
    const railY = 2.85, railX = sFront + 0.14;
    s.rod([railX, railY, zStart], [railX, railY, zEnd], 0.02, steelShelves ? galv : brass);
    for (let i = 0; i <= bays; i += 2) s.rod([sFront, railY - 0.04, zStart + i * bayL], [railX, railY, zStart + i * bayL], 0.012, iron);
    const ladder = new THREE.Group();
    const ladderZ = mix(zStart + 1.2, zEnd - 1.4, random());
    ladder.position.z = ladderZ;
    root.add(ladder);
    const footX = sFront + 0.95, ladderMat = s.material(steelShelves ? '#b9bec2' : '#b08a52', steelShelves ? { metalness: 0.6 } : {});
    const tilt = Math.atan2(footX - railX, railY), len = Math.hypot(footX - railX, railY) + 0.25;
    for (const side of [-1, 1]) {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(0.08, len, 0.04), ladderMat);
      stile.position.set((footX + railX) / 2 - Math.sin(tilt) * 0.125, railY / 2 + 0.125, side * 0.22);
      stile.rotation.z = tilt; stile.castShadow = true;
      ladder.add(stile);
    }
    for (let i = 0; i < 9; i++) {
      const t = (i + 0.8) / 9.6;
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.44), ladderMat);
      rung.position.set(mix(footX, railX, t), railY * t, 0); rung.castShadow = true;
      ladder.add(rung);
    }

    // ---- Overhead: a border of ceiling, joists, and lamps ----
    const ceilTexture = canvasTexture(256, 256, (ctx) => {
      const baseC = a.ceiling === 'tin' ? '#e9e6da' : a.ceiling === 'verdigris' ? '#7f9a86' : '#4a382a';
      ctx.fillStyle = baseC; ctx.fillRect(0, 0, 256, 256);
      if (a.ceiling === 'boards') { for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(0,0,0,${0.1 + random() * 0.2})`; ctx.fillRect(i * 32, 0, 2, 256); } return; }
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3;
      for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) {
        const cx = x * 128 + 64, cy = y * 128 + 64;
        ctx.strokeRect(x * 128 + 5, y * 128 + 5, 118, 118);
        ctx.beginPath(); ctx.arc(cx, cy, 34, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 52); ctx.lineTo(cx + 52, cy); ctx.lineTo(cx, cy + 52); ctx.lineTo(cx - 52, cy); ctx.closePath(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(cx - 2, cy - 2, 34, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      }
      if (mood.wear > 0.4) for (let i = 0; i < 12; i++) { ctx.fillStyle = `rgba(120,70,30,${(mood.wear - 0.4) * 0.5})`; ctx.beginPath(); ctx.ellipse(random() * 256, random() * 256, 10 + random() * 30, 8 + random() * 20, 0, 0, 7); ctx.fill(); }
    });
    ceilTexture.wrapS = ceilTexture.wrapT = THREE.RepeatWrapping;
    const ceilA = ceilTexture.clone(); ceilA.repeat.set(1, Dp / 1.2); ceilA.needsUpdate = true;
    const ceilB = ceilTexture.clone(); ceilB.repeat.set(W / 1.2, 1); ceilB.needsUpdate = true;
    const tinA = new THREE.MeshStandardMaterial({ map: ceilA, metalness: a.ceiling === 'boards' ? 0 : 0.35, roughness: 0.55, side: THREE.DoubleSide });
    const tinB = new THREE.MeshStandardMaterial({ map: ceilB, metalness: a.ceiling === 'boards' ? 0 : 0.35, roughness: 0.55, side: THREE.DoubleSide });
    const stripA = s.mesh(new THREE.PlaneGeometry(1.1, Dp), tinA, [-hx + 0.55, H, 0]); stripA.rotation.x = Math.PI / 2;
    const stripB = s.mesh(new THREE.PlaneGeometry(W, 1.0), tinB, [0, H, zb + 0.5]); stripB.rotation.x = Math.PI / 2;
    s.box([0.12, 0.14, Dp], [-hx + 1.1, H - 0.05, 0], a.ceiling === 'boards' ? woodDark : s.material(a.ceiling === 'tin' ? '#dcd8c8' : '#6f8a76'));
    s.box([W, 0.14, 0.12], [0, H - 0.05, zb + 1.0], a.ceiling === 'boards' ? woodDark : s.material(a.ceiling === 'tin' ? '#dcd8c8' : '#6f8a76'));
    const joistMat = a.ceiling === 'boards' ? woodDark : s.material('#8a7a62');
    const joistZ = [-3.2, -0.4, 2.4, 5.2];
    for (const z of joistZ) s.box([W, 0.16, 0.09], [0, H - 0.08, z], joistMat);
    const lamps: THREE.Group[] = [];
    const lampTint = new THREE.Color().setHSL(mix(0.14, 0.08, mood.warmth), 0.9, 0.72);
    const bulbMat = new THREE.MeshStandardMaterial({ color: lampsOn ? lampTint : '#8f8a7a', emissive: lampTint, emissiveIntensity: lampsOn ? mix(0.9, 2.4, dusk) : 0, roughness: 0.3 });
    joistZ.slice(0, 3).forEach((z, index) => {
      const lamp = new THREE.Group();
      lamp.position.set(0.25 + (index % 2) * 0.5, H - 0.16, z);
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, y: number) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.y = y; mesh.castShadow = true; lamp.add(mesh); return mesh; };
      const drop = a.flavour === 'city' ? 0.25 : mix(0.8, 1.15, random());
      add(new THREE.CylinderGeometry(0.008, 0.008, drop, 5), iron, -drop / 2);
      if (a.flavour === 'city') {
        add(new THREE.BoxGeometry(1.5, 0.07, 0.16), s.material('#e9e7df'), -drop - 0.03);
        const tubeLight = add(new THREE.CylinderGeometry(0.022, 0.022, 1.4, 8), bulbMat, -drop - 0.09); tubeLight.rotation.z = Math.PI / 2;
      } else if (a.flavour === 'kanamono') {
        add(new THREE.SphereGeometry(0.2, 14, 10), new THREE.MeshStandardMaterial({ color: '#f1e6c8', emissive: lampTint, emissiveIntensity: lampsOn ? mix(0.5, 1.3, dusk) : 0, roughness: 0.9 }), -drop - 0.22).scale.y = 1.25;
        add(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12), iron, -drop + 0.02); add(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12), iron, -drop - 0.46);
      } else {
        const shade = add(new THREE.ConeGeometry(0.3, 0.2, 20, 1, true), new THREE.MeshStandardMaterial({ color: a.flavour === 'farm' ? '#8f9a9c' : F.trim, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide }), -drop - 0.06);
        void shade;
        add(new THREE.CylinderGeometry(0.05, 0.07, 0.1, 10), iron, -drop + 0.04);
        add(new THREE.SphereGeometry(0.075, 10, 8), bulbMat, -drop - 0.13);
      }
      root.add(lamp); lamps.push(lamp);
    });
    // Goods hung from the joists: the city shop is thick with them, the others carry a few.
    const hangCount = Math.round((a.flavour === 'city' ? 16 : a.flavour === 'kanamono' ? 3 : 6) * mix(0.4, 1.4, mood.density) * (a.state === 'closing' ? 0.4 : 1));
    const hungPails: Item[] = [], hungBars: Item[] = [], cords: Item[] = [];
    for (let i = 0; i < hangCount; i++) {
      const z = joistZ[Math.floor(random() * 3)], x = mix(-hx + 1.4, hx - 0.3, random()), drop = mix(0.25, 0.7, random());
      if (Math.abs(x - 0.5) < 0.6) continue; // keep clear of the lamps
      cords.push({ p: [x, H - 0.16 - drop / 2, z], sc: [0.006, drop, 0.006], c: '#2a2b2d' });
      const y = H - 0.16 - drop, kind = Math.floor(random() * 3);
      if (kind === 0) hungPails.push({ p: [x, y - 0.15, z], sc: [0.17, 0.3, 0.17], c: a.flavour === 'city' ? pickStock() : '#aab2b6' });
      else if (kind === 1) { hungBars.push({ p: [x, y - 0.5, z], sc: [0.035, 1.0, 0.035], c: '#c9a56a' }); hungBars.push({ p: [x, y - 1.08, z], sc: [0.3, 0.2, 0.06], c: a.flavour === 'city' ? pickStock() : '#c9b48a' }); }
      else hungPails.push({ p: [x, y - 0.1, z], sc: [0.12, 0.2, 0.2], c: a.flavour === 'city' ? pickStock() : '#2a2b2d' });
    }
    inst(unit, white, [...hungBars, ...cords]);
    inst(new THREE.CylinderGeometry(1, 0.78, 1, 14), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.4, roughness: 0.5 }), hungPails);

    // ---- The long counter on the right; we see the keeper's side of it ----
    const cz0 = -3.6, cz1 = 1.9, cLen = cz1 - cz0, cMid = (cz0 + cz1) / 2, cD = 0.85, cH = 1.0;
    const counterWood = a.flavour === 'city' ? s.material('#b9b0a0') : wood;
    s.box([cD + 0.1, 0.06, cLen + 0.1], [counterX, cH, cMid], a.flavour === 'city' ? s.material('#d8d0bc', { roughness: 0.4 }) : s.material(new THREE.Color(F.wood).multiplyScalar(1.15), { roughness: 0.45 }));
    s.box([0.05, cH - 0.03, cLen], [counterX - cD / 2 + 0.025, (cH - 0.03) / 2, cMid], counterWood);
    for (const z of [cz0 + 0.03, cMid, cz1 - 0.03]) s.box([cD, cH - 0.03, 0.05], [counterX, (cH - 0.03) / 2, z], counterWood);
    s.box([cD, 0.04, cLen], [counterX, 0.5, cMid], counterWood);
    s.box([cD, 0.1, cLen], [counterX, 0.05, cMid], woodDark);
    const under: Item[] = [];
    for (let i = 0; i < 16 * stockLevel; i++) {
      const upper = random() < 0.5, l = mix(0.2, 0.45, random()), h = mix(0.15, 0.38, random());
      under.push({ p: [counterX + 0.05, (upper ? 0.52 : 0.1) + h / 2, mix(cz0 + 0.3, cz1 - 0.3, random())], sc: [mix(0.4, 0.65, random()), h, l], c: pickStock() });
    }
    inst(unit, white, under);
    // Paper roll and string at the far end, a scale near the middle.
    s.cylinder(0.11, 0.11, 0.5, [counterX - 0.1, cH + 0.2, cz1 - 0.35], s.material('#b98f5c', { roughness: 0.95 }), 14).rotation.x = Math.PI / 2;
    for (const z of [cz1 - 0.63, cz1 - 0.07]) s.box([0.05, 0.3, 0.03], [counterX - 0.1, cH + 0.16, z], iron);
    if (a.heart === 'till') {
      const tz = -2.4;
      s.box([0.5, 0.14, 0.56], [counterX, cH + 0.1, tz], woodDark);
      s.box([0.44, 0.3, 0.5], [counterX, cH + 0.32, tz], brass);
      const slope = s.box([0.3, 0.3, 0.5], [counterX + 0.14, cH + 0.38, tz], brass); slope.rotation.z = 0.5;
      s.box([0.2, 0.2, 0.52], [counterX - 0.1, cH + 0.56, tz], brass);
      s.label('NO SALE', 0.4, 0.12, [counterX - 0.1, cH + 0.58, tz], '#1b1b1b', '#f1ead2').rotation.y = Math.PI / 2;
      const keys: Item[] = [];
      for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) keys.push({ p: [counterX + 0.1 + r * 0.045, cH + 0.42 - r * 0.045, tz - 0.2 + k * 0.066], sc: [0.022, 0.03, 0.022], c: k % 3 ? '#f1ead2' : '#1b1b1b' });
      inst(tube, white, keys);
      s.rod([counterX, cH + 0.3, tz + 0.27], [counterX + 0.05, cH + 0.5, tz + 0.36], 0.012, brass);
      for (let i = 0; i < 3; i++) {
        s.cylinder(0.1, 0.1, 0.26, [counterX - 0.05, cH + 0.16, tz + 0.75 + i * 0.27], new THREE.MeshPhysicalMaterial({ color: '#e8f2f0', transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false }), 14);
        s.cylinder(0.085, 0.085, 0.16, [counterX - 0.05, cH + 0.11, tz + 0.75 + i * 0.27], s.material(['#c8322a', '#e8b62a', '#3f7d46'][i], { roughness: 0.5 }), 12);
        s.cylinder(0.105, 0.105, 0.03, [counterX - 0.05, cH + 0.3, tz + 0.75 + i * 0.27], brass, 14);
      }
    } else {
      s.box([0.4, 0.14, 0.46], [counterX, cH + 0.1, -2.5], woodDark);
      s.box([0.3, 0.03, 0.3], [counterX - 0.02, cH + 0.18, -2.5], s.material('#efe8d2')).rotation.y = 0.2;
    }
    // Brooms and long handles in a barrel at the near end of the counter.
    const barrel = (x: number, z: number, h = 0.75, r = 0.3) => s.lathe([[0, 0], [r * 0.82, 0], [r, h * 0.5], [r * 0.82, h], [r * 0.74, h], [r * 0.74, h - 0.05], [0, h - 0.05]], wood, [x, 0, z]);
    barrel(counterX - 0.1, cz1 + 0.75);
    for (let i = 0; i < 5; i++) {
      const dx = (random() - 0.5) * 0.3, dz = (random() - 0.5) * 0.3, top = mix(1.4, 1.75, random());
      s.rod([counterX - 0.1 + dx * 0.4, 0.3, cz1 + 0.75 + dz * 0.4], [counterX - 0.1 + dx, top, cz1 + 0.75 + dz], 0.015, s.material('#c9a56a'));
      if (i % 2) s.box([0.3, 0.18, 0.05], [counterX - 0.1 + dx, top + 0.08, cz1 + 0.75 + dz], s.material(a.flavour === 'city' ? '#e23b2e' : '#c9b48a')).rotation.y = random() * 3;
    }

    // ---- The heart of the shop, back left ----
    const hxp = -1.35, hzp = -4.35;
    let stoveGlow: THREE.MeshStandardMaterial | null = null;
    if (a.heart === 'stove') {
      s.cylinder(0.5, 0.5, 0.03, [hxp, 0.015, hzp], s.material('#77736a', { metalness: 0.4 }), 20);
      s.lathe([[0, 0.2], [0.2, 0.2], [0.27, 0.32], [0.33, 0.6], [0.3, 0.85], [0.2, 1.0], [0.22, 1.04], [0.1, 1.12], [0, 1.12]], iron, [hxp, 0, hzp]);
      for (let i = 0; i < 3; i++) s.rod([hxp + Math.cos(i * 2.1) * 0.18, 0.22, hzp + Math.sin(i * 2.1) * 0.18], [hxp + Math.cos(i * 2.1) * 0.27, 0, hzp + Math.sin(i * 2.1) * 0.27], 0.025, iron);
      stoveGlow = new THREE.MeshStandardMaterial({ color: '#ff8a3a', emissive: '#ff5a1a', emissiveIntensity: lampsOn ? mix(0.3, 2.2, mood.warmth) : 0 });
      s.box([0.16, 0.14, 0.02], [hxp + 0.1, 0.55, hzp + 0.31], stoveGlow).rotation.y = 0.3;
      s.cylinder(0.08, 0.08, H - 1.6, [hxp, 1.1 + (H - 1.6) / 2, hzp], iron, 12);
      s.rod([hxp, H - 0.5, hzp], [-hx + 0.1, H - 0.4, hzp], 0.08, iron);
      const chair = (x: number, z: number, yaw: number) => {
        const g = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.04, 14), wood); seat.position.y = 0.46; g.add(seat);
        for (let i = 0; i < 4; i++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.46, 6), woodDark); leg.position.set(Math.cos(i * 1.57 + 0.78) * 0.16, 0.23, Math.sin(i * 1.57 + 0.78) * 0.16); g.add(leg); }
        for (let i = -2; i <= 2; i++) { const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.42, 5), woodDark); spindle.position.set(i * 0.08, 0.68, -0.19 + Math.abs(i) * 0.02); g.add(spindle); }
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.03), wood); rail.position.set(0, 0.9, -0.17); g.add(rail);
        g.traverse((node) => { node.castShadow = true; });
        g.position.set(x, 0, z); g.rotation.y = yaw; root.add(g);
      };
      chair(hxp + 0.2, hzp + 1.25, 2.9); chair(hxp + 1.25, hzp + 0.75, -1.9);
      barrel(hxp + 0.95, hzp + 1.5, 0.6, 0.26);
      const checks: Item[] = [];
      for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) checks.push({ p: [hxp + 0.95 - 0.15 + i * 0.06, 0.61, hzp + 1.5 - 0.15 + k * 0.06], sc: [0.06, 0.012, 0.06], c: (i + k) % 2 ? '#1b1b1b' : '#b3261e' });
      inst(unit, white, checks);
    } else if (a.heart === 'kegs') {
      const nails: Item[] = [];
      for (let i = 0; i < 4; i++) {
        const x = hxp - 0.5 + i * 0.62, z = hzp + (i % 2) * 0.25;
        barrel(x, z, 0.6, 0.27);
        for (const y of [0.12, 0.48]) s.ring(0.26, 0.012, [x, y, z], iron).rotation.x = Math.PI / 2;
        nails.push({ p: [x, 0.555, z], sc: [0.2, 0.02, 0.2], c: ['#6f7478', '#8a5a3a', '#b9bec2', '#3a3b3e'][i] });
      }
      inst(tube, new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.6, roughness: 0.6 }), nails);
      // Hanging scale from the joist above.
      s.rod([hxp, H - 0.16, -3.2], [hxp, 2.2, -3.2], 0.006, iron);
      s.cylinder(0.14, 0.14, 0.06, [hxp, 2.05, -3.2], s.material('#ece7d8'), 18).rotation.x = Math.PI / 2;
      s.ring(0.14, 0.012, [hxp, 2.05, -3.2], brass);
      for (let i = 0; i < 3; i++) s.rod([hxp, 1.9, -3.2], [hxp + Math.cos(i * 2.1) * 0.2, 1.45, -3.2 + Math.sin(i * 2.1) * 0.2], 0.004, iron);
      s.lathe([[0, 0], [0.12, 0.01], [0.21, 0.06], [0.22, 0.07]], brass, [hxp, 1.4, -3.2]);
    } else if (a.heart === 'bench') {
      s.box([1.9, 0.08, 0.7], [hxp + 0.2, 0.9, hzp - 0.35], s.material(new THREE.Color(F.wood).multiplyScalar(1.1)));
      for (const x of [-0.85, 0.85]) for (const z of [-0.28, 0.28]) s.box([0.09, 0.86, 0.09], [hxp + 0.2 + x, 0.43, hzp - 0.35 + z], woodDark);
      s.box([1.7, 0.04, 0.6], [hxp + 0.2, 0.25, hzp - 0.35], woodDark);
      const blue = s.material('#35506b', { metalness: 0.5, roughness: 0.5 });
      s.box([0.16, 0.14, 0.26], [hxp + 0.95, 1.01, hzp - 0.2], blue); s.box([0.2, 0.1, 0.04], [hxp + 0.95, 1.12, hzp - 0.05], blue); s.box([0.2, 0.1, 0.04], [hxp + 0.95, 1.12, hzp + 0.05], blue);
      s.rod([hxp + 0.82, 1.0, hzp + 0.1], [hxp + 1.08, 1.0, hzp + 0.1], 0.01, galv);
      // Goose-neck lamp, a kettle with its lid off waiting for a new element, and scattered parts.
      s.cylinder(0.08, 0.1, 0.03, [hxp - 0.5, 0.955, hzp - 0.5], iron, 12);
      s.tube([[hxp - 0.5, 0.96, hzp - 0.5], [hxp - 0.5, 1.4, hzp - 0.5], [hxp - 0.35, 1.6, hzp - 0.4], [hxp - 0.15, 1.5, hzp - 0.3]], 0.012, iron);
      s.mesh(new THREE.ConeGeometry(0.12, 0.16, 14, 1, true), new THREE.MeshStandardMaterial({ color: F.trim, side: THREE.DoubleSide }), [hxp - 0.12, 1.46, hzp - 0.28]).rotation.set(0.5, 0, -0.9);
      s.ball([0.05, 0.05, 0.05], [hxp - 0.1, 1.43, hzp - 0.27], bulbMat, 8);
      s.lathe([[0, 0], [0.13, 0], [0.15, 0.12], [0.1, 0.2], [0.07, 0.21]], s.material('#c0703a', { metalness: 0.7, roughness: 0.35 }), [hxp + 0.2, 0.94, hzp - 0.3]);
      const parts: Item[] = [];
      for (let i = 0; i < 12; i++) parts.push({ p: [hxp + mix(-0.5, 0.8, random()), 0.95, hzp - mix(0.1, 0.55, random())], sc: [mix(0.03, 0.1, random()), 0.02, 0.03], r: [0, random() * 3, 0], c: random() < 0.5 ? '#b9bec2' : '#c9a14a' });
      inst(unit, new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.7, roughness: 0.4 }), parts);
      s.label('REPAIRS', 1.0, 0.2, [hxp + 0.2, 0.62, hzp + 0.01], '#f3ead0', F.trim);
    } else {
      // The till is on the counter; here a plain stool and a spittoon keep the corner.
      s.cylinder(0.18, 0.18, 0.04, [hxp, 0.62, hzp], wood, 14);
      for (let i = 0; i < 3; i++) s.rod([hxp + Math.cos(i * 2.1) * 0.12, 0.6, hzp + Math.sin(i * 2.1) * 0.12], [hxp + Math.cos(i * 2.1) * 0.2, 0, hzp + Math.sin(i * 2.1) * 0.2], 0.018, woodDark);
      barrel(hxp + 0.8, hzp - 0.3, 0.7, 0.28);
    }

    // ---- Seasonal stock, back right by the window ----
    const qx = hx - 1.3, qz = zb + 1.15;
    const seasonal: Item[] = [], rounds: Item[] = [];
    const lights: THREE.Mesh[] = [];
    if (a.season === 'spring') {
      const rack = new THREE.Group();
      rack.position.set(qx, 0, qz); rack.rotation.y = -0.3;
      const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.5, 0.05), s.material('#3f5f4a')); boardMesh.position.set(0, 0.95, 0); boardMesh.rotation.x = -0.18; boardMesh.castShadow = true;
      rack.add(boardMesh);
      const packets: Item[] = [];
      for (let r = 0; r < 7; r++) for (let c = 0; c < 8; c++) if (random() < stockLevel + 0.2) packets.push({ p: [-0.42 + c * 0.12, 0.38 + r * 0.19, 0.14 - r * 0.035], sc: [0.1, 0.15, 0.012], r: [-0.18, 0, 0], c: new THREE.Color().setHSL(random(), 0.7, 0.55) });
      const packetMesh = inst(unit, white, packets);
      if (packetMesh) { root.remove(packetMesh); rack.add(packetMesh); }
      for (const x of [-0.5, 0.5]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.7, 0.05), woodDark); leg.position.set(x, 0.85, -0.12); rack.add(leg); }
      root.add(rack);
      for (let i = 0; i < 3; i++) {
        seasonal.push({ p: [qx - 1.0 + i * 0.1, 0.06, qz + 0.7 + i * 0.4], sc: [0.5, 0.1, 0.34], c: '#2a2b2d' });
        for (let k = 0; k < 8; k++) rounds.push({ p: [qx - 1.2 + i * 0.1 + (k % 4) * 0.12, 0.18, qz + 0.6 + i * 0.4 + Math.floor(k / 4) * 0.17], sc: [0.05, 0.1, 0.05], c: new THREE.Color().setHSL(mix(0.25, 0.36, random()), 0.6, 0.4) });
      }
      s.lathe([[0, 0], [0.14, 0], [0.16, 0.3], [0.12, 0.34]], galv, [qx + 0.55, 0, qz + 0.9]);
      s.rod([qx + 0.68, 0.2, qz + 0.9], [qx + 0.98, 0.4, qz + 0.9], 0.02, galv);
    } else if (a.season === 'summer') {
      for (let i = 0; i < 2; i++) {
        const fan = new THREE.Group();
        fan.position.set(qx - 0.5 + i * 0.75, 0.3 + i * 0.0, qz + i * 0.3); fan.rotation.y = -0.4 + i * 0.5;
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.58, 0.16), s.material(i ? '#e9e7df' : '#7fb3c9')); frame.castShadow = true;
        const grill = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.17, 20), iron); grill.rotation.x = Math.PI / 2;
        const blades = new THREE.Group();
        for (let b = 0; b < 4; b++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.01), galv); blade.position.set(Math.cos(b * 1.57) * 0.12, Math.sin(b * 1.57) * 0.12, 0.09); blade.rotation.z = b * 1.57; blades.add(blade); }
        fan.add(frame, grill, blades); root.add(fan); spinners.push(blades);
      }
      for (let i = 0; i < 4; i++) { const hose = s.ring(0.24, 0.05, [qx + 0.75, 0.06 + i * 0.1, qz + 0.9], s.material(i % 2 ? '#3f8a4e' : '#2f6f3f')); hose.rotation.x = Math.PI / 2; }
      s.ball([0.3, 0.26, 0.3], [qx - 0.9, 0.78, qz + 0.9], s.material('#b3261e', { roughness: 0.35 }), 16);
      for (let i = 0; i < 3; i++) s.rod([qx - 0.9 + Math.cos(i * 2.1) * 0.16, 0.6, qz + 0.9 + Math.sin(i * 2.1) * 0.16], [qx - 0.9 + Math.cos(i * 2.1) * 0.3, 0, qz + 0.9 + Math.sin(i * 2.1) * 0.3], 0.012, galv);
    } else if (a.season === 'autumn') {
      barrel(qx - 0.2, qz + 0.1);
      for (let i = 0; i < 5; i++) {
        const dx = (random() - 0.5) * 0.5, dz = (random() - 0.5) * 0.4;
        s.rod([qx - 0.2 + dx * 0.3, 0.3, qz + 0.1 + dz * 0.3], [qx - 0.2 + dx, 1.9, qz + 0.1 + dz], 0.014, s.material('#c9a56a'));
        const head = s.mesh(new THREE.CylinderGeometry(0.3, 0.04, 0.34, 12, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: i % 2 ? '#3f8a4e' : '#c9a14a', side: THREE.DoubleSide, roughness: 0.6 }), [qx - 0.2 + dx, 2.0, qz + 0.1 + dz]);
        head.rotation.set(0, random() * 3, 0); head.scale.z = 0.15;
      }
      for (let i = 0; i < 4; i++) rounds.push({ p: [qx + 0.7, 0.45, qz - 0.1 + i * 0.24], sc: [0.1, 0.9, 0.1], c: '#2a2b2d' });
      for (let i = 0; i < 5; i++) s.ball([mix(0.16, 0.26, random()), mix(0.13, 0.2, random()), mix(0.16, 0.26, random())], [qx - 1.0 + (i % 3) * 0.42, 0.15, qz + 0.7 + Math.floor(i / 3) * 0.45], s.material(i === 3 ? '#e8d9a8' : '#d9772a', { roughness: 0.6 }), 12);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) rounds.push({ p: [qx + 0.4 + c * 0.17 + r * 0.085, 0.085 + r * 0.15, qz + 1.2], sc: [0.085, 0.5, 0.085], r: [Math.PI / 2, 0, 0], c: '#9a7448' });
    } else {
      barrel(qx - 0.2, qz + 0.1);
      for (let i = 0; i < 4; i++) {
        const dx = (random() - 0.5) * 0.5, dz = (random() - 0.5) * 0.4;
        s.rod([qx - 0.2 + dx * 0.3, 0.3, qz + 0.1 + dz * 0.3], [qx - 0.2 + dx, 1.5, qz + 0.1 + dz], 0.016, s.material('#c9a56a'));
        s.box([0.42, 0.46, 0.03], [qx - 0.2 + dx, 1.72, qz + 0.1 + dz], s.material(i % 2 ? '#b3261e' : '#aab2b6', { metalness: 0.4 })).rotation.y = random() * 3;
      }
      const sled = new THREE.Group();
      for (let i = 0; i < 5; i++) { const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.02), wood); slat.position.set(-0.2 + i * 0.1, 0.6, 0); sled.add(slat); }
      for (const x of [-0.24, 0.24]) { const runner = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.25, 0.1), s.material('#b3261e', { metalness: 0.4 })); runner.position.set(x, 0.62, -0.07); sled.add(runner); }
      sled.traverse((node) => { node.castShadow = true; });
      sled.position.set(qx + 0.75, 0, qz - 0.3); sled.rotation.x = 0.22; root.add(sled);
      for (let i = 0; i < 5; i++) seasonal.push({ p: [qx - 0.95 + (i % 2) * 0.1, 0.09 + i * 0.16, qz + 0.9], sc: [0.62, 0.15, 0.4], r: [0, (random() - 0.5) * 0.3, 0], c: i % 2 ? '#e9e7df' : '#2f5f8a' });
      // Coloured lights strung along the shelf rail.
      const colours = ['#ff3b2e', '#2fd66a', '#3b8bff', '#ffc62e', '#ff5fd0'];
      for (let i = 0; i < 26; i++) {
        const z = mix(zStart + 0.2, zEnd - 0.2, i / 25);
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), new THREE.MeshStandardMaterial({ color: colours[i % 5], emissive: colours[i % 5], emissiveIntensity: lampsOn ? 1.8 : 0.1 }));
        light.position.set(railX + 0.03, railY - 0.1 - Math.sin((i % 5) / 4 * Math.PI) * 0.12, z);
        root.add(light); lights.push(light);
      }
    }
    inst(unit, white, seasonal);
    inst(tube, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), rounds);

    // ---- Dust sheets when shut, sale cards when closing, clutter with density ----
    if (a.state === 'shut') {
      const sheet = s.material('#d9d5c6', { roughness: 1 });
      s.box([cD + 0.3, 0.5, cLen * 0.7], [counterX, cH + 0.2, cMid - 0.4], sheet);
      s.box([cD + 0.34, 0.5, cLen * 0.7 + 0.04], [counterX, cH - 0.2, cMid - 0.4], sheet);
      s.box([1.5, 1.2, 1.3], [qx - 0.1, 0.6, qz + 0.5], sheet).rotation.y = 0.2;
    }
    if (a.state === 'closing') for (let i = 0; i < 5; i++) {
      const card = s.label(['50% OFF', 'ALL MUST GO', 'LAST DAYS', '75% OFF', 'THANK YOU'][i], 0.7, 0.26, [sFront + 0.02, mix(1.3, 2.4, random()), zStart + 1 + i * 2.1], '#b3261e', '#fff3c4');
      card.rotation.y = Math.PI / 2; card.rotation.x = (random() - 0.5) * 0.2;
    }
    const clutter: Item[] = [];
    for (let i = 0; i < mood.density * 9; i++) {
      const h = mix(0.25, 0.5, random());
      clutter.push({ p: [mix(sFront + 0.5, sFront + 0.9, random()), h / 2, mix(-1, hz - 0.6, random())], sc: [mix(0.3, 0.55, random()), h, mix(0.3, 0.6, random())], r: [0, (random() - 0.5) * 0.6, 0], c: pickStock() });
    }
    inst(unit, white, clutter);

    world.update = (dt, time) => {
      const sway = mix(0.004, 0.05, mood.energy);
      lamps.forEach((lamp, index) => { lamp.rotation.x = Math.sin(time * 0.9 + index * 1.7) * sway; lamp.rotation.z = Math.cos(time * 0.7 + index) * sway * 0.6; });
      for (const mote of motes) {
        mote.position.y = mote.userData.y + Math.sin(time * 0.3 + mote.userData.phase) * 0.12;
        mote.position.x = mote.userData.x + Math.cos(time * 0.23 + mote.userData.phase) * 0.1;
      }
      for (const blades of spinners) blades.rotation.z += dt * mix(1, 14, mood.energy);
      panels.forEach((panel, index) => { panel.rotation.x = Math.sin(time * 1.1 + index) * mix(0.02, 0.2, mood.energy); });
      if (lampsOn) lights.forEach((light, index) => { (light.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + Math.sin(time * 2 + index * 1.3) * 0.8; });
      if (stoveGlow && lampsOn) stoveGlow.emissiveIntensity = mix(0.3, 2.2, mood.warmth) * (0.85 + Math.sin(time * 6) * 0.15);
    };
    return world;
  },
});
