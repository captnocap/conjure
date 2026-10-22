import * as THREE from 'three';
import { choice, defineWorld, diorama, figure, mix } from '@conjure/kit';
import { type P, bars, bicycle, blob, brickTile, corrugated, paint, pick, sashTexture, tiled, wheelieBin } from './parts';

/** The yard: 13 m along the school, 10 m deep. The school's front face is at z = FACE; the street railings run along +x. */
const W = 13, D = 10;
const FACE = -4.6;
const PX = 80;
const U = (x: number) => (x + W / 2) * PX;
const V = (z: number) => (z + D / 2) * PX;
const RX = 6.5;

const UNIFORM = { navy: '#243352', maroon: '#6e1f2e', green: '#2f5a3a', red: '#a8272b', royal: '#2a4a9a', grey: '#6a6d72' } as const;
const DOOR = { navy: '#2a4a7a', maroon: '#7a2232', green: '#2f6a3a', red: '#b02a2a', royal: '#2a5ab8', grey: '#2f5a4a' } as const;
const SKINS = ['#f1d2b6', '#e3c2a4', '#dfb48f', '#c58f62', '#a6714b', '#7a4f33', '#5a3a28'] as const;
const HAIR = ['#1f1a18', '#3b2a22', '#6b4a2e', '#a8783a', '#c49a4a', '#8a3a1e'] as const;
const BRIGHT = ['#d83a3a', '#f2c21c', '#3a8ae8', '#e85a9a', '#3aa04a', '#f28a1c', '#7a4ac8'] as const;

