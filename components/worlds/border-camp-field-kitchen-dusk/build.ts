import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];

/** A canvas-painted texture: no fonts, images or network. */
function paint(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The diamond weave of a chain-link fence, with holes the alpha test cuts out. */
function chainLink() {
  const map = paint(128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    c.strokeStyle = '#b9bcc0';
    c.lineWidth = 3;
    for (let i = -4; i < 8; i++) {
      c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 128, 128); c.stroke();
      c.beginPath(); c.moveTo(i * 32 + 128, 0); c.lineTo(i * 32, 128); c.stroke();
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

export default defineWorld({
  questions: {
    ground: choice('What is underfoot?', {
      mud: 'Churned brown mud with standing puddles and tyre ruts.',
      dust: 'Pale packed dust and gravel, dry and cracked.',
      snow: 'Trodden grey snow, white where nobody has walked.',
    }),
    tents: choice('What kind of shelter stands behind the kitchen?', {
      domes: 'Rows of white dome tents.',
      tarps: 'Blue tarpaulin shelters on timber frames, ropes pegged into the ground.',
      containers: 'Shipping containers with doors and a few small windows cut in.',
    }),
    queue: score('How long is the queue line?', ['A few pallets, nobody waiting long', 'A dozen metres of pallets with tape along them', 'Out past the floodlight and round the fence']),
    meal: score('Where is the meal at?', ['Just starting: pots full, lids off, bowls stacked high', 'Mid-service: a steady rhythm, half the bowls gone', 'Nearly done: pots tipped and scraped, a few bowls left, cups in the mud']),
    sign: choice('What does the hand-painted sign on the serving table say?', {
      meals: 'HOT MEALS',
      soup: 'SOUP',
      tea: 'TEA · WATER',
      bread: 'BREAD HERE',
      none: 'No sign: everyone knows.',
    }),
    tank: noul('Is there a raised water tank on a steel stand behind the tents?'),
    generator: noul('Is a generator humming beside the floodlight pole, cable in the mud?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const dusk = Math.max(0, mood.daylight - 0.4) / 0.6; // 0 late afternoon … 1 full dusk
    const sky = new THREE.Color('#b8a4c8').lerp(new THREE.Color('#7e6c9c'), dusk * 0.7).lerp(new THREE.Color('#d6a08e'), mood.warmth * 0.3);
    const floorColour = { mud: '#5e4b3a', dust: '#b7a98a', snow: '#e2e6ea' }[a.ground];
    const { art: s, world } = diorama(context, {
      background: sky.getStyle(), floor: floorColour, width: 16, depth: 12, maxHeight: 3.2, radius: 1.6, pitch: 30, yaw: 22, scale: [0.8, 1.35],
      slots: [[-1.5, 0.15], [1.2, 1.5], [2.6, 2.2], [4.0, 2.95], [-5.4, 0.3], [3.2, -1.5]],
    });
    if (world.keyLight) { world.keyLight.intensity *= mix(1, 0.6, dusk); world.keyLight.color.lerp(new THREE.Color('#e8b48a'), dusk * 0.4); }
    world.object.traverse((node) => { if ((node as THREE.HemisphereLight).isHemisphereLight) { const light = node as THREE.HemisphereLight; light.intensity *= mix(1, 0.75, dusk); light.color.lerp(new THREE.Color('#c0a8d8'), dusk * 0.5); } });
    const ground = world.ground as THREE.Mesh;
    (ground.material as THREE.MeshStandardMaterial).roughness = a.ground === 'mud' ? 0.75 : 0.98;

    // Ground dressing: puddles and ruts, stones, or trodden snow along the queue.
    if (a.ground === 'mud') {
      const puddle = new THREE.MeshStandardMaterial({ color: '#8a8a94', roughness: 0.06, metalness: 0.35, transparent: true, opacity: 0.8 });
      const puddles = s.scatter(new THREE.CylinderGeometry(1, 1, 0.01, 14), puddle, Array.from({ length: 14 }, () => ({ at: [(random() - 0.5) * 15, 0.006, (random() - 0.5) * 11] as P, size: 0.3 + random() * 0.6 })));
      puddles.castShadow = false;
      for (let i = 0; i < 3; i++) s.box([0.12, 0.02, 9 + random() * 3], [-7 + i * 0.5 + random() * 0.3, 0.008, -0.5 + random()], s.material('#4a3a2c', { roughness: 1 })).rotation.y = 0.2;
    }
    if (a.ground === 'dust') s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#9a8e7a', { roughness: 1 }), Array.from({ length: 40 }, () => ({ at: [(random() - 0.5) * 15, 0.02, (random() - 0.5) * 11] as P, size: 0.04 + random() * 0.08 })));
    if (a.ground === 'snow') {
      const trodden = s.scatter(new THREE.CylinderGeometry(1, 1, 0.012, 12), s.material('#a9adb2', { roughness: 1 }), Array.from({ length: 30 }, (_u, i) => ({ at: [-1.5 + i * 0.3 + (random() - 0.5) * 0.8, 0.006, 0.2 + i * 0.16 + (random() - 0.5) * 0.8] as P, size: 0.4 + random() * 0.5 })));
      trodden.castShadow = false;
      s.box([6, 0.02, 3.6], [-2, 0.008, -2.5], s.material('#b0b4b8', { roughness: 1 }));
    }

    // The tarpaulin kitchen: six poles, a sagging sheet, guy ropes.
    const TX0 = -5.2, TX1 = 1.2, TZ0 = -4.6, TZ1 = -0.4;
    const tarpColour = new THREE.Color(mood.cheer > 0.5 ? '#3a62a8' : '#6a7a6a').lerp(new THREE.Color('#8b8275'), mood.wear * 0.3);
    const sheet = new THREE.PlaneGeometry(TX1 - TX0, TZ1 - TZ0, 14, 10);
    sheet.rotateX(-Math.PI / 2);
    const pos = sheet.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) - (TX0 + TX1) / 2) / (TX1 - TX0) + 0.5, v = (pos.getZ(i) - (TZ0 + TZ1) / 2) / (TZ1 - TZ0) + 0.5;
      const sag = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
      pos.setY(i, 2.55 - 0.2 * (1 - v) - sag * (0.55 + mood.wear * 0.25) - random() * 0.03);
    }
    sheet.translate((TX0 + TX1) / 2, 0, (TZ0 + TZ1) / 2);
    sheet.computeVertexNormals();
    const tarp = s.mesh(sheet, new THREE.MeshStandardMaterial({ color: tarpColour, roughness: 0.85, side: THREE.DoubleSide }));
    void tarp;
    const pole = s.material('#3a3836', { metalness: 0.4, roughness: 0.6 });
    const rope = s.material('#d9c9a1', { roughness: 0.9 });
    const corners: [number, number, number][] = [[TX0, TZ0, 2.35], [TX1, TZ0, 2.35], [TX0, TZ1, 2.55], [TX1, TZ1, 2.55], [(TX0 + TX1) / 2, TZ0, 2.35], [(TX0 + TX1) / 2, TZ1, 2.55]];
    for (const [x, z, h] of corners) s.rod([x, 0, z], [x, h + 0.05, z], 0.03, pole);
    for (const [x, z, h] of corners.slice(0, 4)) {
      const px = x + (x < -2 ? -1.3 : 1.3), pz = z + (z < -2.5 ? -1.1 : 1.1);
      s.rod([x, h, z], [px, 0.02, pz], 0.008, rope);
      s.rod([px, 0, pz], [px, 0.2, pz], 0.02, pole).rotation.z = 0.2;
    }
    // A string of work lamps under the tarp, lit as dusk comes on.
    const bulb = new THREE.MeshStandardMaterial({ color: '#fff2c8', emissive: '#ffd27a', emissiveIntensity: mix(0.6, 2.2, dusk) });
    s.rod([TX0 + 0.3, 2.1, -2.4], [TX1 - 0.3, 2.1, -2.4], 0.008, s.material('#1d1d1f'));
    const bulbs = s.scatter(new THREE.SphereGeometry(0.06, 8, 6), bulb, Array.from({ length: 5 }, (_u, i) => ({ at: [TX0 + 0.9 + i * 1.3, 1.98, -2.4] as P, size: 1 })));
    bulbs.castShadow = false;

    // The serving table across the front of the tarp, and the prep table behind.
    const timber = s.material(new THREE.Color('#a8865a').lerp(new THREE.Color('#6a5a4a'), mood.wear * 0.4), { roughness: 0.9 });
    const trestle = (x: number, z: number, length: number) => {
      s.box([length, 0.05, 0.8], [x, 0.78, z], timber);
      for (const dx of [-length / 2 + 0.4, length / 2 - 0.4]) for (const dz of [-0.3, 0.3]) s.rod([x + dx, 0, z + dz * 1.3], [x + dx, 0.75, z + dz * 0.6], 0.03, pole);
      for (const dx of [-length / 2 + 0.4, length / 2 - 0.4]) s.box([0.05, 0.04, 0.9], [x + dx, 0.4, z], pole);
    };
    const serveX = -2.0, serveZ = -0.95;
    trestle(serveX, serveZ, 4.6);
    trestle(-2.4, -3.3, 3.6);
    const steel = s.material('#b9bdc0', { metalness: 0.7, roughness: 0.35 });
    const foodColours = ['#c9742a', '#c8422a', '#5a3a1a', '#f1ead6'];
    const stockpot = (x: number, y: number, z: number, r: number, h: number, fill: number, tipped: boolean) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [r - 0.01, 0], [r, 0.012], [r, h], [r + 0.012, h + 0.01], [r - 0.014, h + 0.01], [r - 0.014, 0.012], [0, 0.012]].map(([px, py]) => new THREE.Vector2(px, py)), 28), steel);
      body.castShadow = body.receiveShadow = true;
      g.add(body);
      if (fill > 0.05 && !tipped) {
        const food = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.02, r - 0.02, 0.01, 24), s.material(foodColours[Math.floor(random() * foodColours.length)], { roughness: 0.35 }));
        food.position.y = 0.02 + (h - 0.04) * fill;
        g.add(food);
      }
      if (tipped) { g.rotation.z = 1.2; g.position.y += r * 0.9; g.position.x += 0.1; }
      s.root.add(g);
      return g;
    };
    const fill = mix(0.9, 0.1, a.meal);
    const ending = a.meal > 0.66;
    stockpot(serveX - 1.6, 0.805, serveZ - 0.05, 0.24, 0.4, fill, ending && random() < 0.6);
    stockpot(serveX - 0.5, 0.805, serveZ - 0.1, 0.2, 0.34, fill, false);
    // Tea urn with a tap, a ladle across the big pot, trays of bread.
    s.lathe([[0, 0], [0.17, 0], [0.18, 0.02], [0.18, 0.42], [0.2, 0.45], [0.16, 0.45], [0.16, 0.5], [0, 0.5]], steel, [serveX + 1.4, 0.805, serveZ - 0.1]);
    s.rod([serveX + 1.4, 0.88, serveZ + 0.08], [serveX + 1.4, 0.88, serveZ + 0.16], 0.014, s.material('#1d1d1f'));
    s.box([0.45, 0.04, 0.3], [serveX + 0.6, 0.825, serveZ + 0.12], s.material('#2f6fc4', { roughness: 0.6 }));
    if (!ending) s.scatter(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 14), s.material('#d9b47a', { roughness: 0.95 }), Array.from({ length: 8 }, (_u, i) => ({ at: [serveX + 0.5 + (i % 2) * 0.2, 0.85 + Math.floor(i / 2) * 0.012, serveZ + 0.12] as P, size: 1 })));
    // Stacks of bowls, taller at the start of service.
    const bowls = Math.round(mix(16, 3, a.meal));
    const bowlPaint = new THREE.MeshStandardMaterial({ color: '#e8e2d2', roughness: 0.6, side: THREE.DoubleSide });
    s.scatter(new THREE.CylinderGeometry(0.085, 0.055, 0.045, 14, 1, true), bowlPaint, Array.from({ length: bowls }, (_u, i) => ({ at: [serveX + 2.0, 0.83 + (i % 8) * 0.016, serveZ + 0.2 - Math.floor(i / 8) * 0.22] as P, size: 1 })));
    if (ending) s.scatter(new THREE.CylinderGeometry(0.04, 0.03, 0.09, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#f4f1e6', roughness: 0.8, side: THREE.DoubleSide }), Array.from({ length: 10 }, () => ({ at: [(random() - 0.5) * 8 + 1, 0.02, 0.5 + random() * 4] as P, size: 1 })));
    // Hand-painted sign on the table front.
    const signText = { meals: 'HOT MEALS', soup: 'SOUP', tea: 'TEA · WATER', bread: 'BREAD HERE', none: '' }[a.sign];
    if (signText) {
      s.box([1.5, 0.42, 0.03], [serveX + 0.2, 0.45, serveZ + 0.42], timber);
      s.label(signText, 1.4, 0.34, [serveX + 0.2, 0.45, serveZ + 0.44], '#8a2a2a', '#efe4c8');
    }
    // Gas rings with pots under the tarp, the propane bottles, crates stacked, water drums.
    for (const [x, z] of [[-4.6, -3.1], [-3.8, -3.1]] as const) {
      s.cylinder(0.26, 0.28, 0.04, [x, 0.46, z], pole, 16);
      for (let i = 0; i < 3; i++) { const t = i * 2.09; s.rod([x + Math.cos(t) * 0.26, 0, z + Math.sin(t) * 0.26], [x + Math.cos(t) * 0.22, 0.45, z + Math.sin(t) * 0.22], 0.012, pole); }
      stockpot(x, 0.48, z, 0.22, 0.36, fill, false);
      const flames = s.scatter(new THREE.ConeGeometry(0.012, 0.04, 6), new THREE.MeshStandardMaterial({ color: '#9fd0ff', emissive: '#2f7fff', emissiveIntensity: 2, transparent: true, opacity: 0.9, depthWrite: false }), Array.from({ length: 10 }, (_u, i) => ({ at: [x + Math.cos(i * 0.63) * 0.1, 0.46, z + Math.sin(i * 0.63) * 0.1] as P, size: 1 })));
      flames.castShadow = false;
    }
    s.lathe([[0, 0], [0.14, 0], [0.16, 0.03], [0.16, 0.4], [0.12, 0.46], [0.05, 0.5], [0, 0.5]], s.material('#d9541e', { roughness: 0.5 }), [-5.1, 0, -2.3]);
    const crateColours = ['#2f6fc4', '#c9402a', '#3a3a3a', '#2a8a4a', '#e8e4dc'];
    const crateCount = Math.round(mix(6, 14, mood.density));
    s.scatter(new THREE.BoxGeometry(0.5, 0.3, 0.36), s.material('#ffffff', { roughness: 0.6 }), Array.from({ length: crateCount }, (_u, i) => ({ at: [-5.8 + Math.floor(i / 5) * 0.56, 0.15 + (i % 5) * 0.31, -4.1 + (random() - 0.5) * 0.04] as P, size: 1, color: crateColours[Math.floor(random() * crateColours.length)] })));
    for (let i = 0; i < 3; i++) {
      const dx = [1.7, 2.4, 2.0][i], dz = [-2.5, -2.5, -3.2][i];
      s.cylinder(0.3, 0.3, 0.9, [dx, 0.45, dz], s.material(i === 2 ? '#2a4f90' : '#2f6fc4', { roughness: 0.5 }), 20);
      for (const y of [0.25, 0.65]) s.ring(0.305, 0.015, [dx, y, dz], s.material('#1f3f78'), Math.PI * 2).rotation.x = Math.PI / 2;
    }
    s.rod([1.7, 0.25, -2.2], [1.7, 0.25, -2.05], 0.015, steel);
    s.lathe([[0, 0], [0.12, 0], [0.14, 0.25], [0.15, 0.26], [0, 0.26]], s.material('#e8e4dc', { roughness: 0.6 }), [1.7, 0, -1.8]);

    // The queue: pallets laid over the ground, tape on posts along them.
    const start = new THREE.Vector3(0.1, 0, 0.9), dir = new THREE.Vector3(0.886, 0, 0.464);
    const pallets = Math.round(mix(2, 8, a.queue));
    const slats: { at: P; size: number }[] = [], bearers: { at: P; size: number }[] = [];
    const palletWood = s.material(new THREE.Color('#b08a5a').lerp(new THREE.Color('#5a4a3a'), mood.wear * 0.6), { roughness: 1 });
    const yaw = Math.atan2(dir.x, dir.z);
    const slatGeometry = new THREE.BoxGeometry(0.1, 0.02, 1.2), bearerGeometry = new THREE.BoxGeometry(0.8, 0.09, 0.1);
    for (let i = 0; i < pallets; i++) {
      const centre = start.clone().addScaledVector(dir, 0.6 + i * 1.25);
      const side = new THREE.Vector3(dir.z, 0, -dir.x);
      for (let k = 0; k < 7; k++) { const p = centre.clone().addScaledVector(side, -0.36 + k * 0.12); slats.push({ at: [p.x, 0.13, p.z], size: 1 }); }
      for (const d of [-0.5, 0, 0.5]) { const p = centre.clone().addScaledVector(dir, d); bearers.push({ at: [p.x, 0.075, p.z], size: 1 }); }
    }
    const rotate = (mesh: THREE.InstancedMesh, points: { at: P }[]) => {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      points.forEach((p, i) => { m.compose(new THREE.Vector3(...p.at), q, new THREE.Vector3(1, 1, 1)); mesh.setMatrixAt(i, m); });
      mesh.instanceMatrix.needsUpdate = true;
    };
    rotate(s.scatter(slatGeometry, palletWood, slats), slats);
    rotate(s.scatter(bearerGeometry, palletWood, bearers), bearers);
    const tape = new THREE.MeshStandardMaterial({ map: paint(64, 8, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#e8e4dc' : '#c9282a'; c.fillRect(i * 8, 0, 8, 8); } }), roughness: 0.8, side: THREE.DoubleSide });
    (tape.map as THREE.Texture).wrapS = THREE.RepeatWrapping;
    (tape.map as THREE.Texture).repeat.set(6, 1);
    const posts = pallets + 1;
    for (let i = 0; i < posts; i++) {
      const p = start.clone().addScaledVector(dir, i * 1.25).addScaledVector(new THREE.Vector3(dir.z, 0, -dir.x), 0.62);
      s.rod([p.x, 0, p.z], [p.x, 1.0, p.z], 0.02, s.material('#e8e4dc'));
      if (i > 0) {
        const q = start.clone().addScaledVector(dir, (i - 1) * 1.25).addScaledVector(new THREE.Vector3(dir.z, 0, -dir.x), 0.62);
        const band = s.mesh(new THREE.PlaneGeometry(1.25, 0.06), tape, [(p.x + q.x) / 2, 0.9 - 0.04, (p.z + q.z) / 2]);
        band.rotation.y = yaw + Math.PI / 2;
        band.castShadow = false;
      }
    }

    // The floodlight on its pole, coming on over the serving point.
    const lampAt = new THREE.Vector3(0.9, 5.2, 0.7), aim = new THREE.Vector3(-1.5, 0, 0.1);
    s.rod([lampAt.x, 0, lampAt.z], [lampAt.x, lampAt.y, lampAt.z], 0.05, pole, 0.07);
    s.box([0.5, 0.45, 0.06], [lampAt.x, lampAt.y + 0.1, lampAt.z], pole);
    const head = new THREE.Group();
    head.position.copy(lampAt);
    head.lookAt(aim);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.3), pole);
    housing.castShadow = true;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.3), new THREE.MeshStandardMaterial({ color: '#fff7dc', emissive: '#ffe6a0', emissiveIntensity: mix(0.8, 3.2, dusk) }));
    face.position.z = 0.16;
    head.add(housing, face);
    s.root.add(head);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(2.4, lampAt.distanceTo(aim), 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff0c0', transparent: true, opacity: mix(0.03, 0.12, dusk), depthWrite: false, side: THREE.DoubleSide }));
    beam.position.copy(lampAt).lerp(aim, 0.5);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), lampAt.clone().sub(aim).normalize());
    beam.castShadow = false;
    s.root.add(beam);
    const pool = s.mesh(new THREE.CircleGeometry(2.4, 28), new THREE.MeshBasicMaterial({ color: '#fff0c0', transparent: true, opacity: mix(0.05, 0.22, dusk), depthWrite: false }), [aim.x, 0.012, aim.z]);
    pool.rotation.x = -Math.PI / 2;
    pool.castShadow = false;
    if (a.generator) {
      s.box([0.6, 0.42, 0.4], [lampAt.x + 0.8, 0.24, lampAt.z - 0.5], s.material('#c93a2a', { roughness: 0.5 }));
      s.box([0.5, 0.05, 0.3], [lampAt.x + 0.8, 0.48, lampAt.z - 0.5], pole);
      s.tube([[lampAt.x + 0.5, 0.1, lampAt.z - 0.5], [lampAt.x + 0.2, 0.02, lampAt.z - 0.2], [lampAt.x, 0.02, lampAt.z], [lampAt.x, 0.5, lampAt.z]], 0.014, s.material('#1d1d1f'));
    }

    // Shelter behind the kitchen, and the fence behind that.
    const canvas = s.material(a.ground === 'snow' ? '#eef0f0' : '#e6e3da', { roughness: 0.95 });
    const spots: [number, number, number][] = [[2.8, -4.5, 1.35], [5.3, -4.8, 1.45], [7.4, -4.1, 1.3], [-7.2, -4.4, 1.35]];
    if (a.tents === 'domes') for (const [x, z, r] of spots) {
      const dome = s.ball([r, r * 0.8, r * 0.95], [x, 0, z], canvas, 18);
      dome.castShadow = true;
      s.box([0.5, 0.8, 0.05], [x, 0.4, z + r * 0.95], s.material('#3a3a3c'));
      for (const t of [0.6, 2.5, 3.6, 5.6]) s.rod([x + Math.cos(t) * r * 0.9, r * 0.3, z + Math.sin(t) * r * 0.85], [x + Math.cos(t) * (r + 0.7), 0.02, z + Math.sin(t) * (r + 0.7)], 0.006, rope);
    }
    if (a.tents === 'tarps') for (const [x, z, r] of spots) {
      const w = r * 1.8, d = r * 1.4;
      for (const dx of [-w / 2, w / 2]) for (const dz of [-d / 2, d / 2]) s.rod([x + dx, 0, z + dz], [x + dx, dz > 0 ? 1.9 : 1.5, z + dz], 0.035, timber);
      const roof = s.box([w + 0.4, 0.03, d + 0.5], [x, 1.72, z], new THREE.MeshStandardMaterial({ color: '#2f5fb0', roughness: 0.85, side: THREE.DoubleSide }));
      roof.rotation.x = 0.26;
      s.box([w, 1.5, 0.03], [x, 0.75, z - d / 2], new THREE.MeshStandardMaterial({ color: '#2f5fb0', roughness: 0.85, side: THREE.DoubleSide }));
      s.box([0.03, 1.6, d], [x - w / 2, 0.8, z], new THREE.MeshStandardMaterial({ color: '#3a6ac0', roughness: 0.85, side: THREE.DoubleSide }));
      for (const dx of [-w / 2, w / 2]) s.rod([x + dx, 1.85, z + d / 2], [x + dx * 1.6, 0.02, z + d / 2 + 1.0], 0.006, rope);
    }
    if (a.tents === 'containers') {
      const rib = s.material('#6a7a86', { roughness: 0.7, metalness: 0.3 });
      for (const [x, z, colour] of [[4.6, -4.7, '#8a3a2a'], [-6.8, -4.6, '#2f5a7a']] as const) {
        s.box([6, 2.6, 2.4], [x, 1.3, z], s.material(colour, { roughness: 0.6, metalness: 0.25 }));
        s.scatter(new THREE.BoxGeometry(0.06, 2.5, 0.06), s.material(colour, { roughness: 0.6, metalness: 0.25 }), Array.from({ length: 22 }, (_u, i) => ({ at: [x - 2.9 + i * 0.27, 1.3, z + 1.22] as P, size: 1 })));
        s.box([0.9, 0.7, 0.06], [x - 1.2, 1.6, z + 1.23], s.material('#2a3a44', { roughness: 0.3, metalness: 0.3 }));
        s.box([0.8, 1.9, 0.06], [x + 2.2, 0.95, z + 1.23], rib);
        s.rod([x + 2.0, 0.3, z + 1.3], [x + 2.0, 1.9, z + 1.3], 0.025, s.material('#2a2c2e'));
        s.box([1.2, 0.06, 0.6], [x - 1.2, 2.6, z + 1.5], rib);
      }
    }
    // Chain-link fence with posts and a top rail, running behind the camp.
    const fenceZ = -5.85, fenceH = 2.2;
    const mesh = new THREE.MeshStandardMaterial({ map: chainLink(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.6 });
    (mesh.map as THREE.Texture).repeat.set(16, fenceH);
    const fence = s.mesh(new THREE.PlaneGeometry(16, fenceH), mesh, [0, fenceH / 2 + 0.05, fenceZ]);
    fence.castShadow = false;
    s.scatter(new THREE.CylinderGeometry(0.03, 0.03, fenceH + 0.3, 8), steel, Array.from({ length: 7 }, (_u, i) => ({ at: [-7.5 + i * 2.5, (fenceH + 0.3) / 2, fenceZ] as P, size: 1 })));
    s.box([16, 0.04, 0.04], [0, fenceH + 0.27, fenceZ], steel);
    if (a.tank) {
      const tx = a.tents === 'containers' ? 0.5 : -3.5, tz = -5.2;
      for (const dx of [-0.5, 0.5]) for (const dz of [-0.5, 0.5]) s.rod([tx + dx, 0, tz + dz], [tx + dx, 2.6, tz + dz], 0.03, steel);
      for (const dz of [-0.5, 0.5]) s.rod([tx - 0.5, 1.3, tz + dz], [tx + 0.5, 1.6, tz + dz], 0.015, steel);
      s.box([1.3, 0.06, 1.3], [tx, 2.62, tz], steel);
      s.cylinder(0.65, 0.65, 1.2, [tx, 3.25, tz], s.material('#1d1d1f', { roughness: 0.4 }), 20);
      s.rod([tx + 0.6, 2.7, tz + 0.5], [tx + 0.6, 0.1, tz + 0.5], 0.02, s.material('#1d1d1f'));
    }
    // Litter where the queue has stood, by wear and density.
    const litter = Math.round(mood.wear * 10 + mood.density * 6);
    if (litter) s.scatter(new THREE.BoxGeometry(0.12, 0.004, 0.08), s.material('#efe8d6', { roughness: 1 }), Array.from({ length: litter }, () => ({ at: [(random() - 0.5) * 10 + 1, 0.004, (random() - 0.5) * 6 + 1] as P, size: 0.8 + random() * 0.6 })));

    // Steam from the pots and a slow flicker as the floodlight warms up.
    const puffs: { mesh: THREE.Mesh; base: number; phase: number }[] = [];
    if (!ending) for (const [x, z] of [[serveX - 1.6, serveZ - 0.05], [-4.6, -3.1], [-3.8, -3.1]] as const) for (let i = 0; i < 3; i++) {
      const size = 0.08 + random() * 0.06;
      const m = s.ball([size, size * 1.2, size], [x + (random() - 0.5) * 0.2, (x < -3 ? 0.9 : 1.25) + i * 0.12, z + (random() - 0.5) * 0.2], new THREE.MeshStandardMaterial({ color: '#f4f2ee', transparent: true, opacity: 0.15, depthWrite: false, roughness: 1 }), 8);
      m.castShadow = false;
      puffs.push({ mesh: m, base: m.position.y, phase: random() * 6.3 });
    }
    const energy = mood.energy;
    const faceMaterial = face.material as THREE.MeshStandardMaterial, faceGlow = faceMaterial.emissiveIntensity;
    world.update = (_dt: number, time: number) => {
      for (const [i, puff] of puffs.entries()) {
        const t = (time * (0.2 + energy * 0.3) + puff.phase + i * 0.3) % 1;
        puff.mesh.position.y = puff.base + t * 0.6;
        const grow = 1 + t * 1.5;
        puff.mesh.scale.setScalar(grow);
        (puff.mesh.material as THREE.MeshStandardMaterial).opacity = 0.16 * (1 - t);
      }
      faceMaterial.emissiveIntensity = faceGlow * (1 + Math.sin(time * 23) * Math.sin(time * 3.1) * 0.06 * (0.3 + energy));
    };
    return world;
  },
});
