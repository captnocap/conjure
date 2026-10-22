import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const LEGENDS = {
  reactor: ['ROD DRIVE|FAULT', 'HI NEUTRON|FLUX', 'COOLANT|LO FLOW', 'CORE TEMP|HIGH', 'SCRAM', 'PRESS|HI-HI', 'FEEDWATER|LOW', 'PUMP 2|TRIP', 'CONTAIN|ISOL', 'RAD MON|HIGH', 'STEAM GEN|LEVEL', 'DIESEL|START', 'TURBINE|TRIP', 'BUS A|UNDERVOLT'],
  ship: ['BILGE|HIGH', 'ENGINE RM|FIRE', 'LUBE OIL|LO PRESS', 'STEERING|FAIL', 'FLOODING|HOLD 2', 'SHAFT BRG|HOT', 'FUEL|LOW', 'GEN 1|TRIP', 'WT DOOR|OPEN', 'JACKET|HI TEMP', 'GYRO|FAIL', 'ABANDON', 'SMOKE|GALLEY', 'AIR START|LOW'],
  boiler: ['LOW|WATER', 'HI STEAM|PRESS', 'FLAME|FAILURE', 'FD FAN|TRIP', 'DRUM|LEVEL', 'FUEL OIL|LO TEMP', 'STACK|HI TEMP', 'SAFETY|LIFTED', 'FEED PUMP|TRIP', 'PURGE|REQD', 'GAS|LEAK', 'DEAERATOR|LOW', 'CONDENSATE|HIGH', 'AIR|LO PRESS'],
  flight: ['MASTER|ALARM', 'O2|PRESS', 'CRYO|PRESS', 'MAIN BUS|B UNDERV', 'FUEL|CELL 1', 'CABIN|PRESS', 'GIMBAL|LOCK', 'ABORT', 'CO2|HIGH', 'SUIT|COMP', 'H2|TANK', 'UPLINK|LOST', 'ENGINE|FIRE', 'HYD|LOW'],
  blank: ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
} as const;
const COLOURS = { red: '#ff3a26', amber: '#ffb12a', white: '#fff3d2', green: '#3fe07a', blue: '#57b4ff' };
const FINISH = { grey: '#8f9695', cream: '#e3dabd', eau: '#b9cfba', black: '#2c2e31', yellow: '#dcae22' };

