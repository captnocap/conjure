import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P = [number, number, number];

function canvasOf(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, c: canvas.getContext('2d')! };
}
function textureOf(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const { canvas, c } = canvasOf(w, h);
  draw(c, w, h);
  return textureOf(canvas);
}

function arrowDown(c: CanvasRenderingContext2D, x: number, y: number, size: number) {
  c.beginPath();
  c.moveTo(x - size * 0.22, y - size * 0.5); c.lineTo(x + size * 0.22, y - size * 0.5); c.lineTo(x + size * 0.22, y);
  c.lineTo(x + size * 0.5, y); c.lineTo(x, y + size * 0.5); c.lineTo(x - size * 0.5, y); c.lineTo(x - size * 0.22, y);
  c.closePath(); c.fill();
}

export default defineThing({
  questions: {
    doors: choice('What are the doors doing?', {
      closed: 'Closed tight, your reflection smeared across the steel.',
      parted: 'Parted a hand\'s width, with a red glow leaking through the gap.',
      shaft: 'Standing open on a dark empty shaft: cables, a long drop, a faint red light far below.',
      cab: 'Open on a small waiting car lit a dim warm red, with a handrail and no buttons.',
    }),
    indicator: choice('What does the floor indicator above read?', {
      b9: 'A down arrow and B9.',
      counter: 'A down arrow and a basement number that keeps counting down, past any basement there could be.',
      arriving: 'The word ARRIVING, as it has for some time.',
      lobby: 'An L for lobby, next to a down arrow, which is a lie.',
      dark: 'Nothing: the indicator is dark.',
    }),
    block: choice('What stands in the way?', {
      none: 'Nothing. The way down is open.',
      note: 'A handwritten OUT OF ORDER note taped across the doors.',
      rope: 'A red velvet rope between two brass stanchions.',
      cone: 'A single orange traffic cone in front of the doors.',
      tape: 'Yellow and black hazard tape stretched across the opening.',
    }),
    shadow: noul('Is a figure\'s long shadow cast onto the mat, with no figure to cast it?'),
    mat: choice('What is on the floor in front?', {
      welcome: 'A worn brown WELCOME mat.',
      hope: 'A mat that says ABANDON HOPE in the same cheerful lettering.',
      plain: 'A plain grey ribbed rubber mat.',
      runner: 'A long red carpet runner leading to the doors.',
      none: 'Bare floor.',
    }),
    wall: choice('What is the surrounding wall?', {
      tile: 'Beige municipal wall tile.',
      marble: 'Veined cream marble, a grand lobby.',
      concrete: 'Bare grey concrete, a car park.',
      wood: 'Dark wood panelling, an old hotel.',
    }),
    left: choice('What has been left by the doors?', {
      nothing: 'Nothing.',
      suitcase: 'A small suitcase standing on its own.',
      shoes: 'A pair of shoes set neatly side by side, as if someone stepped out of them.',
      flowers: 'A bouquet of dead flowers on the floor.',
      coffee: 'A paper cup of coffee, still full, left on the floor.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 2.2, H = 2.75, T = 0.34; // the wall section
    const openW = 1.0, openH = 2.15;
    const steelMap = paint(256, 512, (c, w, h) => {
      c.fillStyle = '#b9bdc0'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i++) { c.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(40,44,48,0.12)'; c.fillRect(random() * w, random() * h, 1, 6 + random() * 30); }
      for (let k = 0; k < mood.wear * 10; k++) { c.fillStyle = 'rgba(60,50,40,0.25)'; c.fillRect(random() * w, h * 0.6 + random() * h * 0.4, 10 + random() * 40, 2 + random() * 12); }
    });
    const steel = new THREE.MeshStandardMaterial({ map: steelMap, metalness: 0.8, roughness: 0.32 });
    const frame = s.material('#8e9397', { metalness: 0.8, roughness: 0.35 });
    const dark = s.material('#15161a', { roughness: 0.7 });
    const glowTint = new THREE.Color('#ff3a14').lerp(new THREE.Color('#ff8a2a'), mood.warmth * 0.5);

    // ---- Wall ----
    const wallMap = paint(512, 640, (c, w, h) => {
      if (a.wall === 'tile') {
        c.fillStyle = '#d6ccb0'; c.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 40) for (let x = 0; x < w; x += 40) { c.fillStyle = `hsl(42, ${26 + random() * 10}%, ${77 + random() * 6 - mood.wear * 8}%)`; c.fillRect(x + 2, y + 2, 36, 36); }
      } else if (a.wall === 'marble') {
        c.fillStyle = '#e9e2d2'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 26; i++) { c.strokeStyle = `rgba(${90 + random() * 60},${80 + random() * 50},${70 + random() * 40},${0.25 + random() * 0.3})`; c.lineWidth = 1 + random() * 3; c.beginPath(); let x = random() * w, y = random() * h; c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (random() - 0.5) * 160; y += (random() - 0.3) * 160; c.lineTo(x, y); } c.stroke(); }
      } else if (a.wall === 'concrete') {
        c.fillStyle = '#9d9c96'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 2500; i++) { c.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'; c.fillRect(random() * w, random() * h, 2, 2); }
        c.strokeStyle = 'rgba(60,60,60,0.5)'; c.lineWidth = 3; for (const y of [h * 0.33, h * 0.66]) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
        for (const [x, y] of [[40, 40], [470, 40], [40, 600], [470, 600]]) { c.fillStyle = 'rgba(40,40,40,0.5)'; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill(); }
      } else {
        c.fillStyle = '#4e3220'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 160; i++) { c.strokeStyle = `rgba(${random() < 0.5 ? '20,10,5' : '120,80,50'},0.35)`; c.lineWidth = 1 + random() * 3; c.beginPath(); const x = random() * w; c.moveTo(x, 0); c.bezierCurveTo(x + 8, h / 3, x - 8, (2 * h) / 3, x + 4, h); c.stroke(); }
        c.strokeStyle = '#2b1a0e'; c.lineWidth = 6; for (const x of [128, 256, 384]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      }
      // Grime where hands and trolleys touch.
      const g = c.createLinearGradient(0, h, 0, h * 0.7); g.addColorStop(0, `rgba(50,40,30,${mood.wear * 0.4})`); g.addColorStop(1, 'rgba(50,40,30,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    wallMap.wrapS = wallMap.wrapT = THREE.RepeatWrapping;
    const wallMat = new THREE.MeshStandardMaterial({ map: wallMap, roughness: a.wall === 'marble' ? 0.3 : 0.85 });
    const sideMat = s.material(a.wall === 'wood' ? '#3a2416' : a.wall === 'concrete' ? '#8f8e88' : '#cbc2ab');
    const wallPiece = (size: P, at: P) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(...size), [sideMat, sideMat, sideMat, sideMat, wallMat, sideMat]);
      m.position.set(...at); m.castShadow = m.receiveShadow = true; s.root.add(m);
      return m;
    };
    const pierW = (W - openW) / 2;
    const shaftDepth = 1.0;
    // With the doors open the wall runs deep enough to hold what is behind them, so nothing shows above it.
    const depth = a.doors === 'closed' ? T : T + shaftDepth;
    wallPiece([pierW, H, depth], [-(openW / 2 + pierW / 2), H / 2, -depth / 2]);
    wallPiece([pierW, H, depth], [openW / 2 + pierW / 2, H / 2, -depth / 2]);
    wallPiece([openW, H - openH, depth], [0, openH + (H - openH) / 2, -depth / 2]);
    if (a.doors !== 'closed') wallPiece([openW, H, 0.1], [0, H / 2, -depth - 0.05]);
    s.box([W + 0.04, 0.12, depth + 0.04], [0, 0.06, -depth / 2], s.material(a.wall === 'wood' ? '#2b1a0e' : '#2a2a2e'));
    // Door frame.
    for (const x of [-1, 1]) s.box([0.08, openH + 0.08, 0.1], [x * (openW / 2 + 0.04), (openH + 0.08) / 2, -0.03], frame);
    s.box([openW + 0.16, 0.08, 0.1], [0, openH + 0.04, -0.03], frame);
    s.box([openW + 0.2, 0.025, 0.14], [0, 0.0125, -0.02], frame); // the sill

    // ---- Behind the doors ----
    let cabGlow: THREE.MeshStandardMaterial | null = null;
    if (a.doors !== 'closed') {
      // The inside of the shaft: a box seen only from within, so its dark faces never show outside the wall.
      const shaft = new THREE.MeshStandardMaterial({ color: '#1a1618', roughness: 0.9, side: THREE.BackSide });
      const lining = new THREE.Mesh(new THREE.BoxGeometry(openW + 0.1, openH + 0.2, shaftDepth), shaft);
      lining.position.set(0, openH / 2 + 0.02, -T - shaftDepth / 2 + 0.02);
      lining.receiveShadow = true;
      s.root.add(lining);
      if (a.doors === 'cab') {
        const cabWall = s.material('#5a2a24', { roughness: 0.5, metalness: 0.2 });
        const back = -T - shaftDepth + 0.1, mid = -T - shaftDepth / 2;
        s.box([openW - 0.08, openH - 0.1, 0.04], [0, openH / 2, back], cabWall);
        for (const x of [-1, 1]) s.box([0.04, openH - 0.1, shaftDepth - 0.2], [x * (openW / 2 - 0.06), openH / 2, mid], cabWall);
        s.box([openW - 0.1, 0.03, shaftDepth - 0.2], [0, 0.03, mid], s.material('#2a2222'));
        cabGlow = new THREE.MeshStandardMaterial({ color: '#ffd0b0', emissive: glowTint, emissiveIntensity: 1.2, roughness: 0.6 });
        s.mesh(new THREE.BoxGeometry(openW - 0.1, 0.03, shaftDepth - 0.3), cabGlow, [0, openH - 0.12, mid]).castShadow = false;
        const rail = s.material('#c9b27a', { metalness: 0.8, roughness: 0.3 });
        s.cylinder(0.015, 0.015, openW - 0.2, [0, 0.9, back + 0.08], rail, 10).rotation.z = Math.PI / 2;
        for (const x of [-1, 1]) s.cylinder(0.015, 0.015, shaftDepth - 0.4, [x * (openW / 2 - 0.1), 0.9, mid], rail, 10).rotation.x = Math.PI / 2;
        s.box([0.03, 0.16, 0.06], [0.0, 1.0, back + 0.05], dark);
      } else {
        // The shaft: cables, a counterweight rail, and a glow from far below.
        const cable = s.material('#3a3a3c', { metalness: 0.7, roughness: 0.4 });
        for (const x of [-0.12, -0.04, 0.04, 0.12]) s.cylinder(0.008, 0.008, openH + 0.2, [x, openH / 2, -T - shaftDepth + 0.5], cable, 6);
        for (const x of [-1, 1]) s.box([0.05, openH + 0.2, 0.05], [x * (openW / 2 - 0.02), openH / 2, -T - shaftDepth + 0.3], cable);
        const far = new THREE.MeshStandardMaterial({ color: glowTint, emissive: glowTint, emissiveIntensity: mix(0.6, 1.5, mood.warmth) });
        const pit = s.mesh(new THREE.PlaneGeometry(openW, shaftDepth - 0.1), far, [0, 0.012, -T - shaftDepth / 2]);
        pit.rotation.x = -Math.PI / 2; pit.castShadow = false;
        cabGlow = far;
        const haze = new THREE.MeshBasicMaterial({ color: glowTint, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending });
        s.mesh(new THREE.PlaneGeometry(openW, 0.9), haze, [0, 0.4, -0.3]).castShadow = false;
      }
    }

    // ---- Doors ----
    const panelW = openW / 2, panelH = openH - 0.02;
    const doorZ = -0.1;
    const slide = { closed: 0, parted: 0.06, shaft: panelW + 0.02, cab: panelW + 0.02 }[a.doors];
    for (const x of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW, panelH, 0.035), steel);
      panel.position.set(x * (panelW / 2 + slide), panelH / 2 + 0.02, doorZ);
      panel.castShadow = panel.receiveShadow = true;
      s.root.add(panel);
      s.box([0.012, panelH - 0.2, 0.01], [x * (0.02 + slide), panelH / 2 + 0.02, doorZ + 0.022], dark);
    }
    if (a.doors === 'parted') {
      const gapGlow = new THREE.MeshStandardMaterial({ color: glowTint, emissive: glowTint, emissiveIntensity: 1.6 });
      s.mesh(new THREE.PlaneGeometry(0.1, panelH - 0.1), gapGlow, [0, panelH / 2, doorZ - 0.03]).castShadow = false;
      cabGlow = gapGlow;
      const spill = new THREE.MeshBasicMaterial({ color: glowTint, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending });
      const beam = s.mesh(new THREE.PlaneGeometry(0.5, 1.3), spill, [0, 0.005, 0.6]);
      beam.rotation.x = -Math.PI / 2; beam.castShadow = false;
    }

    // ---- Call plate and indicator ----
    const plateX = openW / 2 + 0.25;
    s.box([0.1, 0.2, 0.01], [plateX, 1.1, 0.005], frame);
    const button = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb347', emissiveIntensity: 1.4 });
    const ringMesh = s.ring(0.022, 0.006, [plateX, 1.07, 0.012], button); ringMesh.castShadow = false;
    s.mesh(new THREE.CircleGeometry(0.018, 20), new THREE.MeshStandardMaterial({ map: paint(64, 64, (c, w, h) => { c.fillStyle = '#1a1a1e'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffb347'; arrowDown(c, w / 2, h / 2, 34); }), emissive: '#ffb347', emissiveIntensity: 0.9 }), [plateX, 1.07, 0.013]).castShadow = false;
    s.cylinder(0.008, 0.008, 0.004, [plateX, 1.15, 0.012], dark, 10).rotation.x = Math.PI / 2; // the filled hole where an up button was
    const ind = canvasOf(256, 96);
    let counter = 1;
    const drawIndicator = () => {
      const { c } = ind;
      c.fillStyle = '#0b0a0c'; c.fillRect(0, 0, 256, 96);
      if (a.indicator === 'dark') return;
      c.fillStyle = '#ff3b2a'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.shadowColor = '#ff3b2a'; c.shadowBlur = 10;
      if (a.indicator === 'arriving') { c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.fillText('ARRIVING', 128, 50); }
      else {
        arrowDown(c, 52, 50, 56);
        c.font = 'bold 64px monospace';
        c.fillText(a.indicator === 'b9' ? 'B9' : a.indicator === 'lobby' ? 'L' : `B${counter}`, 96, 52);
      }
      c.shadowBlur = 0;
    };
    drawIndicator();
    const indMap = textureOf(ind.canvas);
    s.box([0.56, 0.2, 0.06], [0, openH + 0.36, -0.03], dark);
    s.mesh(new THREE.PlaneGeometry(0.5, 0.17), new THREE.MeshStandardMaterial({ map: indMap, emissive: '#ffffff', emissiveMap: indMap, emissiveIntensity: 1.1, roughness: 0.4 }), [0, openH + 0.36, 0.001]).castShadow = false;

    // ---- Mat and shadow ----
    const matZ = 0.5;
    if (a.mat !== 'none') {
      const runner = a.mat === 'runner';
      const matMap = paint(512, runner ? 1024 : 300, (c, w, h) => {
        const base = a.mat === 'plain' ? '#5c5e60' : runner ? '#8c1c22' : '#6b4a2c';
        c.fillStyle = base; c.fillRect(0, 0, w, h);
        if (a.mat === 'plain') { c.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < h; y += 12) c.fillRect(0, y, w, 5); }
        else if (runner) { c.fillStyle = '#d2b05a'; c.fillRect(0, 0, w, 18); c.fillRect(0, h - 18, w, 18); c.fillRect(0, 0, 18, h); c.fillRect(w - 18, 0, 18, h); }
        else {
          for (let i = 0; i < 4000; i++) { c.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,230,180,0.14)'; c.fillRect(random() * w, random() * h, 2, 4); }
          c.fillStyle = '#e7d7b4'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.font = 'bold 72px serif';
          c.fillText(a.mat === 'hope' ? 'ABANDON HOPE' : 'WELCOME', w / 2, h / 2, w - 40);
          c.strokeStyle = '#e7d7b4'; c.lineWidth = 6; c.strokeRect(16, 16, w - 32, h - 32);
        }
        // Worn through down the middle, where feet go.
        const g = c.createRadialGradient(w / 2, h * 0.5, 10, w / 2, h * 0.5, w * 0.45);
        g.addColorStop(0, `rgba(190,180,160,${0.15 + mood.wear * 0.45})`); g.addColorStop(1, 'rgba(190,180,160,0)');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
      });
      const matMesh = s.mesh(new THREE.BoxGeometry(runner ? 0.8 : 1.0, 0.012, runner ? 1.7 : 0.6), new THREE.MeshStandardMaterial({ map: matMap, roughness: 1 }), [0, 0.006, runner ? matZ + 0.5 : matZ]);
      matMesh.rotation.y = (random() - 0.5) * 0.06;
    }
    if (a.shadow) {
      const shade = paint(256, 512, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.fillStyle = 'rgba(10,6,8,0.75)';
        // Head at the far end (toward the doors, top of the canvas), feet near the viewer.
        c.beginPath(); c.ellipse(128, 70, 42, 46, 0, 0, 7); c.fill();
        c.beginPath(); c.moveTo(60, 130); c.lineTo(196, 130); c.lineTo(180, 420); c.lineTo(150, 420); c.lineTo(140, 300); c.lineTo(116, 300); c.lineTo(106, 420); c.lineTo(76, 420); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(60, 135); c.lineTo(20, 330); c.lineTo(44, 336); c.lineTo(78, 190); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(196, 135); c.lineTo(236, 330); c.lineTo(212, 336); c.lineTo(178, 190); c.closePath(); c.fill();
      });
      const shadowMesh = s.mesh(new THREE.PlaneGeometry(0.7, 1.9), new THREE.MeshBasicMaterial({ map: shade, transparent: true, depthWrite: false, opacity: 0.8 }), [0.08, 0.016, 1.0]);
      shadowMesh.rotation.x = -Math.PI / 2; shadowMesh.rotation.z = 0.12; shadowMesh.castShadow = false; shadowMesh.renderOrder = 2;
    }

    // ---- Blocks ----
    if (a.block === 'note') {
      const note = s.label('OUT OF ORDER', 0.56, 0.22, [0.02, 1.35, doorZ + 0.03], '#a01818', '#f4efd9');
      note.rotation.z = (random() - 0.5) * 0.12;
      for (const x of [-0.24, 0.24]) s.box([0.06, 0.03, 0.002], [0.02 + x, 1.44 - x * 0.05, doorZ + 0.032], s.material('#d8cfa2', { transparent: true, opacity: 0.8 }));
    } else if (a.block === 'rope') {
      const brass = s.material('#c9a24a', { metalness: 0.85, roughness: 0.3 });
      const velvet = s.material('#8c1c22', { roughness: 0.9 });
      for (const x of [-0.7, 0.7]) {
        s.lathe([[0, 0], [0.16, 0], [0.16, 0.02], [0.05, 0.05], [0.025, 0.08], [0.025, 0.92], [0.05, 0.95], [0.05, 0.98], [0, 1.0]], brass, [x, 0, 0.35]);
        s.ball([0.045, 0.045, 0.045], [x, 1.0, 0.35], brass, 14);
      }
      s.tube([[-0.68, 0.93, 0.35], [-0.35, 0.78, 0.37], [0, 0.72, 0.38], [0.35, 0.78, 0.37], [0.68, 0.93, 0.35]], 0.028, velvet);
    } else if (a.block === 'cone') {
      const orange = s.material('#f0661f', { roughness: 0.5 });
      s.box([0.36, 0.03, 0.36], [0.1, 0.015, 0.4], s.material('#1c1c1e'));
      s.mesh(new THREE.ConeGeometry(0.16, 0.7, 20), orange, [0.1, 0.38, 0.4]);
      s.mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.1, 20), s.material('#f4f4f0', { roughness: 0.4 }), [0.1, 0.5, 0.4]);
    } else if (a.block === 'tape') {
      const tapeMap = paint(512, 64, (c, w, h) => { c.fillStyle = '#f2c71b'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a1e'; for (let x = -64; x < w; x += 64) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 32, h); c.lineTo(x + 64, 0); c.lineTo(x + 32, 0); c.closePath(); c.fill(); } });
      const tape = new THREE.MeshStandardMaterial({ map: tapeMap, roughness: 0.6, side: THREE.DoubleSide });
      for (const [y, tilt] of [[1.2, 0.06], [0.75, -0.08]] as const) {
        const strip = s.mesh(new THREE.PlaneGeometry(openW + 0.3, 0.07), tape, [0, y, doorZ + 0.05]);
        strip.rotation.z = tilt; strip.castShadow = false;
      }
    }

    // ---- Left behind ----
    const lx = -(openW / 2 + 0.05) + random() * 0.2, lz = 0.45;
    if (a.left === 'suitcase') {
      s.box([0.36, 0.5, 0.18], [lx, 0.27, lz], s.material('#5a3a2a', { roughness: 0.6 }));
      s.box([0.37, 0.02, 0.19], [lx, 0.27, lz], s.material('#2b1d16'));
      s.box([0.12, 0.03, 0.03], [lx, 0.535, lz], s.material('#2b1d16'));
      for (const z of [-0.07, 0.07]) s.cylinder(0.02, 0.02, 0.02, [lx + 0.14, 0.02, lz + z], dark, 10).rotation.z = Math.PI / 2;
    } else if (a.left === 'shoes') {
      for (const dx of [-0.07, 0.07]) { s.ball([0.045, 0.035, 0.13], [lx + dx, 0.035, lz], s.material('#1d1a18', { roughness: 0.3 }), 12); s.cylinder(0.036, 0.04, 0.035, [lx + dx, 0.07, lz - 0.06], s.material('#2a2622'), 12); }
    } else if (a.left === 'flowers') {
      const stem = s.material('#5a5a3a');
      const petal = s.material('#6b4a4a', { roughness: 0.95 });
      const wrap = s.material('#d9c9a1', { roughness: 0.9 });
      const bouquet = new THREE.Group(); bouquet.position.set(lx, 0.04, lz); bouquet.rotation.set(0, 0.6, Math.PI / 2 - 0.1);
      bouquet.add(s.mesh(new THREE.ConeGeometry(0.11, 0.32, 10, 1, true), wrap, [0, 0.16, 0]));
      for (let i = 0; i < 7; i++) { const t = (i / 7) * Math.PI * 2; bouquet.add(s.rod([Math.cos(t) * 0.03, 0.2, Math.sin(t) * 0.03], [Math.cos(t) * 0.09, 0.42 - random() * 0.08, Math.sin(t) * 0.09], 0.004, stem)); bouquet.add(s.ball([0.03, 0.02, 0.03], [Math.cos(t) * 0.09, 0.4 - random() * 0.08, Math.sin(t) * 0.09], petal, 8)); }
      s.root.add(bouquet);
    } else if (a.left === 'coffee') {
      s.cylinder(0.045, 0.036, 0.12, [lx, 0.06, lz], s.material('#f1ece2', { roughness: 0.6 }), 18);
      s.cylinder(0.047, 0.047, 0.012, [lx, 0.125, lz], s.material('#f8f6f0'), 18);
      s.box([0.12, 0.05, 0.001], [lx, 0.07, lz + 0.046], s.material('#8c1c22'));
    }

    const rate = mix(0.4, 2.5, mood.energy);
    let last = 0;
    return s.finish({
      footprint: 0.9,
      update: (_dt, time) => {
        const t = time * rate;
        if (cabGlow) cabGlow.emissiveIntensity = (a.doors === 'parted' ? 1.6 : 1.2) * (0.85 + 0.15 * Math.sin(t * 2.3) * Math.sin(t * 0.9));
        if (a.indicator === 'counter') {
          const tick = Math.floor(t * 1.2);
          if (tick !== last) { last = tick; counter = 1 + (tick % 99); drawIndicator(); indMap.needsUpdate = true; }
        }
      },
    });
  },
});
