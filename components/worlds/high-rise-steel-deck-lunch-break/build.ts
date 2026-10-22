import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, noul } from '@conjure/kit';
import { type P, beamGeometry, paint } from './site';

/** A lattice truss between two points: three chords and zigzag lacing, as one instanced mesh. */
function truss(from: THREE.Vector3, to: THREE.Vector3, width: number, height: number, bay: number, thickness: number, material: THREE.Material) {
  const length = from.distanceTo(to);
  const bays = Math.max(2, Math.round(length / bay));
  const members: { a: THREE.Vector3; b: THREE.Vector3; t: number }[] = [];
  const chord = (y: number, z: number) => members.push({ a: new THREE.Vector3(0, y, z), b: new THREE.Vector3(length, y, z), t: thickness * 1.4 });
  chord(height, 0);
  chord(0, -width / 2);
  chord(0, width / 2);
  for (let i = 0; i < bays; i++) {
    const x0 = (i / bays) * length, x1 = ((i + 1) / bays) * length, xm = (x0 + x1) / 2;
    for (const side of [-1, 1]) {
      members.push({ a: new THREE.Vector3(x0, 0, side * width / 2), b: new THREE.Vector3(xm, height, 0), t: thickness });
      members.push({ a: new THREE.Vector3(xm, height, 0), b: new THREE.Vector3(x1, 0, side * width / 2), t: thickness });
    }
    members.push({ a: new THREE.Vector3(x0, 0, -width / 2), b: new THREE.Vector3(x1, 0, width / 2), t: thickness });
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, members.length);
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  members.forEach(({ a, b, t }, index) => {
    const dir = b.clone().sub(a);
    q.setFromUnitVectors(up, dir.clone().normalize());
    matrix.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(t, dir.length(), t));
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  const group = new THREE.Group();
  group.position.copy(from);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), to.clone().sub(from).normalize());
  group.add(mesh);
  return group;
}

