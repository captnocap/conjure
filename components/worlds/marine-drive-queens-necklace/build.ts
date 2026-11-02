import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, figure, mix, visibleBounds } from '@conjure/kit';
import { Batch, canvasTexture } from './parts';

type V3 = [number, number, number];

// The curve of Back Bay: a circle of radius R; phi runs from the near end (0) round to Nariman Point,
// d is the distance outward from the sea wall toward the city (negative is the sea).
const R = 420, CZ = 6, PHI_END = 1.02;
const WATER_Y = -3.2;
const at = (phi: number, d: number, y = 0): V3 => [R - (R + d) * Math.cos(phi), y, CZ - (R + d) * Math.sin(phi)];
/** rotation.y that turns a thing's +z toward the sea at phi. */
const toSea = (phi: number) => Math.atan2(Math.cos(phi), Math.sin(phi));

const PALETTES = {
  cream: ['#efe3c4', '#e9dcc0', '#f2ead8', '#e4d3b0', '#ece0c8'],
  pastel: ['#e8c9c0', '#cfe0d0', '#c9d8e4', '#efe0b8', '#e6cfd8', '#d8e4c8'],
  ochre: ['#e0b878', '#d8a868', '#e8c890', '#c99a60', '#e6d0a0'],
} as const;

/** A flat band along the curve, uvs in metres (u along the curve, v across it). */
function strip(d0: number, d1: number, phi0: number, phi1: number, y: number, segments: number, uMetres: number, vMetres: number) {
  const pos: number[] = [], uv: number[] = [], index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const phi = mix(phi0, phi1, i / segments);
    for (const d of [d0, d1]) {
      const p = at(phi, d, y);
      pos.push(...p);
      uv.push((R * phi) / uMetres, d / vMetres);
    }
    if (i < segments) { const k = i * 2; index.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) { g.setIndex(index.map((_v, k) => index[k - (k % 3) + [0, 2, 1][k % 3]])); g.computeVertexNormals(); }
  return g;
}

