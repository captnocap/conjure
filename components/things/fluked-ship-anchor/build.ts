import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';
import { encrust, stained } from './sea';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    pattern: choice('What pattern of anchor is it?', {
      admiralty: 'The classic admiralty pattern: long shank, curved arms with spade flukes, a round iron stock crossing near the ring.',
      wooden: 'An older sailing-ship anchor with a heavy timber stock bound in iron hoops.',
      stockless: 'A twentieth-century stockless anchor: a short shank on a massive hinged head with two long blunt flukes.',
      grapnel: 'A four-armed grapnel, small and vicious, the kind thrown from a boat.',
    }),
    pose: choice('How is it set down?', {
      propped: 'Lying where it fell, resting on its stock with one fluke dug in and one in the air.',
      monument: 'Stood upright on a stone block as a harbour memorial.',
      buried: 'Half buried at a slant, the crown and one fluke swallowed by the ground.',
      leaning: 'Leaned against a stout timber mooring post.',
    }),
    chain: score('How much chain is still on it?', ['None, only the ring', 'A few links hanging', 'A length trailing away', 'A long run ending in a heap']),
    coat: choice('What is its surface?', {
      tar: 'Black tar, the working finish.',
      redlead: 'Red lead primer, dull brick red.',
      bare: 'Bare grey forged iron.',
      white: 'Painted white, like one outside a yacht club or a pub.',
    }),
    clings: choice('What clings to it?', {
      nothing: 'Nothing.',
      rust: 'Thick flaking rust.',
      weed: 'Seaweed hanging in dark ribbons.',
      barnacles: 'Barnacles and shell crusting every surface.',
      rope: 'A tangle of old rope and net floats.',
      wreath: 'A wreath of flowers, laid in remembrance.',
    }),
    size: score('How big is it?', ['A dinghy anchor you could carry', 'A fishing boat anchor', 'A ship anchor taller than a person', 'A battleship bower, colossal']),
    plaque: choice('If it stands on a memorial block, what does the plaque say?', {
      lost: 'LOST AT SEA', port: 'HOME PORT', hold: 'HOLD FAST', year: '1912', none: 'There is no plaque.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const w = new Sculpture(context); // everything at reference size, scaled as one
    const A = new Sculpture(context); // the anchor itself: shank up +y, crown at the origin, arms in the xy plane
    s.root.add(w.root);
    w.root.add(A.root);
    const { mood, random } = context;
    const rustAmount = clamp01((a.clings === 'rust' ? 0.75 : a.clings === 'nothing' ? 0.12 : 0.35) + (mood.wear - 0.5) * 0.5);
    const base = { tar: '#2b2d30', redlead: '#8e3b2c', bare: '#70757a', white: '#e4e1d6' }[a.coat];
    const iron = stained(random, base, '#8a4a26', rustAmount, { metalness: a.coat === 'bare' ? 0.5 : 0.15, roughness: mix(0.55, 0.95, rustAmount) });
    const wood = w.material('#6a4a30', { roughness: 0.9 });
    const hosts: THREE.Mesh[] = [];

    const H = a.pattern === 'stockless' ? 1.9 : a.pattern === 'grapnel' ? 1.7 : 2.4;
    const thick = a.pattern === 'stockless' ? 1.5 : 1;
    hosts.push(A.cylinder(0.05 * thick, 0.08 * thick, H, [0, H / 2, 0], iron, 8));
    A.ring(0.14, 0.028, [0, H + 0.11, 0], iron);
    A.cylinder(0.065, 0.065, 0.1, [0, H - 0.02, 0], iron, 8);

    const fluke = (tip: THREE.Vector3, tangent: THREE.Vector3, inward: THREE.Vector3, k = 1) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.3 * k);
      shape.lineTo(0.2 * k, -0.1 * k);
      shape.quadraticCurveTo(0.14 * k, -0.26 * k, 0, -0.28 * k);
      shape.quadraticCurveTo(-0.14 * k, -0.26 * k, -0.2 * k, -0.1 * k);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.04 * k, bevelEnabled: true, bevelSize: 0.012 * k, bevelThickness: 0.012 * k, bevelSegments: 1 });
      geometry.translate(0, 0, -0.02 * k);
      const mesh = A.mesh(geometry, iron);
      const x = new THREE.Vector3().crossVectors(tangent, inward).normalize();
      mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, tangent.clone().normalize(), inward.clone().normalize()));
      mesh.position.copy(tip).addScaledVector(inward, 0.05 * k);
      hosts.push(mesh);
      return mesh;
    };
    const arm = (turn: number, reach = 0.8, rise = 0.62, k = 1) => {
      const group = new Sculpture(context);
      const points: P3[] = [[0, -0.03, 0], [reach * 0.42, 0.02, 0], [reach * 0.8, rise * 0.42, 0], [reach, rise, 0]];
      hosts.push(group.tube(points, 0.062 * k, iron));
      const tangent = new THREE.Vector3(reach * 0.2, rise * 0.58, 0).normalize();
      const inward = new THREE.Vector3(-tangent.y, tangent.x, 0);
      const mesh = fluke(new THREE.Vector3(reach, rise - 0.1 * k, 0), tangent, inward, k);
      group.root.add(mesh);
      group.cylinder(0.01, 0.05 * k, 0.16 * k, [reach + tangent.x * 0.2 * k, rise + tangent.y * 0.2 * k, 0], iron, 6).quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      group.root.rotation.y = turn;
      A.root.add(group.root);
    };

    let stockY = H - 0.28, stockHalf = 0;
    if (a.pattern === 'admiralty' || a.pattern === 'wooden') {
      A.ball([0.12, 0.1, 0.11], [0, 0, 0], iron, 14);
      arm(0);
      arm(Math.PI);
      if (a.pattern === 'admiralty') {
        stockHalf = 1.05;
        hosts.push(A.rod([0, stockY, -stockHalf], [0, stockY, stockHalf], 0.038, iron));
        for (const z of [-1, 1]) A.ball([0.075, 0.075, 0.075], [0, stockY, z * stockHalf], iron, 12);
        A.cylinder(0.07, 0.07, 0.03, [0, stockY, 0.1], iron, 10).rotation.x = Math.PI / 2;
      } else {
        stockHalf = 1.2;
        for (const z of [-1, 1]) {
          const half = A.mesh(new THREE.CylinderGeometry(0.075, 0.14, stockHalf, 4), wood, [0, stockY, z * stockHalf * 0.5]);
          half.rotation.set(z * Math.PI / 2, 0, 0);
          half.rotateY(Math.PI / 4);
          hosts.push(half);
          for (const t of [0.22, 0.55, 0.85]) A.box([0.2 - t * 0.07, 0.2 - t * 0.07, 0.035], [0, stockY, z * stockHalf * t], iron);
        }
      }
    } else if (a.pattern === 'stockless') {
      stockY = H;
      hosts.push(A.box([0.95, 0.3, 0.36], [0, 0.05, 0], iron));
      A.cylinder(0.11, 0.11, 0.42, [0, 0.12, 0], iron, 12).rotation.x = Math.PI / 2;
      const lean = mix(0.5, 0.72, random());
      for (const x of [-1, 1]) {
        const blade = A.mesh(new THREE.CylinderGeometry(0.02, 0.17, 1.05, 4), iron, [x * 0.33, 0.05, 0]);
        blade.geometry.translate(0, 0.52, 0);
        blade.geometry.rotateY(Math.PI / 4);
        blade.scale.set(1, 1, 0.55);
        blade.rotation.x = lean;
        hosts.push(blade);
        A.box([0.1, 0.16, 0.5], [x * 0.52, 0.05, 0], iron);
      }
    } else {
      A.ball([0.1, 0.09, 0.1], [0, 0, 0], iron, 12);
      for (let i = 0; i < 4; i++) arm(i * Math.PI / 2 + Math.PI / 4, 0.55, 0.5, 0.62);
      A.ring(0.09, 0.022, [0, -0.14, 0], iron);
      stockY = H;
    }

    // Pose.
    const R = A.root;
    let post: P3 | null = null;
    if (a.pose === 'monument') {
      const stone = w.material('#a9a698', { roughness: 0.95 });
      w.box([1.5, 0.5, 1.1], [0, 0.25, 0], stone);
      w.box([1.8, 0.16, 1.4], [0, 0.08, 0], stone);
      if (a.plaque !== 'none') w.label({ lost: 'LOST AT SEA', port: 'HOME PORT', hold: 'HOLD FAST', year: '1912' }[a.plaque], 0.95, 0.22, [0, 0.28, 0.556], '#3a2f1c', '#b89a52');
      R.position.set(0, 0.5 + (a.pattern === 'grapnel' ? 0.18 : 0.08), 0);
      R.rotation.set(0, mix(0.2, 0.5, random()), a.pattern === 'stockless' ? 0 : mix(-0.05, 0.05, random()));
    } else if (a.pose === 'propped') {
      if (a.pattern === 'stockless') { R.rotation.set(-Math.PI / 2 + 0.22, 0, 0); R.rotation.z = 0; R.position.set(0, 0.5, H / 2); R.rotation.y = 0.3; }
      else if (a.pattern === 'grapnel') { R.rotation.z = -(Math.PI / 2 + 0.2); R.position.set(-H / 2, 0.42, 0); }
      else {
        const alpha = 0.42;
        R.rotation.z = -(Math.PI / 2 + alpha);
        R.position.set(-H * 0.45, stockY * Math.sin(alpha) + 0.05, 0);
        R.rotation.y = mix(-0.25, 0.25, random());
      }
    } else if (a.pose === 'buried') {
      const lean = mix(0.55, 0.95, random());
      R.rotation.set(mix(-0.2, 0.2, random()), mix(0, 0.6, random()), -lean);
      R.position.set(-0.5, -mix(0.25, 0.5, random()), 0);
      const sand = w.material(mood.warmth > 0.5 ? '#cdb98a' : '#a8a48f', { roughness: 1 });
      w.ball([1.3, 0.2, 1.1], [-0.4, 0, 0], sand, 20);
      w.ball([0.6, 0.12, 0.5], [0.5, 0, 0.6], sand, 14);
    } else {
      const lean = 0.38;
      R.rotation.set(0, mix(-0.3, 0.3, random()), -lean);
      R.position.set(-0.45, a.pattern === 'grapnel' ? 0.35 : 0.1, 0);
      post = [-0.45 + Math.tan(lean) * 1.25 + 0.24, 0, 0];
      w.cylinder(0.17, 0.2, 1.3, [post[0], 0.65, 0], wood, 12);
      w.cylinder(0.2, 0.17, 0.08, [post[0], 1.34, 0], iron, 12);
      w.ring(0.19, 0.03, [post[0], 0.95, 0], w.material('#c9b88a', { roughness: 1 })).rotation.x = Math.PI / 2;
    }
    R.updateMatrix();
    const out = (p: P3) => new THREE.Vector3(...p).applyMatrix4(R.matrix);

    // Chain: hangs from the ring, runs along the ground and may end in a heap.
    if (a.chain > 0.12) {
      const start = out([0, H + 0.24, 0]);
      const ground = 0.028 + (a.pose === 'monument' && Math.hypot(start.x, start.z) < 0.7 ? 0 : 0);
      let heading = Math.hypot(start.x, start.z) > 0.4 ? Math.atan2(start.z, start.x) + mix(-0.5, 0.5, random()) : mix(0.2, 1.3, random());
      const length = mix(0.3, 5, clamp01((a.chain - 0.12) / 0.88));
      const points: THREE.Vector3[] = [start.clone()];
      const cursor = start.clone();
      // Fall to the ground in a short sag.
      const drop = Math.max(start.y - ground, 0);
      const fallSteps = Math.max(2, Math.ceil(drop / 0.3));
      const fallReach = Math.min(drop * 0.35 + 0.25, 1.1);
      let travelled = 0;
      for (let i = 1; i <= fallSteps && travelled < length; i++) {
        const t = i / fallSteps;
        cursor.set(start.x + Math.cos(heading) * fallReach * t * t, mix(start.y, ground, t), start.z + Math.sin(heading) * fallReach * t * t);
        travelled += points[points.length - 1].distanceTo(cursor);
        points.push(cursor.clone());
      }
      const steps = Math.floor(Math.max(length - travelled, 0) / 0.25);
      const spin = random() < 0.5 ? -1 : 1;
      for (let i = 0; i < steps; i++) {
        const t = i / Math.max(steps, 1);
        heading += spin * (0.22 + 1.1 * t * t) + (random() - 0.5) * 0.3;
        cursor.x += Math.cos(heading) * 0.25;
        cursor.z += Math.sin(heading) * 0.25;
        cursor.y = ground + (t > 0.6 ? (t - 0.6) * 0.5 : 0) + random() * 0.02;
        points.push(cursor.clone());
      }
      if (points.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
        const count = Math.max(2, Math.round(curve.getLength() / 0.13));
        const geometry = new THREE.TorusGeometry(0.056, 0.019, 6, 12);
        geometry.scale(1.5, 1, 1);
        const links = new THREE.InstancedMesh(geometry, iron, count);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), roll = new THREE.Quaternion(), x = new THREE.Vector3(1, 0, 0), one = new THREE.Vector3(1, 1, 1);
        for (let i = 0; i < count; i++) {
          const u = count === 1 ? 0 : i / (count - 1);
          const tangent = curve.getTangentAt(u).normalize();
          q.setFromUnitVectors(x, tangent);
          roll.setFromAxisAngle(x, (i % 2 ? 1 : -1) * Math.PI / 4 + (random() - 0.5) * 0.4);
          m.compose(curve.getPointAt(u), q.multiply(roll), one);
          links.setMatrixAt(i, m);
        }
        links.castShadow = links.receiveShadow = true;
        w.root.add(links);
      }
    }

    // What clings.
    if (a.clings === 'barnacles') {
      encrust(w, hosts, mix(160, 420, mood.wear) * mix(0.7, 1.2, mood.density), 0.035);
      encrust(w, hosts, 14, 0.055, ['#8c5a44', '#93784a', '#5f7350'], 'blob');
    } else if (a.clings === 'weed') {
      const weeds = [w.material('#3d4a22', { roughness: 0.6, side: THREE.DoubleSide }), w.material('#5a5a26', { roughness: 0.6, side: THREE.DoubleSide }), w.material('#2f3d2a', { roughness: 0.6, side: THREE.DoubleSide })];
      const anchors: P3[] = [];
      for (let i = 0; i < 14; i++) anchors.push([0, mix(0.3, H, random()), 0]);
      if (stockHalf) for (let i = 0; i < 16; i++) anchors.push([0, stockY, mix(-stockHalf, stockHalf, random())]);
      if (stockHalf) for (const x of [-0.78, 0.78, -0.55, 0.55, -0.3, 0.3]) anchors.push([x, x * x * 0.9, 0]);
      const count = Math.round(mix(14, anchors.length, mood.density));
      for (let i = 0; i < count; i++) {
        const top = out(anchors[(i * 7) % anchors.length]);
        if (top.y < 0.25) continue;
        const fall = Math.min(top.y - 0.02, mix(0.25, 0.95, random()));
        const sx = (random() - 0.5) * 0.28, sz = (random() - 0.5) * 0.28;
        const ribbon = w.tube([
          [top.x, top.y + 0.05, top.z],
          [top.x + sx * 0.5, top.y - fall * 0.3, top.z + sz * 0.6 + 0.04],
          [top.x - sx * 0.3, top.y - fall * 0.65, top.z + sz * 0.2],
          [top.x + sx, top.y - fall, top.z + sz],
        ], 0.02 + random() * 0.014, weeds[i % 3]);
        ribbon.castShadow = true;
      }
    } else if (a.clings === 'rope') {
      const rope = w.material('#b9a877', { roughness: 1 });
      const wrap: P3[] = [];
      const y0 = H * mix(0.3, 0.5, random());
      for (let i = 0; i <= 30; i++) wrap.push([Math.cos(i * 0.7) * 0.1, y0 + i * 0.016, Math.sin(i * 0.7) * 0.1]);
      A.tube(wrap, 0.022, rope);
      const end = out(wrap[0]);
      const trail: P3[] = [[end.x, end.y, end.z]];
      let hx = end.x, hz = end.z, heading = random() * 6.283;
      for (let i = 0; i < 9; i++) { heading += 0.8 + random() * 0.5; hx += Math.cos(heading) * 0.3; hz += Math.sin(heading) * 0.3 + 0.08; trail.push([hx, i === 0 ? Math.max(end.y * 0.4, 0.03) : 0.03, hz]); }
      w.tube(trail, 0.022, rope);
      const floats = ['#e2632a', '#e8d9a8', '#2f6f8a'];
      for (let i = 0; i < 3 + Math.floor(mood.density * 4); i++) {
        const p = trail[2 + (i * 2) % (trail.length - 2)];
        w.ball([0.085, 0.085, 0.085], [p[0] + (random() - 0.5) * 0.1, 0.085, p[2] + (random() - 0.5) * 0.1], w.material(floats[i % 3], { roughness: 0.6 }), 12);
      }
    } else if (a.clings === 'wreath') {
      const centre = a.pose === 'monument' ? new THREE.Vector3(0, 0.36, 0.62) : out([0, H * 0.55, 0]).setY(0).add(new THREE.Vector3(0, 0.3, 0.55));
      const wreath = new Sculpture(context);
      wreath.ring(0.3, 0.07, [0, 0, 0], w.material('#35582f', { roughness: 0.9 }));
      const petals = mood.cheer > 0.5 ? ['#f2efe6', '#e8b53a', '#e27a8f'] : ['#c2272d', '#f2efe6', '#a31e24'];
      wreath.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, flatShading: true }),
        Array.from({ length: 16 }, (_u, i) => {
          const t = (i / 16) * 6.283 + random() * 0.2;
          return { at: [Math.cos(t) * 0.3, Math.sin(t) * 0.3, 0.06 + random() * 0.02] as P3, size: 0.05 + random() * 0.025, color: petals[Math.floor(random() * petals.length)] };
        }));
      wreath.box([0.09, 0.3, 0.01], [0.04, -0.4, 0.05], w.material('#e9e4d4')).rotation.z = 0.2;
      wreath.box([0.09, 0.3, 0.01], [-0.04, -0.4, 0.05], w.material('#e9e4d4')).rotation.z = -0.2;
      wreath.root.position.copy(centre);
      wreath.root.rotation.x = -0.35;
      w.root.add(wreath.root);
    }

    w.root.scale.setScalar(mix(0.32, 1.7, a.size) * (a.pattern === 'grapnel' ? 0.75 : 1));
    const thing = s.finish();
    // Keep true ground: whatever is built below y = 0 (a dug-in fluke, a buried crown) stays buried.
    thing.object.position.y = 0;
    return thing;
  },
});
