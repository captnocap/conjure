import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, mix } from '@conjure/kit';

type V3 = [number, number, number];
interface Bit { p: V3; r?: V3; s?: V3 | number; c?: THREE.ColorRepresentation }

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat); }
  return texture;
}

function strew(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, bits: readonly Bit[], cast = true) {
  if (!bits.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, bits.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), po = new THREE.Vector3();
  bits.forEach((bit, i) => {
    e.set(...(bit.r ?? [0, 0, 0]));
    q.setFromEuler(e);
    if (typeof bit.s === 'number') sc.setScalar(bit.s); else sc.set(...(bit.s ?? [1, 1, 1]));
    m.compose(po.set(...bit.p), q, sc);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(bit.c ?? '#ffffff'));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = cast; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const XL = -2.4, XR = 2.4, ZB = -4.6, ZF = 7.2, CEIL = 2.95, LINE = 0.85, TOP = 0.9;
const PX0 = -1.5, PX1 = 2.1, PY0 = 0.95, PY1 = 1.95;
const SLOTS = [
  { x: 1.45, z: 2.2, r: 0.7, h: 1.8, lift: 0.9, turn: -0.4 },
  { x: -1.92, z: 1.9, r: 0.5, h: 1.5, lift: 0.9, turn: 1.0 },
  { x: -1.92, z: -2.1, r: 0.48, h: 1.3, lift: 0.9, turn: 0.9 },
  { x: -0.55, z: 3.2, r: 0.45, h: 0.95, lift: 0.4, turn: 0.4 },
] as const;
const VIEWS = {
  chest: { at: [1.0, 1.35, 6.6], to: [-0.8, 1.1, -3], fov: 56 },
  low: { at: [0.8, 0.7, 6.3], to: [-0.7, 1.25, -3], fov: 56 },
  expo: { at: [1.3, 1.95, 6.8], to: [-0.8, 0.8, -2.5], fov: 54 },
} as const;

export default defineWorld({
  questions: {
    moment: choice('What moment of the day is it on the line?', {
      prep: 'Morning prep: quiet, stockpots ticking over, the rail empty, clean plates stacked on the pass.',
      rush: 'The dinner rush: every burner lit, flames high, steam everywhere, the rail jammed with tickets and plates up on the pass.',
      lull: 'A lull between pushes: a few tickets, a couple of pans working, time to wipe down.',
      family: 'Family meal: a big steel pan and a stack of bowls on the pass, the burners low, everyone about to eat standing up.',
      close: 'After close: everything off, scrubbed and wiped, floor hosed, half the lights out, silence.',
    }),
    kitchen: choice('What kind of kitchen is it?', {
      bistro: 'A bistro: a char-grill licking flame, copper pans hanging, dark green trim.',
      diner: 'A diner: a big flat-top griddle of burgers and eggs, red trim.',
      wok: 'A wok kitchen: two roaring wok burners with jet flames, ladles and cleavers, red and gold.',
      pizzeria: 'A pizzeria: a deck oven with a glowing mouth and a peel, terracotta trim.',
      hotel: 'A hotel banquet kitchen: a huge steam kettle, everything institutional steel and blue.',
    }),
    range: choice('What is on the six-burner range?', {
      stock: 'Two tall stockpots sending up steady steam.',
      saute: 'A row of saute pans, one of them flaring up in a column of flame.',
      boilover: 'One forgotten pot boiling over in foam and a great cloud of steam.',
      bare: 'Nothing: bare grates.',
    }),
    dining: choice('What is beyond the pass?', {
      full: 'A full dining room: warm lamps, white cloths, heads at every table.',
      empty: 'Tables laid and lamps lit, nobody seated yet.',
      daylight: 'A bright daytime room with tall sunny windows.',
      chairsup: 'A dim room with the chairs up on the tables.',
      shuttered: 'Nothing: a roll-down steel shutter closed over the pass.',
    }),
    floor: choice('What state is the floor in?', {
      dry: 'Clean dry quarry tile.',
      wet: 'Freshly hosed: pooled shine around the drain and a squeegee against the wall.',
      debris: 'Service debris: dropped tickets, a side towel, scraps kicked under the line.',
      mats: 'Black rubber mats laid along the line.',
    }),
    board: choice('What hangs above the pass?', {
      clock: 'Only the wall clock.',
      eightysix: "The clock and a whiteboard of 86'd dishes, crossed out one by one.",
      hands: 'The clock and a sign: YES CHEF.',
      days: 'The clock and a sign counting days since the last accident.',
    }),
    view: choice('Where are we standing?', {
      chest: 'At chest height at the head of the line, looking down it to the pass.',
      low: 'Low, at knee height, the steel towering.',
      expo: 'A little above head height, looking down along the line.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const art = new Sculpture(context);
    const root = art.root;
    const j = (amount: number) => (random() - 0.5) * amount;
    const closed = a.moment === 'close', rush = a.moment === 'rush';
    const heat = closed ? 0 : rush ? 1 : a.moment === 'lull' ? 0.55 : 0.4;
    const trim = { bistro: '#2f5a44', diner: '#b8302a', wok: '#b3261e', pizzeria: '#b5623c', hotel: '#2f5f95' }[a.kitchen];
    const steel = art.material('#c2c7c8', { metalness: 0.75, roughness: 0.34 });
    const steelDull = art.material('#989e9f', { metalness: 0.65, roughness: 0.5 });
    const dark = art.material('#1c1d1f', { roughness: 0.7 });
    const iron = art.material('#2c2b2a', { roughness: 0.85 });
    const china = art.material('#f4f2ec', { roughness: 0.35 });
    const trimMat = art.material(trim, { roughness: 0.6 });
    const shell = (mesh: THREE.Mesh) => { mesh.castShadow = false; return mesh; };
    const box = (size: V3, at: V3, material: THREE.Material) => art.box(size, at, material);
    const flatMat = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...options });

    // ---- Shell: quarry tile floor, white tile walls, ceiling.
    const tileArt = (repeat: [number, number]) => paint(128, 128, (ctx) => {
      ctx.fillStyle = new THREE.Color('#c9c8bf').lerp(new THREE.Color('#6a6456'), mood.wear * 0.7).getStyle();
      ctx.fillRect(0, 0, 128, 128);
      for (let row = 0; row < 4; row++) for (let col = -1; col < 2; col++) {
        const v = 236 + Math.floor(random() * 14);
        ctx.fillStyle = `rgb(${v},${v},${v - 6})`;
        ctx.fillRect(col * 64 + (row % 2) * 32 + 1.5, row * 32 + 1.5, 61, 29);
      }
      for (let i = 0; i < mood.wear * 18; i++) { ctx.fillStyle = `rgba(120,95,50,${0.05 + random() * 0.12})`; ctx.beginPath(); ctx.arc(random() * 128, random() * 128, 6 + random() * 22, 0, 7); ctx.fill(); }
    }, repeat);
    const floorArt = paint(128, 128, (ctx) => {
      ctx.fillStyle = '#4a372e'; ctx.fillRect(0, 0, 128, 128);
      for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) {
        const c = new THREE.Color('#a4563c').offsetHSL(j(0.015), j(0.08), j(0.06));
        ctx.fillStyle = c.getStyle(); ctx.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
        for (let i = 0; i < 4 + mood.wear * 10; i++) { ctx.fillStyle = `rgba(40,25,18,${0.06 + random() * 0.14})`; ctx.fillRect(x * 64 + random() * 56, y * 64 + random() * 56, 4 + random() * 12, 3 + random() * 8); }
      }
    }, [(XR - XL) / 0.4, (ZF - ZB) / 0.4]);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, ZF - ZB).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: floorArt, roughness: a.floor === 'wet' ? 0.6 : 0.8 }));
    floor.position.set(0, 0, (ZF + ZB) / 2);
    floor.receiveShadow = true;
    root.add(floor);
    const wallL = shell(art.mesh(new THREE.PlaneGeometry(ZF - ZB, CEIL).rotateY(Math.PI / 2), flatMat('#ffffff', { map: tileArt([(ZF - ZB) / 0.6, CEIL / 0.6]), roughness: 0.4 }), [XL, CEIL / 2, (ZF + ZB) / 2]));
    void wallL;
    shell(art.mesh(new THREE.PlaneGeometry(ZF - ZB, CEIL).rotateY(-Math.PI / 2), flatMat('#ffffff', { map: tileArt([(ZF - ZB) / 0.6, CEIL / 0.6]), roughness: 0.4 }), [XR, CEIL / 2, (ZF + ZB) / 2]));
    shell(art.mesh(new THREE.PlaneGeometry(XR - XL, ZF - ZB).rotateX(Math.PI / 2), flatMat('#e9e7df', { roughness: 0.95, emissive: '#e9e7df', emissiveIntensity: 0.55 }), [0, CEIL, (ZF + ZB) / 2]));
    // Coved skirting in the trim colour.
    shell(box([0.03, 0.16, ZF - ZB], [XR - 0.015, 0.08, (ZF + ZB) / 2], trimMat));
    // Back wall around the pass opening.
    const backTile = (w: number, h: number) => flatMat('#ffffff', { map: tileArt([w / 0.6, h / 0.6]), roughness: 0.4 });
    shell(box([PX0 - XL, CEIL, 0.2], [(PX0 + XL) / 2, CEIL / 2, ZB - 0.1], backTile(PX0 - XL, CEIL)));
    shell(box([XR - PX1, CEIL, 0.2], [(PX1 + XR) / 2, CEIL / 2, ZB - 0.1], backTile(XR - PX1, CEIL)));
    shell(box([PX1 - PX0, CEIL - PY1, 0.2], [(PX0 + PX1) / 2, (CEIL + PY1) / 2, ZB - 0.1], backTile(PX1 - PX0, CEIL - PY1)));
    shell(box([PX1 - PX0, PY0, 0.2], [(PX0 + PX1) / 2, PY0 / 2, ZB - 0.1], steelDull));
    shell(box([XR - XL, 0.06, 0.03], [0, CEIL - 0.42, ZB + 0.015], trimMat));
    // Ceiling tubes over the aisle.
    const tubeTint = new THREE.Color().setHSL(mix(0.58, 0.11, mood.warmth), 0.5, 0.9);
    const tubeMats: THREE.MeshStandardMaterial[] = [];
    [3.6, 0.4, -2.8].forEach((z, i) => {
      const on = !closed || i === 1;
      const m = new THREE.MeshStandardMaterial({ color: on ? '#ffffff' : '#9a9c98', emissive: tubeTint, emissiveIntensity: on ? 1.5 : 0.05 });
      tubeMats.push(m);
      shell(box([0.34, 0.06, 1.5], [0.45, CEIL - 0.04, z], flatMat('#d9d9d2')));
      for (const x of [-0.08, 0.08]) shell(box([0.05, 0.03, 1.4], [0.45 + x, CEIL - 0.085, z], m));
    });

    // ---- The dining room beyond the pass.
    const DZ = -9.2;
    if (a.dining !== 'shuttered') {
      const dim = a.dining === 'chairsup';
      const glow = dim ? 0.3 : a.dining === 'daylight' ? 1.25 : mix(0.85, 1.15, mood.cheer);
      const far = paint(512, 192, (ctx) => {
        ctx.fillStyle = dim ? '#5f6876' : a.dining === 'daylight' ? '#f1e9d6' : new THREE.Color().setHSL(mix(0.1, 0.07, mood.warmth), 0.55, 0.72).getStyle();
        ctx.fillRect(0, 0, 512, 192);
        ctx.fillStyle = dim ? '#3f4652' : '#8a5a34'; ctx.fillRect(0, 140, 512, 52);
        for (let i = 0; i < 5; i++) {
          const x = 20 + i * 100;
          if (a.dining === 'daylight') {
            const sky = ctx.createLinearGradient(0, 10, 0, 136); sky.addColorStop(0, '#bfe3ff'); sky.addColorStop(1, '#fff7dc');
            ctx.fillStyle = sky; ctx.fillRect(x, 10, 74, 126);
            ctx.fillStyle = '#7fae6a'; ctx.fillRect(x, 108, 74, 28);
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.strokeRect(x, 10, 74, 126); ctx.beginPath(); ctx.moveTo(x + 37, 10); ctx.lineTo(x + 37, 136); ctx.stroke();
          } else if (dim) {
            ctx.fillStyle = '#2f3a52'; ctx.fillRect(x, 14, 74, 118);
            for (let k = 0; k < 4; k++) { ctx.fillStyle = ['#ffd27a', '#ff8a5a', '#9fd0ff'][k % 3]; ctx.beginPath(); ctx.arc(x + 8 + random() * 58, 40 + random() * 80, 2 + random() * 3, 0, 7); ctx.fill(); }
          } else {
            const halo = ctx.createRadialGradient(x + 37, 44, 2, x + 37, 44, 46); halo.addColorStop(0, '#fff6d0'); halo.addColorStop(1, 'rgba(255,240,190,0)');
            ctx.fillStyle = halo; ctx.fillRect(x - 12, 0, 100, 100);
            ctx.fillStyle = ['#7a3b2a', '#2f4f5a', '#8a7a3a', '#5a3a5a', '#3f5a3a'][i]; ctx.fillRect(x + 12, 70, 50, 48);
            ctx.strokeStyle = '#c9a23a'; ctx.lineWidth = 4; ctx.strokeRect(x + 12, 70, 50, 48);
          }
        }
      });
      shell(art.mesh(new THREE.PlaneGeometry(13, 4.2), new THREE.MeshStandardMaterial({ map: far, emissive: '#ffffff', emissiveMap: far, emissiveIntensity: glow, roughness: 1 }), [0.3, 1.9, DZ]));
      shell(art.mesh(new THREE.PlaneGeometry(13, DZ - ZB).rotateX(-Math.PI / 2), flatMat(dim ? '#4f463f' : '#a57a4c', { emissive: '#a57a4c', emissiveIntensity: dim ? 0 : 0.25 }), [0.3, 0.001, (DZ + ZB) / 2 - 0.1]));
      const cloth = new THREE.MeshStandardMaterial({ color: dim ? '#8f949c' : '#fbf8ef', emissive: '#fff3d6', emissiveIntensity: dim ? 0 : 0.35, roughness: 0.9 });
      const chairMat = flatMat(dim ? '#3a2e28' : '#5a3a26');
      const lampMat = new THREE.MeshStandardMaterial({ color: '#fff0c4', emissive: new THREE.Color().setHSL(0.1, 0.9, 0.62), emissiveIntensity: dim ? 0.1 : 2.2 });
      const people: Bit[] = [], heads: Bit[] = [];
      const coats = ['#3a4a6a', '#7a2f3a', '#2f5a4a', '#c9b48a', '#22262c', '#8a5a7a', '#d9d4c8'];
      const skins = ['#e9c2a0', '#c9925e', '#8a5a3a', '#f0d2b8', '#6a4028'];
      for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) {
        const tx = -2.3 + i * 1.75 + row * 0.8 + j(0.2), tz = ZB - 1.7 - row * 1.6 + j(0.2);
        shell(art.cylinder(0.55, 0.55, 0.04, [tx, 0.76, tz], cloth, 20));
        shell(art.cylinder(0.5, 0.56, 0.3, [tx, 0.6, tz], cloth, 20));
        shell(art.cylinder(0.05, 0.05, 0.5, [tx, 0.25, tz], chairMat, 8));
        shell(art.cylinder(0.012, 0.012, CEIL - 1.9, [tx, (CEIL + 1.9) / 2, tz], dark, 6));
        shell(art.lathe([[0.03, 0.14], [0.08, 0.1], [0.17, 0]], flatMat(dim ? '#55585c' : trim, { side: THREE.DoubleSide }), [tx, 1.78, tz]));
        shell(art.ball([0.06, 0.06, 0.06], [tx, 1.8, tz], lampMat, 10));
        for (const side of [-1, 1]) {
          const cx = tx + side * 0.72;
          if (dim) { const up = shell(box([0.4, 0.42, 0.4], [tx + side * 0.22, 1.0, tz + j(0.1)], chairMat)); up.rotation.y = j(0.4); shell(box([0.4, 0.04, 0.4], [tx + side * 0.22, 0.8, tz], chairMat)); }
          else {
            shell(box([0.42, 0.05, 0.42], [cx, 0.46, tz], chairMat));
            shell(box([0.05, 0.5, 0.42], [cx + side * 0.2, 0.72, tz], chairMat));
            if (a.dining === 'full' && random() < 0.85) {
              people.push({ p: [cx, 0.86, tz], s: [0.2, 0.32, 0.17], c: coats[Math.floor(random() * coats.length)] });
              heads.push({ p: [cx - side * 0.03, 1.3, tz], s: 0.105, c: skins[Math.floor(random() * skins.length)] });
            }
          }
        }
        if (!dim) { shell(art.cylinder(0.14, 0.14, 0.012, [tx - 0.2, 0.787, tz + 0.1], china, 14)); shell(art.cylinder(0.14, 0.14, 0.012, [tx + 0.2, 0.787, tz - 0.1], china, 14)); shell(art.cylinder(0.02, 0.03, 0.2, [tx, 0.88, tz], flatMat(a.dining === 'full' ? '#3a5a2a' : '#e9e6da', { roughness: 0.2 }), 8)); }
      }
      const sphere = new THREE.SphereGeometry(1, 12, 8);
      strew(root, sphere, flatMat('#ffffff', { emissive: '#3a3028', emissiveIntensity: 0.4 }), people, false);
      strew(root, sphere, flatMat('#ffffff', { emissive: '#4a3828', emissiveIntensity: 0.5 }), heads, false);
    } else {
      const slats = paint(64, 128, (ctx) => { for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? '#8d9394' : '#aab0b0'; ctx.fillRect(0, i * 8, 64, 8); ctx.fillStyle = '#6f7576'; ctx.fillRect(0, i * 8, 64, 1.5); } });
      shell(box([PX1 - PX0, PY1 - PY0, 0.04], [(PX0 + PX1) / 2, (PY0 + PY1) / 2, ZB - 0.1], new THREE.MeshStandardMaterial({ map: slats, metalness: 0.5, roughness: 0.5 })));
      box([0.3, 0.05, 0.03], [(PX0 + PX1) / 2, PY0 + 0.06, ZB - 0.07], dark);
    }

    // ---- The pass: shelf, heat lamps, ticket rail, bell.
    const pz = ZB + 0.12;
    box([PX1 - PX0 + 0.1, 0.05, 0.62], [(PX0 + PX1) / 2, PY0 + 0.025, ZB + 0.06], steel);
    box([PX1 - PX0 + 0.1, 0.1, 0.02], [(PX0 + PX1) / 2, PY0 - 0.04, ZB + 0.36], steelDull);
    box([PX1 - PX0, 0.05, 0.3], [(PX0 + PX1) / 2, PY1 - 0.025, ZB + 0.02], steel);
    const lampsOn = !closed && a.dining !== 'shuttered';
    const glowTint = new THREE.Color().setHSL(mix(0.085, 0.04, mood.warmth), 1, 0.54);
    const bulb = new THREE.MeshStandardMaterial({ color: lampsOn ? '#ffd9a0' : '#6a4a3c', emissive: lampsOn ? glowTint : new THREE.Color('#000000'), emissiveIntensity: lampsOn ? 2.4 : 0 });
    const beam = new THREE.MeshBasicMaterial({ color: glowTint, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    const shade = a.kitchen === 'bistro' ? art.material('#c9753c', { metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide }) : art.material('#d5d9d9', { metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide });
    const lampX = [-1.05, -0.15, 0.75, 1.65];
    for (const x of lampX) {
      art.cylinder(0.008, 0.008, 0.2, [x, PY1 - 0.15, pz], dark, 6);
      art.lathe([[0.035, 0.17], [0.07, 0.14], [0.15, 0.03], [0.165, 0]], shade, [x, PY1 - 0.42, pz]);
      shell(art.ball([0.05, 0.05, 0.05], [x, PY1 - 0.38, pz], bulb, 10));
      if (lampsOn) { const cone = art.cylinder(0.13, 0.3, PY1 - 0.42 - PY0 - 0.05, [x, (PY1 - 0.42 + PY0 + 0.05) / 2, pz], beam, 16); cone.castShadow = cone.receiveShadow = false; (cone.geometry as THREE.CylinderGeometry).dispose(); cone.geometry = new THREE.CylinderGeometry(0.13, 0.3, PY1 - 0.42 - PY0 - 0.05, 16, 1, true); const pool = art.cylinder(0.3, 0.3, 0.003, [x, PY0 + 0.053, pz], new THREE.MeshBasicMaterial({ color: glowTint, transparent: true, opacity: 0.5, depthWrite: false }), 20); pool.castShadow = pool.receiveShadow = false; }
    }
    // Ticket rail.
    const railZ = ZB + 0.19, railY = PY1 - 0.035;
    box([PX1 - PX0 - 0.1, 0.03, 0.025], [(PX0 + PX1) / 2, railY, railZ], art.material('#dfe3e3', { metalness: 0.85, roughness: 0.2 }));
    const chitArt = [0, 1, 2].map(() => paint(64, 192, (ctx) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 64, 192);
      ctx.fillStyle = '#2a2a30'; ctx.fillRect(8, 8, 48, 10);
      ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 3;
      for (let y = 30; y < 180; y += 12) { if (random() < 0.15) continue; ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(22 + random() * 34, y); ctx.stroke(); }
    }));
    const paperTints = a.kitchen === 'wok' ? ['#ffffff', '#f6b0b0', '#ffffff'] : a.kitchen === 'diner' ? ['#ffffff', '#c9eec9', '#f5e58a'] : ['#ffffff', '#f6f4ee'];
    const chitMats = paperTints.flatMap((tint) => chitArt.map((map) => new THREE.MeshStandardMaterial({ map, color: tint, roughness: 0.9, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.12 })));
    const chitGeo = new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0);
    const chits: { mesh: THREE.Mesh; lean: number; phase: number }[] = [];
    const chitCount = closed ? 0 : a.moment === 'prep' ? (mood.density > 0.7 ? 1 : 0) : rush ? Math.round(mix(16, 30, mood.density)) : a.moment === 'lull' ? 3 + Math.floor(random() * 3) : 2;
    const span = PX1 - PX0 - 0.3;
    for (let i = 0; i < chitCount; i++) {
      const mesh = new THREE.Mesh(chitGeo, chitMats[Math.floor(random() * chitMats.length)]);
      const x = rush ? PX0 + 0.15 + (i + 0.5) / chitCount * span + j(0.02) : PX0 + 0.2 + i * 0.105;
      mesh.scale.set(0.085, mix(0.14, 0.36, random()), 1);
      mesh.position.set(x, railY, railZ + 0.016 + (i % 2) * 0.004);
      const lean = 0.05 + random() * 0.14;
      mesh.rotation.set(lean, 0, j(0.1));
      mesh.castShadow = true;
      root.add(mesh);
      chits.push({ mesh, lean, phase: random() * 6 });
    }
    // Bell.
    art.cylinder(0.055, 0.06, 0.012, [PX1 - 0.25, PY0 + 0.056, ZB + 0.25], dark, 16);
    art.ball([0.05, 0.036, 0.05], [PX1 - 0.25, PY0 + 0.064, ZB + 0.25], art.material('#e3e6e6', { metalness: 0.95, roughness: 0.12 }), 16);
    // What is up on the pass.
    const plateGeo = new THREE.LatheGeometry([[0, 0.006], [0.085, 0.006], [0.135, 0.024], [0.14, 0.026], [0.085, 0], [0, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 24);
    const passY = PY0 + 0.05;
    const foodTints = { bistro: ['#5a2f1c', '#4f9a3a', '#f1e6c0'], diner: ['#c98a44', '#e8b84a', '#4a2a1a'], wok: ['#c9772a', '#4f9a3a', '#f6f0dc'], pizzeria: ['#e8c06a', '#c0321f', '#4f9a3a'], hotel: ['#b9864a', '#e2812a', '#f1e6c0'] }[a.kitchen];
    const plateUp = (x: number, z: number) => {
      art.mesh(plateGeo, china, [x, passY, z]);
      art.ball([0.07, 0.03, 0.055], [x - 0.01, passY + 0.035, z], flatMat(foodTints[0]), 8).rotation.y = random() * 3;
      art.ball([0.04, 0.02, 0.04], [x + 0.05, passY + 0.03, z + 0.03], flatMat(foodTints[1]), 8);
      art.ball([0.035, 0.025, 0.035], [x - 0.02, passY + 0.03, z - 0.06], flatMat(foodTints[2]), 8);
    };
    const stackUp = (x: number, z: number, n: number) => { const bits: Bit[] = []; for (let i = 0; i < n; i++) bits.push({ p: [x + j(0.008), passY + i * 0.012, z + j(0.008)] }); strew(root, plateGeo, china, bits); };
    if (rush) for (let i = 0; i < 5; i++) plateUp(PX0 + 0.35 + i * 0.5 + j(0.08), ZB + 0.12 + j(0.1));
    else if (a.moment === 'lull') plateUp(lampX[1] + j(0.1), ZB + 0.12);
    else if (a.moment === 'prep') for (let i = 0; i < 4; i++) stackUp(PX0 + 0.4 + i * 0.4, ZB + 0.08, 5 + Math.floor(random() * 9));
    else if (a.moment === 'family') {
      box([0.56, 0.1, 0.34], [-0.6, passY + 0.05, ZB + 0.12], steelDull);
      box([0.52, 0.02, 0.3], [-0.6, passY + 0.095, ZB + 0.12], flatMat(foodTints[0]));
      for (let i = 0; i < 8; i++) art.ball([0.035, 0.018, 0.035], [-0.6 + j(0.44), passY + 0.108, ZB + 0.12 + j(0.22)], flatMat(foodTints[1 + (i % 2)]), 7);
      const bowls = ['#f3f1ea', '#7fa8c9', '#f3f1ea', '#d9a05a', '#8fb58a', '#f3f1ea', '#c97a6a'];
      for (let i = 0; i < 7; i++) art.lathe([[0, 0], [0.05, 0], [0.085, 0.045], [0.088, 0.047]], flatMat(bowls[i], { roughness: 0.4, side: THREE.DoubleSide }), [-0.05 + j(0.008), passY + i * 0.022, ZB + 0.12]);
      art.cylinder(0.05, 0.04, 0.12, [0.2, passY + 0.06, ZB + 0.1], steelDull, 12);
      for (let i = 0; i < 6; i++) art.rod([0.2 + j(0.03), passY + 0.05, ZB + 0.1 + j(0.03)], [0.2 + j(0.09), passY + 0.24, ZB + 0.1 + j(0.09)], 0.004, steel);
    }
    // Above the pass: the clock and a board.
    const clockX = -0.9, clockY = 2.45;
    const clockArt = paint(128, 128, (ctx) => {
      ctx.fillStyle = '#f6f4ec'; ctx.beginPath(); ctx.arc(64, 64, 60, 0, 7); ctx.fill();
      ctx.strokeStyle = '#1c1d1f'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(64, 64, 58, 0, 7); ctx.stroke();
      ctx.lineWidth = 4; for (let i = 0; i < 12; i++) { const t = i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(64 + Math.sin(t) * 46, 64 - Math.cos(t) * 46); ctx.lineTo(64 + Math.sin(t) * 53, 64 - Math.cos(t) * 53); ctx.stroke(); }
      const hour = { prep: 9.5, rush: 20.2, lull: 15.7, family: 16.5, close: 0.6 }[a.moment] + j(0.6);
      const hand = (t: number, len: number, w: number) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.sin(t) * len, 64 - Math.cos(t) * len); ctx.stroke(); };
      hand(hour / 12 * Math.PI * 2, 28, 7); hand((hour % 1) * Math.PI * 2, 44, 4);
    });
    shell(art.mesh(new THREE.CircleGeometry(0.19, 28), new THREE.MeshStandardMaterial({ map: clockArt, roughness: 0.5 }), [clockX, clockY, ZB + 0.012]));
    if (a.board !== 'clock') {
      const boardArt = paint(384, 192, (ctx) => {
        const text = (value: string, x: number, y: number, size: number, colour: string) => { ctx.fillStyle = colour; ctx.font = `bold ${size}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(value, x, y, 360); };
        if (a.board === 'eightysix') {
          ctx.fillStyle = '#f8f8f4'; ctx.fillRect(0, 0, 384, 192); ctx.strokeStyle = '#8d9394'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, 384, 192);
          text('86', 64, 52, 60, '#c4201a');
          const dishes = { bistro: ['DUCK', 'OYSTERS', 'TARTE', 'BASS'], diner: ['MEATLOAF', 'PIE', 'RIBS', 'CHILI'], wok: ['CRAB', 'DUCK', 'PEA TIPS', 'CLAMS'], pizzeria: ['BURRATA', 'CLAM PIE', 'TIRAMISU', 'VEAL'], hotel: ['SALMON', 'PRIME RIB', 'SOUP', 'CREME B'] }[a.kitchen];
          const n = closed ? 4 : rush ? 3 : 1 + Math.floor(random() * 2);
          dishes.slice(0, n).forEach((dish, i) => { text(dish, 250, 36 + i * 40, 30, '#1f3f8f'); if (random() < 0.5) { ctx.strokeStyle = '#c4201a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(160, 36 + i * 40); ctx.lineTo(340, 34 + i * 40); ctx.stroke(); } });
        } else if (a.board === 'hands') {
          ctx.fillStyle = trim; ctx.fillRect(0, 0, 384, 192); ctx.strokeStyle = '#f4efdc'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, 364, 172);
          text('YES', 192, 64, 78, '#f4efdc'); text('CHEF', 192, 136, 78, '#f4efdc');
        } else {
          ctx.fillStyle = '#f2c81e'; ctx.fillRect(0, 0, 384, 192); ctx.strokeStyle = '#111111'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, 384, 192);
          text('DAYS SINCE', 150, 50, 34, '#111111'); text('LAST ACCIDENT', 150, 96, 34, '#111111');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(280, 30, 84, 110);
          text(String(Math.round(Math.max(0, (1 - mood.wear) * (1 - mood.energy) * 120 * random()))), 322, 86, 56, '#c4201a');
        }
      });
      shell(art.mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshStandardMaterial({ map: boardArt, roughness: 0.6 }), [0.5, 2.42, ZB + 0.012]));
    }

    // ---- The hot line along the left wall.
    const FX = XL + LINE;
    const unit = (z0: number, z1: number, h = TOP) => box([LINE, h - 0.12, z1 - z0], [XL + LINE / 2, (h + 0.12) / 2, (z0 + z1) / 2], steelDull);
    const legs: Bit[] = [], knobs: Bit[] = [];
    const feet = (z0: number, z1: number) => { for (const z of [z0 + 0.08, z1 - 0.08]) for (const x of [XL + 0.1, FX - 0.08]) legs.push({ p: [x, 0.06, z], s: [0.03, 0.12, 0.03] }); };
    const flames: (Bit & { base: number; wild: number })[] = [];
    const steamAt: { x: number; y: number; z: number; n: number; spread: number; rise: number }[] = [];
    const flameRing = (x: number, y: number, z: number, radius: number, height: number, colour: string, wild = 0.3, n = 8) => { for (let i = 0; i < n; i++) { const t = i / n * 6.283 + random(); flames.push({ p: [x + Math.cos(t) * radius, y, z + Math.sin(t) * radius], s: [0.02 + height * 0.12, height, 0.02 + height * 0.12], c: colour, base: height * mix(0.7, 1.2, random()), wild }); } };
    // Backsplash, shelf and the canopy hood.
    const H0 = -2.75, H1 = 2.6;
    shell(box([0.02, 1.2, H1 - H0], [XL + 0.012, TOP + 0.6, (H0 + H1) / 2], steel));
    box([0.32, 0.025, H1 - H0 - 0.2], [XL + 0.17, 1.52, (H0 + H1) / 2], steel);
    const hoodMat = art.material('#a9afb0', { metalness: 0.75, roughness: 0.36 });
    const HW = 1.42, HY = 2.02;
    shell(box([HW, 0.5, H1 - H0], [XL + HW / 2, HY + 0.37, (H0 + H1) / 2], hoodMat));
    shell(box([0.04, 0.3, H1 - H0], [XL + HW, HY + 0.13, (H0 + H1) / 2], hoodMat));
    for (const z of [H0, H1]) shell(box([HW, 0.3, 0.04], [XL + HW / 2, HY + 0.13, z], hoodMat));
    shell(box([0.02, 0.05, H1 - H0], [XL + HW + 0.012, HY + 0.005, (H0 + H1) / 2], trimMat));
    const baffle = paint(64, 64, (ctx) => { ctx.fillStyle = '#7d8384'; ctx.fillRect(0, 0, 64, 64); for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#b9bebe' : '#565b5c'; ctx.fillRect(i * 8, 3, 5, 58); } ctx.fillStyle = '#3f4445'; ctx.fillRect(0, 0, 64, 3); ctx.fillRect(0, 61, 64, 3); ctx.fillRect(0, 0, 2, 64); }, [(H1 - H0) / 0.5, 1]);
    const filters = shell(art.mesh(new THREE.PlaneGeometry(H1 - H0 - 0.1, 0.8).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ map: baffle, metalness: 0.6, roughness: 0.45, side: THREE.DoubleSide }), [XL + 0.5, HY + 0.3, (H0 + H1) / 2]));
    filters.rotation.z = -0.75;
    shell(box([0.6, CEIL - HY - 0.6, 0.6], [XL + 0.55, (CEIL + HY + 0.6) / 2, 0.3], hoodMat));
    const hoodLamp = new THREE.MeshStandardMaterial({ color: '#fff6dc', emissive: new THREE.Color().setHSL(mix(0.14, 0.09, mood.warmth), 0.8, 0.75), emissiveIntensity: closed ? 0.1 : 1.8 });
    for (const z of [-1.9, -0.2, 1.5]) shell(box([0.22, 0.03, 0.5], [XL + 1.1, HY + 0.11, z], hoodLamp));
    for (let i = 0; i < Math.round(mood.wear * 12); i++) { const len = mix(0.05, 0.22, random()); shell(box([0.004, len, mix(0.01, 0.03, random())], [XL + HW + 0.022, HY + 0.28 - len / 2 - random() * 0.05, mix(H0, H1, random())], flatMat('#4a3418', { roughness: 0.4 }))); }

    // Near prep counter (mostly a foreground edge).
    unit(3.1, 5.6); feet(3.1, 5.6);
    box([LINE + 0.03, 0.04, 2.5], [XL + LINE / 2, TOP + 0.02, 4.35], steel);
    box([0.5, 0.05, 0.7], [XL + 0.45, TOP + 0.065, 3.7], flatMat({ bistro: '#b07a45', diner: '#eeeee8', wok: '#c9a26a', pizzeria: '#b07a45', hotel: '#3f9a4c' }[a.kitchen]));
    for (let i = 0; i < 4; i++) { art.cylinder(0.052, 0.042, 0.1, [XL + 0.2 + (i % 2) * 0.13, TOP + 0.09, 4.4 + Math.floor(i / 2) * 0.14], flatMat(['#c0321f', '#4f9a3a', '#e8c531', '#f3ead6'][i]), 10); }

    // Six-burner range.
    const A0 = -0.1, A1 = 1.3;
    unit(A0, A1); feet(A0, A1);
    box([0.02, 0.44, A1 - A0 - 0.1], [FX + 0.006, 0.4, (A0 + A1) / 2], dark);
    art.rod([FX + 0.05, 0.6, A0 + 0.15], [FX + 0.05, 0.6, A1 - 0.15], 0.012, steel);
    box([LINE, 0.04, A1 - A0], [XL + LINE / 2, TOP - 0.1 + 0.11, (A0 + A1) / 2], iron);
    for (let i = 0; i < 6; i++) knobs.push({ p: [FX + 0.02, 0.78, A0 + 0.14 + i * 0.225], r: [0, 0, Math.PI / 2], s: [0.03, 0.03, 0.03], c: trim });
    const burners: [number, number][] = [];
    for (const x of [XL + 0.24, XL + 0.62]) for (const z of [A0 + 0.24, A0 + 0.7, A0 + 1.16]) burners.push([x, z]);
    const BY = TOP + 0.035;
    const grateBits: Bit[] = [];
    for (const [x, z] of burners) for (let k = 0; k < 4; k++) grateBits.push({ p: [x, BY + 0.012, z], r: [0, k * Math.PI / 4, 0], s: [0.3, 0.016, 0.02] });
    strew(root, new THREE.BoxGeometry(1, 1, 1), iron, grateBits);
    const lit = closed ? 0 : rush ? 6 : a.range === 'bare' ? 1 : 3;
    burners.forEach(([x, z], i) => { if (i < lit) flameRing(x, BY, z, 0.08, mix(0.05, 0.12, heat), '#58b4ff', 0.25); });
    const potMat = art.material('#b9bebf', { metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide });
    const copper = art.material('#c9753c', { metalness: 0.85, roughness: 0.28, side: THREE.DoubleSide });
    const pot = (x: number, z: number, r: number, h: number, steam: number) => {
      shell(art.mesh(new THREE.CylinderGeometry(r, r, h, 20, 1, true), potMat, [x, BY + 0.03 + h / 2, z])).castShadow = true;
      art.cylinder(r * 0.97, r * 0.97, 0.01, [x, BY + 0.03 + h * 0.85, z], flatMat('#c9a25a', { roughness: 0.3 }), 20);
      for (const side of [-1, 1]) art.box([0.02, 0.02, 0.07], [x, BY + h * 0.8, z + side * (r + 0.03)], potMat);
      if (steam) steamAt.push({ x, y: BY + h, z, n: steam, spread: r, rise: 1.0 });
    };
    const sautePan = (x: number, z: number, flare: boolean) => {
      art.cylinder(0.14, 0.11, 0.05, [x, BY + 0.055, z], a.kitchen === 'bistro' ? copper : iron, 18);
      art.cylinder(0.13, 0.13, 0.006, [x, BY + 0.078, z], flatMat(['#8a5a2a', '#c9772a', '#4f7a2a'][Math.floor(random() * 3)]), 18);
      art.rod([x + 0.13, BY + 0.07, z], [x + 0.4, BY + 0.12, z + j(0.15)], 0.011, steelDull);
      if (flare) { flameRing(x, BY + 0.08, z, 0.07, mix(0.45, 0.8, mood.energy), '#ff8a1e', 1, 9); flameRing(x, BY + 0.08, z, 0.03, mix(0.3, 0.6, mood.energy), '#ffd84a', 1, 5); }
    };
    if (!closed) {
      if (a.range === 'stock') { pot(burners[0][0], burners[0][1], 0.17, 0.36, 5); pot(burners[2][0], burners[2][1], 0.15, 0.3, 4); if (rush) sautePan(burners[4][0], burners[4][1], false); }
      else if (a.range === 'saute') { sautePan(burners[3][0], burners[3][1], false); sautePan(burners[4][0], burners[4][1], true); sautePan(burners[5][0], burners[5][1], false); if (mood.density > 0.4) pot(burners[1][0], burners[1][1], 0.13, 0.22, 3); }
      else if (a.range === 'boilover') {
        pot(burners[1][0], burners[1][1], 0.17, 0.3, 12);
        const foam: Bit[] = [];
        for (let i = 0; i < 40; i++) { const t = random() * 6.3, d = random(); foam.push({ p: [burners[1][0] + Math.cos(t) * (0.1 + d * 0.12), BY + 0.33 - d * d * 0.3, burners[1][1] + Math.sin(t) * (0.1 + d * 0.12)], s: mix(0.02, 0.045, random()) }); }
        strew(root, new THREE.SphereGeometry(1, 8, 6), flatMat('#fbf6e2', { roughness: 0.4 }), foam);
        sautePan(burners[5][0], burners[5][1], false);
      }
    }

    // The signature unit.
    const B0 = -1.6, B1 = -0.1, BM = (B0 + B1) / 2, bx = XL + LINE / 2;
    if (a.kitchen === 'pizzeria') {
      box([LINE + 0.1, 1.75, B1 - B0], [XL + LINE / 2 + 0.05, 0.875, BM], steelDull);
      for (const y of [0.75, 1.3]) {
        box([0.03, 0.36, B1 - B0 - 0.2], [FX + 0.11, y, BM], dark);
        shell(box([0.02, 0.2, B1 - B0 - 0.45], [FX + 0.128, y - 0.03, BM], new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff5a10', emissiveIntensity: closed ? 0.05 : mix(1.2, 2.4, heat) })));
        art.rod([FX + 0.16, y + 0.2, B0 + 0.25], [FX + 0.16, y + 0.2, B1 - 0.25], 0.012, steel);
      }
      box([0.5, 0.03, 0.5], [FX + 0.25, 1.02, B0 + 0.4], flatMat('#c9a26a'));
      art.rod([FX + 0.3, 1.04, B0 + 0.4], [FX + 0.9, 1.3, B0 + 0.1], 0.014, flatMat('#b8905a'));
      if (!closed) { art.cylinder(0.2, 0.2, 0.015, [FX + 0.25, 1.045, B0 + 0.4], flatMat('#e8c06a'), 20); art.cylinder(0.17, 0.17, 0.006, [FX + 0.25, 1.056, B0 + 0.4], flatMat('#c0321f'), 20); }
    } else {
      unit(B0, B1); feet(B0, B1);
      for (let i = 0; i < 4; i++) knobs.push({ p: [FX + 0.02, 0.78, B0 + 0.25 + i * 0.33], r: [0, 0, Math.PI / 2], s: [0.03, 0.03, 0.03], c: trim });
      if (a.kitchen === 'bistro') {
        box([LINE, 0.05, B1 - B0], [bx, TOP + 0.015, BM], iron);
        const bars: Bit[] = [];
        for (let i = 0; i < 22; i++) bars.push({ p: [bx, TOP + 0.05, B0 + 0.08 + i * 0.062], s: [LINE - 0.1, 0.014, 0.02] });
        strew(root, new THREE.BoxGeometry(1, 1, 1), iron, bars);
        shell(box([LINE - 0.12, 0.01, B1 - B0 - 0.1], [bx, TOP + 0.035, BM], new THREE.MeshStandardMaterial({ color: '#ff6a1a', emissive: '#ff3a00', emissiveIntensity: mix(0, 1.6, heat) })));
        if (!closed) for (let i = 0; i < Math.round(mix(5, 16, heat)); i++) flameRing(bx + j(0.5), TOP + 0.05, BM + j(1.2), 0.03, mix(0.08, 0.3, heat) * mix(0.6, 1.3, random()), random() < 0.5 ? '#ff8a1e' : '#ffc23a', 0.8, 3);
        if (!closed) for (let i = 0; i < 2 + Math.round(heat * 3); i++) art.ball([0.1, 0.022, 0.07], [bx + j(0.4), TOP + 0.075, B0 + 0.25 + i * 0.26], flatMat(['#5a2f1c', '#7a3a22'][i % 2]), 8).rotation.y = j(1);
        steamAt.push({ x: bx, y: TOP + 0.15, z: BM, n: Math.round(heat * 5), spread: 0.4, rise: 0.9 });
      } else if (a.kitchen === 'diner') {
        box([LINE, 0.05, B1 - B0], [bx, TOP + 0.015, BM], steel);
        box([LINE - 0.1, 0.02, B1 - B0 - 0.08], [bx - 0.02, TOP + 0.05, BM], art.material('#4a4c4e', { metalness: 0.8, roughness: 0.22 }));
        for (const z of [B0 + 0.02, B1 - 0.02]) box([LINE - 0.06, 0.1, 0.02], [bx, TOP + 0.08, z], steel);
        if (!closed) {
          const n = Math.round(mix(3, 10, heat));
          for (let i = 0; i < n; i++) art.cylinder(0.06, 0.06, 0.02, [XL + 0.25 + (i % 2) * 0.22 + j(0.03), TOP + 0.07, B0 + 0.2 + Math.floor(i / 2) * 0.2], flatMat(i % 3 ? '#5a3020' : '#7a4028'), 12);
          for (let i = 0; i < 2; i++) { art.cylinder(0.075, 0.075, 0.006, [XL + 0.6, TOP + 0.063, B1 - 0.25 - i * 0.2], flatMat('#fbf8ee'), 12); art.ball([0.028, 0.014, 0.028], [XL + 0.6, TOP + 0.07, B1 - 0.25 - i * 0.2], flatMat('#f2b632'), 8); }
          art.box([0.1, 0.006, 0.14], [FX - 0.12, TOP + 0.07, BM + 0.3], steel); art.rod([FX - 0.12, TOP + 0.07, BM + 0.37], [FX + 0.05, TOP + 0.12, BM + 0.5], 0.01, dark);
          steamAt.push({ x: bx, y: TOP + 0.1, z: BM, n: Math.round(heat * 6), spread: 0.4, rise: 0.8 });
        }
      } else if (a.kitchen === 'wok') {
        box([LINE, 0.05, B1 - B0], [bx, TOP + 0.015, BM], steel);
        box([0.06, 0.4, B1 - B0], [XL + 0.05, TOP + 0.22, BM], steel);
        for (const z of [B0 + 0.4, B1 - 0.4]) {
          art.ring(0.25, 0.035, [bx + 0.02, TOP + 0.05, z], iron).rotation.x = Math.PI / 2;
          art.lathe([[0, 0], [0.12, 0.012], [0.24, 0.07], [0.31, 0.14]], art.material('#2a2927', { metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide }), [bx + 0.02, TOP + 0.02, z]);
          if (!closed) {
            flameRing(bx + 0.02, TOP + 0.06, z, 0.27, mix(0.12, 0.45, heat), '#ff7a1a', 0.9, 12);
            art.ball([0.16, 0.03, 0.16], [bx + 0.02, TOP + 0.07, z], flatMat(['#4f9a3a', '#c9772a'][z > BM ? 0 : 1]), 10);
            steamAt.push({ x: bx, y: TOP + 0.2, z, n: Math.round(heat * 4), spread: 0.2, rise: 1 });
          }
          art.rod([bx + 0.25, TOP + 0.14, z], [bx + 0.6, TOP + 0.2, z + 0.1], 0.012, dark);
          art.tube([[XL + 0.08, TOP + 0.36, z], [XL + 0.2, TOP + 0.42, z], [XL + 0.34, TOP + 0.36, z]], 0.012, steel);
        }
      } else {
        box([LINE, 0.05, B1 - B0], [bx, TOP + 0.015, BM], steel);
        art.lathe([[0, 0], [0.3, 0.02], [0.42, 0.2], [0.44, 0.5], [0.45, 0.52]], potMat, [bx + 0.02, TOP - 0.1, BM]);
        const lid = art.lathe([[0, 0.09], [0.2, 0.07], [0.44, 0], [0.45, 0]], steel, [bx + 0.02, TOP + 0.42, BM]);
        lid.rotation.z = closed ? 0 : -0.5; if (!closed) lid.position.x -= 0.2;
        if (!closed) { art.cylinder(0.42, 0.42, 0.01, [bx + 0.02, TOP + 0.36, BM], flatMat('#c98a3a', { roughness: 0.3 }), 24); steamAt.push({ x: bx, y: TOP + 0.45, z: BM, n: Math.round(mix(5, 10, heat)), spread: 0.3, rise: 1 }); }
        art.rod([FX - 0.02, TOP + 0.2, BM + 0.5], [FX + 0.12, TOP + 0.2, BM + 0.5], 0.03, steelDull);
        art.cylinder(0.11, 0.11, 0.03, [FX + 0.13, TOP + 0.2, BM + 0.5], trimMat, 14).rotation.z = Math.PI / 2;
      }
    }

    // Reach-in fridge at the far end of the line.
    const D0 = -4.05, D1 = -2.7;
    box([LINE - 0.03, 2.0, D1 - D0], [XL + (LINE - 0.03) / 2, 1.06, (D0 + D1) / 2], steel);
    box([LINE - 0.06, 0.12, D1 - D0 - 0.05], [XL + LINE / 2 - 0.03, 0.06, (D0 + D1) / 2], dark);
    box([0.012, 1.75, 0.012], [FX - 0.02, 1.05, (D0 + D1) / 2], dark);
    for (const side of [-1, 1]) art.rod([FX, 0.9, (D0 + D1) / 2 + side * 0.08], [FX, 1.4, (D0 + D1) / 2 + side * 0.08], 0.014, steelDull);
    const rota = paint(96, 128, (ctx) => { ctx.fillStyle = '#f7f5ec'; ctx.fillRect(0, 0, 96, 128); ctx.fillStyle = '#2a2f3a'; ctx.fillRect(6, 6, 84, 12); for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) { ctx.fillStyle = ['#f2c14e', '#7fb7e0', '#e58a7a', '#9fd19a', '#f7f5ec'][Math.floor(random() * 5)]; ctx.fillRect(8 + c * 14, 24 + r * 12, 12, 10); } });
    shell(art.mesh(new THREE.PlaneGeometry(0.26, 0.35).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ map: rota, roughness: 0.9 }), [FX - 0.012, 1.5, D1 - 0.3])).rotation.x = j(0.1);

    // Shelf over the line: plates, tins, hanging tools.
    const shelfBits: Bit[] = [];
    const stacks = Math.round(mix(2, 7, mood.density));
    for (let i = 0; i < stacks; i++) { const z = mix(H0 + 0.3, H1 - 0.4, (i + random() * 0.6) / stacks); const n = 3 + Math.floor(random() * 9); for (let k = 0; k < n; k++) shelfBits.push({ p: [XL + 0.17, 1.535 + k * 0.012, z] }); }
    strew(root, plateGeo, china, shelfBits);
    const hung: THREE.Object3D[] = [];
    art.rod([XL + 0.06, 1.38, H0 + 0.2], [XL + 0.06, 1.38, H1 - 0.2], 0.008, steel);
    const tools = Math.round(mix(3, 9, mood.density));
    for (let i = 0; i < tools; i++) {
      const g = new THREE.Group();
      const z = mix(A0 - 1.2, A1 + 0.9, (i + 0.5) / tools) + j(0.1);
      g.position.set(XL + 0.07, 1.37, z);
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = true; g.add(mesh); };
      if (a.kitchen === 'bistro' && i % 2 === 0) {
        const r = mix(0.09, 0.14, random());
        const pan = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, 0.04, 16).rotateZ(Math.PI / 2), copper); pan.position.y = -0.2 - r; add(pan);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.2, 0.02), steelDull); handle.position.y = -0.1; add(handle);
      } else {
        const len = mix(0.22, 0.34, random());
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, len, 6), steel); handle.position.y = -len / 2; add(handle);
        const head = new THREE.Mesh(i % 3 ? new THREE.SphereGeometry(0.04, 10, 8, 0, 6.3, 0, 1.6) : new THREE.BoxGeometry(0.008, 0.09, 0.07), steel); head.position.y = -len - 0.02; head.rotation.z = Math.PI / 2; add(head);
      }
      root.add(g);
      hung.push(g);
    }
    // Squeeze bottles and a towel on the range rail.
    for (let i = 0; i < Math.round(mix(1, 5, mood.density)); i++) { const z = A1 + 0.1 + j(0.05) - i * 0.085; art.cylinder(0.024, 0.027, 0.15, [XL + 0.2, 1.61, z - 2.0], flatMat(['#f3ead6', '#c0321f', '#e8c531', '#4f8a3a', '#f3ead6'][i]), 8); art.cylinder(0.004, 0.018, 0.045, [XL + 0.2, 1.705, z - 2.0], flatMat('#f3ead6'), 6); }
    strew(root, new THREE.BoxGeometry(1, 1, 1), dark, legs);
    strew(root, new THREE.CylinderGeometry(1, 1, 1, 12), flatMat('#ffffff', { roughness: 0.5 }), knobs);

    // ---- The right-hand wall: shelving, swing door, hand sink.
    const wire = art.material('#aab0b0', { metalness: 0.7, roughness: 0.4 });
    const SZ0 = -4.35, SZ1 = -2.3;
    for (const z of [SZ0, SZ1]) for (const x of [XR - 0.05, XR - 0.5]) box([0.03, 1.95, 0.03], [x, 0.975, z], wire);
    const tubTints = ['#f1f1ec', '#d9a53a', '#b9935e', '#7fa8c9', '#c0321f', '#3f8a4a'];
    for (const y of [0.25, 0.8, 1.35, 1.9]) {
      box([0.5, 0.025, SZ1 - SZ0], [XR - 0.275, y, (SZ0 + SZ1) / 2], wire);
      const n = Math.round(mix(1, 4, mood.density));
      for (let i = 0; i < n; i++) { if (y > 1.8 && random() < 0.5) continue; const w = mix(0.3, 0.45, random()), h = mix(0.18, 0.4, random()); box([0.4, h, w], [XR - 0.28, y + 0.013 + h / 2, SZ0 + 0.3 + i * 0.5 + j(0.05)], flatMat(tubTints[Math.floor(random() * tubTints.length)], { roughness: 0.6 })).rotation.y = j(0.1); }
    }
    const DR0 = -1.75, DR1 = -0.75;
    const doorMat = art.material('#b9bebe', { metalness: 0.6, roughness: 0.45 });
    shell(box([0.05, 2.05, DR1 - DR0], [XR - 0.02, 1.025, (DR0 + DR1) / 2], doorMat));
    shell(box([0.06, 2.12, 0.07], [XR - 0.02, 1.06, DR0 - 0.03], trimMat)); shell(box([0.06, 2.12, 0.07], [XR - 0.02, 1.06, DR1 + 0.03], trimMat)); shell(box([0.06, 0.07, DR1 - DR0 + 0.13], [XR - 0.02, 2.09, (DR0 + DR1) / 2], trimMat));
    const port = art.cylinder(0.17, 0.17, 0.02, [XR - 0.05, 1.5, (DR0 + DR1) / 2], new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd9a0', emissiveIntensity: a.dining === 'chairsup' || a.dining === 'shuttered' ? 0.15 : 1.2 }), 20);
    port.rotation.z = Math.PI / 2; shell(port);
    shell(art.ring(0.17, 0.02, [XR - 0.055, 1.5, (DR0 + DR1) / 2], steelDull)).rotation.y = Math.PI / 2;
    shell(box([0.012, 0.3, DR1 - DR0 - 0.06], [XR - 0.05, 0.2, (DR0 + DR1) / 2], steelDull));
    shell(box([0.012, 0.16, 0.3], [XR - 0.05, 1.05, DR0 + 0.2], steel));
    // Hand sink with soap and towels.
    box([0.36, 0.14, 0.42], [XR - 0.19, 0.86, 3.7], china);
    box([0.28, 0.02, 0.32], [XR - 0.19, 0.925, 3.7], flatMat('#c9cccc', { roughness: 0.3 }));
    art.tube([[XR - 0.04, 0.95, 3.7], [XR - 0.1, 1.1, 3.7], [XR - 0.2, 1.06, 3.7]], 0.012, steel);
    box([0.1, 0.3, 0.26], [XR - 0.06, 1.55, 3.7], flatMat('#e9e9e4'));
    box([0.02, 0.1, 0.2], [XR - 0.12, 1.38, 3.7], flatMat('#fbfbf6'));
    box([0.07, 0.14, 0.08], [XR - 0.05, 1.3, 3.42], flatMat(trim));
    shell(art.label('HANDS', 0.3, 0.09, [XR - 0.012, 1.84, 3.7], '#ffffff', trim)).rotation.y = -Math.PI / 2;

    // ---- Floor: drain and the state it is in.
    const drainX = 0.3, drainZ = 4.0;
    shell(box([0.3, 0.01, 0.3], [drainX, 0.004, drainZ], steelDull));
    const slots: Bit[] = [];
    for (let i = 0; i < 6; i++) slots.push({ p: [drainX, 0.01, drainZ - 0.1 + i * 0.04], s: [0.22, 0.004, 0.016] });
    strew(root, new THREE.BoxGeometry(1, 1, 1), dark, slots, false);
    if (a.floor === 'wet') {
      const water = new THREE.MeshStandardMaterial({ color: '#8fa6b0', transparent: true, opacity: 0.24, roughness: 0.03, metalness: 0.5, depthWrite: false });
      for (let i = 0; i < 9; i++) { const r = mix(0.3, 0.9, random()); const pool = art.cylinder(r, r, 0.003, [drainX + j(2.2), 0.004, drainZ + j(5) - 0.8], water, 20); pool.scale.z = mix(0.5, 1.2, random()); pool.castShadow = false; }
      art.rod([XR - 0.15, 0, 0.4], [XR - 0.05, 1.45, 0.3], 0.014, flatMat('#b8905a'));
      box([0.04, 0.06, 0.5], [XR - 0.16, 0.03, 0.4], dark);
    } else if (a.floor === 'debris') {
      const scraps: Bit[] = [];
      for (let i = 0; i < Math.round(mix(30, 90, mood.density)); i++) scraps.push({ p: [mix(FX - 0.1, 1.6, random() * random()), 0.006, mix(-3.8, 4.5, random())], r: [0, random() * 3, 0], s: [0.015 + random() * 0.03, 0.006, 0.01 + random() * 0.02], c: ['#e8b84a', '#4f9a3a', '#f1ecd4', '#c0321f', '#8a5a2a'][Math.floor(random() * 5)] });
      strew(root, new THREE.BoxGeometry(1, 1, 1), flatMat('#ffffff'), scraps, false);
      for (let i = 0; i < 7; i++) { const fallen = new THREE.Mesh(chitGeo, chitMats[Math.floor(random() * chitMats.length)]); fallen.scale.set(0.085, 0.2, 1); fallen.position.set(j(2.4), 0.005 + i * 0.0005, mix(-3.9, 3.5, random())); fallen.rotation.set(-Math.PI / 2, 0, random() * 6); root.add(fallen); }
      const towel = box([0.3, 0.03, 0.2], [FX + 0.3 + j(0.3), 0.015, 0.9 + j(1)], flatMat('#e9ebe6', { roughness: 1 })); towel.rotation.y = random() * 3;
    } else if (a.floor === 'mats') {
      for (const z of [-1.9, 0.1, 3.9]) { const mat = box([0.9, 0.02, 1.9], [FX + 0.55, 0.01, z + j(0.05)], dark); mat.rotation.y = j(0.03); mat.castShadow = false; }
    }

    // ---- Pedestals that appear under small cast members.
    const pedestals = SLOTS.map((slot) => {
      const g = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); };
      const w = slot.r * 1.7;
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, w * 0.8), steel); top.position.y = slot.lift - 0.02; add(top);
      if (slot.lift > 0.6) {
        const under = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.02, w * 0.8 - 0.08), steelDull); under.position.y = 0.25; add(under);
        for (const x of [-1, 1]) for (const z of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, slot.lift - 0.04, 8), steel); leg.position.set(x * (w / 2 - 0.04), (slot.lift - 0.04) / 2, z * (w * 0.4 - 0.04)); add(leg); }
      } else {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, slot.lift - 0.04, w * 0.68), trimMat); crate.position.y = (slot.lift - 0.04) / 2; add(crate);
      }
      g.position.set(slot.x, 0, slot.z); g.rotation.y = slot.turn * 0.5; g.visible = false;
      root.add(g);
      return g;
    });

    // ---- Flames and steam.
    const flameGeo = new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0);
    const flameMesh = strew(root, flameGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 }), flames, false);
    if (flameMesh) flameMesh.receiveShadow = false;
    const steamMat = new THREE.MeshStandardMaterial({ color: '#f7f6f1', transparent: true, opacity: mix(0.2, 0.34, heat), depthWrite: false, roughness: 1 });
    const puffGeo = new THREE.SphereGeometry(1, 10, 8);
    const puffs: { mesh: THREE.Mesh; x: number; y: number; z: number; rise: number; phase: number; speed: number }[] = [];
    for (const source of steamAt) for (let i = 0; i < source.n; i++) {
      const mesh = new THREE.Mesh(puffGeo, steamMat);
      root.add(mesh);
      puffs.push({ mesh, x: source.x + j(source.spread), y: source.y, z: source.z + j(source.spread), rise: source.rise, phase: random(), speed: mix(0.1, 0.24, random()) });
    }
    const setSteam = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.phase + time * puff.speed * mix(0.5, 1.6, mood.energy)) % 1;
        const size = mix(0.07, 0.3, t);
        puff.mesh.scale.set(size, size * 1.1, size);
        puff.mesh.position.set(puff.x + Math.sin(t * 5 + puff.phase * 9) * 0.07 - t * 0.15, puff.y + t * puff.rise, puff.z + Math.cos(t * 4 + puff.phase * 5) * 0.06);
      }
    };
    setSteam(0);

    // ---- Light, camera, placement.
    const moodLight = closed ? 0.78 : a.moment === 'prep' ? 1.08 : 1;
    root.add(new THREE.HemisphereLight(new THREE.Color().setHSL(mix(0.6, 0.1, mood.warmth), 0.35, 0.95), '#8a7f72', 1.5 * moodLight));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.6, 0.08, mood.warmth), 0.4, 0.88), 2.3 * moodLight);
    key.position.set(mix(1.5, 4.5, mood.daylight), 8, 8.5);
    key.target.position.set(0, 0.8, -1);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.03; key.shadow.bias = -0.0003;
    const shadow = key.shadow.camera;
    shadow.left = -6; shadow.right = 6; shadow.bottom = -7; shadow.top = 7; shadow.near = 0.5; shadow.far = 30;
    shadow.updateProjectionMatrix();
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#ffe6c4', 0.7 * moodLight);
    fill.position.set(-2, 3, -9);
    root.add(fill);
    const view = VIEWS[a.view];
    const camera = new THREE.PerspectiveCamera(view.fov, 1, 0.1, 60);
    const spins = SLOTS.map(() => j(0.3));
    const background = new THREE.Color('#e9e7df').multiplyScalar(closed ? 0.9 : 1);

    const place = (items: readonly Placeable[]) => {
      pedestals.forEach((pedestal) => { pedestal.visible = false; });
      items.forEach((item, index) => {
        const slot = SLOTS[index % SLOTS.length];
        const fit = (h: number) => Math.min(h / Math.max(item.height, 0.05), slot.r / Math.max(item.radius, 0.05), 3);
        let scale = fit(slot.h), lift = 0;
        if (item.height * scale < 0.72) { lift = slot.lift; scale = Math.min(fit(slot.h - lift), (slot.r * 0.8) / Math.max(item.radius, 0.05)); pedestals[index % SLOTS.length].visible = true; }
        item.holder.scale.setScalar(scale);
        item.holder.position.set(slot.x, lift, slot.z);
        item.holder.rotation.y = slot.turn + spins[index % SLOTS.length];
        item.holder.updateMatrixWorld(true);
      });
      camera.position.set(view.at[0], view.at[1], view.at[2]);
      camera.lookAt(view.to[0], view.to[1], view.to[2]);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    };
    place([]);

    const matrix = new THREE.Matrix4(), quat = new THREE.Quaternion(), scale = new THREE.Vector3(), pos = new THREE.Vector3();
    const sway = mix(0.01, 0.08, mood.energy);
    return {
      object: root, camera, background, capacity: SLOTS.length, ground: floor, keyLight: key, place,
      update(_dt: number, time: number) {
        setSteam(time);
        if (flameMesh) {
          flames.forEach((flame, i) => {
            const size = flame.s as V3;
            const flick = 1 + (Math.sin(time * mix(9, 22, mood.energy) + i * 2.7) * 0.5 + Math.sin(time * 31 + i) * 0.2) * flame.wild * 0.6;
            scale.set(size[0], flame.base * flick, size[2]);
            matrix.compose(pos.set(...flame.p), quat, scale);
            flameMesh.setMatrixAt(i, matrix);
          });
          flameMesh.instanceMatrix.needsUpdate = true;
        }
        for (const chit of chits) chit.mesh.rotation.x = chit.lean + Math.sin(time * 2.1 + chit.phase) * sway;
        hung.forEach((tool, i) => { tool.rotation.x = Math.sin(time * 1.4 + i * 1.9) * sway * 0.6; });
        if (closed) tubeMats[1].emissiveIntensity = 1.5 + (Math.sin(time * 37) > 0.93 ? -1 : 0) * mood.wear;
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
