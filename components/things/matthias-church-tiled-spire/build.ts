import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, paint, paintHex } from '@conjure/kit';

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

/** Glazed Zsolnay tiles: diamonds of the main colour in a gold and ochre lattice, zigzag bands. */
function tileMap(main: string, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d')!;
  const base = new THREE.Color(main);
  const deep = base.clone().multiplyScalar(0.55), light = base.clone().lerp(new THREE.Color('#ffffff'), 0.25);
  g.fillStyle = '#c99a2e'; g.fillRect(0, 0, 256, 256);
  const D = 64;
  for (let row = -1; row < 256 / (D / 2) + 1; row++) for (let col = -1; col < 256 / D + 1; col++) {
    const cx = col * D + (row % 2 ? D / 2 : 0), cy = row * (D / 2);
    const band = Math.floor((row + 64) / 3) % 3;
    const fill = band === 0 ? base : band === 1 ? deep : new THREE.Color('#d9a83a');
    g.fillStyle = `#${fill.clone().offsetHSL(0, 0, (random() - 0.5) * 0.06).getHexString()}`;
    g.beginPath(); g.moveTo(cx, cy - D / 2 + 2); g.lineTo(cx + D / 2 - 2, cy); g.lineTo(cx, cy + D / 2 - 2); g.lineTo(cx - D / 2 + 2, cy); g.closePath(); g.fill();
    g.fillStyle = `#${light.getHexString()}`;
    g.fillRect(cx - 4, cy - 4, 8, 8);
  }
  // Glaze sheen and the dark lines of the tile courses.
  g.strokeStyle = 'rgba(40,30,20,0.35)'; g.lineWidth = 1;
  for (let y = 0; y < 256; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

function roseMap(lit: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#d8cdb5'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = lit ? '#e8a640' : '#2a2a34'; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#d8cdb5'; g.lineWidth = 5;
  for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.sin(t) * 58, 64 + Math.cos(t) * 58); g.stroke(); }
  g.beginPath(); g.arc(64, 64, 18, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2); g.stroke();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    tiles: paint('What is the main colour of the glazed roof tiles?', ['green', 'forest', 'teal', 'amber', 'gold', 'rust', 'red', 'navy', 'purple']),
    era: choice('When is it?', {
      today: 'Today, as rebuilt in the 1890s: crisp Gothic stone, glittering tile roof, the openwork spire.',
      mosque: 'The Ottoman century: walls whitewashed, a plain lead roof, a crescent on a stunted tower.',
      wartime: '1945, shelled: the roof stripped to rafters in places, scorched stone, the spire chipped.',
    }),
    bells: choice('What are the bells doing?', {
      ringing: 'Ringing for a coronation or a wedding: the bells swing in the open belfry.',
      silent: 'Silence: the bells hang still.',
    }),
    restoration: choice('Is any of it under restoration?', {
      none: 'No: everything stands open to view.',
      spire: 'The openwork spire is shrouded in pale restoration netting.',
      roof: 'Scaffolding along one side of the nave while the tiles are relaid.',
    }),
    birds: choice('What birds are on it?', {
      none: 'No birds.',
      raven: 'A single black raven perched on the spire finial, the old king\'s bird.',
      pigeons: 'Pigeons lined along the roof ridge and the pinnacles.',
      jackdaws: 'A wheeling flock of jackdaws round the spire.',
    }),
    people: choice('Who is outside the west door?', {
      none: 'Nobody: the square is empty.',
      queue: 'A queue of tourists along the front.',
      wedding: 'A wedding party spilling out of the portal.',
      mass: 'A crowd leaving after high mass.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const mosque = a.era === 'mosque', war = a.era === 'wartime';
    const stoneColour = new THREE.Color(mosque ? '#f1eee6' : war ? '#a39a88' : '#d8cdb5').lerp(new THREE.Color('#6d675c'), mood.wear * 0.4);
    const stone = s.material(stoneColour, { roughness: 0.85 });
    const darkStone = s.material(stoneColour.clone().multiplyScalar(0.8), { roughness: 0.9 });
    const dark = s.material('#2a2a30', { roughness: 0.7 });
    const lit = lowSun > 0.55 && !war;
    const glass = lit ? new THREE.MeshStandardMaterial({ color: '#f0b85a', emissive: '#e8963a', emissiveIntensity: mix(0.6, 1.4, lowSun), roughness: 0.5 }) : dark;
    const tileTexture = tileMap(paintHex(a.tiles, '#2f9e44'), random);
    const roofMat = (u: number, v: number) => {
      if (mosque) return s.material('#8d9196', { roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
      const map = tileTexture.clone();
      map.repeat.set(u, v);
      map.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide });
    };
    const gold = s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 });

    const buttress = new Batch(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), stone);
    const pinnacle = new Batch(new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0), stone);
    const windows = new Batch(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), glass);
    const people = new Batch(new THREE.CapsuleGeometry(0.3, 1.1, 2, 5).translate(0, 0.85, 0), s.material('#ffffff', { roughness: 0.9 }));

    // Ground: the paved square on the hilltop.
    s.box([110, 0.4, 70], [4, 0.2, 4], s.material(new THREE.Color('#bdb5a4').lerp(new THREE.Color('#77705f'), mood.wear * 0.3), { roughness: 0.95 }));
    const G = 0.4;

    // Nave: tall walls, buttresses with pinnacles, lancet windows; the west front faces +x.
    const X0 = -28, X1 = 30, HALF = 13, WALL = 16, RISE = 21;
    s.box([X1 - X0, WALL, HALF * 2], [(X0 + X1) / 2, G + WALL / 2, 0], stone);
    for (let x = X0 + 4; x < X1 - 2; x += 7.2) for (const side of [-1, 1]) {
      buttress.add([x, G, side * (HALF + 1.1)], [1.8, WALL - 2, 2.2]);
      pinnacle.add([x, G + WALL - 2, side * (HALF + 1.1)], [0.9, 6, 0.9]);
      windows.add([x + 3.6, G + 5, side * (HALF + 0.1)], [2.6, 11, 0.5]);
    }
    // Apse: half of an eight-sided tower with its own tiled cone.
    s.cylinder(11, 11, WALL - 2, [X0, G + (WALL - 2) / 2, 0], stone, 8).rotation.y = Math.PI / 8;
    for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2 + Math.PI / 8; windows.add([X0 + Math.sin(t) * 10.4, G + 5, Math.cos(t) * 10.4], [2.2, 10, 0.5], t); }
    const apseRoof = s.mesh(new THREE.ConeGeometry(12, 16, 8, 1, true).translate(0, 8, 0), roofMat(4, 3), [X0, G + WALL - 2, 0]);
    apseRoof.rotation.y = Math.PI / 8;

    // The steep tiled roof: two slopes with the patterned tiles, stone gables at each end.
    const slope = Math.hypot(HALF + 0.8, RISE), angle = Math.atan2(HALF + 0.8, RISE);
    const roofMaterial = roofMat((X1 - X0) / 14, slope / 14);
    const ripped: number[] = [];
    const sections = 6;
    for (const side of [-1, 1]) for (let k = 0; k < sections; k++) {
      const len = (X1 - X0) / sections, cx = X0 + (k + 0.5) * len;
      if (war && random() < 0.3) { ripped.push(cx); continue; }
      const plane = s.mesh(new THREE.PlaneGeometry(len + 0.05, slope), roofMaterial, [cx, G + WALL + RISE / 2, side * (HALF + 0.8) / 2]);
      plane.rotation.x = -side * angle;
      const uv = plane.geometry.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) / sections + k / sections);
    }
    for (const cx of ripped) for (let r = -2; r <= 2; r++) {
      const rafter = s.box([0.4, slope, 0.4], [cx + r * 1.8, G + WALL + RISE / 2, 0], dark);
      rafter.rotation.x = (r % 2 ? 1 : -1) * angle;
    }
    s.box([X1 - X0, 0.8, 0.8], [(X0 + X1) / 2, G + WALL + RISE, 0], mosque ? stone : gold);
    const gableShape = new THREE.Shape(); gableShape.moveTo(-HALF - 1, 0); gableShape.lineTo(HALF + 1, 0); gableShape.lineTo(0, RISE + 2); gableShape.closePath();
    const gable = new THREE.ExtrudeGeometry(gableShape, { depth: 1.6, bevelEnabled: false }).rotateY(Math.PI / 2);
    s.mesh(gable, stone, [X1, G + WALL, 0]);
    s.mesh(gable.clone(), stone, [X0 + 0.8, G + WALL, 0]);
    // West front: rose window, deep portal, pinnacled corners.
    const rose = s.mesh(new THREE.CircleGeometry(4.2, 24), new THREE.MeshStandardMaterial({ map: roseMap(lit), roughness: 0.7, emissive: lit ? '#e8963a' : '#000000', emissiveIntensity: 0.3 }), [X1 + 1.65, G + WALL - 4, 0]);
    rose.rotation.y = Math.PI / 2;
    rose.castShadow = false;
    const portal = new THREE.Shape(); portal.moveTo(-3, 0); portal.lineTo(-3, 6); portal.quadraticCurveTo(-3, 10, 0, 11.5); portal.quadraticCurveTo(3, 10, 3, 6); portal.lineTo(3, 0); portal.closePath();
    s.mesh(new THREE.ExtrudeGeometry(portal, { depth: 0.4, bevelEnabled: false }).rotateY(Math.PI / 2), dark, [X1 + 0.25, G, 0]);
    const arch = new THREE.Shape(); arch.moveTo(-4.4, 0); arch.lineTo(-4.4, 6.5); arch.quadraticCurveTo(-4.4, 12, 0, 14); arch.quadraticCurveTo(4.4, 12, 4.4, 6.5); arch.lineTo(4.4, 0); arch.lineTo(3.2, 0); arch.lineTo(3.2, 6.2); arch.quadraticCurveTo(3.2, 10.5, 0, 12); arch.quadraticCurveTo(-3.2, 10.5, -3.2, 6.2); arch.lineTo(-3.2, 0); arch.closePath();
    s.mesh(new THREE.ExtrudeGeometry(arch, { depth: 1.6, bevelEnabled: false }).rotateY(Math.PI / 2), darkStone, [X1 + 0.1, G, 0]);
    for (const z of [-HALF - 1, HALF + 1]) pinnacle.add([X1 + 0.8, G + WALL, z], [1.1, 7, 1.1]);
    pinnacle.add([X1 + 0.8, G + WALL + RISE + 2, 0], [0.8, 5, 0.8]);

    // The small tower on the north corner: square shaft, octagon, pointed tiled cap.
    const bx = X1 - 3, bz = -HALF - 5;
    s.box([8, 30, 8], [bx, G + 15, bz], stone);
    s.cylinder(4.2, 4.6, 8, [bx, G + 34, bz], stone, 8);
    for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; windows.add([bx + Math.sin(t) * 4.3, G + 31.5, bz + Math.cos(t) * 4.3], [1.3, 5, 0.4], t); }
    s.mesh(new THREE.ConeGeometry(4.8, 12, 8, 1, true).translate(0, 6, 0), roofMat(2, 2), [bx, G + 38, bz]);
    s.box([0.3, 3, 0.3], [bx, G + 51.4, bz], gold);

    // The great tower: square shaft to the belfry, octagonal stages, a pierced lantern, an openwork spire.
    const tx = X1 - 3, tz = HALF + 6;
    s.box([10, 40, 10], [tx, G + 20, tz], stone);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      buttress.add([tx + dx * 5.2, G, tz + dz * 5.2], [2.2, 38, 2.2]);
      pinnacle.add([tx + dx * 5.2, G + 38, tz + dz * 5.2], [1.1, 8, 1.1]);
    }
    for (const k of [0, 1, 2]) for (const [dx, dz, turn] of [[5.05, 0, Math.PI / 2], [0, 5.05, 0]] as const) windows.add([tx + dx, G + 8 + k * 10, tz + dz], [k === 2 ? 2.6 : 1.4, k === 2 ? 7 : 4, 0.4], turn);
    // Octagonal belfry with tall openings and a bell inside.
    const bel0 = G + 40;
    s.cylinder(5.4, 5.6, 12, [tx, bel0 + 6, tz], stone, 8).rotation.y = Math.PI / 8;
    for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; windows.add([tx + Math.sin(t) * 5.3, bel0 + 2, tz + Math.cos(t) * 5.3], [2.2, 8.5, 0.6], t); }
    const bronze = s.material('#7a5a32', { metalness: 0.7, roughness: 0.4 });
    const pivot = new THREE.Group();
    pivot.position.set(tx + 2.2, bel0 + 9.5, tz + 2.2);
    const bell = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [1.8, 0], [1.6, 0.5], [1.2, 1.8], [0.9, 2.7], [0, 3]].map(([r, y]) => new THREE.Vector2(r, y)), 14), bronze);
    bell.position.y = -3.3; bell.castShadow = true;
    pivot.add(bell);
    s.root.add(pivot);
    s.cylinder(6, 6, 1.2, [tx, bel0 + 12.6, tz], stone, 8).rotation.y = Math.PI / 8;
    for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2 + Math.PI / 8; pinnacle.add([tx + Math.sin(t) * 5.8, bel0 + 13.2, tz + Math.cos(t) * 5.8], [0.5, 5, 0.5]); }

    const lan0 = bel0 + 13.2;
    const spireTop = lan0 + 34;
    if (mosque) {
      // A stunted cap and a gilt crescent in place of the spire.
      s.mesh(new THREE.ConeGeometry(5.4, 8, 8).translate(0, 4, 0), s.material('#8d9196', { roughness: 0.6, metalness: 0.3 }), [tx, lan0, tz]);
      s.rod([tx, lan0 + 8, tz], [tx, lan0 + 12, tz], 0.2, gold);
      const crescent = s.ring(1.2, 0.22, [tx, lan0 + 13.2, tz], gold, Math.PI * 1.4);
      crescent.rotation.z = Math.PI * 0.8;
    } else {
      // Pierced lantern: a ring of slender shafts between two rings.
      s.cylinder(3.6, 4.4, 1.6, [tx, lan0 + 0.8, tz], stone, 8);
      const shafts = new Batch(new THREE.CylinderGeometry(0.28, 0.28, 1, 6).translate(0, 0.5, 0), stone);
      for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; shafts.add([tx + Math.sin(t) * 3.6, lan0 + 1.6, tz + Math.cos(t) * 3.6], [1, 8, 1]); }
      s.cylinder(2.2, 2.2, 8, [tx, lan0 + 5.6, tz], dark, 8);
      s.cylinder(4, 4, 1, [tx, lan0 + 10.1, tz], stone, 8);
      for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2 + Math.PI / 8; pinnacle.add([tx + Math.sin(t) * 4, lan0 + 10.6, tz + Math.cos(t) * 4], [0.4, 4, 0.4]); }
      // Openwork spire: eight crocketed ribs over a slim dark core, tied by rings of tracery.
      const s0 = lan0 + 10.6;
      const chipped = war ? 0.7 : 1;
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * Math.PI * 2;
        const foot = new THREE.Vector3(tx + Math.sin(t) * 3.7, s0, tz + Math.cos(t) * 3.7);
        const tip = new THREE.Vector3(tx, s0 + (spireTop - s0) * chipped, tz);
        s.rod(foot.toArray() as P, tip.toArray() as P, 0.32, stone, 0.12);
        for (let k = 1; k < 9; k++) {
          const p = foot.clone().lerp(tip, k / 10);
          pinnacle.add([p.x + Math.sin(t) * 0.3, p.y, p.z + Math.cos(t) * 0.3], [0.32, 0.9, 0.32]);
        }
      }
      s.cylinder(0.25, 1.6, (spireTop - s0) * chipped, [tx, s0 + (spireTop - s0) * chipped / 2, tz], darkStone, 8);
      for (let k = 1; k < 5; k++) {
        const r = 3.7 * (1 - k / 5);
        s.ring(r, 0.14, [tx, s0 + (spireTop - s0) * k / 5 * chipped, tz], stone).rotation.x = Math.PI / 2;
      }
      shafts.flush(s);
      if (!war) {
        s.ball([0.6, 0.6, 0.6], [tx, spireTop + 0.4, tz], gold, 10);
        s.box([0.25, 3, 0.25], [tx, spireTop + 2.2, tz], gold);
        s.box([1.6, 0.25, 0.25], [tx, spireTop + 2.8, tz], gold);
      }
    }
    if (a.restoration === 'spire' && !mosque) {
      const net = new THREE.MeshStandardMaterial({ color: '#e4e4dc', transparent: true, opacity: 0.58, depthWrite: false, side: THREE.DoubleSide, roughness: 0.95 });
      s.mesh(new THREE.ConeGeometry(5.2, spireTop - lan0 + 2, 12, 1, true).translate(0, (spireTop - lan0 + 2) / 2, 0), net, [tx, lan0, tz]).castShadow = false;
      for (let i = 0; i < 6; i++) s.ring(5.2 * (1 - i / 6), 0.1, [tx, lan0 + (spireTop - lan0) * i / 6, tz], s.material('#77746c')).rotation.x = Math.PI / 2;
    }
    if (a.restoration === 'roof') {
      const poles = new Batch(new THREE.CylinderGeometry(0.14, 0.14, 1, 4).translate(0, 0.5, 0), s.material('#77746c', { metalness: 0.4 }));
      for (let x = X0 + 2; x < X1 - 14; x += 3) { poles.add([x, G, HALF + 4], [1, WALL + 8, 1]); poles.add([x, G, HALF + 6], [1, WALL + 4, 1]); }
      for (let y = G + 3; y < G + WALL + 6; y += 3) s.box([X1 - X0 - 14, 0.25, 2.4], [(X0 + X1 - 14) / 2 - 1, y, HALF + 5], s.material('#8a6a44'));
      poles.flush(s);
    }

    // Birds.
    const flock: THREE.Object3D[] = [];
    if (a.birds === 'raven') {
      const black = s.material('#141418', { roughness: 0.5 });
      const y = mosque ? lan0 + 14.4 : war ? lan0 + 10.6 + (spireTop - lan0 - 10.6) * 0.7 + 0.4 : spireTop + 3.1;
      s.ball([0.9, 0.55, 0.45], [tx, y + 0.6, tz], black, 10);
      s.ball([0.35, 0.35, 0.35], [tx + 0.8, y + 1.0, tz], black, 8);
      s.mesh(new THREE.ConeGeometry(0.14, 0.6, 5).rotateZ(-Math.PI / 2), black, [tx + 1.3, y + 0.95, tz]);
      s.box([0.9, 0.08, 0.35], [tx - 1.0, y + 0.45, tz], black);
    }
    if (a.birds === 'pigeons') {
      const birds = new Batch(new THREE.SphereGeometry(0.3, 6, 4), s.material('#6d7078'));
      for (let x = X0 + 1; x < X1 - 1; x += 1.2 + random() * 1.5) birds.add([x, G + WALL + RISE + 0.6, (random() - 0.5) * 0.4], [1.3, 0.9, 0.8]);
      for (let x = X0 + 4; x < X1 - 2; x += 7.2) if (random() < 0.5) birds.add([x, G + WALL + 4.3, HALF + 1.1], [1.3, 0.9, 0.8]);
      birds.flush(s);
    }
    if (a.birds === 'jackdaws') {
      const black = s.material('#1c1c20', { side: THREE.DoubleSide });
      for (let i = 0; i < 26; i++) {
        const bird = new THREE.Group();
        const t = random() * Math.PI * 2, r = 9 + random() * 14, y = bel0 + random() * 34;
        for (const side of [-1, 1]) { const wing = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.35), black); wing.position.x = side * 0.5; wing.rotation.z = side * 0.35; bird.add(wing); }
        bird.position.set(tx + Math.sin(t) * r, y, tz + Math.cos(t) * r);
        bird.rotation.y = t + Math.PI / 2;
        bird.userData = { t, r, y, speed: 0.2 + random() * 0.3 };
        s.root.add(bird);
        flock.push(bird);
      }
    }

    // People at the west door.
    const tones = ['#3a3a42', '#6a4a36', '#8a2a2a', '#2c3d55', '#6b6b62', '#c9b27a', '#e8e2d6'];
    const crowd = { none: 0, queue: 40, wedding: 26, mass: 140 }[a.people];
    for (let i = 0; i < crowd; i++) {
      let x: number, z: number;
      if (a.people === 'queue') { x = X1 + 4 + (i % 2) * 1.0; z = -10 + i * 0.8; }
      else { x = X1 + 3 + random() * (a.people === 'mass' ? 22 : 10); z = (random() - 0.5) * (a.people === 'mass' ? 50 : 14); }
      const colour = a.people === 'wedding' && i === 0 ? '#f8f6f0' : a.people === 'wedding' && i === 1 ? '#202228' : tones[i % tones.length];
      people.add([x, G, z], [1, 0.95 + random() * 0.15, 1], 0, colour);
    }
    if (a.people === 'wedding') {
      const petals = new Batch(new THREE.SphereGeometry(0.12, 4, 3), s.material('#f4f2ec'));
      for (let i = 0; i < 60; i++) petals.add([X1 + 2 + random() * 8, G + 0.5 + random() * 3, (random() - 0.5) * 10], [1, 1, 1]);
      petals.flush(s, false);
    }

    for (const batch of [buttress, pinnacle, windows, people]) batch.flush(s);

    const swing = a.bells === 'ringing' ? mix(0.3, 0.7, mood.energy) : 0;
    pivot.rotation.x = swing * 0.8;
    const speed = mix(0.3, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        pivot.rotation.x = Math.sin(time * 1.5) * swing;
        for (const bird of flock) {
          const { t, r, y, speed: v } = bird.userData as { t: number; r: number; y: number; speed: number };
          const angle = t + time * v * speed;
          bird.position.set(tx + Math.sin(angle) * r, y + Math.sin(time + t) * 0.8, tz + Math.cos(angle) * r);
          bird.rotation.y = angle + Math.PI / 2;
          bird.children.forEach((wing, k) => { wing.rotation.z = (k ? 1 : -1) * (0.2 + Math.sin(time * 9 + t) * 0.4); });
        }
      },
    });
  },
});
