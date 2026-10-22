import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const COLOURS = {
  orange: 'Burnt orange-red polypropylene, the classic assembly-hall chair.',
  blue: 'Royal blue, every one the same.',
  green: 'Bottle green, slightly institutional.',
  grey: 'Charcoal grey, an exam hall.',
  primary: 'A jumble of red, yellow, blue and green, an infant school.',
  pastel: 'Faded pastels: mint, lemon, pink and sky.',
  twotone: 'Mostly one dull colour with the odd bright replacement.',
} as const;
const SHADES: Record<keyof typeof COLOURS, string[]> = {
  orange: ['#d2532a'], blue: ['#2c56a8'], green: ['#2f6a48'], grey: ['#4a4f56'],
  primary: ['#d8352c', '#f0c020', '#2c66c8', '#2f9a52'], pastel: ['#a9dcc4', '#f0e39a', '#f0b6c8', '#a9cfee'],
  twotone: ['#6a6f76', '#6a6f76', '#6a6f76', '#6a6f76', '#f0a020', '#d8352c'],
};

interface Seat { at: [number, number, number]; turn: [number, number, number]; colour: string; scale: number }

export default defineThing({
  questions: {
    colour: choice('What colour are the chairs?', COLOURS),
    style: choice('What kind of chair is it?', {
      poly: 'A one-piece moulded plastic shell with a hand slot in the back, on splayed steel tube legs.',
      ply: 'An older chair: a curved plywood seat and back board on a painted steel frame.',
    }),
    size: choice('Whose chairs are they?', {
      infant: 'Tiny infant-school chairs, knee high to an adult.',
      junior: 'Junior-school chairs, a little small.',
      senior: 'Full-size secondary-school chairs.',
    }),
    height: score('How high are the stacks?', ['Two or three chairs', 'Five or six', 'Eight', 'A teetering dozen']),
    state: choice('What state are the stacks in?', {
      neat: 'Squared up neatly by a careful caretaker.',
      leaning: 'Leaning and twisted, thrown together in a hurry.',
      collapsed: 'One tower has slid over and spilled chairs across the floor.',
      unfinished: 'Half done: several chairs still stand loose, waiting to be stacked.',
    }),
    desk: choice('Are any chairs upturned on a desk for the cleaners?', {
      none: 'No desk; just the stacks.',
      one: 'One double desk with two chairs upturned on top, legs in the air.',
      two: 'Two desks pushed together carrying four upturned chairs.',
    }),
    lone: choice('Has one chair been left out on its own?', {
      none: 'No; every chair is accounted for.',
      away: 'One chair stands apart with its back to the others, as if facing a window.',
      fallen: 'One chair lies on its side where it was knocked over.',
      small: 'One much smaller chair sits beside the towers, from a younger class.',
      jumper: 'One chair stands apart with a forgotten jumper hung on its back.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const K = { infant: 0.62, junior: 0.8, senior: 1 }[a.size];
    const SEAT = 0.44, PITCH = a.style === 'poly' ? 0.085 : 0.1;

    // One chair, in three merged geometries: shell, frame and the dark hand slot.
    const rodGeometry = (from: [number, number, number], to: [number, number, number], radius: number) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
      const geometry = new THREE.CylinderGeometry(radius, radius, d.length(), 8);
      const m = new THREE.Matrix4().compose(p.add(q).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1));
      return geometry.applyMatrix4(m);
    };
    const boxGeometry = (size: [number, number, number], at: [number, number, number], tilt = 0) => new THREE.BoxGeometry(...size).applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)), new THREE.Vector3(1, 1, 1)));
    const frameParts: THREE.BufferGeometry[] = [];
    const shellParts: THREE.BufferGeometry[] = [];
    const R = 0.011;
    for (const side of [-1, 1]) {
      frameParts.push(rodGeometry([side * 0.155, SEAT - 0.012, 0.13], [side * 0.2, 0, 0.21], R), rodGeometry([side * 0.155, SEAT - 0.012, -0.12], [side * 0.2, 0, -0.22], R));
      frameParts.push(rodGeometry([side * 0.155, SEAT - 0.012, 0.13], [side * 0.155, SEAT - 0.012, -0.12], R));
    }
    frameParts.push(rodGeometry([-0.155, SEAT - 0.012, 0.13], [0.155, SEAT - 0.012, 0.13], R), rodGeometry([-0.155, SEAT - 0.012, -0.12], [0.155, SEAT - 0.012, -0.12], R));
    let slot: THREE.BufferGeometry | null = null;
    if (a.style === 'poly') {
      const line: [number, number][] = [[0.215, 0.415], [0.19, 0.436], [0.12, 0.443], [-0.08, 0.432], [-0.15, 0.44], [-0.19, 0.475], [-0.208, 0.54], [-0.222, 0.66], [-0.245, 0.8], [-0.262, 0.83]];
      const t = 0.014;
      const offset = line.map(([u, v], i) => {
        const [pu, pv] = line[Math.max(0, i - 1)], [nu, nv] = line[Math.min(line.length - 1, i + 1)];
        const du = nu - pu, dv = nv - pv, l = Math.hypot(du, dv);
        return [u + dv / l * t, v - du / l * t] as [number, number];
      });
      const shape = new THREE.Shape();
      line.forEach(([u, v], i) => (i ? shape.lineTo(u, v) : shape.moveTo(u, v)));
      offset.reverse().forEach(([u, v]) => shape.lineTo(u, v));
      shape.closePath();
      const shell = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false });
      shell.rotateY(-Math.PI / 2); shell.translate(0.2, 0, 0);
      shellParts.push(shell);
      slot = boxGeometry([0.13, 0.035, 0.022], [0, 0.6, -0.2165], -0.12);
    } else {
      shellParts.push(boxGeometry([0.38, 0.016, 0.36], [0, SEAT, 0.02], 0.03), boxGeometry([0.38, 0.17, 0.014], [0, 0.72, -0.2], -0.14));
      shellParts.push(boxGeometry([0.38, 0.016, 0.05], [0, SEAT - 0.012, 0.205], 0.5));
      for (const side of [-1, 1]) frameParts.push(rodGeometry([side * 0.155, SEAT - 0.012, -0.12], [side * 0.155, 0.8, -0.215], R));
    }
    const shellGeometry = mergeGeometries(shellParts.map((g) => g.toNonIndexed()))!;
    const frameGeometry = mergeGeometries(frameParts.map((g) => g.toNonIndexed()))!;
    for (const g of [...shellParts, ...frameParts]) g.dispose();

    const seats: Seat[] = [];
    const palette = SHADES[a.colour];
    const woods = ['#c9a064', '#b98c50', '#d4ad72'];
    const pick = () => {
      const base = new THREE.Color(a.style === 'ply' ? woods[Math.floor(random() * woods.length)] : palette[Math.floor(random() * palette.length)]);
      base.lerp(new THREE.Color('#9a9488'), wear * (0.15 + random() * 0.3)).offsetHSL(0, 0, (random() - 0.5) * 0.04);
      return `#${base.getHexString()}`;
    };
    const push = (at: [number, number, number], turn: [number, number, number], scale = K) => seats.push({ at, turn, colour: pick(), scale });

    // Towers.
    const towers = Math.max(1, Math.round(mix(1, 5, mood.density)));
    const spacing = 0.56 * K;
    const lean = a.state === 'leaning' ? 1 : a.state === 'neat' ? 0.08 : 0.35;
    const spilt = a.state === 'collapsed' ? Math.floor(random() * towers) : -1;
    const loose: [number, number][] = [];
    for (let i = 0; i < towers; i++) {
      const row = towers > 3 && i >= Math.ceil(towers / 2) ? 1 : 0;
      const inRow = row ? i - Math.ceil(towers / 2) : i, rowCount = towers > 3 ? (row ? towers - Math.ceil(towers / 2) : Math.ceil(towers / 2)) : towers;
      const x = (inRow - (rowCount - 1) / 2) * spacing + (random() - 0.5) * 0.05 * lean, z = -row * 0.6 * K + (random() - 0.5) * 0.08 * lean;
      let count = Math.max(2, Math.round(mix(2.4, 12, a.height) + (random() - 0.5) * mix(1, 4, a.height)));
      if (i === spilt) { const fallen = Math.max(1, Math.min(count - 1, Math.floor(count * 0.6))); count -= fallen; for (let k = 0; k < fallen; k++) loose.push([x, z]); }
      if (a.state === 'unfinished' && i === towers - 1) count = Math.max(1, Math.floor(count / 3));
      const yaw = (random() - 0.5) * 0.5 * lean, dx = (random() - 0.5) * 0.02 * lean, dz = 0.012 + random() * 0.012 * lean;
      for (let k = 0; k < count; k++) push([x + dx * k * K, k * PITCH * K, z + dz * k * K], [(random() - 0.5) * 0.03 * lean, yaw + (random() - 0.5) * 0.12 * lean, (random() - 0.5) * 0.03 * lean]);
    }
    const half = (towers > 3 ? Math.ceil(towers / 2) : towers) * spacing / 2;
    // Spilled chairs lie on their sides and backs in front of the towers.
    loose.forEach(([x], k) => {
      const onBack = random() < 0.35;
      const px = x + (random() - 0.5) * 0.5 + (k % 2 ? 0.25 : -0.25) * K, pz = 0.55 * K + k * 0.33 * K + random() * 0.1;
      if (onBack) push([px, 0.262 * K, pz + 0.3 * K], [-Math.PI / 2 - 0.08, 0, (random() - 0.5) * 1.2]);
      else push([px + 0.2 * K, 0.2 * K, pz], [0, (random() - 0.5) * 2.4, Math.PI / 2]);
    });
    if (a.state === 'unfinished') {
      const n = 3 + Math.floor(random() * 3);
      for (let k = 0; k < n; k++) push([half + 0.35 * K + (k % 2) * 0.55 * K + (random() - 0.5) * 0.1, 0, 0.1 + Math.floor(k / 2) * 0.6 * K + (random() - 0.5) * 0.15], [0, (random() - 0.5) * 1.6, 0]);
    }

    // The desk for the cleaners.
    const steel = s.material('#8f969a', { metalness: 0.7, roughness: 0.4 });
    const desks = a.desk === 'none' ? 0 : a.desk === 'one' ? 1 : 2;
    const deskH = 0.72 * K + 0.02, deskW = 1.1 * K, deskD = 0.5 * K;
    const deskX0 = -half - 0.2 * K - deskW / 2 - (desks === 2 ? deskW : 0);
    for (let d = 0; d < desks; d++) {
      const cx = deskX0 + d * (deskW + 0.01), cz = -0.05;
      s.box([deskW, 0.025, deskD], [cx, deskH - 0.0125, cz], s.material(a.style === 'ply' ? '#b98c50' : '#d9d2bd', { roughness: 0.5 }));
      s.box([deskW - 0.12, 0.012, deskD - 0.1], [cx, deskH - 0.14 * K, cz], s.material('#6a7076', { metalness: 0.5 }));
      for (const sx of [-1, 1]) {
        const lx = cx + sx * (deskW / 2 - 0.05);
        for (const sz of [-1, 1]) s.rod([lx, deskH - 0.025, cz + sz * (deskD / 2 - 0.05)], [lx, 0, cz + sz * (deskD / 2 - 0.03)], 0.012, steel);
        s.rod([lx, 0.12 * K, cz - deskD / 2 + 0.04], [lx, 0.12 * K, cz + deskD / 2 - 0.04], 0.01, steel);
      }
      for (const sx of [-1, 1]) push([cx + sx * deskW * 0.24 + (random() - 0.5) * 0.04, deskH + (SEAT + 0.004) * K, cz + 0.035 * K], [Math.PI, (random() - 0.5) * 0.12, 0]);
    }

    // The one left out.
    const loneX = half + (a.state === 'unfinished' ? 1.5 : 0.5) * K, loneZ = (a.state === 'collapsed' ? 0.1 : 0.75) * K;
    if (a.lone === 'away') push([loneX, 0, loneZ], [0, Math.PI * mix(0.8, 1.15, random()), 0]);
    if (a.lone === 'fallen') push([loneX + 0.2 * K, 0.2 * K, loneZ], [0, 0.7 + random(), Math.PI / 2]);
    if (a.lone === 'small') push([loneX - 0.25 * K, 0, loneZ * 0.7], [0, 0.5 + (random() - 0.5) * 0.6, 0], K * 0.6);
    if (a.lone === 'jumper') {
      const turn = 0.5 + (random() - 0.5) * 0.5;
      push([loneX, 0, loneZ], [0, turn, 0]);
      const wool = s.material(['#7a1f2a', '#1f3f7a', '#2f6a45', '#55595f'][Math.floor(random() * 4)], { roughness: 1 });
      const g = new THREE.Group();
      g.position.set(loneX, 0, loneZ); g.rotation.y = turn; g.scale.setScalar(K);
      const add = (size: [number, number, number], at: [number, number, number], rx = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), wool); m.position.set(...at); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); };
      add([0.36, 0.3, 0.03], [0, 0.7, -0.265], -0.12);
      add([0.36, 0.14, 0.03], [0, 0.78, -0.215], -0.12);
      add([0.38, 0.035, 0.085], [0, 0.85, -0.25]);
      add([0.09, 0.36, 0.03], [-0.2, 0.6, -0.275], -0.1, 0.12);
      add([0.09, 0.3, 0.03], [0.2, 0.63, -0.275], -0.1, -0.2);
      s.root.add(g);
    }

    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, coloured: boolean) => {
      const mesh = new THREE.InstancedMesh(geometry, material, seats.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      seats.forEach((seat, i) => {
        m.compose(new THREE.Vector3(...seat.at), q.setFromEuler(new THREE.Euler(...seat.turn)), new THREE.Vector3(seat.scale, seat.scale, seat.scale));
        mesh.setMatrixAt(i, m);
        if (coloured) mesh.setColorAt(i, new THREE.Color(seat.colour));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      s.root.add(mesh);
      return mesh;
    };
    const frameColour = a.style === 'ply' ? new THREE.Color(palette[0]).lerp(new THREE.Color('#8b8275'), wear * 0.3) : new THREE.Color(wear > 0.6 ? '#6f6a62' : '#3a3d42');
    instanced(shellGeometry, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: a.style === 'ply' ? 0.55 : 0.42 + wear * 0.3 }), true);
    instanced(frameGeometry, new THREE.MeshStandardMaterial({ color: frameColour, metalness: a.style === 'ply' ? 0.2 : 0.6, roughness: 0.45 }), false);
    if (slot) instanced(slot, new THREE.MeshStandardMaterial({ color: '#17181a', roughness: 0.9 }), false);

    return s.finish();
  },
});
