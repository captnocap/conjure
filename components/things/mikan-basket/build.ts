import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const paint = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

export default defineThing({
  questions: {
    holder: choice('What are the mandarins kept in?', {
      zaru: 'A shallow round basket of woven bamboo strips.',
      handled: 'A deeper bamboo basket with an arched carrying handle.',
      lacquer: 'A dark red lacquered wooden bowl with a gold rim, for guests.',
      box: 'The cardboard shipping box they came in, flaps open, an orange printed on the side.',
      net: 'A red mesh shop bag, torn open at the top.',
    }),
    left: score('How many are left?', ['One last mandarin', 'A handful rolling in the bottom', 'About half', 'Heaped high and just refilled']),
    eater: choice('Who has been eating them?', {
      nobody: 'Nobody yet: no peel anywhere.',
      grandparent: 'Someone patient: one peel opened in a perfect flower, segments laid in a row on it.',
      children: 'Children: ragged peels everywhere and faces drawn on the fruit in marker.',
      binger: 'One person who cannot stop: a neat tower of nested peels.',
      guest: 'A visitor: one mandarin set out on a little plate beside a cup of tea.',
      cat: 'The cat: the whole thing knocked over and fruit rolled across the table.',
    }),
    condition: choice('What state is the fruit in?', {
      ripe: 'Deep glossy orange, perfectly ripe.',
      early: 'Early season, still patched with green.',
      turning: 'Past its best: dull, soft, and one gone blue-white with mould.',
    }),
    under: choice('What is it standing on?', {
      bare: 'Nothing, straight on the table.',
      tray: 'A round black lacquer tray.',
      cloth: 'A square of indigo-dyed cloth.',
      paper: 'A spread sheet of newspaper to catch the peel.',
    }),
    leaves: noul('Do some still have a stem and leaf attached, as if just picked?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = 0.031;
    const spilled = a.eater === 'cat';
    let ground = 0;

    // --- What it stands on -----------------------------------------------------------------
    if (a.under === 'tray') {
      s.lathe([[0, 0], [0.225, 0], [0.24, 0.022], [0.23, 0.022], [0.217, 0.01], [0, 0.01]], s.material('#16130f', { roughness: 0.22 }));
      s.ring(0.235, 0.003, [0, 0.022, 0], s.material('#b8963a', { metalness: 0.8, roughness: 0.3 })).rotation.x = Math.PI / 2;
      ground = 0.01;
    } else if (a.under === 'cloth') {
      const cloth = paint(128, 128, (c, w) => {
        c.fillStyle = '#243a6a'; c.fillRect(0, 0, w, w);
        c.strokeStyle = '#dfe4ec'; c.lineWidth = 2;
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.strokeRect(i * 32 + 8, j * 32 + 8, 16, 16); c.beginPath(); c.moveTo(i * 32 + 16, j * 32); c.lineTo(i * 32 + 16, j * 32 + 32); c.stroke(); }
      });
      cloth.repeat.set(3, 3);
      const mesh = s.mesh(new THREE.BoxGeometry(0.44, 0.004, 0.44), new THREE.MeshStandardMaterial({ map: cloth, roughness: 1 }), [0, 0.002, 0]);
      mesh.rotation.y = 0.5 + random() * 0.5;
      ground = 0.004;
    } else if (a.under === 'paper') {
      const news = paint(256, 256, (c, w) => {
        c.fillStyle = '#d9d3c0'; c.fillRect(0, 0, w, w);
        c.fillStyle = '#2a2a2a'; c.fillRect(200, 10, 46, 100);
        c.fillStyle = '#8f8a7c'; c.fillRect(20, 150, 90, 90);
        c.fillStyle = '#5a564e';
        for (let col = 0; col < 17; col++) { const x = 10 + col * 11; if (x > 195) c.fillRect(x, 120, 5, 126); else if (x < 115) c.fillRect(x, 10, 5, 130); else c.fillRect(x, 10, 5, 236); }
      });
      news.wrapS = news.wrapT = THREE.ClampToEdgeWrapping;
      const mesh = s.mesh(new THREE.PlaneGeometry(0.5, 0.4), new THREE.MeshStandardMaterial({ map: news, roughness: 1 }), [0.02, 0.002, 0.03]);
      mesh.rotation.set(-Math.PI / 2, 0, -0.15 + random() * 0.3);
      s.box([0.5, 0.0015, 0.4], [0.02, 0.0008, 0.03], s.material('#d9d3c0')).rotation.y = mesh.rotation.z;
      ground = 0.003;
    }

    // --- Fruit helpers -------------------------------------------------------------------------
    const base = new THREE.Color(a.condition === 'turning' ? '#d27f22' : '#f28a16');
    const skinColour = () => {
      const colour = base.clone().offsetHSL((random() - 0.5) * 0.02, 0, (random() - 0.5) * 0.06);
      if (a.condition === 'early') colour.lerp(new THREE.Color('#a8ac24'), random() ** 2 * 0.5);
      colour.lerp(new THREE.Color('#8a7a5a'), (1 - mood.cheer) * 0.12);
      return colour;
    };
    const gloss = a.condition === 'turning' ? 0.85 : 0.42;
    const stemGreen = s.material('#4a6a2c', { roughness: 0.8 });
    const leafGreen = s.material('#3f6a2f', { roughness: 0.6, side: THREE.DoubleSide });
    const ink = s.material('#1a1818');
    const fruitGeometry = new THREE.SphereGeometry(1, 18, 12);
    let mouldDone = false, faces = 0;
    const fruit = (parent: THREE.Object3D, x: number, y: number, z: number, exposed: boolean) => {
      const size = r * mix(0.88, 1.08, random());
      const group = new THREE.Group();
      group.position.set(x, y, z);
      const body = new THREE.Mesh(fruitGeometry, s.material(skinColour(), { roughness: gloss }));
      body.scale.set(size, size * (a.condition === 'turning' ? 0.74 : 0.82), size);
      body.castShadow = body.receiveShadow = true;
      group.add(body);
      const calyx = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.006, 0.004, 6), stemGreen);
      calyx.position.y = size * 0.8;
      group.add(calyx);
      if (a.leaves && exposed && random() < 0.4) {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0022, 0.02, 5), stemGreen);
        stalk.position.set(0.003, size * 0.82 + 0.009, 0); stalk.rotation.z = -0.3;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), leafGreen);
        leaf.scale.set(0.024, 0.002, 0.011); leaf.position.set(0.024, size * 0.82 + 0.016, 0); leaf.rotation.z = 0.25;
        leaf.castShadow = true;
        group.add(stalk, leaf);
        group.rotation.y = random() * 6;
      }
      if (a.condition === 'turning' && exposed && !mouldDone) {
        mouldDone = true;
        const fuzz = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), s.material('#c9d8cf', { roughness: 1 }));
        fuzz.scale.set(size * 0.62, size * 0.4, size * 0.6); fuzz.position.set(size * 0.4, size * 0.42, size * 0.3);
        const core = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), s.material('#5f8f8a', { roughness: 1 }));
        core.scale.set(size * 0.36, size * 0.3, size * 0.34); core.position.set(size * 0.5, size * 0.5, size * 0.36);
        group.add(fuzz, core);
      }
      if (a.eater === 'children' && exposed && faces < 3 && random() < 0.6) {
        faces++;
        const turn = (random() - 0.5) * 1.2;
        const face = new THREE.Group();
        for (const side of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 6, 5), ink); eye.position.set(side * size * 0.3, size * 0.25, size * 0.88); face.add(eye); }
        const smile = new THREE.Mesh(new THREE.TorusGeometry(size * 0.28, 0.0018, 4, 12, Math.PI), ink);
        smile.position.set(0, size * 0.08, size * 0.92); smile.rotation.z = random() < 0.75 ? Math.PI : 0;
        face.add(smile); face.rotation.y = turn; group.add(face);
      }
      parent.add(group);
      return group;
    };
    const pile = (inner: number, floor: number) => {
      const spots: [number, number, number][] = [];
      for (let layer = 0; layer < 5; layer++) {
        const reach = inner - r - layer * r * 1.05;
        if (reach < 0) break;
        const y = floor + r * 0.8 + layer * r * 1.38;
        for (let ring = reach; ring >= 0; ring -= r * 2.08) {
          const n = ring < r * 0.6 ? 1 : Math.max(2, Math.floor((Math.PI * 2 * ring) / (r * 2.06)));
          const start = random() * 6;
          for (let k = 0; k < n; k++) spots.push([Math.cos(start + (k / n) * 6.283) * (n === 1 ? 0 : ring), y, Math.sin(start + (k / n) * 6.283) * (n === 1 ? 0 : ring)]);
        }
      }
      // Fill from the bottom up and, within a layer, from the middle out.
      spots.sort((p, q) => p[1] - q[1] || Math.hypot(p[0], p[2]) - Math.hypot(q[0], q[2]));
      return spots;
    };

    // --- Container ---------------------------------------------------------------------------
    const holder = new THREE.Group();
    holder.position.y = ground;
    s.root.add(holder);
    const into = <T extends THREE.Object3D>(mesh: T) => { holder.add(mesh); return mesh; };
    let inner = 0.125, floor = 0.012, rim = 0.15, tall = 0.075;
    const bamboo = (dark: boolean) => paint(128, 128, (c, w) => {
      c.fillStyle = dark ? '#8a6a3a' : '#c9a45a'; c.fillRect(0, 0, w, w);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
        const over = (i + j) % 2 === 0;
        c.fillStyle = over ? (dark ? '#a8854a' : '#e0c07a') : (dark ? '#6a4f2a' : '#a8843f');
        if (over) c.fillRect(i * 16 + 1, j * 16 + 3, 14, 10); else c.fillRect(i * 16 + 3, j * 16 + 1, 10, 14);
      }
    });
    if (a.holder === 'zaru' || a.holder === 'handled') {
      const deep = a.holder === 'handled';
      tall = deep ? 0.13 : 0.07; rim = deep ? 0.145 : 0.16; inner = deep ? 0.115 : 0.125; floor = 0.014;
      const weave = bamboo(mood.wear > 0.5);
      weave.repeat.set(deep ? 9 : 10, deep ? 3 : 2);
      const cane = new THREE.MeshStandardMaterial({ map: weave, roughness: 0.75, side: THREE.DoubleSide });
      const profile: [number, number][] = deep
        ? [[0, 0.008], [0.09, 0.008], [0.118, 0.03], [0.135, 0.08], [rim, tall]]
        : [[0, 0.008], [0.08, 0.008], [0.125, 0.025], [0.15, 0.05], [rim, tall]];
      into(s.lathe(profile, cane));
      const edge = s.material('#a07a3a', { roughness: 0.6 });
      into(s.ring(rim, 0.007, [0, tall, 0], edge)).rotation.x = Math.PI / 2;
      into(s.ring(profile[1][0], 0.005, [0, 0.006, 0], edge)).rotation.x = Math.PI / 2;
      if (deep) { const arch = into(s.ring(rim, 0.006, [0, tall, 0], edge, Math.PI)); arch.scale.y = 1.15; for (const x of [-1, 1]) into(s.ring(0.012, 0.003, [x * rim, tall + 0.004, 0], edge)).rotation.y = Math.PI / 2; }
    } else if (a.holder === 'lacquer') {
      tall = 0.085; rim = 0.15; inner = 0.12; floor = 0.03;
      into(s.lathe([[0, 0.022], [0.05, 0.022], [0.11, 0.045], [0.146, tall], [rim, tall], [0.12, 0.035], [0.07, 0.014], [0.07, 0], [0.055, 0], [0.05, 0.012], [0, 0.012]], s.material('#7a1c16', { roughness: 0.2, side: THREE.DoubleSide })));
      into(s.ring(rim - 0.002, 0.003, [0, tall, 0], s.material('#d9a93a', { metalness: 0.8, roughness: 0.3 }))).rotation.x = Math.PI / 2;
    } else if (a.holder === 'box') {
      tall = 0.1; rim = 0.2; inner = 0.135; floor = 0.006;
      const side = paint(256, 128, (c, w, h) => {
        c.fillStyle = '#c9a777'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#e8801c'; c.beginPath(); c.arc(64, 64, 34, 0, 7); c.fill();
        c.fillStyle = '#3f6a2f'; c.beginPath(); c.ellipse(86, 30, 18, 8, -0.5, 0, 7); c.fill();
        c.fillStyle = '#b84a1c'; c.fillRect(116, 36, 120, 16); c.fillRect(116, 62, 84, 10); c.fillRect(116, 82, 104, 10);
        c.strokeStyle = 'rgba(90,60,30,0.3)'; for (let x = 0; x < w; x += 6) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      });
      side.wrapS = side.wrapT = THREE.ClampToEdgeWrapping;
      const card = s.material('#c9a777', { roughness: 0.95 });
      const printed = new THREE.MeshStandardMaterial({ map: side, roughness: 0.95 });
      const bw = 0.34, bd = 0.28;
      into(s.box([bw, 0.006, bd], [0, 0.003, 0], card));
      for (const z of [-1, 1]) into(s.mesh(new THREE.BoxGeometry(bw, tall, 0.006), printed, [0, tall / 2, z * bd / 2]));
      for (const x of [-1, 1]) into(s.box([0.006, tall, bd], [x * bw / 2, tall / 2, 0], card));
      // Flaps folded outward at four different droops.
      for (const z of [-1, 1]) { const flap = into(s.box([bw, 0.005, bd * 0.48], [0, tall + 0.03, z * (bd / 2 + bd * 0.2)], card)); flap.rotation.x = z * (0.5 + random() * 0.7); flap.position.y = tall - Math.sin(Math.abs(flap.rotation.x)) * bd * 0.24 + 0.005; flap.position.z = z * (bd / 2 + Math.cos(flap.rotation.x) * bd * 0.24); }
      for (const x of [-1, 1]) { const flap = into(s.box([bw * 0.32, 0.005, bd], [0, 0, 0], card)); const droop = 0.4 + random() * 0.9; flap.rotation.z = -x * droop; flap.position.set(x * (bw / 2 + Math.cos(droop) * bw * 0.16), tall - Math.sin(droop) * bw * 0.16 + 0.004, 0); }
    } else {
      tall = 0.02; rim = 0.13; inner = 0.105; floor = 0.002;
    }

    // --- The mandarins ------------------------------------------------------------------------
    const spots = pile(inner, floor);
    const capacity = a.holder === 'box' ? Math.min(spots.length, 26) : spots.length;
    const count = Math.max(1, Math.round(mix(1, capacity, a.left ** 1.15)));
    const kept = spots.slice(0, count);
    const topY = kept.reduce((most, spot) => Math.max(most, spot[1]), 0);
    const escaped: [number, number][] = [];
    kept.forEach(([x, y, z], index) => {
      if (spilled && index % 2 === 0) { escaped.push([x, z]); return; }
      const exposed = y > topY - r * 0.6 || Math.hypot(x, z) > inner - r * 1.6;
      fruit(holder, x + (random() - 0.5) * 0.006, y, z + (random() - 0.5) * 0.006, exposed).rotation.y += random() * 0.5;
    });
    if (a.holder === 'net') {
      const meshMap = paint(128, 128, (c, w) => {
        c.clearRect(0, 0, w, w);
        c.strokeStyle = '#d9281c'; c.lineWidth = 3;
        for (let k = -8; k < 16; k++) { c.beginPath(); c.moveTo(k * 16, 0); c.lineTo(k * 16 + 128, 128); c.stroke(); c.beginPath(); c.moveTo(k * 16 + 128, 0); c.lineTo(k * 16, 128); c.stroke(); }
      });
      meshMap.repeat.set(4, 2);
      const netting = new THREE.MeshStandardMaterial({ map: meshMap, alphaTest: 0.4, transparent: false, side: THREE.DoubleSide, roughness: 0.6 });
      const high = Math.max(topY + r * 1.1, 0.05);
      const bag = into(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0.5, Math.PI - 0.5), netting));
      bag.scale.set(inner + 0.03, high * 0.62, inner + 0.03); bag.position.y = high * 0.5;
      bag.castShadow = true;
      // The torn mouth of the bag, gathered and flopped to one side, with its label.
      into(s.mesh(new THREE.ConeGeometry(0.03, 0.07, 10, 1, true), netting, [inner * 0.9, 0.03, inner * 0.5])).rotation.z = -1.3;
      into(s.box([0.07, 0.002, 0.05], [inner + 0.07, 0.003, inner * 0.6], s.material('#f2d23a', { roughness: 0.6 }))).rotation.y = 0.5;
    }
    if (spilled) {
      // Tipped onto its side with half the fruit rolled out across the table.
      const tip = random() < 0.5 ? 1 : -1;
      if (a.holder !== 'net') { holder.rotation.z = -tip * (a.holder === 'box' ? Math.PI / 2 : 1.25); holder.position.set(-tip * 0.06, ground + (a.holder === 'box' ? 0.17 : rim * 0.94), 0); }
      escaped.forEach((_spot, index) => {
        const far = rim + 0.07 + random() * 0.3 + index * 0.012, ang = (random() - 0.5) * 1.9;
        const roll = fruit(s.root, tip * Math.cos(ang) * far + tip * 0.05, ground + r * 0.8, Math.sin(ang) * far, true);
        roll.rotation.set(random() * 3, random() * 3, random() * 3);
      });
    }

    // --- Peel, segments and what the eater left --------------------------------------------------
    const peelOut = s.material(base.clone().offsetHSL(0, 0, -0.02), { roughness: 0.6 });
    const pith = s.material('#f6e8c2', { roughness: 0.95 });
    const flesh = s.material(a.condition === 'turning' ? '#d99a4a' : '#f5a52e', { roughness: 0.45 });
    const flower = (x: number, y: number, z: number, petals: number, ragged: number) => {
      const turn = random() * 6;
      for (let k = 0; k < petals; k++) {
        const ang = turn + (k / petals) * 6.283 + (random() - 0.5) * ragged;
        const len = 0.044 * mix(1 - ragged * 0.5, 1 + ragged * 0.3, random());
        const lift = 0.05 + random() * 0.2 + ragged * 0.3;
        for (const [material, drop, shrink] of [[peelOut, 0, 1], [pith, 0.0016, 0.66]] as const) {
          const petal = s.ball([len * shrink, 0.003, 0.021 * shrink], [x + Math.cos(ang) * len * 0.82, y + 0.004 + drop + Math.sin(lift) * len * 0.5, z + Math.sin(ang) * len * 0.82], material, 8);
          petal.rotation.set(0, -ang, lift, 'YXZ');
        }
      }
      s.ball([0.016, 0.003, 0.016], [x, y + 0.004, z], peelOut, 8);
      s.ball([0.009, 0.003, 0.009], [x, y + 0.006, z], pith, 8);
    };
    const segment = (x: number, y: number, z: number, turn: number) => {
      const mesh = s.ball([0.02, 0.011, 0.009], [x, y + 0.011, z], flesh, 10);
      mesh.rotation.y = turn;
      return mesh;
    };
    const peeled = (x: number, y: number, z: number, wedges: number) => {
      for (let k = 0; k < wedges; k++) { const ang = (k / 10) * 6.283; const wedge = s.ball([0.011, 0.022, 0.016], [x + Math.cos(ang) * 0.012, y + 0.024, z + Math.sin(ang) * 0.012], flesh, 10); wedge.rotation.y = -ang; }
    };
    const out = rim + 0.06 + (a.holder === 'box' ? 0.04 : 0);
    const at = (angle: number, extra = 0): [number, number] => [Math.cos(angle) * (out + extra), Math.sin(angle) * (out + extra)];
    if (a.eater === 'grandparent') {
      const [x, z] = at(0.75);
      flower(x, ground, z, 5, 0);
      for (let k = 0; k < 5; k++) segment(x - 0.03 + k * 0.016, ground + 0.004, z + 0.006 * Math.sin(k), Math.PI / 2 + 0.1);
      const [hx, hz] = at(1.35);
      for (let k = 0; k < 8; k++) s.rod([hx + (random() - 0.5) * 0.02, ground + 0.002, hz + (random() - 0.5) * 0.02], [hx + (random() - 0.5) * 0.03, ground + 0.004, hz + (random() - 0.5) * 0.03], 0.0012, pith);
    } else if (a.eater === 'children') {
      const scraps = 3 + Math.floor(mood.density * 3);
      for (let k = 0; k < scraps; k++) { const [x, z] = at(0.2 + k * (2.2 / scraps) + random() * 0.2, random() * 0.1); flower(x, ground, z, 3 + Math.floor(random() * 4), 0.7); }
      const [px, pz] = at(1.1, 0.09);
      peeled(px, ground, pz, 6);
      for (let k = 0; k < 4; k++) { const [x, z] = at(0.5 + random() * 1.6, 0.05 + random() * 0.14); segment(x, ground, z, random() * 3); }
    } else if (a.eater === 'binger') {
      const [x, z] = at(0.8);
      const stack = 4 + Math.floor(random() * 3 + mood.density * 3);
      for (let k = 0; k < stack; k++) flower(x + (random() - 0.5) * 0.008, ground + k * 0.009, z + (random() - 0.5) * 0.008, 5, 0.12);
      const [qx, qz] = at(1.5, 0.02);
      peeled(qx, ground, qz, 3);
    } else if (a.eater === 'guest') {
      const [x, z] = at(0.6, 0.04);
      s.lathe([[0, 0.004], [0.04, 0.004], [0.062, 0.014], [0.064, 0.016], [0.04, 0.008], [0, 0.008]], s.material('#eef0ea', { roughness: 0.3, side: THREE.DoubleSide }), [x, ground, z]);
      fruit(s.root, x, ground + 0.008 + r * 0.8, z, true);
      const [cx, cz] = at(1.35, 0.03);
      s.cylinder(0.036, 0.028, 0.065, [cx, ground + 0.0325, cz], s.material('#5a7a8a', { roughness: 0.5 }), 16);
      s.cylinder(0.031, 0.031, 0.003, [cx, ground + 0.06, cz], s.material('#9aa63a', { roughness: 0.3 }), 16);
      s.cylinder(0.045, 0.045, 0.006, [cx, ground + 0.003, cz], s.material('#3a2218', { roughness: 0.4 }), 16);
    } else if (a.eater === 'cat') {
      flower(-out * 0.6, ground, out * 0.9, 4, 0.5);
    }

    return s.finish();
  },
});