/** Local planar uvs in metres before a geometry is placed: u along x (or z on side faces), v up. */
function localUV(g: THREE.BufferGeometry, su: number, sv: number, offset: number) {
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    const u = ny > 0.9 ? p.getX(i) : nx > nz ? p.getZ(i) : p.getX(i);
    uv[i * 2] = u / su + offset; uv[i * 2 + 1] = (ny > 0.9 ? p.getZ(i) : p.getY(i)) / sv;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export default defineWorld({
  questions: {
    season: choice('What is the season and weather?', {
      glare: 'Pre-monsoon glare: a white-hot hazy sky, heavy air, the sea flat and dazzling.',
      downpour: 'A monsoon downpour: slate clouds, rain sheeting in, waves bursting white over the tetrapods.',
      after: 'Just after the rain: torn clouds, a washed gold light, the promenade shining with reflections.',
      smog: 'Winter smog: a brown-grey veil, the far towers fraying into it, a dull orange sun.',
    }),
    occasion: choice('What is the occasion?', {
      ordinary: 'An ordinary evening: the city simply coming out to the sea.',
      ganesh: 'Ganesh Chaturthi: dense crowds, a towering idol on a lorry heading for the sea, clouds of pink gulal.',
      cricket: 'A cricket victory: crowds waving tricolour flags, an open-top bus crawling along the drive.',
      dawn: 'A deserted dawn: the drive empty, the last lamps still burning, one or two joggers.',
    }),
    people: choice('Who is on the promenade and the wall?', {
      couples: 'Couples sitting close on the sea wall, backs to the city, facing the water.',
      walkers: 'Evening walkers and joggers streaming along the promenade.',
      families: 'Families with children, a balloon seller, snack hawkers.',
      nobody: 'Almost nobody: an empty sweep of paving.',
    }),
    sea: choice('What is the sea doing?', {
      calm: 'Calm and glassy, gently lapping the tetrapods.',
      choppy: 'Choppy, flecked with white horses across the bay.',
      bursting: 'Big waves bursting over the tetrapods and spraying the promenade.',
      lowtide: 'Low tide: the tetrapods bare to their feet, black rocks and wet sand showing.',
    }),
    facades: choice('What colours are the Art Deco blocks?', {
      cream: 'Cream and ivory, sober and elegant.',
      pastel: 'Faded pastels: salmon pink, mint, powder blue, lemon.',
      ochre: 'Ochre, sand and honey, warm as old photographs.',
    }),
    lamps: choice('What light do the necklace lamps give?', {
      sodium: 'The classic sodium gold that made it the Queen\'s Necklace.',
      led: 'Cold white LED, the brief modern experiment the city hated.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const root = s.root;
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.3) / 0.7));
    const dusk = mood.daylight >= 0.5;
    const storm = a.season === 'downpour';
    const wet = storm || a.season === 'after';
    const smog = a.season === 'smog';
    const haze = Math.min(1, (smog ? 0.75 : a.season === 'glare' ? 0.45 : storm ? 0.55 : 0.12) + mood.wear * 0.25);
    const lampHex = a.lamps === 'sodium' ? '#ffb43c' : '#eef4ff';
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // ---- Sky and light.
    const skyTop = new THREE.Color({ glare: '#b8c6d0', downpour: '#5c646c', after: '#7fa0c0', smog: '#a49c8c' }[a.season])
      .lerp(new THREE.Color('#2c3458'), night * (storm ? 0.4 : 0.7));
    const skyLow = new THREE.Color({ glare: '#f2eee2', downpour: '#8a9094', after: '#f0d2a0', smog: '#c8b498' }[a.season])
      .lerp(new THREE.Color(dusk ? '#f08a50' : '#e8a888'), night * (storm ? 0.25 : 0.55 + mood.warmth * 0.3));
    const hazeColour = skyLow.clone().lerp(new THREE.Color('#b0a898'), smog ? 0.4 : 0.1);
    const background = skyTop.clone().lerp(skyLow, 0.55);
    const skyMap = canvasTexture(16, 256, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, `#${skyTop.getHexString()}`); g.addColorStop(0.72, `#${skyLow.getHexString()}`); g.addColorStop(1, `#${skyLow.clone().lerp(new THREE.Color('#ffffff'), 0.2).getHexString()}`);
      c.fillStyle = g; c.fillRect(0, 0, 16, 256);
    }, false);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(5200, 1500), new THREE.MeshBasicMaterial({ map: skyMap, fog: false }));
    sky.position.set(400, 560, -1500); sky.lookAt(0, 560, 0);
    root.add(sky);
    // Clouds: slate for the monsoon, torn and lit after the rain.
    if (storm || a.season === 'after') {
      const cloudMap = canvasTexture(512, 256, (c) => {
        c.clearRect(0, 0, 512, 256);
        for (let i = 0; i < (storm ? 160 : 70); i++) {
          const x = random() * 512, y = random() * (storm ? 200 : 150), r = 20 + random() * 60;
          const g = c.createRadialGradient(x, y, 0, x, y, r);
          const col = storm ? '70,76,84' : random() < 0.5 ? '255,220,170' : '150,150,165';
          g.addColorStop(0, `rgba(${col},0.55)`); g.addColorStop(1, `rgba(${col},0)`);
          c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
        }
      }, false);
      const clouds = new THREE.Mesh(new THREE.PlaneGeometry(4600, 1000), new THREE.MeshBasicMaterial({ map: cloudMap, transparent: true, depthWrite: false }));
      clouds.position.set(400, 620, -1400); clouds.lookAt(0, 620, 0);
      root.add(clouds);
    }
    // The sun (or its smog-dulled disc) low over the sea at the ends of the day.
    if (!storm && lowSun > 0.4) {
      const sun = new THREE.Mesh(new THREE.CircleGeometry(38, 32), new THREE.MeshBasicMaterial({ color: smog ? '#e88a4a' : '#ffd6a0', transparent: true, opacity: smog ? 0.7 : 0.9, depthWrite: false }));
      sun.position.set(dusk ? 900 : -500, 60 + (1 - lowSun) * 260, -1450); sun.lookAt(0, 60, 0);
      root.add(sun);
    }
    root.add(new THREE.HemisphereLight(skyTop.clone().lerp(new THREE.Color('#ffffff'), 0.35), '#5a5550', (storm ? 1.5 : 1.2) - night * 0.4));
    const sunCol = new THREE.Color().setHSL(mix(0.6, 0.08, mood.warmth) - lowSun * 0.02, 0.3 + lowSun * 0.35, 0.82 - night * 0.15);
    const key = new THREE.DirectionalLight(sunCol, (storm ? 0.9 : smog ? 1.6 : 2.5) - night * 0.8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.05;
    const sunX = dusk ? 60 : -50;
    key.position.set(sunX * (0.4 + lowSun), 14 + (1 - lowSun) * 50, -10);
    key.target.position.set(-5, 0, 0);
    const sh = key.shadow.camera;
    sh.left = -45; sh.right = 45; sh.top = 45; sh.bottom = -45; sh.near = 1; sh.far = 260;
    root.add(key, key.target);
    const cityGlow = new THREE.DirectionalLight(new THREE.Color(lampHex), night * 0.7);
    cityGlow.position.set(-40, 20, 30);
    root.add(cityGlow);

    // ---- Materials.
    const pavingMap = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const g = 205 + Math.floor(random() * 40); c.fillStyle = `rgb(${g},${g - 4},${g - 10})`; c.fillRect(i * 64 + 1, j * 64 + 1, 62, 62); }
      for (let i = 0; i < 40 + mood.wear * 80; i++) { c.fillStyle = `rgba(60,55,50,${0.05 + random() * 0.12})`; c.beginPath(); c.ellipse(random() * 256, random() * 256, 4 + random() * 20, 3 + random() * 10, random() * 3, 0, 7); c.fill(); }
    });
    const paving = s.material(wet ? '#8e8a84' : '#c2bbae', { map: pavingMap, roughness: wet ? 0.12 : 0.85, metalness: wet ? 0.35 : 0 });
    const roadMap = canvasTexture(64, 256, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 64, 256);
      c.fillStyle = '#e8e2d0';
      for (const y of [64, 128, 192]) for (let x = 0; x < 64; x += 32) c.fillRect(x, y - 1, 18, 3);
      c.fillStyle = '#d8b040'; c.fillRect(0, 126, 64, 4);
    });
    const asphalt = s.material(wet ? '#3a3c40' : '#5a5a5c', { map: roadMap, roughness: wet ? 0.1 : 0.85, metalness: wet ? 0.35 : 0 });
    const concrete = s.material(new THREE.Color('#9a968e').lerp(new THREE.Color('#5a5850'), mood.wear * 0.5), { roughness: 0.9 });
    const tetraMat = s.material(new THREE.Color('#8c8a84').lerp(new THREE.Color('#4a4a46'), (wet ? 0.35 : 0) + mood.wear * 0.3), { roughness: wet ? 0.35 : 0.95 });
    const kerb = s.material('#d8d2c4', { roughness: 0.8 });
    const land = s.material('#8c8478', { roughness: 0.95 });

    const b = new Batch();
    // ---- Near ground: the promenade, the wall, the road.
    const ground = s.mesh(strip(0.4, 10, -0.06, PHI_END + 0.02, 0, 160, 4, 4), paving);
    ground.castShadow = false;
    s.mesh(strip(10, 10.4, -0.06, PHI_END + 0.02, 0.0, 120, 4, 4), kerb).castShadow = false;
    s.mesh(strip(10.4, 25, -0.06, PHI_END + 0.02, -0.12, 140, 24, 14.6), asphalt).castShadow = false;
    s.mesh(strip(25, 26, -0.06, PHI_END + 0.02, 0.0, 120, 4, 4), kerb).castShadow = false;
    s.mesh(strip(26, 420, -0.08, PHI_END + 0.1, -0.02, 60, 40, 40), land).castShadow = false;
    for (let i = 0; i < 150; i++) {
      const phi = mix(-0.06, PHI_END + 0.02, (i + 0.5) / 150), len = (R * (PHI_END + 0.08)) / 150 + 0.05;
      const p = at(phi, 0), rot = toSea(phi);
      b.add(concrete, new THREE.BoxGeometry(1.0, 0.85, len), [p[0], 0.42, p[2]], [0, rot + Math.PI / 2, 0]);
      const q = at(phi, -0.6);
      b.add(concrete, new THREE.BoxGeometry(0.4, -WATER_Y + 1, len), [q[0], (WATER_Y - 1) / 2, q[2]], [0, rot + Math.PI / 2, 0]);
    }
    // A low divider down the road.
    for (let i = 0; i < 80; i++) { const phi = mix(-0.05, PHI_END, (i + 0.5) / 80), p = at(phi, 17.7); b.add(kerb, new THREE.BoxGeometry(0.5, 0.35, R * (PHI_END + 0.05) / 80), [p[0], 0.05, p[2]], [0, toSea(phi) + Math.PI / 2, 0]); }

    // ---- The sea, its tetrapods and its state.
    const tide = a.sea === 'lowtide' ? -2.2 : storm || a.sea === 'bursting' ? 0.6 : 0;
    const seaY = WATER_Y + tide;
    const seaCol = new THREE.Color({ glare: '#7a8c8a', downpour: '#4e5a58', after: '#5a7880', smog: '#6e7270' }[a.season]).lerp(new THREE.Color('#1c2434'), night * 0.55);
    const rippleMap = canvasTexture(512, 512, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 512, 512);
      const n = a.sea === 'calm' ? 220 : 520;
      for (let i = 0; i < n; i++) {
        const x = random() * 512, y = random() * 512, w = 10 + random() * 40;
        c.strokeStyle = `rgba(${random() < 0.5 ? '255,255,255' : '110,125,130'},${0.2 + random() * 0.3})`; c.lineWidth = 1 + random() * (a.sea === 'calm' ? 1 : 3);
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w / 2, y - 3, x + w, y); c.stroke();
      }
    });
    rippleMap.repeat.set(40, 40);
    const water = s.mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: seaCol, map: rippleMap, roughness: a.sea === 'calm' || a.season === 'glare' ? 0.12 : 0.4, metalness: 0.35 }), [300, seaY, -600]);
    water.rotation.x = -Math.PI / 2; water.castShadow = false;
    // Tetrapods: four-legged concrete armour heaped below the wall.
    const legs = [new THREE.Vector3(1, 1, 1), new THREE.Vector3(-1, -1, 1), new THREE.Vector3(-1, 1, -1), new THREE.Vector3(1, -1, -1)].map((v) => v.normalize());
    const tetraGeo = mergeGeometries(legs.map((v) => {
      const g = new THREE.CylinderGeometry(0.16, 0.36, 0.9, 5, 1, true).translate(0, 0.45, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v));
      return g.toNonIndexed();
    }));
    const tetras: THREE.Matrix4[] = [];
    for (let i = 0; i < 640; i++) {
      const t = Math.pow(random(), 1.8);
      const phi = mix(-0.05, PHI_END, t), d = -1.2 - random() * 7;
      const p = at(phi, d);
      const y = mix(WATER_Y + 1.6, WATER_Y - 1.2, (-d - 1.2) / 7) + random() * 0.6;
      const size = 1.5 + random() * 0.7;
      tetras.push(new THREE.Matrix4().compose(new THREE.Vector3(p[0], y, p[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6)), new THREE.Vector3(size, size, size)));
    }
    const tetraMesh = new THREE.InstancedMesh(tetraGeo, tetraMat, tetras.length);
    tetras.forEach((m, i) => tetraMesh.setMatrixAt(i, m));
    tetraMesh.castShadow = tetraMesh.receiveShadow = true;
    root.add(tetraMesh);
    if (a.sea === 'lowtide') {
      s.mesh(strip(-30, -6, -0.06, PHI_END, WATER_Y - 0.8, 80, 10, 10), s.material('#6e6252', { roughness: 0.35, metalness: 0.2 })).castShadow = false;
      const rocks: { at: V3; size: number }[] = [];
      for (let i = 0; i < 160; i++) { const phi = Math.pow(random(), 2) * 0.5, p = at(phi, -9 - random() * 18); rocks.push({ at: [p[0], WATER_Y - 0.8, p[2]], size: 0.4 + random() * 1.2 }); }
      s.scatter(new THREE.IcosahedronGeometry(1, 0).scale(1, 0.5, 1), s.material('#2e2c2a', { roughness: 0.5 }), rocks);
    }
    const foam: { at: V3; size: number }[] = [];
    if (a.sea === 'choppy' || storm) for (let i = 0; i < 220; i++) { const x = (random() - 0.2) * 700, z = -40 - random() * 600; foam.push({ at: [x, seaY + 0.05, z], size: 1 + random() * 2 }); }
    if (a.sea !== 'lowtide' && a.sea !== 'calm') for (let i = 0; i < 150; i++) { const phi = Math.pow(random(), 1.5) * PHI_END, p = at(phi, -8 - random() * 6); foam.push({ at: [p[0], seaY + 0.1, p[2]], size: 0.5 + random() * 1.1 }); }
    if (foam.length) s.scatter(new THREE.SphereGeometry(1, 8, 4).scale(2.2, 0.15, 0.7), new THREE.MeshStandardMaterial({ color: '#eef2f0', transparent: true, opacity: 0.7, roughness: 0.9, depthWrite: false }), foam).castShadow = false;
    // Bursting waves: white spray thrown over the wall.
    const sprays: { mesh: THREE.InstancedMesh; phase: number }[] = [];
    if (a.sea === 'bursting' || storm) {
      const sprayMat = new THREE.MeshStandardMaterial({ color: '#f4f7f7', transparent: true, opacity: 0.5, roughness: 0.9, depthWrite: false });
      for (const phi of [0.03, 0.11, 0.24]) {
        const pts: { at: V3; size: number }[] = [];
        const big = phi < 0.1 ? 1 : 2.2;
        for (let i = 0; i < 34; i++) {
          const t = random(), p = at(phi + (random() - 0.5) * 0.01, -3 - random() * 4 + t * 2.5);
          pts.push({ at: [p[0], seaY + 0.5 + t * (4 + mood.energy * 5) * big, p[2]], size: (0.35 + random() * 0.8) * big * (1 - t * 0.5) });
        }
        const m = s.scatter(new THREE.IcosahedronGeometry(1, 1), sprayMat, pts);
        m.castShadow = false;
        sprays.push({ mesh: m, phase: random() * 6 });
      }
    }
    // Reflections of the necklace on the water at night.
    if (night > 0.05) {
      const streakMap = canvasTexture(1024, 128, (c) => {
        c.clearRect(0, 0, 1024, 128);
        for (let i = 0; i < 220; i++) {
          const x = random() * 1024, w = 2 + random() * 4;
          const g = c.createLinearGradient(0, 128, 0, 0);
          g.addColorStop(0, lampHex); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = g; c.globalAlpha = 0.4 + random() * 0.5;
          for (let y = 128; y > 128 - 40 - random() * 88; y -= 5) c.fillRect(x + Math.sin(y * 0.3 + i) * 2, y, w, 3);
        }
      }, false);
      const refl = s.mesh(strip(-80, -6, -0.03, PHI_END, seaY + 0.06, 80, R * (PHI_END + 0.03), 74), new THREE.MeshBasicMaterial({ map: streakMap, transparent: true, opacity: night * 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
      refl.geometry.attributes.uv.array.forEach((_v, k, arr) => { if (k % 2 === 1) (arr as Float32Array)[k] = ((arr as Float32Array)[k] * 74 + 80) / 74; });
      refl.geometry.attributes.uv.needsUpdate = true;
      refl.castShadow = refl.receiveShadow = false;
    }

    // ---- The necklace: lamps along the promenade's sea edge and the road median, coming on one by one.
    const lampPoles: THREE.Matrix4[] = [], lit: V3[] = [], unlit: V3[] = [], glows: { at: V3; size: number }[] = [];
    const cam = new THREE.Vector3(-4.8, 7, 22);
    const lampAt = (phi: number, d: number, armOut: number) => {
      const p = at(phi, d), rot = toSea(phi);
      lampPoles.push(new THREE.Matrix4().compose(new THREE.Vector3(p[0], 0, p[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot + (armOut > 0 ? 0 : Math.PI), 0)), new THREE.Vector3(1, 1, 1)));
      const hx = p[0] + Math.cos(phi) * 1.4 * armOut, hz = p[2] + Math.sin(phi) * 1.4 * armOut;
      const head: V3 = [hx, 9.1, hz];
      const on = night > 0.02 && night * 1.25 > 0.08 + random() * 0.9;
      (on ? lit : unlit).push(head);
      if (on) glows.push({ at: head, size: 0.3 + cam.distanceTo(new THREE.Vector3(...head)) * 0.0035 });
    };
    for (let phi = 0.018; phi < PHI_END; phi += 22 / R) lampAt(phi, 1.4, -1);
    for (let phi = 0.02; phi < PHI_END; phi += 30 / R) lampAt(phi, 17.7, 1);
    const poleGeo = mergeGeometries([
      new THREE.CylinderGeometry(0.09, 0.16, 9.2, 8).translate(0, 4.6, 0).toNonIndexed(),
      new THREE.CylinderGeometry(0.28, 0.3, 0.7, 8).translate(0, 0.35, 0).toNonIndexed(),
      new THREE.CylinderGeometry(0.05, 0.05, 1.5, 5).rotateX(Math.PI / 2).translate(0, 9.25, 0.7).toNonIndexed(),
    ]);
    const poles = new THREE.InstancedMesh(poleGeo, s.material('#3c4044', { metalness: 0.5, roughness: 0.5 }), lampPoles.length);
    lampPoles.forEach((m, i) => poles.setMatrixAt(i, m));
    poles.castShadow = true;
    root.add(poles);
    const headGeo = new THREE.SphereGeometry(1, 10, 6).scale(0.42, 0.22, 0.42);
    if (lit.length) s.scatter(headGeo, new THREE.MeshStandardMaterial({ color: '#fff6e0', emissive: lampHex, emissiveIntensity: mix(0.6, 3, night) }), lit.map((p) => ({ at: p, size: 1 }))).castShadow = false;
    if (unlit.length) s.scatter(headGeo, s.material('#cfd2d0', { roughness: 0.3, metalness: 0.4 }), unlit.map((p) => ({ at: p, size: 1 })));
    if (glows.length) s.scatter(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshBasicMaterial({ color: lampHex, transparent: true, opacity: 0.2 + night * 0.3, depthWrite: false, blending: THREE.AdditiveBlending }), glows).castShadow = false;

    // ---- Mid-ground: the row of 1930s Art Deco blocks along the curve.
    const palette = PALETTES[a.facades];
    const stain = 0.15 + mood.wear * 0.85;
    const winMap = canvasTexture(512, 512, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
        const x = i * 32, y = j * 32;
        c.fillStyle = 'rgba(62,66,72,0.92)'; c.fillRect(x + 3, y + 12, 26, 11);
        c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(x + 11, y + 12, 1.5, 11); c.fillRect(x + 20, y + 12, 1.5, 11);
        c.fillStyle = 'rgba(120,110,95,0.25)'; c.fillRect(x, y + 25, 32, 2);
      }
      for (let k = 0; k < Math.round(stain * 110); k++) {
        const x = random() * 512, y = random() * 512, len = 20 + random() * 120;
        const g = c.createLinearGradient(0, y, 0, y + len); g.addColorStop(0, `rgba(30,32,30,${0.2 + stain * 0.4})`); g.addColorStop(1, 'rgba(30,32,30,0)');
        c.fillStyle = g; c.fillRect(x, y, 3 + random() * 10, len);
      }
    });
    const winGlow = canvasTexture(512, 512, (c) => {
      c.fillStyle = '#000000'; c.fillRect(0, 0, 512, 512);
      const share = 0.25 + mood.density * 0.45;
      for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) if (random() < share) { c.fillStyle = random() < 0.75 ? '#ffcf86' : '#e8f0ff'; c.fillRect(i * 32 + 3, j * 32 + 12, 26, 11); }
    });
    const deco = s.material('#ffffff', { vertexColors: true, map: winMap, emissive: '#ffffff', emissiveMap: winGlow, emissiveIntensity: mix(0, 1.1, night), roughness: wet ? 0.45 : 0.85 });
    const trim = s.material(new THREE.Color('#f4f0e6').lerp(new THREE.Color('#9a968c'), mood.wear * 0.4), { roughness: 0.7 });
    const bodyGeos: THREE.BufferGeometry[] = [];
    const addBody = (geo: THREE.BufferGeometry, m: THREE.Matrix4, col: THREE.Color, offset: number) => {
      let g = geo.index ? geo.toNonIndexed() : geo;
      if (g !== geo) geo.dispose();
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal'].includes(name)) g.deleteAttribute(name);
      localUV(g, 3.6 * 16, 3.2 * 16, offset);
      const colours = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < colours.length; i += 3) { colours[i] = col.r; colours[i + 1] = col.g; colours[i + 2] = col.b; }
      g.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      g = g.applyMatrix4(m);
      bodyGeos.push(g);
    };
    const placeTrim = (geo: THREE.BufferGeometry, m: THREE.Matrix4) => { geo.applyMatrix4(m); b.add(trim, geo); };
    const LANDMARK_PHI = [0.88, 0.62];
    const fillers = LANDMARK_PHI.map(() => new THREE.Group());
    for (const g of fillers) root.add(g);
    const fillerGeos: THREE.BufferGeometry[][] = LANDMARK_PHI.map(() => []);
    let phi = -0.01;
    while (phi < PHI_END - 0.06) {
      const w = 20 + random() * 12, dpt = 16 + random() * 6, floors = 5 + Math.floor(random() * 3), h = floors * 3.2 + 1.2;
      const centrePhi = phi + (w / 2) / (R + 30);
      const p = at(centrePhi, 30 + dpt / 2), rot = toSea(centrePhi);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(p[0], 0, p[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), new THREE.Vector3(1, 1, 1));
      const col = new THREE.Color(pick(palette)).lerp(new THREE.Color('#8a8478'), mood.wear * 0.25);
      const offset = Math.floor(random() * 16) / 16;
      const filler = LANDMARK_PHI.findIndex((lp) => Math.abs(lp - centrePhi) < 0.07);
      const sink = filler >= 0 ? fillerGeos[filler] : null;
      const body = (g: THREE.BufferGeometry, local: THREE.Matrix4) => {
        const mm = m.clone().multiply(local);
        if (sink) { const before = bodyGeos.length; addBody(g, mm, col, offset); sink.push(bodyGeos.splice(before, 1)[0]); }
        else addBody(g, mm, col, offset);
      };
      const tr = (g: THREE.BufferGeometry, local: THREE.Matrix4) => { if (sink) { g.applyMatrix4(m.clone().multiply(local)); sink.push(g.index ? g.toNonIndexed() : g); } else placeTrim(g, m.clone().multiply(local)); };
      const T = (x: number, y: number, z: number, ry = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
      const rc = 4 + random() * 1.5; // the rounded corner's radius
      const side = random() < 0.5 ? 1 : -1;
      // Main mass with one rounded corner on the road side, then a slimmer upper storey.
      body(new THREE.BoxGeometry(w - rc, h, dpt), T(-side * rc / 2, h / 2, 0));
      body(new THREE.BoxGeometry(rc, h, dpt - rc), T(side * (w / 2 - rc / 2), h / 2, -rc / 2));
      body(new THREE.CylinderGeometry(rc, rc, h, 14, 1, false, side > 0 ? 0 : -Math.PI / 2, Math.PI / 2), T(side * (w / 2 - rc), h / 2, dpt / 2 - rc));
      // Concrete eyebrows over each floor, wrapping round the curve as balconies.
      for (let f = 1; f <= floors; f++) {
        const y = f * 3.2 - 0.3;
        tr(new THREE.BoxGeometry(w - rc + 0.4, 0.3, 1.1), T(-side * rc / 2, y, dpt / 2 + 0.55));
        tr(new THREE.CylinderGeometry(rc + 1.1, rc + 1.1, 0.3, 14, 1, false, side > 0 ? 0 : -Math.PI / 2, Math.PI / 2), T(side * (w / 2 - rc), y, dpt / 2 - rc));
        if (f % 2 === 0) tr(new THREE.BoxGeometry(0.12, 0.9, 0.12 + rc * 1.5), T(side * (w / 2 + 0.75), y - 0.6, dpt / 2 - rc * 0.8));
      }
      // Stepped parapet and the Deco fin with its speed lines.
      tr(new THREE.BoxGeometry(w + 0.2, 0.9, dpt + 0.2), T(0, h + 0.45, 0));
      const finX = (random() - 0.5) * w * 0.3;
      body(new THREE.BoxGeometry(2.6, 5 + random() * 3, 2), T(finX, h + 3, dpt / 2 - 1.6));
      for (let k = 0; k < 3; k++) tr(new THREE.BoxGeometry(2.8, 0.18, 2.2), T(finX, h + 1.6 + k * 1.1, dpt / 2 - 1.6));
      tr(new THREE.BoxGeometry(w * 0.5, 0.5, 0.3), T(-side * w * 0.15, 3.4, dpt / 2 + 0.1));
      phi += (w + 3 + random() * 6) / (R + 30);
    }
    // Rows of later, taller blocks behind, and the city's bulk.
    const cityGeo = new THREE.BoxGeometry(1, 1, 1);
    const cityMat = s.material('#ffffff', { map: winMap, emissive: '#ffffff', emissiveMap: winGlow, emissiveIntensity: mix(0, 0.9, night), roughness: 0.85 });
    const cityBoxes: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const cityHaze = (d: number) => Math.min(0.85, haze * (0.1 + d / 500));
    for (let row = 0; row < 4; row++) {
      let ph = -0.02 + random() * 0.02;
      while (ph < PHI_END) {
        const w = 18 + random() * 20, dd = 60 + row * 45 + random() * 15;
        const h = (18 + random() * 22 + row * 10) * (1 + mood.density * 0.4);
        if (!LANDMARK_PHI.some((lp) => Math.abs(lp - ph) < 0.08) || row > 2) {
          const p = at(ph, dd), rot = toSea(ph);
          const col = new THREE.Color(pick(['#d8d2c4', '#c8c4bc', '#e2d6c0', '#bfc6c8', '#d8c8b8'])).lerp(hazeColour, cityHaze(dd));
          cityBoxes.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(p[0], h / 2, p[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), new THREE.Vector3(w, h, 14 + random() * 10)), c: col });
        }
        ph += (w + 4 + random() * 10) / (R + dd);
      }
    }
    // The far line: Nariman Point towers at the end of the curve.
    for (let i = 0; i < 10; i++) {
      const ph = PHI_END + 0.01 + random() * 0.09, dd = -10 + random() * 110;
      const p = at(ph, dd);
      const h = 32 + random() * 60, w = 14 + random() * 16;
      const col = new THREE.Color(pick(['#c8ccd0', '#9aa8b4', '#d8d4cc', '#7f8c96'])).lerp(hazeColour, Math.min(0.9, haze * 0.7 + 0.3));
      cityBoxes.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(p[0], h / 2, p[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, random() * 3, 0)), new THREE.Vector3(w, h, w * (0.6 + random() * 0.6))), c: col });
    }
    const city = new THREE.InstancedMesh(cityGeo, cityMat, cityBoxes.length);
    cityBoxes.forEach((box, i) => { city.setMatrixAt(i, box.m); city.setColorAt(i, box.c); });
    city.instanceColor!.needsUpdate = true;
    city.castShadow = false; city.receiveShadow = true;
    root.add(city);
    // Nariman's point of land under the towers, and Malabar Hill across the water in haze.
    s.mesh(strip(-20, 200, PHI_END, PHI_END + 0.16, -0.05, 8, 40, 40), land).castShadow = false;
    const hillTone = new THREE.Color('#5f7458').lerp(hazeColour, Math.min(0.92, 0.45 + haze * 0.5));
    const hillPts: THREE.Vector2[] = [new THREE.Vector2(-520, -10)];
    for (let x = -520; x <= 520; x += 20) hillPts.push(new THREE.Vector2(x, 30 + 70 * Math.exp(-(((x + 60) / 240) ** 2)) + 10 * Math.sin(x * 0.02)));
    hillPts.push(new THREE.Vector2(520, -10));
    const hill = s.mesh(new THREE.ShapeGeometry(new THREE.Shape(hillPts)), new THREE.MeshBasicMaterial({ color: hillTone }), [560, seaY, -820]);
    hill.lookAt(cam.x, seaY, cam.z); hill.castShadow = hill.receiveShadow = false;
    const towerTone = new THREE.Color('#c8c8c0').lerp(hazeColour, Math.min(0.9, 0.5 + haze * 0.4));
    const hillTowers: { at: V3; size: number }[] = [];
    for (let i = 0; i < 22; i++) { const x = -300 + random() * 520, hy = 30 + 70 * Math.exp(-(((x + 60) / 240) ** 2)); hillTowers.push({ at: [x, hy - 10, 0], size: 1 }); }
    const towerGroup = new THREE.Group();
    towerGroup.position.copy(hill.position); towerGroup.quaternion.copy(hill.quaternion);
    root.add(towerGroup);
    for (const t of hillTowers) { const m = new THREE.Mesh(new THREE.PlaneGeometry(8 + random() * 10, 40 + random() * 70).translate(0, 30, 0), new THREE.MeshBasicMaterial({ color: towerTone, transparent: true, opacity: 0.95 })); m.position.set(...t.at); m.position.z = -2; towerGroup.add(m); }
    // Haze veils between the near city and the far line.
    const veilMap = canvasTexture(8, 128, (c) => { const g = c.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,1)'); c.fillStyle = g; c.fillRect(0, 0, 8, 128); }, false);
    for (const [dist, hgt, op] of [[260, 70, 0.25], [420, 120, 0.4], [700, 160, 0.55]] as const) {
      const v = s.mesh(new THREE.PlaneGeometry(2400, hgt), new THREE.MeshBasicMaterial({ color: hazeColour, map: veilMap, transparent: true, opacity: op * haze, depthWrite: false }), [cam.x + 0.26 * dist, seaY + hgt / 2, cam.z - 0.96 * dist]);
      v.lookAt(cam.x, seaY + hgt / 2, cam.z); v.castShadow = v.receiveShadow = false;
    }

    // ---- People, crowds and the occasion.
    const people: ReturnType<typeof figure>[] = [];
    const skins = ['#8a5a3c', '#a8714c', '#6f472f', '#c08a62', '#e0b48f'];
    const clothes = ['#e8e2d4', '#c8324a', '#2f6fb3', '#e0a020', '#3b8a5a', '#f2f0ea', '#d65a8a', '#7b2fa8', '#f28a12'];
    const dawn = a.occasion === 'dawn';
    const festive = a.occasion === 'ganesh' || a.occasion === 'cricket';
    // Couples sitting on the wall, facing the sea.
    if ((a.people === 'couples' && !dawn && !storm) || (a.people !== 'nobody' && a.season === 'after' && !dawn)) {
      const spots = [0.006, 0.022, 0.034, 0.058, 0.075];
      for (const [k, ph] of spots.slice(0, 2 + Math.round(mood.density * 3)).entries()) for (const off of [-0.32, 0.32]) {
        if (people.length >= 8) break;
        const p = figure(s, { height: 1.65 + random() * 0.15, pose: 'sitting', style: 'doll', hair: off < 0 ? pick(['short', 'cap'] as const) : pick(['long', 'bun'] as const), top: pick(clothes), bottom: pick(['#2a2f3a', '#e8e2d4', '#3a5a8a']), skin: pick(skins), mirror: random() < 0.5 });
        root.add(p.root);
        const pp = at(ph + off / R, 0.25);
        p.root.position.set(pp[0], 0.85 - p.hipHeight, pp[2]);
        p.root.rotation.y = toSea(ph);
        p.root.updateMatrixWorld(true);
        const pelvis = p.pelvis.getWorldPosition(new THREE.Vector3());
        const wallTop = new THREE.Vector3(...at(ph + off / R, 0.1));
        p.root.position.x += wallTop.x - pelvis.x; p.root.position.z += wallTop.z - pelvis.z;
        if (k % 2 === 0) p.lookAt(new THREE.Vector3(...at(ph + (off > 0 ? -1 : 1) / R, 0.2, 1.4)), root);
        people.push(p);
      }
    }
    // Walkers and crowds as simple instanced figures; a few modelled ones near the camera.
    const crowdCount = a.people === 'nobody' ? 0 : dawn ? 3 : Math.round((festive ? 700 : a.people === 'walkers' ? 260 : a.people === 'families' ? 220 : 90) * (0.4 + mood.density * 0.9) * (storm ? 0.25 : 1));
    const body = new THREE.CapsuleGeometry(0.24, 1.05, 3, 6).translate(0, 0.77, 0);
    const head = new THREE.SphereGeometry(0.15, 6, 4).translate(0, 1.6, 0);
    const traveller = mergeGeometries([body.toNonIndexed(), head.toNonIndexed()]);
    body.dispose(); head.dispose();
    const crowd: { at: V3; size: number; color: string }[] = [];
    for (let i = 0; i < crowdCount; i++) {
      const ph = 0.03 + Math.pow(random(), 0.9) * (festive ? 0.5 : 0.75);
      const onRoad = festive && random() < 0.45;
      const d = onRoad ? 11 + random() * 13 : 1.6 + random() * 8;
      const p = at(ph, d, onRoad ? -0.12 : 0);
      crowd.push({ at: p, size: 0.9 + random() * 0.2, color: pick(clothes) });
    }
    if (crowd.length) s.scatter(traveller, s.material('#ffffff', { roughness: 0.8 }), crowd);
    if (a.people !== 'nobody' && !(a.people === 'couples' && !storm)) {
      const n = dawn ? 1 : 3;
      for (let i = 0; i < n && people.length < 8; i++) {
        const p = figure(s, { height: 1.6 + random() * 0.25, pose: dawn ? 'running' : pick(['walking', 'walking', 'standing'] as const), style: 'doll', hair: pick(['short', 'long', 'bun', 'cap'] as const), top: pick(clothes), bottom: pick(['#2a2f3a', '#e8e2d4']), skin: pick(skins), mirror: random() < 0.5 });
        root.add(p.root);
        const pp = at(0.03 + i * 0.012 + random() * 0.006, 2.5 + random() * 5);
        p.root.position.set(pp[0], 0, pp[2]);
        p.root.rotation.y = toSea(0.03) + (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
        people.push(p);
      }
    }
    // Balloon seller's bunch for the families.
    if (a.people === 'families' && !storm) {
      const pp = at(0.065, 6);
      const balloons: { at: V3; size: number; color: string }[] = [];
      for (let i = 0; i < 18; i++) balloons.push({ at: [pp[0] + (random() - 0.5) * 1.2, 3 + random() * 1.2, pp[2] + (random() - 0.5) * 1.2], size: 0.25, color: pick(['#e8322a', '#f6d21a', '#2f6fb3', '#d6198a', '#3fa84a', '#f28a12']) });
      s.scatter(new THREE.SphereGeometry(1, 10, 8).scale(1, 1.2, 1), s.material('#ffffff', { roughness: 0.3 }), balloons).castShadow = false;
      b.rod(s.material('#2a2a2a'), [pp[0], 0, pp[2]], [pp[0], 3.2, pp[2]], 0.03);
    }
    // Ganesh: the idol on its lorry, saffron flags and pink gulal.
    if (a.occasion === 'ganesh') {
      const p = at(0.15, 21), rot = toSea(0.15) + Math.PI / 2;
      const g = new THREE.Group();
      const add = (geo: THREE.BufferGeometry, m: THREE.Material, pos: V3) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(...pos); mesh.castShadow = true; g.add(mesh); return mesh; };
      add(new THREE.BoxGeometry(3, 1.4, 9), s.material('#3a5a8a'), [0, 1, 0]);
      add(new THREE.BoxGeometry(2.8, 1.6, 2.2), s.material('#e8e2d4'), [0, 1.9, 4]);
      for (const z of [-3, 3.2]) for (const x of [-1.3, 1.3]) add(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12).rotateZ(Math.PI / 2), s.material('#1a1a1a'), [x, 0.5, z]);
      const idol = s.material('#f08a24', { roughness: 0.5, emissive: '#ff6a10', emissiveIntensity: night * 0.3 });
      add(new THREE.LatheGeometry([[0.0001, 0], [2, 0], [2.3, 1.2], [1.8, 2.6], [1.1, 3.2], [1.3, 3.6], [1.2, 4.6], [0.6, 5.2], [0.0001, 5.4]].map(([x, y]) => new THREE.Vector2(x, y)), 18), idol, [0, 1.7, -1.5]);
      add(new THREE.TorusGeometry(2.6, 0.25, 8, 24), s.material('#d4a537', { metalness: 0.7, roughness: 0.3 }), [0, 5.4, -2.6]);
      add(new THREE.ConeGeometry(1.1, 1.6, 12), s.material('#d4a537', { metalness: 0.7, roughness: 0.3 }), [0, 7.6, -1.5]);
      add(new THREE.BoxGeometry(3.2, 0.2, 5), s.material('#c8202a'), [0, 9.4, -1.5]);
      for (const x of [-1.5, 1.5]) for (const z of [-3.8, 0.8]) add(new THREE.CylinderGeometry(0.06, 0.06, 7.7, 5), s.material('#d4a537'), [x, 5.6, z]);
      g.position.set(p[0], -0.12, p[2]); g.rotation.y = rot;
      root.add(g);
      const gulal: { at: V3; size: number }[] = [];
      for (let i = 0; i < 40; i++) { const q = at(0.07 + random() * 0.04, 8 + random() * 14); gulal.push({ at: [q[0], 1 + random() * 6, q[2]], size: 1 + random() * 2.5 }); }
      s.scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#f070b0', transparent: true, opacity: 0.25, depthWrite: false }), gulal).castShadow = false;
    }
    // Cricket: tricolour flags over the crowd and an open-top bus.
    const flags: THREE.InstancedMesh[] = [];
    if (festive) {
      const flagMap = canvasTexture(48, 32, (c) => { c.fillStyle = a.occasion === 'ganesh' ? '#ff8a1e' : '#ff9933'; c.fillRect(0, 0, 48, 32); if (a.occasion === 'cricket') { c.fillStyle = '#ffffff'; c.fillRect(0, 11, 48, 11); c.fillStyle = '#138808'; c.fillRect(0, 21, 48, 11); c.strokeStyle = '#000080'; c.beginPath(); c.arc(24, 16, 4, 0, 7); c.stroke(); } }, false);
      const flagPts = crowd.filter(() => random() < 0.12).map((p) => ({ at: [p.at[0] + 0.3, p.at[1] + 2.3, p.at[2]] as V3, size: 1 }));
      const fm = s.scatter(new THREE.PlaneGeometry(1.1, 0.7).translate(0.55, 0, 0), new THREE.MeshStandardMaterial({ map: flagMap, side: THREE.DoubleSide, roughness: 0.8 }), flagPts);
      fm.castShadow = false; flags.push(fm);
    }
    if (a.occasion === 'cricket') {
      const p = at(0.14, 21), rot = toSea(0.14) + Math.PI / 2;
      const g = new THREE.Group();
      const add = (geo: THREE.BufferGeometry, m: THREE.Material, pos: V3) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(...pos); mesh.castShadow = true; g.add(mesh); };
      add(new THREE.BoxGeometry(2.6, 2.8, 11), s.material('#2f5fc8'), [0, 1.8, 0]);
      add(new THREE.BoxGeometry(2.62, 0.7, 10.6), s.material('#2a3440', { roughness: 0.2 }), [0, 2.1, 0]);
      add(new THREE.BoxGeometry(2.6, 1.0, 11), s.material('#f4f2ec'), [0, 3.7, 0]);
      for (let i = 0; i < 12; i++) add(new THREE.CapsuleGeometry(0.22, 0.8, 3, 6), s.material(pick(['#2f6fb3', '#f28a12', '#f4f2ec'])), [(random() - 0.5) * 2, 4.6, (random() - 0.5) * 9]);
      g.position.set(p[0], -0.12, p[2]); g.rotation.y = rot;
      root.add(g);
    }
    // Rain.
    let rain: THREE.InstancedMesh | null = null;
    if (storm) {
      const drops: { at: V3; size: number }[] = [];
      for (let i = 0; i < 1500; i++) drops.push({ at: [cam.x - 40 + random() * 120, random() * 40, cam.z - 10 - random() * 110], size: 1 });
      rain = s.scatter(new THREE.BoxGeometry(0.04, 2.4, 0.04).rotateZ(0.2), new THREE.MeshBasicMaterial({ color: '#dfe7ee', transparent: true, opacity: 0.4, depthWrite: false }), drops);
      rain.castShadow = false;
    }
    // Puddles after the rain.
    if (wet) for (let i = 0; i < 14; i++) {
      const p = at(random() * 0.12, 2 + random() * 7);
      const pd = s.mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshStandardMaterial({ color: skyTop.clone().lerp(skyLow, 0.4).multiplyScalar(0.8), roughness: 0.02, metalness: 0.6, transparent: true, opacity: 0.35, depthWrite: false }), [p[0], 0.01, p[2]]);
      pd.rotation.x = -Math.PI / 2; pd.scale.set(1 + random() * 2.5, 0.6 + random() * 1.4, 1); pd.castShadow = false;
    }

    const decoMesh = s.mesh(mergeGeometries(bodyGeos), deco);
    decoMesh.castShadow = true;
    fillers.forEach((group, i) => {
      if (!fillerGeos[i].length) return;
      const bodies = fillerGeos[i].filter((g) => g.attributes.color), trims = fillerGeos[i].filter((g) => !g.attributes.color);
      if (bodies.length) group.add(new THREE.Mesh(mergeGeometries(bodies), deco));
      if (trims.length) { for (const g of trims) { for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name); if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); } group.add(new THREE.Mesh(mergeGeometries(trims), trim)); }
      group.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true; });
    });
    b.flush(s);

    // ---- Camera and placement.
    const camera = new THREE.PerspectiveCamera(52, 1, 0.5, 4000);
    const look = new THREE.Vector3(46, -22, -190);
    const frame = () => { camera.position.copy(cam); camera.lookAt(look); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); };
    frame();
    const SLOTS = {
      hero: { phi: 0.0, d: 4.6 },
      seats: [{ phi: 0.016, d: 1.3 }, { phi: 0.05, d: 1.3 }],
      cart: { phi: 0.03, d: 7.2 },
      vehicle: { phi: 0.09, d: 13 },
      extra: [{ phi: 0.065, d: 4.5 }, { phi: 0.09, d: 6 }],
    };
    const place = (items: readonly Placeable[]) => {
      let land = 0, seat = 0, extra = 0, cartUsed = false, vehicleUsed = false;
      for (const item of items) {
        const h = Math.max(item.height, 0.05), r = Math.max(item.radius, 0.05);
        item.holder.updateMatrixWorld(true);
        const size = visibleBounds(item.holder).getSize(new THREE.Vector3());
        const long = Math.max(size.x, size.z), short = Math.min(size.x, size.z);
        let x: number, y = 0, z: number, scale: number, turn: number;
        const tall = h >= 12 || r >= 14;
        if (tall) {
          // Landmarks stand across the bay among the blocks, the hero nearer.
          const k = item.hero ? 0 : Math.min(LANDMARK_PHI.length - 1, land + (items[0] && (items[0].height >= 12 || items[0].radius >= 14) ? 1 : 0));
          land++;
          const ph = LANDMARK_PHI[k];
          scale = Math.min(Math.max(0.6, Math.min(2.2, (item.hero ? 80 : 60) / h)), 75 / r, h > 40 ? (item.hero ? 1.35 : 1.1) : 1.9);
          const dd = 32 + Math.min(60, r * scale * 0.6);
          [x, , z] = at(ph, dd);
          turn = toSea(ph) + (random() - 0.5) * 0.3;
          fillers[k].visible = false;
        } else if (item.hero) {
          [x, , z] = at(SLOTS.hero.phi, SLOTS.hero.d);
          scale = Math.min(1.35, Math.max(0.8, Math.min(3.4 / h, 2.6 / r)));
          turn = Math.atan2(cam.x - x, cam.z - z) + (random() - 0.5) * 0.5;
        } else if (!vehicleUsed && long >= 2.5 && long >= 2.2 * h && h < 4) {
          vehicleUsed = true;
          [x, , z] = at(SLOTS.vehicle.phi, SLOTS.vehicle.d); y = -0.12;
          scale = Math.min(1.25, Math.max(0.8, 4.2 / long));
          turn = toSea(SLOTS.vehicle.phi) + Math.PI / 2 + (size.x > size.z ? Math.PI / 2 : 0);
        } else if (h <= 2.3 && r <= 0.7 && seat < SLOTS.seats.length) {
          const sp = SLOTS.seats[seat++];
          [x, , z] = at(sp.phi, sp.d);
          scale = Math.min(1.2, Math.max(0.8, 1.75 / h));
          turn = toSea(sp.phi) + Math.PI + (random() - 0.5) * 0.8;
        } else if (!cartUsed && h <= 3.5 && long <= 4) {
          cartUsed = true;
          [x, , z] = at(SLOTS.cart.phi, SLOTS.cart.d);
          scale = Math.min(1.2, Math.max(0.8, Math.min(2.6 / h, 1.8 / r)));
          turn = Math.atan2(cam.x - x, cam.z - z) + 0.6;
        } else {
          const sp = SLOTS.extra[extra++ % SLOTS.extra.length];
          [x, , z] = at(sp.phi, sp.d);
          scale = Math.min(1.2, Math.max(0.6, Math.min(3 / h, 2.4 / r)));
          turn = Math.atan2(cam.x - x, cam.z - z);
        }
        void short;
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, y, z);
        item.holder.rotation.y = turn;
        item.holder.updateMatrixWorld(true);
      }
      frame();
    };

    return {
      object: root, camera, background, capacity: 7, ground, keyLight: key, place,
      update: (dt: number, time: number) => {
        for (const p of people) p.update(dt, time);
        rippleMap.offset.x = time * 0.003 * (1 + mood.energy * 2);
        for (const sp of sprays) { const k = 0.6 + 0.4 * Math.max(0, Math.sin(time * mix(0.6, 1.8, mood.energy) + sp.phase)); sp.mesh.scale.set(1, k, 1); sp.mesh.position.y = seaY * (1 - k); }
        if (rain) rain.position.y = -((time * 22) % 8);
        for (const f of flags) f.rotation.y = Math.sin(time * 3) * 0.02;
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