export default defineThing({
  questions: {
    lit: score('How many of the alarm windows are lit?', ['None: the whole board is dark', 'A single window', 'A handful scattered about', 'Half the board', 'Every window at once']),
    colour: choice('What colour are the lit windows?', {
      red: 'Red: trips, danger, act now.',
      amber: 'Amber: cautions and warnings.',
      white: 'Plain warm white, status rather than danger.',
      mixed: 'Mixed by priority: red, amber and white together.',
      green: 'Green: everything it reports is normal.',
      blue: 'Cold blue, strange and unfamiliar.',
    }),
    attention: choice('Have the alarms been acknowledged?', {
      steady: 'Yes: the windows burn steadily, acknowledged and waiting to clear.',
      flashing: 'No: every lit window is flashing and the acknowledge button is lit, demanding a hand.',
      first: 'One first-out window is flashing among steady ones: the alarm that started it all.',
    }),
    horn: choice('What is the klaxon horn doing?', {
      silent: 'Silent on its bracket, beacon dark.',
      sounding: 'Sounding: the beacon is lit and the horn is blaring.',
      muffled: 'Muffled: somebody has stuffed a rag into the bell and taped it up.',
      dangling: 'Torn off its bracket and hanging by its cable.',
    }),
    size: choice('How big is the board?', {
      small: 'Nine large windows, three by three.',
      medium: 'Thirty windows in a tidy block.',
      large: 'Eighty small windows, a wall of possible trouble.',
    }),
    mount: choice('How is it mounted?', {
      pedestal: 'On a steel pedestal post, standing alone at eye level.',
      wall: 'Bolted to a slab of painted wall with conduit running to it.',
      cabinet: 'Built into the top of a floor-standing steel cabinet with a louvred door.',
    }),
    legend: choice('What do the engraved legends warn about?', {
      reactor: 'A reactor: rod drives, coolant flow, neutron flux, scram.',
      ship: 'A ship: bilges, engine room fire, steering, flooding.',
      boiler: 'A boiler house: low water, steam pressure, flame failure.',
      flight: 'A spacecraft or aircraft: master alarm, oxygen, cabin pressure, abort.',
      blank: 'Nothing: the windows are blank milky glass.',
    }),
    tampered: choice('Has anyone interfered with the windows?', {
      none: 'No, the board is as built.',
      taped: 'One window is taped over with a handwritten note stuck across it.',
      tagged: 'Several windows carry dangling paper out-of-service tags.',
      broken: 'A few lenses are missing, leaving dark holes with bare bulbs.',
    }),
    finish: choice('What colour is the frame?', {
      grey: 'Hammered industrial grey.', cream: 'Cream enamel.', eau: 'Pale green enamel.', black: 'Black crackle paint.', yellow: 'Safety yellow.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [cols, rows, tw, th] = ({ small: [3, 3, 0.3, 0.19], medium: [6, 5, 0.19, 0.12], large: [10, 8, 0.13, 0.085] } as const)[a.size];
    const GW = cols * tw, GH = rows * th, N = cols * rows;
    const PW = GW + 0.14, PH = GH + 0.3, PD = 0.2;
    const frame = s.material(FINISH[a.finish], { roughness: 0.5, metalness: 0.2 });
    const dark = s.material('#1d2022', { roughness: 0.6 });
    const chrome = s.material('#d2d6d7', { metalness: 0.85, roughness: 0.25 });
    const cy = a.mount === 'cabinet' ? 1.95 - PH / 2 - 0.04 : 1.42;
    const gy = cy + 0.08, front = PD / 2;

    // Which windows are lit, in what colour, and which are flashing.
    const share = a.lit < 0.25 ? 0 : a.lit < 0.5 ? 0 : a.lit < 0.75 ? mix(0.1, 0.5, (a.lit - 0.5) * 4) : mix(0.5, 1, (a.lit - 0.75) * 4);
    let lit = a.lit < 0.12 ? 0 : a.lit < 0.42 ? 1 : Math.max(2, Math.round(share * N));
    if (a.lit > 0.95) lit = N;
    const order = Array.from({ length: N }, (_unused, i) => i);
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const palette = (): string => {
      if (a.colour !== 'mixed') return COLOURS[a.colour];
      const r = random();
      return r < 0.45 ? COLOURS.red : r < 0.8 ? COLOURS.amber : COLOURS.white;
    };
    const tiles = order.map((_unused, i) => i).map(() => ({ colour: '', flash: false, broken: false, taped: false }));
    order.slice(0, lit).forEach((index, i) => {
      tiles[index].colour = palette();
      tiles[index].flash = a.attention === 'flashing' || (a.attention === 'first' && i === 0);
    });
    if (a.tampered === 'broken') for (let i = 0; i < Math.max(1, Math.round(N * 0.08)); i++) tiles[order[N - 1 - i]].broken = true;
    const tapedIndex = a.tampered === 'taped' ? order[Math.min(lit, N) > 0 ? Math.floor(random() * Math.min(lit, N)) : 0] : -1;
    if (tapedIndex >= 0) tiles[tapedIndex].taped = true;

    const legends = LEGENDS[a.legend];
    const px = Math.round(1024 / cols), py = Math.round(px * th / tw);
    const draw = (mode: 'base' | 'glow' | 'flash') => {
      const canvas = document.createElement('canvas');
      canvas.width = px * cols; canvas.height = py * rows;
      const c = canvas.getContext('2d')!;
      if (mode !== 'flash') { c.fillStyle = mode === 'base' ? '#2a2d2e' : '#000000'; c.fillRect(0, 0, canvas.width, canvas.height); }
      tiles.forEach((tile, index) => {
        const x = (index % cols) * px, y = Math.floor(index / cols) * py;
        const on = tile.colour !== '' && !tile.broken;
        const showLit = on && (mode === 'flash' ? tile.flash : mode === 'glow' ? !tile.flash : !tile.flash);
        if (mode === 'flash' && !showLit) return;
        if (mode === 'glow' && !showLit) return;
        if (tile.broken) {
          if (mode !== 'base') return;
          c.fillStyle = '#121414'; c.fillRect(x + 3, y + 3, px - 6, py - 6);
          c.fillStyle = '#c9c6b4';
          for (const dx of [0.33, 0.67]) { c.beginPath(); c.arc(x + px * dx, y + py * 0.5, py * 0.16, 0, 7); c.fill(); }
          return;
        }
        if (showLit) {
          const glow = c.createRadialGradient(x + px / 2, y + py / 2, 2, x + px / 2, y + py / 2, px * 0.75);
          glow.addColorStop(0, '#ffffff'); glow.addColorStop(0.25, tile.colour); glow.addColorStop(1, tile.colour);
          c.fillStyle = glow;
        } else {
          const tint = 150 - Math.floor(random() * 22 + mood.wear * 30);
          c.fillStyle = `rgb(${tint},${tint - 2},${tint - 16 - Math.floor(mood.wear * 30)})`;
        }
        c.fillRect(x + 3, y + 3, px - 6, py - 6);
        const words = legends[(index * 5 + Math.floor(index / cols)) % legends.length].split('|');
        c.fillStyle = showLit ? '#1c0f0a' : '#24282a';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        const fontSize = Math.min(py * 0.3, px * 0.19);
        c.font = `bold ${fontSize}px sans-serif`;
        words.forEach((word, line) => c.fillText(word, x + px / 2, y + py / 2 + (line - (words.length - 1) / 2) * fontSize * 1.15, px - 12));
        if (tile.taped && mode === 'base') {
          c.fillStyle = 'rgba(214,196,150,0.95)';
          c.save(); c.translate(x + px / 2, y + py / 2); c.rotate(0.5); c.fillRect(-px * 0.7, -py * 0.13, px * 1.4, py * 0.26); c.rotate(-1.0); c.fillRect(-px * 0.7, -py * 0.13, px * 1.4, py * 0.26); c.restore();
        }
      });
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    };
    const baseMap = draw('base'), glowMap = draw('glow'), flashMap = draw('flash');

    // The box, the windows and their bezel grid.
    s.box([PW, PH, PD], [0, cy, 0], frame);
    s.box([PW + 0.03, 0.03, PD + 0.03], [0, cy + PH / 2, 0], frame);
    s.mesh(new THREE.PlaneGeometry(GW, GH), new THREE.MeshStandardMaterial({ map: baseMap, emissiveMap: glowMap, emissive: '#ffffff', emissiveIntensity: mix(0.75, 1.1, mood.cheer), roughness: 0.35 }), [0, gy, front + 0.004]).castShadow = false;
    const flashMaterial = new THREE.MeshBasicMaterial({ map: flashMap, transparent: true, depthWrite: false });
    const flashPlane = s.mesh(new THREE.PlaneGeometry(GW, GH), flashMaterial, [0, gy, front + 0.006]);
    flashPlane.castShadow = flashPlane.receiveShadow = false;
    for (let i = 0; i <= cols; i++) s.box([i === 0 || i === cols ? 0.02 : 0.01, GH + 0.02, 0.024], [-GW / 2 + i * tw, gy, front + 0.008], dark);
    for (let i = 0; i <= rows; i++) s.box([GW + 0.02, i === 0 || i === rows ? 0.02 : 0.01, 0.024], [0, gy - GH / 2 + i * th, front + 0.008], dark);

    const cell = (index: number): [number, number] => [-GW / 2 + (index % cols + 0.5) * tw, gy + GH / 2 - (Math.floor(index / cols) + 0.5) * th];
    if (tapedIndex >= 0) {
      const [x, y] = cell(tapedIndex);
      const note = s.label(mood.cheer > 0.6 ? 'IT LIES' : 'IGNORE', tw * 0.95, th * 0.7, [x + tw * 0.2, y - th * 0.35, front + 0.024], '#1a2a66', '#f2e58f');
      note.rotation.z = (random() - 0.5) * 0.5;
    }
    if (a.tampered === 'tagged') {
      const tagPaper = s.material('#e9d9a6', { roughness: 0.9, side: THREE.DoubleSide });
      const tagRed = s.material('#c8261c', { roughness: 0.8 });
      const n = Math.max(2, Math.round(N * mix(0.08, 0.2, mood.density)));
      for (let i = 0; i < n; i++) {
        const [x, y] = cell(order[(lit + i * 3) % N]);
        const tag = s.box([tw * 0.34, th * 0.95, 0.002], [x + (random() - 0.5) * tw * 0.3, y - th * 0.55, front + 0.026], tagPaper);
        tag.rotation.z = (random() - 0.5) * 0.5;
        s.box([tw * 0.34, th * 0.25, 0.003], [tag.position.x, tag.position.y + th * 0.2, front + 0.027], tagRed).rotation.z = tag.rotation.z;
      }
    }

    // Button strip: acknowledge, silence, test, reset.
    const by = cy - PH / 2 + 0.085;
    const waiting = a.attention !== 'steady' && lit > 0;
    const buttons: [string, string, boolean][] = [['ACK', '#f2c21c', waiting], ['SILENCE', '#26292b', false], ['TEST', '#efece0', false], ['RESET', '#2f9a55', false]];
    const ackMaterial = new THREE.MeshStandardMaterial({ color: '#f2c21c', emissive: '#f2a81c', emissiveIntensity: waiting ? 1.2 : 0.05, roughness: 0.4 });
    buttons.forEach(([name, hex], i) => {
      const x = (i - 1.5) * Math.min(0.22, PW / 4.4);
      const big = i === 0;
      s.box([big ? 0.11 : 0.08, big ? 0.11 : 0.08, 0.012], [x, by - 0.015, front + 0.006], chrome);
      s.box([big ? 0.09 : 0.062, big ? 0.09 : 0.062, 0.03], [x, by - 0.015, front + 0.016], big ? ackMaterial : s.material(hex, { roughness: 0.4 }));
      s.label(name, Math.min(0.13, PW / 4.8), 0.03, [x, by + 0.066, front + 0.003], '#e9e6d8', '#1d2022').castShadow = false;
    });

    // Mounting.
    let topY = cy + PH / 2 + 0.015;
    if (a.mount === 'pedestal') {
      s.cylinder(0.065, 0.065, cy - PH / 2, [0, (cy - PH / 2) / 2, -0.02], frame, 16);
      s.cylinder(0.34, 0.38, 0.04, [0, 0.02, -0.02], frame, 28);
      s.cylinder(0.1, 0.13, 0.12, [0, 0.09, -0.02], frame, 16);
      s.box([0.3, 0.06, 0.16], [0, cy - PH / 2 - 0.03, -0.02], dark);
      s.tube([[0.06, cy - PH / 2, -0.07], [0.09, cy - PH / 2 - 0.3, -0.09], [0.07, 0.4, -0.08], [0.16, 0.05, -0.1], [0.3, 0.02, -0.2]], 0.012, dark);
    } else if (a.mount === 'wall') {
      const WW = Math.max(1.5, PW + 0.6);
      s.box([WW, 2.35, 0.14], [0, 1.175, -PD / 2 - 0.07], s.material(mood.wear > 0.6 ? '#b9b6a2' : '#d9dccd', { roughness: 0.9 }));
      s.box([WW, 1.0, 0.145], [0, 0.5, -PD / 2 - 0.07], s.material('#9fb3a2', { roughness: 0.85 }));
      s.box([WW, 0.03, 0.15], [0, 1.0, -PD / 2 - 0.07], dark);
      s.rod([PW / 2 - 0.1, topY, -PD / 2 + 0.03], [PW / 2 - 0.1, 2.35, -PD / 2 + 0.03], 0.016, chrome);
      s.rod([-PW / 2 + 0.12, cy - PH / 2, -PD / 2 + 0.03], [-PW / 2 + 0.12, 0, -PD / 2 + 0.03], 0.016, chrome);
      s.box([0.1, 0.1, 0.06], [-PW / 2 + 0.12, 0.6, -PD / 2 + 0.03], frame);
    } else {
      const CH = cy - PH / 2;
      s.box([PW, CH, 0.55], [0, CH / 2 + 0.03, -0.175], frame);
      s.box([PW - 0.08, 0.06, 0.5], [0, 0.03, -0.175], dark);
      s.box([PW, PH, 0.36], [0, cy, -0.27], frame);
      s.box([PW - 0.1, CH - 0.2, 0.012], [0, CH / 2 + 0.03, 0.104], s.material(FINISH[a.finish], { roughness: 0.6 }));
      for (let i = 0; i < 8; i++) s.box([PW - 0.26, 0.014, 0.014], [0, 0.22 + i * 0.035, 0.112], dark);
      s.box([0.02, 0.14, 0.03], [PW / 2 - 0.1, CH * 0.62, 0.12], chrome);
      s.label('ALARMS', Math.min(0.3, PW * 0.4), 0.05, [0, CH - 0.12, 0.112], '#1d2022', '#d9d5c4').castShadow = false;
    }

    // Klaxon horn and beacon on top.
    const sounding = a.horn === 'sounding';
    const horn = new THREE.Group();
    const hornPaint = s.material('#c0271d', { roughness: 0.45, side: THREE.DoubleSide, metalness: 0.2 });
    const bell = s.lathe([[0.03, 0], [0.036, 0.1], [0.065, 0.22], [0.13, 0.31], [0.165, 0.33], [0.172, 0.33]], hornPaint);
    const driver = s.cylinder(0.075, 0.075, 0.09, [0, -0.04, 0], dark, 20);
    horn.add(bell, driver);
    s.root.add(horn);
    const hx = -PW / 2 + 0.22;
    if (a.horn === 'dangling') {
      horn.position.set(hx + 0.03, cy + PH / 2 - 0.42, front + 0.08);
      horn.rotation.set(Math.PI + 0.25, 0, 0.3 + random() * 0.3);
      s.tube([[hx, topY + 0.04, 0], [hx + 0.02, topY + 0.06, front * 0.8], [hx + 0.04, topY - 0.08, front + 0.06], [hx + 0.03, cy + PH / 2 - 0.38, front + 0.08]], 0.008, dark);
    } else {
      horn.position.set(hx, topY + 0.2, -0.1);
      horn.rotation.x = Math.PI / 2 + 0.1;
    }
    s.box([0.16, 0.02, 0.1], [hx, topY + 0.01, -0.02], dark);
    s.box([0.02, 0.2, 0.03], [hx - 0.085, topY + 0.1, -0.08], chrome);
    s.box([0.02, 0.2, 0.03], [hx + 0.085, topY + 0.1, -0.08], chrome);
    if (a.horn === 'muffled') {
      const rag = s.material('#d9d2bd', { roughness: 1 });
      for (let i = 0; i < 5; i++) s.ball([0.07 + random() * 0.04, 0.06 + random() * 0.03, 0.06], [hx + (random() - 0.5) * 0.11, topY + 0.17 + (random() - 0.5) * 0.1, 0.22 + random() * 0.03], rag, 10);
      s.ring(0.17, 0.014, [hx, topY + 0.17, 0.2], s.material('#8a7a52', { roughness: 0.9 }));
    }
    const rings: THREE.Mesh[] = [];
    if (sounding) {
      const wave = new THREE.MeshBasicMaterial({ color: '#e0392b', transparent: true, opacity: 0.75, depthWrite: false });
      for (let i = 0; i < 3; i++) {
        const ring = s.mesh(new THREE.TorusGeometry(0.2 + i * 0.08, 0.01, 6, 40), wave, [hx, topY + 0.16 - i * 0.012, 0.3 + i * 0.1]);
        ring.castShadow = ring.receiveShadow = false;
        rings.push(ring);
      }
    }
    const bx = PW / 2 - 0.14;
    const beaconLit = sounding || (a.attention === 'flashing' && lit > 0 && a.horn !== 'dangling');
    const beacon = new THREE.MeshStandardMaterial({ color: '#d8301f', emissive: '#ff2a12', emissiveIntensity: beaconLit ? 1.4 : 0.05, roughness: 0.25 });
    s.cylinder(0.06, 0.065, 0.04, [bx, topY + 0.02, -0.02], dark, 20);
    s.lathe([[0.052, 0], [0.052, 0.06], [0.04, 0.095], [0.02, 0.11], [0, 0.113]], beacon, [bx, topY + 0.04, -0.02]);

    const rate = mix(2.2, 9, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        const on = Math.sin(time * rate) > 0;
        flashPlane.visible = on;
        ackMaterial.emissiveIntensity = waiting ? (on ? 1.3 : 0.3) : 0.05;
        if (beaconLit) beacon.emissiveIntensity = Math.sin(time * rate * 0.7) > -0.2 ? 1.5 : 0.2;
        rings.forEach((ring, i) => { const pulse = 1 + 0.12 * Math.sin(time * rate * 2 - i * 1.3); ring.scale.set(pulse, pulse, 1); });
      },
    });
  },
});
