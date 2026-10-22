import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const TEXT = {
  video: ['VIDEO', 'RETURN'],
  drop: ['DROP TAPES', 'HERE'],
  kind: ['BE KIND', 'REWIND'],
  after: ['AFTER HOURS', 'DROP'],
  noon: ['IN BY NOON', 'NO LATE FEE'],
  only: ['VIDEOS ONLY', 'NOT A MAILBOX'],
} as const;

export default defineThing({
  questions: {
    kind: choice('What kind of return is it?', {
      mailbox: 'A kerbside steel box with a rounded mailbox top, standing on four legs.',
      cabinet: 'A square kerbside cabinet with a sloped lid on a concrete pad.',
      counter: 'A slot cut into the front of a shop counter, indoors.',
      wall: 'A steel chute set through a brick shopfront wall.',
    }),
    livery: choice('What colours is it painted?', {
      'blue-yellow': 'Royal blue with yellow lettering, a big chain.',
      'red-white': 'Signal red with white lettering.',
      galvanised: 'Bare galvanised steel with black stencil lettering.',
      green: 'Dark green with cream lettering, an old independent.',
      black: 'Gloss black with hot pink lettering.',
    }),
    sticker: choice('What does the decal lettering say?', {
      video: 'VIDEO RETURN', drop: 'DROP TAPES HERE', kind: 'BE KIND REWIND', after: 'AFTER HOURS DROP', noon: 'IN BY NOON NO LATE FEE', only: 'VIDEOS ONLY NOT A MAILBOX',
    }),
    load: choice('How full is it?', {
      empty: 'Empty: nothing in the slot, nothing around it.',
      used: 'In use: one tape caught halfway into the slot.',
      overflowing: 'Overflowing: tapes jam the slot and are stacked on top and around its foot.',
      sealed: 'Sealed: the slot is taped shut under a paper notice, the shop has closed.',
      apology: 'A single tape left on top with a note held by a rubber band.',
    }),
    cased: noul('Are the tapes in clear plastic rental cases rather than bare black cassettes?'),
    extras: noul('Is it plastered with small extra stickers and flyers?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const livery = { 'blue-yellow': ['#1f46a8', '#f6cf1e'], 'red-white': ['#c4201c', '#f6f2e6'], galvanised: ['#aab0b0', '#1c1c1e'], green: ['#1f4a34', '#eee2b8'], black: ['#18181b', '#ff4fa6'] }[a.livery];
    const paintM = s.material(livery[0], { metalness: a.livery === 'galvanised' ? 0.75 : 0.35, roughness: a.livery === 'galvanised' ? 0.5 : 0.42 });
    const accent = s.material(livery[1], { roughness: 0.5 });
    const steel = s.material('#c2c7c8', { metalness: 0.85, roughness: 0.32 });
    const dark = s.material('#111214', { roughness: 0.9 });
    const rust = s.material('#7a4526', { roughness: 0.95 });
    const [line1, line2] = TEXT[a.sticker];

    const decal = (w: number, h: number) => new THREE.MeshStandardMaterial({
      roughness: 0.55,
      map: paint(512, Math.round(512 * h / w), (ctx) => {
        const H = Math.round(512 * h / w);
        ctx.fillStyle = livery[0]; ctx.fillRect(0, 0, 512, H);
        ctx.fillStyle = livery[1];
        ctx.fillRect(0, 0, 512, H * 0.07); ctx.fillRect(0, H * 0.93, 512, H * 0.07);
        // An arrow up toward the slot.
        ctx.beginPath(); ctx.moveTo(256, H * 0.12); ctx.lineTo(316, H * 0.26); ctx.lineTo(280, H * 0.26); ctx.lineTo(280, H * 0.34); ctx.lineTo(232, H * 0.34); ctx.lineTo(232, H * 0.26); ctx.lineTo(196, H * 0.26); ctx.fill();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const size = (line: string) => Math.min(H * 0.24, 760 / line.length);
        ctx.font = `900 ${size(line1)}px sans-serif`; ctx.fillText(line1, 256, H * 0.5, 480);
        ctx.font = `900 ${size(line2)}px sans-serif`; ctx.fillText(line2, 256, H * 0.76, 480);
        // Scuffs and a marker tag arrive with wear.
        ctx.strokeStyle = 'rgba(30,24,20,0.35)'; ctx.lineWidth = 2;
        for (let i = 0; i < mood.wear * 40; i++) { const x = random() * 512, y = random() * H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 70, y + (random() - 0.5) * 26); ctx.stroke(); }
        if (mood.wear > 0.55) {
          ctx.strokeStyle = ['#101010', '#f2f2f2', '#c81ec8'][Math.floor(random() * 3)]; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); let x = 60 + random() * 80, y = H * (0.45 + random() * 0.3); ctx.moveTo(x, y);
          for (let i = 0; i < 9; i++) { x += 30 + random() * 26; y += (i % 2 ? -1 : 1) * (40 + random() * 60); ctx.quadraticCurveTo(x - 30, y + (random() - 0.5) * 90, x, y); }
          ctx.stroke();
        }
      }),
    });

    // Cassettes: black shells with a white label, or tinted clear cases.
    const tapes: THREE.Matrix4[] = [];
    const tape = (x: number, y: number, z: number, rx: number, ry: number, rz: number) =>
      tapes.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1)));
    const stack = (x: number, y: number, z: number, count: number) => {
      const spin = random() * Math.PI;
      for (let i = 0; i < count; i++) tape(x + (random() - 0.5) * 0.03, y + 0.0135 + i * 0.027, z + (random() - 0.5) * 0.03, 0, spin + (random() - 0.5) * 0.7, 0);
    };
    const strewn = (cx: number, cz: number, spread: number, count: number) => {
      for (let i = 0; i < count; i++) tape(cx + (random() - 0.5) * spread, 0.014 + random() * 0.02, cz + random() * spread * 0.6, (random() - 0.5) * 0.25, random() * Math.PI * 2, (random() - 0.5) * 0.25);
    };

    // The slot: a dark mouth, a hinged flap with a pull bar, and a rain visor above.
    const flaps: THREE.Group[] = [];
    const slot = (y: number, z: number, w: number) => {
      s.box([w + 0.07, 0.2, 0.014], [0, y + 0.02, z + 0.007], steel);
      s.box([w, 0.1, 0.02], [0, y + 0.03, z + 0.012], dark);
      const flap = new THREE.Group();
      flap.position.set(0, y + 0.085, z + 0.024);
      const open = a.load === 'used' || a.load === 'overflowing' ? 0.5 : a.load === 'sealed' ? 0.0 : 0.1 + random() * 0.12;
      flap.rotation.x = -open;
      const plate = s.box([w + 0.02, 0.115, 0.01], [0, -0.058, 0], a.livery === 'galvanised' ? steel : accent);
      const bar = s.rod([-w * 0.3, -0.1, 0.018], [w * 0.3, -0.1, 0.018], 0.008, steel);
      flap.add(plate, bar);
      s.root.add(flap);
      if (a.load !== 'sealed') flaps.push(flap);
      const visor = s.box([w + 0.1, 0.012, 0.09], [0, y + 0.125, z + 0.04], paintM);
      visor.rotation.x = 0.28;
      if (a.load === 'used' || a.load === 'overflowing') tape((random() - 0.5) * 0.08, y + 0.022, z + 0.05, 0.25, (random() - 0.5) * 0.3, 0);
      if (a.load === 'overflowing') tape(0.03, y + 0.05, z + 0.075, 0.5, 0.5, 0.1);
      if (a.load === 'sealed') {
        const tapeM = s.material('#d8c896', { roughness: 0.9 });
        for (const dir of [-1, 1]) { const strip = s.box([w * 1.25, 0.04, 0.004], [0, y + 0.03, z + 0.034], tapeM); strip.rotation.z = dir * 0.42; }
        const note = s.label('CLOSED', 0.24, 0.16, [0.02, y + 0.03, z + 0.04], '#b3261e', '#f8f4e4');
        note.rotation.z = (random() - 0.5) * 0.2;
      }
    };

    let topY = 1, topZ = 0, footZ = 0.45, bodyW = 0.6;
    if (a.kind === 'mailbox' || a.kind === 'cabinet') {
      const D = 0.52, base = a.kind === 'mailbox' ? 0.16 : 0.08, bodyH = a.kind === 'mailbox' ? 0.82 : 1.0;
      bodyW = 0.6;
      if (a.kind === 'mailbox') {
        for (const x of [-1, 1]) for (const z of [-1, 1]) {
          s.box([0.05, base + 0.02, 0.05], [x * 0.26, base / 2, z * 0.22], dark);
          s.box([0.1, 0.012, 0.1], [x * 0.26, 0.006, z * 0.22], dark);
        }
        const hood = s.cylinder(D / 2, D / 2, bodyW, [0, base + bodyH, 0], paintM, 28);
        hood.rotation.z = Math.PI / 2;
        topY = base + bodyH + D / 2;
      } else {
        s.box([0.86, 0.08, 0.78], [0, 0.04, 0], s.material('#b3b0a6', { roughness: 0.95 }));
        const shape = new THREE.Shape();
        shape.moveTo(-D / 2, 0); shape.lineTo(D / 2, 0); shape.lineTo(D / 2, 0.06); shape.lineTo(-D / 2, 0.24); shape.closePath();
        const lid = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: bodyW + 0.04, bevelEnabled: false }), accent, [-(bodyW + 0.04) / 2, base + bodyH, 0]);
        lid.rotation.y = Math.PI / 2;
        lid.position.set(-(bodyW + 0.04) / 2, base + bodyH, 0);
        lid.scale.x = -1;
        topY = base + bodyH + 0.15; topZ = 0.05;
        for (const x of [-1, 1]) { s.cylinder(0.05, 0.05, 0.9, [x * 0.62, 0.45, 0.42], s.material('#e9c21e', { roughness: 0.6 }), 14); s.ball([0.05, 0.03, 0.05], [x * 0.62, 0.9, 0.42], s.material('#e9c21e'), 12); }
      }
      s.box([bodyW, bodyH, D], [0, base + bodyH / 2, 0], paintM);
      s.mesh(new THREE.PlaneGeometry(bodyW * 0.94, bodyH * 0.5), decal(bodyW * 0.94, bodyH * 0.5), [0, base + bodyH * 0.5, D / 2 + 0.002]);
      slot(base + bodyH * 0.84, D / 2, 0.36);
      // Service door, hinges and padlock low on the front; rivets along the edges.
      s.box([bodyW * 0.8, bodyH * 0.2, 0.008], [0, base + bodyH * 0.125, D / 2 + 0.004], paintM);
      for (const x of [-1, 1]) s.box([0.02, 0.05, 0.012], [x * bodyW * 0.36, base + bodyH * 0.125, D / 2 + 0.01], steel);
      s.box([0.045, 0.05, 0.02], [0, base + bodyH * 0.2, D / 2 + 0.016], s.material('#c9a23c', { metalness: 0.8, roughness: 0.3 }));
      s.ring(0.016, 0.004, [0, base + bodyH * 0.235, D / 2 + 0.016], steel, Math.PI);
      s.scatter(new THREE.SphereGeometry(0.008, 6, 4), paintM, Array.from({ length: 14 }, (_u, i) => ({ at: [(i % 2 ? 1 : -1) * (bodyW / 2 - 0.02), base + 0.06 + Math.floor(i / 2) * (bodyH - 0.1) / 6, D / 2 + 0.002] as [number, number, number], size: 1 })));
      const side = s.label('VIDEO', 0.36, 0.11, [bodyW / 2 + 0.002, base + bodyH * 0.6, 0], livery[1], livery[0]);
      side.rotation.y = Math.PI / 2;
      footZ = D / 2 + 0.12;
    } else if (a.kind === 'counter') {
      bodyW = 1.3;
      const wood = s.material(mood.warmth > 0.5 ? '#b08a5a' : '#cfc8b6', { roughness: 0.6 });
      s.box([bodyW, 0.1, 0.5], [0, 0.05, 0], dark);
      s.box([bodyW, 0.86, 0.56], [0, 0.53, 0], wood);
      s.box([bodyW + 0.08, 0.045, 0.7], [0, 0.985, 0.03], s.material('#3b4048', { roughness: 0.35 }));
      s.box([bodyW, 0.06, 0.012], [0, 0.9, 0.286], accent);
      s.mesh(new THREE.PlaneGeometry(0.6, 0.36), decal(0.6, 0.36), [0, 0.36, 0.2825]);
      slot(0.68, 0.28, 0.4);
      topY = 1.008; topZ = 0.05; footZ = 0.42;
    } else {
      bodyW = 1.4;
      const brick = new THREE.MeshStandardMaterial({ roughness: 0.92, map: paint(512, 512, (ctx) => {
        ctx.fillStyle = '#b9b2a4'; ctx.fillRect(0, 0, 512, 512);
        for (let row = 0; row < 22; row++) for (let col = -1; col < 9; col++) {
          const tone = 110 + random() * 50;
          ctx.fillStyle = `rgb(${tone + 40},${tone * 0.55},${tone * 0.42})`;
          ctx.fillRect(col * 62 + (row % 2) * 31 + 2, row * 23.3 + 2, 58, 19.5);
        }
      }) });
      s.box([bodyW, 1.75, 0.18], [0, 0.875, -0.09], brick);
      s.box([bodyW + 0.3, 0.06, 0.9], [0, -0.03, 0.2], s.material('#a9a79c', { roughness: 0.95 }));
      s.box([0.56, 0.36, 0.16], [0, 1.02, 0.08], paintM);
      s.mesh(new THREE.PlaneGeometry(0.8, 0.44), decal(0.8, 0.44), [0, 1.48, 0.003]);
      slot(1.0, 0.16, 0.38);
      topY = 1.2; topZ = 0.08; footZ = 0.3;
    }

    if (a.load === 'overflowing') {
      const amount = mix(0.6, 1.3, mood.density);
      stack(-0.1, topY, topZ, Math.round((3 + random() * 4) * amount));
      if (a.kind !== 'mailbox') stack(0.14, topY, topZ - 0.02, Math.round((1 + random() * 3) * amount));
      else stack(bodyW / 2 + 0.16, 0, 0.05, Math.round((5 + random() * 6) * amount));
      stack(-bodyW / 2 - 0.02 + (a.kind === 'mailbox' ? -0.16 : 0.2), a.kind === 'counter' ? topY : 0, a.kind === 'counter' ? 0.1 : footZ - 0.05, Math.round((3 + random() * 5) * amount));
      strewn(0, footZ, 0.7, Math.round((4 + random() * 5) * amount));
    }
    if (a.load === 'apology') {
      tape(0.03, topY + 0.0135, topZ, 0, 0.3 + random() * 0.5, 0);
      const note = s.label('SORRY!', 0.1, 0.07, [0.03, topY + 0.029, topZ], '#2a3a9a', '#fff6a8');
      note.rotation.set(-Math.PI / 2, 0, 0.3);
      s.box([0.004, 0.003, 0.11], [0.03, topY + 0.029, topZ], s.material('#b3261e'));
    }
    if (tapes.length) {
      const shell = new THREE.InstancedMesh(new THREE.BoxGeometry(0.187, 0.025, 0.103), a.cased ? s.material('#cfe2e6', { roughness: 0.25, metalness: 0.1 }) : s.material('#141416', { roughness: 0.5 }), tapes.length);
      const label = new THREE.InstancedMesh(new THREE.BoxGeometry(a.cased ? 0.15 : 0.13, 0.0262, a.cased ? 0.08 : 0.042), s.material('#ffffff', { roughness: 0.8 }), tapes.length);
      const tints = ['#f4f1e4', '#f6d84a', '#e8463a', '#4a8fe0', '#58b86a', '#f4f1e4'];
      tapes.forEach((matrix, i) => { shell.setMatrixAt(i, matrix); label.setMatrixAt(i, matrix); label.setColorAt(i, new THREE.Color(a.cased ? tints[Math.floor(random() * tints.length)] : '#f1eee2')); });
      for (const mesh of [shell, label]) { mesh.castShadow = mesh.receiveShadow = true; s.root.add(mesh); }
    }

    // Extra stickers, dents and rust.
    const faceZ = a.kind === 'wall' ? 0.161 : a.kind === 'counter' ? 0.2815 : 0.262;
    if (a.extras && a.kind !== 'wall') {
      const colours = ['#f6e04a', '#ff5fa8', '#3fd0c0', '#f4f1e4', '#ff7a1a', '#8a5ad6'];
      const n = 5 + Math.floor(random() * 6 * (0.5 + mood.density));
      for (let i = 0; i < n; i++) {
        const onSide = a.kind !== 'counter' && random() < 0.4;
        const w = 0.05 + random() * 0.07, h = 0.035 + random() * 0.05;
        const y = 0.2 + random() * 0.14 + (random() < 0.5 ? 0 : a.kind === 'counter' ? 0 : 0.68);
        const sticker = onSide
          ? s.box([0.002, h, w], [-(0.301), 0.3 + random() * 0.6, (random() - 0.5) * 0.36], s.material(colours[i % colours.length]))
          : s.box([w, h, 0.002], [(random() - 0.5) * (bodyW - 0.16), y, faceZ + 0.003], s.material(colours[i % colours.length]));
        sticker.rotation[onSide ? 'x' : 'z'] = (random() - 0.5) * 0.5;
      }
    }
    if (a.kind === 'mailbox' || a.kind === 'cabinet') {
      const dents = Math.round(mood.wear * 7);
      const shade = s.material(new THREE.Color(livery[0]).multiplyScalar(0.55), { roughness: 0.8 });
      for (let i = 0; i < dents; i++) {
        const onSide = random() < 0.5;
        const y = 0.25 + random() * 0.65, r = 0.012 + random() * 0.022;
        const dent = onSide ? s.ball([0.004, r, r * 1.4], [0.301, y, (random() - 0.5) * 0.36], random() < 0.5 ? rust : shade, 10) : s.ball([r * 1.4, r, 0.004], [(random() - 0.5) * 0.44, y, 0.262], random() < 0.5 ? rust : shade, 10);
        dent.rotation[onSide ? 'x' : 'z'] = random();
      }
    }
    const swing = mix(0, 0.1, mood.energy);
    const rest = flaps.map((flap) => flap.rotation.x);
    return s.finish({ update: swing > 0.01 ? (_dt, time) => flaps.forEach((flap, i) => { flap.rotation.x = rest[i] - Math.max(0, Math.sin(time * 2.2 + i)) * swing; }) : undefined });
  },
});
