import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const PAINT = {
  cream: { body: '#efe4c4', trim: '#5f9a6a', knob: '#5f9a6a' },
  sky: { body: '#b9d3e4', trim: '#f4f0e4', knob: '#f4f0e4' },
  butter: { body: '#f0d684', trim: '#f7f2e2', knob: '#b8322c' },
  white: { body: '#f3f0e6', trim: '#c8382f', knob: '#c8382f' },
  mint: { body: '#bcdcc8', trim: '#f4f0e4', knob: '#3f6f5a' },
} as const;
const FLOOR = {
  black: ['#efe6cf', '#2c2c2e'], green: ['#efe6cf', '#5f8f6a'], red: ['#f1e8d4', '#b4403a'], brown: ['#d9c49a', '#a3794a'],
} as const;

export default defineWorld({
  questions: {
    state: choice('What is happening in the kitchen this morning?', {
      cooking: 'She is cooking: a pot steaming, dough on a floured board, jars and spoons out, the radio on.',
      spotless: 'Everything is scrubbed and put away, a single cup draining, a towel folded over the rail.',
      expecting: 'Company is coming: best plates stacked ready, glasses lined up, a cloth over a rising bowl.',
      emptied: 'She is gone and the kitchen is being cleared: cupboard doors open and bare, cardboard boxes on the floor, pale patches on the wall where things hung.',
    }),
    cupboards: choice('What colour are the painted cupboards?', {
      cream: 'Cream with green trim and green knobs, repainted every few years.',
      sky: 'Pale sky blue with white trim.',
      butter: 'Butter yellow with white trim and red knobs.',
      white: 'White gloss with red trim, almost clinical in its cleanliness.',
      mint: 'Mint green with white trim.',
    }),
    floor: choice('What is the linoleum like?', {
      black: 'Black and cream checks.',
      green: 'Green and cream checks.',
      red: 'Red and cream checks.',
      brown: 'Tan and brown checks, the colour of old toffee.',
    }),
    walls: choice('How are the walls finished?', {
      tile: 'White tiles to shoulder height with a coloured border, pale paint above.',
      gloss: 'Two-tone gloss paint, darker below a painted line.',
      paper: 'Small-flowered wallpaper, slightly yellowed.',
      stencil: 'Whitewash with a stencilled border of flowers under the ceiling.',
    }),
    corner: choice('What stands in the back corner?', {
      range: 'A black cast-iron wood range with a stovepipe, the old heart of the house.',
      cooker: 'A white enamel gas cooker on four legs.',
      fridge: 'A round-shouldered old refrigerator with a chrome handle.',
      dresser: 'A painted dresser with plates standing on its shelves and cups on hooks.',
    }),
    faith: choice('What hangs by the door?', {
      crucifix: 'A dark wooden crucifix with a dried palm sprig tucked behind it.',
      icon: 'A gilded icon draped with an embroidered towel, a small red lamp burning under it.',
      sampler: 'A framed cross-stitch blessing in red thread.',
      horseshoe: 'An iron horseshoe and a braid of garlic.',
      gone: 'Only a nail and a pale cross-shaped patch where something hung for decades.',
    }),
    sill: choice('What is on the windowsill, in front of the lace curtains?', {
      geraniums: 'Red geraniums in clay pots.',
      herbs: 'Herbs growing in old tin cans.',
      violets: 'African violets on saucers and a small statue.',
      bare: 'Nothing: the sill is wiped bare.',
    }),
    rug: choice('What lies on the floor in the middle of the room?', {
      rag: 'An oval rag rug braided from old clothes.',
      runner: 'A striped runner from the door to the sink.',
      none: 'Nothing: bare polished linoleum.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const W = 12, D = 10, H = 4.7, CT = 1.62; // room and counter height, in stage units
    const [light, dark] = FLOOR[a.floor];
    const { art: s, world } = diorama(context, {
      background: '#efe7d6', floor: light, width: W, depth: D, maxHeight: 2.9, radius: 1.5, pitch: 30, yaw: 31,
      slots: [[0.5, 1.0], [-2.5, -4.4, CT + 0.05, 0.4], [3.95, -4.4, CT + 0.05, 0.4], [4.1, 2.6, 0, 0.72], [-3.9, -0.9, 0, 0.6]],
    });
    const emptied = a.state === 'emptied', cooking = a.state === 'cooking';
    const clutter = emptied ? 0 : mood.density;
    const palette = PAINT[a.cupboards];
    const paint = (width: number, height: number, draw: (ctx: Ctx) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    };
    const flat = (map: THREE.Texture, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...options });
    const group = (parent: THREE.Object3D = s.root) => { const g = new THREE.Group(); parent.add(g); return g; };
    const into = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    /** A flat picture hung on the left wall, facing into the room. */
    const hang = (map: THREE.Texture, width: number, height: number, y: number, z: number, tilt = 0) => {
      const mesh = into(s.root, new THREE.PlaneGeometry(width, height), flat(map), -W / 2 + 0.02, y, z);
      mesh.rotation.set(0, Math.PI / 2, 0); mesh.rotateZ(tilt); mesh.castShadow = false;
      return mesh;
    };

    const body = s.material(palette.body, { roughness: 0.5 });
    const trim = s.material(palette.trim, { roughness: 0.5 });
    const knob = s.material(palette.knob, { roughness: 0.35 });
    const enamel = s.material('#f6f4ec', { roughness: 0.25 });
    const iron = s.material('#26272a', { roughness: 0.7, metalness: 0.3 });
    const chrome = new THREE.MeshStandardMaterial({ color: '#d5dadd', metalness: 0.9, roughness: 0.22 });
    const brass = new THREE.MeshStandardMaterial({ color: '#c9a64e', metalness: 0.85, roughness: 0.3 });
    const wood = s.material('#b98a55', { roughness: 0.7 });
    const darkWood = s.material('#5a3b22', { roughness: 0.6 });
    const cardboard = s.material('#b9935f', { roughness: 0.9 });
    const china = s.material('#f4f0e6', { roughness: 0.3 });

    // ---- floor --------------------------------------------------------------------------
    const lino = paint(256, 256, (ctx) => {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? dark : light; ctx.fillRect(i * 128, j * 128, 128, 128); }
      for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '60,40,20'},${0.04 + random() * 0.08})`; ctx.fillRect(random() * 256, random() * 256, 2 + random() * 3, 2 + random() * 3); }
      ctx.fillStyle = `rgba(120,90,40,${mood.wear * 0.25})`; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(40,30,20,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, 128, 128); ctx.strokeRect(128, 128, 128, 128);
    });
    lino.wrapS = lino.wrapT = THREE.RepeatWrapping; lino.repeat.set(W / 1.5, D / 1.5);
    const floor = into(s.root, new THREE.PlaneGeometry(W, D), flat(lino, { roughness: 0.4 + mood.wear * 0.4 }), 0, 0.012, 0);
    floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
    if (mood.wear > 0.3) {
      // the path worn between door, table and sink
      const worn = paint(256, 256, (ctx) => {
        const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
        g.addColorStop(0, `rgba(205,190,160,${mood.wear * 0.75})`); g.addColorStop(1, 'rgba(205,190,160,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
      });
      const path = into(s.root, new THREE.PlaneGeometry(4.4, 7.5), new THREE.MeshStandardMaterial({ map: worn, transparent: true, depthWrite: false, roughness: 0.9 }), -0.6, 0.02, -0.2);
      path.rotation.set(-Math.PI / 2, 0, 0.5); path.castShadow = false;
    }

    // ---- walls --------------------------------------------------------------------------
    const upper = a.walls === 'tile' ? '#e6ead9' : a.walls === 'gloss' ? '#f1e8cf' : a.walls === 'paper' ? '#f2e8cf' : '#f5f1e6';
    const wallArt = paint(1024, 400, (ctx) => {
      const px = 1024 / W, Y = (units: number) => 400 - units * (400 / H);
      ctx.fillStyle = upper; ctx.fillRect(0, 0, 1024, 400);
      if (a.walls === 'tile') {
        const top = Y(2.75);
        ctx.fillStyle = '#f7f6ef'; ctx.fillRect(0, top, 1024, 400 - top);
        ctx.strokeStyle = '#bfc4b8'; ctx.lineWidth = 2;
        for (let y = top; y < 400; y += 0.42 * (400 / H)) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke(); }
        for (let x = 0; x < 1024; x += 0.42 * px) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, 400); ctx.stroke(); }
        ctx.fillStyle = palette.trim === '#f4f0e4' || palette.trim === '#f7f2e2' ? '#3f6f8a' : palette.trim; ctx.fillRect(0, top - 9, 1024, 9);
      } else if (a.walls === 'gloss') {
        const top = Y(2.4);
        ctx.fillStyle = mood.cheer > 0.5 ? '#b9d4b4' : '#a9b8ac'; ctx.fillRect(0, top, 1024, 400 - top);
        ctx.fillStyle = '#6f4a2c'; ctx.fillRect(0, top - 5, 1024, 5);
      } else if (a.walls === 'paper') {
        for (let row = 0; row < 16; row++) for (let col = 0; col < 42; col++) {
          const x = col * 25 + (row % 2) * 12, y = row * 25 + 12;
          ctx.fillStyle = '#7fa06a'; ctx.beginPath(); ctx.ellipse(x - 5, y + 3, 5, 2.4, 0.6, 0, 7); ctx.ellipse(x + 5, y + 3, 5, 2.4, -0.6, 0, 7); ctx.fill();
          ctx.fillStyle = (row + col) % 3 ? '#d98a8a' : '#8fa8d0'; ctx.beginPath(); ctx.arc(x, y, 4.6, 0, 7); ctx.fill();
          ctx.fillStyle = '#e8c04a'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill();
        }
      } else {
        for (let x = 12; x < 1024; x += 44) {
          const y = 30;
          ctx.strokeStyle = '#4f8a5a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 22, y + 12); ctx.quadraticCurveTo(x, y + 22, x + 22, y + 12); ctx.stroke();
          ctx.fillStyle = mood.cheer > 0.5 ? '#c8382f' : '#3f5f9a'; for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.257) * 7, y + Math.sin(p * 1.257) * 7, 5, 0, 7); ctx.fill(); }
          ctx.fillStyle = '#e8c04a'; ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 7); ctx.fill();
        }
        ctx.fillStyle = mood.cheer > 0.5 ? '#c8382f' : '#3f5f9a'; ctx.fillRect(0, 8, 1024, 3); ctx.fillRect(0, 58, 1024, 3);
      }
      // fifty years of steam: yellowing toward the ceiling, grime near the floor
      const age = ctx.createLinearGradient(0, 0, 0, 400);
      age.addColorStop(0, `rgba(150,110,40,${mood.wear * 0.38})`); age.addColorStop(0.5, `rgba(150,110,40,${mood.wear * 0.08})`); age.addColorStop(1, `rgba(70,55,40,${mood.wear * 0.3})`);
      ctx.fillStyle = age; ctx.fillRect(0, 0, 1024, 400);
      if (mood.wear > 0.55) { ctx.strokeStyle = 'rgba(60,50,40,0.5)'; ctx.lineWidth = 1.5; for (let c = 0; c < 4; c++) { let x = random() * 1024, y = 0; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (random() - 0.5) * 30; y += 10 + random() * 16; ctx.lineTo(x, y); } ctx.stroke(); } }
    });
    const plaster = s.material('#d9d0bc', { roughness: 0.9 });
    const wallFace = flat(wallArt, { roughness: 0.8 });
    into(s.root, new THREE.BoxGeometry(W + 0.25, H, 0.25), [plaster, plaster, plaster, plaster, wallFace, plaster], -0.125, H / 2, -D / 2 - 0.125);
    into(s.root, new THREE.BoxGeometry(0.25, H, D), [wallFace, plaster, plaster, plaster, plaster, plaster], -W / 2 - 0.125, H / 2, 0);
    const skirting = s.material(a.walls === 'tile' ? '#e9e6da' : '#6f4a2c', { roughness: 0.6 });
    const board = into(s.root, new THREE.BoxGeometry(0.06, 0.3, D), skirting, -W / 2 + 0.03, 0.15, 0);
    board.castShadow = false;

    // ---- window over the sink -----------------------------------------------------------
    const wx = 0.5, wy = 3.15, ww = 2.5, wh = 1.95, back = -D / 2;
    const sky = new THREE.Color('#fff4d2').lerp(new THREE.Color('#dfeaf2'), 1 - mood.warmth);
    into(s.root, new THREE.PlaneGeometry(ww, wh), new THREE.MeshStandardMaterial({ color: sky, emissive: sky, emissiveIntensity: mix(0.45, 0.85, mood.cheer), roughness: 0.4 }), wx, wy, back + 0.012).castShadow = false;
    const frame = s.material('#f6f2e6', { roughness: 0.45 });
    for (const x of [-1, 0, 1]) s.box([x === 0 ? 0.07 : 0.14, wh + 0.14, 0.1], [wx + x * (ww / 2), wy, back + 0.05], frame);
    for (const y of [-1, 0.12, 1]) s.box([ww + 0.14, y === 0.12 ? 0.07 : 0.14, 0.1], [wx, wy + y * (wh / 2), back + 0.05], frame);
    s.box([ww + 0.5, 0.09, 0.42], [wx, wy - wh / 2 - 0.1, back + 0.21], frame);
    const sillY = wy - wh / 2 - 0.055;
    if (!emptied) {
      const lace = paint(256, 256, (ctx) => {
        ctx.fillStyle = '#fdfaf0'; ctx.fillRect(0, 0, 256, 256);
        ctx.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 11; i++) for (let j = 0; j < 8; j++) {
          const x = i * 24 + (j % 2) * 12 + 6, y = j * 26 + 16;
          if ((i + j) % 4 === 0) for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.257) * 6, y + Math.sin(p * 1.257) * 6, 3.2, 0, 7); ctx.fill(); }
          else { ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 7); ctx.fill(); }
        }
        for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(i * 36 + 18, 262, 16, 0, 7); ctx.fill(); }
      });
      const laceMaterial = new THREE.MeshStandardMaterial({ map: lace, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95 });
      const panel = (x: number, width: number, height: number, y: number) => {
        const geometry = new THREE.PlaneGeometry(width, height, 18, 1);
        const p = geometry.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 16 + x) * 0.04);
        geometry.computeVertexNormals();
        into(s.root, geometry, laceMaterial, x, y, back + 0.2).castShadow = false;
      };
      panel(wx - ww * 0.34, ww * 0.42, wh * 0.98, wy + 0.02); panel(wx + ww * 0.34, ww * 0.42, wh * 0.98, wy + 0.02);
      panel(wx, ww + 0.2, 0.42, wy + wh / 2 - 0.14);
      s.rod([wx - ww / 2 - 0.15, wy + wh / 2 + 0.08, back + 0.2], [wx + ww / 2 + 0.15, wy + wh / 2 + 0.08, back + 0.2], 0.022, brass);
      // the sill
      if (a.sill !== 'bare') for (let i = 0; i < 3; i++) {
        const x = wx - 0.75 + i * 0.75 + (random() - 0.5) * 0.1, z = back + 0.27;
        if (a.sill === 'geraniums') {
          s.lathe([[0, 0], [0.1, 0], [0.14, 0.2], [0.155, 0.2], [0.155, 0.24], [0, 0.24]], s.material('#b8603c', { roughness: 0.85 }), [x, sillY, z]);
          s.ball([0.2, 0.15, 0.17], [x, sillY + 0.38, z], s.material('#4f8a4a', { roughness: 0.8 }), 10);
          for (let b = 0; b < 3; b++) s.ball([0.08, 0.07, 0.08], [x + (random() - 0.5) * 0.24, sillY + 0.5 + random() * 0.1, z + (random() - 0.5) * 0.1], s.material('#d8322c', { roughness: 0.6, emissive: '#7a1410', emissiveIntensity: 0.25 }), 8);
        } else if (a.sill === 'herbs') {
          s.cylinder(0.12, 0.12, 0.26, [x, sillY + 0.13, z], i === 1 ? s.material('#c8382f', { metalness: 0.4, roughness: 0.4 }) : chrome, 16);
          for (let b = 0; b < 5; b++) s.rod([x + (random() - 0.5) * 0.1, sillY + 0.24, z], [x + (random() - 0.5) * 0.34, sillY + 0.5 + random() * 0.2, z + (random() - 0.5) * 0.14], 0.018, s.material('#5fa052', { roughness: 0.8 }), 0.03);
        } else {
          if (i === 1) { s.lathe([[0, 0], [0.08, 0], [0.06, 0.05], [0.05, 0.3], [0.08, 0.36], [0.06, 0.46], [0, 0.5]], s.material('#dfe6ee', { roughness: 0.3 }), [x, sillY, z]); continue; }
          s.cylinder(0.16, 0.12, 0.03, [x, sillY + 0.015, z], china, 16); s.cylinder(0.12, 0.09, 0.15, [x, sillY + 0.1, z], china, 16);
          s.ball([0.19, 0.07, 0.19], [x, sillY + 0.2, z], s.material('#4a7a4a', { roughness: 0.8 }), 10);
          for (let b = 0; b < 4; b++) s.ball([0.045, 0.035, 0.045], [x + Math.cos(b * 1.6) * 0.07, sillY + 0.26, z + Math.sin(b * 1.6) * 0.06], s.material('#7a4ec0', { roughness: 0.6 }), 8);
        }
      }
    }
    // morning falling through the panes onto the linoleum
    const sunbeam = new THREE.MeshBasicMaterial({ color: '#fff0b8', transparent: true, opacity: mix(0.22, 0.5, mood.cheer) * mix(0.6, 1, mood.warmth), depthWrite: false });
    const skew = mix(1.6, -1.6, mood.daylight);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const shape = new THREE.Shape();
      const x0 = wx - ww / 2 + i * (ww / 2) + 0.07, x1 = x0 + ww / 2 - 0.14, z0 = -3.75 + j * 1.5, z1 = z0 + 1.36;
      const sx = (z: number) => (z + 3.75) * skew * 0.33;
      shape.moveTo(x0 + sx(z0), -z0); shape.lineTo(x1 + sx(z0), -z0); shape.lineTo(x1 + sx(z1), -z1); shape.lineTo(x0 + sx(z1), -z1);
      const patch = into(s.root, new THREE.ShapeGeometry(shape), sunbeam, 0, 0.03, 0);
      patch.rotation.x = -Math.PI / 2; patch.castShadow = patch.receiveShadow = false;
    }

    // ---- counter run with the enamel sink -----------------------------------------------
    const cz = -D / 2 + 0.56, depth = 1.1, frontZ = -D / 2 + depth;
    const sinkL = -0.95, sinkR = 1.95;
    const worktop = s.material(mood.cheer > 0.5 ? '#c79a5e' : '#9a8f7c', { roughness: 0.6 });
    const openDoors: number[] = [];
    const unit = (x0: number, x1: number, y0: number, y1: number, z: number, deep: number, index: number) => {
      const w = x1 - x0, h = y1 - y0, x = (x0 + x1) / 2, y = (y0 + y1) / 2;
      s.box([w, h, deep], [x, y, z], body);
      const face = z + deep / 2;
      const open = emptied && random() < 0.6;
      const missing = emptied && !open && random() < 0.2;
      if (open || missing) s.box([w - 0.16, h - 0.16, 0.02], [x, y, face + 0.006], s.material('#4a3f33', { roughness: 0.95 }));
      if (missing) return;
      const hingeLeft = index % 2 === 0;
      const door = group();
      door.position.set(hingeLeft ? x0 + 0.05 : x1 - 0.05, y, face + 0.02);
      const dir = hingeLeft ? 1 : -1;
      into(door, new THREE.BoxGeometry(w - 0.1, h - 0.1, 0.05), body, dir * (w - 0.1) / 2, 0, 0.012);
      into(door, new THREE.BoxGeometry(w - 0.34, h - 0.34, 0.02), trim, dir * (w - 0.1) / 2, 0, 0.042);
      into(door, new THREE.BoxGeometry(w - 0.42, h - 0.42, 0.022), body, dir * (w - 0.1) / 2, 0, 0.046);
      into(door, new THREE.SphereGeometry(0.055, 10, 8), knob, dir * (w - 0.24), y1 > 2.5 ? -h / 2 + 0.2 : h / 2 - 0.2, 0.09);
      if (open) { door.rotation.y = -dir * mix(1.1, 1.9, random()); openDoors.push(x); }
    };
    s.box([sinkL + 4.1, 0.09, depth + 0.06], [(sinkL - 4.1) / 2, CT, cz + 0.03], worktop);
    s.box([5.95 - sinkR, 0.09, depth + 0.06], [(sinkR + 5.95) / 2, CT, cz + 0.03], worktop);
    s.box([10, 0.16, depth - 0.12], [0.93, 0.08, cz - 0.06], s.material('#3a3229', { roughness: 0.8 }));
    [[-4.1, -2.52], [-2.52, sinkL]].forEach(([x0, x1], i) => unit(x0, x1, 0.16, CT - 0.045, cz, depth, i));
    [[sinkR, 3.28], [3.28, 4.62], [4.62, 5.95]].forEach(([x0, x1], i) => {
      if (i === 1) {
        // a stack of drawers
        s.box([x1 - x0, CT - 0.205, depth], [(x0 + x1) / 2, (CT + 0.115) / 2, cz], body);
        for (let d = 0; d < 3; d++) {
          const pulled = emptied && random() < 0.5 ? 0.3 : 0;
          s.box([x1 - x0 - 0.12, 0.38, 0.05 + pulled], [(x0 + x1) / 2, 0.42 + d * 0.44, frontZ + 0.03 + pulled / 2], d % 2 ? body : trim);
          s.box([0.3, 0.05, 0.06], [(x0 + x1) / 2, 0.42 + d * 0.44, frontZ + 0.09 + pulled], chrome);
        }
      } else unit(x0, x1, 0.16, CT - 0.045, cz, depth, i + 1);
    });
    // the sink: a thick enamel slab with a basin and a ribbed drainer, on a skirted frame
    const sw = sinkR - sinkL, sx = (sinkL + sinkR) / 2, top = CT + 0.1;
    const chipped = s.material('#f6f4ec', { roughness: 0.2 + mood.wear * 0.3 });
    s.box([sw, 0.5, 0.1], [sx, top - 0.25, frontZ + 0.06], chipped);
    s.box([sw, 0.5, 0.1], [sx, top - 0.25, back + 0.05], chipped);
    for (const x of [sinkL + 0.05, sinkR - 0.05, sinkL + 1.45]) s.box([0.1, 0.5, depth + 0.02], [x, top - 0.25, cz + 0.06], chipped);
    s.box([1.3, 0.06, depth - 0.1], [sinkL + 0.75, top - 0.44, cz + 0.06], s.material('#e3e6e2', { roughness: 0.3 }));
    s.cylinder(0.07, 0.07, 0.02, [sinkL + 0.75, top - 0.4, cz + 0.05], iron, 14);
    s.box([sw - 1.5, 0.08, depth - 0.1], [sinkR - (sw - 1.5) / 2 - 0.08, top - 0.06, cz + 0.06], chipped).rotation.z = 0.03;
    for (let i = 0; i < 7; i++) s.box([0.05, 0.03, depth - 0.3], [sinkL + 1.68 + i * 0.17, top - 0.01, cz + 0.06], chipped);
    if (mood.wear > 0.3) for (let i = 0; i < Math.round(mood.wear * 6); i++) s.box([0.06 + random() * 0.1, 0.04 + random() * 0.08, 0.012], [sinkL + 0.2 + random() * (sw - 0.4), top - 0.1 - random() * 0.3, frontZ + 0.112], iron);
    // tap on the wall
    s.rod([sinkL + 0.75, top + 0.5, back + 0.02], [sinkL + 0.75, top + 0.5, back + 0.34], 0.04, brass);
    s.rod([sinkL + 0.75, top + 0.5, back + 0.34], [sinkL + 0.75, top + 0.28, back + 0.44], 0.035, brass);
    s.box([0.22, 0.04, 0.05], [sinkL + 0.75, top + 0.62, back + 0.2], brass);
    s.rod([sinkL + 0.75, top + 0.5, back + 0.2], [sinkL + 0.75, top + 0.62, back + 0.2], 0.022, brass);
    if (emptied) for (const x of [sinkL + 0.1, sinkR - 0.1]) s.box([0.1, top - 0.5, 0.1], [x, (top - 0.5) / 2, frontZ], frame);
    else {
      // a gathered curtain instead of doors under the sink
      const gingham = paint(128, 128, (ctx) => {
        ctx.fillStyle = '#f6f1e2'; ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = mood.cheer > 0.5 ? 'rgba(200,56,47,0.55)' : 'rgba(63,95,154,0.55)';
        for (let i = 0; i < 8; i++) { ctx.fillRect(i * 16, 0, 8, 128); ctx.fillRect(0, i * 16, 128, 8); }
      });
      gingham.wrapS = gingham.wrapT = THREE.RepeatWrapping; gingham.repeat.set(5, 2.4);
      const skirt = new THREE.PlaneGeometry(sw - 0.06, top - 0.56, 40, 1);
      const p = skirt.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.045);
      skirt.computeVertexNormals();
      into(s.root, skirt, flat(gingham, { side: THREE.DoubleSide }), sx, (top - 0.5) / 2 + 0.05, frontZ + 0.07);
      s.rod([sinkL + 0.03, top - 0.53, frontZ + 0.07], [sinkR - 0.03, top - 0.53, frontZ + 0.07], 0.015, brass);
    }

    // ---- wall cupboards and the plate shelf ---------------------------------------------
    [[-4.1, -2.5], [-2.5, -0.95]].forEach(([x0, x1], i) => unit(x0, x1, 2.95, 4.3, back + 0.33, 0.66, i + 1));
    for (const y of [2.95, 3.75]) {
      s.box([3.85, 0.07, 0.5], [4.0, y, back + 0.25], trim);
      for (const x of [2.2, 5.8]) s.box([0.07, 0.3, 0.42], [x, y - 0.16, back + 0.21], trim);
    }
    if (!emptied) {
      const plates = 4 + Math.round(clutter * 5);
      const rimColour = s.material(palette.trim === '#f4f0e4' || palette.trim === '#f7f2e2' ? '#3f5f9a' : palette.trim, { roughness: 0.35 });
      for (let i = 0; i < plates; i++) {
        const x = 2.5 + (i / Math.max(plates - 1, 1)) * 3.0;
        const plate = s.cylinder(0.3, 0.3, 0.03, [x, 4.07, back + 0.14], china, 20); plate.rotation.x = Math.PI / 2 - 0.22;
        const ring = s.ring(0.25, 0.018, [x, 4.07, back + 0.16], rimColour); ring.rotation.x = -0.22;
      }
      const jam = ['#8a1f2c', '#c9702a', '#5a2a52', '#d9b040', '#7a9a3a'];
      for (let i = 0; i < 3 + Math.round(clutter * 6); i++) {
        const x = 2.4 + i * 0.37 + (random() - 0.5) * 0.06;
        s.cylinder(0.13, 0.13, 0.3, [x, 3.13, back + 0.25], s.material(jam[i % jam.length], { roughness: 0.2 }), 12);
        s.cylinder(0.14, 0.14, 0.05, [x, 3.3, back + 0.25], i % 3 ? brass : s.material('#f1e6d0', { roughness: 0.9 }), 12);
      }
    }

    // ---- back corner --------------------------------------------------------------------
    const ax = -5.05, az = -4.2;
    let hob: [number, number, number] = [-3.7, CT + 0.045, cz];
    if (a.corner === 'range') {
      s.box([1.75, 1.45, 1.5], [ax, 0.95, az], iron);
      s.box([1.9, 0.09, 1.62], [ax, 1.72, az], s.material('#3a3b3f', { roughness: 0.5, metalness: 0.5 }));
      for (const [x, z] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.35], [0.4, 0.35]]) s.cylinder(0.26, 0.26, 0.02, [ax + x, 1.775, az + z], iron, 18);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.14, 0.24, 0.14], [ax + x * 0.74, 0.12, az + z * 0.62], iron);
      s.box([0.9, 0.6, 0.05], [ax + 0.3, 0.75, az + 0.77], s.material('#34353a', { roughness: 0.5, metalness: 0.5 }));
      s.box([0.5, 0.35, 0.05], [ax - 0.5, 1.2, az + 0.77], s.material('#34353a', { roughness: 0.5, metalness: 0.5 }));
      const glow = emptied ? 0 : mix(0.4, 1.6, mood.warmth);
      s.box([0.36, 0.06, 0.02], [ax - 0.5, 1.12, az + 0.8], new THREE.MeshStandardMaterial({ color: emptied ? '#1c1a19' : '#ff8a2c', emissive: '#ff5a10', emissiveIntensity: glow }));
      s.rod([ax - 0.75, 1.5, az + 0.82], [ax + 0.75, 1.5, az + 0.82], 0.03, chrome);
      s.cylinder(0.17, 0.17, H - 1.9, [ax - 0.45, (H + 1.7) / 2 - 0.1, az - 0.5], iron, 14);
      hob = [ax + 0.4, 1.785, az + 0.35];
    } else if (a.corner === 'cooker') {
      s.box([1.6, 1.25, 1.35], [ax, 1.1, az], enamel);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([ax + x * 0.68, 0.5, az + z * 0.56], [ax + x * 0.72, 0, az + z * 0.6], 0.05, enamel, 0.035);
      s.box([1.64, 0.06, 1.39], [ax, 1.75, az], s.material('#2c2d30', { roughness: 0.5 }));
      for (const [x, z] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.33], [0.4, 0.33]]) { s.ring(0.2, 0.03, [ax + x, 1.8, az + z], iron).rotation.x = Math.PI / 2; s.cylinder(0.08, 0.1, 0.05, [ax + x, 1.79, az + z], brass, 10); }
      s.box([1.6, 0.6, 0.08], [ax, 2.08, az - 0.64], enamel);
      s.box([1.2, 0.72, 0.05], [ax, 0.98, az + 0.7], enamel); s.box([0.7, 0.3, 0.02], [ax, 1.05, az + 0.73], s.material('#2c2d30', { roughness: 0.3 }));
      s.rod([ax - 0.5, 1.42, az + 0.76], [ax + 0.5, 1.42, az + 0.76], 0.03, chrome);
      for (let i = 0; i < 4; i++) s.cylinder(0.06, 0.07, 0.06, [ax - 0.54 + i * 0.36, 1.62, az + 0.71], iron, 10).rotation.x = Math.PI / 2;
      hob = [ax + 0.4, 1.83, az + 0.33];
    } else if (a.corner === 'fridge') {
      const shell = s.material(mood.cheer > 0.5 ? '#f3efdf' : '#dfe6e2', { roughness: 0.3 });
      s.box([1.6, 2.7, 1.3], [ax, 1.45, az], shell);
      s.cylinder(0.65, 0.65, 1.6, [ax, 2.8, az], shell, 20).rotation.z = Math.PI / 2;
      s.box([1.5, 2.9, 0.1], [ax, 1.75, az + 0.68], shell);
      s.box([0.07, 0.6, 0.09], [ax + 0.55, 2.0, az + 0.78], chrome);
      s.box([0.5, 0.08, 0.02], [ax - 0.2, 2.9, az + 0.74], chrome);
      s.box([1.5, 0.1, 1.2], [ax, 0.05, az], iron);
      if (!emptied) { s.cylinder(0.3, 0.26, 0.24, [ax - 0.2, 3.5, az], wood, 14); for (let i = 0; i < 4; i++) s.ball([0.1, 0.1, 0.1], [ax - 0.2 + Math.cos(i * 1.6) * 0.12, 3.66, az + Math.sin(i * 1.6) * 0.12], s.material(i % 2 ? '#d8402f' : '#e8b52c'), 8); }
    } else {
      s.box([1.7, 1.6, 1.0], [ax, 0.8, az - 0.2], body);
      s.box([1.8, 0.08, 1.1], [ax, 1.64, az - 0.2], trim);
      s.box([1.7, 2.3, 0.08], [ax, 2.8, az - 0.66], body);
      for (const x of [-1, 1]) s.box([0.08, 2.3, 0.5], [ax + x * 0.81, 2.8, az - 0.45], body);
      for (const y of [2.35, 3.1, 3.95]) s.box([1.7, 0.06, 0.5], [ax, y, az - 0.45], trim);
      for (const x of [-0.4, 0.4]) { s.box([0.7, 1.2, 0.04], [ax + x, 0.8, az + 0.31], trim); s.ball([0.05, 0.05, 0.05], [ax + x * 0.25, 1.0, az + 0.36], knob, 8); }
      if (!emptied) for (let shelf = 0; shelf < 2; shelf++) for (let i = 0; i < 4; i++) {
        const plate = s.cylinder(0.24, 0.24, 0.025, [ax - 0.57 + i * 0.38, 2.63 + shelf * 0.75, az - 0.58], china, 16); plate.rotation.x = Math.PI / 2 - 0.2;
        if (shelf === 0) s.cylinder(0.08, 0.06, 0.12, [ax - 0.57 + i * 0.38, 2.24, az - 0.3], s.material(i % 2 ? '#3f5f9a' : '#f4f0e6', { roughness: 0.3 }), 10);
      }
    }

    // ---- left wall: clock, the butcher's calendar, faith, the door -----------------------
    const lx = -W / 2;
    const pale = new THREE.MeshStandardMaterial({ color: new THREE.Color(upper).lerp(new THREE.Color('#ffffff'), 0.45), roughness: 0.9 });
    const patch = (width: number, height: number, y: number, z: number) => { const m = into(s.root, new THREE.PlaneGeometry(width, height), pale, lx + 0.012, y, z); m.rotation.y = Math.PI / 2; m.castShadow = false; s.cylinder(0.012, 0.012, 0.05, [lx + 0.03, y + height / 2 - 0.06, z], iron, 6).rotation.z = Math.PI / 2; };
    // door
    const dz = 2.9, dw = 2.0, dh = 3.75;
    for (const z of [-1, 1]) s.box([0.14, dh + 0.12, 0.16], [lx + 0.07, dh / 2 + 0.06, dz + z * (dw / 2 + 0.08)], trim);
    s.box([0.14, 0.16, dw + 0.32], [lx + 0.07, dh + 0.08, dz], trim);
    s.box([0.08, dh, dw], [lx + 0.04, dh / 2, dz], body);
    for (const [y, h] of [[2.75, 1.5], [1.0, 1.4]]) for (const z of [-0.47, 0.47]) s.box([0.03, h, 0.72], [lx + 0.09, y, dz + z], trim);
    s.ball([0.07, 0.07, 0.07], [lx + 0.16, 1.9, dz - 0.78], brass, 10);
    if (!emptied && !cooking) {
      // her apron on its hook
      s.rod([lx + 0.02, 3.15, 4.45], [lx + 0.14, 3.2, 4.45], 0.02, brass);
      const apron = s.material(mood.cheer > 0.5 ? '#d8544c' : '#6f86a8', { roughness: 0.9 });
      const bib = s.box([0.06, 0.6, 0.42], [lx + 0.12, 2.82, 4.45], apron); bib.rotation.x = 0.04;
      s.box([0.08, 1.0, 0.72], [lx + 0.13, 2.05, 4.45], apron);
      s.box([0.1, 0.24, 0.28], [lx + 0.15, 2.1, 4.38], s.material('#f1ead8', { roughness: 0.9 }));
    }
    // clock
    if (emptied) patch(0.6, 0.6, 3.85, -2.5);
    else {
      const dial = paint(128, 128, (ctx) => {
        ctx.fillStyle = '#f6f2e4'; ctx.beginPath(); ctx.arc(64, 64, 62, 0, 7); ctx.fill();
        ctx.fillStyle = '#1b1b1d'; ctx.font = 'bold 16px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let h = 1; h <= 12; h++) ctx.fillText(String(h), 64 + Math.sin(h * 0.5236) * 48, 64 - Math.cos(h * 0.5236) * 48);
        ctx.strokeStyle = '#1b1b1d'; ctx.lineCap = 'round';
        const hour = mix(6.2, 9.8, random()) * 0.5236, minute = random() * 6.3;
        ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.sin(hour) * 26, 64 - Math.cos(hour) * 26); ctx.stroke();
        ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.sin(minute) * 42, 64 - Math.cos(minute) * 42); ctx.stroke();
      });
      s.cylinder(0.38, 0.38, 0.1, [lx + 0.05, 3.85, -2.5], darkWood, 24).rotation.z = Math.PI / 2;
      hang(dial, 0.66, 0.66, 3.85, -2.5).position.x = lx + 0.105;
    }
    // calendar
    if (emptied) patch(0.8, 1.15, 2.95, -0.95);
    else {
      const month = paint(256, 368, (ctx) => {
        ctx.fillStyle = '#f4efe0'; ctx.fillRect(0, 0, 256, 368);
        ctx.fillStyle = mood.cheer > 0.5 ? '#b8322c' : '#3a5a7a'; ctx.fillRect(0, 0, 256, 150);
        ctx.fillStyle = '#e8b0a8'; ctx.beginPath(); ctx.ellipse(128, 62, 62, 34, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(186, 46, 22, 0, 7); ctx.fill(); ctx.fillRect(86, 86, 10, 24); ctx.fillRect(156, 86, 10, 24);
        ctx.fillStyle = '#f4efe0'; ctx.font = 'bold 22px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('BUTCHER & SONS', 128, 138);
        const crossed = Math.floor(random() * 28);
        ctx.font = 'bold 17px Arial, sans-serif';
        for (let d = 0; d < 31; d++) {
          const x = 24 + (d % 7) * 35, y = 190 + Math.floor(d / 7) * 38;
          ctx.fillStyle = d % 7 === 6 ? '#b8322c' : '#2a2a2e'; ctx.fillText(String(d + 1), x, y);
          if (d < crossed) { ctx.strokeStyle = '#2a3560'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 12, y - 18); ctx.lineTo(x + 12, y + 6); ctx.stroke(); }
        }
      });
      hang(month, 0.8, 1.15, 2.95, -0.95, mix(-0.03, 0.03, random()));
    }
    // faith
    const fy = 3.55, fz = 0.75;
    if (a.faith === 'crucifix') {
      s.box([0.06, 0.95, 0.11], [lx + 0.04, fy, fz], darkWood); s.box([0.06, 0.11, 0.6], [lx + 0.04, fy + 0.2, fz], darkWood);
      s.box([0.04, 0.42, 0.06], [lx + 0.08, fy + 0.05, fz], brass); s.box([0.04, 0.05, 0.36], [lx + 0.08, fy + 0.2, fz], brass);
      for (let i = 0; i < 3; i++) s.rod([lx + 0.03, fy + 0.1, fz - 0.03], [lx + 0.05, fy + 0.62 + i * 0.05, fz - 0.26 - i * 0.08], 0.012, s.material('#a9a05a', { roughness: 0.9 }), 0.03);
    } else if (a.faith === 'icon') {
      const saint = paint(128, 160, (ctx) => {
        ctx.fillStyle = '#d9a83a'; ctx.fillRect(0, 0, 128, 160);
        ctx.fillStyle = '#f0cf6a'; ctx.beginPath(); ctx.arc(64, 54, 34, 0, 7); ctx.fill();
        ctx.fillStyle = '#7a2a2a'; ctx.beginPath(); ctx.ellipse(64, 150, 50, 66, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#c99a6a'; ctx.beginPath(); ctx.ellipse(64, 56, 17, 22, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#2a3f7a'; ctx.beginPath(); ctx.arc(64, 48, 22, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#7a5a1a'; ctx.lineWidth = 8; ctx.strokeRect(0, 0, 128, 160);
      });
      s.box([0.07, 0.95, 0.78], [lx + 0.04, fy, fz], brass);
      hang(saint, 0.66, 0.83, fy, fz).position.x = lx + 0.08;
      // embroidered towel draped over the top
      const cloth = s.material('#f6f2e6', { roughness: 0.95 }), stitch = s.material('#c8322c', { roughness: 0.9 });
      s.box([0.1, 0.07, 0.9], [lx + 0.07, fy + 0.51, fz], cloth);
      for (const z of [-1, 1]) { const fall = s.box([0.05, 0.85, 0.2], [lx + 0.07, fy + 0.1, fz + z * 0.5], cloth); fall.rotation.x = z * 0.08; s.box([0.055, 0.16, 0.2], [lx + 0.07, fy - 0.2, fz + z * 0.53], stitch); }
      s.rod([lx + 0.02, fy + 0.45, fz], [lx + 0.3, fy + 0.4, fz], 0.008, brass);
      s.rod([lx + 0.3, fy + 0.4, fz], [lx + 0.3, fy - 0.5, fz], 0.006, brass);
      s.cylinder(0.07, 0.04, 0.12, [lx + 0.3, fy - 0.56, fz], new THREE.MeshStandardMaterial({ color: '#c8281e', emissive: '#ff3a1a', emissiveIntensity: emptied ? 0 : 0.9, roughness: 0.3 }), 10);
    } else if (a.faith === 'sampler') {
      const words = paint(256, 192, (ctx) => {
        ctx.fillStyle = '#f3ecd8'; ctx.fillRect(0, 0, 256, 192);
        ctx.fillStyle = '#b8322c';
        for (let i = 0; i < 16; i++) { ctx.fillRect(12 + i * 15, 12, 8, 8); ctx.fillRect(12 + i * 15, 172, 8, 8); }
        for (let i = 0; i < 10; i++) { ctx.fillRect(12, 28 + i * 15, 8, 8); ctx.fillRect(236, 28 + i * 15, 8, 8); }
        ctx.font = 'bold 30px Georgia, serif'; ctx.textAlign = 'center';
        ctx.fillText('BLESS', 128, 70); ctx.fillText('THIS HOUSE', 128, 112);
        ctx.fillRect(122, 126, 12, 40); ctx.fillRect(108, 136, 40, 12);
      });
      s.box([0.06, 0.82, 1.08], [lx + 0.03, fy, fz], darkWood);
      hang(words, 0.96, 0.7, fy, fz).position.x = lx + 0.066;
    } else if (a.faith === 'horseshoe') {
      const shoe = s.ring(0.26, 0.05, [lx + 0.06, fy + 0.1, fz], iron, Math.PI * 1.35); shoe.rotation.set(0, Math.PI / 2, 0); shoe.rotateZ(-Math.PI * 0.175 + Math.PI);
      for (let i = 0; i < 6; i++) s.ball([0.09, 0.09, 0.09], [lx + 0.1, fy + 0.2 - i * 0.14, fz + 0.62 + (i % 2) * 0.07], s.material('#efe6d0', { roughness: 0.8 }), 8);
      s.rod([lx + 0.08, fy + 0.5, fz + 0.65], [lx + 0.08, fy + 0.2, fz + 0.65], 0.02, s.material('#c9b27a'));
    } else {
      const ghost = (width: number, height: number, y: number) => { const m = into(s.root, new THREE.PlaneGeometry(width, height), pale, lx + 0.012, y, fz); m.rotation.y = Math.PI / 2; m.castShadow = false; };
      ghost(0.12, 0.95, fy); ghost(0.6, 0.12, fy + 0.2);
      s.cylinder(0.012, 0.012, 0.06, [lx + 0.03, fy + 0.36, fz], iron, 6).rotation.z = Math.PI / 2;
    }

    // ---- floor covering -----------------------------------------------------------------
    if (a.rug === 'rag' && !emptied) {
      const braid = paint(256, 256, (ctx) => {
        const tones = ['#b8443a', '#3f5f8a', '#d9b24a', '#5f8a5a', '#e6dcc4', '#7a4a6a', '#c9703a'];
        for (let ring = 12; ring >= 0; ring--) {
          ctx.fillStyle = tones[Math.floor(random() * tones.length)];
          ctx.beginPath(); ctx.arc(128, 128, 8 + ring * 9.8, 0, 7); ctx.fill();
          ctx.strokeStyle = 'rgba(30,20,10,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
        }
      });
      const rug = into(s.root, new THREE.CircleGeometry(1, 40), flat(braid, { alphaTest: 0.5, roughness: 0.98 }), 0.5, 0.03, 1.0);
      rug.rotation.x = -Math.PI / 2; rug.scale.set(2.6, 1.9, 1); rug.rotation.z = mix(-0.2, 0.2, random()); rug.castShadow = false;
    } else if (a.rug === 'runner' && !emptied) {
      const stripes = paint(64, 256, (ctx) => {
        const tones = ['#b8443a', '#e6dcc4', '#3f5f8a', '#e6dcc4', '#d9b24a', '#5f8a5a'];
        for (let i = 0; i < 32; i++) { ctx.fillStyle = tones[i % tones.length]; ctx.fillRect(0, i * 8, 64, 8); }
      });
      const runner = into(s.root, new THREE.PlaneGeometry(1.5, 6.4), flat(stripes, { roughness: 0.98 }), -2.9, 0.03, -0.1);
      runner.rotation.set(-Math.PI / 2, 0, -0.75); runner.castShadow = false;
    }

    // ---- what the morning has left out --------------------------------------------------
    const puffs: { mesh: THREE.Mesh; phase: number; sway: number }[] = [];
    let dialGlow: THREE.MeshStandardMaterial | null = null;
    if (!emptied) {
      // radio at the end of the counter
      const rx = 5.3, ry = CT + 0.045, rz = cz - 0.05;
      s.box([0.95, 0.6, 0.42], [rx, ry + 0.3, rz], darkWood);
      s.box([0.5, 0.4, 0.02], [rx - 0.16, ry + 0.32, rz + 0.215], s.material('#c9b27a', { roughness: 0.95 }));
      dialGlow = new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffb84a', emissiveIntensity: a.state === 'spotless' ? 0.3 : 1.1, roughness: 0.4 });
      s.box([0.24, 0.3, 0.02], [rx + 0.3, ry + 0.36, rz + 0.215], dialGlow);
      for (const x of [0.22, 0.38]) s.cylinder(0.04, 0.04, 0.05, [rx + x, ry + 0.1, rz + 0.23], s.material('#efe6cf'), 10).rotation.x = Math.PI / 2;
      s.rod([rx + 0.4, ry + 0.6, rz - 0.1], [rx + 0.62, ry + 1.5, rz - 0.14], 0.012, chrome);
      // canisters, graded by size
      const tin = s.material(palette.trim === '#f4f0e4' || palette.trim === '#f7f2e2' ? '#c8382f' : palette.trim, { roughness: 0.35, metalness: 0.2 });
      const many = 2 + Math.round(clutter * 2);
      for (let i = 0; i < many; i++) {
        const r = 0.2 - i * 0.028, h = 0.56 - i * 0.09, x = 2.3 + i * 0.36;
        s.cylinder(r, r, h, [x, ry + h / 2, cz - 0.28], tin, 16); s.cylinder(r * 1.04, r * 1.04, 0.05, [x, ry + h, cz - 0.28], enamel, 16);
        s.box([r * 1.1, h * 0.3, 0.01], [x, ry + h * 0.5, cz - 0.28 + r], enamel);
      }
      // dish rack on the drainer
      for (let i = 0; i < 6; i++) s.rod([sinkL + 1.7 + i * 0.16, top + 0.02, cz - 0.3], [sinkL + 1.7 + i * 0.16, top + 0.3, cz - 0.3], 0.012, chrome);
      s.rod([sinkL + 1.66, top + 0.02, cz - 0.3], [sinkL + 2.54, top + 0.02, cz - 0.3], 0.014, chrome);
      const drying = a.state === 'spotless' ? 1 : 2 + Math.round(clutter * 2);
      for (let i = 0; i < drying; i++) { const plate = s.cylinder(0.24, 0.24, 0.025, [sinkL + 1.78 + i * 0.16, top + 0.26, cz - 0.24], china, 16); plate.rotation.set(Math.PI / 2, 0, 0.25); plate.rotation.order = 'ZXY'; }
      if (a.state === 'spotless') {
        s.lathe([[0, 0], [0.09, 0], [0.13, 0.2], [0.115, 0.2], [0.08, 0.02], [0, 0.02]], china, [sinkL + 2.3, top + 0.02, cz + 0.2]);
        // one towel folded over the rail of the stove or the edge of the sink
        s.box([0.5, 0.5, 0.04], [sinkL + 0.75, top - 0.22, frontZ + 0.13], s.material(mood.cheer > 0.5 ? '#d8544c' : '#6f86a8', { roughness: 0.95 }));
        s.box([0.52, 0.06, 0.14], [sinkL + 0.75, top + 0.03, frontZ + 0.07], s.material(mood.cheer > 0.5 ? '#d8544c' : '#6f86a8', { roughness: 0.95 }));
      } else if (a.state === 'expecting') {
        for (let i = 0; i < 6; i++) s.cylinder(0.3, 0.2, 0.035, [-1.55, ry + 0.02 + i * 0.04, cz + 0.12], china, 20);
        for (let i = 0; i < 5; i++) s.lathe([[0, 0], [0.07, 0], [0.085, 0.22], [0.075, 0.22], [0.062, 0.02], [0, 0.02]], new THREE.MeshStandardMaterial({ color: '#cfe4ea', roughness: 0.1 }), [-3.85 + i * 0.2, ry, cz + 0.3]);
        // dough rising under a cloth
        s.lathe([[0, 0], [0.2, 0], [0.34, 0.24], [0.32, 0.26], [0, 0.26]], s.material('#d9c9a0', { roughness: 0.5 }), [-3.6, ry, cz - 0.15]);
        s.ball([0.36, 0.2, 0.36], [-3.6, ry + 0.27, cz - 0.15], s.material('#f6f1e2', { roughness: 0.95 }), 14);
        s.box([0.9, 0.012, 0.9], [-3.6, ry + 0.262, cz - 0.15], s.material('#f6f1e2', { roughness: 0.95 })).rotation.y = 0.4;
      } else {
        // floured board, dough, rolling pin
        s.box([1.0, 0.05, 0.7], [-1.6, ry + 0.025, cz + 0.12], wood).rotation.y = 0.12;
        s.cylinder(0.42, 0.42, 0.012, [-1.6, ry + 0.056, cz + 0.12], s.material('#f8f5ec', { roughness: 1 }), 20);
        s.ball([0.26, 0.11, 0.24], [-1.7, ry + 0.12, cz + 0.1], s.material('#eedcae', { roughness: 0.9 }), 14);
        const pin = s.cylinder(0.055, 0.055, 0.6, [-1.3, ry + 0.11, cz + 0.32], wood, 12); pin.rotation.set(0, 0.5, Math.PI / 2);
        s.cylinder(0.11, 0.09, 0.3, [-0.45 - 0.9, ry + 0.2, cz - 0.3], enamel, 14);
        for (let i = 0; i < 3; i++) s.rod([-1.35, ry + 0.3, cz - 0.3], [-1.35 + (i - 1) * 0.12, ry + 0.72, cz - 0.3 + (random() - 0.5) * 0.1], 0.018, wood);
      }
      if (cooking || a.state === 'expecting') {
        // the pot
        const pot = s.material(mood.cheer > 0.5 ? '#c8382f' : '#3a5a7a', { roughness: 0.35 });
        s.lathe([[0, 0], [0.3, 0], [0.33, 0.03], [0.33, 0.4], [0.3, 0.4], [0.3, 0.05], [0, 0.05]], pot, hob);
        for (const x of [-1, 1]) s.box([0.12, 0.04, 0.14], [hob[0] + x * 0.37, hob[1] + 0.34, hob[2]], iron);
        s.cylinder(0.3, 0.3, 0.02, [hob[0], hob[1] + 0.33, hob[2]], s.material('#c98a3a', { roughness: 0.4 }), 18);
        if (cooking) {
          const lid = s.cylinder(0.34, 0.34, 0.03, [hob[0] - 0.1, hob[1] + 0.47, hob[2] - 0.12], pot, 18); lid.rotation.z = 0.5; lid.rotation.x = -0.3;
          s.rod([hob[0] + 0.1, hob[1] + 0.34, hob[2]], [hob[0] + 0.5, hob[1] + 0.8, hob[2] + 0.25], 0.022, wood);
          const vapour = new THREE.MeshStandardMaterial({ color: '#f6f8f8', transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 });
          const geometry = new THREE.IcosahedronGeometry(1, 2);
          for (let i = 0; i < 12; i++) { const mesh = new THREE.Mesh(geometry, vapour); s.root.add(mesh); puffs.push({ mesh, phase: (i + random() * 0.6) / 12, sway: random() * 6.3 }); }
        }
      }
    } else {
      // packed boxes, a rolled rug, a bare bulb's worth of absence
      const stack: [number, number, number, number][] = [[2.9, 3.4, 1.2, 0], [-3.0, 3.6, 1.0, 0], [3.1, 3.5, 0.85, 0.95], [-4.6, 1.2, 0.9, 0], [4.9, -2.6, 1.05, 0]];
      stack.slice(0, 3 + Math.round(mood.density * 2)).forEach(([x, z, size, lift], i) => {
        const turn = random() * 0.8;
        const crate = s.box([size, size * 0.72, size * 0.85], [x, lift + size * 0.36, z], cardboard); crate.rotation.y = turn;
        const tape = s.box([size * 1.01, size * 0.73, 0.12], [x, lift + size * 0.36, z], s.material('#d9c9a0', { roughness: 0.6 })); tape.rotation.y = turn;
        if (i === 1) { const flap = s.box([size, 0.03, size * 0.42], [x, size * 0.8, z - size * 0.5], cardboard); flap.rotation.set(-0.9, turn, 0); flap.rotation.order = 'YXZ'; for (let k = 0; k < 4; k++) s.cylinder(0.26, 0.26, 0.03, [x - 0.1 + k * 0.05, size * 0.7 + k * 0.03, z], china, 16); }
      });
      const roll = s.cylinder(0.22, 0.22, 2.6, [1.6, 0.24, 3.9], s.material('#8a5a4a', { roughness: 0.95 }), 14); roll.rotation.set(0, 0.3, Math.PI / 2);
    }

    const plume = 1.5, speed = mix(0.12, 0.5, mood.energy);
    const pose = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.phase + time * speed) % 1;
        puff.mesh.position.set(hob[0] + Math.sin(puff.sway + t * 4 + time * 0.4) * 0.3 * t, hob[1] + 0.45 + t * plume, hob[2] + Math.cos(puff.sway * 1.7 + t * 3) * 0.2 * t);
        puff.mesh.scale.setScalar(Math.max(0.001, (0.08 + t * 0.3) * Math.min(1, (1 - t) * 3)));
      }
    };
    pose(0);
    const glowBase = dialGlow ? dialGlow.emissiveIntensity : 0;
    world.update = (_dt, time) => {
      pose(time);
      // the radio murmuring: its dial breathes with the programme
      if (dialGlow) dialGlow.emissiveIntensity = glowBase * (0.85 + Math.sin(time * 6.1) * Math.sin(time * 2.3) * 0.2 * mix(0.3, 1, mood.energy));
    };
    return world;
  },
});
