import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A point charge pair or dipole field in the plane of the plate, in plate-local metres. */
type Pole = { x: number; z: number; q: number };

function fieldAt(poles: readonly Pole[], x: number, z: number) {
  let bx = 0, bz = 0;
  for (const pole of poles) {
    const dx = x - pole.x, dz = z - pole.z;
    const r2 = dx * dx + dz * dz + 0.0004;
    const r3 = r2 * Math.sqrt(r2);
    bx += (pole.q * dx) / r3;
    bz += (pole.q * dz) / r3;
  }
  return { bx, bz, strength: Math.hypot(bx, bz) };
}

export default defineThing({
  questions: {
    magnet: choice('What kind of magnet lies on the plate?', {
      bar: 'A red and blue painted bar magnet, N and S lettered on the ends.',
      horseshoe: 'A classic red horseshoe magnet with silver tips.',
      ring: 'A dark grey ring magnet lying flat.',
      pair: 'Two bar magnets end to end, like poles repelling, the filings pushed apart between them.',
    }),
    filings: score('How many filings are there?', ['A sparse sprinkle', 'Enough to show the lines', 'Dense, lines everywhere', 'Heaped, bristling at the poles']),
    plate: choice('What are the filings on?', {
      dish: 'A round white enamel dish with a dark rim.',
      tray: 'A rectangular white plastic tray.',
      paper: 'A sheet of white card laid flat.',
      glass: 'A pane of glass over a black cloth, the filings bright on dark.',
    }),
    chalk: choice('What is chalked on the slate beside it?', {
      lines: 'A bar magnet with looping field lines and N and S.',
      equation: 'An equation, F = qv x B, with arrows.',
      question: 'The scrawled words HOW DO THEY WORK with a question mark.',
      none: 'No slate beside it.',
    }),
    compass: noul('Is a small compass placed at the edge of the field?'),
    spill: noul('Have some filings spilled off the plate onto the table?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { random } = context;
    const dark = s.material('#2a2c30', { roughness: 0.6 });
    const red = s.material('#d8262a', { roughness: 0.45 });
    const blue = s.material('#2a4fb8', { roughness: 0.45 });
    const silver = s.material('#c9ccd0', { metalness: 0.7, roughness: 0.3 });
    const ironColour = a.plate === 'glass' ? '#9a9ea6' : '#3a3c42';
    const iron = s.material(ironColour, { metalness: 0.5, roughness: 0.5 });

    // The plate.
    let plateTop = 0.012;
    let plateR = 0.24;
    const plateColour = s.material('#f1f0ea', { roughness: 0.85 });
    if (a.plate === 'dish') {
      s.lathe([[0, 0], [0.22, 0], [0.25, 0.02], [0.255, 0.028]], plateColour, [0, 0, 0]);
      s.ring(0.252, 0.006, [0, 0.028, 0], dark).rotation.x = Math.PI / 2;
      plateTop = 0.004;
      plateR = 0.22;
    } else if (a.plate === 'tray') {
      s.box([0.56, 0.012, 0.42], [0, 0.006, 0], plateColour);
      s.box([0.56, 0.02, 0.012], [0, 0.016, -0.204], plateColour);
      s.box([0.56, 0.02, 0.012], [0, 0.016, 0.204], plateColour);
      s.box([0.012, 0.02, 0.42], [-0.274, 0.016, 0], plateColour);
      s.box([0.012, 0.02, 0.42], [0.274, 0.016, 0], plateColour);
      plateR = 0.22;
    } else if (a.plate === 'paper') {
      s.box([0.5, 0.004, 0.38], [0, 0.002, 0], s.material('#f7f5ee', { roughness: 0.95 }));
      plateTop = 0.004;
      plateR = 0.2;
    } else {
      s.box([0.52, 0.006, 0.4], [0, 0.003, 0], s.material('#1a1a1e', { roughness: 0.95 }));
      s.box([0.5, 0.008, 0.38], [0, 0.01, 0], new THREE.MeshPhysicalMaterial({ color: '#cfe4ea', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }));
      plateTop = 0.014;
      plateR = 0.2;
    }

    // The magnet and its poles.
    const poles: Pole[] = [];
    const magnetY = plateTop;
    if (a.magnet === 'bar' || a.magnet === 'pair') {
      const bar = (cx: number, flip: boolean) => {
        const n = flip ? blue : red, so = flip ? red : blue;
        s.box([0.065, 0.022, 0.024], [cx - 0.0325, magnetY + 0.011, 0], n);
        s.box([0.065, 0.022, 0.024], [cx + 0.0325, magnetY + 0.011, 0], so);
        s.label(flip ? 'S' : 'N', 0.02, 0.016, [cx - 0.04, magnetY + 0.0225, 0], '#ffffff', flip ? '#2a4fb8' : '#d8262a').rotation.x = -Math.PI / 2;
        s.label(flip ? 'N' : 'S', 0.02, 0.016, [cx + 0.04, magnetY + 0.0225, 0], '#ffffff', flip ? '#d8262a' : '#2a4fb8').rotation.x = -Math.PI / 2;
        poles.push({ x: cx - 0.055, z: 0, q: flip ? -1 : 1 }, { x: cx + 0.055, z: 0, q: flip ? 1 : -1 });
      };
      if (a.magnet === 'bar') bar(0, false);
      else { bar(-0.095, false); bar(0.095, true); }
    } else if (a.magnet === 'horseshoe') {
      const g = new THREE.Group();
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 10, 28, Math.PI), red);
      arch.rotation.x = Math.PI / 2;
      arch.rotation.z = Math.PI / 2;
      g.add(arch);
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, 0.07), red);
        leg.position.set(side * 0.07, 0, 0.035);
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, 0.035), silver);
        tip.position.set(side * 0.07, 0, 0.0875);
        g.add(leg, tip);
      }
      g.traverse((node) => { node.castShadow = true; });
      g.position.set(0, magnetY + 0.016, -0.04);
      s.root.add(g);
      poles.push({ x: -0.07, z: 0.06, q: 1 }, { x: 0.07, z: 0.06, q: -1 });
    } else {
      const ringMagnet = s.ring(0.045, 0.014, [0, magnetY + 0.014, 0], s.material('#3a3c40', { metalness: 0.4, roughness: 0.45 }));
      ringMagnet.rotation.x = Math.PI / 2;
      s.label('N', 0.03, 0.02, [0, magnetY + 0.029, -0.045], '#ffffff', '#3a3c40').rotation.x = -Math.PI / 2;
      poles.push({ x: 0, z: 0, q: 1.6 }, { x: 0, z: 0.0001, q: -0.1 });
      for (let i = 0; i < 8; i++) poles.push({ x: Math.sin(i * 0.785) * 0.045, z: Math.cos(i * 0.785) * 0.045, q: -0.2 });
    }

    // Filings: one instanced mesh of little rods laid or stood along the field.
    const count = Math.round(mix(350, 2600, a.filings));
    const rodGeometry = new THREE.BoxGeometry(0.0035, 0.0035, 0.014);
    const filings = new THREE.InstancedMesh(rodGeometry, iron, count + 80);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 0, 1);
    const magnetClear = a.magnet === 'ring' ? 0.062 : a.magnet === 'horseshoe' ? 0.095 : a.magnet === 'pair' ? 0.16 : 0.075;
    let placed = 0;
    for (let i = 0; i < count * 3 && placed < count; i++) {
      const rx = (random() - 0.5) * 2 * plateR * (a.plate === 'dish' ? 0.95 : 1.15);
      const rz = (random() - 0.5) * 2 * plateR * (a.plate === 'dish' ? 0.95 : 0.85);
      if (a.plate === 'dish' && Math.hypot(rx, rz) > plateR * 0.95) continue;
      if (Math.abs(rx) < magnetClear && Math.abs(rz) < 0.02 && a.magnet !== 'ring') continue;
      if (a.magnet === 'ring' && Math.hypot(rx, rz) < 0.062) continue;
      if (a.magnet === 'horseshoe' && Math.abs(rx) < 0.095 && rz > -0.13 && rz < 0.075) continue;
      const field = fieldAt(poles, rx, rz);
      // The filings cluster where the field is strong: thin out the weak far field.
      const keep = Math.min(1, field.strength / 90);
      if (random() > keep * 0.7 + 0.3) continue;
      const dir = new THREE.Vector3(field.bx, 0, field.bz).normalize();
      const stand = Math.min(0.9, field.strength / 400) * (0.5 + random() * 0.5);
      dir.y = stand;
      dir.normalize();
      q.setFromUnitVectors(up, dir);
      const length = 0.6 + random() * 0.8;
      m.compose(new THREE.Vector3(rx, plateTop + 0.002 + stand * 0.006, rz), q, new THREE.Vector3(1, 1, length));
      filings.setMatrixAt(placed++, m);
    }
    if (a.spill) {
      for (let i = 0; i < 80 && placed < count + 80; i++) {
        const angle = random() * Math.PI * 2;
        const r = plateR * 1.2 + random() * 0.12;
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI);
        m.compose(new THREE.Vector3(Math.sin(angle) * r * 1.2, 0.002, Math.cos(angle) * r * 0.8), q, new THREE.Vector3(1, 1, 0.8));
        filings.setMatrixAt(placed++, m);
      }
    }
    filings.count = placed;
    filings.instanceMatrix.needsUpdate = true;
    filings.castShadow = filings.receiveShadow = true;
    filings.frustumCulled = false;
    s.root.add(filings);

    // The chalked slate beside the plate.
    if (a.chalk !== 'none') {
      const texture = paint(512, 384, (ctx) => {
        ctx.fillStyle = '#2f3a36';
        ctx.fillRect(0, 0, 512, 384);
        ctx.strokeStyle = '#e8e6da';
        ctx.fillStyle = '#e8e6da';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        if (a.chalk === 'lines') {
          ctx.strokeRect(176, 172, 160, 40);
          ctx.font = 'bold 30px monospace';
          ctx.fillText('N', 196, 203);
          ctx.fillText('S', 300, 203);
          for (const k of [0.5, 0.8, 1.1, 1.4]) {
            ctx.beginPath();
            ctx.ellipse(256, 192, 110 * k, 70 * k, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.font = '22px monospace';
          ctx.fillText('field lines', 190, 360);
        } else if (a.chalk === 'equation') {
          ctx.font = 'bold 54px monospace';
          ctx.fillText('F = q v x B', 90, 150);
          ctx.font = '30px monospace';
          ctx.fillText('B = u0 I / 2 pi r', 110, 230);
          ctx.beginPath(); ctx.moveTo(100, 300); ctx.lineTo(400, 300); ctx.lineTo(380, 288); ctx.moveTo(400, 300); ctx.lineTo(380, 312); ctx.stroke();
          ctx.fillText('v', 240, 290);
        } else {
          ctx.font = 'bold 60px monospace';
          ctx.fillText('HOW DO', 100, 140);
          ctx.fillText('THEY', 150, 215);
          ctx.fillText('WORK ?', 110, 290);
          ctx.beginPath(); ctx.moveTo(60, 330); ctx.lineTo(450, 340); ctx.stroke();
        }
      });
      const slateW = 0.3, slateD = 0.225;
      const slate = s.mesh(new THREE.BoxGeometry(slateW, 0.012, slateD), [new THREE.MeshStandardMaterial({ color: '#4a3a30' }), new THREE.MeshStandardMaterial({ color: '#4a3a30' }), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 }), new THREE.MeshStandardMaterial({ color: '#4a3a30' }), new THREE.MeshStandardMaterial({ color: '#4a3a30' }), new THREE.MeshStandardMaterial({ color: '#4a3a30' })] as unknown as THREE.Material, [plateR + 0.26, 0.006, 0.06]);
      slate.rotation.y = -0.25;
      const chalk = s.cylinder(0.005, 0.005, 0.05, [plateR + 0.22, 0.017, 0.2], s.material('#f0eee6', { roughness: 0.95 }), 8);
      chalk.rotation.set(Math.PI / 2, 0, 0.5);
    }
    if (a.compass) {
      const cx = -plateR - 0.09, cz = 0.1;
      s.cylinder(0.035, 0.035, 0.014, [cx, 0.007, cz], s.material('#b8a070', { metalness: 0.6, roughness: 0.35 }), 20);
      s.cylinder(0.03, 0.03, 0.004, [cx, 0.015, cz], s.material('#f4f2ea'), 20);
      const field = fieldAt(poles, cx, cz);
      const angle = Math.atan2(field.bx, field.bz);
      const needle = new THREE.Group();
      needle.position.set(cx, 0.019, cz);
      needle.rotation.y = angle;
      const north = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.002, 0.024), red);
      north.position.z = 0.012;
      const south = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.002, 0.024), s.material('#e8e8e8'));
      south.position.z = -0.012;
      needle.add(north, south);
      s.root.add(needle);
    }

    return s.finish();
  },
});
