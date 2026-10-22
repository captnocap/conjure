import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];

const SPECIES = {
  whale: 'Whale-like: a long arched beak of a skull, two great bowed jawbones, broad barrel ribs.',
  serpent: 'A sea serpent: a small fanged head on an endless winding spine of many small ribs.',
  armoured: 'An armoured fish: a huge blunt helmet of bone plates with shearing blade jaws, short body.',
  crawler: 'Something many-limbed: a flat head shield with pincer mandibles and rows of jointed legs.',
  reptile: 'A marine reptile: a long narrow toothed snout, deep ribs and four paddle limbs.',
} as const;
interface Plan { length: number; ribs: number; ribHeight: number; wind: number; cranium: P; snout: number; snoutWidth: number; bow: number; gape: number }
const PLAN: Record<keyof typeof SPECIES, Plan> = {
  whale: { length: 8.5, ribs: 11, ribHeight: 3.0, wind: 0.3, cranium: [0.95, 0.75, 0.9], snout: 3.0, snoutWidth: 0.5, bow: 1.15, gape: 0.22 },
  serpent: { length: 12, ribs: 24, ribHeight: 1.15, wind: 1.5, cranium: [0.6, 0.42, 0.5], snout: 1.1, snoutWidth: 0.34, bow: 0.3, gape: 0.6 },
  armoured: { length: 6, ribs: 8, ribHeight: 2.4, wind: 0.2, cranium: [1.35, 1.15, 1.3], snout: 0.7, snoutWidth: 0.9, bow: 0.75, gape: 0.5 },
  crawler: { length: 8, ribs: 9, ribHeight: 1.3, wind: 0.5, cranium: [0.9, 0.45, 1.15], snout: 0, snoutWidth: 0.4, bow: 0.8, gape: 0 },
  reptile: { length: 8, ribs: 12, ribHeight: 2.2, wind: 0.35, cranium: [0.8, 0.55, 0.7], snout: 2.5, snoutWidth: 0.32, bow: 0.4, gape: 0.34 },
};

