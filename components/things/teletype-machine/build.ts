import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const STORIES = {
  war: 'WAR DECLARED: the worst news, in capitals.',
  peace: 'ARMISTICE SIGNED: it is over, people will pour into the street.',
  shot: 'PRESIDENT SHOT: the flash nobody in the room forgets.',
  moon: 'MAN ON MOON: wonder, relayed in clipped wire prose.',
  crash: 'MARKET CRASHES: numbers falling line by line.',
  vote: 'ELECTION RETURNS: precinct counts through the night.',
  races: 'RACING RESULTS: the fourth at Belmont, small stakes and routine.',
  garble: 'A garbled test line, RYRYRY and nonsense: nothing is happening anywhere.',
} as const;
const HEAD: Record<keyof typeof STORIES, string[]> = {
  war: ['WAR', 'DECLARED'], peace: ['ARMISTICE', 'SIGNED'], shot: ['PRESIDENT', 'SHOT'], moon: ['MAN ON', 'MOON'], crash: ['MARKET', 'CRASHES'], vote: ['ELECTION', 'RETURNS'], races: ['RACING', 'RESULTS'], garble: ['RYRYRYRY', 'ZCZC NNNN'],
};
const PLATES = { ap: 'AP WIRE', upi: 'UPI', reuters: 'REUTERS', weather: 'WEATHER', police: 'POLICE', stocks: 'TICKER' } as const;

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    paper: score('How much paper has it run out?', ['A fresh stub just clear of the window', 'A ribbon down into the basket', 'The basket is overflowing in folds', 'A river of paper running out across the floor']),
    alarm: choice('What is the bulletin bell doing?', {
      quiet: 'Silent and dark: routine copy, nobody looking.',
      bulletin: 'The amber bulletin lamp is lit: five bells, something worth a look.',
      flash: 'The red flash lamp is blazing: ten bells, the whole room is turning round.',
      dead: 'The line is dead: no lamp, the machine switched off and the paper hanging limp and torn.',
    }),
    story: choice('What is the top story coming over the wire?', STORIES),
    plate: choice('What does the nameplate on the front say?', {
      ap: 'AP WIRE, the national wire.', upi: 'UPI, the scrappy rival.', reuters: 'REUTERS, the foreign cable.', weather: 'WEATHER, the bureau forecasts.', police: 'POLICE, the precinct blotter line.', stocks: 'TICKER, market prices.',
    }),
    housing: choice('What is the machine\'s housing like?', {
      black: 'Black crackle-finish cast metal with a glass window, 1930s.',
      grey: 'Grey hammertone steel, postwar and institutional.',
      olive: 'Olive drab, a military signals unit.',
      cream: 'Cream enamel with rounded corners, a 1960s model.',
    }),
    stand: choice('What does it stand on?', {
      table: 'An open angle-iron table with spare paper rolls on the shelf below.',
      pedestal: 'A closed steel pedestal cabinet with louvred sides.',
      hush: 'A wooden silencer cabinet with a felt-lined lid propped open.',
      cart: 'A wheeled trolley, pushed in from somewhere else.',
    }),
    catcher: choice('What catches the paper?', {
      wire: 'A wire basket.',
      crate: 'A wooden crate.',
      carton: 'A battered cardboard carton.',
      floor: 'Nothing: it pools straight onto the floor.',
    }),
    pinned: choice('Where are the torn-off stories kept?', {
      none: 'Nowhere: nothing has been torn off.',
      board: 'Pinned in overlapping strips on a cork board on a post behind the machine.',
      clips: 'Hung from a row of bulldog clips along the side of the stand.',
      floor: 'Torn off and dropped on the floor around it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dead = a.alarm === 'dead';
    const shellColour = { black: '#1e2022', grey: '#7f8a8c', olive: '#5a6142', cream: '#e3dcc2' }[a.housing];
    const shell = s.material(shellColour, { metalness: 0.4, roughness: a.housing === 'black' ? 0.75 : 0.4 });
    const steel = s.material('#6d7577', { metalness: 0.5, roughness: 0.45 });
    const dark = s.material('#1b1d1f', { roughness: 0.6 });
    const chrome = s.material('#d5d9da', { metalness: 0.9, roughness: 0.22 });
    const paperColour = mood.wear > 0.6 ? '#dccd8f' : '#efe2a8';

    // Stand.
    const H = a.stand === 'cart' ? 0.78 : 0.72;
    if (a.stand === 'table' || a.stand === 'cart') {
      const foot = a.stand === 'cart' ? 0.08 : 0;
      for (const x of [-0.27, 0.27]) for (const z of [-0.22, 0.22]) {
        s.box([0.035, H - foot, 0.035], [x, foot + (H - foot) / 2, z], steel);
        if (foot) { s.cylinder(0.04, 0.04, 0.025, [x, 0.04, z], dark, 14).rotation.z = Math.PI / 2; }
      }
      s.box([0.6, 0.03, 0.5], [0, H - 0.015, 0], steel);
      s.box([0.57, 0.02, 0.47], [0, 0.26, 0], steel);
      for (const z of [-0.22, 0.22]) s.rod([-0.27, 0.28, z], [0.27, H - 0.05, z], 0.008, steel);
      const rolls = 1 + Math.round(mood.density * 2);
      for (let i = 0; i < rolls; i++) {
        const roll = s.cylinder(0.07, 0.07, 0.22, [-0.15 + i * 0.15, 0.34, -0.05 + (random() - 0.5) * 0.1], s.material(paperColour), 18);
        roll.rotation.x = Math.PI / 2;
        roll.rotation.z = (random() - 0.5) * 0.5;
      }
    } else if (a.stand === 'pedestal') {
      s.box([0.52, H - 0.06, 0.44], [0, 0.06 + (H - 0.06) / 2, 0], shell);
      s.box([0.46, 0.06, 0.38], [0, 0.03, 0], dark);
      for (const side of [-1, 1]) for (let i = 0; i < 7; i++) s.box([0.008, 0.012, 0.3], [side * 0.262, 0.3 + i * 0.04, 0], dark);
      s.box([0.36, 0.44, 0.012], [0, 0.4, 0.222], shell);
      s.box([0.02, 0.08, 0.02], [0.14, 0.42, 0.234], chrome);
    } else {
      const wood = s.material('#7b5433', { roughness: 0.6 });
      s.box([0.72, H - 0.1, 0.6], [0, 0.1 + (H - 0.1) / 2, 0], wood);
      for (const x of [-0.31, 0.31]) for (const z of [-0.25, 0.25]) s.box([0.06, 0.1, 0.06], [x, 0.05, z], wood);
      for (const side of [-1, 1]) s.box([0.03, 0.46, 0.6], [side * 0.345, H + 0.23, 0], wood);
      s.box([0.72, 0.46, 0.03], [0, H + 0.23, -0.285], wood);
      const lid = s.box([0.72, 0.03, 0.6], [0, H + 0.62, -0.33], wood);
      lid.rotation.x = 1.0;
      s.box([0.66, 0.012, 0.54], [0, H + 0.605, -0.315], s.material('#5d7a55', { roughness: 1 })).rotation.x = 1.0;
      s.rod([0.33, H + 0.46, 0.2], [0.33, H + 0.74, -0.12], 0.006, chrome);
    }
    // Power cord trailing off the back.
    s.tube([[0.15, H + 0.05, -0.22], [0.2, H - 0.2, -0.32], [0.26, 0.05, -0.34], [0.4, 0.012, -0.3 - random() * 0.1], [0.55, 0.012, -0.36]], 0.008, dark);

    // The printer: a sloped-front housing with a glass window, platen, knobs and paper roll.
    const machine = new THREE.Group();
    machine.position.y = H;
    s.root.add(machine);
    const on = <T extends THREE.Object3D>(node: T) => { machine.add(node); return node; };
    const profile = new THREE.Shape();
    for (const [index, [z, y]] of ([[0.2, 0], [0.2, 0.17], [0.07, 0.36], [-0.2, 0.36], [-0.2, 0]] as const).entries()) index ? profile.lineTo(z, y) : profile.moveTo(z, y);
    const round = a.housing === 'cream' ? 0.03 : 0.012;
    const hull = on(s.mesh(new THREE.ExtrudeGeometry(profile, { depth: 0.46, bevelEnabled: true, bevelSize: round, bevelThickness: round, bevelSegments: 3 }), shell));
    hull.rotation.y = -Math.PI / 2;
    hull.position.x = 0.23;
    on(s.box([0.54, 0.03, 0.46], [0, 0.015, 0], dark));
    const slope = Math.atan2(0.13, 0.19);
    const glass = on(s.box([0.3, 0.004, 0.19], [0, 0.272, 0.142], new THREE.MeshStandardMaterial({ color: '#bcd3d6', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false })));
    glass.rotation.x = Math.PI / 2 - slope + 0.02;
    const frame = on(s.box([0.34, 0.012, 0.22], [0, 0.262, 0.135], dark));
    frame.rotation.x = Math.PI / 2 - slope + 0.02;
    const platen = on(s.cylinder(0.028, 0.028, 0.5, [0, 0.33, 0.03], dark, 16));
    platen.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) on(s.cylinder(0.04, 0.04, 0.025, [side * 0.265, 0.33, 0.03], dark, 14)).rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) on(s.box([0.012, 0.16, 0.05], [side * 0.14, 0.42, -0.14], steel));
    const supply = on(s.cylinder(0.075, 0.075, 0.25, [0, 0.47, -0.14], s.material(paperColour), 20));
    supply.rotation.z = Math.PI / 2;
    on(s.rod([-0.16, 0.47, -0.14], [0.16, 0.47, -0.14], 0.008, chrome));
    for (const side of [-1, 1]) for (let i = 0; i < 5; i++) on(s.box([0.006, 0.01, 0.2], [side * 0.243, 0.07 + i * 0.03, -0.04], dark));
    on(s.label(PLATES[a.plate], 0.26, 0.06, [0, 0.085, 0.214], '#f0e6c0', a.housing === 'black' ? '#6d1f1c' : '#22303a'));
    for (let i = 0; i < 2; i++) on(s.cylinder(0.014, 0.014, 0.014, [0.17, 0.05 + i * 0.05, 0.215], chrome, 10)).rotation.x = Math.PI / 2;
    // Bell and lamps on the roof.
    const brass = s.material('#c39a3c', { metalness: 0.85, roughness: 0.25 });
    on(s.cylinder(0.006, 0.006, 0.03, [0.15, 0.385, -0.02], dark, 8));
    const bell = on(s.mesh(new THREE.SphereGeometry(0.045, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), brass, [0.15, 0.4, -0.02]));
    on(s.rod([0.2, 0.385, -0.02], [0.185, 0.42, -0.02], 0.004, dark));
    const lampOf = (colour: string, lit: boolean) => new THREE.MeshStandardMaterial({ color: lit ? colour : '#5b4a40', emissive: colour, emissiveIntensity: lit ? 2.2 : 0, roughness: 0.25 });
    const amber = lampOf('#ffae2a', a.alarm === 'bulletin' || a.alarm === 'flash');
    const red = lampOf('#ff2a1c', a.alarm === 'flash');
    on(s.cylinder(0.014, 0.014, 0.02, [-0.17, 0.375, -0.04], dark, 10));
    on(s.ball([0.03, 0.03, 0.03], [-0.18, 0.4, -0.04], amber, 12));
    on(s.cylinder(0.02, 0.02, 0.02, [-0.1, 0.375, -0.04], dark, 10));
    on(s.ball([0.042, 0.042, 0.042], [-0.1, 0.405, -0.04], red, 12));

    // Paper texture: the headline, then rows of wire copy, repeating down the ribbon.
    const ribbonTexture = paint(256, 1024, (g) => {
      g.fillStyle = paperColour;
      g.fillRect(0, 0, 256, 1024);
      g.fillStyle = '#3b2f52';
      g.textAlign = 'center';
      const block = (top: number, lines: string[]) => {
        g.font = 'bold 40px monospace';
        lines.forEach((line, index) => g.fillText(line, 128, top + 40 + index * 44, 232));
        let y = top + 40 + lines.length * 44;
        for (let row = 0; row < 7; row++, y += 17) for (let x = 16; x < 236;) { const word = 14 + random() * 34; g.fillRect(x, y, Math.min(word, 240 - x), 6); x += word + 8; }
        g.fillRect(16, y + 6, 224, 2);
        return y + 20;
      };
      let y = block(70, HEAD[a.story]);
      const others = (Object.keys(HEAD) as (keyof typeof HEAD)[]).filter((key) => key !== a.story && key !== 'garble');
      while (y < 900) y = block(y, a.story === 'garble' ? HEAD.garble : HEAD[others[Math.floor(random() * others.length)]]);
    });
    ribbonTexture.wrapT = THREE.RepeatWrapping;
    const ribbonMaterial = new THREE.MeshStandardMaterial({ map: ribbonTexture, roughness: 0.9, side: THREE.DoubleSide });

    // Ribbon path: out of the platen, over the window, down the front, then folds and spills.
    const length = Math.min(1, a.paper * 0.85 + mood.density * 0.15);
    const catcher = a.catcher;
    const rim = catcher === 'floor' ? 0 : 0.26;
    const bz = 0.48;
    const path: THREE.Vector3[] = [];
    const add = (x: number, y: number, z: number) => path.push(new THREE.Vector3(x, y, z));
    add(0, H + 0.335, 0.045); add(0, H + 0.4, 0.07); add(0, H + 0.43, 0.13);
    if (length < 0.2) { add(0, H + 0.4, 0.2); add(0, H + 0.33 - length, 0.24); }
    else {
      add(0, H + 0.37, 0.215); add(0, H + 0.2, 0.25); add(0, H - 0.1, 0.27 + random() * 0.03);
      if (dead) add((random() - 0.5) * 0.04, H - 0.32, 0.27);
      else {
        add(0, 0.5, 0.33);
        const folds = Math.round(mix(2, 9, Math.min(1, (length - 0.2) / 0.5)));
        const base = catcher === 'floor' ? 0.012 : 0.05;
        for (let i = 0; i < folds; i++) {
          const y = base + (folds - 1 - i) * 0.035 + 0.02;
          add((random() - 0.5) * 0.05, y, bz + (i % 2 ? -0.11 : 0.11) + (random() - 0.5) * 0.04);
        }
        if (length > 0.62) {
          const run = (length - 0.62) / 0.38;
          if (rim) { add(0.02, rim + 0.05, bz + 0.2); add(0.03, rim * 0.5, bz + 0.26); }
          const steps = 2 + Math.round(run * 5);
          const side = random() < 0.5 ? -1 : 1;
          for (let i = 1; i <= steps; i++) add(side * Math.sin(i * 1.1) * 0.22 + (random() - 0.5) * 0.06, 0.006 + (i % 2) * 0.012, bz + 0.26 + i * 0.13);
        }
      }
    }
    const curve = new THREE.CatmullRomCurve3(path, false, 'centripetal');
    const samples = Math.max(40, path.length * 12);
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(1, 0, 0), next = new THREE.Vector3(), tangent = new THREE.Vector3(), point = new THREE.Vector3(), last = new THREE.Vector3();
    let travelled = 0;
    const half = 0.12;
    for (let i = 0; i <= samples; i++) {
      curve.getPoint(i / samples, point);
      curve.getTangent(i / samples, tangent);
      if (i) travelled += point.distanceTo(last);
      last.copy(point);
      next.crossVectors(up, tangent);
      next.y = 0;
      if (next.length() > 0.25) { next.normalize(); if (next.dot(side) < 0) next.negate(); side.lerp(next, 0.5).normalize(); }
      const ragged = dead && i === samples ? 0.02 : 0;
      positions.push(point.x - side.x * half, point.y - side.y * half, point.z - side.z * half, point.x + side.x * half, point.y + side.y * half + ragged, point.z + side.z * half);
      const v = 1 - travelled / 1.0 + 0.17;
      uvs.push(0, v, 1, v);
      if (i) { const k = i * 2; indices.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
    const ribbonGeometry = new THREE.BufferGeometry();
    ribbonGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    ribbonGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    ribbonGeometry.setIndex(indices);
    ribbonGeometry.computeVertexNormals();
    s.mesh(ribbonGeometry, ribbonMaterial);

    // Catcher.
    if (catcher === 'wire') {
      for (const y of [0.02, 0.14, rim]) {
        const hoop = s.ring(0.2 + y * 0.12, 0.005, [0, y, bz], chrome);
        hoop.rotation.x = Math.PI / 2;
        hoop.scale.set(1, 0.85, 1);
      }
      for (let i = 0; i < 14; i++) { const t = i / 14 * Math.PI * 2; s.rod([Math.cos(t) * 0.2, 0.02, bz + Math.sin(t) * 0.17], [Math.cos(t) * 0.231, rim, bz + Math.sin(t) * 0.196], 0.003, chrome); }
    } else if (catcher !== 'floor') {
      const wall = s.material(catcher === 'crate' ? '#9a7445' : '#b08a5a', { roughness: 0.95 });
      s.box([0.42, 0.015, 0.36], [0, 0.008, bz], wall);
      for (const sx of [-1, 1]) s.box([0.015, rim, 0.36], [sx * 0.21, rim / 2, bz], wall);
      for (const sz of [-1, 1]) s.box([0.42, rim, 0.015], [0, rim / 2, bz + sz * 0.18], wall);
      if (catcher === 'carton') for (const sx of [-1, 1]) s.box([0.14, 0.008, 0.36], [sx * 0.27, rim - 0.03, bz], wall).rotation.z = sx * -0.7;
      else for (const sz of [-1, 1]) s.box([0.43, 0.03, 0.02], [0, rim * 0.5, bz + sz * 0.19], s.material('#7c5a33'));
    }

    // Torn-off takes: short strips sharing one painted texture.
    const takeTexture = paint(128, 256, (g) => {
      g.fillStyle = paperColour;
      g.fillRect(0, 0, 128, 256);
      g.fillStyle = '#3b2f52';
      g.fillRect(10, 14, 80, 12);
      for (let y = 40; y < 240; y += 14) for (let x = 10; x < 112;) { const word = 8 + random() * 22; g.fillRect(x, y, Math.min(word, 118 - x), 5); x += word + 6; }
    });
    const takeMaterial = new THREE.MeshStandardMaterial({ map: takeTexture, roughness: 0.9, side: THREE.DoubleSide });
    const takes = 3 + Math.round(mood.density * 6);
    const pin = s.material('#c8312b', { roughness: 0.3 });
    if (a.pinned === 'board') {
      s.rod([0.36, 0, -0.3], [0.36, 1.5, -0.3], 0.016, steel);
      s.cylinder(0.14, 0.16, 0.025, [0.36, 0.012, -0.3], dark, 18);
      s.box([0.74, 0.62, 0.03], [0.2, 1.6, -0.3], s.material('#6b4a2e'));
      s.box([0.68, 0.56, 0.01], [0.2, 1.6, -0.282], s.material('#c19a5f', { roughness: 1 }));
      for (let i = 0; i < takes; i++) {
        const h = 0.18 + random() * 0.26, x = -0.08 + (i / Math.max(1, takes - 1)) * 0.56 + (random() - 0.5) * 0.04, top = 1.84 - random() * 0.06;
        const strip = s.mesh(new THREE.PlaneGeometry(0.11, h), takeMaterial, [x, top - h / 2, -0.274 + i * 0.0012]);
        strip.rotation.z = (random() - 0.5) * 0.18;
        s.ball([0.009, 0.009, 0.009], [x, top - 0.012, -0.268 + i * 0.0012], pin, 8);
      }
    } else if (a.pinned === 'clips') {
      const sx = a.stand === 'hush' ? 0.365 : a.stand === 'pedestal' ? 0.265 : 0.31;
      s.box([0.012, 0.03, 0.44], [sx, H - 0.06, 0], dark);
      const n = Math.min(5, takes);
      for (let i = 0; i < n; i++) {
        const h = 0.2 + random() * 0.3, z = -0.17 + i * 0.34 / Math.max(1, n - 1);
        const strip = s.mesh(new THREE.PlaneGeometry(0.1, h), takeMaterial, [sx + 0.012 + i * 0.001, H - 0.07 - h / 2, z]);
        strip.rotation.y = Math.PI / 2;
        strip.rotation.x = (random() - 0.5) * 0.1;
        s.box([0.016, 0.03, 0.04], [sx + 0.014, H - 0.07, z], chrome);
      }
    } else if (a.pinned === 'floor') {
      for (let i = 0; i < takes; i++) {
        const strip = s.mesh(new THREE.PlaneGeometry(0.12, 0.2 + random() * 0.25), takeMaterial, [(random() < 0.5 ? -1 : 1) * (0.38 + random() * 0.3), 0.004 + i * 0.0015, -0.1 + random() * 0.7]);
        strip.rotation.x = -Math.PI / 2;
        strip.rotation.z = random() * 3;
      }
    }
    if (a.pinned === 'none' || a.pinned === 'floor') { takeTexture.dispose(); if (a.pinned === 'none') takeMaterial.dispose(); }

    const energy = dead ? 0 : mix(0.25, 1, mood.energy);
    const blink = a.alarm === 'flash' ? red : a.alarm === 'bulletin' ? amber : null;
    return s.finish({
      update: (dt, time) => {
        ribbonTexture.offset.y += dt * 0.03 * energy;
        machine.position.x = Math.sin(time * 61) * 0.0012 * energy;
        machine.rotation.z = Math.sin(time * 47) * 0.002 * energy;
        if (blink) { blink.emissiveIntensity = Math.sin(time * (a.alarm === 'flash' ? 14 : 6)) > -0.2 ? 2.4 : 0.3; bell.rotation.z = Math.sin(time * 40) * 0.05; }
      },
    });
  },
});
