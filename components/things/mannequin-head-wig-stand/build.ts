import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { HUMAN, faceEllipse, faceLine, facePoint, headGeometry, paint, part, rod, tube, type HeadSpec } from './head';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export default defineThing({
  questions: {
    finish: choice('What era and finish is the mannequin?', {
      plaster50s: '1950s painted plaster: peach skin, arched brows, red lips, matte and slightly chalky.',
      fibreglass80s: 'Glossy 1980s fibreglass: tanned, blue eyeshadow, hot pink lips, hard shine.',
      abstract: 'A featureless white abstract egg of a head with only a nose, modern and blank.',
      chrome: 'Mirror chrome, features sculpted but unpainted.',
      ebony: 'Satin black with gold painted lips and lids, high fashion.',
    }),
    expression: choice('What is her painted expression?', {
      aloof: 'Aloof: heavy lids, level mouth, looking through you.',
      smiling: 'A fixed bright smile showing a strip of teeth.',
      closed: 'Eyes closed, lashes resting on the cheeks, serene.',
      startled: 'Wide round eyes and a small parted mouth.',
    }),
    wears: choice('What is she wearing on her head?', {
      bob: 'A sharp glossy black bob wig with a fringe.',
      long: 'A long honey-blonde wig falling past the shoulders.',
      party: 'A neon pink party wig, cheap and synthetic.',
      afro: 'A big round curly afro wig.',
      sunhat: 'A wide-brimmed straw sun hat with a ribbon.',
      beret: 'A felt beret pulled to one side.',
      headphones: 'Big over-ear headphones on a bald head.',
      scarf: 'A patterned headscarf and dark sunglasses.',
      nothing: 'Nothing: bald, or just her moulded painted hair.',
    }),
    damage: choice('What damage does she carry?', {
      none: 'None, intact.',
      nose: 'A chipped nose showing raw white plaster.',
      peeling: 'Paint peeling away in patches down one side.',
      marker: 'Scribbled on in marker: a moustache, glasses, a word on the forehead.',
    }),
    place: choice('Where has she ended up?', {
      boutique: 'A boutique window: glossy base, a small price card.',
      wigshop: 'A wig shop shelf: a numbered style card, a comb and pins at her base.',
      flea: 'A flea market: standing on an upturned crate with a handwritten price.',
      bedroom: 'Someone\'s bedroom: draped in bead necklaces and a string of fairy lights.',
    }),
    turn: choice('Which way is her head turned?', {
      front: 'Straight ahead.', left: 'Turned a little to her right, chin up.', right: 'Turned over her left shoulder.', tilt: 'Tilted, as if listening.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const o: HeadSpec = { ...HUMAN, nose: 0.021, lips: a.finish === 'abstract' ? 0 : 0.005, socket: a.finish === 'abstract' ? 0.002 : 0.007, brow: a.finish === 'abstract' ? 0 : 0.004, jaw: 0.46 };
    const painted = a.finish !== 'abstract' && a.finish !== 'chrome';
    const skinHex = { plaster50s: '#efc3a4', fibreglass80s: '#cf9468', abstract: '#f3f1ea', chrome: '#d5dadd', ebony: '#26211f' }[a.finish];
    const wear = mood.wear;
    const W = 2048, Hh = 1024;
    const lipCol = { plaster50s: '#b3202a', fibreglass80s: '#ee3f8e', abstract: '#000', chrome: '#000', ebony: '#c9a544' }[a.finish];
    const shadowCol = { plaster50s: 'rgba(120,90,70,0.45)', fibreglass80s: 'rgba(40,120,220,0.75)', abstract: '', chrome: '', ebony: 'rgba(201,165,68,0.85)' }[a.finish];
    const ink = a.finish === 'ebony' ? '#0a0808' : '#1c1412';

    const face = paint(W, Hh, (c) => {
      c.fillStyle = skinHex; c.fillRect(0, 0, W, Hh);
      const ex = o.eyeX, ey = o.eyeY;
      if (painted) {
        // Blush.
        for (const side of [-1, 1]) {
          c.fillStyle = `rgba(225,90,90,${a.finish === 'ebony' ? 0 : mix(0.1, 0.3, mood.cheer)})`;
          faceEllipse(c, o, side * 0.041, -0.03, 0.017, 0.012); c.fill();
        }
        for (const side of [-1, 1]) {
          const cx = side * ex;
          // Eyeshadow and brows.
          c.fillStyle = shadowCol; faceEllipse(c, o, cx, ey + 0.007, 0.016, 0.008); c.fill();
          c.strokeStyle = ink; c.lineWidth = 7; c.lineCap = 'round';
          const lift = a.expression === 'startled' ? 0.006 : a.expression === 'aloof' ? 0.002 : 0;
          faceLine(c, o, [[cx - side * 0.014, ey + 0.019 + lift], [cx, ey + 0.024 + lift], [cx + side * 0.015, ey + 0.02 + lift * 0.5]]); c.stroke();
          if (a.expression === 'closed') {
            c.lineWidth = 8;
            faceLine(c, o, [[cx - 0.013, ey + 0.001], [cx - 0.006, ey - 0.003], [cx, ey - 0.004], [cx + 0.006, ey - 0.003], [cx + 0.013, ey + 0.001]]); c.stroke();
            c.lineWidth = 3;
            for (let i = -4; i <= 4; i++) { faceLine(c, o, [[cx + i * 0.003, ey - 0.0035 + Math.abs(i) * 0.0008], [cx + i * 0.0036, ey - 0.0095 + Math.abs(i) * 0.001]]); c.stroke(); }
          } else {
            const open = a.expression === 'startled' ? 0.0085 : a.expression === 'aloof' ? 0.0045 : 0.006;
            c.fillStyle = '#f6f2ea'; faceEllipse(c, o, cx, ey, 0.0135, open); c.fill();
            c.save(); c.clip();
            const iy = a.expression === 'aloof' ? ey + 0.002 : ey;
            c.fillStyle = a.finish === 'ebony' ? '#c9a544' : a.finish === 'fibreglass80s' ? '#2f7a4a' : '#3b6fa0'; faceEllipse(c, o, cx, iy, 0.0062, 0.0062); c.fill();
            c.fillStyle = '#0a0a0a'; faceEllipse(c, o, cx, iy, 0.0028, 0.0028); c.fill();
            c.fillStyle = '#ffffff'; faceEllipse(c, o, cx + 0.002, iy + 0.002, 0.001, 0.001); c.fill();
            c.restore();
            c.strokeStyle = ink; c.lineWidth = 8;
            faceLine(c, o, [[cx - 0.0135, ey], [cx - 0.007, ey + open * 0.9], [cx, ey + open * 1.05], [cx + 0.007, ey + open * 0.9], [cx + 0.0135, ey], [cx + side * 0.019, ey + 0.004]]); c.stroke();
            c.lineWidth = 3;
            for (let i = -3; i <= 4; i++) { const lx = cx + side * i * 0.0034; faceLine(c, o, [[lx, ey + open * 0.95], [lx + side * 0.002, ey + open + 0.006]]); c.stroke(); }
            c.lineWidth = 2; faceLine(c, o, [[cx - 0.012, ey - open * 0.5], [cx, ey - open], [cx + 0.012, ey - open * 0.5]]); c.stroke();
          }
          c.fillStyle = 'rgba(60,30,25,0.55)'; faceEllipse(c, o, side * 0.0065, ey - 0.04, 0.0022, 0.0014); c.fill();
        }
        // Lips.
        const my = ey - 0.07;
        const smile = a.expression === 'smiling', wide = smile ? 0.024 : a.expression === 'startled' ? 0.012 : 0.019;
        const curl = smile ? 0.005 : a.expression === 'aloof' ? -0.001 : 0.001;
        c.fillStyle = lipCol; c.beginPath();
        const top: [number, number][] = [], bottom: [number, number][] = [];
        for (let i = 0; i <= 20; i++) {
          const t = i / 20 * 2 - 1, edge = 1 - t * t;
          const bow = 0.0055 * edge - 0.002 * Math.exp(-(t * t) / 0.02);
          top.push([t * wide, my + curl * t * t + bow * (a.expression === 'startled' ? 1.3 : 1)]);
          bottom.push([t * wide, my + curl * t * t - 0.0075 * edge * (smile ? 1.25 : a.expression === 'startled' ? 1.5 : 1)]);
        }
        faceLine(c, o, [...top, ...bottom.reverse()]); c.closePath(); c.fill();
        if (smile || a.expression === 'startled') {
          c.fillStyle = smile ? '#f8f5ee' : '#2a0e10';
          const inner: [number, number][] = [];
          for (let i = 0; i <= 12; i++) { const t = i / 12 * 2 - 1; inner.push([t * wide * 0.74, my + curl * t * t + 0.0012 * (1 - t * t)]); }
          for (let i = 12; i >= 0; i--) { const t = i / 12 * 2 - 1; inner.push([t * wide * 0.74, my + curl * t * t - 0.0042 * (1 - t * t)]); }
          faceLine(c, o, inner); c.closePath(); c.fill();
        } else { c.strokeStyle = 'rgba(40,10,12,0.8)'; c.lineWidth = 3; faceLine(c, o, top.map(([x]) => [x * 0.95, my + curl * (x / wide) * (x / wide) - 0.0005] as [number, number])); c.stroke(); }
      }
      // Damage and dirt, drawn in canvas space over the face half.
      if (a.damage === 'peeling') {
        const sideX = random() < 0.5 ? 0.02 : 0.3;
        for (let i = 0; i < 26; i++) {
          c.fillStyle = random() < 0.6 ? '#e9e4d8' : '#b9b1a2';
          const x = (sideX + random() * 0.22) * W, y = (0.2 + random() * 0.6) * Hh; c.beginPath();
          for (let k = 0; k < 9; k++) { const t = k / 9 * 6.28, r = (10 + random() * 46); c.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r * 1.3); }
          c.fill();
        }
      }
      if (a.damage === 'marker') {
        c.strokeStyle = a.finish === 'ebony' ? '#e8e8f0' : '#16308a'; c.lineWidth = 9; c.lineCap = 'round';
        faceLine(c, o, [[-0.022, -0.043], [-0.012, -0.047], [0, -0.044], [0.012, -0.047], [0.022, -0.043], [0.028, -0.036]]); c.stroke();
        faceLine(c, o, [[-0.022, -0.043], [-0.028, -0.037]]); c.stroke();
        for (const side of [-1, 1]) { faceEllipse(c, o, side * o.eyeX, o.eyeY, 0.018, 0.014); c.stroke(); }
        faceLine(c, o, [[-0.013, o.eyeY], [0.013, o.eyeY]]); c.stroke();
        const [fx, fy] = [0.25 * W, Math.acos(0.07 / o.H) / Math.PI * Hh];
        c.fillStyle = c.strokeStyle; c.font = 'bold 60px monospace'; c.textAlign = 'center';
        c.save(); c.translate(fx, fy); c.rotate(-0.08); c.fillText(['HI', 'LOL', 'XOXO', 'HELP', 'RIP'][Math.floor(random() * 5)], 0, 0); c.restore();
        for (let i = 0; i < 3; i++) { const x = (0.12 + random() * 0.26) * W, y = (0.55 + random() * 0.2) * Hh; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 6; k++) c.lineTo(x + (random() - 0.5) * 90, y + (random() - 0.5) * 60); c.stroke(); }
      }
      for (let i = 0; i < wear * 60; i++) { c.fillStyle = `rgba(70,60,50,${0.05 + random() * 0.12})`; c.beginPath(); c.arc(random() * W, random() * Hh, 6 + random() * 40, 0, 7); c.fill(); }
      for (let i = 0; i < wear * 30; i++) { c.strokeStyle = 'rgba(240,235,225,0.6)'; c.lineWidth = 1 + random() * 2; c.beginPath(); const x = random() * W, y = random() * Hh; c.moveTo(x, y); c.lineTo(x + (random() - 0.5) * 80, y + (random() - 0.5) * 80); c.stroke(); }
    });
    const shiny = { plaster50s: 0.75, fibreglass80s: 0.18, abstract: 0.22, chrome: 0.16, ebony: 0.4 }[a.finish];
    const skin = new THREE.MeshStandardMaterial({ map: face, roughness: Math.min(1, shiny + wear * 0.3), metalness: a.finish === 'chrome' ? 0.75 : 0 });
    const body = new THREE.MeshStandardMaterial({ color: new THREE.Color(skinHex).lerp(new THREE.Color('#6f6557'), wear * 0.2), roughness: Math.min(1, shiny + wear * 0.3), metalness: a.finish === 'chrome' ? 0.75 : 0 });
    const chromeM = new THREE.MeshStandardMaterial({ color: '#cfd4d6', metalness: 0.8, roughness: 0.25 + wear * 0.3 });
    const black = new THREE.MeshStandardMaterial({ color: '#17171a', roughness: 0.35 });

    // Base and pole, by place.
    let floorY = 0;
    if (a.place === 'flea') {
      const wood = new THREE.MeshStandardMaterial({ color: '#9a7448', roughness: 0.9 });
      floorY = 0.2;
      for (let i = 0; i < 4; i++) part(s.root, new THREE.BoxGeometry(0.4, 0.04, 0.012), wood, 0, 0.03 + i * 0.047, 0.15);
      for (let i = 0; i < 4; i++) part(s.root, new THREE.BoxGeometry(0.4, 0.04, 0.012), wood, 0, 0.03 + i * 0.047, -0.15);
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) part(s.root, new THREE.BoxGeometry(0.012, 0.04, 0.3), wood, side * 0.194, 0.03 + i * 0.047, 0);
      for (let i = 0; i < 5; i++) part(s.root, new THREE.BoxGeometry(0.07, 0.012, 0.31), wood, -0.16 + i * 0.08, 0.194, 0);
      for (const x of [-1, 1]) for (const z of [-1, 1]) part(s.root, new THREE.BoxGeometry(0.025, 0.19, 0.025), wood, x * 0.18, 0.095, z * 0.135);
    }
    const baseMat = a.place === 'boutique' ? black : a.place === 'bedroom' ? new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.5 }) : chromeM;
    part(s.root, new THREE.CylinderGeometry(0.105, 0.115, 0.018, 36), baseMat, 0, floorY + 0.009, 0);
    part(s.root, new THREE.CylinderGeometry(0.03, 0.05, 0.02, 20), chromeM, 0, floorY + 0.028, 0);
    const poleH = a.place === 'flea' ? 0.1 : 0.2;
    part(s.root, new THREE.CylinderGeometry(0.011, 0.011, poleH, 14), chromeM, 0, floorY + 0.02 + poleH / 2, 0);
    const bustBase = floorY + 0.02 + poleH;

    // Bust: a flattened lathe from the chest cut to the neck.
    const bust = new THREE.Group(); bust.position.y = bustBase; s.root.add(bust);
    const profile = [[0.001, 0], [0.1, 0], [0.118, 0.025], [0.135, 0.07], [0.138, 0.1], [0.12, 0.13], [0.078, 0.15], [0.054, 0.165], [0.05, 0.19], [0.047, 0.235]].map(([x, y]) => new THREE.Vector2(x, y));
    const torso = part(bust, new THREE.LatheGeometry(profile, 40), body);
    torso.scale.z = 0.6;
    part(bust, new THREE.CylinderGeometry(0.1, 0.1, 0.004, 32), black, 0, 0.001, 0).scale.z = 0.6;

    // Head.
    const head = new THREE.Group();
    head.position.set(0, 0.235 + 0.108, 0.01);
    head.scale.setScalar(1.3);
    bust.add(head);
    head.rotation.y = { front: 0.1, left: -0.3, right: 0.6, tilt: 0.2 }[a.turn] + (random() - 0.5) * 0.1;
    head.rotation.z = a.turn === 'tilt' ? 0.2 : 0;
    head.rotation.x = a.turn === 'left' ? -0.12 : 0;
    part(head, headGeometry(o), skin);
    for (const side of [-1, 1]) { const ear = part(head, new THREE.SphereGeometry(1, 12, 8), body, side * 0.073, 0, -0.008); ear.scale.set(0.008, 0.022, 0.013); ear.rotation.y = side * 0.4; }
    if (a.damage === 'nose') {
      const tip = facePoint(o, 0, o.eyeY - 0.036);
      const chip = part(head, new THREE.IcosahedronGeometry(0.0095, 0), new THREE.MeshStandardMaterial({ color: '#f7f5ee', roughness: 1, flatShading: true }), 0.002, tip.y, tip.z - 0.001);
      chip.rotation.set(random(), random(), random());
    }

    const hairShell = (colour: string, scale: number, low: number, fringe: number, rough = 0.35) => {
      const mat = new THREE.MeshStandardMaterial({ color: colour, roughness: rough, side: THREE.DoubleSide });
      part(head, headGeometry(o, Math.PI / 2 + 1.12, Math.PI * 2 - 2.24, 0, low, scale), mat);
      if (fringe > 0) part(head, headGeometry(o, Math.PI / 2 - 1.14, 2.28, 0, fringe, scale), mat);
      return mat;
    };
    const lights: THREE.MeshStandardMaterial[] = [];
    const topY = o.H * (1 + o.cranium);
    if (a.wears === 'bob' || a.wears === 'party') {
      const col = a.wears === 'bob' ? '#141218' : '#ff3fa4';
      hairShell(col, 1.11, 2.25, 0.98, a.wears === 'bob' ? 0.22 : 0.5);
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: a.wears === 'bob' ? 0.22 : 0.5 });
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) { const lock = part(head, new THREE.CapsuleGeometry(0.012, 0.07, 4, 8), mat, side * (0.074 - i * 0.002), -0.045, -0.004 + i * 0.011); lock.rotation.z = side * 0.08; }
    } else if (a.wears === 'long') {
      const mat = hairShell('#d8a94e', 1.1, 2.0, 0.7, 0.45);
      const curtain = part(head, new THREE.CylinderGeometry(0.09, 0.105, 0.3, 24, 1, true, Math.PI / 2 + 0.1, Math.PI - 0.2), mat, 0, -0.17, 0.0);
      curtain.scale.z = 0.95;
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) tube(head, [V(side * 0.075, 0.03, 0.02 + i * 0.012), V(side * (0.082 + i * 0.003), -0.07, 0.03 + i * 0.012), V(side * (0.078 - i * 0.008), -0.17, 0.05 + i * 0.008), V(side * (0.085 - i * 0.012), -0.25 - random() * 0.03, 0.055)], 0.012, mat);
    } else if (a.wears === 'afro') {
      const pts: { at: readonly [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 170; i++) {
        const u = random() * 2 - 1, t = random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
        const p = V(Math.cos(t) * r * 0.125, u * 0.115 + 0.045, Math.sin(t) * r * 0.125 - 0.012);
        if (p.z > 0.045 && p.y < 0.06) continue;
        if (p.y < -0.05) continue;
        pts.push({ at: [p.x, p.y, p.z], size: 0.022 + random() * 0.012 });
      }
      const afro = s.scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#2a1a12', roughness: 0.95 }), pts);
      head.add(afro);
    } else if (a.wears === 'sunhat') {
      const straw = new THREE.MeshStandardMaterial({ color: '#dcc188', roughness: 0.85, side: THREE.DoubleSide });
      const hat = new THREE.Group(); hat.position.set(0, 0.055, -0.005); hat.rotation.x = -0.12; head.add(hat);
      part(hat, new THREE.LatheGeometry([[0.24, -0.012], [0.2, 0], [0.1, 0.012], [0.086, 0.02], [0.084, 0.07], [0.07, 0.092], [0.001, 0.098]].map(([x, y]) => new THREE.Vector2(x, y)), 40), straw);
      part(hat, new THREE.CylinderGeometry(0.087, 0.089, 0.022, 32, 1, true), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#d8402c' : '#22304a', roughness: 0.6 }), 0, 0.032, 0);
      if (a.finish === 'plaster50s') hairShell('#5a3320', 1.03, 1.9, 0.75, 0.3);
    } else if (a.wears === 'beret') {
      const felt = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#b3202a' : '#1d2433', roughness: 0.95 });
      const beret = part(head, new THREE.SphereGeometry(1, 24, 14), felt, 0.02, topY * 0.86, -0.01);
      beret.scale.set(0.105, 0.03, 0.1); beret.rotation.z = -0.32;
      part(head, new THREE.CylinderGeometry(0.003, 0.003, 0.015, 6), felt, -0.004, topY * 0.86 + 0.036, -0.01);
      hairShell(a.finish === 'ebony' ? '#101010' : '#5a3320', 1.035, 1.95, 0.72, 0.3);
    } else if (a.wears === 'headphones') {
      const cup = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.6 ? '#e8e2d4' : '#1b1c20', roughness: 0.4 });
      const pad = new THREE.MeshStandardMaterial({ color: '#2c2c30', roughness: 0.9 });
      const band = part(head, new THREE.TorusGeometry(0.092, 0.008, 8, 36, Math.PI), cup, 0, 0.012, -0.005);
      band.scale.y = 1.28;
      for (const side of [-1, 1]) {
        const c1 = part(head, new THREE.CylinderGeometry(0.04, 0.036, 0.03, 24), cup, side * 0.096, 0, -0.005); c1.rotation.z = Math.PI / 2;
        const c2 = part(head, new THREE.TorusGeometry(0.032, 0.011, 8, 24), pad, side * 0.08, 0, -0.005); c2.rotation.y = Math.PI / 2;
        const glow = new THREE.MeshStandardMaterial({ color: '#39c6ff', emissive: '#22aaff', emissiveIntensity: mix(0.2, 1.8, mood.energy) }); lights.push(glow);
        const ringL = part(head, new THREE.TorusGeometry(0.022, 0.003, 6, 20), glow, side * 0.112, 0, -0.005); ringL.rotation.y = Math.PI / 2;
      }
      tube(head, [V(-0.1, -0.035, -0.005), V(-0.105, -0.12, 0.03), V(-0.13, -0.2, 0.06), V(-0.1, -0.28, 0.09)], 0.003, black);
      if (a.finish === 'plaster50s') hairShell('#5a3320', 1.03, 1.9, 0.75, 0.3);
    } else if (a.wears === 'scarf') {
      const hue = random();
      const pattern = paint(256, 256, (c) => {
        c.fillStyle = `hsl(${hue * 360},60%,${mix(35, 55, mood.cheer)}%)`; c.fillRect(0, 0, 256, 256);
        c.fillStyle = `hsl(${(hue * 360 + 150) % 360},70%,70%)`;
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.beginPath(); c.arc(16 + i * 32, 16 + j * 32 + (i % 2) * 16, 7, 0, 7); c.fill(); }
      });
      pattern.wrapS = pattern.wrapT = THREE.RepeatWrapping; pattern.repeat.set(6, 4);
      const silk = new THREE.MeshStandardMaterial({ map: pattern, roughness: 0.5, side: THREE.DoubleSide });
      part(head, headGeometry(o, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0, 2.35, 1.08), silk);
      part(head, headGeometry(o, Math.PI / 2 - 1.05, 2.1, 0, 0.85, 1.08), silk);
      const knot = part(head, new THREE.SphereGeometry(0.016, 12, 8), silk, 0, -0.118, 0.045);
      knot.scale.y = 0.8;
      for (const side of [-1, 1]) { const tail = part(head, new THREE.ConeGeometry(0.018, 0.07, 8), silk, side * 0.025, -0.15, 0.05); tail.rotation.z = side * 0.5; tail.scale.z = 0.3; }
      const lens = new THREE.MeshStandardMaterial({ color: '#0d0d10', roughness: 0.08, metalness: 0.3 });
      for (const side of [-1, 1]) {
        const p = facePoint(o, side * o.eyeX, o.eyeY);
        const l = part(head, new THREE.CylinderGeometry(0.023, 0.023, 0.003, 24), lens, side * 0.034, o.eyeY, p.z + 0.012); l.rotation.x = Math.PI / 2; l.scale.z = 0.82;
        rod(head, V(side * 0.056, o.eyeY + 0.004, p.z + 0.01), V(side * 0.078, o.eyeY + 0.006, -0.01), 0.002, lens);
      }
      rod(head, V(-0.012, o.eyeY + 0.004, facePoint(o, 0, o.eyeY).z + 0.006), V(0.012, o.eyeY + 0.004, facePoint(o, 0, o.eyeY).z + 0.006), 0.002, lens);
    } else if (a.finish === 'plaster50s') hairShell('#5a3320', 1.035, 2.0, 0.78, 0.25);

    // Dressing by place.
    const cardAt = (text: string, x: number, z: number, ink2 = '#22201c', paper = '#f5efdc', tilt = -0.25) => {
      const card = s.label(text, 0.11, 0.07, [x, floorY + 0.04, z], ink2, paper);
      card.rotation.x = tilt; card.rotation.y = (random() - 0.5) * 0.5;
      part(s.root, new THREE.BoxGeometry(0.05, 0.008, 0.03), black, x, floorY + 0.004, z - 0.008);
      return card;
    };
    if (a.place === 'boutique') cardAt(['£48', 'NEW IN', 'SALE', '$120'][Math.floor(random() * 4)], 0.16, 0.1, '#f5efdc', '#17171a');
    else if (a.place === 'wigshop') {
      cardAt('No. ' + (3 + Math.floor(random() * 40)), 0.16, 0.1);
      const combMat = new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.4 });
      const comb = new THREE.Group(); comb.position.set(-0.17, 0.004, 0.1); comb.rotation.y = random() * 3; s.root.add(comb);
      part(comb, new THREE.BoxGeometry(0.13, 0.005, 0.012), combMat);
      for (let i = 0; i < 18; i++) part(comb, new THREE.BoxGeometry(0.002, 0.004, 0.025), combMat, -0.06 + i * 0.007, 0, 0.018);
      for (let i = 0; i < 5; i++) { const pin = rod(s.root, V(-0.1 + random() * 0.08, 0.002, 0.14 + random() * 0.04), V(-0.06 + random() * 0.08, 0.002, 0.15 + random() * 0.05), 0.001, chromeM, 5); pin.castShadow = false; }
    } else if (a.place === 'flea') {
      const card = s.label(['$5', '$3 OBO', '50p', 'NOT FOR SALE'][Math.floor(random() * 4)], 0.13, 0.09, [0.12, 0.1, 0.158], '#16308a', '#e9dfc4');
      card.rotation.z = (random() - 0.5) * 0.3;
    } else {
      // Bedroom: bead necklaces and fairy lights.
      const beadCols = ['#e8e2d4', '#c9a544', '#3fb6a8', '#d8402c'];
      for (let n = 0; n < 2 + Math.floor(mood.density * 3); n++) {
        const pts: { at: readonly [number, number, number]; size: number }[] = [];
        const drop = 0.05 + n * 0.035 + random() * 0.02;
        for (let i = 0; i <= 40; i++) {
          const t = i / 40 * Math.PI * 2;
          const front = (1 - Math.cos(t)) / 2;
          pts.push({ at: [Math.sin(t) * (0.05 + front * 0.03), bustBase + 0.185 - front * drop, -0.03 + front * (0.085 + n * 0.006)], size: 0.0045 });
        }
        s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: beadCols[(n + Math.floor(random() * 4)) % 4], roughness: 0.25, metalness: 0.2 }), pts);
      }
      const wire = [] as THREE.Vector3[];
      for (let i = 0; i <= 26; i++) { const t = i / 26 * Math.PI * 3.2; wire.push(V(Math.cos(t) * (0.14 - i * 0.001), bustBase + 0.125 - i * 0.0045, Math.sin(t) * 0.086)); }
      tube(s.root, wire, 0.0015, new THREE.MeshStandardMaterial({ color: '#2f5a3a', roughness: 0.7 }));
      wire.forEach((p, i) => {
        if (i % 2) return;
        const glow = new THREE.MeshStandardMaterial({ color: '#fff0b8', emissive: '#ffd060', emissiveIntensity: mix(0.5, 2.6, mood.energy) }); lights.push(glow);
        part(s.root, new THREE.SphereGeometry(0.006, 8, 6), glow, p.x, p.y + 0.004, p.z);
      });
    }

    return s.finish({
      update: (_dt, time) => { lights.forEach((m, i) => { m.emissiveIntensity = mix(0.5, 2.2, mood.energy) * (0.75 + 0.25 * Math.sin(time * mix(0.6, 5, mood.energy) + i * 1.7)); }); },
    });
  },
});
