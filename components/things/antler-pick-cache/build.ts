import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { instanced, makeNoise, solid, stoneGeometry, stoneMaterial, type Dab } from './stone';

type P3 = [number, number, number];

/** A tube along a curve whose radius runs from r0 to r1. */
function taperedTube(points: P3[], r0: number, r1: number, material: THREE.Material, tubular = 12, radial = 7) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geometry = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const centre = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    curve.getPointAt(i / tubular, centre);
    const r = mix(r0, r1, i / tubular);
    for (let j = 0; j <= radial; j++) {
      const index = i * (radial + 1) + j;
      v.fromBufferAttribute(position, index).sub(centre).multiplyScalar(r).add(centre);
      position.setXYZ(index, v.x, v.y, v.z);
    }
  }
  geometry.computeVertexNormals();
  return solid(geometry, material);
}

export default defineThing({
  questions: {
    tools: score('How many antler picks were left?', ['A single pick', 'A handful', 'A heap of a dozen or more']),
    laid: choice('How were they left?', {
      row: 'Laid side by side in a tidy row, as if to be picked up in the morning.',
      heap: 'Thrown down in a careless heap.',
      ring: 'Arranged around the lip of the pit, points inward, deliberately.',
      leaning: 'Propped against the ditch side.',
      stuck: 'Scattered, with one still jammed point-first in the chalk where its user left it.',
    }),
    antlers: choice('What are the antlers like?', {
      picks: 'Trimmed into proper picks: a long beam for a handle and one curved brow tine for the point.',
      whole: 'Whole shed antlers with all their branching tines, not yet cut down.',
      worn: 'Worn out: tines snapped, tips blunted and battered from use.',
    }),
    age: choice('How do they look now?', {
      fresh: 'Fresh, brown and cream, as if set down an hour ago.',
      ancient: 'Five thousand years on: bleached chalk-white, cracked and fragile, exactly where they fell.',
      charred: 'Scorched black along one side from a fire.',
      stained: 'Stained red with ochre, marked for some purpose.',
    }),
    with: choice('What lies with them?', {
      shovel: 'An ox shoulder-blade shovel.',
      basket: 'A wicker basket half full of chalk rubble.',
      flints: 'Flint nodules, a hammerstone and fresh flakes.',
      deposit: 'A placed offering: an ox skull and a carved chalk drum.',
      rope: 'A coil of rawhide rope and a wooden lever.',
    }),
    pit: choice('What is the digging like?', {
      scrape: 'Only a shallow scrape, barely started.',
      round: 'A round pit half dug, its sides scarred with pick marks.',
      trench: 'The steep end of a ditch, with a ramp of rubble.',
      flooded: 'A pit full of milky rainwater.',
    }),
    moment: choice('What moment is this?', {
      evening: 'The end of a working day long ago: tools down, nothing else.',
      sealed: 'A deliberate burial: the tools laid out and half covered with clean chalk rubble.',
      dig: 'An archaeological dig today: scale rod, trowel, finds labels and a string line.',
      haste: 'Abandoned in a hurry: things kicked about, footprints in the chalk mud.',
    }),
    ground: choice('What is the ground?', {
      chalk: 'Bright white chalk under a skin of turf.',
      gravel: 'Brown river gravel and sand.',
      clay: 'Sticky orange-yellow clay.',
      peat: 'Black peat over pale sand.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const noise = makeNoise(random);
    // A squared block of ground as an excavator would leave it: ditch floor in front, the ditch side rising behind.
    const X0 = -1.12, X1 = 1.12, Z0 = -0.82, Z1 = 0.92;
    const floorH = 0.24;
    const pitDepth = { scrape: 0.07, round: 0.19, trench: 0.2, flooded: 0.19 }[a.pit];
    const pitR = { scrape: 0.3, round: 0.34, trench: 0.36, flooded: 0.36 }[a.pit];
    const pit = { x: 0.36, z: 0.36 };
    const quotient = (x: number, z: number) => Math.max(Math.abs(x) / X1, z > 0 ? z / Z1 : z / Z0);
    const pitField = (x: number, z: number) => { const d = Math.hypot((x - pit.x) / (a.pit === 'trench' ? 1.6 : 1), z - pit.z) / pitR; return d < 1 ? Math.pow(1 - d * d, a.pit === 'scrape' ? 1 : 0.42) : 0; };
    const bankAt = (x: number, z: number) => THREE.MathUtils.smoothstep(-z + noise(x * 1.5, 9, 0, 2) * 0.08, 0.08, 0.5);
    const heightAt = (x: number, z: number) => {
      let h = floorH + noise(x * 2.2, 0, z * 2.2, 2) * 0.03;
      h += 0.46 * bankAt(x, z);
      h -= pitDepth * pitField(x, z);
      return Math.max(0.03, h);
    };
    const tone = { chalk: ['#ece8dc', '#cfc9b6', '#4f6b38'], gravel: ['#a98f68', '#7d6a4e', '#5d7038'], clay: ['#c99a52', '#a87a3c', '#5d7038'], peat: ['#3a2f26', '#cdbf9f', '#4a5a30'] }[a.ground];
    const top = new THREE.Color(tone[0]), under = new THREE.Color(tone[1]), turf = new THREE.Color(mood.warmth < 0.3 ? '#a3b7a8' : tone[2]);

    const nx = 56, nz = 44;
    const positions: number[] = [], colours: number[] = [], index: number[] = [];
    const c = new THREE.Color();
    const surface = (x: number, z: number, y: number) => {
      c.copy(top).lerp(under, THREE.MathUtils.smoothstep(noise(x * 3, 4, z * 3, 3), -0.05, 0.4) * 0.6);
      if (a.ground === 'peat') c.copy(top).lerp(under, THREE.MathUtils.smoothstep(floorH + 0.3 - y, 0.0, 0.3) * 0.9);
      c.multiplyScalar(0.92 + 0.12 * noise(x * 7, 2, z * 7, 2));
      c.lerp(turf, THREE.MathUtils.smoothstep(bankAt(x, z), 0.82, 0.97));
      c.multiplyScalar(1 - 0.3 * pitField(x, z));
      return c;
    };
    for (let iz = 0; iz <= nz; iz++) for (let ix = 0; ix <= nx; ix++) {
      const x = mix(X0, X1, ix / nx), z = mix(Z0, Z1, iz / nz), y = heightAt(x, z);
      positions.push(x, y, z);
      surface(x, z, y);
      colours.push(c.r, c.g, c.b);
    }
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
      const p0 = iz * (nx + 1) + ix, p1 = p0 + 1, p2 = p0 + nx + 1, p3 = p2 + 1;
      index.push(p0, p2, p1, p1, p2, p3);
    }
    // Cut section faces down to the base, showing soil over subsoil.
    const edge: [number, number][] = [];
    for (let ix = 0; ix <= nx; ix++) edge.push([mix(X0, X1, ix / nx), Z1]);
    for (let iz = nz; iz >= 0; iz--) edge.push([X1, mix(Z0, Z1, iz / nz)]);
    for (let ix = nx; ix >= 0; ix--) edge.push([mix(X0, X1, ix / nx), Z0]);
    for (let iz = 0; iz <= nz; iz++) edge.push([X0, mix(Z0, Z1, iz / nz)]);
    const soil = new THREE.Color('#4a3a2a');
    edge.forEach(([x, z], i) => {
      const y = heightAt(x, z), start = positions.length / 3;
      const turfed = bankAt(x, z) > 0.9;
      const bands: [number, THREE.Color][] = [[y, turfed ? turf : surface(x, z, y).clone()], [y - (turfed ? 0.05 : 0), turfed ? soil : surface(x, z, y).clone()], [y - (turfed ? 0.11 : 0), a.ground === 'peat' ? top : under], [0, under.clone().multiplyScalar(0.8)]];
      for (const [by, colour] of bands) { positions.push(x, Math.max(0, by), z); colours.push(colour.r, colour.g, colour.b); }
      if (i > 0) for (let k = 0; k < 3; k++) index.push(start - 4 + k, start - 3 + k, start + k, start + k, start - 3 + k, start + 1 + k);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    s.mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));

    // Rubble: loose lumps on the floor, a spoil heap by the pit.
    const rubbleMaterial = stoneMaterial(1);
    const lump = stoneGeometry(random, { size: [1, 0.7, 0.85], round: 0.35, rough: 0.09, base: '#ffffff', segments: 4 });
    const rubble: Dab[] = [];
    const lumpTint = () => `#${c.copy(top).lerp(under, random() * 0.6).getHexString()}`;
    for (let i = 0; i < Math.round(mix(30, 90, mood.density)); i++) {
      const heap = random() < 0.55;
      const angle = random() * 6.28, out = Math.sqrt(random());
      const x = heap ? pit.x + 0.35 + Math.cos(angle) * out * 0.26 : mix(X0 + 0.06, X1 - 0.06, random());
      const z = heap ? pit.z - pitR - 0.12 + Math.sin(angle) * out * 0.2 : mix(Z0 + 0.06, Z1 - 0.06, random());
      if (!heap && pitField(x, z) > 0.2 && a.pit === 'flooded') continue;
      const u = mix(0.025, 0.07, random());
      rubble.push({ at: [x, heightAt(x, z) + (heap ? (1 - out) * 0.13 : 0) - u * 0.2, z], scale: u, turn: [random() * 3, random() * 6, random() * 3], color: lumpTint() });
    }
    if (a.pit === 'flooded') {
      const water = s.cylinder(pitR * 0.9, pitR * 0.9, 0.01, [pit.x, floorH - 0.06, pit.z], new THREE.MeshStandardMaterial({ color: a.ground === 'peat' ? '#3a322a' : '#cfd6d2', roughness: 0.08, metalness: 0.35 }), 24);
      water.castShadow = false;
    }
    if (a.pit === 'round' || a.pit === 'trench') {
      // Pick marks: short dark scores down the pit side.
      const scores: Dab[] = [];
      for (let i = 0; i < 26; i++) {
        const angle = random() * 6.28, d = pitR * mix(0.62, 0.9, random());
        const x = pit.x + Math.cos(angle) * d * (a.pit === 'trench' ? 1.4 : 1), z = pit.z + Math.sin(angle) * d;
        scores.push({ at: [x, heightAt(x, z) + 0.004, z], scale: [0.012, 0.012, mix(0.06, 0.12, random())], turn: [0, -angle + Math.PI / 2, 0] });
      }
      const marks = instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: under.clone().multiplyScalar(0.55), roughness: 1 }), scores);
      marks.castShadow = false;
      s.root.add(marks);
    }

    // Antler.
    const palette = { fresh: ['#7a5636', '#e3d2ae'], ancient: a.ground === 'chalk' ? ['#b89f72', '#d9c7a0'] : ['#e3dccb', '#f1ece0'], charred: ['#2c2420', '#9a8262'], stained: ['#a2412c', '#dcae86'] }[a.age];
    const beamPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette[0]).lerp(new THREE.Color('#a8977c'), mood.wear * 0.15), roughness: 0.75 });
    const tipPaint = new THREE.MeshStandardMaterial({ color: palette[1], roughness: 0.6 });
    const antler = (length: number) => {
      const group = new THREE.Group();
      const L = length, r = L * 0.05;
      const bow = L * mix(0.06, 0.14, random());
      // Beam along +x from the burr, lying in the ground plane.
      const full = a.antlers === 'whole', worn = a.antlers === 'worn';
      const beamEnd = full ? 1 : mix(0.8, 0.95, random());
      group.add(taperedTube([[0, 0, 0], [L * 0.3, 0, -bow], [L * 0.65, 0, -bow * 0.6], [L * beamEnd, 0, bow * 0.5]], r, r * (full ? 0.5 : 0.8), beamPaint));
      const burr = solid(new THREE.TorusGeometry(r * 1.15, r * 0.45, 6, 12), beamPaint);
      burr.rotation.y = Math.PI / 2;
      burr.position.x = L * 0.01;
      group.add(burr);
      const base = solid(new THREE.SphereGeometry(r * 1.05, 8, 6), beamPaint);
      group.add(base);
      // The brow tine: the working point.
      const tineL = L * (worn ? mix(0.14, 0.26, random()) : mix(0.34, 0.42, random()));
      group.add(taperedTube([[L * 0.07, 0, 0], [L * 0.12, 0, tineL * 0.55], [L * 0.2, 0, tineL * 0.9], [L * 0.3, 0, tineL]], r * 0.8, worn ? r * 0.5 : r * 0.12, tipPaint, 10));
      if (!full) {
        // Sawn-off stubs where the other tines were.
        for (const at of [0.3, 0.62]) { const stub = solid(new THREE.CylinderGeometry(r * 0.5, r * 0.62, L * 0.05, 7), tipPaint); stub.rotation.x = Math.PI / 2; stub.position.set(L * at, 0, L * 0.03 - bow * (at < 0.5 ? 1 : 0.6)); group.add(stub); }
      } else {
        group.add(taperedTube([[L * 0.3, 0, -bow], [L * 0.38, 0, L * 0.16], [L * 0.5, 0, L * 0.28]], r * 0.62, r * 0.1, tipPaint, 8));
        group.add(taperedTube([[L * 0.64, 0, -bow * 0.6], [L * 0.72, 0, L * 0.12], [L * 0.86, 0, L * 0.2]], r * 0.55, r * 0.1, tipPaint, 8));
        group.add(taperedTube([[L * 0.96, 0, bow * 0.4], [L * 1.06, 0, -L * 0.08], [L * 1.2, 0, -L * 0.1]], r * 0.5, r * 0.08, tipPaint, 8));
        group.add(taperedTube([[L * 0.98, 0, bow * 0.5], [L * 1.1, 0, L * 0.1], [L * 1.22, 0, L * 0.18]], r * 0.5, r * 0.08, tipPaint, 8));
      }
      return group;
    };
    const count = Math.max(1, Math.round(mix(1, 9, a.tools) * mix(0.85, 1.15, random())));
    const home = { x: -0.5, z: 0.45 };
    const clampX = (x: number) => Math.min(X1 - 0.12, Math.max(X0 + 0.12, x)), clampZ = (z: number) => Math.min(Z1 - 0.12, Math.max(-0.1, z));
    for (let i = 0; i < count; i++) {
      const L = mix(0.72, 0.95, random());
      const pick = antler(L);
      const holder = new THREE.Group();
      holder.add(pick);
      if (random() < 0.5) pick.scale.z = -1;
      const r = L * 0.05;
      const flatAt = (x: number, z: number, turnY: number, lift = 0, tilt = 0) => {
        pick.position.x = -L * 0.45;
        holder.position.set(clampX(x), heightAt(clampX(x), clampZ(z)) + r + lift, clampZ(z));
        holder.rotation.set((random() - 0.5) * tilt, turnY, (random() - 0.5) * tilt);
      };
      if (a.laid === 'row') flatAt(-0.98 + i * Math.min(0.2, 1.25 / count), 0.42 + (i % 2) * 0.05, Math.PI / 2 + (random() - 0.5) * 0.12);
      else if (a.laid === 'heap') flatAt(home.x + (random() - 0.5) * 0.4, home.z + (random() - 0.5) * 0.3, random() * 6.28, i * r * 1.1, 0.5);
      else if (a.laid === 'ring') { const angle = (i / count) * Math.PI * 2 + 0.4, d = pitR + L * 0.32; flatAt(pit.x + Math.cos(angle) * d, pit.z + Math.sin(angle) * d, -angle + Math.PI); }
      else if (a.laid === 'leaning') {
        // Burr on the ditch floor, beam resting back against the slope.
        const x = clampX(-0.95 + (i + 0.5) * (1.9 / count));
        holder.position.set(x, heightAt(x, 0.08) + r, 0.08 + (random() - 0.5) * 0.08);
        holder.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.3;
        pick.rotation.z = mix(0.6, 0.8, random());
      } else if (i === 0) {
        // Point down in the pit side, handle in the air.
        holder.position.set(pit.x - pitR * 0.75, heightAt(pit.x - pitR * 0.75, pit.z) + L * 0.32, pit.z);
        pick.position.x = -L * 0.2;
        holder.rotation.set(Math.PI / 2, 0, 0.9, 'YXZ');
      } else flatAt(home.x + (random() - 0.5) * 1.0, home.z + (random() - 0.5) * 0.7, random() * 6.28, 0, 0.1);
      s.root.add(holder);
    }
    if (a.moment === 'sealed') for (let i = 0; i < 40; i++) {
      const x = home.x + (random() - 0.5) * 0.9, z = home.z + (random() - 0.5) * 0.5, u = mix(0.03, 0.06, random());
      rubble.push({ at: [x, heightAt(x, z) + u * 0.6 + random() * 0.05, z], scale: u, turn: [random() * 3, random() * 6, random() * 3], color: '#f3f0e6' });
    }
    s.root.add(instanced(lump, rubbleMaterial, rubble));

    // Company for the picks.
    const bone = new THREE.MeshStandardMaterial({ color: a.age === 'ancient' ? '#ebe5d6' : '#d8c8a4', roughness: 0.7 });
    const spot = { x: -0.55, z: -0.04 };
    const groundAt = (x: number, z: number) => heightAt(x, z);
    if (a.with === 'shovel' || a.with === 'deposit') {
      // A scapula: a broad flat triangular blade narrowing to a knuckle.
      const outline = new THREE.Shape();
      outline.moveTo(0, -0.035); outline.lineTo(0.1, -0.03); outline.quadraticCurveTo(0.3, -0.07, 0.46, -0.16);
      outline.quadraticCurveTo(0.5, 0, 0.45, 0.15); outline.quadraticCurveTo(0.28, 0.06, 0.1, 0.03); outline.lineTo(0, 0.04); outline.closePath();
      const blade = solid(new THREE.ExtrudeGeometry(outline, { depth: 0.014, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 }), bone);
      const shovel = new THREE.Group();
      blade.rotation.x = -Math.PI / 2;
      shovel.add(blade);
      const ridge = solid(new THREE.BoxGeometry(0.36, 0.03, 0.012), bone);
      ridge.position.set(0.24, 0.03, -0.01);
      const knuckle = solid(new THREE.SphereGeometry(0.045, 10, 8), bone);
      knuckle.scale.set(1, 0.7, 1.1);
      knuckle.position.set(-0.01, 0.012, 0);
      shovel.add(ridge, knuckle);
      const sx = a.with === 'deposit' ? spot.x + 0.75 : spot.x, sz = spot.z;
      shovel.position.set(sx, groundAt(sx, sz) + 0.012, sz);
      shovel.rotation.y = mix(-0.5, 0.5, random());
      shovel.scale.setScalar(1.3);
      s.root.add(shovel);
    }
    if (a.with === 'basket') {
      const wicker = s.material('#9b7443', { side: THREE.DoubleSide });
      const tipped = a.moment === 'haste';
      const basket = new THREE.Group();
      basket.add(solid(new THREE.LatheGeometry([[0.001, 0], [0.15, 0], [0.19, 0.12], [0.21, 0.24], [0.2, 0.25], [0.17, 0.12], [0.14, 0.02]].map(([x, y]) => new THREE.Vector2(x, y)), 18), wicker));
      for (let i = 1; i < 5; i++) { const band = solid(new THREE.TorusGeometry(0.155 + i * 0.012, 0.007, 5, 20), s.material('#7b5a32')); band.rotation.x = Math.PI / 2; band.position.y = i * 0.05; basket.add(band); }
      const fill = solid(new THREE.SphereGeometry(0.18, 10, 6, 0, 6.3, 0, 1.2), new THREE.MeshStandardMaterial({ color: top, roughness: 1 }));
      fill.position.y = 0.04;
      basket.add(fill);
      basket.position.set(spot.x, groundAt(spot.x, spot.z) + (tipped ? 0.17 : 0), spot.z);
      if (tipped) basket.rotation.z = 1.35;
      s.root.add(basket);
    }
    if (a.with === 'flints') {
      const dabs: Dab[] = [];
      for (let i = 0; i < 7; i++) { const x = spot.x + (random() - 0.5) * 0.5, z = spot.z + (random() - 0.5) * 0.25, u = mix(0.05, 0.1, random()); dabs.push({ at: [x, groundAt(x, z) + u * 0.25, z], scale: [u, u * 0.7, u * 0.8], turn: [random(), random() * 6, random()], color: i % 3 === 0 ? '#e9e4d6' : '#2b2c30' }); }
      s.root.add(instanced(stoneGeometry(random, { size: [1, 0.8, 0.9], round: 0.55, rough: 0.09, base: '#ffffff', segments: 5 }), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3 }), dabs));
      const flakes: Dab[] = [];
      for (let i = 0; i < 16; i++) { const x = spot.x + 0.1 + (random() - 0.5) * 0.4, z = spot.z + (random() - 0.5) * 0.3; flakes.push({ at: [x, groundAt(x, z) + 0.006, z], scale: [mix(0.02, 0.045, random()), 0.005, mix(0.012, 0.03, random())], turn: [0, random() * 6, 0] }); }
      s.root.add(instanced(new THREE.ConeGeometry(1, 1, 3), new THREE.MeshStandardMaterial({ color: '#3a3c42', roughness: 0.25 }), flakes));
      const hx = spot.x - 0.35, hz = spot.z;
      s.ball([0.07, 0.055, 0.06], [hx, groundAt(hx, hz) + 0.05, hz], s.material('#8a8377'), 12);
    }
    if (a.with === 'deposit') {
      const dx = spot.x + 0.15, dz = spot.z;
      const y = groundAt(dx, dz);
      // An ox skull, simplified: a long wedge of bone with eye sockets and horn cores.
      const skull = new THREE.Group();
      const cranium = solid(new THREE.SphereGeometry(1, 12, 8), bone); cranium.scale.set(0.11, 0.08, 0.11); cranium.position.set(0, 0.07, -0.1);
      const muzzle = solid(new THREE.CylinderGeometry(0.045, 0.085, 0.3, 8), bone); muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, 0.05, 0.1); muzzle.scale.y = 1;
      skull.add(cranium, muzzle);
      for (const side of [-1, 1]) {
        const socket = solid(new THREE.SphereGeometry(0.028, 8, 6), new THREE.MeshStandardMaterial({ color: '#1c1815', roughness: 1 })); socket.position.set(side * 0.075, 0.085, -0.03); skull.add(socket);
        skull.add(taperedTube([[side * 0.09, 0.1, -0.13], [side * 0.2, 0.13, -0.14], [side * 0.27, 0.2, -0.1]], 0.025, 0.008, bone, 8));
      }
      skull.position.set(dx, y, dz);
      skull.rotation.y = mix(-0.5, 0.5, random());
      skull.scale.setScalar(1.25);
      s.root.add(skull);
      const drum = s.cylinder(0.075, 0.08, 0.1, [dx + 0.32, groundAt(dx + 0.32, dz) + 0.05, dz + 0.05], new THREE.MeshStandardMaterial({ color: '#f1ede2', roughness: 0.9 }), 20);
      for (const band of [-0.03, 0, 0.03]) { const line = s.ring(0.079, 0.004, [drum.position.x, drum.position.y + band, drum.position.z], s.material('#6a6458')); line.rotation.x = Math.PI / 2; }
      s.cylinder(0.02, 0.02, 0.004, [drum.position.x, drum.position.y + 0.052, drum.position.z], s.material('#6a6458'), 10);
    }
    if (a.with === 'rope') {
      const hide = s.material('#a9825a');
      const rx = spot.x, rz = spot.z, y = groundAt(rx, rz);
      for (let i = 0; i < 4; i++) { const coil = s.ring(0.15 - i * 0.012, 0.014, [rx + (random() - 0.5) * 0.02, y + 0.016 + i * 0.022, rz + (random() - 0.5) * 0.02], hide); coil.rotation.x = Math.PI / 2; }
      s.tube([[rx + 0.14, y + 0.02, rz], [rx + 0.3, y + 0.02, rz + 0.1], [rx + 0.42, groundAt(rx + 0.42, rz) + 0.02, rz - 0.02]], 0.013, hide);
      s.rod([-1.0, groundAt(-1.0, 0.8) + 0.04, 0.8], [0.1, groundAt(0.1, 0.84) + 0.04, 0.84], 0.03, s.material('#7a5c3c'), 0.022);
    }

    // The moment.
    if (a.moment === 'dig') {
      const pole = new THREE.Group();
      for (let i = 0; i < 5; i++) { const seg = solid(new THREE.BoxGeometry(0.1, 0.012, 0.03), new THREE.MeshStandardMaterial({ color: i % 2 ? '#f4f1e6' : '#c8321f', roughness: 0.6 })); seg.position.x = (i - 2) * 0.1; pole.add(seg); }
      const px = -0.45, pz = 0.84;
      pole.position.set(px, groundAt(px, pz) + 0.012, pz);
      pole.rotation.y = 0.12;
      s.root.add(pole);
      const steel = s.material('#b8bcc0', { metalness: 0.7, roughness: 0.35 });
      const tx = 0.85, tz = -0.05, ty = groundAt(tx, tz);
      s.rod([tx, ty + 0.02, tz], [tx + 0.1, ty + 0.025, tz + 0.04], 0.014, s.material('#8b5a34'));
      const blade = s.mesh(new THREE.ConeGeometry(0.035, 0.11, 3), steel, [tx - 0.06, ty + 0.012, tz - 0.024]);
      blade.rotation.set(0, -0.4, Math.PI / 2);
      blade.scale.z = 0.2;
      const tags: Dab[] = [];
      for (let i = 0; i < 6; i++) { const x = home.x + (random() - 0.5) * 0.9, z = home.z + 0.1 + (random() - 0.5) * 0.4; tags.push({ at: [x, groundAt(x, z) + 0.035, z], scale: [0.05, 0.035, 0.002], turn: [-0.5, random() * 0.6 - 0.3, 0] }); }
      s.root.add(instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#f6d04a', roughness: 0.7 }), tags));
      const nail = s.material('#4a4d52');
      s.rod([-1.05, groundAt(-1.05, 0.02), 0.02], [-1.05, groundAt(-1.05, 0.02) + 0.14, 0.02], 0.008, nail);
      s.rod([1.05, groundAt(1.05, 0.02), 0.02], [1.05, groundAt(1.05, 0.02) + 0.14, 0.02], 0.008, nail);
      s.rod([-1.05, groundAt(-1.05, 0.02) + 0.13, 0.02], [1.05, groundAt(1.05, 0.02) + 0.13, 0.02], 0.005, s.material('#e8452c'));
    }
    if (a.moment === 'haste') {
      const prints: Dab[] = [];
      let fx = -1.0, fz = 0.8;
      for (let i = 0; i < 9; i++) { prints.push({ at: [fx, groundAt(fx, fz) + 0.004, fz + (i % 2 ? 0.07 : -0.07)], scale: [0.11, 0.004, 0.045], turn: [0, 0.15, 0] }); fx += 0.23; fz -= 0.035; }
      const mesh = instanced(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: under.clone().multiplyScalar(0.6), roughness: 1 }), prints);
      mesh.castShadow = false;
      s.root.add(mesh);
    }

    return s.finish();
  },
});
