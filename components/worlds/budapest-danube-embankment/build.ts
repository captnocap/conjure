import * as THREE from 'three';
import { type Placeable, type World, Sculpture, choice, defineWorld, disposeTree, mix } from '@conjure/kit';

type P = [number, number, number];

class Batch {
  readonly list: { m: THREE.Matrix4; c?: THREE.Color }[] = [];
  constructor(readonly geometry: THREE.BufferGeometry, readonly material: THREE.Material) {}
  add(at: P, scale: P, turn = 0, colour?: THREE.ColorRepresentation, tilt = 0) {
    this.list.push({
      m: new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, turn, 0)), new THREE.Vector3(...scale)),
      c: colour === undefined ? undefined : new THREE.Color(colour),
    });
  }
  flush(parent: THREE.Object3D, shadow = true) {
    if (!this.list.length) { this.geometry.dispose(); return null; }
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.list.length);
    this.list.forEach(({ m, c }, index) => { mesh.setMatrixAt(index, m); if (c) mesh.setColorAt(index, c); });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}

const unitBox = () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
/** A unit gable prism: 1 wide (z), 1 long (x), 1 high, sitting on y = 0. */
const unitPrism = () => {
  const shape = new THREE.Shape(); shape.moveTo(-0.5, 0); shape.lineTo(0.5, 0); shape.lineTo(0, 1); shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5).rotateY(Math.PI / 2);
};

