import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];

const TAGS = {
  mama: 'MAMA, in a child\'s crayon capitals.',
  name: 'A first name and a birth year, in careful looping ink.',
  nowake: 'DO NOT WAKE, underlined twice.',
  arrival: 'WAKE ME WHEN WE ARRIVE.',
  number: 'Only a stencilled berth number; nobody remembers the name.',
  sorry: 'SORRY, in a shaky hand.',
  blank: 'A tag gone blank, the ink faded away entirely.',
} as const;

export default defineThing({
  questions: {
    state: choice('What state is the pod in?', {
      sleeping: 'Occupied and stable: a still figure under frost, cool blue glow, steady green lights.',
      waking: 'Thaw cycle running: the frost is melting, amber lights pulse, mist spills from the seals.',
      unused: 'Never used: spotless, lid closed over a folded blanket, a single standby light.',
      failed: 'Failed long ago: dark inside, red warning lights, cracked pane, a shrouded shape nobody has moved.',
      escaped: 'Opened from inside: the lid forced ajar, shards on the deck, wet footprints leading away.',
      vacated: 'Opened on schedule: the lid swung wide, the liner rumpled and empty, the sleeper already gone.',
    }),
    sleeper: choice('If someone is inside, who is it?', {
      crew: 'An adult crew member in a plain pale sleep-suit.',
      child: 'A small child, tiny in the big pod, holding a stuffed toy.',
      elder: 'A white-haired, bearded elder.',
      officer: 'An officer in dark uniform with gold bars.',
      gardener: 'A gardener in green overalls with a straw hat laid on their chest.',
    }),
    tag: choice('What does the hand-written name tag say?', TAGS),
    shell: choice('What is the pod shell like?', {
      medical: 'Smooth white medical composite with a teal stripe.',
      brass: 'Old riveted brass and dark iron, first-generation engineering.',
      military: 'Matte olive-grey with hazard chevrons, built for a hold, not a bedside.',
      painted: 'Hand-painted by generations of visitors with flowers and small suns.',
    }),
    lean: score('How does the pod stand?', ['Laid almost flat like a bed', 'Tilted back at an easy angle', 'Propped nearly upright like a standing coffin']),
    left: choice('What has been left beside it?', {
      nothing: 'Nothing.',
      flowers: 'A jar of fresh flowers.',
      drawing: 'A child\'s drawing taped to the cradle.',
      shoes: 'A pair of shoes set neatly at its foot.',
      candles: 'A cluster of burnt-down candles.',
      tools: 'An open service panel, a toolbox and trailing cables.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => mix(lo, hi, random());

    const shellColour = { medical: '#e8ece9', brass: '#b08d4a', military: '#6f7765', painted: '#e9dcc0' }[a.shell];
    const shell = s.material(shellColour, { metalness: a.shell === 'brass' ? 0.75 : 0.1, roughness: a.shell === 'brass' ? 0.4 : 0.55, side: THREE.DoubleSide });
    const trim = s.material({ medical: '#3f9a94', brass: '#2c2a28', military: '#e0b020', painted: '#c8553d' }[a.shell], { metalness: a.shell === 'brass' ? 0.6 : 0.1 });
    const dark = s.material('#24292c', { roughness: 0.7 });
    const steel = s.material('#98a2a5', { metalness: 0.75, roughness: 0.35 });

    const occupied = a.state === 'sleeping' || a.state === 'waking' || a.state === 'failed';
    const open = a.state === 'escaped' ? rr(0.75, 1.1) : a.state === 'vacated' ? rr(1.9, 2.15) : 0;
    const lean = mix(1.25, 0.42, a.lean) + rr(-0.04, 0.04);

    // The pod is built upright along +y with the lid facing +z, then leaned back as one piece.
    const pod = new THREE.Group();
    s.root.add(pod);
    const P = <T extends THREE.Object3D>(o: T) => { pod.add(o); return o; };
    const profile: [number, number][] = [[0, 0], [0.26, 0.02], [0.41, 0.16], [0.47, 0.5], [0.49, 1.3], [0.45, 1.8], [0.3, 2.08], [0, 2.15]];
    const pts = profile.map(([x, y]) => new THREE.Vector2(x, y));
    const smooth = new THREE.SplineCurve(pts).getPoints(28);
    const tub = P(s.mesh(new THREE.LatheGeometry(smooth, 20, Math.PI / 2, Math.PI), shell));
    tub.scale.z = 0.8;
    // Rim frame along the seam.
    const seam: V3[] = [...smooth.slice(1, -1).map((p): V3 => [p.x, p.y, 0]), ...smooth.slice(1, -1).reverse().map((p): V3 => [-p.x, p.y, 0])];
    P(s.tube(seam, 0.042, trim, true));
    for (let i = 0; i < 4; i++) {
      const y = 0.35 + i * 0.48;
      const band = P(s.mesh(new THREE.TorusGeometry(0.485, 0.018, 6, 20, Math.PI), a.shell === 'brass' ? dark : trim, [0, y, 0]));
      band.rotation.x = Math.PI / 2; band.rotation.z = Math.PI; band.scale.y = 0.72; band.scale.x = [0.95, 1, 1, 0.9][i];
    }

    // Liner.
    const failed = a.state === 'failed';
    const linerMat = s.material(failed ? '#3b4046' : '#dfe6ea', { emissive: failed ? '#000000' : new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.6, 0.5), emissiveIntensity: failed || a.state === 'vacated' || a.state === 'escaped' ? 0 : a.state === 'unused' ? 0.12 : 0.4 });
    const liner = P(s.mesh(new THREE.CapsuleGeometry(0.36, 1.25, 6, 16), linerMat, [0, 1.07, -0.2]));
    liner.scale.z = 0.3;

    // Sleeper.
    if (occupied) {
      const fig = new THREE.Group();
      const k = a.sleeper === 'child' ? 0.58 : a.sleeper === 'elder' ? 0.93 : 1;
      const shroud = failed ? '#4a4d50' : null;
      const suit = s.material(shroud ?? { crew: '#cfd6d8', child: '#f0c96a', elder: '#b9a9c9', officer: '#26324f', gardener: '#4f7d4a' }[a.sleeper]);
      const skin = s.material(shroud ?? ['#e4b596', '#c98f6c', '#8a5a3c', '#f0cdb4'][Math.floor(random() * 4)]);
      const hair = s.material(shroud ?? (a.sleeper === 'elder' ? '#f1f1ee' : ['#2a2320', '#6a4526', '#c49a4a', '#1b1b1f'][Math.floor(random() * 4)]));
      const F = (m: THREE.Mesh) => { fig.add(m); return m; };
      const cap = (r: number, len: number, at: V3, mat: THREE.Material) => F(s.mesh(new THREE.CapsuleGeometry(r, len, 5, 12), mat, at));
      cap(0.17, 0.36, [0, 1.25, 0.02], suit).scale.set(1.05, 1, 0.7);
      for (const x of [-0.09, 0.09]) { cap(0.075, 0.7, [x, 0.52, 0.01], suit); F(s.ball([0.06, 0.05, 0.11], [x, 0.09, 0.06], failed ? suit : s.material('#3a3f42'), 10)); }
      for (const x of [-0.25, 0.25]) { cap(0.05, 0.44, [x, 1.2, 0.02], suit); F(s.ball([0.045, 0.06, 0.04], [x, 0.9, 0.04], skin, 10)); }
      F(s.ball([0.115, 0.13, 0.12], [0, 1.68, 0.03], skin, 16));
      F(s.ball([0.125, 0.12, 0.1], [0, 1.72, -0.02], hair, 14));
      if (!failed) {
        if (a.sleeper === 'elder') F(s.ball([0.075, 0.09, 0.05], [0, 1.57, 0.1], hair, 10));
        if (a.sleeper === 'officer') { for (let i = 0; i < 3; i++) F(s.box([0.1, 0.014, 0.01], [-0.08, 1.4 - i * 0.03, 0.135], s.material('#e2b93a', { metalness: 0.6 }))); for (const x of [-0.2, 0.2]) F(s.box([0.09, 0.03, 0.08], [x, 1.5, 0.03], s.material('#e2b93a', { metalness: 0.6 }))); }
        if (a.sleeper === 'gardener') { const straw = s.material('#d9bb6a'); F(s.cylinder(0.2, 0.2, 0.012, [0, 1.22, 0.16], straw, 18)).rotation.x = Math.PI / 2 - 0.15; F(s.cylinder(0.09, 0.1, 0.08, [0, 1.22, 0.2], straw, 14)).rotation.x = Math.PI / 2 - 0.15; }
        if (a.sleeper === 'child') { const fur = s.material('#9a6a3e'); F(s.ball([0.1, 0.12, 0.08], [0.05, 1.2, 0.14], fur, 10)); F(s.ball([0.075, 0.075, 0.07], [0.05, 1.36, 0.16], fur, 10)); for (const x of [-0.01, 0.11]) F(s.ball([0.03, 0.03, 0.02], [x, 1.42, 0.16], fur, 8)); }
      }
      fig.scale.setScalar(k);
      fig.position.set(0, 0.2, -0.12);
      pod.add(fig);
    } else if (a.state === 'unused') {
      P(s.box([0.42, 0.3, 0.09], [0, 0.55, -0.07], s.material('#7fa3b8')));
      P(s.box([0.44, 0.04, 0.095], [0, 0.6, -0.068], s.material('#e9e6dc')));
      P(s.ball([0.16, 0.11, 0.05], [0, 1.7, -0.09], s.material('#f1f1ec'), 12));
    } else {
      // A rumpled thermal blanket trailing out over the rim.
      const wool = s.material(['#7fa3b8', '#c98a6a', '#8fae7a'][Math.floor(random() * 3)], { roughness: 0.95 });
      P(s.ball([0.3, 0.42, 0.05], [-0.06, 0.95, -0.1], wool, 12)).rotation.z = rr(-0.3, 0.3);
      P(s.ball([0.14, 0.3, 0.2], [0.47, 0.72, 0.02], wool, 12)).rotation.z = 0.2;
      P(s.ball([0.1, 0.34, 0.06], [0.56, 0.5, 0.1], wool, 12));
      P(s.ball([0.16, 0.11, 0.05], [0.05, 1.7, -0.09], s.material('#e6e3d6'), 12)).rotation.z = 0.4;
    }

    // Lid: glass half shell, frost layer and frame, hinged along the -x seam.
    const hinge = new THREE.Group();
    hinge.position.set(-0.49, 0, 0);
    pod.add(hinge);
    const glass = new THREE.MeshPhysicalMaterial({ color: failed ? '#8a9aa0' : '#bfe4f2', transparent: true, opacity: failed ? 0.34 : 0.2, roughness: 0.08, depthWrite: false, side: THREE.DoubleSide });
    const lidGeo = new THREE.LatheGeometry(smooth, 20, -Math.PI / 2, Math.PI);
    const lid = new THREE.Mesh(lidGeo, glass);
    lid.scale.z = 0.5; lid.position.x = 0.49;
    hinge.add(lid);
    const frostAmount = { sleeping: mix(0.85, 0.5, mood.warmth), waking: 0.3, unused: 0.04, failed: 0.6, escaped: 0.25, vacated: 0.08 }[a.state];
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const g = canvas.getContext('2d')!;
    for (let i = 0; i < 900 * frostAmount + 20; i++) {
      const x = random() * 256, y = random() * 256;
      const edge = Math.max(Math.abs(x - 128) / 128, Math.abs(y - 128) / 128);
      const face = Math.hypot((x - 128) / 60, (y - 60) / 34);
      if (a.state === 'sleeping' && face < 1) continue;
      if (random() > 0.25 + edge * 0.9 * (1.2 - frostAmount) + frostAmount * 0.7) continue;
      const r = 4 + random() * 16;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, failed ? 'rgba(214,214,200,0.75)' : 'rgba(245,252,255,0.8)');
      grd.addColorStop(1, 'rgba(245,252,255,0)');
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    if (failed || a.state === 'escaped') {
      g.strokeStyle = 'rgba(30,36,40,0.9)'; g.lineWidth = 2;
      const cx = 100 + random() * 56, cy = 90 + random() * 70; for (let k = 0; k < 6; k++) { let x = cx, y = cy; const dir = k * 1.05 + random() * 0.5; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 3; j++) { x += Math.cos(dir + (random() - 0.5) * 0.7) * 16; y += Math.sin(dir + (random() - 0.5) * 0.7) * 16; g.lineTo(x, y); } g.stroke(); }
    }
    if (a.state === 'escaped') { g.fillStyle = 'rgba(245,252,255,0.85)'; for (const [hx, hy] of [[104, 96], [150, 104]]) { g.beginPath(); g.ellipse(hx, hy, 9, 11, 0, 0, 7); g.fill(); for (let f = 0; f < 4; f++) { g.beginPath(); g.ellipse(hx - 9 + f * 6, hy - 16, 2.4, 7, 0, 0, 7); g.fill(); } } }
    const frostTex = new THREE.CanvasTexture(canvas);
    frostTex.colorSpace = THREE.SRGBColorSpace;
    const frost = new THREE.Mesh(lidGeo.clone(), new THREE.MeshStandardMaterial({ map: frostTex, transparent: true, depthWrite: false, roughness: 0.9, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.15, emissiveMap: frostTex }));
    frost.scale.set(1.01, 1.003, 0.51); frost.position.x = 0.49;
    hinge.add(frost);
    const lidRim = s.tube(seam.map(([x, y]): V3 => [x + 0.49, y, 0.035]), 0.022, steel, true);
    hinge.add(lidRim);
    // A centre spine on the lid so the dome reads even when the glass is clear.
    const spine: V3[] = smooth.slice(2, -2).map((p): V3 => [0.49, p.y, p.x * 0.505]);
    hinge.add(s.tube(spine, 0.012, steel));
    // Opaque shell caps over the feet and the crown, so the glass reads as a window.
    for (const part of [smooth.filter((p) => p.y <= 0.46), smooth.filter((p) => p.y >= 1.88)]) {
      const capMesh = s.mesh(new THREE.LatheGeometry(part, 20, -Math.PI / 2, Math.PI), shell, [0.49, 0, 0]);
      capMesh.scale.set(1.015, 1, 0.53);
      hinge.add(capMesh);
    }
    for (const y of [0.46, 1.88]) {
      const r = y < 1 ? 0.468 : 0.42;
      const edge = s.mesh(new THREE.TorusGeometry(r, 0.02, 6, 20, Math.PI), trim, [0.49, y, 0]);
      edge.rotation.x = Math.PI / 2; edge.scale.y = 0.53;
      hinge.add(edge);
    }
    hinge.rotation.y = -open;

    // Status panel at the foot of the frame and the name tag.
    const lights: { mesh: THREE.Mesh; rate: number; phase: number }[] = [];
    P(s.box([0.52, 0.13, 0.05], [0, 0.26, 0.235], dark)).rotation.x = -0.25;
    const pattern = { sleeping: ['#35e07a', '#35e07a', '#35e07a', '#3fb8ff', '#35e07a'], waking: ['#ffb02a', '#ffb02a', '#35e07a', '#ffb02a', '#ffb02a'], unused: ['#20262a', '#20262a', '#f2f6ff', '#20262a', '#20262a'], failed: ['#ff2a2a', '#ff2a2a', '#20262a', '#ff2a2a', '#ff2a2a'], escaped: ['#ff2a2a', '#20262a', '#ffb02a', '#20262a', '#ff2a2a'], vacated: ['#20262a', '#35e07a', '#20262a', '#20262a', '#20262a'] }[a.state];
    pattern.forEach((hex, i) => {
      const on = hex !== '#20262a' && !(mood.wear > 0.75 && random() < 0.3);
      const bulb = P(s.ball([0.038, 0.038, 0.03], [-0.19 + i * 0.095, 0.265, 0.268], new THREE.MeshStandardMaterial({ color: on ? hex : '#20262a', emissive: on ? hex : '#000000', emissiveIntensity: on ? mix(1.4, 2.6, mood.cheer) : 0 }), 10));
      if (on) lights.push({ mesh: bulb, rate: a.state === 'waking' ? 3 : a.state === 'failed' && i === 0 ? 5 : a.state === 'escaped' ? 4 : 0, phase: i * 0.8 });
    });

    const tagCanvas = document.createElement('canvas');
    tagCanvas.width = 384; tagCanvas.height = 224;
    const t = tagCanvas.getContext('2d')!;
    t.fillStyle = mood.wear > 0.6 ? '#d9cfae' : '#f3ecd6';
    t.fillRect(0, 0, 384, 224);
    t.strokeStyle = '#b9ad8a'; t.lineWidth = 6; t.strokeRect(8, 8, 368, 208);
    t.fillStyle = '#6b6350'; t.beginPath(); t.arc(34, 112, 11, 0, 7); t.fill();
    const text = { mama: ['MAMA'], name: [['Isela', 'Tomas', 'Wren', 'Odile', 'Bashir', 'June', 'Kofi', 'Marit'][Math.floor(random() * 8)], `b. ${2200 + Math.floor(random() * 380)}`], nowake: ['DO NOT', 'WAKE'], arrival: ['wake me', 'when we', 'arrive'], number: [`B-${100 + Math.floor(random() * 899)}`], sorry: ['sorry'], blank: [] as string[] }[a.tag];
    t.fillStyle = a.tag === 'mama' ? '#c0392b' : a.tag === 'number' ? '#22282b' : '#27355f';
    t.textAlign = 'center'; t.textBaseline = 'middle';
    t.translate(204, 112); t.rotate(a.tag === 'number' ? 0 : rr(-0.08, 0.08));
    const fs = Math.min(150, 190 / Math.max(text.length, 1), 560 / Math.max(...text.map((l) => l.length), 1));
    t.font = a.tag === 'number' ? `bold ${fs}px monospace` : `italic bold ${fs}px "Comic Sans MS", "Segoe Print", cursive`;
    text.forEach((line, i) => t.fillText(line, 0, (i - (text.length - 1) / 2) * fs * 1.02, 320));
    if (a.tag === 'nowake') { t.fillRect(-110, fs * 0.95, 220, 5); t.fillRect(-110, fs * 0.95 + 11, 220, 5); }
    const tagTex = new THREE.CanvasTexture(tagCanvas);
    tagTex.colorSpace = THREE.SRGBColorSpace;
    const tag = P(s.mesh(new THREE.PlaneGeometry(0.36, 0.21), new THREE.MeshStandardMaterial({ map: tagTex, roughness: 0.9, side: THREE.DoubleSide }), [0.56, 0.78, 0.2]));
    tag.rotation.set(0.1, 0.35, rr(-0.25, 0.1));
    P(s.rod([0.49, 0.86, 0.03], [0.42, 0.8, 0.18], 0.004, s.material('#b9452e')));

    if (a.shell === 'military') for (let i = 0; i < 6; i++) P(s.box([0.07, 0.03, 0.02], [-0.2 + i * 0.08, 0.13, 0.2], s.material(i % 2 ? '#22282b' : '#e0b020'))).rotation.z = 0.7;
    if (a.shell === 'painted') {
      const petals = ['#e2574a', '#f0c23a', '#6aa9d8', '#e98ac0', '#f4f1e4'];
      for (let i = 0; i < 16; i++) {
        const front = random() < 0.6, y = front ? (random() < 0.7 ? rr(0.08, 0.42) : rr(1.92, 2.05)) : rr(0.3, 1.9), sideSign = random() < 0.5 ? -1 : 1, ang = front ? -rr(0.3, 1.4) : rr(0.15, 1.2);
        const r = (front ? 1.03 : 1) * (y < 0.16 ? 0.26 + y : y < 0.5 ? 0.41 + (y - 0.16) * 0.18 : y > 1.8 ? Math.max(0.1, 0.45 - (y - 1.8) * 1.25) : 0.49);
        const c = s.material(petals[Math.floor(random() * petals.length)]);
        const dot = P(s.ball([0.045, 0.045, 0.012], [sideSign * Math.cos(ang) * r, y, -Math.sin(ang) * r * (front ? 0.54 : 0.8)], c, 8));
        dot.lookAt(dot.position.clone().multiplyScalar(3).setY(y));
      }
    }
    if (a.shell === 'brass') for (let i = 0; i < 12; i++) for (const sx of [-1, 1]) P(s.ball([0.016, 0.016, 0.016], [sx * 0.5 * (i < 1 ? 0.92 : i > 10 ? 0.86 : 1), 0.28 + i * 0.15, -0.05], dark, 6));

    pod.rotation.x = -lean;
    const footLift = 0.34 + Math.sin(lean) * 0.36;
    pod.position.set(0, footLift, 0);
    pod.updateMatrixWorld(true);
    const world = (x: number, y: number, z: number) => pod.localToWorld(new THREE.Vector3(x, y, z)).toArray() as V3;

    // Cradle: a base slab, legs up to the back of the tub, coolant tank and hoses.
    const head = world(0, 1.75, -0.33), foot = world(0, 0.25, -0.3);
    const zMin = Math.min(head[2], foot[2]) - 0.25, zMax = Math.max(foot[2], 0.1) + 0.3;
    const baseMat = a.shell === 'brass' ? s.material('#3a3632', { metalness: 0.5 }) : a.shell === 'military' ? s.material('#4c5348') : s.material('#c9cfcd');
    s.box([1.15, 0.1, zMax - zMin], [0, 0.05, (zMax + zMin) / 2], baseMat);
    s.box([1.19, 0.03, zMax - zMin + 0.04], [0, 0.015, (zMax + zMin) / 2], dark);
    for (const sx of [-1, 1]) {
      const h = world(sx * 0.3, 1.6, -0.3), f = world(sx * 0.3, 0.35, -0.28);
      s.rod([sx * 0.45, 0.1, h[2]], h, 0.035, steel);
      s.rod([sx * 0.45, 0.1, f[2] + 0.05], f, 0.035, steel);
      s.rod([sx * 0.45, 0.1, f[2] + 0.05], h, 0.02, steel);
      s.cylinder(0.07, 0.08, 0.05, [sx * 0.45, 0.125, h[2]], dark, 12);
      s.cylinder(0.07, 0.08, 0.05, [sx * 0.45, 0.125, f[2] + 0.05], dark, 12);
    }
    const tankZ = zMin + 0.18;
    const tank = s.cylinder(0.13, 0.13, 0.62, [-0.3, 0.42, tankZ], s.material('#7fb0c4', { metalness: 0.5, roughness: 0.3 }), 16);
    s.ball([0.13, 0.08, 0.13], [-0.3, 0.73, tankZ], tank.material as THREE.Material, 14);
    s.box([0.3, 0.26, 0.24], [0.28, 0.23, tankZ], dark);
    const backMid = world(-0.2, 0.9, -0.34), backLow = world(0.22, 0.5, -0.33);
    s.tube([[-0.3, 0.76, tankZ], [-0.3, Math.max(0.95, backMid[1] * 0.7), tankZ + 0.1], backMid], 0.025, s.material('#2f6f8a'));
    s.tube([[0.28, 0.36, tankZ], [0.3, backLow[1] * 0.8, (tankZ + backLow[2]) / 2], backLow], 0.02, s.material('#c8553d'));

    // Offerings and traces.
    const lx = 0.82, lz = zMax - 0.35;
    if (a.left === 'flowers') {
      s.cylinder(0.055, 0.05, 0.16, [lx, 0.08, lz], new THREE.MeshPhysicalMaterial({ color: '#cfe8ee', transparent: true, opacity: 0.55, roughness: 0.1 }), 14);
      for (let i = 0; i < 7; i++) {
        const tip: V3 = [lx + rr(-0.12, 0.12), rr(0.3, 0.45), lz + rr(-0.12, 0.12)];
        s.rod([lx, 0.04, lz], tip, 0.005, s.material('#5a8f46'));
        s.ball([0.04, 0.03, 0.04], tip, s.material(['#f0c23a', '#e2574a', '#f4f1e4', '#b77ad8'][i % 4]), 8);
      }
    } else if (a.left === 'drawing') {
      const c2 = document.createElement('canvas'); c2.width = 256; c2.height = 200;
      const d = c2.getContext('2d')!;
      d.fillStyle = '#fbf6e6'; d.fillRect(0, 0, 256, 200);
      d.fillStyle = '#f2c230'; d.beginPath(); d.arc(200, 44, 26, 0, 7); d.fill();
      d.fillStyle = '#5aa84a'; d.fillRect(0, 160, 256, 40);
      d.strokeStyle = '#d0473a'; d.lineWidth = 7; d.lineCap = 'round';
      for (const [x, h] of [[70, 70], [120, 44]] as const) { d.beginPath(); d.arc(x, 160 - h - 14, 13, 0, 7); d.moveTo(x, 160 - h); d.lineTo(x, 150); d.moveTo(x - 18, 160 - h * 0.6); d.lineTo(x + 18, 160 - h * 0.6); d.stroke(); }
      const tex = new THREE.CanvasTexture(c2); tex.colorSpace = THREE.SRGBColorSpace;
      const page = s.mesh(new THREE.PlaneGeometry(0.36, 0.28), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }), [0.12, 0.33, zMax + 0.012]);
      page.rotation.z = rr(-0.12, 0.12);
      s.box([0.6, 0.38, 0.02], [0.12, 0.29, zMax - 0.01], baseMat);
    } else if (a.left === 'shoes') {
      for (const dx of [0, 0.13]) { s.ball([0.05, 0.035, 0.12], [lx + dx, 0.035, lz], s.material('#7a4a2e'), 10); s.ball([0.045, 0.045, 0.05], [lx + dx, 0.06, lz - 0.06], s.material('#5f3822'), 10); }
    } else if (a.left === 'candles') {
      for (let i = 0; i < 6; i++) {
        const h = rr(0.03, 0.16), x = lx + rr(-0.14, 0.14), z = lz + rr(-0.14, 0.14);
        s.cylinder(0.022, 0.026, h, [x, h / 2, z], s.material('#efe6cc'), 10);
        if (mood.cheer > 0.3 && random() < 0.7) s.ball([0.012, 0.024, 0.012], [x, h + 0.025, z], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffae3a', emissiveIntensity: 2.4 }), 8);
        s.cylinder(0.04, 0.045, 0.004, [x, 0.002, z], s.material('#e3d9bb'), 10);
      }
    } else if (a.left === 'tools') {
      s.box([0.36, 0.16, 0.18], [lx, 0.08, lz], s.material('#c0392b'));
      s.box([0.36, 0.02, 0.18], [lx, 0.2, lz - 0.1], s.material('#a02f24')).rotation.x = -1;
      s.rod([lx - 0.1, 0.18, lz], [lx + 0.12, 0.2, lz + 0.02], 0.012, steel);
      s.tube([[0.4, 0.2, tankZ + 0.12], [0.7, 0.03, tankZ + 0.3], [0.9, 0.02, lz - 0.4], [0.7, 0.02, lz - 0.15]], 0.012, s.material('#e0b020'));
      s.box([0.2, 0.16, 0.01], [0.6, 0.012, tankZ + 0.5], dark).rotation.x = -Math.PI / 2;
    }
    if (a.state === 'escaped') {
      const shard = new THREE.MeshStandardMaterial({ color: '#cfeaf4', roughness: 0.1, metalness: 0.2 });
      for (let i = 0; i < 14; i++) { const m = s.mesh(new THREE.TetrahedronGeometry(rr(0.02, 0.05)), shard, [rr(-0.5, 0.75), 0.11, zMax - rr(0.05, 0.5)]); m.scale.y = 0.2; m.rotation.y = rr(0, 6); }
      const wet = s.material('#5f6c72', { roughness: 0.2 });
      for (let i = 0; i < 5; i++) { const print = s.ball([0.045, 0.004, 0.1], [0.3 + (i % 2) * 0.16 + i * 0.07, 0.102 - (i > 1 ? 0.1 : 0), zMax - 0.3 + i * 0.22], wet, 10); print.rotation.y = 0.3; }
    }
    const puffs: THREE.Mesh[] = [];
    if (a.state === 'waking') {
      const mist = new THREE.MeshBasicMaterial({ color: '#f2fbff', transparent: true, opacity: 0.16, depthWrite: false });
      for (let i = 0; i < 9; i++) puffs.push(s.ball([rr(0.12, 0.26), rr(0.06, 0.12), rr(0.12, 0.26)], [rr(-0.6, 0.6), rr(0.1, 0.3), rr(zMin, zMax)], mist, 10));
      const drip = s.material('#9fd0e2', { roughness: 0.1 });
      for (let i = 0; i < 3; i++) s.cylinder(rr(0.05, 0.13), rr(0.05, 0.13), 0.004, [rr(-0.4, 0.4), 0.102, rr(0, zMax - 0.1)], drip, 14);
    }

    return s.finish({
      update: (dt, time) => {
        for (const light of lights) if (light.rate) (light.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(time * light.rate * mix(0.5, 1.6, mood.energy) + light.phase) > 0 ? 2.4 : 0.1;
        for (const puff of puffs) { puff.position.x += Math.sin(time * 0.4 + puff.position.z * 3) * dt * 0.05; }
      },
    });
  },
});
