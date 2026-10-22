import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { Batch, aged, paint } from './lib';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    surface: choice('What is on the planks and the ground beneath?', {
      clean: 'Nothing: dry bare metal, hosed down.',
      shells: 'Peanut shells, sunflower husks and paper cups from a full afternoon.',
      frost: 'A white rime of frost on every plank, an early-morning or late-season cold.',
      rain: 'Rain: dark wet planks and puddles on the ground.',
      leaves: 'Blown autumn leaves gathered along the footboards.',
    }),
    cushions: choice('What have people brought to sit on?', {
      none: 'Nothing: bare seats.',
      few: 'Two or three stadium cushions in team colours.',
      row: 'A whole reserved row of matching booster-club seat cushions with backs.',
      blankets: 'Plaid blankets and mismatched cushions, a family camp.',
    }),
    cooler: choice('Is there a cooler?', {
      none: 'No cooler.',
      hard: 'A red hard cooler with a white lid, set on a footboard.',
      foam: 'A cheap white styrofoam cooler with its lid askew.',
      soft: 'A blue soft-sided lunch cooler with a shoulder strap.',
    }),
    left: choice('What small thing has been forgotten on a seat?', {
      nothing: 'Nothing.',
      scorebook: 'An open scorebook with a pencil lying across it.',
      cap: 'A child\'s ball cap.',
      thermos: 'A steel thermos and its cup.',
      glove: 'A kid\'s baseball glove with a ball in it.',
    }),
    planks: choice('What are the seats made of?', {
      aluminium: 'Bright ribbed aluminium planks.',
      painted: 'Aluminium seats with footboards painted park green.',
      timber: 'Grey weathered timber planks on the old steel frame.',
    }),
    rail: choice('What guards the back and sides?', {
      none: 'Nothing: you can step off the back.',
      pipes: 'Two-bar pipe guard rails round the back and sides.',
      mesh: 'A chain-link guard panel across the back.',
    }),
    run: choice('How long is it?', {
      short: 'A stubby three-metre section.',
      standard: 'A standard four-and-a-half-metre unit.',
      long: 'A long six-metre run.',
    }),
    banner: choice('Is anything hung on it?', {
      none: 'Nothing.',
      team: 'A painted bedsheet: GO TIGERS.',
      reserved: 'A small RESERVED - BOOSTERS sign.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const b = new Batch();
    const L = { short: 3, standard: 4.5, long: 6.2 }[a.run];
    const ROWS = 5, RISE = 0.21, RUN = 0.6, SEAT0 = 0.43;
    const seatY = (row: number) => SEAT0 + row * RISE;
    const seatZ = (row: number) => ((ROWS - 1) / 2 - row) * RUN;
    const wet = a.surface === 'rain', frost = a.surface === 'frost';
    const metalBase = aged('#c9cfd1', mood.wear * 0.35, '#8b8a82');
    const seatBase = a.planks === 'timber' ? aged('#9a9488', mood.wear * 0.4, '#6a6258') : metalBase;
    const footBase = a.planks === 'painted' ? aged('#3d7353', mood.wear * 0.4, '#8d9189') : seatBase;
    const surface = (base: THREE.Color) => {
      const colour = base.clone();
      if (frost) colour.lerp(new THREE.Color('#eef5fa'), 0.55 + random() * 0.25);
      if (wet) colour.multiplyScalar(0.62);
      return aged(colour, random() * 0.1, '#77756c');
    };
    const frameColour = aged(a.planks === 'timber' ? '#5f6a66' : '#aeb5b6', mood.wear * 0.55, '#86583b');

    // ----- planks -----
    const kink = () => (random() - 0.5) * mood.wear * 0.035;
    for (let row = 0; row < ROWS; row++) {
      b.box([L, 0.045, 0.25], [0, seatY(row) - 0.0225, seatZ(row)], surface(seatBase), [0, 0, kink()]);
      b.box([L, 0.012, 0.02], [0, seatY(row) + 0.004, seatZ(row) + 0.07], surface(seatBase));
      b.box([L, 0.012, 0.02], [0, seatY(row) + 0.004, seatZ(row) - 0.07], surface(seatBase));
      if (row > 0) {
        const doubled = row > 1;
        b.box([L, 0.035, doubled ? 0.44 : 0.26], [0, seatY(row) - 0.42, seatZ(row) + (doubled ? 0.4 : 0.34)], surface(footBase), [0, 0, kink()]);
      }
      if (row > 1) b.box([L, 0.16, 0.02], [0, seatY(row - 1) - 0.14, seatZ(row - 1) - 0.14], surface(footBase));
      for (const side of [-1, 1]) b.box([0.02, 0.05, 0.26], [side * (L / 2 + 0.008), seatY(row) - 0.022, seatZ(row)], '#2c2f31');
    }

    // ----- frames -----
    const frames = Math.max(2, Math.round(L / 1.7) + 1);
    const backZ = seatZ(ROWS - 1) - 0.2, frontZ = seatZ(0) + 0.18, topY = seatY(ROWS - 1);
    const frameXs = Array.from({ length: frames }, (_unused, i) => -L / 2 + 0.3 + (i / (frames - 1)) * (L - 0.6));
    const railTop = topY + 1.0;
    for (const x of frameXs) {
      b.box([0.05, 0.05, frontZ - backZ + 0.3], [x, 0.025, (frontZ + backZ) / 2], frameColour);
      b.box([0.05, (a.rail === 'none' ? topY : railTop), 0.05], [x, (a.rail === 'none' ? topY : railTop) / 2, backZ], frameColour);
      b.rod([x, 0.05, frontZ], [x, topY - 0.05, backZ], 0.028, frameColour, 4);
      for (let row = 0; row < ROWS; row++) b.box([0.04, seatY(row) - 0.05, 0.04], [x, (seatY(row) - 0.05) / 2, seatZ(row)], frameColour);
      b.rod([x, 0.05, seatZ(1)], [x, seatY(ROWS - 1) - 0.4, backZ], 0.02, frameColour, 4);
    }
    for (let i = 0; i < frames - 1; i++) {
      b.rod([frameXs[i], 0.1, backZ - 0.03], [frameXs[i + 1], topY - 0.1, backZ - 0.03], 0.016, frameColour, 4);
      b.rod([frameXs[i + 1], 0.1, backZ - 0.03], [frameXs[i], topY - 0.1, backZ - 0.03], 0.016, frameColour, 4);
    }

    // ----- guard rails -----
    if (a.rail !== 'none') {
      for (const y of a.rail === 'pipes' ? [railTop, topY + 0.5] : [railTop, topY + 0.08]) b.cyl(0.025, 0.025, L, [0, y, backZ], frameColour, 7, [0, 0, Math.PI / 2]);
      for (const side of [-1, 1]) {
        const x = side * (L / 2 - 0.02);
        b.box([0.045, railTop, 0.045], [x, railTop / 2, backZ], frameColour);
        const midZ = seatZ(2), midTop = seatY(2) + 0.95;
        b.box([0.045, midTop, 0.045], [x, midTop / 2, midZ], frameColour);
        b.rod([x, railTop, backZ], [x, midTop, midZ], 0.025, frameColour, 6);
        b.rod([x, topY + 0.5, backZ], [x, seatY(2) + 0.45, midZ], 0.025, frameColour, 6);
      }
    }
    if (a.rail === 'mesh') {
      const positions: number[] = [];
      const y0 = topY + 0.1, h = railTop - y0 - 0.02, x0 = -L / 2;
      const strand = (ua: number, va: number, ub: number, vb: number) => {
        const dx = ub - ua, dy = vb - va, length = Math.hypot(dx, dy), px = (-dy / length) * 0.009, py = (dx / length) * 0.009;
        for (const [u, v] of [[ua - px, va - py], [ua + px, va + py], [ub + px, vb + py], [ua - px, va - py], [ub + px, vb + py], [ub - px, vb - py]]) positions.push(x0 + u, y0 + v, backZ);
      };
      for (let c = -h + 0.07; c < L; c += 0.14) { const v0 = Math.max(0, -c), v1 = Math.min(h, L - c); if (v1 > v0) strand(c + v0, v0, c + v1, v1); }
      for (let c = 0.07; c < L + h; c += 0.14) { const v0 = Math.max(0, c - L), v1 = Math.min(h, c); if (v1 > v0) strand(c - v0, v0, c - v1, v1); }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.computeVertexNormals();
      s.mesh(geometry, new THREE.MeshStandardMaterial({ color: frameColour, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }));
    }

    // ----- places to put things -----
    const taken: { row: number; x: number }[] = [];
    const spot = (row = Math.floor(random() * ROWS), clearance = 0.45): { row: number; x: number } => {
      for (let attempt = 0; attempt < 20; attempt++) {
        const x = (random() - 0.5) * (L - 0.7);
        if (taken.every((other) => other.row !== row || Math.abs(other.x - x) > clearance)) { taken.push({ row, x }); return { row, x }; }
      }
      const fallback = { row, x: (random() - 0.5) * (L - 0.7) };
      taken.push(fallback);
      return fallback;
    };
    const teamHue = mood.warmth > 0.5 ? 0.01 : 0.6;
    const teamColour = new THREE.Color().setHSL(teamHue, mix(0.4, 0.8, mood.cheer), 0.42);
    const gold = new THREE.Color().setHSL(0.12, mix(0.4, 0.85, mood.cheer), 0.55);

    // ----- cushions and blankets -----
    const cushion = (row: number, x: number, colour: THREE.Color, back: boolean) => {
      b.box([0.38, 0.055, 0.3], [x, seatY(row) + 0.035, seatZ(row)], colour, [0, (random() - 0.5) * 0.25, 0]);
      if (back) b.box([0.38, 0.34, 0.04], [x, seatY(row) + 0.22, seatZ(row) - 0.15], colour, [-0.18, 0, 0]);
    };
    if (a.cushions === 'few') {
      for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) { const at = spot(); cushion(at.row, at.x, random() < 0.6 ? teamColour : gold, random() < 0.3); }
    } else if (a.cushions === 'row') {
      const row = 2 + Math.floor(random() * 2), count = Math.floor((L - 0.4) / 0.46);
      for (let i = 0; i < count; i++) {
        const x = (i - (count - 1) / 2) * 0.46;
        taken.push({ row, x });
        if (random() > mood.wear * 0.25) cushion(row, x, teamColour, true);
      }
    } else if (a.cushions === 'blankets') {
      const plaids = [['#a3342a', '#1f2a24'], ['#2f5d8c', '#e9e2c9'], ['#3f6b45', '#d9b23a'], ['#6d3f76', '#e6dccb']];
      for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) {
        const at = spot(undefined, 0.8), [base, stripe] = plaids[Math.floor(random() * plaids.length)];
        const turn = (random() - 0.5) * 0.3, w = 0.6 + random() * 0.3;
        b.box([w, 0.05, 0.34], [at.x, seatY(at.row) + 0.03, seatZ(at.row)], base, [0, turn, 0]);
        b.box([w, 0.3, 0.03], [at.x, seatY(at.row) - 0.13, seatZ(at.row) + 0.17], base, [0.08, turn, 0]);
        for (let k = -1; k <= 1; k++) { b.box([0.05, 0.052, 0.345], [at.x + k * w * 0.3, seatY(at.row) + 0.031, seatZ(at.row)], stripe, [0, turn, 0]); b.box([0.05, 0.3, 0.032], [at.x + k * w * 0.3, seatY(at.row) - 0.13, seatZ(at.row) + 0.172], stripe, [0.08, turn, 0]); }
        b.box([w, 0.02, 0.345], [at.x, seatY(at.row) + 0.048, seatZ(at.row) - 0.06], stripe, [0, turn, 0]);
        if (random() < 0.6) { const other = spot(at.row, 0.5); cushion(other.row, other.x, new THREE.Color().setHSL(random(), 0.45, 0.5), false); }
      }
    }

    // ----- cooler -----
    if (a.cooler !== 'none') {
      const row = 1 + Math.floor(random() * 2), x = (random() - 0.5) * (L - 1.2);
      taken.push({ row: row - 1, x }, { row, x });
      const y = seatY(row) - 0.4, z = seatZ(row) + 0.38, turn = (random() - 0.5) * 0.4;
      if (a.cooler === 'hard') {
        b.box([0.62, 0.3, 0.34], [x, y + 0.15, z], new THREE.Color().setHSL(0.0, mix(0.5, 0.8, mood.cheer), 0.42), [0, turn, 0]);
        b.box([0.64, 0.07, 0.36], [x, y + 0.335, z], '#f1efe7', [0, turn, 0]);
        b.box([0.4, 0.02, 0.03], [x, y + 0.39, z], '#f1efe7', [0, turn, 0]);
      } else if (a.cooler === 'foam') {
        b.box([0.5, 0.32, 0.34], [x, y + 0.16, z], '#f4f3ee', [0, turn, 0]);
        b.box([0.54, 0.06, 0.38], [x + 0.06, y + 0.36, z + 0.03], '#fbfaf6', [0.06, turn + 0.35, 0.1]);
      } else {
        b.box([0.4, 0.28, 0.26], [x, y + 0.14, z], new THREE.Color().setHSL(0.6, mix(0.4, 0.75, mood.cheer), 0.4), [0, turn, 0]);
        b.box([0.41, 0.03, 0.27], [x, y + 0.2, z], '#1f2430', [0, turn, 0]);
        b.add(new THREE.TorusGeometry(0.2, 0.014, 4, 12, Math.PI), '#1f2430', [x, y + 0.27, z], [0, turn, 0]);
      }
    }

    // ----- the forgotten thing -----
    if (a.left === 'scorebook') {
      const at = spot(Math.floor(random() * 3));
      const page = paint(256, 192, (ctx, w, h) => {
        ctx.fillStyle = '#f5f1e3'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#4c7f6a'; ctx.lineWidth = 1.5;
        for (let x = 12; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, h - 8); ctx.stroke(); }
        for (let y = 8; y < h; y += 18) { ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(w - 8, y); ctx.stroke(); }
        ctx.strokeStyle = '#2b2b33'; ctx.lineWidth = 2;
        for (let i = 0; i < 46; i++) { const x = 16 + Math.floor(random() * 11) * 20, y = 12 + Math.floor(random() * 9) * 18; ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x + 6, y + 2); ctx.lineTo(x + 12, y + 10); if (random() < 0.4) ctx.lineTo(x + 6, y + 14); ctx.stroke(); }
        ctx.fillStyle = '#b9b3a1'; ctx.fillRect(w / 2 - 2, 0, 4, h);
      });
      const book = s.mesh(new THREE.BoxGeometry(0.46, 0.02, 0.32), [s.material('#f5f1e3'), s.material('#f5f1e3'), new THREE.MeshStandardMaterial({ map: page, roughness: 0.9 }), s.material('#2f4f7a'), s.material('#f5f1e3'), s.material('#f5f1e3')] as unknown as THREE.Material, [at.x, seatY(at.row) + 0.012, seatZ(at.row)]);
      book.rotation.y = (random() - 0.5) * 0.6;
      b.rod([at.x - 0.1, seatY(at.row) + 0.032, seatZ(at.row) + 0.06], [at.x + 0.12, seatY(at.row) + 0.032, seatZ(at.row) - 0.05], 0.009, '#e8b72a', 5);
    } else if (a.left === 'cap') {
      const at = spot(Math.floor(random() * 4)), turn = random() * 6;
      b.add(new THREE.SphereGeometry(0.11, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), teamColour, [at.x, seatY(at.row), seatZ(at.row)]);
      b.box([0.17, 0.014, 0.12], [at.x + Math.sin(turn) * 0.14, seatY(at.row) + 0.012, seatZ(at.row) + Math.cos(turn) * 0.1], teamColour, [0, turn, 0]);
      b.ball([0.02, 0.012, 0.02], [at.x, seatY(at.row) + 0.11, seatZ(at.row)], '#f2efe5', 6);
    } else if (a.left === 'thermos') {
      const at = spot(Math.floor(random() * 4));
      b.cyl(0.045, 0.05, 0.3, [at.x, seatY(at.row) + 0.15, seatZ(at.row)], '#4d6b58', 10);
      b.cyl(0.04, 0.045, 0.05, [at.x, seatY(at.row) + 0.325, seatZ(at.row)], '#c9cdcc', 10);
      b.cyl(0.045, 0.04, 0.06, [at.x + 0.14, seatY(at.row) + 0.03, seatZ(at.row) + 0.04], '#c9cdcc', 10);
    } else if (a.left === 'glove') {
      const at = spot(Math.floor(random() * 4)), leather = aged('#8c5b34', mood.wear * 0.4, '#4c311d');
      b.ball([0.15, 0.06, 0.17], [at.x, seatY(at.row) + 0.05, seatZ(at.row)], leather, 10, [0, random() * 3, 0]);
      for (let f = 0; f < 4; f++) b.ball([0.03, 0.035, 0.07], [at.x - 0.09 + f * 0.06, seatY(at.row) + 0.07, seatZ(at.row) - 0.14], leather, 6);
      b.ball([0.055, 0.055, 0.055], [at.x, seatY(at.row) + 0.1, seatZ(at.row) + 0.01], '#f3f0e6', 8);
    }

    // ----- banner -----
    let banner: THREE.Mesh | null = null;
    if (a.banner !== 'none') {
      const team = a.banner === 'team';
      const w = team ? Math.min(L - 0.5, 2.8) : 1.1, h = team ? 0.75 : 0.34;
      const hangY = a.rail === 'none' ? seatY(0) - 0.02 : railTop - 0.02;
      const hangZ = a.rail === 'none' ? frontZ + 0.03 : backZ + 0.04;
      const map = paint(512, Math.round(512 * h / w), (ctx, cw, ch) => {
        ctx.fillStyle = team ? '#f3f0e4' : '#f6d94a'; ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = team ? `#${teamColour.getHexString()}` : '#1d1f22';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = team ? `bold ${ch * 0.62}px "Comic Sans MS", "Marker Felt", sans-serif` : `bold ${ch * 0.4}px Arial, sans-serif`;
        if (team) ctx.fillText('GO TIGERS!', cw / 2, ch / 2, cw - 40);
        else { ctx.fillText('RESERVED', cw / 2, ch * 0.3, cw - 30); ctx.fillText('BOOSTERS', cw / 2, ch * 0.72, cw - 30); }
      });
      const cloth = new THREE.PlaneGeometry(w, h, 12, 1);
      cloth.translate(0, -h / 2, 0);
      banner = s.mesh(cloth, new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide }), [team ? 0 : (random() - 0.5) * (L - 1.4), Math.max(h + 0.02, hangY), hangZ]);
      banner.rotation.z = (random() - 0.5) * 0.04;
    }

    // ----- weather and litter -----
    const specks: { at: V3; size: number; color: THREE.ColorRepresentation }[] = [];
    const onPlanks = (): V3 => {
      const row = Math.floor(random() * ROWS), seat = row === 0 || random() < 0.35;
      return seat ? [(random() - 0.5) * L, seatY(row) + 0.012, seatZ(row) + (random() - 0.5) * 0.22] : [(random() - 0.5) * L, seatY(row) - 0.395, seatZ(row) + 0.22 + random() * 0.34];
    };
    const onGround = (): V3 => [(random() - 0.5) * (L + 0.8), 0.01, mix(backZ - 0.2, frontZ + 0.9, random())];
    const amount = mix(0.5, 1.5, mood.density);
    if (a.surface === 'shells') {
      for (let i = 0; i < 420 * amount; i++) specks.push({ at: random() < 0.6 ? onPlanks() : onGround(), size: 0.018 + random() * 0.022, color: random() < 0.7 ? new THREE.Color().setHSL(0.09 + random() * 0.03, 0.45, 0.55 + random() * 0.2) : '#2d2824' });
      for (let i = 0; i < 6 * amount; i++) { const at = random() < 0.5 ? onPlanks() : onGround(); b.cyl(0.04, 0.03, 0.1, [at[0], at[1] + 0.03, at[2]], random() < 0.5 ? '#f3f0e6' : '#c8402f', 7, [Math.PI / 2 + (random() - 0.5) * 0.3, 0, random() * 3]); }
      for (let i = 0; i < 2 * amount; i++) { const at = onPlanks(); b.box([0.14, 0.2, 0.07], [at[0], at[1] + 0.1, at[2]], '#b88a56', [0, random(), (random() - 0.5) * 0.3]); }
    } else if (frost) {
      for (let i = 0; i < 520; i++) specks.push({ at: onPlanks(), size: 0.012 + random() * 0.02, color: '#ffffff' });
      for (let i = 0; i < 160; i++) specks.push({ at: onGround(), size: 0.015 + random() * 0.03, color: '#f1f6f9' });
    } else if (a.surface === 'leaves') {
      for (let i = 0; i < 300 * amount; i++) {
        const at = random() < 0.5 ? onPlanks() : onGround();
        specks.push({ at: [at[0], at[1] + 0.005, at[2]], size: 0.035 + random() * 0.04, color: new THREE.Color().setHSL(0.03 + random() * 0.1, 0.7, 0.3 + random() * 0.3) });
      }
    }
    if (specks.length) {
      const flake = new THREE.OctahedronGeometry(1, 0);
      flake.scale(1, 0.3, 0.7);
      s.scatter(flake, new THREE.MeshStandardMaterial({ roughness: frost ? 0.3 : 0.9 }), specks);
    }
    if (wet) {
      const water = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.58, 0.18, mix(0.45, 0.66, mood.cheer)), roughness: 0.06, metalness: 0.55 });
      for (let i = 0; i < 5 + mood.density * 5; i++) {
        const at = onGround();
        const puddle = s.cylinder(1, 1, 0.008, [at[0], 0.006, at[2] + 0.5], water, 20);
        puddle.scale.set(0.25 + random() * 0.5, 1, 0.2 + random() * 0.35);
        puddle.rotation.y = random() * 3;
        puddle.castShadow = false;
      }
      // A forgotten umbrella, furled, leaning on the front row.
      const x = (random() - 0.5) * (L - 1);
      b.rod([x, 0.02, frontZ + 0.5], [x + 0.1, seatY(0) + 0.35, seatZ(0) + 0.1], 0.045, new THREE.Color().setHSL(random(), 0.5, 0.35), 8, 0.02);
      b.add(new THREE.TorusGeometry(0.05, 0.012, 4, 10, Math.PI), '#3a2a1c', [x + 0.105, seatY(0) + 0.4, seatZ(0) + 0.09], [0, 0, 0]);
    }
    // Grass grows up through the frame.
    const blade = new THREE.ConeGeometry(0.045, 0.34, 4);
    blade.translate(0, 0.17, 0);
    s.scatter(blade, new THREE.MeshStandardMaterial({ roughness: 0.95 }), Array.from({ length: Math.round(mix(8, 50, mood.wear) * mix(0.6, 1.3, mood.density)) }, () => ({
      at: [(random() - 0.5) * (L + 0.5), 0, mix(backZ - 0.3, frontZ - 0.6, random())] as V3,
      size: 0.5 + random() * (0.5 + mood.wear),
      color: frost ? new THREE.Color('#b9c9bd') : new THREE.Color().setHSL(mix(0.19, 0.31, random()), mix(0.25, 0.55, mood.cheer), mix(0.22, 0.37, random())),
    })));

    b.into(s.root, { roughness: wet ? 0.25 : mix(0.4, 0.8, mood.wear), metalness: a.planks === 'timber' ? 0.05 : 0.35 });
    s.root.rotation.z = (random() - 0.5) * mood.wear * 0.025;
    const breeze = mix(0.5, 3, mood.energy), reach = mix(0.02, 0.22, mood.energy);
    return s.finish({ update: banner ? (_dt, time) => { banner!.rotation.x = Math.sin(time * breeze) * reach; } : undefined });
  },
});
