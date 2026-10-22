import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type Kind = 'chain' | 'rope' | 'wire';
interface Stock { kind: Kind; colour: string; second?: string; metal?: boolean; gauge: number }
const CHAINS: Stock[] = [
  { kind: 'chain', colour: '#c3c8cc', metal: true, gauge: 1.3 }, { kind: 'chain', colour: '#3a3c40', metal: true, gauge: 1 },
  { kind: 'chain', colour: '#c9a14a', metal: true, gauge: 0.75 }, { kind: 'chain', colour: '#9aa0a4', metal: true, gauge: 1.6 },
];
const ROPES: Stock[] = [
  { kind: 'rope', colour: '#c9a56a', second: '#8f6f3e', gauge: 1.4 }, { kind: 'rope', colour: '#efece0', second: '#bdb8a6', gauge: 1 },
  { kind: 'rope', colour: '#2d6fc4', second: '#1c4a8a', gauge: 1 }, { kind: 'rope', colour: '#f0c419', second: '#1f1f1f', gauge: 1.1 },
  { kind: 'rope', colour: '#d8392b', second: '#f1ede2', gauge: 0.8 }, { kind: 'rope', colour: '#3f8a4e', second: '#275c33', gauge: 0.9 },
];
const WIRES: Stock[] = [
  { kind: 'wire', colour: '#c47a3c', metal: true, gauge: 0.6 }, { kind: 'wire', colour: '#b9bec2', metal: true, gauge: 0.5 },
  { kind: 'wire', colour: '#2f7a45', gauge: 0.6 }, { kind: 'wire', colour: '#1d1d1f', gauge: 0.9 }, { kind: 'wire', colour: '#c8322a', gauge: 0.7 },
];
const PLASTIC: Stock[] = [
  { kind: 'chain', colour: '#f2c81e', gauge: 1.5 }, { kind: 'chain', colour: '#e23b2e', gauge: 1.5 }, { kind: 'chain', colour: '#f4f4ee', gauge: 1.5 },
  { kind: 'chain', colour: '#2fa85a', gauge: 1.3 }, { kind: 'rope', colour: '#ff5fa2', second: '#ffd23f', gauge: 1 }, { kind: 'rope', colour: '#33c1d6', second: '#f4f4ee', gauge: 1 },
];

function wrap(stock: Stock, wear: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const base = new THREE.Color(stock.colour);
  const shade = '#' + base.clone().multiplyScalar(0.45).getHexString();
  ctx.fillStyle = stock.kind === 'chain' ? shade : stock.colour;
  ctx.fillRect(0, 0, 128, 128);
  if (stock.kind === 'chain') {
    ctx.strokeStyle = stock.colour; ctx.lineWidth = 5;
    for (let row = 0; row < 6; row++) for (let i = -1; i < 5; i++) {
      ctx.beginPath(); ctx.ellipse(i * 32 + (row % 2) * 16 + 14, row * 21.3 + 11, 13, 6, 0, 0, 7); ctx.stroke();
    }
  } else if (stock.kind === 'rope') {
    const rows = 7;
    for (let row = 0; row < rows; row++) {
      const y = row * 128 / rows;
      ctx.strokeStyle = stock.second ?? shade; ctx.lineWidth = 3.5;
      for (let i = -2; i < 12; i++) { ctx.beginPath(); ctx.moveTo(i * 16, y + 128 / rows); ctx.lineTo(i * 16 + 12, y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, y, 128, 2.5);
    }
  } else {
    for (let y = 0; y < 128; y += 5) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(0, y, 128, 1.6); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, y + 2.4, 128, 1); }
  }
  if (wear > 0.5 && stock.metal) { ctx.fillStyle = `rgba(120,70,35,${(wear - 0.5) * 0.7})`; ctx.fillRect(0, 0, 128, 128); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 1);
  return texture;
}

