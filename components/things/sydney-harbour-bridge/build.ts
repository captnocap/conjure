import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

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

/** A square beam from a to b, as geometry to be merged. */
const beam = (a: P3, b: P3, t: number, d = t) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A);
  const g = new THREE.BoxGeometry(t, Math.max(dir.length(), 0.01), d);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  g.applyQuaternion(q);
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
};

const HALF = 251.5;
const topY = (x: number) => 134 - 72 * (x / HALF) ** 2;
const botY = (x: number) => 116 - 112 * (x / HALF) ** 2;

export default defineThing({
  questions: {
    era: choice('When is the bridge seen?', {
      building: '1930 under construction: two half arches cantilevered out from each shore, not yet meeting, held back by great cables, creeper cranes on their tips, no deck.',
      opening: 'Opening day, March 1932: new grey steel, bunting and flags strung along the deck, a crowd walking across.',
      today: 'Today: the weathered grey coat-hanger, traffic and trains streaming across, the city\'s great gateway.',
    }),
    flags: choice('What flies from the summit of the arch?', {
      national: 'The Australian flag and the Aboriginal flag side by side, as they fly today.',
      rainbow: 'A rainbow pride flag for Mardi Gras.',
      union: 'A single Union Jack, the flag of 1932.',
      none: 'Nothing: bare flagpoles or none at all.',
    }),
    climbers: noul('Is a line of climbers in grey suits strung along the top of the arch?'),
    lights: choice('What lights are on it?', {
      lamps: 'Ordinary deck lamps and a string of lights tracing the arch, glowing as the light goes.',
      fireworks: 'New Year\'s Eve: a golden waterfall of fireworks pouring off the deck and bursts exploding above the arch.',
      dark: 'No lights at all: a dark steel silhouette.',
    }),
    traffic: choice('What is crossing the deck?', {
      jammed: 'Peak hour: lanes jammed with cars and buses, a train rattling through.',
      light: 'A few cars and one train, an ordinary quiet hour.',
      empty: 'Nothing: the deck closed and empty, eerie.',
      walkers: 'People only: the deck closed to cars and full of walkers.',
    }),
    weather: choice('What is the weather doing around it?', {
      clear: 'Clear: crisp steel against open sky.',
      fog: 'Sea fog pooling around the pylons, the arch floating above it.',
      storm: 'A summer storm: a fork of lightning striking down beside the arch.',
      haze: 'Hot haze softening the far end of the span.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.35) / 0.65));
    const building = a.era === 'building';
    const DECK = 49, TZ = 15; // deck level and the half distance between the two arch trusses

    const steelColour = building ? '#6e7276' : new THREE.Color('#9aa1a5').lerp(new THREE.Color('#6b6f70'), mood.wear * 0.5).getStyle();
    const steel = s.material(steelColour, { roughness: 0.6, metalness: 0.35 });
    const darkSteel = s.material(new THREE.Color(steelColour).multiplyScalar(0.62), { roughness: 0.7, metalness: 0.3 });
    const graniteBase = new THREE.Color('#bba98a').lerp(new THREE.Color('#7c705c'), mood.wear * 0.4);
    const graniteMap = canvasTexture(128, 128, (c) => {
      c.fillStyle = graniteBase.clone().multiplyScalar(0.8).getStyle(); c.fillRect(0, 0, 128, 128);
      for (let row = 0; row < 8; row++) for (let col = 0; col < 3; col++) {
        c.fillStyle = graniteBase.clone().offsetHSL(0, (random() - 0.5) * 0.05, (random() - 0.5) * 0.08).getStyle();
        c.fillRect(col * 48 + (row % 2) * 24 - 24 + 1, row * 16 + 1, 46, 14);
        c.fillRect(col * 48 + (row % 2) * 24 + 24 + 1, row * 16 + 1, 46, 14);
      }
    });
    graniteMap.repeat.set(3, 6);
    const granite = s.material('#ffffff', { map: graniteMap, roughness: 0.9 });
    const deckMat = s.material('#4a4c4e', { roughness: 0.85 });

    // ----- the arch: two lattice trusses, top and bottom chords, verticals and diagonals -----
    const parts: THREE.BufferGeometry[] = [];
    const panels = 28;
    const reach = building ? 0.86 : 1; // how far each half arch has grown toward the crown
    const inArch = (x: number) => Math.abs(x) >= HALF * (1 - reach) - 0.01;
    for (const z of [-TZ, TZ]) {
      for (let i = 0; i < panels; i++) {
        const x0 = -HALF + (i / panels) * HALF * 2, x1 = -HALF + ((i + 1) / panels) * HALF * 2;
        if (!inArch(x0) || !inArch(x1)) continue;
        if (building && Math.sign(x0) !== Math.sign(x1)) continue;
        parts.push(beam([x0, topY(x0), z], [x1, topY(x1), z], 3.2, 2.6));
        parts.push(beam([x0, botY(x0), z], [x1, botY(x1), z], 4.2, 3.2));
        // Diagonals form a W across each panel, with a half-panel subdiagonal.
        const flip = i % 2 === 0;
        parts.push(beam([flip ? x0 : x1, botY(flip ? x0 : x1), z], [flip ? x1 : x0, topY(flip ? x1 : x0), z], 1.6, 1.4));
        const xm = (x0 + x1) / 2;
        parts.push(beam([xm, (botY(xm) + topY(xm)) / 2, z], [flip ? x0 : x1, topY(flip ? x0 : x1), z], 0.9, 0.9));
      }
      for (let i = 0; i <= panels; i++) {
        const x = -HALF + (i / panels) * HALF * 2;
        if (!inArch(x) || (building && Math.abs(x) < 1)) continue;
        parts.push(beam([x, botY(x), z], [x, topY(x), z], 1.8, 1.6));
        // Hangers carry the deck where the arch rides above it.
        if (!building && botY(x) > DECK + 2) parts.push(beam([x, DECK, z], [x, botY(x), z], 1.1, 1.1));
      }
    }
    // Lateral bracing between the two trusses.
    for (let i = 0; i <= panels; i++) {
      const x = -HALF + (i / panels) * HALF * 2;
      if (!inArch(x)) continue;
      parts.push(beam([x, topY(x), -TZ], [x, topY(x), TZ], 1.2, 1.2));
      parts.push(beam([x, botY(x), -TZ], [x, botY(x), TZ], 1.4, 1.4));
      if (i < panels) {
        const x1 = -HALF + ((i + 1) / panels) * HALF * 2;
        if (!inArch(x1) || (building && Math.sign(x) !== Math.sign(x1))) continue;
        parts.push(beam([x, topY(x), -TZ], [x1, topY(x1), TZ], 0.7, 0.7));
        parts.push(beam([x, topY(x), TZ], [x1, topY(x1), -TZ], 0.7, 0.7));
      }
    }
    // The end posts that carry the top chord down to the bearings.
    for (const sx of [-1, 1]) for (const z of [-TZ, TZ]) parts.push(beam([sx * HALF, botY(HALF), z], [sx * HALF, topY(HALF), z], 3.2, 3.2));
    s.mesh(mergeGeometries(parts), steel);

    // ----- the deck and its stringers -----
    if (!building) {
      s.box([HALF * 2 + 90, 3.6, 46], [0, DECK - 1.8, 0], darkSteel);
      s.box([HALF * 2 + 90, 0.4, 44], [0, DECK + 0.2, 0], deckMat);
      const kerbs: THREE.BufferGeometry[] = [];
      for (const z of [-23, -10, 10, 23]) kerbs.push(new THREE.BoxGeometry(HALF * 2 + 90, 1.2, 0.6).translate(0, DECK + 0.6, z));
      for (const z of [-20, -17, 17, 20]) kerbs.push(new THREE.BoxGeometry(HALF * 2 + 90, 0.35, 0.3).translate(0, DECK + 0.55, z));
      s.mesh(mergeGeometries(kerbs), steel);
    }

    // ----- four granite pylons on their abutments -----
    for (const sx of [-1, 1]) {
      const cx = sx * (HALF + 24);
      s.box([42, DECK - 4, 92], [cx, (DECK - 4) / 2, 0], granite);
      for (const sz of [-1, 1]) {
        const cz = sz * 34;
        s.box([40, 80, 22], [cx, 40, cz], granite);
        // Stepped flat top and the cornice band.
        s.box([42, 3, 24], [cx, 74, cz], granite);
        s.box([36, 6, 19], [cx, 83, cz], granite);
        s.box([33, 1.8, 17], [cx, 86.9, cz], granite);
        // The tall arched opening on each face.
        const hole = s.material('#3c3a36', { roughness: 0.95 });
        for (const face of [-1, 1]) {
          s.box([0.6, 24, 9], [cx + face * 20.2, 56, cz], hole);
          s.cylinder(4.5, 4.5, 0.6, [cx + face * 20.2, 68, cz], hole, 16).rotation.z = Math.PI / 2;
        }
      }
    }

    // ----- construction: creeper cranes and the cables holding the half arches back -----
    const cable = s.material('#2b2b2b', { roughness: 0.6 });
    if (building) {
      const yellow = s.material('#5a564e', { roughness: 0.7 });
      for (const sx of [-1, 1]) {
        const x = sx * HALF * (1 - reach) + sx * 4;
        s.box([14, 8, 30], [x, topY(x) + 4, 0], yellow);
        s.rod([x, topY(x) + 8, 0], [x - sx * 30, topY(x) + 28, 0], 0.8, yellow);
        s.rod([x - sx * 30, topY(x) + 28, 0], [x - sx * 10, topY(x) - 14, 0], 0.25, cable);
        for (const z of [-TZ, TZ]) for (const k of [0, 1, 2]) {
          s.rod([sx * (HALF - 2), topY(HALF) + k * 1.5, z], [sx * (HALF + 52 + k * 4), 4, z * 1.3], 0.6, cable);
        }
      }
    }

    // ----- lamps along the deck and the arch -----
    const lampIntensity = a.lights === 'dark' ? 0 : mix(0.15, 2.2, night) + (a.lights === 'fireworks' ? 0.8 : 0);
    const lampMat = new THREE.MeshStandardMaterial({ color: '#fff2cf', emissive: '#ffc871', emissiveIntensity: lampIntensity, roughness: 0.4 });
    if (!building && a.lights !== 'dark') {
      const points: { at: P3; size: number }[] = [];
      for (let x = -HALF - 30; x <= HALF + 30; x += 14) for (const z of [-22.5, 22.5]) points.push({ at: [x, DECK + 7, z], size: 1 });
      for (let i = 0; i <= 56; i++) { const x = -HALF + (i / 56) * HALF * 2; for (const z of [-TZ, TZ]) points.push({ at: [x, topY(x) + 2, z], size: 0.8 }); }
      s.scatter(new THREE.SphereGeometry(0.9, 8, 6), lampMat, points);
      const posts: THREE.BufferGeometry[] = [];
      for (let x = -HALF - 30; x <= HALF + 30; x += 14) for (const z of [-22.5, 22.5]) posts.push(new THREE.BoxGeometry(0.4, 7, 0.4).translate(x, DECK + 3.5, z));
      s.mesh(mergeGeometries(posts), darkSteel);
    }

    // ----- flags on the summit -----
    if (a.flags !== 'none' && !building) {
      const flagTexture = (kind: string) => canvasTexture(256, 128, (c) => {
        if (kind === 'aus' || kind === 'union') {
          c.fillStyle = kind === 'aus' ? '#1b2a6b' : '#1b2a6b'; c.fillRect(0, 0, 256, 128);
          const w = kind === 'aus' ? 128 : 256, h = kind === 'aus' ? 64 : 128;
          c.strokeStyle = '#ffffff'; c.lineWidth = h * 0.2;
          c.beginPath(); c.moveTo(0, 0); c.lineTo(w, h); c.moveTo(w, 0); c.lineTo(0, h); c.stroke();
          c.strokeStyle = '#c8102e'; c.lineWidth = h * 0.07; c.stroke();
          c.fillStyle = '#ffffff'; c.fillRect(w * 0.42, 0, w * 0.16, h); c.fillRect(0, h * 0.37, w, h * 0.26);
          c.fillStyle = '#c8102e'; c.fillRect(w * 0.46, 0, w * 0.08, h); c.fillRect(0, h * 0.43, w, h * 0.14);
          if (kind === 'aus') {
            c.fillStyle = '#ffffff';
            const star = (x: number, y: number, r: number) => {
              c.beginPath();
              for (let k = 0; k < 14; k++) { const t = k / 14 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
              c.fill();
            };
            star(64, 98, 16);
            for (const [x, y] of [[192, 22], [160, 56], [222, 48], [192, 108], [206, 72]]) star(x, y, 9);
          }
        } else if (kind === 'abor') {
          c.fillStyle = '#111111'; c.fillRect(0, 0, 256, 64);
          c.fillStyle = '#c8102e'; c.fillRect(0, 64, 256, 64);
          c.fillStyle = '#f4d40c'; c.beginPath(); c.arc(128, 64, 30, 0, Math.PI * 2); c.fill();
        } else {
          ['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982'].forEach((col, k) => { c.fillStyle = col; c.fillRect(0, k * 128 / 6, 256, 128 / 6 + 1); });
        }
      }, false);
      const kinds = a.flags === 'national' ? ['aus', 'abor'] : a.flags === 'rainbow' ? ['rainbow'] : ['union'];
      kinds.forEach((kind, k) => {
        const x = kinds.length === 1 ? 0 : (k ? 16 : -30);
        s.cylinder(0.5, 0.6, 26, [x, topY(x) + 13, 0], steel, 8);
        const flag = s.mesh(new THREE.PlaneGeometry(22, 11, 8, 1), new THREE.MeshStandardMaterial({ map: flagTexture(kind), side: THREE.DoubleSide, roughness: 0.8 }), [x + 11.5, topY(x) + 20, 0]);
        const pos = flag.geometry.attributes.position as THREE.BufferAttribute;
        for (let v = 0; v < pos.count; v++) pos.setZ(v, Math.sin((pos.getX(v) + 11) * 0.35) * 1.2 * ((pos.getX(v) + 11) / 22));
        flag.geometry.computeVertexNormals();
      });
    }

    // ----- climbers on the arch -----
    if (a.climbers) {
      const points: { at: P3; size: number; color: string }[] = [];
      const start = -HALF * (0.2 + random() * 0.5);
      for (let k = 0; k < 14; k++) { const x = start + k * 3.2; points.push({ at: [x, topY(x) + 2.6, -TZ + 1.5], size: 1, color: k === 0 ? '#2f4a8a' : '#8c8f93' }); }
      s.scatter(new THREE.CapsuleGeometry(0.45, 1.3, 2, 6), s.material('#ffffff'), points);
      // The handrail they clip to.
      const rail: P3[] = [];
      for (let k = 0; k <= 20; k++) { const x = -HALF + (k / 20) * HALF * 2; rail.push([x, topY(x) + 3.4, -TZ + 1.5]); }
      s.tube(rail, 0.15, darkSteel);
    }

    // ----- traffic -----
    if (!building) {
      const counts = { jammed: 160, light: 26, empty: 0, walkers: 0 }[a.traffic];
      const opening = a.era === 'opening';
      if (counts) {
        const cars: { at: P3; size: number; color: string }[] = [];
        const lanes = [-8.5, -5.5, -2.5, 2.5, 5.5, 8.5];
        const palette = opening ? ['#1d1d1f', '#2c2a28', '#3a3226'] : ['#f4f2ec', '#c8102e', '#1f5fd1', '#34363a', '#c9ccd1', '#f4d40c', '#1d1d1f'];
        for (let k = 0; k < counts; k++) cars.push({ at: [-HALF - 40 + random() * (HALF * 2 + 80), DECK + 1.2, lanes[k % lanes.length]], size: 1, color: palette[Math.floor(random() * palette.length)] });
        s.scatter(new THREE.BoxGeometry(4.6, 1.6, 2), s.material('#ffffff', { roughness: 0.4 }), cars);
        const trains = a.traffic === 'jammed' ? 2 : 1;
        for (let t = 0; t < trains; t++) {
          const x = -HALF + random() * HALF;
          s.box([140, 4, 3.2], [x, DECK + 2.4, t ? 18.5 : -18.5], s.material(opening ? '#5a3324' : '#c9ccd1', { roughness: 0.5 }));
        }
      }
      if (a.traffic === 'walkers' || opening) {
        const n = opening ? 700 : 500;
        const people = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.3, 1.1, 2, 6), s.material('#ffffff'), n);
        const m = new THREE.Matrix4();
        const clothes = opening ? ['#2c2a28', '#4a4038', '#efe3c4', '#1b2a55', '#6b4428'] : ['#f4f2ec', '#c8102e', '#1f5fd1', '#f0a215', '#2f9e44', '#34363a'];
        for (let i = 0; i < n; i++) {
          m.makeTranslation(-HALF - 30 + random() * (HALF * 2 + 60), DECK + 1.25, -15 + random() * 30);
          people.setMatrixAt(i, m);
          people.setColorAt(i, new THREE.Color(clothes[Math.floor(random() * clothes.length)]));
        }
        people.castShadow = true;
        s.root.add(people);
      }
      if (opening) {
        const flagGeo = new THREE.BufferGeometry();
        flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1.2, 0, 0, 1.2, 0, 0, 0, -2.4, 0], 3));
        flagGeo.computeVertexNormals();
        const bunting = new THREE.InstancedMesh(flagGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide }), 300);
        const m = new THREE.Matrix4();
        const colours = ['#c8102e', '#1f5fd1', '#f4f2ec', '#f4d40c'];
        for (let i = 0; i < 300; i++) {
          const t = (i % 150) / 150;
          const x = -HALF + t * HALF * 2;
          const sag = Math.sin(((i % 15) / 15) * Math.PI) * 3;
          m.makeTranslation(x, Math.max(DECK + 4, botY(x) - 2 - sag), i < 150 ? -TZ : TZ);
          bunting.setMatrixAt(i, m);
          bunting.setColorAt(i, new THREE.Color(colours[i % colours.length]));
        }
        s.root.add(bunting);
      }
    }

    // ----- fireworks -----
    const sparkles: THREE.Material[] = [];
    if (a.lights === 'fireworks' && !building) {
      const gold = new THREE.MeshBasicMaterial({ color: '#ffd77a', transparent: true, opacity: 0.85, depthWrite: false });
      sparkles.push(gold);
      const fall = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1, 0.5), gold, 520);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 520; i++) {
        const x = -HALF + random() * HALF * 2, len = 10 + random() * (DECK - 14);
        m.compose(new THREE.Vector3(x, DECK - 3.6 - len / 2, 23.5 + random() * 2), new THREE.Quaternion(), new THREE.Vector3(1, len, 1));
        fall.setMatrixAt(i, m);
      }
      s.root.add(fall);
      const burstColours = ['#ff4fa3', '#ffd34a', '#62d9ff', '#ff6b3d', '#c7ff5a'];
      const rays = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 1, 0.6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false }), 7 * 36);
      let r = 0;
      for (let b = 0; b < 7; b++) {
        const centre = new THREE.Vector3(-HALF * 0.9 + random() * HALF * 1.8, 150 + random() * 60, (random() - 0.5) * 40);
        const colour = new THREE.Color(burstColours[b % burstColours.length]);
        const radius = 16 + random() * 14;
        for (let k = 0; k < 36; k++) {
          const dir = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          m.compose(centre.clone().addScaledVector(dir, radius * 0.6), q, new THREE.Vector3(1, radius * 0.7, 1));
          rays.setMatrixAt(r, m); rays.setColorAt(r, colour); r++;
        }
      }
      s.root.add(rays);
    }

    // ----- weather -----
    const veils: THREE.Mesh[] = [];
    if (a.weather === 'fog' || a.weather === 'haze') {
      const puff = canvasTexture(128, 128, (c) => {
        const g = c.createRadialGradient(64, 64, 6, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, 128, 128);
      }, false);
      const fog = new THREE.MeshBasicMaterial({ map: puff, transparent: true, opacity: a.weather === 'fog' ? 0.85 : 0.45, depthWrite: false, color: a.weather === 'fog' ? '#eef1f2' : '#efe2cc' });
      const n = a.weather === 'fog' ? 22 : 10;
      for (let k = 0; k < n; k++) {
        const fogLow = a.weather === 'fog';
        const x = fogLow ? (k % 2 ? 1 : -1) * (HALF + 20 - random() * 140) : HALF * (0.2 + random() * 0.9);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(110 + random() * 60, fogLow ? 40 : 90), fog);
        mesh.position.set(x, fogLow ? 12 + random() * 26 : 50 + random() * 40, 30 + (random() - 0.5) * 30);
        s.root.add(mesh);
        veils.push(mesh);
      }
    }
    if (a.weather === 'storm') {
      const bolt: P3[] = [];
      let x = HALF * (0.3 + random() * 0.4), y = 240;
      while (y > 0) { bolt.push([x, y, 30]); x += (random() - 0.5) * 30; y -= 18 + random() * 14; }
      bolt.push([x, 0, 30]);
      const flash = new THREE.MeshBasicMaterial({ color: '#f4f6ff', transparent: true, opacity: 0.9, depthWrite: false });
      sparkles.push(flash);
      s.tube(bolt, 2.4, flash).castShadow = false;
    }

    // Turn it so the arch reads with depth.
    const all = new THREE.Group();
    for (const child of [...s.root.children]) all.add(child);
    s.root.add(all);
    all.rotation.y = -0.44;

    const energy = 0.2 + mood.energy;
    return s.finish({
      update: (_dt, time) => {
        for (const [i, v] of veils.entries()) v.position.x += Math.sin(time * 0.1 + i) * 0.05 * energy;
        for (const [i, m] of sparkles.entries()) (m as THREE.MeshBasicMaterial).opacity = 0.55 + 0.4 * Math.abs(Math.sin(time * (1.5 + i) * energy));
      },
    });
  },
});