export default defineWorld({
  questions: {
    weather: choice('What has the weather just done?', {
      rained: 'It has just stopped raining: the tarmac dark and wet, puddles everywhere shining with the sky, lights on in the classrooms.',
      dry: 'A dry, bright morning: pale dusty tarmac, crisp shadows, one old puddle that never dries.',
      frost: 'A frosty morning: white rime on the roofs and along the edges of the yard, frozen puddles to skid on.',
      windy: 'Blustery: leaves and crisp packets whirled into the corners, the lost jumper flapping on the railings.',
    }),
    school: choice('What is the school building like?', {
      board: 'A proud Victorian board school: bright red brick, cream stone bands, tall arched sash windows, a bell cote on the roof.',
      plain: 'Plain red brick gone dull, white-painted sash windows, nothing fancy.',
      grimy: 'Soot-dark brick, wire guards bolted over the windows, peeling paint: a school nobody has spent money on.',
      mural: 'Red brick with a bright mural the children painted along the bottom of the wall: a rainbow, handprints and a sun.',
    }),
    carved: choice('What is carved in the stone over the door?', {
      infants: 'INFANTS, over the little ones\' entrance.',
      boys: 'BOYS: the old separate entrance from a century ago.',
      girls: 'GIRLS: the old separate entrance from a century ago.',
      board: 'SCHOOL BOARD 1896, proud Victorian lettering.',
      none: 'Nothing: a plain stone lintel.',
    }),
    markings: choice('What is painted on the tarmac?', {
      hopscotch: 'A yellow hopscotch ladder and the white lines of a netball court.',
      snakes: 'A bright snakes-and-ladders grid as well as the hopscotch and court.',
      map: 'A painted map of the British Isles in green on a blue sea, beside the hopscotch.',
      ghosts: 'Only ghosts of lines, worn almost away by a century of feet.',
    }),
    climbing: choice('What is there to climb on?', {
      frame: 'A steel climbing frame of bars painted red, blue and yellow on a rubber mat.',
      dome: 'A geodesic climbing dome of painted steel bars.',
      timber: 'A timber trim trail: stepping logs, a balance beam and an old tyre.',
      taped: 'The climbing frame, rusty and wrapped in red and white tape: out of use since the accident.',
    }),
    railings: choice('What is on the street railings?', {
      jumper: 'One lost jumper hung over the railings where its owner might see it.',
      lostproperty: 'Lost property spiked on the railing tips: a woolly hat, odd gloves and a jumper.',
      banner: 'A vinyl banner for the summer fair tied to the railings.',
      bare: 'Nothing: just the black railings.',
    }),
    leftover: choice('What has been left lying about the yard?', {
      roofball: 'A football stuck up on the bike-shed roof, out of reach for ever.',
      chalk: 'Chalk drawings all over the tarmac and a stub of chalk.',
      litter: 'Crisp packets and a squashed juice carton by the bins, the lid left open.',
      tidy: 'Nothing: the caretaker has been round.',
    }),
    shed: choice('What is in the bike shed?', {
      bikes: 'Two children\'s bikes locked to the stands.',
      scooters: 'A row of children\'s scooters.',
      pe: 'PE kit put out for later: hoops, cones and a crate of balls.',
      empty: 'Nothing: just the empty stands.',
    }),
    uniform: choice('What colour is the school uniform?', {
      navy: 'Navy blue jumpers.', maroon: 'Maroon jumpers.', green: 'Bottle-green jumpers.', red: 'Bright red jumpers.', royal: 'Royal blue jumpers.', grey: 'Grey jumpers.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const uniform = UNIFORM[a.uniform];
    const wet = a.weather === 'rained', frost = a.weather === 'frost', windy = a.weather === 'windy';
    const sky = new THREE.Color({ rained: '#c3c8ce', dry: '#d8e3ea', frost: '#e2e8ee', windy: '#d2d8dc' }[a.weather])
      .lerp(new THREE.Color('#f0dcc0'), mood.warmth * 0.3)
      .lerp(new THREE.Color('#c4c4c0'), (1 - mood.cheer) * 0.2);
    // The hero stands in the open yard; then the school wall, the bench, the goal end, the hopscotch side and the door.
    const slots = [[0.6, 0.9], [-0.95, -3.75], [-2.7, -2.95], [-4.6, 1.1], [3.4, 1.9], [2.9, -2.65]] as const;
    const { art: s, world } = diorama(context, {
      background: `#${sky.getHexString()}`, floor: null, width: W, depth: D, pitch: 30, yaw: 24,
      maxHeight: 1.45, radius: 1.3, scale: [0.8, 1.35], slots, viewBox: [[-W / 2, 0, -D / 2], [W / 2, 4.3, D / 2]],
    });

    // ---- the tarmac: aggregate, patches, painted lines faded by feet, cracks with weeds, chalk, frost
    const fade = mix(0.85, 0.35, mood.wear) * (a.markings === 'ghosts' ? 0.28 : 1);
    const groundMap = paint(W * PX, D * PX, (c) => {
      const cw = W * PX, ch = D * PX;
      c.fillStyle = wet ? '#4a4d51' : frost ? '#686b6e' : '#75736e';
      c.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 9000; i++) {
        c.fillStyle = random() < 0.5 ? 'rgba(20,20,22,0.25)' : 'rgba(205,200,190,0.18)';
        c.fillRect(random() * cw, random() * ch, 1 + random() * 2, 1 + random() * 2);
      }
      for (let i = 0; i < 3 + Math.round(mood.wear * 6); i++) {
        const w = 40 + random() * 170, h = 30 + random() * 120;
        c.fillStyle = `rgba(25,25,28,${0.16 + random() * 0.2})`;
        c.fillRect(random() * (cw - w), random() * (ch - h), w, h);
      }
      if (wet) {
        const g = c.createLinearGradient(0, V(-5), 0, V(-2.8));
        g.addColorStop(0, 'rgba(15,18,22,0.5)');
        g.addColorStop(1, 'rgba(15,18,22,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, cw, V(-2.8));
      }
      // The netball court, its thirds, centre circle and shooting circles.
      c.globalAlpha = fade;
      c.strokeStyle = '#f2efe4';
      c.lineWidth = 5;
      c.strokeRect(U(-5.9), V(-3.9), U(5.9) - U(-5.9), V(4.6) - V(-3.9));
      for (const x of [-2, 2]) { c.beginPath(); c.moveTo(U(x), V(-3.9)); c.lineTo(U(x), V(4.6)); c.stroke(); }
      c.beginPath(); c.arc(U(0), V(0.35), 0.45 * PX, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(U(-5.9), V(0.35), 2.1 * PX, -Math.PI / 2, Math.PI / 2); c.stroke();
      c.beginPath(); c.arc(U(5.9), V(0.35), 2.1 * PX, Math.PI / 2, Math.PI * 1.5); c.stroke();
      // The hopscotch, numbered from the near end.
      const hop = a.markings === 'snakes' ? '#ffffff' : '#f2d43a';
      c.strokeStyle = c.fillStyle = hop;
      c.lineWidth = 4;
      c.font = 'bold 26px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      [[1], [2], [3], [4, 5], [6], [7, 8], [9]].forEach((row, i) => {
        const z0 = 4.4 - (i + 1) * 0.5;
        row.forEach((number, j) => {
          const x0 = 1.9 - row.length * 0.25 + j * 0.5;
          c.strokeRect(U(x0), V(z0), 0.5 * PX, 0.5 * PX);
          c.fillText(String(number), U(x0 + 0.25), V(z0 + 0.25));
        });
      });
      c.beginPath(); c.arc(U(1.9), V(0.9), 0.25 * PX, Math.PI, Math.PI * 2); c.stroke();
      c.fillText('10', U(1.9), V(0.78));
      if (a.markings === 'snakes') {
        const colours = ['#e8402a', '#f2c21c', '#2a8ae8', '#3aa04a'];
        for (let r = 0; r < 5; r++)
          for (let k = 0; k < 5; k++) {
            const x0 = -3.9 + k * 0.5, z0 = 4.8 - (r + 1) * 0.5;
            c.fillStyle = colours[(r + k) % 4];
            c.fillRect(U(x0) + 1, V(z0) + 1, 0.5 * PX - 2, 0.5 * PX - 2);
            c.fillStyle = '#ffffff';
            c.font = 'bold 18px sans-serif';
            c.fillText(String(r * 5 + (r % 2 ? 5 - k : k + 1)), U(x0 + 0.25), V(z0 + 0.25));
          }
        c.strokeStyle = '#2a7a2a';
        c.lineWidth = 12;
        c.lineCap = 'round';
        c.beginPath(); c.moveTo(U(-3.6), V(2.5)); c.bezierCurveTo(U(-2.2), V(3.0), U(-3.6), V(3.8), U(-2.0), V(4.5)); c.stroke();
        c.fillStyle = '#2a7a2a'; c.beginPath(); c.arc(U(-3.6), V(2.5), 10, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#8a5a2a';
        c.lineWidth = 5;
        for (const dx of [0, 0.22]) { c.beginPath(); c.moveTo(U(-1.85 + dx), V(4.6)); c.lineTo(U(-2.3 + dx), V(2.6)); c.stroke(); }
        for (let t = 0.1; t < 1; t += 0.15) { c.beginPath(); c.moveTo(U(-1.85 + (-0.45) * t), V(4.6 - 2 * t)); c.lineTo(U(-1.63 + (-0.45) * t), V(4.6 - 2 * t)); c.stroke(); }
      }
      if (a.markings === 'map') {
        c.fillStyle = '#3a7ac8';
        c.fillRect(U(-4.0), V(2.0), 2.8 * PX, 2.9 * PX);
        const shape = (points: readonly (readonly [number, number])[], x0: number, z0: number, w: number, h: number) => {
          c.beginPath();
          points.forEach(([px, py], index) => (index ? c.lineTo(U(x0 + px * w), V(z0 + py * h)) : c.moveTo(U(x0 + px * w), V(z0 + py * h))));
          c.closePath();
          c.fill();
        };
        c.fillStyle = '#4aa04a';
        shape([[0.45, 0.02], [0.62, 0.05], [0.58, 0.18], [0.66, 0.3], [0.62, 0.42], [0.72, 0.55], [0.8, 0.68], [0.86, 0.78], [0.8, 0.86], [0.62, 0.9], [0.42, 0.95], [0.3, 0.93], [0.4, 0.84], [0.5, 0.8], [0.44, 0.72], [0.48, 0.62], [0.42, 0.52], [0.46, 0.42], [0.38, 0.32], [0.4, 0.2], [0.34, 0.12]], -4.0, 2.0, 2.8, 2.9);
        shape([[0.12, 0.5], [0.26, 0.46], [0.3, 0.56], [0.28, 0.7], [0.14, 0.74], [0.06, 0.64]], -4.0, 2.0, 2.8, 2.9);
        c.fillStyle = '#f2efe4';
        c.font = 'bold 20px sans-serif';
        c.fillText('N', U(-1.45), V(2.2));
      }
      c.globalAlpha = 1;
      // A drain grate where the downpipe empties.
      c.fillStyle = '#222224';
      c.fillRect(U(-0.62), V(-4.52), 0.5 * PX, 0.32 * PX);
      c.strokeStyle = '#4a4a4c';
      c.lineWidth = 2;
      for (let i = 1; i < 7; i++) { c.beginPath(); c.moveTo(U(-0.62) + i * 5.7, V(-4.52)); c.lineTo(U(-0.62) + i * 5.7, V(-4.2)); c.stroke(); }
      // Cracks, weeds where the yard is neglected.
      for (let i = 0; i < 8 + Math.round(mood.wear * 24); i++) {
        let x = random() * cw, y = random() * ch, angle = random() * Math.PI * 2;
        c.strokeStyle = 'rgba(20,20,22,0.8)';
        c.lineWidth = 1 + random() * 1.6;
        c.beginPath();
        c.moveTo(x, y);
        const steps = 10 + Math.floor(random() * 30);
        for (let k = 0; k < steps; k++) {
          angle += (random() - 0.5) * 0.9;
          x += Math.cos(angle) * (4 + random() * 7);
          y += Math.sin(angle) * (4 + random() * 7);
          c.lineTo(x, y);
          if (mood.wear > 0.35 && random() < (mood.wear - 0.3) * 0.4) {
            c.save();
            c.fillStyle = pick(random, ['#5a7a32', '#6a8a3a', '#4a6a2a']);
            c.beginPath(); c.arc(x, y, 2 + random() * 3, 0, Math.PI * 2); c.fill();
            c.restore();
          }
        }
        c.stroke();
      }
      if (a.leftover === 'chalk') {
        const chalks = ['#f6d0e0', '#d0e8f6', '#f6f0c0', '#d6f6d0', '#ffffff', '#f6c8a0'];
        c.lineWidth = 3;
        c.lineCap = 'round';
        for (let i = 0; i < 9; i++) {
          const x = U(-5.5 + random() * 10.5), y = V(-3.2 + random() * 7.6);
          c.strokeStyle = pick(random, chalks);
          const kind = i % 4;
          c.beginPath();
          if (kind === 0) { c.moveTo(x, y + 14); c.bezierCurveTo(x - 26, y - 6, x - 10, y - 22, x, y - 8); c.bezierCurveTo(x + 10, y - 22, x + 26, y - 6, x, y + 14); }
          else if (kind === 1) { c.arc(x, y - 18, 7, 0, Math.PI * 2); c.moveTo(x, y - 11); c.lineTo(x, y + 8); c.moveTo(x - 10, y - 4); c.lineTo(x + 10, y - 4); c.moveTo(x, y + 8); c.lineTo(x - 8, y + 20); c.moveTo(x, y + 8); c.lineTo(x + 8, y + 20); }
          else if (kind === 2) { c.arc(x, y, 12, 0, Math.PI * 2); for (let r = 0; r < 8; r++) { const ang = (r / 8) * Math.PI * 2; c.moveTo(x + Math.cos(ang) * 16, y + Math.sin(ang) * 16); c.lineTo(x + Math.cos(ang) * 24, y + Math.sin(ang) * 24); } }
          else { c.font = 'bold 22px sans-serif'; c.fillStyle = c.strokeStyle; c.fillText(pick(random, ['AMY', 'JO + SAM', 'TIG!', 'KEEP OUT', 'DAN WOZ ERE', 'BEST FRENDS']), x, y); }
          c.stroke();
        }
      }
      if (frost) {
        for (let i = 0; i < 16000; i++) {
          const x = random() * cw, y = random() * ch;
          const edge = Math.min(x, cw - x, y * 1.6, ch - y) / (1.6 * PX);
          if (random() > 0.25 + Math.max(0, 1 - edge) * 0.7) continue;
          c.fillStyle = `rgba(236,242,246,${0.25 + random() * 0.45})`;
          c.fillRect(x, y, 1 + random() * 2.5, 1 + random() * 2.5);
        }
      }
    });
    const ground = s.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: groundMap, roughness: wet ? 0.42 : 0.95, metalness: wet ? 0.1 : 0 }));
    ground.rotation.x = -Math.PI / 2;
    ground.castShadow = false;
    world.ground = ground;
    s.box([W + 4.5, 0.3, D], [2.2, -0.16, 0], s.material('#3a3a3c')).castShadow = false;
    // The street beyond the railings: a pavement and the edge of the road.
    s.box([1.9, 0.14, D], [RX + 1.1, 0.0, 0], s.material(frost ? '#c4c8cc' : wet ? '#7c7d7e' : '#a9a69e')).castShadow = false;
    s.box([2.4, 0.1, D], [RX + 3.25, -0.03, 0], s.material('#3a3b3e')).castShadow = false;

    // ---- puddles, shining with the sky, or frozen
    const puddleSpots: P[] = [[-1.4, -2.1, 0.9], [2.4, -0.9, 0.7], [-3.1, 2.9, 0.8], [4.4, 3.3, 0.6], [-0.4, 3.9, 0.7], [4.7, -1.6, 0.5], [-5.3, -1.6, 0.6]];
    const puddleMat = frost
      ? new THREE.MeshStandardMaterial({ color: '#dde6ec', roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.85, depthWrite: false })
      : new THREE.MeshStandardMaterial({ color: sky.clone().multiplyScalar(wet ? 0.8 : 0.7), roughness: 0.05, metalness: 0.7, transparent: true, opacity: 0.8, depthWrite: false });
    for (const [x, z, r] of puddleSpots.slice(0, { rained: 7, dry: 1, frost: 4, windy: 3 }[a.weather])) {
      const puddle = s.mesh(blob(random, r * mix(0.8, 1.25, random()), r * 0.55), puddleMat, [x, 0.006, z]);
      puddle.rotation.y = random() * Math.PI;
      puddle.castShadow = false;
    }

    // ---- the school: brick, bands, arched sash windows on two floors, the door, the downpipe, the roof
    const palette = {
      board: ['#a4432f', '#9a3b2a', '#b04d36', '#8e3a2c', '#b65a3d'],
      plain: ['#94493a', '#8a4234', '#9c5040', '#7e3c30', '#a0584a'],
      grimy: ['#5e3a30', '#563428', '#6a4234', '#4a2e26', '#6e4a3a'],
      mural: ['#a4432f', '#9a3b2a', '#b04d36', '#8e3a2c', '#b65a3d'],
    }[a.school];
    const brick = brickTile(random, palette, a.school === 'grimy' ? '#5a544c' : '#b9ae9c', a.school === 'grimy' ? 0.8 : mood.wear * 0.5);
    const BH = 7.2;
    s.mesh(new THREE.BoxGeometry(W + 0.4, BH, 1), tiled(brick, 0.9, 0.8, W + 0.4, BH), [0, BH / 2, FACE - 0.5]);
    const stone = s.material(a.school === 'grimy' ? '#8a8478' : '#d9cfb8', { roughness: 0.9 });
    s.box([W + 0.42, 0.45, 0.05], [0, 0.225, FACE + 0.02], s.material(a.school === 'grimy' ? '#2e2a2c' : '#3e3a44', { roughness: 0.8 }));
    if (a.school === 'board') {
      s.box([W + 0.42, 0.14, 0.08], [0, 4.38, FACE + 0.04], stone);
      s.box([W + 0.42, 0.2, 0.08], [0, 6.75, FACE + 0.04], stone);
    }
    const frameColour = { board: '#f0ece0', plain: '#e8e4d8', grimy: '#8a948a', mural: '#3a6ab8' }[a.school];
    const glass = `#${sky.clone().lerp(new THREE.Color('#56636e'), 0.55).getHexString()}`;
    const lit = a.weather !== 'dry' || mood.cheer < 0.35;
    const peel = a.school === 'grimy' ? 1 : mood.wear;
    const lowGlass = [0, 1].map(() => new THREE.MeshStandardMaterial({ map: sashTexture(random, frameColour, glass, { art: mood.cheer > 0.25 && a.school !== 'grimy', lit, peel }), roughness: 0.3, metalness: 0.15 }));
    const highGlass = new THREE.MeshStandardMaterial({ map: sashTexture(random, frameColour, glass, { lit, peel }), roughness: 0.3, metalness: 0.15 });
    const fan = s.material(glass, { roughness: 0.2, metalness: 0.3 });
    const archMat = a.school === 'board' ? stone : s.material(a.school === 'grimy' ? '#3e2620' : '#7a3024', { roughness: 0.9 });
    const sash = (x: number, y0: number, w: number, h: number, material: THREE.Material) => {
      s.mesh(new THREE.PlaneGeometry(w, h), material, [x, y0 + h / 2, FACE + 0.012]).castShadow = false;
      s.box([w + 0.16, 0.07, 0.14], [x, y0 - 0.035, FACE + 0.06], stone);
      const spread = 0.62, R = (w / 2 + 0.05) / Math.sin(spread), cy = y0 + h - R * Math.cos(spread);
      s.mesh(new THREE.CircleGeometry(R, 18, Math.PI / 2 - spread, spread * 2), fan, [x, cy, FACE + 0.006]).castShadow = false;
      s.mesh(new THREE.RingGeometry(R, R + 0.2, 18, 1, Math.PI / 2 - spread, spread * 2), archMat, [x, cy, FACE + 0.016]).castShadow = false;
    };
    const lowX = [-5.1, -3.4, -1.7, 3.4, 5.4];
    lowX.forEach((x, index) => sash(x, 1.35, 1.05, 2.3, lowGlass[index % 2]));
    for (const x of [-5.1, -3.4, -1.7, 1.7, 3.4, 5.4]) sash(x, 4.55, 1.05, 1.75, highGlass);
    if (a.school === 'grimy') {
      const mesh = paint(64, 128, (c) => {
        c.clearRect(0, 0, 64, 128);
        c.strokeStyle = 'rgba(70,72,74,1)';
        c.lineWidth = 2;
        for (let i = 0; i <= 64; i += 8) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 64, 128); c.moveTo(i, 0); c.lineTo(i - 64, 128); c.stroke(); }
        c.strokeRect(1, 1, 62, 126);
      });
      const guard = new THREE.MeshStandardMaterial({ map: mesh, transparent: true, alphaTest: 0.35, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide });
      for (const x of lowX) s.mesh(new THREE.PlaneGeometry(1.25, 2.6), guard, [x, 2.55, FACE + 0.09]).castShadow = false;
    }
    if (a.school === 'mural') {
      const mural = paint(1000, 200, (c) => {
        c.fillStyle = '#e8f0f4';
        c.fillRect(0, 0, 1000, 200);
        const bands = ['#e8402a', '#f28a1c', '#f2c21c', '#3aa04a', '#2a8ae8', '#7a4ac8'];
        bands.forEach((colour, i) => { c.strokeStyle = colour; c.lineWidth = 12; c.beginPath(); c.arc(330, 230, 190 - i * 12, Math.PI, Math.PI * 2); c.stroke(); });
        c.fillStyle = '#f2c21c';
        c.beginPath(); c.arc(80, 60, 34, 0, Math.PI * 2); c.fill();
        for (let i = 0; i < 26; i++) {
          c.fillStyle = pick(random, BRIGHT);
          const x = 560 + random() * 420, y = 30 + random() * 140;
          c.beginPath(); c.ellipse(x, y, 11, 13, 0, 0, Math.PI * 2); c.fill();
          for (let f = 0; f < 5; f++) { c.beginPath(); c.ellipse(x - 12 + f * 6, y - 18 + Math.abs(f - 2) * 3, 3, 8, (f - 2) * 0.25, 0, Math.PI * 2); c.fill(); }
        }
        c.fillStyle = '#2a3a5a';
        c.font = 'bold 44px sans-serif';
        c.textAlign = 'center';
        c.fillText(pick(random, ['BE KIND', 'OUR SCHOOL', 'EVERYONE WELCOME']), 330, 180);
        c.fillStyle = `rgba(150,140,130,${mood.wear * 0.5})`;
        for (let i = 0; i < mood.wear * 200; i++) c.fillRect(random() * 1000, random() * 200, 3 + random() * 10, 2 + random() * 5);
      });
      s.mesh(new THREE.PlaneGeometry(4.6, 0.92), new THREE.MeshStandardMaterial({ map: mural, roughness: 0.85 }), [-3.6, 0.92, FACE + 0.05]).castShadow = false;
    }
    // The door, its stone surround and the carved lintel, a step worn into a dip.
    const DX = 1.7, DW = 1.2, DH = 2.5;
    const doorMap = paint(128, 256, (c) => {
      c.fillStyle = DOOR[a.uniform];
      c.fillRect(0, 0, 128, 256);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(62, 0, 4, 256);
      for (const x0 of [10, 74]) {
        c.fillStyle = lit ? '#b8a878' : '#6e7e88';
        c.fillRect(x0, 18, 44, 82);
        c.strokeStyle = 'rgba(255,255,255,0.3)';
        c.lineWidth = 1;
        for (let k = 0; k < 82; k += 8) { c.beginPath(); c.moveTo(x0, 18 + k); c.lineTo(x0 + 44, 18 + k); c.stroke(); }
        c.strokeStyle = 'rgba(0,0,0,0.35)';
        c.lineWidth = 3;
        c.strokeRect(x0, 118, 44, 52);
        c.strokeRect(x0, 182, 44, 60);
      }
      c.fillStyle = '#c9ced2';
      c.fillRect(48, 108, 8, 30);
      c.fillRect(72, 108, 8, 30);
      for (let i = 0; i < 6 + mood.wear * 20; i++) { c.fillStyle = 'rgba(30,25,20,0.35)'; c.fillRect(random() * 128, 220 + random() * 34, 6 + random() * 12, 2 + random() * 4); }
    });
    s.mesh(new THREE.PlaneGeometry(DW, DH), new THREE.MeshStandardMaterial({ map: doorMap, roughness: 0.5 }), [DX, DH / 2, FACE + 0.015]).castShadow = false;
    for (const side of [-1, 1]) s.box([0.2, DH + 0.05, 0.1], [DX + side * (DW / 2 + 0.1), (DH + 0.05) / 2, FACE + 0.05], stone);
    s.box([DW + 0.7, 0.42, 0.14], [DX, DH + 0.24, FACE + 0.07], stone);
    if (a.carved !== 'none') s.label({ infants: 'INFANTS', boys: 'BOYS', girls: 'GIRLS', board: 'SCHOOL BOARD 1896', none: '' }[a.carved], DW + 0.5, 0.3, [DX, DH + 0.24, FACE + 0.142], '#5a4e3c', a.school === 'grimy' ? '#8a8478' : '#d9cfb8');
    s.box([DW + 0.5, 0.12, 0.42], [DX, 0.06, FACE + 0.21], stone);
    // Cast-iron downpipe and gutter.
    const iron = s.material('#2a2c2e', { roughness: 0.55, metalness: 0.35 });
    s.cylinder(0.05, 0.05, 6.75, [-0.35, 3.47, FACE + 0.09], iron, 10);
    s.box([0.24, 0.26, 0.2], [-0.35, 6.86, FACE + 0.11], iron);
    s.box([0.12, 0.08, 0.22], [-0.35, 0.07, FACE + 0.16], iron);
    for (const y of [1.6, 3.4, 5.2]) s.cylinder(0.068, 0.068, 0.05, [-0.35, y, FACE + 0.09], iron, 10);
    s.box([W + 0.4, 0.14, 0.18], [0, BH - 0.08, FACE + 0.09], iron);
    if (wet || mood.wear > 0.6) {
      const stain = s.mesh(new THREE.PlaneGeometry(0.5, 6.4), new THREE.MeshStandardMaterial({ color: '#2e3a2a', transparent: true, opacity: 0.35, depthWrite: false }), [-0.35, 3.6, FACE + 0.004]);
      stain.castShadow = false;
    }
    // Slate roof, chimneys and, on the board school, a little bell cote.
    const slate = s.material(frost ? '#9aa4ae' : '#4a4f58', { roughness: 0.75 });
    const roof = s.box([W + 0.8, 0.14, 3.3], [0, BH + 0.86, FACE - 1.36], slate);
    roof.rotation.x = 0.55;
    for (const x of [-5.4, 4.6]) s.box([0.6, 1.6, 0.5], [x, BH + 1.6, FACE - 2.2], tiled(brick, 0.9, 0.8, 0.6, 1.6));
    if (a.school === 'board') {
      s.box([0.55, 0.9, 0.55], [-2.4, BH + 1.9, FACE - 1.9], stone);
      const cap = s.mesh(new THREE.ConeGeometry(0.5, 0.6, 4), slate, [-2.4, BH + 2.65, FACE - 1.9]);
      cap.rotation.y = Math.PI / 4;
      s.lathe([[0, 0], [0.16, 0], [0.15, 0.05], [0.1, 0.2], [0, 0.24]], s.material('#8a6a2a', { metalness: 0.7, roughness: 0.4 }), [-2.4, BH + 1.98, FACE - 1.6]);
    }

    // ---- coats on a hook rail by the door, at a child's height
    const railX0 = 2.55, railX1 = 4.15;
    s.box([railX1 - railX0, 0.1, 0.03], [(railX0 + railX1) / 2, 1.2, FACE + 0.02], s.material('#8a6a44', { roughness: 0.8 }));
    const coats = 3 + Math.round(mood.density * 3);
    for (let i = 0; i < coats; i++) {
      const x = railX0 + 0.14 + (i * (railX1 - railX0 - 0.28)) / Math.max(1, coats - 1) + (random() - 0.5) * 0.04;
      const colour = random() < mix(0.2, 0.85, mood.cheer) ? pick(random, BRIGHT) : pick(random, ['#243352', '#1d1d20', '#4a4f55', '#5a5a3a', uniform]);
      const cloth = s.material(colour, { roughness: 0.75 });
      const length = 0.46 + random() * 0.16;
      const coat = s.mesh(new THREE.CapsuleGeometry(0.12, length - 0.24, 4, 10), cloth, [x, 1.18 - length / 2, FACE + 0.07]);
      coat.scale.set(1.1, 1, 0.45);
      coat.rotation.z = (random() - 0.5) * 0.14;
      s.ball([0.085, 0.075, 0.05], [x, 1.15, FACE + 0.11], cloth, 10);
    }
    s.box([0.26, 0.3, 0.1], [railX1 + 0.12, 0.15, FACE + 0.1], s.material(uniform, { roughness: 0.8 })).rotation.z = 0.15;

    // ---- the bench under the windows
    const BX = -2.7, BZ = FACE + 0.34;
    const benchWood = s.material(pick(random, ['#3f6a4a', '#8a6038', '#2f4a6a']), { roughness: 0.8 });
    const benchIron = s.material('#2a2c2e', { roughness: 0.6, metalness: 0.3 });
    for (let i = 0; i < 3; i++) s.box([1.7, 0.035, 0.1], [BX, 0.4, BZ - 0.12 + i * 0.12], frost ? s.material('#d8dfe4') : benchWood);
    for (let i = 0; i < 2; i++) s.box([1.7, 0.09, 0.03], [BX, 0.58 + i * 0.15, BZ - 0.21], benchWood);
    for (const dx of [-0.75, 0.75]) {
      s.box([0.06, 0.4, 0.36], [BX + dx, 0.2, BZ], benchIron);
      s.box([0.05, 0.46, 0.05], [BX + dx, 0.62, BZ - 0.21], benchIron);
    }

    // ---- something to climb, on a rubber mat in the back corner
    const CX = -5.1, CZ = -3.5;
    s.box([2.7, 0.03, 1.9], [CX, 0.015, CZ], s.material(frost ? '#b8c8bc' : pick(random, ['#4f7a4a', '#a5553a', '#3a5a8a']), { roughness: 0.95 })).castShadow = false;
    const steel = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45, metalness: 0.3 });
    if (a.climbing === 'frame' || a.climbing === 'taped') {
      const colours = a.climbing === 'taped' ? ['#7a4a3a', '#6a6460', '#8a6a3a'] : ['#c83a2a', '#2a5ac8', '#e8b82a'];
      const cell = 0.55, nx = 3, nz = 2, levels = 3, x0 = CX - (nx * cell) / 2, z0 = CZ - (nz * cell) / 2;
      const segments: { from: P; to: P; color: string }[] = [];
      for (let i = 0; i <= nx; i++)
        for (let k = 0; k <= nz; k++) {
          const top = (i === 0 ? levels - 1 : levels) * cell;
          segments.push({ from: [x0 + i * cell, 0, z0 + k * cell], to: [x0 + i * cell, top, z0 + k * cell], color: colours[0] });
        }
      for (let level = 1; level <= levels; level++) {
        const y = level * cell;
        for (let i = level === levels ? 1 : 0; i < nx; i++) for (let k = 0; k <= nz; k++) segments.push({ from: [x0 + i * cell, y, z0 + k * cell], to: [x0 + (i + 1) * cell, y, z0 + k * cell], color: colours[1 + (level % 2)] });
        for (let i = level === levels ? 1 : 0; i <= nx; i++) for (let k = 0; k < nz; k++) segments.push({ from: [x0 + i * cell, y, z0 + k * cell], to: [x0 + i * cell, y, z0 + (k + 1) * cell], color: colours[1 + ((level + 1) % 2)] });
      }
      bars(s, segments, 0.022, steel);
      if (a.climbing === 'taped') {
        const tape = paint(256, 16, (c) => {
          for (let i = -2; i < 20; i++) { c.fillStyle = i % 2 ? '#f2f2f2' : '#d8262a'; c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16 + 16, 0); c.lineTo(i * 16 + 8, 16); c.lineTo(i * 16 - 8, 16); c.fill(); }
        });
        tape.wrapS = THREE.RepeatWrapping;
        const xA = x0 - 0.06, xB = x0 + nx * cell + 0.06, zA = z0 - 0.06, zB = z0 + nz * cell + 0.06;
        for (const [from, to] of [[[xA, zB], [xB, zB]], [[xB, zA], [xB, zB]], [[xA, zA], [xA, zB]], [[xA, zA], [xB, zA]]] as const) {
          const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
          const map = tape.clone();
          map.needsUpdate = true;
          map.repeat.set(length / 0.9, 1);
          for (const y of [0.45, 0.95]) {
            const band = s.mesh(new THREE.PlaneGeometry(length, 0.07), new THREE.MeshStandardMaterial({ map, roughness: 0.6, side: THREE.DoubleSide }), [(from[0] + to[0]) / 2, y, (from[1] + to[1]) / 2]);
            band.rotation.y = from[0] === to[0] ? Math.PI / 2 : 0;
            band.castShadow = false;
          }
        }
        s.label('OUT OF USE', 0.6, 0.22, [CX + 0.2, 0.75, zB + 0.01], '#c8262a', '#f6f4ee');
      }
    } else if (a.climbing === 'dome') {
      const ico = new THREE.IcosahedronGeometry(1.15, 1);
      const edges = new THREE.EdgesGeometry(ico);
      const points = edges.attributes.position;
      const segments: { from: P; to: P; color: string }[] = [];
      const colours = ['#c83a2a', '#2a5ac8', '#e8b82a', '#3aa04a'];
      for (let i = 0; i < points.count; i += 2) {
        const ya = points.getY(i), yb = points.getY(i + 1);
        if (ya < -0.01 || yb < -0.01) continue;
        segments.push({ from: [CX + points.getX(i), ya * 1.05, CZ + points.getZ(i)], to: [CX + points.getX(i + 1), yb * 1.05, CZ + points.getZ(i + 1)], color: colours[(i / 2) % colours.length] });
      }
      ico.dispose();
      edges.dispose();
      bars(s, segments, 0.024, steel);
    } else {
      const log = s.material('#8a6a48', { roughness: 0.9 });
      for (let i = 0; i < 5; i++) {
        const h = 0.18 + i * 0.1 + random() * 0.05;
        s.cylinder(0.14, 0.15, h, [CX - 1.1 + i * 0.42, h / 2, CZ + 0.5 - Math.abs(i - 2) * 0.22], log, 12);
      }
      for (const dx of [-0.8, 0.8]) s.cylinder(0.08, 0.08, 0.36, [CX + dx, 0.18, CZ - 0.55], log, 10);
      s.cylinder(0.09, 0.09, 1.9, [CX, 0.4, CZ - 0.55], log, 12).rotation.z = Math.PI / 2;
      const tyre = s.mesh(new THREE.TorusGeometry(0.3, 0.11, 10, 20), s.material('#1d1d1f', { roughness: 0.9 }), [CX + 0.95, 0.11, CZ + 0.1]);
      tyre.rotation.x = Math.PI / 2;
    }

    // ---- the bike shed: green steel posts, a corrugated lean-to roof, Sheffield stands
    const SX0 = 4.3, SX1 = 6.4, SZ0 = FACE + 0.06, SZ1 = -2.85, front = 2.05, back = 2.35;
    const shedSteel = s.material('#2f5a3a', { roughness: 0.5, metalness: 0.3 });
    for (const x of [SX0 + 0.05, SX1 - 0.05]) {
      s.box([0.07, front, 0.07], [x, front / 2, SZ1], shedSteel);
      s.box([0.07, back, 0.07], [x, back / 2, SZ0 + 0.05], shedSteel);
    }
    s.box([SX1 - SX0, 0.08, 0.08], [(SX0 + SX1) / 2, front, SZ1], shedSteel);
    s.box([SX1 - SX0, 0.08, 0.08], [(SX0 + SX1) / 2, back, SZ0 + 0.05], shedSteel);
    const run = SZ1 - SZ0, slope = Math.atan2(back - front, run);
    const sheetColour = new THREE.Color(frost ? '#e4eaee' : '#a4aaac').lerp(new THREE.Color('#8a5a3a'), frost ? 0 : mood.wear * 0.45);
    const sheet = s.mesh(corrugated(SX1 - SX0 + 0.3, Math.hypot(run + 0.3, back - front)), s.material(sheetColour, { roughness: 0.45, metalness: 0.5, side: THREE.DoubleSide }), [(SX0 + SX1) / 2, (front + back) / 2 + 0.07, (SZ0 + SZ1) / 2 + 0.1]);
    sheet.rotation.x = slope;
    const roofY = (z: number) => front + 0.07 + ((SZ1 - z) / run) * (back - front) + 0.03;
    const standMat = s.material('#8a8e90', { roughness: 0.4, metalness: 0.6 });
    const stands = [4.75, 5.35, 5.95];
    for (const x of stands) s.tube([[x, 0, -4.05], [x, 0.72, -4.05], [x, 0.8, -3.8], [x, 0.72, -3.55], [x, 0, -3.55]], 0.025, standMat);
    if (a.shed === 'bikes') {
      bicycle(s, [stands[0] + 0.14, 0, -3.75], pick(random, BRIGHT), 0.85);
      bicycle(s, [stands[2] + 0.14, 0, -3.7], pick(random, ['#2a2a2e', '#c8c8cc', uniform, '#e85a9a']), 0.75);
    } else if (a.shed === 'scooters') {
      for (let i = 0; i < 4; i++) {
        const group = new THREE.Group();
        group.position.set(4.55 + i * 0.45, 0, -3.25 - random() * 0.2);
        group.rotation.set(0, (random() - 0.5) * 0.3, 0.14);
        s.root.add(group);
        const colour = s.material(pick(random, BRIGHT), { roughness: 0.4 });
        const parts = [
          new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.52), colour),
          new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.72, 6), standMat),
          new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.32, 6), standMat),
          new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), benchIron),
          new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), benchIron),
        ];
        parts[0].position.set(0, 0.07, 0);
        parts[1].position.set(0, 0.43, 0.24);
        parts[2].position.set(0, 0.79, 0.24);
        parts[2].rotation.z = Math.PI / 2;
        parts[3].position.set(0, 0.05, 0.24);
        parts[4].position.set(0, 0.05, -0.24);
        parts[3].rotation.z = parts[4].rotation.z = Math.PI / 2;
        for (const part of parts) { part.castShadow = true; group.add(part); }
      }
    } else if (a.shed === 'pe') {
      for (let i = 0; i < 3; i++) {
        const hoop = s.mesh(new THREE.TorusGeometry(0.34, 0.018, 6, 28), s.material(pick(random, BRIGHT), { roughness: 0.5 }), [4.7 + i * 0.12, 0.35, SZ0 + 0.12]);
        hoop.rotation.set(-0.15, 0, (random() - 0.5) * 0.2);
      }
      s.box([0.55, 0.32, 0.4], [5.6, 0.16, -3.45], s.material('#2a5ac8', { roughness: 0.6 }));
      for (let i = 0; i < 4; i++) s.ball([0.1, 0.1, 0.1], [5.45 + (i % 2) * 0.2, 0.36, -3.55 + Math.floor(i / 2) * 0.2], s.material(pick(random, BRIGHT), { roughness: 0.5 }), 12);
      for (let i = 0; i < 4; i++) s.cylinder(0.008, 0.1, 0.22, [6.05 + (random() - 0.5) * 0.3, 0.11 + (i % 2) * 0.05, -3.2 - i * 0.04], s.material(pick(random, ['#f28a1c', '#f2c21c'])), 12);
    }
    if (a.leftover === 'roofball') s.ball([0.11, 0.11, 0.11], [5.3 + random() * 0.6, roofY(-3.5) + 0.12, -3.5], s.material(pick(random, ['#f0eee8', '#ff7a1a', '#e8e23a']), { roughness: 0.6 }), 14);

    // ---- the tall boundary wall with a goal painted on it: the goal end
    const wallLength = D / 2 - FACE;
    s.box([0.3, 2, wallLength], [-6.5, 1, (FACE + D / 2) / 2], tiled(brick, 0.9, 0.8, wallLength, 2));
    s.box([0.38, 0.08, wallLength], [-6.5, 2.04, (FACE + D / 2) / 2], stone);
    const goalPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f4f2ea').lerp(new THREE.Color(palette[0]), mood.wear * 0.4), roughness: 0.8 });
    for (const dz of [-1.45, 1.45]) s.box([0.012, 1.5, 0.09], [-6.344, 0.75, 1.1 + dz], goalPaint).castShadow = false;
    s.box([0.012, 0.09, 2.99], [-6.344, 1.5, 1.1], goalPaint).castShadow = false;

    // ---- the street side: a low brick wall, black railings with spear tips, a gate between piers
    const railIron = s.material(new THREE.Color('#1d1f22').lerp(new THREE.Color('#6a4030'), mood.wear * 0.35), { roughness: 0.5, metalness: 0.4 });
    const segments: { from: P; to: P; color: string }[] = [];
    const tips: { at: P; size: number }[] = [];
    for (const [z0, z1] of [[-2.85, 2.25], [3.55, 5.0]] as const) {
      const mid = (z0 + z1) / 2, length = z1 - z0;
      s.box([0.3, 0.55, length], [RX, 0.275, mid], tiled(brick, 0.9, 0.8, length, 0.55));
      s.box([0.36, 0.07, length + 0.02], [RX, 0.585, mid], stone);
      s.box([0.035, 0.04, length], [RX, 0.72, mid], railIron);
      s.box([0.035, 0.04, length], [RX, 1.36, mid], railIron);
      for (let z = z0 + 0.08; z < z1 - 0.04; z += 0.13) {
        segments.push({ from: [RX, 0.62, z], to: [RX, 1.5, z], color: '#ffffff' });
        tips.push({ at: [RX, 1.54, z], size: 1 });
      }
    }
    for (const z of [2.08, 3.72]) {
      s.box([0.42, 1.45, 0.42], [RX, 0.725, z], tiled(brick, 0.9, 0.8, 0.42, 1.45));
      s.box([0.5, 0.08, 0.5], [RX, 1.49, z], stone);
      s.ball([0.1, 0.1, 0.1], [RX, 1.62, z], stone, 10);
    }
    s.box([0.035, 0.05, 1.4], [RX, 0.25, 2.9], railIron);
    s.box([0.035, 0.05, 1.4], [RX, 1.3, 2.9], railIron);
    for (let z = 2.3; z < 3.52; z += 0.12) {
      segments.push({ from: [RX, 0.2, z], to: [RX, 1.42, z], color: '#ffffff' });
      tips.push({ at: [RX, 1.46, z], size: 0.85 });
    }
    bars(s, segments, 0.012, railIron as THREE.MeshStandardMaterial);
    s.scatter(new THREE.ConeGeometry(0.024, 0.09, 6), railIron, tips);

    // ---- what hangs on the railings
    let flapper: THREE.Group | null = null;
    const jumper = (z: number, colour: string) => {
      const wool = s.material(colour, { roughness: 0.95 });
      const group = new THREE.Group();
      group.position.set(RX, 1.42, z);
      s.root.add(group);
      for (const side of [-1, 1]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.36, 0.46), wool);
        panel.position.set(side * 0.07, -0.16, 0);
        panel.rotation.z = side * 0.32;
        panel.castShadow = true;
        group.add(panel);
      }
      for (const dz of [-0.19, 0.19]) {
        const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.34, 3, 8), wool);
        sleeve.position.set(0.15, -0.42, dz);
        sleeve.rotation.set(dz * 0.6, 0, 0.12);
        sleeve.castShadow = true;
        group.add(sleeve);
      }
      return group;
    };
    if (a.railings === 'jumper' || a.railings === 'lostproperty') flapper = jumper(0.55, uniform);
    if (a.railings === 'lostproperty') {
      const hat = s.material(pick(random, BRIGHT), { roughness: 0.95 });
      s.mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hat, [RX, 1.5, -1.3]);
      s.ball([0.045, 0.045, 0.045], [RX, 1.61, -1.3], s.material('#f2f0ea'), 8);
      for (const z of [-0.2, 1.65, 4.1]) {
        const glove = s.ball([0.05, 0.08, 0.025], [RX, 1.55, z], s.material(pick(random, [...BRIGHT, '#1d1d20']), { roughness: 0.95 }), 10);
        glove.rotation.x = (random() - 0.5) * 0.6;
      }
    }
    if (a.railings === 'banner') {
      const banner = paint(512, 160, (c) => {
        c.fillStyle = '#fbfaf4';
        c.fillRect(0, 0, 512, 160);
        for (let i = 0; i < 16; i++) { c.fillStyle = BRIGHT[i % BRIGHT.length]; c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 32, 0); c.lineTo(i * 32 + 16, 22); c.fill(); }
        c.fillStyle = '#c8262a';
        c.font = 'bold 54px sans-serif';
        c.textAlign = 'center';
        c.fillText('SUMMER FAIR', 256, 82);
        c.fillStyle = '#243352';
        c.font = 'bold 30px sans-serif';
        c.fillText('SATURDAY 12-3  ALL WELCOME', 256, 130);
      });
      const plane = s.mesh(new THREE.PlaneGeometry(2.4, 0.75), new THREE.MeshStandardMaterial({ map: banner, roughness: 0.6, side: THREE.DoubleSide }), [RX + 0.04, 1.02, 0.1]);
      plane.rotation.y = Math.PI / 2;
    }

    // ---- wheelie bins inside the gate
    const litter = a.leftover === 'litter';
    wheelieBin(s, [5.85, 0, 4.0], pick(random, ['#2f4a35', '#4a4d50']), { turn: Math.PI, open: litter ? -0.5 : 0 });
    wheelieBin(s, [5.9, 0, 4.66], pick(random, ['#2a4a8a', '#2f4a35', '#5a3a28']), { turn: Math.PI + 0.1 });
    if (litter) {
      s.ball([0.3, 0.2, 0.3], [5.85, 1.08, 4.0], s.material('#1d1d20', { roughness: 0.4 }), 12);
      const packets: { at: P; size: number; color: string }[] = [];
      for (let i = 0; i < 14; i++) {
        const near = i < 8;
        packets.push({ at: near ? [5.2 + random() * 0.9, 0.008, 3.4 + random() * 1.5] : [-6.1 + random() * 0.4, 0.008, -3 + random() * 7.5], size: 0.8 + random() * 0.5, color: pick(random, ['#d83a3a', '#2a63c8', '#f2c21c', '#3aa04a', '#e8e6e0', '#7a4ac8']) });
      }
      s.scatter(new THREE.BoxGeometry(0.13, 0.012, 0.09), s.material('#ffffff', { roughness: 0.3, metalness: 0.3 }), packets);
      s.box([0.06, 0.1, 0.04], [5.0, 0.03, 3.9], s.material('#f28a1c')).rotation.set(Math.PI / 2, 0, 0.4);
    }
    if (a.leftover === 'chalk') s.cylinder(0.012, 0.012, 0.06, [0.2 + random(), 0.012, 2.6], s.material('#f6d0e0'), 8).rotation.z = Math.PI / 2;

    // ---- leaves blown into the corners
    const leafCount = windy ? 170 : Math.round(mood.wear * 50 + (a.weather === 'dry' ? 10 : 0));
    if (leafCount > 0) {
      const leafGeometry = new THREE.CircleGeometry(0.045, 5);
      leafGeometry.rotateX(-Math.PI / 2);
      const leaves: { at: P; size: number; color: string }[] = [];
      for (let i = 0; i < leafCount; i++) {
        const corner = i % 3;
        const at: P = corner === 0 ? [-6.3 + random() ** 2 * 1.2, 0.01 + random() * 0.03, -4.4 + random() * 9]
          : corner === 1 ? [-6 + random() * 12, 0.01 + random() * 0.03, FACE + 0.1 + random() ** 2 * 0.9]
          : [RX - 0.2 - random() ** 2 * 1.1, 0.01 + random() * 0.03, -2.6 + random() * 7.4];
        leaves.push({ at, size: 0.7 + random() * 0.6, color: pick(random, ['#b8862a', '#8a5a2a', '#a84a2a', '#c9a23a', '#6b4a2a']) });
      }
      s.scatter(leafGeometry, s.material('#ffffff', { roughness: 0.95, side: THREE.DoubleSide }), leaves);
    }

    // ---- other children at break, running about at a distance: more of them the busier the scene
    const kids: ReturnType<typeof figure>[] = [];
    const spots: P[] = [[-1.9, 3.5, 2.2], [3.9, -1.1, -0.6], [-3.6, -1.2, 1.0], [1.4, -2.2, 3.0]];
    const count = Math.min(4, Math.round(mood.density * 3.4 + mood.energy * 0.6));
    for (let i = 0; i < count; i++) {
      const [x, z, turn] = spots[i];
      const kid = figure(s, {
        height: mix(1.08, 1.3, random()), build: random() < 0.3 ? 'slight' : 'average', style: 'doll',
        pose: i === 3 ? 'walking' : i === 2 && mood.cheer > 0.5 ? 'waving' : 'running', gaze: 'ahead',
        hair: pick(random, ['short', 'long', 'bun', 'short', 'cap'] as const), hairColor: pick(random, HAIR), skin: pick(random, SKINS),
        top: random() < 0.75 ? uniform : '#f2f0ea', bottom: pick(random, ['#3a3d44', '#5a5d63', uniform]), shoes: pick(random, ['#1d1a18', '#f2f0ea', '#c8322a']), sleeves: 'long',
      });
      kid.root.position.set(x, 0, z);
      kid.root.rotation.y = turn + (random() - 0.5) * 0.4;
      s.root.add(kid.root);
      kids.push(kid);
    }

    const phase = random() * 10;
    world.update = (dt, time) => {
      kids.forEach((kid, i) => {
        kid.update(dt, time);
        if (i < 2) kid.root.position.y = Math.abs(Math.sin(time * mix(3, 8, mood.energy) + i * 1.7)) * 0.04 * (0.3 + mood.energy);
      });
      if (flapper) flapper.rotation.x = Math.sin(time * (windy ? 3.2 : 0.8) + phase) * (windy ? 0.2 : 0.03);
    };
    return world;
  },
});
