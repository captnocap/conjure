import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const LIVERIES = {
  mail: 'Air mail: dark blue fuselage lettered U.S. MAIL, wings of varnished cream linen.',
  barnstormer: 'Barnstormer: fire-engine red with yellow wings and a red sunburst, built to be seen from a fairground.',
  military: 'Military: olive drab with roundels on the wings and striped rudder.',
  trainer: 'Trainer: chrome yellow all over with a silver nose, cheerful and clumsy.',
  smuggler: 'Unmarked matte black with no numbers at all, flying at night for a reason.',
} as const;
const PAINT: Record<keyof typeof LIVERIES, { body: string; wing: string; trim: string; text: string }> = {
  mail: { body: '#24415f', wing: '#dccb9c', trim: '#c9352b', text: 'U.S. MAIL' },
  barnstormer: { body: '#c9281f', wing: '#f1c21b', trim: '#c9281f', text: 'AIR CIRCUS' },
  military: { body: '#5c6138', wing: '#666b3f', trim: '#e9e3cf', text: 'B 4127' },
  trainer: { body: '#f0b90f', wing: '#f0b90f', trim: '#b9c0c4', text: '27' },
  smuggler: { body: '#26262a', wing: '#2e2e33', trim: '#3a3a40', text: '' },
};

export default defineThing({
  questions: {
    era: choice('What kind of biplane is it?', {
      scout: 'A stubby 1917 scout with a round cowl over a rotary engine.',
      mailplane: 'A long-nosed 1920s mail plane with a flat radiator front and exhaust stacks.',
      radial: 'A 1930s open-cockpit biplane with the cylinders of a radial engine exposed in a ring.',
    }),
    livery: choice('How is it painted?', LIVERIES),
    attitude: choice('What is the storm doing to it right now?', {
      bank: 'Banked hard over on one wing, clawing round a turn.',
      climb: 'Nose high, climbing steeply to get over the weather.',
      dive: 'Nose down in a steep dive, wires screaming.',
      inverted: 'Flung almost upside down by a gust.',
      level: 'Wings nearly level, crabbing sideways and fighting for every yard.',
    }),
    engine: choice('How is the engine?', {
      sound: 'Running sweet, no smoke at all.',
      oily: 'Trailing a thin dark thread of oil smoke.',
      smoking: 'Pouring heavy black smoke.',
      burning: 'On fire, flames licking back from the cowl.',
      dead: 'Stopped dead, the propeller standing still.',
    }),
    loose: choice('What is coming loose?', {
      nothing: 'Nothing, she is holding together.',
      letters: 'Letters and a mail sack spilling out behind.',
      wire: 'A bracing wire has snapped and a patch of wing fabric has torn open.',
      wheel: 'One wheel has dropped off and is falling away.',
    }),
    pilot: noul('Can the pilot be seen in the cockpit, goggles down and scarf flying?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const paint = PAINT[a.livery];
    const plane = new THREE.Group();
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = plane) => { parent.add(node); return node; };
    const body = s.material(paint.body, { roughness: 0.6 });
    const trim = s.material(paint.trim, { roughness: 0.6 });
    const wood = s.material('#8a5a2e', { roughness: 0.6 });
    const steel = s.material('#868d90', { metalness: 0.7, roughness: 0.4 });
    const black = s.material('#1d1d1f', { roughness: 0.8 });
    const long = a.era === 'mailplane' ? 1.25 : a.era === 'scout' ? 0.85 : 1;
    const noseZ = 1.9 * long;

    // Fuselage: a loft through rounded-box stations from nose to sternpost.
    const stations: [number, number, number, number][] = [
      [noseZ + 0.02, 0.3, 0.3, 0.02], [noseZ, 0.62, 0.66, 0.02], [1.0 * long, 0.8, 0.92, 0], [0.1, 0.82, 0.98, 0], [-1.2 * long, 0.66, 0.8, 0.04],
      [-2.6 * long, 0.34, 0.5, 0.1], [-3.5 * long, 0.08, 0.3, 0.14], [-3.56 * long, 0.01, 0.05, 0.14],
    ];
    {
      const around = 14;
      const positions: number[] = [], indices: number[] = [];
      for (const [z, w, h, y] of stations)
        for (let k = 0; k < around; k++) {
          const t = (k / around) * Math.PI * 2;
          const cx = Math.cos(t), sy = Math.sin(t);
          positions.push(Math.sign(cx) * Math.pow(Math.abs(cx), 0.55) * w / 2, y + Math.sign(sy) * Math.pow(Math.abs(sy), sy > 0 ? 0.8 : 0.5) * h / 2, z);
        }
      for (let i = 0; i < stations.length - 1; i++)
        for (let k = 0; k < around; k++) {
          const p = i * around + k, q = i * around + ((k + 1) % around);
          indices.push(p, p + around, q, q, p + around, q + around);
        }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      add(s.mesh(geometry, body));
    }

    // Engine.
    const hubZ = noseZ + (a.era === 'mailplane' ? 0.3 : 0.24);
    if (a.era === 'scout') {
      add(s.cylinder(0.5, 0.52, 0.5, [0, 0.02, noseZ - 0.05], steel, 24)).rotation.x = Math.PI / 2;
      add(s.cylinder(0.38, 0.38, 0.06, [0, 0.02, noseZ + 0.2], black, 20)).rotation.x = Math.PI / 2;
    } else if (a.era === 'mailplane') {
      add(s.box([0.66, 0.78, 0.5], [0, 0.03, noseZ - 0.1], steel));
      add(s.box([0.56, 0.64, 0.06], [0, 0.05, noseZ + 0.17], black));
      for (let i = 0; i < 5; i++) add(s.box([0.5, 0.02, 0.07], [0, -0.2 + i * 0.12, noseZ + 0.18], steel));
      for (const x of [-1, 1]) for (let i = 0; i < 4; i++) add(s.rod([x * 0.34, 0.3, noseZ - 0.3 - i * 0.22], [x * 0.5, 0.42, noseZ - 0.42 - i * 0.22], 0.035, black));
    } else {
      add(s.cylinder(0.26, 0.3, 0.3, [0, 0.02, noseZ + 0.05], steel, 16)).rotation.x = Math.PI / 2;
      for (let i = 0; i < 7; i++) {
        const t = (i / 7) * Math.PI * 2;
        const pot = add(s.cylinder(0.09, 0.11, 0.36, [Math.cos(t) * 0.42, 0.02 + Math.sin(t) * 0.42, noseZ], black, 10));
        pot.rotation.z = t - Math.PI / 2;
      }
      add(s.ring(0.6, 0.02, [0, 0.02, noseZ - 0.1], steel));
    }
    // Propeller: a varnished two-blade, with a ghost disc when it is turning.
    const prop = new THREE.Group();
    prop.position.set(0, 0.02, hubZ);
    add(prop);
    for (const side of [-1, 1]) {
      const blade = add(s.box([0.16, 0.95, 0.035], [0, side * 0.5, 0], wood), prop);
      blade.rotation.y = side * 0.35;
    }
    add(s.ball([0.09, 0.09, 0.12], [0, 0, 0.02], steel, 10), prop);
    const turning = a.engine !== 'dead';
    if (turning) {
      const disc = add(new THREE.Mesh(new THREE.CircleGeometry(0.98, 36), new THREE.MeshBasicMaterial({ color: '#6b6258', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })), prop);
      disc.position.z = 0.01;
    } else prop.rotation.z = 0.5;

    // Wings: fabric over ribs, painted from a canvas so markings and patches come with the livery.
    const wingMap = (upper: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 160;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = paint.wing;
      ctx.fillRect(0, 0, 1024, 160);
      if (a.livery === 'barnstormer' && upper) {
        ctx.fillStyle = paint.trim;
        for (let i = -9; i <= 9; i += 2) {
          ctx.beginPath();
          ctx.moveTo(512, 160); ctx.lineTo(512 + i * 70, 0); ctx.lineTo(512 + (i + 1) * 70, 0);
          ctx.closePath(); ctx.fill();
        }
      }
      if (a.livery === 'military') for (const x of [130, 894]) {
        for (const [r, c] of [[58, '#27437e'], [40, '#efe9d6'], [20, '#c12f26']] as const) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, 80, r, 0, 7); ctx.fill(); }
      }
      if (a.livery === 'mail' && upper) { ctx.fillStyle = paint.body; ctx.font = 'bold 92px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('AIR  MAIL', 512, 84); }
      if (a.livery === 'trainer') { ctx.fillStyle = '#c9352b'; ctx.fillRect(0, 0, 60, 160); ctx.fillRect(964, 0, 60, 160); }
      ctx.strokeStyle = 'rgba(40,30,20,0.28)';
      ctx.lineWidth = 2;
      for (let x = 14; x < 1024; x += 34) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 160); ctx.stroke(); }
      ctx.fillStyle = 'rgba(40,30,20,0.2)';
      ctx.fillRect(0, 0, 1024, 7);
      const patches = Math.round(mood.wear * 9);
      for (let i = 0; i < patches; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(232,222,196,0.85)' : 'rgba(60,50,40,0.45)';
        ctx.fillRect(random() * 980, random() * 120, 26 + random() * 30, 20 + random() * 26);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const wing = (span: number, chord: number, upper: boolean) => {
      const shape = new THREE.Shape();
      const r = chord * 0.48;
      shape.moveTo(-span / 2 + r, -chord / 2);
      shape.lineTo(span / 2 - r, -chord / 2);
      shape.absarc(span / 2 - r, -chord / 2 + r, r, -Math.PI / 2, 0, false);
      shape.lineTo(span / 2, chord / 2 - r * 0.4);
      shape.absarc(span / 2 - r * 0.4, chord / 2 - r * 0.4, r * 0.4, 0, Math.PI / 2, false);
      shape.lineTo(-span / 2 + r * 0.4, chord / 2);
      shape.absarc(-span / 2 + r * 0.4, chord / 2 - r * 0.4, r * 0.4, Math.PI / 2, Math.PI, false);
      shape.lineTo(-span / 2, -chord / 2 + r);
      shape.absarc(-span / 2 + r, -chord / 2 + r, r, Math.PI, Math.PI * 1.5, false);
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 8 });
      const map = wingMap(upper);
      map.wrapS = THREE.RepeatWrapping;
      map.repeat.set(-1 / span, 1 / chord);
      map.offset.set(0.5, 0.5);
      const mesh = s.mesh(geometry, new THREE.MeshStandardMaterial({ map, roughness: 0.7 }));
      // Shape y (leading edge at +y) becomes the plane's +z.
      mesh.rotation.x = Math.PI / 2;
      return mesh;
    };
    const span = a.era === 'scout' ? 7.4 : a.era === 'mailplane' ? 9.6 : 8.6;
    const chord = 1.35;
    const upperY = 1.42, lowerY = -0.36, upperZ = 0.75, lowerZ = 0.3;
    add(wing(span, chord, true)).position.set(0, upperY + 0.05, upperZ);
    add(wing(span * 0.9, chord * 0.92, false)).position.set(0, lowerY + 0.05, lowerZ);

    // Struts and bracing wires.
    const bay = span * 0.3;
    const snapped = a.loose === 'wire' ? (random() < 0.5 ? -1 : 1) : 0;
    for (const x of [-1, 1]) {
      for (const dz of [-0.42, 0.42]) {
        add(s.rod([x * bay, lowerY + 0.05, lowerZ + dz], [x * bay, upperY - 0.05, upperZ + dz], 0.035, wood));
        add(s.rod([x * 0.36, 0.42, 0.3 + dz * 0.8], [x * 0.5, upperY - 0.05, upperZ + dz], 0.03, wood));
      }
      if (x !== snapped) {
        add(s.rod([x * 0.45, lowerY + 0.05, lowerZ], [x * bay, upperY - 0.05, upperZ], 0.011, steel));
        add(s.rod([x * 0.5, upperY - 0.05, upperZ], [x * bay, lowerY + 0.05, lowerZ], 0.011, steel));
      } else {
        add(s.rod([x * 0.5, upperY - 0.05, upperZ], [x * bay, lowerY + 0.05, lowerZ], 0.011, steel));
        // The broken wire whips back in the slipstream, and the fabric outboard of it has split.
        add(s.tube([[x * bay, upperY - 0.05, upperZ], [x * (bay - 0.3), upperY - 0.7, upperZ - 0.7], [x * (bay + 0.2), upperY - 0.5, upperZ - 1.6], [x * (bay - 0.1), upperY - 1.1, upperZ - 2.3]], 0.013, steel));
        add(s.box([1.1, 0.02, 0.7], [x * (bay + 0.9), upperY + 0.13, upperZ - 0.1], black));
        for (let i = 0; i < 3; i++) add(s.box([0.03, 0.03, 0.7], [x * (bay + 0.6 + i * 0.3), upperY + 0.14, upperZ - 0.1], wood));
        const flap = add(s.box([0.9, 0.012, 0.5], [x * (bay + 0.9), upperY + 0.34, upperZ - 0.6], s.material(paint.wing, { side: THREE.DoubleSide })));
        flap.rotation.x = -0.9;
      }
      add(s.rod([x * bay, lowerY + 0.05, lowerZ - 0.42], [x * bay, upperY - 0.05, upperZ + 0.42], 0.009, steel));
    }

    // Tail.
    const tailZ = -3.1 * long;
    {
      const plan = new THREE.Shape();
      plan.moveTo(0, 0.45); plan.lineTo(0.5, 0.4); plan.quadraticCurveTo(1.5, 0.2, 1.45, -0.35); plan.lineTo(1.2, -0.6); plan.lineTo(-1.2, -0.6); plan.lineTo(-1.45, -0.35);
      plan.quadraticCurveTo(-1.5, 0.2, -0.5, 0.4); plan.closePath();
      const stab = add(s.mesh(new THREE.ExtrudeGeometry(plan, { depth: 0.05, bevelEnabled: false }), s.material(paint.wing)));
      stab.rotation.x = Math.PI / 2;
      stab.position.set(0, 0.26, tailZ);
      const fin = new THREE.Shape();
      fin.moveTo(0.75, 0); fin.quadraticCurveTo(0.3, 0.95, -0.25, 1.0); fin.quadraticCurveTo(-0.8, 0.9, -0.72, 0.2); fin.lineTo(-0.6, -0.25); fin.lineTo(-0.3, 0); fin.closePath();
      const rudder = add(s.mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.05, bevelEnabled: false }), a.livery === 'military' || a.livery === 'trainer' ? trim : body));
      rudder.rotation.y = -Math.PI / 2;
      rudder.position.set(0.025, 0.28, tailZ - 0.1);
      if (a.livery === 'military') for (const [i, c] of (['#27437e', '#c12f26'] as const).entries()) add(s.box([0.062, 0.8, 0.18], [0, 0.72, tailZ - 0.38 - i * 0.2], s.material(c)));
      add(s.rod([0, -0.1, tailZ + 0.2], [0, -0.42, tailZ - 0.2], 0.03, wood));
    }

    // Undercarriage.
    const lostWheel = a.loose === 'wheel' ? (random() < 0.5 ? -1 : 1) : 0;
    const wheel = (parent: THREE.Object3D, at: [number, number, number]) => {
      const group = new THREE.Group();
      group.position.set(...at);
      add(s.ring(0.3, 0.085, [0, 0, 0], black), group).rotation.y = Math.PI / 2;
      add(s.cylinder(0.26, 0.26, 0.1, [0, 0, 0], trim, 18), group).rotation.z = Math.PI / 2;
      parent.add(group);
      return group;
    };
    const gearY = -1.3, gearZ = 1.0 * long;
    add(s.rod([-0.9, gearY, gearZ], [0.9, gearY, gearZ], 0.035, steel));
    for (const x of [-1, 1]) {
      add(s.rod([x * 0.35, -0.4, gearZ + 0.45], [x * 0.78, gearY, gearZ], 0.035, wood));
      add(s.rod([x * 0.35, -0.4, gearZ - 0.55], [x * 0.78, gearY, gearZ], 0.035, wood));
      if (x !== lostWheel) wheel(plane, [x * 0.92, gearY, gearZ]);
    }

    // Lettering on both flanks.
    if (paint.text) for (const x of [-1, 1]) {
      const label = add(s.label(paint.text, 1.5 * long, 0.36, [x * 0.345, 0.08, -1.55 * long], a.livery === 'military' ? '#e9e3cf' : a.livery === 'trainer' ? '#1d1d1f' : '#f4efdd', paint.body));
      label.rotation.y = x * (Math.PI / 2 - 0.085);
    }

    // Cockpit and pilot.
    add(s.cylinder(0.3, 0.3, 0.05, [0, 0.47, -0.55], black, 18)).scale.set(1, 1, 1.35);
    add(s.ring(0.3, 0.035, [0, 0.49, -0.55], s.material('#5a3a22')), plane).rotation.x = Math.PI / 2;
    const screen = add(s.mesh(new THREE.PlaneGeometry(0.5, 0.26), new THREE.MeshPhysicalMaterial({ color: '#bcd3d6', transparent: true, opacity: 0.45, roughness: 0.1, side: THREE.DoubleSide }), [0, 0.6, -0.14]));
    screen.rotation.x = -0.5;
    let scarf: THREE.Mesh | null = null;
    if (a.pilot) {
      const leather = s.material('#4a2f1c', { roughness: 0.7 });
      add(s.ball([0.17, 0.19, 0.18], [0, 0.72, -0.6], leather, 16));
      add(s.ball([0.13, 0.11, 0.05], [0, 0.69, -0.46], s.material('#d9a785'), 10));
      for (const x of [-1, 1]) add(s.cylinder(0.05, 0.05, 0.04, [x * 0.065, 0.74, -0.45], black, 10)).rotation.x = Math.PI / 2;
      add(s.box([0.3, 0.035, 0.03], [0, 0.74, -0.5], leather));
      add(s.ball([0.26, 0.14, 0.22], [0, 0.5, -0.62], leather, 12));
      const cloth = s.material(mood.cheer > 0.5 ? '#f4f1e6' : '#c9352b', { roughness: 0.9 });
      const points: [number, number, number][] = [[0.1, 0.58, -0.7]];
      for (let i = 1; i <= 6; i++) points.push([0.1 + Math.sin(i * 1.3) * 0.16, 0.6 + Math.sin(i * 0.9) * 0.14 + i * 0.03, -0.7 - i * 0.36]);
      scarf = add(s.tube(points, 0.07, cloth));
      scarf.scale.y = 0.9;
    }

    // ----- attitude: the whole machine is thrown about, well clear of the cloud beneath it.
    const tilt = { bank: [-0.12, 0.5, -0.95], climb: [-0.8, 0.5, -0.2], dive: [0.75, 0.6, 0.3], inverted: [0.25, 0.4, 2.6], level: [-0.05, 0.75, 0.16] }[a.attitude];
    const jolt = () => (random() - 0.5) * mix(0.05, 0.35, mood.energy);
    plane.rotation.set(tilt[0] + jolt(), tilt[1] + jolt(), tilt[2] + jolt(), 'YXZ');
    const altitude = 4.9;
    plane.position.set(0, altitude, 0);
    s.root.add(plane);
    plane.updateMatrixWorld(true);
    const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(plane.matrixWorld);
    // The air the plane has just flown through: straight back along its nose, in world space.
    const back = new THREE.Vector3(0, 0, -1).applyQuaternion(plane.quaternion);
    const wake = (from: THREE.Vector3, t: number, spread: number) => from.clone().addScaledVector(back, t).add(new THREE.Vector3((random() - 0.5) * spread, (random() - 0.5) * spread + t * 0.08, (random() - 0.5) * spread));

    if (a.engine === 'oily' || a.engine === 'smoking' || a.engine === 'burning') {
      const heavy = a.engine === 'oily' ? 0.35 : 1;
      const soot = new THREE.MeshStandardMaterial({ color: a.engine === 'oily' ? '#4a4744' : '#232221', roughness: 1 });
      const nose = toWorld(0.3, -0.2, noseZ - 0.4);
      const count = a.engine === 'oily' ? 22 : 30;
      const puffs = Array.from({ length: count }, (_unused, i) => {
        const t = 0.6 + (i / count) * 6;
        const at = wake(nose, t, 0.15 + t * 0.07 * heavy);
        return { at: at.toArray() as [number, number, number], size: (0.1 + t * 0.085) * heavy + 0.05 };
      });
      s.scatter(new THREE.IcosahedronGeometry(1, 1), soot, puffs).receiveShadow = false;
    }
    if (a.engine === 'burning') {
      const fire = new THREE.MeshStandardMaterial({ color: '#ff9a1f', emissive: '#ff5a0a', emissiveIntensity: 1.1, roughness: 0.6 });
      const nose = toWorld(0, 0.25, noseZ - 0.2);
      const tongues = Array.from({ length: 16 }, (_unused, i) => {
        const t = (i / 16) * 2.6;
        return { at: wake(nose, t, 0.35).toArray() as [number, number, number], size: mix(0.36, 0.1, i / 16) };
      });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), fire, tongues).castShadow = false;
    }
    if (a.loose === 'letters') {
      const paper = new THREE.MeshStandardMaterial({ color: '#f3eeda', roughness: 0.9, side: THREE.DoubleSide });
      const hold = toWorld(0, 0.5, -1.3);
      const letters = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.34, 0.2), paper, 34);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < 34; i++) {
        const t = 0.5 + (i / 34) * 6;
        const at = wake(hold, t, 0.3 + t * 0.28);
        at.y -= t * t * 0.03;
        q.setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6));
        m.compose(at, q, new THREE.Vector3(1, 1, 1));
        letters.setMatrixAt(i, m);
      }
      letters.castShadow = true;
      s.root.add(letters);
      const sackAt = wake(hold, 2.2, 0.3);
      const sack = s.ball([0.34, 0.48, 0.3], [sackAt.x, sackAt.y - 0.9, sackAt.z], s.material('#a08a5c', { roughness: 1 }), 12);
      sack.rotation.z = 0.7;
    }
    if (lostWheel) {
      const from = toWorld(lostWheel * 0.92, gearY, gearZ);
      const fallen = wheel(s.root, [from.x + lostWheel * 0.5, from.y - 2.1, from.z - 0.8]);
      fallen.rotation.set(0.9, 0.3, 0.6);
    }

    // A rag of storm cloud beneath, and rain slanting through the gap.
    const cloudTone = new THREE.Color('#aab0b8').lerp(new THREE.Color('#5d626c'), 1 - mood.cheer * 0.8);
    const lumps = Array.from({ length: 26 }, () => {
      const angle = random() * Math.PI * 2, reach = Math.sqrt(random()) * 3.3;
      return { at: [Math.cos(angle) * reach * 1.15, 0.75 + random() * 0.5 - reach * 0.06, Math.sin(angle) * reach * 0.8] as [number, number, number], size: mix(1.1, 0.5, reach / 3.3) * mix(0.8, 1.15, random()) };
    });
    s.scatter(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: cloudTone, roughness: 1 }), lumps);
    const drops = Math.round(mix(14, 70, mood.energy * 0.6 + mood.density * 0.4));
    const rain = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4), new THREE.MeshStandardMaterial({ color: '#7f95a8', roughness: 0.3 }), drops);
    {
      const m = new THREE.Matrix4();
      const slant = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, mix(0.15, 0.6, mood.energy)));
      for (let i = 0; i < drops; i++) {
        m.compose(new THREE.Vector3((random() - 0.5) * 8, 1.6 + random() * 6, (random() - 0.5) * 6), slant, new THREE.Vector3(1, mix(0.4, 1.1, random()), 1));
        rain.setMatrixAt(i, m);
      }
    }
    s.root.add(rain);

    const shake = mix(0.01, 0.07, mood.energy);
    const rest = plane.rotation.clone();
    const spin = turning ? mix(14, 30, mood.energy) : 0;
    return s.finish({
      footprint: 3,
      update(dt, time) {
        prop.rotation.z += dt * spin;
        plane.rotation.x = rest.x + Math.sin(time * 3.1) * shake;
        plane.rotation.z = rest.z + Math.sin(time * 2.3 + 1) * shake * 1.6;
        plane.position.y = altitude + Math.sin(time * 1.7) * shake * 3;
        if (scarf) scarf.rotation.y = Math.sin(time * 9) * 0.12;
      },
    });
  },
});
