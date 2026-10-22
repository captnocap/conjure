import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, score } from '@conjure/kit';

const STONES = {
  marble: 'White marble with faint grey veins, classical and cold.',
  sandstone: 'Red desert sandstone in soft banded layers.',
  basalt: 'Black basalt, heavy and polished by wind.',
  concrete: 'Weathered grey concrete with formwork lines and rust streaks.',
  bronze: 'Bronze gone green with verdigris, darker metal showing on the high points.',
} as const;
const STONE_PAINT: Record<keyof typeof STONES, { base: string; mark: string; rough: number; metal: number }> = {
  marble: { base: '#e9e6df', mark: '#9a9ca6', rough: 0.45, metal: 0 },
  sandstone: { base: '#b9623f', mark: '#7d3a26', rough: 0.9, metal: 0 },
  basalt: { base: '#33353a', mark: '#15161a', rough: 0.5, metal: 0.1 },
  concrete: { base: '#a3a39b', mark: '#6f5a48', rough: 0.95, metal: 0 },
  bronze: { base: '#5fa48c', mark: '#5a4326', rough: 0.6, metal: 0.55 },
};
// Each style is a set of keys along the nose from brow (t = 0) to where it meets the lip (t = 1).
const STYLES = {
  roman: 'Aquiline, with a proud high-bridged hump: an emperor or a senator.',
  egyptian: 'Long, straight and smooth with a narrow tip: a pharaoh, serene.',
  olmec: 'Broad and flat with wide flaring nostrils: a colossal basalt head.',
  soviet: 'Angular faceted planes, heroic realism cut with a ruler.',
  cartoon: 'A big bulbous ball of a nose, comic and friendly.',
} as const;
type Keys = readonly (readonly [number, number])[];
const SHAPE: Record<keyof typeof STYLES, { length: number; width: number; depth: number; d: Keys; w: Keys; power: number; facets: boolean; tip: number; wing: number }> = {
  roman: { length: 10, width: 2.5, depth: 4.4, d: [[0, 0.22], [0.3, 0.62], [0.55, 0.7], [0.84, 1], [0.93, 0.86], [1, 0.3]], w: [[0, 0.42], [0.5, 0.5], [0.8, 0.86], [0.9, 0.9], [1, 0.6]], power: 0.75, facets: false, tip: 0.8, wing: 1 },
  egyptian: { length: 10.5, width: 2.1, depth: 3.5, d: [[0, 0.3], [0.5, 0.62], [0.86, 1], [0.94, 0.85], [1, 0.3]], w: [[0, 0.4], [0.6, 0.48], [0.84, 0.82], [0.92, 0.84], [1, 0.55]], power: 0.9, facets: false, tip: 0.55, wing: 0.8 },
  olmec: { length: 7.4, width: 3.9, depth: 3.1, d: [[0, 0.2], [0.4, 0.5], [0.8, 1], [0.92, 0.9], [1, 0.4]], w: [[0, 0.5], [0.4, 0.62], [0.78, 0.92], [0.9, 0.95], [1, 0.7]], power: 0.6, facets: false, tip: 1.05, wing: 1.25 },
  soviet: { length: 10, width: 2.6, depth: 4.2, d: [[0, 0.3], [0.45, 0.6], [0.82, 1], [0.92, 0.9], [1, 0.3]], w: [[0, 0.45], [0.55, 0.5], [0.82, 0.9], [0.92, 0.9], [1, 0.6]], power: 1.25, facets: true, tip: 0, wing: 0 },
  cartoon: { length: 7.6, width: 3.2, depth: 4.6, d: [[0, 0.16], [0.4, 0.34], [0.72, 0.9], [0.86, 1], [1, 0.3]], w: [[0, 0.3], [0.45, 0.4], [0.76, 0.86], [0.9, 0.9], [1, 0.55]], power: 0.55, facets: false, tip: 1.5, wing: 1.1 },
};

const key = (keys: Keys, t: number) => {
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const u = (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]);
      return mix(keys[i - 1][1], keys[i][1], u * u * (3 - 2 * u));
    }
  }
  return keys[keys.length - 1][1];
};

