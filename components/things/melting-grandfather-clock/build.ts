import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const FACES = {
  none: 'A blank dial with numerals and no hands at all.',
  many: 'Far too many hands, nine or ten, pointing everywhere at once.',
  backwards: 'Numerals running anticlockwise: it is going backwards.',
  slid: 'The numerals have slid down into a heap at the bottom of the dial.',
  thirteen: 'Thirteen hours on the dial, the hands at the extra one.',
  late: 'An ordinary dial showing the exact minute you were supposed to be there.',
} as const;
const WOODS = {
  walnut: 'Dark walnut.', mahogany: 'Red polished mahogany.', painted: 'Chalky white paint.',
  lacquer: 'Black lacquer with gilt edges.', pine: 'Pale honey pine.', wax: 'Ivory candle wax, as if it were always a candle.',
} as const;
const WOOD_TINT: Record<keyof typeof WOODS, string> = { walnut: '#5a3a26', mahogany: '#8a3324', painted: '#e6e0d0', lacquer: '#26221f', pine: '#c79a5c', wax: '#efe3c2' };

export default defineThing({
  questions: {
    melt: score('How far has the clock melted?', ['Only softening and leaning', 'Slumped well over', 'Draped over the edge of the step', 'Hanging down, nearly a puddle']),
    face: choice('What does its face read?', FACES),
    wood: choice('What is the case made of?', WOODS),
    hood: choice('What crowns the hood?', {
      flat: 'A plain flat cornice.',
      swan: 'A swan-neck scroll pediment with three ball finials.',
      dome: 'A rounded arch top.',
      spire: 'A pointed gothic spire.',
    }),
    bob: choice('What swings on the end of the pendulum?', {
      disc: 'A polished brass disc.', moon: 'A crescent moon.', key: 'A large old key.', eye: 'A staring eye.', none: 'Nothing: a bare rod ticking in the air.',
    }),
    step: choice('What is it melting over the edge of?', {
      stone: 'A pale stone stair.', carpet: 'A stair with a red carpet runner.', wood: 'A dark wooden landing.', books: 'A leaning stack of huge books.',
    }),
    left: choice('What has it shed onto the step below?', {
      puddle: 'A spreading puddle of its own wax.',
      numerals: 'Numerals fallen off the dial, lying like dropped coins.',
      cogs: 'Brass cogs and a spring spilled from inside.',
      nothing: 'Nothing yet.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const melt = a.melt;
    const wood = s.material(WOOD_TINT[a.wood], { roughness: a.wood === 'painted' ? 0.8 : 0.35 });
    const trim = s.material(new THREE.Color(WOOD_TINT[a.wood]).multiplyScalar(a.wood === 'lacquer' ? 2.2 : 0.7), { roughness: 0.4 });
    const brass = s.material(a.wood === 'lacquer' ? '#d9b65a' : '#c9a24a', { metalness: 0.85, roughness: 0.28 });
    const dark = s.material('#1f1b18');

    // The steps: an upper tread the clock stands on and a lower one it droops toward (+x).
    const stepH = 0.5, lowH = 0.22;
    if (a.step === 'books') {
      const covers = ['#7a2f2a', '#2f4f6a', '#5d6b3a', '#8a6a2f', '#4a3560', '#2d2d2d'];
      let y = 0;
      for (let i = 0; y < stepH - 0.01; i++) {
        const h = Math.min(0.07 + random() * 0.07, stepH - y);
        const book = s.box([0.78 + random() * 0.1, h, 0.72 + random() * 0.12], [-0.1 + (random() - 0.5) * 0.06, y + h / 2, (random() - 0.5) * 0.05], s.material(covers[i % covers.length]));
        book.rotation.y = (random() - 0.5) * 0.25;
        s.box([0.72, h * 0.72, 0.02], [-0.1, y + h / 2, 0.36], s.material('#efe8d2')).rotation.y = book.rotation.y;
        y += h;
      }
      s.box([1.25, 0.1, 0.95], [0.85, 0.05, 0], s.material('#7a2f2a')).rotation.y = 0.1;
      s.box([1.2, 0.12, 0.9], [0.88, 0.16, 0], s.material('#2f4f6a')).rotation.y = -0.08;
    } else {
      const stepMat = s.material({ stone: '#d9d4c6', carpet: '#cfc8b8', wood: '#5b4332' }[a.step]);
      s.box([0.8, stepH, 0.9], [-0.1, stepH / 2, 0], stepMat);
      s.box([1.2, lowH, 0.9], [0.9, lowH / 2, 0], stepMat);
      s.box([0.84, 0.035, 0.94], [-0.1, stepH - 0.0175, 0], stepMat);
      if (a.step === 'carpet') {
        const runner = s.material('#9c2b2e', { roughness: 1 });
        s.box([0.845, 0.02, 0.55], [-0.1, stepH + 0.008, 0], runner);
        s.box([0.02, stepH - lowH, 0.55], [0.325, (stepH + lowH) / 2, 0], runner);
        s.box([1.2, 0.02, 0.55], [0.9, lowH + 0.008, 0], runner);
        s.rod([0.33, lowH + 0.03, -0.33], [0.33, lowH + 0.03, 0.33], 0.012, brass);
      }
    }

    // The clock is built straight, then every vertex is bent along a softening spine.
    const clock = new THREE.Group();
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, rx = 0, rz = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); mesh.rotation.set(rx, 0, rz);
      mesh.castShadow = mesh.receiveShadow = true; clock.add(mesh);
      return mesh;
    };
    const slab = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) =>
      part(new THREE.BoxGeometry(w, h, d, Math.max(1, Math.ceil(w / 0.1)), Math.max(1, Math.ceil(h / 0.04)), 1), material, x, y, z);
    // Plinth, trunk with a glazed door, hood with columns.
    slab(0.5, 0.34, 0.3, wood, 0, 0.17, 0); slab(0.54, 0.05, 0.33, trim, 0, 0.025, 0); slab(0.53, 0.04, 0.32, trim, 0, 0.35, 0);
    slab(0.36, 1.02, 0.23, wood, 0, 0.86, 0);
    slab(0.24, 0.8, 0.02, trim, 0, 0.86, 0.115);
    slab(0.15, 0.6, 0.02, dark, 0, 0.9, 0.12);
    slab(0.52, 0.045, 0.31, trim, 0, 1.39, 0);
    slab(0.48, 0.5, 0.28, wood, 0, 1.66, 0);
    for (const x of [-1, 1]) part(new THREE.CylinderGeometry(0.022, 0.026, 0.46, 10, 12), trim, x * 0.215, 1.66, 0.145);
    slab(0.56, 0.05, 0.33, trim, 0, 1.935, 0);
    let top = 1.96;
    if (a.hood === 'swan') {
      for (const x of [-1, 1]) part(new THREE.TorusGeometry(0.11, 0.035, 8, 20, Math.PI), wood, x * 0.14, top, 0.08);
      slab(0.5, 0.1, 0.1, wood, 0, top + 0.05, -0.05);
      for (const x of [-0.24, 0, 0.24]) { part(new THREE.SphereGeometry(0.04, 12, 10), brass, x, top + (x ? 0.06 : 0.19), 0.08); part(new THREE.CylinderGeometry(0.012, 0.02, 0.08, 8), brass, x, top + (x ? 0.02 : 0.13), 0.08); }
      top += 0.23;
    } else if (a.hood === 'dome') {
      part(new THREE.CylinderGeometry(0.25, 0.25, 0.3, 24, 1, false, -Math.PI / 2, Math.PI), wood, 0, top, 0, Math.PI / 2);
      top += 0.25;
    } else if (a.hood === 'spire') {
      const cone = part(new THREE.ConeGeometry(0.33, 0.42, 4, 8), wood, 0, top + 0.21, 0); cone.geometry.rotateY(Math.PI / 4); cone.scale.z = 0.62;
      part(new THREE.SphereGeometry(0.035, 10, 8), brass, 0, top + 0.44, 0);
      top += 0.47;
    }

    // The dial.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f3ecd6'; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#b08f3c'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(128, 128, 120, 0, 7); ctx.stroke();
    ctx.fillStyle = '#1e1a16'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 30px serif';
    const hours = a.face === 'thirteen' ? 13 : 12;
    for (let n = 1; n <= hours; n++) {
      const turn = (n / hours) * Math.PI * 2 * (a.face === 'backwards' ? -1 : 1);
      let x = 128 + Math.sin(turn) * 92, y = 128 - Math.cos(turn) * 92;
      if (a.face === 'slid') { x = 128 + (random() - 0.5) * 130; y = 190 + random() * 36 - Math.abs(x - 128) * 0.3; }
      ctx.save(); ctx.translate(x, y); if (a.face === 'slid') ctx.rotate((random() - 0.5) * 2.4);
      if (n === 13) ctx.fillStyle = '#a3241f';
      ctx.fillText(String(n), 0, 0); ctx.restore();
    }
    const hand = (turn: number, length: number, width: number, colour = '#1e1a16') => {
      ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128 + Math.sin(turn) * length, 128 - Math.cos(turn) * length); ctx.stroke();
    };
    if (a.face === 'many') for (let i = 0; i < 10; i++) hand(random() * 7, 45 + random() * 55, 4 + random() * 5);
    else if (a.face === 'thirteen') { hand(Math.PI * 2 * 12 / 13 + 0.48, 60, 9); hand(0, 95, 5); }
    else if (a.face === 'late') { hand(Math.PI * 2 * (8.95 / 12), 58, 9); hand(Math.PI * 2 * (57 / 60), 95, 5, '#a3241f'); }
    else if (a.face === 'backwards') { hand(-1.1, 58, 9); hand(-4.2, 95, 5); ctx.strokeStyle = '#a3241f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(128, 128, 30, 3.6, 5.8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(100, 113); ctx.lineTo(92, 128); ctx.lineTo(110, 124); ctx.fillStyle = '#a3241f'; ctx.fill(); }
    else if (a.face === 'slid') { hand(2.6, 58, 9); hand(3.5, 80, 5); }
    ctx.fillStyle = '#b08f3c'; ctx.beginPath(); ctx.arc(128, 128, 9, 0, 7); ctx.fill();
    const dial = new THREE.CanvasTexture(canvas);
    dial.colorSpace = THREE.SRGBColorSpace;
    part(new THREE.CircleGeometry(0.19, 40), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.6, emissive: '#fff4d0', emissiveMap: dial, emissiveIntensity: mix(0.05, 0.3, mood.cheer) }), 0, 1.68, 0.146);
    part(new THREE.TorusGeometry(0.195, 0.014, 8, 40), brass, 0, 1.68, 0.146);

    // Bend: straight up to y0, then the spine turns toward +x and finally hangs down.
    const y0 = mix(0.5, 0.36, melt), length = top + 0.1 - y0, total = mix(0.3, 2.5, melt);
    const N = 120;
    const spine: { x: number; y: number; angle: number }[] = [];
    {
      let x = 0, y = y0;
      for (let i = 0; i <= N; i++) {
        const u = i / N, k = THREE.MathUtils.smoothstep(u, 0.02, 0.62), angle = total * k + Math.sin(u * 7) * 0.06 * melt;
        spine.push({ x, y, angle });
        x += Math.sin(angle) * length / N; y += Math.cos(angle) * length / N;
      }
    }
    const bend = (p: THREE.Vector3) => {
      if (p.y <= y0) return p;
      const u = Math.min(1, (p.y - y0) / length), f = u * N, i = Math.min(N - 1, Math.floor(f)), t = f - i;
      const a0 = spine[i], a1 = spine[i + 1];
      const angle = mix(a0.angle, a1.angle, t), cx = mix(a0.x, a1.x, t), cy = mix(a0.y, a1.y, t);
      const lx = p.x * (1 - 0.18 * melt * u), sag = melt * u * u * 0.05 * Math.sin(p.x * 23 + p.z * 31);
      p.set(cx + Math.cos(angle) * lx + sag, cy - Math.sin(angle) * lx, p.z * (1 + 0.12 * melt * u));
      return p;
    };
    clock.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    for (const child of [...clock.children] as THREE.Mesh[]) {
      child.geometry.applyMatrix4(child.matrixWorld);
      child.position.set(0, 0, 0); child.rotation.set(0, 0, 0); child.scale.set(1, 1, 1);
      const pos = child.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) { bend(v.fromBufferAttribute(pos, i)); pos.setXYZ(i, v.x, v.y, v.z); }
      child.geometry.computeVertexNormals();
    }
    clock.position.set(0, stepH, 0);
    s.root.add(clock);
    const world = (x: number, y: number, z: number) => bend(new THREE.Vector3(x, y, z)).add(clock.position);

    // Drips from the underside, longer the further it has gone.
    const drips = Math.round(mix(2, 11, melt));
    const hoodTip = world(0, 1.9, 0);
    for (let i = 0; i < drips; i++) {
      const y = mix(0.7, top, random()), from = world(y > 1.42 ? 0.25 : 0.19, y, (random() - 0.5) * 0.2);
      const floor = from.x > 0.31 ? lowH : stepH;
      const len = Math.min(from.y - floor - 0.01, (0.06 + random() * 0.5) * mix(0.3, 1, melt));
      if (len < 0.03) continue;
      s.rod([from.x, from.y + 0.03, from.z], [from.x, from.y - len, from.z], 0.022, wood, 0.008);
      s.ball([0.02, 0.03, 0.02], [from.x, from.y - len, from.z], wood, 10);
    }

    // What has landed below.
    const landX = Math.max(0.7, Math.min(1.1, hoodTip.x));
    if (a.left === 'puddle') {
      for (let i = 0; i < 3 + Math.round(melt * 3); i++) {
        const r = (0.1 + random() * 0.2) * mix(0.6, 1.2, melt);
        s.cylinder(r * 0.9, r, 0.02, [landX + (random() - 0.5) * 0.5, lowH + 0.008 + i * 0.002, (random() - 0.5) * 0.35], wood, 20).scale.z = 0.7 + random() * 0.4;
      }
    } else if (a.left === 'numerals') {
      for (let i = 0; i < 6; i++) {
        const tile = s.label(String(1 + Math.floor(random() * 12)), 0.11, 0.11, [landX + (random() - 0.5) * 0.55, lowH + 0.006 + i * 0.001, (random() - 0.5) * 0.6], '#1e1a16', '#f3ecd6');
        tile.rotation.set(-Math.PI / 2, 0, random() * 6);
      }
    } else if (a.left === 'cogs') {
      for (let i = 0; i < 6; i++) {
        const r = 0.04 + random() * 0.07, x = landX + (random() - 0.5) * 0.55, z = (random() - 0.5) * 0.6;
        const cog = s.mesh(new THREE.CylinderGeometry(r, r, 0.016, 12 + Math.floor(r * 80), 1), brass, [x, lowH + 0.01, z]);
        cog.geometry.scale(1, 1, 1);
        s.ring(r, 0.012, [x, lowH + 0.012, z], brass).rotation.x = Math.PI / 2;
        s.cylinder(r * 0.25, r * 0.25, 0.03, [x, lowH + 0.015, z], dark, 8);
      }
      const coil = Array.from({ length: 40 }, (_unused, i) => [landX - 0.2 + Math.cos(i * 0.7) * (0.02 + i * 0.003), lowH + 0.02 + i * 0.004, 0.3 + Math.sin(i * 0.7) * (0.02 + i * 0.003)] as const);
      s.tube(coil, 0.006, s.material('#8d9396', { metalness: 0.8, roughness: 0.3 }));
    }

    // The pendulum hangs outside the softened case and swings about the wrong axis.
    const pivot = new THREE.Group();
    pivot.position.copy(world(0, 1.36, 0.16));
    s.root.add(pivot);
    const rodLen = Math.min(0.78, pivot.position.y - stepH - 0.16);
    const hang = (mesh: THREE.Mesh) => { mesh.castShadow = true; pivot.add(mesh); return mesh; };
    hang(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, rodLen, 8), brass)).position.y = -rodLen / 2;
    hang(new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), brass));
    if (a.bob === 'disc') { const d = hang(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.025, 28), brass)); d.rotation.x = Math.PI / 2; d.position.y = -rodLen; }
    else if (a.bob === 'moon') {
      const shape = new THREE.Shape(); shape.absarc(0, 0, 0.13, -1.9, 1.9); shape.absarc(0.07, 0, 0.11, 1.45, -1.45, true);
      const m = hang(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false }), s.material('#f1e3a8', { emissive: '#f1e3a8', emissiveIntensity: 0.3 }))); m.position.set(0, -rodLen, -0.01); m.rotation.z = Math.PI;
    } else if (a.bob === 'key') {
      hang(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 8, 20), brass)).position.y = -rodLen + 0.14;
      hang(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.02), brass)).position.y = -rodLen;
      for (const y of [0.06, 0.09]) hang(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.018, 0.018), brass)).position.set(0.03, -rodLen - y, 0);
    } else if (a.bob === 'eye') {
      hang(new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), s.material('#f4f1e8', { roughness: 0.2 }))).position.y = -rodLen;
      hang(new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), s.material('#3f6f8a', { roughness: 0.2 }))).position.set(0, -rodLen, 0.062);
      hang(new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), dark)).position.set(0, -rodLen, 0.098);
    }
    const lean = -mix(0.25, 0.6, melt) * (0.8 + random() * 0.4), swing = mix(0.08, 0.38, mood.energy), rate = mix(1.4, 4.2, mood.energy);
    pivot.rotation.z = lean + swing * 0.7;
    pivot.rotation.x = 0.12;

    return s.finish({ update: (_dt, time) => { pivot.rotation.z = lean + Math.sin(time * rate) * swing; } });
  },
});
