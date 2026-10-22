import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;

export default defineThing({
  questions: {
    style: choice('What kind of upright is it?', {
      victorian: 'A tall Victorian upright with turned legs and brass candle sconces.',
      school: 'A plain sturdy mid-century upright, the kind in every school hall.',
      spinet: 'A low 1960s spinet on slim tapered legs.',
      honkytonk: 'A big old pub piano with its front panel off, hammers and strings on show.',
    }),
    finish: choice('What is the case finished in?', {
      ebony: 'Black polish, glossy where it is not dusty.',
      walnut: 'Figured brown walnut.',
      mahogany: 'Red mahogany.',
      oak: 'Honey-coloured oak.',
      painted: 'Painted over in chalky white by a later owner.',
    }),
    story: choice('What is its story?', {
      daily: 'Played daily: stool pulled out, books of music piled beside it.',
      untouched: 'Untouched for years: a lace runner on top, the stool tucked in tight.',
      unmovable: 'The one thing nobody could move: a removal blanket and a strap on it, and a note taped to the front.',
      lessons: "A child's lessons: coloured stickers on the keys and a cushion to reach them.",
    }),
    lid: choice('Is the lid over the keys open?', {
      open: 'Open, the keys bare.',
      closed: 'Closed over the keys.',
    }),
    music: choice('What is on the music stand?', {
      hymns: 'A fat hymn book held open.',
      manuscript: 'Loose handwritten manuscript pages.',
      primer: "A beginner's primer with huge notes.",
      songbook: 'A bright songbook of show tunes.',
      nothing: 'Nothing.',
    }),
    top: choice('What stands on top?', {
      photos: 'A row of framed family photographs.',
      metronome: 'A wooden metronome and a stack of music.',
      flowers: 'A vase of dried flowers.',
      ghosts: 'Nothing, only clean rectangles in the dust where frames stood.',
      nothing: 'Nothing at all.',
    }),
    seat: choice('What is there to sit on?', {
      stool: 'A round screw-top piano stool.',
      bench: 'A long padded duet bench.',
      chair: 'An ordinary dining chair borrowed for the job.',
      none: 'Nothing: the stool has already gone.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dim = { victorian: [1.46, 1.3, 0.72], school: [1.42, 1.14, 0.7], spinet: [1.4, 0.94, 0.66], honkytonk: [1.52, 1.34, 0.73] }[a.style];
    const [W, H, keyH] = dim;
    const dusty = a.story === 'untouched' ? 0.3 : 0.08;
    const tone = { ebony: '#1b1a1c', walnut: '#6a4326', mahogany: '#7a2f1e', oak: '#c0924f', painted: '#e9e4d6' }[a.finish];
    const canvas = (w: number, h: number, draw: (c: Ctx) => void, repeat?: [number, number]) => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
      return t;
    };
    const grain = (c: Ctx, w: number, h: number) => {
      const col = new THREE.Color(tone).lerp(new THREE.Color('#9a958a'), dusty * 0.6 + mood.wear * 0.15);
      c.fillStyle = `#${col.getHexString()}`; c.fillRect(0, 0, w, h);
      if (a.finish !== 'ebony' && a.finish !== 'painted') for (let i = 0; i < 70; i++) {
        c.strokeStyle = `rgba(${random() < 0.5 ? '30,12,4' : '255,220,160'},${0.06 + random() * 0.1})`; c.lineWidth = 1 + random() * 2;
        const x = random() * w; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + (random() - 0.5) * 30, h * 0.3, x + (random() - 0.5) * 30, h * 0.6, x + (random() - 0.5) * 16, h); c.stroke();
      }
      if (a.finish === 'painted') for (let i = 0; i < 12 + mood.wear * 40; i++) { c.fillStyle = 'rgba(90,60,35,0.5)'; c.fillRect(random() * w, random() * h, 2 + random() * 9, 1 + random() * 3); }
    };
    const woodTex = canvas(256, 256, (c) => grain(c, 256, 256));
    const wood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: a.finish === 'ebony' ? 0.22 + dusty : a.finish === 'painted' ? 0.9 : 0.42 + dusty, metalness: 0 });
    const panelTex = canvas(512, 256, (c) => {
      grain(c, 512, 256);
      c.strokeStyle = a.finish === 'ebony' ? 'rgba(255,255,255,0.14)' : 'rgba(20,8,2,0.4)'; c.lineWidth = 4;
      if (a.style === 'victorian') { for (const x of [24, 190, 356]) c.strokeRect(x, 26, 132, 204); c.strokeStyle = 'rgba(200,160,70,0.6)'; c.lineWidth = 2; c.beginPath(); c.ellipse(256, 128, 34, 60, 0, 0, 7); c.stroke(); c.beginPath(); c.ellipse(256, 128, 20, 40, 0, 0, 7); c.stroke(); }
      else c.strokeRect(18, 20, 476, 216);
    });
    const panel = new THREE.MeshStandardMaterial({ map: panelTex, roughness: wood.roughness });
    const brass = s.material('#c9a23f', { metalness: 0.85, roughness: 0.3 });
    const ivoryCol = new THREE.Color('#f5f1e4').lerp(new THREE.Color('#d8bf7a'), mood.wear * 0.7);
    const black = s.material('#141416', { roughness: 0.3 });
    const zBack = -0.3, zFace = 0.06, zKey = 0.36, T = 0.045;

    // Case: carcass, cheeks, lid, lower panel.
    s.box([W - T * 2, H - 0.03, zFace - zBack - 0.03], [0, (H - 0.03) / 2, (zBack + zFace - 0.03) / 2], wood);
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape();
      shape.moveTo(zBack, 0); shape.lineTo(zBack, H); shape.lineTo(zFace + 0.02, H); shape.lineTo(zFace + 0.02, keyH + 0.16);
      shape.quadraticCurveTo(zFace + 0.04, keyH + 0.07, zKey, keyH + 0.045); shape.lineTo(zKey + 0.01, keyH - 0.08); shape.lineTo(zFace + 0.06, keyH - 0.13);
      shape.lineTo(zFace + 0.03, 0); shape.lineTo(zBack, 0);
      const cheek = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false }), wood, [side > 0 ? W / 2 : -W / 2 + T, 0, 0]);
      cheek.rotation.y = -Math.PI / 2;
    }
    s.box([W + 0.05, 0.035, zFace - zBack + 0.07], [0, H + 0.0175, (zBack + zFace) / 2 + 0.02], wood);
    const lower = s.mesh(new THREE.PlaneGeometry(W - T * 2, keyH - 0.2), panel, [0, (keyH - 0.2) / 2 + 0.08, zFace + 0.001]);
    lower.castShadow = false;
    s.box([W - T * 2, 0.08, 0.05], [0, 0.04, zFace + 0.01], wood);
    const pedals = a.style === 'spinet' || a.style === 'school' ? 2 : 3;
    for (let i = 0; i < pedals; i++) {
      const x = (i - (pedals - 1) / 2) * 0.13;
      s.box([0.035, 0.012, 0.12], [x, 0.045, zFace + 0.08], brass).rotation.x = 0.18;
      s.ball([0.022, 0.008, 0.03], [x, 0.036, zFace + 0.14], brass, 10);
    }

    // Upper front: panel, or the bare action.
    const upH = H - keyH - 0.18;
    if (a.style === 'honkytonk') {
      const action = canvas(512, 256, (c) => {
        c.fillStyle = '#2a211a'; c.fillRect(0, 0, 512, 256);
        c.fillStyle = '#b08a3a'; c.fillRect(0, 0, 512, 36); c.fillRect(0, 150, 512, 10);
        for (let x = 6; x < 512; x += 5.8) { c.strokeStyle = x < 150 ? '#b97a4a' : '#d9d6cc'; c.lineWidth = x < 150 ? 1.8 : 0.9; c.beginPath(); c.moveTo(x, 6); c.lineTo(x + (x - 256) * 0.05, 250); c.stroke(); c.fillStyle = '#e2ddd0'; c.fillRect(x - 1.5, 10 + (x % 3) * 6, 3, 3); }
        c.fillStyle = '#6a4a2c'; c.fillRect(0, 176, 512, 14);
        for (let x = 6; x < 512; x += 5.8) { c.fillStyle = '#efe9da'; c.fillRect(x - 2, 160, 4.4, 15); c.fillStyle = '#a13a30'; c.fillRect(x - 2, 173, 4.4, 4); c.fillStyle = '#8a6a44'; c.fillRect(x - 1, 190, 2, 50); }
      });
      s.mesh(new THREE.PlaneGeometry(W - T * 2, upH), new THREE.MeshStandardMaterial({ map: action, roughness: 0.6, metalness: 0.2 }), [0, keyH + 0.18 + upH / 2, zFace - 0.027]).castShadow = false;
      s.box([W - T * 2, 0.07, 0.06], [0, H - 0.035, zFace - 0.0], wood);
      s.box([W - T * 2, 0.03, 0.05], [0, keyH + 0.2, zFace - 0.005], wood);
    } else {
      s.mesh(new THREE.PlaneGeometry(W - T * 2, upH), panel, [0, keyH + 0.18 + upH / 2, zFace - 0.028]).castShadow = false;
      s.box([W - T * 2, upH, 0.02], [0, keyH + 0.18 + upH / 2, zFace - 0.04], wood);
    }

    // Keybed, keys, fallboard.
    const KW = W - T * 2 - 0.1;
    s.box([W - T * 2, 0.07, zKey - zFace + 0.02], [0, keyH - 0.055, (zKey + zFace) / 2 + 0.01], wood);
    for (const side of [-1, 1]) s.box([0.05, 0.05, 0.19], [side * (KW / 2 + 0.025), keyH + 0.005, zKey - 0.1], wood);
    const whites = 52, pitch = KW / whites;
    const missing = new Set<number>(); for (let i = 0; i < Math.floor(mood.wear * 5); i++) missing.add(Math.floor(random() * whites));
    const keyTex = canvas(1024, 64, (c) => {
      c.fillStyle = `#${ivoryCol.getHexString()}`; c.fillRect(0, 0, 1024, 64);
      for (let i = 0; i < whites; i++) {
        const x = (i / whites) * 1024;
        if (missing.has(i)) { c.fillStyle = '#7a6040'; c.fillRect(x, 0, 1024 / whites, 64); }
        else if (random() < mood.wear * 0.5) { c.fillStyle = 'rgba(170,130,60,0.3)'; c.fillRect(x, 0, 1024 / whites, 64); }
        c.fillStyle = 'rgba(30,25,20,0.75)'; c.fillRect(x - 1, 0, 2, 64);
        if (a.story === 'lessons' && i > 16 && i < 36) { c.fillStyle = ['#e23d3d', '#f08a1d', '#f2d21f', '#3aa655', '#2f7fd6', '#7a4fc9', '#e26aa8'][i % 7]; c.beginPath(); c.arc(x + 512 / whites, 16, 6.5, 0, 7); c.fill(); }
      }
    });
    const keyMats = [black, black, new THREE.MeshStandardMaterial({ map: keyTex, roughness: 0.35 }), black, new THREE.MeshStandardMaterial({ color: ivoryCol, roughness: 0.35 }), black];
    const closed = a.lid === 'closed';
    if (!closed) {
      const keys = new THREE.Mesh(new THREE.BoxGeometry(KW, 0.025, 0.15), keyMats); keys.position.set(0, keyH - 0.006, zKey - 0.08); keys.castShadow = keys.receiveShadow = true; s.root.add(keys);
      const sharps: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < whites - 1; i++) if (![1, 4].includes(i % 7)) sharps.push({ at: [-KW / 2 + (i + 1) * pitch, keyH + 0.012, zKey - 0.115], size: 1 });
      s.scatter(new THREE.BoxGeometry(pitch * 0.55, 0.016, 0.085), black, sharps);
      s.box([KW + 0.1, 0.15, 0.018], [0, keyH + 0.085, zFace + 0.035], wood).rotation.x = -0.1;
      s.label(a.style === 'spinet' ? 'Melodia' : 'Hartley & Sons', 0.26, 0.035, [0, keyH + 0.095, zFace + 0.047], '#c9a23f', tone === '#e9e4d6' ? '#e9e4d6' : tone).rotation.x = -0.1;
      s.box([KW, 0.012, 0.012], [0, keyH + 0.012, zKey - 0.158], s.material('#8a2222'));
    } else {
      const fall = s.box([KW, 0.02, 0.21], [0, keyH + 0.045, zKey - 0.115], wood); fall.rotation.x = 0.26;
      s.box([KW, 0.05, 0.02], [0, keyH + 0.0, zKey - 0.01], wood);
      s.cylinder(0.012, 0.012, 0.006, [0, keyH + 0.03, zKey - 0.03], brass, 12).rotation.x = Math.PI / 2 + 0.26;
    }

    // Legs and trim by style.
    const legZ = zKey - 0.05;
    for (const side of [-1, 1]) {
      const x = side * (W / 2 - 0.05);
      if (a.style === 'victorian') {
        s.lathe([[0.02, 0], [0.045, 0.02], [0.05, 0.08], [0.03, 0.12], [0.042, 0.2], [0.034, 0.36], [0.05, 0.44], [0.03, 0.5], [0.045, keyH - 0.16], [0.05, keyH - 0.09]], wood, [x, 0, legZ]);
        const sx = side * 0.42, sy = keyH + 0.18 + upH * 0.45, sz = zFace - 0.02;
        s.tube([[sx, sy, sz], [sx, sy - 0.03, sz + 0.07], [sx, sy + 0.01, sz + 0.11]], 0.007, brass);
        s.cylinder(0.028, 0.012, 0.02, [sx, sy + 0.02, sz + 0.11], brass, 12);
        s.cylinder(0.011, 0.011, 0.1 - mood.wear * 0.05, [sx, sy + 0.08 - mood.wear * 0.025, sz + 0.11], s.material('#efe8d2'), 10);
      } else if (a.style === 'spinet') {
        s.rod([x - side * 0.02, 0, legZ + 0.02], [x - side * 0.01, keyH - 0.09, legZ - 0.02], 0.016, wood, 0.03);
        s.cylinder(0.018, 0.016, 0.03, [x - side * 0.02, 0.015, legZ + 0.02], brass, 10);
      } else {
        s.box([0.07, keyH - 0.09, 0.07], [x, (keyH - 0.09) / 2, legZ], wood);
        s.box([0.085, 0.06, 0.16], [x, 0.03, legZ - 0.05], wood);
      }
    }

    // Music desk and what is on it.
    const deskY = keyH + (closed ? 0.26 : 0.24), deskZ = zFace;
    s.box([0.66, 0.018, 0.06], [0, deskY, deskZ + 0.035], wood);
    if (a.music !== 'nothing') {
      const pageTex = (big: boolean, hand: boolean) => canvas(128, 160, (c) => {
        c.fillStyle = hand ? '#efe6cc' : '#f6f2e6'; c.fillRect(0, 0, 128, 160);
        const staves = big ? 3 : 6;
        for (let k = 0; k < staves; k++) {
          const y0 = 18 + k * (136 / staves);
          c.strokeStyle = '#30302e'; c.lineWidth = 0.8; for (let l = 0; l < 5; l++) { c.beginPath(); c.moveTo(8, y0 + l * (big ? 5 : 2.6)); c.lineTo(120, y0 + l * (big ? 5 : 2.6)); c.stroke(); }
          c.fillStyle = hand ? '#27306a' : '#161616';
          for (let n = 0; n < (big ? 5 : 11); n++) { const x = 16 + n * (big ? 22 : 9.6) + random() * 3, y = y0 + random() * (big ? 20 : 10); c.beginPath(); c.ellipse(x, y, big ? 4.5 : 2.2, big ? 3.4 : 1.7, -0.4, 0, 7); c.fill(); c.fillRect(x + (big ? 3.4 : 1.6), y - (big ? 16 : 9), 1, big ? 16 : 9); }
        }
      });
      const pw = a.music === 'manuscript' ? 0.2 : 0.17, ph = a.music === 'hymns' ? 0.2 : 0.27;
      const lean = -0.18;
      const count = a.music === 'manuscript' ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const x = a.music === 'manuscript' ? (i - 1) * (pw + 0.004) + (random() - 0.5) * 0.02 : (i - 0.5) * pw;
        const page = s.mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: pageTex(a.music === 'primer', a.music === 'manuscript'), roughness: 0.9, side: THREE.DoubleSide }), [x, deskY + 0.01 + ph / 2, deskZ + 0.038 - 0.006]);
        page.rotation.set(lean, a.music === 'manuscript' ? 0 : (i ? -0.16 : 0.16), a.music === 'manuscript' ? (random() - 0.5) * 0.08 : 0);
      }
      if (a.music === 'hymns' || a.music === 'songbook') {
        const cover = s.box([pw * 2 + 0.02, ph + 0.012, a.music === 'hymns' ? 0.03 : 0.008], [0, deskY + 0.01 + ph / 2, deskZ + 0.012], s.material(a.music === 'hymns' ? '#5a1f2a' : mood.cheer > 0.4 ? '#e8b021' : '#3a6fa8'));
        cover.rotation.x = lean;
      }
    }

    // On top.
    const topY = H + 0.035, topZ = (zBack + zFace) / 2 + 0.02;
    const blanket = a.story === 'unmovable';
    const x0 = blanket ? -W * 0.12 : -W / 2 + 0.15, x1 = W / 2 - 0.15;
    let pendulum: THREE.Object3D | null = null;
    if (a.story === 'untouched') {
      const lace = canvas(256, 64, (c) => { c.fillStyle = '#f2eee2'; c.fillRect(0, 0, 256, 64); c.fillStyle = 'rgba(150,140,120,0.35)'; for (let x = 4; x < 256; x += 8) for (let y = 4; y < 64; y += 8) { c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill(); } });
      const laceMat = new THREE.MeshStandardMaterial({ map: lace, roughness: 1, side: THREE.DoubleSide });
      s.box([W + 0.06, 0.004, 0.24], [0, topY + 0.002, topZ], laceMat);
      for (const side of [-1, 1]) { const drop = new THREE.Shape(); drop.moveTo(-0.12, 0); drop.lineTo(0.12, 0); drop.lineTo(0.12, -0.14); drop.lineTo(0, -0.22); drop.lineTo(-0.12, -0.14); const m = s.mesh(new THREE.ShapeGeometry(drop), laceMat, [side * (W / 2 + 0.031), topY, topZ]); m.rotation.y = Math.PI / 2; }
    }
    if (a.top === 'photos') {
      const n = 3 + Math.round(mood.density * 2);
      for (let i = 0; i < n; i++) {
        const fw = 0.11 + random() * 0.07, fh = fw * (random() < 0.3 ? 0.75 : 1.3), x = mix(x0, x1, (i + 0.5) / n) + (random() - 0.5) * 0.04, z = topZ + (random() - 0.5) * 0.08;
        const g = new THREE.Group(); g.position.set(x, topY + 0.004, z); g.rotation.y = (random() - 0.5) * 0.7; s.root.add(g);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.014), random() < 0.5 ? brass : s.material(['#2a2420', '#d8d2c4', '#6b4a2e'][i % 3])); frame.position.set(0, fh / 2 * Math.cos(0.2), 0); frame.rotation.x = -0.2; frame.castShadow = true; g.add(frame);
        const pic = canvas(48, 64, (c) => { const sepia = random() < 0.5; c.fillStyle = sepia ? '#cdb994' : '#aebfca'; c.fillRect(0, 0, 48, 64); c.fillStyle = sepia ? '#5a4630' : '#34404a'; const heads = 1 + Math.floor(random() * 3); for (let h = 0; h < heads; h++) { const hx = 24 + (h - (heads - 1) / 2) * 13; c.beginPath(); c.arc(hx, 26, 6, 0, 7); c.fill(); c.beginPath(); c.ellipse(hx, 52, 8, 16, 0, 0, 7); c.fill(); } });
        const face = new THREE.Mesh(new THREE.PlaneGeometry(fw - 0.026, fh - 0.026), new THREE.MeshStandardMaterial({ map: pic, roughness: 0.4 })); face.position.z = 0.0075; frame.add(face);
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.02, fh * 0.8, 0.004), black); strut.position.set(0, fh * 0.36, -0.035); strut.rotation.x = 0.28; g.add(strut);
      }
    } else if (a.top === 'metronome') {
      const mx = mix(x0, x1, 0.3), mw = s.material('#7a4a26', { roughness: 0.4 });
      const body = s.mesh(new THREE.CylinderGeometry(0.022, 0.065, 0.22, 4), mw, [mx, topY + 0.11, topZ]); body.rotation.y = Math.PI / 4;
      s.box([0.035, 0.15, 0.004], [mx, topY + 0.11, topZ + 0.034], s.material('#e9dfc2')).rotation.x = -0.19;
      const arm = new THREE.Group(); arm.position.set(mx, topY + 0.045, topZ + 0.05); s.root.add(arm);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 6), brass); rod.position.y = 0.1; arm.add(rod);
      const bob = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.026, 0.012), brass); bob.position.y = 0.13; arm.add(bob);
      arm.rotation.z = 0.3; arm.rotation.x = -0.19; pendulum = arm;
      for (let i = 0; i < 5; i++) s.box([0.23, 0.012 + random() * 0.012, 0.31], [mix(x0, x1, 0.75) + (random() - 0.5) * 0.03, topY + 0.01 + i * 0.022, topZ], s.material(['#e9e2cc', '#b9c7d0', '#e2c9a0', '#d7d2c6', '#c98a7a'][i])).rotation.y = (random() - 0.5) * 0.3;
    } else if (a.top === 'flowers') {
      const vx = mix(x0, x1, 0.5);
      s.lathe([[0.035, 0], [0.06, 0.05], [0.07, 0.12], [0.035, 0.2], [0.03, 0.24], [0.04, 0.26]], s.material(mood.cheer > 0.5 ? '#3f7fa6' : '#6f7a66', { roughness: 0.3 }), [vx, topY, topZ]);
      const heads: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 9; i++) {
        const ang = random() * 6.3, lean = 0.05 + random() * 0.12, h = 0.2 + random() * 0.18;
        const tip: [number, number, number] = [vx + Math.cos(ang) * lean, topY + 0.26 + h, topZ + Math.sin(ang) * lean * 0.6];
        s.rod([vx, topY + 0.24, topZ], tip, 0.003, s.material('#8a7a4a'));
        heads.push({ at: tip, size: 0.02 + random() * 0.02, color: ['#b98a5a', '#c9a9a0', '#d8c690', '#8a6a7a'][i % 4] });
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 1 }), heads);
    } else if (a.top === 'ghosts') {
      const clean = new THREE.MeshStandardMaterial({ color: new THREE.Color(tone).multiplyScalar(a.finish === 'painted' ? 1 : 0.8), roughness: 0.15 });
      const dust = new THREE.MeshStandardMaterial({ color: '#a8a296', roughness: 1, transparent: true, opacity: 0.55 });
      s.box([W + 0.02, 0.002, zFace - zBack + 0.04], [0, topY + 0.001, (zBack + zFace) / 2 + 0.02], dust).castShadow = false;
      for (let i = 0; i < 4; i++) { const m = s.box([0.1 + random() * 0.08, 0.002, 0.05 + random() * 0.03], [mix(x0, x1, (i + 0.5) / 4), topY + 0.003, topZ + (random() - 0.5) * 0.1], clean); m.rotation.y = (random() - 0.5) * 0.6; m.castShadow = false; }
    }

    // Story dressing.
    const seatZ = zKey + (a.story === 'daily' ? 0.42 : a.story === 'untouched' ? 0.1 : 0.3);
    const seatTurn = a.story === 'daily' ? 0.35 + random() * 0.4 : (random() - 0.5) * 0.1;
    const seat = new THREE.Group(); seat.position.set(a.story === 'daily' ? 0.12 : 0, 0, seatZ); seat.rotation.y = seatTurn; s.root.add(seat);
    const part = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; seat.add(m); return m; };
    const pad = s.material(a.finish === 'ebony' ? '#5a1f2a' : '#3f5a48', { roughness: 0.9 });
    let seatTop = 0;
    if (a.seat === 'stool') {
      part(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 28), pad, 0, 0.5, 0); part(new THREE.CylinderGeometry(0.175, 0.15, 0.03, 28), wood, 0, 0.465, 0);
      part(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 10), brass, 0, 0.38, 0); part(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 12), wood, 0, 0.27, 0);
      for (let i = 0; i < 3; i++) { const ang = i * 2.094 + 0.5; const leg = part(new THREE.CylinderGeometry(0.02, 0.014, 0.34, 8), wood, Math.cos(ang) * 0.11, 0.13, Math.sin(ang) * 0.11); leg.rotation.set(Math.sin(ang) * 0.55, 0, -Math.cos(ang) * 0.55); }
      seatTop = 0.525;
    } else if (a.seat === 'bench') {
      part(new THREE.BoxGeometry(0.86, 0.06, 0.34), pad, 0, 0.5, 0); part(new THREE.BoxGeometry(0.88, 0.08, 0.36), wood, 0, 0.43, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(new THREE.CylinderGeometry(0.022, 0.015, 0.4, 8), wood, sx * 0.39, 0.2, sz * 0.14);
      seatTop = 0.53;
    } else if (a.seat === 'chair') {
      part(new THREE.BoxGeometry(0.4, 0.03, 0.4), wood, 0, 0.45, 0);
      for (const sx of [-1, 1]) { part(new THREE.BoxGeometry(0.03, 0.45, 0.03), wood, sx * 0.18, 0.225, -0.18); part(new THREE.BoxGeometry(0.03, 0.92, 0.03), wood, sx * 0.18, 0.46, 0.18); }
      for (const y of [0.62, 0.76, 0.89]) part(new THREE.BoxGeometry(0.36, 0.05, 0.02), wood, 0, y, 0.18);
      seatTop = 0.465;
    }
    if (a.story === 'lessons' && a.seat !== 'none') { const cushion = part(new THREE.SphereGeometry(1, 16, 10), s.material(mood.cheer > 0.5 ? '#e0a52c' : '#8a5a7a', { roughness: 1 }), 0, seatTop + 0.045, 0); cushion.scale.set(0.17, 0.05, 0.17); }
    if (a.story === 'daily') {
      const sx = -W / 2 - 0.2;
      for (let i = 0; i < 7; i++) s.box([0.23, 0.014 + random() * 0.02, 0.31], [sx + (random() - 0.5) * 0.04, 0.012 + i * 0.027, zFace + 0.1 + (random() - 0.5) * 0.04], s.material(['#e9e2cc', '#b9443a', '#e2c9a0', '#3f6a8a', '#d7d2c6', '#e8b021', '#f2efe6'][i])).rotation.y = (random() - 0.5) * 0.5;
      s.cylinder(0.004, 0.004, 0.16, [KW / 2 - 0.1, deskY + 0.014, deskZ + 0.04], s.material('#e0b22a'), 6).rotation.z = Math.PI / 2;
    }
    if (blanket) {
      const quilt = canvas(128, 128, (c) => { c.fillStyle = mood.warmth > 0.5 ? '#6a6f8a' : '#4f6a86'; c.fillRect(0, 0, 128, 128); c.strokeStyle = 'rgba(20,25,40,0.5)'; c.lineWidth = 2; for (let i = -128; i < 256; i += 22) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 128, 128); c.moveTo(i + 128, 0); c.lineTo(i, 128); c.stroke(); } }, [3, 3]);
      const q = new THREE.MeshStandardMaterial({ map: quilt, roughness: 1, side: THREE.DoubleSide });
      const bw = W * 0.42, bx = -W / 2 + bw / 2 - 0.035;
      s.box([bw, 0.025, zFace - zBack + 0.12], [bx, topY + 0.012, (zBack + zFace) / 2 + 0.02], q);
      s.box([0.025, H * 0.62, zFace - zBack + 0.12], [-W / 2 - 0.045, topY - H * 0.31, (zBack + zFace) / 2 + 0.02], q).rotation.z = -0.03;
      s.box([bw, upH * 0.8, 0.025], [bx, topY - upH * 0.4, zFace + 0.06], q).rotation.x = 0.05;
      const strap = s.material('#e07a1f', { roughness: 0.7 }), sy = keyH + 0.18 + upH * 0.62;
      s.box([W + 0.02, 0.05, 0.006], [0, sy, zFace + 0.078], strap); s.box([W + 0.02, 0.05, 0.006], [0, sy, zBack - 0.004], strap);
      for (const side of [-1, 1]) s.box([0.006, 0.05, zFace - zBack + 0.09], [side * (W / 2 + (side < 0 ? 0.062 : 0.004)), sy, (zBack + zFace) / 2 + 0.035], strap);
      s.box([0.07, 0.07, 0.03], [W * 0.2, sy, zFace + 0.09], s.material('#8d9296', { metalness: 0.7, roughness: 0.4 }));
      const note = s.label('STAYS WITH HOUSE', 0.3, 0.1, [W * 0.22, keyH + 0.18 + upH * 0.28, zFace - 0.01], '#1b1b1f', '#fbf8ee'); note.rotation.z = (random() - 0.5) * 0.15;
    }
    for (const sx of [-1, 1]) for (const z of [zBack + 0.05, zFace]) s.ball([0.022, 0.022, 0.022], [sx * (W / 2 - 0.06), 0.012, z], black, 8);

    const speed = mix(0.6, 4.2, mood.energy), ticking = pendulum && (a.story === 'daily' || a.story === 'lessons');
    return s.finish({ update: ticking ? (_dt, time) => { pendulum!.rotation.z = Math.sin(time * speed) * 0.45; } : undefined });
  },
});
