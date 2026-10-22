import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const paint = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const NAMES = ['LEFTY', 'R. DIAZ', 'MICKEY', 'KID', 'SONNY', 'T. BELL', 'CHUCHO', 'IRISH'];

export default defineThing({
  questions: {
    leather: choice('What colour is the leather?', {
      oxblood: 'Deep oxblood red, the classic.',
      tan: 'Pale tan horsehide gone honey-coloured.',
      black: 'Black, dull and serious.',
      blue: 'Faded amateur blue.',
      cream: 'Cream white kid leather, yellowing.',
      green: 'Bottle green, an odd pair from somewhere else.',
    }),
    whose: choice('Whose gloves do they seem to be?', {
      child: 'A child\'s first pair: small, bright, hung where a small hand can reach, a gold star stuck beside them.',
      champion: 'A champion\'s pair: signed across the knuckles, gold piping, a brass plate and rosette beneath.',
      uncollected: 'A pair nobody has collected: dusty on top, cobwebbed, a paper tag still tied to the laces.',
      working: 'A working fighter\'s daily pair: cuffs wound with tape, sweat-dark, flattened at the knuckle.',
      memorial: 'A dead man\'s pair kept on the wall: a black ribbon tied above them and a small card.',
    }),
    name: choice('If something is inked on the cuff, what?', {
      none: 'Nothing: bare leather.',
      name: 'A nickname in block capitals.',
      initials: 'Two initials.',
      crossed: 'One name struck through and another written under it: hand-me-downs.',
      number: 'A gym stock number, club property.',
    }),
    hung: choice('How do the two gloves hang?', {
      pair: 'Side by side, level, the way they were left.',
      slung: 'Tied together and slung over, one high and one low.',
      fallen: 'One still hanging, the other dropped to the floor with its lace snapped.',
      single: 'Only one glove: the other lace hangs empty.',
    }),
    hook: choice('What do they hang from?', {
      nail: 'A single bent nail.',
      hooks: 'A varnished board of numbered coat hooks, the others empty.',
      pegs: 'A rail of turned wooden pegs.',
      ring: 'An iron ring bolt set into the wall.',
    }),
    wraps: choice('What are the hand wraps doing?', {
      looped: 'Looped in long hanks from the next nail.',
      trailing: 'Hung carelessly, one tail trailing to the floor and pooling there.',
      rolled: 'Rolled tight into two neat drums on a little ledge.',
      none: 'No wraps at all.',
    }),
    wall: choice('What scrap of wall are they on?', {
      brick: 'Painted brick, the paint flaking.',
      plank: 'Vertical tongue-and-groove boards.',
      locker: 'The dented steel door of a locker.',
      plaster: 'Cracked plaster in a faded Caribbean pastel.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.74, H = 1.12;
    const base = { oxblood: '#7d2420', tan: '#b98652', black: '#26221f', blue: '#3c5f97', cream: '#ddd2b4', green: '#2f5a44' }[a.leather];
    const bright = a.whose === 'child' ? 0.18 : 0;
    const leatherColour = new THREE.Color(base).lerp(new THREE.Color('#ffffff'), bright).lerp(new THREE.Color('#3a2c22'), a.whose === 'working' ? 0.22 : 0);
    const hex = `#${leatherColour.getHexString()}`;
    const darkInk = a.leather === 'black' ? '#e9e2cc' : '#161312';
    const steel = s.material('#6f767a', { metalness: 0.75, roughness: 0.45 });
    const brass = s.material('#c7a046', { metalness: 0.85, roughness: 0.3 });
    const wood = s.material('#6a4a30', { roughness: 0.7 });
    const laceMat = s.material(a.whose === 'child' ? '#f3d13a' : '#e6dfcb', { roughness: 1 });
    const wrapMat = s.material(mood.cheer > 0.66 ? '#d8b12f' : mood.cheer > 0.33 ? '#e3dccb' : '#a8322a', { roughness: 1 });
    const crack = mix(0.1, 1, mood.wear) * (a.whose === 'child' ? 0.4 : a.whose === 'champion' ? 0.7 : 1);

    // Wall scrap.
    const wallTex = paint(512, 832, (ctx) => {
      const w = 512, h = 832;
      if (a.wall === 'brick') {
        const paintCol = mood.warmth > 0.5 ? '#d9cfb4' : '#b9c4bd';
        ctx.fillStyle = '#4a3a33'; ctx.fillRect(0, 0, w, h);
        for (let row = 0; row < 26; row++) for (let col = -1; col < 5; col++) {
          const x = col * 128 + (row % 2) * 64, y = row * 32;
          const bare = random() < mix(0.08, 0.6, mood.wear) || row > 21;
          const c = new THREE.Color(bare ? '#9a4a37' : paintCol).offsetHSL(0, 0, (random() - 0.5) * 0.08);
          ctx.fillStyle = `#${c.getHexString()}`; ctx.fillRect(x + 2, y + 2, 124, 28);
        }
      } else if (a.wall === 'plank') {
        ctx.fillStyle = mood.warmth > 0.5 ? '#7c8f6e' : '#70858f'; ctx.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 73) { ctx.fillStyle = 'rgba(20,25,20,0.6)'; ctx.fillRect(x, 0, 3, h); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x + 3, 0, 3, h); }
        for (let i = 0; i < 30 + 220 * mood.wear; i++) { ctx.fillStyle = random() > 0.4 ? '#a68a66' : '#ded6c0'; ctx.fillRect(random() * w, random() * h, 3 + random() * 8, 6 + random() * 30); }
      } else if (a.wall === 'locker') {
        ctx.fillStyle = mood.warmth > 0.5 ? '#8c8468' : '#69767c'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 6; ctx.strokeRect(14, 14, w - 28, h - 28);
        ctx.fillStyle = 'rgba(15,15,15,0.75)';
        for (let i = 0; i < 6; i++) { ctx.fillRect(120, 50 + i * 20, 272, 8); ctx.fillRect(120, h - 170 + i * 20, 272, 8); }
        for (let i = 0; i < 40 * mood.wear + 6; i++) { ctx.fillStyle = `rgba(120,60,25,${0.15 + random() * 0.3})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 3 + random() * 16, 3 + random() * 10, 0, 0, 7); ctx.fill(); }
      } else {
        const pastel = mood.warmth > 0.6 ? '#e2a58c' : mood.warmth > 0.3 ? '#8fc4b8' : '#9db4d6';
        ctx.fillStyle = pastel; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(60,90,110,0.35)'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
        for (let i = 0; i < 4 + 10 * mood.wear; i++) {
          const x = random() * w, y = random() * h, r = 20 + random() * 70 * (0.4 + mood.wear);
          ctx.fillStyle = '#d9d2c2'; ctx.beginPath(); for (let k = 0; k < 9; k++) { const t = k / 9 * 6.283, rr = r * (0.6 + random() * 0.6); ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); } ctx.fill();
          ctx.fillStyle = '#a5694f'; ctx.beginPath(); ctx.ellipse(x, y, r * 0.35, r * 0.25, random() * 3, 0, 7); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(40,40,40,0.5)'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { let x = random() * w, y = 0; ctx.beginPath(); ctx.moveTo(x, y); while (y < h * (0.3 + random() * 0.6)) { x += (random() - 0.5) * 40; y += 20 + random() * 30; ctx.lineTo(x, y); } ctx.stroke(); }
      }
      for (let i = 0; i < 16; i++) { ctx.fillStyle = `rgba(25,20,15,${0.04 + random() * 0.05 * (1 + mood.wear)})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 40 + random() * 80, 30 + random() * 60, 0, 0, 7); ctx.fill(); }
    });
    const depth = a.wall === 'brick' ? 0.11 : a.wall === 'locker' ? 0.03 : 0.05;
    s.box([W, H, depth], [0, H / 2, -depth / 2], new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, metalness: a.wall === 'locker' ? 0.35 : 0 }));
    if (a.wall === 'locker') {
      s.box([W + 0.04, H + 0.02, 0.3], [0, H / 2, -0.18], s.material('#59646a', { metalness: 0.4 }));
      s.box([0.03, 0.09, 0.02], [W / 2 - 0.06, H * 0.5, 0.01], steel);
    } else {
      s.box([W + 0.03, 0.1, depth + 0.03], [0, 0.05, -depth / 2 + 0.008], a.wall === 'brick' ? s.material('#5b5650') : wood);
      s.box([W, 0.04, 0.2], [0, 0.02, -depth - 0.08], s.material('#4b4640'));
    }

    // What they hang from.
    const gx = a.wraps === 'none' ? 0 : -0.11, hookY = a.whose === 'child' ? 0.84 : 0.96;
    const wx = 0.22, wrapY = hookY + 0.02;
    const hookAt = (x: number, y: number) => {
      if (a.hook === 'nail') { s.rod([x, y, 0], [x, y + 0.02, 0.05], 0.005, steel); s.cylinder(0.011, 0.011, 0.004, [x, y + 0.021, 0.052], steel, 8).rotation.x = 1.2; }
      else if (a.hook === 'hooks') { s.tube([[x, y + 0.04, 0.02], [x, y + 0.01, 0.05], [x, y - 0.02, 0.06], [x, y, 0.085], [x, y + 0.03, 0.08]], 0.006, brass); s.cylinder(0.02, 0.02, 0.006, [x, y + 0.04, 0.018], brass, 10).rotation.x = Math.PI / 2; }
      else if (a.hook === 'pegs') { const peg = s.lathe([[0.001, 0.1], [0.02, 0.095], [0.022, 0.08], [0.012, 0.065], [0.013, 0], [0.001, 0]], wood, [x, y, 0.012]); peg.rotation.x = Math.PI / 2 - 0.2; }
      else { s.rod([x, y + 0.03, 0], [x, y + 0.03, 0.04], 0.008, steel); const r = s.ring(0.035, 0.007, [x, y - 0.005, 0.05], steel); r.rotation.x = 0.25; }
    };
    if (a.hook === 'hooks' || a.hook === 'pegs') {
      s.box([W - 0.08, 0.1, 0.022], [0, hookY + 0.03, 0.011], a.hook === 'hooks' ? s.material('#5a3520', { roughness: 0.4 }) : wood);
      for (const x of [-0.28, 0.06]) hookAt(x + (a.wraps === 'none' ? 0.11 : 0), hookY);
      if (a.wraps === 'none') hookAt(wx + 0.06, hookY);
    }
    hookAt(gx, hookY);
    const hang = a.hook === 'ring' ? hookY - 0.04 : a.hook === 'hooks' ? hookY - 0.012 : hookY + 0.012;
    const hz = a.hook === 'hooks' ? 0.062 : 0.045;

    // One glove, origin at the top of its cuff, fist hanging down.
    const size = a.whose === 'child' ? 0.8 : a.whose === 'champion' ? 1.36 : 1.3;
    const inked = a.name === 'none' ? '' : a.name === 'initials' ? `${'ABDJMRST'[Math.floor(random() * 8)]}.${'CDGLMOPV'[Math.floor(random() * 8)]}.` : a.name === 'number' ? `No ${1 + Math.floor(random() * 30)}` : NAMES[Math.floor(random() * NAMES.length)];
    const struck = NAMES[Math.floor(random() * NAMES.length)];
    const bodyTex = paint(512, 256, (ctx) => {
      ctx.fillStyle = hex; ctx.fillRect(0, 0, 512, 256);
      const g = ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,255,255,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0.25)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
      // scuffed knuckles near the bottom of the hanging fist
      for (let i = 0; i < 40 * crack; i++) { ctx.fillStyle = `rgba(235,215,185,${0.05 + random() * 0.1})`; ctx.beginPath(); ctx.ellipse(random() * 512, 150 + random() * 90, 6 + random() * 22, 3 + random() * 8, random() * 3, 0, 7); ctx.fill(); }
      ctx.strokeStyle = 'rgba(15,10,8,0.75)'; ctx.lineCap = 'round';
      for (let i = 0; i < 90 * crack; i++) {
        let x = random() * 512, y = 40 + random() * 200; ctx.lineWidth = 0.8 + random() * 1.6; ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (random() - 0.5) * 26; y += (random() - 0.5) * 16; ctx.lineTo(x, y); } ctx.stroke();
      }
      if (a.whose === 'champion') {
        ctx.strokeStyle = a.leather === 'black' || a.leather === 'oxblood' || a.leather === 'green' || a.leather === 'blue' ? '#f1ead8' : '#17130f'; ctx.lineWidth = 3.5;
        for (const cx of [128, 384]) { ctx.beginPath(); ctx.moveTo(cx - 60, 150); ctx.bezierCurveTo(cx - 40, 80, cx - 20, 190, cx, 120); ctx.bezierCurveTo(cx + 10, 90, cx + 20, 170, cx + 34, 130); ctx.bezierCurveTo(cx + 44, 110, cx + 50, 150, cx + 64, 126); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 50, 170); ctx.lineTo(cx + 60, 158); ctx.stroke(); }
      }
      if (a.whose === 'uncollected') { const d = ctx.createLinearGradient(0, 0, 0, 256); d.addColorStop(0, 'rgba(190,185,170,0.75)'); d.addColorStop(0.45, 'rgba(190,185,170,0.1)'); d.addColorStop(1, 'rgba(190,185,170,0)'); ctx.fillStyle = d; ctx.fillRect(0, 0, 512, 256); }
    });
    const bodyMat = new THREE.MeshStandardMaterial({ map: bodyTex, roughness: mix(0.38, 0.8, mood.wear) });
    const cuffTex = (withName: boolean) => paint(512, 160, (ctx) => {
      ctx.fillStyle = hex; ctx.fillRect(0, 0, 512, 160);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, 0, 512, 160);
      if (a.whose === 'working') { ctx.fillStyle = '#d8d3c4'; ctx.fillRect(0, 44, 512, 84); ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 8; i++) ctx.fillRect(0, 44 + i * 11 + random() * 4, 512, 2); }
      if (a.whose === 'champion') { ctx.fillStyle = '#d4a531'; ctx.fillRect(0, 0, 512, 14); ctx.fillRect(0, 146, 512, 14); }
      if (withName && inked) {
        ctx.fillStyle = a.whose === 'working' ? '#161312' : darkInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.save(); ctx.translate(128, 84); ctx.rotate((random() - 0.5) * 0.12);
        if (a.name === 'crossed') {
          ctx.font = 'bold 44px sans-serif'; ctx.globalAlpha = 0.7; ctx.fillText(struck, 0, -28, 180); ctx.fillRect(-90, -32, 180, 6); ctx.globalAlpha = 1; ctx.font = 'bold 54px sans-serif'; ctx.fillText(inked, 0, 30, 190);
        } else { ctx.font = `bold ${inked.length > 5 ? 62 : 84}px sans-serif`; ctx.fillText(inked, 0, 0, 200); }
        ctx.restore();
      } else {
        // the laced side: eyelets and a criss-cross
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(118, 0, 20, 160);
        ctx.strokeStyle = a.whose === 'child' ? '#f3d13a' : '#e6dfcb'; ctx.lineWidth = 7;
        for (let i = 0; i < 4; i++) { const y = 14 + i * 36; ctx.beginPath(); ctx.moveTo(92, y); ctx.lineTo(164, y + 32); ctx.moveTo(164, y); ctx.lineTo(92, y + 32); ctx.stroke(); }
      }
      ctx.strokeStyle = 'rgba(15,10,8,0.6)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 40 * crack; i++) { const x = random() * 512, y = random() * 160; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 30, y + (random() - 0.5) * 16); ctx.stroke(); }
    });
    const add = (mesh: THREE.Object3D, parent: THREE.Object3D) => { mesh.removeFromParent(); parent.add(mesh); return mesh; };
    const flat = a.whose === 'working' ? 0.86 : 1;
    const glove = (side: number, showName: boolean) => {
      const g = new THREE.Group();
      const inner = new THREE.Group(); g.add(inner);
      const cuff = s.mesh(new THREE.CylinderGeometry(0.047, 0.056, 0.115, 24, 1, true), new THREE.MeshStandardMaterial({ map: cuffTex(showName), roughness: 0.7, side: THREE.DoubleSide }), [0, -0.058, 0]);
      cuff.rotation.y = -Math.PI / 2; cuff.scale.z = 0.82; add(cuff, inner);
      add(s.ring(0.05, 0.007, [0, -0.002, 0], a.whose === 'champion' ? brass : s.material(hex).clone()), inner).rotation.x = Math.PI / 2;
      add(s.ball([0.074, 0.108, 0.064 * flat], [0, -0.205, 0.004], bodyMat, 28), inner);
      add(s.ball([0.066, 0.05, 0.058 * flat], [0, -0.275, 0.012], bodyMat, 20), inner);
      const thumb = add(s.ball([0.03, 0.066, 0.032], [side * 0.064, -0.19, 0.024], bodyMat, 16), inner); thumb.rotation.z = side * 0.28;
      add(s.rod([side * 0.05, -0.21, 0.045], [side * 0.02, -0.215, 0.058], 0.004, laceMat), inner);
      inner.scale.setScalar(size);
      return g;
    };
    const swingers: { group: THREE.Object3D; phase: number; reach: number }[] = [];
    const drop = 0.17, spread = 0.083 * size;
    const placeGlove = (side: number, x: number, y: number, showName: boolean) => {
      const pivot = new THREE.Group(); pivot.position.set(gx, hang, hz);
      const g = glove(side, showName); g.position.set(x - gx, y - hang, 0.035 * size); g.rotation.y = side * -0.35 + (random() - 0.5) * 0.3; g.rotation.z = side * 0.1 + (random() - 0.5) * 0.08;
      pivot.add(g);
      const lace = s.tube([[0, 0, 0], [(x - gx) * 0.35, (y - hang) * 0.45, 0.015], [x - gx, y - hang + 0.004, 0.03 * size]], 0.0045, laceMat); add(lace, pivot);
      s.root.add(pivot);
      swingers.push({ group: pivot, phase: random() * 6, reach: 0.5 + random() * 0.5 });
      return pivot;
    };
    const leftY = hang - drop - (a.hung === 'slung' ? 0.11 : 0), rightY = hang - drop + (a.hung === 'slung' ? 0.05 : 0);
    placeGlove(-1, gx - spread, leftY, false);
    if (a.hung === 'pair' || a.hung === 'slung') placeGlove(1, gx + spread, rightY, true);
    else {
      // the other lace hangs empty
      s.tube([[gx, hang, hz], [gx + 0.03, hang - 0.07, hz + 0.01], [gx + 0.045, hang - (a.hung === 'fallen' ? 0.1 : 0.2), hz + 0.012]], 0.0045, laceMat);
      if (a.hung === 'fallen') {
        const g = glove(1, true); g.rotation.set(-Math.PI / 2 + 0.12, 0, 0.5 + random() * 2);
        g.position.set(gx + 0.1 + random() * 0.08, 0.062 * size, 0.2 + random() * 0.06); s.root.add(g);
        s.tube([[g.position.x, 0.006, g.position.z - 0.02], [g.position.x - 0.1, 0.006, g.position.z + 0.07], [g.position.x - 0.2, 0.006, g.position.z + 0.03]], 0.0045, laceMat);
      } else s.ball([0.008, 0.008, 0.008], [gx + 0.045, hang - 0.2, hz + 0.012], laceMat, 6);
    }
    s.ball([0.012, 0.01, 0.012], [gx, hang - 0.004, hz + 0.004], laceMat, 8);

    // Whose they are.
    if (a.whose === 'child') {
      const star = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.02 : 0.048, t = i / 10 * Math.PI * 2 + Math.PI / 2; if (i) star.lineTo(Math.cos(t) * r, Math.sin(t) * r); else star.moveTo(Math.cos(t) * r, Math.sin(t) * r); }
      const m = s.mesh(new THREE.ShapeGeometry(star), s.material('#f2c82e', { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide }), [gx - 0.2, hookY + 0.16, 0.004]); m.rotation.z = 0.2;
      s.label('1st', 0.11, 0.05, [gx - 0.2, hookY + 0.09, 0.004], '#b3251c', '#f4f0e2').rotation.z = 0.08;
    } else if (a.whose === 'champion') {
      s.box([0.26, 0.085, 0.012], [gx, 0.17, 0.006], brass);
      s.label('CHAMPION', 0.23, 0.06, [gx, 0.17, 0.0135], '#2a2114', '#d9b85c');
      const ry = hookY + 0.1;
      for (let i = 0; i < 12; i++) { const t = i / 12 * 6.283; s.box([0.03, 0.05, 0.004], [gx + 0.17 + Math.cos(t) * 0.035, ry + Math.sin(t) * 0.035, 0.004], s.material('#1f4f9c')).rotation.z = t - Math.PI / 2; }
      s.cylinder(0.03, 0.03, 0.008, [gx + 0.17, ry, 0.008], brass, 16).rotation.x = Math.PI / 2;
      for (const d of [-1, 1]) s.box([0.028, 0.12, 0.003], [gx + 0.17 + d * 0.018, ry - 0.09, 0.003], s.material('#1f4f9c')).rotation.z = d * 0.16;
    } else if (a.whose === 'uncollected') {
      const web = new THREE.MeshBasicMaterial({ color: '#f4f4ee', transparent: true, opacity: 0.5, depthWrite: false });
      for (let i = 0; i < 7; i++) { const r = s.rod([gx - 0.1 + random() * 0.2, hang - 0.1 - random() * 0.3, 0.1], [gx - 0.3 + random() * 0.6, hang + 0.02 - random() * 0.35, 0.002], 0.0012, web); r.castShadow = false; }
      const tag = s.label('HOLD', 0.09, 0.05, [gx + 0.02, hang - 0.11, hz + 0.06], '#7a2a20', '#d9c9a0'); tag.rotation.z = -0.5 + random() * 0.3;
      s.rod([gx, hang, hz], [gx + 0.02, hang - 0.09, hz + 0.06], 0.0015, laceMat);
    } else if (a.whose === 'memorial') {
      const black = s.material('#141314', { roughness: 0.6 });
      for (const d of [-1, 1]) { const loop = s.ring(0.03, 0.011, [gx + d * 0.035, hookY + 0.085, 0.03], black); loop.scale.set(1.3, 0.75, 1); loop.rotation.z = d * 0.35; s.box([0.03, 0.14, 0.004], [gx + d * 0.03, hookY + 0.0, 0.012], black).rotation.z = d * 0.22; }
      s.ball([0.014, 0.014, 0.012], [gx, hookY + 0.085, 0.034], black, 8);
      const card = s.label('R.I.P.', 0.15, 0.1, [gx + 0.3, 0.3, 0.004], '#1b1a1a', '#efe9d8'); card.rotation.z = (random() - 0.5) * 0.14;
    } else {
      // working: a strip of tape stuck to the wall with a scrawl
      s.label(`${3 + Math.floor(random() * 9)} RDS`, 0.16, 0.045, [gx + 0.02, hookY + 0.13, 0.004], '#1b1a1a', '#d8d3c4').rotation.z = (random() - 0.5) * 0.2;
    }

    // Hand wraps.
    if (a.wraps !== 'none') {
      if (a.wraps === 'rolled') {
        s.box([0.2, 0.018, 0.09], [wx, hookY - 0.2, 0.045], wood);
        for (const d of [-1, 1]) { const roll = s.cylinder(0.034, 0.034, 0.052, [wx + d * 0.045, hookY - 0.157, 0.05], wrapMat, 18); roll.rotation.x = Math.PI / 2 + (random() - 0.5) * 0.3; s.ring(0.02, 0.006, [wx + d * 0.045, hookY - 0.157, 0.077], wrapMat); }
      } else {
        if (a.hook !== 'hooks' && a.hook !== 'pegs') hookAt(wx, wrapY); else hookAt(wx + 0.06 - 0.06, hookY);
        const top = hookY + 0.01;
        const loops = a.wraps === 'looped' ? 4 : 2;
        for (let i = 0; i < loops; i++) {
          const len = 0.2 + random() * 0.14, wide = 0.035 + random() * 0.03, dx = (random() - 0.5) * 0.03;
          const pts: [number, number, number][] = [];
          for (let k = 0; k <= 10; k++) { const t = k / 10 * Math.PI * 2; pts.push([wx + dx + Math.sin(t) * wide, top - len / 2 + Math.cos(t) * len / 2, hz + 0.004 + i * 0.006]); }
          const loop = s.tube(pts.slice(0, 10), 0.008, wrapMat, true); loop.scale.z = 0.5; loop.position.z = (hz + i * 0.006) * 0.5;
        }
        if (a.wraps === 'trailing') {
          const pts: [number, number, number][] = [[wx, top, hz], [wx + 0.03, top - 0.3, hz + 0.02], [wx + 0.01, 0.4, 0.07], [wx + 0.04, 0.05, 0.1]];
          for (let k = 0; k < 9; k++) { const t = k * 1.1; pts.push([wx + 0.02 + Math.cos(t) * (0.03 + k * 0.007), 0.008, 0.14 + Math.sin(t) * (0.03 + k * 0.006)]); }
          s.tube(pts, 0.008, wrapMat).scale.set(1, 1, 1);
        } else s.rod([wx - 0.02, top - 0.02, hz + 0.02], [wx - 0.035, top - 0.42 - random() * 0.1, hz + 0.02], 0.007, wrapMat);
      }
    }

    const sway = mix(0.004, 0.09, mood.energy * mood.energy);
    return s.finish({ update: (_dt, time) => { for (const w of swingers) w.group.rotation.z = Math.sin(time * 2.2 + w.phase) * sway * w.reach; } });
  },
});
