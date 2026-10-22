import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, seeded } from '@conjure/kit';

const W = 192, H = 144;

export default defineThing({
  questions: {
    screen: choice('What is on the screen?', {
      static: 'Grey static snow, hissing, after the station has signed off.',
      bars: 'Colour test bars, a channel with nothing to say.',
      weather: 'A late-night weather map with a looping forecast.',
      western: 'An old western: a rider against orange mesas.',
      preacher: 'A televangelist with raised arms and a phone number along the bottom.',
      off: 'Switched off: dark green-grey glass reflecting the room.',
    }),
    era: choice('What kind of cabinet is it?', {
      console50: 'A 1950s set: tall rounded wooden cabinet on splayed legs, gold bezel, cloth speaker.',
      wood70: 'A 1970s wood-grain box with two chunky channel dials beside the screen.',
      black90: 'A 1990s black plastic set with a row of buttons and a red standby light.',
    }),
    mount: choice('What does it sit on?', {
      dresser: 'A low laminate dresser with drawers.',
      bracket: 'A swivel bracket high on a slice of wall, tilted down at the bed.',
      cart: 'A chrome rolling cart with a shelf underneath.',
    }),
    antenna: choice('What state are the rabbit ears in?', {
      perfect: 'Two straight telescopic rods in a neat V.',
      bent: 'Bent and kinked from years of being fiddled with.',
      foil: 'Wrapped in crumpled aluminium foil to coax in a signal.',
    }),
    topper: choice('What sits on top of the set?', {
      nothing: 'Nothing.',
      vcr: 'A VCR with a tape poking out.',
      ashtray: 'A glass ashtray and a folded channel guide.',
      photo: 'A framed photograph on a lace doily, brought from home.',
      bottles: 'A couple of empty bottles.',
    }),
    remote: choice('Where is the chained remote?', {
      resting: 'Lying neatly beside the set on its chain.',
      dangling: 'Hanging off the edge, swinging on its chain.',
      gone: 'Gone: only the snapped chain is left.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const noise = seeded(context.seed ^ 0x51ab);

    // ---------- the picture ----------
    const base = document.createElement('canvas');
    base.width = W; base.height = H;
    const b = base.getContext('2d')!;
    const live = document.createElement('canvas');
    live.width = W; live.height = H;
    const g = live.getContext('2d')!;
    let glow = '#9db4d8';
    if (a.screen === 'bars') {
      ['#c9c9c9', '#c8c820', '#1fc6c6', '#22c422', '#c423c4', '#c82222', '#2222c8'].forEach((c, i) => { b.fillStyle = c; b.fillRect(i * W / 7, 0, W / 7 + 1, H * 0.72); });
      ['#2222c8', '#111', '#c423c4', '#111', '#1fc6c6', '#111', '#c9c9c9'].forEach((c, i) => { b.fillStyle = c; b.fillRect(i * W / 7, H * 0.72, W / 7 + 1, H * 0.08); });
      ['#0a2a5a', '#fff', '#3a0a6a', '#111', '#0a0a0a', '#222'].forEach((c, i) => { b.fillStyle = c; b.fillRect(i * W / 6, H * 0.8, W / 6 + 1, H * 0.2); });
      glow = '#c8c8e8';
    } else if (a.screen === 'weather') {
      b.fillStyle = '#12327a'; b.fillRect(0, 0, W, H);
      b.fillStyle = '#3f9a4a'; b.beginPath();
      [[20, 40], [70, 28], [120, 34], [172, 30], [166, 70], [150, 96], [120, 100], [100, 118], [84, 100], [44, 96], [24, 74]].forEach(([x, y]) => b.lineTo(x, y)); b.fill();
      b.strokeStyle = '#fff'; b.lineWidth = 2;
      for (let i = 0; i < 3; i++) { b.beginPath(); b.arc(60 + i * 14, 150 - i * 20, 90 + i * 6, 4.1, 5.3); b.stroke(); }
      b.fillStyle = '#ffd53a'; b.beginPath(); b.arc(140, 56, 10, 0, 7); b.fill();
      b.fillStyle = '#e8eef5'; for (const [x, y] of [[56, 58], [66, 54], [74, 60]]) { b.beginPath(); b.arc(x, y, 8, 0, 7); b.fill(); }
      b.fillStyle = '#d83030'; b.fillRect(0, H - 26, W, 26);
      b.fillStyle = '#fff'; b.font = 'bold 17px monospace'; b.fillText('TONIGHT  LOW 41', 8, H - 8);
      b.font = 'bold 15px monospace'; b.fillText('72', 132, 86); b.fillText('58', 44, 86);
      glow = '#6f8fe0';
    } else if (a.screen === 'western') {
      const sky = b.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#f6c35a'); sky.addColorStop(0.6, '#e8772a'); sky.addColorStop(1, '#8a3a1a');
      b.fillStyle = sky; b.fillRect(0, 0, W, H);
      b.fillStyle = '#fbe9a0'; b.beginPath(); b.arc(140, 50, 16, 0, 7); b.fill();
      b.fillStyle = '#7a3418'; b.fillRect(0, 70, 46, 60); b.fillRect(14, 54, 22, 20); b.fillRect(120, 80, 72, 50); b.fillRect(150, 62, 24, 20);
      b.fillStyle = '#2a1408'; b.fillRect(0, 108, W, 40);
      b.beginPath(); b.ellipse(86, 96, 22, 9, 0, 0, 7); b.fill();
      b.fillRect(68, 100, 4, 18); b.fillRect(78, 100, 4, 16); b.fillRect(94, 100, 4, 18); b.fillRect(102, 100, 4, 15);
      b.beginPath(); b.moveTo(102, 92); b.lineTo(116, 74); b.lineTo(122, 80); b.lineTo(110, 96); b.fill();
      b.fillRect(82, 70, 8, 22); b.beginPath(); b.arc(86, 66, 5, 0, 7); b.fill(); b.fillRect(76, 62, 20, 3); b.fillRect(81, 56, 10, 7);
      glow = '#f0a060';
    } else if (a.screen === 'preacher') {
      b.fillStyle = '#4a1a6a'; b.fillRect(0, 0, W, H);
      for (let i = 0; i < 12; i++) { b.fillStyle = i % 2 ? '#5d2484' : '#3d1458'; b.fillRect(i * 16, 0, 16, H); }
      b.fillStyle = '#f6e7a0'; b.globalAlpha = 0.35; b.beginPath(); b.arc(96, 54, 46, 0, 7); b.fill(); b.globalAlpha = 1;
      b.fillStyle = '#e9e9f2'; b.fillRect(78, 62, 36, 60);
      b.strokeStyle = '#e9e9f2'; b.lineWidth = 9; b.lineCap = 'round';
      b.beginPath(); b.moveTo(80, 68); b.lineTo(50, 34); b.moveTo(112, 68); b.lineTo(142, 34); b.stroke();
      b.fillStyle = '#e2b08a'; b.beginPath(); b.arc(96, 50, 11, 0, 7); b.fill(); b.beginPath(); b.arc(48, 31, 5, 0, 7); b.arc(144, 31, 5, 0, 7); b.fill();
      b.fillStyle = '#8a8a96'; b.beginPath(); b.arc(96, 44, 11, 3.14, 6.28); b.fill();
      b.fillStyle = '#b8201c'; b.fillRect(93, 62, 6, 26);
      b.fillStyle = '#f2d21c'; b.fillRect(0, H - 28, W, 28);
      b.fillStyle = '#1a1030'; b.font = 'bold 15px monospace'; b.fillText('CALL NOW 555-0199', 10, H - 9);
      glow = '#b98ae8';
    } else if (a.screen === 'off') {
      b.fillStyle = '#232b27'; b.fillRect(0, 0, W, H);
      b.fillStyle = 'rgba(200,215,205,0.22)'; b.beginPath(); b.moveTo(118, 18); b.lineTo(172, 26); b.lineTo(168, 78); b.lineTo(116, 68); b.fill();
      b.fillStyle = 'rgba(35,43,39,0.8)'; b.fillRect(142, 20, 3, 56);
      b.fillStyle = 'rgba(255,220,150,0.3)'; b.beginPath(); b.ellipse(40, 86, 14, 20, 0, 0, 7); b.fill();
      glow = '#000000';
    }
    const image = g.createImageData(W / 2, H / 2);
    const tiny = document.createElement('canvas');
    tiny.width = W / 2; tiny.height = H / 2;
    const tg = tiny.getContext('2d')!;
    const drawFrame = (time: number) => {
      if (a.screen === 'static') {
        const d = image.data;
        for (let i = 0; i < d.length; i += 4) { const v = 40 + noise() * 200; d[i] = d[i + 1] = v; d[i + 2] = v + 12; d[i + 3] = 255; }
        tg.putImageData(image, 0, 0);
        g.imageSmoothingEnabled = false;
        g.drawImage(tiny, 0, 0, W, H);
      } else {
        g.globalAlpha = 1;
        const roll = a.screen !== 'off' && mood.wear > 0.6 ? Math.floor((time * 30) % H) : 0;
        g.drawImage(base, 0, roll); if (roll) g.drawImage(base, 0, roll - H);
      }
      if (a.screen !== 'off') {
        g.fillStyle = 'rgba(0,0,0,0.16)';
        for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
        const band = (time * 45) % (H + 40) - 20;
        g.fillStyle = 'rgba(255,255,255,0.13)'; g.fillRect(0, band, W, 14);
        if (noise() < mood.energy * 0.3) { g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, noise() * H, W, 2 + noise() * 6); }
      }
      // Tube vignette and corner rounding.
      const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.75)');
      g.fillStyle = v; g.fillRect(0, 0, W, H);
    };
    drawFrame(0);
    const picture = new THREE.CanvasTexture(live);
    picture.colorSpace = THREE.SRGBColorSpace;
    const on = a.screen !== 'off';
    const glass = new THREE.MeshStandardMaterial({ map: picture, emissiveMap: picture, emissive: '#ffffff', emissiveIntensity: on ? mix(0.75, 1.15, mood.energy) : 0.12, roughness: 0.15 });

    // ---------- materials ----------
    const grain = (hex: string) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const c = canvas.getContext('2d')!;
      c.fillStyle = hex; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 90; i++) { c.strokeStyle = `rgba(${random() > 0.5 ? '30,15,5' : '255,210,150'},${0.05 + random() * 0.14})`; c.lineWidth = 1 + random() * 2; c.beginPath(); const y = random() * 256; c.moveTo(0, y); c.bezierCurveTo(80, y + random() * 14 - 7, 170, y + random() * 14 - 7, 256, y + random() * 8 - 4); c.stroke(); }
      const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 + mood.wear * 0.3 });
    };
    const wood = grain(a.era === 'console50' ? '#8a5a30' : '#70482a');
    const laminate = grain(mood.warmth > 0.5 ? '#9a6c3c' : '#7d6a55');
    const black = s.material('#1c1d1f', { roughness: 0.45 });
    const dark = s.material('#2b2a28');
    const chrome = s.material('#d8dcdf', { metalness: 0.9, roughness: 0.22 });
    const gold = s.material('#c9a24a', { metalness: 0.7, roughness: 0.3 });
    const cream = s.material('#e6dcc0');

    // ---------- the set, built standing on y = 0 ----------
    const t = new Sculpture(context);
    const set = t.root;
    const tube = (w: number, h: number, bulge: number, at: readonly [number, number, number]) => {
      const geo = new THREE.PlaneGeometry(w, h, 14, 12);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) / (w / 2), y = pos.getY(i) / (h / 2); pos.setZ(i, bulge * Math.max(0, 1 - x * x) * Math.max(0, 1 - y * y) ** 0.8); }
      geo.computeVertexNormals();
      return t.mesh(geo, glass, at);
    };
    let tw = 0.68, th = 0.5, td = 0.46, screenAt: [number, number, number] = [0, 0, 0];
    if (a.era === 'wood70') {
      t.box([tw, th, td], [0, th / 2 + 0.02, 0], wood);
      for (const x of [-1, 1]) t.box([0.06, 0.02, td * 0.8], [x * 0.28, 0.01, 0], dark);
      t.box([tw - 0.04, th - 0.04, 0.02], [0, th / 2 + 0.02, td / 2 + 0.005], black);
      t.box([0.46, 0.38, 0.02], [-0.09, th / 2 + 0.02, td / 2 + 0.012], s.material('#3a3835'));
      screenAt = [-0.09, th / 2 + 0.02, td / 2 + 0.024];
      tube(0.41, 0.32, 0.03, screenAt);
      t.box([tw, 0.015, 0.03], [0, th + 0.012, td / 2], chrome);
      // Control panel: two dials, slats.
      t.box([0.16, th - 0.08, 0.012], [0.235, th / 2 + 0.02, td / 2 + 0.018], s.material('#8a8478', { metalness: 0.5, roughness: 0.4 }));
      for (const [i, y] of [0.4, 0.27].entries()) {
        const dial = t.cylinder(0.045, 0.05, 0.035, [0.235, y, td / 2 + 0.04], black, 20); dial.rotation.x = Math.PI / 2;
        const cap = t.cylinder(0.028, 0.028, 0.02, [0.235, y, td / 2 + 0.065], chrome, 16); cap.rotation.x = Math.PI / 2;
        const tick = t.box([0.008, 0.05, 0.012], [0.235, y, td / 2 + 0.072], i ? dark : s.material('#d8402a')); tick.rotation.z = random() * 6;
      }
      for (let i = 0; i < 6; i++) t.box([0.12, 0.006, 0.008], [0.235, 0.08 + i * 0.018, td / 2 + 0.026], dark);
    } else if (a.era === 'console50') {
      tw = 0.66; th = 0.82; td = 0.5;
      const shape = new THREE.Shape();
      const r = 0.09, hw = tw / 2;
      shape.moveTo(-hw, 0); shape.lineTo(-hw, th - r); shape.quadraticCurveTo(-hw, th, -hw + r, th); shape.lineTo(hw - r, th); shape.quadraticCurveTo(hw, th, hw, th - r); shape.lineTo(hw, 0); shape.closePath();
      t.mesh(new THREE.ExtrudeGeometry(shape, { depth: td, bevelEnabled: false }), wood, [0, 0.16, -td / 2]);
      for (const x of [-1, 1]) for (const z of [-1, 1]) t.rod([x * 0.25, 0.17, z * 0.17], [x * 0.31, 0, z * 0.22], 0.025, dark, 0.012);
      const by = 0.16 + th - 0.27;
      const bezel = new THREE.Shape(); bezel.absellipse(0, 0, 0.25, 0.2, 0, Math.PI * 2);
      t.mesh(new THREE.ExtrudeGeometry(bezel, { depth: 0.02, bevelEnabled: false }), gold, [0, by, td / 2]);
      t.mesh(new THREE.ExtrudeGeometry(new THREE.Shape().absellipse(0, 0, 0.225, 0.178, 0, Math.PI * 2), { depth: 0.024, bevelEnabled: false }), black, [0, by, td / 2]);
      screenAt = [0, by, td / 2 + 0.026];
      tube(0.36, 0.28, 0.045, screenAt);
      for (let i = 0; i < 4; i++) { const k = t.cylinder(0.022, 0.026, 0.03, [-0.18 + i * 0.12, by - 0.26, td / 2 + 0.015], gold, 14); k.rotation.x = Math.PI / 2; }
      t.box([tw - 0.14, 0.2, 0.01], [0, 0.31, td / 2 + 0.004], s.material('#b59a62', { roughness: 1 }));
      for (let i = 0; i < 9; i++) t.box([0.008, 0.2, 0.014], [-0.24 + i * 0.06, 0.31, td / 2 + 0.006], wood);
      th += 0.16;
    } else {
      tw = 0.6; th = 0.52; td = 0.48;
      t.box([tw, th, 0.16], [0, th / 2, td / 2 - 0.08], black);
      const back = t.cylinder(0.22, 0.4, td - 0.16, [0, th / 2, -0.08], black, 4); back.rotation.x = -Math.PI / 2; back.rotation.y = Math.PI / 4; back.scale.set(1.02, 1, 0.86);
      screenAt = [0, th / 2 + 0.035, td / 2 + 0.004];
      t.box([0.53, 0.41, 0.01], [0, th / 2 + 0.035, td / 2 - 0.002], s.material('#0c0c0d'));
      tube(0.5, 0.375, 0.022, screenAt);
      for (let i = 0; i < 6; i++) t.box([0.03, 0.014, 0.01], [0.02 + i * 0.045, 0.04, td / 2 + 0.003], s.material('#3a3b3e'));
      t.box([0.014, 0.014, 0.01], [-0.25, 0.04, td / 2 + 0.003], new THREE.MeshStandardMaterial({ color: '#ff2a1a', emissive: '#ff2a1a', emissiveIntensity: 1.5 }));
      t.label('ZENTRON', 0.1, 0.02, [-0.14, 0.04, td / 2 + 0.004], '#b8bcc2', '#1c1d1f');
    }

    // Rabbit ears.
    const ears = new THREE.Group();
    const earBase = t.lathe([[0, 0], [0.07, 0], [0.065, 0.02], [0.03, 0.05], [0, 0.055]], black);
    ears.add(earBase);
    const foil = s.material('#cfd3d6', { metalness: 0.8, roughness: 0.5, flatShading: true });
    for (const side of [-1, 1]) {
      const lean = a.antenna === 'perfect' ? 0.55 : 0.3 + random() * 0.7;
      const len = a.antenna === 'perfect' ? 0.55 : 0.35 + random() * 0.3;
      const tip: [number, number, number] = [side * Math.sin(lean) * len, 0.05 + Math.cos(lean) * len, 0];
      if (a.antenna === 'bent') {
        const mid: [number, number, number] = [tip[0] * 0.55, tip[1] * 0.6, 0];
        const end: [number, number, number] = [mid[0] + (random() - 0.3) * 0.3 * side, mid[1] + random() * 0.12 - 0.02, (random() - 0.5) * 0.2];
        ears.add(t.rod([0, 0.05, 0], mid, 0.007, chrome), t.rod(mid, end, 0.005, chrome), t.ball([0.011, 0.011, 0.011], end, chrome, 8));
      } else {
        ears.add(t.rod([0, 0.05, 0], tip, 0.007, chrome, 0.004), t.ball([0.011, 0.011, 0.011], tip, chrome, 8));
        if (a.antenna === 'foil') {
          const lump = t.mesh(new THREE.IcosahedronGeometry(0.05, 0), foil, tip); lump.scale.set(1, 1.5, 0.8); lump.rotation.set(random() * 3, random() * 3, 0);
          const flag = t.box([0.14, 0.09, 0.004], [tip[0] * 0.6 + side * 0.05, tip[1] * 0.62, 0], foil); flag.rotation.set(random(), random(), lean * -side);
          ears.add(lump, flag);
        }
      }
    }
    ears.position.set(a.topper === 'nothing' ? 0 : -tw * 0.22, th + (a.era === 'wood70' ? 0.02 : 0), -td * 0.18);
    set.add(ears);

    // On top.
    const tx = tw * 0.18, ty = th + (a.era === 'wood70' ? 0.02 : 0), tz = 0.02;
    if (a.topper === 'vcr') {
      t.box([0.38, 0.085, 0.3], [tx - 0.04, ty + 0.043, tz], s.material('#3a3c40', { metalness: 0.3 }));
      t.box([0.2, 0.03, 0.01], [tx - 0.1, ty + 0.055, tz + 0.151], black);
      t.box([0.17, 0.022, 0.05], [tx - 0.1, ty + 0.055, tz + 0.165], dark);
      t.box([0.07, 0.022, 0.006], [tx + 0.08, ty + 0.05, tz + 0.152], new THREE.MeshStandardMaterial({ color: '#39ff9a', emissive: '#39ff9a', emissiveIntensity: 1.3 }));
    } else if (a.topper === 'ashtray') {
      t.lathe([[0, 0.005], [0.06, 0.005], [0.075, 0.03], [0.068, 0.03], [0.055, 0.012], [0, 0.012]], s.material('#b5793a', { roughness: 0.15, metalness: 0.2 }), [tx + 0.04, ty, tz + 0.08]);
      const butts = Math.round(1 + mood.wear * 5);
      for (let i = 0; i < butts; i++) { const c = t.cylinder(0.005, 0.005, 0.045, [tx + 0.04 + (random() - 0.5) * 0.06, ty + 0.02, tz + 0.08 + (random() - 0.5) * 0.06], cream, 6); c.rotation.set(1.3, random() * 6, 0); }
      const guide = t.box([0.16, 0.012, 0.22], [tx - 0.12, ty + 0.006, tz], s.material('#d9c23a')); guide.rotation.y = 0.3;
      t.label('TV', 0.1, 0.06, [tx - 0.12, ty + 0.0135, tz], '#c22a2a', '#f2ead0').rotation.set(-Math.PI / 2, 0, 0.3);
    } else if (a.topper === 'photo') {
      t.cylinder(0.14, 0.14, 0.004, [tx, ty + 0.002, tz], s.material('#f3efe2', { roughness: 1 }), 14);
      const frame = t.box([0.15, 0.19, 0.015], [tx, ty + 0.1, tz], gold); frame.rotation.x = -0.2;
      const pic = t.box([0.115, 0.15, 0.004], [tx, ty + 0.1, tz + 0.009], s.material('#9bb0b8')); pic.rotation.x = -0.2;
      for (const dx of [-0.02, 0.025]) { const head = t.ball([0.016, 0.02, 0.004], [tx + dx, ty + 0.115, tz + 0.009], s.material('#e2b08a'), 8); head.rotation.x = -0.2; }
      t.rod([tx, ty + 0.14, tz - 0.01], [tx, ty, tz - 0.07], 0.004, gold);
    } else if (a.topper === 'bottles') {
      const n = 2 + Math.round(mood.density * 3);
      for (let i = 0; i < n; i++) {
        const tint = s.material(i % 2 ? '#6a4a1c' : '#2f6a3a', { roughness: 0.15, transparent: true, opacity: 0.85 });
        const bx = tx - 0.12 + i * 0.075 + random() * 0.02, bz = tz + (random() - 0.5) * 0.16;
        const bottle = t.lathe([[0, 0], [0.03, 0], [0.03, 0.12], [0.012, 0.17], [0.012, 0.22], [0, 0.22]], tint, [bx, ty, bz]);
        if (i === n - 1 && mood.wear > 0.4) { bottle.rotation.z = Math.PI / 2; bottle.position.y = ty + 0.03; }
      }
    }

    // ---------- the mount ----------
    let surfaceY = 0, surfaceW = tw, surfaceD = td;
    if (a.mount === 'dresser') {
      surfaceY = 0.72; surfaceW = 1.35; surfaceD = 0.52;
      s.box([surfaceW, 0.62, surfaceD], [0, 0.39, 0], laminate);
      s.box([surfaceW + 0.03, 0.03, surfaceD + 0.03], [0, 0.705, 0], s.material('#3b2c20'));
      s.box([surfaceW - 0.08, 0.08, surfaceD - 0.08], [0, 0.04, 0], dark);
      for (let col = 0; col < 3; col++) for (let row = 0; row < 2; row++) {
        const open = random() < mood.wear * 0.35 ? 0.03 + random() * 0.06 : 0;
        s.box([0.4, 0.25, 0.02], [(col - 1) * 0.43, 0.24 + row * 0.29, surfaceD / 2 + 0.005 + open], laminate);
        s.box([0.1, 0.015, 0.02], [(col - 1) * 0.43, 0.24 + row * 0.29, surfaceD / 2 + 0.025 + open], gold);
      }
    } else if (a.mount === 'cart') {
      surfaceY = 0.8; surfaceW = 0.78; surfaceD = 0.52;
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.rod([x * 0.36, 0.06, z * 0.23], [x * 0.36, 0.8, z * 0.23], 0.012, chrome);
        s.cylinder(0.03, 0.03, 0.03, [x * 0.36, 0.03, z * 0.23], black, 12).rotation.z = Math.PI / 2;
      }
      s.box([surfaceW, 0.025, surfaceD], [0, 0.79, 0], laminate);
      s.box([surfaceW, 0.025, surfaceD], [0, 0.3, 0], laminate);
      s.box([0.36, 0.07, 0.3], [-0.1, 0.35, 0], s.material('#3a3c40'));
      if (mood.density > 0.4) s.box([0.2, 0.12, 0.14], [0.22, 0.375, 0.05], s.material('#b8433a'));
    } else {
      surfaceY = 1.55; surfaceW = tw + 0.06; surfaceD = td;
      const wallZ = -0.62;
      s.box([1.15, 2.3, 0.08], [0, 1.15, wallZ], s.material(mood.warmth > 0.5 ? '#c9a878' : '#b8c2bc'));
      s.box([1.15, 0.1, 0.1], [0, 0.05, wallZ + 0.01], dark);
      s.box([0.2, 0.3, 0.03], [0, 1.45, wallZ + 0.055], black);
      s.rod([0, 1.45, wallZ + 0.06], [0, 1.5, -0.05], 0.03, black);
      s.rod([0, 1.3, wallZ + 0.06], [0, 1.5, -0.2], 0.018, black);
      s.box([surfaceW, 0.03, surfaceD], [0, 1.535, 0], black);
    }
    set.position.y = surfaceY;
    if (a.mount === 'bracket') { set.rotation.x = 0.13; set.rotation.y = (random() - 0.5) * 0.5; }
    else set.position.x = a.mount === 'dresser' ? -0.12 + (random() - 0.5) * 0.1 : 0;
    s.root.add(set);

    // Chained remote.
    const side = surfaceW / 2;
    const anchor: [number, number, number] = [set.position.x + tw / 2 - 0.02, surfaceY + 0.05, td / 2 - 0.1];
    const remote = () => { const r = s.box([0.055, 0.02, 0.16], [0, 0, 0], black); for (let i = 0; i < 6; i++) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.012), i ? cream : new THREE.MeshStandardMaterial({ color: '#d83a2a' })); k.position.set((i % 2 - 0.5) * 0.022, 0.012, -0.055 + Math.floor(i / 2) * 0.03); r.add(k); } return r; };
    let swing: THREE.Object3D | null = null;
    if (a.mount === 'bracket') {
      const end: [number, number, number] = [anchor[0] + 0.1, surfaceY - 0.55, anchor[2] + 0.1];
      s.tube([anchor, [anchor[0] + 0.06, surfaceY - 0.2, anchor[2] + 0.05], end], 0.006, chrome);
      if (a.remote !== 'gone') { const r = remote(); r.position.set(end[0], end[1] - 0.08, end[2]); r.rotation.x = Math.PI / 2; swing = r; }
    } else if (a.remote === 'resting') {
      const rx = Math.min(side - 0.1, anchor[0] + 0.3);
      s.tube([anchor, [anchor[0] + 0.1, surfaceY + 0.01, anchor[2] + 0.12], [rx, surfaceY + 0.012, 0.12]], 0.006, chrome);
      const r = remote(); r.position.set(rx, surfaceY + 0.012, 0.16); r.rotation.y = 0.5 + random();
    } else {
      const edge: [number, number, number] = [Math.min(side, anchor[0] + 0.2), surfaceY + 0.005, surfaceD / 2 + 0.01];
      const drop = a.remote === 'gone' ? 0.18 : 0.42;
      s.tube([anchor, [edge[0] - 0.05, surfaceY + 0.012, edge[2] - 0.06], edge, [edge[0], surfaceY - drop, edge[2] + 0.015]], 0.006, chrome);
      if (a.remote === 'dangling') { const r = remote(); r.position.set(edge[0], surfaceY - drop - 0.08, edge[2] + 0.015); r.rotation.x = Math.PI / 2; swing = r; }
    }

    // The glow thrown forward onto whatever is in front of the set.
    if (on && a.mount !== 'bracket') {
      const gc = document.createElement('canvas'); gc.width = gc.height = 64;
      const gg = gc.getContext('2d')!;
      const rg = gg.createRadialGradient(32, 0, 2, 32, 0, 60); rg.addColorStop(0, glow); rg.addColorStop(1, 'rgba(0,0,0,0)');
      gg.fillStyle = rg; gg.fillRect(0, 0, 64, 64);
      const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(set.position.x, surfaceY + 0.004, td / 2 + 0.14);
      pool.scale.set(0.5, 0.25, 1);
      s.root.add(pool);
    }

    let clock = 0;
    const base0 = glass.emissiveIntensity;
    return s.finish({
      update: (dt, time) => {
        clock += dt;
        if (on && clock > 0.08) { clock = 0; drawFrame(time); picture.needsUpdate = true; glass.emissiveIntensity = base0 * (0.9 + noise() * 0.2 * (0.4 + mood.energy)); }
        if (swing) swing.rotation.z = Math.sin(time * 2.2) * 0.25 * mood.energy;
      },
    });
  },
});
