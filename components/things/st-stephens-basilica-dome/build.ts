import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, paint, paintHex, paintIsMetal } from '@conjure/kit';

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

const unitBox = () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const unitColumn = () => new THREE.CylinderGeometry(0.42, 0.5, 1, 10).translate(0, 0.5, 0);

function clockMap(hour: number, minute: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#3a3226'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#efe8d4'; g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#c9a23a'; g.lineWidth = 7; g.stroke();
  g.fillStyle = '#2a2622';
  for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; g.fillRect(64 + Math.sin(t) * 44 - 3, 64 - Math.cos(t) * 44 - 3, 6, 6); }
  g.strokeStyle = '#2a2622'; g.lineCap = 'round';
  const hand = (angle: number, length: number, width: number) => { g.lineWidth = width; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.sin(angle) * length, 64 - Math.cos(angle) * length); g.stroke(); };
  hand(((hour % 12) + minute / 60) / 12 * Math.PI * 2, 28, 7);
  hand(minute / 60 * Math.PI * 2, 42, 4);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    lighting: choice('How is the basilica lit?', {
      floodlit: 'Floodlit gold at night, the dome glowing over the rooftops, windows warm.',
      dome: 'Only the dome and its lantern are lit, a beacon above a dark front.',
      unlit: 'Unlit, in plain daylight: pale stone and green copper.',
    }),
    copper: paint('What colour has the dome copper weathered to?', ['teal', 'mint', 'green', 'forest', 'grey', 'charcoal', 'copper', 'gold']),
    bells: choice('What are the bells doing?', {
      ringing: 'Ringing: the great bells swing in the open belfries.',
      silent: 'Silent: the bells hang still in the dark arches.',
    }),
    square: choice('What is happening on the square in front?', {
      empty: 'Nothing: bare paving, a few pigeons, a quiet weekday.',
      market: 'A Christmas market: rows of little wooden stalls and a tall lit tree.',
      pilgrims: 'Pilgrims and tourists crowding the great steps and the square.',
      procession: 'A procession winding out of the portico under tall banners.',
    }),
    banners: paint('If a procession carries banners, what colour are they?', ['red', 'crimson', 'white', 'gold', 'blue', 'purple', 'green', 'cream']),
    scaffolding: choice('Is any of it under restoration?', {
      none: 'No scaffolding: the front stands clear.',
      tower: 'One bell tower is boxed in scaffolding and netting.',
      dome: 'The dome drum is ringed with scaffold decks.',
    }),
    clock: choice('What time do the tower clocks show?', {
      morning: 'Early morning, a quarter past seven.',
      noon: 'Noon, both hands straight up.',
      evening: 'Evening, twenty to six.',
      stopped: 'Stopped long ago at a quarter to three.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const stoneColour = new THREE.Color('#ddd2ba').lerp(new THREE.Color('#77705f'), mood.wear * 0.45);
    const floodColour = new THREE.Color().setHSL(mix(0.11, 0.075, mood.warmth), 0.9, 0.42);
    const lit = a.lighting !== 'unlit';
    if (a.lighting === 'floodlit') stoneColour.lerp(new THREE.Color('#e2ad55'), mix(0.25, 0.5, lowSun));
    const stone = s.material(stoneColour, { roughness: 0.85, emissive: floodColour, emissiveIntensity: a.lighting === 'floodlit' ? mix(0.15, 0.35, lowSun) : 0 });
    const domeStone = s.material(lit ? stoneColour.clone().lerp(new THREE.Color('#e2ad55'), 0.35) : stoneColour, { roughness: 0.85, emissive: floodColour, emissiveIntensity: lit ? mix(0.2, 0.42, lowSun) : 0 });
    const copperHex = new THREE.Color(paintHex(a.copper, '#6f8d80')).lerp(new THREE.Color('#6f8d80'), 0.25).lerp(new THREE.Color('#3f4a44'), mood.wear * 0.25);
    const copper = s.material(copperHex, { roughness: 0.6, metalness: paintIsMetal(a.copper) ? 0.7 : 0.25, emissive: floodColour, emissiveIntensity: lit ? mix(0.05, 0.15, lowSun) : 0 });
    const gilt = s.material('#c9a23a', { metalness: 0.8, roughness: 0.3, emissive: '#7a5a10', emissiveIntensity: lit ? 0.4 : 0 });
    const dark = s.material('#2c2824', { roughness: 0.8 });
    const glow = new THREE.MeshStandardMaterial({ color: '#ffd889', emissive: '#ffbe55', emissiveIntensity: mix(0.9, 1.8, lowSun), roughness: 0.6 });
    const paving = s.material(new THREE.Color('#bdb5a4').lerp(new THREE.Color('#77705f'), mood.wear * 0.3), { roughness: 0.95 });

    const columns = new Batch(unitColumn(), stone);
    const domeColumns = new Batch(unitColumn(), domeStone);
    const windows = new Batch(unitBox(), a.lighting === 'floodlit' && lowSun > 0.4 ? glow : dark);
    const blocks = new Batch(unitBox(), stone);

    // The square, then the great stepped platform the church stands on.
    s.box([110, 0.4, 150], [0, 0.2, 10], paving);
    const steps = 4;
    for (let k = 0; k < steps; k++) s.box([62 - k * 2, 1, 16 - k * 2.2], [0, 0.4 + k + 0.5, 47 - k * 1.1], stone);
    const floor = 0.4;

    // Body: a Greek cross with a nave and transept, an apse behind.
    s.box([54, 32, 74], [0, floor + 16, -4], stone);
    s.box([84, 28, 30], [0, floor + 14, -8], stone);
    s.cylinder(16, 16, 26, [0, floor + 13, -41], stone, 24);
    s.box([56, 1.6, 76], [0, floor + 32.8, -4], stone);
    s.box([86, 1.6, 32], [0, floor + 28.8, -8], stone);
    for (const x of [-42, 42]) {
      const pediment = new THREE.Shape(); pediment.moveTo(-15, 0); pediment.lineTo(15, 0); pediment.lineTo(0, 7); pediment.closePath();
      s.mesh(new THREE.ExtrudeGeometry(pediment, { depth: 1.6, bevelEnabled: false }).rotateY(Math.PI / 2).translate(x > 0 ? -0.8 : 0.8, 0, 0), stone, [x, floor + 29.6, -8]);
      for (const z of [-14, -4, 4]) windows.add([x + Math.sign(x) * 0.2, floor + 10, z - 4], [0.6, 11, 3.5]);
    }
    for (const x of [-27.2, 27.2]) for (const z of [-30, -18, 10]) windows.add([x, floor + 12, z], [0.6, 12, 4]);

    // Front: the portico of six columns, entablature and triangular pediment between two towers.
    const front = 34;
    s.box([34, 30, 4], [0, floor + 15 + 4, front], stone);
    const porticoFloor = floor + 4;
    for (let i = 0; i < 6; i++) columns.add([-11 + i * 4.4, porticoFloor, front + 6.5], [2.4, 18, 2.4]);
    s.box([28, 3.2, 8.5], [0, porticoFloor + 19.6, front + 4.6], stone);
    const tri = new THREE.Shape(); tri.moveTo(-14.5, 0); tri.lineTo(14.5, 0); tri.lineTo(0, 7.5); tri.closePath();
    s.mesh(new THREE.ExtrudeGeometry(tri, { depth: 8.5, bevelEnabled: false }).translate(0, 0, -4.25), stone, [0, porticoFloor + 21.2, front + 4.6]);
    s.mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.4, bevelEnabled: false }).scale(0.82, 0.72, 1), s.material(stoneColour.clone().multiplyScalar(0.82)), [0, porticoFloor + 21.9, front + 8.85]);
    s.box([7, 11, 0.5], [0, porticoFloor + 5.5, front + 2.1], a.lighting === 'floodlit' ? glow : dark);
    s.box([2, 0.5, 0.5], [0, porticoFloor + 21.2 + 7.6, front + 8.6], gilt);

    // Bell towers with clock faces, open belfries and ribbed cupolas.
    const time = { morning: [7, 15], noon: [12, 0], evening: [17, 40], stopped: [2, 45] }[a.clock] as [number, number];
    const clock = new THREE.MeshStandardMaterial({ map: clockMap(time[0], time[1]), roughness: 0.7, emissive: lit && lowSun > 0.4 ? '#fff0c0' : '#000000', emissiveIntensity: 0.25, emissiveMap: clockMap(time[0], time[1]) });
    const bells: THREE.Object3D[] = [];
    const bronze = s.material('#7a5a32', { metalness: 0.7, roughness: 0.4 });
    for (const side of [-1, 1]) {
      const x = side * 23, z = front + 1;
      s.box([14, 46, 14], [x, floor + 23, z], stone);
      s.box([15, 1.4, 15], [x, floor + 30, z], stone);
      s.box([15.4, 1.6, 15.4], [x, floor + 46.8, z], stone);
      for (const k of [0, 1]) windows.add([x, floor + 10 + k * 11, z + 7.1], [3, 7, 0.5]);
      // Clock faces on three sides.
      for (const [dx, dz, turn] of [[0, 7.25, 0], [7.25, 0, Math.PI / 2], [-7.25, 0, -Math.PI / 2]] as const) {
        const face = s.mesh(new THREE.CircleGeometry(3.6, 28), clock, [x + dx, floor + 39.5, z + dz]);
        face.rotation.y = turn;
        face.castShadow = false;
      }
      // Belfry: corner piers round an open chamber, a bell in it.
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) blocks.add([x + dx * 5.7, floor + 47.6, z + dz * 5.7], [2.6, 11, 2.6]);
      s.box([8.6, 11, 8.6], [x, floor + 53.1, z], dark);
      s.box([15.4, 2, 15.4], [x, floor + 59.6, z], stone);
      const pivot = new THREE.Group();
      pivot.position.set(x, floor + 57, z + 5.2);
      const bell = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [2.4, 0], [2.2, 0.6], [1.6, 2.4], [1.2, 3.6], [0.5, 4], [0, 4]].map(([r, y]) => new THREE.Vector2(r, y)), 16), bronze);
      bell.position.y = -4.6; bell.castShadow = true;
      pivot.add(bell);
      s.root.add(pivot);
      bells.push(pivot);
      // Cupola, lantern, gilt ball and cross.
      const cupola: [number, number][] = [[6.6, 0], [6.4, 1.5], [5.6, 3.5], [4.2, 5.6], [2.6, 7], [1.6, 7.6], [1.4, 8]];
      s.lathe(cupola, copper, [x, floor + 60.6, z]);
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * Math.PI * 2;
        s.tube(cupola.map(([r, y]) => [x + Math.sin(t) * (r + 0.15), floor + 60.6 + y, z + Math.cos(t) * (r + 0.15)] as P), 0.22, domeStone);
      }
      s.cylinder(1.4, 1.5, 3.4, [x, floor + 70.3, z], domeStone, 8);
      s.lathe([[1.6, 0], [1.4, 0.8], [0.6, 2], [0.2, 2.6], [0, 2.8]], copper, [x, floor + 72, z]);
      s.ball([0.55, 0.55, 0.55], [x, floor + 75.2, z], gilt, 10);
      s.box([0.3, 3.6, 0.3], [x, floor + 77.4, z], gilt);
      s.box([1.8, 0.3, 0.3], [x, floor + 78.2, z], gilt);
    }

    // The dome: square base, colonnaded drum, attic, ribbed copper shell, lantern and cross.
    const dz = -6;
    s.box([38, 4, 38], [0, floor + 35.6, dz], stone);
    const drum0 = floor + 37.6;
    s.cylinder(15, 15, 14, [0, drum0 + 7, dz], domeStone, 32);
    for (let i = 0; i < 24; i++) {
      const t = (i / 24) * Math.PI * 2;
      domeColumns.add([Math.sin(t) * 16.8, drum0, dz + Math.cos(t) * 16.8], [1.8, 12.4, 1.8]);
      if (i % 2 === 0) windows.add([Math.sin(t + 0.13) * 15.05, drum0 + 3, dz + Math.cos(t + 0.13) * 15.05], [2.4, 7.5, 0.4], t + 0.13);
    }
    s.cylinder(17.8, 17.8, 1.8, [0, drum0 + 13.3, dz], domeStone, 32);
    s.cylinder(16, 16.4, 3.2, [0, drum0 + 15.8, dz], domeStone, 32);
    const shellBase = drum0 + 17.4;
    const shell: [number, number][] = [];
    for (let k = 0; k <= 12; k++) { const t = (k / 12) * Math.PI / 2; shell.push([Math.max(3.6, 15.8 * Math.cos(t)), 21 * Math.sin(t)]); }
    s.lathe(shell, copper, [0, shellBase, dz]);
    for (let i = 0; i < 16; i++) {
      const t = (i / 16) * Math.PI * 2;
      s.tube(shell.filter((_p, k) => k % 2 === 0 || k === 12).map(([r, y]) => [Math.sin(t) * (r + 0.2), shellBase + y, dz + Math.cos(t) * (r + 0.2)] as P), 0.3, a.copper === 'gold' ? domeStone : gilt);
    }
    const lantern0 = shellBase + 20.6;
    s.cylinder(3, 3, 7, [0, lantern0 + 3.5, dz], lit ? glow : dark, 16);
    for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; domeColumns.add([Math.sin(t) * 3.6, lantern0, dz + Math.cos(t) * 3.6], [0.9, 7, 0.9]); }
    s.cylinder(4.2, 4.2, 1, [0, lantern0 + 7.5, dz], domeStone, 16);
    s.lathe([[4, 0], [3.4, 1.4], [1.8, 2.8], [0.5, 3.4], [0, 3.5]], copper, [0, lantern0 + 8, dz]);
    s.ball([0.9, 0.9, 0.9], [0, lantern0 + 12, dz], gilt, 12);
    s.box([0.5, 5.6, 0.5], [0, lantern0 + 15.2, dz], gilt);
    s.box([2.8, 0.5, 0.5], [0, lantern0 + 16.4, dz], gilt);

    // Restoration scaffolding.
    const poleMat = s.material('#77746c', { metalness: 0.4 });
    const poles = new Batch(new THREE.CylinderGeometry(0.15, 0.15, 1, 4).translate(0, 0.5, 0), poleMat);
    const net = new THREE.MeshStandardMaterial({ color: '#dfe2dc', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, roughness: 0.95 });
    if (a.scaffolding === 'tower') {
      const x = 23, z = front + 1;
      for (const d of [-8.5, -4, 0, 4, 8.5]) for (const e of [-8.5, 8.5]) { poles.add([x + d, floor, z + e], [1, 62, 1]); poles.add([x + e, floor, z + d], [1, 62, 1]); }
      for (let y = floor + 4; y < floor + 62; y += 4) blocks.add([x, y, z], [17.4, 0.25, 17.4]);
      s.mesh(new THREE.BoxGeometry(17.6, 58, 17.6), net, [x, floor + 31, z]).castShadow = false;
    }
    if (a.scaffolding === 'dome') {
      for (let i = 0; i < 28; i++) { const t = (i / 28) * Math.PI * 2; poles.add([Math.sin(t) * 19.5, floor + 37.6, dz + Math.cos(t) * 19.5], [1, 22, 1]); }
      for (let y = drum0 + 2; y < drum0 + 22; y += 4) s.cylinder(19.8, 19.8, 0.3, [0, y, dz], poleMat, 32);
      s.mesh(new THREE.CylinderGeometry(19.9, 19.9, 20, 32, 1, true), net, [0, drum0 + 10, dz]).castShadow = false;
    }

    // On the square.
    const people = new Batch(new THREE.CapsuleGeometry(0.3, 1.1, 2, 5).translate(0, 0.85, 0), s.material('#ffffff', { roughness: 0.9 }));
    const tones = ['#3a3a42', '#6a4a36', '#8a2a2a', '#2c3d55', '#6b6b62', '#c9b27a', '#e8e2d6'];
    const flags: THREE.Mesh[] = [];
    if (a.square === 'empty') {
      const pigeons = new Batch(new THREE.SphereGeometry(0.25, 5, 4), s.material('#6d7078'));
      for (let i = 0; i < 40; i++) pigeons.add([(random() - 0.5) * 50, 0.6, 60 + random() * 20], [1, 0.8, 1.4]);
      pigeons.flush(s);
      for (let i = 0; i < 6; i++) people.add([(random() - 0.5) * 70, 0.4, 58 + random() * 25], [1, 1, 1], 0, tones[i]);
    }
    if (a.square === 'market') {
      const wood = s.material('#7a5434', { roughness: 0.9 });
      const roofs = new Batch(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), s.material('#5a3a22'));
      for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) {
        const x = -33 + c * 11 + (r % 2) * 3, z = 62 + r * 9;
        if (Math.abs(x) < 6 && r === 1) continue;
        s.box([5, 2.6, 3.2], [x, 1.7, z], wood);
        roofs.add([x, 3, z], [6, 2, 4]);
        windows.add([x, 1.4, z + 1.65], [4.2, 1.2, 0.2]);
        for (let k = 0; k < 4; k++) people.add([x + (random() - 0.5) * 6, 0.4, z + 2.8 + random() * 1.5], [1, 1, 1], 0, tones[(r + c + k) % tones.length]);
      }
      roofs.flush(s);
      const fir = s.material('#28482e', { roughness: 0.9 });
      for (let k = 0; k < 4; k++) s.cylinder(0, 6 - k * 1.2, 6, [0, 2 + k * 4, 72], fir, 10);
      const lights = new Batch(new THREE.SphereGeometry(0.3, 5, 4), glow);
      for (let i = 0; i < 60; i++) { const y = 2 + random() * 16, r = (6 - (y - 2) * 0.3) * 0.95, t = random() * 6.3; lights.add([Math.sin(t) * r, y, 72 + Math.cos(t) * r], [1, 1, 1]); }
      lights.flush(s, false);
      s.box([0.6, 1.2, 0.6], [0, 19.2, 72], gilt);
    }
    if (a.square === 'pilgrims') {
      for (let i = 0; i < 260; i++) {
        const onSteps = i < 110;
        const x = (random() - 0.5) * (onSteps ? 52 : 90);
        const z = onSteps ? 40 + random() * 12 : 56 + random() * 30;
        const y = onSteps ? floor + Math.max(0, Math.min(4, (52 - z) / 2.2)) : 0.4;
        people.add([x, y, z], [1, 0.9 + random() * 0.2, 1], 0, tones[i % tones.length]);
      }
    }
    if (a.square === 'procession') {
      const banner = s.material(paintHex(a.banners), { side: THREE.DoubleSide, roughness: 0.8, metalness: paintIsMetal(a.banners) ? 0.6 : 0 });
      for (let i = 0; i < 70; i++) {
        const t = i / 70;
        const x = Math.sin(t * 5) * 14, z = 44 + t * 40;
        const y = z < 52 ? floor + Math.max(0, Math.min(4, (52 - z) / 2.2)) : 0.4;
        for (const side of [-1, 1]) people.add([x + side * 1, y, z], [1, 1, 1], 0, i % 9 === 0 ? '#e8e2d6' : tones[(i + side) % 4]);
        if (i % 9 === 0) {
          s.rod([x, y, z], [x, y + 8, z], 0.08, gilt);
          s.box([3, 0.12, 0.12], [x, y + 7.8, z], gilt);
          flags.push(s.mesh(new THREE.PlaneGeometry(2.6, 4), banner, [x, y + 5.7, z]));
        }
      }
      for (let i = 0; i < 80; i++) people.add([(random() < 0.5 ? -1 : 1) * (22 + random() * 25), 0.4, 58 + random() * 28], [1, 1, 1], 0, tones[i % tones.length]);
    }

    for (const batch of [columns, domeColumns, windows, blocks, poles, people]) batch.flush(s);

    const swing = a.bells === 'ringing' ? mix(0.35, 0.8, mood.energy) : 0;
    if (swing) bells.forEach((bell, i) => { bell.rotation.x = (i ? -1 : 1) * swing * 0.8; });
    return s.finish({
      update: (_dt, time) => {
        bells.forEach((bell, i) => { bell.rotation.x = Math.sin(time * 1.6 + i * 1.7) * swing; });
        flags.forEach((flag, i) => { flag.rotation.y = Math.sin(time * mix(0.5, 2, mood.energy) + i) * 0.3; });
      },
    });
  },
});
