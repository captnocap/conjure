import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, paint, paintHex, paintIsMetal } from '@conjure/kit';

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

/** The crowned shield carved on each pylon. */
function armsMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 160;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#cdbf9f'; g.fillRect(0, 0, 128, 160);
  // Crown.
  g.fillStyle = '#c9962e';
  g.beginPath(); g.moveTo(34, 52); g.lineTo(38, 22); g.lineTo(50, 38); g.lineTo(64, 14); g.lineTo(78, 38); g.lineTo(90, 22); g.lineTo(94, 52); g.closePath(); g.fill();
  // Shield: red and white bars beside a red field with a white double cross.
  g.beginPath(); g.moveTo(30, 58); g.lineTo(98, 58); g.lineTo(98, 110); g.quadraticCurveTo(98, 146, 64, 154); g.quadraticCurveTo(30, 146, 30, 110); g.closePath();
  g.save(); g.clip();
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f0ece0' : '#b0283a'; g.fillRect(30, 58 + i * 12, 34, 12); }
  g.fillStyle = '#b0283a'; g.fillRect(64, 58, 34, 100);
  g.fillStyle = '#f0ece0'; g.fillRect(78, 66, 6, 70); g.fillRect(70, 78, 22, 5); g.fillRect(68, 92, 26, 5);
  g.fillStyle = '#3f7a3a'; g.fillRect(64, 132, 34, 24);
  g.restore();
  g.strokeStyle = '#7a6a4a'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(30, 58); g.lineTo(98, 58); g.lineTo(98, 110); g.quadraticCurveTo(98, 146, 64, 154); g.quadraticCurveTo(30, 146, 30, 110); g.closePath(); g.stroke();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function tricolour() {
  const canvas = document.createElement('canvas');
  canvas.width = 48; canvas.height = 32;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#c8102e'; g.fillRect(0, 0, 48, 11);
  g.fillStyle = '#f4f2ec'; g.fillRect(0, 11, 48, 11);
  g.fillStyle = '#2f7a3a'; g.fillRect(0, 22, 48, 10);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    era: choice('When is the bridge seen?', {
      opened: '1849, newly opened: fresh limestone, horse carriages and gas lamps, no motor traffic.',
      ruined: 'January 1945, blown up: the pylons still stand but the main span and its chains hang broken into the river.',
      today: 'Today: rebuilt and repainted, the familiar postcard bridge.',
      renovation: 'Closed for renovation: pylons wrapped in white sheeting and scaffold, barriers across the deck.',
    }),
    lights: choice('Are the lights along the chains on?', {
      on: 'Strings of warm bulbs trace every chain, a necklace over the dark river.',
      off: 'The bulbs are dark: plain iron chains against the sky.',
    }),
    traffic: choice('What is on the deck?', {
      empty: 'Nothing: the deck is empty, the bridge holding its breath.',
      cars: 'Cars and red buses crawling across in both lanes.',
      walkers: 'Closed to cars: a crowd strolling across on foot, a summer festival.',
      carriages: 'Horse-drawn carriages and a few walkers.',
    }),
    flags: choice('What flies from the pylons?', {
      none: 'Nothing: the pylon tops are bare stone.',
      tricolour: 'Hungarian red-white-green tricolours on short poles.',
      banner: 'Long banners in one colour hanging from each pylon.',
    }),
    banner: paint('If banners hang from the pylons, what colour are they?', ['red', 'crimson', 'black', 'white', 'gold', 'navy', 'green', 'purple', 'blue']),
    chains: paint('What colour are the iron chains painted?', ['charcoal', 'forest', 'grey', 'black', 'olive', 'navy', 'rust', 'gold']),
    river: choice('What is on the water beneath?', {
      open: 'Open water: the river slides through the arches.',
      ice: 'Ice floes jostling downriver, grey slabs piled against the piers.',
      boat: 'A long white river cruiser sliding under the main span.',
      barge: 'A low black cargo barge pushing upriver.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const ruined = a.era === 'ruined';
    const stoneColour = new THREE.Color(a.era === 'opened' ? '#d9cba8' : ruined ? '#9e968a' : '#c9bc9e').lerp(new THREE.Color('#6d675c'), mood.wear * 0.4);
    const stone = s.material(stoneColour, { roughness: 0.9 });
    const darkStone = s.material(stoneColour.clone().multiplyScalar(0.78), { roughness: 0.95 });
    const iron = s.material(paintHex(a.chains, '#34363a'), { roughness: 0.55, metalness: paintIsMetal(a.chains) ? 0.75 : 0.35 });
    const deckMat = s.material('#5d5a55', { roughness: 0.9 });
    const bulb = new THREE.MeshStandardMaterial({ color: '#fff1c2', emissive: '#ffc35a', emissiveIntensity: mix(1.2, 2.4, lowSun), roughness: 0.5 });

    const PY = 101, END = 186, DECK = 12.5, TOP = 50, SAG = 17;
    // River surface: a thin see-through film so the piers stand in water on any stage.
    const water = s.mesh(new THREE.PlaneGeometry(420, 90), new THREE.MeshStandardMaterial({ color: ruined || a.river === 'ice' ? '#7d8a88' : '#6f8a82', transparent: true, opacity: 0.45, depthWrite: false, roughness: 0.15 }), [0, 0.05, 0]);
    water.rotation.x = -Math.PI / 2;
    water.castShadow = false;

    // Pylons: a block pierced by a tall round-headed arch, a cutwater pier below, a cornice above.
    const pylonShape = new THREE.Shape();
    pylonShape.moveTo(-12, DECK); pylonShape.lineTo(12, DECK); pylonShape.lineTo(12, TOP); pylonShape.lineTo(-12, TOP); pylonShape.closePath();
    const arch = new THREE.Path();
    arch.moveTo(-6, DECK); arch.lineTo(-6, 30); arch.absarc(0, 30, 6, Math.PI, 0, true); arch.lineTo(6, DECK); arch.closePath();
    pylonShape.holes.push(arch);
    const pylonGeometry = new THREE.ExtrudeGeometry(pylonShape, { depth: 18, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -9).rotateY(-Math.PI / 2);
    const arms = new THREE.MeshStandardMaterial({ map: armsMap(), roughness: 0.9 });
    for (const side of [-1, 1]) {
      const x = side * PY;
      s.mesh(pylonGeometry.clone(), stone, [x, 0, 0]);
      // Pier with rounded cutwaters up- and downstream.
      s.box([20, DECK, 26], [x, DECK / 2, 0], darkStone);
      for (const z of [-13, 13]) s.cylinder(10, 10, DECK, [x, DECK / 2, z], darkStone, 16);
      // Cornice, plinth band, pilasters and the saddle housings the chains ride over.
      s.box([20.5, 2.4, 26.5], [x, TOP + 1.2, 0], stone);
      s.box([19, 1.2, 25], [x, DECK + 0.6, 0], darkStone);
      for (const z of [-11.4, 11.4]) for (const dx of [-8.4, 8.4]) s.box([1.4, TOP - DECK - 2, 1.6], [x + dx, (TOP + DECK) / 2, z], darkStone);
      for (const z of [-9, 9]) s.box([8, 3, 3.6], [x, TOP + 3.5, z], darkStone);
      if (ruined) s.box([5, 6, 8], [x + side * 5, TOP - 1, -6], s.material('#4a4640')); // a blast scar
      for (const face of [-1, 1]) {
        const shield = s.mesh(new THREE.PlaneGeometry(7, 8.5), arms, [x + face * 9.05, 40.5, 0]);
        shield.rotation.y = face * Math.PI / 2;
        shield.castShadow = false;
      }
    }

    // Abutments and the four stone lions on their plinths.
    for (const side of [-1, 1]) {
      s.box([16, DECK + 3, 30], [side * (END + 6), (DECK + 3) / 2, 0], darkStone);
      s.box([17, 1.2, 31], [side * (END + 6), DECK + 3.6, 0], stone);
    }
    const lionMat = s.material(stoneColour.clone().lerp(new THREE.Color('#8a826f'), 0.2), { roughness: 0.9 });
    for (const side of [-1, 1]) for (const z of [-11.5, 11.5]) {
      const lion = new THREE.Group();
      const parts = [
        s.box([7, 3, 3.4], [0, 1.5, 0], darkStone),
        s.box([7.4, 0.5, 3.8], [0, 3.2, 0], stone),
        s.ball([2.3, 1.1, 1.05], [-0.4, 4.6, 0], lionMat, 12),
        s.ball([1.2, 1.5, 1.25], [1.5, 5.2, 0], lionMat, 12),
        s.ball([0.75, 0.8, 0.7], [2.4, 6.2, 0], lionMat, 10),
        s.box([0.7, 0.55, 0.6], [3.0, 6.0, 0], lionMat),
        s.box([2.0, 0.55, 0.5], [2.7, 3.75, -0.55], lionMat),
        s.box([2.0, 0.55, 0.5], [2.7, 3.75, 0.55], lionMat),
        s.ball([1.1, 0.9, 1.0], [-2.1, 4.3, 0], lionMat, 10),
      ];
      const tail = s.tube([[-2.8, 3.8, 0.6], [-3.4, 3.6, 1.1], [-2.6, 3.5, 1.5]], 0.15, lionMat);
      for (const part of [...parts, tail]) lion.add(part);
      lion.position.set(side * (END + 3), DECK + 4.2, z);
      lion.rotation.y = side > 0 ? 0 : Math.PI;
      s.root.add(lion);
    }

    // The deck, its iron railings and footways.
    const deckPiece = (x0: number, x1: number, drop0 = 0, drop1 = 0) => {
      const length = x1 - x0, mid = (x0 + x1) / 2, fall = drop1 - drop0;
      const deck = s.box([Math.hypot(length, fall), 1.6, 15], [mid, DECK - 0.4 + (drop0 + drop1) / 2, 0], deckMat);
      deck.rotation.z = Math.atan2(fall, length);
      for (const z of [-7.3, 7.3]) {
        const rail = s.box([Math.hypot(length, fall), 1.1, 0.25], [mid, DECK + 0.95 + (drop0 + drop1) / 2, z], iron);
        rail.rotation.z = deck.rotation.z;
      }
      s.box([Math.hypot(length, fall), 0.6, 15.6], [mid, DECK - 1.4 + (drop0 + drop1) / 2, 0], iron).rotation.z = deck.rotation.z;
    };
    if (ruined) {
      // Side spans survive in part; the main span lies broken in the river.
      deckPiece(-END, -PY + 7); deckPiece(PY - 7, END);
      deckPiece(-PY + 7, -30, 0, -DECK - 1);
      deckPiece(36, PY - 7, -DECK + 1, 0);
    } else deckPiece(-END, END);

    // Chains: two eye-bar chains a side, each over both pylons, down to the anchorages.
    const chainY = (x: number, offset: number) => {
      const ax = Math.abs(x);
      if (ax <= PY) return SAG + offset + (TOP + 1 - SAG) * (ax / PY) ** 2;
      const t = (ax - PY) / (END - PY);
      return mix(TOP + 1 + offset, DECK + 2 + offset * 0.4, t) - Math.sin(t * Math.PI) * 3;
    };
    const bulbs = new Batch(new THREE.SphereGeometry(0.55, 6, 4), bulb);
    const hangers = new Batch(new THREE.CylinderGeometry(0.12, 0.12, 1, 4).translate(0, 0.5, 0), iron);
    const chainPath = (x0: number, x1: number, offset: number, z: number) => {
      const points: P[] = [];
      for (let k = 0; k <= 18; k++) { const x = mix(x0, x1, k / 18); points.push([x, chainY(x, offset), z]); }
      return points;
    };
    for (const z of [-9, 9]) for (const offset of [0, 1.8]) {
      const spans: [number, number][] = ruined ? [[-END, -PY], [PY, END]] : [[-END, -PY], [-PY, PY], [PY, END]];
      for (const [x0, x1] of spans) {
        s.tube(chainPath(x0, x1, offset, z), 0.55, iron);
        if (a.lights === 'on' && !ruined && offset === 1.8) for (let x = x0 + 2; x < x1; x += 3.6) bulbs.add([x, chainY(x, offset) + 0.9, z], [1, 1, 1]);
      }
      if (ruined) {
        // Broken chains hang straight down from the saddles into the water.
        for (const side of [-1, 1]) {
          const x = side * (PY - 6);
          s.tube([[side * PY, TOP + 1 + offset, z], [x, TOP - 6, z + random() * 2], [x - side * (3 + random() * 6), 8, z + random() * 3], [x - side * (8 + random() * 8), 0.2, z]], 0.55, iron);
        }
      }
    }
    for (const z of [-9, 9]) for (let x = -END + 6; x < END - 4; x += 5.4) {
      if (Math.abs(Math.abs(x) - PY) < 8) continue;
      if (ruined && Math.abs(x) < PY) continue;
      const top = chainY(x, 0);
      hangers.add([x, DECK + 1, z], [1, top - DECK - 1, 1]);
    }

    // Lamps on the deck: gas lanterns in 1849, electric globes later.
    const lampPost = new Batch(new THREE.CylinderGeometry(0.15, 0.25, 1, 5).translate(0, 0.5, 0), iron);
    const lampHead = new Batch(new THREE.SphereGeometry(0.55, 8, 6), a.lights === 'on' || lowSun > 0.6 ? bulb : s.material('#e8e2cc'));
    for (const z of [-7.3, 7.3]) for (let x = -END + 10; x < END - 6; x += 18) {
      if (Math.abs(Math.abs(x) - PY) < 9) continue;
      if (ruined && Math.abs(x) < PY) continue;
      lampPost.add([x, DECK + 0.4, z], [1, 5, 1]);
      lampHead.add([x, DECK + 5.8, z], [1, a.era === 'opened' ? 1.4 : 1, 1]);
    }

    // On the deck.
    const traffic = new Batch(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), s.material('#ffffff', { roughness: 0.5, metalness: 0.2 }));
    const people = new Batch(new THREE.CapsuleGeometry(0.3, 1.1, 2, 5).translate(0, 0.85, 0), s.material('#ffffff', { roughness: 0.9 }));
    const deckTop = DECK + 0.4;
    const span = (x: number) => !(ruined && Math.abs(x) < PY) && Math.abs(Math.abs(x) - PY) > 7;
    if (a.era === 'renovation') {
      for (const side of [-1, 1]) for (let z = -6; z <= 6; z += 1.5) traffic.add([side * (END - 8), deckTop, z], [0.8, 1.1, 1.2], 0, z % 3 ? '#e8e2d6' : '#d63a2a');
    } else if (a.traffic === 'cars' && a.era !== 'opened') {
      const colours = ['#c8102e', '#e8e4da', '#34363a', '#1f5fd1', '#8c8f93', '#f0a215'];
      for (const lane of [-2.6, 2.6]) for (let x = -END + 8 + random() * 10; x < END - 8; x += 9 + random() * 16) {
        if (!span(x)) continue;
        if (random() < 0.18) traffic.add([x, deckTop, lane], [11, 3.2, 2.5], 0, '#c8102e');
        else traffic.add([x, deckTop, lane], [4.3, 1.5, 1.8], 0, colours[Math.floor(random() * colours.length)]);
      }
    } else if (a.traffic === 'walkers' || a.traffic === 'carriages' || a.era === 'opened') {
      const tones = ['#3a3a42', '#6a4a36', '#8a2a2a', '#2c3d55', '#6b6b62', '#c9b27a', '#e8e2d6'];
      const crowd = a.traffic === 'walkers' ? 220 : 40;
      for (let i = 0; i < crowd; i++) {
        const x = (random() - 0.5) * END * 1.9;
        if (span(x)) people.add([x, deckTop, (random() - 0.5) * 13], [1, 0.9 + random() * 0.2, 1], 0, tones[i % tones.length]);
      }
      if (a.traffic === 'carriages' || (a.era === 'opened' && a.traffic === 'cars')) {
        for (let x = -END + 20; x < END - 15; x += 24 + random() * 20) {
          if (!span(x)) continue;
          const z = random() < 0.5 ? -2.6 : 2.6;
          traffic.add([x, deckTop + 0.8, z], [3.2, 2, 1.8], 0, '#3a2a1e');
          traffic.add([x + 3.2, deckTop, z], [2.2, 1.7, 0.8], 0, random() < 0.5 ? '#2a201a' : '#8a6a4a');
        }
      }
    }

    // Renovation sheeting and scaffold around both pylons.
    if (a.era === 'renovation') {
      const sheet = new THREE.MeshStandardMaterial({ color: '#efece4', roughness: 0.95, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
      const poles = new Batch(new THREE.CylinderGeometry(0.15, 0.15, 1, 4).translate(0, 0.5, 0), s.material('#7a776f', { metalness: 0.4 }));
      for (const side of [-1, 1]) {
        const x = side * PY;
        for (const z of [-1, 1]) s.box([17, TOP - DECK + 2, 6.8], [x, (TOP + DECK) / 2 + 1, z * 9.2], sheet);
        for (const dx of [-9, -3, 3, 9]) for (const z of [-13, 13]) poles.add([x + dx, DECK, z], [1, TOP - DECK + 5, 1]);
      }
      poles.flush(s);
    }

    // Flags or banners from the pylon tops.
    const flags: THREE.Mesh[] = [];
    if (a.flags !== 'none') {
      const material = a.flags === 'tricolour'
        ? new THREE.MeshStandardMaterial({ map: tricolour(), side: THREE.DoubleSide, roughness: 0.85 })
        : s.material(paintHex(a.banner), { side: THREE.DoubleSide, roughness: 0.8, metalness: paintIsMetal(a.banner) ? 0.7 : 0 });
      for (const side of [-1, 1]) for (const z of [-9, 9]) {
        const x = side * PY;
        s.rod([x, TOP + 5, z], [x, TOP + 13, z], 0.12, iron);
        if (a.flags === 'tricolour') flags.push(s.mesh(new THREE.PlaneGeometry(4, 2.7, 6, 1).translate(2, 0, 0), material, [x, TOP + 11.6, z]));
        else {
          const banner = s.mesh(new THREE.PlaneGeometry(4, 12, 1, 6).translate(0, -6, 0), material, [x + side * 7.2, TOP - 1, z]);
          banner.rotation.y = Math.PI / 2;
          flags.push(banner);
        }
      }
    }

    // On the water.
    if (a.river === 'ice' || ruined) {
      const ice = new Batch(new THREE.CylinderGeometry(1, 1, 1, 7), s.material('#e2e6e4', { roughness: 0.6 }));
      for (let i = 0; i < (ruined ? 50 : 120); i++) {
        const x = (random() - 0.5) * 380, z = (random() - 0.5) * 80;
        if (Math.abs(Math.abs(x) - PY) < 10 && Math.abs(z) < 16) continue;
        ice.add([x, 0.25, z], [3 + random() * 8, 0.6, 2 + random() * 6], random() * 3, undefined, (random() - 0.5) * 0.1);
      }
      ice.flush(s);
    }
    if (a.river === 'boat' || a.river === 'barge') {
      const boat = a.river === 'boat';
      const hull = s.box([boat ? 70 : 80, boat ? 3 : 2.4, 10], [-20, boat ? 1.5 : 1.2, 24], s.material(boat ? '#eeece6' : '#26282a'));
      void hull;
      if (boat) {
        s.box([56, 2.6, 8.4], [-22, 4.3, 24], s.material('#e6e2d8'));
        s.box([56, 1.1, 8.6], [-22, 4.6, 24], s.material('#3a4a5a', { emissive: '#ffc35a', emissiveIntensity: lowSun * 0.8 }));
        s.box([10, 2.4, 7], [8, 6.8, 24], s.material('#e6e2d8'));
      } else {
        for (let k = 0; k < 4; k++) s.ball([7, 1.6, 3.6], [-48 + k * 17, 2.4, 24], s.material('#6b5a44'), 10);
        s.box([7, 5, 7], [16, 4.5, 24], s.material('#e8e4dc'));
      }
    }

    for (const batch of [bulbs, hangers, lampPost, lampHead, traffic, people]) batch.flush(s);

    const sway = mix(0.4, 2.8, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const [i, flag] of flags.entries()) flag.rotation.y = (a.flags === 'banner' ? Math.PI / 2 : 0) + Math.sin(time * sway + i) * 0.25;
      },
    });
  },
});
