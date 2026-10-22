import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';
import { Batch, card, painted, pick } from './util';

const HEADERS = {
  loans: 'CASH LOANS',
  checks: 'CHECKS CASHED',
  tickets: 'TICKETS',
  cashier: 'CASHIER',
  pay: 'PAY HERE',
  orders: 'MONEY ORDERS',
} as const;
const NOTICES = {
  refunds: 'NO REFUNDS',
  id: 'PHOTO ID REQUIRED',
  bills: 'NO BILLS OVER $20',
  camera: 'SMILE! YOU ARE ON CAMERA',
  credit: 'NO CREDIT. DON\'T ASK.',
  kind: 'PLEASE BE KIND',
} as const;
const EXTRA = ['EXACT CHANGE', 'NO LOITERING', 'COUNT YOUR MONEY', 'WE CLOSE AT 9', 'NO PUBLIC RESTROOM', 'ONE AT A TIME', 'LOST TICKET FEE $5', 'ATM OUT OF ORDER', 'NO CHECKS', 'ASK FOR RECEIPT'];

function notice(text: string, paper: string, ink: string, random: () => number, hand: boolean) {
  return painted(256, 200, (ctx, w, h) => {
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      if ((line + ' ' + word).trim().length > 9 && line) { lines.push(line); line = word; } else line = (line + ' ' + word).trim();
    }
    if (line) lines.push(line);
    const size = Math.min(60, (h - 30) / lines.length);
    ctx.font = `${hand ? 'italic ' : ''}bold ${size}px ${hand ? 'cursive, ' : ''}sans-serif`;
    lines.forEach((l, i) => {
      ctx.save();
      ctx.translate(w / 2, h / 2 + (i - (lines.length - 1) / 2) * size);
      if (hand) ctx.rotate((random() - 0.5) * 0.06);
      ctx.fillText(l, 0, 0, w - 24);
      ctx.restore();
    });
    if (!hand) { ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.strokeRect(8, 8, w - 16, h - 16); }
  });
}

