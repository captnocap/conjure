import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, paint, paintHex } from '@conjure/kit';

type P3 = [number, number, number];

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

// The face in its own plane: x across (-5.6..5.6), y up (0..12). The mouth is a notch from the ground.
const FW = 5.4, FH = 6, MOUTH = 3.1, LIP = 4.2;
const outline = () => {
  const pts: THREE.Vector2[] = [];
  for (let k = 0; k <= 96; k++) {
    const t = -Math.PI / 2 + (k / 96) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const x = FW * Math.sign(c) * Math.abs(c) ** 0.8;
    const y = Math.max(0, FH + FH * Math.sign(s) * Math.abs(s) ** (s < 0 ? 0.55 : 0.9));
    pts.push(new THREE.Vector2(x, y));
  }
  return pts;
};
const lipY = (x: number) => LIP - 0.75 * (1 - (x / MOUTH) ** 2);

export default defineThing({
  questions: {
    era: choice('Which version of the face is it?', {
      thirties: 'The 1935 original: a leering, slightly sinister face with narrow eyes, heavy brows and a mouthful of teeth.',
      fifties: 'The 1950s face: big round innocent eyes with lashes and a sweet painted smile.',
      seventies: 'The cheeky 1970s pop-art face: psychedelic rays, a wink and a huge toothy grin.',
      restored: 'The 1995 restored face of today: wide eyes glancing sideways, thick wild brows, red lips and a crown of flame-coloured rays.',
    }),
    state: choice('What state is the park in?', {
      open: 'Open on a summer night: bulbs chasing up the towers and around the rays, people streaming in through the mouth.',
      closed: 'Closed and boarded up after the park shut: planks across the mouth, the bulbs dead.',
      fresh: 'Freshly repainted for a reopening: glossy colours, every bulb new.',
      flaking: 'Flaking and sun-bleached: paint peeling off the plaster in patches, a few bulbs out.',
    }),
    faceColour: paint('What colour is the face painted?', ['yellow', 'amber', 'orange', 'red', 'pink', 'cream', 'turquoise']),
    mouth: choice('What waits inside the open mouth?', {
      dark: 'Nothing but a dark tunnel and the turnstiles, swallowing the light.',
      balloon: 'A small child standing in the mouth holding a red balloon.',
      ride: 'The arm of a big thrill ride swinging up behind the face, glimpsed through the mouth and over the crown.',
      queue: 'A short queue of people at the turnstiles inside the mouth.',
    }),
    gaze: choice('Where are the eyes looking?', {
      ahead: 'Straight at you.',
      side: 'Sideways, sly, as if sharing a joke.',
      up: 'Rolled up toward the sky.',
      crossed: 'Comically cross-eyed.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.3) / 0.7));
    const closed = a.state === 'closed';
    const flaking = a.state === 'flaking' || (closed && mood.wear > 0.4);
    const fresh = a.state === 'fresh';
    const era = a.era;
    const faceHex = new THREE.Color(paintHex(a.faceColour)).lerp(new THREE.Color('#d8cdb4'), (flaking ? 0.35 : 0) + mood.wear * 0.15);
    const rayColours = era === 'seventies' ? ['#d6198a', '#2ec4c4', '#f4d40c', '#7b2fa8', '#ee7a12'] : era === 'thirties' ? ['#a4471e', '#d9b56a'] : era === 'fifties' ? ['#f4a3c0', '#7ec3ef', '#f4d40c'] : ['#c8102e', '#ee7a12', '#f4d40c'];

    // ----- the painted face on a bevelled plaster relief -----
    const W = 512, H = 560;
    const X = (x: number) => (x / 11.2 + 0.5) * W, Y = (y: number) => H - (y / 12.2) * H;
    const faceMap = canvasTexture(W, H, (c) => {
      c.fillStyle = faceHex.getStyle(); c.fillRect(0, 0, W, H);
      // Shading toward the rim gives the moon its roundness.
      const g = c.createRadialGradient(X(0), Y(6.5), 40, X(0), Y(6), W * 0.55);
      g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(120,60,20,0.28)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // Cheeks.
      c.fillStyle = era === 'thirties' ? 'rgba(160,60,40,0.35)' : 'rgba(230,60,80,0.55)';
      for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(X(sx * 3.9), Y(5.2), 44, 34, 0, 0, Math.PI * 2); c.fill(); }
      // Painted lips around the mouth, the grin running up into the cheeks.
      c.strokeStyle = era === 'thirties' ? '#6e1a14' : '#c8102e'; c.lineWidth = 26; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(X(-MOUTH - 0.9), Y(LIP + 0.5));
      for (let k = 0; k <= 20; k++) { const x = -MOUTH + (k / 20) * MOUTH * 2; c.lineTo(X(x), Y(lipY(x) + 0.15)); }
      c.lineTo(X(MOUTH + 0.9), Y(LIP + 0.5));
      c.stroke();
      // Eye sockets painted dark around the relief eyes.
      c.fillStyle = era === 'thirties' ? 'rgba(40,20,10,0.55)' : 'rgba(40,40,60,0.25)';
      for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(X(sx * 2.15), Y(7.6), 62, era === 'thirties' ? 40 : 70, 0, 0, Math.PI * 2); c.fill(); }
      if (era === 'seventies') {
        c.fillStyle = 'rgba(46,196,196,0.6)';
        for (let k = 0; k < 18; k++) { c.beginPath(); c.arc(X(-4 + random() * 8), Y(9.5 + random() * 2), 6 + random() * 8, 0, Math.PI * 2); c.fill(); }
      }
      // Flaking: patches of bare grey plaster.
      if (flaking) for (let k = 0; k < 60 + mood.wear * 80; k++) {
        c.fillStyle = random() < 0.5 ? 'rgba(190,184,170,0.9)' : 'rgba(150,142,128,0.8)';
        c.beginPath();
        const cx = random() * W, cy = random() * H, r = 4 + random() * 22;
        for (let q = 0; q < 7; q++) { const t = q / 7 * Math.PI * 2; c.lineTo(cx + Math.cos(t) * r * (0.5 + random()), cy + Math.sin(t) * r * (0.5 + random())); }
        c.fill();
      }
      if (closed) {
        c.fillStyle = 'rgba(30,30,30,0.85)'; c.font = 'bold 34px sans-serif';
        c.fillText('KEEP OUT', X(-4.6), Y(1.2));
      }
    });
    faceMap.repeat.set(1 / 11.2, 1 / 12.2);
    faceMap.offset.set(0.5, 0);
    const pts = outline();
    const shape = new THREE.Shape();
    shape.moveTo(MOUTH, 0);
    const right = pts.filter((p) => !(Math.abs(p.x) < MOUTH + 0.05 && p.y < 0.5));
    // Walk from the bottom right round the top to the bottom left.
    const startIdx = right.findIndex((p) => p.x > 0);
    for (let k = 0; k < right.length; k++) { const p = right[(startIdx + k) % right.length]; shape.lineTo(p.x, p.y); }
    shape.lineTo(-MOUTH, 0);
    for (let k = 0; k <= 20; k++) { const x = -MOUTH + (k / 20) * MOUTH * 2; shape.lineTo(x, lipY(x)); }
    shape.lineTo(MOUTH, 0);
    const faceGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: true, bevelThickness: 0.45, bevelSize: 0.35, bevelSegments: 3, curveSegments: 6 });
    const faceMat = s.material('#ffffff', { map: faceMap, roughness: fresh ? 0.35 : 0.8 });
    const plaster = s.material(faceHex.clone().multiplyScalar(0.8), { roughness: 0.85 });
    s.mesh(faceGeo, [faceMat, plaster] as unknown as THREE.Material);

    const front = 1.65;
    // Eyes in relief: whites, irises and pupils turned by the gaze.
    const white = s.material('#f6f3ea', { roughness: fresh ? 0.3 : 0.6 });
    const irisMat = s.material(era === 'thirties' ? '#3a2a1a' : era === 'fifties' ? '#1f5fd1' : '#2a6a3a');
    const pupilMat = s.material('#111214');
    const look = { ahead: [0, 0], side: [0.45, 0], up: [0, 0.5], crossed: [0, 0] }[a.gaze];
    for (const sx of [-1, 1]) {
      const ex = sx * 2.15, ey = 7.6;
      const narrow = era === 'thirties' ? 0.55 : 1;
      const wink = era === 'seventies' && sx === 1;
      if (wink) { s.tube([[ex - 1.1, ey + 0.1, front + 0.2], [ex, ey - 0.4, front + 0.35], [ex + 1.1, ey + 0.1, front + 0.2]], 0.16, pupilMat); continue; }
      s.ball([1.15, 1.45 * narrow, 0.45], [ex, ey, front], white, 24);
      const dx = a.gaze === 'crossed' ? -sx * 0.4 : look[0], dy = look[1] * narrow;
      const iris = s.cylinder(0.55 * Math.min(1, narrow + 0.2), 0.55 * Math.min(1, narrow + 0.2), 0.1, [ex + dx, ey + dy - 0.1, front + 0.42], irisMat, 20);
      iris.rotation.x = Math.PI / 2;
      const pupil = s.cylinder(0.26, 0.26, 0.1, [ex + dx, ey + dy - 0.1, front + 0.5], pupilMat, 16);
      pupil.rotation.x = Math.PI / 2;
      if (era === 'fifties') for (let k = 0; k < 5; k++) { const t = 0.4 + k * 0.55; s.rod([ex + Math.cos(t) * 1.1, ey + Math.sin(t) * 1.35, front + 0.2], [ex + Math.cos(t) * 1.5, ey + Math.sin(t) * 1.8, front + 0.2], 0.05, pupilMat); }
    }
    // Wild eyebrows: arched, angled by era.
    for (const sx of [-1, 1]) {
      const inner = era === 'thirties' ? 8.5 : 9.2, outer = era === 'thirties' ? 9.6 : era === 'restored' ? 10.0 : 9.3, mid = era === 'thirties' ? 9.5 : 10.1;
      s.tube([[sx * 0.9, inner, front], [sx * 1.9, mid, front + 0.15], [sx * 3.1, outer, front]], era === 'fifties' ? 0.14 : 0.3, pupilMat);
    }
    s.ball([0.75, 0.95, 0.75], [0, 5.5, front + 0.1], s.material(faceHex.clone().lerp(new THREE.Color('#c8102e'), era === 'thirties' ? 0.2 : 0.45)), 18);

    // The upper lip and its teeth.
    const lip: P3[] = [];
    for (let k = 0; k <= 12; k++) { const x = -MOUTH + (k / 12) * MOUTH * 2; lip.push([x, lipY(x) - 0.05, front - 0.1]); }
    s.tube(lip, 0.2, s.material(era === 'thirties' ? '#6e1a14' : '#c8102e', { roughness: 0.5 }));
    const teeth = era === 'fifties' ? 0 : era === 'thirties' ? 12 : 8;
    for (let k = 0; k < teeth; k++) {
      const x = -MOUTH + 0.35 + (k + 0.5) * (MOUTH * 2 - 0.7) / teeth;
      const h = era === 'thirties' ? 0.6 + random() * 0.25 : 0.55;
      s.box([(MOUTH * 2 - 0.9) / teeth * 0.86, h, 0.3], [x, lipY(x) - h / 2 - 0.12, front - 0.25], white);
    }

    // ----- the crown of rays behind the face -----
    const rays = 15;
    const bulbs: { at: P3; base: THREE.Color }[] = [];
    for (let k = 0; k < rays; k++) {
      const t = 0.12 * Math.PI + (k / (rays - 1)) * 0.76 * Math.PI;
      const ray = new THREE.Shape();
      const r0 = 4.2, r1 = era === 'seventies' ? 8.6 + (k % 2) * 1.2 : 7.8 + (k % 2) * 0.8, half = era === 'thirties' ? 0.1 : 0.13;
      ray.moveTo(Math.cos(t - half) * r0, Math.sin(t - half) * r0);
      ray.lineTo(Math.cos(t) * r1, Math.sin(t) * r1);
      ray.lineTo(Math.cos(t + half) * r0, Math.sin(t + half) * r0);
      ray.closePath();
      const mesh = s.mesh(new THREE.ExtrudeGeometry(ray, { depth: 0.5, bevelEnabled: false }), s.material(rayColours[k % rayColours.length], { roughness: fresh ? 0.35 : 0.7 }), [0, FH + 0.4, -0.3]);
      void mesh;
      bulbs.push({ at: [Math.cos(t) * (r1 + 0.25), FH + 0.4 + Math.sin(t) * (r1 + 0.25), 0.3], base: new THREE.Color('#fff2c4') });
      for (let q = 1; q < 4; q++) { const r = r0 + (r1 - r0) * (q / 4); bulbs.push({ at: [Math.cos(t) * r, FH + 0.4 + Math.sin(t) * r, 0.3], base: new THREE.Color('#ffd27a') }); }
    }

    // ----- two Art Deco towers striped with bulbs -----
    const towerCream = s.material(fresh ? '#f4ecd6' : '#e2d6bb', { roughness: 0.7 });
    const towerTrim = s.material(era === 'seventies' ? '#d6198a' : era === 'thirties' ? '#2f6a5a' : '#c8102e', { roughness: 0.55 });
    for (const sx of [-1, 1]) {
      const x = sx * 8.4;
      const tiers: [number, number, number][] = [[3.2, 0, 7], [2.6, 7, 14], [2.1, 14, 19.5], [1.5, 19.5, 22.5]];
      for (const [w, y0, y1] of tiers) {
        s.box([w, y1 - y0, w], [x, (y0 + y1) / 2, 0], towerCream);
        s.box([w + 0.3, 0.45, w + 0.3], [x, y1 - 0.2, 0], towerTrim);
        // Flutes on the front.
        for (const f of [-1, 0, 1]) s.box([0.12, y1 - y0 - 0.8, 0.12], [x + f * w * 0.3, (y0 + y1) / 2, w / 2 + 0.05], towerTrim);
        for (const f of [-1, 1]) for (let y = y0 + 0.6; y < y1 - 0.5; y += 0.55) bulbs.push({ at: [x + f * w * 0.5, y, w / 2 + 0.1], base: new THREE.Color('#fff2c4') });
      }
      s.cylinder(0.25, 0.6, 2.4, [x, 23.7, 0], towerTrim, 10);
      s.ball([0.5, 0.5, 0.5], [x, 25.1, 0], towerTrim, 12);
      // LUNA and PARK in tall letters down the towers.
      const word = sx < 0 ? 'LUNA' : 'PARK';
      const sign = canvasTexture(64, 256, (c) => {
        c.fillStyle = closed ? '#5a554c' : '#1b2a55'; c.fillRect(0, 0, 64, 256);
        c.fillStyle = closed ? '#9a9488' : '#fff3c6'; c.font = 'bold 54px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (let k = 0; k < 4; k++) c.fillText(word[k], 32, 34 + k * 62);
      });
      s.mesh(new THREE.PlaneGeometry(1.5, 6), new THREE.MeshStandardMaterial({ map: sign, emissive: '#ffffff', emissiveMap: sign, emissiveIntensity: closed ? 0 : mix(0.15, 1, night), roughness: 0.6 }), [x, 10.5, 1.32]);
      // A low wall from tower to face.
      s.box([2.8, 2.4, 0.8], [sx * 5.9, 1.2, 0.2], towerCream);
    }
    // Bulbs around the face rim.
    for (let k = 0; k < pts.length; k += 3) { const p = pts[k]; if (p.y < 1.2) continue; bulbs.push({ at: [p.x * 1.04, p.y * 1.0 + 0.1, 0.9], base: new THREE.Color('#fff2c4') }); }

    const bulbMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6), bulbMat, bulbs.length);
    const m = new THREE.Matrix4();
    const dead = closed ? 1 : a.state === 'flaking' ? 0.25 : 0;
    const off = new THREE.Color('#6d6a62');
    const alive = bulbs.map(() => random() >= dead);
    const glow = closed ? 0 : mix(0.75, 1, night);
    bulbs.forEach((b, k) => { m.makeTranslation(...b.at); bulbMesh.setMatrixAt(k, m); bulbMesh.setColorAt(k, alive[k] ? b.base.clone().multiplyScalar(glow).lerp(off, 1 - glow) : off); });
    bulbMesh.instanceMatrix.needsUpdate = true;
    s.root.add(bulbMesh);

    // ----- inside the mouth: a dark tunnel and turnstiles -----
    const dark = s.material('#1c1a1f', { roughness: 0.95 });
    s.box([MOUTH * 2 + 0.2, 0.3, 4], [0, LIP + 0.2, -1.6], dark);
    for (const sx of [-1, 1]) s.box([0.3, LIP + 0.3, 4], [sx * (MOUTH + 0.1), (LIP + 0.3) / 2, -1.6], dark);
    if (a.mouth !== 'ride') s.box([MOUTH * 2 + 0.6, LIP + 0.4, 0.3], [0, (LIP + 0.4) / 2, -3.5], dark);
    const chrome = s.material('#c9ccd1', { metalness: 0.7, roughness: 0.3 });
    for (const x of [-1.4, 0, 1.4]) {
      s.cylinder(0.12, 0.15, 1, [x, 0.5, -1.2], chrome, 10);
      for (let k = 0; k < 3; k++) { const t = k / 3 * Math.PI * 2; s.rod([x, 0.9, -1.2], [x + Math.cos(t) * 0.5, 0.9, -1.2 + Math.sin(t) * 0.5], 0.03, chrome); }
    }
    const figures: { update(dt: number, time: number): void }[] = [];
    const skin = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0'];
    if (a.mouth === 'balloon') {
      const child = figure(s, { height: 1.05, pose: 'standing', style: 'doll', hair: 'short', top: '#f4d40c', bottom: '#1f5fd1', skin: skin[Math.floor(random() * 4)], gaze: 'up' });
      s.root.add(child.root);
      child.root.position.set(0.4, 0, 0.2);
      const hand = new THREE.Vector3(0.62, 0.9, 0.35);
      child.reach('right', hand, { space: s.root });
      s.rod([0.62, 0.9, 0.35], [0.9, 2.9, 0.5], 0.01, s.material('#eeeeee'));
      s.ball([0.32, 0.38, 0.32], [0.9, 3.25, 0.5], s.material('#c8102e', { roughness: 0.25 }), 16);
      figures.push(child);
    }
    if (a.mouth === 'queue' || a.state === 'open') {
      const n = a.mouth === 'queue' ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const p = figure(s, { height: 1.6 + random() * 0.25, pose: 'walking', style: 'doll', hair: (['short', 'long', 'cap', 'bun'] as const)[k % 4], top: ['#c8102e', '#7ec3ef', '#f4f2ec', '#2f9e44'][k % 4], bottom: '#34363a', skin: skin[Math.floor(random() * 4)], mirror: k % 2 === 0 });
        s.root.add(p.root);
        p.root.position.set(a.mouth === 'queue' ? -1.2 + k * 1.1 : (k ? 1.8 : -2.4), 0, a.mouth === 'queue' ? 0.4 : 2.2 + k * 0.8);
        p.root.rotation.y = a.mouth === 'queue' ? Math.PI : Math.PI + (random() - 0.5) * 0.4;
        figures.push(p);
      }
    }
    let arm: THREE.Group | null = null;
    if (a.mouth === 'ride') {
      const steel = s.material('#7d8a96', { metalness: 0.5, roughness: 0.4 });
      s.box([1.2, 13, 1.2], [3, 6.5, -8], steel);
      arm = new THREE.Group();
      arm.position.set(3, 13, -8);
      s.root.add(arm);
      const beam = s.box([0.8, 16, 0.8], [0, 0, 0], steel);
      s.root.remove(beam); arm.add(beam);
      const car = s.box([3.2, 1.6, 2], [0, -8.4, 0], s.material(rayColours[0], { roughness: 0.4 }));
      s.root.remove(car); arm.add(car);
      arm.rotation.z = 0.9;
    }
    // Boards across the mouth when the park is shut.
    if (closed) {
      const wood = s.material('#8a6a48', { roughness: 0.9 });
      for (let k = 0; k < 6; k++) {
        const plank = s.box([MOUTH * 2 + 0.6, 0.35, 0.1], [0, 0.5 + k * 0.6, front - 0.3], wood);
        plank.rotation.z = (random() - 0.5) * 0.25;
      }
    }

    const energy = 0.2 + mood.energy;
    const scratch = new THREE.Color();
    return s.finish({
      update: (dt, time) => {
        for (const f of figures) f.update(dt, time);
        if (arm) arm.rotation.z = 0.9 * Math.sin(time * 0.6 * energy);
        if (closed) return;
        const phase = Math.floor(time * 6 * energy);
        bulbs.forEach((b, k) => {
          if (!alive[k]) return;
          const on = (k + phase) % 3 !== 0;
          bulbMesh.setColorAt(k, scratch.copy(b.base).multiplyScalar(on ? glow : glow * 0.45));
        });
        if (bulbMesh.instanceColor) bulbMesh.instanceColor.needsUpdate = true;
      },
    });
  },
});
