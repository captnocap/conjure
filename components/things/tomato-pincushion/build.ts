import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type V3 = THREE.Vector3;
interface Item { matrix: THREE.Matrix4; color?: THREE.ColorRepresentation }

function instanced(root: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, items: readonly Item[]) {
  if (!items.length) { geometry.dispose(); return; }
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  items.forEach((item, index) => {
    mesh.setMatrixAt(index, item.matrix);
    if (item.color !== undefined) mesh.setColorAt(index, new THREE.Color(item.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
}

const UP = new THREE.Vector3(0, 1, 0);
const along = (from: V3, direction: V3, length: number, radius: number, flat = 1) =>
  new THREE.Matrix4().compose(
    from.clone().addScaledVector(direction, length / 2),
    new THREE.Quaternion().setFromUnitVectors(UP, direction),
    new THREE.Vector3(radius, length * flat, radius),
  );

function fabricTexture(kind: 'calico' | 'ticking', random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  if (kind === 'calico') {
    ctx.fillStyle = '#e9d9b8';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i++) {
      const x = random() * 256, y = random() * 256;
      ctx.fillStyle = ['#b23a48', '#3f6c8f', '#b23a48', '#6b8f4a'][i % 4];
      for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.257) * 6, y + Math.sin(p * 1.257) * 6, 4.5, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#e7b93b'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill();
    }
  } else {
    ctx.fillStyle = '#efe8d6';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#44598c';
    for (let x = 0; x < 256; x += 32) { ctx.fillRect(x, 0, 10, 256); ctx.fillRect(x + 15, 0, 3, 256); }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  return texture;
}

export default defineThing({
  questions: {
    crowd: score('How crowded with pins is it?', ['Three or four lonely pins', 'A tidy handful', 'Well used, pins all over', 'Bristling so thickly the cloth barely shows']),
    shape: choice('What shape is the pincushion?', {
      biscornu: 'A flattened eight-pointed cushion pulled in at the middle by a button.',
      hedgehog: 'A felt hedgehog whose pins are its spines, with a pointed snout and bead eyes.',
      wrist: 'A small domed cushion on a wrist cuff, the kind a fitter wears while kneeling at a hem.',
      heart: 'A stuffed velvet heart, a keepsake or a sweetheart gift.',
      block: 'A plain square home-made pad, a scrap of cloth stuffed with sawdust.',
      tomato: 'The classic fat tomato, gathered into segments by green thread, with a felt stalk.',
    }),
    fabric: choice('What is it covered in?', {
      red: 'Bright tomato-red felt.',
      faded: 'Red gone to dusty pink from years on a sunny windowsill.',
      velvet: 'Bottle-green velvet.',
      calico: 'A scrap of flowered calico.',
      ticking: 'Blue and cream striped mattress ticking.',
    }),
    heads: choice('What do the pin heads look like?', {
      glass: 'Round glass heads in every bright colour.',
      pearl: 'All pearl white, bridal.',
      jet: 'All glossy black.',
      steel: 'Plain steel dressmaker pins with no coloured head at all.',
      yellow: 'Long quilting pins with yellow heads.',
      flower: 'Flat flower-shaped heads in pink, yellow and blue.',
    }),
    scene: choice('How were the pins left?', {
      neat: 'Pushed in carefully in rings, by someone orderly.',
      bristling: 'Stuck in at every angle in a hurry.',
      spilled: 'Half of them pulled out and scattered on the table around it.',
      threaded: 'A needle still threaded, its long tail of thread trailing off across the table.',
    }),
    proportions: choice('How is the stuffed cushion proportioned?', {
      regular: 'Its ordinary rounded proportions.',
      flat: 'A compressed, low cushion that spreads across the table.',
      tall: 'A tall, firmly stuffed cushion with a high crown.',
      broad: 'An elongated cushion, wider from side to side.',
    }),
    pinLength: choice('How long are the working pins?', {
      fine: 'Short fine pins for tiny hems.',
      dress: 'Ordinary dressmaking pins.',
      long: 'Long pins that project far above the stuffing.',
      mixed: 'Short and long pins mixed together.',
    }),
    closure: choice('How is the filling opening closed?', {
      hidden: 'A hidden seam without extra fittings.',
      laced: 'A small opening cross-laced with cream thread.',
      buttons: 'A short flap fastened with three contrasting buttons.',
      zip: 'A small brass zipper with a visible pull.',
    }),
    mending: choice('What repair is visible on the cushion?', {
      none: 'No added repair.',
      patch: 'A rectangular contrasting patch with a stitched border.',
      darn: 'A little woven square of crossing repair threads.',
      stitches: 'Two long parallel rows of visible repair stitches.',
    }),
    identity: choice('What identifies its owner or use?', {
      none: 'No tag.',
      name: 'A stitched cloth name tab tied to the side.',
      class: 'A numbered paper sewing-class tag on a short cord.',
      gift: 'A dedication gift tag with a ribbon loop.',
    }),
    threadKit: choice('What thread supply is beside it?', {
      none: 'No extra thread.',
      spool: 'A small wooden thread reel with a loose end.',
      bobbins: 'Three low machine bobbins filled with thread.',
      cards: 'Two flat winding cards of embroidery thread.',
    }),
    foundation: choice('What is the pincushion resting on?', {
      bare: 'Directly on the work surface.',
      doily: 'A thin round lace mat.',
      wood: 'A small wooden working board with a raised rim.',
      tray: 'A shallow ceramic tray with a raised rim.',
    }),
    emery: noul('Does a little strawberry emery dangle from it on a cord?'),
    extra: choice('What else is stuck in or set beside it?', {
      none: 'Nothing else.',
      hatpin: 'One long hatpin with a jet bead, far too big for it.',
      safety: 'A few big safety pins hooked through the cloth.',
      thimble: 'A steel thimble resting against it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = { red: '#cf2a27', faded: '#d98b84', velvet: '#1f5a3c', calico: '#ffffff', ticking: '#ffffff' }[a.fabric];
    const cloth = s.material(tint, {
      roughness: a.fabric === 'velvet' ? 1 : 0.85,
      map: a.fabric === 'calico' || a.fabric === 'ticking' ? fabricTexture(a.fabric, random) : null,
    });
    const green = s.material('#3f7a3a', { roughness: 0.9 });
    const steel = s.material('#cfd3d6', { metalness: 0.85, roughness: 0.3 });

    // Each shape reports the dome that pins may enter: centre, radii and how far down the sides.
    let centre = new THREE.Vector3(0, 0.033, 0), radii = new THREE.Vector3(0.047, 0.034, 0.047), reach = 1.25;
    let allow: (direction: V3) => boolean = () => true;
    let flatTop: { y: number; inside: (x: number, z: number) => boolean; span: number } | null = null;

    if (a.shape === 'tomato') {
      const lobes = 6 + Math.floor(random() * 3);
      const geometry = new THREE.SphereGeometry(1, 64, 32);
      const pos = geometry.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
        const flat = Math.hypot(x, z), theta = Math.atan2(z, x);
        const groove = 1 - 0.13 * Math.pow(Math.abs(Math.cos(theta * lobes / 2)), 6) * Math.min(1, flat * 1.6);
        const dimple = y > 0 ? 0.3 * Math.exp(-(flat * flat) / 0.07) : 0.12 * Math.exp(-(flat * flat) / 0.07) * -1;
        pos.setXYZ(v, x * groove, y - dimple, z * groove);
      }
      geometry.computeVertexNormals();
      s.mesh(geometry, cloth, [0, 0.033, 0]).scale.copy(radii);
      // Gathering threads in the grooves.
      for (let i = 0; i < lobes; i++) {
        const theta = i * Math.PI * 2 / lobes, points: [number, number, number][] = [];
        for (let t = 0; t <= 10; t++) {
          const phi = 0.12 + t * 0.29, r = Math.sin(phi) * 0.88, dip = 0.3 * Math.exp(-(r * r) / 0.07);
          points.push([Math.cos(theta) * r * radii.x, 0.033 + (Math.cos(phi) - (Math.cos(phi) > 0 ? dip : 0)) * radii.y * 1.01, Math.sin(theta) * r * radii.z]);
        }
        s.tube(points, 0.0009, green);
      }
      // Felt stalk: a star of leaves and a stub.
      const star = new THREE.Shape();
      for (let i = 0; i < 12; i++) {
        const r = i % 2 ? 0.007 : 0.02, t = i * Math.PI / 6;
        if (i === 0) star.moveTo(Math.cos(t) * r, Math.sin(t) * r); else star.lineTo(Math.cos(t) * r, Math.sin(t) * r);
      }
      const leaves = new THREE.ExtrudeGeometry(star, { depth: 0.002, bevelEnabled: false });
      leaves.rotateX(-Math.PI / 2);
      s.mesh(leaves, green, [0, 0.033 + radii.y * 0.74, 0]).rotation.y = random() * 3;
      s.cylinder(0.003, 0.004, 0.008, [0, 0.033 + radii.y * 0.74 + 0.005, 0], green, 8);
      allow = (d) => Math.hypot(d.x, d.z) > 0.3;
    } else if (a.shape === 'hedgehog') {
      centre = new THREE.Vector3(-0.008, 0.03, 0);
      radii = new THREE.Vector3(0.05, 0.034, 0.038);
      reach = 1.3;
      s.ball([radii.x, radii.y, radii.z], [centre.x, centre.y, centre.z], cloth, 32);
      const face = s.material('#ead9b5', { roughness: 0.9 }), black = s.material('#17140f', { roughness: 0.3 });
      const snout = s.mesh(new THREE.ConeGeometry(0.026, 0.05, 20), face, [0.05, 0.022, 0]);
      snout.rotation.z = -Math.PI / 2 - 0.12;
      s.ball([0.005, 0.005, 0.005], [0.076, 0.019, 0], black, 10);
      for (const z of [-1, 1]) {
        s.ball([0.0035, 0.0035, 0.0035], [0.052, 0.034, z * 0.015], black, 10);
        s.ball([0.008, 0.009, 0.004], [0.036, 0.047, z * 0.024], face, 10).rotation.y = z * 0.5;
        s.ball([0.007, 0.004, 0.006], [0.02, 0.004, z * 0.026], face, 8);
        s.ball([0.007, 0.004, 0.006], [-0.034, 0.004, z * 0.026], face, 8);
      }
      allow = (d) => d.x < 0.45;
    } else if (a.shape === 'wrist') {
      centre = new THREE.Vector3(0, 0.071, 0);
      radii = new THREE.Vector3(0.033, 0.024, 0.033);
      reach = 1.2;
      const band = s.material(a.fabric === 'velvet' ? '#2a2a2e' : '#6b4a33', { roughness: 0.8 });
      const cuff = s.mesh(new THREE.TorusGeometry(0.031, 0.004, 8, 40), band, [0, 0.035, 0]);
      cuff.scale.set(1.15, 1, 4.2);
      const dome = s.mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), cloth, [0, 0.071, 0]);
      dome.scale.copy(radii);
      s.cylinder(0.034, 0.034, 0.004, [0, 0.07, 0], band, 28);
      s.box([0.012, 0.003, 0.02], [0.036, 0.04, 0], steel).rotation.z = 0.3;
    } else if (a.shape === 'heart') {
      const outline: THREE.Vector2[] = [];
      for (let i = 0; i < 48; i++) {
        const t = i / 48 * Math.PI * 2;
        outline.push(new THREE.Vector2(16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)).multiplyScalar(0.0027));
      }
      const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(outline), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.013, bevelSegments: 6 });
      geometry.rotateX(-Math.PI / 2);
      s.mesh(geometry, cloth, [0, 0.014, 0]);
      const inside = (x: number, z: number) => {
        let hit = false;
        for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
          const pi = outline[i], pj = outline[j];
          if (pi.y > -z !== pj.y > -z && x < (pj.x - pi.x) * (-z - pi.y) / (pj.y - pi.y) + pi.x) hit = !hit;
        }
        return hit;
      };
      flatTop = { y: 0.04, inside, span: 0.05 };
      // A ribbon loop at the cleft.
      s.mesh(new THREE.TorusGeometry(0.009, 0.0012, 6, 20), s.material('#f0e6d2'), [0, 0.03, -0.022]).rotation.x = 0.5;
    } else {
      const biscornu = a.shape === 'biscornu';
      radii = biscornu ? new THREE.Vector3(0.05, 0.02, 0.05) : new THREE.Vector3(0.046, 0.022, 0.046);
      centre = new THREE.Vector3(0, radii.y, 0);
      reach = 0.95;
      const geometry = new THREE.SphereGeometry(1, 48, 24);
      const pos = geometry.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
        const flat = Math.hypot(x, z), theta = Math.atan2(z, x);
        if (biscornu) {
          const turn = y > 0 ? 0 : Math.PI / 4;
          const point = 1 + 0.24 * Math.pow(Math.abs(Math.cos((theta + turn) * 2)), 3) * flat;
          const pinch = 0.55 * Math.exp(-(flat * flat) / 0.05) * Math.sign(y);
          pos.setXYZ(v, x * point, y - pinch, z * point);
        } else {
          const k = (c: number) => Math.sign(c) * Math.pow(Math.abs(c), 0.55);
          pos.setXYZ(v, k(x), Math.sign(y) * Math.pow(Math.abs(y), 0.8), k(z));
        }
      }
      geometry.computeVertexNormals();
      s.mesh(geometry, cloth, [centre.x, centre.y, centre.z]).scale.copy(radii);
      if (biscornu) {
        s.cylinder(0.007, 0.007, 0.003, [0, radii.y * 0.52, 0], s.material('#efe9da', { roughness: 0.3 }), 16);
        allow = (d) => Math.hypot(d.x, d.z) > 0.42;
      } else {
        // Blanket stitch round the seam of the home-made pad.
        const stitches: Item[] = [];
        for (let i = 0; i < 44; i++) {
          const t = i / 44 * Math.PI * 2, k = (c: number) => Math.sign(c) * Math.pow(Math.abs(c), 0.55);
          stitches.push({ matrix: new THREE.Matrix4().compose(new THREE.Vector3(k(Math.cos(t)) * radii.x * 1.005, radii.y, k(Math.sin(t)) * radii.z * 1.005), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)) });
        }
        instanced(s.root, new THREE.BoxGeometry(0.0012, 0.007, 0.0012), s.material('#f3ecd8'), stitches);
      }
    }

    // Reshape the cushion before locating pins and loose accessories, so metal parts stay round.
    const proportions = new THREE.Vector3(...({ regular: [1, 1, 1], flat: [1.15, 0.72, 1.15], tall: [0.9, 1.3, 0.9], broad: [1.35, 0.95, 0.9] }[a.proportions] as [number, number, number]));
    const cushion = new THREE.Group();
    for (const child of [...s.root.children]) cushion.add(child);
    cushion.scale.copy(proportions); s.root.add(cushion);
    centre.multiply(proportions); radii.multiply(proportions);
    if (flatTop) {
      const original = flatTop;
      flatTop = { y: original.y * proportions.y, inside: (x, z) => original.inside(x / proportions.x, z / proportions.z), span: original.span * Math.max(proportions.x, proportions.z) };
    }

    // Pins.
    const palettes = {
      glass: ['#e2332e', '#f2c21d', '#2c7fd1', '#2fa35a', '#f1f0ea', '#e563a5', '#ef7d22'],
      pearl: ['#f4f0e6', '#ece6d8'],
      jet: ['#16151a', '#221f24'],
      steel: ['#cfd3d6'],
      yellow: ['#f2c81e'],
      flower: ['#ee6fa6', '#f4cf2f', '#4f9fe0', '#f4f1ea'],
    }[a.heads];
    const count = Math.round(mix(4, a.shape === 'wrist' ? 46 : 96, a.crowd * a.crowd) * mix(0.75, 1.3, mood.density));
    const shafts: Item[] = [], heads: Item[] = [], loose: { from: V3; direction: V3; length: number; color: string }[] = [];
    const headSize = a.heads === 'steel' ? 0.0011 : a.heads === 'yellow' ? 0.0024 : a.heads === 'flower' ? 0.0036 : 0.0021;
    const pinLength = (a.heads === 'yellow' ? 0.036 : 0.026) * { fine: 0.65, dress: 1, long: 1.45, mixed: 1.2 }[a.pinLength];
    const jitter = a.scene === 'neat' ? 0.06 : 0.38;
    const rings = Math.max(1, Math.round(Math.sqrt(count / 5)));
    const stick = (from: V3, direction: V3, length: number, color: string) => {
      shafts.push({ matrix: along(from, direction, length, 0.00055) });
      const tip = from.clone().addScaledVector(direction, length);
      heads.push({ matrix: new THREE.Matrix4().compose(tip, new THREE.Quaternion().setFromUnitVectors(UP, direction), new THREE.Vector3(headSize, a.heads === 'flower' || a.heads === 'steel' ? headSize * 0.3 : headSize, headSize)), color });
    };
    for (let i = 0; i < count; i++) {
      const color = palettes[Math.floor(random() * palettes.length)];
      const length = pinLength * mix(a.pinLength === 'mixed' ? 0.3 : 0.55, 1, random());
      if (a.scene === 'spilled' && random() < 0.5) {
        const angle = random() * Math.PI * 2, far = mix(0.062, 0.115, random()), turn = random() * Math.PI * 2;
        loose.push({ from: new THREE.Vector3(Math.cos(angle) * far, 0.0012, Math.sin(angle) * far), direction: new THREE.Vector3(Math.cos(turn), 0, Math.sin(turn)), length: pinLength, color });
        continue;
      }
      let from: V3 | null = null, normal = UP.clone();
      for (let attempt = 0; attempt < 20 && !from; attempt++) {
        if (flatTop) {
          const x = (random() - 0.5) * 2 * flatTop.span, z = (random() - 0.5) * 2 * flatTop.span;
          if (!flatTop.inside(x * 1.2, z * 1.2)) continue;
          from = new THREE.Vector3(x, flatTop.y - 0.008, z);
          normal = new THREE.Vector3(x * 9, 1, z * 9).normalize();
        } else {
          let phi: number, theta: number;
          if (a.scene === 'neat') {
            const ring = 1 + (i % rings);
            phi = reach * ring / rings * 0.92;
            theta = (Math.floor(i / rings) + ring * 0.37) * Math.PI * 2 / Math.max(3, Math.ceil(count / rings)) + (attempt ? random() : 0);
          } else {
            phi = Math.acos(mix(1, Math.cos(reach), random()));
            theta = random() * Math.PI * 2;
          }
          const d = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
          if (!allow(d)) continue;
          from = centre.clone().add(d.clone().multiply(radii).multiplyScalar(0.86));
          normal = d.clone().divide(radii).normalize();
        }
      }
      if (!from) continue;
      normal.add(new THREE.Vector3(random() - 0.5, (random() - 0.5) * 0.5, random() - 0.5).multiplyScalar(jitter)).normalize();
      stick(from, normal, length + 0.008, color);
    }
    for (const pin of loose) stick(pin.from, pin.direction, pin.length, pin.color);
    instanced(s.root, new THREE.CylinderGeometry(1, 1, 1, 5), steel, shafts);
    instanced(s.root, new THREE.SphereGeometry(1, 10, 8), s.material('#ffffff', { roughness: 0.25, metalness: a.heads === 'steel' ? 0.8 : 0.05 }), heads);

    // A couple of bare needles always live in a pincushion.
    const top = flatTop ? new THREE.Vector3(0.012, flatTop.y - 0.006, 0.004) : centre.clone().add(new THREE.Vector3(0.3, 0.8, 0.25).multiply(radii));
    const needleDir = new THREE.Vector3(0.35, 1, 0.2).normalize();
    instanced(s.root, new THREE.CylinderGeometry(0.4, 1, 1, 5), steel, [
      { matrix: along(top, needleDir, 0.042, 0.0007) },
      { matrix: along(top.clone().add(new THREE.Vector3(-0.012, -0.002, 0.008)), new THREE.Vector3(-0.4, 1, 0.3).normalize(), 0.034, 0.0006) },
    ]);
    const threadTint = ['#c8202b', '#22386e', '#f1ede0', '#1c1b1d', '#c99a2c', '#2f8f6a'][Math.floor(random() * 6)];
    if (a.scene === 'threaded') {
      const eye = top.clone().addScaledVector(needleDir, 0.04);
      const points: [number, number, number][] = [[eye.x, eye.y, eye.z], [eye.x + 0.012, eye.y - 0.012, eye.z + 0.012]];
      let x = centre.x + radii.x * 0.9, z = 0.03, heading = random() * 0.8;
      points.push([x * 0.9, Math.max(0.02, centre.y * 0.8), z * 0.8]);
      for (let i = 0; i < 9; i++) {
        heading += (random() - 0.5) * 2.1;
        x += Math.cos(heading) * 0.016 + 0.004;
        z += Math.sin(heading) * 0.016 + 0.006;
        points.push([x, 0.001, z]);
      }
      s.tube(points, 0.0008, s.material(threadTint, { roughness: 0.9 }));
    }

    if (a.emery) {
      const berryMat = s.material('#c3202b', { roughness: 0.8 });
      const berry = new THREE.Group();
      const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.005, 0.003], [0.01, 0.012], [0.0115, 0.02], [0.008, 0.027], [0, 0.029]].map(([x, y]) => new THREE.Vector2(x, y)), 16), berryMat);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.006, 7), green);
      cap.position.y = 0.029;
      body.castShadow = cap.castShadow = true;
      berry.add(body, cap);
      const seeds: Item[] = [];
      for (let i = 0; i < 18; i++) {
        const t = random() * Math.PI * 2, y = 0.006 + random() * 0.02, r = 0.0055 + Math.min(y, 0.02) * 0.3;
        seeds.push({ matrix: new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)) });
      }
      instanced(berry, new THREE.SphereGeometry(0.0009, 5, 4), s.material('#f3d98a'), seeds);
      const angle = -0.5 + random() * 1.4, far = Math.max(radii.x, 0.047) + 0.03;
      const bx = Math.cos(angle) * far, bz = Math.sin(angle) * far;
      berry.position.set(bx, 0.0115, bz);
      berry.rotation.set(0, Math.PI - angle, -Math.PI / 2 + 0.05);
      s.root.add(berry);
      const stalk: [number, number, number] = flatTop ? [0, 0.03, -0.022] : [centre.x, centre.y + radii.y * (a.shape === 'tomato' ? 0.76 : 0.98), centre.z];
      const capAt = new THREE.Vector3(bx - Math.cos(angle) * 0.031, 0.012, bz - Math.sin(angle) * 0.031);
      s.tube([stalk, [capAt.x * 0.45, stalk[1] + 0.006, capAt.z * 0.45], [capAt.x * 0.85, Math.max(0.02, stalk[1] * 0.55), capAt.z * 0.85], [capAt.x, capAt.y, capAt.z]], 0.0009, green);
    }

    if (a.extra === 'hatpin') {
      const from = centre.clone().add(new THREE.Vector3(-0.2, 0.5, 0.1).multiply(radii));
      const direction = new THREE.Vector3(-0.55, 1, -0.15).normalize();
      instanced(s.root, new THREE.CylinderGeometry(1, 1, 1, 6), steel, [{ matrix: along(from, direction, 0.11, 0.0008) }]);
      const bead = from.clone().addScaledVector(direction, 0.11);
      s.ball([0.006, 0.0075, 0.006], [bead.x, bead.y, bead.z], s.material('#17151b', { roughness: 0.12, metalness: 0.3 }), 14);
      s.ball([0.003, 0.003, 0.003], [bead.x - direction.x * 0.009, bead.y - direction.y * 0.009, bead.z - direction.z * 0.009], s.material('#c79a3e', { metalness: 0.8, roughness: 0.3 }), 8);
    } else if (a.extra === 'safety') {
      const brassy = s.material('#c8b26a', { metalness: 0.8, roughness: 0.35 });
      for (let i = 0; i < 3; i++) {
        const angle = 2.2 + i * 0.7 + random() * 0.3, far = Math.max(radii.x, 0.047) + 0.02 + random() * 0.02;
        const pin = new THREE.Group();
        const loop = new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.0007, 5, 14), brassy);
        loop.rotation.x = Math.PI / 2;
        loop.position.x = -0.017;
        const bars = [0.004, -0.004].map((z) => { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0006, 0.034, 5), brassy); bar.rotation.z = Math.PI / 2; bar.position.z = z; return bar; });
        const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.002, 0.011), brassy);
        clasp.position.x = 0.018;
        pin.add(loop, ...bars, clasp);
        pin.traverse((node) => { node.castShadow = true; });
        pin.position.set(Math.cos(angle) * far, 0.0012, Math.sin(angle) * far);
        pin.rotation.y = random() * Math.PI;
        s.root.add(pin);
      }
    } else if (a.extra === 'thimble') {
      const far = Math.max(radii.x, 0.047) + 0.016;
      s.lathe([[0.0085, 0], [0.009, 0.001], [0.0082, 0.014], [0.0068, 0.02], [0.004, 0.0225], [0, 0.023]], s.material('#c4c8cb', { metalness: 0.9, roughness: 0.32, side: THREE.DoubleSide }), [-far * 0.75, 0, far * 0.62]);
    }

    // Stitch-work follows a small tangent plane on the cushion's forward shoulder.
    const patchGroup = new THREE.Group();
    const direction = new THREE.Vector3(-0.3, 0.65, 0.7).normalize();
    const at = flatTop ? new THREE.Vector3(-0.015, flatTop.y + 0.001, 0.012) : centre.clone().add(direction.clone().multiply(radii).multiplyScalar(a.shape === 'tomato' ? 0.91 : 1.01));
    patchGroup.position.copy(at);
    patchGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), flatTop ? UP : direction.clone().divide(radii).normalize());
    s.root.add(patchGroup);
    const thread = s.material('#eee2c2'), contrast = s.material('#8b5664');
    const bar = (x: number, y: number, w: number, h: number, mat: THREE.Material, z = 0.001) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.0008), mat); m.position.set(x, y, z); m.castShadow = true; patchGroup.add(m); return m;
    };
    if (a.mending === 'patch') {
      bar(0, 0, 0.025, 0.017, contrast);
      for (let k = -2; k <= 2; k++) for (const side of [-1, 1]) bar(k * 0.0045, side * 0.007, 0.001, 0.003, thread, 0.002);
    } else if (a.mending === 'darn') {
      for (let k = -3; k <= 3; k++) {
        bar(k * 0.0025, 0, 0.0011, 0.019, thread);
        bar(0, k * 0.0025, 0.02, 0.001, contrast, 0.0016);
      }
    } else if (a.mending === 'stitches') for (let k = -3; k <= 3; k++) for (const side of [-1, 1]) {
      const m = bar(k * 0.003, side * 0.005, 0.001, 0.005, thread); m.rotation.z = side * 0.4;
    }
    const closeX = 0.018;
    if (a.closure === 'laced') {
      bar(closeX, 0, 0.008, 0.025, contrast);
      for (let k = -2; k <= 2; k++) for (const side of [-1, 1]) { const m = bar(closeX, k * 0.004, 0.001, 0.008, thread, 0.002); m.rotation.z = side * 0.9; }
    } else if (a.closure === 'buttons') {
      bar(closeX, 0, 0.008, 0.027, contrast);
      for (let k = -1; k <= 1; k++) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.001, 10), thread);
        m.rotation.x = Math.PI / 2; m.position.set(closeX, k * 0.008, 0.002); patchGroup.add(m);
      }
    } else if (a.closure === 'zip') {
      bar(closeX, 0, 0.005, 0.028, contrast);
      for (let k = -5; k <= 5; k++) bar(closeX + (k % 2 ? 0.001 : -0.001), k * 0.0023, 0.0025, 0.001, steel, 0.002);
      bar(closeX, -0.014, 0.004, 0.006, steel, 0.002);
    }
    if (!flatTop) {
      patchGroup.updateMatrixWorld(true);
      const basis = patchGroup.quaternion.clone();
      for (const child of patchGroup.children) {
        const mesh = child as THREE.Mesh;
        const originalZ = mesh.position.z;
        const tangentPoint = mesh.position.clone().setZ(0).applyQuaternion(basis).add(patchGroup.position);
        const radial = tangentPoint.clone().sub(centre).divide(radii).normalize();
        let shell = 1;
        if (a.shape === 'tomato') {
          // Read the actual tomato mesh at this direction, including its gathered grooves.
          const body = cushion.children.find(c => c instanceof THREE.Mesh && c.geometry instanceof THREE.SphereGeometry) as THREE.Mesh | undefined;
          if (body) {
            const positions = body.geometry.attributes.position; let best = -Infinity, bestRadius = 1;
            for (let i = 0; i < positions.count; i++) {
              const vertex = new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i));
              const similarity = vertex.clone().normalize().dot(radial);
              if (similarity > best) { best = similarity; bestRadius = vertex.length(); }
            }
            shell = bestRadius;
          }
        }
        const surface = radial.clone().multiply(radii).multiplyScalar(shell).add(centre);
        const normal = radial.clone().divide(radii).normalize();
        const localNormal = normal.clone().applyQuaternion(basis.clone().invert());
        mesh.position.copy(surface.sub(patchGroup.position).applyQuaternion(basis.clone().invert())).addScaledVector(localNormal, originalZ + 0.0005);
        mesh.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), localNormal));
      }
    }
    if (a.identity !== 'none') {
      const x = -Math.max(radii.x, 0.05) - 0.022, z = 0.045;
      const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 96;
      const c = canvas.getContext('2d')!; c.fillStyle = '#eee2c2'; c.fillRect(0, 0, 192, 96);
      c.strokeStyle = '#8b5664'; c.lineWidth = 4; c.strokeRect(5, 5, 182, 86); c.fillStyle = '#493b3d'; c.font = 'bold 32px serif'; c.textAlign = 'center';
      c.fillText(a.identity === 'name' ? 'A. SEW' : a.identity === 'class' ? 'CLASS 07' : 'FOR YOU', 96, 57);
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      const tag = s.box([0.04, 0.001, 0.023], [x, 0.0005, z], s.material('#ffffff', { map: tex }));
      if (a.identity === 'gift') { tag.rotation.y = 0.35; s.ring(0.005, 0.001, [x + 0.02, 0.001, z], contrast).rotation.x = -Math.PI / 2; }
      s.tube([[centre.x - radii.x * 0.7, centre.y, 0.02], [x + 0.03, 0.007, z - 0.015], [x + 0.017, 0.002, z]], 0.0007, thread);
    }
    if (a.threadKit !== 'none') {
      const x = Math.max(radii.x, 0.05) + 0.035, z = -0.055;
      const wood = s.material('#b89567'), floss = s.material(threadTint);
      if (a.threadKit === 'spool') {
        for (const y of [0.002, 0.026]) s.cylinder(0.012, 0.012, 0.004, [x, y, z], wood, 20);
        s.cylinder(0.0095, 0.0095, 0.022, [x, 0.014, z], floss, 20);
        s.tube([[x + 0.009, 0.012, z], [x + 0.022, 0.001, z + 0.014], [x + 0.04, 0.001, z + 0.02]], 0.0007, floss);
      } else if (a.threadKit === 'bobbins') for (let i = 0; i < 3; i++) {
        for (const y of [0.001, 0.008]) s.cylinder(0.01, 0.01, 0.002, [x, y, z + i * 0.025], steel, 18);
        s.cylinder(0.008, 0.008, 0.006, [x, 0.0045, z + i * 0.025], floss, 18);
      } else for (let i = 0; i < 2; i++) {
        s.box([0.024, 0.0015, 0.04], [x + i * 0.028, 0.00075, z], thread);
        s.box([0.025, 0.003, 0.024], [x + i * 0.028, 0.002, z], floss);
      }
    }

    // Sawdust leaking from a worn seam.
    if (mood.wear > 0.6) {
      const dust: Item[] = [];
      for (let i = 0; i < Math.floor((mood.wear - 0.55) * 120); i++) {
        const t = 3.6 + random() * 0.9, far = Math.max(radii.x, 0.04) * (0.95 + random() * 0.45);
        dust.push({ matrix: new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(t) * far, 0.0008, Math.sin(t) * far), new THREE.Quaternion(), new THREE.Vector3(1, 0.5, 1).multiplyScalar(0.6 + random())) });
      }
      instanced(s.root, new THREE.SphereGeometry(0.0013, 5, 4), s.material('#c9a877', { roughness: 1 }), dust);
    }

    if (a.shape === 'hedgehog') s.root.rotation.y = -0.6 - random() * 0.4;
    if (a.foundation !== 'bare') {
      // Reparent the complete working kit, preserving its chosen shape, before raising it.
      const contents = new THREE.Group(); contents.rotation.copy(s.root.rotation); contents.scale.copy(s.root.scale);
      for (const child of [...s.root.children]) contents.add(child);
      s.root.rotation.set(0, 0, 0); s.root.scale.set(1, 1, 1); s.root.add(contents);
      s.root.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(contents), size = bounds.getSize(new THREE.Vector3()), mid = bounds.getCenter(new THREE.Vector3());
      const h = a.foundation === 'doily' ? 0.001 : 0.006;
      contents.position.y = h - bounds.min.y;
      const baseMat = s.material(a.foundation === 'wood' ? '#b89567' : a.foundation === 'tray' ? '#d3dfd9' : '#eee2c2');
      if (a.foundation === 'doily') {
        const R = Math.max(size.x, size.z) * 0.6 + 0.015;
        s.cylinder(R, R, h, [mid.x, h / 2, mid.z], baseMat, 48);
        for (let i = 0; i < 30; i++) {
          const t = i / 30 * Math.PI * 2;
          s.ring(0.005, 0.0008, [mid.x + Math.cos(t) * R, h, mid.z + Math.sin(t) * R], baseMat).rotation.x = -Math.PI / 2;
        }
      } else {
        const w = size.x + 0.03, d = size.z + 0.03;
        s.box([w, h, d], [mid.x, h / 2, mid.z], baseMat);
        for (const side of [-1, 1]) {
          s.box([w, 0.005, 0.003], [mid.x, h + 0.0025, mid.z + side * (d - 0.003) / 2], baseMat);
          s.box([0.003, 0.005, d], [mid.x + side * (w - 0.003) / 2, h + 0.0025, mid.z], baseMat);
        }
      }
    }
    return s.finish();
  },
});
