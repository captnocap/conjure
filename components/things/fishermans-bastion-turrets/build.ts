import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, paint, paintHex, paintIsMetal } from '@conjure/kit';

type P = [number, number, number];

class Batch {
  readonly list: { m: THREE.Matrix4; c?: THREE.Color }[] = [];
  constructor(readonly geometry: THREE.BufferGeometry, readonly material: THREE.Material) {}
  add(at: P, scale: P, turn = 0, colour?: THREE.ColorRepresentation) {
    this.list.push({
      m: new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, 0)), new THREE.Vector3(...scale)),
      c: colour === undefined ? undefined : new THREE.Color(colour),
    });
  }
  flush(s: Sculpture, shadow = true) {
    if (!this.list.length) { this.geometry.dispose(); return null; }
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.list.length);
    this.list.forEach(({ m, c }, index) => { mesh.setMatrixAt(index, m); if (c) mesh.setColorAt(index, c); });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    s.root.add(mesh);
    return mesh;
  }
}

/** A wall pierced by a row of round-headed arches, bottom centre at the origin, its depth along z. */
function arcade(length: number, height: number, count: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-length / 2, 0); shape.lineTo(length / 2, 0); shape.lineTo(length / 2, height); shape.lineTo(-length / 2, height); shape.closePath();
  const bay = length / count, w = bay * 0.62, spring = height * 0.55;
  for (let i = 0; i < count; i++) {
    const cx = -length / 2 + bay * (i + 0.5);
    const hole = new THREE.Path();
    hole.moveTo(cx - w / 2, height * 0.1); hole.lineTo(cx - w / 2, spring); hole.absarc(cx, spring, w / 2, Math.PI, 0, true); hole.lineTo(cx + w / 2, height * 0.1); hole.closePath();
    shape.holes.push(hole);
  }
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -depth / 2);
}

/** A small round-headed opening, as a flat solid for instancing. */
function archSlot() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0); shape.lineTo(-0.5, 0.6); shape.absarc(0, 0.6, 0.5, Math.PI, 0, true); shape.lineTo(0.5, 0); shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -0.5);
}

