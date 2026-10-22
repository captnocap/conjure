import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const B = 0.15, HEAD_R = 0.06;
const THEMES = {
  circus: { a: '#b3261e', b: '#e2b53a', c: '#f1e6c8' },
  harlequin: { a: '#1f6f6a', b: '#c8372d', c: '#efe3c2' },
  nursery: { a: '#8fb2d6', b: '#e8a9b4', c: '#f6f1df' },
  memento: { a: '#151317', b: '#e9e4d6', c: '#7a1d1d' },
  rusted: { a: '#7d7a70', b: '#8a4b25', c: '#b9b3a2' },
} as const;

export default defineThing({
  questions: {
    head: choice('What is the figure on the spring?', {
      clown: 'A rotted clown: cracked white greasepaint, one eye gone, tufts of orange hair.',
      vampire: 'A tiny vampire with a widow\'s peak, red eyes, fangs and a high collar.',
      'skull-jester': 'A grinning skull in a belled jester cap.',
      'zombie-baby': 'A grey-green zombie baby in a frilled bonnet, one eye milky and one stitched shut.',
      empty: 'Nothing: an empty ruff collar and two little hands, as if the head has gone elsewhere.',
    }),
    spring: choice('How far out has it sprung?', {
      sprung: 'Fully sprung, tall above the box and swaying.',
      peering: 'Half out: peering over the rim with the lid resting on its head and its hands on the edge.',
      lifting: 'The lid is only just lifting: fingers on the rim and two eyes in the dark gap.',
    }),
    litho: choice('What is printed on the tin box?', {
      circus: 'Red and gold circus stars and sunburst stripes.',
      harlequin: 'Harlequin diamonds in teal, red and cream.',
      nursery: 'Pale blue nursery sky with a moon and stars.',
      memento: 'Black with white skulls, a funeral toy.',
      rusted: 'Almost nothing: the lithograph has rusted away to bare tin.',
    }),
    crank: choice('What is the crank doing?', {
      still: 'Still.',
      turning: 'Turning by itself, the tune drifting out as little notes.',
      snapped: 'Snapped off and lying beside the box.',
    }),
    expression: choice('What is its expression?', {
      grin: 'A huge fixed grin full of teeth.',
      snarl: 'A snarl with jagged teeth and angry brows.',
      weeping: 'A downturned mouth and tear tracks.',
      gleeful: 'Round-mouthed delight, brows up, as if it has just surprised you.',
      asleep: 'Eyes closed, sleeping upright.',
    }),
    hands: choice('If its arms are free, what are they doing?', {
      wide: 'Flung wide: ta-da.',
      reaching: 'Both reaching forward toward you.',
      limp: 'Hanging limp at its sides.',
      wave: 'One raised in a small wave.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear, theme = THEMES[a.litho];
    const ball = new THREE.SphereGeometry(1, 18, 12);
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: [number, number, number] = [0, 0, 0], size: [number, number, number] = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.scale.set(...size);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const rod = (parent: THREE.Object3D, from: [number, number, number], to: [number, number, number], r0: number, r1: number, material: THREE.Material) => {
      const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to), along = end.clone().sub(start);
      const mesh = add(parent, new THREE.CylinderGeometry(r1, r0, Math.max(along.length(), 0.0005), 10), material, start.clone().add(end).multiplyScalar(0.5).toArray() as [number, number, number]);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize());
      return mesh;
    };
    const textureOf = (canvas: HTMLCanvasElement) => { const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; return texture; };

    // ---- lithographed tin -----------------------------------------------------------------
    const panel = document.createElement('canvas');
    panel.width = panel.height = 256;
    const p = panel.getContext('2d')!;
    p.fillStyle = theme.a; p.fillRect(0, 0, 256, 256);
    const star = (x: number, y: number, r: number, fill: string) => { p.fillStyle = fill; p.beginPath(); for (let k = 0; k < 10; k++) { const angle = k * Math.PI / 5, reach = k % 2 ? r * 0.42 : r; p.lineTo(x + Math.sin(angle) * reach, y - Math.cos(angle) * reach); } p.fill(); };
    if (a.litho === 'circus') {
      p.fillStyle = theme.b;
      for (let k = 0; k < 16; k += 2) { p.beginPath(); p.moveTo(128, 128); p.arc(128, 128, 200, k * Math.PI / 8, (k + 1) * Math.PI / 8); p.fill(); }
      p.fillStyle = theme.a; p.beginPath(); p.arc(128, 128, 74, 0, 7); p.fill();
      star(128, 128, 58, theme.c);
    }
    if (a.litho === 'harlequin') {
      for (let row = -1; row < 5; row++) for (let col = -1; col < 5; col++) {
        p.fillStyle = [theme.b, theme.c, theme.a][(row * 2 + col + 9) % 3];
        const x = col * 64 + (row % 2 ? 32 : 0), y = row * 64;
        p.beginPath(); p.moveTo(x + 32, y); p.lineTo(x + 64, y + 64); p.lineTo(x + 32, y + 128); p.lineTo(x, y + 64); p.fill();
      }
      for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) { p.fillStyle = '#d9b44a'; p.beginPath(); p.arc(col * 64 + (row % 2 ? 32 : 0), row * 64, 5, 0, 7); p.fill(); }
    }
    if (a.litho === 'nursery') {
      p.fillStyle = theme.c; p.beginPath(); p.arc(110, 110, 56, 0, 7); p.fill();
      p.fillStyle = theme.a; p.beginPath(); p.arc(134, 96, 50, 0, 7); p.fill();
      for (let k = 0; k < 9; k++) star(mix(24, 232, random()), mix(24, 232, random()), mix(8, 16, random()), k % 2 ? theme.c : '#f0d98a');
      p.fillStyle = theme.b;
      for (let x = 0; x <= 256; x += 32) { p.beginPath(); p.arc(x, 256, 20, 0, 7); p.fill(); p.beginPath(); p.arc(x, 0, 20, 0, 7); p.fill(); }
    }
    if (a.litho === 'memento') {
      p.strokeStyle = theme.b; p.lineWidth = 9; p.lineCap = 'round';
      p.beginPath(); p.moveTo(56, 80); p.lineTo(200, 208); p.moveTo(200, 80); p.lineTo(56, 208); p.stroke();
      p.fillStyle = theme.b;
      p.beginPath(); p.arc(128, 112, 58, 0, 7); p.fill();
      p.fillRect(96, 150, 64, 40);
      p.fillStyle = theme.a;
      p.beginPath(); p.ellipse(104, 112, 17, 20, 0, 0, 7); p.ellipse(152, 112, 17, 20, 0, 0, 7); p.fill();
      p.beginPath(); p.moveTo(128, 132); p.lineTo(118, 152); p.lineTo(138, 152); p.fill();
      for (let k = 0; k < 5; k++) p.fillRect(102 + k * 12, 164, 3, 26);
      p.strokeStyle = theme.c; p.lineWidth = 6; p.setLineDash([14, 10]); p.strokeRect(12, 12, 232, 232); p.setLineDash([]);
    }
    if (a.litho === 'rusted') {
      p.globalAlpha = 0.25; star(128, 128, 70, '#b9453a'); p.globalAlpha = 1;
    }
    if (a.litho !== 'memento') { p.strokeStyle = a.litho === 'rusted' ? '#6b675d' : theme.c; p.lineWidth = 10; p.strokeRect(9, 9, 238, 238); }
    for (let i = 0; i < (a.litho === 'rusted' ? 70 : mix(0, 34, wear * wear)); i++) {
      const x = random() * 256, y = random() ** 0.6 * 256, r = mix(5, a.litho === 'rusted' ? 26 : 17, random());
      const rust = p.createRadialGradient(x, y, 0, x, y, r);
      rust.addColorStop(0, 'rgba(92,46,20,0.92)'); rust.addColorStop(0.6, 'rgba(140,76,32,0.6)'); rust.addColorStop(1, 'rgba(140,76,32,0)');
      p.fillStyle = rust; p.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const tin = new THREE.MeshStandardMaterial({ map: textureOf(panel), roughness: mix(0.3, 0.75, wear), metalness: 0.35 });
    const bare = s.material('#8f8c82', { metalness: 0.7, roughness: 0.4 });
    const steel = s.material('#a9adb0', { metalness: 0.85, roughness: 0.3 });
    const felt = new THREE.MeshStandardMaterial({ color: '#2a1216', roughness: 1 });
    const wood = s.material(theme.b, { roughness: 0.5 });

    for (const [x, z, turn] of [[0, 1, 0], [1, 0, Math.PI / 2], [0, -1, Math.PI], [-1, 0, -Math.PI / 2]] as const) {
      add(s.root, new THREE.BoxGeometry(B, B, 0.004), tin, [x * (B / 2 - 0.002), B / 2, z * (B / 2 - 0.002)]).rotation.y = turn;
      add(s.root, new THREE.PlaneGeometry(B - 0.008, B - 0.008), felt, [x * (B / 2 - 0.0045), B / 2, z * (B / 2 - 0.0045)]).rotation.y = turn + Math.PI;
    }
    add(s.root, new THREE.BoxGeometry(B, 0.005, B), bare, [0, 0.0025, 0]);
    add(s.root, new THREE.PlaneGeometry(B - 0.008, B - 0.008), felt, [0, 0.006, 0]).rotation.x = -Math.PI / 2;
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) add(s.root, new THREE.BoxGeometry(0.008, B + 0.002, 0.008), bare, [x * (B / 2 - 0.002), B / 2, z * (B / 2 - 0.002)]);

    const lidAngle = { sprung: mix(1.75, 2.1, random()), peering: 0.95, lifting: 0.44 }[a.spring];
    const lid = new THREE.Group();
    lid.position.set(0, B + 0.001, -B / 2);
    lid.rotation.x = -lidAngle;
    s.root.add(lid);
    const lidPlate = add(lid, new THREE.BoxGeometry(B + 0.006, 0.006, B + 0.006), [bare, bare, tin, felt, bare, bare], [0, 0.003, B / 2]);
    lidPlate.rotation.y = 0;
    add(lid, new THREE.BoxGeometry(0.03, 0.022, 0.004), steel, [0, -0.008, B + 0.004]);
    add(s.root, new THREE.CylinderGeometry(0.004, 0.004, B * 0.8, 8), steel, [0, B, -B / 2 - 0.003]).rotation.z = Math.PI / 2;

    // ---- crank and its tune -----------------------------------------------------------------
    const crank = new THREE.Group();
    const crankParts = (holder: THREE.Object3D) => {
      rod(holder, [0, 0, 0], [0.028, 0, 0], 0.004, 0.004, steel);
      rod(holder, [0.026, 0, 0], [0.026, -0.036, 0], 0.0035, 0.0035, steel);
      rod(holder, [0.026, -0.036, 0], [0.052, -0.036, 0], 0.003, 0.003, steel);
      add(holder, ball, wood, [0.052, -0.036, 0], [0.013, 0.011, 0.011]);
    };
    add(s.root, new THREE.CylinderGeometry(0.011, 0.011, 0.004, 14), steel, [B / 2 + 0.002, B * 0.55, 0.01]).rotation.z = Math.PI / 2;
    const notes: THREE.Group[] = [];
    if (a.crank === 'snapped') {
      crank.position.set(B / 2 + mix(0.05, 0.09, random()), 0.012, mix(-0.02, 0.06, random()));
      crank.rotation.set(Math.PI / 2, 0, random() * 3);
      rod(s.root, [B / 2, B * 0.55, 0.01], [B / 2 + 0.012, B * 0.55, 0.01], 0.004, 0.003, steel);
    } else {
      crank.position.set(B / 2, B * 0.55, 0.01);
      crank.rotation.x = random() * 6;
    }
    crankParts(crank);
    s.root.add(crank);
    if (a.crank === 'turning') {
      const ink = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#2b2a33' : '#5a1616', roughness: 0.6, emissive: mood.cheer > 0.5 ? '#000000' : '#3a0808' });
      for (let i = 0; i < 4; i++) {
        const note = new THREE.Group();
        note.position.set(B / 2 + 0.05 + i * 0.03 + (random() - 0.5) * 0.02, B * 0.6 + 0.045 + i * 0.05, 0.02 + (random() - 0.5) * 0.06);
        note.rotation.set(0, (random() - 0.5), (random() - 0.5) * 0.6);
        note.scale.setScalar(mix(0.8, 1.2, random()));
        add(note, ball, ink, [0, 0, 0], [0.011, 0.008, 0.008]).rotation.z = 0.4;
        rod(note, [0.009, 0, 0], [0.009, 0.04, 0], 0.0022, 0.0022, ink);
        rod(note, [0.009, 0.04, 0], [0.024, 0.028, 0], 0.003, 0.0015, ink);
        s.root.add(note);
        notes.push(note);
      }
    }

    // ---- the head's painted face ------------------------------------------------------------
    const skin = { clown: '#ebe8de', vampire: '#d5dadf', 'skull-jester': '#e9dfc2', 'zombie-baby': '#9db08b', empty: '#000000' }[a.head];
    const face = document.createElement('canvas');
    face.width = 1024; face.height = 512;
    const f = face.getContext('2d')!;
    f.fillStyle = skin; f.fillRect(0, 0, 1024, 512);
    const cx = 256, eyeY = 232, eyeDx = 60, mouthY = 326;
    const dark = '#120d0e';
    const blotch = (count: number, rgb: string, size: number) => {
      for (let i = 0; i < count; i++) {
        const x = random() * 1024, y = random() * 512, r = mix(size * 0.4, size, random());
        const g = f.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${rgb},0.85)`); g.addColorStop(1, `rgba(${rgb},0)`);
        f.fillStyle = g; f.fillRect(x - r, y - r, r * 2, r * 2);
      }
    };
    const oval = (x: number, y: number, rx: number, ry: number, fill: string, turn = 0) => { f.fillStyle = fill; f.beginPath(); f.ellipse(x, y, rx, ry, turn, 0, 7); f.fill(); };
    const asleep = a.expression === 'asleep';
    const closedEye = (x: number) => { f.strokeStyle = dark; f.lineWidth = 7; f.lineCap = 'round'; f.beginPath(); f.arc(x, eyeY - 6, 22, 0.25, Math.PI - 0.25); f.stroke(); };
    if (a.head === 'clown') {
      blotch(mix(6, 26, wear), '70,88,52', 70); blotch(8, '40,34,30', 34);
      f.strokeStyle = 'rgba(60,54,48,0.7)'; f.lineWidth = 2;
      for (let i = 0; i < 26; i++) { let x = random() * 1024, y = random() * 512; f.beginPath(); f.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (random() - 0.5) * 60; y += (random() - 0.5) * 60; f.lineTo(x, y); } f.stroke(); }
      for (const side of [-1, 1]) oval(cx + side * 108, mouthY - 30, 26, 26, 'rgba(206,60,70,0.75)');
      f.fillStyle = '#2f58a8'; f.beginPath(); f.moveTo(cx - eyeDx, eyeY - 48); f.lineTo(cx - eyeDx + 26, eyeY); f.lineTo(cx - eyeDx, eyeY + 48); f.lineTo(cx - eyeDx - 26, eyeY); f.fill();
      if (asleep) closedEye(cx - eyeDx); else oval(cx - eyeDx, eyeY, 15, 17, dark);
      oval(cx + eyeDx, eyeY, 28, 32, dark);
      f.fillStyle = dark; f.fillRect(cx + eyeDx - 5, eyeY + 20, 10, mix(30, 80, random()));
    }
    if (a.head === 'vampire') {
      blotch(6, '150,160,176', 60);
      f.fillStyle = '#141216'; f.beginPath(); f.moveTo(cx - 150, 60); f.lineTo(cx, 168); f.lineTo(cx + 150, 60); f.lineTo(cx + 150, 0); f.lineTo(cx - 150, 0); f.fill();
      for (const side of [-1, 1]) {
        oval(cx + side * eyeDx, eyeY, 34, 26, 'rgba(84,60,96,0.75)');
        if (asleep) closedEye(cx + side * eyeDx);
        else { oval(cx + side * eyeDx, eyeY, 19, 17, '#d21c1c'); oval(cx + side * eyeDx, eyeY, 5, 14, dark); }
      }
    }
    if (a.head === 'skull-jester') {
      blotch(10, '150,130,90', 60);
      for (const side of [-1, 1]) { oval(cx + side * eyeDx, eyeY - 4, 33, 38, dark, side * 0.2); oval(cx + side * 118, mouthY - 22, 20, 46, 'rgba(120,104,72,0.7)'); }
      f.fillStyle = dark; f.beginPath(); f.moveTo(cx, eyeY + 32); f.lineTo(cx - 17, eyeY + 68); f.lineTo(cx + 17, eyeY + 68); f.fill();
      f.strokeStyle = 'rgba(60,48,36,0.8)'; f.lineWidth = 2.5;
      f.beginPath(); f.moveTo(cx + 30, 60); f.lineTo(cx + 46, 110); f.lineTo(cx + 28, 150); f.lineTo(cx + 52, 186); f.stroke();
    }
    if (a.head === 'zombie-baby') {
      blotch(mix(5, 16, wear), '70,84,60', 70); blotch(5, '120,60,70', 40);
      if (asleep) closedEye(cx - eyeDx); else { oval(cx - eyeDx, eyeY + 6, 31, 31, '#f0efe2'); oval(cx - eyeDx + 6, eyeY + 10, 8, 8, '#4a5a48'); f.strokeStyle = dark; f.lineWidth = 4; f.beginPath(); f.arc(cx - eyeDx, eyeY + 6, 31, 0, 7); f.stroke(); }
      f.strokeStyle = dark; f.lineWidth = 7; f.lineCap = 'round';
      f.beginPath(); f.moveTo(cx + eyeDx - 24, eyeY - 16); f.lineTo(cx + eyeDx + 24, eyeY + 24); f.moveTo(cx + eyeDx + 24, eyeY - 16); f.lineTo(cx + eyeDx - 24, eyeY + 24); f.stroke();
      f.lineWidth = 4;
      f.beginPath(); f.moveTo(cx - 110, 150); f.lineTo(cx + 120, 132); f.stroke();
      for (let k = 0; k < 8; k++) { f.beginPath(); f.moveTo(cx - 96 + k * 28, 136 - k * 2); f.lineTo(cx - 90 + k * 28, 160 - k * 2); f.stroke(); }
      for (const side of [-1, 1]) oval(cx + side * 106, mouthY - 34, 24, 20, 'rgba(150,90,110,0.5)');
    }
    if (a.head !== 'empty') {
      // Brows.
      if (a.head !== 'skull-jester') {
        const tilt = { grin: 0.1, snarl: 0.55, weeping: -0.5, gleeful: 0, asleep: -0.1 }[a.expression], rise = a.expression === 'gleeful' ? 22 : 0;
        f.strokeStyle = a.head === 'clown' ? '#b0352f' : dark; f.lineWidth = 9; f.lineCap = 'round';
        for (const side of [-1, 1]) { f.beginPath(); f.moveTo(cx + side * 26, eyeY - 44 - rise + tilt * 26); f.quadraticCurveTo(cx + side * 60, eyeY - 60 - rise - (a.expression === 'gleeful' ? 14 : 0), cx + side * 96, eyeY - 44 - rise - tilt * 26); f.stroke(); }
      }
      // Mouth.
      const lip = a.head === 'clown' ? '#b3202a' : a.head === 'vampire' ? '#5a1418' : dark;
      const teeth = a.head === 'zombie-baby' ? '#d7d2a8' : '#f4f0e0';
      const bony = a.head === 'skull-jester';
      if (a.expression === 'grin' || (bony && a.expression === 'asleep')) {
        f.fillStyle = lip; f.beginPath(); f.moveTo(cx - 98, mouthY - 26); f.quadraticCurveTo(cx, mouthY + 26, cx + 98, mouthY - 26); f.quadraticCurveTo(cx, mouthY + 98, cx - 98, mouthY - 26); f.fill();
        f.fillStyle = teeth; f.beginPath(); f.moveTo(cx - 84, mouthY - 14); f.quadraticCurveTo(cx, mouthY + 30, cx + 84, mouthY - 14); f.quadraticCurveTo(cx, mouthY + 74, cx - 84, mouthY - 14); f.fill();
        f.strokeStyle = dark; f.lineWidth = 3;
        for (let k = -5; k <= 5; k++) { f.beginPath(); f.moveTo(cx + k * 15, mouthY - 14); f.lineTo(cx + k * 15, mouthY + 66); f.stroke(); }
        f.beginPath(); f.moveTo(cx - 84, mouthY - 10); f.quadraticCurveTo(cx, mouthY + 54, cx + 84, mouthY - 10); f.stroke();
      } else if (a.expression === 'snarl') {
        f.fillStyle = lip; f.beginPath(); f.moveTo(cx - 90, mouthY - 4); f.lineTo(cx - 60, mouthY - 30); f.lineTo(cx + 60, mouthY - 30); f.lineTo(cx + 90, mouthY - 4); f.lineTo(cx + 62, mouthY + 54); f.lineTo(cx - 62, mouthY + 54); f.fill();
        oval(cx, mouthY + 12, 66, 30, '#1a0a0c');
        f.fillStyle = teeth;
        for (let k = -4; k <= 4; k++) {
          f.beginPath(); f.moveTo(cx + k * 15 - 8, mouthY - 22); f.lineTo(cx + k * 15 + 8, mouthY - 22); f.lineTo(cx + k * 15, mouthY + 6); f.fill();
          f.beginPath(); f.moveTo(cx + k * 15 - 1, mouthY + 44); f.lineTo(cx + k * 15 + 15, mouthY + 44); f.lineTo(cx + k * 15 + 7, mouthY + 18); f.fill();
        }
      } else if (a.expression === 'weeping') {
        f.strokeStyle = lip; f.lineWidth = bony ? 26 : 15; f.lineCap = 'round';
        f.beginPath(); f.moveTo(cx - 70, mouthY + 34); f.quadraticCurveTo(cx, mouthY - 30, cx + 70, mouthY + 34); f.stroke();
        if (bony) { f.strokeStyle = teeth; f.lineWidth = 4; for (let k = -4; k <= 4; k++) { const y = mouthY + 34 - (1 - (k / 4.6) ** 2) * 32; f.beginPath(); f.moveTo(cx + k * 15, y - 10); f.lineTo(cx + k * 15, y + 10); f.stroke(); } }
        for (const side of [-1, 1]) for (let k = 0; k < 2; k++) { f.strokeStyle = a.head === 'clown' ? 'rgba(30,40,90,0.8)' : 'rgba(20,16,18,0.75)'; f.lineWidth = 8 - k * 3; f.beginPath(); f.moveTo(cx + side * (eyeDx + k * 12 - 6), eyeY + 26); f.lineTo(cx + side * (eyeDx + k * 16 - 2), eyeY + mix(80, 150, random())); f.stroke(); }
      } else if (a.expression === 'gleeful') {
        oval(cx, mouthY + 12, 44, 52, lip); oval(cx, mouthY + 14, 30, 38, '#1a0a0c');
        if (bony || a.head === 'vampire') { f.fillStyle = teeth; f.fillRect(cx - 24, mouthY - 22, 48, 12); }
      } else {
        f.strokeStyle = lip; f.lineWidth = 11; f.lineCap = 'round';
        f.beginPath(); f.moveTo(cx - 34, mouthY + 8); f.quadraticCurveTo(cx, mouthY + 20, cx + 34, mouthY + 8); f.stroke();
      }
    }
    const headMaterial = new THREE.MeshStandardMaterial({ map: textureOf(face), roughness: a.head === 'skull-jester' ? 0.55 : 0.7 });

    // ---- the jack: spring, costume, head ----------------------------------------------------
    const jack = new THREE.Group();
    jack.position.set(0, B, 0);
    s.root.add(jack);
    const big = a.head === 'zombie-baby' ? 1.1 : 1;
    const headY = { sprung: mix(0.25, 0.3, random()), peering: 0.032, lifting: -0.064 }[a.spring];
    const neckY = headY - HEAD_R * big * 0.86;
    const tunicH = Math.min(0.115, neckY + B - 0.03);
    const springTop = neckY - tunicH + 0.02;
    const coil: THREE.Vector3[] = [];
    const turns = 7, floorY = -B + 0.012;
    for (let i = 0; i <= turns * 14; i++) { const t = i / (turns * 14), angle = t * turns * Math.PI * 2; coil.push(new THREE.Vector3(Math.cos(angle) * 0.032, mix(floorY, Math.max(springTop, floorY + 0.02), t), Math.sin(angle) * 0.032)); }
    add(jack, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), turns * 28, 0.0042, 6), steel);

    const figure = new THREE.Group();
    jack.add(figure);
    const cloth = s.material(a.litho === 'rusted' ? '#8c8474' : theme.a, { roughness: 0.9 });
    const trim = s.material(a.litho === 'rusted' ? '#b9b3a2' : theme.b === '#e9e4d6' ? '#e9e4d6' : theme.b, { roughness: 0.9, side: THREE.DoubleSide });
    add(figure, new THREE.CylinderGeometry(0.02, 0.05, tunicH, 18, 1, true), new THREE.MeshStandardMaterial({ color: cloth.color, roughness: 0.9, side: THREE.DoubleSide }), [0, neckY - tunicH / 2, 0]);
    for (let k = 0; k < 3; k++) if (tunicH > 0.03 + k * 0.03) add(figure, ball, trim, [0, neckY - 0.03 - k * 0.03, 0.026 + k * 0.008], [0.009, 0.009, 0.009]);
    const frill = (inner: number, outer: number, drop: number, waves: number) => {
      const geometry = new THREE.RingGeometry(inner, outer, 72, 2);
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) { const x = position.getX(i), y = position.getY(i), t = (Math.hypot(x, y) - inner) / (outer - inner); position.setZ(i, -t * drop + Math.sin(Math.atan2(y, x) * waves) * 0.007 * t); }
      geometry.computeVertexNormals();
      return geometry;
    };
    for (const [outer, lift] of [[0.07, 0], [0.056, 0.008]] as const) add(figure, frill(0.018, outer, 0.016, 12), trim, [0, neckY + 0.004 + lift, 0]).rotation.x = -Math.PI / 2;

    // Arms end on the rim when it is still hiding.
    const fleshColour = a.head === 'empty' ? '#e6dccb' : a.head === 'skull-jester' ? '#e9dfc2' : skin;
    const flesh = new THREE.MeshStandardMaterial({ color: fleshColour, roughness: 0.7 });
    const hiding = a.spring !== 'sprung';
    for (const side of [-1, 1]) {
      const shoulder: [number, number, number] = [side * 0.028, neckY - 0.02, 0];
      let handAt: [number, number, number];
      if (hiding) handAt = [side * mix(0.03, 0.05, random()), 0.006, B / 2 + 0.003];
      else if (a.hands === 'wide') handAt = [side * 0.115, neckY + mix(0.02, 0.06, random()), 0.02];
      else if (a.hands === 'reaching') handAt = [side * 0.045, neckY - 0.01, 0.12];
      else if (a.hands === 'wave' && side === 1) handAt = [0.085, neckY + 0.085, 0.02];
      else handAt = [side * 0.062, neckY - 0.1, 0.012];
      rod(figure, shoulder, handAt, 0.014, 0.017, cloth);
      add(figure, new THREE.TorusGeometry(0.016, 0.005, 6, 12), trim, handAt).lookAt(new THREE.Vector3(...shoulder));
      const palm: [number, number, number] = hiding ? [handAt[0], handAt[1] + 0.004, handAt[2] + 0.004] : [handAt[0] + (handAt[0] - shoulder[0]) * 0.16, handAt[1] + (handAt[1] - shoulder[1]) * 0.16, handAt[2] + (handAt[2] - shoulder[2]) * 0.16];
      add(figure, ball, flesh, palm, [0.016, 0.014, 0.012]);
      for (let k = 0; k < 4; k++) {
        const finger: [number, number, number] = hiding ? [palm[0] + (k - 1.5) * 0.0075, palm[1] - 0.008, palm[2] + 0.009] : [palm[0] + (k - 1.5) * 0.007 * (a.hands === 'wide' ? 0.3 : 1), palm[1] + 0.016, palm[2] + (a.hands === 'wide' ? (k - 1.5) * 0.007 : 0)];
        add(figure, ball, flesh, finger, [0.0042, hiding ? 0.011 : 0.012, 0.0042]);
      }
    }

    const head = new THREE.Group();
    head.position.set(0, headY, a.spring === 'lifting' ? 0.004 : 0);
    head.scale.setScalar(big * (a.spring === 'sprung' ? 1 : 0.84));
    figure.add(head);
    const R = HEAD_R;
    const onFace = (x: number, y: number, lift = 1): [number, number, number] => { const z = Math.sqrt(Math.max(0, 1 - x * x - y * y)); return [x * R * lift, y * R * lift, z * R * lift]; };
    if (a.head === 'empty') {
      add(figure, new THREE.CircleGeometry(0.019, 18), new THREE.MeshStandardMaterial({ color: '#050405', roughness: 1 }), [0, neckY + 0.014, 0]).rotation.x = -Math.PI / 2;
    } else {
      add(head, new THREE.SphereGeometry(R, 32, 22), headMaterial, [0, 0, 0], a.head === 'skull-jester' ? [0.92, 1.04, 1] : [1, 1, 1]);
      const second = s.material(theme.b, { roughness: 0.85 });
      if (a.head === 'clown') {
        const noseGone = wear > 0.7;
        add(head, ball, noseGone ? new THREE.MeshStandardMaterial({ color: '#1a1210', roughness: 1 }) : new THREE.MeshStandardMaterial({ color: '#c8201f', roughness: 0.3 }), onFace(0, -0.08, noseGone ? 0.99 : 1.08), noseGone ? [0.009, 0.011, 0.004] : [0.014, 0.014, 0.014]);
        const orange = s.material('#d2641c', { roughness: 0.95 });
        for (const side of [-1, 1]) for (let k = 0; k < (side === 1 && wear > 0.5 ? 2 : 6); k++) add(head, ball, orange, [side * (R * 0.92 + random() * 0.012), mix(-0.012, 0.03, random()), mix(-0.025, 0.012, random())], [0.016, 0.016, 0.016]);
        const hat = add(head, new THREE.ConeGeometry(0.022, 0.06, 14), cloth, [0.012, R + 0.022, 0]);
        hat.rotation.z = -0.3;
        add(head, ball, trim, [0.023, R + 0.053, 0], [0.009, 0.009, 0.009]);
      }
      if (a.head === 'vampire') {
        const black = s.material('#141216', { roughness: 0.5 });
        add(head, new THREE.SphereGeometry(R * 1.04, 22, 12, 0, 6.283, 0, 1.25), black).rotation.x = -0.5;
        for (const side of [-1, 1]) {
          const ear = add(head, new THREE.ConeGeometry(0.011, 0.034, 8), new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 }), [side * R * 1.0, 0.012, -0.004], [0.5, 1, 1]);
          ear.rotation.z = -side * 0.5;
          if (a.expression !== 'weeping' && !asleep) add(head, new THREE.ConeGeometry(0.0055, 0.02, 8), new THREE.MeshStandardMaterial({ color: '#f6f2e4', roughness: 0.3 }), onFace(side * 0.2, -0.46, 1.03)).rotation.x = Math.PI;
        }
        add(head, new THREE.ConeGeometry(0.008, 0.02, 8), new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 }), onFace(0, -0.1, 1.06)).rotation.x = Math.PI / 2;
        const collar = add(figure, new THREE.CylinderGeometry(0.085, 0.034, 0.085, 22, 1, true, Math.PI * 0.55, Math.PI * 1.9 - Math.PI), new THREE.MeshStandardMaterial({ color: '#7a1218', roughness: 0.6, side: THREE.DoubleSide }), [0, neckY + 0.042, 0]);
        collar.rotation.y = Math.PI * 1.0;
      }
      if (a.head === 'skull-jester') {
        add(head, new THREE.SphereGeometry(R * 1.05, 22, 12, 0, 6.283, 0, 1.15), cloth, [0, 0.002, 0], [0.94, 1.04, 1]).rotation.x = -0.35;
        add(head, new THREE.TorusGeometry(R * 0.93, 0.006, 6, 24), trim, [0, R * 0.42, -R * 0.14]).rotation.x = Math.PI / 2 - 0.35;
        const horns = 3;
        for (let k = 0; k < horns; k++) {
          const angle = (k / horns) * Math.PI * 2 + Math.PI / 2 + (random() - 0.5) * 0.3, reach = mix(0.07, 0.09, random()), droop = mix(0.0, 0.05, wear);
          const points = [new THREE.Vector3(Math.cos(angle) * 0.02, R * 0.85, Math.sin(angle) * 0.02 - 0.01), new THREE.Vector3(Math.cos(angle) * reach * 0.6, R + 0.045, Math.sin(angle) * reach * 0.6), new THREE.Vector3(Math.cos(angle) * reach, R + 0.03 - droop, Math.sin(angle) * reach), new THREE.Vector3(Math.cos(angle) * reach * 1.12, R - 0.005 - droop * 1.5, Math.sin(angle) * reach * 1.12)];
          add(head, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 14, 0.012, 8), k % 2 ? second : cloth);
          add(head, ball, s.material('#c9a23f', { metalness: 0.85, roughness: 0.3 }), points[3].toArray() as [number, number, number], [0.011, 0.011, 0.011]);
        }
      }
      if (a.head === 'zombie-baby') {
        const lace = new THREE.MeshStandardMaterial({ color: new THREE.Color('#efe9d8').lerp(new THREE.Color('#9c9684'), wear * 0.6), roughness: 0.95, side: THREE.DoubleSide });
        add(head, new THREE.SphereGeometry(R * 1.08, 22, 12, 0, 6.283, 0, 1.7), lace).rotation.x = -1.2;
        add(head, frill(R * 1.0, R * 1.36, -0.008, 16), lace, [0, 0.004, 0.012]).rotation.x = 0.25;
        add(head, new THREE.TorusGeometry(0.008, 0.003, 6, 12), s.material('#5b4a32'), onFace(0.05, 0.62, 1.04));
        add(head, ball, new THREE.MeshStandardMaterial({ color: '#8fa37e', roughness: 0.7 }), onFace(0, -0.1, 1.02), [0.008, 0.007, 0.008]);
        if (asleep) { add(head, new THREE.CylinderGeometry(0.017, 0.017, 0.004, 16), trim, onFace(0, -0.42, 1.05)).rotation.x = Math.PI / 2 - 0.4; add(head, new THREE.TorusGeometry(0.011, 0.003, 6, 14), trim, onFace(0, -0.46, 1.22)); }
      }
    }
    // Eyes that catch the light inside the box.
    const glints: THREE.MeshStandardMaterial[] = [];
    if (a.spring === 'lifting' || (a.head === 'skull-jester' && mood.cheer < 0.4)) {
      const glint = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: a.head === 'vampire' ? '#ff2a1a' : '#ffb347', emissiveIntensity: 2.6, roughness: 0.4 });
      glints.push(glint);
      for (const side of [-1, 1]) {
        const at: [number, number, number] = a.head === 'empty' ? [side * 0.018, headY + 0.03, 0.045] : (() => { const [x, y, z] = onFace(side * 0.37, 0.15, 1.01); return [x * big, headY + y * big, z * big] as [number, number, number]; })();
        add(a.head === 'empty' ? figure : head, ball, glint, a.head === 'empty' ? at : onFace(side * 0.37, 0.15, 1.0), [0.006, 0.006, 0.004]).castShadow = false;
      }
    }
    if (a.spring === 'lifting') head.rotation.x = -0.75;
    if (a.spring === 'peering') head.rotation.x = -0.2;

    const lean = a.spring === 'sprung' ? (random() - 0.5) * 0.4 : 0;
    jack.rotation.z = lean;
    jack.rotation.x = a.spring === 'sprung' ? mix(-0.02, 0.14, random()) : 0;
    if (a.spring === 'sprung') head.rotation.set(0.12, (random() - 0.5) * 0.5, -lean * 0.6);

    const energy = mood.energy, phase = random() * 6, crankSpeed = mix(1.2, 5, energy);
    const noteBase = notes.map((note) => note.position.y);
    return s.finish({
      update: (dt, time) => {
        if (a.spring === 'sprung') { jack.rotation.z = lean + Math.sin(time * 3.1 + phase) * mix(0.02, 0.2, energy); jack.rotation.x = Math.sin(time * 2.3 + phase) * mix(0.01, 0.1, energy); }
        else if (a.spring === 'peering') figure.position.y = Math.sin(time * 1.7 + phase) * 0.006 * energy;
        else lid.rotation.x = -lidAngle - Math.max(0, Math.sin(time * 1.3 + phase)) * 0.12 * energy;
        if (a.crank === 'turning') crank.rotation.x += dt * crankSpeed;
        notes.forEach((note, i) => { note.position.y = noteBase[i] + Math.sin(time * 2 + i * 1.7) * 0.008; note.rotation.z = Math.sin(time * 1.5 + i) * 0.3; });
        for (const glint of glints) glint.emissiveIntensity = 2.2 + Math.sin(time * 4 + phase) * 0.6;
      },
    });
  },
});
