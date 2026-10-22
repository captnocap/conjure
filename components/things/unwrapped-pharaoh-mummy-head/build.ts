import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { SKULL, SOCKET, buildSkull, painted, strands } from './skull';

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The bandaged head: an egg that clears the skull, the jaw and a suggestion of nose. */
function egg(direction: THREE.Vector3, lift = 1) {
  const d = direction.clone().normalize();
  const p = new THREE.Vector3(d.x * 0.88, d.y > 0 ? d.y * 0.96 : d.y * 1.72, d.z * (d.z > 0 ? 1.04 : 1.1));
  if (d.y < 0) {
    const t = -d.y;
    p.x *= 1 - 0.3 * t * t;
    p.z += 0.44 * t * smooth(-0.2, 0.5, d.z) * (1 - t * 0.3);
  }
  p.z += 0.13 * Math.exp(-((d.angleTo(new THREE.Vector3(0, -0.36, 0.93).normalize()) / 0.17) ** 2));
  return p.multiplyScalar(lift);
}

/** Keep only some triangles of a shape, optionally moving every vertex. */
function shell(source: THREE.BufferGeometry, move: ((v: THREE.Vector3) => THREE.Vector3) | null, keep: (mid: THREE.Vector3) => boolean) {
  const flat = source.index ? source.toNonIndexed() : source.clone();
  const position = flat.attributes.position as THREE.BufferAttribute, uv = flat.attributes.uv as THREE.BufferAttribute;
  const points: number[] = [], uvs: number[] = [];
  const corner = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], mid = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 3) {
    for (let k = 0; k < 3; k++) corner[k].fromBufferAttribute(position, i + k);
    mid.copy(corner[0]).add(corner[1]).add(corner[2]).multiplyScalar(1 / 3);
    if (!keep(mid)) continue;
    for (let k = 0; k < 3; k++) {
      const p = move ? move(corner[k]) : corner[k];
      points.push(p.x, p.y, p.z);
      uvs.push(uv.getX(i + k), uv.getY(i + k));
    }
  }
  flat.dispose();
  source.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

