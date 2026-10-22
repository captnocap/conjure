import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { Batch, aged, paint } from './lib';

type V3 = [number, number, number];

const PAINTS = {
  green: 'Deep park green.',
  blue: 'Royal blue, school colours.',
  red: 'Brick red, a farm-league team.',
  white: 'Whitewash, bright and chalky.',
  yellow: 'Faded mustard yellow from another decade.',
  bare: 'Unpainted grey block.',
} as const;
const PAINT: Record<keyof typeof PAINTS, [string, string]> = {
  green: ['#2f6b4a', '#f2ecd6'], blue: ['#2b57a3', '#f4f1e6'], red: ['#a3362b', '#f3e8cd'],
  white: ['#e8e5d8', '#274a7d'], yellow: ['#d2ae48', '#2b2a22'], bare: ['#a7a69d', '#2f3a34'],
};

export default defineThing({
  questions: {
    state: choice('What is going on in the dugout?', {
      midgame: 'Mid-game: bags, gloves, bats and helmets everywhere, seeds all over the floor.',
      pregame: 'Before the game: helmets in a neat row, bats racked, bags lined up, floor clean.',
      after: 'Just after everyone left: crushed cups, seed shells, one forgotten glove and cap on the bench.',
      bare: 'Swept bare for the off-season, a push broom left leaning in the corner.',
      abandoned: 'Abandoned: weeds through the slab, a broken bench plank, leaves blown in.',
    }),
    paint: choice('What colour are the blocks painted?', PAINTS),
    roof: choice('What is the roof?', {
      tin: 'A corrugated tin lean-to, loud in the rain.',
      tarpaper: 'A flat tar-paper deck with a sagging front edge.',
      gable: 'A small shingled gable roof, like a bus shelter.',
    }),
    front: choice('What is across the front, facing the field?', {
      open: 'Nothing but posts: wide open to the field.',
      screen: 'A chain-link screen with gaps at each end to climb out.',
      rail: 'A low block wall topped with a padded leaning rail.',
    }),
    wall: choice('What is on the back wall?', {
      plain: 'Nothing: plain painted block.',
      name: 'The team name lettered huge across it.',
      handprints: 'Rows of children\'s painted handprints and a year.',
      motto: 'A stencilled motto, HUSTLE, and a lineup card clipped up.',
      graffiti: 'Spray-paint tags, initials and a heart.',
    }),
    side: choice('What does the fascia board say?', {
      home: 'HOME',
      visitors: 'VISITORS',
      none: 'Nothing: bare timber.',
    }),
    cooler: choice('Where does the water come from?', {
      drum: 'An orange drum cooler with a stack of paper cups.',
      tub: 'A galvanised tub of ice and bottles on the floor.',
      hose: 'A spigot on the wall with a coiled green hose.',
      none: 'Nowhere: nobody brought water.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const b = new Batch();
    const W = 7.6, D = 2.6, H = 2.3, T = 0.2, FLOOR = 0.08;
    const [paintHex, inkHex] = PAINT[a.paint];
    const wallColour = aged(paintHex, mood.wear * 0.3, '#9c9a90');
    const team = new THREE.Color(a.paint === 'white' || a.paint === 'bare' || a.paint === 'yellow' ? (mood.warmth > 0.5 ? '#a3362b' : '#2b57a3') : paintHex);
    team.offsetHSL(0, (mood.cheer - 0.5) * 0.3, 0);
    const timber = aged('#8c6c48', mood.wear * 0.5, '#8a8880');
    const steel = aged('#aab0b1', mood.wear * 0.5, '#85583c');
    const gone = a.state === 'abandoned';
    const busy = a.state === 'midgame' ? 1 : a.state === 'pregame' ? 0.8 : a.state === 'after' ? 0.3 : 0;

    // ----- block walls -----
    const PPM = 160;
    const blocks = (ctx: CanvasRenderingContext2D, w: number, h: number, base: THREE.Color) => {
      ctx.fillStyle = `#${base.getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      for (let row = 0; row * 32 < h; row++) for (let x = row % 2 ? -32 : 0; x < w; x += 64) {
        ctx.fillStyle = random() < 0.5 ? `rgba(0,0,0,${random() * 0.07})` : `rgba(255,255,255,${random() * 0.07})`;
        ctx.fillRect(x, row * 32, 64, 32);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, row * 32, 64, 32);
      }
    };
    const weather = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      for (let i = 0; i < mood.wear * mood.wear * 50 + (gone ? 20 : 0); i++) {
        ctx.fillStyle = `rgba(${150 + random() * 25},${148 + random() * 25},${138 + random() * 20},${0.5 + random() * 0.4})`;
        const x = Math.floor(random() * (w / 64)) * 64, y = h - Math.floor(random() * random() * (h / 32) + 1) * 32;
        ctx.fillRect(x + 2, y + 2, 60 * (0.4 + random() * 0.6), 28);
      }
      const damp = ctx.createLinearGradient(0, h - 90, 0, h);
      damp.addColorStop(0, 'rgba(40,45,30,0)');
      damp.addColorStop(1, `rgba(40,45,30,${0.1 + mood.wear * 0.35})`);
      ctx.fillStyle = damp;
      ctx.fillRect(0, h - 90, w, 90);
    };
    const backMap = paint(Math.round(W * PPM), Math.round(H * PPM), (ctx, w, h) => {
      blocks(ctx, w, h, wallColour);
      ctx.fillStyle = inkHex;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (a.wall === 'name') {
        ctx.font = 'italic bold 150px Georgia, "Times New Roman", serif';
        ctx.fillText(['Tigers', 'Mudcats', 'Cardinals', 'Comets', 'Bulldogs'][Math.floor(random() * 5)], w / 2, 120);
        ctx.fillRect(w * 0.2, 205, w * 0.6, 10);
      } else if (a.wall === 'motto') {
        ctx.font = 'bold 120px Arial, Helvetica, sans-serif';
        ctx.fillText('HUSTLE', w * 0.42, 110);
        ctx.fillStyle = '#6e4d2c'; ctx.fillRect(w * 0.72, 50, 110, 150);
        ctx.fillStyle = '#f6f3e6'; ctx.fillRect(w * 0.72 + 8, 66, 94, 126);
        ctx.fillStyle = '#39413c';
        for (let i = 0; i < 9; i++) ctx.fillRect(w * 0.72 + 16, 80 + i * 12, 30 + random() * 46, 3);
        ctx.fillStyle = '#b9bdbb'; ctx.fillRect(w * 0.72 + 35, 44, 40, 16);
      } else if (a.wall === 'handprints') {
        const colours = ['#d8402f', '#f0c02e', '#2f7fd0', '#3aa35a', '#f08a2a', '#f3efe2', '#8a48b0'];
        for (let i = 0; i < 26; i++) {
          const x = 90 + (i % 13) * ((w - 180) / 12) + (random() - 0.5) * 20, y = 80 + Math.floor(i / 13) * 95 + (random() - 0.5) * 22;
          ctx.save(); ctx.translate(x, y); ctx.rotate((random() - 0.5) * 0.9);
          ctx.fillStyle = colours[Math.floor(random() * colours.length)];
          ctx.beginPath(); ctx.ellipse(0, 8, 17, 19, 0, 0, Math.PI * 2); ctx.fill();
          for (let f = -2; f <= 2; f++) { ctx.save(); ctx.rotate(f * 0.33); ctx.fillRect(-4, -34, 8, 30); ctx.restore(); }
          ctx.restore();
        }
        ctx.fillStyle = inkHex; ctx.font = 'bold 54px Arial, Helvetica, sans-serif';
        ctx.fillText(`TEAM ${1994 + Math.floor(random() * 28)}`, w / 2, 262);
      } else if (a.wall === 'graffiti') {
        const sprays = ['#111111', '#d8402f', '#f3efe2', '#2f7fd0', '#e7d21f'];
        const tags = ['J + M', 'CLASS OF 09', 'RIP COACH', 'GO HOME', 'WE WUZ HERE', 'KT ♥ DR', '#14'];
        for (let i = 0; i < 6; i++) {
          ctx.save(); ctx.translate(120 + random() * (w - 240), 60 + random() * 200); ctx.rotate((random() - 0.5) * 0.4);
          ctx.fillStyle = sprays[Math.floor(random() * sprays.length)];
          ctx.font = `bold ${46 + random() * 50}px "Comic Sans MS", "Marker Felt", cursive, sans-serif`;
          ctx.fillText(tags[Math.floor(random() * tags.length)], 0, 0);
          ctx.restore();
        }
      }
      weather(ctx, w, h);
    });
    const sideMap = paint(Math.round(D * PPM), Math.round(H * PPM), (ctx, w, h) => { blocks(ctx, w, h, wallColour); weather(ctx, w, h); });
    const plainBlock = s.material(wallColour);
    const faceBox = (size: V3, at: V3, map: THREE.Texture, faces: number[]) => {
      const textured = new THREE.MeshStandardMaterial({ map, roughness: 0.92 });
      return s.mesh(new THREE.BoxGeometry(...size), Array.from({ length: 6 }, (_unused, face) => faces.includes(face) ? textured : plainBlock) as unknown as THREE.Material, at);
    };
    faceBox([W, H, T], [0, H / 2, -D / 2 + T / 2], backMap, [4, 5]);
    for (const side of [-1, 1]) faceBox([T, H, D - T], [side * (W / 2 - T / 2), H / 2, T / 2], sideMap, [0, 1]);
    b.box([W + 0.5, FLOOR, D + 1.9], [0, FLOOR / 2, 0.75], aged('#b9b6aa', mood.wear * 0.3, '#74766a'));

    // ----- front: posts, fascia, optional screen or wall -----
    const frontZ = D / 2;
    for (const x of [-W / 2 + 0.1, -W / 6, W / 6, W / 2 - 0.1]) b.box([0.12, H + 0.1, 0.12], [x, (H + 0.1) / 2, frontZ], Math.abs(x) > W / 3 ? wallColour : steel);
    b.box([W + 0.1, 0.26, 0.09], [0, H + 0.02, frontZ + 0.08], timber);
    if (a.side !== 'none') s.label(a.side === 'home' ? 'HOME' : 'VISITORS', a.side === 'home' ? 1.5 : 2.2, 0.24, [0, H + 0.02, frontZ + 0.13], inkHex, `#${aged(paintHex, 0.15).getHexString()}`);
    if (a.front === 'screen') {
      const x0 = -W / 2 + 1.1, x1 = W / 2 - 1.1, y0 = FLOOR + 0.05, y1 = H - 0.12, w = x1 - x0, h = y1 - y0;
      const positions: number[] = [];
      const strand = (ua: number, va: number, ub: number, vb: number) => {
        const dx = ub - ua, dy = vb - va, length = Math.hypot(dx, dy), px = (-dy / length) * 0.012, py = (dx / length) * 0.012;
        const quad = [[ua - px, va - py], [ua + px, va + py], [ub + px, vb + py], [ua - px, va - py], [ub + px, vb + py], [ub - px, vb - py]];
        for (const [u, v] of quad) positions.push(x0 + u, y0 + v, frontZ);
      };
      for (let c = -h + 0.1; c < w; c += 0.2) { const v0 = Math.max(0, -c), v1 = Math.min(h, w - c); if (v1 > v0) strand(c + v0, v0, c + v1, v1); }
      for (let c = 0.1; c < w + h; c += 0.2) { const v0 = Math.max(0, c - w), v1 = Math.min(h, c); if (v1 > v0) strand(c - v0, v0, c - v1, v1); }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.computeVertexNormals();
      s.mesh(geometry, new THREE.MeshStandardMaterial({ color: steel, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }));
      for (const x of [x0, x1]) b.cyl(0.035, 0.035, h, [x, y0 + h / 2, frontZ], steel, 7);
      for (const y of [y0, y0 + h / 2, y1]) b.cyl(0.028, 0.028, w, [0, y, frontZ], steel, 7, [0, 0, Math.PI / 2]);
    } else if (a.front === 'rail') {
      const railW = W - 2.6;
      faceBox([railW, 0.72, T], [0, 0.72 / 2 + FLOOR, frontZ], sideMap, []);
      b.cyl(0.09, 0.09, railW + 0.1, [0, 0.88, frontZ], team, 10, [0, 0, Math.PI / 2]);
    }

    // ----- roof -----
    const roofW = W + 0.7, roofD = D + 0.5;
    if (a.roof === 'tin') {
      const tin = new THREE.PlaneGeometry(roofW, roofD, 92, 1);
      tin.rotateX(-Math.PI / 2);
      const p = tin.getAttribute('position');
      for (let i = 0; i < p.count; i++) p.setY(i, Math.sin(p.getX(i) * 20) * 0.028);
      tin.computeVertexNormals();
      const rust = paint(256, 256, (ctx, w, h) => {
        ctx.fillStyle = `#${aged('#c3c9c9', mood.wear * 0.3, '#8a6a52').getHexString()}`;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 6 + mood.wear * 70; i++) {
          ctx.fillStyle = `rgba(${130 + random() * 40},${70 + random() * 25},${35 + random() * 20},${0.25 + random() * 0.5 * mood.wear})`;
          ctx.fillRect(random() * w, random() * h, 3 + random() * 26, 20 + random() * 120);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let x = 0; x < w; x += w / 9) ctx.fillRect(x, 0, 1.5, h);
      });
      const roof = s.mesh(tin, new THREE.MeshStandardMaterial({ map: rust, roughness: 0.45, metalness: 0.55, side: THREE.DoubleSide }), [0, H + 0.24, -0.02]);
      roof.rotation.x = -0.1;
      for (const z of [-D / 2 + 0.1, 0.1, frontZ]) b.box([W + 0.3, 0.09, 0.06], [0, H + 0.18 + z * 0.1, z], timber);
    } else if (a.roof === 'tarpaper') {
      const tar = aged('#3c3d3d', mood.wear * 0.4, '#77766d');
      b.box([roofW, 0.1, roofD], [0, H + 0.22, -0.02], tar, [-0.04 - mood.wear * 0.03, 0, (random() - 0.5) * 0.02]);
      b.box([roofW + 0.04, 0.16, 0.04], [0, H + 0.2 + (roofD / 2) * 0.05, -0.02 + roofD / 2], aged('#d7d3c2', mood.wear * 0.4));
      for (let i = 0; i < 5; i++) b.box([0.5 + random() * 0.9, 0.012, 0.3 + random() * 0.8], [(random() - 0.5) * (roofW - 1.5), H + 0.275 + random() * 0.02, (random() - 0.5) * (roofD - 1.2)], aged('#2b2c2c', random() * 0.3, '#6e6d66'), [-0.05, random(), 0]);
    } else {
      const shingle = aged('#5c4a40', mood.wear * 0.4, '#8a887e');
      const run = roofD / 2, pitch = 0.42, slope = run / Math.cos(pitch);
      for (const side of [-1, 1]) b.box([roofW, 0.07, slope + 0.1], [0, H + 0.2 + (Math.tan(pitch) * run) / 2, -0.02 + side * run / 2], shingle, [side * pitch, 0, 0]);
      b.box([roofW + 0.02, 0.09, 0.14], [0, H + 0.25 + Math.tan(pitch) * run, -0.02], aged('#473a33', mood.wear * 0.3));
      for (const x of [-W / 2 + 0.02, W / 2 - 0.02]) {
        const gable = new THREE.Shape();
        gable.moveTo(-run, 0); gable.lineTo(run, 0); gable.lineTo(0, Math.tan(pitch) * run); gable.closePath();
        const geometry = new THREE.ExtrudeGeometry(gable, { depth: 0.06, bevelEnabled: false });
        geometry.rotateY(Math.PI / 2);
        b.add(geometry, aged('#d9d2bb', mood.wear * 0.4), [x - 0.03, H + 0.14, -0.02]);
      }
    }

    // ----- bench -----
    const benchW = W - 1.9, benchX = -0.55, benchZ = -D / 2 + T + 0.3, seatY = FLOOR + 0.46;
    const metalBench = a.paint === 'blue' || a.paint === 'white';
    const seatColour = metalBench ? steel : timber;
    const broken = gone ? mix(-0.3, 0.3, random()) * benchW : null;
    const seat = (x0: number, x1: number, dropEnd: number) => {
      const length = x1 - x0, tilt = Math.atan2(dropEnd, length);
      for (const dz of [-0.09, 0.09]) b.box([Math.hypot(length, dropEnd), 0.045, 0.16], [(x0 + x1) / 2, seatY + dropEnd / 2, benchZ + dz], aged(seatColour, random() * 0.15, '#5a5046'), [0, 0, tilt]);
    };
    if (broken === null) seat(benchX - benchW / 2, benchX + benchW / 2, 0);
    else { seat(benchX - benchW / 2, benchX + broken, -0.38); seat(benchX + broken + 0.25, benchX + benchW / 2, 0); }
    for (let i = 0; i < 5; i++) {
      const x = benchX - benchW / 2 + 0.25 + (i / 4) * (benchW - 0.5);
      if (broken !== null && Math.abs(x - (benchX + broken)) < 0.9 && x < benchX + broken + 0.2) continue;
      if (metalBench) for (const dz of [-0.13, 0.13]) b.cyl(0.02, 0.02, seatY - FLOOR, [x, FLOOR + (seatY - FLOOR) / 2, benchZ + dz], steel, 6);
      else b.box([0.38, seatY - FLOOR - 0.03, 0.19], [x, FLOOR + (seatY - FLOOR - 0.03) / 2, benchZ], aged('#a9a89f', 0.1));
    }
    b.box([benchW, 0.14, 0.04], [benchX, seatY + 0.42, -D / 2 + T + 0.03], aged(seatColour, 0.1, '#5a5046'));

    // ----- helmet shelf and helmets -----
    const shelfY = 1.62, shelfZ = -D / 2 + T + 0.16;
    b.box([benchW * 0.62, 0.035, 0.32], [benchX - benchW * 0.14, shelfY, shelfZ], timber);
    for (let i = 0; i < 4; i++) b.box([0.03, 0.2, 0.3], [benchX - benchW * 0.14 + (i - 1.5) * benchW * 0.2, shelfY - 0.1, shelfZ], timber);
    const helmet = (at: V3, turn: number, tip = 0) => {
      b.add(new THREE.SphereGeometry(0.135, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.56), aged(team, random() * 0.12), at, [tip, turn, 0]);
      b.box([0.2, 0.018, 0.13], [at[0] + Math.sin(turn) * 0.14, at[1] - 0.005, at[2] + Math.cos(turn) * 0.14], '#1e2022', [tip, turn, 0]);
    };
    const helmetSlots = 9;
    const helmetsKept = a.state === 'pregame' ? 1 : a.state === 'midgame' ? 0.5 : a.state === 'after' ? 0.12 : 0;
    for (let i = 0; i < helmetSlots; i++) if (random() < helmetsKept) helmet([benchX - benchW * 0.14 + ((i + 0.5) / helmetSlots - 0.5) * benchW * 0.58, shelfY + 0.03, shelfZ], a.state === 'pregame' ? 0 : (random() - 0.5) * 1.2);

    // ----- bat rack at the right-hand end -----
    const rackX = W / 2 - T - 0.75, rackZ = -D / 2 + T + 0.1;
    b.box([1.25, 0.07, 0.14], [rackX, 0.95, rackZ], timber);
    b.box([1.25, 0.05, 0.2], [rackX, FLOOR + 0.06, rackZ + 0.02], timber);
    for (let i = 0; i <= 9; i++) b.box([0.02, 0.07, 0.1], [rackX - 0.6 + i * 0.133, 0.95, rackZ + 0.1], timber);
    const bat = (foot: V3, top: V3) => {
      const colour = random() < 0.35 ? '#c9ccca' : random() < 0.3 ? '#25272a' : random() < 0.5 ? `#${team.getHexString()}` : '#c9a26a';
      b.rod(foot, top, 0.034, colour, 7, 0.014);
      b.ball([0.026, 0.02, 0.026], top, colour, 6);
    };
    const batsKept = a.state === 'pregame' ? 1 : a.state === 'midgame' ? 0.65 : a.state === 'after' ? 0.1 : 0;
    for (let i = 0; i < 9; i++) if (random() < batsKept) { const x = rackX - 0.53 + i * 0.133; bat([x, FLOOR + 0.09, rackZ + 0.1], [x + (random() - 0.5) * 0.03, FLOOR + 0.92, rackZ + 0.1]); }

    // ----- gear by state -----
    const floorZ = () => { const z = mix(-D / 2 + T + 0.6, frontZ + 1.2, random()); return Math.abs(z - frontZ) < 0.3 ? frontZ + 0.4 : z; };
    const alongBench = () => benchX + (random() - 0.5) * (benchW - 0.6);
    const bagCount = a.state === 'midgame' ? Math.round(mix(2, 7, mood.density)) : a.state === 'pregame' ? Math.round(mix(3, 6, mood.density)) : 0;
    for (let i = 0; i < bagCount; i++) {
      const neat = a.state === 'pregame';
      const x = neat ? benchX - benchW / 2 + 0.6 + (i / Math.max(1, bagCount - 1)) * (benchW - 1.2) : alongBench();
      const z = neat ? benchZ + 0.55 : floorZ(), turn = neat ? Math.PI / 2 : random() * 3;
      const colour = random() < 0.5 ? aged(team, random() * 0.2, '#1c1d1f') : new THREE.Color(['#1f2023', '#7a1f1f', '#30415f', '#5a5d60'][Math.floor(random() * 4)]);
      b.add(new THREE.CapsuleGeometry(0.17, 0.5, 3, 8), colour, [x, FLOOR + 0.17, z], [Math.PI / 2, 0, turn]);
      b.add(new THREE.TorusGeometry(0.19, 0.018, 4, 10, Math.PI), '#d8d6cc', [x, FLOOR + 0.2, z], [0, Math.PI / 2 - turn, 0]);
    }
    const glove = (at: V3) => {
      const leather = aged('#8a5a34', random() * 0.3, '#4c311d');
      b.ball([0.14, 0.055, 0.16], at, leather, 9, [0, random() * 3, 0]);
      b.ball([0.055, 0.055, 0.055], [at[0], at[1] + 0.05, at[2]], '#f2efe5', 8);
    };
    const gloves = a.state === 'midgame' ? 2 + Math.round(mood.density * 4) : a.state === 'after' ? 1 : 0;
    for (let i = 0; i < gloves; i++) glove([alongBench(), seatY + 0.07, benchZ + (random() - 0.5) * 0.1]);
    if (a.state === 'after') {
      const x = alongBench();
      b.add(new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), team, [x, seatY + 0.025, benchZ], [0, 0, 0]);
      b.box([0.15, 0.012, 0.1], [x, seatY + 0.03, benchZ + 0.12], team);
    }
    if (a.state === 'midgame') {
      for (let i = 0; i < 1 + Math.round(mood.density * 3); i++) { const x = mix(-W / 2 + 1.3, W / 2 - 1.3, random()); bat([x, FLOOR + 0.02, frontZ + 0.42 + random() * 0.2], [x + (random() - 0.5) * 0.2, 0.9, frontZ + 0.1]); }
      for (let i = 0; i < 1 + Math.round(mood.density * 2); i++) helmet([alongBench(), random() < 0.5 ? seatY + 0.03 : FLOOR + 0.01, random() < 0.5 ? benchZ : floorZ()], random() * 6, 0);
      // A ball bucket.
      const bx = benchX + benchW / 2 - random() * 2, bz = frontZ + 0.7 + random() * 0.4;
      b.cyl(0.17, 0.14, 0.36, [bx, FLOOR + 0.18, bz], '#eceae2', 12);
      for (let i = 0; i < 6; i++) b.ball([0.05, 0.05, 0.05], [bx + (random() - 0.5) * 0.2, FLOOR + 0.37, bz + (random() - 0.5) * 0.2], '#f5f2e8', 7);
    }
    if (a.state === 'bare') {
      const x = -W / 2 + T + 0.3, z = -D / 2 + T + 0.2;
      b.rod([x + 0.25, FLOOR + 0.07, z + 0.35], [x, 1.55, z], 0.016, '#c9a26a', 6);
      b.box([0.5, 0.07, 0.09], [x + 0.25, FLOOR + 0.08, z + 0.36], '#7a3a2a', [0, 0.5, 0]);
      b.box([0.48, 0.07, 0.03], [x + 0.27, FLOOR + 0.04, z + 0.4], '#d3c08a', [0.3, 0.5, 0]);
    }

    // ----- water -----
    let cups = 0;
    if (a.cooler === 'drum') {
      const x = -W / 2 + T + 0.55, z = -D / 2 + T + 0.45;
      b.box([0.6, 0.55, 0.5], [x, FLOOR + 0.275, z], timber);
      b.cyl(0.21, 0.19, 0.5, [x, FLOOR + 0.82, z], '#e8761f', 16);
      b.cyl(0.215, 0.215, 0.07, [x, FLOOR + 1.1, z], '#f1efe6', 16);
      b.box([0.05, 0.05, 0.06], [x, FLOOR + 0.63, z + 0.21], '#f1efe6');
      b.cyl(0.04, 0.035, 0.3, [x + 0.28, FLOOR + 0.72, z + 0.1], '#f4f1e6', 8);
      cups = a.state === 'after' ? 14 : a.state === 'midgame' ? 6 : 0;
    } else if (a.cooler === 'tub') {
      const x = -W / 2 + T + 0.75, z = 0.25;
      b.cyl(0.42, 0.34, 0.34, [x, FLOOR + 0.17, z], steel, 18);
      if (busy > 0) {
        b.cyl(0.39, 0.39, 0.03, [x, FLOOR + 0.33, z], '#e6f1f4', 18);
        for (let i = 0; i < 8; i++) { const angle = random() * 6.3, r = random() * 0.26; b.cyl(0.03, 0.04, 0.2, [x + Math.cos(angle) * r, FLOOR + 0.4, z + Math.sin(angle) * r], ['#6e3a1c', '#2f6b3a', '#c8372c', '#e9e6dc'][Math.floor(random() * 4)], 7, [(random() - 0.5) * 0.9, 0, (random() - 0.5) * 0.9]); }
      }
      cups = a.state === 'after' ? 6 : 0;
    } else if (a.cooler === 'hose') {
      const x = -W / 2 + T + 0.02, z = 0.3;
      b.cyl(0.02, 0.02, 0.5, [x + 0.03, FLOOR + 0.35, z], '#8f8a7a', 6);
      b.box([0.05, 0.05, 0.12], [x + 0.08, FLOOR + 0.6, z], '#b08b3a');
      for (let i = 0; i < 4; i++) b.add(new THREE.TorusGeometry(0.24 - i * 0.012, 0.022, 5, 20), aged('#2f7a45', mood.wear * 0.3), [x + 0.33, FLOOR + 0.03 + i * 0.04, z + 0.35], [Math.PI / 2, 0, 0]);
      b.rod([x + 0.1, FLOOR + 0.58, z], [x + 0.33, FLOOR + 0.06, z + 0.12], 0.02, aged('#2f7a45', mood.wear * 0.3), 6);
    }
    for (let i = 0; i < cups; i++) b.cyl(0.04, 0.03, 0.09, [mix(-W / 2 + 0.6, W / 2 - 0.6, random()), FLOOR + 0.035, floorZ() + 0.2], '#f4f1e6', 7, [Math.PI / 2 + (random() - 0.5) * 0.4, 0, random() * 3]);

    // ----- seed shells, leaves, weeds -----
    const seeds = Math.round((a.state === 'midgame' ? 260 : a.state === 'after' ? 420 : a.state === 'abandoned' ? 140 : a.state === 'bare' ? 6 : 0) * mix(0.5, 1.3, mood.density));
    if (seeds) {
      const speck = new THREE.OctahedronGeometry(1, 0);
      speck.scale(1, 0.3, 0.6);
      s.scatter(speck, new THREE.MeshStandardMaterial({ roughness: 0.9 }), Array.from({ length: seeds }, () => {
        const nearBench = random() < 0.7;
        return {
          at: [alongBench() + (random() - 0.5) * 0.8, FLOOR + 0.008, nearBench ? benchZ + 0.3 + random() * random() * 1.6 : floorZ()] as V3,
          size: gone ? 0.03 + random() * 0.05 : 0.016 + random() * 0.02,
          color: gone ? new THREE.Color().setHSL(0.07 + random() * 0.07, 0.6, 0.25 + random() * 0.25) : random() < 0.45 ? '#2a2622' : '#e3dccb',
        };
      }));
    }
    const weeds = Math.round((gone ? 80 : mix(4, 22, mood.wear)) * mix(0.6, 1.3, mood.density));
    const blade = new THREE.ConeGeometry(0.05, 0.4, 4);
    blade.translate(0, 0.2, 0);
    s.scatter(blade, new THREE.MeshStandardMaterial({ roughness: 0.95 }), Array.from({ length: weeds }, () => {
      const inside = gone && random() < 0.55;
      return {
        at: [inside ? (random() - 0.5) * (W - 0.8) : (random() - 0.5) * (W + 0.8), inside ? FLOOR : 0, inside ? floorZ() : random() < 0.5 ? frontZ + 1.45 + random() * 0.25 : -D / 2 - 0.25 + random() * 0.1] as V3,
        size: 0.5 + random() * (gone ? 1.5 : 0.7),
        color: new THREE.Color().setHSL(mix(0.19, 0.31, random()), mix(0.25, 0.55, mood.cheer), mix(0.22, 0.37, random())),
      };
    }));

    // A towel over the bench back, stirring in the breeze.
    let towel: THREE.Mesh | null = null;
    if (a.state === 'midgame' || a.state === 'after') {
      const cloth = new THREE.BoxGeometry(0.34, 0.5, 0.02);
      cloth.translate(0, -0.25, 0);
      towel = s.mesh(cloth, s.material(mood.cheer > 0.5 ? '#f2efe6' : '#b9bcc0'), [alongBench(), seatY + 0.5, -D / 2 + T + 0.07]);
    }

    b.into(s.root, { roughness: mix(0.6, 0.92, mood.wear) });
    const breeze = mix(0.4, 2.6, mood.energy), reach = mix(0.02, 0.2, mood.energy);
    return s.finish({ update: towel ? (_dt, time) => { towel!.rotation.x = 0.06 + Math.sin(time * breeze) * reach; } : undefined });
  },
});
