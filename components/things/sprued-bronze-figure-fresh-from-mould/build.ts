import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { chain, hook } from './chain';

type P3 = [number, number, number];

/** Raw bronze: one coherent metal colour from fire-scaled brown-black to new gold-pink, softly mottled, with grit. */
function bronzeTexture(random: () => number, fresh: number, wear: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  const old = new THREE.Color('#4b3424'), mid = new THREE.Color('#a8743c'), bright = new THREE.Color('#dca468');
  const base = fresh < 0.5 ? old.clone().lerp(mid, fresh * 2) : mid.clone().lerp(bright, (fresh - 0.5) * 2);
  c.fillStyle = `#${base.getHexString()}`;
  c.fillRect(0, 0, 256, 256);
  // Soft mottles: darker oxide where the shell clung longest, brighter where it came off clean.
  for (let i = 0; i < 70; i++) {
    const x = random() * 256, y = random() * 256, r = 12 + random() * 40;
    const dark = random() < mix(0.75, 0.35, fresh);
    const tone = dark ? base.clone().lerp(new THREE.Color('#1f150f'), 0.35 + random() * 0.3) : base.clone().lerp(new THREE.Color('#f0c58a'), 0.25 + random() * 0.3);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${Math.round(tone.r * 255)},${Math.round(tone.g * 255)},${Math.round(tone.b * 255)},0.55)`);
    g.addColorStop(1, `rgba(${Math.round(tone.r * 255)},${Math.round(tone.g * 255)},${Math.round(tone.b * 255)},0)`);
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // A hint of green bloom on old metal.
  if (fresh < 0.3) for (let i = 0; i < 12; i++) {
    c.fillStyle = `rgba(90,120,90,${0.12 + random() * 0.15})`;
    c.beginPath();
    c.ellipse(random() * 256, random() * 256, 6 + random() * 18, 4 + random() * 10, random() * 3, 0, 7);
    c.fill();
  }
  // Fire scale and ceramic grit.
  for (let i = 0; i < 900 + wear * 900; i++) {
    const dust = random() < 0.3;
    const g = dust ? 200 + random() * 40 : 25 + random() * 35;
    c.fillStyle = `rgba(${g},${g - 6},${g - 14},${0.15 + random() * 0.3})`;
    c.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1 + random() * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The investment that still clings: chalk white, gritty, cracked and browned by the pour. */
function shellTexture(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#e9e3d6';
  c.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 700; i++) {
    const g = 140 + random() * 100;
    c.fillStyle = `rgba(${g},${g - 8},${g - 18},${0.25 + random() * 0.4})`;
    c.fillRect(random() * 128, random() * 128, 1 + random() * 2, 1 + random() * 2);
  }
  for (let i = 0; i < 8; i++) {
    c.fillStyle = `rgba(110,85,60,${0.1 + random() * 0.18})`;
    c.beginPath();
    c.ellipse(random() * 128, random() * 128, 6 + random() * 20, 4 + random() * 12, random() * 3, 0, 7);
    c.fill();
  }
  c.strokeStyle = 'rgba(50,40,32,0.75)';
  for (let i = 0; i < 6; i++) {
    c.lineWidth = 0.7 + random();
    c.beginPath();
    let x = random() * 128, y = random() * 128;
    c.moveTo(x, y);
    for (let step = 0; step < 5; step++) { x += (random() - 0.5) * 30; y += (random() - 0.5) * 30; c.lineTo(x, y); }
    c.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    subject: choice('What has been cast?', {
      saint: 'A hooded saint in a long robe, one hand raised in blessing, a halo disc behind the head, a book in the other hand.',
      athlete: 'A discus thrower mid-turn, one arm flung back with the discus, the other reaching forward.',
      horse: 'A horse standing square, neck arched, tail out.',
      hand: 'A giant open hand rising from a wrist, fingers spread.',
      bust: 'A portrait bust: head, neck and shoulders on a round socle.',
    }),
    size: score('How big is the casting?', ['A tabletop statuette', 'Half life size', 'Life size', 'Monumental, taller than a person']),
    shell: score('How much ceramic shell still clings to it?', ['Nearly all knocked off, white dust in the creases', 'The lower half still encased in white shell', 'Still mostly encased, only the top showing bronze']),
    sprue: score('How much of the sprue tree is still on?', ['Cut back to little stubs', 'The main sprue, the cup and a few gates', 'The full cage of runners, gates and vents']),
    metal: score('What does the exposed metal look like?', ['Dull oxidised brown-black with fire scale', 'Warm brown bronze, patchy', 'Bright new gold-pink bronze']),
    work: choice('What is being done to it right now?', {
      resting: 'Nothing yet: just broken out and left standing, dust settling.',
      cutting: 'The sprues are being cut off: an angle grinder bites into a gate, throwing a fan of orange sparks.',
      chipping: 'The last shell is being chipped off: a pneumatic chisel leans against it, a fresh heap of white shards at its feet.',
      hosing: 'It has been hosed down: dark wet metal, a puddle spreading, a green hose snaking away.',
    }),
    support: choice('What holds it?', {
      cradle: 'A welded steel box cradle, the casting strapped inside it, a slack lifting chain draped over the rail.',
      hoist: 'A yellow A-frame gantry with a chain hoist, the sling chains gone slack now it has been set down.',
      pallet: 'A wooden pallet with timber wedges chocked under it.',
      floor: 'Nothing: it stands on the bare floor amid its own shell fragments.',
    }),
    tools: noul('Are a hammer, a chisel and a wire brush left on the floor beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(0.5, 2.6, a.size);
    const wet = a.work === 'hosing';
    const bronze = new THREE.MeshStandardMaterial({ map: bronzeTexture(random, a.metal * (wet ? 0.75 : 1), mood.wear), metalness: mix(0.35, 0.8, a.metal), roughness: wet ? 0.18 : mix(0.75, 0.35, a.metal) });
    const shellTex = shellTexture(random);
    const shellMat = new THREE.MeshStandardMaterial({ map: shellTex, color: wet ? '#c9c2b4' : '#ffffff', roughness: wet ? 0.45 : 0.97 });
    const steel = s.material('#4f5256', { metalness: 0.7, roughness: 0.5 });
    const yellow = s.material(mood.wear > 0.6 ? '#b89a2a' : '#e0b52a', { roughness: 0.6 });
    const chainMat = s.material('#3b3d41', { metalness: 0.75, roughness: 0.45 });

    // ---- The casting, built upright in its own group at unit scale × H.
    const statue = new THREE.Group();
    const anchors: P3[] = [];
    const add = (mesh: THREE.Mesh, parent: THREE.Object3D = statue) => {
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const part = (geometry: THREE.BufferGeometry, at: P3, rotation: P3 = [0, 0, 0], scale: P3 = [1, 1, 1]) => {
      const mesh = add(new THREE.Mesh(geometry, bronze));
      mesh.position.set(at[0] * H, at[1] * H, at[2] * H);
      mesh.rotation.set(...rotation);
      mesh.scale.set(scale[0] * H, scale[1] * H, scale[2] * H);
      return mesh;
    };
    const sphere = (r: number) => new THREE.SphereGeometry(r, 20, 14);
    const capsule = (r: number, length: number) => new THREE.CapsuleGeometry(r, length, 5, 14);
    const anchorAt = (object: THREE.Object3D, dy = 0) => {
      statue.updateMatrixWorld(true);
      const p = object.getWorldPosition(new THREE.Vector3());
      anchors.push([p.x, p.y + dy, p.z]);
    };
    const anchor = (x: number, y: number, z: number) => anchors.push([x * H, y * H, z * H]);
    /** A person cast in bronze: the kit's figure with every surface turned to metal. */
    const bronzeFigure = (height: number, hair: 'hood' | 'short', pose: 'standing' | 'walking') => {
      const person = figure(s, { height, build: 'average', pose, style: 'mannequin', hair, face: 'blank', sleeves: 'long' });
      person.root.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        (mesh.material as THREE.Material).dispose();
        mesh.material = bronze;
      });
      return person;
    };
    // The cast base plate every statue stands on.
    const plate = H * 0.05;
    if (a.subject === 'saint') {
      part(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 24), [0, 0.025, 0]);
      const person = bronzeFigure(H * 0.9, 'hood', 'standing');
      const { joints } = person;
      joints.shoulders.right.rotation.set(-2.3, 0, -0.15);
      joints.elbows.right.rotation.set(-0.7, 0, 0);
      joints.shoulders.left.rotation.set(-0.7, 0, 0.1);
      joints.elbows.left.rotation.set(-1.3, -0.3, 0);
      joints.neck.rotation.x = 0.12;
      person.settle();
      person.root.position.y = plate;
      statue.add(person.root);
      // The robe falls from the waist to the base, and a halo stands behind the head.
      const hip = person.hipHeight;
      part(new THREE.CylinderGeometry(0.075, 0.17, (hip + plate * 0.5) / H, 20), [0, (plate + hip * 0.55) / H, 0]);
      const headR = H * 0.9 * 0.064;
      const halo = add(new THREE.Mesh(new THREE.CylinderGeometry(headR * 2.1, headR * 2.1, headR * 0.18, 28), bronze), person.head);
      halo.rotation.x = Math.PI / 2;
      halo.position.set(0, headR * 0.3, -headR * 1.3);
      const book = add(new THREE.Mesh(new THREE.BoxGeometry(headR * 1.4, headR * 0.35, headR * 1.8), bronze), person.hands.left);
      book.position.y = -headR * 0.2;
      anchorAt(person.head, headR * 1.2); anchorAt(person.hands.right); anchorAt(person.hands.left);
      anchor(0.15, 0.12, 0.02); anchor(-0.15, 0.12, -0.02); anchor(0, 0.55, -0.1);
    } else if (a.subject === 'athlete') {
      part(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 24), [0, 0.025, 0]);
      const person = bronzeFigure(H * 0.95, 'short', 'walking');
      const { joints } = person;
      joints.hips.left.rotation.set(-0.45, 0, 0.12);
      joints.hips.right.rotation.set(0.35, 0, -0.1);
      joints.knees.right.rotation.x = 0.45;
      joints.knees.left.rotation.x = 0.15;
      joints.ankles.left.rotation.x = -(joints.knees.left.rotation.x + joints.hips.left.rotation.x);
      joints.ankles.right.rotation.x = -(joints.knees.right.rotation.x + joints.hips.right.rotation.x);
      joints.shoulders.right.rotation.set(0.7, 0, -1.25);
      joints.elbows.right.rotation.set(-0.2, 0, 0);
      joints.shoulders.left.rotation.set(-1.5, 0, 0.35);
      joints.elbows.left.rotation.set(-0.3, 0, 0);
      joints.spine.rotation.set(0.12, -0.45, 0);
      joints.neck.rotation.set(0, 0.5, 0);
      person.settle();
      person.root.position.y = plate;
      statue.add(person.root);
      const headR = H * 0.95 * 0.064;
      const discus = add(new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.1, headR * 1.1, headR * 0.3, 20), bronze), person.hands.right);
      discus.position.y = -headR * 0.6;
      discus.rotation.z = Math.PI / 2;
      anchorAt(person.head, headR * 1.1); anchorAt(person.hands.right); anchorAt(person.hands.left);
      anchorAt(joints.ankles.left); anchorAt(joints.ankles.right); anchorAt(joints.spine, H * 0.12);
    } else if (a.subject === 'horse') {
      part(new THREE.BoxGeometry(0.85, 0.05, 0.3), [0, 0.025, 0]);
      part(capsule(0.15, 0.42), [0, 0.6, 0], [0, 0, Math.PI / 2], [1, 1, 0.85]);
      part(capsule(0.085, 0.32), [0.3, 0.83, 0], [0, 0, -0.6]);
      part(capsule(0.065, 0.2), [0.47, 0.95, 0], [0, 0, -2.0]);
      part(new THREE.BoxGeometry(0.03, 0.28, 0.025), [0.29, 0.92, 0], [0, 0, -0.6]);
      for (const ear of [-0.025, 0.025]) part(new THREE.ConeGeometry(0.018, 0.06, 6), [0.42, 1.09, ear], [0, 0, 0.3]);
      for (const [x, z, swing] of [[0.25, 0.07, -0.05], [0.25, -0.07, 0.08], [-0.24, 0.07, 0.06], [-0.24, -0.07, -0.04]]) {
        part(capsule(0.04, 0.42), [x, 0.29, z], [0, 0, swing]);
        part(new THREE.CylinderGeometry(0.035, 0.045, 0.05, 10), [x + swing * 0.25, 0.075, z]);
      }
      part(capsule(0.03, 0.3), [-0.42, 0.52, 0], [0, 0, 0.5]);
      anchor(0.5, 1.06, 0); anchor(-0.5, 0.42, 0); anchor(0, 0.78, 0); anchor(0.25, 0.08, 0.07); anchor(-0.24, 0.08, -0.07); anchor(0.3, 0.68, 0.08);
    } else if (a.subject === 'hand') {
      part(new THREE.CylinderGeometry(0.17, 0.19, 0.06, 20), [0, 0.03, 0]);
      part(capsule(0.1, 0.3), [0, 0.28, 0], [0.05, 0, 0]);
      part(new THREE.BoxGeometry(0.34, 0.34, 0.12, 4, 4, 2), [0, 0.6, 0.02]);
      for (const [sx, sz] of [[-1, 0], [1, 0]]) part(sphere(0.07), [sx * 0.11, 0.48, 0.02 + sz], [0, 0, 0], [1, 1.4, 0.9]);
      const lengths = [0.26, 0.32, 0.3, 0.24];
      for (let i = 0; i < 4; i++) {
        const lean = (i - 1.5) * -0.12;
        const length = lengths[i];
        part(capsule(0.042, length), [-0.13 + i * 0.087 - Math.sin(lean) * length * 0.5, 0.77 + Math.cos(lean) * length * 0.5, 0.02], [0, 0, lean]);
      }
      part(capsule(0.048, 0.2), [0.24, 0.6, 0.06], [0.2, 0, -1.0]);
      anchor(-0.04, 1.1, 0.02); anchor(0.12, 1.06, 0.02); anchor(0.33, 0.7, 0.08); anchor(-0.2, 0.45, 0); anchor(0, 0.06, 0.1); anchor(0.18, 0.3, -0.04);
    } else {
      part(new THREE.CylinderGeometry(0.14, 0.18, 0.2, 24), [0, 0.1, 0]);
      part(new THREE.CylinderGeometry(0.1, 0.16, 0.05, 24), [0, 0.225, 0]);
      part(sphere(0.26), [0, 0.38, 0], [0, 0, 0], [1.2, 0.55, 0.65]);
      part(capsule(0.075, 0.1), [0, 0.56, 0.01]);
      part(sphere(0.15), [0, 0.76, 0.02], [0, 0, 0], [0.88, 1.12, 1]);
      part(new THREE.ConeGeometry(0.025, 0.07, 8), [0, 0.75, 0.17], [Math.PI / 2, 0, 0]);
      for (const side of [-1, 1]) part(sphere(0.035), [side * 0.135, 0.76, 0.0], [0, 0, 0], [0.5, 1, 0.8]);
      anchor(0, 0.95, 0.02); anchor(0.3, 0.4, 0); anchor(-0.3, 0.4, 0); anchor(0, 0.06, 0.15); anchor(0.12, 0.66, -0.08);
    }
    statue.updateMatrixWorld(true);
    const figureBox = new THREE.Box3().setFromObject(statue);
    const top = figureBox.max.y;

    // ---- The sprue tree: a main sprue up one side to the pour cup, gates across to the figure, vents above.
    const side = random() < 0.5 ? -1 : 1;
    const sx = side > 0 ? figureBox.max.x + 0.07 * H : figureBox.min.x - 0.07 * H, sz = (figureBox.min.z + figureBox.max.z) / 2;
    const rod = (from: THREE.Vector3, to: THREE.Vector3, radius: number) => {
      const dir = to.clone().sub(from);
      const mesh = add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.1, Math.max(dir.length(), 0.001), 8), bronze));
      mesh.position.copy(from).lerp(to, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      return mesh;
    };
    const stubs = a.sprue < 0.3;
    const cupY = top + 0.12 * H;
    if (!stubs) {
      rod(new THREE.Vector3(sx, 0.02 * H, sz), new THREE.Vector3(sx, cupY, sz), 0.024 * H);
      // A crossbar over the head to the cup, so the tree reads as one cage.
      const cupX = (figureBox.min.x + figureBox.max.x) / 2;
      rod(new THREE.Vector3(sx, cupY, sz), new THREE.Vector3(cupX, cupY, sz), 0.022 * H);
      const cup = add(new THREE.Mesh(new THREE.LatheGeometry([[0.015, 0], [0.03, 0], [0.085, 0.09], [0.095, 0.11], [0.08, 0.11], [0.03, 0.02]].map(([x, y]) => new THREE.Vector2(x * H, y * H)), 20), bronze));
      cup.position.set(cupX, cupY - 0.01 * H, sz);
      rod(new THREE.Vector3(cupX, top - 0.03 * H, sz), new THREE.Vector3(cupX, cupY, sz), 0.022 * H);
      // A dark crust of metal in the cup.
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.075 * H, 0.075 * H, 0.006 * H, 18), s.material('#2b211b', { roughness: 0.9 }))).position.set(cupX, cupY + 0.085 * H, sz);
    }
    const gateCount = Math.max(2, Math.round(mix(2, anchors.length, a.sprue)));
    const order = anchors.map((p, i) => ({ p, key: random() + i * 0.02 })).sort((p, q) => p.key - q.key).map((entry) => entry.p);
    const stubEnds: THREE.Vector3[] = [];
    order.slice(0, gateCount).forEach(([ax, ay, az], i) => {
      const from = new THREE.Vector3(ax, ay, az);
      if (stubs) {
        // Sawn-off stubs pointing out from the surface.
        const out = new THREE.Vector3(ax - (figureBox.min.x + figureBox.max.x) / 2, 0.3 * H, az - sz).normalize().multiplyScalar(0.06 * H);
        rod(from, from.clone().add(out), 0.02 * H);
        stubEnds.push(from.clone().add(out));
        return;
      }
      const to = new THREE.Vector3(sx, THREE.MathUtils.clamp(ay + (random() - 0.4) * 0.08 * H, 0.05 * H, cupY - 0.03 * H), sz);
      rod(from, to, 0.015 * H);
      if (a.sprue > 0.6 && i % 2 === 0) rod(from, from.clone().add(new THREE.Vector3(-side * 0.02 * H, 0.16 * H, 0)), 0.01 * H);
    });

    statue.updateMatrixWorld(true);
    const turned = new THREE.Box3().setFromObject(statue);
    const castHeight = turned.max.y - turned.min.y;

    // ---- What is left of the shell: the lower parts still encased, a crust slightly proud of the metal.
    const level = a.shell < 0.08 ? -1 : mix(0.1, 0.92, a.shell);
    const bodies: THREE.Mesh[] = [];
    statue.traverse((node) => { const mesh = node as THREE.Mesh; if (mesh.isMesh && mesh.material === bronze) bodies.push(mesh); });
    const thickness = 0.016 * H;
    const box = new THREE.Box3(), size = new THREE.Vector3(), centre = new THREE.Vector3();
    for (const mesh of bodies) {
      if (mesh.geometry.type === 'LatheGeometry') continue;
      box.setFromObject(mesh);
      box.getCenter(centre);
      const at = (centre.y - turned.min.y) / castHeight + (random() - 0.5) * 0.12;
      if (at > level) continue;
      mesh.geometry.computeBoundingBox();
      mesh.geometry.boundingBox!.getSize(size).multiply(mesh.scale);
      // Thicken each local axis by the same crust, but never more than half again, so thin rods and discs stay thin.
      const grow = (extent: number) => 1 + Math.min(0.5, thickness / Math.max(extent / 2, 0.001));
      const crust = new THREE.Mesh(mesh.geometry, shellMat);
      crust.position.copy(mesh.position);
      crust.quaternion.copy(mesh.quaternion);
      crust.scale.set(mesh.scale.x * grow(size.x), mesh.scale.y * grow(size.y), mesh.scale.z * grow(size.z));
      crust.castShadow = crust.receiveShadow = true;
      mesh.parent!.add(crust);
    }
    // Flakes still stuck to the bare metal above the line.
    statue.updateMatrixWorld(true);
    const flakeCount = Math.round(mix(14, 50, a.shell));
    const flakes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), shellMat, flakeCount);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    const pos = new THREE.Vector3(), nor = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
    const toStatue = statue.matrixWorld.clone().invert();
    const surfaces = bodies.filter((mesh) => mesh.geometry.attributes.position.count > 40);
    for (let i = 0; i < flakeCount; i++) {
      const mesh = surfaces[Math.floor(random() * surfaces.length)];
      const position = mesh.geometry.attributes.position as THREE.BufferAttribute;
      const normal = mesh.geometry.attributes.normal as THREE.BufferAttribute;
      const index = Math.floor(random() * position.count);
      pos.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
      nor.fromBufferAttribute(normal, index).applyMatrix3(normalMatrix.getNormalMatrix(mesh.matrixWorld)).normalize();
      q.setFromUnitVectors(up, nor);
      const r = H * (0.012 + random() * 0.022);
      m.compose(pos, q, new THREE.Vector3(r, r * 0.35, r)).premultiply(toStatue);
      flakes.setMatrixAt(i, m);
    }
    flakes.instanceMatrix.needsUpdate = true;
    flakes.castShadow = flakes.receiveShadow = true;
    statue.add(flakes);
    s.root.add(statue);

    // ---- Stand it on its support.
    const supportTop = { cradle: 0.06, hoist: 0, pallet: 0.15, floor: 0 }[a.support];
    statue.updateMatrixWorld(true);
    turned.setFromObject(statue);
    statue.position.set(-(turned.min.x + turned.max.x) / 2, supportTop - turned.min.y, -(turned.min.z + turned.max.z) / 2);
    statue.updateMatrixWorld(true);
    turned.setFromObject(statue);
    const W = Math.max(0.5, turned.max.x - turned.min.x + 0.25 * H), D = Math.max(0.45, turned.max.z - turned.min.z + 0.25 * H), T = turned.max.y;

    let swing: THREE.Group | null = null;
    if (a.support === 'cradle') {
      const rail = 0.05 + 0.01 * H, h = Math.min(T * 0.72, T - 0.1);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) s.box([rail, h, rail], [dx * W / 2, h / 2, dz * D / 2], steel);
      for (const y of [rail / 2, h - rail / 2]) {
        for (const dz of [-1, 1]) s.box([W + rail, rail, rail], [0, y, dz * D / 2], steel);
        for (const dx of [-1, 1]) s.box([rail, rail, D + rail], [dx * W / 2, y, 0], steel);
      }
      for (const dx of [-1, 1]) s.rod([dx * W / 2, rail, -D / 2], [dx * W / 2, h - rail, D / 2], rail * 0.35, steel);
      s.box([W - 0.04, 0.04, D - 0.04], [0, supportTop - 0.02, 0], steel);
      for (const dz of [-1, 1]) s.box([W + rail, 0.05, 0.012], [0, h * 0.6, dz * (D / 2 + 0.012)], yellow);
      const cx = -side * W / 2, cz = D / 2;
      chain(s, [[cx, h + 0.02, cz - D * 0.6], [cx, h + 0.05, cz - D * 0.2], [cx, h + 0.02, cz], [cx + side * 0.04, h * 0.55, cz + 0.12], [cx + side * 0.08, 0.03, cz + 0.28], [cx + side * 0.3, 0.025, cz + 0.36], [cx + side * 0.42, 0.03, cz + 0.2]], 0.045 + 0.012 * H, chainMat);
      hook(s, [cx + side * 0.5, 0.25, cz + 0.12], 0.22 + 0.04 * H, chainMat).rotation.z = Math.PI / 2;
    } else if (a.support === 'hoist') {
      // A portable A-frame gantry over the casting, its hoist hook lowered and the sling slack.
      const span = W + 0.5, G = T + 0.55 + 0.12 * H, splay = Math.max(0.5, D * 0.7);
      for (const dx of [-1, 1]) {
        const x = dx * span / 2;
        s.rod([x, 0, -splay], [x, G, 0], 0.045, yellow);
        s.rod([x, 0, splay], [x, G, 0], 0.045, yellow);
        s.box([0.08, 0.06, splay * 2 + 0.1], [x, 0.03, 0], yellow);
        s.rod([x, G * 0.35, -splay * 0.65], [x, G * 0.35, splay * 0.65], 0.025, yellow);
        for (const dz of [-1, 1]) s.cylinder(0.04, 0.04, 0.03, [x, 0.03, dz * splay], s.material('#1f1f22'), 10).rotation.x = Math.PI / 2;
      }
      s.box([span + 0.25, 0.03, 0.14], [0, G + 0.075, 0], steel);
      s.box([span + 0.25, 0.12, 0.025], [0, G, 0], steel);
      s.box([span + 0.25, 0.03, 0.14], [0, G - 0.075, 0], steel);
      // The hoist itself hangs from a trolley on the beam's lower flange.
      swing = new THREE.Group();
      swing.position.set(0, G - 0.09, 0);
      s.root.add(swing);
      const put = (mesh: THREE.Mesh, at: P3) => { mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; swing!.add(mesh); return mesh; };
      put(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.18), steel), [0, -0.03, 0]);
      put(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.16), yellow), [0, -0.22, 0]);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 18), yellow), [0, -0.2, 0.1]).rotation.x = Math.PI / 2;
      const hookTop = T + 0.2;
      chain(s, [[0, G - 0.44, 0], [0, (G - 0.44 + hookTop) / 2, 0], [0, hookTop, 0]], 0.05, chainMat, swing).position.y = -(G - 0.09);
      // The hand chain loop down one side.
      const hx = side * 0.13;
      chain(s, [[hx, G - 0.3, 0.09], [hx + 0.02, G * 0.5, 0.11], [hx, G * 0.32, 0.1], [hx - 0.02, G * 0.5, 0.07], [hx, G - 0.3, 0.05]], 0.04, chainMat, swing).position.y = -(G - 0.09);
      const hookGroup = hook(s, [0, hookTop - (G - 0.09), 0], 0.2 + 0.04 * H, chainMat, swing);
      void hookGroup;
      // Two sling legs from the hook down to the casting, sagging now there is no weight on them.
      const ring = hookTop - 0.2;
      for (const dx of [-1, 1]) {
        const ex = dx * Math.min(0.2 * H, W * 0.3), ey = T - 0.1 * H;
        chain(s, [[0.03 * dx, ring, 0.02], [ex * 0.7, ring - 0.12, 0.12 + 0.05 * H], [ex, ey, 0.06 * H]], 0.04, chainMat);
      }
    } else if (a.support === 'pallet') {
      const wood = s.material('#a8885a', { roughness: 0.9 });
      const pw = Math.max(W, 0.8), pd = Math.max(D, 0.6);
      for (let i = 0; i < 5; i++) s.box([pw, 0.02, pd / 6], [0, 0.14, (i - 2) * pd / 4.6], wood);
      for (const dx of [-1, 0, 1]) s.box([0.1, 0.09, pd], [dx * (pw / 2 - 0.06), 0.085, 0], wood);
      s.box([pw, 0.02, pd], [0, 0.03, 0], wood);
      for (const [dx, dz] of [[-0.3, 0.35], [0.35, -0.3]]) s.box([0.12, 0.07, 0.08], [dx * W, supportTop + 0.035, dz * D], wood).rotation.y = random();
    }

    // ---- Shell shards on the floor, more the more has been knocked off.
    // Curved chips of shell: flat angular plates lying every which way, a heap where it is being chipped.
    const shards = Math.round(mix(60, 18, a.shell) * mix(0.7, 1.3, H / 2) + (a.work === 'chipping' ? 50 : 0));
    const chips = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.22, 0.7), shellMat, shards);
    const heapAngle = random() * Math.PI * 2;
    for (let i = 0; i < shards; i++) {
      const heaped = a.work === 'chipping' && i < 50;
      const angle = heaped ? heapAngle + (random() - 0.5) * 0.8 : random() * Math.PI * 2;
      const r = (W / 2 + 0.05) + random() * (heaped ? 0.25 : 0.5) * Math.sqrt(H);
      const chip = 0.025 + random() * 0.05 * Math.sqrt(H);
      q.setFromEuler(new THREE.Euler((random() - 0.5) * 0.8, random() * Math.PI, (random() - 0.5) * 0.8));
      m.compose(new THREE.Vector3(Math.cos(angle) * r, chip * 0.15 + (heaped ? random() * 0.05 : 0), Math.sin(angle) * r), q, new THREE.Vector3(chip, chip, chip));
      chips.setMatrixAt(i, m);
    }
    for (let i = 0; i < shards; i++) chips.setColorAt(i, new THREE.Color('#f2eee6').lerp(new THREE.Color('#7d6a58'), random() < 0.35 ? 0.4 + random() * 0.4 : random() * 0.15));
    chips.instanceMatrix.needsUpdate = true;
    if (chips.instanceColor) chips.instanceColor.needsUpdate = true;
    chips.castShadow = chips.receiveShadow = true;
    s.root.add(chips);

    // ---- Whatever is being done to it.
    const sparks: THREE.Mesh[] = [];
    if (a.work === 'cutting') {
      // A grinder biting into the main sprue (or a stub) at chest height, sparks fanning out toward the front.
      const target = stubs ? stubEnds[0].clone() : new THREE.Vector3(sx, Math.min(cupY * 0.55, 1.3), sz + 0.024 * H);
      target.add(statue.position);
      const gx = target.x, gy = target.y, gz = target.z + 0.02;
      const grinder = new THREE.Group();
      grinder.position.set(gx, gy, gz);
      grinder.rotation.set(0.3, side * 0.4, 0);
      s.root.add(grinder);
      const bodyMat = s.material('#2f5f9e', { roughness: 0.5 });
      const piece = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3, rotation: P3 = [0, 0, 0]) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...at); mesh.rotation.set(...rotation);
        mesh.castShadow = mesh.receiveShadow = true;
        grinder.add(mesh);
        return mesh;
      };
      piece(new THREE.CylinderGeometry(0.06, 0.07, 0.022, 20), s.material('#6d6f72', { metalness: 0.5 }), [0, 0, 0.03], [Math.PI / 2, 0, 0]);
      piece(new THREE.CylinderGeometry(0.035, 0.04, 0.3, 12), bodyMat, [side * 0.17, 0, 0.08], [0, 0, Math.PI / 2]);
      piece(new THREE.BoxGeometry(0.08, 0.07, 0.08), s.material('#2a2b2e'), [0, 0, 0.08]);
      piece(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 8), s.material('#2a2b2e'), [0, 0.09, 0.08]);
      // The cable to the floor.
      s.tube([[gx + side * 0.32, gy, gz + 0.1], [gx + side * 0.5, gy * 0.4, gz + 0.3], [gx + side * 0.7, 0.02, gz + 0.6], [gx + side * 1.1, 0.02, gz + 0.5]], 0.01, s.material('#1f1f22'));
      const spark = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9, depthWrite: false });
      const sparkGeometry = new THREE.BoxGeometry(0.006, 0.006, 1);
      for (let i = 0; i < 26; i++) {
        const length = 0.08 + random() * 0.3;
        const mesh = new THREE.Mesh(sparkGeometry, spark);
        const yaw = -side * (0.2 + random() * 0.9), pitch = -0.1 - random() * 0.7;
        const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
        const start = 0.07 + random() * 0.25;
        mesh.position.set(gx, gy, gz + 0.03).addScaledVector(dir, start + length / 2);
        mesh.scale.z = length;
        mesh.lookAt(mesh.position.clone().add(dir));
        mesh.castShadow = false;
        s.root.add(mesh);
        sparks.push(mesh);
      }
    } else if (a.work === 'chipping') {
      // A pneumatic chisel: leaning on a big casting, dropped on the floor beside a small one.
      const dir = new THREE.Vector3(Math.cos(heapAngle), 0, Math.sin(heapAngle));
      const length = 0.5, edge = W / 2 + 0.05;
      const standing = H > 0.9;
      const top = standing ? dir.clone().multiplyScalar(edge).setY(length * 0.92) : dir.clone().multiplyScalar(edge + 0.12).setY(0.04);
      const foot = standing ? dir.clone().multiplyScalar(edge + length * 0.4).setY(0.02) : dir.clone().multiplyScalar(edge + 0.12).add(new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(length)).setY(0.04);
      const handleEnd = top.clone().addScaledVector(top.clone().sub(foot).normalize(), 0.12);
      const bitEnd = foot.clone().addScaledVector(foot.clone().sub(top).normalize(), 0.1);
      s.rod(foot.toArray() as P3, top.toArray() as P3, 0.035, s.material('#3a3c40', { metalness: 0.6 }));
      s.rod(top.toArray() as P3, handleEnd.toArray() as P3, 0.022, s.material('#1f1f22'));
      s.rod(foot.toArray() as P3, bitEnd.toArray() as P3, 0.008, s.material('#bfc2c6', { metalness: 0.7 }));
      const away = dir.clone().multiplyScalar(0.6);
      s.tube([handleEnd.toArray() as P3, [handleEnd.x + away.x * 0.5, Math.max(0.03, handleEnd.y * 0.5), handleEnd.z + away.z * 0.5 + 0.15], [handleEnd.x + away.x, 0.02, handleEnd.z + away.z + 0.3], [handleEnd.x + away.x * 1.8, 0.02, handleEnd.z + away.z * 1.8 + 0.1]], 0.012, s.material('#c23a2a', { roughness: 0.6 }));
    } else if (wet) {
      const puddle = s.mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshStandardMaterial({ color: '#3d3f44', roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.55, depthWrite: false }), [0.15 * W, 0.006, 0.1 * D]);
      puddle.rotation.x = -Math.PI / 2;
      puddle.scale.set(W * 0.75, D * 0.85, 1);
      puddle.receiveShadow = true;
      const hx = -side * (W / 2 + 0.2);
      s.tube([[hx, 0.03, D / 2 + 0.1], [hx - side * 0.3, 0.025, D / 2 + 0.5], [hx + side * 0.1, 0.025, D / 2 + 0.85], [hx - side * 0.6, 0.025, D / 2 + 1.0], [hx - side * 1.1, 0.025, D / 2 + 0.6]], 0.016, s.material('#3f8a3a', { roughness: 0.5 }));
      s.cylinder(0.02, 0.025, 0.14, [hx, 0.03, D / 2 + 0.03], s.material('#c9a23a', { metalness: 0.6 }), 10).rotation.x = Math.PI / 2 - 0.2;
    }

    if (a.tools) {
      const handle = s.material('#8a6a42', { roughness: 0.8 });
      const tx = side * (W / 2 + 0.3), tz = D / 2 + 0.15;
      s.cylinder(0.018, 0.02, 0.34, [tx, 0.02, tz], handle, 8).rotation.set(Math.PI / 2, 0, 0.4);
      s.box([0.06, 0.05, 0.12], [tx + Math.sin(0.4) * 0.18, 0.025, tz - Math.cos(0.4) * 0.18], steel).rotation.y = 0.4;
      s.cylinder(0.012, 0.014, 0.24, [tx + 0.14, 0.014, tz + 0.14], steel, 8).rotation.set(Math.PI / 2, 0, -0.5);
      s.box([0.05, 0.03, 0.16], [tx - 0.12, 0.015, tz + 0.22], handle).rotation.y = 0.2;
      s.box([0.045, 0.014, 0.12], [tx - 0.12, 0.036, tz + 0.22], s.material('#8d8f93', { metalness: 0.6 })).rotation.y = 0.2;
    }

    const energy = mix(0.2, 1.2, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (swing) swing.rotation.z = Math.sin(time * 1.3) * 0.008 * energy;
        sparks.forEach((spark, i) => { spark.visible = Math.sin(time * 37 * energy + i * 2.3) > -0.4; });
      },
    });
  },
});
