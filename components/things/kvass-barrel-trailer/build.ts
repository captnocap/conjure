import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    lettering: choice('What is painted along the tank?', {
      kvas: 'КВАС in fat red block letters.',
      bread: 'КВАС ХЛЕБНЫЙ, two words in dark brown.',
      beer: 'ПИВО, the barrel the men queue at.',
      milk: 'МОЛОКО in blue, the morning barrel.',
      ghost: 'Nothing legible, the letters have weathered to a shadow.',
    }),
    tank: choice('What colour is the tank?', {
      yellow: 'Egg-yolk yellow, the colour everyone remembers.',
      ochre: 'A darker orange ochre.',
      white: 'White with a blue waistband.',
      green: 'Faded pea green.',
    }),
    service: choice('Is it serving?', {
      open: 'Open, hatch lid propped up and a striped umbrella over the seller\'s seat.',
      lunch: 'Hatch open but nobody there: a hand-written "back in 15 minutes" card.',
      shut: 'Locked up for the night, lid down and padlocked.',
      winter: 'Laid up for winter, tap bagged, wheels chocked, forgotten at the kerb.',
    }),
    mugs: choice('What about the glass mugs?', {
      row: 'A clean row of big and small mugs lined up, waiting.',
      one: 'A single mug left half full on the shelf.',
      rinsing: 'Mugs upside down around the rinse fountain.',
      none: 'No mugs out.',
    }),
    seat: choice('What does the seller sit on?', {
      stool: 'A canvas folding stool.',
      crate: 'An upturned wooden bottle crate.',
      chair: 'A kitchen chair with a white coat hung on the back.',
      none: 'Nothing.',
    }),
    queue: choice('What have the customers set down in the queue?', {
      nothing: 'Nothing, nobody is waiting.',
      jars: 'Three-litre glass jars in string bags.',
      cans: 'Enamel milk cans with wire handles.',
      mixed: 'A line of jars, cans and one teapot, places being kept.',
    }),
    stance: choice('How does the trailer sit?', {
      level: 'Level on its jockey stand.',
      nose: 'Nose down on the drawbar, tail in the air.',
      flat: 'Listing on a flat tyre.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const t = new Sculpture(context); // the trailer itself, so it can tip
    s.root.add(t.root);
    const { mood, random } = context;
    const winter = a.service === 'winter';
    const closed = winter || a.service === 'shut';
    const R = 0.62, L = 2.4, cy = 1.12;
    const tankColour = new THREE.Color({ yellow: '#e8b923', ochre: '#d08a1f', white: '#e9e6da', green: '#8fae6a' }[a.tank]).lerp(new THREE.Color('#9a9282'), mood.wear * 0.3 + (1 - mood.cheer) * 0.12);
    const tankMat = t.material(tankColour, { metalness: 0.15, roughness: 0.55 });
    const steel = t.material('#b9bec0', { metalness: 0.8, roughness: 0.35 });
    const dark = t.material('#2a2c2e', { roughness: 0.8 });
    const frame = t.material('#3b3d3f', { metalness: 0.4 });
    const rust = t.material('#6e3d24', { roughness: 1 });
    const snowMat = new THREE.MeshStandardMaterial({ color: '#f0f3f6', roughness: 0.95 });

    // Tank: barrel, domed ends, hoop bands, filler hatch.
    const barrel = t.cylinder(R, R, L, [0, cy, 0], tankMat, 32); barrel.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) t.ball([0.2, R, R], [side * L / 2, cy, 0], tankMat, 24);
    for (const x of [-0.85, 0.85]) { const hoop = t.ring(R + 0.006, 0.014, [x, cy, 0], a.tank === 'white' ? t.material('#2f62ad') : tankMat); hoop.rotation.y = Math.PI / 2; }
    t.cylinder(0.2, 0.22, 0.14, [-0.2, cy + R + 0.03, 0], tankMat, 16);
    t.cylinder(0.23, 0.23, 0.03, [-0.2, cy + R + 0.11, 0], steel, 16);
    t.rod([-0.3, cy + R + 0.15, 0], [-0.1, cy + R + 0.15, 0], 0.012, dark);

    // Lettering as a curved decal on the near side.
    const text = { kvas: ['КВАС'], bread: ['КВАС', 'ХЛЕБНЫЙ'], beer: ['ПИВО'], milk: ['МОЛОКО'], ghost: ['КВАС'] }[a.lettering];
    const ink = { kvas: '#b3211c', bread: '#5a2d16', beer: '#1f3f8a', milk: '#1f4f9a', ghost: '#b3211c' }[a.lettering];
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 384;
    const g = canvas.getContext('2d')!;
    g.fillStyle = '#' + tankColour.getHexString(); g.fillRect(0, 0, 768, 384);
    if (a.tank === 'white') { g.fillStyle = '#2f62ad'; g.fillRect(0, 300, 768, 30); }
    g.globalAlpha = a.lettering === 'ghost' ? 0.16 : mix(1, 0.6, mood.wear);
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (text.length === 1) { g.font = `bold ${text[0].length > 4 ? 170 : 210}px sans-serif`; g.fillText(text[0], 384, 180, 700); }
    else { g.font = 'bold 150px sans-serif'; g.fillText(text[0], 384, 110, 700); g.font = 'bold 110px sans-serif'; g.fillText(text[1], 384, 262, 700); }
    g.globalAlpha = 1;
    for (let i = 0; i < 4 + mood.wear * 30; i++) { const x = random() * 768, h = 60 + random() * 260; const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, `rgba(110,61,36,${0.25 + mood.wear * 0.5})`); grad.addColorStop(1, 'rgba(110,61,36,0)'); g.fillStyle = grad; g.fillRect(x, random() * 100, 4 + random() * 14, h); }
    const decalTexture = new THREE.CanvasTexture(canvas); decalTexture.colorSpace = THREE.SRGBColorSpace; decalTexture.anisotropy = 4;
    {
      const nx = 2, na = 16, half = 1.0, x0 = -0.82, x1 = 0.82;
      const pos: number[] = [], uv: number[] = [], idx: number[] = [];
      for (let i = 0; i <= nx; i++) for (let j = 0; j <= na; j++) {
        const phi = mix(-half, half, j / na), x = mix(x0, x1, i / nx);
        pos.push(x, cy + Math.sin(phi) * (R + 0.004), Math.cos(phi) * (R + 0.004)); uv.push(i / nx, j / na);
        if (i < nx && j < na) { const p = i * (na + 1) + j; idx.push(p, p + na + 1, p + 1, p + 1, p + na + 1, p + na + 2); }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geometry.setIndex(idx); geometry.computeVertexNormals();
      t.mesh(geometry, new THREE.MeshStandardMaterial({ map: decalTexture, metalness: 0.15, roughness: 0.6, side: THREE.DoubleSide }));
    }

    // Chassis: rails, saddles, axle, wheels with mudguards, drawbar and stand.
    for (const z of [-0.36, 0.36]) t.box([L + 0.3, 0.08, 0.07], [0, 0.46, z], frame);
    for (const x of [-0.8, 0.8]) t.box([0.1, 0.14, 0.95], [x, 0.55, 0], frame);
    const axleX = 0.1;
    t.rod([axleX, 0.34, -0.8], [axleX, 0.34, 0.8], 0.035, frame);
    const tyre = t.material('#1b1b1d', { roughness: 0.95 });
    const flat = a.stance === 'flat';
    for (const side of [-1, 1]) {
      const squash = flat && side > 0 ? 0.82 : 1;
      const wheel = t.cylinder(0.34, 0.34, 0.2, [axleX, 0.34, side * 0.8], tyre, 20); wheel.rotation.x = Math.PI / 2; wheel.scale.x = 1; wheel.scale.z = squash;
      const hub = t.cylinder(0.17, 0.17, 0.21, [axleX, 0.34, side * 0.8], t.material(tankColour.clone().multiplyScalar(0.9), { metalness: 0.3 }), 12); hub.rotation.x = Math.PI / 2;
      const guard = t.mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.26, 16, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: tankColour.clone().multiplyScalar(0.85), side: THREE.DoubleSide, roughness: 0.6 }), [axleX, 0.34, side * 0.8]); guard.rotation.x = Math.PI / 2; guard.rotation.y = 0;
    }
    t.rod([-L / 2 - 0.1, 0.46, -0.3], [-L / 2 - 1.0, 0.46, 0], 0.035, frame);
    t.rod([-L / 2 - 0.1, 0.46, 0.3], [-L / 2 - 1.0, 0.46, 0], 0.035, frame);
    const eye = t.ring(0.06, 0.018, [-L / 2 - 1.08, 0.46, 0], steel); eye.rotation.x = Math.PI / 2;
    const noseDown = a.stance === 'nose';
    if (!noseDown) { t.rod([-L / 2 - 0.7, 0.46, 0], [-L / 2 - 0.7, 0.06, 0], 0.022, steel); t.cylinder(0.07, 0.07, 0.05, [-L / 2 - 0.7, 0.04, 0], dark, 10).rotation.x = Math.PI / 2; }
    for (const z of [-0.36, 0.36]) t.rod([L / 2 + 0.1, 0.46, z], [L / 2 + 0.14, noseDown ? 0.25 : 0.02, z], 0.02, frame);

    // Service end: a steel cabinet on the tail with tap, drip tray and rinse fountain under a hinged lid.
    const ex = L / 2 + 0.2, shelfY = 0.98;
    t.box([0.42, 0.5, 1.0], [ex + 0.13, shelfY - 0.25, 0], tankMat);
    t.box([0.5, 0.03, 1.06], [ex + 0.15, shelfY, 0], steel);
    const lid = new THREE.Group(); lid.position.set(ex - 0.06, shelfY + (closed ? 0.3 : 0.62), 0); lid.rotation.z = closed ? -Math.PI / 2 : 0.22; t.root.add(lid);
    const lidPanel = new THREE.Mesh(new THREE.BoxGeometry(closed ? 0.6 : 0.62, 0.03, 1.06), tankMat); lidPanel.position.x = closed ? 0 : 0.3; lidPanel.castShadow = true; lid.add(lidPanel);
    if (closed) {
      t.box([0.03, 0.6, 1.06], [ex + 0.39, shelfY + 0.3, 0], tankMat);
      for (const z of [-0.53, 0.53]) t.box([0.44, 0.6, 0.02], [ex + 0.16, shelfY + 0.3, z], tankMat);
      t.box([0.5, 0.03, 1.06], [ex + 0.15, shelfY + 0.61, 0], tankMat);
      t.box([0.02, 0.09, 0.07], [ex + 0.41, shelfY + 0.08, 0], t.material('#c9a23a', { metalness: 0.7 }));
      t.ring(0.03, 0.007, [ex + 0.41, shelfY + 0.14, 0], steel).rotation.y = Math.PI / 2;
    } else {
      for (const z of [-0.5, 0.5]) t.rod([ex + 0.3, shelfY, z], [ex + 0.36, shelfY + 0.72, z], 0.01, steel);
      // Tap with a lever, and the tray it drips into.
      t.rod([ex - 0.08, shelfY + 0.3, -0.2], [ex + 0.1, shelfY + 0.3, -0.2], 0.022, steel);
      t.rod([ex + 0.1, shelfY + 0.31, -0.2], [ex + 0.1, shelfY + 0.2, -0.2], 0.018, steel);
      t.rod([ex + 0.04, shelfY + 0.32, -0.2], [ex + 0.08, shelfY + 0.46, -0.2], 0.008, dark);
      t.ball([0.022, 0.022, 0.022], [ex + 0.08, shelfY + 0.47, -0.2], t.material('#b3211c'), 8);
      t.box([0.2, 0.02, 0.24], [ex + 0.1, shelfY + 0.025, -0.2], dark);
      // Rinse fountain: a dished tray with a nozzle that squirts up into the mug.
      t.cylinder(0.13, 0.1, 0.05, [ex + 0.12, shelfY + 0.04, 0.26], steel, 16);
      t.cylinder(0.11, 0.11, 0.01, [ex + 0.12, shelfY + 0.068, 0.26], new THREE.MeshStandardMaterial({ color: '#7fa7b5', roughness: 0.1, metalness: 0.4 }), 16);
      t.cylinder(0.012, 0.018, 0.05, [ex + 0.12, shelfY + 0.09, 0.26], steel, 8);
      // Saucer with change.
      t.cylinder(0.06, 0.04, 0.015, [ex + 0.3, shelfY + 0.025, 0.02], t.material('#e9e6da'), 12);
      for (let i = 0; i < 4; i++) t.cylinder(0.012, 0.012, 0.004, [ex + 0.28 + random() * 0.04, shelfY + 0.036 + i * 0.004, random() * 0.04], t.material('#c9a23a', { metalness: 0.8 }), 8);
    }

    // Mugs.
    const glass = new THREE.MeshStandardMaterial({ color: '#dff0ee', roughness: 0.08, metalness: 0.25, transparent: true, opacity: 0.55 });
    const kvass = new THREE.MeshStandardMaterial({ color: a.lettering === 'milk' ? '#f1efe6' : a.lettering === 'beer' ? '#d9a02a' : '#5d3216', roughness: 0.3 });
    const mug = (at: P3, big: boolean, fill: number, upside = false) => {
      const h = big ? 0.15 : 0.1, r = big ? 0.045 : 0.035;
      const grp = new THREE.Group(); grp.position.set(...at); if (upside) { grp.rotation.x = Math.PI; grp.position.y += h; } t.root.add(grp);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, h, 10, 1, true), glass); body.position.y = h / 2; grp.add(body);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.012, 10), new THREE.MeshStandardMaterial({ color: '#c5dcd9', roughness: 0.1 })); base.position.y = 0.006; grp.add(base);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(h * 0.3, 0.008, 6, 10, Math.PI), new THREE.MeshStandardMaterial({ color: '#c5dcd9', roughness: 0.1 })); handle.position.set(r, h / 2, 0); handle.rotation.z = -Math.PI / 2; grp.add(handle);
      if (fill > 0) {
        const drink = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r * 0.82, h * fill, 10), kvass); drink.position.y = 0.012 + h * fill / 2; grp.add(drink);
        const foam = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r * 0.88, 0.012, 10), new THREE.MeshStandardMaterial({ color: '#efe3c4', roughness: 1 })); foam.position.y = 0.014 + h * fill; grp.add(foam);
      }
      grp.rotation.y = random() * 6;
    };
    if (!closed) {
      const y = shelfY + 0.016;
      if (a.mugs === 'row') { const n = 4 + Math.floor(mood.density * 3); for (let i = 0; i < n; i++) mug([ex + 0.3, y, -0.44 + i * 0.105], i < n / 2, random() < 0.2 ? 0.9 : 0); }
      else if (a.mugs === 'one') mug([ex + 0.27, y, -0.3 + random() * 0.2], true, mix(0.3, 0.6, random()));
      else if (a.mugs === 'rinsing') { mug([ex + 0.12, y + 0.06, 0.26], true, 0, true); for (let i = 0; i < 3 + Math.floor(mood.density * 2); i++) mug([ex + 0.3, y, 0.1 + i * 0.1], i % 2 === 0, 0, true); }
    }

    // Umbrella when serving; a card when away; a bagged tap and chocks when laid up.
    let canopy: THREE.Object3D | null = null;
    const sx = ex + 0.85, sz = 0.15;
    if (a.service === 'open') {
      const stripes = document.createElement('canvas'); stripes.width = 128; stripes.height = 8;
      const sg = stripes.getContext('2d')!;
      const pair = [['#c9302b', '#f0ead8'], ['#2f62ad', '#f0ead8'], ['#e0b22a', '#3f8a4a'], ['#e9712a', '#f0ead8']][Math.floor(random() * 4)];
      for (let i = 0; i < 8; i++) { sg.fillStyle = pair[i % 2]; sg.fillRect(i * 16, 0, 16, 8); }
      const st = new THREE.CanvasTexture(stripes); st.colorSpace = THREE.SRGBColorSpace;
      s.rod([sx + 0.35, 0, sz - 0.5], [sx + 0.3, 2.35, sz - 0.45], 0.018, s.material('#d9d6cc', { metalness: 0.5 }));
      canopy = new THREE.Group(); canopy.position.set(sx + 0.3, 2.3, sz - 0.45); s.root.add(canopy);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.38, 8, 1, true), new THREE.MeshStandardMaterial({ map: st, side: THREE.DoubleSide, roughness: 0.9 })); cone.castShadow = true; cone.position.y = 0.05; canopy.add(cone);
      canopy.rotation.z = (random() - 0.5) * 0.2;
      s.cylinder(0.2, 0.24, 0.1, [sx + 0.35, 0.05, sz - 0.5], s.material('#8e8c86'), 12);
    }
    if (a.service === 'lunch') { const card = t.label('УШЛА НА 15 МИН', 0.5, 0.16, [ex + 0.42, shelfY + 0.3, 0], '#22252b', '#efe9d4'); card.rotation.y = Math.PI / 2; card.rotation.x = (random() - 0.5) * 0.2; }
    if (winter) {
      for (const side of [-1, 1]) s.box([0.14, 0.12, 0.22], [axleX + side * 0.42, 0.06, 0.8], s.material('#7b5a36')).rotation.z = side * 0.2;
            t.ball([L * 0.5, 0.13, 0.4], [0, cy + R - 0.05, 0], snowMat, 16);
      t.box([0.5, 0.06, 1.0], [ex + 0.15, shelfY + 0.66, 0], snowMat);
      for (const side of [-1, 1]) t.box([0.5, 0.05, 0.22], [axleX, 0.78, side * 0.8], snowMat);
    }
    // Price card on the tank end, when trading.
    if (!closed) { const price = t.label(a.lettering === 'beer' ? '0,5 л — 22 коп' : a.lettering === 'milk' ? '1 л — 28 коп' : 'БОЛЬШАЯ 6 к · МАЛ. 3 к', 0.62, 0.14, [ex - 0.045, shelfY + 0.5, 0.12], '#22252b', '#efe9d4'); price.rotation.y = Math.PI / 2; }

    // Seat.
    if (a.seat === 'stool') {
      const leg = s.material('#9da3a6', { metalness: 0.7 });
      for (const z of [-0.16, 0.16]) { s.rod([sx - 0.17, 0, sz + z], [sx + 0.17, 0.42, sz + z], 0.012, leg); s.rod([sx + 0.17, 0, sz + z], [sx - 0.17, 0.42, sz + z], 0.012, leg); }
      for (const x of [-0.17, 0.17]) s.rod([sx + x, 0.42, sz - 0.16], [sx + x, 0.42, sz + 0.16], 0.012, leg);
      s.box([0.36, 0.02, 0.32], [sx, 0.41, sz], s.material(['#4f6b4a', '#8a4a3c', '#3c5f8a'][Math.floor(random() * 3)], { roughness: 1 }));
    } else if (a.seat === 'crate') {
      const wood = s.material('#b08a55', { roughness: 1 });
      for (const y of [0.05, 0.17, 0.29]) for (const z of [-0.15, 0.15]) s.box([0.42, 0.08, 0.02], [sx, y, sz + z], wood);
      for (const y of [0.05, 0.17, 0.29]) for (const x of [-0.2, 0.2]) s.box([0.02, 0.08, 0.3], [sx + x, y, sz], wood);
      for (let i = 0; i < 4; i++) s.box([0.09, 0.02, 0.32], [sx - 0.16 + i * 0.107, 0.34, sz], wood);
    } else if (a.seat === 'chair') {
      const wood = s.material('#7a5632');
      for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) s.rod([sx + x, 0, sz + z], [sx + x, x > 0 ? 0.9 : 0.45, sz + z], 0.018, wood);
      s.box([0.42, 0.03, 0.42], [sx, 0.45, sz], wood);
      s.box([0.03, 0.3, 0.42], [sx + 0.18, 0.76, sz], wood);
      s.box([0.07, 0.62, 0.48], [sx + 0.2, 0.62, sz], s.material('#f2f1ec', { roughness: 1 }));
    }

    // The queue of vessels keeping places, trailing off to the near side.
    if (a.queue !== 'nothing' && !winter) {
      const n = 3 + Math.floor(mood.density * 5 + random() * 2);
      const jarGlass = new THREE.MeshStandardMaterial({ color: '#cfe4dd', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.6 });
      for (let i = 0; i < n; i++) {
        const qx = ex + 0.1 - i * 0.4 + (random() - 0.5) * 0.12, qz = 0.98 + i * 0.06 + (random() - 0.5) * 0.12;
        const kind = a.queue === 'mixed' ? (i === 1 ? 'teapot' : random() < 0.5 ? 'jars' : 'cans') : a.queue;
        if (kind === 'jars') {
          s.lathe([[0, 0], [0.075, 0], [0.08, 0.02], [0.08, 0.19], [0.05, 0.23], [0.05, 0.26]], jarGlass, [qx, 0, qz]);
          s.cylinder(0.052, 0.052, 0.012, [qx, 0.262, qz], s.material('#c9cdd0', { metalness: 0.8 }), 10);
          s.lathe([[0, 0.004], [0.072, 0.004], [0.076, 0.03], [0.076, 0.05]], new THREE.MeshStandardMaterial({ color: '#5d3216', roughness: 0.4 }), [qx, 0, qz]);
        } else if (kind === 'cans') {
          const enamel = s.material(['#e9e6da', '#4f7fae', '#c9302b', '#6f9a5a'][Math.floor(random() * 4)], { roughness: 0.35 });
          s.lathe([[0, 0], [0.085, 0], [0.095, 0.16], [0.06, 0.24], [0.06, 0.28], [0, 0.28]], enamel, [qx, 0, qz]);
          s.tube([[qx - 0.06, 0.26, qz], [qx, 0.38, qz], [qx + 0.06, 0.26, qz]], 0.006, s.material('#33363a', { metalness: 0.6 }));
        } else {
          const enamel = s.material('#e9e6da', { roughness: 0.35 });
          s.ball([0.1, 0.085, 0.1], [qx, 0.085, qz], enamel, 12);
          s.rod([qx + 0.08, 0.08, qz], [qx + 0.17, 0.15, qz], 0.014, enamel);
          s.ring(0.05, 0.008, [qx - 0.11, 0.09, qz], enamel);
          s.ball([0.02, 0.02, 0.02], [qx, 0.18, qz], s.material('#c9302b'), 8);
        }
      }
    }

    // Ground: a strip of pavement, wet under the tap, or a drift.
    const earth = winter ? '#e3e7ea' : '#8b8880';
    s.box([4.7, 0.05, 2.5], [0.4, -0.025, 0.25], new THREE.MeshStandardMaterial({ color: earth, roughness: 1 }));
    if (!closed) { const puddle = s.cylinder(0.5, 0.5, 0.008, [ex + 0.25, 0.004, 0.1], new THREE.MeshStandardMaterial({ color: '#4a4640', roughness: 0.1, metalness: 0.3 }), 16); puddle.scale.z = 0.7; }
    if (winter) for (const [x, z] of [[-1.5, 1.2], [1.9, 1.1], [0.2, -0.8], [2.3, -0.6]] as const) s.ball([0.6, 0.14, 0.45], [x, 0, z], snowMat, 10);
    if (mood.wear > 0.5) for (let i = 0; i < 5; i++) t.box([0.1 + random() * 0.2, 0.02, 0.07], [-1 + random() * 2, 0.46 + random() * 0.03, 0.365], rust);

    // Tip the trailer about its axle.
    t.root.position.set(axleX, 0.34, 0);
    for (const child of [...t.root.children]) child.position.x -= axleX, child.position.y -= 0.34;
    if (noseDown) t.root.rotation.z = Math.atan2(0.4, L / 2 + 1.0 + axleX);
    if (flat) { t.root.rotation.x = 0.045; t.root.position.y = 0.31; }

    const sway = mix(0.01, 0.08, mood.energy), phase = random() * 6, tilt = canopy ? canopy.rotation.z : 0;
    return s.finish({ update: (_dt, time) => { if (canopy) canopy.rotation.z = tilt + Math.sin(time * 1.1 + phase) * sway; } });
  },
});
