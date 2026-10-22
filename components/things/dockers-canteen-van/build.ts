import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { halo, lamp, paint, shade, skin, weather, write } from './paint';

type P3 = [number, number, number];
const LIVERY = {
  cream: ['#ece2c6', '#b3282a'], white: ['#eeeeea', '#2a5c9c'], sky: ['#8ec3de', '#f4f1e6'],
  green: ['#27513c', '#d9b24a'], mustard: ['#d9a520', '#5a3520'], silver: ['#b9bfc2', '#b3282a'],
} as const;
const MENUS = {
  tea: ['TEA  80p', 'BACON ROLL  2.50', 'EGG ROLL  2.20', 'BOVRIL  1.00', 'PIE + PEAS  3.50'],
  noodles: ['NOODLE SOUP  30', 'DUMPLINGS x6  25', 'TEA EGG  5', 'CONGEE  18', 'SOY MILK  8'],
  coffee: ['CAFE  1.20', 'CORTADO  1.40', 'TOSTADA  2.00', 'BOCADILLO  3.50', 'CHURROS  2.50'],
  chips: ['CHIPS  2.00', 'FISH SUPPER  6.50', 'SAUSAGE  2.80', 'PICKLED EGG  60p', 'MUSHY PEAS  1.00'],
  curry: ['CURRY + RICE  5', 'ROTI  1', 'DAL  3', 'SAMOSA x2  2', 'CHAI  1'],
  soup: ['BORSCHT  3', 'PIEROGI  4', 'KIELBASA  3.5', 'BREAD  0.5', 'TEA  1'],
} as const;

