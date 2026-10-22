import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
const PLACES = {
  newsroom: ['COMPOSING', 'PRESSROOM', 'CITY DESK', 'MORGUE', 'WIRE ROOM'],
  bank: ['VAULT', 'TELLERS', 'LOANS', 'LEDGERS', 'PRESIDENT'],
  hospital: ['PHARMACY', 'LAB', 'WARD 3', 'SURGERY', 'RECORDS'],
  store: ['CASH OFFICE', 'CREDIT', 'GIFT WRAP', 'MILLINERY', 'RETURNS'],
  hotel: ['FRONT DESK', 'KITCHEN', 'LAUNDRY', 'BELL CAPT', 'CELLAR'],
} as const;

export default defineThing({
  questions: {
    lines: choice('How many tubes come down to the terminal?', {
      pair: 'Two: one to send, one to receive.',
      three: 'Three.',
      four: 'Four, two each way.',
      five: 'A bank of five, a busy exchange.',
    }),
    place: choice('What building is it in, going by the destination plates?', {
      newsroom: 'A newspaper: COMPOSING, PRESSROOM, CITY DESK, MORGUE.',
      bank: 'A bank: VAULT, TELLERS, LOANS.',
      hospital: 'A hospital: PHARMACY, LAB, WARD 3.',
      store: 'A department store: CASH OFFICE, CREDIT, GIFT WRAP.',
      hotel: 'A grand hotel: FRONT DESK, KITCHEN, LAUNDRY.',
    }),
    state: choice('What has just happened at the terminal?', {
      arrived: 'A canister has just thumped into the basket; the signal lamp is lit and its flag is up.',
      sending: 'A canister is half way into an open send inlet, about to be sucked away.',
      queued: 'A row of loaded canisters stands waiting to go and nobody is sending them.',
      jammed: 'A canister is stuck in the mouth of an outlet with an OUT OF ORDER tag hung on the pipe.',
      idle: 'Nothing: lids shut, basket empty, the system quiet.',
    }),
    metal: choice('What are the pipes made of?', {
      brass: 'Polished brass, warm and proud.',
      nickel: 'Bright nickel plate, clean and clinical.',
      copper: 'Copper gone brown and green at the joints.',
      painted: 'Steel painted institutional cream, chipped at the clamps.',
      black: 'Black iron, industrial.',
    }),
    wall: choice('What wall is it mounted on?', {
      oak: 'Dark oak panelling with a moulded rail.',
      tile: 'White glazed tile with a dark border course.',
      plaster: 'Green-painted plaster above a darker dado.',
      steel: 'Riveted grey steel plate, a basement or a ship.',
    }),
    route: choice('Where do the pipes go above the terminal?', {
      up: 'Straight up through the ceiling, like organ pipes.',
      fan: 'They fan out left and right at staggered heights.',
      bundle: 'They gather into one tight bundle and swing off to one side.',
    }),
    carrier: choice('What are the canisters like?', {
      leather: 'Stitched brown leather with thick felt bumpers.',
      brass: 'Brass cylinders with screw caps.',
      clear: 'Clear celluloid with a roll of paper visible inside.',
      red: 'Red fibre with white felt ends, hard to lose.',
    }),
    catcher: choice('What catches arriving canisters?', {
      wire: 'A wire drop basket.',
      leather: 'A padded leather-lined box.',
      canvas: 'A canvas sack on a hoop.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = { pair: 2, three: 3, four: 4, five: 5 }[a.lines];
    const receives = Math.ceil(n / 2);
    const pitch = 0.25;
    const boardW = n * pitch + 0.55, boardH = 2.4;
    const pipeColour = { brass: '#d0a13c', nickel: '#cfd4d4', copper: '#a9623a', painted: '#e3dcc0', black: '#2a2c2e' }[a.metal];
    const shiny = a.metal !== 'painted' && a.metal !== 'black';
    const pipe = s.material(pipeColour, { metalness: shiny ? 0.85 : 0.2, roughness: shiny ? mix(0.2, 0.5, mood.wear) : 0.55 });
    const clamp = a.metal === 'copper' ? s.material('#5f9a82', { roughness: 0.8 }) : s.material(new THREE.Color(pipeColour).multiplyScalar(0.7), { metalness: shiny ? 0.8 : 0.2, roughness: 0.4 });
    const dark = s.material('#1f2123', { roughness: 0.6 });
    const felt = s.material('#7a2226', { roughness: 1 });

    // The slab of wall it lives on.
    const wallColour = { oak: '#5b3a22', tile: '#e9e8e0', plaster: '#8fa58a', steel: '#7c8587' }[a.wall];
    const wall = s.material(wallColour, { roughness: a.wall === 'tile' ? 0.25 : 0.75, metalness: a.wall === 'steel' ? 0.4 : 0 });
    s.box([boardW, boardH, 0.08], [0, boardH / 2, -0.04], wall);
    const trim = s.material({ oak: '#3d2615', tile: '#27323a', plaster: '#566b55', steel: '#4f5759' }[a.wall], { roughness: 0.6 });
    s.box([boardW + 0.04, 0.14, 0.11], [0, 0.07, -0.035], trim);
    if (a.wall === 'oak') {
      s.box([boardW + 0.04, 0.06, 0.11], [0, 0.84, -0.035], trim);
      s.box([boardW + 0.04, 0.08, 0.12], [0, boardH - 0.04, -0.035], trim);
      for (let i = 0; i < Math.round(boardW / 0.4); i++) s.box([0.3, 0.52, 0.012], [-boardW / 2 + 0.2 + i * (boardW - 0.4) / Math.max(1, Math.round(boardW / 0.4) - 1), 0.47, 0.004], trim);
    } else if (a.wall === 'tile') {
      const lines = s.material('#9aa3a3');
      for (let y = 0.3; y < boardH; y += 0.15) s.box([boardW, 0.006, 0.003], [0, y, 0.001], lines);
      for (let x = -boardW / 2 + 0.15; x < boardW / 2; x += 0.15) s.box([0.006, boardH - 0.14, 0.003], [x, boardH / 2 + 0.07, 0.001], lines);
      s.box([boardW, 0.075, 0.006], [0, 1.02, 0.002], trim);
    } else if (a.wall === 'plaster') {
      s.box([boardW, 0.86, 0.006], [0, 0.57, 0.002], trim);
      s.box([boardW + 0.02, 0.04, 0.025], [0, 1.0, 0.008], s.material('#3d2615'));
    } else {
      const rivet = new THREE.SphereGeometry(0.012, 8, 6);
      const dots: { at: P3; size: number }[] = [];
      for (const x of [-boardW / 2 + 0.05, 0, boardW / 2 - 0.05]) for (let y = 0.25; y < boardH; y += 0.16) dots.push({ at: [x, y, 0.002], size: 1 });
      s.scatter(rivet, trim, dots);
    }

    // Shelf on brackets.
    const shelfY = 0.86;
    const wood = s.material('#6b4528', { roughness: 0.55 });
    s.box([boardW - 0.08, 0.035, 0.44], [0, shelfY, 0.22], wood);
    for (const side of [-1, 1]) {
      const x = side * (boardW / 2 - 0.12);
      s.rod([x, shelfY - 0.02, 0.4], [x, shelfY - 0.36, 0.01], 0.012, pipe);
      s.rod([x, shelfY - 0.02, 0.02], [x, shelfY - 0.36, 0.02], 0.012, pipe);
    }

    const xOf = (index: number) => (index - (n - 1) / 2) * pitch;
    const plates = PLACES[a.place];
    const lamps: THREE.MeshStandardMaterial[] = [];
    const flags: THREE.Object3D[] = [];
    const bundleSide = random() < 0.5 ? -1 : 1;
    const arrivedAt = Math.floor(random() * receives);
    const sendAt = receives + Math.floor(random() * (n - receives));
    const jamAt = Math.floor(random() * receives);
    const R = 0.042;

    // Canister factory.
    const shellColour = { leather: '#7a4a26', brass: '#c79a3a', clear: '#d6e2e2', red: '#b8312b' }[a.carrier];
    const shellMaterial = a.carrier === 'clear'
      ? new THREE.MeshStandardMaterial({ color: shellColour, transparent: true, opacity: 0.45, roughness: 0.1 })
      : s.material(shellColour, { metalness: a.carrier === 'brass' ? 0.8 : 0, roughness: a.carrier === 'brass' ? 0.3 : 0.7 });
    const bumper = a.carrier === 'red' ? s.material('#efe9da', { roughness: 1 }) : a.carrier === 'brass' ? s.material('#8a6a22', { metalness: 0.7, roughness: 0.4 }) : felt;
    const paper = s.material('#f1ecd9', { roughness: 0.9 });
    const canister = (at: P3, rotation: P3 = [0, 0, 0], open = false) => {
      const group = new THREE.Group();
      const add = (mesh: THREE.Object3D) => { group.add(mesh); return mesh; };
      add(s.cylinder(0.031, 0.031, 0.2, [0, 0, 0], shellMaterial, 16));
      for (const end of [-1, 1]) if (!(open && end === 1)) add(s.cylinder(0.037, 0.037, 0.03, [0, end * 0.1, 0], bumper, 16));
      if (a.carrier === 'clear' || open) add(s.cylinder(0.02, 0.02, open ? 0.26 : 0.16, [0, open ? 0.05 : 0, 0], paper, 10));
      if (a.carrier === 'leather') add(s.box([0.004, 0.2, 0.012], [0, 0, 0.031], dark));
      group.position.set(...at);
      group.rotation.set(...rotation);
      s.root.add(group);
      return group;
    };

    for (let i = 0; i < n; i++) {
      const x = xOf(i);
      const receive = i < receives;
      // Riser up the wall, then its route above.
      const topY = boardH + 0.25;
      const start: P3[] = a.route === 'up'
        ? [[x, topY + (i % 2) * 0.12, 0.05]]
        : a.route === 'fan'
          ? [[(i < n / 2 ? -1 : 1) * (boardW / 2 + 0.16), 1.95 + Math.abs(i - (n - 1) / 2) * 0.22 + (i % 2) * 0.05, 0.05], [x + (i < n / 2 ? -0.1 : 0.1), 1.95 + Math.abs(i - (n - 1) / 2) * 0.22, 0.05], [x, 1.8 + Math.abs(i - (n - 1) / 2) * 0.2, 0.05]]
          : [[bundleSide * (boardW / 2 + 0.2), 2.2 + i * 0.012, 0.05 + i * 0.085], [bundleSide * (boardW / 2 - 0.2), 2.19, 0.05 + i * 0.085], [x * 0.5 + bundleSide * 0.1, 2.05, 0.05 + i * 0.04], [x, 1.85, 0.05]];
      const end: P3[] = receive
        ? [[x, 1.62, 0.05], [x, 1.5, 0.08], [x, 1.42, 0.2], [x, 1.3, 0.24], [x, 1.24, 0.24]]
        : [[x, 1.5, 0.05], [x, 1.2, 0.06], [x, 1.08, 0.14], [x, 1.12, 0.25], [x, 1.26, 0.28], [x, 1.3, 0.28]];
      s.tube([...start, ...end], R, pipe);
      // Clamps and a destination plate.
      for (const y of [1.66, a.route === 'up' ? 2.2 : 1.78]) s.box([R * 2 + 0.05, 0.03, R + 0.02], [x, y, 0.035], clamp);
      for (const y of a.route === 'up' ? [1.95] : []) s.cylinder(R + 0.008, R + 0.008, 0.04, [x, y, 0.05], clamp, 16);
      s.label(plates[i % plates.length], pitch - 0.015, 0.075, [x, receive ? 1.6 : 1.44, 0.1], '#f3ead0', '#22262a');
      if (receive) {
        // Trumpet mouth, signal lamp and drop flag.
        s.lathe([[R, 0.08], [R + 0.004, 0.04], [R + 0.02, 0.012], [R + 0.045, 0], [R + 0.04, 0.006], [R - 0.004, 0.06]], pipe, [x, 1.16, 0.24]);
        const lit = (a.state === 'arrived' && i === arrivedAt);
        const lamp = new THREE.MeshStandardMaterial({ color: lit ? '#ffb23a' : '#6b5a44', emissive: '#ff9a1c', emissiveIntensity: lit ? 2.2 : 0, roughness: 0.3 });
        s.cylinder(0.022, 0.022, 0.02, [x, 1.75, 0.01], dark, 12).rotation.x = Math.PI / 2;
        s.ball([0.02, 0.02, 0.02], [x, 1.75, 0.025], lamp, 12);
        if (lit) lamps.push(lamp);
        const flag = new THREE.Group();
        flag.position.set(x + 0.07, 1.7, 0.03);
        flag.add(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.09, 0.006), dark), Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.005, 12), s.material('#c8312b')), {}));
        flag.children[0].position.y = 0.045;
        flag.children[1].position.y = 0.09;
        flag.children[1].rotation.x = Math.PI / 2;
        flag.rotation.z = lit ? 0 : -1.5;
        s.root.add(flag);
        if (lit) flags.push(flag);
        if (a.state === 'jammed' && i === jamAt) {
          canister([x + 0.008, 1.11, 0.24], [0.1, 0, 0.14]);
          s.rod([x + 0.02, 1.34, 0.28], [x + 0.03, 1.26, 0.3], 0.002, dark);
          const tag = s.label('OUT OF ORDER', 0.17, 0.06, [x + 0.03, 1.4, 0.292], '#b3261e', '#f1e6c4');
          tag.rotation.z = -0.12 + random() * 0.2;
        }
      } else {
        // Send inlet: a collar and a hinged lid.
        s.cylinder(R + 0.012, R + 0.012, 0.035, [x, 1.3, 0.28], clamp, 16);
        const sending = a.state === 'sending' && i === sendAt;
        const lid = s.cylinder(R + 0.012, R + 0.012, 0.012, [x, 1.325, 0.28], pipe, 16);
        if (sending || (a.state !== 'idle' && random() < 0.25)) { lid.position.set(x, 1.36, 0.225); lid.rotation.x = -1.25; }
        s.ball([0.012, 0.012, 0.012], [x, 1.325, 0.225], clamp, 8);
        if (sending) canister([x, 1.39, 0.28], [0, random() * 3, 0]);
      }
    }

    // Catcher under the receiving outlets.
    const cx = (xOf(0) + xOf(receives - 1)) / 2, cw = receives * pitch + 0.08, cz = 0.25, cy = shelfY + 0.018;
    if (a.catcher === 'wire') {
      for (const y of [0.01, 0.09, 0.17]) for (const side of [-1, 1]) {
        s.rod([cx - cw / 2, cy + y, cz + side * 0.14], [cx + cw / 2, cy + y, cz + side * 0.14], 0.004, pipe);
        s.rod([cx + side * cw / 2, cy + y, cz - 0.14], [cx + side * cw / 2, cy + y, cz + 0.14], 0.004, pipe);
      }
      for (let i = 0; i <= Math.round(cw / 0.06); i++) for (const side of [-1, 1]) s.rod([cx - cw / 2 + i * cw / Math.round(cw / 0.06), cy, cz + side * 0.14], [cx - cw / 2 + i * cw / Math.round(cw / 0.06), cy + 0.17, cz + side * 0.14], 0.0025, pipe);
      s.box([cw, 0.006, 0.28], [cx, cy + 0.006, cz], s.material('#5d7a55', { roughness: 1 }));
    } else if (a.catcher === 'leather') {
      const hide = s.material('#5a341c', { roughness: 0.6 });
      s.box([cw, 0.02, 0.3], [cx, cy + 0.01, cz], hide);
      for (const side of [-1, 1]) { s.box([0.02, 0.15, 0.3], [cx + side * cw / 2, cy + 0.075, cz], hide); s.box([cw, 0.15, 0.02], [cx, cy + 0.075, cz + side * 0.15], hide); }
      s.box([cw - 0.03, 0.03, 0.27], [cx, cy + 0.03, cz], felt);
    } else {
      const hoop = s.ring(Math.min(cw / 2, 0.2), 0.008, [cx, cy + 0.22, cz], pipe);
      hoop.rotation.x = Math.PI / 2;
      s.rod([cx, cy + 0.22, cz - 0.2], [cx, cy + 0.22, 0], 0.008, pipe);
      s.lathe([[0, 0], [0.1, 0.01], [0.17, 0.08], [Math.min(cw / 2, 0.2), 0.22]], new THREE.MeshStandardMaterial({ color: '#b9ab86', roughness: 1, side: THREE.DoubleSide }), [cx, cy, cz]);
    }
    const inBasket = a.state === 'arrived' ? 1 + Math.round(mood.density * 2) : a.state === 'idle' ? 0 : Math.round(mood.density * 2);
    for (let i = 0; i < inBasket; i++) canister([cx + (random() - 0.5) * (cw - 0.24), cy + 0.06 + i * 0.045, cz + (random() - 0.5) * 0.08], [Math.PI / 2 + (random() - 0.5) * 0.4, 0, Math.PI / 2 + (random() - 0.5) * 0.9]);

    // Waiting canisters and an opened one on the send side of the shelf.
    const sx0 = xOf(receives) - 0.04, span = (n - receives) * pitch;
    const waiting = a.state === 'queued' ? 3 + Math.round(mood.density * 3) : a.state === 'idle' ? 1 : 1 + Math.round(mood.density * 2);
    for (let i = 0; i < waiting; i++) canister([sx0 + (i % 4) * Math.max(0.08, span / 4) + (random() - 0.5) * 0.015, cy + 0.115, 0.36 - Math.floor(i / 4) * 0.09], [0, random() * 3, 0]);
    if (a.state !== 'idle' && a.state !== 'queued') {
      canister([sx0 + span * 0.4, cy + 0.04, 0.2], [Math.PI / 2, 0, 1.1 + random() * 0.6], true);
      const sheet = s.box([0.13, 0.002, 0.18], [sx0 + span * 0.2 + 0.06, cy + 0.02, 0.12], paper);
      sheet.rotation.y = random();
    }
    // Pressure gauge on the wall.
    const gx = boardW / 2 - 0.14;
    s.cylinder(0.06, 0.06, 0.03, [gx, 1.95, 0.015], pipe, 20).rotation.x = Math.PI / 2;
    s.cylinder(0.05, 0.05, 0.004, [gx, 1.95, 0.032], s.material('#f3efe2'), 20).rotation.x = Math.PI / 2;
    const needle = s.box([0.004, 0.045, 0.003], [gx, 1.95, 0.036], s.material('#b3261e'));
    needle.geometry.translate(0, 0.018, 0);
    const rest = mix(1.2, -1.2, mood.energy);
    needle.rotation.z = rest;

    return s.finish({
      update: (_dt, time) => {
        for (const lamp of lamps) lamp.emissiveIntensity = Math.sin(time * 7) > -0.3 ? 2.4 : 0.4;
        for (const flag of flags) flag.rotation.z = Math.sin(time * 18) * 0.06 * (0.3 + mood.energy);
        needle.rotation.z = rest + Math.sin(time * 5.3) * 0.08 * mood.energy;
      },
    });
  },
});