export default defineThing({
  questions: {
    header: choice('What does the sign above the window say?', {
      loans: 'CASH LOANS, a pawnbroker or payday lender.',
      checks: 'CHECKS CASHED, payday at the corner.',
      tickets: 'TICKETS, a station, a bus depot, a fairground.',
      cashier: 'CASHIER, anonymous and municipal.',
      pay: 'PAY HERE, a liquor store or all-night garage.',
      orders: 'MONEY ORDERS, wages sent home.',
    }),
    signStyle: choice('How is that sign made?', {
      lightbox: 'A backlit plastic lightbox, white with coloured letters.',
      painted: 'Hand-painted on a board, sign-writer\'s letters.',
      led: 'A black panel of glowing red LED letters.',
      stencil: 'Black stencil sprayed straight onto bare metal.',
    }),
    state: choice('What is going on behind the window?', {
      open: 'Lit and attended: lamp on, till out, somebody\'s chair and mug.',
      away: 'Lit but empty, the chair pushed back and a BACK IN 5 MIN card on the glass.',
      closing: 'The steel shutter is halfway down; they are closing up.',
      shuttered: 'Shuttered and padlocked, dark behind the slats.',
    }),
    booth: choice('What is the partition built from?', {
      plywood: 'Painted plywood and trim, institutional and patched.',
      steel: 'Riveted grey steel plate, a strongroom door of a wall.',
      tile: 'Glazed tile with a coloured band, an old station ticket office.',
      wood: 'Dark panelled wood with brass, a bank from another century.',
      block: 'Painted cinder block, a liquor store in a hard neighbourhood.',
    }),
    notices: score('How many notices are taped to the glass?', ['None', 'One stern one', 'A handful', 'Plastered with years of them']),
    rule: choice('If there is a main notice, what is the rule?', {
      refunds: 'NO REFUNDS',
      id: 'PHOTO ID REQUIRED',
      bills: 'NO BILLS OVER $20',
      camera: 'SMILE! YOU ARE ON CAMERA',
      credit: 'NO CREDIT. DON\'T ASK.',
      kind: 'PLEASE BE KIND, in softer handwriting.',
    }),
    tray: choice('What is in the sliding tray right now?', {
      empty: 'Nothing; bare steel polished by ten thousand hands.',
      coins: 'A few coins of change nobody scooped out.',
      bills: 'Folded banknotes and a curl of receipt.',
      ticket: 'A single pink ticket waiting to be taken.',
      ring: 'A ring and a wristwatch, pushed through for appraisal.',
    }),
    camera: noul('Is a security camera mounted above, watching the customer?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = mix(1.35, 1.7, random()), H = 2.4, D = 0.7, T = 0.14;
    const SILL = 1.05, HEAD = 2.02;
    const zf = D / 2 - T / 2; // centre plane of the front wall

    const paint = pick(random, mood.warmth > 0.55 ? ['#c7b182', '#b9643f', '#8c9a5e'] : ['#7f9aa3', '#8da08f', '#b9b6a8']);
    const boothColour = { plywood: paint, steel: '#7d8789', tile: '#e6e1cf', wood: '#5a3622', block: mood.cheer > 0.5 ? '#e0c64a' : '#b7b3a4' }[a.booth];
    const wall = s.material(boothColour, { roughness: a.booth === 'tile' ? 0.25 : 0.7, metalness: a.booth === 'steel' ? 0.4 : 0 });
    const trimColour = { plywood: '#e9e4d2', steel: '#59625f', tile: '#2d5a4a', wood: '#c4a04e', block: '#2a2c30' }[a.booth];
    const trim = s.material(trimColour, { metalness: a.booth === 'wood' || a.booth === 'steel' ? 0.45 : 0.05, roughness: 0.45 });
    const steel = s.material('#c2c6c8', { metalness: 0.55, roughness: 0.3 });
    const dark = s.material('#1a1b1e');
    const lit = a.state === 'open' || a.state === 'away' || a.state === 'closing';
    const lamp = new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.6, 0.8);

    // ---- booth shell ----
    s.box([W, SILL, T], [0, SILL / 2, zf], wall);
    s.box([W, H - HEAD, T], [0, (H + HEAD) / 2, zf], wall);
    for (const x of [-1, 1]) s.box([0.1, HEAD - SILL, T], [x * (W / 2 - 0.05), (SILL + HEAD) / 2, zf], wall);
    for (const x of [-1, 1]) s.box([0.06, H, D - T], [x * (W / 2 - 0.03), H / 2, -T / 2], wall);
    s.box([W, H, 0.05], [0, H / 2, -D / 2 + 0.025], wall);
    s.box([W + 0.06, 0.06, D + 0.06], [0, H + 0.03, 0], a.booth === 'wood' ? s.material('#3a2415') : trim);
    s.box([W + 0.02, 0.1, D + 0.02], [0, 0.05, 0], a.booth === 'steel' ? steel : dark);
    // window frame
    const fz = zf + T / 2;
    for (const x of [-1, 1]) s.box([0.05, HEAD - SILL + 0.06, 0.05], [x * (W / 2 - 0.1), (SILL + HEAD) / 2, fz], trim);
    s.box([W - 0.15, 0.05, 0.05], [0, HEAD + 0.005, fz], trim);

    // lower wall character
    if (a.booth === 'tile' || a.booth === 'block') {
      const tile = a.booth === 'tile';
      const tex = painted(512, 512, (ctx, w, h) => {
        ctx.fillStyle = boothColour;
        ctx.fillRect(0, 0, w, h);
        const rowsN = tile ? 12 : 5, cols = tile ? 6 : 3;
        for (let r = 0; r < rowsN; r++) for (let c = -1; c < cols; c++) {
          const x = (c + (r % 2) * 0.5) * (w / cols), y = r * (h / rowsN);
          const shade = Math.floor(random() * 26 * (0.4 + mood.wear));
          ctx.fillStyle = `rgba(60,50,40,${shade / 255})`;
          ctx.fillRect(x, y, w / cols, h / rowsN);
          ctx.strokeStyle = tile ? '#b9b3a0' : 'rgba(40,40,40,0.55)';
          ctx.lineWidth = tile ? 3 : 6;
          ctx.strokeRect(x, y, w / cols, h / rowsN);
        }
        if (tile) { ctx.fillStyle = trimColour; ctx.fillRect(0, h * (2 / 12), w, h / 12); }
      });
      const face = card(W - 0.004, SILL - 0.1, tex, { roughness: tile ? 0.25 : 0.9 });
      face.position.set(0, 0.1 + (SILL - 0.1) / 2, D / 2 + 0.002);
      s.root.add(face);
    } else if (a.booth === 'wood') {
      const panel = s.material('#6d4329');
      for (const x of [-1, 1]) {
        s.box([W / 2 - 0.14, 0.7, 0.012], [x * W / 4, 0.55, D / 2 + 0.004], panel);
        s.box([W / 2 - 0.24, 0.58, 0.012], [x * W / 4, 0.55, D / 2 + 0.012], wall);
      }
      s.box([W, 0.03, 0.02], [0, 0.98, D / 2 + 0.01], trim);
    } else if (a.booth === 'steel') {
      const rivets = new Batch(new THREE.SphereGeometry(0.011, 6, 4), s.material('#5c6664', { metalness: 0.4 }));
      for (let i = 0; i <= 10; i++) for (const y of [0.18, 0.94, HEAD + 0.07, H - 0.05]) rivets.add([-W / 2 + 0.05 + (i / 10) * (W - 0.1), y, D / 2 + 0.002]);
      for (let j = 0; j < 7; j++) for (const x of [-1, 0, 1]) rivets.add([x * (W / 2 - 0.05), 0.18 + j * 0.127, D / 2 + 0.002]);
      rivets.into(s.root);
      s.box([0.02, SILL - 0.12, 0.008], [0, SILL / 2 + 0.05, D / 2 + 0.002], s.material('#667170'));
    } else {
      s.box([W, 0.26, 0.012], [0, 0.23, D / 2 + 0.004], steel);
      s.box([0.012, SILL - 0.4, 0.006], [W * 0.18, 0.7, D / 2 + 0.002], s.material(new THREE.Color(boothColour).multiplyScalar(0.8)));
      // a patch where something used to be screwed on
      s.box([0.3, 0.2, 0.004], [-W * 0.22, 0.72, D / 2 + 0.002], s.material(new THREE.Color(boothColour).offsetHSL(0, 0, 0.05)));
    }
    const grime = s.material('#3b352c', { transparent: true, opacity: 0.35, depthWrite: false });
    for (let i = 0; i < Math.round(mood.wear * 12); i++)
      s.box([0.04 + random() * 0.14, 0.02 + random() * 0.22, 0.002], [(random() - 0.5) * (W - 0.2), 0.14 + random() * 0.35, D / 2 + 0.01], grime);

    // ---- counter ledge and deal tray ----
    const ledgeZ = D / 2 + 0.07;
    s.box([W - 0.1, 0.05, 0.36], [0, SILL + 0.005, ledgeZ - 0.06], a.booth === 'wood' ? s.material('#3f2616', { roughness: 0.4 }) : steel);
    for (const x of [-1, 1]) {
      const bracket = s.box([0.04, 0.2, 0.22], [x * (W / 2 - 0.28), SILL - 0.11, ledgeZ + 0.0], trim);
      bracket.rotation.x = 0.0;
    }
    const tx = 0, ty = SILL + 0.03;
    const trayMat = s.material('#d2d6d8', { metalness: 0.6, roughness: mix(0.18, 0.4, mood.wear) });
    const trayIn = s.material('#8e9698', { metalness: 0.55, roughness: 0.35 });
    s.box([0.42, 0.012, 0.44], [tx, ty + 0.003, ledgeZ - 0.1], trayMat);
    s.box([0.34, 0.008, 0.36], [tx, ty + 0.008, ledgeZ - 0.1], trayIn);
    for (const x of [-1, 1]) s.box([0.03, 0.03, 0.44], [tx + x * 0.195, ty + 0.018, ledgeZ - 0.1], trayMat);
    s.box([0.42, 0.03, 0.03], [tx, ty + 0.018, ledgeZ + 0.105], trayMat);
    s.box([0.46, 0.07, 0.03], [tx, ty + 0.035, fz - 0.005], dark); // the slot under the glass
    s.box([0.12, 0.022, 0.022], [tx, ty + 0.04, ledgeZ + 0.12], steel); // pull handle
    // palms have polished a paler patch into the ledge
    const worn = s.material('#f0eee6', { transparent: true, opacity: mix(0.08, 0.45, mood.wear), depthWrite: false });
    for (const x of [-1, 1]) {
      const patch = s.cylinder(0.11, 0.11, 0.002, [x * 0.36, SILL + 0.032, ledgeZ + 0.0], worn, 18);
      patch.scale.set(1.3, 1, 0.9);
    }
    const ty2 = ty + 0.014, tz = ledgeZ - 0.02;
    if (a.tray === 'coins') {
      const coins = new Batch(new THREE.CylinderGeometry(1, 1, 1, 12), new THREE.MeshStandardMaterial({ metalness: 0.5, roughness: 0.3, emissive: '#3a3320', emissiveIntensity: 0.5 }));
      for (let i = 0; i < 5 + Math.floor(random() * 5); i++) coins.add([tx + (random() - 0.5) * 0.24, ty2 + 0.003, tz + (random() - 0.5) * 0.16], [0.016 + random() * 0.006, 0.004, 0.016 + random() * 0.006], [0, 0, 0], pick(random, ['#d9b23c', '#cfd3d5', '#cfd3d5', '#b8703f']));
      coins.into(s.root);
    } else if (a.tray === 'bills') {
      for (let i = 0; i < 3; i++) s.box([0.17, 0.004, 0.075], [tx + (random() - 0.5) * 0.06, ty2 + 0.003 + i * 0.004, tz + (random() - 0.5) * 0.05], s.material(i % 2 ? '#8fb08a' : '#7ea17b')).rotation.y = (random() - 0.5) * 0.9;
      const curl = s.box([0.05, 0.002, 0.16], [tx + 0.1, ty2 + 0.02, tz + 0.02], s.material('#f6f3ea'));
      curl.rotation.set(0.2, 0.5, 0.3);
    } else if (a.tray === 'ticket') {
      s.box([0.13, 0.003, 0.065], [tx + 0.02, ty2 + 0.004, tz], s.material('#f2a7c0', { emissive: '#f2a7c0', emissiveIntensity: 0.15 })).rotation.y = 0.35;
    } else if (a.tray === 'ring') {
      const gold = s.material('#e7b93c', { metalness: 0.45, roughness: 0.3, emissive: '#5a4a22', emissiveIntensity: 0.7 });
      s.ring(0.022, 0.006, [tx - 0.07, ty2 + 0.006, tz + 0.02], gold).rotation.x = Math.PI / 2;
      s.box([0.03, 0.008, 0.2], [tx + 0.07, ty2 + 0.004, tz], s.material('#3a2618')).rotation.y = 0.3;
      s.cylinder(0.03, 0.03, 0.014, [tx + 0.07, ty2 + 0.012, tz], gold, 16);
      s.cylinder(0.023, 0.023, 0.016, [tx + 0.07, ty2 + 0.013, tz], s.material('#f6f3e8'), 16);
    }
    // the pen on its chain
    const penAt: [number, number, number] = [W / 2 - 0.3, SILL + 0.04, ledgeZ + 0.02];
    s.rod([penAt[0] - 0.07, penAt[1], penAt[2] + 0.03], [penAt[0] + 0.06, penAt[1], penAt[2] - 0.02], 0.006, s.material('#1f3f9c'));
    s.tube([[penAt[0] + 0.06, penAt[1], penAt[2] - 0.02], [penAt[0] + 0.1, penAt[1] - 0.004, penAt[2] - 0.08], [penAt[0] + 0.05, penAt[1] - 0.004, penAt[2] - 0.13], [penAt[0] + 0.08, SILL + 0.035, fz + 0.03]], 0.003, steel);

    // ---- acrylic ----
    const paneW = W - 0.2, paneH = HEAD - SILL - 0.07, paneY = SILL + 0.07 + paneH / 2;
    const tint = new THREE.Color('#cfeee0').lerp(new THREE.Color('#e6d79a'), mood.wear * 0.7);
    const acrylic = new THREE.MeshPhysicalMaterial({ color: tint, transparent: true, opacity: mix(0.16, 0.3, mood.wear), roughness: 0.08, depthWrite: false });
    s.box([paneW, paneH, 0.045], [0, paneY, fz - 0.03], acrylic);
    const edge = s.material(tint.clone().multiplyScalar(0.8), { emissive: tint, emissiveIntensity: 0.25, roughness: 0.2 });
    s.box([paneW, 0.012, 0.05], [0, SILL + 0.076, fz - 0.03], edge);
    const bolts = new Batch(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 8), steel);
    const nb = 6;
    for (let i = 0; i < nb; i++) for (const y of [paneY - paneH / 2 + 0.035, paneY + paneH / 2 - 0.035]) {
      if (y < paneY && Math.abs(-paneW / 2 + 0.04 + (i / (nb - 1)) * (paneW - 0.08)) < 0.24) continue;
      bolts.add([-paneW / 2 + 0.04 + (i / (nb - 1)) * (paneW - 0.08), y, fz], 1, [Math.PI / 2, 0, 0]);
    }
    for (const x of [-1, 1]) for (let j = 1; j < 4; j++) bolts.add([x * (paneW / 2 - 0.04), paneY - paneH / 2 + 0.035 + (j / 4) * (paneH - 0.07), fz], 1, [Math.PI / 2, 0, 0]);
    bolts.into(s.root);
    // speaker grille
    const gy = SILL + 0.52;
    const grille = painted(128, 128, (ctx, w) => {
      ctx.fillStyle = '#c9cdcf';
      ctx.fillRect(0, 0, w, w);
      ctx.fillStyle = '#121315';
      for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
        const x = 14 + i * 12.5 + (j % 2) * 6, y = 14 + j * 12.5;
        if (Math.hypot(x - 64, y - 64) < 52) { ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 7); ctx.fill(); }
      }
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.085, 24), new THREE.MeshStandardMaterial({ map: grille, metalness: 0.4, roughness: 0.4 }));
    disc.position.set(0, gy, fz + 0.002);
    s.root.add(disc);
    s.ring(0.088, 0.012, [0, gy, fz + 0.002], steel);
    // scratches, more with wear
    const scratch = s.material('#ffffff', { transparent: true, opacity: 0.35, depthWrite: false });
    for (let i = 0; i < Math.round(mood.wear * 16); i++)
      s.box([0.06 + random() * 0.22, 0.003, 0.001], [(random() - 0.5) * (paneW - 0.3), paneY + (random() - 0.5) * (paneH - 0.2), fz + 0.001], scratch).rotation.z = (random() - 0.5) * 2;

    // ---- behind the glass ----
    const inside = new THREE.MeshStandardMaterial({ color: lit ? '#d9cfb4' : '#2a2c30', roughness: 0.9, emissive: lamp, emissiveIntensity: lit ? mix(0.28, 0.5, mood.cheer) : 0 });
    s.box([W - 0.14, HEAD - SILL + 0.3, 0.02], [0, (SILL + HEAD) / 2 + 0.05, -D / 2 + 0.07], inside);
    const deskY = SILL - 0.03;
    s.box([W - 0.14, 0.04, D - T - 0.12], [0, deskY, -T / 2 - 0.02], s.material(lit ? '#8a6a48' : '#2c2a28'));
    const shutterDrop = a.state === 'shuttered' ? 1 : a.state === 'closing' ? mix(0.4, 0.62, random()) : 0;
    if (lit) {
      const tube = new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: lamp, emissiveIntensity: 1.6 });
      s.box([W * 0.5, 0.03, 0.06], [0, HEAD + 0.12, -0.08], tube);
      // pigeonholes of envelopes and tickets on the back wall
      const holes = new Batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8, emissive: '#3a3020', emissiveIntensity: 0.5 }));
      const cols = 6, rws = 3;
      for (let c = 0; c < cols; c++) for (let r = 0; r < rws; r++) {
        const x = (c - (cols - 1) / 2) * ((W - 0.4) / cols), y = SILL + 0.42 + r * 0.16;
        holes.add([x, y, -D / 2 + 0.11], [(W - 0.4) / cols - 0.015, 0.14, 0.06], [0, 0, 0], '#4a3626');
        if (random() < mix(0.3, 0.95, mood.density)) holes.add([x + (random() - 0.5) * 0.03, y - 0.02, -D / 2 + 0.15], [0.1, 0.07 + random() * 0.04, 0.012], [0, 0, (random() - 0.5) * 0.3], pick(random, ['#f1ead6', '#e9c9a0', '#f2a7c0', '#f0d870', '#bcd4e6']));
      }
      holes.into(s.root);
      // till
      const tillX = -W * 0.22;
      s.box([0.3, 0.12, 0.26], [tillX, deskY + 0.08, -0.1], s.material('#3c4044'));
      s.box([0.26, 0.1, 0.04], [tillX, deskY + 0.19, -0.19], s.material('#2a2d30')).rotation.x = -0.3;
      s.box([0.14, 0.035, 0.01], [tillX, deskY + 0.2, -0.165], new THREE.MeshStandardMaterial({ color: '#7fe08a', emissive: '#3de05a', emissiveIntensity: 1 })).rotation.x = -0.3;
      // chair back
      const chairX = a.state === 'away' ? W * 0.26 : W * 0.08;
      const chair = s.box([0.36, 0.42, 0.07], [chairX, deskY + 0.26, a.state === 'away' ? -0.2 : -0.16], s.material('#232830'));
      chair.rotation.y = a.state === 'away' ? 0.7 : (random() - 0.5) * 0.3;
      if (a.state === 'open') {
        // desk lamp and a mug
        const lx = W * 0.3;
        s.cylinder(0.05, 0.06, 0.02, [lx, deskY + 0.03, -0.05], dark, 14);
        s.rod([lx, deskY + 0.03, -0.05], [lx - 0.06, deskY + 0.3, -0.08], 0.008, dark);
        const shade = s.cylinder(0.03, 0.08, 0.09, [lx - 0.1, deskY + 0.3, -0.07], s.material('#2f6b4a'), 14);
        shade.rotation.z = -0.5;
        s.cylinder(0.06, 0.06, 0.006, [lx - 0.12, deskY + 0.262, -0.07], new THREE.MeshStandardMaterial({ color: '#fff3c8', emissive: '#ffd77a', emissiveIntensity: 1.8 }), 14).rotation.z = -0.5;
        s.cylinder(0.035, 0.03, 0.08, [-W * 0.02, deskY + 0.06, -0.02], s.material(pick(random, ['#f4f1e6', '#c8262b', '#2a5fb0', '#e2c81f'])), 12);
      }
    }
    if (shutterDrop > 0) {
      const sh = (HEAD - SILL) * shutterDrop;
      const slatMat = s.material('#8f979a', { metalness: 0.45, roughness: 0.45 });
      s.box([paneW + 0.04, sh, 0.02], [0, HEAD - sh / 2, fz - 0.085], slatMat);
      const slats = new Batch(new THREE.CylinderGeometry(0.014, 0.014, 1, 6), slatMat);
      for (let y = HEAD - 0.03; y > HEAD - sh + 0.01; y -= 0.055) slats.add([0, y, fz - 0.072], [1, paneW + 0.04, 1], [0, 0, Math.PI / 2]);
      slats.into(s.root);
      s.box([paneW + 0.04, 0.05, 0.04], [0, HEAD - sh + 0.01, fz - 0.08], s.material('#5f6769', { metalness: 0.4 }));
      if (a.state === 'shuttered') {
        s.box([0.07, 0.06, 0.03], [paneW * 0.3, HEAD - sh + 0.06, fz - 0.058], s.material('#d0a83a', { metalness: 0.4, emissive: '#4a3a10', emissiveIntensity: 0.5 }));
        s.ring(0.022, 0.006, [paneW * 0.3, HEAD - sh + 0.1, fz - 0.058], steel, Math.PI);
      }
    }

    // ---- header sign ----
    const text = HEADERS[a.header];
    const signH = H - HEAD - 0.12, signW = W - 0.16;
    const styles = {
      lightbox: { paper: '#f6f2e4', ink: pick(random, ['#c8202c', '#1f4fb0', '#1c7a46']), glow: mood.wear > 0.85 ? 0.15 : 0.75 },
      painted: { paper: pick(random, ['#1f3a2c', '#7a1f1c', '#1d2c4a']), ink: '#f0d27a', glow: 0 },
      led: { paper: '#0e0e10', ink: '#ff3b2a', glow: 1.2 },
      stencil: { paper: '#9aa2a2', ink: '#151515', glow: 0 },
    }[a.signStyle];
    const signTex = painted(512, Math.round(512 * signH / signW), (ctx, w, h) => {
      ctx.fillStyle = styles.paper;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = styles.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const font = a.signStyle === 'painted' ? 'bold italic SIZEpx serif' : a.signStyle === 'led' ? 'bold SIZEpx monospace' : 'bold SIZEpx sans-serif';
      ctx.font = font.replace('SIZE', String(Math.min(h * 0.7, (w / text.length) * 1.55)));
      ctx.fillText(text, w / 2, h / 2 + 2, w - 30);
      if (a.signStyle === 'led') {
        ctx.fillStyle = '#0e0e10';
        for (let x = 0; x < w; x += 6) ctx.fillRect(x, 0, 2, h);
        for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 2);
      } else if (a.signStyle === 'painted') {
        ctx.strokeStyle = styles.ink;
        ctx.lineWidth = 5;
        ctx.strokeRect(10, 10, w - 20, h - 20);
      } else if (a.signStyle === 'stencil') {
        ctx.fillStyle = styles.paper;
        for (let x = 30; x < w; x += 46) ctx.fillRect(x, 0, 4, h);
      }
    });
    const signMat: THREE.MeshStandardMaterialParameters = styles.glow > 0 ? { emissive: '#ffffff', emissiveMap: signTex, emissiveIntensity: styles.glow } : {};
    if (a.signStyle === 'lightbox' || a.signStyle === 'led') s.box([signW + 0.05, signH + 0.05, 0.07], [0, (H + HEAD) / 2 + 0.01, D / 2 + 0.03], dark);
    const sign = card(signW, signH, signTex, signMat);
    sign.position.set(0, (H + HEAD) / 2 + 0.01, D / 2 + (a.signStyle === 'lightbox' || a.signStyle === 'led' ? 0.067 : 0.004));
    s.root.add(sign);

    // ---- taped notices ----
    const count = Math.round(mix(0, 9, Math.pow(clamp01(a.notices), 1.4)) + (a.notices > 0.2 ? (mood.density - 0.5) * 2 : 0));
    const tape = s.material('#d9c98a', { roughness: 0.5 });
    const spots: [number, number, number][] = [];
    const addNotice = (text: string, big: boolean, x: number, y: number) => {
      const hand = text === NOTICES.kind || random() < 0.45;
      const paper = big && a.rule !== 'kind' ? pick(random, ['#f4e94a', '#f6f3ea', '#ff9a3a']) : pick(random, ['#f6f3ea', '#f6f3ea', '#e9e1c6', '#f2a7c0', '#bfe3c0']);
      const ink = text === NOTICES.refunds || random() < 0.3 ? '#b3201d' : '#1a1a1c';
      const w = big ? 0.3 : 0.17 + random() * 0.05, h = w * 0.78;
      const sheet = card(w, h, notice(text, paper, ink, random, hand));
      sheet.position.set(x, y, fz + 0.004 + spots.length * 0.0012);
      sheet.rotation.z = (random() - 0.5) * mix(0.06, 0.3, mood.wear);
      s.root.add(sheet);
      for (const dx of [-1, 1]) {
        const strip = s.box([0.05, 0.022, 0.002], [x + dx * w * 0.42, y + h * 0.46, fz + 0.007 + spots.length * 0.0012], tape);
        strip.rotation.z = sheet.rotation.z + dx * -0.6;
      }
      spots.push([x, y, w]);
    };
    const left = -paneW / 2 + 0.2, right = paneW / 2 - 0.2;
    if (count > 0) addNotice(NOTICES[a.rule], true, random() < 0.5 ? left + 0.02 : right - 0.02, gy + 0.12);
    for (let i = 1; i < count; i++) {
      const side = i % 2 ? -1 : 1;
      const x = side * (0.22 + random() * (paneW / 2 - 0.32)), y = SILL + 0.2 + random() * (paneH - 0.3);
      if (Math.hypot(x, y - gy) < 0.2) continue;
      addNotice(pick(random, EXTRA), false, x, y);
    }
    if (a.state === 'away') {
      const back = card(0.26, 0.17, notice('BACK IN 5 MIN', '#f6f3ea', '#1a1a1c', random, true));
      back.position.set(0, gy - 0.22, fz + 0.02);
      back.rotation.z = (random() - 0.5) * 0.15;
      s.root.add(back);
    }

    // ---- camera ----
    let led: THREE.MeshStandardMaterial | null = null;
    if (a.camera) {
      const cx = (random() < 0.5 ? -1 : 1) * (W / 2 - 0.2);
      s.box([0.08, 0.1, 0.03], [cx, H + 0.1, D / 2 - 0.05], dark);
      s.rod([cx, H + 0.12, D / 2 - 0.05], [cx, H + 0.16, D / 2 + 0.1], 0.012, dark);
      const body = s.box([0.09, 0.08, 0.2], [cx, H + 0.15, D / 2 + 0.16], s.material('#e6e4dc'));
      body.rotation.x = 0.5;
      body.rotation.y = -Math.sign(cx) * 0.3;
      s.cylinder(0.03, 0.03, 0.03, [cx - Math.sign(cx) * 0.03, H + 0.1, D / 2 + 0.25], dark, 12).rotation.x = Math.PI / 2 + 0.5;
      led = new THREE.MeshStandardMaterial({ color: '#ff3020', emissive: '#ff2010', emissiveIntensity: 1.5 });
      s.ball([0.012, 0.012, 0.012], [cx + Math.sign(cx) * 0.03, H + 0.14, D / 2 + 0.24], led, 8);
    }

    const rate = mix(0.5, 4, mood.energy);
    return s.finish({
      update: led ? (_dt, time) => { led!.emissiveIntensity = Math.sin(time * rate) > 0 ? 1.6 : 0.15; } : undefined,
    });
  },
});