/** A flat strip of cloth along a path. */
function ribbon(path: readonly THREE.Vector3[], width: number, across: THREE.Vector3, taper = 0.6) {
  const curve = new THREE.CatmullRomCurve3([...path]);
  const steps = 22, points: number[] = [], uvs: number[] = [], index: number[] = [];
  const at = new THREE.Vector3(), tangent = new THREE.Vector3(), side = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    curve.getPoint(t, at);
    curve.getTangent(t, tangent);
    side.crossVectors(tangent, across).normalize().multiplyScalar((width / 2) * mix(1, taper, t));
    points.push(at.x - side.x, at.y - side.y, at.z - side.z, at.x + side.x, at.y + side.y, at.z + side.z);
    uvs.push(0.1, t * 0.6, 0.2, t * 0.6);
    if (i < steps) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

const SHOULDER: readonly (readonly [number, number])[] = [[0.0, -1.42], [0.46, -1.45], [0.56, -1.6], [0.9, -1.74], [1.5, -1.98], [1.92, -2.4], [2.02, -2.95], [2.0, -3.4]];
const DEPTH = 0.64;
const shoulderRadius = (y: number) => {
  for (let i = 1; i < SHOULDER.length - 1; i++) {
    const [r0, y0] = SHOULDER[i], [r1, y1] = SHOULDER[i + 1];
    if (y <= y0 && y >= y1) return r0 + ((r1 - r0) * (y0 - y)) / (y0 - y1);
  }
  return y > -1.6 ? 0.5 : 2.0;
};

export default defineThing({
  questions: {
    unwrapped: choice('How much of the face has been unwrapped?', {
      bound: 'None: the head is still fully bound, a smooth linen egg with only the hint of a nose.',
      eye: 'A single slot has been cut or slipped open over one eye.',
      half: 'Half the face: one side bare dark skin, the other still bandaged.',
      bare: 'All of it: the whole face is bare, with one last chin strap of linen round the head.',
    }),
    wears: choice('What does it still wear?', {
      nothing: 'Nothing but linen.',
      mask: 'A broken fragment of gilded mask over the brow and one painted eye.',
      collar: 'A broad amulet collar of gold, lapis, carnelian and turquoise bands across the shoulders.',
      beads: 'Loops of blue-green faience beads on the chest.',
      scarab: 'A single heart scarab with spread gold wings on the breast.',
    }),
    expression: choice('If the face shows, what is its expression?', {
      serene: 'Serene, lips closed, eyes shut, a king asleep.',
      grimace: 'A dry grimace, lips shrunk back from the teeth.',
      gasp: 'A gasp, jaw fallen open.',
      scowl: 'A scowl, brows drawn down, mouth set: displeased to be disturbed.',
    }),
    hair: choice('What hair remains?', {
      none: 'None; a smooth shaven scalp.',
      henna: 'Tight hennaed curls, orange-red.',
      plaits: 'Long thin black plaits hanging beside the neck.',
      white: 'A few long white wisps.',
    }),
    state: choice('What state is it in, and where?', {
      museum: 'Museum-pristine, on a dark mount with a brass accession label.',
      robbed: 'Robbed: wrappings torn open and trailing, on a broken slab among rubble.',
      stirring: 'Stirring awake in its painted coffin, one bandage end lifting on its own.',
      dig: 'Just uncovered, still half sunk in excavation sand.',
    }),
    eyes: noul('Is there a glow in its eye sockets?'),
    turn: choice('How is the head held?', {
      level: 'Level, facing straight ahead, as it was laid.',
      turned: 'Turned to one side, as if listening.',
      raised: 'Chin raised, proud.',
      sunk: 'Sunk forward onto the chest.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const g = new THREE.Group();
    g.scale.setScalar(SKULL.unit);
    s.root.add(g);
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: readonly [number, number, number] = [0, 0, 0]) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(...at);
      m.castShadow = m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const side = random() < 0.5 ? -1 : 1; // the side that has come unwrapped
    const robbed = a.state === 'robbed', stirring = a.state === 'stirring';
    const faceShows = a.unwrapped === 'half' || a.unwrapped === 'bare';

    // Resin-dark skin.
    const resin = new THREE.Color('#4a3223').lerp(new THREE.Color(mood.warmth > 0.5 ? '#6b3d1c' : '#38302c'), Math.abs(mood.warmth - 0.5) * 0.9);
    const gape = faceShows && a.expression === 'gasp' ? 0.36 : 0.02;
    const skull = buildSkull({
      bone: resin, hollow: '#0f0a08', stain: '#20140e', blotch: mix(0.5, 1, mood.wear), random,
      jaw: 'open', gape, flesh: 1, roughness: 0.48, tooth: '#c9b88e',
      upper: () => random() > mood.wear * 0.4, lower: () => random() > mood.wear * 0.4,
    });
    const skin = skull.plain;
    const dark = new THREE.MeshStandardMaterial({ color: '#150e0b', roughness: 0.7 });

    const pivot = new THREE.Vector3(0, -1.1, -0.2);
    const head = new THREE.Group();
    head.position.copy(pivot);
    const inHead = new THREE.Group();
    inHead.position.copy(pivot).negate();
    head.add(inHead);
    inHead.add(skull.root);
    g.add(head);
    const pose = { level: [0, 0, 0], turned: [0.02, side * 0.5, side * 0.08], raised: [-0.26, 0, 0], sunk: [0.3, 0, 0] }[a.turn];
    head.rotation.set(pose[0] + jitter(0.03) + (stirring ? -0.06 : 0), pose[1] + jitter(0.06), pose[2] + jitter(0.03));

    // Dried features over the bone.
    mesh(skull.root, new THREE.SphereGeometry(1, 12, 10), skin, [0, -0.5, 0.95]).scale.set(0.085, 0.21, 0.1);
    for (const x of [-1, 1]) {
      mesh(skull.root, new THREE.SphereGeometry(1, 12, 10), skin, [x * 0.5, -0.86, 0.34]).scale.set(0.16, 0.36, 0.34);
      mesh(skull.root, new THREE.SphereGeometry(1, 10, 8), skin, [x * 0.8, -0.32, -0.04]).scale.set(0.06, 0.21, 0.13);
      if (a.expression === 'scowl') {
        const brow = mesh(skull.root, new THREE.CylinderGeometry(0.035, 0.045, 0.36, 6), dark, [x * 0.33, 0.02, 0.9]);
        brow.rotation.z = Math.PI / 2 + x * 0.42;
      }
    }
    if (a.expression === 'serene' || a.expression === 'scowl') {
      mesh(skull.root, new THREE.SphereGeometry(1, 16, 10), skin, [0, -1.06, 0.6]).scale.set(0.42, 0.2, 0.24);
      const line = mesh(skull.root, new THREE.TorusGeometry(0.3, 0.018, 5, 14, 1.3), dark, [0, a.expression === 'scowl' ? -1.38 : -0.78, 0.66]);
      line.rotation.set(a.expression === 'scowl' ? 0.25 : -0.25, 0, a.expression === 'scowl' ? Math.PI / 2 - 0.65 : -Math.PI / 2 - 0.65);
    } else if (a.expression === 'grimace') {
      mesh(skull.root, new THREE.SphereGeometry(1, 14, 8), skin, [0, -0.88, 0.62]).scale.set(0.4, 0.09, 0.22);
    }
    const glow = a.eyes || stirring;
    const glowColour = mood.warmth > 0.5 ? '#ffb23c' : '#6ff0d0';
    const ember = new THREE.MeshStandardMaterial({ color: glowColour, emissive: glowColour, emissiveIntensity: 2.4, roughness: 0.4 });
    for (const x of [-1, 1]) {
      if (glow) {
        const eye = mesh(skull.root, new THREE.SphereGeometry(0.075, 10, 8), ember, [x * SOCKET[0], SOCKET[1], SOCKET[2] + 0.02]);
        eye.castShadow = false;
      } else {
        const lid = mesh(skull.root, new THREE.TorusGeometry(0.13, 0.02, 5, 14, Math.PI), dark, [x * SOCKET[0], SOCKET[1] + 0.03, SOCKET[2] + 0.03]);
        lid.rotation.z = Math.PI;
      }
    }

    // Linen.
    const linenColour = new THREE.Color('#dccca2').lerp(new THREE.Color('#9a8258'), mood.wear * 0.75).lerp(new THREE.Color(mood.warmth > 0.5 ? '#d9b377' : '#c5c6bd'), Math.abs(mood.warmth - 0.5) * 0.3);
    const edge = linenColour.clone().multiplyScalar(0.55).getStyle();
    const weave = painted(512, 512, (ctx, w, h) => {
      ctx.fillStyle = linenColour.getStyle();
      ctx.fillRect(0, 0, w, h);
      const bands = 15;
      for (let i = -2; i < bands + 2; i++) {
        const y = (i / bands) * h, slope = (i % 2 ? 1 : -1) * mix(0.03, 0.12, random()) * h;
        const tone = linenColour.clone().multiplyScalar(mix(0.82, 1.08, random())).getStyle();
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(w, y + slope); ctx.lineTo(w, y + slope + h / bands + 6); ctx.lineTo(0, y + h / bands + 6);
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + slope); ctx.stroke();
      }
      ctx.strokeStyle = edge;
      ctx.lineWidth = 4;
      for (let i = 0; i < 5; i++) { const x = random() * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + jitter(120), h); ctx.stroke(); }
      for (let i = 0; i < 40 * mood.wear; i++) {
        ctx.fillStyle = `rgba(70,45,20,${mix(0.08, 0.3, random())})`;
        ctx.beginPath(); ctx.ellipse(random() * w, random() * h, mix(8, 40, random()), mix(6, 26, random()), random() * 3, 0, 7); ctx.fill();
      }
    });
    weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
    const linen = new THREE.MeshStandardMaterial({ map: weave, roughness: 0.95, side: THREE.DoubleSide });
    const o = [random() * 9, random() * 9, random() * 9];
    const noise = (p: THREE.Vector3) => 0.5 + 0.5 * Math.sin(p.x * 5 + o[0]) * Math.sin(p.y * 6 + o[1]) * Math.cos(p.z * 5 + o[2]);
    const rot = mood.wear * 0.14 + (robbed ? 0.22 : 0);

    const eyeDir = new THREE.Vector3(side * 0.42, -0.2, 0.885).normalize();
    const covered = (d: THREE.Vector3) => {
      if (a.unwrapped === 'bound') return true;
      if (a.unwrapped === 'eye') return !(d.z > 0.3 && Math.abs(d.y - eyeDir.y - d.x * side * 0.12) < 0.24 && d.x * side > -0.06 && d.x * side < 0.86);
      if (a.unwrapped === 'half') return !(d.x * side > -0.08 + (noise(d) - 0.5) * 0.3 + d.y * 0.25 && d.z > -0.35);
      return Math.abs(d.z + 0.12 + d.x * 0.1) < 0.13 || (d.y < -0.82 && d.z < 0.2);
    };
    const wrap = shell(new THREE.SphereGeometry(1, 52, 34), (v) => egg(v), (mid) => {
      const d = mid.clone().normalize();
      return covered(d) && noise(d) >= rot * (d.y > -0.6 ? 1 : 0.3);
    });
    mesh(inHead, wrap, linen);

    // Hair.
    const hairColour = { none: '#000000', henna: '#b4532a', plaits: '#1c1716', white: '#e6e1d2' }[a.hair];
    const hair = new THREE.MeshStandardMaterial({ color: new THREE.Color(hairColour).lerp(new THREE.Color('#8b8275'), mood.wear * 0.2), roughness: 0.9 });
    if (a.hair === 'henna') {
      const curl = new THREE.TorusGeometry(0.075, 0.034, 5, 9);
      const spots: THREE.Matrix4[] = [];
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), d = new THREE.Vector3();
      for (let i = 0; i < 260; i++) {
        d.set(jitter(1), mix(-0.45, 1, random()), mix(-1, 0.45, random())).normalize();
        const bare = !covered(d);
        if (!bare && d.y > -0.25) continue;
        if (bare && d.z > 0.3 && d.y < 0.55) continue;
        const p = egg(d, bare ? 0.96 : 1.03);
        q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), jitter(0.9)));
        spots.push(m.clone().compose(p, q, new THREE.Vector3(1, 1, 1).multiplyScalar(mix(0.8, 1.5, random()))));
      }
      const curls = new THREE.InstancedMesh(curl, hair, Math.max(1, spots.length));
      spots.forEach((matrix, i) => curls.setMatrixAt(i, matrix));
      curls.count = spots.length;
      curls.castShadow = true;
      inHead.add(curls);
    } else if (a.hair === 'plaits' || a.hair === 'white') {
      const paths: THREE.Vector3[][] = [];
      const count = a.hair === 'plaits' ? 22 : 12;
      for (let i = 0; i < count; i++) {
        const x = (i % 2 ? 1 : -1), back = mix(-0.9, 0.15, random());
        const d = new THREE.Vector3(x * mix(0.6, 1, random()), mix(-0.2, 0.25, random()), back).normalize();
        const root = egg(d, covered(d) ? 1.03 : 0.95);
        const length = a.hair === 'plaits' ? mix(1.3, 2.0, random()) : mix(0.7, 1.6, random());
        paths.push([root, new THREE.Vector3(root.x * 1.12, root.y - length * 0.4, root.z + jitter(0.08)), new THREE.Vector3(root.x * 1.05 + jitter(0.1), root.y - length * 0.75, root.z + 0.1 + jitter(0.1)), new THREE.Vector3(root.x * 1.1 + jitter(0.12), root.y - length, root.z + 0.2 + jitter(0.12))]);
      }
      inHead.add(strands(paths, a.hair === 'plaits' ? 0.04 : 0.012, hair, a.hair === 'plaits' ? 5 : 3));
    }

    // Shoulders: a dark body inside a linen binding.
    const profile = SHOULDER.map(([x, y]) => new THREE.Vector2(x, y));
    const body = mesh(g, new THREE.LatheGeometry(profile, 36), skin, [0, 0, -0.2]);
    body.scale.set(0.97, 1, DEPTH * 0.95);
    const o2 = [random() * 9, random() * 9];
    const binding = shell(new THREE.LatheGeometry(profile, 44), null, (mid) => {
      const n = 0.5 + 0.5 * Math.sin(mid.x * 2.6 + o2[0]) * Math.sin(mid.y * 3.4 + o2[1]) * Math.cos(mid.z * 2.2 + o[2]);
      return n >= rot * 1.5 * (mid.z > 0 ? 1 : 0.4);
    });
    const wrapBody = mesh(g, binding, linen, [0, 0, -0.2]);
    wrapBody.scale.z = DEPTH;
    mesh(g, new THREE.CylinderGeometry(0.4, 0.5, 0.75, 14), a.unwrapped === 'bare' ? skin : linen, [0, -1.3, -0.2]);
    const chest = (y: number, x = 0, lift = 0.05) => {
      const r = shoulderRadius(y);
      return new THREE.Vector3(x, y, -0.2 + Math.sqrt(Math.max(0.01, r * r - x * x)) * DEPTH + lift);
    };

    // Loose cloth.
    const flap: THREE.Mesh[] = [];
    const up = new THREE.Vector3(0, 0, 1);
    if (faceShows || a.unwrapped === 'eye' || robbed || stirring) {
      const loose = (robbed ? 4 : 1) + Math.round(mood.density * 2);
      for (let i = 0; i < loose; i++) {
        const x = (i === 0 ? side : random() < 0.5 ? -1 : 1), from = new THREE.Vector3(x * mix(0.35, 0.55, random()), -1.5, 0.2);
        const length = mix(0.7, 1.7, random());
        const tail = mesh(g, ribbon([from, chest(-1.9, x * 0.6, 0.1), chest(-1.9 - length * 0.5, x * mix(0.7, 1.1, random()), 0.12), chest(Math.max(-3.3, -1.9 - length), x * mix(0.6, 1.3, random()), 0.14)], mix(0.2, 0.3, random()), up), linen);
        tail.castShadow = false;
      }
    }
    if (stirring) {
      // One end has let go of the head and is rising.
      const d = new THREE.Vector3(side * 0.75, 0.3, 0.45).normalize();
      const from = egg(d, 1.02);
      const lifted = new THREE.Group();
      lifted.position.copy(from);
      const reach = mix(1.2, 1.9, random());
      mesh(lifted, ribbon([new THREE.Vector3(0, 0, 0), new THREE.Vector3(side * 0.45, 0.35, 0.1), new THREE.Vector3(side * 0.75, reach * 0.6, 0.25), new THREE.Vector3(side * 0.5, reach, 0.3), new THREE.Vector3(side * 0.85, reach + 0.35, 0.2)], 0.28, up, 0.7), linen);
      inHead.add(lifted);
      flap.push(lifted as unknown as THREE.Mesh);
    }

    // Finery.
    const tarnish = mood.wear * 0.55 + (robbed ? 0.15 : 0);
    const metal = (hex: string) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color('#5c5340'), tarnish), roughness: 0.3 + tarnish * 0.4, metalness: 0.85, emissive: new THREE.Color(hex).multiplyScalar(0.18) });
    const gold = metal('#e2b23e');
    const stone = (hex: string) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color('#77705f'), tarnish * 0.6), roughness: 0.35 });
    const lapis = stone('#1f3f9c'), turquoise = stone('#2fb7a6'), carnelian = stone('#c2452a');
    if (a.wears === 'mask') {
      const m = -side; // the fragment sits on the still-bound side
      const o3 = random() * 9;
      const fragment = shell(new THREE.SphereGeometry(1, 44, 30), (v) => egg(v, 1.07), (mid) => {
        const d = mid.clone().normalize();
        const ragged = Math.sin(d.x * 9 + o3) * Math.sin(d.y * 8 + o3 * 2) * 0.09;
        return d.z > 0.12 + ragged && d.y > -0.5 + ragged && d.y < 0.72 + ragged && d.x * m > -0.2 + ragged * 2;
      });
      mesh(inHead, fragment, new THREE.MeshStandardMaterial({ color: gold.color, roughness: gold.roughness, metalness: 0.85, emissive: gold.emissive, side: THREE.DoubleSide }));
      const eye = egg(new THREE.Vector3(m * 0.42, -0.2, 0.885), 1.09);
      mesh(inHead, new THREE.SphereGeometry(1, 14, 8), new THREE.MeshStandardMaterial({ color: '#f3efe2', roughness: 0.3 }), [eye.x, eye.y, eye.z]).scale.set(0.2, 0.085, 0.03);
      mesh(inHead, new THREE.SphereGeometry(1, 10, 8), dark, [eye.x, eye.y, eye.z + 0.02]).scale.set(0.075, 0.075, 0.03);
      const line = (y: number, from: number, to: number, radius: number) => {
        const path: THREE.Vector3[] = [];
        for (let i = 0; i <= 5; i++) path.push(egg(new THREE.Vector3(m * mix(from, to, i / 5), y - (i / 5) ** 2 * 0.05, 0.885), 1.1));
        return strands([path], radius, lapis, 5);
      };
      inHead.add(line(-0.08, 0.16, 0.9, 0.035), line(-0.2, 0.55, 1.0, 0.028));
      for (let i = 0; i < 5; i++) {
        const path: THREE.Vector3[] = [];
        for (let k = 0; k <= 5; k++) path.push(egg(new THREE.Vector3(m * mix(0.02, 0.95, k / 5), 0.25 + i * 0.13, 0.9 - i * 0.12), 1.085));
        inHead.add(strands([path], 0.03, lapis, 4));
      }
    } else if (a.wears === 'collar') {
      const rows: THREE.Vector2[] = [];
      for (let i = 0; i <= 10; i++) { const y = mix(-1.55, -2.42, i / 10); rows.push(new THREE.Vector2(shoulderRadius(y) + 0.05, y + 0.03)); }
      const bands = painted(32, 256, (ctx, w, h) => {
        const order = ['#e2b23e', '#1f3f9c', '#e2b23e', '#c2452a', '#2fb7a6', '#e2b23e', '#1f3f9c', '#2fb7a6', '#e2b23e'];
        order.forEach((colour, i) => { ctx.fillStyle = new THREE.Color(colour).lerp(new THREE.Color('#6a614c'), tarnish * 0.8).getStyle(); ctx.fillRect(0, (i / order.length) * h, w, h / order.length + 1); });
        ctx.fillStyle = 'rgba(20,14,8,0.55)';
        for (let i = 1; i < order.length; i++) ctx.fillRect(0, (i / order.length) * h - 2, w, 4);
      });
      const collar = mesh(g, new THREE.LatheGeometry(rows, 44), new THREE.MeshStandardMaterial({ map: bands, roughness: 0.4, metalness: 0.35, side: THREE.DoubleSide }), [0, 0, -0.2]);
      collar.scale.z = DEPTH;
      const drops: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 34; i++) {
        if (random() < tarnish * 0.6) continue;
        const angle = (i / 34) * Math.PI * 2, r = shoulderRadius(-2.47) + 0.06;
        drops.push({ at: [Math.sin(angle) * r, -2.47, -0.2 + Math.cos(angle) * r * DEPTH], size: 0.07 });
      }
      const dropMesh = s.scatter(new THREE.SphereGeometry(1, 8, 6), gold, drops);
      g.add(dropMesh);
    } else if (a.wears === 'beads') {
      const beads: { at: [number, number, number]; size: number; color: string }[] = [];
      const loops = 2 + Math.round(mood.density * 2);
      for (let k = 0; k < loops; k++) {
        const depth = mix(-2.0, -3.0, (k + random() * 0.6) / loops), span = mix(0.55, 0.9, random());
        for (let i = 0; i <= 26; i++) {
          const t = i / 26 * 2 - 1, y = mix(-1.62, depth, 1 - t * t), p = chest(y, t * span * shoulderRadius(Math.max(y, -2.4)) * 0.6, 0.07);
          beads.push({ at: [p.x, p.y, p.z], size: 0.055, color: i % 6 === 3 ? '#e2b23e' : i % 5 === 0 ? '#1f6f9c' : '#35b9a4' });
        }
      }
      g.add(s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.3 }), beads));
    } else if (a.wears === 'scarab') {
      const at = chest(-2.3, 0, 0.1);
      const jewel = new THREE.Group();
      jewel.position.copy(at);
      jewel.rotation.x = -0.6;
      mesh(jewel, new THREE.SphereGeometry(1, 14, 10), turquoise).scale.set(0.2, 0.28, 0.1);
      mesh(jewel, new THREE.SphereGeometry(1, 10, 8), lapis, [0, 0.27, 0]).scale.set(0.12, 0.09, 0.07);
      mesh(jewel, new THREE.BoxGeometry(0.02, 0.5, 0.03), gold, [0, 0, 0.09]);
      for (const x of [-1, 1]) for (let i = 0; i < 4; i++) {
        const feather = mesh(jewel, new THREE.BoxGeometry(0.62 - i * 0.07, 0.08, 0.03), i % 2 ? gold : [lapis, carnelian][(i / 2) | 0], [x * (0.48 - i * 0.03), 0.16 - i * 0.09, 0]);
        feather.rotation.z = x * (0.32 - i * 0.12);
      }
      mesh(jewel, new THREE.SphereGeometry(0.1, 10, 8), carnelian, [0, 0.42, 0.02]);
      g.add(jewel);
      g.add(strands([[new THREE.Vector3(-0.5, -1.55, 0.15), at.clone().add(new THREE.Vector3(-0.1, 0.3, 0))], [new THREE.Vector3(0.5, -1.55, 0.15), at.clone().add(new THREE.Vector3(0.1, 0.3, 0))]], 0.02, gold, 4));
    }
    if (robbed && a.wears !== 'nothing') {
      // What the thieves dropped.
      const flecks: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 9; i++) flecks.push({ at: [jitter(2.4), -3.36, 1.3 + random() * 0.9], size: mix(0.04, 0.08, random()) });
      g.add(s.scatter(new THREE.SphereGeometry(1, 6, 5), gold, flecks));
    }

    // What it rests on.
    const floorY = -3.4;
    if (a.state === 'museum') {
      const mount = new THREE.MeshStandardMaterial({ color: '#2f3133', roughness: 0.6 });
      mesh(g, new THREE.BoxGeometry(4.8, 0.7, 3.3), mount, [0, floorY - 0.35, -0.1]);
      const number = `EA ${1000 + Math.floor(random() * 8999)}`;
      const plate = painted(256, 96, (ctx, w, h) => {
        ctx.fillStyle = '#c9a24a'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#2a2114'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 50px serif';
        ctx.fillText(number, w / 2, h / 2, w - 20);
      });
      mesh(g, new THREE.PlaneGeometry(1.5, 0.45), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.4, metalness: 0.4 }), [0, floorY - 0.35, 1.56]);
    } else if (robbed) {
      const rock = new THREE.MeshStandardMaterial({ color: new THREE.Color('#b9ab8c').lerp(new THREE.Color('#77705f'), mood.wear * 0.4), roughness: 1 });
      const slab = mesh(g, new THREE.BoxGeometry(5.2, 0.5, 3.8), rock, [0, floorY - 0.25, 0.1]);
      slab.rotation.y = jitter(0.08);
      for (let i = 0; i < 6 + mood.density * 6; i++) {
        const chunk = mesh(g, new THREE.DodecahedronGeometry(mix(0.12, 0.34, random()), 0), rock, [jitter(2.3), floorY + 0.08, mix(0.9, 1.8, random()) * (random() < 0.8 ? 1 : -1)]);
        chunk.rotation.set(random() * 3, random() * 3, random() * 3);
      }
      for (let i = 0; i < 3; i++) {
        const x = jitter(1.8), z = 1.2 + random() * 0.6;
        const strip = mesh(g, ribbon([new THREE.Vector3(x, floorY + 0.03, z), new THREE.Vector3(x + 0.5, floorY + 0.12, z + jitter(0.3)), new THREE.Vector3(x + 1.0, floorY + 0.03, z + jitter(0.3)), new THREE.Vector3(x + 1.5, floorY + 0.03, z + jitter(0.4))], 0.26, new THREE.Vector3(0, 1, 0)), linen);
        strip.castShadow = false;
      }
    } else if (stirring) {
      // The lower half of a painted coffin, its headboard rising behind.
      const coffinColour = new THREE.Color('#d9a938').lerp(new THREE.Color('#8a7448'), mood.wear * 0.5);
      const stripes = painted(256, 256, (ctx, w, h) => {
        ctx.fillStyle = coffinColour.getStyle(); ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = new THREE.Color('#20408f').lerp(new THREE.Color('#5a5a58'), mood.wear * 0.4).getStyle();
        for (let i = 0; i < 8; i++) ctx.fillRect(0, i * 32 + 6, w, 14);
      });
      const board = new THREE.Shape();
      board.moveTo(-2.5, floorY);
      board.lineTo(-2.5, -1.2);
      board.absellipse(0, -1.2, 2.5, 2.4, Math.PI, 0, true);
      board.lineTo(2.5, floorY);
      const back = new THREE.ExtrudeGeometry(board, { depth: 0.3, bevelEnabled: false });
      const uv = back.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 5, uv.getY(i) / 1.6);
      stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping;
      mesh(g, back, new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6 }), [0, 0, -1.9]);
      const wood = new THREE.MeshStandardMaterial({ color: coffinColour.clone().multiplyScalar(0.8), roughness: 0.7 });
      mesh(g, new THREE.BoxGeometry(5.0, 0.4, 3.6), wood, [0, floorY - 0.2, -0.1]);
      for (const x of [-1, 1]) mesh(g, new THREE.BoxGeometry(0.3, 1.5, 3.3), wood, [x * 2.35, floorY + 0.75, -0.1]);
    } else {
      const sand = new THREE.MeshStandardMaterial({ color: new THREE.Color('#cfae72').lerp(new THREE.Color(mood.warmth > 0.5 ? '#d69a55' : '#b9b3a2'), Math.abs(mood.warmth - 0.5) * 0.6), roughness: 1 });
      const dune = mesh(g, new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), sand, [0, floorY - 0.02, 0]);
      dune.scale.set(2.9, mix(1.0, 1.5, random()), 2.4);
      dune.position.x = jitter(0.3);
      for (let i = 0; i < 4; i++) {
        const drift = mesh(g, new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), sand, [jitter(1.9), floorY - 0.02, jitter(1.2) + 0.9]);
        drift.scale.set(mix(0.8, 1.5, random()), mix(0.25, 0.6, random()), mix(0.8, 1.3, random()));
      }
      const sherd = new THREE.MeshStandardMaterial({ color: '#a85a36', roughness: 0.9, side: THREE.DoubleSide });
      for (let i = 0; i < 2 + mood.density * 5; i++) {
        const piece = mesh(g, new THREE.SphereGeometry(mix(0.18, 0.32, random()), 8, 5, 0, 1.6, 0.4, 0.9), sherd, [jitter(2.0), floorY + 0.25, 1.9 + random() * 0.5]);
        piece.rotation.set(random() * 3, random() * 3, random() * 3);
      }
      mesh(g, new THREE.CylinderGeometry(3.1, 3.1, 0.12, 30), sand, [0, floorY - 0.06, 0]).scale.z = 0.9;
    }

    const tempo = mix(0.6, 4, mood.energy), swing = mix(0.04, 0.3, mood.energy);
    const still = !glow && !flap.length;
    return s.finish({
      update: still ? undefined : (_dt, time) => {
        if (glow) ember.emissiveIntensity = 2.2 + Math.sin(time * tempo * 0.8) * 0.9;
        for (const item of flap) item.rotation.z = Math.sin(time * tempo) * swing;
      },
    });
  },
});
