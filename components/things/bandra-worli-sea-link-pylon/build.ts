import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, paintHex } from '@conjure/kit';
import { Batch, canvasTexture, planarUV, night as nightOf } from './parts';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    cableLights: choice('How are the stay cables lit after dark?', {
      white: 'Cool white light running up every cable.',
      gold: 'Warm gold, the bridge strung like jewellery.',
      tricolour: 'Saffron, white and green for a national day.',
      magenta: 'A loud magenta festival wash.',
      blue: 'Electric blue.',
      off: 'Unlit: grey cables against the sky.',
    }),
    traffic: choice('What is on the deck?', {
      jam: 'A jam of black-and-yellow taxis and cars, nose to tail in every lane.',
      flowing: 'Ordinary traffic flowing, a few cars and a bus.',
      empty: 'Empty at dawn: eight bare lanes.',
      motorbike: 'A single motorbike crossing alone.',
    }),
    sea: choice('What is the sea doing?', {
      calm: 'The calm Arabian Sea, flat and glinting.',
      swell: 'Monsoon swell: grey-green rollers breaking white against the pier.',
      lowtide: 'Low tide: mud flats and rocks showing, small fishing boats with flags at anchor.',
    }),
    weather: choice('What is the air doing around the tower?', {
      clear: 'Clear air, the whole tower sharp.',
      smog: 'Brown-grey smog, the top of the mast fading.',
      cloud: 'A low rain cloud swallowing the top of the mast.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const night = nightOf(mood.daylight);
    const concrete = s.material(new THREE.Color('#bdb8ae').lerp(new THREE.Color('#8b867c'), mood.wear * 0.5), { roughness: 0.85 });
    const deckMat = s.material('#9a968e', { roughness: 0.85 });
    const laneMap = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#5a5a5c'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '30,30,30' : '120,120,120'},0.2)`; c.fillRect(random() * 256, random() * 256, 3, 3); }
      c.fillStyle = '#e8e4d8';
      for (const y of [32, 64, 96, 160, 192, 224]) for (let x = 0; x < 256; x += 64) c.fillRect(x, y - 1, 32, 3);
      c.fillStyle = '#d8b040'; c.fillRect(0, 120, 256, 4); c.fillRect(0, 132, 256, 4);
    });
    const asphalt = s.material('#ffffff', { map: laneMap, roughness: 0.8 });
    const lightHex = { white: '#f4f6ff', gold: '#ffc25a', tricolour: '#ffffff', magenta: paintHex('magenta'), blue: '#3f7cff', off: '#f2f2ee' }[a.cableLights];
    const cableGlow = a.cableLights === 'off' ? 0 : mix(0.05, 1.8, night);
    const cableMats = a.cableLights === 'tricolour'
      ? ['#ff8a1e', '#f4f4f0', '#1fa83a'].map((c) => s.material('#f2f2ee', { emissive: c, emissiveIntensity: cableGlow, roughness: 0.4 }))
      : [s.material('#f2f2ee', { emissive: lightHex, emissiveIntensity: cableGlow, roughness: 0.4 })];
    const lampMat = s.material('#fff4d8', { emissive: '#ffd890', emissiveIntensity: mix(0.1, 2.2, night) });
    const waterCol = { calm: '#4a7884', swell: '#566660', lowtide: '#5f7a76' }[a.sea];
    const water = s.material(waterCol, { roughness: a.sea === 'calm' ? 0.12 : 0.4, metalness: 0.3 });

    const b = new Batch();
    const beam = (mat: THREE.Material, from: V3, to: V3, w: number, d: number) => {
      const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to), dir = B.clone().sub(A);
      const g = new THREE.BoxGeometry(w, dir.length(), d);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
      const mid = A.add(B).multiplyScalar(0.5);
      b.add(mat, g, [mid.x, mid.y, mid.z]);
    };
    const L = 180, deckY = 25, deckW = 30;
    // The sea.
    b.box(water, [L + 40, 0.6, 90], [0, -0.3, 0]);
    // Pylon footing and the two splayed legs that meet above the deck, then the single mast.
    b.box(concrete, [22, 7, 34], [0, 3.5, 0]);
    b.box(concrete, [24, 1, 36], [0, 0.5, 0]);
    for (const sz of [-1, 1]) {
      beam(concrete, [0, 6, sz * 9], [0, deckY - 3, sz * 18.5], 9, 4.6);
      beam(concrete, [0, deckY - 3.4, sz * 18.5], [0, 80, sz * 1.8], 7.5, 4);
    }
    b.box(concrete, [8, 3, 37], [0, deckY - 3.6, 0]);
    b.add(concrete, new THREE.CylinderGeometry(3.4, 5.4, 50, 4), [0, 102, 0], [0, Math.PI / 4, 0]);
    b.add(concrete, new THREE.CylinderGeometry(0.4, 3.4, 4, 4), [0, 129, 0], [0, Math.PI / 4, 0]);
    for (let y = 86; y < 126; y += 3.5) b.add(concrete, new THREE.CylinderGeometry(3.2 + (126 - y) * 0.03, 3.25 + (126 - y) * 0.03, 0.35, 4), [0, y, 0], [0, Math.PI / 4, 0]);
    // The deck girder, roadway, parapets and median.
    b.box(deckMat, [L, 3, deckW], [0, deckY - 1.5, 0]);
    b.box(asphalt, [L, 0.2, deckW - 1.4], [0, deckY + 0.1, 0]);
    for (const sz of [-1, 1]) b.box(deckMat, [L, 1.1, 0.5], [0, deckY + 0.55, sz * (deckW / 2 - 0.25)]);
    b.box(deckMat, [L, 0.9, 1.8], [0, deckY + 0.45, 0]);
    // Piers under the approach spans.
    for (const px of [-62, 62]) for (const sz of [-1, 1]) {
      b.cyl(concrete, 1.8, 2.1, deckY - 3, [px, (deckY - 3) / 2, sz * 7], 12);
      b.box(concrete, [5, 2, deckW - 4], [px, deckY - 4, 0]);
    }
    // Lamps along both parapets.
    for (let x = -L / 2 + 8; x < L / 2; x += 16) for (const sz of [-1, 1]) {
      b.cyl(deckMat, 0.15, 0.2, 10, [x, deckY + 5, sz * (deckW / 2 - 0.4)], 6);
      b.box(deckMat, [0.3, 0.3, 2], [x, deckY + 10, sz * (deckW / 2 - 1.2)]);
      b.box(lampMat, [0.6, 0.25, 0.8], [x, deckY + 9.8, sz * (deckW / 2 - 2)]);
    }
    // The harp of stay cables, two planes in the median.
    for (const sx of [-1, 1]) for (const pz of [-0.9, 0.9]) for (let k = 0; k < 12; k++) {
      const x = sx * (14 + k * 6.6), top = 84 + k * 3.5;
      const mat = cableMats.length > 1 ? cableMats[Math.min(2, Math.floor((11 - k) / 4))] : cableMats[0];
      b.rod(mat, [sx * 1.6, top, pz * 1.6], [x, deckY + 0.9, pz], 0.32, 5);
    }
    // The sea's state.
    const foam: { at: V3; size: number }[] = [];
    if (a.sea === 'swell') {
      for (let row = 0; row < 9; row++) for (let i = 0; i < 16; i++) { const x = -100 + row * 25 + (random() - 0.5) * 6, z = -42 + i * 5.4 + random() * 2; if (Math.abs(x) < 14 && Math.abs(z) < 20) continue; if (random() < 0.3) continue; foam.push({ at: [x + Math.sin(z * 0.1) * 4, 0.1, z], size: 1.2 + random() * 1.4 }); }
      for (let i = 0; i < 60; i++) foam.push({ at: [(random() - 0.5) * 26, 2 + random() * 9, (random() < 0.5 ? -1 : 1) * (17 + random() * 4)], size: 1.2 + random() * 2.5 });
    }
    if (a.sea === 'lowtide') {
      const mud = s.material('#6e6050', { roughness: 0.6, metalness: 0.1 });
      for (let i = 0; i < 9; i++) b.add(mud, new THREE.CylinderGeometry(1, 1, 0.5, 14), [(random() - 0.5) * 170, 0.1, (random() - 0.5) * 70], [0, random() * 3, 0], [8 + random() * 16, 1, 4 + random() * 8]);
      const rock = s.material('#3e3a36', { roughness: 0.9 });
      for (let i = 0; i < 40; i++) b.add(rock, new THREE.IcosahedronGeometry(1, 0), [(random() - 0.5) * 60, 0.3, (random() - 0.5) * 60], [random(), random(), random()], [1 + random() * 2, 0.6 + random(), 1 + random() * 2]);
    }
    b.flush(s, { uv: new Map<THREE.Material, (g: THREE.BufferGeometry) => void>([[asphalt, (g) => planarUV(g, deckW - 1.4)]]) });
    if (foam.length) s.scatter(new THREE.SphereGeometry(1, 8, 5).scale(1.1, 0.3, 3.2), new THREE.MeshStandardMaterial({ color: '#eef3f2', transparent: true, opacity: 0.75, roughness: 0.9 }), foam).castShadow = false;

    // Fishing boats at low tide (and one working the calm).
    const boats: THREE.Group[] = [];
    const boatCount = a.sea === 'lowtide' ? 5 : a.sea === 'calm' ? 1 : 0;
    for (let i = 0; i < boatCount; i++) {
      const g = new THREE.Group();
      const hull = s.material(['#2f6fb3', '#c8324a', '#e0a020', '#2f8a4a'][i % 4]);
      const shape = new THREE.Shape([new THREE.Vector2(-5, -1.2), new THREE.Vector2(3, -1.2), new THREE.Vector2(5.5, 0), new THREE.Vector2(3, 1.2), new THREE.Vector2(-5, 1.2)]);
      const hullMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false }).rotateX(-Math.PI / 2), hull);
      hullMesh.castShadow = true; g.add(hullMesh);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 5), s.material('#3a2a1a')); mast.position.set(0, 4, 0); g.add(mast);
      for (let f = 0; f < 3; f++) { const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshStandardMaterial({ color: ['#e8322a', '#f2a218', '#2f6fb3', '#f4f2ec'][(i + f) % 4], side: THREE.DoubleSide })); flag.position.set(0.6, 6.6 - f * 0.9, 0); g.add(flag); }
      const tarp = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 2), s.material('#2a4f8a')); tarp.position.set(-2, 1.6, 0); g.add(tarp);
      g.position.set(-60 + random() * 120, 0, (random() < 0.5 ? -1 : 1) * (22 + random() * 18));
      g.rotation.y = random() * Math.PI * 2;
      s.root.add(g); boats.push(g);
    }

    // Traffic.
    const lanes = [-13, -9.6, -6.2, -2.8, 2.8, 6.2, 9.6, 13];
    const cars: { x: number; z: number; taxi: boolean; colour: string; bus: boolean }[] = [];
    if (a.traffic === 'jam' || a.traffic === 'flowing') {
      const gap = a.traffic === 'jam' ? 6.2 : 22;
      for (const z of lanes) for (let x = -L / 2 + 3 + random() * gap; x < L / 2 - 3; x += gap * (a.traffic === 'jam' ? 0.9 + random() * 0.3 : 0.6 + random() * 1.4)) {
        if (random() < (a.traffic === 'jam' ? 0.08 : 0.35)) continue;
        const bus = a.traffic === 'flowing' && random() < 0.06;
        const taxi = !bus && random() < (a.traffic === 'jam' ? 0.55 : 0.35);
        cars.push({ x, z, taxi, bus, colour: bus ? '#c8202a' : taxi ? '#17181a' : ['#f2f2ee', '#c9ccd1', '#3a3d42', '#7a1f28', '#24406e', '#8c8f93'][Math.floor(random() * 6)] });
      }
    }
    const moving: { mesh: THREE.InstancedMesh; speed: number }[] = [];
    if (cars.length) {
      const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
      const bodies = new THREE.InstancedMesh(bodyGeo, s.material('#ffffff', { roughness: 0.45 }), cars.length);
      const cabins = new THREE.InstancedMesh(bodyGeo, s.material('#ffffff', { roughness: 0.4 }), cars.length);
      const m = new THREE.Matrix4();
      cars.forEach((c, i) => {
        const len = c.bus ? 11 : 4.1;
        m.makeScale(len, c.bus ? 3 : 1.1, c.bus ? 2.5 : 1.7).setPosition(c.x, deckY + 0.2 + (c.bus ? 1.6 : 0.65), c.z);
        bodies.setMatrixAt(i, m); bodies.setColorAt(i, new THREE.Color(c.colour));
        m.makeScale(c.bus ? 10.6 : 2.2, c.bus ? 0.6 : 0.75, c.bus ? 2.55 : 1.55).setPosition(c.x - (c.bus ? 0 : 0.2), deckY + 0.2 + (c.bus ? 2.3 : 1.55), c.z);
        cabins.setMatrixAt(i, m); cabins.setColorAt(i, new THREE.Color(c.taxi ? '#f2c21a' : c.bus ? '#efe3c4' : new THREE.Color(c.colour).multiplyScalar(0.85).getHexString().replace(/^/, '#')));
      });
      for (const mesh of [bodies, cabins]) { mesh.castShadow = true; mesh.receiveShadow = true; s.root.add(mesh); }
      bodies.instanceColor!.needsUpdate = true; cabins.instanceColor!.needsUpdate = true;
      if (a.traffic === 'flowing') { moving.push({ mesh: bodies, speed: 1 }, { mesh: cabins, speed: 1 }); }
      // Tail and head lights at dusk.
      const lightsPts = cars.flatMap((c) => [{ at: [c.x + (c.z > 0 ? -1 : 1) * (c.bus ? 5.6 : 2.1), deckY + 0.9, c.z] as V3, size: 0.35 }]);
      const tail = s.scatter(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: '#ff5040', emissive: '#ff2a1a', emissiveIntensity: mix(0.2, 2.2, night) }), lightsPts);
      tail.castShadow = false;
      if (a.traffic === 'flowing') moving.push({ mesh: tail, speed: 1 });
    }
    const people: ReturnType<typeof figure>[] = [];
    let bike: THREE.Group | null = null;
    if (a.traffic === 'motorbike') {
      bike = new THREE.Group();
      const dark = s.material('#1c1c1e'), red = s.material('#b8202a');
      for (const x of [-0.7, 0.7]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 6, 14), dark); w.position.set(x, 0.38, 0); w.castShadow = true; bike.add(w); }
      const tank = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 0.35), red); tank.position.set(0, 0.75, 0); tank.castShadow = true; bike.add(tank);
      const rider = figure(s, { height: 1.7, pose: 'sitting', style: 'doll', hair: 'cap', top: '#e8e2d4', bottom: '#2a2f3a', skin: '#8a5a3c' });
      rider.root.rotation.y = Math.PI / 2; rider.root.position.set(-0.1, 0.25, 0); bike.add(rider.root); people.push(rider);
      bike.scale.setScalar(1.6);
      bike.position.set(-20, deckY + 0.2, 6.2);
      s.root.add(bike);
    }

    // Weather around the mast.
    if (a.weather === 'smog' || mood.wear > 0.75) {
      const puffs: { at: V3; size: number }[] = [];
      for (let i = 0; i < 70; i++) { const t = random(); puffs.push({ at: [(random() - 0.5) * 200, 40 + t * 95, (random() - 0.5) * 70], size: 12 + random() * 16 }); }
      s.scatter(new THREE.IcosahedronGeometry(1, 2).scale(1.6, 0.6, 1), new THREE.MeshBasicMaterial({ color: '#b6a994', transparent: true, opacity: 0.1 + mood.wear * 0.06, depthWrite: false }), puffs).castShadow = false;
    }
    if (a.weather === 'cloud') {
      const puffs: { at: V3; size: number }[] = [];
      for (let i = 0; i < 70; i++) puffs.push({ at: [(random() - 0.5) * 90, 108 + random() * 22, (random() - 0.5) * 50], size: 7 + random() * 9 });
      s.scatter(new THREE.IcosahedronGeometry(1, 2).scale(1.4, 0.55, 1), new THREE.MeshStandardMaterial({ color: '#8f959a', transparent: true, opacity: 0.8, depthWrite: false, roughness: 1 }), puffs).castShadow = false;
      const drops: { at: V3; size: number }[] = [];
      for (let i = 0; i < 500; i++) drops.push({ at: [(random() - 0.5) * 120, random() * 110, (random() - 0.5) * 60], size: 1 });
      s.scatter(new THREE.BoxGeometry(0.18, 5, 0.18).rotateZ(0.1), new THREE.MeshBasicMaterial({ color: '#e0e6ea', transparent: true, opacity: 0.4, depthWrite: false }), drops).castShadow = false;
    }

    s.root.rotation.y = -0.52;
    const pace = mix(2, 14, mood.energy);
    return s.finish({
      update: (dt, time) => {
        for (const p of people) p.update(dt, time);
        if (bike) bike.position.x = -60 + ((time * pace * 1.5) % 120);
        for (const { mesh } of moving) mesh.position.x = Math.sin(time * 0.05 * pace) * 3;
        boats.forEach((g, i) => { g.position.y = Math.sin(time + i) * 0.15; g.rotation.z = Math.sin(time * 0.8 + i) * 0.04; });
      },
    });
  },
});