function cobbleMap(base: THREE.Color, random: () => number, snow: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d')!;
  g.fillStyle = `#${base.clone().multiplyScalar(0.78).getHexString()}`;
  g.fillRect(0, 0, 256, 256);
  const S = 16;
  for (let row = 0; row < 256 / S; row++) for (let col = -1; col < 256 / S + 1; col++) {
    const x = col * S + (row % 2 ? S / 2 : 0), y = row * S;
    const tone = base.clone().offsetHSL(0, (random() - 0.5) * 0.04, (random() - 0.5) * 0.07);
    if (snow && random() < 0.75) tone.lerp(new THREE.Color('#f2f2ee'), 0.8);
    g.fillStyle = `#${tone.getHexString()}`;
    g.beginPath(); g.ellipse(x + S / 2, y + S / 2, S / 2 - 0.8, S / 2 - 1.2, 0, 0, Math.PI * 2); g.fill();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

function blockMap(base: THREE.Color, wear: number, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const g = canvas.getContext('2d')!;
  g.fillStyle = `#${base.getHexString()}`; g.fillRect(0, 0, 256, 64);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 9; col++) {
    g.fillStyle = `#${base.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1).getHexString()}`;
    g.fillRect(col * 32 + (row % 2) * 16 + 1, row * 16 + 1, 30, 14);
  }
  const grad = g.createLinearGradient(0, 64, 0, 30);
  grad.addColorStop(0, `rgba(40,52,40,${0.5 + wear * 0.4})`); grad.addColorStop(1, 'rgba(40,52,40,0)');
  g.fillStyle = grad; g.fillRect(0, 30, 256, 34);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  return map;
}

function puffMap() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export default defineWorld({
  questions: {
    era: choice('When is the river seen?', {
      today: 'Today: restored facades, floodlights and trams, a city that has made peace with its postcards.',
      belle: 'Around 1900, the empire at its height: gas lamps, a paddle steamer, everything new and proud.',
      ruins: 'Early 1945, after the siege: bridges blown into the river, gutted roofs, smoke and no lights at all.',
    }),
    farBank: choice('What fills the far bank?', {
      parliament: 'The long Gothic Parliament with its dome and pinnacles, right on the water.',
      skyline: 'Only the line of Pest roofs, cupolas and domes, the riverfront left open.',
    }),
    bridge: choice('Which bridge spans the river?', {
      chain: 'The old chain bridge: stone pylons with arches, iron chains strung with bulbs.',
      white: 'A white cable suspension bridge in one long span between slim white pylons.',
      iron: 'A green iron cantilever bridge with lacy trusses and masts topped by bronze birds.',
      none: 'No bridge in view: open water to the far bank.',
    }),
    season: choice('What season is it?', {
      summer: 'Summer: full plane trees along the far bank, warm air over the water.',
      autumn: 'Autumn: amber trees, fallen leaves blown along the cobbles.',
      winter: 'Winter: snow on the quay and the roofs, ice floes drifting downriver.',
    }),
    river: choice('What is on the river?', {
      empty: 'Nothing: the broad grey-green water alone.',
      cruiser: 'A long river cruiser with lit windows sliding past (a paddle steamer in older days).',
      barge: 'A low black barge pushing slowly upstream.',
      rowing: 'A rowing eight cutting across the current.',
    }),
    sky: choice('What is in the sky?', {
      plain: 'Nothing: open sky over the city.',
      fireworks: 'Fireworks bursting over the river, a holiday night.',
      gulls: 'Gulls wheeling low over the water.',
      moon: 'A large pale moon rising over the far roofs.',
    }),
    tram: choice('Is a tram running along the far bank?', {
      tram: 'The little yellow riverside tram crawling along the Pest embankment, windows lit.',
      none: 'No tram: the riverside road is empty.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const art = new Sculpture(context);
    const root = art.root;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const ruins = a.era === 'ruins', belle = a.era === 'belle';
    const winter = a.season === 'winter';
    const glow = ruins ? 0 : Math.pow(lowSun, 1.3);
    const fogAmount = Math.min(1, 0.12 + mood.wear * 0.7 + (winter ? 0.1 : 0));
    const raining = mood.wear > 0.62 && !winter;

    // Sky: pale at noon, rose at dawn, a mid-tone violet dusk; wear greys it.
    const noonSky = new THREE.Color('#dfe4e4');
    const dawnSky = new THREE.Color('#e9cfc6').lerp(new THREE.Color('#eab48e'), mood.warmth * 0.5);
    const duskSky = new THREE.Color('#a497b2').lerp(new THREE.Color('#d29a82'), mood.warmth * 0.55);
    const background = noonSky.clone().lerp(mood.daylight < 0.5 ? dawnSky : duskSky, lowSun).lerp(new THREE.Color('#9c9e9e'), mood.wear * 0.4);
    if (ruins) background.lerp(new THREE.Color('#8f8a84'), 0.35);
    const haze = background.clone().lerp(new THREE.Color('#ffffff'), 0.12);
    const hazed = (colour: THREE.ColorRepresentation, amount: number) => new THREE.Color(colour).lerp(haze, Math.min(0.92, amount));

    const flood = new THREE.Color().setHSL(mix(0.11, 0.075, mood.warmth), 0.9, 0.5);
    const lampGlow = new THREE.MeshStandardMaterial({ color: '#fff0c8', emissive: belle ? '#ffb24a' : '#ffc870', emissiveIntensity: ruins ? 0 : mix(0.6, 2.4, lowSun), roughness: 0.4 });
    const windowGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc66a').lerp(haze, 0.2) });
    const iron = art.material('#2b2e2c', { roughness: 0.55, metalness: 0.45 });
    const ground = new THREE.Group();
    root.add(ground);

    // ----- near: the Buda quay, cobbles, tram rails, railing, lamps and bollards -----
    const QY = 2.4, EDGE = 6;
    const cobbleBase = new THREE.Color('#9a9488').lerp(new THREE.Color('#5e5a54'), mood.wear * 0.4);
    const cobbles = cobbleMap(cobbleBase, random, winter);
    cobbles.repeat.set(72, 10);
    const quayTop = new THREE.Mesh(new THREE.PlaneGeometry(180, 24), new THREE.MeshStandardMaterial({ map: cobbles, roughness: raining ? 0.25 : 0.9, metalness: raining ? 0.15 : 0 }));
    quayTop.rotation.x = -Math.PI / 2;
    quayTop.position.set(0, QY, EDGE + 12);
    quayTop.receiveShadow = true;
    ground.add(quayTop);
    const wallMap = blockMap(new THREE.Color('#a39c8c').lerp(new THREE.Color('#5e5a54'), mood.wear * 0.4), mood.wear, random);
    wallMap.repeat.set(36, 1);
    const quayWall = art.box([180, QY + 1, 0.6], [0, (QY - 1) / 2, EDGE - 0.3], new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.9 }));
    void quayWall;
    art.box([180, 0.25, 0.9], [0, QY + 0.12, EDGE + 0.15], art.material('#b6ae9c', { roughness: 0.85 }));
    // Tram rails in the cobbles.
    const steel = art.material('#8d9092', { metalness: 0.8, roughness: 0.3 });
    for (const z of [7.3, 8.74]) art.box([180, 0.05, 0.09], [0, QY + 0.025, z], steel);
    // The railing along the river edge.
    const rail = new Batch(unitBox(), iron);
    const broken = (x: number) => ruins && Math.abs(Math.sin(x * 0.37)) > 0.82;
    for (let x = -60; x <= 60; x += 0.32) if (!broken(x)) rail.add([x, QY + 0.25, EDGE + 0.3], [0.035, 0.85, 0.035]);
    for (let x = -60; x <= 60; x += 2.2) if (!broken(x)) rail.add([x, QY + 0.25, EDGE + 0.3], [0.1, 0.95, 0.1]);
    art.box([120, 0.07, 0.1], [0, QY + 1.15, EDGE + 0.3], iron);
    art.box([120, 0.04, 0.05], [0, QY + 0.33, EDGE + 0.3], iron);
    // Bollards.
    const bollard = new THREE.LatheGeometry([[0, 0], [0.16, 0], [0.13, 0.1], [0.1, 0.45], [0.13, 0.58], [0.1, 0.66], [0, 0.7]].map(([r, y]) => new THREE.Vector2(r, y)), 12);
    const bollards = new Batch(bollard, iron);
    for (let x = -40; x <= 40; x += 4.4) bollards.add([x + 1.1, QY, EDGE + 0.75], [1, 1, 1]);
    bollards.flush(root);
    // Cast-iron lamp posts with twin lanterns.
    const lampXs = [-26, -15, -4.3, 4.9, 16, 27];
    const lanterns = new Batch(new THREE.SphereGeometry(0.26, 12, 8), ruins ? art.material('#5a5a56') : lampGlow);
    for (const x of lampXs) {
      const z = EDGE + 0.9, bent = ruins && random() < 0.4;
      art.lathe([[0.32, 0], [0.3, 0.35], [0.18, 0.5], [0.14, 1.2], [0.1, 1.4], [0.08, 4.4], [0.12, 4.6], [0, 4.7]], iron, [x, QY, z]).rotation.z = bent ? 0.35 : 0;
      if (bent) continue;
      for (const side of [-1, 1]) {
        art.tube([[x, QY + 4.4, z], [x + side * 0.35, QY + 4.75, z], [x + side * 0.6, QY + 4.6, z]], 0.04, iron);
        lanterns.add([x + side * 0.6, QY + 4.35, z], [1, 1.15, 1]);
        art.cylinder(0.07, 0.18, 0.12, [x + side * 0.6, QY + 4.62, z], iron, 8);
      }
    }
    lanterns.flush(root, false);
    // Leaves, snow drifts or rubble on the quay.
    if (a.season === 'autumn') {
      const leaves = new Batch(new THREE.CircleGeometry(0.12, 5).rotateX(-Math.PI / 2), art.material('#c0702a', { side: THREE.DoubleSide }));
      for (let i = 0; i < 260; i++) leaves.add([(random() - 0.5) * 30, QY + 0.01 + random() * 0.01, EDGE + 1 + random() * 8], [1, 1, 1], random() * 6, ['#c0702a', '#d9a23a', '#8a3a1e', '#a85a22'][i % 4]);
      leaves.flush(root, false);
    }
    if (winter) art.box([120, 0.12, 1.2], [0, QY + 0.31, EDGE + 0.6], art.material('#f1f2ee', { roughness: 0.95 }));
    if (ruins) {
      const rubble = new Batch(new THREE.DodecahedronGeometry(1, 0), art.material('#7d776c', { roughness: 0.95 }));
      for (let i = 0; i < 40; i++) rubble.add([(random() - 0.5) * 20 + (random() < 0.5 ? -5 : 5), QY + 0.05, EDGE + 1.2 + random() * 6], [0.12 + random() * 0.3, 0.1 + random() * 0.2, 0.12 + random() * 0.3]);
      rubble.flush(root);
    }
    // The tram.
    let tram: THREE.Group | null = null;
    if (a.tram === 'tram' && !ruins) {
      tram = new THREE.Group();
      const yellow = art.material(belle ? '#d9b44a' : '#f2c21a', { roughness: 0.5 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(11, 2.4, 2.4), yellow);
      body.position.y = 1.6;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.25, 2.2), art.material('#e8e4d8'));
      roof.position.y = 2.92;
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(11.1, 0.5, 2.45), art.material('#3a3a3a'));
      skirt.position.y = 0.55;
      const windowMat = lowSun > 0.5 ? new THREE.MeshStandardMaterial({ color: '#f6d58a', emissive: '#f0b048', emissiveIntensity: 0.8 }) : art.material('#3a4550', { roughness: 0.2, metalness: 0.3 });
      const glass = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.9, 2.45), windowMat);
      glass.position.y = 2.1;
      const pole = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.06), iron);
      pole.position.set(0, 3.5, 0); pole.rotation.z = 0.5;
      for (const mesh of [body, roof, skirt, glass, pole]) { mesh.castShadow = mesh.receiveShadow = true; tram.add(mesh); }
      // Tram 2 on the Pest bank, seen across the water.
      tram.scale.setScalar(0.16);
      tram.position.set(-30 + random() * 6, 1.4, -44.6);
      root.add(tram);
    }

    // ----- mid: the river -----
    const waterColour = new THREE.Color(ruins ? '#6c706a' : '#6f8478').lerp(background, 0.25).lerp(new THREE.Color('#556660'), mood.wear * 0.3);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(260, 64), new THREE.MeshStandardMaterial({ color: waterColour, roughness: 0.14, metalness: 0.3, emissive: background, emissiveIntensity: 0.12 }));
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0, EDGE - 32);
    river.receiveShadow = true;
    ground.add(river);
    // Reflections of the far lights stretched toward us on the water.
    const streaks = new Batch(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffcf78', transparent: true, opacity: 0.45 * glow, depthWrite: false }));
    /** A broken, rippled reflection running from a light toward us. */
    const streak = (x: number, z: number, width: number, length: number) => {
      if (glow < 0.05) return;
      for (let at = 0; at < length;) {
        const dash = 0.3 + random() * 1.4;
        streaks.add([x + (random() - 0.5) * 0.3, 0.02, z + at + dash / 2], [width * (0.4 + random() * 0.8), 1, dash]);
        at += dash + 0.4 + random() * 1.6 * (1 - at / length);
      }
    };
    const ripples = new Batch(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#e8ece6', transparent: true, opacity: 0.25, depthWrite: false }));
    for (let i = 0; i < 70; i++) ripples.add([(random() - 0.5) * 80, 0.015, EDGE - 2 - random() * 40], [1 + random() * 3, 1, 0.05]);
    if (winter) {
      const ice = new Batch(new THREE.CylinderGeometry(1, 1, 0.2, 7), art.material('#e6ebea', { roughness: 0.6 }));
      for (let i = 0; i < 90; i++) ice.add([(random() - 0.5) * 90, 0.08, EDGE - 2 - random() * 40], [0.5 + random() * 1.8, 1, 0.4 + random() * 1.2], random() * 3);
      ice.flush(root);
    }

    // ----- far: the Pest embankment, the Parliament, rows of roofs, cupolas and a great dome -----
    const FAR = -42, BANK = 1.4;
    const farStone = new THREE.Color('#bdb4a0').lerp(new THREE.Color('#6d675c'), mood.wear * 0.4);
    art.box([260, BANK + 0.5, 1], [0, (BANK - 0.5) / 2, FAR], art.material(hazed(farStone, 0.25), { roughness: 0.9 }));
    const farTop = art.box([260, 0.1, 30], [0, BANK - 0.05, FAR - 15], art.material(hazed('#8f8a80', 0.3), { roughness: 0.95 }));
    ground.add(farTop);

    const parliamentGroup = new THREE.Group();
    root.add(parliamentGroup);
    const bodies = new Batch(unitBox(), art.material('#ffffff', { roughness: 0.85 }));
    const roofs = new Batch(unitPrism(), art.material('#ffffff', { roughness: 0.7 }));
    const windows = new Batch(unitBox(), windowGlow);
    const darkWindows = new Batch(unitBox(), art.material('#ffffff', { roughness: 0.8 }));
    const roofTones = ['#8e4a38', '#6a6e72', '#5e7a6c', '#7e5a44', '#9a5a3e'];
    const walls = ['#d8c8a8', '#c9b48e', '#e0d6c2', '#b8a892', '#cdb9a0', '#a9a496', '#d6c0a2'];
    const litShare = ruins ? 0 : mix(0.05, 0.75, glow);
    const domes: { at: P; r: number; h: number; colour: string }[] = [];
    // Three rows of blocks going back into the haze.
    const rows: { z: number; depth: number; h: [number, number]; fog: number }[] = [
      { z: FAR - 8, depth: 4, h: [3.2, 5.2], fog: 0.15 + fogAmount * 0.35 },
      { z: FAR - 17, depth: 5, h: [3.8, 6.4], fog: 0.3 + fogAmount * 0.5 },
      { z: FAR - 30, depth: 6, h: [4.2, 7.6], fog: 0.45 + fogAmount * 0.55 },
    ];
    const parliamentShown = a.farBank === 'parliament';
    rows.forEach((row, r) => {
      for (let x = -120; x < 120;) {
        const w = 3 + random() * 5;
        const cx = x + w / 2;
        x += w + 0.15;
        if (r === 0 && parliamentShown && cx > -33 && cx < 4) continue;
        const h = mix(row.h[0], row.h[1], random());
        const wall = hazed(walls[Math.floor(random() * walls.length)], row.fog);
        bodies.add([cx, BANK, row.z], [w, h, row.depth], 0, wall.clone().lerp(new THREE.Color('#5a5650'), mood.wear * 0.25));
        if (!(ruins && random() < 0.3)) roofs.add([cx, BANK + h, row.z], [w, 1.2 + random() * 1.4, row.depth], 0, hazed(winter ? '#e8eaea' : roofTones[Math.floor(random() * roofTones.length)], row.fog));
        const floors = Math.floor(h / 1.1);
        for (let f = 0; f < floors; f++) for (let k = 0; k < Math.floor(w / 1.1); k++) {
          const lit = random() < litShare * (r === 0 ? 1 : 0.7);
          (lit ? windows : darkWindows).add([cx - w / 2 + 0.6 + k * 1.1, BANK + 0.5 + f * 1.1, row.z + row.depth / 2 + 0.02], [0.35, 0.5, 0.05], 0, lit ? undefined : hazed('#3a3836', row.fog));
          if (lit && r === 0 && f < 2 && random() < 0.3) streak(cx - w / 2 + 0.6 + k * 1.1, FAR + 1, 0.18, 8 + random() * 14);
        }
        if (random() < 0.08 && w > 5) domes.push({ at: [cx, BANK + h, row.z], r: 1 + random() * 0.6, h: 1.6 + random(), colour: hazed('#5e7a6c', row.fog).getStyle() });
      }
    });
    // The great dome behind, with its two towers.
    const domeFog = rows[1].fog + 0.05;
    const basilica = hazed('#cfc4ae', domeFog);
    const bx = 22, bz = FAR - 24;
    bodies.add([bx, BANK, bz], [12, 7, 9], 0, basilica);
    for (const dx of [-5, 5]) {
      bodies.add([bx + dx, BANK, bz + 4], [2.4, 10, 2.4], 0, basilica);
      domes.push({ at: [bx + dx, BANK + 10, bz + 4], r: 1.3, h: 2, colour: hazed('#5e7a6c', domeFog).getStyle() });
    }
    const domeStone = art.material(basilica, { roughness: 0.85, emissive: flood, emissiveIntensity: glow * 0.5 });
    art.cylinder(3.6, 3.6, 3, [bx, BANK + 8.5, bz], domeStone, 20);
    art.lathe([[3.8, 0], [3.5, 1.6], [2.6, 3.4], [1.2, 4.4], [0.6, 4.6]], art.material(hazed('#5e7a6c', domeFog), { roughness: 0.6, emissive: flood, emissiveIntensity: glow * 0.2 }), [bx, BANK + 10, bz]);
    art.cylinder(0.6, 0.7, 1.4, [bx, BANK + 15.2, bz], domeStone, 10);
    art.box([0.12, 1.4, 0.12], [bx, BANK + 16.5, bz], domeStone);
    for (const d of domes) art.lathe([[d.r, 0], [d.r * 0.9, d.h * 0.4], [d.r * 0.5, d.h * 0.85], [0.1, d.h]], art.material(d.colour, { roughness: 0.6 }), d.at);

    // The Parliament on the water: long wing, pinnacles, the ribbed dome and needle towers.
    const towers: THREE.Mesh[] = [];
    if (parliamentShown) {
      const px = -14.5, pz = FAR - 9, L = 34;
      const pStone = art.material(hazed(farStone.clone().lerp(new THREE.Color('#e2a94e'), glow * 0.5), 0.1), { roughness: 0.85, emissive: flood, emissiveIntensity: glow * 0.55 });
      const pRoof = art.material(hazed(ruins ? '#6a4038' : '#a2412f', 0.12), { roughness: 0.7, emissive: flood, emissiveIntensity: glow * 0.12 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(L, 4.2, 5), pStone);
      body.position.set(px, BANK + 2.1, pz);
      parliamentGroup.add(body);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(L * 0.8, 3.8, 4), pStone);
      wing.position.set(px, BANK + 1.9, pz - 6);
      parliamentGroup.add(wing);
      const prism = unitPrism();
      for (const [x, w, d, h, rise] of [[px, L, 5.4, 4.2, 2.2], [px, L * 0.8, 4.4, 3.8, 2], [px - L / 2 + 1.6, 3.2, 6, 5, 3.4], [px + L / 2 - 1.6, 3.2, 6, 5, 3.4], [px, 7, 6.4, 4.8, 2.6]] as const) {
        const roof = new THREE.Mesh(prism.clone(), pRoof);
        roof.scale.set(w, rise, d);
        roof.position.set(x, BANK + h, w === L * 0.8 ? pz - 6 : pz);
        parliamentGroup.add(roof);
        if (h > 4.5) {
          const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d - 0.4), pStone);
          block.position.set(x, BANK + h / 2, pz + 0.2);
          parliamentGroup.add(block);
        }
      }
      const pinnacles = new Batch(new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0), pStone);
      for (let x = -L / 2; x <= L / 2 + 0.01; x += 0.85) {
        if (ruins && random() < 0.3) continue;
        pinnacles.add([px + x, BANK + 4.2, pz + 2.55], [0.14, 1.3 + (Math.abs(x) > L / 2 - 2 ? 1.6 : 0), 0.14]);
        const lit = random() < litShare;
        (lit ? windows : darkWindows).add([px + x + 0.42, BANK + 0.9, pz + 2.52], [0.3, 0.9, 0.05], 0, lit ? undefined : '#3a3836');
        if (random() < litShare) windows.add([px + x + 0.42, BANK + 2.4, pz + 2.52], [0.3, 0.9, 0.05]); else darkWindows.add([px + x + 0.42, BANK + 2.4, pz + 2.52], [0.3, 0.9, 0.05], 0, '#3a3836');
        if (glow > 0.05 && random() < 0.5) streak(px + x, FAR + 1, 0.35, 10 + random() * 18);
      }
      for (let x = -L / 2 + 2; x < L / 2; x += 1.6) pinnacles.add([px + x, BANK + 6, pz], [0.08, 0.8, 0.08]);
      pinnacles.flush(parliamentGroup);
      // Drum, dome, lantern, spire.
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2.8, 16), pStone);
      drum.position.set(px, BANK + 6.6, pz - 1.5);
      const dome = new THREE.Mesh(new THREE.LatheGeometry([[2.5, 0], [2.3, 1.2], [1.8, 2.4], [1, 3.4], [0.4, 3.9]].map(([r, y]) => new THREE.Vector2(r, y)), 16, 0, ruins ? Math.PI * 1.4 : Math.PI * 2), art.material(hazed('#9a4632', 0.12), { roughness: 0.65, emissive: flood, emissiveIntensity: glow * 0.25, side: THREE.DoubleSide }));
      dome.position.set(px, BANK + 8, pz - 1.5);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.35, 3.2, 8).translate(0, 1.6, 0), pStone);
      spire.position.set(px, BANK + 11.8, pz - 1.5);
      parliamentGroup.add(drum, dome, spire);
      for (const dx of [-5.6, 5.6]) for (const dz of [-2.6, -0.4]) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.8, 0.8), pStone);
        tower.position.set(px + dx, BANK + 3.4, pz + dz);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3, 6).translate(0, 1.5, 0), pRoof);
        cap.position.set(px + dx, BANK + 6.8, pz + dz);
        parliamentGroup.add(tower, cap);
        towers.push(tower);
      }
      for (let k = 0; k < 6 && glow > 0.05; k++) streak(px + (random() - 0.5) * 3, FAR + 1, 0.6, 16 + random() * 14);
      parliamentGroup.traverse((node) => { const mesh = node as THREE.Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
    }
    // Plane trees along the far embankment road.
    const crowns = new Batch(new THREE.IcosahedronGeometry(1, 1), art.material('#ffffff', { roughness: 0.95 }));
    const treeTone = a.season === 'autumn' ? '#b07a34' : '#4f6c3c';
    const trunks = new Batch(new THREE.CylinderGeometry(0.07, 0.1, 1, 5).translate(0, 0.5, 0), art.material(hazed('#4a4038', 0.2)));
    const twigs = new Batch(new THREE.CylinderGeometry(0.02, 0.05, 1, 4).translate(0, 0.5, 0), art.material(hazed('#4a4038', 0.25)));
    for (let x = -110; x < 110; x += 3.4 + random() * 2) {
      if (parliamentShown && x > -33 && x < 4) continue;
      if (ruins && random() < 0.5) continue;
      trunks.add([x, BANK, FAR - 3.4], [1, 1.4, 1]);
      if (!winter) crowns.add([x, BANK + 2.3, FAR - 3.4], [1.25 + random() * 0.4, 1.35 + random() * 0.3, 1.0], 0, hazed(treeTone, 0.18 + fogAmount * 0.3).offsetHSL(0, 0, (random() - 0.5) * 0.06));
      else for (let k = 0; k < 3; k++) twigs.add([x, BANK + 1.3, FAR - 3.4], [1, 1.4, 1], k * 2.1, undefined, 0.45);
    }
    crowns.flush(root); trunks.flush(root); twigs.flush(root);

    // ----- the bridge on a diagonal from our bank to the far one -----
    const P0 = new THREE.Vector3(18, 0, 3), P1 = new THREE.Vector3(9, 0, FAR);
    const span = P0.distanceTo(P1);
    const setBridge = new THREE.Group();
    setBridge.position.copy(P0).add(P1).multiplyScalar(0.5);
    setBridge.rotation.y = Math.atan2(-(P1.z - P0.z), P1.x - P0.x);
    root.add(setBridge);
    const bridgeBulbs: P[] = [];
    if (a.bridge !== 'none') {
      const half = span / 2 + 2, DECK = 2.2;
      const bStone = art.material(hazed('#c9bc9e', 0.15).lerp(new THREE.Color('#e2a94e'), glow * 0.3), { roughness: 0.9, emissive: flood, emissiveIntensity: glow * 0.3 });
      const bIron = art.material(a.bridge === 'white' ? '#e9e8e2' : a.bridge === 'iron' ? '#4f7a62' : '#33383a', { roughness: 0.5, metalness: 0.4 });
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; setBridge.add(mesh); return mesh; };
      const deck = (x0: number, x1: number, drop = 0) => {
        const piece = add(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.4, 2.4), art.material('#5a5752', { roughness: 0.9 })));
        piece.position.set((x0 + x1) / 2, DECK - drop / 2, 0);
        piece.rotation.z = Math.atan2(drop, x1 - x0) * (x0 < 0 ? 1 : -1);
        for (const z of [-1.15, 1.15]) {
          const r = add(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.25, 0.08), bIron));
          r.position.set((x0 + x1) / 2, DECK + 0.4 - drop / 2, z);
          r.rotation.z = piece.rotation.z;
        }
      };
      const curve = (x0: number, y0: number, x1: number, y1: number, sag: number, z: number, radius: number) => {
        const points: THREE.Vector3[] = [];
        for (let k = 0; k <= 16; k++) { const t = k / 16; points.push(new THREE.Vector3(mix(x0, x1, t), mix(y0, y1, t) - Math.sin(t * Math.PI) * sag, z)); }
        add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, radius, 5), bIron));
        return points;
      };
      const pylonsAt = a.bridge === 'white' ? [-half + 3, half - 3] : [-half * 0.42, half * 0.42];
      if (a.bridge === 'chain' || a.bridge === 'iron') {
        for (const x of pylonsAt) {
          const pier = add(new THREE.Mesh(new THREE.BoxGeometry(2.2, DECK, 3.4), bStone));
          pier.position.set(x, DECK / 2, 0);
          if (a.bridge === 'chain') {
            for (const z of [-1.4, 1.4]) { const leg = add(new THREE.Mesh(new THREE.BoxGeometry(2, 5, 0.9), bStone)); leg.position.set(x, DECK + 2.5, z); }
            const lintel = add(new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.4, 3.8), bStone));
            lintel.position.set(x, DECK + 5.4, 0);
          } else {
            for (const z of [-1.2, 1.2]) {
              const mast = add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 4.6, 6), bIron)); mast.position.set(x, DECK + 2.3, z);
              const bird = add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), art.material('#7a5a32', { metalness: 0.7, roughness: 0.4 }))); bird.position.set(x, DECK + 4.9, z); bird.scale.set(1.6, 0.7, 0.6);
            }
          }
        }
      } else {
        for (const x of pylonsAt) for (const z of [-1.3, 1.3]) { const pylon = add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 7.5, 0.6), bIron)); pylon.position.set(x, 3.75, z); }
      }
      // Deck: whole, or blown with the main span lying in the water.
      if (ruins) {
        deck(-half, pylonsAt[0]); deck(pylonsAt[1], half);
        deck(pylonsAt[0], pylonsAt[0] + (pylonsAt[1] - pylonsAt[0]) * 0.4, DECK);
      } else deck(-half, half);
      // Chains, cables or trusses.
      for (const z of [-1.3, 1.3]) {
        if (a.bridge === 'chain' || a.bridge === 'white') {
          const top = a.bridge === 'chain' ? DECK + 6.1 : 7.5;
          const [p0, p1] = pylonsAt;
          const spans: [number, number, number, number, number][] = [[-half, DECK + 0.6, p0, top, 1], [p1, top, half, DECK + 0.6, 1]];
          if (!ruins) spans.push([p0, top, p1, top, top - DECK - 0.8]);
          for (const [x0, y0, x1, y1, sag] of spans) {
            const points = curve(x0, y0, x1, y1, sag, z, a.bridge === 'chain' ? 0.1 : 0.06);
            for (const p of points) bridgeBulbs.push([p.x, p.y + 0.15, z]);
            for (let k = 1; k < 16; k += 1) { const p = points[k]; if (p.y - DECK > 0.5) { const hanger = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, p.y - DECK, 3), bIron)); hanger.position.set(p.x, (p.y + DECK) / 2, z); } }
          }
        } else {
          // Cantilever trusses: arched top chords meeting low at mid-span.
          const [p0, p1] = pylonsAt;
          const segments: [number, number, number, number, number][] = [[-half, DECK + 0.5, p0, DECK + 4, -0.6], [p0, DECK + 4, 0, DECK + 1.2, -0.8], [0, DECK + 1.2, p1, DECK + 4, -0.8], [p1, DECK + 4, half, DECK + 0.5, -0.6]];
          for (const [x0, y0, x1, y1, sag] of ruins ? segments.filter((_s, i) => i === 0 || i === 3) : segments) {
            const points = curve(x0, y0, x1, y1, sag, z, 0.08);
            for (let k = 0; k < 16; k += 2) { const p = points[k], q = points[k + 2]; const brace = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, Math.hypot(q.x - p.x, q.y - DECK), 3), bIron)); brace.position.set((p.x + q.x) / 2, (p.y + DECK) / 2, z); brace.rotation.z = Math.atan2(q.x - p.x, p.y - DECK) * -1; bridgeBulbs.push([p.x, p.y + 0.1, z]); }
          }
        }
      }
      // Bulbs along the chains, and their reflections.
      if (!ruins && glow > 0.02) {
        const bulbs = new Batch(new THREE.SphereGeometry(0.09, 5, 4), lampGlow);
        const step = a.bridge === 'chain' ? 1 : 2;
        bridgeBulbs.forEach((p, i) => { if (i % step === 0) bulbs.add(p, [1, 1, 1]); });
        bulbs.flush(setBridge, false);
        for (let i = 0; i < 18; i++) {
          const t = (i + 0.5) / 18;
          const at = P0.clone().lerp(P1, t);
          streak(at.x + 1.2, at.z, 0.25, 8);
        }
      }
    }
    ripples.flush(root, false);

    // ----- on the water -----
    const boats: THREE.Object3D[] = [];
    if (a.river !== 'empty' && !(ruins && a.river === 'rowing')) {
      const boat = new THREE.Group();
      const addTo = (mesh: THREE.Mesh, at: P) => { mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; boat.add(mesh); };
      if (a.river === 'cruiser') {
        addTo(new THREE.Mesh(new THREE.BoxGeometry(16, 1, 2.6), art.material(belle ? '#2a2a2a' : '#eeece6')), [0, 0.4, 0]);
        addTo(new THREE.Mesh(new THREE.BoxGeometry(12, 1, 2.2), art.material('#e6e2d8')), [-0.5, 1.4, 0]);
        addTo(new THREE.Mesh(new THREE.BoxGeometry(12.1, 0.45, 2.25), glow > 0.2 ? new THREE.MeshStandardMaterial({ color: '#f6d58a', emissive: '#f0b048', emissiveIntensity: 1 }) : art.material('#3a4a5a')), [-0.5, 1.5, 0]);
        if (belle) { addTo(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 3, 10), art.material('#2a2a2a')), [2, 3, 0]); addTo(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), art.material('#4a3226')), [0, 0.9, 1.35]); }
        boat.position.set(-8, 0, -14);
        if (glow > 0.2) for (let k = 0; k < 6; k++) streak(-14 + k * 2.2, -12.5, 0.25, 5);
      } else if (a.river === 'barge') {
        addTo(new THREE.Mesh(new THREE.BoxGeometry(20, 0.9, 3.2), art.material('#26282a')), [0, 0.35, 0]);
        for (let k = 0; k < 3; k++) addTo(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), art.material('#6b5a44')), [-7 + k * 5.5, 0.9, 0]);
        boat.children.slice(-3).forEach((mesh) => mesh.scale.set(2.4, 0.7, 1.3));
        addTo(new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 2.4), art.material('#e8e4dc')), [8.5, 1.5, 0]);
        boat.position.set(-12, 0, -22);
      } else {
        addTo(new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 0.5), art.material('#e8e2d0')), [0, 0.15, 0]);
        const rowers = new Batch(new THREE.CapsuleGeometry(0.16, 0.4, 2, 5).translate(0, 0.4, 0), art.material('#c8102e'));
        const oars = new Batch(new THREE.BoxGeometry(0.04, 0.04, 3.4), art.material('#f4f2ec'));
        for (let k = 0; k < 8; k++) { rowers.add([-4 + k * 1.1, 0.25, 0], [1, 1, 1]); oars.add([-4 + k * 1.1, 0.35, k % 2 ? 1.2 : -1.2], [1, 1, 1], 0.3); }
        rowers.flush(boat); oars.flush(boat);
        boat.position.set(-4, 0, -13);
        boat.rotation.y = 0.35;
      }
      root.add(boat);
      boats.push(boat);
    }

    // ----- the sky -----
    const sparks: THREE.InstancedMesh[] = [];
    if (a.sky === 'fireworks' && !ruins) {
      const colours = ['#ffd24a', '#ff6a5a', '#f4f2ec', '#6ad17a', '#ff9a3a'];
      for (let b = 0; b < 6; b++) {
        const centre = new THREE.Vector3(-30 + b * 11 + random() * 6, 18 + random() * 12, FAR - 10 - random() * 12);
        const burst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.18, 4, 3), new THREE.MeshBasicMaterial({ color: colours[b % 5], transparent: true, opacity: 0.95, depthWrite: false }), 70);
        const matrix = new THREE.Matrix4();
        const radius = 3 + random() * 3;
        for (let i = 0; i < 70; i++) {
          const dir = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize().multiplyScalar(radius * (0.75 + random() * 0.25));
          matrix.makeTranslation(centre.x + dir.x, centre.y + dir.y, centre.z + dir.z);
          burst.setMatrixAt(i, matrix);
        }
        root.add(burst);
        sparks.push(burst);
        streak(centre.x, -38, 0.6, 30);
      }
    }
    const gulls: THREE.Group[] = [];
    if (a.sky === 'gulls') {
      const white = art.material('#f0f0ec', { side: THREE.DoubleSide });
      for (let i = 0; i < 14; i++) {
        const gull = new THREE.Group();
        for (const side of [-1, 1]) { const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.18), white); wing.position.x = side * 0.32; wing.rotation.z = side * 0.3; gull.add(wing); }
        gull.position.set((random() - 0.5) * 30, 4 + random() * 6, EDGE - 4 - random() * 22);
        gull.userData = { x: gull.position.x, y: gull.position.y, phase: random() * 6.3 };
        root.add(gull);
        gulls.push(gull);
      }
    }
    if (a.sky === 'moon') {
      const moon = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color('#f6efd8').lerp(haze, 0.15), transparent: true, opacity: 0.95, depthWrite: false }));
      moon.position.set(-34, 32, -150);
      root.add(moon);
      for (let k = 0; k < 3; k++) streak(-22 + k * 0.6, -40, 0.9, 34);
    }
    streaks.flush(root, false);

    // ----- haze, smoke and rain -----
    const puffs = puffMap();
    const veils: THREE.Mesh[] = [];
    const veil = (w: number, h: number, at: P, opacity: number) => {
      if (opacity < 0.03) return;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: puffs, color: haze, transparent: true, opacity, depthWrite: false }));
      mesh.position.set(...at);
      root.add(mesh);
      veils.push(mesh);
    };
    for (let i = 0; i < 10; i++) veil(40 + random() * 30, 6 + random() * 4, [(random() - 0.5) * 120, BANK + 1 + random() * 2, FAR - 4 - random() * 2], 0.15 + fogAmount * 0.6);
    for (let i = 0; i < 10; i++) veil(50 + random() * 30, 10 + random() * 6, [(random() - 0.5) * 140, BANK + 3 + random() * 5, FAR - 22 - random() * 6], fogAmount * 0.8);
    for (let i = 0; i < 8; i++) veil(30 + random() * 20, 3, [(random() - 0.5) * 80, 0.8, EDGE - 6 - random() * 28], fogAmount * 0.35);
    if (ruins) {
      const smoke = new THREE.MeshBasicMaterial({ map: puffs, color: '#5c5852', transparent: true, opacity: 0.42, depthWrite: false });
      for (const x of [-30 + random() * 8, -6 + random() * 6, 26 + random() * 8]) for (let k = 0; k < 7; k++) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4 + k * 1.6, 4 + k * 1.6), smoke);
        mesh.position.set(x + k * (0.8 + random()), BANK + 5 + k * 2.4, FAR - 14 - random() * 6);
        root.add(mesh);
        veils.push(mesh);
      }
    }
    let rain: THREE.InstancedMesh | null = null;
    if (raining) {
      rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.6, 0.012), new THREE.MeshBasicMaterial({ color: '#d8dee2', transparent: true, opacity: 0.45, depthWrite: false }), 500);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < 500; i++) { matrix.makeTranslation((random() - 0.5) * 24, random() * 12, EDGE - 4 + random() * 18); rain.setMatrixAt(i, matrix); }
      root.add(rain);
    }

    // ----- light -----
    const hemi = new THREE.HemisphereLight(background.clone().lerp(new THREE.Color('#ffffff'), 0.4), new THREE.Color('#5d5a52'), mix(1.35, 0.95, lowSun));
    const sunColour = new THREE.Color().setHSL(mix(0.6, 0.08, Math.max(mood.warmth, lowSun * 0.7)), mix(0.2, 0.65, lowSun), mix(0.92, 0.72, lowSun));
    const key = new THREE.DirectionalLight(sunColour, mix(2.6, 1.6, lowSun) * (1 - mood.wear * 0.35));
    const noon = 1 - lowSun;
    // Dawn comes up behind Pest; the evening sun sets behind us and gilds the far bank.
    key.position.set(mood.daylight < 0.5 ? -20 : 14, mix(10, 40, noon), mood.daylight < 0.5 ? mix(-40, 10, noon) : mix(40, 10, noon));
    key.target.position.set(0, 0, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    const fill = new THREE.DirectionalLight(background, 0.5);
    fill.position.set(10, 8, 20);
    root.add(hemi, key, key.target, fill);

    // ----- camera: standing on the quay behind the hero, looking across the river -----
    const framing = context.framing;
    const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 400);
    const elevation = framing ? framing.elevation - 0.5 : 0;
    const turn = framing ? framing.turn : 0;
    const heroAt = new THREE.Vector3(0.5, QY, 9.2);
    const offset = new THREE.Vector3(-0.5, 3.6 + elevation * 6, 9.4 - Math.max(0, elevation) * 2);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), turn * 0.35);
    camera.position.copy(heroAt).add(offset);
    const aim = new THREE.Vector3(0.8 + turn * 4, QY + 1.9 - Math.max(0, elevation) * 4, -14);

    const QUAY: [number, number, number, number][] = [[0.5, 9.2, 3.4, 1.9], [-2.7, 8.1, 2.6, 1.2], [3.1, 7.9, 2.6, 1.2], [-1.5, 6.9, 2, 0.9], [1.9, 6.9, 2, 0.9]];
    const FARSLOTS: [number, number][] = [[1.5, FAR - 9], [-28, FAR - 7], [30, FAR - 8], [-14.5, FAR - 9]];
    const big = (item: Placeable) => item.height > 15 || item.radius > 25;
    const spanning = (item: Placeable) => big(item) && item.radius > item.height * 2.4;

    const world: World = {
      object: root, camera, background, capacity: 7, ground, keyLight: key,
      place(items: readonly Placeable[]) {
        let quay = 0, far = 0;
        let bridged = false;
        for (const item of items) {
          const height = Math.max(item.height, 0.05), radius = Math.max(item.radius, 0.05);
          if (spanning(item) && !bridged) {
            bridged = true;
            setBridge.visible = false;
            item.holder.scale.setScalar((span + 4) / (radius * 2));
            item.holder.position.copy(setBridge.position);
            item.holder.rotation.y = setBridge.rotation.y;
          } else if (big(item) && far < FARSLOTS.length) {
            const [x, z] = FARSLOTS[far++];
            const scale = item.hero ? Math.min(16 / height, 26 / radius) : Math.min(11.5 / height, 15 / radius);
            if (far === 4 || radius * scale > 12) parliamentGroup.visible = false;
            item.holder.scale.setScalar(scale);
            item.holder.position.set(x, BANK, z);
            item.holder.rotation.y = (context.random() - 0.5) * 0.3;
          } else {
            const [x, z, maxHeight, maxRadius] = QUAY[quay++ % QUAY.length];
            let scale = Math.min(1.6, maxHeight / height, maxRadius / radius);
            if (height * scale < maxHeight * 0.3) scale = Math.min(maxRadius / radius, (maxHeight * 0.3) / height);
            item.holder.scale.setScalar(scale);
            item.holder.position.set(x, QY + 0.25 * (z < EDGE + 1.5 ? 1 : 0), z);
            item.holder.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z) * 0.75 + (context.random() - 0.5) * 0.4;
          }
          item.holder.updateMatrixWorld(true);
        }
        camera.lookAt(aim);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
        key.target.position.set(0, QY, 8);
        const toSun = key.position.clone().normalize();
        key.position.copy(key.target.position).addScaledVector(toSun, 60);
        const shadow = key.shadow.camera;
        shadow.left = -26; shadow.right = 26; shadow.bottom = -26; shadow.top = 26;
        shadow.near = 1; shadow.far = 140;
        shadow.updateProjectionMatrix();
      },
      update(_dt, time) {
        const energy = 0.3 + mood.energy;
        if (tram) tram.position.x = -30 + ((time * 0.6 * energy) % 12);
        boats.forEach((boat, i) => { boat.position.y = Math.sin(time * 0.8 + i) * 0.04; boat.position.x += 0.004 * energy; });
        for (const gull of gulls) {
          const { x, y, phase } = gull.userData as { x: number; y: number; phase: number };
          gull.position.set(x + Math.sin(time * 0.3 + phase) * 3, y + Math.sin(time * 0.7 + phase) * 0.5, gull.position.z);
          gull.children.forEach((wing, k) => { wing.rotation.z = (k ? 1 : -1) * (0.3 + Math.sin(time * 6 * energy + phase) * 0.35); });
        }
        sparks.forEach((burst, i) => { (burst.material as THREE.MeshBasicMaterial).opacity = 0.4 + 0.55 * Math.abs(Math.sin(time * 0.7 * energy + i)); });
        veils.forEach((mesh, i) => { mesh.position.x += Math.sin(time * 0.1 + i) * 0.003 * energy; });
        if (rain) rain.position.y = -((time * 9) % 3);
      },
      dispose() { key.shadow.map?.dispose(); puffs.dispose(); disposeTree(root); },
    };
    void towers;
    bodies.flush(root); roofs.flush(root); windows.flush(root, false); darkWindows.flush(root, false); rail.flush(root);
    return world;
  },
});
