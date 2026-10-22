import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { glow, paint, pick, pickSkin, rig, seat } from './rig';

const NAMES = {
  none: 'No name: plain black boxes.',
  'dub-engine': 'DUB ENGINE sprayed in red across the bins.',
  'zion-hifi': 'ZION HI-FI in green, gold and red.',
  'low-end': 'LOW END in dripping white letters.',
  'bass-kitchen': 'BASS KITCHEN in pink bubble letters.',
  'heavyweight': 'HEAVYWEIGHT in blocky yellow stencil.',
} as const;
const NAME_TEXT: Record<keyof typeof NAMES, { text: string; colour: string; outline: string }> = {
  none: { text: '', colour: '', outline: '' },
  'dub-engine': { text: 'DUB ENGINE', colour: '#e62d2d', outline: '#ffffff' },
  'zion-hifi': { text: 'ZION HI-FI', colour: '#2ec24a', outline: '#f2c21c' },
  'low-end': { text: 'LOW END', colour: '#f4f4f0', outline: '#8a8a8a' },
  'bass-kitchen': { text: 'BASS KITCHEN', colour: '#ff4fb0', outline: '#ffffff' },
  heavyweight: { text: 'HEAVYWEIGHT', colour: '#f2c21c', outline: '#1d1d1f' },
};

