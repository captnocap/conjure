import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;

export default defineThing({
  questions: {
    era: choice('What era is the telephone?', {
      crank: 'An early wooden box phone with two brass bells, a horn mouthpiece and a side crank.',
      bakelite: 'A heavy 1940s wall set, rounded and solid, with a metal dial.',
      rotary: 'A 1970s rotary wall phone in moulded plastic with a clear finger wheel.',
      pushbutton: 'A slim 1980s push-button phone, the handset covering most of it.',
    }),
    colour: choice('What colour is it?', {
      black: 'Black.',
      ivory: 'Yellowed ivory.',
      avocado: 'Avocado green.',
      gold: 'Harvest gold.',
      red: 'Hotline red.',
      blue: 'Powder blue.',
    }),
    receiver: choice('Where is the receiver?', {
      hung: 'Hung up where it belongs.',
      dangling: 'Dangling on its cord just above the floor, turning slowly.',
      ledge: 'Lying off the hook on top of the phone, the line left open.',
    }),
    cord: score('How long and tangled is the cord?', ['A short neat curl', 'Long enough to reach the kitchen', 'Absurdly long, knotted on itself and heaped on the floor']),
    wall: choice('What is the wall like?', {
      floral: 'Faded trellis-and-rose wallpaper.',
      geometric: 'Orange and brown 1970s circles.',
      stripe: 'Regency stripes in sage and cream.',
      woodchip: 'Woodchip paper painted magnolia.',
      tile: 'Kitchen wall: square tiles below, gloss paint above.',
    }),
    written: choice('What is pencilled on the wall beside it?', {
      list: 'A tidy family list of names and numbers.',
      crossed: 'A long list, nearly every entry struck through, one left.',
      circled: 'One number, ringed again and again.',
      doodles: 'Numbers lost among spirals, boxes and flowers doodled during long calls.',
    }),
    beside: choice('What else is fixed to the wall?', {
      shelf: 'A little shelf with the fat directory and a pencil on a string.',
      calendar: 'A calendar, one date ringed.',
      cork: 'A cork board of pinned notes and a takeaway menu.',
      ghost: 'Nothing now: only the pale rectangle where something hung.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const WW = 1.0, WH = 1.5, front = 0.035;
    const px = -0.17, py = 1.06;
    const canvas = (w: number, h: number, draw: (c: Ctx) => void) => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
    };
    const U = 600, X = (m: number) => (m + WW / 2) * U, Y = (m: number) => (WH - m) * U;

    const wallTex = canvas(WW * U, WH * U, (c) => {
      const w = WW * U, h = WH * U;
      if (a.wall === 'floral') {
        c.fillStyle = '#e4dcc0'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(120,140,100,0.55)'; c.lineWidth = 3;
        for (let i = -h; i < w + h; i += 90) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke(); }
        for (let y = 45; y < h; y += 90) for (let x = (Math.round(y / 90) % 2) * 45; x < w + 10; x += 90) { c.fillStyle = '#b8656a'; for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.26) * 8, y + Math.sin(p * 1.26) * 8, 8, 0, 7); c.fill(); } c.fillStyle = '#e2c66a'; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); }
      } else if (a.wall === 'geometric') {
        c.fillStyle = '#e8d9b0'; c.fillRect(0, 0, w, h);
        for (let y = 0; y < h + 100; y += 100) for (let x = (Math.round(y / 100) % 2) * 50; x < w + 100; x += 100) { for (const [r, col] of [[44, '#c9772a'], [32, '#6a3d1f'], [20, '#e3a94a'], [9, '#e8d9b0']] as const) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } }
      } else if (a.wall === 'stripe') {
        c.fillStyle = '#ebe5d0'; c.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 60) { c.fillStyle = '#a9b596'; c.fillRect(x, 0, 26, h); c.fillStyle = '#c9a85a'; c.fillRect(x + 36, 0, 3, h); }
      } else if (a.wall === 'woodchip') {
        c.fillStyle = '#ece0bf'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 2600; i++) { c.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(150,130,90,0.3)'; c.beginPath(); c.ellipse(random() * w, random() * h, 2 + random() * 4, 1 + random() * 2, random() * 3, 0, 7); c.fill(); }
      } else {
        c.fillStyle = mood.warmth > 0.5 ? '#e9d9a0' : '#c9dcd4'; c.fillRect(0, 0, w, h);
        const top = Y(0.95);
        for (let y = top; y < h; y += 66) for (let x = 0; x < w; x += 66) { c.fillStyle = (Math.round(x / 66) + Math.round(y / 66)) % 5 === 0 ? '#7fa9a0' : '#f1eee4'; c.fillRect(x + 2, y + 2, 62, 62); }
        c.fillStyle = '#b9b3a2'; for (let y = top; y < h; y += 66) c.fillRect(0, y, w, 3); for (let x = 0; x < w; x += 66) c.fillRect(x, top, 3, h - top);
      }
      // age: yellowing, a grubby halo of hands round the phone
      c.fillStyle = `rgba(150,120,60,${mood.wear * 0.16})`; c.fillRect(0, 0, w, h);
      const halo = c.createRadialGradient(X(px + 0.02), Y(py - 0.05), 30, X(px + 0.02), Y(py - 0.05), 190);
      halo.addColorStop(0, `rgba(90,70,45,${0.1 + mood.wear * 0.25})`); halo.addColorStop(1, 'rgba(90,70,45,0)'); c.fillStyle = halo; c.fillRect(0, 0, w, h);
      if (a.beside === 'ghost') { c.fillStyle = 'rgba(255,255,250,0.5)'; c.fillRect(X(0.1), Y(1.42), 0.3 * U, 0.26 * U); c.fillStyle = '#5a5248'; c.beginPath(); c.arc(X(0.25), Y(1.39), 4, 0, 7); c.fill(); }
      // pencil
      const pencil = a.wall === 'geometric' ? '#17120e' : '#3a3a42';
      c.fillStyle = pencil; c.strokeStyle = pencil; c.lineCap = 'round';
      const entries = ['Mum 4471', 'Dr Rao 2290', 'school 3318', 'Jean wk 5102', 'taxi 6000', 'Ruth 7745', 'vet 2816', 'Tom (new) 9034'];
      const lx = X(0.0), ly = Y(a.beside === 'shelf' ? 1.4 : 1.12);
      const hand = (size: number) => `italic bold ${size}px "Comic Sans MS", "Segoe Print", cursive, sans-serif`;
      c.textBaseline = 'middle';
      if (a.written === 'circled') {
        c.font = hand(44); c.save(); c.translate(lx + 20, ly + 70); c.rotate(-0.06); c.fillText('4471', 0, 0);
        c.lineWidth = 2.2; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(52 + (random() - 0.5) * 8, (random() - 0.5) * 6, 76 + random() * 12, 34 + random() * 8, (random() - 0.5) * 0.15, 0, 6.6); c.stroke(); }
        c.restore();
      } else {
        const n = a.written === 'list' ? 5 : a.written === 'crossed' ? 8 : 4;
        const keepOne = Math.floor(random() * n);
        for (let i = 0; i < n; i++) {
          c.font = hand(a.written === 'crossed' ? 27 : 33);
          const x = lx + (random() - 0.5) * 14, y = ly + i * (a.written === 'crossed' ? 37 : 48) + (a.written === 'doodles' ? i * 26 : 0);
          c.save(); c.translate(x, y); c.rotate((random() - 0.5) * 0.08); c.fillText(entries[i], 0, 0);
          if (a.written === 'crossed' && i !== keepOne) { c.lineWidth = 2.4; c.beginPath(); c.moveTo(-4, 2); c.lineTo(c.measureText(entries[i]).width + 6, -3); c.stroke(); }
          c.restore();
        }
        if (a.written === 'doodles') {
          c.lineWidth = 2;
          for (let i = 0; i < 12; i++) {
            const x = lx + random() * 0.4 * U, y = ly - 40 + random() * 0.5 * U, kind = i % 3;
            c.beginPath();
            if (kind === 0) for (let t = 0; t < 16; t += 0.2) { const r = t * 1.6; if (t === 0) c.moveTo(x, y); else c.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); }
            else if (kind === 1) { for (let k = 0; k < 3; k++) c.rect(x - 8 - k * 7, y - 8 - k * 7, 16 + k * 14, 16 + k * 14); }
            else { for (let p = 0; p < 6; p++) c.ellipse(x + Math.cos(p * 1.05) * 12, y + Math.sin(p * 1.05) * 12, 8, 5, p * 1.05, 0, 7); }
            c.stroke();
          }
        }
      }
    });
    const plaster = s.material('#d9d2c2');
    const slab = new THREE.Mesh(new THREE.BoxGeometry(WW, WH, 0.07), [plaster, plaster, plaster, plaster, new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 }), plaster]);
    slab.position.set(0, WH / 2, 0); slab.castShadow = slab.receiveShadow = true; s.root.add(slab);
    const trim = s.material('#efeadb', { roughness: 0.5 });
    s.box([WW, 0.13, 0.02], [0, 0.065, front + 0.01], trim); s.box([WW, 0.02, 0.028], [0, 0.14, front + 0.014], trim);

    const tone = { black: '#1c1c1f', ivory: '#e6dcbc', avocado: '#7d8a45', gold: '#d6a231', red: '#b8221f', blue: '#9dbfd6' }[a.colour];
    const shell = s.material(tone, { roughness: 0.3 });
    const dark = s.material('#1a1a1c', { roughness: 0.4 }), metal = s.material('#c9ccce', { metalness: 0.85, roughness: 0.25 }), brass = s.material('#c9a23f', { metalness: 0.85, roughness: 0.3 });
    const wood = s.material('#6a4326', { roughness: 0.5 });
    const phone = new THREE.Group(); phone.position.set(px, py, front); s.root.add(phone);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = phone) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };

    // Handset: origin at its middle, long axis x, cups toward -y, cord leaves at +x.
    const handset = new THREE.Group();
    let cordOut = new THREE.Vector3(0.105, -0.015, 0), handLen = 0.22;
    if (a.era === 'crank') {
      add(new THREE.CylinderGeometry(0.02, 0.024, 0.13, 14), dark, 0, 0, 0, handset).rotation.z = Math.PI / 2;
      add(new THREE.CylinderGeometry(0.042, 0.024, 0.035, 16), dark, -0.08, 0, 0, handset).rotation.z = Math.PI / 2;
      cordOut = new THREE.Vector3(0.07, 0, 0); handLen = 0.17;
    } else if (a.era === 'pushbutton') {
      add(new RoundedBoxGeometry(0.23, 0.045, 0.062, 3, 0.02), shell, 0, 0.012, 0, handset);
      for (const side of [-1, 1]) add(new RoundedBoxGeometry(0.06, 0.03, 0.062, 3, 0.012), shell, side * 0.085, -0.015, 0, handset);
      cordOut = new THREE.Vector3(0.115, -0.005, 0); handLen = 0.23;
    } else {
      const arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.085, 0, 0), new THREE.Vector3(-0.05, 0.028, 0), new THREE.Vector3(0.05, 0.028, 0), new THREE.Vector3(0.085, 0, 0)]), 16, a.era === 'bakelite' ? 0.019 : 0.016, 10), shell);
      arc.castShadow = true; handset.add(arc);
      for (const side of [-1, 1]) { add(new THREE.CylinderGeometry(0.034, 0.03, 0.04, 18), shell, side * 0.088, -0.015, 0, handset); add(new THREE.CylinderGeometry(0.026, 0.026, 0.004, 14), dark, side * 0.088, -0.036, 0, handset); }
    }

    // Body.
    let anchor = new THREE.Vector3(px - 0.04, py - 0.14, front + 0.03);
    let hookAt = new THREE.Vector3(px, py + 0.16, front + 0.075), hookRot = new THREE.Euler(0, 0, 0);
    if (a.era === 'crank') {
      add(new THREE.BoxGeometry(0.24, 0.5, 0.12), wood, 0, -0.02, 0.06);
      add(new THREE.BoxGeometry(0.27, 0.03, 0.14), wood, 0, 0.245, 0.065); add(new THREE.BoxGeometry(0.27, 0.03, 0.14), wood, 0, -0.285, 0.065);
      for (const side of [-1, 1]) { const bell = add(new THREE.SphereGeometry(0.04, 16, 10, 0, 6.3, 0, 1.6), brass, side * 0.05, 0.15, 0.125); bell.rotation.x = Math.PI / 2; }
      add(new THREE.SphereGeometry(0.008, 8, 6), dark, 0, 0.13, 0.15);
      add(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 8), dark, 0, 0.02, 0.16).rotation.x = Math.PI / 2 - 0.2;
      add(new THREE.CylinderGeometry(0.045, 0.018, 0.06, 16, 1, true), dark, 0, 0.035, 0.225).rotation.x = Math.PI / 2 - 0.2;
      const board = add(new THREE.BoxGeometry(0.24, 0.012, 0.14), wood, 0, -0.14, 0.17); board.rotation.x = 0.35;
      add(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 6), metal, 0.155, 0.0, 0.07).rotation.z = Math.PI / 2;
      add(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 6), metal, 0.19, -0.03, 0.07); add(new THREE.CylinderGeometry(0.011, 0.011, 0.05, 8), dark, 0.215, -0.06, 0.07).rotation.z = Math.PI / 2;
      add(new THREE.BoxGeometry(0.07, 0.01, 0.015), metal, -0.15, 0.06, 0.07);
      hookAt = new THREE.Vector3(px - 0.185, py - 0.02, front + 0.07); hookRot = new THREE.Euler(0, 0, Math.PI / 2);
      anchor = new THREE.Vector3(px - 0.1, py - 0.27, front + 0.06);
    } else if (a.era === 'pushbutton') {
      add(new RoundedBoxGeometry(0.1, 0.27, 0.045, 3, 0.02), shell, 0, 0, 0.022);
      const keys: { at: [number, number, number]; size: number }[] = [];
      for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) keys.push({ at: [px + (k - 1) * 0.024, py - 0.01 - r * 0.024, front + 0.047], size: 1 });
      s.scatter(new THREE.BoxGeometry(0.016, 0.014, 0.008), s.material('#f1eee4'), keys);
      add(new THREE.BoxGeometry(0.03, 0.03, 0.03), dark, 0, 0.095, 0.05);
      hookAt = new THREE.Vector3(px, py + 0.0, front + 0.085); hookRot = new THREE.Euler(Math.PI / 2, 0, Math.PI / 2);
      anchor = new THREE.Vector3(px, py - 0.135, front + 0.03);
    } else {
      const heavy = a.era === 'bakelite';
      add(new RoundedBoxGeometry(heavy ? 0.2 : 0.17, heavy ? 0.26 : 0.25, heavy ? 0.1 : 0.075, 4, heavy ? 0.045 : 0.025), shell, 0, 0, heavy ? 0.05 : 0.037);
      const dz = heavy ? 0.102 : 0.077;
      add(new THREE.CylinderGeometry(0.072, 0.072, 0.008, 28), heavy ? metal : s.material('#f1eee4'), 0, -0.03, dz).rotation.x = Math.PI / 2;
      const holes: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 10; i++) { const ang = -0.6 - i * 0.5; holes.push({ at: [px + Math.cos(ang) * 0.052, py - 0.03 + Math.sin(ang) * 0.052, front + dz + 0.006], size: 1 }); }
      s.scatter(new THREE.CylinderGeometry(0.0095, 0.0095, 0.004, 10).rotateX(Math.PI / 2), dark, holes);
      add(new THREE.CylinderGeometry(0.026, 0.026, 0.012, 16), heavy ? dark : shell, 0, -0.03, dz + 0.004).rotation.x = Math.PI / 2;
      add(new THREE.BoxGeometry(0.004, 0.03, 0.012), metal, 0.062, -0.075, dz + 0.008).rotation.z = 0.6;
      for (const side of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.05, 0.05), heavy ? shell : metal, side * 0.05, 0.135, dz - 0.02);
      hookAt = new THREE.Vector3(px, py + 0.175, front + dz - 0.012);
      anchor = new THREE.Vector3(px - 0.05, py - 0.13, front + 0.03);
    }

    // Where the receiver is, and so where the cord ends.
    const length = Math.min(1, a.cord * 0.85 + mood.density * 0.15);
    const swing = new THREE.Group(); swing.position.copy(anchor); s.root.add(swing);
    let end: THREE.Vector3;
    if (a.receiver === 'dangling') {
      const drop = mix(0.42, anchor.y - 0.16 - handLen, Math.min(1, length * 1.4));
      handset.position.set(0.05 + random() * 0.05, -drop - handLen / 2, 0.035); handset.rotation.set(0, random() * 2, Math.PI / 2 + (random() - 0.5) * 0.25);
      swing.add(handset);
      end = new THREE.Vector3(handset.position.x, -drop, 0.035);
    } else {
      if (a.receiver === 'ledge') { hookAt = hookAt.clone().add(new THREE.Vector3(a.era === 'crank' ? 0.19 : 0.03, a.era === 'crank' ? 0.31 : a.era === 'pushbutton' ? 0.17 : 0.035, a.era === 'crank' ? 0 : -0.02)); hookRot = new THREE.Euler(a.era === 'pushbutton' ? 0 : 0.5, 0, a.era === 'crank' ? 0 : -0.12 - random() * 0.2); }
      handset.position.copy(hookAt).sub(anchor); handset.rotation.copy(hookRot);
      swing.add(handset); handset.updateMatrix();
      end = cordOut.clone().applyMatrix4(handset.matrix);
      if (a.era === 'crank' && a.receiver === 'hung') end = new THREE.Vector3(handset.position.x, handset.position.y - 0.07, handset.position.z);
    }

    // The cord: a path from the phone to the receiver, then a coil wound round that path.
    const floorY = -anchor.y + 0.02;
    const path: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.005, -0.06, 0.01)];
    if (a.receiver === 'dangling') {
      const side = mix(0.02, 0.12, length);
      path.push(new THREE.Vector3(side * 0.6, end.y * 0.35, 0.03), new THREE.Vector3(end.x + (length > 0.6 ? 0.06 : 0), end.y * 0.7, 0.035));
      if (length > 0.6) { for (let i = 0; i < 6; i++) { const ang = i / 6 * 6.283; path.push(new THREE.Vector3(end.x + 0.06 + Math.cos(ang) * 0.05 - 0.05, end.y * 0.82 + Math.sin(ang) * 0.05, 0.035 + (i % 2) * 0.02)); } }
      path.push(new THREE.Vector3(end.x, end.y + 0.03, 0.035), end);
    } else {
      const sag = mix(0.22, anchor.y + 0.25, length), low = Math.max(-sag, floorY);
      const bx = mix(0.08, 0.3, length) * (random() < 0.5 ? 1 : 0.7);
      path.push(new THREE.Vector3(0.02, low * 0.55, 0.03));
      if (-sag < floorY) {
        const heap = 3 + Math.round(length * 4);
        path.push(new THREE.Vector3(bx * 0.4, floorY + 0.03, 0.06));
        for (let i = 0; i < heap; i++) { const ang = i * 1.9 + random(); path.push(new THREE.Vector3(bx + Math.cos(ang) * (0.06 + random() * 0.07), floorY + (i % 2) * 0.012, 0.16 + Math.sin(ang) * 0.09)); }
      } else {
        path.push(new THREE.Vector3(bx * 0.6, low, 0.045));
        if (length > 0.45) for (let i = 0; i < 6; i++) { const ang = i / 6 * 6.283 - 1.5; path.push(new THREE.Vector3(bx + Math.cos(ang) * 0.055, low + 0.05 + Math.sin(ang) * 0.055, 0.045 + (i % 2) * 0.02)); }
        path.push(new THREE.Vector3(bx * 1.3 + 0.05, low + 0.02, 0.045));
      }
      path.push(new THREE.Vector3(mix(bx * 1.2, end.x, 0.6) + 0.06, mix(low, end.y, 0.55), 0.04), new THREE.Vector3(end.x + 0.012, end.y - 0.05, end.z), end);
    }
    const spine = new THREE.CatmullRomCurve3(path, false, 'centripetal');
    const cordMat = a.era === 'crank' ? s.material('#5a3a22', { roughness: 1 }) : s.material(a.colour === 'ivory' ? '#d9cfae' : tone, { roughness: 0.5 });
    if (a.era === 'crank') {
      const m = new THREE.Mesh(new THREE.TubeGeometry(spine, 80, 0.006, 6), cordMat); m.castShadow = true; swing.add(m);
    } else {
      const total = spine.getLength(), stretch = a.receiver === 'dangling' ? 1.5 : 1;
      const turns = Math.min(170, Math.round(total / (0.016 * stretch))), samples = turns * 9, radius = a.receiver === 'dangling' ? 0.011 : 0.014;
      const coil: THREE.Vector3[] = [];
      const zAxis = new THREE.Vector3(0, 0, 1), n = new THREE.Vector3(), b = new THREE.Vector3();
      for (let i = 0; i <= samples; i++) {
        const t = i / samples, p = spine.getPointAt(t), tan = spine.getTangentAt(t);
        n.crossVectors(zAxis, tan); if (n.lengthSq() < 1e-4) n.set(1, 0, 0); n.normalize(); b.crossVectors(tan, n);
        const ang = t * turns * 6.2832, r = radius * Math.min(1, Math.min(t, 1 - t) * 40);
        coil.push(p.addScaledVector(n, Math.cos(ang) * r).addScaledVector(b, Math.sin(ang) * r));
      }
      const curve = new THREE.CatmullRomCurve3(coil); curve.arcLengthDivisions = samples * 3;
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, samples, 0.0042, 5), cordMat); m.castShadow = true; swing.add(m);
    }

    // What else is on the wall.
    if (a.beside === 'shelf') {
      s.box([0.34, 0.02, 0.14], [0.27, 0.92, front + 0.07], trim);
      for (const x of [0.14, 0.4]) s.box([0.015, 0.09, 0.1], [x, 0.87, front + 0.05], trim);
      s.box([0.2, 0.05, 0.12], [0.25, 0.955, front + 0.07], s.material('#e8c53a')).rotation.y = 0.12;
      s.box([0.2, 0.012, 0.12], [0.27, 0.988, front + 0.07], s.material('#e9e2cc')).rotation.y = -0.2;
      s.rod([0.43, 0.93, front + 0.13], [0.435, 0.68, front + 0.12], 0.0025, s.material('#d9cdb0'));
      s.cylinder(0.005, 0.005, 0.11, [0.44, 0.63, front + 0.12], s.material('#d9a521'), 6).rotation.z = 0.12;
    } else if (a.beside === 'calendar') {
      const cal = canvas(256, 320, (c) => {
        c.fillStyle = mood.cheer > 0.5 ? '#6fa3c9' : '#8a9a7a'; c.fillRect(0, 0, 256, 130); c.fillStyle = '#e9e2c6'; c.beginPath(); c.arc(190, 50, 26, 0, 7); c.fill(); c.fillStyle = '#4f6a4a'; c.beginPath(); c.moveTo(0, 130); c.lineTo(80, 60); c.lineTo(150, 110); c.lineTo(210, 80); c.lineTo(256, 130); c.fill();
        c.fillStyle = '#f7f4ea'; c.fillRect(0, 130, 256, 190); c.fillStyle = '#b8221f'; c.fillRect(0, 130, 256, 26);
        c.fillStyle = '#33333a'; c.font = '13px sans-serif'; for (let d = 0; d < 31; d++) c.fillText(String(d + 1), 14 + (d % 7) * 34, 182 + Math.floor(d / 7) * 30);
        const d = Math.floor(random() * 31); c.strokeStyle = '#b8221f'; c.lineWidth = 3; c.beginPath(); c.arc(21 + (d % 7) * 34, 177 + Math.floor(d / 7) * 30, 13, 0, 7); c.stroke();
      });
      s.mesh(new THREE.PlaneGeometry(0.26, 0.33), new THREE.MeshStandardMaterial({ map: cal, roughness: 0.8 }), [0.27, 1.3, front + 0.004]).rotation.z = (random() - 0.5) * 0.06;
    } else if (a.beside === 'cork') {
      s.box([0.36, 0.28, 0.015], [0.26, 1.32, front + 0.008], s.material('#b98d5a', { roughness: 1 }));
      for (const [w, h, x, y] of [[0.36, 0.02, 0.26, 1.46], [0.36, 0.02, 0.26, 1.18], [0.02, 0.3, 0.08, 1.32], [0.02, 0.3, 0.44, 1.32]]) s.box([w, h, 0.022], [x, y, front + 0.011], wood);
      const notes = ['#f7f1a0', '#f4f1e8', '#f2b6c0', '#bfe0c9', '#f4f1e8', '#c9302b'];
      for (let i = 0; i < 3 + Math.round(mood.density * 3); i++) {
        const x = 0.14 + random() * 0.24, y = 1.24 + random() * 0.16;
        s.box([0.07 + random() * 0.04, 0.07 + random() * 0.05, 0.002], [x, y, front + 0.018 + i * 0.002], s.material(notes[i])).rotation.z = (random() - 0.5) * 0.4;
        s.ball([0.006, 0.006, 0.006], [x, y + 0.03, front + 0.024 + i * 0.002], s.material(['#c9302b', '#2f6fb0', '#e0b22a'][i % 3]), 8);
      }
    }

    const sway = mix(0.1, 1, mood.energy);
    const thing = s.finish({ update: a.receiver === 'dangling' ? (_dt, time) => { swing.rotation.z = Math.sin(time * 1.6) * 0.035 * sway; handset.rotation.y += 0.004 * sway; } : undefined });
    return thing;
  },
});
