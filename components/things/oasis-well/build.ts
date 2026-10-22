import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { sandGround, sandTone } from './sand';

type P3 = readonly [number, number, number];

/** A feathered palm frond painted with a see-through background, so flat strips read as leaflets. */
function frondTexture(random: () => number, colour: string, rib: string, ragged: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 512;
  const g = canvas.getContext('2d')!;
  g.lineCap = 'round';
  for (let y = 500; y > 14; y -= 9) {
    const t = 1 - y / 512, reach = 60 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.08)) ** 0.6;
    for (const side of [-1, 1]) {
      if (random() < ragged * 0.55) continue;
      g.strokeStyle = colour;
      g.globalAlpha = 1;
      g.lineWidth = 5.5;
      g.beginPath(); g.moveTo(64, y); g.lineTo(64 + side * reach * mix(0.6, 1, random()), y - 26 - random() * 10); g.stroke();
    }
  }
  g.strokeStyle = rib; g.lineWidth = 5; g.beginPath(); g.moveTo(64, 512); g.lineTo(64, 6); g.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function barkTexture(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 256;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#7a6248'; g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 12) {
    g.fillStyle = random() < 0.5 ? '#5b4734' : '#8f775a';
    g.fillRect(0, y, 64, 4 + random() * 3);
    for (let x = (y / 12) % 2 ? 0 : 8; x < 64; x += 16) { g.fillStyle = '#4a3828'; g.fillRect(x, y + 4, 3, 8); }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    rim: choice('What is the mouth of the well built from?', {
      stone: 'A ring of rough stacked stones, dark with handling.',
      plaster: 'A smooth whitewashed mud-brick ring, worn at the lip by ropes.',
      concrete: 'A plain concrete ring with a stencilled number, sunk by some agency decades ago.',
      timber: 'A square crib of palm logs laid over a pit.',
    }),
    lift: choice('How is the water raised?', {
      forked: 'Two forked poles carrying a crossbar and a wooden pulley wheel, the rope running off to where an animal would haul it.',
      sweep: 'A shadoof: one long sweep pole balanced on a forked post, a rock lashed to its short end.',
      windlass: 'A log windlass between two posts with a crank handle and rope wound on it.',
      handline: 'Nothing but a coil of rope: you haul it up hand over hand.',
    }),
    bucket: choice('What is the bucket?', {
      leather: 'A dark sagging leather bag on a wooden hoop.',
      tin: 'A dented galvanised tin pail.',
      jerrycan: 'A yellow plastic jerrycan with the top cut off.',
      rubber: 'A black bag stitched from a tyre inner tube.',
    }),
    water: choice('What state is the water in?', {
      brimming: 'Clear and high, almost at the rim, the trough full and glinting.',
      low: 'A dark gleam far down the shaft and only a puddle in the trough.',
      dry: 'Gone. The shaft is choked with sand and the trough is full of it.',
      salt: 'Milky and bitter, with a white crust of salt on everything it has touched.',
    }),
    palms: choice('What palms stand over it?', {
      dead: 'One dead palm, a bare headless trunk with a few brown fronds still hanging, and a felled one beside it.',
      one: 'One tall leaning date palm.',
      two: 'Two palms leaning apart.',
      three: 'Three palms of different heights, a small grove.',
    }),
    trough: choice('What do animals drink from?', {
      stone: 'A long trough of mortared stone.',
      log: 'A hollowed palm log.',
      drum: 'Half an oil drum split lengthwise.',
      none: 'Nothing: there is no trough.',
    }),
    visitors: choice('Who was here last, and what did they leave?', {
      nobody: 'Nobody for a long time. Nothing is left.',
      tea: 'Someone resting: a blackened teapot on three stones over embers, and two small glasses.',
      saddle: 'A camel rider: a tall-pommelled saddle and two full waterskins set down in the shade.',
      goat: 'A herder: a goat is still drinking at the trough.',
      mat: 'Someone praying: a small rug laid out with a pair of sandals beside it.',
      queue: 'Many people: a line of yellow and blue jerrycans left to hold places in the queue.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const sand = sandTone('#dfc08a', mood.warmth);
    const dry = a.water === 'dry', salt = a.water === 'salt';
    const ground = sandGround({
      radius: 3.9, colour: sand, random, rows: 30, ripple: 0.8, dome: 0.1, stretch: 1.12,
      height: (x, z) => 0.16 * Math.exp(-((x + 2.4) ** 2 + (z + 1.9) ** 2) / 5) - 0.05 * Math.exp(-(x * x + z * z) / 3),
    });
    s.root.add(ground.mesh);
    const on = (x: number, z: number, lift = 0): P3 => [x, ground.y(x, z) + lift, z];
    const G = ground.y(0, 0);
    const wood = s.material('#8a6b4a', { roughness: 0.9 });
    const oldWood = s.material('#6a5340', { roughness: 1 });
    const hemp = s.material('#b79b6a', { roughness: 1 });
    const waterColour = salt ? '#b9c9c2' : a.water === 'low' ? '#1c2d33' : '#2f8f9a';
    const waterMaterial = new THREE.MeshStandardMaterial({ color: waterColour, roughness: 0.12, metalness: 0.3, emissive: waterColour, emissiveIntensity: a.water === 'brimming' ? 0.35 : 0.08 });
    const sandMaterial = s.material(sand.clone().multiplyScalar(0.96), { roughness: 1 });
    const crust = s.material('#efece2', { roughness: 1 });
    const damp = s.material(sand.clone().multiplyScalar(0.62), { roughness: 0.9 });

    // The mouth of the well.
    const RIM = 0.78, RIN = 0.66;
    const stoneTint = new THREE.Color(a.rim === 'stone' ? '#6f6459' : '#8a7c6c');
    if (!dry) s.ball([1.75, 0.03, 1.55], [0.15, G + 0.005, 0.15], salt ? crust : damp, 20).castShadow = false;
    if (a.rim === 'stone') {
      const lining = s.mesh(new THREE.CylinderGeometry(RIN + 0.04, RIN + 0.04, RIM - 0.06, 28, 1, true), new THREE.MeshStandardMaterial({ color: '#3b332c', roughness: 1, side: THREE.DoubleSide }), [0, G + RIM / 2 - 0.03, 0]);
      lining.castShadow = true;
      const per = 12, courses = 4, total = per * courses;
      const stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), total + 6);
      const dummy = new THREE.Object3D();
      let n = 0;
      const lay = (x: number, y: number, z: number, turn: number, size: number) => {
        dummy.position.set(x, y, z);
        dummy.rotation.set((random() - 0.5) * 0.3, turn, (random() - 0.5) * 0.3);
        dummy.scale.set(0.25 * size, 0.115, 0.17 * size);
        dummy.updateMatrix();
        stones.setMatrixAt(n, dummy.matrix);
        stones.setColorAt(n++, stoneTint.clone().multiplyScalar(mix(0.75, 1.2, random())));
      };
      for (let c = 0; c < courses; c++) for (let i = 0; i < per; i++) {
        const angle = ((i + (c % 2) * 0.5) / per) * 6.28 + random() * 0.08, r = 0.86 - c * 0.02;
        if (c === courses - 1 && random() < mood.wear * 0.45) {
          const out = 1.3 + random() * 0.7;
          lay(Math.cos(angle) * out, ground.y(Math.cos(angle) * out, Math.sin(angle) * out) + 0.06, Math.sin(angle) * out, random() * 6, 1);
        } else lay(Math.cos(angle) * r, G + 0.1 + c * 0.19, Math.sin(angle) * r, -angle + Math.PI / 2, mix(0.85, 1.15, random()));
      }
      stones.count = n;
      stones.castShadow = stones.receiveShadow = true;
      s.root.add(stones);
    } else if (a.rim === 'timber') {
      for (let c = 0; c < 3; c++) for (const side of [-1, 1]) {
        const log = s.cylinder(0.13, 0.15, 2.3, [c % 2 ? side * 0.82 : 0, G + 0.14 + c * 0.24, c % 2 ? 0 : side * 0.82], c === 2 ? wood : oldWood, 10);
        log.rotation.set(c % 2 ? Math.PI / 2 : 0, 0, c % 2 ? 0 : Math.PI / 2);
        log.rotation.y += (random() - 0.5) * 0.06;
      }
      s.box([1.5, 0.5, 1.5], [0, G + 0.2, 0], new THREE.MeshStandardMaterial({ color: '#2a221c', roughness: 1 }));
    } else {
      const plaster = a.rim === 'plaster';
      const body = s.material(salt ? '#e9e6dc' : plaster ? '#e6dcc6' : '#a9a69c', { roughness: 1, side: THREE.DoubleSide });
      s.lathe([[RIN, 0.02], [RIN + 0.02, RIM], [plaster ? 0.9 : 0.86, RIM + (plaster ? 0.03 : 0)], [plaster ? 1.0 : 0.88, plaster ? RIM * 0.5 : RIM - 0.02], [plaster ? 1.08 : 0.88, 0]], body, [0, G, 0]);
      if (plaster) s.lathe([[1.05, 0.2], [1.1, 0.0]], s.material('#b89c74', { roughness: 1, side: THREE.DoubleSide }), [0, G, 0]);
      else {
        s.label(`PUITS ${1 + Math.floor(random() * 40)}  19${60 + Math.floor(random() * 30)}`, 0.8, 0.2, [0, G + 0.45, 0.885], '#3c4a55', '#a9a69c');
        const lid = s.cylinder(0.72, 0.72, 0.03, [-0.35, G + RIM + 0.1, -0.2], s.material('#6c5a4a', { metalness: 0.5, roughness: 0.7 }), 24);
        lid.rotation.set(0.25, 0, 0.3);
      }
    }
    const surface = a.water === 'brimming' ? RIM - 0.14 : dry ? RIM - 0.22 : salt ? RIM - 0.3 : 0.08;
    const pool = s.cylinder(RIN, RIN, 0.02, [0, G + surface, 0], dry ? sandMaterial : waterMaterial, 28);
    pool.castShadow = false;
    if (salt) s.ring(RIN - 0.03, 0.045, [0, G + surface + 0.01, 0], crust).rotation.x = Math.PI / 2;

    // Bucket.
    const makeBucket = () => {
      const group = new THREE.Group();
      if (a.bucket === 'leather' || a.bucket === 'rubber') {
        const hide = s.material(a.bucket === 'leather' ? '#5d3d28' : '#1e1d1f', { roughness: a.bucket === 'leather' ? 0.9 : 0.5, side: THREE.DoubleSide });
        group.add(s.lathe([[0.02, -0.34], [0.14, -0.3], [0.2, -0.16], [0.17, -0.02], [0.18, 0]], hide));
        group.add(s.ring(0.18, 0.018, [0, 0, 0], wood).rotateX(Math.PI / 2));
        for (const angle of [0, 2.1, 4.2]) group.add(s.rod([Math.cos(angle) * 0.18, 0, Math.sin(angle) * 0.18], [0, 0.3, 0], 0.008, hemp));
      } else if (a.bucket === 'tin') {
        const tin = s.material('#a9aeb0', { metalness: 0.7, roughness: 0.45, side: THREE.DoubleSide });
        group.add(s.mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.3, 16, 1, true), tin, [0, -0.15, 0]), s.cylinder(0.12, 0.12, 0.01, [0, -0.3, 0], tin, 16));
        group.add(s.ring(0.17, 0.008, [0, 0.02, 0], tin, Math.PI));
        group.add(s.rod([0, 0.19, 0], [0, 0.3, 0], 0.006, hemp));
      } else {
        const plastic = s.material('#e3b21f', { roughness: 0.6, side: THREE.DoubleSide });
        group.add(s.box([0.26, 0.3, 0.16], [0, -0.15, 0], plastic));
        group.add(s.box([0.22, 0.02, 0.12], [0, -0.005, 0], new THREE.MeshStandardMaterial({ color: '#3b2f14', roughness: 1 })));
        for (const side of [-1, 1]) group.add(s.rod([side * 0.12, 0, 0], [0, 0.3, 0], 0.008, hemp));
      }
      s.root.add(group);
      return group;
    };
    const bucket = makeBucket();
    const rope = (points: P3[], radius = 0.016) => s.tube(points, radius, hemp);
    const fork = (x: number, z: number, height: number, lean: number, turn = 0) => {
      const base = on(x, z, -0.05), top: P3 = [x + lean, G + height, z];
      s.rod(base, top, 0.06, wood, 0.045);
      for (const side of [-1, 1]) s.rod(top, [top[0] + Math.sin(turn) * side * 0.14, top[1] + 0.26, top[2] + Math.cos(turn) * side * 0.14], 0.04, wood, 0.028);
      return top;
    };
    let wheel: THREE.Object3D | null = null;
    let hang = G + 1.25;
    if (a.lift === 'forked') {
      const left = fork(-1.2, 0.05, 2.25, 0.12), right = fork(1.2, -0.05, 2.15, -0.1);
      s.rod([left[0] - 0.12, left[1] + 0.08, left[2]], [right[0] + 0.12, right[1] + 0.08, right[2]], 0.035, oldWood);
      const axleY = (left[1] + right[1]) / 2 + 0.08;
      const pulley = new THREE.Group();
      pulley.add(s.cylinder(0.2, 0.2, 0.07, [0, 0, 0], wood, 20).rotateZ(Math.PI / 2), s.ring(0.2, 0.03, [0, 0, 0], oldWood).rotateY(Math.PI / 2));
      for (let i = 0; i < 4; i++) pulley.add(s.box([0.09, 0.36, 0.035], [0, 0, 0], oldWood).rotateX((i * Math.PI) / 4));
      pulley.position.set(0, axleY, 0);
      s.root.add(pulley);
      wheel = pulley;
      hang = G + mix(1.0, 1.45, random());
      rope([[0, hang + 0.3, 0.2], [0, axleY - 0.05, 0.2], [0, axleY + 0.2, 0.02], [0, axleY + 0.05, -0.2], [0.4, G + 1.1, -1.4], [0.9, G + 0.12, -2.6], [1.5, ground.y(1.5, -2.9) + 0.03, -2.9], [2.1, ground.y(2.1, -2.6) + 0.03, -2.6]]);
      bucket.position.set(0, hang, 0.2);
      s.rod(on(2.2, -2.6, -0.02), on(2.25, -2.6, 0.3), 0.04, oldWood);
    } else if (a.lift === 'sweep') {
      const top = fork(-1.7, 0, 2.3, 0, Math.PI / 2);
      const tilt = mix(0.28, 0.5, random()), long = 3.3, short = 2.0;
      const tip: P3 = [top[0] + Math.cos(tilt) * long, top[1] + 0.1 + Math.sin(tilt) * long, 0], tail: P3 = [top[0] - Math.cos(tilt) * short, top[1] + 0.1 - Math.sin(tilt) * short, 0];
      s.rod(tail, tip, 0.065, wood, 0.035);
      const rock = s.mesh(new THREE.DodecahedronGeometry(0.34, 0), s.material('#6c6258', { flatShading: true, roughness: 1 }), [tail[0] + 0.1, tail[1] - 0.1, 0]);
      rock.scale.y = 0.8;
      for (let i = 0; i < 3; i++) s.ring(0.3, 0.014, [tail[0] + 0.1, tail[1] - 0.1, 0], hemp).rotation.set(i * 1.1, i * 0.7, 0);
      hang = G + 1.15;
      rope([tip, [tip[0] - 0.02, (tip[1] + hang) / 2, 0.02], [tip[0], hang + 0.3, 0]]);
      bucket.position.set(tip[0], hang, 0);
    } else if (a.lift === 'windlass') {
      for (const side of [-1, 1]) { s.rod(on(side * 1.08, 0, -0.05), [side * 1.08, G + 1.62, 0], 0.07, oldWood, 0.06); s.box([0.16, 0.16, 0.22], [side * 1.08, G + 1.5, 0], oldWood); }
      const drum = s.cylinder(0.11, 0.11, 2.5, [0.1, G + 1.5, 0], wood, 14);
      drum.rotation.z = Math.PI / 2;
      for (let i = 0; i < 7; i++) s.ring(0.125, 0.018, [-0.2 + i * 0.045, G + 1.5, 0], hemp).rotation.y = Math.PI / 2;
      s.rod([1.36, G + 1.5, 0], [1.36, G + 1.5 - 0.34, 0.14], 0.025, s.material('#4a4744', { metalness: 0.6 }));
      s.rod([1.36, G + 1.16, 0.14], [1.66, G + 1.16, 0.14], 0.03, wood);
      hang = G + 0.98;
      rope([[0, G + 1.5, 0.12], [0, hang + 0.3, 0.12]]);
      bucket.position.set(0, hang, 0.12);
    } else {
      bucket.position.set(0.7, G + RIM + 0.36, 0.42);
      bucket.rotation.z = 0.08;
      for (let i = 0; i < 4; i++) s.ring(0.3 - i * 0.03, 0.02, on(-0.9 - i * 0.01, 1.25, 0.03 + i * 0.035), hemp).rotation.set(Math.PI / 2, 0, i);
      rope([[0.7, G + RIM + 0.66, 0.42], [0.45, G + RIM + 0.75, 0.3], [0.2, G + RIM + 0.03, 0.2], [0.0, G + RIM - 0.3, 0.0]]);
      rope([[0.66, G + RIM + 0.6, 0.45], [0.2, G + RIM + 0.02, 0.86], [-0.4, G + 0.25, 1.1], [-0.9, ground.y(-0.9, 1.25) + 0.12, 1.25]]);
    }

    // Trough.
    const TX = 2.25, TZ = 1.35, tyaw = -0.5 + (random() - 0.5) * 0.3;
    const trough = new THREE.Group();
    trough.position.set(TX, ground.y(TX, TZ), TZ);
    trough.rotation.y = tyaw;
    const inTrough = dry ? sandMaterial : waterMaterial;
    const level = a.water === 'brimming' ? 0.9 : dry ? 0.8 : salt ? 0.6 : 0.3;
    if (a.trough === 'stone') {
      const stone = s.material(salt ? '#d9d5c8' : '#8f8375', { roughness: 1 });
      trough.add(s.box([2.4, 0.12, 0.7], [0, 0.06, 0], stone));
      for (const side of [-1, 1]) { trough.add(s.box([2.4, 0.42, 0.13], [0, 0.21, side * 0.29], stone)); trough.add(s.box([0.13, 0.42, 0.7], [side * 1.14, 0.21, 0], stone)); }
      const fill = s.box([2.18, 0.02, 0.46], [0, 0.12 + 0.28 * level, 0], inTrough);
      fill.castShadow = false;
      trough.add(fill);
    } else if (a.trough === 'log' || a.trough === 'drum') {
      const isLog = a.trough === 'log', r = isLog ? 0.3 : 0.29, length = isLog ? 2.6 : 0.9;
      const shellMaterial = isLog ? s.material('#6f573f', { roughness: 1, side: THREE.DoubleSide }) : s.material(mood.cheer > 0.5 ? '#2f6aa8' : '#8a4a30', { roughness: 0.8, metalness: 0.3, side: THREE.DoubleSide });
      for (let k = 0; k < (isLog ? 1 : 2); k++) {
        const x = isLog ? 0 : (k - 0.5) * 1.0;
        const half = s.mesh(new THREE.CylinderGeometry(r, r, length, 18, 1, false, Math.PI / 2, Math.PI), shellMaterial, [x, r, 0]);
        half.rotation.set(0, 0, Math.PI / 2);
        half.rotation.x = Math.PI / 2;
        const fill = s.box([length - 0.06, 0.02, Math.sqrt(Math.max(0.01, r * r - (r * (1 - level)) ** 2)) * 2 - 0.03], [x, r * level + 0.02, 0], inTrough);
        fill.castShadow = false;
        trough.add(half, fill);
        if (!isLog) for (const rx of [-0.3, 0, 0.3]) trough.add(s.ring(r + 0.004, 0.012, [x + rx, r, 0], shellMaterial, Math.PI).rotateY(Math.PI / 2).rotateZ(Math.PI));
      }
      for (const side of [-1, 1]) trough.add(s.box([0.14, 0.14, 0.75], [side * (isLog ? 0.9 : 0.8), 0.05, 0], oldWood));
    }
    if (a.trough !== 'none') {
      s.root.add(trough);
      if (!dry) s.ball([1.5, 0.025, 0.7], on(TX, TZ, 0.004), salt ? crust : damp, 16).rotation.y = tyaw;
    }

    // Palms.
    const ragged = mix(0.05, 0.9, mood.wear);
    const liveMap = frondTexture(random, mood.wear > 0.7 ? '#8a8a4a' : mood.cheer > 0.6 ? '#4f8a3a' : '#5b7a3c', '#8a7a3c', ragged);
    const deadMap = frondTexture(random, '#a08456', '#7a6240', 0.6);
    const leaf = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 });
    const liveMaterial = leaf(liveMap), deadMaterial = leaf(deadMap);
    const bark = new THREE.MeshStandardMaterial({ map: barkTexture(random), roughness: 1 });
    bark.map!.wrapT = THREE.RepeatWrapping;
    const frond = (length: number, droop: number, angle: number, elevation: number, at: THREE.Vector3) => {
      const geometry = new THREE.PlaneGeometry(length * 0.34, length, 2, 8);
      geometry.translate(0, length / 2, 0);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const t = p.getY(i) / length;
        p.setZ(i, Math.abs(p.getX(i)) * 0.5 + droop * length * t * t);
        p.setY(i, length * (t - 0.18 * droop * t * t));
      }
      geometry.applyMatrix4(new THREE.Matrix4().makeRotationY(angle).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2 - elevation)));
      geometry.translate(at.x, at.y, at.z);
      geometry.computeVertexNormals();
      return geometry;
    };
    const crowns: { group: THREE.Group; sway: number }[] = [];
    const palm = (x: number, z: number, height: number, lean: number, heading: number, alive = true) => {
      const base = new THREE.Vector3(x, ground.y(x, z) - 0.1, z);
      const out = new THREE.Vector3(Math.cos(heading), 0, Math.sin(heading));
      const top = base.clone().addScaledVector(out, lean * height).setY(base.y + height);
      const curve = new THREE.CatmullRomCurve3([base, base.clone().lerp(top, 0.35).addScaledVector(out, -lean * height * 0.16), base.clone().lerp(top, 0.7).addScaledVector(out, -lean * height * 0.1), top]);
      const trunk = s.mesh(new THREE.TubeGeometry(curve, 16, 0.17, 9), bark);
      (trunk.material as THREE.MeshStandardMaterial).map!.repeat.set(1, 1);
      trunk.geometry.attributes.uv.array.forEach((_v, i, array) => { if (i % 2 === 0) { const u = array[i], v = array[i + 1]; array[i] = v * 3; array[i + 1] = u * height * 0.5; } });
      s.cylinder(0.2, 0.3, 0.5, [base.x, base.y + 0.3, base.z], bark, 10);
      s.ball([0.3, 0.34, 0.3], [top.x, top.y, top.z], oldWood, 10);
      const crown = new THREE.Group();
      crown.position.copy(top);
      const count = alive ? Math.round(mix(17, 8, mood.wear)) : 0, live: THREE.BufferGeometry[] = [], dead: THREE.BufferGeometry[] = [];
      const origin = new THREE.Vector3(0, 0.1, 0);
      for (let i = 0; i < count; i++) {
        const ring = i / count, elevation = mix(1.25, -0.25, ring) + (random() - 0.5) * 0.25;
        live.push(frond(mix(1.5, 2.6, random()) * (height > 4 ? 1 : 0.8), mix(0.35, 0.95, ring + random() * 0.2), i * 2.4 + random() * 0.4, elevation, origin));
      }
      for (let i = 0; i < (alive ? 2 + Math.round(mood.wear * 8) : 5); i++) dead.push(frond(mix(1.4, 2.1, random()), 0.25, random() * 6.28, -1.25 + (random() - 0.5) * 0.3, origin));
      for (const [parts, material] of [[live, liveMaterial], [dead, deadMaterial]] as const) {
        if (!parts.length) continue;
        const mesh = new THREE.Mesh(mergeGeometries(parts)!, material);
        mesh.castShadow = true;
        crown.add(mesh);
        for (const part of parts) part.dispose();
      }
      if (alive && mood.cheer > 0.35 && mood.wear < 0.8) {
        const dates = s.material(mood.cheer > 0.7 ? '#d98a2c' : '#8a4a26', { roughness: 0.6 });
        for (let i = 0; i < 2 + Math.round(random() * 2); i++) {
          const angle = random() * 6.28, bunch = s.ball([0.14, 0.26, 0.14], [Math.cos(angle) * 0.38, -0.42, Math.sin(angle) * 0.38], dates, 8);
          crown.add(bunch, s.rod([Math.cos(angle) * 0.15, 0, Math.sin(angle) * 0.15], [Math.cos(angle) * 0.38, -0.2, Math.sin(angle) * 0.38], 0.015, s.material('#c9a44a')));
        }
      }
      s.root.add(crown);
      crowns.push({ group: crown, sway: random() * 6.28 });
    };
    const spots: [number, number, number, number, number][] = [[-1.9, -1.5, 6.2, 0.2, 0.5], [-2.7, 0.4, 4.6, 0.3, 2.6], [-0.6, -2.5, 5.3, 0.24, -1.2]];
    const palmCount = { dead: 0, one: 1, two: 2, three: 3 }[a.palms];
    for (let i = 0; i < palmCount; i++) { const [x, z, h, lean, heading] = spots[i]; palm(x + (random() - 0.5) * 0.5, z + (random() - 0.5) * 0.5, h * mix(0.85, 1.12, random()), lean * mix(0.5, 1.4, random()), heading + (random() - 0.5)); }
    if (a.palms === 'dead') {
      palm(-1.9, -1.5, 4.4 * mix(0.85, 1.1, random()), 0.3, 0.5 + (random() - 0.5), false);
      s.cylinder(0.2, 0.3, 0.6, on(-0.6, -2.5, 0.25), bark, 10);
      const fallen = s.cylinder(0.17, 0.2, 3.0, on(-2.6, 0.6, 0.17), bark, 10);
      fallen.rotation.set(Math.PI / 2, 0, 0.9, 'ZXY');
    }
    // Suckers and dry grass: the green that water allows.
    const tufts: { at: P3; height: number; lean: number; turn: number }[] = [];
    const clumps = dry ? 1 : Math.round(mix(3, 12, mood.density));
    for (let i = 0; i < clumps; i++) {
      const angle = random() * 6.28, r = 1.3 + random() * 1.8, cx = Math.cos(angle) * r, cz = Math.sin(angle) * r;
      for (let k = 0; k < 9; k++) tufts.push({ at: on(cx + (random() - 0.5) * 0.3, cz + (random() - 0.5) * 0.3, -0.02), height: 0.25 + random() * 0.4, lean: random() * 0.6, turn: random() * 6.28 });
    }
    if (tufts.length) {
      const blade = new THREE.ConeGeometry(0.02, 1, 4);
      blade.translate(0, 0.5, 0);
      const grass = new THREE.InstancedMesh(blade, s.material(dry ? '#a59a6a' : '#7d9a48', { roughness: 1 }), tufts.length);
      const dummy = new THREE.Object3D();
      tufts.forEach((tuft, i) => { dummy.position.set(...tuft.at); dummy.rotation.set(tuft.lean, tuft.turn, 0, 'YXZ'); dummy.scale.set(1, tuft.height, 1); dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix); });
      grass.castShadow = true;
      s.root.add(grass);
    }

    // Visitors.
    const VX = -1.3, VZ = 2.2;
    let goatHead: THREE.Object3D | null = null;
    let embers: THREE.MeshStandardMaterial | null = null;
    if (a.visitors === 'tea') {
      const soot = s.material('#2c2724', { roughness: 0.9 });
      for (let i = 0; i < 3; i++) s.mesh(new THREE.DodecahedronGeometry(0.13, 0), s.material('#5d544c', { flatShading: true }), on(VX + Math.cos(i * 2.1) * 0.22, VZ + Math.sin(i * 2.1) * 0.22, 0.08));
      embers = new THREE.MeshStandardMaterial({ color: '#ff8a3c', emissive: '#ff5a14', emissiveIntensity: 1.8, roughness: 1 });
      s.ball([0.16, 0.05, 0.16], on(VX, VZ, 0.04), embers, 10);
      const enamel = s.material(mood.cheer > 0.5 ? '#2f7fb5' : '#4c6a5a', { roughness: 0.4 });
      const py = ground.y(VX, VZ) + 0.3;
      s.ball([0.13, 0.12, 0.13], [VX, py, VZ], enamel, 14);
      s.cylinder(0.04, 0.07, 0.08, [VX, py + 0.13, VZ], enamel, 10);
      s.ball([0.02, 0.02, 0.02], [VX, py + 0.18, VZ], soot, 8);
      s.rod([VX + 0.1, py, VZ], [VX + 0.27, py + 0.12, VZ], 0.022, enamel, 0.012);
      s.ring(0.07, 0.012, [VX - 0.15, py + 0.02, VZ], enamel, Math.PI * 1.4).rotation.z = Math.PI * 0.8;
      s.cylinder(0.26, 0.26, 0.015, on(VX + 0.62, VZ + 0.25, 0.02), s.material('#b8963c', { metalness: 0.7, roughness: 0.4 }), 20);
      const glass = new THREE.MeshStandardMaterial({ color: '#c98a3a', roughness: 0.1, transparent: true, opacity: 0.8 });
      for (const [gx, gz] of [[0.52, 0.2], [0.72, 0.32]]) s.cylinder(0.035, 0.028, 0.08, on(VX + gx, VZ + gz, 0.07), glass, 10);
    } else if (a.visitors === 'saddle') {
      const frame = s.material('#7a3b2a', { roughness: 0.7 });
      const y = ground.y(VX, VZ);
      const saddle = new THREE.Group();
      saddle.add(s.ball([0.34, 0.1, 0.3], [0, 0.34, 0], s.material(mood.cheer > 0.5 ? '#b5372c' : '#6a3a34'), 14));
      for (const side of [-1, 1]) saddle.add(s.rod([side * 0.3, 0, 0.22], [0, 0.4, 0.05], 0.03, frame), s.rod([side * 0.3, 0, -0.22], [0, 0.4, -0.05], 0.03, frame));
      saddle.add(s.rod([0, 0.36, 0.26], [0, 0.95, 0.36], 0.03, frame), s.box([0.34, 0.05, 0.03], [0, 0.82, 0.34], frame), s.box([0.05, 0.2, 0.03], [0, 0.95, 0.36], frame));
      saddle.add(s.box([0.3, 0.42, 0.04], [0, 0.55, -0.3], frame));
      saddle.position.set(VX, y, VZ);
      saddle.rotation.y = 0.7;
      s.root.add(saddle);
      const skin = s.material('#3a2a22', { roughness: 0.6 });
      for (const [gx, gz, turn] of [[0.75, 0.1, 0.4], [0.95, 0.45, 1.3]]) {
        const bag = s.ball([0.36, 0.17, 0.2], on(VX + gx, VZ + gz, 0.15), skin, 14);
        bag.rotation.y = turn;
        s.ball([0.05, 0.05, 0.05], on(VX + gx + Math.cos(turn) * 0.36, VZ + gz - Math.sin(turn) * 0.36, 0.2), hemp, 8);
      }
    } else if (a.visitors === 'goat') {
      const hide = s.material(random() < 0.5 ? '#2c2622' : '#d9cfbc', { roughness: 1 });
      const patch = s.material('#7a5a3c', { roughness: 1 });
      const goat = new THREE.Group();
      goat.add(s.ball([0.19, 0.2, 0.4], [0, 0.55, 0], hide, 14), s.ball([0.15, 0.14, 0.18], [0, 0.6, -0.2], patch, 10));
      for (const [lx, lz] of [[0.1, 0.27], [-0.1, 0.27], [0.1, -0.27], [-0.1, -0.27]]) goat.add(s.rod([lx, 0.5, lz], [lx, 0, lz + 0.02], 0.035, hide, 0.025));
      const head = new THREE.Group();
      head.add(s.rod([0, 0, 0], [0, -0.2, 0.26], 0.07, hide, 0.055), s.ball([0.075, 0.08, 0.14], [0, -0.24, 0.34], hide, 10));
      for (const side of [-1, 1]) head.add(s.rod([side * 0.04, -0.17, 0.3], [side * 0.08, -0.02, 0.2], 0.02, s.material('#3a332c'), 0.006), s.ball([0.03, 0.05, 0.015], [side * 0.1, -0.2, 0.28], hide, 6));
      head.position.set(0, 0.62, 0.34);
      goat.add(head, s.rod([0, 0.66, -0.38], [0, 0.78, -0.46], 0.025, hide));
      goatHead = head;
      const hasTrough = a.trough !== 'none';
      const gx = hasTrough ? TX + Math.sin(tyaw) * 0.95 : 0.9, gz = hasTrough ? TZ + Math.cos(tyaw) * 0.95 : 1.4;
      goat.position.set(gx, ground.y(gx, gz), gz);
      goat.rotation.y = hasTrough ? tyaw + Math.PI : Math.atan2(-gx, -gz);
      s.root.add(goat);
    } else if (a.visitors === 'mat') {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 220;
      const g = canvas.getContext('2d')!;
      const base = mood.cheer > 0.5 ? '#a8322c' : '#3f5a54';
      g.fillStyle = base; g.fillRect(0, 0, 128, 220);
      g.strokeStyle = '#e3c88a'; g.lineWidth = 6; g.strokeRect(10, 10, 108, 200);
      g.fillStyle = '#e3c88a'; g.beginPath(); g.moveTo(34, 150); g.lineTo(34, 80); g.quadraticCurveTo(64, 20, 94, 80); g.lineTo(94, 150); g.closePath(); g.fill();
      g.fillStyle = base; g.beginPath(); g.moveTo(46, 150); g.lineTo(46, 86); g.quadraticCurveTo(64, 48, 82, 86); g.lineTo(82, 150); g.closePath(); g.fill();
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const rug = s.mesh(new THREE.BoxGeometry(0.7, 0.025, 1.2), new THREE.MeshStandardMaterial({ map, roughness: 1 }), on(VX, VZ, 0.03));
      rug.rotation.y = 0.9;
      for (const side of [0, 1]) { const sandal = s.box([0.1, 0.02, 0.26], on(VX + 0.6 + side * 0.14, VZ + 0.75, 0.02), s.material('#4a3526')); sandal.rotation.y = 0.9 + side * 0.15; }
    } else if (a.visitors === 'queue') {
      const count = Math.round(mix(4, 10, mood.density));
      for (let i = 0; i < count; i++) {
        const x = -0.4 - i * 0.36 + (random() - 0.5) * 0.08, z = 1.4 + i * 0.22 + (random() - 0.5) * 0.12;
        const can = new THREE.Group();
        const plastic = s.material(random() < 0.7 ? '#e3b21f' : random() < 0.5 ? '#2f6fd0' : '#e9e4d6', { roughness: 0.6 });
        can.add(s.box([0.3, 0.42, 0.18], [0, 0.21, 0], plastic), s.box([0.12, 0.05, 0.05], [0, 0.46, 0], plastic), s.cylinder(0.03, 0.03, 0.05, [0.1, 0.44, 0], s.material('#b5372c'), 8));
        can.position.set(x, ground.y(x, z), z);
        can.rotation.y = random() * 3;
        if (i === count - 1 && mood.wear > 0.5) can.rotation.z = Math.PI / 2;
        s.root.add(can);
      }
    }
    // Stones round about.
    s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#85786a', { flatShading: true }), Array.from({ length: 8 + Math.round(mood.density * 20) }, () => {
      const angle = random() * 6.28, r = 1.4 + random() * 2.2;
      return { at: on(Math.cos(angle) * r, Math.sin(angle) * r, 0.02), size: 0.05 + random() * 0.09 };
    }));

    const breeze = mix(0.2, 1.4, mood.energy);
    const swing = a.lift === 'handline' ? 0 : 1;
    return s.finish({
      footprint: 3.5,
      update: (_dt, time) => {
        for (const crown of crowns) { crown.group.rotation.z = Math.sin(time * breeze + crown.sway) * 0.03 * breeze; crown.group.rotation.x = Math.cos(time * breeze * 0.7 + crown.sway) * 0.025 * breeze; }
        if (swing) bucket.rotation.z = Math.sin(time * 1.3) * 0.07 * breeze;
        if (wheel) wheel.rotation.x = Math.sin(time * 0.6) * 0.5 * breeze;
        if (goatHead) goatHead.rotation.x = 0.15 + Math.sin(time * 2.2) * 0.06;
        if (embers) embers.emissiveIntensity = 1.6 + Math.sin(time * 5.3) * 0.5;
      },
    });
  },
});
