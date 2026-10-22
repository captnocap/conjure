import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, matrices: readonly THREE.Matrix4[], colours?: readonly THREE.Color[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, matrices.length));
  mesh.count = matrices.length;
  matrices.forEach((m, i) => {
    mesh.setMatrixAt(i, m);
    if (colours) mesh.setColorAt(i, colours[i]);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A horseshoe on a canvas: the classic red U with pale tips. */
function horseshoe(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, ink = '#d8262a', tip = '#dcdcdc') {
  ctx.lineCap = 'butt';
  ctx.lineWidth = r * 0.55;
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.fillStyle = ink;
    ctx.fillRect(cx + side * r - r * 0.275, cy, r * 0.55, r * 0.7);
    ctx.fillStyle = tip;
    ctx.fillRect(cx + side * r - r * 0.275, cy + r * 0.7, r * 0.55, r * 0.4);
  }
}

const MEDIA = {
  hdd: { size: [0.102, 0.026, 0.147] as P3, colours: ['#c9cdd1', '#2a2c30', '#b8bcc0'] },
  laptop: { size: [0.07, 0.0095, 0.1] as P3, colours: ['#3a3c40', '#5a5d62', '#2a2c30'] },
  tapes: { size: [0.105, 0.021, 0.102] as P3, colours: ['#2b2b2e', '#3a2f2a', '#26323a'] },
  phones: { size: [0.072, 0.008, 0.15] as P3, colours: ['#141416', '#1e1e22', '#3a3a3e'] },
};

export default defineThing({
  questions: {
    wiping: noul('Is a drive in the slot mid-wipe, with the indicator lit?'),
    magnet: choice('What kind of magnet shows through the side window and sits on the filings tray?', {
      bar: 'A red and blue bar magnet, north and south painted on.',
      horseshoe: 'A classic red horseshoe with silver tips.',
      coil: 'A fat copper coil wound on a core, a solenoid.',
    }),
    pile: score('How big is the pile of dead drives?', ['Three in the bottom of the bin', 'A bin half full', 'A bin heaped to the brim', 'Overflowing, drives spilling across the floor']),
    diagram: noul('Is a hand-drawn "magnets, how do they work" field-line diagram taped above it?'),
    media: choice('What is being destroyed?', {
      hdd: 'Silver 3.5-inch hard drives with green circuit boards.',
      laptop: 'Small dark laptop drives.',
      tapes: 'Backup tape cartridges with coloured labels.',
      phones: 'Old phones, black slabs with cracked glass.',
    }),
    decal: choice('What is on the front of the box?', {
      magnet: 'A huge yellow warning triangle with a black horseshoe magnet.',
      pacemaker: 'A red crossed circle: no pacemakers.',
      tally: 'A taped tally sheet of drives wiped, in gates of five.',
      plain: 'Nothing but a model plate.',
    }),
    station: choice('What does it stand on?', {
      bench: 'A steel workbench with a pegboard back.',
      cart: 'A wheeled steel cart with a wire-mesh back.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const BENCH = 0.86, BW = 1.2, BD = 0.6;
    const steel = s.material('#7c8389', { metalness: 0.7, roughness: 0.4 });
    const dark = s.material('#24272b', { roughness: 0.6 });
    const paper = s.material('#f3efe4', { roughness: 0.9 });

    // The bench or cart, with a back panel the diagram can be taped to.
    s.box([BW, 0.05, BD], [0, BENCH - 0.025, 0], a.station === 'bench' ? s.material('#8d8a80', { roughness: 0.7 }) : steel);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.box([0.04, BENCH - 0.05, 0.04], [x * (BW / 2 - 0.04), (BENCH - 0.05) / 2, z * (BD / 2 - 0.04)], steel);
      if (a.station === 'cart') s.ball([0.04, 0.04, 0.04], [x * (BW / 2 - 0.04), 0.04, z * (BD / 2 - 0.04)], dark, 10);
    }
    s.box([BW - 0.1, 0.03, BD - 0.1], [0, 0.22, 0], steel);
    const backH = 0.75;
    if (a.station === 'bench') {
      const pegboard = paint(256, 160, (ctx) => {
        ctx.fillStyle = '#d9c9a2';
        ctx.fillRect(0, 0, 256, 160);
        ctx.fillStyle = '#6a5a3a';
        for (let y = 8; y < 160; y += 12) for (let x = 8; x < 256; x += 12) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); }
      });
      s.mesh(new THREE.BoxGeometry(BW, backH, 0.02), new THREE.MeshStandardMaterial({ map: pegboard, roughness: 0.85 }), [0, BENCH + backH / 2, -BD / 2 + 0.01]);
    } else {
      for (const x of [-1, 1]) s.box([0.03, backH, 0.03], [x * (BW / 2 - 0.04), BENCH + backH / 2, -BD / 2 + 0.015], steel);
      const grid: THREE.Matrix4[] = [];
      for (let i = 0; i < 12; i++) grid.push(new THREE.Matrix4().makeScale(0.004, backH, 0.004).setPosition(-BW / 2 + 0.1 + i * (BW - 0.2) / 11, BENCH + backH / 2, -BD / 2 + 0.015));
      for (let i = 0; i < 8; i++) grid.push(new THREE.Matrix4().makeScale(BW - 0.08, 0.004, 0.004).setPosition(0, BENCH + 0.05 + i * (backH - 0.1) / 7, -BD / 2 + 0.015));
      s.root.add(instanced(new THREE.BoxGeometry(1, 1, 1), steel, grid));
    }

    // The degausser itself: a squat steel box with a top slot, a control panel and a side window.
    const DX = -0.22, DW = 0.5, DH = 0.32, DD = 0.42, DY = BENCH;
    const shell = s.material(mood.warmth > 0.5 ? '#bfb79e' : '#55626f', { metalness: 0.35, roughness: 0.5 });
    s.box([DW - 0.17, DH, DD], [DX - 0.085, DY + DH / 2, 0], shell);
    s.box([DW + 0.02, 0.02, DD + 0.02], [DX, DY + 0.01, 0], dark);
    s.box([0.19, 0.012, 0.05], [DX, DY + DH + 0.004, -0.04], dark);
    s.box([0.17, 0.02, 0.034], [DX, DY + DH - 0.005, -0.04], s.material('#0a0a0c'));
    for (let i = 0; i < 8; i++) s.box([0.004, 0.08, 0.004], [DX - DW / 2 + 0.03 + i * 0.012, DY + DH - 0.07, DD / 2 + 0.002], dark);
    // Control panel with the big button, the indicator and a status label.
    s.box([0.2, 0.1, 0.012], [DX + 0.12, DY + 0.2, DD / 2 + 0.005], dark);
    s.cylinder(0.02, 0.02, 0.014, [DX + 0.07, DY + 0.2, DD / 2 + 0.016], s.material(a.wiping ? '#c8c8c0' : '#2fa84a'), 16).rotation.x = Math.PI / 2;
    const lamp = new THREE.MeshStandardMaterial({ color: a.wiping ? '#ff3a2a' : '#3cff6a', emissive: a.wiping ? '#ff2a1a' : '#2aff5a', emissiveIntensity: 1.6, roughness: 0.3 });
    s.cylinder(0.012, 0.012, 0.012, [DX + 0.13, DY + 0.22, DD / 2 + 0.016], lamp, 12).rotation.x = Math.PI / 2;
    s.label(a.wiping ? 'ERASING' : 'READY', 0.09, 0.026, [DX + 0.15, DY + 0.18, DD / 2 + 0.012], a.wiping ? '#ff6a4a' : '#5aff8a', '#101214');
    s.label('DEGAUSSER 9000', 0.16, 0.026, [DX - 0.1, DY + DH - 0.03, DD / 2 + 0.008], '#d8dce0', '#1c1f23');
    if (a.wiping) {
      const m = MEDIA[a.media];
      const drive = s.box([m.size[0], m.size[2], m.size[1]], [DX, DY + DH + m.size[2] * 0.45 - 0.02, -0.04], s.material(m.colours[0], { metalness: 0.5, roughness: 0.4 }));
      drive.rotation.z = (random() - 0.5) * 0.06;
    }

    // The front decal.
    if (a.decal !== 'plain') {
      const art = paint(256, 256, (ctx) => {
        if (a.decal === 'magnet') {
          ctx.fillStyle = '#f5c518';
          ctx.beginPath(); ctx.moveTo(128, 10); ctx.lineTo(246, 236); ctx.lineTo(10, 236); ctx.closePath(); ctx.fill();
          ctx.lineWidth = 10; ctx.strokeStyle = '#111'; ctx.stroke();
          horseshoe(ctx, 128, 130, 42, '#111', '#f5c518');
        } else if (a.decal === 'pacemaker') {
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(128, 128, 112, 0, 7); ctx.fill();
          ctx.fillStyle = '#333'; ctx.beginPath(); ctx.roundRect(88, 96, 80, 60, 18); ctx.fill();
          ctx.strokeStyle = '#333'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(150, 100); ctx.lineTo(176, 70); ctx.lineTo(186, 84); ctx.stroke();
          ctx.strokeStyle = '#d8262a'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(128, 128, 104, 0, 7); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(56, 56); ctx.lineTo(200, 200); ctx.stroke();
        } else {
          ctx.fillStyle = '#f6f2e6'; ctx.fillRect(0, 0, 256, 256);
          ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.font = 'bold 22px monospace'; ctx.fillStyle = '#2a2a30'; ctx.textAlign = 'center'; ctx.fillText('WIPED', 128, 30);
          for (let row = 0; row < 6; row++) for (let gate = 0; gate < 4; gate++) {
            if (random() < 0.15 && row > 2) continue;
            const x = 24 + gate * 56, y = 54 + row * 32;
            for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + k * 9, y); ctx.lineTo(x + k * 9 + (random() - 0.5) * 3, y + 22); ctx.stroke(); }
            ctx.beginPath(); ctx.moveTo(x - 4, y + 18); ctx.lineTo(x + 34, y + 4); ctx.stroke();
          }
        }
      });
      const size = a.decal === 'tally' ? 0.14 : 0.17;
      s.mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: art, transparent: a.decal !== 'tally', roughness: 0.6 }), [DX - 0.13, DY + 0.16, DD / 2 + 0.003]);
    }

    // The side window onto the magnet, and the same magnet in small on the filings tray.
    const red = s.material('#d8262a', { roughness: 0.4 }), blue = s.material('#2a4fd8', { roughness: 0.4 }), copper = s.material('#c8782e', { metalness: 0.8, roughness: 0.3 }), tipMat = s.material('#d8dadc', { metalness: 0.7, roughness: 0.3 });
    const magnetAt = (cx: number, cy: number, cz: number, size: number, flat: boolean) => {
      if (a.magnet === 'bar') {
        s.box([size, size * 0.26, size * 0.26], [cx - size / 4, cy, cz], red).scale.x = 0.5;
        s.box([size, size * 0.26, size * 0.26], [cx + size / 4, cy, cz], blue).scale.x = 0.5;
      } else if (a.magnet === 'horseshoe') {
        const arc = s.ring(size * 0.34, size * 0.1, [cx, cy, cz], red, Math.PI);
        if (flat) { arc.rotation.x = -Math.PI / 2; arc.rotation.z = Math.PI; }
        for (const side of [-1, 1]) {
          const leg = flat ? s.box([size * 0.2, size * 0.2, size * 0.3], [cx + side * size * 0.34, cy, cz + size * 0.15], red) : s.box([size * 0.2, size * 0.3, size * 0.2], [cx + side * size * 0.34, cy - size * 0.15, cz], red);
          void leg;
          if (flat) s.box([size * 0.2, size * 0.2, size * 0.14], [cx + side * size * 0.34, cy, cz + size * 0.37], tipMat);
          else s.box([size * 0.2, size * 0.14, size * 0.2], [cx + side * size * 0.34, cy - size * 0.37, cz], tipMat);
        }
      } else {
        const coil = s.cylinder(size * 0.17, size * 0.17, size * 0.9, [cx, cy, cz], copper, 16);
        coil.rotation.z = Math.PI / 2;
        const turns: THREE.Matrix4[] = [];
        for (let i = 0; i < 14; i++) turns.push(new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(cx - size * 0.42 + i * size * 0.064, cy, cz));
        s.root.add(instanced(new THREE.TorusGeometry(size * 0.185, size * 0.022, 6, 20), s.material('#e0944a', { metalness: 0.8, roughness: 0.3 }), turns));
        s.cylinder(size * 0.08, size * 0.08, size * 1.1, [cx, cy, cz], dark, 10).rotation.z = Math.PI / 2;
      }
    };
    // A glass-fronted bay on the right end of the box shows the magnet inside.
    const BAY = 0.17, bayX = DX + DW / 2 - BAY / 2;
    s.box([0.006, DH - 0.03, DD - 0.03], [DX + DW / 2 - BAY + 0.003, DY + DH / 2, 0], s.material('#e9e9e4', { roughness: 0.8 }));
    s.box([BAY, 0.012, DD], [bayX, DY + DH - 0.006, 0], shell);
    s.box([BAY, 0.012, DD], [bayX, DY + 0.006, 0], shell);
    for (const z of [-1, 1]) s.box([BAY, DH, 0.012], [bayX, DY + DH / 2, z * (DD / 2 - 0.006)], shell);
    magnetAt(bayX - 0.01, DY + DH / 2, 0, 0.13, false);
    s.mesh(new THREE.BoxGeometry(0.003, DH - 0.024, DD - 0.024), new THREE.MeshPhysicalMaterial({ color: '#dfe8ff', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false }), [DX + DW / 2 - 0.002, DY + DH / 2, 0]);

    // The filings tray: a magnet in the middle, iron filings combed along its field.
    const TX = 0.4, TZ = 0.08, TW = 0.4, TD = 0.3;
    s.box([TW, 0.012, TD], [TX, BENCH + 0.006, TZ], s.material('#f1f1ec', { roughness: 0.7 }));
    for (const x of [-1, 1]) s.box([0.012, 0.03, TD], [TX + x * (TW / 2 - 0.006), BENCH + 0.015, TZ], s.material('#e2e2dc'));
    for (const z of [-1, 1]) s.box([TW, 0.03, 0.012], [TX, BENCH + 0.015, TZ + z * (TD / 2 - 0.006)], s.material('#e2e2dc'));
    magnetAt(TX, BENCH + 0.024, TZ, 0.08, true);
    const poles = a.magnet === 'horseshoe'
      ? [{ x: -0.027, z: 0.03, q: 1 }, { x: 0.027, z: 0.03, q: -1 }]
      : [{ x: -0.036, z: 0, q: -1 }, { x: 0.036, z: 0, q: 1 }];
    const filings: THREE.Matrix4[] = [];
    const filing = new THREE.BoxGeometry(0.011, 0.002, 0.002);
    const n = Math.round(mix(1100, 1800, mood.density));
    for (let i = 0; i < n; i++) {
      const px = (random() - 0.5) * (TW - 0.03), pz = (random() - 0.5) * (TD - 0.03);
      if (Math.abs(px) < 0.045 && Math.abs(pz) < 0.045 && a.magnet !== 'horseshoe') continue;
      if (a.magnet === 'horseshoe' && Math.abs(px) < 0.04 && pz > -0.04 && pz < 0.045) continue;
      let bx = 0, bz = 0;
      for (const pole of poles) {
        const dx = px - pole.x, dz = pz - pole.z, r = Math.hypot(dx, dz) + 1e-4;
        bx += pole.q * dx / (r * r * r);
        bz += pole.q * dz / (r * r * r);
      }
      const strength = Math.hypot(bx, bz);
      if (random() > Math.min(1, strength * 0.0025 + 0.35)) continue;
      const angle = Math.atan2(bz, bx) + (random() - 0.5) * 0.25;
      filings.push(new THREE.Matrix4().makeRotationY(-angle).setPosition(TX + px, BENCH + 0.0135, TZ + pz));
    }
    s.root.add(instanced(filing, s.material('#2a2a2e', { metalness: 0.6, roughness: 0.5 }), filings));

    // The bin of dead drives.
    const m = MEDIA[a.media];
    const BX = 0.44, BZ = 0.5, binW = 0.44, binD = 0.34, binH = 0.2;
    const crate = s.material('#9aa0a8', { roughness: 0.6 });
    s.box([binW, 0.015, binD], [BX, 0.0075, BZ], crate);
    for (const x of [-1, 1]) s.box([0.012, binH, binD], [BX + x * (binW / 2 - 0.006), binH / 2, BZ], crate);
    for (const z of [-1, 1]) s.box([binW, binH, 0.012], [BX, binH / 2, BZ + z * (binD / 2 - 0.006)], crate);
    const driveGeometry = new THREE.BoxGeometry(...m.size);
    const drives: THREE.Matrix4[] = [], colours: THREE.Color[] = [];
    const inside = Math.round(mix(3, 40, a.pile));
    const spilled = a.pile > 0.7 ? Math.round(((a.pile - 0.7) / 0.3) * 16) : 0;
    const q = new THREE.Quaternion(), e = new THREE.Euler();
    const cols = Math.max(1, Math.floor((binW - 0.04) / (m.size[0] + 0.01))), rows = Math.max(1, Math.floor((binD - 0.04) / (m.size[2] + 0.01)));
    const perLayer = cols * rows;
    const layers = Math.max(1, Math.ceil(inside / perLayer));
    const step = Math.max(m.size[1] + 0.012, (mix(0.07, binH + 0.06, a.pile) - 0.03) / layers);
    for (let i = 0; i < inside; i++) {
      const layer = Math.floor(i / perLayer), k = i % perLayer;
      const y = 0.015 + m.size[1] / 2 + layer * step;
      const heaped = y > binH - 0.01;
      e.set((random() - 0.5) * (heaped ? 0.7 : 0.16), (random() - 0.5) * (heaped ? 2 : 0.4), (random() - 0.5) * (heaped ? 0.6 : 0.12));
      q.setFromEuler(e);
      const px = BX - (binW - 0.04) / 2 + (k % cols + 0.5) * (m.size[0] + 0.01) + (random() - 0.5) * 0.012;
      const pz = BZ - (binD - 0.04) / 2 + (Math.floor(k / cols) + 0.5) * (m.size[2] + 0.01) + (random() - 0.5) * 0.012;
      drives.push(new THREE.Matrix4().compose(new THREE.Vector3(px, Math.min(y, binH + 0.03 + (random() - 0.5) * 0.04), pz), q, new THREE.Vector3(1, 1, 1)));
      colours.push(new THREE.Color(m.colours[Math.floor(random() * m.colours.length)]));
    }
    for (let i = 0; i < spilled; i++) {
      e.set((random() - 0.5) * 0.3, random() * Math.PI * 2, (random() - 0.5) * 0.3);
      q.setFromEuler(e);
      const angle = random() * Math.PI * 2, reach = 0.28 + random() * 0.3;
      const px = BX + Math.cos(angle) * reach, pz = Math.max(-0.1, BZ + Math.sin(angle) * reach);
      drives.push(new THREE.Matrix4().compose(new THREE.Vector3(px, m.size[1] / 2 + 0.01, pz), q, new THREE.Vector3(1, 1, 1)));
      colours.push(new THREE.Color(m.colours[Math.floor(random() * m.colours.length)]));
    }
    s.root.add(instanced(driveGeometry, s.material('#ffffff', { metalness: a.media === 'hdd' ? 0.6 : 0.2, roughness: 0.45 }), drives, colours));
    {
      // A label or screen on each piece so the pile reads as media and not bricks.
      const stripes: THREE.Matrix4[] = [], tints: THREE.Color[] = [];
      drives.forEach((d) => {
        stripes.push(d.clone().multiply(new THREE.Matrix4().makeScale(m.size[0] * (a.media === 'phones' ? 0.86 : 0.7), 0.002, m.size[2] * (a.media === 'phones' ? 0.9 : 0.45)).setPosition(0, m.size[1] / 2 + 0.001, a.media === 'phones' ? 0 : -m.size[2] * 0.1)));
        tints.push(new THREE.Color(a.media === 'tapes' ? ['#e8d13a', '#3a9ae8', '#e85a3a', '#f0f0ea'][Math.floor(random() * 4)] : a.media === 'phones' ? '#4a5a6a' : '#eceae0'));
      });
      s.root.add(instanced(new THREE.BoxGeometry(1, 1, 1), s.material('#ffffff', { roughness: 0.8 }), stripes, tints));
    }

    // The diagram taped to the back panel.
    if (a.diagram) {
      const art = paint(320, 240, (ctx) => {
        ctx.fillStyle = '#f7f3e8';
        ctx.fillRect(0, 0, 320, 240);
        ctx.fillStyle = '#2a2a30';
        ctx.font = 'bold 26px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MAGNETS', 160, 34);
        ctx.font = '18px monospace';
        ctx.fillText('how do they work?', 160, 58);
        ctx.fillStyle = '#d8262a'; ctx.fillRect(100, 128, 60, 26);
        ctx.fillStyle = '#2a4fd8'; ctx.fillRect(160, 128, 60, 26);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.fillText('S', 130, 147); ctx.fillText('N', 190, 147);
        ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 1.5;
        for (let k = 1; k <= 5; k++) {
          ctx.beginPath();
          ctx.ellipse(160, 141, 60 + k * 18, 14 + k * 16, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(230, 141); ctx.lineTo(290, 141); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(90, 141); ctx.lineTo(30, 141); ctx.stroke();
        ctx.font = '13px monospace'; ctx.fillStyle = '#5a5a60';
        ctx.fillText('field lines  (???)', 160, 222);
      });
      const sheet = s.mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshStandardMaterial({ map: art, roughness: 0.9 }), [DX + 0.02, BENCH + 0.5, -BD / 2 + 0.024]);
      sheet.rotation.z = (random() - 0.5) * 0.1;
      const tape = new THREE.MeshStandardMaterial({ color: '#f0e8c8', transparent: true, opacity: 0.6, roughness: 0.5, depthWrite: false });
      for (const [x, y] of [[-0.18, 0.14], [0.18, 0.14], [-0.18, -0.14], [0.18, -0.14]]) s.mesh(new THREE.PlaneGeometry(0.05, 0.02), tape, [DX + 0.02 + x, BENCH + 0.5 + y, -BD / 2 + 0.026]).rotation.z = 0.6 * (x < 0 ? 1 : -1);
    }
    // A couple of sticky notes and a clipboard for the bench.
    s.mesh(new THREE.PlaneGeometry(0.07, 0.07), s.material('#f5e46a', { roughness: 0.9 }), [DX + 0.32, BENCH + 0.33, -BD / 2 + 0.024]).rotation.z = 0.1;
    s.box([0.22, 0.012, 0.3], [-0.45, BENCH + 0.006, 0.12], s.material('#5a4a3a'));
    s.box([0.2, 0.004, 0.27], [-0.45, BENCH + 0.014, 0.12], paper);

    const pulse = mix(0.3, 3, mood.energy);
    return s.finish({
      update(_dt, time) {
        if (a.wiping) lamp.emissiveIntensity = 1.2 + Math.sin(time * pulse * 2) * 0.8;
      },
    });
  },
});
