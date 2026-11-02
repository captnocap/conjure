import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, figure, mix } from '@conjure/kit';

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = true) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};
const flat = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);
const Y = new THREE.Vector3(0, 1, 0);
/** A unit cylinder's matrix stretched from a to b. */
const segment = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
  const dir = b.clone().sub(a), len = dir.length();
  return new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize()), new THREE.Vector3(r, len, r));
};

const DECK = 36, TOP = 84, SADDLE = 81, REACH = 72, SAG_LOW = 38, HALF_SPAN = 243;
/** Main cable height at distance x from the tower: a parabola down to mid-span. */
const cableY = (x: number) => SAG_LOW + (SADDLE - SAG_LOW) * ((HALF_SPAN - Math.min(Math.abs(x), HALF_SPAN)) / HALF_SPAN) ** 2;
const PLANES = [-12.5, -4.2, 4.2, 12.5];

export default defineThing({
  questions: {
    era: choice('When do we see it?', {
      opening: 'May 1883, opening day: red, white and blue bunting on the tower and flags along its top.',
      forties: 'The 1940s: trolley tracks down the roadway and an old streetcar crossing.',
      today: 'Today: the clean granite and the timber promenade busy with walkers.',
      scaffold: 'Under repair: the tower caged in scaffolding and netting.',
    }),
    flag: choice('What flies from the tower top?', {
      flag: 'A single big American flag on a pole above the cornice.',
      nothing: 'Nothing: the bare granite cornice against the sky.',
      banner: 'A huge banner hung down the face of the tower over the arches.',
    }),
    weather: choice('What is the weather?', {
      clear: 'Clear: every cable and stay drawn sharp.',
      fog: 'River fog cutting the tower in half, the cables vanishing into white.',
      snow: 'Snow on the cornices, the deck and the promenade planks.',
      heat: 'July heat: bleached stone and a warm shimmering haze.',
    }),
    walkway: choice('What is happening on the promenade?', {
      crowd: 'Crowds of walkers and tourists along the raised promenade.',
      cyclists: 'Cyclists streaming along the bike lane.',
      empty: 'Empty at dawn: just planks and lamps.',
      lone: 'A lone figure leaning on the rail, looking out over the river.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.3) / 0.7));
    const heat = a.weather === 'heat';

    const coursing = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 256);
      for (let row = 0; row < 8; row++) {
        const off = row % 2 ? 32 : 0;
        for (let col = -1; col < 4; col++) {
          const t = 225 + Math.floor(random() * 30);
          c.fillStyle = `rgb(${t},${t - 4},${t - 10})`;
          c.fillRect(col * 64 + off + 2, row * 32 + 2, 60, 28);
        }
      }
      for (let i = 0; i < Math.round(mood.wear * 50); i++) { c.fillStyle = `rgba(60,55,45,${0.06 + random() * 0.14})`; c.fillRect(random() * 256, random() * 256, 4 + random() * 10, 20 + random() * 90); }
    });
    coursing.repeat.set(1 / 6, 1 / 6);
    const stone = s.material(heat ? '#d8cdb8' : '#b9ad97', { map: coursing, roughness: 0.92 });
    const stoneDark = s.material('#6f6555', { roughness: 0.92 });
    const steel = s.material('#3c4246', { metalness: 0.5, roughness: 0.5 });
    const girder = s.material('#545b60', { metalness: 0.4, roughness: 0.6 });
    const planks = s.material('#8a6c4a', { roughness: 0.9 });
    const road = s.material('#4d4f52', { roughness: 0.9 });

    const g = new THREE.Group();
    const add = (geos: THREE.BufferGeometry[], mat: THREE.Material) => { const m = new THREE.Mesh(mergeGeometries(geos.map(flat)), mat); m.castShadow = m.receiveShadow = true; g.add(m); return m; };

    // ---- The tower: its face extruded through the bridge, twin pointed arches over the roadways.
    const face = new THREE.Shape();
    face.moveTo(-20.5, 0); face.lineTo(20.5, 0); face.lineTo(19.6, DECK); face.lineTo(18.8, TOP); face.lineTo(-18.8, TOP); face.lineTo(-19.6, DECK); face.closePath();
    // Build the pointed arch outline explicitly from two arcs of radius w.
    const pointed = (zc: number, w = 10.4, spring = 59, path: THREE.Path = new THREE.Path()) => {
      const p = path;
      p.moveTo(zc - w / 2, DECK); p.lineTo(zc + w / 2, DECK); p.lineTo(zc + w / 2, spring);
      for (let i = 1; i <= 10; i++) { const an = (i / 10) * (Math.PI / 3); p.lineTo(zc - w / 2 + Math.cos(an) * w, spring + Math.sin(an) * w); }
      for (let i = 1; i <= 10; i++) { const an = Math.PI * 2 / 3 + (i / 10) * (Math.PI / 3); p.lineTo(zc + w / 2 + Math.cos(an) * w, spring + Math.sin(an) * w); }
      p.closePath();
      return p;
    };
    face.holes.push(pointed(-9.6), pointed(9.6));
    const towerGeo = new THREE.ExtrudeGeometry(face, { depth: 20, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, -10).rotateY(Math.PI / 2);
    add([towerGeo], stone);
    // Cornices, string courses, pilasters and the caisson footing.
    const trim: THREE.BufferGeometry[] = [
      new THREE.BoxGeometry(22, 2.2, 39.6).translate(0, TOP - 1.1, 0),
      new THREE.BoxGeometry(21, 1.2, 38.8).translate(0, TOP - 4.5, 0),
      new THREE.BoxGeometry(21.4, 1.4, 40.4).translate(0, DECK + 0.4, 0),
      new THREE.BoxGeometry(24, 4, 44).translate(0, 1, 0),
    ];
    for (const sx of [-1, 1]) for (const z of [-17.4, 0, 17.4]) trim.push(new THREE.BoxGeometry(0.9, TOP - DECK - 6, z === 0 ? 5 : 3).translate(sx * 10.3, (DECK + TOP - 6) / 2, z));
    // Blind pointed niches high on each pier face.
    for (const sx of [-1, 1]) for (const z of [-15.5, 0, 15.5]) {
      const niche = new THREE.Shape(); niche.moveTo(-1.1, 0); niche.lineTo(1.1, 0); niche.lineTo(1.1, 3.5); niche.lineTo(0, 5.2); niche.lineTo(-1.1, 3.5); niche.closePath();
      trim.push(new THREE.ExtrudeGeometry(niche, { depth: 0.4, bevelEnabled: false }).translate(z, 72.5, 0).rotateY(sx > 0 ? Math.PI / 2 : -Math.PI / 2).translate(sx * 10.05, 0, 0));
    }
    // Dark mouldings framing each pointed arch on both faces, so the openings read against the sky.
    for (const zc of [-9.6, 9.6]) for (const sx of [-1, 1]) {
      const frame = pointed(zc, 12.6, 59, new THREE.Shape()) as THREE.Shape;
      frame.holes.push(pointed(zc, 10.4, 59));
      trim.push(new THREE.ExtrudeGeometry(frame, { depth: 0.7, bevelEnabled: false, curveSegments: 4 }).rotateY(sx > 0 ? Math.PI / 2 : -Math.PI / 2).translate(sx * 10.0, 0, 0));
    }
    add(trim, stoneDark);

    // ---- Deck: two roadways, girders and a raised timber promenade, passing through the arches.
    const deckGeos: THREE.BufferGeometry[] = [], roadGeos: THREE.BufferGeometry[] = [], plankGeos: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      const x0 = side * 10, x1 = side * REACH, cx = (x0 + x1) / 2, len = Math.abs(x1 - x0);
      deckGeos.push(new THREE.BoxGeometry(len, 2.6, 27).translate(cx, DECK - 1.3, 0));
      for (const z of [-13.6, 13.6]) deckGeos.push(new THREE.BoxGeometry(len, 0.4, 0.4).translate(cx, DECK + 1.4, z));
      plankGeos.push(new THREE.BoxGeometry(len - 3, 0.35, 5).translate(cx, DECK + 5.2, 0));
      for (const z of [-2.6, 2.6]) deckGeos.push(new THREE.BoxGeometry(len - 3, 1.1, 0.12).translate(cx, DECK + 5.9, z));
      for (let x = Math.abs(x0) + 4; x < REACH; x += 6) for (const z of [-2.2, 2.2]) deckGeos.push(new THREE.BoxGeometry(0.4, 5, 0.4).translate(side * x, DECK + 2.6, z));
    }
    roadGeos.push(new THREE.BoxGeometry(REACH * 2 - 2, 0.2, 9).translate(0, DECK + 0.1, -8.4), new THREE.BoxGeometry(REACH * 2 - 2, 0.2, 9).translate(0, DECK + 0.1, 8.4));
    // Stiffening truss along both outer edges.
    const truss: THREE.Matrix4[] = [];
    for (const z of [-13.6, 13.6]) for (const side of [-1, 1]) for (let x = 11; x < REACH - 3; x += 3) {
      const a0 = new THREE.Vector3(side * x, DECK - 2.6, z), b0 = new THREE.Vector3(side * (x + 3), DECK + 1.4, z);
      truss.push(segment(a0, b0, 0.15), segment(new THREE.Vector3(side * (x + 3), DECK - 2.6, z), new THREE.Vector3(side * (x + 3), DECK + 1.4, z), 0.15));
    }

    // ---- Cables: the four main cables in catenaries, diagonal stays from the tower top, vertical suspenders.
    const cableGeos: THREE.BufferGeometry[] = [];
    const lampPoints: THREE.Vector3[] = [];
    for (const z of PLANES) for (const side of [-1, 1]) {
      const pts: THREE.Vector3[] = [];
      for (let x = 9; x <= REACH; x += 3) pts.push(new THREE.Vector3(side * x, cableY(x), z));
      cableGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.45, 8));
      for (let x = 14; x <= REACH; x += 6) lampPoints.push(new THREE.Vector3(side * x, cableY(x) + 0.6, z));
    }
    // Saddles on the tower top.
    for (const z of PLANES) cableGeos.push(new THREE.BoxGeometry(20.5, 1.4, 1.6).translate(0, SADDLE, z));
    const rods: THREE.Matrix4[] = [];
    for (const z of PLANES) for (const side of [-1, 1]) {
      for (let x = 13; x <= REACH; x += 4.5) rods.push(segment(new THREE.Vector3(side * x, DECK + 1.4, z), new THREE.Vector3(side * x, cableY(x), z), 0.09));
      for (let k = 0; k < 6; k++) {
        const x = 18 + k * 9;
        rods.push(segment(new THREE.Vector3(side * 10.2, SADDLE - 1, z), new THREE.Vector3(side * x, DECK + 1.4, z * (1 - 0.04 * k)), 0.09));
      }
    }
    add(cableGeos, steel);
    const unit = new THREE.CylinderGeometry(1, 1, 1, 6);
    const rodMesh = new THREE.InstancedMesh(unit, steel, rods.length + truss.length);
    [...rods, ...truss].forEach((m, i) => rodMesh.setMatrixAt(i, m));
    rodMesh.instanceMatrix.needsUpdate = true;
    rodMesh.castShadow = true;
    g.add(rodMesh);
    add(deckGeos, girder);
    add(roadGeos, road);
    add(plankGeos, planks);

    // Lamps along the cables and the promenade light with low daylight.
    const lampMat = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd27a', emissiveIntensity: mix(0.05, 2.4, night) });
    for (let x = 14; x < REACH; x += 8) for (const side of [-1, 1]) lampPoints.push(new THREE.Vector3(side * x, DECK + 8.2, 2.4));
    const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 8, 6), lampMat, lampPoints.length);
    lampPoints.forEach((p, i) => lamps.setMatrixAt(i, new THREE.Matrix4().setPosition(p)));
    lamps.instanceMatrix.needsUpdate = true;
    g.add(lamps);

    const updates: ((time: number) => void)[] = [];

    // ---- Era dressing.
    if (a.era === 'opening') {
      const bunting = canvasTexture(256, 128, (c) => {
        c.clearRect(0, 0, 256, 128);
        const cols = ['#c8102e', '#f4f2ec', '#1b2a55'];
        for (let i = 0; i < 3; i++) { c.fillStyle = cols[i]; c.beginPath(); c.arc(128, 0, 128 - i * 36, 0, Math.PI); c.fill(); }
      }, false);
      const swag = new THREE.MeshStandardMaterial({ map: bunting, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 });
      for (const sx of [-1, 1]) for (const z of [-17.4, 0, 17.4]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), swag);
        m.position.set(sx * 11, DECK + 12, z); m.rotation.y = sx * Math.PI / 2;
        g.add(m);
      }
      const flagCols = ['#c8102e', '#1b2a55', '#f4f2ec', '#c8102e', '#1b2a55', '#f4f2ec', '#c8102e'];
      for (let i = 0; i < 7; i++) {
        const z = -16 + i * 5.33;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), steel); pole.position.set(0, TOP + 3.5, z); g.add(pole);
        const f = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2), s.material(flagCols[i], { side: THREE.DoubleSide })); f.position.set(1.6, TOP + 5.8, z); g.add(f);
        updates.push((time) => { f.rotation.y = Math.sin(time * (1.5 + mood.energy * 3) + i) * 0.35; });
      }
    } else if (a.era === 'forties') {
      const rail = s.material('#2a2c2e', { metalness: 0.7, roughness: 0.4 });
      const rails: THREE.BufferGeometry[] = [];
      for (const z of [-9.9, -8.5, 8.5, 9.9]) rails.push(new THREE.BoxGeometry(REACH * 2 - 2, 0.15, 0.15).translate(0, DECK + 0.28, z));
      add(rails, rail);
      const car = new THREE.Group();
      const green = s.material('#3f6b4a'), cream = s.material('#e6dcc0');
      const glass = new THREE.MeshStandardMaterial({ color: '#c9e0e8', emissive: '#ffd890', emissiveIntensity: night * 1.2, transparent: true, opacity: 0.55 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(14, 2.4, 2.6), green); body.position.y = 1.5;
      const band = new THREE.Mesh(new THREE.BoxGeometry(14.1, 1.1, 2.65), glass); band.position.y = 3.2;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.5, 2.4), cream); roof.position.y = 4;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 5), steel); pole.position.set(-3, 5.6, 0); pole.rotation.z = 0.9;
      car.add(body, band, roof, pole);
      car.traverse((n) => { (n as THREE.Mesh).castShadow = true; });
      car.position.set(-34, DECK + 0.2, -9.2);
      g.add(car);
      updates.push((time) => { car.position.x = -34 + ((time * 2.5 * (0.3 + mood.energy)) % 20); });
    } else if (a.era === 'scaffold') {
      const pipe = s.material('#c3c6c8', { metalness: 0.5, roughness: 0.4 });
      const net = s.material('#3f6d8a', { transparent: true, opacity: 0.4, side: THREE.DoubleSide });
      const bars: THREE.Matrix4[] = [];
      for (const sx of [-1, 1]) {
        for (let z = -20; z <= 20.01; z += 2.5) bars.push(new THREE.Matrix4().makeScale(0.25, TOP - DECK + 4, 0.25).setPosition(sx * 12, (TOP + DECK) / 2 + 2, z));
        for (let y = DECK + 2; y <= TOP + 4; y += 3) bars.push(new THREE.Matrix4().makeScale(0.25, 0.25, 40).setPosition(sx * 12, y, 0));
      }
      const cage = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), pipe, bars.length);
      bars.forEach((m, i) => cage.setMatrixAt(i, m));
      cage.instanceMatrix.needsUpdate = true; cage.castShadow = true;
      g.add(cage);
      for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 26), net); m.position.set(sx * 12.2, TOP - 12, 0); m.rotation.y = Math.PI / 2; g.add(m); }
    }

    // ---- What flies from the top.
    if (a.flag === 'flag') {
      const stars = canvasTexture(190, 100, (c) => {
        for (let i = 0; i < 13; i++) { c.fillStyle = i % 2 ? '#f4f2ec' : '#c8102e'; c.fillRect(0, i * 100 / 13, 190, 100 / 13 + 1); }
        c.fillStyle = '#1b2a55'; c.fillRect(0, 0, 76, 54);
        c.fillStyle = '#f4f2ec'; for (let i = 0; i < 30; i++) c.fillRect(4 + (i % 6) * 12, 4 + Math.floor(i / 6) * 10, 3, 3);
      }, false);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 14, 8), steel); pole.position.set(0, TOP + 7, 0); g.add(pole);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 5, 10, 1), new THREE.MeshStandardMaterial({ map: stars, side: THREE.DoubleSide, roughness: 0.8 }));
      cloth.position.set(0, TOP + 11.3, 4.75); cloth.rotation.y = -Math.PI / 2;
      g.add(cloth);
      const pos = cloth.geometry.attributes.position as THREE.BufferAttribute, base = Float32Array.from(pos.array as Float32Array);
      updates.push((time) => { for (let i = 0; i < pos.count; i++) { const x = base[i * 3]; pos.setZ(i, Math.sin(x * 0.7 - time * (2 + mood.energy * 4)) * (x + 4.75) * 0.1); } pos.needsUpdate = true; });
    } else if (a.flag === 'banner') {
      const words = ['WELCOME', 'BROOKLYN', 'PEACE', 'HOPE', 'NEW YORK'][Math.floor(random() * 5)];
      const map = canvasTexture(128, 512, (c) => {
        c.fillStyle = mood.cheer > 0.5 ? '#c8102e' : '#1b2a55'; c.fillRect(0, 0, 128, 512);
        c.fillStyle = '#f4f2ec'; c.font = 'bold 64px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        [...words].forEach((ch, i, all) => c.fillText(ch, 64, 512 * (i + 0.5) / all.length, 120));
      }, false);
      for (const sx of [-1, 1]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 30), new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide }));
        m.position.set(sx * 11.2, TOP - 18, 0); m.rotation.y = sx * Math.PI / 2;
        g.add(m);
      }
    }

    // ---- The promenade.
    const people: THREE.Matrix4[] = [], colours: THREE.Color[] = [];
    const palette = ['#c8102e', '#f4f2ec', '#1f5fd1', '#f4d40c', '#34363a', '#2f9e44', '#ee7a12'];
    const walkers = a.walkway === 'crowd' ? 40 + Math.round(mood.density * 60) : a.walkway === 'cyclists' ? 14 + Math.round(mood.density * 16) : 0;
    for (let i = 0; i < walkers; i++) {
      const side = random() < 0.5 ? -1 : 1, x = side * (14 + random() * (REACH - 18)), z = (random() - 0.5) * 3.8;
      people.push(new THREE.Matrix4().makeRotationY(a.walkway === 'cyclists' ? 0 : random() * 6).setPosition(x, DECK + 5.4, z));
      colours.push(new THREE.Color(palette[Math.floor(random() * palette.length)]));
    }
    if (walkers) {
      const shape = a.walkway === 'cyclists'
        ? mergeGeometries([new THREE.BoxGeometry(1.7, 0.7, 0.15).translate(0, 0.45, 0), new THREE.CapsuleGeometry(0.25, 0.7, 2, 6).translate(0, 1.3, 0)].map(flat))
        : new THREE.CapsuleGeometry(0.3, 1.1, 2, 6).translate(0, 0.85, 0);
      const crowd = new THREE.InstancedMesh(shape, s.material('#ffffff'), walkers);
      people.forEach((m, i) => { crowd.setMatrixAt(i, m); crowd.setColorAt(i, colours[i]); });
      crowd.instanceMatrix.needsUpdate = true;
      if (crowd.instanceColor) crowd.instanceColor.needsUpdate = true;
      g.add(crowd);
    }
    if (a.walkway === 'lone') {
      const person = figure(s, { height: 1.75, pose: 'leaning', style: 'doll', hair: 'hat', top: '#2b3a4a', bottom: '#34363a' });
      s.root.remove(person.root);
      person.root.position.set(24, DECK + 5.4, 2);
      person.root.rotation.y = Math.PI / 2;
      person.root.scale.setScalar(1.6);
      g.add(person.root);
      updates.push((time) => person.update(0.016, time));
    }

    // ---- Weather.
    if (a.weather === 'snow') {
      const snow = s.material('#f5f7fa', { roughness: 0.95 });
      add([
        new THREE.BoxGeometry(21.6, 0.6, 39.2).translate(0, TOP + 0.3, 0),
        new THREE.BoxGeometry(REACH * 2 - 2, 0.3, 26).translate(0, DECK + 0.35, 0),
        new THREE.BoxGeometry(REACH * 2 - 4, 0.25, 5).translate(0, DECK + 5.5, 0),
        new THREE.BoxGeometry(21.6, 0.5, 40.6).translate(0, DECK + 1.3, 0),
      ], snow);
    }
    if (a.weather === 'fog' || heat) {
      const puff = new THREE.MeshStandardMaterial({ color: heat ? '#f4e2c4' : '#eef0f1', transparent: true, opacity: heat ? 0.3 : 0.78, depthWrite: false, roughness: 1 });
      const n = heat ? 10 : 26;
      const cloud = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8).scale(1.6, 0.5, 1), puff, n);
      for (let i = 0; i < n; i++) {
        const sz = 10 + random() * 12;
        cloud.setMatrixAt(i, new THREE.Matrix4().makeScale(sz, sz, sz).setPosition((random() - 0.5) * 130, heat ? 8 + random() * 30 : 46 + random() * 20, (random() - 0.5) * 50));
      }
      cloud.instanceMatrix.needsUpdate = true;
      g.add(cloud);
      updates.push((time) => { cloud.position.x = Math.sin(time * 0.05) * 6 * (0.3 + mood.energy); });
    }

    // The arch face (+x) turned about 35 degrees off the front, so the arches and the fan of cables both read.
    g.rotation.y = -55 * Math.PI / 180;
    s.root.add(g);
    return s.finish({ footprint: 40, update: (_dt, time) => { for (const fn of updates) fn(time); } });
  },
});
