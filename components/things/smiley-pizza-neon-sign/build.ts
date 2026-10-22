import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
type Pt = [number, number];
const PAIRS = {
  'red-yellow': ['#ff3b2a', '#ffd23a'], 'pink-teal': ['#ff4fa3', '#35e0d0'], 'orange-green': ['#ff8a1f', '#5cf06a'],
  'white-red': ['#fff4e0', '#ff2f3a'], 'blue-magenta': ['#3f8cff', '#ff3fe0'],
} as const;
const arc = (cx: number, cy: number, rx: number, ry: number, from: number, to: number, n = 18): Pt[] =>
  Array.from({ length: n + 1 }, (_u, i) => { const t = (from + (to - from) * i / n) * Math.PI / 180; return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry] as Pt; });

export default defineThing({
  questions: {
    expression: choice('What expression does the pizza face have?', {
      smile: 'A big simple smile.',
      wink: 'A wink: one eye a curved line, a lopsided grin.',
      tongue: 'A smile with a pink tongue sticking out.',
      frown: 'Meant as a laugh, but the lower mouth tube is dead so what glows is a frown.',
      shock: 'A round O of surprise with wide eyes.',
    }),
    tubes: choice('Which tubes still light?', {
      all: 'All of them, humming.',
      'ring-dead': 'The face is lit but the outer ring is dark.',
      half: 'Only one half of the sign: the other side is dead glass.',
      'eyes-only': 'Just the two eyes, staring out of a dark disc.',
      dead: 'None. The sign is off, grey glass on faded plastic.',
    }),
    colours: choice('What is the neon colour pair?', {
      'red-yellow': 'Hot red and yellow.', 'pink-teal': 'Pink and teal.', 'orange-green': 'Orange and green.',
      'white-red': 'Warm white and red.', 'blue-magenta': 'Electric blue and magenta.',
    }),
    lettering: choice('What does the lettering underneath say?', {
      open: 'OPEN', pizza: 'PIZZA', fun: 'FUN', slices: 'HOT SLICES',
      name: 'A name with letters burnt out: PIZZA PAL with gaps.',
      none: 'There is no lettering.',
    }),
    mount: choice('How is it mounted?', {
      wall: 'On an iron bracket projecting from a brick pier.',
      pole: 'On top of a tall steel roadside pole.',
      stand: 'On a short floor stand, at head height, as an indoor sign.',
      roof: 'On a lattice frame, a rooftop sign.',
    }),
    extra: choice('What else has been added to it?', {
      nothing: 'Nothing.',
      lease: 'A FOR LEASE board wired across the bottom.',
      arrow: 'A bulb arrow pointing down to the door.',
      nest: "A bird's nest wedged on top.",
      phone: 'A small WE DELIVER panel with a phone number.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [A, B] = PAIRS[a.colours];
    const R = 0.62;
    const sign = new THREE.Group();
    s.root.add(sign);
    const add = <T extends THREE.Object3D>(m: T) => { sign.add(m); return m; };
    const lights: { material: THREE.MeshStandardMaterial; base: number; zone: string }[] = [];
    const zoneLit = (zone: string) => {
      if (a.tubes === 'dead') return false;
      if (a.expression === 'frown' && zone === 'mouth-low') return false;
      if (a.tubes === 'all') return true;
      if (a.tubes === 'ring-dead') return !zone.startsWith('ring');
      if (a.tubes === 'half') return zone.endsWith('-r') || zone === 'mouth-top' || zone === 'text';
      return zone.startsWith('eye');
    };
    const power = mix(1.5, 2.8, mood.cheer);
    const glass = s.material('#77726e', { roughness: 0.25 });
    const neonMats = new Map<string, THREE.MeshStandardMaterial>();
    const neon = (tint: string, zone: string) => {
      if (!zoneLit(zone)) return glass;
      const key = tint + zone;
      if (!neonMats.has(key)) {
        const material = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: power * 0.5, roughness: 0.3 });
        neonMats.set(key, material);
        lights.push({ material, base: power * 0.5, zone });
      }
      return neonMats.get(key)!;
    };
    const zt = 0.11;
    const tube = (points: Pt[], tint: string, zone: string, closed = false, radius = 0.027) => {
      const path = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, zt)), closed);
      const mesh = add(s.mesh(new THREE.TubeGeometry(path, points.length * 3, radius, 6, closed), neon(tint, zone)));
      for (const [x, y] of [points[0], points[points.length - 1]]) add(s.cylinder(0.008, 0.008, zt - 0.06, [x, y, zt / 2 + 0.03], s.material('#2a2a2e'), 5)).rotation.x = Math.PI / 2;
      return mesh;
    };

    // The backlit plastic pizza.
    const anyLit = a.tubes !== 'dead';
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d')!;
    const fade = mood.wear * 0.45 + (anyLit ? 0 : 0.2);
    const col = (hex: string) => `#${new THREE.Color(hex).lerp(new THREE.Color('#b9b2a4'), fade).getHexString()}`;
    x.fillStyle = col('#c98a3a'); x.beginPath(); x.arc(256, 256, 256, 0, 6.3); x.fill();
    x.fillStyle = col('#e2ae42'); x.beginPath(); x.arc(256, 256, 222, 0, 6.3); x.fill();
    for (let i = 0; i < 40; i++) { x.fillStyle = col(random() < 0.5 ? '#ecc35a' : '#d69a38'); x.beginPath(); x.arc(256 + (random() - 0.5) * 400, 256 + (random() - 0.5) * 400, 8 + random() * 20, 0, 6.3); x.fill(); }
    x.fillStyle = col('#c98a3a'); x.beginPath(); x.arc(256, 256, 256, 0, 6.3); x.arc(256, 256, 222, 0, 6.3, true); x.fill();
    const cheek = (cx: number, cy: number) => {
      x.fillStyle = col('#c6352a'); x.beginPath(); x.arc(cx, cy, 46, 0, 6.3); x.fill();
      x.fillStyle = col('#a02820'); for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(cx + (random() - 0.5) * 50, cy + (random() - 0.5) * 50, 5, 0, 6.3); x.fill(); }
    };
    cheek(256 - 138, 256 + 44); cheek(256 + 138, 256 + 44);
    x.fillStyle = col('#3f8f4a'); for (let i = 0; i < 6; i++) { const t = random() * 6.3; x.save(); x.translate(256 + Math.cos(t) * 150, 256 - 110 + Math.sin(t) * 60); x.rotate(random() * 3); x.fillRect(-12, -4, 24, 8); x.restore(); }
    for (let i = 0; i < mood.wear * 30; i++) {
      x.strokeStyle = 'rgba(60,50,40,0.5)'; x.lineWidth = 1.5; x.beginPath(); let px = random() * 512, py = random() * 512; x.moveTo(px, py);
      for (let k = 0; k < 4; k++) { px += (random() - 0.5) * 50; py += random() * 40; x.lineTo(px, py); } x.stroke();
      x.fillStyle = 'rgba(70,60,45,0.25)'; x.fillRect(random() * 512, random() * 512, 3 + random() * 5, 30 + random() * 90);
    }
    const faceMap = new THREE.CanvasTexture(c); faceMap.colorSpace = THREE.SRGBColorSpace;
    const backlit = a.tubes === 'all' || a.tubes === 'ring-dead' || a.tubes === 'half';
    const faceMat = new THREE.MeshStandardMaterial({ map: faceMap, roughness: 0.4, emissive: '#ffffff', emissiveMap: faceMap, emissiveIntensity: backlit ? mix(0.12, 0.35, mood.cheer) : 0 });
    if (backlit) lights.push({ material: faceMat, base: faceMat.emissiveIntensity, zone: 'face' });
    add(s.mesh(new THREE.CircleGeometry(R - 0.01, 48), faceMat, [0, 0, 0.061]));
    const can = s.material('#2f3238', { metalness: 0.5, roughness: 0.5 });
    add(s.cylinder(R, R, 0.12, [0, 0, 0], can, 48)).rotation.x = Math.PI / 2;
    add(s.mesh(new THREE.TorusGeometry(R, 0.022, 8, 48), s.material('#c9ccd0', { metalness: 0.8, roughness: 0.3 }), [0, 0, 0.06]));

    // Neon: ring, eyes, mouth.
    const rr = R - 0.07;
    tube(arc(0, 0, rr, rr, 92, 268, 28), A, 'ring-l');
    tube(arc(0, 0, rr, rr, -88, 88, 28), A, 'ring-r');
    const wide = a.expression === 'shock' ? 1.25 : 1;
    tube(arc(-0.2, 0.17, 0.055 * wide, 0.095 * wide, 0, 340, 14), B, 'eye-l', true);
    if (a.expression === 'wink') tube(arc(0.2, 0.14, 0.085, 0.075, 15, 165, 10), B, 'eye-r');
    else tube(arc(0.2, 0.17, 0.055 * wide, 0.095 * wide, 0, 340, 14), B, 'eye-r', true);
    if (a.expression === 'shock') {
      tube(arc(0, -0.2, 0.1, 0.13, 95, 265, 10), A, 'mouth-l');
      tube(arc(0, -0.2, 0.1, 0.13, -85, 85, 10), A, 'mouth-r');
    } else if (a.expression === 'frown') {
      tube(arc(0, -0.02, 0.3, 0.3, 205, 335, 16), A, 'mouth-low');
      tube(arc(0, -0.31, 0.25, 0.13, 12, 168, 14), A, 'mouth-top');
    } else {
      const tilt = a.expression === 'wink' ? 0.03 : 0;
      tube(arc(-tilt, -0.02 + tilt, 0.3, 0.3, 205, 268, 9), A, 'mouth-l');
      tube(arc(tilt, -0.02 + tilt, 0.3, 0.3, 272, 335 + (tilt ? 12 : 0), 9), A, 'mouth-r');
      if (a.expression === 'tongue') tube([[0.03, -0.33], [0.035, -0.43], [0.09, -0.47], [0.15, -0.44], [0.16, -0.31]], '#ff6fb0', 'mouth-r-tongue-r', false, 0.02);
    }

    // Lettering light box under the disc.
    const words = { open: 'OPEN', pizza: 'PIZZA', fun: 'FUN', slices: 'HOT SLICES', name: 'PIZZA PAL', none: '' }[a.lettering];
    let lowest = -R;
    if (words) {
      const bw = Math.min(1.5, Math.max(0.7, words.length * 0.17)), bh = 0.3, by = -R - bh / 2 - 0.04;
      lowest = by - bh / 2;
      const t = document.createElement('canvas'); t.width = 512; t.height = Math.round(512 * bh / bw); const tx = t.getContext('2d')!;
      tx.fillStyle = '#17171d'; tx.fillRect(0, 0, t.width, t.height);
      const textLit = zoneLit('text');
      const size = Math.min(t.height * 0.72, 500 / words.length * 1.5);
      tx.font = `bold ${size}px monospace`; tx.textAlign = 'center'; tx.textBaseline = 'middle';
      const step = Math.min(size * 0.66, 480 / words.length);
      [...words].forEach((ch, i) => {
        const dead = !textLit || (a.lettering === 'name' && (i === 2 || i === 7)) || random() < mood.wear * 0.18;
        tx.shadowColor = B; tx.shadowBlur = dead ? 0 : 14;
        tx.fillStyle = dead ? '#3d3b40' : B;
        tx.fillText(ch, 256 + (i - (words.length - 1) / 2) * step, t.height / 2);
        if (!dead) { tx.shadowBlur = 0; tx.fillStyle = 'rgba(255,255,255,0.55)'; tx.font = `bold ${size * 0.96}px monospace`; tx.fillText(ch, 256 + (i - (words.length - 1) / 2) * step, t.height / 2); tx.font = `bold ${size}px monospace`; }
      });
      const tmap = new THREE.CanvasTexture(t); tmap.colorSpace = THREE.SRGBColorSpace;
      const tmat = new THREE.MeshStandardMaterial({ map: tmap, emissive: '#ffffff', emissiveMap: tmap, emissiveIntensity: textLit ? power * 0.75 : 0, roughness: 0.4 });
      if (textLit) lights.push({ material: tmat, base: power * 0.75, zone: 'text' });
      add(s.box([bw, bh, 0.1], [0, by, 0], can));
      add(s.mesh(new THREE.PlaneGeometry(bw - 0.04, bh - 0.04), tmat, [0, by, 0.052]));
      for (const sx of [-1, 1]) add(s.box([0.03, 0.08, 0.03], [sx * bw * 0.3, -R - 0.02, 0], can));
    }
    let topY = R;
    if (a.extra === 'lease') {
      const board = add(s.label('FOR LEASE', 0.9, 0.2, [0.03, lowest - 0.14, 0.03], '#b3231c', '#f2efe6'));
      board.rotation.z = -0.06 - random() * 0.06;
      for (const sx of [-1, 1]) add(s.rod([sx * 0.38, lowest, 0.02], [sx * 0.38 + 0.03, lowest - 0.06, 0.03], 0.004, glass));
      lowest -= 0.26;
    } else if (a.extra === 'phone') {
      add(s.label('WE DELIVER 555-0142', 0.9, 0.14, [0, lowest - 0.1, 0.03], '#f4f0e4', '#b3231c'));
      add(s.box([0.92, 0.16, 0.04], [0, lowest - 0.1, 0], can));
      lowest -= 0.2;
    } else if (a.extra === 'arrow') {
      const on = a.tubes !== 'dead';
      const bulb = new THREE.MeshStandardMaterial({ color: '#fff2c0', emissive: '#ffc850', emissiveIntensity: on ? 2 : 0, roughness: 0.4 });
      if (on) lights.push({ material: bulb, base: 2, zone: 'arrow' });
      const pts: { at: P3; size: number }[] = [];
      const ax = R + 0.22;
      for (let i = 0; i < 7; i++) pts.push({ at: [ax, R * 0.6 - i * 0.16, 0.06], size: 0.03 });
      for (const sx of [-1, 1]) for (let i = 1; i < 3; i++) pts.push({ at: [ax + sx * i * 0.09, R * 0.6 - 0.96 + i * 0.11, 0.06], size: 0.03 });
      add(s.scatter(new THREE.SphereGeometry(1, 8, 6), bulb, pts));
      add(s.box([0.1, 1.1, 0.05], [ax, R * 0.6 - 0.48, 0.01], can));
      add(s.box([0.25, 0.04, 0.04], [R + 0.08, 0.1, 0], can));
    } else if (a.extra === 'nest') {
      const twig = s.material('#6b5236', { roughness: 1 });
      add(s.mesh(new THREE.TorusGeometry(0.11, 0.045, 6, 14), twig, [0.12, R + 0.03, 0])).rotation.x = Math.PI / 2;
      for (let i = 0; i < 12; i++) { const t = random() * 6.3; add(s.rod([0.12 + Math.cos(t) * 0.08, R + 0.03, Math.sin(t) * 0.06], [0.12 + Math.cos(t + 1) * 0.19, R + 0.02 + random() * 0.07, Math.sin(t + 1) * 0.1], 0.004, twig)); }
      for (let i = 0; i < 2; i++) add(s.ball([0.022, 0.028, 0.022], [0.1 + i * 0.04, R + 0.05, 0], s.material('#dfe8e4'), 8));
      add(s.ball([0.03, 0.002, 0.05], [0.25, R * 0.75, 0.065], s.material('#f1f1ec'), 6));
      topY += 0.1;
    }
    // Transformer and feed cable on the back.
    add(s.box([0.22, 0.12, 0.1], [0, 0, -0.1], s.material('#55585e', { metalness: 0.4 })));

    // Mounts. The sign itself is built at unit size and scaled up here.
    const S = 1.35;
    sign.scale.setScalar(S);
    const RS = R * S, lowS = lowest * S, topS = topY * S;
    const iron = s.material('#2a2c30', { metalness: 0.6, roughness: 0.5 });
    const sway: THREE.Group | null = a.mount === 'wall' ? sign : null;
    if (a.mount === 'wall') {
      const cy = 2.9, armY = cy + topS + 0.22 * S, wallX = -(RS + (a.extra === 'arrow' ? 0.2 : 0.4));
      sign.position.set(0, armY, 0);
      sign.children.forEach((child) => { child.position.y -= topY + 0.22; });
      const bc = document.createElement('canvas'); bc.width = bc.height = 128; const bx = bc.getContext('2d')!;
      bx.fillStyle = '#b9b0a0'; bx.fillRect(0, 0, 128, 128);
      for (let row = 0; row < 8; row++) for (let k = -1; k < 4; k++) { bx.fillStyle = `#${new THREE.Color(mood.warmth > 0.5 ? '#9a4a34' : '#7d5248').offsetHSL(0, 0, (random() - 0.5) * 0.08).getHexString()}`; bx.fillRect(k * 32 + (row % 2) * 16 + 1, row * 16 + 1, 30, 14); }
      const brick = new THREE.CanvasTexture(bc); brick.colorSpace = THREE.SRGBColorSpace; brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(1.5, 9);
      const pierH = armY + 0.5;
      s.box([0.5, pierH, 0.5], [wallX - 0.25, pierH / 2, 0], s.material('#ffffff', { map: brick, roughness: 0.95 }));
      s.box([0.56, 0.08, 0.56], [wallX - 0.25, pierH + 0.04, 0], s.material('#b9b0a0'));
      s.box([0.03, 0.5, 0.2], [wallX + 0.015, armY - 0.12, 0], iron);
      s.rod([wallX, armY, 0], [RS + 0.1, armY, 0], 0.025, iron);
      s.rod([wallX, armY - 0.36, 0], [-0.05, armY - 0.02, 0], 0.014, iron);
      const curl = s.mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 16, Math.PI * 1.5), iron, [RS + 0.1, armY - 0.07, 0]);
      curl.rotation.z = Math.PI / 2;
      for (const sx of [-1, 1]) add(s.rod([sx * 0.35, topY + 0.22 - (topY + 0.22), 0], [sx * 0.35, -(0.22 + topY - Math.sqrt(R * R - 0.1225)), 0], 0.008, iron));
      s.tube([[wallX, armY - 0.3, 0.06], [wallX + 0.3, armY - 0.75, 0.05], [-0.1, cy, -0.12]], 0.009, iron);
    } else if (a.mount === 'pole') {
      const cy = 3.3;
      sign.position.set(0, cy, 0);
      s.cylinder(0.07, 0.09, cy + lowS, [0, (cy + lowS) / 2, -0.02], s.material('#8d9398', { metalness: 0.6, roughness: 0.45 }), 14);
      s.cylinder(0.2, 0.22, 0.05, [0, 0.025, -0.02], iron, 16);
      for (let i = 0; i < 4; i++) s.cylinder(0.02, 0.02, 0.07, [Math.sin(i * 1.57 + 0.78) * 0.16, 0.05, Math.cos(i * 1.57 + 0.78) * 0.16 - 0.02], iron, 6);
      s.box([0.16, 0.24, 0.1], [0, 1.4, 0.06], s.material('#6f757b', { metalness: 0.5 }));
      const flyers = Math.round(mood.density * 3);
      for (let i = 0; i < flyers; i++) s.box([0.15, 0.2, 0.004], [0, 1.0 - i * 0.24, 0.075], s.material(['#f2efe6', '#f4d93a', '#f7b6cf'][i % 3])).rotation.z = (random() - 0.5) * 0.3;
    } else if (a.mount === 'stand') {
      const cy = 0.75 - lowS;
      sign.position.set(0, cy + 0.02, 0);
      s.cylinder(0.035, 0.035, cy + lowS + 0.02, [0, (cy + lowS + 0.02) / 2, -0.03], s.material('#c9ccd0', { metalness: 0.8, roughness: 0.3 }), 12);
      s.cylinder(0.34, 0.36, 0.04, [0, 0.02, -0.03], iron, 24);
      s.tube([[0.05, cy, -0.12], [0.2, cy - 0.5, -0.2], [0.12, 0.3, -0.12], [0.3, 0.03, -0.05], [0.6, 0.012, 0.1]], 0.008, iron);
    } else {
      const cy = 1.25 - lowS;
      sign.position.set(0, cy, 0);
      const base = cy + lowS;
      for (const sx of [-1, 1]) {
        s.rod([sx * 0.55, 0, 0.0], [sx * 0.45, base + 0.5, -0.07], 0.02, iron);
        s.rod([sx * 0.55, 0, -0.75], [sx * 0.4, cy + 0.2, -0.09], 0.02, iron);
        for (let i = 0; i < 3; i++) s.rod([sx * 0.55, i * 0.35, -0.75 + i * 0.22], [sx * 0.53, i * 0.35 + 0.35, 0 - i * 0.02], 0.012, iron);
      }
      for (const yy of [0.04, base * 0.5, base]) s.rod([-0.56, yy, 0], [0.56, yy, 0], 0.016, iron);
      s.rod([-0.56, 0.04, -0.75], [0.56, 0.04, -0.75], 0.016, iron);
      s.rod([-0.55, 0.04, 0], [0.55, base, 0], 0.01, iron); s.rod([0.55, 0.04, 0], [-0.55, base, 0], 0.01, iron);
      s.box([1.5, 0.06, 1.1], [0, -0.03, -0.37], s.material('#5a5d62', { roughness: 0.95 }));
    }

    const phase = random() * 20;
    const jitter = lights.map(() => random() * 10);
    const weak = lights.length ? Math.floor(random() * lights.length) : -1;
    return s.finish({
      update: (_dt, time) => {
        const t = time + phase, e = mood.energy;
        lights.forEach((light, i) => {
          const buzz = 1 + Math.sin(t * 47 + jitter[i]) * 0.05 * (0.5 + e);
          // One zone stutters: a struck tube that will not hold its arc.
          const stutter = i === weak && Math.sin(t * mix(1.5, 6, e) + jitter[i]) + Math.sin(t * 13.7 + jitter[i]) * 0.6 > mix(1.35, 0.7, Math.max(e, mood.wear)) ? 0.12 : 1;
          light.material.emissiveIntensity = light.base * buzz * stutter;
        });
        if (sway) sway.rotation.z = Math.sin(t * 0.9) * 0.012 * (0.3 + e);
      },
    });
  },
});
