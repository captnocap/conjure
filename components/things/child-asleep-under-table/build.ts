import * as THREE from 'three';
import { type Figure, Sculpture, choice, defineThing, figure, mix, noul, visibleBounds } from '@conjure/kit';
import { at, ground, joints, poseArm, poseLeg } from './pose';

/** Table cloths painted on a canvas: lace, a checked oilcloth, or plain velvet. */
function cloth(random: () => number, kind: 'lace' | 'oilcloth' | 'velvet') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  if (kind === 'lace') {
    ctx.fillStyle = '#f4f1e8';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(150,140,120,0.45)';
    ctx.lineWidth = 1.2;
    for (let y = 8; y < 128; y += 16) for (let x = 8; x < 128; x += 16) {
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 8, y + 8, 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (kind === 'oilcloth') {
    const a = random() < 0.5 ? '#c94a3a' : '#3a6a9a';
    ctx.fillStyle = '#efe9d8';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = a;
    ctx.globalAlpha = 0.75;
    for (let p = 0; p < 128; p += 32) {
      ctx.fillRect(p, 0, 16, 128);
      ctx.fillRect(0, p, 128, 16);
    }
  } else {
    ctx.fillStyle = '#3a1f2a';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = `rgba(255,255,255,${random() * 0.06})`;
      ctx.fillRect(random() * 128, random() * 128, 2, 3);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

export default defineThing({
  questions: {
    cover: choice('What is over the child?', {
      coat: 'A grown-up\'s heavy overcoat thrown over them, far too big.',
      blanket: 'A grey wool blanket tucked round them.',
      cardigan: 'A woman\'s cardigan laid over their shoulders.',
      nothing: 'Nothing: curled up in their clothes on the bare floor.',
    }),
    clothes: choice('What is the child wearing?', {
      sunday: 'Sunday clothes: a white shirt and dark short trousers, long socks.',
      pyjamas: 'Pale striped pyjamas, carried down from bed earlier.',
      jumper: 'A hand-knitted jumper and grey trousers.',
    }),
    table: choice('What is on the table above them?', {
      biscuits: 'A plate of biscuits and a cup of tea on a saucer.',
      candle: 'A lit candle in a jam jar.',
      hat: 'A man\'s black hat and a pair of gloves.',
      glasses: 'Empty glasses and a bottle, one glass on its side.',
    }),
    cloth: choice('What covers the table?', {
      lace: 'A white lace cloth.',
      oilcloth: 'A checked oilcloth.',
      velvet: 'A dark fringed velvet cloth.',
      bare: 'No cloth, bare scrubbed wood.',
    }),
    toy: choice('What lies near their hand?', {
      nothing: 'Nothing.',
      car: 'A small wooden toy car.',
      doll: 'A rag doll with a stitched face.',
      ball: 'A red rubber ball.',
      sweets: 'A paper bag of sweets, spilled.',
    }),
    awake: noul('Does a second child sit awake beside them, keeping watch?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const skin = pick(['#e8c9ad', '#e3c2a4', '#d9b08c', '#c99a78']);
    const hairColor = pick(['#3b2a22', '#6b4a2e', '#b8884a', '#1f1a18', '#a04a2a']);
    const outfit = {
      sunday: { top: '#f1efe6', bottom: '#2a2a30', shoes: '#1d1a18', sleeves: 'long' as const },
      pyjamas: { top: pick(['#bcd0e0', '#d8c9d6']), bottom: pick(['#bcd0e0', '#d8c9d6']), shoes: '#e8e2d2', sleeves: 'long' as const },
      jumper: { top: pick(['#8a3a3a', '#4a6a8a', '#5e7a4a', '#b8864a']), bottom: '#55585e', shoes: '#4a3328', sleeves: 'long' as const },
    }[a.clothes];

    // ---- the sleeper: laid on their side and curled up
    const H = mix(0.92, 1.08, random());
    const child = figure(s, { height: H, build: random() < 0.5 ? 'slight' : 'average', style: 'doll', pose: 'lying', gaze: 'ahead', skin, hair: random() < 0.5 ? 'short' : 'long', hairColor, ...outfit });
    s.root.add(child.root);
    const body = child.pelvis.parent as THREE.Object3D;
    body.rotation.set(-Math.PI / 2, Math.PI / 2, 0.12);
    poseLeg(child, 'left', { forward: 70, knee: 95, out: 2 });
    poseLeg(child, 'right', { forward: 80, knee: 100, out: -4 });
    poseArm(child, 'left', { forward: 130, out: 10, bend: 110, inward: 20 });
    poseArm(child, 'right', { forward: 60, out: 5, bend: 95, inward: 35 });
    const { neck, ankle: leftAnkle } = joints(child, 'left');
    neck.rotation.x = -0.35;
    // One shoe off: a sock on that foot, the shoe set beside.
    const sock = s.material(a.clothes === 'sunday' ? '#e6e2d4' : a.clothes === 'pyjamas' ? '#e8e2d2' : '#8a8478', { roughness: 0.95 });
    const bareFoot = leftAnkle.children.find((node) => (node as THREE.Mesh).isMesh) as THREE.Mesh;
    bareFoot.material = sock;
    child.root.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.4;
    ground(child);
    const sleeper = visibleBounds(child.root);
    const centre = sleeper.getCenter(new THREE.Vector3());
    const head = at(child.head);
    const hand = at(child.hands.right);

    // ---- what covers them
    const along = Math.atan2(head.x - centre.x, head.z - centre.z);
    if (a.cover !== 'nothing') {
      const colour = { coat: pick(['#4a3f33', '#2a2d33', '#5a4a3a']), blanket: pick(['#8a8a84', '#6e6a62', '#9a948a']), cardigan: pick(['#7a4a5a', '#4a6a5a', '#8a7a4a']), nothing: '#000000' }[a.cover];
      const wool = s.material(colour, { roughness: 1 });
      const size = sleeper.getSize(new THREE.Vector3());
      // A low shell from the shoulders to the feet, the head left out at one end.
      const toFeet = new THREE.Vector3(centre.x - head.x, 0, centre.z - head.z).normalize();
      const reach = Math.hypot(size.x, size.z);
      const long = a.cover === 'cardigan' ? 0.17 * H : Math.max(0.2, (reach - 0.22 * H) * 0.5);
      const mid = head.clone().addScaledVector(toFeet, a.cover === 'cardigan' ? 0.26 * H : 0.2 * H + long);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), wool);
      shell.position.set(mid.x, 0.012, mid.z);
      shell.scale.set(a.cover === 'cardigan' ? 0.2 * H : 0.27 * H, Math.max(size.y + 0.015, 0.2), long);
      shell.rotation.y = along;
      shell.castShadow = shell.receiveShadow = true;
      s.root.add(shell);
    }
    // The shoe that came off.
    const shoe = s.box([0.06 * H, 0.035 * H, 0.1 * H], [centre.x - Math.sin(along) * 0.42 * H + (random() - 0.5) * 0.1, 0.0175 * H, centre.z - Math.cos(along) * 0.42 * H + 0.08], s.material(outfit.shoes, { roughness: 0.5 }));
    shoe.rotation.set(0, random() * Math.PI, random() < 0.4 ? Math.PI / 2 : 0);
    if (shoe.rotation.z) shoe.position.y = 0.03 * H;

    // ---- the toy near the hand
    const toyAt = new THREE.Vector3(hand.x + (random() - 0.5) * 0.08, 0, hand.z + 0.1 + random() * 0.06);
    if (a.toy === 'car') {
      const paint = s.material(pick(['#b23a2e', '#2b5a9a', '#4a7a3a']), { roughness: 0.6 });
      s.box([0.1, 0.035, 0.05], [toyAt.x, 0.035, toyAt.z], paint);
      s.box([0.05, 0.03, 0.045], [toyAt.x - 0.005, 0.065, toyAt.z], paint);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.016, 0.016, 0.01, [toyAt.x + x * 0.03, 0.016, toyAt.z + z * 0.03], s.material('#2a2320'), 10).rotation.x = Math.PI / 2;
    } else if (a.toy === 'doll') {
      const rag = s.material(pick(['#d9a8a0', '#c9b89a']), { roughness: 1 });
      s.ball([0.035, 0.035, 0.03], [toyAt.x, 0.03, toyAt.z - 0.05], rag, 10);
      s.box([0.05, 0.03, 0.09], [toyAt.x, 0.016, toyAt.z + 0.02], s.material(pick(['#5a7aa0', '#a04a5a']), { roughness: 1 }));
      s.ball([0.035, 0.02, 0.03], [toyAt.x, 0.05, toyAt.z - 0.06], s.material('#b8742a', { roughness: 1 }), 8);
    } else if (a.toy === 'ball') {
      s.ball([0.045, 0.045, 0.045], [toyAt.x, 0.045, toyAt.z], s.material('#c0392b', { roughness: 0.55 }), 16);
    } else if (a.toy === 'sweets') {
      const bag = s.box([0.07, 0.04, 0.09], [toyAt.x, 0.02, toyAt.z], s.material('#e3d6b8', { roughness: 1 }));
      bag.rotation.y = 0.5;
      s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.4 }), Array.from({ length: 10 }, () => ({ at: [toyAt.x + 0.03 + random() * 0.12, 0.009, toyAt.z + (random() - 0.5) * 0.14] as [number, number, number], size: 0.009, color: pick(['#e84d4d', '#f4d35e', '#5fb96b', '#f29e4c', '#9b5de5']) })));
    }

    // ---- the side table over the sleeper
    const wood = s.material(pick(['#6b4a2e', '#8a6a44', '#4e3a28']), { roughness: 0.7 });
    const top = 0.62, size = 0.56;
    const tx = centre.x + (random() - 0.5) * 0.08, tz = centre.z + (random() - 0.5) * 0.08;
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.04, top - 0.03, 0.04], [tx + x * (size / 2 - 0.04), (top - 0.03) / 2, tz + z * (size / 2 - 0.04)], wood);
    s.box([size, 0.03, size], [tx, top - 0.015, tz], wood);
    if (a.cloth !== 'bare') {
      const drape = s.material('#ffffff', { map: cloth(random, a.cloth), roughness: 0.95, side: THREE.DoubleSide });
      const drop = a.cloth === 'velvet' ? 0.3 : 0.16;
      s.box([size + 0.04, 0.012, size + 0.04], [tx, top + 0.006, tz], drape);
      for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const flap = s.box([x ? 0.01 : size + 0.04, drop, z ? 0.01 : size + 0.04], [tx + x * (size / 2 + 0.02), top - drop / 2 + 0.006, tz + z * (size / 2 + 0.02)], drape);
        if (a.cloth === 'velvet') flap.scale.y = 1;
      }
    }
    const china = s.material('#f1ece0', { roughness: 0.4 });
    let flame: THREE.Mesh | null = null;
    if (a.table === 'biscuits') {
      s.cylinder(0.09, 0.075, 0.01, [tx - 0.08, top + 0.017, tz + 0.03], china, 20);
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.5, 12), s.material('#c9924a', { roughness: 0.9 }), Array.from({ length: 7 }, (_, i) => ({ at: [tx - 0.08 + Math.cos(i * 1.1) * 0.045, top + 0.03 + (i % 2) * 0.012, tz + 0.03 + Math.sin(i * 1.1) * 0.04] as [number, number, number], size: 0.024 })));
      s.cylinder(0.055, 0.055, 0.005, [tx + 0.12, top + 0.015, tz - 0.08], china, 18);
      s.lathe([[0.01, 0], [0.03, 0.003], [0.036, 0.03], [0.038, 0.055], [0.032, 0.012], [0.01, 0.006]], china, [tx + 0.12, top + 0.018, tz - 0.08]);
      s.cylinder(0.028, 0.028, 0.003, [tx + 0.12, top + 0.07, tz - 0.08], s.material('#b48a5a', { roughness: 0.4 }), 14);
    } else if (a.table === 'candle') {
      const jar = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false });
      s.cylinder(0.04, 0.038, 0.1, [tx, top + 0.062, tz], jar, 16);
      s.cylinder(0.018, 0.02, 0.07, [tx, top + 0.047, tz], s.material('#f1e8d0', { roughness: 0.7 }), 12);
      flame = s.ball([0.012, 0.03, 0.012], [tx, top + 0.1, tz], new THREE.MeshStandardMaterial({ color: '#fff2c4', emissive: new THREE.Color().setHSL(mix(0.13, 0.06, mood.warmth), 1, 0.6), emissiveIntensity: mix(0.7, 1.7, mood.warmth), transparent: true, opacity: 0.9, depthWrite: false }), 10);
    } else if (a.table === 'hat') {
      const felt = s.material('#1a1a1c', { roughness: 0.85 });
      s.cylinder(0.12, 0.12, 0.01, [tx - 0.03, top + 0.017, tz], felt, 24);
      s.cylinder(0.07, 0.078, 0.09, [tx - 0.03, top + 0.067, tz], felt, 20);
      const leather = s.material(pick(['#4a3020', '#2a2320']), { roughness: 0.7 });
      for (let i = 0; i < 2; i++) {
        const glove = s.box([0.07, 0.015, 0.14], [tx + 0.15, top + 0.02 + i * 0.012, tz + 0.05 - i * 0.06], leather);
        glove.rotation.y = 0.3 + i * 0.5;
      }
    } else {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false });
      for (let i = 0; i < 3; i++) s.cylinder(0.025, 0.02, 0.07, [tx - 0.12 + i * 0.1, top + 0.047, tz + 0.08 - i * 0.05], glass, 12);
      s.cylinder(0.025, 0.02, 0.07, [tx + 0.1, top + 0.035, tz - 0.1], glass, 12).rotation.set(Math.PI / 2, 0, 0.6);
      s.cylinder(0.032, 0.034, 0.2, [tx - 0.1, top + 0.11, tz - 0.1], s.material('#2a3a1a', { roughness: 0.25 }), 14);
      s.cylinder(0.012, 0.018, 0.06, [tx - 0.1, top + 0.24, tz - 0.1], s.material('#2a3a1a', { roughness: 0.25 }), 10);
    }

    // ---- a second child, awake and keeping watch
    let watcher: Figure | null = null;
    if (a.awake) {
      const side = random() < 0.5 ? -1 : 1;
      const kid = figure(s, {
        height: H * 1.12, build: 'slight', style: 'doll', pose: 'sitting', gaze: 'down', skin,
        hair: random() < 0.5 ? 'short' : 'long', hairColor,
        top: pick(['#5e7a4a', '#8a3a3a', '#f1efe6']), bottom: pick(['#2a2a30', '#55585e']), shoes: '#1d1a18', sleeves: 'long',
      });
      poseLeg(kid, 'left', { forward: 75, knee: 40, out: 12 });
      poseLeg(kid, 'right', { forward: 80, knee: 35, out: -2 });
      poseArm(kid, 'left', { forward: 50, out: 6, bend: 60, inward: 20 });
      poseArm(kid, 'right', { forward: 50, out: 6, bend: 60, inward: 20 });
      kid.root.position.set(tx + side * (size / 2 + 0.3), 0, tz + 0.1);
      kid.root.rotation.y = -side * (Math.PI / 2 - 0.3);
      s.root.add(kid.root);
      ground(kid);
      watcher = kid;
    }

    const flicker = mix(0.03, 0.22, mood.energy);
    return s.finish({
      update(dt, time) {
        child.update(dt, time);
        watcher?.update(dt, time);
        if (flame) flame.scale.y = 0.03 * (1 + Math.sin(time * 17) * flicker + Math.sin(time * 7.3) * flicker * 0.5);
      },
    });
  },
});
