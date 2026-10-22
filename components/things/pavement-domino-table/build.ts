import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = readonly [number, number, number];
const PIPS: readonly (readonly number[])[] = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8], [0, 2, 3, 4, 5, 6, 8], [0, 1, 2, 3, 5, 6, 7, 8], [0, 1, 2, 3, 4, 5, 6, 7, 8]];
const CHAIRS = ['wood', 'folding', 'plastic', 'crate', 'stool', 'bucket'] as const;

export default defineThing({
  questions: {
    table: choice('What is the game being played on?', {
      domino: 'A proper wooden domino table with a raised rack along each side and a cup well in every corner.',
      folding: 'A square folding card table on crossed metal legs with a green baize top.',
      kitchen: 'A painted kitchen table carried out of the house, chipped pale blue.',
      crates: 'A sheet of plywood laid across stacked plastic beer crates.',
    }),
    state: choice('What is happening in the game right now?', {
      mid: 'Mid-play: a snake of tiles across the table, every hand still standing, nobody speaking.',
      slam: 'A tile has just been slammed down: tiles jumped, a glass went over, somebody is on their feet.',
      shuffle: 'Between hands: every tile face down in a stirred heap in the middle.',
      won: 'The hand is over: one rack empty, the losers\' tiles laid face up to be counted.',
      abandoned: 'Abandoned mid-game: hands toppled, tiles dropped on the ground, nobody came back.',
    }),
    chairs: choice('How have the four chairs been left?', {
      tucked: 'Pushed in tight against the table, waiting for the evening.',
      seated: 'At playing distance, each turned a little, as if the players are still in them.',
      back: 'Shoved well back from the table, everyone just stood up at once.',
      over: 'At playing distance, but one has gone over backwards onto the pavement.',
    }),
    drink: choice('What is being drunk?', {
      rum: 'A bottle of dark rum and four small glasses.',
      beer: 'Brown beer bottles, some empty, some sweating.',
      coffee: 'Thimble cups of sweet black coffee and a dented thermos.',
      refresco: 'Bright fizzy soda in a big plastic bottle with plastic cups.',
      nothing: 'Nothing but a jug of water.',
    }),
    smoke: choice('What is in the ashtray?', {
      cigar: 'A fat cigar still burning, a thread of smoke rising.',
      butts: 'A heap of cigarette butts and a crushed pack beside it.',
      clean: 'It is empty and wiped clean.',
    }),
    stakes: choice('What is being played for?', {
      pride: 'Nothing on the table but pride.',
      pesos: 'A few crumpled notes and coins in the middle.',
      score: 'A school notebook and a pencil stub keeping the score.',
      matches: 'A little pile of matchsticks in front of each player.',
    }),
    beside: choice('What is beside the table?', {
      nothing: 'Nothing.',
      radio: 'A transistor radio on an upturned crate, aerial up.',
      dog: 'A street dog asleep underneath.',
      spare: 'A fifth chair for whoever is waiting to play the winner.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const bright = (hues: readonly string[]) => { const c = new THREE.Color(pick(hues)); c.offsetHSL(0, mix(-0.3, 0.05, mood.cheer), 0); return s.material(c, { roughness: 0.7 }); };
    const wood = s.material('#8a5a34'), darkWood = s.material('#4f321d'), steel = s.material('#8e9494', { metalness: 0.6, roughness: 0.45 }), dark = s.material('#222222');
    const put = (group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, at: P, rot?: P) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      if (rot) mesh.rotation.set(...rot);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const bar = (group: THREE.Group, from: P, to: P, radius: number, material: THREE.Material) => {
      const u = new THREE.Vector3(...from), v = new THREE.Vector3(...to), d = v.clone().sub(u);
      const mesh = put(group, new THREE.CylinderGeometry(radius, radius, d.length(), 8), material, u.add(v).multiplyScalar(0.5).toArray() as [number, number, number]);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    };

    // The table.
    const half = { domino: 0.44, folding: 0.41, kitchen: 0.45, crates: 0.5 }[a.table];
    const topY = { domino: 0.74, folding: 0.7, kitchen: 0.76, crates: 0.64 }[a.table];
    const wobble = mood.wear * 0.02;
    if (a.table === 'domino') {
      s.box([half * 2, 0.04, half * 2], [0, topY - 0.02, 0], s.material('#6f4526'));
      for (let i = 0; i < 4; i++) {
        const rack = s.box([half * 2 - 0.24, 0.035, 0.07], [Math.sin(i * Math.PI / 2) * (half - 0.035), topY + 0.017, Math.cos(i * Math.PI / 2) * (half - 0.035)], darkWood);
        rack.rotation.y = i * Math.PI / 2;
        const cx = (i < 2 ? 1 : -1) * (half - 0.06), cz = (i % 2 ? 1 : -1) * (half - 0.06);
        s.cylinder(0.05, 0.05, 0.036, [cx, topY + 0.018, cz], darkWood, 16);
        s.box([0.06, topY - 0.04, 0.06], [cx * 0.92, (topY - 0.04) / 2, cz * 0.92], wood);
      }
      s.box([half * 2 - 0.1, 0.08, half * 2 - 0.1], [0, topY - 0.08, 0], wood);
    } else if (a.table === 'folding') {
      s.box([half * 2, 0.03, half * 2], [0, topY - 0.015, 0], s.material('#2e6b45', { roughness: 0.95 }));
      s.box([half * 2 + 0.02, 0.022, half * 2 + 0.02], [0, topY - 0.03, 0], steel);
      for (const x of [-1, 1]) {
        s.rod([x * (half - 0.05), 0, -half + 0.05], [x * (half - 0.05), topY - 0.04, half - 0.05], 0.013, steel);
        s.rod([x * (half - 0.05), 0, half - 0.05], [x * (half - 0.05), topY - 0.04, -half + 0.05], 0.013, steel);
      }
      for (const z of [-1, 1]) s.rod([-half + 0.05, 0.02, z * (half - 0.05)], [half - 0.05, 0.02, z * (half - 0.05)], 0.011, steel);
    } else if (a.table === 'kitchen') {
      const blue = s.material(mood.wear > 0.5 ? '#9db3b5' : '#8fc1cf');
      s.box([half * 2, 0.035, half * 2 - 0.12], [0, topY - 0.018, 0], blue);
      s.box([half * 2 - 0.12, 0.1, half * 2 - 0.24], [0, topY - 0.085, 0], blue);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.03, 0.02, topY - 0.03, [x * (half - 0.08), (topY - 0.03) / 2, z * (half - 0.14)], blue, 10).rotation.z = x * wobble;
    } else {
      s.box([half * 2, 0.02, half * 2 - 0.14], [0, topY - 0.01, 0], s.material('#b8925e')).rotation.z = wobble * 0.6;
      for (const x of [-1, 1]) for (let level = 0; level < 2; level++) {
        const crate = bright(['#c22d2a', '#e0a81c', '#2b6a3c', '#1d4f9a']);
        s.box([0.3, 0.3, 0.4], [x * (half - 0.2), 0.155 + level * 0.31, (random() - 0.5) * 0.06], crate).rotation.y = (random() - 0.5) * 0.2;
        for (let slot = 0; slot < 3; slot++) s.box([0.31, 0.05, 0.08], [x * (half - 0.2), 0.2 + level * 0.31, -0.12 + slot * 0.12], dark);
      }
    }
    const inner = half - (a.table === 'domino' ? 0.1 : 0.05);

    // Dominoes: instanced tiles, divider lines and pips.
    const tiles: THREE.Matrix4[] = [], lines: THREE.Matrix4[] = [], dots: THREE.Matrix4[] = [];
    const tile = (matrix: THREE.Matrix4, values?: readonly [number, number]) => {
      tiles.push(matrix);
      if (!values) return;
      lines.push(matrix.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.0056, 0)));
      values.forEach((value, side) => {
        for (const index of PIPS[value]) dots.push(matrix.clone().multiply(new THREE.Matrix4().makeTranslation((side ? 1 : -1) * 0.0125 + (index % 3 - 1) * 0.0068, 0.0056, (Math.floor(index / 3) - 1) * 0.0068)));
      });
    };
    const flat = (x: number, z: number, yaw: number, values?: readonly [number, number], y = topY + 0.0055, tilt = 0) =>
      tile(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(values ? tilt : Math.PI + tilt, yaw, 0, 'YXZ')), new THREE.Vector3(1, 1, 1)), values);
    const value = () => Math.floor(random() * 10);
    const jump = a.state === 'slam' ? mix(0.3, 1, mood.energy) : 0;

    if (a.state === 'shuffle') {
      const count = Math.round(mix(26, 55, mood.density));
      for (let i = 0; i < count; i++) { const r = Math.sqrt(random()) * inner * 0.72, t = random() * 6.283; flat(Math.cos(t) * r, Math.sin(t) * r, random() * 6.283); }
    } else {
      // A chain that runs out from the centre and turns left whenever it nears the edge.
      const length = Math.round(mix(7, 19, a.state === 'won' ? 0.9 : random()));
      let x = -inner * 0.5, z = (random() - 0.5) * 0.1, heading = 0, last = value();
      for (let i = 0; i < length; i++) {
        const dx = Math.cos(heading), dz = -Math.sin(heading);
        if (Math.abs(x + dx * 0.09) > inner - 0.09 || Math.abs(z + dz * 0.09) > inner - 0.12) {
          heading += Math.PI / 2;
          x += dx * 0.014 + Math.cos(heading) * 0.014; z += dz * 0.014 - Math.sin(heading) * 0.014;
          continue;
        }
        const double = random() < 0.16, next = double ? last : value(), span = double ? 0.027 : 0.052;
        const end = i === length - 1, wild = jump * (end ? 1 : Math.max(0, 1 - (length - 1 - i) / 4));
        flat(x + dx * span / 2 + (random() - 0.5) * (0.004 + wild * 0.03), z + dz * span / 2 + (random() - 0.5) * (0.004 + wild * 0.03), heading + (double ? Math.PI / 2 : 0) + (random() - 0.5) * (0.06 + wild * 1.2), [last, next], topY + 0.0055 + (end ? 0 : wild * 0.012 * random()), end ? 0 : wild * (random() - 0.5) * 0.6);
        x += dx * span; z += dz * span; last = next;
      }
    }
    const empty = a.state === 'won' ? Math.floor(random() * 4) : -1;
    for (let player = 0; player < 4; player++) {
      if (a.state === 'shuffle' || player === empty) continue;
      const phi = player * Math.PI / 2, u = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi)), t = new THREE.Vector3(Math.cos(phi), 0, -Math.sin(phi));
      const count = a.state === 'won' ? 1 + Math.floor(random() * 4) : 2 + Math.floor(random() * 7);
      const reach = a.table === 'domino' ? half - 0.035 : half - 0.07, base = a.table === 'domino' ? topY + 0.035 : topY;
      for (let i = 0; i < count; i++) {
        const along = (i - (count - 1) / 2) * 0.054;
        const fallen = a.state === 'won' || (a.state === 'abandoned' && random() < 0.6) || (jump > 0 && random() < jump * 0.3);
        if (fallen) flat(u.x * (reach - 0.06) + t.x * along, u.z * (reach - 0.06) + t.z * along, phi + Math.PI / 2 + (random() - 0.5) * 0.5, [value(), value()]);
        else {
          const lean = new THREE.Matrix4().makeRotationAxis(t, -0.12);
          const basis = new THREE.Matrix4().makeBasis(t, u, new THREE.Vector3(0, -1, 0)).premultiply(lean);
          basis.setPosition(u.x * reach + t.x * along, base + 0.0125, u.z * reach + t.z * along);
          tile(basis, [value(), value()]);
        }
      }
    }
    if (a.state === 'abandoned' || jump > 0.6) for (let i = 0; i < 3 + Math.floor(random() * 4); i++) { const t = random() * 6.283, r = half + 0.05 + random() * 0.3; flat(Math.cos(t) * r, Math.sin(t) * r, random() * 6, random() < 0.5 ? [value(), value()] : undefined, 0.006); }
    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, matrices: readonly THREE.Matrix4[]) => {
      if (!matrices.length) return;
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    };
    instanced(new THREE.BoxGeometry(0.05, 0.011, 0.025), s.material(mood.wear > 0.6 ? '#e3d6b4' : '#f5efe0', { roughness: 0.35 }), tiles);
    instanced(new THREE.BoxGeometry(0.0016, 0.0012, 0.021), dark, lines);
    instanced(new THREE.CylinderGeometry(0.0024, 0.0024, 0.0012, 8), dark, dots);

    // Drinks, one corner per player.
    const corner = (index: number, inset = 0.06): P => [(index < 2 ? 1 : -1) * (half - inset), a.table === 'domino' ? topY : topY, (index % 2 ? 1 : -1) * (half - inset)];
    const tipped = jump > 0 ? Math.floor(random() * 4) : -1;
    const liquid = { rum: '#a8581c', beer: '#c98a1e', coffee: '#2a160c', refresco: pick(['#ff5a1f', '#e02a5a', '#39c24a']), nothing: '#cfe6ee' }[a.drink];
    const drinkPaint = s.material(liquid, { roughness: 0.25 });
    const glassy = s.material('#dfe9ea', { roughness: 0.15, metalness: 0.1 });
    for (let i = 0; i < 4; i++) {
      const [x, y, z] = corner(i, a.table === 'domino' ? 0.06 : 0.09 + random() * 0.04);
      if (a.drink === 'beer') {
        const bottle = s.lathe([[0, 0], [0.03, 0], [0.03, 0.13], [0.012, 0.19], [0.013, 0.23], [0, 0.23]], s.material('#5a3415', { roughness: 0.25 }), [x, y, z]);
        if (i === tipped) { bottle.rotation.z = Math.PI / 2; bottle.position.y += 0.03; }
        continue;
      }
      const size = a.drink === 'coffee' ? 0.6 : a.drink === 'refresco' ? 1.25 : 1;
      const cup = s.cylinder(0.03 * size, 0.024 * size, 0.07 * size, [x, y + 0.035 * size, z], a.drink === 'coffee' ? s.material('#f3efe6') : a.drink === 'refresco' ? s.material('#f4f4f0') : glassy, 14);
      if (i === tipped) {
        cup.rotation.z = Math.PI / 2; cup.position.y = y + 0.03 * size; cup.position.x -= Math.sign(x) * 0.08;
        s.cylinder(0.07, 0.08, 0.003, [x - Math.sign(x) * 0.17, topY + 0.002, z - Math.sign(z) * 0.03], drinkPaint, 14).scale.z = 0.6;
      } else if (a.state !== 'abandoned' || random() < 0.4) s.cylinder(0.027 * size, 0.024 * size, 0.004, [x, y + 0.07 * size * mix(0.3, 0.85, random()), z], drinkPaint, 14);
    }
    const bx = (random() < 0.5 ? -1 : 1) * (inner - 0.08), bz = (random() - 0.5) * 0.2;
    if (a.drink === 'rum') {
      s.lathe([[0, 0], [0.038, 0], [0.038, 0.16], [0.014, 0.22], [0.014, 0.27], [0, 0.27]], s.material('#7a3d12', { roughness: 0.2 }), [bx, topY, bz]);
      s.cylinder(0.039, 0.039, 0.07, [bx, topY + 0.08, bz], s.material('#f0e6c8'), 16);
      s.cylinder(0.016, 0.016, 0.02, [bx, topY + 0.28, bz], s.material('#b8201c'), 10);
    } else if (a.drink === 'coffee') {
      s.cylinder(0.04, 0.045, 0.24, [bx, topY + 0.12, bz], s.material('#3f6f5a', { metalness: 0.4 }), 16);
      s.cylinder(0.03, 0.04, 0.05, [bx, topY + 0.265, bz], steel, 16);
    } else if (a.drink === 'refresco') {
      s.lathe([[0, 0], [0.05, 0], [0.052, 0.2], [0.02, 0.29], [0.02, 0.32], [0, 0.32]], drinkPaint, [bx, topY, bz]);
      s.cylinder(0.022, 0.022, 0.02, [bx, topY + 0.33, bz], s.material('#f3f3f3'), 10);
    } else if (a.drink === 'nothing') {
      s.lathe([[0, 0], [0.06, 0], [0.075, 0.12], [0.05, 0.2], [0.058, 0.23]], s.material('#b9d8e2', { roughness: 0.15, side: THREE.DoubleSide }), [bx, topY, bz]);
      s.ring(0.045, 0.008, [bx + 0.09, topY + 0.13, bz], s.material('#b9d8e2'), Math.PI).rotation.z = -Math.PI / 2;
    }

    // Ashtray.
    const ax = -bx * 0.9, az = (random() - 0.5) * 0.25 + 0.12;
    s.lathe([[0, 0.006], [0.05, 0.006], [0.062, 0.028], [0.055, 0.028], [0.045, 0.012], [0, 0.012]], s.material('#c8d0c6', { roughness: 0.2, side: THREE.DoubleSide }), [ax, topY, az]);
    const puffs: THREE.Mesh[] = [];
    if (a.smoke === 'cigar') {
      s.rod([ax - 0.02, topY + 0.03, az], [ax + 0.1, topY + 0.035, az + 0.03], 0.011, s.material('#5c3a1e'));
      s.ball([0.012, 0.012, 0.012], [ax - 0.02, topY + 0.03, az], s.material('#ff7a2a', { emissive: '#ff5a10', emissiveIntensity: 1.5 }), 8);
      const haze = new THREE.MeshStandardMaterial({ color: '#f2f0ea', transparent: true, opacity: 0.16, depthWrite: false });
      for (let i = 0; i < 5; i++) { const puff = s.ball([0.02, 0.03, 0.02], [ax - 0.02, topY + 0.08 + i * 0.07, az], haze, 8); puff.castShadow = puff.receiveShadow = false; puffs.push(puff); }
    } else if (a.smoke === 'butts') {
      for (let i = 0; i < 7 + Math.floor(mood.density * 8); i++) s.rod([ax + (random() - 0.5) * 0.06, topY + 0.018 + random() * 0.012, az + (random() - 0.5) * 0.06], [ax + (random() - 0.5) * 0.07, topY + 0.02 + random() * 0.012, az + (random() - 0.5) * 0.07], 0.004, s.material(random() < 0.5 ? '#efe9dc' : '#d4a05a'));
      s.box([0.055, 0.02, 0.085], [ax + 0.1, topY + 0.01, az + 0.05], bright(['#c22d2a', '#1d4f9a'])).rotation.y = random() * 3;
    }

    // Stakes.
    if (a.stakes === 'pesos') {
      for (let i = 0; i < 5; i++) s.box([0.13, 0.002, 0.06], [(random() - 0.5) * 0.14 + bx * 0.2, topY + 0.002 + i * 0.002, -inner * 0.6 + (random() - 0.5) * 0.08], s.material(pick(['#9cc7a0', '#d99aa0', '#a9b9d8', '#d9c98a']))).rotation.y = random() * 3;
      for (let i = 0; i < 6; i++) s.cylinder(0.012, 0.012, 0.002, [(random() - 0.5) * 0.2 + bx * 0.2, topY + 0.012, -inner * 0.6 + (random() - 0.5) * 0.14], s.material('#c9b25a', { metalness: 0.8, roughness: 0.3 }), 10);
    } else if (a.stakes === 'score') {
      const page = s.label(`${Math.floor(random() * 99)} - ${Math.floor(random() * 99)}`, 0.15, 0.2, [-bx * 0.6, topY + 0.008, -inner * 0.62], '#2a3f8a', '#f7f4e6');
      page.rotation.x = -Math.PI / 2; page.rotation.z = (random() - 0.5) * 0.8;
      s.box([0.15, 0.006, 0.2], [-bx * 0.6, topY + 0.003, -inner * 0.62], s.material('#f7f4e6')).rotation.y = page.rotation.z;
      s.rod([-bx * 0.6 + 0.1, topY + 0.006, -inner * 0.6], [-bx * 0.6 + 0.16, topY + 0.006, -inner * 0.52], 0.004, s.material('#e2b322'));
    } else if (a.stakes === 'matches') {
      for (let player = 0; player < 4; player++) for (let i = 0; i < 2 + Math.floor(random() * 8); i++) {
        const phi = player * Math.PI / 2 + 0.5, r = inner * 0.75, x = Math.sin(phi) * r + (random() - 0.5) * 0.06, z = Math.cos(phi) * r + (random() - 0.5) * 0.06, t = random() * 3;
        s.rod([x, topY + 0.003, z], [x + Math.cos(t) * 0.04, topY + 0.003, z + Math.sin(t) * 0.04], 0.0018, s.material('#e8d6a8'));
      }
    }

    // Four mismatched chairs.
    const chair = (kind: (typeof CHAIRS)[number]) => {
      const g = new THREE.Group();
      if (kind === 'wood') {
        const m = bright(['#7a4a2a', '#2f6b5e', '#b23a2a', '#d8c9a0']);
        put(g, new THREE.BoxGeometry(0.4, 0.03, 0.4), m, [0, 0.45, 0]);
        for (const x of [-0.17, 0.17]) { put(g, new THREE.BoxGeometry(0.035, 0.45, 0.035), m, [x, 0.225, 0.17]); put(g, new THREE.BoxGeometry(0.035, 0.92, 0.035), m, [x, 0.46, -0.18], [-0.06, 0, 0]); }
        for (const y of [0.62, 0.76, 0.88]) put(g, new THREE.BoxGeometry(0.34, 0.06, 0.02), m, [0, y, -0.19 - (y - 0.45) * 0.06]);
        put(g, new THREE.BoxGeometry(0.34, 0.02, 0.02), m, [0, 0.2, 0.17]);
      } else if (kind === 'folding') {
        const m = bright(['#6f7f8c', '#3d5a80', '#7b7b72']);
        put(g, new THREE.BoxGeometry(0.38, 0.02, 0.36), m, [0, 0.44, 0.02]);
        put(g, new THREE.BoxGeometry(0.38, 0.16, 0.02), m, [0, 0.78, -0.2], [-0.12, 0, 0]);
        for (const x of [-0.2, 0.2]) { bar(g, [x, 0, 0.24], [x, 0.88, -0.22], 0.011, steel); bar(g, [x, 0, -0.26], [x, 0.44, 0.18], 0.011, steel); }
      } else if (kind === 'plastic') {
        const m = bright(['#f1efe6', '#2f8f5e', '#c7402f']);
        put(g, new THREE.BoxGeometry(0.44, 0.03, 0.42), m, [0, 0.42, 0]);
        put(g, new THREE.CylinderGeometry(0.24, 0.22, 0.42, 16, 1, true, Math.PI * 0.72, Math.PI * 0.56), new THREE.MeshStandardMaterial({ color: (m as THREE.MeshStandardMaterial).color, side: THREE.DoubleSide, roughness: 0.6 }), [0, 0.64, 0]);
        for (const x of [-1, 1]) { for (const z of [-1, 1]) bar(g, [x * 0.24, 0, z * 0.23], [x * 0.19, 0.42, z * 0.18], 0.018, m); put(g, new THREE.BoxGeometry(0.04, 0.03, 0.36), m, [x * 0.23, 0.62, 0.02]); bar(g, [x * 0.23, 0.42, 0.18], [x * 0.23, 0.62, 0.18], 0.015, m); }
      } else if (kind === 'crate') {
        const m = bright(['#c22d2a', '#e0a81c', '#1d4f9a']);
        put(g, new THREE.BoxGeometry(0.4, 0.3, 0.3), m, [0, 0.15, 0]);
        for (const x of [-0.12, 0, 0.12]) put(g, new THREE.BoxGeometry(0.08, 0.07, 0.31), dark, [x, 0.17, 0]);
        put(g, new THREE.BoxGeometry(0.36, 0.05, 0.28), bright(['#b89a6a', '#7d8a5c']), [0, 0.325, 0]);
      } else if (kind === 'stool') {
        put(g, new THREE.CylinderGeometry(0.17, 0.17, 0.035, 18), wood, [0, 0.47, 0]);
        for (let i = 0; i < 3; i++) bar(g, [Math.sin(i * 2.094) * 0.2, 0, Math.cos(i * 2.094) * 0.2], [Math.sin(i * 2.094) * 0.1, 0.46, Math.cos(i * 2.094) * 0.1], 0.018, wood);
        put(g, new THREE.TorusGeometry(0.13, 0.01, 6, 18), wood, [0, 0.2, 0], [Math.PI / 2, 0, 0]);
      } else {
        const m = bright(['#e8e4d8', '#2d6ea8', '#d07a1e']);
        put(g, new THREE.CylinderGeometry(0.13, 0.16, 0.36, 18), m, [0, 0.18, 0]);
        put(g, new THREE.TorusGeometry(0.158, 0.008, 6, 20), steel, [0, 0.05, 0], [Math.PI / 2, 0, 0]);
        put(g, new THREE.BoxGeometry(0.3, 0.03, 0.3), bright(['#8a6a4a', '#5d7a5a']), [0, 0.375, 0], [0, 0.4, 0]);
      }
      return g;
    };
    const pool = [...CHAIRS];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const distance = { tucked: half + 0.08, seated: half + 0.3, back: half + 0.48, over: half + 0.3 }[a.chairs];
    const loose = { tucked: 0.08, seated: 0.45, back: 1.1, over: 0.45 }[a.chairs];
    const toppled = a.chairs === 'over' ? Math.floor(random() * 4) : -1;
    for (let i = 0; i < 4; i++) {
      const g = chair(pool[i]), phi = i * Math.PI / 2 + (random() - 0.5) * loose * 0.3, r = distance + random() * loose * 0.25;
      g.position.set(Math.sin(phi) * r, 0, Math.cos(phi) * r);
      g.rotation.y = i * Math.PI / 2 + Math.PI + (random() - 0.5) * loose;
      if (i === toppled) {
        const holder = new THREE.Group();
        holder.position.set(Math.sin(phi) * (r - 0.1), 0.2, Math.cos(phi) * (r - 0.1));
        holder.rotation.y = g.rotation.y + (random() - 0.5) * 0.6;
        g.position.set(0, 0, 0); g.rotation.set(-Math.PI / 2, 0, 0);
        holder.add(g); s.root.add(holder);
      } else s.root.add(g);
    }

    // Beside the table.
    if (a.beside === 'spare') {
      const g = chair(pool[4]);
      g.position.set(half + 0.5, 0, -half - 0.45); g.rotation.y = -0.9 + random() * 0.5;
      s.root.add(g);
    } else if (a.beside === 'radio') {
      const g = chair('crate');
      g.position.set(-half - 0.55, 0, -half - 0.4); g.rotation.y = 0.6;
      put(g, new THREE.BoxGeometry(0.3, 0.18, 0.09), bright(['#2b2b2b', '#8a2f2a', '#c9c2ae']), [0, 0.44, 0]);
      put(g, new THREE.CylinderGeometry(0.06, 0.06, 0.01, 16), steel, [-0.07, 0.44, 0.046], [Math.PI / 2, 0, 0]);
      put(g, new THREE.BoxGeometry(0.1, 0.03, 0.01), s.material('#f0e2a8', { emissive: '#f0d27a', emissiveIntensity: 0.6 }), [0.08, 0.48, 0.046]);
      bar(g, [0.13, 0.53, 0], [0.24, 0.95, -0.02], 0.004, steel);
      s.root.add(g);
    } else if (a.beside === 'dog') {
      const fur = s.material(pick(['#b58a55', '#d9c7a3', '#5b4634', '#8c8377']), { roughness: 1 });
      const dx = (random() - 0.5) * 0.2, dz = (random() - 0.5) * 0.2;
      s.ball([0.3, 0.1, 0.16], [dx, 0.1, dz], fur, 14);
      s.ball([0.1, 0.075, 0.085], [dx + 0.32, 0.075, dz + 0.1], fur, 12);
      s.ball([0.06, 0.04, 0.04], [dx + 0.41, 0.055, dz + 0.13], fur, 10);
      s.ball([0.02, 0.018, 0.02], [dx + 0.465, 0.06, dz + 0.145], dark, 8);
      for (const k of [-1, 1]) s.ball([0.035, 0.012, 0.055], [dx + 0.28, 0.13, dz + 0.1 + k * 0.07], darkWood, 8).rotation.x = k * 0.7;
      s.tube([[dx - 0.28, 0.08, dz], [dx - 0.4, 0.04, dz + 0.08], [dx - 0.33, 0.03, dz + 0.2]], 0.018, fur);
      for (const [px, pz] of [[0.2, 0.2], [-0.15, 0.19]] as const) s.ball([0.1, 0.03, 0.035], [dx + px, 0.03, dz + pz], fur, 8);
    }

    const drift = mix(0.02, 0.09, mood.energy);
    return s.finish({
      update: puffs.length ? (_dt, time) => puffs.forEach((puff, index) => {
        const phase = (time * drift * 3 + index / puffs.length) % 1;
        puff.position.y = topY + 0.06 + phase * 0.4;
        puff.position.x = ax - 0.02 + Math.sin(time * 0.7 + index) * 0.03 * phase;
        puff.scale.setScalar(0.02 + phase * 0.05);
      }) : undefined,
    });
  },
});
