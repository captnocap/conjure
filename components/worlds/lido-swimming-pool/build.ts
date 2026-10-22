import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const paint = (w: number, h: number, draw: (c: Ctx) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const TRIMS = {
  'sea-green': { trim: '#2f8f7a', pale: '#bfe3d5', stripe: '#f8f4e8' },
  'liner-blue': { trim: '#1f5fa8', pale: '#bcd6ee', stripe: '#f8f4e8' },
  terracotta: { trim: '#c2553a', pale: '#f1d3bd', stripe: '#f6ecd2' },
  'pink-mint': { trim: '#e8799a', pale: '#bfe8d6', stripe: '#fdf6ee' },
} as const;
const TIMES = { early: [6, 55], noon: [12, 0], tea: [16, 10], closing: [19, 58], stopped: [10, 10] } as const;

export default defineWorld({
  questions: {
    state: choice('What state is the pool in?', {
      'high-summer': 'High summer: brim-full turquoise water, bobbing swimmers, a beach ball adrift.',
      gala: 'Gala day: lane ropes strung, starting blocks out, bunting overhead.',
      'dawn-still': 'Before opening: mirror-still water, the cover half rolled back, nobody about.',
      drained: 'Drained and shut for winter: a bare painted basin with a puddle and drifts of leaves at the deep end.',
      neglected: 'Abandoned: opaque green water, scum, weeds through the paving and rubbish afloat.',
    }),
    fountain: choice('What is the fountain at the shallow end?', {
      tiered: 'A tiered wedding-cake cascade of round bowls spilling into one another.',
      stepped: 'A stepped Art Deco ziggurat with water sheeting down into the pool.',
      jets: 'A row of arching jets from a low trough.',
      dry: 'A tiered fountain standing dry and stained.',
    }),
    pavilion: choice('What is the pavilion along the back?', {
      'clock-tower': 'A long white block with a stepped central clock tower and a flagpole.',
      rotunda: 'A streamlined curved-glass café drum with a sun-deck roof and a clock on a tall fin.',
      colonnade: 'An open colonnade of square columns under a flat roof, the clock on the parapet.',
    }),
    trim: choice('What colour is the painted trim: doors, bands and railings?', {
      'sea-green': 'Sea green on white.',
      'liner-blue': 'Ocean-liner blue on white.',
      terracotta: 'Terracotta red on cream.',
      'pink-mint': 'Pink and mint, a seaside confection.',
    }),
    clock: choice('What time does the pavilion clock show?', {
      early: 'Five to seven: the early swimmers.',
      noon: 'Noon exactly.',
      tea: 'Ten past four, the long afternoon.',
      closing: 'Two minutes to eight: last whistle.',
      stopped: 'Stopped at ten past ten, its face cracked.',
    }),
    poolside: choice('What is on the poolside and terraces?', {
      deckchairs: 'Rows of striped deckchairs facing the water.',
      towels: 'Towels, bags and sandals spread wherever there was room.',
      stacked: 'Deckchairs folded and stacked, chained to a post, a mop bucket by them.',
      bare: 'Nothing: swept bare concrete.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const full = a.state !== 'drained';
    const lively = a.state === 'high-summer' || a.state === 'gala';
    const green = a.state === 'neglected';
    const tone = TRIMS[a.trim];
    const cream = a.trim === 'terracotta';
    const W = 18, D = 14;
    const x0 = -5.5, x1 = 5.5, z0 = -3.6, z1 = 0.4, pz = (z0 + z1) / 2, PL = x1 - x0, PW = z1 - z0;
    const wl = -0.13;
    const floorAt = (x: number) => -mix(0.55, 1.35, (x - x0) / PL);
    const stand = (x: number) => (full ? wl : floorAt(x));
    const sky = new THREE.Color('#dfeaec').lerp(new THREE.Color('#f1e6d2'), mood.warmth * 0.5).lerp(new THREE.Color('#cfd3d2'), (1 - mood.cheer) * 0.4);
    const { art: s, world } = diorama(context, {
      background: `#${sky.getHexString()}`, floor: null, width: W, depth: D, pitch: 38, yaw: 27, maxHeight: 3.6, radius: 1.6,
      slots: [[0, 3.4], [-4.3, 3.9], [4.5, 3.8], [7.3, -1.5], [1.9, pz, stand(1.9), 0.75], [-2.6, pz - 0.2, stand(-2.6), 0.65], [-7.3, 4.3, 0, 0.85]],
    });
    const white = s.material(cream ? '#f3ead2' : '#f6f4ec', { roughness: 0.8 });
    const trim = s.material(tone.trim);
    const pale = s.material(tone.pale);
    const steel = s.material('#cfd5d8', { metalness: 0.8, roughness: 0.3 });
    const dirty = mood.wear + (green ? 0.35 : 0) + (a.state === 'drained' ? 0.15 : 0);

    // Paving, with the pool cut out of it.
    const paveMap = paint(256, 256, (c) => {
      c.fillStyle = '#cdc3ab'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4; i++) { c.fillStyle = `rgba(${i % 2 ? '255,250,235' : '120,110,95'},0.08)`; c.fillRect((i % 2) * 128, Math.floor(i / 2) * 128, 128, 128); }
      c.strokeStyle = 'rgba(90,84,72,0.55)'; c.lineWidth = 3;
      for (const k of [0, 128, 256]) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, 256); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(256, k); c.stroke(); }
      for (let i = 0; i < Math.round(dirty * 16); i++) { c.fillStyle = `rgba(${green ? '70,96,50' : '96,88,70'},${0.05 + random() * 0.09})`; c.beginPath(); c.ellipse(random() * 256, random() * 256, 8 + random() * 30, 6 + random() * 18, random() * 3, 0, 7); c.fill(); }
      c.strokeStyle = 'rgba(60,54,46,0.6)'; c.lineWidth = 1.5;
      for (let i = 0; i < Math.round(dirty * 5); i++) { let x = random() * 256, y = random() * 256; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (random() - 0.5) * 60; y += (random() - 0.5) * 60; c.lineTo(x, y); } c.stroke(); }
    });
    paveMap.wrapS = paveMap.wrapT = THREE.RepeatWrapping; paveMap.repeat.set(0.5, 0.5);
    const slab = new THREE.Shape();
    slab.moveTo(-W / 2, -D / 2); slab.lineTo(W / 2, -D / 2); slab.lineTo(W / 2, D / 2); slab.lineTo(-W / 2, D / 2); slab.lineTo(-W / 2, -D / 2);
    const hole = new THREE.Path();
    hole.moveTo(x0, -z1); hole.lineTo(x0, -z0); hole.lineTo(x1, -z0); hole.lineTo(x1, -z1); hole.lineTo(x0, -z1);
    slab.holes.push(hole);
    const paveGeometry = new THREE.ExtrudeGeometry(slab, { depth: 1.7, bevelEnabled: false });
    paveGeometry.rotateX(-Math.PI / 2); paveGeometry.translate(0, -1.7, 0);
    const paving = s.mesh(paveGeometry, new THREE.MeshStandardMaterial({ map: paveMap, roughness: 0.92 }));
    paving.castShadow = false;
    world.ground = paving;
    s.box([PL + 0.4, 0.3, PW + 0.4], [0, -1.55, pz], s.material('#b9b2a0')).castShadow = false;

    // Basin: tiled walls and a sloping floor with painted lanes.
    const lanes = 5;
    const tileMap = paint(512, 256, (c) => {
      c.fillStyle = full ? '#bfe9e4' : '#cfe6e0'; c.fillRect(0, 0, 512, 256);
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1;
      for (let x = 0; x < 512; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke(); }
      for (let y = 0; y < 256; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }
      c.fillStyle = '#1d3f7a';
      for (let i = 0; i < lanes; i++) { const y = (i + 0.5) * (256 / lanes); c.fillRect(30, y - 5, 452, 10); c.fillRect(26, y - 16, 8, 32); c.fillRect(478, y - 16, 8, 32); }
      for (let i = 0; i < Math.round(dirty * 30); i++) { c.fillStyle = `rgba(90,96,60,${0.1 + random() * 0.2})`; c.beginPath(); c.ellipse(260 + random() * 250, random() * 256, 10 + random() * 40, 6 + random() * 20, random() * 3, 0, 7); c.fill(); }
    });
    const floorGeometry = new THREE.PlaneGeometry(PL, PW, 1, 1);
    floorGeometry.rotateX(-Math.PI / 2);
    const fp = floorGeometry.attributes.position;
    for (let i = 0; i < fp.count; i++) fp.setY(i, floorAt(fp.getX(i)));
    floorGeometry.computeVertexNormals();
    s.mesh(floorGeometry, new THREE.MeshStandardMaterial({ map: tileMap, roughness: 0.6 }), [0, 0, pz]).castShadow = false;
    const wallTile = s.material('#c9e8e2', { roughness: 0.5 });
    s.box([PL, 1.5, 0.04], [0, -0.75, z0 + 0.02], wallTile); s.box([PL, 1.5, 0.04], [0, -0.75, z1 - 0.02], wallTile);
    s.box([0.04, 1.5, PW], [x0 + 0.02, -0.75, pz], wallTile); s.box([0.04, 1.5, PW], [x1 - 0.02, -0.75, pz], wallTile);
    for (const z of [z0 + 0.045, z1 - 0.045]) s.box([PL, 0.12, 0.01], [0, -0.3, z], trim);
    // Coping stones.
    const coping = s.material(cream ? '#efe6cf' : '#f4f2ea', { roughness: 0.7 });
    s.box([PL + 0.7, 0.07, 0.35], [0, 0.03, z0 - 0.175], coping); s.box([PL + 0.7, 0.07, 0.35], [0, 0.03, z1 + 0.175], coping);
    s.box([0.35, 0.07, PW], [x0 - 0.175, 0.03, pz], coping); s.box([0.35, 0.07, PW], [x1 + 0.175, 0.03, pz], coping);
    s.box([PL + 0.72, 0.02, 0.06], [0, 0.07, z1 + 0.32], trim); s.box([PL + 0.72, 0.02, 0.06], [0, 0.07, z0 - 0.32], trim);

    // Water.
    let ripples: THREE.Texture | null = null;
    if (full) {
      const waterColour = green ? '#6f8a3c' : a.state === 'dawn-still' ? '#7fcfd0' : '#7fe0dc';
      const waterMap = paint(512, 256, (c) => {
        c.fillStyle = waterColour; c.fillRect(0, 0, 512, 256);
        const deepen = c.createLinearGradient(0, 0, 512, 0);
        deepen.addColorStop(0, 'rgba(255,255,255,0.18)'); deepen.addColorStop(1, green ? 'rgba(40,60,20,0.3)' : 'rgba(20,110,150,0.32)');
        c.fillStyle = deepen; c.fillRect(0, 0, 512, 256);
        if (!green) {
          c.fillStyle = 'rgba(24,62,128,0.62)';
          for (let i = 0; i < lanes; i++) {
            const y = (i + 0.5) * (256 / lanes);
            c.beginPath(); c.moveTo(30, y);
            for (let x = 30; x <= 482; x += 12) c.lineTo(x, y - 4 + Math.sin(x * 0.11 + i) * (a.state === 'dawn-still' ? 0.4 : 2.2));
            for (let x = 482; x >= 30; x -= 12) c.lineTo(x, y + 4 + Math.sin(x * 0.13 + i * 2) * (a.state === 'dawn-still' ? 0.4 : 2.2));
            c.fill(); c.fillRect(26, y - 15, 8, 30); c.fillRect(478, y - 15, 8, 30);
          }
        } else {
          for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '150,170,70' : '60,80,34'},${0.25 + random() * 0.3})`; c.beginPath(); c.ellipse(random() * 512, random() * 256, 8 + random() * 40, 5 + random() * 18, random() * 3, 0, 7); c.fill(); }
        }
      });
      s.mesh(new THREE.PlaneGeometry(PL, PW), new THREE.MeshStandardMaterial({ map: waterMap, roughness: green ? 0.6 : 0.12, metalness: 0.05, emissive: green ? '#000000' : '#2aa7a0', emissiveIntensity: green ? 0 : mix(0.05, 0.22, mood.cheer) }), [0, wl, pz]).rotation.x = -Math.PI / 2;
      if (!green) {
        ripples = paint(256, 256, (c) => {
          c.clearRect(0, 0, 256, 256);
          c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2.2;
          for (let i = 0; i < 44; i++) {
            const x = random() * 256, y = random() * 256, r = 10 + random() * 22;
            c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + r, y - r * 0.6, x + r * 1.6, y + r * 0.6, x + r * 2.4, y + (random() - 0.5) * r); c.stroke();
          }
        });
        ripples.wrapS = ripples.wrapT = THREE.RepeatWrapping; ripples.repeat.set(3.5, 1.4);
        const strength = a.state === 'dawn-still' ? 0.1 : mix(0.3, 0.7, mood.energy);
        const net = s.mesh(new THREE.PlaneGeometry(PL, PW), new THREE.MeshBasicMaterial({ map: ripples, transparent: true, opacity: strength, depthWrite: false }), [0, wl + 0.012, pz]);
        net.rotation.x = -Math.PI / 2; net.castShadow = net.receiveShadow = false;
      }
    } else {
      const puddle = s.cylinder(1, 1, 0.01, [3.9, floorAt(3.9) + 0.03, pz + 0.3], new THREE.MeshStandardMaterial({ color: '#566f6a', roughness: 0.08, metalness: 0.3 }), 24);
      puddle.scale.set(1.5, 1, 1.1); puddle.rotation.z = Math.atan(0.8 / PL); puddle.castShadow = false;
      const leaves = Array.from({ length: 90 + Math.round(mood.density * 120) }, () => {
        const x = mix(x0 + 0.3, x1 - 0.2, Math.pow(random(), 0.45)), z = z0 + 0.2 + random() * (PW - 0.4);
        return { at: [x, floorAt(x) + 0.02, z] as const, size: 0.09 + random() * 0.12, color: ['#8a5a2a', '#b07a2c', '#6c4a26', '#c29a3c'][Math.floor(random() * 4)] };
      });
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.12, 5), new THREE.MeshStandardMaterial({ roughness: 0.9 }), leaves);
      // A trestle barrier at the edge.
      const bx = 2.8, bz = z1 + 0.85;
      s.box([1.6, 0.22, 0.04], [bx, 0.78, bz], s.material('#c9232b'));
      s.label('POOL CLOSED', 1.5, 0.2, [bx, 0.78, bz + 0.025], '#ffffff', '#c9232b');
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.rod([bx + sx * 0.65, 0.88, bz], [bx + sx * 0.72, 0, bz + sz * 0.25], 0.025, s.material('#e9e4d4'));
    }

    // Ladders at the corners of the long sides.
    for (const [lx, lz, side] of [[x0 + 1.2, z1, 1], [x1 - 1.2, z1, 1], [x1 - 1.2, z0, -1]] as const) {
      for (const dx of [-0.22, 0.22]) s.tube([[lx + dx, -0.9, lz - side * 0.06], [lx + dx, 0.55, lz - side * 0.06], [lx + dx, 0.8, lz + side * 0.2], [lx + dx, 0.06, lz + side * 0.45]], 0.022, steel);
      for (let i = 0; i < 3; i++) s.rod([lx - 0.22, -0.3 - i * 0.28, lz - side * 0.06], [lx + 0.22, -0.3 - i * 0.28, lz - side * 0.06], 0.018, steel);
    }

    // Spectator terraces along the back, and the left boundary wall with changing doors.
    const tz = z0 - 0.75;
    s.box([W, 0.3, 0.55], [0, 0.15, tz - 0.275], white); s.box([W, 0.6, 0.55], [0, 0.3, tz - 0.825], white);
    const py = 0.9, pzBack = tz - 1.1;
    s.box([W, py, pzBack + D / 2], [0, py / 2, (pzBack - D / 2) / 2], white);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) s.box([1.3, 0.3 * (i + 1) - 0.15, 0.3], [sx * 4.2, (0.3 * (i + 1) - 0.15) / 2, tz - 0.15 - i * 0.37 + 0.3], coping);
    const doorMap = paint(512, 128, (c) => {
      c.fillStyle = cream ? '#f3ead2' : '#f6f4ec'; c.fillRect(0, 0, 512, 128);
      c.fillStyle = tone.trim; c.fillRect(0, 0, 512, 10); c.fillRect(0, 112, 512, 16);
      for (let i = 0; i < 8; i++) {
        c.fillStyle = i % 2 ? tone.pale : tone.trim; c.fillRect(i * 64 + 16, 44, 32, 60);
        c.fillStyle = 'rgba(20,24,28,0.75)'; c.fillRect(i * 64 + 16, 30, 32, 12);
        c.fillStyle = '#c9a13c'; c.beginPath(); c.arc(i * 64 + 32, 58, 4, 0, 7); c.fill();
      }
      for (let i = 0; i < Math.round(dirty * 40); i++) { c.fillStyle = `rgba(110,96,70,${0.1 + random() * 0.2})`; c.fillRect(random() * 512, 10, 2 + random() * 5, 30 + random() * 90); }
    });
    doorMap.wrapS = THREE.RepeatWrapping; doorMap.repeat.x = 1.5;
    const wallX = -W / 2 + 0.2;
    s.box([0.4, 2.4, D], [wallX, 1.2, 0], white);
    s.mesh(new THREE.PlaneGeometry(tz - 0.2 + D / 2, 2.4), new THREE.MeshStandardMaterial({ map: doorMap, roughness: 0.8 }), [wallX + 0.205, 1.2, (D / 2 + tz - 0.2) / 2]).rotation.y = Math.PI / 2;
    s.box([0.56, 0.1, D], [wallX, 2.45, 0], coping);

    // Clock face.
    const [hour, minute] = TIMES[a.clock];
    const clockMap = paint(256, 256, (c) => {
      c.fillStyle = tone.trim; c.beginPath(); c.arc(128, 128, 128, 0, 7); c.fill();
      c.fillStyle = a.clock === 'stopped' ? '#e4dfcc' : '#fbf9f0'; c.beginPath(); c.arc(128, 128, 108, 0, 7); c.fill();
      c.fillStyle = '#1c2026';
      for (let i = 0; i < 12; i++) { c.save(); c.translate(128, 128); c.rotate((i / 12) * Math.PI * 2); c.fillRect(-5, -100, 10, i % 3 ? 16 : 30); c.restore(); }
      const hand = (angle: number, length: number, width: number) => { c.save(); c.translate(128, 128); c.rotate(angle); c.fillRect(-width / 2, -length, width, length + 14); c.restore(); };
      hand(((hour % 12) + minute / 60) / 12 * Math.PI * 2, 56, 13); hand((minute / 60) * Math.PI * 2, 88, 8);
      c.beginPath(); c.arc(128, 128, 10, 0, 7); c.fill();
      if (a.clock === 'stopped') { c.strokeStyle = '#1c2026'; c.lineWidth = 2; c.beginPath(); c.moveTo(150, 30); c.lineTo(120, 96); c.lineTo(160, 130); c.lineTo(140, 200); c.moveTo(120, 96); c.lineTo(60, 120); c.stroke(); }
    });
    const clockAt = (x: number, y: number, z: number, r: number) => {
      const face = s.mesh(new THREE.CircleGeometry(r, 36), new THREE.MeshStandardMaterial({ map: clockMap, roughness: 0.5, emissive: '#ffffff', emissiveMap: clockMap, emissiveIntensity: 0.12 }), [x, y, z]);
      face.castShadow = false;
      s.cylinder(r + 0.06, r + 0.06, 0.08, [x, y, z - 0.05], white, 36).rotation.x = Math.PI / 2;
    };
    const glassMap = paint(512, 64, (c) => {
      c.fillStyle = '#35505e'; c.fillRect(0, 0, 512, 64);
      const sheen = c.createLinearGradient(0, 0, 0, 64); sheen.addColorStop(0, 'rgba(190,225,235,0.55)'); sheen.addColorStop(1, 'rgba(30,50,60,0.1)');
      c.fillStyle = sheen; c.fillRect(0, 0, 512, 64);
      c.strokeStyle = '#f4f2ea'; c.lineWidth = 3;
      for (let x = 0; x <= 512; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 64); c.stroke(); }
      for (const y of [1, 32, 63]) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }
    });
    glassMap.wrapS = THREE.RepeatWrapping;
    const glazing = (w: number, h: number, x: number, y: number, z: number, repeat = w / 3) => {
      const map = glassMap.clone(); map.repeat.x = repeat; map.needsUpdate = true;
      return s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.2, metalness: 0.2 }), [x, y, z]);
    };
    const pc = (pzBack - D / 2) / 2, pd = pzBack + D / 2;
    let flagTop: [number, number, number] = [0, py + 5.4, pc];
    if (a.pavilion === 'clock-tower') {
      const fz = pzBack - 0.25;
      s.box([W - 1.2, 2.1, pd - 0.3], [0.3, py + 1.05, pc - 0.1], white);
      s.box([W - 1.0, 0.12, pd - 0.1], [0.3, py + 2.16, pc - 0.1], trim);
      s.box([W - 0.9, 0.1, pd], [0.3, py + 2.27, pc - 0.1], white);
      for (const sx of [-1, 1]) glazing(6.0, 0.95, 0.3 + sx * 4.6, py + 1.25, fz + 0.01);
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) s.box([0.7, 1.5, 0.05], [0.3 + sx * (2.0 + i * 2.6), py + 0.75, fz + 0.02], i === 1 ? trim : pale).visible = i === 1;
      s.box([2.3, 4.3, pd + 0.2], [0.3, py + 2.15, pc + 0.1], white);
      s.box([1.7, 0.5, pd - 0.2], [0.3, py + 4.55, pc + 0.1], white);
      s.box([1.1, 0.4, pd - 0.5], [0.3, py + 5.0, pc + 0.1], white);
      for (const dx of [-0.5, 0, 0.5]) s.box([0.14, 2.0, 0.1], [0.3 + dx, py + 1.3, pzBack + 0.25], trim);
      s.box([1.2, 1.5, 0.06], [0.3, py + 0.75, pzBack + 0.22], s.material('#35505e')).visible = false;
      clockAt(0.3, py + 3.35, pzBack + 0.27, 0.82);
      flagTop = [0.3, py + 5.2, pc + 0.1];
    } else if (a.pavilion === 'rotunda') {
      s.box([W - 1.2, 1.8, pd - 0.3], [0.3, py + 0.9, pc - 0.1], white);
      s.box([W - 1.0, 0.1, pd - 0.1], [0.3, py + 1.85, pc - 0.1], trim);
      s.box([W - 0.9, 0.1, pd], [0.3, py + 1.95, pc - 0.1], white);
      for (const sx of [-1, 1]) glazing(4.6, 0.8, 0.3 + sx * 5.3, py + 1.05, pzBack - 0.24);
      const dz = pzBack - 0.45, dr = 1.75;
      s.cylinder(dr, dr, 2.5, [0.3, py + 1.25, dz], white, 40);
      const band = glassMap.clone(); band.repeat.x = 5; band.needsUpdate = true;
      s.mesh(new THREE.CylinderGeometry(dr + 0.02, dr + 0.02, 1.2, 40, 1, true), new THREE.MeshStandardMaterial({ map: band, roughness: 0.2, metalness: 0.2 }), [0.3, py + 1.35, dz]);
      s.cylinder(dr + 0.35, dr + 0.35, 0.14, [0.3, py + 2.57, dz], white, 40);
      s.cylinder(dr + 0.37, dr + 0.37, 0.05, [0.3, py + 2.5, dz], trim, 40);
      s.ring(dr + 0.25, 0.025, [0.3, py + 3.25, dz], steel).rotation.x = Math.PI / 2;
      for (let i = 0; i < 14; i++) { const t = (i / 14) * Math.PI * 2; s.rod([0.3 + Math.sin(t) * (dr + 0.25), py + 2.6, dz + Math.cos(t) * (dr + 0.25)], [0.3 + Math.sin(t) * (dr + 0.25), py + 3.25, dz + Math.cos(t) * (dr + 0.25)], 0.018, steel); }
      // Parasols on the sun deck.
      for (let i = 0; i < 2; i++) { const ux = 0.3 + (i ? 0.8 : -0.8); s.rod([ux, py + 2.6, dz - 0.2], [ux, py + 3.9, dz - 0.2], 0.02, steel); s.mesh(new THREE.ConeGeometry(0.7, 0.3, 10), i ? trim : pale, [ux, py + 3.95, dz - 0.2]); }
      const fx = 0.3 + dr + 1.1;
      s.box([0.6, 5.0, 0.6], [fx, py + 2.5, pzBack - 0.2], white);
      s.box([0.72, 0.12, 0.72], [fx, py + 5.06, pzBack - 0.2], trim);
      for (let i = 0; i < 3; i++) s.box([0.62, 0.07, 0.62], [fx, py + 2.4 + i * 0.22, pzBack - 0.2], trim);
      clockAt(fx, py + 4.1, pzBack + 0.13, 0.72);
      flagTop = [fx, py + 5.1, pzBack - 0.2];
    } else {
      s.box([W - 1.2, 2.7, 0.3], [0.3, py + 1.35, -D / 2 + 0.25], white);
      const doors = paint(512, 96, (c) => {
        c.fillStyle = cream ? '#e6dcc2' : '#e4e2d8'; c.fillRect(0, 0, 512, 96);
        for (let i = 0; i < 8; i++) { c.fillStyle = i % 3 === 1 ? '#35505e' : tone.trim; c.fillRect(i * 64 + 14, 22, 36, 74); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(i * 64 + 18, 28, 28, 22); }
      });
      s.mesh(new THREE.PlaneGeometry(W - 1.4, 2.4), new THREE.MeshStandardMaterial({ map: doors, roughness: 0.8 }), [0.3, py + 1.2, -D / 2 + 0.41]);
      const columns = 10;
      for (let i = 0; i < columns; i++) s.box([0.36, 2.7, 0.36], [0.3 - (W - 1.8) / 2 + (i * (W - 1.8)) / (columns - 1), py + 1.35, pzBack - 0.25], white);
      s.box([W - 0.9, 0.28, pd + 0.2], [0.3, py + 2.84, pc], white);
      s.box([W - 0.86, 0.08, pd + 0.24], [0.3, py + 2.74, pc], trim);
      s.box([2.6, 1.9, 0.5], [0.3, py + 3.9, pzBack - 0.15], white);
      s.box([3.4, 0.5, 0.5], [0.3, py + 3.2, pzBack - 0.15], white);
      s.box([1.6, 0.3, 0.4], [0.3, py + 5.0, pzBack - 0.15], white);
      clockAt(0.3, py + 3.95, pzBack + 0.12, 0.8);
      flagTop = [0.3, py + 5.15, pzBack - 0.15];
    }
    // Flagpole and flag.
    s.rod(flagTop, [flagTop[0], flagTop[1] + 1.6, flagTop[2]], 0.03, white);
    const flag = s.mesh(new THREE.PlaneGeometry(1.0, 0.6, 8, 2), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.3 ? tone.trim : '#8f8a80', side: THREE.DoubleSide, roughness: 0.8 }), [flagTop[0] + 0.52, flagTop[1] + 1.25, flagTop[2]]);
    flag.visible = a.state !== 'drained' && !green;

    // Fountain at the shallow end.
    const fx0 = x0 - 1.85, flowing = (a.fountain !== 'dry') && lively;
    const sheet = new THREE.MeshStandardMaterial({ color: '#d5f4f6', transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.1, emissive: '#bfeef0', emissiveIntensity: 0.3 });
    const stone = s.material(cream ? '#efe3c6' : '#f1efe6', { roughness: 0.75 });
    const falls: THREE.Mesh[] = [];
    const still = new THREE.MeshStandardMaterial({ color: green ? '#6f8a3c' : '#7fd8d6', roughness: 0.15 });
    if (a.fountain === 'tiered' || a.fountain === 'dry') {
      const wet = a.fountain === 'tiered' && full && !green;
      s.cylinder(1.25, 1.3, 0.45, [fx0, 0.225, pz], stone, 32);
      if (wet || green) s.cylinder(1.12, 1.12, 0.03, [fx0, 0.45, pz], still, 32);
      else s.cylinder(1.12, 1.12, 0.03, [fx0, 0.44, pz], s.material('#b9b29c'), 32);
      const bowl = (r: number, y: number) => {
        s.lathe([[0.14, 0], [0.2, 0.05], [r * 0.6, 0.16], [r, 0.3], [r, 0.36], [r * 0.9, 0.3], [0, 0.26]], stone, [fx0, y, pz]);
        if (wet) s.cylinder(r * 0.92, r * 0.92, 0.02, [fx0, y + 0.33, pz], still, 28);
      };
      s.cylinder(0.16, 0.22, 0.8, [fx0, 0.8, pz], stone, 14); bowl(0.85, 1.15);
      s.cylinder(0.11, 0.15, 0.6, [fx0, 1.75, pz], stone, 12); bowl(0.5, 2.0);
      s.ball([0.14, 0.2, 0.14], [fx0, 2.5, pz], stone, 12);
      if (flowing) {
        falls.push(s.mesh(new THREE.CylinderGeometry(0.87, 0.95, 1.0, 28, 1, true), sheet, [fx0, 0.98, pz]));
        falls.push(s.mesh(new THREE.CylinderGeometry(0.52, 0.58, 0.55, 24, 1, true), sheet, [fx0, 2.05, pz]));
        falls.push(s.mesh(new THREE.ConeGeometry(0.1, 0.55, 10), sheet, [fx0, 2.9, pz]));
      }
      if (a.fountain === 'dry' || !wet) for (let i = 0; i < 6; i++) s.box([0.04, 0.3 + random() * 0.5, 0.01], [fx0 + (random() - 0.5) * 1.4, 0.9 + random() * 0.4, pz + 0.86], s.material('#8f8a6c')).visible = false;
    } else if (a.fountain === 'stepped') {
      for (let i = 0; i < 4; i++) {
        s.box([0.6, 0.42 * (i + 1), 3.0 - i * 0.5], [x0 - 0.65 - i * 0.6, 0.21 * (i + 1), pz], stone);
        s.box([0.62, 0.05, 3.04 - i * 0.5], [x0 - 0.65 - i * 0.6, 0.42 * (i + 1) - 0.06, pz], trim);
        if (flowing) {
          falls.push(s.box([0.6, 0.02, 1.5 - i * 0.2], [x0 - 0.65 - i * 0.6, 0.42 * (i + 1) + 0.012, pz], sheet));
          falls.push(s.box([0.02, 0.42, 1.5 - i * 0.2], [x0 - 0.34 - i * 0.6, 0.42 * (i + 0.5), pz], sheet));
        }
      }
      s.box([0.5, 0.9, 0.9], [x0 - 2.6, 2.1, pz], stone);
      s.lathe([[0.1, 0], [0.3, 0.1], [0.42, 0.4], [0.3, 0.62], [0.36, 0.7]], stone, [x0 - 2.6, 2.55, pz]);
    } else {
      s.box([0.8, 0.5, 3.4], [x0 - 1.0, 0.25, pz], stone);
      s.box([0.84, 0.06, 3.44], [x0 - 1.0, 0.5, pz], trim);
      for (let i = 0; i < 5; i++) {
        const z = pz - 1.3 + i * 0.65;
        s.cylinder(0.05, 0.07, 0.2, [x0 - 1.0, 0.62, z], steel, 10);
        if (flowing) falls.push(s.tube([[x0 - 1.0, 0.7, z], [x0 - 0.4, 1.55, z], [x0 + 0.5, 1.5, z], [x0 + 1.3, wl + 0.05, z]], 0.035, sheet));
      }
    }
    for (const fall of falls) fall.castShadow = false;

    // Deco lamp standards.
    const globe = new THREE.MeshStandardMaterial({ color: '#fff6dc', emissive: '#ffe9b0', emissiveIntensity: mix(0.2, 1.3, Math.abs(mood.daylight - 0.5) * 2), roughness: 0.3 });
    for (const [lx, lz] of [[-7.6, z0 - 0.45], [7.9, z0 - 0.45], [8.3, 5.9], [-4.0, 6.0]] as const) {
      s.cylinder(0.05, 0.08, 2.6, [lx, 1.3, lz], trim, 10);
      s.cylinder(0.16, 0.16, 0.05, [lx, 0.03, lz], trim, 12);
      s.ball([0.2, 0.2, 0.2], [lx, 2.75, lz], globe, 14).castShadow = false;
    }

    // Poolside dressing.
    const stripes = (p: string, q: string) => paint(64, 64, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? p : q; c.fillRect(i * 8, 0, 8, 64); } });
    const cloths = [stripes(tone.trim, tone.stripe), stripes('#f2b21c', '#fbf5e3'), stripes('#d8382f', '#f8f4e8'), stripes('#2b6fb8', '#f8f4e8')].map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide }));
    for (const cloth of cloths) cloth.color.lerp(new THREE.Color('#a9a294'), mood.wear * 0.4);
    const timber = s.material('#b98b54', { roughness: 0.8 });
    const deckchair = (x: number, y: number, z: number, yaw: number, cloth: THREE.Material) => {
      const chair = new THREE.Group();
      chair.position.set(x, y, z); chair.rotation.y = yaw;
      const part = (mesh: THREE.Mesh) => { chair.add(mesh); return mesh; };
      part(s.box([0.52, 0.9, 0.02], [0, 0.45, -0.1], cloth)).rotation.x = -0.75;
      for (const sx of [-1, 1]) {
        part(s.box([0.03, 1.15, 0.03], [sx * 0.28, 0.45, -0.1], timber)).rotation.x = -0.75;
        part(s.box([0.03, 0.75, 0.03], [sx * 0.3, 0.3, -0.05], timber)).rotation.x = 0.7;
      }
      s.root.add(chair);
    };
    const free: [number, number][] = [];
    for (let i = 0; i < 40; i++) {
      const pick = random();
      free.push(pick < 0.4 ? [mix(-6.5, 6.5, random()), z1 + 0.6 + random() * 0.6] : pick < 0.7 ? [mix(6.3, 8.4, random()), mix(1.0, 5.8, random())] : pick < 0.85 ? [mix(-8.2, -6.3, random()), mix(0.8, 2.6, random())] : [mix(-6.5, 6.5, random()), 5.6 + random() * 0.6]);
    }
    const amount = mix(0.35, 1, mood.density);
    if (a.poolside === 'deckchairs') {
      const row = Math.round(4 + amount * 9);
      for (let i = 0; i < row; i++) {
        const x = -7.2 + (i + 0.5) * (14.6 / row) + (random() - 0.5) * 0.25;
        if (Math.abs(Math.abs(x) - 4.2) < 0.9) continue;
        deckchair(x, 0.6, tz - 0.8, (random() - 0.5) * 0.3, cloths[random() < 0.7 ? 0 : 1 + Math.floor(random() * 3)]);
      }
      for (let i = 0; i < Math.round(amount * 5); i++) deckchair(6.5 + (i % 2) * 1.1 + random() * 0.3, 0, 1.3 + Math.floor(i / 2) * 1.5 + random() * 0.3, -1.2 + (random() - 0.5) * 0.4, cloths[0]);
    } else if (a.poolside === 'towels') {
      const n = Math.round(6 + amount * 14);
      for (let i = 0; i < n; i++) {
        const [x, z] = free[i];
        const towel = s.box([0.75, 0.02, 1.5], [x, 0.012, z], cloths[Math.floor(random() * 4)]);
        towel.rotation.y = random() * 3; towel.castShadow = false;
        if (random() < 0.6) s.box([0.3, 0.22, 0.2], [x + 0.3, 0.11, z + 0.2], s.material(['#c9483a', '#2b6fb8', '#e8b23a', '#5a7a4a'][Math.floor(random() * 4)], { roughness: 0.9 })).rotation.y = random() * 3;
      }
      for (let i = 0; i < Math.round(amount * 6); i++) {
        const x = -7 + random() * 14;
        if (Math.abs(Math.abs(x) - 4.2) < 0.9) continue;
        s.box([1.3, 0.02, 0.5], [x, 0.61, tz - 0.8], cloths[Math.floor(random() * 4)]).castShadow = false;
      }
    } else if (a.poolside === 'stacked') {
      for (let k = 0; k < 2; k++) {
        const sx = 6.9 + k * 1.0, sz = 2.2 + k * 1.6;
        const high = Math.round(4 + amount * 8);
        for (let i = 0; i < high; i++) { const chair = s.box([0.6, 0.06, 1.25], [sx + (random() - 0.5) * 0.05, 0.04 + i * 0.07, sz + (random() - 0.5) * 0.05], i % 2 ? timber : cloths[0]); chair.rotation.y = 0.3 + (random() - 0.5) * 0.06; }
      }
      s.cylinder(0.04, 0.04, 1.0, [7.9, 0.5, 2.6], steel, 8);
      s.tube([[7.9, 0.8, 2.6], [7.5, 0.35, 2.5], [7.1, 0.5, 2.3], [6.9, 0.3, 2.2]], 0.015, s.material('#6f777b', { metalness: 0.6 }));
      s.cylinder(0.17, 0.14, 0.3, [6.6, 0.15, 5.0], s.material('#e8b23a'), 14);
      s.rod([6.6, 0.3, 5.0], [6.9, 1.45, 5.3], 0.018, timber);
    }

    // State dressing.
    const bobbers: { mesh: THREE.Object3D; y: number; phase: number }[] = [];
    if (a.state === 'high-summer') {
      const skin = ['#e8b48c', '#c98d62', '#8a5a3c', '#f0c7a8'];
      const caps = ['#f4f1e8', '#d8382f', '#f2c21c', '#2b6fb8', '#1c1c20'];
      const n = Math.round(3 + mood.density * 11);
      for (let i = 0; i < n; i++) {
        const x = mix(x0 + 0.5, x1 - 0.5, random()), z = mix(z0 + 0.4, z1 - 0.4, random());
        if (Math.hypot(x - 1.9, z - pz) < 1.3 || Math.hypot(x + 2.6, z - pz + 0.2) < 1.2) continue;
        const head = new THREE.Group();
        head.position.set(x, wl, z);
        const face = s.ball([0.11, 0.12, 0.11], [0, 0.07, 0], s.material(skin[Math.floor(random() * 4)], { roughness: 0.7 }), 10);
        const cap = s.ball([0.118, 0.1, 0.118], [0, 0.11, -0.012], s.material(caps[Math.floor(random() * 5)], { roughness: 0.4 }), 10);
        const ringlet = s.cylinder(0.24, 0.24, 0.004, [0, 0.008, 0], new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false }), 16);
        ringlet.castShadow = false;
        head.add(face, cap, ringlet);
        if (random() < 0.4) { const arm = s.rod([0.1, 0.02, 0], [0.26, 0.3, 0.05], 0.035, face.material as THREE.Material); head.add(arm); }
        s.root.add(head);
        bobbers.push({ mesh: head, y: wl, phase: random() * 6 });
      }
      const ballMap = paint(64, 16, (c) => { ['#d8382f', '#f8f4e8', '#f2c21c', '#f8f4e8', '#2b6fb8', '#f8f4e8'].forEach((col, i) => { c.fillStyle = col; c.fillRect(i * 10.7, 0, 11, 16); }); });
      const beachBall = s.mesh(new THREE.SphereGeometry(0.28, 18, 12), new THREE.MeshStandardMaterial({ map: ballMap, roughness: 0.3 }), [4.3, wl + 0.2, z0 + 0.9]);
      bobbers.push({ mesh: beachBall, y: wl + 0.2, phase: 1 });
    } else if (a.state === 'gala') {
      const spots: { at: readonly [number, number, number]; size: number; color: string }[] = [];
      for (let lane = 1; lane < lanes; lane++) {
        const z = z0 + (lane * PW) / lanes;
        for (let i = 0; i < 70; i++) spots.push({ at: [x0 + 0.15 + i * ((PL - 0.3) / 69), wl + 0.03, z], size: 0.075, color: i < 6 || i > 63 ? '#d8382f' : Math.floor(i / 3) % 2 ? '#f8f4e8' : lane % 2 ? '#2b6fb8' : '#d8382f' });
      }
      s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.4 }), spots);
      for (let lane = 0; lane < lanes; lane++) {
        const z = z0 + ((lane + 0.5) * PW) / lanes;
        s.box([0.5, 0.35, 0.5], [x1 + 0.45, 0.24, z], white).rotation.z = 0.12;
        s.label(String(lane + 1), 0.3, 0.3, [x1 + 0.19, 0.24, z], '#ffffff', tone.trim).rotation.y = -Math.PI / 2;
      }
    } else if (a.state === 'dawn-still') {
      const cover = s.material('#2f6fb0', { roughness: 0.7 });
      const cx = x0 + PL * 0.36;
      s.box([PL * 0.36, 0.03, PW - 0.04], [x0 + PL * 0.18, wl + 0.03, pz], cover);
      s.cylinder(0.28, 0.28, PW + 0.3, [cx, 0.42, pz], cover, 20).rotation.x = Math.PI / 2;
      for (const sz of [-1, 1]) { s.box([0.5, 0.45, 0.08], [cx, 0.22, pz + sz * (PW / 2 + 0.25)], steel); s.cylinder(0.1, 0.1, 0.06, [cx, 0.06, pz + sz * (PW / 2 + 0.32)], s.material('#25282b'), 12).rotation.x = Math.PI / 2; }
      s.rod([2.5, 0.03, z1 + 0.75], [5.6, 0.03, z1 + 1.05], 0.018, steel);
      s.box([0.4, 0.03, 0.3], [5.75, 0.02, z1 + 1.07], s.material('#2f6fb0')).rotation.y = -0.1;
    } else if (green) {
      const cone = s.mesh(new THREE.ConeGeometry(0.2, 0.55, 12), s.material('#e8651c'), [3.3, wl + 0.1, z0 + 1.0]);
      cone.rotation.z = 1.2;
      const plank = s.box([1.6, 0.05, 0.22], [-1.2, wl + 0.02, z1 - 0.9], s.material('#7a6a4c'));
      plank.rotation.y = 0.5;
      bobbers.push({ mesh: cone, y: wl + 0.1, phase: 0 }, { mesh: plank, y: wl + 0.02, phase: 2 });
      for (let i = 0; i < 4; i++) { const tyre = s.ring(0.3, 0.1, [x0 + 1.5 + random() * 8, wl, z0 + 0.5 + random() * 3], s.material('#1d1f22')); tyre.rotation.x = Math.PI / 2 + (random() - 0.5) * 0.3; if (i > 0) tyre.visible = random() < 0.4; }
    }
    // Bunting when the place is in a good mood.
    if ((a.state === 'gala' || (a.state === 'high-summer' && mood.cheer > 0.55))) {
      const tints = [tone.trim, '#f8f4e8', '#f2c21c', '#d8382f'];
      const flags: { p: THREE.Vector3; yaw: number; c: string }[] = [];
      for (const fz of [z0 - 0.5, z1 + 0.6]) {
        for (const px of [-7.0, 7.0]) { s.cylinder(0.035, 0.05, 3.0, [px, 1.5, fz], white, 8); }
        const line = new THREE.CatmullRomCurve3([new THREE.Vector3(-7, 3.0, fz), new THREE.Vector3(-3.5, 2.45, fz), new THREE.Vector3(0, 2.3, fz), new THREE.Vector3(3.5, 2.45, fz), new THREE.Vector3(7, 3.0, fz)]);
        s.mesh(new THREE.TubeGeometry(line, 30, 0.01, 4), white).castShadow = false;
        for (let i = 1; i < 34; i++) flags.push({ p: line.getPointAt(i / 34), yaw: 0, c: tints[i % 4] });
      }
      const tri = new THREE.Shape(); tri.moveTo(-0.15, 0); tri.lineTo(0.15, 0); tri.lineTo(0, -0.36); tri.lineTo(-0.15, 0);
      const pennants = new THREE.InstancedMesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), flags.length);
      const m = new THREE.Matrix4();
      flags.forEach((f, i) => { pennants.setMatrixAt(i, m.makeRotationX((random() - 0.5) * 0.5).setPosition(f.p)); pennants.setColorAt(i, new THREE.Color(f.c)); });
      pennants.castShadow = true;
      s.root.add(pennants);
    }
    // Weeds through the joints.
    const weeds = Math.round(Math.max(0, dirty - 0.3) * 110);
    if (weeds > 0) {
      s.scatter(new THREE.ConeGeometry(0.6, 1.6, 5), s.material('#6f8a4a', { roughness: 0.95 }), Array.from({ length: weeds }, () => {
        const x = Math.round(mix(-W / 2 + 1, W / 2 - 0.5, random())), z = mix(z1 + 0.6, D / 2 - 0.3, random());
        return { at: [x + (random() - 0.5) * 0.08, 0.08, z] as const, size: 0.06 + random() * 0.1 };
      }));
    }

    const speed = mix(0.2, 1.3, mood.energy) * (a.state === 'dawn-still' ? 0.15 : 1);
    world.update = (_dt, time) => {
      if (ripples) ripples.offset.set(time * 0.012 * speed, Math.sin(time * 0.3) * 0.02);
      for (const bob of bobbers) { bob.mesh.position.y = bob.y + Math.sin(time * 1.8 * speed + bob.phase) * 0.03; }
      falls.forEach((fall, i) => { (fall.material as THREE.MeshStandardMaterial).opacity = 0.5 + Math.sin(time * 5 * speed + i) * 0.08; });
      flag.rotation.y = Math.sin(time * 1.5 * speed) * 0.25;
    };
    return world;
  },
});