export default defineThing({
  questions: {
    height: choice('How high is the stack?', {
      knee: 'One bass bin with a mid-top on it: a small rig for a living room.',
      head: 'Two bass bins and a mid-top, head height.',
      towering: 'Three bass bins, a mid-top and a horn on top, well over head height.',
      wall: 'Four bass bins and two rows of tops, a wall of boxes.',
    }),
    width: choice('How wide is the wall?', {
      single: 'A single stack, one box wide.',
      pair: 'Two stacks side by side.',
      triple: 'Three stacks across, a proper wall.',
      quad: 'Four stacks across, the whole end of a room.',
    }),
    grille: choice('What covers the speaker fronts?', {
      cloth: 'Black grille cloth, intact and dusty.',
      torn: 'Grille cloth torn and hanging, the cones showing through.',
      bare: 'No cloth at all: bare paper cones and dust caps.',
      metal: 'Perforated steel grilles bolted on.',
    }),
    name: choice('Is a sound-system name spray-painted across the boxes?', NAMES),
    top: choice('What is thrown over the top boxes?', {
      rug: 'A worn red patterned rug.',
      blanket: 'A grey wool blanket.',
      tarp: 'A blue tarpaulin, corners hanging.',
      nothing: 'Nothing, bare plywood tops.',
    }),
    straps: choice('What holds the stack together?', {
      orange: 'Orange ratchet straps.',
      yellow: 'Yellow ratchet straps.',
      black: 'Black straps.',
      none: 'No straps, just stacked and trusted.',
    }),
    state: choice('What is it doing right now?', {
      playing: 'Playing: amp lights lit, cones pushing air.',
      silent: 'Switched off and silent, a jacket hung on a strap.',
      loading: 'Half loaded in: one top box still on the floor, a flight case open beside it.',
    }),
    crew: noul('Does a crew member sit on top of the stack, legs dangling over the front?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const bassRows = { knee: 1, head: 2, towering: 3, wall: 4 }[a.height];
    const topRows = { knee: 1, head: 1, towering: 2, wall: 2 }[a.height];
    const cols = { single: 1, pair: 2, triple: 3, quad: 4 }[a.width];
    const BW = 1.1, BH = 0.62, BD = 0.72, TW = 0.74, TH = 0.42, TD = 0.5, GAP = 0.05;
    const pitch = BW + GAP;
    const playing = a.state === 'playing';

    const box = s.material('#222226', { roughness: 0.78 });
    const ply = s.material('#2a2724', { roughness: 0.9 });
    const clothMap = paint(256, 256, (c, w, h) => {
      c.fillStyle = '#2c2c31'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(0,0,0,0.35)';
      for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1);
      for (let x = 0; x < w; x += 4) c.fillRect(x, 0, 1, h);
      // The driver pressing through the cloth as a faint ring.
      c.strokeStyle = 'rgba(120,120,128,0.35)'; c.lineWidth = 7;
      c.beginPath(); c.arc(w / 2, h / 2, w * 0.33, 0, 7); c.stroke();
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.3, 0, 7); c.fill();
    });
    const cloth = new THREE.MeshStandardMaterial({ map: clothMap, roughness: 1 });
    const rim = s.material('#3d362f', { roughness: 0.85 });
    const cone = s.material('#3a3632', { roughness: 0.95 });
    const cap = s.material('#141416', { roughness: 0.5 });
    const steel = s.material('#8e9398', { metalness: 0.7, roughness: 0.35 });
    const rubber = s.material('#111113', { roughness: 0.9 });
    const horn = s.material('#2a2a2d', { roughness: 0.6 });
    const strapColour = { orange: '#ff7a1a', yellow: '#f2c21c', black: '#202022', none: '#000000' }[a.straps];
    const strap = s.material(strapColour, { roughness: 0.8 });
    const led = glow(playing ? '#39ff6a' : '#3a2a2a', playing ? 2 : 0);

    const cones: THREE.Object3D[] = [];
    const corners: { at: [number, number, number]; size: number }[] = [];
    const bolts: { at: [number, number, number]; size: number }[] = [];
    const metalMap = paint(256, 256, (c, w, h) => {
      c.fillStyle = '#44464a'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#121214';
      for (let y = 8; y < h; y += 14) for (let x = 8 + ((y / 14) % 2) * 7; x < w; x += 14) { c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); }
    });
    metalMap.wrapS = metalMap.wrapT = THREE.RepeatWrapping;
    const metal = new THREE.MeshStandardMaterial({ map: metalMap, roughness: 0.5, metalness: 0.4 });

    /** One cabinet: body, front dressing, corners, handles. Returns nothing; collects cones for the pulse. */
    const cabinet = (x: number, y: number, z: number, w: number, h: number, d: number, bass: boolean) => {
      s.box([w, h, d], [x, y + h / 2, z], box);
      const front = z + d / 2;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) corners.push({ at: [x + sx * (w / 2 - 0.02), y + h / 2 + sy * (h / 2 - 0.02), z + sz * (d / 2 - 0.02)], size: 0.05 });
      // Recessed handles on both sides.
      for (const sx of [-1, 1]) s.box([0.012, 0.05, 0.16], [x + sx * (w / 2 + 0.004), y + h * 0.55, z], cap);
      const drivers: [number, number, number][] = bass ? [[x, y + h * 0.5, w * 0.24]] : [[x - w * 0.24, y + h * 0.42, w * 0.15], [x + w * 0.2, y + h * 0.42, w * 0.15]];
      const showCones = a.grille !== 'cloth' && a.grille !== 'metal';
      if (showCones) {
        for (const [cx, cy, r] of drivers) {
          const surround = s.ring(r, r * 0.09, [cx, cy, front + 0.012], rubber);
          surround.rotation.x = 0;
          const dish = s.mesh(new THREE.LatheGeometry([new THREE.Vector2(r * 0.22, 0), new THREE.Vector2(r * 0.95, r * 0.42)].map((v) => v), 24), cone, [cx, cy, front - r * 0.42 + 0.012]);
          dish.rotation.x = Math.PI / 2;
          const dome = s.ball([r * 0.24, r * 0.24, r * 0.14], [cx, cy, front - r * 0.05], cap, 12);
          cones.push(dish, dome);
        }
      }
      if (!bass) {
        // The horn flare between or above the mids.
        const flare = s.mesh(new THREE.CylinderGeometry(w * 0.22, w * 0.07, d * 0.5, 4, 1, true), horn, [x, y + h * 0.8, front - d * 0.25]);
        flare.rotation.x = Math.PI / 2;
        flare.rotation.z = Math.PI / 4;
        (flare.material as THREE.Material).side = THREE.DoubleSide;
      }
      if (a.grille === 'cloth' || a.grille === 'torn') s.box([w - 0.04, h - 0.04, 0.012], [x, y + h / 2, front + 0.002], rim);
      if (a.grille === 'cloth') s.box([w - 0.1, h - 0.1, 0.018], [x, y + h / 2, front + 0.012], cloth);
      if (a.grille === 'metal') {
        const plate = s.mesh(new THREE.PlaneGeometry(w - 0.08, h - 0.08), metal, [x, y + h / 2, front + 0.016]);
        void plate;
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) bolts.push({ at: [x + sx * (w / 2 - 0.06), y + h / 2 + sy * (h / 2 - 0.06), front + 0.02], size: 0.014 });
      }
      if (a.grille === 'torn') {
        // Cloth that has let go on one side and hangs in a flap.
        const keep = 0.35 + random() * 0.25;
        const side = random() < 0.5 ? -1 : 1;
        s.box([(w - 0.1) * keep, h - 0.1, 0.018], [x - side * (w - 0.1) * (1 - keep) / 2, y + h / 2, front + 0.012], cloth);
        const flap = s.box([(w - 0.08) * (1 - keep) * 0.8, (h - 0.08) * 0.6, 0.014], [x + side * (w - 0.08) * keep * 0.4, y + h * 0.28, front + 0.07], cloth);
        flap.rotation.set(0.45, 0, side * 0.35);
      }
      // A slot port along the bottom of a bass bin.
      if (bass) s.box([w * 0.7, 0.06, 0.02], [x, y + 0.07, front + 0.004], cap);
    };

    const stackTop: number[] = [];
    for (let col = 0; col < cols; col++) {
      const x = (col - (cols - 1) / 2) * pitch;
      let y = 0;
      const lean = (random() - 0.5) * 0.02;
      for (let row = 0; row < bassRows; row++) { cabinet(x + lean * row, y, 0, BW, BH, BD, true); y += BH; }
      const topsHere = a.state === 'loading' && col === cols - 1 ? topRows - 1 : topRows;
      for (let row = 0; row < topsHere; row++) { cabinet(x + lean * (bassRows + row), y, (BD - TD) / 2 - 0.02, TW, TH, TD, false); y += TH; }
      stackTop.push(y);
      // Ratchet strap: over the top, down the front and the back.
      if (a.straps !== 'none') {
        const sx = x + (random() - 0.5) * 0.1;
        const hBass = bassRows * BH;
        s.box([0.05, hBass + 0.001, 0.008], [sx, hBass / 2, BD / 2 + 0.03], strap);
        s.box([0.05, hBass + 0.001, 0.008], [sx, hBass / 2, -BD / 2 - 0.004], strap);
        if (topsHere > 0) {
          const topFront = (BD - TD) / 2 - 0.02 + TD / 2;
          s.box([0.05, y - hBass, 0.008], [sx, hBass + (y - hBass) / 2, topFront + 0.03], strap);
          s.box([0.05, 0.008, TD + 0.03], [sx, y + 0.004, (BD - TD) / 2 - 0.02], strap);
          s.box([0.05, 0.008, (BD - TD) / 2 + 0.05], [sx, hBass + 0.004, BD / 2 - (BD - TD) / 4], strap);
        } else s.box([0.05, 0.008, BD + 0.04], [sx, y + 0.004, 0], strap);
        // The ratchet itself, a small steel block on the front.
        s.box([0.07, 0.09, 0.045], [sx, hBass * 0.45, BD / 2 + 0.05], steel);
        s.box([0.02, 0.14, 0.02], [sx + 0.03, hBass * 0.45 + 0.08, BD / 2 + 0.07], steel).rotation.x = -0.5;
      }
    }
    const topY = Math.max(...stackTop);
    const wallW = cols * pitch - GAP;

    s.scatter(new THREE.BoxGeometry(1, 1, 1), steel, corners);
    if (bolts.length) s.scatter(new THREE.SphereGeometry(1, 6, 4), steel, bolts);

    // The spray-painted name across the top bass row.
    if (a.name !== 'none') {
      const { text, colour, outline } = NAME_TEXT[a.name];
      const map = paint(1024, 256, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        const size = Math.min(h * 0.72, (w * 0.92) / text.length * 1.55);
        c.font = `bold ${size}px sans-serif`;
        c.lineJoin = 'round';
        c.shadowColor = colour; c.shadowBlur = 22;
        c.strokeStyle = outline; c.lineWidth = size * 0.16;
        c.strokeText(text, w / 2, h / 2 + 4);
        c.shadowBlur = 0;
        c.fillStyle = colour;
        c.fillText(text, w / 2, h / 2 + 4);
        // Drips under the letters.
        c.fillStyle = colour;
        for (let i = 0; i < 14; i++) { const x = w * 0.1 + random() * w * 0.8; c.fillRect(x, h * 0.62, 4, 10 + random() * 40); }
      });
      const row = Math.max(0, bassRows - 1);
      const sign = s.mesh(new THREE.PlaneGeometry(wallW * 0.96, BH * 0.95 * 0.25 * 4), new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.1, roughness: 0.9, depthWrite: false }), [0, row * BH + BH * 0.5, BD / 2 + 0.03]);
      sign.castShadow = false;
    }

    // Whatever is thrown over the top.
    if (a.top !== 'nothing') {
      const topMap = paint(256, 256, (c, w, h) => {
        if (a.top === 'rug') {
          c.fillStyle = '#8a1f24'; c.fillRect(0, 0, w, h);
          c.strokeStyle = '#d9b25a'; c.lineWidth = 6; c.strokeRect(14, 14, w - 28, h - 28);
          c.fillStyle = '#2b3f7a'; for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { c.beginPath(); c.moveTo(40 + i * 44, 24 + j * 44); c.lineTo(60 + i * 44, 44 + j * 44); c.lineTo(40 + i * 44, 64 + j * 44); c.lineTo(20 + i * 44, 44 + j * 44); c.fill(); }
          c.fillStyle = '#d9b25a'; for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { c.beginPath(); c.arc(40 + i * 44, 44 + j * 44, 5, 0, 7); c.fill(); }
        } else if (a.top === 'blanket') {
          c.fillStyle = '#6b6b6e'; c.fillRect(0, 0, w, h);
          c.fillStyle = '#5a5a5e'; for (let y = 0; y < h; y += 8) c.fillRect(0, y, w, 3);
          c.fillStyle = '#9a3a3a'; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14);
        } else {
          c.fillStyle = '#2b6cc4'; c.fillRect(0, 0, w, h);
          c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 2; for (let i = 0; i < w; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
          c.fillStyle = '#d9dde3'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(20 + i * 44, 20, 5, 0, 7); c.fill(); }
        }
      });
      const fabric = new THREE.MeshStandardMaterial({ map: topMap, roughness: 1, side: THREE.DoubleSide });
      fabric.color.lerp(new THREE.Color('#8b8275'), mood.wear * 0.35);
      const coverW = Math.min(wallW + 0.3, cols * pitch * (0.6 + random() * 0.3) + 0.3);
      const cx = (random() - 0.5) * Math.max(0, wallW - coverW);
      const topZ = (BD - TD) / 2 - 0.02;
      const slab = s.box([coverW, 0.03, TD + 0.1], [cx, topY + 0.015, topZ], fabric);
      slab.rotation.y = (random() - 0.5) * 0.08;
      // The sides hang down the front and over one end.
      const hang = 0.25 + random() * 0.3;
      s.box([coverW, hang, 0.02], [cx, topY - hang / 2 + 0.01, topZ + TD / 2 + 0.055], fabric).rotation.x = 0.08;
      const end = random() < 0.5 ? -1 : 1;
      s.box([0.02, hang * 0.7, TD + 0.08], [cx + end * (coverW / 2 + 0.005), topY - hang * 0.35 + 0.01, topZ], fabric).rotation.z = -end * 0.06;
    }

    // The amp rack at one end, with its lights.
    const rackX = -(wallW / 2 + 0.36);
    s.box([0.5, 0.56, 0.5], [rackX, 0.28, 0.05], box);
    for (let i = 0; i < 3; i++) {
      s.box([0.46, 0.13, 0.02], [rackX, 0.1 + i * 0.16, 0.31], steel);
      for (let k = 0; k < 4; k++) s.ball([0.012, 0.012, 0.006], [rackX - 0.15 + k * 0.06, 0.1 + i * 0.16, 0.322], playing && (k < 2 || random() < 0.5) ? led : cap, 6);
      s.cylinder(0.02, 0.02, 0.02, [rackX + 0.15, 0.1 + i * 0.16, 0.325], cap, 10);
    }
    // Speaker leads from the rack to the stack.
    const lead = s.material('#1a1a1c', { roughness: 0.9 });
    s.tube([[rackX + 0.2, 0.08, -0.1], [rackX + 0.45, 0.03, -0.25], [-wallW / 2 + 0.3, 0.02, -0.42], [0.2, 0.02, -0.4]], 0.012, lead);
    s.tube([[rackX + 0.2, 0.26, -0.15], [rackX + 0.5, 0.1, -0.3], [-wallW / 2 + 0.1, 0.05, -0.36]], 0.01, lead);

    if (a.state === 'silent') {
      // A jacket hung on the nearest strap, or over a corner.
      const jacket = s.material(pick(random, ['#4a5a3a', '#7a2a2a', '#2a3a6a', '#1d1d1f']), { roughness: 0.95 });
      const jx = -wallW / 2 + 0.35 + random() * Math.max(0.1, wallW - 0.7);
      s.box([0.4, 0.62, 0.1], [jx, bassRows * BH - 0.2, BD / 2 + 0.09], jacket).rotation.z = 0.12;
      s.box([0.12, 0.32, 0.09], [jx + 0.2, bassRows * BH - 0.38, BD / 2 + 0.1], jacket).rotation.z = 0.3;
    }
    if (a.state === 'loading') {
      // One top box on the floor and an open flight case.
      const fx = wallW / 2 + 0.55, fz = 0.5;
      cabinet(fx, 0, fz, TW, TH, TD, false);
      const alu = s.material('#b9bec2', { metalness: 0.7, roughness: 0.3 });
      const caseBody = s.material('#1f1f22', { roughness: 0.6 });
      const cx = -wallW / 2 - 0.5, cz = 0.75;
      s.box([0.7, 0.3, 0.5], [cx, 0.15, cz], caseBody);
      const lid = s.box([0.7, 0.2, 0.5], [cx, 0.42, cz - 0.4], caseBody);
      lid.rotation.x = -1.3;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) corners.push({ at: [cx + sx * 0.34, 0.03, cz + sz * 0.24], size: 0.06 });
      s.box([0.72, 0.02, 0.52], [cx, 0.3, cz], alu);
      s.box([0.5, 0.05, 0.3], [cx, 0.32, cz], s.material('#3a2a5a'));
    }

    // A crew member on top, legs over the front edge.
    let person: ReturnType<typeof figure> | null = null;
    if (a.crew && topY > 0.8) {
      const skin = pickSkin(random);
      const H = mix(1.6, 1.85, random());
      person = figure(s, {
        height: H, style: 'doll', skin, pose: 'sitting', gaze: 'ahead', sleeves: random() < 0.5 ? 'short' : 'long',
        hair: pick(random, ['short', 'cap', 'hood', 'long', 'hat'] as const), hairColor: pick(random, ['#1d1d1f', '#3b2a22', '#c9b071', '#6a2a2a']),
        top: pick(random, ['#2a2a2c', '#c9d22a', '#6b2d8a', '#d9d4c8', '#1f6f8a']), bottom: pick(random, ['#2a3a5a', '#1d1d1f', '#5a4a3a']), shoes: '#e8e4dc',
      });
      s.root.add(person.root);
      const joints = rig(person);
      joints.arm('left', { forward: 20, out: 10, bend: 60, across: 20 });
      joints.arm('right', { forward: -10, out: 25, bend: 30 });
      joints.leg('left', { forward: 86, out: 8, knee: 95, foot: 10 });
      joints.leg('right', { forward: 80, out: 10, knee: 100, foot: 20 });
      joints.look(12, 0);
      joints.settle();
      const col = Math.floor(random() * cols);
      const stackX = (col - (cols - 1) / 2) * pitch;
      const frontZ = (BD - TD) / 2 - 0.02 + TD / 2;
      seat(person, stackX + (random() - 0.5) * 0.2, stackTop[col] + 0.045 * H, frontZ - 0.1);
      person.root.rotation.y = (random() - 0.5) * 0.3;
      // A can in the hand.
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 12), s.material(pick(random, ['#d8262c', '#2b6fb8', '#f2c21c', '#f4f1e8'])));
      can.position.y = -0.04;
      person.hands.left.add(can);
    }

    const tempo = mix(1.4, 3.4, mood.energy);
    const pump = playing ? mix(0.02, 0.09, mood.energy) : 0;
    return s.finish({
      update: (dt, time) => {
        person?.update(dt, time);
        if (pump) {
          const kick = Math.max(0, Math.sin(time * tempo * Math.PI)) ** 6 * pump;
          for (const c of cones) c.position.z = (c.userData.z ??= c.position.z) + kick;
        }
        if (playing) led.emissiveIntensity = 1.4 + Math.max(0, Math.sin(time * tempo * Math.PI)) ** 4 * 1.2;
      },
    });
  },
});
