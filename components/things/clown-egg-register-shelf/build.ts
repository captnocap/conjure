import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { painted } from './face';

type Clown = 'whiteface' | 'auguste' | 'tramp' | 'pierrot';
const NAMES = ['COCO', 'BOBO', 'GRIMALDI', 'ZAZA', 'PIP', 'LOU', 'JOEY', 'BUTTONS', 'FIZZ', 'NONO', 'DINK', 'TWIST', 'POPOV', 'LULU', 'OTTO', 'BLINK', 'RUFUS', 'CHARLIE', 'TATI', 'MIMI', 'BINGO'];
const BRIGHTS = ['#e8452c', '#f2a91e', '#2f9e5b', '#2a6fd0', '#d63c8c', '#7a48c4', '#f0d92e'];

export default defineThing({
  questions: {
    count: choice('How many eggs does the shelf hold?', {
      few: 'A single row of five.',
      dozen: 'A dozen, in two rows.',
      wall: 'About twenty, three crowded rows.',
    }),
    type: choice('Which clown type dominates?', {
      whiteface: 'Whiteface: elegant all-white faces with thin brows, small red mouths and pointed cone hats.',
      auguste: 'Auguste: pink faces with white eye and mouth patches, big red ball noses, tufts of bright hair and silly little hats.',
      tramp: 'Sad tramps: stubbled grey jaws, downturned white mouths, red noses and battered black hats.',
      pierrot: 'Pierrots: white faces under black skullcaps with a single painted tear and a ruffled collar.',
    }),
    flaw: choice('Is anything wrong in the row?', {
      none: 'Every place is filled and every egg whole.',
      cracked: 'One egg is cracked, a dark fracture running down its face.',
      empty: 'One place stands empty: a stand and a name card with no egg.',
    }),
    cards: choice('What is written on the little cards?', {
      names: 'Clown names: COCO, BOBO, BUTTONS.',
      numbers: 'Registration numbers: No. 114, No. 115.',
      dates: 'Years of birth and death.',
      blank: 'Nothing: blank yellowed cards.',
    }),
    feeling: choice('What mood do they give together?', {
      rollcall: 'A cheery roll call: a bright painted cabinet with bunting, every face grinning.',
      memorial: 'A memorial: dark wood, a black ribbon, a candle beside it, the smiles gone gentle.',
      stare: 'An unsettling stare: every egg turned square to you with wide ringed eyes, and one standing outside the glass.',
    }),
    glass: choice('How is the glass front?', {
      shut: 'Closed and clean.',
      open: 'Swung open on its hinge, as if someone is about to add an egg.',
      gone: 'Missing, the eggs open to the dust.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const cols = { few: 5, dozen: 6, wall: 7 }[a.count], rows = { few: 1, dozen: 2, wall: 3 }[a.count];
    const cell = 0.072, rowH = 0.122, depth = 0.085, wall = 0.012;
    const W = cols * cell + wall * 2 + 0.01, H = rows * rowH + wall * 2;
    const foot = 0.02;
    const frameColour = { rollcall: mood.warmth > 0.5 ? '#b8282c' : '#2460a8', memorial: '#2c2220', stare: '#3c4842' }[a.feeling];
    const backColour = { rollcall: '#f1e6c4', memorial: '#8a5a7c', stare: '#c3ccb0' }[a.feeling];
    const frame = s.material(frameColour, { roughness: 0.5 });
    const trim = s.material('#c99d3a', { metalness: 0.7, roughness: 0.35 });

    s.box([W, H, 0.008], [0, foot + H / 2, -depth / 2], s.material(backColour, { roughness: 0.95 }));
    for (const side of [-1, 1]) s.box([wall, H, depth], [side * (W / 2 - wall / 2), foot + H / 2, 0], frame);
    s.box([W + 0.016, wall, depth + 0.012], [0, foot + H - wall / 2, 0], frame);
    for (let r = 0; r < rows; r++) s.box([W + (r === 0 ? 0.016 : -wall * 2), wall, depth + (r === 0 ? 0.012 : -0.006)], [0, foot + wall / 2 + r * rowH, 0], frame);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.ball([0.012, foot, 0.012], [x * (W / 2 - 0.02), foot / 2, z * (depth / 2 - 0.015)], trim, 10);
    const sign = { rollcall: 'CLOWN EGG REGISTER', memorial: 'IN MEMORIAM', stare: 'REGISTER' }[a.feeling];
    s.box([W * 0.7, 0.034, 0.012], [0, foot + H + 0.017, -0.01], frame);
    s.label(sign, W * 0.66, 0.026, [0, foot + H + 0.017, -0.0035], a.feeling === 'rollcall' ? '#7a1c12' : '#d8c9a0', a.feeling === 'rollcall' ? '#f3dc8a' : '#1c1a19');

    const eggProfile: [number, number][] = [[0, 0], [0.012, 0.004], [0.02, 0.016], [0.023, 0.028], [0.02, 0.043], [0.013, 0.055], [0.006, 0.061], [0, 0.062]];
    const eggGeo = new THREE.LatheGeometry(eggProfile.map(([x, y]) => new THREE.Vector2(x, y)), 24);
    const standGeo = new THREE.CylinderGeometry(0.011, 0.014, 0.012, 12);
    const standSkin = s.material('#6a4a2e', { roughness: 0.5 });
    const expr = { rollcall: 1, memorial: 0.3, stare: 0 }[a.feeling];
    const types: Clown[] = ['whiteface', 'auguste', 'tramp', 'pierrot'];
    const total = cols * rows;
    const special = a.flaw === 'none' ? -1 : Math.floor(random() * total);
    const year = () => 1870 + Math.floor(random() * 80);

    const makeEgg = (kind: Clown, cracked: boolean, at: [number, number, number], turn: number) => {
      const egg = new THREE.Group();
      const accent = BRIGHTS[Math.floor(random() * BRIGHTS.length)], accent2 = BRIGHTS[Math.floor(random() * BRIGHTS.length)];
      const flesh = kind === 'auguste' || kind === 'tramp';
      const eyeStyle = a.feeling === 'stare' ? 'ring' : ['dot', 'cross', 'diamond', 'arc'][Math.floor(random() * 4)];
      const smile = kind === 'tramp' ? -0.8 + expr * 0.3 : kind === 'pierrot' ? expr * 0.4 - 0.2 : expr;
      const tex = painted(256, 160, (ctx, _X, _Y, CW, CH) => {
        const cx = CW / 2, yv = (v: number) => (1 - v) * CH;
        const aged = mood.wear * 0.25;
        ctx.fillStyle = flesh ? '#f2c7a4' : '#faf7ee'; ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = `rgba(150,120,70,${aged})`; ctx.fillRect(0, 0, CW, CH);
        if (kind === 'auguste') {
          ctx.fillStyle = '#fbf8f0';
          for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + side * 21, yv(0.57), 15, 19, 0, 0, Math.PI * 2); ctx.fill(); }
          ctx.beginPath(); ctx.ellipse(cx, yv(0.31), 34, 17, 0, 0, Math.PI * 2); ctx.fill();
        } else if (kind === 'tramp') {
          ctx.fillStyle = '#55504d'; ctx.beginPath(); ctx.ellipse(cx, yv(0.27), 52, 40, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fbf8f0'; ctx.beginPath(); ctx.ellipse(cx, yv(0.31), 25, 13, 0, 0, Math.PI * 2); ctx.fill();
        } else if (kind === 'pierrot') {
          ctx.fillStyle = '#141214'; ctx.fillRect(0, 0, CW, yv(0.74));
          ctx.beginPath(); ctx.moveTo(cx - 16, yv(0.74)); ctx.lineTo(cx, yv(0.66)); ctx.lineTo(cx + 16, yv(0.74)); ctx.fill();
        } else {
          ctx.fillStyle = accent;
          for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + side * 30, yv(0.42), 7, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.strokeStyle = ctx.fillStyle = '#141214'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        for (const side of [-1, 1]) {
          const ex = cx + side * 20, ey = yv(0.56);
          if (eyeStyle === 'ring') { ctx.fillStyle = '#fbf8f0'; ctx.beginPath(); ctx.arc(ex, ey, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#141214'; ctx.beginPath(); ctx.arc(ex, ey, 3.2, 0, Math.PI * 2); ctx.fill(); }
          else if (eyeStyle === 'cross') { ctx.beginPath(); ctx.moveTo(ex, ey - 10); ctx.lineTo(ex, ey + 10); ctx.moveTo(ex - 8, ey); ctx.lineTo(ex + 8, ey); ctx.stroke(); }
          else if (eyeStyle === 'diamond') { ctx.fillStyle = accent2; ctx.beginPath(); ctx.moveTo(ex, ey - 13); ctx.lineTo(ex + 7, ey); ctx.lineTo(ex, ey + 13); ctx.lineTo(ex - 7, ey); ctx.fill(); ctx.fillStyle = '#141214'; ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI * 2); ctx.fill(); }
          else if (eyeStyle === 'arc') { ctx.beginPath(); ctx.arc(ex, ey + 3, 8, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
          else { ctx.beginPath(); ctx.arc(ex, ey, 4.5, 0, Math.PI * 2); ctx.fill(); }
          ctx.beginPath(); ctx.arc(ex, ey - (kind === 'tramp' ? 6 : 12), 13, Math.PI * (side > 0 ? 1.2 : 1.35) + (kind === 'tramp' ? side * 0.3 : 0), Math.PI * (side > 0 ? 1.65 : 1.8) + (kind === 'tramp' ? side * 0.3 : 0)); ctx.stroke();
        }
        if (kind === 'pierrot') { ctx.beginPath(); ctx.moveTo(cx - 20, yv(0.5)); ctx.quadraticCurveTo(cx - 26, yv(0.42), cx - 20, yv(0.4)); ctx.quadraticCurveTo(cx - 14, yv(0.42), cx - 20, yv(0.5)); ctx.fill(); }
        ctx.strokeStyle = kind === 'pierrot' ? '#141214' : '#cf1f24'; ctx.lineWidth = kind === 'auguste' ? 8 : 5;
        const mw = kind === 'auguste' ? 26 : kind === 'whiteface' || kind === 'pierrot' ? 11 : 18;
        ctx.beginPath(); ctx.moveTo(cx - mw, yv(0.33) - smile * 5); ctx.quadraticCurveTo(cx, yv(0.33) + smile * 13, cx + mw, yv(0.33) - smile * 5); ctx.stroke();
        if (cracked) {
          ctx.strokeStyle = '#1b1512'; ctx.lineWidth = 3; ctx.lineJoin = 'miter';
          let x = cx + 12, y = 0; ctx.beginPath(); ctx.moveTo(x, y);
          for (let k = 0; k < 9; k++) { x += (random() - 0.55) * 26; y += 10 + random() * 14; ctx.lineTo(x, y); if (k === 4) { ctx.lineTo(x + 24, y + 12); ctx.moveTo(x, y); } }
          ctx.stroke();
          ctx.fillStyle = '#1b1512'; ctx.beginPath(); ctx.moveTo(cx + 2, 0); ctx.lineTo(cx + 14, 30); ctx.lineTo(cx + 30, 12); ctx.lineTo(cx + 34, 0); ctx.fill();
        }
      });
      const shell = new THREE.Mesh(eggGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: mix(0.35, 0.6, mood.wear) }));
      shell.rotation.y = Math.PI; shell.position.y = 0.011;
      egg.add(shell, new THREE.Mesh(standGeo, standSkin));
      egg.children[1].position.y = 0.006;
      const bit = (geometry: THREE.BufferGeometry, colour: string, x: number, y: number, z: number, rough = 0.7) => { const m = new THREE.Mesh(geometry, s.material(colour, { roughness: rough })); m.position.set(x, y + 0.011, z); egg.add(m); return m; };
      if (kind === 'auguste' || kind === 'tramp') bit(new THREE.SphereGeometry(kind === 'auguste' ? 0.0065 : 0.0048, 10, 8), '#d8201f', 0, 0.029, 0.0245, 0.3);
      if (kind === 'auguste') {
        for (const side of [-1, 1]) for (let k = 0; k < 2; k++) bit(new THREE.IcosahedronGeometry(0.0095 - k * 0.002, 1), accent, side * (0.021 + k * 0.004), 0.044 + k * 0.008, -0.002, 1);
        const hat = bit(new THREE.CylinderGeometry(0.007, 0.008, 0.012, 10), accent2, 0.004, 0.066, 0); hat.rotation.z = -0.25;
        bit(new THREE.CylinderGeometry(0.013, 0.013, 0.002, 12), accent2, 0.0025, 0.0605, 0).rotation.z = -0.25;
      } else if (kind === 'whiteface') {
        bit(new THREE.ConeGeometry(0.011, 0.032, 12), random() < 0.5 ? '#f6f2e6' : accent, 0, 0.074, 0);
        bit(new THREE.SphereGeometry(0.004, 8, 6), accent2, 0, 0.092, 0);
        bit(new THREE.SphereGeometry(0.003, 8, 6), accent2, 0, 0.07, 0.0085);
      } else if (kind === 'tramp') {
        const crown = bit(new THREE.SphereGeometry(0.014, 12, 8), '#1d1b1c', 0, 0.062, 0, 0.95); crown.scale.set(1, 0.75, 1); crown.rotation.z = 0.2;
        bit(new THREE.CylinderGeometry(0.02, 0.021, 0.002, 14), '#1d1b1c', 0, 0.057, 0, 0.95).rotation.z = 0.12;
      } else {
        const ruff = bit(new THREE.TorusGeometry(0.019, 0.006, 6, 18), '#f6f2e6', 0, 0.006, 0); ruff.rotation.x = Math.PI / 2; ruff.scale.z = 0.7;
      }
      egg.traverse((n) => { n.castShadow = n.receiveShadow = true; });
      egg.position.set(...at); egg.rotation.y = turn;
      s.root.add(egg);
    };
    const pick = (): Clown => (random() < 0.72 ? a.type : types[Math.floor(random() * 4)]);

    let n = 0;
    for (let r = rows - 1; r >= 0; r--)
      for (let c = 0; c < cols; c++, n++) {
        const x = (c - (cols - 1) / 2) * cell, y = foot + wall + r * rowH, z = -0.006;
        const empty = a.flaw === 'empty' && n === special;
        if (empty) { const lone = s.mesh(standGeo, standSkin, [x, y + 0.006, z]); lone.castShadow = true; }
        else makeEgg(pick(), a.flaw === 'cracked' && n === special, [x, y, z], a.feeling === 'stare' ? 0 : (random() - 0.5) * 0.7);
        const text = a.cards === 'names' ? NAMES[(n + Math.floor(context.seed % 21)) % 21] : a.cards === 'numbers' ? `No. ${100 + n * 3 + Math.floor(random() * 3)}` : a.cards === 'dates' ? (() => { const b = year(); return `${b}-${b + 40 + Math.floor(random() * 45)}`; })() : ' ';
        const card = s.label(text, cell * 0.72, 0.014, [x, y + 0.008, depth / 2 - 0.016], '#2a211a', empty ? '#d9cfae' : '#f0e8cf');
        card.rotation.x = -0.3;
      }

    // Glass front.
    if (a.glass !== 'gone') {
      const pane = new THREE.Group();
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(W - wall * 2, H - wall * 2), new THREE.MeshPhysicalMaterial({ color: '#dff0f4', transparent: true, opacity: 0.12, roughness: 0.03, depthWrite: false, side: THREE.DoubleSide }));
      glass.position.set((W - wall * 2) / 2, 0, 0);
      pane.add(glass);
      for (const [dx, wdt] of [[0.3, 0.05], [0.42, 0.02]] as const) { const glare = new THREE.Mesh(new THREE.PlaneGeometry(wdt * W, H * 1.1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide })); glare.position.set(W * dx, 0, 0.0005); glare.rotation.z = -0.5; glare.scale.y = 0.8; pane.add(glare); }
      for (const [bw, bh, bx, by] of [[W - wall * 2, 0.006, (W - wall * 2) / 2, H / 2 - wall - 0.003], [W - wall * 2, 0.006, (W - wall * 2) / 2, -H / 2 + wall + 0.003], [0.006, H - wall * 2, 0.003, 0], [0.006, H - wall * 2, W - wall * 2 - 0.003, 0]] as const) { const bar = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.006), frame); bar.position.set(bx, by, 0); bar.castShadow = true; pane.add(bar); }
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), trim); knob.position.set(W - wall * 2 - 0.004, 0, 0.008); pane.add(knob);
      pane.position.set(-(W - wall * 2) / 2, foot + H / 2, depth / 2 + 0.003);
      if (a.glass === 'open') pane.rotation.y = -0.7 - random() * 0.3;
      s.root.add(pane);
    }

    if (a.feeling === 'rollcall') {
      const y = foot + H + 0.006;
      for (let k = 0; k < cols * 2; k++) { const x = -W / 2 + (k + 0.5) * W / (cols * 2); const flag = s.mesh(new THREE.ConeGeometry(0.011, 0.024, 3), s.material(BRIGHTS[k % BRIGHTS.length]), [x, y - 0.012 - Math.sin(k / (cols * 2 - 1) * Math.PI) * 0.006, depth / 2 + 0.008]); flag.rotation.x = Math.PI; flag.scale.z = 0.15; }
    } else if (a.feeling === 'memorial') {
      const black = s.material('#141214', { roughness: 0.6 });
      for (const side of [-1, 1]) { const loop = s.ring(0.016, 0.005, [side * 0.02, foot + H + 0.045, 0.0], black); loop.scale.set(1.3, 0.8, 0.6); s.rod([side * 0.004, foot + H + 0.04, 0.004], [side * 0.03, foot + H - 0.02, depth / 2 + 0.01], 0.004, black); }
      const cx = W / 2 + 0.05;
      s.cylinder(0.014, 0.014, 0.07 * mix(1, 0.5, mood.wear), [cx, 0.035 * mix(1, 0.5, mood.wear), 0.03], s.material('#efe8d2', { roughness: 0.5 }), 12);
      s.cylinder(0.024, 0.028, 0.006, [cx, 0.003, 0.03], trim, 14);
      s.ball([0.005, 0.011, 0.005], [cx, 0.07 * mix(1, 0.5, mood.wear) + 0.012, 0.03], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffa52e', emissiveIntensity: 1.6 }), 8);
    } else {
      makeEgg(pick(), false, [(random() - 0.5) * W * 0.5, 0, depth / 2 + 0.07], 0);
    }
    return s.finish();
  },
});
