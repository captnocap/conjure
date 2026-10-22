import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, mix, noul, visibleBounds } from '@conjure/kit';

const NATURALS = ['#17151a', '#231a18', '#3a2318', '#5a341f', '#7a4a25', '#9a6a36', '#c79a55', '#e3c98a', '#b8491f', '#8a8a8e', '#d9d8d2'];
const BRIGHTS = ['#ff3fa0', '#2456e6', '#9be321', '#ff7a1a', '#8f3fe0', '#18c7b5', '#ffe21f', '#e8202a'];
const CHART = ['#17151a', '#2a1c17', '#4a2c1b', '#6d4526', '#93602f', '#b8491f', '#c79a55', '#e8d190', '#d9d8d2', '#ff3fa0', '#8f3fe0', '#2456e6'];

export default defineWorld({
  questions: {
    kind: choice('What kind of wig shop is it?', {
      beauty: 'A beauty supply store: braiding hair by the wall-load, a gondola of oils, gels and sprays.',
      theatrical: 'A theatrical wig and make-up shop: neon and powdered wigs, a bulb-lit mirror, a costume trunk.',
      medical: 'A quiet hair-loss fitting studio: natural colours only, a folding privacy screen, tissues within reach.',
      bargain: 'A bargain wig shop: a dump bin of tangled wigs, starburst price cards, everything one price.',
    }),
    era: choice('What era is the shop fitted out in?', {
      sixties: 'Sixties salon: mint walls, rose trim, pale wood.',
      seventies: 'Seventies high street: brown wood panelling, orange trim, cream above.',
      nineties: 'Nineties: pink walls with teal and chrome.',
      now: 'Now: white walls, black trim and a little blush.',
    }),
    state: choice('What state is the shop in?', {
      open: 'Open for business on an ordinary day, door ajar, everything stocked.',
      sale: 'Mid-sale: bunting strung across the wall and price stars on everything.',
      closing: 'Closing down: half the heads are bare, the pegboard is picked over, boxes are packed.',
      afterhours: 'Shut for the night: tubes off, a grille across the window, the heads waiting in the dusk.',
    }),
    sign: choice('What does the hand-lettered sign in the window say?', {
      prices: 'WIGS 15 & UP',
      human: '100% HUMAN HAIR',
      fitting: 'PRIVATE FITTINGS',
      go: 'EVERYTHING MUST GO',
      back: 'BACK IN 5 MINS',
      newyou: 'NEW YOU STARTS HERE',
    }),
    floor: choice('What is the floor?', {
      checker: 'Checkerboard lino, scuffed at the door.',
      carpet: 'Flat speckled shop carpet.',
      boards: 'Painted floorboards.',
      terrazzo: 'Old speckled terrazzo.',
    }),
    heads: choice('What are the display heads on the glass shelves?', {
      foam: 'White polystyrene heads, dozens of identical eggs.',
      velvet: 'Black velvet heads, boutique style.',
      vintage: 'Old flesh-pink mannequin heads from a closed department store.',
      mixed: 'A mismatched crowd collected over decades.',
    }),
    turned: noul('Has one head on the shelves been turned to face the wall?'),
    till: choice('What is at the end of the counter?', {
      register: 'A heavy old cash register with round keys.',
      tablet: 'A tablet on a stand and a card reader.',
      cashbox: 'A cash box, a receipt book and a pen on a chain.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const closed = a.state === 'afterhours';
    const look = {
      sixties: { wall: '#dfe9dc', lower: '#c9dcc8', trim: '#c85a6a', wood: '#d9c7a0', floorA: '#efe9d6', floorB: '#9cb8a4', ink: '#fff6ea' },
      seventies: { wall: '#eadfc2', lower: '#8a5a30', trim: '#c2622a', wood: '#7a4a25', floorA: '#e6d7b4', floorB: '#8a5a38', ink: '#fff0cf' },
      nineties: { wall: '#f3dfe8', lower: '#f0c8d8', trim: '#1f9c98', wood: '#d5d9dc', floorA: '#f3eef0', floorB: '#e088ae', ink: '#ffffff' },
      now: { wall: '#f0efea', lower: '#e6e2dc', trim: '#2a2a2e', wood: '#d9c0b2', floorA: '#ecebe6', floorB: '#bdbab4', ink: '#ffffff' },
    }[a.era];
    const W = 12, D = 10, WH = 4.6;
    const yawDeg = 27, pitchDeg = 27;
    const { art: s, world } = diorama(context, {
      background: closed ? '#aab0bd' : mix(0, 1, mood.warmth) > 0.5 ? '#ebe7dc' : '#e4e8e6',
      floor: look.floorA, width: W, depth: D, pitch: pitchDeg, yaw: yawDeg,
    });
    if (closed) s.root.traverse((node) => { const light = node as THREE.Light; if (light.isLight) light.intensity *= 0.72; });
    const texture = (w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      paint(canvas.getContext('2d')!);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
      return map;
    };
    const sign = (text: string, width: number, height: number, at: [number, number, number], ink: string, paper: string, hand = false) => {
      const map = texture(512, Math.max(64, Math.round(512 * height / width)), (ctx) => {
        const h = ctx.canvas.height;
        ctx.fillStyle = paper; ctx.fillRect(0, 0, 512, h);
        const lines = text.split('/').map((line) => line.trim());
        const lineH = h / (lines.length + 0.35);
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        lines.forEach((line, row) => {
          const size = Math.min(lineH * 0.82, 760 / Math.max(line.length, 4));
          const y = lineH * (row + 0.68);
          if (!hand) { ctx.font = `bold ${size}px Impact, "Arial Narrow", sans-serif`; ctx.fillText(line, 256, y, 480); return; }
          ctx.font = `bold ${size}px "Comic Sans MS", "Chalkboard SE", "Segoe Print", cursive`;
          const widths = [...line].map((ch) => ctx.measureText(ch).width);
          const total = widths.reduce((sum, w) => sum + w, 0), fit = Math.min(1, 470 / total);
          let x = 256 - total * fit / 2;
          [...line].forEach((ch, i) => {
            ctx.save();
            ctx.translate(x + widths[i] * fit / 2, y + jitter(size * 0.07));
            ctx.rotate(jitter(0.09)); ctx.scale(fit * mix(0.92, 1.08, random()), mix(0.92, 1.1, random()));
            ctx.fillText(ch, 0, 0);
            ctx.restore();
            x += widths[i] * fit;
          });
          ctx.fillRect(256 - total * fit / 2 + jitter(8), y + size * 0.5, total * fit, Math.max(3, size * 0.06));
        });
        ctx.fillStyle = `rgba(190,180,160,${mood.wear * 0.35})`; ctx.fillRect(0, 0, 512, h);
      });
      const mesh = s.mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide }), at);
      return mesh;
    };

    // ---- floor finish
    const floorMap = texture(768, 640, (ctx) => {
      ctx.fillStyle = look.floorA; ctx.fillRect(0, 0, 768, 640);
      if (a.floor === 'checker') {
        ctx.fillStyle = look.floorB;
        for (let x = 0; x < 12; x++) for (let z = 0; z < 10; z++) if ((x + z) % 2) ctx.fillRect(x * 64, z * 64, 64, 64);
      } else if (a.floor === 'carpet') {
        ctx.fillStyle = look.floorB; ctx.globalAlpha = 0.55; ctx.fillRect(0, 0, 768, 640); ctx.globalAlpha = 1;
        for (let i = 0; i < 5000; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(40,30,40,0.2)'; ctx.fillRect(random() * 768, random() * 640, 3, 3); }
      } else if (a.floor === 'boards') {
        ctx.fillStyle = look.wood; ctx.fillRect(0, 0, 768, 640);
        for (let i = 0; i < 20; i++) {
          ctx.fillStyle = `rgba(0,0,0,${0.03 + random() * 0.07})`; ctx.fillRect(0, i * 32, 768, 32);
          ctx.fillStyle = 'rgba(40,25,15,0.45)'; ctx.fillRect(0, i * 32, 768, 2);
          for (let k = 0; k < 3; k++) ctx.fillRect(random() * 768, i * 32, 2, 32);
        }
      } else {
        for (let i = 0; i < 2600; i++) {
          ctx.fillStyle = pick([look.floorB, '#6a6a70', '#f8f6f0', look.trim, '#b8a890']);
          ctx.globalAlpha = 0.75;
          ctx.beginPath(); ctx.ellipse(random() * 768, random() * 640, 2 + random() * 6, 2 + random() * 4, random() * 3, 0, 6.3); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // scuffs worn in from the door to the counter
      const scuff = ctx.createRadialGradient(60, 520, 10, 60, 520, 300);
      scuff.addColorStop(0, `rgba(70,60,50,${0.12 + mood.wear * 0.4})`); scuff.addColorStop(1, 'rgba(70,60,50,0)');
      ctx.fillStyle = scuff; ctx.fillRect(0, 0, 768, 640);
    });
    const lino = s.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorMap, roughness: a.floor === 'carpet' ? 1 : 0.55 }), [0, 0.004, 0]);
    lino.rotation.x = -Math.PI / 2; lino.castShadow = false;

    // ---- walls: the back wall, and the shop front on the left with window and door
    const wall = s.material(look.wall, { roughness: 0.9 });
    const lower = s.material(look.lower, { roughness: 0.8 });
    const trim = s.material(look.trim, { roughness: 0.5 });
    const wood = s.material(look.wood, { roughness: 0.6 });
    const chrome = s.material('#d5d9dc', { metalness: 0.9, roughness: 0.25 });
    const BZ = -D / 2, LX = -W / 2;
    s.box([W + 0.3, WH, 0.3], [-0.15, WH / 2, BZ - 0.15], wall);
    s.box([W, 0.95, 0.06], [0, 0.475, BZ + 0.03], lower);
    s.box([W, 0.08, 0.1], [0, 0.97, BZ + 0.05], trim);
    const WZ0 = -3.9, WZ1 = 1.3, DZ0 = 2.1, DZ1 = 4.2, SILL = 1.05, HEAD = 3.7, DOORH = 3.2;
    const leftPiece = (z0: number, z1: number, y0: number, y1: number, material = wall) => s.box([0.3, y1 - y0, z1 - z0], [LX - 0.15, (y0 + y1) / 2, (z0 + z1) / 2], material);
    leftPiece(BZ, WZ0, 0, WH); leftPiece(WZ1, DZ0, 0, WH); leftPiece(DZ1, D / 2, 0, WH);
    leftPiece(WZ0, WZ1, 0, SILL, lower); leftPiece(WZ0, WZ1, HEAD, WH); leftPiece(DZ0, DZ1, DOORH, WH);
    // window frame, mullions, glass
    const frameBar = (y: number, z: number, sy: number, sz: number) => s.box([0.16, sy, sz], [LX - 0.12, y, z], trim);
    frameBar(SILL, (WZ0 + WZ1) / 2, 0.1, WZ1 - WZ0); frameBar(HEAD, (WZ0 + WZ1) / 2, 0.1, WZ1 - WZ0);
    for (const z of [WZ0 + (WZ1 - WZ0) / 3, WZ0 + (WZ1 - WZ0) * 2 / 3]) frameBar((SILL + HEAD) / 2, z, HEAD - SILL, 0.07);
    const day = mood.daylight;
    const skyTint = closed ? '#5a6a9a' : new THREE.Color('#cfe6f5').lerp(new THREE.Color('#ffd9a0'), Math.max(0, day - 0.55) * 2).getStyle();
    const glassMaterial = new THREE.MeshStandardMaterial({ color: skyTint, transparent: true, opacity: closed ? 0.42 : 0.28, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide, emissive: skyTint, emissiveIntensity: closed ? 0.1 : 0.35 });
    const pane = s.mesh(new THREE.PlaneGeometry(WZ1 - WZ0, HEAD - SILL), glassMaterial, [LX - 0.14, (SILL + HEAD) / 2, (WZ0 + WZ1) / 2]);
    pane.rotation.y = Math.PI / 2; pane.castShadow = false;
    // window ledge inside
    s.box([0.75, 0.07, WZ1 - WZ0 - 0.1], [LX + 0.36, SILL + 0.03, (WZ0 + WZ1) / 2], wood);
    // the hand-lettered sign, hung in the window on two strings
    const signText = { prices: 'WIGS 15 & UP/BRAIDS 3 FOR 10', human: '100% HUMAN/HAIR', fitting: 'PRIVATE/FITTINGS', go: 'EVERYTHING/MUST GO', back: 'BACK IN/5 MINS', newyou: 'NEW YOU/STARTS HERE' }[a.sign];
    const signPaper = a.state === 'sale' || a.sign === 'go' ? '#ffe21f' : pick(['#fbf6e6', '#fde9c8', '#f6f2ea']);
    const signInk = a.sign === 'go' || a.state === 'sale' ? '#c2161f' : pick(['#1f2f8a', '#c2161f', '#1b1b1f']);
    const SIGNZ = WZ0 + (WZ1 - WZ0) * 0.5, SIGNY = 2.78;
    const card = sign(signText, 2.3, 1.5, [LX + 0.06, SIGNY, SIGNZ], signInk, signPaper, true);
    card.rotation.set(0, Math.PI / 2, 0); card.rotateZ(jitter(0.05));
    s.box([0.03, 1.54, 2.34], [LX + 0.04, SIGNY, SIGNZ], s.material('#d8cfb8'));
    for (const dz of [-0.9, 0.9]) s.rod([LX + 0.05, SIGNY + 0.75, SIGNZ + dz], [LX - 0.05, HEAD, SIGNZ + dz * 0.8], 0.008, s.material('#8a8272'));
    // security grille after hours
    if (closed) {
      const grille = s.material('#6a6f78', { metalness: 0.7, roughness: 0.4 });
      for (let i = 0; i <= 12; i++) { const z = WZ0 + (WZ1 - WZ0) * i / 12; s.rod([LX + 0.02, SILL, z], [LX + 0.02, HEAD, z], 0.012, grille); }
      for (let i = 1; i < 5; i++) { const y = SILL + (HEAD - SILL) * i / 5; s.rod([LX + 0.02, y, WZ0], [LX + 0.02, y, WZ1], 0.012, grille); }
    }
    // door
    s.box([0.16, DOORH, 0.1], [LX - 0.1, DOORH / 2, DZ0], trim); s.box([0.16, DOORH, 0.1], [LX - 0.1, DOORH / 2, DZ1], trim);
    s.box([0.16, 0.1, DZ1 - DZ0], [LX - 0.1, DOORH, (DZ0 + DZ1) / 2], trim);
    const door = new THREE.Group();
    const DW = DZ1 - DZ0 - 0.1;
    const doorPart = (size: [number, number, number], at: [number, number, number], material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; door.add(mesh); return mesh;
    };
    doorPart([0.07, DOORH - 0.1, 0.14], [0, DOORH / 2, 0.07], trim); doorPart([0.07, DOORH - 0.1, 0.14], [0, DOORH / 2, DW - 0.07], trim);
    doorPart([0.07, 0.5, DW], [0, 0.3, DW / 2], trim); doorPart([0.07, 0.14, DW], [0, DOORH - 0.12, DW / 2], trim);
    const doorGlass = doorPart([0.02, DOORH - 0.7, DW - 0.26], [0, DOORH / 2 + 0.2, DW / 2], glassMaterial); doorGlass.castShadow = false;
    doorPart([0.2, 0.05, 0.05], [0.08, 1.5, DW - 0.25], chrome);
    door.position.set(LX - 0.06, 0, DZ0 + 0.05);
    const ajar = a.state === 'afterhours' ? 0 : a.state === 'closing' ? 0.25 : mix(0.5, 1.1, mood.energy);
    door.rotation.y = -ajar;
    s.root.add(door);
    const hang = sign(closed ? 'CLOSED' : a.state === 'closing' ? 'LAST DAYS' : 'OPEN', 0.62, 0.3, [0.05, 2.15, DW / 2], closed ? '#ffffff' : '#ffffff', closed ? '#b3121f' : '#1f8a3c');
    s.root.remove(hang); door.add(hang); hang.rotation.y = Math.PI / 2;
    // door mat
    s.box([1.0, 0.03, 1.6], [LX + 0.7, 0.018, (DZ0 + DZ1) / 2], s.material('#5a4a3a', { roughness: 1 }));

    // ---- fascia sign over the back wall
    const fasciaText = a.state === 'closing' ? 'CLOSING DOWN' : { beauty: 'HAIR & BEAUTY SUPPLY', theatrical: 'THEATRICAL WIGS & MAKE-UP', medical: 'HAIR LOSS & WIG FITTING', bargain: 'WIG WORLD - ALL 9.99' }[a.kind];
    s.box([W - 0.4, 0.5, 0.08], [0, WH - 0.33, BZ + 0.05], trim);
    sign(fasciaText, 6.4, 0.4, [0, WH - 0.33, BZ + 0.095], a.state === 'closing' ? '#ffe21f' : look.ink, a.state === 'closing' ? '#c2161f' : look.trim);

    // ---- stock levels and palette
    const stock = (a.state === 'closing' ? 0.38 : a.state === 'sale' ? 0.8 : 1) * mix(0.72, 1, mood.density);
    const wigColour = () => {
      const bright = { beauty: 0.22, theatrical: 0.7, medical: 0, bargain: 0.4 }[a.kind];
      const c = new THREE.Color(random() < bright ? pick(BRIGHTS) : pick(NATURALS));
      const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl);
      return c.setHSL(hsl.h, hsl.s * mix(0.6, 1.05, mood.cheer), hsl.l).lerp(new THREE.Color('#8f8878'), mood.wear * 0.2);
    };

    // ---- pegboard wall of packaged hair (left half of the back wall)
    const PX0 = -5.7, PX1 = -0.35, PY0 = 1.1, PY1 = 3.95;
    const pegMap = texture(512, 272, (ctx) => {
      ctx.fillStyle = a.era === 'now' ? '#f4f2ec' : a.era === 'nineties' ? '#f6eef2' : '#d8bf94'; ctx.fillRect(0, 0, 512, 272);
      ctx.fillStyle = 'rgba(60,40,25,0.5)';
      for (let x = 6; x < 512; x += 12) for (let y = 6; y < 272; y += 12) { ctx.beginPath(); ctx.arc(x, y, 1.7, 0, 6.3); ctx.fill(); }
    });
    s.mesh(new THREE.BoxGeometry(PX1 - PX0, PY1 - PY0, 0.06), new THREE.MeshStandardMaterial({ map: pegMap, roughness: 0.85 }), [(PX0 + PX1) / 2, (PY0 + PY1) / 2, BZ + 0.04]);
    s.box([PX1 - PX0 + 0.12, 0.07, 0.1], [(PX0 + PX1) / 2, PY1 + 0.03, BZ + 0.05], trim);
    {
      const cols = 12, rows = 3, cw = (PX1 - PX0) / cols, rh = (PY1 - PY0) / rows;
      const hanks: { m: THREE.Matrix4; c: THREE.Color }[] = [], cards: { m: THREE.Matrix4; c: THREE.Color }[] = [], hooks: { at: [number, number, number]; size: number }[] = [];
      const dummy = new THREE.Object3D();
      const chart = a.kind === 'medical' ? CHART.slice(0, 9) : a.kind === 'theatrical' ? [...CHART.slice(0, 4), ...BRIGHTS] : CHART;
      const odd = a.state !== 'closing' ? { col: Math.floor(random() * cols), row: Math.floor(random() * rows) } : null;
      for (let col = 0; col < cols; col++) for (let row = 0; row < rows; row++) {
        const x = PX0 + cw * (col + 0.5), top = PY1 - rh * row - 0.12;
        hooks.push({ at: [x, top, BZ + 0.13], size: 1 });
        const depth = Math.round(mix(0, 3, random())) + 1;
        if (random() > stock) continue;
        let colour = new THREE.Color(chart[Math.floor(col / cols * chart.length)]);
        if (odd && odd.col === col && odd.row === row) colour = new THREE.Color(pick(BRIGHTS));
        colour.lerp(new THREE.Color('#8f8878'), mood.wear * 0.18);
        for (let k = 0; k < Math.min(depth, 2); k++) {
          const len = rh * mix(0.62, 0.74, random());
          dummy.position.set(x + jitter(0.02), top - 0.14 - len / 2, BZ + 0.1 + k * 0.05);
          dummy.rotation.set(0, 0, jitter(0.03 + mood.wear * 0.08)); dummy.scale.set(cw * 0.33, len, 0.035); dummy.updateMatrix();
          hanks.push({ m: dummy.matrix.clone(), c: colour.clone().multiplyScalar(k ? 1 : 0.86) });
          dummy.position.set(x + jitter(0.01), top - 0.07, BZ + 0.105 + k * 0.05);
          dummy.rotation.set(0, 0, jitter(0.03)); dummy.scale.set(cw * 0.74, 0.17, 0.02); dummy.updateMatrix();
          cards.push({ m: dummy.matrix.clone(), c: new THREE.Color(a.state === 'sale' && random() < 0.3 ? '#ffe21f' : pick([look.trim, '#fbf6e6', '#17161a', '#c2161f'])) });
        }
      }
      const build = (geo: THREE.BufferGeometry, material: THREE.Material, list: typeof hanks) => {
        if (!list.length) { geo.dispose(); material.dispose(); return; }
        const mesh = new THREE.InstancedMesh(geo, material, list.length);
        list.forEach((item, i) => { mesh.setMatrixAt(i, item.m); mesh.setColorAt(i, item.c); });
        mesh.castShadow = mesh.receiveShadow = true;
        s.root.add(mesh);
      };
      build(new THREE.CylinderGeometry(1, 0.45, 1, 10), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 }), hanks);
      build(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), cards);
      s.scatter(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6).rotateX(Math.PI / 2), chrome, hooks);
    }

    // ---- the crowd of faceless heads
    type Head = { x: number; y: number; z: number; yaw: number; wig: number; scale: number };
    const heads: Head[] = [];
    const SX0 = 0.35, SX1 = 5.75;
    const shelfYs = [1.25, 2.2, 3.15];
    const glassShelf = new THREE.MeshStandardMaterial({ color: '#cfeee6', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false });
    const glassEdge = s.material('#a9d8cc', { roughness: 0.2 });
    for (const x of [SX0, (SX0 + SX1) / 2, SX1]) s.box([0.05, 3.2, 0.05], [x, 2.5, BZ + 0.06], chrome);
    shelfYs.forEach((y, row) => {
      const pane2 = s.box([SX1 - SX0, 0.035, 0.62], [(SX0 + SX1) / 2, y, BZ + 0.34], glassShelf); pane2.castShadow = false;
      s.box([SX1 - SX0, 0.035, 0.025], [(SX0 + SX1) / 2, y, BZ + 0.655], glassEdge);
      for (const x of [SX0 + 0.05, (SX0 + SX1) / 2, SX1 - 0.05]) s.rod([x, y - 0.02, BZ + 0.05], [x, y - 0.02, BZ + 0.62], 0.014, chrome);
      const n = 6;
      for (let i = 0; i < n; i++) {
        const x = SX0 + (SX1 - SX0) * (i + 0.5) / n + jitter(0.04);
        const bare = random() > stock;
        heads.push({ x, y: y + 0.018, z: BZ + 0.36 + jitter(0.03), yaw: jitter(0.18 + mood.wear * 0.3 + mood.energy * 0.1), wig: bare ? -1 : Math.floor(random() * 4), scale: mix(1.1, 1.2, random()) });
        void row;
      }
    });
    if (a.turned) { const victim = heads[Math.floor(random() * heads.length)]; victim.yaw = Math.PI + jitter(0.15); }
    // heads in the window, looking out at the street
    for (let i = 0; i < 5; i++) {
      const z = WZ0 + 0.55 + i * (WZ1 - WZ0 - 1.1) / 4;
      if (Math.abs(z - SIGNZ) < 0.3 && false) continue;
      heads.push({ x: LX + 0.38, y: SILL + 0.066, z: z + jitter(0.05), yaw: -Math.PI / 2 + jitter(0.3), wig: random() > stock ? -1 : Math.floor(random() * 4), scale: 1.15 });
    }
    // a stool behind the counter and a tall head stand by the door
    s.cylinder(0.3, 0.3, 0.08, [1.7, 0.95, -0.55], s.material(look.trim, { roughness: 0.6 }), 18);
    s.cylinder(0.035, 0.035, 0.9, [1.7, 0.47, -0.55], chrome, 8);
    s.cylinder(0.26, 0.28, 0.04, [1.7, 0.02, -0.55], chrome, 18);
    s.ring(0.2, 0.014, [1.7, 0.4, -0.55], chrome).rotation.x = Math.PI / 2;
    s.cylinder(0.3, 0.32, 0.05, [LX + 0.75, 0.025, 1.7], chrome, 18);
    s.cylinder(0.025, 0.025, 1.5, [LX + 0.75, 0.75, 1.7], chrome, 8);
    heads.push({ x: LX + 0.75, y: 1.5, z: 1.7, yaw: 0.9 + jitter(0.3), wig: Math.floor(random() * 4), scale: 1.25 });
    {
      const headGeo = new THREE.LatheGeometry([[0.13, 0], [0.13, 0.03], [0.08, 0.08], [0.072, 0.2], [0.115, 0.27], [0.152, 0.4], [0.148, 0.5], [0.105, 0.59], [0.001, 0.625]].map(([x, y]) => new THREE.Vector2(x, y)), 18);
      headGeo.scale(1, 1, 1.12);
      const tones = { foam: ['#f8f7f2'], velvet: ['#1f1d22'], vintage: ['#e8b8a0', '#d9a088', '#f0c8b0'], mixed: ['#f8f7f2', '#1f1d22', '#e8b8a0', '#c9a27c', '#f8f7f2'] }[a.heads];
      const headMesh = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: a.heads === 'vintage' ? 0.35 : 0.9 }), heads.length);
      const wigGeos = [
        // bob: a cap with sides and back, open at the face
        (() => { const g = new THREE.SphereGeometry(0.19, 16, 10, Math.PI / 2 + 0.75, Math.PI * 2 - 1.5, 0, Math.PI * 0.72); g.scale(1, 1.12, 1.15).translate(0, 0.43, -0.01); return g; })(),
        // afro: a soft sphere
        (() => { const g = new THREE.SphereGeometry(0.27, 16, 12); g.scale(1.05, 0.95, 1).translate(0, 0.53, -0.04); return g; })(),
        // long: a curtain down the back and sides
        (() => { const g = new THREE.CylinderGeometry(0.175, 0.2, 0.56, 16, 1, true, Math.PI / 2 + 0.2 - Math.PI / 2, Math.PI * 2 - 1.5); g.rotateY(Math.PI / 2 + 0.75 - 0.2).scale(1, 1, 1.1).translate(0, 0.25, -0.01); return g; })(),
        // beehive: a tall lacquered dome
        (() => { const g = new THREE.SphereGeometry(0.19, 16, 12); g.scale(1, 1.45, 1.05).translate(0, 0.62, -0.05); return g; })(),
      ];
      const caps = new THREE.SphereGeometry(0.168, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(1, 1.05, 1.14).translate(0, 0.45, -0.005);
      const lists: { m: THREE.Matrix4; c: THREE.Color }[][] = [[], [], [], [], []];
      const dummy = new THREE.Object3D();
      heads.forEach((head, i) => {
        dummy.position.set(head.x, head.y, head.z); dummy.rotation.set(0, head.yaw, 0); dummy.scale.setScalar(head.scale); dummy.updateMatrix();
        headMesh.setMatrixAt(i, dummy.matrix);
        headMesh.setColorAt(i, new THREE.Color(pick(tones)));
        if (head.wig < 0) return;
        const colour = wigColour();
        dummy.rotation.set(jitter(mood.wear * 0.12), head.yaw + jitter(mood.wear * 0.3), jitter(mood.wear * 0.15)); dummy.updateMatrix();
        lists[head.wig].push({ m: dummy.matrix.clone(), c: colour });
        if (head.wig === 2 || head.wig === 0) lists[4].push({ m: dummy.matrix.clone(), c: colour });
      });
      headMesh.castShadow = headMesh.receiveShadow = true;
      s.root.add(headMesh);
      [...wigGeos, caps].forEach((geo, k) => {
        if (!lists[k].length) { geo.dispose(); return; }
        const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: k === 1 ? 1 : 0.4, side: THREE.DoubleSide }), lists[k].length);
        lists[k].forEach((item, i) => { mesh.setMatrixAt(i, item.m); mesh.setColorAt(i, item.c); });
        mesh.castShadow = true;
        s.root.add(mesh);
      });
    }

    // ---- buzzing tubes
    const tubes: { material: THREE.MeshStandardMaterial; phase: number; base: number; faulty: boolean }[] = [];
    const tube = (x: number, y: number, z: number, length: number, alongX = true) => {
      const base = closed ? 0.04 : 1.1;
      const material = new THREE.MeshStandardMaterial({ color: closed ? '#b9bcc4' : '#fffbe6', emissive: mood.warmth > 0.6 ? '#fff2c8' : '#f2fbff', emissiveIntensity: base, roughness: 0.4 });
      s.box(alongX ? [length + 0.2, 0.07, 0.26] : [0.26, 0.07, length + 0.2], [x, y + 0.07, z], s.material('#e9e9e4'));
      const lamp = s.cylinder(0.045, 0.045, length, [x, y, z], material, 10);
      lamp.rotation.set(alongX ? 0 : Math.PI / 2, 0, alongX ? Math.PI / 2 : 0); lamp.castShadow = false;
      tubes.push({ material, phase: random() * 100, base, faulty: random() < 0.15 + mood.wear * 0.5 });
      return lamp;
    };
    tube((SX0 + SX1) / 2 - 1.35, 4.12, BZ + 0.3, 2.3); tube((SX0 + SX1) / 2 + 1.35, 4.12, BZ + 0.3, 2.3);
    for (const x of [-1.9, 1.9]) {
      tube(x, 4.25, 0.9, 2.6);
      for (const dx of [-1.1, 1.1]) s.rod([x + dx, 4.35, 0.9], [x + dx, 4.85, 0.9], 0.012, chrome);
    }

    // ---- bunting and price stars for a sale
    if (a.state === 'sale') {
      const flags: { m: THREE.Matrix4; c: THREE.Color }[] = [];
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 26; i++) {
        const t = i / 25, x = -5.6 + t * 11.2, sag = Math.sin(t * Math.PI * 3) ** 2 * 0.25;
        dummy.position.set(x, 4.02 - sag, BZ + 0.75); dummy.rotation.set(0, 0, Math.PI + jitter(0.1)); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
        flags.push({ m: dummy.matrix.clone(), c: new THREE.Color(pick(['#e8202a', '#ffe21f', '#2456e6', '#1f8a3c', '#ff3fa0'])) });
      }
      const mesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.17, 0.36, 3, 1).scale(1, 1, 0.08), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), flags.length);
      flags.forEach((item, i) => { mesh.setMatrixAt(i, item.m); mesh.setColorAt(i, item.c); });
      mesh.castShadow = true; s.root.add(mesh);
    }
    const priceStar = (x: number, y: number, z: number, size: number, text: string, turn = 0) => {
      const shape = new THREE.Shape();
      for (let i = 0; i < 24; i++) { const r = i % 2 ? size * 0.7 : size, t = i / 24 * Math.PI * 2; if (i) shape.lineTo(Math.cos(t) * r, Math.sin(t) * r); else shape.moveTo(r, 0); }
      const star = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false }), s.material('#ffe21f', { emissive: '#ffd000', emissiveIntensity: 0.3 }), [x, y, z]);
      star.rotation.y = turn;
      const label = sign(text, size * 1.15, size * 0.55, [x + Math.sin(turn) * 0.03, y, z + Math.cos(turn) * 0.03], '#c2161f', '#ffe21f');
      label.rotation.set(0, turn, -0.12);
    };
    if (a.state === 'sale' || a.kind === 'bargain') {
      priceStar(-3.0 + jitter(1), 2.5, BZ + 0.3, 0.42, pick(['2 FOR 5', '9.99', 'HALF PRICE']));
      priceStar(2.9, 0.62, 1.82, 0.3, pick(['SALE', '5 EACH', 'DEAL']));
    }

    // ---- the counter: the hero stands on it
    const CX = -0.3, CZ = 0.9, CW = 5.0, CD = 1.7, CH = 1.0;
    s.box([CW, 0.12, CD], [CX, 0.06, CZ], trim);
    s.box([CW - 0.1, CH - 0.5, CD - 0.1], [CX, 0.37, CZ], a.era === 'seventies' ? wood : lower);
    const caseGlass = new THREE.MeshStandardMaterial({ color: '#d8f0ea', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false });
    const front = s.box([CW - 0.14, 0.36, CD - 0.14], [CX, CH - 0.24, CZ], caseGlass); front.castShadow = false;
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) s.box([0.06, 0.4, 0.06], [CX + dx * (CW / 2 - 0.06), CH - 0.25, CZ + dz * (CD / 2 - 0.06)], chrome);
    s.box([CW, 0.06, CD], [CX, CH - 0.03, CZ], a.era === 'seventies' ? wood : s.material(a.era === 'now' ? '#f6f4ef' : '#ece6da', { roughness: 0.35 }));
    s.box([CW + 0.04, 0.03, 0.04], [CX, CH - 0.03, CZ + CD / 2], chrome);
    // small goods inside the case: combs, clips, hair ties in rows
    s.scatter(new THREE.BoxGeometry(0.2, 0.06, 0.12), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), Array.from({ length: Math.round(34 * stock) }, (_unused, i) => ({
      at: [CX - CW / 2 + 0.4 + (i % 17) * 0.26 + jitter(0.03), CH - 0.4, CZ + 0.5 - Math.floor(i / 17) * 0.34] as [number, number, number], size: mix(0.8, 1.15, random()), color: random() < 0.5 ? pick(BRIGHTS) : pick(['#17161a', '#f6f0dc', '#d6a528']),
    })));
    // till end
    const TX = CX + CW / 2 - 0.55, TZ = CZ - 0.1;
    if (a.till === 'register') {
      const iron = s.material(a.era === 'sixties' ? '#8aa89a' : '#5a4a3a', { metalness: 0.5, roughness: 0.4 });
      s.box([0.72, 0.3, 0.7], [TX, CH + 0.15, TZ], iron);
      const slope = s.box([0.7, 0.34, 0.5], [TX, CH + 0.38, TZ + 0.04], iron); slope.rotation.x = -0.5;
      s.box([0.6, 0.26, 0.2], [TX, CH + 0.68, TZ - 0.22], iron);
      sign(pick(['0.00', '9.99', '15.00', 'NO SALE']), 0.5, 0.16, [TX, CH + 0.7, TZ - 0.115], '#17161a', '#f4efdc');
      s.scatter(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10), s.material('#f4efdc', { roughness: 0.4 }), Array.from({ length: 15 }, (_unused, i) => ({
        at: [TX - 0.24 + (i % 5) * 0.12, CH + 0.5 - Math.floor(i / 5) * 0.075, TZ + 0.2 + Math.floor(i / 5) * 0.12] as [number, number, number], size: 1,
      })));
      s.rod([TX + 0.38, CH + 0.3, TZ], [TX + 0.52, CH + 0.5, TZ], 0.02, chrome);
    } else if (a.till === 'tablet') {
      s.cylinder(0.16, 0.18, 0.04, [TX, CH + 0.02, TZ], chrome, 20);
      s.rod([TX, CH + 0.04, TZ], [TX, CH + 0.4, TZ - 0.05], 0.025, chrome);
      const tablet = s.box([0.6, 0.42, 0.03], [TX, CH + 0.5, TZ], s.material('#1b1b1f', { roughness: 0.3 })); tablet.rotation.x = -0.35;
      const screen = s.box([0.54, 0.36, 0.005], [TX, CH + 0.505, TZ + 0.018], new THREE.MeshStandardMaterial({ color: '#cfe6f5', emissive: '#bfe0ff', emissiveIntensity: closed ? 0.05 : 0.6 })); screen.rotation.x = -0.35; screen.castShadow = false;
      s.box([0.16, 0.06, 0.26], [TX - 0.5, CH + 0.03, TZ + 0.3], s.material('#26262b')).rotation.y = 0.3;
    } else {
      s.box([0.55, 0.2, 0.4], [TX, CH + 0.1, TZ], s.material('#3a5a4a', { metalness: 0.5, roughness: 0.4 }));
      s.box([0.2, 0.03, 0.05], [TX, CH + 0.215, TZ], chrome);
      s.box([0.34, 0.03, 0.46], [TX - 0.55, CH + 0.015, TZ + 0.2], s.material('#f4efdc')).rotation.y = 0.2;
      s.tube([[TX - 0.2, CH + 0.02, TZ + 0.5], [TX - 0.35, CH + 0.03, TZ + 0.56], [TX - 0.5, CH + 0.05, TZ + 0.3]], 0.006, chrome);
      s.rod([TX - 0.5, CH + 0.05, TZ + 0.3], [TX - 0.42, CH + 0.05, TZ + 0.12], 0.014, s.material('#1f2f8a'));
    }
    // ---- what kind of shop it is, in the front right corner
    const FX = 4.55, FZ = 3.55;
    if (a.kind === 'beauty') {
      s.box([1.9, 0.12, 0.7], [FX, 0.06, FZ], trim);
      s.box([0.06, 1.7, 0.7], [FX - 0.95, 0.85, FZ], chrome); s.box([0.06, 1.7, 0.7], [FX + 0.95, 0.85, FZ], chrome);
      const bottles: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let shelf = 0; shelf < 3; shelf++) {
        const y = 0.5 + shelf * 0.52;
        s.box([1.9, 0.04, 0.7], [FX, y, FZ], s.material('#f1eee6'));
        for (let i = 0; i < 11; i++) for (const dz of [-0.2, 0.2]) if (random() < stock) bottles.push({ at: [FX - 0.8 + i * 0.16, y + 0.16, FZ + dz], size: mix(0.85, 1.1, random()), color: pick(['#e8a23a', '#2a6a4a', '#d8407a', '#f6f0dc', '#6a3a8a', '#1f6aa8', '#e0c23a']) });
      }
      s.scatter(new THREE.CylinderGeometry(0.045, 0.06, 0.28, 10), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 }), bottles);
      s.scatter(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8).translate(0, 0.17, 0), s.material('#17161a'), bottles.map((bottle) => ({ at: bottle.at, size: bottle.size })));
    } else if (a.kind === 'theatrical') {
      // bulb-lit mirror
      s.box([1.3, 1.7, 0.08], [FX, 1.35, FZ + 0.3], trim).rotation.y = -0.5;
      const glass = s.box([1.05, 1.45, 0.02], [FX - 0.025, 1.35, FZ + 0.255], s.material('#cfe0e6', { metalness: 1, roughness: 0.08 })); glass.rotation.y = -0.5;
      s.box([0.1, 0.5, 0.1], [FX, 0.25, FZ + 0.3], trim); s.box([0.9, 0.06, 0.5], [FX, 0.03, FZ + 0.3], trim).rotation.y = -0.5;
      const bulbs: { at: [number, number, number]; size: number }[] = [];
      const ax = Math.cos(0.5), az = Math.sin(0.5);
      for (let i = 0; i < 6; i++) for (const side of [-1, 1]) bulbs.push({ at: [FX + side * 0.6 * ax - 0.04, 0.72 + i * 0.25, FZ + 0.3 + side * 0.6 * az + 0.04], size: 1 });
      for (let i = 0; i < 5; i++) bulbs.push({ at: [FX + (i - 2) * 0.26 * ax - 0.04, 2.14, FZ + 0.3 + (i - 2) * 0.26 * az + 0.04], size: 1 });
      const bulbMaterial = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffe9a8', emissiveIntensity: closed ? 0.05 : 1.2 });
      const bulbMesh = s.scatter(new THREE.SphereGeometry(0.06, 10, 8), bulbMaterial, bulbs); bulbMesh.castShadow = false;
      // costume trunk with a boa spilling out
      s.box([1.1, 0.5, 0.6], [FX - 0.9, 0.25, FZ - 0.5], s.material('#5a3a2a', { roughness: 0.7 })).rotation.y = 0.3;
      const lid = s.box([1.1, 0.08, 0.6], [FX - 0.98, 0.72, FZ - 0.76], s.material('#4a2f22', { roughness: 0.7 })); lid.rotation.set(-1.1, 0.3, 0);
      const boa = s.material(pick(['#ff3fa0', '#8f3fe0', '#e8202a', '#18c7b5']), { roughness: 1 });
      s.tube([[FX - 1.2, 0.5, FZ - 0.5], [FX - 0.9, 0.62, FZ - 0.35], [FX - 0.6, 0.5, FZ - 0.1], [FX - 0.7, 0.1, FZ + 0.15], [FX - 1.1, 0.08, FZ + 0.3]], 0.09, boa);
    } else if (a.kind === 'medical') {
      const cloth = s.material(a.era === 'seventies' ? '#e6d9b8' : '#dbe8e4', { roughness: 0.95, side: THREE.DoubleSide });
      const angles = [0.5, -0.45, 0.5];
      let x = FX - 1.35, z = FZ + 0.1;
      for (const angle of angles) {
        const nx = x + Math.cos(angle) * 0.85, nz = z + Math.sin(angle) * 0.85;
        const panel = s.box([0.85, 1.55, 0.03], [(x + nx) / 2, 0.95, (z + nz) / 2], cloth); panel.rotation.y = -angle;
        s.rod([x, 0, z], [x, 1.8, z], 0.022, wood); s.rod([nx, 0, nz], [nx, 1.8, nz], 0.022, wood);
        s.rod([x, 1.75, z], [nx, 1.75, nz], 0.018, wood); s.rod([x, 0.16, z], [nx, 0.16, nz], 0.018, wood);
        x = nx; z = nz;
      }
      s.cylinder(0.32, 0.32, 0.04, [FX - 1.5, 0.72, FZ - 0.75], wood, 20); s.cylinder(0.035, 0.035, 0.7, [FX - 1.5, 0.35, FZ - 0.75], wood, 8); s.cylinder(0.22, 0.24, 0.03, [FX - 1.5, 0.015, FZ - 0.75], wood, 16);
      s.box([0.3, 0.14, 0.2], [FX - 1.5, 0.81, FZ - 0.75], s.material('#b8d4e8'));
      s.mesh(new THREE.ConeGeometry(0.07, 0.14, 5, 1, true), s.material('#fbf9f4', { side: THREE.DoubleSide }), [FX - 1.5, 0.93, FZ - 0.75]).rotation.x = Math.PI;
    } else {
      // dump bin of tangled wigs
      const wire = s.material('#c8ccd0', { metalness: 0.8, roughness: 0.3 });
      for (const y of [0.25, 0.6, 0.95]) s.ring(0.75, 0.02, [FX - 0.4, y, FZ - 0.1], wire).rotation.x = Math.PI / 2;
      for (let i = 0; i < 14; i++) { const t = i / 14 * Math.PI * 2; s.rod([FX - 0.4 + Math.cos(t) * 0.75, 0, FZ - 0.1 + Math.sin(t) * 0.75], [FX - 0.4 + Math.cos(t) * 0.75, 0.95, FZ - 0.1 + Math.sin(t) * 0.75], 0.012, wire); }
      const tangle = Array.from({ length: Math.round(26 * Math.max(stock, 0.4)) }, () => {
        const t = random() * 6.3, r = random() * 0.55;
        return { at: [FX - 0.4 + Math.cos(t) * r, 0.55 + random() * 0.55 - r * 0.3, FZ - 0.1 + Math.sin(t) * r] as [number, number, number], size: mix(0.7, 1.2, random()), color: wigColour() };
      });
      s.scatter(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), tangle);
      s.rod([FX + 0.25, 0, FZ + 0.55], [FX + 0.25, 1.9, FZ + 0.55], 0.025, wire);
      priceStar(FX + 0.25, 2.0, FZ + 0.55, 0.36, 'ANY 5', 0.4);
    }

    // ---- packed boxes when closing down
    if (a.state === 'closing') {
      const cardboard = s.material('#b8905a', { roughness: 0.95 });
      const tape = s.material('#d9c79a', { roughness: 0.7 });
      const stacks: [number, number, number][] = [[5.1, -3.3, 3], [4.2, -3.9, 2], [-5.0, -3.6, 2], [5.2, -2.2, 1]];
      for (const [x, z, n] of stacks) for (let i = 0; i < n; i++) {
        const size = mix(0.62, 0.8, random()), turn = jitter(0.25);
        s.box([size, 0.55, size * 0.8], [x + jitter(0.05), 0.275 + i * 0.55, z], cardboard).rotation.y = turn;
        s.box([size + 0.01, 0.56, 0.09], [x, 0.275 + i * 0.55, z], tape).rotation.y = turn;
      }
      // a loose head rolled onto the floor
      const stray = s.mesh(new THREE.SphereGeometry(0.16, 14, 10).scale(1, 1.25, 1.1), s.material('#f8f7f2', { roughness: 0.9 }), [4.0, 0.17, -2.9]);
      stray.rotation.set(1.3, 0.6, 0.4);
    }

    // ---- placement: the hero on the counter, the rest on the floor
    const spots = [
      { x: CX - 0.45, y: CH, z: CZ, h: 2.0, r: 0.82 },
      { x: -3.9, y: 0, z: 3.1, h: 2.3, r: 1.05 },
      { x: 3.9, y: 0, z: -1.9, h: 2.2, r: 1.05 },
      { x: -3.8, y: 0, z: -1.7, h: 2.1, r: 1.0 },
    ];
    const camera = world.camera as THREE.OrthographicCamera;
    const key = world.keyLight!;
    const yaw = yawDeg * Math.PI / 180, pitch = pitchDeg * Math.PI / 180;
    world.capacity = spots.length;
    world.place = (items: readonly Placeable[]) => {
      const boxes: THREE.Box3[] = [];
      const setBounds = visibleBounds(s.root);
      items.forEach((item, index) => {
        const spot = spots[index % spots.length];
        const scale = Math.min(spot.h / Math.max(item.height, 0.05), spot.r / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(spot.x, spot.y, spot.z);
        item.holder.rotation.y = yaw * 0.5 + (context.random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
        boxes.push(visibleBounds(item.holder));
      });
      const bounds = boxes.reduce((sum, box) => sum.union(box), setBounds.clone());
      const centre = bounds.getCenter(new THREE.Vector3());
      const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      camera.position.copy(centre).addScaledVector(direction, 80);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const projection = new THREE.Box2();
      const outline: [number, number, number][] = [[-W / 2 - 0.3, -0.24, D / 2], [W / 2, -0.24, D / 2], [W / 2, -0.24, -D / 2], [W / 2, 0, -D / 2 - 0.3], [-W / 2 - 0.3, WH, D / 2], [-W / 2 - 0.3, WH, -D / 2 - 0.3], [W / 2, WH, -D / 2 - 0.3], [3.2, 4.9, 0.9]];
      for (const point of outline) {
        const p = new THREE.Vector3(...point).applyMatrix4(camera.matrixWorldInverse);
        projection.expandByPoint(new THREE.Vector2(p.x, p.y));
      }
      for (const box of boxes)
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
          const p = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
          projection.expandByPoint(new THREE.Vector2(p.x, p.y));
        }
      const middle = projection.getCenter(new THREE.Vector2());
      const size = projection.getSize(new THREE.Vector2());
      const extent = Math.max(size.x, size.y) * 0.52;
      camera.translateX(middle.x); camera.translateY(middle.y);
      camera.left = camera.bottom = -extent; camera.right = camera.top = extent;
      camera.updateProjectionMatrix();
      const span = bounds.getSize(new THREE.Vector3()).length();
      // light comes in through the shop front on the left, lower and warmer late in the day
      key.target.position.copy(centre);
      key.position.copy(centre).add(new THREE.Vector3(-9, mix(11, 6, Math.abs(day - 0.4) * 1.6), mix(9, 3, day)).normalize().multiplyScalar(span * 1.5));
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -span * 0.6; shadow.right = shadow.top = span * 0.6;
      shadow.near = 0.1; shadow.far = span * 4;
      shadow.updateProjectionMatrix();
    };

    // ---- the tubes buzz
    const buzz = mix(0.2, 1, mood.energy);
    world.update = (_dt: number, time: number) => {
      for (const item of tubes) {
        const hum = 1 + Math.sin(time * 47 + item.phase) * 0.04 * buzz;
        const gap = item.faulty && Math.sin(time * 3.1 + item.phase) * Math.sin(time * 7.7 + item.phase * 2) > 0.55 ? 0.25 : 1;
        item.material.emissiveIntensity = item.base * hum * gap;
      }
    };
    return world;
  },
});
