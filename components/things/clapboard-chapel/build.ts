import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { boardTexture, brickTexture, grime, panel, pick, tiledBox, tone, write } from './lib';

type Arch = 'round' | 'pointed' | 'square';

function archPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, kind: Arch) {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  if (kind === 'round') {
    ctx.lineTo(x, y + w / 2);
    ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  } else if (kind === 'pointed') {
    ctx.lineTo(x, y + w * 0.95);
    ctx.quadraticCurveTo(x, y + w * 0.25, x + w / 2, y);
    ctx.quadraticCurveTo(x + w, y + w * 0.25, x + w, y + w * 0.95);
  } else {
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y);
  }
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

export default defineThing({
  questions: {
    tradition: choice('What kind of church building is it?', {
      'cinder-block': 'A low painted cinder-block hall with a metal roof and a small prefab fibreglass steeple bolted on, built by the members themselves.',
      'carpenter-gothic': 'Steep-roofed board-and-batten with narrow pointed lancet windows and a slender spire, prim and Northern.',
      'adobe-mission': 'Thick sun-baked adobe walls, a flat roof with protruding beams and a curved bell gable over the door, Southwestern and old.',
      clapboard: 'White lap-sided wood frame with a square bell tower and pointed spire: the rural Baptist or Methodist chapel of postcards.',
      storefront: 'A flat-roofed brick shop on a main street, its display windows papered over and a hand-lettered church name where the store sign was.',
    }),
    state: choice('What is happening at the church right now?', {
      service: 'Sunday service: the double doors stand open and the windows are bright.',
      'choir-practice': 'A weeknight: doors shut, windows glowing from within, somebody rehearsing.',
      locked: 'A weekday afternoon: shut, dark and quiet, waiting for Sunday.',
      wedding: 'A wedding: white bows and garlands on the doors and rail, petals on the steps.',
      funeral: 'A funeral: a dark wreath on the open door and purple drape above it.',
      boarded: 'Closed for good: plywood over the windows, a plank and padlock across the doors.',
    }),
    glass: choice('What are the windows glazed with?', {
      clear: 'Plain clear panes with white mullions.',
      stained: 'Jewel-coloured stained glass in small leaded pieces.',
      amber: 'Frosted amber and green textured glass, the cheap mid-century kind.',
      painted: 'Panes painted over in pale blue and pink to imitate stained glass.',
    }),
    doors: choice('What colour are the doors and trim?', {
      red: 'Deep red doors.',
      white: 'White on white, everything the same paint.',
      green: 'Dark forest green doors and trim.',
      blue: 'Haint blue, soft and chalky.',
      wood: 'Bare varnished wood.',
    }),
    crown: choice('What tops the steeple or roofline?', {
      cross: 'A plain white cross.',
      'lit-cross': 'A cross outlined in glowing tube light.',
      bell: 'An open belfry with a visible bell and no cross.',
      vane: 'A weathervane or lightning rod.',
      missing: 'Nothing: the top is snapped off or was never finished.',
    }),
    approach: choice('How do you reach the front door?', {
      'wood-steps': 'A few worn wooden steps.',
      'concrete-steps': 'Poured concrete steps with a pipe handrail.',
      ramp: 'A long plywood wheelchair ramp added along the front.',
      porch: 'A small roofed porch on posts.',
    }),
    size: score('How large is the building?', ['A tiny one-room chapel for twenty', 'A country church for sixty', 'A long nave with many windows']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = Math.min(1, mood.wear + (a.state === 'boarded' ? 0.3 : 0));
    const add = <T extends THREE.Object3D>(mesh: T, at: readonly [number, number, number], rotY = 0) => { mesh.position.set(...at); mesh.rotation.y = rotY; s.root.add(mesh); return mesh; };

    const framed = a.tradition === 'clapboard' || a.tradition === 'carpenter-gothic';
    const open = a.state === 'service' || a.state === 'wedding' || a.state === 'funeral';
    const lit = open || a.state === 'choir-practice';
    const boarded = a.state === 'boarded';
    const glow = lit ? mix(0.3, 1.1, Math.abs(mood.daylight - 0.5) * 2) : 0;
    const archKind: Arch = a.tradition === 'carpenter-gothic' ? 'pointed' : a.tradition === 'clapboard' || a.tradition === 'adobe-mission' ? 'round' : 'square';

    const W = a.tradition === 'storefront' ? 6.5 : mix(4.6, 6.2, a.size);
    const L = mix(6.5, 12, a.size);
    const H = a.tradition === 'cinder-block' ? 3.0 : a.tradition === 'storefront' ? 4.4 : a.tradition === 'adobe-mission' ? 4.2 : 3.7;
    const pitch = a.tradition === 'carpenter-gothic' ? 0.9 : a.tradition === 'cinder-block' ? 0.38 : 0.72;
    const rise = framed || a.tradition === 'cinder-block' ? (W / 2) * Math.tan(pitch) : 0;

    const wallColour = {
      clapboard: '#f3f1e9', 'carpenter-gothic': pick(random, ['#efe9d8', '#d9d2bd', '#e9e4dc']), 'adobe-mission': pick(random, ['#cf9d72', '#d8ab80', '#c58f66']),
      'cinder-block': pick(random, ['#e8e4d6', '#cfe0dc', '#f0e2c0']), storefront: pick(random, ['#9a4b38', '#8a5a44', '#a86a4c']),
    }[a.tradition];
    const wallMap = a.tradition === 'clapboard' ? boardTexture(random, wallColour, wear, 6)
      : a.tradition === 'carpenter-gothic' ? boardTexture(random, wallColour, wear, 4, true)
        : a.tradition === 'cinder-block' ? brickTexture(random, wallColour, tone(wallColour, -0.12), wear)
          : a.tradition === 'storefront' ? brickTexture(random, wallColour, '#cfc6b4', wear) : null;
    const wall = new THREE.MeshStandardMaterial({ map: wallMap, color: wallMap ? '#ffffff' : wallColour, roughness: 0.9 });
    const wallTile = a.tradition === 'cinder-block' ? 1.6 : a.tradition === 'storefront' ? 0.64 : 1;
    const trimColour = { red: '#8e1f1c', white: '#f4f1e6', green: '#234a34', blue: '#8fb7c4', wood: '#7a4f2c' }[a.doors];
    const trim = s.material(a.tradition === 'adobe-mission' && a.doors === 'white' ? '#e9dcc0' : trimColour, { roughness: 0.7 });
    const white = s.material('#f4f1e6');
    const dark = s.material('#2a2623');
    const metalRoof = a.tradition === 'cinder-block' || random() < 0.35;
    const roofColour = metalRoof ? pick(random, ['#8a9aa0', '#7c3a2e', '#4f6b58', '#b8b8ae']) : pick(random, ['#4a4440', '#5a4a3e', '#3e4a4c']);
    const roofMat = new THREE.MeshStandardMaterial({ map: boardTexture(random, roofColour, wear, metalRoof ? 5 : 8, !metalRoof), roughness: metalRoof ? 0.5 : 0.95, metalness: metalRoof ? 0.4 : 0 });
    const foundation = s.material('#a8a297', { roughness: 1 });

    // ---- Body
    const floor = a.tradition === 'storefront' ? 0.12 : a.tradition === 'cinder-block' ? 0.2 : mix(0.45, 0.8, random());
    add(tiledBox([W + 0.1, floor, L + 0.1], 1, foundation), [0, floor / 2, 0]);
    add(tiledBox([W, H, L], wallTile, wall), [0, floor + H / 2, 0]);
    const eave = floor + H;
    if (rise > 0) {
      const shape = new THREE.Shape();
      shape.moveTo(-W / 2, 0); shape.lineTo(W / 2, 0); shape.lineTo(0, rise); shape.closePath();
      const gableMat = wall.clone();
      if (wallMap) { gableMat.map = wallMap.clone(); gableMat.map.repeat.set(1 / wallTile, 1 / wallTile); }
      for (const side of [1, -1]) add(new THREE.Mesh(new THREE.ShapeGeometry(shape), gableMat), [0, eave, side * (L / 2 - 0.001)], side < 0 ? Math.PI : 0).castShadow = true;
      const slope = Math.hypot(W / 2, rise) + 0.45;
      const angle = Math.atan2(rise, W / 2);
      for (const side of [-1, 1]) {
        const slab = add(tiledBox([slope, 0.09, L + 0.7], 1, roofMat), [side * (W / 4 + 0.16 * Math.cos(angle)), eave + rise / 2 - 0.08 * Math.sin(angle) + 0.06, 0]);
        slab.rotation.z = -side * angle;
      }
      s.box([0.14, 0.1, L + 0.72], [0, eave + rise + 0.08, 0], s.material(tone(roofColour, -0.08)));
    } else {
      // flat roof with parapet
      const p = a.tradition === 'adobe-mission' ? 0.45 : 0.6;
      add(tiledBox([W, p, 0.3], wallTile, wall), [0, eave + p / 2, -L / 2 + 0.15]);
      for (const x of [-1, 1]) add(tiledBox([0.3, p, L], wallTile, wall), [x * (W / 2 - 0.15), eave + p / 2, 0]);
      s.box([W - 0.5, 0.05, L - 0.5], [0, eave + 0.03, 0], s.material('#57524c'));
      if (a.tradition === 'adobe-mission') {
        const viga = s.material('#6a4a30');
        const n = Math.round(L / 1.1);
        for (let i = 0; i < n; i++) {
          const z = -L / 2 + 0.7 + i * (L - 1.4) / Math.max(1, n - 1);
          s.rod([-W / 2 - 0.4, eave - 0.35, z], [W / 2 + 0.4, eave - 0.35, z], 0.085, viga);
        }
      }
    }

    // ---- Windows along the sides
    const winW = a.tradition === 'carpenter-gothic' ? 0.62 : a.tradition === 'storefront' ? 0.9 : 0.85;
    const winH = a.tradition === 'cinder-block' ? 1.3 : a.tradition === 'adobe-mission' ? 1.6 : 2.1;
    const jewel = ['#b3261e', '#1f5fa8', '#e0a81e', '#2f8a4f', '#7a2f8a', '#d9612a'];
    const drawWindow = (kind: Arch, hasGlow: boolean) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);
      archPath(ctx, 0, 0, w, h, kind);
      ctx.fillStyle = a.tradition === 'adobe-mission' ? '#6a4a30' : a.tradition === 'storefront' ? '#3a3a38' : '#f4f1e6';
      ctx.fill();
      const m = w * 0.1;
      ctx.save();
      archPath(ctx, m, m, w - 2 * m, h - 2 * m, kind);
      ctx.clip();
      if (boarded) {
        ctx.fillStyle = '#b3935f';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(90,62,30,${0.08 + random() * 0.15})`; ctx.fillRect(0, random() * h, w, 1 + random() * 3); }
        ctx.fillStyle = '#4a3a2a';
        for (const [nx, ny] of [[0.2, 0.15], [0.8, 0.15], [0.2, 0.5], [0.8, 0.5], [0.2, 0.88], [0.8, 0.88]]) ctx.fillRect(nx * w - 2, ny * h - 2, 4, 4);
        if (random() < 0.5) { ctx.strokeStyle = 'rgba(30,30,40,0.7)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(w * 0.25, h * 0.6); ctx.bezierCurveTo(w * 0.4, h * 0.4, w * 0.5, h * 0.8, w * 0.75, h * 0.55); ctx.stroke(); }
      } else {
        const base = a.glass === 'clear' ? (hasGlow ? '#ffdf9a' : '#42525c') : a.glass === 'amber' ? (hasGlow ? '#f2b84a' : '#a8873c') : a.glass === 'painted' ? '#bcd3dc' : '#30303a';
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);
        if (a.glass === 'stained' || a.glass === 'painted') {
          const cols = 3, rows = Math.round(h / w * 3.2);
          const palette = a.glass === 'stained' ? jewel : ['#bcd3dc', '#e6bfc8', '#f0e3a8', '#c5ddb8'];
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            ctx.fillStyle = pick(random, palette);
            ctx.globalAlpha = hasGlow || a.glass === 'painted' ? 1 : 0.62;
            ctx.beginPath();
            const cx = (c + 0.5) * w / cols, cy = (r + 0.5) * h / rows, rw = w / cols * 0.5, rh = h / rows * 0.5;
            ctx.moveTo(cx, cy - rh); ctx.lineTo(cx + rw, cy); ctx.lineTo(cx, cy + rh); ctx.lineTo(cx - rw, cy); ctx.closePath();
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          if (a.glass === 'stained') { ctx.fillStyle = hasGlow ? '#ffe9a8' : '#c9b25a'; ctx.fillRect(w * 0.44, h * 0.3, w * 0.12, h * 0.5); ctx.fillRect(w * 0.28, h * 0.42, w * 0.44, w * 0.12); }
        } else if (a.glass === 'amber') {
          for (let i = 0; i < 40; i++) { ctx.fillStyle = pick(random, ['rgba(80,120,60,0.35)', 'rgba(255,220,120,0.3)', 'rgba(150,90,30,0.25)']); ctx.fillRect(random() * w, random() * h, w * 0.22, h * 0.07); }
        } else if (!hasGlow) {
          ctx.fillStyle = 'rgba(200,220,235,0.22)';
          ctx.beginPath(); ctx.moveTo(0, h * 0.5); ctx.lineTo(w, h * 0.2); ctx.lineTo(w, h * 0.38); ctx.lineTo(0, h * 0.7); ctx.fill();
        }
        ctx.fillStyle = a.glass === 'stained' ? '#26262a' : '#f4f1e6';
        const bar = Math.max(3, w * 0.035);
        ctx.fillRect(w / 2 - bar / 2, 0, bar, h);
        const bars = kind === 'square' && a.tradition === 'storefront' ? 1 : 4;
        for (let i = 1; i < bars; i++) ctx.fillRect(0, h * i / bars - bar / 2, w, bar);
        if (wear > 0.55 && random() < wear - 0.3) { ctx.fillStyle = '#16181a'; ctx.beginPath(); ctx.moveTo(w * 0.55, h * 0.55); ctx.lineTo(w * 0.85, h * 0.6); ctx.lineTo(w * 0.7, h * 0.74); ctx.lineTo(w * 0.52, h * 0.7); ctx.fill(); }
      }
      ctx.restore();
    };
    const makeWindow = (w: number, h: number, kind: Arch) => panel(w, h, drawWindow(kind, lit), { px: 256, cutout: true, glow: lit && !boarded ? glow : 0, roughness: 0.35 });
    const bays = Math.max(2, Math.round(L / 2.3));
    const sill = floor + (a.tradition === 'cinder-block' ? 1.1 : 0.95);
    for (let i = 0; i < bays; i++) {
      const z = -L / 2 + (i + 0.5) * L / bays;
      for (const side of [-1, 1]) {
        if (a.tradition === 'storefront' && side === -1) continue;
        add(makeWindow(winW, winH, archKind), [side * (W / 2 + 0.012), sill + winH / 2, z], side * Math.PI / 2);
        if (a.tradition !== 'adobe-mission' && a.tradition !== 'storefront') s.box([0.06, 0.05, winW + 0.16], [side * (W / 2 + 0.03), sill - 0.03, z], white);
      }
    }

    // ---- Front: tower, bell gable, or shopfront
    let doorZ = L / 2;
    let topPoint: [number, number, number] = [0, eave + rise, L / 2 - 0.6];
    let crownScale = 1;
    const frontY = floor;
    if (framed) {
      const tw = a.tradition === 'carpenter-gothic' ? 1.7 : 2.1;
      const th = H + rise + (a.tradition === 'carpenter-gothic' ? 0.6 : 0.3);
      const tz = L / 2 + tw / 2 - 0.5;
      add(tiledBox([tw, th, tw], 1, wall), [0, floor + th / 2, tz]);
      s.box([tw + 0.25, 0.12, tw + 0.25], [0, floor + th + 0.06, tz], white);
      const bh = 1.15, bw = tw - 0.3;
      const belfryY = floor + th + 0.12;
      if (a.crown === 'bell') {
        for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.14, bh, 0.14], [x * (bw / 2 - 0.07), belfryY + bh / 2, tz + z * (bw / 2 - 0.07)], white);
        const bell = s.lathe([[0.02, 0.5], [0.12, 0.48], [0.2, 0.3], [0.24, 0.1], [0.34, 0], [0.3, -0.02]], s.material('#a8873c', { metalness: 0.7, roughness: 0.35 }), [0, belfryY + 0.3, tz]);
        bell.rotation.z = (random() - 0.5) * 0.5 * mood.energy;
      } else {
        add(tiledBox([bw, bh, bw], 1, wall), [0, belfryY + bh / 2, tz]);
        for (let i = 0; i < 4; i++) {
          const angle = i * Math.PI / 2;
          const louvre = s.box([bw * 0.5, bh * 0.62, 0.04], [Math.sin(angle) * (bw / 2 + 0.005), belfryY + bh * 0.5, tz + Math.cos(angle) * (bw / 2 + 0.005)], dark);
          louvre.rotation.y = angle;
        }
      }
      s.box([bw + 0.3, 0.1, bw + 0.3], [0, belfryY + bh + 0.05, tz], white);
      const spireH = a.tradition === 'carpenter-gothic' ? 3.6 : 2.2;
      const broken = a.crown === 'missing';
      const sh = broken ? spireH * 0.45 : spireH;
      const spire = s.mesh(new THREE.CylinderGeometry(broken ? bw * 0.42 : 0.02, (bw + 0.2) * 0.707, sh, 4), roofMat.clone(), [0, belfryY + bh + 0.1 + sh / 2, tz]);
      (spire.material as THREE.MeshStandardMaterial).map = null;
      (spire.material as THREE.MeshStandardMaterial).color.set(roofColour);
      spire.rotation.y = Math.PI / 4;
      const leanTop = (random() - 0.5) * 0.12 * wear;
      topPoint = [leanTop, belfryY + bh + 0.1 + sh, tz];
      doorZ = tz + tw / 2;
      // a round or lancet window over the door
      add(makeWindow(0.6, a.tradition === 'carpenter-gothic' ? 1.1 : 0.6, a.tradition === 'carpenter-gothic' ? 'pointed' : 'round'), [0, floor + 3.35, doorZ + 0.012]);
    } else if (a.tradition === 'adobe-mission') {
      // espadaña: a taller front wall with a curved top and a bell opening
      const shape = new THREE.Shape();
      const hw = W / 2 + 0.25, top = H + 2.3;
      shape.moveTo(-hw, 0); shape.lineTo(hw, 0); shape.lineTo(hw, H + 0.4);
      shape.quadraticCurveTo(hw * 0.55, H + 0.5, hw * 0.45, H + 1.3);
      shape.quadraticCurveTo(hw * 0.4, top, 0, top);
      shape.quadraticCurveTo(-hw * 0.4, top, -hw * 0.45, H + 1.3);
      shape.quadraticCurveTo(-hw * 0.55, H + 0.5, -hw, H + 0.4);
      shape.closePath();
      const hole = new THREE.Path();
      hole.moveTo(-0.38, H + 0.75); hole.lineTo(-0.38, H + 1.35); hole.absarc(0, H + 1.35, 0.38, Math.PI, 0, true); hole.lineTo(0.38, H + 0.75); hole.closePath();
      shape.holes.push(hole);
      const front = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false }), wall, [0, floor, L / 2 - 0.1]);
      front.castShadow = true;
      if (a.crown !== 'missing') {
        s.lathe([[0.02, 0.42], [0.1, 0.4], [0.17, 0.25], [0.2, 0.08], [0.28, 0], [0.25, -0.02]], s.material('#a8873c', { metalness: 0.7, roughness: 0.35 }), [0, floor + H + 0.95, L / 2 + 0.2]);
        s.rod([-0.38, floor + H + 1.42, L / 2 + 0.2], [0.38, floor + H + 1.42, L / 2 + 0.2], 0.04, s.material('#6a4a30'));
      }
      doorZ = L / 2 + 0.5;
      topPoint = [0, floor + top, L / 2 + 0.2];
      // buttresses
      for (const x of [-1, 1]) {
        const b = s.box([0.9, H * 0.7, 1.0], [x * (W / 2 + 0.2), floor + H * 0.33, L / 2 - 0.2], wall);
        b.rotation.z = x * 0.14;
      }
    } else if (a.tradition === 'cinder-block') {
      // prefab steeple sitting on the ridge near the front
      const z = L / 2 - 1.3, y = eave + rise - 0.25;
      const fibre = s.material('#f6f5ef', { roughness: 0.4 });
      s.box([1.1, 0.9, 1.1], [0, y + 0.45, z], fibre);
      for (let i = 0; i < 4; i++) { const angle = i * Math.PI / 2; s.box([0.5, 0.5, 0.03], [Math.sin(angle) * 0.556, y + 0.5, z + Math.cos(angle) * 0.556], dark).rotation.y = angle; }
      const broken = a.crown === 'missing';
      const cone = s.mesh(new THREE.CylinderGeometry(broken ? 0.3 : 0.02, 0.78, broken ? 0.8 : 2.0, 4), fibre, [0, y + 0.9 + (broken ? 0.4 : 1.0), z]);
      cone.rotation.y = Math.PI / 4;
      topPoint = [0, y + 0.9 + (broken ? 0.8 : 2.0), z];
      crownScale = 0.7;
      // small gabled entry
      s.box([2.6, 0.08, 1.5], [0, floor + 2.55, L / 2 + 0.75], roofMat.clone()).rotation.x = 0.12;
      for (const x of [-1.2, 1.2]) s.box([0.1, 2.5, 0.1], [x, floor + 1.25, L / 2 + 1.35], white);
    } else {
      // storefront: parapet front, sign band, big display windows
      add(tiledBox([W, 0.9, 0.35], wallTile, wall), [0, eave + 0.45, L / 2 - 0.175]);
      s.box([W + 0.1, 0.1, 0.45], [0, eave + 0.95, L / 2 - 0.175], s.material('#cfc6b4'));
      const name = pick(random, ['HOUSE OF PRAYER', 'GREATER FAITH TEMPLE', 'TRUE VINE HOLINESS', 'DELIVERANCE CENTER', 'IGLESIA DE DIOS']);
      add(panel(W - 0.6, 0.75, (ctx, w, h) => {
        ctx.fillStyle = a.doors === 'white' ? '#f1ead8' : trimColour; ctx.fillRect(0, 0, w, h);
        write(ctx, name, w / 2, h * 0.52, h * 0.5, a.doors === 'white' ? '#7a1f1f' : '#f6eed8', { max: w * 0.9, font: 'italic bold', face: 'Georgia, serif' });
        grime(ctx, w, h, wear, random);
      }, { px: 512 }), [0, floor + 3.55, L / 2 + 0.012]);
      for (const x of [-1, 1]) {
        add(panel(2.0, 2.0, (ctx, w, h) => {
          ctx.fillStyle = '#3a3a38'; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = boarded ? '#b3935f' : lit ? '#f6dfa0' : '#c9c2ad'; ctx.fillRect(w * 0.04, h * 0.04, w * 0.92, h * 0.92);
          if (!boarded) {
            // papered or curtained glass with a painted cross and service times
            ctx.fillStyle = lit ? '#e8c877' : '#b3ab95';
            for (let i = 0; i < 9; i++) ctx.fillRect(w * (0.04 + i * 0.104), h * 0.04, w * 0.05, h * 0.92);
            ctx.fillStyle = '#7a1f1f'; ctx.fillRect(w * 0.46, h * 0.18, w * 0.08, h * 0.4); ctx.fillRect(w * 0.34, h * 0.28, w * 0.32, h * 0.07);
            write(ctx, x < 0 ? 'SUN 11AM' : 'WED 7PM', w / 2, h * 0.74, h * 0.11, '#2a2623');
            write(ctx, x < 0 ? 'ALL WELCOME' : 'PRAYER', w / 2, h * 0.86, h * 0.08, '#2a2623');
          } else for (let i = 0; i < 20; i++) { ctx.fillStyle = `rgba(90,62,30,${0.1 + random() * 0.15})`; ctx.fillRect(0, random() * h, w, 2); }
          grime(ctx, w, h, wear, random);
        }, { px: 256, glow: lit && !boarded ? glow * 0.8 : 0 }), [x * 2.05, floor + 1.75, L / 2 + 0.012]);
      }
      // awning
      const awning = s.box([W - 0.4, 0.06, 1.1], [0, floor + 2.95, L / 2 + 0.5], s.material(tone(trimColour, a.doors === 'white' ? -0.3 : 0)));
      awning.rotation.x = 0.3;
      topPoint = [0, eave + 1.0, L / 2 - 0.175];
      crownScale = 0.75;
    }

    // ---- Doors
    const doorH = 2.25, leaf = a.tradition === 'storefront' ? 0.5 : 0.72;
    const doorMat = a.tradition === 'storefront' ? s.material(trimColour, { roughness: 0.5 }) : trim;
    s.box([leaf * 2 + 0.24, doorH + 0.16, 0.08], [0, frontY + doorH / 2 + 0.04, doorZ + 0.02], a.tradition === 'adobe-mission' ? s.material('#6a4a30') : white);
    s.box([leaf * 2, doorH, 0.09], [0, frontY + doorH / 2, doorZ + 0.022], s.material(open ? (lit ? '#5a3a1e' : '#1c1a18') : '#1c1a18', open ? { emissive: '#ffb45a', emissiveIntensity: glow * 0.55 } : {}));
    const swing = open ? mix(1.2, 1.9, random()) : boarded ? 0 : 0;
    for (const side of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(side * leaf, frontY, doorZ + 0.07);
      const door = new THREE.Mesh(new THREE.BoxGeometry(leaf, doorH, 0.05), doorMat);
      door.position.set(-side * leaf / 2, doorH / 2, 0);
      door.castShadow = true;
      hinge.add(door);
      for (const y of [0.55, 1.55]) {
        const inset = new THREE.Mesh(new THREE.BoxGeometry(leaf * 0.62, 0.62, 0.062), s.material(tone(doorMat.color, -0.06)));
        inset.position.set(-side * leaf / 2, y, 0);
        hinge.add(inset);
      }
      hinge.rotation.y = -side * swing * (side === 1 ? 1 : mix(0.8, 1, random()));
      s.root.add(hinge);
    }
    if (framed || a.tradition === 'adobe-mission') add(makeWindow(leaf * 2 + 0.1, 0.75, archKind === 'square' ? 'round' : archKind), [0, frontY + doorH + 0.5, doorZ + 0.014]);
    if (boarded) {
      const plank = s.box([leaf * 2 + 0.5, 0.16, 0.04], [0, frontY + 1.15, doorZ + 0.12], s.material('#b3935f'));
      plank.rotation.z = (random() - 0.5) * 0.25;
      s.box([leaf * 2 + 0.5, 0.16, 0.04], [0, frontY + 1.7, doorZ + 0.125], s.material('#a5854f')).rotation.z = (random() - 0.5) * 0.3;
      add(panel(0.5, 0.36, (ctx, w, h) => { ctx.fillStyle = '#e8e2d0'; ctx.fillRect(0, 0, w, h); write(ctx, 'NO', w / 2, h * 0.3, h * 0.3, '#b3261e'); write(ctx, 'TRESPASSING', w / 2, h * 0.7, h * 0.2, '#b3261e', { max: w * 0.9 }); }, { px: 128 }), [leaf + 0.55, frontY + 1.5, doorZ + 0.02]);
    }
    if (a.state === 'funeral') {
      s.ring(0.3, 0.09, [-(leaf + 0.45), frontY + 1.45, doorZ + 0.1], s.material('#1f2a22'));
      s.box([0.1, 0.5, 0.02], [-(leaf + 0.45), frontY + 0.95, doorZ + 0.1], s.material('#3a2a4a'));
      const drape = s.tube([[-leaf - 0.2, frontY + doorH + 0.15, doorZ + 0.12], [-leaf * 0.5, frontY + doorH - 0.12, doorZ + 0.16], [0, frontY + doorH + 0.1, doorZ + 0.14], [leaf * 0.5, frontY + doorH - 0.12, doorZ + 0.16], [leaf + 0.2, frontY + doorH + 0.15, doorZ + 0.12]], 0.09, s.material('#4a2a66'));
      drape.scale.set(1, 1, 0.5);
    }
    if (a.state === 'wedding') {
      const ribbon = s.material('#fbf7ee', { roughness: 0.4 });
      s.tube([[-leaf - 0.25, frontY + doorH + 0.12, doorZ + 0.12], [-leaf * 0.5, frontY + doorH - 0.15, doorZ + 0.16], [0, frontY + doorH + 0.12, doorZ + 0.14], [leaf * 0.5, frontY + doorH - 0.15, doorZ + 0.16], [leaf + 0.25, frontY + doorH + 0.12, doorZ + 0.12]], 0.07, ribbon);
      for (const x of [-leaf - 0.25, 0, leaf + 0.25]) {
        s.ball([0.16, 0.12, 0.08], [x - 0.1, frontY + doorH + 0.14, doorZ + 0.16], ribbon, 8);
        s.ball([0.16, 0.12, 0.08], [x + 0.1, frontY + doorH + 0.14, doorZ + 0.16], ribbon, 8);
        s.box([0.05, 0.5, 0.02], [x - 0.05, frontY + doorH - 0.15, doorZ + 0.17], ribbon).rotation.z = 0.15;
        s.box([0.05, 0.45, 0.02], [x + 0.05, frontY + doorH - 0.15, doorZ + 0.17], ribbon).rotation.z = -0.15;
      }
    }

    // ---- Approach
    const stepsW = leaf * 2 + 1.0;
    const stepCount = Math.max(1, Math.round(frontY / 0.19));
    const stepMat = a.approach === 'wood-steps' || a.approach === 'porch' || a.approach === 'ramp' ? s.material(wear > 0.5 ? '#8f8674' : '#b9a27c') : s.material('#c4c0b4', { roughness: 1 });
    const landing = a.approach === 'porch' ? 1.6 : 0.9;
    s.box([stepsW + (a.approach === 'porch' ? 1.2 : 0), frontY, landing], [0, frontY / 2, doorZ + landing / 2], stepMat);
    let frontEdge = doorZ + landing;
    const rail = s.material(a.approach === 'concrete-steps' ? '#2a2623' : '#f4f1e6', { metalness: a.approach === 'concrete-steps' ? 0.5 : 0 });
    if (a.approach === 'ramp' && frontY > 0.25) {
      const run = frontY * 5.5;
      const ramp = s.box([run, 0.06, 1.1], [stepsW / 2 + run / 2 - 0.05, frontY / 2, doorZ + 0.55], stepMat);
      ramp.rotation.z = -Math.atan2(frontY, run);
      for (const z of [0.03, 1.07]) {
        s.rod([stepsW / 2, frontY + 0.85, doorZ + z], [stepsW / 2 + run, 0.85, doorZ + z], 0.03, rail);
        for (let i = 0; i <= 4; i++) { const t = i / 4; s.rod([stepsW / 2 + run * t, frontY * (1 - t), doorZ + z], [stepsW / 2 + run * t, frontY * (1 - t) + 0.85, doorZ + z], 0.03, rail); }
      }
    }
    for (let i = 1; i < stepCount; i++) {
      const y = frontY - i * (frontY / stepCount);
      s.box([stepsW, y, 0.3], [0, y / 2, frontEdge + 0.15], stepMat);
      frontEdge += 0.3;
    }
    if (a.approach === 'concrete-steps' || a.approach === 'wood-steps') {
      for (const x of [-1, 1]) {
        const x0 = x * (stepsW / 2 - 0.05);
        s.rod([x0, frontY, doorZ + 0.1], [x0, frontY + 0.9, doorZ + 0.1], 0.025, rail);
        s.rod([x0, 0, frontEdge], [x0, 0.9, frontEdge], 0.025, rail);
        s.rod([x0, frontY + 0.9, doorZ + 0.1], [x0, 0.9, frontEdge], 0.025, rail);
      }
    }
    if (a.approach === 'porch') {
      const pw = stepsW + 1.2;
      for (const x of [-1, 1]) s.box([0.12, 2.5, 0.12], [x * (pw / 2 - 0.1), frontY + 1.25, doorZ + landing - 0.1], white);
      const porchRoof = s.box([pw + 0.3, 0.08, landing + 0.4], [0, frontY + 2.62, doorZ + landing / 2], roofMat.clone());
      porchRoof.rotation.x = 0.16;
    }
    if (a.state === 'wedding') {
      s.scatter(new THREE.SphereGeometry(1, 5, 4), s.material('#ffffff'), Array.from({ length: Math.round(mix(40, 140, mood.density)) }, () => ({
        at: [(random() - 0.5) * stepsW * 1.2, 0.01 + random() * 0.02, doorZ + 0.4 + random() * (frontEdge - doorZ + 1.4)] as const, size: 0.02 + random() * 0.02, color: pick(random, ['#f7d6dc', '#ffffff', '#f2a6b8', '#f6e7b0']),
      })));
    }

    // ---- Crown
    const [cx, cy, cz] = topPoint;
    if (a.crown === 'cross' || a.crown === 'lit-cross' || (a.crown === 'bell' && !framed && a.tradition !== 'adobe-mission')) {
      const litCross = a.crown === 'lit-cross';
      const mat = litCross ? s.material('#fff3d0', { emissive: mood.warmth > 0.5 ? '#ff9a5a' : '#8fd0ff', emissiveIntensity: mix(0.5, 1.4, Math.abs(mood.daylight - 0.5) * 2) }) : white;
      const k = crownScale;
      const group = new THREE.Group();
      const up = new THREE.Mesh(new THREE.BoxGeometry(0.1 * k, 1.2 * k, 0.1 * k), mat); up.position.y = 0.6 * k; up.castShadow = true;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.66 * k, 0.1 * k, 0.1 * k), mat); bar.position.y = 0.82 * k; bar.castShadow = true;
      group.add(up, bar);
      group.position.set(cx, cy - 0.05, cz);
      group.rotation.z = (random() - 0.5) * 0.5 * wear * wear;
      s.root.add(group);
    } else if (a.crown === 'vane') {
      const iron = s.material('#2a2623', { metalness: 0.6 });
      s.rod([cx, cy - 0.05, cz], [cx, cy + 1.1, cz], 0.02, iron);
      s.ball([0.07, 0.07, 0.07], [cx, cy + 0.45, cz], iron, 8);
      const arrow = s.box([0.7, 0.03, 0.02], [cx, cy + 0.85, cz], iron);
      arrow.rotation.y = random() * Math.PI;
      const tail = s.box([0.02, 0.2, 0.2], [cx, cy + 0.85, cz], iron);
      tail.rotation.y = arrow.rotation.y;
    }

    // ---- Foundation plantings scale with density
    const shrubs = Math.round(mix(0, 9, mood.density) * (boarded ? 1.3 : 1));
    for (let i = 0; i < shrubs; i++) {
      const side = random() < 0.5 ? -1 : 1;
      const z = (random() - 0.5) * (L - 1);
      const size = 0.3 + random() * 0.35;
      s.ball([size, size * (boarded || wear > 0.6 ? 1.5 : 0.85), size], [side * (W / 2 + 0.3 + size * 0.5), size * 0.6, z], s.material(pick(random, wear > 0.6 ? ['#6f7a45', '#8a8550', '#5a6a3a'] : ['#3f6a3a', '#4f7a42', '#356034'])), 9);
    }

    return s.finish({ footprint: Math.max(W, L) * 0.55 });
  },
});
