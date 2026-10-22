import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const paint = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

/** A side profile in (z, y), extruded across x and centred on it. */
const slab = (points: readonly (readonly [number, number])[], thickness: number) => {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(-z, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 4 });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-thickness / 2, 0, 0);
  return geometry;
};

export default defineThing({
  questions: {
    stages: choice('How many platform stages does the tower have?', {
      one: 'A single modest platform, a paddling-pool sort of tower.',
      two: 'Two stages: a middle board and a top board.',
      three: 'Three stages stepping up to a properly frightening top board.',
      four: 'Four stages, an absurd competition tower.',
    }),
    height: score('How tall is each stage?', ['Squat, an easy hop', 'Regulation heights', 'Stretched tall, a real act of nerve']),
    form: choice('What shape is the concrete spine?', {
      stepped: 'A solid fin whose back edge is a great flight of steps.',
      swept: 'A slim fin with a smooth concave sweep, like a sail or a ship prow.',
      blocks: 'A ziggurat of stacked rectangular blocks, each smaller than the last.',
    }),
    finish: choice('What state is the concrete in?', {
      fresh: 'Fresh brilliant white, just painted for opening day.',
      banded: 'Cream with turquoise bands along every platform edge.',
      streaked: 'Grey and streaked with rust and rain from the rail fixings.',
      closed: 'Closed off: a striped barrier, boards across the rails and a CLOSED sign.',
    }),
    springboard: choice('Are there springboards at the foot?', {
      none: 'No springboard, platforms only.',
      one: 'One low springboard on a stand beside the tower.',
      pair: 'A matched pair of springboards, one each side.',
    }),
    crown: choice('What tops the tower?', {
      pennant: 'A flagpole with a long pennant.',
      clock: 'A round clock face on the spine.',
      lamps: 'A pair of white globe lamps on curved stalks.',
      plain: 'Nothing, just the bare top edge.',
    }),
    towel: noul('Does a towel lie abandoned on the top board?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = { one: 1, two: 2, three: 3, four: 4 }[a.stages];
    const unit = mix(1.9, 3.3, a.height);
    const levels = Array.from({ length: count }, (_u, i) => unit * (i + 1) + (i === count - 1 && count > 2 ? unit * 0.35 : 0));
    const H = levels[count - 1];
    const grime = Math.min(1, mood.wear * 0.8 + (a.finish === 'streaked' ? 0.7 : a.finish === 'closed' ? 0.45 : 0));
    const baseColour = a.finish === 'banded' ? '#f1e6c8' : a.finish === 'streaked' ? '#cfcdc4' : '#f4f3ee';
    const concreteMap = paint(256, 256, (c) => {
      c.fillStyle = baseColour; c.fillRect(0, 0, 256, 256);
      const streaks = Math.round(grime * 34);
      for (let i = 0; i < streaks; i++) {
        const x = random() * 256, w = 2 + random() * 9, len = 60 + random() * 196;
        const g = c.createLinearGradient(0, 0, 0, len);
        const rusty = random() < 0.45;
        g.addColorStop(0, rusty ? 'rgba(150,84,40,0.75)' : 'rgba(70,74,66,0.6)');
        g.addColorStop(1, 'rgba(120,110,90,0)');
        c.fillStyle = g; c.fillRect(x, 0, w, len);
      }
      for (let i = 0; i < grime * 60; i++) { c.fillStyle = `rgba(90,96,80,${0.08 + random() * 0.12})`; c.beginPath(); c.arc(random() * 256, random() * 256, 3 + random() * 14, 0, 7); c.fill(); }
    });
    const concrete = new THREE.MeshStandardMaterial({ map: concreteMap, roughness: 0.85 });
    const plain = s.material(baseColour, { roughness: 0.85 });
    const band = s.material(a.finish === 'banded' ? '#2aa6a0' : baseColour);
    const deck = s.material(a.finish === 'banded' ? '#2aa6a0' : '#7fb9c9', { roughness: 0.95 });
    const steel = s.material('#c9d1d4', { metalness: 0.75, roughness: 0.3 });
    const dark = s.material('#2c3236');

    // Base plinth.
    const backReach = a.form === 'stepped' ? 1.2 + H * 0.62 : a.form === 'swept' ? 1.3 + H * 0.4 : 1.2 + count * 1.25;
    s.box([4.4, 0.24, backReach + 3.2], [0, 0.12, (2.2 - backReach) / 2 + 0.2], plain);
    const y0 = 0.24;

    // The spine.
    const front = 0.35;
    const thick = 1.3;
    if (a.form === 'stepped') {
      const rise = 0.42, going = 0.26;
      const n = Math.ceil((H - y0) / rise);
      const pts: [number, number][] = [[front, y0], [front, H + 0.9], [-0.5, H + 0.9], [-0.5, H], [-1.2, H]];
      for (let i = 1; i <= n; i++) { const y = Math.max(y0, H - i * rise); pts.push([-1.2 - i * going, y + rise > H ? H : Math.min(H, y + rise)], [-1.2 - i * going, y]); }
      s.mesh(slab(pts, thick), concrete);
      const zEnd = -1.2 - n * going;
      for (const sx of [-1, 1]) {
        s.rod([sx * (thick / 2 - 0.06), y0 + 0.95, zEnd], [sx * (thick / 2 - 0.06), H + 0.95, -1.2], 0.035, steel);
        for (let i = 0; i <= 4; i++) { const t = i / 4; s.rod([sx * (thick / 2 - 0.06), mix(y0, H, t) - 0.1, mix(zEnd, -1.2, t)], [sx * (thick / 2 - 0.06), mix(y0, H, t) + 0.95, mix(zEnd, -1.2, t)], 0.028, steel); }
      }
    } else if (a.form === 'swept') {
      const pts: [number, number][] = [[front, y0], [front, H + 1.4]];
      for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([-0.55 - Math.pow(t, 2.2) * (H * 0.4 + 0.6), mix(H + 1.4, y0, t)]); }
      s.mesh(slab(pts, 0.8), concrete);
      // a caged ladder up the back of each stage
      for (const sx of [-1, 1]) s.rod([sx * 0.25 + 0.75, y0, -0.2], [sx * 0.25 + 0.75, H + 1.05, -0.2], 0.03, steel);
      for (let y = y0 + 0.3; y < H + 1; y += 0.32) s.rod([0.5, y, -0.2], [1, y, -0.2], 0.02, steel);
    } else {
      let below = y0;
      levels.forEach((level, i) => {
        const depth = 1.3 + (count - 1 - i) * 1.25, width = 2.3 - i * 0.22;
        s.box([width, level - below, depth + front], [0, (level + below) / 2, (front - depth) / 2], concrete);
        s.box([width + 0.12, 0.14, depth + front + 0.12], [0, level - 0.07, (front - depth) / 2], band);
        // ladder up each setback
        const lz = -depth - 0.05;
        for (const sx of [-1, 1]) s.rod([sx * 0.22, below, lz], [sx * 0.22, level + 0.9, lz], 0.028, steel);
        for (let y = below + 0.3; y < level; y += 0.34) s.rod([-0.22, y, lz], [0.22, y, lz], 0.018, steel);
        below = level;
      });
      s.box([1.1, 0.9, 0.5], [0, H + 0.45, -0.4], concrete);
    }

    // Cantilevered boards with haunches and tubular rails.
    const width = 1.5;
    const tips: number[] = [];
    levels.forEach((level, i) => {
      const x = a.form === 'blocks' ? 0 : count === 1 ? 0 : (i % 2 ? 1 : -1) * 0.55;
      const len = 2.0 + i * 0.55 + random() * 0.25;
      const tip = front + len;
      tips.push(tip);
      const back = a.form === 'blocks' ? front - 0.6 : -1.15;
      s.box([width, 0.2, tip - back], [x, level - 0.1, (tip + back) / 2], plain);
      s.cylinder(width / 2, width / 2, 0.2, [x, level - 0.1, tip], plain, 28);
      s.box([width - 0.25, 0.025, tip - back - 0.2], [x, level + 0.012, (tip + back) / 2 + 0.1], deck);
      s.cylinder(width / 2 - 0.125, width / 2 - 0.125, 0.025, [x, level + 0.012, tip], deck, 28);
      const edge = s.mesh(new THREE.TorusGeometry(width / 2, 0.05, 6, 24, Math.PI), band, [x, level - 0.03, tip]);
      edge.rotation.x = Math.PI / 2; edge.rotation.z = Math.PI;
      // curved haunch below
      const hp: [number, number][] = [[front - 0.05, level - 0.2], [front + len * 0.85, level - 0.2]];
      for (let k = 1; k <= 8; k++) { const t = k / 8; hp.push([front + len * 0.85 * (1 - t) * (1 - t), level - 0.2 - Math.sin(t * Math.PI / 2) * Math.min(1.3, unit * 0.5)]); }
      const haunch = s.mesh(slab(hp, 0.45), concrete);
      haunch.position.x = x;
      // rails
      const railEnd = front + len * 0.5;
      for (const sx of [-1, 1]) {
        const rx = x + sx * (width / 2 - 0.07);
        s.tube([[rx, level + 1, back + 0.1], [rx, level + 1, railEnd - 0.3], [rx, level + 0.92, railEnd - 0.06], [rx, level + 0.6, railEnd], [rx, level, railEnd]], 0.035, steel);
        s.rod([rx, level + 0.5, back + 0.1], [rx, level + 0.5, railEnd], 0.025, steel);
        const posts = Math.max(2, Math.round((railEnd - back) / 0.9));
        for (let p = 0; p < posts; p++) s.rod([rx, level, mix(back + 0.1, railEnd - 0.4, p / (posts - 1))], [rx, level + 1, mix(back + 0.1, railEnd - 0.4, p / (posts - 1))], 0.028, steel);
        if (a.finish === 'closed' && i === 0) s.box([0.04, 0.22, railEnd - back - 0.3], [rx + sx * 0.04, level + 0.75, (railEnd + back) / 2], s.material('#a8743f'));
      }
      if (a.finish === 'closed') {
        const stripe = paint(128, 16, (c) => { for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#f5f0e2' : '#d3271f'; c.fillRect(k * 16, 0, 16, 16); } });
        s.box([width + 0.1, 0.2, 0.05], [x, level + 0.7, railEnd + 0.04], new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.7 }));
      }
    });

    const topX = a.form === 'blocks' || count === 1 ? 0 : ((count - 1) % 2 ? 1 : -1) * 0.55;
    if (a.towel) {
      const hue = Math.floor(random() * 360);
      const towelMap = paint(64, 64, (c) => { for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#fdf8ea' : `hsl(${hue},75%,50%)`; c.fillRect(k * 8, 0, 8, 64); } });
      const towel = new THREE.MeshStandardMaterial({ map: towelMap, roughness: 0.95 });
      const tz = tips[count - 1] - 0.5 - random() * 0.4;
      const side = random() < 0.5 ? -1 : 1;
      const lay = s.box([0.75, 0.05, 0.5], [topX + side * 0.4, H + 0.05, tz], towel);
      lay.rotation.y = (random() - 0.5) * 0.5;
      s.box([0.05, 0.75, 0.48], [topX + side * (width / 2 + 0.03), H - 0.3, tz], towel);
    }

    // Springboards.
    const boards: THREE.Group[] = [];
    const sides = a.springboard === 'pair' ? [-1, 1] : a.springboard === 'one' ? [random() < 0.5 ? -1 : 1] : [];
    for (const sx of sides) {
      const x = sx * 1.75;
      s.box([0.7, 0.75, 0.9], [x, y0 + 0.375, -0.5], plain);
      for (const rx of [-0.3, 0.3]) s.rod([x + rx, y0 + 0.75, -0.9], [x + rx, y0 + 1.7, -0.9], 0.028, steel);
      s.rod([x - 0.3, y0 + 1.7, -0.9], [x + 0.3, y0 + 1.7, -0.9], 0.028, steel);
      s.cylinder(0.09, 0.09, 0.62, [x, y0 + 0.5, 0.75], steel, 12).rotation.z = Math.PI / 2;
      for (const rx of [-0.3, 0.3]) s.box([0.06, 0.5, 0.3], [x + rx, y0 + 0.25, 0.75], dark);
      const board = new THREE.Group();
      board.position.set(x, y0 + 0.78, -0.9);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 3.6), s.material('#3b9bb8', { roughness: 0.6 }));
      plank.position.z = 1.8; plank.castShadow = true;
      const tipMark = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.065, 0.5), s.material('#f3f1e8'));
      tipMark.position.z = 3.36;
      board.add(plank, tipMark);
      board.rotation.x = -0.035;
      s.root.add(board);
      boards.push(board);
    }

    // Crown.
    let pennant: THREE.Mesh | null = null;
    const crownY = a.form === 'swept' ? H + 1.4 : H + 0.9;
    if (a.crown === 'pennant') {
      s.rod([0, crownY, -0.2], [0, crownY + 2.2, -0.2], 0.03, steel);
      const shape = new THREE.Shape([new THREE.Vector2(0, 0.2), new THREE.Vector2(1.5, 0), new THREE.Vector2(0, -0.2)]);
      pennant = s.mesh(new THREE.ShapeGeometry(shape, 1), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.4 ? '#e2382c' : '#44576b', side: THREE.DoubleSide, roughness: 0.8 }), [0, crownY + 1.95, -0.2]);
    } else if (a.crown === 'clock') {
      const hour = Math.floor(random() * 12), minute = Math.floor(random() * 12);
      const faceMap = paint(128, 128, (c) => {
        c.fillStyle = '#f7f3e6'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill();
        c.strokeStyle = '#1d2a2e'; c.lineWidth = 6; c.stroke();
        for (let k = 0; k < 12; k++) { const t = k / 12 * Math.PI * 2; c.fillStyle = '#1d2a2e'; c.fillRect(64 + Math.sin(t) * 50 - 3, 64 - Math.cos(t) * 50 - 3, 6, 6); }
        c.lineCap = 'round';
        const hand = (t: number, len: number, w: number) => { c.lineWidth = w; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.sin(t) * len, 64 - Math.cos(t) * len); c.stroke(); };
        hand((hour + minute / 12) / 12 * Math.PI * 2, 30, 7); hand(minute / 12 * Math.PI * 2, 46, 4);
      });
      const disc = s.cylinder(0.62, 0.62, 0.14, [0, crownY + 0.55, front - 0.25], plain, 32);
      disc.rotation.x = Math.PI / 2;
      s.mesh(new THREE.CircleGeometry(0.56, 32), new THREE.MeshStandardMaterial({ map: faceMap, roughness: 0.6 }), [0, crownY + 0.55, front - 0.17]);
    } else if (a.crown === 'lamps') {
      const globe = s.material('#fffdf2', { emissive: '#fff3c0', emissiveIntensity: mix(0.2, 0.9, Math.abs(mood.daylight - 0.5) * 2) });
      for (const sx of [-1, 1]) {
        s.tube([[sx * 0.3, crownY, -0.1], [sx * 0.35, crownY + 0.7, -0.1], [sx * 0.6, crownY + 1, -0.1], [sx * 0.85, crownY + 0.9, -0.1]], 0.03, steel);
        s.ball([0.2, 0.2, 0.2], [sx * 0.88, crownY + 0.72, -0.1], globe, 16);
      }
    }

    if (a.finish === 'closed') {
      // trestle barrier and sign at the foot
      const stripe = paint(128, 16, (c) => { for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#f5f0e2' : '#d3271f'; c.fillRect(k * 16, 0, 16, 16); } });
      const bz = 1.6 + random() * 0.5, tilt = (random() - 0.5) * 0.3;
      const plankMesh = s.box([2.6, 0.22, 0.05], [0, y0 + 0.85, bz], new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.7 }));
      plankMesh.rotation.y = tilt;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.rod([sx * 1.1, y0 + 0.95, bz - sx * Math.sin(tilt) * 1.1], [sx * 1.1, y0, bz + sz * 0.35 - sx * Math.sin(tilt) * 1.1], 0.03, s.material('#a8743f'));
      const sign = s.label('CLOSED', 1.3, 0.5, [0, Math.min(levels[0] - 0.6, 1.7) + 0.2, front + 0.02 + (a.form === 'blocks' ? 0 : 0)], '#f7f1e2', '#b3261e');
      sign.position.x = a.form === 'blocks' ? 0 : count === 1 ? 0.0 : 0.0;
      sign.position.z = front + 0.25;
      sign.rotation.z = (random() - 0.5) * 0.12;
    }

    const energy = mood.energy;
    const base = pennant ? Float32Array.from(pennant.geometry.attributes.position.array) : null;
    return s.finish({
      update: (_dt, time) => {
        boards.forEach((board, i) => { board.rotation.x = -0.035 + Math.sin(time * mix(1, 7, energy) + i * 2) * mix(0.002, 0.045, energy); });
        if (pennant && base) {
          pennant.rotation.y = Math.sin(time * mix(0.4, 2.5, energy)) * mix(0.1, 0.6, energy);
          pennant.rotation.z = mix(-0.6, 0, energy);
        }
      },
    });
  },
});