/** A tube that thins from one end to the other. */
function horn(points: readonly P[], from: number, to: number, segments = 20) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const geometry = new THREE.TubeGeometry(curve, segments, 1, 7);
  const position = geometry.getAttribute('position');
  const centre = new THREE.Vector3(), vertex = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    const t = Math.floor(i / 8) / segments;
    curve.getPointAt(Math.min(1, t), centre);
    vertex.fromBufferAttribute(position, i).sub(centre).multiplyScalar(mix(from, to, t)).add(centre);
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    species: choice('What shape of creature was it?', SPECIES),
    exposed: score('How much of it has been dug out of the ice?', ['Nothing: only a dark shape seen through the ice', 'Just the head', 'Head and half the ribs', 'The whole skeleton stands free']),
    frozen: choice('Is it still frozen?', {
      solid: 'Frozen solid in hard clear ice.',
      melting: 'The ice is slumping and melting, pooling water around it.',
      cracked: 'The ice is shot through with fresh white cracks.',
      flesh: 'Thawed enough that dark sinew and skin still hang between the exposed bones.',
      escaped: 'Something has broken out: ribs snapped outward, ice burst, a trail leading away.',
    }),
    bone: choice('What do the bones look like?', {
      ivory: 'Old ivory, yellowed and dry.',
      black: 'Mineralised black, like polished coal.',
      glass: 'Pale blue and glassy, faintly luminous.',
      rust: 'Stained rust red.',
    }),
    teeth: choice('What are its teeth like?', {
      needle: 'Long thin needles.',
      peg: 'Blunt pegs.',
      tusk: 'A few great curved tusks.',
      none: 'None: bare jaw edges.',
    }),
    dig: choice('What have the excavators left around it?', {
      stakes: 'A grid of survey stakes with flagging tape and string lines.',
      scaffold: 'A scaffold tower with a ladder, for reaching the high ribs.',
      lamps: 'Heat lamps on tripods, aimed at the ice.',
      tools: 'Scattered tools: a pickaxe, a shovel, a crate.',
      nothing: 'Nothing: nobody has touched it.',
    }),
    eye: noul('Does something glow in the eye socket?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const plan = PLAN[a.species];
    const boneColour = { ivory: '#e8dcc0', black: '#22211f', glass: '#a9dcf2', rust: '#a3522f' }[a.bone];
    const bone = s.material(boneColour, { roughness: a.bone === 'black' ? 0.25 : 0.6, metalness: a.bone === 'black' ? 0.3 : 0, emissive: a.bone === 'glass' ? '#4ab8ff' : '#000000', emissiveIntensity: a.bone === 'glass' ? 0.5 : 0 });
    const dark = s.material('#111315', { roughness: 0.9 });
    const iceRock = s.material('#cfe6f1', { roughness: 0.35, flatShading: true });
    const snow = s.material('#f4f9fc', { roughness: 0.95 });
    const steel = s.material('#8c969b', { metalness: 0.7, roughness: 0.4 });

    // Spine path: tail at u = 0, neck at u = 1.
    const L = plan.length, flip = random() < 0.5 ? 1 : -1;
    const spine = (u: number): P => [-L / 2 + u * L, 0.28, Math.sin(u * Math.PI * (a.species === 'serpent' ? 2.6 : 1)) * plan.wind * flip];
    const heading = (u: number) => { const p = spine(Math.max(0, u - 0.01)), q = spine(Math.min(1, u + 0.01)); return Math.atan2(-(q[2] - p[2]), q[0] - p[0]); };
    const neck = spine(1), neckTurn = heading(1);
    const headLength = plan.cranium[0] * 1.6 + plan.snout;
    const xMin = -L / 2 - 0.6, xMax = neck[0] + headLength + 0.6;
    // Excavation runs from the head back toward the tail.
    const cut = a.exposed > 0.96 ? xMin - 1 : mix(xMax + 0.3, xMin + 0.8, a.exposed);
    const escaped = a.frozen === 'escaped';

    s.mesh(horn(Array.from({ length: 14 }, (_unused, i) => spine(i / 13)), 0.07, 0.22, 60), bone);
    const knobs: { at: P; size: number }[] = [];
    for (let i = 0; i <= L / 0.3; i++) { const u = i / (L / 0.3), p = spine(u); knobs.push({ at: [p[0], p[1] + 0.02, p[2]], size: mix(0.1, 0.27, u) }); knobs.push({ at: [p[0], p[1] + mix(0.14, 0.4, u), p[2]], size: mix(0.05, 0.1, u) }); }
    s.scatter(new THREE.IcosahedronGeometry(1, 1), bone, knobs);

    // Ribs (or, for the crawler, back plates and legs).
    const ribStart = a.species === 'serpent' ? 0.06 : 0.3;
    const stations: { u: number; x: number; h: number; w: number }[] = [];
    for (let i = 0; i < plan.ribs; i++) {
      const t = i / (plan.ribs - 1), u = mix(ribStart, 0.97, t);
      const swell = a.species === 'serpent' ? 0.75 + 0.25 * Math.sin(t * Math.PI) : Math.sin(Math.PI * mix(0.12, 0.88, t)) ** 0.7;
      const h = plan.ribHeight * swell * (0.92 + random() * 0.16), w = h * (a.species === 'crawler' ? 1.0 : 0.62);
      const p = spine(u);
      stations.push({ u, x: p[0], h, w });
      const group = new THREE.Group();
      group.position.set(...p); group.rotation.y = heading(u);
      for (const side of [-1, 1]) {
        const burst = escaped && side === 1 && t > 0.3 && t < 0.85;
        let pts: P[];
        if (a.species === 'crawler') pts = [[0, 0.05, 0], [0, h * 0.75, side * w * 0.5], [0, h, side * w * 1.1], [0, h * 0.45, side * w * 1.7], [0, -0.2, side * w * 2.1]];
        else if (burst) pts = [[0, 0.05, 0], [0.1, h * 0.25, side * w * 0.8], [0.3, h * 0.3, side * w * 1.5], [0.5, h * (0.1 + random() * 0.3), side * w * (1.9 + random() * 0.5)]];
        else pts = [[0, 0.05, 0], [-0.05, h * 0.35, side * w * 0.85], [-0.15, h * 0.75, side * w], [-0.3, h, side * w * 0.55], [-0.38, h * 1.04, side * w * 0.2]];
        const rib = new THREE.Mesh(horn(pts, a.species === 'crawler' ? 0.11 : 0.1, burst ? 0.07 : 0.035, 18), bone);
        rib.castShadow = true; group.add(rib);
        if (a.species === 'reptile' && (i === 2 || i === plan.ribs - 2)) {
          const paddle = new THREE.Mesh(horn([[0, 0.1, side * 0.2], [0.2, 0.25, side * 1.3], [-0.5, 0.12, side * 2.6]], 0.16, 0.05, 12), bone);
          paddle.scale.y = 0.5; paddle.castShadow = true; group.add(paddle);
          for (let f = 0; f < 4; f++) { const finger = new THREE.Mesh(horn([[-0.2, 0.1, side * 1.9], [-0.5 - f * 0.25, 0.06, side * (2.7 + (f % 2) * 0.2)]], 0.05, 0.02, 4), bone); group.add(finger); }
        }
      }
      if (a.frozen === 'flesh' && p[0] > cut && i > 0 && a.species !== 'crawler') {
        const sinew = new THREE.MeshStandardMaterial({ color: '#4a1f1c', roughness: 0.5, side: THREE.DoubleSide });
        for (const side of [-1, 1]) {
          if (random() < 0.3) continue;
          const gapX = stations[i].x - stations[i - 1].x;
          const strap = new THREE.Mesh(horn([[0, h * 0.75, side * w], [-gapX * 0.5, h * (0.45 + random() * 0.2), side * w * 0.95], [-gapX, stations[i - 1].h * 0.75, side * stations[i - 1].w]], 0.09, 0.09, 8), sinew);
          strap.scale.set(1, 1, 1); group.add(strap);
          const drip = new THREE.Mesh(horn([[-gapX * 0.5, h * 0.55, side * w * 0.95], [-gapX * 0.5, h * (0.1 + random() * 0.25), side * w * 0.97]], 0.04, 0.012, 4), sinew);
          group.add(drip);
        }
      }
      s.root.add(group);
    }

    // Skull.
    const head = new THREE.Group();
    head.position.set(neck[0], 0, neck[2]); head.rotation.y = neckTurn;
    const add = (mesh: THREE.Mesh) => { mesh.castShadow = true; head.add(mesh); return mesh; };
    const [cl, ch, cw] = plan.cranium;
    const skullY = ch * 0.95 + 0.1;
    const cranium = add(new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), bone));
    cranium.scale.set(cl, ch, cw); cranium.position.set(cl * 0.8, skullY, 0);
    const socket = a.eye ? s.material('#ffe45a', { emissive: a.bone === 'glass' ? '#ff5a3a' : '#ffd23a', emissiveIntensity: 2.4 }) : dark;
    for (const side of [-1, 1]) {
      const eye = add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), a.eye && side === -1 && a.species !== 'crawler' ? dark : socket));
      eye.scale.set(cl * 0.26, ch * 0.3, cw * 0.2); eye.position.set(cl * 1.25, skullY + ch * 0.2, side * cw * 0.86);
    }
    const tipX = cl * 1.6 + plan.snout;
    const toothSpots: { at: P; down: boolean }[] = [];
    if (a.species === 'crawler') {
      for (const side of [-1, 1]) {
        add(new THREE.Mesh(horn([[cl * 1.4, skullY * 0.7, side * cw * 0.6], [cl * 2.6, skullY * 0.7, side * cw * 1.0], [cl * 3.4, skullY * 0.5, side * cw * 0.35], [cl * 3.2, skullY * 0.4, side * 0.05]], 0.2, 0.03, 18), bone));
        add(new THREE.Mesh(horn([[cl * 1.2, skullY + ch * 0.5, side * cw * 0.4], [cl * 2.0, skullY + ch * 2.4, side * cw * 0.9], [cl * 3.2, skullY + ch * 3.0, side * cw * 1.3]], 0.05, 0.012, 12), bone));
        for (let k = 0; k < 5; k++) toothSpots.push({ at: [cl * (2.3 + k * 0.2), skullY * 0.66, side * cw * (0.86 - k * 0.14)], down: true });
      }
    } else {
      // Upper beak.
      const beak = add(new THREE.Mesh(new THREE.ConeGeometry(1, 1, 12), bone));
      beak.rotation.z = -Math.PI / 2; beak.scale.set(ch * (a.species === 'armoured' ? 0.95 : 0.55), plan.snout + cl * 0.8, plan.snoutWidth * (a.species === 'armoured' ? 1.3 : 1));
      beak.position.set(cl * 1.2 + (plan.snout + cl * 0.8) / 2, skullY - ch * 0.12 + (a.species === 'whale' ? 0.12 : 0), 0);
      if (a.species === 'whale') beak.rotation.z = -Math.PI / 2 - 0.06;
      if (a.species === 'armoured') for (let k = 0; k < 4; k++) {
        const plate = add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), bone));
        plate.scale.set(cl * (0.55 - k * 0.04), ch * (1.12 - k * 0.1), cw * (1.12 - k * 0.07)); plate.position.set(cl * (0.1 + k * 0.42), skullY - ch * 0.15, 0); plate.rotation.z = -0.25;
      }
      // Lower jaw: two bowed bones meeting at the chin, dropped open.
      const drop = plan.gape * (0.8 + mood.energy * 0.5);
      for (const side of [-1, 1]) {
        const jaw: P[] = [[cl * 0.5, skullY - ch * 0.35, side * cw * 0.8], [cl * 1.3 + plan.snout * 0.3, skullY - ch * 0.75 - drop * plan.snout * 0.25, side * (cw * 0.8 + plan.bow * 0.45)], [tipX * 0.85, Math.max(0.12, skullY - ch * 0.8 - drop * (plan.snout + cl) * 0.5), side * plan.bow * 0.45], [tipX, Math.max(0.1, skullY - ch * 0.8 - drop * (plan.snout + cl) * 0.6), side * 0.06]];
        add(new THREE.Mesh(horn(jaw, a.species === 'armoured' ? 0.24 : 0.15, 0.07, 18), bone));
        const curve = new THREE.CatmullRomCurve3(jaw.map((point) => new THREE.Vector3(...point)));
        const count = a.teeth === 'tusk' ? 2 : a.species === 'whale' ? 12 : 9;
        for (let k = 0; k < count; k++) { const p = curve.getPointAt(0.42 + (k / count) * 0.56); toothSpots.push({ at: [p.x, p.y + 0.08, p.z], down: false }); }
        for (let k = 0; k < count; k++) { const t = 0.3 + (k / count) * 0.68; toothSpots.push({ at: [cl * 1.2 + (plan.snout + cl * 0.8) * t, skullY - ch * 0.3 - (a.species === 'armoured' ? ch * 0.3 * (1 - t) : 0), side * plan.snoutWidth * (1 - t) * 0.9], down: true }); }
      }
    }
    if (a.teeth !== 'none') {
      const size = { needle: [0.04, 0.42], peg: [0.075, 0.17], tusk: [0.11, 0.85] }[a.teeth];
      const scaleBy = Math.max(0.6, ch / 0.6);
      const fang = new THREE.ConeGeometry(size[0] * scaleBy, size[1] * scaleBy, 6);
      const teeth = new THREE.InstancedMesh(fang, a.bone === 'black' ? s.material('#e8dcc0') : bone, toothSpots.length);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion();
      toothSpots.forEach((spot, index) => {
        q.setFromEuler(new THREE.Euler(spot.down ? Math.PI : 0, 0, (random() - 0.5) * 0.3 + (a.teeth === 'tusk' ? (spot.down ? 0.5 : -0.5) : 0)));
        matrix.compose(new THREE.Vector3(spot.at[0], spot.at[1] + (spot.down ? -1 : 1) * size[1] * scaleBy * 0.4, spot.at[2]), q, new THREE.Vector3(1, 1, 1));
        teeth.setMatrixAt(index, matrix);
      });
      teeth.castShadow = true; head.add(teeth);
    }
    s.root.add(head);

    // The ice it is locked in: a clear block (not solid to the gate) with a snow cap and a rubble foot.
    const blockTop = (Math.max(plan.ribHeight, skullY + ch) + 0.7) * (a.frozen === 'melting' ? 0.72 : 1);
    const depth = Math.max(plan.ribHeight * (a.species === 'crawler' ? 2.4 : 0.75), plan.wind + 1.2, cw + plan.bow) + 0.9;
    const clear = new THREE.MeshStandardMaterial({ color: '#8fd0f0', emissive: '#2a80b8', emissiveIntensity: 0.25, transparent: true, opacity: mix(0.3, 0.42, mood.wear), depthWrite: false, roughness: 0.08 });
    const blockLength = cut - xMin;
    const melt = s.material('#8fbdd2', { roughness: 0.06, metalness: 0.25 });
    if (blockLength > 0.3) {
      const cx = (cut + xMin) / 2;
      if (escaped) {
        // The block has burst on the near side: what is left is a back wall and shards.
        const back = new THREE.Mesh(new THREE.BoxGeometry(blockLength, blockTop, depth * 0.9), clear); back.position.set(cx, blockTop / 2, -depth * 0.6); s.root.add(back);
        s.box([blockLength, 0.16, depth * 0.9], [cx, blockTop + 0.08, -depth * 0.6], snow);
        for (let i = 0; i < 16; i++) {
          const size = 0.35 + random() * 0.8;
          const shard = s.mesh(new THREE.TetrahedronGeometry(size, 0), iceRock, [cx + (random() - 0.5) * blockLength, size * 0.3, depth * (0.5 + random() * 1.0)]);
          shard.rotation.set(random() * 3, random() * 3, random() * 3);
        }
      } else {
        const block = new THREE.Mesh(new THREE.BoxGeometry(blockLength, blockTop, depth * 2), clear); block.position.set(cx, blockTop / 2, 0); s.root.add(block);
        // Snow cap: opaque, so the block reads as a mass of ice with a cut face.
        s.box([blockLength, 0.18, depth * 2], [cx, blockTop + 0.09, 0], snow);
        for (let i = 0; i < Math.round(blockLength * 1.2); i++) s.ball([0.7 + random() * 0.7, 0.22, 0.6 + random() * 0.8], [xMin + 0.5 + random() * Math.max(0.1, blockLength - 1), blockTop + 0.18, (random() - 0.5) * depth * 1.6], snow, 10);
        // Frame the block edges so the clear faces read.
        const edge = s.material('#eaf7fd', { roughness: 0.3 });
        for (const z of [-depth, depth]) { s.rod([cut, 0, z], [cut, blockTop, z], 0.05, edge); s.rod([xMin, 0, z], [xMin, blockTop, z], 0.05, edge); s.rod([xMin, 0.03, z], [cut, 0.03, z], 0.05, edge); }
        s.rod([cut, 0.03, -depth], [cut, 0.03, depth], 0.05, edge);
        if (a.frozen === 'cracked') {
          const crack = s.material('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.5 });
          for (let i = 0; i < 9; i++) {
            let x = xMin + random() * blockLength, y = blockTop;
            const pts: P[] = [[x, y, depth + 0.01]];
            while (y > 0.3) { x += (random() - 0.5) * 1.1; y -= 0.4 + random() * 0.8; pts.push([THREE.MathUtils.clamp(x, xMin, cut), Math.max(0.05, y), depth + 0.01]); }
            for (let k = 0; k < pts.length - 1; k++) s.rod(pts[k], pts[k + 1], 0.03, crack, 0.02);
          }
          for (let i = 0; i < 5; i++) { let z = (random() - 0.5) * depth * 2, y = blockTop; while (y > 0.3) { const nz = THREE.MathUtils.clamp(z + (random() - 0.5), -depth, depth), ny = Math.max(0.05, y - 0.5 - random() * 0.7); s.rod([cut + 0.01, y, z], [cut + 0.01, ny, nz], 0.03, crack, 0.02); z = nz; y = ny; } }
        }
        if (a.frozen === 'melting') for (let i = 0; i < 12; i++) { const z = (random() - 0.5) * depth * 2; s.rod([cut + 0.02, blockTop, z], [cut + 0.03, blockTop - 0.3 - random() * 0.8, z], 0.035, melt, 0.008); }
      }
    }
    if (a.frozen === 'melting') for (let i = 0; i < 9; i++) {
      const pool = s.cylinder(1, 1, 0.014, [mix(xMin, xMax, random()), 0.008, (random() < 0.5 ? -1 : 1) * depth * (0.7 + random() * 0.5)], melt, 20);
      pool.scale.set(0.6 + random() * 1.3, 1, 0.4 + random() * 0.8);
    }
    if (escaped) {
      const slick = s.material('#1c2a2e', { roughness: 0.15, metalness: 0.3 });
      for (let i = 0; i < 8; i++) s.ball([0.5 + random() * 0.4, 0.012, 0.7], [mix(-1, 1.5, i / 8) + Math.sin(i) * 0.4, 0.012, depth * 0.8 + i * 0.75], slick, 10);
    }
    // Chipped ice around the excavated part.
    const chips = Math.round(mix(10, 34, mood.density));
    for (let i = 0; i < chips; i++) {
      const size = 0.15 + random() * 0.45, x = mix(Math.max(cut, xMin), xMax, random());
      const chip = s.mesh(new THREE.DodecahedronGeometry(size, 0), iceRock, [x, size * 0.4, (random() < 0.5 ? -1 : 1) * (depth * 0.55 + random() * depth * 0.5)]);
      chip.rotation.set(random() * 3, random() * 3, random() * 3);
    }

    // What the diggers left, on the near side toward the head.
    const dz = depth + 0.5, dx = THREE.MathUtils.clamp(cut + 2.0, xMin + 2, xMax - 2);
    const lampMats: THREE.MeshStandardMaterial[] = [];
    if (a.dig === 'stakes') {
      const tape = s.material('#ff6a1e', { emissive: '#ff6a1e', emissiveIntensity: 0.3 });
      const cord = s.material('#f1f1ea');
      const xs = [0, 1, 2, 3, 4].map((k) => mix(Math.max(xMin, cut - 1), xMax, k / 4));
      for (const z of [dz, -dz]) {
        xs.forEach((x, k) => {
          s.rod([x, 0, z], [x + (random() - 0.5) * 0.1, 0.9, z], 0.025, s.material('#8a6845'));
          s.box([0.26, 0.12, 0.01], [x + 0.13, 0.8, z], tape).rotation.y = (random() - 0.5);
          if (k) s.rod([xs[k - 1], 0.7, z], [x, 0.7, z], 0.008, cord);
        });
      }
      for (const x of xs) s.rod([x, 0.7, -dz], [x, 0.7, dz], 0.008, cord);
    } else if (a.dig === 'scaffold') {
      const top = Math.min(blockTop, plan.ribHeight + 0.4);
      for (const x of [dx - 0.8, dx + 0.8]) for (const z of [dz - 0.2, dz + 1.0]) s.rod([x, 0, z], [x, top + 1, z], 0.035, steel);
      for (const y of [top * 0.5, top]) { s.box([1.8, 0.06, 1.3], [dx, y, dz + 0.4], s.material('#8a6845')); for (const z of [dz - 0.2, dz + 1.0]) s.rod([dx - 0.8, y + 0.9, z], [dx + 0.8, y + 0.9, z], 0.02, steel); }
      for (const z of [dz - 0.2, dz + 1.0]) s.rod([dx - 0.8, 0.1, z], [dx + 0.8, top * 0.5, z], 0.02, steel);
      for (const x of [dx + 1.0, dx + 1.4]) s.rod([x, 0, dz + 1.3], [x, top + 0.6, dz + 0.9], 0.025, steel);
      for (let r = 0; r < Math.floor(top / 0.3); r++) s.rod([dx + 1.0, 0.25 + r * 0.3, dz + 1.3 - r * 0.03], [dx + 1.4, 0.25 + r * 0.3, dz + 1.3 - r * 0.03], 0.015, steel);
    } else if (a.dig === 'lamps') {
      for (let k = 0; k < 3; k++) {
        const x = dx - 2 + k * 2, z = dz + 0.6;
        for (let leg = 0; leg < 3; leg++) s.rod([x + Math.cos(leg * 2.09) * 0.5, 0, z + Math.sin(leg * 2.09) * 0.5], [x, 1.5, z], 0.022, steel);
        s.rod([x, 1.5, z], [x, 2.0, z], 0.022, steel);
        const hot = s.material('#ffb060', { emissive: '#ff7a1e', emissiveIntensity: mix(1.5, 3, mood.warmth) });
        lampMats.push(hot);
        s.box([0.6, 0.35, 0.12], [x, 2.1, z], s.material('#30363a')).rotation.x = 0.35;
        s.box([0.52, 0.27, 0.03], [x, 2.08, z - 0.07], hot).rotation.x = 0.35;
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 1.0, 2.2, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#ff9a4a', emissive: '#ff7a1e', emissiveIntensity: 1, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
        cone.position.set(x, 1.7, z - 1.1); cone.rotation.x = -Math.PI / 2 + 0.35; s.root.add(cone);
      }
      s.box([0.7, 0.5, 0.5], [dx + 3, 0.25, dz + 0.9], s.material('#f0b81e'));
    } else if (a.dig === 'tools') {
      s.rod([dx, 0, dz + 0.3], [dx + 0.15, 1.2, dz + 0.2], 0.025, s.material('#8a6845'));
      s.box([0.26, 0.32, 0.02], [dx - 0.02, 0.13, dz + 0.31], steel);
      const handle = s.rod([dx + 1.0, 0.04, dz + 0.2], [dx + 2.0, 0.04, dz + 0.7], 0.025, s.material('#8a6845'));
      handle.castShadow = true;
      s.tube([[dx + 1.85, 0.05, dz + 1.05], [dx + 2.05, 0.12, dz + 0.72], [dx + 2.3, 0.05, dz + 0.42]], 0.03, steel);
      s.box([0.8, 0.5, 0.55], [dx - 1.4, 0.25, dz + 0.5], s.material('#3d6f8e')).rotation.y = 0.3;
      s.cylinder(0.2, 0.16, 0.3, [dx - 0.5, 0.15, dz + 0.9], s.material('#e23b3b'), 12);
    }

    const eyeBase = a.eye ? socket.emissiveIntensity : 0;
    return s.finish({
      update: (_dt, time) => {
        if (a.eye) socket.emissiveIntensity = eyeBase * (0.7 + 0.3 * Math.sin(time * mix(0.6, 4, mood.energy)));
        lampMats.forEach((material, index) => { material.emissiveIntensity = 2 + Math.sin(time * 9 + index * 2.1) * 0.15; });
      },
    });
  },
});