export default defineThing({
  questions: {
    style: choice('What kind of vehicle is it?', {
      box: 'A boxy converted delivery van with a short bonnet, the standard burger van.',
      htype: 'A vintage corrugated flat-nosed van with ribbed sides.',
      trailer: 'A towed catering trailer with no cab, standing on its drawbar and jockey wheel.',
      threewheel: 'A tiny three-wheeled micro truck with a box on the back, barely big enough for one cook.',
    }),
    sells: choice('What does it sell?', {
      tea: 'Strong tea from an urn and bacon rolls.',
      noodles: 'Noodle soup and dumplings from stacked bamboo steamers.',
      coffee: 'Small strong coffees and toasted sandwiches.',
      chips: 'Fish and chips, fried to order.',
      curry: 'Curry and rice ladled from big pots.',
      soup: 'Soup and dumplings from a steaming stockpot.',
    }),
    sign: choice('What does the sign above the hatch say?', {
      teasup: "TEA'S UP", dots: "DOT'S CAFE", owl: 'NIGHT OWL', hot: 'HOT FOOD', quay: 'QUAYSIDE CANTEEN', always: 'OPEN 24 HRS', none: 'There is no sign at all.',
    }),
    state: choice('Is it open?', {
      serving: 'Open and busy: hatch up, lights on, somebody serving.',
      quiet: 'Open but dead quiet, the server leaning on the counter waiting.',
      closing: 'Closing up: hatch half lowered, lights still on inside.',
      shuttered: 'Shuttered and padlocked, dark.',
    }),
    queue: score('If it is open, how long is the queue?', ['Nobody', 'One customer', 'Three or four waiting', 'A line of six or more']),
    livery: choice('What colour is it painted?', {
      cream: 'Cream with red lettering.',
      white: 'White with blue trim.',
      sky: 'Sky blue and white, like an ice-cream van.',
      green: 'Dark green with gold lining.',
      mustard: 'Mustard yellow and brown.',
      silver: 'Bare ribbed aluminium with a red stripe.',
    }),
    around: choice('What stands around it?', {
      nothing: 'Nothing.',
      table: 'A plastic table and a couple of stacking chairs.',
      gas: 'A row of gas bottles and a humming generator.',
      bin: 'An overflowing bin and a drift of paper cups.',
      board: 'A chalkboard A-frame with the special of the night.',
      lights: 'Strings of coloured bulbs run from the roof to a pole.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dusk = Math.min(1, Math.abs(mood.daylight - 0.5) * 2);
    const [base, accent] = LIVERY[a.livery];
    const open = a.state !== 'shuttered';
    const lit = open;
    const warm = new THREE.Color('#fff3d6').lerp(new THREE.Color('#ffb04a'), mood.warmth);
    const dims = { box: [3.3, 2.0, 2.1, 0.36], htype: [4.3, 1.95, 2.1, 0.36], trailer: [3.6, 2.0, 2.05, 0.3], threewheel: [2.1, 1.45, 1.6, 0.23] }[a.style];
    const [BL, BW, BH, WR] = dims;
    const FY = WR * 1.5, T = 0.05;
    const OW = Math.min(2.2, BL - 0.8), hx = a.style === 'htype' ? -0.6 : 0;
    const CY = FY + 0.85, TY = FY + BH - 0.2, OH = TY - CY;
    const ink = a.livery === 'green' || a.livery === 'mustard' ? accent : accent;
    const dark = s.material('#1f2224');
    const steel = s.material('#b6bcbf', { metalness: 0.8, roughness: 0.25 });
    const rubber = s.material('#18181a', { roughness: 0.95 });

    const bodyTex = (w: number) => paint(w, 256, (ctx, cw, ch) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, cw, ch);
      if (a.style === 'htype' || a.livery === 'silver') { for (let y = 0; y < ch; y += 14) { ctx.fillStyle = shade(base, -0.16); ctx.fillRect(0, y, cw, 4); ctx.fillStyle = shade(base, 0.12); ctx.fillRect(0, y + 7, cw, 3); } }
      ctx.fillStyle = accent; ctx.fillRect(0, ch * 0.8, cw, ch * 0.07);
      weather(ctx, cw, ch, random, mood.wear);
    });
    const body = skin(bodyTex(512), { roughness: 0.5, metalness: a.livery === 'silver' ? 0.5 : 0.1 });
    const flat = s.material(base, { roughness: 0.5 });
    const trim = s.material(accent);

    // Shell, built as panels so the hatch is a real opening.
    const y0 = FY + BH / 2;
    s.box([BL, BH, T], [0, y0, -BW / 2], body);
    for (const x of [-BL / 2, BL / 2]) s.box([T, BH, BW], [x, y0, 0], body);
    s.box([BL, 0.08, BW], [0, FY, 0], dark);
    const roofArc = new THREE.CylinderGeometry(BW / 2 + 0.05, BW / 2 + 0.05, BL + 0.12, 20, 1, false, 0, Math.PI).rotateZ(Math.PI / 2);
    const roof = s.mesh(roofArc, s.material(shade(base, 0.1)), [0, FY + BH, 0]);
    roof.scale.y = 0.22;
    if (open) {
      s.box([BL, 0.85, T], [0, FY + 0.425, BW / 2], body);
      s.box([BL, 0.2, T], [0, FY + BH - 0.1, BW / 2], flat);
      const leftW = hx - OW / 2 + BL / 2, rightW = BL / 2 - (hx + OW / 2);
      s.box([leftW, OH, T], [-BL / 2 + leftW / 2, CY + OH / 2, BW / 2], flat);
      s.box([rightW, OH, T], [BL / 2 - rightW / 2, CY + OH / 2, BW / 2], flat);
    } else s.box([BL, BH, T], [0, y0, BW / 2], body);

    // Hatch flap, hinged along its top edge.
    const flap = new THREE.Group();
    flap.position.set(hx, TY, BW / 2 + 0.04);
    const flapTex = paint(256, 128, (ctx, w, h) => { ctx.fillStyle = base; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = shade(base, -0.3); ctx.lineWidth = 5; ctx.strokeRect(4, 4, w - 8, h - 8); for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * w / 4, 4); ctx.lineTo(i * w / 4, h - 4); ctx.stroke(); } weather(ctx, w, h, random, mood.wear); });
    const flapMesh = new THREE.Mesh(new THREE.BoxGeometry(OW + 0.06, OH + 0.04, 0.04), skin(flapTex));
    flapMesh.position.y = -(OH + 0.04) / 2; flapMesh.castShadow = flapMesh.receiveShadow = true;
    flap.add(flapMesh);
    const angle = { serving: 1.72, quiet: 1.72, closing: 0.75, shuttered: 0 }[a.state];
    flap.rotation.x = -angle;
    s.root.add(flap);
    if (open) for (const side of [-1, 1]) s.rod([hx + side * (OW / 2 - 0.05), CY + OH * 0.45, BW / 2 + 0.03], [hx + side * (OW / 2 - 0.05), TY - Math.cos(angle) * OH * 0.6, BW / 2 + 0.04 + Math.sin(angle) * OH * 0.6], 0.015, steel);
    else { s.box([0.09, 0.12, 0.04], [hx, CY + 0.06, BW / 2 + 0.08], s.material('#c9a23a', { metalness: 0.7 })); s.ring(0.04, 0.01, [hx, CY + 0.15, BW / 2 + 0.08], steel); }

    // Inside: a painted, glowing back wall, a strip light, worktop and the server.
    const glowLevel = lit ? mix(0.45, 1.05, dusk) : 0;
    let steamAt: P3[] = [];
    if (open) {
      const wall = paint(512, 256, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fff0c4'); g.addColorStop(1, '#e9a44e'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#7a4a26'; for (const y of [0.3, 0.52]) ctx.fillRect(w * 0.05, h * y, w * 0.9, 6);
        for (let i = 0; i < 26; i++) { const row = i % 2, x = w * 0.07 + random() * w * 0.84, hh = 16 + random() * 22; ctx.fillStyle = ['#c8322a', '#e9e2cf', '#2f6f4a', '#d9a520', '#3a5c9c', '#5a3520'][Math.floor(random() * 6)]; ctx.fillRect(x, h * (row ? 0.52 : 0.3) - hh, 12 + random() * 12, hh); }
        ctx.fillStyle = '#f7f3e6'; ctx.fillRect(w * 0.76, h * 0.58, w * 0.14, h * 0.26); ctx.fillStyle = '#b3282a'; ctx.fillRect(w * 0.76, h * 0.58, w * 0.14, h * 0.07);
        ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(w * 0.14, h * 0.7, 20, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(w * 0.14, h * 0.7); ctx.lineTo(w * 0.14 + 9, h * 0.7 - 11); ctx.stroke();
      });
      const back = s.mesh(new THREE.PlaneGeometry(BL - 0.1, BH - 0.1), new THREE.MeshStandardMaterial({ map: wall, emissiveMap: wall, emissive: '#ffffff', emissiveIntensity: glowLevel, roughness: 0.8 }), [0, y0, -BW / 2 + 0.04]);
      back.castShadow = false;
      s.box([OW * 0.8, 0.04, 0.1], [hx, TY - 0.02, BW / 2 - 0.25], lamp(warm, glowLevel * 2.2));
      s.box([OW + 0.24, 0.05, 0.5], [hx, CY, BW / 2 + 0.08], steel);
      s.box([BL - 0.15, 0.05, 0.55], [0, CY - 0.05, -BW / 2 + 0.35], steel);
      s.box([BL - 0.15, CY - FY - 0.05, 0.5], [0, (CY + FY) / 2 - 0.05, -BW / 2 + 0.33], s.material('#8f979a', { metalness: 0.5 }));
    }

    const person = (at: P3, coat: string, hat: string | null, turn = 0, extra?: (g: THREE.Group) => void) => {
      const g = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at2: P3) => { const m = new THREE.Mesh(geometry, material); m.position.set(...at2); m.castShadow = true; g.add(m); return m; };
      for (const x of [-0.1, 0.1]) add(new THREE.CylinderGeometry(0.08, 0.07, 0.85, 8), s.material('#262a30'), [x, 0.42, 0]);
      add(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), s.material(coat), [0, 1.15, 0]);
      if (coat === '#f2e21c' || coat === '#ff7a1a') { add(new THREE.CylinderGeometry(0.205, 0.205, 0.06, 10), s.material('#d9dcdc'), [0, 1.08, 0]); add(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 10), s.material('#d9dcdc'), [0, 1.26, 0]); }
      add(new THREE.SphereGeometry(0.12, 12, 8), s.material(['#c99a7a', '#8a5a3c', '#e2b89a', '#6a4630'][Math.floor(random() * 4)]), [0, 1.68, 0]);
      if (hat) add(new THREE.SphereGeometry(0.135, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), s.material(hat), [0, 1.7, 0]);
      extra?.(g);
      g.position.set(...at); g.rotation.y = turn;
      s.root.add(g);
      return g;
    };
    const cup = (g: THREE.Group, x: number) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.09, 10), s.material('#f1f0ea')); m.position.set(x, 1.18, 0.24); g.add(m); const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), (g.children[2] as THREE.Mesh).material); arm.position.set(x, 1.16, 0.12); arm.rotation.x = Math.PI / 2; g.add(arm); };

    if (open) {
      // The server, apron on.
      const lean = a.state === 'quiet';
      const serverX = hx + (a.style === 'threewheel' ? 0 : 0.35);
      const server = person([serverX, FY + 0.04, lean ? BW / 2 - 0.32 : -0.05], ['#f1f0ea', '#3a5c9c', '#b3282a'][Math.floor(random() * 3)], random() < 0.5 ? '#f1f0ea' : null, a.state === 'closing' ? Math.PI * 0.8 : 0, (g) => {
        const apron = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.02), s.material('#f4f1e6')); apron.position.set(0, 1.0, 0.2); g.add(apron);
      });
      if (lean) server.rotation.x = 0.16;
      // Counter furniture by what it sells.
      const cz = BW / 2 + 0.1, cy = CY + 0.025, left = hx - OW / 2 + 0.3;
      if (a.sells === 'tea' || a.sells === 'coffee' && false) {
        s.cylinder(0.17, 0.17, 0.5, [left, cy + 0.3, cz - 0.08], steel, 20);
        s.cylinder(0.18, 0.18, 0.05, [left, cy + 0.03, cz - 0.08], dark, 20);
        s.cylinder(0.06, 0.16, 0.08, [left, cy + 0.59, cz - 0.08], dark, 16);
        s.rod([left, cy + 0.15, cz + 0.08], [left, cy + 0.13, cz + 0.17], 0.018, s.material('#c9a23a', { metalness: 0.7 }));
        s.box([0.03, 0.03, 0.03], [left - 0.08, cy + 0.12, cz + 0.085], lamp('#ff5a2a', lit ? 2 : 0));
        steamAt.push([left, cy + 0.7, cz - 0.08]);
        for (let i = 0; i < 4; i++) s.cylinder(0.045, 0.04, 0.09, [left + 0.34 + (i % 2) * 0.11, cy + 0.045 + Math.floor(i / 2) * 0.09, cz + 0.05], s.material('#f4f1e6'), 12);
        s.box([0.4, 0.03, 0.26], [hx + OW / 2 - 0.35, cy + 0.015, cz - 0.02], steel);
        for (let i = 0; i < 5; i++) s.ball([0.07, 0.045, 0.07], [hx + OW / 2 - 0.5 + (i % 3) * 0.14, cy + 0.07, cz - 0.08 + Math.floor(i / 3) * 0.13], s.material('#d9a85a'), 10);
      } else if (a.sells === 'noodles' || a.sells === 'soup') {
        const bamboo = s.material('#c9a46a', { roughness: 0.9 });
        const tiers = a.sells === 'noodles' ? 3 + Math.floor(random() * 3) : 0;
        for (let i = 0; i < tiers; i++) { s.cylinder(0.2, 0.2, 0.1, [left, cy + 0.05 + i * 0.105, cz - 0.06], bamboo, 18); s.cylinder(0.205, 0.205, 0.02, [left, cy + 0.1 + i * 0.105, cz - 0.06], s.material('#8a6a3c'), 18); }
        if (a.sells === 'soup') { s.cylinder(0.22, 0.2, 0.36, [left, cy + 0.18, cz - 0.08], steel, 20); s.cylinder(0.2, 0.2, 0.01, [left, cy + 0.35, cz - 0.08], s.material(a.sells === 'soup' ? '#9a2a3a' : '#c9a46a', { roughness: 0.3 }), 20); s.rod([left + 0.1, cy + 0.34, cz - 0.08], [left + 0.32, cy + 0.6, cz - 0.02], 0.012, steel); }
        steamAt.push([left, cy + 0.2 + tiers * 0.105 + 0.25, cz - 0.06]);
        for (let i = 0; i < 4; i++) s.cylinder(0.09, 0.05, 0.06, [left + 0.42 + (i % 2) * 0.2, cy + 0.03 + Math.floor(i / 2) * 0.04, cz + 0.06], s.material(i % 2 ? '#f4f1e6' : '#3a5c9c'), 12);
        for (let i = 0; i < 3; i++) s.cylinder(0.025, 0.025, 0.16, [hx + OW / 2 - 0.25 - i * 0.08, cy + 0.08, cz], s.material(['#5a2a14', '#c8322a', '#2f2f2f'][i]), 8);
      } else if (a.sells === 'coffee') {
        s.box([0.5, 0.36, 0.3], [left + 0.1, cy + 0.18, cz - 0.1], steel);
        s.box([0.52, 0.05, 0.32], [left + 0.1, cy + 0.385, cz - 0.1], s.material(accent));
        for (const dx of [-0.08, 0.14]) s.cylinder(0.03, 0.02, 0.07, [left + 0.1 + dx, cy + 0.17, cz + 0.07], dark, 8);
        for (let i = 0; i < 5; i++) s.cylinder(0.035, 0.028, 0.05, [left - 0.1 + i * 0.09, cy + 0.435, cz - 0.1], s.material('#f4f1e6'), 10);
        steamAt.push([left + 0.1, cy + 0.5, cz - 0.1]);
        s.cylinder(0.2, 0.2, 0.02, [hx + OW / 2 - 0.35, cy + 0.01, cz], s.material('#f4f1e6'), 18);
        s.mesh(new THREE.SphereGeometry(0.19, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, depthWrite: false }), [hx + OW / 2 - 0.35, cy + 0.02, cz]);
        for (let i = 0; i < 4; i++) s.ball([0.06, 0.035, 0.045], [hx + OW / 2 - 0.42 + (i % 2) * 0.13, cy + 0.05, cz - 0.05 + Math.floor(i / 2) * 0.1], s.material('#c98f3a'), 8);
      } else if (a.sells === 'chips') {
        s.box([0.55, 0.3, 0.34], [left + 0.12, cy + 0.15, cz - 0.1], steel);
        s.box([0.2, 0.02, 0.26], [left, cy + 0.305, cz - 0.1], s.material('#c98f2a', { roughness: 0.15 }));
        s.box([0.2, 0.02, 0.26], [left + 0.25, cy + 0.305, cz - 0.1], s.material('#c98f2a', { roughness: 0.15 }));
        s.rod([left + 0.25, cy + 0.32, cz - 0.1], [left + 0.5, cy + 0.5, cz + 0.1], 0.012, dark);
        steamAt.push([left + 0.12, cy + 0.45, cz - 0.1]);
        for (let i = 0; i < 3; i++) { const cone = s.mesh(new THREE.ConeGeometry(0.07, 0.2, 10), s.material('#f1ede0'), [hx + OW / 2 - 0.2 - i * 0.18, cy + 0.1, cz + 0.03]); cone.rotation.x = Math.PI; s.ball([0.065, 0.04, 0.065], [hx + OW / 2 - 0.2 - i * 0.18, cy + 0.21, cz + 0.03], s.material('#e2b23a'), 8); }
        s.cylinder(0.03, 0.035, 0.18, [hx + 0.1, cy + 0.09, cz + 0.1], s.material('#6a3a1c', { roughness: 0.2 }), 8);
      } else {
        for (let i = 0; i < 2; i++) { s.cylinder(0.2, 0.2, 0.26, [left + i * 0.46, cy + 0.13, cz - 0.08], steel, 20); s.cylinder(0.185, 0.185, 0.01, [left + i * 0.46, cy + 0.255, cz - 0.08], s.material(i ? '#f1ede0' : '#c8781c', { roughness: 0.4 }), 20); steamAt.push([left + i * 0.46, cy + 0.4, cz - 0.08]); }
        s.rod([left + 0.08, cy + 0.25, cz - 0.08], [left + 0.26, cy + 0.52, cz], 0.012, steel);
        for (let i = 0; i < 5; i++) s.cylinder(0.11, 0.11, 0.012, [hx + OW / 2 - 0.3, cy + 0.006 + i * 0.013, cz + 0.02], s.material('#b9bfc2', { metalness: 0.7 }), 16);
      }
      if (mood.density > 0.5) { for (let i = 0; i < 2; i++) s.cylinder(0.028, 0.032, 0.17, [hx + 0.25 + i * 0.09, cy + 0.085, cz + 0.16], s.material(i ? '#e2b420' : '#c8322a'), 8); s.box([0.14, 0.1, 0.1], [hx - 0.1, cy + 0.05, cz + 0.14], s.material('#e9e2cf')); }
    }

    // Sign above the hatch.
    const words = { teasup: "TEA'S UP", dots: "DOT'S CAFE", owl: 'NIGHT OWL', hot: 'HOT FOOD', quay: 'QUAYSIDE CANTEEN', always: 'OPEN 24 HRS', none: '' }[a.sign];
    if (words) {
      const signTex = paint(512, 110, (ctx, w, h) => {
        ctx.fillStyle = a.livery === 'green' || a.livery === 'mustard' ? shade(base, -0.25) : '#fbf5e2'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = accent; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
        write(ctx, words, w / 2, h / 2 + 4, 66, ink, a.sign === 'dots' || a.sign === 'teasup' ? 'italic bold SIZEpx serif' : 'bold SIZEpx sans-serif', w * 0.88);
        weather(ctx, w, h, random, mood.wear * 0.7);
      });
      const SW = Math.min(BL - 0.2, OW + 0.5);
      s.box([SW + 0.08, 0.5, 0.06], [hx, FY + BH + 0.33, BW / 2 - 0.02], trim);
      s.mesh(new THREE.PlaneGeometry(SW, 0.42), new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: '#ffffff', emissiveIntensity: lit ? mix(0.25, 0.85, dusk) : 0, roughness: 0.6 }), [hx, FY + BH + 0.33, BW / 2 + 0.012]).castShadow = false;
    }
    // Handwritten menu on the panel under the counter.
    const menu = paint(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#23302a'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 12; ctx.strokeRect(0, 0, w, h);
      ctx.save(); ctx.translate(w / 2, 34); ctx.rotate(-0.03); write(ctx, a.state === 'shuttered' ? 'CLOSED' : 'MENU', 0, 0, 34, '#f7e36a', 'bold SIZEpx cursive'); ctx.restore();
      MENUS[a.sells].forEach((line, i) => { ctx.save(); ctx.translate(w / 2, 78 + i * 37); ctx.rotate((random() - 0.5) * 0.05); write(ctx, line, 0, 0, 23, i === 1 ? '#f7b8c8' : '#f4f1e6', 'SIZEpx cursive', w - 36); ctx.restore(); });
    });
    const menuW = Math.min(0.78, BL * 0.26);
    const board = s.mesh(new THREE.PlaneGeometry(menuW, menuW), skin(menu, { roughness: 0.9 }), [hx - OW / 2 + menuW / 2 + 0.05, FY + 0.43, BW / 2 + 0.03]);
    board.rotation.z = (random() - 0.5) * 0.08; board.castShadow = false;

    // Running gear and cab.
    const wheel = (x: number, z: number, r = WR) => { s.cylinder(r, r, 0.2, [x, r, z], rubber, 18).rotation.x = Math.PI / 2; s.cylinder(r * 0.5, r * 0.5, 0.22, [x, r, z], s.material('#c9cdd0', { metalness: 0.5 }), 12).rotation.x = Math.PI / 2; };
    const glass = new THREE.MeshStandardMaterial({ color: '#33434e', roughness: 0.15, metalness: 0.3 });
    const headlamp = (x: number, z: number, y: number) => s.cylinder(0.09, 0.09, 0.04, [x, y, z], lamp('#fff6d8', 0.35), 12).rotation.z = Math.PI / 2;
    if (a.style === 'box') {
      const fx = BL / 2;
      s.box([0.95, 1.5, BW - 0.06], [fx + 0.47, FY + 0.75, 0], body);
      s.box([0.75, 0.72, BW - 0.14], [fx + 1.3, FY + 0.32, 0], flat);
      const screen = s.box([0.04, 0.7, BW - 0.3], [fx + 0.97, FY + 1.1, 0], glass); screen.rotation.z = -0.22;
      for (const z of [-1, 1]) { s.box([0.6, 0.5, 0.02], [fx + 0.5, FY + 1.1, z * (BW / 2 - 0.02)], glass); headlamp(fx + 1.69, z * 0.65, FY + 0.4); wheel(fx + 0.9, z * (BW / 2 - 0.12)); wheel(-BL / 2 + 0.75, z * (BW / 2 - 0.12)); }
      s.box([0.1, 0.16, BW], [fx + 1.72, FY - 0.05, 0], dark);
      s.box([0.03, 0.3, 0.9], [fx + 1.68, FY + 0.3, 0], dark);
    } else if (a.style === 'htype') {
      const fx = BL / 2;
      s.box([0.02, 0.6, BW - 0.3], [fx + 0.03, FY + 1.45, 0], glass);
      s.box([0.4, 0.8, 1.3], [fx + 0.2, FY + 0.45, 0], body);
      s.box([0.03, 0.5, 0.9], [fx + 0.41, FY + 0.5, 0], dark);
      for (const z of [-1, 1]) { s.box([0.6, 0.5, 0.02], [fx - 0.5, FY + 1.45, z * (BW / 2 + 0.03)], glass); headlamp(fx + 0.06, z * 0.82, FY + 0.6); wheel(fx - 0.6, z * (BW / 2 - 0.1)); wheel(-BL / 2 + 0.9, z * (BW / 2 - 0.1)); }
      s.box([0.1, 0.14, BW + 0.05], [fx + 0.42, FY - 0.08, 0], steel);
    } else if (a.style === 'trailer') {
      for (const z of [-1, 1]) { wheel(-0.2, z * (BW / 2 - 0.06)); s.rod([BL / 2, FY - 0.05, z * 0.6], [BL / 2 + 1.3, FY - 0.1, 0], 0.04, dark); for (const x of [-1, 1]) s.rod([x * (BL / 2 - 0.2), FY, z * (BW / 2 - 0.15)], [x * (BL / 2 - 0.2), 0, z * (BW / 2 - 0.15)], 0.03, steel); }
      s.rod([BL / 2 + 1.1, FY, 0], [BL / 2 + 1.1, 0.14, 0], 0.03, steel);
      s.cylinder(0.12, 0.12, 0.06, [BL / 2 + 1.1, 0.12, 0], rubber, 12).rotation.x = Math.PI / 2;
      s.box([0.2, 0.1, 0.12], [BL / 2 + 1.4, FY - 0.08, 0], steel);
      s.cylinder(0.16, 0.16, 0.6, [BL / 2 + 0.35, FY + 0.3, 0.2], s.material('#c8322a'), 14);
      s.cylinder(0.05, 0.08, 0.1, [BL / 2 + 0.35, FY + 0.65, 0.2], dark, 10);
    } else {
      const fx = BL / 2;
      s.box([0.8, 1.15, BW * 0.8], [fx + 0.4, FY + 0.55, 0], body);
      const nose = s.box([0.5, 0.6, BW * 0.7], [fx + 0.9, FY + 0.22, 0], flat); nose.rotation.z = -0.2;
      const screen = s.box([0.03, 0.55, BW * 0.7], [fx + 0.86, FY + 0.82, 0], glass); screen.rotation.z = -0.35;
      headlamp(fx + 1.15, 0, FY + 0.3);
      wheel(fx + 0.8, 0);
      for (const z of [-1, 1]) wheel(-BL / 2 + 0.55, z * (BW / 2 - 0.04));
    }
    // Roof flue.
    const flueX = -BL / 2 + 0.5;
    s.cylinder(0.07, 0.07, 0.5, [flueX, FY + BH + 0.4, -0.3], steel, 10);
    s.cylinder(0.13, 0.05, 0.1, [flueX, FY + BH + 0.7, -0.3], steel, 10);
    if (open) steamAt.push([flueX, FY + BH + 0.9, -0.3]);

    // Warm light spilling out onto the ground and the queue standing in it.
    if (lit) {
      const spill = s.cylinder(1, 1, 0.012, [hx, 0.008, BW / 2 + 1.5], halo(warm, mix(0.1, 0.36, dusk)), 28);
      spill.scale.set(OW * 0.8, 1, 1.5); spill.castShadow = false;
      const shaft = s.box([OW, OH, 0.9], [hx, CY + OH / 2, BW / 2 + 0.5], halo(warm, mix(0.03, 0.1, dusk)));
      shaft.castShadow = false;
    }
    const coats = ['#f2e21c', '#ff7a1a', '#f2e21c', '#2a3340', '#ff7a1a', '#5a6a4a'];
    const hats = ['#f1f0ea', '#f0c21c', null, '#2f5f9c', '#f1f0ea', '#262a30'];
    const queueCount = a.state === 'serving' ? Math.round(a.queue * 6) : a.state === 'quiet' ? 0 : a.state === 'closing' ? Math.min(1, Math.round(a.queue * 2)) : 0;
    for (let i = 0; i < queueCount; i++) {
      const pick = Math.floor(random() * coats.length);
      const curve = Math.max(0, i - 2) * 0.55;
      person([hx + 0.1 + (random() - 0.5) * 0.25 - curve, 0, BW / 2 + 0.75 + Math.min(i, 2.6) * 0.72 + (random() - 0.5) * 0.1], coats[pick], hats[pick], Math.PI + (random() - 0.5) * 0.5 + (i > 2 ? -0.7 : 0), i === 0 ? (g) => cup(g, 0.16) : undefined);
    }
    if (a.state === 'quiet' && a.queue > 0.6) person([hx + OW / 2 + 0.9, 0, BW / 2 + 1.4], '#2a3340', null, -2.4, (g) => cup(g, 0.16));

    // Around it.
    const sideX = hx + OW / 2 + 0.9, frontZ = BW / 2 + 1.0;
    let bulbs: THREE.MeshStandardMaterial[] = [];
    if (a.around === 'table') {
      const plastic = s.material('#f1f0ea', { roughness: 0.4 });
      const tx = Math.max(sideX, BL / 2 - 0.2), tz = frontZ + 0.5;
      s.cylinder(0.45, 0.45, 0.04, [tx, 0.72, tz], plastic, 20); s.cylinder(0.04, 0.04, 0.7, [tx, 0.36, tz], plastic, 8); s.cylinder(0.25, 0.28, 0.03, [tx, 0.015, tz], plastic, 14);
      for (let i = 0; i < 2 + Math.round(mood.density); i++) { const t = i * 2.2 + random(), cx = tx + Math.cos(t) * 0.8, cz2 = tz + Math.sin(t) * 0.8; const seat = s.box([0.4, 0.04, 0.4], [cx, 0.43, cz2], s.material(i ? '#c8322a' : '#2a5c9c')); seat.rotation.y = -t; const backRest = s.box([0.04, 0.4, 0.4], [cx + Math.cos(t) * 0.2, 0.65, cz2 + Math.sin(t) * 0.2], s.material(i ? '#c8322a' : '#2a5c9c')); backRest.rotation.y = -t; for (const [dx, dz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) s.cylinder(0.015, 0.015, 0.43, [cx + dx, 0.215, cz2 + dz], steel, 5); }
      s.cylinder(0.04, 0.035, 0.09, [tx + 0.1, 0.785, tz - 0.1], s.material('#f4f1e6'), 10);
    } else if (a.around === 'gas') {
      const gx = -BL / 2 - 0.45;
      for (let i = 0; i < 3; i++) { const col = s.material(['#c8322a', '#2a5c9c', '#e2671f'][i]); s.cylinder(0.17, 0.17, 0.75, [gx, 0.375, 0.5 - i * 0.42], col, 14); s.ball([0.17, 0.1, 0.17], [gx, 0.75, 0.5 - i * 0.42], col, 12); s.cylinder(0.05, 0.05, 0.12, [gx, 0.88, 0.5 - i * 0.42], steel, 8); }
      s.box([0.7, 0.5, 0.5], [gx - 0.2, 0.3, 1.3], s.material('#e0ae1c')); s.box([0.74, 0.08, 0.54], [gx - 0.2, 0.59, 1.3], dark); for (const x of [-0.25, 0.25]) s.box([0.06, 0.1, 0.5], [gx - 0.2 + x, 0.05, 1.3], dark);
      s.tube([[gx, 0.4, 0.6], [gx + 0.2, 0.1, 0.4], [gx + 0.45, FY, 0.2]], 0.015, s.material('#e2671f'));
    } else if (a.around === 'bin') {
      const bx = -BL / 2 - 0.5, bz = BW / 2 + 0.3;
      s.cylinder(0.3, 0.25, 0.8, [bx, 0.4, bz], s.material('#3f4a44'), 16);
      const litter = Array.from({ length: 16 + Math.round(mood.density * 16) }, (_u, i) => (i < 8 ? { at: [bx + (random() - 0.5) * 0.4, 0.8 + random() * 0.2, bz + (random() - 0.5) * 0.4] as P3, size: 0.8 + random() * 0.6, color: random() < 0.6 ? '#f1ede0' : '#c8322a' } : { at: [bx + (random() - 0.2) * 2.6, 0.04, bz + (random() - 0.3) * 1.8] as P3, size: 0.7 + random() * 0.5, color: random() < 0.7 ? '#f1ede0' : '#d9b24a' }));
      s.scatter(new THREE.CylinderGeometry(0.045, 0.035, 0.09, 8).rotateZ(1.2), new THREE.MeshStandardMaterial({ roughness: 0.8 }), litter);
    } else if (a.around === 'board') {
      const tex = paint(160, 256, (ctx, w, h) => { ctx.fillStyle = '#1e2a25'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#a07a4a'; ctx.lineWidth = 12; ctx.strokeRect(0, 0, w, h); write(ctx, 'TONIGHT', w / 2, 44, 28, '#f7e36a', 'bold SIZEpx cursive', w - 30); const special = MENUS[a.sells][Math.floor(random() * 5)].split('  '); write(ctx, special[0], w / 2, 118, 30, '#f4f1e6', 'SIZEpx cursive', w - 30); write(ctx, special[1], w / 2, 176, 50, '#f7b8c8', 'bold SIZEpx cursive', w - 30); write(ctx, mood.cheer > 0.5 ? '☺' : '~', w / 2, 226, 26, '#f4f1e6', 'SIZEpx cursive'); });
      const bx = hx - OW / 2 - 0.5, bz = BW / 2 + 1.1;
      for (const side of [1, -1]) { const leaf = s.mesh(new THREE.PlaneGeometry(0.6, 0.95), skin(tex, { side: THREE.DoubleSide }), [bx, 0.47, bz + side * 0.17]); leaf.rotation.x = -side * 0.34; leaf.rotation.y = side > 0 ? 0 : Math.PI; }
    } else if (a.around === 'lights') {
      const px = hx + OW / 2 + 1.6, pz = BW / 2 + 2.2, top = FY + BH + 0.1;
      s.cylinder(0.04, 0.05, 2.9, [px, 1.45, pz], steel, 8); s.cylinder(0.25, 0.3, 0.12, [px, 0.06, pz], dark, 12);
      const palette = mood.cheer > 0.5 ? ['#ff4a3a', '#ffd23a', '#3ad27a', '#3a9aff', '#ff7ad2'] : ['#ffd9a0', '#ffc070'];
      const mats = palette.map((c) => lamp(c, lit ? mix(1, 2.6, dusk) : 0.05));
      bulbs = mats;
      for (const [fx, fz] of [[-BL / 2 + 0.2, BW / 2], [BL / 2 - 0.2, BW / 2]] as const) {
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(fx, top, fz), new THREE.Vector3((fx + px) / 2, top - 0.2, (fz + pz) / 2), new THREE.Vector3(px, 2.85, pz));
        s.mesh(new THREE.TubeGeometry(curve, 16, 0.008, 4), dark);
        for (let i = 1; i < 9; i++) { const p = curve.getPoint(i / 9); s.ball([0.05, 0.065, 0.05], [p.x, p.y - 0.07, p.z], mats[i % mats.length], 8).castShadow = false; }
      }
    }

    // Steam, rising.
    const puffs: { mesh: THREE.Mesh; base: P3; phase: number }[] = [];
    const steamMat = halo('#ffffff', 0.28);
    for (const at of steamAt) for (let i = 0; i < 4; i++) { const mesh = s.ball([0.07, 0.07, 0.07], [at[0], at[1] + i * 0.14, at[2]], steamMat, 8); mesh.castShadow = false; puffs.push({ mesh, base: at, phase: i / 4 + random() * 0.1 }); }

    const rate = mix(0.12, 0.5, mood.energy);
    return s.finish({
      footprint: Math.max(BL / 2 + 1, 2.4),
      update: (_dt, time) => {
        for (const puff of puffs) { const t = (time * rate + puff.phase) % 1; puff.mesh.position.set(puff.base[0] + Math.sin(t * 5 + puff.phase * 9) * 0.05, puff.base[1] + t * 0.6, puff.base[2]); puff.mesh.scale.setScalar(0.05 + t * 0.1); }
        bulbs.forEach((m, i) => { m.emissiveIntensity = (lit ? mix(1, 2.6, dusk) : 0.05) * (0.75 + 0.25 * Math.sin(time * 2 + i * 1.7)); });
      },
    });
  },
});
