import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P = [number, number, number];
const PLATES = { number: '', mule: 'MULE', bess: 'OLD BESS', hire: 'FOR HIRE', wide: 'WIDE LOAD', riders: 'NO RIDERS' } as const;

export default defineThing({
  questions: {
    body: choice('What shape is its body?', {
      brick: 'A chunky rounded brick, all bumper and no neck.',
      barrel: 'A fat barrel with domed ends, like a water heater with thrusters.',
      pod: 'A round ball pod, almost cute.',
      sled: 'An open sled frame with two round tanks and an avionics box bolted between them.',
    }),
    cargo: choice('What is it carrying?', {
      nothing: 'Nothing: arms folded in, idling, waiting for a job.',
      plate: 'A curved hull plate held out in front like a shield.',
      tank: 'A white propellant tank with a hazard band.',
      container: 'A corrugated shipping container.',
      girders: 'A strapped bundle of long truss girders, far wider than itself.',
      satellite: 'A dead satellite with one broken solar wing, towed in for scrap.',
      rock: 'A lump of ice and rock in a cargo net.',
    }),
    livery: choice('What colour is it painted?', {
      yellow: 'Hazard yellow with black trim, like plant machinery.',
      orange: 'Off-white with a safety-orange band, a port authority boat.',
      navy: 'Flat blue-grey with pale trim, military surplus.',
      primer: 'Red-oxide primer and bare grey panels, never given a top coat.',
    }),
    history: choice('What has happened to it?', {
      fresh: 'Fresh from the yard, clean and whole.',
      veteran: 'A long honest career: scuffed corners and rows of tally marks.',
      collision: 'It has been hit: one corner caved in, a thruster quad gone, an arm hanging limp.',
      cannibalised: 'Robbed for parts: an arm missing at the shoulder, a hatch open with wires out.',
    }),
    arms: choice('What grappling arms does it have?', {
      two: 'Two long arms from the upper corners.',
      four: 'Four short arms, one at each corner.',
      crane: 'One heavy crane arm on top and one small helper below.',
    }),
    eye: choice('What is its camera eye doing?', {
      ahead: 'Looking levelly ahead, calm green.',
      asleep: 'Drooped with the shutter half closed, a dim amber ember.',
      curious: 'Tilted up and to one side, wide and bright blue.',
      alarm: 'Wide open and red.',
    }),
    plate: choice('What is written on its bumper plate?', {
      number: 'Only a registration number.', mule: 'MULE', bess: 'OLD BESS', hire: 'FOR HIRE', wide: 'WIDE LOAD', riders: 'NO RIDERS',
    }),
    beacon: noul('Does it carry an amber work beacon on a stalk?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const hit = a.history === 'collision', robbed = a.history === 'cannibalised';
    const wear = Math.min(1, mood.wear + (a.history === 'veteran' ? 0.35 : hit || robbed ? 0.2 : a.history === 'fresh' ? -0.3 : 0));
    const [mainColour, trimColour] = { yellow: ['#e8b520', '#1e1f22'], orange: ['#e9e6dc', '#e0612a'], navy: ['#52657d', '#c9ced6'], primer: ['#a7533c', '#8b9198'] }[a.livery];
    const paint = s.material(mainColour, { roughness: mix(0.35, 0.8, Math.max(wear, 0)), metalness: 0.15 });
    const trim = s.material(trimColour, { roughness: 0.6 });
    const steel = s.material('#7d848c', { metalness: 0.5, roughness: 0.4 });
    const dark = s.material('#24272b', { roughness: 0.6 });
    const scuff = s.material('#5b5651', { roughness: 0.95 });
    const bare = s.material('#aab0b6', { metalness: 0.5, roughness: 0.5 });

    const [halfW, halfH, halfL] = { brick: [1.35, 1.05, 1.75], barrel: [1.3, 1.3, 1.7], pod: [1.6, 1.6, 1.75], sled: [1.0, 0.8, 1.6] }[a.body];
    const cy = halfH + 0.75;
    /** A point on the hull: u is the angle round the long axis (0 = +x, 90° = top), v runs stern (-1) to bow (1). */
    const skin = (u: number, v: number, out = 1): P => {
      const c = Math.cos(u), n = Math.sin(u);
      let k: number;
      if (a.body === 'brick' || a.body === 'sled') k = 1 / Math.max(Math.abs(c) / halfW, Math.abs(n) / halfH);
      else if (a.body === 'barrel') k = halfW;
      else k = halfW * Math.sqrt(Math.max(1 - v * v * 0.85, 0.05));
      return [c * k * out, cy + n * k * out, v * halfL * 0.9];
    };

    // ---- hull ------------------------------------------------------------------------
    if (a.body === 'brick') {
      const b = 0.28, w = halfW - b, h = halfH - b;
      const shape = new THREE.Shape();
      shape.moveTo(-w, -h); shape.lineTo(w, -h); shape.lineTo(w, h); shape.lineTo(-w, h); shape.closePath();
      const depth = (halfL - b) * 2;
      s.mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 3 }).translate(0, 0, -depth / 2), paint, [0, cy, 0]);
      s.box([halfW * 2.04, 0.34, halfL * 1.5], [0, cy - halfH * 0.35, 0], trim);
    } else if (a.body === 'barrel') {
      s.mesh(new THREE.CylinderGeometry(halfW, halfW, halfL * 1.5, 24).rotateX(Math.PI / 2), paint, [0, cy, 0]);
      for (const z of [-1, 1]) s.ball([halfW, halfW, halfL * 0.25], [0, cy, z * halfL * 0.75], paint, 24);
      for (const z of [-0.5, 0.5]) s.mesh(new THREE.TorusGeometry(halfW * 1.01, 0.09, 6, 28), trim, [0, cy, z * halfL]);
    } else if (a.body === 'pod') {
      s.ball([halfW, halfW, halfL], [0, cy, 0], paint, 28);
      s.mesh(new THREE.TorusGeometry(halfW * 1.0, 0.13, 6, 32).rotateX(Math.PI / 2), trim, [0, cy, 0]);
    } else {
      s.box([halfW * 2, halfH * 2, halfL * 1.5], [0, cy, 0.2], paint);
      for (const x of [-1, 1]) {
        s.ball([0.85, 0.85, 0.85], [x * (halfW + 0.8), cy, -0.3], s.material('#e9ecee', { roughness: 0.5 }), 18);
        s.mesh(new THREE.TorusGeometry(0.87, 0.07, 6, 20).rotateY(Math.PI / 2), trim, [x * (halfW + 0.8), cy, -0.3]);
        for (const y of [-0.75, 0.75]) s.box([0.14, 0.14, halfL * 2.3], [x * (halfW + 0.8), cy + y, 0], steel);
        for (const z of [-halfL * 1.1, halfL * 1.1]) s.box([0.12, 1.6, 0.12], [x * (halfW + 0.8), cy, z], steel);
      }
      for (const z of [-halfL * 1.1, halfL * 1.1]) s.box([(halfW + 0.8) * 2, 0.12, 0.12], [0, cy - 0.75, z], steel);
    }
    const wide = a.body === 'sled' ? halfW + 1.65 : halfW;
    // Skids.
    for (const x of [-1, 1]) {
      s.box([0.16, 0.14, halfL * 2.1], [x * wide * 0.7, 0.07, 0], dark);
      for (const z of [-0.6, 0.6]) s.rod([x * wide * 0.7, 0.1, z * halfL], [x * wide * 0.45, cy - halfH * 0.8, z * halfL * 0.8], 0.07, steel);
    }
    // Main bell and thruster quads.
    s.mesh(new THREE.LatheGeometry([[0.25, 0], [0.4, 0.25], [0.62, 0.6], [0.72, 0.9]].map(([x, y]) => new THREE.Vector2(x, y)), 20), new THREE.MeshStandardMaterial({ color: '#3a3d42', side: THREE.DoubleSide, metalness: 0.5, roughness: 0.45 }), [0, cy, -halfL * (a.body === 'sled' ? 0.55 : 0.95)]).rotation.x = -Math.PI / 2;
    const cone = new THREE.ConeGeometry(0.13, 0.3, 10, 1, true);
    const quadAngles = [0.6, Math.PI - 0.6, Math.PI + 0.6, -0.6];
    quadAngles.forEach((u, index) => {
      if (hit && index === 0) { s.ball([0.2, 0.2, 0.2], skin(u, -0.55), scuff, 8); return; }
      const at = skin(u, -0.55, 1.08);
      const block = new THREE.Group();
      block.position.set(...at);
      block.rotation.z = u;
      s.root.add(block);
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), trim);
      cube.castShadow = true;
      block.add(cube);
      for (const [x, y, z, rx, rz] of [[0.3, 0, 0, 0, Math.PI / 2], [0, 0.3, 0, Math.PI, 0], [0, -0.3, 0, 0, 0], [0, 0, 0.3, -Math.PI / 2, 0], [0, 0, -0.3, Math.PI / 2, 0]] as const) {
        const nozzle = new THREE.Mesh(cone, new THREE.MeshStandardMaterial({ color: '#2c2f33', side: THREE.DoubleSide, roughness: 0.5 }));
        nozzle.position.set(x, y, z);
        nozzle.rotation.set(rx, 0, rz);
        nozzle.castShadow = true;
        block.add(nozzle);
      }
    });

    // ---- the eye ---------------------------------------------------------------------
    const eyeRadius = Math.min(halfW, halfH) * 0.52;
    const eyeColour = { ahead: '#57f08a', asleep: '#d98a2b', curious: '#5cc8ff', alarm: '#ff3524' }[a.eye];
    const bow = a.body === 'pod' ? halfL * 0.86 : a.body === 'barrel' ? halfL * 0.98 : a.body === 'sled' ? halfL * 0.75 + 0.2 : halfL;
    const eye = new THREE.Group();
    eye.position.set(0, cy + halfH * 0.12, bow);
    s.root.add(eye);
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, z: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = z;
      mesh.castShadow = true;
      eye.add(mesh);
      return mesh;
    };
    put(new THREE.CylinderGeometry(eyeRadius * 1.25, eyeRadius * 1.4, 0.5, 24).rotateX(Math.PI / 2), trim, 0.1);
    put(new THREE.TorusGeometry(eyeRadius * 1.12, eyeRadius * 0.16, 8, 28), steel, 0.36);
    put(new THREE.SphereGeometry(eyeRadius, 24, 16), new THREE.MeshStandardMaterial({ color: '#0d1116', roughness: 0.08, metalness: 0.6 }), 0.22).scale.z = 0.7;
    const irisMaterial = new THREE.MeshStandardMaterial({ color: eyeColour, emissive: eyeColour, emissiveIntensity: a.eye === 'asleep' ? 0.7 : 2.2 });
    const iris = put(new THREE.TorusGeometry(eyeRadius * 0.42, eyeRadius * 0.11, 8, 24), irisMaterial, 0.22 + eyeRadius * 0.62);
    put(new THREE.SphereGeometry(eyeRadius * 0.2, 12, 8), irisMaterial, 0.22 + eyeRadius * 0.66);
    void iris;
    const lidDrop = { ahead: 0.15, asleep: 1.25, curious: -0.3, alarm: -0.5 }[a.eye];
    const lid = put(new THREE.SphereGeometry(eyeRadius * 1.1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: paint.color, roughness: 0.6, side: THREE.DoubleSide }), 0.22);
    lid.scale.z = 0.75;
    lid.rotation.x = lidDrop * 0.75;
    const gaze = { ahead: [0, 0], asleep: [0.38, 0.1], curious: [-0.4, 0.42], alarm: [0, 0] }[a.eye];
    eye.rotation.set(gaze[0], gaze[1], 0);

    // Bumper and plate.
    const bumperZ = a.body === 'pod' ? halfL * 0.72 : bow + 0.12;
    const bumperY = cy - halfH * 0.72;
    s.box([wide * 1.7, 0.42, 0.26], [0, bumperY, bumperZ], dark);
    for (const x of [-1, 1]) s.box([0.3, 0.52, 0.34], [x * wide * 0.7, bumperY, bumperZ], steel);
    const text = PLATES[a.plate] || `T-${String(Math.floor(random() * 90) + 10)}`;
    s.label(text, Math.min(wide * 1.1, 1.6), 0.32, [0, bumperY, bumperZ + 0.135], '#1e1f22', wear > 0.6 ? '#cfc7ae' : '#f3efe2').castShadow = false;

    // ---- cargo: slung under the belly, so the tug rides its load like a bird on an egg ----
    let grip = 1.4, drop = 0, reachZ = 0.8;
    const cargo = new THREE.Group();
    s.root.add(cargo);
    const load = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      cargo.add(mesh);
      return mesh;
    };
    if (a.cargo === 'plate') {
      const plateMaterial = new THREE.MeshStandardMaterial({ color: '#b6bcc2', metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide, flatShading: true });
      load(new THREE.CylinderGeometry(4.4, 4.4, 6.2, 10, 1, true, Math.PI - 0.62, 1.24).rotateX(Math.PI / 2), plateMaterial, [0, -4.4, 0]);
      for (const z of [-2.6, -0.9, 0.9, 2.6]) load(new THREE.CylinderGeometry(4.46, 4.46, 0.16, 10, 1, true, Math.PI - 0.62, 1.24).rotateX(Math.PI / 2), dark, [0, -4.4, z]);
      grip = 2.6; drop = 0.9; reachZ = 1.6;
    } else if (a.cargo === 'tank') {
      load(new THREE.CapsuleGeometry(1.15, 3.4, 8, 20).rotateZ(Math.PI / 2), s.material('#f0f4f6', { roughness: 0.5 }));
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#f2c21a'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#1b1b1d';
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(k * 64, 0); ctx.lineTo(k * 64 + 32, 0); ctx.lineTo(k * 64 - 32, 64); ctx.lineTo(k * 64 - 64, 64); ctx.fill(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.RepeatWrapping; texture.repeat.set(8, 1);
      load(new THREE.CylinderGeometry(1.18, 1.18, 0.5, 20, 1, true).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7 }), [1.3, 0, 0]);
      load(new THREE.CylinderGeometry(1.18, 1.18, 0.25, 20, 1, true).rotateZ(Math.PI / 2), trim, [-1.4, 0, 0]);
      cargo.position.y = -1.17; grip = 2.3; drop = 1.1; reachZ = 0.7;
    } else if (a.cargo === 'container') {
      const boxColour = ['#2f6f8f', '#9c3b2e', '#3f7a4c', '#c98a1e'][Math.floor(random() * 4)];
      const boxPaint = s.material(boxColour, { roughness: 0.7 });
      load(new THREE.BoxGeometry(4.6, 2.2, 2.3), boxPaint);
      for (let i = 0; i < 16; i++) load(new THREE.BoxGeometry(0.09, 2.0, 2.38), boxPaint, [-2.12 + i * 0.283, 0, 0]);
      for (const x of [-2.3, 2.3]) for (const y of [-1.1, 1.1]) load(new THREE.BoxGeometry(0.16, 0.16, 2.42), dark, [x, y, 0]);
      cargo.position.y = -1.19; grip = 2.36; drop = 1.0; reachZ = 0.9;
    } else if (a.cargo === 'girders') {
      for (let k = 0; k < 6; k++) {
        const y = (Math.floor(k / 3) - 0.5) * 0.4, z = (k % 3 - 1) * 0.46;
        load(new THREE.BoxGeometry(mix(8, 11, random()), 0.34, 0.34), k % 2 ? steel : bare, [(random() - 0.5) * 1.2, y, z]).rotation.x = random() * 0.25;
      }
      for (const x of [-2.6, 2.6]) load(new THREE.TorusGeometry(0.86, 0.05, 5, 16).rotateY(Math.PI / 2), trim, [x, 0, 0]);
      cargo.position.y = -0.46; grip = 2.0; drop = 0.45; reachZ = 0.75;
    } else if (a.cargo === 'satellite') {
      load(new THREE.BoxGeometry(1.7, 1.5, 1.5), new THREE.MeshStandardMaterial({ color: '#c9a03d', metalness: 0.4, roughness: 0.45, flatShading: true, emissive: '#4a3208', emissiveIntensity: 0.3 }));
      const cells = new THREE.MeshStandardMaterial({ color: '#1f3a7a', metalness: 0.3, roughness: 0.3, emissive: '#0d1f4d', emissiveIntensity: 0.4 });
      load(new THREE.BoxGeometry(2.2, 0.06, 1.3), cells, [2.1, 0, 0]).rotation.x = 0.3;
      load(new THREE.BoxGeometry(2.0, 0.06, 1.3), cells, [4.2, -0.2, 0.1]).rotation.set(0.3, 0.2, -0.25);
      load(new THREE.BoxGeometry(1.6, 0.06, 1.3), cells, [-1.8, -0.25, 0.3]).rotation.set(0.9, 0.5, 0.5);
      load(new THREE.LatheGeometry([[0.05, 0], [0.4, 0.1], [0.8, 0.4]].map(([x, y]) => new THREE.Vector2(x, y)), 16), new THREE.MeshStandardMaterial({ color: '#e9ebe6', side: THREE.DoubleSide }), [0, 0, 0.8]).rotation.x = 1.3;
      cargo.position.y = -0.8; grip = 0.9; drop = 0.8; reachZ = 0.7;
    } else if (a.cargo === 'rock') {
      const rock = new THREE.DodecahedronGeometry(1.7, 1);
      const position = rock.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(position, i);
        v.multiplyScalar(0.84 + 0.2 * Math.sin(v.x * 2.1 + (context.seed % 7)) * Math.cos(v.y * 1.7) + 0.1 * Math.sin(v.z * 3.3));
        position.setXYZ(i, v.x, v.y, v.z);
      }
      rock.computeVertexNormals();
      load(rock, new THREE.MeshStandardMaterial({ color: '#8d99a0', roughness: 0.9, flatShading: true }));
      load(new THREE.IcosahedronGeometry(0.7, 0), new THREE.MeshStandardMaterial({ color: '#e6f3f8', roughness: 0.3, flatShading: true, emissive: '#7fb6cc', emissiveIntensity: 0.25 }), [0.9, 0.2, 1.1]);
      for (let k = 0; k < 5; k++) load(new THREE.TorusGeometry(1.95, 0.035, 4, 24), trim).rotation.set(k * 0.63, k * 0.75, 0);
      cargo.position.y = -1.9; grip = 1.75; drop = 1.6; reachZ = 0.8;
    }

    // ---- arms ------------------------------------------------------------------------
    const shoulders: { u: number; heavy: boolean }[] =
      a.arms === 'two' ? [{ u: 0.95, heavy: false }, { u: Math.PI - 0.95, heavy: false }]
      : a.arms === 'four' ? [{ u: 0.8, heavy: false }, { u: Math.PI - 0.8, heavy: false }, { u: -0.8, heavy: false }, { u: Math.PI + 0.8, heavy: false }]
      : [{ u: Math.PI / 2, heavy: true }, { u: Math.PI + 0.9, heavy: false }];
    const carrying = a.cargo !== 'nothing';
    shoulders.forEach(({ u, heavy }, index) => {
      const from = skin(u, 0.55, 1.02);
      const side = Math.sign(Math.cos(u)) || 0, up = Math.sin(u) >= 0 ? 1 : -1;
      const radius = heavy ? 0.16 : 0.1;
      s.ball([radius * 2.1, radius * 2.1, radius * 2.1], from, dark, 10);
      if (robbed && index === 0) {
        // Only a stub and a dangling cable where the arm was.
        s.rod(from, [from[0] + side * 0.3, from[1] + 0.35, from[2] + 0.2], radius, steel);
        s.tube([[from[0] + side * 0.3, from[1] + 0.35, from[2] + 0.2], [from[0] + side * 0.7, from[1], from[2] + 0.5], [from[0] + side * 0.6, from[1] - 0.8, from[2] + 0.4]], 0.03, s.material('#c0392b'));
        return;
      }
      const limp = hit && index === shoulders.length - 1;
      let hand: P, elbow: P;
      if (limp) {
        elbow = [from[0] + side * 0.9, from[1] - 0.3, from[2] + 0.9];
        hand = [elbow[0] + side * 0.2, Math.max(elbow[1] - 1.5, 0.4), elbow[2] + 0.5];
      } else if (carrying) {
        hand = heavy ? [grip, -drop * 0.7, 0.2] : [side * grip, -drop * (up > 0 ? 0.7 : 1), reachZ * (up > 0 ? 1 : 0.4)];
        elbow = heavy
          ? [Math.max(grip, wide) + 1.2, from[1] + 0.9, 0.5]
          : [Math.max(Math.abs(hand[0]), wide) * side + side * 0.7, mix(from[1], hand[1], 0.35) + 0.2, mix(from[2], hand[2], 0.5)];
      } else {
        elbow = [from[0] + side * 0.55, from[1] + up * (heavy ? 1.5 : 0.7), from[2] - 0.5];
        hand = [from[0] + side * 0.25, from[1] + up * 0.15 + (heavy ? 0.5 : 0), from[2] + 0.75 + (heavy ? 0.6 : 0)];
      }
      s.rod(from, elbow, radius, paint);
      s.rod(elbow, hand, radius * 0.85, steel);
      s.ball([radius * 1.7, radius * 1.7, radius * 1.7], elbow, dark, 10);
      // A three-finger claw that opens along the forearm.
      const along = new THREE.Vector3(hand[0] - elbow[0], hand[1] - elbow[1], hand[2] - elbow[2]).normalize();
      const sideways = new THREE.Vector3(0, 1, 0).cross(along).normalize();
      if (sideways.lengthSq() < 0.01) sideways.set(1, 0, 0);
      const third = along.clone().cross(sideways);
      const open = carrying && !limp ? 0.75 : 0.35;
      for (let f = 0; f < 3; f++) {
        const t = (f / 3) * Math.PI * 2;
        const spread = sideways.clone().multiplyScalar(Math.cos(t)).addScaledVector(third, Math.sin(t));
        const knuckle = new THREE.Vector3(...hand).addScaledVector(spread, radius * 3 * open + 0.05).addScaledVector(along, radius * 2.2);
        const tip = knuckle.clone().addScaledVector(along, radius * 3.4).addScaledVector(spread, -radius * 1.4 * open);
        s.rod(hand, knuckle.toArray() as P, radius * 0.5, dark);
        s.rod(knuckle.toArray() as P, tip.toArray() as P, radius * 0.45, dark, radius * 0.2);
      }
    });

    // ---- history written on the hull -------------------------------------------------
    const patches = Math.round(Math.max(wear, 0) * 9) + (a.livery === 'primer' ? 4 : 0);
    for (let k = 0; k < patches; k++) {
      const at = skin(random() * 6.28, random() * 1.5 - 0.75, 0.985);
      const patch = s.ball([0.08 + random() * 0.2, 0.08 + random() * 0.2, 0.08 + random() * 0.2], at, a.livery === 'primer' && k % 2 ? bare : scuff, 8);
      patch.castShadow = false;
    }
    if (a.history === 'veteran') {
      const tally = Array.from({ length: 5 + Math.floor(random() * 9) }, (_x, i) => (i % 5 === 4 ? '/' : '|')).join('');
      const marks = s.label(tally, 0.9, 0.22, skin(0, 0.1, 1.012), '#f3efe2', mainColour);
      marks.rotation.y = Math.PI / 2;
      marks.castShadow = false;
    }
    if (hit) {
      const dent = s.mesh(new THREE.IcosahedronGeometry(0.62, 0), s.material('#3b3835', { roughness: 0.9, flatShading: true }), skin(0.75, 0.55, 0.9));
      dent.rotation.set(random() * 3, random() * 3, 0);
      for (let k = 0; k < 3; k++) s.rod(skin(0.6, -0.55, 1.0), skin(0.6 + (random() - 0.5), -0.55 - random() * 0.3, 1.3), 0.025, s.material('#c0392b'));
    }
    if (robbed) {
      const at = skin(Math.PI - 0.05, -0.1, 1.0);
      s.box([0.06, 0.8, 0.9], at, dark);
      const door = s.box([0.05, 0.8, 0.9], [at[0] - 0.4, at[1] + 0.05, at[2] - 0.75], paint);
      door.rotation.y = -0.9;
      for (let k = 0; k < 4; k++) s.tube([at, [at[0] - 0.4, at[1] - 0.2 - random() * 0.3, at[2] + (random() - 0.5) * 0.6], [at[0] - 0.3 - random() * 0.4, at[1] - 0.8 - random() * 0.5, at[2] + (random() - 0.5) * 0.8]], 0.022, s.material(['#c0392b', '#e3b21f', '#2f6f8f', '#e9e6dc'][k]));
    }

    // Whip antenna and beacon.
    const mast = skin(Math.PI / 2 + 0.5, -0.5, 1.0);
    s.rod(mast, [mast[0] - 0.2, mast[1] + 1.5, mast[2] - 0.5], 0.025, steel, 0.012);
    let beaconMaterial: THREE.MeshStandardMaterial | null = null;
    if (a.beacon) {
      const foot = skin(Math.PI / 2 - 0.5, -0.35, 1.0);
      s.rod(foot, [foot[0], foot[1] + 0.55, foot[2]], 0.04, steel);
      beaconMaterial = new THREE.MeshStandardMaterial({ color: '#ffad1f', emissive: '#ff9a10', emissiveIntensity: 2.2 });
      s.cylinder(0.13, 0.15, 0.24, [foot[0], foot[1] + 0.66, foot[2]], beaconMaterial, 12).castShadow = false;
      s.cylinder(0.17, 0.17, 0.05, [foot[0], foot[1] + 0.8, foot[2]], dark, 12);
    }

    const energy = mood.energy;
    const baseYaw = eye.rotation.y, basePitch = eye.rotation.x;
    return s.finish({
      update: (_dt, time) => {
        if (a.eye !== 'asleep') {
          eye.rotation.y = baseYaw + Math.sin(time * mix(0.3, 2.2, energy)) * mix(0.05, 0.3, energy);
          eye.rotation.x = basePitch + Math.sin(time * mix(0.2, 1.7, energy) + 1) * 0.06;
        }
        if (a.eye === 'alarm') irisMaterial.emissiveIntensity = Math.sin(time * 9) > 0 ? 3 : 0.4;
        if (beaconMaterial) beaconMaterial.emissiveIntensity = 1.3 + Math.sin(time * mix(2, 9, energy)) * 1.2;
      },
    });
  },
});