export default defineThing({
  questions: {
    stone: choice('What is the nose carved or cast from?', STONES),
    style: choice('What kind of statue did it come from?', STYLES),
    lives: choice('What lives in it now?', {
      nothing: 'Nothing. Two empty cave mouths and the wind.',
      birds: 'Birds nest in one nostril: twigs spill out and a flock circles.',
      stairs: 'Someone has built a staircase up to a nostril and hung a small door in it.',
      vine: 'A green vine has climbed out of the ground and over the bridge.',
    }),
    break: choice('How did it break and how does it sit?', {
      slab: 'A clean slab: it lies flat on a neat cut face, tip to the sky.',
      jagged: 'A jagged break: it leans on a ragged plate of cheek with shards around it.',
      sunk: 'Half sunk: it tilts out of the ground with a drift climbing its side.',
    }),
    happened: choice('What happened to the statue?', {
      time: 'Toppled by time: worn edges and a scatter of fallen stone.',
      shot: 'Shot off: cannonball craters in the bridge and iron balls lying at its foot.',
      quarried: 'Quarried and abandoned: scaffold poles, a ladder and cut blocks left beside it.',
    }),
    size: score('How big is it?', ['The height of a person', 'A house', 'A cathedral front']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const nose = new THREE.Group();
    root.add(nose);
    const shape = SHAPE[a.style];
    const paint = STONE_PAINT[a.stone];
    const unit = mix(0.22, 1.5, a.size);
    const L = shape.length * unit, W = shape.width * unit, D = shape.depth * unit;

    // Painted stone: speckle, bands or veins, and grime that grows with wear.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = paint.base;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = ctx.fillStyle = paint.mark;
    if (a.stone === 'sandstone' || a.stone === 'concrete') {
      for (let y = 0; y < 256; y += a.stone === 'concrete' ? 32 : 9 + random() * 14) {
        ctx.globalAlpha = a.stone === 'concrete' ? 0.5 : 0.12 + random() * 0.3;
        ctx.fillRect(0, y, 256, a.stone === 'concrete' ? 1.5 : 2 + random() * 6);
      }
    }
    if (a.stone === 'marble' || a.stone === 'basalt' || a.stone === 'bronze') {
      for (let i = 0; i < 9; i++) {
        ctx.globalAlpha = 0.25 + random() * 0.3;
        ctx.lineWidth = 0.6 + random() * 1.6;
        ctx.beginPath();
        let x = random() * 256, y = 0;
        ctx.moveTo(x, y);
        while (y < 256) { x += (random() - 0.5) * 40; y += 12 + random() * 20; ctx.lineTo(x, y); }
        ctx.stroke();
      }
    }
    for (let i = 0; i < 500 + mood.wear * 1500; i++) {
      ctx.globalAlpha = 0.05 + random() * 0.14 * (0.5 + mood.wear);
      ctx.fillStyle = random() < 0.7 ? paint.mark : '#ffffff';
      const r = 0.5 + random() * (a.stone === 'bronze' ? 5 : 2.2);
      ctx.fillRect(random() * 256, random() * 256, r, r);
    }
    if (a.stone === 'concrete' || mood.wear > 0.6) {
      ctx.fillStyle = a.stone === 'bronze' ? '#d7efe2' : '#5a3a26';
      for (let i = 0; i < 10; i++) { ctx.globalAlpha = 0.1 + mood.wear * 0.2; ctx.fillRect(random() * 256, random() * 100, 2 + random() * 5, 40 + random() * 150); }
    }
    ctx.globalAlpha = 1;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    const stone = new THREE.MeshStandardMaterial({ map, roughness: Math.min(1, paint.rough + mood.wear * 0.25), metalness: paint.metal, flatShading: shape.facets });
    const raw = new THREE.MeshStandardMaterial({ color: new THREE.Color(paint.base).multiplyScalar(a.stone === 'bronze' ? 0.45 : 0.8), roughness: 1, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: '#0d0b0c', roughness: 1 });
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: readonly [number, number, number] = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // The nose itself, lofted from brow to lip in its own frame: y up the face, z out of it.
    const rows = shape.facets ? 9 : 34, cols = shape.facets ? 6 : 28;
    const positions: number[] = [], uvs: number[] = [], index: number[] = [];
    const chip = mood.wear * 0.05 * D;
    for (let i = 0; i <= rows; i++) {
      const t = i / rows;
      for (let j = 0; j <= cols; j++) {
        const phi = (j / cols - 0.5) * Math.PI;
        const depth = key(shape.d, t) * D, width = key(shape.w, t) * W;
        const bump = shape.facets ? 0 : (Math.sin(t * 37 + j * 1.7) + Math.sin(t * 91 - j * 0.9)) * chip;
        positions.push(Math.sin(phi) * width, L * (1 - t) ** (t > 0.85 ? 1.25 : 1), Math.max(0, Math.cos(phi)) ** shape.power * depth + bump * Math.cos(phi));
        uvs.push(j / cols * 2, t * 2);
        if (i < rows && j < cols) {
          const p = i * (cols + 1) + j;
          index.push(p, p + cols + 1, p + 1, p + 1, p + cols + 1, p + cols + 2);
        }
      }
    }
    let loft: THREE.BufferGeometry = new THREE.BufferGeometry();
    loft.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    loft.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    loft.setIndex(index);
    if (shape.facets) loft = loft.toNonIndexed();
    loft.computeVertexNormals();
    add(nose, loft, stone);
    // Ball of the tip and the two wings, the way a sculptor blocks a nose in.
    const sphere = new THREE.SphereGeometry(1, 28, 20);
    if (shape.tip > 0) add(nose, sphere, stone, [0, L * 0.17, D * (0.98 - 0.36 * shape.tip * 0.6)]).scale.set(W * 0.4 * shape.tip, L * 0.13 * shape.tip, D * 0.36 * shape.tip * 0.62);
    for (const side of [-1, 1]) {
      if (shape.wing > 0) add(nose, sphere, stone, [side * W * 0.7, L * 0.115, D * 0.36]).scale.set(W * 0.36 * shape.wing, L * 0.115 * shape.wing, D * 0.34);
      else add(nose, new THREE.BoxGeometry(W * 0.5, L * 0.2, D * 0.55), stone, [side * W * 0.72, L * 0.11, D * 0.33]).rotation.set(0.1, side * 0.35, side * 0.2);
      // Nostrils: dark hollows on the underside, which faces the viewer once the nose is laid back.
      const hole = add(nose, sphere, dark, [side * W * 0.42, L * 0.05, D * 0.6]);
      hole.scale.set(W * 0.28, L * 0.045, D * 0.24);
      hole.rotation.set(-0.62, side * 0.3, side * 0.25);
    }
    // The wedge of face it broke away with: deep enough that the ground cuts it flat.
    const plate = new THREE.Shape();
    const corners = a.break === 'slab' ? 8 : 15;
    for (let i = 0; i < corners; i++) {
      const angle = i / corners * Math.PI * 2 + 0.3;
      const jag = a.break === 'slab' ? 1 : 0.8 + random() * 0.45;
      const squared = 1 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle))) ** (a.break === 'slab' ? 0.85 : 0.3);
      const x = Math.cos(angle) * W * 1.08 * jag * squared, y = L * 0.48 + Math.sin(angle) * L * 0.55 * jag * squared;
      if (i === 0) plate.moveTo(x, y); else plate.lineTo(x, y);
    }
    const thick = D * 0.45;
    add(nose, new THREE.ExtrudeGeometry(plate, { depth: thick, bevelEnabled: false }), a.break === 'slab' ? stone : raw, [0, 0, -thick]);
    add(nose, new THREE.ShapeGeometry(plate), stone, [0, 0, unit * 0.02]);

    // Lean it back onto the fracture and let the ground take as much as the story says.
    const tilt = { slab: 24, jagged: 36, sunk: 50 }[a.break] * Math.PI / 180;
    nose.rotation.x = -tilt;
    nose.rotation.z = a.break === 'slab' ? 0 : (random() - 0.5) * 0.3;
    nose.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(nose);
    const lip = new THREE.Vector3(0, 0, 0).applyMatrix4(nose.matrixWorld).y;
    const sink = a.break === 'sunk' ? L * 0.07 : a.break === 'jagged' ? L * 0.03 : 0;
    nose.position.set(-(box.min.x + box.max.x) / 2, -Math.max(lip, box.min.y + L * 0.02) - sink, -(box.min.z + box.max.z) / 2);
    nose.updateMatrixWorld(true);
    const world = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(nose.matrixWorld);
    const front = new THREE.Box3().setFromObject(nose).max.z;
    const reach = Math.max(W, D) * 1.5;

    // Rubble, shards and drift.
    const rubble: { at: [number, number, number]; size: number }[] = [];
    const lumps = Math.round(mix(3, 16, mood.density) * (a.break === 'jagged' ? 1.6 : 1) * (a.happened === 'time' ? 1.4 : 0.6));
    for (let i = 0; i < lumps; i++) {
      const angle = random() * Math.PI * 2, distance = reach * (0.75 + random() * 0.45), size = unit * (0.25 + random() * 0.9);
      rubble.push({ at: [Math.cos(angle) * distance, size * 0.3, Math.sin(angle) * distance * 0.9], size });
    }
    if (rubble.length) {
      const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), raw, rubble.length);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion();
      rubble.forEach((lump, i) => {
        turn.setFromEuler(new THREE.Euler(random() * 3, random() * 3, random() * 3));
        stones.setMatrixAt(i, matrix.compose(new THREE.Vector3(...lump.at), turn, new THREE.Vector3(lump.size, lump.size * 0.7, lump.size)));
      });
      stones.castShadow = stones.receiveShadow = true;
      root.add(stones);
    }
    if (a.break === 'sunk') {
      const sand = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9c39a').lerp(new THREE.Color('#c9a27a'), mood.warmth), roughness: 1 });
      for (let i = 0; i < 3; i++) add(root, sphere, sand, [(random() < 0.5 ? -1 : 1) * W * (0.9 + random() * 0.5), 0, (random() - 0.6) * D]).scale.set(W * (1.1 + random()), L * 0.06 * (0.5 + random() * 0.5), D * (0.7 + random() * 0.5));
    }

    // What lives in it.
    const side = random() < 0.5 ? -1 : 1;
    const mouth = world(side * W * 0.4, L * 0.02, D * 0.52);
    const birds: THREE.Object3D[] = [];
    if (a.lives === 'birds') {
      const twig = new THREE.MeshStandardMaterial({ color: '#6b5133', roughness: 1 });
      const nest = add(root, new THREE.TorusGeometry(W * 0.2, W * 0.07, 6, 14), twig, [mouth.x, mouth.y - L * 0.02, mouth.z + D * 0.05]);
      nest.rotation.x = Math.PI / 2 - 0.5;
      for (let i = 0; i < 16; i++) {
        const stick = add(root, new THREE.CylinderGeometry(unit * 0.03, unit * 0.03, W * (0.3 + random() * 0.4), 4), twig, [mouth.x + (random() - 0.5) * W * 0.4, mouth.y - L * 0.02 + (random() - 0.6) * unit * 0.6, mouth.z + D * 0.05 + random() * unit * 0.4]);
        stick.rotation.set(random() * 3, random() * 3, random() * 3);
      }
      const feather = new THREE.MeshStandardMaterial({ color: a.stone === 'basalt' ? '#f1efe8' : '#1d1d22', roughness: 0.8, side: THREE.DoubleSide });
      const wing = new THREE.BufferGeometry();
      wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.5, 0, 0, -0.5, 1.6, 0.35, -0.2, 0, 0, 0.5, -1.6, 0.35, -0.2, 0, 0, -0.5], 3));
      wing.computeVertexNormals();
      const flock = 4 + Math.round(mood.density * 7);
      for (let i = 0; i < flock; i++) {
        const bird = add(root, wing, feather);
        bird.scale.setScalar(unit * (0.35 + random() * 0.25));
        bird.userData = { angle: random() * Math.PI * 2, radius: W * (0.6 + random() * 1.6), height: mouth.y + unit * (1 + random() * 5), speed: 0.4 + random() * 0.5 };
        birds.push(bird);
      }
    }
    if (a.lives === 'stairs') {
      const wood = new THREE.MeshStandardMaterial({ color: '#7a5636', roughness: 0.9 });
      const steps = Math.max(4, Math.round(mouth.y / (unit * 0.42)));
      const run = unit * 0.5;
      for (let i = 0; i < steps; i++) add(root, new THREE.BoxGeometry(unit * 1.6, unit * 0.14, run * 1.1), wood, [mouth.x, (i + 1) / steps * (mouth.y - unit * 0.9), front + (steps - i) * run * 0.55 - (front - mouth.z) * (i / steps)]);
      for (const x of [-1, 1]) {
        const rail = add(root, new THREE.CylinderGeometry(unit * 0.05, unit * 0.05, 1, 5), wood);
        const from = new THREE.Vector3(mouth.x + x * unit * 0.8, unit * 0.9, front + steps * run * 0.55), to = new THREE.Vector3(mouth.x + x * unit * 0.8, mouth.y, mouth.z + unit * 0.3);
        rail.position.copy(from).add(to).multiplyScalar(0.5);
        rail.scale.y = from.distanceTo(to);
        rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
        add(root, new THREE.CylinderGeometry(unit * 0.05, unit * 0.05, unit * 0.9, 5), wood, [from.x, unit * 0.45, from.z]);
      }
      const door = add(root, new THREE.BoxGeometry(W * 0.26, W * 0.42, unit * 0.12), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#c8452f' : '#3f5a4a', roughness: 0.6 }), [mouth.x, mouth.y, mouth.z + unit * 0.15]);
      add(root, new THREE.SphereGeometry(unit * 0.07, 8, 6), new THREE.MeshStandardMaterial({ color: '#f3d27a', emissive: '#f3b84a', emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 }), [door.position.x + W * 0.08, mouth.y, mouth.z + unit * 0.25]);
    }
    if (a.lives === 'vine') {
      const green = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3f7d34').lerp(new THREE.Color('#8a8a3a'), mood.wear * 0.6), roughness: 0.8 });
      const leaves: THREE.Vector3[] = [];
      for (let v = 0; v < 3; v++) {
        const sx = (v - 1) * 0.5 + (random() - 0.5) * 0.3;
        const path: THREE.Vector3[] = [];
        for (let i = 0; i <= 9; i++) {
          const t = 1 - i / 9 * (0.55 + random() * 0.05 + v * 0.12);
          const phi = sx * 1.2 + Math.sin(i * 1.3 + v) * 0.25;
          const p = world(Math.sin(phi) * key(shape.w, t) * W * 1.04, L * (1 - t), Math.max(0, Math.cos(phi)) ** shape.power * key(shape.d, t) * D * 1.05 + unit * 0.05);
          if (i === 0) path.push(new THREE.Vector3(p.x, -0.2, p.z + unit));
          path.push(p);
          leaves.push(p);
        }
        const curve = new THREE.CatmullRomCurve3(path);
        add(root, new THREE.TubeGeometry(curve, 60, unit * 0.09, 5), green);
        for (let i = 0; i < 26; i++) leaves.push(curve.getPoint(random()));
      }
      const foliage = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), green, leaves.length);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion();
      leaves.forEach((leaf, i) => {
        turn.setFromEuler(new THREE.Euler(random() * 3, random() * 3, random() * 3));
        const size = unit * (0.2 + random() * 0.3);
        foliage.setMatrixAt(i, matrix.compose(leaf.clone().add(new THREE.Vector3((random() - 0.5) * unit * 0.6, (random() - 0.5) * unit * 0.6, (random() - 0.5) * unit * 0.6)), turn, new THREE.Vector3(size, size * 0.3, size * 0.7)));
      });
      foliage.castShadow = true;
      root.add(foliage);
    }

    // What happened.
    if (a.happened === 'shot') {
      const iron = new THREE.MeshStandardMaterial({ color: '#2a2625', roughness: 0.6, metalness: 0.5 });
      for (let i = 0; i < 2 + Math.round(mood.wear * 3); i++) {
        const t = 0.08 + random() * 0.45, phi = (random() - 0.5) * 1.6;
        const p = world(Math.sin(phi) * key(shape.w, t) * W, L * (1 - t), Math.max(0, Math.cos(phi)) ** shape.power * key(shape.d, t) * D);
        const crater = add(root, sphere, dark, [p.x, p.y, p.z]);
        crater.scale.setScalar(unit * (0.1 + random() * 0.1));
        const rim = add(root, new THREE.TorusGeometry(1, 0.28, 5, 9), raw, [p.x, p.y, p.z]);
        rim.scale.setScalar(crater.scale.x * 2.2);
        rim.lookAt(p.x, p.y + 10, p.z + 6);
      }
      for (let i = 0; i < 3 + Math.round(random() * 3); i++) add(root, sphere, iron, [(random() - 0.5) * reach * 1.6, unit * 0.36, front + unit * (0.6 + random() * 2)]).scale.setScalar(unit * 0.36);
    }
    if (a.happened === 'quarried') {
      const pole = new THREE.MeshStandardMaterial({ color: '#9a7a4e', roughness: 0.9 });
      const edge = new THREE.Box3().setFromObject(nose);
      const x0 = edge.max.x + unit * 0.5, top = edge.max.y * 0.85;
      const bar = (from: [number, number, number], to: [number, number, number], radius = unit * 0.07) => {
        const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to);
        const rod = add(root, new THREE.CylinderGeometry(radius, radius, p.distanceTo(q), 5), pole, [(p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2]);
        rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.sub(p).normalize());
      };
      const zs = [-D * 0.5, 0, D * 0.5];
      for (const z of zs) for (const x of [x0, x0 + unit * 1.4]) bar([x, 0, z], [x, top, z]);
      const decks = Math.max(2, Math.round(top / (unit * 2.2)));
      for (let d = 1; d <= decks; d++) {
        const y = d / decks * top * 0.96;
        for (const x of [x0, x0 + unit * 1.4]) bar([x, y, zs[0]], [x, y, zs[2]]);
        for (const z of zs) bar([x0, y, z], [x0 + unit * 1.4, y, z]);
        add(root, new THREE.BoxGeometry(unit * 1.3, unit * 0.08, D), pole, [x0 + unit * 0.7, y + unit * 0.08, 0]);
        bar([x0 + unit * 1.4, y - top / decks * 0.96, zs[d % 2 * 2]], [x0 + unit * 1.4, y, zs[2 - d % 2 * 2]], unit * 0.04);
      }
      for (let i = 0; i < 3 + Math.round(mood.density * 3); i++) {
        const block = add(root, new THREE.BoxGeometry(unit * 1.6, unit * 1.1, unit * 1.1), stone, [-reach * (0.75 + random() * 0.3), unit * 0.55 + (i % 2) * unit * 1.1 * (random() < 0.4 ? 1 : 0), front - random() * D * 1.4]);
        block.rotation.y = (random() - 0.5) * 0.6;
      }
      // A ladder for scale, leaning on the bridge.
      const lean = world(-W * 0.35, L * 0.55, key(shape.d, 0.45) * D * 0.9);
      const foot = new THREE.Vector3(lean.x - unit * 0.8, 0, lean.z + lean.y * 0.45);
      for (const x of [-1, 1]) bar([foot.x + x * unit * 0.3, 0, foot.z], [lean.x + x * unit * 0.3, lean.y, lean.z], unit * 0.045);
      const rungs = Math.round(lean.y / (unit * 0.4));
      for (let i = 1; i < rungs; i++) {
        const p = foot.clone().lerp(lean, i / rungs);
        bar([p.x - unit * 0.3, p.y, p.z], [p.x + unit * 0.3, p.y, p.z], unit * 0.035);
      }
    }

    const speed = mix(0.15, 1.3, mood.energy);
    const fly = (_dt: number, time: number) => {
      for (const bird of birds) {
        const { angle, radius, height, speed: own } = bird.userData as { angle: number; radius: number; height: number; speed: number };
        const turn = angle + time * speed * own;
        bird.position.set(mouth.x + Math.cos(turn) * radius, height + Math.sin(time * 2 * own + angle) * unit * 0.3, mouth.z + D * 0.3 + Math.sin(turn) * radius);
        bird.rotation.y = -turn;
        bird.scale.y = bird.scale.x * (0.4 + Math.abs(Math.sin(time * 6 * speed + angle)) * 1.2);
      }
    };
    fly(0, 0);
    return {
      object: root,
      footprint: reach * 0.9,
      update: birds.length ? fly : undefined,
      dispose: () => { map.dispose(); disposeTree(root); },
    };
  },
});
