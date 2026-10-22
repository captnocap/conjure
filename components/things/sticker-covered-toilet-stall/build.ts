import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const BANDS = ['RATS', 'SPIT', 'THE DREGS', 'KAOS', 'NERVE', 'SLUGS', 'BLEACH', 'X-RAY', 'DEAD MALL', 'HISS', 'TEETH', 'VERMIN', 'NO SLEEP', 'GLUE', 'STATIC', 'MOLD', 'PIGEON', 'WASP'];
const VERSE = ['i was here', 'and so were you', 'nobody is ugly', 'at 1 a.m.', 'the bass comes', 'through the wall', 'like a heartbeat', 'text her back', 'we were loud', 'once', 'stay soft', 'bite hard', 'dont go home yet', 'mind the gap', 'she said yes'];
const SLOGANS = ['NO FUTURE', 'EAT THE RICH', 'RENT IS THEFT', 'SMASH IT UP', 'NO BORDERS', 'DIY OR DIE', 'RIOT', 'NOT YOUR DOLL', 'UNION NOW', 'BE GAY DO CRIME'];
const NAMES = ['JO', 'KAT', 'DEE', 'MAX', 'SID', 'ROXY', 'AL', 'VIV', 'RAY', 'NIX', 'BEX', 'TAM'];
const BRIGHT = ['#ff2a7a', '#ffe02a', '#27d0e8', '#7be02a', '#ff7a1a', '#f4f1e6', '#111111', '#c4122f', '#8a3be0', '#f4f1e6'];
const HEAD = {
  nofuture: 'NO FUTURE', loved: 'YOU ARE LOVED', front: 'GIRLS TO THE FRONT', sucks: 'THIS BAND SUCKS',
  gods: 'NO GODS NO MASTERS', forever: 'J + K 4 EVER', fine: 'YOU LOOK FINE', none: '',
} as const;

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    dominant: choice('What covers the door most?', {
      stickers: 'Band stickers, layered three deep in every colour, corners peeling.',
      poetry: 'Marker poetry: lines of small handwriting running down the door.',
      slogans: 'Political slogans in thick stencil and paint-pen capitals.',
      hearts: 'Hearts, initials and names, a record of who loved whom.',
    }),
    headline: choice('What is the big hand-painted message across the door?', {
      nofuture: 'NO FUTURE', loved: 'YOU ARE LOVED', front: 'GIRLS TO THE FRONT', sucks: 'THIS BAND SUCKS',
      gods: 'NO GODS NO MASTERS', forever: 'J + K 4 EVER', fine: 'YOU LOOK FINE', none: 'No big message, only the small stuff.',
    }),
    door: choice('What state is the door in?', {
      locked: 'Shut and locked, the indicator showing red.',
      ajar: 'Ajar, swung partly inward so the toilet shows.',
      wide: 'Wide open and empty.',
      offhinge: 'Kicked off its top hinge, hanging crooked into the room.',
    }),
    gap: choice('What shows under the gap at the bottom?', {
      nothing: 'Nothing, bare floor.',
      boots: 'One pair of heavy boots, someone hiding or waiting.',
      twopairs: 'Two pairs of feet in one stall, friends or more.',
      glove: 'A single dropped fingerless glove on the floor outside.',
      paper: 'A trail of toilet roll running out across the floor.',
      flood: 'Water spreading out from underneath.',
    }),
    paintwork: choice('What colour is the stall painted under it all?', {
      green: 'Institutional green.', oxblood: 'Dark oxblood red.', black: 'Black gloss, so paint-pen shows up.',
      cream: 'Nicotine cream.', pink: 'Baby pink, repainted by the collective.', blue: 'Swimming-pool blue.',
    }),
    slung: noul('Is a jacket slung over the top of the door?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const base = { green: '#5f8f78', oxblood: '#7a2a2c', black: '#26252a', cream: '#d9cfa8', pink: '#e8a9bd', blue: '#4f9fc0' }[a.paintwork];
    const darkBase = a.paintwork === 'black' || a.paintwork === 'oxblood';
    const marker = darkBase ? '#f1ede0' : '#141218';

    const scrawl = (g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, colour: string, weight = 'bold', wobble = 0.12) => {
      g.fillStyle = colour;
      g.font = `${weight} ${size}px sans-serif`;
      g.textBaseline = 'middle';
      let cx = x;
      for (const ch of text) {
        g.save();
        g.translate(cx, y + (random() - 0.5) * size * 0.18);
        g.rotate((random() - 0.5) * wobble * 2);
        g.fillText(ch, 0, 0);
        g.restore();
        cx += g.measureText(ch).width * (0.92 + random() * 0.12);
      }
      return cx - x;
    };
    const heart = (g: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, fill: boolean) => {
      g.beginPath();
      g.moveTo(x, y + r * 0.9);
      g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.3, x, y - r * 0.4);
      g.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
      if (fill) { g.fillStyle = colour; g.fill(); } else { g.strokeStyle = colour; g.lineWidth = Math.max(3, r * 0.16); g.stroke(); }
    };
    const sticker = (g: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      const colour = pick(BRIGHT), ink = colour === '#111111' || colour === '#c4122f' || colour === '#8a3be0' ? '#f4f1e6' : '#111111';
      const round = random() < 0.25, sw = size * (round ? 1 : 1.2 + random() * 0.9), sh = size * (round ? 1 : 0.55 + random() * 0.4);
      g.save();
      g.translate(x, y);
      g.rotate((random() - 0.5) * 0.9);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(-sw / 2 + 3, -sh / 2 + 3, sw, sh);
      g.fillStyle = colour;
      g.beginPath();
      if (round) g.arc(0, 0, sw / 2, 0, 7); else g.rect(-sw / 2, -sh / 2, sw, sh);
      g.fill();
      g.fillStyle = ink;
      const word = pick(BANDS);
      g.font = `bold ${Math.min(sh * 0.62, (sw * 1.5) / word.length)}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(word, 0, 0, sw * 0.9);
      if (!round && random() < 0.4) { g.fillRect(-sw / 2, -sh / 2, sw, sh * 0.12); g.fillRect(-sw / 2, sh * 0.38, sw, sh * 0.12); }
      // Peeled corner: the paint shows through.
      if (random() < 0.25 + mood.wear * 0.5) { g.fillStyle = base; g.beginPath(); g.moveTo(sw / 2, -sh / 2); g.lineTo(sw / 2 - sw * 0.35, -sh / 2); g.lineTo(sw / 2, -sh / 2 + sh * 0.6); g.fill(); }
      g.restore();
      g.textAlign = 'left';
    };

    /** One painted face of the stall. `weight` is how much of each kind of mark it carries. */
    const face = (w: number, h: number, weight: number, withHeadline: boolean) => paint(w, h, (g) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      // Brushed paint and old chips.
      for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '0,0,0'},0.04)`; g.fillRect(0, random() * h, w, 2 + random() * 6); }
      for (let k = 0; k < 6 + mood.wear * 40; k++) { g.fillStyle = random() < 0.5 ? '#8f9396' : '#5c5346'; g.beginPath(); g.ellipse(random() * w, random() * h, 2 + random() * 9, 2 + random() * 6, random() * 3, 0, 7); g.fill(); }
      const amount = weight * mix(0.45, 1.2, mood.density);
      const share = (kind: typeof a.dominant) => (a.dominant === kind ? 1 : 0.22);
      for (let k = 0; k < amount * 46 * share('stickers'); k++) sticker(g, random() * w, random() * h, w * (0.1 + random() * 0.12));
      for (let k = 0; k < amount * 9 * share('slogans'); k++) {
        const text = pick(SLOGANS), size = w * (0.07 + random() * 0.06);
        g.save();
        g.translate(random() * w * 0.5, h * (0.06 + random() * 0.9));
        g.rotate((random() - 0.5) * 0.25);
        if (random() < 0.5) { g.font = `bold ${size}px sans-serif`; const tw = g.measureText(text).width; g.fillStyle = pick(['#c4122f', '#111111', '#f4f1e6']); g.fillRect(-8, -size * 0.7, tw + 30, size * 1.4); scrawl(g, text, 4, 0, size, g.fillStyle === '#f4f1e6' ? '#111111' : '#f4f1e6', 'bold', 0.02); }
        else scrawl(g, text, 0, 0, size, pick(['#c4122f', marker, '#ffe02a']), 'bold', 0.05);
        g.restore();
      }
      for (let k = 0; k < amount * 5 * share('poetry'); k++) {
        let y = h * (0.05 + random() * 0.75);
        const x = w * (0.04 + random() * 0.4), size = w * (0.038 + random() * 0.022), colour = random() < 0.8 ? marker : pick(['#c4122f', '#1d4dff', '#8a3be0']);
        g.save();
        g.translate(x, y);
        g.rotate((random() - 0.5) * 0.16);
        y = 0;
        for (let line = 0; line < 3 + Math.floor(random() * 4); line++) { scrawl(g, pick(VERSE), random() * 14, y, size, colour, 'italic', 0.07); y += size * 1.25; }
        g.restore();
      }
      for (let k = 0; k < amount * 16 * share('hearts'); k++) {
        const x = w * (0.1 + random() * 0.8), y = h * (0.05 + random() * 0.9), r = w * (0.035 + random() * 0.06), colour = pick(['#ff2a7a', '#c4122f', marker, '#ff2a7a', '#f4f1e6']);
        heart(g, x, y, r, colour, random() < 0.3);
        if (random() < 0.7) scrawl(g, `${pick(NAMES)} + ${pick(NAMES)}`, x - r * 1.3, y + r * 1.5, r * 0.62, colour === '#f4f1e6' ? marker : colour, 'bold', 0.1);
      }
      // Tags, a phone number and scratches belong on every stall.
      for (let k = 0; k < 3 + amount * 5; k++) scrawl(g, pick([...NAMES, 'WOZ ERE', 'XXX', '1977', 'OI!', 'HELP', 'LOL', '<3']), random() * w * 0.8, random() * h, w * (0.035 + random() * 0.04), pick([marker, marker, '#c4122f', '#1d4dff']), 'bold', 0.2);
      if (withHeadline) {
        g.save();
        g.translate(w * 0.08, h * 0.83);
        g.rotate(-0.06);
        scrawl(g, 'for a good time', 0, 0, w * 0.045, marker, 'italic', 0.06);
        scrawl(g, `call ${pick(NAMES)} 555-01${10 + Math.floor(random() * 89)}`, 0, w * 0.065, w * 0.055, marker, 'bold', 0.06);
        g.restore();
        const words = HEAD[a.headline].split(' ').filter(Boolean);
        if (words.length) {
          const lines: string[] = [];
          for (const word of words) { const last = lines[lines.length - 1]; if (last !== undefined && (last + ' ' + word).length <= 8) lines[lines.length - 1] = `${last} ${word}`; else lines.push(word); }
          const colour = darkBase ? pick(['#f4f1e6', '#ffe02a', '#ff2a7a']) : pick(['#111111', '#c4122f', '#f4f1e6']);
          const size = Math.min((h * 0.44) / lines.length, w * 0.3);
          g.save();
          g.translate(w / 2, h * 0.12 + size * 0.5);
          g.rotate((random() - 0.5) * 0.1);
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          lines.forEach((line, index) => {
            g.font = `bold ${Math.min(size, (w * 1.55) / line.length)}px sans-serif`;
            const y = index * size * 0.98;
            g.lineJoin = 'round';
            g.strokeStyle = colour === '#111111' ? 'rgba(244,241,230,0.9)' : 'rgba(10,10,12,0.9)';
            g.lineWidth = size * 0.1;
            g.strokeText(line, 0, y, w * 0.92);
            g.fillStyle = colour;
            g.fillText(line, 0, y, w * 0.92);
            // Paint runs.
            for (let d = 0; d < 4; d++) { const dx = (random() - 0.5) * w * 0.7; g.fillRect(dx, y + size * 0.3, 3 + random() * 4, size * (0.2 + random() * 0.7)); }
          });
          g.restore();
          g.textAlign = 'left';
        }
      }
      // Key scratches and grime at kick height.
      g.strokeStyle = 'rgba(230,230,225,0.5)';
      g.lineWidth = 1.5;
      for (let k = 0; k < mood.wear * 40; k++) { const x = random() * w, y = random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (random() - 0.5) * 120, y + (random() - 0.5) * 60); g.stroke(); }
      const grime = g.createLinearGradient(0, h, 0, h * 0.7);
      grime.addColorStop(0, `rgba(40,34,28,${0.25 + mood.wear * 0.45})`);
      grime.addColorStop(1, 'rgba(40,34,28,0)');
      g.fillStyle = grime;
      g.fillRect(0, 0, w, h);
    });

    const dw = 0.62, dh = 1.58, gapY = 0.3, pw = 0.14, depth = 1.2, top = gapY + dh;
    const half = dw / 2 + pw;
    const plain = s.material(base, { roughness: 0.55 });
    const steel = s.material('#aab0b2', { metalness: 0.8, roughness: 0.35 });
    const skin = (texture: THREE.Texture) => new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6 + mood.wear * 0.25 });
    const boxed = (size: [number, number, number], front: THREE.Material, faceIndex: number) => {
      const materials = Array.from({ length: 6 }, (_unused, index) => (index === faceIndex ? front : plain));
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), materials);
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    };

    // Pilasters either side of the door, on steel shoes, and the head rail that ties them together.
    for (const side of [-1, 1]) {
      const pilaster = boxed([pw, top + 0.08 - 0.1, 0.035], skin(face(128, 1024, 0.5, false)), 4);
      pilaster.position.set(side * (dw / 2 + pw / 2), 0.1 + (top - 0.02) / 2, 0);
      s.root.add(pilaster);
      s.box([pw * 0.5, 0.1, 0.05], [side * (dw / 2 + pw / 2), 0.05, 0], steel);
      s.box([pw * 0.8, 0.012, 0.09], [side * (dw / 2 + pw / 2), 0.006, 0], steel);
      // Side partitions, tagged on the outside too.
      const wall = boxed([0.03, dh, depth], skin(face(640, 840, 0.55, false)), side > 0 ? 0 : 1);
      wall.position.set(side * (half - 0.015), gapY + dh / 2, -depth / 2);
      s.root.add(wall);
      s.box([0.05, gapY, 0.05], [side * (half - 0.015), gapY / 2, -depth * 0.55], steel);
    }
    s.box([half * 2 + 0.04, 0.045, 0.05], [0, top + 0.08, 0], steel);
    // Back wall of grubby tile with the cistern on it.
    const tile = paint(256, 512, (g, w, h) => {
      g.fillStyle = '#8b887c';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 12; j++) {
        const light = 205 - mood.wear * 45 + (random() - 0.5) * 22;
        g.fillStyle = `rgb(${light},${light - 3},${light - 14})`;
        g.fillRect(i * (w / 6) + 2, j * (h / 12) + 2, w / 6 - 4, h / 12 - 4);
      }
      for (let k = 0; k < 4; k++) scrawl(g, pick(BANDS), random() * w * 0.5, h * (0.1 + random() * 0.5), 22, pick(['#141218', '#c4122f']), 'bold', 0.15);
    });
    const back = boxed([half * 2, top + 0.1, 0.06], skin(tile), 4);
    back.position.set(0, (top + 0.1) / 2, -depth - 0.03);
    s.root.add(back);

    // The toilet itself.
    const china = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f0eee6').lerp(new THREE.Color('#b9b095'), mood.wear * 0.6), roughness: 0.3 });
    const bowl = s.lathe([[0.09, 0], [0.12, 0.04], [0.09, 0.12], [0.12, 0.28], [0.18, 0.39], [0.19, 0.41], [0.15, 0.41], [0.1, 0.3]], china, [0, 0, -depth + 0.42]);
    bowl.scale.z = 1.3;
    const seat = s.ring(0.17, 0.025, [0, 0.42, -depth + 0.42], s.material(pick(['#18171a', '#f0eee6', '#5a3a22']), { roughness: 0.4 }));
    seat.rotation.x = Math.PI / 2;
    seat.scale.set(1, 1.3, 1);
    s.box([0.4, 0.34, 0.15], [0, 0.78, -depth + 0.1], china);
    s.box([0.43, 0.03, 0.18], [0, 0.96, -depth + 0.1], china);
    s.cylinder(0.02, 0.02, 0.22, [0, 0.52, -depth + 0.12], steel, 10);
    const roll = s.cylinder(0.055, 0.055, 0.1, [half - 0.1, 0.72, -depth * 0.5], s.material('#f3f0e6'), 16);
    roll.rotation.z = Math.PI / 2;

    // The door, hung on the left pilaster.
    const door = new THREE.Group();
    door.position.set(-dw / 2, 0, 0.004);
    const leaf = boxed([dw - 0.012, dh - 0.02, 0.03], skin(face(512, 1280, 1, true)), 4);
    leaf.position.set(dw / 2, gapY + dh / 2, 0);
    door.add(leaf);
    const locked = a.door === 'locked';
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 20), new THREE.MeshStandardMaterial({ color: locked ? '#d8202a' : '#2fbf5a', emissive: locked ? '#d8202a' : '#2fbf5a', emissiveIntensity: 0.6, roughness: 0.4 }));
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(dw - 0.07, 1.12, 0.02);
    const pull = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.03), steel);
    pull.position.set(dw - 0.07, 0.98, 0.03);
    pull.castShadow = true;
    door.add(bolt, pull);
    if (a.slung) {
      const cloth = s.material(pick(['#1b1a1d', '#2f4a78', '#5a1f24', '#3c4a2a']), { roughness: 0.85 });
      const x = dw * (0.3 + random() * 0.35);
      for (const [dz, drop] of [[0.03, 0.34 + random() * 0.2], [-0.03, 0.3 + random() * 0.25]] as const) {
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.34, drop, 0.025), cloth);
        flap.position.set(x, top - drop / 2 + 0.01, dz);
        flap.rotation.z = (random() - 0.5) * 0.08;
        flap.castShadow = true;
        door.add(flap);
      }
      const fold = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.085), cloth);
      fold.position.set(x, top + 0.005, 0);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.5, 10), cloth);
      sleeve.position.set(x - 0.2, top - 0.27, 0.04);
      sleeve.rotation.z = -0.12;
      sleeve.castShadow = true;
      door.add(fold, sleeve);
    }
    for (const y of [gapY + 0.2, top - 0.2]) s.cylinder(0.012, 0.012, 0.1, [-dw / 2, y, 0.02], steel, 10);
    if (a.door === 'ajar') door.rotation.y = 0.5 + random() * 0.3;
    else if (a.door === 'wide') door.rotation.y = 1.25 + random() * 0.2;
    else if (a.door === 'offhinge') { door.rotation.set(0.05, -0.3 - random() * 0.2, -0.09 - random() * 0.05); door.position.y = -0.03; }
    else door.rotation.y = (random() - 0.5) * 0.02;
    s.root.add(door);

    // What shows under the gap.
    const boot = (x: number, z: number, turn: number, colour: string) => {
      const g = new THREE.Group();
      const leather = s.material(colour, { roughness: 0.4 });
      const sole = s.material('#c9b46a', { roughness: 0.8 });
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = true; g.add(mesh); };
      const part = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale: [number, number, number] = [1, 1, 1]) => { const m = new THREE.Mesh(geometry, material); m.position.set(...at); m.scale.set(...scale); add(m); };
      part(new THREE.BoxGeometry(0.105, 0.03, 0.29), sole, [0, 0.015, 0]);
      part(new THREE.BoxGeometry(0.095, 0.07, 0.2), leather, [0, 0.065, -0.04]);
      part(new THREE.SphereGeometry(0.05, 14, 10), leather, [0, 0.06, 0.085], [0.98, 0.9, 1.15]);
      part(new THREE.CylinderGeometry(0.052, 0.05, 0.2, 14), leather, [0, 0.19, -0.075]);
      for (let k = 0; k < 4; k++) part(new THREE.BoxGeometry(0.05, 0.006, 0.006), s.material('#f1e9c9'), [0, 0.12 + k * 0.035, -0.022]);
      g.position.set(x, 0, z);
      g.rotation.y = turn;
      s.root.add(g);
    };
    const inside = locked ? -0.2 : a.door === 'offhinge' ? -0.3 : -0.62;
    if (a.gap === 'boots' || a.gap === 'twopairs') {
      const colour = pick(['#18171a', '#5a1418', '#18171a']);
      boot(-0.08 - (a.gap === 'twopairs' ? 0.12 : 0), inside, 0.12 + random() * 0.15, colour);
      boot(0.07 - (a.gap === 'twopairs' ? 0.12 : 0), inside - 0.02, -0.1 - random() * 0.2, colour);
      if (a.gap === 'twopairs') {
        const other = pick(['#f1f1ee', '#e04a8a', '#2f6fd0', '#e8c62a']);
        boot(0.13, inside - 0.08, -0.9, other);
        boot(0.22, inside - 0.2, -1.1, other);
      }
    } else if (a.gap === 'glove') {
      const wool = s.material(pick(['#18171a', '#c4122f', '#7be02a', '#8a3be0']), { roughness: 0.9 });
      const gx = (random() - 0.5) * 0.3, gz = 0.16 + random() * 0.15, turn = random() * 6.3;
      const glove = new THREE.Group();
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.022, 0.11), wool);
      palm.castShadow = true;
      glove.add(palm);
      for (let k = 0; k < 4; k++) { const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.04, 8), wool); finger.rotation.x = Math.PI / 2; finger.position.set(-0.033 + k * 0.022, 0, 0.073); glove.add(finger); }
      const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.013, 0.045, 8), wool);
      thumb.rotation.set(Math.PI / 2, 0, 0.8);
      thumb.position.set(0.055, 0, 0.02);
      const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.026, 0.04), s.material('#d8d2c2', { roughness: 0.9 }));
      cuff.position.z = -0.07;
      glove.add(thumb, cuff);
      glove.position.set(gx, 0.012, gz);
      glove.rotation.y = turn;
      s.root.add(glove);
    } else if (a.gap === 'paper') {
      const tissue = s.material('#f3f0e6', { roughness: 0.9, side: THREE.DoubleSide });
      let x = 0.05, z = -0.5, heading = 0.2;
      for (let k = 0; k < 16; k++) {
        const length = 0.09;
        heading += (random() - 0.5) * 0.7;
        const nx = x + Math.sin(heading) * length, nz = z + Math.cos(Math.abs(heading) > 1.2 ? heading * 0.5 : heading) * length;
        const strip = s.box([0.1, 0.004, length * 1.08], [(x + nx) / 2, 0.004 + (k % 2) * 0.003, (z + nz) / 2], tissue);
        strip.rotation.y = Math.atan2(nx - x, nz - z);
        x = nx; z = nz;
      }
      const end = s.cylinder(0.05, 0.05, 0.1, [x + 0.02, 0.05, z + 0.06], tissue, 16);
      end.rotation.z = Math.PI / 2;
      end.rotation.y = heading;
    } else if (a.gap === 'flood') {
      const water = new THREE.MeshStandardMaterial({ color: '#7f97a3', roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.75 });
      for (let k = 0; k < 5; k++) {
        const r = 0.2 + random() * 0.28;
        const pool = s.cylinder(r, r, 0.006, [(random() - 0.5) * 0.5, 0.003 + k * 0.0005, 0.05 + random() * 0.4 - (k === 0 ? 0.4 : 0)], water, 28);
        pool.scale.set(1 + random() * 0.5, 1, 0.8 + random() * 0.4);
        pool.castShadow = false;
      }
    }
    // Floor litter scales with how busy the night is.
    for (let k = 0; k < Math.round(mood.density * 5); k++) {
      const flyer = s.box([0.1, 0.002, 0.14], [(random() - 0.5) * 0.9, 0.002, 0.15 + random() * 0.4], s.material(pick(['#f4f1e6', '#ffe02a', '#ff8ab8', '#9be0e8'])));
      flyer.rotation.y = random() * 3;
    }

    return s.finish({ footprint: 0.75 });
  },
});
