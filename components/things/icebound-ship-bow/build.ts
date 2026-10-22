import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V = THREE.Vector3;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const L = 12, B = 3.3, D = 1.8;
const sheer = (u: number) => 3.2 + 1.3 * u * u;
const halfBreadth = (u: number) => B * Math.pow(Math.max(0, 1 - Math.pow(u, 2.4)), 0.55);
/** A point on the hull: u runs from the cut amidships (0) to the stem (1), t from keel (0) to rail (1). */
const hull = (u: number, t: number, side: number) => {
  const angle = t * Math.PI / 2, depth = D * (1 - u * 0.5);
  const y = -depth + (sheer(u) + depth) * Math.pow(1 - Math.cos(angle), 0.85);
  return v(side * halfBreadth(u) * Math.pow(Math.sin(angle), mix(0.75, 1.7, u * u)), y, -L / 2 + u * L + Math.pow(u, 4) * Math.max(0, y / sheer(u)));
};
const NAMES = { none: '', endurance: 'ENDURANCE', terror: 'TERROR', fram: 'FRAM', hope: 'HOPE', patience: 'PATIENCE' } as const;

export default defineThing({
  questions: {
    heel: score('How far has the ice thrown her over?', ['Held nearly upright', 'Listing', 'Heeled hard over', 'Almost on her beam ends']),
    state: choice('What has the ice done to her?', {
      intact: 'Held fast but whole: frozen in, waiting.',
      nipped: 'Nipped: slabs of ice rafted up against her side, the bow forced upward.',
      crushed: 'Crushed: the topmast has come down in a tangle and broken timbers jut from her side.',
      buried: 'Long abandoned: drifted so deep that snow lies over the deck and only spars stand clear.',
    }),
    light: choice('Is there light aboard?', {
      dark: 'None. She is dark and silent.',
      lantern: 'One lantern hung in the fore rigging.',
      ports: 'Portholes and the forecastle skylight glow warm: there are people below.',
      alive: 'Lantern, lit ports and smoke from the galley funnel: the ship is still a home.',
    }),
    sails: choice('What is on the yards?', {
      bare: 'Bare yards, the sails sent down for winter.',
      furled: 'Sails furled tight along the yards in pale frozen rolls.',
      tatters: 'One sail left hanging in stiff frozen tatters.',
    }),
    name: choice('What name is on the bow?', { none: 'None: it has been scoured away.', endurance: 'ENDURANCE', terror: 'TERROR', fram: 'FRAM', hope: 'HOPE', patience: 'PATIENCE' }),
    beside: choice('What is on the ice beside her?', {
      nothing: 'Nothing but ice.',
      boat: 'A lifeboat hauled out onto the floe, ready.',
      stores: 'A dump of crates and barrels unloaded in a hurry.',
      dogloos: 'A row of little snow kennels built for the sledge dogs.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const ship = new Sculpture(context);
    s.root.add(ship.root);
    const { mood, random } = context;
    const frost = THREE.MathUtils.clamp(1 - mood.warmth * 0.8, 0.2, 1);
    const lean = random() < 0.5 ? 1 : -1; // +1 leans toward -x
    const heel = mix(0.06, 0.6, a.heel) * lean;
    const pitch = a.state === 'nipped' ? -0.12 : a.state === 'crushed' ? -0.07 : -0.02;
    ship.root.rotation.set(pitch, 0, heel, 'YXZ');
    ship.root.position.y = 0.35 + Math.abs(heel) * 1.1 + (a.state === 'buried' ? -0.5 : 0);
    ship.root.updateMatrix();
    const toWorld = (p: V) => p.clone().applyMatrix4(ship.root.matrix);
    const lee = -lean; // x sign of the low side

    // Hull, baked into world space so the part below the ice can be flattened away.
    const NU = 30, NT = 14, ring = NT * 2 + 1;
    const positions: number[] = [], colours: number[] = [], index: number[] = [];
    const copper = new THREE.Color('#6b3024'), tar = new THREE.Color('#1f2226').lerp(new THREE.Color('#5a554c'), mood.wear * 0.35), stripe = new THREE.Color('#c9b06a');
    for (let i = 0; i <= NU; i++) for (let j = 0; j < ring; j++) {
      const side = j < NT ? -1 : 1, t = Math.abs(j - NT) / NT, u = Math.min(0.999, i / NU);
      const local = hull(u, t, side), p = toWorld(local);
      positions.push(p.x, Math.max(p.y, -0.35), p.z);
      const tone = local.y < 0.05 ? copper : t > 0.9 && t < 0.97 ? stripe : tar;
      colours.push(tone.r, tone.g, tone.b);
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < ring - 1; j++) { const p = i * ring + j, q = p + ring; index.push(p, q, p + 1, q, q + 1, p + 1); }
    const hullGeometry = new THREE.BufferGeometry();
    hullGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    hullGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    hullGeometry.setIndex(index);
    hullGeometry.computeVertexNormals();
    s.mesh(hullGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }));

    // Deck and the bulkhead where the section ends.
    const DECK = 0.9;
    const deckPositions: number[] = [], deckIndex: number[] = [];
    for (let i = 0; i <= NU; i++) for (const side of [-1, 1]) { const p = hull(Math.min(0.999, i / NU), DECK, side); deckPositions.push(p.x, p.y, p.z); }
    for (let i = 0; i < NU; i++) deckIndex.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    const deckGeometry = new THREE.BufferGeometry();
    deckGeometry.setAttribute('position', new THREE.Float32BufferAttribute(deckPositions, 3));
    deckGeometry.setIndex(deckIndex);
    deckGeometry.computeVertexNormals();
    const snowy = a.state === 'buried' || mood.wear > 0.6;
    ship.mesh(deckGeometry, new THREE.MeshStandardMaterial({ color: snowy ? '#eef3f6' : '#b39a70', roughness: 0.9, side: THREE.DoubleSide }));
    const deckY = (u: number) => hull(u, DECK, 1).y;
    const wood = ship.material('#8a6a44'), darkWood = ship.material('#4c3a2a'), spar = ship.material('#c2a06a'), sailcloth = ship.material(new THREE.Color('#d9d4c2').lerp(new THREE.Color('#f2f6f8'), frost * 0.6), { roughness: 1, side: THREE.DoubleSide });
    const end = new THREE.Shape(Array.from({ length: ring }, (_unused, j) => { const p = hull(0, Math.abs(j - NT) / NT, j < NT ? -1 : 1); return new THREE.Vector2(p.x, p.y); }));
    ship.mesh(new THREE.ShapeGeometry(end), new THREE.MeshStandardMaterial({ color: '#3a2c20', roughness: 1, side: THREE.DoubleSide }), [0, 0, -L / 2 + 0.01]);

    // Deck furniture: forecastle hatch, skylight, windlass, galley funnel.
    const lit = a.light === 'ports' || a.light === 'alive';
    const warm = new THREE.MeshStandardMaterial({ color: lit ? '#ffd27a' : '#27333d', emissive: lit ? '#ffb84a' : '#000000', emissiveIntensity: lit ? 1.4 : 0, roughness: 0.4 });
    ship.box([1.5, 0.5, 1.9], [0, deckY(0.28) + 0.25, -L / 2 + 0.28 * L], darkWood);
    ship.box([1.2, 0.12, 1.6], [0, deckY(0.28) + 0.55, -L / 2 + 0.28 * L], warm);
    ship.box([1.3, 0.7, 1.0], [0, deckY(0.68) + 0.35, -L / 2 + 0.68 * L], wood);
    ship.cylinder(0.3, 0.3, 1.6, [0, deckY(0.8) + 0.45, -L / 2 + 0.8 * L], darkWood, 10).rotation.z = Math.PI / 2;
    const fx = -lee * 1.2, fz = -L / 2 + 0.16 * L;
    ship.cylinder(0.13, 0.13, 1.9, [fx, deckY(0.16) + 0.95, fz], ship.material('#2a2c2e', { metalness: 0.5 }), 10);
    ship.cylinder(0.2, 0.2, 0.08, [fx, deckY(0.16) + 1.95, fz], ship.material('#2a2c2e', { metalness: 0.5 }), 10);
    for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
      const p = hull(0.2 + i * 0.1, 0.78, side);
      ship.ball([0.07, 0.15, 0.15], [p.x + side * 0.02, p.y, p.z], warm, 8);
    }

    // Spars. Everything above the lower masthead can break away.
    const broken = a.state === 'crushed';
    const mz = -L / 2 + 0.48 * L, foot = deckY(0.48) - 0.2, TOP = 12.5, TRUCK = 20;
    const upper = new Sculpture(context);
    const hinge = new THREE.Group();
    hinge.position.set(0, TOP, mz);
    upper.root.position.set(0, -TOP, -mz);
    hinge.add(upper.root);
    ship.root.add(hinge);
    if (broken) hinge.rotation.set((random() - 0.5) * 0.5, 0, -lean * mix(1.9, 2.4, random()));
    ship.rod([0, foot, mz], [0, TOP + 0.6, mz], 0.27, spar, 0.2);
    ship.box([1.7, 0.1, 1.3], [0, TOP - 0.25, mz], darkWood);
    upper.rod([0, TOP - 0.4, mz + 0.22], [0, TRUCK, mz + 0.22], 0.16, spar, 0.07);
    upper.cylinder(0.42, 0.36, 0.9, [0, 16.6, mz + 0.22], ship.material('#d8d2c0'), 12);
    const lines: [V, V, number][] = [], upperLines: [V, V, number][] = [];
    const cockbill = () => (random() - 0.5) * mix(0.04, 0.3, mood.wear) + (broken ? (random() - 0.5) * 0.3 : 0);
    const yards: { y: number; half: number; tilt: number; up: boolean }[] = [{ y: 8.4, half: 4.9, tilt: cockbill(), up: false }, { y: 14.2, half: 3.7, tilt: cockbill(), up: true }, { y: 18.2, half: 2.6, tilt: cockbill(), up: true }];
    const yardEnd = (yard: (typeof yards)[number], side: number, along = 1) => v(side * yard.half * along * Math.cos(yard.tilt), yard.y + side * yard.half * along * Math.sin(yard.tilt), mz + 0.45);
    yards.forEach((yard, n) => {
      const on = yard.up ? upper : ship;
      const from = yardEnd(yard, -1), to = yardEnd(yard, 1);
      on.rod(from.toArray() as [number, number, number], [0, yard.y, mz + 0.45], 0.07, spar, 0.13);
      on.rod([0, yard.y, mz + 0.45], to.toArray() as [number, number, number], 0.13, spar, 0.07);
      if (a.sails !== 'bare' && !(a.sails === 'tatters' && n === 0)) {
        const a0 = yardEnd(yard, -1, 0.9), a1 = yardEnd(yard, 1, 0.9);
        on.rod([a0.x, a0.y - 0.18, a0.z + 0.08], [a1.x, a1.y - 0.18, a1.z + 0.08], 0.2, sailcloth, 0.2);
      }
      (yard.up ? upperLines : lines).push([from, v(0, yard.y + yard.half * 0.55, mz + 0.25), 0.02], [to, v(0, yard.y + yard.half * 0.55, mz + 0.25), 0.02]);
    });
    if (a.sails === 'tatters') {
      const yard = yards[0];
      const cloth = new THREE.PlaneGeometry(yard.half * 1.6, 4.2, 14, 6);
      const at = cloth.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        const x = at.getX(i), y = at.getY(i), low = (2.1 - y) / 4.2;
        const tear = low > 0.45 ? (Math.sin(x * 2.3 + 1) * 0.5 + 0.5) * random() * 2.6 * low : 0;
        at.setXYZ(i, x * (1 - low * 0.12), y + tear, Math.sin(x * 1.4) * 0.5 * low + low * low * 0.6);
      }
      cloth.computeVertexNormals();
      const sail = ship.mesh(cloth, sailcloth, [0, yard.y - 2.2, mz + 0.5]);
      sail.rotation.z = yard.tilt;
    }
    // Bowsprit and jib-boom.
    const stem = hull(0.999, 1, 1);
    const sprit = (d: number) => v(0, stem.y + 0.1 + Math.sin(0.3) * d, stem.z - 0.9 + Math.cos(0.3) * d);
    ship.rod(sprit(-1.2).toArray() as [number, number, number], sprit(4).toArray() as [number, number, number], 0.2, spar, 0.14);
    ship.rod(sprit(3).toArray() as [number, number, number], sprit(7.5).toArray() as [number, number, number], 0.1, spar, 0.05);
    const striker = sprit(4).add(v(0, -1.6, 0.1));
    ship.rod(sprit(4).toArray() as [number, number, number], striker.toArray() as [number, number, number], 0.05, spar);
    lines.push([hull(0.97, 0.45, 1).setX(0), sprit(3.6), 0.03], [striker, sprit(7.4), 0.02], [striker, hull(0.95, 0.5, 1).setX(0), 0.02]);
    // Standing rigging: shrouds with ratlines, stays forward, backstays aft.
    for (const side of [-1, 1]) {
      const feet = [0.47, 0.42, 0.37, 0.32].map((u) => hull(u, 1, side));
      const head = v(side * 0.3, TOP - 0.3, mz);
      feet.forEach((footing) => lines.push([footing, head, 0.028]));
      for (let step = 1; step < 17; step++) { const k = step / 18; lines.push([feet[0].clone().lerp(head, k), feet[3].clone().lerp(head, k), 0.012]); }
      upperLines.push([v(side * 0.8, TOP - 0.2, mz), v(side * 0.12, TRUCK - 1.2, mz + 0.22), 0.02], [v(side * 0.8, TOP - 0.2, mz - 0.4), v(side * 0.12, TRUCK - 1.2, mz + 0.22), 0.02]);
      if (!broken) lines.push([hull(0.08, 1, side), v(side * 0.1, TRUCK - 0.8, mz + 0.22), 0.02], [hull(0.14, 1, side), v(side * 0.1, 16.2, mz + 0.22), 0.02]);
    }
    lines.push([v(0, TOP - 0.3, mz + 0.25), sprit(3.4), 0.03]);
    if (!broken) lines.push([v(0, TRUCK - 1, mz + 0.3), sprit(7.3), 0.022], [v(0, 16.2, mz + 0.3), sprit(5.4), 0.022]);
    else for (let i = 0; i < 4; i++) lines.push([v((random() - 0.5) * 0.6, TOP - 0.3, mz), hull(0.3 + random() * 0.3, 1, lee).add(v(lee * random(), -1, 0)), 0.02]);
    const rigMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color('#2f2a26').lerp(new THREE.Color('#dbe6ec'), frost * 0.75), roughness: 1 });
    const rig = (on: Sculpture, set: [V, V, number][]) => {
      const parts = set.map(([from, to, radius]) => {
        const along = to.clone().sub(from), length = along.length();
        const part = new THREE.CylinderGeometry(radius, radius, length, 5, 1, true);
        part.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), along.normalize()));
        return part.translate(...(from.clone().lerp(to, 0.5).toArray() as [number, number, number]));
      });
      const merged = mergeGeometries(parts);
      for (const part of parts) part.dispose();
      on.mesh(merged, rigMaterial).castShadow = false;
    };
    rig(ship, lines);
    rig(upper, upperLines);

    // Name on both bows.
    const text = NAMES[a.name];
    if (text) for (const side of [-1, 1]) {
      const at = hull(0.8, 0.84, side);
      const along = hull(0.86, 0.84, side).sub(hull(0.74, 0.84, side)).normalize().multiplyScalar(-side);
      const upward = hull(0.8, 0.9, side).sub(hull(0.8, 0.78, side)).normalize();
      const normal = along.clone().cross(upward).normalize();
      const plate = ship.label(text, 2.2, 0.42, [0, 0, 0], '#e2bf62', '#1f2226');
      plate.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(along, normal.clone().cross(along), normal));
      plate.position.copy(at).addScaledVector(normal, 0.09);
      plate.castShadow = false;
    }

    // Lantern in the fore rigging.
    let lamp: THREE.Mesh | null = null, halo: THREE.Mesh | null = null;
    if (a.light === 'lantern' || a.light === 'alive') {
      const hang = toWorld(v(-lee * 1.5, 6.4, mz - 0.4));
      s.rod([hang.x, hang.y + 0.8, hang.z], [hang.x, hang.y + 0.2, hang.z], 0.015, rigMaterial);
      lamp = s.ball([0.2, 0.26, 0.2], [hang.x, hang.y, hang.z], new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffae3a', emissiveIntensity: 2.2 }), 10);
      halo = s.ball([1.1, 1.1, 1.1], [hang.x, hang.y, hang.z], new THREE.MeshBasicMaterial({ color: '#ffc45a', transparent: true, opacity: 0.16, depthWrite: false }), 12);
      lamp.castShadow = halo.castShadow = false;
    }
    const puffs: THREE.Mesh[] = [];
    const funnel = toWorld(v(fx, deckY(0.16) + 2.1, fz));
    if (a.light === 'alive') {
      const smoke = new THREE.MeshStandardMaterial({ color: '#dfe4e8', transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 7; i++) { const puff = s.ball([1, 1, 1], [funnel.x, funnel.y, funnel.z], smoke, 10); puff.castShadow = false; puff.userData.offset = i / 7; puffs.push(puff); }
    }

    // Pack ice: a floe, pressure blocks rafted against the hull, a ridge burying the cut end.
    const pale = s.material('#e9f1f6', { roughness: 0.95, flatShading: true });
    const shape = new THREE.Shape();
    for (let i = 0; i < 18; i++) {
      const angle = i / 18 * 6.283, wobble = 0.9 + random() * 0.16;
      const x = Math.cos(angle) * 7.6 * wobble, z = 1.2 + Math.sin(angle) * 10.4 * wobble;
      if (i) shape.lineTo(x, -z); else shape.moveTo(x, -z);
    }
    const floe = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false }).rotateX(-Math.PI / 2), pale, [0, -0.5, 0]);
    floe.castShadow = false;
    const blocks: THREE.Matrix4[] = [], tints: THREE.Color[] = [];
    const block = (x: number, y: number, z: number, size: number, flat = 0.45) => {
      blocks.push(new THREE.Matrix4().compose(v(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((random() - 0.5) * 1.3, random() * 6.283, (random() - 0.5) * 1.3)), v(size * mix(0.8, 1.6, random()), size * flat * mix(0.7, 1.3, random()), size * mix(0.7, 1.3, random()))));
      tints.push(new THREE.Color('#f4f8fb').lerp(new THREE.Color('#8fc4de'), random() ** 2 * 0.9));
    };
    const pressure = { intact: 0.35, nipped: 1, crushed: 0.9, buried: 0.6 }[a.state];
    const around = Math.round(mix(40, 90, mood.density) * mix(0.6, 1.3, pressure));
    for (let i = 0; i < around; i++) {
      const side = random() < 0.62 ? lee : -lee, u = random() ** 0.8 * 0.98;
      const p = toWorld(hull(u, 0.42, side));
      const out = random() ** 1.6 * mix(1.2, 3.2, pressure), high = side === lee ? mix(0.6, 2.4, pressure) : mix(0.3, 1.2, pressure);
      block(p.x + side * (out + 0.1), Math.max(0.05, high * (1 - out / 3.4) * random()), p.z + (random() - 0.5) * 0.8, mix(0.5, 1.5, random()));
    }
    const cut = toWorld(v(0, 1.2, -L / 2));
    const drift = s.ball([4.6, sheer(0) * 0.95 + ship.root.position.y, 2.6], [cut.x, -0.2, cut.z - 0.6], s.material('#f1f6f9', { roughness: 1 }), 16);
    drift.castShadow = true;
    for (let i = 0; i < 46; i++) {
      const angle = random() * Math.PI, r = Math.sqrt(random());
      block(cut.x + (random() - 0.5) * 8.5, 0.2 + Math.sin(angle) * r * (sheer(0) + 0.6), cut.z - 0.5 + (random() - 0.5) * 3.4 + 0.6, mix(0.8, 2.2, random()), 0.4);
    }
    if (a.state === 'buried') {
      const mid = toWorld(v(0, deckY(0.4) + 0.1, -L / 2 + 0.4 * L));
      s.ball([3.0, 0.9, 4.6], [mid.x, mid.y, mid.z], s.material('#f1f6f9', { roughness: 1 }), 14).rotation.z = heel;
      const side = toWorld(hull(0.5, 0.4, lee));
      s.ball([3.5, 1.6, 5.5], [side.x + lee * 1.5, 0, side.z], s.material('#f1f6f9', { roughness: 1 }), 14);
    }
    if (a.state === 'crushed' || a.state === 'nipped') {
      // Sprung planks and broken frames on the low side.
      const splinter = s.material('#a58256', { roughness: 1 });
      const count = a.state === 'crushed' ? 12 : 5;
      for (let i = 0; i < count; i++) {
        const p = toWorld(hull(0.3 + random() * 0.4, 0.5 + random() * 0.2, lee));
        const plank = s.box([0.1, 0.22, 1.2 + random() * 1.6], [p.x + lee * 0.25, p.y, p.z], splinter);
        plank.rotation.set((random() - 0.5) * 0.9, (random() - 0.5) * 1.2 + lee * 0.5, (random() - 0.5) * 1.0);
      }
    }
    const ice = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, flatShading: true }), blocks.length);
    blocks.forEach((matrix, i) => { ice.setMatrixAt(i, matrix); ice.setColorAt(i, tints[i]); });
    ice.castShadow = ice.receiveShadow = true;
    s.root.add(ice);

    // Icicles under the yards and bowsprit, hanging true whatever the heel.
    const drips: { at: [number, number, number]; size: number }[] = [];
    const under = (from: V, to: V, count: number) => { for (let i = 0; i < count; i++) { const p = toWorld(from.clone().lerp(to, random())); drips.push({ at: [p.x, p.y - 0.12, p.z], size: mix(0.3, 1, random()) }); } };
    const many = Math.round(frost * 16);
    if (!broken) under(sprit(0.5), sprit(7), many);
    under(yardEnd(yards[0], -1), yardEnd(yards[0], 1), many);
    if (drips.length) s.scatter(new THREE.ConeGeometry(0.06, 0.8, 5).rotateX(Math.PI).translate(0, -0.4, 0), new THREE.MeshStandardMaterial({ color: '#e6f3fa', roughness: 0.2 }), drips).castShadow = false;

    // On the floe, on the high side where there is room.
    const bx = -lee * 5.2, bz = 2.5;
    if (a.beside === 'boat') {
      const b = new Sculpture(context);
      const boatHull = b.mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), b.material('#e8e4d6', { side: THREE.DoubleSide }), [0, 0.75, 0]);
      boatHull.scale.set(0.95, 0.75, 3.2);
      const rail = b.ring(1, 0.06, [0, 0.75, 0], b.material('#7b5a3a'));
      rail.rotation.x = Math.PI / 2; rail.scale.set(0.95, 3.2, 1);
      for (const z of [-1.4, 0, 1.4]) b.box([1.7 * Math.sqrt(1 - (z / 3.2) ** 2), 0.05, 0.3], [0, 0.6, z], b.material('#8a6a44'));
      for (const x of [-0.4, 0.4]) b.rod([x, 0.72, -2.2], [x * 0.6, 0.78, 2.0], 0.04, b.material('#c2a06a'));
      b.root.position.set(bx, 0, bz); b.root.rotation.set(0, 0.5 * lee, 0.16);
      s.root.add(b.root);
    } else if (a.beside === 'stores') {
      for (let i = 0; i < 9; i++) {
        const x = bx + (random() - 0.5) * 3, z = bz + (random() - 0.5) * 3.4, tall = i < 3 ? 0.7 : 0;
        if (i % 3 === 2) s.cylinder(0.36, 0.36, 0.95, [x, 0.48, z], s.material('#6f5034'), 12);
        else s.box([0.9, 0.6, 0.7], [x, 0.3 + tall, z], s.material(['#9a7a4e', '#86683f', '#a88a5c'][i % 3])).rotation.y = random();
      }
    } else if (a.beside === 'dogloos') {
      for (let i = 0; i < 5; i++) {
        const z = bz - 4 + i * 2.0, x = bx + Math.sin(i * 1.3) * 0.5;
        s.ball([0.85, 0.75, 0.85], [x, 0, z], s.material('#f1f6f9', { roughness: 1 }), 12);
        s.ball([0.3, 0.34, 0.2], [x + lee * 0.75, 0.1, z], s.material('#1e2226'), 8);
        if (random() < 0.6) s.ball([0.34, 0.2, 0.26], [x + lee * 1.5, 0.15, z + 0.3], s.material(['#8d949b', '#3c3f45', '#c9c2b3'][i % 3], { roughness: 1 }), 10);
      }
    }

    // A ship reads best off the bow quarter rather than stem-on.
    s.root.rotation.y = -0.75;
    s.root.updateMatrixWorld(true);
    const thing = s.finish({
      update: (_dt, time) => {
        if (lamp && halo) {
          const flicker = 1 + Math.sin(time * 7) * 0.08 + Math.sin(time * 17.3) * 0.06;
          (lamp.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.2 * flicker;
          halo.scale.setScalar(1.1 * flicker);
        }
        for (const puff of puffs) {
          const t = (time * mix(0.06, 0.22, mood.energy) + puff.userData.offset) % 1;
          puff.position.set(funnel.x + t * t * mix(0.5, 4, mood.energy), funnel.y + t * 4.5, funnel.z - t * 0.6);
          puff.scale.setScalar(0.2 + t * 1.1);
        }
      },
    });
    const centre = new THREE.Box3().setFromObject(floe).getCenter(new THREE.Vector3());
    s.root.position.x -= centre.x; s.root.position.z -= centre.z;
    thing.update?.(0, 0);
    return { ...thing, footprint: 8, dispose: () => { thing.dispose(); warm.dispose(); rigMaterial.dispose(); } };
  },
});
