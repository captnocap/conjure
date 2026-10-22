import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const LISTS = {
  hubs: 'The great hubs: LONDON, FRANKFURT, DUBAI, SINGAPORE, NEW YORK. Anywhere is reachable from here.',
  regional: 'Small domestic places: OMAHA, BOISE, TULSA, DULUTH. Nobody is flying anywhere glamorous.',
  holiday: 'Package-holiday sun: MALAGA, FARO, TENERIFE, CANCUN, CORFU.',
  renamed: 'Cities under names they no longer use: LENINGRAD, SAIGON, BOMBAY, PEKING. A board from another era.',
  nowhere: 'Places that are not places: NOWHERE, ELSEWHERE, YESTERDAY, HOME, TOO LATE.',
  onecity: 'Every single row lists the same city. There is only one way out.',
} as const;
const CITIES: Record<Exclude<keyof typeof LISTS, 'onecity'>, string[]> = {
  hubs: ['LONDON', 'FRANKFURT', 'DUBAI', 'SINGAPORE', 'NEW YORK', 'CHICAGO', 'TOKYO', 'ATLANTA', 'PARIS', 'AMSTERDAM', 'ISTANBUL', 'DOHA'],
  regional: ['OMAHA', 'BOISE', 'TULSA', 'FRESNO', 'SPOKANE', 'EL PASO', 'DULUTH', 'WICHITA', 'DAYTON', 'BILLINGS', 'FARGO', 'LUBBOCK'],
  holiday: ['MALAGA', 'FARO', 'TENERIFE', 'ANTALYA', 'CANCUN', 'PALMA', 'CORFU', 'PHUKET', 'ALICANTE', 'HERAKLION', 'LANZAROTE', 'MARRAKECH'],
  renamed: ['LENINGRAD', 'SAIGON', 'RANGOON', 'BOMBAY', 'PEKING', 'SALISBURY', 'DANZIG', 'CALCUTTA', 'MADRAS', 'STALINGRAD', 'BATAVIA', 'LEOPOLDVILLE'],
  nowhere: ['NOWHERE', 'ELSEWHERE', 'HOME', 'YESTERDAY', 'TOO LATE', 'ANYWHERE', 'BEFORE', 'SOMEDAY', 'THE COAST', 'BACK', 'AWAY', 'NEXT YEAR'],
};
const STYLES = {
  white: 'White letters on black flaps in a charcoal cabinet, the classic.',
  yellow: 'Yellow letters on black flaps, an Italian railway hall.',
  cream: 'Cream letters on navy flaps in a cream enamel cabinet, mid-century.',
  amber: 'Amber letters on dark brown flaps in a wood-trimmed cabinet, 1970s.',
  green: 'Pale green letters on black in a brushed-steel cabinet, cold and technical.',
} as const;
const STYLE: Record<keyof typeof STYLES, { ink: string; flap: string; cabinet: string; metal: number }> = {
  white: { ink: '#f2f2ea', flap: '#17181a', cabinet: '#3a3d42', metal: 0.3 },
  yellow: { ink: '#f5cf3a', flap: '#141414', cabinet: '#2a2c30', metal: 0.3 },
  cream: { ink: '#f3e8c8', flap: '#1c2a4a', cabinet: '#d9d2bd', metal: 0.05 },
  amber: { ink: '#ffa53a', flap: '#2a1c14', cabinet: '#6b4a2e', metal: 0.05 },
  green: { ink: '#b5f2c2', flap: '#101614', cabinet: '#a9b0b4', metal: 0.8 },
};
const ALPHABET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:';
const COLS = 28, TIME = 0, DEST = 6, STATUS = 19;
const CW = 34, CH = 50, PAD = 14, HEAD = 62;