export default defineThing({
  questions: {
    stock: choice('What is on the reels?', {
      chain: 'Mostly chain: galvanised, black and brass, fine to heavy.',
      rope: 'Mostly rope: manila, white cotton, blue and yellow poly.',
      wire: 'Wire and cable: copper, galvanised, green garden wire, black flex.',
      mixed: 'Chain on the bottom, rope in the middle, wire on top.',
      plastic: 'Bright plastic chain and neon cord, cheerful and light.',
    }),
    size: choice('How big is the rack?', {
      small: 'A small two-by-two stand.',
      standard: 'A standard rack, three rows of three.',
      long: 'A long wall of reels, two rows of five.',
      tall: 'A tall narrow tower, four rows of two.',
    }),
    depleted: score('How much is left on the reels?', ['All freshly loaded and fat', 'Most well stocked', 'Running down, some thin', 'Nearly all bare cores']),
    ends: score('How many loose ends trail to the floor?', ['None, every end tucked', 'One left hanging', 'Several trailing', 'Every reel spilling a tangle onto the floor']),
    cutter: choice('What cutter is bolted to the front?', {
      bolt: 'Long red-handled bolt cutters on a hinge plate.',
      guillotine: 'A lever guillotine with a curved blade, like a paper trimmer for rope.',
      hotknife: 'An electric hot knife with a glowing blade for sealing rope ends.',
      none: 'No cutter, only the rule; they use whatever is in their pocket.',
    }),
    sign: choice('How is it signed?', {
      none: 'Unsigned.',
      foot: 'A header board: SOLD BY THE FOOT.',
      metre: 'A header board: CUT TO LENGTH.',
      ask: 'A header board: ASK FOR HELP.',
    }),
    paint: choice('What colour is the frame?', {
      black: 'Black angle iron.', red: 'Red tube steel.', blue: 'Blue powder-coat.', timber: 'Home-made from heavy timber.', galv: 'Bare galvanised steel.',
    }),
    waiting: choice('What has been left by the rack?', {
      nothing: 'Nothing.',
      order: 'A cut length coiled on the floor with a paper tag: someone is coming back for it.',
      measuring: 'A length pulled out along the rule, mid-measure.',
      bucket: 'A bucket of offcuts and short ends, free to a good home.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [cols, rows] = { small: [2, 2], standard: [3, 3], long: [5, 2], tall: [2, 4] }[a.size];
    const pitchX = 0.42, pitchY = 0.5, flangeR = 0.21, reelW = 0.3;
    const W = cols * pitchX + 0.14, frontZ = 0.36;
    const frameColour = { black: '#26282a', red: '#b52c22', blue: '#2a4f86', timber: '#9a7448', galv: '#aeb4b6' }[a.paint];
    const frame = s.material(frameColour, { metalness: a.paint === 'timber' ? 0 : 0.5, roughness: 0.5 });
    const steel = s.material('#b9bec2', { metalness: 0.8, roughness: 0.3 });
    const thick = a.paint === 'timber' ? 0.07 : 0.04;
    const rowY = (r: number) => 0.34 + r * pitchY, rowZ = (r: number) => -r * 0.13;
    const topY = rowY(rows - 1) + 0.3;

    // End frames: vertical front leg, raked back leg, feet.
    for (const side of [-1, 1]) {
      const x = side * (W / 2);
      s.rod([x, 0, frontZ], [x, 0.95, frontZ], thick / 2, frame);
      s.rod([x, 0, 0.16], [x, topY, rowZ(rows - 1)], thick / 2, frame);
      s.rod([x, 0, -0.3], [x, topY, rowZ(rows - 1)], thick / 2, frame);
      s.box([thick, thick, 0.75], [x, thick / 2, 0.02], frame);
      s.rod([x, 0.95, frontZ], [x, rowY(Math.min(1, rows - 1)) + 0.1, rowZ(Math.min(1, rows - 1)) + 0.02], thick / 2.4, frame);
    }
    s.rod([-W / 2, topY, rowZ(rows - 1)], [W / 2, topY, rowZ(rows - 1)], thick / 2, frame);
    s.rod([-W / 2, 0.06, -0.3], [W / 2, 0.06, -0.3], thick / 2, frame);

    const pools: Record<string, Stock[]> = { chain: CHAINS, rope: ROPES, wire: WIRES, plastic: PLASTIC };
    const stockFor = (r: number): Stock => {
      const pool = a.stock === 'mixed' ? [CHAINS, ROPES, WIRES, WIRES][Math.min(3, Math.floor(r / rows * 3))] : pools[a.stock];
      // A stray reel of something else now and then.
      const source = a.stock !== 'mixed' && a.stock !== 'plastic' && random() < 0.15 ? [CHAINS, ROPES, WIRES][Math.floor(random() * 3)] : pool;
      return source[Math.floor(random() * source.length)];
    };

    // Chain links are instanced; ropes and wires are tubes.
    const links: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 0, 1);
    const lay = (points: THREE.Vector3[], stock: Stock) => {
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);
      if (stock.kind === 'chain') {
        const size = 0.03 * stock.gauge, length = curve.getLength(), count = Math.max(2, Math.floor(length / (size * 1.5)));
        const colour = new THREE.Color(stock.colour);
        for (let i = 0; i <= count; i++) {
          const p = curve.getPointAt(i / count), t = curve.getTangentAt(i / count);
          dummy.position.copy(p);
          dummy.quaternion.setFromUnitVectors(up, t);
          dummy.rotateZ(i % 2 ? Math.PI / 2 : 0);
          dummy.scale.setScalar(stock.gauge);
          dummy.updateMatrix();
          links.push({ m: dummy.matrix.clone(), c: colour });
        }
      } else {
        const radius = (stock.kind === 'rope' ? 0.011 : 0.006) * stock.gauge;
        const material = new THREE.MeshStandardMaterial({ color: stock.colour, roughness: stock.metal ? 0.35 : 0.85, metalness: stock.metal ? 0.7 : 0 });
        s.mesh(new THREE.TubeGeometry(curve, points.length * 10, radius, 6, false), material);
      }
    };
    const floorWander = (x: number, z: number, reach: number, stock: Stock) => {
      const floorY = stock.kind === 'chain' ? 0.012 * stock.gauge : 0.012;
      const points: THREE.Vector3[] = [];
      let heading = (random() - 0.5) * 2, px = x, pz = z;
      const steps = 4 + Math.floor(reach * 6);
      for (let i = 0; i < steps; i++) {
        heading += (random() - 0.5) * 2.2;
        px += Math.sin(heading) * 0.12; pz += Math.abs(Math.cos(heading)) * 0.1 + 0.02;
        points.push(new THREE.Vector3(px, floorY, Math.min(pz, 1.15)));
      }
      return points;
    };

    const trailChance = [0, 0.08, 0.4, 1][Math.min(3, Math.floor(a.ends * 3.999))];
    let trails = 0;
    const reels: THREE.Group[] = [];
    const total = cols * rows;
    const forcedTrail = a.ends >= 0.25 ? Math.floor(random() * cols) : -1;
    let heroStock: Stock = CHAINS[0], heroAt: [number, number, number, number] = [0, 0, 0, 0];
    for (let r = 0; r < rows; r++) {
      const y = rowY(r), z = rowZ(r);
      s.rod([-W / 2, y, z], [W / 2, y, z], 0.014, steel);
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) * pitchX;
        const stock = stockFor(r);
        const fill = clamp01(mix(1, 0.02, a.depleted) + (random() - 0.5) * mix(0.25, 0.7, a.depleted * (1 - a.depleted) * 4));
        const coreR = 0.065, woundR = mix(coreR, flangeR - 0.02, fill);
        const reel = new THREE.Group();
        reel.position.set(x, y, z);
        reel.rotation.x = random() * 6;
        s.root.add(reel);
        reels.push(reel);
        const flangeMat = stock.kind === 'chain' && stock.metal ? s.material('#34373a', { metalness: 0.5 }) : stock.kind === 'wire' ? s.material('#c9a877') : a.stock === 'plastic' ? s.material('#e9e7df') : s.material('#b98f5c');
        for (const side of [-1, 1]) {
          const flange = new THREE.Mesh(new THREE.CylinderGeometry(flangeR, flangeR, 0.016, 28), flangeMat);
          flange.rotation.z = Math.PI / 2; flange.position.x = side * reelW / 2;
          flange.castShadow = flange.receiveShadow = true;
          reel.add(flange);
          for (let k = 0; k < 4; k++) {
            const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.018, 10), s.material('#1c1c1c'));
            hole.rotation.z = Math.PI / 2;
            hole.position.set(side * reelW / 2, Math.cos(k * Math.PI / 2) * 0.13, Math.sin(k * Math.PI / 2) * 0.13);
            reel.add(hole);
          }
        }
        const core = new THREE.Mesh(new THREE.CylinderGeometry(coreR, coreR, reelW, 16), flangeMat);
        core.rotation.z = Math.PI / 2; core.castShadow = true;
        reel.add(core);
        const empty = fill < 0.06;
        if (!empty) {
          const texture = wrap(stock, mood.wear);
          texture.repeat.set(Math.max(2, Math.round(woundR * 30)), stock.kind === 'wire' ? 2 : 1);
          const wound = new THREE.Mesh(new THREE.CylinderGeometry(woundR, woundR, reelW - 0.02, 28, 1, true), new THREE.MeshStandardMaterial({ map: texture, roughness: stock.metal ? 0.4 : 0.85, metalness: stock.metal ? 0.55 : 0, emissive: stock.colour, emissiveIntensity: 0.06 }));
          wound.rotation.z = Math.PI / 2; wound.castShadow = wound.receiveShadow = true;
          reel.add(wound);
        } else if (mood.density > 0.2) {
          const tag = s.label('OUT', 0.14, 0.07, [x, y - 0.02, z + flangeR + 0.012], '#b3261e', '#f3ead0');
          tag.rotation.z = (random() - 0.5) * 0.4;
        }
        if (r === 0 && c === cols - 1) { heroStock = stock; heroAt = [x, y, z, woundR]; }
        // The loose end.
        const wantsTrail = !empty && (random() < trailChance || (r === Math.min(1, rows - 1) && c === forcedTrail));
        if (wantsTrail && trails < total) {
          trails++;
          const jx = x + (random() - 0.5) * reelW * 0.6;
          const z0 = z + woundR + 0.012;
          const reach = a.ends > 0.75 ? mix(0.5, 1.2, random()) : mix(0.1, 0.6, random());
          const dropTo = a.ends > 0.5 || random() < 0.5 ? 0 : mix(0.15, y - 0.25, random());
          const points = [new THREE.Vector3(jx, y + woundR * 0.2, z0 - 0.005), new THREE.Vector3(jx, y - 0.08, z0 + 0.012), new THREE.Vector3(jx + (random() - 0.5) * 0.03, Math.max(dropTo, 0.16), z0 + 0.02)];
          if (dropTo === 0) {
            points.push(new THREE.Vector3(jx, 0.03, z0 + 0.04));
            points.push(...floorWander(jx, Math.max(z0 + 0.08, 0.1), reach, stock));
          }
          lay(points, stock);
        }
      }
    }

    // Front rail with the measuring rule.
    const railY = 0.95;
    s.box([W + 0.04, 0.03, 0.14], [0, railY, frontZ], a.paint === 'timber' ? frame : s.material('#8a6a45'));
    const ruleCanvas = document.createElement('canvas');
    ruleCanvas.width = 1024; ruleCanvas.height = 48;
    const ctx = ruleCanvas.getContext('2d')!;
    ctx.fillStyle = mood.wear > 0.6 ? '#d3b24a' : '#f2cb2c'; ctx.fillRect(0, 0, 1024, 48);
    ctx.fillStyle = '#16161a';
    const feet = Math.max(2, Math.round(W / 0.3048));
    for (let i = 0; i <= feet * 12; i++) { const x = i / (feet * 12) * 1024; ctx.fillRect(x - (i % 12 ? 1 : 3), 0, i % 12 ? 2 : 6, i % 12 ? (i % 6 ? 14 : 22) : 34); }
    ctx.font = 'bold 26px monospace';
    for (let i = 1; i < feet; i++) ctx.fillText(String(i), i / feet * 1024 + 8, 44);
    const ruleTexture = new THREE.CanvasTexture(ruleCanvas);
    ruleTexture.colorSpace = THREE.SRGBColorSpace;
    const ruleMat = new THREE.MeshStandardMaterial({ map: ruleTexture, roughness: 0.6 });
    const rule = s.mesh(new THREE.PlaneGeometry(W, 0.06), ruleMat, [0, railY + 0.016, frontZ + 0.03]);
    rule.rotation.x = -Math.PI / 2;
    s.mesh(new THREE.PlaneGeometry(W, 0.03), ruleMat, [0, railY, frontZ + 0.0705]);

    // Cutter at the right end of the rail.
    const kx = W / 2 - 0.16, ky = railY + 0.015, kz = frontZ - 0.02;
    if (a.cutter === 'bolt') {
      const red = s.material('#c0281f', { roughness: 0.45 });
      s.box([0.26, 0.012, 0.08], [kx, ky + 0.006, kz], steel);
      s.rod([kx - 0.02, ky + 0.03, kz], [kx - 0.5 > -W / 2 ? kx - 0.42 : -W / 2 + 0.06, ky + 0.03, kz], 0.013, red);
      const lift = mix(0.25, 0.75, random());
      s.rod([kx - 0.02, ky + 0.04, kz], [kx - 0.02 - Math.cos(lift) * 0.4, ky + 0.04 + Math.sin(lift) * 0.4, kz], 0.013, red);
      s.box([0.1, 0.05, 0.03], [kx + 0.04, ky + 0.04, kz], s.material('#2b2d30', { metalness: 0.7 }));
      s.box([0.05, 0.02, 0.032], [kx + 0.11, ky + 0.03, kz], steel);
      s.box([0.05, 0.02, 0.032], [kx + 0.11, ky + 0.06, kz], steel).rotation.z = 0.25;
    } else if (a.cutter === 'guillotine') {
      s.box([0.24, 0.02, 0.14], [kx, ky + 0.01, kz], s.material('#3d6b4f', { metalness: 0.3 }));
      const lift = mix(0.4, 1, random());
      const arm = new THREE.Group();
      arm.position.set(kx + 0.11, ky + 0.03, kz + 0.06);
      arm.rotation.z = -lift;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.006), steel); blade.position.x = -0.15;
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 8), s.material('#1c1c1c')); grip.rotation.z = Math.PI / 2; grip.position.x = -0.33;
      blade.castShadow = grip.castShadow = true;
      arm.add(blade, grip);
      s.root.add(arm);
    } else if (a.cutter === 'hotknife') {
      s.box([0.1, 0.07, 0.08], [kx, ky + 0.035, kz], s.material('#2a2c2f'));
      s.cylinder(0.018, 0.022, 0.13, [kx, ky + 0.13, kz], s.material('#d9772a'), 10);
      s.box([0.004, 0.09, 0.03], [kx, ky + 0.24, kz], new THREE.MeshStandardMaterial({ color: '#ff8a3a', emissive: '#ff5a1a', emissiveIntensity: mix(0.6, 2.6, mood.energy) }));
      s.tube([[kx + 0.05, ky + 0.02, kz - 0.03], [kx + 0.14, ky - 0.1, kz - 0.06], [kx + 0.16, ky - 0.5, kz - 0.1], [kx + 0.1, 0.02, kz - 0.2]], 0.005, s.material('#1c1c1c'));
    }

    // Header sign.
    if (a.sign !== 'none') {
      const text = { foot: 'SOLD BY THE FOOT', metre: 'CUT TO LENGTH', ask: 'ASK FOR HELP' }[a.sign];
      const sw = Math.min(W, 1.3);
      s.box([sw + 0.04, 0.2, 0.02], [0, topY + 0.13, rowZ(rows - 1)], frame);
      s.label(text, sw, 0.16, [0, topY + 0.13, rowZ(rows - 1) + 0.012], mood.cheer > 0.5 ? '#b3261e' : '#1d1d1d', mood.cheer > 0.5 ? '#fff1b8' : '#e9e2c9');
    }

    // What was left.
    if (a.waiting === 'order') {
      const ox = -W / 2 + 0.05 - 0.2, oz = 0.72;
      const points: THREE.Vector3[] = [];
      const turns = 3.5;
      for (let i = 0; i <= 44; i++) {
        const t = i / 44, angle = t * turns * Math.PI * 2, r = mix(0.17, 0.11, t);
        points.push(new THREE.Vector3(ox + Math.cos(angle) * r, 0.015 + t * 0.07, oz + Math.sin(angle) * r));
      }
      lay(points, heroStock);
      const tag = s.label(mood.cheer > 0.5 ? 'PAID' : 'HOLD', 0.14, 0.08, [ox + 0.2, 0.045, oz + 0.12], '#1d1d1d', '#e9d9a6');
      tag.rotation.set(-1.2, 0.5, 0);
    } else if (a.waiting === 'measuring') {
      const [hx, hy, hz, hr] = heroAt;
      const y = railY + 0.03 + (heroStock.kind === 'chain' ? 0.01 * heroStock.gauge : 0.004);
      lay([new THREE.Vector3(hx, hy, hz + hr + 0.01), new THREE.Vector3(hx, hy + 0.25, frontZ - 0.12), new THREE.Vector3(hx - 0.02, y + 0.02, frontZ), new THREE.Vector3(hx - 0.3, y, frontZ + 0.02),
        new THREE.Vector3(-W / 2 + 0.2, y, frontZ + 0.02), new THREE.Vector3(-W / 2 + 0.06, y, frontZ + 0.03), new THREE.Vector3(-W / 2 - 0.02, y - 0.12, frontZ + 0.07), new THREE.Vector3(-W / 2 - 0.03, y - 0.3, frontZ + 0.08)], heroStock);
    } else if (a.waiting === 'bucket') {
      const bx = W / 2 + 0.22, bz = 0.55;
      s.lathe([[0, 0], [0.12, 0], [0.15, 0.26], [0.155, 0.27], [0.14, 0.27], [0.11, 0.02]], s.material('#9aa3a6', { metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }), [bx, 0, bz]);
      s.ring(0.15, 0.004, [bx, 0.26, bz], steel, Math.PI).rotation.set(0, 0.6, 0);
      for (let i = 0; i < 5; i++) {
        const stock = [CHAINS, ROPES, WIRES][i % 3][Math.floor(random() * 4)];
        const a0 = random() * 6;
        lay([new THREE.Vector3(bx + Math.cos(a0) * 0.06, 0.16, bz + Math.sin(a0) * 0.06), new THREE.Vector3(bx + Math.cos(a0) * 0.12, 0.29, bz + Math.sin(a0) * 0.12),
          new THREE.Vector3(bx + Math.cos(a0) * 0.19, 0.2, bz + Math.sin(a0) * 0.19), new THREE.Vector3(bx + Math.cos(a0) * 0.2, mix(0.03, 0.12, random()), bz + Math.sin(a0) * 0.2)], stock);
      }
      s.label('FREE', 0.16, 0.08, [bx, 0.14, bz + 0.142], '#b3261e', '#f3ead0').rotation.x = -0.1;
    }

    if (links.length) {
      const link = new THREE.TorusGeometry(0.02, 0.0055, 5, 10);
      link.scale(0.62, 1, 1); link.rotateX(Math.PI / 2); // long axis along z, the direction of travel
      const mesh = new THREE.InstancedMesh(link, new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: a.stock === 'plastic' ? 0 : 0.7, roughness: 0.4 }), links.length);
      links.forEach((item, index) => { mesh.setMatrixAt(index, item.m); mesh.setColorAt(index, item.c); });
      mesh.castShadow = true;
      s.root.add(mesh);
    }

    const sway = mix(0, 0.5, Math.max(0, mood.energy - 0.5));
    return s.finish({
      footprint: W / 2 + 0.2,
      update: (dt, time) => { if (sway) reels.forEach((reel, index) => { reel.rotation.x += Math.sin(time * 0.7 + index) * dt * sway; }); },
    });
  },
});