/** A square lattice mast standing on `base`, as one instanced mesh. */
function mast(base: THREE.Vector3, height: number, width: number, bay: number, thickness: number, material: THREE.Material) {
  const members: { a: THREE.Vector3; b: THREE.Vector3; t: number }[] = [];
  const h = width / 2;
  for (const x of [-h, h]) for (const z of [-h, h]) members.push({ a: new THREE.Vector3(x, 0, z), b: new THREE.Vector3(x, height, z), t: thickness * 1.5 });
  const bays = Math.round(height / bay);
  for (let i = 0; i < bays; i++) {
    const y0 = (i / bays) * height, y1 = ((i + 1) / bays) * height;
    const flip = i % 2 ? 1 : -1;
    members.push({ a: new THREE.Vector3(-h, y0, -h), b: new THREE.Vector3(h, y1, -h), t: thickness });
    members.push({ a: new THREE.Vector3(-h, y0, h), b: new THREE.Vector3(h, y1, h), t: thickness });
    members.push({ a: new THREE.Vector3(-h, y0, -h * flip), b: new THREE.Vector3(-h, y1, h * flip), t: thickness });
    members.push({ a: new THREE.Vector3(h, y0, -h * flip), b: new THREE.Vector3(h, y1, h * flip), t: thickness });
    members.push({ a: new THREE.Vector3(-h, y1, -h), b: new THREE.Vector3(h, y1, -h), t: thickness });
    members.push({ a: new THREE.Vector3(-h, y1, h), b: new THREE.Vector3(h, y1, h), t: thickness });
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, members.length);
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  members.forEach(({ a, b, t }, index) => {
    const dir = b.clone().sub(a);
    q.setFromUnitVectors(up, dir.clone().normalize());
    matrix.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(t, dir.length(), t));
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.position.copy(base);
  return mesh;
}

export default defineWorld({
  questions: {
    city: choice('What lies beyond the edge?', {
      glass: 'A forest of glass towers, blue-grey in the haze.',
      rooftops: 'Low rooftops with water tanks and parapets, an older city spread flat.',
      river: 'A wide river with a bridge and the far bank hazy beyond it.',
      mountains: 'A low city and then a ridge of mountains on the horizon.',
    }),
    height: choice('How high is this floor?', {
      low: 'Eight or nine storeys: the neighbouring rooftops at eye level, the street still audible.',
      mid: 'Thirty floors up: most roofs below, a few towers still taller.',
      top: 'Sixty floors up: everything below, the city a haze, the wind steady.',
    }),
    beams: choice('What state is the steel in?', {
      bolted: 'The next level\'s beams are bolted up: the frame is complete and still.',
      swinging: 'One beam still hangs in slings from the crane hook, waiting to be landed.',
    }),
    whistle: noul('Is the whistle about to call them back from lunch?'),
    table: choice('What is on the plywood table?', {
      plans: 'Drawings weighted with a radio and a coffee.',
      lunch: 'A lunch spread: wrappers, a thermos, paper cups.',
      tools: 'A drill, a bucket of bolts and a spirit level.',
      nothing: 'Nothing: bare plywood with a crumpled wrapper.',
    }),
    stacks: choice('What is stacked on the deck?', {
      rebar: 'Bundles of rebar on dunnage.',
      decking: 'A stack of corrugated deck sheets under a strap.',
      kegs: 'Bolt kegs and a red steel job box.',
      everything: 'Rebar, deck sheets and the job box, a crowded floor.',
      clear: 'Swept nearly clear.',
    }),
    wind: choice('What shows the wind?', {
      windsock: 'An orange windsock on a column, standing out straight.',
      flag: 'A flag on the column tip, snapping.',
      tarp: 'A loose tarp over the stack, one corner lifting.',
      nothing: 'Nothing moves but the dust.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const W = 11, D = 8.2;
    const sky = new THREE.Color('#dbe4ec').lerp(new THREE.Color('#e9e2d2'), mood.warmth * 0.45).lerp(new THREE.Color('#c9d2dc'), (1 - mood.cheer) * 0.3);
    const haze = { low: 0.4, mid: 0.55, top: 0.7 }[a.height];
    const { art: s, world } = diorama(context, {
      background: sky.getStyle(), floor: '#aab1b6', width: W, depth: D, floorY: 0, yaw: 26, pitch: 30, maxHeight: 2.0, radius: 1.3, scale: [0.8, 1.35],
      slots: [[0.4, -2.2], [-3.2, -1.0], [3.0, -1.2], [-1.7, 1.5], [2.0, 1.5], [-3.9, 2.5]],
    });
    if (world.keyLight) world.keyLight.intensity *= 1.1;

    // ---- the corrugated deck: ribs along z every 20 cm, a pour stop round the edge
    const galv = s.material('#b9c0c5', { metalness: 0.55, roughness: 0.45 });
    const ribs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.035, D), galv, Math.floor(W / 0.2));
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < ribs.count; i++) { matrix.makeTranslation(-W / 2 + 0.1 + i * 0.2, 0.0175, 0); ribs.setMatrixAt(i, matrix); }
    ribs.instanceMatrix.needsUpdate = true;
    ribs.castShadow = ribs.receiveShadow = true;
    s.root.add(ribs);
    for (const x of [-W / 2, W / 2]) s.box([0.04, 0.12, D], [x, 0.06, 0], galv);
    s.box([W, 0.12, 0.04], [0, 0.06, -D / 2], galv);
    // Grey pan between the ribs, darkened by wear and dust.
    const floor = world.ground as THREE.Mesh;
    (floor.material as THREE.MeshStandardMaterial).color.lerp(new THREE.Color('#6a6a66'), mood.wear * 0.4);

    // ---- columns and the next level's beams
    const steel = s.material(new THREE.Color('#9a4a3c').lerp(new THREE.Color('#6a4a40'), mood.wear * 0.5), { roughness: 0.75, metalness: 0.15 });
    const CX = W / 2 - 0.7, CZB = -(D / 2 - 0.5), CZF = D / 2 - 0.8;
    const columnAt: P[] = [[-CX, 0, CZB], [CX, 0, CZB], [-CX, 0, CZF], [CX, 0, CZF]];
    const level = 4.0;
    for (const [x, , z] of columnAt) {
      const column = s.mesh(beamGeometry(4.6, 0.36, 0.36, 0.03, 0.022), steel, [x, 2.3, z]);
      column.rotation.x = Math.PI / 2;
      column.rotation.z = Math.PI / 2;
      s.box([0.5, 0.03, 0.5], [x, 0.015, z], steel);
      // A splice plate with bolts a little above head height.
      s.box([0.4, 0.5, 0.04], [x, 1.9, z + 0.2], steel);
      s.box([0.4, 0.5, 0.04], [x, 1.9, z - 0.2], steel);
    }
    const bolts = s.material('#4a4c50', { metalness: 0.6, roughness: 0.4 });
    const bolted = a.beams === 'bolted';
    const beamBack = s.mesh(beamGeometry(CX * 2, 0.35, 0.25), steel, [0, level, CZB]);
    beamBack.rotation.y = Math.PI / 2;
    const beamLeft = s.mesh(beamGeometry(CZF - CZB, 0.35, 0.25), steel, [-CX, level, (CZB + CZF) / 2]);
    void beamLeft;
    if (bolted) {
      const beamRight = s.mesh(beamGeometry(CZF - CZB, 0.35, 0.25), steel, [CX, level, (CZB + CZF) / 2]);
      void beamRight;
    }
    // Connection plates at the beam ends.
    for (const [x, , z] of columnAt) {
      if (!bolted && x > 0 && z > 0) continue;
      s.box([0.06, 0.3, 0.3], [x + (x > 0 ? -0.2 : 0.2), level, z], steel);
      s.scatter(new THREE.CylinderGeometry(0.5, 0.5, 1, 6), bolts, [0, 1, 2, 3].map((i) => ({ at: [x + (x > 0 ? -0.24 : 0.24), level - 0.1 + (i % 2) * 0.2, z - 0.08 + Math.floor(i / 2) * 0.16] as P, size: 0.03 })));
    }

    // ---- the cable guardrail along the back and the two sides
    const post = s.material('#f2c21c', { roughness: 0.5 });
    const wire = s.material('#9aa0a6', { metalness: 0.7, roughness: 0.35 });
    const edges: { from: P; to: P }[] = [{ from: [-W / 2 + 0.15, 0, -D / 2 + 0.15], to: [W / 2 - 0.15, 0, -D / 2 + 0.15] }, { from: [-W / 2 + 0.15, 0, -D / 2 + 0.15], to: [-W / 2 + 0.15, 0, D / 2 - 0.2] }, { from: [W / 2 - 0.15, 0, -D / 2 + 0.15], to: [W / 2 - 0.15, 0, D / 2 - 0.2] }];
    for (const { from, to } of edges) {
      const span = Math.hypot(to[0] - from[0], to[2] - from[2]);
      const count = Math.max(2, Math.round(span / 2.4));
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const x = from[0] + (to[0] - from[0]) * t, z = from[2] + (to[2] - from[2]) * t;
        s.box([0.06, 1.1, 0.06], [x, 0.55, z], post);
        s.box([0.14, 0.02, 0.14], [x, 0.01, z], post);
      }
      for (const y of [0.55, 1.05]) s.rod([from[0], y, from[2]], [to[0], y, to[2]], 0.008, wire);
    }
    // A danger sign on the back rail, and a clock and a horn on the back-left column.
    s.label('DANGER  OPEN EDGE', 1.1, 0.3, [2.0, 0.8, -D / 2 + 0.18], '#1a1a1c', '#f2c21c');
    const minutes = a.whistle ? 58 : 20 + Math.floor(random() * 15);
    const clock = paint(128, 128, (c) => {
      c.fillStyle = '#f4f3ec'; c.beginPath(); c.arc(64, 64, 60, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#1a1a1c'; c.lineWidth = 5; c.stroke();
      c.fillStyle = '#1a1a1c';
      for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; c.fillRect(64 + Math.sin(t) * 50 - 2, 64 - Math.cos(t) * 50 - 2, 4, 4); }
      c.lineWidth = 6; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.sin((minutes / 60) * Math.PI / 6) * 28, 64 - Math.cos((minutes / 60) * Math.PI / 6) * 28); c.stroke();
      c.lineWidth = 4; const m = (minutes / 60) * Math.PI * 2; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.sin(m) * 44, 64 - Math.cos(m) * 44); c.stroke();
    });
    s.mesh(new THREE.CircleGeometry(0.22, 24), new THREE.MeshStandardMaterial({ map: clock, roughness: 0.6 }), [-CX + 0.2, 2.55, CZB + 0.2]);
    s.box([0.3, 0.2, 0.2], [-CX, 3.1, CZB + 0.25], s.material('#f2c21c', { roughness: 0.5 }));
    s.cylinder(0.05, 0.1, 0.18, [-CX, 3.1, CZB + 0.45], s.material('#2a2c30', { roughness: 0.5 }), 12).rotation.x = Math.PI / 2;
    const beacon = s.ball([0.07, 0.07, 0.07], [-CX, 3.28, CZB + 0.25], new THREE.MeshStandardMaterial({ color: '#c8302a', emissive: '#ff2a1a', emissiveIntensity: a.whistle ? 1.6 : 0.0, roughness: 0.4 }), 10);

    // ---- the tower crane: a mast beyond the back-left corner, the jib crossing the sky
    const lattice = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f2c21c').lerp(sky, 0.18), roughness: 0.6, transparent: true, opacity: 0.98, depthWrite: false });
    const mastBase = new THREE.Vector3(-7.6, -18, -7.4);
    const mastTop = 11.2;
    s.root.add(mast(mastBase, mastTop - mastBase.y, 1.7, 1.6, 0.09, lattice));
    const slew = new THREE.Vector3(mastBase.x, mastTop, mastBase.z);
    const cab = s.box([1.1, 1.1, 1.3], [slew.x + 0.9, slew.y + 0.6, slew.z + 1.0], new THREE.MeshStandardMaterial({ color: '#f2c21c', roughness: 0.5, transparent: true, opacity: 0.98, depthWrite: false }));
    cab.castShadow = false;
    const jibEnd = new THREE.Vector3(11.5, mastTop + 0.4, -1.6);
    s.root.add(truss(new THREE.Vector3(slew.x, slew.y + 0.3, slew.z), jibEnd, 1.2, 1.1, 1.3, 0.08, lattice));
    const counter = slew.clone().add(slew.clone().sub(jibEnd).setY(0).normalize().multiplyScalar(6));
    s.root.add(truss(new THREE.Vector3(slew.x, slew.y + 0.3, slew.z), counter.setY(slew.y + 0.3), 1.3, 0.9, 1.3, 0.08, lattice));
    const ballast = s.box([1.6, 1.0, 1.6], [counter.x, counter.y - 0.2, counter.z], new THREE.MeshStandardMaterial({ color: '#8a8a84', roughness: 0.9, transparent: true, opacity: 0.98, depthWrite: false }));
    ballast.castShadow = false;
    const apex = new THREE.Vector3(slew.x, slew.y + 4.5, slew.z);
    s.rod([slew.x, slew.y + 0.3, slew.z], [apex.x, apex.y, apex.z], 0.08, lattice);
    s.rod([apex.x, apex.y, apex.z], [jibEnd.x - 2, jibEnd.y + 1.0, jibEnd.z + 0.3], 0.02, lattice);
    s.rod([apex.x, apex.y, apex.z], [counter.x, counter.y + 0.9, counter.z], 0.02, lattice);
    // The trolley and hook line, over the back-right corner of the deck.
    const t = 0.64;
    const trolleyAt = new THREE.Vector3().lerpVectors(new THREE.Vector3(slew.x, slew.y + 0.3, slew.z), jibEnd, t);
    s.box([0.8, 0.3, 1.3], [trolleyAt.x, trolleyAt.y - 0.1, trolleyAt.z], s.material('#2a2c30', { roughness: 0.5 }));
    const hookY = bolted ? 7.6 : 4.9;
    const hookLine = s.rod([trolleyAt.x, trolleyAt.y - 0.2, trolleyAt.z], [trolleyAt.x, hookY + 0.4, trolleyAt.z], 0.014, s.material('#5a5e62', { metalness: 0.7, roughness: 0.4 }));
    void hookLine;
    const hook = new THREE.Group();
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.14), s.material('#2a2c30', { roughness: 0.5 }));
    block.position.y = 0.2;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.1, 0.145), post);
    stripe.position.y = 0.2;
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 20, Math.PI * 1.45), s.material('#9a9ea2', { metalness: 0.7, roughness: 0.35 }));
    curl.position.y = -0.08;
    curl.rotation.z = Math.PI * 0.55;
    for (const mesh of [block, stripe, curl]) { mesh.castShadow = true; hook.add(mesh); }
    hook.position.set(trolleyAt.x, hookY, trolleyAt.z);
    s.root.add(hook);
    let swinging: THREE.Group | null = null;
    if (!bolted) {
      swinging = new THREE.Group();
      const beam = new THREE.Mesh(beamGeometry(7.0, 0.35, 0.25), steel);
      beam.rotation.y = Math.PI / 2;
      beam.position.y = -1.1;
      beam.castShadow = true;
      swinging.add(beam);
      for (const dx of [-2.4, 2.4]) {
        const from = new THREE.Vector3(0, -0.15, 0), to = new THREE.Vector3(dx, -0.95, 0);
        const sling = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, from.distanceTo(to), 6), s.material('#5a5e62', { metalness: 0.7, roughness: 0.4 }));
        sling.position.copy(from).add(to).multiplyScalar(0.5);
        sling.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
        sling.castShadow = true;
        swinging.add(sling);
      }
      swinging.position.copy(hook.position);
      s.root.add(swinging);
    }

    // ---- the skyline beyond the edge, hazed toward the sky; excluded from the frame's bounds
    const skyline = (at: P, size: P, tone: THREE.ColorRepresentation, floors = 0) => {
      const depthHaze = Math.min(1, haze + (Math.abs(at[2]) - 8) / 28 * 0.35);
      const colour = new THREE.Color(tone).lerp(sky, depthHaze);
      let map: THREE.Texture | null = null;
      if (floors > 0) {
        map = paint(16, 64, (c) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 16, 64); c.fillStyle = 'rgba(40,50,60,0.22)'; c.fillRect(0, 0, 16, 26); for (let i = 0; i < 4; i++) c.fillRect(i * 4, 26, 1, 38); });
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(Math.max(1, Math.round(size[0] / 3)), floors);
      }
      const material = new THREE.MeshStandardMaterial({ color: colour, map, roughness: 0.9, transparent: true, opacity: 0.98, depthWrite: false });
      const mesh = s.box(size, at, material);
      mesh.castShadow = false;
      return mesh;
    };
    const deckLevel = 0;
    const tops = { low: [-1.5, 6], mid: [-4, 2.5], top: [-7, -1] }[a.height];
    const towerTop = () => deckLevel + mix(tops[0], tops[1], random());
    const bottom = -24;
    if (a.city === 'glass' || a.city === 'mountains' || a.city === 'rooftops') {
      const count = a.city === 'glass' ? 18 : 12;
      for (let i = 0; i < count; i++) {
        const x = -15 + (i / (count - 1)) * 30 + (random() - 0.5) * 2;
        const z = -9.5 - random() * 12;
        const w = a.city === 'glass' ? 1.6 + random() * 2.4 : 2.5 + random() * 3;
        const top = a.city === 'rooftops' ? deckLevel + mix(tops[0], tops[0] + 2, random()) : towerTop() + (a.city === 'glass' && i % 4 === 0 ? 4 : 0);
        const h = top - bottom;
        const tone = a.city === 'glass' ? (i % 3 ? '#6f86a0' : '#8a9aaa') : '#9a8a78';
        skyline([x, bottom + h / 2, z], [w, h, w * (0.8 + random() * 0.6)], tone, Math.round(h / 3.2));
        if (a.city !== 'glass' && random() < 0.6) {
          // Water tanks and stair heads on the roofs.
          const tank = skyline([x + (random() - 0.5) * w * 0.5, top + 0.6, z], [0.9, 1.2, 0.9], '#7a6a5a');
          tank.geometry.dispose();
          tank.geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
          skyline([x + (random() - 0.5) * w * 0.5, top + 0.4, z + (random() - 0.5) * w * 0.4], [1.0, 0.8, 1.0], '#8a7a6a');
        }
      }
    }
    if (a.city === 'rooftops') {
      // A flat city filling the gaps.
      for (let i = 0; i < 16; i++) {
        const x = -16 + random() * 32, z = -10 - random() * 14;
        const top = deckLevel + tops[0] - 1 + random() * 2.5;
        skyline([x, (top + bottom) / 2, z], [3 + random() * 4, top - bottom, 3 + random() * 3], '#a08c76', Math.round((top - bottom) / 3.5));
      }
    }
    if (a.city === 'river') {
      const water = skyline([0, -8.5, -20], [60, 0.2, 26], '#8fb0c0');
      water.material = new THREE.MeshStandardMaterial({ color: new THREE.Color('#9fb8c6').lerp(sky, haze * 0.6), roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.98, depthWrite: false });
      // The near bank: a strip of low buildings, then the bridge, then the far bank.
      for (let i = 0; i < 8; i++) skyline([-14 + i * 4 + random(), (tops[0] - 2 + bottom) / 2, -8.5 - random() * 1.5], [3 + random() * 2, tops[0] - 2 - bottom, 2.5], '#9a8a78', 4);
      for (const x of [-9, -3]) skyline([x, -4, -17], [0.9, 10, 0.9], '#7a8088');
      skyline([-6, -3.6, -17], [16, 0.5, 2.2], '#7a8088');
      for (const x of [-9, -3]) s.rod([x, 1, -17], [x + 3, -3.4, -17], 0.03, new THREE.MeshStandardMaterial({ color: new THREE.Color('#7a8088').lerp(sky, 0.5), transparent: true, opacity: 0.98, depthWrite: false }));
      for (let i = 0; i < 9; i++) skyline([-16 + i * 4 + random() * 2, (towerTop() + bottom) / 2, -28 - random() * 4], [2 + random() * 3, towerTop() - bottom, 3], '#6f86a0', 8);
    }
    if (a.city === 'mountains') {
      for (let i = 0; i < 6; i++) {
        const x = -34 + i * 13 + random() * 6, z = -62 - random() * 8;
        const peak = { low: 9, mid: 6, top: 3 }[a.height] + random() * 3;
        const ridge = s.ball([14 + random() * 6, peak, 8], [x, -3, z], new THREE.MeshStandardMaterial({ color: new THREE.Color('#5a6a84').lerp(sky, 0.72 + haze * 0.15), roughness: 1, transparent: true, opacity: 0.98, depthWrite: false }), 16);
        ridge.castShadow = false;
      }
    }

    // ---- the deck dressing: table, stacks, lunch things
    const wood = s.material('#b89560', { roughness: 0.9 });
    const tableAt: P = [3.9, 0, 3.0];
    for (const dx of [-0.65, 0.65]) {
      s.box([0.09, 0.08, 0.95], [tableAt[0] + dx, 0.77, tableAt[2]], wood);
      for (const z of [-0.4, 0.4]) for (const side of [-1, 1]) s.rod([tableAt[0] + dx + side * 0.22, 0.02, tableAt[2] + z], [tableAt[0] + dx + side * 0.03, 0.74, tableAt[2] + z], 0.02, wood);
    }
    s.box([2.0, 0.018, 1.22], [tableAt[0], 0.81, tableAt[2]], s.material('#c9a66b', { roughness: 0.9 }));
    const dark = s.material('#2a2c30', { roughness: 0.6 });
    const paper = s.material('#f2efe6', { roughness: 0.7 });
    if (a.table === 'plans') {
      const plan = paint(256, 176, (c) => { c.fillStyle = '#f4f3ec'; c.fillRect(0, 0, 256, 176); c.strokeStyle = '#1a1d24'; c.lineWidth = 1.5; c.strokeRect(12, 12, 232, 152); for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) c.fillRect(30 + i * 38, 25 + j * 36, 5, 5); c.lineWidth = 2; c.strokeRect(70, 50, 60, 60); c.strokeRect(150, 40, 50, 80); });
      s.mesh(new THREE.PlaneGeometry(0.9, 0.62), new THREE.MeshStandardMaterial({ map: plan, roughness: 0.9 }), [tableAt[0] - 0.1, 0.822, tableAt[2]]).rotation.set(-Math.PI / 2, 0, 0.05);
      s.box([0.06, 0.16, 0.035], [tableAt[0] - 0.5, 0.9, tableAt[2] + 0.25], dark);
      s.cylinder(0.04, 0.032, 0.11, [tableAt[0] + 0.3, 0.875, tableAt[2] - 0.25], paper, 12);
    } else if (a.table === 'lunch') {
      for (let i = 0; i < 5; i++) s.box([0.1 + random() * 0.08, 0.02, 0.08 + random() * 0.06], [tableAt[0] - 0.7 + random() * 1.4, 0.83, tableAt[2] - 0.4 + random() * 0.8], s.material('#efe8d2', { roughness: 0.95 })).rotation.y = random() * 3;
      s.cylinder(0.045, 0.045, 0.3, [tableAt[0] + 0.5, 0.97, tableAt[2] + 0.3], s.material('#2f7a3a', { roughness: 0.45 }), 14);
      for (let i = 0; i < 3; i++) s.cylinder(0.04, 0.032, 0.11, [tableAt[0] - 0.3 + i * 0.16, 0.875, tableAt[2] + 0.4 - i * 0.08], paper, 12);
    } else if (a.table === 'tools') {
      s.box([0.26, 0.08, 0.08], [tableAt[0] - 0.3, 0.86, tableAt[2] + 0.1], s.material('#f2c21c', { roughness: 0.5 }));
      s.cylinder(0.012, 0.012, 0.16, [tableAt[0] - 0.1, 0.86, tableAt[2] + 0.1], dark, 8).rotation.z = Math.PI / 2;
      s.cylinder(0.12, 0.1, 0.17, [tableAt[0] + 0.5, 0.905, tableAt[2] - 0.2], s.material('#e8e4da', { roughness: 0.6 }), 14);
      s.box([0.8, 0.045, 0.025], [tableAt[0], 0.84, tableAt[2] + 0.45], s.material('#f2c21c', { roughness: 0.5 }));
    } else {
      s.ball([0.06, 0.04, 0.05], [tableAt[0] + 0.3, 0.85, tableAt[2]], s.material('#efe8d2', { roughness: 0.95 }), 8);
    }
    const stacks = a.stacks;
    const rebar = stacks === 'rebar' || stacks === 'everything';
    const decking = stacks === 'decking' || stacks === 'everything';
    const kegs = stacks === 'kegs' || stacks === 'everything';
    let tarp: THREE.Mesh | null = null;
    if (rebar) {
      const rust = s.material(new THREE.Color('#7a4a32').lerp(new THREE.Color('#4a3a30'), mood.wear * 0.5), { roughness: 0.95 });
      const bundles = 2 + Math.round(mood.density);
      const along = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
      for (let b = 0; b < bundles; b++) {
        const bx = -3.7, bz = CZB + 0.4 + b * 0.75;
        const bars = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), rust, 30);
        for (let i = 0; i < 30; i++) {
          const row = Math.floor(i / 6), col = i % 6;
          matrix.compose(new THREE.Vector3(bx + (random() - 0.5) * 0.3, 0.1 + 0.016 + row * 0.034, bz + (col - 2.5) * 0.04 + (row % 2) * 0.02), along, new THREE.Vector3(0.015, 3.0 + random() * 0.3, 0.015));
          bars.setMatrixAt(i, matrix);
        }
        bars.instanceMatrix.needsUpdate = true;
        bars.castShadow = bars.receiveShadow = true;
        s.root.add(bars);
        for (const dx of [-1.1, 1.1]) s.box([0.1, 0.1, 0.4], [bx + dx, 0.05, bz], wood);
        for (const dx of [-0.9, 0.9]) { const band = s.ring(0.15, 0.005, [bx + dx, 0.19, bz], wire); band.rotation.y = Math.PI / 2; band.scale.y = 0.65; }
      }
    }
    if (decking) {
      const stackAt: P = [3.9, 0, CZB + 0.6];
      for (let i = 0; i < 10; i++) s.box([3.0, 0.03, 0.9], [stackAt[0] + (random() - 0.5) * 0.04, 0.06 + 0.015 + i * 0.032, stackAt[2] + (random() - 0.5) * 0.04], galv);
      for (const dx of [-1.1, 1.1]) s.box([0.1, 0.1, 1.0], [stackAt[0] + dx, 0.05, stackAt[2]], wood);
      for (const dx of [-0.8, 0.8]) { const strap = s.ring(0.47, 0.01, [stackAt[0] + dx, 0.22, stackAt[2]], s.material('#f2c21c', { roughness: 0.6 })); strap.rotation.y = Math.PI / 2; strap.scale.y = 0.45; }
      if (a.wind === 'tarp') {
        tarp = s.mesh(new THREE.PlaneGeometry(2.6, 1.6, 8, 4), s.material('#2b4f8a', { roughness: 0.7, side: THREE.DoubleSide }), [stackAt[0] - 0.2, 0.41, stackAt[2] + 0.1]);
        tarp.rotation.x = -Math.PI / 2;
      }
    } else if (a.wind === 'tarp') {
      tarp = s.mesh(new THREE.PlaneGeometry(2.4, 1.6, 8, 4), s.material('#2b4f8a', { roughness: 0.7, side: THREE.DoubleSide }), [3.8, 0.08, CZB + 0.7]);
      tarp.rotation.x = -Math.PI / 2;
    }
    if (kegs) {
      const keg = s.material('#8a8278', { metalness: 0.5, roughness: 0.5 });
      for (let i = 0; i < 4; i++) s.cylinder(0.17, 0.17, 0.3, [CX - 0.3 + (i % 2) * 0.38, 0.15, 0.0 + Math.floor(i / 2) * 0.4], keg, 14);
      s.box([1.2, 0.7, 0.6], [CX - 0.3, 0.45, 1.5], s.material('#b8302a', { roughness: 0.5, metalness: 0.2 }));
      s.box([1.24, 0.06, 0.64], [CX - 0.3, 0.83, 1.5], dark);
      for (const dx of [-0.45, 0.45]) s.cylinder(0.08, 0.08, 0.06, [CX - 0.3 + dx, 0.08, 1.85], dark, 12).rotation.x = Math.PI / 2;
    }
    // Lunch things: packed by the column when the whistle is near, strewn about when it is not.
    const tin = s.material('#8e9398', { metalness: 0.7, roughness: 0.4 });
    if (a.whistle) {
      for (let i = 0; i < 3; i++) { s.box([0.22, 0.13, 0.13], [-CX + 0.6 + i * 0.26, 0.065, CZB + 1.0 + (random() - 0.5) * 0.1], tin); s.cylinder(0.045, 0.045, 0.3, [-CX + 0.6 + i * 0.26, 0.15, CZB + 1.3], s.material(i % 2 ? '#2f7a3a' : '#b8302a', { roughness: 0.45 }), 12); }
    } else {
      const litter = 4 + Math.round(mood.density * 6);
      for (let i = 0; i < litter; i++) s.box([0.08 + random() * 0.06, 0.02, 0.07 + random() * 0.05], [(random() - 0.5) * (W - 2), 0.045, (random() - 0.5) * (D - 2)], s.material(random() < 0.6 ? '#efe8d2' : '#d4d8dc', { roughness: 0.9 })).rotation.y = random() * 3;
      s.box([0.22, 0.13, 0.13], [-2.3, 0.1, CZB + 0.3], tin);
      s.mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.22, 12, 1, false, 0, Math.PI), tin, [-2.3, 0.18, CZB + 0.2]).rotation.set(1.9, 0, Math.PI / 2);
    }
    // A few buckets and a cooler on a crate by the left rail.
    s.box([0.45, 0.4, 0.45], [-CX + 0.1, 0.2, 0.6], s.material('#9a7a4a', { roughness: 0.95 }));
    s.cylinder(0.19, 0.18, 0.5, [-CX + 0.1, 0.65, 0.6], s.material('#f07a1a', { roughness: 0.5 }), 18);
    s.cylinder(0.2, 0.2, 0.06, [-CX + 0.1, 0.93, 0.6], s.material('#f2f1ea', { roughness: 0.5 }), 18);
    for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) s.cylinder(0.14, 0.12, 0.36, [-CX + random() * 0.6, 0.18, 1.4 + i * 0.38], s.material(['#e8e6de', '#2b4f8a', '#2a2a2c', '#f07a1a'][i % 4], { roughness: 0.55 }), 14);

    // ---- wind: a windsock or a flag on the back-right column, or the tarp
    let sock: THREE.Mesh | null = null, flag: THREE.Mesh | null = null;
    if (a.wind === 'windsock' || a.wind === 'flag') {
      const top: P = [CX, level + 0.3, CZB];
      s.rod(top, [top[0], top[1] + 1.4, top[2]], 0.025, s.material('#8a8c8e', { metalness: 0.5 }));
      if (a.wind === 'windsock') {
        sock = s.mesh(new THREE.ConeGeometry(0.16, 1.1, 10, 1, true), s.material('#f07a1a', { roughness: 0.8, side: THREE.DoubleSide }), [top[0] - 0.55, top[1] + 1.25, top[2]]);
        sock.rotation.z = Math.PI / 2;
        s.ring(0.16, 0.012, [top[0], top[1] + 1.25, top[2]], wire).rotation.y = Math.PI / 2;
      } else {
        flag = s.mesh(new THREE.PlaneGeometry(0.9, 0.55, 6, 2), s.material(mood.cheer > 0.5 ? '#c8302a' : '#2b4f8a', { roughness: 0.8, side: THREE.DoubleSide }), [top[0] - 0.46, top[1] + 1.1, top[2]]);
      }
    }

    const energy = mood.energy;
    const tarpBase = tarp ? (tarp.geometry.attributes.position.array as Float32Array).slice() : null;
    world.update = (dt: number, time: number) => {
      if (swinging) { swinging.rotation.z = Math.sin(time * 0.7) * 0.03 * (0.3 + energy); swinging.rotation.y = Math.sin(time * 0.3) * 0.05 * (0.3 + energy); }
      hook.rotation.y = Math.sin(time * 0.3) * 0.05 * (0.3 + energy);
      if (sock) { sock.rotation.y = Math.sin(time * 2.1) * 0.12 * (0.2 + energy); sock.rotation.z = Math.PI / 2 + Math.sin(time * 1.3) * 0.08 * (0.2 + energy); }
      if (flag) {
        const pos = flag.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setZ(i, Math.sin(time * 6 + x * 5) * 0.06 * (x + 0.45) * (0.3 + energy)); }
        pos.needsUpdate = true;
      }
      if (tarp && tarpBase) {
        const pos = tarp.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) { const x = tarpBase[i * 3], y = tarpBase[i * 3 + 1]; const corner = Math.max(0, (x + y) / 2.1 - 0.4); pos.setZ(i, corner * (0.5 + Math.sin(time * 3 + x * 2) * 0.5) * 0.5 * (0.3 + energy)); }
        pos.needsUpdate = true;
      }
      if (a.whistle) (beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + Math.max(0, Math.sin(time * 4)) * 1.4;
    };
    const disposeBase = world.dispose;
    world.dispose = () => { clock.dispose(); disposeBase(); };
    return world;
  },
});