export default defineThing({
  questions: {
    flights: choice('Which flights are listed?', LISTS),
    trouble: score('How many rows read CANCELLED or DELAYED?', ['None: every flight on time', 'One or two delayed', 'Half the board delayed, some cancelled', 'Every single row CANCELLED']),
    flipping: noul('Is a row caught mid-flip, its letters scrambled as it changes?'),
    rows: choice('How many rows does the board have?', {
      four: 'Four rows: a small board for a quiet gate.',
      six: 'Six rows.',
      eight: 'Eight rows: a tall main-hall board.',
    }),
    style: choice('What do the flaps and cabinet look like?', STYLES),
    header: choice('What does the header say?', {
      departures: 'DEPARTURES',
      arrivals: 'ARRIVALS',
      partenze: 'PARTENZE, the Italian hall.',
      abflug: 'ABFLUG, the German one.',
      blank: 'Nothing: the header strip has gone dark.',
    }),
    crown: choice('What sits on top of the cabinet?', {
      clock: 'A round analogue clock.',
      lamps: 'A row of small coloured signal lamps.',
      nothing: 'Nothing, a flat top.',
      bird: 'A pigeon that got into the terminal.',
    }),
    stand: choice('How does it stand?', {
      posts: 'On two steel posts with flat feet.',
      plinth: 'On a solid boxed plinth.',
      wheels: 'On a wheeled A-frame, parked wherever it was needed.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rows = { four: 4, six: 6, eight: 8 }[a.rows];
    const st = STYLE[a.style];
    const pickFrom = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // What the board says.
    const pool = a.flights === 'onecity' ? [pickFrom(CITIES.hubs)] : CITIES[a.flights].slice();
    const draw = () => (pool.length > 1 ? pool.splice(Math.floor(random() * pool.length), 1)[0] : pool[0]);
    const pCancel = a.trouble * a.trouble;
    const pDelay = Math.min(1 - pCancel, a.trouble * 0.95);
    const status = () => {
      const r = random();
      if (r < pCancel) return 'CANCELLED';
      if (r < pCancel + pDelay) return 'DELAYED';
      return pickFrom(['ON TIME', 'ON TIME', 'BOARDING', 'GATE OPEN', 'LAST CALL', 'DEPARTED', 'GO TO GATE']);
    };
    let clockMinutes = 240 + Math.floor(random() * 50);
    const line = () => {
      clockMinutes += 5 + Math.floor(random() * 35);
      const hh = String(Math.floor(clockMinutes / 60) % 24).padStart(2, '0'), mm = String(clockMinutes % 60).padStart(2, '0');
      const text = new Array<string>(COLS).fill(' ');
      [...`${hh}:${mm}`].forEach((ch, i) => (text[TIME + i] = ch));
      [...draw().slice(0, 12)].forEach((ch, i) => (text[DEST + i] = ch));
      [...status()].forEach((ch, i) => (text[STATUS + i] = ch));
      return text;
    };
    const target = Array.from({ length: rows }, line);
    const shown = target.map((row) => row.slice());
    // Flaps that stick: a wrong letter here and there on a tired machine.
    for (let k = 0; k < Math.round(mood.wear * rows * 1.2); k++) {
      const r = Math.floor(random() * rows), c = DEST + Math.floor(random() * 20);
      shown[r][c] = target[r][c] = pickFrom([...ALPHABET]);
    }
    const tint = (row: string[]) => {
      const text = row.slice(STATUS).join('');
      return text.startsWith('CANCELLED') ? '#e0372c' : text.startsWith('DELAYED') ? '#f0a020' : '#3fd070';
    };

    // The face is one painted canvas; only changed cells are repainted.
    const canvas = document.createElement('canvas');
    canvas.width = COLS * CW + PAD * 2;
    canvas.height = HEAD + rows * (CH + 8) + PAD;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0c0d0e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const headerText = { departures: 'DEPARTURES', arrivals: 'ARRIVALS', partenze: 'PARTENZE', abflug: 'ABFLUG', blank: '' }[a.header];
    ctx.fillStyle = st.ink;
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(headerText, PAD + 2, 24);
    ctx.font = 'bold 15px sans-serif';
    ctx.globalAlpha = 0.75;
    if (headerText) {
      ctx.fillText('TIME', PAD + TIME * CW + 2, 52);
      ctx.fillText('DESTINATION', PAD + DEST * CW + 2, 52);
      ctx.fillText('REMARKS', PAD + STATUS * CW + 2, 52);
    }
    ctx.globalAlpha = 1;
    const glyph = (ch: string, x: number, y: number, clipTop: boolean | null, alpha = 1) => {
      ctx.save();
      if (clipTop !== null) { ctx.beginPath(); ctx.rect(x, clipTop ? y : y + CH / 2, CW, CH / 2); ctx.clip(); }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = st.ink;
      ctx.font = 'bold 40px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ch, x + CW / 2, y + CH / 2 + 2);
      ctx.restore();
    };
    const cell = (r: number, c: number, mid = false) => {
      const x = PAD + c * CW, y = HEAD + r * (CH + 8);
      ctx.fillStyle = '#0c0d0e';
      ctx.fillRect(x, y - 2, CW, CH + 4);
      if (c === TIME + 5 || c === DEST + 12) return;
      ctx.fillStyle = st.flap;
      ctx.fillRect(x + 1.5, y, CW - 3, CH);
      const ch = shown[r][c];
      if (mid) {
        // Half of the next letter above, half of the last below, and the pale edge of a falling flap.
        glyph(ALPHABET[(ALPHABET.indexOf(ch) + 1) % ALPHABET.length], x, y, true);
        glyph(ch, x, y, false, 0.8);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(x + 1.5, y + CH * (0.2 + ((r * 7 + c * 13) % 5) * 0.11), CW - 3, 3);
      } else glyph(ch, x, y, null);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + 1.5, y + CH / 2 - 1, CW - 3, 2);
    };
    const flipRow = a.flipping ? Math.floor(random() * rows) : -1;
    // Per cell: how many flaps it still has to fall, and a delay so the change ripples left to right.
    const todo = shown.map((row) => row.map(() => 0));
    const delay = shown.map((row) => row.map(() => 0));
    const start = (r: number, text: string[]) => {
      target[r] = text;
      for (let c = 0; c < COLS; c++) if (shown[r][c] !== text[c] || random() < 0.3) { todo[r][c] = 4 + Math.floor(random() * 14); delay[r][c] = c * 0.8 + random() * 3; }
    };
    if (flipRow >= 0) {
      start(flipRow, line());
      for (let c = 0; c < COLS; c++) { delay[flipRow][c] = 0; if (c > 3 && random() < 0.85) { todo[flipRow][c] = Math.max(todo[flipRow][c], 6 + Math.floor(random() * 10)); shown[flipRow][c] = pickFrom([...ALPHABET]); } }
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) cell(r, c, todo[r][c] > 0);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;

    // Cabinet.
    const faceW = 2.7, faceH = faceW * canvas.height / canvas.width;
    const W = faceW + 0.16, H = faceH + 0.16, D = 0.34;
    const base = a.stand === 'plinth' ? 0.85 : a.stand === 'wheels' ? 0.75 : 1.05;
    const yc = base + H / 2;
    const cabinet = s.material(st.cabinet, { metalness: st.metal, roughness: 0.45 });
    const dark = s.material('#1b1d20', { roughness: 0.6 });
    const steel = s.material('#9aa1a6', { metalness: 0.8, roughness: 0.35 });
    s.box([W, H, D], [0, yc, 0], cabinet);
    s.box([W + 0.04, 0.05, D + 0.05], [0, base + H + 0.01, 0], a.style === 'amber' ? s.material('#3d2817') : dark);
    s.box([faceW + 0.05, faceH + 0.05, 0.02], [0, yc, D / 2 - 0.005], dark);
    const face = s.mesh(new THREE.PlaneGeometry(faceW, faceH), new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: mix(0.25, 0.6, mood.cheer), roughness: 0.6 }), [0, yc, D / 2 + 0.007]);
    face.castShadow = false;
    // Louvres on the back so it is a machine from behind too.
    for (let i = 0; i < 6; i++) s.box([W * 0.5, 0.02, 0.012], [0, yc - 0.12 + i * 0.05, -D / 2 - 0.004], dark);
    s.box([0.3, 0.2, 0.03], [W * 0.32, yc - H * 0.2, -D / 2 - 0.012], steel);

    // A status lamp at the end of each row.
    const unit = faceW / canvas.width;
    const rowY = (r: number) => yc + faceH / 2 - (HEAD + r * (CH + 8) + CH / 2) * unit;
    const lamps = target.map((row, r) => {
      const material = new THREE.MeshStandardMaterial({ color: tint(row), emissive: tint(row), emissiveIntensity: 0.9, roughness: 0.4 });
      s.mesh(new THREE.SphereGeometry(0.026, 12, 8), material, [faceW / 2 + 0.035, rowY(r), D / 2 + 0.012]).castShadow = false;
      return material;
    });

    // Real flaps caught in the air on the changing row.
    const slivers: THREE.Mesh[] = [];
    const sliverMat = s.material(st.flap, { roughness: 0.5, side: THREE.DoubleSide });
    for (let k = 0; k < 10; k++) {
      const flap = s.mesh(new THREE.PlaneGeometry(CW * unit * 0.86, CH * unit * 0.48), sliverMat);
      flap.geometry.translate(0, -CH * unit * 0.24, 0);
      flap.visible = false;
      slivers.push(flap);
    }
    const perch = (r: number) => {
      const busy: number[] = [];
      for (let c = 0; c < COLS; c++) if (r >= 0 && todo[r][c] > 0 && delay[r][c] <= 0) busy.push(c);
      slivers.forEach((flap, k) => {
        flap.visible = k < busy.length;
        if (!flap.visible) return;
        const c = busy[Math.floor((k / slivers.length) * busy.length)];
        flap.position.set(-faceW / 2 + (PAD + c * CW + CW / 2) * unit, rowY(r), D / 2 + 0.01);
        flap.rotation.x = -0.4 - ((k * 37) % 10) * 0.1;
      });
    };
    perch(flipRow);

    // Crown.
    const top = base + H + 0.035;
    if (a.crown === 'clock') {
      const clock = document.createElement('canvas');
      clock.width = clock.height = 256;
      const c2 = clock.getContext('2d')!;
      c2.fillStyle = '#f4f1e4'; c2.beginPath(); c2.arc(128, 128, 124, 0, 7); c2.fill();
      c2.strokeStyle = '#15171a'; c2.lineCap = 'round';
      for (let i = 0; i < 12; i++) { const t = i * Math.PI / 6; c2.lineWidth = i % 3 ? 5 : 10; c2.beginPath(); c2.moveTo(128 + Math.sin(t) * 98, 128 - Math.cos(t) * 98); c2.lineTo(128 + Math.sin(t) * 114, 128 - Math.cos(t) * 114); c2.stroke(); }
      const minutes = 240 + Math.floor(random() * 45);
      const hand = (turn: number, length: number, width: number) => { c2.lineWidth = width; c2.beginPath(); c2.moveTo(128, 128); c2.lineTo(128 + Math.sin(turn) * length, 128 - Math.cos(turn) * length); c2.stroke(); };
      hand((minutes / 720) * Math.PI * 2, 60, 12);
      hand(((minutes % 60) / 60) * Math.PI * 2, 92, 8);
      const clockMap = new THREE.CanvasTexture(clock);
      clockMap.colorSpace = THREE.SRGBColorSpace;
      const drum = s.cylinder(0.24, 0.24, 0.14, [0, top + 0.25, 0], cabinet, 32);
      drum.rotation.x = Math.PI / 2;
      for (const side of [1, -1]) {
        const dial = s.mesh(new THREE.CircleGeometry(0.215, 32), new THREE.MeshStandardMaterial({ map: clockMap, emissive: '#ffffff', emissiveMap: clockMap, emissiveIntensity: 0.3, roughness: 0.5 }), [0, top + 0.25, side * 0.072]);
        dial.rotation.y = side === 1 ? 0 : Math.PI;
        dial.castShadow = false;
      }
      s.box([0.12, 0.04, 0.12], [0, top + 0.01, 0], dark);
    } else if (a.crown === 'lamps') {
      const hues = ['#e0372c', '#f0a020', '#3fd070', '#3a8fe0', '#f2f2ea'];
      for (let i = 0; i < 7; i++) {
        const on = random() < mix(0.35, 0.9, mood.cheer);
        const colour = hues[i % hues.length];
        s.cylinder(0.04, 0.045, 0.03, [-0.75 + i * 0.25, top + 0.015, 0], dark, 12);
        s.ball([0.04, 0.05, 0.04], [-0.75 + i * 0.25, top + 0.055, 0], new THREE.MeshStandardMaterial({ color: on ? colour : '#4a4a48', emissive: on ? colour : '#000000', emissiveIntensity: 0.9, roughness: 0.3 }), 12);
      }
    } else if (a.crown === 'bird') {
      const grey = s.material('#7f858c', { roughness: 0.9 });
      const bx = (random() - 0.5) * (W - 0.6), turn = random() < 0.5 ? 1 : -1;
      s.ball([0.09, 0.065, 0.06], [bx, top + 0.085, 0], grey, 12);
      s.ball([0.038, 0.04, 0.036], [bx + turn * 0.075, top + 0.15, 0], s.material('#5d6a72', { roughness: 0.8 }), 10);
      s.rod([bx + turn * 0.105, top + 0.148, 0], [bx + turn * 0.14, top + 0.14, 0], 0.01, s.material('#d8a13c'), 0.002);
      s.rod([bx - turn * 0.07, top + 0.08, 0], [bx - turn * 0.17, top + 0.05, 0], 0.03, grey, 0.012);
      for (const z of [-0.02, 0.02]) s.rod([bx, top, z], [bx, top + 0.04, z], 0.006, s.material('#c56a5a'));
    }

    // Stand.
    if (a.stand === 'posts') {
      for (const x of [-W / 2 + 0.3, W / 2 - 0.3]) {
        s.box([0.1, base, 0.1], [x, base / 2, 0], steel);
        s.box([0.16, 0.04, 0.95], [x, 0.02, 0], steel);
        s.rod([x, 0.04, 0.4], [x, 0.45, 0.04], 0.018, steel);
        s.rod([x, 0.04, -0.4], [x, 0.45, -0.04], 0.018, steel);
      }
      s.box([W - 0.6, 0.05, 0.05], [0, 0.3, 0], steel);
    } else if (a.stand === 'plinth') {
      s.box([W * 0.86, base - 0.08, D + 0.14], [0, (base - 0.08) / 2, 0], cabinet);
      s.box([W * 0.9, 0.08, D + 0.2], [0, 0.04, 0], dark);
      s.box([W * 0.5, 0.08, D * 0.8], [0, base - 0.04, 0], dark);
      s.label(headerText || 'INFORMATION', 1.1, 0.16, [0, base * 0.55, D / 2 + 0.073], st.ink, '#1b1d20');
    } else {
      for (const x of [-W / 2 + 0.2, W / 2 - 0.2]) {
        s.rod([x, base + 0.05, 0], [x, 0.12, 0.5], 0.03, steel);
        s.rod([x, base + 0.05, 0], [x, 0.12, -0.5], 0.03, steel);
        s.rod([x, 0.4, 0.33], [x, 0.4, -0.33], 0.02, steel);
        for (const z of [-0.5, 0.5]) { const wheel = s.cylinder(0.07, 0.07, 0.05, [x, 0.07, z], dark, 16); wheel.rotation.z = Math.PI / 2; }
      }
      s.rod([-W / 2 + 0.2, 0.4, 0], [W / 2 - 0.2, 0.4, 0], 0.02, steel);
      // Its power lead, trailing off to a socket somewhere.
      s.tube([[W / 2 - 0.3, base, -D / 2], [W / 2 - 0.1, 0.3, -0.5], [W / 2 + 0.1, 0.015, -0.6], [W / 2 + 0.3, 0.012, -0.3 - random() * 0.3]], 0.012, dark);
    }

    // The clatter: cells flap toward their target, and now and then a row is rewritten.
    let tick = 0, rest = mix(9, 1.5, mood.energy) * (0.5 + random()), active = flipRow, seed = context.seed >>> 0;
    const chance = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const update = (dt: number) => {
      tick += dt;
      const step = mix(0.11, 0.045, mood.energy);
      if (tick < step) return;
      tick = 0;
      let dirty = false, busy = false;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < COLS; c++) {
          if (todo[r][c] <= 0) continue;
          busy = true;
          if (delay[r][c] > 0) { delay[r][c] -= 1; continue; }
          todo[r][c] -= 1;
          shown[r][c] = todo[r][c] === 0 ? target[r][c] : ALPHABET[(ALPHABET.indexOf(shown[r][c]) + 1) % ALPHABET.length];
          cell(r, c, todo[r][c] > 0);
          dirty = true;
        }
      if (!busy) {
        rest -= step;
        if (active >= 0) { lamps[active].color.set(tint(target[active])); lamps[active].emissive.set(tint(target[active])); active = -1; perch(-1); }
        if (rest <= 0) {
          rest = mix(9, 1.5, mood.energy) * (0.5 + chance());
          active = Math.floor(chance() * rows);
          const next = target[active].slice();
          const word = chance() < pCancel ? 'CANCELLED' : chance() < pDelay ? 'DELAYED' : ['ON TIME', 'BOARDING', 'LAST CALL', 'DEPARTED'][Math.floor(chance() * 4)];
          for (let c = STATUS; c < COLS; c++) next[c] = word[c - STATUS] ?? ' ';
          target[active] = next;
          for (let c = 0; c < COLS; c++) if (shown[active][c] !== next[c]) { todo[active][c] = 4 + Math.floor(chance() * 12); delay[active][c] = (c - STATUS) * 0.8; }
        }
      } else if (active >= 0) perch(active);
      if (dirty) map.needsUpdate = true;
    };

    return s.finish({ update });
  },
});
