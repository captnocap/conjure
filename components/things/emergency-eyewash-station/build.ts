import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = [number, number, number];

function signTexture(kind: 'shower' | 'eye' | 'words' | 'enamel', wear: number, random: () => number) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const g = c.getContext('2d')!;
  const enamel = kind === 'enamel';
  g.fillStyle = enamel ? '#f1ecd8' : '#12864a';
  g.fillRect(0, 0, 256, 320);
  g.strokeStyle = enamel ? '#b0202a' : '#ffffff'; g.lineWidth = 8; g.strokeRect(10, 10, 236, 300);
  g.fillStyle = g.strokeStyle; g.textAlign = 'center'; g.lineCap = 'round';
  if (kind === 'shower') {
    g.fillRect(70, 50, 116, 16); g.fillRect(120, 30, 16, 24);
    g.lineWidth = 6; for (let i = 0; i < 5; i++) { g.setLineDash([12, 12]); g.beginPath(); g.moveTo(78 + i * 25, 76); g.lineTo(68 + i * 30, 150); g.stroke(); }
    g.setLineDash([]);
    g.beginPath(); g.arc(128, 172, 22, 0, 7); g.fill(); g.fillRect(104, 200, 48, 76); g.fillRect(84, 200, 14, 54); g.fillRect(158, 200, 14, 54);
  } else if (kind === 'eye') {
    g.lineWidth = 10; g.beginPath(); g.moveTo(40, 150); g.quadraticCurveTo(128, 80, 216, 150); g.quadraticCurveTo(128, 220, 40, 150); g.stroke();
    g.beginPath(); g.arc(128, 150, 26, 0, 7); g.fill();
    g.lineWidth = 6; for (let i = 0; i < 4; i++) { g.setLineDash([10, 10]); g.beginPath(); g.moveTo(68 + i * 40, 50); g.lineTo(88 + i * 26, 100); g.stroke(); }
    g.setLineDash([]);
    g.fillRect(108, 236, 40, 14); g.fillRect(121, 223, 14, 40);
    g.font = 'bold 30px sans-serif'; g.fillText('EYE WASH', 128, 298);
  } else if (kind === 'words') {
    g.font = 'bold 40px sans-serif'; g.fillText('EMERGENCY', 128, 90, 220); g.fillText('SHOWER', 128, 140, 220);
    g.fillRect(96, 196, 64, 22); g.fillRect(117, 175, 22, 64);
    g.font = 'bold 24px sans-serif'; g.fillText('KEEP CLEAR', 128, 290);
  } else {
    g.font = 'bold 34px serif'; g.fillText('IN CASE OF', 128, 80, 210); g.fillText('ACCIDENT', 128, 124, 210);
    g.font = 'bold 26px serif'; g.fillText('PULL HANDLE', 128, 190, 210); g.fillText('SEND FOR', 128, 240, 210); g.fillText('MASTER', 128, 274, 210);
  }
  for (let i = 0; i < wear * 14; i++) { g.fillStyle = enamel ? 'rgba(90,50,20,0.5)' : 'rgba(210,220,200,0.35)'; g.beginPath(); g.ellipse(random() * 256, random() * 320, 4 + random() * 22, 3 + random() * 12, random() * 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default defineThing({
  questions: {
    state: choice('What is its story right now?', {
      unused: 'Never once used: dust caps on, an inspection tag hanging, a film of dust.',
      dripping: 'Slowly dripping from the shower head onto a small dark patch of floor.',
      triggered: 'Just pulled: water hammering down, the eyewash jets arcing, a puddle spreading fast.',
      testing: 'Being tested: a bucket hung under the bowl, the jets running, a clipboard propped against the post.',
      condemned: 'Out of order: bagged in plastic and crossed with red tape.',
    }),
    finish: choice('What are the pipes like?', {
      galvanised: 'Dull galvanised steel with yellow fittings.',
      yellow: 'Thick safety-yellow paint over everything.',
      green: 'Safety-green coated pipe, modern.',
      stainless: 'Polished stainless steel, cleanroom grade.',
    }),
    bowl: choice('What is the eyewash bowl?', {
      steel: 'A round stainless steel bowl.',
      yellow: 'A bright yellow plastic bowl.',
      green: 'A green bowl with a hinged dust lid.',
    }),
    sign: choice('What sign is above it?', {
      shower: 'A green pictogram of a figure under a shower.',
      eye: 'A green sign with an eye, falling drops and a white cross.',
      words: 'A green EMERGENCY SHOWER / KEEP CLEAR sign.',
      enamel: 'An old cream enamel plate in red lettering: IN CASE OF ACCIDENT.',
      missing: 'None: four screw holes and a pale rectangle where one used to be.',
    }),
    backing: choice('What is it fixed to?', {
      tiles: 'A section of white tiled wall.',
      block: 'A painted blockwork wall with a green dado stripe.',
      post: 'Nothing: it stands free on a floor flange.',
    }),
    floor: choice('What is on the floor around it?', {
      hatch: 'A yellow and black hazard-striped box painted on the floor.',
      drain: 'A square steel drain grate set in the floor.',
      blocked: 'Cardboard boxes and a mop bucket stacked in the way, against every rule.',
      bare: 'Nothing: bare floor.',
    }),
    left: choice('What has been left behind?', {
      nothing: 'Nothing.',
      coat: 'A lab coat dropped in a heap, and a pair of goggles.',
      footprints: 'Wet footprints leading away from it.',
      shoe: 'A single shoe.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pipeColour = { galvanised: '#9aa3a6', yellow: '#f2c318', green: '#1f8a4c', stainless: '#d5dadc' }[a.finish];
    const pipe = s.material(pipeColour, { metalness: a.finish === 'galvanised' ? 0.6 : a.finish === 'stainless' ? 0.95 : 0.1, roughness: a.finish === 'stainless' ? 0.18 : 0.5 });
    const yellow = s.material('#f2c318', { roughness: 0.45 });
    const steel = s.material('#cfd5d7', { metalness: 0.9, roughness: 0.25 });
    const dark = s.material('#232527', { roughness: 0.7 });
    const R = 0.026;
    const run = (pts: P[], r = R, m: THREE.Material = pipe) => {
      for (let i = 0; i < pts.length - 1; i++) s.rod(pts[i], pts[i + 1], r, m);
      for (let i = 1; i < pts.length - 1; i++) s.ball([r * 1.35, r * 1.35, r * 1.35], pts[i], m, 12);
    };
    const flowing = a.state === 'triggered', testing = a.state === 'testing', condemned = a.state === 'condemned';
    const water = new THREE.MeshStandardMaterial({ color: '#a8dcee', roughness: 0.05, metalness: 0.1, emissive: '#2f7fa0', emissiveIntensity: 0.18 });
    const spray = new THREE.MeshStandardMaterial({ color: '#d8f2fa', roughness: 0.2, emissive: '#6ab8d8', emissiveIntensity: 0.25 });

    // Backing wall.
    const wallZ = -0.2;
    if (a.backing !== 'post') {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 720;
      const g = c.getContext('2d')!;
      if (a.backing === 'tiles') {
        g.fillStyle = '#eef0ea'; g.fillRect(0, 0, 512, 720);
        g.strokeStyle = '#b9bdb4'; g.lineWidth = 3;
        for (let x = 0; x <= 512; x += 51.2) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 720); g.stroke(); }
        for (let y = 0; y <= 720; y += 51.4) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
        for (let i = 0; i < mood.wear * 12; i++) { g.fillStyle = `rgba(120,110,80,${0.15 + random() * 0.2})`; g.fillRect(Math.floor(random() * 10) * 51.2 + 2, Math.floor(random() * 14) * 51.4 + 2, 48, 48); }
      } else {
        g.fillStyle = '#e4dfcc'; g.fillRect(0, 0, 512, 720);
        g.fillStyle = '#5f8f72'; g.fillRect(0, 420, 512, 300);
        g.fillStyle = '#2f5a44'; g.fillRect(0, 410, 512, 14);
        g.strokeStyle = 'rgba(60,60,50,0.22)'; g.lineWidth = 3;
        for (let y = 0; y <= 720; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); for (let x = (y / 60) % 2 ? 0 : 64; x <= 512; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 60); g.stroke(); } }
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      s.box([1.8, 2.6, 0.12], [0, 1.3, wallZ - 0.06], s.material('#d9d6c8'));
      s.mesh(new THREE.PlaneGeometry(1.8, 2.6), new THREE.MeshStandardMaterial({ map: t, roughness: a.backing === 'tiles' ? 0.25 : 0.9 }), [0, 1.3, wallZ + 0.001]);
      s.box([1.8, 0.1, 0.02], [0, 0.05, wallZ + 0.01], dark);
      for (const y of [0.55, 1.95]) { s.rod([0, y, wallZ], [0, y, 0], 0.014, steel); s.box([0.1, 0.1, 0.012], [0, y, wallZ + 0.008], steel); }
    }

    // Post, shower arm and head.
    s.cylinder(0.09, 0.1, 0.02, [0, 0.01, 0], pipe, 20);
    for (let i = 0; i < 4; i++) s.cylinder(0.012, 0.012, 0.012, [Math.cos(i * 1.571 + 0.785) * 0.075, 0.026, Math.sin(i * 1.571 + 0.785) * 0.075], dark, 6);
    const TOP = 2.3, HX = 0.58;
    run([[0, 0.02, 0], [0, TOP, 0], [0, TOP, HX], [0, TOP - 0.1, HX]]);
    s.cylinder(0.04, 0.04, 0.05, [0, 1.02, 0], a.finish === 'galvanised' ? yellow : pipe, 12);
    const headMat = a.finish === 'stainless' || a.finish === 'galvanised' ? (a.finish === 'galvanised' ? yellow : steel) : pipe;
    s.lathe([[0.03, 0.06], [0.05, 0.045], [0.15, 0.012], [0.155, 0], [0.14, 0.004], [0, 0.02]], headMat, [0, TOP - 0.16, HX]);
    // Valve and pull rod.
    s.box([0.08, 0.08, 0.1], [0, TOP, 0.22], a.finish === 'galvanised' ? yellow : pipe);
    const pulled = flowing ? 0.18 : 0;
    s.rod([0, TOP + 0.03, 0.22], [0.2, TOP + 0.03 - pulled * 0.4, 0.22], 0.01, steel);
    const hy = 1.62 - pulled;
    s.rod([0.2, TOP + 0.03 - pulled * 0.4, 0.22], [0.2, hy + 0.11, 0.22], 0.007, steel);
    const handle = s.mesh(new THREE.TorusGeometry(0.1, 0.014, 8, 3), yellow, [0.2, hy, 0.22]);
    handle.rotation.z = Math.PI / 2;
    handle.castShadow = true;

    // Eyewash bowl.
    const BY = 1.0, BZ = 0.34;
    const bowlMat = { steel, yellow, green: s.material('#1f8a4c', { roughness: 0.45 }) }[a.bowl];
    run([[0, BY, 0], [0, BY, BZ - 0.02]], 0.02);
    s.lathe([[0, 0], [0.03, 0], [0.12, 0.05], [0.165, 0.1], [0.17, 0.1], [0.125, 0.04], [0.03, -0.012], [0, -0.012]], bowlMat, [0, BY - 0.02, BZ]);
    run([[0, BY - 0.03, BZ], [0, BY - 0.28, BZ], [0, BY - 0.28, 0]], 0.018);
    for (const x of [-1, 1]) {
      s.cylinder(0.014, 0.018, 0.05, [x * 0.05, BY + 0.045, BZ], steel, 10);
      if (a.state === 'unused' || condemned) s.cylinder(0.022, 0.022, 0.014, [x * 0.05, BY + 0.076, BZ], yellow, 10);
      else if (a.state === 'dripping') { const cap = s.cylinder(0.022, 0.022, 0.014, [x * 0.1, BY + 0.04, BZ + 0.06], yellow, 10); cap.rotation.z = x * 0.8; }
    }
    s.box([0.12, 0.012, 0.03], [0, BY + 0.03, BZ], steel);
    const paddle = s.box([0.012, 0.13, 0.1], [0.2, BY + 0.07, BZ - 0.08], yellow);
    paddle.rotation.z = flowing || testing ? -0.5 : 0;
    s.rod([0, BY + 0.01, BZ - 0.12], [0.2, BY + 0.02, BZ - 0.08], 0.009, steel);
    // Foot treadle.
    s.rod([-0.05, BY, 0.08], [-0.05, 0.12, 0.2], 0.008, steel);
    const pedal = s.box([0.16, 0.012, 0.2], [-0.05, 0.07, 0.3], yellow);
    pedal.rotation.x = flowing ? 0.05 : 0.35;
    s.rod([-0.05, 0.03, 0.12], [-0.05, 0.12, 0.2], 0.008, steel);
    if (a.bowl === 'green') {
      const lid = new THREE.Group();
      lid.position.set(0, BY + 0.085, BZ - 0.17);
      lid.rotation.x = a.state === 'unused' || condemned ? 0 : -1.3;
      s.root.add(lid);
      lid.add(s.cylinder(0.175, 0.175, 0.016, [0, 0.008, 0.17], bowlMat, 20));
    }

    // Sign.
    const signX = a.backing === 'post' ? 0 : 0.52, signY = a.backing === 'post' ? 1.72 : 1.85, signZ = a.backing === 'post' ? 0.035 : wallZ + 0.012;
    if (a.sign !== 'missing') {
      const face = new THREE.MeshStandardMaterial({ map: signTexture(a.sign, mood.wear, random), roughness: a.sign === 'enamel' ? 0.25 : 0.6 });
      s.box([0.34, 0.42, 0.008], [signX, signY, signZ - 0.004], s.material('#e8e8e2'));
      const plate = s.mesh(new THREE.PlaneGeometry(0.33, 0.41), face, [signX, signY, signZ + 0.001]);
      plate.rotation.z = (random() - 0.5) * mood.wear * 0.2;
    } else {
      s.box([0.33, 0.41, 0.003], [signX, signY, signZ - 0.001], s.material(a.backing === 'post' ? '#b9bfc0' : '#f6f6f0'));
      for (const x of [-1, 1]) for (const y of [-1, 1]) s.cylinder(0.008, 0.008, 0.006, [signX + x * 0.14, signY + y * 0.18, signZ], dark, 6).rotation.x = Math.PI / 2;
    }

    // Floor.
    if (a.floor === 'hatch') {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d')!;
      g.fillStyle = '#f2c318'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#1a1a1a';
      for (let i = -8; i < 16; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 16, 0); g.lineTo(i * 32 + 16 - 256, 256); g.lineTo(i * 32 - 256, 256); g.fill(); }
      g.clearRect(28, 28, 200, 200);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      const box = s.mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.5, roughness: 0.8 }), [0, 0.003, 0.5]);
      box.rotation.x = -Math.PI / 2;
      box.castShadow = false;
    } else if (a.floor === 'drain') {
      s.box([0.34, 0.01, 0.34], [0, 0.004, HX], dark);
      for (let i = 0; i < 6; i++) s.box([0.3, 0.012, 0.024], [0, 0.008, HX - 0.125 + i * 0.05], steel);
    } else if (a.floor === 'blocked') {
      const card = s.material('#b98d5a', { roughness: 0.95 });
      const n = Math.round(mix(2, 5, mood.density));
      for (let i = 0; i < n; i++) {
        const w = 0.32 + random() * 0.14, h = 0.24 + random() * 0.14;
        const crate = s.box([w, h, 0.34], [0.42 + (i % 2) * 0.05 + random() * 0.04, h / 2 + (i > 1 ? 0.3 * Math.floor(i / 2) : 0), 0.3 + (i % 2) * 0.42], card);
        crate.rotation.y = (random() - 0.5) * 0.4;
      }
      s.cylinder(0.15, 0.12, 0.26, [-0.45, 0.13, 0.55], s.material('#d8a02a'), 18);
      s.rod([-0.45, 0.1, 0.55], [-0.62, 1.25, 0.4], 0.013, s.material('#b98a52'));
      s.ball([0.1, 0.05, 0.06], [-0.45, 0.24, 0.55], s.material('#e8e4d6', { roughness: 1 }), 10);
    }

    // Water.
    const streaks: THREE.Mesh[] = [];
    const jets: THREE.Mesh[] = [];
    let drop: THREE.Mesh | null = null;
    if (flowing) {
      for (let i = 0; i < 26; i++) {
        const t = random() * 6.283, r = 0.03 + random() * 0.12, spread = 1.6 + random() * 0.8;
        const m = s.rod([Math.cos(t) * r, TOP - 0.17, HX + Math.sin(t) * r], [Math.cos(t) * r * spread, 0.02, HX + Math.sin(t) * r * spread], 0.007 + random() * 0.006, spray);
        m.castShadow = false;
        streaks.push(m);
      }
      const veil = s.cylinder(0.14, 0.34, TOP - 0.2, [0, (TOP - 0.16) / 2, HX], new THREE.MeshStandardMaterial({ color: '#d8f2fa', transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.3 }), 20);
      veil.castShadow = false;
    }
    if (flowing || testing) {
      for (const x of [-1, 1]) {
        const jet = s.tube([[x * 0.05, BY + 0.07, BZ], [x * 0.03, BY + 0.2, BZ + 0.01], [0, BY + 0.24, BZ + 0.02], [-x * 0.05, BY + 0.16, BZ + 0.03], [-x * 0.09, BY + 0.06, BZ + 0.03]], 0.008, spray);
        jet.castShadow = false;
        jets.push(jet);
      }
      s.cylinder(0.12, 0.1, 0.012, [0, BY + 0.04, BZ], water, 18);
    }
    if (testing) {
      s.cylinder(0.14, 0.11, 0.24, [0, BY - 0.42, BZ], s.material('#3a6ea8'), 18);
      s.cylinder(0.13, 0.13, 0.01, [0, BY - 0.33, BZ], water, 18);
      s.ring(0.14, 0.005, [0, BY - 0.24, BZ], steel, Math.PI).rotation.y = Math.PI / 2;
      s.rod([0, BY - 0.1, BZ], [0, BY - 0.33, BZ], 0.012, spray).castShadow = false;
      const board = s.label('WEEKLY TEST', 0.22, 0.31, [0.2, 0.17, 0.08], '#2a2a2a', '#f4f1e4');
      board.rotation.set(-0.25, 0.4, 0);
      s.box([0.24, 0.33, 0.01], [0.2, 0.17, 0.07], s.material('#7a5a3a')).rotation.set(-0.25, 0.4, 0);
    }
    const puddleR = flowing ? mix(0.7, 1.0, mood.energy) : a.state === 'dripping' ? 0.2 + mood.wear * 0.12 : 0;
    if (puddleR) {
      const pool = s.cylinder(puddleR, puddleR, 0.006, [0.05, 0.004, HX + (flowing ? 0.1 : 0)], water, 36);
      pool.scale.set(1.15, 1, 0.85);
      pool.rotation.y = random() * 3;
      for (let i = 0; i < (flowing ? 5 : 2); i++) { const r = puddleR * (0.3 + random() * 0.35); s.cylinder(r, r, 0.006, [0.05 + (random() - 0.5) * puddleR * 1.6, 0.0035, HX + (random() - 0.2) * puddleR * 1.3], water, 20); }
      if (flowing) for (let i = 1; i < 4; i++) s.ring(i * 0.11, 0.006, [0, 0.009, HX], spray).rotation.x = Math.PI / 2;
    }
    if (a.state === 'dripping') {
      drop = s.ball([0.012, 0.018, 0.012], [0, TOP - 0.2, HX], spray, 8);
      s.rod([0.02, TOP - 0.165, HX], [0.02, TOP - 0.2, HX], 0.005, spray);
      const stain = s.material('#6a4a2a', { transparent: true, opacity: 0.5, depthWrite: false });
      s.box([0.03, 0.5, 0.002], [0, TOP - 0.3, 0.028], stain).castShadow = false;
    }

    // Tag, plastic bag and tape.
    if (a.state === 'unused' || testing) {
      s.rod([0, BY - 0.28, 0.15], [0.01, BY - 0.36, 0.16], 0.002, dark);
      const tag = s.label(a.state === 'unused' ? 'CHECKED' : 'TEST', 0.1, 0.14, [0.01, BY - 0.43, 0.16], '#1a1a1a', a.state === 'unused' ? '#e8dfb0' : '#9ad88a');
      tag.rotation.set(0, 0.3 + random() * 0.6, (random() - 0.5) * 0.3);
    }
    if (condemned) {
      const bag = s.material('#c9d6d8', { roughness: 0.25, transparent: true, opacity: 0.88 });
      s.ball([0.2, 0.17, 0.2], [0, TOP - 0.2, HX], bag, 14);
      s.cylinder(0.05, 0.12, 0.1, [0, TOP - 0.06, HX], bag, 10);
      s.ball([0.22, 0.2, 0.22], [0, BY + 0.02, BZ], bag, 14);
      const tape = s.material('#d8262c', { roughness: 0.6 });
      for (const k of [-1, 1]) { const band = s.box([0.05, 1.5, 0.004], [0, 1.45, 0.2], tape); band.rotation.set(0.28, 0, k * 0.2); band.position.x = k * 0.02; band.position.z = 0.36; }
      s.ring(0.06, 0.012, [0, TOP - 0.36, HX], tape).rotation.x = Math.PI / 2;
      const note = s.label('OUT OF ORDER', 0.36, 0.14, [0, 1.42, 0.42], '#ffffff', '#d8262c');
      note.rotation.z = (random() - 0.5) * 0.25;
    }
    if (a.state === 'unused' || mood.wear > 0.6) {
      const dust = s.material('#b8b2a0', { roughness: 1 });
      s.cylinder(0.14, 0.14, 0.004, [0, TOP - 0.1, HX], dust, 16);
      const web = s.material('#e8e8e2', { transparent: true, opacity: 0.5, depthWrite: false });
      for (let i = 0; i < 6; i++) s.rod([0, TOP, 0.02], [(random() - 0.5) * 0.04, TOP - 0.1 - random() * 0.25, 0.1 + random() * 0.35], 0.0015, web).castShadow = false;
    }

    // Left behind.
    if (a.left === 'coat') {
      const cloth = s.material('#f1f1ec', { roughness: 0.95 });
      const cx = -0.55, cz = 0.75;
      s.ball([0.28, 0.06, 0.2], [cx, 0.05, cz], cloth, 12);
      s.ball([0.14, 0.07, 0.12], [cx + 0.08, 0.09, cz - 0.05], cloth, 10);
      s.cylinder(0.05, 0.04, 0.42, [cx - 0.12, 0.04, cz + 0.2], cloth, 10).rotation.set(Math.PI / 2, 0, 0.9);
      for (const k of [-1, 1]) s.cylinder(0.03, 0.032, 0.03, [cx + 0.35 + k * 0.035, 0.02, cz + 0.1], s.material('#bfe6f0', { roughness: 0.15 }), 12).rotation.x = Math.PI / 2;
      s.ring(0.06, 0.004, [cx + 0.35, 0.02, cz + 0.04], dark).rotation.x = Math.PI / 2;
    } else if (a.left === 'footprints') {
      const wet = new THREE.MeshStandardMaterial({ color: '#7fa8b8', roughness: 0.1, transparent: true, opacity: 0.75 });
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1, d = 0.5 + i * 0.26;
        const fx = Math.sin(0.9) * d * 0.9 + side * 0.08, fz = HX + Math.cos(0.9) * d * 0.75;
        const fade = 1 - i * 0.12;
        const sole = s.cylinder(0.045 * fade, 0.045 * fade, 0.003, [fx, 0.003, fz], wet, 12);
        sole.scale.z = 2; sole.rotation.y = 0.9; sole.castShadow = false;
        s.cylinder(0.035 * fade, 0.035 * fade, 0.003, [fx - Math.sin(0.9) * 0.12, 0.003, fz - Math.cos(0.9) * 0.12], wet, 10).castShadow = false;
      }
    } else if (a.left === 'shoe') {
      const leather = s.material(['#22262a', '#6a3e1e', '#f1f1ec'][Math.floor(random() * 3)], { roughness: 0.5 });
      const g = new THREE.Group();
      g.position.set(-0.4 + random() * 0.2, 0, 0.8);
      g.rotation.set(0, random() * 6, random() < 0.5 ? 1.4 : 0);
      if (g.rotation.z) g.position.y = 0.045;
      s.root.add(g);
      g.add(s.box([0.09, 0.025, 0.26], [0, 0.0125, 0], dark), s.ball([0.047, 0.04, 0.09], [0, 0.05, 0.07], leather, 12), s.box([0.085, 0.09, 0.1], [0, 0.07, -0.07], leather));
    }

    const speed = mix(0.4, 1.6, mood.energy);
    return s.finish({
      update(_dt, time) {
        streaks.forEach((m, i) => { m.scale.x = m.scale.z = 0.7 + 0.5 * Math.abs(Math.sin(time * speed * 9 + i * 1.7)); });
        jets.forEach((m, i) => { m.scale.y = 1 + Math.sin(time * speed * 7 + i) * 0.04; });
        if (drop) { const t = (time * speed * 0.6) % 1; drop.position.y = TOP - 0.2 - t * t * (TOP - 0.22); drop.visible = t < 0.95; }
      },
    });
  },
});