export default defineThing({
  questions: {
    stretch: choice('Which stretch of the bastion is it?', {
      single: 'A single turret beside a short run of arcade, its broad stair coming up in front.',
      three: 'The great main tower between two smaller turrets, arcades on either side.',
      row: 'The full row of seven turrets of different heights stepping along the hill.',
    }),
    people: choice('Who is on the bastion?', {
      none: 'Nobody: the terrace empty, white stone and silence.',
      tourists: 'Tourists leaning in every arch, phones held out over the view.',
      busker: 'A violin busker playing in one arch, a few people stopped to listen.',
      wedding: 'A wedding party posing on the stair: a bride in white, a groom, a photographer crouched.',
    }),
    caps: paint('What are the turret caps clad in?', ['charcoal', 'grey', 'black', 'navy', 'forest', 'teal', 'copper', 'rust', 'gold']),
    lamps: choice('Are the arcade lamps lit?', {
      lit: 'Warm lanterns glowing in every arch.',
      dark: 'The lanterns hang dark.',
    }),
    snow: choice('What lies on the caps and terrace?', {
      clear: 'Nothing: clean dry stone.',
      snow: 'Fresh snow on the conical caps, the merlons and the steps.',
      leaves: 'Fallen autumn leaves drifted against the walls.',
    }),
    keepsake: choice('What has been left along the parapet?', {
      nothing: 'Nothing: bare stone.',
      locks: 'A cluster of love padlocks on the railing.',
      roses: 'A scatter of red rose petals from a proposal.',
      candles: 'A row of small candles burning on the parapet.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const white = new THREE.Color('#f1ede3').lerp(new THREE.Color('#8a8578'), mood.wear * 0.5);
    const stone = s.material(white, { roughness: 0.85 });
    const shade = s.material(white.clone().multiplyScalar(0.68), { roughness: 0.9 });
    const capColour = new THREE.Color(paintHex(a.caps, '#34363a')).lerp(new THREE.Color('#5a5a58'), mood.wear * 0.2);
    const cap = s.material(a.snow === 'snow' ? capColour.clone().lerp(new THREE.Color('#f4f4f0'), 0.35) : capColour, { roughness: 0.55, metalness: paintIsMetal(a.caps) ? 0.7 : 0.15 });
    const dark = s.material('#2e2b28', { roughness: 0.8 });
    const glow = new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#ffb648', emissiveIntensity: mix(1, 2.2, lowSun), roughness: 0.5 });
    const grass = s.material(a.snow === 'snow' ? '#e9ece8' : a.snow === 'leaves' ? '#8a7a3e' : '#6f8a4e', { roughness: 0.95 });
    const snowy = a.snow === 'snow';
    const snow = s.material('#f6f6f2', { roughness: 0.95 });

    const merlons = new Batch(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), stone);
    const slots = new Batch(archSlot(), dark);
    const lamps = new Batch(new THREE.SphereGeometry(0.32, 8, 6), a.lamps === 'lit' ? glow : s.material('#6a645a'));
    const people = new Batch(new THREE.CapsuleGeometry(0.28, 1.05, 2, 5).translate(0, 0.8, 0), s.material('#ffffff', { roughness: 0.9 }));
    const tones = ['#3a3a42', '#6a4a36', '#8a2a2a', '#2c3d55', '#6b6b62', '#c9b27a', '#d9573f', '#4d6a9c'];

    // Layout: wall segments (x range and top height) with turrets at the joints.
    type Seg = { x0: number; x1: number; top: number };
    type Tower = { x: number; z: number; r: number; h: number };
    let segs: Seg[], towers: Tower[], stairX: number, stairW: number;
    const FOOT = 6; // the wall stands on the hill shoulder; the slope runs down in front
    if (a.stretch === 'single') {
      segs = [{ x0: -16, x1: -3.6, top: FOOT + 11 }, { x0: 3.6, x1: 18, top: FOOT + 9 }];
      towers = [{ x: 0, z: 1, r: 3.8, h: FOOT + 16 }];
      stairX = 9; stairW = 8;
    } else if (a.stretch === 'three') {
      segs = [{ x0: -40, x1: -21, top: FOOT + 11 }, { x0: -18, x1: -6, top: FOOT + 12 }, { x0: 6, x1: 18, top: FOOT + 12 }, { x0: 21, x1: 40, top: FOOT + 9 }];
      towers = [{ x: -19.5, z: 1, r: 3.4, h: FOOT + 19 }, { x: 0, z: 2, r: 6, h: FOOT + 24 }, { x: 19.5, z: 1, r: 3.4, h: FOOT + 17 }];
      stairX = 29; stairW = 12;
    } else {
      const tops = [16, 15, 14, 14, 12, 11, 9, 8];
      const xs = [-66, -48, -30, -12, 6, 24, 42, 58];
      segs = xs.slice(0, -1).map((x, i) => ({ x0: x + 2.8, x1: xs[i + 1] - 2.8, top: FOOT + tops[i] }));
      const heights = [22, 18, 26, 31, 21, 17, 14, 0];
      towers = xs.slice(0, 7).map((x, i) => ({ x: x + 0, z: 1 + (i % 2), r: i === 3 ? 5.6 : 3 + random() * 0.8, h: FOOT + heights[i] }));
      towers.push({ x: xs[7], z: 1, r: 3, h: FOOT + 13 });
      towers.splice(7, 1);
      segs[segs.length - 1].x1 = 66;
      stairX = -3; stairW = 14;
    }
    const xMin = Math.min(...segs.map((g) => g.x0)) - 6, xMax = Math.max(...segs.map((g) => g.x1)) + 6;

    // The hill shoulder and its slope in front, scrub on it.
    const slopeDepth = 26;
    const hill = new THREE.Shape(); hill.moveTo(-8, 0); hill.lineTo(slopeDepth, 0); hill.lineTo(0, FOOT); hill.lineTo(-8, FOOT); hill.closePath();
    s.mesh(new THREE.ExtrudeGeometry(hill, { depth: xMax - xMin, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(xMax, 0, 0), grass);
    s.box([xMax - xMin, FOOT, 16], [(xMin + xMax) / 2, FOOT / 2, -16], grass);
    const shrubs = new Batch(new THREE.IcosahedronGeometry(1, 0), s.material(a.snow === 'leaves' ? '#a8642a' : '#4e6a3a', { roughness: 0.95 }));
    for (let i = 0; i < 26; i++) {
      const z = 4 + random() * (slopeDepth - 8), x = xMin + random() * (xMax - xMin);
      if (Math.abs(x - stairX) < stairW / 2 + 2) continue;
      shrubs.add([x, FOOT * (1 - z / slopeDepth) + 0.8, z], [1.6 + random() * 1.6, 1.4 + random(), 1.6 + random() * 1.6]);
    }
    shrubs.flush(s);

    // Wall segments: a solid lower wall, an open arcade gallery, a crenellated parapet, the terrace behind.
    const DEPTH = 4;
    const galleries: { x: number; y: number; z: number }[] = [];
    for (const g of segs) {
      const length = g.x1 - g.x0, cx = (g.x0 + g.x1) / 2;
      const galleryH = Math.min(7, (g.top - FOOT) * 0.6);
      const floorY = g.top - galleryH;
      s.box([length, floorY - FOOT, DEPTH + 2], [cx, (floorY + FOOT) / 2, 0], stone);
      s.box([length + 0.4, 0.6, DEPTH + 2.4], [cx, floorY + 0.3, 0.2], stone);
      const count = Math.max(2, Math.round(length / 3.4));
      s.mesh(arcade(length, galleryH, count, 0.9), stone, [cx, floorY, DEPTH / 2 + 0.6]);
      s.box([length, galleryH, 0.6], [cx, floorY + galleryH / 2, -DEPTH / 2], shade);
      s.box([length, 0.5, DEPTH + 1.6], [cx, g.top - 0.25, 0], stone);
      // Paved terrace on top, merlons along the front edge.
      s.box([length, 0.3, 14], [cx, g.top + 0.15, -7], s.material(white.clone().multiplyScalar(0.9)));
      for (let x = g.x0 + 0.8; x < g.x1 - 0.4; x += 1.8) {
        merlons.add([x, g.top, DEPTH / 2 + 0.3], [0.9, 1.2, 0.7]);
        if (snowy) merlons.add([x, g.top + 1.2, DEPTH / 2 + 0.3], [0.95, 0.18, 0.75]);
      }
      const bay = length / count;
      for (let i = 0; i < count; i++) {
        const x = g.x0 + bay * (i + 0.5);
        galleries.push({ x, y: floorY, z: DEPTH / 2 - 0.4 });
        lamps.add([x, floorY + galleryH * 0.78, DEPTH / 2 - 0.6], [1, 1.3, 1]);
      }
      // Small arched windows in the lower wall.
      if (floorY - FOOT > 4) for (let x = g.x0 + 3; x < g.x1 - 2; x += 6) slots.add([x, FOOT + (floorY - FOOT) * 0.35, DEPTH / 2 + 1.05], [1.2, 1.6, 0.2]);
    }

    // Turrets: round towers with a corbelled band, a ring of arched lookouts and a pointed cap.
    for (const t of towers) {
      s.cylinder(t.r, t.r * 1.06, t.h - FOOT, [t.x, (t.h + FOOT) / 2, t.z], stone, 20);
      s.cylinder(t.r + 0.45, t.r + 0.1, 1, [t.x, t.h - 4.6, t.z], stone, 20);
      s.cylinder(t.r + 0.4, t.r + 0.4, 0.6, [t.x, t.h + 0.1, t.z], stone, 20);
      const lookouts = t.r > 5 ? 10 : 6;
      for (let i = 0; i < lookouts; i++) {
        const angle = (i / lookouts) * Math.PI * 2 + 0.3;
        slots.add([t.x + Math.sin(angle) * (t.r + 0.02), t.h - 3.9, t.z + Math.cos(angle) * (t.r + 0.02)], [t.r * 0.42, 1.9, 0.3], angle);
      }
      if (t.r > 5) for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        slots.add([t.x + Math.sin(angle) * (t.r * 1.06 + 0.02), FOOT + (t.h - FOOT) * 0.45, t.z + Math.cos(angle) * (t.r * 1.06 + 0.02)], [1, 2, 0.3], angle);
      }
      const rise = t.r * (t.r > 5 ? 2.3 : 2.1);
      s.lathe([[t.r + 0.7, 0], [t.r + 0.2, rise * 0.12], [t.r * 0.7, rise * 0.4], [t.r * 0.34, rise * 0.72], [0.1, rise]], cap, [t.x, t.h + 0.4, t.z]);
      if (snowy) s.lathe([[t.r + 0.75, 0], [t.r + 0.25, rise * 0.1], [t.r * 0.62, rise * 0.3], [0, rise * 0.31]].map(([r, y]) => [r, y] as [number, number]), snow, [t.x, t.h + 0.45, t.z]).scale.set(1, 1, 1);
      s.ball([0.35, 0.35, 0.35], [t.x, t.h + 0.4 + rise + 0.2, t.z], cap, 8);
    }

    // The broad staircase climbing the slope to the gallery level.
    const target = segs.reduce((best, g) => (Math.abs((g.x0 + g.x1) / 2 - stairX) < Math.abs((best.x0 + best.x1) / 2 - stairX) ? g : best), segs[0]);
    const landing = target.top - Math.min(7, (target.top - FOOT) * 0.6);
    const stairSteps = 18;
    for (let k = 0; k < stairSteps; k++) {
      const z = slopeDepth - 1 - k * ((slopeDepth - DEPTH / 2 - 2) / stairSteps);
      const y = mix(0.4, landing, (k + 1) / stairSteps);
      s.box([stairW, y, 1.6], [stairX, y / 2, z], k % 2 ? stone : s.material(white.clone().multiplyScalar(0.94)));
      if (snowy && k % 3 === 0) s.box([stairW, 0.12, 1.4], [stairX, y + 0.06, z], snow);
    }
    for (const side of [-1, 1]) s.rod([stairX + side * (stairW / 2), 1.6, slopeDepth - 1], [stairX + side * (stairW / 2), landing + 1.2, DEPTH / 2 + 2.5], 0.35, stone);
    const stairAt = (t: number): P => [stairX, mix(0.4, landing, t), mix(slopeDepth - 1, DEPTH / 2 + 2.5, t)];

    // People.
    if (a.people === 'tourists') {
      for (const g of galleries) if (random() < 0.7) people.add([g.x + (random() - 0.5) * 0.8, g.y + 0.6, g.z + 0.6], [1, 1, 1], 0, tones[Math.floor(random() * tones.length)]);
      for (let i = 0; i < 26; i++) { const [x, y, z] = stairAt(random()); people.add([x + (random() - 0.5) * stairW * 0.8, y, z], [1, 1, 1], 0, tones[i % tones.length]); }
      for (let i = 0; i < 30; i++) people.add([xMin + 6 + random() * (xMax - xMin - 12), segs[0].top + 0.3, -4 - random() * 8], [1, 1, 1], 0, tones[i % tones.length]);
    }
    const figures: { update(dt: number, time: number): void }[] = [];
    if (a.people === 'busker') {
      const g = galleries[Math.floor(galleries.length / 2)];
      const player = figure(s, { height: 1.75, pose: 'standing', style: 'doll', hair: 'hat', top: '#2b2b33', bottom: '#2b2b33', shoes: '#1d1d1f', skin: '#d9b08c', gaze: 'down' });
      s.root.add(player.root);
      player.root.position.set(g.x, g.y + 0.6, g.z + 0.3);
      const violin = s.ball([0.12, 0.2, 0.05], [g.x + 0.15, g.y + 0.6 + 1.38, g.z + 0.55], s.material('#a9743f'), 10);
      violin.rotation.z = 1.2;
      s.rod([g.x - 0.3, g.y + 0.6 + 1.5, g.z + 0.6], [g.x + 0.35, g.y + 0.6 + 1.2, g.z + 0.7], 0.012, dark);
      figures.push(player);
      for (let i = 0; i < 7; i++) people.add([g.x + (random() - 0.5) * 7, g.y + 0.6, g.z + 1.6 + random() * 2], [1, 1, 1], 0, tones[i % tones.length]);
      s.box([0.8, 0.12, 0.35], [g.x + 0.8, g.y + 0.66, g.z + 0.9], s.material('#4a2a1a'));
    }
    if (a.people === 'wedding') {
      const [x, y, z] = stairAt(0.55);
      const bride = figure(s, { height: 1.66, pose: 'standing', style: 'doll', hair: 'bun', top: '#f6f4ee', bottom: '#f6f4ee', shoes: '#f6f4ee', skin: '#e8c2a0', gaze: 'right' });
      const groom = figure(s, { height: 1.82, pose: 'standing', style: 'doll', hair: 'short', top: '#23252b', bottom: '#23252b', shoes: '#111214', skin: '#c99a74', gaze: 'left' });
      const photographer = figure(s, { height: 1.75, pose: 'crouching', style: 'doll', hair: 'cap', top: '#5a6a52', bottom: '#3a3a3a', shoes: '#2a2a2a', skin: '#b5805a', gaze: 'ahead' });
      for (const f of [bride, groom, photographer]) s.root.add(f.root);
      bride.root.position.set(x - 0.5, y, z);
      groom.root.position.set(x + 0.5, y, z);
      const [, py, pz] = stairAt(0.3);
      photographer.root.position.set(x, py, pz);
      photographer.root.rotation.y = Math.PI;
      s.lathe([[0.62, 0], [0.5, 0.5], [0.22, 1.0], [0, 1.02]], s.material('#f6f4ee', { roughness: 0.9 }), [x - 0.5, y, z]);
      s.box([0.2, 0.14, 0.14], [x, py + 1.05, pz - 0.35], dark);
      figures.push(bride, groom, photographer);
      for (let i = 0; i < 10; i++) { const [gx, gy, gz] = stairAt(0.7 + random() * 0.3); people.add([gx + (random() - 0.5) * stairW * 0.8, gy, gz], [1, 1, 1], 0, ['#c93a6a', '#2b4f8a', '#e3b530', '#3a3a42', '#9fb0c0'][i % 5]); }
    }

    // What was left along the parapet.
    const front = DEPTH / 2 + 0.3;
    if (a.keepsake === 'locks') {
      const g = segs[Math.floor(segs.length / 2)];
      s.rod([g.x0 + 1, g.top + 1.6, front + 0.8], [g.x1 - 1, g.top + 1.6, front + 0.8], 0.05, dark);
      const locks = new Batch(new THREE.BoxGeometry(0.12, 0.14, 0.05), s.material('#c9a23a', { metalness: 0.7, roughness: 0.35 }));
      for (let i = 0; i < 120; i++) locks.add([g.x0 + 2 + random() * (g.x1 - g.x0 - 4), g.top + 1.45 - random() * 0.15, front + 0.8], [1, 1, 1], 0, ['#c9a23a', '#c8102e', '#1f5fd1', '#c9ccd1', '#2f9e44'][i % 5]);
      locks.flush(s);
    }
    if (a.keepsake === 'roses') {
      const petals = new Batch(new THREE.SphereGeometry(0.1, 5, 3), s.material('#b0182a', { roughness: 0.7 }));
      for (let i = 0; i < 160; i++) { const [x, y, z] = stairAt(0.6 + random() * 0.4); petals.add([x + (random() - 0.5) * stairW, y + 0.03, z + (random() - 0.5) * 1.2], [1, 0.3, 1]); }
      petals.flush(s);
    }
    if (a.keepsake === 'candles') {
      const g = segs[Math.floor(segs.length / 2)];
      const wax = new Batch(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 6).translate(0, 0.15, 0), s.material('#efe8d4'));
      const flame = new Batch(new THREE.SphereGeometry(0.07, 5, 4), glow);
      for (let x = g.x0 + 1.7; x < g.x1 - 1; x += 1.8) { wax.add([x, g.top + 1.2, front], [1, 1, 1]); flame.add([x, g.top + 1.58, front], [1, 1.6, 1]); }
      wax.flush(s); flame.flush(s, false);
    }
    if (a.snow === 'leaves') {
      const leaves = new Batch(new THREE.CircleGeometry(0.25, 5).rotateX(-Math.PI / 2), s.material('#c0702a', { side: THREE.DoubleSide }));
      for (let i = 0; i < 160; i++) leaves.add([xMin + random() * (xMax - xMin), segs[0].top + 0.32, -1 - random() * 12], [1, 1, 1], random() * 6, ['#c0702a', '#d9a23a', '#8a3a1e'][i % 3]);
      leaves.flush(s, false);
    }
    if (snowy) for (const g of segs) s.box([g.x1 - g.x0, 0.2, 14], [(g.x0 + g.x1) / 2, g.top + 0.4, -7], snow);

    for (const batch of [merlons, slots, lamps, people]) batch.flush(s);
    return s.finish({ update: (dt, time) => { for (const f of figures) f.update(dt, time); } });
  },
});
