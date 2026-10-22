import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat = false) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const SIGNS = {
  adults: { text: 'ADULTS ONLY', paper: '#f6f2e4', ink: '#c4161c', font: '900 {}px sans-serif' },
  staff: { text: 'STAFF ONLY', paper: '#3a2a20', ink: '#f2ead8', font: '700 {}px sans-serif' },
  id: { text: '18+ ID REQUIRED', paper: '#f6d21a', ink: '#141414', font: '900 {}px monospace' },
  private: { text: 'PRIVATE', paper: '#b8923a', ink: '#2a1c0a', font: '700 {}px serif' },
  kitchen: { text: 'KITCHEN', paper: '#f4f6f6', ink: '#1c3f8a', font: '700 {}px sans-serif' },
  readings: { text: '✦ READINGS ✦', paper: '#3a1c5a', ink: '#f2d06a', font: 'italic 700 {}px serif' },
  none: { text: '', paper: '#000000', ink: '#000000', font: '' },
} as const;
const LIGHTS = { red: '#ff2436', warm: '#ffb054', tv: '#6ab4ff', green: '#9cf07c', violet: '#b46aff', dark: '#1a1614' } as const;

export default defineThing({
  questions: {
    curtain: choice('What hangs in the doorway?', {
      wood: 'Strings of round wooden beads in browns and amber.',
      jewel: 'Strings of bright plastic jewel beads in every colour.',
      bamboo: 'A painted bamboo curtain whose strands together make a picture of a palm at sunset.',
      saloon: 'A pair of louvred saloon doors at waist height.',
      strips: 'Heavy clear plastic strips, as on a cold room or a kitchen.',
      velvet: 'Velvet drapes held back by gold cords.',
    }),
    sign: choice('What does the sign over the doorway say?', {
      adults: 'ADULTS ONLY, red letters on a white card.',
      staff: 'STAFF ONLY, an engraved brown plate.',
      id: '18+ ID REQUIRED, black on warning yellow.',
      private: 'PRIVATE, a small brass plate.',
      kitchen: 'KITCHEN, blue on white enamel.',
      readings: 'READINGS, gold on purple with stars.',
      none: 'There is no sign at all.',
    }),
    light: choice('What light leaks through from the room behind?', {
      red: 'A sleazy red glow.',
      warm: 'Warm tungsten lamplight.',
      tv: 'The cold blue flicker of a television.',
      green: 'Sickly green fluorescent light.',
      violet: 'Violet, with something like candle shimmer.',
      dark: 'None: the room behind is dark.',
    }),
    wall: choice('What is the wall around it?', {
      plaster: 'Painted plaster, plain.',
      panel: 'Dark wood panelling.',
      paper: 'Striped wallpaper gone a little yellow.',
      brick: 'Bare brick.',
      tile: 'White tile to the ceiling.',
    }),
    state: choice('What has just happened at the doorway?', {
      still: 'Nothing: the curtain hangs straight and still.',
      passed: 'Someone has just gone through and it is still swinging apart.',
      broken: 'It is damaged: strands missing or a door off its hinge, pieces on the floor.',
      barred: 'A chain hangs across it with a handwritten KEEP OUT tag.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 1.7, HW = 2.5, T = 0.14, ow = 0.45, oh = 2.05;
    const glowColour = new THREE.Color(LIGHTS[a.light]);
    const lit = a.light !== 'dark';

    // Wall with a planar-mapped finish.
    const wallTexture = paint(256, 256, (ctx) => {
      const warm = mood.warmth;
      if (a.wall === 'plaster') { ctx.fillStyle = `hsl(${mix(200, 38, warm)},${mix(16, 34, mood.cheer)}%,${mix(62, 74, mood.cheer)}%)`; ctx.fillRect(0, 0, 256, 256); }
      if (a.wall === 'panel') { ctx.fillStyle = '#5c3d26'; ctx.fillRect(0, 0, 256, 256); for (let x = 0; x < 256; x += 32) { ctx.fillStyle = '#3d2716'; ctx.fillRect(x, 0, 3, 256); ctx.fillStyle = 'rgba(255,220,170,0.08)'; ctx.fillRect(x + 3, 0, 4, 256); } }
      if (a.wall === 'paper') { ctx.fillStyle = '#d9c9a0'; ctx.fillRect(0, 0, 256, 256); for (let x = 0; x < 256; x += 64) { ctx.fillStyle = '#8a3a3a'; ctx.fillRect(x + 8, 0, 20, 256); ctx.fillStyle = '#b89a4a'; ctx.fillRect(x + 40, 0, 5, 256); } }
      if (a.wall === 'brick') { ctx.fillStyle = '#b3ab9c'; ctx.fillRect(0, 0, 256, 256); for (let r = 0; r < 12; r++) for (let col = -1; col < 4; col++) { const t = 105 + random() * 50; ctx.fillStyle = `rgb(${t + 38},${t * 0.55},${t * 0.42})`; ctx.fillRect(col * 64 + (r % 2) * 32 + 2, r * 21.33 + 2, 60, 17.5); } }
      if (a.wall === 'tile') { ctx.fillStyle = '#b9bdb8'; ctx.fillRect(0, 0, 256, 256); for (let r = 0; r < 4; r++) for (let col = 0; col < 4; col++) { ctx.fillStyle = `hsl(60,8%,${88 + random() * 6}%)`; ctx.fillRect(col * 64 + 2, r * 64 + 2, 60, 60); } }
      ctx.fillStyle = `rgba(60,48,34,${mood.wear * 0.25})`;
      for (let i = 0; i < mood.wear * 30; i++) ctx.fillRect(random() * 256, random() * 256, 4 + random() * 30, 2 + random() * 8);
    }, true);
    const wallM = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: a.wall === 'tile' ? 0.3 : 0.9 });
    const tile = a.wall === 'brick' ? 0.9 : a.wall === 'tile' ? 0.6 : 0.8;
    const slab = (size: [number, number, number], at: [number, number, number]) => {
      const geometry = new THREE.BoxGeometry(...size);
      const p = geometry.getAttribute('position'), uv = geometry.getAttribute('uv'), n = geometry.getAttribute('normal');
      for (let i = 0; i < p.count; i++) uv.setXY(i, (Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) : p.getX(i) + at[0]) / tile, (p.getY(i) + at[1]) / tile);
      return s.mesh(geometry, wallM, at);
    };
    const sideW = W / 2 - ow;
    slab([sideW, HW, T], [-(ow + sideW / 2), HW / 2, 0]);
    slab([sideW, HW, T], [ow + sideW / 2, HW / 2, 0]);
    slab([ow * 2, HW - oh, T], [0, oh + (HW - oh) / 2, 0]);
    const trimTone = a.wall === 'panel' ? '#2e1c10' : a.wall === 'tile' ? '#8a9296' : mood.cheer > 0.5 ? '#f1ead8' : '#4a3a2c';
    const trim = s.material(trimTone, { roughness: 0.6 });
    for (const x of [-1, 1]) s.box([0.08, oh + 0.04, T + 0.05], [x * (ow + 0.04), (oh + 0.04) / 2, 0], trim);
    s.box([ow * 2 + 0.24, 0.09, T + 0.07], [0, oh + 0.045, 0], trim);
    for (const x of [-1, 1]) s.box([sideW - 0.08, 0.11, T + 0.03], [x * (ow + 0.08 + (sideW - 0.08) / 2), 0.055, 0], trim);
    s.box([ow * 2, 0.012, T + 0.06], [0, 0.006, 0], s.material('#8a7a5a', { metalness: 0.5 }));

    // The room behind: a stub of corridor, glowing.
    const shell = s.material('#2a2622', { roughness: 0.95 });
    const depth = 0.4, zb = -T / 2 - depth;
    s.box([ow * 2 + 0.16, oh + 0.04, 0.04], [0, (oh + 0.04) / 2, zb - 0.02], shell);
    for (const x of [-1, 1]) s.box([0.04, oh + 0.04, depth], [x * (ow + 0.06), (oh + 0.04) / 2, zb + depth / 2], shell);
    s.box([ow * 2 + 0.16, 0.04, depth], [0, oh + 0.04, zb + depth / 2], shell);
    const glowTexture = paint(64, 128, (ctx) => {
      const g = ctx.createRadialGradient(32, 78, 2, 32, 78, 80);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#d0d0d0'); g.addColorStop(1, '#3a3a3a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 128);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      // The suggestion of shelving or a lamp inside.
      for (let i = 0; i < 4; i++) ctx.fillRect(6 + random() * 8, 22 + i * 22, 20 + random() * 26, 3);
    });
    const glowM = new THREE.MeshBasicMaterial({ map: glowTexture, color: lit ? glowColour.clone().multiplyScalar(mix(0.75, 1.15, mood.cheer * 0.5 + 0.5)) : new THREE.Color('#2a2420') });
    s.mesh(new THREE.PlaneGeometry(ow * 2 + 0.08, oh + 0.04), glowM, [0, (oh + 0.04) / 2, zb + 0.001]);
    const wash = new THREE.MeshBasicMaterial({ color: lit ? glowColour.clone().multiplyScalar(0.55) : new THREE.Color('#1a1614') });
    for (const x of [-1, 1]) { const side = s.mesh(new THREE.PlaneGeometry(depth, oh + 0.04), wash, [x * (ow + 0.039), (oh + 0.04) / 2, zb + depth / 2]); side.rotation.y = -x * Math.PI / 2; }
    const floorIn = s.mesh(new THREE.PlaneGeometry(ow * 2 + 0.08, depth), wash, [0, 0.003, zb + depth / 2]);
    floorIn.rotation.x = -Math.PI / 2;
    if (lit) {
      const fade = paint(64, 64, (ctx) => {
        const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
      });
      const pool = s.mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: glowColour, map: fade, transparent: true, opacity: 0.5, depthWrite: false }), [0, 0.004, T / 2 + 0.3]);
      pool.rotation.x = -Math.PI / 2;
      pool.scale.set(ow * 1.2, 0.5, 1);
      pool.castShadow = false;
    }

    // Sign.
    const sign = SIGNS[a.sign];
    if (a.sign !== 'none') {
      const sw = Math.min(0.95, 0.075 * sign.text.length + 0.2), sh = 0.2;
      const texture = paint(512, Math.round(512 * sh / sw), (ctx) => {
        const h = Math.round(512 * sh / sw);
        ctx.fillStyle = sign.paper; ctx.fillRect(0, 0, 512, h);
        ctx.strokeStyle = sign.ink; ctx.lineWidth = 6; ctx.strokeRect(8, 8, 496, h - 16);
        ctx.fillStyle = sign.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = sign.font.replace('{}', String(Math.min(h * 0.6, 720 / sign.text.length)));
        ctx.fillText(sign.text, 256, h / 2 + 2, 470);
      });
      const board = s.box([sw + 0.03, sh + 0.03, 0.02], [0, oh + 0.09 + (HW - oh - 0.09) / 2, T / 2 + 0.011], s.material(sign.paper, { metalness: a.sign === 'private' ? 0.7 : 0 }));
      const face = s.mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: 0.12 }), [0, board.position.y, T / 2 + 0.0225]);
      board.rotation.z = face.rotation.z = (random() - 0.5) * 0.14 * mood.wear;
    }

    // Curtains.
    const swingers: { node: THREE.Object3D; axis: 'x' | 'y' | 'z'; rest: number; amp: number; rate: number; phase: number }[] = [];
    const loose: { at: [number, number, number]; size: number; color: string }[] = [];
    const energy = mix(0.012, 0.075, mood.energy) * (a.state === 'passed' ? 3.2 : 1);
    const beadKinds = a.curtain === 'wood' || a.curtain === 'jewel' || a.curtain === 'bamboo';
    if (beadKinds) {
      const strings = a.curtain === 'bamboo' ? 30 : 21;
      const step = a.curtain === 'bamboo' ? 0.06 : a.curtain === 'jewel' ? 0.04 : 0.046;
      const palette = a.curtain === 'wood' ? ['#6a3f20', '#9a6230', '#c98a3a', '#3d2412', '#e0b060'] : ['#ff3f8a', '#28c8e8', '#ffd21a', '#8a4af0', '#3fe07a', '#ff7a1a'];
      const beadGeometry = a.curtain === 'bamboo' ? new THREE.CylinderGeometry(0.0125, 0.0125, 0.052, 6) : new THREE.SphereGeometry(a.curtain === 'jewel' ? 0.015 : 0.018, 7, 5);
      const beadMaterial = s.material('#ffffff', { roughness: a.curtain === 'jewel' ? 0.15 : 0.55, emissive: '#ffffff', emissiveIntensity: a.curtain === 'jewel' ? 0.12 : 0 });
      const thread = s.material('#2a2018');
      const picture = (u: number, v: number) => {
        // v runs 0 at the floor to 1 at the rail.
        const sun = Math.hypot(u - 0.56, (v - 0.5) * 2.2) < 0.2;
        const trunk = Math.abs(u - (0.24 + (v - 0.2) * 0.12)) < 0.035 && v > 0.2 && v < 0.74;
        const frond = v > 0.66 && v < 0.86 && Math.abs(u - 0.3) < 0.26 && Math.abs((v - 0.76) * 3 - Math.sin(u * 22) * 0.18) < 0.22;
        if (trunk || frond) return '#1a1410';
        if (v < 0.2) return '#c9a23a';
        if (v < 0.36) return (Math.floor(v * 60) % 2) ? '#1c6a9a' : '#2a8ac0';
        if (sun) return '#ffe04a';
        return v > 0.72 ? '#d8366a' : v > 0.52 ? '#f0683a' : '#f6a03a';
      };
      for (let i = 0; i < strings; i++) {
        const u = i / (strings - 1);
        const x = mix(-ow + 0.03, ow - 0.03, u);
        const gone = a.state === 'broken' && random() < 0.34;
        const length = gone ? 0.15 + random() * 0.7 : oh - 0.1 - random() * (a.curtain === 'bamboo' ? 0.02 : 0.14);
        const g = new THREE.Group();
        g.position.set(x, oh - 0.01, 0.01 + (i % 2) * 0.012);
        g.add(s.cylinder(0.0018, 0.0018, length, [0, -length / 2, 0], thread, 4));
        const count = Math.floor(length / step);
        const beads = new THREE.InstancedMesh(beadGeometry, beadMaterial, count);
        const m = new THREE.Matrix4();
        let tone = Math.floor(random() * palette.length);
        for (let k = 0; k < count; k++) {
          const y = -0.03 - k * step;
          m.makeTranslation(0, y, 0);
          beads.setMatrixAt(k, m);
          if (a.curtain === 'wood' && random() < 0.5) tone = (tone + 1) % palette.length;
          if (a.curtain === 'jewel') tone = (k + i * 2) % palette.length;
          beads.setColorAt(k, new THREE.Color(a.curtain === 'bamboo' ? picture(u, 1 + y / (oh - 0.1)) : palette[tone]));
        }
        beads.castShadow = true;
        g.add(beads);
        s.root.add(g);
        const part = a.state === 'passed' ? Math.sign(u - 0.5 || 1) * Math.max(0, 0.22 - Math.abs(u - 0.5) * 0.5) : 0;
        g.rotation.z = part + (random() - 0.5) * 0.02;
        g.rotation.x = (random() - 0.5) * 0.03;
        swingers.push({ node: g, axis: 'x', rest: g.rotation.x, amp: energy * mix(0.6, 1.2, random()), rate: 1.9 + random() * 0.5, phase: random() * 6.3 });
        swingers.push({ node: g, axis: 'z', rest: g.rotation.z, amp: energy * 0.5 * mix(0.6, 1.2, random()), rate: 1.7 + random() * 0.5, phase: u * 4 });
        if (gone) for (let k = 0; k < 5; k++) loose.push({ at: [x + (random() - 0.5) * 0.5, 0.018, T / 2 + 0.1 + random() * 0.55], size: 1, color: a.curtain === 'bamboo' ? picture(u, random()) : palette[Math.floor(random() * palette.length)] });
      }
      if (loose.length) {
        const geometry = beadGeometry.clone();
        if (a.curtain === 'bamboo') geometry.rotateZ(Math.PI / 2);
        s.scatter(geometry, beadMaterial, loose);
      }
      s.rod([-ow, oh - 0.012, 0.016], [ow, oh - 0.012, 0.016], 0.012, s.material('#3a2a1c'));
    } else if (a.curtain === 'saloon') {
      const wood = s.material(mood.warmth > 0.5 ? '#9a5f2e' : '#6e4a30', { roughness: 0.65 });
      for (const dir of [-1, 1]) {
        const g = new THREE.Group();
        g.position.set(dir * (ow - 0.01), 0.62, 0.02);
        const w = ow - 0.03;
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.lineTo(w, 0.06); shape.lineTo(w, 0.72);
        shape.quadraticCurveTo(w * 0.55, 0.82, w * 0.3, 0.96); shape.quadraticCurveTo(w * 0.1, 1.02, 0, 0.98); shape.closePath();
        const hole = new THREE.Path();
        hole.moveTo(0.06, 0.1); hole.lineTo(w - 0.06, 0.14); hole.lineTo(w - 0.06, 0.66); hole.lineTo(0.06, 0.82); hole.closePath();
        shape.holes.push(hole);
        const frame = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false }), wood, [0, 0, -0.015]);
        const leaf = new THREE.Group();
        leaf.add(frame);
        for (let k = 0; k < 9; k++) { const slat = s.box([w - 0.1, 0.012, 0.045], [w / 2, 0.16 + k * 0.066, 0], wood); slat.rotation.x = 0.7; leaf.add(slat); }
        leaf.scale.x = -dir;
        g.add(leaf);
        for (const y of [0.12, 0.8]) g.add(s.cylinder(0.014, 0.014, 0.09, [0, y, 0], s.material('#b8923a', { metalness: 0.8, roughness: 0.3 }), 10));
        s.root.add(g);
        const off = a.state === 'broken' && dir === 1;
        g.rotation.y = a.state === 'passed' ? -dir * (0.5 + random() * 0.4) : (random() - 0.5) * 0.12;
        if (off) { g.rotation.z = -0.5; g.position.y -= 0.22; g.rotation.y = 0.5; }
        else swingers.push({ node: g, axis: 'y', rest: a.state === 'passed' ? 0 : g.rotation.y, amp: (a.state === 'passed' ? 0.6 : mix(0.01, 0.16, mood.energy)), rate: 2.6, phase: dir });
      }
      if (a.state === 'broken') { s.box([0.07, 0.012, 0.3], [0.2, 0.006, T / 2 + 0.3], wood).rotation.y = 0.7; s.box([0.05, 0.012, 0.22], [-0.1, 0.006, T / 2 + 0.42], wood).rotation.y = -0.4; }
    } else if (a.curtain === 'strips') {
      const pvc = new THREE.MeshPhysicalMaterial({ color: mood.wear > 0.5 ? '#e6e2a8' : '#dff2f4', transparent: true, opacity: mix(0.42, 0.7, mood.wear), roughness: 0.2, side: THREE.DoubleSide });
      const n = 8;
      for (let i = 0; i < n; i++) {
        if (a.state === 'broken' && (i === 3 || i === 4)) { const fallen = s.box([0.14, 0.004, 0.9], [mix(-0.2, 0.3, random()), 0.004, T / 2 + 0.5], pvc); fallen.rotation.y = random() - 0.5; continue; }
        const g = new THREE.Group();
        const x = mix(-ow + 0.07, ow - 0.07, i / (n - 1));
        g.position.set(x, oh - 0.02, 0.012 + (i % 2) * 0.012);
        const length = oh - 0.06;
        g.add(s.box([0.15, length, 0.004], [0, -length / 2, 0], pvc));
        s.root.add(g);
        g.rotation.z = a.state === 'passed' ? Math.sign(i - 3.5) * Math.max(0, 0.16 - Math.abs(i - 3.5) * 0.04) : 0;
        g.rotation.x = a.state === 'passed' ? -0.12 * random() : 0;
        swingers.push({ node: g, axis: 'x', rest: g.rotation.x, amp: energy * 0.7, rate: 1.6 + random() * 0.4, phase: i * 0.9 });
      }
      s.box([ow * 2, 0.05, 0.03], [0, oh - 0.025, 0.02], s.material('#b9bfc2', { metalness: 0.8, roughness: 0.3 }));
    } else {
      const tone = a.light === 'violet' ? '#4a1c6a' : mood.warmth > 0.3 ? '#8a1424' : '#1f2f6a';
      const velvet = s.material(tone, { roughness: 0.95 });
      const gold = s.material('#d8a83a', { metalness: 0.6, roughness: 0.4 });
      for (const dir of [-1, 1]) {
        const tied = !(a.state === 'passed' && dir === 1) && !(a.state === 'broken' && dir === -1);
        const folds = 7;
        for (let k = 0; k < folds; k++) {
          const top = dir * mix(0.03, ow - 0.03, k / (folds - 1));
          const wob = (random() - 0.5) * 0.02;
          if (tied) s.tube([[top, oh - 0.04, 0.03], [dir * mix(0.2, ow - 0.04, k / (folds - 1)), 1.55, 0.035 + wob], [dir * (ow - 0.07 - (k % 3) * 0.022), 1.08, 0.04 + (k % 2) * 0.02], [dir * (ow - 0.05 - k * 0.022), 0.5, 0.04 + wob], [dir * (ow - 0.03 - k * 0.03), 0.03, 0.04]], 0.04, velvet);
          else s.tube([[top, oh - 0.04, 0.03], [top + wob, 1.2, 0.04 + wob], [top - wob, 0.03, 0.035]], 0.042, velvet);
        }
        if (tied) { const cord = s.ring(0.075, 0.012, [dir * (ow - 0.08), 1.08, 0.045], gold); cord.rotation.x = Math.PI / 2; s.ball([0.02, 0.05, 0.02], [dir * (ow - 0.02), 0.98, 0.1], gold, 10); }
      }
      if (a.state === 'broken') { s.tube([[-0.3, 0.02, 0.3], [-0.1, 0.025, 0.42], [0.1, 0.02, 0.33], [0.2, 0.02, 0.5]], 0.012, gold); }
      s.rod([-ow - 0.06, oh - 0.03, 0.035], [ow + 0.06, oh - 0.03, 0.035], 0.016, gold);
      for (const x of [-1, 1]) s.ball([0.03, 0.03, 0.03], [x * (ow + 0.07), oh - 0.03, 0.035], gold, 12);
    }

    if (a.state === 'barred') {
      const chain = s.material('#9aa0a4', { metalness: 0.85, roughness: 0.35 });
      const points: [number, number, number][] = [];
      for (let i = 0; i <= 10; i++) { const t = i / 10; points.push([mix(-ow - 0.02, ow + 0.02, t), 1.0 - Math.sin(t * Math.PI) * 0.16, T / 2 + 0.05]); }
      s.tube(points, 0.011, chain);
      for (const x of [-1, 1]) s.ring(0.022, 0.006, [x * (ow + 0.03), 1.0, T / 2 + 0.04], chain);
      const tag = s.label('KEEP OUT', 0.3, 0.13, [0.03, 0.76, T / 2 + 0.065], '#b3261e', '#f4eccc');
      tag.rotation.z = (random() - 0.5) * 0.25;
    }

    const flicker = a.light === 'tv' ? 0.45 : a.light === 'violet' ? 0.15 : a.light === 'green' ? mood.wear * 0.3 : 0;
    const baseGlow = glowM.color.clone();
    const decay = a.state === 'passed' ? 0.25 : 0;
    return s.finish({
      footprint: 0.85,
      update(_dt, time) {
        for (const sw of swingers) sw.node.rotation[sw.axis] = sw.rest + Math.sin(time * sw.rate + sw.phase) * sw.amp * (decay ? Math.max(0.3, Math.exp(-((time % 9) * decay))) : 1);
        if (flicker) glowM.color.copy(baseGlow).multiplyScalar(1 - flicker * (0.5 + 0.5 * Math.sin(time * 9.1) * Math.sin(time * 23.7 + 1.3)));
      },
    });
  },
});
